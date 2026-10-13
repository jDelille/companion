const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(process.env.DOJANG_FIXTURE_OUTPUT,'utf8'));
const phase=process.argv[2];
const origin='http://localhost:3000',checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
let stage='login';
if(!['reserve','complete'].includes(phase)){console.error('Use: trial.cjs reserve|complete');process.exit(2);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  const call=async(op,payload)=>{const r=await context.request.post(origin+'/api/hub',{headers:{origin},data:{operation:op,payload,requestKey:null}});return {status:r.status(),value:await r.json()};};
  let commands=[],dropNext=false;
  await page.route('**/api/hub',async route=>{
   const data=route.request().postDataJSON();
   if(!['reserve_trial','cancel_trial','record_trial_outcome','convert_trial'].includes(data.operation))return route.continue();
   commands.push(data);const response=await route.fetch();
   if(dropNext){dropNext=false;assert.equal(response.status(),200);return route.abort('failed');}
   return route.fulfill({response});
  });
  await page.goto(origin+`/hub?view=crm&leadId=${fixture.trialLeadId}`);
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);
  await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const trial=page.getByRole('region',{name:'Trial',exact:true});
  const review=trial.getByLabel('Review trial action',{exact:true});
  const result=()=>trial.getByLabel('Trial result',{exact:true});
  const confirm=async()=>{await review.getByRole('checkbox').check();await review.getByRole('button',{name:'Confirm trial action in Odoo'}).click();};
  await trial.waitFor();
  if(phase==='reserve'){
   stage='reserve with lost response';
   const reserveOnce=async(reason)=>{
    await trial.getByLabel('Find trial student',{exact:true}).fill('Trial Rehearsal');
    await trial.getByRole('button',{name:'Search students'}).click();
    await trial.getByLabel('Trial student',{exact:true}).locator(`option[value="${fixture.trialMemberId}"]`).waitFor({state:'attached'});
    await trial.getByLabel('Trial student',{exact:true}).selectOption(fixture.trialMemberId);
    await trial.getByLabel('Trial class',{exact:true}).selectOption(fixture.trialSessionId);
    await trial.getByLabel('Reason for this trial',{exact:true}).fill(reason);
    await trial.getByRole('button',{name:'Review trial reservation'}).click();
    await review.getByText(/Does not change the CRM stage, create a membership or send a message\./).waitFor();
    await review.getByText(/stage automations .* are not triggered|No stage automation is triggered/).waitFor();
   };
   await reserveOnce('Parent asked for a first class');
   dropNext=true;await confirm();
   await trial.getByRole('button',{name:'Check trial result'}).click();
   await result().getByText(/Trial reserved in Odoo\. The class registration is saved; the CRM stage was not changed and no message was sent\./).waitFor();
   assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);assert.deepEqual(commands[0].payload,commands[1].payload);
   await trial.getByText(/Trial Rehearsal Student · Trial class .* reserved/).waitFor();
   pass('trial reservation is reviewed with its side effects and a lost response replays one native registration');
   stage='cancel and reserve again';
   await trial.getByLabel('Reason for cancelling the trial',{exact:true}).fill('Family asked to keep the slot open');
   await trial.getByRole('button',{name:'Review trial cancellation'}).click();
   await confirm();
   await result().getByText(/Trial cancelled in Odoo/).waitFor();
   const lead=(await call('lead_details',{leadId:fixture.trialLeadId})).value;
   assert.equal(lead.trial,null);
   await reserveOnce('Rebooked after family confirmed');
   await confirm();
   await result().getByText(/Trial reserved in Odoo/).waitFor();
   const details=(await call('member_details',{memberId:fixture.trialMemberId})).value;
   assert.equal(details.member.state,'trial');
   assert.ok(details.bookings.some(b=>b.sessionId===fixture.trialSessionId));
   await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'trial-reserved.png'),fullPage:true});
   pass('cancellation returns the student to lead status; the rebooked trial reads back as a native class registration');
  } else {
   stage='trial attended';
   await trial.getByLabel('Trial outcome note',{exact:true}).fill('Joined the whole class');
   await trial.getByRole('button',{name:'Review attended'}).click();
   await review.getByText(/Does not change the CRM stage or send an offer\./).waitFor();
   await confirm();
   await result().getByText(/Trial attendance saved in Odoo/).waitFor();
   const details=(await call('member_details',{memberId:fixture.trialMemberId})).value;
   assert.ok(details.attendance.some(a=>a.sessionId===fixture.trialSessionId));
   pass('trial attendance is a native present record without a stage change or offer');
   stage='conversion preview';
   await trial.getByLabel('Membership plan',{exact:true}).selectOption(fixture.planId);
   await trial.getByRole('button',{name:'Preview conversion'}).click();
   const preview=trial.getByLabel('Conversion preview',{exact:true});
   await preview.getByText('Collect a payment or store a payment method').waitFor();
   await preview.getByText('Invite a portal account').waitFor();
   await preview.getByText(/billed to Trial Rehearsal Student/).waitFor();
   await preview.getByLabel('Reason for converting',{exact:true}).fill('Parent chose the plan after the trial');
   await preview.getByRole('button',{name:'Review conversion'}).click();
   dropNext=true;await confirm();
   await trial.getByRole('button',{name:'Check trial result'}).click();
   await result().getByText(/Converted in Odoo: .* membership started today\. No payment, portal invitation or message\./).waitFor();
   const converts=commands.filter(c=>c.operation==='convert_trial');
   assert.equal(converts.length,2);assert.equal(converts[0].requestKey,converts[1].requestKey);
   const member=(await call('member_details',{memberId:fixture.trialMemberId})).value;
   assert.equal(member.member.state,'active');
   assert.ok(member.billing.subscriptions.some(s=>s.state==='active'));
   const lead=(await call('lead_details',{leadId:fixture.trialLeadId})).value;
   assert.equal(lead.memberId,fixture.trialMemberId);
   await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'trial-converted.png'),fullPage:true});
   pass('conversion is previewed, replays one membership after a lost response and reads back on the member and lead');
  }
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,`trial-${phase}-browser-results.json`),JSON.stringify({mode:'real Odoo synthetic records',checks},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(`Trial ${phase} rehearsal failed at ${stage}: ${e.message}`);process.exitCode=1;});
