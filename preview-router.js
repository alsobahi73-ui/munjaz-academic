/* Navigation for the generated review file only; no deployment or duplicated tool cards. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const categories = MunjizAcademicServices.categories;
    const render = () => {
      const hash = location.hash.slice(1);
      const category = categories.find(item => item.id === hash);
      const view = hash === 'jobs' ? 'jobs' : category || hash === 'services' ? 'services'
        : ['tools', 'workspace', 'assistant', 'library'].includes(hash) || hash.startsWith('tool-') ? 'tools' : 'home';
      document.querySelectorAll('[data-preview-view]').forEach(node => { node.hidden = node.dataset.previewView !== view; });
      document.body.classList.toggle('tools-page', view === 'tools');
      document.body.classList.toggle('services-page', view === 'services');
      document.querySelectorAll('#mainNav a').forEach(link => {
        const active = view === 'jobs' ? link.getAttribute('href') === '#jobs' : link.getAttribute('href').startsWith(view === 'home' ? 'index.html' : view + '.html');
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
      MunjizAcademicServices.render({ category: category?.id, onSelect: group => { location.hash = group.id; } });
      requestAnimationFrame(() => {
        if (category) document.querySelector('#services').scrollIntoView();
        else if (document.getElementById(hash) && hash !== 'account') document.getElementById(hash).scrollIntoView();
        else window.scrollTo(0, 0);
      });
      if (hash === 'account') setTimeout(() => document.querySelector('[data-open-auth]').click(), 0);
    };
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]'); if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const match = link.getAttribute('href').match(/^(index|tools|services)\.html(?:#(.*))?$/);
      if (!match) return;
      event.preventDefault();
      location.hash = match[2] || (match[1] === 'index' ? 'home' : match[1]);
      document.querySelector('#mainNav').classList.remove('open');
      document.querySelector('#navToggle').setAttribute('aria-expanded', 'false');
      render();
    });
    document.querySelector('#backToCategories').addEventListener('click', () => { location.hash = 'services'; });
    window.addEventListener('hashchange', render);
    render();
  });
})();
