import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
const script = await readFile(new URL('../news-feed.js', import.meta.url), 'utf8');
function element() { return { children: [], append(...nodes) { this.children.push(...nodes); } }; }
async function render(items, ok = true) {
 const list = element(), section = { hidden: true, querySelector: () => list };
 await runInNewContext(script, { document: { getElementById: () => section, createElement: element }, URL,
   fetch: async () => ({ ok, json: async () => items }) });
 return { list, section };
}
test('feed preserves headline text and attribution; rejects executable links', async () => {
 const headline = '<img src=x onerror=alert(1)> عنوان رسمي';
 const { list, section } = await render([
   { title: headline, url: 'https://example.org/news', source: 'مصدر الاختبار', date: '2026-10-10', summary: 'ملخص' },
   { title: 'مرفوض', source: 'اختبار', url: 'javascript:alert(1)' },
 ]);
 assert.equal(section.hidden, false);
 assert.equal(list.children.length, 1);
 const [link, summary, attribution] = list.children[0].children;
 assert.equal(link.textContent, headline);
 assert.equal(link.rel, 'noopener noreferrer');
 assert.equal(summary.textContent, 'ملخص');
 assert.equal(attribution.textContent, 'المصدر: مصدر الاختبار | 2026-10-10');
});
test('empty or unavailable feed stays hidden', async () => {
 for (const [items, ok] of [[[], true], [null, true], [[], false]]) {
   assert.equal((await render(items, ok)).section.hidden, true);
 }
});
