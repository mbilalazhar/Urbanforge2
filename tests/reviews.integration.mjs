import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

async function freePort() {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve)); return port;
}
async function until(fn, label) {
  for (let attempt = 0; attempt < 100; attempt++) { if (await fn()) return; await delay(100); }
  throw new Error(`Timed out: ${label}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGTERM');
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  await exited; clearTimeout(timer);
}

test('product reviews persist, validate input, and work in the browser', { timeout: 120_000 }, async t => {
  let mongo, client, server;
  t.after(async () => { await stop(server); await client?.close(); await mongo?.stop(); });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_reviews_test');
  const product = {
    name: 'Review Sneaker', description: 'A comfortable everyday sneaker.', shortDescription: '',
    category: 'Shoes', subcategory: '', productType: '', brand: 'UrbanForge', gender: 'unisex',
    price: 2500, salePrice: null, images: ['/shoes.png'], videos: [], colors: [], sizes: [],
    material: 'Leather', stock: 10, tags: [], status: 'active', featured: false, newArrival: false,
    bestseller: false, seoTitle: '', seoDescription: '', variants: [], views: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  for (const id of ['first', 'second', 'browser', 'inactive', 'deleted']) {
    await db.collection('admin_products').insertOne({ ...product, _id: id, id, sku: id, skuKeys: [id], ...(id === 'inactive' ? { status: 'inactive' } : {}), ...(id === 'deleted' ? { deletedAt: new Date().toISOString() } : {}) });
  }
  const token = randomBytes(32).toString('hex'), userId = new ObjectId();
  await db.collection('users').insertOne({ _id: userId, name: 'Review Customer', email: 'review@example.com', sessions: [{ tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) }] });
  const cookie = `urbanforge_user_session=${token}`;
  const base = `http://localhost:${await freePort()}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', new URL(base).port], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_reviews_test', MONGODB_DNS_SERVERS: '' }, stdio: 'ignore',
  });
  await until(async () => { try { return (await fetch(base + '/api/auth/session')).ok; } catch { return false; } }, 'server startup');
  const path = id => `${base}/api/catalog/${id}/reviews`;
  const send = (id, body, headers = {}) => fetch(path(id), { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body) });

  await t.test('empty products have no reviews and unavailable products reject reads and writes', async () => {
    const response = await fetch(path('first'));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), { reviews: [], total: 0, average: 0, page: 1, limit: 20 });
    for (const id of ['missing', 'inactive', 'deleted', 'bad.id']) {
      assert.equal((await fetch(path(id))).status, 404);
      assert.equal((await send(id, { rating: 5 })).status, 404);
    }
  });

  await t.test('rating is required, bounded, and numeric; input cannot override identity or product', async () => {
    for (const body of [{}, { comment: 'No rating' }, ...[0, 6, 2.5, '5', null, true].map(rating => ({ rating })), { rating: 4, comment: null }, { rating: 4, comment: 'a'.repeat(2001) }, { rating: 4, productId: 'second' }, { rating: 4, author: 'Impersonated' }]) {
      assert.equal((await send('first', body)).status, 400, JSON.stringify(body));
    }
    assert.equal((await send('first', { rating: 5 }, { Origin: 'https://other.example' })).status, 403);
    assert.equal((await send('first', { rating: 5 }, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await send('first', { rating: 5, comment: 'a'.repeat(9000) })).status, 413);
    assert.equal((await fetch(path('first'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    for (const page of ['0', '-1', '1.5', 'abc', '100001']) assert.equal((await fetch(`${path('first')}?page=${page}`)).status, 400);
    assert.equal(await db.collection('product_reviews').countDocuments(), 0);
  });

  await t.test('rating-only and text reviews persist with product isolation and safe attribution', async () => {
    const first = await send('first', { rating: 5 }); assert.equal(first.status, 201);
    const { review } = await first.json();
    assert.equal(review.author, 'Guest'); assert.equal(review.comment, '');
    assert.equal(review.productId, 'first'); assert.ok(!Number.isNaN(Date.parse(review.createdAt)));
    const second = await send('first', { rating: 3, comment: '  Comfortable shoes.  ' }, { Cookie: cookie });
    assert.equal(second.status, 201);
    const signed = (await second.json()).review;
    assert.equal(signed.author, 'Review Customer'); assert.equal(signed.comment, 'Comfortable shoes.');
    assert.equal(signed.userId, undefined); assert.equal(signed.email, undefined);
    const saved = await db.collection('product_reviews').findOne({ id: signed.id });
    assert.equal(saved.userId, userId.toHexString());
    const result = await (await fetch(path('first'))).json();
    assert.equal(result.total, 2); assert.equal(result.average, 4);
    assert.deepEqual(result.reviews.map(item => item.id), [signed.id, review.id]);
    assert.ok(result.reviews.every(item => !('userId' in item) && !('_id' in item) && !('email' in item)));
    assert.equal((await (await fetch(path('second'))).json()).total, 0);
  });

  await t.test('pagination counts and averages include all reviews for only this product', async () => {
    await db.collection('product_reviews').insertMany(Array.from({ length: 25 }, (_, index) => ({
      _id: `seed-${index}`, id: `seed-${index}`, productId: 'second', author: 'Guest', rating: index < 20 ? 5 : 1,
      comment: '', createdAt: new Date(2026, 0, index + 1).toISOString(), userId: null,
    })));
    const first = await (await fetch(path('second'))).json();
    const second = await (await fetch(`${path('second')}?page=2`)).json();
    assert.equal(first.reviews.length, 20); assert.equal(second.reviews.length, 5);
    assert.equal(first.total, 25); assert.equal(second.average, 4.2);
    assert.equal(new Set([...first.reviews, ...second.reviews].map(item => item.id)).size, 25);
    assert.ok(first.reviews.every(item => item.productId === 'second'));
  });

  const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
  await t.test('browser form validates, posts, recovers from failures, and survives reload', { skip: !existsSync(chrome) }, async t => {
    let browser, ws, profile;
    t.after(async () => { ws?.close(); await stop(browser); if (profile) await rm(profile, { recursive: true, force: true }); });
    profile = await mkdtemp(join(tmpdir(), 'urbanforge-reviews-'));
    const port = await freePort();
    browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--disable-dev-shm-usage', '--no-proxy-server', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' });
    let target;
    await until(async () => { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(page => page.type === 'page'); return !!target; } catch { return false; } }, 'Chrome');
    ws = new WebSocket(target.webSocketDebuggerUrl); await once(ws, 'open');
    let sequence = 0; const pending = new Map();
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data), callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id); clearTimeout(callback.timer);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error))); else callback.resolve(message.result);
    });
    function call(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 5000);
        pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    const section = 'document.querySelector(\'section[aria-label="Customer reviews"]\')';
    const click = text => evaluate(`Array.from(${section}.querySelectorAll('button')).find(b=>b.textContent===${JSON.stringify(text)}).click()`);
    async function openReviews() {
      await until(() => evaluate('!!document.querySelector("#product-tab-2")'), 'product page');
      await delay(300); await evaluate('document.querySelector("#product-tab-2").click()');
      await until(() => evaluate(`!!${section} && !${section}.querySelector('[data-skeleton]')`), 'reviews loaded');
    }
    await call('Page.enable'); await call('Network.enable');
    await call('Page.navigate', { url: base + '/products/browser' }); await openReviews();
    assert.equal(await evaluate(`${section}.textContent.includes('No reviews yet')`), true);
    await click('Add review');
    assert.equal(await evaluate(`${section}.querySelector('button[type="submit"]').disabled`), true);
    await evaluate(`${section}.querySelector('input[value="5"]').click()`);
    await click('Post review');
    await until(() => evaluate(`document.querySelector('[aria-label="Notifications"]')?.textContent.includes('Your review has been posted') && !${section}.querySelector('form')`), 'rating-only submission');
    assert.equal(await evaluate(`${section}.querySelectorAll('article').length`), 1);
    assert.equal(await evaluate(`${section}.textContent.includes('No reviews yet')`), false);
    assert.equal(await evaluate(`${section}.textContent.includes('5.0 / 5')`), true);
    await click('Add review'); await evaluate(`${section}.querySelector('input[value="3"]').click()`);
    const comment = 'Comfortable fit. <script>window.reviewInjected = true</script>';
    await evaluate(`(()=>{const el=${section}.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(comment)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await call('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await click('Post review');
    await until(() => evaluate(`!!document.querySelector('dialog[role="alertdialog"][open]')`), 'submission error');
    assert.equal(await evaluate(`${section}.querySelector('textarea').value`), comment);
    assert.equal(await evaluate(`!!${section}.querySelector('[role="alert"]')`), false);
    await evaluate(`document.querySelector('dialog[role="alertdialog"] button[aria-label="Close message"]').click()`);
    await call('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await click('Post review');
    await until(() => evaluate(`document.querySelector('[aria-label="Notifications"]')?.textContent.includes('Your review has been posted') && !${section}.querySelector('form')`), 'comment submission');
    assert.equal(await evaluate(`${section}.textContent.includes(${JSON.stringify(comment)})`), true);
    assert.equal(await evaluate('window.reviewInjected === undefined'), true);
    assert.equal(await evaluate(`${section}.textContent.includes('4.0 / 5')`), true);
    await call('Page.reload'); await openReviews();
    assert.equal(await evaluate(`${section}.querySelectorAll('article').length`), 2);
    await click('Add review'); await click('Cancel');
    assert.equal(await evaluate(`${section}.querySelector('form') === null`), true);
    await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await evaluate(`${section}.scrollIntoView({block:'center'})`);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile('/tmp/urbanforge-reviews-mobile.png', Buffer.from(shot.data, 'base64'));
    assert.equal(await db.collection('product_reviews').countDocuments({ productId: 'browser' }), 2);
  });

  await t.test('submission rate limits apply across products', async () => {
    // One signed-in review was posted above; nine more fill its window.
    for (let index = 0; index < 9; index++) assert.equal((await send('first', { rating: 4 }, { Cookie: cookie })).status, 201);
    assert.equal((await send('second', { rating: 4 }, { Cookie: cookie })).status, 429);
  });

  await t.test('database outages return errors instead of false success or empty reviews', async () => {
    await mongo.stop();
    assert.equal((await fetch(path('first'))).status, 503);
    const response = await send('first', { rating: 5 });
    assert.equal(response.status, 503); assert.equal((await response.json()).review, undefined);
  });
});
