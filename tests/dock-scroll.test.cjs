const test = require('node:test');
const assert = require('node:assert/strict');
const { expandedDock, advanceDock } = require(process.env.DOJANG_DOCK_MODULE);

test('the first downward movement starts collapse, even near the top', () => {
  let state = expandedDock();
  for (const y of [0.5, 1, 2, 48, 113]) {
    state = advanceDock(state, y);
    assert.equal(state.collapsed, true);
  }
});
test('minor direction changes do not flicker; deliberate upward travel reveals', () => {
  let state = advanceDock(expandedDock(), 180);
  for (const y of [177, 179, 176, 181]) state = advanceDock(state, y);
  assert.equal(state.collapsed, true);
  state = advanceDock(state, 170);
  assert.equal(state.collapsed, true);
  state = advanceDock(state, 160);
  assert.equal(state.collapsed, false);
});
test('manual expansion stays open until the next downward movement', () => {
  let state = expandedDock(200);
  state = advanceDock(state, 200);
  assert.equal(state.collapsed, false);
  state = advanceDock(state, 199);
  assert.equal(state.collapsed, false);
  state = advanceDock(state, 200);
  assert.equal(state.collapsed, true);
});
test('top and negative overscroll always restore the full menu', () => {
  const collapsed = advanceDock(expandedDock(), 200);
  assert.equal(advanceDock(collapsed, 0).collapsed, false);
  assert.deepEqual(advanceDock(collapsed, -30), expandedDock());
  assert.equal(advanceDock(collapsed, 200), collapsed);
});
