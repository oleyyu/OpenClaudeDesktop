// display-bugs-20261114 (D-02 follow-up): a message sent while a turn runs (a steer) drew the user bubble with
// awaitingPickup, and the official slice's zk read `e?.readWhileWaiting.includes(t)` from the host's live store, which had
// no readWhileWaiting: TypeError → React #520 → the whole session fell back to host rows.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createLiveSessionStore } from "../src/code-session-info-model.mjs";

const slice = fs.readFileSync(new URL("../src/generated/code-transcript/c06cf64bb-CdJdJuVd.mjs", import.meta.url), "utf8");

test("the live store carries the steer fields the slices read, empty while idle", () => {
  const state = createLiveSessionStore({ model: "m" }).getState();
  for (const key of ["readWhileWaiting", "queuedSteered", "queuedDeferred"]) {
    assert.ok(Array.isArray(state[key]), `${key} is an array`);
    assert.equal(state[key].length, 0, `${key} starts empty`);
  }
});

test("the official selectors' reads do not throw on the host store", () => {
  // The predicates as the slice writes them (zk, Tk): checked against the source so a regenerated slice is noticed.
  assert.match(slice, /e\?\.readWhileWaiting\.includes\(t\) \?\? !1/);
  assert.match(slice, /e\.queuedSteered\.length \+ e\.queuedDeferred\.length === 0/);
  const state = createLiveSessionStore({ model: "m" }).getState();
  const zk = (e, t) => e?.readWhileWaiting.includes(t) ?? false;
  const queued = (e) => e.queuedSteered.length + e.queuedDeferred.length === 0;
  assert.doesNotThrow(() => zk(state, "user-1"));
  assert.equal(zk(state, "user-1"), false);
  assert.equal(queued(state), true);
});

test("setLiveMeta keeps the steer fields", () => {
  const store = createLiveSessionStore({ model: "a" });
  store.setLiveMeta({ model: "b" });
  const state = store.getState();
  assert.equal(state.liveMeta.model, "b");
  assert.ok(Array.isArray(state.readWhileWaiting));
});
