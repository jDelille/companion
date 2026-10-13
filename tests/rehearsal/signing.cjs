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
  const commands=[];let dropNext=false;
  await page.route('**/api/hub/photo',async route=>{
   const data=route.request().postDataJSON();commands.push(data);
   const response=await route.fetch();
   if(dropNext){dropNext=false;return route.abort('failed');}
   return route.fulfill({response});
  });
  await page.goto(origin+`/hub?memberId=${fixture.guardianChildId}&view=manage&section=waiver`);
  await page.getByLabel('Login',{exact:true}).fill(fixture.hubLogin);
  await page.getByLabel('Password',{exact:true}).fill(fixture.hubPassword);
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  stage='draw signature';
  const signer=page.getByLabel('Waiver signer',{exact:true});
  await signer.waitFor();
  assert.deepEqual(await signer.locator('option').allTextContents(),['Choose who is signing','Guardian Rehearsal Parent (guardian)']);
  await signer.selectOption(fixture.guardianId);
  assert.equal(await page.getByLabel('Name as signed',{exact:true}).inputValue(),'Guardian Rehearsal Parent');
  const pad=page.getByLabel('Signature pad',{exact:true});
  await pad.scrollIntoViewIfNeeded();
  const box=await pad.boundingBox();
  await page.mouse.move(box.x+30,box.y+box.height*0.7);await page.mouse.down();
  for(const [x,y] of [[0.2,0.3],[0.4,0.75],[0.6,0.25],[0.85,0.6]])await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:8});
  await page.mouse.up();
  await page.getByLabel('Signer read and agrees',{exact:true}).check();
  await page.getByRole('button',{name:'Review signature'}).click();
  const review=page.getByRole('group',{name:'Review member action'});
  await review.getByText(/signed by Guardian Rehearsal Parent \(household guardian\) and witnessed by you/).waitFor();
  stage='save with lost response';
  dropNext=true;await review.getByRole('button',{name:'Confirm member action in Odoo'}).click();
  await page.getByRole('button',{name:'Check original member action'}).click();
  await page.getByLabel('Member action result').getByText(/Waiver signed by Guardian Rehearsal Parent and stored in Odoo/).waitFor();
  assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);
  assert.ok(String(commands[0].payload.signature).startsWith('data:image/png;base64,'));
  await page.getByText(/Signed by Guardian Rehearsal Parent .* witnessed by Demo Hub Manager/).waitFor();
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'waiver-signed.png'),fullPage:true});
  pass('a household guardian signs the minor’s waiver in person; a lost response replays one native signature');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'signing-browser-results.json'),JSON.stringify({mode:'real Odoo synthetic records',checks},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(`Signing rehearsal failed at ${stage}: ${e.message}`);process.exitCode=1;});
