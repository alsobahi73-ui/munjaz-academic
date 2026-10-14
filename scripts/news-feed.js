(async () => {
  const section = document.getElementById('officialNews');
  if (!section) return;
  const list = section.querySelector('ul');
  if (!list) return;

  // 1) Appear automatically: show immediately with a loading shimmer.
  section.hidden = false;
  list.innerHTML = '<li class="ticker-state"><span class="ticker-loading">جاري تحميل آخر الأخبار…</span></li>';

  function buildRow(title, url, source) {
    const row = document.createElement('li');
    const link = document.createElement('a');
    link.href = url; link.textContent = title;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    row.append(link);
    if (source) {
      const chip = document.createElement('span');
      chip.className = 'ticker-source';
      chip.textContent = source;
      row.append(chip);
    }
    return row;
  }

  function pace() {
    // Duplicate for a seamless -50% loop, then set a moderate pace (~50px/s,
    // clamped to 60–160s). Falls back to the CSS default if measuring fails.
    list.innerHTML += list.innerHTML;
    requestAnimationFrame(() => {
      try {
        const half = list.scrollWidth / 2;
        if (half > 100) {
          const seconds = Math.min(160, Math.max(60, Math.round(half / 50)));
          list.style.animationDuration = seconds + 's';
        }
      } catch { /* keep CSS default */ }
    });
  }

  function render(items) {
    list.replaceChildren();
    let count = 0;
    for (const item of items.slice().reverse()) {
      if (count >= 15) break;
      if (!item || typeof item.title !== 'string' || !item.title.trim() ||
          typeof item.source !== 'string' || !item.source.trim() ||
          item.title.includes('تجريبي:')) continue;
      let url;
      try { url = new URL(item.url); } catch { continue; }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) continue;
      list.append(buildRow(item.title.trim(), url.href, item.source.trim()));
      count++;
    }
    if (!count) {
      list.innerHTML = '<li class="ticker-state"><span>تابع آخر أخبار التعليم العالي والبحث العلمي</span></li>';
    }
    pace();
  }

  try {
    const response = await fetch('news.json', { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('feed_unavailable');
    const items = await response.json();
    if (!Array.isArray(items) || !items.length) throw Error('empty_feed');
    render(items);
  } catch {
    // 1b) Never hide on failure: show a friendly fallback message instead.
    list.innerHTML = '<li class="ticker-state"><span>تابع آخر أخبار التعليم العالي والبحث العلمي</span></li>';
    pace();
  }
})();
