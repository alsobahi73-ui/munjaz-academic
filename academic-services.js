/* الطلبات مستقلة عن الأدوات المجانية ومنطق حساباتها. */
(() => {
  'use strict';
  const catalog = window.AcademicServicesCatalog;
  const services = catalog.flatMap(group => group.services.map(service => ({ ...service, category: group.title })));
  const byId = new Map(services.map(service => [service.id, service]));
  const $ = selector => document.querySelector(selector);
  const form = $('#academicRequestForm');
  const dialog = $('#academicRequestDialog');
  const select = $('#requestService');
  const status = $('#requestStatus');
  const submit = $('#requestSubmit');
  let sending = false;
  let requestId = null;
  let returnFocus = null;

  catalog.forEach(group => {
    const options = document.createElement('optgroup');
    options.label = group.title;
    group.services.forEach(service => options.append(new Option(service.title, service.id)));
    select.append(options);
  });

  function clearStatus() {
    if (sending) return;
    status.textContent = '';
    status.classList.remove('ok');
    requestId = null;
  }

  function updateCategory() {
    $('#requestCategory').textContent = byId.get(select.value)?.category || '';
  }

  function openRequest(serviceId, trigger) {
    if (!byId.has(serviceId)) return;
    if (sending) {
      returnFocus = trigger;
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = 'hidden';
      status.focus();
      return;
    }
    // Preserve unfinished details when comparing services; consent is specific to this request.
    select.value = serviceId;
    $('#requestConsent').checked = false;
    clearStatus();
    updateCategory();
    returnFocus = trigger;
    closeNav();
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    select.focus();
  }

  const nav = $('#mainNav');
  const toggle = $('#navToggle');
  function closeNav() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', String(nav.classList.toggle('open')));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeNav();
      toggle.focus();
    }
  });

  // Native dialogs provide focus containment and Escape dismissal.
  const previousFocus = new WeakMap();
  document.querySelectorAll('dialog.modal').forEach(modal => {
    modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
    modal.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.style.overflow = '';
      const trigger = modal === dialog ? returnFocus : previousFocus.get(modal);
      trigger?.focus();
    });
  });
  document.addEventListener('click', event => {
    const request = event.target.closest('[data-request-service]');
    if (request) openRequest(request.dataset.requestService, request);
    if (event.target.closest('[data-close-request]')) dialog.close();
    if (event.target.closest('[data-open-charter]')) {
      const charter = $('#charterModal');
      previousFocus.set(charter, document.activeElement);
      closeNav();
      charter.showModal();
      document.body.style.overflow = 'hidden';
    }
    if (event.target.closest('[data-close-charter], #charterAgree')) $('#charterModal').close();
  });

  form.addEventListener('input', event => {
    event.target.setCustomValidity?.('');
    clearStatus();
  });
  form.addEventListener('change', () => { clearStatus(); updateCategory(); });

  const normalizeDigits = value => value.replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, char => String(char.charCodeAt(0) - 0x6f0));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    const name = $('#requestName');
    const phone = $('#requestPhone');
    const details = $('#requestDetails');
    const phoneText = normalizeDigits(phone.value.trim());
    phone.setCustomValidity(!phoneText || (/^[+\d\s()-]+$/.test(phoneText) && phoneText.replace(/\D/g, '').length >= 7)
      ? '' : 'يرجى إدخال رقم تواصل صحيح أو ترك الحقل فارغاً.');
    details.setCustomValidity(details.value.trim().length >= 10 ? '' : 'يرجى توضيح طلبك بعشرة أحرف على الأقل.');
    if (!form.reportValidity() || !byId.has(select.value)) return;
    const endpoint = window.AcademicServicesConfig?.requestEndpoint;
    if (!endpoint) {
      status.textContent = 'استقبال الطلبات غير متاح حالياً. احتفظ برسالتك وحاول لاحقاً.';
      return;
    }
    requestId ||= crypto.randomUUID();
    const payload = {
      requestId, service: select.value, name: name.value.trim(), phone: phone.value.trim(),
      details: details.value.trim(), consent: $('#requestConsent').checked,
    };
    sending = true;
    status.classList.remove('ok');
    status.textContent = 'جارٍ إرسال طلبك…';
    submit.disabled = true;
    submit.textContent = 'جارٍ الإرسال…';
    form.setAttribute('aria-busy', 'true');
    // Freeze the draft so retrying an uncertain response uses the same request ID and content.
    const fields = [...form.querySelectorAll('input, select, textarea')];
    fields.forEach(field => { field.disabled = true; });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit',
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'sent' || result.requestId !== requestId) {
        const messages = {
          invalid_request: 'يرجى مراجعة بيانات الطلب والموافقة على شروط الخدمة.',
          rate_limited: 'أُرسلت عدة طلبات خلال وقت قصير. يرجى الانتظار ثم المحاولة.',
          unavailable: 'استقبال الطلبات غير متاح حالياً. احتفظ برسالتك وحاول لاحقاً.',
          delivery_failed: 'تعذّر إرسال الطلب. احتفظ برسالتك وحاول لاحقاً.',
          delivery_uncertain: 'تعذّر تأكيد وصول الطلب. احتفظ ببياناته قبل المحاولة لاحقاً.',
          conflict: 'يرجى تعديل الرسالة ثم إعادة المحاولة.',
        };
        throw Object.assign(new Error(), {
          userMessage: messages[result.error] || 'تعذّر تأكيد إرسال الطلب. احتفظ برسالتك وحاول لاحقاً.',
        });
      }
      form.reset();
      updateCategory();
      requestId = null;
      status.classList.add('ok');
      status.textContent = 'تم إرسال طلبك إلى فريق مُنجز أكاديمي. شكراً لتواصلك معنا.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' || error instanceof TypeError
        ? 'تعذّر تأكيد وصول الطلب بسبب الاتصال. احتفظ برسالتك وحاول لاحقاً.'
        : (error.userMessage || 'تعذّر تأكيد إرسال الطلب. احتفظ برسالتك وحاول لاحقاً.');
    } finally {
      clearTimeout(timeout);
      sending = false;
      fields.forEach(field => { field.disabled = false; });
      submit.disabled = false;
      submit.textContent = 'إرسال الطلب';
      form.removeAttribute('aria-busy');
      status.focus();
    }
  });
  $('#year').textContent = new Date().getFullYear();
  updateCategory();
})();
