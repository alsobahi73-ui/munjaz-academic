import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import { randomUUID } from 'node:crypto';
import { createWorker } from './index.mjs';
const ctx = createContext({ window: {} });
new Script(await readFile(new URL('../academic-services-data.js', import.meta.url), 'utf8')).runInContext(ctx);
const env = { TELEGRAM_BOT_TOKEN: 'FAKE_TEST_TOKEN', TELEGRAM_CHAT_ID: '1234', SITE_ORIGIN: 'https://site.example' };
const request = (id = randomUUID(), ip = '192.0.2.1') => new Request('https://worker.example/api/academic-requests', { method: 'POST', headers: { Origin: env.SITE_ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify({ requestId: id, service: 'reports', details: 'طلب اختبار معزول للخدمة الأكاديمية', consent: true }) });
test('worker routes, CORS, delivery and deduplication survive separate fetch calls', async () => {
 let calls = 0;
 const worker = createWorker(ctx.window.AcademicServicesCatalog, async () => { calls++; return Response.json({ ok: true, result: { message_id: 1 } }); });
 assert.equal((await worker.fetch(new Request('https://worker.example/healthz'), {})).status, 200);
 assert.equal((await worker.fetch(new Request('https://worker.example/server/index.mjs'), env)).status, 404);
 const preflight = await worker.fetch(new Request('https://worker.example/api/academic-requests', { method: 'OPTIONS', headers: { Origin: env.SITE_ORIGIN } }), env);
 assert.equal(preflight.status, 204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
 const id = randomUUID();
 assert.equal((await worker.fetch(request(id), env)).status, 201);
 assert.equal((await worker.fetch(request(id), { ...env })).status, 201);
 assert.equal(calls, 1);
 for (let i = 0; i < 4; i++) assert.equal((await worker.fetch(request(), env)).status, 201);
 assert.equal((await worker.fetch(request(), env)).status, 429);
 assert.equal((await worker.fetch(request(undefined, '192.0.2.2'), env)).status, 201);
});
test('missing secrets and wrong origins never send', async () => {
 const worker = createWorker(ctx.window.AcademicServicesCatalog, async () => { throw Error('Must not send'); });
 assert.equal((await worker.fetch(request(), { SITE_ORIGIN: env.SITE_ORIGIN })).status, 503);
 assert.equal((await worker.fetch(request(), { ...env, SITE_ORIGIN: 'https://other.example' })).status, 403);
});

test('worker normalized POST/preflight and safe CORS diagnostics share the same comparison', async () => {
 let calls = 0;
 const worker = createWorker(ctx.window.AcademicServicesCatalog, async () => { calls++; return Response.json({ ok: true, result: { message_id: 1 } }); });
 const configuredEnv = { ...env, SITE_ORIGIN: ' \u200e\u202e' + env.SITE_ORIGIN + '/\u2069\ufeff ' };
 assert.equal((await worker.fetch(request(), configuredEnv)).status, 201);
 const preflight = await worker.fetch(new Request('https://worker.example/api/academic-requests', { method: 'OPTIONS', headers: { Origin: env.SITE_ORIGIN + '/' } }), configuredEnv);
 assert.equal(preflight.status, 204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), env.SITE_ORIGIN);
 for (const [receivedOrigin, config, match] of [[env.SITE_ORIGIN, configuredEnv, true], ['https://attacker.example', configuredEnv, false], [null, configuredEnv, false], [env.SITE_ORIGIN, {}, false], [env.SITE_ORIGIN, { SITE_ORIGIN: ' \u200b/ ' }, false]]) {
  const response = await worker.fetch(new Request('https://worker.example/debug-cors', { headers: receivedOrigin ? { Origin: receivedOrigin } : {} }), config);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { receivedOrigin, configured: config === configuredEnv, match });
 }
 assert.equal((await worker.fetch(new Request('https://worker.example/debug-cors', { method: 'POST' }), configuredEnv)).status, 404);
 assert.equal(calls, 1);
});
test('health reports configuration readiness without disclosing secrets or claiming delivery', async () => {
 let calls = 0;
 const worker = createWorker(ctx.window.AcademicServicesCatalog, async () => { calls++; throw Error('must not send'); });
 for (const [settings, ready] of [[{}, false], [env, true], [{ ...env, TELEGRAM_CHAT_ID: '@MunjazAcademicBot' }, false]]) {
  const response = await worker.fetch(new Request('https://worker.example/healthz'), settings);
  assert.deepEqual(await response.json(), { ok: true, requestsConfigured: ready });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
 }
 assert.equal(calls, 0);
});
test('deployment targets the worker used by the frontend', async () => {
 const configuration = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
 const frontend = await readFile(new URL('../academic-services-config.js', import.meta.url), 'utf8');
 const workerName = configuration.match(/^name\s*=\s*"([^"]+)"/m)[1];
 const endpoint = new URL(frontend.match(/requestEndpoint:\s*'([^']+)'/)[1]);
 assert.equal(endpoint.hostname.split('.')[0], workerName);
});
