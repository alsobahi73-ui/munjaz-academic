/* Standalone service directory; does not load calculator or quiz logic. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const $ = selector => document.querySelector(selector);
    const last = new WeakMap();
    const openDialog = dialog => {
      if (dialog.open) return;
      last.set(dialog, document.activeElement); dialog.showModal(); document.body.style.overflow = 'hidden';
      $('#mainNav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false');
    };
    document.querySelectorAll('dialog.modal').forEach(dialog => {
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', () => { document.body.style.overflow = ''; last.get(dialog)?.focus(); });
    });
    document.addEventListener('click', event => {
      if (event.target.closest('[data-open-charter]')) openDialog($('#charterModal'));
      if (event.target.closest('[data-close-modal], [data-close-charter]')) event.target.closest('dialog')?.close();
    });
    $('#charterAgree').addEventListener('click', () => {
      try { localStorage.setItem('munjaz.charterAccepted', 'true'); } catch { /* Browsing is available without storage. */ }
      $('#charterModal').close();
    });
    $('#navToggle').addEventListener('click', () => {
      const open = $('#mainNav').classList.toggle('open'); $('#navToggle').setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && $('#mainNav').classList.contains('open')) {
        $('#mainNav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false'); $('#navToggle').focus();
      }
    });
    const render = () => {
      const category = MunjizAcademicServices.categories.find(item => item.id === location.hash.slice(1));
      MunjizAcademicServices.render({ category: category?.id, onSelect: group => { location.hash = group.id; } });
      if (category) { $('#panelTitle').tabIndex = -1; $('#panelTitle').focus(); }
    };
    window.addEventListener('hashchange', render);
    $('#backToCategories').addEventListener('click', () => { location.hash = ''; });
    $('#year').textContent = new Date().getFullYear();
    render();
    MunjizServiceAssistant.init({ services: MunjizAcademicServices.items, categories: MunjizAcademicServices.categories, openDialog });
    MunjizVisitorCounter.init();
  });
})();
