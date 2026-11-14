import test from "node:test";
import assert from "node:assert/strict";
import {
  createSelection, toggleSelection, selectRange, setSelection, pruneSelection, clearSelection, isSelected,
} from "../src/sidebar-selection.mjs";

const keys = (state) => [...state.selectedKeys];
const order = ["a", "b", "c", "d", "e"];

test("toggle adds, removes and keeps the anchor on the toggled key", () => {
  let state = toggleSelection(createSelection(), "b", "code");
  assert.deepEqual(keys(state), ["b"]); assert.equal(state.anchorKey, "b"); assert.equal(state.anchorDomain, "code");
  state = toggleSelection(state, "d", "code");
  assert.deepEqual(keys(state), ["b", "d"]); assert.equal(state.anchorKey, "d");
  state = toggleSelection(state, "b", "code");
  assert.deepEqual(keys(state), ["d"]); assert.equal(state.anchorKey, "b", "removal still records the anchor");
  assert.equal(isSelected(state, "d"), true); assert.equal(isSelected(state, "b"), false);
});

test("a different domain restarts the selection as a single row", () => {
  const state = toggleSelection(toggleSelection(createSelection(), "a", "code"), "b", "code");
  const next = toggleSelection(state, "c", "cowork");
  assert.deepEqual(keys(next), ["c"]); assert.equal(next.anchorDomain, "cowork");
  const ranged = selectRange(state, state.anchorKey, "d", order, "cowork");
  assert.deepEqual(keys(ranged), ["d"], "range across domains keeps only the target");
});

test("shift range selects the inclusive slice in either direction; a missing anchor selects only the target", () => {
  const first = selectRange(createSelection(), null, "c", order, "code");
  assert.deepEqual(keys(first), ["c"]); assert.equal(first.anchorKey, "c");
  const forward = selectRange(first, first.anchorKey, "e", order, "code");
  assert.deepEqual(keys(forward), ["c", "d", "e"]); assert.equal(forward.anchorKey, "c", "the anchor survives a range");
  const backward = selectRange(forward, forward.anchorKey, "a", order, "code");
  assert.deepEqual(keys(backward), ["a", "b", "c"]);
  const stale = selectRange(forward, "zz", "b", order, "code");
  assert.deepEqual(keys(stale), ["b"]);
  assert.deepEqual(keys(selectRange(forward, "c", "zz", order, "code")), ["zz"]);
});

test("setSelection, prune and clear", () => {
  const all = setSelection(createSelection(), order, "code");
  assert.deepEqual(keys(all), order); assert.equal(all.anchorKey, null);
  const anchored = toggleSelection(toggleSelection(createSelection(), "a", "code"), "b", "code");
  assert.equal(pruneSelection(anchored, order), anchored, "unchanged selections keep identity");
  const pruned = pruneSelection(anchored, ["a", "c"]);
  assert.deepEqual(keys(pruned), ["a"]); assert.equal(pruned.anchorKey, null, "a removed anchor is dropped");
  assert.deepEqual(keys(pruneSelection(anchored, new Set(["b"]))), ["b"]);
  const cleared = clearSelection(pruned);
  assert.deepEqual(keys(cleared), []); assert.equal(cleared.anchorKey, null);
  assert.equal(clearSelection(cleared), cleared, "clearing an empty selection keeps identity");
});
