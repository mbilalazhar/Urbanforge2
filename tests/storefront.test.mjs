import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { toProductCard } = await load('../lib/products.ts');
const { collectionProducts } = await load('../lib/home-collections.ts');
const { addCartItem, changeCartQuantity, formatCartPrice } = await load('../lib/cart-data.ts');

test('home collections use product flags, essential tags, and real review rankings', () => {
  const products = [
    { id: 'new', newArrival: true, featured: true, tags: [' ESSENTIALS '], reviewCount: 0, ratingAverage: 0 },
    { id: 'popular', bestseller: true, tags: [], reviewCount: 10, ratingAverage: 4 },
    { id: 'rated', tags: ['essential'], reviewCount: 2, ratingAverage: 5 },
    { id: 'rated-more', tags: ['nonessential'], reviewCount: 6, ratingAverage: 5 },
    { id: 'unrated', tags: [] },
  ];
  const ids = collection => collectionProducts(products, collection).map(product => product.id);
  assert.deepEqual(ids('new-arrivals'), ['new']);
  assert.deepEqual(ids('featured'), ['new']);
  assert.deepEqual(ids('bestsellers'), ['popular']);
  assert.deepEqual(ids('essentials'), ['new', 'rated']);
  assert.deepEqual(ids('top-rated'), ['rated-more', 'rated', 'popular']);
  assert.deepEqual(products.map(product => product.id), ['new', 'popular', 'rated', 'rated-more', 'unrated'], 'ranking does not reorder the shared catalog');
});

test('catalog cards use actual product IDs, media, pricing and options', () => {
  const card = toProductCard({ id: 'real-id', name: 'Real shirt', category: 'Women', price: 2000, salePrice: 1500, images: ['/api/media/image-id'], colors: ['Blue'], sizes: ['M'], newArrival: true });
  assert.equal(card.href, '/products/real-id');
  assert.equal(card.name, 'Real shirt');
  assert.equal(card.image, '/api/media/image-id');
  assert.equal(card.price, 'Rs. 1,500');
  assert.equal(card.amount, 1500);
  assert.equal(card.tag, 'SALE');
  assert.deepEqual(card.sizes, ['M']);
  const variantCard = toProductCard({ id: 'variant', name: 'Variant shirt', category: 'Men', price: 2000, salePrice: null, images: ['/image.png'], colors: [], sizes: [], variants: [{ color: 'Black', size: 'L' }] });
  assert.deepEqual(variantCard.sizes, ['L']);
  assert.equal(variantCard.colors[0].name, 'Black');
});

test('cart merges matching selections and enforces shared stock without mixing variants', () => {
  const base = { id: 'blue-m', productId: 'shirt', name: 'Shirt', details: 'Blue', size: 'M', price: 150000, image: '/image.png', quantity: 2, maxQuantity: 5 };
  let items = addCartItem([], base);
  items = addCartItem(items, base);
  assert.equal(items.length, 1); assert.equal(items[0].quantity, 4);
  items = addCartItem(items, { ...base, id: 'red-m', details: 'Red' });
  assert.equal(items[1].quantity, 1, 'untracked options share the base product stock');
  items = changeCartQuantity(items, 'red-m', 1);
  assert.equal(items[1].quantity, 1);
  items = addCartItem(items, { ...base, id: 'variant-m', variantId: 'variant-m', maxQuantity: 2 });
  assert.equal(items[2].quantity, 2, 'variants have separate stock');
  assert.equal(changeCartQuantity(items, 'variant-m', 1)[2].quantity, 2);
  assert.equal(addCartItem([], { ...base, maxQuantity: 0 }).length, 0);
  assert.equal(formatCartPrice(150000), 'Rs. 1,500');
});
