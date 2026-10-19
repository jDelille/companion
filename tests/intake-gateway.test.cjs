const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute}=require(process.env.DOJANG_HUB_MODULE);
const {runHubAction}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='')=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{
 const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'manager'}}}));
 assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];
};
const receipt={state:'student_created',memberId:'25',memberNumber:'DJ-00025',subscriptionCreated:false,enrollmentCreated:false,portalAccessGranted:false,messageSent:false,replayed:false};
const command={operation:'create_student',payload:{intake:{},reviewToken:'review'},requestKey:'intake-request-test-0001'};
test('intake reads and writes never upgrade a device pairing cookie',async()=>{
 for(const operation of ['intake_context','intake_preview','create_student']){
  let called=false;const r=await hubRoute(req({...command,operation},'dojang_staff_test=paired'),env,async()=>{called=true;});
  assert.equal(r.status,401);assert.equal(called,false);
 }
});
test('intake creation requires a stable key and forwards only configured school authority',async()=>{
 const cookie=await login();let sent;
 const r=await hubRoute(req(command,cookie),env,async(_url,init)=>{sent=JSON.parse(init.body).params;return Response.json({result:receipt});});
 assert.equal(r.status,200);assert.equal(sent.siteId,'5');assert.equal(sent.requestKey,command.requestKey);
 assert.equal((await hubRoute(req({...command,requestKey:null},cookie),env,async()=>Response.json({result:receipt}))).status,400);
 assert.equal((await hubRoute(req({...command,siteId:'6'},cookie),env,async()=>Response.json({result:receipt}))).status,400);
});
test('invalid native intake receipts never become apparent successful profiles',async()=>{
 const cookie=await login();
 for(const bad of [{}, {...receipt,memberId:'javascript:alert(1)'},{...receipt,subscriptionCreated:true},{...receipt,messageSent:true},{...receipt,replayed:undefined}]){
  const r=await hubRoute(req(command,cookie),env,async()=>Response.json({result:bad}));
  assert.equal(r.status,503);assert.equal((await r.json()).error.code,'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION');
 }
});
test('missing-field preview stays a read and preserves the actionable field messages',async()=>{
 const cookie=await login(),issues=[{field:'student.name',message:'Enter full name.'}];
 const r=await hubRoute(req({operation:'intake_preview',payload:{intake:{}},requestKey:null},cookie),env,async()=>Response.json({result:{valid:false,issues}}));
 assert.equal(r.status,200);assert.deepEqual((await r.json()).issues,issues);
});
test('student acknowledgement survives a failed refresh and links the exact native member',async()=>{
 let acknowledged=0;const result=await runHubAction(async()=>receipt,async()=>{throw Error('offline');},()=>acknowledged++);
 assert.equal(result.kind,'success');assert.equal(acknowledged,1);assert.deepEqual(result.intake,{memberId:'25',memberNumber:'DJ-00025'});
 assert.match(result.text,/No membership, trial booking/);assert.ok(result.refreshWarning);
});
test('lost student response remains uncertain for the original-key retry',async()=>{
 let acknowledged=false;const result=await runHubAction(async()=>{throw Error('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION');},async()=>{},()=>{acknowledged=true;});
 assert.equal(result.kind,'uncertain');assert.equal(acknowledged,false);
});
test('duplicate review stays a read and passes exact existing-record references, never a review token',async()=>{
 const cookie=await login();let sent;
 const review={valid:false,code:'DUPLICATE_STUDENT_REVIEW_REQUIRED',issues:[{field:'student.name',message:'Open the existing profile.'}],
  duplicateStudents:[{memberId:'25',name:'Synthetic',memberNumber:'DJ-00025',active:true}],guardianMatches:[],unselectableGuardianMatch:false};
 const r=await hubRoute(req({operation:'intake_preview',payload:{intake:{}},requestKey:null},cookie),env,async(_url,init)=>{sent=JSON.parse(init.body).params;return Response.json({result:review});});
 assert.equal(r.status,200);assert.equal(sent.requestKey,null);
 const value=await r.json();assert.deepEqual(value.duplicateStudents,review.duplicateStudents);assert.equal(value.reviewToken,undefined);
});
test('a duplicate found at save time is a definite rejection, not an uncertain write',async()=>{
 const cookie=await login();
 const r=await hubRoute(req(command,cookie),env,async()=>Response.json({result:{error:{code:'DUPLICATE_STUDENT_REVIEW_REQUIRED',status:409}}}));
 assert.equal(r.status,409);assert.equal((await r.json()).error.code,'DUPLICATE_STUDENT_REVIEW_REQUIRED');
 const result=await runHubAction(async()=>{throw Error('DUPLICATE_STUDENT_REVIEW_REQUIRED');},async()=>{},()=>{});
 assert.equal(result.kind,'error');
});
