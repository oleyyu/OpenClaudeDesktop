// w13-chatfn-attachments: Chat document attachments read as text, and the Add menu's screenshot.
//
// Official 3.6556.2: a PDF / Word / RTF / HTML / ODT file attached in Chat goes to claude.ai's
// `/api/organizations/${org}/convert_document` (shared-182 kM) and comes back as `extracted_content`; the tile then
// carries the file-type tag with the tooltip "PDF converted to text" (shared-7, "A/pPpSVBy1"). OpenClaude Desktop has no
// claude.ai account (E59), so the same conversion runs here with what macOS ships: PDFKit through
// `osascript -l JavaScript` for a PDF (PDFDocument.string and pageCount) and `textutil -convert txt` for the rest.
// No npm dependency is added (D27). Off macOS the answer is `unsupported` and the attachment stays a file reference.
//
// The same module holds the Add menu's "Take a screenshot" capture (c752b32f8 Fs: getDisplayMedia with
// CaptureController.setFocusBehavior("no-focus-change"), the frame becomes `screenshot.png`). Locally the main display
// is captured with `screencapture -x -m` (no sound, no picker, no focus or window change: the background computer-use
// rule) and staged under the attachments folder like a pasted image; other platforms use desktopCapturer.
//
// Boundaries: an absolute path to a regular file the user staged, with a convertible extension, at most
// MAX_INPUT_BYTES, never inside the app's own data folder. "Staged by the user" is the main process's own record
// (createStagedPaths): main.cjs grants the paths the native Open dialog returned and the paths preload's pathForFile
// read off a dropped / pasted File (webUtils.getPathForFile: only a File the user gave the page has one), and the
// convert-document IPC refuses any other path as `not_staged`. A path the renderer merely names (attachments:inspect,
// a restored draft or queue entry) is never granted, so it stays a file reference; each child process is killed after CONVERT_TIMEOUT_MS and
// its output is cut at MAX_TEXT_CHARS (the result says `truncated`). Nothing here talks to the network.
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");

const PDF_EXTENSIONS = Object.freeze(["pdf"]);
// textutil's readable formats (man textutil: txt, html, rtf, rtfd, doc, docx, wordml, odt, webarchive), minus plain
// text, which the core reads itself.
const TEXTUTIL_EXTENSIONS = Object.freeze(["docx", "doc", "rtf", "html", "htm", "odt"]);
const CONVERTIBLE_EXTENSIONS = Object.freeze([...PDF_EXTENSIONS, ...TEXTUTIL_EXTENSIONS]);
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const MAX_TEXT_CHARS = 200000;
const CONVERT_TIMEOUT_MS = 30000;
const CAPTURE_TIMEOUT_MS = 15000;
const OSASCRIPT = "/usr/bin/osascript";
const TEXTUTIL = "/usr/bin/textutil";
const SCREENCAPTURE = "/usr/sbin/screencapture";
const SCREENSHOT_NAME = "screenshot.png";

// JXA: argv[0] the PDF, argv[1] the character budget. Prints {pages, text} or {error}.
const PDF_SCRIPT = [
  "function run(argv){",
  "ObjC.import('PDFKit');",
  "var doc=$.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(argv[0]));",
  "if(!doc||doc.isNil())return JSON.stringify({error:'unreadable'});",
  "if(doc.isLocked)return JSON.stringify({error:'locked'});",
  "var s=doc.string,limit=Number(argv[1])||0;",
  "var text=(s&&!s.isNil())?s.js:'';",
  "return JSON.stringify({pages:Number(doc.pageCount),text:text.length>limit?text.slice(0,limit+1):text});",
  "}",
].join("");

function extensionOf(file) {
  const name = path.basename(String(file || ""));
  const at = name.lastIndexOf(".");
  return at > 0 ? name.slice(at + 1).toLowerCase() : "";
}

function isConvertiblePath(file) {
  return CONVERTIBLE_EXTENSIONS.includes(extensionOf(file));
}

// The paths this app session saw the user choose. Bounded (oldest dropped first); keys are path.resolve'd strings,
// so "/a/./b.pdf" and "/a/b.pdf" are one entry and a relative or NUL-carrying string is never granted.
const STAGED_LIMIT = 4096;
const stagedKey = (file) => (typeof file === "string" && file && file.length <= 4096 && !file.includes("\0") && path.isAbsolute(file)
  ? path.resolve(file) : null);
function createStagedPaths({ limit = STAGED_LIMIT } = {}) {
  const granted = new Set();
  return {
    grant(paths) {
      for (const file of Array.isArray(paths) ? paths : [paths]) {
        const key = stagedKey(file);
        if (!key) continue;
        granted.delete(key);
        granted.add(key);
        while (granted.size > limit) granted.delete(granted.values().next().value);
      }
    },
    has(file) { const key = stagedKey(file); return !!key && granted.has(key); },
    get size() { return granted.size; },
  };
}

const inside = (child, parent) => {
  const relative = path.relative(parent, child);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
};

/** Spawn `command` and collect stdout up to `maxBytes` (then the child is killed and `overflow` is set). */
function collect(command, args, { spawn = childProcess.spawn, timeout = CONVERT_TIMEOUT_MS, maxBytes = MAX_TEXT_CHARS * 4 + 4096 } = {}) {
  return new Promise((resolve) => {
    let child;
    try { child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] }); }
    catch (error) { resolve({ code: null, error, stdout: "", overflow: false, timedOut: false }); return; }
    const chunks = [];
    let bytes = 0, overflow = false, timedOut = false, settled = false;
    const finish = (result) => { if (settled) return; settled = true; clearTimeout(timer); resolve(result); };
    const timer = setTimeout(() => { timedOut = true; try { child.kill("SIGKILL"); } catch {} finish({ code: null, stdout: "", overflow, timedOut }); }, timeout);
    child.stdout?.on("data", (chunk) => {
      if (overflow) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      const room = maxBytes - bytes;
      if (buffer.length > room) {
        chunks.push(buffer.subarray(0, Math.max(0, room)));
        bytes = maxBytes; overflow = true;
        try { child.kill("SIGKILL"); } catch {}
        return;
      }
      chunks.push(buffer); bytes += buffer.length;
    });
    child.stderr?.on("data", () => {});
    child.on("error", (error) => finish({ code: null, error, stdout: Buffer.concat(chunks).toString("utf8"), overflow, timedOut }));
    child.on("close", (code) => finish({ code, stdout: Buffer.concat(chunks).toString("utf8"), overflow, timedOut }));
  });
}

/** Cut `text` at MAX_TEXT_CHARS; `truncated` when anything was dropped. Line endings become \n. */
function boundText(text, { overflow = false, limit = MAX_TEXT_CHARS } = {}) {
  let value = String(text ?? "").replace(/\r\n?/g, "\n").replace(/\u0000/g, "");
  // A cut inside a UTF-8 sequence leaves U+FFFD at the very end: drop it.
  if (overflow) value = value.replace(/�+$/u, "");
  const truncated = overflow || value.length > limit;
  if (value.length > limit) value = value.slice(0, limit);
  return { text: value.replace(/\s+$/u, ""), truncated };
}

// An HTML file without its own charset is read as UTF-8 (textutil would take Latin-1); one that declares a charset
// keeps it (-inputencoding overrides the declaration).
async function htmlDeclaresCharset(file, readHead) {
  try {
    const head = await readHead(file, 4096);
    return /<meta[^>]+charset\s*=/i.test(head);
  } catch { return false; }
}
async function readHeadDefault(file, length) {
  const handle = await fs.promises.open(file, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead).toString("latin1");
  } finally { await handle.close(); }
}

/**
 * Convert one staged document to text.
 * Resolves {ok:true, name, path, fileType, text, pages, truncated} or {ok:false, reason, path}; never throws for a bad
 * file. reason: invalid | not_staged | unsupported | not_found | not_file | too_large | refused | timeout | unreadable
 * | empty. `staged` (createStagedPaths) is required by the IPC: a path it never granted is `not_staged`, before any
 * stat. A caller in the main process converting its own copy (project knowledge) leaves it out.
 */
async function convertDocument(file, { platform = process.platform, spawn, internalRoots = [], staged, stat = fs.promises.stat,
  realpath = fs.promises.realpath, readHead = readHeadDefault, timeout = CONVERT_TIMEOUT_MS } = {}) {
  const fail = (reason) => ({ ok: false, reason, path: typeof file === "string" ? file : "" });
  if (typeof file !== "string" || !file || file.includes("\0") || !path.isAbsolute(file)) return fail("invalid");
  if (staged !== undefined && !(typeof staged?.has === "function" && staged.has(file))) return fail("not_staged");
  const fileType = extensionOf(file);
  if (!CONVERTIBLE_EXTENSIONS.includes(fileType)) return fail("unsupported");
  if (platform !== "darwin") return fail("unsupported");
  let real, info;
  try { real = await realpath(file); info = await stat(real); }
  catch { return fail("not_found"); }
  if (!info.isFile()) return fail("not_file");
  if (info.size > MAX_INPUT_BYTES) return fail("too_large");
  for (const root of internalRoots) {
    if (typeof root !== "string" || !root) continue;
    let resolved = root;
    try { resolved = await realpath(root); } catch {}
    if (inside(real, resolved) || inside(real, root)) return fail("refused");
  }
  const name = path.basename(file);
  if (PDF_EXTENSIONS.includes(fileType)) {
    const run = await collect(OSASCRIPT, ["-l", "JavaScript", "-e", PDF_SCRIPT, real, String(MAX_TEXT_CHARS)], { spawn, timeout });
    if (run.timedOut) return fail("timeout");
    let parsed = null;
    try { parsed = JSON.parse(run.stdout.trim()); } catch {}
    if (run.code !== 0 || !parsed || typeof parsed !== "object" || parsed.error) return fail("unreadable");
    const pages = Number.isFinite(Number(parsed.pages)) ? Math.max(0, Math.floor(Number(parsed.pages))) : null;
    const bounded = boundText(parsed.text);
    if (!bounded.text.trim()) return fail("empty");
    return { ok: true, name, path: file, fileType, text: bounded.text, pages, truncated: bounded.truncated };
  }
  const args = ["-convert", "txt", "-encoding", "UTF-8"];
  if ((fileType === "html" || fileType === "htm") && !(await htmlDeclaresCharset(real, readHead))) args.push("-inputencoding", "UTF-8");
  args.push("-stdout", real);
  const run = await collect(TEXTUTIL, args, { spawn, timeout });
  if (run.timedOut) return fail("timeout");
  if (!run.overflow && run.code !== 0) return fail("unreadable");
  const bounded = boundText(run.stdout, { overflow: run.overflow });
  if (!bounded.text.trim()) return fail("empty");
  return { ok: true, name, path: file, fileType, text: bounded.text, pages: null, truncated: bounded.truncated };
}

/**
 * Capture the main display into `directory` as a PNG attachment: {path, name: "screenshot.png", size, type}.
 * Throws when the capture fails (the renderer shows the official "Could not capture screen.").
 */
async function captureScreenshot({ directory, platform = process.platform, spawn, desktopCapturer, screen, timeout = CAPTURE_TIMEOUT_MS,
  writeFile = fs.promises.writeFile, mkdir = fs.promises.mkdir, stat = fs.promises.stat, unlink = fs.promises.unlink } = {}) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) throw new Error("Could not capture screen");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}-screenshot.png`);
  if (platform === "darwin") {
    const run = await collect(SCREENCAPTURE, ["-x", "-m", "-t", "png", target], { spawn, timeout, maxBytes: 65536 });
    let size = 0;
    try { size = (await stat(target)).size; } catch {}
    if (run.timedOut || run.code !== 0 || !size) { try { await unlink(target); } catch {} throw new Error("Could not capture screen"); }
    return { path: target, name: SCREENSHOT_NAME, size, type: "image/png" };
  }
  if (!desktopCapturer?.getSources) throw new Error("Could not capture screen");
  const display = screen?.getPrimaryDisplay?.();
  const scale = display?.scaleFactor || 1;
  const width = Math.round((display?.size?.width || 1920) * scale), height = Math.round((display?.size?.height || 1080) * scale);
  const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height } });
  const source = (sources || []).find((entry) => String(entry.display_id) === String(display?.id)) || sources?.[0];
  const bytes = source?.thumbnail && !source.thumbnail.isEmpty?.() ? source.thumbnail.toPNG() : null;
  if (!bytes || !bytes.length) throw new Error("Could not capture screen");
  await writeFile(target, bytes, { flag: "wx" });
  return { path: target, name: SCREENSHOT_NAME, size: bytes.length, type: "image/png" };
}

module.exports = {
  CONVERTIBLE_EXTENSIONS, PDF_EXTENSIONS, TEXTUTIL_EXTENSIONS, MAX_INPUT_BYTES, MAX_TEXT_CHARS, CONVERT_TIMEOUT_MS,
  CAPTURE_TIMEOUT_MS, SCREENSHOT_NAME, PDF_SCRIPT, STAGED_LIMIT,
  extensionOf, isConvertiblePath, boundText, collect, createStagedPaths, convertDocument, captureScreenshot,
};
