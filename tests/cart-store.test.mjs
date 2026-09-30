import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const compile = source => `data:text/javascript;base64,${Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64')}`;
const cartData = compile(await readFile(new URL('../lib/cart-data.ts', import.meta.url), 'utf8'));
let source = await readFile(new URL('../lib/cart-store.ts', import.meta.url), 'utf8');
for (const name of ['zustand/vanilla', 'zustand/middleware', 'zod']) source = source.replaceAll(`"${name}"`, JSON.stringify(pathToFileURL(require.resolve(name)).href));
source = source.replace('"./cart-data"', JSON.stringify(cartData));
const { createCartStore, cartStorageKey, guestCartStorageKey, mergeGuestCart } = await import(compile(source));
const item = { id: 'shirt-blue-m', productId: 'shirt', variantId: 'blue-m', name: 'Blue shirt', details: 'Men / Tops / Blue', size: 'Size: M', price: 250000, image: '/shirt.png', quantity: 2, maxQuantity: 8 };
function fixture() {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  return { records, storage };
}
async function ready(store) { await store.persist.rehydrate(); store.setState({ hydrated: true }); return store; }

test('two accounts on the same browser persist separate carts and restore on login', async () => {
  const { records, storage } = fixture();
  const a = await ready(createCartStore('account-a', storage));
  a.getState().addItem(item);
  const b = await ready(createCartStore('account-b', storage));
  assert.deepEqual(b.getState().items, []);
  b.getState().addItem({ ...item, quantity: 5 });
  assert.equal(a.getState().items[0].quantity, 2);
  assert.equal(b.getState().items[0].quantity, 5);
  const reloadA = createCartStore('account-a', storage);
  assert.deepEqual(reloadA.getState().items, [], 'SSR/first client render starts empty until explicit hydration');
  assert.equal(reloadA.getState().addItem(item), false, 'cannot overwrite saved data before hydration');
  await ready(reloadA);
  assert.deepEqual(reloadA.getState().items, [item]);
  const saved = JSON.parse(records.get(cartStorageKey('account-a')));
  assert.deepEqual(Object.keys(saved.state), ['items']);
  assert.deepEqual(saved.state.items, [item]);
  assert.equal(saved.version, 1);
});

test('guest carts persist across reloads and edits never touch an account cart', async () => {
  const { storage, records } = fixture();
  const a = await ready(createCartStore('a', storage)); a.getState().addItem(item);
  const originalAccount = records.get(cartStorageKey('a'));
  const guest = await ready(createCartStore(null, storage));
  assert.deepEqual(guest.getState().items, []);
  assert.equal(guest.getState().addItem(item), true);
  guest.getState().changeQuantity(item.id, 1);
  assert.equal((await ready(createCartStore(null, storage))).getState().items[0].quantity, 3);
  guest.getState().removeItem(item.id);
  assert.deepEqual((await ready(createCartStore(null, storage))).getState().items, []);
  guest.getState().addItem(item); guest.getState().clearCart();
  assert.deepEqual((await ready(createCartStore(null, storage))).getState().items, []);
  assert.equal(records.get(cartStorageKey('a')), originalAccount);
});

test('login merges guest selections with saved account items once and respects stock limits', async () => {
  const { storage, records } = fixture();
  const a = await ready(createCartStore('a', storage)); a.getState().addItem({ ...item, quantity: 7 });
  const guest = await ready(createCartStore(null, storage));
  guest.getState().addItem(item);
  guest.getState().addItem({ ...item, id: 'red-m', variantId: 'red-m', details: 'Red' });
  await mergeGuestCart('a', storage);
  const merged = (await ready(createCartStore('a', storage))).getState().items;
  assert.equal(merged.length, 2); assert.equal(merged[0].quantity, 8); assert.equal(merged[1].quantity, 2);
  assert.equal(records.has(guestCartStorageKey), false);
  await mergeGuestCart('a', storage);
  assert.deepEqual((await ready(createCartStore('a', storage))).getState().items, merged);
  await mergeGuestCart('b', storage);
  assert.deepEqual((await ready(createCartStore('b', storage))).getState().items, []);
  assert.deepEqual((await ready(createCartStore(null, storage))).getState().items, [], 'logout starts a fresh guest cart');
});

test('a new account receives guest items and subsequent guest shopping belongs only to the next login', async () => {
  const { storage } = fixture();
  (await ready(createCartStore(null, storage))).getState().addItem(item);
  await mergeGuestCart('new-account', storage);
  assert.deepEqual((await ready(createCartStore('new-account', storage))).getState().items, [item]);
  (await ready(createCartStore(null, storage))).getState().addItem({ ...item, quantity: 4 });
  await mergeGuestCart('second-account', storage);
  assert.equal((await ready(createCartStore('second-account', storage))).getState().items[0].quantity, 4);
  assert.equal((await ready(createCartStore('new-account', storage))).getState().items[0].quantity, 2);
});

test('concurrent login/hydration transfers cannot copy one guest cart into two accounts', async () => {
  const { storage } = fixture();
  (await ready(createCartStore(null, storage))).getState().addItem(item);
  await Promise.all([mergeGuestCart('a', storage), mergeGuestCart('b', storage), mergeGuestCart('a', storage)]);
  const a = (await ready(createCartStore('a', storage))).getState().items;
  const b = (await ready(createCartStore('b', storage))).getState().items;
  assert.equal(a.length + b.length, 1);
  assert.equal([...a, ...b][0].quantity, 2);
});

test('a failed destination save preserves the guest cart for a later merge', async () => {
  const { storage, records } = fixture();
  (await ready(createCartStore(null, storage))).getState().addItem(item);
  const blocked = { ...storage, setItem: () => {} };
  await mergeGuestCart('a', blocked);
  assert.ok(records.has(guestCartStorageKey)); assert.equal(records.has(cartStorageKey('a')), false);
  await mergeGuestCart('a', storage);
  assert.deepEqual((await ready(createCartStore('a', storage))).getState().items, [item]);
});

test('quantity, removal, and clearing persist only to their owner while variants stay distinct', async () => {
  const { storage } = fixture();
  const a = await ready(createCartStore('a', storage)); const b = await ready(createCartStore('b', storage));
  a.getState().addItem(item); b.getState().addItem(item);
  a.getState().addItem({ ...item, id: 'shirt-red-m', variantId: 'red-m', details: 'Red' });
  a.getState().changeQuantity(item.id, 100);
  assert.equal(a.getState().items[0].quantity, 8);
  assert.equal(a.getState().addItem(item), false, 'stock limit reports that nothing was added');
  a.getState().removeItem(item.id);
  assert.equal((await ready(createCartStore('a', storage))).getState().items[0].variantId, 'red-m');
  a.getState().clearCart();
  assert.deepEqual((await ready(createCartStore('a', storage))).getState().items, []);
  assert.deepEqual((await ready(createCartStore('b', storage))).getState().items, [item]);
});

test('rehydration observes another tab’s updates and storage deletion without changing accounts', async () => {
  const { storage } = fixture();
  const first = await ready(createCartStore('a', storage)); const second = await ready(createCartStore('a', storage));
  first.getState().addItem(item);
  await second.persist.rehydrate();
  assert.deepEqual(second.getState().items, [item]);
  const other = await ready(createCartStore('b', storage)); other.getState().addItem({ ...item, quantity: 7 });
  await second.persist.rehydrate(); assert.equal(second.getState().items[0].quantity, 2);
  storage.removeItem(cartStorageKey('a'));
  await second.persist.rehydrate(); assert.deepEqual(second.getState().items, []);
});

test('untrusted and malformed persisted data cannot replace actions or inject invalid items', async () => {
  const { storage } = fixture();
  storage.setItem(cartStorageKey('a'), JSON.stringify({ version: 1, state: { hydrated: true, clearCart: 'bad', items: [item, { ...item, price: -1 }, { ...item, quantity: 0 }, { ...item, image: 'javascript:bad' }] } }));
  const a = await ready(createCartStore('a', storage));
  assert.deepEqual(a.getState().items, [item]); assert.equal(typeof a.getState().clearCart, 'function');
  storage.setItem(cartStorageKey('a'), '{broken');
  const fresh = await ready(createCartStore('a', storage)); assert.deepEqual(fresh.getState().items, []);
});

test('unavailable browser storage falls back to an isolated in-memory cart', async t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, get() { throw new Error('Storage blocked'); } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete globalThis.window; });
  const a = await ready(createCartStore('a'));
  assert.equal(a.getState().addItem(item), true); assert.deepEqual(a.getState().items, [item]);
  assert.deepEqual((await ready(createCartStore('b'))).getState().items, []);
});
