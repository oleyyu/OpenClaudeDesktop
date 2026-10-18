import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANCH_EMPTY_MESSAGE, BRANCH_SEARCH_PLACEHOLDER, BRANCH_TOOLTIP, branchTriggerLabel, defaultBranch, enterSelection, filterBranches, sortBranches } from '../src/branch-picker-model.mjs';

// Fidelity F03: branch picker step 1 (cc43287c9-BMbiZYzF.js:22009-22035 hT props, :12062-12071 order,
// cd2687f9f-CY3xvb9b.js N search/Enter/Empty).
test('copy matches the hT props', () => {
  assert.equal(BRANCH_TOOLTIP, 'Branch to start from');
  assert.equal(BRANCH_SEARCH_PLACEHOLDER, 'Search branches…');
  assert.equal(BRANCH_EMPTY_MESSAGE, 'No branches match');
  assert.equal(branchTriggerLabel('feature/x'), 'feature/x');
  assert.equal(branchTriggerLabel(''), '—');
  assert.equal(branchTriggerLabel(undefined), '—');
});

test('default branch: origin/HEAD when it is a local branch, else main, else master', () => {
  assert.equal(defaultBranch({ originHead: 'origin/develop', branches: ['main', 'develop'] }), 'develop');
  assert.equal(defaultBranch({ originHead: 'refs/remotes/origin/develop', branches: ['develop'] }), 'develop');
  assert.equal(defaultBranch({ originHead: 'origin/trunk', branches: ['main', 'feature'] }), 'main', 'a remote-only default falls back');
  assert.equal(defaultBranch({ branches: ['master', 'feature'] }), 'master');
  assert.equal(defaultBranch({ branches: ['feature', 'zeta'] }), null);
});

test('order: the default branch first, the rest by localeCompare; a missing default is prepended', () => {
  assert.deepEqual(sortBranches(['zeta', 'feature', 'main', 'alpha'], 'main'), ['main', 'alpha', 'feature', 'zeta']);
  assert.deepEqual(sortBranches(['zeta', 'feature'], null), ['feature', 'zeta']);
  assert.deepEqual(sortBranches(['zeta', 'feature'], 'main'), ['main', 'feature', 'zeta']);
  assert.deepEqual(sortBranches(['b', 'a', 'b'], 'b'), ['b', 'a'], 'duplicates collapse');
});

test('typing filters case-insensitively; an empty query lists everything; no match yields the Empty row', () => {
  const sorted = sortBranches(['main', 'feature/login', 'Feature-two', 'zeta'], 'main');
  assert.deepEqual(filterBranches(sorted, ''), sorted);
  // The sorted order is kept (localeCompare puts 'Feature-two' before 'feature/login').
  assert.deepEqual(filterBranches(sorted, 'FEAT'), sorted.filter((name) => /feat/i.test(name)));
  assert.equal(filterBranches(sorted, 'FEAT').length, 2);
  assert.deepEqual(filterBranches(sorted, 'login'), ['feature/login']);
  assert.deepEqual(filterBranches(sorted, 'zzz'), []);
});

test('Enter selects the first match only for a non-empty query', () => {
  const sorted = sortBranches(['main', 'feature/login', 'zeta'], 'main');
  assert.equal(enterSelection(sorted, 'e'), 'feature/login');
  assert.equal(enterSelection(sorted, '  '), null);
  assert.equal(enterSelection(sorted, ''), null);
  assert.equal(enterSelection(sorted, 'zzz'), null);
});

// R05 branch step 2 (cc43287c9-BMbiZYzF.js:12084-12145 me/he, :35132 branchChanged).
test('branchSwitchPlan: same branch none, worktree base, clean checkout on send, dirty dialog', async () => {
  const { branchSwitchPlan, checkedOutBranch, branchCheckoutTarget, WORKING_TREE_ERROR, BRANCH_SWITCH_LABELS } = await import('../src/branch-picker-model.mjs');
  assert.equal(branchSwitchPlan({ worktree: false, dirty: false, current: 'main', target: 'feature/login' }), 'checkout-on-send');
  assert.equal(branchSwitchPlan({ worktree: false, dirty: true, current: 'main', target: 'zeta-topic' }), 'resolve-dialog');
  assert.equal(branchSwitchPlan({ worktree: true, dirty: true, current: 'main', target: 'zeta-topic' }), 'worktree', 'a worktree never touches the checkout');
  assert.equal(branchSwitchPlan({ worktree: false, dirty: true, current: 'main', target: 'main' }), 'none');
  assert.equal(branchSwitchPlan({ current: 'main' }), 'none');
  // The chip shows the pick; the real branch stays in checkedOut until the spawn switches.
  assert.equal(checkedOutBranch({ isRepo: true, branch: 'main' }), 'main');
  assert.equal(checkedOutBranch({ isRepo: true, branch: 'zeta-topic', checkedOut: 'main' }), 'main');
  assert.equal(checkedOutBranch(null), '');
  assert.equal(branchCheckoutTarget({ isRepo: true, branch: 'zeta-topic', checkedOut: 'main' }), 'zeta-topic');
  assert.equal(branchCheckoutTarget({ isRepo: true, branch: 'main' }), null);
  assert.equal(branchCheckoutTarget({ isRepo: true, branch: 'main', checkedOut: 'main' }), null);
  assert.equal(branchCheckoutTarget({ isRepo: false, branch: 'x', checkedOut: 'y' }), null);
  assert.equal(WORKING_TREE_ERROR, 'Couldn’t update the working tree.');
  assert.deepEqual(BRANCH_SWITCH_LABELS, { stash: 'Stash changes', commit: 'Commit as WIP', discard: 'Discard changes' });
});

test('B34 RJ otherSessionCount / ETzdRE7DsE: unarchived sessions in the folder, without the current one', async () => {
  const { otherSessionCount, otherSessionsNote } = await import('../src/branch-picker-model.mjs');
  const sessions = [
    { id: 'a', cwd: '/repo' }, { id: 'b', cwd: '/repo' }, { id: 'c', cwd: '/repo', archived: true },
    { id: 'd', cwd: '/repo', isArchived: true }, { id: 'e', cwd: '/other' }, null,
  ];
  assert.equal(otherSessionCount(sessions, '/repo'), 2);
  assert.equal(otherSessionCount(sessions, '/repo', { exclude: 'a' }), 1);
  assert.equal(otherSessionCount(sessions, ''), 0);
  assert.equal(otherSessionCount(undefined, '/repo'), 0);
  assert.equal(otherSessionsNote(0), null);
  assert.equal(otherSessionsNote(1), '1 other session is using this folder. Switching branches will affect it too.');
  assert.equal(otherSessionsNote(3), '3 other sessions are using this folder. Switching branches will affect them too.');
});

// R4e-envbranch home-15: Te (2.42304.0 cc43287c9 JZ) over the original qZ (generated/r4e-envbranch). The desktop bridge
// is a stub; no git runs. `bridge(answer)` installs window.desktop.call answering branch-on-origin.
function bridge(answer, calls = []) {
  const previous = globalThis.window;
  globalThis.window = { desktop: { call: async (action, params) => { calls.push([action, params]); if (action !== 'branch-on-origin') throw new Error(`unexpected ${action}`); return typeof answer === 'function' ? answer(params) : answer; } } };
  return { calls, restore: () => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; } };
}
const dirtyCheck = async () => ({ dirty: true, branch: 'main', files: 1, additions: 1, deletions: 0 });
const cleanCheck = async () => ({ dirty: false, branch: 'main', files: 0, additions: 0, deletions: 0 });
const localBranches = (...names) => async () => names;

test('home-15 Te: a dirty tree, a non-empty local list without the branch and isBranchOnOrigin false → missing', async (t) => {
  const { startBranchCheck } = await import('../src/branch-picker-model.mjs');
  const stub = bridge(false); t.after(stub.restore);
  const result = await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: dirtyCheck, branches: localBranches('main', 'dev') });
  assert.deepEqual(result, { check: await dirtyCheck(), conflict: true, missing: true });
  assert.deepEqual(stub.calls, [['branch-on-origin', { cwd: '/repo', branch: 'gone' }]]);
});

test('home-15 Te: a branch on origin, in the local list, or unknown to origin is not missing (the dialog path stays)', async (t) => {
  const { startBranchCheck } = await import('../src/branch-picker-model.mjs');
  for (const [answer, list, label] of [[true, ['main'], 'on origin'], [null, ['main'], 'origin unknown'], ['yes', ['main'], 'a non-boolean answer counts as unknown'],
    [false, ['main', 'dev'], 'listed locally'], [false, [], 'an empty local list']]) {
    const stub = bridge(answer);
    const target = label === 'listed locally' ? 'dev' : 'gone';
    const result = await startBranchCheck({ cwd: '/repo', target, conflict: dirtyCheck, branches: async () => list });
    stub.restore();
    assert.equal(result.missing, false, label);
    assert.equal(result.conflict, true, label);
    if (label === 'listed locally' || label === 'an empty local list') assert.deepEqual(stub.calls, [], `${label}: origin is not asked`);
  }
});

test('home-15 qZ: origin/… and 40-hex shas are never missing; a failing list or bridge is not missing; no bridge, no check', async (t) => {
  const { startBranchCheck } = await import('../src/branch-picker-model.mjs');
  const stub = bridge(false); t.after(stub.restore);
  for (const target of ['origin/gone', '0123456789abcdef0123456789abcdef01234567']) {
    const result = await startBranchCheck({ cwd: '/repo', target, conflict: dirtyCheck, branches: localBranches('main') });
    assert.equal(result.missing, false, target);
  }
  assert.equal((await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: dirtyCheck, branches: async () => { throw new Error('git'); } })).missing, false);
  assert.deepEqual(stub.calls, [], 'qZ returns before asking origin');
  stub.restore();
  const failing = bridge(() => { throw new Error('ipc'); });
  assert.equal((await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: dirtyCheck, branches: localBranches('main') })).missing, false, 'a rejected isBranchOnOrigin');
  failing.restore();
  delete globalThis.window;
  assert.equal((await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: dirtyCheck, branches: localBranches('main') })).missing, false, '!J?.isBranchOnOrigin');
});

test('home-15 Te: a clean tree takes the branch without asking qZ; a failed or empty conflict check counts as conflicting', async (t) => {
  const { startBranchCheck } = await import('../src/branch-picker-model.mjs');
  const stub = bridge(false); t.after(stub.restore);
  let asked = 0;
  const branches = async () => { asked++; return ['main']; };
  assert.deepEqual(await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: cleanCheck, branches }), { check: await cleanCheck(), conflict: false, missing: false });
  assert.equal(asked, 0, 'r === false: i = r && … short-circuits');
  const failed = await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: async () => { throw new Error('git'); }, branches });
  assert.deepEqual(failed, { check: null, conflict: true, missing: true }, 'r stays !0 when the check throws');
  const empty = await startBranchCheck({ cwd: '/repo', target: 'gone', conflict: async () => null, branches });
  assert.deepEqual(empty, { check: null, conflict: true, missing: true });
  assert.equal(asked, 2);
});

test('home-15 FA.branchMissing values: known/fallback from the checked-out branch, saved from the selected environment', async () => {
  const { branchMissingValues } = await import('../src/branch-picker-model.mjs');
  assert.deepEqual(branchMissingValues({ branch: 'gone', fallback: 'main', savedBranch: 'gone' }),
    { values: { branch: 'gone', known: 'yes', fallback: 'main', saved: 'yes' }, uniqueKey: 'branch-missing:gone' });
  assert.deepEqual(branchMissingValues({ branch: 'gone', fallback: '', savedBranch: 'other' }),
    { values: { branch: 'gone', known: 'no', fallback: '', saved: 'no' }, uniqueKey: 'branch-missing:gone' });
  assert.equal(branchMissingValues({ branch: 'gone', fallback: 'main' }).values.saved, 'no');
});

// R4e-envbranch review: the start held behind Te (cc43287c9 gh holdSubmit / xh holdTargetKey with pickedSourceBranch
// be = ve ?? j; c227f4d5e OP queues while held, drops on a key change, releases via releaseQueuedSubmit once settled).
test('home-15 held start key: the draft, folder, worktree and start branch (be = ve ?? j)', async () => {
  const { heldStartKey } = await import('../src/branch-picker-model.mjs');
  const key = heldStartKey({ session: null, folder: '/repo', worktree: false, branch: 'gone' });
  assert.equal(key, heldStartKey({ folder: '/repo', branch: 'gone' }), 'defaults: a draft, worktree off');
  assert.notEqual(key, heldStartKey({ session: 's1', folder: '/repo', branch: 'gone' }));
  assert.notEqual(key, heldStartKey({ folder: '/other', branch: 'gone' }));
  assert.notEqual(key, heldStartKey({ folder: '/repo', worktree: true, branch: 'gone' }));
  assert.notEqual(key, heldStartKey({ folder: '/repo', branch: 'main' }));
  assert.equal(heldStartKey({ folder: '/repo', branch: '' }), heldStartKey({ folder: '/repo' }), 'no branch is one key');
  assert.equal(heldStartKey({ folder: '/repo', worktree: 'yes', branch: 'x' }), heldStartKey({ folder: '/repo', branch: 'x' }));
});

test('home-15 held start: waits while Te runs, goes out when the pick is recorded, is dropped when Te clears it or asks GR', async () => {
  const { heldStartKey, heldStartStep } = await import('../src/branch-picker-model.mjs');
  const keyFor = (branch, extra = {}) => heldStartKey({ folder: '/repo', branch, ...extra });
  // Enter while the check for 'gone' runs: the start branch is the pending target.
  const held = { priority: undefined, key: keyFor('gone') };
  assert.equal(heldStartStep({ held: null, pending: true, key: keyFor('gone') }), 'none');
  assert.equal(heldStartStep({ held, pending: true, key: keyFor('gone') }), 'wait', 'gh: the submit stays queued');
  // M(t): the check recorded the target, so be and the key are unchanged → Ni → Mi(opts).
  assert.equal(heldStartStep({ held, pending: false, key: keyFor('gone') }), 'release');
  // M(void 0): missing → the draft falls back to the checked-out branch → the key changes → gt.
  assert.equal(heldStartStep({ held, pending: false, key: keyFor('main') }), 'drop');
  // pe(t) on a pick: j stays the old branch → the key changes → gt.
  assert.equal(heldStartStep({ held, pending: false, key: keyFor('main'), dialog: true }), 'drop');
  // pe(t) on a saved environment branch: the host draft still shows it, the open GR dialog drops the start instead.
  assert.equal(heldStartStep({ held, pending: false, key: keyFor('gone'), dialog: true }), 'drop');
  // A key change while still pending (a newer pick, another folder, worktree on) drops at once (OP effect: gt()).
  assert.equal(heldStartStep({ held, pending: true, key: keyFor('dev') }), 'drop');
  assert.equal(heldStartStep({ held, pending: true, key: keyFor('gone', { worktree: true }) }), 'drop');
  assert.equal(heldStartStep({ held, pending: true, key: keyFor('gone', { session: 's1' }) }), 'drop');
});
