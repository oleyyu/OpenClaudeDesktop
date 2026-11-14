import test from "node:test";
import assert from "node:assert/strict";
import { REWIND_LABEL_LIMIT, REWIND_PREVIEW_DELAY_MS, REWIND_TARGET_TEXT_LIMIT, rewindLabel, rewindPickerMove, rewindPickerStart, rewindPreview,
  rewindRequestStep, rewindRestoreItems, rewindRestoresFiles, rewindTargetText, turnRows } from "../src/rewind-flow-model.mjs";

const edit = (turnId, path, diff, kind = "update") => ({ id: `${turnId}-${path}`, turnId, type: "fileChange", status: "completed", changes: [{ path, kind: { type: kind }, diff }] });
const user = (turnId, text) => ({ id: `${turnId}-u`, turnId, type: "userMessage", content: [{ type: "text", text }] });

test("caec4a2d4 vi: picker labels collapse whitespace and cut at 80 characters with an ellipsis", () => {
  assert.equal(REWIND_LABEL_LIMIT, 80);
  assert.equal(rewindLabel("  fix\n\nthe   bug  "), "fix the bug");
  assert.equal(rewindLabel("x".repeat(81)), `${"x".repeat(80)}…`);
  assert.equal(rewindLabel("x".repeat(80)), "x".repeat(80));
  assert.equal(rewindLabel(null), "");
});

test("K1 G1: the confirm quotes the trimmed message, at most 600 characters", () => {
  assert.equal(REWIND_TARGET_TEXT_LIMIT, 600);
  assert.equal(rewindTargetText("  hi \n"), "hi");
  assert.equal(rewindTargetText("y".repeat(700)).length, 600);
});

test("K1 g: Restore choices; Code only only where a core can restore files without the conversation cut", () => {
  assert.deepEqual(rewindRestoreItems().map((item) => [item.value, item.label]), [["both", "Code and conversation"], ["conversation", "Conversation only"]]);
  assert.deepEqual(rewindRestoreItems({ codeOnly: true }).map((item) => item.value), ["both", "conversation", "code"]);
  assert.equal(rewindRestoresFiles("both"), true);
  assert.equal(rewindRestoresFiles("code"), true);
  assert.equal(rewindRestoresFiles("conversation"), false);
});

test("bi: the file check sums the agent edits of the target turn and every later turn", () => {
  const items = [
    user("t1", "first"), edit("t1", "/w/early.js", "@@ -1 +1 @@\n-a\n+b\n"),
    user("t2", "second"), edit("t2", "/w/a.js", "@@ -1 +1,2 @@\n-x\n+y\n+z\n"),
    user("t3", "third"), edit("t3", "/w/a.js", "@@ -1 +1 @@\n-y\n+q\n"), edit("t3", "/w/new.js", "one\ntwo\n", "add"),
  ];
  assert.deepEqual(rewindPreview(items, "t2"), { filesChanged: ["/w/a.js", "/w/new.js"], insertions: 5, deletions: 2 });
  assert.deepEqual(rewindPreview(items, "t1").filesChanged, ["/w/early.js", "/w/a.js", "/w/new.js"]);
  assert.equal(rewindPreview([user("t1", "a"), { id: "c", turnId: "t1", type: "commandExecution" }], "t1"), null, "no edits: nothing to restore");
  assert.equal(rewindPreview(items, "missing"), null);
  assert.equal(rewindPreview([{ ...edit("t1", "/w/a.js", "@@ -1 +1 @@\n-a\n+b\n"), status: "failed" }], "t1"), null, "only completed edits");
});

test("turnRows: loaded turns become transcript rows carrying their turn id", () => {
  const rows = turnRows([{ id: "t1", items: [{ id: "a", type: "userMessage" }] }, { id: "t2", items: [{ id: "b", turnId: "t2" }] }]);
  assert.deepEqual(rows.map((row) => [row.id, row.turnId]), [["a", "t1"], ["b", "t2"]]);
  assert.deepEqual(turnRows(null), []);
});

test("G4 requestRewind: confirm with files to restore, confirm 'none' after a slow check, otherwise rewind at once", () => {
  const preview = { filesChanged: ["/a"], insertions: 1, deletions: 0 };
  assert.deepEqual(rewindRequestStep({ preview, elapsedMs: 0 }), { step: "confirm", preview });
  assert.deepEqual(rewindRequestStep({ preview: null, elapsedMs: REWIND_PREVIEW_DELAY_MS }), { step: "confirm", preview: "none" });
  assert.deepEqual(rewindRequestStep({ preview: null, elapsedMs: 12 }), { step: "direct" });
  assert.deepEqual(rewindRequestStep({ preview: "restoring" }), { step: "restoring" });
  assert.equal(REWIND_PREVIEW_DELAY_MS, 400);
});

test("J1: the picker starts on the latest message; arrows move and clamp, other keys are not the picker's", () => {
  assert.equal(rewindPickerStart(3), 2);
  assert.equal(rewindPickerStart(0), 0);
  assert.equal(rewindPickerMove("ArrowDown", 1, 3), 2);
  assert.equal(rewindPickerMove("ArrowDown", 2, 3), 2);
  assert.equal(rewindPickerMove("ArrowUp", 0, 3), 0);
  assert.equal(rewindPickerMove("ArrowUp", 2, 3), 1);
  assert.equal(rewindPickerMove("Enter", 1, 3), null);
});
