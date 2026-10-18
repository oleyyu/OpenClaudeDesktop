import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sandbox = require("../electron/mcp-app-sandbox.cjs");
const { SCHEME, SANDBOX_FLAGS, sandboxHash, sandboxProxyUrl, parseSandboxQuery, buildCsp, pageCsp, createMcpAppSandbox, isSandboxPermissionRequest, guardSandboxPermissions } = sandbox;

// R4g-mcp MA-3 (research-ext/X1 §6 MA-3, §7 G1): the host-written MCP App sandbox proxy page on oc-mcp-sandbox, standing
// in for the remote https://sandbox.claudemcpcontent.com/mcp_apps of 2.42304.0 (shared-23). Official contract pieces it
// follows: cbc7fd025 (hash label, parameter lists `i`/`a`, refusal of unknown or repeated names), cd9b7fccf (the
// connect-src / resource-src / frame-src / dev parameters), shared-78 jk (sandbox flags, "fullscreen *", the xk map) and
// c131c9a32 (sandbox-proxy-ready / sandbox-resource-ready {html, sandbox?, csp?, permissions?}).

const HASH = "0123456789abcdef0123456789abcdef";
const get = (handler, url, method = "GET") => handler.handle({ url, method });
const ESM = "https://esm.sh";

test("the hash is cbc7fd025 x(e,t): SHA-256 of sessionId + serverIdentifier, first 32 hex; the URL is <scheme>://<hash>/mcp_apps", () => {
  const expected = crypto.createHash("sha256").update("session-1visualize").digest("hex").slice(0, 32);
  assert.equal(sandboxHash("session-1", "visualize"), expected);
  assert.notEqual(sandboxHash("session-1", "visualize"), sandboxHash("session-2", "visualize"), "each session gets its own origin");
  assert.notEqual(sandboxHash("session-1", "visualize"), sandboxHash("session-1", "other"), "each server gets its own origin");
  assert.equal(sandboxProxyUrl(expected), `${SCHEME}://${expected}/mcp_apps`);
  assert.throws(() => sandboxProxyUrl("../etc"), /Invalid/);
  assert.throws(() => sandboxHash("", "visualize"), /Invalid/);
  assert.throws(() => sandboxHash("s", undefined), /Invalid/);
});

test("official reference strings are where the module says they are", async () => {
  const root = new URL("../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/", import.meta.url);
  let names;
  try { names = await fs.readdir(root); } catch { return; } // reference tree not present on this machine
  const read = async (prefix) => fs.readFile(new URL(names.find((name) => name.startsWith(prefix)), root), "utf8");
  const count = (text, needle) => text.split(needle).length - 1;
  const cbc7 = await read("cbc7fd025-");
  assert.equal(count(cbc7, 'i=["connect-src","resource-src","frame-src","dev"],a=new Set([r,"stable-origin","uniq","appVersion"])'), 1);
  assert.equal(count(cbc7, 'var r="base"'), 1);
  assert.equal(count(cbc7, "s=/^[0-9a-f]{32}$/"), 1);
  assert.equal(count(cbc7, "async function x(e,t){return _(e+t)}"), 1);
  const s78 = await read("shared-78-");
  assert.equal(count(s78, `u.setAttribute("sandbox","${SANDBOX_FLAGS}")`), 1);
  assert.equal(count(s78, 'var xk={camera:"camera",microphone:"microphone",geolocation:"geolocation",clipboardWrite:"clipboard-write"}'), 1);
  assert.equal(count(s78, '"fullscreen *"'), 1);
  assert.deepEqual(sandbox.PERMISSION_FEATURES, { camera: "camera", microphone: "microphone", geolocation: "geolocation", clipboardWrite: "clipboard-write" });
  const cd9 = await read("cd9b7fccf-");
  assert.equal(count(cd9, 'l.searchParams.set("connect-src",s.csp.connectDomains.join(" "))'), 1);
  assert.equal(count(cd9, 'l.searchParams.set("resource-src",d.join(" "))'), 1);
  assert.equal(count(cd9, 'l.searchParams.set("dev","true")'), 1);
  const bridge = await read("c131c9a32-");
  assert.equal(count(bridge, '"ui/notifications/sandbox-proxy-ready"'), 2);
  assert.equal(count(bridge, '"ui/notifications/sandbox-resource-ready"'), 3);
  assert.equal(count(bridge, `sandbox:t().optional().describe("Optional override for the inner iframe's sandbox attribute.")`), 1);
  const s23 = await read("shared-23-");
  assert.equal(count(s23, 'mcpAppsSandboxProxyUrl:"https://sandbox.claudemcpcontent.com/mcp_apps"'), 1);
});

test("URL parameters: only cbc7fd025's names, each once, with plain https/wss sources", () => {
  const q = (text) => parseSandboxQuery(new URLSearchParams(text));
  assert.deepEqual(q(""), { ok: true, connect: [], resource: [], frame: [], dev: false });
  const good = q(`connect-src=${encodeURIComponent("https://esm.sh https://CDN.jsdelivr.net/ wss://live.example.com:8443")}&resource-src=${encodeURIComponent("https://*.example.com https://esm.sh")}&uniq=0a1b2c3d&appVersion=0.2.186&stable-origin=true&base=${HASH}&dev=true`);
  assert.deepEqual(good, { ok: true, connect: ["https://esm.sh", "https://cdn.jsdelivr.net", "wss://live.example.com:8443"], resource: ["https://*.example.com", "https://esm.sh"], frame: [], dev: true });
  // Unknown and repeated names refuse the URL (cbc7fd025 `c` returns null).
  assert.equal(q("script-src=https://esm.sh").ok, false);
  assert.equal(q("connect-src=https://a.com&connect-src=https://b.com").ok, false);
  // Sources that would widen or break the policy.
  for (const bad of ["*", "https:", "https://*", "http://example.com", "data:", "blob:", "'unsafe-eval'", "https://a.com;script-src *", "https://a.com,https://b.com", "file:///etc", "oc-file-preview://x", "https://user@a.com", "https://a.com/path", "https://a.com:99999", "javascript:alert(1)", "'self'"]) {
    assert.equal(q(`connect-src=${encodeURIComponent(bad)}`).ok, false, bad);
    assert.equal(q(`resource-src=${encodeURIComponent(`https://ok.com ${bad}`)}`).ok, false, bad);
    assert.equal(q(`frame-src=${encodeURIComponent(bad)}`).ok, false, bad);
  }
  assert.equal(q(`connect-src=${encodeURIComponent(Array.from({ length: 65 }, (_, i) => `https://h${i}.com`).join(" "))}`).ok, false, "too many sources");
  assert.equal(q("dev=1").ok, false);
  assert.equal(q("base=xyz").ok, false);
  assert.equal(q("uniq=zz").ok, false);
});

test("the CSP lets the widget reach only the declared sources, and nothing when none are declared", () => {
  const none = buildCsp({ connect: [], resource: [], frame: [] });
  assert.match(none, /^default-src 'none'; /);
  assert.match(none, /connect-src 'none'/);
  assert.match(none, /frame-src 'none'/);
  assert.match(none, /script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;/);
  assert.match(none, /object-src 'none'; base-uri 'self'; form-action 'none'$/);
  assert.doesNotMatch(none, /https:|\*/, "no network source at all");
  const declared = buildCsp({ connect: [ESM], resource: ["https://cdn.jsdelivr.net"], frame: ["https://embed.example.com"] });
  assert.match(declared, /connect-src https:\/\/esm\.sh;/);
  for (const directive of ["script-src", "style-src", "img-src", "font-src", "media-src", "worker-src"]) assert.match(declared, new RegExp(`${directive} [^;]*https://cdn\\.jsdelivr\\.net;`), directive);
  assert.match(declared, /frame-src https:\/\/embed\.example\.com;/);
  assert.equal(pageCsp({ connect: [], resource: [], frame: [] }), `${none}; sandbox ${SANDBOX_FLAGS}`);
});

test("the handler serves only GET <hash>/mcp_apps with checked parameters; it never reaches files", async () => {
  const handler = createMcpAppSandbox();
  const url = `${sandboxProxyUrl(HASH)}?connect-src=${encodeURIComponent(ESM)}&resource-src=${encodeURIComponent(`${ESM} https://cdnjs.cloudflare.com`)}`;
  const page = await get(handler, url);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(page.headers.get("content-security-policy"), pageCsp({ connect: [ESM], resource: [ESM, "https://cdnjs.cloudflare.com"], frame: [] }));
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("cache-control"), "no-store");
  const body = await page.text();
  assert.ok(body.startsWith("<!doctype html>"));
  assert.ok(!body.includes("__OC_MCP_SANDBOX_"), "both placeholders are filled");
  assert.ok(body.includes('"connect":["https://esm.sh"]'));
  assert.ok(body.includes("ui/notifications/sandbox-proxy-ready") && body.includes("ui/notifications/sandbox-resource-ready"));
  // Missing or malformed pieces.
  assert.equal((await get(handler, sandboxProxyUrl(HASH), "POST")).status, 405);
  assert.equal((await get(handler, `${sandboxProxyUrl(HASH)}?connect-src=*`)).status, 400);
  assert.equal((await get(handler, `${sandboxProxyUrl(HASH)}?evil=1`)).status, 400);
  assert.equal((await get(handler, `${SCHEME}:///mcp_apps`)).status, 404, "missing host");
  assert.equal((await get(handler, `${SCHEME}://not-a-hash/mcp_apps`)).status, 404);
  assert.equal((await get(handler, `${SCHEME}://m${"a".repeat(48)}/mcp_apps`)).status, 404, "the gated cai_misty_cascade label is not accepted");
  assert.equal((await get(handler, `${SCHEME}://${HASH}/`)).status, 404);
  assert.equal((await get(handler, `${SCHEME}://${HASH}/mcp_apps/../../etc/passwd`)).status, 404);
  assert.equal((await get(handler, `${SCHEME}://${HASH}/%2E%2E/%2E%2E/etc/hosts`)).status, 404);
  assert.equal((await get(handler, `${SCHEME}://${HASH}/libs/imagine/streaming-helpers-1/streaming-helpers.mjs`)).status, 404, "G2: the template falls back on its own");
  assert.equal((await get(handler, `oc-file-preview://${HASH}/mcp_apps`)).status, 404);
  assert.equal((await get(handler, "not a url")).status, 404);
  // The module never touches the file system beyond its own page template.
  const source = await fs.readFile(new URL("../electron/mcp-app-sandbox.cjs", import.meta.url), "utf8");
  assert.equal(source.split("fs.readFileSync(").length - 1, 1);
  assert.doesNotMatch(source, /fs\.(promises|readFile\(|stat|readdir|createReadStream)|scopedPath|require\("\.\/files/);
});

// ---- the proxy page, run against a stand-in window ----

function runPage(body, { parentOrigin = "null" } = {}) {
  const script = /<script>([\s\S]*)<\/script>/.exec(body)[1];
  const parentPosts = [];
  const errors = [];
  const parent = { postMessage: (message, target) => parentPosts.push({ message, target }) };
  const listeners = [];
  const frames = [];
  const document = {
    body: { appendChild: (node) => { node.attached = true; } },
    createElement: (tag) => {
      assert.equal(tag, "iframe");
      const posts = [];
      const node = { attributes: {}, attached: false, srcdoc: "", posts, contentWindow: { postMessage: (message, target) => posts.push({ message, target }) }, setAttribute(name, value) { this.attributes[name] = value; } };
      frames.push(node);
      return node;
    },
  };
  const origin = `${SCHEME}://${HASH}`;
  const window = { parent, addEventListener: (type, fn) => { assert.equal(type, "message"); listeners.push(fn); } };
  const context = vm.createContext({
    window, document, console: { error: (text) => errors.push(text) },
    location: { origin, ancestorOrigins: [parentOrigin] },
  });
  vm.runInContext(script, context);
  const dispatch = (event) => listeners.forEach((fn) => fn(event));
  // vm objects come from another realm: compare them as JSON.
  const plain = (value) => JSON.parse(JSON.stringify(value));
  return { origin, parent, parentPosts, frames, errors, dispatch, plain };
}

const servedPage = async (query) => (await get(createMcpAppSandbox(), `${sandboxProxyUrl(HASH)}${query}`)).text();
const resourceReady = (params) => ({ jsonrpc: "2.0", method: "ui/notifications/sandbox-resource-ready", params });

test("the page says sandbox-proxy-ready, then draws the inner frame with jk's sandbox and allow and the CSP <meta>", async () => {
  const body = await servedPage(`?connect-src=${encodeURIComponent(ESM)}&resource-src=${encodeURIComponent(`${ESM} https://cdn.jsdelivr.net`)}`);
  const run = runPage(body);
  assert.deepEqual(run.plain(run.parentPosts), [{ message: { jsonrpc: "2.0", method: "ui/notifications/sandbox-proxy-ready", params: {} }, target: "*" }]);
  run.dispatch({ source: run.parent, origin: "null", data: resourceReady({ html: "<!DOCTYPE html><p>hi</p>", csp: { connectDomains: ["https://ESM.sh/"], resourceDomains: ["https://cdn.jsdelivr.net"] }, permissions: { clipboardWrite: {}, camera: null, bogus: {} } }) });
  assert.equal(run.frames.length, 1);
  const [frame] = run.frames;
  assert.equal(frame.attributes.sandbox, "allow-scripts allow-same-origin allow-forms");
  assert.equal(frame.attributes.allow, "fullscreen *; clipboard-write *", "camera:null and unknown keys are dropped, as shared-78 Sk does");
  assert.ok(frame.attached);
  const csp = buildCsp({ connect: [ESM], resource: ["https://cdn.jsdelivr.net"], frame: [] });
  assert.equal(frame.srcdoc, `<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="${csp}"><p>hi</p>`);
  // A second resource-ready is ignored.
  run.dispatch({ source: run.parent, origin: "null", data: resourceReady({ html: "<p>again</p>" }) });
  assert.equal(run.frames.length, 1);
});

test("the dev-server parent gets its own origin as postMessage target", async () => {
  const run = runPage(await servedPage(""), { parentOrigin: "http://localhost:5173" });
  assert.equal(run.parentPosts[0].target, "http://localhost:5173");
});

test("malicious resources are refused: undeclared domains, missing html, widened sandbox, oversized html", async () => {
  const body = await servedPage(`?connect-src=${encodeURIComponent(ESM)}`);
  const refused = (params) => {
    const run = runPage(body);
    run.dispatch({ source: run.parent, origin: "null", data: resourceReady(params) });
    assert.equal(run.frames.length, 0, String(JSON.stringify(params)).slice(0, 120));
    assert.equal(run.errors.length, 1);
    return run;
  };
  refused({ html: "<p>x</p>", csp: { connectDomains: ["https://evil.example.com"] } });
  refused({ html: "<p>x</p>", csp: { connectDomains: [ESM, "*"] } });
  refused({ html: "<p>x</p>", csp: { resourceDomains: [ESM] } }, "only declared as connect-src in the URL");
  refused({ html: "<p>x</p>", csp: { frameDomains: ["https://evil.example.com"] } });
  refused({ html: "<p>x</p>", csp: { connectDomains: "https://esm.sh" } });
  refused({ html: "<p>x</p>", csp: "default-src *" });
  refused({ csp: {} });
  refused({ html: 42 });
  refused(undefined);
  refused({ html: "<p>x</p>", sandbox: "allow-scripts allow-same-origin allow-popups" });
  refused({ html: "<p>x</p>", sandbox: "allow-top-navigation" });
  refused({ html: "x".repeat(sandbox.MAX_HTML + 1) });
  // After a refusal the page stays dead: a later valid message draws nothing.
  const run = refused({ html: "<p>x</p>", csp: { connectDomains: ["https://evil.example.com"] } });
  run.dispatch({ source: run.parent, origin: "null", data: resourceReady({ html: "<p>ok</p>" }) });
  assert.equal(run.frames.length, 0);
});

test("a sandbox override can only drop official flags", async () => {
  const run = runPage(await servedPage(""));
  run.dispatch({ source: run.parent, origin: "null", data: resourceReady({ html: "<p>x</p>", sandbox: "allow-scripts" }) });
  assert.equal(run.frames[0].attributes.sandbox, "allow-scripts");
  // Without allow-same-origin the inner frame is opaque: replies from it carry origin "null".
  run.dispatch({ source: run.frames[0].contentWindow, origin: "null", data: { jsonrpc: "2.0", id: 1, method: "ui/initialize", params: {} } });
  assert.equal(run.parentPosts.length, 2);
  run.dispatch({ source: run.parent, origin: "null", data: { jsonrpc: "2.0", id: 1, result: {} } });
  assert.equal(run.frames[0].posts[0].target, "*");
});

test("relay: only parent <-> inner, only JSON-RPC and anthropic:*, and the app cannot speak for the proxy", async () => {
  const run = runPage(await servedPage(""));
  // Before the resource arrives nothing is relayed.
  run.dispatch({ source: run.parent, origin: "null", data: { jsonrpc: "2.0", method: "ui/notifications/tool-input", params: {} } });
  run.dispatch({ source: run.parent, origin: "null", data: resourceReady({ html: "<p>x</p>" }) });
  const [frame] = run.frames;
  const inner = frame.contentWindow;
  assert.equal(frame.srcdoc.startsWith('<meta http-equiv="Content-Security-Policy" content="default-src \'none\';'), true);
  // Parent -> inner.
  run.dispatch({ source: run.parent, origin: "null", data: { jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: {} } } });
  run.dispatch({ source: run.parent, origin: "null", data: { type: "anthropic:copy-image-result", ok: true } });
  run.dispatch({ source: run.parent, origin: "null", data: "plain string" });
  run.dispatch({ source: run.parent, origin: "null", data: { jsonrpc: "1.0", method: "x" } });
  run.dispatch({ source: run.parent, origin: "null", data: { jsonrpc: "2.0", method: "ui/notifications/sandbox-proxy-ready", params: {} } });
  assert.deepEqual(run.plain(frame.posts.map((post) => post.message)), [{ jsonrpc: "2.0", method: "ui/notifications/tool-input", params: { arguments: {} } }, { type: "anthropic:copy-image-result", ok: true }]);
  assert.ok(frame.posts.every((post) => post.target === run.origin), "same-origin inner frame gets an exact target");
  // Inner -> parent.
  const before = run.parentPosts.length;
  run.dispatch({ source: inner, origin: run.origin, data: { jsonrpc: "2.0", id: 1, method: "ui/initialize", params: { protocolVersion: "2025-11-21" } } });
  run.dispatch({ source: inner, origin: run.origin, data: { type: "anthropic:copy-text", text: "hi" } });
  // Forged: the app announcing the proxy, a foreign origin, a foreign window, a non-protocol message.
  run.dispatch({ source: inner, origin: run.origin, data: { jsonrpc: "2.0", method: "ui/notifications/sandbox-proxy-ready", params: {} } });
  run.dispatch({ source: inner, origin: run.origin, data: resourceReady({ html: "<p>evil</p>" }) });
  run.dispatch({ source: inner, origin: "https://evil.example.com", data: { jsonrpc: "2.0", method: "ui/message", params: {} } });
  run.dispatch({ source: { postMessage() {} }, origin: run.origin, data: { jsonrpc: "2.0", method: "ui/message", params: {} } });
  run.dispatch({ source: null, origin: "null", data: resourceReady({ html: "<p>evil</p>" }) });
  run.dispatch({ source: inner, origin: run.origin, data: { type: "custom", payload: 1 } });
  assert.deepEqual(run.plain(run.parentPosts.slice(before).map((post) => post.message)), [{ jsonrpc: "2.0", id: 1, method: "ui/initialize", params: { protocolVersion: "2025-11-21" } }, { type: "anthropic:copy-text", text: "hi" }]);
  assert.equal(run.frames.length, 1, "no forged resource-ready draws a frame");
  // Messages from a forged source pretending to be the parent never reach the inner frame.
  const posted = frame.posts.length;
  run.dispatch({ source: inner, origin: run.origin, data: { jsonrpc: "2.0", method: "ui/notifications/tool-result", params: {} } });
  assert.equal(frame.posts.length, posted);
});

test("main registers the scheme in the one privileged call before ready and handles it; index.html frames only this scheme more", async () => {
  const main = await fs.readFile(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert.equal(main.split("registerSchemesAsPrivileged(").length - 1, 1, "Electron allows a single call");
  assert.match(main, /registerSchemesAsPrivileged\(\[\{ scheme: FILE_PREVIEW_SCHEME, [^\]]*\}, \{ scheme: MCP_APP_SANDBOX_SCHEME, privileges: \{ standard: true, secure: true \} \}\]\);/);
  assert.ok(main.indexOf("registerSchemesAsPrivileged") < main.indexOf("app.whenReady()"));
  assert.match(main, /protocol\.handle\(MCP_APP_SANDBOX_SCHEME, mcpAppSandbox\.handle\)/);
  assert.match(main, /protocol\.handle\(MCP_APP_SANDBOX_SCHEME, mcpAppSandbox\.handle\);\n  \/\/ [^\n]*\n  guardSandboxPermissions\(require\("electron"\)\.session\.defaultSession\);/, "the permission fence is installed with the handler");
  assert.equal(main.split("guardSandboxPermissions(").length - 1, 1);
  assert.equal(main.split("setPermissionRequestHandler").length - 1, 0, "no other default-session handler replaces the fence");
  assert.doesNotMatch(main, /nodeIntegrationInSubFrames/, "the preload never runs in the sandbox frames");
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' oc-file-preview: oc-mcp-sandbox:; object-src 'none'; base-uri 'self'; form-action 'none'");
});

test("R4g review fix: the sandbox frames get no device permission; the app's own frames keep their answer", async () => {
  // Official main process (index.chunk-muI2IV6k): defaultSession handlers refuse an origin that is not claude.ai, file:
  // or the main window's (G8/UNa), and origin-less sub frames (Ejn). cd9b7fccf's withholdDevicePermissions has no caller.
  const ref = new URL("../../reference/installed-2.42304.0-20261017/", import.meta.url);
  const mainChunk = new URL("asar/.vite/build/index.chunk-muI2IV6k.js", ref);
  const appRenderer = new URL("ion-dist/assets/v1/cd9b7fccf-C8-F2T2b.js", ref);
  const read = async (url) => fs.readFile(url, "utf8").catch(() => null);
  const official = await read(mainChunk), renderer = await read(appRenderer);
  if (official && renderer) {
    const count = (text, needle) => text.split(needle).length - 1;
    assert.equal(count(official, "a.session.defaultSession.setPermissionRequestHandler("), 1);
    assert.equal(count(official, "a.session.defaultSession.setPermissionCheckHandler("), 1);
    assert.equal(count(official, 'function Ejn(e,t,n){return xA(t)?.hostname?!1:e==="fullscreen"||'), 1);
    assert.equal(count(official, 'function UNa(e,t){let n;try{n=new URL(e)}catch{return!1}if(n.protocol==="https:"&&SA(n.host)||n.protocol==="file:"'), 1);
    assert.equal(count(renderer, "withholdDevicePermissions"), 1, "only the AppRenderer's own default, no caller");
  }
  const origin = `${SCHEME}://${HASH}`;
  const refused = [
    { requestingUrl: `${origin}/mcp_apps?connect-src=`, isMainFrame: false },
    { requestingUrl: "about:srcdoc", isMainFrame: false, securityOrigin: origin },
    { requestingUrl: "about:srcdoc", isMainFrame: false },
    { requestingUrl: "about:srcdoc", isMainFrame: false, securityOrigin: "null" },
    { requestingUrl: "about:blank", isMainFrame: false },
    { requestingUrl: "data:text/html,x", isMainFrame: false },
    { requestingUrl: "", isMainFrame: false },
    { requestingOrigin: `${origin}`, requestingUrl: "about:srcdoc" },
    { requestingOrigin: ` ${origin.toUpperCase()}` },
  ];
  for (const details of refused) assert.equal(isSandboxPermissionRequest(details), true, JSON.stringify(details));
  const kept = [
    { requestingUrl: "file:///app/index.html", isMainFrame: true },
    { requestingUrl: "http://localhost:5173/", isMainFrame: true },
    { requestingUrl: "oc-file-preview://tok/page.html", isMainFrame: false },
    { requestingUrl: "about:blank", isMainFrame: true },
    {},
  ];
  for (const details of kept) assert.equal(isSandboxPermissionRequest(details), false, JSON.stringify(details));

  const installed = {};
  const fakeSession = { setPermissionRequestHandler(fn) { installed.request = fn; }, setPermissionCheckHandler(fn) { installed.check = fn; } };
  guardSandboxPermissions(fakeSession);
  const ask = (permission, details) => { let answer; installed.request({ id: 1 }, permission, (value) => { answer = value; }, details); return answer; };
  for (const permission of ["media", "geolocation", "clipboard-sanitized-write", "fullscreen", "pointerLock", "notifications", "openExternal"]) {
    assert.equal(ask(permission, { requestingUrl: "about:srcdoc", isMainFrame: false, securityOrigin: origin, mediaTypes: ["video", "audio"] }), false, permission);
    assert.equal(ask(permission, { requestingUrl: `${origin}/mcp_apps`, isMainFrame: false }), false, permission);
    assert.equal(installed.check({ id: 1 }, permission, origin, { requestingUrl: "about:srcdoc", isMainFrame: false }), false, permission);
    assert.equal(installed.check({ id: 1 }, permission, origin, { isMainFrame: false }), false, permission);
    // The app's own window keeps Electron's default answer (granted), as before the fence.
    assert.equal(ask(permission, { requestingUrl: "file:///app/index.html", isMainFrame: true }), true, permission);
    assert.equal(installed.check({ id: 1 }, permission, "file://", { requestingUrl: "file:///app/index.html", isMainFrame: true }), true, permission);
  }
  assert.equal(ask("media", undefined), true, "a request without details keeps the fallback");
  // A fallback can narrow the rest; it never widens the sandbox.
  guardSandboxPermissions(fakeSession, { fallbackRequest: () => false, fallbackCheck: () => "yes" });
  assert.equal(ask("media", { requestingUrl: "file:///app/index.html", isMainFrame: true }), false);
  assert.equal(installed.check(null, "media", "file://", {}), false, "only a true fallback grants");
  guardSandboxPermissions(fakeSession, { fallbackRequest: () => true, fallbackCheck: () => true });
  assert.equal(ask("media", { requestingUrl: "about:srcdoc", isMainFrame: false }), false);
});
