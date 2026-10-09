/* The approved paid-service catalogue; academic tools are kept separate. */
(() => {
  'use strict';
  const categories = Object.freeze([
    { id: 'undergrad', audience: 'undergrad', icon: '🎓', title: 'خدمات طلبة الدراسات الأولية', description: 'دعم المشاريع والتقارير والتصميم الأكاديمي والمهني.' },
    { id: 'grad', audience: 'grad', icon: '📚', title: 'خدمات طلبة الدراسات العليا', description: 'دعم الرسائل والأطاريح والصياغة العلمية وتهيئة البحوث للنشر.' },
    { id: 'professionals', audience: 'faculty', icon: '🔬', title: 'خدمات الأساتذة والباحثين', description: 'دعم البحوث والمؤلفات والدراسات والنتائج وملفات الترقية.' },
  ].map(Object.freeze));
  const items = Object.freeze([
    { id: 'reports-seminars', category: 'undergrad', icon: '📄', title: 'إعداد التقارير والسمنرات', desc: 'إعداد وتنسيق التقارير العلمية والعروض التقديمية بصورة أكاديمية احترافية، بالتعاون مع صاحب العمل وبمحتواه العلمي.' },
    { id: 'graduation-projects', category: 'undergrad', icon: '🎓', title: 'بحوث التخرج', desc: 'تقديم الدعم البحثي والتحريري في إعداد وتنظيم ومراجعة مشاريع التخرج بالتعاون مع الطالب.' },
    { id: 'scientific-posters', category: 'undergrad', icon: '🖼️', title: 'تصميم البوسترات العلمية', desc: 'تصميم ملصقات علمية احترافية للمشاريع والمؤتمرات والأنشطة الجامعية.' },
    { id: 'academic-cv', category: 'undergrad', icon: '📋', title: 'كتابة السيرة الذاتية', desc: 'إعداد وتصميم السير الذاتية الأكاديمية والمهنية بالعربية والإنجليزية وفق بيانات صاحبها وخبراته الفعلية.' },
    { id: 'text-similarity', category: 'grad', icon: '🔍', title: 'تقليل الاستلال الإلكتروني', desc: 'فحص التشابه النصي والمساعدة في معالجة الاقتباسات وتحسين الصياغة العلمية الأصيلة مع حفظ نسب الأفكار إلى مصادرها.' },
    { id: 'thesis-support', category: 'grad', icon: '📘', title: 'المساعدة في إكمال الرسائل والأطاريح', desc: 'تقديم الدعم البحثي والتحريري والمنهجي لاستكمال رسائل الماجستير وأطاريح الدكتوراه، بالتعاون مع الباحث وبمحتواه وبياناته الفعلية.' },
    { id: 'graduate-research', category: 'grad', icon: '📝', title: 'كتابة ونشر البحوث العلمية', desc: 'المساعدة في إعداد وتحرير البحوث وتهيئتها للنشر في المجلات العلمية بالتعاون مع صاحب البحث.' },
    { id: 'graduate-journals', category: 'grad', icon: '📰', title: 'توفير مجلات محلية وعالمية للنشر', desc: 'المساعدة في إيجاد مجلات علمية مناسبة للبحث وتوضيح متطلبات النشر فيها.' },
    { id: 'thesis-typesetting', category: 'grad', icon: '📐', title: 'تنضيد الرسائل والأطاريح', desc: 'تنسيق الرسائل والأطاريح وفق المتطلبات الأكاديمية للجامعات، بما يشمل الهوامش والفهارس والترقيم.' },
    { id: 'professional-research', category: 'professionals', icon: '📝', title: 'كتابة البحوث ونشرها', desc: 'تقديم الدعم العلمي والتحريري لإعداد البحوث وتهيئتها للنشر في المجلات المحكمة بالتعاون مع صاحب العمل.' },
    { id: 'academic-books', category: 'professionals', icon: '📚', title: 'تأليف الكتب', desc: 'المساعدة في إعداد وتحرير وتنسيق الكتب والمؤلفات العلمية والأكاديمية بالتعاون مع المؤلف وبمحتواه الأصلي.' },
    { id: 'community-studies', category: 'professionals', icon: '🌍', title: 'كتابة الدراسات المجتمعية', desc: 'المساعدة في إعداد الدراسات العلمية المتعلقة بالقضايا والمشكلات المجتمعية، بالاعتماد على العمل العلمي والبيانات الفعلية لصاحب الدراسة.' },
    { id: 'academic-promotion', category: 'professionals', icon: '🏛️', title: 'خدمات الترقية العلمية', desc: 'تنظيم ملفات الترقية ومراجعة متطلباتها وفق التعليمات الرسمية.' },
    { id: 'research-results', category: 'professionals', icon: '📊', title: 'النتائج وتفسيرها', desc: 'تنظيم النتائج البحثية الفعلية وتفسيرها ومناقشتها بصورة علمية بالتعاون مع الباحث.' },
    { id: 'scientific-proofreading', category: 'professionals', icon: '🔤', title: 'التدقيق اللغوي والعلمي', desc: 'مراجعة البحوث والمؤلفات لغوياً وعلمياً وتحسين صياغتها الأكاديمية مع المحافظة على أفكار صاحبها.' },
  ].map(item => Object.freeze({ ...item, paid: true })));
  function render({ category = null, onSelect }) {
    const $ = selector => document.querySelector(selector);
    const make = (tag, text, className) => {
      const node = document.createElement(tag); if (text) node.textContent = text;
      if (className) node.className = className; return node;
    };
    const chosen = categories.find(item => item.id === category);
    $('#categoryPicker').hidden = !!chosen; $('#servicesPanel').hidden = !chosen;
    $('#servicesSub').textContent = chosen ? `${chosen.title} — ${items.filter(item => item.category === category).length} خدمات مدفوعة` : 'اختر إحدى الفئات الثلاث لتظهر خدماتها. الخدمات المهنية مدفوعة، والأدوات الأكاديمية مجانية ومستقلة.';
    $('#servicesGroups').replaceChildren();
    $('#categoryPicker').replaceChildren();
    if (!chosen) {
      categories.forEach(group => {
        const button = make('button', '', 'cat-card'); button.type = 'button';
        button.dataset.serviceCategory = group.id; button.dataset.pick = group.audience;
        button.setAttribute('aria-label', `${group.title}، ${items.filter(item => item.category === group.id).length} خدمات`);
        button.append(make('span', group.icon, 'cat-icon'), make('strong', group.title),
          make('small', group.description), make('span', `${items.filter(item => item.category === group.id).length} خدمات مدفوعة ←`, 'cat-count'));
        button.addEventListener('click', () => onSelect(group)); $('#categoryPicker').append(button);
      });
      return;
    }
    $('#panelTitle').textContent = `${chosen.icon} ${chosen.title}`;
    const grid = make('div', '', 'cards academic-service-cards');
    items.filter(item => item.category === category).forEach(service => {
      const card = make('article', '', 'card academic-service-card'); card.dataset.serviceId = service.id;
      const button = make('a', 'اطلب الخدمة', 'btn btn-gold');
      button.href = requestUrl(service.id); button.target = '_blank'; button.rel = 'noopener noreferrer';
      button.dataset.requestService = service.id;
      button.setAttribute('aria-label', `اطلب الخدمة عبر واتساب: ${service.title}`);
      const icon = make('span', service.icon, 'card-icon'); icon.setAttribute('aria-hidden', 'true');
      card.append(icon, make('span', 'خدمة مدفوعة', 'paid-service-badge'), make('h3', service.title), make('p', service.desc), button);
      grid.append(card);
    });
    $('#servicesGroups').append(grid);
  }
  function requestUrl(id) {
    const service = items.find(item => item.id === id);
    if (!service) throw new Error('الخدمة غير موجودة في القائمة المعتمدة.');
    const category = categories.find(item => item.id === service.category);
    const message = ['السلام عليكم، أتواصل معكم من منصة مُنجز أكاديمي.',
      `الخدمة المطلوبة: ${service.title}`, `الفئة: ${category.title}`,
      'أرجو تزويدي بتفاصيل الخدمة وطريقة البدء.',
      'أفهم أن الخدمة دعم علمي وتحريري بالتعاون معي، وليست كتابة العمل العلمي نيابة عني.'].join('\n');
    return `https://wa.me/9647819934210?text=${encodeURIComponent(message)}`;
  }
  window.MunjizAcademicServices = Object.freeze({ categories, items, render, requestUrl });
})();
