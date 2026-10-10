// Browser-only fault injection with synthetic API fixtures; not a provider/Odoo proof.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const origin=process.env.DOJANG_FEEDBACK_TEST_ORIGIN||'http://localhost:3000';
const evidenceDir=process.env.DOJANG_EVIDENCE_DIR;
const checks=[];
let stage='start';
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
function fixture(future=false){
 const now=Date.now();
 const message={id:'m1',text:'Synthetic parent report for booking feedback. '.repeat(25),state:'resolved',summary:'Synthetic reviewed summary.',reply:'Synthetic draft reply.',mode:'Template test fixture',revision:1,channel:'sms',guardianName:'Demo Guardian',contactRef:'42',memberId:'5',sessionId:'10'};
 return {principal:{name:'Demo Manager',role:'manager'},members:[{id:'5',name:'Demo Student'}],
  sessions:[{id:'10',title:'Original class',startsAt:new Date(now+(future?60000:-60000)).toISOString(),future,version:1},{id:'20',title:'Makeup class',startsAt:new Date(now+7200000).toISOString(),future:true,version:1}],
  messages:[message,{...message,id:'m2',text:'A second synthetic report.'}],deliveries:[],timeline:[],capabilities:{outbound:'not_configured',inbound:'test_fixture',ai:'disabled'}};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  async function setup({mode='success',future=false}={}){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   page.setDefaultTimeout(10000);
   if(future)await page.clock.install();
   const data=fixture(future),commands=[];
   let acknowledged=false;
   await page.route('**/api/hub',async route=>{
    const body=route.request().postDataJSON();
    const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
    if(body.operation==='context'){
     if(mode==='refresh-failure'&&acknowledged)return json({error:{code:'BACKEND_UNAVAILABLE_RETRY_SAME_ACTION'}},503);
     return json(data);
    }
    if(!['book','change_class'].includes(body.operation))return json({error:{code:'INVALID_COMMAND'}},400);
    commands.push(body);
    if(mode==='rejection')return json({error:{code:'BUSINESS_RULE_REVIEW_REQUIRED'}},422);
    if(mode==='stale-original')return json({error:{code:'ENROLLMENT_REVIEW_REQUIRED'}},409);
    if(mode==='uncertain'&&commands.length===1)return route.abort('connectionfailed');
    acknowledged=true;
    data.timeline=[{id:'audit1',memberId:'5',sessionId:'20',action:body.operation,actor:'Demo Manager',at:new Date().toISOString(),
     ...(mode==='legacy-backend'?{}:{booking:{enrollmentId:'72',classTitle:'Makeup class',startsAt:data.sessions[1].startsAt,state:'registered',attendanceState:'pending'}})}];
    if(mode==='revision-change')data.messages[0].revision++;
    return json({enrollmentId:'72',replayed:commands.length>1});
   });
   await page.goto(origin+'/hub');
   const card=page.locator('article').filter({has:page.getByText('Synthetic reviewed summary.',{exact:true})}).first();
   await card.getByText('Book or change a class',{exact:true}).click();
   const result=card.getByRole('status',{name:'Booking result for message m1',exact:true});
   const choose=async()=>{await card.getByLabel('Target class',{exact:true}).selectOption('20');await card.getByRole('button',{name:'Review class change',exact:true}).click();};
   const confirm=()=>card.getByRole('button',{name:'Confirm booking in Odoo',exact:true}).click();
   return {context,page,card,result,commands,choose,confirm,data};
  }
  stage='started original and inline success';
  {
   const s=await setup();
   const replacement=s.card.getByLabel('Booking action',{exact:true}).locator('option[value="change_class"]');
   assert.equal(await replacement.evaluate(el=>el.disabled),true);
   await s.card.getByText(/The original class has already started/).waitFor();
   await s.choose();await s.confirm();
   await s.result.getByText('Registration saved in Odoo. Receipt: 72.',{exact:true}).waitFor();
   assert.equal(await s.card.getByRole('button',{name:'Booking saved',exact:true}).isDisabled(),true);
   assert.equal(s.commands.length,1);
   assert.equal(await s.page.getByRole('status',{name:'Booking result for message m2',exact:true}).count(),0);
   const box=await s.result.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=844);
   assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(evidenceDir){await s.page.screenshot({path:path.join(evidenceDir,'hub-booking-feedback-mobile.png'),fullPage:true});await s.page.setViewportSize({width:1280,height:900});await s.page.screenshot({path:path.join(evidenceDir,'hub-booking-feedback-desktop.png'),fullPage:true});}
   pass('started original is disabled; successful receipt is local, visible and prevents repeat submission');await s.context.close();
  }
  stage='inline rejection';
  {
   const s=await setup({mode:'rejection'});await s.choose();await s.confirm();
   await s.card.getByRole('alert',{name:'Booking result for message m1',exact:true}).getByText(/Odoo could not approve/).waitFor();
   assert.equal(await s.card.getByRole('button',{name:'Confirm booking in Odoo',exact:true}).isEnabled(),true);
   pass('eligibility failure appears beside the booking controls');await s.context.close();
  }
  stage='successful write then failed refresh';
  {
   const s=await setup({mode:'refresh-failure'});await s.choose();await s.confirm();
   await s.result.getByText(/Saved successfully, but the latest screen data/).waitFor();
   await s.result.getByText(/Receipt: 72/).waitFor();
   assert.equal(await s.card.getByRole('button',{name:'Booking saved',exact:true}).isDisabled(),true);
   assert.equal(s.commands.length,1);
   pass('refresh failure preserves the acknowledged receipt and does not offer another submit');await s.context.close();
  }
  stage='uncertain write and original key replay';
  {
   const s=await setup({mode:'uncertain'});await s.choose();await s.confirm();
   await s.result.getByText(/Odoo has not confirmed/).waitFor();
   assert.equal(await s.card.getByLabel('Target class',{exact:true}).isDisabled(),true);
   await s.result.getByRole('button',{name:'Check booking result',exact:true}).click();
   await s.result.getByText(/Receipt: 72/).waitFor();
   assert.equal(s.commands.length,2);assert.deepEqual(s.commands[0],s.commands[1]);
   pass('lost response remains unconfirmed and retry reuses the exact original command/key');await s.context.close();
  }
  stage='future original and time boundary';
  {
   const s=await setup({future:true});
   assert.equal(await s.card.getByLabel('Booking action',{exact:true}).locator('option[value="change_class"]').evaluate(el=>el.disabled),false);
   await s.card.getByLabel('Booking action',{exact:true}).selectOption('change_class');await s.choose();
   await s.page.clock.fastForward(120000);
   await s.card.getByText(/The original class has already started/).waitFor();
   assert.equal(await s.card.getByRole('button',{name:'Confirm booking in Odoo',exact:true}).isDisabled(),true);
   assert.equal(s.commands.length,0);
   pass('replacement becomes unavailable if the original class starts while review is open');await s.context.close();
  }
  stage='server replacement rejection';
  {
   const s=await setup({future:true,mode:'stale-original'});
   await s.card.getByLabel('Booking action',{exact:true}).selectOption('change_class');await s.choose();await s.confirm();
   await s.card.getByRole('alert',{name:'Booking result for message m1',exact:true}).getByText(/original registration cannot be replaced/).waitFor();
   assert.equal(s.commands[0].operation,'change_class');assert.equal(s.commands[0].payload.fromSessionId,'10');
   pass('server-side enrollment rejection has a plain-language inline explanation');await s.context.close();
  }
  stage='message refresh remount';
  {
   const s=await setup({mode:'revision-change'});await s.choose();await s.confirm();
   await s.result.getByText(/Receipt: 72/).waitFor();
   await s.page.getByRole('button',{name:'Refresh',exact:true}).click();
   await s.result.getByText(/Receipt: 72/).waitFor();
   pass('receipt survives message revision remount and a manual context refresh');await s.context.close();
  }
  stage='hard reload and fresh page receipt';
  {
   const s=await setup();await s.choose();await s.confirm();
   await s.result.getByText(/Receipt: 72/).waitFor();
   await s.page.reload();
   const saved=s.page.getByRole('group',{name:'Saved booking receipt 72',exact:true});
   await saved.getByText('Odoo registration receipt: 72',{exact:true}).waitFor();
   await saved.getByText(/Makeup class/).waitFor();
   await saved.getByText('Current registration: registered. Attendance: pending.',{exact:true}).waitFor();
   assert.equal(s.commands.length,1);
   assert.equal(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(evidenceDir)await s.page.screenshot({path:path.join(evidenceDir,'hub-persisted-receipt-mobile.png'),fullPage:true});
   await s.page.goto(origin+'/kiosk');await s.page.goto(origin+'/hub');
   await saved.getByText('Odoo registration receipt: 72',{exact:true}).waitFor();
   assert.equal(s.commands.length,1);
   pass('saved receipt survives hard reload and a fresh page without another booking request');
   s.data.timeline[0].booking.state='cancelled';s.data.sessions=[];
   await s.page.reload();
   await saved.getByText('Current registration: cancelled. Attendance: pending.',{exact:true}).waitFor();
   pass('historical receipt shows current cancellation and does not depend on the future class list');await s.context.close();
  }
  stage='older backend response';
  {
   const s=await setup({mode:'legacy-backend'});await s.choose();await s.confirm();
   await s.result.getByText(/Receipt: 72/).waitFor();await s.page.reload();
   await s.page.getByText('Receipt details unavailable. Check the registration in Odoo before booking again.',{exact:true}).waitFor();
   assert.equal(await s.page.getByRole('group',{name:'Saved booking receipt 72',exact:true}).count(),0);
   assert.equal(s.commands.length,1);
   pass('older backend is handled without inventing a receipt or resubmitting');await s.context.close();
  }
  if(evidenceDir)fs.writeFileSync(path.join(evidenceDir,'hub-feedback-results.json'),JSON.stringify({mode:'synthetic browser fault injection only; real Odoo flow tested separately',checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error('Synthetic booking feedback check failed: '+stage+'; '+(error.stack||error));process.exitCode=1;});
