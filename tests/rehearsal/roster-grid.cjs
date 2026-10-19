const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const origin='http://localhost:3000',checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
let stage='pair kiosk';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(origin+'/integration/pair');
  await page.getByLabel('Access',{exact:true}).click();await page.locator('[role=option][data-value="kiosk"]').click();
  await page.locator('input[name=pairKey]').fill(process.env.DOJANG_KIOSK_PAIR_KEY);
  await page.getByRole('button',{name:'Connect test device'}).click();
  await page.waitForURL('**/kiosk');
  stage='grid';
  await page.getByRole('button',{name:/^Check In/i}).click();
  await page.getByRole('button',{name:/Demo session/}).click();
  await page.getByRole('heading',{name:'Tap your name'}).waitFor();
  const grid=page.getByRole('list',{name:'Students in this class'});
  await grid.getByRole('button',{name:/Followup S\./}).waitFor();
  assert.ok(await grid.getByRole('listitem').count()>=3);
  await page.getByRole('textbox').fill('Rec');
  assert.equal(await grid.getByRole('listitem').count(),1);
  await page.getByRole('textbox').fill('');
  await page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'kiosk-roster-grid.png'),fullPage:true});
  pass('the kiosk shows every booked student as a tappable name, with an optional filter');
  stage='check in from the grid';
  await grid.getByRole('button',{name:/Followup S\./}).click();
  await page.getByRole('button',{name:/Confirm check-in/}).click();
  await page.getByText(/You're (already )?checked in/).first().waitFor();
  pass('tapping a name goes through the normal confirm and check-in');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'roster-grid-browser-results.json'),JSON.stringify({checks},null,2));
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(`Roster grid rehearsal failed at ${stage}: ${e.message}`);process.exitCode=1;});
