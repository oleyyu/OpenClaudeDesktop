// w13-chatfn-attachments: electron/document-convert.cjs (Chat document → text, Add › Take a screenshot capture).
// Real conversions use what macOS ships (textutil builds the docx / rtf from HTML here, the PDF is written by hand);
// the timeout, cut and capture branches run against a mocked child process. No network, no GUI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const convert = require("../electron/document-convert.cjs");
const { CONVERTIBLE_EXTENSIONS: MODEL_EXTENSIONS } = await import("../src/chat-attachment-model.mjs");
const SNAPSHOT = new URL("../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/", import.meta.url);
const official = (name) => readFileSync(new URL(name, SNAPSHOT), "utf8");
const darwin = process.platform === "darwin";

function minimalPdf(pages) {
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  pages.forEach((text, i) => {
    const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets = objects.map((body, i) => { const at = out.length; out += `${i + 1} 0 obj\n${body}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((at) => `${String(at).padStart(10, "0")} 00000 n \n`).join("")}`;
  return `${out}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
}

// A child process stand-in: `script(child, args)` decides what it prints and when it closes.
function fakeSpawn(script) {
  const calls = [];
  const spawn = (command, args) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.killed = false;
    child.kill = () => { child.killed = true; setImmediate(() => child.emit("close", null)); return true; };
    calls.push({ command, args, child });
    setImmediate(() => script(child, args));
    return child;
  };
  return { spawn, calls };
}
const fileStat = (size = 10) => async () => ({ isFile: () => true, size });
const identity = async (value) => value;

test("the convertible set is the model's, and nothing else is converted", async () => {
  assert.deepEqual([...convert.CONVERTIBLE_EXTENSIONS].sort(), [...MODEL_EXTENSIONS].sort());
  assert.equal(convert.isConvertiblePath("/a/Report.PDF"), true);
  assert.equal(convert.isConvertiblePath("/a/notes.md"), false);
  assert.equal(convert.isConvertiblePath("/a/.pdf"), false, "a dot file has no extension");
  assert.deepEqual(await convert.convertDocument("/a/notes.txt"), { ok: false, reason: "unsupported", path: "/a/notes.txt" });
  assert.equal((await convert.convertDocument("relative/a.pdf")).reason, "invalid");
  assert.equal((await convert.convertDocument("/a/b\0.pdf")).reason, "invalid");
  assert.equal((await convert.convertDocument(42)).reason, "invalid");
  assert.equal((await convert.convertDocument("/a/b.pdf", { platform: "linux" })).reason, "unsupported", "off macOS the file stays a reference");
});

test("refusals: missing, not a file, too large, inside the app's own data", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doc-convert-"));
  try {
    assert.equal((await convert.convertDocument(path.join(dir, "missing.pdf"), { platform: "darwin" })).reason, "not_found");
    mkdirSync(path.join(dir, "folder.pdf"));
    assert.equal((await convert.convertDocument(path.join(dir, "folder.pdf"), { platform: "darwin" })).reason, "not_file");
    assert.equal((await convert.convertDocument("/x/big.pdf", { platform: "darwin", realpath: identity, stat: fileStat(convert.MAX_INPUT_BYTES + 1) })).reason, "too_large");
    writeFileSync(path.join(dir, "inside.pdf"), minimalPdf(["x"]));
    const spawned = fakeSpawn(() => assert.fail("nothing runs for a refused file"));
    assert.equal((await convert.convertDocument(path.join(dir, "inside.pdf"), { platform: "darwin", internalRoots: [dir], spawn: spawned.spawn })).reason, "refused");
    assert.equal(spawned.calls.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("staged gate: only a path the user chose this session is read; any other is not_staged before a stat", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doc-convert-"));
  try {
    const chosen = path.join(dir, "chosen.pdf"), other = path.join(dir, "other.pdf");
    writeFileSync(chosen, minimalPdf(["x"])); writeFileSync(other, minimalPdf(["y"]));
    const staged = convert.createStagedPaths();
    staged.grant([chosen, "relative/a.pdf", "/a/b\0.pdf", 42, ""]);
    assert.equal(staged.size, 1, "only an absolute, clean path is granted");
    assert.equal(staged.has(chosen), true);
    assert.equal(staged.has(path.join(dir, ".", "chosen.pdf")), true, "keys are resolved");
    assert.equal(staged.has(other), false);
    let stats = 0;
    const counted = async (...args) => { stats += 1; return fileStat()(...args); };
    const refused = fakeSpawn(() => assert.fail("nothing runs for a path the user never chose"));
    for (const gate of [staged, null, {}, { has: "yes" }]) {
      assert.deepEqual(await convert.convertDocument(other, { platform: "darwin", staged: gate, stat: counted, realpath: identity, spawn: refused.spawn }),
        { ok: false, reason: "not_staged", path: other });
    }
    assert.equal(stats, 0, "a refused path is never stat'ed");
    assert.equal(refused.calls.length, 0);
    const ran = fakeSpawn((child) => { child.stdout.emit("data", JSON.stringify({ pages: 1, text: "x" })); child.emit("close", 0); });
    const ok = await convert.convertDocument(chosen, { platform: "darwin", staged, spawn: ran.spawn });
    assert.equal(ok.ok, true, "a granted path converts");
    const bounded = convert.createStagedPaths({ limit: 2 });
    bounded.grant(["/a/1.pdf", "/a/2.pdf", "/a/3.pdf"]);
    assert.deepEqual([bounded.has("/a/1.pdf"), bounded.has("/a/2.pdf"), bounded.has("/a/3.pdf"), bounded.size], [false, true, true, 2], "oldest dropped first");
    assert.equal(convert.STAGED_LIMIT, 4096);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("real conversions on macOS: HTML, docx and rtf through textutil, PDF through PDFKit", { skip: !darwin && "needs macOS textutil / PDFKit" }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "doc-convert-"));
  try {
    const html = path.join(dir, "page.html");
    writeFileSync(html, "<html><body><h1>Quarterly 报告</h1><p>Revenue “grew”.</p></body></html>");
    execFileSync("/usr/bin/textutil", ["-convert", "docx", "-inputencoding", "UTF-8", "-output", path.join(dir, "page.docx"), html]);
    execFileSync("/usr/bin/textutil", ["-convert", "rtf", "-inputencoding", "UTF-8", "-output", path.join(dir, "page.rtf"), html]);
    for (const name of ["page.html", "page.docx", "page.rtf"]) {
      const result = await convert.convertDocument(path.join(dir, name));
      assert.equal(result.ok, true, name);
      assert.equal(result.fileType, name.split(".").pop());
      assert.equal(result.name, name);
      assert.equal(result.pages, null);
      assert.equal(result.truncated, false);
      assert.match(result.text, /Quarterly 报告\nRevenue “grew”\./u, `${name}: UTF-8 text without a declared charset`);
    }
    writeFileSync(path.join(dir, "latin.html"), Buffer.from('<html><head><meta charset="iso-8859-1"></head><body>caf\xe9</body></html>', "latin1"));
    assert.equal((await convert.convertDocument(path.join(dir, "latin.html"))).text, "café", "a declared charset is kept");
    writeFileSync(path.join(dir, "deck.pdf"), minimalPdf(["Hello PDF page one", "Second page here"]));
    const pdf = await convert.convertDocument(path.join(dir, "deck.pdf"));
    assert.deepEqual({ ok: pdf.ok, fileType: pdf.fileType, pages: pdf.pages, text: pdf.text, truncated: pdf.truncated },
      { ok: true, fileType: "pdf", pages: 2, text: "Hello PDF page one\nSecond page here", truncated: false });
    writeFileSync(path.join(dir, "broken.pdf"), "not a pdf");
    assert.equal((await convert.convertDocument(path.join(dir, "broken.pdf"))).reason, "unreadable");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("the PDF script is PDFKit through JXA and gets the path and the budget as arguments", async () => {
  assert.match(convert.PDF_SCRIPT, /ObjC\.import\('PDFKit'\)/);
  assert.match(convert.PDF_SCRIPT, /PDFDocument\.alloc\.initWithURL\(\$\.NSURL\.fileURLWithPath\(argv\[0\]\)\)/);
  assert.match(convert.PDF_SCRIPT, /pageCount/);
  const { spawn, calls } = fakeSpawn((child) => { child.stdout.emit("data", JSON.stringify({ pages: "3", text: "a\r\nb" })); child.emit("close", 0); });
  const result = await convert.convertDocument("/docs/r.pdf", { platform: "darwin", spawn, realpath: identity, stat: fileStat() });
  assert.deepEqual(calls[0].args, ["-l", "JavaScript", "-e", convert.PDF_SCRIPT, "/docs/r.pdf", String(convert.MAX_TEXT_CHARS)]);
  assert.equal(calls[0].command, "/usr/bin/osascript");
  assert.deepEqual({ pages: result.pages, text: result.text }, { pages: 3, text: "a\nb" });
  const locked = fakeSpawn((child) => { child.stdout.emit("data", '{"error":"locked"}'); child.emit("close", 0); });
  assert.equal((await convert.convertDocument("/docs/r.pdf", { platform: "darwin", spawn: locked.spawn, realpath: identity, stat: fileStat() })).reason, "unreadable");
  const empty = fakeSpawn((child) => { child.stdout.emit("data", '{"pages":1,"text":"  \\n"}'); child.emit("close", 0); });
  assert.equal((await convert.convertDocument("/docs/scan.pdf", { platform: "darwin", spawn: empty.spawn, realpath: identity, stat: fileStat() })).reason, "empty", "a scanned PDF without text stays a file");
});

test("HTML without a charset is read as UTF-8; textutil always prints UTF-8", async () => {
  const run = (head) => {
    const spawned = fakeSpawn((child) => { child.stdout.emit("data", "x"); child.emit("close", 0); });
    return convert.convertDocument("/docs/a.html", { platform: "darwin", spawn: spawned.spawn, realpath: identity, stat: fileStat(), readHead: async () => head }).then(() => spawned.calls[0]);
  };
  const bare = await run("<html><body>hi");
  assert.equal(bare.command, "/usr/bin/textutil");
  assert.deepEqual(bare.args, ["-convert", "txt", "-encoding", "UTF-8", "-inputencoding", "UTF-8", "-stdout", "/docs/a.html"]);
  const declared = await run('<html><head><meta http-equiv="Content-Type" content="text/html; charset=gbk">');
  assert.deepEqual(declared.args, ["-convert", "txt", "-encoding", "UTF-8", "-stdout", "/docs/a.html"]);
});

test("a stuck child is killed at the timeout; a long output is cut and marked", async () => {
  const stuck = fakeSpawn(() => {});
  const slow = await convert.convertDocument("/docs/a.docx", { platform: "darwin", spawn: stuck.spawn, realpath: identity, stat: fileStat(), timeout: 30 });
  assert.equal(slow.reason, "timeout");
  assert.equal(stuck.calls[0].child.killed, true);
  const flood = fakeSpawn((child) => {
    const line = `${"word ".repeat(199)}word\n`;
    for (let i = 0; i < 1200 && !child.killed; i++) child.stdout.emit("data", Buffer.from(line));
    if (!child.killed) child.emit("close", 0);
  });
  const long = await convert.convertDocument("/docs/a.docx", { platform: "darwin", spawn: flood.spawn, realpath: identity, stat: fileStat() });
  assert.equal(long.ok, true);
  assert.equal(long.truncated, true);
  assert.ok(long.text.length <= convert.MAX_TEXT_CHARS, "at most MAX_TEXT_CHARS characters");
  assert.ok(long.text.length > convert.MAX_TEXT_CHARS - 2000);
  const pdf = fakeSpawn((child) => { child.stdout.emit("data", JSON.stringify({ pages: 9, text: "z".repeat(convert.MAX_TEXT_CHARS + 1) })); child.emit("close", 0); });
  const cut = await convert.convertDocument("/docs/a.pdf", { platform: "darwin", spawn: pdf.spawn, realpath: identity, stat: fileStat() });
  assert.deepEqual({ length: cut.text.length, truncated: cut.truncated, pages: cut.pages }, { length: convert.MAX_TEXT_CHARS, truncated: true, pages: 9 });
  assert.deepEqual(convert.boundText("a\u0000b\r\n"), { text: "ab", truncated: false });
});

test("screenshot: screencapture without sound, picker or focus change, into the attachments folder", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "shot-"));
  try {
    const { spawn, calls } = fakeSpawn((child, args) => { writeFileSync(args.at(-1), Buffer.from([137, 80, 78, 71])); child.emit("close", 0); });
    const shot = await convert.captureScreenshot({ directory: dir, platform: "darwin", spawn });
    assert.equal(calls[0].command, "/usr/sbin/screencapture");
    assert.deepEqual(calls[0].args.slice(0, 4), ["-x", "-m", "-t", "png"], "no sound (-x), main display (-m), no interactive picker");
    assert.ok(!calls[0].args.includes("-i") && !calls[0].args.includes("-W"));
    assert.equal(path.dirname(shot.path), dir);
    assert.match(path.basename(shot.path), /-screenshot\.png$/);
    assert.deepEqual({ name: shot.name, size: shot.size, type: shot.type }, { name: "screenshot.png", size: 4, type: "image/png" }, "Fs names the file screenshot.png");
    const denied = fakeSpawn((child) => child.emit("close", 1));
    const removed = [];
    await assert.rejects(convert.captureScreenshot({ directory: dir, platform: "darwin", spawn: denied.spawn, unlink: async (file) => removed.push(file) }), /Could not capture screen/);
    assert.equal(removed.length, 1, "a failed capture leaves no file");
    await assert.rejects(convert.captureScreenshot({ directory: "relative", platform: "darwin", spawn }), /Could not capture screen/);
    const written = [];
    const desktopCapturer = { getSources: async (options) => { assert.deepEqual(options, { types: ["screen"], thumbnailSize: { width: 200, height: 100 } }); return [{ display_id: "7", thumbnail: { isEmpty: () => false, toPNG: () => Buffer.from([1, 2, 3]) } }]; } };
    const screen = { getPrimaryDisplay: () => ({ id: 7, scaleFactor: 2, size: { width: 100, height: 50 } }) };
    const other = await convert.captureScreenshot({ directory: dir, platform: "linux", desktopCapturer, screen, writeFile: async (file, bytes) => written.push([file, bytes.length]) });
    assert.deepEqual({ size: other.size, type: other.type, wrote: written.length }, { size: 3, type: "image/png", wrote: 1 });
    await assert.rejects(convert.captureScreenshot({ directory: dir, platform: "linux" }), /Could not capture screen/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("official 3.6556.2 originals: convert_document, the PDF tag tooltip, the screenshot item", () => {
  const shared182 = official("shared-182-BI1KJccu.js"), shared7 = official("shared-7-DBAgAi5H.js"), menu = official("c752b32f8-mYZAs6yC.js");
  assert.ok(shared182.includes("/api/organizations/${t}/convert_document"));
  assert.ok(shared7.includes('defaultMessage:"PDF converted to text",id:"A/pPpSVBy1"'));
  assert.ok(menu.includes('defaultMessage:"Take a screenshot",id:"fVVgugcqfW"'));
  assert.ok(menu.includes('defaultMessage:"Could not capture screen.",id:"uGOETn5bfV"'));
  assert.ok(menu.includes('screenshot:"add-menu-screenshot"'));
  assert.ok(/label:\w+,icon:"Camera",onAction:\w+/.test(menu), "Fs: icon Camera");
  assert.ok(menu.includes('setFocusBehavior("no-focus-change")') || official("shared-3-BCEbd8Fv.js").includes('setFocusBehavior("no-focus-change")'), "the official capture keeps focus");
});

test("main.cjs answers convert-document and capture-screenshot with this module", () => {
  const main = readFileSync(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert.match(main, /case "convert-document": return require\("\.\/document-convert\.cjs"\)\.convertDocument\(p\.path, \{ internalRoots: \[app\.getPath\("userData"\)\], staged: userStagedDocuments \}\);/);
  // The grants: the Open dialog's own paths and preload's pathForFile reads; attachments:inspect (page-supplied) never grants.
  assert.match(main, /const userStagedDocuments = require\("\.\/document-convert\.cjs"\)\.createStagedPaths\(\);/);
  assert.match(main, /ipcMain\.on\("desktop:attachment-path", \(_event, filePath\) => \{ userStagedDocuments\.grant\(filePath\); \}\);/);
  assert.match(main, /if \(!r\.canceled\) userStagedDocuments\.grant\(r\.filePaths\);\n\s+return r\.canceled \? \[\] : inspectAttachments\(r\.filePaths\);/);
  assert.match(main, /case "attachments:inspect": return inspectAttachments\(p\.paths\);/);
  assert.equal((main.match(/userStagedDocuments\.grant\(/g) || []).length, 2, "no other grant");
  const preload = readFileSync(new URL("../electron/preload.cjs", import.meta.url), "utf8");
  assert.match(preload, /try \{ filePath = webUtils\.getPathForFile\(file\) \|\| ""; \} catch \{ return ""; \}\n\s+if \(filePath\) ipcRenderer\.send\("desktop:attachment-path", filePath\);/);
  assert.ok(!/attachment-path/.test(preload.replace(/ipcRenderer\.send\("desktop:attachment-path", filePath\)/, "")), "preload exposes no way for the page to name a path");
  assert.match(main, /case "capture-screenshot": return require\("\.\/document-convert\.cjs"\)\.captureScreenshot\(\{ directory: stagingDirectory\(\), desktopCapturer: require\("electron"\)\.desktopCapturer, screen \}\);/);
});
