/* Guide visitors to the approved services; requests go directly to WhatsApp. */
(() => {
  'use strict';
  const routes = Object.freeze({
    undergrad: [
      { id: 'academic-work', title: 'دعم تقرير أو مشروع تخرج', services: ['reports-seminars', 'graduation-projects'] },
      { id: 'design', title: 'تصميم بوستر أو سيرة ذاتية', services: ['scientific-posters', 'academic-cv'] },
    ],
    grad: [
      { id: 'thesis', title: 'استكمال رسالة أو تحسينها', services: ['text-similarity', 'thesis-support', 'thesis-typesetting'] },
      { id: 'publication', title: 'إعداد بحث للنشر أو اختيار مجلة', services: ['graduate-research', 'graduate-journals'] },
    ],
    professionals: [
      { id: 'research', title: 'بحث أو دراسة أو نتائج أو تدقيق', services: ['professional-research', 'community-studies', 'research-results', 'scientific-proofreading'] },
      { id: 'book', title: 'إعداد وتحرير كتاب', services: ['academic-books'] },
      { id: 'promotion', title: 'تنظيم ملف الترقية العلمية', services: ['academic-promotion'] },
    ],
  });
  function recommend(answers) {
    const goal = routes[answers.category]?.find(item => item.id === answers.goal);
    const selected = goal?.services.length === 1 ? goal.services[0] : answers.need;
    if (!goal?.services.includes(selected)) throw new Error('حدد احتياجك من الخدمات المعتمدة.');
    return selected;
  }
  function init(config) {
    const $ = selector => document.querySelector(selector);
    const make = (tag, text, className) => {
      const node = document.createElement(tag); if (text) node.textContent = text;
      if (className) node.className = className; return node;
    };
    const dialog = $('#serviceRequestModal');
    let answers = {}; let step = 0;
    const steps = () => {
      const goal = routes[answers.category]?.find(item => item.id === answers.goal);
      return [
        { key: 'category', title: 'ما الفئة الأقرب لاحتياجك؟', choices: config.categories.map(group => [group.id, group.title]) },
        { key: 'goal', title: 'ما الذي تريد إنجازه؟', choices: (routes[answers.category] || []).map(item => [item.id, item.title]) },
        ...(goal?.services.length === 1 ? [] : [{ key: 'need', title: 'ما المساعدة التي تحتاجها تحديداً؟', choices: (goal?.services || []).map(id => [id, config.services.find(service => service.id === id).title]) }]),
      ];
    };
    function showResult() {
      const service = config.services.find(item => item.id === recommend(answers));
      $('#serviceWizard').hidden = true; $('#serviceSuggestionView').hidden = false;
      $('#serviceRecommendation').replaceChildren(make('span', 'الخدمة المقترحة لاحتياجك', 'recommendation-label'), make('h3', `${service.icon} ${service.title}`), make('p', service.desc));
      const link = $('#serviceDirectWhatsapp');
      link.href = MunjizAcademicServices.requestUrl(service.id);
      link.setAttribute('aria-label', `اطلب الخدمة عبر واتساب: ${service.title}`); link.focus();
    }
    function render() {
      const route = steps(); const current = route[step];
      $('#serviceWizardProgress').textContent = `الخطوة ${step + 1} من ${route.length}`;
      $('#serviceWizardQuestion').textContent = current.title; $('#serviceWizardChoices').replaceChildren();
      current.choices.forEach(([id, title]) => {
        const button = make('button', title, 'service-wizard-choice'); button.type = 'button'; button.dataset.choice = id;
        button.setAttribute('aria-pressed', String(answers[current.key] === id));
        button.addEventListener('click', () => {
          for (const key of ['category', 'goal', 'need'].slice(step + 1)) delete answers[key];
          answers[current.key] = id;
          if (step + 1 >= steps().length) showResult(); else { step++; render(); }
        });
        $('#serviceWizardChoices').append(button);
      });
      $('#serviceWizardBack').disabled = step === 0; $('#serviceWizardQuestion').focus();
    }
    function open() {
      answers = {}; step = 0;
      $('#serviceWizard').hidden = false; $('#serviceSuggestionView').hidden = true;
      $('#serviceDirectWhatsapp').removeAttribute('href');
      config.openDialog(dialog); dialog.querySelector('.modal-box').scrollTop = 0; render();
    }
    document.addEventListener('click', event => { if (event.target.closest('[data-open-service-assistant]')) open(); });
    $('#serviceWizardBack').addEventListener('click', () => { if (step > 0) { step--; render(); } });
    $('#serviceChooseAgain').addEventListener('click', open);
  }
  window.MunjizServiceAssistant = Object.freeze({ init, recommend, routes });
})();
