// Real Odoo records. Synthetic students only; no provider delivery or membership purchase.
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
  const call=async(op,payload,key=randomUUID())=>{const r=await context.request.post(origin+'/api/hub',{headers:{origin},data:{operation:op,payload,requestKey:key}});return {status:r.status(),value:await r.json()};};
  const review=()=>page.getByLabel('Review student intake',{exact:true});
  const problems=()=>page.getByLabel('Intake review problems',{exact:true});
  const result=()=>page.getByRole('status',{name:'Student intake result'});
  const household=()=>page.getByRole('region',{name:'family records'});
  const fillChild=async(name,birth,reference)=>{
   await page.getByLabel('Student type',{exact:true}).selectOption('child');
   await page.getByLabel('Student full name',{exact:true}).fill(name);
   await page.getByLabel('Student date of birth',{exact:true}).fill(birth);
   await page.getByLabel('Identity and guardian review reference',{exact:true}).fill(reference);
  };
  const confirm=async()=>{
   await review().waitFor();
   assert.equal(await review().getByRole('button',{name:'Confirm student in Odoo'}).isDisabled(),true);
   await review().getByRole('checkbox').check();
   await review().getByRole('button',{name:'Confirm student in Odoo'}).click();
  };
  let commands=[],dropNext=false;
  await page.route('**/api/hub',async route=>{
   const data=route.request().postDataJSON();
   if(data.operation!=='create_student')return route.continue();
   commands.push(data);const response=await route.fetch();
   if(dropNext){dropNext=false;assert.equal(response.status(),200);return route.abort('failed');}
   return route.fulfill({response});
  });
  await page.goto(origin+'/hub?view=intake');
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);
  await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('heading',{name:'A clear start for a new student.'}).waitFor();

  stage='missing field messages';
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  await page.getByRole('heading',{name:'Complete these fields'}).waitFor();
  assert.ok(await problems().getByText('Nothing has been created.',{exact:true}).count());
  for(const text of [/Student — Enter full name/,/Student — Enter a real birth date/,/Student — Enter at least one contact method/,/Enter identity and guardian review reference/])
   assert.ok(await problems().getByText(text).count(),String(text));
  assert.equal(commands.length,0);
  pass('missing name, birth date, contact and verification are each named; preview creates no profile');

  stage='adult review and lost response';
  await page.getByLabel('Student full name',{exact:true}).fill('Rehearsal Intake Adult');
  await page.getByLabel('Student date of birth',{exact:true}).fill('1995-01-02');
  await page.getByLabel('Student email',{exact:true}).fill('rehearsal-intake-adult@example.invalid');
  await page.getByLabel('Identity and guardian review reference',{exact:true}).fill('synthetic-staff-identity-check');
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  dropNext=true;await confirm();
  await page.getByRole('button',{name:'Check student creation result'}).click();
  await result().getByText(/Student profile created in Odoo/).waitFor();
  assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);
  assert.deepEqual(commands[0].payload,commands[1].payload);
  pass('explicit review and confirmation create a native adult; dropped response replays the same receipt');

  stage='adult Member360 readback';
  await result().getByRole('link',{name:'Open created student →'}).click();
  await household().getByText('Household: Not linked').waitFor();
  const manage=page.getByRole('region',{name:'Member management'});
  await manage.getByText('lead · Unassigned · 0 stripes · Born 1995-01-02',{exact:true}).waitFor();
  const recent=(await call('intake_context',{query:''})).value.recent;
  const adult=recent.find(r=>r.name==='Rehearsal Intake Adult');assert.ok(adult);
  assert.equal(new URL(page.url()).searchParams.get('memberId'),adult.memberId);
  const details=(await call('member_details',{memberId:adult.memberId})).value;
  assert.equal(details.member.state,'lead');assert.equal(details.member.email,'rehearsal-intake-adult@example.invalid');
  assert.equal(details.bookings.length,0);assert.equal(details.billing.subscriptions.length,0);
  const repeat=await call('create_student',commands[0].payload);
  assert.equal(repeat.status,409);assert.equal(repeat.value.error.code,'DUPLICATE_STUDENT_REVIEW_REQUIRED');
  pass('Member360 readback shows the saved birth date and lead-only state; a new key cannot duplicate the student');

  stage='reload persistence';
  await page.goto(origin+'/hub?view=intake');
  await page.getByText(`${adult.name} · ${adult.memberNumber}`,{exact:true}).waitFor();
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'intake-desktop.png'),fullPage:true});

  stage='child intake with lost response and reload';
  await fillChild('Rehearsal Intake Child','2018-01-02','synthetic-completed-guardian-check');
  await page.getByLabel('Guardian full name',{exact:true}).fill('Rehearsal Intake Parent');
  await page.getByLabel('Guardian email',{exact:true}).fill('rehearsal-intake-parent@example.invalid');
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  await review().getByText('New household',{exact:true}).waitFor();
  dropNext=true;await confirm();
  await page.getByRole('button',{name:'Check student creation result'}).waitFor();
  assert.equal(commands.length,3);
  // The browser forgets its pending key. Odoo's committed record is the reconciliation source.
  await page.reload();
  await page.getByRole('heading',{name:'A clear start for a new student.'}).waitFor();
  await fillChild('Rehearsal Intake Child','2018-01-02','synthetic-completed-guardian-check');
  await page.getByLabel('Guardian full name',{exact:true}).fill('Rehearsal Intake Parent');
  await page.getByLabel('Guardian email',{exact:true}).fill('rehearsal-intake-parent@example.invalid');
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  await page.getByRole('heading',{name:'Check existing records first'}).waitFor();
  assert.equal(await review().count(),0);
  assert.equal(commands.length,3);
  await problems().getByRole('link',{name:/^Open existing student Rehearsal Intake Child · /}).click();
  await household().getByText('Household: Family of Rehearsal Intake Parent').waitFor();
  await household().getByText('Rehearsal Intake Parent',{exact:true}).waitFor();
  await household().getByText('Primary guardian · Native household relationship',{exact:true}).waitFor();
  await household().getByText(/No verified guardian channel is linked/).waitFor();
  await page.getByRole('region',{name:'Member management'}).getByText('lead · Unassigned · 0 stripes · Born 2018-01-02',{exact:true}).waitFor();
  const child=(await call('intake_context',{query:''})).value.recent.find(r=>r.name==='Rehearsal Intake Child');assert.ok(child);
  assert.equal(new URL(page.url()).searchParams.get('memberId'),child.memberId);
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'intake-member360-family.png'),fullPage:true});
  pass('lost child response plus reload reconciles to the one committed profile; Member360 reads back its native household guardian');

  stage='guardian contact match';
  await page.goto(origin+'/hub?view=intake');
  await fillChild('Rehearsal Intake Sibling','2020-01-02','synthetic-sibling-authority-check');
  await page.getByLabel('Guardian full name',{exact:true}).fill('Rehearsal Parent Alternate Spelling');
  await page.getByLabel('Guardian email',{exact:true}).fill('REHEARSAL-INTAKE-PARENT@example.invalid');
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  await page.getByRole('heading',{name:'Check existing records first'}).waitFor();
  await problems().getByRole('button',{name:'Use Family of Rehearsal Intake Parent'}).click();
  assert.equal(await page.getByLabel('Guardian selection',{exact:true}).inputValue(),'existing');
  await page.getByRole('button',{name:'Review new student',exact:true}).click();
  await review().getByText('Family of Rehearsal Intake Parent',{exact:true}).waitFor();
  await confirm();
  await result().getByText(/Student profile created in Odoo/).waitFor();
  await result().getByRole('link',{name:'Open created student →'}).click();
  await household().getByText('Household: Family of Rehearsal Intake Parent').waitFor();
  await household().getByRole('link',{name:'Rehearsal Intake Child →'}).waitFor();
  await household().getByRole('link',{name:'Rehearsal Intake Sibling →'}).waitFor();
  const data=(await call('intake_context',{query:'Rehearsal Intake Parent'})).value;
  assert.equal(data.guardians.length,1);
  assert.equal(data.recent.filter(r=>r.name.startsWith('Rehearsal Intake ')).length,3);
  assert.equal(commands.length,4);
  pass('a matching guardian contact is linked only through the explicitly chosen existing household');

  stage='mobile';await page.setViewportSize({width:390,height:844});await page.goto(origin+'/hub?view=intake');
  await page.getByRole('heading',{name:'A clear start for a new student.'}).waitFor();
  await page.getByText(`${adult.name} · ${adult.memberNumber}`,{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'intake-mobile.png'),fullPage:true});
  pass('phone layout fits and recent native receipts survive reload');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'intake-browser-results.json'),JSON.stringify({mode:'real Odoo synthetic records',checks},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error('Intake rehearsal failed at '+stage+': '+e.message);process.exitCode=1;});
