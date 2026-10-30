(async () => {
  const section = document.getElementById('officialNews');
  if (!section) return;
  // The current checkout has no embedded articles; an empty fallback is intentional.
  const NEWS = [];
  const list = section.querySelector('ul');
  let lastFeed = "";
  function render(items) {
    const signature = JSON.stringify(items);
    if (signature === lastFeed) return;
    lastFeed = signature;
    list.replaceChildren();
    for (const item of items.slice().sort((a, b) => (Date.parse(b?.date) || 0) - (Date.parse(a?.date) || 0)).slice(0, 20)) {
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
    section.hidden = !list.children.length;
    const track = list.parentElement;
    if (track) {
      track.querySelector('.news-ticker-copy')?.remove();
      if (list.children.length) {
        const copy = list.cloneNode(true);
        copy.classList.add('news-ticker-copy');
        copy.setAttribute('aria-hidden', 'true');
        for (const link of copy.querySelectorAll('a')) link.tabIndex = -1;
        track.append(copy);
      }
    }
  }
  render(NEWS);
  async function refresh() {
    try {
      const response = await fetch('news-latest.json', { cache: 'default', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw Error('feed_unavailable');
      const items = await response.json();
      if (!Array.isArray(items)) throw Error('invalid_feed');
      render(items);
    } catch { /* Keep the last successful feed during a temporary outage. */ }
  }
  await refresh();
  if (typeof window !== "undefined") {
    window.setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  }
})();
