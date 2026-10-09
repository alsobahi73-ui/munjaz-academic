/* Guided service selection and guest requests; no automatic sending or external AI. */
(() => {
  'use strict';
  const goals = [
    ['document', 'تحسين ملف أكاديمي مكتوب', 'تدقيق أو تنسيق أو توثيق'],
    ['research', 'تخطيط بحث أو فهم البيانات', 'إرشاد منهجي أو إحصائي'],
    ['publication', 'نشر بحث أو تجهيز الترقية', 'مجلات أو ملف ترقية'],
    ['communication', 'تقديم عرض أو تطوير مهاراتي', 'شرائح أو تدريب أكاديمي'],
  ];
  const needs = {
    document: [['language', 'تحسين اللغة والإملاء'], ['format', 'ضبط التنسيق والفهارس والهوامش'], ['references', 'ضبط المراجع والاستشهادات']],
    research: [['methodology', 'المشكلة والأهداف والمنهج'], ['statistics', 'اختيار الاختبار الإحصائي وفهم النتائج']],
    publication: [['journal', 'اختيار مجلة وتهيئة البحث للنشر'], ['promotion', 'تنظيم مستمسكات ملف الترقية']],
    communication: [['presentation', 'تحسين شرائح عرض أو مناقشة'], ['training', 'تعلّم مهارات البحث والأدوات']],
  };
  function recommend(answers) {
    if (!needs[answers.goal]?.some(([key]) => key === answers.need)) throw new Error('حدد احتياجك لاستكمال الاقتراح.');
    if (answers.need === 'format') {
      if (!['report', 'thesis'].includes(answers.document)) throw new Error('حدد نوع الملف المراد تنسيقه.');
      return answers.document === 'thesis' ? 'thesis-format' : 'report-format';
    }
    return answers.need === 'language' ? 'proofreading' : answers.need;
  }
  function init(config) {
    const $ = selector => document.querySelector(selector);
    const element = (tag, text, className) => {
      const node = document.createElement(tag); if (text) node.textContent = text;
      if (className) node.className = className; return node;
    };
    const dialog = $('#serviceRequestModal');
    const wizard = $('#serviceWizard'); const orderView = $('#serviceOrderView');
    const form = $('#serviceOrderForm'); const serviceSelect = $('#orderService');
    const audienceSelect = $('#orderAudience'); const ready = $('#serviceOrderReady');
    const message = $('#serviceOrderMsg'); const wa = $('#serviceOrderWhatsapp');
    let answers = {}; let step = 0;
    config.services.forEach(service => {
      const option = element('option', service.title); option.value = service.id; serviceSelect.append(option);
    });
    Object.entries(config.audiences).forEach(([key, audience]) => {
      const option = element('option', key === 'all' ? 'لم أحدد / أفضل عدم التحديد' : audience.label);
      option.value = key; audienceSelect.append(option);
    });
    const steps = () => [
      { key: 'audience', title: 'ما فئتك؟', choices: Object.entries(config.audiences).map(([key, a]) => [key, key === 'all' ? 'أفضل عدم التحديد' : a.label]) },
      { key: 'goal', title: 'ما الذي تريد إنجازه الآن؟', choices: goals },
      { key: 'need', title: 'ما المساعدة التي تحتاجها تحديداً؟', choices: needs[answers.goal] || [] },
      ...(answers.need === 'format' ? [{ key: 'document', title: 'ما نوع الملف؟', choices: [['report', 'تقرير أو بحث تخرج'], ['thesis', 'رسالة أو أطروحة']] }] : []),
    ];
    const invalidateDraft = () => {
      ready.hidden = true; wa.removeAttribute('href'); $('#serviceOrderPreview').value = ''; message.textContent = '';
      $('#serviceOrderCopy').textContent = 'نسخ تفاصيل الطلب';
    };
    const showRecommendation = (service, guided = false) => {
      $('#serviceRecommendation').replaceChildren(
        element('span', guided ? 'الخدمة المقترحة لاحتياجك' : 'الخدمة المختارة', 'recommendation-label'),
        element('h3', `${service.icon} ${service.title}`), element('p', service.desc),
      );
    };
    function openOrder(id, audience = config.getAudience(), guided = false) {
      const service = config.services.find(item => item.id === id);
      if (!service) return;
      form.reset(); invalidateDraft();
      serviceSelect.value = service.id;
      audienceSelect.value = config.audiences[audience] ? audience : 'all';
      $('#orderName').value = config.getProfile()?.name || '';
      showRecommendation(service, guided);
      $('#serviceFlowTitle').textContent = 'طلب الخدمة الأكاديمية';
      wizard.hidden = true; orderView.hidden = false;
      config.openDialog(dialog); dialog.querySelector('.modal-box').scrollTop = 0;
      serviceSelect.focus();
    }
    function renderWizard() {
      const route = steps(); const current = route[step];
      $('#serviceWizardProgress').textContent = `الخطوة ${step + 1} من ${route.length}`;
      $('#serviceWizardQuestion').textContent = current.title;
      const choices = $('#serviceWizardChoices'); choices.replaceChildren();
      current.choices.forEach(([value, label, detail]) => {
        const button = element('button', '', 'service-wizard-choice'); button.type = 'button';
        button.append(element('strong', label)); if (detail) button.append(element('small', detail));
        button.setAttribute('aria-pressed', String(answers[current.key] === value));
        button.dataset.choice = value;
        button.addEventListener('click', () => {
          for (const key of ['audience', 'goal', 'need', 'document'].slice(step + 1)) delete answers[key];
          answers[current.key] = value;
          if (step + 1 >= steps().length) openOrder(recommend(answers), answers.audience, true);
          else { step++; renderWizard(); }
        });
        choices.append(button);
      });
      $('#serviceWizardBack').disabled = step === 0;
      $('#serviceWizardQuestion').focus();
    }
    function openGuide() {
      answers = {}; step = 0; invalidateDraft();
      $('#serviceFlowTitle').textContent = 'مساعد اختيار الخدمة الأكاديمية';
      wizard.hidden = false; orderView.hidden = true;
      config.openDialog(dialog); dialog.querySelector('.modal-box').scrollTop = 0; renderWizard();
    }
    document.addEventListener('click', event => {
      const guide = event.target.closest('[data-open-service-assistant]');
      const direct = event.target.closest('[data-request-service]');
      if (guide) openGuide();
      else if (direct) openOrder(direct.dataset.requestService);
    });
    $('#serviceWizardBack').addEventListener('click', () => { if (step > 0) { step--; renderWizard(); } });
    $('#serviceChooseAgain').addEventListener('click', openGuide);
    serviceSelect.addEventListener('change', () => {
      const selected = config.services.find(service => service.id === serviceSelect.value);
      if (selected) showRecommendation(selected);
    });
    form.addEventListener('input', invalidateDraft);
    form.addEventListener('change', invalidateDraft);
    form.addEventListener('submit', event => {
      event.preventDefault(); invalidateDraft();
      const service = config.services.find(item => item.id === serviceSelect.value);
      const details = $('#orderDetails').value.trim();
      if (!service || details.length < 10 || details.length > 2500 || !$('#orderIntegrity').checked) {
        message.textContent = 'اكتب وصفاً من 10 إلى 2500 حرف، وحدد الخدمة وأقرّ بميثاق النزاهة.'; return;
      }
      const name = $('#orderName').value.trim().slice(0, 80);
      const deadline = $('#orderDeadline').value;
      const text = [
        'السلام عليكم، أرغب بطلب خدمة من منصة مُنجز أكاديمي.',
        `الخدمة المطلوبة: ${service.title}`,
        `الفئة: ${config.audiences[audienceSelect.value]?.label || 'غير محدد'}`,
        ...(name ? [`الاسم: ${name}`] : []),
        `تفاصيل الاحتياج: ${details}`,
        ...(deadline ? [`الموعد المفضل: ${deadline}`] : []),
        'أقرّ بالالتزام بميثاق النزاهة؛ الخدمة للتدقيق والتنسيق والإرشاد ولا تتضمن كتابة العمل نيابة عني.',
      ].join('\n');
      $('#serviceOrderPreview').value = text;
      const number = String(config.whatsappNumber || '').replace(/\D/g, '').replace(/^00/, '');
      if (/^[1-9]\d{7,14}$/.test(number) && number !== '9647700000000') {
        wa.href = `https://wa.me/${number}?text=${encodeURIComponent(text)}`; wa.hidden = false;
        message.textContent = 'طلبك جاهز. راجع التفاصيل ثم افتح واتساب لإرساله بنفسك.';
      } else { wa.hidden = true; message.textContent = 'التواصل عبر واتساب غير متاح حالياً؛ يمكنك نسخ تفاصيل الطلب.'; }
      ready.hidden = false; $('#serviceOrderPreview').focus();
    });
    $('#serviceOrderCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#serviceOrderPreview').value); $('#serviceOrderCopy').textContent = 'تم النسخ ✓'; }
      catch { $('#serviceOrderCopy').textContent = 'تعذّر النسخ؛ حدّد التفاصيل وانسخها يدوياً'; }
    });
  }
  window.MunjizServiceAssistant = Object.freeze({ init, recommend });
})();
