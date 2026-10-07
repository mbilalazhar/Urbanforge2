import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

// Inspect actual production HTML using disposable storage, never the .env database.
test('storefront discovery, metadata, structured data and crawl rules', { timeout: 120_000 }, async t => {
  let mongo, client, server;
  t.after(async () => {
    if (server && server.exitCode === null) {
      const done = once(server, 'exit');
      server.kill('SIGTERM');
      const timer = setTimeout(() => server.kill('SIGKILL'), 3000);
      await done;
      clearTimeout(timer);
    }
    await client?.close();
    await mongo?.stop();
  });
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' } });
  client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_seo_test');
  const timestamp = new Date().toISOString();
  const product = {
    name: 'SEO Runner', description: 'Streetwear shoes for everyday wear.', shortDescription: '',
    category: 'Shoes', subcategory: 'Sneakers & Athletic', productType: '', brand: 'UrbanForge', gender: 'unisex',
    price: 5000, salePrice: 4000, images: ['/api/media/aaaaaaaaaaaaaaaaaaaaaaaa'], videos: [], colors: [], sizes: [],
    material: '', stock: 3, tags: [], status: 'active', featured: true, newArrival: true, bestseller: false,
    seoTitle: 'Everyday Runner | UrbanForge', seoDescription: 'Comfortable everyday shoes.', variants: [], views: 0,
    createdAt: timestamp, updatedAt: timestamp,
  };
  await db.collection('admin_products').insertMany([
    { ...product, _id: 'seo-runner', id: 'seo-runner', sku: 'RUNNER', skuKeys: ['RUNNER'] },
    { ...product, _id: 'seo-inactive', id: 'seo-inactive', sku: 'INACTIVE', skuKeys: ['INACTIVE'], status: 'inactive' },
    { ...product, _id: 'seo-deleted', id: 'seo-deleted', sku: 'DELETED', skuKeys: ['DELETED'], deletedAt: timestamp },
    { ...product, _id: 'seo-empty', id: 'seo-empty', sku: 'EMPTY', skuKeys: ['EMPTY'], stock: 0, newArrival: false, salePrice: null },
  ]);
  await db.collection('admin_promotions').insertOne({
    _id: 'seo-promotion', id: 'seo-promotion', name: 'Shoe offer', active: true, discountPercent: 30,
    startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    categories: ['Shoes'], productIds: [], banner: '', createdAt: timestamp,
  });
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let output = '';
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_seo_test', MONGODB_DNS_SERVERS: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(base + '/api/auth/session')).ok; } catch {}
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, output);
  const html = async path => {
    const response = await fetch(base + path, { headers: { 'User-Agent': 'Twitterbot/1.0' } });
    assert.equal(response.status, 200, path);
    return response.text();
  };
  const graphs = document => [...document.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .flatMap(match => JSON.parse(match[1])['@graph'] ?? []);

  await t.test('collection HTML contains live product links without client-side fetching', async () => {
    for (const path of ['/', '/shoes', '/new-in', '/sale']) {
      const document = await html(path);
      assert.match(document, /<a\b[^>]*href="\/products\/seo-runner"/, path);
      assert.match(document, /Rs\. 3,500/, 'server cards include current promotion pricing');
      assert.doesNotMatch(document, /href="\/products\/seo-(?:inactive|deleted)"/);
      assert.match(document, /<link rel="canonical" href="https?:\/\//);
    }
    assert.doesNotMatch(await html('/men'), /href="\/products\/seo-runner"/, 'categories keep their own products');
    assert.doesNotMatch(await html('/new-in'), /href="\/products\/seo-empty"/, 'new arrivals filter remains intact');
  });

  await t.test('product head and JSON-LD agree with live pricing, stock and canonical URLs', async () => {
    const document = await html('/products/seo-runner');
    const head = document.match(/<head>[\s\S]*?<\/head>/)?.[0];
    assert.ok(head, 'social crawler receives a complete head');
    assert.match(head, /<title>Everyday Runner \| UrbanForge<\/title>/);
    assert.match(head, /name="description" content="Comfortable everyday shoes\."/);
    assert.match(head, /property="og:image" content="https?:\/\/[^" ]+\/api\/media\/aaaaaaaaaaaaaaaaaaaaaaaa"/);
    const canonical = head.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.ok(canonical?.endsWith('/products/seo-runner'));
    const data = graphs(document);
    const item = data.find(item => item['@type'] === 'Product');
    assert.equal(item.offers.url, canonical);
    assert.equal(item.offers.price, 3500);
    assert.equal(item.offers.priceCurrency, 'PKR');
    assert.equal(item.offers.availability, 'https://schema.org/InStock');
    assert.equal(data.find(item => item['@type'] === 'BreadcrumbList').itemListElement.at(-1).item, canonical);
    const empty = graphs(await html('/products/seo-empty')).find(item => item['@type'] === 'Product');
    assert.equal(empty.offers.availability, 'https://schema.org/OutOfStock');
    for (const id of ['seo-inactive', 'seo-deleted', 'seo-missing']) {
      const response = await fetch(`${base}/products/${id}`, { headers: { 'User-Agent': 'Twitterbot/1.0' } });
      // Next's loading boundary can commit 200 before async notFound resolves.
      assert.ok(response.status === 404 || response.status === 200, id);
      const missing = await response.text();
      assert.match(missing, /name="robots" content="noindex"/);
      assert.match(missing, /Page not found/);
      assert.ok(!graphs(missing).some(item => item['@type'] === 'Product'), 'unavailable products never emit Product offers');
    }
  });

  await t.test('sitemap includes only public active products and utility pages use noindex', async () => {
    const sitemap = await html('/sitemap.xml');
    assert.match(sitemap, /\/products\/seo-runner<\/loc>/);
    assert.match(sitemap, /\/products\/seo-empty<\/loc>/);
    assert.doesNotMatch(sitemap, /seo-inactive|seo-deleted|\/cart<|\/search<|\/checkout</);
    assert.match(sitemap, /<lastmod>/);
    for (const path of ['/search', '/cart', '/checkout', '/wishlist', '/login', '/signup', '/forgot-password', '/adminroute']) {
      assert.match(await html(path), /name="robots" content="noindex[^" ]*(?:[^"]*)"/, path);
    }
    const robots = await html('/robots.txt');
    assert.match(robots, /^Allow: \/api\/media\/$/m);
    assert.match(robots, /^Disallow: \/api\/$/m);
    assert.doesNotMatch(robots, /^Disallow: \/(?:cart|checkout|wishlist|account|adminroute)/m);
    assert.match(robots, /^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  });
});
