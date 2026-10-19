const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute}=require(process.env.DOJANG_HUB_MODULE);
const {runHubAction}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='')=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{
 const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'manager'}}}));
 return r.headers.get('set-cookie').split(';')[0];
};
const payload={sessionId:'4',memberId:'7',status:'present',expectedVersion:3,reason:'Paper sheet'};
const receipt={state:'attendance_recorded',memberId:'7',sessionId:'4',before:'pending',after:'present',reversal:false,replayed:false};
test('attendance reads never need a key and are forwarded unchanged',async()=>{
 const cookie=await login();
 for(const [operation,body] of [['attendance_sessions',{}],['attendance_sheet',{sessionId:'4'}]]){
  let sent;const r=await hubRoute(req({operation,payload:body,requestKey:null},cookie),env,async(_u,init)=>{sent=JSON.parse(init.body).params;return Response.json({result:{rows:[]}});});
  assert.equal(r.status,200);assert.deepEqual(sent.payload,body);
 }
});
test('a recorded attendance receipt must match the reviewed class, student and status',async()=>{
 const cookie=await login();
 assert.equal((await hubRoute(req({operation:'mark_attendance',payload,requestKey:null},cookie),env,async()=>Response.json({result:receipt}))).status,400);
 assert.equal((await hubRoute(req({operation:'mark_attendance',payload,requestKey:'attendance-request-0001'},cookie),env,async()=>Response.json({result:receipt}))).status,200);
 for(const bad of [{...receipt,sessionId:'5'},{...receipt,after:'late'},{...receipt,memberId:'8'},{...receipt,state:'saved'}]){
  const r=await hubRoute(req({operation:'mark_attendance',payload,requestKey:'attendance-request-0001'},cookie),env,async()=>Response.json({result:bad}));
  assert.equal(r.status,503);
 }
 const denied=await hubRoute(req({operation:'mark_attendance',payload,requestKey:'attendance-request-0002'},cookie),env,async()=>Response.json({result:{error:{code:'REVERSAL_REQUIRES_MANAGER',status:403}}}));
 assert.equal(denied.status,403);
});
test('a reversal is described as keeping the original record and not refunding credit',async()=>{
 const result=await runHubAction(async()=>({...receipt,before:'present',after:'absent',reversal:true}),async()=>{},()=>{});
 assert.equal(result.kind,'success');assert.match(result.text,/present → absent/);assert.match(result.text,/no class credit was refunded/);
 const lost=await runHubAction(async()=>{throw Error('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION');},async()=>{},()=>{});
 assert.equal(lost.kind,'uncertain');
});
