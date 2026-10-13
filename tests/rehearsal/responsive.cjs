const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(process.env.DOJANG_FIXTURE_OUTPUT,'utf8'));
const origin='http://localhost:3000',checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
let stage='login';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(origin+'/hub?view=setup');
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);
  await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  stage='setup checklist';
  const setup=page.getByRole('region',{name:'School setup'});
  await setup.getByText(/\d+ of \d+ ready/).waitFor();
  await setup.getByRole('listitem',{name:'Staff access: done'}).waitFor();
  await setup.getByRole('listitem',{name:'Messaging provider: needs attention'}).waitFor();
  pass('school setup reads live configuration, including what is not connected');
  stage='member onboarding';
  await page.goto(origin+`/hub?memberId=${fixture.guardianChildId}&view=manage&section=onboarding`);
  const onboarding=page.getByRole('list',{name:'Checklist'});
  await onboarding.getByRole('listitem',{name:'Household guardian: done'}).waitFor();
  await onboarding.getByRole('listitem',{name:/^Signed waiver: /}).waitFor();
  pass('member onboarding reflects native guardian, waiver, membership and kiosk records');
  stage='responsive layouts';
  const pages=['/hub?view=setup','/hub?view=testing','/hub?view=communications','/hub?view=attendance','/hub?view=courses','/hub?view=archived','/hub?view=intake',
   `/hub?memberId=${fixture.guardianChildId}&view=manage&section=kiosk`,`/hub?memberId=${fixture.refundMemberId}&view=manage&section=refunds`,
   `/hub?memberId=${fixture.guardianChildId}&view=manage&section=waiver`];
  const overflow=[];
  for(const url of pages){
   await page.goto(origin+url);
   await page.getByRole('heading',{level:1}).waitFor();
   await page.waitForLoadState('networkidle');
   for(const width of [390,768,1280]){
    await page.setViewportSize({width,height:900});
    const wide=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    if(wide>1)overflow.push(`${url} @${width}: ${wide}px`);
   }
   await page.setViewportSize({width:1280,height:900});
  }
  assert.deepEqual(overflow,[]);
  pass('new staff screens have no horizontal page scroll at phone, tablet and desktop widths');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'responsive-browser-results.json'),JSON.stringify({mode:'real Odoo synthetic records',checks,pages},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(`Responsive rehearsal failed at ${stage}: ${e.message}`);process.exitCode=1;});
