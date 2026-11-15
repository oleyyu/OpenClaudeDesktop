// D-08: OpenCode and MiMo send jsdiff patches (createTwoFilesPatch: OpenCode 1.x tool/edit.ts and tool/write.ts,
// 2.x core/src/tool/plugin/file-diff.ts). jsdiff's defaults (includeIndex, includeUnderline) open every file with
// `Index: <path>` and a line of 67 `=` before the ---/+++ pair. The parser took those two lines for unsupported
// content: the approval card showed the patch as plain text, the "Edited N files" card and the tool group counted
// +0 −0, the Changes pane dropped every file of a joined turn diff but the last, and after a restart outside git
// the update edits vanished from the Changes pane (an add one became the patch text itself, +12).
//
// The fixtures are jsdiff 9.0.0's own output (harness/node_modules/diff); the last test re-generates them with the
// real jsdiff when the harness is installed next to the app.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { parseUnifiedDiff } from "../src/diff-model.js";
import { changePreview, fileRunCounts } from "../src/file-tool-model.mjs";
import { turnEdits, fileChangesDiff } from "../src/turn-edits-model.mjs";

const UNDERLINE = "=".repeat(67);
const CONFIG = `Index: /w/src/config.ts\n${UNDERLINE}\n--- /w/src/config.ts\n+++ /w/src/config.ts\n@@ -1,4 +1,4 @@\n export const config = {\n-  timeout: 30_000,\n+  timeout: 60_000,\n   retries: 1,\n }\n`;
const RETRY = `Index: /w/src/retry.ts\n${UNDERLINE}\n--- /w/src/retry.ts\n+++ /w/src/retry.ts\n@@ -0,0 +1,2 @@\n+export const retry = 1\n+export const times = 3\n`;
const README = `Index: /w/README.md\n${UNDERLINE}\n--- /w/README.md\n+++ /w/README.md\n@@ -1,3 +1,3 @@\n # Fake\n \n-Run npm install.\n+Run \`npm ci\` then \`npm test\`.\n`;
// createTwoFilesPatch(old, new) with two names: no Index line, the underline alone.
const RENAMED = `${UNDERLINE}\n--- /w/old.md\n+++ /w/new.md\n@@ -1,1 +1,1 @@\n-a\n+b\n`;
// New contents that themselves look like a jsdiff header: they are hunk rows, never a header.
const LOOKALIKE = `Index: /w/notes.md\n${UNDERLINE}\n--- /w/notes.md\n+++ /w/notes.md\n@@ -1,1 +1,5 @@\n Title\n+Index: x\n+=====\n+--- a\n++++ b\n`;

function parse(value) {
  const result = parseUnifiedDiff(value);
  assert.equal(result.sections.map((section) => section.raw).join(""), value, "every byte survives in ordered sections");
  return result;
}
const counts = (result) => result.files.map((file) => [file.path, file.added, file.removed, file.fallbackReason]);
const change = (path, diff, kind = "update") => ({ path, kind: kind === "update" ? { type: "update", move_path: null } : { type: kind }, diff });

test("jsdiff: the Index line and its underline are the file's header, not unsupported content", () => {
  const result = parse(CONFIG);
  assert.equal(result.sections.length, 1, "no raw section is left for the two header lines");
  assert.deepEqual(counts(result), [["/w/src/config.ts", 1, 1, null]]);
  const [file] = result.files;
  assert.equal(file.raw, CONFIG, "the file keeps its whole header for Copy");
  assert.deepEqual(file.hunks[0].rows.map((row) => [row.type, row.oldLine, row.newLine]), [
    ["context", 1, 1], ["removed", 2, null], ["added", null, 2], ["context", 3, 3], ["context", 4, 4],
  ]);
  assert.deepEqual(counts(parse(RETRY)), [["/w/src/retry.ts", 2, 0, null]]);
  assert.deepEqual(counts(parse(RENAMED)), [["/w/new.md", 1, 1, null]], "the underline alone (two names) opens a file too");
  assert.equal(parse(`Index: /w/a\n--- /w/a\n+++ /w/a\n@@ -1 +1 @@\n-a\n+b\n`).files[0].fallbackReason, null, "Index without underline");
});

test("jsdiff: a joined turn diff counts every file on its own (turn/diff/updated)", () => {
  // opencode-bridge projection.js turnDiff joins the per-file patches with "\n".
  const turn = [CONFIG, RETRY, README].join("\n");
  const result = parse(turn);
  assert.deepEqual(counts(result), [["/w/src/config.ts", 1, 1, null], ["/w/src/retry.ts", 2, 0, null], ["/w/README.md", 1, 1, null]]);
  assert.equal(result.sections.filter((section) => section.type === "raw").length, 0);
  // Followed by a git patch, and preceded by one.
  const git = "diff --git a/x b/x\nindex 1..2 100644\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-x\n+y\n";
  assert.deepEqual(counts(parse(CONFIG + git)).map((row) => row.slice(1)), [[1, 1, null], [1, 1, null]]);
  assert.deepEqual(counts(parse(git + RETRY)).map((row) => row.slice(1)), [[1, 1, null], [2, 0, null]]);
  // A file whose patch fell back still ends at the next file's Index header instead of swallowing it.
  const broken = `Index: /w/a\n${UNDERLINE}\n--- /w/a\n+++ /w/a\n@@ -1,2 +1,2 @@\n-a\n+b\n`;
  const after = parse(broken + RETRY);
  assert.match(after.files[0].fallbackReason, /truncated/);
  assert.deepEqual(counts(after)[1], ["/w/src/retry.ts", 2, 0, null]);
});

test("jsdiff: lines of = are taken only right before a ---/+++ pair", () => {
  const prose = "Title\n=====\nbody text\n";
  const result = parse(prose);
  assert.equal(result.files.length, 0);
  assert.deepEqual(result.sections.map((section) => section.type), ["raw"]);
  // An Index line or an underline that does not lead into a pair stays raw, before a real patch as well.
  const lead = parse(`Index: /w/a\nnot a header\n${UNDERLINE}\n\n${CONFIG}`);
  assert.deepEqual(lead.sections.map((section) => section.type), ["raw", "file"]);
  assert.equal(lead.sections[0].raw, `Index: /w/a\nnot a header\n${UNDERLINE}\n\n`);
  // Rows inside a hunk that look like a header are rows of that hunk.
  const look = parse(LOOKALIKE);
  assert.deepEqual(counts(look), [["/w/notes.md", 4, 0, null]]);
  assert.deepEqual(look.files[0].hunks[0].rows.map((row) => row.text), ["Title", "Index: x", "=====", "--- a", "+++ b"]);
});

test("jsdiff: the approval card and the edit row show the colored diff with real counts (changePreview)", () => {
  const edit = changePreview(change("/w/src/config.ts", CONFIG));
  assert.equal(edit.fallback, undefined);
  assert.equal(edit.added, 1);
  assert.equal(edit.removed, 1);
  assert.deepEqual(edit.rows.map((row) => row.type), ["context", "removed", "added", "context", "context"]);
  const write = changePreview(change("/w/src/retry.ts", RETRY, "add"));
  assert.equal(write.fallback, undefined);
  assert.equal(write.added, 2);
  assert.equal(write.pureSide, "added");
  assert.deepEqual(write.rows.map((row) => row.text), ["export const retry = 1", "export const times = 3"], "the header is never taken for file contents");
  assert.deepEqual(fileRunCounts([{ status: "completed", changes: [change("/w/src/config.ts", CONFIG), change("/w/src/retry.ts", RETRY, "add")] }]), { added: 3, removed: 1 });
});

test("jsdiff: the Edited N files card and the Changes pane outside git count and keep every file", () => {
  const items = [
    { id: "e1", turnId: "t1", type: "fileChange", status: "completed", changes: [change("/w/src/config.ts", CONFIG)] },
    { id: "e2", turnId: "t1", type: "fileChange", status: "completed", changes: [change("/w/src/retry.ts", RETRY, "add")] },
    { id: "e3", turnId: "t1", type: "fileChange", status: "completed", changes: [change("/w/README.md", README)] },
  ];
  const card = turnEdits(items).get("t1");
  assert.deepEqual(card.files.map((file) => [file.path, file.additions, file.deletions]), [["/w/src/config.ts", 1, 1], ["/w/src/retry.ts", 2, 0], ["/w/README.md", 1, 1]]);
  assert.deepEqual([card.additions, card.deletions], [4, 2]);
  // Rebuilt from the session's fileChange items (a restart outside git): updates are no longer dropped, and an add
  // is its hunk, not the whole patch text as new contents.
  const pane = fileChangesDiff(items, { cwd: "/w" });
  assert.deepEqual(counts(parse(pane)), [["src/config.ts", 1, 1, null], ["src/retry.ts", 2, 0, null], ["README.md", 1, 1, null]]);
  assert.doesNotMatch(pane, /Index:|^\+=+$/m);
  assert.match(pane, /^diff --git a\/src\/retry\.ts b\/src\/retry\.ts\nnew file mode 100644\n--- \/dev\/null\n\+\+\+ b\/src\/retry\.ts\n@@ -0,0 \+1,2 @@\n/m);
  // File contents that merely start with an Index line are still contents.
  const contents = fileChangesDiff([{ id: "c", turnId: "t2", type: "fileChange", status: "completed", changes: [change("/w/notes.txt", "Index: of terms\nalpha\n", "add")] }], { cwd: "/w" });
  assert.match(contents, /@@ -0,0 \+1,2 @@\n\+Index: of terms\n\+alpha\n/);
});

test("jsdiff: the fixtures match what the real jsdiff writes (when the harness is installed)", (t) => {
  let jsdiff;
  try { jsdiff = createRequire(import.meta.url)("../../harness/node_modules/diff"); } catch { t.skip("harness/node_modules/diff is not installed"); return; }
  const before = "export const config = {\n  timeout: 30_000,\n  retries: 1,\n}\n";
  assert.equal(jsdiff.createTwoFilesPatch("/w/src/config.ts", "/w/src/config.ts", before, before.replace("30_000", "60_000")), CONFIG);
  assert.equal(jsdiff.createTwoFilesPatch("/w/src/retry.ts", "/w/src/retry.ts", "", "export const retry = 1\nexport const times = 3\n"), RETRY);
  assert.equal(jsdiff.createTwoFilesPatch("/w/old.md", "/w/new.md", "a\n", "b\n"), RENAMED);
  // A longer real edit, several hunks.
  const lines = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`);
  const edited = lines.map((line, i) => (i === 3 ? "changed 4" : i === 30 ? "changed 31" : line));
  edited.splice(20, 0, "inserted");
  const patch = jsdiff.createTwoFilesPatch("/w/long.txt", "/w/long.txt", `${lines.join("\n")}\n`, `${edited.join("\n")}\n`);
  const [file] = parse(patch).files;
  assert.equal(file.fallbackReason, null);
  assert.ok(file.hunks.length >= 2);
  assert.deepEqual([file.added, file.removed], [3, 2]);
});
