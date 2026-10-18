import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { SCHEME, LINK_MESSAGE, FRAME_CSP, createFilePreviewFrames, withLinkScript } = require("../electron/file-preview-frame.cjs");

// B13: the HTML preview frame (2.31226.0 cd2efac6e Ql -> Ge.Html in the cc61d0d63 sandbox frame) served from the
// private oc-file-preview scheme: the registered text, workspace-scoped sub-resources, the frame CSP and the link
// script that hands web links to the viewer.
const get = (frames, url, method = "GET") => frames.handle({ url, method });

test("register returns a tokenised URL at the file's path; the document is the shown text with the CSP and link script", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-frame-"));
  try {
    await fs.mkdir(path.join(root, "site", "css"), { recursive: true });
    await fs.writeFile(path.join(root, "site", "index.html"), "<!doctype html><p>on disk</p>");
    await fs.writeFile(path.join(root, "site", "css", "app.css"), "p{color:red}");
    await fs.writeFile(path.join(root, "site", "other page.html"), "<p>other</p>");
    await fs.writeFile(path.join(root, "secret.txt"), "top");
    await fs.writeFile(path.join(os.tmpdir(), "code-desktop-frame-outside.txt"), "outside");
    const frames = createFilePreviewFrames();
    const { url } = await frames.register({ root, relative: "site/index.html", text: "<!DOCTYPE html>\n<html><body><a href='https://example.com'>x</a></body></html>" });
    assert.match(url, new RegExp(`^${SCHEME}://[0-9a-f]{32}/site/index\\.html$`));
    const page = await get(frames, url);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(page.headers.get("content-security-policy"), FRAME_CSP);
    assert.match(FRAME_CSP, /connect-src 'none'/);
    assert.match(FRAME_CSP, /sandbox allow-scripts/);
    const body = await page.text();
    assert.ok(body.startsWith("<!DOCTYPE html><script>"), "the link script follows the doctype (no quirks mode)");
    assert.ok(body.includes(LINK_MESSAGE));
    assert.ok(body.endsWith("<a href='https://example.com'>x</a></body></html>"), "the registered text, not the disk copy");
    // Relative resources resolve against the file's folder and are read from the workspace.
    const css = await get(frames, url.replace("index.html", "css/app.css"));
    assert.equal(css.headers.get("content-type"), "text/css; charset=utf-8");
    assert.equal(await css.text(), "p{color:red}");
    const other = await get(frames, url.replace("index.html", "other%20page.html"));
    assert.match(await other.text(), /^<script>.*<p>other<\/p>$/s, "another page of the site gets the link script too");
    assert.equal((await get(frames, url.replace("site/index.html", "secret.txt"))).status, 200, "inside the workspace");
    // Nothing outside the workspace, nothing for an unknown token or a non-GET, and released tokens are gone.
    assert.equal((await get(frames, url.replace("site/index.html", "../code-desktop-frame-outside.txt"))).status, 404);
    assert.equal((await get(frames, url.replace("site/index.html", "%2E%2E/%2E%2E/etc/hosts"))).status, 404);
    assert.equal((await get(frames, `${SCHEME}://${"0".repeat(32)}/site/index.html`)).status, 404);
    assert.equal((await get(frames, url, "POST")).status, 404);
    assert.equal((await get(frames, url.replace("index.html", "missing.css"))).status, 404);
    frames.release(url);
    assert.equal((await get(frames, url)).status, 404);
    assert.equal(frames.size(), 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(path.join(os.tmpdir(), "code-desktop-frame-outside.txt"), { force: true });
  }
});

test("register refuses a non-HTML file, a file outside the workspace and oversized text; old frames are evicted", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-frame-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "code-desktop-frame-out-"));
  try {
    await fs.writeFile(path.join(root, "a.html"), "a");
    await fs.writeFile(path.join(root, "a.txt"), "a");
    await fs.writeFile(path.join(outside, "b.html"), "b");
    await fs.symlink(path.join(outside, "b.html"), path.join(root, "link.html"));
    const frames = createFilePreviewFrames();
    await assert.rejects(frames.register({ root, relative: "a.txt", text: "a" }), /Only HTML files/);
    await assert.rejects(frames.register({ root, relative: path.join(outside, "b.html"), text: "b" }), /outside the selected workspace/);
    await assert.rejects(frames.register({ root, relative: "link.html", text: "b" }), /outside the selected workspace/);
    await assert.rejects(frames.register({ root, relative: "a.html", text: "x".repeat(4 * 1024 * 1024 + 1) }), /too large/);
    await assert.rejects(frames.register({ root, relative: "a.html" }), /too large/);
    const urls = [];
    for (let index = 0; index < 33; index++) urls.push((await frames.register({ root, relative: "a.html", text: String(index) })).url);
    assert.equal(frames.size(), 32);
    assert.equal((await get(frames, urls[0])).status, 404, "the oldest frame is dropped");
    assert.match(await (await get(frames, urls[32])).text(), /32$/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test("withLinkScript keeps a BOM/whitespace doctype first and prepends otherwise", () => {
  assert.match(withLinkScript("﻿  <!doctype html><p>x"), /^﻿  <!doctype html><script>/);
  assert.match(withLinkScript("<p>x</p>"), /^<script>.*<\/script><p>x<\/p>$/s);
});

test("main wires the scheme before ready, the handler, both IPC actions (popouts too) and the CSP frame-src", async () => {
  const main = await fs.readFile(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert.match(main, /protocol\.registerSchemesAsPrivileged\(\[\{ scheme: FILE_PREVIEW_SCHEME, privileges: \{ standard: true, secure: true/);
  assert.ok(main.indexOf("registerSchemesAsPrivileged") < main.indexOf("app.whenReady()"));
  assert.match(main, /protocol\.handle\(FILE_PREVIEW_SCHEME, filePreviewFrames\.handle\)/);
  assert.match(main, /case "file:preview-frame":\s+return filePreviewFrames\.register\(\{ root: p\.cwd \|\| config\.cwd, relative: p\.relative, text: p\.text \}\);/);
  assert.match(main, /"file:preview-frame", "file:preview-frame-release"/);
  const html = await fs.readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /frame-src 'self' oc-file-preview: oc-mcp-sandbox:;/);
  assert.match(html, /script-src 'self';/, "the app's own script policy is unchanged");
});
