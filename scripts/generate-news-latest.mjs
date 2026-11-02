// يولّد news-latest.json (أحدث 60 خبرًا) من news.json المرتب من الأقدم إلى
// الأحدث (المجمّع والناشر يلحقان في آخر المصفوفة)، لذا فإن آخر 60 عنصرًا هي
// الأحدث، وتُحفظ بنفس ترتيب الملف لأن شريط الأخبار في الرئيسية يعكس الترتيب.
// يُستدعى يدويًا أو من الناشر الرسمي عند كل نشر، حتى لا يتقادم الموجز.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const LATEST_COUNT = 60;
export function latestItems(items) {
  if (!Array.isArray(items)) throw Error('news.json must be an array');
  return items.slice(-LATEST_COUNT);
}
if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const root = process.argv[2] || process.cwd();
  const items = JSON.parse(await readFile(resolve(root, 'news.json'), 'utf8'));
  const latest = latestItems(items);
  await writeFile(resolve(root, 'news-latest.json'), JSON.stringify(latest, null, 2) + '\n', 'utf8');
  console.log(`news-latest.json: ${latest.length} of ${items.length} items`);
}
