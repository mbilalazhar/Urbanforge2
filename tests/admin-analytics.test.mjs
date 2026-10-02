import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../lib/admin/analytics.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { dashboardMetrics } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('live analytics use Pakistan midnight, Monday weeks and a rolling year', () => {
  const order = { id: 'today', createdAt: '2026-10-04T19:00:00.000Z', total: 0.1, status: 'new', paymentStatus: 'paid', items: [{ productId: 'archived', name: 'Historical shoe', image: '/shoe.png', quantity: 1, price: 0.1 }] };
  const data = { products: [], customers: [{ createdAt: '2026-09-30T19:00:00.000Z' }], orders: [
    order, { ...order, id: 'second', total: 0.2 },
    { ...order, id: 'sunday', createdAt: '2026-10-04T18:59:59.000Z', total: 2 },
    { ...order, id: 'september', createdAt: '2026-09-30T18:59:59.000Z', total: 5 },
    ...['cancelled', 'returned', 'refunded'].map(status => ({ ...order, id: status, status, total: 1000 })),
    { ...order, id: 'unpaid', paymentStatus: 'pending', total: 1000 },
  ] };
  const metrics = dashboardMetrics(data, new Date('2026-10-04T20:00:00.000Z'), [{ id: 'archived', category: 'Shoes' }]);
  assert.equal(metrics.today, 0.3); assert.equal(metrics.week, 0.3);
  assert.equal(metrics.month, 2.3); assert.equal(metrics.revenue, 7.3); assert.equal(metrics.average, 1.83);
  assert.equal(metrics.newCustomers, 1);
  assert.equal(metrics.months.length, 12); assert.equal(metrics.months[0].key, '2025-11'); assert.equal(metrics.months.at(-1).key, '2026-10');
  assert.equal(metrics.months.at(-1).revenue, 2.3); assert.equal(metrics.months.at(-1).sales, 3);
  assert.equal(metrics.months.at(-1).customers, 1);
  assert.deepEqual(metrics.categories, [['Shoes', 4]]);
  assert.equal(metrics.bestsellers[0].units, 4);
});

test('empty live stores report zero totals and empty sales lists', () => {
  const metrics = dashboardMetrics({ products: [], customers: [], orders: [] }, new Date('2026-01-01T00:00:00Z'));
  for (const key of ['revenue', 'today', 'week', 'month', 'average', 'pending', 'completed', 'cancelled', 'returned', 'newCustomers']) assert.equal(metrics[key], 0, key);
  assert.equal(metrics.growth, null); assert.deepEqual(metrics.bestsellers, []); assert.deepEqual(metrics.categories, []);
  assert.equal(metrics.months[0].key, '2025-02');
  assert.ok(metrics.months.every(month => month.revenue === 0 && month.orders === 0 && month.customers === 0));
});
