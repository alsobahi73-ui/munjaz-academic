(async () => {
  const section = document.getElementById('officialNews');
  if (!section) return;
  // The current checkout has no embedded articles; an empty fallback is intentional.
  const NEWS = [];
  const list = section.querySelector('ul');
  function render(items) {
    list.replaceChildren();
    for (const item of items.slice().reverse().slice(0, 20)) {
      if (!item || typeof item.title !== 'string' || !item.title.trim() || typeof item.source !== 'string' || !item.source.trim() || item.title.includes('تجريبي:')) continue;
      let url;
      try { url = new URL(item.url); } catch { continue; }
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) continue;
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = url.href; link.textContent = item.title; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const summary = document.createElement('p');
      summary.className = 'news-summary'; summary.textContent = typeof item.summary === 'string' ? item.summary : '';
      const attribution = document.createElement('p');
      attribution.textContent = `المصدر: ${item.source} | ${item.date || ''}`;
      row.append(link, summary, attribution); list.append(row);
    }
    if (list.children.length) {
      // Seamless loop: duplicate items so the -50% keyframe wraps cleanly,
      // then pace the animation by content width (~30px/s, min 90s).
      list.innerHTML += list.innerHTML;
      const half = list.scrollWidth / 2;
      list.style.animationDuration = Math.max(90, Math.round(half / 30)) + 's';
    }
    section.hidden = !list.children.length;
  }
  render(NEWS);
  try {
    const response = await fetch('news.json', { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw Error('feed_unavailable');
    const items = await response.json();
    if (!Array.isArray(items)) throw Error('invalid_feed');
    render(items);
  } catch { render(NEWS); }
})();
