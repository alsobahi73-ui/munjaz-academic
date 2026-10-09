const assert = require('node:assert/strict');
global.window = {};
require('../quiz-core.js');
const { generate, prepare } = window.MunjizQuiz;
const text = Array.from({ length: 60 }, (_, i) => `Scientific observation number ${i + 1} requires systematic measurements and documented evidence from independent experiments.`).join('\n');
assert.equal(prepare(text).length, 60);
for (const type of ['mcq', 'tf', 'mixed']) {
  const questions = generate(text, 50, type);
  assert.equal(questions.length, 50);
  assert.equal(new Set(questions.map(q => q.source)).size, 50);
  for (const q of questions) {
    assert.ok(text.includes(q.source));
    assert.ok(q.a >= 0 && q.a < q.opts.length);
    assert.equal(new Set(q.opts).size, q.opts.length);
    if (type === 'mcq' || q.opts.length === 4) {
      assert.equal(q.opts.length, 4);
      assert.ok(q.source.includes(q.opts[q.a]));
      assert.ok(q.q.includes('______'));
    } else {
      assert.equal(q.opts.length, 2);
      const statement = q.q.match(/«(.*)»/u)[1];
      assert.equal(statement === q.source, q.a === 0);
    }
  }
}
for (const count of [0, 51, 1.5, NaN]) assert.throws(() => generate(text, count, 'mixed'));
assert.throws(() => generate('عنوان فقط', 10, 'mixed'), /0 سؤال/);
assert.throws(() => generate(text, 5, 'invalid'));
assert.throws(() => generate('a'.repeat(200001), 1, 'mixed'));
assert.equal(prepare(text + '\n' + text).length, 60);
const arabic = 'الطاقة الشمسية تساعد النباتات على إنتاج الغذاء خلال عملية البناء الضوئي.\nتنتقل المعلومات الوراثية بين الأجيال بواسطة الجينات الموجودة داخل الخلايا.';
assert.equal(generate(arabic, 2, 'mixed').length, 2);
console.log('PASS: exact counts, types, source-grounded keys, deduplication, Arabic, and invalid inputs.');
