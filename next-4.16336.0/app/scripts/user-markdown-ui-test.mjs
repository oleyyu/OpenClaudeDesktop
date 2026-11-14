import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import zlib from "node:zlib";

// Ordinary user bubble text runs (2.2553.1 u1 -> d1 -> Nb/qQ): inline code
// chips with workspace file references, Markdown/bare links with host
// disclosure, the leading /command pill, the 1200-character collapse with its
// ghost Show more toggle, and image attachment tiles. Runs only after a fresh
// build with no other GUI suite active; every row comes from the isolated
// protocol fixture, never from injected DOM.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `user-markdown-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(path.join(workspace, "src"), { recursive: true });
const APP_JS = Array.from({ length: 30 }, (_, i) => `export const line${i + 1} = ${i + 1};`).join("\n") + "\n";
await fs.writeFile(path.join(workspace, "src/app.js"), APP_JS);
// A real 160x90 PNG (solid color) so the tile exercises a genuine load.
function png(width, height, [r, g, b]) {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  const crc = (bytes) => { let c = -1; for (const byte of bytes) c = table[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const head = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0); head.copy(out, 4); out.writeUInt32BE(crc(head), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((1 + width * 3) * height);
  for (let y = 0; y < height; y++) { const row = y * (1 + width * 3); for (let x = 0; x < width; x++) { raw[row + 1 + x * 3] = r; raw[row + 2 + x * 3] = g; raw[row + 3 + x * 3] = b; } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const IMAGE_PATH = path.join(workspace, "shot.png");
await fs.writeFile(IMAGE_PATH, png(160, 90, [200, 80, 40]));
const A = "user-markdown-A";
const now = Math.floor(Date.now() / 1000);
const CODE = "run `npm test` now and open `src/app.js:12` but not `src/missing.js` today";
// oh/eh refuse only automount roots (/net, /.vol, /.file), UNC forms and oversize paths.
const BLOCKED = "never open `/net/boot.js` here";
const LINKS = "Read [docs](https://example.com/x) then [https://example.com/x](https://example.com/x) and https://example.com/y.";
const SLASH = "/review src";
const NOT_SLASH = "a /review";
const DOUBLE_SLASH = "//x";
const LONG_BODY = "Collapse fixture sentence number ";
// Both fixtures end on a non-space character: the source sums trimmed runs.
const tail = text => text.replace(/ $/, "x");
const LONG = (() => { let text = "See https://example.com/long first. "; let n = 1; while (text.length < 1201) text += `${LONG_BODY}${n++}. `; return tail(text.slice(0, 1201)); })();
const EXACT = tail(LONG.slice(0, 1200));
const WRAP_CHIPS = "Please compare `src/app.js:12` with the retry policy in `config/retry.yaml` and the queue depth alarms described at https://example.com/alarms before you summarize the rollback checklist for the ingestion service migration that lands before consumers redeploy.";
const LITERAL = "**literal text** with `chip` and no heading";
// R08: an assistant answer naming another repo's PR (the workspace has no origin, so no '#N' shortening).
const FORGE_PR = "https://github.com/acme/widgets/pull/42";
const FORGE_ANSWER = `Tracked in ${FORGE_PR} and [the widget fix](${FORGE_PR}).`;
// F06: user fences in two of the 235 bundled grammars (code-language-current.js:62-81).
const FENCES = "Two fences:\n\n```tsx\nexport const App = () => <div className=\"x\">{count}</div>;\n```\n\n```go\npackage main\n\nfunc main() {\n\tfmt.Println(\"hi\", 42)\n}\n```";
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const turn = (id, userId, text, answerId) => ({ id, status: "completed", items: [userItem(userId, text), textItem(answerId, "Completed answer.")] });
await fs.writeFile(path.join(profile, "user-markdown-fixture.marker"), "isolated-user-markdown-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [A], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: { id: A, name: "User markdown A", cwd: workspace, createdAt: now, updatedAt: now, archived: false, turns: [
    turn("um-code-turn", "um-code-user", CODE, "um-code-answer"),
    turn("um-blocked-turn", "um-blocked-user", BLOCKED, "um-blocked-answer"),
    { id: "um-link-turn", status: "completed", items: [userItem("um-link-user", LINKS), textItem("um-link-answer", FORGE_ANSWER)] },
    turn("um-slash-turn", "um-slash-user", SLASH, "um-slash-answer"),
    turn("um-noslash-turn", "um-noslash-user", NOT_SLASH, "um-noslash-answer"),
    turn("um-double-turn", "um-double-user", DOUBLE_SLASH, "um-double-answer"),
    turn("um-literal-turn", "um-literal-user", LITERAL, "um-literal-answer"),
    turn("um-wrap-turn", "um-wrap-user", WRAP_CHIPS, "um-wrap-answer"),
    turn("um-long-turn", "um-long-user", LONG, "um-long-answer"),
    turn("um-exact-turn", "um-exact-user", EXACT, "um-exact-answer"),
    turn("um-fence-turn", "um-fence-user", FENCES, "um-fence-answer"),
    { id: "um-image-turn", status: "completed", items: [
      { id: "um-image-user", type: "userMessage", content: [{ type: "text", text: "See the screenshot." }, { type: "localImage", path: IMAGE_PATH }] },
      textItem("um-image-answer", "Image answer.") ] },
  ] },
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false, externalStubbed = false;
const testSources = ["scripts/user-markdown-ui-test.mjs", "tests/fixtures/codex-server.cjs"];
let testSourceHashes;
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/user-inline-model.mjs", "src/user-collapse-model.mjs", "src/source-user-text.jsx", "src/source-user-text.css",
    "src/source-session.jsx", "src/source-session.css", "src/main.jsx", "electron/files.cjs", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const article = id => page.locator(`article.source-user-message[data-transcript-item-id="${id}"]`);
const bubble = id => article(id).locator(":scope > .source-user-group > .source-user-bubble");
async function frames(count = 4) {
  await page.evaluate(count => new Promise(resolve => { const step = () => --count ? requestAnimationFrame(step) : resolve(); requestAnimationFrame(step); }), count);
}
async function open(id, lastItem) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(`[data-transcript-item-id="${lastItem}"]`).waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await page.evaluate(() => document.fonts.ready);
  await frames(6);
}
// Resolve a CDS token inside the same subtree the element lives in, so theme
// and density scoping are identical to the element under test.
async function tokenColor(id, property, token) {
  return bubble(id).evaluate((node, { property, token }) => {
    const probe = document.createElement("span");
    probe.style[property] = `var(${token})`;
    node.appendChild(probe);
    const value = getComputedStyle(probe)[property];
    probe.remove();
    return value;
  }, { property, token });
}
// Inline rects of every text node and inline element (chips, links, pills)
// inside the paragraph column, mirroring what the shrink-wrap walker measures.
async function inlineProbe(id) {
  return bubble(id).evaluate(node => {
    const measure = () => {
      const range = document.createRange(), rects = [];
      let left = Infinity, right = -Infinity;
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: n => n.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_ACCEPT
          : getComputedStyle(n).display.startsWith("inline") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP });
      for (let current = walker.nextNode(); current; current = walker.nextNode()) {
        if (current.nodeType === Node.TEXT_NODE) {
          if (current.parentElement.closest("button.suc-show-more")) continue;
          range.selectNodeContents(current);
          for (const rect of range.getClientRects()) if (rect.width > 0) { rects.push(Math.round(rect.width * 100) / 100); left = Math.min(left, rect.left); right = Math.max(right, rect.right); }
        } else {
          for (const rect of current.getClientRects()) if (rect.width > 0) { left = Math.min(left, rect.left); right = Math.max(right, rect.right); }
        }
      }
      const box = node.getBoundingClientRect();
      return { rects, span: right - left, height: box.height, width: box.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
    };
    const applied = node.style.maxWidth;
    const withApplied = measure();
    node.style.maxWidth = "";
    const natural = measure();
    node.style.maxWidth = applied;
    return { applied, withApplied, natural, groupWidth: node.parentElement.clientWidth, computedMaxWidth: getComputedStyle(node).maxWidth };
  });
}
function assertNoRewrap(probe, label) {
  assert.equal(probe.withApplied.rects.length, probe.natural.rects.length, `${label}: line rect count`);
  for (let i = 0; i < probe.natural.rects.length; i++) near(probe.withApplied.rects[i], probe.natural.rects[i], `${label}: line ${i} width`, .5);
  near(probe.withApplied.height, probe.natural.height, `${label}: height`, .5);
  assert.ok(probe.withApplied.scrollWidth <= probe.withApplied.clientWidth + .5, `${label}: no horizontal overflow`);
}
const readClipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());
async function waitStatus(id, text) {
  await page.waitForFunction(({ id, text }) => document.querySelector(`.sua-row[data-user-actions-id="${id}"] .sua-status`)?.textContent === text, { id, text });
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  // Main-process stub: external links must reach shell.openExternal exactly
  // once with the href and never navigate or spawn a window.
  await app.evaluate(({ shell }) => {
    globalThis.umOpenExternal = shell.openExternal;
    globalThis.umOpened = [];
    shell.openExternal = async url => { globalThis.umOpened.push(url); };
  });
  externalStubbed = true;
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async item => new ClipboardItem(Object.fromEntries(
        await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
      globalThis.umClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.umClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return "text";
  });
  clipboardSaved = true;
  await page.locator(`[data-source-session-id="${A}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await open(A, "um-image-answer");
  metrics.devicePixelRatio = await page.evaluate(() => devicePixelRatio);

  // 1. Inline code chips: source classes/tokens, no general Markdown.
  await bubble("um-code-user").locator("span.suc-inline-link").first().waitFor();
  const chips = await bubble("um-code-user").evaluate(node => {
    const chip = node.querySelector(".suc-text > code.suc-inline-code");
    const style = getComputedStyle(chip);
    return { count: node.querySelectorAll(".suc-text > .suc-inline-code").length, text: chip.textContent,
      fontSize: style.fontSize, lineHeight: style.lineHeight, color: style.color, background: style.backgroundColor,
      borderWidth: style.borderTopWidth, borderStyle: style.borderTopStyle, radius: style.borderRadius, padding: style.padding,
      fontFamily: style.fontFamily, wrap: style.overflowWrap, tags: [...node.querySelectorAll("strong,h1,h2,ul,ol,em")].length,
      order: [...node.querySelectorAll(".suc-text > *")].map(el => `${el.tagName.toLowerCase()}:${el.className}:${el.textContent}`),
      paragraphs: node.querySelectorAll(".suc-text").length, paragraphText: node.querySelector(".suc-text").textContent };
  });
  // BQ draws only the span body: the paragraph text is the message without its backtick delimiters.
  assert.equal(chips.paragraphs, 1); assert.equal(chips.paragraphText, CODE.replaceAll("`", ""), "paragraph textContent is the message minus chip delimiters");
  assert.equal(chips.count, 3); assert.equal(chips.text, "npm test");
  assert.equal(chips.fontSize, "12px"); assert.equal(chips.lineHeight, "12px", "leading-none: line-height 1 == 12px");
  assert.equal(chips.color, await tokenColor("um-code-user", "color", "--cds-text-danger"));
  assert.equal(chips.background, await tokenColor("um-code-user", "backgroundColor", "--cds-alpha-1"));
  assert.equal(chips.borderWidth, "0.5px"); assert.equal(chips.borderStyle, "solid");
  assert.equal(chips.radius, "4.8px"); assert.equal(chips.padding, "0.75px 3px");
  assert.ok(/mono/i.test(chips.fontFamily), `mono font: ${chips.fontFamily}`); assert.equal(chips.wrap, "anywhere");
  assert.equal(chips.tags, 0, "no strong/h1/h2/ul/ol/em inside the bubble");
  // gy/Kn decide link-vs-fallback syntactically (oh), never by existence: the missing path is a link too.
  assert.deepEqual(chips.order, ["code:suc-inline-code:npm test", "span:suc-inline-code suc-inline-link:src/app.js:12", "span:suc-inline-code suc-inline-link:src/missing.js"]);
  const blocked = await bubble("um-blocked-user").evaluate(node => [...node.querySelectorAll(".suc-text > *")].map(el => `${el.tagName.toLowerCase()}:${el.className}:${el.textContent}`));
  assert.deepEqual(blocked, ["code:suc-inline-code:/net/boot.js"], "an automount-root path is refused by the syntactic gate and stays a plain chip");
  const literal = await bubble("um-literal-user").evaluate(node => ({ text: node.querySelector(".suc-text").textContent, strong: node.querySelectorAll("strong,h1,h2").length, chips: node.querySelectorAll("code.suc-inline-code").length }));
  assert.equal(literal.text, LITERAL.replaceAll("`", "")); assert.equal(literal.strong, 0); assert.equal(literal.chips, 1);
  metrics.chips = chips;
  checks.push("Inline backtick spans render as 12px/leading-none text-danger alpha-1 0.5px 0.4em chips; **literal** stays literal with no Markdown elements");

  // 2. File-reference chips open the pane at the line; a missing file is still a link and the pane reports the real failure.
  const link = bubble("um-code-user").locator("span.suc-inline-link", { hasText: "src/app.js:12" });
  const missing = bubble("um-code-user").locator("span.suc-inline-link", { hasText: "src/missing.js" });
  assert.equal(await link.getAttribute("data-file-ref"), "src/app.js"); assert.equal(await link.getAttribute("data-file-line"), "12");
  assert.equal(await missing.getAttribute("data-file-ref"), "src/missing.js"); assert.equal(await missing.getAttribute("data-file-line"), null);
  const linkStyle = await link.evaluate(node => { const s = getComputedStyle(node); return { role: node.getAttribute("role"), tabIndex: node.tabIndex, display: s.display, decoration: s.textDecorationLine, offset: s.textUnderlineOffset, cursor: s.cursor, color: s.color, font: s.fontSize, outline: s.outlineStyle }; });
  assert.equal(linkStyle.role, "button"); assert.equal(linkStyle.tabIndex, 0); assert.equal(linkStyle.display, "inline-block", "Bn: inline-block span");
  assert.equal(linkStyle.decoration, "underline"); assert.equal(linkStyle.offset, "3px"); assert.equal(linkStyle.font, "12px"); assert.equal(linkStyle.outline, "none");
  assert.equal(await page.locator(".source-file-preview").count(), 0, "no pane open before the click");
  await link.click();
  await page.locator(".source-file-preview[data-active-line='12']").waitFor();
  // F11 (cd2efac6e jo): the breadcrumb subheader names the file, the jump range is the data-active rows of the
  // viewer (da, replacing the CSS Highlight line mark), and an unavailable file opens a tab with its EmptyState card.
  const readPane = () => page.evaluate(() => {
    const pre = document.querySelector(".source-file-preview");
    const card = document.querySelector(".source-side-tile .source-file-view .source-empty-state");
    return { location: document.querySelector(".source-side-tile .sfv-breadcrumb")?.textContent ?? null, activeLine: pre?.dataset.activeLine ?? null,
      highlighted: [...document.querySelectorAll(".source-file-preview .sfv-line[data-active] code")].map(code => code.textContent.replace(/\n$/, "")),
      activeRows: [...document.querySelectorAll(".source-file-preview .sfv-line[data-active]")].map(row => row.dataset.line),
      tab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? null,
      preText: pre?.textContent ?? null, card: card ? { role: card.getAttribute("role"), title: card.querySelector("p")?.textContent ?? null } : null,
      alert: document.querySelector(".source-side-tile .source-panel-error[role='alert']")?.textContent ?? null };
  });
  const pane = await readPane();
  assert.equal(pane.location, "src/app.js"); assert.equal(pane.activeLine, "12");
  assert.deepEqual(pane.highlighted, ["export const line12 = 12;"], "line 12 is the selected line");
  assert.deepEqual(pane.activeRows, ["12"], "only row 12 carries data-active");
  assert.equal(pane.preText, APP_JS); assert.equal(pane.alert, null); assert.equal(pane.card, null);
  metrics.pane = pane;
  await missing.click();
  await page.locator(".source-side-tile .source-file-view .source-empty-state").filter({ hasText: "Couldn’t find this file" }).waitFor();
  const afterMissing = await readPane();
  assert.deepEqual(afterMissing.card, { role: "alert", title: "Couldn’t find this file" }, "the missing file opens a tab with the EmptyState card");
  assert.equal(afterMissing.alert, null, "no raw IPC error text");
  assert.equal(afterMissing.location, "src/missing.js", "the breadcrumb stays above the card");
  assert.match(afterMissing.tab ?? "", /^missing\.js/, "the preview tab now shows missing.js (it took the preview slot)");
  assert.equal(afterMissing.activeLine, null, "a lineless request clears the line mark");
  metrics.afterMissing = afterMissing;
  // Keyboard activation (Bn onKeyDown Enter/Space) re-issues the request; the app.js preview replaces the card.
  await link.focus();
  await page.keyboard.press("Enter");
  await page.locator(".source-file-preview[data-active-line='12']").waitFor();
  await page.locator(".source-side-tile .source-file-view .source-empty-state").waitFor({ state: "detached" });
  checks.push("`src/app.js:12` and `src/missing.js` are both role=button inline-block link chips (syntactic gate, no stat); the first opens the Files pane with row 12 marked data-active, the second opens a missing.js tab whose card says \"Couldn’t find this file\" (no raw error); `/net/boot.js` stays a plain chip; Enter re-activates");

  // 2b. A handled request is consumed: closing and reopening the pane must not replay it.
  await page.locator(".source-side-tile").getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).click();
  await page.getByRole("complementary", { name: "Files panel" }).waitFor();
  await frames(8);
  // 0.2.14 tile store (2.2553.1 fileTabsBySession): the preview tab itself
  // survives closing/reopening the pane, but the consumed chip request is not
  // replayed: no line mark, no error.
  await page.locator(".source-file-preview").waitFor();
  const reopened = await readPane();
  assert.deepEqual({ location: reopened.location, activeLine: reopened.activeLine, preText: reopened.preText, alert: reopened.alert }, { location: "src/app.js", activeLine: null, preText: APP_JS, alert: null },
    "reopened pane restores the persisted preview tab without replaying the chip request");
  assert.equal(await page.locator(".source-file-preview[data-active-line]").count(), 0);
  metrics.reopened = reopened;
  checks.push("Closing the pane and reopening Files restores the persisted preview tab but does not replay the earlier chip request (no line mark, no error)");

  // 3. Links: anchors, host disclosure, external open exactly once, no navigation.
  const links = await bubble("um-link-user").evaluate(node => [...node.querySelectorAll(".suc-text > a.suc-link")].map(a => ({
    dir: a.getAttribute("dir"), target: a.getAttribute("target"), rel: a.getAttribute("rel"), href: a.getAttribute("href"),
    text: a.textContent, label: a.querySelector("bdi")?.textContent ?? null, host: a.querySelector(".suc-link-host")?.textContent ?? null,
    hostOpacity: a.querySelector(".suc-link-host") ? getComputedStyle(a.querySelector(".suc-link-host")).opacity : null,
    color: getComputedStyle(a).color, decoration: getComputedStyle(a).textDecorationLine, offset: getComputedStyle(a).textUnderlineOffset,
    next: a.nextSibling?.textContent ?? null })));
  assert.equal(links.length, 3);
  assert.ok(links.every(l => l.dir === "ltr" && l.target === "_blank" && l.rel === "noreferrer"));
  assert.equal(links[0].label, "docs"); assert.equal(links[0].host, " (→ example.com)"); assert.equal(links[0].hostOpacity, "0.7"); assert.equal(links[0].href, "https://example.com/x");
  assert.equal(links[1].label, "https://example.com/x"); assert.equal(links[1].host, null);
  assert.equal(links[2].text, "https://example.com/y"); assert.equal(links[2].label, null); assert.equal(links[2].next, ".");
  assert.equal(links[0].color, await tokenColor("um-link-user", "color", "--cds-text-accent"));
  assert.equal(links[0].decoration, "underline"); assert.equal(links[0].offset, "3px");
  // Ob/W draw the label plus the disclosure, never the Markdown syntax.
  assert.equal(await bubble("um-link-user").locator(".suc-text").textContent(), "Read docs (→ example.com) then https://example.com/x and https://example.com/y.");
  const urlBefore = page.url();
  await bubble("um-link-user").locator("a.suc-link").first().click();
  await page.waitForTimeout(300);
  const opened = await app.evaluate(({ BrowserWindow }) => ({ urls: globalThis.umOpened, windows: BrowserWindow.getAllWindows().length }));
  assert.deepEqual(opened.urls, ["https://example.com/x"]); assert.equal(opened.windows, 1);
  assert.equal(page.url(), urlBefore, "renderer never navigates");
  metrics.links = links; metrics.opened = opened;
  checks.push("Markdown and bare links render as dir=ltr target=_blank noreferrer anchors with (→ host) at opacity .7 only on label/host mismatch; click opens externally exactly once");

  // 4. Leading slash pill: cd wrapper + eN (pl-2 name box, absolute aria-hidden 8x20 medium 50% glyph, bare name).
  const slash = await bubble("um-slash-user").evaluate(node => { const pill = node.querySelector(".suc-text > .suc-slash"); const s = getComputedStyle(pill);
    const box = pill.firstElementChild, glyph = box.firstElementChild, name = glyph.nextElementSibling, bs = getComputedStyle(box), gs = getComputedStyle(glyph);
    const probe = document.createElement("span"); probe.style.fontSize = "var(--cds-font-size-body)"; probe.style.fontWeight = "var(--cds-font-weight-medium)"; node.appendChild(probe);
    const expected = { fontSize: getComputedStyle(probe).fontSize, fontWeight: getComputedStyle(probe).fontWeight }; probe.remove();
    return { text: pill.textContent, next: pill.nextSibling?.textContent, color: s.color, display: s.display, radius: s.borderRadius, position: s.position, paragraph: node.querySelector(".suc-text").textContent,
      children: pill.children.length, boxPosition: bs.position, boxPaddingLeft: bs.paddingLeft, boxChildren: box.children.length,
      glyph: { text: glyph.textContent, hidden: glyph.getAttribute("aria-hidden"), position: gs.position, top: gs.top, left: gs.left, translate: gs.translate, display: gs.display,
        width: glyph.getBoundingClientRect().width, height: glyph.getBoundingClientRect().height, opacity: gs.opacity, fontWeight: gs.fontWeight, fontSize: gs.fontSize,
        centered: Math.abs((glyph.getBoundingClientRect().top + glyph.getBoundingClientRect().height / 2) - (box.getBoundingClientRect().top + box.getBoundingClientRect().height / 2)) },
      name: { text: name.textContent, tag: name.tagName.toLowerCase(), hidden: name.getAttribute("aria-hidden"), left: name.getBoundingClientRect().left - box.getBoundingClientRect().left }, expected }; });
  assert.equal(slash.text, "/review"); assert.equal(slash.next, " src"); assert.equal(slash.paragraph, SLASH);
  assert.equal(slash.color, await tokenColor("um-slash-user", "color", "--cds-text-accent"));
  assert.equal(slash.display, "inline-flex"); assert.equal(slash.radius, "6px"); assert.equal(slash.position, "relative");
  assert.equal(slash.children, 1); assert.equal(slash.boxPosition, "relative"); assert.equal(slash.boxPaddingLeft, "8px", "pl-2"); assert.equal(slash.boxChildren, 2);
  assert.equal(slash.glyph.text, "/"); assert.equal(slash.glyph.hidden, "true"); assert.equal(slash.glyph.position, "absolute"); assert.equal(slash.glyph.left, "0px"); assert.equal(slash.glyph.display, "flex");
  near(slash.glyph.width, 8, "w-2"); near(slash.glyph.height, 20, "h-5"); assert.equal(slash.glyph.opacity, "0.5"); assert.ok(slash.glyph.centered <= .5, `glyph vertically centered: ${slash.glyph.centered}`);
  assert.equal(slash.glyph.fontWeight, slash.expected.fontWeight); assert.equal(slash.glyph.fontSize, slash.expected.fontSize); assert.equal(slash.expected.fontWeight, "500", "font-base-bold = medium");
  assert.equal(slash.name.text, "review", "accessible text is the bare name"); assert.equal(slash.name.tag, "span"); assert.equal(slash.name.hidden, null); near(slash.name.left, 8, "name starts after the 8px glyph column");
  assert.equal(await bubble("um-noslash-user").locator(".suc-slash").count(), 0);
  assert.equal(await bubble("um-double-user").locator(".suc-slash").count(), 0);
  metrics.slash = slash;
  checks.push("A message beginning /review renders the accent inline-flex pill as a pl-2 name box with an absolute aria-hidden 8x20 medium-weight 50%-opacity slash glyph beside the bare name; `a /review` and `//x` get no pill");

  // 5. Collapse at 1201 characters; 1200 stays open.
  const collapsed = await bubble("um-long-user").evaluate(node => {
    const column = node.querySelector(".suc-segments"), button = node.querySelector("button.suc-show-more"), label = button?.querySelector(".suc-show-more-label");
    const s = getComputedStyle(column), b = button ? getComputedStyle(button) : null;
    return { collapsedClass: column.classList.contains("suc-collapsed"), inert: column.hasAttribute("inert"), maxHeight: s.maxHeight, clientHeight: column.clientHeight,
      overflow: s.overflow, mask: s.maskImage || s.webkitMaskImage, anchors: column.querySelectorAll("a").length, spans: column.querySelectorAll("span.suc-link").length,
      button: button ? { expanded: button.getAttribute("aria-expanded"), text: button.textContent, omitted: button.hasAttribute("data-find-omitted"),
        isNext: column.nextElementSibling === button, parentIsBubble: button.parentElement === node, alignSelf: b.alignSelf, height: button.getBoundingClientRect().height,
        fontSize: b.fontSize, lineHeight: b.lineHeight, radius: b.borderRadius, background: b.backgroundColor, labelLeft: label.getBoundingClientRect().left - column.getBoundingClientRect().left,
        marginStart: b.marginInlineStart, paddingLeft: b.paddingLeft } : null,
      srOnly: node.querySelectorAll(".sr-only").length, bubbleGap: getComputedStyle(node).rowGap, text: column.textContent };
  });
  assert.equal(collapsed.collapsedClass, true); assert.equal(collapsed.maxHeight, "256px"); assert.ok(collapsed.clientHeight <= 256, `clientHeight ${collapsed.clientHeight}`);
  assert.equal(collapsed.overflow, "clip"); assert.match(collapsed.mask, /linear-gradient/);
  assert.equal(collapsed.anchors, 0, "collapsed links are non-interactive spans"); assert.ok(collapsed.spans >= 1);
  assert.equal(collapsed.text, LONG);
  assert.ok(collapsed.button, "Show more toggle present");
  assert.equal(collapsed.button.expanded, "false"); assert.equal(collapsed.button.text, "Show more"); assert.equal(collapsed.button.omitted, true);
  assert.ok(collapsed.button.isNext && collapsed.button.parentIsBubble, "toggle follows the column inside the bubble");
  assert.equal(collapsed.button.alignSelf, "flex-start"); near(collapsed.button.height, 20, "xxs control height");
  assert.equal(collapsed.button.fontSize, "12px"); assert.equal(collapsed.button.lineHeight, "17px"); assert.equal(collapsed.button.radius, "5px");
  assert.equal(collapsed.button.background, "rgba(0, 0, 0, 0)");
  near(collapsed.button.labelLeft, 0, "flush: label aligns with the column start"); assert.equal(collapsed.button.marginStart, "-6px"); assert.equal(collapsed.button.paddingLeft, "6px");
  assert.equal(collapsed.bubbleGap, "5px", "bubble is a gap-1.25 column");
  // Ordinary (non-Markdown) branch: the source keeps the body selectable and
  // adds no sr-only copy / inert; scroll-messages-current.js:39386-39392 only
  // does that for the channel-Markdown (Ne) branch.
  assert.equal(collapsed.inert, false); assert.equal(collapsed.srOnly, 0);
  const exact = await bubble("um-exact-user").evaluate(node => ({ collapsed: node.querySelectorAll(".suc-collapsed").length, button: node.querySelectorAll(".suc-show-more").length, anchors: node.querySelectorAll("a.suc-link").length, length: node.querySelector(".suc-text").textContent.length }));
  assert.deepEqual(exact, { collapsed: 0, button: 0, anchors: 1, length: 1200 });
  metrics.collapsed = collapsed; metrics.exact = exact;
  checks.push("1201 characters collapse to a 256px clipped, masked column with non-interactive links and a ghost xxs flush Show more; 1200 characters do not");

  // 6. Show more: mousedown keeps composer focus; click expands and restores anchors; collapsed bubble keeps the 85% ceiling.
  await page.locator(".sc-input.epitaxy-prompt-input").focus(); // the main composer; the side chat field is also .sc-input
  const toggle = bubble("um-long-user").locator("button.suc-show-more");
  await toggle.scrollIntoViewIfNeeded();
  const box = await toggle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("sc-input")), true, "mousedown does not steal composer focus");
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="um-long-user"] button.suc-show-more')?.getAttribute("aria-expanded") === "true");
  const expanded = await bubble("um-long-user").evaluate(node => ({ collapsed: node.querySelectorAll(".suc-collapsed").length, text: node.querySelector("button.suc-show-more").textContent,
    anchors: node.querySelectorAll("a.suc-link").length, maxHeight: getComputedStyle(node.querySelector(".suc-segments")).maxHeight, height: node.querySelector(".suc-segments").getBoundingClientRect().height }));
  assert.equal(expanded.collapsed, 0); assert.equal(expanded.text, "Show less"); assert.equal(expanded.anchors, 1); assert.equal(expanded.maxHeight, "none");
  assert.ok(expanded.height > 256, `expanded body grows past 256px: ${expanded.height}`);
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="um-long-user"] .suc-collapsed'));
  const longProbe = await inlineProbe("um-long-user");
  assert.equal(longProbe.computedMaxWidth === "85%" || /px$/.test(longProbe.applied), true);
  assert.ok(longProbe.withApplied.width <= longProbe.groupWidth * .85 + .5, "collapsed bubble never exceeds the 85% ceiling");
  near(longProbe.withApplied.height, longProbe.natural.height, "shrink-wrap does not increase a collapsed bubble's height", .5);
  metrics.expanded = expanded; metrics.longProbe = { applied: longProbe.applied, width: longProbe.withApplied.width, natural: longProbe.natural.width, groupWidth: longProbe.groupWidth };
  checks.push("Show more mousedown leaves the composer focused; click expands (Show less, anchors restored, mask gone) and collapses again; collapsed bubble stays within 85% with no height growth");

  // 7. Copy keeps backticks, brackets and URLs intact.
  await bubble("um-code-user").hover();
  await article("um-code-user").locator(".sua-row").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus("um-code-user", "Copied");
  assert.equal(await readClipboard(), CODE);
  await page.mouse.move(100, 700);
  await bubble("um-link-user").hover();
  await article("um-link-user").locator(".sua-row").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus("um-link-user", "Copied");
  assert.equal(await readClipboard(), LINKS);
  await page.mouse.move(100, 700);
  checks.push("Copy from the actions row yields the canonical text with backticks, brackets and URLs intact");

  // The shrink-wrap probes below measure the ordinary transcript layout, so the
  // Files pane opened in step 2b is closed again first: with the pane open the
  // chat tile is 403px and the "single line" chip fixture wraps onto three
  // lines, which makes the single-line assertion measure a wrapped bubble.
  // Assertions and tolerances are unchanged; only the precondition is restored.
  await page.locator(".source-side-tile").getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
  await frames(10);

  // 8. Shrink-wrap with inline chips: single line = inline span + 24px; wrapped chips keep their rects.
  const codeProbe = await inlineProbe("um-code-user");
  assert.equal(codeProbe.natural.rects.length, codeProbe.withApplied.rects.length);
  metrics.codeProbe = { applied: codeProbe.applied, computedMaxWidth: codeProbe.computedMaxWidth, groupWidth: codeProbe.groupWidth, withApplied: codeProbe.withApplied, natural: codeProbe.natural,
    chat: await page.evaluate(() => ({ tile: document.querySelector('[data-tile-id="chat"]')?.getBoundingClientRect().width, shell: document.querySelector('[data-tile-id="chat"] .tiles-shell')?.getBoundingClientRect().width, files: document.querySelector('[data-tile-id="files"]')?.getBoundingClientRect().width ?? null, inner: innerWidth })) };
  near(codeProbe.withApplied.width, Math.ceil(codeProbe.withApplied.span + 24 - .001), `single-line chip bubble = inline span + 24px padding (${JSON.stringify(metrics.codeProbe)})`, 1);
  await page.waitForFunction(() => /px$/.test(document.querySelector('[data-transcript-item-id="um-wrap-user"] .source-user-bubble')?.style.maxWidth ?? ""), null, { timeout: 4000 });
  const wrapProbe = await inlineProbe("um-wrap-user");
  assert.ok(wrapProbe.natural.rects.length >= 3, "chip fixture wraps");
  assert.ok(wrapProbe.withApplied.width < wrapProbe.natural.width - .5, `measured ${wrapProbe.withApplied.width} tightens ${wrapProbe.natural.width}`);
  assertNoRewrap(wrapProbe, "wrapped chips");
  metrics.shrinkWrap = { single: { width: codeProbe.withApplied.width, span: codeProbe.withApplied.span }, wrapped: { applied: wrapProbe.applied, natural: wrapProbe.natural.width, measured: wrapProbe.withApplied.width, lines: wrapProbe.natural.rects.length } };
  checks.push("Shrink-wrap measures chips and links like text: single line equals span+24px; wrapped chip prose tightens without rect, height or overflow change");

  // 9. Image attachment tile above the bubble: local parts carry no width/height, so $f takes the non-natural Of square.
  await article("um-image-user").locator('[data-cds="MessageAttachmentsImage"] img[data-loaded]').waitFor();
  const image = await article("um-image-user").evaluate(node => {
    const group = node.querySelector('[data-cds="MessageAttachments"]'), tile = group.querySelector('[data-cds="MessageAttachmentsImage"]');
    const card = tile.querySelector('[data-cds="Card"]'), img = tile.querySelector("img"), fill = tile.querySelector(".source-user-attachment-fill");
    const g = getComputedStyle(group), c = getComputedStyle(card), i = getComputedStyle(img), t = getComputedStyle(tile);
    const probe = document.createElement("span"); probe.style.borderRadius = "calc(var(--cds-radius) + .25rem)"; probe.style.backgroundColor = "var(--cds-surface-1)"; probe.style.borderColor = "var(--cds-border-strong)"; probe.style.width = "7.5rem"; node.appendChild(probe);
    const expected = { radius: getComputedStyle(probe).borderRadius, surface: getComputedStyle(probe).backgroundColor, border: getComputedStyle(probe).borderTopColor, side: getComputedStyle(probe).width }; probe.remove();
    const bubbleBox = node.querySelector(".source-user-bubble").getBoundingClientRect(), tileBox = tile.getBoundingClientRect();
    return { display: g.display, justify: g.justifyContent, wrap: g.flexWrap, gap: g.gap, groupIsClass: group.classList.contains("source-user-attachments"), groupFit: group.getAttribute("data-fit"), tileFit: tile.getAttribute("data-fit"),
      tileRadius: t.borderRadius, tileBox: tileBox.toJSON(), flexShrink: t.flexShrink, cardRadius: c.borderRadius, cardBox: card.getBoundingClientRect().toJSON(), borderWidth: c.borderTopWidth, borderColor: c.borderTopColor, fill: getComputedStyle(fill).backgroundColor, shadow: c.boxShadow,
      expected, imgPosition: i.position, imgFit: i.objectFit, imgOpacity: i.opacity, imgRadius: i.borderRadius, imgBox: img.getBoundingClientRect().toJSON(), natural: { width: img.naturalWidth, height: img.naturalHeight },
      attrs: { width: img.getAttribute("width"), height: img.getAttribute("height") }, markers: tile.querySelectorAll("[data-cds-tile-media],[data-cds-tile-picture]").length, srOnly: tile.querySelectorAll(".sr-only").length,
      loaded: img.hasAttribute("data-loaded"), alt: img.getAttribute("alt"), label: node.textContent.includes("Image attachment"), tileAboveBubble: tileBox.bottom <= bubbleBox.top, gapToBubble: bubbleBox.top - group.getBoundingClientRect().bottom,
      tileRightAligned: Math.abs(tileBox.right - group.getBoundingClientRect().right) };
  });
  assert.equal(image.groupIsClass, true); assert.equal(image.display, "flex"); assert.equal(image.justify, "flex-end"); assert.equal(image.wrap, "wrap"); assert.equal(image.gap, "6px");
  assert.equal(image.groupFit, null); assert.equal(image.tileFit, null, "no natural fit without width/height on the item");
  assert.equal(image.expected.side, "120px"); near(image.tileBox.width, 120, "Of width"); near(image.tileBox.height, 120, "Of height"); assert.equal(image.flexShrink, "0");
  near(image.cardBox.width, 120, "Card size-full width"); near(image.cardBox.height, 120, "Card size-full height");
  assert.equal(image.borderWidth, "0.5px"); assert.equal(image.borderColor, image.expected.border); assert.equal(image.fill, image.expected.surface);
  assert.equal(image.tileRadius, image.expected.radius); assert.equal(image.cardRadius, image.expected.radius); assert.equal(image.imgRadius, image.expected.radius);
  assert.match(image.shadow, /rgba\(0, 0, 0, 0\.05\) 0px 1px 2px 0px/);
  assert.equal(image.imgPosition, "absolute"); assert.equal(image.imgFit, "contain"); assert.equal(image.imgOpacity, "1"); assert.equal(image.loaded, true);
  near(image.imgBox.width, 120, "img fills the square", 1); near(image.imgBox.height, 120, "img fills the square", 1);
  assert.deepEqual(image.attrs, { width: "120", height: "120" }); assert.deepEqual(image.natural, { width: 160, height: 90 }, "the real picture is 160x90 and is letterboxed by object-contain");
  assert.equal(image.markers, 0, "no tile-media/picture markers outside the natural branch"); assert.equal(image.srOnly, 0, "media=content: the img alt is the only name");
  assert.equal(image.label, false, "no 'Image attachment' text label remains"); assert.equal(image.alt, "shot.png");
  assert.equal(image.tileAboveBubble, true); near(image.gapToBubble, 4, "verified 4px group gap kept"); assert.ok(image.tileRightAligned <= .5, "tile is end-aligned");
  metrics.image = image;
  checks.push("Image input renders a data-cds=MessageAttachments flex-end gap-6px row above the bubble with a 120px square rounded-card hairline border-strong surface-1 tile (no data-fit: local parts have no width/height), img 120x120 attrs, absolute object-contain fade-in, no tile markers, no sr-only, no text label");

  // 10. F06: user fences in bundled grammars (tsx, go) are highlighted; a triple-click selects exactly one fence
  // (code-block-current.js:1244-1266 Rr); right-click on a user bubble opens the message context menu
  // (scroll-messages-current.js:33652-33818 CY) whose 'Copy message as Markdown' writes the canonical text.
  const fences = article("um-fence-user").locator("[data-user-code]");
  assert.equal(await fences.count(), 2);
  metrics.userFences = [];
  for (const [index, language] of [[0, "tsx"], [1, "go"]]) {
    await fences.nth(index).locator("[data-code-token]").first().waitFor({ state: "attached" });
    const colors = await fences.nth(index).locator("[data-code-token]").evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).color)).size);
    assert.equal(await fences.nth(index).getAttribute("data-language"), language);
    assert.ok(colors > 1, `${language} user fence uses more than one token color`);
    metrics.userFences.push({ language, colors });
  }
  const goFence = fences.nth(1);
  await goFence.scrollIntoViewIfNeeded();
  await frames(4);
  const goBox = await goFence.locator(".suc-code").boundingBox();
  await page.mouse.click(goBox.x + 24, goBox.y + 6, { clickCount: 3 });
  metrics.userTripleClick = await goFence.evaluate(node => {
    const selection = getSelection(), range = selection.rangeCount ? selection.getRangeAt(0) : null;
    return { text: selection.toString(), codeText: node.dataset.codeText, inside: !!range && node.contains(range.commonAncestorContainer) };
  });
  assert.equal(metrics.userTripleClick.text.trimEnd(), metrics.userTripleClick.codeText.trimEnd(), "triple-click selects the whole user fence");
  assert.ok(metrics.userTripleClick.codeText.includes("func main()") && metrics.userTripleClick.inside, "and nothing outside it");
  await page.evaluate(() => getSelection().removeAllRanges());
  await bubble("um-code-user").scrollIntoViewIfNeeded();
  await frames(4);
  const codeBubble = await bubble("um-code-user").boundingBox();
  await page.mouse.click(codeBubble.x + 5, codeBubble.y + codeBubble.height / 2, { button: "right" });
  const userMenu = page.getByRole("menu", { name: "Message actions", exact: true });
  await userMenu.waitFor();
  // B12: Rewind to here / Fork from here carry a description line (cd5a31703 zNe), so read each item's label.
  metrics.userMenu = await userMenu.locator('[role="menuitem"]').evaluateAll(nodes => nodes.map(node => node.dataset.label));
  assert.deepEqual(metrics.userMenu, ["Copy message", "Copy message as Markdown", "Attach message as context", "Rewind to here", "Fork from here"]);
  assert.deepEqual(await userMenu.locator('[role="menuitem"] .smenu-description').allTextContents(), ["Removes this message and what follows", "Starts a new session, keeps this one"]);
  await userMenu.getByRole("menuitem", { name: "Copy message as Markdown", exact: true }).click();
  await userMenu.waitFor({ state: "detached" });
  for (let attempt = 0; attempt < 40 && await readClipboard() !== CODE; attempt += 1) await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(await readClipboard(), CODE);
  checks.push("User tsx/go fences highlight with several token colors; triple-click selects exactly the go fence; right-click on a user bubble opens Copy message / Copy message as Markdown / Attach message as context, and Copy message as Markdown writes the canonical text");

  // 9. R08 GitHub reference chip in assistant text (markdown-current.js:3713-3786 rc, :4543-4555 Gs; Cf
  // transcriptLinks scroll-messages-current.js:56305-56309), light then dark.
  const pullGlyph = JSON.parse(await fs.readFile(path.join(root, "src/generated/icons.json"), "utf8")).GitPullRequest;
  const forgeAnswer = page.locator('[data-transcript-item-id="um-link-answer"]');
  await forgeAnswer.scrollIntoViewIfNeeded();
  const forgeChip = forgeAnswer.locator("a.smd-forge-ref");
  assert.equal(await forgeChip.count(), 1, "only the bare URL is a chip");
  const plainForge = forgeAnswer.locator(`a[href="${FORGE_PR}"]:not(.smd-forge-ref)`);
  assert.equal(await plainForge.textContent(), "the widget fix", "a descriptive label stays the plain link (Gs)");
  const forgeView = () => forgeChip.evaluate(node => {
    const s = getComputedStyle(node), glyph = node.querySelector('[data-cds="Icon"]'), slot = glyph?.parentElement;
    const probe = (property, value) => { const p = document.createElement("span"); p.style[property] = value; node.parentElement.append(p); const v = getComputedStyle(p)[property]; p.remove(); return v; };
    return { text: node.textContent.replace(/[\uE000-\uF8FF]/g, ""), target: node.getAttribute("target"), rel: node.getAttribute("rel"), href: node.getAttribute("href"),
      color: s.color, background: s.backgroundColor, accent: probe("color", "var(--cds-text-accent)"), muted: probe("backgroundColor", "var(--cds-bg-accent-muted)"),
      hover: probe("backgroundColor", "var(--cds-bg-accent)"), radius: s.borderTopLeftRadius, radiusSm: probe("borderTopLeftRadius", "var(--radius-sm)"),
      padding: [s.paddingLeft, s.paddingRight], px15: probe("paddingLeft", "calc(var(--spacing) * 1.5)"), me1: probe("marginRight", "var(--spacing)"),
      decoration: s.textDecorationLine, display: s.display, cursor: s.cursor, ariaLabel: node.getAttribute("aria-label"),
      glyph: glyph ? glyph.textContent.codePointAt(0) : null, glyphSize: glyph ? getComputedStyle(glyph).fontSize : null,
      slot: slot?.className ?? null, slotPosition: slot ? getComputedStyle(slot).position : null, slotMargin: slot ? getComputedStyle(slot).marginInlineEnd : null,
      slotAlign: slot ? getComputedStyle(slot).verticalAlign : null, nowrap: getComputedStyle(node.firstElementChild).whiteSpace };
  });
  const assertForge = (view, label) => {
    assert.equal(view.text, "acme/widgets#42", `${label}: other-repo label`);
    assert.deepEqual([view.href, view.target, view.rel, view.ariaLabel], [FORGE_PR, "_blank", "noreferrer", null], `${label}: anchor attributes`);
    assert.equal(view.color, view.accent, `${label}: text-accent`); assert.equal(view.background, view.muted, `${label}: bg-accent-muted`);
    assert.equal(view.radius, view.radiusSm, `${label}: rounded-sm`); assert.deepEqual(view.padding, [view.px15, view.px15], `${label}: px-1.5`);
    assert.deepEqual([view.decoration, view.display, view.cursor, view.nowrap], ["none", "inline", "pointer", "nowrap"], `${label}: inline pill, link pointer`);
    assert.deepEqual([view.glyph, view.glyphSize, view.slot, view.slotPosition, view.slotMargin, view.slotAlign],
      [pullGlyph, "12px", "relative bottom-[calc((1cap-1ex)/2)] me-1 inline-flex align-middle", "relative", view.me1, "middle"], `${label}: GitPullRequest xs glyph slot`);
  };
  await page.mouse.move(100, 700);
  metrics.forgeLight = await forgeView(); assertForge(metrics.forgeLight, "light");
  await forgeChip.hover();
  assert.equal(await forgeChip.evaluate(node => getComputedStyle(node).backgroundColor), metrics.forgeLight.hover, "hover:bg-accent");
  await page.mouse.move(100, 700);
  await forgeAnswer.screenshot({ path: path.join(directory, "forge-chip-light.png") });
  await forgeChip.click();
  await page.waitForTimeout(300);
  assert.deepEqual(await app.evaluate(() => globalThis.umOpened), ["https://example.com/x", FORGE_PR], "the chip opens externally exactly once");
  await page.evaluate((theme) => window.desktop.call("settings", { theme }), "dark"); /* the account menu has no appearance items (Claude parity); Settings › Appearance or this preference call switch it */
  await page.waitForFunction(() => document.documentElement.dataset.mode === "dark");
  await page.mouse.move(100, 700); await frames(4);
  metrics.forgeDark = await forgeView(); assertForge(metrics.forgeDark, "dark");
  assert.ok(metrics.forgeDark.color !== metrics.forgeLight.color || metrics.forgeDark.background !== metrics.forgeLight.background, "dark tokens apply");
  await forgeAnswer.screenshot({ path: path.join(directory, "forge-chip-dark.png") });
  await page.evaluate((theme) => window.desktop.call("settings", { theme }), "light"); /* the account menu has no appearance items (Claude parity); Settings › Appearance or this preference call switch it */
  await page.waitForFunction(() => document.documentElement.dataset.mode === "light");
  checks.push("R08: a bare other-repo PR URL in assistant text is the rc pill (acme/widgets#42, text-accent on bg-accent-muted, rounded-sm, px-1.5, hover bg-accent, link pointer) with the 12px GitPullRequest glyph slot in light and dark; the labelled link stays plain; the chip opens externally once");

  await page.mouse.move(100, 700);
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  if (app && externalStubbed) await app.evaluate(({ shell }) => { if (globalThis.umOpenExternal) shell.openExternal = globalThis.umOpenExternal; delete globalThis.umOpenExternal; }).catch(error => { failure ||= error; });
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.umClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.umClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "user-markdown-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, externalStubbed, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "user-markdown-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
