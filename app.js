/* =====================================================
   Munjaz Academic — app logic
   ===================================================== */
(() => {
  'use strict';

  /* ---------- الإعدادات: عدّل رقم واتساب الأعمال هنا ---------- */
  const CONFIG = {
    // الصيغة الدولية بدون + أو أصفار: مثال العراق 9647XXXXXXXXX
    WHATSAPP_NUMBER: '9647819934210',
    BRAND: 'مُنجز أكاديمي',
    /* التسجيل بالبريد الإلكتروني (اختياري):
       - اتركه null  => "ملف محلي" يُحفظ على جهاز الزائر فقط (بدون كلمة مرور ولا حساب سحابي).
       - للتسجيل الحقيقي: أنشئ مشروعاً في Firebase، فعّل Authentication > Email/Password،
         والصق إعدادات تطبيق الويب هنا، مثال:
         { apiKey: '...', authDomain: 'xxx.firebaseapp.com', projectId: 'xxx', appId: '...' } */
    FIREBASE: null,
  };

  const LS = {
    audience: 'munjaz.audience',
    promo: 'munjaz.promo',
    target: 'munjaz.promoTarget',
    charter: 'munjaz.charterAccepted',
    profile: 'munjaz.profile',
    references: 'munjaz.references',
    favorites: 'munjaz.toolFavorites',
    workflow: 'munjaz.researchWorkflow',
  };

  /* ---------- بيانات الفئات ---------- */
  const AUDIENCES = {
    all: {
      label: 'غير محدد',
      title: 'مرحباً بك في مُنجز أكاديمي',
      text: 'اختر فئتك من الأعلى لتظهر لك الخدمات المبوّبة الخاصة بها.',
      links: [['#services', 'اختر فئتك'], ['#tools', 'الأدوات المجانية']],
    },
    undergrad: {
      icon: '🎓',
      label: 'طالب دراسات أولية',
      title: 'خدمات وأدوات طلبة الدراسات الأولية',
      text: 'تنسيق التقارير وبحوث التخرج، ومراجعة لغوية، وتحسين العروض، مع حاسبة المعدل.',
      links: [['#services', 'خدمات فئتك'], ['#tool-gpa', 'حاسبة المعدل'], ['#tool-words', 'عداد الكلمات']],
    },
    grad: {
      icon: '📚',
      label: 'طالب دراسات عليا',
      title: 'خدمات وأدوات طلبة الدراسات العليا',
      text: 'إرشاد منهجي وإحصائي، تنسيق الرسائل والأطاريح، وتوثيق المراجع.',
      links: [['#services', 'خدمات فئتك'], ['#tool-sample', 'حجم العينة'], ['#tool-gpa', 'حاسبة المعدل'], ['#tool-words', 'عداد الكلمات']],
    },
    researcher: {
      icon: '🔬',
      label: 'باحث',
      title: 'خدمات وأدوات الباحثين',
      text: 'تدقيق المخطوطات، اختيار المجلات المناسبة، دعم إحصائي، وتنسيق للنشر.',
      links: [['#services', 'خدمات فئتك'], ['#tool-sample', 'حجم العينة'], ['#tool-words', 'عداد الكلمات'], ['#tool-promotion', 'حاسبة النقاط']],
    },
    faculty: {
      icon: '🏛️',
      label: 'تدريسي',
      title: 'خدمات وأدوات التدريسيين',
      text: 'تنظيم ملف الترقية العلمية، دعم النشر، وإرشاد الإشراف الأكاديمي.',
      links: [['#services', 'خدمات فئتك'], ['#tool-promotion', 'حاسبة الترقية'], ['#tool-sample', 'حجم العينة'], ['#tool-words', 'عداد الكلمات']],
    },
  };

  const AUD_KEYS = ['undergrad', 'grad', 'researcher', 'faculty'];

  /* ---------- الخدمات المهنية المعتمدة ---------- */
  const SERVICES = MunjizAcademicServices.items;

  /* ---------- بنود الترقية (قيم استرشادية قابلة للتعديل) ---------- */
  const PROMO_TYPES = [
    { group: 'البحوث والنشر', items: [
      ['بحث منشور في مجلة مفهرسة عالمياً (Scopus / Clarivate)', 12],
      ['بحث منشور في مجلة محلية محكّمة', 8],
      ['بحث مقدَّم في مؤتمر علمي (منشور)', 4],
    ] },
    { group: 'التأليف والترجمة', items: [
      ['كتاب مؤلَّف', 10],
      ['كتاب مترجَم', 6],
      ['براءة اختراع', 10],
    ] },
    { group: 'الإشراف والتدريس', items: [
      ['إشراف على أطروحة دكتوراه', 5],
      ['إشراف على رسالة ماجستير', 3],
      ['إشراف على بحث تخرج', 1],
    ] },
    { group: 'النشاط العلمي والخدمة', items: [
      ['المشاركة في مؤتمر / ندوة', 2],
      ['عضوية لجنة علمية / تحكيم', 1],
      ['دورة / ورشة تدريبية', 1],
      ['كتاب شكر وتقدير', 1],
    ] },
    { group: 'أخرى', items: [['بند مخصص', 0]] },
  ];

  /* ---------- أدوات مساعدة ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const fmt = (n) => nf.format(n);
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    remove(k) { try { localStorage.removeItem(k); return true; } catch { return false; } },
  };
  async function copyText(text, button) {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'تم النسخ ✓';
    } catch {
      button.textContent = 'تعذّر النسخ؛ حدّد النص وانسخه يدوياً';
    }
    setTimeout(() => { button.textContent = original; }, 2500);
  }
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    });
    kids.forEach((c) => n.append(c));
    return n;
  };

  /* ---------- واتساب ---------- */
  function waLink(service) {
    const aud = currentAudience === 'all' ? 'لم أحدد بعد' : AUDIENCES[currentAudience].label;
    const lines = [
      `السلام عليكم، أتواصل معكم من منصة ${CONFIG.BRAND}.`,
      service ? `الخدمة المطلوبة: ${service}` : 'أرغب بالاستفسار عن خدماتكم.',
      `الفئة: ${aud}`,
      ...(auth.user ? [`الاسم: ${auth.user.name}`] : []),
      'وأُقرّ بالالتزام بميثاق النزاهة (الخدمة للتدقيق والتنسيق والإرشاد فقط).',
    ];
    return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  /* =====================================================
     البوابة التفاعلية + الخدمات
     ===================================================== */
  let currentAudience = 'all';

  function renderBanner() {
    const box = $('#audienceBanner');
    if (!box) return;
    const a = AUDIENCES[currentAudience];
    box.replaceChildren(el('strong', { text: a.title }), el('p', { text: a.text }));
    const links = el('div', { class: 'banner-links' });
    a.links.forEach(([href, text]) => links.append(el('a', { href, text })));
    box.append(links);
  }

  function markTools() {
    $$('.tool-tile').forEach((t) => {
      const relevant = currentAudience === 'all' || t.dataset.toolAudience.split(' ').includes(currentAudience);
      const badge = $('.badge-rec', t);
      if (badge) badge.hidden = currentAudience === 'all' || !relevant;
    });
  }

  function setAudience(key, persist = true) {
    if (key !== 'all' && !AUD_KEYS.includes(key)) key = 'all';
    currentAudience = key;
    $$('#audienceChips .chip').forEach((c) => c.setAttribute('aria-checked', String(c.dataset.audience === key)));
    if (persist) store.set(LS.audience, key);
    renderBanner();
    markTools();
    $('#waFloat').href = waLink('');
    if ($('#heroWaBtn')) $('#heroWaBtn').href = waLink('استشارة أكاديمية عامة');
  }

  function initGateway() {
    const chips = $$('#audienceChips .chip');
    // roving tabindex: العنصر المحدد، أو الأول إن لم تُختر فئة
    const syncTab = () => {
      const anyChecked = chips.some((c) => c.getAttribute('aria-checked') === 'true');
      chips.forEach((c, i) => { c.tabIndex = (anyChecked ? c.getAttribute('aria-checked') === 'true' : i === 0) ? 0 : -1; });
    };
    chips.forEach((c, i) => {
      c.addEventListener('click', () => { setAudience(c.dataset.audience); syncTab(); });
      // تنقل بالأسهم (radiogroup)
      c.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; // RTL
        if (!dir) return;
        e.preventDefault();
        const next = chips[(i + dir + chips.length) % chips.length];
        next.focus();
        next.click();
      });
    });

    // زر العودة لاختيار الفئة + بطاقات الفئات داخل قسم الخدمات
    setAudience(store.get(LS.audience, 'all'), false);
    syncTab();
  }

  /* =====================================================
     حاسبة الترقية العلمية
     ===================================================== */
  const promo = {
    items: [],
    init() {
      const sel = $('#promoType');
      PROMO_TYPES.forEach((g) => {
        const og = el('optgroup', { label: g.group });
        g.items.forEach(([name, pts]) => og.append(el('option', { value: name, 'data-points': String(pts), text: name })));
        sel.append(og);
      });
      const syncPoints = () => { $('#promoPoints').value = sel.selectedOptions[0].dataset.points; };
      sel.addEventListener('change', syncPoints);
      syncPoints();

      const saved = store.get(LS.promo, []);
      this.items = Array.isArray(saved) ? saved.filter((x) => x && Number.isFinite(+x.points) && +x.points >= 0 && Number.isSafeInteger(+x.count) && +x.count >= 1) : [];
      const t = store.get(LS.target, '');
      if (t) $('#promoTarget').value = t;

      $('#promoForm').addEventListener('submit', (e) => { e.preventDefault(); this.add(); });
      $('#promoBody').addEventListener('click', (e) => {
        const b = e.target.closest('.row-del');
        if (b) this.remove(b.dataset.id);
      });
      $('#promoTarget').addEventListener('input', () => { if (!store.set(LS.target, $('#promoTarget').value)) this.msg('تعذّر حفظ الهدف على هذا الجهاز.'); this.render(); });
      $('#promoClear').addEventListener('click', () => {
        if (this.items.length && confirm('هل تريد مسح جميع البنود؟')) { this.items = []; this.save(); this.render(); }
      });
      $('#promoCsv').addEventListener('click', () => this.csv());
      $('#promoPrint').addEventListener('click', () => window.print());
      this.render();
    },
    msg(t) { $('#promoMsg').textContent = t; },
    add() {
      const type = $('#promoType').value;
      const title = $('#promoTitle').value.trim();
      const points = parseFloat($('#promoPoints').value);
      const count = Number($('#promoCount').value);

      if (type === 'بند مخصص' && !title) return this.msg('يرجى كتابة عنوان البند المخصص.');
      if (!Number.isFinite(points) || points < 0) return this.msg('النقاط يجب أن تكون رقماً صفراً أو أكبر.');
      if (!Number.isInteger(count) || count < 1) return this.msg('العدد يجب أن يكون عدداً صحيحاً لا يقل عن 1.');

      this.msg('');
      this.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, title, points, count });
      this.save();
      this.render();
      $('#promoTitle').value = '';
      $('#promoCount').value = 1;
      $('#promoTitle').focus();
    },
    remove(id) { this.items = this.items.filter((x) => x.id !== id); this.save(); this.render(); },
    save() { if (!store.set(LS.promo, this.items)) this.msg('تعذّر الحفظ على هذا الجهاز. صدّر CSV للاحتفاظ بالبنود.'); },
    total() { return this.items.reduce((s, x) => s + x.points * x.count, 0); },
    render() {
      const body = $('#promoBody');
      body.replaceChildren();
      this.items.forEach((x, i) => {
        const del = el('button', { type: 'button', class: 'row-del', 'data-id': x.id, 'aria-label': `حذف البند ${i + 1}`, text: '🗑️' });
        body.append(el('tr', {},
          el('td', { text: String(i + 1) }),
          el('td', { text: x.type }),
          el('td', { text: x.title || '—' }),
          el('td', { text: fmt(x.points) }),
          el('td', { text: String(x.count) }),
          el('td', { text: fmt(x.points * x.count) }),
          el('td', {}, del),
        ));
      });
      $('#promoEmpty').hidden = this.items.length > 0;
      $('#promoTable').hidden = this.items.length === 0;

      const total = this.total();
      $('#promoTotal').textContent = fmt(total);

      const target = parseFloat($('#promoTarget').value);
      const bar = $('#promoBar');
      const txt = $('#promoProgressText');
      if (Number.isFinite(target) && target > 0) {
        const pct = Math.min(100, (total / target) * 100);
        bar.firstElementChild.style.width = pct + '%';
        bar.setAttribute('aria-valuenow', String(Math.round(pct)));
        txt.textContent = total >= target
          ? `أحسنت! بلغت ${fmt(total)} نقطة وتجاوزت المطلوب (${fmt(target)}) بـ ${fmt(total - target)}.`
          : `أنجزت ${fmt(pct)}% — المتبقي ${fmt(target - total)} نقطة من ${fmt(target)}.`;
      } else {
        bar.firstElementChild.style.width = '0';
        bar.setAttribute('aria-valuenow', '0');
        txt.textContent = 'أدخل النقاط المطلوبة لعرض نسبة الإنجاز.';
      }
    },
    csv() {
      if (!this.items.length) return this.msg('لا توجد بنود للتصدير.');
      this.msg('');
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      // حماية من حقن الصيغ في Excel
      const safe = (v) => (/^[=+\-@\t\r]/.test(String(v)) ? "'" + v : v);
      const rows = [['#', 'البند', 'الوصف', 'النقاط', 'العدد', 'المجموع']];
      this.items.forEach((x, i) => rows.push([i + 1, safe(x.type), safe(x.title), x.points, x.count, x.points * x.count]));
      rows.push(['', '', '', '', 'المجموع التراكمي', this.total()]);
      const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = el('a', { href: url, download: 'promotion-points.csv' });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };

  /* =====================================================
     عداد الكلمات
     ===================================================== */
  function initWordCounter() {
    const ta = $('#wcText');
    const limitEl = $('#wcLimit');
    const wordRe = /[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:['’\-][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu;

    const update = () => {
      const text = ta.value;
      const words = (text.match(wordRe) || []).length;
      const chars = [...text].length;
      const noSpace = [...text.replace(/\s/g, '')].length;
      const sentences = text.split(/[.!?؟…]+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
      const paras = text.split(/\n+/).filter((p) => p.trim()).length;
      const mins = words / 180; // متوسط قراءة النص العربي
      $('#wcWords').textContent = fmt(words);
      $('#wcChars').textContent = fmt(chars);
      $('#wcNoSpace').textContent = fmt(noSpace);
      $('#wcSentences').textContent = fmt(sentences);
      $('#wcParas').textContent = fmt(paras);
      $('#wcTime').textContent = words === 0 ? '0 د' : mins < 1 ? 'أقل من دقيقة' : `${Math.ceil(mins)} د`;

      const lim = parseInt(limitEl.value, 10);
      const msg = $('#wcLimitMsg');
      if (lim > 0) {
        const diff = lim - words;
        msg.className = 'limit-msg ' + (diff >= 0 ? 'ok' : 'over');
        msg.textContent = diff >= 0 ? `متبقٍ ${fmt(diff)} كلمة من ${fmt(lim)}.` : `تجاوزت الحد بـ ${fmt(-diff)} كلمة.`;
      } else {
        msg.className = 'limit-msg';
        msg.textContent = '';
      }
    };
    ta.addEventListener('input', update);
    limitEl.addEventListener('input', update);
    update();
  }

  /* =====================================================
     حجم العينة (كوكران)
     ===================================================== */
  function initSampleSize() {
    const ids = ['ssPop', 'ssConf', 'ssMargin', 'ssP', 'ssResp'];
    const out = $('#ssResult');
    const det = $('#ssDetail');

    const calc = () => {
      const N = parseFloat($('#ssPop').value);
      const z = parseFloat($('#ssConf').value);
      const e = parseFloat($('#ssMargin').value) / 100;
      const p = parseFloat($('#ssP').value) / 100;
      const resp = parseFloat($('#ssResp').value) / 100;

      if (!(e >= 0.005 && e <= 0.5) || !(p >= 0.01 && p <= 0.99) || !(resp >= 0.01 && resp <= 1)
        || ($('#ssPop').value.trim() && !(Number.isSafeInteger(N) && N > 0))) {
        out.textContent = '—';
        det.textContent = 'أدخل مجتمعاً صحيحاً موجباً أو اتركه فارغاً؛ هامش الخطأ 0.5–50، النسبة 1–99، والاستجابة 1–100.';
        return;
      }
      const n0 = (z * z * p * (1 - p)) / (e * e);
      let n = n0;
      let note = `العينة قبل التصحيح: ${Math.ceil(n0)}`;
      if (Number.isFinite(N) && N > 0) {
        n = n0 / (1 + (n0 - 1) / N);
        n = Math.min(n, N);
        note = `بعد تصحيح المجتمع المحدود (N = ${fmt(N)}) — قبل التصحيح: ${Math.ceil(n0)}`;
      }
      n = Math.ceil(n);
      out.textContent = fmt(n);
      det.textContent = note;
      if (resp < 1) {
        const inv = Math.ceil(n / resp);
        det.textContent += ` — للحصول عليها يلزم توزيع ≈ ${fmt(inv)} استمارة.`;
      }
    };
    ids.forEach((id) => $('#' + id).addEventListener('input', calc));
    calc();
  }

  /* =====================================================
     TOOL-01 | حاسبة المعدل الأكاديمي (مئوي / بولونيا ECTS / نقاط GPA)
     ===================================================== */
  function initGpa() {
    let mode = 'percent'; // 'percent' | 'bologna' | 'gpa-points'
    const wrap = $('#gpaRows');
    const noteEl = $('#gpaNote');
    const resLbl = $('#gpaResultLabel');
    const resEl = $('#gpaResult');
    const grdEl = $('#gpaGrade');
    const detEl = $('#gpaDetails');

    const NOTES = {
      percent: 'النظام المئوي التقليدي: مجموع (الدرجة × الوحدات) ÷ مجموع الوحدات. يُرجى مطابقة أوزان السنوات بحسب كليتك.',
      bologna: 'مسار بولونيا العراقي ECTS (دليل الوزارة 2025/2026): مجموع درجات المقررات الموزونة بوحدات ECTS ÷ مجموع ECTS. الفصل المرجعي = 30 ECTS. حالة FX من 45 إلى 49 رسوب مشروط بمعالجة.',
      'gpa-points': 'نظام نقاط GPA (مقياس 4.0 أو 5.0): مجموع (النقاط × الساعات المعتمدة) ÷ مجموع الساعات.',
    };

    const addRow = (name = '', w = '', val = '') => {
      let phW = 'الوحدات';
      let phV = 'الدرجة /100';
      let maxV = '100';
      let stepV = '0.5';

      if (mode === 'bologna') {
        phW = 'ECTS (مثلاً 5)';
        phV = 'الدرجة /100';
      } else if (mode === 'gpa-points') {
        phW = 'الساعات (Credit)';
        phV = 'النقاط (مثلاً 3.75)';
        maxV = $('#gpaScale').value;
        stepV = '0.01';
      }

      const row = el('div', { class: 'gpa-row' },
        el('input', { type: 'text', class: 'g-name', 'aria-label': 'اسم المقرر', placeholder: 'اسم المقرر', maxlength: '60', value: name }),
        el('input', { type: 'number', class: 'g-units', 'aria-label': phW, placeholder: phW, min: '0.5', step: '0.5', inputmode: 'decimal', value: w }),
        el('input', { type: 'number', class: 'g-mark', 'aria-label': phV, placeholder: phV, min: '0', max: maxV, step: stepV, inputmode: 'decimal', value: val }),
        el('button', { type: 'button', class: 'row-del', 'aria-label': 'حذف المقرر', text: '✕' }),
      );
      wrap.append(row);
    };

    const calc = () => {
      let sumW = 0;
      let sumWeighted = 0;
      let hasFx = false;
      let invalid = false;
      const maximum = mode === 'gpa-points' ? Number($('#gpaScale').value) : 100;

      $$('.gpa-row', wrap).forEach((r) => {
        const w = parseFloat($('.g-units', r).value);
        const v = parseFloat($('.g-mark', r).value);
        if (!$('.g-units', r).value && !$('.g-mark', r).value) return;
        if (!(Number.isFinite(w) && w >= 0.5 && Number.isFinite(v) && v >= 0 && v <= maximum)) invalid = true;
        else {
          sumW += w;
          sumWeighted += w * v;
          if (mode === 'bologna' && v >= 45 && v < 50) hasFx = true;
        }
      });

      if (invalid || !Number.isFinite(sumWeighted) || !Number.isFinite(sumW)) {
        resEl.textContent = '—';
        grdEl.textContent = `تحقق من جميع المقررات: وزن موجب لا يقل عن 0.5، ودرجة بين 0 و${maximum}.`;
        detEl.textContent = '';
        return;
      }
      if (!sumW) {
        resEl.textContent = '—';
        grdEl.textContent = 'أدخل المقررات والوحدات والدرجات لحساب النتيجة.';
        detEl.textContent = '';
        return;
      }

      const avg = sumWeighted / sumW;

      if (mode === 'percent') {
        resLbl.textContent = 'المعدل المئوي الموزون';
        resEl.textContent = `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(avg)}%`;
        const grade = avg >= 90 ? 'امتياز (Excellent)' : avg >= 80 ? 'جيد جداً (Very Good)' : avg >= 70 ? 'جيد (Good)' : avg >= 60 ? 'متوسط (Medium)' : avg >= 50 ? 'مقبول (Pass)' : 'راسب (Fail)';
        grdEl.textContent = `التقدير العام: ${grade}`;
        detEl.textContent = `إجمالي عدد الوحدات الموزونة: ${fmt(sumW)}`;
      } else if (mode === 'bologna') {
        resLbl.textContent = 'معدل بولونيا ECTS التراكمي';
        resEl.textContent = `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(avg)}%`;
        let grade = avg >= 90 ? 'امتياز (A - Excellent)' : avg >= 80 ? 'جيد جداً (B - Very Good)' : avg >= 70 ? 'جيد (C - Good)' : avg >= 60 ? 'متوسط (D - Medium)' : avg >= 50 ? 'مقبول (E - Pass)' : (avg >= 45 ? 'راسب مشروط (FX - Fail)' : 'راسب (F - Fail)');
        if (hasFx) grade += ' [توجد مقررات في نطاق FX تتطلب معالجة]';
        grdEl.textContent = `التصنيف الوزاري: ${grade}`;
        detEl.textContent = `إجمالي وحدات ECTS المدخلة: ${fmt(sumW)} (الفصل المرجعي = 30 ECTS)`;
      } else {
        resLbl.textContent = 'معدل نقاط GPA المحسوب';
        resEl.textContent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(avg);
        const grade = avg >= 3.7 ? 'مرتبة شرف / امتياز' : avg >= 3.0 ? 'جيد جداً' : avg >= 2.5 ? 'جيد' : avg >= 2.0 ? 'مقبول' : 'إنذار أكاديمي';
        grdEl.textContent = maximum === 4 ? `التقدير التقريبي: ${grade} — راجع سلم جامعتك.` : 'تحديد التقدير على سلم 5 يتبع جدول جامعتك.';
        detEl.textContent = `إجمالي الساعات المعتمدة: ${fmt(sumW)}`;
      }
    };

    const reset = () => {
      wrap.replaceChildren();
      if (mode === 'bologna') {
        addRow('مقرر 1', '6', '85');
        addRow('مقرر 2', '6', '78');
        addRow('مقرر 3', '6', '92');
        addRow('مقرر 4', '6', '70');
        addRow('مقرر 5', '6', '88');
      } else {
        for (let i = 0; i < 4; i++) addRow();
      }
      calc();
    };

    // Mode tab switching
    $$('#gpaModes .mode-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('#gpaModes .mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        mode = tab.dataset.mode;
        $('#gpaScaleField').hidden = mode !== 'gpa-points';
        noteEl.textContent = NOTES[mode];
        reset();
      });
    });

    wrap.addEventListener('input', calc);
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.row-del')) { e.target.closest('.gpa-row').remove(); calc(); }
    });
    $('#gpaAdd').addEventListener('click', () => { addRow(); $$('.g-name', wrap).at(-1).focus(); });
    $('#gpaReset').addEventListener('click', reset);
    $('#gpaScale').addEventListener('change', () => {
      $$('.g-mark', wrap).forEach(input => { input.max = $('#gpaScale').value; });
      calc();
    });
    reset();
  }

  /* =====================================================
     TOOL-02 | منشئ وموثّق المراجع العلمية (DOI / APA 7 / IEEE)
     ===================================================== */
  function initReferences() {
    let currentStyle = 'apa'; // 'apa' | 'ieee'
    let savedList = store.get(LS.references, []);
    savedList = Array.isArray(savedList) ? savedList.filter(d => d && typeof d === 'object'
      && ['authors', 'title', 'journal', 'year', 'volume', 'issue', 'pages', 'url'].every(k => typeof d[k] === 'string')) : [];

    const getRefData = () => ({
      authors: $('#refAuthors').value.trim(),
      title: $('#refTitle').value.trim(),
      journal: $('#refJournal').value.trim(),
      year: $('#refYear').value.trim(),
      volume: $('#refVol').value.trim(),
      issue: $('#refIssue').value.trim(),
      pages: $('#refPages').value.trim(),
      url: $('#refUrl').value.trim(),
    });

    const referenceKey = d => {
      const doi = d.url.match(/(?:doi\.org\/|^doi:)\s*(10\.[^?#\s]+)/i);
      return doi ? doi[1].toLowerCase().replace(/\/$/, '') : `${d.title}|${d.authors}|${d.year}`.toLowerCase().replace(/\s+/g, ' ').trim();
    };
    const refNumber = d => { const i = savedList.findIndex(x => referenceKey(x) === referenceKey(d)); return i < 0 ? savedList.length + 1 : i + 1; };
    const formatInText = (d) => {
      if (!d.authors) return '(المؤلف، ' + (d.year || 'د.ت') + ')';
      const parts = d.authors.split(/[;؛]/).map((a) => a.trim()).filter(Boolean);
      const first = parts[0].split(/[,،]/)[0].trim() || parts[0];
      if (currentStyle === 'ieee') return `[${refNumber(d)}]`;
      if (parts.length === 1) return `(${first}، ${d.year || 'د.ت'})`;
      if (parts.length === 2) {
        const second = parts[1].split(/[,،]/)[0].trim() || parts[1];
        return `(${first} و ${second}، ${d.year || 'د.ت'})`;
      }
      return `(${first} وآخرون، ${d.year || 'د.ت'})`;
    };

    const formatRefList = (d, number = refNumber(d)) => {
      if (!d.authors && !d.title) return 'أدخل بيانات المرجع أو اجلبها عبر DOI لعرض التوثيق.';
      const a = d.authors || 'اسم المؤلف';
      const y = d.year ? `(${d.year})` : '(د.ت)';
      const t = d.title || 'عنوان البحث';
      const j = d.journal ? d.journal : '';
      const v = d.volume ? `${d.volume}` : '';
      const i = d.issue ? `(${d.issue})` : '';
      const p = d.pages ? `, ${d.pages}` : '';
      const u = d.url ? ` ${d.url}` : '';

      if (currentStyle === 'apa') {
        const volPart = (v || i) ? `, ${v}${i}` : '';
        return `${a} ${y}. ${t}. ${j}${volPart}${p}.${u}`;
      }
      // IEEE
      const volIeee = v ? `vol. ${v}, ` : '';
      const issIeee = i ? `no. ${d.issue}, ` : '';
      const ppIeee = d.pages ? `pp. ${d.pages}, ` : '';
      const yrIeee = d.year ? `${d.year}.` : '';
      return `[${number}] ${a}, "${t}," ${j}, ${volIeee}${issIeee}${ppIeee}${yrIeee}${u}`;
    };

    const updatePreviews = () => {
      const data = getRefData();
      $('#previewInText').textContent = formatInText(data);
      $('#previewRefList').textContent = formatRefList(data);
      $('#savedRefsWrapper').hidden = savedList.length === 0;
      $('#copyAllRefsBtn').hidden = savedList.length === 0;
      $('#savedRefsCount').textContent = String(savedList.length);
      $('#savedRefsList').replaceChildren(...savedList.map((d, i) => el('li', { text: formatRefList(d, i + 1) })));
    };

    // DOI Fetching via Crossref REST API
    $('#refDoiBtn').addEventListener('click', async () => {
      const input = $('#refDoiInput').value.trim();
      const msg = $('#refDoiMsg');
      if (!input) {
        msg.textContent = 'يرجى إدخال معرّف DOI صالح.';
        msg.className = 'form-msg';
        return;
      }
      const cleanDoi = input.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').trim();
      msg.textContent = 'جاري الاتصال بقاعدة Crossref وجلب البيانات...';
      msg.className = 'form-msg ok';
      $('#refDoiBtn').disabled = true;

      try {
        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
          headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error('لم يتم العثور على المعرف في Crossref.');
        const json = await res.json();
        const item = json.message || {};

        // Extract title
        $('#refTitle').value = (item.title && item.title[0]) || '';
        // Extract authors
        if (item.author && Array.isArray(item.author)) {
          $('#refAuthors').value = item.author.map((x) => `${x.family || ''}, ${x.given ? x.given.split(/[\s-]+/).filter(Boolean).map(n => n[0] + '.').join(' ') : ''}`).filter(Boolean).join('; ');
        }
        // Extract Journal
        $('#refJournal').value = (item['container-title'] && item['container-title'][0]) || item.publisher || '';
        // Extract Year
        const dateParts = item['published-print']?.['date-parts'] || item['published-online']?.['date-parts'] || item.published?.['date-parts'];
        $('#refYear').value = (dateParts && dateParts[0] && dateParts[0][0]) || '';
        // Volume, Issue, Page, URL
        $('#refVol').value = item.volume || '';
        $('#refIssue').value = item.issue || '';
        $('#refPages').value = item.page || '';
        $('#refUrl').value = item.URL || `https://doi.org/${cleanDoi}`;

        msg.textContent = 'تم جلب وتوثيق البيانات بنجاح من Crossref ✓';
        msg.className = 'form-msg ok';
        updatePreviews();
      } catch (err) {
        msg.textContent = `تعذّر الجلب الآلي (${err.message || 'خطأ في الاتصال'}). يُمكنك إدخال البيانات يدوياً.`;
        msg.className = 'form-msg';
      } finally {
        $('#refDoiBtn').disabled = false;
      }
    });

    // Style Switcher
    $('#styleApaBtn').addEventListener('click', () => {
      currentStyle = 'apa';
      $('#styleApaBtn').className = 'btn btn-sm btn-teal';
      $('#styleIeeeBtn').className = 'btn btn-sm btn-outline';
      updatePreviews();
    });
    $('#styleIeeeBtn').addEventListener('click', () => {
      currentStyle = 'ieee';
      $('#styleIeeeBtn').className = 'btn btn-sm btn-teal';
      $('#styleApaBtn').className = 'btn btn-sm btn-outline';
      updatePreviews();
    });

    $('#refForm').addEventListener('input', updatePreviews);

    // Copying buttons
    const flashBtn = (btn, original) => {
      btn.textContent = 'تم النسخ ✓';
      setTimeout(() => { btn.textContent = original; }, 1800);
    };

    $('#copyInTextBtn').addEventListener('click', () => {
      copyText($('#previewInText').textContent, $('#copyInTextBtn'));
    });

    $('#copyRefBtn').addEventListener('click', () => {
      copyText($('#previewRefList').textContent, $('#copyRefBtn'));
    });

    // Add to saved list
    $('#addRefToList').addEventListener('click', () => {
      const data = getRefData();
      const msg = $('#refSaveMsg');
      if (!data.title || !data.authors) { msg.textContent = 'أدخل العنوان والمؤلفين قبل الحفظ.'; return; }
      if (savedList.some(x => referenceKey(x) === referenceKey(data))) { msg.textContent = 'هذا المرجع موجود في قائمتك بالفعل.'; return; }
      const next = [...savedList, data];
      if (!store.set(LS.references, next)) { msg.textContent = 'تعذّر حفظ القائمة. انسخ المرجع للاحتفاظ به.'; return; }
      savedList = next;
      msg.textContent = 'تم حفظ المرجع على هذا المتصفح.';
      updatePreviews();
      flashBtn($('#addRefToList'), '➕ إضافة إلى قائمة مراجعي');
    });

    $('#copyAllRefsBtn').addEventListener('click', () => {
      copyText(savedList.map((d, i) => formatRefList(d, i + 1)).join('\n\n'), $('#copyAllRefsBtn'));
    });

    $('#clearRefsBtn').addEventListener('click', () => {
      $('#refForm').reset();
      $('#refDoiInput').value = '';
      $('#refDoiMsg').textContent = '';
      updatePreviews();
    });

    updatePreviews();
    document.addEventListener('localprofiledeleted', () => { savedList = []; updatePreviews(); });
  }

  /* =====================================================
     TOOL-05 | محول الوحدات العلمية (6 مجموعات فيزيائية)
     ===================================================== */
  function initUnits() {
    const UNITS_DATA = {
      length: {
        label: 'الطول',
        units: { m: { name: 'متر (m)', f: 1 }, cm: { name: 'سنتيمتر (cm)', f: 0.01 }, mm: { name: 'مليمتر (mm)', f: 0.001 }, km: { name: 'كيلومتر (km)', f: 1000 }, in: { name: 'بوصة / إنش (in)', f: 0.0254 }, ft: { name: 'قدم (ft)', f: 0.3048 }, yd: { name: 'ياردة (yd)', f: 0.9144 }, mi: { name: 'ميل (mi)', f: 1609.344 } },
      },
      mass: {
        label: 'الكتلة',
        units: { kg: { name: 'كيلوغرام (kg)', f: 1 }, g: { name: 'غرام (g)', f: 0.001 }, mg: { name: 'مليغرام (mg)', f: 1e-6 }, lb: { name: 'رطل (lb)', f: 0.45359237 }, oz: { name: 'أونصة (oz)', f: 0.0283495231 }, tonne: { name: 'طن متري (t)', f: 1000 } },
      },
      time: {
        label: 'الزمن',
        units: { s: { name: 'ثانية (s)', f: 1 }, min: { name: 'دقيقة (min)', f: 60 }, h: { name: 'ساعة (h)', f: 3600 }, d: { name: 'يوم (d)', f: 86400 }, wk: { name: 'أسبوع (wk)', f: 604800 }, yr: { name: 'سنة (yr)', f: 31536000 } },
      },
      temperature: {
        label: 'الحرارة',
        units: { c: { name: 'درجة مئوية (°C)' }, k: { name: 'كلفن (K)' }, f: { name: 'فهرنهايت (°F)' } },
      },
      energy: {
        label: 'الطاقة',
        units: { j: { name: 'جول (J)', f: 1 }, kj: { name: 'كيلوجول (kJ)', f: 1000 }, cal: { name: 'سعرة (cal)', f: 4.184 }, kcal: { name: 'كيلوكالوري (kcal)', f: 4184 }, wh: { name: 'واط-ساعة (Wh)', f: 3600 }, kwh: { name: 'كيلوواط-ساعة (kWh)', f: 3.6e6 }, ev: { name: 'إلكترون فولت (eV)', f: 1.602176634e-19 } },
      },
      pressure: {
        label: 'الضغط',
        units: { pa: { name: 'باسكال (Pa)', f: 1 }, kpa: { name: 'كيلوباسكال (kPa)', f: 1000 }, bar: { name: 'بار (bar)', f: 100000 }, atm: { name: 'ضغط جوي (atm)', f: 101325 }, mmhg: { name: 'ملم زئبق (mmHg)', f: 133.322387 }, psi: { name: 'رطل/بوصة² (psi)', f: 6894.757 } },
      },
    };

    const catSel = $('#unitCategorySelect');
    const fromSel = $('#unitFromSelect');
    const toSel = $('#unitToSelect');
    const valIn = $('#unitInputValue');
    const outRes = $('#unitOutputResult');
    const eqDesc = $('#unitEquationDesc');

    const populateUnits = () => {
      const cat = catSel.value;
      const group = UNITS_DATA[cat].units;
      fromSel.replaceChildren();
      toSel.replaceChildren();

      Object.entries(group).forEach(([key, obj]) => {
        fromSel.append(el('option', { value: key, text: obj.name }));
        toSel.append(el('option', { value: key, text: obj.name }));
      });

      // Default pair selection
      const keys = Object.keys(group);
      if (keys.length > 1) {
        fromSel.value = keys[0];
        toSel.value = keys[1];
      }
      convert();
    };

    const convert = () => {
      const cat = catSel.value;
      const v = parseFloat(valIn.value);
      if (!Number.isFinite(v)) {
        outRes.textContent = '—';
        eqDesc.textContent = 'أدخل رقماً صالحاً للتحويل.';
        return;
      }

      const fromKey = fromSel.value;
      const toKey = toSel.value;

      if (cat === 'temperature') {
        let inCelsius = v;
        if (fromKey === 'k') inCelsius = v - 273.15;
        else if (fromKey === 'f') inCelsius = (v - 32) * (5 / 9);
        if (inCelsius < -273.15 - 1e-9) {
          outRes.textContent = '—';
          eqDesc.textContent = 'الحرارة لا يمكن أن تقل عن الصفر المطلق (0 K).';
          return;
        }

        let result = inCelsius;
        if (toKey === 'k') result = inCelsius + 273.15;
        else if (toKey === 'f') result = inCelsius * (9 / 5) + 32;

        outRes.textContent = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 10 }).format(result);
        eqDesc.textContent = `تحويل إزاحي: K = °C + 273.15 | °F = °C × 1.8 + 32`;
        return;
      }

      const fromFactor = UNITS_DATA[cat].units[fromKey].f;
      const toFactor = UNITS_DATA[cat].units[toKey].f;
      const inBase = v * fromFactor;
      const result = inBase / toFactor;

      if (!Number.isFinite(result)) { outRes.textContent = '—'; eqDesc.textContent = 'القيمة أكبر من نطاق الحساب؛ استخدم رقماً أصغر.'; return; }
      outRes.textContent = result !== 0 && (Math.abs(result) < 1e-6 || Math.abs(result) > 1e9) ? result.toExponential(6) : new Intl.NumberFormat('en-US', { maximumSignificantDigits: 10 }).format(result);
      eqDesc.textContent = `القيمة بالوحدة المعيارية (SI): ${inBase.toPrecision(5)}`;
    };

    catSel.addEventListener('change', populateUnits);
    fromSel.addEventListener('change', convert);
    toSel.addEventListener('change', convert);
    valIn.addEventListener('input', convert);

    $('#unitSwapBtn').addEventListener('click', () => {
      const tmp = fromSel.value;
      fromSel.value = toSel.value;
      toSel.value = tmp;
      convert();
    });

    $('#unitCopyBtn').addEventListener('click', () => {
      copyText(outRes.textContent, $('#unitCopyBtn'));
    });

    populateUnits();
  }

  /* =====================================================
     TOOL-06 | نظام الاختبارات والتصحيح الذكي (M1)
     ===================================================== */
  function initQuiz() {
    const QUIZ_PRESETS = {
      'research-methods': [
        { q: 'ما الفرق الجوهري بين السؤال البحثي والفرضية؟', opts: ['الفرضية تخمين علمي قابل للاختبار، والسؤال استفهام مفتوح', 'الفرضية لا تحتاج إلى دراسات سابقة والسؤال يحتاج', 'الفرضية تطبق في البحوث النوعية فقط', 'كلاهما صياغة واحدة ولا فرق بينهما'], a: 0, exp: 'الفرضية هي صياغة إجرائية تحدد علاقة متوقعة بين متغيرين وتخضع للاختبار الإحصائي.' },
        { q: 'تُعد العينة العشوائية البسيطة مناسبة عندما يكون مجتمع الدراسة متجانساً.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، لأن كل فرد في المجتمع المتجانس يحظى بفرصة متساوية ومستقلة للاختيار.' },
        { q: 'أي من العناصر التالية يُعد متغيراً مستقلاً في دراسة أثر طريقة التدريس على التحصيل؟', opts: ['طريقة التدريس', 'التحصيل الدراسي', 'ذكاء الطالب', 'المرحلة الدراسية'], a: 0, exp: 'طريقة التدريس هي المتغير المستقل المعالج المراد قياس أثره على التحصيل (المتغير التابع).' },
        { q: 'الصدق الظاهري (Face Validity) يعني مدى قياس الأداة لما وُضعت لقياسه في حكم المحكمين.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، الصدق الظاهري يعتمد على فحص خبراء ومحكمين لفقرات الاستبانة أو الاختبار.' },
        { q: 'ما هو الهدف الأساسي من الدراسات الاستطلاعية (Pilot Studies)؟', opts: ['التأكد من وضوح الأداة واستخراج ثباتها الأولي', 'استبدال عينة البحث النهائية', 'نشر النتائج في مجلة علمية فوراً', 'توفير التكاليف المالية للبحث'], a: 0, exp: 'الدراسة الاستطلاعية تكتشف غموض الفقرات وتقيس مؤشرات الصدق والثبات المبدئية.' },
        { q: 'البحوث النوعية (Qualitative) تعتمد غالباً على البيانات الرقمية والمعادلات الرياضية.', opts: ['صح', 'خطأ'], a: 1, exp: 'خطأ، البحوث الكمية هي التي تعتمد على الأرقام، بينما تعتمد النوعية على الكلمات والملاحظات والمقابلات.' },
        { q: 'أي مما يلي يمثل فرضية صفرية (Null Hypothesis)؟', opts: ['لا توجد فروق ذات دلالة إحصائية بين المجموعتين', 'توجد فروق إيجابية لصالح المجموعة التجريبية', 'المجموعة الضابطة أفضل من التجريبية', 'توجد علاقة ارتباطية موجبة قوية'], a: 0, exp: 'الفرضية الصفرية تنص على انعدام الأثر أو الفروق حتى يثبت العكس إحصائياً.' },
        { q: 'معامل ألفا كرونباخ يقيس الاتساق الداخلي لفقرات أداة القياس.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، كرونباخ ألفا هو المقياس الأكثر شيوعاً للاتساق الداخلي للاستبانات.' },
        { q: 'متى يلجأ الباحث إلى اختيار العينة الطبقية (Stratified Sample)؟', opts: ['عندما ينقسم مجتمع الدراسة إلى فئات أو طبقات متباينة', 'عندما يكون مجتمع البحث مجهولاً تماماً', 'في البحوث التاريخية فقط', 'عندما لا يتوفر وقت لجمع البيانات'], a: 0, exp: 'تضمن العينة الطبقية تمثيل كل شريحة بنسبتها الحقيقية في المجتمع.' },
        { q: 'يُشترط في خطة البحث (Proposal) تضمين النتائج النهائية والمناقشة التفصيلية.', opts: ['صح', 'خطأ'], a: 1, exp: 'خطأ، خطة البحث تمثل تصميماً قبلياً ولا تتضمن النتائج النهائية التي لم تُجمع بعد.' },
      ],
      statistics: [
        { q: 'يُستخدم اختبار (One-Sample t-test) لمقارنة متوسط عينة واحدة بمتوسط مجتمع معلوم.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، يُستخدم لاختبار دلالة الفارق بين متوسط العينة ومتوسط معياري أو فرضي.' },
        { q: 'أي اختبار إحصائي هو الأنسب لمقارنة متوسطات ثلاث مجموعات مستقلة؟', opts: ['تحليل التباين الأحادي (ANOVA)', 'اختبار ت لعينتين مترابطتين (Paired t-test)', 'معامل ارتباط بيرسون', 'اختبار مربع كاي لحسن المطابقة'], a: 0, exp: 'تحليل التباين الأحادي (One-Way ANOVA) يقارن متوسطات 3 مجموعات فأكثر لتفادي خطأ النوع الأول.' },
        { q: 'تكون النتيجة ذات دلالة إحصائية عند مستوى 0.05 إذا كانت قيمة الدلالة (p-value):', opts: ['أقل من أو تساوي 0.05', 'أكبر من 0.05 دائماً', 'تساوي تماماً 1.0', 'سالبة حصراً'], a: 0, exp: 'عندما تكون p-value ≤ 0.05 نرفض الفرضية الصفرية ونقبل الدلالة الإحصائية.' },
        { q: 'معامل ارتباط بيرسون يتراوح دائماً بين -1.0 و +1.0.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، +1 ارتباط تام طردي، -1 ارتباط تام عكسي، و0 انعدام العلاقة الخطية.' },
        { q: 'يُستخدم اختبار كاي سكوير (Chi-Square) للاستقلالية لدراسة العلاقة بين متغيرين اسميين/نوعيين.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، اختبار مربع كاي يتعامل مع التكرارات والمتغيرات الفئوية الاسمية.' },
      ],
    };

    let activeQuestions = [];
    let currentIdx = 0;
    let userAnswers = {};

    const step1Tab = $('#qStep1Tab');
    const step2Tab = $('#qStep2Tab');
    const step3Tab = $('#qStep3Tab');
    const setupView = $('#quizSetupView');
    const playView = $('#quizPlayView');
    const reportView = $('#quizReportView');
    const reviewView = $('#quizReviewView');
    const teacherMode = $('#quizTeacherMode');
    const exportAnswers = $('#quizExportAnswers');
    const updateTeacherMode = () => {
      const enabled = teacherMode.checked;
      $$('#quizReviewList input, #quizReviewList textarea').forEach(input => { input.readOnly = !enabled; });
      $$('#quizReviewList .quiz-answer-field, #quizReviewList details').forEach(node => { node.hidden = !enabled; });
      $('#quizExportAnswersField').hidden = !enabled;
      exportAnswers.disabled = !enabled;
      if (!enabled) exportAnswers.checked = false;
      $('#quizExportMsg').textContent = '';
    };
    teacherMode.addEventListener('change', updateTeacherMode);
    const bankTexts = {
      ethics: [
        'التوثيق المرجعي يربط الاقتباس بمصدره ويتيح للقارئ الرجوع إلى العمل الأصلي.',
        'الاقتباس المباشر ينقل كلمات المؤلف ويحتاج علامات اقتباس وتوثيقاً واضحاً للمصدر.',
        'إعادة الصياغة تعرض الفكرة بكلمات الباحث وتظل بحاجة إلى توثيق المصدر الأصلي.',
        'الانتحال العلمي يشمل عرض عمل الآخرين بوصفه عملاً شخصياً دون نسبة واضحة.',
        'النزاهة البحثية تتطلب عرض البيانات بأمانة وتجنب اختلاق النتائج أو تحريفها.',
        'موافقة المشاركين يجب أن تبنى على معرفة هدف الدراسة وطبيعة المشاركة.',
        'سرية البيانات تستلزم حماية هوية المشاركين وقصر الوصول على الأشخاص المخولين.',
        'تضارب المصالح يجب التصريح به عندما يمكن أن يؤثر في تقييم البحث.',
        'قائمة المراجع تضم المصادر المستشهد بها وتساعد على التحقق من المعلومات.',
        'المراجعة العلمية تتطلب فحص الأدلة والمصادر قبل اعتماد استنتاجات البحث النهائية.',
      ].join('\n'),
      bologna: [
        'وحدات ECTS تعبّر عن عبء تعلم الطالب ولا تعني نقاط GPA على مقياس أربعة.',
        'المعدل الموزون يحسب مجموع حاصل ضرب الدرجات بوحداتها مقسوماً على مجموع الوحدات.',
        'التقييم التكويني يتابع تقدم الطالب خلال التعلم وفق قواعد البرنامج المعتمدة.',
        'التقييم التلخيصي يقيس حصيلة التعلم في نهاية المرحلة وفق نظام المؤسسة.',
        'مخرجات التعلم تصف المعارف والمهارات التي ينبغي للطالب اكتسابها من المقرر.',
        'الخطة الدراسية تحدد مقررات البرنامج ووحداتها وتوزيعها على المراحل والفصول.',
        'إعادة المقرر تخضع لقواعد المؤسسة المعتمدة ولا تعتمد على افتراض موحد.',
        'السجل الأكاديمي الرسمي يصدر عن المؤسسة ويظل المرجع المعتمد لنتائج الطالب.',
        'التعليمات الأكاديمية تحتاج إلى مصدر وتاريخ سريان ومراجعة قبل تطبيقها.',
        'حساب الوحدات المكتسبة يتطلب التحقق من نجاح المقررات وفق قواعد البرنامج.',
      ].join('\n'),
    };
    let fileController = null;
    let readingFile = false;
    const fileInput = $('#quizFileInput');
    const sourceInput = $('#quizCustomText');
    const fileStatus = $('#quizFileStatus');
    fileInput.addEventListener('change', async () => {
      fileController?.abort();
      const file = fileInput.files[0];
      if (!file) {
        fileController = null; readingFile = false;
        sourceInput.disabled = false; $('#startQuizBuildBtn').disabled = false;
        $('#quizRemoveFile').hidden = true;
        fileStatus.textContent = 'تم إلغاء اختيار الملف. يمكنك تعديل النص أو اختيار ملف آخر.';
        return;
      }
      const controller = new AbortController(); fileController = controller;
      readingFile = true; sourceInput.disabled = true;
      $('#startQuizBuildBtn').disabled = true;
      $('#quizRemoveFile').hidden = false;
      fileStatus.textContent = 'جاري قراءة الملف محلياً…';
      try {
        const text = await MunjizQuiz.extractFile(file, controller.signal, message => {
          if (fileController === controller) fileStatus.textContent = message;
        });
        if (fileController !== controller) return;
        sourceInput.value = text; $('#quizPresetSelect').value = 'custom';
        fileStatus.textContent = `تمت قراءة ${file.name}: ${fmt(text.length)} حرفاً. راجع النص المستخرج ثم اختر العدد والنوع.`;
        $('#quizBuildMsg').textContent = `المحتوى يكفي لنحو ${MunjizQuiz.prepare(text).length} سؤالاً مختلفاً.`;
      } catch (error) {
        if (fileController === controller) fileStatus.textContent = error.message || 'تعذّر قراءة الملف؛ استخدم نسخة نصية.';
      } finally {
        if (fileController === controller) {
          readingFile = false; sourceInput.disabled = false; $('#startQuizBuildBtn').disabled = false;
        }
      }
    });
    $('#quizRemoveFile').addEventListener('click', () => {
      fileController?.abort(); fileController = null; readingFile = false;
      fileInput.value = ''; sourceInput.value = ''; sourceInput.disabled = false;
      fileStatus.textContent = ''; $('#quizBuildMsg').textContent = '';
      $('#quizRemoveFile').hidden = true; $('#startQuizBuildBtn').disabled = false;
    });
    sourceInput.addEventListener('input', () => { if (sourceInput.value.trim()) $('#quizPresetSelect').value = 'custom'; });

    const switchQuizStep = (step) => {
      [step1Tab, step2Tab, step3Tab].forEach((t) => t.classList.remove('active'));
      setupView.hidden = true;
      playView.hidden = true;
      reportView.hidden = true;
      reviewView.hidden = true;

      if (step === 1) {
        step1Tab.classList.add('active');
        setupView.hidden = false;
      } else if (step === 2) {
        step2Tab.classList.add('active');
        playView.hidden = false;
      } else if (step === 3) {
        step3Tab.classList.add('active');
        reportView.hidden = false;
      } else if (step === 4) {
        step1Tab.classList.add('active'); reviewView.hidden = false;
      }
    };

    const renderQuestion = () => {
      const item = activeQuestions[currentIdx];
      $('#quizCurrentProgress').textContent = `السؤال ${currentIdx + 1} من ${activeQuestions.length}`;
      $('#quizProgressBar').style.width = `${((currentIdx + 1) / activeQuestions.length) * 100}%`;
      $('#qCurrentText').textContent = item.q;

      const optsBox = $('#qCurrentOptions');
      optsBox.replaceChildren();
      const answered = userAnswers[currentIdx] !== undefined;

      item.opts.forEach((optText, i) => {
        const isSelected = userAnswers[currentIdx] === i;
        const optBtn = el('button', {
          type: 'button',
          class: `q-opt${isSelected ? ' selected' : ''}${answered && i === item.a ? ' correct' : ''}${answered && isSelected && i !== item.a ? ' incorrect' : ''}`,
          'aria-pressed': String(isSelected),
          text: optText,
        });
        optBtn.disabled = answered;
        optBtn.addEventListener('click', () => {
          if (userAnswers[currentIdx] !== undefined) return;
          userAnswers[currentIdx] = i;
          renderQuestion();
          $('#qAnswerFeedback').focus();
        });
        optsBox.append(optBtn);
      });

      const feedback = $('#qAnswerFeedback');
      feedback.replaceChildren(); feedback.hidden = !answered;
      feedback.classList.toggle('incorrect', answered && userAnswers[currentIdx] !== item.a);
      if (answered) {
        feedback.append(
          el('strong', { text: userAnswers[currentIdx] === item.a ? 'إجابتك صحيحة ✓' : 'إجابتك غير صحيحة ✗' }),
          el('p', { text: `الإجابة الصحيحة: ${item.opts[item.a]}` }),
          el('p', { class: 'q-explain', text: `المصدر / التفسير: ${item.source || item.exp || 'لا يوجد تفسير إضافي.'}` }),
        );
      }

      $('#qPrevBtn').disabled = currentIdx === 0;
      const isLast = currentIdx === activeQuestions.length - 1;
      $('#qNextBtn').hidden = isLast;
      $('#qSubmitBtn').hidden = !isLast;
    };

    const submitQuiz = () => {
      let correctCount = 0;
      const detailedList = $('#quizDetailedList');
      detailedList.replaceChildren();

      activeQuestions.forEach((item, idx) => {
        const userA = userAnswers[idx];
        const isCorrect = userA === item.a;
        if (isCorrect) correctCount++;

        const userText = userA !== undefined ? item.opts[userA] : 'لم تتم الإجابة (متروك)';
        const correctText = item.opts[item.a];

        const card = el('div', { class: `q-detail-card ${isCorrect ? 'correct' : 'incorrect'}` },
          el('strong', { text: `${idx + 1}. ${item.q}` }),
          el('div', { style: 'margin-top: .4rem; font-size: .95rem;' },
            el('span', { text: `إجابتك: ${userText} ${isCorrect ? '✓ (صحيحة)' : '✗ (خاطئة)'}` }),
          ),
          (userA !== undefined && !isCorrect ? el('div', { style: 'color: #1E8E4E; font-weight: 700; margin-top: .2rem;' },
            el('span', { text: `الإجابة المعتمدة: ${correctText}` }),
          ) : el('span')),
          el('div', { class: 'q-explain', text: userA === undefined ? 'الحل مخفي لأنك لم تجب. أعد تدريب الأسئلة المتروكة للإجابة عنها.' : `المصدر / التفسير: ${item.source || item.exp || 'لا يوجد تفسير إضافي.'}` }),
        );
        detailedList.append(card);
      });

      const total = activeQuestions.length;
      const pct = Math.round((correctCount / total) * 100);
      $('#quizScorePercent').textContent = `${pct}%`;
      $('#quizScoreText').textContent = `حققت ${correctCount} من إجمالي ${total} إجابات صحيحة`;

      // Show/hide retry wrong
      const hasErrors = correctCount < total;
      $('#quizRetryWrongBtn').hidden = !hasErrors;

      switchQuizStep(3);
    };

    $('#startQuizBuildBtn').addEventListener('click', () => {
      const preset = $('#quizPresetSelect').value;
      const count = Number($('#quizCountSelect').value);
      const type = $('#quizTypeSelect').value;
      const msg = $('#quizBuildMsg'); msg.textContent = '';
      if (readingFile) { msg.textContent = 'انتظر انتهاء قراءة الملف.'; return; }
      try {
        if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('اختر عدداً صحيحاً بين 1 و50.');
        const text = sourceInput.value.trim();
        if (text || preset === 'custom' || bankTexts[preset]) {
          activeQuestions = MunjizQuiz.generate(text || bankTexts[preset] || '', count, type);
        } else {
          const pool = (QUIZ_PRESETS[preset] || []).filter(q => type === 'mixed' || (type === 'tf' ? q.opts.length === 2 : q.opts.length > 2));
          if (pool.length < count) throw new Error(`البنك يحتوي ${pool.length} سؤالاً من النوع المحدد. خفّض العدد أو ارفع محاضرة لتوليد المزيد.`);
          activeQuestions = MunjizQuiz.shuffle(pool).slice(0, count).map(q => {
            const pairs = MunjizQuiz.shuffle(q.opts.map((text, i) => ({ text, correct: i === q.a })));
            return { ...q, opts: pairs.map(p => p.text), a: pairs.findIndex(p => p.correct), source: q.exp };
          });
        }
        const list = $('#quizReviewList'); list.replaceChildren();
        activeQuestions.forEach((item, index) => {
          const card = el('section', { class: 'q-detail-card' });
          const question = el('textarea', { maxlength: '1600', 'aria-label': `نص السؤال ${index + 1}` }); question.value = item.q;
          question.addEventListener('input', () => { item.q = question.value; });
          card.append(el('h4', { text: `السؤال ${index + 1}` }), question);
          const answer = el('select', { 'aria-label': `الإجابة الصحيحة للسؤال ${index + 1}` });
          item.opts.forEach((text, i) => {
            const input = el('input', { type: 'text', maxlength: '800', value: text, 'aria-label': `الخيار ${i + 1} للسؤال ${index + 1}` });
            answer.append(el('option', { value: String(i), text: `الخيار ${i + 1}: ${text}` }));
            input.addEventListener('input', () => { item.opts[i] = input.value; answer.options[i].textContent = `الخيار ${i + 1}: ${input.value}`; });
            card.append(el('label', { class: 'field' }, el('span', { text: `الخيار ${i + 1}` }), input));
          });
          answer.value = String(item.a);
          answer.addEventListener('change', () => { item.a = Number(answer.value); });
          card.append(el('label', { class: 'field quiz-answer-field' }, el('span', { text: 'الإجابة الصحيحة' }), answer));
          card.append(el('details', {}, el('summary', { text: 'المقطع المصدر / التفسير' }), el('p', { text: item.source || item.exp })));
          list.append(card);
        });
        teacherMode.checked = false; updateTeacherMode();
        $('#quizReviewMsg').textContent = ''; switchQuizStep(4);
      } catch (error) { msg.textContent = error.message; }
    });
    $('#quizConfirmStart').addEventListener('click', () => {
      const invalid = activeQuestions.some(item => !item.q.trim() || item.opts.some(x => !x.trim())
        || new Set(item.opts.map(x => x.trim().toLowerCase())).size !== item.opts.length
        || !Number.isInteger(item.a) || item.a < 0 || item.a >= item.opts.length);
      if (invalid) { $('#quizReviewMsg').textContent = 'أكمل الأسئلة والخيارات، وتجنب الخيارات المتكررة، وحدّد مفتاحاً صحيحاً.'; return; }
      currentIdx = 0; userAnswers = {}; switchQuizStep(2); renderQuestion();
    });
    $('#quizExportDocx').addEventListener('click', async () => {
      const button = $('#quizExportDocx');
      const msg = $('#quizExportMsg');
      button.disabled = true; msg.textContent = 'جاري تجهيز ملف Word محلياً…';
      let url;
      try {
        const includeAnswers = teacherMode.checked && exportAnswers.checked;
        const blob = await MunjizQuizExport.buildDocx(activeQuestions, {
          title: $('#quizExportTitle').value.trim() || 'اختبار أكاديمي',
          teacher: $('#quizExportTeacher').value.trim(), includeAnswers,
        });
        url = URL.createObjectURL(blob);
        const link = el('a', { href: url, download: `munjiz-quiz-${includeAnswers ? 'teacher' : 'students'}.docx` });
        document.body.append(link); link.click(); link.remove();
        msg.textContent = includeAnswers ? 'تم تجهيز نسخة المدرّس بمفتاح الإجابات في صفحة مستقلة. تحقق من التنزيلات.' : 'تم تجهيز نسخة الطلاب دون حلول. تحقق من التنزيلات.';
      } catch (error) {
        msg.textContent = error.message || 'تعذّر تجهيز الملف. راجع الأسئلة ثم أعد المحاولة.';
      } finally {
        button.disabled = false;
        if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    });
    $('#quizBackSetup').addEventListener('click', () => switchQuizStep(1));

    $('#qPrevBtn').addEventListener('click', () => {
      if (currentIdx > 0) { currentIdx--; renderQuestion(); }
    });

    $('#qNextBtn').addEventListener('click', () => {
      if (currentIdx < activeQuestions.length - 1) { currentIdx++; renderQuestion(); }
    });

    $('#qSubmitBtn').addEventListener('click', submitQuiz);
    $('#cancelQuizBtn').addEventListener('click', () => switchQuizStep(1));
    $('#quizNewBtn').addEventListener('click', () => switchQuizStep(1));

    $('#quizRetryWrongBtn').addEventListener('click', () => {
      const wrongOnly = activeQuestions.filter((item, idx) => userAnswers[idx] !== item.a);
      if (wrongOnly.length) {
        activeQuestions = wrongOnly;
        currentIdx = 0;
        userAnswers = {};
        switchQuizStep(2);
        renderQuestion();
      }
    });
  }

  /* =====================================================
     النوافذ المنبثقة: الميثاق + الأدوات + الحساب
     ===================================================== */
  const modals = {
    last: new WeakMap(),
    open(dlg) {
      if (!dlg || dlg.open) return;
      $('#mainNav').classList.remove('open');
      $('#navToggle').setAttribute('aria-expanded', 'false');
      this.last.set(dlg, document.activeElement);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
    },
    close(dlg) {
      if (!dlg) return;
      if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    },
    init() {
      $$('dialog.modal').forEach((d) => {
        document.body.append(d); // خارج أي عنصر مخفي (مهم للطباعة)
        d.addEventListener('close', () => {
          if (!$$('dialog.modal[open]').length) document.body.style.overflow = '';
          const f = this.last.get(d);
          if (f && f.focus) f.focus();
        });
        // إغلاق بالنقر على الخلفية
        d.addEventListener('click', (e) => { if (e.target === d) this.close(d); });
      });

      document.addEventListener('click', (e) => {
        const t = e.target;
        const toolBtn = t.closest('[data-open-tool]');
        if (toolBtn) { this.open($('#dlg-' + toolBtn.dataset.openTool)); return; }
        if (t.closest('[data-open-charter]')) { this.open($('#charterModal')); return; }
        if (t.closest('[data-open-auth]')) { auth.open(); return; }
        // روابط الأدوات (مثل #tool-gpa) تفتح نافذة الأداة
        const link = t.closest('a[href^="#tool-"]');
        if (link) { e.preventDefault(); this.open($('#dlg-' + link.getAttribute('href').slice(6))); return; }
        const closeBtn = t.closest('[data-close-charter], [data-close-modal]');
        if (closeBtn) this.close(closeBtn.closest('dialog'));
      });

      $('#charterAgree').addEventListener('click', () => { store.set(LS.charter, true); this.close($('#charterModal')); });
    },
  };

  /* =====================================================
     التسجيل بالبريد الإلكتروني (اختياري)
     - مع CONFIG.FIREBASE: حساب حقيقي (بريد + كلمة مرور) عبر Firebase Auth.
     - بدونه: ملف محلي على جهاز الزائر فقط (لا كلمة مرور، لا خادم).
     ===================================================== */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const auth = {
    user: null,
    fb: null,
    mode: 'signup',

    isLocal() { return !this.fb; },

    async init() {
      this.bindUI();
      if (CONFIG.FIREBASE) {
        try {
          const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
          const [{ initializeApp }, A] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js')]);
          const a = A.getAuth(initializeApp(CONFIG.FIREBASE));
          a.languageCode = 'ar';
          this.fb = { A, a };
          this.configureUI();
          A.onAuthStateChanged(a, (u) => this.setUser(this.fromFb(u)));
          return;
        } catch (err) {
          console.warn('تعذّر تحميل Firebase، سيُستخدم الملف المحلي.', err);
          this.fb = null;
        }
      }
      this.configureUI();
      const p = store.get(LS.profile);
      this.setUser(p && typeof p.email === 'string' && EMAIL_RE.test(p.email)
        ? { name: typeof p.name === 'string' && p.name.trim() ? p.name : p.email.split('@')[0], email: p.email, local: true } : null);
    },

    fromFb(u) {
      return u ? { name: u.displayName || (u.email || '').split('@')[0], email: u.email, verified: u.emailVerified } : null;
    },

    bindUI() {
      $('#authTabs').addEventListener('click', (e) => {
        const b = e.target.closest('[data-mode]');
        if (b) this.setMode(b.dataset.mode);
      });
      $('#authForm').addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
      $('#authForgot').addEventListener('click', () => this.forgot());
      $('#authLogout').addEventListener('click', () => this.logout());
    },

    configureUI() {
      const local = this.isLocal();
      $('#authTabs').hidden = local;           // لا تبويب دخول في الوضع المحلي
      $('#fPass').hidden = local;              // لا كلمة مرور في الوضع المحلي
      $('#authLogout').textContent = local ? 'حذف ملفي من هذا الجهاز' : 'تسجيل الخروج';
      $('#authModeNote').textContent = local
        ? 'ملف محلي: يُحفظ اسمك وبريدك وفئتك على هذا الجهاز فقط ولا يُرسل إلى أي خادم، ولا يوجد حساب سحابي بعد.'
        : 'نستخدم بريدك الإلكتروني لتسجيل الدخول فقط. ولا يلزمك أي حساب لاستخدام المنصة.';
      this.setMode('signup');
    },

    setMode(mode) {
      this.mode = mode;
      const local = this.isLocal();
      $$('#authTabs [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      $('#fName').hidden = mode === 'login';
      $('#fAud').hidden = mode === 'login';
      $('#authSubmit').textContent = mode === 'login' ? 'دخول' : (local ? 'حفظ ملفي' : 'إنشاء الحساب');
      $('#authPass').setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
      $('#authForgot').hidden = !(this.fb && mode === 'login');
      this.msg('');
    },

    open() {
      this.showView();
      this.msg('');
      modals.open($('#authModal'));
    },

    msg(text, ok = false) {
      const m = $('#authMsg');
      m.textContent = text;
      m.classList.toggle('ok', ok);
    },

    showView(notice = '') {
      const u = this.user;
      $('#authGuest').hidden = !!u;
      $('#authUser').hidden = !u;
      $('#authTitle').textContent = u ? '👤 حسابك' : '👤 حسابك (اختياري)';
      if (u) {
        $('#accName').textContent = u.name;
        $('#accEmail').textContent = u.email;
        $('#accStatus').textContent = u.local ? 'ملف محلي على هذا الجهاز' : (u.verified ? 'البريد مؤكَّد ✓' : 'البريد غير مؤكَّد بعد — راجع بريدك');
        $('#accMsg').textContent = notice;
      }
    },

    setUser(u) {
      this.user = u;
      $('#authBtnText').textContent = u ? u.name.split(' ')[0] : (this.isLocal() ? 'ملفي المحلي' : 'تسجيل / دخول');
      $('#authBtn').setAttribute('aria-label', u ? `ملف ${u.name}` : 'الحساب والدخول الاختياري');
      if (u) {
        const p = store.get(LS.profile);
        if (p && p.email === u.email && p.audience) setAudience(p.audience, false); // يتذكّر فئتك
      }
      $('#waFloat').href = waLink('');
      if ($('#heroWaBtn')) $('#heroWaBtn').href = waLink('استشارة أكاديمية عامة');
      if ($('#authModal').open) this.showView();
    },

    async submit() {
      const email = $('#authEmail').value.trim();
      const pass = $('#authPass').value;
      const name = $('#authName').value.trim();
      const aud = $('#authAud').value;
      const signup = this.mode === 'signup';

      if (!EMAIL_RE.test(email)) return this.msg('يرجى إدخال بريد إلكتروني صحيح.');
      if (!this.isLocal()) {
        if (signup && pass.length < 8) return this.msg('كلمة المرور يجب ألا تقل عن 8 أحرف.');
        if (!signup && !pass) return this.msg('يرجى إدخال كلمة المرور.');
      }

      const btn = $('#authSubmit');
      btn.disabled = true;
      this.msg('');
      let notice = '';
      try {
        const nm = name || email.split('@')[0];
        if (this.isLocal()) {
          if (!store.set(LS.profile, { name: nm, email, audience: aud })) return this.msg('تعذّر حفظ ملفك؛ تخزين المتصفح غير متاح.');
          this.setUser({ name: nm, email, local: true });
          notice = 'تم حفظ ملفك على هذا الجهاز.';
        } else {
          const { A, a } = this.fb;
          if (signup) {
            const cred = await A.createUserWithEmailAndPassword(a, email, pass);
            try { await A.updateProfile(cred.user, { displayName: nm }); } catch { /* ignore */ }
            try { await A.sendEmailVerification(cred.user); } catch { /* ignore */ }
            store.set(LS.profile, { name: nm, email, audience: aud });
            this.setUser({ name: nm, email, verified: false });
            notice = 'تم إنشاء حسابك. أرسلنا رابط تأكيد إلى بريدك.';
          } else {
            await A.signInWithEmailAndPassword(a, email, pass);
            const p = store.get(LS.profile);
            if (!p || p.email !== email) store.set(LS.profile, { name: '', email, audience: '' });
            this.setUser(this.fromFb(a.currentUser));
            notice = 'تم تسجيل الدخول.';
          }
        }
        if (signup && aud) setAudience(aud);
        $('#authForm').reset();
        this.setMode(this.mode);
        this.showView(notice);
      } catch (err) {
        this.msg(this.errText(err));
      } finally {
        btn.disabled = false;
      }
    },

    async forgot() {
      const email = $('#authEmail').value.trim();
      if (!EMAIL_RE.test(email)) return this.msg('اكتب بريدك الإلكتروني أولاً ثم اضغط «نسيت كلمة المرور».');
      try {
        await this.fb.A.sendPasswordResetEmail(this.fb.a, email);
      } catch (err) {
        if (!/user-not-found/.test(err && err.code)) return this.msg(this.errText(err));
      }
      this.msg('إن كان البريد مسجلاً لدينا فقد أرسلنا رابط إعادة تعيين كلمة المرور.', true);
    },

    async logout() {
      if (this.isLocal() && !confirm('حذف الملف المحلي وبنود الترقية والمراجع المحفوظة من هذا المتصفح؟ صدّر أو انسخ ما تحتاجه أولاً.')) return;
      try { if (this.fb) await this.fb.A.signOut(this.fb.a); } catch { /* ignore */ }
      if (this.isLocal()) {
        for (const key of [LS.promo, LS.target, LS.references, LS.audience, LS.charter, LS.favorites, LS.workflow]) {
          if (!store.remove(key)) { $('#accMsg').textContent = 'تعذّر حذف البيانات؛ تحقق من إعدادات التخزين.'; return; }
        }
        promo.items = [];
        if ($('#promoTarget')) { $('#promoTarget').value = ''; promo.render(); }
        document.dispatchEvent(new Event('localprofiledeleted'));
        setAudience('all', false);
      }
      if (!store.remove(LS.profile)) { $('#accMsg').textContent = 'تعذّر حذف الملف المحلي.'; return; }
      this.setUser(null);
      this.showView();
    },

    errText(err) {
      const map = {
        'auth/email-already-in-use': 'هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.',
        'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
        'auth/weak-password': 'كلمة المرور ضعيفة. استخدم 8 أحرف أو أكثر.',
        'auth/user-not-found': 'البريد أو كلمة المرور غير صحيحة.',
        'auth/wrong-password': 'البريد أو كلمة المرور غير صحيحة.',
        'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة.',
        'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً.',
        'auth/network-request-failed': 'تعذّر الاتصال بالإنترنت.',
      };
      return map[err && err.code] || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    },
  };

  /* =====================================================
     التنقل (موبايل) + تفاصيل عامة
     ===================================================== */
  function initNav() {
    const toggle = $('#navToggle');
    const nav = $('#mainNav');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  /* ---------- التشغيل ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Old bookmarks continue to work after moving the tool directory.
    const redirectLegacyHash = () => {
      if ($('#toolTiles')) return false;
      if (['#tools', '#assistant', '#library'].includes(location.hash) || /^#tool-[a-z]+$/.test(location.hash)) {
        location.replace('tools.html' + location.hash); return true;
      }
      if (location.hash === '#services') { location.replace('services.html'); return true; }
      return false;
    };
    if (redirectLegacyHash()) return;
    $('#year').textContent = new Date().getFullYear();
    initNav();
    initGateway();
    if ($('#toolTiles')) {
      promo.init();
      initWordCounter();
      initSampleSize();
      initGpa();
      initReferences();
      initUnits();
      initQuiz();
    }
    modals.init();
    auth.init();
    if ($('#serviceRequestModal')) MunjizServiceAssistant.init({
      services: SERVICES, categories: MunjizAcademicServices.categories,
      openDialog: dialog => modals.open(dialog),
    });
    MunjizVisitorCounter.init();
    if (location.hash === '#account') auth.open();
    const openLinkedTool = () => {
      if (!$('#toolTiles') || !/^#tool-[a-z]+$/.test(location.hash)) return;
      const id = location.hash.slice(6);
      const button = $(`.tool-tile[data-open-tool="${id}"]`);
      if (button) { (button.querySelector('.tool-open') || button).focus(); modals.open($('#dlg-' + id)); }
    };
    window.addEventListener('hashchange', () => { if (!redirectLegacyHash()) openLinkedTool(); });
    openLinkedTool();
  });

})();
