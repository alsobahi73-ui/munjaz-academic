/* One searchable directory; calculator and quiz implementations stay in app.js. */
(() => {
  'use strict';
  const normalize = text => text.normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
  document.addEventListener('DOMContentLoaded', () => {
    const search = document.querySelector('#toolSearch');
    if (!search) return;
    const tiles = [...document.querySelectorAll('.tool-tile')];
    const filters = [...document.querySelectorAll('[data-tool-filter]')];
    const ids = new Set(tiles.map(tile => tile.dataset.openTool));
    const key = 'munjaz.toolFavorites';
    const read = () => {
      try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(value) ? value.filter(id => ids.has(id)) : []); }
      catch { return new Set(); }
    };
    let favorites = read();
    let category = 'all';
    const update = () => {
      const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
      let visible = 0;
      tiles.forEach(tile => {
        const content = normalize(tile.textContent + ' ' + tile.dataset.toolKeywords);
        const matches = category === 'all' || (category === 'favorites' ? favorites.has(tile.dataset.openTool) : tile.dataset.toolGroup === category);
        tile.hidden = !matches || !terms.every(term => content.includes(term));
        const save = tile.querySelector('[data-save-tool]');
        const saved = favorites.has(tile.dataset.openTool);
        save.setAttribute('aria-pressed', String(saved));
        save.textContent = saved ? '★ محفوظة في المفضلة' : '☆ حفظ في المفضلة';
        save.setAttribute('aria-label', `${saved ? 'إزالة' : 'حفظ'} ${tile.querySelector('strong').textContent} ${saved ? 'من' : 'في'} المفضلة`);
        if (!tile.hidden) visible++;
      });
      document.querySelector('#toolSearchStatus').textContent = `الأدوات المعروضة: ${visible} من ${tiles.length} — جميعها مجانية`;
      document.querySelector('#toolSearchEmpty').hidden = visible !== 0;
      document.querySelector('#toolSearchEmpty').textContent = category === 'favorites' && favorites.size === 0
        ? 'لم تحفظ أداة بعد. اختر «جميع الأدوات» ثم اضغط «حفظ في المفضلة» على الأداة التي تحتاجها.'
        : 'لم نجد أداة مطابقة. جرّب كلمة أخرى أو اختر «جميع الأدوات».';
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.toolFilter === category)));
    };
    search.addEventListener('input', update);
    filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.toolFilter; update(); }));
    tiles.forEach(tile => tile.querySelector('[data-save-tool]').addEventListener('click', event => {
      event.stopPropagation();
      const id = tile.dataset.openTool;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      const status = document.querySelector('#toolFavoritesStatus');
      try { localStorage.setItem(key, JSON.stringify([...favorites])); status.textContent = 'تم تحديث المفضلة على هذا المتصفح فقط.'; }
      catch { status.textContent = 'تخزين المتصفح غير متاح؛ تبقى المفضلة لهذه الزيارة فقط.'; }
      update();
      if (tile.hidden) document.querySelector('[data-tool-filter="favorites"]').focus();
    }));
    document.addEventListener('localprofiledeleted', () => { favorites = read(); update(); });
    window.addEventListener('storage', event => { if (event.key === key || event.key === null) { favorites = read(); update(); } });
    update();
  });
})();
