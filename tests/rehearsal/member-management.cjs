// Synthetic browser fault checks. The real Odoo path is tested in hub.cjs.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const origin=process.env.DOJANG_FEEDBACK_TEST_ORIGIN||'http://localhost:3000';
const checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
const pick=async(scope,label,id)=>{await scope.getByLabel(label,{exact:true}).click();await scope.locator(`[role=option][data-value="${id}"]`).click();};
let stage='start';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  async function setup(mode='success'){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.setDefaultTimeout(10000);
   const commands=[],reads=[];
   const sessions=[{id:'10',title:'Original class',startsAt:new Date(Date.now()+3600000).toISOString(),future:true,version:7},{id:'20',title:'Replacement class',startsAt:new Date(Date.now()+7200000).toISOString(),future:true,version:8}];
   const data={principal:{name:'Synthetic Manager',role:mode==='guardian'?'guardian':'manager'},members:[{id:'5',name:'Maya'},{id:'6',name:'Theo'}],sessions,messages:[],deliveries:[],timeline:[],capabilities:{outbound:'not_configured',ai:'disabled',inbound:'test_fixture'}};
   const profile={member:{id:'6',name:'Theo',phone:'555-0106',email:'theo@example.invalid',version:10,partnerVersion:11,state:'active',rank:'White',stripes:0},canEdit:true,canEditContact:true,
    ranks:[{id:'r1',name:'Yellow',maxStripes:4}],rankHistory:[],
    bookings:[{id:'b1',sessionId:'10',title:'Original class',startsAt:sessions[0].startsAt,attendanceState:'pending',replaceable:true}],attendance:[],
    billing:{subscriptions:[{id:'s6',plan:'Theo plan',state:'active',nextInvoiceDate:null}],invoices:[{id:'i6',number:'INV-006',kind:'out_invoice',date:'2026-10-12',paymentState:'partial',total:100,remaining:20,currency:'USD',scope:'household'}]}};
   let acknowledged=false;
   await page.route('**/api/hub',async route=>{
    const body=route.request().postDataJSON();const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
    if(body.operation==='context')return json(data);
    if(body.operation==='member_details'){
     reads.push(body.payload.memberId);
     if(mode==='read-failure'&&acknowledged)return json({error:{code:'BACKEND_UNAVAILABLE'}},503);
     return json(mode==='wrong-identity'?{...profile,member:{...profile.member,id:'5',name:'Maya'}}:profile);
    }
    commands.push(body);
    if(mode==='uncertain'&&commands.length===1)return route.abort('connectionfailed');
    if(mode==='conflict')return json({error:{code:'VERSION_CONFLICT'}},409);
    acknowledged=true;
    if(body.operation==='update_member'){Object.assign(profile.member,body.payload.changes);profile.member.version++;profile.member.partnerVersion++;return json({memberId:'6',state:'updated'});}
    if(body.operation==='rank'){profile.member.rank='Yellow';profile.member.stripes=body.payload.stripes;profile.rankHistory=[{id:'rh1',date:'2026-10-12',rank:'Yellow',stripes:body.payload.stripes}];return json({memberId:'6',state:'awarded'});}
    if(body.operation==='change_class')return json({memberId:'6',enrollmentId:'book6',state:'registered'});
    return json({error:{code:'INVALID_COMMAND'}},400);
   });
   await page.goto(origin+'/hub?memberId=6&view=manage');
   const panel=page.getByRole('region',{name:'Member management',exact:true});
   const prepare=async()=>{await panel.getByLabel('Member phone',{exact:true}).fill('555-9999');await panel.getByRole('button',{name:'Review profile changes',exact:true}).click();};
   const confirm=()=>panel.getByRole('button',{name:'Confirm member action in Odoo',exact:true}).click();
   return {context,page,panel,commands,reads,profile,prepare,confirm};
  }
  stage='exact member edit and household billing';
  {
   const s=await setup();await s.prepare();assert.equal(s.commands.length,0);
   await s.panel.getByRole('group',{name:'Review member action',exact:true}).getByText(/Update Theo: phone/).waitFor();await s.confirm();
   await s.panel.getByRole('status',{name:'Member action result'}).getByText('Saved in Odoo.',{exact:true}).waitFor();
   await s.page.reload();assert.equal(await s.panel.getByLabel('Member phone',{exact:true}).inputValue(),'555-9999');
   assert.deepEqual(s.commands[0].payload,{memberId:'6',expectedVersion:10,expectedPartnerVersion:11,changes:{phone:'555-9999'}});
   assert.ok(s.reads.every(id=>id==='6'));
   await s.panel.getByText('Membership and billing',{exact:true}).click();await s.panel.getByText(/whole-invoice amounts, not this member/).waitFor();
   assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   pass('exact member contact edit requires review and survives reload; shared invoice totals are explicitly labeled');await s.context.close();
  }
  stage='same-key uncertain retry';
  {
   const s=await setup('uncertain');await s.prepare();await s.confirm();await s.panel.getByText(/Odoo has not confirmed/).waitFor();
   assert.equal(await s.panel.getByLabel('Member phone',{exact:true}).isDisabled(),true);
   await s.panel.getByRole('button',{name:'Check original member action',exact:true}).click();
   await s.panel.getByRole('status',{name:'Member action result'}).getByText('Saved in Odoo.',{exact:true}).waitFor();
   await s.page.waitForFunction(()=>document.querySelector('input[aria-label="Member phone"]')?.value==='555-9999');
   assert.equal(s.commands.length,2);assert.deepEqual(s.commands[0],s.commands[1]);
   pass('uncertain member update locks editing and retries the identical operation, payload and key');await s.context.close();
  }
  stage='conflict and post-write read failure';
  for(const mode of ['conflict','read-failure']){
   const s=await setup(mode);await s.prepare();await s.confirm();
   if(mode==='conflict')await s.panel.getByRole('alert',{name:'Member action result'}).getByText(/record changed/).waitFor();
   else {await s.panel.getByRole('status',{name:'Member action result'}).getByText('Saved in Odoo.',{exact:true}).waitFor();await s.panel.getByRole('alert').getByText(/No other member/).waitFor();assert.equal(await s.panel.getByLabel('Member phone',{exact:true}).count(),0);}
   assert.equal(s.commands.length,1);pass(`${mode}: no repeat write or substituted member details`);await s.context.close();
  }
  stage='identity and role rejection';
  for(const mode of ['wrong-identity','guardian']){
   const s=await setup(mode);await s.page.getByRole('alert').getByText(/No other member/).waitFor();
   assert.equal(await s.page.getByLabel('Member phone',{exact:true}).count(),0);assert.equal(s.commands.length,0);
   if(mode==='guardian')assert.equal(s.reads.length,0);
   pass(`${mode}: no cross-member fallback or unauthorized controls`);await s.context.close();
  }
  stage='rank award review and receipt';
  {
   const s=await setup();await s.panel.getByText('Rank and progress',{exact:true}).click();await pick(s.panel,'Award rank','r1');
   await s.panel.getByLabel('Stripes',{exact:true}).fill('2');await s.panel.getByLabel('Assessment reason',{exact:true}).fill('Synthetic instructor assessment');
   await s.panel.getByRole('button',{name:'Review rank award',exact:true}).click();assert.equal(s.commands.length,0);await s.confirm();
   await s.panel.getByText('active · Yellow · 2 stripes',{exact:true}).waitFor();
   assert.deepEqual(s.commands[0].payload,{memberId:'6',expectedVersion:10,rankId:'r1',stripes:2,reason:'Synthetic instructor assessment'});
   pass('rank award reviews the exact member, authorized rank, stripes and reason');await s.context.close();
  }
  stage='member-specific class replacement';
  {
   const s=await setup();await s.panel.getByText('Registrations and class changes',{exact:true}).click();await pick(s.panel,'Replacement class for member','20');
   await s.panel.getByRole('button',{name:'Review replacement of Original class',exact:true}).click();assert.equal(s.commands.length,0);await s.confirm();
   await s.panel.getByRole('status',{name:'Member action result'}).getByText(/Receipt: book6/).waitFor();
   assert.deepEqual(s.commands[0].payload,{memberId:'6',fromSessionId:'10',sessionId:'20',expectedVersion:8});
   pass('member class replacement preserves original and target identities without requiring a parent message');await s.context.close();
  }
  if(process.env.DOJANG_EVIDENCE_DIR)fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'member-management-browser-results.json'),JSON.stringify({mode:'synthetic browser API fault injection',checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error('Member management browser check failed at '+stage+': '+(error.code||error.name||'Error'));process.exitCode=1;});
