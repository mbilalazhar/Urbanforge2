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

test('checkout browser flow: cart, Buy Now, prefilling, failure recovery and mobile', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('checkout_browser_test');
  const products = db.collection('admin_products');
  await products.insertOne({ _id: 'preview-shoe', id: 'preview-shoe', name: 'Preview Sneaker', description: 'Live leather sneaker description.', shortDescription: 'A live preview from the catalog.', category: 'Shoes', subcategory: 'Sneakers & Athletic', productType: '', brand: 'UrbanForge', gender: 'unisex', price: 24500, salePrice: 21500, sku: 'PREVIEW', skuKeys: ['PREVIEW', 'W8', 'W9', 'B8'], images: ['/shoes.png'], videos: [], colors: ['White', 'Black'], sizes: ['8', '9'], material: 'Leather', stock: 7, tags: [], status: 'active', featured: true, newArrival: false, bestseller: false, seoTitle: '', seoDescription: '', variants: [{ id: 'w8', sku: 'W8', color: 'White', size: '8', stock: 5 }, { id: 'w9', sku: 'W9', color: 'White', size: '9', stock: 0 }, { id: 'b8', sku: 'B8', color: 'Black', size: '8', stock: 2 }], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const appPort = await freePort(), base = `http://localhost:${appPort}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'checkout_browser_test' }, stdio: 'ignore' });
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
  const hasDialog = () => evaluate('!!document.querySelector("dialog[open]")');
  await call('Page.enable'); await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });

  await call('Page.navigate', { url: base + '/products/preview-shoe' });
  await until(() => evaluate("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add to Cart' && !b.disabled)"), 'product/cart ready');
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add to Cart').click()");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Black').click()");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add to Cart').click()");
  await call('Page.navigate', { url: base + '/cart' });
  const checkoutButton = "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Proceed to checkout'))";
  await until(() => evaluate(`!!${checkoutButton} && !${checkoutButton}.disabled`), 'checkout button');
  await evaluate(`${checkoutButton}.click()`);
  const placeOrder = "Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Place Order' && !b.disabled)";
  await until(() => evaluate(`location.pathname==='/checkout' && !!${placeOrder}`), 'cart checkout live quote');
  assert.equal(await evaluate("document.querySelector('aside[aria-label=\"Order summary\"] h2').textContent.includes('(2 items)')"), true);
  for (const name of ['name','email','phone','line1','apartment','city','province','country']) assert.equal(await evaluate(`document.querySelector('input[name=${name}]').value`), '', `${name} initially blank for guests`);
  async function fill(name, value) {
    await evaluate(`(()=>{const input=document.querySelector('input[name=${name}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  for (const [name,value] of Object.entries({ name: 'Guest Shopper', email: 'guest@example.com', phone: '+923001234567', line1: '123 Main Street', apartment: 'Suite 7', city: 'Lahore', province: 'Punjab', country: 'Pakistan', postalCode: '54000' })) await fill(name,value);
  assert.equal(await evaluate('document.querySelector("main h1").getBoundingClientRect().top > document.querySelector("header").getBoundingClientRect().bottom'),true,'heading clears fixed navbar');
  await writeFile('/tmp/urbanforge-checkout-desktop.jpg', Buffer.from((await call('Page.captureScreenshot', { format: 'jpeg', quality: 55, captureBeyondViewport: true })).data, 'base64'));
  // A failed submission preserves the form and cart and cannot show success.
  await evaluate("window.realCheckoutFetch=window.fetch; window.failCheckoutOnce=true; window.fetch=(...args)=>{if(args[0]==='/api/orders' && window.failCheckoutOnce){window.failCheckoutOnce=false;return Promise.reject(new Error('Simulated connection lost'));}return window.realCheckoutFetch(...args);}");
  await evaluate(`${placeOrder}.click()`);
  await until(() => evaluate("document.body?.textContent.includes('Simulated connection lost')"), 'failure message');
  assert.equal(await hasDialog(), true); assert.equal(await db.collection('admin_orders').countDocuments(), 0);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog[role="alertdialog"]'),'::backdrop').backdropFilter`), 'blur(8px)');
  await evaluate(`document.querySelector('dialog[role="alertdialog"] button[aria-label="Close message"]').click()`);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('urbanforge:cart:v1:guest')).state.items.length"), 2);
  await until(() => evaluate(`!!${placeOrder}`), 'retry ready');
  // Simulate the server saving successfully but the response being lost in transit.
  await evaluate("window.loseConfirmationOnce=true;window.fetch=async(...args)=>{const response=await window.realCheckoutFetch(...args);if(args[0]==='/api/orders' && window.loseConfirmationOnce){window.loseConfirmationOnce=false;throw new Error('Confirmation response lost');}return response;}");
  await evaluate(`${placeOrder}.click()`);
  await until(() => evaluate("document.body?.textContent.includes('Confirmation response lost')"), 'lost response message');
  assert.equal(await db.collection('admin_orders').countDocuments(), 1);
  assert.equal(await hasDialog(), true);
  await evaluate(`document.querySelector('dialog[role="alertdialog"] button[aria-label="Close message"]').click()`);
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('urbanforge:cart:v1:guest')).state.items.length"), 2);
  await until(() => evaluate(`!!${placeOrder}`), 'same-order retry ready');
  await evaluate(`${placeOrder}.click()`);
  await until(() => evaluate(`document.querySelector('[aria-label="Notifications"]:popover-open')?.textContent.includes('has been placed')`), 'persisted success toast');
  assert.equal(await hasDialog(), false);
  assert.equal(await db.collection('admin_orders').countDocuments(), 1);
  const guestOrder = await db.collection('admin_orders').findOne(); assert.equal(guestOrder.items.length,2); assert.equal(guestOrder.shippingAddress.apartment,'Suite 7');
  assert.equal(await evaluate("JSON.parse(localStorage.getItem('urbanforge:cart:v1:guest')).state.items.length"),0);
  // Signed-in Buy Now includes only the current selection and leaves the cart intact.
  const account = await evaluate("fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Saved Shopper',email:'saved@example.com',password:'Checkout-password-123'})}).then(r=>r.json())");
  assert.ok(account.account?.id);
  await call('Page.navigate', { url: base + '/account' });
  await until(() => evaluate("location.pathname==='/account' && document.body?.textContent.includes('No orders yet')"), 'one shared empty state for new account');
  assert.equal(await evaluate("document.body?.textContent.includes('No current orders') || document.body?.textContent.includes('No past orders yet')"), false);
  await evaluate("fetch('/api/account/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact:'+923221234567',defaultAddress:{recipient:'Saved Recipient',contact:'+923331234567',line1:'Saved Street 9',line2:'Apartment 4',city:'Karachi',region:'Sindh',postalCode:'75000',country:'Pakistan'}})}).then(r=>{if(!r.ok)throw new Error('Profile failed')})");
  await call('Page.navigate', { url: base + '/products/preview-shoe' });
  await until(() => evaluate("!!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add to Cart' && !b.disabled)"), 'signed-in product ready');
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Add to Cart').click()");
  await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Buy Now').click()");
  await until(() => evaluate(`location.pathname==='/checkout' && !!${placeOrder}`), 'Buy Now checkout');
  assert.equal(await evaluate("document.querySelector('aside[aria-label=\"Order summary\"] h2').textContent.includes('(1 item)')"),true);
  for (const [name,value] of Object.entries({name:'Saved Recipient',email:'saved@example.com',phone:'+923331234567',line1:'Saved Street 9',apartment:'Apartment 4',city:'Karachi',province:'Sindh',country:'Pakistan'})) assert.equal(await evaluate(`document.querySelector('input[name=${name}]').value`),value, `${name} prefilled`);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(200);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,'mobile checkout fits viewport');
  assert.equal(await evaluate('document.querySelector("main h1").getBoundingClientRect().top > document.querySelector("header").getBoundingClientRect().bottom'),true,'mobile heading clears navbar');
  await writeFile('/tmp/urbanforge-checkout-mobile.jpg', Buffer.from((await call('Page.captureScreenshot', { format: 'jpeg', quality: 55, captureBeyondViewport: true })).data, 'base64'));
  await evaluate(`${placeOrder}.click()`); await until(() => evaluate(`document.querySelector('[aria-label="Notifications"]:popover-open')?.textContent.includes('has been placed')`),'Buy Now success toast');
  const userOrder=await db.collection('admin_orders').findOne({userId:account.account.id});assert.equal(userOrder.items.length,1);assert.equal(userOrder.customerName,'Saved Recipient');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('urbanforge:cart:v1:user:${account.account.id}')).state.items.length`),1,'Buy Now preserves existing cart');
  await evaluate("document.querySelector('main a[href=\"/account\"]').click()");
  await until(()=>evaluate(`location.pathname==='/account' && document.querySelector('main')?.innerText.includes('${userOrder.number}')`),'account shows new order');
  assert.equal(await evaluate("document.body?.textContent.includes('No past orders yet')"),true,'individual empty state after first order');
  assert.equal(await evaluate("document.body?.textContent.includes('No orders yet')"),false);
  assert.deepEqual(errors, [], 'no uncaught browser errors');
});
