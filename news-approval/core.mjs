export function normalizeNews(item) {
  if (!item || item.type !== 'unofficial') throw new Error('invalid_news');
  const result = { type: 'unofficial' };
  for (const [key, max] of Object.entries({ title: 300, summary: 1000, source: 200, date: 100, category: 100, url: 2000 })) {
    if (typeof item[key] !== 'string' || (key !== 'summary' && !item[key].trim()) || item[key].length > max) throw new Error('invalid_news');
    result[key] = item[key].trim();
  }
  for (const key of ['source_id', 'collected_at']) {
    if (typeof item[key] === 'string' && item[key].length <= 200) result[key] = item[key];
  }
  const url = new URL(result.url);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid_url');
  if (result.title.includes('تجريبي:')) throw new Error('test_news_not_allowed');
  return result;
}
export async function newsId(item) {
  const bytes = new TextEncoder().encode(`${item.url}\n${item.title}`);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
export function channelText(item) {
  return `📰 ${item.title}\n${item.summary.replace(/\s+/gu, ' ').trim()}\nالمصدر: ${item.source} | ${item.date}\n🔗 ${item.url}`;
}
export function authorizedCallback(query, env, record) {
  return Boolean(query && !query.from?.is_bot && String(query.from?.id) === String(env.TELEGRAM_OWNER_ID)
    && query.message?.chat?.type === 'private'
    && String(query.message.chat.id) === String(env.TELEGRAM_REVIEW_CHAT_ID)
    && record?.reviewMessageId === query.message.message_id);
}
export async function applyDecision(record, decision, { save, send, sync }) {
  if (record.status === 'ignored' || record.status === 'published') return record;
  if (record.decision && record.decision !== decision) throw new Error('decision_conflict');
  if (!record.decision) {
    record.decision = decision;
    record.decidedAt = new Date().toISOString();
    record.status = decision === 'ignore' ? 'ignored_pending_sync' : 'approved';
    await save(record);
  }
  if (decision === 'publish' && !record.channelMessageId) {
    // A persisted in-flight marker prevents duplicate sends after timeout/crash.
    if (record.status === 'sending' || record.status === 'delivery_uncertain') throw new Error('delivery_uncertain');
    record.status = 'sending'; await save(record);
    try {
      record.channelMessageId = await send(record.item);
    } catch (error) {
      record.status = error.message === 'telegram_rejected' ? 'approved' : 'delivery_uncertain';
      await save(record); throw error;
    }
    record.status = 'published_pending_sync'; await save(record);
  }
  await sync(record);
  record.status = decision === 'publish' ? 'published' : 'ignored';
  await save(record);
  return record;
}
export async function updateFiles(files, record) {
  const id = record.id;
  const matches = async item => await newsId(item) === id;
  const without = async items => {
    const flags = await Promise.all(items.map(matches));
    return items.filter((_, index) => !flags[index]);
  };
  const next = { ...files, 'news_queue.json': await without(files['news_queue.json']) };
  const archive = record.decision === 'publish' ? 'published.json' : 'ignored.json';
  const entry = { ...record.item, id, decided_at: record.decidedAt, ...(record.decision === 'publish'
    ? { published_at: record.decidedAt, telegram_message_id: record.channelMessageId }
    : { ignored_at: record.decidedAt }) };
  next[archive] = [...await without(files[archive]), entry];
  if (record.decision === 'publish') {
    const { title, url, source, date, summary, category } = record.item;
    next['news.json'] = [...await without(files['news.json']), { title, url, source, date, summary, category }];
  }
  return next;
}
