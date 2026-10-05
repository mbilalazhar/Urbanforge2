import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

// Use the production build with unavailable storage; never use the real database.
test('routes remain accessible when storage is unavailable', { timeout: 60_000 }, async t => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, MONGODB_URI: '', MONGODB_DNS_SERVERS: '' },
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

  await t.test('public pages and every internal footer link resolve', async () => {
    const paths = ['/', '/women', '/men', '/new-in', '/shoes', '/accessories', '/sale', '/search', '/cart', '/checkout', '/wishlist', '/login', '/signup', '/forgot-password', '/privacy-policy', '/terms', '/cookie-policy', '/adminroute'];
    for (const path of paths) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.ok(/<(?:main|h1)[\s>]/.test(await response.text()), `${path} should render page content`);
    }
    const html = await (await fetch(base)).text();
    const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer);
    const links = new Set([...footer.matchAll(/href="(\/[^"#]*)"/g)].map(match => match[1]));
    assert.ok(links.size > 0);
    for (const path of links) assert.equal((await fetch(base + path)).status, 200, path);
  });

  await t.test('signed-out account access still redirects to login', async () => {
    const response = await fetch(`${base}/account`, { redirect: 'manual' });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), '/login');
  });

  await t.test('existing cookies cannot crash pages or bypass authentication during an outage', async () => {
    for (const [role, path, title] of [
      ['user', '/account', 'Your account is temporarily unavailable'],
      ['admin', '/adminroute', 'The admin portal is temporarily unavailable'],
    ]) {
      const headers = { Cookie: `urbanforge_${role}_session=${'a'.repeat(64)}` };
      const response = await fetch(base + path, { headers, redirect: 'manual' });
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.ok(html.includes(title));
      assert.ok(html.includes('Try again'));
      assert.ok(html.includes('Back to the store'));
      assert.ok(!html.includes('MONGODB_URI'));
      assert.equal(response.headers.get('set-cookie'), null, 'outages must not discard sessions');
      const session = await fetch(`${base}/api/${role === 'user' ? 'auth' : 'admin'}/session`, { headers });
      assert.equal(session.status, 503, 'API must report unavailable storage, not a signed-out session');
    }
  });

  await t.test('unknown paths still return a real 404', async () => {
    assert.equal((await fetch(`${base}/not-a-real-category`)).status, 404);
  });
});
