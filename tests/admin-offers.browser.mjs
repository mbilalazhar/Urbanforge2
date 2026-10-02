import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function until(fn, label) {
  for (let i = 0; i < 100; i++) { if (await fn()) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  await exited; clearTimeout(timer);
}

test('admin customers and category offer forms save live data', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('admin_offers_browser_test');
  const products = db.collection('admin_products');
  await products.insertOne({ _id: 'preview-shoe', id: 'preview-shoe', name: 'Preview Sneaker', description: 'Live leather sneaker description.', shortDescription: 'A live preview from the catalog.', category: 'Shoes', subcategory: 'Sneakers & Athletic', productType: '', brand: 'UrbanForge', gender: 'unisex', price: 24500, salePrice: 21500, sku: 'PREVIEW', skuKeys: ['PREVIEW', 'W8', 'W9', 'B8'], images: ['/shoes.png'], videos: [], colors: ['White', 'Black'], sizes: ['8', '9'], material: 'Leather', stock: 7, tags: [], status: 'active', featured: true, newArrival: false, bestseller: false, seoTitle: '', seoDescription: '', variants: [{ id: 'w8', sku: 'W8', color: 'White', size: '8', stock: 5 }, { id: 'w9', sku: 'W9', color: 'White', size: '9', stock: 0 }, { id: 'b8', sku: 'B8', color: 'Black', size: '8', stock: 2 }], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const appPort = await freePort(), base = `http://localhost:${appPort}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'admin_offers_browser_test', ADMIN_PROVISIONING_KEY: 'browser-offers-test-provisioning-key' }, stdio: 'ignore' });
  await until(async () => { try { return (await fetch(base + '/api/catalog', { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; } }, 'app startup');
  const detail = await fetch(base + '/api/catalog/preview-shoe');
  assert.equal(detail.status, 200, await detail.clone().text());
  assert.equal((await detail.json()).product.shortDescription, 'A live preview from the catalog.');
  profile = await mkdtemp(join(tmpdir(), 'urbanforge-preview-'));
  const debugPort = await freePort();
  browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--no-proxy-server', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`, 'about:blank'], { stdio: 'ignore' });
  let target;
  await until(async () => { try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find(page => page.type === 'page'); return !!target; } catch { return false; } }, 'browser startup');
  ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
  let sequence = 0; const pending = new Map(), errors = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id); if (!callback) return;
      pending.delete(message.id); clearTimeout(callback.timer);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error))); else callback.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value));
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 5000);
      pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });

  const account = { name: 'Browser Admin', email: 'admin@offers.test', password: 'Valid-password-123' };
  const admin = await fetch(base + '/api/admin/signup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-provisioning-key': 'browser-offers-test-provisioning-key' }, body: JSON.stringify(account) });
  assert.equal(admin.status, 201);
  const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  await call('Network.setCookie', { name: cookie.slice(0, cookie.indexOf('=')), value: cookie.slice(cookie.indexOf('=') + 1), url: base, httpOnly: true });
  const user = await fetch(base + '/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...account, name: 'Live Customer', email: 'live-customer@example.com' }) });
  assert.equal(user.status, 201);
  await db.collection('users').updateOne({ email: 'live-customer@example.com' }, { $set: { contact: '03001234567' } });
  await call('Page.navigate', { url: base + '/adminroute' });
  await until(() => evaluate("!!document.querySelector('nav[aria-label=\"Admin navigation\"]')"), 'admin portal');
  async function click(text, root = 'document') {
    await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  }
  async function fill(name, value) {
    await evaluate(`(() => {const e=document.querySelector('dialog[open] [name="${name}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  async function selectLabel(label, value) {
    await evaluate(`(() => {const e=Array.from(document.querySelectorAll('dialog[open] label')).find(l=>l.textContent.startsWith(${JSON.stringify(label)})).querySelector('select');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  }
  async function checkCategory(category) {
    await evaluate(`Array.from(document.querySelectorAll('dialog[open] fieldset label')).find(l=>l.textContent===${JSON.stringify(category)}).querySelector('input').click()`);
  }
  await click('Customers');
  await until(async () => { await click('Customers'); return evaluate("document.querySelector('main').textContent.includes('live-customer@example.com')"); }, 'real registered user').catch(async error => { t.diagnostic(await evaluate("document.querySelector('main').textContent")); t.diagnostic(JSON.stringify(errors)); throw error; });
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('03001234567')"), true);
  assert.equal(await evaluate("document.querySelector('main').textContent.includes('Preview mode')"), false);
  assert.equal(await evaluate("document.querySelector('tbody tr').textContent.includes('Registered user')"), true);
  await click('Discounts & coupons');
  await click('Create discount code');
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), 'discount editor');
  await selectLabel('Code kind', 'promo');
  await fill('code', 'BROWSER20');
  await fill('value', '20');
  await selectLabel('Applies to', 'categories');
  assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('dialog[open] fieldset label')).map(l=>l.textContent)"), ['Women', 'Men', 'Kids', 'Accessories', 'Shoes', 'Brands']);
  assert.equal(await evaluate("document.querySelector('dialog').textContent.includes('Eligible products')"), false);
  await click('Create discount code', "document.querySelector('dialog[open]')");
  await until(() => evaluate("document.querySelector('[role=alert]')?.textContent.includes('Select at least one main category')"), 'empty category validation');
  await checkCategory('Men'); await checkCategory('Shoes');
  await click('Create discount code', "document.querySelector('dialog[open]')");
  await until(() => evaluate("!document.querySelector('dialog[open]') && document.querySelector('main').textContent.includes('BROWSER20')"), 'persisted promo card');
  const code = await db.collection('admin_coupons').findOne({ code: 'BROWSER20' });
  assert.equal(code.kind, 'promo'); assert.deepEqual(code.categories, ['Men', 'Shoes']); assert.deepEqual(code.productIds, []);
  await call('Page.reload');
  await until(() => evaluate("!!document.querySelector('nav[aria-label=\"Admin navigation\"]')"), 'portal reload');
  await until(async () => { await click('Discounts & coupons'); return evaluate("document.querySelector('main').textContent.includes('BROWSER20')"); }, 'promo survives reload');
  await evaluate("document.querySelector('button[aria-label=\"Edit BROWSER20\"]').click()");
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), 'edit promo');
  assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('dialog[open] fieldset input:checked')).map(e=>e.parentElement.textContent)"), ['Men', 'Shoes']);
  await selectLabel('Applies to', 'store');
  await click('Save discount code', "document.querySelector('dialog[open]')");
  await until(() => evaluate("!document.querySelector('dialog[open]')"), 'saved store scope');
  assert.deepEqual((await db.collection('admin_coupons').findOne({ code: 'BROWSER20' })).categories, []);
  await click('Sales & promotions'); await click('Create sale');
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), 'sale editor');
  await fill('name', 'Browser Store Sale');
  await fill('discountPercent', '30');
  await click('Create sale', "document.querySelector('dialog[open]')");
  await until(() => evaluate("!document.querySelector('dialog[open]') && document.querySelector('main').textContent.includes('Browser Store Sale')"), 'saved store sale');
  const sale = await db.collection('admin_promotions').findOne({ name: 'Browser Store Sale' });
  assert.deepEqual(sale.categories, []); assert.deepEqual(sale.productIds, []);
  const quote = await fetch(base + '/api/checkout/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId: 'preview-shoe', variantId: 'w8', quantity: 1 }], deliveryMethod: 'standard', email: 'buyer@example.com', couponCode: 'BROWSER20' }) });
  assert.equal(quote.status, 200);
  const priced = (await quote.json()).quote;
  assert.equal(priced.subtotal, 17150); assert.equal(priced.discount, 3430); assert.equal(priced.total, 13720);
  await evaluate("document.querySelector('button[aria-label=\"Edit Browser Store Sale\"]').click()");
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), 'edit sale');
  await selectLabel('Applies to', 'categories'); await checkCategory('Women');
  await click('Save sale', "document.querySelector('dialog[open]')");
  await until(() => evaluate("!document.querySelector('dialog[open]')"), 'saved category sale');
  assert.deepEqual((await db.collection('admin_promotions').findOne({ name: 'Browser Store Sale' })).categories, ['Women']);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('button[aria-label=\"Edit Browser Store Sale\"]').click()");
  await until(() => evaluate("!!document.querySelector('dialog[open]')"), 'mobile editor');
  assert.equal(await evaluate("document.querySelector('dialog[open]').getBoundingClientRect().width <= innerWidth"), true);
  const screenshot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/urbanforge-admin-offers-mobile.png', Buffer.from(screenshot.data, 'base64'));
  assert.deepEqual(errors, [], 'no browser runtime errors');
});
