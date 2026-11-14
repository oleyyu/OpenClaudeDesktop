import test from "node:test";
import assert from "node:assert/strict";
import { retryingLabel, retryingStatus, transcriptStatusPresentation as status } from "../src/transcript-status-model.mjs";
import { emptyState, reduce } from "../src/state.js";

const ready = { sessionKey: "thread-a", ready: true, connected: true };

test("home and loading do not add a status row even if obsolete busy flags remain", () => {
  assert.equal(status({ ...ready, sessionKey: null, running: true }).visible, false);
  assert.equal(status({ ...ready, ready: false, running: true }).visible, false);
  assert.equal(status().visible, false);
});

test("completed and empty loaded threads retain one silent idle presentation", () => {
  const idle = status(ready);
  assert.equal(idle.visible, true);
  assert.equal(idle.phase, "idle");
  assert.equal(idle.label, "");
  assert.equal(idle.announce, false);
  assert.equal(idle.busy, false);
  assert.equal(status({ ...ready, stopping: true }), idle);
});

test("real running and owned stop state announce accurately without a timer", () => {
  assert.equal(status({ ...ready, running: true }).label, "Working…");
  const stopping = status({ ...ready, running: true, stopping: true });
  assert.equal(stopping.label, "Stopping…");
  assert.equal(stopping.busy, true);
  assert.equal(stopping.announce, true);
  assert.equal(status({ ...ready, running: false, stopping: true }).phase, "idle");
});

test("visible approval replaces the row; noninline approval never says Working", () => {
  const inline = status({ ...ready, running: true, stopping: true, waiting: true, approvalVisible: true });
  assert.equal(inline.phase, "approval");
  assert.equal(inline.visible, false);
  assert.equal(inline.announce, false);
  const waiting = status({ ...ready, running: true, waiting: true });
  assert.equal(waiting.label, "Waiting for your approval");
  assert.equal(waiting.busy, false);
  assert.equal(waiting.announce, true);
});

test("disconnection suppresses stale running, stopping and approval claims", () => {
  const next = status({ ...ready, connected: false, running: true, stopping: true, waiting: true, approvalVisible: true });
  assert.equal(next.phase, "idle");
  assert.equal(next.label, "");
  assert.equal(next.busy, false);
  assert.equal(next.announce, false);
});

test("real reducer terminal/error transitions leave the error alert with its owner", () => {
  for (const outcome of ["completed", "interrupted", "failed"]) {
    let state = reduce(emptyState, { event: { method: "turn/started", params: { threadId: "thread-a", turn: { id: "turn-a" } } } });
    assert.equal(status({ ...ready, running: !!state.active["thread-a"] }).phase, "running");
    state = reduce(state, { event: { method: "turn/completed", params: { threadId: "thread-a", turn: { id: "turn-a", status: outcome, error: outcome === "failed" ? { message: "Actual fixture failure" } : null } } } });
    const tail = status({ ...ready, running: !!state.active["thread-a"], stopping: true });
    assert.equal(tail.phase, "idle");
    assert.equal(tail.announce, false);
    // 0.2.94: a turn-scoped failure belongs to that turn (turn-error card), not the thread-wide alert.
    assert.equal(state.errors["thread-a"], null);
    assert.equal(state.turnErrors["thread-a"]?.["turn-a"]?.message ?? null, outcome === "failed" ? "Actual fixture failure" : null);
  }
});

test("a nonterminal Codex error is not inferred to end an active turn", () => {
  let state = reduce(emptyState, { event: { method: "turn/started", params: { threadId: "thread-a", turn: { id: "turn-a" } } } });
  state = reduce(state, { event: { method: "error", params: { threadId: "thread-a", error: { message: "Actual recoverable error" } } } });
  // R08: the thread-wide error keeps its TurnError shape (transcript-tail card).
  assert.equal(state.errors["thread-a"].message, "Actual recoverable error");
  assert.equal(status({ ...ready, running: !!state.active["thread-a"] }).phase, "running");
});

test("a DeepSeek retry with counts reads \"{short error} · Retrying (n/max)\" (scroll-messages-current.js:58388)", () => {
  let state = reduce(emptyState, { event: { method: "turn/started", params: { threadId: "thread-a", turn: { id: "turn-a" } } } });
  state = reduce(state, { event: { method: "error", params: { threadId: "thread-a", turnId: "turn-a", willRetry: true,
    error: { message: "Too many requests", codexErrorInfo: "rateLimitExceeded", additionalDetails: "RATE_LIMIT" }, retry: { attempt: 1, maxRetries: 5 } } } });
  assert.deepEqual([state.retrying["thread-a"].attempt, state.retrying["thread-a"].maxRetries], [1, 5]);
  const view = status({ ...ready, running: true, retrying: retryingStatus(state.retrying["thread-a"]) });
  assert.equal(view.label, "Rate limited · Retrying (1/5)");
  assert.deepEqual(view.retry, { error: "Rate limited", label: "Retrying (1/5)", later: null, detail: null, link: null });
  // OpenCode's usage-limit retry (codeDesktop nextAt + action): the next try's time, the cause and the remedy link.
  const later = reduce(state, { event: { method: "error", params: { threadId: "thread-a", turnId: "turn-a", willRetry: true,
    error: { message: "Weekly usage limit reached.", codexErrorInfo: "usageLimitExceeded" }, retry: { attempt: 1, maxRetries: 5 },
    codeDesktop: { nextAt: 10_000_000, action: { title: "Go limit reached", message: "Resets in 1 hour", label: "Add balance", link: "https://opencode.ai/workspace/w/go" } } } } });
  const long = retryingStatus(later.retrying["thread-a"], { now: 10_000_000 - 3_600_000 });
  assert.match(long.later, /^Next try at /);
  assert.equal(long.detail, "Go limit reached — Resets in 1 hour");
  assert.deepEqual(long.link, { url: "https://opencode.ai/workspace/w/go", label: "Add balance" });
  assert.match(status({ ...ready, running: true, retrying: long }).label, /^Rate limited · Retrying \(1\/5\) · Next try at .+ · Go limit reached — Resets in 1 hour$/);
  assert.equal(retryingStatus({ ...later.retrying["thread-a"], action: { link: "javascript:alert(1)" } }).link, null);
  // No maximum (an unbounded policy) or no counts at all (Codex): today's label.
  assert.equal(status({ ...ready, running: true, retrying: { error: "Rate limited", attempt: 7, maxRetries: null } }).label, "Rate limited · Retrying…");
  assert.equal(status({ ...ready, running: true, retrying: retryingStatus({ codexErrorInfo: null }) }).label, "Request failed · Retrying…");
  assert.equal(status({ ...ready, running: true, retrying: "Rate limited" }).label, "Rate limited · Retrying…");
  assert.equal(retryingStatus(null), null);
  for (const [attempt, max] of [[0, 5], [1, 0], ["1", 5], [1.5, 5], [null, null]]) assert.equal(retryingLabel(attempt, max), "Retrying…");
  // Malformed counts from the wire are dropped by the reducer.
  const odd = reduce(state, { event: { method: "error", params: { threadId: "thread-a", turnId: "turn-a", willRetry: true, error: { message: "x" }, retry: { attempt: "2", maxRetries: -1 } } } });
  assert.deepEqual([odd.retrying["thread-a"].attempt, odd.retrying["thread-a"].maxRetries], [null, null]);
});

test("thread switching reads only the new owner's active state", () => {
  const state = reduce(emptyState, { event: { method: "turn/started", params: { threadId: "thread-a", turn: { id: "turn-a" } } } });
  assert.equal(status({ ...ready, sessionKey: "thread-b", running: !!state.active["thread-b"] }).phase, "idle");
});

test("Whe holds the last running count as finished for exactly 1500ms, then clears", async (t) => {
  const { createFinishedTaskHold, FINISHED_TASK_HOLD_MS } = await import("../src/transcript-status-model.mjs");
  assert.equal(FINISHED_TASK_HOLD_MS, 1500);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let changes = 0;
  const hold = createFinishedTaskHold(() => { changes += 1; });
  hold.update(0, "a"); assert.equal(hold.finished(0, "a"), 0, "no hold before any task ran");
  hold.update(1, "a"); hold.update(2, "a");
  assert.equal(hold.finished(2, "a"), 0, "running counts are never reported as finished");
  assert.equal(hold.finished(0, "a"), 2, "the render where running drops reads the last non-zero count");
  hold.update(0, "a");
  t.mock.timers.tick(FINISHED_TASK_HOLD_MS - 1);
  assert.equal(hold.finished(0, "a"), 2); assert.equal(changes, 0);
  t.mock.timers.tick(1);
  assert.equal(hold.finished(0, "a"), 0); assert.equal(changes, 1);
  // A restart cancels the pending clear; a different session never inherits the hold.
  hold.update(1, "a"); hold.update(0, "a"); t.mock.timers.tick(1000); hold.update(1, "a");
  t.mock.timers.tick(1000); assert.equal(hold.finished(0, "a"), 1); assert.equal(changes, 1);
  assert.equal(hold.finished(0, "b"), 0);
  hold.update(0, "b"); assert.equal(hold.finished(0, "b"), 0);
  t.mock.timers.tick(FINISHED_TASK_HOLD_MS); assert.equal(changes, 1, "the reset owner arms no timer");
  hold.update(1, "b"); hold.update(0, "b"); hold.dispose(); t.mock.timers.tick(FINISHED_TASK_HOLD_MS);
  assert.equal(changes, 1, "dispose cancels the pending clear");
});
