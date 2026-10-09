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
  const preview = $('#requestPreview');
  const summary = $('#requestSummary');
  let returnFocus = null;

  catalog.forEach(group => {
    const options = document.createElement('optgroup');
    options.label = group.title;
    group.services.forEach(service => options.append(new Option(service.title, service.id)));
    select.append(options);
  });

  function invalidatePreview() {
    preview.hidden = true;
    summary.value = '';
    $('#requestSend').hidden = true;
    $('#requestSend').removeAttribute('href');
    $('#requestCopyStatus').textContent = '';
  }

  function updateCategory() {
    $('#requestCategory').textContent = byId.get(select.value)?.category || '';
  }

  function openRequest(serviceId, trigger) {
    if (!byId.has(serviceId)) return;
    // Preserve unfinished details when comparing services; consent is specific to this request.
    select.value = serviceId;
    $('#requestConsent').checked = false;
    invalidatePreview();
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
    invalidatePreview();
  });
  form.addEventListener('change', () => { invalidatePreview(); updateCategory(); });

  const normalizeDigits = value => value.replace(/[٠-٩]/g, char => String(char.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, char => String(char.charCodeAt(0) - 0x6f0));

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = $('#requestName');
    const phone = $('#requestPhone');
    const details = $('#requestDetails');
    const phoneText = normalizeDigits(phone.value.trim());
    name.setCustomValidity(name.value.trim().length >= 2 ? '' : 'يرجى إدخال الاسم الكامل.');
    phone.setCustomValidity(/^[+\d\s()-]+$/.test(phoneText) && phoneText.replace(/\D/g, '').length >= 7
      ? '' : 'يرجى إدخال رقم تواصل صحيح يتضمن سبعة أرقام على الأقل.');
    details.setCustomValidity(details.value.trim().length >= 10 ? '' : 'يرجى توضيح طلبك بعشرة أحرف على الأقل.');
    if (!form.reportValidity()) return;
    const service = byId.get(select.value);
    if (!service) return;
    const lines = [
      'السلام عليكم، أرغب بطلب خدمة من منصة مُنجز أكاديمي.',
      `الفئة: ${service.category}`,
      `الخدمة المطلوبة: ${service.title}`,
      `الاسم: ${name.value.trim()}`,
      `رقم التواصل: ${phone.value.trim()}`,
      ...($('#requestEmail').value.trim() ? [`البريد الإلكتروني: ${$('#requestEmail').value.trim()}`] : []),
      ...($('#requestInstitution').value.trim() ? [`الجامعة / المؤسسة: ${$('#requestInstitution').value.trim()}`] : []),
      `تفاصيل الطلب:\n${details.value.trim()}`,
      'أوافق على أن الخدمة مدفوعة وأن التكلفة ونطاق الدعم يُحدَّدان بالاتفاق بعد مراجعة الطلب.',
      'ألتزم بالنزاهة الأكاديمية، وأن الخدمة دعم علمي وتحريري بالتعاون معي، وتبقى مسؤولية العمل وأصالته لي.',
    ];
    summary.value = lines.join('\n');
    const number = window.AcademicServicesConfig?.whatsappNumber || '';
    const configured = /^[1-9]\d{7,14}$/.test(number) && number !== '9647700000000';
    const send = $('#requestSend');
    send.hidden = !configured;
    if (configured) {
      send.href = `https://wa.me/${number}?text=${encodeURIComponent(summary.value)}`;
      $('#requestDeliveryNote').textContent = 'راجع طلبك ثم افتح واتساب وأكّد إرساله هناك. تجهيز الطلب لا يعني أنه أُرسل.';
    } else {
      send.removeAttribute('href');
      $('#requestDeliveryNote').textContent = 'الإرسال المباشر غير متاح حتى اعتماد رقم التواصل الرسمي. يمكنك نسخ طلبك للاحتفاظ به.';
    }
    preview.hidden = false;
    $('#requestPreviewTitle').tabIndex = -1;
    $('#requestPreviewTitle').focus();
  });

  $('#requestCopy').addEventListener('click', async () => {
    const status = $('#requestCopyStatus');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summary.value);
      status.classList.add('ok');
      status.textContent = 'تم نسخ الطلب. يمكنك مشاركته عبر قناة التواصل المعتمدة.';
    } catch {
      summary.focus();
      summary.select();
      status.classList.remove('ok');
      status.textContent = 'حدّدنا نص الطلب؛ انسخه يدوياً من حقل التفاصيل.';
    }
  });
  $('#year').textContent = new Date().getFullYear();
  updateCategory();
})();
