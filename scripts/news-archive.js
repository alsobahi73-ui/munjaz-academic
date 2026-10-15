/* صفحة أرشيف الأخبار news.html — بحث وفلترة */
(function () {
  'use strict';
  var grid = document.getElementById('archiveGrid');
  var emptyMsg = document.getElementById('archiveEmpty');
  var searchInput = document.getElementById('archiveSearch');
  var catSelect = document.getElementById('archiveCategory');
  var srcSelect = document.getElementById('archiveSource');
  var countEl = document.getElementById('archiveCount');
  if (!grid) return;
  var ALL = [];

  var CATEGORIES = [
    'أخبار الوزارة',
    'القبول والتسجيل',
    'المنح والبعثات',
    'الدراسات العليا',
    'الامتحانات والنتائج',
    'أخبار الجامعات',
    'التصنيفات والاعتماد'
  ];

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
    var t = Date.parse(item.date);
    return isNaN(t) ? 0 : t;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    var q = searchInput.value.trim();
    var cat = catSelect.value;
    var src = srcSelect.value;
    grid.replaceChildren();
    var items = ALL.filter(function (it) {
      if (cat && it.category !== cat) return false;
      if (src && it.source !== src) return false;
      if (q && it.title.indexOf(q) === -1 &&
          !(it.summary && it.summary.indexOf(q) !== -1)) return false;
      return true;
    });
    countEl.textContent = items.length ? ('عدد الأخبار: ' + items.length) : '';
    emptyMsg.hidden = items.length > 0;
    items.forEach(function (it) {
      var art = el('article', 'news-card');
      var h = el('h3');
      var a = el('a', null, it.title.trim());
      a.href = it.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      h.appendChild(a); art.appendChild(h);
      if (typeof it.summary === 'string' && it.summary.trim()) {
        art.appendChild(el('p', 'news-summary', it.summary.trim()));
      }
      var meta = el('div', 'news-meta');
      meta.appendChild(el('span', null, 'المصدر: ' + it.source.trim()));
      if (it.date) meta.appendChild(el('span', null, it.date));
      art.appendChild(meta);
      if (it.category && CATEGORIES.indexOf(it.category) !== -1) {
        art.appendChild(el('span', 'news-chip', it.category));
      }
      grid.appendChild(art);
    });
  }

  CATEGORIES.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSelect.appendChild(o);
  });

  ['input', 'change'].forEach(function (ev) {
    searchInput.addEventListener(ev, render);
    catSelect.addEventListener(ev, render);
    srcSelect.addEventListener(ev, render);
  });

  fetch('news.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('feed_unavailable');
    return r.json();
  }).then(function (data) {
    if (!Array.isArray(data)) throw new Error('invalid_feed');
    ALL = data.filter(valid).sort(function (a, b) { return timeOf(b) - timeOf(a); });
    var sources = {};
    ALL.forEach(function (it) { sources[it.source.trim()] = true; });
    Object.keys(sources).sort().forEach(function (s) {
      var o = document.createElement('option');
      o.value = s; o.textContent = s;
      srcSelect.appendChild(o);
    });
    render();
  }).catch(function () {
    emptyMsg.hidden = false;
    emptyMsg.textContent = 'تعذّر تحميل الأخبار حاليًا. حاول لاحقًا.';
  });
})();
