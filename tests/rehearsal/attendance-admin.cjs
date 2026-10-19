const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const fixture=JSON.parse(fs.readFileSync(process.env.DOJANG_FIXTURE_OUTPUT,'utf8'));
const origin='http://localhost:3000',checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
let stage='login';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  const call=async(op,payload,key=null)=>{const r=await context.request.post(origin+'/api/hub',{headers:{origin},data:{operation:op,payload,requestKey:key}});return {status:r.status(),value:await r.json()};};
  let commands=[],dropNext=false;
  await page.route('**/api/hub',async route=>{
   const data=route.request().postDataJSON();
   if(data.operation!=='mark_attendance')return route.continue();
   commands.push(data);const response=await route.fetch();
   if(dropNext){dropNext=false;assert.equal(response.status(),200);return route.abort('failed');}
   return route.fulfill({response});
  });
  await page.goto(origin+'/hub?view=attendance');
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);
  await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('heading',{name:'Record or correct attendance.'}).waitFor();
  const row=name=>page.getByRole('group',{name:`Attendance for ${name}`});
  const review=page.getByLabel('Review attendance change',{exact:true});
  const result=()=>page.getByLabel('Attendance result',{exact:true});
  const change=async(name,status,reason)=>{
   await row(name).getByLabel(`New status for ${name}`,{exact:true}).selectOption(status);
   await row(name).getByLabel(`Reason for ${name}`,{exact:true}).fill(reason);
   await row(name).getByRole('button',{name:`Review ${name}`}).click();
   await review.waitFor();
  };

  stage='manual attendance with lost response';
  await page.getByLabel('Class to review',{exact:true}).selectOption(fixture.attendanceSessionId);
  await row('Demo Student').getByText('Not recorded',{exact:false}).waitFor();
  await change('Demo Student','present','Paper sign-in sheet');
  await review.getByText('Demo Student: Not recorded → Present',{exact:true}).waitFor();
  await review.getByText(/checks the student’s membership and course eligibility/).waitFor();
  assert.equal(await review.getByRole('button',{name:'Confirm attendance in Odoo'}).isDisabled(),true);
  await review.getByRole('checkbox').check();
  dropNext=true;
  await review.getByRole('button',{name:'Confirm attendance in Odoo'}).click();
  await page.getByRole('button',{name:'Check attendance result'}).click();
  await result().getByText('Attendance saved in Odoo: pending → present.').waitFor();
  assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);
  assert.deepEqual(commands[0].payload,commands[1].payload);
  await row('Demo Student').getByText(/^Present · recorded/).waitFor();
  pass('manual attendance is reviewed, eligibility-checked by Odoo, and a lost response replays one native record');

  stage='late and reversal';
  await change('Recovery Student','late','Arrived after warm-up');
  await review.getByRole('checkbox').check();
  await review.getByRole('button',{name:'Confirm attendance in Odoo'}).click();
  await result().getByText('Attendance saved in Odoo: pending → late.').waitFor();
  await change('Demo Student','absent','Signed in by mistake');
  await review.getByText(/This reverses a recorded check-in/).waitFor();
  await review.getByRole('checkbox').check();
  await review.getByRole('button',{name:'Confirm attendance in Odoo'}).click();
  await result().getByText(/present → absent\. The original check-in record and receipt are kept; no class credit was refunded\./).waitFor();
  await row('Demo Student').getByText(/changed Present → Absent .* Signed in by mistake/).waitFor();
  await row('Demo Student').getByText(/changed Not recorded → Present .* Paper sign-in sheet/).waitFor();
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'attendance-review.png'),fullPage:true});
  pass('a manager reversal keeps the native record, shows the correction history and promises no credit refund');

  stage='stale review';
  await change('Recovery Student','excused','Doctor note');
  const sheet=(await call('attendance_sheet',{sessionId:fixture.attendanceSessionId})).value;
  const current=sheet.rows.find(r=>r.name==='Recovery Student');
  const elsewhere=await call('mark_attendance',{sessionId:fixture.attendanceSessionId,memberId:current.memberId,status:'present',
   expectedVersion:current.version,reason:'Second staff member corrected the sheet'},randomUUID());
  assert.equal(elsewhere.status,200);assert.equal(elsewhere.value.after,'present');
  await review.getByRole('checkbox').check();
  await review.getByRole('button',{name:'Confirm attendance in Odoo'}).click();
  await page.getByRole('alert',{name:'Attendance result'}).getByText('This record changed. Refresh and review it again.').waitFor();
  await row('Recovery Student').getByText(/^Present · recorded/).waitFor();
  pass('a review made stale by another staff change is rejected and the sheet reloads the current Odoo status');

  stage='Member360 readback';
  const demo=(await call('member_details',{memberId:fixture.memberId})).value;
  assert.ok(!demo.attendance.some(a=>a.title==='Attendance review class'));
  assert.ok(demo.attendance.some(a=>a.title==='Demo session'));
  const recovery=(await call('member_details',{memberId:fixture.offlineMemberId})).value;
  assert.ok(recovery.attendance.some(a=>a.title==='Attendance review class'));
  pass('Member360 attendance reads back the corrected native records and keeps the kiosk check-in');

  stage='mobile';
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'attendance-mobile.png'),fullPage:true});
  pass('attendance review fits a phone viewport');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'attendance-admin-browser-results.json'),JSON.stringify({mode:'real Odoo synthetic records',checks},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error('Attendance rehearsal failed at '+stage+': '+e.message);process.exitCode=1;});
