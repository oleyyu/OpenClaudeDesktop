// w13-chatfn-branches: the pure Chat version model (src/chat-branches-model.mjs) — groups, lI's numbers, the fork plan,
// removal with fallback, and the session list's hidden versions (electron/surface-policy.mjs surfaceSessions).
import test from 'node:test';
import assert from 'node:assert/strict';
import { addVariant, applyMetadataPatch, groupOf, hiddenChatVersion, normalizeGroups, ownerAt, removeVariant, selectVariant, showVersionNav,
  turnIndexOf, variantPlan, versionNavState, versionsAt } from '../src/chat-branches-model.mjs';
import { surfaceSessions } from '../electron/surface-policy.mjs';

// r: root with turns 0,1,2. a: Retry of turn 1 in r. b: Retry of turn 1 in a. c: a continued, then Retry of its turn 2.
const tree = () => {
  let groups = addVariant({}, { parent: 'r', id: 'a', anchor: 1 });
  groups = addVariant(groups, { parent: 'a', id: 'b', anchor: 1 });
  groups = addVariant(groups, { parent: 'a', id: 'c', anchor: 2 });
  return groups;
};

test('groups: a variant joins its parent\'s group in creation order and becomes shown; bad input is refused', () => {
  const groups = tree();
  assert.deepEqual(Object.keys(groups), ['r']);
  assert.deepEqual(groups.r.members.map((m) => [m.id, m.parent, m.anchor]), [['r', null, 0], ['a', 'r', 1], ['b', 'a', 1], ['c', 'a', 2]]);
  assert.equal(groups.r.shown, 'c');
  assert.equal(groupOf(groups, 'b').root, 'r');
  assert.equal(groupOf(groups, 'x'), null);
  assert.throws(() => addVariant(groups, { parent: 'r', id: 'a', anchor: 1 }), /already a version/);
  assert.throws(() => addVariant(groups, { parent: 'r', id: 'r', anchor: 1 }), /Invalid/);
  assert.throws(() => addVariant(groups, { parent: 'r', id: 'z', anchor: -1 }), /Invalid/);
  // Serialization: unknown parents, repeated ids and a thread in two groups are dropped; a lone root is no group.
  const read = normalizeGroups({ r: { root: 'r', members: [{ id: 'a', parent: 'r', anchor: 1 }, { id: 'q', parent: 'nope', anchor: 1 }, { id: 'a', parent: 'r', anchor: 2 }], shown: 'gone' },
    s: { root: 's', members: [{ id: 'a', parent: 's', anchor: 0 }] }, t: { root: 't', members: [] }, u: 'junk' });
  assert.deepEqual(Object.keys(read), ['r']);
  assert.deepEqual(read.r.members.map((m) => m.id), ['r', 'a']);
  assert.equal(read.r.shown, 'r');
});

test('versions: lI selectedOption / nOptions per turn, Previous / Next targets, and the path a turn sits on', () => {
  const groups = tree();
  const g = groups.r;
  assert.equal(ownerAt(g, 'c', 0), 'r');
  assert.equal(ownerAt(g, 'c', 1), 'a');
  assert.equal(ownerAt(g, 'c', 2), 'c');
  // Turn 0 has one version everywhere.
  assert.equal(versionsAt(groups, 'c', 0), null);
  // Turn 1: r, a, b (b branched under the same empty-path parent, replacing a's turn 1).
  assert.deepEqual(versionsAt(groups, 'r', 1), { selectedOption: 0, nOptions: 3, previous: null, next: 'a' });
  assert.deepEqual(versionsAt(groups, 'a', 1), { selectedOption: 1, nOptions: 3, previous: 'r', next: 'b' });
  assert.deepEqual(versionsAt(groups, 'b', 1), { selectedOption: 2, nOptions: 3, previous: 'a', next: null });
  assert.deepEqual(versionsAt(groups, 'c', 1), { selectedOption: 1, nOptions: 3, previous: 'r', next: 'b' });
  // Turn 2: a and c share a's path; r's turn 2 follows another turn 1, so it is not a sibling.
  assert.deepEqual(versionsAt(groups, 'c', 2), { selectedOption: 1, nOptions: 2, previous: 'a', next: null });
  assert.deepEqual(versionsAt(groups, 'a', 2), { selectedOption: 0, nOptions: 2, previous: null, next: 'c' });
  assert.equal(versionsAt(groups, 'r', 2), null);
  assert.equal(versionsAt(groups, 'b', 2), null);
  assert.equal(versionsAt({}, 'r', 1), null);
  // A first-turn Retry makes turn 0 a choice.
  assert.deepEqual(versionsAt(addVariant({}, { parent: 'r', id: 'z', anchor: 0 }), 'z', 0), { selectedOption: 1, nOptions: 2, previous: 'r', next: null });
});

test('lI numbers: r=(selectedOption??0)+1, i=nOptions??0, Previous off at the first and Next at the last; tO', () => {
  assert.deepEqual(versionNavState({ selectedOption: 0, nOptions: 2 }), { option: 1, total: 2, previousDisabled: true, nextDisabled: false });
  assert.deepEqual(versionNavState({ selectedOption: 1, nOptions: 2 }), { option: 2, total: 2, previousDisabled: false, nextDisabled: true });
  assert.deepEqual(versionNavState({ selectedOption: 1, nOptions: 3 }), { option: 2, total: 3, previousDisabled: false, nextDisabled: false });
  assert.deepEqual(versionNavState({}), { option: 1, total: 0, previousDisabled: true, nextDisabled: true });
  assert.equal(showVersionNav({ optionCount: 2 }), true);
  assert.equal(showVersionNav({ optionCount: 1 }), false);
  assert.equal(showVersionNav({ optionCount: 3, isStreaming: true }), false);
});

test('fork plan: after the turn before; the first turn needs thread/revert in the copy', () => {
  assert.deepEqual(variantPlan(['t0', 't1', 't2'], 2), { lastTurnId: 't1', revert: false });
  assert.deepEqual(variantPlan(['t0', 't1'], 1), { lastTurnId: 't0', revert: false });
  assert.equal(variantPlan(['t0', 't1'], 0), null);
  assert.deepEqual(variantPlan(['t0', 't1'], 0, { revertServed: true }), { lastTurnId: 't0', revert: true });
  assert.equal(variantPlan(['t0'], 3), null);
  assert.equal(turnIndexOf([{ turnId: 'a' }, { turnId: 'a' }, { id: 'x' }, { turnId: 'b' }], 'b'), 1);
  assert.equal(turnIndexOf([{ turnId: 'a' }], 'z'), -1);
});

test('select and remove: the shown version moves; removing falls back to the parent and takes its own branches', () => {
  const groups = selectVariant(tree(), 'b');
  assert.equal(groups.r.shown, 'b');
  assert.throws(() => selectVariant({}, 'r'), /no other versions/);
  // Removing a takes b and c (they continue a's turns); r is left alone, so the group goes.
  assert.deepEqual(removeVariant(groups, 'a'), { groups: {}, removed: ['a', 'b', 'c'], shown: 'r' });
  // Removing the shown c falls back to its parent a.
  const shownC = selectVariant(tree(), 'c');
  const { groups: left, removed, shown } = removeVariant(shownC, 'c');
  assert.deepEqual(removed, ['c']);
  assert.equal(shown, 'a');
  assert.deepEqual(left.r.members.map((m) => m.id), ['r', 'a', 'b']);
  // Removing the root removes the whole conversation.
  assert.deepEqual(removeVariant(tree(), 'r').removed.sort(), ['a', 'b', 'c', 'r']);
  assert.deepEqual(removeVariant(tree(), 'x'), { groups: tree(), removed: [], shown: null });
});

test('session list: one row per branched conversation, the version it shows; patches apply', () => {
  const metadata = { r: { surface: 'chat', chatBranchShown: 'a' }, a: { surface: 'chat', chatBranchOf: 'r' }, b: { surface: 'chat', chatBranchOf: 'r' },
    k: { surface: 'chat' }, w: { surface: 'cowork' } };
  assert.equal(hiddenChatVersion('r', metadata), true);
  assert.equal(hiddenChatVersion('a', metadata), false);
  assert.equal(hiddenChatVersion('b', metadata), true);
  assert.equal(hiddenChatVersion('k', metadata), false);
  const sessions = ['r', 'a', 'b', 'k', 'w', 'c'].map((id) => ({ id }));
  assert.deepEqual(surfaceSessions(sessions, 'chat', metadata).map((s) => s.id), ['a', 'k', 'w']);
  assert.deepEqual(surfaceSessions(sessions, 'code', metadata).map((s) => s.id), ['c']);
  // The shown version deleted (root metadata gone): the rest stay hidden until the service prunes them.
  assert.equal(hiddenChatVersion('a', { a: { surface: 'chat', chatBranchOf: 'r' } }), true);
  assert.deepEqual(applyMetadataPatch({ r: { surface: 'chat' }, x: {} }, { r: { surface: 'chat', chatBranchShown: 'a' }, x: null }), { r: { surface: 'chat', chatBranchShown: 'a' } });
  const same = { r: {} };
  assert.equal(applyMetadataPatch(same, {}), same);
});
