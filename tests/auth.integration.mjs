import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

// Run against a disposable database and the production build, never .env.local's database.
test('authentication APIs and protected pages', { timeout: 240_000 }, async t => {
  const mongo = await MongoMemoryServer.create({
    binary: { downloadDir: '/tmp/urbanforge-mongodb-binaries' },
  });
  t.after(() => mongo.stop());
  const client = await new MongoClient(mongo.getUri()).connect();
  t.after(() => client.close());
  const db = client.db('urbanforge_auth_test');
  const key = randomBytes(32).toString('hex');
  const portProbe = createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'urbanforge_auth_test', ADMIN_PROVISIONING_KEY: key },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', chunk => { output += chunk; });
  server.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => {
    if (server.exitCode === null) {
      const exited = once(server, 'exit');
      server.kill('SIGTERM');
      await exited;
    }
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { ready = (await fetch(`${base}/api/auth/session`)).ok; } catch {}
    if (ready) break;
    await delay(200);
  }
  assert.ok(ready, output);

  async function api(path, { body, cookie, headers = {}, raw } = {}) {
    const response = await fetch(base + path, {
      method: body !== undefined || raw !== undefined ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie'), headers: response.headers };
  }
  const input = { name: 'Test User', email: 'User@Example.com', password: 'Valid-password-123' };
  let userCookie;
  let adminCookie;

  await t.test('validates input and rejects malformed JSON, role injection, and cross-site requests', async () => {
    assert.equal((await api('/api/auth/signup', { raw: '{' })).status, 400);
    assert.equal((await api('/api/auth/signup', { body: { ...input, password: 'short' } })).status, 400);
    assert.equal((await api('/api/auth/signup', { body: { ...input, name: ' ' } })).status, 400);
    assert.equal((await api('/api/auth/signup', { body: { ...input, email: 'invalid' } })).status, 400);
    assert.equal((await api('/api/auth/signup', { body: { ...input, role: 'admin' } })).status, 400);
    assert.equal((await api('/api/auth/signup', { body: input, headers: { Origin: 'https://other.example' } })).status, 403);
    assert.equal((await api('/api/auth/signup', { body: input, headers: { 'Content-Type': 'text/plain' } })).status, 415);
    assert.equal((await api('/api/auth/signup', { raw: JSON.stringify({ ...input, name: 'a'.repeat(9000) }) })).status, 413);
    assert.equal(await db.collection('users').countDocuments(), 0);
  });

  await t.test('signup normalizes email, hashes passwords, sets a secure cookie, and creates a user session', async () => {
    const result = await api('/api/auth/signup', { body: input });
    assert.equal(result.status, 201);
    assert.deepEqual(Object.keys(result.body.account).sort(), ['email', 'id', 'name', 'role']);
    assert.equal(result.body.account.email, 'user@example.com');
    assert.equal(result.body.account.role, 'user');
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=lax', 'Max-Age=604800']) assert.ok(result.cookie.includes(flag), result.cookie);
    userCookie = result.cookie.split(';')[0];
    const document = await db.collection('users').findOne({ email: 'user@example.com' });
    assert.match(document.passwordHash, /^scrypt\$/);
    assert.notEqual(document.passwordHash, input.password);
    assert.equal(document.password, undefined);
    assert.equal(document.sessions.length, 1);
    assert.notEqual(document.sessions[0].tokenHash, userCookie.split('=')[1]);
    assert.equal((await api('/api/auth/session', { cookie: userCookie })).body.account.id, result.body.account.id);
    assert.equal((await api('/api/auth/session')).body.account, null);
    assert.equal((await api('/api/auth/session')).headers.get('cache-control'), 'no-store');
  });

  await t.test('rejects duplicate registrations, including concurrent requests', async () => {
    assert.equal((await api('/api/auth/signup', { body: { ...input, email: 'USER@example.COM' } })).status, 409);
    const results = await Promise.all([1, 2].map(() => api('/api/auth/signup', { body: { ...input, email: 'race@example.com' } })));
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  });

  await t.test('login checks credentials and rotates the previous session', async () => {
    assert.equal((await api('/api/auth/login', { body: { email: input.email, password: 'wrong' } })).status, 401);
    assert.equal((await api('/api/auth/login', { body: { email: 'missing@example.com', password: 'wrong' } })).status, 401);
    const previous = userCookie;
    const result = await api('/api/auth/login', { body: { email: input.email, password: input.password }, cookie: previous });
    assert.equal(result.status, 200);
    userCookie = result.cookie.split(';')[0];
    assert.notEqual(userCookie, previous);
    assert.equal((await api('/api/auth/session', { cookie: previous })).body.account, null);
    assert.equal((await api('/api/auth/session', { cookie: userCookie })).body.account.role, 'user');
  });

  await t.test('admin creation requires the provisioning key and does not issue a session', async () => {
    assert.equal((await api('/api/admin/create', { body: input })).status, 401);
    assert.equal((await api('/api/admin/create', { body: input, headers: { 'x-admin-provisioning-key': 'wrong' } })).status, 401);
    assert.equal(await db.collection('admins').countDocuments(), 0);
    const result = await api('/api/admin/create', { body: input, headers: { 'x-admin-provisioning-key': key } });
    assert.equal(result.status, 201);
    assert.equal(result.body.account.role, 'admin');
    assert.equal(result.cookie, null);
    assert.equal((await api('/api/admin/create', { body: input, headers: { 'x-admin-provisioning-key': key } })).status, 409);
    const admin = await db.collection('admins').findOne({ email: 'user@example.com' });
    const user = await db.collection('users').findOne({ email: 'user@example.com' });
    assert.notEqual(admin.passwordHash, user.passwordHash, 'hashes must have unique salts');
  });

  await t.test('admin login and sessions are isolated from user sessions', async () => {
    assert.equal((await api('/api/admin/login', { body: { email: input.email, password: 'wrong' } })).status, 401);
    assert.equal((await api('/api/admin/login', { body: { email: 'race@example.com', password: input.password } })).status, 401);
    const result = await api('/api/admin/login', { body: { email: input.email, password: input.password } });
    assert.equal(result.status, 200);
    adminCookie = result.cookie.split(';')[0];
    assert.equal((await api('/api/admin/session', { cookie: adminCookie })).body.account.role, 'admin');
    assert.equal((await api('/api/admin/session', { cookie: userCookie })).body.account, null);
    assert.equal((await api('/api/admin/session', { cookie: userCookie.replace('urbanforge_user_session', 'urbanforge_admin_session') })).body.account, null);
    assert.equal((await api('/api/auth/session', { cookie: adminCookie.replace('urbanforge_admin_session', 'urbanforge_user_session') })).body.account, null);
    assert.equal((await api('/api/admin/session', { cookie: 'urbanforge_admin_session=forged' })).body.account, null);
  });

  await t.test('pages show login or authenticated account and do not link to the admin route', async () => {
    const anonymousAccount = await fetch(base + '/account', { redirect: 'manual' });
    assert.equal(anonymousAccount.status, 307);
    assert.equal(anonymousAccount.headers.get('location'), '/login');
    const account = await fetch(base + '/account', { headers: { Cookie: userCookie } });
    assert.equal(account.status, 200);
    assert.match(await account.text(), /My account/);
    const admin = await (await fetch(base + '/adminroute')).text();
    assert.match(admin, /Admin Login/);
    assert.match(admin, /type="password"/);
    assert.match(await (await fetch(base + '/adminroute', { headers: { Cookie: adminCookie } })).text(), /Welcome back/);
    assert.doesNotMatch(await (await fetch(base + '/')).text(), /href="\/adminroute/);
  });

  await t.test('rejects expired sessions and revokes sessions on logout', async () => {
    const tokenHash = createHash('sha256').update(userCookie.split('=')[1]).digest('hex');
    await db.collection('users').updateOne({ 'sessions.tokenHash': tokenHash }, { $set: { 'sessions.$.expiresAt': new Date(0) } });
    assert.equal((await api('/api/auth/session', { cookie: userCookie })).body.account, null);
    const signedIn = await api('/api/auth/login', { body: { email: input.email, password: input.password } });
    userCookie = signedIn.cookie.split(';')[0];
    assert.equal((await api('/api/auth/logout', { body: {}, cookie: userCookie, headers: { Origin: 'https://other.example' } })).status, 403);
    assert.ok((await api('/api/auth/session', { cookie: userCookie })).body.account);
    const loggedOut = await api('/api/auth/logout', { body: {}, cookie: userCookie });
    assert.equal(loggedOut.status, 200);
    assert.match(loggedOut.cookie, /Max-Age=0/);
    assert.equal((await api('/api/auth/session', { cookie: userCookie })).body.account, null);
    assert.ok((await api('/api/admin/session', { cookie: adminCookie })).body.account);
    assert.equal((await api('/api/admin/logout', { body: {}, cookie: adminCookie })).status, 200);
    assert.equal((await api('/api/admin/session', { cookie: adminCookie })).body.account, null);
  });

  await t.test('rate limits repeated login attempts', async () => {
    for (let i = 0; i < 10; i++) {
      assert.equal((await api('/api/auth/login', { body: { email: 'limited@example.com', password: 'wrong' } })).status, 401);
    }
    assert.equal((await api('/api/auth/login', { body: { email: 'limited@example.com', password: 'wrong' } })).status, 429);
  });
});
