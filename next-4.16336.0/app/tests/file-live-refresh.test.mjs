import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { editedPaths, editInvalidation, tabPathForEdit, tabsForEdits, tabsForFolderChange, tabLoaded, readIsStale, watchedDirs, applyFileRead, FILE_STALE_MS } from "../src/file-live-refresh-model.mjs";
import { getFileEditor, hasDirtyFileEdit } from "../src/file-edit-store.mjs";
const require = createRequire(import.meta.url);
const { createFilesWatch } = require("../electron/files-watch.cjs");

// B07 Files live refresh: c4e0cfada Te/K/Ee (agent edits), cd2efac6e El (focus/staleTime xl 5000) and Ic
// (restored tab gone), cccc2cf0a mv (folder watching).
const edit = (id, paths, status = "completed") => ({ id, type: "fileChange", status, changes: paths.map((p) => ({ path: p, kind: { type: "update" } })) });

test("editedPaths: completed fileChange paths (with a rename's target) and NotebookEdit app calls only", () => {
  assert.deepEqual(editedPaths(edit("a", ["/w/a.js", "/w/a.js"])), ["/w/a.js"]);
  assert.deepEqual(editedPaths({ type: "fileChange", status: "completed", changes: [{ path: "/w/old.js", kind: { type: "update", move_path: "/w/new.js" } }] }), ["/w/old.js", "/w/new.js"]);
  assert.deepEqual(editedPaths(edit("b", ["/w/b.js"], "inProgress")), []);
  assert.deepEqual(editedPaths({ type: "mcpToolCall", server: "code_desktop", tool: "NotebookEdit", status: "completed", arguments: { notebook_path: "/w/n.ipynb" } }), ["/w/n.ipynb"]);
  assert.deepEqual(editedPaths({ type: "mcpToolCall", server: "other", tool: "NotebookEdit", status: "completed", arguments: { notebook_path: "/w/n.ipynb" } }), []);
  assert.deepEqual(editedPaths({ type: "commandExecution", status: "completed", command: "sed -i" }), []);
  assert.deepEqual(editedPaths(null), []);
});

test("editInvalidation seeds on a new or empty session and reports only edits completed since", () => {
  let { state, paths } = editInvalidation(null, "s1", [edit("a", ["/w/a.js"])]);
  assert.deepEqual(paths, [], "the first look only records history");
  ({ state, paths } = editInvalidation(state, "s1", [edit("a", ["/w/a.js"]), edit("b", ["/w/b.js"], "inProgress")]));
  assert.deepEqual(paths, []);
  ({ state, paths } = editInvalidation(state, "s1", [edit("a", ["/w/a.js"]), edit("b", ["/w/b.js"])]));
  assert.deepEqual(paths, ["/w/b.js"], "an edit that completes is reported once");
  ({ state, paths } = editInvalidation(state, "s1", [edit("a", ["/w/a.js"]), edit("b", ["/w/b.js"])]));
  assert.deepEqual(paths, []);
  ({ state, paths } = editInvalidation(state, "s2", [edit("c", ["/w/c.js"])]));
  assert.deepEqual(paths, [], "switching sessions seeds again");
  ({ state, paths } = editInvalidation(null, "s3", []));
  ({ state, paths } = editInvalidation(state, "s3", [edit("d", ["/w/d.js"])]));
  assert.deepEqual(paths, [], "history arriving into an empty transcript is not an edit");
});

test("tool paths map to the pane's relative tab paths; outside paths match nothing", () => {
  assert.equal(tabPathForEdit("/w/proj/src/a.js", "/w/proj/"), "src/a.js");
  assert.equal(tabPathForEdit("./src/a.js", "/w/proj"), "src/a.js");
  assert.equal(tabPathForEdit("/w/other/a.js", "/w/proj"), null);
  assert.equal(tabPathForEdit("/w/project2/a.js", "/w/proj"), null);
  assert.equal(tabPathForEdit("../a.js", "/w/proj"), null);
  const tabs = [{ path: "src/a.js" }, { path: "README.md" }, { path: "lib/x.js" }];
  assert.deepEqual(tabsForEdits(tabs, ["/w/proj/src/a.js", "/w/proj/README.md", "/elsewhere/lib/x.js"], "/w/proj"), ["src/a.js", "README.md"]);
});

test("a folder change names the open tabs directly inside it", () => {
  const tabs = [{ path: "src/a.js" }, { path: "src/deep/b.js" }, { path: "top.md" }];
  assert.deepEqual(tabsForFolderChange(tabs, "src", ["a.js"]), ["src/a.js"]);
  assert.deepEqual(tabsForFolderChange(tabs, "src", []), ["src/a.js"], "no names: any direct child");
  assert.deepEqual(tabsForFolderChange(tabs, "", ["top.md", "src"]), ["top.md"]);
  assert.deepEqual(tabsForFolderChange(tabs, "src", ["other.js"]), []);
});

test("staleness follows El (5000 ms) and only loaded tabs refresh in place", () => {
  assert.equal(FILE_STALE_MS, 5000);
  assert.equal(readIsStale(undefined, 10), true);
  assert.equal(readIsStale(1000, 5999), false);
  assert.equal(readIsStale(1000, 6000), true);
  assert.equal(tabLoaded({ path: "a", text: "" }), true);
  assert.equal(tabLoaded({ path: "a", unavailable: "missing" }), true);
  assert.equal(tabLoaded({ path: "a" }), false);
  assert.deepEqual(watchedDirs(["src", "src", "", 3, "lib"]), ["", "src", "lib"]);
  assert.deepEqual(watchedDirs(null), [""]);
});

test("applyFileRead: unchanged reads keep the array; restored tabs whose file is gone are dropped", () => {
  const tabs = [{ path: "a", preview: false, text: "x", editHash: "h" }, { path: "b", preview: true, restored: true }];
  assert.equal(applyFileRead(tabs, "a", { text: "x", editHash: "h" }).tabs, tabs, "same body: no store write");
  const changed = applyFileRead(tabs, "a", { text: "y", editHash: "h2" });
  assert.deepEqual(changed.tabs[0], { path: "a", preview: false, text: "y", editHash: "h2" });
  assert.equal(changed.tabs[1], tabs[1]);
  const gone = applyFileRead(tabs, "b", { unavailable: "missing" });
  assert.equal(gone.dropped, true);
  assert.deepEqual(gone.tabs.map((tab) => tab.path), ["a"]);
  assert.equal(applyFileRead(tabs, "b", { unavailable: "missing" }, { keepRestored: "b" }).dropped, false, "the tree-return path keeps its card");
  const read = applyFileRead(tabs, "b", { text: "ok" });
  assert.deepEqual(read.tabs[1], { path: "b", preview: true, text: "ok" }, "a read clears the restored mark");
  const deleted = applyFileRead(read.tabs, "b", { unavailable: "missing" });
  assert.equal(deleted.dropped, false, "a file deleted while open keeps its deleted card");
  assert.equal(deleted.tabs[1].unavailable, "missing");
  assert.equal(applyFileRead(tabs, "zzz", { text: "" }).tabs, tabs);
});

test("hasDirtyFileEdit: only a viewer with unsaved edits pauses refetch", () => {
  const editor = getFileEditor({ key: "live-refresh-test", path: "src/a.js", sessionId: "s1", text: "one", hash: "h1", save: async () => ({ status: "saved", hash: "h2" }) });
  assert.equal(hasDirtyFileEdit({ sessionId: "s1", path: "src/a.js" }), false);
  editor.change("two");
  assert.equal(hasDirtyFileEdit({ sessionId: "s1", path: "src/a.js" }), true);
  assert.equal(hasDirtyFileEdit({ sessionId: "s2", path: "src/a.js" }), false);
  assert.equal(hasDirtyFileEdit({ sessionId: "s1", path: "src/b.js" }), false);
  editor.discard();
  assert.equal(hasDirtyFileEdit({ sessionId: "s1", path: "src/a.js" }), false);
});

// Main-process watcher (files-watch.cjs, mv watchSessionDirectories).
function fakeSender(id) {
  const sent = [], handlers = {};
  return { id, sent, send: (channel, event) => sent.push([channel, event]), isDestroyed: () => false, once: (name, fn) => { handlers[name] = fn; }, destroy: () => handlers.destroyed?.() };
}
function fakeWatch() {
  const handles = new Map();
  const watch = (dir, options, listener) => {
    assert.equal(options.persistent, false);
    const handle = { dir, listener, closed: false, close() { this.closed = true; handles.delete(dir); }, on() {} };
    handles.set(dir, handle);
    return handle;
  };
  return { watch, handles };
}
const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("files:watch arms one shared, scoped, debounced watcher per folder and releases it", async () => {
  const fake = fakeWatch();
  const resolveDir = async (cwd, dir) => { if (dir === "gone") throw Object.assign(new Error("x"), { code: "ENOENT" }); return path.join(cwd, dir); };
  const service = createFilesWatch({ watch: fake.watch, resolveDir, debounceMs: 5 });
  const one = fakeSender(1), two = fakeSender(2);
  assert.deepEqual(await service.set(one, { watchId: "w", cwd: "/w", dirs: ["", "src", "gone"] }), ["", "src"]);
  assert.deepEqual(await service.set(two, { watchId: "w", cwd: "/w", dirs: ["src"] }), ["src"]);
  assert.equal(service.watchedCount(), 2, "the src watcher is shared");
  const src = fake.handles.get(path.join("/w", "src"));
  src.listener("rename", "new.js"); src.listener("change", "new.js"); src.listener("change", ".DS_Store");
  await tick(20);
  assert.deepEqual(one.sent, [["desktop:event", { kind: "files-dir-changed", watchId: "w", cwd: "/w", dir: "src", names: ["new.js"] }]], "debounced into one event");
  assert.equal(two.sent.length, 1);
  fake.handles.get("/w").listener("change", "node_modules");
  await tick(20);
  assert.equal(one.sent.length, 1, "changes to names the listing hides are ignored");
  // Collapsing src keeps the root; the shared watcher stays for the other pane.
  await service.set(one, { watchId: "w", cwd: "/w", dirs: [""] });
  assert.equal(fake.handles.has(path.join("/w", "src")), true);
  await service.set(two, { watchId: "w", cwd: "/w", dirs: [] });
  assert.equal(fake.handles.has(path.join("/w", "src")), false, "the last subscriber releases the folder");
  one.destroy();
  assert.equal(service.watchedCount(), 0, "a closed renderer releases everything");
  await assert.rejects(service.set(one, { watchId: "", cwd: "/w", dirs: [""] }), /Invalid watch identifier/);
});

test("files:watch: a newer call wins over a slower earlier one, and folders outside the workspace are refused", async () => {
  const fake = fakeWatch();
  let release;
  const slow = new Promise((resolve) => { release = resolve; });
  const resolveDir = async (cwd, dir) => { if (dir === "slow") await slow; return path.join(cwd, dir); };
  const service = createFilesWatch({ watch: fake.watch, resolveDir, debounceMs: 5 });
  const sender = fakeSender(3);
  const first = service.set(sender, { watchId: "w", cwd: "/w", dirs: ["slow"] });
  assert.deepEqual(await service.set(sender, { watchId: "w", cwd: "/w", dirs: ["fast"] }), ["fast"]);
  release();
  assert.equal(await first, null);
  assert.deepEqual([...fake.handles.keys()], [path.join("/w", "fast")]);
  service.dispose();
  // The real resolver is files.cjs scopedPath: a link out of the workspace is never watched.
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-watch-"));
  try {
    await fs.mkdir(path.join(root, "project", "src"), { recursive: true });
    await fs.mkdir(path.join(root, "outside"));
    await fs.symlink(path.join(root, "outside"), path.join(root, "project", "out"));
    const real = createFilesWatch({ watch: fakeWatch().watch, debounceMs: 5 });
    assert.deepEqual(await real.set(fakeSender(4), { watchId: "w", cwd: path.join(root, "project"), dirs: ["", "src", "out", "../outside"] }), ["", "src"]);
    real.dispose();
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("files:watch reports a real file created in a watched folder", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-watch-"));
  const service = createFilesWatch({ debounceMs: 20 });
  const sender = fakeSender(5);
  try {
    await service.set(sender, { watchId: "w", cwd: root, dirs: [""] });
    await fs.writeFile(path.join(root, "made.txt"), "x");
    for (let i = 0; i < 100 && !sender.sent.length; i++) await tick(20);
    assert.equal(sender.sent[0]?.[1]?.kind, "files-dir-changed");
    assert.equal(sender.sent[0][1].dir, "");
  } finally { service.dispose(); await fs.rm(root, { recursive: true, force: true }); }
});
