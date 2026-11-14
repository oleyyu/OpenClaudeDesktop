import test from "node:test";
import assert from "node:assert/strict";
import { emptyApprovalTransport, reduceApprovalTransport as reduce } from "../src/approval-state.js";
import { visibleApprovals } from "../src/approval-draft-model.mjs";
const empty = () => ({ ...emptyApprovalTransport, approvals: [], unrelated: "retained" });
const begin = (connectionId = "connection-a", connectionEpoch = 1) => ({ kind: "approval-connection", connectionId, connectionEpoch, revision: 0 });
const request = (instanceId, revision, extra = {}) => ({
  kind: "request", id: 7, method: "item/tool/requestUserInput", params: { threadId: "thread-a" },
  bridgeApproval: { connectionId: "connection-a", instanceId }, approvalConnectionEpoch: 1,
  approvalRevision: revision, ...extra,
});
const resolution = (source, revision) => ({ kind: "resolved", id: source.id, bridgeApproval: source.bridgeApproval, approvalConnectionEpoch: source.approvalConnectionEpoch, approvalRevision: revision });
const snapshot = (pending, revision, extra = {}) => ({ kind: "approval-snapshot", connectionId: "connection-a", connectionEpoch: 1, revision, closed: false, pending, ...extra });

test("a delayed resolution cannot remove a new instance sharing the same typed ID", () => {
  const old = request("old", 1), current = request("current", 3);
  let state = reduce(empty(), begin());
  state = reduce(state, old);
  state = reduce(state, resolution(old, 2));
  state = reduce(state, current);
  assert.equal(reduce(state, resolution(old, 2)), state);
  state = reduce(state, resolution(old, 4));
  assert.deepEqual(state.approvals, [current]);
  assert.equal(reduce(state, { kind: "resolved", id: 7 }), state);
  assert.equal(reduce(state, { method: "serverRequest/resolved", params: { requestId: 7, threadId: "thread-a" } }), state);
});

test("an old init pending snapshot cannot revive a resolved or replace a newer request", () => {
  const old = request("old", 1), current = request("current", 3);
  let state = reduce(empty(), old); // Missing the begin event is recoverable.
  const captured = snapshot([structuredClone(old)], 1);
  state = reduce(state, resolution(old, 2));
  assert.equal(reduce(state, captured), state);
  state = reduce(state, current);
  assert.equal(reduce(state, captured), state);
  assert.deepEqual(state.approvals, [current]);
});

test("snapshot restores first mount and preserves existing objects for stable draft identity", () => {
  const first = request("first", 1), second = request("second", 2, { id: "7" });
  let state = reduce(empty(), snapshot([first], 1));
  assert.equal(state.approvals[0], first);
  const same = reduce(state, snapshot([structuredClone(first)], 1));
  assert.equal(same.approvals[0], first);
  state = reduce(same, snapshot([structuredClone(first), second], 2));
  assert.equal(state.approvals[0], first);
  assert.equal(state.approvals[1], second);
  assert.equal(state.unrelated, "retained");
});

test("a newer connection wins over queued old begin, invalidation, snapshot and request", () => {
  const previous = request("previous", 1);
  let state = reduce(empty(), previous);
  const current = request("current", 1, { bridgeApproval: { connectionId: "connection-b", instanceId: "current" }, approvalConnectionEpoch: 2 });
  state = reduce(state, snapshot([current], 1, { connectionId: "connection-b", connectionEpoch: 2 }));
  for (const old of [begin(), previous, snapshot([previous], 1), { kind: "approval-invalidated", connectionId: "connection-a", connectionEpoch: 1, revision: 2 }])
    assert.equal(reduce(state, old), state);
  assert.deepEqual(state.approvals, [current]);
  assert.equal(reduce(state, begin("wrong-same-epoch", 2)), state);
});

test("disconnect clears once and blocks same-connection resurrection until a new connection starts", () => {
  let state = reduce(empty(), request("old", 1));
  state = reduce(state, { kind: "approval-invalidated", connectionId: "connection-a", connectionEpoch: 1, revision: 2 });
  assert.deepEqual(state.approvals, []);
  assert.equal(state.approvalClosed, true);
  assert.equal(reduce(state, request("delayed", 1)), state);
  assert.equal(reduce(state, request("invalid-later", 3)), state);
  assert.equal(reduce(state, snapshot([request("invalid-later", 3)], 3)), state);
  state = reduce(state, begin("connection-b", 2));
  assert.equal(state.approvalClosed, false);
  assert.equal(state.approvalRevision, 0);
});

test("typed IDs are independent and only an exact identity can resolve either", () => {
  const numeric = request("numeric", 1), string = request("string", 2, { id: "7" });
  let state = reduce(reduce(empty(), numeric), string);
  assert.deepEqual(state.approvals.map(item => item.id), [7, "7"]);
  state = reduce(state, resolution(numeric, 3));
  assert.deepEqual(state.approvals, [string]);
});

test("unrelated turn events remain the main reducer's responsibility", () => {
  const state = reduce(empty(), request("current", 1));
  assert.equal(reduce(state, { method: "turn/completed", params: { threadId: "thread-a", turn: { id: "old" } } }), undefined);
  assert.equal(reduce(state, { kind: "connection", connected: false }), undefined);
});


test("first observed mutation restores older pending requests before a delayed init reply", () => {
  const first = request("first", 1), second = request("second", 2, { id: 8 });
  const delayedInit = snapshot([structuredClone(first)], 1);
  const arrived = { ...second, approvalSnapshot: snapshot([first, second], 2) };
  let state = reduce(empty(), JSON.parse(JSON.stringify(arrived)));
  assert.deepEqual(state.approvals.map(value => value.bridgeApproval.instanceId), ["first", "second"]);
  const stableFirst = state.approvals[0];
  assert.equal(reduce(state, delayedInit), state);
  state = reduce(state, { ...resolution(second, 3), approvalSnapshot: snapshot([structuredClone(first)], 3) });
  assert.deepEqual(state.approvals, [stableFirst]);
  assert.equal(state.approvals[0], stableFirst, "Complete snapshots retain the current request object");
});

test("first observed resolution restores the other pending request and cannot resurrect its old peer", () => {
  const first = request("first", 1), second = request("second", 2, { id: 8 });
  const delayedInit = snapshot([first, second], 2);
  let state = reduce(empty(), { ...resolution(first, 3), approvalSnapshot: snapshot([second], 3) });
  assert.deepEqual(state.approvals, [second]);
  assert.equal(reduce(state, delayedInit), state);
  state = reduce(state, { kind: "approval-invalidated", connectionId: "connection-a", connectionEpoch: 1, revision: 4,
    approvalSnapshot: snapshot([], 4, { closed: true }) });
  assert.equal(reduce(state, delayedInit), state);
  assert.deepEqual(state.approvals, []);
});

test("R07 one card at a time: approvals keep arrival order, so the head is the oldest and the next one takes over when it resolves", () => {
  const a = request("A", 1, { id: "a", params: { threadId: "thread-a", questions: [{ id: "q", question: "First?", options: [{ label: "x" }] }] } });
  const b = request("B", 2, { id: "b", method: "item/commandExecution/requestApproval", params: { threadId: "thread-a", turnId: "t", itemId: "i" } });
  const c = request("C", 3, { id: "c", method: "item/commandExecution/requestApproval", params: { threadId: "thread-a", turnId: "t", itemId: "j" } });
  let state = reduce(empty(), begin());
  for (const next of [a, b, c]) state = reduce(state, next);
  assert.deepEqual(state.approvals.map(entry => entry.id), ["a", "b", "c"]);
  assert.deepEqual(visibleApprovals(state.approvals).map(entry => entry.id), ["a"]);
  // A replayed request keeps its place (main's snapshot order); resolving the head promotes B.
  state = reduce(state, snapshot([a, b, c], 4));
  assert.deepEqual(visibleApprovals(state.approvals).map(entry => entry.id), ["a"]);
  state = reduce(state, resolution(a, 5));
  assert.deepEqual(visibleApprovals(state.approvals).map(entry => entry.id), ["b"]);
  state = reduce(state, resolution(c, 6));
  assert.deepEqual(visibleApprovals(state.approvals).map(entry => entry.id), ["b"]);
  state = reduce(state, resolution(b, 7));
  assert.deepEqual(visibleApprovals(state.approvals), []);
});
