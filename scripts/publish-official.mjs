import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const identity = item => createHash('sha256').update(JSON.stringify([item.url, item.title])).digest('hex');
const fields = ['title', 'url', 'source', 'date', 'summary', 'category'];
const publicItem = item => Object.fromEntries(fields.map(key => [key, item[key]]));
export function valid(item) {
  if (!item || !fields.every(key => typeof item[key] === 'string') ||
      !['title', 'url', 'source', 'date', 'category'].every(key => item[key].trim())) return false;
  try { return ['https:', 'http:'].includes(new URL(item.url).protocol); } catch { return false; }
}
async function readArray(path) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (!Array.isArray(value)) throw Error('Expected array');
    return value;
  } catch (error) { if (error.code === 'ENOENT') return []; throw Error('Invalid publication data'); }
}
export async function atomicWrite(path, value) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await rename(temporary, path);
}
export function telegramText(item) {
  return `📰 ${item.title}\n${item.summary.replace(/\s+/gu, ' ').trim()}\nالمصدر: ${item.source} | ${item.date}\n🔗 ${item.url}`;
}
export async function publishOfficial({ root = process.cwd(), token = process.env.TELEGRAM_BOT_TOKEN,
  channel = process.env.TELEGRAM_CHANNEL_ID, fetchImpl = fetch, write = atomicWrite,
  now = () => new Date().toISOString() } = {}) {
  const paths = Object.fromEntries(['news_queue', 'news', 'published'].map(name => [name, resolve(root, `${name}.json`)]));
  const queue = await readArray(paths.news_queue);
  let news;
  let websiteReadable = true;
  try { news = await readArray(paths.news); } catch { websiteReadable = false; }
  const published = await readArray(paths.published);
  const remaining = [];
  const result = { completed: 0, pending: 0, invalid: 0 };
  for (const item of queue) {
    if (item?.type !== 'official') { remaining.push(item); continue; }
    if (!valid(item)) { remaining.push(item); result.invalid++; continue; }
    const id = identity(item);
    let record = published.find(entry => entry.id === id);
    if (!record) { record = { ...publicItem(item), type: 'official', id }; published.push(record); }
    if (!record.website_published_at && websiteReadable) {
      try {
        if (!news.some(entry => identity(entry) === id)) {
          const updated = [...news, publicItem(item)];
          await write(paths.news, updated);
          news = updated;
        }
        record.website_published_at = now();
      } catch { /* Keep this destination pending; Telegram still runs. */ }
    }
    // Persist each confirmed destination immediately, before further external effects.
    await write(paths.published, published);
    if (!record.telegram_published_at && token && channel) {
      try {
        const text = telegramText(item);
        if ([...text].length > 4096) throw Error('Message too long');
        const response = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: channel, text }), signal: AbortSignal.timeout(20000),
        });
        const body = await response.json();
        if (!response.ok || body.ok !== true || !Number.isInteger(body.result?.message_id)) throw Error('Delivery failed');
        record.telegram_published_at = now();
        record.telegram_message_id = body.result.message_id;
      } catch { /* Never log exceptions: provider URLs can contain the token. */ }
    }
    if (record.website_published_at && record.telegram_published_at) {
      record.published_at ||= now();
      result.completed++;
    } else { remaining.push(item); result.pending++; }
    await write(paths.published, published);
  }
  await write(paths.news_queue, remaining);
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await publishOfficial();
    console.log(JSON.stringify(result));
    if (result.pending || result.invalid) process.exitCode = 1;
  } catch { console.error('Publisher could not safely read or persist its state.'); process.exitCode = 1; }
}
