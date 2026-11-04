// B29 suggested-task backlog: main store (electron/task-backlog.cjs, asar Ca/ga/_a/va) and the Home chips' pure model
// (src/task-backlog-model.mjs, cc43287c9 u0/d0/_0/j0 C).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { backlogDetail, backlogTitle, chipLabel, insertTakenPrompt, restoreItem, withoutItem } from "../src/task-backlog-model.mjs";

const require = createRequire(import.meta.url);
const { createTaskBacklog, prune, validItem, folderKey, publicItem, PER_FOLDER, TOTAL, MAX_AGE_MS } = require("../electron/task-backlog.cjs");

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "task-backlog-"));
const filing = (n, extra = {}) => ({ cwd: "/repo", source: "dismissed", title: `Task ${n}`, tldr: `Why ${n}`, prompt: `Do ${n}`,
  suggestedAt: 1_000_000, originSessionId: "s1", originTaskId: `task_${String(n).padStart(8, "0")}`, ...extra });

test("fileMany keeps one item per origin, lists a folder newest first and persists {version: 1, items}", async () => {
  const dir = tempDir();
  let now = 1_000_000;
  const store = createTaskBacklog({ dataDir: () => dir, now: () => now, platform: "linux" });
  const first = await store.fileMany([filing(1)]);
  assert.equal(first.length, 1);
  assert.match(first[0].id, /^todo_[0-9a-f]{12}$/);
  now += 10;
  assert.equal((await store.fileMany([filing(1), filing(2), filing(3, { cwd: "/other" })])).length, 2, "the same origin is filed once");
  const listed = await store.list("/repo/", 20);
  assert.deepEqual(listed.map((item) => item.title), ["Task 2", "Task 1"], "trailing separator ignored; newest filed first");
  assert.deepEqual((await store.list("/other", 20)).map((item) => item.title), ["Task 3"]);
  assert.deepEqual(Object.keys(publicItem(listed[0])).sort(), ["cwd", "filedAt", "id", "prompt", "source", "suggestedAt", "title", "tldr"]);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, "backlog", "tasks.json"), "utf8"));
  assert.equal(saved.version, 1);
  assert.equal(saved.items.length, 3);
  // A fresh store reads the file back.
  const again = createTaskBacklog({ dataDir: () => dir, now: () => now, platform: "linux" });
  assert.equal((await again.list("/repo", 1)).length, 1, "limit");
  assert.equal((await again.dismiss(listed[0].id)).title, "Task 2");
  assert.equal(await again.dismiss(listed[0].id), null, "already gone");
  assert.equal(await again.dismissByOrigin("s1", "task_00000001"), true);
  assert.deepEqual(await again.list("/repo", 20), []);
});

test("invalid filings are dropped; a newer-version file is left untouched and the store is unavailable", async () => {
  const dir = tempDir();
  const store = createTaskBacklog({ dataDir: () => dir, now: () => 1_000_000, platform: "linux" });
  assert.deepEqual(await store.fileMany([filing(1, { prompt: "  " }), filing(2, { source: "kept" }), filing(3, { cwd: "relative" }), filing(4, { originSessionId: "" })]), []);
  fs.mkdirSync(path.join(dir, "backlog"), { recursive: true });
  fs.writeFileSync(path.join(dir, "backlog", "tasks.json"), JSON.stringify({ version: 2, items: [] }));
  const later = createTaskBacklog({ dataDir: () => dir, now: () => 1_000_000, platform: "linux" });
  assert.deepEqual(await later.list("/repo", 20), []);
  assert.deepEqual(await later.fileMany([filing(1)]), []);
  await assert.rejects(later.dismiss("todo_000000000000"), /Task backlog unavailable/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "backlog", "tasks.json"), "utf8")).version, 2);
});

test("ga: 30-day window, 20 per folder and 100 in all, dropping non-dismissed and older filings first", () => {
  const item = (n, extra = {}) => ({ id: `todo_${String(n).padStart(12, "0")}`, cwd: "/repo", source: "dismissed", prompt: "p", title: "t",
    suggestedAt: 0, filedAt: n, originSessionId: "s", originTaskId: `task_${n}`, ...extra });
  assert.equal(prune([item(1, { suggestedAt: -MAX_AGE_MS })], 0).length, 0, "older than 30 days");
  const many = Array.from({ length: PER_FOLDER + 2 }, (_, n) => item(n + 1, n === 3 ? { source: "orphaned" } : {}));
  const kept = prune(many, 100, "linux");
  assert.equal(kept.length, PER_FOLDER);
  assert.ok(!kept.some((entry) => entry.source === "orphaned"), "a non-dismissed item goes first");
  assert.ok(!kept.some((entry) => entry.filedAt === 1), "then the oldest filed");
  const spread = Array.from({ length: TOTAL + 5 }, (_, n) => item(n + 1, { cwd: `/repo${n % 10}` }));
  assert.equal(prune(spread, 1000, "linux").length, TOTAL);
  assert.equal(validItem(item(1)), true);
  assert.equal(validItem({ ...item(1), id: "nope" }), false);
  assert.equal(folderKey("/Repo/", "darwin"), "/repo");
  assert.equal(folderKey("/Repo/", "linux"), "/Repo");
});

test("chips: u0 title fallback, d0 tldr, _0 eight words, o0 age", () => {
  assert.equal(backlogTitle({ title: "  Fix   the  flaky test " }), "Fix the flaky test");
  assert.equal(backlogTitle({ prompt: "First line\nsecond" }), "First line");
  assert.equal(backlogTitle({ prompt: "" }), "Untitled task");
  assert.equal(backlogDetail({ tldr: " why\nnow " }), "why now");
  assert.equal(backlogDetail({}), "");
  assert.equal(chipLabel("one two three four five six seven eight"), "one two three four five six seven eight");
  assert.equal(chipLabel("one two three four five six seven eight nine"), "one two three four five six seven eight…");
});

test("j0 take: a blank box takes the prompt; otherwise it follows a blank line; never in bash mode", () => {
  assert.deepEqual(insertTakenPrompt("", "  Do it\r\n"), { draft: "Do it", caret: 0 });
  assert.deepEqual(insertTakenPrompt("   ", "Do it"), { draft: "Do it", caret: 0 });
  assert.deepEqual(insertTakenPrompt("Hello  \n", "Do it"), { draft: "Hello\n\nDo it", caret: 7 });
  assert.equal(insertTakenPrompt("!ls", "Do it", { bashMode: true }), null);
  assert.equal(insertTakenPrompt("x", "   "), null);
  const items = [{ id: "a", filedAt: 3 }, { id: "b", filedAt: 2 }, { id: "c", filedAt: 1 }];
  const without = withoutItem(items, "b");
  assert.deepEqual(without.map((item) => item.id), ["a", "c"]);
  assert.deepEqual(restoreItem(without, items[1]).map((item) => item.id), ["a", "b", "c"], "rollback keeps newest-filed order");
  assert.equal(restoreItem(items, items[0]), items);
});
