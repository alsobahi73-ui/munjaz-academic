/* Local, source-grounded reading exercises. No network or AI calls. */
(() => {
  'use strict';
  const MAX_TEXT = 200000;
  const MAX_FILE = 10 * 1024 * 1024;
  const stop = new Set(('في من إلى على عن مع هذا هذه ذلك تلك الذي التي هو هي هم كان كانت يكون تكون إن أن أو و لا ما كما لقد قد يتم حيث عند خلال بين بعد قبل كل ثم حتى أكثر فقط ضمن يمكن يجب النص البحث دراسة نفس مثال وفق ' +
    'the and that this with from into are was were have has not for can will which when where').split(' '));
  const normalize = s => s.normalize('NFKC').replace(/\p{M}/gu, '').toLowerCase();
  const words = s => [...s.matchAll(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:[-’'][\p{L}\p{N}\p{M}]+)*/gu)];
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  function prepare(text) {
    if (typeof text !== 'string' || text.length > MAX_TEXT) throw new Error('الحد الأقصى للنص 200,000 حرف.');
    const sentences = [...new Map(text.replace(/\r/g, '').split(/(?<=[.!؟?؛])(?:\s+|$)|\n+/u)
      .map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length <= 800 && words(s).length >= 6)
      .map(s => [normalize(s), s])).values()];
    const eligible = token => normalize(token).length >= 4 && !stop.has(normalize(token));
    const vocabulary = [...new Map(words(text).map(m => m[0]).filter(eligible).map(w => [normalize(w), w])).values()];
    const candidates = sentences.map(source => {
      const options = words(source).filter(m => eligible(m[0]));
      const token = options.sort((a, b) => b[0].length - a[0].length)[0];
      if (!token) return null;
      const distractors = vocabulary.filter(w => normalize(w) !== normalize(token[0]));
      return distractors.length >= 3 ? { source, token: token[0], index: token.index, distractors } : null;
    }).filter(Boolean);
    return candidates;
  }
  function generate(text, count, type) {
    if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('اختر عدداً صحيحاً بين 1 و50.');
    if (!['mixed', 'mcq', 'tf'].includes(type)) throw new Error('اختر نوع الأسئلة.');
    const candidates = prepare(text);
    if (candidates.length < count) throw new Error(`المحتوى يكفي لـ${candidates.length} سؤالاً مختلفاً فقط. خفّض العدد أو أضف جملاً علمية كاملة؛ لن نكرر الأسئلة للوصول إلى العدد.`);
    return shuffle(candidates).slice(0, count).map((c, i) => {
      const selected = type === 'mixed' ? (i % 2 ? 'tf' : 'mcq') : type;
      const alternatives = shuffle(c.distractors).slice(0, 3);
      if (selected === 'tf') {
        const truth = Math.random() >= 0.5;
        const statement = truth ? c.source : c.source.slice(0, c.index) + alternatives[0] + c.source.slice(c.index + c.token.length);
        return { q: `وفق النص، هل وردت العبارة بهذه الصياغة؟ «${statement}»`, opts: ['صح', 'خطأ'], a: truth ? 0 : 1,
          exp: `الصياغة الأصلية: ${c.source}`, source: c.source };
      }
      const opts = shuffle([c.token, ...alternatives]);
      const masked = c.source.slice(0, c.index) + '______' + c.source.slice(c.index + c.token.length);
      return { q: `أكمل المقطع كما ورد في النص: «${masked}»`, opts, a: opts.indexOf(c.token),
        exp: `الكلمة في النص: ${c.token}. المقطع الأصلي: ${c.source}`, source: c.source };
    });
  }
  // Reject huge/ZIP64/encrypted containers before DOCX decompression.
  function checkDocx(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer);
    if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('الملف ليس DOCX صالحاً.');
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error('ملف DOCX تالف أو غير مكتمل.');
    const entries = view.getUint16(end + 10, true);
    let offset = view.getUint32(end + 16, true), size = 0, hasDocument = false;
    if (entries > 2000 || offset === 0xffffffff) throw new Error('ملف DOCX أكبر من حدود القراءة المحلية.');
    for (let i = 0; i < entries; i++) {
      if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('بنية DOCX غير صالحة.');
      const inflated = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extra = view.getUint16(offset + 30, true), comment = view.getUint16(offset + 32, true);
      if (offset + 46 + nameLength + extra + comment > bytes.length || (view.getUint16(offset + 8, true) & 1)) throw new Error('ملف DOCX تالف أو مشفر.');
      size += inflated;
      const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      if (name === 'word/document.xml') {
        hasDocument = true;
        if (inflated > 5 * 1024 * 1024) throw new Error('نص DOCX أكبر من الحد المسموح.');
      }
      if (size > 30 * 1024 * 1024 || inflated === 0xffffffff) throw new Error('محتوى DOCX بعد فك الضغط أكبر من الحد المسموح.');
      offset += 46 + nameLength + extra + comment;
    }
    if (!hasDocument) throw new Error('الملف لا يحتوي مستند Word صالحاً.');
  }
  let mammothPromise;
  function loadMammoth() {
    if (!mammothPromise) mammothPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'vendor/mammoth/mammoth.browser.min.js';
      script.onload = () => resolve(window.mammoth);
      script.onerror = () => { mammothPromise = null; script.remove(); reject(new Error('تعذّر تحميل قارئ DOCX؛ أعد المحاولة.')); };
      document.head.append(script);
    });
    return mammothPromise;
  }
  async function extractFile(file, signal, progress = () => {}) {
    if (!file || !file.size || file.size > MAX_FILE) throw new Error('اختر ملفاً غير فارغ حتى 10 ميغابايت.');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'docx'].includes(extension)) throw new Error('الصيغ المدعومة: TXT وDOCX وPDF النصي.');
    const buffer = await file.arrayBuffer();
    signal?.throwIfAborted();
    let text;
    if (extension === 'txt') {
      const bytes = new Uint8Array(buffer);
      const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
      try { text = new TextDecoder(encoding, { fatal: true }).decode(bytes); }
      catch { throw new Error('احفظ ملف TXT بترميز UTF-8 ثم أعد المحاولة.'); }
      if (text.includes('\0')) throw new Error('الملف ليس نصاً صالحاً.');
    } else if (extension === 'docx') {
      checkDocx(buffer);
      const mammoth = await loadMammoth();
      signal?.throwIfAborted();
      text = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
    } else {
      if (!new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(5, buffer.byteLength))).startsWith('%PDF-')) throw new Error('الملف ليس PDF صالحاً.');
      const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
      const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false,
        cMapUrl: new URL('./vendor/pdfjs/cmaps/', document.baseURI).href, cMapPacked: true,
        standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', document.baseURI).href });
      const cancel = () => { task.destroy().catch(() => {}); };
      signal?.addEventListener('abort', cancel, { once: true });
      try {
        const pdf = await task.promise;
        if (pdf.numPages > 150) throw new Error('يدعم القارئ حتى 150 صفحة. قسّم الملف إلى محاضرات أصغر.');
        const chunks = []; let length = 0;
        for (let n = 1; n <= pdf.numPages; n++) {
          signal?.throwIfAborted();
          progress(`قراءة صفحة ${n} من ${pdf.numPages}…`);
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          const chunk = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
          length += chunk.length;
          if (length > MAX_TEXT) throw new Error('نص الملف يتجاوز 200,000 حرف. قسّم المحاضرة.');
          chunks.push(chunk); page.cleanup();
        }
        text = chunks.join('\n');
      } catch (error) {
        if (error.name === 'PasswordException') throw new Error('PDF محمي بكلمة مرور؛ افتح نسخة غير محمية ثم أعد رفعها.');
        if (error.name === 'InvalidPDFException') throw new Error('تعذّر قراءة PDF؛ تأكد من سلامة الملف.');
        throw error;
      } finally { signal?.removeEventListener('abort', cancel); await task.destroy(); }
    }
    signal?.throwIfAborted();
    text = text.trim();
    if (!text) throw new Error('لم يُستخرج نص. PDF المصوّر يحتاج OCR؛ استخدم نسخة نصية أو الصق النص.');
    if (text.length > MAX_TEXT) throw new Error('نص الملف يتجاوز 200,000 حرف. قسّم المحاضرة.');
    return text;
  }
  window.MunjizQuiz = Object.freeze({ generate, prepare, shuffle, extractFile, MAX_TEXT, MAX_FILE });
})();
