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

  function timeOf(item) {
    var date = parsePublicationDate(item.date);
    return date ? date.getTime() : 0;
  }

  function parsePublicationDate(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var match = value.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    var date;
    if (match) {
      date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
      if (date.getUTCDate() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1) return null;
    } else {
      date = new Date(value);
    }
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function publicationDate(value) {
    var date = parsePublicationDate(value);
    if (!date) return null;
    var node = el('time', null, new Intl.DateTimeFormat('ar-IQ', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Baghdad'
    }).format(date));
    node.dateTime = date.toISOString();
    return node;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (cls === 'news-summary') n.dir = 'auto';
    if (text != null) n.textContent = text;
    return n;
  }

  function card(item, featured) {
    var art = el('article', featured ? 'news-card news-featured-card' : 'news-card');
    var h = el('h3');
    h.dir = 'auto';
    var a = el('a', null, item.title.trim());
    a.title = item.title.trim();
    a.href = item.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    h.appendChild(a); art.appendChild(h);
    if (typeof item.summary === 'string' && item.summary.trim()) {
      art.appendChild(el('p', 'news-summary', item.summary.trim()));
    }
    var meta = el('div', 'news-meta');
    var source = el('span', null, 'المصدر: ' + item.source.trim());
    source.title = source.textContent;
    meta.appendChild(source);
    var date = publicationDate(item.date);
    if (date) meta.appendChild(date);
    art.appendChild(meta);
    if (item.category && CATEGORIES.indexOf(item.category) !== -1) {
      art.appendChild(el('span', 'news-chip', item.category));
    }
    return art;
  }

  function renderGrid(filter) {
    gridEl.replaceChildren();
    var items = ALL.filter(function (it) {
      return !filter || filter === 'الكل' || it.category === filter;
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
      if (items[i].category === 'أخبار الوزارة') { pick = items[i]; break; }
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
    var items = data.filter(valid).sort(function (a, b) { return timeOf(b) - timeOf(a); });
    if (!items.length) return; /* يبقى القسم مخفيًا — لا أخبار = لا قسم */
    var feat = renderFeatured(items);
    ALL = items.filter(function (it) { return it !== feat; });
    if (!ALL.length) ALL = items;
    renderTabs();
    renderGrid('الكل');
    section.hidden = false;
  }).catch(function () { /* يبقى مخفيًا */ });
})();
