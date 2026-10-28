import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyQueue, submitLane, queueFromList, previewText, queuedCountLabel, lockEntry, unlockEntry,
  optimisticRemove, reorderEntries, optimisticReorder, editableDraft, isNotSteerable, lastDequeueable,
  canSendNow, restoredOrder,
} from "../src/queued-messages-model.mjs";

const text = (value) => ({ type: "text", text: value, text_elements: [] });
const list = { data: [
  { id: "q1", input: [text("first")], clientUserMessageId: "c1" },
  { id: "q2", input: [text("second"), { type: "localImage", path: "/tmp/a.png" }], clientUserMessageId: "c2" },
], nextCursor: null };

test("lanes: Enter while running steers, Cmd+Enter queues, idle is a plain send", () => {
  assert.equal(submitLane({ running: false, priority: "later" }), "send");
  assert.equal(submitLane({ running: true }), "next");
  assert.equal(submitLane({ running: true, priority: "next" }), "next");
  assert.equal(submitLane({ running: true, priority: "later" }), "later");
  assert.equal(submitLane({ running: true, stayOnDraft: true }), "later");
});

test("queue list normalizes real QueuedSubmission entries and keeps live locks only", () => {
  const previous = { ...emptyQueue("t"), lockedIds: ["q2", "gone"], revision: 3 };
  const queue = queueFromList(list, "t", previous);
  assert.deepEqual(queue.entries.map((entry) => [entry.id, entry.preview]), [["q1", "first"], ["q2", "second [Image]"]]);
  assert.deepEqual(queue.lockedIds, ["q2"]);
  assert.equal(queue.revision, 4);
  assert.deepEqual(queueFromList({ unexpected: true }, "t").entries, []);
  assert.deepEqual(queueFromList({ data: [{ id: 1 }, { id: "x" }] }, "t").entries, [], "malformed entries are dropped, never invented");
});

test("preview text and count labels follow the official copy", () => {
  assert.equal(previewText([text("  a   b "), { type: "mention", name: "f.md", path: "/f.md" }]), "a b @f.md");
  assert.equal(previewText([]), "…");
  assert.equal(queuedCountLabel(1), "1 message queued");
  assert.equal(queuedCountLabel(2), "2 messages queued");
});

test("optimistic remove restores at the original index on rollback", () => {
  const queue = queueFromList(list, "t");
  const { queue: removed, rollback } = optimisticRemove(queue, "q1");
  assert.deepEqual(removed.entries.map((entry) => entry.id), ["q2"]);
  assert.deepEqual(rollback().entries.map((entry) => entry.id), ["q1", "q2"]);
  const later = { ...removed, entries: [...removed.entries, { id: "q3", input: [], preview: "…" }] };
  assert.deepEqual(rollback(later).entries.map((entry) => entry.id), ["q1", "q2", "q3"]);
  assert.equal(optimisticRemove(queue, "missing").queue, queue);
  assert.deepEqual(lockEntry(queue, "q1").lockedIds, ["q1"]);
  assert.deepEqual(unlockEntry(lockEntry(queue, "q1"), "q1").lockedIds, []);
  assert.equal(lockEntry(queue, "missing"), queue);
});

test("reorder moves an entry to the target slot with rollback ids", () => {
  const queue = queueFromList(list, "t");
  assert.deepEqual(reorderEntries(queue.entries, "q2", "q1").map((entry) => entry.id), ["q2", "q1"]);
  const { queue: moved, rollback, ids } = optimisticReorder(queue, "q2", "q1");
  assert.deepEqual(ids, ["q2", "q1"]);
  assert.deepEqual(rollback(moved).entries.map((entry) => entry.id), ["q1", "q2"]);
  assert.equal(optimisticReorder(queue, "q1", "q1").queue, queue);
});

test("a failed reorder undoes only the move: entries that arrived or left meanwhile are kept as they are", () => {
  // Like optimisticRemove's rollback: the queue the RPC failure meets may already hold a new message (q3) or have sent
  // one (q1 left the queue for the running turn); undoing the move must not drop q3 or bring q1 back.
  const queue = queueFromList(list, "t");
  const { queue: moved, rollback } = optimisticReorder(queue, "q2", "q1");
  const arrived = { ...moved, entries: [...moved.entries, { id: "q3", input: [], preview: "…" }] };
  assert.deepEqual(rollback(arrived).entries.map((entry) => entry.id), ["q1", "q2", "q3"]);
  const sent = { ...moved, entries: moved.entries.filter((entry) => entry.id !== "q1") };
  assert.deepEqual(rollback(sent).entries.map((entry) => entry.id), ["q2"]);
});

test("edit in composer restores the text and re-stageable file parts", () => {
  const queue = queueFromList(list, "t");
  assert.deepEqual(editableDraft(queue.entries[1]), { text: "second", attachments: [{ type: "localImage", path: "/tmp/a.png" }] });
});

test("notSteerable detection reads the Codex error message or data", () => {
  assert.equal(isNotSteerable({ message: "active turn is not steerable" }), true);
  assert.equal(isNotSteerable({ message: "x", data: { codexErrorInfo: { activeTurnNotSteerable: { turnKind: "review" } } } }), true);
  assert.equal(isNotSteerable({ message: "expected active turn id `a` but found `b`" }), false);
});

test("the DeepSeek bridge queue shape lists with previews; its steer refusal falls back to the queue", () => {
  // harness queue.js toQueuedSubmission: the remembered Codex parts, or text
  // parts rebuilt from the message with a null client id after a restart.
  const bridge = { data: [
    { id: "msg-1", input: [text("look"), { type: "localImage", path: "/tmp/shot.png" }], clientUserMessageId: "c1" },
    { id: "msg-2", input: [text("from before a restart")], clientUserMessageId: null },
  ], nextCursor: null };
  const queue = queueFromList(bridge, "t");
  assert.deepEqual(queue.entries.map((entry) => [entry.id, entry.preview, entry.clientUserMessageId]), [["msg-1", "look [Image]", "c1"], ["msg-2", "from before a restart", null]]);
  assert.equal(isNotSteerable({ message: "No active turn to steer.", data: { codexErrorInfo: "activeTurnNotSteerable" } }), true);
  assert.equal(isNotSteerable({ message: "A compaction turn cannot be steered.", data: { codexErrorInfo: "activeTurnNotSteerable" } }), true);
  assert.equal(isNotSteerable({ message: "Unknown session: x", data: null }), false);
});

// Fidelity F05: ↑ in an empty editor takes back the newest cancellable entry (cc43287c9-BMbiZYzF.js:31152-31156 _o).
test("lastDequeueable: the newest unlocked entry, null for an empty or fully locked queue", () => {
  const queue = queueFromList(list, "t1");
  assert.equal(lastDequeueable(queue).id, "q2");
  assert.equal(lastDequeueable(lockEntry(queue, "q2")).id, "q1", "a locked (in-flight) entry is skipped");
  assert.equal(lastDequeueable(lockEntry(lockEntry(queue, "q2"), "q1")), null);
  assert.equal(lastDequeueable(emptyQueue("t1")), null);
  assert.equal(lastDequeueable(null), null);
});

test("editableDraft restores a queued skill item as its leading /name", () => {
  const skill = { type: "skill", name: "pdf", path: "/s/pdf/SKILL.md" };
  assert.deepEqual(editableDraft({ input: [text("summarize"), skill] }), { text: "/pdf summarize", attachments: [] });
  assert.deepEqual(editableDraft({ input: [skill] }), { text: "/pdf ", attachments: [] });
});

// B05 C3 'Send now' (cf74bc599 nS/oS onSteer; cc43287c9 :38930-38946): only an unlocked entry of a running turn,
// one promotion at a time; a refused steer re-adds the entry and reorders it back to its old slot.
test("Send now is offered for an unlocked entry while a turn runs, one at a time", () => {
  const queue = queueFromList(list, "t");
  assert.equal(canSendNow(queue, "q1", { turnId: "turn-1" }), true);
  assert.equal(canSendNow(queue, "q1", {}), false, "idle: the queue starts the next turn itself");
  assert.equal(canSendNow(queue, "q1", { turnId: "turn-1", connected: false }), false);
  assert.equal(canSendNow(queue, "q1", { turnId: "turn-1", archived: true }), false);
  assert.equal(canSendNow(queue, "q2", { turnId: "turn-1", steeringId: "q1" }), false, "steerBusy lock");
  assert.equal(canSendNow(lockEntry(queue, "q1"), "q1", { turnId: "turn-1" }), false, "in-flight removal");
  assert.equal(canSendNow(queue, "missing", { turnId: "turn-1" }), false);
});

test("a re-added entry is reordered back to its old slot", () => {
  assert.deepEqual(restoredOrder(["a", "b", "new"], "new", 0), ["new", "a", "b"]);
  assert.deepEqual(restoredOrder(["a", "b", "new"], "new", 1), ["a", "new", "b"]);
  assert.equal(restoredOrder(["a", "b", "new"], "new", 2), null, "already last");
  assert.equal(restoredOrder(["a", "new"], "new", 5), null, "an index past the end stays last");
  assert.equal(restoredOrder(["a"], "missing", 0), null);
});
