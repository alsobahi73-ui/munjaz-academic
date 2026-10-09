// Synthetic test records only; these employers and announcements never enter public data.
const assert=require('node:assert/strict');
global.window={}; global.document={addEventListener(){}};
require('../academic-jobs-data.js'); require('../academic-jobs.js');
const {prepare,filter,validJob}=window.MunjizAcademicJobs;
const source={sector:'private',country:'Iraq',hostname:'university.invalid',institution:'جهة اختبار فقط',verifiedAt:'2026-10-08'};
const job={id:'test-1',title:'عنوان اختبار فقط',employer:source.institution,specialty:'تخصص اختبار',qualification:'مؤهل اختبار',governorate:'بغداد',jobType:'teaching',announcementDate:'2026-10-08',applicationDeadline:null,verifiedAt:'2026-10-09',officialUrl:'https://university.invalid/test-1'};
const now='2026-10-10';
assert.equal(prepare(window.MunjizAcademicJobsData,now).length,0);
assert.ok(validJob(job,[source],now));
for(const mutation of [{officialUrl:'javascript:alert(1)'},{officialUrl:'https://untrusted.invalid/job'},{officialUrl:'https://user:pass@university.invalid/job'},{applicationDeadline:'2026-10-01'},{announcementDate:'2026-10-11'},{announcementDate:'2026-02-30'},{verifiedAt:'2026-10-01'},{qualification:''},{jobType:'unapproved'},{governorate:'غير معتمدة'}]) assert.equal(validJob({...job,...mutation},[source],now),false);
assert.equal(validJob(job,[],now),false); assert.equal(validJob(job,[null],now),false);
assert.equal(validJob(job,[{...source,sector:'public'}],now),false);
const second={...job,id:'test-2',jobType:'administrative',governorate:'البصرة',specialty:'تخصص ثان',announcementDate:'2026-10-09'};
const data=prepare({sources:[source],announcements:[job,second,job,{...job,id:'bad',officialUrl:'http://university.invalid/test'}]},now);
assert.deepEqual(data.map(j=>j.id),['test-2','test-1']);
assert.deepEqual(filter(data,{governorate:'بغداد',specialty:'تخصص اختبار',jobType:'teaching'}).map(j=>j.id),['test-1']);
assert.equal(filter(data,{governorate:'البصرة',jobType:'technical'}).length,0);
console.log('PASS: private official-source registry, required job fields, real dates, safe URLs, deduplication, newest ordering and combined filters; published data contains no invented offers.');
