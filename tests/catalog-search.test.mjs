import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../lib/catalog-search.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { selectSearchProducts } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const product = (id, flags) => ({ id, ...flags });

test('search shows four bestsellers and four featured products when both are available', () => {
  const products = [
    ...Array.from({ length: 12 }, (_, i) => product(`b${i}`, { bestseller: true })),
    ...Array.from({ length: 12 }, (_, i) => product(`f${i}`, { featured: true })),
    product('ordinary', {}),
  ];
  const result = selectSearchProducts(products);
  assert.equal(result.length, 8);
  assert.equal(result.filter(p => p.bestseller).length, 4);
  assert.equal(result.filter(p => p.featured).length, 4);
  assert.deepEqual(result.map(p => p.id), ['b0', 'f0', 'b1', 'f1', 'b2', 'f2', 'b3', 'f3']);
  assert.equal(products.length, 25);
});

test('search deduplicates overlapping flags and fills spare slots from available selections', () => {
  const both = product('both', { bestseller: true, featured: true });
  const products = [both, both, ...Array.from({ length: 10 }, (_, i) => product(`f${i}`, { featured: true }))];
  const result = selectSearchProducts(products);
  assert.equal(result.length, 8);
  assert.equal(new Set(result.map(p => p.id)).size, 8);
  assert.equal(result[0], both);
});

test('small or empty filtered selections never include unrelated products', () => {
  const featured = product('featured', { featured: true });
  assert.deepEqual(selectSearchProducts([product('ordinary', {}), featured]), [featured]);
  assert.deepEqual(selectSearchProducts([]), []);
  assert.deepEqual(selectSearchProducts([product('ordinary', {})]), []);
});
