const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute}=require(process.env.DOJANG_HUB_MODULE);
const {runHubAction}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='')=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'owner'}}}));return r.headers.get('set-cookie').split(';')[0];};
const send=async(cookie,operation,payload,result,requestKey='comms-request-00001')=>(await hubRoute(req({operation,payload,requestKey},cookie),env,async()=>Response.json({result}))).status;
test('communications reads are keyless and writes must not claim a sent message',async()=>{
 const cookie=await login();
 for(const [op,payload] of [['consent_overview',{memberId:'7'}],['broadcast_context',{}],['broadcast_preview',{channel:'sms',purpose:'service',audience:'state:active',body:'x'}],['automation_overview',{}]])
  assert.equal(await send(cookie,op,payload,{ok:true},null),200,op);
 const approve={broadcastId:'4',expectedVersion:2,reason:'ok'};
 const approved={broadcastId:'4',state:'broadcast_approved',queued:3,provider:'not_configured',messageSent:false,replayed:false};
 assert.equal(await send(cookie,'approve_broadcast',approve,approved),200);
 for(const bad of [{...approved,messageSent:true},{...approved,broadcastId:'5'},{...approved,state:'broadcast_sent'}])assert.equal(await send(cookie,'approve_broadcast',approve,bad),503);
 const consent={memberId:'7',partnerId:'9',channel:'sms',purpose:'marketing',state:'withdrawn',source:'reply_stop',evidence:'STOP'};
 const saved={memberId:'7',partnerId:'9',state:'consent_recorded',consent:'withdrawn',messageSent:false,replayed:false};
 assert.equal(await send(cookie,'record_consent',consent,saved),200);
 assert.equal(await send(cookie,'record_consent',consent,{...saved,consent:'granted'}),503);
 const pause={automationId:'base.automation:3',active:false,expectedVersion:1,reason:'Migration'};
 assert.equal(await send(cookie,'set_automation_active',pause,{automationId:'base.automation:3',state:'automation_paused',replayed:false}),200);
 assert.equal(await send(cookie,'set_automation_active',pause,{automationId:'base.automation:3',state:'automation_resumed',replayed:false}),503);
});
test('an approved broadcast without a provider says nothing was sent',async()=>{
 const none=await runHubAction(async()=>({state:'broadcast_approved',queued:2,provider:'not_configured'}),async()=>{},()=>{});
 assert.match(none.text,/2 messages queued\. No provider is connected, so nothing is sent\./);
 const configured=await runHubAction(async()=>({state:'broadcast_approved',queued:2,provider:'configured_not_exercised'}),async()=>{},()=>{});
 assert.match(configured.text,/count as sent only when the provider confirms/);
});
