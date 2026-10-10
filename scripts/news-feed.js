(async () => {
  const section = document.getElementById('officialNews');
  if (!section) return;
  try {
    const response = await fetch('news.json', { cache: 'no-cache' });
    if (!response.ok) return;
    const items = await response.json();
    if (!Array.isArray(items)) return;
    const list = section.querySelector('ul');
    for (const item of items.slice().reverse().slice(0, 20)) {
      if (!item || typeof item.title !== 'string' || typeof item.source !== 'string') continue;
      let url;
      try { url = new URL(item.url); } catch { continue; }
      if (!['https:', 'http:'].includes(url.protocol)) continue;
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = url.href;
      link.textContent = item.title;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const summary = document.createElement('p');
      summary.textContent = typeof item.summary === 'string' ? item.summary : '';
      const attribution = document.createElement('p');
      attribution.textContent = `المصدر: ${item.source} | ${item.date || ''}`;
      row.append(link, summary, attribution);
      list.append(row);
    }
    section.hidden = !list.children.length;
  } catch { /* Keep the empty feed hidden; do not invent placeholder news. */ }
})();
