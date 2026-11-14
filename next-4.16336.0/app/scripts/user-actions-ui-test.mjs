import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { USER_TEXT } from "./ui029-fixtures.mjs";
import { markdownToClipboardHtml } from "../src/rich-copy-html.mjs";

// Ordinary user turn: persistent 24px actions row with an 8px bubble gap,
// canonical byte-exact Copy, and measured shrink-wrap of the bubble. Runs only
// after a fresh build with no other GUI suite active; every row comes from the
// isolated protocol fixture, never from injected DOM.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `user-actions-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "user-actions-A", B = "user-actions-B";
const now = Math.floor(Date.now() / 1000);
const SHORT = "Short fixture request.";
const WRAP = "Please review the deployment plan for the ingestion service and tell me whether the retry policy, the queue depth alarms and the rollback checklist are consistent with what we agreed last week; then summarize any risks you notice in the migration ordering, especially around the schema change that lands before the consumers are redeployed.\n";
const WRAP_B = "A separate session prompt that also wraps across several lines so that its own bubble is measured independently from the other session and never inherits a stale inline width from a previous mount.";
const FENCE_ANSWER = "```js\nconst next = true;\n```";
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
function thread(id, name, turns, index = 0) {
  return { id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns };
}
await fs.writeFile(path.join(profile, "user-actions-fixture.marker"), "isolated-user-actions-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [A, B], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "User actions A", [
    { id: "ua-short-turn", status: "completed", items: [userItem("ua-short-user", SHORT), textItem("ua-short-answer", "Short completed answer.")] },
    { id: "ua-wrap-turn", status: "completed", items: [userItem("ua-wrap-user", WRAP), textItem("ua-wrap-answer", "Wrapped answer.")] },
    { id: "ua-fence-turn", status: "completed", items: [userItem("ua-fence-user", USER_TEXT), textItem("ua-fence-answer", FENCE_ANSWER)] },
  ]),
  [B]: thread(B, "User actions B", [{ id: "ub-turn", status: "completed", items: [userItem("ub-user", WRAP_B), textItem("ub-answer", "Session B answer.")] }], 1),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false;
const testSources = ["scripts/user-actions-ui-test.mjs", "scripts/ui029-fixtures.mjs", "tests/fixtures/codex-server.cjs", "src/rich-copy-html.mjs"];
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
  for (const required of ["src/source-user-actions.jsx", "src/source-user-actions.css", "src/shrink-wrap.mjs", "src/shrink-wrap-model.mjs",
    "src/use-shrink-wrap.js", "src/turn-footer-behavior.mjs", "src/source-session.jsx", "src/source-session.css", "src/source-user-text.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const article = id => page.locator(`article.source-user-message[data-transcript-item-id="${id}"]`);
const bubble = id => article(id).locator(":scope > .source-user-group > .source-user-bubble");
const row = id => article(id).locator(":scope > .sua-row");
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
async function waitStatus(id, text) {
  await page.waitForFunction(({ id, text }) => document.querySelector(`.sua-row[data-user-actions-id="${id}"] .sua-status`)?.textContent === text, { id, text });
}
async function waitOpacity(id, value) {
  await page.waitForFunction(({ id, value }) => {
    const node = document.querySelector(`.sua-row[data-user-actions-id="${id}"] .sua-toolbar`);
    return node && Math.abs(Number(getComputedStyle(node).opacity) - value) < .001;
  }, { id, value });
}
async function geometry(id, nextId) {
  return page.evaluate(({ id, nextId }) => {
    const article = document.querySelector(`article.source-user-message[data-transcript-item-id="${id}"]`);
    const group = article.querySelector(":scope > .source-user-group"), bubble = group.querySelector(":scope > .source-user-bubble");
    const row = article.querySelector(":scope > .sua-row"), next = document.querySelector(`[data-transcript-item-id="${nextId}"]`);
    const r = node => node.getBoundingClientRect();
    return { articleGap: getComputedStyle(article).gap, groupGap: getComputedStyle(group).gap, groupWidth: group.clientWidth,
      bubbleWidth: r(bubble).width, bubbleHeight: r(bubble).height, bubbleToRow: r(row).top - r(bubble).bottom, rowHeight: r(row).height,
      rowIsLast: article.lastElementChild === row, groupIsFirst: article.firstElementChild === group,
      articleToNext: next ? r(next).top - r(article).bottom : null, bubbleToNext: next ? r(next).top - r(bubble).bottom : null,
      inlineMaxWidth: bubble.style.maxWidth, computedMaxWidth: getComputedStyle(bubble).maxWidth,
      toolbarMounted: !!row.querySelector(".sua-toolbar"), placeholder: row.querySelector(".sua-placeholder") ? {
        hidden: row.querySelector(".sua-placeholder").getAttribute("aria-hidden"), height: r(row.querySelector(".sua-placeholder")).height,
        width: r(row.querySelector(".sua-placeholder")).width } : null,
      sentinel: row.querySelector(".sua-show-actions")?.textContent ?? null };
  }, { id, nextId });
}
// Compare the applied inline width against natural layout without any test-
// side layout injection surviving: the inline style is restored synchronously.
async function rewrapProbe(id) {
  return bubble(id).evaluate(node => {
    const measure = () => {
      const range = document.createRange(), rects = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        range.selectNodeContents(text);
        for (const rect of range.getClientRects()) if (rect.width > 0) rects.push(Math.round(rect.width * 100) / 100);
      }
      const box = node.getBoundingClientRect();
      return { rects, height: box.height, width: box.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
    };
    const applied = node.style.maxWidth;
    const withApplied = measure();
    node.style.maxWidth = "";
    const natural = measure();
    node.style.maxWidth = applied;
    return { applied, withApplied, natural, groupWidth: node.parentElement.clientWidth };
  });
}
function assertNoRewrap(probe, label) {
  assert.equal(probe.withApplied.rects.length, probe.natural.rects.length, `${label}: line rect count`);
  for (let i = 0; i < probe.natural.rects.length; i++) near(probe.withApplied.rects[i], probe.natural.rects[i], `${label}: line ${i} width`, .5);
  near(probe.withApplied.height, probe.natural.height, `${label}: height`, .5);
  assert.ok(probe.withApplied.scrollWidth <= probe.withApplied.clientWidth + .5, `${label}: no horizontal overflow`);
}
// Rich copy (2.2553.1 CopyAction/getRichText + shared-7 JI): Copy first tries
// clipboard.write([ClipboardItem{text/plain,text/html}]) and silently falls
// back to writeText, so the deny stub must cover BOTH methods or the rich path
// would bypass it. richDeny rejects only the ClipboardItem write.
async function restoreWrite() {
  await page.evaluate(() => {
    if (!globalThis.uaWriteBackup) return;
    for (const name of ["write", "writeText"]) {
      const descriptor = globalThis.uaWriteBackup[name];
      if (descriptor) Object.defineProperty(navigator.clipboard, name, descriptor); else delete navigator.clipboard[name];
    }
    delete globalThis.uaWriteBackup;
  });
}
async function mockWrite(mode) {
  await restoreWrite();
  await page.evaluate(mode => {
    globalThis.uaWriteBackup = { write: Object.getOwnPropertyDescriptor(navigator.clipboard, "write"), writeText: Object.getOwnPropertyDescriptor(navigator.clipboard, "writeText") };
    const stub = method => () => mode === "deny" || (mode === "richDeny" && method === "write")
      ? Promise.reject(new DOMException("Isolated clipboard denial", "NotAllowedError")) : new Promise(() => {});
    Object.defineProperty(navigator.clipboard, "write", { configurable: true, value: stub("write") });
    if (mode !== "richDeny") Object.defineProperty(navigator.clipboard, "writeText", { configurable: true, value: stub("writeText") });
  }, mode);
}
const readClipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());
// Electron 44 main-process clipboard is W3C-shaped: read() yields ClipboardItem[].
const readHtml = () => app.evaluate(async ({ clipboard }) => {
  for (const item of await clipboard.read()) if (item.types.includes("text/html")) return (await item.getType("text/html")).text();
  return "";
});
// The plain payload stays byte-exact (trim:false) while text/html is derived
// from the trimmed Markdown. Chromium re-serializes the sanitized fragment
// (<br> for <br />, <meta charset>, resolved hrefs): compare as parsed DOM.
async function assertRichHtml(key, expected) {
  const raw = await readHtml();
  metrics.rawHtml = { ...metrics.rawHtml, [key]: raw };
  const converted = markdownToClipboardHtml(expected);
  assert.ok(converted.length > 0 && raw.length > 0, `${key}: text/html must be present (a plain-only fallback would leave it empty)`);
  const { actual, wanted } = await page.evaluate(({ raw, converted }) => {
    const normalize = html => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const node of doc.querySelectorAll("meta")) node.remove();
      for (const a of doc.body.querySelectorAll("a")) a.removeAttribute("href");
      return doc.body.innerHTML;
    };
    return { actual: normalize(raw), wanted: normalize(converted) };
  }, { raw, converted });
  assert.equal(actual, wanted, `${key}: DOM-normalized text/html equals the converter output`);
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
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async item => new ClipboardItem(Object.fromEntries(
        await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
      globalThis.uaClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") { const image = clipboard.readImage(); if (!image.isEmpty()) data.image = image; }
    if (typeof clipboard.readBookmark === "function") { const bookmark = clipboard.readBookmark(); if (bookmark.title) data.bookmark = bookmark.title; }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.uaClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  });
  clipboardSaved = true;
  await page.locator(`[data-source-session-id="${A}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await open(A, "ua-fence-answer");

  // 1. Structure and occupancy before any interaction.
  const short = await geometry("ua-short-user", "ua-short-answer");
  assert.equal(short.articleGap, "8px"); assert.equal(short.groupGap, "4px");
  assert.ok(short.groupIsFirst && short.rowIsLast, "group first, actions row last inside the user article");
  assert.equal(short.toolbarMounted, false, "never-interacted rows defer the toolbar");
  assert.equal(short.placeholder.hidden, "true"); near(short.placeholder.height, 24, "reservation height"); near(short.placeholder.width, 1, "reservation width");
  near(short.rowHeight, 24, "row occupancy"); near(short.bubbleToRow, 8, "bubble to row gap");
  assert.equal(short.sentinel, "Show message actions");
  assert.equal(short.inlineMaxWidth, "", "a single short line has nothing to trim");
  assert.equal(short.computedMaxWidth, "85%");
  metrics.short = short;
  checks.push("User article = 8px column [4px bubble group, 24px deferred actions row]; single-line bubble keeps the plain 85% ceiling");

  // 2. Bubble-to-next-turn distance: 8 gap + 24 row + 15 turn gap = 47.
  const fence = await geometry("ua-fence-user", "ua-fence-answer");
  near(fence.bubbleToRow, 8, "fence bubble to row"); near(fence.rowHeight, 24, "fence row height");
  near(fence.articleToNext, 15, "user article to next assistant"); near(fence.bubbleToNext, 47, "bubble bottom to next assistant");
  assert.equal(fence.toolbarMounted, false);
  metrics.fence = fence;
  checks.push("Five-fence prompt: bubble bottom to next assistant block is 8+24+15 = 47px with the toolbar still deferred");

  // 3. Measured shrink-wrap on a wrapped paragraph.
  await page.waitForFunction(() => /px$/.test(document.querySelector('[data-transcript-item-id="ua-wrap-user"] .source-user-bubble')?.style.maxWidth ?? ""), null, { timeout: 4000 });
  const wrap = await geometry("ua-wrap-user", "ua-wrap-answer");
  const wrapProbe = await rewrapProbe("ua-wrap-user");
  assert.match(wrapProbe.applied, /^\d+px$/, "wrapped prose receives a measured inline max-width");
  near(wrapProbe.natural.width, wrapProbe.groupWidth * .85, "natural width hits the 85% ceiling", 1);
  assert.ok(wrapProbe.withApplied.width < wrapProbe.natural.width - .5, `measured width ${wrapProbe.withApplied.width} tightens ${wrapProbe.natural.width}`);
  assert.ok(wrapProbe.natural.rects.length >= 3, "fixture must actually wrap");
  assertNoRewrap(wrapProbe, "wrapped prose");
  near(wrap.bubbleToRow, 8, "wrapped bubble to row"); near(wrap.rowHeight, 24, "wrapped row height");
  metrics.shrinkWrap = { applied: wrapProbe.applied, natural: wrapProbe.natural.width, measured: wrapProbe.withApplied.width, lines: wrapProbe.natural.rects.length, groupWidth: wrapProbe.groupWidth };
  const fenceProbe = await rewrapProbe("ua-fence-user");
  assertNoRewrap(fenceProbe, "five-fence prompt");
  assert.ok(fenceProbe.withApplied.width <= fenceProbe.natural.width + .5);
  metrics.shrinkWrapFence = { applied: fenceProbe.applied, natural: fenceProbe.natural.width, measured: fenceProbe.withApplied.width };
  checks.push("Wrapped prose is shrink-wrapped below its 85% natural width with identical line rects, height and no overflow; fenced prompt never rewraps");

  // 4. Hover reveal must not move the following turn.
  await bubble("ua-fence-user").hover();
  await row("ua-fence-user").locator(".sua-toolbar").waitFor();
  await waitOpacity("ua-fence-user", 1);
  const revealed = await geometry("ua-fence-user", "ua-fence-answer");
  assert.equal(revealed.toolbarMounted, true); assert.equal(revealed.placeholder, null);
  near(revealed.rowHeight, 24, "mounted row height"); near(revealed.bubbleToRow, 8, "mounted gap");
  near(revealed.bubbleToNext, fence.bubbleToNext, "revealing actions does not move the next block");
  near(revealed.bubbleWidth, fence.bubbleWidth, "revealing actions does not change bubble width");
  metrics.hover = await row("ua-fence-user").locator(".sua-toolbar").evaluate(node => ({ role: node.getAttribute("role"), label: node.getAttribute("aria-label"),
    tabindex: node.getAttribute("tabindex"), duration: getComputedStyle(node).transitionDuration, delay: getComputedStyle(node).transitionDelay, scale: getComputedStyle(node).scale }));
  assert.equal(metrics.hover.role, "toolbar"); assert.equal(metrics.hover.label, "Message actions"); assert.equal(metrics.hover.tabindex, "-1");
  assert.equal(metrics.hover.duration, "0.12s"); assert.equal(metrics.hover.delay, "0.1s"); assert.equal(metrics.hover.scale, "none");
  metrics.copyGeometry = await row("ua-fence-user").getByRole("button", { name: "Copy", exact: true }).evaluate(button => {
    const style = getComputedStyle(button), box = button.getBoundingClientRect();
    return { width: box.width, height: box.height, glyph: getComputedStyle(button.querySelector('[data-cds="Icon"]')).fontSize, radius: style.borderRadius, title: button.getAttribute("title") };
  });
  near(metrics.copyGeometry.width, 24, "Copy width"); near(metrics.copyGeometry.height, 24, "Copy height");
  assert.equal(metrics.copyGeometry.glyph, "16px"); assert.equal(metrics.copyGeometry.radius, "6px"); assert.equal(metrics.copyGeometry.title, null);
  await page.mouse.move(100, 700);
  await waitOpacity("ua-fence-user", 0);
  assert.equal(await row("ua-fence-user").locator(".sua-toolbar").evaluate(node => getComputedStyle(node).transitionDuration), "0.06s");
  assert.equal(await row("ua-fence-user").locator(".sua-toolbar").count(), 1, "interacted rows keep the mounted toolbar");
  assert.equal(await row("ua-wrap-user").locator(".sua-toolbar").count(), 0, "hovering one user turn must not mount another");
  checks.push("Hover mounts and reveals the user toolbar (120ms/100ms in, 60ms out) with 24/16/6px Copy and zero movement of the next block; other user turns stay deferred");

  // 5. Mouse Copy writes the canonical five-fence text byte-exact.
  await bubble("ua-fence-user").hover();
  await row("ua-fence-user").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus("ua-fence-user", "Copied");
  assert.equal(await readClipboard(), USER_TEXT);
  assert.ok(USER_TEXT.includes("```js\n") && USER_TEXT.includes("\n```"), "fixture contains fences");
  await assertRichHtml("mouseFenceCopy", USER_TEXT);
  assert.ok(metrics.rawHtml.mouseFenceCopy.includes("<pre><code"), "fenced prompt copies as <pre><code> HTML");
  checks.push("Mouse Copy on the fenced prompt writes the original text with fences, language tags and newlines intact plus matching text/html");

  // 6. Real keyboard route: Shift+Tab from the composer reaches Show message actions, then Copy.
  await page.evaluate(() => {
    globalThis.uaFocusTrail = [];
    document.addEventListener("focusin", event => {
      const node = event.target;
      if (node instanceof HTMLElement && node.closest(".sua-row")) globalThis.uaFocusTrail.push({
        id: node.closest(".sua-row").dataset.userActionsId, sentinel: node.classList.contains("sua-show-actions"), copy: node.classList.contains("sua-copy") });
    }, true);
  });
  await page.locator(".sc-input.epitaxy-prompt-input").focus(); // the main composer; the side chat field is also .sc-input
  await page.mouse.move(100, 700);
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await page.keyboard.press("Shift+Tab");
    reached = await page.evaluate(() => document.activeElement?.classList.contains("sua-copy") && document.activeElement.closest(".sua-row")?.dataset.userActionsId === "ua-wrap-user");
  }
  assert.ok(reached, "reverse Tab must reach the wrapped prompt's Copy");
  metrics.focusTrail = await page.evaluate(() => globalThis.uaFocusTrail);
  assert.ok(metrics.focusTrail.some(entry => entry.id === "ua-wrap-user" && entry.sentinel), "the sentinel is traversed before focus handoff");
  await waitOpacity("ua-wrap-user", 1);
  assert.equal(await row("ua-wrap-user").locator(".sua-toolbar").evaluate(node => getComputedStyle(node).transitionDelay), "0s", "focus reveal has no delay");
  // Roving focus (turnFooterKeyIndex, wrapping) over Copy and, where offered, Rewind to here / Fork from here.
  const rovers = await row("ua-wrap-user").evaluate(node => [...node.querySelectorAll(".sua-toolbar button:not(:disabled)")].map(button => button.getAttribute("aria-label")));
  assert.equal(rovers[0], "Copy");
  let rover = 0;
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
    await page.keyboard.press(key);
    rover = key === "Home" ? 0 : key === "End" ? rovers.length - 1 : (rover + (key === "ArrowRight" ? 1 : -1) + rovers.length) % rovers.length;
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), rovers[rover], `${key} roves to ${rovers[rover]}`);
  }
  await page.keyboard.press("Home");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Copy", "Home returns to Copy");
  const wrapAfterFocus = await geometry("ua-wrap-user", "ua-wrap-answer");
  near(wrapAfterFocus.bubbleToNext, wrap.bubbleToNext, "keyboard reveal does not move the next block");
  await page.keyboard.press("Enter");
  await waitStatus("ua-wrap-user", "Copied");
  const copiedAt = await page.evaluate(() => performance.now());
  assert.equal(await readClipboard(), WRAP, "byte-exact including the trailing newline");
  await assertRichHtml("keyboardWrapCopy", WRAP);
  await page.waitForTimeout(1500);
  assert.equal(await row("ua-wrap-user").locator(".sua-status").textContent(), "Copied");
  await waitStatus("ua-wrap-user", "");
  metrics.feedbackResetMs = await page.evaluate(() => performance.now()) - copiedAt;
  assert.ok(metrics.feedbackResetMs >= 1850 && metrics.feedbackResetMs < 3200, `feedback lasted ${metrics.feedbackResetMs}ms`);
  checks.push("Keyboard traversal mounts the toolbar through Show message actions; roving keys hold; Enter copies the untrimmed prompt with 2000ms feedback");

  // 7. Clipboard denial (rich and plain rejected) stays a truthful local failure; a refused rich write falls back to plain.
  const beforeDenial = { text: await readClipboard(), html: await readHtml() };
  await mockWrite("deny");
  await row("ua-wrap-user").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus("ua-wrap-user", "Couldn’t copy to the clipboard. Try again.");
  assert.equal(await readClipboard(), beforeDenial.text); assert.equal(await readHtml(), beforeDenial.html, "denial leaves text/html untouched");
  await restoreWrite();
  await mockWrite("richDeny");
  await row("ua-wrap-user").getByRole("button", { name: "Copy", exact: true }).click();
  await waitStatus("ua-wrap-user", "Copied");
  assert.equal(await readClipboard(), WRAP, "fallback plain text stays byte-exact");
  metrics.rawHtml = { ...metrics.rawHtml, fallback: await readHtml() };
  assert.equal(metrics.rawHtml.fallback.includes("<p>"), false, "fallback leaves no rich fragment");
  assert.equal(metrics.rawHtml.fallback.includes("deployment plan"), false, "fallback leaves no HTML copy of the prompt");
  await restoreWrite();
  await waitStatus("ua-wrap-user", "");
  checks.push("Clipboard denial reports a failure without false Copied feedback or text/html changes; a refused ClipboardItem write falls back to writeText with Copied, exact text and no text/html");

  // 8. Narrow resize re-measures; session switches leave no residual width.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(780, 768));
  await page.waitForFunction(() => innerWidth === 780);
  await frames(8);
  const narrowProbe = await rewrapProbe("ua-wrap-user");
  assert.ok(narrowProbe.groupWidth < wrapProbe.groupWidth - 100, "the column actually narrowed");
  if (narrowProbe.applied) {
    assert.ok(parseFloat(narrowProbe.applied) <= narrowProbe.groupWidth * .85 + .5, "re-measured width fits the narrower ceiling");
    assertNoRewrap(narrowProbe, "narrow prose");
  }
  near(narrowProbe.withApplied.width, Math.min(narrowProbe.natural.width, narrowProbe.withApplied.width), "no stale wide max-width survives a resize", .5);
  assert.ok(narrowProbe.withApplied.width <= narrowProbe.groupWidth * .85 + .5, "bubble never exceeds the narrowed 85% ceiling");
  metrics.narrow = { applied: narrowProbe.applied, natural: narrowProbe.natural.width, measured: narrowProbe.withApplied.width, groupWidth: narrowProbe.groupWidth };
  await open(B, "ub-answer");
  await page.waitForFunction(() => /px$/.test(document.querySelector('[data-transcript-item-id="ub-user"] .source-user-bubble')?.style.maxWidth ?? ""), null, { timeout: 4000 }).catch(() => {});
  const bProbe = await rewrapProbe("ub-user");
  assertNoRewrap(bProbe, "session B prose");
  assert.ok(bProbe.withApplied.width <= bProbe.groupWidth * .85 + .5);
  assert.equal(await page.locator('[data-transcript-item-id="ua-wrap-user"]').count(), 0);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324);
  await open(A, "ua-fence-answer");
  await page.waitForFunction(() => /px$/.test(document.querySelector('[data-transcript-item-id="ua-wrap-user"] .source-user-bubble')?.style.maxWidth ?? ""), null, { timeout: 4000 });
  const remountProbe = await rewrapProbe("ua-wrap-user");
  assertNoRewrap(remountProbe, "remounted prose");
  near(remountProbe.withApplied.width, wrapProbe.withApplied.width, "remount at the original width reproduces the measurement", 1);
  assert.equal(await row("ua-wrap-user").locator(".sua-toolbar").count(), 0, "a remounted session starts deferred again");
  metrics.remount = { applied: remountProbe.applied, measured: remountProbe.withApplied.width };
  checks.push("Narrowing re-measures within the new ceiling; switching sessions and remounting reproduces the original measurement with no residual inline width");

  // 9. Reduced motion removes the reveal transition.
  await bubble("ua-short-user").hover();
  await row("ua-short-user").locator(".sua-toolbar").waitFor();
  // design-system.css:51631-51640: transition-property none + scale none under the OS query and the in-app
  // html[data-reduce-motion=true]; the declared duration stays (the :1423-1438 clamp only shortens animations).
  const reducedToolbar = () => row("ua-short-user").locator(".sua-toolbar").evaluate(node => { const style = getComputedStyle(node);
    return { property: style.transitionProperty, scale: style.scale, opacity: style.opacity }; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  metrics.reducedMotion = { media: await reducedToolbar() };
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { document.documentElement.dataset.reduceMotion = "true"; });
  metrics.reducedMotion.attribute = await reducedToolbar();
  await page.evaluate(() => { delete document.documentElement.dataset.reduceMotion; });
  for (const [source, state] of Object.entries(metrics.reducedMotion))
    assert.deepEqual(state, { property: "none", scale: "none", opacity: "1" }, `${source} reduce turns the reveal transition off`);
  checks.push("Reduced motion (OS query or in-app attribute) sets the toolbar's transition-property to none");
  await page.mouse.move(100, 700);
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await restoreWrite().catch(() => {});
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.uaClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.uaClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "user-actions-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "user-actions-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
