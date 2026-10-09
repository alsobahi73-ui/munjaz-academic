/* Reviewed job announcements only; safe rendering and shared filtering/ticker data. */
(() => {
  'use strict';
  const types = Object.freeze({ teaching: 'تدريسية', administrative: 'إدارية', technical: 'فنية' });
  const provinces = Object.freeze(['بغداد','نينوى','البصرة','كركوك','الأنبار','ديالى','صلاح الدين','واسط','ميسان','ذي قار','المثنى','القادسية','بابل','كربلاء','النجف','دهوك','أربيل','السليمانية','حلبجة']);
  const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
  function validJob(job, sources, now=today()) {
    if (!job || !['id','title','employer','specialty','qualification','governorate'].every(key => typeof job[key] === 'string' && job[key].trim())) return false;
    if (!Object.hasOwn(types, job.jobType) || !provinces.includes(job.governorate) || !date(job.announcementDate) || job.announcementDate > now || !date(job.verifiedAt) || job.verifiedAt > now || job.verifiedAt < job.announcementDate) return false;
    if (job.applicationDeadline !== null && (!date(job.applicationDeadline) || job.applicationDeadline < job.announcementDate)) return false;
    try {
      const url = new URL(job.officialUrl);
      if (url.protocol !== 'https:' || url.username || url.password) return false;
      return Array.isArray(sources) && sources.some(source => source && source.sector === 'private' && source.country === 'Iraq' && source.hostname === url.hostname && source.institution === job.employer && date(source.verifiedAt) && source.verifiedAt <= now);
    } catch { return false; }
  }
  function prepare(data, now=today()) {
    const sources = Array.isArray(data?.sources) ? data.sources : [];
    const jobs = Array.isArray(data?.announcements) ? data.announcements : [];
    const ids = new Set();
    return jobs.filter(job => {
      if (!validJob(job,sources,now) || ids.has(job.id)) return false;
      ids.add(job.id); return true;
    }).sort((a,b) => b.announcementDate.localeCompare(a.announcementDate) || a.id.localeCompare(b.id));
  }
  const filter = (jobs, choices) => jobs.filter(job => ['governorate','specialty','jobType'].every(key => !choices[key] || job[key] === choices[key]));
  const displayDate = value => new Intl.DateTimeFormat('ar-IQ',{dateStyle:'medium',timeZone:'Asia/Baghdad'}).format(new Date(value+'T12:00:00Z'));
  const make = (tag, text, className) => { const node=document.createElement(tag); if (text) node.textContent=text; if (className) node.className=className; return node; };
  function mount(data) {
    const root=document.querySelector('#academicJobs'); if (!root) return;
    const jobs=prepare(data);
    const selectors={governorate:document.querySelector('#jobGovernorate'),specialty:document.querySelector('#jobSpecialty'),jobType:document.querySelector('#jobType')};
    provinces.forEach(name => { const option=make('option',name); option.value=name; selectors.governorate.append(option); });
    [...new Set(jobs.map(job => job.specialty))].sort((a,b)=>a.localeCompare(b,'ar')).forEach(name => { const option=make('option',name); option.value=name; selectors.specialty.append(option); });
    Object.entries(types).forEach(([value,name])=>{ const option=make('option',name); option.value=value; selectors.jobType.append(option); });
    const render = () => {
      const filtered=filter(jobs,Object.fromEntries(Object.entries(selectors).map(([key,node])=>[key,node.value])));
      const list=document.querySelector('#academicJobsList'); list.replaceChildren();
      document.querySelector('#jobsCount').textContent=`الإعلانات الموثقة المعروضة: ${filtered.length}`;
      const empty=document.querySelector('#academicJobsEmpty'); empty.hidden=filtered.length!==0;
      empty.textContent=jobs.length ? 'لا توجد إعلانات موثقة تطابق التصفية الحالية.' : 'لم تُضف إعلانات تعيين موثقة بعد. لا يعني ذلك عدم وجود فرص؛ نعرض فقط الإعلانات التي جرى التحقق من مصدرها الرسمي.';
      filtered.forEach(job=>{
        const card=make('article','','card jobs-card'); card.append(make('span',types[job.jobType],'resource-badge'),make('h3',job.title));
        const details=make('dl');
        for (const [label,value] of [['الجهة المعلنة',job.employer],['التخصص',job.specialty],['المؤهل المطلوب',job.qualification],['المحافظة',job.governorate],['تاريخ الإعلان',displayDate(job.announcementDate)],['آخر موعد للتقديم',job.applicationDeadline?displayDate(job.applicationDeadline):'لم يذكره المصدر الرسمي']]) details.append(make('dt',label),make('dd',value));
        card.append(details);
        if (job.applicationDeadline && job.applicationDeadline < today()) card.append(make('p','انتهى الموعد المعلن للتقديم.','job-expired'));
        const link=make('a','الإعلان في المصدر الرسمي ←','btn btn-outline'); link.href=job.officialUrl; link.target='_blank'; link.rel='noopener noreferrer'; card.append(link); list.append(card);
      });
    };
    Object.values(selectors).forEach(select=>select.addEventListener('change',render));
    document.querySelector('#jobFiltersReset').addEventListener('click',()=>{Object.values(selectors).forEach(select=>{select.value='';});render();});
    const ticker=document.querySelector('#jobsTicker'); ticker.replaceChildren();
    if (!jobs.length) ticker.append(make('span','لم تُضف تعيينات موثقة بعد.'));
    jobs.slice(0,3).forEach(job=>{ const link=make('a',`${job.employer} — ${job.title} — ${displayDate(job.announcementDate)}`); link.href=job.officialUrl; link.target='_blank'; link.rel='noopener noreferrer'; ticker.append(link); });
    render();
  }
  window.MunjizAcademicJobs = Object.freeze({prepare,filter,validJob,mount,types,provinces});
  document.addEventListener('DOMContentLoaded',()=>mount(window.MunjizAcademicJobsData));
})();
