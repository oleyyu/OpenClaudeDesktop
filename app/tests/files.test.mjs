import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { readFile, listFiles } = require("../electron/files.cjs");
// The Files pane viewer's read (cd2efac6e To/Un cards): expected outcomes are
// classified results; the traversal guard still never reads outside the root.
test("preview classifies missing, outside, large, binary and empty files and keeps the traversal guard", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-test-"));
  await fs.mkdir(path.join(root, "project"));
  const p = path.join(root, "project");
  try {
    await fs.writeFile(path.join(p, "ok.txt"), "Hello");
    await fs.writeFile(path.join(root, "outside.txt"), "Private");
    await fs.symlink(path.join(root, "outside.txt"), path.join(p, "link"));
    await fs.writeFile(path.join(p, "binary"), Buffer.from([0, 1, 65]));
    await fs.writeFile(path.join(p, "empty.txt"), "");
    await fs.mkdir(path.join(p, "folder"));
    await fs.writeFile(
      path.join(p, "large"),
      Buffer.alloc(1024 * 1024 + 1, 65),
    );
    assert.deepEqual(await readFile(p, "ok.txt"), { path: "ok.txt", text: "Hello", size: 5 });
    assert((await listFiles(p)).some((f) => f.name === "ok.txt"));
    assert.deepEqual(await readFile(p, "missing.js"), { path: "missing.js", unavailable: "missing", creatable: true });
    assert.deepEqual(await readFile(p, "nested/missing.js"), { path: "nested/missing.js", unavailable: "missing", creatable: false }, "B32: no parent folder to create it in");
    assert.deepEqual(await readFile(p, "../outside.txt"), { path: "../outside.txt", unavailable: "outside_root" });
    assert.deepEqual(await readFile(p, "../nope.txt"), { path: "../nope.txt", unavailable: "outside_root" }, "a missing path outside is still outside");
    assert.deepEqual(await readFile(p, path.join(root, "outside.txt")), { path: path.join(root, "outside.txt"), unavailable: "outside_root" });
    assert.deepEqual(await readFile(p, "link"), { path: "link", unavailable: "outside_root" }, "an escaping symlink is outside");
    assert.deepEqual(await readFile(p, "large"), { path: "large", unavailable: "too_large", size: 1024 * 1024 + 1 });
    assert.deepEqual(await readFile(p, "binary"), { path: "binary", unavailable: "binary" });
    assert.deepEqual(await readFile(p, "binary", { force: true }), { path: "binary", text: "\u0000\u0001A", size: 3 }, "View as text anyway");
    assert.deepEqual(await readFile(p, "empty.txt"), { path: "empty.txt", text: "", size: 0 });
    assert.deepEqual(await readFile(p, "folder"), { path: "folder", unavailable: "read_error" });
    assert.deepEqual(await readFile(path.join(root, "gone"), "ok.txt"), { path: "ok.txt", unavailable: "read_error" }, "a missing root");
    // The traversal guard: nothing outside the workspace is returned, forced or not.
    for (const relative of ["../outside.txt", "link"]) assert.equal((await readFile(p, relative, { force: true })).text, undefined, relative);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// Rg link rows (panes-tile-current.js:5572-5588, :5762-5769): directory from the target, link {target, state}.
test("listFiles marks symlinks ok / external / dangling and takes directory from the target", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-test-"));
  const p = path.join(root, "project");
  try {
    await fs.mkdir(path.join(p, "lib", "inner"), { recursive: true });
    await fs.writeFile(path.join(p, "lib", "a.txt"), "A");
    await fs.mkdir(path.join(root, "elsewhere"));
    await fs.symlink("lib", path.join(p, "lib-link"));
    await fs.symlink("lib/a.txt", path.join(p, "file-link"));
    await fs.symlink(path.join(root, "elsewhere"), path.join(p, "external-link"));
    await fs.symlink("does-not-exist", path.join(p, "dangling-link"));
    await fs.symlink("loop-b", path.join(p, "loop-a"));
    await fs.symlink("loop-a", path.join(p, "loop-b"));
    const entries = Object.fromEntries((await listFiles(p)).map((entry) => [entry.name, entry]));
    assert.deepEqual(entries["lib-link"], { name: "lib-link", path: "lib-link", directory: true, symlink: true, link: { target: "lib", state: "ok" } });
    assert.deepEqual(entries["file-link"], { name: "file-link", path: "file-link", directory: false, symlink: true, link: { target: "lib/a.txt", state: "ok" } });
    assert.deepEqual(entries["external-link"].link, { target: path.join(root, "elsewhere"), state: "external" });
    assert.equal(entries["external-link"].directory, true);
    assert.deepEqual(entries["dangling-link"], { name: "dangling-link", path: "dangling-link", directory: false, symlink: true, link: { target: "does-not-exist", state: "dangling" } });
    assert.equal(entries["loop-a"].link.state, "cycle");
    assert.deepEqual(entries.lib, { name: "lib", path: "lib", directory: true, symlink: false }, "plain rows carry no link");
    // A directory link expands (its target is inside); an external one is still refused by the scope guard.
    assert.deepEqual((await listFiles(p, "lib-link")).map((entry) => entry.name), ["inner", "a.txt"]);
    await assert.rejects(listFiles(p, "external-link"), /outside/);
    // Directory links sort with the folders.
    const order = (await listFiles(p)).map((entry) => entry.name);
    assert.ok(order.indexOf("lib-link") < order.indexOf("file-link"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// R09 (cd2efac6e nr/ir): images, video and audio are classified by name and size without reading their bytes;
// NUL text is still binary, and View as text anyway (force) reads a media file's bytes.
test("readFile classifies png/mp4/mp3 as media without a read; NUL text stays binary", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-test-"));
  try {
    // 2 MiB of NUL bytes: a read would answer too_large (or binary).
    await fs.writeFile(path.join(root, "photo.png"), Buffer.alloc(2 * 1024 * 1024));
    await fs.writeFile(path.join(root, "clip.mp4"), Buffer.from([0, 0, 0, 24]));
    await fs.writeFile(path.join(root, "song.MP3"), "ID3");
    await fs.writeFile(path.join(root, "nul.txt"), Buffer.from([65, 0, 66]));
    await fs.writeFile(path.join(root, "icon.svg"), "<svg/>");
    // An unreadable mp4: a read would fail with read_error.
    await fs.chmod(path.join(root, "clip.mp4"), 0o000);
    assert.deepEqual(await readFile(root, "photo.png"), { path: "photo.png", kind: "image", size: 2 * 1024 * 1024, unavailable: "image" });
    assert.deepEqual(await readFile(root, "clip.mp4"), { path: "clip.mp4", kind: "video", size: 4, unavailable: "video" });
    assert.deepEqual(await readFile(root, "song.MP3"), { path: "song.MP3", kind: "audio", size: 3, unavailable: "audio" });
    assert.deepEqual(await readFile(root, "nul.txt"), { path: "nul.txt", unavailable: "binary" });
    assert.deepEqual(await readFile(root, "icon.svg"), { path: "icon.svg", text: "<svg/>", size: 6 }, "svg is text (no allowSvg)");
    assert.deepEqual(await readFile(root, "photo.png", { force: true }), { path: "photo.png", unavailable: "too_large", size: 2 * 1024 * 1024 }, "forced: the bytes are read");
    assert.deepEqual(await readFile(root, "missing.png"), { path: "missing.png", unavailable: "missing", creatable: true });
    // B13: a PDF is classified like media (Chromium's viewer shows it from its file:// URL), never read.
    await fs.writeFile(path.join(root, "Spec.PDF"), Buffer.from("%PDF-1.4\0"));
    assert.deepEqual(await readFile(root, "Spec.PDF"), { path: "Spec.PDF", kind: "pdf", size: 9, unavailable: "pdf" });
  } finally {
    await fs.chmod(path.join(root, "clip.mp4"), 0o644).catch(() => {});
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("files.cjs media lists match the renderer's fileMediaKind (cd2efac6e je/ye)", async () => {
  const { fileMediaKind } = await import("../src/file-preview-model.mjs");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-test-"));
  try {
    for (const name of ["a.png", "b.JPG", "c.jpeg", "d.gif", "e.bmp", "f.webp", "g.avif", "h.svg", "i.ico", "j.mp4", "k.webm", "l.MOV", "m.m4v", "n.ogv", "o.mkv",
      "p.mp3", "q.m4a", "r.aac", "s.wav", "t.flac", "u.opus", "v.ogg", "w.oga", "x.wma", "y.txt"]) {
      await fs.writeFile(path.join(root, name), "x");
      assert.equal((await readFile(root, name)).kind ?? null, fileMediaKind(name), name);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// A deliverable card's Open (main.cjs open-tool-file): launchers, scripts, installers, executables and links to
// another file type are refused, as 2.2553.1's openSessionFileInDefaultApp refuses them.
test("openBlockReason refuses launchers, executables and links to another type, and allows documents", async () => {
  const { openBlockReason } = require("../electron/files.cjs");
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-open-")));
  try {
    const file = async (name, mode = 0o644) => { const target = path.join(root, name); await fs.writeFile(target, "x"); await fs.chmod(target, mode); return target; };
    for (const name of ["report.command", "a.terminal", "b.tool", "c.webloc", "d.app", "e.pkg", "f.scpt", "g.mobileconfig", "h.sh", "I.COMMAND"]) {
      const target = await file(name);
      assert.match(await openBlockReason(target, target), /doesn’t open apps, scripts or installers/, name);
    }
    const tool = await file("run", 0o755);
    assert.match(await openBlockReason(tool, tool), /doesn’t open apps/);
    const pdf = await file("ok.pdf", 0o755);
    assert.equal(await openBlockReason(pdf, pdf), null);
    const txt = await file("notes.txt");
    assert.equal(await openBlockReason(txt, txt), null);
    const script = await file("real.command");
    await fs.symlink(script, path.join(root, "report.pdf"));
    assert.match(await openBlockReason(path.join(root, "report.pdf"), script), /different kind of file/);
    const odd = await file("x‮gpj.txt");
    assert.match(await openBlockReason(odd, odd), /unusual characters/);
    await fs.mkdir(path.join(root, "dir.txt"));
    assert.match(await openBlockReason(path.join(root, "dir.txt"), path.join(root, "dir.txt")), /Only files/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

// R3-files FT-05 (files-11 / files-v01): LocalSessions isSessionPathGone as main answers it (files.cjs; the original is
// the desktop main process's ZB.isSessionPathGone / judgeSessionPathGone / qB in asar index.chunk-CFJssAFf.js).
test("sessionPathGone: true only for a missing path inside the session's real folders, never through a link", async () => {
  const { createSessionPathGone, judgeSessionPathGone, pathPresence } = require("../electron/files.cjs");
  const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-gone-")));
  const root = path.join(base, "project"), added = path.join(base, "added"), outside = path.join(base, "outside");
  try {
    for (const dir of [root, added, outside, path.join(root, "src")]) await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(root, "src/app.ts"), "x");
    await fs.symlink(outside, path.join(root, "linked"));
    await fs.symlink(root, path.join(base, "alias"));
    const gone = createSessionPathGone();
    const ask = (filePath, extra = {}) => gone({ sessionId: "s1", root, sessionFolders: [added], filePath, ...extra });
    assert.equal(await ask(path.join(root, "src/app.ts")), false, "present");
    assert.equal(await ask(path.join(root, "src/deleted.ts")), true, "a deleted file");
    assert.equal(await ask("src/deleted.ts"), true, "relative to the session folder");
    assert.equal(await ask(path.join(root, "removed/deep/file.ts")), true, "a deleted folder");
    assert.equal(await ask(path.join(root, "src/app.ts/child")), false, "ENOTDIR is unreadable, not gone");
    assert.equal(await ask(path.join(added, "missing.md")), true, "inside an added folder");
    assert.equal(await ask(path.join(outside, "missing.md")), false, "outside every session folder");
    assert.equal(await ask(path.join(root, "linked/missing.md")), false, "through a link (through_link)");
    assert.equal(await ask(path.join(base, "alias/missing.md")), false, "another spelling of the root (outside)");
    assert.equal(await gone({ sessionId: "s1", root: path.join(base, "alias"), filePath: "missing.md" }), false, "a session folder spelled through a link (link_spelled)");
    assert.equal(await ask(path.join(root, "a\0b")), false, "NUL");
    assert.equal(await ask(path.join(root, "x".repeat(5000))), false, "over 4096 characters");
    assert.equal(await gone({ sessionId: "s1", root: "relative", filePath: "/x" }), false, "no absolute session folder");
    assert.equal(await createSessionPathGone({ disabled: () => true })({ sessionId: "s1", root, filePath: path.join(root, "nope") }), false, "kill switch");
    assert.equal(await judgeSessionPathGone({ root, filePath: path.join(root, "linked/x") }), "through_link");
    assert.equal(await judgeSessionPathGone({ root: path.join(base, "alias"), filePath: "x" }), "link_spelled");
    assert.equal(await judgeSessionPathGone({ root, filePath: path.join(base, "alias/x") }), "outside");
    assert.equal(await judgeSessionPathGone({ root, filePath: path.join(outside, "x") }), "outside");
    assert.equal(await judgeSessionPathGone({ root, filePath: "~/x", home: path.join(root, "src") }), "gone", "~ is the home folder");
    assert.equal(await judgeSessionPathGone({ root: "/", filePath: "/dev/null" }), "refused", "device paths");
    assert.equal(await pathPresence(path.join(root, "src/app.ts")), "present");
  } finally { await fs.rm(base, { recursive: true, force: true }); }
});

test("sessionPathGone shares an ask in flight, answers false past 2 asks or the deadline", async () => {
  const { createSessionPathGone } = require("../electron/files.cjs");
  const calls = [];
  let release;
  const judge = (request) => { calls.push(request.filePath); return new Promise((resolve) => { release = resolve; }); };
  const gone = createSessionPathGone({ judge, deadlineMs: 50 });
  const first = gone({ sessionId: "s", root: "/r", filePath: "/r/a" }), again = gone({ sessionId: "s", root: "/r", filePath: "/r/a" });
  assert.equal(first, again, "the same key shares one ask");
  const second = gone({ sessionId: "s", root: "/r", filePath: "/r/b" });
  assert.equal(await gone({ sessionId: "s", root: "/r", filePath: "/r/c" }), false, "busy: a third concurrent ask is not judged");
  assert.deepEqual(calls, ["/r/a", "/r/b"]);
  assert.equal(await first, false, "the 2 s deadline (50 ms here) answers false");
  assert.equal(await second, false);
  release("gone");
  const quick = createSessionPathGone({ judge: async () => "gone" });
  assert.equal(await quick({ sessionId: "s", root: "/r", filePath: "/r/a" }), true);
  assert.equal(await createSessionPathGone({ judge: async () => null })({ sessionId: "s", root: "/r", filePath: "/r/a" }), false, "no session paths");
  assert.equal(await createSessionPathGone({ judge: async () => { throw new Error("x"); } })({ sessionId: "s", root: "/r", filePath: "/r/a" }), false, "error");
});

test("main.cjs answers file:gone for the session's folders, also from a popout", async () => {
  const main = await fs.readFile(path.join(import.meta.dirname, "../electron/main.cjs"), "utf8");
  assert.match(main, /const \{ listFiles, readFile, scopedPath, openBlockReason, sessionPathGone \} = require\("\.\/files\.cjs"\);/);
  assert.match(main, /POPOUT_ACTIONS = new Set\(\[[^\]]*"file:gone"/);
  const branch = main.slice(main.indexOf('case "file:gone": {'), main.indexOf('case "file:reveal-session": {'));
  assert.match(branch, /if \(typeof p\.sessionId !== "string"\) return false;/);
  assert.match(branch, /try \{ root = fileSearchRoot\(p\.sessionId\); \} catch \{ return false; \}/);
  assert.match(branch, /config\.sessionMetadata\?\.\[p\.sessionId\]\?\.additionalFolders/);
  assert.match(branch, /return sessionPathGone\(\{ sessionId: p\.sessionId, root, sessionFolders: Array\.isArray\(added\) \? added : \[\], filePath: p\.path \}\);/);
});
