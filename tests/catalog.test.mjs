import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import { buildCatalog, mediaReview, summarizeCatalog, validateCatalog } from '../scripts/catalog/catalog.mjs';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { matchesCatalogProduct } = await load('../lib/catalog-search.ts');
const { collectionProducts } = await load('../lib/home-collections.ts');
const { colorHex, toProductCard } = await load('../lib/products.ts');

test('83 complete records expand the existing five-product store to 22 per category', async () => {
  const products = buildCatalog(), summary = await validateCatalog(products);
  assert.equal(summary.total, 83);
  assert.deepEqual(summary.categories, { Men: 17, Women: 22, Shoes: 22, Accessories: 22 });
  assert.equal(summary.newArrival, 24);
  assert.equal(summary.featured, 12);
  assert.equal(summary.bestseller, 16);
  assert.equal(summary.sale, 27);
  assert(products.every(p => p.seoDescription.length >= 120 && p.seoDescription.length <= 160));
  assert.equal(new Set(products.map(p => p.seoDescription)).size, 83);
  assert.equal(new Set(products.map(p => p.description)).size, 83);
  assert.deepEqual(buildCatalog(), products, 'SKUs, option IDs and inventory must be deterministic');
  assert.equal(mediaReview().filter(p => p.coverSource.startsWith('Previously generated')).length, 8);
});

test('validation rejects duplicate SKUs, incorrect stock, wrong taxonomy and inappropriate accessory sizes', async () => {
  const change = mutate => { const p = buildCatalog(); mutate(p); return p; };
  await assert.rejects(validateCatalog(change(p => { p[1].sku = p[0].sku; })), /duplicate SKU/);
  await assert.rejects(validateCatalog(change(p => { p[0].stock++; })), /stock total mismatch/);
  await assert.rejects(validateCatalog(change(p => { p[0].subcategory = 'New In'; })), /invalid subcategory/);
  await assert.rejects(validateCatalog(change(p => { p[0].salePrice = p[0].price + 1; })), /invalid sale price/);
  await assert.rejects(validateCatalog(change(p => { p[0].variants[0].stock = -1; })), /invalid stock/);
  await assert.rejects(validateCatalog(change(p => { p.find(p => p.category === 'Accessories').sizes[0] = 'M'; })), /invalid variant options|clothing size/);
});

test('every curated collection spans all four categories; ratings remain authentic', () => {
  const products = buildCatalog();
  for (const collection of ['new-arrivals', 'featured', 'bestsellers', 'essentials']) {
    assert.equal(new Set(collectionProducts(products, collection).map(p => p.category)).size, 4, collection);
  }
  assert.equal(collectionProducts(products, 'top-rated').length, 0, 'never fabricate reviews');
  assert.equal(summarizeCatalog(products).stock, products.flatMap(p => p.variants).reduce((sum, v) => sum + v.stock, 0));
});

test('search finds names, tags, taxonomy, combined category/color terms and collection flags', () => {
  const products = buildCatalog();
  for (const term of ['hoodie', 'black jacket', 'cargo', 'women trousers', 'sneakers', 'watch', 'bag', 'seersucker', 'outerwear', 'essential', 'new in', 'sale']) {
    assert(products.some(p => matchesCatalogProduct(p, term)), term);
  }
  const product = { ...products[0], name: 'Plain item', tags: ['unusual-search-tag'] };
  assert(matchesCatalogProduct(product, 'unusual-search-tag'));
  assert(!matchesCatalogProduct(product, 'no-such-term'));
});

test('cards contain only the primary media and render the catalog color palette', () => {
  const product = { ...buildCatalog()[0], id: 'test' };
  const card = toProductCard(product);
  assert.equal(card.image, product.images[0]);
  assert.equal(card.images, undefined);
  assert.equal(card.videos, undefined);
  assert.equal(colorHex('Burgundy'), '#722f3e');
  assert.equal(colorHex('Cream / Taupe'), '#eee8d6');
  assert.equal(colorHex('Silver / Black Dial'), '#bfc3c7');
});
