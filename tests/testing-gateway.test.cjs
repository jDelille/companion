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
const key='testing-request-0001';
const send=async(cookie,operation,payload,result,requestKey=key)=>(await hubRoute(req({operation,payload,requestKey},cookie),env,async()=>Response.json({result}))).status;
test('testing reads are keyless and testing writes are keyed',async()=>{
 const cookie=await login();
 for(const [operation,payload] of [['testing_eligibility',{query:''}],['testing_roster',{testId:'4'}],['promotion_preview',{testId:'4',registrationIds:['8']}],['promotion_history',{query:''}]])
  assert.equal(await send(cookie,operation,payload,{ok:true},null),200,operation);
 const roster={testId:null,expectedVersion:0,name:'Spring',testDate:'2026-10-20',add:[{memberId:'7',targetRankId:'2'}],removeRegistrationIds:[],reason:'Ready'};
 assert.equal(await send(cookie,'save_testing_roster',roster,{testId:'4',state:'testing_roster_saved',replayed:false},null),400);
 assert.equal(await send(cookie,'save_testing_roster',roster,{testId:'4',state:'testing_roster_saved',replayed:false}),200);
});
test('a testing receipt for another test or award, or claiming a message or invoice, is not shown as success',async()=>{
 const cookie=await login();
 const results={testId:'4',expectedVersion:3,results:[{registrationId:'8',result:'pass'}],reason:'Panel'};
 assert.equal(await send(cookie,'record_test_results',results,{testId:'4',state:'test_results_saved',replayed:false}),200);
 assert.equal(await send(cookie,'record_test_results',results,{testId:'5',state:'test_results_saved',replayed:false}),503);
 const promote={testId:'4',expectedVersion:3,registrationIds:['8'],reason:'Passed',reviewToken:'t'};
 const awarded={testId:'4',state:'promotions_awarded',promotions:[],messageSent:false,invoiceCreated:false,replayed:false};
 assert.equal(await send(cookie,'promote_test_results',promote,awarded),200);
 for(const bad of [{...awarded,messageSent:true},{...awarded,invoiceCreated:true},{...awarded,testId:'5'},{...awarded,state:'promotion_reversed'}])
  assert.equal(await send(cookie,'promote_test_results',promote,bad),503);
 const reverse={rankHistoryId:'12',expectedVersion:9,reason:'Wrong student'};
 assert.equal(await send(cookie,'reverse_promotion',reverse,{rankHistoryId:'12',memberId:'7',state:'promotion_reversed',replayed:false}),200);
 assert.equal(await send(cookie,'reverse_promotion',reverse,{rankHistoryId:'13',memberId:'7',state:'promotion_reversed',replayed:false}),503);
});
test('testing outcomes are described without implying messages or invoices',async()=>{
 const saved=await runHubAction(async()=>({state:'testing_roster_saved',testId:'4',count:2}),async()=>{},()=>{});
 assert.match(saved.text,/2 students\. No rank, invoice or message/);
 assert.deepEqual(saved.testing,{testId:'4'});
 const awarded=await runHubAction(async()=>({state:'promotions_awarded',promotions:[{}]}),async()=>{},()=>{});
 assert.match(awarded.text,/1 belt awards\. No message or invoice\./);
 const locked=await runHubAction(async()=>{throw Error('PROMOTED_RESULT_LOCKED');},async()=>{},()=>{});
 assert.equal(locked.kind,'error');
});
