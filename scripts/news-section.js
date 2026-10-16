/* قسم «أخبار التعليم العالي» في الصفحة الرئيسية — يتغذى من news.json */
(function () {
  'use strict';
  var CATEGORIES = [
    'أخبار الوزارة',
    'القبول والتسجيل',
    'المنح والبعثات',
    'الدراسات العليا',
    'الامتحانات والنتائج',
    'أخبار الجامعات',
    'التصنيفات والاعتماد'
  ];

  var section = document.getElementById('news');
  if (!section) return;
  var tabsEl = document.getElementById('newsTabs');
  var gridEl = document.getElementById('newsGrid');
  var featuredEl = document.getElementById('newsFeatured');
  var ALL = [];

  function valid(item) {
    if (!item || typeof item.title !== 'string' || !item.title.trim()) return false;
    if (typeof item.source !== 'string' || !item.source.trim()) return false;
    if (item.title.indexOf('تجريبي:') !== -1) return false;
    if (typeof item.url !== 'string') return false;
    try {
      var u = new URL(item.url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      if (u.username || u.password) return false;
    } catch (e) { return false; }
    return true;
  }

  function resolveCategory(item) {
    if (item && CATEGORIES.indexOf(item.category) !== -1) return item.category;
    var text = ((item && item.title) || '') + ' ' + ((item && item.summary) || '');
    var src = (item && item.source) || '';
    if (/(منح|منحة|بعثات|بعثة|زمالة|زمالات|ابتعاث)/.test(text)) return 'المنح والبعثات';
    if (/(قبول|تقديم|تسجيل|بوابة القبول|قنوات القبول|الموازي|المسائي)/.test(text)) return 'القبول والتسجيل';
    if (/(دراسات عليا|ماجستير|دكتوراه|أطروحة|رسالة ماجستير|مناقشة)/.test(text)) return 'الدراسات العليا';
    if (/(امتحان|امتحانات|نتائج|التقويم الجامعي|الفصل الدراسي)/.test(text)) return 'الامتحانات والنتائج';
    if (/(تصنيف|اعتماد|تايمز|شنغهاي|سكوبس|scopus|qs|webometrics|كلاريفيت)/i.test(text)) return 'التصنيفات والاعتماد';
    if (src.indexOf('وزارة التعليم') !== -1 && src.indexOf('أخبار الجامعات') === -1) return 'أخبار الوزارة';
    return 'أخبار الجامعات';
  }

  function timeOf(item) {
    var raw = String((item && item.date) || '').trim();
    if (!raw) return 0;
    var dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s*-\s*(\d{1,2}):(\d{2}))?$/.exec(raw);
    if (dmy) {
      var first = parseInt(dmy[1], 10), second = parseInt(dmy[2], 10), yr = parseInt(dmy[3], 10);
      var day = first, mon = second;
      if (second > 12 && first <= 12) { mon = first; day = second; }
      return Date.UTC(yr, mon - 1, day, parseInt(dmy[4] || '0', 10), parseInt(dmy[5] || '0', 10));
    }
    var t = Date.parse(raw);
    return isNaN(t) ? 0 : t;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function card(item, featured) {
    var art = el('article', featured ? 'news-card news-featured-card' : 'news-card');
    var h = el('h3');
    var a = el('a', null, item.title.trim());
    a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    h.appendChild(a); art.appendChild(h);
    if (typeof item.summary === 'string' && item.summary.trim()) {
      art.appendChild(el('p', 'news-summary', item.summary.trim()));
    }
    var meta = el('div', 'news-meta');
    meta.appendChild(el('span', null, 'المصدر: ' + item.source.trim()));
    if (item.date) meta.appendChild(el('span', null, item.date));
    art.appendChild(meta);
    if (item._cat && CATEGORIES.indexOf(item._cat) !== -1) {
      art.appendChild(el('span', 'news-chip', item._cat));
    }
    return art;
  }

  function renderGrid(filter) {
    gridEl.replaceChildren();
    var items = ALL.filter(function (it) {
      return !filter || filter === 'الكل' || it._cat === filter;
    }).slice(0, 6);
    if (!items.length) {
      gridEl.appendChild(el('p', 'news-empty', 'لا أخبار في هذه الفئة حاليًا.'));
      return;
    }
    items.forEach(function (it) { gridEl.appendChild(card(it, false)); });
  }

  function renderTabs() {
    tabsEl.replaceChildren();
    ['الكل'].concat(CATEGORIES).forEach(function (c, i) {
      var b = el('button', 'news-tab', c);
      b.type = 'button';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        tabsEl.querySelectorAll('.news-tab').forEach(function (t) {
          t.setAttribute('aria-pressed', 'false');
        });
        b.setAttribute('aria-pressed', 'true');
        renderGrid(c);
      });
      tabsEl.appendChild(b);
    });
  }

  function renderFeatured(items) {
    var pick = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i]._cat === 'أخبار الوزارة') { pick = items[i]; break; }
    }
    if (!pick) pick = items[0];
    featuredEl.replaceChildren();
    var badge = el('span', 'news-featured-badge', 'خبر مميز');
    featuredEl.appendChild(badge);
    featuredEl.appendChild(card(pick, true));
    featuredEl.hidden = false;
    return pick;
  }

  fetch('news.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('feed_unavailable');
    return r.json();
  }).then(function (data) {
    if (!Array.isArray(data)) throw new Error('invalid_feed');
    var items = data.filter(valid).map(function (it) {
      it._cat = resolveCategory(it);
      return it;
    }).sort(function (a, b) { return timeOf(b) - timeOf(a); });
    if (!items.length) return; /* يبقى القسم مخفيًا — لا أخبار = لا قسم */
    var feat = renderFeatured(items);
    ALL = items.filter(function (it) { return it !== feat; });
    if (!ALL.length) ALL = items;
    renderTabs();
    renderGrid('الكل');
    section.hidden = false;
  }).catch(function () { /* يبقى مخفيًا */ });
})();
