(() => {
  'use strict';
  const roots = document.querySelectorAll('[data-researcher-carousel]');
  if (!roots.length) return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function url(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const parsed = new URL(value, location.href);
      return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null;
    } catch { return null; }
  }
  function node(tag, text, className) {
    const result = document.createElement(tag);
    if (typeof text === 'string') result.textContent = text;
    if (className) result.className = className;
    return result;
  }
  for (const root of roots) {
    const photo = root.querySelector('[data-researcher-open]');
    const caption = root.querySelector('[data-researcher-caption]');
    const controls = root.querySelector('[data-researcher-controls]');
    const counter = root.querySelector('[data-researcher-count]');
    const pause = root.querySelector('[data-researcher-pause]');
    const placeholder = photo.firstElementChild.cloneNode(true);
    let people = [], index = 0, timer, manuallyPaused = false, pointerInside = false;
    const dialog = node('dialog', null, 'researcher-dialog');
    dialog.setAttribute('aria-label', 'تفاصيل المناقشة العلمية');
    const close = node('button', 'إغلاق التفاصيل', 'researcher-dialog-close');
    close.type = 'button';
    const details = node('div');
    dialog.append(close, details);
    document.body.append(dialog);
    function portrait(person, target) {
      target.replaceChildren(placeholder.cloneNode(true));
      const imageUrl = url(person.photo);
      if (!imageUrl) return;
      const image = new Image();
      image.alt = 'صورة الباحث ' + person.name;
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => {
        if (target.contains(image)) target.replaceChildren(placeholder.cloneNode(true));
      }, {once: true});
      image.src = imageUrl;
      target.replaceChildren(image);
    }
    function stop() { clearInterval(timer); timer = undefined; }
    function restart() {
      stop();
      pause.disabled = motion.matches;
      pause.textContent = motion.matches ? 'التقليب اليدوي' : manuallyPaused ? 'تشغيل التقليب' : 'إيقاف التقليب';
      if (people.length < 2 || manuallyPaused || motion.matches || pointerInside || document.hidden || dialog.open || root.querySelector(':focus-visible')) return;
      timer = setInterval(() => render(index + 1), 7000);
    }
    function render(next) {
      index = (next + people.length) % people.length;
      const person = people[index];
      portrait(person, photo);
      photo.setAttribute('aria-label', 'عرض تفاصيل مناقشة ' + person.name);
      const name = node('h3', person.name);
      const affiliation = node('p', [person.degree, person.university].filter(value => typeof value === 'string' && value.trim()).join(' · '), 'researcher-affiliation');
      const brief = node('p', person.summary || person.thesis || '', 'researcher-brief');
      brief.dir = 'auto';
      caption.replaceChildren(name, affiliation, brief);
      counter.textContent = `${index + 1} / ${people.length}`;
    }
    function showDetails() {
      if (!people.length) return;
      stop();
      const person = people[index];
      const picture = node('div', null, 'career-art researcher-dialog-photo');
      portrait(person, picture);
      const title = node('h2', person.name);
      const affiliation = node('p', [person.degree, person.university, person.department].filter(value => typeof value === 'string' && value.trim()).join(' — '));
      const thesis = node('p', person.thesis || '', 'researcher-thesis');
      thesis.dir = 'auto';
      const summary = node('p', person.summary || '');
      summary.dir = 'auto';
      const article = node('p', typeof person.details === 'string' ? person.details : '');
      article.dir = 'auto';
      const source = node('a', 'قراءة الخبر كاملًا من المصدر', 'researcher-source');
      source.href = url(person.source);
      source.target = '_blank'; source.rel = 'noopener noreferrer';
      details.replaceChildren(picture, title, affiliation, thesis, summary, article, source);
      dialog.showModal();
    }
    photo.addEventListener('click', showDetails);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { photo.focus(); restart(); });
    root.querySelector('[data-researcher-prev]').addEventListener('click', () => { render(index - 1); restart(); });
    root.querySelector('[data-researcher-next]').addEventListener('click', () => { render(index + 1); restart(); });
    pause.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      pause.textContent = manuallyPaused ? 'تشغيل التقليب' : 'إيقاف التقليب';
      pause.setAttribute('aria-pressed', String(manuallyPaused));
      restart();
    });
    root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { pointerInside = true; stop(); } });
    root.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { pointerInside = false; restart(); } });
    root.addEventListener('focusin', () => { if (root.querySelector(':focus-visible')) stop(); });
    root.addEventListener('focusout', () => setTimeout(restart, 0));
    document.addEventListener('visibilitychange', restart);
    motion.addEventListener('change', restart);
    fetch('featured-researchers.json', {cache: 'no-cache', signal: AbortSignal.timeout(10000)})
      .then(response => { if (!response.ok) throw Error('unavailable'); return response.json(); })
      .then(data => {
        if (!Array.isArray(data)) throw Error('invalid_feed');
        people = data.filter(person => person && typeof person.name === 'string' && person.name.trim() && person.upcoming !== true && url(person.source));
        if (!people.length) {
          caption.replaceChildren(node('p', 'لا تتوفر مناقشات مكتملة للعرض حاليًا.'));
          return;
        }
        photo.disabled = false;
        controls.hidden = people.length < 2;
        render(0); restart();
      })
      .catch(() => caption.replaceChildren(node('p', 'تعذّر تحميل المناقشات حاليًا. حاول لاحقًا.')));
  }
})();
