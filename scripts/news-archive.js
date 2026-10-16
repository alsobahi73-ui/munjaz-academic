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

  var ARABIC_MONTHS = {
    'كانون الثاني': 1, 'يناير': 1,
    'شباط': 2, 'فبراير': 2,
    'آذار': 3, 'مارس': 3,
    'نيسان': 4, 'أبريل': 4, 'ابريل': 4,
    'أيار': 5, 'ايار': 5, 'مايو': 5,
    'حزيران': 6, 'يونيو': 6,
    'تموز': 7, 'يوليو': 7,
    'آب': 8, 'اب': 8, 'أغسطس': 8, 'اغسطس': 8,
    'أيلول': 9, 'ايلول': 9, 'سبتمبر': 9,
    'تشرين الأول': 10, 'تشرين الاول': 10, 'أكتوبر': 10, 'اكتوبر': 10,
    'تشرين الثاني': 11, 'نوفمبر': 11,
    'كانون الأول': 12, 'كانون الاول': 12, 'ديسمبر': 12
  };

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
    var keys = Object.keys(ARABIC_MONTHS);
    for (var i = 0; i < keys.length; i++) {
      var mName = keys[i];
      if (raw.indexOf(mName) !== -1) {
        var nums = raw.match(/\d+/g);
        if (nums && nums.length >= 2) {
          var d = parseInt(nums[0], 10), y = parseInt(nums[nums.length - 1], 10);
          if (y > 1900 && d >= 1 && d <= 31) return Date.UTC(y, ARABIC_MONTHS[mName] - 1, d);
        }
      }
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

  function render() {
    var q = searchInput.value.trim();
    var cat = catSelect.value;
    var src = srcSelect.value;
    grid.replaceChildren();
    var items = ALL.filter(function (it) {
      if (cat && it._cat !== cat) return false;
      if (src && it.source.trim() !== src) return false;
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
      if (it._cat && CATEGORIES.indexOf(it._cat) !== -1) {
        art.appendChild(el('span', 'news-chip', it._cat));
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
    ALL = data.filter(valid).map(function (it) {
      it._cat = resolveCategory(it);
      return it;
    }).sort(function (a, b) { return timeOf(b) - timeOf(a); });
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
