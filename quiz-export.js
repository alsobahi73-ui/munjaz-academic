/* Editable Arabic DOCX exports, generated locally. Student copies never serialize keys or sources. */
(() => {
  'use strict';
  const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const labels = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];
  const xml = text => String(text).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  function snapshot(questions) {
    if (!Array.isArray(questions) || !questions.length || questions.length > 50) throw new Error('جهّز اختباراً من 1 إلى 50 سؤالاً قبل التنزيل.');
    return questions.map(item => {
      if (typeof item.q !== 'string' || !item.q.trim() || item.q.length > 1600
        || !Array.isArray(item.opts) || item.opts.length < 2 || item.opts.length > 8
        || item.opts.some(option => typeof option !== 'string' || !option.trim() || option.length > 800)
        || new Set(item.opts.map(option => option.trim().toLowerCase())).size !== item.opts.length
        || !Number.isInteger(item.a) || item.a < 0 || item.a >= item.opts.length) {
        throw new Error('أكمل الأسئلة والخيارات، وتجنب الخيارات المتكررة، وحدّد مفتاحاً صحيحاً قبل التنزيل.');
      }
      return { q: item.q.trim(), opts: item.opts.map(option => option.trim()), a: item.a };
    });
  }
  const run = (text, bold = false, color = '17302E', size = 24) => '<w:r><w:rPr>'
    + '<w:rFonts w:ascii="Tajawal" w:hAnsi="Tajawal" w:cs="Tajawal"/>'
    + `<w:rtl/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/>`
    + (bold ? '<w:b/><w:bCs/>' : '') + '</w:rPr>'
    + String(text).split(/\r?\n/).map(line => `<w:t xml:space="preserve">${xml(line)}</w:t>`).join('<w:br/>') + '</w:r>';
  const paragraph = (text, { bold = false, color = '17302E', size = 24, center = false, keepNext = false } = {}) => '<w:p><w:pPr>'
    + `<w:bidi/><w:jc w:val="${center ? 'center' : 'right'}"/><w:spacing w:after="120"/>`
    + (keepNext ? '<w:keepNext/>' : '') + '</w:pPr>' + run(text, bold, color, size) + '</w:p>';
  function documentXml(items, { title, teacher, includeAnswers }) {
    const parts = [paragraph('مُنجز أكاديمي', { bold: true, color: '0A4F4B', center: true, size: 32 }),
      paragraph(title, { bold: true, center: true, size: 30 }),
      paragraph('نسخة الأسئلة — اختيار من متعدد / صح وخطأ', { center: true }),
      ...(teacher ? [paragraph(`المدرّس: ${teacher}`)] : []),
      paragraph('اسم الطالب: ____________________    الشعبة: __________    التاريخ: __________'),
      paragraph(`عدد الأسئلة: ${items.length}. اختر إجابة واحدة لكل سؤال.`)];
    items.forEach((item, index) => {
      parts.push(paragraph(`${index + 1}. ${item.q}`, { bold: true, keepNext: true }));
      item.opts.forEach((option, i) => parts.push(paragraph(`${labels[i]}) ${option}`, { keepNext: i < item.opts.length - 1 })));
      parts.push(paragraph(''));
    });
    if (includeAnswers) {
      parts.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
        paragraph('مفتاح الإجابات — نسخة المدرّس', { bold: true, center: true, color: '0A4F4B', size: 30 }),
        paragraph('افصل هذه الصفحة قبل توزيع الاختبار على الطلاب.'));
      items.forEach((item, index) => parts.push(paragraph(`${index + 1}. ${labels[item.a]}) ${item.opts[item.a]}`)));
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
      + parts.join('') + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
      + '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567"/><w:bidi/></w:sectPr></w:body></w:document>';
  }
  let libraryPromise;
  function loadZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'vendor/jszip/jszip.min.js';
      script.onload = () => {
        if (window.JSZip) resolve(window.JSZip);
        else { libraryPromise = null; script.remove(); reject(new Error('تعذّر تهيئة تصدير Word؛ أعد المحاولة.')); }
      };
      script.onerror = () => { libraryPromise = null; script.remove(); reject(new Error('تعذّر تحميل أداة Word المحلية. تأكد من وجود مجلد vendor ثم أعد المحاولة.')); };
      document.head.append(script);
    });
    return libraryPromise;
  }
  async function buildDocx(questions, options = {}) {
    const items = snapshot(questions);
    const settings = {
      title: String(options.title || 'اختبار أكاديمي').slice(0, 120),
      teacher: String(options.teacher || '').slice(0, 120),
      includeAnswers: options.includeAnswers === true,
    };
    const Zip = await loadZip();
    const zip = new Zip();
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
      + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
      + '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
      + '</Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>');
    zip.file('word/document.xml', documentXml(items, settings));
    zip.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8"?>'
      + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults>'
      + '<w:rPrDefault><w:rPr><w:rFonts w:ascii="Tajawal" w:hAnsi="Tajawal" w:cs="Tajawal"/><w:lang w:val="ar-IQ" w:bidi="ar-IQ"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault>'
      + '<w:pPrDefault><w:pPr><w:bidi/><w:jc w:val="right"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>');
    zip.file('word/settings.xml', '<?xml version="1.0" encoding="UTF-8"?>'
      + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>');
    return zip.generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' });
  }
  window.MunjizQuizExport = Object.freeze({ buildDocx });
})();
