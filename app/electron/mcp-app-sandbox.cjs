// R4g-mcp MA-3 (research-ext/X1 §6 MA-3, §7 G1): the local sandbox proxy for MCP App widgets (D35).
//
// 2.42304.0 draws an MCP App in two nested frames. The renderer (shared-78 `jk`) makes the outer frame with
// sandbox="allow-scripts allow-same-origin allow-forms" and allow="fullscreen *" plus the resource's
// `_meta.ui.permissions` (`Sk`/`xk`), points it at the proxy page `mcpAppsSandboxProxyUrl`
// (shared-23 "https://sandbox.claudemcpcontent.com/mcp_apps") with its first host label swapped for a per-session
// hash (cbc7fd025 `x(e,t)` = SHA-256(sessionId + serverIdentifier), first 32 hex; `k`/`A` swap the label), and adds the
// URL parameters `connect-src` / `resource-src` / `frame-src` / `dev` (cd9b7fccf). The proxy page says
// `ui/notifications/sandbox-proxy-ready`; the AppBridge (c131c9a32) answers `ui/notifications/sandbox-resource-ready
// {html, sandbox?, csp?, permissions?}`; the proxy draws the inner frame and from then on relays the MCP Apps JSON-RPC
// and the raw `anthropic:*` messages (shared-78 `Bk`) both ways.
//
// The proxy page is a remote page, not part of the Desktop bundle, so it cannot be extracted (G1). The host writes its
// own (mcp-app-sandbox-page.html) and serves it from the private scheme oc-mcp-sandbox://<hash>/mcp_apps. Only that one
// page is served, from memory: the scheme never reads the file system, and preload code never runs in it (the windows
// do not enable nodeIntegrationInSubFrames, and the preload only runs in the main frame). Everything else is a 404,
// including the template's `/libs/imagine/streaming-helpers-1/...` (G2, the template falls back on its own) and fonts
// (G4). R4i-mcp MC2 checked the installed 2.42304.0 package for originals to serve offline: it carries no
// AnthropicSans/Serif-Text-*-Static.otf (they live on https://assets.claude.ai/Fonts/, cbc4150d0 / cde7c3a92) and no
// /libs/imagine tree (it lives on the remote sandbox origin), so the scheme still serves nothing else and resource-src
// keeps https://assets.claude.ai as cd9b7fccf adds it (tests/mcp-app-mc2.test.mjs).
//
// The CSP is built from the URL parameters, which are checked here the way cbc7fd025 `c` checks them (only the names in
// its lists `i` and `a`, each at most once, else refused) and whose sources must be plain https/wss origins. The page
// then checks the `csp` of `sandbox-resource-ready` against the same lists (both must agree: a source that is in the
// message but not in the URL refuses the resource) and adds the same policy as a <meta> to the inner document, which as
// a srcdoc frame also inherits the response CSP of the proxy page.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SCHEME = "oc-mcp-sandbox";
const PROXY_PATH = "/mcp_apps";
// cbc7fd025: `i` (the URL parameters that shape the sandbox) and `a` (bookkeeping parameters).
const CSP_PARAMS = ["connect-src", "resource-src", "frame-src", "dev"];
const OTHER_PARAMS = ["base", "stable-origin", "uniq", "appVersion"];
const ALLOWED_PARAMS = new Set([...CSP_PARAMS, ...OTHER_PARAMS]);
// cbc7fd025 `s`: the per-session hash label.
const HASH = /^[0-9a-f]{32}$/;
// shared-78 `jk`: the frame flags; `xk`: resource permissions -> Permission Policy features.
const SANDBOX_FLAGS = "allow-scripts allow-same-origin allow-forms";
const PERMISSION_FEATURES = { camera: "camera", microphone: "microphone", geolocation: "geolocation", clipboardWrite: "clipboard-write" };
// Official RA (main CFJssAFf readFromCliMcpAppServer): 10 MB resource limit.
const MAX_HTML = 10 * 1024 * 1024;
const MAX_SOURCES = 64;
const MAX_SOURCE_LENGTH = 255;
const SOURCE = /^(https|wss):\/\/(\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*(?::\d{1,5})?$/;
const PAGE_FILE = path.join(__dirname, "mcp-app-sandbox-page.html");
const CONFIG_MARK = "/*__OC_MCP_SANDBOX_CONFIG__*/null";
const HELPERS_MARK = "/*__OC_MCP_SANDBOX_HELPERS__*/";

/** cbc7fd025 `x(e,t)` -> `_`: the sandbox host label of a session's server (SHA-256 of the two strings, 32 hex). */
function sandboxHash(sessionId, serverIdentifier) {
  if (typeof sessionId !== "string" || !sessionId || typeof serverIdentifier !== "string" || !serverIdentifier) throw new Error("Invalid MCP App sandbox identity.");
  return crypto.createHash("sha256").update(sessionId + serverIdentifier).digest("hex").slice(0, 32);
}

/** The proxy page URL for a hash (the local stand-in for the official `mcpAppsSandboxProxyUrl` with its swapped label). */
function sandboxProxyUrl(hash) {
  if (!HASH.test(String(hash))) throw new Error("Invalid MCP App sandbox hash.");
  return `${SCHEME}://${hash}${PROXY_PATH}`;
}

/** One declared source, lower-cased without a trailing slash, or null when it is not a plain https/wss origin. */
function normalizeSource(value) {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase().replace(/\/+$/, "");
  if (!text || text.length > MAX_SOURCE_LENGTH || !SOURCE.test(text)) return null;
  const port = /:(\d+)$/.exec(text);
  if (port && (Number(port[1]) < 1 || Number(port[1]) > 65535)) return null;
  return text;
}

/** A space-separated URL parameter (cd9b7fccf joins with " ") -> deduplicated sources, or null when any is invalid. */
function parseSourceList(value) {
  const parts = String(value).split(/\s+/).filter(Boolean);
  if (parts.length > MAX_SOURCES) return null;
  const out = [];
  for (const part of parts) {
    const source = normalizeSource(part);
    if (!source) return null;
    if (!out.includes(source)) out.push(source);
  }
  return out;
}

/**
 * The checked URL parameters of a proxy page request: {ok:true, connect, resource, frame, dev} or {ok:false, error}.
 * Like cbc7fd025 `c`: an unknown or repeated parameter refuses the whole URL.
 */
function parseSandboxQuery(searchParams) {
  const seen = new Set();
  const out = { ok: true, connect: [], resource: [], frame: [], dev: false };
  for (const [name, value] of searchParams) {
    if (!ALLOWED_PARAMS.has(name)) return { ok: false, error: `Unknown sandbox parameter: ${name}` };
    if (seen.has(name)) return { ok: false, error: `Repeated sandbox parameter: ${name}` };
    seen.add(name);
    if (name === "connect-src" || name === "resource-src" || name === "frame-src") {
      const list = parseSourceList(value);
      if (!list) return { ok: false, error: `Invalid sources in ${name}` };
      out[name === "connect-src" ? "connect" : name === "resource-src" ? "resource" : "frame"] = list;
    } else if (name === "dev" || name === "stable-origin") {
      if (value !== "true") return { ok: false, error: `Invalid ${name}` };
      // `dev` is accepted but never loosens the policy here (the host has no developer sandbox).
      if (name === "dev") out.dev = true;
    } else if (name === "base") {
      if (!HASH.test(value)) return { ok: false, error: "Invalid base" };
    } else if (name === "uniq") {
      if (!/^[0-9a-f]{8}$/.test(value)) return { ok: false, error: "Invalid uniq" };
    } else if (!/^[\x21-\x7e]{1,64}$/.test(value)) {
      return { ok: false, error: "Invalid appVersion" };
    }
  }
  return out;
}

/**
 * The widget document's CSP (self-contained: its source is also inlined into the proxy page). Per the c131c9a32
 * schema: connectDomains -> connect-src (none when empty), resourceDomains -> script/style/img/font/media (no network
 * resources when empty), frameDomains -> frame-src ('none' when empty), base-uri 'self'.
 */
function buildCsp(lists) {
  const join = (items) => (items && items.length ? " " + items.join(" ") : "");
  const resource = join(lists && lists.resource);
  return [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:" + resource,
    "style-src 'self' 'unsafe-inline' blob:" + resource,
    "img-src 'self' data: blob:" + resource,
    "font-src 'self' data: blob:" + resource,
    "media-src 'self' data: blob:" + resource,
    "worker-src 'self' blob:" + resource,
    "connect-src" + (lists && lists.connect && lists.connect.length ? join(lists.connect) : " 'none'"),
    "frame-src" + (lists && lists.frame && lists.frame.length ? join(lists.frame) : " 'none'"),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

/** The response CSP of the proxy page: the widget policy plus the frame flags as a CSP sandbox (if ever loaded alone). */
function pageCsp(lists) {
  return `${buildCsp(lists)}; sandbox ${SANDBOX_FLAGS}`;
}

const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

function createMcpAppSandbox({ pageFile = PAGE_FILE } = {}) {
  let template = null;
  const readTemplate = () => {
    if (template === null) {
      const text = fs.readFileSync(pageFile, "utf8");
      if (text.split(CONFIG_MARK).length !== 2 || text.split(HELPERS_MARK).length !== 2) throw new Error("MCP App sandbox page is missing its placeholders.");
      template = text;
    }
    return template;
  };
  /** The proxy page for checked parameters, with its allowed sources and the shared CSP builder inlined. */
  function page(lists) {
    const config = { connect: lists.connect, resource: lists.resource, frame: lists.frame, sandbox: SANDBOX_FLAGS, permissions: PERMISSION_FEATURES, maxHtml: MAX_HTML };
    return readTemplate().split(HELPERS_MARK).join(`const buildCsp = ${buildCsp.toString()};`).split(CONFIG_MARK).join(safeJson(config));
  }
  const plain = (status, text) => new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  /** The protocol.handle handler: GET oc-mcp-sandbox://<32 hex>/mcp_apps?<checked parameters>, nothing else. */
  async function handle(request) {
    let url;
    try { url = new URL(request.url); } catch { return plain(404, "Not found"); }
    if (url.protocol !== `${SCHEME}:` || !HASH.test(url.hostname) || url.username || url.password || url.port) return plain(404, "Not found");
    if (url.pathname !== PROXY_PATH) return plain(404, "Not found");
    if (request.method && request.method !== "GET") return plain(405, "Method not allowed");
    const lists = parseSandboxQuery(url.searchParams);
    if (!lists.ok) return plain(400, lists.error);
    return new Response(page(lists), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": pageCsp(lists),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }
  return { handle, page };
}

// R4g review fix: device permissions of the sandbox frames. The outer frame's allow (shared-78 jk) and the inner one
// (this page, the same rule) delegate camera / microphone / geolocation / clipboard-write / fullscreen as the resource
// declares, and Electron grants every request when a session has no handler. 2.42304.0 does not withhold them in the
// renderer (cd9b7fccf's `withholdDevicePermissions` has no caller); its main process (index.chunk-muI2IV6k
// `defaultSession.setPermissionRequestHandler` / `setPermissionCheckHandler`) is what refuses them: an MCP App frame
// is neither a claude.ai origin, file: nor the main window's origin (`G8`/`UNa`), and an origin-less sub frame such as
// the inner about:srcdoc one is refused outright (`Ejn`, and `G8` for media). The host keeps that rule for its own
// sandbox: a request or check whose URL or origin is oc-mcp-sandbox:, or that comes from an origin-less sub frame,
// is refused; every other request keeps the session's current answer (`fallback`, Electron's default: granted).
const ORIGINLESS_URL = /^(about|data):/i;
function isSandboxPermissionRequest({ requestingUrl, securityOrigin, requestingOrigin, isMainFrame } = {}) {
  const fromSandbox = [requestingUrl, securityOrigin, requestingOrigin].some((value) => typeof value === "string" && value.trim().toLowerCase().startsWith(`${SCHEME}:`));
  if (fromSandbox) return true;
  return isMainFrame === false && typeof requestingUrl === "string" && (requestingUrl === "" || ORIGINLESS_URL.test(requestingUrl.trim()));
}
/** Installs the permission fence on an Electron session (the default session, where the scheme is handled). */
function guardSandboxPermissions(session, { fallbackRequest = () => true, fallbackCheck = () => true } = {}) {
  session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (isSandboxPermissionRequest(details || {})) { callback(false); return; }
    callback(fallbackRequest(webContents, permission, details) === true);
  });
  session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (isSandboxPermissionRequest({ ...(details || {}), requestingOrigin })) return false;
    return fallbackCheck(webContents, permission, requestingOrigin, details) === true;
  });
}

module.exports = {
  SCHEME, PROXY_PATH, CSP_PARAMS, OTHER_PARAMS, SANDBOX_FLAGS, PERMISSION_FEATURES, MAX_HTML,
  sandboxHash, sandboxProxyUrl, normalizeSource, parseSourceList, parseSandboxQuery, buildCsp, pageCsp, createMcpAppSandbox,
  isSandboxPermissionRequest, guardSandboxPermissions,
};
