import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

test('contact pages and persisted support enquiries', { timeout: 90_000 }, async t => {
  const mongo = await MongoMemoryServer.create({ binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' } });
  const client = await new MongoClient(mongo.getUri()).connect();
  const db = client.db('urbanforge_contact_test');
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://localhost:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_contact_test', MONGODB_DNS_SERVERS: '' }, stdio: 'ignore',
  });
  t.after(async () => {
    if (server.exitCode === null) { const stopped = once(server, 'exit'); server.kill('SIGTERM'); await stopped; }
    await client.close();
    await mongo.stop();
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(base + '/contact')).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, 'production server starts');
  const input = { name: 'Test Customer', email: 'Customer@example.com', phone: '', orderNumber: 'UF123', subject: 'Order enquiry', message: 'Please help me check the status of my order.' };
  const send = (body, headers = {}) => fetch(base + '/api/contact', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...headers }, body: JSON.stringify(body),
  });

  await t.test('contact and FAQs render with working footer destinations', async () => {
    const contact = await (await fetch(base + '/contact')).text();
    assert.ok(contact.includes('How can we help?'));
    assert.ok(contact.includes('maps.google.com/maps?q=Nike'));
    const footer = contact.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    assert.match(footer, /href="\/contact"/);
    assert.match(footer, /href="\/faqs"/);
    const faqs = await (await fetch(base + '/faqs')).text();
    assert.equal((faqs.match(/<details\b/g) || []).length, 25);
    assert.ok(!/<details[^>]*\bopen\b/.test(faqs));
    assert.ok(faqs.includes('href="/contact#ask-question"'));
  });

  await t.test('rejects invalid and cross-origin submissions without saving them', async () => {
    for (const body of [{ ...input, email: 'invalid' }, { ...input, message: 'short' }, { ...input, message: 'a'.repeat(1001) }, { ...input, name: ' ' }, { ...input, subject: 'unknown' }, { ...input, status: 'resolved' }]) {
      assert.equal((await send(body)).status, 400);
    }
    assert.equal((await send(input, { Origin: 'https://other.example' })).status, 403);
    assert.equal((await send(input, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await send({ ...input, message: 'a'.repeat(9000) })).status, 413);
    assert.equal(await db.collection('support_messages').countDocuments(), 0);
  });

  await t.test('valid submissions persist and return a reference without exposing personal data', async () => {
    const response = await send(input);
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.match(result.reference, /^UF-[a-f0-9-]{36}$/);
    assert.deepEqual(Object.keys(result), ['reference']);
    const saved = await db.collection('support_messages').findOne({ reference: result.reference });
    assert.equal(saved.email, 'customer@example.com');
    assert.equal(saved.message, input.message);
    assert.equal(saved.status, 'new');
    assert.ok(saved.createdAt instanceof Date);
    assert.equal((await fetch(base + '/api/contact')).status, 405);
  });

  await t.test('repeated submissions are limited', async () => {
    for (let attempt = 0; attempt < 9; attempt++) assert.equal((await send(input)).status, 201);
    assert.equal((await send(input)).status, 429);
    assert.equal(await db.collection('support_messages').countDocuments(), 10);
  });

  await t.test('database outage keeps pages usable and never reports a false submission success', async () => {
    await mongo.stop();
    assert.equal((await fetch(base + '/contact')).status, 200);
    assert.equal((await fetch(base + '/faqs')).status, 200);
    const response = await send({ ...input, email: 'outage@example.com' });
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.ok(result.message.includes('couldn’t save'));
    assert.equal(result.reference, undefined);
  });
});
