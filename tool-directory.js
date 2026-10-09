/* One searchable directory; calculator and quiz implementations stay in app.js. */
(() => {
  'use strict';
  const normalize = text => text.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
  document.addEventListener('DOMContentLoaded', () => {
    const search = document.querySelector('#toolSearch');
    if (!search) return;
    const tiles = [...document.querySelectorAll('.tool-tile')];
    const filters = [...document.querySelectorAll('[data-tool-filter]')];
    let category = 'all';
    const update = () => {
      const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
      let visible = 0;
      tiles.forEach(tile => {
        const content = normalize(tile.textContent + ' ' + tile.dataset.toolKeywords);
        tile.hidden = !(category === 'all' || tile.dataset.toolGroup === category) || !terms.every(term => content.includes(term));
        if (!tile.hidden) visible++;
      });
      document.querySelector('#toolSearchStatus').textContent = `الأدوات المعروضة: ${visible} من ${tiles.length} — جميعها مجانية`;
      document.querySelector('#toolSearchEmpty').hidden = visible !== 0;
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolFilter === category)));
    };
    search.addEventListener('input', update);
    filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.toolFilter; update(); }));
    update();
  });
})();
