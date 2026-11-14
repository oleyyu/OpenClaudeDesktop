import test from "node:test";
import assert from "node:assert/strict";
import { buildTurnCopyFooters, turnCopyText, TURN_COPY_FEEDBACK_MS } from "../src/turn-copy-model.mjs";
const item = (id, turnId, type, text = "") => ({ id, turnId, type, text });

test("tools between multiple texts produce one turn-tail footer with exact paragraph joining", () => {
  const items = [
    item("user", "t1", "userMessage", "Do not copy prompt"),
    item("a", "t1", "agentMessage", " First  \n"),
    item("tool", "t1", "commandExecution", "Do not copy output"),
    item("b", "t1", "agentMessage", "\n Second \t"),
    item("last-tool", "t1", "fileChange", "Do not copy diff"),
  ];
  assert.deepEqual(buildTurnCopyFooters(items), [{
    turnId: "t1", anchorItemId: "last-tool", text: "First  \n\n\n\n Second",
  }]);
});

test("empty text fragments retain source separators; only complete payload edges trim", () => {
  assert.equal(turnCopyText([
    item("a", "t", "agentMessage", "  A "),
    item("empty", "t", "agentMessage", ""),
    item("b", "t", "agentMessage", " B  "),
  ]), "A \n\n\n\n B");
});

test("an in-flight turn has no footer even after an individual message completed", () => {
  const items = [item("a", "old", "agentMessage", "Old"),
    { ...item("b", "live", "agentMessage", "Still working"), status: "completed" },
    item("tool", "live", "commandExecution")];
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: "live", isResponding: true }), [
    { turnId: "old", anchorItemId: "a", text: "Old" },
  ]);
  assert.equal(buildTurnCopyFooters(items, { isResponding: true }).length, 1);
  assert.equal(buildTurnCopyFooters(items, { activeTurnId: null, isResponding: false }).length, 2);
});

test("a new pending user turn does not hide an earlier finished turn", () => {
  const items = [item("a", "done", "agentMessage", "Done"), item("user", "next", "userMessage")];
  assert.equal(buildTurnCopyFooters(items, { activeTurnId: "next", isResponding: true }).length, 1);
});

test("a known active ID wins a contradictory responding flag; actual completion clears it", () => {
  const items = [item("old", "done", "agentMessage", "Earlier finished turn"),
    item("current", "live", "agentMessage", "Text complete while tools continue")];
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: "live", isResponding: false }).map(entry => entry.turnId), ["done"]);
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: null, isResponding: false }).map(entry => entry.turnId), ["done", "live"]);
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: "next-awaiting-items", isResponding: true }).map(entry => entry.turnId), ["done", "live"]);
});

test("a real delta-before-resume turn identity suppresses only that live turn", () => {
  const items = [item("live-text", "delta-turn", "agentMessage", "First delta"),
    item("old-history", "finished", "agentMessage", "Later hydrated finished history")];
  assert.deepEqual(buildTurnCopyFooters(items, { streamingTurnIds: ["delta-turn"], isResponding: false }).map(entry => entry.turnId), ["finished"]);
  assert.deepEqual(buildTurnCopyFooters(items, { streamingTurnIds: new Set(["delta-turn"]), isResponding: true }).map(entry => entry.turnId), ["finished"]);
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: "finished", streamingTurnIds: ["delta-turn"] }), []);
});

test("an early streaming tool keeps its turn hidden after its text completed", () => {
  const items = [item("old", "finished", "agentMessage", "Old completed answer"),
    { ...item("text", "tool-first", "agentMessage", "Text done"), status: "completed" },
    { ...item("tool", "tool-first", "commandExecution"), status: "inProgress" }];
  assert.deepEqual(buildTurnCopyFooters(items, { streamingTurnIds: ["tool-first"] }).map(entry => entry.turnId), ["finished"]);
  assert.deepEqual(buildTurnCopyFooters(items, { activeTurnId: null, streamingTurnIds: [] }).map(entry => entry.turnId), ["finished", "tool-first"]);
});

test("reasoning, plans, tools and user content cannot create or enter Copy text", () => {
  const items = [item("r", "t", "reasoning", "Private reasoning"),
    item("p", "t", "plan", "Plan"), item("tool", "t", "commandExecution", "Output")];
  assert.deepEqual(buildTurnCopyFooters(items), []);
  assert.equal(turnCopyText(items), "");
});

test("unknown IDs are omitted and late same-turn items do not create duplicate controls", () => {
  const items = [item("a", "t1", "agentMessage", "First"),
    item("unknown", undefined, "agentMessage", "Uncertain identity"),
    item("b", "t2", "agentMessage", "Second"),
    item("late", "t1", "agentMessage", "Late")];
  const footers = buildTurnCopyFooters(items);
  assert.equal(footers.length, 2);
  assert.deepEqual(footers.find(entry => entry.turnId === "t1"), {
    turnId: "t1", anchorItemId: "late", text: "First\n\nLate",
  });
  assert.equal(footers.some(entry => entry.text.includes("Uncertain")), false);
});

test("new state snapshots update copy payload without mutating old items", () => {
  const initial = Object.freeze(item("a", "t", "agentMessage", "A"));
  const before = buildTurnCopyFooters([initial]);
  const after = buildTurnCopyFooters([{ ...initial, text: "A updated" }]);
  assert.equal(before[0].text, "A");
  assert.equal(after[0].text, "A updated");
  assert.equal(TURN_COPY_FEEDBACK_MS, 2000);
});
