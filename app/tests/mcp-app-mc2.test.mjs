import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const nodeFs = require("node:fs");
const { SCHEME, sandboxProxyUrl, createMcpAppSandbox } = require("../electron/mcp-app-sandbox.cjs");

// R4i-mcp MC2 (R4g-mcp followUps G2 / G4): taking the widget resources offline. In 2.42304.0 the fonts of an MCP App
// widget come from https://assets.claude.ai/Fonts/*-Static.otf (cbc4150d0 host font faces, 8; the Visualize template in
// cde7c3a92 / main index.chunk-BaLvO2wi, 8) and the streaming helpers from the sandbox origin's
// /libs/imagine/streaming-helpers-1/streaming-helpers.mjs (remote sandbox.claudemcpcontent.com, not in the bundle). The
// installed package carries none of these files, so the host keeps the current behaviour (resource-src keeps
// https://assets.claude.ai as cd9b7fccf adds it, the scheme serves nothing but the proxy page) and pins that here.

const HASH = "0123456789abcdef0123456789abcdef";
const here = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(here, "../../reference/installed-2.42304.0-20261017");
const count = (text, needle) => text.split(needle).length - 1;
const exists = async (p) => fs.access(p).then(() => true, () => false);

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

test("MC2 source check: the widget fonts and streaming helpers are remote files, not part of the installed package", async () => {
  if (!(await exists(REF))) return; // reference tree not present on this machine
  const v1 = path.join(REF, "ion-dist/assets/v1");
  const names = await fs.readdir(v1);
  const read = (prefix) => fs.readFile(path.join(v1, names.find((name) => name.startsWith(prefix))), "utf8");
  const fonts = await read("cbc4150d0-");
  assert.equal(count(fonts, "https://assets.claude.ai/Fonts/"), 8, "host font faces (styles.css.fonts)");
  const template = await read("cde7c3a92-");
  assert.equal(count(template, "https://assets.claude.ai/Fonts/"), 8, "Visualize template serif faces");
  assert.equal(count(template, 'var HOSTED_HELPERS = "/libs/imagine/streaming-helpers-1/streaming-helpers.mjs";'), 1);
  assert.equal(count(template, '"[streaming] hosted helpers failed, loading them from esm.sh:"'), 1, "the template's own fallback");
  const renderer = await read("cd9b7fccf-");
  assert.equal(count(renderer, 'let d=[...s?.csp?.resourceDomains??[],"https://assets.claude.ai"];'), 1);
  const files = await walk(REF);
  const base = files.map((file) => path.basename(file));
  assert.equal(base.filter((name) => /-Static\.otf$/i.test(name)).length, 0, "no AnthropicSans/Serif-Text-*-Static.otf original");
  assert.equal(base.filter((name) => /\.otf$/i.test(name)).length, 0);
  assert.equal(base.filter((name) => /streaming-helpers/i.test(name)).length, 0, "no streaming-helpers.mjs original");
  assert.equal(files.filter((file) => /[\\/]libs[\\/]imagine[\\/]/.test(file)).length, 0, "no /libs/imagine tree");
});

test("MC2 status quo: resource-src keeps assets.claude.ai (generated from cd9b7fccf); the app window CSP never loads it", async () => {
  const renderer = await fs.readFile(path.join(here, "../src/generated/mcp-app-host/app-renderer.mjs"), "utf8");
  assert.equal(count(renderer, '"https://assets.claude.ai",'), 1);
  const html = await fs.readFile(path.join(here, "../index.html"), "utf8");
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)[1];
  assert.doesNotMatch(csp, /assets\.claude\.ai|https:/);
  assert.match(csp, /frame-src 'self' oc-file-preview: oc-mcp-sandbox:;/);
});

const MALICIOUS = [
  // Path traversal, raw and encoded.
  `/mcp_apps/../../etc/passwd`,
  `/mcp_apps/..%2f..%2fetc%2fpasswd`,
  `/%2e%2e/%2e%2e/etc/passwd`,
  `/%252e%252e/%252e%252e/etc/passwd`,
  `/mcp_apps%2f..%2f..%2felectron%2fmain.cjs`,
  `/..\\..\\electron\\main.cjs`,
  `/mcp_apps%00.html`,
  `/mcp_apps/`,
  `/MCP_APPS`,
  `//etc/passwd`,
  // Files next to the module, by name.
  `/mcp-app-sandbox-page.html`,
  `/electron/mcp-app-sandbox-page.html`,
  `/mcp-app-sandbox.cjs`,
  `/main.cjs`,
  `/package.json`,
  // The official remote resources (G2 / G4): not served, the widget falls back or uses the declared domains.
  `/libs/imagine/streaming-helpers-1/streaming-helpers.mjs`,
  `/libs/imagine/streaming-helpers-1/../../../electron/main.cjs`,
  `/libs/imagine/tabler-icons-webfont-3.42.0/tabler-icons.min.css`,
  `/libs/imagine/us-atlas-3.0.1/states-10m.json`,
  `/Fonts/AnthropicSans-Text-Regular-Static.otf`,
  `/Fonts/..%2f..%2fmcp-app-sandbox-page.html`,
];

test("MC2 malicious input: no path but the proxy page is served, traversal is refused, nothing leaks", async () => {
  const handler = createMcpAppSandbox();
  for (const suffix of MALICIOUS) {
    const response = await handler.handle({ url: `${SCHEME}://${HASH}${suffix}`, method: "GET" });
    assert.equal(response.status, 404, suffix);
    assert.equal(await response.text(), "Not found", suffix);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  const hosts = [
    `${SCHEME}://${HASH.toUpperCase()}/mcp_apps`,
    `${SCHEME}://${HASH}.evil.example/mcp_apps`,
    `${SCHEME}://${HASH}:8080/mcp_apps`,
    `${SCHEME}://user:pw@${HASH}/mcp_apps`,
    `${SCHEME}://../mcp_apps`,
    `${SCHEME}://%2e%2e/mcp_apps`,
    `${SCHEME}:/etc/passwd`,
    `${SCHEME}:${HASH}/mcp_apps`,
    `file:///etc/passwd`,
    `oc-file-preview://${HASH}/mcp_apps`,
  ];
  for (const url of hosts) {
    const response = await handler.handle({ url, method: "GET" });
    assert.equal(response.status, 404, url);
    assert.equal(await response.text(), "Not found", url);
  }
  for (const method of ["POST", "PUT", "DELETE", "HEAD"]) assert.equal((await handler.handle({ url: sandboxProxyUrl(HASH), method })).status, 405, method);
  // A query cannot smuggle a path or a file source either.
  for (const query of ["?resource-src=file:///etc/passwd", `?resource-src=${encodeURIComponent("https://assets.claude.ai/../../etc")}`, "?path=../../etc/passwd", "?resource-src=oc-mcp-sandbox://x"]) {
    assert.equal((await handler.handle({ url: `${sandboxProxyUrl(HASH)}${query}`, method: "GET" })).status, 400, query);
  }
});

test("MC2 whitelist: the scheme reads exactly one file, its own page template, whatever it is asked for", async () => {
  const pageFile = path.join(here, "../electron/mcp-app-sandbox-page.html");
  const reads = [];
  const original = nodeFs.readFileSync;
  const guarded = ["readFile", "createReadStream", "openSync", "statSync", "existsSync", "readdirSync"];
  const originals = Object.fromEntries(guarded.map((name) => [name, nodeFs[name]]));
  nodeFs.readFileSync = function (file, ...rest) { reads.push(String(file)); return original.call(this, file, ...rest); };
  for (const name of guarded) nodeFs[name] = function (file, ...rest) { reads.push(`${name}:${String(file)}`); return originals[name].call(this, file, ...rest); };
  try {
    const handler = createMcpAppSandbox();
    for (const suffix of MALICIOUS) await handler.handle({ url: `${SCHEME}://${HASH}${suffix}`, method: "GET" });
    assert.deepEqual(reads, [], "refused requests touch no file at all");
    const ok = await handler.handle({ url: sandboxProxyUrl(HASH), method: "GET" });
    assert.equal(ok.status, 200);
    await handler.handle({ url: sandboxProxyUrl(HASH), method: "GET" });
    assert.deepEqual(reads, [pageFile], "only the template, read once and cached");
  } finally {
    nodeFs.readFileSync = original;
    for (const name of guarded) nodeFs[name] = originals[name];
  }
});
