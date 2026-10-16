/* =====================================================
   Munjaz Academic — app logic
   ===================================================== */
(() => {
  'use strict';

  /* ---------- الإعدادات العامة ---------- */
  const CONFIG = {
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
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
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

  /* ---------- تيليجرام: الاسم من إعدادات الخدمات المشتركة ---------- */
  function telegramLink() {
    return `https://t.me/${window.AcademicServicesConfig.telegramBotUsername}`;
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
    $('#telegramFloat').href = telegramLink();
    if ($('#heroTelegramBtn')) $('#heroTelegramBtn').href = telegramLink();
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

    setAudience('all');
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
      this.items = Array.isArray(saved) ? saved.filter((x) => x && Number.isFinite(+x.points) && Number.isFinite(+x.count)) : [];
      const t = store.get(LS.target, '');
      if (t) $('#promoTarget').value = t;

      // أزرار المراتب الأكاديمية المستهدفة
      const rankBtns = $$('.promo-rank-btn');
      const syncRankBtns = (targetVal) => {
        rankBtns.forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.target === String(targetVal));
        });
      };
      if (t) syncRankBtns(t);

      rankBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const tgt = btn.dataset.target;
          $('#promoTarget').value = tgt;
          store.set(LS.target, tgt);
          syncRankBtns(tgt);
          this.render();
        });
      });

      $('#promoForm').addEventListener('submit', (e) => { e.preventDefault(); this.add(); });
      $('#promoBody').addEventListener('click', (e) => {
        const b = e.target.closest('.row-del');
        if (b) this.remove(b.dataset.id);
      });
      $('#promoTarget').addEventListener('input', () => {
        const val = $('#promoTarget').value;
        store.set(LS.target, val);
        syncRankBtns(val);
        this.render();
      });
      $('#promoClear').addEventListener('click', () => {
        if (this.items.length && confirm('هل تريد مسح جميع البنود المدخلة في الكشف؟')) { this.items = []; this.save(); this.render(); }
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
      const count = parseInt($('#promoCount').value, 10);

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
    save() { store.set(LS.promo, this.items); },
    total() { return this.items.reduce((s, x) => s + x.points * x.count, 0); },
    render() {
      const body = $('#promoBody');
      body.replaceChildren();
      this.items.forEach((x, i) => {
        const del = el('button', { type: 'button', class: 'row-del', 'data-id': x.id, 'aria-label': `حذف البند ${i + 1}`, text: '✕' });
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
          ? `✓ مؤهل أكاديمياً: بلغت ${fmt(total)} نقطة وتجاوزت الحد الأدنى للترقية (${fmt(target)}) بفارق +${fmt(total - target)} نقطة.`
          : `قيد الإنجاز (${fmt(pct)}%): مجموعك الحالي ${fmt(total)} نقطة، والمتبقي للوصول للحد الأدنى ${fmt(target - total)} نقطة من أصل ${fmt(target)}.`;
      } else {
        bar.firstElementChild.style.width = '0';
        bar.setAttribute('aria-valuenow', '0');
        txt.textContent = 'أدخل النقاط المطلوبة أو حدد المرتبة أعلاه لعرض نسبة الإنجاز والجاهزية.';
      }
    },
    csv() {
      if (!this.items.length) return this.msg('لا توجد بنود للتصدير.');
      this.msg('');
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const safe = (v) => (/^[=+\-@\t\r]/.test(String(v)) ? "'" + v : v);
      const rows = [['#', 'البند', 'الوصف', 'النقاط', 'العدد', 'المجموع']];
      this.items.forEach((x, i) => rows.push([i + 1, safe(x.type), safe(x.title), x.points, x.count, x.points * x.count]));
      rows.push(['', '', '', '', 'المجموع التراكمي للنقاط', this.total()]);
      const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = el('a', { href: url, download: 'promotion-points-munjaz.csv' });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };

  /* =====================================================
     عداد ومحلل النصوص والرسائل الأكاديمية
     ===================================================== */
  function initWordCounter() {
    const ta = $('#wcText');
    const limitEl = $('#wcLimit');
    const wordRe = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
    const stopWords = new Set([
      'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'التي', 'الذي', 'الذين', 'اللواتي', 'أن', 'إن', 'كان', 'كانت',
      'يكون', 'تكون', 'هو', 'هي', 'هم', 'هن', 'ما', 'لا', 'لم', 'لن', 'أو', 'ثم', 'قد', 'بين', 'حيث', 'كل', 'ذلك', 'تلك',
      'تم', 'تمت', 'كما', 'أيضا', 'أيضاً', 'فإن', 'وقد', 'ومن', 'وفي', 'وعلى', 'وإلى', 'وهو', 'وهي', 'هناك', 'خلال', 'بعد',
      'قبل', 'عند', 'نحو', 'حول', 'غير', 'سوف', 'إذ', 'إذا', 'إلا', 'لدى', 'حتى', 'معظم', 'بعض', 'أحد', 'إحدى', 'the', 'of',
      'and', 'to', 'in', 'a', 'is', 'that', 'for', 'it', 'as', 'was', 'with', 'on', 'by', 'at', 'an', 'be', 'this'
    ]);

    const update = () => {
      const text = ta.value;
      const matches = text.match(wordRe) || [];
      const words = matches.length;
      const chars = [...text].length;
      const noSpace = [...text.replace(/\s/g, '')].length;
      const sentences = text.split(/[.!?؟…\n]+/).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
      const mins = words / 180; // قراءة صامتة
      const speechMins = words / 130; // إلقاء ومناقشة
      const pages = words > 0 ? (words / 250).toFixed(1) : '0';
      const avgSent = sentences > 0 ? (words / sentences).toFixed(1) : '0';

      $('#wcWords').textContent = fmt(words);
      const pagesEl = $('#wcPages');
      if (pagesEl) pagesEl.textContent = pages;
      $('#wcChars').textContent = fmt(chars);
      $('#wcNoSpace').textContent = fmt(noSpace);
      $('#wcSentences').textContent = fmt(sentences);
      const avgSentEl = $('#wcAvgWordPerSent');
      if (avgSentEl) avgSentEl.textContent = `${avgSent} ك/جملة`;
      $('#wcTime').textContent = words === 0 ? '0 د' : mins < 1 ? 'أقل من دقيقة' : `${Math.ceil(mins)} د`;
      const speechEl = $('#wcSpeechTime');
      if (speechEl) speechEl.textContent = words === 0 ? '0 د' : speechMins < 1 ? 'أقل من دقيقة' : `${Math.ceil(speechMins)} د`;

      // الكلمات الأكثر تكراراً
      const kwBox = $('#wcKeywordsList');
      if (kwBox) {
        if (words < 5) {
          kwBox.innerHTML = '<span style="font-size: .8rem; color: #888;">ابدأ بكتابة نص ليتم حصر الكلمات المفتاحية تلقائياً...</span>';
        } else {
          const freq = {};
          matches.forEach((w) => {
            const clean = w.toLowerCase().replace(/^[ووبفلك]+(?=[\u0621-\u064A]{3,})/u, '');
            const target = clean.length >= 3 ? clean : w.toLowerCase();
            if (target.length >= 3 && !stopWords.has(target)) {
              freq[target] = (freq[target] || 0) + 1;
            }
          });
          const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 7);
          if (sorted.length === 0) {
            kwBox.innerHTML = '<span style="font-size: .8rem; color: #888;">لم يتم العثور على كلمات مكررة ملحوظة.</span>';
          } else {
            kwBox.replaceChildren();
            sorted.forEach(([word, count]) => {
              const chip = el('span', { class: 'kw-chip' },
                el('span', { text: word }),
                el('strong', { text: String(count) })
              );
              kwBox.append(chip);
            });
          }
        }
      }

      const lim = parseInt(limitEl.value, 10);
      const msg = $('#wcLimitMsg');
      if (lim > 0) {
        const diff = lim - words;
        msg.className = 'limit-msg ' + (diff >= 0 ? 'ok' : 'over');
        msg.textContent = diff >= 0 ? `متبقٍ ${fmt(diff)} كلمة من الحد الأقصى (${fmt(lim)}).` : `تجاوزت الحد المسموح به بـ ${fmt(-diff)} كلمة.`;
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
     حجم العينة (معادلة كوكران وتوليد منهجية الأطروحة)
     ===================================================== */
  function initSampleSize() {
    const ids = ['ssPop', 'ssConf', 'ssMargin', 'ssP', 'ssResp'];
    const out = $('#ssResult');
    const det = $('#ssDetail');
    const quoteEl = $('#ssQuoteText');

    const calc = () => {
      const N = parseFloat($('#ssPop').value);
      const z = parseFloat($('#ssConf').value);
      const e = parseFloat($('#ssMargin').value) / 100;
      const p = parseFloat($('#ssP').value) / 100;
      const resp = parseFloat($('#ssResp').value) / 100;

      if (!(e > 0 && e < 0.5) || !(p > 0 && p < 1) || !(resp > 0 && resp <= 1)) {
        out.textContent = '—';
        det.textContent = 'تحقق من القيم المدخلة (هامش الخطأ 0.5–50، النسبة 1–99، الاستجابة 1–100).';
        if (quoteEl) quoteEl.textContent = 'يرجى إدخال قيم صالحة لتوليد الفقرة المنهجية المعتمدة.';
        return;
      }
      const n0 = (z * z * p * (1 - p)) / (e * e);
      let n = n0;
      let isFinitePop = false;
      let note = `العينة قبل التصحيح: ${Math.ceil(n0)}`;
      if (Number.isFinite(N) && N > 0) {
        isFinitePop = true;
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

      // توليد صيغة الفصل الثالث الأكاديمية
      if (quoteEl) {
        const confPct = z === 1.645 ? '90%' : z === 2.576 ? '99%' : '95%';
        const marginPct = (e * 100).toFixed(1).replace(/\.0$/, '') + '%';
        const popPhrase = isFinitePop
          ? `نظراً لمعرفة حجم المجتمع الإحصائي الكلي البالغ (N = ${fmt(N)}) مفردة، تم تطبيق معادلة تصحيح المجتمع المحدود (Finite Population Correction)،`
          : `نظراً لاتساع مجتمع الدراسة وعدم حصره بدقة (Infinite Population)،`;
        const respPhrase = resp < 1
          ? `، ولتعويض معدل عدم الاستجابة المتوقع (${Math.round(resp * 100)}%) استوجب توزيع (${fmt(Math.ceil(n / resp))}) استبانة لضمان استرداد الحد الأدنى المطلوب`
          : '';

        quoteEl.textContent = `«تم تحديد حجم العينة الممثلة للدراسة الحالية وفقاً لمعادلة كوكران (Cochran, 1977) عند مستوى ثقة قدره (${confPct}؛ Z = ${z}) وهامش خطأ مسموح به (e = ±${marginPct}) وبافتراض نسبة التباين القصوى (P = 0.50) لضمان أقصى درجات التمثيل والحياد الإحصائي. و${popPhrase} استقر الحد الأدنى العلمي لحجم العينة المعتمدة عند (n = ${n}) مستجيباً/مفردة${respPhrase}، بما يحقق الكفاية الإحصائية المعتمدة أكاديمياً لتعميم النتائج.»`;
      }
    };
    ids.forEach((id) => $('#' + id).addEventListener('input', calc));
    calc();

    const copyBtn = $('#ssCopyQuoteBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (quoteEl && quoteEl.textContent) {
          navigator.clipboard.writeText(quoteEl.textContent.trim());
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>تم نسخ الفقرة للأطروحة بنجاح ✓</span>';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
        }
      });
    }
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
        maxV = '5';
        stepV = '0.01';
      }

      const row = el('div', { class: 'gpa-row' },
        el('input', { type: 'text', class: 'g-name', placeholder: 'اسم المقرر', maxlength: '60', value: name }),
        el('input', { type: 'number', class: 'g-units', placeholder: phW, min: '0.5', step: '0.5', inputmode: 'decimal', value: w }),
        el('input', { type: 'number', class: 'g-mark', placeholder: phV, min: '0', max: maxV, step: stepV, inputmode: 'decimal', value: val }),
        el('button', { type: 'button', class: 'row-del', 'aria-label': 'حذف المقرر', text: '✕' }),
      );
      wrap.append(row);
    };

    const calc = () => {
      let sumW = 0;
      let sumWeighted = 0;
      let hasFx = false;

      $$('.gpa-row', wrap).forEach((r) => {
        const w = parseFloat($('.g-units', r).value);
        const v = parseFloat($('.g-mark', r).value);
        if (w > 0 && Number.isFinite(v) && v >= 0) {
          sumW += w;
          sumWeighted += w * v;
          if (mode === 'bologna' && v >= 45 && v < 50) hasFx = true;
        }
      });

      if (!sumW) {
        resEl.textContent = '—';
        grdEl.textContent = 'أدخل المقررات والوحدات والدرجات لحساب النتيجة.';
        detEl.textContent = '';
        return;
      }

      const avg = sumWeighted / sumW;

      if (mode === 'percent') {
        resLbl.textContent = 'المعدل المئوي الموزون';
        resEl.textContent = `${fmt(Math.round(avg * 100) / 100)}%`;
        const grade = avg >= 90 ? 'امتياز (Excellent)' : avg >= 80 ? 'جيد جداً (Very Good)' : avg >= 70 ? 'جيد (Good)' : avg >= 60 ? 'متوسط (Medium)' : avg >= 50 ? 'مقبول (Pass)' : 'راسب (Fail)';
        grdEl.textContent = `التقدير العام: ${grade}`;
        detEl.textContent = `إجمالي عدد الوحدات الموزونة: ${fmt(sumW)}`;
      } else if (mode === 'bologna') {
        resLbl.textContent = 'معدل بولونيا ECTS التراكمي';
        resEl.textContent = `${fmt(Math.round(avg * 100) / 100)}%`;
        let grade = avg >= 90 ? 'امتياز (A - Excellent)' : avg >= 80 ? 'جيد جداً (B - Very Good)' : avg >= 70 ? 'جيد (C - Good)' : avg >= 60 ? 'متوسط (D - Medium)' : avg >= 50 ? 'مقبول (E - Pass)' : (avg >= 45 ? 'راسب مشروط (FX - Fail)' : 'راسب (F - Fail)');
        if (hasFx) grade += ' [توجد مقررات في نطاق FX تتطلب معالجة]';
        grdEl.textContent = `التصنيف الوزاري: ${grade}`;
        detEl.textContent = `إجمالي وحدات ECTS المدخلة: ${fmt(sumW)} (الفصل المرجعي = 30 ECTS)`;
      } else {
        resLbl.textContent = 'معدل نقاط GPA المحسوب';
        resEl.textContent = fmt(Math.round(avg * 1000) / 1000);
        const grade = avg >= 3.7 ? 'مرتبة شرف / امتياز' : avg >= 3.0 ? 'جيد جداً' : avg >= 2.5 ? 'جيد' : avg >= 2.0 ? 'مقبول' : 'إنذار أكاديمي';
        grdEl.textContent = `التقدير التقريبي: ${grade}`;
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
    reset();
  }

  /* =====================================================
     TOOL-02 | منشئ وموثّق المراجع العلمية (DOI / APA 7 / IEEE / MLA 9 / BibTeX)
     ===================================================== */
  function initReferences() {
    let currentStyle = 'apa'; // 'apa' | 'ieee' | 'mla' | 'bibtex'
    const savedList = [];

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

    const formatInText = (d) => {
      if (!d.authors) return '(المؤلف، ' + (d.year || 'د.ت') + ')';
      const parts = d.authors.split(/[;؛]/).map((a) => a.trim()).filter(Boolean);
      const first = parts[0].split(/[,،]/)[0].trim() || parts[0];
      if (currentStyle === 'ieee') return '[1]';
      if (currentStyle === 'mla') return parts.length > 2 ? `(${first} et al.)` : `(${first})`;
      if (parts.length === 1) return `(${first}، ${d.year || 'د.ت'})`;
      if (parts.length === 2) {
        const second = parts[1].split(/[,،]/)[0].trim() || parts[1];
        return `(${first} و ${second}، ${d.year || 'د.ت'})`;
      }
      return `(${first} وآخرون، ${d.year || 'د.ت'})`;
    };

    const formatRefListHtml = (d) => {
      if (!d.authors && !d.title) return 'أدخل بيانات المرجع أو اجلبها عبر DOI لعرض التوثيق الأكاديمي المعتمد.';
      const a = d.authors || 'اسم المؤلف';
      const y = d.year ? `(${d.year})` : '(د.ت)';
      const t = d.title || 'عنوان البحث';
      const jHtml = d.journal ? `<i>${d.journal}</i>` : '';
      const v = d.volume ? d.volume : '';
      const i = d.issue ? `(${d.issue})` : '';
      const p = d.pages ? `, ${d.pages}` : '';
      const u = d.url ? ` <span dir="ltr">${d.url}</span>` : '';

      if (currentStyle === 'apa') {
        const volHtml = v ? `, <i>${v}</i>${i}` : (i ? `, ${i}` : '');
        return `${a} ${y}. ${t}. ${jHtml}${volHtml}${p}.${u}`;
      }
      if (currentStyle === 'mla') {
        const volMla = v ? `, vol. ${v}` : '';
        const issMla = i ? `, no. ${d.issue}` : '';
        const yrMla = d.year ? `, ${d.year}` : '';
        const ppMla = d.pages ? `, pp. ${d.pages}` : '';
        return `${a}. "${t}." ${jHtml}${volMla}${issMla}${yrMla}${ppMla}.${u}`;
      }
      // IEEE
      const volIeee = v ? `vol. ${v}, ` : '';
      const issIeee = i ? `no. ${d.issue}, ` : '';
      const ppIeee = d.pages ? `pp. ${d.pages}, ` : '';
      const yrIeee = d.year ? `${d.year}.` : '';
      return `[1] ${a}, "${t}," ${jHtml}, ${volIeee}${issIeee}${ppIeee}${yrIeee}${u}`;
    };

    const formatBibtex = (d) => {
      if (!d.authors && !d.title) return '% أدخل بيانات المرجع أو اجلبها عبر DOI لتوليد كود BibTeX للنشر.';
      const parts = d.authors.split(/[;؛]/).map((a) => a.trim()).filter(Boolean);
      const firstAuthor = parts[0] ? parts[0].split(/[,،]/)[0].trim().replace(/\s+/g, '') : 'ref';
      const yr = d.year || '2024';
      const citeKey = `${firstAuthor.toLowerCase()}${yr}`;
      const authorsBib = parts.join(' and ') || 'Unknown';
      const doi = d.url ? d.url.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '') : '';
      return `@article{${citeKey},
  author  = {${authorsBib}},
  title   = {{${d.title || 'Untitled Article'}}},
  journal = {${d.journal || 'Journal Name'}},
  year    = {${yr}},
  volume  = {${d.volume || ''}},
  number  = {${d.issue || ''}},
  pages   = {${d.pages || ''}},
  doi     = {${doi}},
  url     = {${d.url || ''}}
}`;
    };

    const updatePreviews = () => {
      const data = getRefData();
      const inTextEl = $('#previewInText');
      const refListEl = $('#previewRefList');
      const bibtexEl = $('#previewBibtex');

      if (inTextEl) inTextEl.textContent = formatInText(data);
      if (refListEl) refListEl.innerHTML = formatRefListHtml(data);
      if (bibtexEl) bibtexEl.textContent = formatBibtex(data);
    };

    // DOI Fetching via Crossref REST API
    const doiBtn = $('#refDoiBtn');
    if (doiBtn) {
      doiBtn.addEventListener('click', async () => {
        const input = $('#refDoiInput').value.trim();
        const msg = $('#refDoiMsg');
        if (!input) {
          msg.textContent = 'يرجى إدخال معرّف DOI صالح.';
          msg.className = 'form-msg';
          return;
        }
        const cleanDoi = input.replace(/^(https?:\/\/)?(dx\.)?doi\.org\//i, '').replace(/^doi:/i, '').trim();
        msg.textContent = 'جاري الاتصال بقاعدة Crossref وجلب البيانات الرسمية...';
        msg.className = 'form-msg ok';
        doiBtn.disabled = true;

        try {
          const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
            headers: { Accept: 'application/json' },
          });
          if (!res.ok) throw new Error('لم يتم العثور على المعرف في Crossref.');
          const json = await res.json();
          const item = json.message || {};

          $('#refTitle').value = (item.title && item.title[0]) || '';
          if (item.author && Array.isArray(item.author)) {
            $('#refAuthors').value = item.author.map((x) => `${x.family || ''}, ${x.given ? x.given[0] + '.' : ''}`).filter(Boolean).join('; ');
          }
          $('#refJournal').value = (item['container-title'] && item['container-title'][0]) || item.publisher || '';
          const dateParts = item['published-print']?.['date-parts'] || item['published-online']?.['date-parts'] || item.created?.['date-parts'];
          $('#refYear').value = (dateParts && dateParts[0] && dateParts[0][0]) || '';
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
          doiBtn.disabled = false;
        }
      });
    }

    // Style Switcher Tabs (APA 7, IEEE, MLA 9, BibTeX)
    const setStyle = (style) => {
      currentStyle = style;
      $$('.citation-tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.style === style);
      });
      const stdBox = $('#citationStandardBox');
      const bibBox = $('#citationBibtexBox');
      if (style === 'bibtex') {
        if (stdBox) stdBox.hidden = true;
        if (bibBox) bibBox.hidden = false;
      } else {
        if (stdBox) stdBox.hidden = false;
        if (bibBox) bibBox.hidden = true;
      }
      updatePreviews();
    };

    $$('.citation-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => setStyle(btn.dataset.style));
    });

    const refForm = $('#refForm');
    if (refForm) refForm.addEventListener('input', updatePreviews);

    // Copying buttons
    const flashBtn = (btn, text = 'تم النسخ ✓') => {
      const orig = btn.innerHTML;
      btn.innerHTML = `<span>${text}</span>`;
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    };

    const copyInText = $('#copyInTextBtn');
    if (copyInText) {
      copyInText.addEventListener('click', () => {
        navigator.clipboard.writeText($('#previewInText').textContent.trim());
        flashBtn(copyInText, 'تم نسخ الاستشهاد ✓');
      });
    }

    const copyRef = $('#copyRefBtn');
    if (copyRef) {
      copyRef.addEventListener('click', () => {
        const refEl = $('#previewRefList');
        navigator.clipboard.writeText(refEl.textContent.trim());
        flashBtn(copyRef, 'تم نسخ المرجع ✓');
      });
    }

    const copyBibtex = $('#copyBibtexBtn');
    if (copyBibtex) {
      copyBibtex.addEventListener('click', () => {
        const bibEl = $('#previewBibtex');
        navigator.clipboard.writeText(bibEl.textContent.trim());
        flashBtn(copyBibtex, 'تم نسخ كود BibTeX ✓');
      });
    }

    // Add to saved list
    const addToList = $('#addRefToList');
    if (addToList) {
      addToList.addEventListener('click', () => {
        const refHtml = $('#previewRefList').innerHTML;
        const refText = $('#previewRefList').textContent;
        if (refText && !refText.startsWith('أدخل')) {
          savedList.push(refHtml);
          $('#savedRefsWrapper').hidden = false;
          $('#copyAllRefsBtn').hidden = false;
          $('#savedRefsCount').textContent = String(savedList.length);
          const li = el('li', {});
          li.innerHTML = refHtml;
          $('#savedRefsList').append(li);
          flashBtn(addToList, 'تمت الإضافة للقائمة ✓');
        }
      });
    }

    const copyAllRefs = $('#copyAllRefsBtn');
    if (copyAllRefs) {
      copyAllRefs.addEventListener('click', () => {
        const cleanTexts = savedList.map((r, i) => {
          const tmp = document.createElement('div');
          tmp.innerHTML = r;
          return `${i + 1}. ${tmp.textContent.trim()}`;
        });
        navigator.clipboard.writeText(cleanTexts.join('\n\n'));
        flashBtn(copyAllRefs, 'تم نسخ كافة المراجع ✓');
      });
    }

    const clearRefs = $('#clearRefsBtn');
    if (clearRefs) {
      clearRefs.addEventListener('click', () => {
        if (refForm) refForm.reset();
        $('#refDoiInput').value = '';
        $('#refDoiMsg').textContent = '';
        updatePreviews();
      });
    }

    updatePreviews();
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

        let result = inCelsius;
        if (toKey === 'k') result = inCelsius + 273.15;
        else if (toKey === 'f') result = inCelsius * (9 / 5) + 32;

        outRes.textContent = fmt(Math.round(result * 1000) / 1000);
        eqDesc.textContent = `تحويل إزاحي: K = °C + 273.15 | °F = °C × 1.8 + 32`;
        return;
      }

      const fromFactor = UNITS_DATA[cat].units[fromKey].f;
      const toFactor = UNITS_DATA[cat].units[toKey].f;
      const inBase = v * fromFactor;
      const result = inBase / toFactor;

      outRes.textContent = Math.abs(result) < 1e-4 || Math.abs(result) > 1e6 ? result.toExponential(4) : fmt(Math.round(result * 10000) / 10000);
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
      navigator.clipboard.writeText(outRes.textContent);
      const btn = $('#unitCopyBtn');
      btn.textContent = 'تم النسخ ✓';
      setTimeout(() => { btn.textContent = '📋 نسخ النتيجة'; }, 1800);
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
        { q: 'أي مقياس من مقاييس النزعة المركزية هو الأقل تأثراً بالقيم المتطرفة (Outliers)؟', opts: ['الوسيط (Median)', 'المتوسط الحسابي (Mean)', 'المدى (Range)', 'التباين (Variance)'], a: 0, exp: 'الوسيط يعتمد على الترتيب الموقعي للبيانات فلا يتأثر بالقيم الشاذة كالمتوسط الحسابي.' },
        { q: 'يُستخدم اختبار (Paired Samples t-test) لقياس الفروق القبلية والبعدية لنفس المجموعة.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، لأنه يقارن قياسين مرتبطين لنفس الأفراد قبل المعالجة وبعدها.' },
        { q: 'عندما لا تتوزع البيانات توزيعاً طبيعياً في عينات صغيرة، يُفضل استخدام:', opts: ['الاختبارات اللامعلمية مثل Mann-Whitney وWilcoxon', 'تحليل التباين المعلمي فقط', 'حذف نصف البيانات عشوائياً', 'تجاهل شرط التوزيع الطبيعي دائماً'], a: 0, exp: 'الاختبارات اللامعلمية (Non-parametric) هي البديل الإحصائي السليم عند اختلال التوزيع الطبيعي.' },
        { q: 'الانحراف المعياري يساوي الجذر التربيعي الموجب للتباين.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، الانحراف المعياري يعيد وحدة القياس إلى أصلها بأخذ الجذر التربيعي للتباين.' },
        { q: 'ماذا يقيس معامل التحديد (R²) في تحليل الانحدار الخطي؟', opts: ['نسبة التباين المفسَّر في المتغير التابع بواسطة المتغير المستقل', 'حجم العينة المثالي للدراسة', 'درجة ثبات أداة القياس فقط', 'عدد القيم المفقودة في البيانات'], a: 0, exp: 'معامل التحديد يوضح النسبة المئوية للتغير في المتغير التابع التي يفسرها نموذج الانحدار.' },
      ],
      ethics: [
        { q: 'وفق أسلوب APA 7، كيف يُوثق مرجع لثلاثة مؤلفين أو أكثر داخل المتن منذ الإشارة الأولى؟', opts: ['اسم المؤلف الأول متبوعاً بـ (وآخرون / et al.) وسنة النشر', 'ذكر جميع أسماء المؤلفين في كل مرة', 'كتابة عنوان الكتاب فقط بدون سنة', 'وضع رقم المرجع بين قوسين مربعين فقط'], a: 0, exp: 'في الإصدار السابع من APA، يُكتفى بذكر المؤلف الأول متبوعاً بـ et al. أو (وآخرون) من أول اقتباس متني.' },
        { q: 'يُعد إعادة صياغة فكرة باحث آخر بأسلوبك الخاص دون الإشارة إلى مصدره نوعاً من الاستلال العلمي.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، نسبة الفكرة العلمية لصاحبها واجبة حتى عند إعادة الصياغة بالكامل.' },
        { q: 'متى يلزم ذكر رقم الصفحة في التوثيق المتني وفق نظام APA 7؟', opts: ['عند الاقتباس النصي المباشر (Direct Quotation)', 'عند الإشارة العامة لفكرة كتاب كامل', 'لا يُذكر رقم الصفحة إطلاقاً في APA 7', 'في قائمة المراجع النهائية فقط'], a: 0, exp: 'الاقتباس الحرفي المباشر يتطلب ذكر المؤلف والسنة ورقم الصفحة (ص. أو p.).' },
        { q: 'الانتحال الذاتي (Self-Plagiarism) يعني إعادة نشر الباحث لعمله السابق كأنه بحث جديد دون إفصاح.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، تكرار نشر نفس البيانات أو النص دون إشارة واضحة للعمل السابق يُعد مخالفة لأخلاقيات النشر.' },
        { q: 'ما هو المعرّف الرقمي المفضل إرفاقه في نهاية كل مرجع حديث في قائمة مراجع APA 7؟', opts: ['رابط المعرّف الرقمي للوثيقة (https://doi.org/...)', 'رقم هاتف الناشر', 'تاريخ طباعة المسودة الأولى', 'عدد كلمات المقالة'], a: 0, exp: 'يُوصي دليل APA 7 بإدراج رابط DOI الكامل بصيغة رابط فعال كلما توفر.' },
      ],
      bologna: [
        { q: 'تعتمد الوحدات الأوروبية (ECTS) في مسار بولونيا على عبء العمل الكلي للطالب وليس ساعات المحاضرة فقط.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، وحدة ECTS تشمل ساعات المحاضرات والمختبرات والدراسة الذاتية وإعداد المشاريع والامتحانات.' },
        { q: 'كم يبلغ مجموع وحدات ECTS المعتادة للسنة الدراسية الكاملة (فصلين دراسيين)؟', opts: ['60 وحدة ECTS (30 وحدة لكل فصل دراسي)', '15 وحدة ECTS فقط', '120 وحدة ECTS في الفصل الواحد', '10 وحدات ECTS للسنة كاملة'], a: 0, exp: 'المعيار القياسي في مسار بولونيا هو 30 ECTS للفصل الدراسي الواحد و60 ECTS للسنة الأكاديمية.' },
        { q: 'يركز التقييم التكويني المستمر (Formative Assessment) في مسار بولونيا على نشاط الطالب طوال الفصل.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، يوزع التقييم بين المهام الفصلية، الكويزات، التقارير، والمشاريع إلى جانب الامتحان النهائي.' },
        { q: 'ماذا تمثل مخرجات التعلم المتوقعة (Learning Outcomes) في وصف المقرر؟', opts: ['ما يجب أن يعرفه الطالب ويفهمه ويكون قادراً على تطبيقه بعد إتمام المقرر', 'جدول العطل الرسمية للجامعة', 'أسماء التدريسيين في القسم فقط', 'قائمة الكتب المفقودة في المكتبة'], a: 0, exp: 'مخرجات التعلم تحدد المهارات والمعارف القابلة للقياس التي يكتسبها الطالب بنهاية الفصل.' },
        { q: 'تعادل وحدة ECTS الواحدة في دليل مسار بولونيا ما يقارب 25 إلى 30 ساعة عمل طلابي إجمالي.', opts: ['صح', 'خطأ'], a: 0, exp: 'صحيح، العبء الدراسي لوحدة ECTS واحدة يُقدّر بنحو 25-30 ساعة شاملة الساعات المجدولة وغير المجدولة.' },
      ],
    };

    function buildCustomQuestions(rawText) {
      const sentences = rawText
        .split(/[.!؟\n؛]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 20);
      if (!sentences.length) return [];
      const generated = [];
      sentences.forEach((sent, idx) => {
        const words = sent.split(/\s+/).filter((w) => w.length > 3);
        generated.push({
          q: `وفقاً لنص المحاضرة: «${sent}» — هذه العبارة تتفق مع ما ورد في النص.`,
          opts: ['صح', 'خطأ'],
          a: 0,
          exp: 'العبارة مأخوذة مباشرة من النقاط الأساسية التي أدخلتها في نص المحاضرة.',
        });
        if (words.length >= 4) {
          const targetWord = words[Math.min(2, words.length - 1)];
          const blanked = sent.replace(targetWord, '______');
          const distractors = ['العشوائية غير المنتظمة', 'المتغيرات الخارجية فقط', 'الفرضية البديلة المطلقة']
            .filter((d) => d !== targetWord);
          generated.push({
            q: `أكمل الفراغ وفقاً للنص المرفق: «${blanked}»`,
            opts: [targetWord, ...distractors.slice(0, 3)],
            a: 0,
            exp: `الكلمة الصحيحة من النص الأصلي هي: «${targetWord}».`,
          });
        }
      });
      return generated;
    }

    let activeQuestions = [];
    let currentIdx = 0;
    let userAnswers = {};

    const step1Tab = $('#qStep1Tab');
    const step2Tab = $('#qStep2Tab');
    const step3Tab = $('#qStep3Tab');
    const setupView = $('#quizSetupView');
    const playView = $('#quizPlayView');
    const reportView = $('#quizReportView');

    const switchQuizStep = (step) => {
      [step1Tab, step2Tab, step3Tab].forEach((t) => t.classList.remove('active'));
      setupView.hidden = true;
      playView.hidden = true;
      reportView.hidden = true;

      if (step === 1) {
        step1Tab.classList.add('active');
        setupView.hidden = false;
      } else if (step === 2) {
        step2Tab.classList.add('active');
        playView.hidden = false;
      } else if (step === 3) {
        step3Tab.classList.add('active');
        reportView.hidden = false;
      }
    };

    const renderQuestion = () => {
      const item = activeQuestions[currentIdx];
      $('#quizCurrentProgress').textContent = `السؤال ${currentIdx + 1} من ${activeQuestions.length}`;
      $('#quizProgressBar').style.width = `${((currentIdx + 1) / activeQuestions.length) * 100}%`;
      $('#qCurrentText').textContent = item.q;

      const optsBox = $('#qCurrentOptions');
      optsBox.replaceChildren();

      item.opts.forEach((optText, i) => {
        const isSelected = userAnswers[currentIdx] === i;
        const optBtn = el('button', {
          type: 'button',
          class: `q-opt ${isSelected ? 'selected' : ''}`,
          text: optText,
        });
        optBtn.addEventListener('click', () => {
          userAnswers[currentIdx] = i;
          renderQuestion();
        });
        optsBox.append(optBtn);
      });

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
          (!isCorrect ? el('div', { style: 'color: #1E8E4E; font-weight: 700; margin-top: .2rem;' },
            el('span', { text: `الإجابة المعتمدة: ${correctText}` }),
          ) : el('span')),
          el('div', { class: 'q-explain', text: `التفسير العلمي: ${item.exp}` }),
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
      const count = parseInt($('#quizCountSelect').value, 10) || 5;
      const qType = $('#quizTypeSelect') ? $('#quizTypeSelect').value : 'mixed';
      const customText = $('#quizCustomText') ? $('#quizCustomText').value.trim() : '';

      let basePool = [];
      if (customText.length >= 20) {
        basePool = buildCustomQuestions(customText);
      }
      if (preset !== 'custom' && QUIZ_PRESETS[preset]) {
        basePool = basePool.concat(QUIZ_PRESETS[preset]);
      }
      if (!basePool.length) {
        basePool = [].concat(
          QUIZ_PRESETS['research-methods'],
          QUIZ_PRESETS.statistics,
          QUIZ_PRESETS.ethics,
          QUIZ_PRESETS.bologna
        );
      }

      let filtered = basePool.filter((item) => {
        const isTf = item.opts.length === 2;
        if (qType === 'tf') return isTf;
        if (qType === 'mcq') return !isTf;
        return true;
      });
      if (!filtered.length) filtered = basePool;

      // Pick questions
      activeQuestions = filtered.slice(0, count);
      currentIdx = 0;
      userAnswers = {};
      switchQuizStep(2);
      renderQuestion();
    });

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
      this.setUser(p && p.email ? { name: p.name || p.email.split('@')[0], email: p.email, local: true } : null);
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
      $('#authBtnText').textContent = u ? u.name.split(' ')[0] : 'تسجيل / دخول';
      if (u) {
        const p = store.get(LS.profile);
        if (p && p.email === u.email && p.audience) setAudience(p.audience, false); // يتذكّر فئتك
      }
      $('#telegramFloat').href = telegramLink();
      if ($('#heroTelegramBtn')) $('#heroTelegramBtn').href = telegramLink();
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
          store.set(LS.profile, { name: nm, email, audience: aud });
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
      try { if (this.fb) await this.fb.A.signOut(this.fb.a); } catch { /* ignore */ }
      try { localStorage.removeItem(LS.profile); } catch { /* ignore */ }
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
    $('#year').textContent = new Date().getFullYear();
    initNav();
    initGateway();
    promo.init();
    initWordCounter();
    initSampleSize();
    initGpa();
    initReferences();
    initUnits();
    initQuiz();
    modals.init();
    auth.init();
  });
})();
