// U-2: the page moves from file:// (BrowserWindow.loadFile) to app://localhost (app-protocol.cjs). Chromium keys
// localStorage by origin, so everything the host page kept under "file://" (settings, drafts, sidebar state: ~46
// host modules use localStorage) would look lost on the first app://localhost launch. Main copies it across once,
// before any window loads, with the official way of writing another origin's localStorage from the main process:
// the 4.16336.0 Chrome-import storage seed (reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build/
// index.chunk-DDNaWqT2.js @16901-19300):
//   Ie   a hidden WebContentsView {session, sandbox, contextIsolation, nodeIntegration:false, javascript:false,
//        images:false, webgl:false}, a 15 s timeout (Ae = 15e3), stop + debugger.detach + close in finally.
//   Le   about:blank first, debugger attached, Fetch.requestPaused fulfils only the Document request at
//        `${origin}${je}` (je = "/__claude-import__") with an empty text/plain 200 and fails every other request
//        (BlockedByClient); Network.enable, Network.setBypassServiceWorker, Fetch.enable {urlPattern:"*"}; the load
//        must end at that URL (ERR_SEED_DOCUMENT); then DOMStorage.enable and storageId {securityOrigin, isLocalStorage}.
//   Fe   DOMStorage.setDOMStorageItem {key, value} per item, a failed item skipped.
// The read of the old origin uses the same view (javascript off, nothing of the page runs) with
// DOMStorage.getDOMStorageItems on a file:// document; Fetch does not intercept file://, so that document is an empty
// file main writes for the purpose.
// Host rules (OpenClaude, keep local data): one migration per profile, recorded in <userData>/origin-migration/
// state.json; a key the new origin already has is never overwritten (a re-run or a run after the user changed a
// setting is a no-op for that key); the old origin is never cleared, and the full old snapshot is kept in
// <userData>/origin-migration/file-origin-localStorage.json, so going back to a file:// build still finds its data
// and the copy can be redone by deleting state.json. A failed migration writes no state: main loads the page from
// file:// for that launch (data stays visible) and tries again next launch.
const fs = require("node:fs/promises");
const path = require("node:path");

const SEED_PATH = "/__claude-import__"; // je
const SEED_TIMEOUT_MS = 15e3; // Ae
const FILE_ORIGIN = "file://";
const STATE_VERSION = 1;

function withTimeout(promise, ms, code) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("storage seed timed out"), { code })), ms); })])
    .finally(() => clearTimeout(timer));
}
// Re
function loadIn(contents, url) {
  return new Promise((resolve, reject) => {
    const off = () => { contents.off("did-finish-load", done); contents.off("did-fail-load", failed); };
    const done = () => { off(); resolve(); };
    const failed = (_event, code, description) => { off(); reject(Object.assign(new Error(`storage seed load failed: ${code}`), { code: description || `ERR_${code}` })); };
    contents.on("did-finish-load", done);
    contents.on("did-fail-load", failed);
    contents.loadURL(url).catch(() => {});
  });
}
const cdp = (contents, method, params) => contents.debugger.sendCommand(method, params);

/**
 * Ie + Le: `run(send)` against the localStorage of `securityOrigin`, inside a hidden javascript-off view whose
 * document is `documentUrl`. `intercept`: the Fetch fulfilment of Le (the app scheme); off for file://.
 */
async function withOriginStorage({ WebContentsView, session, documentUrl, securityOrigin, intercept, timeoutMs = SEED_TIMEOUT_MS }, run) {
  const view = new WebContentsView({ webPreferences: { session, sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false, images: false, webgl: false } });
  const contents = view.webContents;
  const over = { value: false };
  const work = (async () => {
    await loadIn(contents, "about:blank");
    contents.debugger.attach("1.3");
    if (intercept) {
      contents.debugger.on("message", (_event, method, params) => {
        if (method !== "Fetch.requestPaused") return;
        const { requestId, resourceType, request } = params;
        (resourceType === "Document" && request.url === documentUrl
          ? cdp(contents, "Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "text/plain" }], body: "" })
          : cdp(contents, "Fetch.failRequest", { requestId, errorReason: "BlockedByClient" })).catch(() => {});
      });
      await cdp(contents, "Network.enable");
      await cdp(contents, "Network.setBypassServiceWorker", { bypass: true });
      await cdp(contents, "Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
    }
    if (over.value) throw Object.assign(new Error("storage seed timed out"), { code: "ERR_SEED_TIMEOUT" });
    await loadIn(contents, documentUrl);
    if (contents.getURL() !== documentUrl) throw Object.assign(new Error("storage seed document not at origin"), { code: "ERR_SEED_DOCUMENT" });
    await cdp(contents, "DOMStorage.enable");
    const storageId = { securityOrigin, isLocalStorage: true };
    return run((method, params) => cdp(contents, method, { storageId, ...params }));
  })();
  try { return await withTimeout(work, timeoutMs, "ERR_SEED_TIMEOUT"); }
  finally {
    over.value = true;
    if (!contents.isDestroyed()) {
      try { contents.stop(); } catch {}
      try { contents.debugger.detach(); } catch {}
      try { contents.close(); } catch {}
    }
  }
}

const readItems = async (send) => {
  const { entries } = await send("DOMStorage.getDOMStorageItems");
  return (Array.isArray(entries) ? entries : []).filter((entry) => Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string");
};
// Fe: each item set on its own, a failed item skipped; the keys written.
const writeItems = (items) => async (send) => {
  const written = [];
  for (const [key, value] of items) {
    try { await send("DOMStorage.setDOMStorageItem", { key, value }); written.push(key); } catch {}
  }
  return written;
};

/**
 * The one-time copy file:// → app://localhost. Answers {status: "done"|"already"|"failed", ...}; "failed" leaves no
 * state, so the caller keeps the old origin for this launch and the next launch tries again.
 */
async function migrateFileOriginStorage({ WebContentsView, session, userData, appOrigin, timeoutMs = SEED_TIMEOUT_MS, log = () => {} }) {
  const dir = path.join(userData, "origin-migration");
  const stateFile = path.join(dir, "state.json");
  try {
    const state = JSON.parse(await fs.readFile(stateFile, "utf8"));
    if (state?.version === STATE_VERSION && state.to === appOrigin && state.status === "done") return { status: "already", state };
  } catch {}
  try {
    await fs.mkdir(dir, { recursive: true });
    const blank = path.join(dir, "file-origin-reader.html");
    await fs.writeFile(blank, "");
    const fileUrl = require("node:url").pathToFileURL(blank).href;
    const old = await withOriginStorage({ WebContentsView, session, documentUrl: fileUrl, securityOrigin: FILE_ORIGIN, intercept: false, timeoutMs }, readItems);
    const backup = path.join(dir, "file-origin-localStorage.json");
    if (old.length) await fs.writeFile(backup, JSON.stringify({ origin: FILE_ORIGIN, readAt: new Date().toISOString(), items: old }), { flag: "w" });
    const seedUrl = `${appOrigin}${SEED_PATH}`;
    const result = await withOriginStorage({ WebContentsView, session, documentUrl: seedUrl, securityOrigin: appOrigin, intercept: true, timeoutMs }, async (send) => {
      const present = new Set((await readItems(send)).map(([key]) => key));
      const missing = old.filter(([key]) => !present.has(key));
      const written = await writeItems(missing)(send);
      return { kept: old.length - missing.length, written: written.length, skipped: missing.length - written.length };
    });
    if (result.skipped > 0) throw Object.assign(new Error(`${result.skipped} item(s) could not be written`), { code: "ERR_SEED_ITEMS" });
    session.flushStorageData?.();
    const state = { version: STATE_VERSION, status: "done", from: FILE_ORIGIN, to: appOrigin, at: new Date().toISOString(), read: old.length, ...result, backup: old.length ? backup : null };
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    log("[origin-migration] localStorage copied", state);
    return { status: "done", state };
  } catch (error) {
    log("[origin-migration] failed; the page stays on file:// for this launch", { code: error?.code ?? null, message: String(error?.message ?? error) });
    return { status: "failed", error: { code: error?.code ?? null, message: String(error?.message ?? error) } };
  }
}

module.exports = { SEED_PATH, SEED_TIMEOUT_MS, FILE_ORIGIN, STATE_VERSION, withOriginStorage, migrateFileOriginStorage };
