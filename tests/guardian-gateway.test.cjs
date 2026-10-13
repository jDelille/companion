const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mintCookie,handle}=require(process.env.DOJANG_GATEWAY_MODULE);
const {hubRoute}=require(process.env.DOJANG_HUB_MODULE);
const c={origin:'https://demo.example.test',backend:'https://odoo.example.test',token:'t'.repeat(40),cookieSecret:'h'.repeat(48),kioskKey:'k'.repeat(48),staffKey:'s'.repeat(48),kioskPairKey:'p'.repeat(48),staffPairKey:'z'.repeat(48)};
const cookie=(role='kiosk')=>`dojang_${role}_test=${mintCookie(c,role)}`;
const post=(body,role='kiosk',extra={})=>new Request(c.origin+'/api/v2/guardian/verify',{method:'POST',headers:{cookie:cookie(role),origin:c.origin,'content-type':'application/json',...extra},body:JSON.stringify(body)});
const rpc=value=>async()=>Response.json({jsonrpc:'2.0',result:value});
const token='g'.repeat(43);
const verified={guardianToken:token,expiresInSeconds:180,guardian:'Parent L.',students:[{memberId:'22',displayName:'Ava L.',onRoster:true,attendanceState:'pending'}]};
const command=()=>({idempotencyKey:'guardian-request-0001',correlationId:'guardian-correlation-01',payload:{sessionId:'11',memberId:'22'}});
const receipt=(cmd=command())=>({receipt:{attendanceId:'33',sessionId:'11',memberId:'22',status:'present',checkedInAt:'2026-10-13T08:00:00Z',alreadyRecorded:false,correlationId:cmd.correlationId},replayed:false,correlationId:cmd.correlationId,guardianVerified:true});
test('guardian verification needs a paired kiosk, same origin and a well-formed phone and PIN',async()=>{
 let sent;
 const ok=await handle(post({phone:'512-555-0100',pin:'482913',sessionId:'11'}),c,'guardianVerify',undefined,async(url,init)=>{sent={url,init};return Response.json({result:verified});});
 assert.equal(ok.status,200);assert.equal(sent.url,c.backend+'/kiosk/v2/guardian/verify');
 assert.deepEqual((await ok.json()).students,verified.students);
 assert.equal((await handle(post({phone:'512',pin:'482913',sessionId:'11'},'staff'),c,'guardianVerify',undefined,rpc(verified))).status,403);
 assert.equal((await handle(post({phone:'512',pin:'482913',sessionId:'11'},'kiosk',{origin:'https://evil.example.test'}),c,'guardianVerify',undefined,rpc(verified))).status,403);
 for(const bad of [{phone:'512',pin:'48291',sessionId:'11'},{phone:'512',pin:'482913',sessionId:'0'},{phone:'512',pin:'482913',sessionId:'11',memberId:'22'}])
  assert.equal((await handle(post(bad),c,'guardianVerify',undefined,rpc(verified))).status,400);
 const denied=await handle(post({phone:'512-555-0100',pin:'000111',sessionId:'11'}),c,'guardianVerify',undefined,rpc({problem:{code:'GUARDIAN_NOT_VERIFIED',status:401}}));
 assert.equal(denied.status,401);assert.equal((await denied.json()).code,'GUARDIAN_NOT_VERIFIED');
 assert.equal((await handle(post({phone:'512-555-0100',pin:'482913',sessionId:'11'}),c,'guardianVerify',undefined,rpc({...verified,guardianToken:'short'}))).status,503);
});
test('guardian check-in only succeeds with a matching guardian-verified receipt',async()=>{
 const ok=await handle(post({guardianToken:token,command:command()}),c,'guardianCheckin',undefined,rpc(receipt()));
 assert.equal(ok.status,201);assert.equal((await ok.json()).guardianVerified,true);
 for(const bad of [{...receipt(),guardianVerified:undefined},{...receipt(),receipt:{...receipt().receipt,memberId:'23'}}]){
  const r=await handle(post({guardianToken:token,command:command()}),c,'guardianCheckin',undefined,rpc(bad));
  assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'1');
 }
 assert.equal((await handle(post({guardianToken:'x',command:command()}),c,'guardianCheckin',undefined,rpc(receipt()))).status,400);
 const expired=await handle(post({guardianToken:token,command:command()}),c,'guardianCheckin',undefined,rpc({problem:{code:'GUARDIAN_SESSION_EXPIRED',status:401}}));
 assert.equal(expired.status,401);
});
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='')=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
test('a kiosk PIN receipt that echoes the PIN or names another parent is not success',async()=>{
 const login=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'manager'}}}));
 const session=login.headers.get('set-cookie').split(';')[0];
 const payload={memberId:'7',guardianId:'9',pin:'482913',reason:'At the desk'};
 const saved={memberId:'7',guardianId:'9',state:'guardian_pin_set',messageSent:false,replayed:false};
 const send=async result=>(await hubRoute(req({operation:'set_guardian_kiosk_pin',payload,requestKey:'guardian-pin-0000001'},session),env,async()=>Response.json({result}))).status;
 assert.equal(await send(saved),200);
 for(const bad of [{...saved,guardianId:'10'},{...saved,messageSent:true},{...saved,echo:'482913'}])assert.equal(await send(bad),503);
});
