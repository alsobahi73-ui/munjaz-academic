import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNews, newsId, channelText, authorizedCallback, applyDecision, updateFiles } from '../core.mjs';
import worker, { ApprovalQueue } from '../worker.mjs';
import { GitHubStore } from '../github.mjs';
// Fixtures exist only inside tests, never in the public feed or collector queue.
const fixture = () => ({ type: 'unofficial', title: 'خبر اختبار داخلي', summary: 'ملخص للاختبار فقط', source: 'مصدر اختبار', date: '2026-10-11', category: 'researcher', url: 'https://example.org/news/1' });
const empty = () => Object.fromEntries(['news_queue.json','news.json','published.json','ignored.json'].map(path => [path, []]));
function harness() {
  const records = new Map(); let alarm;
  const storage = { async put(key, value) { records.set(key, structuredClone(value)); }, async get(key) { return structuredClone(records.get(key)); }, async list() { return new Map([...records].map(([key, value]) => [key, structuredClone(value)])); }, async setAlarm(value) { alarm = value; }, async deleteAlarm() { alarm = undefined; } };
  const env = { TELEGRAM_OWNER_ID: '7', TELEGRAM_REVIEW_CHAT_ID: '7', TELEGRAM_CHANNEL_ID: '@channel' };
  const queue = new ApprovalQueue({ storage }, env);
  const files = empty(); files['news_queue.json'] = [fixture()];
  queue.github = { async snapshot() { return { files: structuredClone(files) }; }, async sync(record) { Object.assign(files, await updateFiles(files, record)); } };
  const messages = [];
  queue.telegram = async (method, body) => { messages.push({ method, body }); return method === 'sendMessage' ? { message_id: messages.length } : true; };
  const request = (path, body = {}) => queue.fetch(new Request(`https://local${path}`, { method: 'POST', body: JSON.stringify(body) }));
  const callback = (id, decision = 'publish') => ({ callback_query: { id: 'callback', data: `${decision}:${id}`, from: { id: 7 }, message: { message_id: 1, chat: { id: 7, type: 'private' } } } });
  return { queue, records, files, messages, request, callback, env, storage };
}
test('review -> owner approval publishes formatted Telegram message and atomic website/archive update once', async () => {
  const h = harness(); assert.equal((await h.request('/sync')).status, 200);
  const id = await newsId(fixture());
  assert.deepEqual(h.messages[0].body.reply_markup.inline_keyboard[0].map(x => x.text), ['✅ انشر', '❌ تجاهل']);
  assert.equal(h.files['news.json'].length, 0);
  assert.equal((await h.request('/webhook', h.callback(id))).status, 200);
  assert.equal(h.files['news.json'][0].source, fixture().source);
  assert.equal(h.files['published.json'][0].telegram_message_id, 3);
  assert.equal(h.files['news_queue.json'].length, 0);
  assert.equal(h.messages.find(x => x.body.chat_id === '@channel').body.text, channelText(fixture()));
  await h.request('/webhook', h.callback(id));
  assert.equal(h.messages.filter(x => x.method === 'sendMessage' && x.body.chat_id === '@channel').length, 1);
});
test('ignore is permanent even when collector reintroduces the item and publish is clicked later', async () => {
  const h = harness(); await h.request('/sync'); const id = await newsId(fixture());
  await h.request('/webhook', h.callback(id, 'ignore'));
  assert.equal(h.files['ignored.json'].length, 1); assert.equal(h.files['news.json'].length, 0);
  h.files['news_queue.json'].push(fixture()); await h.request('/sync'); await h.request('/webhook', h.callback(id));
  assert.equal(h.messages.filter(x => x.method === 'sendMessage').length, 1);
  assert.equal(h.files['published.json'].length, 0);
});
test('callback rejects wrong owner, chat, private-chat type and message ID', async () => {
  const h = harness(); await h.request('/sync'); const id = await newsId(fixture());
  for (const change of [q => q.from.id = 8, q => q.message.chat.id = 8, q => q.message.chat.type = 'group', q => q.message.message_id = 44]) {
    const body = h.callback(id); change(body.callback_query);
    assert.equal((await h.request('/webhook', body)).status, 403);
  }
  assert.equal(h.files['news.json'].length, 0);
  assert.equal(authorizedCallback(null, h.env, {}), false);
});
test('GitHub failure is retried by alarm without sending channel twice', async () => {
  const h = harness(); await h.request('/sync'); const id = await newsId(fixture());
  const original = h.queue.github.sync; h.queue.github.sync = async () => { throw Error('github_403'); };
  assert.equal((await h.request('/webhook', h.callback(id))).status, 503);
  assert.equal(h.records.get(`item:${id}`).status, 'published_pending_sync');
  h.queue.github.sync = original; await h.queue.alarm();
  assert.equal(h.files['news.json'].length, 1);
  assert.equal(h.messages.filter(x => x.method === 'sendMessage' && x.body.chat_id === '@channel').length, 1);
});
test('uncertain send never retries; manual forwarded message completes website/archive only', async () => {
  const h = harness(); await h.request('/sync'); const id = await newsId(fixture());
  let calls = 0; h.queue.telegram = async method => { if (method === 'sendMessage') { calls++; throw Error('delivery_uncertain'); } return true; };
  await h.request('/webhook', h.callback(id)); await h.request('/webhook', h.callback(id)); await h.queue.alarm();
  assert.equal(calls, 1); assert.equal(h.files['news.json'].length, 0);
  assert.equal((await h.request('/manual', { id, decision: 'publish', channelMessageId: 99 })).status, 200);
  assert.equal(h.files['published.json'][0].telegram_message_id, 99); assert.equal(calls, 1);
});
test('explicit rejection can retry and a stored sending marker cannot resend after crash', async () => {
  const item = fixture(), record = { id: await newsId(item), item, status: 'pending' }; let calls = 0;
  const deps = { save: async () => {}, sync: async () => {}, send: async () => { calls++; throw Error('telegram_rejected'); } };
  await assert.rejects(applyDecision(record, 'publish', deps), /telegram_rejected/); assert.equal(record.status, 'approved');
  deps.send = async () => { calls++; return 8; }; await applyDecision(record, 'publish', deps); assert.equal(calls, 2);
  const crashed = { ...record, channelMessageId: undefined, status: 'sending' };
  await assert.rejects(applyDecision(crashed, 'publish', deps), /delivery_uncertain/); assert.equal(calls, 2);
});
test('concurrent publish/ignore decisions serialize and preserve first decision', async () => {
  const h = harness(); await h.request('/sync'); const id = await newsId(fixture());
  await Promise.all([h.request('/webhook', h.callback(id)), h.request('/webhook', h.callback(id, 'ignore'))]);
  assert.equal(h.files['published.json'].length, 1); assert.equal(h.files['ignored.json'].length, 0);
});
test('official items never enter review; malformed or unsafe news is rejected visibly', async () => {
  const h = harness(); h.files['news_queue.json'] = [{ ...fixture(), type: 'official' }, { ...fixture(), url: 'javascript:alert(1)' }];
  assert.equal((await h.request('/sync')).status, 503); assert.equal(h.messages.length, 0);
  assert.throws(() => normalizeNews({ ...fixture(), title: 'تجريبي: ممنوع' }));
});
test('webhook secret and admin authentication protect entry point', async () => {
  const env = Object.fromEntries(['TELEGRAM_BOT_TOKEN','TELEGRAM_REVIEW_CHAT_ID','TELEGRAM_OWNER_ID','TELEGRAM_CHANNEL_ID','TELEGRAM_WEBHOOK_SECRET','APPROVAL_ADMIN_SECRET','GITHUB_TOKEN','GITHUB_REPOSITORY'].map(key => [key, 'configured']));
  env.APPROVAL = { idFromName: () => 'id', get: () => ({ fetch: async () => Response.json({ok:true}) }) };
  const req = (path, headers = {}) => new Request(`https://worker${path}`, {method:'POST',headers,body:'{}'});
  assert.equal((await worker.fetch(req('/webhook'), env)).status, 403);
  assert.equal((await worker.fetch(req('/webhook',{'X-Telegram-Bot-Api-Secret-Token':'configured'}), env)).status, 200);
  assert.equal((await worker.fetch(req('/manual'), env)).status, 403);
  assert.equal((await worker.fetch(req('/status',{Authorization:'Bearer configured'}), env)).status, 200);
});
test('GitHub writes all news changes with one non-force branch update, rebasing after conflict', async () => {
  const store = new GitHubStore({GITHUB_BRANCH:'main'}), files = empty(); files['news_queue.json'] = [fixture()];
  let snapshots = 0; const calls=[];
  store.snapshot = async () => { snapshots++; return { sha:`head${snapshots}`,tree:'base',files }; };
  store.api = async (path, body, method) => { calls.push({path,body,method}); if(method === 'PATCH' && snapshots === 1) throw Error('github_422'); return {sha:'new'}; };
  await store.sync({id:await newsId(fixture()),item:fixture(),decision:'publish',decidedAt:'now',channelMessageId:9});
  assert.equal(snapshots,2);
  const tree=calls.find(x=>x.path==='git/trees'); assert.deepEqual(tree.body.tree.map(x=>x.path),['news_queue.json','news.json','published.json']);
  assert.equal(calls.at(-1).body.force,false); assert.deepEqual(calls.filter(x=>x.path==='git/commits').at(-1).body.parents,['head2']);
});

test('admin manual fallback records existing channel ID and never leaks provider token in errors', async () => {
  const { runAdmin } = await import('../admin.mjs');
  const env = { APPROVAL_WORKER_URL:'https://worker.example.org', APPROVAL_ADMIN_SECRET:'ADMIN_TEST', APPROVAL_ACTION:'publish', APPROVAL_ITEM_ID:'a'.repeat(32), APPROVAL_CHANNEL_MESSAGE_ID:'42' };
  let sent;
  const result = await runAdmin(env, async (url, options) => { sent={url,options};return Response.json({status:'published'}); });
  assert.equal(result.status,'published');assert.equal(new URL(sent.url).pathname,'/manual');assert.equal(JSON.parse(sent.options.body).channelMessageId,42);
  const token='FAKE_SENSITIVE_TEST';
  await assert.rejects(runAdmin({...env,APPROVAL_ACTION:'set-webhook',TELEGRAM_BOT_TOKEN:token,TELEGRAM_WEBHOOK_SECRET:'HOOK_TEST'},async()=>{throw Error(`https://api.telegram.org/bot${token}/setWebhook`);}), error=>!error.message.includes(token));
});
test('admin pauses sync/status cleanly when worker is not configured, while publish/ignore still fail loudly', async () => {
  const { runAdmin } = await import('../admin.mjs');
  for (const badEnv of [{ APPROVAL_ACTION: 'sync' }, { APPROVAL_ACTION: 'sync', APPROVAL_WORKER_URL: 'not-a-url', APPROVAL_ADMIN_SECRET: 's' }, { APPROVAL_ACTION: 'status', APPROVAL_WORKER_URL: 'https://worker.example.org' }]) {
    const paused = await runAdmin(badEnv, async () => { throw Error('must not fetch'); });
    assert.equal(paused.paused, true);
    assert.equal(paused.configured, false);
    assert.equal(paused.reviewed, 0);
    assert.equal(paused.published, 0);
  }
  for (const action of ['publish', 'ignore']) {
    await assert.rejects(runAdmin({ APPROVAL_ACTION: action, APPROVAL_ITEM_ID: 'a'.repeat(32) }), /عنوان العامل غير مضبوط/);
    await assert.rejects(runAdmin({ APPROVAL_ACTION: action, APPROVAL_WORKER_URL: 'http://insecure.example.org', APPROVAL_ADMIN_SECRET: 's', APPROVAL_ITEM_ID: 'a'.repeat(32) }), /يلزم عنوان HTTPS آمن للعامل/);
    await assert.rejects(runAdmin({ APPROVAL_ACTION: action, APPROVAL_WORKER_URL: 'https://worker.example.org', APPROVAL_ITEM_ID: 'a'.repeat(32) }), /سر الإدارة غير مضبوط/);
  }
});
test('admin pauses sync/status when the configured worker is unreachable, while manual decisions still fail loudly', async () => {
  const { runAdmin } = await import('../admin.mjs');
  const env = { APPROVAL_WORKER_URL: 'https://worker.example.org', APPROVAL_ADMIN_SECRET: 'ADMIN_TEST' };
  for (const action of ['sync', 'status']) {
    const thrown = await runAdmin({ ...env, APPROVAL_ACTION: action }, async () => { throw Error('fetch failed'); });
    assert.equal(thrown.ok, true);
    assert.equal(thrown.paused, true);
    assert.equal(thrown.configured, false);
    assert.equal(thrown.reviewed, 0);
    assert.equal(thrown.published, 0);
    assert.match(thrown.message, /غير قابل للوصول/);
    const bad = await runAdmin({ ...env, APPROVAL_ACTION: action }, async () => Response.json({ ok: false }, { status: 502 }));
    assert.equal(bad.paused, true);
    assert.equal(bad.configured, false);
  }
  await assert.rejects(
    runAdmin({ ...env, APPROVAL_ACTION: 'publish', APPROVAL_ITEM_ID: 'a'.repeat(32) }, async () => { throw Error('fetch failed'); }),
    /تعذّر الاتصال/
  );
});
test('collector empty summaries and metadata are supported without invented content', () => {
  const item=normalizeNews({...fixture(),summary:'',source_id:'source',collected_at:'2026-10-11'});
  assert.equal(item.summary,'');assert.equal(item.source_id,'source');assert.equal(item.collected_at,'2026-10-11');
});
test('archived ignored/published items never dispatch again after loss of local review records', async () => {
  for (const path of ['ignored.json','published.json']) {
    const h=harness();h.files[path]=[fixture()];
    assert.equal((await h.request('/sync')).status,200);assert.equal(h.messages.length,0);
  }
});
test('uncertain review is reported as attention rather than silent successful sync', async () => {
  const h=harness();h.queue.telegram=async()=>{throw Error('delivery_uncertain');};
  assert.equal((await h.request('/sync')).status,503);
  const response=await h.request('/sync');assert.equal(response.status,503);assert.equal((await response.json()).attention,1);
});
