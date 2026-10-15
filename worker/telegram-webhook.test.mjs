import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelegramWebhook } from './telegram-webhook.mjs';

const base = { token: 'TESTTOKEN', adminChatId: '111', webhookSecret: 's3cr3t' };
const calls = [];
const fetchImpl = async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body) });
  return Response.json({ ok: true, result: { message_id: 1 } });
};
const hook = (over = {}) => createTelegramWebhook({ ...base, ...over, fetchImpl });
const update = (message) => new Request('https://worker.example/telegram-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 's3cr3t' },
  body: JSON.stringify({ update_id: 1, message }),
});
const msg = (text) => ({ message_id: 1, chat: { id: 222, type: 'private' }, from: { id: 333, first_name: 'Ali', username: 'ali_q' }, text });

test('rejects non-POST', async () => {
  const res = await hook()(new Request('https://worker.example/telegram-webhook'));
  assert.equal(res.status, 405);
});

test('rejects wrong secret', async () => {
  const res = await hook()(new Request('https://worker.example/telegram-webhook', {
    method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, body: '{}',
  }));
  assert.equal(res.status, 403);
});

test('rejects unconfigured webhook without sending messages', async () => {
  calls.length = 0;
  const res = await hook({ webhookSecret: '' })(new Request('https://worker.example/telegram-webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ update_id: 2 }),
  }));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test('/start sends welcome to the user only', async () => {
  calls.length = 0;
  const res = await hook()(update(msg('/start')));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.chat_id, 222);
  assert.match(calls[0].body.text, /مُنجز أكاديمي/);
});

test('plain message forwards to admin and confirms receipt', async () => {
  calls.length = 0;
  const res = await hook()(update(msg('أريد تدقيقًا لغويًا')));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.chat_id, '111');
  assert.match(calls[0].body.text, /ali_q/);
  assert.match(calls[0].body.text, /أريد تدقيقًا لغويًا/);
  assert.equal(calls[1].body.chat_id, 222);
  assert.match(calls[1].body.text, /تم إيصال رسالتك/);
});

test('malformed body is rejected, non-message updates are acked', async () => {
  const bad = await hook()(new Request('https://worker.example/telegram-webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': 's3cr3t' }, body: 'not-json',
  }));
  assert.equal(bad.status, 400);
  calls.length = 0;
  const ack = await hook()(update(undefined));
  assert.equal(ack.status, 200);
  assert.equal(calls.length, 0);
});

test('Telegram rejection never triggers a false receipt', async () => {
 const attempted = [];
 const handler = createTelegramWebhook({ ...base, fetchImpl: async (url, init) => {
  attempted.push(JSON.parse(init.body));
  return Response.json({ ok: false, description: 'provider rejected' }, { status: 400 });
 } });
 assert.equal((await handler(update(msg('طلب اختبار')))).status, 503);
 assert.equal(attempted.length, 1);
 assert.equal(attempted[0].chat_id, base.adminChatId);
});
test('messages remain plain text and a duplicate confirmed update is not resent', async () => {
 const attempted = [];
 const handler = createTelegramWebhook({ ...base, fetchImpl: async (url, init) => {
  attempted.push(JSON.parse(init.body));
  return Response.json({ ok: true, result: { message_id: attempted.length } });
 } });
 const message = msg('<b>نص مستخدم & بيانات</b>');
 assert.equal((await handler(update(message))).status, 200);
 assert.equal((await handler(update(message))).status, 200);
 assert.equal(attempted.length, 2);
 assert.equal(attempted[0].parse_mode, undefined);
 assert.match(attempted[0].text, /<b>نص مستخدم & بيانات<\/b>/);
});
test('failed receipt retries without forwarding confirmed content twice', async () => {
 const attempted = [];
 const handler = createTelegramWebhook({ ...base, fetchImpl: async (url, init) => {
  const body = JSON.parse(init.body); attempted.push(body);
  if (attempted.length === 2) return Response.json({ ok: false }, { status: 429 });
  return Response.json({ ok: true, result: { message_id: attempted.length } });
 } });
 assert.equal((await handler(update(msg('طلب اختبار')))).status, 503);
 assert.equal((await handler(update(msg('طلب اختبار')))).status, 200);
 assert.equal(attempted.filter(body => body.chat_id === base.adminChatId).length, 1);
});
test('long messages are delivered within Telegram text limits before receipt', async () => {
 const attempted = [];
 const handler = createTelegramWebhook({ ...base, fetchImpl: async (url, init) => {
  attempted.push(JSON.parse(init.body));
  return Response.json({ ok: true, result: { message_id: attempted.length } });
 } });
 assert.equal((await handler(update(msg('ع'.repeat(4096))))).status, 200);
 assert.equal(attempted.length, 3);
 assert(attempted.every(body => Array.from(body.text).length <= 4096));
});
