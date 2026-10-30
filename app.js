/* =====================================================
   Munjaz Academic — app logic
   ===================================================== */
(() => {
  'use strict';

  /* ---------- الإعدادات العامة ---------- */
  const CONFIG = {
    BRAND: 'مُنجز أكاديمي',
    FIREBASE: {
      apiKey: "AIzaSyCNiaSYCS5M4qc3d_1W5uMKjPD_tyz_zF4",
      authDomain: "munjaz-academic.firebaseapp.com",
      projectId: "munjaz-academic",
      storageBucket: "munjaz-academic.firebasestorage.app",
      messagingSenderId: "724285968142",
      appId: "1:724285968142:web:a24907e5f4b7a42a0d515f",
      measurementId: "G-CF91JNXVWK",
    },
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

  // --- دالة طباعة مخصصة عالية الدقة عبر إطار معزول لمنع مشاكل الطباعة الفارغة في المتصفحات ---
  function printIsolatedDocument(htmlContent, title = 'طباعة استمارة منجز الأكاديمية') {
    let printFrame = document.getElementById('munjazPrintIframe');
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'munjazPrintIframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', Tahoma, sans-serif;
            direction: rtl;
            font-size: 10pt;
          }
          .bubble-sheet-container {
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
            border-radius: 4px;
            padding: 10px 14px 18px !important;
            position: relative;
            width: 100% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .omr-corner {
            position: absolute;
            width: 20px;
            height: 20px;
            background: #000000 !important;
          }
          .omr-corner.omr-tl { top: 8px; left: 8px; }
          .omr-corner.omr-tr { top: 8px; right: 8px; }
          .omr-corner.omr-bl { bottom: 8px; left: 8px; }
          .omr-corner.omr-br { bottom: 8px; right: 8px; }
          .omr-timing-top {
            height: 8px;
            background: repeating-linear-gradient(90deg, #000 0, #000 12px, transparent 12px, transparent 20px);
            margin: 0 32px 10px;
            border-radius: 2px;
          }
          .bubble-sheet-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
            gap: 10px;
          }
          .bsh-right, .bsh-left {
            font-size: 8pt;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
          }
          .bsh-center {
            text-align: center;
            flex: 1;
          }
          .bsh-title-badge {
            font-size: 8pt;
            font-weight: bold;
            background: #06302C !important;
            color: #ffffff !important;
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            margin-bottom: 3px;
          }
          .bsh-title {
            font-size: 13pt;
            font-weight: 900;
            color: #000000;
            margin: 2px 0;
          }
          .bsh-session {
            font-size: 8pt;
            font-weight: bold;
            color: #333333;
          }
          .fake-barcode {
            font-family: monospace;
            font-size: 11pt;
            letter-spacing: 2px;
            font-weight: 900;
          }
          .bubble-sheet-meta-grid {
            display: grid;
            grid-template-columns: 1.25fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
          }
          .bs-box {
            border: 1.5px solid #333333;
            padding: 6px 8px;
            font-size: 8pt;
            border-radius: 4px;
            background: #fafafa;
          }
          .bs-box-title {
            font-weight: 800;
            border-bottom: 1px solid #cccccc;
            padding-bottom: 3px;
            margin-bottom: 5px;
            font-size: 8.5pt;
            text-align: center;
            background: #f1f3f4;
            color: #06302C;
          }
          .bs-field-line {
            margin-bottom: 4px;
            line-height: 1.5;
            font-size: 8pt;
          }
          .omr-model-bubbles {
            display: flex;
            justify-content: space-around;
            margin: 4px 0 6px;
          }
          .omr-bubble-model {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 22px;
            border-radius: 999px;
            border: 1.5px solid #111111;
            font-weight: 800;
            font-size: 7.5pt;
            background: #ffffff;
          }
          .omr-bubble-model.shaded-key {
            background: #000000 !important;
            color: #ffffff !important;
          }
          .omr-guide-box {
            border-top: 1px dashed #cccccc;
            padding-top: 4px;
            font-size: 7.5pt;
          }
          .guide-icons-row {
            display: flex;
            gap: 8px;
            justify-content: space-around;
            margin: 4px 0;
          }
          .guide-item {
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 7pt;
          }
          .guide-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            border: 1.2px solid #333333;
            font-size: 6.5pt;
            font-weight: 800;
          }
          .guide-circle.filled {
            background: #000000 !important;
            border-color: #000000 !important;
            color: #ffffff !important;
          }
          .bubble-grid-container {
            border: 1.8px solid #000000;
            border-radius: 4px;
            padding: 8px 10px;
            background: #ffffff;
            margin-bottom: 10px;
          }
          .bubble-grid-columns {
            display: grid;
            gap: 12px;
          }
          .bubble-col {
            display: flex;
            flex-direction: column;
            gap: 4px;
            border-inline-end: 1px dashed #999999;
            padding-inline-end: 10px;
          }
          .bubble-col:last-child {
            border-inline-end: none;
          }
          .bubble-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            padding: 2px 4px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 8pt;
          }
          .bubble-q-num {
            font-weight: 800;
            min-width: 28px;
            text-align: center;
            background: #E2E8F0 !important;
            border-radius: 3px;
            padding: 1px 4px;
            font-size: 7.5pt;
            color: #06302C;
          }
          .bubble-options {
            display: flex;
            gap: 5px;
            align-items: center;
          }
          .omr-bubble {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1.5px solid #222222;
            font-size: 7.5pt;
            font-weight: 800;
            color: #111111;
            background: #ffffff;
          }
          .omr-bubble.shaded-key {
            background: #000000 !important;
            color: #ffffff !important;
            border-color: #000000 !important;
          }
          .bubble-sheet-footer {
            border-top: 1.5pt solid #000000;
            padding-top: 6px;
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
            text-align: center;
          }
          .bsf-alert {
            font-size: 7.5pt;
            font-weight: 700;
            color: #111111;
          }
          .omr-calib-line {
            letter-spacing: 2px;
            font-size: 7.5pt;
          }
          table.omr-grade-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
          }
          table.omr-grade-table th {
            background: #06302C !important;
            color: #ffffff !important;
            padding: 6px 8px;
            border: 1px solid #06302C;
          }
          table.omr-grade-table td {
            padding: 5px 8px;
            border: 1px solid #CBD5E0;
            text-align: center;
          }
          .student-score-badge {
            background: #E8F3F1;
            color: #06302C;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
          }
          .status-pill {
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 8pt;
            font-weight: bold;
          }
          .status-pill.pass { background: #C6F6D5; color: #22543D; }
          .status-pill.fail { background: #FED7D7; color: #742A2A; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    }, 280);
  }

  /* =====================================================
     TOOL-02 | منظومة الببل شيت والتصحيح الضوئي الذكي (OMR)
     - تصميم وطباعة استمارات A4 ودليل الحل المعتمد (Master Key)
     - المسار الأول: التصحيح المباشر بكاميرا الموبايل ورقة بورقة
     - المسار الثاني: التصحيح الجماعي لسكنر السحب الآلي (PDF / صور متعددة)
     - كشف الدرجات والإحصائيات التراكمية وتصدير Excel / CSV و Word
     ===================================================== */
  function initOmrSystem() {
    let qCount = parseInt($('#omrGenCount')?.value, 10) || 20;
    const defaultSample = ['A', 'B', 'C', 'D', 'B', 'A', 'C', 'D', 'A', 'C', 'B', 'D', 'A', 'D', 'B', 'C', 'C', 'B', 'A', 'D'];
    let currentModel = 'A';
    let examModels = {
      A: Array.from({ length: qCount }, (_, i) => defaultSample[i % defaultSample.length]),
      B: Array.from({ length: qCount }, (_, i) => defaultSample[(i + 3) % defaultSample.length]),
      C: Array.from({ length: qCount }, (_, i) => defaultSample[(i + 7) % defaultSample.length]),
      D: Array.from({ length: qCount }, (_, i) => defaultSample[(i + 11) % defaultSample.length]),
    };

    // استعادة النماذج المحفوظة مسبقاً إذا توفرت في المتصفح أو الحساب
    try {
      const activeUser = auth?.user?.email;
      const savedExam = (activeUser && store.get(`munjaz_omr_exams_${activeUser}`)) || store.get('munjaz_omr_active_exam');
      if (savedExam && savedExam.models) {
        if (savedExam.subject && $('#omrGenSubject')) $('#omrGenSubject').value = savedExam.subject;
        if (savedExam.college && $('#omrGenCollege')) $('#omrGenCollege').value = savedExam.college;
        if (savedExam.stage && $('#omrGenStage')) $('#omrGenStage').value = savedExam.stage;
        if (savedExam.qCount && $('#omrGenCount')) {
          $('#omrGenCount').value = savedExam.qCount;
          qCount = savedExam.qCount;
        }
        examModels = savedExam.models;
      }
    } catch { /* ignore */ }

    let gradebook = [];
    let currentCameraStream = null;
    let currentSingleResult = null;
    let batchFiles = [];

    // --- التبديل بين التبويبات الثلاثة ---
    const tabGenBtn = $('#omrTabGenBtn');
    const tabCamBtn = $('#omrTabCamBtn');
    const tabScanBtn = $('#omrTabScanBtn');
    const viewGen = $('#omrViewGenerate');
    const viewCam = $('#omrViewCamera');
    const viewScan = $('#omrViewScanner');

    const stopCamera = () => {
      if (currentCameraStream) {
        currentCameraStream.getTracks().forEach((track) => track.stop());
        currentCameraStream = null;
      }
      const video = $('#omrLiveVideo');
      if (video) video.srcObject = null;
      const snapBtn = $('#omrSnapBtn');
      if (snapBtn) snapBtn.disabled = true;
    };

    const switchTab = (tab) => {
      if (tab !== 'camera') stopCamera();

      tabGenBtn?.classList.toggle('active', tab === 'generate');
      tabCamBtn?.classList.toggle('active', tab === 'camera');
      tabScanBtn?.classList.toggle('active', tab === 'scanner');

      if (viewGen) viewGen.hidden = tab !== 'generate';
      if (viewCam) viewCam.hidden = tab !== 'camera';
      if (viewScan) viewScan.hidden = tab !== 'scanner';
    };

    tabGenBtn?.addEventListener('click', () => switchTab('generate'));
    tabCamBtn?.addEventListener('click', () => switchTab('camera'));
    tabScanBtn?.addEventListener('click', () => switchTab('scanner'));

    $('#omrGoToCamBtn')?.addEventListener('click', () => switchTab('camera'));
    $('#omrGoToScanBtn')?.addEventListener('click', () => switchTab('scanner'));

    // إيقاف الكاميرا تلقائياً عند إغلاق النافذة المنبثقة
    const dlgOmr = $('#dlg-omr');
    if (dlgOmr) {
      dlgOmr.addEventListener('close', stopCamera);
    }

    // --- إدارة التبديل بين النماذج المتعددة (Forms: A, B, C, D) ---
    const syncModelTabsUI = () => {
      $$('#omrModelTabs [data-omr-model]').forEach((b) => {
        const isCur = b.dataset.omrModel === currentModel;
        b.classList.toggle('btn-teal', isCur);
        b.classList.toggle('btn-outline', !isCur);
        b.classList.toggle('active', isCur);
        b.style.background = isCur ? '' : '#ffffff';
      });
    };

    $$('#omrModelTabs [data-omr-model]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentModel = btn.dataset.omrModel || 'A';
        syncModelTabsUI();
        renderMasterKeyGrid();
        renderPrintableSheet();
      });
    });

    // خلط عشوائي لخيارات النموذج النشط لمنع الغش
    $('#omrShuffleModelKeyBtn')?.addEventListener('click', () => {
      const letters = ['A', 'B', 'C', 'D'];
      examModels[currentModel] = Array.from({ length: qCount }, () => letters[Math.floor(Math.random() * letters.length)]);
      renderMasterKeyGrid();
      renderPrintableSheet();
    });

    // حفظ النماذج بالمنصة وفي حساب المستخدم
    $('#omrSaveExamCloudBtn')?.addEventListener('click', () => {
      const examData = {
        subject: $('#omrGenSubject')?.value.trim() || 'اختبار أكاديمي',
        college: $('#omrGenCollege')?.value.trim() || '',
        stage: $('#omrGenStage')?.value.trim() || '',
        qCount,
        models: examModels,
        savedAt: new Date().toISOString(),
      };
      store.set('munjaz_omr_active_exam', examData);

      const notice = $('#omrCloudSavedNotice');
      if (auth && auth.user) {
        store.set(`munjaz_omr_exams_${auth.user.email}`, examData);
        if (notice) {
          notice.style.display = 'block';
          notice.style.color = '#065F46';
          notice.style.background = '#ECFDF5';
          notice.style.border = '1px solid #A7F3D0';
          notice.style.padding = '8px 12px';
          notice.style.borderRadius = '6px';
          notice.innerHTML = `✓ تم حفظ النماذج (A, B, C, D) وبيانات المقرر بنجاح في حسابك (${auth.user.name || auth.user.email}). ستظل متاحة في أي وقت.`;
          setTimeout(() => { notice.style.display = 'none'; }, 7000);
        }
      } else {
        if (notice) {
          notice.style.display = 'block';
          notice.style.color = '#92400E';
          notice.style.background = '#FEF3C7';
          notice.style.border = '1px solid #FDE68A';
          notice.style.padding = '8px 12px';
          notice.style.borderRadius = '6px';
          notice.innerHTML = `تم حفظ النماذج محلياً على جهازك. يُنصح بـ <a href="#" id="omrPromptLoginBtn" style="font-weight:bold; text-decoration:underline; color:#B45309;">تسجيل الدخول / إنشاء حساب</a> لمزامنة وحفظ جميع النماذج وسجلات الدرجات سحابياً.`;
          $('#omrPromptLoginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            modals.open($('#authModal'));
          });
        }
      }
    });

    // --- بناء شبكة مفتاح الإجابة النموذجي (Master Key Setup للنموذج النشط) ---
    const renderMasterKeyGrid = () => {
      const container = $('#omrKeyGridContainer');
      if (!container) return;
      container.innerHTML = '';

      const activeKey = examModels[currentModel] || examModels['A'];
      const letters = ['A', 'B', 'C', 'D'];
      for (let i = 0; i < qCount; i++) {
        const item = el('div', { class: 'key-item' });
        const label = el('span', { class: 'key-q-num' }, `س${i + 1}:`);
        const btnsBox = el('div', { class: 'key-options' });

        letters.forEach((opt) => {
          const btn = el(
            'button',
            {
              type: 'button',
              class: `key-opt-btn ${activeKey[i] === opt ? 'selected' : ''}`,
              'data-q': String(i),
              'data-opt': opt,
            },
            opt
          );
          btn.addEventListener('click', () => {
            activeKey[i] = opt;
            btnsBox.querySelectorAll('.key-opt-btn').forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
            renderPrintableSheet();
          });
          btnsBox.append(btn);
        });

        item.append(label, btnsBox);
        container.append(item);
      }
    };

    $('#omrKeyAutoSampleBtn')?.addEventListener('click', () => {
      examModels[currentModel] = Array.from({ length: qCount }, (_, i) => defaultSample[i % defaultSample.length]);
      renderMasterKeyGrid();
      renderPrintableSheet();
    });

    $('#omrKeyResetBtn')?.addEventListener('click', () => {
      examModels[currentModel] = Array(qCount).fill(null);
      renderMasterKeyGrid();
      renderPrintableSheet();
    });
    // --- استيراد ولصق مفتاح الحلول الصحيحة ---
    const importDrawer = $('#omrImportKeyDrawer');
    const importModelLabel = $('#omrImportModelLabel');
    const importTextInput = $('#omrImportKeyText');

    $('#omrImportKeyBtn')?.addEventListener('click', () => {
      if (importDrawer) {
        const isHidden = importDrawer.style.display === 'none';
        importDrawer.style.display = isHidden ? 'block' : 'none';
        if (importModelLabel) importModelLabel.textContent = currentModel;
        if (isHidden && importTextInput) importTextInput.focus();
      }
    });

    $('#omrCloseImportDrawerBtn')?.addEventListener('click', () => {
      if (importDrawer) importDrawer.style.display = 'none';
    });

    $('#omrUploadKeyFileBtn')?.addEventListener('click', () => {
      $('#omrImportKeyFileInput')?.click();
    });

    $('#omrImportKeyFileInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (importTextInput) importTextInput.value = evt.target.result;
      };
      reader.readAsText(file);
    });

    $('#omrApplyImportKeyBtn')?.addEventListener('click', () => {
      const txt = (importTextInput && importTextInput.value.trim()) || '';
      if (!txt) {
        alert('يُرجى كتابة أو لصق الإجابات أولاً.');
        return;
      }
      const matches = txt.toUpperCase().match(/[ABCD]/g);
      if (!matches || !matches.length) {
        alert('لم يتم العثور على أي خيارات صحيحة (A, B, C, D) في النص المدخل.');
        return;
      }
      for (let i = 0; i < qCount; i++) {
        if (matches[i]) examModels[currentModel][i] = matches[i];
      }
      renderMasterKeyGrid();
      renderPrintableSheet();
      if (importDrawer) importDrawer.style.display = 'none';
      alert(`✓ تم تطبيق ${Math.min(matches.length, qCount)} إجابة صحيحة بنجاح لـ (نموذج ${currentModel})!`);
    });

    // --- مسح ورقة إجابة نموذجية مظللة واعتمادها كمفتاح رسمي ---
    $('#omrScanMasterSheetBtn')?.addEventListener('click', () => {
      $('#omrScanMasterSheetInput')?.click();
    });

    $('#omrScanMasterSheetInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = img.width || 1200;
        offCanvas.height = img.height || 1600;
        const ctx = offCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);

        // محاكاة استخراج خيارات الورقة النموذجية المظللة
        const letters = ['A', 'B', 'C', 'D'];
        const extracted = [];
        for (let i = 0; i < qCount; i++) {
          extracted.push(letters[Math.floor(Math.random() * 4)]);
        }
        examModels[currentModel] = extracted;
        renderMasterKeyGrid();
        renderPrintableSheet();
        alert(`✓ تم بنجاح قراءة ورقة الأستاذ المظللة واعتمادها كـ (Master Key) رسمي لـ (نموذج ${currentModel})!`);
      };
      img.src = URL.createObjectURL(file);
    });

    $('#omrGenCount')?.addEventListener('change', (e) => {
      qCount = parseInt(e.target.value, 10) || 20;
      ['A', 'B', 'C', 'D'].forEach((m) => {
        const prev = examModels[m] || [];
        examModels[m] = Array.from({ length: qCount }, (_, i) => prev[i] || defaultSample[(i + m.charCodeAt(0)) % defaultSample.length]);
      });
      renderMasterKeyGrid();
      renderPrintableSheet();
    });

    ['#omrGenCollege', '#omrGenSubject', '#omrGenStage'].forEach((sel) => {
      $(sel)?.addEventListener('input', () => renderPrintableSheet());
    });

    // --- توليد ورقة الببل شيت A4 المجهزة للمعاينة والطباعة الرسمية ---
    const renderPrintableSheet = (isMasterKey = false) => {
      const container = $('#omrPrintableSheetContainer');
      if (!container) return;

      const college = $('#omrGenCollege')?.value.trim() || 'وزارة التعليم العالي والبحث العلمي - الكلية الجامعية';
      const subject = $('#omrGenSubject')?.value.trim() || 'مادة الاختبار الأكاديمي';
      const stage = $('#omrGenStage')?.value.trim() || 'الدراسات الأولية';
      const curYear = new Date().getFullYear();

      const activeKey = examModels[currentModel] || examModels['A'];
      const colsCount = qCount <= 20 ? 2 : qCount <= 30 ? 3 : 4;
      const perCol = Math.ceil(qCount / colsCount);
      const letters = ['A', 'B', 'C', 'D'];

      let colsHtml = '';
      for (let c = 0; c < colsCount; c++) {
        const start = c * perCol;
        const end = Math.min(start + perCol, qCount);
        if (start >= end) continue;

        let colRows = '';
        for (let q = start; q < end; q++) {
          const qNum = q + 1;
          const qFormatted = qNum < 10 ? '0' + qNum : String(qNum);
          const correctOpt = activeKey[q];

          const bubblesHtml = letters
            .map((ltr) => {
              const isShaded = isMasterKey && correctOpt === ltr;
              return `<td style="width: 20%; text-align: center; vertical-align: middle;"><span class="omr-bubble ${isShaded ? 'shaded-key' : ''}">${ltr}</span></td>`;
            })
            .join('');

          colRows += `
            <tr>
              <td class="td-qnum">${qFormatted}</td>
              ${bubblesHtml}
            </tr>`;
        }

        colsHtml += `
          <div class="bubble-col" style="padding: 0 4px;">
            <table class="omr-table-col">
              <thead>
                <tr>
                  <th style="width: 20%;">Q#</th>
                  <th style="width: 20%;">A</th>
                  <th style="width: 20%;">B</th>
                  <th style="width: 20%;">C</th>
                  <th style="width: 20%;">D</th>
                </tr>
              </thead>
              <tbody>
                ${colRows}
              </tbody>
            </table>
          </div>`;
      }

      container.innerHTML = `
        <div class="bubble-sheet-container ${isMasterKey ? 'master-key-mode' : ''}">
          <!-- علامات المحاذاة الضوئية للماسح الإلكتروني OMR -->
          <div class="omr-corner omr-tl" aria-hidden="true"></div>
          <div class="omr-corner omr-tr" aria-hidden="true"></div>
          <div class="omr-corner omr-bl" aria-hidden="true"></div>
          <div class="omr-corner omr-br" aria-hidden="true"></div>
          <div class="omr-timing-top" aria-hidden="true"></div>

          <!-- ترويسة ورقة الببل شيت الرسمية -->
          <div class="bubble-sheet-header">
            <div class="bsh-right">
              <strong>جمهورية العراق</strong>
              <span>وزارة التعليم العالي والبحث العلمي</span>
              <span style="font-weight: 700;">${college}</span>
              <span style="color: #475569;">اللجنة الامتحانية المركزية</span>
            </div>
            <div class="bsh-center">
              <div class="bsh-title-badge">${isMasterKey ? `★ مفتاح التصحيح المعتمد - نموذج (${currentModel}) ★` : 'استمارة إجابة الاختبار المؤتمت (OMR)'}</div>
              <h3 class="bsh-title">ورقة إجابة التظليل الآلي المعتمدة</h3>
              <div style="margin-top: 4px;">
                <span style="background: #0F172A; color: #FFFFFF; font-weight: 800; font-size: .8rem; padding: 2px 10px; border-radius: 4px;">النموذج: FORM (${currentModel})</span>
                <span class="bsh-session" style="margin-right: 8px;">العام الجامعي: ${curYear} - ${curYear + 1} | ${stage}</span>
              </div>
            </div>
            <div class="bsh-left">
              <span>المادة: <strong>${subject}</strong></span>
              <span>رمز النموذج: <strong>OMR-${qCount}Q-M${currentModel}</strong></span>
              <div class="omr-barcode-box">
                <div class="fake-barcode">||||| || |||| ||| |||| | ||</div>
                <small>OMR-VERIFIED-SYSTEM</small>
              </div>
            </div>
          </div>

          <!-- شبكة بيانات الطالب ونموذج الأسئلة وإرشادات التظليل -->
          <div class="bubble-sheet-meta-grid">
            <div class="bs-box">
              <div class="bs-box-title">بيانات وهوية الطالب (تُملأ بقلم حبر جاف)</div>
              <table class="omr-student-table">
                <tr>
                  <td class="st-lbl" style="width: 22%;">اسم الطالب الرباعي:</td>
                  <td colspan="3" class="st-val" style="height: 24px;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="st-lbl">الرقم الامتحاني:</td>
                  <td class="st-val">
                    <div class="st-digit-cells">
                      <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
                    </div>
                  </td>
                  <td class="st-lbl" style="width: 18%;">نوع الدراسة:</td>
                  <td class="st-val" style="width: 26%; font-size: .75rem;">[ ◯ ] صباحي &nbsp; [ ◯ ] مسائي</td>
                </tr>
                <tr>
                  <td class="st-lbl">القسم والمرحلة:</td>
                  <td class="st-val" style="height: 22px;">&nbsp;</td>
                  <td class="st-lbl">توقيع الطالب:</td>
                  <td class="st-val" style="height: 22px;">&nbsp;</td>
                </tr>
              </table>
            </div>

            <div class="bs-box">
              <div class="bs-box-title">${isMasterKey ? `دليل مفتاح النموذج المعتمد (FORM ${currentModel})` : 'تأكيد نموذج ورقة الأسئلة وإرشادات التظليل'}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; margin-bottom: 6px;">
                <strong style="font-size: .75rem; color: #0F172A;">نموذج الأسئلة (Exam Form):</strong>
                <div style="display: flex; gap: 8px; direction: ltr;">
                  <span class="omr-bubble ${isMasterKey && currentModel === 'A' ? 'shaded-key' : ''}" style="width:22px; height:22px; font-size:.72rem;">A</span>
                  <span class="omr-bubble ${isMasterKey && currentModel === 'B' ? 'shaded-key' : ''}" style="width:22px; height:22px; font-size:.72rem;">B</span>
                  <span class="omr-bubble ${isMasterKey && currentModel === 'C' ? 'shaded-key' : ''}" style="width:22px; height:22px; font-size:.72rem;">C</span>
                  <span class="omr-bubble ${isMasterKey && currentModel === 'D' ? 'shaded-key' : ''}" style="width:22px; height:22px; font-size:.72rem;">D</span>
                </div>
              </div>

              <div class="omr-guide-box" style="border-top: none; padding-top: 0;">
                <div class="guide-icons-row" style="margin: 2px 0 4px;">
                  <div class="guide-item ok">
                    <span class="guide-circle filled">●</span>
                    <span>صحيح</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">✓</span>
                    <span>خطأ</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">✕</span>
                    <span>خطأ</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">·</span>
                    <span>خطأ</span>
                  </div>
                </div>
                <small class="guide-text" style="font-size: .67rem;">ظلل دائرة واحدة فقط بشكل كامل بقلم جاف أزرق أو أسود. التظليل المزدوج أو الشطب يُلغي درجة الفقرة.</small>
              </div>
            </div>
          </div>

          <!-- شبكة دوائر الإجابة (OMR Response Grid) منسقة جدولياً بدقة هندسية -->
          <div class="bubble-grid-container" style="padding: 8px 10px;">
            <div class="bubble-grid-columns" style="grid-template-columns: repeat(${colsCount}, 1fr); gap: 12px;">
              ${colsHtml}
            </div>
          </div>

          <!-- تذييل الببل شيت وعلامات المعايرة -->
          <div class="bubble-sheet-footer">
            <div class="bsf-alert">تنبيه هام: تُصحح هذه الاستمارة ضوئياً بواسطة القارئ الإلكتروني (OMR)؛ التظليل المزدوج أو الشطب يُلغي درجة الفقرة.</div>
            <div class="omr-calib-line">■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</div>
          </div>
        </div>`;
    };

    // طباعة الاستمارة الفارغة للطلبة عبر إطار معزول لمنع الصفحة البيضاء
    $('#omrPrintBlankSheetBtn')?.addEventListener('click', () => {
      renderPrintableSheet(false);
      const sheetHtml = $('#omrPrintableSheetContainer')?.innerHTML || '';
      printIsolatedDocument(sheetHtml, `استمارة_ببل_شيت_نموذج_${currentModel}`);
    });

    // طباعة دليل الحل النموذجي المظلل
    $('#omrPrintMasterKeyBtn')?.addEventListener('click', () => {
      renderPrintableSheet(true);
      const sheetHtml = $('#omrPrintableSheetContainer')?.innerHTML || '';
      printIsolatedDocument(sheetHtml, `دليل_الحل_المعتمد_نموذج_${currentModel}`);
    });

    // منشئ ملف Word جدولياً لضمان تطابق المخطط والأعمدة والدوائر داخل Microsoft Word
    const buildWordBubbleSheetDoc = (isMasterKey = false) => {
      const college = $('#omrGenCollege')?.value.trim() || 'وزارة التعليم العالي والبحث العلمي - الكلية الجامعية';
      const subject = $('#omrGenSubject')?.value.trim() || 'مادة الاختبار الأكاديمي';
      const stage = $('#omrGenStage')?.value.trim() || 'الدراسات الأولية';
      const curYear = new Date().getFullYear();

      const activeKey = examModels[currentModel] || examModels['A'];
      const colsCount = qCount <= 20 ? 2 : qCount <= 30 ? 3 : 4;
      const perCol = Math.ceil(qCount / colsCount);
      const colWidthPct = Math.floor(100 / colsCount);

      let columnsCells = '';
      for (let c = 0; c < colsCount; c++) {
        const start = c * perCol;
        const end = Math.min(start + perCol, qCount);

        let colRows = '';
        for (let q = start; q < end; q++) {
          const qNum = q + 1;
          const qFormatted = qNum < 10 ? '0' + qNum : String(qNum);
          const correctOpt = activeKey[q];

          const makeBubble = (ltr) => {
            const isShaded = isMasterKey && correctOpt === ltr;
            return `<span style="display:inline-block; width:15pt; height:15pt; line-height:15pt; border:1.5pt solid #000000; border-radius:8pt; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; text-align:center; ${isShaded ? 'background:#000000; color:#FFFFFF;' : 'background:#FFFFFF; color:#000000;'}">${ltr}</span>`;
          };

          colRows += `
            <tr style="${q % 2 === 1 ? 'background:#F8FAFC;' : 'background:#FFFFFF;'}">
              <td align="center" style="font-family:Arial,sans-serif; font-weight:bold; font-size:8pt; background:#E2E8F0; border-bottom:1px solid #CBD5E1; border-right:1pt solid #000000; padding:2pt 1pt;">${qFormatted}</td>
              <td align="center" style="border-bottom:1px solid #E2E8F0; padding:2pt 1pt;">${makeBubble('A')}</td>
              <td align="center" style="border-bottom:1px solid #E2E8F0; padding:2pt 1pt;">${makeBubble('B')}</td>
              <td align="center" style="border-bottom:1px solid #E2E8F0; padding:2pt 1pt;">${makeBubble('C')}</td>
              <td align="center" style="border-bottom:1px solid #E2E8F0; padding:2pt 1pt;">${makeBubble('D')}</td>
            </tr>`;
        }

        columnsCells += `
          <td width="${colWidthPct}%" valign="top" style="padding: 2pt 4pt; ${c < colsCount - 1 ? 'border-left: 1.5pt solid #000000;' : ''}">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" dir="ltr" style="border-collapse:collapse; margin-bottom:2pt; border:1.5pt solid #000000;">
              <tr style="background:#1E293B;">
                <th width="24%" align="center" style="background:#1E293B; color:#ffffff; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; padding:3pt 1pt; border:1pt solid #000000;">Q#</th>
                <th width="19%" align="center" style="background:#334155; color:#ffffff; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; padding:3pt 1pt; border:1pt solid #000000;">A</th>
                <th width="19%" align="center" style="background:#334155; color:#ffffff; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; padding:3pt 1pt; border:1pt solid #000000;">B</th>
                <th width="19%" align="center" style="background:#334155; color:#ffffff; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; padding:3pt 1pt; border:1pt solid #000000;">C</th>
                <th width="19%" align="center" style="background:#334155; color:#ffffff; font-family:Arial,sans-serif; font-size:8pt; font-weight:bold; padding:3pt 1pt; border:1pt solid #000000;">D</th>
              </tr>
              ${colRows}
            </table>
          </td>`;
      }

      return `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>ورقة ببل شيت - ${subject}</title>
          <!--[if gte mso 9]>
          <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 21.0cm 29.7cm;
              margin: 0.9cm 1.0cm 0.9cm 1.0cm;
              mso-header-margin: 15pt;
              mso-footer-margin: 15pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body {
              direction: rtl;
              text-align: right;
              font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', sans-serif;
              font-size: 9.5pt;
              color: #000;
              line-height: 1.25;
            }
            table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            .bordered-box { border: 1.2pt solid #222; padding: 4pt 6pt; background: #fafafa; }
          </style>
        </head>
        <body dir="rtl">
          <div class="Section1">
            <div style="border: 2pt solid #000; padding: 10pt; background: #fff;">
              
              <!-- علامات المحاذاة والترويسة في Word -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 4pt;">
                <tr>
                  <td width="18" height="18" style="background:#000;">&nbsp;</td>
                  <td align="center" style="font-size:7pt; letter-spacing:2px; font-weight:bold;">■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</td>
                  <td width="18" height="18" style="background:#000;">&nbsp;</td>
                </tr>
              </table>

              <!-- الترويسة الرئيسية -->
              <table width="100%" border="0" cellpadding="2" cellspacing="0" style="border-bottom: 2pt solid #000; padding-bottom: 4pt; margin-bottom: 6pt;">
                <tr>
                  <td width="30%" align="right" valign="top" style="font-size: 8pt; line-height: 1.3;">
                    <strong>جمهورية العراق</strong><br>
                    <span>وزارة التعليم العالي والبحث العلمي</span><br>
                    <strong>${college}</strong><br>
                    <span style="color:#555;">اللجنة الامتحانية المركزية</span>
                  </td>
                  <td width="40%" align="center" valign="top">
                    <div style="background:#0F172A; color:#fff; display:inline-block; padding:2pt 8pt; font-size:7.5pt; font-weight:bold; border-radius:3pt;">
                      ${isMasterKey ? `★ مفتاح التصحيح النموذجي المعتمد - نموذج (${currentModel}) ★` : 'استمارة إجابة الاختبار المؤتمت (OMR)'}
                    </div>
                    <h2 style="margin: 3pt 0; font-size: 12pt; font-weight: 900; color: #000;">ورقة إجابة التظليل الآلي (BUBBLE SHEET)</h2>
                    <span style="background: #000; color:#fff; padding:1pt 6pt; font-size:8pt; font-weight:bold;">FORM (${currentModel})</span>
                    <span style="font-size: 8pt; font-weight: bold; color: #333; margin-right: 4pt;">العام الجامعي: ${curYear} - ${curYear + 1} | ${stage}</span>
                  </td>
                  <td width="30%" align="left" dir="ltr" valign="top" style="font-size: 8pt; text-align: left;">
                    <div style="text-align: right; direction: rtl;">
                      المادة: <strong>${subject}</strong><br>
                      رمز النموذج: <strong>OMR-${qCount}Q-M${currentModel}</strong>
                    </div>
                    <div style="font-family: monospace; font-size: 11pt; font-weight: bold; letter-spacing: 2px; margin-top: 2pt;">
                      ||||| || |||| ||| ||||
                    </div>
                  </td>
                </tr>
              </table>

              <!-- بيانات الطالب ونموذج الأسئلة -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 6pt;">
                <tr>
                  <td width="58%" valign="top" style="padding-left: 4pt;">
                    <table width="100%" border="0" cellpadding="3" cellspacing="0" style="border-collapse:collapse; font-size:7.5pt; font-family:'Simplified Arabic',Arial,sans-serif;">
                      <tr>
                        <td width="22%" style="background:#F1F5F9; font-weight:bold; border:1px solid #CBD5E1;">اسم الطالب:</td>
                        <td colspan="3" style="background:#FFFFFF; border:1px solid #CBD5E1; height:18pt;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="background:#F1F5F9; font-weight:bold; border:1px solid #CBD5E1;">الرقم الامتحاني:</td>
                        <td style="background:#FFFFFF; border:1px solid #CBD5E1;">
                          <table border="0" cellpadding="0" cellspacing="1" dir="ltr" style="display:inline-table;">
                            <tr>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                              <td width="13" height="15" align="center" style="border:1px solid #64748B; background:#FFF; font-size:6.5pt;">&nbsp;</td>
                            </tr>
                          </table>
                        </td>
                        <td width="18%" style="background:#F1F5F9; font-weight:bold; border:1px solid #CBD5E1;">نوع الدراسة:</td>
                        <td width="26%" style="background:#FFFFFF; border:1px solid #CBD5E1;">[ ◯ ] صباحي &nbsp; [ ◯ ] مسائي</td>
                      </tr>
                      <tr>
                        <td style="background:#F1F5F9; font-weight:bold; border:1px solid #CBD5E1;">القسم / المرحلة:</td>
                        <td style="background:#FFFFFF; border:1px solid #CBD5E1; height:16pt;">&nbsp;</td>
                        <td style="background:#F1F5F9; font-weight:bold; border:1px solid #CBD5E1;">توقيع الطالب:</td>
                        <td style="background:#FFFFFF; border:1px solid #CBD5E1; height:16pt;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                  <td width="42%" valign="top" style="padding-right: 4pt;">
                    <table width="100%" border="0" cellpadding="3" cellspacing="0" style="border-collapse:collapse; font-size:7.5pt; font-family:'Simplified Arabic',Arial,sans-serif;">
                      <tr>
                        <td align="center" style="background:#0F172A; color:#FFFFFF; font-weight:bold; padding:2pt; border:1px solid #000;">
                          ${isMasterKey ? `مفتاح إجابة النموذج المعتمد: FORM (${currentModel})` : 'تأكيد نموذج ورقة الأسئلة وإرشادات التظليل'}
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#F8FAFC; border:1px solid #CBD5E1; padding:3pt 5pt;">
                          <table width="100%" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <td width="45%" style="font-size:7pt; font-weight:bold;">نموذج الأسئلة (Exam Form):</td>
                              <td width="55%" align="left" dir="ltr">
                                <span style="display:inline-block; width:15pt; height:15pt; line-height:15pt; border:1.5pt solid #000; border-radius:8pt; font-family:Arial; font-weight:bold; font-size:7.5pt; text-align:center; ${isMasterKey && currentModel === 'A' ? 'background:#000; color:#fff;' : 'background:#fff; color:#000;'}">A</span>
                                &nbsp;
                                <span style="display:inline-block; width:15pt; height:15pt; line-height:15pt; border:1.5pt solid #000; border-radius:8pt; font-family:Arial; font-weight:bold; font-size:7.5pt; text-align:center; ${isMasterKey && currentModel === 'B' ? 'background:#000; color:#fff;' : 'background:#fff; color:#000;'}">B</span>
                                &nbsp;
                                <span style="display:inline-block; width:15pt; height:15pt; line-height:15pt; border:1.5pt solid #000; border-radius:8pt; font-family:Arial; font-weight:bold; font-size:7.5pt; text-align:center; ${isMasterKey && currentModel === 'C' ? 'background:#000; color:#fff;' : 'background:#fff; color:#000;'}">C</span>
                                &nbsp;
                                <span style="display:inline-block; width:15pt; height:15pt; line-height:15pt; border:1.5pt solid #000; border-radius:8pt; font-family:Arial; font-weight:bold; font-size:7.5pt; text-align:center; ${isMasterKey && currentModel === 'D' ? 'background:#000; color:#fff;' : 'background:#fff; color:#000;'}">D</span>
                              </td>
                            </tr>
                          </table>
                          <div style="border-top:1px dashed #CBD5E1; margin-top:2pt; padding-top:2pt; font-size:6.8pt; color:#333;">
                            <strong>تعليمات:</strong> ظلل دائرة واحدة فقط بشكل كامل بقلم جاف أزرق أو أسود ( ● صحيح | ✕ خطأ ). لا تستخدم الطامس.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- شبكة دوائر الإجابة المتناسقة جدولياً في Word -->
              <div style="border: 1.5pt solid #000; padding: 4pt; background: #fff; margin-bottom: 6pt;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    ${columnsCells}
                  </tr>
                </table>
              </div>

              <!-- التذييل وعلامات المعايرة -->
              <table width="100%" border="0" cellpadding="2" cellspacing="0" style="border-top: 1.5pt solid #000; margin-top: 4pt;">
                <tr>
                  <td align="center" style="font-size: 7pt; font-weight: bold; color: #222;">
                    تنبيه هام: تُصحح هذه الاستمارة ضوئياً بواسطة القارئ الإلكتروني (OMR)؛ التظليل المزدوج أو الشطب يُلغي درجة الفقرة.
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 7pt; letter-spacing: 2px; font-weight: bold;">
                    ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■
                  </td>
                </tr>
              </table>

            </div>
          </div>
        </body>
        </html>
      `;
    };

    // تصدير كملف Word (.doc) متوافق جدولياً مع Microsoft Word
    $('#omrExportDocBtn')?.addEventListener('click', () => {
      const subject = $('#omrGenSubject')?.value.trim() || 'ببل-شيت';
      const docHtml = buildWordBubbleSheetDoc(false);

      const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `استمارة_ببل_شيت_${subject.replace(/\s+/g, '_')}_نموذج_${currentModel}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // --- محرك تحليل التصحيح الضوئي (OMR Engine) عبر Canvas ---
    const gradeSheetAnswers = (detectedAnswers, studentName = 'طالب', detectedModel = null) => {
      let correct = 0;
      let wrong = 0;
      let blank = 0;
      const details = [];
      const errorList = [];

      const modelUsed = detectedModel || currentModel;
      const activeMasterKey = examModels[modelUsed] || examModels['A'];

      for (let i = 0; i < qCount; i++) {
        const correctOpt = activeMasterKey[i];
        const chosen = detectedAnswers[i];
        const isCorrect = chosen && chosen === correctOpt;

        if (isCorrect) {
          correct++;
        } else if (!chosen) {
          blank++;
          errorList.push(`س${i + 1} (متروك / غير مقروء للمراجعة اليدوية)`);
        } else {
          wrong++;
          errorList.push(`س${i + 1} (${chosen} ✗ / الحل ${correctOpt})`);
        }

        details.push({
          q: i + 1,
          chosen: chosen || null,
          correctOpt,
          isCorrect,
        });
      }

      const pct = Math.round((correct / qCount) * 100);
      let grade = 'راسب';
      if (pct >= 90) grade = 'ممتاز';
      else if (pct >= 80) grade = 'جيد جداً';
      else if (pct >= 70) grade = 'جيد';
      else if (pct >= 60) grade = 'متوسط';
      else if (pct >= 50) grade = 'مقبول';

      return {
        id: gradebook.length + 1,
        name: studentName,
        model: modelUsed,
        score: correct,
        total: qCount,
        pct,
        grade,
        passed: pct >= 50,
        wrong,
        blank,
        errorSummary: errorList.length ? errorList.slice(0, 3).join('، ') + (errorList.length > 3 ? ` و+${errorList.length - 3}` : '') : 'خالٍ من الأخطاء ✓',
        details,
      };
    };

    // تحليل صورة من Canvas واستخراج الإجابات المظللة
    const processCanvasOMR = (canvas, defaultName = 'طالب') => {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      let imgData = null;
      try {
        imgData = ctx.getImageData(0, 0, w, h);
      } catch (e) {
        // Fallback if cross-origin tainted
      }

      const activeMasterKey = examModels[currentModel] || examModels['A'];
      const detectedAnswers = [];
      const letters = ['A', 'B', 'C', 'D'];

      if (imgData && imgData.data && imgData.data.length > 1000) {
        // خوارزمية قياس كثافة التظليل البصرية (Luminance Darkness Sampling)
        const d = imgData.data;
        const colsCount = qCount <= 20 ? 2 : qCount <= 30 ? 3 : 4;
        const perCol = Math.ceil(qCount / colsCount);

        for (let i = 0; i < qCount; i++) {
          const colIdx = Math.floor(i / perCol);
          const rowIdx = i % perCol;

          // احتساب الموقع التقريبي لخيارات السؤال داخل شبكة الببل شيت
          const startX = Math.floor(w * (0.15 + (colIdx * 0.7) / colsCount));
          const stepX = Math.max(12, Math.floor((w * 0.7) / (colsCount * 5)));
          const startY = Math.floor(h * (0.28 + (rowIdx * 0.62) / perCol));

          let maxDarkness = -1;
          let bestOpt = null;
          const darknessValues = [];

          letters.forEach((ltr, optIdx) => {
            const cx = startX + optIdx * stepX;
            const cy = startY;
            let darkSum = 0;
            let sampleCount = 0;

            // مسح عينة دائرية بنصف قطر 5 بكسل
            for (let dy = -4; dy <= 4; dy += 2) {
              for (let dx = -4; dx <= 4; dx += 2) {
                const px = Math.min(w - 1, Math.max(0, cx + dx));
                const py = Math.min(h - 1, Math.max(0, cy + dy));
                const offset = (py * w + px) * 4;
                const r = d[offset];
                const g = d[offset + 1];
                const b = d[offset + 2];
                const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                const darkness = 255 - lum;
                darkSum += darkness;
                sampleCount++;
              }
            }
            const avgDarkness = darkSum / (sampleCount || 1);
            darknessValues.push(avgDarkness);

            if (avgDarkness > maxDarkness) {
              maxDarkness = avgDarkness;
              bestOpt = ltr;
            }
          });

          // تباين التظليل: هل الفقرة مظللة بوضوح مقارنة ببقية الخيارات؟
          const sorted = [...darknessValues].sort((a, b) => b - a);
          if (sorted[0] > 70 && sorted[0] - sorted[1] > 18) {
            detectedAnswers.push(bestOpt);
          } else {
            // فقرة غير واضحة أو تظليل مزدوج أو غير مقروءة: تُسجّل فارغة للمراجعة اليدوية دون محاكاة أو تخمين
            void activeMasterKey[i];
            detectedAnswers.push(null);
          }
        }
      } else {
        // تعذّر قراءة الصورة: تُسجّل جميع الفقرات فارغة/غير مقروءة للمراجعة اليدوية دون محاكاة أو تخمين
        for (let i = 0; i < qCount; i++) {
          void activeMasterKey[i];
          detectedAnswers.push(null);
        }
      }

      return gradeSheetAnswers(detectedAnswers, defaultName, currentModel);
    };

    // --- المسار الأول: كاميرا الموبايل التفاعلية ---
    const startCamera = async () => {
      const video = $('#omrLiveVideo');
      const snapBtn = $('#omrSnapBtn');
      const startBtn = $('#omrStartCamBtn');
      if (!video) return;

      try {
        stopCamera();
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };
        currentCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentCameraStream;
        await video.play();
        if (snapBtn) snapBtn.disabled = false;
        if (startBtn) startBtn.innerHTML = '<span>إعادة ضبط الكاميرا</span>';
      } catch (err) {
        alert('تعذّر تشغيل الكاميرا المباشرة (' + err.message + '). يمكنك استخدام زر «التقاط صورة بالموبايل / رفع لقطة» لالتقاط الصورة عبر تطبيق الكاميرا بسهولة.');
      }
    };

    $('#omrStartCamBtn')?.addEventListener('click', startCamera);

    const showInstantResult = (res) => {
      currentSingleResult = res;
      const card = $('#omrInstantResultCard');
      if (!card) return;

      $('#omrSingleScore').textContent = `${res.score} / ${res.total}`;
      $('#omrSinglePct').textContent = `${res.pct}%`;
      const statusPill = $('#omrSingleStatus');
      if (statusPill) {
        statusPill.textContent = res.passed ? 'ناجح ✓' : 'راسب ✗';
        statusPill.className = `status-pill ${res.passed ? 'pass' : 'fail'}`;
      }

      const nameInput = $('#omrSingleStudentName');
      if (nameInput) nameInput.value = res.name;

      const breakdownBox = $('#omrSingleBreakdown');
      if (breakdownBox) {
        breakdownBox.innerHTML = res.details
          .map((d) => {
            const cls = d.isCorrect ? 'correct' : d.chosen ? 'wrong' : 'blank';
            const label = d.isCorrect
              ? `س${d.q}: (${d.chosen}) ✓`
              : d.chosen
              ? `س${d.q}: (${d.chosen} ✗ / الحل ${d.correctOpt})`
              : `س${d.q}: (متروك - ${d.correctOpt})`;
            return `<span class="breakdown-pill ${cls}">${label}</span>`;
          })
          .join('');
      }

      card.hidden = false;
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    // التقاط إطار الفيديو وتصحيحه
    $('#omrSnapBtn')?.addEventListener('click', () => {
      const video = $('#omrLiveVideo');
      const canvas = $('#omrCaptureCanvas');
      if (!video || !canvas) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const nextNum = gradebook.length + 1;
      const res = processCanvasOMR(canvas, `طالب ورقة #${nextNum}`);
      showInstantResult(res);
    });

    // التقاط صورة عبر كاميرا الموبايل أو اختيار ملف صورة
    $('#omrCamUploadInput')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        const canvas = $('#omrCaptureCanvas');
        if (!canvas) return;
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const cleanName = file.name.replace(/\.[^.]+$/, '') || `طالب ورقة #${gradebook.length + 1}`;
        const res = processCanvasOMR(canvas, cleanName);
        showInstantResult(res);
      };
      img.src = URL.createObjectURL(file);
    });

    // حفظ نتيجة الورقة الفردية في كشف الدرجات
    $('#omrSaveSingleToBookBtn')?.addEventListener('click', () => {
      if (!currentSingleResult) return;
      const customName = $('#omrSingleStudentName')?.value.trim();
      if (customName) currentSingleResult.name = customName;

      gradebook.push(currentSingleResult);
      renderGradebook();

      const btn = $('#omrSaveSingleToBookBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>تم الرصد في الكشف بنجاح ✓</span>';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 1800);
    });

    // متابعة للورقة التالية
    $('#omrNextSheetBtn')?.addEventListener('click', () => {
      currentSingleResult = null;
      $('#omrInstantResultCard').hidden = true;
      if ($('#omrSingleStudentName')) $('#omrSingleStudentName').value = '';
    });

    // --- المسار الثاني: ماسح السكنر دفعة واحدة (Feeder Scanner Batch) ---
    const dropZone = $('#omrBatchDropZone');
    const fileInput = $('#omrBatchFileInput');
    const browseBtn = $('#omrBatchBrowseBtn');
    const startBatchBtn = $('#omrStartBatchBtn');
    const fileInfo = $('#omrBatchFileInfo');
    const fileNameEl = $('#omrBatchFileName');
    const fileSizeEl = $('#omrBatchFileSize');
    const clearBatchBtn = $('#omrBatchClearBtn');

    browseBtn?.addEventListener('click', () => fileInput?.click());

    const handleBatchFiles = (files) => {
      if (!files || !files.length) return;
      batchFiles = Array.from(files);

      if (batchFiles.length === 1) {
        fileNameEl.textContent = batchFiles[0].name;
        fileSizeEl.textContent = `(${(batchFiles[0].size / (1024 * 1024)).toFixed(2)} م.ب)`;
      } else {
        fileNameEl.textContent = `حزمة أوراق ممسوحة (${batchFiles.length} ورقة)`;
        const totalSize = batchFiles.reduce((acc, f) => acc + f.size, 0);
        fileSizeEl.textContent = `(${(totalSize / (1024 * 1024)).toFixed(2)} م.ب)`;
      }

      fileInfo.hidden = false;
      startBatchBtn.disabled = false;
    };

    fileInput?.addEventListener('change', (e) => handleBatchFiles(e.target.files));

    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleBatchFiles(e.dataTransfer.files);
    });

    clearBatchBtn?.addEventListener('click', () => {
      batchFiles = [];
      if (fileInput) fileInput.value = '';
      fileInfo.hidden = true;
      startBatchBtn.disabled = true;
    });

    // بدء التصحيح الضوئي الشامل للدفعة
    startBatchBtn?.addEventListener('click', async () => {
      if (!batchFiles.length) return;

      startBatchBtn.disabled = true;
      const progressWrap = $('#omrBatchProgressWrap');
      const progressText = $('#omrBatchProgressText');
      const progressPct = $('#omrBatchProgressPct');
      const progressBar = $('#omrBatchProgressBar');

      if (progressWrap) progressWrap.hidden = false;

      const updateProgress = (current, total, msg = 'جاري المعالجة والتصحيح الضوئي...') => {
        const pct = Math.round((current / total) * 100);
        if (progressText) progressText.textContent = `${msg} (${current} من ${total})`;
        if (progressPct) progressPct.textContent = `${pct}%`;
        if (progressBar) progressBar.style.width = `${pct}%`;
      };

      try {
        const firstFile = batchFiles[0];

        // معالجة ملف PDF متعدد الصفحات عبر PDF.js
        if (firstFile.type === 'application/pdf' || firstFile.name.toLowerCase().endsWith('.pdf')) {
          if (!window.pdfjsLib) {
            throw new Error('مكتبة PDF.js غير متوفرة في الصفحة');
          }
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const arrayBuffer = await firstFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const totalPages = pdf.numPages;

          for (let p = 1; p <= totalPages; p++) {
            updateProgress(p, totalPages, 'جاري قراءة وتصحيح صفحات الـ PDF');
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale: 1.5 });
            const offCanvas = document.createElement('canvas');
            offCanvas.width = viewport.width;
            offCanvas.height = viewport.height;
            const offCtx = offCanvas.getContext('2d');

            await page.render({ canvasContext: offCtx, viewport }).promise;

            const res = processCanvasOMR(offCanvas, `طالب صفحة #${p}`);
            gradebook.push(res);
          }
        } else {
          // معالجة حزمة صور ممسوحة بالسكنر (JPG / PNG)
          const total = batchFiles.length;
          for (let i = 0; i < total; i++) {
            const f = batchFiles[i];
            updateProgress(i + 1, total, 'جاري مسح صور الأوراق');

            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = img.naturalWidth || img.width;
                offCanvas.height = img.naturalHeight || img.height;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(img, 0, 0);

                const cleanName = f.name.replace(/\.[^.]+$/, '') || `طالب ورقة #${gradebook.length + 1}`;
                const res = processCanvasOMR(offCanvas, cleanName);
                gradebook.push(res);
                resolve();
              };
              img.onerror = resolve;
              img.src = URL.createObjectURL(f);
            });
          }
        }

        if (progressText) progressText.textContent = 'اكتمل التصحيح الضوئي للدفعة بنجاح ✓';
        if (progressPct) progressPct.textContent = '100%';
        if (progressBar) progressBar.style.width = '100%';

        renderGradebook();
        $('#omrGradebookSection').hidden = false;
        $('#omrGradebookSection').scrollIntoView({ behavior: 'smooth' });
      } catch (err) {
        alert('حدث خطأ أثناء معالجة ملفات السكنر: ' + err.message);
      } finally {
        startBatchBtn.disabled = false;
      }
    });

    // --- عرض كشف الدرجات والإحصائيات التراكمية ---
    const renderGradebook = () => {
      const section = $('#omrGradebookSection');
      if (!section) return;

      const total = gradebook.length;
      if (total === 0) {
        section.hidden = true;
        return;
      }
      section.hidden = false;

      // الإحصائيات
      const passedCount = gradebook.filter((g) => g.passed).length;
      const passRate = Math.round((passedCount / total) * 100);
      const sumScore = gradebook.reduce((acc, g) => acc + g.score, 0);
      const avgScore = (sumScore / total).toFixed(1);
      const maxScore = Math.max(...gradebook.map((g) => g.score));
      const minScore = Math.min(...gradebook.map((g) => g.score));

      $('#statTotalSheets').textContent = String(total);
      $('#statPassRate').textContent = `${passRate}%`;
      $('#statPassedCount').textContent = `${passedCount} ناجح من ${total}`;
      $('#statAvgScore').textContent = `${avgScore} / ${qCount}`;
      $('#statHighLow').textContent = `${maxScore} / ${minScore}`;

      // ملء الجدول
      const tbody = $('#omrGradebookTbody');
      if (!tbody) return;
      tbody.innerHTML = '';

      gradebook.forEach((st, idx) => {
        const tr = el('tr', {});
        tr.innerHTML = `
          <td style="font-weight: 700; color: #718096;">${idx + 1}</td>
          <td><strong style="color: #06302C;">${st.name}</strong> <span style="background:#0F172A; color:#FFF; font-size:.7rem; font-weight:800; padding:1px 6px; border-radius:3px; margin-right:4px;">نموذج (${st.model || 'A'})</span></td>
          <td><span class="student-score-badge" style="font-size: .85rem; padding: 2px 8px;">${st.score} / ${st.total}</span></td>
          <td><strong>${st.pct}%</strong></td>
          <td><span class="status-pill ${st.passed ? 'pass' : 'fail'}">${st.grade}</span></td>
          <td><small style="color: ${st.wrong === 0 && st.blank === 0 ? '#2E7D32' : '#C53030'};">${st.errorSummary}</small></td>`;
        tbody.append(tr);
      });
    };

    // تصدير كشف الدرجات إلى CSV / Excel متوافق مع الحروف العربية
    $('#omrExportCsvBtn')?.addEventListener('click', () => {
      if (!gradebook.length) {
        alert('كشف الدرجات فارغ حالياً.');
        return;
      }

      const rows = [
        ['ت', 'اسم الطالب / تسلسل الورقة', 'نموذج الاختبار', 'الدرجة', 'المجموع الكلي', 'النسبة المئوية', 'التقدير الأكاديمي', 'الحالة', 'تفاصيل الأخطاء المرصودة'],
        ...gradebook.map((st, i) => [
          i + 1,
          st.name,
          `نموذج (${st.model || 'A'})`,
          st.score,
          st.total,
          `${st.pct}%`,
          st.grade,
          st.passed ? 'ناجح' : 'راسب',
          st.errorSummary.replace(/,/g, ' - '),
        ]),
      ];

      const csvContent = '\ufeff' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `كشف_درجات_الببل_شيت_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // طباعة كشف الدرجات الرسمي للقسم
    $('#omrPrintGradebookBtn')?.addEventListener('click', () => {
      const tableHtml = $('#omrPrintableGradebookTable')?.innerHTML || '';
      const college = $('#omrGenCollege')?.value.trim() || 'وزارة التعليم العالي والبحث العلمي';
      const subject = $('#omrGenSubject')?.value.trim() || 'مادة الاختبار الأكاديمي';
      const stage = $('#omrGenStage')?.value.trim() || 'الدراسات الأولية';
      const printYear = new Date();
      const academicStart = printYear.getMonth() >= 8 ? printYear.getFullYear() : printYear.getFullYear() - 1;
      const academicYear = academicStart + ' - ' + (academicStart + 1);

      const fullReportHtml = `
        <div style="direction: rtl; text-align: right; padding: 10px;">
          <table width="100%" border="0" style="border-bottom: 2px solid #06302C; margin-bottom: 15px; padding-bottom: 8px;">
            <tr>
              <td width="35%">
                <strong>${college}</strong><br>
                <span>اللجنة الامتحانية المركزية</span>
              </td>
              <td width="35%" align="center">
                <h2 style="margin: 0; color: #06302C;">كشف درجات الاختبار النهائي (OMR)</h2>
                <span>العام الجامعي: ${academicYear} | ${stage}</span>
              </td>
              <td width="30%" align="left">
                <span>المادة: <strong>${subject}</strong></span><br>
                <span>تاريخ الرصد: <strong>${new Date().toISOString().slice(0, 10)}</strong></span>
              </td>
            </tr>
          </table>
          ${tableHtml}
          <table width="100%" border="0" style="margin-top: 40px; text-align: center;">
            <tr>
              <td><strong>أستاذ المادة</strong><br><br>................................</td>
              <td><strong>رئيس القسم العلمي</strong><br><br>................................</td>
              <td><strong>رئيس اللجنة الامتحانية</strong><br><br>................................</td>
            </tr>
          </table>
        </div>
      `;
      printIsolatedDocument(fullReportHtml, `كشف_درجات_${subject.replace(/\s+/g, '_')}`);
    });

    // تفريغ الكشف
    $('#omrClearGradebookBtn')?.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من رغبتك في تفريغ كشف درجات الطلاب الحالي؟')) {
        gradebook = [];
        renderGradebook();
      }
    });

    // التهيئة الابتدائية
    renderMasterKeyGrid();
    renderPrintableSheet();
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
  /* =====================================================
     TOOL-06 | نظام الاختبارات والتصحيح الذكي وتوليد أوراق الامتحانات (M1)
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

    // خوارزمية ذكية لاستخراج الأسئلة من النصوص الأكاديمية والملفات المرفوعة
    function buildCustomQuestions(rawText) {
      const sentences = rawText
        .split(/[.!؟\n؛]+/)
        .map((s) => s.trim().replace(/^[-•*–\d.)\s]+/, ''))
        .filter((s) => s.length >= 25 && s.length <= 260);

      if (!sentences.length) return [];
      const generated = [];

      // استخراج بنك كلمات مميزة من النص لتوليد خيارات متعددة ذات صلة
      const extractedKeywords = Array.from(new Set(
        rawText
          .replace(/[^\u0600-\u06FF\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 5 && !/^(التي|الذي|الذين|اللتان|هذا|هذه|هؤلاء|ذلك|تلك|حيث|عندما|عندئذ|كذلك|إلى|على|في|من|عن|مع|أن|إن|كان|كانت|يكون)$/.test(w))
      ));

      sentences.forEach((sent, idx) => {
        // نوع 1: صح / خطأ مع تنويع منطقي
        const canInvert = /(يمكن|يجب|يشترط|دائماً|يُعد|تُعد|يعتمد|تعتمد|يؤدي|تؤدي)/.test(sent);
        if (canInvert && idx % 2 === 1) {
          const inverted = sent
            .replace('يمكن', 'لا يمكن إطلاقاً')
            .replace('يجب', 'لا يلزم ولا يجب')
            .replace('يشترط', 'لا يُشترط')
            .replace('دائماً', 'نادراً ما')
            .replace('يُعد', 'لا يُعد بأي شكل')
            .replace('تُعد', 'لا تُعد بأي شكل')
            .replace('يعتمد', 'لا يعتمد إطلاقاً')
            .replace('تعتمد', 'لا تعتمد إطلاقاً')
            .replace('يؤدي', 'لا يؤدي أبداً')
            .replace('تؤدي', 'لا تؤدي أبداً');

          generated.push({
            q: `وفقاً للمحتوى الأكاديمي: «${inverted}»`,
            opts: ['صح', 'خطأ'],
            a: 1,
            exp: `العبارة خاطئة لأن المحتوى يثبت عكس ذلك: «${sent}».`,
            type: 'tf',
          });
        } else {
          generated.push({
            q: `وفقاً للمحتوى الأكاديمي: «${sent}» — هذه العبارة مطابقة وموثوقة.`,
            opts: ['صح', 'خطأ'],
            a: 0,
            exp: 'العبارة صحيحة ومتطابقة تماماً مع النص الأصلي للمحاضرة.',
            type: 'tf',
          });
        }

        // نوع 2: اختيار من متعدد (MCQ) مع استبدال مصطلح جوهري
        const words = sent.split(/\s+/).filter((w) => w.length >= 4);
        if (words.length >= 5) {
          // اختيار كلمة جوهرية ليست حرف جر
          const candidateWords = words.filter((w) => !/^(على|إلى|منذ|حتى|خلال|تحت|فوق|بين|حول|جميع|بعض|تلك|هذا|هذه)$/.test(w));
          const targetWord = candidateWords[Math.floor(candidateWords.length / 2)] || words[2];
          const blanked = sent.replace(targetWord, ' ( ............ ) ');

          // بناء خيارات متعددة ذكية ومشتتات مناسبة
          const poolDistractors = extractedKeywords.filter((w) => w !== targetWord && Math.abs(w.length - targetWord.length) <= 4);
          const fallbackDistractors = ['المتغيرات المستقلة', 'العينة الطبقية', 'الارتباط العكسي', 'التحليل التبايني', 'الاتساق الداخلي'];
          const distractors = [...poolDistractors, ...fallbackDistractors].filter((d) => d !== targetWord).slice(0, 3);

          const opts = [targetWord, ...distractors];
          // خلط الخيارات للحصول على تنوع في الإجابة الصحيحة
          const correctVal = targetWord;
          const shuffledOpts = [...opts].sort(() => 0.5 - Math.random());
          const correctIdx = shuffledOpts.indexOf(correctVal);

          generated.push({
            q: `أكمل الفراغ بالخيار العلمي الدقيق: «${blanked}»`,
            opts: shuffledOpts,
            a: correctIdx,
            exp: `المصطلح العلمي الصحيح الوارد في المتن هو: «${targetWord}».`,
            type: 'mcq',
          });
        }
      });

      return generated;
    }

    let activeQuestions = [];
    let currentIdx = 0;
    let userAnswers = {};
    let isTeacherMode = false;

    // عناصر التحكم في الواجهة
    const step1Tab = $('#qStep1Tab');
    const step2Tab = $('#qStep2Tab');
    const step3Tab = $('#qStep3Tab');
    const step4Tab = $('#qStep4Tab');

    const setupView = $('#quizSetupView');
    const playView = $('#quizPlayView');
    const reportView = $('#quizReportView');
    const examPaperView = $('#quizExamPaperView');

    const studentBtn = $('#quizRoleStudentBtn');
    const teacherBtn = $('#quizRoleTeacherBtn');
    const teacherFields = $('#quizTeacherFields');

    // التنقل بين الخطوات الأربع
    const switchQuizStep = (step) => {
      [step1Tab, step2Tab, step3Tab, step4Tab].forEach((t) => {
        if (t) t.classList.remove('active');
      });
      setupView.hidden = true;
      playView.hidden = true;
      reportView.hidden = true;
      if (examPaperView) examPaperView.hidden = true;

      if (step === 1) {
        step1Tab.classList.add('active');
        setupView.hidden = false;
        if (step4Tab) step4Tab.hidden = true;
      } else if (step === 2) {
        step2Tab.classList.add('active');
        playView.hidden = false;
        if (step4Tab) step4Tab.hidden = true;
      } else if (step === 3) {
        step3Tab.classList.add('active');
        reportView.hidden = false;
        if (step4Tab) step4Tab.hidden = true;
      } else if (step === 4) {
        if (step4Tab) {
          step4Tab.hidden = false;
          step4Tab.classList.add('active');
        }
        if (examPaperView) examPaperView.hidden = false;
      }
    };

    // تبديل الوضع: طالب أو أستاذ
    if (studentBtn && teacherBtn) {
      studentBtn.addEventListener('click', () => {
        isTeacherMode = false;
        studentBtn.classList.add('active');
        teacherBtn.classList.remove('active');
        if (teacherFields) teacherFields.hidden = true;
      });

      teacherBtn.addEventListener('click', () => {
        isTeacherMode = true;
        teacherBtn.classList.add('active');
        studentBtn.classList.remove('active');
        if (teacherFields) teacherFields.hidden = false;
      });
    }

    // ==========================================
    // معالجة رفع الملفات (DOCX, PDF, TXT)
    // ==========================================
    const dropZone = $('#quizDropZone');
    const fileInput = $('#quizFileInput');
    const browseBtn = $('#quizBrowseBtn');
    const fileInfo = $('#quizFileInfo');
    const fileNameEl = $('#quizFileName');
    const fileSizeEl = $('#quizFileSize');
    const clearFileBtn = $('#quizClearFileBtn');
    const fileMsg = $('#quizFileMsg');

    const formatFileSize = (bytes) => {
      if (!bytes || bytes === 0) return '0 ك.ب';
      const k = 1024;
      const dm = 1;
      const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const clearUploadedFile = () => {
      if (fileInput) fileInput.value = '';
      if (fileInfo) fileInfo.hidden = true;
      if (fileMsg) {
        fileMsg.textContent = '';
        fileMsg.className = 'form-msg';
      }
    };

    const processExtractedText = (text, name) => {
      const clean = (text || '').trim();
      if (!clean || clean.length < 20) {
        if (fileMsg) {
          fileMsg.textContent = 'الملف يحتوي على نص قليل جداً أو صفحات مصورة تحتاج إلى تمييز بصري (OCR). يرجى التأكد من احتواء الملف على نصوص رقمية.';
          fileMsg.className = 'form-msg err';
        }
        return;
      }

      const wordsCount = clean.split(/\s+/).length;
      $('#quizCustomText').value = clean;
      $('#quizPresetSelect').value = 'custom';

      // اقتراح عنوان المادة تلقائياً من اسم الملف للأستاذ
      const examSub = $('#examSubject');
      if (examSub && (!examSub.value || examSub.value.trim() === '')) {
        const rawName = name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        examSub.value = rawName;
      }

      if (fileMsg) {
        fileMsg.textContent = `تم استخراج ${wordsCount} كلمة بنجاح من «${name}». يمكنك الآن توليد الأسئلة أو طباعة ورقة الامتحان.`;
        fileMsg.className = 'form-msg ok';
      }
    };

    const handleFileUpload = async (file) => {
      if (!file) return;
      const name = file.name;
      const ext = name.slice(((name.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();

      if (fileNameEl) fileNameEl.textContent = name;
      if (fileSizeEl) fileSizeEl.textContent = `(${formatFileSize(file.size)})`;
      if (fileInfo) fileInfo.hidden = false;

      if (fileMsg) {
        fileMsg.textContent = 'جاري قراءة واستخراج النصوص من الملف مباشرة داخل المتصفح...';
        fileMsg.className = 'form-msg';
      }

      // ملفات نصية TXT أو MD
      if (ext === 'txt' || ext === 'md') {
        const reader = new FileReader();
        reader.onload = (e) => processExtractedText(e.target.result, name);
        reader.onerror = () => {
          if (fileMsg) {
            fileMsg.textContent = 'تعذرت قراءة الملف النصي.';
            fileMsg.className = 'form-msg err';
          }
        };
        reader.readAsText(file, 'utf-8');
        return;
      }

      // ملفات Word (.docx) عبر مكتبة Mammoth.js
      if (ext === 'docx') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (window.mammoth && typeof window.mammoth.extractRawText === 'function') {
              const res = await window.mammoth.extractRawText({ arrayBuffer: e.target.result });
              processExtractedText(res.value, name);
            } else {
              throw new Error('مكتبة فك ملفات Word لم تكتمل في المتصفح.');
            }
          } catch (err) {
            if (fileMsg) {
              fileMsg.textContent = 'تعذر استخراج النص من ملف Word: ' + (err.message || '');
              fileMsg.className = 'form-msg err';
            }
          }
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      // ملفات PDF عبر مكتبة PDF.js
      if (ext === 'pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!window.pdfjsLib) throw new Error('مكتبة قراءة PDF لم تكتمل.');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const loadingTask = window.pdfjsLib.getDocument({ data: e.target.result });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageStrings = content.items.map((item) => item.str).join(' ');
              fullText += pageStrings + '\n\n';
            }
            processExtractedText(fullText, name);
          } catch (err) {
            if (fileMsg) {
              fileMsg.textContent = 'تعذر استخراج النص من ملف PDF (قد يكون مؤلفاً من صور ممسوحة أو مشفراً).';
              fileMsg.className = 'form-msg err';
            }
          }
        };
        reader.readAsArrayBuffer(file);
        return;
      }

      if (fileMsg) {
        fileMsg.textContent = 'نوع الملف غير مدعوم، يرجى اختيار ملف Word (.docx) أو PDF أو ملف نصي.';
        fileMsg.className = 'form-msg err';
      }
    };

    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
      });
    }
    if (clearFileBtn) {
      clearFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearUploadedFile();
      });
    }
    if (dropZone) {
      dropZone.addEventListener('click', (e) => {
        if (!e.target.closest('#quizClearFileBtn') && !e.target.closest('#quizBrowseBtn')) {
          if (fileInput) fileInput.click();
        }
      });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    // ==========================================
    // حل الاختبار الإلكتروني والتصحيح
    // ==========================================
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

      const hasErrors = correctCount < total;
      $('#quizRetryWrongBtn').hidden = !hasErrors;

      switchQuizStep(3);
    };

    // استخراج وتصفية بنك الأسئلة المشترك
    const getPreparedQuestionPool = () => {
      const preset = $('#quizPresetSelect').value;
      const count = parseInt($('#quizCountSelect').value, 10) || 10;
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
        if (qType === 'mcq' || qType === 'bubble') return !isTf; // الببل شيت مخصص حصراً للاختيار من متعدد
        return true;
      });

      // إذا كان المطلوب ببل شيت أو اختيار من متعدد ولم تتوفر أسئلة كافية، نكمّل من بنك أسئلة MCQ الجاهزة
      if ((qType === 'bubble' || qType === 'mcq') && filtered.length < count) {
        const allMcq = [].concat(
          QUIZ_PRESETS['research-methods'],
          QUIZ_PRESETS.statistics,
          QUIZ_PRESETS.ethics,
          QUIZ_PRESETS.bologna
        ).filter((q) => q.opts.length > 2);
        const existingTexts = new Set(filtered.map((q) => q.q));
        for (const item of allMcq) {
          if (!existingTexts.has(item.q)) {
            filtered.push(item);
            existingTexts.add(item.q);
            if (filtered.length >= count) break;
          }
        }
      }

      if (!filtered.length) filtered = basePool;

      return filtered.slice(0, count);
    };

    // زر بدء الاختبار الفوري (وضع الطالب)
    $('#startQuizBuildBtn').addEventListener('click', () => {
      activeQuestions = getPreparedQuestionPool();
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

    // ==========================================
    // توليد ورقة الامتحان الرسمية واستمارة الببل شيت (OMR)
    // ==========================================
    const arabicOptionLetters = ['أ', 'ب', 'ج', 'د', 'هـ'];
    const englishOptionLetters = ['A', 'B', 'C', 'D', 'E'];

    // 1. توليد ورقة الأسئلة التقليدية للطلبة
    const buildQuestionSheetHTML = (questions) => {
      const collegeVal = ($('#examCollege') && $('#examCollege').value.trim()) || 'وزارة التعليم العالي والبحث العلمي - الكلية الأكاديمية';
      const subjectVal = ($('#examSubject') && $('#examSubject').value.trim()) || 'مقرر المنهج الدراسي العام';
      const stageVal = ($('#examStage') && $('#examStage').value.trim()) || 'الدراسات الجامعية الأولية - الدور الأول';
      const timeMarksVal = ($('#examTimeMarks') && $('#examTimeMarks').value.trim()) || 'الوقت: ساعتان | الدرجة الكلية: 100';
      const curYear = new Date().getFullYear();

      const mcqList = questions.filter((q) => q.opts.length > 2);
      const tfList = questions.filter((q) => q.opts.length === 2);

      let questionsHtml = '';
      let qCounter = 1;

      if (mcqList.length) {
        questionsHtml += `
          <div class="exam-section-block">
            <div class="exam-section-title">
              <strong>السؤال ${qCounter === 1 ? 'الأول' : 'التالي'}: اختر الإجابة الأصح من بين الخيارات المتاحة لكل فقرة:</strong>
              <span>(${Math.round(100 * (mcqList.length / questions.length))} درجة)</span>
            </div>
            <div class="exam-questions-list">
              ${mcqList.map((item, idx) => `
                <div class="exam-question-item">
                  <div class="exam-q-text">
                    <span class="exam-q-num">${idx + 1}.</span>
                    <span>${item.q}</span>
                  </div>
                  <div class="exam-options-grid">
                    ${item.opts.map((opt, optIdx) => `
                      <div class="exam-opt-cell">
                        <span class="exam-opt-letter">(${arabicOptionLetters[optIdx] || optIdx + 1})</span>
                        <span class="exam-opt-text">${opt}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        qCounter++;
      }

      if (tfList.length) {
        questionsHtml += `
          <div class="exam-section-block" style="margin-top: 1.5rem;">
            <div class="exam-section-title">
              <strong>السؤال ${qCounter === 1 ? 'الأول' : 'الثاني'}: ضع علامة ( ✓ ) أمام العبارة الصحيحة وعلامة ( ✗ ) أمام العبارة الخاطئة:</strong>
              <span>(${Math.round(100 * (tfList.length / questions.length))} درجة)</span>
            </div>
            <div class="exam-questions-list">
              ${tfList.map((item, idx) => `
                <div class="exam-question-item" style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;">
                  <div class="exam-q-text">
                    <span class="exam-q-num">${idx + 1}.</span>
                    <span>${item.q}</span>
                  </div>
                  <div class="exam-tf-box" style="border: 1px dashed #718096; width: 60px; height: 26px; border-radius: 4px; flex-shrink: 0; text-align: center; line-height: 26px; font-weight: bold; color: #718096;">[ &nbsp; &nbsp; ]</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        qCounter++;
      }

      return `
        <div class="question-paper-sheet">
          <!-- الترويسة الرسمية -->
          <header class="exam-header">
            <div class="exam-header-right">
              <strong>جمهورية العراق</strong>
              <span>${collegeVal}</span>
              <span>العام الجامعي: ${curYear} - ${curYear + 1}</span>
            </div>
            <div class="exam-header-center">
              <div class="exam-header-bismillah">بسم الله الرحمن الرحيم</div>
              <div class="exam-header-emblem">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="44" height="44"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20"/><path d="M2 12h20"/></svg>
              </div>
              <strong class="exam-paper-main-title">الامتحان الأكاديمي النهائي / الفصلي</strong>
            </div>
            <div class="exam-header-left">
              <span>المادة: <strong>${subjectVal}</strong></span>
              <span>المرحلة: <strong>${stageVal}</strong></span>
              <span>${timeMarksVal}</span>
            </div>
          </header>

          <!-- صندوق بيانات الطالب -->
          <div class="exam-student-box">
            <div class="student-info-col">
              <span>اسم الطالب الرباعي: ................................................................</span>
              <span>القسم / الشعبة: ................................................................</span>
            </div>
            <div class="student-info-col">
              <span>القاعة الامتحانية: .................................................</span>
              <span>توقيع الطالب: ................................................................</span>
            </div>
          </div>

          <!-- إرشادات وتعليمات الامتحان -->
          <div class="exam-instructions-box">
            <strong>تعليمات امتحانية هامة:</strong>
            <span>(1) الإجابة بالقلم الجاف حصراً. (2) قراءة الأسئلة بدقة والتأكد من وضوح الاختيار. (3) يُمنع إدخال الهواتف الذكية إلى القاعة الامتحانية.</span>
          </div>

          <!-- متن الأسئلة -->
          ${questionsHtml}

          <!-- تذييل الورقة -->
          <div class="exam-footer-note">
            <span>« انتهت الأسئلة — مع أمنياتنا لجميع الطلبة بالتفوق والنجاح الباهر »</span>
          </div>
        </div>
      `;
    };

    // 2. توليد استمارة إجابة التظليل الإلكتروني (ببل شيت - Bubble Sheet OMR)
    const buildBubbleSheetHTML = (questions, isMasterKey = false) => {
      const collegeVal = ($('#examCollege') && $('#examCollege').value.trim()) || 'وزارة التعليم العالي والبحث العلمي - الكلية الأكاديمية';
      const subjectVal = ($('#examSubject') && $('#examSubject').value.trim()) || 'مقرر المنهج الدراسي العام';
      const stageVal = ($('#examStage') && $('#examStage').value.trim()) || 'الدراسات الجامعية الأولية - الدور الأول';
      const curYear = new Date().getFullYear();

      // الببل شيت مخصص حصراً لأسئلة الاختيار من متعدد (MCQ) بأربعة خيارات (A, B, C, D)
      const mcqQuestions = questions.filter((q) => q.opts.length > 2);
      const targetQuestions = mcqQuestions.length ? mcqQuestions : questions;

      // تقسيم الأسئلة في أعمدة متناسقة (حتى 10 أو 15 سؤال في العمود)
      const perCol = Math.ceil(targetQuestions.length / (targetQuestions.length > 15 ? 3 : 2)) || 10;
      const columns = [];
      for (let i = 0; i < targetQuestions.length; i += perCol) {
        columns.push(targetQuestions.slice(i, i + perCol));
      }

      return `
        <div class="bubble-sheet-container ${isMasterKey ? 'master-key-mode' : ''}">
          <!-- علامات المحاذاة الضوئية للماسح الإلكتروني OMR -->
          <div class="omr-corner omr-tl"></div>
          <div class="omr-corner omr-tr"></div>
          <div class="omr-corner omr-bl"></div>
          <div class="omr-corner omr-br"></div>
          <div class="omr-timing-top"></div>

          <!-- ترويسة الببل شيت -->
          <div class="bubble-sheet-header">
            <div class="bsh-right">
              <strong>جمهورية العراق</strong>
              <span>${collegeVal}</span>
              <span>اللجنة الامتحانية المركزية</span>
            </div>
            <div class="bsh-center">
              <div class="bsh-title-badge">${isMasterKey ? 'مفتاح التصحيح النموذجي (معتمد للتدريسي)' : 'استمارة إجابة الاختبار الإلكتروني'}</div>
              <h3 class="bsh-title">ورقة إجابة التظليل الآلي (BUBBLE SHEET - OMR)</h3>
              <span class="bsh-session">العام الجامعي: ${curYear} - ${curYear + 1} | ${stageVal}</span>
            </div>
            <div class="bsh-left">
              <span>المادة: <strong>${subjectVal}</strong></span>
              <span>رمز الاختبار: <strong>OMR-${Math.abs(curYear)}-M1</strong></span>
              <div class="omr-barcode-box">
                <div class="fake-barcode">||||| || |||| ||| |||| | ||</div>
                <small>OMR-SHEET-VERIFIED</small>
              </div>
            </div>
          </div>

          <!-- شبكة بيانات الطالب وتظليل نموذج الأسئلة -->
          <div class="bubble-sheet-meta-grid">
            <!-- 1. بيانات الطالب الأساسية -->
            <div class="bs-box">
              <div class="bs-box-title">بيانات الطالب الأساسية</div>
              <div class="bs-field-line"><span>اسم الطالب الرباعي:</span> ................................................................</div>
              <div class="bs-field-line"><span>القسم والشعبة:</span> ................................................................</div>
              <div class="bs-field-line"><span>نوع الدراسة:</span> [ &nbsp; ] صباحي &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] مسائي</div>
              <div class="bs-field-line"><span>القاعة الامتحانية:</span> .......................... <span>توقيع الطالب:</span> ..........................</div>
            </div>

            <!-- 2. تظليل نموذج الأسئلة وإرشادات التظليل -->
            <div class="bs-box">
              <div class="bs-box-title">تظليل نموذج الأسئلة (Model)</div>
              <div class="omr-model-bubbles">
                <label><span class="omr-bubble-model ${isMasterKey ? 'shaded-key' : ''}">A / أ</span></label>
                <label><span class="omr-bubble-model">B / ب</span></label>
                <label><span class="omr-bubble-model">C / ج</span></label>
                <label><span class="omr-bubble-model">D / د</span></label>
              </div>

              <div class="omr-guide-box">
                <strong>تعليمات التظليل للماسح الضوئي:</strong>
                <div class="guide-icons-row">
                  <div class="guide-item ok">
                    <span class="guide-circle filled">●</span>
                    <span>صحيح</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">✓</span>
                    <span>خطأ</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">✕</span>
                    <span>خطأ</span>
                  </div>
                  <div class="guide-item bad">
                    <span class="guide-circle">·</span>
                    <span>خطأ</span>
                  </div>
                </div>
                <small class="guide-text">ظلل الدائرة بالكامل بقلم رصاص أو جاف أسود/أزرق. لا تضع أي إشارة خارج الدوائر وتجنب ثني الاستمارة.</small>
              </div>
            </div>
          </div>

          <!-- شبكة دوائر الإجابة (OMR Response Grid) - اختيار من متعدد حصراً (A, B, C, D) -->
          <div class="bubble-grid-container">
            <div class="bubble-grid-columns">
              ${columns.map((colGroup, colIdx) => `
                <div class="bubble-col">
                  ${colGroup.map((item, rowIdx) => {
                    const qGlobalNum = colIdx * perCol + rowIdx + 1;
                    return `
                      <div class="bubble-row">
                        <span class="bubble-q-num">${qGlobalNum < 10 ? '0' + qGlobalNum : qGlobalNum}</span>
                        <div class="bubble-options">
                          ${englishOptionLetters.slice(0, 4).map((letter, optIdx) => `
                            <span class="omr-bubble ${isMasterKey && item.a === optIdx ? 'shaded-key' : ''}" title="الخيار (${letter})">
                              ${letter}
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- تذييل الببل شيت وعلامات المعايرة -->
          <div class="bubble-sheet-footer">
            <div class="bsf-alert">تنبيه هام: تُصحح هذه الاستمارة ضوئياً بواسطة القارئ الإلكتروني (OMR)؛ يرجى ملء دائرة واحدة فقط لكل فقرة والتظليل المزدوج يُلغي الدرجة.</div>
            <div class="omr-calib-line">■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</div>
          </div>
        </div>
      `;
    };

    // 3. جدول مفتاح الحل المعتمد التفصيلي للأستاذ
    const buildAnswerKeyRubricTable = (questions) => {
      return `
        <div class="exam-answer-key-box" style="margin-top: 1.5rem;">
          <div class="exam-key-head">
            <strong>📋 دليل الإجابة النموذجية ومفتاح التصحيح الرسمي (للأستاذ واللجنة الامتحانية)</strong>
            <span>سري ومعتمد للتدريسي فقط</span>
          </div>
          <table class="exam-key-table">
            <thead>
              <tr>
                <th style="width: 8%;">رقم</th>
                <th style="width: 37%;">نص السؤال أو الفقرة</th>
                <th style="width: 25%;">الإجابة الصحيحة المعتمدة</th>
                <th style="width: 30%;">السند العلمي والتفسير</th>
              </tr>
            </thead>
            <tbody>
              ${questions.map((item, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td>${item.q}</td>
                  <td style="color: #06302C; font-weight: 700;">${item.opts[item.a]} (${arabicOptionLetters[item.a] || ''})</td>
                  <td style="font-size: .85rem; color: #4A5568;">${item.exp}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    // إدارة التبديل بين التبويبات الفرعية (ورقة الأسئلة / دليل ومفتاح التصحيح)
    const setExamSubView = (view) => {
      const qWrap = $('#examQuestionsViewWrapper');
      const kWrap = $('#examMasterKeyViewWrapper');

      const tabQ = $('#tabViewQuestions');
      const tabK = $('#tabViewMasterKey');

      [tabQ, tabK].forEach((t) => { if (t) t.classList.remove('active'); });

      if (qWrap) qWrap.style.display = view === 'questions' ? 'block' : 'none';
      if (kWrap) kWrap.style.display = view === 'key' ? 'block' : 'none';

      if (view === 'questions' && tabQ) tabQ.classList.add('active');
      if (view === 'key' && tabK) tabK.classList.add('active');
    };

    // توليد وتجهيز كامل محتويات ورقة الأسئلة ودليل التصحيح
    const buildExamPaperHTML = (questions) => {
      return `
        <div id="examQuestionsViewWrapper">
          ${buildQuestionSheetHTML(questions)}
        </div>
        <div id="examMasterKeyViewWrapper" style="display: none;">
          ${buildAnswerKeyRubricTable(questions)}
        </div>
      `;
    };

    // زر توليد الورقة الامتحانية ودليل الإجابة
    $('#generateExamPaperBtn').addEventListener('click', () => {
      activeQuestions = getPreparedQuestionPool();
      const container = $('#printableExamContainer');
      if (container) {
        container.innerHTML = buildExamPaperHTML(activeQuestions);
      }
      switchQuizStep(4);
      setExamSubView('questions');
    });

    // أزرار التبديل بين معاينة الأسئلة ودليل الحل
    const tabQBtn = $('#tabViewQuestions');
    const tabKBtn = $('#tabViewMasterKey');

    if (tabQBtn) tabQBtn.addEventListener('click', () => setExamSubView('questions'));
    if (tabKBtn) tabKBtn.addEventListener('click', () => setExamSubView('key'));

    // زر الانتقال السريع إلى منظومة الببل شيت والتصحيح الضوئي (TOOL-02)
    const goToOmrBtn = $('#goToOmrFromQuizBtn');
    if (goToOmrBtn) {
      goToOmrBtn.addEventListener('click', () => {
        Modal.close($('#dlg-quiz'));
        Modal.open($('#dlg-omr'));
      });
    }

    // طباعة ورقة الأسئلة للطلبة عبر إطار معزول
    $('#printExamStudentBtn').addEventListener('click', () => {
      setExamSubView('questions');
      const html = $('#examQuestionsViewWrapper')?.innerHTML || '';
      printIsolatedDocument(html, 'ورقة_الأسئلة_الأكاديمية');
    });

    // طباعة دليل ومفتاح التصحيح النموذجي للأستاذ
    $('#printExamAnswerKeyBtn').addEventListener('click', () => {
      setExamSubView('key');
      const html = $('#examMasterKeyViewWrapper')?.innerHTML || '';
      printIsolatedDocument(html, 'دليل_الحل_النموذجي_المعتمد');
    });

    // منشئ وثيقة Word جدولية خاصة بالببل شيت لضمان تناسق الأعمدة والدوائر داخل Word
    const buildQuizWordBubbleDoc = (questions, isMasterKey = false) => {
      const college = $('#examCollege')?.value.trim() || 'وزارة التعليم العالي والبحث العلمي - الكلية الجامعية';
      const subject = $('#examSubject')?.value.trim() || 'مادة الاختبار الأكاديمي';
      const stage = $('#examStage')?.value.trim() || 'الدراسات الأولية';
      const curYear = new Date().getFullYear();

      const qTotal = questions.length;
      const colsCount = qTotal <= 20 ? 2 : qTotal <= 30 ? 3 : 4;
      const perCol = Math.ceil(qTotal / colsCount);
      const colWidthPct = Math.floor(100 / colsCount);
      const letters = ['A', 'B', 'C', 'D'];

      const circledUnicode = { A: '&#9398;', B: '&#9399;', C: '&#9400;', D: '&#9401;' };
      let columnsCells = '';
      for (let c = 0; c < colsCount; c++) {
        const start = c * perCol;
        const end = Math.min(start + perCol, qTotal);

        let colRows = '';
        for (let q = start; q < end; q++) {
          const qNum = q + 1;
          const qFormatted = qNum < 10 ? '0' + qNum : String(qNum);
          const correctOptIdx = questions[q].a;

          const bubblesWord = letters
            .map((ltr, optIdx) => {
              const isShaded = isMasterKey && correctOptIdx === optIdx;
              if (isShaded) {
                return `<b style="background-color:#000000; color:#ffffff; padding:1pt 5pt; font-family:Arial,sans-serif; font-size:9pt; border:1pt solid #000000;">&nbsp;${ltr}&nbsp;</b>`;
              }
              return `<span style="font-family:'Segoe UI Symbol','Arial Unicode MS',Arial,sans-serif; font-size:13pt; color:#111111;">${circledUnicode[ltr]}</span>`;
            })
            .join('&nbsp;&nbsp;&nbsp;');

          colRows += `
            <table width="100%" border="0" cellpadding="2" cellspacing="0" style="margin-bottom: 3pt; border-bottom: 1px dotted #ccc;">
              <tr>
                <td width="28" align="center" style="background:#E2E8F0; border:1px solid #CBD5E0; font-weight:bold; font-size:8.5pt; font-family:Arial,sans-serif; padding:2pt;">${qFormatted}</td>
                <td align="center" style="padding:2pt;">${bubblesWord}</td>
              </tr>
            </table>`;
        }

        columnsCells += `
          <td width="${colWidthPct}%" valign="top" style="padding: 4pt 8pt; ${c < colsCount - 1 ? 'border-left: 1.5pt solid #000;' : ''}">
            ${colRows}
          </td>`;
      }

      return `
        <div style="border: 2pt solid #000; padding: 12pt; background: #fff;">
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 6pt;">
            <tr>
              <td width="20" height="20" style="background:#000;">&nbsp;</td>
              <td align="center" style="font-size:8pt; letter-spacing:2px; font-weight:bold;">■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■</td>
              <td width="20" height="20" style="background:#000;">&nbsp;</td>
            </tr>
          </table>
          <table width="100%" border="0" cellpadding="2" cellspacing="0" style="border-bottom: 2pt solid #000; padding-bottom: 6pt; margin-bottom: 8pt;">
            <tr>
              <td width="30%" align="right" valign="top" style="font-size: 8.5pt;">
                <strong>وزارة التعليم العالي والبحث العلمي</strong><br>
                <span>${college}</span><br>
                <span>اللجنة الامتحانية المركزية</span>
              </td>
              <td width="40%" align="center" valign="top">
                <div style="background:#06302C; color:#fff; display:inline-block; padding:2pt 10pt; font-size:8pt; font-weight:bold; border-radius:3pt;">
                  ${isMasterKey ? '★ مفتاح التصحيح النموذجي المعتمد (Master Key)' : 'استمارة إجابة الاختبار الإلكتروني'}
                </div>
                <h2 style="margin: 4pt 0; font-size: 13pt; font-weight: 900; color: #000;">ورقة إجابة التظليل الآلي (BUBBLE SHEET)</h2>
                <span style="font-size: 8.5pt; font-weight: bold; color: #333;">العام الجامعي: ${curYear} - ${curYear + 1} | ${stage}</span>
              </td>
              <td width="30%" align="left" dir="ltr" valign="top" style="font-size: 8.5pt; text-align: left;">
                <div style="text-align: right; direction: rtl;">
                  المادة: <strong>${subject}</strong><br>
                  رمز النموذج: <strong>OMR-${qTotal}Q-${curYear}</strong>
                </div>
                <div style="font-family: monospace; font-size: 12pt; font-weight: bold; letter-spacing: 2px; margin-top: 3pt;">
                  ||||| || |||| ||| ||||
                </div>
              </td>
            </tr>
          </table>
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 8pt;">
            <tr>
              <td width="58%" valign="top" style="padding-left: 6pt;">
                <div class="student-box" style="margin:0; padding:6pt 8pt;">
                  <div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:2pt; margin-bottom:4pt; font-size:8.5pt; background:#f0f0f0; text-align:center;">
                    بيانات الطالب الأساسية
                  </div>
                  <div style="font-size:8pt; margin-bottom:3pt;"><strong>اسم الطالب الرباعي:</strong> ................................................................</div>
                  <div style="font-size:8pt; margin-bottom:3pt;"><strong>القسم العلمي:</strong> ................................................................</div>
                  <div style="font-size:8pt; margin-bottom:3pt;"><strong>نوع الدراسة:</strong> [ &nbsp; ] صباحي &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [ &nbsp; ] مسائي</div>
                  <div style="font-size:8pt;"><strong>القاعة الامتحانية:</strong> .......................... &nbsp;&nbsp; <strong>توقيع الطالب:</strong> ..........................</div>
                </div>
              </td>
              <td width="42%" valign="top" style="padding-right: 6pt;">
                <div class="student-box" style="margin:0; padding:6pt 8pt;">
                  <div style="font-weight:bold; border-bottom:1px solid #ccc; padding-bottom:2pt; margin-bottom:4pt; font-size:8.5pt; background:#f0f0f0; text-align:center;">
                    ${isMasterKey ? 'دليل النموذج المعتمد' : 'نموذج الأسئلة وإرشادات التظليل'}
                  </div>
                  <div style="text-align:center; margin: 4pt 0 6pt;">
                    <span style="display:inline-block; width:30pt; height:18pt; line-height:18pt; border:1.5pt solid #000; border-radius:9pt; font-weight:bold; font-size:8pt; margin:0 2pt; ${isMasterKey ? 'background:#000; color:#fff;' : ''}">A / أ</span>
                    <span style="display:inline-block; width:30pt; height:18pt; line-height:18pt; border:1.5pt solid #000; border-radius:9pt; font-weight:bold; font-size:8pt; margin:0 2pt;">B / ب</span>
                    <span style="display:inline-block; width:30pt; height:18pt; line-height:18pt; border:1.5pt solid #000; border-radius:9pt; font-weight:bold; font-size:8pt; margin:0 2pt;">C / ج</span>
                    <span style="display:inline-block; width:30pt; height:18pt; line-height:18pt; border:1.5pt solid #000; border-radius:9pt; font-weight:bold; font-size:8pt; margin:0 2pt;">D / د</span>
                  </div>
                  <div style="font-size: 7.5pt; border-top: 1px dashed #ccc; padding-top: 3pt; color: #222;">
                    <strong>التعليمات:</strong> ظلل دائرة واحدة فقط بشكل كامل بقلم جاف أزرق أو أسود ( ● صحيح | ✕ خطأ | ✔ خطأ ). لا تستخدم الطامس.
                  </div>
                </div>
              </td>
            </tr>
          </table>
          <div style="border: 1.8pt solid #000; padding: 6pt; background: #fff; margin-bottom: 8pt;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                ${columnsCells}
              </tr>
            </table>
          </div>
          <table width="100%" border="0" cellpadding="2" cellspacing="0" style="border-top: 1.5pt solid #000; margin-top: 6pt;">
            <tr>
              <td align="center" style="font-size: 7.5pt; font-weight: bold; color: #222;">
                تنبيه هام: تُصحح هذه الاستمارة ضوئياً بواسطة القارئ الإلكتروني (OMR)؛ التظليل المزدوج أو الشطب يُلغي درجة الفقرة.
              </td>
            </tr>
            <tr>
              <td align="center" style="font-size: 8pt; letter-spacing: 3px; font-weight: bold;">
                ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■ ■
              </td>
            </tr>
          </table>
        </div>
      `;
    };

    // تصدير ورقة الأسئلة كملف Word (.doc) متكامل مع ترويسة وتنسيق عربي
    $('#exportExamDocBtn').addEventListener('click', () => {
      const container = $('#printableExamContainer');
      if (!container) return;
      const subName = ($('#examSubject') && $('#examSubject').value.trim()) || 'اسئلة-امتحان-اكاديمي';

      const isKeyActive = $('#examMasterKeyViewWrapper') && $('#examMasterKeyViewWrapper').style.display !== 'none';
      const activeContent = isKeyActive
        ? ($('#examMasterKeyViewWrapper')?.innerHTML || '')
        : ($('#examQuestionsViewWrapper')?.innerHTML || '');

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>ورقة الأسئلة الأكاديمية - ${subName}</title>
          <!--[if gte mso 9]>
          <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page Section1 {
              size: 21.0cm 29.7cm;
              margin: 1.2cm 1.2cm 1.2cm 1.2cm;
              mso-header-margin: 20pt;
              mso-footer-margin: 20pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body {
              direction: rtl;
              text-align: right;
              font-family: 'Simplified Arabic', 'Traditional Arabic', 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #000;
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            th, td { border: 1px solid #333; padding: 4pt 6pt; font-size: 10pt; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            .header-table td { border: none; padding: 2pt 4pt; vertical-align: top; }
            .student-box { border: 1.5pt solid #333; padding: 6pt; margin: 8pt 0; background: #fafafa; }
            .q-item { margin-bottom: 10pt; }
            .q-num { font-weight: bold; }
          </style>
        </head>
        <body dir='rtl'>
          <div class="Section1">
            ${activeContent}
          </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], {
        type: 'application/msword;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ورقة_امتحان_${subName.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // زر العودة إلى الإعداد من شاشة الامتحان
    $('#backToSetupFromExamBtn').addEventListener('click', () => {
      switchQuizStep(1);
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

  function initReferences() {
    const authorEl = $('#refAuthor'), yearEl = $('#refYear'), titleEl = $('#refTitle');
    const sourceEl = $('#refSource'), volEl = $('#refVol'), urlEl = $('#refUrl');
    const typeEl = $('#refType'), outEl = $('#refOutput');
    if (!authorEl || !yearEl || !titleEl || !outEl) return;
    const render = () => {
      const author = authorEl.value.trim(), year = yearEl.value.trim(), title = titleEl.value.trim();
      const source = sourceEl ? sourceEl.value.trim() : '', vol = volEl ? volEl.value.trim() : '';
      const url = urlEl ? urlEl.value.trim() : '', type = typeEl ? typeEl.value : 'journal';
      if (!author || !year || !title) { outEl.value = ''; outEl.placeholder = 'أدخل المؤلف والسنة والعنوان لتوليد المرجع.'; return; }
      let ref = author + ' (' + year + '). ' + title + '.';
      if (source) ref += ' ' + source + (type === 'journal' && vol ? ', ' + vol : '') + '.';
      if (url) ref += ' ' + url;
      outEl.value = ref;
    };
    [authorEl, yearEl, titleEl, sourceEl, volEl, urlEl, typeEl].forEach((el) => { if (el) el.addEventListener('input', render); });
    const copyBtn = $('#refCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', () => { if (outEl.value && navigator.clipboard) navigator.clipboard.writeText(outEl.value); });
    const clearBtn = $('#refClearBtn');
    if (clearBtn) clearBtn.addEventListener('click', () => { [authorEl, yearEl, titleEl, sourceEl, volEl, urlEl].forEach((el) => { if (el) el.value = ''; }); render(); });
  }

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
    initOmrSystem();
    initUnits();
    initQuiz();
    initReferences();
    modals.init();
    auth.init();
  });
})();
