/* A local checklist, never an account, supervisor approval or automatic research. */
(() => {
  'use strict';
  const stages = [
    ['تحديد البحث', [['question', 'حدّدت المشكلة والسؤال البحثي ونطاق الدراسة'], ['objectives', 'راجعت الأهداف والخطة مع المشرف أو الجهة العلمية']]],
    ['المصادر والمنهج', [['sources', 'جمعت المصادر الأصلية ووثّقت المراجع'], ['method', 'حدّدت المنهج والعينة وأداة جمع البيانات']]],
    ['البيانات والتحليل', [['ethics', 'استكملت الموافقات الأخلاقية اللازمة قبل جمع البيانات'], ['data', 'جمعت البيانات الفعلية وراجعت التحليل وحدوده']]],
    ['الكتابة والمراجعة', [['draft', 'نظّمت الفصول وكتبت المناقشة بناءً على النتائج الفعلية'], ['review', 'راجعت الاقتباسات واللغة والتنسيق وفق متطلبات الجهة']]],
    ['النسخة النهائية', [['supervisor', 'راجعت الملاحظات مع المشرف أو فريق البحث'], ['backup', 'حفظت نسخة احتياطية وراجعت متطلبات التسليم أو النشر']]],
  ];
  const key = 'munjaz.researchWorkflow';
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('#workflowSteps'); if (!root) return;
    const known = new Set(stages.flatMap(([, steps]) => steps.map(([id]) => id)));
    const read = () => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return new Set(Array.isArray(value) ? value.filter(id => known.has(id)) : []); } catch { return new Set(); } };
    let completed = read();
    const update = () => {
      root.querySelectorAll('input').forEach(input => { input.checked = completed.has(input.value); });
      document.querySelector('#workflowProgress').value = completed.size;
      document.querySelector('#workflowSummary').textContent = `${completed.size} من ${known.size} خطوات`;
    };
    const save = () => {
      const status = document.querySelector('#workflowStatus');
      try { localStorage.setItem(key, JSON.stringify([...completed])); status.textContent = 'حُفظ تقدمك على هذا المتصفح فقط.'; }
      catch { status.textContent = 'تخزين المتصفح غير متاح؛ يبقى تقدمك لهذه الزيارة فقط.'; }
      update();
    };
    stages.forEach(([name, steps]) => {
      const group = document.createElement('fieldset'); const legend = document.createElement('legend'); legend.textContent = name; group.append(legend);
      steps.forEach(([id, text]) => {
        const label = document.createElement('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.value = id;
        input.addEventListener('change', () => { if (input.checked) completed.add(id); else completed.delete(id); save(); });
        const title = document.createElement('span'); title.textContent = text; label.append(input, title); group.append(label);
      });
      root.append(group);
    });
    document.querySelector('#workflowReset').addEventListener('click', () => { completed.clear(); save(); });
    document.addEventListener('localprofiledeleted', () => { completed = read(); update(); });
    window.addEventListener('storage', event => { if (event.key === key || event.key === null) { completed = read(); update(); } });
    update();
  });
})();
