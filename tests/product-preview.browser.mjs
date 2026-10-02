import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
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

test('product preview, persisted user wishlists, and guest account prompts', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const products = client.db('preview_browser_test').collection('admin_products');
  await products.insertOne({ _id: 'preview-shoe', id: 'preview-shoe', name: 'Preview Sneaker', description: 'Live leather sneaker description.', shortDescription: 'A live preview from the catalog.', category: 'Shoes', subcategory: 'Sneakers & Athletic', productType: '', brand: 'UrbanForge', gender: 'unisex', price: 24500, salePrice: 21500, sku: 'PREVIEW', skuKeys: ['PREVIEW', 'W8', 'W9', 'B8'], images: ['/shoes.png'], videos: [], colors: ['White', 'Black'], sizes: ['8', '9'], material: 'Leather', stock: 7, tags: [], status: 'active', featured: true, newArrival: false, bestseller: false, seoTitle: '', seoDescription: '', variants: [{ id: 'w8', sku: 'W8', color: 'White', size: '8', stock: 5 }, { id: 'w9', sku: 'W9', color: 'White', size: '9', stock: 0 }, { id: 'b8', sku: 'B8', color: 'Black', size: '8', stock: 2 }], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const appPort = await freePort(), base = `http://localhost:${appPort}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'preview_browser_test' }, stdio: 'ignore' });
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
  let sequence = 0; const pending = new Map(), errors = [], wishlistGets = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id); if (!callback) return;
      pending.delete(message.id); clearTimeout(callback.timer);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error))); else callback.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent' && message.params.request.method === 'GET' && new URL(message.params.request.url).pathname === '/api/wishlist') wishlistGets.push(message.params.request.url);
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
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
  const card = 'document.querySelector(\'a[aria-label="View details for Preview Sneaker"]\')';
  const quick = 'document.querySelector(\'button[aria-label="Quick view Preview Sneaker"]\')';
  const move = (x, y) => call('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  async function point() { await evaluate(`${card}.scrollIntoView({block:'center'})`); await delay(150); return evaluate(`(()=>{const r=${card}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+80};})()`); }
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: base + '/search?q=Preview' });
  await until(() => evaluate(`!!${card}`), 'product card'); await delay(500);
  let position = await point(); await move(1, 1); await move(position.x, position.y); await delay(200);
  assert.equal(await hasDialog(), false, 'brief hover does not open');
  await move(1, 1); await delay(800); assert.equal(await hasDialog(), false, 'leaving cancels pending hover');
  await move(position.x, position.y); await delay(100); await evaluate("window.dispatchEvent(new Event('scroll'))"); await delay(800);
  assert.equal(await hasDialog(), false, 'scroll cancels pending hover');
  await move(1, 1); await move(position.x, position.y);
  await until(hasDialog, 'delayed hover modal');
  await until(() => evaluate("document.querySelector('dialog[open]')?.textContent.includes('A live preview from the catalog.')"), 'live description').catch(async error => { t.diagnostic(await evaluate("document.querySelector('dialog[open]')?.textContent")); t.diagnostic(JSON.stringify(errors)); throw error; });
  assert.equal(await evaluate("document.querySelector('dialog[open] button[aria-label=\"Size 9\"]').disabled"), true);
  assert.equal(await evaluate("document.querySelector('dialog[open]').textContent.includes('Rs. 21,500')"), true);
  await evaluate("document.querySelector('dialog[open] button[aria-label=Black]').click()");
  await until(() => evaluate("!Array.from(document.querySelectorAll('dialog[open] button')).find(b=>b.textContent==='Add to Cart').disabled"), 'cart ready');
  await evaluate("Array.from(document.querySelectorAll('dialog[open] button')).find(b=>b.textContent==='Add to Cart').click()");
  await until(() => evaluate("document.querySelector('dialog[open]').textContent.includes('1 item added to your cart')"), 'added to cart');
  const saved = await evaluate("JSON.parse(localStorage.getItem('urbanforge:cart:v1:guest')).state.items[0]");
  assert.equal(saved.productId, 'preview-shoe'); assert.equal(saved.variantId, 'b8'); assert.equal(saved.price, 2150000);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await until(async () => !await hasDialog(), 'Escape closes modal'); await delay(850); assert.equal(await hasDialog(), false, 'close does not immediately reopen');
  assert.equal(await evaluate('document.body.style.overflow'), '');
  await evaluate(`${quick}.focus();${quick}.click()`); await until(hasDialog, 'explicit quick view');
  await evaluate("document.querySelector('dialog[open] button[aria-label=\"Close product details\"]').click()");
  await until(async () => !await hasDialog(), 'close button');
  assert.equal(await evaluate(`document.activeElement===${quick}`), true, 'focus returns to trigger');
  await evaluate(`${quick}.click()`); await until(hasDialog, 'reopen for detail link');
  await evaluate("document.querySelector('dialog[open] a[href=\"/products/preview-shoe\"]').click()");
  await until(() => evaluate("location.pathname==='/products/preview-shoe' && document.querySelector('h1')?.textContent==='Preview Sneaker'"), 'full product navigation');
  assert.equal(await hasDialog(), false);
  // Native touch pointer events must never start a hover timer.
  await call('Page.navigate', { url: base + '/search?q=Preview' }); await until(() => evaluate(`!!${card}`), 'return to listing'); await delay(300);
  await evaluate(`${card}.closest('article').dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'touch'}))`); await delay(900);
  assert.equal(await hasDialog(), false, 'touch does not auto-open a modal');
  await evaluate(`${card}.click()`); await until(() => evaluate("location.pathname==='/products/preview-shoe'"), 'card click navigation');
  const saveHeart = 'document.querySelector(\'button[aria-label="Save Preview Sneaker to wishlist"]\')';
  const removeHeart = 'document.querySelector(\'button[aria-label="Remove Preview Sneaker from wishlist"]\')';
  await until(() => evaluate(`!!${saveHeart} && !${saveHeart}.disabled`), 'guest heart ready');
  await evaluate(`${saveHeart}.click()`);
  await until(() => evaluate('!!document.querySelector(\'dialog[open] a[href="/account"]\')'), 'guest account prompt');
  assert.equal(await evaluate('document.querySelector(\'dialog[open] a[href="/account"]\').textContent.includes("Create your account")'), true);
  assert.equal(await products.countDocuments(), 1);
  assert.equal(await client.db('preview_browser_test').collection('users').countDocuments(), 0, 'guest heart creates no user or wishlist');
  await evaluate('document.querySelector(\'button[aria-label="Close account prompt"]\').click()');
  await until(async () => !await hasDialog(), 'close account prompt');
  async function signup(email) {
    const response = await evaluate(`fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Wishlist User',email:${JSON.stringify(email)},password:'Wishlist-password-123'})}).then(async response=>({status:response.status,body:await response.json()}))`);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response.body.account;
  }
  const firstAccount = await signup('wishlist-a@example.com');
  await call('Page.navigate', { url: base + '/search?q=Preview' });
  await until(() => evaluate(`!!${saveHeart} && !${saveHeart}.disabled`), 'signed-in heart');
  const beforeFocus = wishlistGets.length;
  assert.equal(beforeFocus, 1, 'all product hearts share one initial wishlist request');
  await evaluate("window.__originalNow = Date.now; Date.now = () => window.__originalNow() + 360000");
  for (let i = 0; i < 3; i++) {
    await evaluate("Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); window.dispatchEvent(new Event('visibilitychange'))");
    await evaluate("Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); window.dispatchEvent(new Event('visibilitychange'))");
    await delay(150);
  }
  await evaluate("Date.now = window.__originalNow; delete document.visibilityState");
  assert.equal(wishlistGets.length, beforeFocus, 'switching browser tabs does not refetch even when wishlist data is stale');

  await evaluate(`${saveHeart}.click()`);
  await until(() => evaluate(`!!${removeHeart} && !${removeHeart}.disabled`), 'saved heart');
  assert.deepEqual((await client.db('preview_browser_test').collection('users').findOne({email:firstAccount.email})).wishlistProductIds, ['preview-shoe']);
  await call('Page.navigate', { url: base + '/wishlist' });
  await until(() => evaluate(`!!${removeHeart} && !${removeHeart}.disabled`), 'saved product on wishlist route');
  await call('Page.reload');
  await until(() => evaluate(`!!${removeHeart} && !${removeHeart}.disabled`), 'wishlist survives reload');
  await evaluate(`${removeHeart}.click()`);
  await until(() => evaluate("document.body.innerText.includes('Your wishlist is empty')"), 'remove saved product');
  assert.deepEqual((await client.db('preview_browser_test').collection('users').findOne({email:firstAccount.email})).wishlistProductIds, []);
  await call('Page.navigate', { url: base + '/products/preview-shoe' });
  await until(() => evaluate(`!!${saveHeart} && !${saveHeart}.disabled`), 'detail page heart');
  await evaluate(`${saveHeart}.click()`);
  await until(() => evaluate(`!!${removeHeart} && !${removeHeart}.disabled`), 'detail page save');
  await call('Page.navigate', { url: base + '/account' });
  await until(() => evaluate("Array.from(document.querySelectorAll('button')).some(button=>button.textContent==='WishlistWishlist')"), 'account navigation');
  await delay(300);
  await evaluate("Array.from(document.querySelectorAll('button')).find(button=>button.textContent==='WishlistWishlist').click()");
  await until(() => evaluate(`!!${removeHeart}`), 'account wishlist uses saved products');
  await evaluate("fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})");
  await signup('wishlist-b@example.com');
  await call('Page.navigate', { url: base + '/wishlist' });
  await until(() => evaluate("document.body.innerText.includes('Your wishlist is empty')"), 'another account has its own wishlist');
  assert.deepEqual((await client.db('preview_browser_test').collection('users').findOne({email:firstAccount.email})).wishlistProductIds, ['preview-shoe']);
  const beforePolicy = wishlistGets.length;
  assert.equal(await evaluate("document.querySelectorAll('header a[href=\"/wishlist\"]').length"), 0, 'wishlist removed from navbar');
  await evaluate("document.querySelector('footer a[href=\"/privacy-policy\"]').click()");
  for (const [path, heading] of [['/privacy-policy', 'Privacy Policy'], ['/terms', 'Terms & Conditions'], ['/cookie-policy', 'Cookie Policy']]) {
    if (path !== '/privacy-policy') await evaluate(`document.querySelector('nav[aria-label="Store policies"] a[href="${path}"]').click()`);
    await until(() => evaluate(`document.querySelector('h1')?.textContent===${JSON.stringify(heading)}`), heading);
    assert.equal(await evaluate("document.querySelectorAll('nav[aria-label=\"On this page\"] a').length > 0"), true);
    assert.equal(await evaluate("Array.from(document.querySelectorAll('nav[aria-label=\"On this page\"] a')).every(a=>!!document.getElementById(a.hash.slice(1)))"), true);
    assert.equal(await evaluate("document.querySelectorAll('header a[href=\"/wishlist\"]').length"), 0);
  }
  await delay(300);
  assert.equal(wishlistGets.length, beforePolicy, 'policy navigation never fetches wishlist');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.querySelector('main').scrollWidth <= innerWidth"), true, 'policy fits mobile viewport');
  await evaluate("document.querySelector('button[aria-label=\"Open menu\"]').click()");
  await until(() => evaluate("!!document.querySelector('#mobile-menu[open]')"), 'mobile menu');
  assert.equal(await evaluate("document.querySelectorAll('#mobile-menu a[href=\"/wishlist\"]').length"), 0, 'wishlist removed from mobile menu');
  await evaluate("document.querySelector('button[aria-label=\"Close menu\"]').click()");
  const policyShot = await call('Page.captureScreenshot', { format: 'png' });
  await writeFile('/tmp/urbanforge-cookie-policy-mobile.png', Buffer.from(policyShot.data, 'base64'));
  await call('Page.navigate', { url: base + '/adminroute' });
  await until(() => evaluate("document.querySelector('h1')?.textContent==='Admin Login'"), 'admin route');
  await delay(400);
  assert.equal(wishlistGets.length, beforePolicy, 'admin route never fetches customer wishlist');
  assert.deepEqual(errors, []);
});
