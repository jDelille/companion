const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fixture=JSON.parse(fs.readFileSync(process.env.DOJANG_FIXTURE_OUTPUT,'utf8'));
const origin='http://localhost:3000',checks=[];
const pass=name=>{checks.push({name,result:'passed'});console.log('PASS '+name);};
const INVOICE=fixture.refundInvoice;
let stage='manager requests refund';
const open=async(browser,login,password)=>{
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
 page.setDefaultTimeout(20000);
 await page.goto(origin+`/hub?memberId=${fixture.refundMemberId}&view=manage&section=refunds`);
 await page.getByLabel('Login',{exact:true}).fill(login);
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 return {context,page,invoice:page.getByRole('group',{name:`Settlement for ${INVOICE}`}),review:page.getByRole('group',{name:'Review member action'}),
  result:()=>page.getByLabel('Member action result')};
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  let s=await open(browser,fixture.hubLogin,fixture.hubPassword);
  const commands=[];let dropNext=false;
  await s.page.route('**/api/hub',async route=>{
   const data=route.request().postDataJSON();
   if(data.operation!=='request_refund')return route.continue();
   commands.push(data);const response=await route.fetch();
   if(dropNext){dropNext=false;return route.abort('failed');}
   return route.fulfill({response});
  });
  await s.invoice.getByText(/recorded by staff/).waitFor();
  await s.invoice.getByLabel(`Reason for refunding ${INVOICE}`,{exact:true}).fill('Family moved away');
  await s.invoice.getByRole('button',{name:'Review refund request'}).click();
  await s.review.getByText(/Request a full refund of .* Desk payments: return the money, then record the refund payment here\./).waitFor();
  dropNext=true;await s.review.getByRole('button',{name:'Confirm member action in Odoo'}).click();
  await s.page.getByRole('button',{name:'Check original member action'}).click();
  await s.result().getByText(/Refund request saved for owner approval\. No credit note was posted and no money was returned\./).waitFor();
  assert.equal(commands.length,2);assert.equal(commands[0].requestKey,commands[1].requestKey);
  await s.invoice.getByText(/Awaiting owner approval · requested by Demo Hub Manager/).waitFor();
  assert.equal(await s.invoice.getByRole('button',{name:'Review refund approval'}).count(),0);
  pass('a manager requests a refund once despite a lost response and cannot approve it');
  await s.context.close();
  stage='owner approves';
  s=await open(browser,fixture.hubOwnerLogin,fixture.hubOwnerPassword);
  const refund=s.invoice.getByRole('group',{name:/^Refund \d+ for /});
  await refund.getByLabel(/^Reason for refund \d+$/).fill('Owner checked the request');
  await refund.getByRole('button',{name:'Review refund approval'}).click();
  await s.review.getByText(/A full credit note is posted in Odoo now\. Money is returned only when staff record the refund payment\./).waitFor();
  await s.review.getByRole('button',{name:'Confirm member action in Odoo'}).click();
  await s.result().getByText(/Refund approved: credit note .* posted in Odoo\. Money has not been returned yet\./).waitFor();
  await s.invoice.getByText(/Credit note posted · return the money at the desk, then record it/).waitFor();
  pass('an owner approval posts a native credit note without claiming the money was returned');
  stage='desk refund payment';
  await refund.getByLabel(/^Reason for refund \d+$/).fill('Cash handed back');
  await refund.getByRole('button',{name:'Review refund payment'}).click();
  await s.review.getByRole('button',{name:'Confirm member action in Odoo'}).click();
  await s.result().getByText(/Refund payment .* recorded by staff in Odoo\./).waitFor();
  await s.invoice.getByText(/Refunded · refund payment recorded by staff/).waitFor();
  await s.page.screenshot({path:path.join(process.env.DOJANG_EVIDENCE_DIR,'refund-recorded.png'),fullPage:true});
  pass('the returned money is recorded as a staff payment against the credit note');
  fs.writeFileSync(path.join(process.env.DOJANG_EVIDENCE_DIR,'refunds-browser-results.json'),JSON.stringify({mode:'real Odoo synthetic records',checks},null,2));
  await s.context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(`Refund rehearsal failed at ${stage}: ${e.message}`);process.exitCode=1;});
