const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute,hubConfig,enterPublicMode}=require(process.env.DOJANG_HUB_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='',origin=env.DOJANG_PUBLIC_ORIGIN)=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const sid='a'.repeat(64);
const context={principal:{userId:'15',name:'Synthetic Staff',role:'manager',siteId:'5'},members:[]};
const fixture=async(url)=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${sid}; Path=/; HttpOnly; Secure`}}):Response.json({result:context});
const login=async()=>{const response=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,fixture);assert.equal(response.status,200);return response.headers.get('set-cookie').split(';')[0];};
test('public mode removes both staff cookies, preserves kiosk pairing and revokes the native session',async()=>{
 const cookie=await login();let calls=0;
 const r=await enterPublicMode(req({},cookie+'; dojang_staff_test=paired; dojang_kiosk_test=public'),env,async(url)=>{calls++;assert.ok(url.endsWith('/web/session/destroy'));return Response.json({result:null});});
 assert.equal(r.status,200);assert.deepEqual(await r.json(),{staffContextCleared:true,backendRevoked:true});assert.equal(calls,1);
 assert.equal(r.headers.getSetCookie().length,2);
 assert.match(r.headers.get('set-cookie'),/dojang_hub_session=;.*Max-Age=0/);
 assert.match(r.headers.get('set-cookie'),/dojang_staff_test=;.*Max-Age=0/);
 assert.doesNotMatch(r.headers.get('set-cookie'),/dojang_kiosk_test/);
});
test('public privacy reset stays honest and locally clears expired or unreachable sessions',async()=>{
 const cookie=await login();
 for(const [value,settings,revoked] of [[cookie,env,false],['dojang_hub_session=expired',env,null],[cookie,{...env,DOJANG_HUB_ENABLED:'false'},null]]){
  const r=await enterPublicMode(req({},value),settings,async()=>{throw Error('secret');});
  assert.equal(r.status,200);assert.equal((await r.json()).backendRevoked,revoked);assert.equal(r.headers.getSetCookie().length,2);
 }
});
test('cross-origin public reset cannot sign staff out or reach Odoo',async()=>{
 let calls=0;const r=await enterPublicMode(req({},await login(),'https://attacker.test'),env,async()=>{calls++;});
 assert.equal(r.status,403);assert.equal(calls,0);assert.equal(r.headers.get('set-cookie'),null);
});
test('instructor clock requires an individual staff session, never device pairing',async()=>{
 const body={operation:'instructor_clock',payload:{direction:'in',currentShiftId:null,pin:'123456'},requestKey:'instructor-clock-0001'};
 let calls=0;
 const r=await hubRoute(req(body,'dojang_staff_test=fake.pair'),env,async()=>{calls++;});
 assert.equal(r.status,401);assert.equal(calls,0);
});
test('malformed or mismatched shift receipt remains uncertain instead of displaying success',async()=>{
 const cookie=await login();
 for(const shift of [null,{id:'24',checkIn:'2026-10-12T10:00:00Z',checkOut:'2026-10-12T11:00:00Z'},{id:'25',checkIn:'not-a-date',checkOut:null}]){
  const body={operation:'instructor_clock',payload:{direction:'out',currentShiftId:'25',pin:'123456'},requestKey:'instructor-clock-0001'};
  const r=await hubRoute(req(body,cookie),env,async()=>Response.json({result:{state:'clocked_out',shift}}));
  assert.equal(r.status,503);assert.equal((await r.json()).error.code,'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION');
 }
});
test('clock forwards the original key and accepts only the matching confirmed native shift',async()=>{
 const cookie=await login(),body={operation:'instructor_clock',payload:{direction:'out',currentShiftId:'25',pin:'123456'},requestKey:'instructor-clock-0001'};
 let sent;
 const r=await hubRoute(req(body,cookie),env,async(_url,init)=>{sent=JSON.parse(init.body).params;return Response.json({result:{state:'clocked_out',shift:{id:'25',checkIn:'2026-10-12T10:00:00Z',checkOut:'2026-10-12T11:00:00Z'}}});});
 assert.equal(r.status,200);assert.equal(sent.requestKey,body.requestKey);assert.deepEqual(sent.payload,body.payload);
});
test('hub refuses disabled mode, demo and unsafe origins',async()=>{for(const settings of [{...env,DOJANG_HUB_ENABLED:'false'},{...env,NEXT_PUBLIC_DEMO_MODE:'true'},{...env,DOJANG_ODOO_URL:'http://external.test'}])assert.throws(()=>hubConfig(settings));});
test('cross-origin login never reaches the backend',async()=>{let calls=0;const r=await hubRoute(req({operation:'login',login:'a',password:'b'},'','https://attacker.test'),env,async()=>{calls++});assert.equal(r.status,403);assert.equal(calls,0)});
test('browser cannot supply a role, tenant or backend host during login',async()=>{const r=await hubRoute(req({operation:'login',login:'a',password:'b',role:'owner'}),env,fixture);assert.equal(r.status,400)});
test('successful login stores an encrypted secure cookie, never raw session or password',async()=>{const response=await hubRoute(req({operation:'login',login:'a',password:'synthetic-password'}),env,fixture);assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);assert.match(cookie,/Secure/);assert.doesNotMatch(cookie,new RegExp(sid+'|synthetic-password'));assert.doesNotMatch(await response.text(),/session_id|synthetic-password/)});
test('ungranted and MFA-incomplete accounts get no hub cookie',async()=>{for(const fetcher of [async()=>Response.json({result:{uid:null}}),async(url)=>url.endsWith('/authenticate')?fixture(url,{}):Response.json({result:{error:{code:'FORBIDDEN',status:403}}})]){const r=await hubRoute(req({operation:'login',login:'a',password:'b'}),env,fetcher);assert.ok([401,403].includes(r.status));assert.equal(r.headers.get('set-cookie'),null)}});
test('demo pairing cannot authenticate the real user gateway',async()=>{const r=await hubRoute(req({operation:'context',payload:{},requestKey:null},'dojang_staff_test=fake.pair'),env,fixture);assert.equal(r.status,401)});
test('cookie is bound to the configured site and duplicate cookies are rejected',async()=>{const cookie=await login();for(const [c,settings] of [[cookie,{...env,DOJANG_HUB_SITE_ID:'6'}],[cookie+'; '+cookie,env]]){const r=await hubRoute(req({operation:'context',payload:{},requestKey:null},c),settings,fixture);assert.equal(r.status,401)}});
test('fixed host, database and site come from server configuration',async()=>{const cookie=await login();const calls=[];const r=await hubRoute(req({operation:'context',payload:{},requestKey:null},cookie),env,async(url,init)=>{calls.push({url,init});return Response.json({result:context})});assert.equal(r.status,200);assert.equal(calls[0].url,env.DOJANG_ODOO_URL+'/companion/hub/action');assert.equal(calls[0].init.headers.cookie,'session_id='+sid);assert.equal(JSON.parse(calls[0].init.body).params.siteId,'5');assert.equal(calls[0].init.redirect,'error')});
test('unknown actions and caller authority fields are rejected',async()=>{const cookie=await login();for(const body of [{operation:'sudo',payload:{},requestKey:'request-test-00001'},{operation:'context',payload:{},requestKey:null,siteId:'9'}])assert.equal((await hubRoute(req(body,cookie),env,fixture)).status,400)});
test('member details are an authenticated fixed read, never a paired-device upgrade',async()=>{
 const body={operation:'member_details',payload:{memberId:'25'},requestKey:null};
 assert.equal((await hubRoute(req(body,'dojang_staff_test=fake.pair'),env,fixture)).status,401);
 const cookie=await login();let params;
 const r=await hubRoute(req(body,cookie),env,async(_url,init)=>{params=JSON.parse(init.body).params;return Response.json({result:{member:{id:'25'}}});});
 assert.equal(r.status,200);assert.equal(params.siteId,'5');assert.equal(params.operation,'member_details');assert.deepEqual(params.payload,{memberId:'25'});
 assert.equal((await hubRoute(req({...body,operation:'update_member'},cookie),env,fixture)).status,400);
});
test('provider/backend errors are sanitized and preserve retry uncertainty',async()=>{const cookie=await login();const r=await hubRoute(req({operation:'checkout',payload:{},requestKey:'request-test-00001'},cookie),env,async()=>{throw Error('secret-token')});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret-token/)});
test('CRM reads require a real user session and mutations require a stable receipt key',async()=>{
 const cookie=await login();
 for(const operation of ['crm_context','lead_details','member_workspace','operations_report','session_roster']){
  const body={operation,payload:operation==='crm_context'?{query:''}:operation==='member_workspace'?{memberId:'25'}:{leadId:'21'},requestKey:null};
  assert.equal((await hubRoute(req(body),env,fixture)).status,401);
  assert.equal((await hubRoute(req(body,cookie),env,fixture)).status,200);
 }
 for(const operation of ['create_lead','update_lead','create_task','complete_task','propose_stage','add_lead_note','prepare_lead_action','assign_lead']){
  assert.equal((await hubRoute(req({operation,payload:{},requestKey:null},cookie),env,fixture)).status,400);
  assert.equal((await hubRoute(req({operation,payload:{},requestKey:'crm-action-test-0001'},cookie),env,fixture)).status,200);
 }
});
test('logout revokes the Odoo session and clears the local cookie',async()=>{const cookie=await login();let path='';const r=await hubRoute(req({operation:'logout'},cookie),env,async(url)=>{path=url;return Response.json({result:null})});assert.ok(path.endsWith('/web/session/destroy'));assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await r.json()).backendRevoked,true)});

test('invoice checkout accepts only the exact invoice on the configured Odoo origin',async()=>{
 const cookie=await login();
 const command={operation:'payment_link',payload:{memberId:'25',invoiceId:'42',expectedVersion:10,expectedAmount:30},requestKey:'invoice-payment-test-001'};
 const valid={memberId:'25',invoiceId:'42',invoiceNumber:'INV/42',amount:30,currency:'USD',checkoutUrl:env.DOJANG_ODOO_URL+'//my/invoices/42?access_token=synthetic&move_id=42&payment_token=synthetic#portal_pay'};
 let r=await hubRoute(req(command,cookie),env,async()=>Response.json({result:valid}));
 assert.equal(r.status,200);assert.match((await r.json()).checkoutUrl,/\.test\/my\/invoices\/42\?/);
 for(const patch of [{checkoutUrl:valid.checkoutUrl.replace('https://odoo.example.test','https://attacker.test')},
   {checkoutUrl:valid.checkoutUrl.replace('/42?','/43?')},{memberId:'26'},{invoiceId:'43'},
   {checkoutUrl:'javascript:alert(1)'},{checkoutUrl:env.DOJANG_ODOO_URL+'/my/invoices/42'}, {amount:0}]){
   r=await hubRoute(req(command,cookie),env,async()=>Response.json({result:{...valid,...patch}}));assert.equal(r.status,502);
 }
 assert.equal((await hubRoute(req(command),env,fixture)).status,401);
 assert.equal((await hubRoute(req({...command,requestKey:null},cookie),env,fixture)).status,400);
});
test('AI activation uses the real session and stable key, settings are an authenticated read',async()=>{
 const cookie=await login();
 const read={operation:'ai_settings',payload:{},requestKey:null};
 assert.equal((await hubRoute(req(read),env,fixture)).status,401);
 assert.equal((await hubRoute(req(read,cookie),env,fixture)).status,200);
 assert.equal((await hubRoute(req({...read,operation:'enable_ai'},cookie),env,fixture)).status,400);
});
