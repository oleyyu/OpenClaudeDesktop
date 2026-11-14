import test from 'node:test';
import assert from 'node:assert/strict';
import * as split from '../src/split-view-model.mjs';

// B27 split-view tip (c11959232 yd store "epitaxy-split-suggestion", vd/bd/wd/xd/Sd/Td, Ed card).
const day = 24 * 60 * 60 * 1000;
function visit(state, history, ids, start = 0, step = 1000, options) {
  let at = start;
  for (const id of ids) { ({ state, history } = split.splitSuggestionNavigate(state, history, id, at, options)); at += step; }
  return { state, history, at };
}

test('A, B, A, B within 30 s triggers the card for the session just left; at most once per run', () => {
  let { state, history } = visit(split.emptySplitSuggestion, [], ['a', 'b', 'a', 'b']);
  assert.equal(state.partner, 'a');
  assert.deepEqual(state.pairKeys, ['b', 'a']);
  assert.equal(state.shownThisRun, true);
  state = split.splitSuggestionShown(state);
  assert.equal(state.shownCount, 1);
  assert.equal(split.splitSuggestionShown(state).shownCount, 1, 'one impression per card');
  // Retracted on leaving the pair; it does not come back this run.
  ({ state, history } = split.splitSuggestionNavigate(state, history, 'c', 5000));
  assert.equal(state.partner, null);
  assert.equal(state.pairKeys, null);
  ({ state } = visit(state, history, ['a', 'c', 'a', 'c'], 6000));
  assert.equal(state.partner, null, 'shownThisRun');
  // Slower than 30 s: nothing.
  assert.equal(visit(split.emptySplitSuggestion, [], ['a', 'b', 'a', 'b'], 0, 11000).state.partner, null);
});

test('going to the suggested session points the card at the one just left (repoint); leaving to a new page retracts', () => {
  let { state, history } = visit(split.emptySplitSuggestion, [], ['a', 'b', 'a', 'b']);
  ({ state, history } = split.splitSuggestionNavigate(state, history, 'a', 4000));
  assert.equal(state.partner, 'b');
  assert.deepEqual(state.pairKeys, ['b', 'a']);
  ({ state, history } = split.splitSuggestionNavigate(state, history, 'b', 5000));
  assert.equal(state.partner, 'a');
  ({ state } = split.splitSuggestionNavigate(state, history, null, 6000));
  assert.equal(state.partner, null, 'the new-session page is no session (xd)');
});

test('never while split, never after accepting, at most 3 shows; a dismissal backs off a day, then a week', () => {
  assert.equal(visit(split.emptySplitSuggestion, [], ['a', 'b', 'a', 'b'], 0, 1000, { splitOpen: true }).state.partner, null);
  let { state } = visit(split.emptySplitSuggestion, [], ['a', 'b', 'a', 'b']);
  assert.equal(split.acceptSplitSuggestion(state).accepted, true);
  const accepted = { ...split.emptySplitSuggestion, accepted: true };
  assert.equal(visit(accepted, [], ['a', 'b', 'a', 'b']).state.partner, null);
  assert.equal(visit({ ...split.emptySplitSuggestion, shownCount: 3 }, [], ['a', 'b', 'a', 'b']).state.partner, null);
  state = split.dismissSplitSuggestion(state, 10_000);
  assert.equal(state.dismissCount, 1);
  assert.equal(state.lastDismissedAt, 10_000);
  const nextRun = split.splitSuggestionState(split.persistedSplitSuggestion(state));
  assert.equal(visit(nextRun, [], ['a', 'b', 'a', 'b'], 10_000 + day - 10_000).state.partner, null, 'inside the day');
  assert.equal(visit(nextRun, [], ['a', 'b', 'a', 'b'], 10_000 + day).state.partner, 'a');
  const twice = { ...nextRun, dismissCount: 2 };
  assert.equal(visit(twice, [], ['a', 'b', 'a', 'b'], 10_000 + 6 * day).state.partner, null);
  assert.equal(visit(twice, [], ['a', 'b', 'a', 'b'], 10_000 + 7 * day).state.partner, 'a');
  // A dismissal stamped in the future counts from now.
  assert.equal(split.maySuggestSplit({ ...split.emptySplitSuggestion, dismissCount: 1, lastDismissedAt: 1e15 }, 5), false);
});

test('persisted shape: zustand {state, version} with the four counters; the earlier local shape reads the same', () => {
  const state = { ...split.emptySplitSuggestion, shownCount: 2, dismissCount: 1, lastDismissedAt: 77, partner: 'x', pairKeys: ['y', 'x'], shownThisRun: true };
  assert.deepEqual(split.persistedSplitSuggestion(state), { state: { shownCount: 2, accepted: false, dismissCount: 1, lastDismissedAt: 77 }, version: 0 });
  const back = split.splitSuggestionState(split.persistedSplitSuggestion(state));
  assert.equal(back.partner, null);
  assert.equal(back.shownThisRun, false);
  assert.equal(back.shownCount, 2);
  const legacy = split.splitSuggestionState({ shown: 5, lastShownAt: 9, accepted: 1, dismissed: 2 });
  assert.equal(legacy.shownCount, 5);
  assert.equal(legacy.accepted, true);
  assert.equal(legacy.dismissCount, 2);
  assert.equal(split.SPLIT_SUGGESTION_KEY, 'epitaxy-split-suggestion');
  assert.equal(split.SPLIT_SUGGESTION_MAX_SHOWS, 3);
  assert.equal(split.recordSessionSwitch(Array.from({ length: 12 }, (_, index) => ({ id: `s${index}`, at: index })), 'z', 99).length, split.SPLIT_SUGGESTION_HISTORY);
});
