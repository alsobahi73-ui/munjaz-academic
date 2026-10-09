const assert = require('node:assert/strict');
global.window = { JSZip: require('../vendor/jszip/jszip.min.js') };
require('../quiz-export.js');
const { buildDocx } = window.MunjizQuizExport;
const questions = [
  { q: 'سؤال <script> & "العربية"\nسطر ثانٍ', opts: ['أول', 'ثانٍ', 'ثالث', 'رابع'], a: 2, exp: 'SECRET_EXPLANATION', source: 'SECRET_SOURCE' },
  { q: 'عبارة صح أو خطأ؟', opts: ['صح', 'خطأ'], a: 1, source: 'SECRET_SOURCE' },
];
(async () => {
  for (const includeAnswers of [false, true]) {
    const blob = await buildDocx(questions, { title: '<العنوان> & اختبار', teacher: 'مدرّس "تجريبي"', includeAnswers });
    assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const zip = await window.JSZip.loadAsync(await blob.arrayBuffer(), { checkCRC32: true });
    const xml = await zip.file('word/document.xml').async('string');
    assert.ok(xml.includes('&lt;script&gt; &amp; &quot;العربية&quot;'));
    assert.ok(xml.includes('&lt;العنوان&gt; &amp; اختبار'));
    assert.ok(xml.includes('<w:br/>'));
    assert.ok(xml.includes('<w:bidi/>'));
    assert.equal(xml.includes('SECRET_SOURCE'), false);
    assert.equal(xml.includes('SECRET_EXPLANATION'), false);
    assert.equal(xml.includes('مفتاح الإجابات'), includeAnswers);
    assert.equal(xml.includes('<w:br w:type="page"/>'), includeAnswers);
    if (includeAnswers) {
      assert.ok(xml.includes('1. ج) ثالث'));
      assert.ok(xml.includes('2. ب) خطأ'));
    }
  }
  for (const invalid of [[], [{ ...questions[0], a: 4 }], [{ ...questions[0], q: '' }], [{ ...questions[0], opts: ['متكرر', 'متكرر'] }]]) {
    await assert.rejects(() => buildDocx(invalid));
  }
  console.log('PASS: DOCX containers, RTL, XML escaping, separate keys, no source leakage and invalid edits.');
})().catch(error => { console.error(error); process.exitCode = 1; });
