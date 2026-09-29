import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function importTypescript(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { previewRequest, resetPreview } = await importTypescript('../lib/admin/preview.ts');
const { dashboardMetrics, countsAsRevenue } = await importTypescript('../lib/admin/analytics.ts');
const mutate = (path, body, method = 'POST') => previewRequest(path, { method, body: JSON.stringify(body) });

test('static admin preview remains local and consistent', async t => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Static management UI must not call the network'); };
  t.after(() => { globalThis.fetch = originalFetch; resetPreview(); });

  await t.test('sample charts and lists derive from the same dataset', async () => {
    resetPreview();
    const data = await previewRequest('dashboard');
    const metrics = dashboardMetrics(data);
    assert.equal(data.products.length, 12);
    assert.equal(data.orders.length, 48);
    assert.equal(data.customers.reduce((sum, customer) => sum + customer.orders, 0), data.orders.length);
    assert.equal(metrics.months.length, 12);
    assert.equal(metrics.revenue, data.orders.filter(countsAsRevenue).reduce((sum, order) => sum + order.total, 0));
    assert.equal(metrics.out, data.products.filter(product => product.stock === 0).length);
    assert.ok(metrics.revenue > 0);
    data.products[0].name = 'Should not mutate the source';
    assert.notEqual((await previewRequest('products')).products[0].name, data.products[0].name);
  });

  await t.test('inventory previews validate stock and reset without persistent changes', async () => {
    const { products } = await previewRequest('products');
    const product = products[0], variant = product.variants[0], stock = product.stock;
    await mutate('inventory', { productId: product.id, variantId: variant.id, quantity: 3, type: 'added', reason: 'Preview restock' });
    const inventory = await previewRequest('inventory');
    assert.equal(inventory.products.find(item => item.id === product.id).stock, stock + 3);
    assert.equal(inventory.movements[0].quantity, 3);
    await assert.rejects(mutate('inventory', { productId: product.id, variantId: variant.id, quantity: -100000, type: 'sold', reason: 'Too many' }), /stock/i);
    assert.equal((await previewRequest('inventory')).products.find(item => item.id === product.id).stock, stock + 3);
    resetPreview();
    assert.equal((await previewRequest('products')).products[0].stock, stock);
  });

  await t.test('order previews update totals and cancellation restores stock once', async () => {
    const { products } = await previewRequest('products');
    const product = products[0], variant = product.variants[0];
    const { order } = await mutate('orders', { customerName: 'Sample Customer', email: 'sample@example.com', phone: '', address: 'Sample address', notes: '', items: [{ productId: product.id, variantId: variant.id, quantity: 2 }], shipping: 250, discount: 500, paymentStatus: 'paid' });
    assert.equal(order.total, product.price * 2 + 250 - 500);
    assert.equal((await previewRequest('products')).products[0].stock, product.stock - 2);
    await mutate(`orders/${order.id}`, { status: 'cancelled' }, 'PATCH');
    await mutate(`orders/${order.id}`, { status: 'cancelled' }, 'PATCH');
    assert.equal((await previewRequest('products')).products[0].stock, product.stock);
  });

  await t.test('product duplication and offer changes remain preview-only', async () => {
    const { products } = await previewRequest('products');
    const { product } = await mutate(`products/${products[0].id}/duplicate`);
    assert.equal(product.status, 'inactive');
    assert.equal(product.stock, 0);
    assert.notEqual(product.sku, products[0].sku);
    await mutate(`products/${product.id}`, { name: 'Sample edit' }, 'PATCH');
    assert.equal((await previewRequest('products')).products[0].name, 'Sample edit');
    const { coupons } = await previewRequest('coupons');
    await mutate(`coupons/${coupons[0].id}`, { active: false }, 'PATCH');
    assert.equal((await previewRequest('coupons')).coupons[0].active, false);
    resetPreview();
    assert.equal((await previewRequest('coupons')).coupons[0].active, true);
    assert.equal((await previewRequest('products')).products.length, 12);
  });

  await t.test('revenue periods use Pakistan dates and exclude cancelled and unpaid orders', () => {
    const base = { id: 'example', createdAt: '2026-09-26T20:00:00.000Z', total: 1000, status: 'delivered', paymentStatus: 'paid', items: [] };
    const data = { products: [], customers: [], orders: [base, { ...base, id: 'unpaid', paymentStatus: 'pending' }, { ...base, id: 'cancelled', status: 'cancelled' }, { ...base, id: 'prior-day', createdAt: '2026-09-26T18:00:00.000Z', total: 500 }] };
    const metrics = dashboardMetrics(data, new Date('2026-09-27T01:00:00.000Z'));
    assert.equal(metrics.today, 1000);
    assert.equal(metrics.month, 1500);
    assert.equal(metrics.revenue, 1500);
    assert.equal(metrics.average, 750);
  });
});
