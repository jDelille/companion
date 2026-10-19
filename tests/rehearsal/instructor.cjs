// Real Odoo staff identity, PIN, native HR attendance and correction round trips.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const fixture=JSON.parse(fs.readFileSync(process.env.DOJANG_FIXTURE_OUTPUT,'utf8'));
const origin='http://localhost:3000',out=process.env.DOJANG_EVIDENCE_DIR;
const checks=[];let stage='sign in';
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},...(out?{recordVideo:{dir:path.join(out,'instructor-video'),size:{width:1280,height:900}}}:{})});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  await page.goto(origin+'/hub?view=instructor');
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const panel=page.getByRole('region',{name:'Instructor workspace',exact:true});
  await panel.getByText('Not currently clocked in',{exact:true}).waitFor();
  const call=async(operation,payload,requestKey=randomUUID())=>{const r=await context.request.post(origin+'/api/hub',{headers:{origin},data:{operation,payload,requestKey}});return {status:r.status(),value:await r.json()};};
  const before=(await call('instructor_context',{})).value;
  assert.equal(before.instructor.name,'Demo Instructor');
  stage='incorrect PIN';
  const bad=await call('instructor_clock',{direction:'in',currentShiftId:null,pin:'000000'});
  assert.equal(bad.status,403);assert.equal(bad.value.error.code,'PIN_INCORRECT');
  assert.equal((await call('instructor_context',{})).value.current,null);
  pass('incorrect PIN fails without creating a native shift');
  stage='review clock-in';
  await panel.getByLabel('Instructor PIN',{exact:true}).fill(fixture.instructorPin);
  await panel.getByRole('button',{name:'Review clock in',exact:true}).click();
  assert.equal((await call('instructor_context',{})).value.current,null);
  const writes=[];let loseResponse=true;
  await page.route('**/api/hub',async route=>{
   const body=route.request().postDataJSON();
   if(body.operation==='instructor_clock'){
    // Record only nonsecret command identity in test memory/output.
    writes.push({key:body.requestKey,direction:body.payload.direction,current:body.payload.currentShiftId});
    const response=await route.fetch();
    if(loseResponse){loseResponse=false;return route.abort('connectionfailed');}
    return route.fulfill({response});
   }
   return route.continue();
  });
  await panel.getByRole('button',{name:'Confirm instructor action in Odoo',exact:true}).click();
  await panel.getByText(/Odoo has not confirmed/).waitFor();
  assert.equal(await panel.getByLabel('Instructor PIN').isDisabled(),true);
  await panel.getByRole('button',{name:'Check original shift action',exact:true}).click();
  await panel.getByText('Clock-in confirmed in Odoo.',{exact:true}).waitFor();
  await panel.getByText(/Clocked in since/).waitFor();
  assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);
  const started=(await call('instructor_context',{})).value;
  assert.ok(started.current?.id);assert.equal(started.shifts.length,before.shifts.length+1);
  pass('review prevents early writes; lost committed response retries one original key and creates one shift');
  stage='refresh and clock-out';
  await page.reload();await panel.getByText(/Clocked in since/).waitFor();
  await panel.getByLabel('Instructor PIN',{exact:true}).fill(fixture.instructorPin);
  await panel.getByRole('button',{name:'Review clock out',exact:true}).click();
  await panel.getByRole('button',{name:'Confirm instructor action in Odoo',exact:true}).click();
  await panel.getByText('Clock-out confirmed in Odoo.',{exact:true}).waitFor();
  await panel.getByText('Not currently clocked in',{exact:true}).waitFor();
  assert.equal((await call('instructor_context',{})).value.current,null);
  pass('clock-in persists across reload and clock-out closes the exact native shift');
  stage='manager correction';
  const prior=panel.getByRole('article',{name:`Shift ${fixture.priorShiftId}`,exact:true});
  await prior.getByText('Correct this timesheet',{exact:true}).click();
  const input=await prior.getByLabel('Corrected clock-in',{exact:true}).inputValue();
  const changed=new Date(input);changed.setMinutes(changed.getMinutes()-30);
  const formatted=new Date(changed.getTime()-changed.getTimezoneOffset()*60000).toISOString().slice(0,16);
  await prior.getByLabel('Corrected clock-in',{exact:true}).fill(formatted);
  await prior.getByLabel('Correction reason',{exact:true}).fill('Synthetic client walkthrough: reviewed missed clock-out');
  await prior.getByRole('button',{name:'Review timesheet correction',exact:true}).click();
  await panel.getByRole('group',{name:'Review instructor action',exact:true}).getByText(/Correct Demo Instructor/).waitFor();
  await panel.getByRole('button',{name:'Confirm instructor action in Odoo',exact:true}).click();
  await panel.getByText(/Timesheet correction confirmed in Odoo/).waitFor();
  await page.reload();
  const after=(await call('instructor_context',{})).value;
  const saved=after.shifts.find(s=>s.id===fixture.priorShiftId);
  assert.equal(saved.needsReview,false);assert.ok(saved.hours>2.4&&saved.hours<2.6);
  pass('manager-reviewed correction persists and clears automatic-close review without approving payroll');
  stage='responsive screenshot';
  await panel.getByRole('heading',{name:'Team timesheets',exact:true}).waitFor();
  if(out)await page.screenshot({path:path.join(out,'instructor-connected-desktop.png'),fullPage:true});
  for(const width of [390,768,1920]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  if(out)await page.screenshot({path:path.join(out,'instructor-connected-wide.png'),fullPage:true});
  pass('connected instructor workspace fits phone, tablet, desktop and wide layouts');
  stage='operations reports and printable roster';
  await page.setViewportSize({width:1280,height:900});
  await page.goto(origin+'/hub?view=operations');
  const operations=page.getByRole('region',{name:'Operations reports and rosters',exact:true});
  const from=new Date(Date.now()-86400000).toISOString().slice(0,10),to=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
  await operations.getByLabel('From date',{exact:true}).fill(from);
  await operations.getByLabel('Through date',{exact:true}).fill(to);
  await operations.getByRole('button',{name:'Load operations report',exact:true}).click();
  await operations.getByText('2 attended records',{exact:true}).waitFor();
  const nativeReport=await call('operations_report',{fromDate:from,toDate:to});
  assert.equal(nativeReport.status,200);assert.equal(nativeReport.value.attendance.attended,2);
  await operations.getByLabel('Roster class',{exact:true}).click();
  await operations.locator(`[role=option][data-value="${fixture.sessionId}"]`).click();
  const printed=operations.getByRole('article',{name:'Printable class roster',exact:true});
  await printed.waitFor();
  const nativeRoster=(await call('session_roster',{sessionId:fixture.sessionId})).value;
  assert.ok(nativeRoster.members.some(m=>m.id===fixture.memberId&&['present','late'].includes(m.attendance)));
  assert.equal(await printed.locator('tbody tr').count(),nativeRoster.members.length);
  if(out){
   await page.screenshot({path:path.join(out,'operations-connected-desktop.png'),fullPage:true});
   await page.pdf({path:path.join(out,'native-class-roster.pdf'),format:'A4',printBackground:true});
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor),'rgb(255, 255, 255)');
  assert.equal(await page.getByRole('navigation',{name:'Staff navigation',exact:true}).isVisible(),false);
  assert.equal(await printed.isVisible(),true);
  await page.emulateMedia({media:'screen'});
  for(const width of [390,768,1920]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
  await page.route('**/api/hub',route=>route.request().postDataJSON().operation==='operations_report'?route.abort('connectionfailed'):route.continue());
  await operations.getByRole('button',{name:'Load operations report',exact:true}).click();
  await operations.getByRole('alert').waitFor();
  assert.equal(await operations.locator('[aria-label="Verified operations report"]').count(),0);
  await page.unroute('**/api/hub');
  await operations.getByRole('button',{name:'Load operations report',exact:true}).click();
  await operations.getByText('2 attended records',{exact:true}).waitFor();
  pass('native attendance/workload/belt/family reports and printable roster load scoped Odoo data, fit all viewport sizes and show no stale report on network failure');
  stage='public-mode privacy transition';
  // Pairing grants are test credentials only and never appear in the recording.
  for(const role of ['staff','kiosk']){
   const paired=await context.request.post(origin+'/api/integration/pair',{headers:{origin},form:{role,pairKey:process.env[role==='staff'?'DOJANG_STAFF_PAIR_KEY':'DOJANG_KIOSK_PAIR_KEY']},maxRedirects:0});
   assert.equal(paired.status(),303);
  }
  const otherTab=await context.newPage();
  await otherTab.goto(origin+'/hub?view=instructor');
  await otherTab.getByRole('region',{name:'Instructor workspace',exact:true}).waitFor();
  await page.route('**/api/integration/public-mode',route=>route.abort('connectionfailed'));
  await page.goto(origin+'/kiosk');
  await page.getByRole('heading',{name:'Kiosk privacy reset not confirmed',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/^Check In/i}).count(),0);
  await page.unroute('**/api/integration/public-mode');
  await page.getByRole('button',{name:'Retry privacy reset',exact:true}).click();
  await page.getByRole('button',{name:/^Check In/i}).waitFor();
  await otherTab.waitForURL('**/kiosk');
  assert.equal((await context.request.get(origin+'/api/v2/members')).status(),403);
  assert.equal((await call('instructor_context',{})).status,401);
  assert.equal((await context.request.get(origin+'/api/v2/sessions')).status(),200);
  await page.goBack();
  await page.getByLabel('Login',{exact:true}).waitFor();
  assert.equal(await page.getByRole('region',{name:'Instructor workspace',exact:true}).count(),0);
  await otherTab.close();
  pass('failed privacy reset blocks public use; retry removes both staff credentials, clears other tabs and prevents Back restoring staff context');
  await context.close();
  if(out)await page.video().saveAs(path.join(out,'walkthrough-instructor.webm'));
  if(out)fs.writeFileSync(path.join(out,'instructor-browser-results.json'),JSON.stringify({mode:'real Odoo native HR attendance with one lost response',checks},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error('Instructor rehearsal failed at '+stage+': '+(error.code||error.name||'Error'));process.exitCode=1;});
