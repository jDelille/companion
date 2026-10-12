const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mintCookie} = require(process.env.DOJANG_GATEWAY_MODULE);
const {conciergeQuestion} = require(process.env.DOJANG_CONCIERGE_MODULE);
const c={origin:'https://demo.example.test',backend:'https://odoo.example.test',token:'t'.repeat(40),cookieSecret:'h'.repeat(48),kioskKey:'k'.repeat(48),staffKey:'s'.repeat(48),kioskPairKey:'p'.repeat(48),staffPairKey:'z'.repeat(48)};
const request=(body,role='kiosk',headers={})=>new Request(c.origin+'/api/v1/kiosk/concierge',{method:'POST',headers:{origin:c.origin,'content-type':'application/json',cookie:`dojang_${role}_test=${mintCookie(c,role)}`,...headers},body:JSON.stringify(body)});
const ask=(question,role='kiosk',headers={})=>conciergeQuestion(request({question,correlationId:'concierge-read-0001'},role,headers),c);

test('paired class question opens the existing live schedule without simulated sessions',async()=>{
 const r=await ask('What classes are on today?');assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{kind:'schedule',title:"Today's classes"});
 assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('vary'),'Cookie');
});
test('unpaired, staff and cross-origin concierge requests remain unauthorized',async()=>{
 assert.equal((await ask('What classes are on today?','kiosk',{cookie:''})).status,403);
 assert.equal((await ask('What classes are on today?','staff')).status,403);
 assert.equal((await ask('What classes are on today?','kiosk',{origin:'https://other.example.test'})).status,403);
});
test('private questions cannot be reclassified as public schedules or actions',async()=>{
 for(const question of ['What is my balance for class today?','Show my belt and class time','My injury and trial class']) {
  const r=await ask(question);assert.equal((await r.json()).kind,'privateHandoff');
 }
});
test('unsupported writes and school facts offer an honest handoff with no action or receipt',async()=>{
 for(const question of ['I want to try a class','I need help from staff','How do I join?','Where are the restrooms?','Accessibility help']){
  const r=await ask(question),body=await r.json();assert.equal(r.status,200);assert.equal(body.kind,'answer');
  assert.equal(body.action,undefined);assert.equal(body.receipt,undefined);
  assert.doesNotMatch(JSON.stringify(body),/on their way|free trial|step-free|on the left/);
 }
});
test('check-in is a navigation suggestion, never an attendance receipt',async()=>{
 const r=await ask('Check me in');const body=await r.json();assert.equal(body.kind,'goTo');assert.equal(body.target,'checkIn');assert.equal(body.receipt,undefined);
});
test('malformed, oversized and caller-scoped questions fail closed',async()=>{
 for(const body of [null,[],{question:'',correlationId:'x'},{question:'x'.repeat(201),correlationId:'x'},{question:'x'.repeat(5000),correlationId:'x'},{question:'Today',correlationId:9},{question:'Today',correlationId:'x',tenantId:'2'}]){
  assert.equal((await conciergeQuestion(request(body),c)).status,400);
 }
});
