const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const compiled = path.join(process.env.DOJANG_MEMBER_TEST_BUILD, 'compiled');
const { getMember, getMembers, getMemberAttendance } = require(path.join(compiled, 'integrations/member.js'));
const { memberInitials, memberActionCopy } = require(path.join(compiled, 'domain/member-presentation.js'));
const { getContextFor, scopedSuggestion } = require(path.join(compiled, 'integrations/mock/companion.js'));
const { getStore: attendanceStore, resetStore: resetAttendance } = require(path.join(compiled, 'integrations/mock/kiosk-store.js'));
const { resetStore: resetCompanion } = require(path.join(compiled, 'integrations/mock/companion-store.js'));
const { POST: requestAction } = require(path.join(compiled, 'integrations/mock/routes/companion-requests.js'));
const { POST: approve } = require(path.join(compiled, 'integrations/mock/routes/companion-approvals.js'));
const { GET: readContext } = require(path.join(compiled, 'integrations/mock/routes/companion-context.js'));
const request = body => new Request('https://test.invalid/api', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });

test('Theo and Maya retain separate identity, rank, status, bookings, and dialog context', async () => {
  const [theo, maya] = await Promise.all([getMember('5005'), getMember('5001')]);
  assert.equal(theo.name, 'Theo Nguyen');
  assert.equal(memberInitials(theo), 'TN');
  assert.equal(theo.membershipState, 'paused');
  assert.equal(theo.rank.name, 'Yellow Belt');
  assert.deepEqual(theo.bookings, []);
  assert.equal(maya.name, 'Maya Chen');
  assert.equal(memberInitials(maya), 'MC');
  assert.deepEqual(maya.bookings.map(row => row.sessionId), ['104']);
  assert.equal(maya.bookings[0].title, 'Children Advanced');
  for (const member of await getMembers()) {
    for (const action of ['message','book','payment','edit','ask','details','quickActions']) {
      const copy = memberActionCopy(action, member);
      assert.ok(copy.title.includes(member.name), `${action} is attached to ${member.id}`);
      if (member.id !== maya.id) assert.doesNotMatch(JSON.stringify(copy), /Maya/i);
    }
  }
  assert.equal(await getMember('not-a-member'), null);
});

test('a Maya attendance receipt never appears in Theo history', async () => {
  resetAttendance();
  attendanceStore().receipts.set('104:5001', { attendanceId: '9999', memberId:'5001', sessionId:'104', checkedInAt:new Date().toISOString(), status:'present', alreadyRecorded:false, correlationId:'regression' });
  assert.equal((await getMemberAttendance('5001')).lastSevenDays, 1);
  assert.deepEqual(await getMemberAttendance('5005'), {latest:null,lastSevenDays:0,history:[]});
  resetAttendance();
});

test('Companion does not fall back to other members and drafts for the requested person', async () => {
  assert.equal(getContextFor('5005').heading, 'Theo Nguyen');
  assert.equal(getContextFor('5005').featured, undefined);
  assert.doesNotMatch(JSON.stringify(getContextFor('5005')), /Maya|Chen|Parker/);
  assert.equal(getContextFor('missing').suggestions.length, 0);
  const response = await requestAction(request({memberId:'5005',text:'Draft an email',onScreenIds:[]}));
  const data = await response.json();
  assert.equal(data.outcome, 'newTask');
  assert.equal(data.suggestion.id, 'req-email-5005');
  assert.match(JSON.stringify(data.suggestion), /Theo Nguyen/);
  assert.doesNotMatch(JSON.stringify(data.suggestion), /Maya|Linda|Lena|Chen/);
  assert.equal(scopedSuggestion('maya-poomsae', '5005'), null);
  const forged = await requestAction(request({memberId:'5005',text:'Poomsae evaluation',onScreenIds:['maya-poomsae']}));
  assert.equal((await forged.json()).outcome, 'notUnderstood');
});

test('cross-member approvals and replayed keys are rejected; receipts stay scoped', async () => {
  resetCompanion();
  const command = {memberId:'5001',suggestionId:'maya-poomsae',idempotencyKey:'test-member-key',correlationId:'test-member-request'};
  assert.equal((await approve(request({...command,memberId:'5005'}))).status, 404);
  assert.equal((await approve(request(command))).status, 201);
  assert.equal((await approve(request(command))).status, 200);
  assert.equal((await approve(request({...command,memberId:'5005'}))).status, 409);
  const theo = await (await readContext(new Request('https://test.invalid/api?memberId=5005'))).json();
  const maya = await (await readContext(new Request('https://test.invalid/api?memberId=5001'))).json();
  assert.equal(theo.receipts.length, 0);
  assert.equal(maya.receipts.length, 1);
  resetCompanion();
});
