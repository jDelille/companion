const {test}=require('node:test');
const assert=require('node:assert/strict');
const {hubRoute,hubPhotoRoute}=require(process.env.DOJANG_HUB_MODULE);
const env={DOJANG_HUB_ENABLED:'true',NEXT_PUBLIC_DEMO_MODE:'false',DOJANG_PUBLIC_ORIGIN:'https://companion.example.test',DOJANG_ODOO_URL:'https://odoo.example.test',DOJANG_ODOO_DATABASE:'dojang_test',DOJANG_HUB_SITE_ID:'5',DOJANG_COOKIE_SECRET:'s'.repeat(48)};
const req=(body,cookie='',url='/api/hub')=>new Request(env.DOJANG_PUBLIC_ORIGIN+url,{method:'POST',headers:{origin:env.DOJANG_PUBLIC_ORIGIN,cookie,'content-type':'application/json'},body:JSON.stringify(body)});
const login=async()=>{const r=await hubRoute(req({operation:'login',login:'synthetic@example.invalid',password:'synthetic-password'}),env,async url=>url.endsWith('/authenticate')?Response.json({result:{uid:15}},{headers:{'set-cookie':`session_id=${'a'.repeat(64)}; Path=/; HttpOnly; Secure`}}):Response.json({result:{principal:{name:'Staff',role:'manager'}}}));return r.headers.get('set-cookie').split(';')[0];};
test('waiver signatures travel only on the large-payload route and the receipt never echoes the image',async()=>{
 const cookie=await login();
 const payload={memberId:'7',expectedVersion:1,signerPartnerId:'9',signedByName:'Parent',contentVersion:'c'.repeat(64),agreed:true,signature:'data:image/png;base64,'+'A'.repeat(30000)};
 const body={operation:'sign_waiver',payload,requestKey:'sign-request-000001'};
 assert.equal((await hubRoute(req(body,cookie),env,async()=>Response.json({result:{}}))).status,400);
 let sent;
 const saved={memberId:'7',signatureId:'2',state:'waiver_signed',signedBy:'Parent',pdfStored:true,messageSent:false,replayed:false};
 const ok=await hubPhotoRoute(req(body,cookie,'/api/hub/photo'),env,async(url,init)=>{sent=url;return Response.json({result:saved});});
 assert.equal(ok.status,200);assert.ok(String(sent).endsWith('/companion/hub/photo'));
 for(const bad of [{...saved,memberId:'8'},{...saved,messageSent:true},{...saved,echo:payload.signature}])
  assert.equal((await hubPhotoRoute(req(body,cookie,'/api/hub/photo'),env,async()=>Response.json({result:bad}))).status,503);
});
