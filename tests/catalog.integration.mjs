import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { buildCatalog } from '../scripts/catalog/catalog.mjs';
import { seedCatalog } from '../scripts/catalog/seed.mjs';

async function port() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const result = server.address().port; await new Promise(resolve => server.close(resolve)); return result;
}
async function until(fn, label, attempts = 100) {
  for (let i = 0; i < attempts; i++) { if (await fn()) return; await delay(200); }
  throw new Error(`Timed out: ${label}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  await exited; clearTimeout(timer);
}

test('catalog seed preserves data and remains editable through real admin/storefront APIs', { timeout: 300_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_catalog_test');
  const products = buildCatalog();
  const original = { ...products[0], _id: 'original-product', id: 'original-product', name: 'Existing Store Product', sku: 'EXISTING-001', skuKeys: ['EXISTING-001'], variants: [], stock: 7, views: 0, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', featured: false, newArrival: false, bestseller: false };
  await db.collection('admin_products').insertOne(original);
  const sentinelCollections = ['users', 'admins', 'admin_orders', 'product_reviews'];
  for (const name of sentinelCollections) await db.collection(name).insertOne({ _id: 'preserve-me', marker: name });

  await t.test('dry run does not write; application and rerun are idempotent and audited', async () => {
    const preview = await seedCatalog(client, db);
    assert.equal(preview.planned, 83);
    assert.equal(await db.collection('admin_products').countDocuments(), 1);
    const applied = await seedCatalog(client, db, { apply: true });
    assert.equal(applied.inserted, 83);
    assert.equal(applied.catalog.total, 84);
    const movementCount = await db.collection('admin_stock_movements').countDocuments();
    assert.equal(movementCount, products.reduce((sum, p) => sum + p.variants.length, 0));
    assert.equal((await seedCatalog(client, db, { apply: true })).inserted, 0);
    assert.equal(await db.collection('admin_stock_movements').countDocuments(), movementCount);
    assert.deepEqual(await db.collection('admin_products').findOne({ _id: original.id }), original);
    for (const name of sentinelCollections) assert.equal((await db.collection(name).findOne({ _id: 'preserve-me' })).marker, name);
  });

  const key = randomBytes(32).toString('hex'), base = `http://127.0.0.1:${await port()}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', new URL(base).port], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_catalog_test', MONGODB_DNS_SERVERS: '', ADMIN_PROVISIONING_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = ''; server.stdout.on('data', chunk => { output += chunk; }); server.stderr.on('data', chunk => { output += chunk; });
  await until(async () => { if (server.exitCode !== null) throw new Error(output); try { return (await fetch(base + '/api/auth/session')).ok; } catch { return false; } }, 'server');
  let cookie;
  async function api(path, data, method = data === undefined ? 'GET' : 'POST', headers = {}) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(data ? { body: JSON.stringify(data) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  const account = { name: 'Catalog Test Admin', email: 'catalog@example.com', password: 'Catalog-test-password-123' };
  assert.equal((await api('/api/admin/signup', account, 'POST', { 'x-admin-provisioning-key': key })).status, 201);
  const login = await api('/api/admin/login', { email: account.email, password: account.password });
  assert.equal(login.status, 200); cookie = login.cookie.split(';')[0];

  await t.test('all records satisfy the real admin validator and appear in public details', async () => {
    const catalog = await api('/api/catalog'); assert.equal(catalog.status, 200); assert.equal(catalog.body.products.length, 84);
    assert.equal((await api('/api/admin/products')).body.products.length, 84);
    for (const p of products) {
      const id = `catalog-${p.sku.toLowerCase()}`;
      const update = await api(`/api/admin/products/${id}`, p, 'PATCH');
      assert.equal(update.status, 200, `${p.sku}: ${JSON.stringify(update.body)}`);
      const detail = await api(`/api/catalog/${id}`);
      assert.equal(detail.status, 200, p.sku);
      assert.equal(detail.body.product.stock, p.stock);
      assert.deepEqual(detail.body.product.variants, p.variants);
      assert.equal(detail.body.product.skuKeys, undefined);
      assert(detail.body.related.length >= 5);
    }
    for (const path of ['/', '/men', '/women', '/shoes', '/accessories', '/new-in', '/sale', '/search?q=hoodie', '/adminroute']) {
      const response = await fetch(base + path, { headers: { Cookie: cookie } });
      assert.equal(response.status, 200, path); await response.text();
    }
    for (const path of new Set(products.flatMap(p => p.images))) {
      const response = await fetch(base + path); assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /^image\/webp/); assert((await response.arrayBuffer()).byteLength > 1000);
    }
  });

  await t.test('later media, price and stock edits survive a seed rerun', async () => {
    const p = products[0], id = `catalog-${p.sku.toLowerCase()}`;
    const variants = p.variants.map((v, i) => i ? v : { ...v, stock: 1 });
    const edit = await api(`/api/admin/products/${id}`, { images: ['/products/catalog/existing-women.webp'], price: 4300, variants }, 'PATCH');
    assert.equal(edit.status, 200);
    const before = await db.collection('admin_products').findOne({ _id: id });
    const movements = await db.collection('admin_stock_movements').countDocuments();
    await seedCatalog(client, db, { apply: true });
    assert.deepEqual(await db.collection('admin_products').findOne({ _id: id }), before);
    assert.equal(await db.collection('admin_stock_movements').countDocuments(), movements);
    const conflict = { ...p, name: 'Different Name', sku: 'UNIQUE-BASE' };
    await assert.rejects(seedCatalog(client, db, { apply: true, products: [conflict] }), /SKU conflicts/);
    assert.equal(await db.collection('admin_products').countDocuments(), 84);
  });

  const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  await t.test('desktop/mobile storefront, search and admin editor display populated products', { skip: !existsSync(chrome) }, async () => {
    profile = await mkdtemp('/tmp/uf-catalog-chrome-'); const debugPort = await port();
    browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--no-proxy-server', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { stdio: 'ignore' });
    let target;
    await until(async () => { try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(page => page.type === 'page'); return !!target; } catch { return false; } }, 'Chrome');
    ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
    let sequence = 0; const pending = new Map(), errors = [];
    const call = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      const entry = pending.get(message.id); if (!entry) return;
      clearTimeout(entry.timer); pending.delete(message.id); if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    });
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value;
    };
    await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
    const [cookieName, cookieValue] = cookie.split('=');
    await call('Network.setCookie', { name: cookieName, value: cookieValue, url: base, httpOnly: true, sameSite: 'Lax' });
    const cards = `document.querySelectorAll('a[aria-label^="View details for"]').length`;
    const navigate = async (path, expected) => {
      await call('Page.navigate', { url: base + path });
      await until(async () => { try { return await evaluate(`document.readyState === "complete" && location.href === ${JSON.stringify(base + path)} && ${cards} >= ${expected}`); } catch { return false; } }, path);
    };
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await navigate('/', 24);
    await delay(500); // Allow hydration before dispatching synthetic button clicks.
    for (const [id, count] of [['featured', 12], ['bestsellers', 16], ['essentials', 24]]) {
      await evaluate(`document.getElementById('home-tab-${id}').click()`);
      await until(async () => await evaluate(`${cards} >= ${count} && document.getElementById('home-tab-${id}').getAttribute('aria-selected') === 'true'`), id);
    }
    for (const [path, count] of [['/men', 18], ['/women', 22], ['/shoes', 22], ['/accessories', 22], ['/new-in', 24], ['/sale', 27]]) await navigate(path, count);
    for (const term of ['hoodie', 'black jacket', 'cargo', 'women trousers', 'sneakers', 'watch', 'bag', 'essential']) await navigate(`/search?q=${encodeURIComponent(term)}`, 1);
    await navigate('/search', 84);
    await evaluate(`document.querySelector('select[aria-label="Sort products"]').value='price-low'; document.querySelector('select[aria-label="Sort products"]').dispatchEvent(new Event('change',{bubbles:true}))`);
    await delay(200);
    assert(await evaluate(String.raw`(() => { const prices = [...document.querySelectorAll('a[aria-label^="View details for"]')].map(a => Number(a.innerText.match(/Rs\.\s*([\d,]+)/)?.[1].replaceAll(',',''))); return prices.every((p,i) => !i || p >= prices[i-1]); })()`));
    await evaluate(`document.querySelector('#search-filters input[type=checkbox]').click()`);
    await delay(200); assert((await evaluate(cards)) < 84);
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigate('/women', 22);
    assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'mobile layout should fit viewport');
    await evaluate(`document.querySelector('a[aria-label^="View details for"]').scrollIntoView()`);
    await until(async () => await evaluate(`(() => { const img=document.querySelector('a[aria-label^="View details for"] img'); return img?.complete && img.naturalWidth > 0; })()`), 'cover image');
    const shot = await call('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/urbanforge-catalog-mobile.png', Buffer.from(shot.data, 'base64'));
    const detailId = `catalog-${products.find(p => p.category === 'Women').sku.toLowerCase()}`;
    await call('Page.navigate', { url: base + '/products/' + detailId });
    await until(async () => await evaluate(`document.querySelector('h1')?.textContent.includes('Studio Wide-Leg Tailored Trousers')`), 'product detail');
    assert(await evaluate(`document.querySelectorAll('video').length === 0`));
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', { url: base + '/adminroute' });
    await until(async () => await evaluate(`document.readyState === 'complete' && !!document.querySelector('nav[aria-label="Admin navigation"]')`), 'admin');
    await delay(500);
    await evaluate(`[...document.querySelectorAll('nav[aria-label="Admin navigation"] button')].find(b=>b.textContent==='Products').click()`);
    await until(async () => await evaluate(`document.querySelectorAll('tbody tr').length > 0`), 'admin listing');
    await evaluate(`document.querySelector('tbody tr td button').click()`);
    await until(async () => await evaluate(`document.body.innerText.includes('Edit product')`), 'admin editor');
    assert(await evaluate(`document.querySelector('textarea[maxlength="2000"]')?.value.length > 100`));
    assert.deepEqual(errors, [], 'no browser runtime exceptions');
  });
});
