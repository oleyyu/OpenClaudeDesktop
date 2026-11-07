const fs = require("node:fs/promises");
const path = require("node:path");
const { pathInside, remotePathRefused } = require("./fs-paths.cjs");
// Containment of real paths (both sides realpath'd: links and Windows 8.3 short names expanded). A root that already
// ends in a separator ("/", "D:\\") isn't given a second one; Windows compares case-insensitively (fs-paths.cjs).
const within = (child, parent) => pathInside(parent, child);
// The renderer's workspace-relative paths are "/"-joined on every host (a Windows listing gave "src\\a.ts").
const relativeJoin = (relative, name) => process.platform === "win32" ? path.posix.join(String(relative).replace(/\\/g, "/"), name) : path.join(relative, name);
// Windows: a relative that is (or resolves to) a UNC or device path (\\host\share, //host/share, \\?\UNC\…) is
// refused before any fs call, which would already contact that host with the user's credentials (fs-paths.cjs
// remotePathRefused); a workspace that is itself on a share keeps its own files. platform: tests only.
async function scopedPath(root, relative = "", { platform = process.platform } = {}) {
  if (remotePathRefused(String(relative), { base: root, platform })) throw new Error("File is outside the selected workspace.");
  const realRoot = await fs.realpath(root);
  const requested = path.resolve(realRoot, relative);
  const resolved = await fs.realpath(requested);
  if (!within(resolved, realRoot))
    throw new Error("File is outside the selected workspace.");
  return resolved;
}
// Symlink rows (2.2553.1 readable/panes-tile-current.js:5572-5588 Rg, the
// file-tree-link-mark at :5762-5769): the target text, and whether it resolves
// inside the working directory (ok), outside it (external), not at all
// (dangling) or into a loop (cycle). The row takes `directory` from the target,
// so a directory link expands (through scopedPath, which still refuses one that
// leaves the workspace).
async function linkInfo(realRoot, full) {
  let target = "";
  try { target = await fs.readlink(full); } catch { /* unreadable link text */ }
  try {
    const resolved = await fs.realpath(full);
    const stat = await fs.stat(resolved);
    const inside = within(resolved, realRoot);
    return { directory: stat.isDirectory(), link: { target, state: inside ? "ok" : "external" } };
  } catch (error) {
    return { directory: false, link: { target, state: error?.code === "ELOOP" ? "cycle" : "dangling" } };
  }
}
async function listFiles(root, relative = "", { includeChild } = {}) {
  const target = await scopedPath(root, relative);
  const realRoot = await fs.realpath(root);
  const entries = await fs.readdir(target, { withFileTypes: true });
  const compareEntries = (a, b) =>
    Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name);
  const sorted = (await Promise.all(entries
    .filter((e) => ![".git", "node_modules", ".DS_Store"].includes(e.name))
    .map(async (e) => {
      const entry = {
        name: e.name,
        path: relativeJoin(relative, e.name),
        directory: e.isDirectory(),
        symlink: e.isSymbolicLink(),
      };
      return entry.symlink ? { ...entry, ...(await linkInfo(realRoot, path.join(target, e.name))) } : entry;
    })))
    .sort(compareEntries);
  const page = sorted.slice(0, 500);
  // A reveal hint only retains an already-enumerated, normally eligible child.
  // This bounds the response at 500; it does not bypass exclusions or fabricate
  // a path that was not present in the actual directory snapshot.
  const validHint = typeof includeChild === "string" && includeChild.length > 0 &&
    includeChild.length <= 4096 && !includeChild.includes("/") && !(process.platform === "win32" && includeChild.includes("\\")) && !includeChild.includes("\0") &&
    includeChild !== "." && includeChild !== "..";
  if (validHint) {
    const index = sorted.findIndex(entry => entry.name === includeChild);
    if (index >= 500) {
      page[499] = sorted[index];
      page.sort(compareEntries);
    }
  }
  return page;
}
// The Files pane viewer's read (2.2553.1 cd2efac6e To/Un cards :3602-3740,
// binary :4604-4612, empty :4336-4346): expected outcomes are classified
// results, never thrown errors, so the pane opens a tab with the matching card
// instead of an IPC error string. The traversal guard is unchanged: nothing
// outside the workspace's real path is read (outside_root).
const PREVIEW_LIMIT = 1024 * 1024;
// Images, video and audio (cd2efac6e nr/ir :2672-2673 over shared-4 Jh and
// shared-11 gh/hh; the same lists as file-preview-model.mjs fileMediaKind) are
// shown from their file:// URL, so the read only classifies them by name and
// size and never loads the bytes. `unavailable` repeats the kind: the Files
// pane keeps a no-text result as {unavailable, size} (source-session.jsx
// loadFile), and the viewer reads these three kinds as media, not as cards.
// "View as text anyway" (force) reads the bytes as before.
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "bmp", "webp", "avif"]);
function mediaKind(name) {
  const at = name.lastIndexOf(".");
  if (IMAGE_EXTENSIONS.has(at < 0 ? "" : name.slice(at + 1).toLowerCase())) return "image";
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(name)) return "video";
  if (/\.(mp3|m4a|aac|wav|flac|opus|ogg|oga)$/i.test(name)) return "audio";
  // B13: a PDF opens in Chromium's built-in viewer from its file:// URL (the stand-in for the desktop native preview,
  // c6e1d8764 On), so it is classified like the media kinds and never read.
  if (/\.pdf$/i.test(name)) return "pdf";
  return null;
}
// B32 (2.31226.0 c4e0cfada k :78-92 `creatable`, read by cd2efac6e bp/Cp/wp :5195-5198): whether the viewer's
// "Create file" can make a missing file — the same rule as file-editor.cjs writeFile with no prior hash: no
// dangling link at the path, and its parent folder exists, really, inside the workspace.
async function missingCreatable(realRoot, lexical) {
  if (await fs.lstat(lexical).then(() => true, () => false)) return false;
  try {
    const parent = await fs.realpath(path.dirname(lexical));
    if (!within(parent, realRoot)) return false;
    return (await fs.stat(parent)).isDirectory();
  } catch { return false; }
}
async function readFile(root, relative, { force = false, documentBytes = false } = {}) {
  const requested = relative;
  let target;
  try {
    target = await scopedPath(root, relative);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") {
      // A missing path that lexically leaves the workspace is still refused as outside.
      let creatable;
      try {
        const realRoot = await fs.realpath(root), lexical = path.resolve(realRoot, relative);
        if (!within(lexical, realRoot)) return { path: requested, unavailable: "outside_root" };
        creatable = await missingCreatable(realRoot, lexical);
      } catch { return { path: requested, unavailable: "read_error" }; }
      return { path: requested, unavailable: "missing", creatable };
    }
    if (/outside the selected workspace/.test(error?.message ?? "")) return { path: requested, unavailable: "outside_root" };
    return { path: requested, unavailable: "read_error" };
  }
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) return { path: requested, unavailable: "read_error" };
    // Current viewer's panelDocumentLoader: raw downloads are limited to
    // PDF and supported Office documents, with the same session-folder scope.
    if (documentBytes) {
      if (!/\.(pdf|docx|xlsx|pptx)$/i.test(requested) || !/\.(pdf|docx|xlsx|pptx)$/i.test(target)) return { path: requested, unavailable: 'unsupported' };
      return { path: requested, bytes: new Uint8Array(await fs.readFile(target)) };
    }
    const kind = force ? null : mediaKind(String(requested));
    if (kind) return { path: requested, kind, size: stat.size, unavailable: kind };
    if (stat.size > PREVIEW_LIMIT) return { path: requested, unavailable: "too_large", size: stat.size };
    const b = await fs.readFile(target);
    if (force) return { path: requested, text: b.toString("utf8"), size: b.byteLength };
    const { decodeFileBytes } = await import('./generated/file-text-decoder.mjs');
    const decoded = decodeFileBytes(b);
    if (decoded.reason) return { path: requested, unavailable: decoded.reason === 'too_large' ? 'too_large' : 'binary' };
    return { path: requested, text: decoded.contents, size: decoded.fileSize,
      ...(decoded.encoding === 'utf-8' ? {} : { encoding: decoded.encoding }) };
  } catch (error) {
    return { path: requested, unavailable: error?.code === "ENOENT" ? "missing" : "read_error" };
  }
}
// Opening a session file in its default app (a deliverable or artifact card's Open): the checks of 2.2553.1's
// openSessionFileInDefaultApp (index.chunk-cH2hnEce.js; lists b9t / x9t / S9t in index.chunk-ChZ67Jhw.js), so an
// agent can't get code run outside its sandbox by sending a launcher the user then opens with one click.
// Always refused: installers, disk images, bundles. Refused for open: scripts and launchers macOS or Windows runs on
// open. Windows: Explorer's default action runs installers (.msi/.msix/.appx/.msp/.mst/.msu), PowerShell modules and
// data files, .inf (Install), .scf (Explorer commands), .gadget, .xbap, .website and Windows Script (.ws/.sct) files.
const BLOCKED_TYPES = new Set([".exe", ".com", ".msi", ".scr", ".pif", ".cpl", ".bin", ".app", ".dmg", ".pkg", ".mpkg", ".sparsebundle", ".sparseimage", ".iso", ".img", ".cdr", ".toast", ".vhd", ".vhdx", ".prefpane", ".saver", ".jar",
  ".msix", ".msixbundle", ".appx", ".appxbundle", ".msp", ".mst", ".msu", ".vsix", ".vsto"]);
const BLOCKED_OPEN_TYPES = new Set((".sh,.bash,.zsh,.command,.tool,.terminal,.fileloc,.inetloc,.webloc,.bat,.cmd,.ps1,.vb,.vbs,.vbe,.jse,.wsf,.wsh,.wsc,.hta,.lnk,.reg,.msc,.url,.wsb,.jnlp,.js,.pl,.py,.pyw,.pyz,.pyzw,.rb,.scpt,.scptd,.applescript,.workflow,.action,.osax,.smi,.term,.ftploc,.afploc,.vncloc,.mobileconfig,.chm,.xll,.application,.appref-ms,.settingcontent-ms,.search-ms,.library-ms,.diagcab,.appinstaller,.desktop"
  + ",.psm1,.psd1,.ps1xml,.ps2,.ps2xml,.psc1,.psc2,.msh,.msh1,.msh2,.mshxml,.msh1xml,.msh2xml,.inf,.scf,.gadget,.xbap,.website,.ws,.sct,.shs,.shb,.hlp,.ins,.isp,.its,.ade,.adp,.mde,.accde,.mam,.mdz,.iqy,.slk").split(","));
// Documents that may carry the executable bit (a file copied off a FAT drive) and still open as documents.
const DOCUMENT_TYPES = new Set(".pdf,.txt,.md,.rtf,.doc,.docx,.xls,.xlsx,.csv,.tsv,.ppt,.pptx,.pages,.numbers,.key,.png,.jpg,.jpeg,.gif,.bmp,.tif,.tiff,.webp,.svg,.heic,.heif,.ico,.psd,.mp3,.m4a,.wav,.aac,.flac,.aiff,.mp4,.m4v,.mov,.avi,.webm,.zip,.tar,.gz,.tgz,.bz2,.html,.htm,.css,.json,.xml,.yaml,.yml,.epub,.ics,.vcf,.eml,.log".split(","));
/** A path's type as 2.2553.1 reads it (xA): its extension, or a dotfile's whole name, NFKC-folded and lower-cased. */
function fileType(file) {
  const name = path.basename(String(file)).toLowerCase();
  return (path.extname(name) || (name.startsWith(".") ? name : "")).normalize("NFKC").toLowerCase();
}
/**
 * Why a session file must not be opened in its default app, else null. `requested`: the path as asked (before links
 * resolve); `resolved`: its real path inside the session folder (scopedPath). Reasons are user-facing English (main
 * translates them).
 */
async function openBlockReason(requested, resolved) {
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f‪-‮⁦-⁩]/.test(resolved)) return "This file can’t be opened from here because its name has unusual characters. Use Show in Finder instead.";
  if (path.extname(String(requested)).toLowerCase() !== path.extname(resolved).toLowerCase()) return "This link points to a different kind of file, so it can’t be opened from here. Use Show in Finder instead.";
  const type = fileType(resolved);
  if (BLOCKED_TYPES.has(type) || BLOCKED_OPEN_TYPES.has(type)) return "OpenClaude Desktop doesn’t open apps, scripts or installers from a session. Use Show in Finder instead.";
  let stat;
  try { stat = await fs.lstat(resolved); } catch { return "File not found."; }
  if (stat.isSymbolicLink() || !stat.isFile()) return "Only files can be opened from here. Use Show in Finder instead.";
  // Windows reports no executable bits (mode & 0o111 is always 0 there): the type lists above are the only guard.
  if ((stat.mode & 0o111) && !DOCUMENT_TYPES.has(path.extname(resolved).toLowerCase())) return "OpenClaude Desktop doesn’t open apps, scripts or installers from a session. Use Show in Finder instead.";
  return null;
}
// main.cjs reveal-folder (a project's or session's folder in Finder): only an absolute, existing directory. A folder macOS
// would launch instead of open (an .app, .workflow or other package) is to be revealed in its parent (launches: true);
// a plain folder named like a file (chart.js, example.com) still opens.
const PACKAGE_FOLDER_TYPES = new Set([".app", ".pkg", ".mpkg", ".sparsebundle", ".prefpane", ".saver", ".scptd", ".workflow", ".action", ".osax"]);
async function revealFolderTarget(folder) {
  if (typeof folder !== "string" || !path.isAbsolute(folder) || folder.includes("\0")) throw new Error("Unknown workspace directory.");
  let stat;
  try { stat = await fs.stat(folder); } catch { throw new Error("The folder no longer exists."); }
  if (!stat.isDirectory()) throw new Error("The folder no longer exists.");
  return { folder, launches: PACKAGE_FOLDER_TYPES.has(fileType(folder)) };
}
// R3-files FT-05 (files-11 / files-v01): LocalSessions isSessionPathGone, which the Files pane's right-click menus ask
// (through the renderer gone hook, 2.42304.0 c856385e2 V) before they open, so a deleted path offers no "Open in",
// "Show in Finder" or "Open in terminal". The original lives in the desktop main process (asar
// index.chunk-CFJssAFf.js, class ZB): isSessionPathGone (kill switch, 4096-character limit, no NUL, at most 2 asks in
// flight, shared by key, 2 s deadline), judgeSessionPathGone (the path made absolute against the session folder must
// lie inside one of the session's granted roots by their real paths, else "link_spelled" / "outside"; device paths are
// "refused") and qB (walk from the filesystem root without following links: a link on the way is "through_link",
// ENOENT is "absent"; only absent means gone). Local adaptation: the session's roots are its working folder and the
// additional folders in its metadata (main.cjs `file:gone`); the walk is an lstat per component instead of the
// original's native no-follow opens; there is no GrowthBook, so the main-side kill switch ("3736295273") is off.
const PATH_GONE_DEADLINE_MS = 2000, MAX_PATH_GONE_ASKS = 2, MAX_PATH_GONE_CHARS = 4096;
// Windows: case-insensitive, either separator (fs-paths.cjs pathInside); macOS: exactly as before.
const pathWithin = (child, parent) => pathInside(parent, child);
// Windows device names (NUL, CON, COM1, LPT1… with any extension) name no file in any folder.
const WINDOWS_DEVICE = /(?:^|[\\/])(?:con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³]|conin\$|conout\$)(?:\.[^\\/]*)?$/i;
/** qB: "present", "through_link", "absent" or "unreadable" for an absolute path, never following a link. */
async function pathPresence(absolute) {
  const { root } = path.parse(absolute);
  let current = root;
  for (const part of path.relative(root, absolute).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = await fs.lstat(current); } catch (error) { return error?.code === "ENOENT" ? "absent" : "unreadable"; }
    if (stat.isSymbolicLink()) return "through_link";
  }
  return "present";
}
/** judgeSessionPathGone: "gone", or why not ("outside", "link_spelled", "refused", "present", …). */
async function judgeSessionPathGone({ root, sessionFolders = [], filePath, home = require("node:os").homedir() }) {
  if (typeof root !== "string" || !path.isAbsolute(root)) return "outside";
  // requestedPath: "~" is the home folder; a network (UNC) spelling is never judged.
  const requested = filePath === "~" || filePath.startsWith("~/") || (process.platform === "win32" && filePath.startsWith("~\\")) ? path.join(home, filePath.slice(1)) : filePath;
  if (/^(?:\\\\|\/\/)/.test(requested)) return "outside";
  const absolute = path.resolve(root, requested);
  const spelled = [root, ...sessionFolders].filter((folder) => typeof folder === "string" && path.isAbsolute(folder));
  const real = [];
  for (const folder of spelled) { const resolved = await fs.realpath(folder).catch(() => null); if (resolved) real.push(resolved); }
  if (!real.some((folder) => pathWithin(absolute, folder))) return spelled.some((folder) => pathWithin(absolute, folder)) ? "link_spelled" : "outside";
  if (/^\/dev(\/|$)/.test(absolute)) return "refused";
  if (process.platform === "win32" && WINDOWS_DEVICE.test(absolute)) return "refused";
  const presence = await pathPresence(absolute);
  return presence === "absent" ? "gone" : presence;
}
/** isSessionPathGone(sessionId, filePath) with its in-flight sharing, ask limit and deadline; resolves to a boolean. */
function createSessionPathGone({ deadlineMs = PATH_GONE_DEADLINE_MS, maxAsks = MAX_PATH_GONE_ASKS, disabled = () => false, judge = judgeSessionPathGone } = {}) {
  const asks = new Map();
  const off = () => { try { return disabled() ?? false; } catch { return true; } };
  return function sessionPathGone({ sessionId, root, sessionFolders = [], filePath }) {
    if (off() || typeof sessionId !== "string" || typeof filePath !== "string" || sessionId.length > MAX_PATH_GONE_CHARS ||
        filePath.length > MAX_PATH_GONE_CHARS || filePath.includes("\0")) return Promise.resolve(false);
    const key = `${sessionId}\0${filePath}`;
    let ask = asks.get(key);
    if (!ask) {
      if (asks.size >= maxAsks) return Promise.resolve(false);
      const judged = Promise.resolve().then(() => judge({ root, sessionFolders, filePath })).catch(() => "error").finally(() => asks.delete(key));
      let timer;
      const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve("deadline"), deadlineMs); });
      ask = Promise.race([judged, deadline]).finally(() => clearTimeout(timer)).then((verdict) => verdict !== null && !off() && verdict === "gone");
      asks.set(key, ask);
    }
    return ask;
  };
}
const sessionPathGone = createSessionPathGone();
module.exports = { scopedPath, listFiles, readFile, openBlockReason, revealFolderTarget, sessionPathGone, createSessionPathGone, judgeSessionPathGone, pathPresence };
