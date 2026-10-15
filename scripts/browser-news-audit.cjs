// Run against a local npm start server. All news fixtures stay inside the browser.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox']});
 const root = process.env.AUDIT_SITE_URL || 'http://localhost:3000';
 const items = [
  {title:'خبر أقدم',source:'مصدر معزول',url:'https://example.org/1',date:'12-10-2026',category:'أخبار الوزارة'},
  {title:'Newer English headline',source:'مصدر معزول',url:'https://example.org/2',date:'2026-10-20',category:'أخبار الوزارة'},
  {title:'خبر جامعي',source:'مصدر آخر',url:'https://example.org/3',date:'2026-10-11',category:'أخبار الجامعات'},
 ];
 for (const file of ['index.html','news.html']) {
  const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https:\/\//,route=>route.abort());
  let data=items;
  await page.route('**/news.json',route=>route.fulfill({json:data}));
  await page.goto(root+'/'+file);
  await page.locator('#latestNewsTicker').waitFor({state:'visible'});
  const first = file==='index.html' ? '#newsFeatured h3' : '#archiveGrid h3';
  assert.equal(await page.locator(first).first().textContent(),'Newer English headline');
  if (file==='index.html') {await page.getByRole('button',{name:'أخبار الجامعات',exact:true}).click();assert.equal(await page.locator('#newsGrid h3').textContent(),'خبر جامعي');}
  else {await page.locator('#archiveSearch').fill('أقدم');assert.equal(await page.locator('#archiveGrid .news-card').count(),1);}
  data=[items[0]];
  await page.reload();await page.locator('#latestNewsTicker').waitFor({state:'visible'});
  assert.equal(await page.locator('.latest-ticker-repeat').count(),0);
  assert.equal(await page.locator('.latest-ticker-track').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);
  assert.equal(await page.locator('.latest-ticker-copy').count(),1);
  const width=await page.locator('.latest-ticker-list').first().evaluate(e=>e.getBoundingClientRect().width);
  assert(width>=await page.locator('.latest-ticker-viewport').evaluate(e=>e.clientWidth));
  data=[];await page.reload();await page.waitForTimeout(100);assert.equal(await page.locator('#latestNewsTicker').isVisible(),false);
  assert.deepEqual(errors,[]);await page.close();
  const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touch.route(/^https:\/\//,route=>route.abort());await touch.route('**/news.json',route=>route.fulfill({json:items}));await touch.goto(root+'/'+file);
  await touch.locator('#latestNewsTicker').waitFor({state:'visible'});await touch.locator('.latest-ticker-badge').tap();
  const track=touch.locator('.latest-ticker-track');const x=()=>track.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41);const before=await x();await touch.waitForTimeout(200);assert(await x()>before);
  assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth),390);await touch.close();
  console.log(file+': dates, direction, filters, empty feed, reduced motion, short feed, touch motion PASS');
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
