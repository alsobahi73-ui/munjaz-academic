import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('all linked standalone pages load; private files stay inaccessible', async t => {
 const child = spawn(process.execPath, ['server/index.mjs'], {
  cwd: new URL('../../', import.meta.url),
  env: { ...process.env, PORT: '0', BIND_ADDRESS: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'],
 });
 t.after(async () => { child.kill(); await once(child, 'exit'); });
 const port = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Error('Server startup timed out')), 10000);
  child.once('error', error => { clearTimeout(timeout); reject(error); });
  child.stdout.on('data', chunk => {
   const match = chunk.toString().match(/ready on port (\d+)/);
   if (match) { clearTimeout(timeout); resolve(match[1]); }
  });
 });
 const root = `http://127.0.0.1:${port}`;
 for (const path of ['/', '/services.html', '/news.html', '/job-seekers.html', '/munjaz-promotion-calculator.html']) {
  const response = await fetch(root + path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /text\/html; charset=utf-8/);
  assert.match(await response.text(), /lang="ar" dir="rtl"/);
 }
 for (const path of ['/.git/config', '/server/.env.example', '/server/index.mjs', '/sources.yaml']) {
  assert.equal((await fetch(root + path)).status, 404, path);
 }
 const head = await fetch(root + '/job-seekers.html', { method: 'HEAD' });
 assert.equal(head.status, 200);
 assert.equal(await head.text(), '');
});
