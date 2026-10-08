import { randomUUID } from 'node:crypto';
import { setServers } from 'node:dns/promises';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import env from '@next/env';
import { MongoClient } from 'mongodb';
import { buildCatalog, catalogVersion, mediaReview, summarizeCatalog, validateCatalog } from './catalog.mjs';

export async function seedCatalog(client, db, { apply = false, products = buildCatalog() } = {}) {
  await validateCatalog(products);
  const collection = db.collection('admin_products');
  const plan = async session => {
    const existing = await collection.find({}, { session }).toArray();
    const pending = [];
    for (const p of products) {
      const match = existing.find(item => item.sku === p.sku);
      if (match) continue; // Preserve every admin edit, stock change, archive state and uploaded image.
      const name = p.name.trim().toLowerCase();
      if (existing.some(item => item.name?.trim().toLowerCase() === name)) throw new Error(`Name already exists with another SKU: ${p.name}`);
      const incomingKeys = new Set([p.sku, ...p.variants.map(v => v.sku)]);
      const conflict = existing.find(item => [item.sku, ...(item.variants ?? []).map(v => v.sku), ...(item.skuKeys ?? [])].some(key => incomingKeys.has(key?.toUpperCase())));
      if (conflict) throw new Error(`SKU conflicts with existing product ${conflict.sku}; nothing was inserted.`);
      pending.push(p);
    }
    return { pending, existing };
  };
  if (!apply) {
    const { pending, existing } = await plan();
    return { mode: 'dry-run', version: catalogVersion, planned: pending.length, preserved: products.length - pending.length,
      projectedCatalog: summarizeCatalog([...existing.filter(p => !p.deletedAt && p.status === 'active'), ...pending]) };
  }
  // Same uniqueness constraint as the admin API. No drops or data resets.
  await collection.createIndex({ skuKeys: 1 }, { unique: true });
  const session = client.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const { pending } = await plan(session);
      const timestamp = new Date().toISOString();
      const documents = pending.map(p => {
        const id = `catalog-${p.sku.toLowerCase()}`;
        return { ...p, _id: id, id, skuKeys: [p.sku, ...p.variants.map(v => v.sku)], views: 0, createdAt: timestamp, updatedAt: timestamp };
      });
      // Batch network round trips so larger catalogs fit comfortably within MongoDB's transaction lifetime.
      const saved = documents.length ? await collection.bulkWrite(documents.map(product => ({
        updateOne: { filter: { sku: product.sku }, update: { $setOnInsert: product }, upsert: true },
      })), { session }) : null;
      const insertedDocuments = Object.keys(saved?.upsertedIds ?? {}).map(index => documents[Number(index)]);
      // Only newly inserted variants receive opening inventory, never products skipped on reruns.
      const movements = insertedDocuments.flatMap(p => p.variants.map(v => {
          const movementId = randomUUID();
          return { _id: movementId, id: movementId, productId: p.id, productName: p.name, variantId: v.id,
            sku: v.sku, variantLabel: [v.color, v.size].filter(Boolean).join(' / '), type: 'added', quantity: v.stock,
            before: 0, after: v.stock, reason: `Opening catalog stock (${catalogVersion})`, adminId: 'catalog-seed', createdAt: timestamp };
      }));
      if (movements.length) await db.collection('admin_stock_movements').insertMany(movements, { session });
      const active = await collection.find({ status: 'active', deletedAt: { $exists: false } }, { session }).toArray();
      result = { mode: 'applied', version: catalogVersion, inserted: insertedDocuments.length, preserved: products.length - insertedDocuments.length, catalog: summarizeCatalog(active) };
    });
    return result;
  } finally { await session.endSession(); }
}

async function main() {
  if (process.argv.slice(2).some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('Usage: npm run seed:catalog -- [--dry-run | --apply]');
  if (process.argv.includes('--apply') && process.argv.includes('--dry-run')) throw new Error('Choose --apply or --dry-run, not both.');
  env.loadEnvConfig(process.cwd());
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before seeding the catalog.');
  const dns = process.env.MONGODB_DNS_SERVERS?.split(',').map(value => value.trim()).filter(Boolean);
  if (dns?.length) setServers(dns);
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const result = await seedCatalog(client, client.db(process.env.MONGODB_DB || 'urbanforge'), { apply: process.argv.includes('--apply') });
    if (result.mode === 'applied') {
      await writeFile(new URL('media-review.json', import.meta.url), JSON.stringify(mediaReview(), null, 2) + '\n');
      await writeFile(new URL('seed-report.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
    }
    console.log(JSON.stringify(result, null, 2));
  } finally { await client.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    // Redact connection strings while retaining useful database diagnostics.
    const message = String(error.message).replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted MongoDB URI]');
    console.error(`Catalog seed failed (${error.name}${error.code ? `, code ${error.code}` : ''}): ${message}`);
    process.exitCode = 1;
  });
}
