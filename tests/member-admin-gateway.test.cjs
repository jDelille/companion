const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute,hubPhotoRoute}=require(process.env.DOJANG_HUB_MODULE);
const {runHubAction}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='',path='/api/hub')=>new Request(env.DOJANG_PUBLIC_ORIGIN+path,{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{
 const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'manager'}}}));
 assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];
};
const key='member-admin-request-0001';
test('archive, course and archive-list reads forward without a request key',async()=>{
 const cookie=await login();
 for(const [operation,payload] of [['archive_review',{memberId:'7'}],['archived_members',{query:''}],['course_roster',{templateId:''}],['course_assignment_preview',{templateId:'3',addMemberIds:['7'],removeMemberIds:[]}]]){
  let sent;const r=await hubRoute(req({operation,payload,requestKey:null},cookie),env,async(_u,init)=>{sent=JSON.parse(init.body).params;return Response.json({result:{ok:true}});});
  assert.equal(r.status,200,operation);assert.equal(sent.operation,operation);assert.equal(sent.siteId,'5');
 }
});
test('archive, restore and course writes require a stable key and an exact native receipt',async()=>{
 const cookie=await login();
 const cases=[['archive_member',{memberId:'7',expectedVersion:1,reason:'Moved'},{state:'archived',memberId:'7',cancelledBookingIds:[],replayed:false}],
  ['restore_member',{memberId:'7',expectedVersion:1,reason:'Back'},{state:'restored',memberId:'7',replayed:false}],
  ['assign_course_members',{templateId:'3',expectedVersion:1,addMemberIds:['7'],removeMemberIds:[],reason:'Cohort',reviewToken:'t'},{state:'course_roster_updated',templateId:'3',bookingsCreated:2,bookingsCancelled:0,replayed:false}]];
 for(const [operation,payload,result] of cases){
  assert.equal((await hubRoute(req({operation,payload,requestKey:null},cookie),env,async()=>Response.json({result}))).status,400,operation);
  assert.equal((await hubRoute(req({operation,payload,requestKey:key},cookie),env,async()=>Response.json({result}))).status,200,operation);
  for(const bad of [{...result,state:'saved'},{...result,memberId:'8',templateId:'4'},{...result,replayed:undefined}]){
   const r=await hubRoute(req({operation,payload,requestKey:key},cookie),env,async()=>Response.json({result:bad}));
   assert.equal(r.status,503,operation);assert.equal((await r.json()).error.code,'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION');
  }
 }
});
test('photos use only the dedicated bounded route and its larger Odoo endpoint',async()=>{
 const cookie=await login();
 const photo={operation:'update_member_photo',payload:{memberId:'7',expectedVersion:1,image:'A'.repeat(200000)},requestKey:key};
 let called=false;
 assert.equal((await hubRoute(req({...photo,payload:{...photo.payload,image:'AAAA'}},cookie),env,async()=>{called=true;})).status,400);
 assert.equal(called,false);
 let path;const ok=await hubPhotoRoute(req(photo,cookie,'/api/hub/photo'),env,async(url)=>{path=url;return Response.json({result:{state:'photo_updated',memberId:'7',replayed:false}});});
 assert.equal(ok.status,200);assert.equal(path,'https://odoo.example.test/companion/hub/photo');
 const huge=await hubPhotoRoute(req({...photo,payload:{...photo.payload,image:'A'.repeat(460000)}},cookie,'/api/hub/photo'),env,async()=>{called=true;});
 assert.equal(huge.status,413);assert.equal(called,false);
 assert.equal((await hubPhotoRoute(req({...photo,operation:'archive_member'},cookie,'/api/hub/photo'),env,async()=>{called=true;})).status,400);
 assert.equal((await hubPhotoRoute(req(photo,'dojang_staff_test=paired','/api/hub/photo'),env,async()=>{called=true;})).status,401);
 assert.equal(called,false);
});
test('acknowledged archive and roster changes survive a failed refresh with honest counts',async()=>{
 let shown=0;
 const archived=await runHubAction(async()=>({state:'archived',memberId:'7',cancelledBookingIds:['1','2']}),async()=>{throw Error('offline');},()=>shown++);
 assert.equal(archived.kind,'success');assert.match(archived.text,/2 future bookings were cancelled/);assert.equal(shown,1);
 const course=await runHubAction(async()=>({state:'course_roster_updated',bookingsCreated:4,bookingsCancelled:1}),async()=>{},()=>{});
 assert.match(course.text,/4 bookings created, 1 cancelled/);
 const blocked=await runHubAction(async()=>{throw Error('MEMBERSHIP_REVIEW_REQUIRED');},async()=>{},()=>{});
 assert.equal(blocked.kind,'error');assert.match(blocked.text,/membership/);
});
