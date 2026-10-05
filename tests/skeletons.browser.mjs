import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

async function port() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
async function until(fn, label) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await fn()) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000); await exited; clearTimeout(timer);
}
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';

test('skeletons replace pending content and actions throughout the store', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_skeleton_test');
  const product = { _id: 'skeleton-shoe', id: 'skeleton-shoe', name: 'Skeleton Sneaker', description: 'Everyday comfort.', shortDescription: '', category: 'Shoes', subcategory: '', brand: 'UrbanForge', gender: 'unisex', price: 2500, salePrice: null, sku: 'SKELETON', skuKeys: ['SKELETON'], images: ['/shoes.png'], videos: [], colors: [], sizes: [], material: '', stock: 10, tags: [], status: 'active', featured: true, newArrival: true, bestseller: false, seoTitle: '', seoDescription: '', variants: [], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await db.collection('admin_products').insertOne(product);
  const tokens = {};
  for (const role of ['user', 'admin']) {
    tokens[role] = randomBytes(32).toString('hex');
    await db.collection(role === 'user' ? 'users' : 'admins').insertOne({ _id: new ObjectId(), name: 'Skeleton Customer', email: `${role}@example.com`, wishlistProductIds: [product.id], sessions: [{ tokenHash: createHash('sha256').update(tokens[role]).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) }], createdAt: new Date(), updatedAt: new Date() });
  }
  const base = `http://localhost:${await port()}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', new URL(base).port], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_skeleton_test', MONGODB_DNS_SERVERS: '' }, stdio: 'ignore' });
  await until(async () => { try { return (await fetch(base + '/api/auth/session')).ok; } catch { return false; } }, 'server');
  profile = await mkdtemp('/tmp/urbanforge-skeleton-chrome-'); const debugPort = await port();
  browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--no-proxy-server', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  await until(async () => { try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(page => page.type === 'page'); return !!target; } catch { return false; } }, 'Chrome');
  ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
  let sequence = 0; const pending = new Map(), errors = [], held = new Map(), paused = new Map();
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 8000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); clearTimeout(callback.timer); if (message.error) callback.reject(new Error(JSON.stringify(message.error))); else callback.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Fetch.requestPaused') {
      const { request, requestId } = message.params, key = `${request.method} ${new URL(request.url).pathname}`;
      if (held.has(key)) paused.set(requestId, key);
      else void call('Fetch.continueRequest', { requestId }).catch(error => errors.push(error.message));
    }
  });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  }
  function hold(path, method = 'GET') { held.set(`${method} ${path}`, true); }
  async function release(path, method = 'GET') {
    const key = `${method} ${path}`; held.delete(key);
    for (const [requestId, requestKey] of paused) if (requestKey === key) { paused.delete(requestId); await call('Fetch.continueRequest', { requestId }); }
  }
  async function navigate(path) { await call('Page.navigate', { url: base + path }); await until(() => evaluate('!!document.querySelector("main")'), path); }
  async function skeleton(label) {
    await until(() => evaluate(`!!document.querySelector('[role="status"][aria-label=${JSON.stringify(label)}] [data-skeleton]')`), label);
    assert.equal(await evaluate('/\\b(Loading|Saving|Posting|Sending|Signing in|Logging in|Updating summary)\\b/.test(document.body.innerText)'), false, 'no progress text');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'no horizontal overflow');
  }
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: `${base}/api/*`, requestStage: 'Request' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  hold('/api/catalog'); await navigate('/search'); await skeleton('Products pending');
  const desktop = await call('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/urbanforge-search-skeleton.png', Buffer.from(desktop.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await skeleton('Products pending');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate('getComputedStyle(document.querySelector("main [data-skeleton]"),"::after").animationName'), 'none');
  await release('/api/catalog'); await until(() => evaluate('document.body.innerText.includes("Skeleton Sneaker")'), 'catalog replaces skeleton');
  await call('Emulation.setEmulatedMedia', { features: [] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  for (const [path, label, settled] of [['/cart', 'Items pending', 'Your next fit is waiting'], ['/checkout', 'Checkout pending', 'Nothing to check out yet'], ['/wishlist', 'Products pending', 'Your wishlist belongs to you']]) {
    hold('/api/auth/session'); await navigate(path); await skeleton(label); await release('/api/auth/session');
    await until(() => evaluate(`document.body.innerText.includes(${JSON.stringify(settled)})`), `${path} settled`);
  }
  await call('Network.setCookie', { name: 'urbanforge_user_session', value: tokens.user, url: base, path: '/' });
  hold('/api/orders'); await navigate('/account'); await skeleton('Items pending'); await release('/api/orders');
  await until(() => evaluate('document.body.innerText.includes("No orders yet")'), 'account settled');
  hold('/api/wishlist'); await navigate('/wishlist'); await skeleton('Products pending'); await release('/api/wishlist');
  await until(() => evaluate('document.body.innerText.includes("Skeleton Sneaker")'), 'wishlist settled');

  await navigate('/products/skeleton-shoe');
  await until(() => evaluate('!!document.querySelector("#product-tab-2")'), 'product tabs'); await delay(300);
  const reviewPath = '/api/catalog/skeleton-shoe/reviews'; hold(reviewPath);
  await evaluate('document.querySelector("#product-tab-2").click()'); await skeleton('Reviews pending'); await release(reviewPath);
  await until(() => evaluate('document.body.innerText.includes("No reviews yet")'), 'reviews settled');
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add review').click()`);
  await evaluate(`document.querySelector('input[name="rating"][value="5"]').click()`);
  const button = `document.querySelector('form[aria-label="Add a product review"] button[type="submit"]')`;
  const before = await evaluate(`${button}.getBoundingClientRect().width`);
  hold(reviewPath, 'POST'); await evaluate(`${button}.click()`);
  await until(() => evaluate(`!!${button}.querySelector('[data-skeleton]')`), 'pending review button');
  assert.equal(await evaluate(`${button}.disabled`), true);
  assert.equal(await evaluate(`${button}.getBoundingClientRect().width`), before, 'button keeps its width');
  assert.equal(await evaluate(`${button}.textContent`), 'Post review', 'accessible action label stays stable');
  assert.equal(await evaluate(`getComputedStyle(${button}.querySelector('[aria-busy] > span')).opacity`), '0', 'label is visually replaced');
  await release(reviewPath, 'POST'); await until(() => evaluate('document.body.innerText.includes("Your review has been posted")'), 'review posted');

  await call('Network.setCookie', { name: 'urbanforge_admin_session', value: tokens.admin, url: base, path: '/' });
  hold('/api/admin/dashboard'); await navigate('/adminroute'); await skeleton('Store overview pending'); await release('/api/admin/dashboard');
  await until(() => evaluate('document.body.innerText.includes("Welcome back")'), 'dashboard settled');
  for (const [title, path, label] of [['Products', 'products', 'Records pending'], ['Inventory', 'inventory', 'Records pending'], ['Orders', 'orders', 'Records pending'], ['Customers', 'customers', 'Records pending'], ['Discounts & coupons', 'coupons', 'Summary pending'], ['Sales & promotions', 'promotions', 'Summary pending']]) {
    hold(`/api/admin/${path}`);
    await evaluate(`Array.from(document.querySelectorAll('nav[aria-label="Admin navigation"] button')).find(b=>b.textContent===${JSON.stringify(title)}).click()`);
    await skeleton(label); await release(`/api/admin/${path}`);
    await until(() => evaluate(`!document.querySelector('main [aria-label=${JSON.stringify(label)}][aria-busy="true"]')`), `${title} settled`);
  }
  assert.deepEqual(errors, []);
});
