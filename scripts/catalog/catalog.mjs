import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import ts from 'typescript';
import men from './men.mjs';
import women from './women.mjs';
import shoes from './shoes.mjs';
import accessories from './accessories.mjs';

export const catalogVersion = 'urbanforge-catalog-2026-10';
export const showcaseNames = new Set([
  'Foundry Heavyweight Box Tee', 'Rawline Denim Trucker Jacket', 'District Four-Pocket Utility Jacket',
  'Studio Wide-Leg Tailored Trousers', 'Contour Long-Sleeve Ribbed Top', 'Afterhours Cropped Biker Jacket',
  'Vector Chunky Street Runner', 'Shift Lug-Sole Chelsea Boots',
]);

export function buildCatalog() {
  return Object.entries({ Men: men, Women: women, Shoes: shoes, Accessories: accessories }).flatMap(([category, records]) => records.map((record, index) => {
    const { code, image, ...details } = record;
    const sku = `UF-${category[0]}-${code}-${String(index + 1).padStart(3, '0')}`;
    const variants = record.colors.flatMap((color, colorIndex) => record.sizes.map((size, sizeIndex) => ({
      id: `${sku.toLowerCase()}-c${colorIndex + 1}-s${sizeIndex + 1}`,
      sku: `${sku}-C${String(colorIndex + 1).padStart(2, '0')}-${size.toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      color, size,
      stock: 2 + (index * 7 + colorIndex * 3 + sizeIndex * 5) % 12,
    })));
    const discount = [0.15, 0.2, 0.1][Math.floor(index / 3) % 3];
    return {
      ...details, category, productType: record.productType ?? '', brand: 'UrbanForge',
      gender: record.gender ?? (category === 'Men' ? 'men' : category === 'Women' ? 'women' : 'unisex'),
      sku, salePrice: index % 3 === 1 ? Math.round(record.price * (1 - discount) / 50) * 50 : null,
      images: [`/products/catalog/${image}.webp`], videos: [], variants,
      stock: variants.reduce((sum, variant) => sum + variant.stock, 0), status: 'active',
      newArrival: index < 6, featured: index < 3, bestseller: [2, 6, 10, 14].includes(index),
      tags: [...record.tags, category.toLowerCase(), ...([0, 3, 6, 9, 12, 15].includes(index) ? ['essential'] : [])],
      seoTitle: `${record.name} | UrbanForge`,
      seoDescription: record.shortDescription.length <= 143 ? `${record.shortDescription} Shop UrbanForge.` : record.shortDescription,
    };
  }));
}

export function summarizeCatalog(products) {
  return {
    total: products.length,
    categories: Object.fromEntries(['Men', 'Women', 'Shoes', 'Accessories'].map(category => [category, products.filter(p => p.category === category).length])),
    newArrival: products.filter(p => p.newArrival).length,
    featured: products.filter(p => p.featured).length,
    bestseller: products.filter(p => p.bestseller).length,
    essentials: products.filter(p => p.tags.some(tag => /^essentials?$/i.test(tag.trim()))).length,
    sale: products.filter(p => p.salePrice !== null && p.salePrice < p.price).length,
    variants: products.reduce((sum, p) => sum + p.variants.length, 0),
    stock: products.reduce((sum, p) => sum + p.stock, 0),
  };
}

// Read the application's taxonomy so the seed cannot silently diverge from admin choices.
export async function validateCatalog(products = buildCatalog()) {
  const source = await readFile(new URL('../../lib/product-categories.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
  const { productCategories } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  const allSkus = new Set(), names = new Set(), ids = new Set();
  const words = value => value.trim().split(/\s+/).length;
  for (const p of products) {
    const fail = message => `${p.sku}: ${message}`;
    const normalizedName = p.name.trim().toLowerCase();
    assert(!names.has(normalizedName), fail('duplicate name')); names.add(normalizedName);
    assert(['Men', 'Women', 'Shoes', 'Accessories'].includes(p.category), fail('invalid category'));
    const types = productCategories[p.category]?.[p.subcategory];
    assert(types, fail('invalid subcategory'));
    assert(types.length ? types.includes(p.productType) : p.productType === '', fail('invalid product type'));
    assert(['men', 'women', 'unisex'].includes(p.gender), fail('invalid gender'));
    for (const key of ['name', 'description', 'shortDescription', 'brand', 'material', 'seoTitle', 'seoDescription']) {
      assert(typeof p[key] === 'string' && p[key].trim(), fail(`missing ${key}`));
      assert(!/lorem ipsum|placeholder|TODO/i.test(p[key]), fail(`filler in ${key}`));
    }
    assert(p.name.length <= 150 && p.material.length <= 150 && p.seoTitle.length <= 150, fail('admin text limit exceeded'));
    assert(words(p.description) >= 80 && words(p.description) <= 180 && p.description.length <= 2000, fail('long description must be 80–180 words and within admin limit'));
    assert(words(p.shortDescription) >= 15 && words(p.shortDescription) <= 30, fail('short description must be 15–30 words'));
    assert(p.seoDescription.length >= 120 && p.seoDescription.length <= 190, fail('SEO description length'));
    assert(Number.isFinite(p.price) && p.price > 0, fail('invalid price'));
    assert(p.salePrice === null || Number.isFinite(p.salePrice) && p.salePrice > 0 && p.salePrice < p.price, fail('invalid sale price'));
    assert(p.tags.length >= 4 && new Set(p.tags).size === p.tags.length, fail('invalid tags'));
    assert(p.status === 'active', fail('products must be active'));
    assert(p.colors.length >= 2 && p.sizes.length > 0, fail('missing options'));
    assert(p.variants.length === p.colors.length * p.sizes.length && p.variants.length <= 200, fail('variant matrix mismatch'));
    for (const item of [p, ...p.variants]) {
      assert(/^[A-Z0-9-]+$/.test(item.sku) && item.sku.length <= 100, fail('invalid SKU'));
      assert(!allSkus.has(item.sku), fail(`duplicate SKU ${item.sku}`)); allSkus.add(item.sku);
      assert(Number.isInteger(item.stock) && item.stock >= 0, fail('invalid stock'));
    }
    for (const v of p.variants) {
      assert(!ids.has(v.id), fail('duplicate variant ID')); ids.add(v.id);
      assert(p.colors.includes(v.color) && p.sizes.includes(v.size), fail('invalid variant options'));
    }
    assert(new Set(p.variants.map(v => `${v.color}\0${v.size}`)).size === p.variants.length, fail('duplicate color/size combination'));
    assert(p.stock === p.variants.reduce((sum, v) => sum + v.stock, 0), fail('stock total mismatch'));
    if (p.category === 'Shoes') assert(p.sizes.every(size => /^\d+$/.test(size) && +size >= 36 && +size <= 45), fail('invalid EU shoe size'));
    if (p.category === 'Accessories') assert(p.sizes.every(size => !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size)), fail('clothing size used on accessory'));
    assert(p.images.length === 1 && p.videos.length === 0, fail('this data-only seed uses one temporary cover and no video'));
    assert(/^\/products\/catalog\/[a-z0-9-]+\.webp$/.test(p.images[0]), fail('unexpected cover path'));
    await access(new URL(`../../public${p.images[0]}`, import.meta.url));
  }
  return { ...summarizeCatalog(products), uniqueSkus: allSkus.size, validation: 'passed' };
}

export function mediaReview(products = buildCatalog()) {
  return products.map(p => ({
    sku: p.sku, name: p.name, cover: p.images[0],
    mediaStatus: 'manual-review',
    coverSource: showcaseNames.has(p.name) ? 'Previously generated showcase cover' : 'Temporary reused project image',
    remaining: [...(showcaseNames.has(p.name) ? [] : ['Replace temporary cover']), 'Add gallery images', 'Add product video if desired'],
  }));
}
