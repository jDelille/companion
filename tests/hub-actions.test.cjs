const {test}=require('node:test');
const assert=require('node:assert/strict');
const {runHubAction,replacementBlockReason,explainHubError}=require(process.env.DOJANG_HUB_ACTIONS_MODULE);
const now=Date.parse('2026-10-12T12:00:00Z');

test('replacement is disabled at the original start time and afterward',()=>{
  for(const startsAt of ['2026-10-12T11:59:59Z','2026-10-12T12:00:00Z'])
    assert.match(replacementBlockReason({startsAt,future:true},now),/already started/);
});
test('server non-future flag wins over a slow client clock',()=>{
  assert.match(replacementBlockReason({startsAt:'2026-10-12T13:00:00Z',future:false},now),/already started/);
});
test('a missing or invalid original session is not presented as replaceable',()=>{
  assert.match(replacementBlockReason(undefined,now),/could not be verified/);
  assert.match(replacementBlockReason({startsAt:'invalid',future:true},now),/could not be verified/);
});
test('a future original class remains eligible for server-side replacement review',()=>{
  assert.equal(replacementBlockReason({startsAt:'2026-10-12T13:00:00Z',future:true},now),null);
});
test('acknowledged receipt is shown before refreshing the context',async()=>{
  const events=[];
  const result=await runHubAction(async()=>({enrollmentId:'72'}),async()=>{events.push('refresh');},feedback=>{events.push('receipt');assert.match(feedback.text,/Receipt: 72/);});
  assert.deepEqual(events,['receipt','refresh']);assert.equal(result.kind,'success');
});
test('failed context refresh never turns a saved booking into a failed write',async()=>{
  let accepted=0,sends=0;
  const result=await runHubAction(async()=>{sends++;return {enrollmentId:'72'};},async()=>{throw Error('offline');},()=>accepted++);
  assert.equal(result.kind,'success');assert.match(result.text,/Receipt: 72/);
  assert.match(result.refreshWarning,/do not submit this booking again/);assert.equal(accepted,1);assert.equal(sends,1);
});
test('definite eligibility rejection is shown without refreshing or acknowledging',async()=>{
  const result=await runHubAction(async()=>{throw Error('BUSINESS_RULE_REVIEW_REQUIRED');},async()=>assert.fail('not committed'),()=>assert.fail('not acknowledged'));
  assert.equal(result.kind,'error');assert.match(result.text,/subscription, credits/);
});
test('transport and unconfirmed gateway errors preserve uncertainty',async()=>{
  for(const error of [new TypeError('Failed to fetch'),new SyntaxError('bad JSON'),new Error('BACKEND_UNAVAILABLE_RETRY_SAME_ACTION')]){
    const result=await runHubAction(async()=>{throw error;},async()=>assert.fail('not confirmed'),()=>assert.fail('not acknowledged'));
    assert.equal(result.kind,'uncertain');assert.match(result.text,/Retry this same action/);
  }
});
test('replacement rejection explains original enrollment restrictions',()=>{
  assert.match(explainHubError('ENROLLMENT_REVIEW_REQUIRED'),/attendance may already be recorded/);
});
test('non-booking actions retain ordinary successful feedback',async()=>{
  const result=await runHubAction(async()=>({}),async()=>{},()=>{});
  assert.deepEqual(result,{kind:'success',text:'Saved in Odoo.'});
});
