import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { markdownToClipboardHtml } from "../src/rich-copy-html.mjs";
import { turnCopyText } from "../src/turn-copy-model.mjs";

// Rich message Copy (2.2553.1 CopyAction + getRichText): assistant footer and
// user-message Copy write text/plain + text/html through one ClipboardItem,
// silently fall back to writeText when the rich write is refused, and never
// report Copied when both writes fail. Every row comes from the isolated
// protocol fixture; the real system clipboard is saved and restored. Runs only
// after a fresh build with no other GUI suite active.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `rich-copy-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "rich-copy-A", B = "rich-copy-B";
const now = Math.floor(Date.now() / 1000);
const ASSISTANT_MD = "line one\nline two\n\nSecond paragraph.\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\n| col | val |\n|-----|-----|\n| x | 1 |";
const FENCE_CODE = "const a = 1;\nconst b = 2;\n"; // <code> text in the rich payload keeps the fence's final line ending
const FENCE_PLAIN = "const a = 1;\nconst b = 2;"; // the existing code-fence Copy writes the block text without it (unchanged, out of scope)
const USER_ESCAPE = "<b>x</b> and [l](javascript:alert(1))\nsecond line\n";
const USER_PROSE = "Please keep this prompt\non two lines.";
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
function thread(id, name, turns, index = 0) {
  return { id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns };
}
await fs.writeFile(path.join(profile, "rich-copy-fixture.marker"), "isolated-rich-copy-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [A, B], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Rich copy A", [
    { id: "rc-md-turn", status: "completed", items: [userItem("rc-md-user", "Show the markdown fixture."), textItem("rc-md-answer", ASSISTANT_MD)] },
    { id: "rc-escape-turn", status: "completed", items: [userItem("rc-escape-user", USER_ESCAPE), textItem("rc-escape-answer", "Escape answer.")] },
    { id: "rc-prose-turn", status: "completed", items: [userItem("rc-prose-user", USER_PROSE), textItem("rc-prose-answer", "Prose answer.")] },
  ]),
  [B]: thread(B, "Rich copy B", [{ id: "rb-turn", status: "completed", items: [userItem("rb-user", "Session B prompt."), textItem("rb-answer", "Session B answer.")] }], 1),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = { rawHtml: {} }, rendererErrors = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false;
const testSources = ["scripts/rich-copy-ui-test.mjs", "tests/fixtures/codex-server.cjs", "src/rich-copy-html.mjs", "src/turn-copy-model.mjs"];
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
  for (const required of ["src/rich-copy-html.mjs", "src/clipboard-payload.mjs", "src/turn-footer-behavior.mjs", "src/turn-copy-model.mjs",
    "src/source-turn-footer.jsx", "src/source-user-actions.jsx", "src/source-code-block.jsx", "src/clipboard-feedback.mjs", "src/source-session.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test, converter or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const footer = id => page.locator(`.stf-footer[data-turn-copy-id="${id}"]`);
const userRow = id => page.locator(`.sua-row[data-user-actions-id="${id}"]`);
const bubble = id => page.locator(`article.source-user-message[data-transcript-item-id="${id}"] .source-user-bubble`);
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
async function waitStatus(selector, text) {
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent === text, { selector, text });
}
const footerStatus = id => `.stf-footer[data-turn-copy-id="${id}"] .stf-status`;
const userStatus = id => `.sua-row[data-user-actions-id="${id}"] .sua-status`;
async function waitOpacity(selector, value) {
  await page.waitForFunction(({ selector, value }) => {
    const node = document.querySelector(selector);
    return node && Math.abs(Number(getComputedStyle(node).opacity) - value) < .001;
  }, { selector, value });
}
const readText = () => app.evaluate(({ clipboard }) => clipboard.readText());
// Icon glyphs are private-use code points from the prepared glyph map; compare
// code points rather than strings so the evidence is unambiguous.
const glyphs = JSON.parse(await fs.readFile(path.join(root, "src/generated/icons.json"), "utf8"));
const glyphOf = locator => locator.evaluate(node => [...node.textContent].map(char => char.codePointAt(0)));
// Electron 44 main-process clipboard is W3C-shaped: read() yields ClipboardItem[]
// whose types are the formats the platform pasteboard currently exposes.
const readHtml = () => app.evaluate(async ({ clipboard }) => {
  for (const item of await clipboard.read()) if (item.types.includes("text/html")) return (await item.getType("text/html")).text();
  return "";
});
const readTypes = () => app.evaluate(async ({ clipboard }) => (await clipboard.read()).map(item => [...item.types]));
// Chromium re-serializes text/html on the async clipboard path (sanitized
// fragment, <br> instead of <br />, a leading <meta charset>), so both sides
// are compared as parsed DOM. Relative/empty URLs are resolved by Chromium
// against the document, hence hrefs are compared by the sanitized protocol
// only; the raw pasteboard strings are recorded for evidence.
async function normalizedHtml(raw, expected) {
  return page.evaluate(({ raw, expected }) => {
    const normalize = html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const meta of doc.querySelectorAll("meta")) meta.remove();
      const anchors = [...doc.body.querySelectorAll("a")].map(a => ({ attribute: a.getAttribute("href"), protocol: a.href ? new URL(a.href, document.baseURI).protocol : "" }));
      for (const a of doc.body.querySelectorAll("a")) a.removeAttribute("href");
      return { markup: doc.body.innerHTML, anchors };
    };
    return { actual: normalize(raw), expected: normalize(expected) };
  }, { raw, expected });
}
async function assertRich(label, key, expectedText) {
  const text = await readText(), raw = await readHtml();
  metrics.rawHtml[key] = raw;
  metrics.pasteboardTypes = { ...metrics.pasteboardTypes, [key]: await readTypes() };
  assert.equal(text, expectedText, `${label}: plain text`);
  const expectedHtml = markdownToClipboardHtml(expectedText);
  assert.ok(expectedHtml.length > 0, `${label}: converter output must be non-empty`);
  assert.ok(raw.length > 0, `${label}: pasteboard must carry text/html (a fallback plain write would leave it empty)`);
  const { actual, expected } = await normalizedHtml(raw, expectedHtml);
  assert.equal(actual.markup, expected.markup, `${label}: DOM-normalized HTML`);
  assert.equal(actual.anchors.length, expected.anchors.length, `${label}: anchor count`);
  for (const [index, anchor] of actual.anchors.entries()) assert.notEqual(anchor.protocol, "javascript:", `${label}: anchor ${index} protocol`);
  return { text, raw, normalized: actual.markup, anchors: actual.anchors };
}
async function restoreClipboard() {
  await page.evaluate(() => {
    const backup = globalThis.rcClipboardStub;
    if (!backup) return;
    for (const name of ["write", "writeText"]) {
      const descriptor = backup[name];
      if (descriptor) Object.defineProperty(navigator.clipboard, name, descriptor); else delete navigator.clipboard[name];
    }
    delete globalThis.rcClipboardStub;
  });
}
// deny: both rejected. hold: both pending forever. richDeny: only the
// ClipboardItem write is rejected; writeText stays the real implementation.
async function stubClipboard(mode) {
  await restoreClipboard();
  await page.evaluate(mode => {
    globalThis.rcClipboardStub = { write: Object.getOwnPropertyDescriptor(navigator.clipboard, "write"), writeText: Object.getOwnPropertyDescriptor(navigator.clipboard, "writeText") };
    globalThis.rcStubCalls = [];
    const reject = () => Promise.reject(new DOMException("Isolated clipboard denial", "NotAllowedError"));
    const hold = () => new Promise(() => {});
    Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: items => {
      globalThis.rcStubCalls.push({ method: "write", types: items.map(item => [...item.types]) });
      return mode === "hold" ? hold() : reject();
    } });
    if (mode !== "richDeny") Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: text => {
      globalThis.rcStubCalls.push({ method: "writeText", length: text.length });
      return mode === "hold" ? hold() : reject();
    } });
  }, mode);
}
const stubCalls = () => page.evaluate(() => globalThis.rcStubCalls);
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async item => new ClipboardItem(Object.fromEntries(
        await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
      globalThis.rcClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") { const image = clipboard.readImage(); if (!image.isEmpty()) data.image = image; }
    if (typeof clipboard.readBookmark === "function") { const bookmark = clipboard.readBookmark(); if (bookmark.title) data.bookmark = bookmark.title; }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.rcClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  });
  clipboardSaved = true;
  await page.locator(`[data-source-session-id="${A}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await open(A, "rc-prose-answer");
  metrics.rendererClipboard = await page.evaluate(() => ({ secureContext: isSecureContext, write: typeof navigator.clipboard?.write, writeText: typeof navigator.clipboard?.writeText, clipboardItem: typeof ClipboardItem }));
  assert.equal(metrics.rendererClipboard.write, "function"); assert.equal(metrics.rendererClipboard.clipboardItem, "function");

  // 1. Assistant footer Copy (mouse): plain text unchanged, text/html equals the converter output.
  const expectedAssistant = turnCopyText([textItem("rc-md-answer", ASSISTANT_MD)]);
  assert.equal(expectedAssistant, ASSISTANT_MD);
  await page.locator('[data-transcript-item-id="rc-md-answer"]').hover();
  await footer("rc-md-turn").locator(".stf-toolbar").waitFor();
  await waitOpacity(`.stf-footer[data-turn-copy-id="rc-md-turn"] .stf-toolbar`, 1);
  const glyph = () => glyphOf(footer("rc-md-turn").locator('.stf-copy:not([data-message-action]):not([data-feedback]) [data-cds="Icon"]'));
  const copyGlyph = await glyph();
  assert.deepEqual(copyGlyph, [glyphs.Copy], "idle footer shows the Copy glyph");
  await footer("rc-md-turn").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(footerStatus("rc-md-turn"), "Copied");
  const assistantCopiedAt = await page.evaluate(() => performance.now());
  const checkGlyph = await glyph();
  assert.deepEqual(checkGlyph, [glyphs.Check], "Copied swaps the Copy glyph for Check");
  metrics.glyphs = { copy: copyGlyph, check: checkGlyph };
  const assistant = await assertRich("assistant footer", "assistantFooter", expectedAssistant);
  metrics.assistantStructure = await page.evaluate(raw => {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const paragraphs = [...doc.body.querySelectorAll("p")], first = paragraphs[0];
    const code = doc.body.querySelector("pre > code");
    return { paragraphs: paragraphs.length, firstParagraphBreaks: first ? first.querySelectorAll("br").length : null, firstParagraphText: first?.textContent ?? null,
      codeClass: code?.getAttribute("class") ?? null, codeText: code?.textContent ?? null, codeBreaks: code ? code.querySelectorAll("br").length : null,
      table: !!doc.body.querySelector("table"), thead: !!doc.body.querySelector("table > thead"), tbody: !!doc.body.querySelector("table > tbody"),
      headerCells: [...doc.body.querySelectorAll("thead th")].map(cell => cell.textContent), bodyCells: [...doc.body.querySelectorAll("tbody td")].map(cell => cell.textContent) };
  }, assistant.raw);
  assert.equal(metrics.assistantStructure.paragraphs, 2, "two <p> elements");
  assert.equal(metrics.assistantStructure.firstParagraphBreaks, 1, "exactly one <br> in the first paragraph");
  assert.equal(metrics.assistantStructure.firstParagraphText, "line one\nline two");
  assert.equal(metrics.assistantStructure.codeClass, "language-js");
  assert.equal(metrics.assistantStructure.codeText, FENCE_CODE, "fence keeps its raw newline");
  assert.equal(metrics.assistantStructure.codeBreaks, 0, "no <br> inside the fence");
  assert.ok(metrics.assistantStructure.table && metrics.assistantStructure.thead && metrics.assistantStructure.tbody, "table with thead/tbody");
  assert.deepEqual(metrics.assistantStructure.headerCells, ["col", "val"]); assert.deepEqual(metrics.assistantStructure.bodyCells, ["x", "1"]);
  await page.waitForTimeout(1500);
  assert.equal(await footer("rc-md-turn").locator(".stf-status").textContent(), "Copied");
  assert.deepEqual(await glyph(), checkGlyph, "Check persists through the feedback window");
  await waitStatus(footerStatus("rc-md-turn"), "");
  assert.deepEqual(await glyph(), copyGlyph, "the glyph reverts to Copy after the feedback window");
  metrics.assistantFeedbackMs = await page.evaluate(() => performance.now()) - assistantCopiedAt;
  assert.ok(metrics.assistantFeedbackMs >= 1850 && metrics.assistantFeedbackMs < 3200, `assistant feedback lasted ${metrics.assistantFeedbackMs}ms`);
  metrics.assistantGeometry = await footer("rc-md-turn").evaluate(node => {
    const button = node.querySelector(".stf-copy:not([data-message-action]):not([data-feedback])"), box = button.getBoundingClientRect();
    return { gap: node.getBoundingClientRect().top - node.previousElementSibling.getBoundingClientRect().bottom, rowHeight: node.getBoundingClientRect().height,
      width: box.width, height: box.height, glyph: getComputedStyle(button.querySelector('[data-cds="Icon"]')).fontSize };
  });
  near(metrics.assistantGeometry.gap, 8, "body-to-footer gap"); near(metrics.assistantGeometry.rowHeight, 24, "footer row height");
  near(metrics.assistantGeometry.width, 24, "Copy width"); near(metrics.assistantGeometry.height, 24, "Copy height"); assert.equal(metrics.assistantGeometry.glyph, "16px");
  checks.push("Assistant footer Copy writes unchanged plain text plus text/html equal to the converter output: one <br> in the first paragraph, two <p>, a language-js fence with its raw newline and no <br>, a table with thead/tbody; 2000ms feedback and 24/24/16/8px geometry unchanged");

  // 1b. F06: right-click on the assistant row -> Copy message writes the same rich payload as the footer Copy
  // (scroll-messages-current.js:33652-33818 CY 'Copy message' -> rY: text plus Fd(text, {breaks:true}) HTML).
  await page.evaluate(() => getSelection().removeAllRanges());
  await app.evaluate(({ clipboard }) => clipboard.writeText("BEFORE_CONTEXT_COPY"));
  const answerBox = await page.locator('[data-transcript-item-id="rc-md-answer"] p').first().boundingBox();
  await page.mouse.click(answerBox.x + answerBox.width - 8, answerBox.y + answerBox.height / 2, { button: "right" });
  const contextMenu = page.getByRole("menu", { name: "Message actions", exact: true });
  await contextMenu.waitFor();
  metrics.contextMenuItems = await contextMenu.locator('[role="menuitem"]').evaluateAll(nodes => nodes.map(node => node.dataset.label));
  // The fixture core serves thread/fork, so an idle session's assistant message also offers Fork from here
  // (after its own separator; Rewind to here is for user messages only). B11: an assistant message also offers
  // Pin as chapter right after Attach (cd5a31703 TI :25645-25651), inside the same group.
  assert.deepEqual(metrics.contextMenuItems, ["Copy message", "Copy message as Markdown", "Attach message as context", "Pin as chapter", "Fork from here"]);
  assert.equal(await contextMenu.locator('[role="separator"]').count(), 2);
  await contextMenu.getByRole("menuitem", { name: "Copy message", exact: true }).click();
  await contextMenu.waitFor({ state: "detached" });
  for (let attempt = 0; attempt < 40 && (await readText()) !== ASSISTANT_MD; attempt += 1) await page.waitForTimeout(50);
  await assertRich("context menu Copy message", "contextMessage", ASSISTANT_MD);
  checks.push("Right-click on an assistant row opens Copy message / Copy message as Markdown / Attach message as context, and Copy message writes text/plain plus the converter's text/html");

  // 2. User Copy by mouse: byte-exact plain text, escaped HTML, unsafe protocol dropped.
  await bubble("rc-escape-user").hover();
  await userRow("rc-escape-user").locator(".sua-toolbar").waitFor();
  await waitOpacity(`.sua-row[data-user-actions-id="rc-escape-user"] .sua-toolbar`, 1);
  await userRow("rc-escape-user").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(userStatus("rc-escape-user"), "Copied");
  const escape = await assertRich("user escape", "userEscape", USER_ESCAPE);
  assert.ok(escape.normalized.includes("&lt;b&gt;x&lt;/b&gt;"), `raw tag is escaped: ${escape.normalized}`);
  assert.equal(escape.normalized.includes("<b>"), false, "no live <b> element");
  assert.equal(escape.anchors.length, 1, "one anchor");
  assert.notEqual(escape.anchors[0].protocol, "javascript:", "javascript: href is dropped");
  assert.equal(/javascript:/i.test(escape.raw), false, "no javascript: anywhere in the pasteboard HTML");
  assert.equal(markdownToClipboardHtml(USER_ESCAPE).includes('href=""'), true, "converter emits an empty href");
  assert.equal(escape.text.endsWith("\n"), true, "user plain text keeps its trailing newline (trim:false, byte-exact)");
  metrics.userEscape = { text: escape.text, normalized: escape.normalized, anchors: escape.anchors };
  metrics.userGeometry = await userRow("rc-escape-user").evaluate(node => {
    const button = node.querySelector(".sua-copy:not([data-message-action])"), box = button.getBoundingClientRect();
    return { rowHeight: node.getBoundingClientRect().height, width: box.width, height: box.height, glyph: getComputedStyle(button.querySelector('[data-cds="Icon"]')).fontSize,
      bubbleToRow: node.getBoundingClientRect().top - node.parentElement.querySelector(".source-user-bubble").getBoundingClientRect().bottom };
  });
  near(metrics.userGeometry.rowHeight, 24, "user row height"); near(metrics.userGeometry.width, 24, "user Copy width"); near(metrics.userGeometry.height, 24, "user Copy height");
  assert.equal(metrics.userGeometry.glyph, "16px"); near(metrics.userGeometry.bubbleToRow, 8, "bubble to row gap");
  checks.push("Mouse user Copy keeps byte-exact plain text (trailing newline) while text/html escapes <b>x</b> and drops the javascript: href; user row geometry unchanged");

  // 3. User Copy by the real keyboard route (Shift+Tab from the composer to the prose prompt).
  await page.locator(".sc-input.epitaxy-prompt-input").focus(); // the main composer; the side chat field is also .sc-input
  await page.mouse.move(100, 700);
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Shift+Tab");
    reached = await page.evaluate(() => document.activeElement?.classList.contains("sua-copy") && document.activeElement.closest(".sua-row")?.dataset.userActionsId === "rc-prose-user");
  }
  assert.ok(reached, "reverse Tab must reach the prose prompt's Copy");
  await page.keyboard.press("Enter");
  await waitStatus(userStatus("rc-prose-user"), "Copied");
  const prose = await assertRich("user keyboard", "userKeyboard", USER_PROSE);
  assert.equal(prose.normalized, "<p>Please keep this prompt<br>\non two lines.</p>");
  checks.push("Keyboard (Shift+Tab, Enter) user Copy writes the same text/plain + text/html payload as the mouse path");

  // 4. Fallback: the rich write is refused, writeText is real -> Copied, plain text present, no HTML.
  // Let the keyboard Copy's 2000ms feedback expire first so a stale Copied
  // can never stand in for the fallback outcome.
  await waitStatus(userStatus("rc-prose-user"), "");
  await stubClipboard("richDeny");
  await bubble("rc-prose-user").hover();
  const userGlyph = () => glyphOf(userRow("rc-prose-user").locator('.sua-copy:not([data-message-action]) [data-cds="Icon"]'));
  assert.deepEqual(await userGlyph(), [glyphs.Copy], "user Copy idles on the Copy glyph");
  await userRow("rc-prose-user").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(userStatus("rc-prose-user"), "Copied");
  assert.deepEqual(await userGlyph(), [glyphs.Check], "fallback success shows the Check glyph");
  const fallbackCalls = await stubCalls();
  assert.deepEqual(fallbackCalls, [{ method: "write", types: [["text/plain", "text/html"]] }], "one ClipboardItem with both formats was attempted first");
  metrics.rawHtml.fallback = await readHtml();
  metrics.pasteboardTypes = { ...metrics.pasteboardTypes, fallback: await readTypes() };
  assert.equal(await readText(), USER_PROSE, "fallback plain text");
  assert.equal(metrics.rawHtml.fallback.includes("<br"), false, "fallback leaves no rich fragment on the pasteboard");
  assert.equal(metrics.rawHtml.fallback.includes("Please keep"), false, "fallback leaves no HTML copy of the message");
  await restoreClipboard();
  checks.push("When clipboard.write is refused the plain writeText fallback still shows Copied with the expected text and no text/html payload");

  // 5. Denial: both writes rejected -> local failure text, no Copied, pasteboard untouched.
  await waitStatus(userStatus("rc-prose-user"), "");
  await footer("rc-md-turn").locator(".stf-toolbar").waitFor();
  const beforeDenial = { text: await readText(), html: await readHtml() };
  await stubClipboard("deny");
  await page.locator('[data-transcript-item-id="rc-md-answer"]').hover();
  await footer("rc-md-turn").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus(footerStatus("rc-md-turn"), "Couldn’t copy to the clipboard. Try again.");
  assert.deepEqual((await stubCalls()).map(call => call.method), ["write", "writeText"], "rich then plain were both attempted");
  assert.equal(await page.locator(".stf-status, .sua-status").filter({ hasText: /^Copied$/ }).count(), 0);
  assert.equal(await readText(), beforeDenial.text); assert.equal(await readHtml(), beforeDenial.html);
  await restoreClipboard();
  checks.push("With both write and writeText rejected the footer reports the local failure text, never Copied, and the pasteboard keeps its previous text and HTML");

  // 6. Pending writes show no feedback; unmounting through a session switch never shows Copied elsewhere.
  await stubClipboard("hold");
  await bubble("rc-prose-user").hover();
  await userRow("rc-prose-user").getByRole("button", { name: "Copy", exact: true }).click();
  await page.waitForFunction(() => globalThis.rcStubCalls.length === 1);
  await page.waitForTimeout(300);
  assert.equal(await userRow("rc-prose-user").locator(".sua-status").textContent(), "", "a pending rich write shows no feedback");
  await open(B, "rb-answer");
  await page.waitForTimeout(120);
  assert.equal(await page.locator(".stf-status, .sua-status").filter({ hasText: /^Copied$/ }).count(), 0);
  await restoreClipboard();
  await open(A, "rc-prose-answer");
  assert.equal(await userRow("rc-prose-user").locator(".sua-toolbar").count(), 0, "remounted rows start deferred");
  checks.push("A pending ClipboardItem write shows no feedback and a session switch before completion never surfaces Copied");

  // 7. Code-fence Copy stays plain-only with 1200ms feedback (the shared seam must not leak).
  const block = page.locator('[data-transcript-item-id="rc-md-answer"] .scb-block');
  await block.hover();
  await block.getByRole("button", { name: "Copy code", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="rc-md-answer"] .scb-status')?.textContent === "Copied");
  const fenceCopiedAt = await page.evaluate(() => performance.now());
  assert.equal(await readText(), FENCE_PLAIN, "code-fence Copy writes the exact block text");
  metrics.rawHtml.codeFence = await readHtml();
  metrics.pasteboardTypes = { ...metrics.pasteboardTypes, codeFence: await readTypes() };
  assert.equal(metrics.rawHtml.codeFence, "", "code-fence Copy writes plain text only");
  await page.waitForFunction(() => document.querySelector('[data-transcript-item-id="rc-md-answer"] .scb-status')?.textContent === "");
  metrics.codeFenceFeedbackMs = await page.evaluate(() => performance.now()) - fenceCopiedAt;
  assert.ok(metrics.codeFenceFeedbackMs >= 1100 && metrics.codeFenceFeedbackMs < 1900, `code-fence feedback lasted ${metrics.codeFenceFeedbackMs}ms`);
  checks.push("Code-fence Copy still writes plain text only with 1200ms feedback");
  await page.mouse.move(100, 700);
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await restoreClipboard().catch(() => {});
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.rcClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.rcClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "rich-copy-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "rich-copy-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
