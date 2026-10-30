import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishOfficial, atomicWrite, telegramText, valid } from '../publish-official.mjs';
const item = { type: 'official', title: 'عنوان تجريبي للاختبار فقط', url: 'https://example.org/test', source: 'مصدر اختبار', date: '2026-10-10', summary: 'السطر الأول\nالسطر الثاني', category: 'research' };
async function fixture(t, queue = [item]) {
  const root = await mkdtemp(join(tmpdir(), 'official-publisher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await atomicWrite(join(root, 'news_queue.json'), queue);
  return { root, token: 'TEST_ONLY', channel: 'TEST_CHANNEL', fetchImpl: async () => Response.json({ ok: true, result: { message_id: 1 } }) };
}
const read = async (root, file) => JSON.parse(await readFile(join(root, file + '.json'), 'utf8'));
test('publishes exact fields and Arabic message; skips unofficial and deduplicates reruns', async t => {
  const opts = await fixture(t, [item, item, { ...item, type: 'unofficial' }]);
  let calls = 0;
  opts.fetchImpl = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.telegram.org/botTEST_ONLY/sendMessage');
    const payload = JSON.parse(options.body);
    assert.equal(payload.text, telegramText(item));
    assert.equal(payload.chat_id, 'TEST_CHANNEL');
    assert.equal(payload.parse_mode, undefined);
    assert.ok(payload.text.includes('السطر الأول السطر الثاني'));
    return Response.json({ ok: true, result: { message_id: 12 } });
  };
  await publishOfficial(opts);
  assert.equal(calls, 1);
  assert.deepEqual(await read(opts.root, 'news'), [Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'type'))]);
  assert.equal((await read(opts.root, 'news_queue'))[0].type, 'unofficial');
  assert.ok((await read(opts.root, 'published'))[0].published_at);
  await atomicWrite(join(opts.root, 'news_queue.json'), [item]);
  await publishOfficial(opts);
  assert.equal(calls, 1);
  assert.deepEqual(await read(opts.root, 'news_queue'), []);
});
test('Telegram rejection retains queue, updates site, backs off, then retries only Telegram', async t => {
  const opts = await fixture(t);
  const success = opts.fetchImpl;
  opts.fetchImpl = async () => Response.json({ ok: false }, { status: 429 });
  assert.equal((await publishOfficial(opts)).pending, 1);
  assert.equal((await read(opts.root, 'news')).length, 1);
  assert.equal((await read(opts.root, 'news_queue')).length, 1);
  // Immediate retry is backed off (no Telegram call, item still pending).
  opts.fetchImpl = success;
  const backed = await publishOfficial(opts);
  assert.equal(backed.backedOff, 1);
  assert.equal((await read(opts.root, 'news_queue')).length, 1);
  // After the backoff window, the retry succeeds and sends Telegram only.
  opts.now = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();
  await publishOfficial(opts);
  assert.equal((await read(opts.root, 'news')).length, 1);
  assert.deepEqual(await read(opts.root, 'news_queue'), []);
});
test('website write failure does not block Telegram; retry does not resend', async t => {
  const opts = await fixture(t);
  let calls = 0;
  const success = opts.fetchImpl;
  opts.fetchImpl = async (...args) => { calls++; return success(...args); };
  opts.write = async (path, value) => {
    if (path.endsWith('/news.json')) throw Error('Disk failure');
    return atomicWrite(path, value);
  };
  assert.equal((await publishOfficial(opts)).pending, 1);
  assert.ok((await read(opts.root, 'published'))[0].telegram_published_at);
  opts.write = atomicWrite;
  await publishOfficial(opts);
  assert.equal(calls, 1);
  assert.equal((await read(opts.root, 'news')).length, 1);
});
test('corrupt website data still allows Telegram; corrupt queue fails safely', async t => {
  const opts = await fixture(t);
  await writeFile(join(opts.root, 'news.json'), '{broken');
  assert.equal((await publishOfficial(opts)).pending, 1);
  assert.ok((await read(opts.root, 'published'))[0].telegram_published_at);
  await writeFile(join(opts.root, 'news_queue.json'), '{broken');
  await assert.rejects(publishOfficial(opts), /Invalid publication data/);
});
test('valid() requires https and rejects test-marked titles', () => {
  assert.equal(valid(item), true);
  assert.equal(valid({ ...item, url: 'http://example.org/test' }), false);
  assert.equal(valid({ ...item, title: 'تجريبي: خبر للاختبار' }), false);
});
test('missing credentials, invalid entries and transport errors remain pending', async t => {
  const opts = await fixture(t, [item, { ...item, url: 'javascript:alert(1)' }]);
  opts.token = '';
  assert.deepEqual(await publishOfficial(opts), { completed: 0, pending: 1, invalid: 1, backedOff: 0, telegramFailedNow: 1, websitePending: 0 });
  opts.token = 'TEST_ONLY';
  opts.fetchImpl = async () => { throw Error('Do not expose provider URL'); };
  assert.equal((await publishOfficial(opts)).pending, 1);
  assert.equal((await read(opts.root, 'news_queue')).length, 2);
});
