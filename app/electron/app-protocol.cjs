// U-2 (round3-decisions.json): the renderer's own pages are served from app://localhost, after the 4.16336.0 main
// process (reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build/index.chunk-Du-Wqi0E.js), instead of
// BrowserWindow.loadFile. Under file:// the page's CSP 'self' matched every file:// URL and Chromium let a file:// page
// read any other file:// URL (fetch, XHR, <img>); app://localhost is one origin whose handler answers only the files of
// the bundle (dist/), so the page can no longer read the disk.
//   qGn  @3002137  {scheme:"app",privileges:{standard:!0,secure:!0,supportFetchAPI:!0,allowServiceWorkers:!0}}, joined to
//                  the single registerSchemesAsPrivileged call (BKn=[qGn,d$e], @6660458).
//   Fu   @954604   "app://localhost".
//   imi  @4392535  the file handler: a host other than localhost is 404; d=path.resolve(root,"."+pathname) outside root is
//                  403; a regular file is served (index.html with its headers, .html/.svg read with their type, anything
//                  else through net.fetch(pathToFileURL(d))); a missing path or a folder falls back to index.html. Every
//                  answer carries Permissions-Policy nmi="picture-in-picture=self" (@4392285).
//   Smi  @4403572  u.protocol.handle("app",async e=>_mi(await s(e))), host check first.
//   _mi  @4396553  appends "frame-ancestors 'none'" to the CSP of every answer that is not an error and has none yet.
//   X_   @1660918  an IPC sender is the app only when senderFrame.parent===null and its origin is app://localhost.
// Not ported (gate-closed locally, no backend): the custom-3p API proxy (ymi / Hpi asking-frame header / LUe 503),
// __DESKTOP_3P_PUBLIC_CONFIG__ injection, client-shell-v1.html (smi/omi) and frame-shell.html (Upi/Wpi), the asar
// presence check (bmi: dist/ is a folder here) and the computed CSP header (NUe over the 3p endpoint table): the
// bundle's own <meta http-equiv="Content-Security-Policy"> in index.html stays the page policy, and the header added
// here is only _mi's frame-ancestors, which a meta tag cannot carry.
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");

const APP_SCHEME = "app";
const APP_HOST = "localhost";
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const APP_SCHEME_PRIVILEGES = Object.freeze({ standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true });
const PERMISSIONS_POLICY = "picture-in-picture=self";
// ami: the two types read from disk directly instead of through net.fetch.
const DIRECT_TYPES = Object.freeze({ ".html": "text/html", ".svg": "image/svg+xml" });

/** app://localhost/index.html with the window's query (what BrowserWindow.loadFile(dist/index.html, {query}) gave). */
function appPageUrl(query = null) {
  const url = new URL(`${APP_ORIGIN}/index.html`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, String(value));
  return url.href;
}

/** _mi: frame-ancestors 'none' appended, unless the answer is an error or already names frame-ancestors. */
function withFrameAncestors(response) {
  if (response.type === "error" || response.headers.get("Content-Security-Policy")?.includes("frame-ancestors")) return response;
  const headers = new Headers(response.headers);
  headers.append("Content-Security-Policy", "frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, headers });
}

/**
 * imi + Smi for one bundle folder. `fetchFile(url)` is electron's net.fetch (injected so node tests can run the
 * handler); the answer of a file:// fetch keeps its own Content-Type.
 */
function createAppProtocolHandler({ root, fetchFile, warn = () => {} }) {
  if (typeof root !== "string" || !path.isAbsolute(root)) throw new Error("app protocol root must be an absolute path");
  if (typeof fetchFile !== "function") throw new Error("app protocol needs net.fetch");
  const base = path.resolve(root);
  const indexFile = path.join(base, "index.html");
  // s: the answer of a bundle file with the page headers.
  const withHeaders = (response) => {
    const headers = new Headers(response.headers);
    headers.set("Permissions-Policy", PERMISSIONS_POLICY);
    return new Response(response.body, { status: response.status, headers });
  };
  // c: index.html itself.
  const index = async () => new Response(await fs.readFile(indexFile, "utf8"), {
    status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Permissions-Policy": PERMISSIONS_POLICY },
  });
  async function serve(request) {
    let url;
    try { url = new URL(request.url); } catch { return new Response(null, { status: 400 }); }
    if (url.hostname !== APP_HOST) return new Response(null, { status: 404 });
    const pathname = url.pathname;
    const target = path.resolve(base, "." + pathname);
    if (target !== base && !target.startsWith(base + path.sep)) return new Response(null, { status: 403 });
    try {
      if ((await fs.stat(target)).isFile()) {
        if (path.relative(indexFile, target) === "") return index();
        const type = DIRECT_TYPES[path.extname(target)];
        return withHeaders(type ? new Response(await fs.readFile(target), { headers: { "Content-Type": type } }) : await fetchFile(pathToFileURL(target).href));
      }
    } catch {}
    if (pathname.startsWith("/assets/")) warn("[app-protocol] a file shipped with the app is missing or unreadable; if the window stays blank, quit and reopen the app");
    return index();
  }
  return async (request) => withFrameAncestors(await serve(request));
}

/** X_: the app's own top frame (dev server origins may be added for CODE_DESKTOP_DEV_URL). */
function isAppSenderFrame(frame, extraOrigins = []) {
  if (!frame || !frame.url) return false;
  let url;
  try { url = new URL(frame.url); } catch { return false; }
  if (frame.parent !== null) return false;
  const origin = url.origin === "null" || url.origin === null ? `${url.protocol}//${url.host}` : url.origin;
  return origin === APP_ORIGIN || extraOrigins.includes(origin);
}

module.exports = { APP_SCHEME, APP_HOST, APP_ORIGIN, APP_SCHEME_PRIVILEGES, PERMISSIONS_POLICY, appPageUrl, withFrameAncestors, createAppProtocolHandler, isAppSenderFrame };
