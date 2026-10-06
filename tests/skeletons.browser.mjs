import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

async function port() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const value = server.address().port; await new Promise(resolve => server.close(resolve)); return value;
}
async function until(fn, label, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt++) { if (await fn()) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000); await exited; clearTimeout(timer);
}
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';

test('page skeletons, button spinners, toasts, and modal feedback across the store', { skip: !existsSync(chrome), timeout: 120_000 }, async t => {
  let mongo, client, server, browser, ws, profile;
  t.after(async () => { ws?.close(); await stop(browser); await stop(server); await client?.close(); await mongo?.stop(); if (profile) await rm(profile, { recursive: true, force: true }); });
  mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_skeleton_test');
  const product = { _id: 'skeleton-shoe', id: 'skeleton-shoe', name: 'Skeleton Sneaker', description: 'Everyday comfort.', shortDescription: '', category: 'Shoes', subcategory: 'Sneakers & Athletic', brand: 'UrbanForge', gender: 'unisex', price: 2500, salePrice: null, sku: 'SKELETON', skuKeys: ['SKELETON'], images: ['/shoes.png'], videos: [], colors: [], sizes: [], material: '', stock: 10, tags: [], status: 'active', featured: true, newArrival: true, bestseller: false, seoTitle: '', seoDescription: '', variants: [], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
  let sequence = 0; const pending = new Map(), errors = [], consoleMessages = [], held = new Map(), paused = new Map(), failures = new Map();
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 8000);
      pending.set(id, { resolve, reject, timer, method }); ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data), callback = pending.get(message.id);
    if (callback) { pending.delete(message.id); clearTimeout(callback.timer); if (message.error) callback.reject(new Error(`${callback.method}: ${JSON.stringify(message.error)}`)); else callback.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Runtime.consoleAPICalled') consoleMessages.push(message.params.type);
    if (message.method === 'Fetch.requestPaused') {
      const { request, requestId } = message.params, key = `${request.method} ${new URL(request.url).pathname}`;
      if (failures.has(key)) { const message = failures.get(key); failures.delete(key); void call('Fetch.fulfillRequest', { requestId, responseCode: 503, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify({ message })).toString('base64') }).catch(error => errors.push(error.message)); }
      else if (held.has(key)) paused.set(requestId, key);
      else void call('Fetch.continueRequest', { requestId }).catch(error => errors.push(error.message));
    }
  });
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }).catch(error => { throw new Error(`${expression}: ${error.message}`); });
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
  await until(() => evaluate(`!!${button}.querySelector('[data-spinner]')`), 'pending review spinner');
  assert.equal(await evaluate(`${button}.disabled`), true);
  assert.equal(await evaluate('document.querySelectorAll("button [data-skeleton]").length'), 0, 'buttons never contain skeletons');
  assert.equal(await evaluate(`${button}.getBoundingClientRect().width`), before, 'button keeps its width');
  assert.equal(await evaluate(`${button}.textContent`), 'Post review', 'accessible action label stays stable');
  assert.equal(await evaluate(`getComputedStyle(${button}.querySelector('[aria-busy] > span')).opacity`), '0', 'label is visually replaced');
  // Review success must be visible even without the browser's Popover API.
  await evaluate(`(() => { window.savedShowPopover = HTMLElement.prototype.showPopover; Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, writable: true, value: undefined }); return true; })()`);
  await release(reviewPath, 'POST'); await until(() => evaluate('document.body.innerText.includes("Your review has been posted")'), 'review posted');
  await delay(250);
  assert.equal(await evaluate(`(() => { const toast = document.querySelector('[aria-label="Notifications"]'); const rect = toast.getBoundingClientRect(); return rect.width > 100 && rect.height > 30 && rect.top >= 0 && rect.bottom <= innerHeight && getComputedStyle(toast).display !== 'none' && toast.contains(document.elementFromPoint(rect.x + 25, rect.y + 25)); })()`), true, 'review toast is visible and unobscured without Popover API');
  await writeFile('/tmp/urbanforge-review-success.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await evaluate(`(() => { HTMLElement.prototype.showPopover = window.savedShowPopover; return true; })()`);

  await call('Network.setCookie', { name: 'urbanforge_admin_session', value: tokens.admin, url: base, path: '/' });
  hold('/api/admin/dashboard'); await navigate('/adminroute'); await skeleton('Store overview pending'); await release('/api/admin/dashboard');
  await until(() => evaluate('document.body.innerText.includes("Welcome back")'), 'dashboard settled');
  hold('/api/admin/dashboard'); await clickText('Refresh');
  await until(() => evaluate(`!!document.querySelector('main button [data-spinner]')`), 'refresh spinner');
  await release('/api/admin/dashboard'); await toast('Store overview refreshed.');
  for (const [title, path, label] of [['Products', 'products', 'Records pending'], ['Inventory', 'inventory', 'Records pending'], ['Orders', 'orders', 'Records pending'], ['Customers', 'customers', 'Records pending'], ['Discounts & coupons', 'coupons', 'Summary pending'], ['Sales & promotions', 'promotions', 'Summary pending']]) {
    hold(`/api/admin/${path}`);
    await evaluate(`Array.from(document.querySelectorAll('nav[aria-label="Admin navigation"] button')).find(b=>b.textContent===${JSON.stringify(title)}).click()`);
    await skeleton(label); await release(`/api/admin/${path}`);
    await until(() => evaluate(`!document.querySelector('main [aria-label=${JSON.stringify(label)}][aria-busy="true"]')`), `${title} settled`);
  }
  // Error feedback appears only in a keyboard-accessible modal with a blurred backdrop.
  async function modal(message) {
    await until(() => evaluate(`document.querySelector('dialog[role="alertdialog"][open]')?.textContent.includes(${JSON.stringify(message)})`), message);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('dialog[role="alertdialog"]'), '::backdrop').backdropFilter`), 'blur(8px)');
    assert.equal(await evaluate(`document.querySelector('dialog[role="alertdialog"]').contains(document.activeElement)`), true, 'focus enters modal');
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('main p, main [role="alert"]')).filter(el=>!el.closest('dialog')).some(el=>el.textContent.includes(${JSON.stringify(message)}))`), false, 'no inline error text');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate(`document.querySelector('dialog[role="alertdialog"]').contains(document.activeElement)`), true, 'focus stays in modal');
  }
  async function dismissModal() {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await until(() => evaluate(`!document.querySelector('dialog[role="alertdialog"][open]')`), 'modal dismissed');
  }
  async function toast(message) {
    await until(() => evaluate(`document.querySelector('[aria-label="Notifications"]:popover-open')?.textContent.includes(${JSON.stringify(message)})`), message);
  }
  async function clickText(text, root = 'document') {
    await evaluate(`Array.from(${root}.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  }
  async function fill(name, value) {
    await evaluate(`(()=>{const el=document.querySelector('input[name="${name}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  }
  failures.set('GET /api/catalog', 'Catalog is temporarily unavailable.');
  await navigate('/search'); await modal('Catalog is temporarily unavailable.');
  await clickText('Try again', `document.querySelector('dialog[role="alertdialog"]')`);
  await until(() => evaluate('document.body.innerText.includes("Skeleton Sneaker") && !document.querySelector("dialog[open]")'), 'retry recovers catalog');

  // Toasts remain visible above an existing quick-view dialog.
  await evaluate(`document.querySelector('button[aria-label="Quick view Skeleton Sneaker"]').click()`);
  await until(() => evaluate(`Array.from(document.querySelectorAll('dialog[open] button')).some(b=>b.textContent==='Add to Cart' && !b.disabled)`), 'quick view');
  await clickText('Add to Cart', `document.querySelector('dialog[open]')`); await toast('added to your cart');
  await delay(250);
  const screenshot = await call('Page.captureScreenshot', { format: 'png' }); await writeFile('/tmp/urbanforge-feedback-toast.png', Buffer.from(screenshot.data, 'base64'));
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });

  // Action errors preserve entered text and retry successfully.
  await navigate('/products/skeleton-shoe'); await until(() => evaluate('!!document.querySelector("#product-tab-2")'), 'product');
  await delay(300); await evaluate('document.querySelector("#product-tab-2").click()');
  await until(() => evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Add review')`), 'reviews');
  await clickText('Add review'); await evaluate(`document.querySelector('input[name="rating"][value="4"]').click()`);
  failures.set('POST ' + reviewPath, 'Review could not be saved.'); await clickText('Post review'); await modal('Review could not be saved.');
  assert.equal(await evaluate(`document.querySelector('input[name="rating"][value="4"]').checked`), true);
  await delay(250);
  await writeFile('/tmp/urbanforge-feedback-modal.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await dismissModal(); await clickText('Post review'); await toast('Your review has been posted');

  // Validation warnings repeat on every invalid attempt and preserve native constraints.
  await call('Network.deleteCookies', { name: 'urbanforge_user_session', url: base });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/login'); await until(() => evaluate('!!document.querySelector("input[name=email]")'), 'login form'); await delay(300);
  for (let attempt = 0; attempt < 2; attempt++) { await clickText('Continue with Google'); await modal('Google sign-in isn’t available yet'); await dismissModal(); }
  for (let attempt = 0; attempt < 2; attempt++) { await clickText('Log In'); await modal('Please fill out this field'); await dismissModal(); }
  await fill('email', 'nobody@example.com'); await fill('password', 'Incorrect-password-123');
  hold('/api/auth/login', 'POST'); await clickText('Log In');
  await until(() => evaluate(`!!document.querySelector('button[type="submit"] [data-spinner]')`), 'login spinner');
  assert.equal(await evaluate(`document.querySelectorAll('button [data-skeleton]').length`), 0);
  await release('/api/auth/login', 'POST'); await modal('email or password'); await dismissModal();
  // Account creation succeeds, and its toast survives the account redirect.
  await navigate('/signup'); await until(() => evaluate('!!document.querySelector("input[name=confirmPassword]")'), 'signup'); await delay(300);
  for (const [name, value] of Object.entries({ name: 'Feedback User', email: 'feedback@example.com', password: 'Valid-password-123', confirmPassword: 'Valid-password-123' })) await fill(name, value);
  await clickText('Create Account'); await until(() => evaluate('location.pathname==="/account"'), 'signup redirect'); await toast('Your account has been created');

  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // A failed profile save opens above its editor, preserving values and focus.
  await evaluate(`Array.from(document.querySelectorAll('nav[aria-label="Account sections"] button')).find(button => button.textContent.includes('Settings')).click()`);
  await clickText('Edit Profile');
  await until(() => evaluate(`!!document.querySelector('dialog[open] input[name="name"]')`), 'profile editor');
  await fill('name', 'Updated Feedback User');
  failures.set('PATCH /api/account/profile', 'Profile could not be saved.');
  await clickText('Save Changes', `document.querySelector('dialog[open]')`); await modal('Profile could not be saved.');
  assert.equal(await evaluate('document.querySelectorAll("dialog[open]").length'), 2);
  await dismissModal();
  assert.equal(await evaluate(`document.querySelector('dialog[open] input[name="name"]').value`), 'Updated Feedback User');
  await clickText('Save Changes', `document.querySelector('dialog[open]')`); await toast('Profile saved.');
  await until(() => evaluate('!document.querySelector("dialog[open]")'), 'profile editor closed');

  // The shared banner spans every layout, and old acceptance does not opt into analytics.
  const cookieNotice = `document.querySelector('aside[aria-labelledby="cookie-notice-title"]')`;
  const preferenceKey = 'urbanforge:cookie-preferences:v2';
  assert.equal(await evaluate(`localStorage.getItem('urbanforge-visitor')`), null, 'no analytics identifier before consent');
  assert.equal((await db.collection('admin_products').findOne({ id: product.id })).views, 0, 'no analytics before consent');
  await evaluate(`localStorage.setItem('urbanforge:cookie-acceptance:v1', 'accepted')`);
  for (const path of ['/about', '/login', '/cookie-policy', '/adminroute', '/']) {
    await call('Page.navigate', { url: base + path });
    await until(() => evaluate(`!!${cookieNotice}`), `cookie notice on ${path}`);
    assert.equal(await evaluate(`document.querySelectorAll('aside[aria-labelledby="cookie-notice-title"]').length`), 1);
    assert.equal(await evaluate(`${cookieNotice}.querySelectorAll('button').length`), 2);
    assert.equal(await evaluate(`(() => {const r=${cookieNotice}.getBoundingClientRect();return r.left===0 && r.right===document.documentElement.clientWidth && r.bottom===innerHeight;})()`), true, 'desktop banner spans the viewport');
  }
  await writeFile('/tmp/urbanforge-cookies-desktop.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate(`!!${cookieNotice}`), true, 'Escape does not dismiss cookie choice');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  assert.equal(await evaluate(`(() => {const r=${cookieNotice}.getBoundingClientRect();return r.left===0 && r.right===document.documentElement.clientWidth && r.bottom===innerHeight;})()`), true, 'mobile banner spans the viewport');
  await writeFile('/tmp/urbanforge-cookies-mobile.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await clickText('Necessary only'); await until(() => evaluate(`!${cookieNotice}`), 'necessary choice saved');
  await toast('Necessary cookies only. Preferences saved.');
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(preferenceKey)})`), 'necessary');
  assert.equal(await evaluate(`localStorage.getItem('urbanforge:cookie-acceptance:v1')`), null);
  await navigate('/products/skeleton-shoe'); await until(() => evaluate('!!document.querySelector("#product-tab-2")'), 'product with necessary cookies'); await delay(400);
  assert.equal(await evaluate(`!!${cookieNotice}`), false, 'choice persists across pages');
  assert.equal(await evaluate(`localStorage.getItem('urbanforge-visitor')`), null, 'necessary-only does not enable analytics');
  assert.equal((await db.collection('admin_products').findOne({ id: product.id })).views, 0);
  await call('Page.reload'); await until(() => evaluate('!!document.querySelector("#product-tab-2")'), 'product reloaded'); await delay(400);
  assert.equal(await evaluate(`!!${cookieNotice}`), false, 'necessary choice persists after reload');
  // Emulate site-data clearing and its cross-tab storage notification.
  await evaluate(`localStorage.removeItem(${JSON.stringify(preferenceKey)}); window.dispatchEvent(new StorageEvent('storage', { key: ${JSON.stringify(preferenceKey)} }))`);
  await until(() => evaluate(`!!${cookieNotice}`), 'cookie choices reset');
  await clickText('Accept all cookies'); await until(() => evaluate(`!${cookieNotice}`), 'all cookies accepted');
  await toast('All cookies accepted. Preferences saved.');
  assert.equal(await evaluate(`localStorage.getItem(${JSON.stringify(preferenceKey)})`), 'all');
  await until(async () => (await db.collection('admin_products').findOne({ id: product.id })).views === 1, 'analytics enabled after accepting all on the current product');
  assert.ok(await evaluate(`localStorage.getItem('urbanforge-visitor')`));
  await call('Page.navigate', { url: base + '/' }); await until(() => evaluate('!!document.querySelector("#new-arrivals")'), 'home after accepting all'); await delay(400);
  assert.equal(await evaluate(`!!${cookieNotice}`), false, 'all-cookies choice persists across pages');
  await call('Page.reload'); await until(() => evaluate('!!document.querySelector("#new-arrivals")'), 'home reloaded'); await delay(400);
  assert.equal(await evaluate(`!!${cookieNotice}`), false, 'all-cookies choice persists after reload');
  await evaluate(`localStorage.removeItem(${JSON.stringify(preferenceKey)}); window.dispatchEvent(new StorageEvent('storage', { key: ${JSON.stringify(preferenceKey)} }))`);
  await until(() => evaluate(`!!${cookieNotice}`), 'cookie choices reset again');
  await clickText('Necessary only'); await until(() => evaluate(`!${cookieNotice}`), 'necessary choice replaces all');
  assert.equal(await evaluate(`localStorage.getItem('urbanforge-visitor')`), null, 'necessary-only clears existing analytics storage');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  // Admin action warnings and successes use the same shared components.
  await navigate('/adminroute'); await until(() => evaluate(`!!document.querySelector('nav[aria-label="Admin navigation"]')`), 'admin navigation');
  await clickText('Products', `document.querySelector('nav[aria-label="Admin navigation"]')`);
  await until(() => evaluate(`!!document.querySelector('button[aria-label="Delete Skeleton Sneaker"]')`), 'admin products');
  await evaluate(`document.querySelector('button[aria-label="Delete Skeleton Sneaker"]').click()`); await modal('Delete product?');
  await clickText('Keep product', `document.querySelector('dialog[role="alertdialog"]')`);
  hold('/api/admin/products/skeleton-shoe', 'PATCH');
  await evaluate(`document.querySelector('button[title="Click to deactivate Skeleton Sneaker"]').click()`);
  await until(() => evaluate(`!!document.querySelector('button[title="Click to deactivate Skeleton Sneaker"] [data-spinner]')`), 'admin spinner');
  await release('/api/admin/products/skeleton-shoe', 'PATCH'); await toast('Product deactivated.');

  // The existing portrait assets are requested at enough resolution for their display size.
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await navigate('/account'); await until(() => evaluate(`!!document.querySelector('img[alt="Profile avatar"]')`), 'avatar');
  await until(() => evaluate(`document.querySelector('img[alt="Profile avatar"]').naturalWidth > 0`), 'avatar decoded');
  async function checkPortrait(selector, expectedWidth, expectedQuality = "90") {
    const result = await evaluate(`(() => { const img=document.querySelector(${JSON.stringify(selector)}), css=getComputedStyle(img);return { width:img.getBoundingClientRect().width, sourceWidth:Number(new URL(img.currentSrc).searchParams.get('w')), quality:new URL(img.currentSrc).searchParams.get('q'), filter:css.filter, transform:css.transform }; })()`);
    assert.ok(Math.abs(result.width - expectedWidth) < 8, JSON.stringify(result));
    assert.ok(result.sourceWidth >= result.width * 2, 'sharp at 2x pixel density');
    assert.equal(result.quality, expectedQuality); assert.equal(result.filter, 'none'); assert.equal(result.transform, 'none');
  }
  await checkPortrait('img[alt="Profile avatar"]', 80);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false });
  await delay(250); await checkPortrait('img[alt="Profile avatar"]', 128);
  await writeFile('/tmp/urbanforge-profile-clear.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await navigate('/about'); await until(() => evaluate('!!document.querySelector("#testimonial-track img")'), 'testimonials');
  await evaluate('document.querySelector("#testimonial-track").scrollIntoView({block:"center"})');
  await until(() => evaluate(`Array.from(document.querySelectorAll('#testimonial-track img')).slice(0, 3).every(img => img.complete && img.naturalWidth > 0)`), 'remote testimonial portraits loaded', 300);
  await evaluate(`Promise.all(Array.from(document.querySelectorAll('#testimonial-track img')).slice(0, 3).map(img => img.decode())).then(() => true)`);
  await delay(250);
  await checkPortrait('#testimonial-track img', 80, '80');
  await writeFile('/tmp/urbanforge-testimonials-clear.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  assert.deepEqual(consoleMessages, [], 'no application console messages');
  assert.deepEqual(errors, []);
});
