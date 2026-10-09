/* One request per page updates every visitor badge, including the footer. */
(() => {
  'use strict';
  async function init() {
    const badges = [...document.querySelectorAll('[data-visitor-badge]')];
    const counts = [...document.querySelectorAll('[data-visitor-count]')];
    const unavailable = () => {
      counts.forEach(node => { node.textContent = '—'; });
      badges.forEach(node => {
        node.setAttribute('aria-label', 'عدد الزوار غير متاح حالياً'); node.title = 'عدد الزوار غير متاح حالياً.';
      });
    };
    if (!['http:', 'https:'].includes(location.protocol)) { unavailable(); return; }
    try {
      const response = await fetch('/api/visitors', { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error('Counter unavailable');
      const data = await response.json();
      if (!Number.isSafeInteger(data.visitors) || data.visitors < 0) throw new Error('Invalid counter');
      const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(data.visitors);
      const compact = new Intl.NumberFormat('ar-IQ', { notation: 'compact', maximumFractionDigits: 1 }).format(data.visitors);
      counts.forEach(node => { node.textContent = compact; });
      badges.forEach(node => {
        node.setAttribute('aria-label', `عدد المتصفحات الزائرة: ${full}`);
        node.title = `${full} متصفح زائر. يُعد المتصفح مرة واحدة ما دام يحتفظ بملف تعريف الارتباط؛ ليس تعداداً للأشخاص أو المتصلين الآن.`;
      });
    } catch { unavailable(); }
  }
  window.MunjizVisitorCounter = Object.freeze({ init });
})();
