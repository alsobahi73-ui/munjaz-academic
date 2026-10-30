import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Script, createContext } from 'node:vm';
import { createRequestHandler, normalizeOrigin } from '../telegram-requests.mjs';
const ctx = createContext({window:{}});
new Script(await readFile(new URL('../../academic-services-data.js', import.meta.url),'utf8')).runInContext(ctx);
const catalog=ctx.window.AcademicServicesCatalog;
const origin='https://munjiz.example';
const payload=()=>({requestId:randomUUID(),service:'reports',name:'',phone:'+9647701234567',details:'أحتاج تنسيق التقرير العلمي وفق متطلبات الجامعة.',consent:true});
const makeRequest=(body,opts={})=>new Request('https://api.example/api/academic-requests',{
 method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...opts.headers},body:JSON.stringify(body)});
const makeHandler=(fetchImpl,extra={})=>createRequestHandler({catalog,token:'FAKE_TEST_TOKEN',chatId:'1234',siteOrigin:origin,fetchImpl,...extra});
const ok=()=>Response.json({ok:true,result:{message_id:100}});
test('sends exact approved service/category and anonymous message; verifies provider response',async()=>{
 let sent;const handler=makeHandler(async(url,opts)=>{sent={url,body:JSON.parse(opts.body)};return ok();});
 const input=payload(),response=await handler(makeRequest(input),'client');
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{status:'sent',requestId:input.requestId});
 assert.equal(sent.url,'https://api.telegram.org/botFAKE_TEST_TOKEN/sendMessage');assert.equal(sent.body.chat_id,'1234');
 assert.match(sent.body.text,/إعداد التقارير والسمنرات/);assert.match(sent.body.text,/خدمات طلبة الدراسات الأولية/);
 assert.ok(sent.body.text.includes(input.details));assert.ok(sent.body.text.includes('مدفوعة'));
 assert.equal(sent.body.parse_mode,undefined);
});
test('validates all service IDs, mandatory phone, consent, UUID and size',async()=>{
 let calls=0;const handler=makeHandler(async()=>{calls++;return ok();});
 for(const service of catalog.flatMap(g=>g.services)){const input={...payload(),service:service.id,phone:'٠٠٩٦٤٧٧٠١٢٣٤٥٦٧'};assert.equal((await handler(makeRequest(input),service.id)).status,201);}
 assert.equal(calls,15);
 for(const invalid of [{consent:false},{consent:'true'},{service:'unknown'},{details:'قصير'},{details:'x'.repeat(2501)},{name:'x'.repeat(101)},{phone:''},{phone:'abcdefg'},{requestId:'invalid'},{phone:1234}]){
   assert.equal((await handler(makeRequest({...payload(),...invalid}),'invalid')).status,400);
 }
 assert.equal(calls,15);
});
test('rejects unconfigured delivery, unauthorized origins, form posts, and oversized body',async()=>{
 const configured=makeHandler(async()=>{throw Error('Must not call');});
 assert.equal((await configured(makeRequest(payload(),{headers:{Origin:'https://attacker.example'}}))).status,403);
 assert.equal((await configured(makeRequest(payload(),{headers:{'Content-Type':'text/plain'}}))).status,415);
 assert.equal((await configured(makeRequest({...payload(),details:'ع'.repeat(13000)}))).status,413);
 assert.equal((await makeHandler(async()=>ok(),{token:''})(makeRequest(payload()))).status,503);
});
test('allowed CORS preflight supports hosted static frontend',async()=>{
 const res=await makeHandler(async()=>ok())(new Request('https://api.example/api/academic-requests',{method:'OPTIONS',headers:{Origin:origin}}));
 assert.equal(res.status,204);assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);
});
test('deduplicates repeated and concurrent submissions; conflicts do not send',async()=>{
 let calls=0,resolve;const handler=makeHandler(async()=>{calls++;return new Promise(r=>resolve=r);});
 const input=payload(),first=handler(makeRequest(input),'client'),second=handler(makeRequest(input),'client');
 await new Promise(r=>setTimeout(r,0));assert.equal(calls,1);resolve(ok());
 assert.equal((await first).status,201);assert.equal((await second).status,201);
 assert.equal((await handler(makeRequest(input),'client')).status,201);assert.equal(calls,1);
 assert.equal((await handler(makeRequest({...input,details:'تفاصيل مختلفة للطلب الأكاديمي'}),'client')).status,409);assert.equal(calls,1);
});
test('limits repeated new requests without logging customer details',async()=>{
 let calls=0;const handler=makeHandler(async()=>{calls++;return ok();});
 for(let i=0;i<5;i++)assert.equal((await handler(makeRequest(payload()),'same')).status,201);
 assert.equal((await handler(makeRequest(payload()),'same')).status,429);assert.equal(calls,5);
});
test('reports provider rejection without success; retry is possible after explicit rejection',async()=>{
 let calls=0;const handler=makeHandler(async()=>{calls++;return Response.json({ok:false,description:'sensitive provider detail'},{status:403});});
 const input=payload(),res=await handler(makeRequest(input));assert.equal(res.status,502);
 assert.deepEqual(await res.json(),{error:'delivery_failed'});await handler(makeRequest(input));assert.equal(calls,2);
});
test('uncertain sends are cached, not automatically retried or falsely confirmed',async()=>{
 let calls=0;const handler=makeHandler(async()=>{calls++;throw Error('token-secret-in-provider-url');});
 const input=payload();assert.deepEqual(await (await handler(makeRequest(input))).json(),{error:'delivery_uncertain'});
 assert.equal((await handler(makeRequest(input))).status,502);assert.equal(calls,1);
});

test('origin normalization removes slashes, whitespace, controls and invisible Unicode on both sides', async () => {
 const variants = [origin + '/', '  ' + origin + ' / ', '\u200e\u202e' + origin + '\u2069\u200b\ufeff/', origin.replace('example', '\u00adex\u034fam\u0000ple')];
 for (const value of variants) {
  assert.equal(normalizeOrigin(value), origin);
  const handler = makeHandler(async () => ok(), { siteOrigin: value });
  const post = await handler(makeRequest(payload()));
  assert.equal(post.status, 201);
  assert.equal(post.headers.get('Access-Control-Allow-Origin'), origin);
  // A request-like object permits Unicode/control values disallowed by HTTP Headers.
  const preflight = await handler({ method: 'OPTIONS', headers: { get: () => value } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
 }
});
test('normalization retains strict origin boundaries and fails closed without configuration', async () => {
 const handler = makeHandler(async () => { throw Error('Must not send'); });
 for (const value of [null, '', 'null', '*', 'http://munjiz.example', origin + '.attacker.example', origin + '/path', origin + ':443', 'https://other.example']) {
  assert.equal((await handler({ method: 'OPTIONS', headers: { get: () => value } })).status, 403);
 }
 for (const siteOrigin of [undefined, '', ' \u200e\u200b/']) {
  assert.equal((await makeHandler(async () => ok(), { siteOrigin })(makeRequest(payload()))).status, 403);
 }
});
