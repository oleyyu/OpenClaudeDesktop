// U-2: local media for the app://localhost page, ported from the 4.16336.0 main process SessionMedia module
// (reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build/index.chunk-Du-Wqi0E.js @6553366-6557400). The page
// never names a file:// URL: main mints an unguessable claude-media:// URL for one file and answers only that file.
//   x9   "claude-media", privileged {standard, secure, stream, bypassCSP} in the one registerSchemesAsPrivileged call
//        (@6660458). No supportFetchAPI and no corsEnabled: the page can show the file (<img>/<video>/<audio>/frame)
//        but cannot fetch() its bytes, and a canvas that draws it is tainted.
//   f_o  the image types a signed (s) URL may stream: png/jpg/jpeg/gif/webp/bmp/avif; p_o 10 MB cap for s URLs.
//   m_o  a random 32-byte HMAC key per launch; h_o HMAC-SHA256(sessionId \0 rootPath \0 relative) base64url;
//        b_o claude-media://s/<sessionId>/<relative>?sig=…; A_o checks the signature with timingSafeEqual.
//   T_o  claude-media://v/<16 random bytes base64url> for one {absPath, mime, sessionId}; S9 keeps at most S_o = 64
//        (oldest evicted), each expires x_o = 6 h after its last use (C_o / E_o), D_o refreshes on use.
//   j_o  the handler: s → A_o; v → the token's entry, Br (UNC) refused, Cx (no symbolic link on any component of the
//        path), v_o (the authorisation hook, default admit), then withinRoot (M_o relative inside the root) or a
//        plain stat().isFile(), streamed with Range (O_o / k_o: 206/416, Accept-Ranges, Cache-Control no-store).
//   u_o  O_NOFOLLOW open whose fstat and lstat agree and nlink === 1 (refuses hard links) — used for the
//        singleNamedWithoutModule entries (N_o).
//   CqaSnEfn mintMediaStreamUrlFor: the token URL gets ?v=<floor(mtimeMs)> so a changed file is fetched again;
//        MEDIA_EXT_TO_MIME is the audio/video table the official v tokens are minted for.
// Host adaptation (OpenClaude): the official page mints through session-scoped IPC (getSessionMediaStreamUrl);
// here the preload asks synchronously (desktop:media-url, sender checked in main.cjs) so the existing synchronous
// URL builders keep their shape; mintLocalMedia() canonicalises the path (realpath) and admits only the image, audio
// and video tables above plus .pdf (LOCAL_DOCUMENT_EXT_TO_MIME, for the Files viewer's PDF frame). readDataUrl() is
// readSessionImageAsDataUrl's local answer (c5259f582 ke: copy/save of a claude-media image reads its bytes from
// main instead of the tainted canvas).
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");

const MEDIA_SCHEME = "claude-media";
const MEDIA_SCHEME_PRIVILEGES = Object.freeze({ standard: true, secure: true, stream: true, bypassCSP: true });
const IMAGE_MIME = Object.freeze({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp", ".avif": "image/avif" });
const AV_MIME = Object.freeze({ ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/mp4", ".m4v": "video/mp4", ".ogv": "video/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".wav": "audio/wav", ".flac": "audio/flac", ".opus": "audio/ogg", ".ogg": "audio/ogg", ".oga": "audio/ogg" });
const DOCUMENT_MIME = Object.freeze({ ".pdf": "application/pdf" });
const LOCAL_MEDIA_MIME = Object.freeze({ ...IMAGE_MIME, ...AV_MIME, ...DOCUMENT_MIME });
const SIGNED_MAX_BYTES = 10485760;
const TOKEN_TTL_MS = 216e5;
const MAX_TOKENS = 64;
const DATA_URL_MAX_BYTES = 30 * 1024 * 1024;
const OPEN_SINGLE = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0);

const notFound = () => new Response(null, { status: 404 });
// Br: a UNC / device path is never served.
const isUncPath = (value) => /^[\\/]{2}/.test(value);
// wx / Cx: "free" when no component of the absolute path is a symbolic link.
async function linkFree(absPath) {
  try {
    const root = path.parse(absPath).root;
    let current = root;
    for (const part of absPath.slice(root.length).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if ((await fs.promises.lstat(current)).isSymbolicLink()) return false;
    }
    return true;
  } catch { return false; }
}
// M_o: the slash-joined path of `target` inside `root`, or null outside it.
function relativeInside(root, target) {
  const rel = path.relative(root, target).split(path.sep).join("/");
  return rel === "" || rel === ".." || rel.startsWith("../") || path.isAbsolute(rel) ? null : rel;
}
// O_o: a single bytes range, "unsatisfiable", or null (whole file).
function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first, last] = match;
  if (first === "" && last === "") return null;
  if (first === "") {
    const suffix = Number(last);
    return !Number.isSafeInteger(suffix) || suffix === 0 || size === 0 ? "unsatisfiable" : { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(first);
  if (!Number.isSafeInteger(start) || start >= size) return "unsatisfiable";
  const end = last === "" ? size - 1 : Math.min(Number(last), size - 1);
  return !Number.isSafeInteger(end) || end < start ? null : { start, end };
}
// k_o: the (partial) answer, streamed from open(start, end).
async function streamAnswer(request, size, mime, open, warn) {
  const headers = new Headers({ "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") { headers.set("Content-Range", `bytes */${size}`); return new Response(null, { status: 416, headers }); }
  if (size === 0) { headers.set("Content-Length", "0"); return new Response(null, { status: 200, headers }); }
  const start = range?.start ?? 0, end = range?.end ?? size - 1;
  headers.set("Content-Length", String(end - start + 1));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  try { return new Response(Readable.toWeb(await open(start, end)), { status: range ? 206 : 200, headers }); }
  catch (error) { warn(`[SessionMedia] failed to stream file: ${error}`); return new Response(null, { status: 500 }); }
}
// u_o: an O_NOFOLLOW handle on a regular file with exactly one name, else null.
async function openSingleNamed(absPath) {
  let handle;
  try { handle = await fs.promises.open(absPath, OPEN_SINGLE); } catch (error) { if (error?.code === "ELOOP") return null; throw error; }
  try {
    const opened = await handle.stat({ bigint: true }), named = await fs.promises.lstat(absPath, { bigint: true });
    if (opened.isFile() && named.isFile() && named.dev === opened.dev && named.ino === opened.ino && named.nlink === 1n) return handle;
  } catch {}
  await handle.close().catch(() => {});
  return null;
}

function createSessionMedia({ now = () => Date.now(), warn = () => {}, key = crypto.randomBytes(32) } = {}) {
  const tokens = new Map();
  let sessionRoot = () => null; // g_o / __o: sessionId -> root folder of a signed URL
  let authorize = () => Promise.resolve(true); // v_o / y_o
  const sign = (sessionId, rootPath, relative) => crypto.createHmac("sha256", key).update(`${sessionId}\0${rootPath}\0${relative}`).digest("base64url");
  const sweep = (at) => { for (const [token, entry] of tokens) if (at - entry.lastUsedAtMs > TOKEN_TTL_MS) tokens.delete(token); };
  /** T_o */
  function mint(absPath, mime, options = {}) {
    const at = now();
    sweep(at);
    const withinRoot = options.withinRoot, single = options.singleNamedWithoutModule === true;
    for (const [token, entry] of tokens) if (entry.absPath === absPath && entry.mime === mime && entry.sessionId === options.sessionId) {
      entry.lastUsedAtMs = at; entry.withinRoot ??= withinRoot; entry.singleNamedWithoutModule ||= single;
      tokens.delete(token); tokens.set(token, entry);
      return `${MEDIA_SCHEME}://v/${token}`;
    }
    while (tokens.size >= MAX_TOKENS) { const oldest = tokens.keys().next().value; if (oldest === undefined) break; tokens.delete(oldest); }
    const token = crypto.randomBytes(16).toString("base64url");
    tokens.set(token, { absPath, sessionId: options.sessionId, mime, withinRoot, singleNamedWithoutModule: single, lastUsedAtMs: at });
    return `${MEDIA_SCHEME}://v/${token}`;
  }
  /** E_o */
  function lookup(token) {
    const entry = tokens.get(token);
    if (!entry) return null;
    if (now() - entry.lastUsedAtMs > TOKEN_TTL_MS) { tokens.delete(token); return null; }
    return entry;
  }
  /** D_o */
  function touch(token, entry) { if (tokens.get(token) === entry) { entry.lastUsedAtMs = now(); tokens.delete(token); tokens.set(token, entry); } }
  /** b_o */
  function signedUrl(sessionId, rootPath, relative) {
    const encoded = relative.split("/").map(encodeURIComponent).join("/");
    return `${MEDIA_SCHEME}://s/${encodeURIComponent(sessionId)}/${encoded}?sig=${sign(sessionId, rootPath, relative)}`;
  }
  /** A_o: a signed URL of an image inside the session's root. */
  async function serveSigned(url, request) {
    let sessionId, rest;
    try { [sessionId, ...rest] = url.pathname.split("/").filter(Boolean).map(decodeURIComponent); } catch { return notFound(); }
    const relative = rest.join("/");
    const root = sessionId && relative ? await sessionRoot(sessionId) : null;
    const mime = IMAGE_MIME[relative.slice(relative.lastIndexOf(".")).toLowerCase()];
    if (!root || !mime) return notFound();
    let realRoot;
    try { realRoot = await fs.promises.realpath(root); } catch { return notFound(); }
    const given = url.searchParams.get("sig") ?? "", expected = sign(sessionId, realRoot, relative);
    if (given.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return notFound();
    const target = path.resolve(realRoot, relative);
    if (relativeInside(realRoot, target) === null || !(await linkFree(target))) return notFound();
    const handle = await openSingleNamed(target).catch(() => null);
    if (!handle) return notFound();
    let handed = false;
    try {
      const { size } = await handle.stat();
      if (size > SIGNED_MAX_BYTES) return notFound();
      return await streamAnswer(request, size, mime, async (start, end) => { handed = true; return handle.createReadStream({ start, end, autoClose: true }); }, warn);
    } catch { return notFound(); }
    finally { if (!handed) await handle.close().catch(() => {}); }
  }
  /** The checks j_o makes before it answers a token: the entry, or null. */
  async function admitted(token) {
    const entry = lookup(token);
    if (!entry || isUncPath(entry.absPath) || !(await linkFree(entry.absPath))) return null;
    if (!(await Promise.resolve(authorize(entry.absPath, entry.sessionId)).catch(() => false))) return null;
    if (entry.withinRoot !== undefined && relativeInside(entry.withinRoot, entry.absPath) === null) return null;
    return entry;
  }
  /** j_o */
  async function handle(request) {
    let url;
    try { url = new URL(request.url); } catch { return new Response(null, { status: 400 }); }
    if (url.protocol !== `${MEDIA_SCHEME}:`) return notFound();
    if (url.hostname === "s") return serveSigned(url, request);
    if (url.hostname !== "v") return notFound();
    const token = url.pathname.split("/").filter(Boolean)[0];
    if (!token) return notFound();
    const entry = await admitted(token);
    if (!entry) return notFound();
    if (entry.singleNamedWithoutModule) {
      const opened = await openSingleNamed(entry.absPath).catch(() => null);
      if (!opened) return notFound();
      let handed = false;
      try {
        const { size } = await opened.stat();
        touch(token, entry);
        return await streamAnswer(request, size, entry.mime, async (start, end) => { handed = true; return opened.createReadStream({ start, end, autoClose: true }); }, warn);
      } catch { return notFound(); }
      finally { if (!handed) await opened.close().catch(() => {}); }
    }
    const stat = await fs.promises.stat(entry.absPath).catch(() => null);
    if (!stat?.isFile()) return notFound();
    touch(token, entry);
    return streamAnswer(request, stat.size, entry.mime, async (start, end) => fs.createReadStream(entry.absPath, { start, end }), warn);
  }
  /**
   * The host's mint (CqaSnEfn mintMediaStreamUrlFor over T_o): an absolute path of a known media type, canonicalised,
   * a regular file now; claude-media://v/<token>?v=<mtime>, else null. Synchronous: the preload answers the page's
   * synchronous URL builders.
   */
  function mintLocalMedia(filePath, options = {}) {
    if (typeof filePath !== "string" || !path.isAbsolute(filePath) || /[\0\r\n]/.test(filePath) || isUncPath(filePath)) return null;
    const mime = LOCAL_MEDIA_MIME[path.extname(filePath).toLowerCase()];
    if (!mime) return null;
    let real, stat;
    try { real = fs.realpathSync(filePath); stat = fs.statSync(real); } catch { return null; }
    if (!stat.isFile() || LOCAL_MEDIA_MIME[path.extname(real).toLowerCase()] !== mime) return null;
    return `${mint(real, mime, options)}?v=${Math.floor(stat.mtimeMs)}`;
  }
  /** readSessionImageAsDataUrl (c5259f582 ke): the bytes of a minted image as a data URL, after j_o's checks. */
  async function readDataUrl(value) {
    let url;
    try { url = new URL(String(value)); } catch { return null; }
    if (url.protocol !== `${MEDIA_SCHEME}:` || url.hostname !== "v") return null;
    const token = url.pathname.split("/").filter(Boolean)[0];
    const entry = token ? await admitted(token) : null;
    if (!entry || !Object.values(IMAGE_MIME).includes(entry.mime)) return null;
    const handle = await openSingleNamed(entry.absPath).catch(() => null) ?? (entry.singleNamedWithoutModule ? null : await fs.promises.open(entry.absPath, "r").catch(() => null));
    if (!handle) return null;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > DATA_URL_MAX_BYTES) return null;
      const bytes = await handle.readFile();
      touch(token, entry);
      return { dataUrl: `data:${entry.mime};base64,${bytes.toString("base64")}`, name: path.basename(entry.absPath), mime: entry.mime };
    } catch { return null; } finally { await handle.close().catch(() => {}); }
  }
  return {
    mint, signedUrl, handle, mintLocalMedia, readDataUrl,
    setSessionRootResolver: (fn) => { sessionRoot = typeof fn === "function" ? fn : () => null; },
    setAuthorize: (fn) => { authorize = typeof fn === "function" ? fn : () => Promise.resolve(true); },
    clear: () => tokens.clear(), // w_o
    size: () => tokens.size,
  };
}

module.exports = { MEDIA_SCHEME, MEDIA_SCHEME_PRIVILEGES, IMAGE_MIME, AV_MIME, LOCAL_MEDIA_MIME, SIGNED_MAX_BYTES, TOKEN_TTL_MS, MAX_TOKENS, parseRange, relativeInside, linkFree, createSessionMedia };
