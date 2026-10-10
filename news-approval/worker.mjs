import { normalizeNews, newsId, channelText, authorizedCallback, applyDecision } from './core.mjs';
import { GitHubStore } from './github.mjs';
const json = (value, status = 200) => Response.json(value, { status });
const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_REVIEW_CHAT_ID', 'TELEGRAM_OWNER_ID', 'TELEGRAM_CHANNEL_ID', 'TELEGRAM_WEBHOOK_SECRET', 'APPROVAL_ADMIN_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY'];
async function secureEqual(a, b) {
  if (!a || !b) return false;
  const hash = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [x, y] = await Promise.all([hash(a), hash(b)]);
  let diff = 0; const bytes = new Uint8Array(y);
  new Uint8Array(x).forEach((byte, i) => { diff |= byte ^ bytes[i]; });
  return diff === 0;
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (!required.every(key => env[key])) return json({ error: 'configuration_required' }, 503);
    if (path === '/healthz') return json({ ok: true });
    if (request.method !== 'POST' || !['/webhook', '/sync', '/manual', '/status'].includes(path)) return json({ error: 'not_found' }, 404);
    const allowed = path === '/webhook'
      ? await secureEqual(request.headers.get('X-Telegram-Bot-Api-Secret-Token'), env.TELEGRAM_WEBHOOK_SECRET)
      : await secureEqual(request.headers.get('Authorization'), `Bearer ${env.APPROVAL_ADMIN_SECRET}`);
    if (!allowed) return json({ error: 'forbidden' }, 403);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 16000) return json({ error: 'too_large' }, 413);
    try { JSON.parse(text || '{}'); } catch { return json({ error: 'invalid_json' }, 400); }
    return env.APPROVAL.get(env.APPROVAL.idFromName('owner-review')).fetch(new Request(`https://approval.internal${path}`, { method: 'POST', body: text || '{}' }));
  },
  async scheduled(_event, env) {
    if (!required.every(key => env[key])) throw new Error('configuration_required');
    const response = await env.APPROVAL.get(env.APPROVAL.idFromName('owner-review')).fetch('https://approval.internal/sync', { method: 'POST', body: '{}' });
    if (!response.ok) throw new Error('approval_sync_failed');
  },
};
export class ApprovalQueue {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.tail = Promise.resolve(); this.github = new GitHubStore(env); }
  serialize(operation) {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => {});
    return result;
  }
  async telegram(method, body) {
    let response, data;
    try {
      response = await fetch(`https://api.telegram.org/bot${this.env.TELEGRAM_BOT_TOKEN}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
      });
      data = await response.json();
    } catch { throw new Error('delivery_uncertain'); }
    if (data.ok === false) throw new Error('telegram_rejected');
    if (!response.ok || data.ok !== true) throw new Error('delivery_uncertain');
    return data.result;
  }
  async save(record) { await this.ctx.storage.put(`item:${record.id}`, record); }
  async decide(record, decision) {
    if (!['publish', 'ignore'].includes(decision)) throw new Error('invalid_decision');
    await this.ctx.storage.setAlarm(Date.now() + 60000);
    return applyDecision(record, decision, {
      save: value => this.save(value), sync: value => this.github.sync(value),
      send: async item => {
        const result = await this.telegram('sendMessage', { chat_id: this.env.TELEGRAM_CHANNEL_ID, text: channelText(item), link_preview_options: { is_disabled: true } });
        if (!Number.isInteger(result?.message_id)) throw new Error('delivery_uncertain');
        return result.message_id;
      },
    });
  }
  async sync() {
    let failed = 0, attention = 0;
    const records = await this.ctx.storage.list({ prefix: 'item:' });
    for (const record of records.values()) {
      if (['sending', 'delivery_uncertain', 'review_sending', 'review_uncertain'].includes(record.status)) attention++;
    }
    let resumed = 0;
    for (const record of records.values()) {
      if (['approved', 'published_pending_sync', 'ignored_pending_sync'].includes(record.status)) {
        if (resumed >= 1) break;
        resumed++;
        try { await this.decide(record, record.decision); } catch { failed++; }
      }
    }
    const { files } = await this.github.snapshot();
    const archived = new Set();
    for (const item of [...files['published.json'], ...files['ignored.json']]) archived.add(await newsId(item));
    // Limit each dispatch to keep within free-tier invocation/subrequest limits.
    let sent = 0;
    for (const raw of files['news_queue.json']) {
      if (raw?.type !== 'unofficial') continue;
      try {
        const item = normalizeNews(raw), id = await newsId(item);
        if (archived.has(id)) continue;
        let record = await this.ctx.storage.get(`item:${id}`);
        if (record && record.status !== 'review_rejected') continue;
        if (sent >= 2) break;
        sent++;
        record = { id, item, status: 'review_sending' }; await this.save(record);
        try {
          const message = await this.telegram('sendMessage', {
            chat_id: this.env.TELEGRAM_REVIEW_CHAT_ID,
            text: `${item.title}\n${item.summary}\nالمصدر: ${item.source} | ${item.date}\n${item.url}\nمعرّف المراجعة: ${id}`,
            link_preview_options: { is_disabled: true },
            reply_markup: { inline_keyboard: [[{ text: '✅ انشر', callback_data: `publish:${id}` }, { text: '❌ تجاهل', callback_data: `ignore:${id}` }]] },
          });
          if (!Number.isInteger(message?.message_id)) throw new Error('delivery_uncertain');
          record.reviewMessageId = message.message_id; record.status = 'pending'; await this.save(record);
        } catch (error) {
          record.status = error.message === 'telegram_rejected' ? 'review_rejected' : 'review_uncertain';
          await this.save(record); failed++;
        }
      } catch { failed++; }
    }
    return json({ sent, failed, attention }, failed || attention ? 503 : 200);
  }
  fetch(request) {
    return this.serialize(async () => {
      try {
        const path = new URL(request.url).pathname;
        if (path === '/sync') return await this.sync();
        const body = await request.json();
        if (path === '/status') {
          const records = await this.ctx.storage.list({ prefix: 'item:' });
          return json([...records.values()].map(({ id, status, reviewMessageId, channelMessageId }) => ({ id, status, reviewMessageId, channelMessageId })));
        }
        if (path === '/manual') {
          const record = await this.ctx.storage.get(`item:${body.id}`);
          if (!record) return json({ error: 'unknown_item' }, 404);
          // Manual forwarding: persist an actual, owner-verified channel message ID;
          // never forward again through the bot when a manual send already happened.
          if (body.channelMessageId !== undefined) {
            if (body.decision !== 'publish' || !Number.isInteger(body.channelMessageId) || body.channelMessageId <= 0 || record.decision === 'ignore' || record.status === 'ignored') return json({ error: 'invalid_resolution' }, 409);
            if (record.channelMessageId && record.channelMessageId !== body.channelMessageId) return json({ error: 'message_conflict' }, 409);
            record.channelMessageId = body.channelMessageId; await this.save(record);
          }
          await this.decide(record, body.decision);
          return json({ status: record.status });
        }
        const query = body.callback_query;
        if (!query) return json({ ok: true });
        const match = /^(publish|ignore):([a-f0-9]{32})$/.exec(query.data || '');
        if (!match) return json({ error: 'invalid_callback' }, 400);
        const record = await this.ctx.storage.get(`item:${match[2]}`);
        if (!authorizedCallback(query, this.env, record)) return json({ error: 'forbidden' }, 403);
        // Acknowledge promptly; failures remain visible through /status and retries.
        await this.telegram('answerCallbackQuery', { callback_query_id: query.id, text: 'تم استلام القرار' });
        await this.decide(record, match[1]);
        try {
          await this.telegram('editMessageReplyMarkup', { chat_id: this.env.TELEGRAM_REVIEW_CHAT_ID, message_id: record.reviewMessageId, reply_markup: { inline_keyboard: [] } });
        } catch { /* Persisted terminal decision still rejects duplicates. */ }
        return json({ ok: true });
      } catch (error) {
        const safe = ['delivery_uncertain', 'telegram_rejected', 'decision_conflict', 'invalid_decision'];
        return json({ error: safe.includes(error.message) ? error.message : 'operation_failed' }, 503);
      }
    });
  }
  alarm() {
    return this.serialize(async () => {
      const records = await this.ctx.storage.list({ prefix: 'item:' });
      let retry = false, resumed = 0;
      for (const record of records.values()) {
        if (['approved', 'published_pending_sync', 'ignored_pending_sync'].includes(record.status)) {
          if (resumed >= 1) { retry = true; continue; }
          resumed++;
          try { await this.decide(record, record.decision); } catch { retry = true; }
        }
      }
      if (retry) await this.ctx.storage.setAlarm(Date.now() + 300000);
      else await this.ctx.storage.deleteAlarm();
    });
  }
}
