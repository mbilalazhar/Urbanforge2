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

test('order updates persist and refresh customer spending without a page reload', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('admin_orders_browser_test');
  const products = db.collection('admin_products');
  await products.insertOne({ _id: 'preview-shoe', id: 'preview-shoe', name: 'Preview Sneaker', description: 'Live leather sneaker description.', shortDescription: 'A live preview from the catalog.', category: 'Shoes', subcategory: 'Sneakers & Athletic', productType: '', brand: 'UrbanForge', gender: 'unisex', price: 24500, salePrice: 21500, sku: 'PREVIEW', skuKeys: ['PREVIEW', 'W8', 'W9', 'B8'], images: ['/shoes.png'], videos: [], colors: ['White', 'Black'], sizes: ['8', '9'], material: 'Leather', stock: 7, tags: [], status: 'active', featured: true, newArrival: false, bestseller: false, seoTitle: '', seoDescription: '', variants: [{ id: 'w8', sku: 'W8', color: 'White', size: '8', stock: 5 }, { id: 'w9', sku: 'W9', color: 'White', size: '9', stock: 0 }, { id: 'b8', sku: 'B8', color: 'Black', size: '8', stock: 2 }], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const appPort = await freePort(), base = `http://localhost:${appPort}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'admin_orders_browser_test', ADMIN_PROVISIONING_KEY: 'browser-offers-test-provisioning-key' }, stdio: 'ignore' });
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
  async function api(path, body, session = '', method = 'POST') {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Cookie: session }, body: JSON.stringify(body) });
    const result = await response.json(); assert.ok(response.ok, JSON.stringify(result)); return result;
  }
  const userAccount = (await user.json()).account;
  const items = [{ productId: 'preview-shoe', variantId: 'w8', quantity: 1 }];
  const { quote } = await api('/api/checkout/quote', { items, deliveryMethod: 'standard' });
  const { order } = await api('/api/orders', { items, deliveryMethod: 'standard', accountId: userAccount.id, contact: { name: 'Live Customer', email: 'live-customer@example.com', phone: '03001234567' }, address: { line1: '1 Main Street', city: 'Lahore', province: 'Punjab', country: 'Pakistan' }, paymentMethod: 'cod', requestId: crypto.randomUUID(), quoteToken: quote.quoteToken }, user.headers.get('set-cookie').split(';')[0]);
  const totalText = `Rs. ${order.total.toLocaleString('en-PK')}`;
  async function select(name, value) {
    await evaluate(`(() => {const e=document.querySelector('dialog[open] select[name="${name}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  }
  const statusOptions = () => evaluate("Array.from(document.querySelector('dialog[open] select[name=status]').options).map(o=>o.value)");
  async function openOrder() {
    await click('Orders');
    await until(() => evaluate(`!!document.querySelector('button[aria-label="View order ${order.number}"]')`), 'order listed');
    await evaluate(`document.querySelector('button[aria-label="View order ${order.number}"]').click()`);
    await until(() => evaluate("!!document.querySelector('dialog[open] select[name=status]')"), 'order dialog');
  }
  async function closeOrder() { await evaluate("document.querySelector('dialog[open] button[aria-label=\"Close dialog\"]').click()"); }
  async function checkSpent(expected) {
    await click('Customers');
    await until(() => evaluate(`Array.from(document.querySelectorAll('tbody tr')).find(row=>row.textContent.includes('live-customer@example.com'))?.lastElementChild.textContent===${JSON.stringify(expected)}`), `customer spent ${expected}`);
  }
  async function checkOverview(revenue, sold) {
    await click('Overview');
    await until(() => evaluate("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Refresh' && !b.disabled)"), 'live overview');
    await click('Refresh');
    await until(() => evaluate(`Array.from(document.querySelectorAll('article')).find(a=>a.textContent.includes('Total revenue'))?.querySelector('strong')?.textContent===${JSON.stringify(revenue)}`), `overview revenue ${revenue}`);
    assert.equal(await evaluate("document.querySelector('main').textContent.includes('Preview mode')"), false);
    assert.equal(await evaluate("document.querySelector('main').textContent.includes('sample-order')"), false);
    assert.equal(await evaluate(`document.querySelector('main').textContent.includes(${JSON.stringify(order.number)})`), true);
    assert.equal(await evaluate("Array.from(document.querySelectorAll('article')).find(a=>a.textContent.includes('Total products')).querySelector('strong').textContent"), '1');
    assert.equal(await evaluate("Array.from(document.querySelectorAll('article')).find(a=>a.textContent.includes('Total orders')).querySelector('strong').textContent"), '1');
    assert.equal(await evaluate("Array.from(document.querySelectorAll('article')).find(a=>a.textContent.includes('Total customers')).querySelector('strong').textContent"), '1');
    assert.equal(await evaluate(`document.querySelector('[aria-label^="Sales by category:"]').getAttribute('aria-label').includes(${JSON.stringify(sold ? 'Shoes: 1 items' : 'No sales yet')})`), true);
    await evaluate("(() => { const e=document.querySelector('select[aria-label=\"Chart metric\"]');e.value='orders';e.dispatchEvent(new Event('change',{bubbles:true}));})()");
    await until(() => evaluate("!!document.querySelector('[aria-label^=\"orders by month:\"]')"), 'live orders chart');
    if (sold) { const screenshot = await call('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/urbanforge-live-overview.png', Buffer.from(screenshot.data, 'base64')); }
  }
  await until(async () => { await click('Customers'); return evaluate("document.querySelector('tbody')?.textContent.includes('live-customer@example.com')"); }, 'hydrated customer directory');
  await checkOverview('Rs. 0', false);
  await checkSpent('Rs. 0');
  await openOrder();
  assert.ok((await statusOptions()).includes('delivered'), 'new order can be recorded as delivered directly');
  assert.equal((await statusOptions()).includes('returned'), false);
  assert.equal((await statusOptions()).includes('refunded'), false);
  await select('paymentStatus', 'paid');
  await click('Save changes', "document.querySelector('dialog[open]')");
  await until(() => evaluate("document.querySelector('dialog[open] [role=status]')?.textContent.includes('Order updated')"), 'payment saved');
  assert.equal((await db.collection('admin_orders').findOne({ id: order.id })).paymentStatus, 'paid');
  assert.equal(await evaluate("document.querySelector('select[name=paymentStatus] option[value=pending]').disabled"), true);
  await closeOrder(); await checkSpent(totalText);
  await checkOverview(totalText, true);
  await openOrder();
  await select('status', 'delivered');
  await click('Save changes', "document.querySelector('dialog[open]')");
  await until(() => evaluate("document.querySelector('dialog[open] select[name=status]')?.value==='delivered' && document.querySelector('dialog[open] [role=status]')?.textContent.includes('Order updated')"), 'delivery saved');
  await until(async () => (await db.collection('admin_orders').findOne({ id: order.id })).status === 'delivered', 'persisted delivery');
  assert.deepEqual(await statusOptions(), ['delivered'], 'terminal order cannot move backwards or return before approval');
  assert.equal((await db.collection('admin_orders').findOne({ id: order.id })).paymentStatus, 'paid');
  await closeOrder(); await checkSpent(totalText);
  await checkOverview(totalText, true);
  await call('Page.reload');
  await until(() => evaluate("!!document.querySelector('nav[aria-label=\"Admin navigation\"]')"), 'reloaded portal');
  await until(async () => { await click('Customers'); return evaluate(`document.querySelector('tbody')?.textContent.includes(${JSON.stringify(totalText)})`); }, 'spent survives reload');
  const storedUser = await db.collection('users').findOne({ email: 'live-customer@example.com' });
  assert.ok(storedUser.pastOrderIds.includes(order.id)); assert.equal(storedUser.currentOrderIds.includes(order.id), false);
  assert.deepEqual(errors, [], 'no browser runtime errors');
});
