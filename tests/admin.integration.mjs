import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

// Isolated replica set: inventory/order/audit writes are real MongoDB transactions.
test('admin commerce APIs, inventory integrity, and public catalog', { timeout: 240_000 }, async t => {
  const mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  t.after(() => mongo.stop());
  const client = await new MongoClient(mongo.getUri()).connect();
  t.after(() => client.close());
  const db = client.db('urbanforge_admin_test');
  const key = randomBytes(32).toString('hex');
  const probe = createServer();
  probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_admin_test', ADMIN_PROVISIONING_KEY: key },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; }); server.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => { if (server.exitCode === null) { const done = once(server, 'exit'); server.kill('SIGTERM'); await done; } });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(`${base}/api/auth/session`)).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, output);
  let adminCookie;
  const account = { name: 'Store Administrator', email: 'store@example.com', password: 'Valid-password-123' };
  async function api(path, { body, method = body === undefined ? 'GET' : 'POST', cookie = adminCookie, headers = {} } = {}) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
  }
  const patch = (path, body) => api(path, { method: 'PATCH', body });
  let product, variantProduct, paidOrder, coupon, promotion;
  const stockOf = async id => (await api('/api/admin/products')).body.products.find(product => product.id === id).stock;
  const createOrder = (items, more = {}) => api('/api/admin/orders', { body: { customerName: 'Customer A', email: 'customer@example.com', items, ...more } });

  await t.test('every admin data API requires an admin session and signup requires provisioning', async () => {
    for (const path of ['dashboard', 'products', 'inventory', 'inventory/movements', 'orders', 'customers', 'coupons', 'promotions']) assert.equal((await api(`/api/admin/${path}`)).status, 401, path);
    assert.equal((await api('/api/admin/signup', { body: account })).status, 401);
    assert.equal((await api('/api/admin/signup', { body: account, headers: { 'x-admin-provisioning-key': 'wrong-key' } })).status, 401);
    assert.equal((await api('/api/admin/signup', { body: account, headers: { 'x-admin-provisioning-key': key } })).status, 201);
    const user = await api('/api/auth/signup', { body: { ...account, email: 'customer@example.com' } });
    assert.equal((await api('/api/admin/products', { cookie: user.cookie.split(';')[0] })).status, 401);
    const login = await api('/api/admin/login', { body: { email: account.email, password: account.password } });
    assert.equal(login.status, 200); adminCookie = login.cookie.split(';')[0];
    assert.deepEqual((await api('/api/admin/dashboard')).body.products, []);
    assert.equal((await api('/api/catalog')).body.managed, false);
    const empty = await api('/api/admin/inventory?includeHistory=false');
    assert.deepEqual(empty.body.summary, { units: 0, trackedSkus: 0, lowStockSkus: 0, outOfStockSkus: 0 });
    assert.equal(empty.body.movements, undefined);
    assert.deepEqual((await api('/api/admin/inventory/movements')).body, { movements: [], products: [], total: 0, page: 1, pages: 1, limit: 15 });
    for (const path of ['inventory', 'inventory/movements']) assert.equal((await api(`/api/admin/${path}`, { cookie: user.cookie.split(';')[0] })).status, 401);
    assert.equal((await api('/api/admin/inventory', { cookie: user.cookie.split(';')[0], body: {} })).status, 401);
  });

  await t.test('creates products, audits opening stock, validates SKUs and partial updates', async () => {
    const input = { name: 'Cotton Tee', sku: 'uf-tee', price: 2000, stock: 10, status: 'active', category: 'Men', subcategory: 'Tops', productType: 'T-Shirts', images: ['/test-product.png'], featured: true };
    assert.equal((await api('/api/admin/products', { body: input, headers: { Origin: 'https://attacker.example' } })).status, 403);
    assert.equal((await api('/api/admin/products', { body: { ...input, views: 5000 } })).status, 400);
    assert.equal((await api('/api/admin/products', { body: { ...input, salePrice: 2001 } })).status, 400);
    for (const invalid of [{ images: [] }, { images: undefined }, { category: 'Clothing' }, { subcategory: 'Boots' }, { productType: 'Skirts' }, { category: 'Brands', subcategory: 'Men', productType: '' }]) {
      assert.equal((await api('/api/admin/products', { body: { ...input, ...invalid } })).status, 400, JSON.stringify(invalid));
    }
    const created = await api('/api/admin/products', { body: input }); assert.equal(created.status, 201, JSON.stringify(created.body)); product = created.body.product;
    assert.equal(product.sku, 'UF-TEE'); assert.equal(product.views, 0); assert.equal(product._id, undefined);
    assert.equal((await api('/api/admin/products', { body: input })).status, 409);
    const updated = await patch(`/api/admin/products/${product.id}`, { name: 'Cotton Everyday Tee' });
    assert.equal(updated.status, 200); assert.equal(updated.body.product.stock, 10); assert.equal(updated.body.product.featured, true); assert.equal(updated.body.product.status, 'active');
    assert.equal((await patch(`/api/admin/products/${product.id}`, { createdAt: '2000-01-01' })).status, 400);
    assert.equal((await patch(`/api/admin/products/${product.id}`, { images: [] })).status, 400);
    assert.equal((await patch(`/api/admin/products/${product.id}`, { category: 'Shoes' })).status, 400);
    const inventory = await api('/api/admin/inventory'); assert.equal(inventory.body.movements.length, 1); assert.equal(inventory.body.movements[0].quantity, 10);
    const duplicate = await api(`/api/admin/products/${product.id}/duplicate`, { method: 'POST' });
    assert.equal(duplicate.status, 201); assert.equal(duplicate.body.product.status, 'inactive'); assert.equal(duplicate.body.product.stock, 0);
    assert.notEqual(duplicate.body.product.sku, product.sku);
    assert.equal((await api(`/api/catalog/${duplicate.body.product.id}`)).status, 404, 'inactive products are private');
    assert.equal((await api(`/api/admin/products/${duplicate.body.product.id}`, { method: 'DELETE' })).status, 200);
  });

  await t.test('enforces variant stock and records signed adjustment movements', async () => {
    const created = await api('/api/admin/products', { body: { category: 'Men', subcategory: 'Tops', productType: 'Hoodies & Sweatshirts', images: ['/test-hoodie.png'], name: 'Variant Hoodie', sku: 'HOODIE', price: 4000, status: 'active', stock: 999, variants: [{ id: 'black-m', sku: 'HOODIE-BM', color: 'Black', size: 'M', stock: 4 }] } });
    assert.equal(created.status, 201); variantProduct = created.body.product; assert.equal(variantProduct.stock, 4);
    assert.equal((await api('/api/admin/inventory', { body: { productId: variantProduct.id, quantity: 2, type: 'added', reason: 'Restock' } })).status, 400);
    assert.equal((await api('/api/admin/inventory', { body: { productId: variantProduct.id, variantId: 'black-m', quantity: -5, type: 'sold', reason: 'Stock sale' } })).status, 409);
    const adjusted = await api('/api/admin/inventory', { body: { productId: variantProduct.id, variantId: 'black-m', quantity: 2, type: 'added', reason: 'Restock' } });
    assert.equal(adjusted.status, 200); assert.equal(adjusted.body.product.stock, 6); assert.equal(adjusted.body.product.variants[0].stock, 6);
    assert.equal((await api('/api/admin/inventory', { body: { productId: product.id, quantity: -1, type: 'added', reason: 'Invalid sign' } })).status, 400);
    assert.equal((await api('/api/admin/products', { body: { category: 'Men', subcategory: 'Tops', productType: 'T-Shirts', images: ['/test-product.png'], name: 'Conflicting SKU', sku: 'HOODIE-BM', price: 1 } })).status, 409);
  });

  await t.test('public product details and pages use live data and hide missing or archived products', async () => {
    const detail = await api(`/api/catalog/${product.id}`, { cookie: '' });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.product.name, 'Cotton Everyday Tee');
    assert.equal(detail.body.product.skuKeys, undefined);
    assert.equal(detail.body.product._id, undefined);
    assert.deepEqual(detail.body.related.map(item => item.id), [variantProduct.id]);
    const page = await fetch(`${base}/products/${product.id}`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /Cotton Everyday Tee/);
    assert.match(html, /Add to Cart/);
    assert.match(html, /Rs\. 2,000/);
    assert.ok(html.includes(`/products/${variantProduct.id}`), 'related cards link to actual products');
    assert.doesNotMatch(html, /Nike Air Force|1,240 reviews/);
    assert.equal((await api('/api/catalog/missing-product')).status, 404);
    const archived = await db.collection('admin_products').findOne({ deletedAt: { $exists: true } });
    assert.equal((await api(`/api/catalog/${archived.id}`)).status, 404);
  });

  await t.test('rolls back failed orders and prevents concurrent overselling', async () => {
    const before = await stockOf(product.id);
    assert.equal((await createOrder([{ productId: product.id, quantity: 1 }, { productId: 'missing', quantity: 1 }])).status, 404);
    assert.equal(await stockOf(product.id), before);
    assert.equal((await createOrder([{ productId: product.id, quantity: 1 }], { discount: 99999 })).status, 400);
    assert.equal((await createOrder([{ productId: product.id, quantity: 1 }], { shipping: 1_000_000_000 })).status, 400, 'aggregate order total is bounded');
    assert.equal(await stockOf(product.id), before);
    const results = await Promise.all([1, 2].map(() => createOrder([{ productId: product.id, quantity: 6 }])));
    assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
    assert.equal(await stockOf(product.id), 4);
    const order = results.find(result => result.status === 201).body.order;
    assert.equal(order.total, 12000); assert.equal(order.items[0].name, 'Cotton Everyday Tee');
    assert.equal((await patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' })).status, 200);
    assert.equal(await stockOf(product.id), 10);
    assert.equal((await patch(`/api/admin/orders/${order.id}`, { status: 'cancelled' })).status, 200);
    assert.equal(await stockOf(product.id), 10);
    assert.equal((await patch(`/api/admin/orders/${order.id}`, { status: 'confirmed' })).status, 409);
    assert.equal((await patch(`/api/admin/orders/${order.id}`, { status: 'refunded', notes: 'Manual refund' })).status, 409);
  });

  await t.test('order fulfillment, return decisions, received stock, and manual refund are consistent', async () => {
    const result = await createOrder([{ productId: variantProduct.id, variantId: 'black-m', quantity: 2 }], { paymentStatus: 'paid' });
    assert.equal(result.status, 201); paidOrder = result.body.order; assert.equal(await stockOf(variantProduct.id), 4);
    assert.equal((await patch(`/api/admin/products/${variantProduct.id}`, { variants: [] })).status, 409);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { returnStatus: 'approved' })).status, 409);
    for (const status of ['confirmed', 'packed', 'shipped', 'delivered']) assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { status })).status, 200, status);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { returnStatus: 'requested' })).status, 200);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { returnStatus: 'approved' })).status, 200);
    assert.equal(await stockOf(variantProduct.id), 4, 'approval is not physical receipt');
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { status: 'returned' })).status, 200);
    assert.equal(await stockOf(variantProduct.id), 6);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { status: 'refunded' })).status, 400);
    const refunded = await patch(`/api/admin/orders/${paidOrder.id}`, { status: 'refunded', paymentStatus: 'refunded', notes: 'Manual refund: Rs. 8000 transferred via bank, reference TEST-001.' });
    assert.equal(refunded.status, 200); assert.equal(refunded.body.order.paymentStatus, 'refunded');
    assert.equal(await stockOf(variantProduct.id), 6);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { status: 'refunded', paymentStatus: 'refunded', notes: 'Confirmed receipt of refund.' })).status, 200);
    const record = await db.collection('admin_orders').findOne({ _id: paidOrder.id });
    assert.equal(record.manualRefund.amount, 8000); assert.match(record.manualRefund.note, /TEST-001/);
    assert.equal((await patch(`/api/admin/orders/${paidOrder.id}`, { paymentStatus: 'paid' })).status, 409);
  });

  await t.test('coupons validate scopes, dates, percentage and unique codes', async () => {
    const input = { code: 'summer25', type: 'percentage', value: 25, minimumPurchase: 5000, maximumDiscount: 2000, usageLimit: 500, productIds: [product.id], active: true };
    const created = await api('/api/admin/coupons', { body: input }); assert.equal(created.status, 201); coupon = created.body.coupon;
    assert.equal(coupon.code, 'SUMMER25'); assert.equal(coupon.usedCount, 0);
    assert.equal((await api('/api/admin/coupons', { body: input })).status, 409);
    assert.equal((await patch(`/api/admin/coupons/${coupon.id}`, { value: 101 })).status, 400);
    assert.equal((await patch(`/api/admin/coupons/${coupon.id}`, { usedCount: 10 })).status, 400);
    const updated = await patch(`/api/admin/coupons/${coupon.id}`, { active: false });
    assert.equal(updated.status, 200); assert.equal(updated.body.coupon.minimumPurchase, 5000); assert.equal(updated.body.coupon.usageLimit, 500);
    assert.equal((await patch(`/api/admin/coupons/${coupon.id}`, { startsAt: '2026-09-30', endsAt: '2026-09-01' })).status, 400);
  });

  await t.test('scheduled promotions control public catalog pricing and views deduplicate', async () => {
    const input = { name: 'Autumn Sale', startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(), productIds: [product.id], discountPercent: 20, active: true };
    const created = await api('/api/admin/promotions', { body: input }); assert.equal(created.status, 201); promotion = created.body.promotion; assert.equal(promotion.state, 'active');
    const catalog = await api('/api/catalog'); assert.equal(catalog.body.managed, true);
    const live = catalog.body.products.find(item => item.id === product.id); assert.equal(live.salePrice, 1600);
    assert.equal((await api(`/api/catalog/${product.id}`)).body.product.salePrice, 1600, 'detail price matches the catalog promotion'); assert.equal(live.skuKeys, undefined);
    const visitorId = randomUUID();
    assert.equal((await api(`/api/catalog/${product.id}/view`, { body: { visitorId }, cookie: undefined })).body.recorded, true);
    assert.equal((await api(`/api/catalog/${product.id}/view`, { body: { visitorId }, cookie: undefined })).body.recorded, false);
    assert.equal((await api('/api/admin/products')).body.products.find(item => item.id === product.id).views, 1);
    const updated = await patch(`/api/admin/promotions/${promotion.id}`, { active: false }); assert.equal(updated.status, 200); assert.equal(updated.body.promotion.state, 'inactive');
    assert.equal(updated.body.promotion.discountPercent, 20);
    assert.equal((await api('/api/catalog')).body.products.find(item => item.id === product.id).salePrice, null);
    const scheduled = await patch(`/api/admin/promotions/${promotion.id}`, { active: true, startsAt: new Date(Date.now() + 3_600_000).toISOString() });
    assert.equal(scheduled.body.promotion.state, 'scheduled');
    assert.equal((await api('/api/catalog')).body.promotions.length, 0);
  });

  await t.test('coupon redemption enforces eligibility, caps, first orders and concurrent usage limits', async () => {
    assert.equal((await patch(`/api/admin/coupons/${coupon.id}`, { active: true, firstOrderOnly: true, customerEmails: ['promo@example.com'], usageLimit: 1, maximumDiscount: 1000 })).status, 200);
    const originalStock = await stockOf(product.id);
    assert.equal((await createOrder([{ productId: product.id, quantity: 3 }], { email: 'wrong@example.com', couponCode: coupon.code })).status, 400);
    assert.equal((await createOrder([{ productId: product.id, quantity: 1 }], { email: 'promo@example.com', couponCode: coupon.code })).status, 400);
    assert.equal((await createOrder([{ productId: product.id, quantity: 3 }], { email: 'promo@example.com', couponCode: coupon.code, discount: 10 })).status, 400);
    assert.equal(await stockOf(product.id), originalStock);
    const redeemed = await createOrder([{ productId: product.id, quantity: 3 }], { email: 'promo@example.com', couponCode: coupon.code });
    assert.equal(redeemed.status, 201, JSON.stringify(redeemed.body)); assert.equal(redeemed.body.order.discount, 1000); assert.equal(redeemed.body.order.total, 5000);
    assert.equal((await api('/api/admin/coupons')).body.coupons.find(item => item.id === coupon.id).usedCount, 1);
    assert.equal((await createOrder([{ productId: product.id, quantity: 3 }], { email: 'promo@example.com', couponCode: coupon.code })).status, 409);
    assert.equal((await patch(`/api/admin/coupons/${coupon.id}`, { usageLimit: 0 })).status, 200);
    assert.equal((await createOrder([{ productId: product.id, quantity: 3 }], { email: 'promo@example.com', couponCode: coupon.code })).status, 400, 'first-order coupons reject repeat customers');
    assert.equal((await patch(`/api/admin/orders/${redeemed.body.order.id}`, { status: 'cancelled' })).status, 200);
    assert.equal(await stockOf(product.id), originalStock);

    const flash = await api('/api/admin/coupons', { body: { code: 'FLASH', type: 'fixed', value: 500, usageLimit: 1, categories: ['men'] } });
    assert.equal(flash.status, 201);
    const requests = await Promise.all(['one@example.com', 'two@example.com'].map(email => createOrder([{ productId: product.id, quantity: 1 }], { email, couponCode: 'FLASH' })));
    assert.deepEqual(requests.map(result => result.status).sort(), [201, 409]);
    const winningOrder = requests.find(result => result.status === 201).body.order;
    assert.equal(winningOrder.discount, 500);
    assert.equal((await patch(`/api/admin/orders/${winningOrder.id}`, { status: 'cancelled' })).status, 200);
    assert.equal((await api('/api/admin/coupons')).body.coupons.find(item => item.id === flash.body.coupon.id).usedCount, 1);
    const shipping = await api('/api/admin/coupons', { body: { code: 'SHIP', type: 'free_shipping', value: 0, productIds: [product.id] } });
    assert.equal(shipping.status, 201);
    const shipped = await createOrder([{ productId: product.id, quantity: 1 }], { couponCode: 'SHIP', shipping: 250 });
    assert.equal(shipped.status, 201); assert.equal(shipped.body.order.discount, 250); assert.equal(shipped.body.order.total, 2000);
    assert.equal((await patch(`/api/admin/orders/${shipped.body.order.id}`, { status: 'cancelled' })).status, 200);
  });

  await t.test('dashboard is real persisted data and deletes affect catalog without losing history', async () => {
    const result = await api('/api/admin/dashboard'); assert.equal(result.status, 200);
    assert.equal(result.body.products.length, 2); assert.equal(result.body.orders.length, 5); assert.equal(result.body.customers.length, 3);
    const customer = result.body.customers.find(item => item.email === 'customer@example.com');
    assert.equal(customer.orders, 3); assert.equal(customer.spent, 0);
    assert.equal((await api(`/api/admin/coupons/${coupon.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await api(`/api/admin/promotions/${promotion.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await api(`/api/admin/products/${product.id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await api('/api/catalog')).body.products.some(item => item.id === product.id), false);
    assert.equal((await api('/api/admin/orders')).body.orders.length, 5);
    assert.ok((await api('/api/admin/inventory')).body.movements.length >= 7);
  });
  await t.test('multipart product creation persists all data and media, validates uploads, and cleans failed saves', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
    const video = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109, 0, 0, 0, 0]);
    const input = { name: 'Uploaded shirt', sku: 'UPLOAD-01', price: 1200, salePrice: 1000, stock: 3,
      category: 'Women', subcategory: 'Tops', productType: 'Shirts & Blouses', brand: 'UrbanForge', gender: 'women',
      description: 'Long description', shortDescription: 'Short description', material: 'Cotton',
      colors: ['Blue'], sizes: ['M'], tags: ['summer'], featured: true, newArrival: true, bestseller: true,
      seoTitle: 'SEO shirt', seoDescription: 'SEO description', status: 'active', images: [], videos: [], variants: [] };
    async function multipart(data, { image = png, type = 'image/png', includeVideo = false, cookie = adminCookie, origin, path = '/api/admin/products', method = 'POST' } = {}) {
      const form = new FormData();
      form.set('data', JSON.stringify(data));
      if (image) form.append('images', new Blob([image], { type }), 'image.png');
      if (includeVideo) form.append('videos', new Blob([video], { type: 'video/mp4' }), 'clip.mp4');
      const response = await fetch(base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(origin ? { Origin: origin } : {}) }, body: form });
      return { status: response.status, body: await response.json() };
    }
    assert.equal((await multipart(input, { cookie: '' })).status, 401);
    assert.equal((await multipart(input, { origin: 'https://attacker.example' })).status, 403);
    assert.equal((await multipart(input, { image: null, includeVideo: true })).status, 400);
    assert.equal((await multipart(input, { image: Buffer.from('fake image') })).status, 400);
    assert.equal((await multipart(input, { type: 'image/svg+xml' })).status, 400);
    assert.equal((await multipart(input, { image: Buffer.alloc(10 * 1024 * 1024 + 1) })).status, 413);
    assert.equal(await db.collection('product_media.files').countDocuments(), 0);
    const created = await multipart(input);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const saved = created.body.product;
    for (const [key, value] of Object.entries(input)) if (!['images', 'videos'].includes(key)) assert.deepEqual(saved[key], value, key);
    assert.equal(saved.images.length, 1); assert.deepEqual(saved.videos, []);
    const media = await fetch(base + saved.images[0]);
    assert.equal(media.status, 200); assert.equal(media.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await media.arrayBuffer()), png);
    const persisted = await db.collection('admin_products').findOne({ _id: saved.id });
    assert.deepEqual(persisted.images, saved.images);
    const filesBefore = await db.collection('product_media.files').countDocuments();
    assert.equal((await multipart(input)).status, 409);
    assert.equal((await multipart({ ...input, sku: 'BAD-CATEGORY', category: 'invalid' })).status, 400);
    assert.equal(await db.collection('product_media.files').countDocuments(), filesBefore);
    assert.equal(await db.collection('product_media.chunks').countDocuments(), filesBefore);
    const updated = await multipart({ videos: [] }, { image: null, includeVideo: true, path: `/api/admin/products/${saved.id}`, method: 'PATCH' });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.product.name, input.name); assert.equal(updated.body.product.stock, 3);
    assert.deepEqual(updated.body.product.images, saved.images);
    const videoUrl = updated.body.product.videos[0];
    const range = await fetch(base + videoUrl, { headers: { Range: 'bytes=4-7' } });
    assert.equal(range.status, 206); assert.equal(range.headers.get('content-range'), `bytes 4-7/${video.length}`);
    assert.equal(await range.text(), 'ftyp');
    assert.equal((await fetch(base + videoUrl, { headers: { Range: 'bytes=100-' } })).status, 416);
    assert.equal((await fetch(base + '/api/media/not-an-id')).status, 404);
    const edited = await patch(`/api/admin/products/${saved.id}`, { variants: [{ id: 'blue-m', sku: 'UPLOAD-01-M', color: 'Blue', size: 'M', stock: 7 }] });
    assert.equal(edited.status, 200); assert.equal(edited.body.product.stock, 7);
  });

  await t.test('live inventory summaries, guarded adjustments, and paginated history stay consistent', async () => {
    const baseline = (await api('/api/admin/inventory?includeHistory=false')).body.summary;
    const created = await api('/api/admin/products', { body: { name: 'Inventory Fixture', sku: 'INV', price: 1000, status: 'active', category: 'Men', subcategory: 'Tops', productType: 'T-Shirts', images: ['/fixture.png'], variants: [
      { id: 'blue-s', sku: 'INV-BS', color: 'Blue', size: 'S', stock: 2 },
      { id: 'blue-m', sku: 'INV-BM', color: 'Blue', size: 'M', stock: 0 },
      { id: 'blue-l', sku: 'INV-BL', color: 'Blue', size: 'L', stock: 8 },
    ] } });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.product.id;
    const inventory = (await api('/api/admin/inventory?includeHistory=false')).body;
    assert.deepEqual(inventory.summary, { units: baseline.units + 10, trackedSkus: baseline.trackedSkus + 3, lowStockSkus: baseline.lowStockSkus + 1, outOfStockSkus: baseline.outOfStockSkus + 1 });
    const adjustment = { productId: id, variantId: 'blue-s', quantity: 1, type: 'added', reason: 'Inventory test receipt', expectedStock: 2 };
    const change = data => api('/api/admin/inventory', { body: { ...adjustment, ...data } });
    assert.equal((await api('/api/admin/inventory', { body: adjustment, headers: { Origin: 'https://attacker.example' } })).status, 403);
    for (const invalid of [{ quantity: 0 }, { quantity: 1.5 }, { quantity: 1_000_001 }, { reason: ' ' }, { type: 'sold', quantity: 1 }, { type: 'returned', quantity: -1 }, { expectedStock: -1 }]) assert.equal((await change(invalid)).status, 400, JSON.stringify(invalid));
    assert.equal((await change({ variantId: 'missing' })).status, 400);
    assert.equal((await change({ productId: 'missing' })).status, 404);
    assert.equal((await change({ type: 'sold', quantity: -3 })).status, 409);
    const beforeCount = await db.collection('admin_stock_movements').countDocuments({ productId: id });
    const concurrent = await Promise.all([change({}), change({})]);
    assert.deepEqual(concurrent.map(result => result.status).sort(), [200, 409]);
    assert.equal(await stockOf(id), 11);
    assert.equal(await db.collection('admin_stock_movements').countDocuments({ productId: id }), beforeCount + 1);
    assert.equal((await change({})).status, 409, 'stale displayed stock cannot overwrite another change');
    for (const [type, quantity, expectedStock, next] of [['sold', -1, 3, 2], ['returned', 2, 2, 4], ['adjustment', -1, 4, 3]]) {
      const result = await change({ type, quantity, expectedStock });
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.product.variants[0].stock, next);
      assert.equal(result.body.product.stock, next + 8);
    }
    assert.equal((await api(`/api/catalog/${id}`)).body.product.stock, 11);
    const path = `/api/admin/inventory/movements?productId=${id}`;
    const first = (await api(`${path}&limit=2`)).body;
    const second = (await api(`${path}&limit=2&page=2`)).body;
    assert.equal(first.total, beforeCount + 4); assert.equal(first.pages, Math.ceil(first.total / 2));
    assert.equal(first.movements.length, 2); assert.equal(second.movements.length, 2);
    assert.equal(new Set([...first.movements, ...second.movements].map(item => item.id)).size, 4);
    for (const item of first.movements) { assert.equal(item.sku, 'INV-BS'); assert.equal(item.variantLabel, 'Blue / S'); assert.equal(item._id, undefined); assert.equal(item.adminId, undefined); }
    const sold = (await api(`${path}&type=sold&search=inv-bs`)).body;
    assert.equal(sold.total, 1); assert.equal(sold.movements[0].quantity, -1);
    assert.equal((await api(`${path}&search=${encodeURIComponent('.*')}`)).body.total, 0, 'search is literal, not regular expression input');
    assert.equal((await api(`${path}&page=999`)).body.page, 1);
    for (const query of ['page=0', 'limit=101', 'type=invalid', 'productId=$bad', 'unexpected=1']) assert.equal((await api(`/api/admin/inventory/movements?${query}`)).status, 400, query);
    assert.equal((await api('/api/admin/inventory?includeHistory=invalid')).status, 400);
    const edited = await patch(`/api/admin/products/${id}`, { name: 'Renamed Inventory Fixture', variants: created.body.product.variants.slice(1) });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    const removed = (await api(`${path}&type=adjustment`)).body.movements.find(item => item.variantId === 'blue-s' && item.after === 0);
    assert.equal(removed.sku, 'INV-BS'); assert.equal(removed.variantLabel, 'Blue / S');
    assert.equal((await api(`/api/admin/products/${id}`, { method: 'DELETE' })).status, 200);
    assert.equal((await change({ expectedStock: 3 })).status, 404);
    const archivedHistory = (await api(path)).body;
    assert.ok(archivedHistory.products.some(item => item.id === id));
    assert.ok(archivedHistory.movements.some(item => item.sku === 'INV-BS'));
    assert.deepEqual((await api('/api/admin/inventory?includeHistory=false')).body.summary, baseline);
  });

});
