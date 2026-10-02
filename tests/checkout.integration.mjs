import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

test('customer checkout, persistence, account ownership and inventory', { timeout: 120_000 }, async t => {
  const mongo = await MongoMemoryReplSet.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' }, replSet: { count: 1 } });
  const client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('checkout_test');
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening'); const port = probe.address().port; await new Promise(r => probe.close(r));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], { env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'checkout_test', ADMIN_PROVISIONING_KEY: 'checkout-admin-provision-key-for-tests' }, stdio: 'ignore' });
  t.after(async () => { if (server.exitCode === null) { const done = once(server, 'exit'); server.kill('SIGTERM'); await done; } await client.close(); await mongo.stop(); });
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/auth/session')).ok) break; } catch {} await delay(100); }
  async function api(path, body, cookie = '', method, headers = {}) {
    const response = await fetch(base + path, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type': 'application/json', Cookie: cookie, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const product = { _id: 'tee', id: 'tee', name: 'Checkout Tee', description: '', shortDescription: '', category: 'Men', subcategory: 'Tops', productType: 'T-Shirts', brand: '', gender: '', price: 2000, salePrice: 1800, sku: 'TEE', skuKeys: ['TEE'], images: ['/tee.png'], videos: [], colors: ['Black', 'White'], sizes: ['M'], material: '', stock: 50, tags: [], status: 'active', featured: false, newArrival: false, bestseller: false, seoTitle: '', seoDescription: '', variants: [], views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await db.collection('admin_products').insertMany([product, { ...product, _id: 'hoodie', id: 'hoodie', name: 'Checkout Hoodie', sku: 'HOOD', skuKeys: ['HOOD','HOOD-M'], price: 3000, salePrice: null, stock: 10, variants: [{ id: 'black-m', sku: 'HOOD-M', color: 'Black', size: 'M', stock: 10 }] }]);
  const tee = { productId: 'tee', color: 'Black', size: 'M', quantity: 2 }, hoodie = { productId: 'hoodie', variantId: 'black-m', color: 'Black', size: 'M', quantity: 1 };
  const contact = { name: 'Checkout Customer', email: 'checkout@example.com', phone: '+92 300 1234567' };
  const address = { line1: '123 Test Street', apartment: 'Apartment 5', city: 'Lahore', province: 'Punjab', postalCode: '54000', country: 'Pakistan', type: 'home' };
  async function payload(items = [tee], extra = {}) {
    const input = { items, deliveryMethod: 'standard', email: contact.email, couponCode: '', ...extra };
    const response = await api('/api/checkout/quote', input);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const { email, ...selection } = input; void email;
    return { ...selection, contact, address, saveAddress: false, accountId: null, paymentMethod: 'cod', requestId: randomUUID(), quoteToken: response.body.quote.quoteToken };
  }
  let guestOrder, ownOrder, user, adminCookie;
  await t.test('quotes server prices, selected variants, shipping and aggregate stock', async () => {
    const q = await api('/api/checkout/quote', { items: [tee, hoodie], deliveryMethod: 'standard' });
    assert.equal(q.status, 200); assert.equal(q.body.quote.subtotal, 6600); assert.equal(q.body.quote.shipping, 0); assert.equal(q.body.quote.items[1].size, 'M');
    assert.equal((await api('/api/checkout/quote', { items: [{ ...tee, price: 1 }], deliveryMethod: 'standard' })).status, 400);
    assert.equal((await api('/api/checkout/quote', { items: [{ ...tee, quantity: 30 }, { ...tee, color: 'White', quantity: 30 }], deliveryMethod: 'standard' })).status, 409);
    assert.equal((await api('/api/checkout/quote', { items: [{ ...hoodie, variantId: undefined }], deliveryMethod: 'standard' })).status, 400);
    assert.equal((await api('/api/checkout/quote', { items: [{ ...tee, size: 'XL' }], deliveryMethod: 'standard' })).status, 400);
  });
  await t.test('concurrent guest retries create one multi-item order and one stock deduction', async () => {
    const body = await payload([tee, hoodie]);
    const results = await Promise.all([api('/api/orders', body), api('/api/orders', body)]);
    for (const r of results) assert.ok([200, 201].includes(r.status), JSON.stringify(r));
    guestOrder = results[0].body.order;
    assert.equal(results[1].body.order.id, guestOrder.id); assert.equal(guestOrder.items.length, 2); assert.equal(guestOrder.total, 6600); assert.equal(guestOrder.paymentStatus, 'pending'); assert.equal(guestOrder.shippingAddress.apartment, address.apartment);
    assert.equal(guestOrder.checkoutKey, undefined); assert.equal(guestOrder.checkoutFingerprint, undefined);
    assert.equal(await db.collection('admin_orders').countDocuments(), 1);
    assert.equal((await db.collection('admin_products').findOne({ _id: 'tee' })).stock, 48);
    assert.equal((await db.collection('admin_products').findOne({ _id: 'hoodie' })).variants[0].stock, 9);
    assert.equal(await db.collection('admin_stock_movements').countDocuments({ type: 'sold' }), 2);
    assert.equal((await api('/api/orders', { ...body, contact: { ...contact, name: 'Changed' } })).status, 409);
    assert.equal((await api('/api/orders')).status, 401);
  });
  await t.test('tampering, invalid contact and stale prices cannot create or consume stock', async () => {
    const body = await payload();
    for (const invalid of [{ ...body, shipping: 0 }, { ...body, paymentStatus: 'paid' }, { ...body, accountId: new ObjectId().toHexString() }, { ...body, contact: { ...contact, phone: '' } }]) assert.ok([400,409].includes((await api('/api/orders', invalid)).status));
    assert.equal((await api('/api/orders', body, '', undefined, { Origin: 'https://attacker.test' })).status, 403);
    await db.collection('admin_products').updateOne({ _id: 'tee' }, { $set: { salePrice: 1700 } });
    assert.equal((await api('/api/orders', body)).status, 409);
    assert.equal(await db.collection('admin_orders').countDocuments(), 1);
    assert.equal((await db.collection('admin_products').findOne({ _id: 'tee' })).stock, 48);
    await db.collection('admin_products').updateOne({ _id: 'tee' }, { $set: { salePrice: 1800 } });
  });
  await t.test('signed-in orders save profile details and remain private to their account', async () => {
    user = await api('/api/auth/signup', { name: 'Test User', email: contact.email, password: 'Checkout-password-123' }); assert.equal(user.status, 201);
    const userId = user.body.account.id;
    const body = { ...await payload([hoodie], { deliveryMethod: 'express' }), accountId: userId, saveAddress: true };
    const response = await api('/api/orders', body, user.cookie); assert.equal(response.status, 201, JSON.stringify(response.body)); ownOrder = response.body.order;
    assert.equal(ownOrder.items.length, 1); assert.equal(ownOrder.shipping, 500); assert.equal(ownOrder.total, 3500);
    const profile = (await api('/api/account/profile', undefined, user.cookie)).body.profile;
    assert.equal(profile.contact, contact.phone); assert.equal(profile.defaultAddress.line2, address.apartment); assert.deepEqual(profile.currentOrderIds, [ownOrder.id]); assert.deepEqual(profile.pastOrderIds, []);
    const orders = await api('/api/orders', undefined, user.cookie); assert.equal(orders.body.accountId, userId); assert.deepEqual(orders.body.orders.map(o => o.id), [ownOrder.id], 'matching guest email does not confer ownership');
    const other = await api('/api/auth/signup', { name: 'Other User', email: 'other@example.com', password: 'Checkout-password-123' });
    assert.deepEqual((await api('/api/orders', undefined, other.cookie)).body.orders, []);
    assert.equal((await api('/api/orders', body, other.cookie)).status, 409);
  });
  await t.test('coupons quote without redemption and reserve exactly once on submission', async () => {
    await db.collection('admin_coupons').insertOne({ _id: 'save10', id: 'save10', code: 'SAVE10', type: 'percentage', value: 10, minimumPurchase: 0, maximumDiscount: null, startsAt: '', endsAt: '', usageLimit: 1, usedCount: 0, productIds: [], categories: [], customerEmails: [], firstOrderOnly: false, active: true, createdAt: new Date().toISOString() });
    const body = await payload([tee], { couponCode: 'SAVE10' });
    assert.equal((await db.collection('admin_coupons').findOne({ _id: 'save10' })).usedCount, 0);
    const response = await api('/api/orders', body); assert.equal(response.status, 201); assert.equal(response.body.order.discount, 360);
    assert.equal((await api('/api/orders', body)).body.order.id, response.body.order.id);
    assert.equal((await db.collection('admin_coupons').findOne({ _id: 'save10' })).usedCount, 1);
  });
  await t.test('out-of-stock order rolls back all items and account references', async () => {
    const body = { ...await payload([tee, hoodie]), accountId: user.body.account.id };
    const stock = (await db.collection('admin_products').findOne({ _id: 'tee' })).stock;
    await db.collection('admin_products').updateOne({ _id: 'hoodie' }, { $set: { stock: 0, 'variants.0.stock': 0 } });
    assert.equal((await api('/api/orders', body, user.cookie)).status, 409);
    assert.equal((await db.collection('admin_products').findOne({ _id: 'tee' })).stock, stock);
    assert.deepEqual((await api('/api/account/profile', undefined, user.cookie)).body.profile.currentOrderIds, [ownOrder.id]);
  });
  await t.test('orders appear in the admin table and cancellation moves user references', async () => {
    const credentials = { name: 'Checkout Admin', email: 'admin-checkout@example.com', password: 'Checkout-password-123' };
    assert.equal((await api('/api/admin/signup', credentials, '', undefined, { 'x-admin-provisioning-key': 'checkout-admin-provision-key-for-tests' })).status, 201);
    adminCookie = (await api('/api/admin/login', { email: credentials.email, password: credentials.password })).cookie;
    const orders = await api('/api/admin/orders', undefined, adminCookie); assert.ok(orders.body.orders.some(o => o.id === ownOrder.id));
    assert.equal((await api(`/api/admin/orders/${ownOrder.id}`, { status: 'cancelled' }, adminCookie, 'PATCH')).status, 200);
    const profile = (await api('/api/account/profile', undefined, user.cookie)).body.profile;
    assert.deepEqual(profile.currentOrderIds, []); assert.deepEqual(profile.pastOrderIds, [ownOrder.id]);
  });
});
