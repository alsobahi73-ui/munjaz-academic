const assert = require('node:assert/strict');
global.window = {};
require('../services-catalog.js'); require('../service-assistant.js');
const { items, categories, requestUrl } = window.MunjizAcademicServices;
const { recommend, routes } = window.MunjizServiceAssistant;
assert.equal(items.length, 15); assert.equal(new Set(items.map(item => item.id)).size, 15);
assert.deepEqual(categories.map(category => items.filter(item => item.category === category.id).length), [4, 5, 6]);
const expected = [
  'إعداد التقارير والسمنرات', 'بحوث التخرج', 'تصميم البوسترات العلمية', 'كتابة السيرة الذاتية',
  'تقليل الاستلال الإلكتروني', 'المساعدة في إكمال الرسائل والأطاريح', 'كتابة ونشر البحوث العلمية',
  'توفير مجلات محلية وعالمية للنشر', 'تنضيد الرسائل والأطاريح', 'كتابة البحوث ونشرها',
  'تأليف الكتب', 'كتابة الدراسات المجتمعية', 'خدمات الترقية العلمية', 'النتائج وتفسيرها', 'التدقيق اللغوي والعلمي',
];
assert.deepEqual(items.map(item => item.title), expected);
assert.ok(items.every(item => item.paid && !('price' in item)));
const mapped = [];
for (const [category, goals] of Object.entries(routes)) for (const goal of goals) for (const need of goal.services) {
  assert.equal(recommend({ category, goal: goal.id, need }), need); mapped.push(need);
}
assert.deepEqual([...mapped].sort(), items.map(item => item.id).sort());
for (const item of items) {
  const url = new URL(requestUrl(item.id));
  assert.equal(url.origin, 'https://wa.me'); assert.equal(url.pathname, '/9647819934210');
  assert.ok(url.searchParams.get('text').includes(`الخدمة المطلوبة: ${item.title}`));
  assert.ok(url.searchParams.get('text').includes(categories.find(category => category.id === item.category).title));
}
assert.throws(() => requestUrl('unapproved-service'));
for (const invalid of [{}, { category: 'undergrad', goal: 'design', need: 'academic-books' }]) assert.throws(() => recommend(invalid));
console.log('PASS: exact approved 15 services, 4/5/6 categories, paid flags without prices, all routes and direct WhatsApp messages.');
