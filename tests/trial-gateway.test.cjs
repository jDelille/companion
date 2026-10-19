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
const key='trial-request-0001';
const reserve={leadId:'3',expectedLeadVersion:1,memberId:'7',sessionId:'9',expectedSessionVersion:2,reason:'First class'};
const reserved={trialId:'11',leadId:'3',memberId:'7',sessionId:'9',state:'trial_reserved',stageChanged:false,messageSent:false,membershipCreated:false,replayed:false};
test('trial reads are keyless and trial writes are keyed',async()=>{
 const cookie=await login();
 for(const [operation,payload] of [['trial_context',{leadId:'3',query:''}],['conversion_preview',{trialId:'11',planId:'2',startDate:'2026-10-13'}]])
  assert.equal((await hubRoute(req({operation,payload,requestKey:null},cookie),env,async()=>Response.json({result:{ok:true}}))).status,200,operation);
 assert.equal((await hubRoute(req({operation:'reserve_trial',payload:reserve,requestKey:null},cookie),env,async()=>Response.json({result:reserved}))).status,400);
 assert.equal((await hubRoute(req({operation:'reserve_trial',payload:reserve,requestKey:key},cookie),env,async()=>Response.json({result:reserved}))).status,200);
});
test('a trial receipt that names another lead, student or class, or claims a side effect, is not shown as success',async()=>{
 const cookie=await login();
 for(const bad of [{...reserved,leadId:'4'},{...reserved,memberId:'8'},{...reserved,sessionId:'10'},{...reserved,messageSent:true},{...reserved,stageChanged:true},{...reserved,state:'trial_converted'}]){
  const r=await hubRoute(req({operation:'reserve_trial',payload:reserve,requestKey:key},cookie),env,async()=>Response.json({result:bad}));
  assert.equal(r.status,503);
 }
 const convert={trialId:'11',expectedVersion:4,planId:'2',startDate:'2026-10-13',reason:'Chose plan',reviewToken:'t'};
 const converted={trialId:'11',leadId:'3',memberId:'7',subscriptionId:'21',state:'trial_converted',membershipState:'active',paymentCollected:false,portalAccessGranted:false,messageSent:false,stageChanged:false,replayed:false};
 assert.equal((await hubRoute(req({operation:'convert_trial',payload:convert,requestKey:key},cookie),env,async()=>Response.json({result:converted}))).status,200);
 for(const bad of [{...converted,paymentCollected:true},{...converted,portalAccessGranted:true},{...converted,trialId:'12'}])
  assert.equal((await hubRoute(req({operation:'convert_trial',payload:convert,requestKey:key},cookie),env,async()=>Response.json({result:bad}))).status,503);
});
test('trial outcomes and conversion are described without implying payment or messages',async()=>{
 const noShow=await runHubAction(async()=>({state:'trial_no_show'}),async()=>{},()=>{});
 assert.match(noShow.text,/No automatic follow-up was scheduled/);
 const future=await runHubAction(async()=>({state:'trial_converted',plan:'Monthly',membershipState:'pending',startDate:'2026-10-20'}),async()=>{},()=>{});
 assert.match(future.text,/Monthly membership ready to start on 2026-10-20\. No payment, portal invitation or message\./);
 const blocked=await runHubAction(async()=>{throw Error('MEMBERSHIP_ALREADY_OPEN');},async()=>{},()=>{});
 assert.equal(blocked.kind,'error');
});
