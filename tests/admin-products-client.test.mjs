import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = (await readFile(new URL('../lib/admin/client.ts', import.meta.url), 'utf8'))
  .replace(/import .* from "@tanstack\/react-query";/, 'const useQuery = options => options; const useMutation = options => options; const useQueryClient = () => ({ invalidateQueries: async options => { globalThis.__adminInvalidations.push(options.queryKey); } });')
  .replace(/import .* from "\.\/preview";/, 'const previewRequest = async path => ({ preview: path });');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { useAdminQuery, useAdminMutation } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('live product queries and mutations use authenticated API requests and preserve multipart bodies', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return Response.json({ products: [], product: { id: 'saved' } });
  };
  const live = useAdminQuery('products', 'api');
  const preview = useAdminQuery('products');
  assert.notDeepEqual(live.queryKey, preview.queryKey);
  assert.deepEqual(await preview.queryFn(), { preview: 'products' });
  assert.equal(requests.length, 0);
  await live.queryFn();
  assert.equal(requests[0].url, '/api/admin/products');
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.equal(requests[0].options.cache, 'no-store');

  const body = new FormData();
  body.set('data', JSON.stringify({ name: 'Uploaded tee' }));
  body.append('images', new Blob(['image bytes'], { type: 'image/png' }), 'tee.png');
  const save = useAdminMutation('products', 'api');
  await save.mutationFn({ body });
  assert.equal(requests[1].url, '/api/admin/products');
  assert.equal(requests[1].options.method, 'POST');
  assert.equal(requests[1].options.body, body);
  assert.equal(requests[1].options.headers.has('Content-Type'), false, 'browser must supply the multipart boundary');
  await save.mutationFn({ path: 'products/saved', method: 'PATCH', body: { name: 'Edited tee' } });
  assert.equal(requests[2].url, '/api/admin/products/saved');
  assert.equal(requests[2].options.headers.get('Content-Type'), 'application/json');
  assert.equal(requests[2].options.body, JSON.stringify({ name: 'Edited tee' }));

  globalThis.fetch = async () => Response.json({ message: 'Add at least one product image.' }, { status: 400 });
  await assert.rejects(save.mutationFn({ body }), /Add at least one product image/);
  globalThis.fetch = async () => Response.json({ message: 'Admin login is required.' }, { status: 401 });
  await assert.rejects(live.queryFn(), /Admin login is required/);
});


test('live inventory uses filtered API requests, polls, and refreshes admin and catalog caches', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; delete globalThis.__adminInvalidations; });
  globalThis.__adminInvalidations = [];
  const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return Response.json({ products: [] }); };
  const stock = useAdminQuery('inventory?includeHistory=false', 'api', { refetchInterval: 30000 });
  assert.equal(stock.refetchInterval, 30000);
  await stock.queryFn();
  await useAdminQuery('inventory/movements?page=2&limit=15&type=sold', 'api').queryFn();
  assert.equal(requests[0].url, '/api/admin/inventory?includeHistory=false');
  assert.equal(requests[1].url, '/api/admin/inventory/movements?page=2&limit=15&type=sold');
  const adjustment = { productId: 'fixture', quantity: -2, type: 'sold', reason: 'In-store sale', expectedStock: 5 };
  const mutation = useAdminMutation('inventory', 'api');
  await mutation.mutationFn({ body: adjustment });
  assert.equal(requests[2].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[2].options.body), adjustment);
  await mutation.onSuccess();
  assert.deepEqual(globalThis.__adminInvalidations, [['admin'], ['catalog']]);
  globalThis.__adminInvalidations = [];
  await useAdminMutation('inventory').onSuccess();
  assert.deepEqual(globalThis.__adminInvalidations, [['admin']]);
  globalThis.fetch = async () => Response.json({ message: 'Stock changed since you loaded this product.' }, { status: 409 });
  await assert.rejects(mutation.mutationFn({ body: adjustment }), /Stock changed/);
});
