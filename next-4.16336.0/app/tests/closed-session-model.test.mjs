import test from "node:test";
import assert from "node:assert/strict";
import { CLOSED_SESSION_LIMIT, hasClosedSession, planReopen, popClosedSession, pushClosedSession } from "../src/closed-session-model.mjs";

// ion-dist shared-19-CjdiaR4X.js Kh/qh/Jh and cb24e6301-6olw3OC9.js planReopen.
test("push records newest first and keeps one entry per session (Kh)", () => {
  let stack = pushClosedSession([], "a");
  stack = pushClosedSession(stack, "b");
  assert.deepEqual(stack, ["b", "a"]);
  stack = pushClosedSession(stack, "a");
  assert.deepEqual(stack, ["a", "b"], "closing a session again moves it to the top");
  assert.deepEqual(pushClosedSession(stack, ""), ["a", "b"]);
  assert.deepEqual(pushClosedSession(stack, null), ["a", "b"]);
  assert.deepEqual(pushClosedSession(undefined, "x"), ["x"]);
});

test("the stack is bounded, dropping the oldest entries", () => {
  let stack = [];
  for (let index = 0; index < CLOSED_SESSION_LIMIT + 5; index += 1) stack = pushClosedSession(stack, `s${index}`);
  assert.equal(stack.length, CLOSED_SESSION_LIMIT);
  assert.equal(stack[0], `s${CLOSED_SESSION_LIMIT + 4}`);
  assert.equal(stack.includes("s0"), false);
  assert.deepEqual(pushClosedSession(["a", "b", "c"], "d", { limit: 2 }), ["d", "a"]);
});

test("pop returns the newest existing session and drops the stale ones it skipped (qh)", () => {
  const exists = (id) => id !== "gone";
  assert.deepEqual(popClosedSession(["gone", "b", "a"], exists), { id: "b", stack: ["a"] });
  assert.deepEqual(popClosedSession(["b", "gone", "a"], exists), { id: "b", stack: ["gone", "a"] });
  assert.deepEqual(popClosedSession(["gone"], exists), { id: null, stack: [] });
  assert.deepEqual(popClosedSession([], exists), { id: null, stack: [] });
  assert.deepEqual(popClosedSession(["a"]), { id: "a", stack: [] });
});

test("reopen is enabled while an existing entry remains (Jh)", () => {
  const exists = (id) => id !== "gone";
  assert.equal(hasClosedSession([], exists), false);
  assert.equal(hasClosedSession(["gone"], exists), false);
  assert.equal(hasClosedSession(["gone", "a"], exists), true);
  assert.equal(hasClosedSession(undefined), false);
});

test("planReopen: focus a session already shown, else navigate to it", () => {
  assert.equal(planReopen("a", { currentId: "a" }), "focus");
  assert.equal(planReopen("a", { currentId: "b", openIds: ["a"] }), "focus");
  assert.equal(planReopen("a", { currentId: "b" }), "navigate");
  assert.equal(planReopen("a", { currentId: null }), "navigate");
  assert.equal(planReopen("a"), "navigate");
});
