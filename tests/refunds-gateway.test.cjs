const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute}=require(process.env.DOJANG_HUB_MODULE);
const {runHubAction}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='')=>new Request(env.DOJANG_PUBLIC_ORIGIN+'/api/hub',{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'owner'}}}));return r.headers.get('set-cookie').split(';')[0];};
const send=async(cookie,operation,payload,result,requestKey='refund-request-0001')=>(await hubRoute(req({operation,payload,requestKey},cookie),env,async()=>Response.json({result}))).status;
test('a refund receipt can only claim money was returned when staff recorded the refund payment',async()=>{
 const cookie=await login();
 for(const [op,payload] of [['billing_ledger',{memberId:'7'}],['refund_preview',{memberId:'7',invoiceId:'8'}]])assert.equal(await send(cookie,op,payload,{ok:true},null),200,op);
 const approve={refundId:'3',expectedVersion:1,reason:'Checked'};
 const approved={memberId:'7',refundId:'3',state:'refund_approved',creditNote:'RINV/1',moneyReturned:false,replayed:false};
 assert.equal(await send(cookie,'approve_refund',approve,approved),200);
 for(const bad of [{...approved,moneyReturned:true},{...approved,refundId:'4'},{...approved,state:'refund_payment_recorded'}])assert.equal(await send(cookie,'approve_refund',approve,bad),503);
 const paid={memberId:'7',refundId:'3',state:'refund_payment_recorded',payment:'PBNK/1',moneyReturned:true,replayed:false};
 assert.equal(await send(cookie,'record_refund_payment',approve,paid),200);
 assert.equal(await send(cookie,'record_refund_payment',approve,{...paid,moneyReturned:false}),503);
});
test('refund wording never implies the money moved before it did',async()=>{
 const approved=await runHubAction(async()=>({state:'refund_approved',creditNote:'RINV/1'}),async()=>{},()=>{});
 assert.match(approved.text,/Money has not been returned yet\./);
 const requested=await runHubAction(async()=>({state:'refund_requested'}),async()=>{},()=>{});
 assert.match(requested.text,/No credit note was posted and no money was returned\./);
});
