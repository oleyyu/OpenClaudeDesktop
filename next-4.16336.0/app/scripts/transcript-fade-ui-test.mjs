import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { classifyMode, compareFadeLayout, comparisonKind, fadeLayoutMode, probeIssues, probeScrollbarMode } from "./scrollbar-mode-gate.mjs";

// Works from work/transcript-fade-0.2.8 or app/scripts. Run serially, never
// against a production profile. FADE_BASELINE=1 records the same fixtures on
// 0.2.7 without requiring strips; FADE_BASELINE_REPORT overrides the canonical
// frozen 0.2.7 report path. The baseline comparison is gated on the scrollbar
// mode of both reports (scrollbar-mode-gate.mjs); the OS preference is only read.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const baseline = process.env.FADE_BASELINE === "1";
const expectedFile = process.env.TEST_EXPECT_BUILD || path.join(root, "dist/build-info.json");
const sourceRoot = process.env.TEST_SOURCE_ROOT || root;
const appPath = process.env.TEST_APP_PATH ? path.resolve(process.env.TEST_APP_PATH) : null;
const executablePath = appPath ? path.join(appPath, "Contents/MacOS/OpenClaude Desktop")
  : process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const fixture = path.join(root, "tests/fixtures/codex-server.cjs");
const evidenceRoot = process.env.FADE_EVIDENCE_DIR || path.join(project, "analysis/batch-20260920");
const baselineReport = path.resolve(process.env.FADE_BASELINE_REPORT || path.join(project, "analysis/batch-20260920/transcript-fade-baseline-report.json"));
await fs.mkdir(evidenceRoot, { recursive: true });
const directory = await fs.mkdtemp(path.join(evidenceRoot, baseline ? "fade-baseline-" : "fade-ui-"));
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
await fs.writeFile(path.join(workspace, "fixture.txt"), "Isolated fade fixture.\n");
const LONG = "fade-long", SHORT = "fade-short", EMPTY = "fade-empty", EMPTY_AGENT = "fade-empty-agent", CODE = "fade-code";
const codeText = Array.from({ length: 100 }, (_, i) => `const sourceLine${i} = ${i}; // fade fixture`).join("\n");
const agent = (id, text) => ({ id, type: "agentMessage", text });
const user = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const history = (i) => ({ id: `fade-turn-${i}`, status: "completed", items: [
  user(`fade-${i}-user`, `Isolated prompt ${i}.`),
  agent(`fade-${i}-a`, `Reading item ${i}. A real Markdown paragraph wraps naturally when a side pane narrows the conversation.\n\nThe second paragraph retains a stable item identity while the window resizes.`),
  agent(`fade-${i}-b`, `Second assistant item ${i}, to retain a real ten-pixel within-turn gap.`),
] });
const longTurns = [
  ...Array.from({ length: 7 }, (_, i) => history(i)),
  { id: "fade-code-turn", status: "completed", items: [user("fade-code-user", "Inspect this code."), agent(CODE, "```js\n" + codeText + "\n```")] },
  ...Array.from({ length: 7 }, (_, i) => history(i + 7)),
];
const shortTurns = [{ id: "fade-short-turn", status: "completed", items: [agent("fade-short-answer", "Short answer.")] }];
const emptyAgentTurns = [{ id: "fade-empty-turn", status: "completed", items: [agent("fade-empty-answer", "")] }];
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const fixtureDefinitionSha256 = digest(JSON.stringify({ longTurns, shortTurns, emptyAgentTurns, emptyTurns: [] }));
const now = Math.floor(Date.now() / 1000);
const thread = (id, name, turns) => ({ id, name, turns, cwd: workspace, createdAt: now, updatedAt: now, archived: false });
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", threadIds: [LONG, SHORT, EMPTY, EMPTY_AGENT], sidebarWidth: 288,
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [LONG]: thread(LONG, "Fade long fixture", longTurns),
  [SHORT]: { ...thread(SHORT, "Fade short fixture", shortTurns), resumeDelayMs: 350 },
  [EMPTY]: thread(EMPTY, "Fade empty fixture", []),
  [EMPTY_AGENT]: thread(EMPTY_AGENT, "Fade empty agent", emptyAgentTurns),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: fixture };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CODE_DESKTOP_DEV_URL;
const checks = [], metrics = { layouts: {}, opacity: [], screenshotsAt: [] }, screenshots = [], rendererErrors = [], cleanupErrors = [];
const startedAt = new Date().toISOString();
let app, page, build, runtime, failure, testSourceHashes, asarHash, clipboardSaved = false, clipboardRestored = false, profileRemoved = false, safeToRemoveProfile = true;
const near = (actual, expected, label, tolerance = 1) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${label}: expected ${expected}, got ${actual}`);
async function within(promise, label, milliseconds = 10000) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds); })]); }
  finally { clearTimeout(timer); }
}
async function ownedChildExit(child, milliseconds) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise(resolve => {
    const done = exited => { clearTimeout(timer); child.off("exit", onExit); resolve(exited); };
    const onExit = () => done(true);
    const timer = setTimeout(() => done(false), milliseconds);
    child.once("exit", onExit);
  });
}
async function verifyBuild() {
  if (appPath) {
    const currentHash = digest(await fs.readFile(path.join(appPath, "Contents/Resources/app.asar")));
    if (asarHash) assert.equal(currentHash, asarHash, "Actual installed ASAR changed during the test");
    else asarHash = currentHash;
  }
  assert.ok(build?.sources?.length, "Fresh build must identify its source files");
  assert.equal(digest(JSON.stringify(build.sources)), build.sourceSha256);
  const current = JSON.parse(await fs.readFile(expectedFile, "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during the test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during the test");
  assert.equal(JSON.parse(await fs.readFile(path.join(sourceRoot, "package.json"), "utf8")).version, build.version);
  for (const entry of build.sources) assert.equal(digest(await fs.readFile(path.join(sourceRoot, entry.path))), entry.sha256, `Stale source: ${entry.path}`);
  for (const name of ["src/source-transcript.jsx", "src/source-transcript.css", "src/use-transcript-scroll.js", "src/style.css", "src/source-code-block.css"])
    assert.ok(build.sources.some(entry => entry.path === name), `Build omits ${name}`);
  const hashes = { script: digest(await fs.readFile(import.meta.filename)), fixture: digest(await fs.readFile(fixture)),
    gate: digest(await fs.readFile(path.join(import.meta.dirname, "scrollbar-mode-gate.mjs"))) };
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Harness changed during the run");
  else testSourceHashes = hashes;
}
async function frames(count = 4) {
  await within(page.evaluate(count => new Promise(resolve => {
    function next() { if (--count <= 0) resolve(); else requestAnimationFrame(next); }
    requestAnimationFrame(next);
  }), count), "Animation frames", 2500);
}
async function capture() { return page.evaluate(captureTranscriptFadeMetrics, { maxItems: 24 }); }
async function shot(name) {
  const file = path.join(directory, `${name}.png`);
  await within(page.screenshot({ path: file, timeout: 4000 }), "Screenshot", 4500);
  screenshots.push(file);
  metrics.screenshotsAt.push({ name, file, state: await scrollState() });
}
async function size(width, height = 852) {
  await within(app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value.width, value.height), { width, height }), "Resize window");
  await page.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, { width, height });
  await frames();
}
async function open(id) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(`[data-transcript-item-id="${id === LONG ? "fade-0-user" : "fade-short-answer"}"]`).waitFor({ state: "attached" });
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await frames();
}
async function scrollState() {
  return page.locator(".transcript").evaluate(viewport => {
    const box = viewport.getBoundingClientRect();
    const first = [...viewport.querySelectorAll("[data-transcript-item-id]")].find(node => {
      const r = node.getBoundingClientRect(); return r.height > 0 && r.bottom > box.top && r.top < box.bottom;
    });
    return { top: viewport.scrollTop, extent: viewport.scrollHeight, height: viewport.clientHeight,
      remaining: viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      following: viewport.closest(".source-transcript-frame").dataset.following,
      anchor: first?.dataset.transcriptItemId, offset: first ? first.getBoundingClientRect().top - box.top : null };
  });
}
async function stableScroll() {
  await within(page.evaluate(() => new Promise((resolve, reject) => {
    const deadline = performance.now() + 2000;
    let prior, same = 0;
    function sample() {
      const top = document.querySelector(".transcript").scrollTop;
      same = prior !== undefined && Math.abs(prior - top) < .1 ? same + 1 : 0;
      prior = top;
      if (same >= 5) resolve();
      else if (performance.now() >= deadline) reject(new Error("Scroll did not settle"));
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  })), "Scroll settling", 2500);
}
async function wheelUp() {
  const box = await page.locator(".transcript").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -650);
  await page.waitForFunction(() => document.querySelector(".source-transcript-frame")?.dataset.following === "false");
  await stableScroll();
}
async function setPosition(value) {
  if ((await scrollState()).following === "true") await wheelUp();
  await page.locator(".transcript").evaluate((viewport, value) => {
    viewport.scrollTop = value.top ?? Math.max(0, viewport.scrollHeight - viewport.clientHeight - value.remaining);
  }, value);
  await stableScroll();
}
async function readRow(id) {
  if ((await scrollState()).following === "true") await wheelUp();
  await page.locator(".transcript").evaluate((viewport, id) => {
    const row = [...viewport.querySelectorAll("[data-transcript-item-id]")].find(node => node.dataset.transcriptItemId === id);
    if (!row) throw new Error("Missing fixture row " + id);
    viewport.scrollTop += row.getBoundingClientRect().top - viewport.getBoundingClientRect().top + 9;
  }, id);
  await stableScroll();
  return scrollState();
}
async function sameAnchor(before, label) {
  const after = await scrollState();
  assert.equal(after.following, "false", `${label}: following`);
  assert.equal(after.anchor, before.anchor, `${label}: anchor identity`);
  near(after.offset, before.offset, `${label}: offset`, 3);
  return after;
}
async function tail(requireRunning = false) {
  await page.waitForFunction(requireRunning => {
    const viewport = document.querySelector(".transcript");
    return viewport?.closest(".source-transcript-frame")?.dataset.following === "true"
      && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 2
      && (!requireRunning || !!document.querySelector('[data-testid="code-prompt-stop"]:not([inert] *)'));
  }, requireRunning);
  await frames(2);
}
async function openFiles() {
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).click();
  await page.getByRole("complementary", { name: "Files panel" }).waitFor();
  await frames();
}
async function closeFiles() {
  await page.locator(".source-side-tile").getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
  await frames();
}
async function paneWidth(width) {
// 0.2.14 tile engine: separators are labelled "Resize {i} and {i+1}" (2.2553.1 Mh aria-label).
  const divider = page.getByRole("separator", { name: /^Resize Chat and / });
  await divider.focus(); await page.keyboard.press("Home"); await frames();
  const actual = await page.locator(".source-chat-tile").evaluate(node => node.getBoundingClientRect().width);
  if (Math.abs(width - actual) > .5) {
    const box = await divider.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + width - actual, y, { steps: 5 }); await page.mouse.up(); await frames();
  }
  near(await page.locator(".source-chat-tile").evaluate(node => node.getBoundingClientRect().width), width, "Actual resized chat tile", 1.5);
}
function readAppleShowScrollBars() {
  try { return execFileSync("defaults", ["read", "-g", "AppleShowScrollBars"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return /Could not find key|does not exist/i.test(String(error.stderr || error.message)) ? "unset/Automatic" : `unreadable: ${error.message || error}`; }
}
async function scrollbarMode() {
  // Official runtime probe order (c360a9e1c-GPs-MV9u.js:8593-8606): the feed's
  // own reserved width first, then a hidden both-edges probe. Read-only OS value.
  const probe = await page.evaluate(probeScrollbarMode);
  metrics.scrollbarMode = { mode: classifyMode(probe.feedReserved), ...probe, electron: runtime.electron, chrome: runtime.chrome, appleShowScrollBars: readAppleShowScrollBars() };
  assert.deepEqual(probeIssues(probe), [], "Scrollbar probe consistency");
  assert.equal(probe.probesRemaining, 0, "Probe nodes removed");
  return metrics.scrollbarMode;
}
async function layout(label) {
  const value = await capture(); metrics.layouts[label] = value;
  if (baseline) return value;
  assert.ok(value.supportsTimeline, "Target Electron must support the source scroll timeline");
  near(value.viewport.padding.left, 0, "Viewport start padding", .05);
  near(value.viewport.padding.right, 0, "Viewport end padding", .05);
  const expected = value.window.width <= 780 ? value.viewport.clientWidth - 40 : Math.min(768, value.viewport.clientWidth - 64);
  near(value.sizer.innerWidth, expected, `${label}: source/default or retained narrow column`, .25);
  assert.ok(value.viewport.scrollWidth <= value.viewport.clientWidth + 1, `${label}: no horizontal overflow`);
  // Both-edges symmetry (scroll-messages-current.js:63963): the sizer starts
  // and ends half the reserved gutters inside the scrollport in either mode.
  near(value.viewport.reservedInlineGutters, metrics.scrollbarMode.feedReserved, `${label}: same reserved gutters as the probe`, .5);
  near(value.sizer.rect.left - value.viewport.rect.left, value.viewport.reservedInlineGutters / 2, `${label}: both-edges start symmetry`, .5);
  near(value.viewport.rect.right - value.sizer.rect.right, value.viewport.reservedInlineGutters / 2, `${label}: both-edges end symmetry`, .5);
  assert.equal(value.viewport.scrollbarGutter, "stable both-edges", `${label}: feed scrollbar-gutter`);
  assert.equal(value.viewport.scrollbarWidth, "thin", `${label}: feed scrollbar-width`);
  for (const [side, height] of [["top", 32], ["bottom", 48]]) {
    const strip = value.strips[side]; assert.ok(strip, `${side} strip exists`);
    assert.equal(strip.directViewportChild, true); assert.equal(strip.ariaHidden, "true");
    assert.equal(strip.position, "sticky"); assert.equal(strip.pointerEvents, "none"); assert.equal(strip.zIndex, "1");
    assert.equal(strip.hasItemMarker, false); assert.equal(strip.text, ""); assert.equal(strip.childCount, 0); assert.ok(strip.tabIndex < 0);
    near(strip.height, height, `${side} strip height`, .05);
    near(side === "top" ? strip.marginBottom : strip.marginTop, -height, `${side} zero net block contribution`, .05);
    near(strip.rect.width, value.viewport.clientWidth, `${side} spans usable scrollport`, 1);
    near(strip.rect.left, value.sizer.rect.left, `${side} starts with full-width sizer`, .5);
  }
  near(value.sizer.rect.contentTop, 0, `${label}: strips do not displace sizer`, 1);
  const first = value.items[0];
  near(value.sizer.padding.top, 48, `${label}: ordinary Code top reserve`, .05);
  near(value.sizer.padding.bottom, 48, `${label}: ordinary Code bottom reserve`, .05);
  near(first.marginTop, 0, `${label}: no duplicate first-message margin`, .05);
  near(first.rect.contentTop, 48, `${label}: source top reserve, without an extra fade32 gap`, 1);
  const withinTurn = value.items.find(item => item.id === "fade-0-b");
  if (withinTurn) near(withinTurn.marginTop, 10, "Within-turn gap remains10", .05);
  const footer = value.items.find(item => item.footerTurn === "fade-turn-0");
  if (footer) { near(footer.marginTop, 8, "Footer body gap remains8", .05); near(footer.marginBottom, 10, "Footer trailing margin remains10", .05); }
  const nextTurn = value.items.find(item => item.id === "fade-1-user");
  if (nextTurn) near(nextTurn.marginTop, 15, "Next turn gap remains15", .05);
  return value;
}
async function opacity(label, position, expectedTop, expectedBottom) {
  await setPosition(position);
  await page.waitForFunction(({ top, bottom }) => {
    const a = document.querySelector('[data-testid="transcript-fade-top"]'), b = document.querySelector('[data-testid="transcript-fade-bottom"]');
    return a && b && Math.abs(Number(getComputedStyle(a).opacity) - top) < .035 && Math.abs(Number(getComputedStyle(b).opacity) - bottom) < .035;
  }, { top: expectedTop, bottom: expectedBottom });
  const value = await capture();
  metrics.opacity.push({ label, requested: position, top: value.viewport.scrollTop, remaining: value.viewport.scrollHeight - value.viewport.clientHeight - value.viewport.scrollTop,
    topOpacity: value.strips.top.opacity, bottomOpacity: value.strips.bottom.opacity, diagnostic: value.frame.diagnosticFade });
}
async function saveClipboard() {
  metrics.clipboardApi = await within(app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async item => new ClipboardItem(Object.fromEntries(
        await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
      globalThis.fadeClipboardBackup = { kind: "items", items }; return "ClipboardItem[]";
    }
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") { const image = clipboard.readImage(); if (!image.isEmpty()) data.image = image; }
    if (typeof clipboard.readBookmark === "function") { const bookmark = clipboard.readBookmark(); if (bookmark.title) data.bookmark = bookmark.title; }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.fadeClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", data, empty };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  }), "Clipboard backup", 5000);
  clipboardSaved = true;
}

try {
  build = JSON.parse(await fs.readFile(expectedFile, "utf8")); await verifyBuild();
  app = await electron.launch({ executablePath, args: appPath ? [] : [root], env, timeout: 20000 });
  runtime = await within(app.evaluate(({ app }) => ({ version: app.getVersion(), appPath: app.getAppPath(), userData: app.getPath("userData"), electron: process.versions.electron, chrome: process.versions.chrome })), "Runtime identity");
  assert.equal(runtime.version, build.version); assert.equal(runtime.userData, profile);
  assert.equal(runtime.appPath, appPath ? path.join(appPath, "Contents/Resources/app.asar") : root);
  page = await app.firstWindow(); page.setDefaultTimeout(8000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  const actual = await page.evaluate(async () => (await fetch("./build-info.json")).json());
  assert.equal(actual.sourceSha256, build.sourceSha256); assert.equal(actual.builtAt, build.builtAt);
  await within(page.evaluate(() => document.fonts.ready), "Fonts", 5000);
  await size(1468);
  metrics.empty = [];
  for (const id of [EMPTY, EMPTY_AGENT]) {
    await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
    await page.locator(".loading-state").waitFor({ state: "detached" });
    await frames();
    const empty = await capture();
    assert.ok(empty.viewport.scrollHeight <= empty.viewport.clientHeight + 1, "Empty fixture must not gain scroll overflow from decorative border boxes");
    if (!baseline) { near(empty.strips.top.opacity, 0, "Empty top", .001); near(empty.strips.bottom.opacity, 0, "Empty bottom", .001); }
    metrics.empty.push({ id, ...empty });
  }
  await page.locator(`[data-source-session-id="${SHORT}"] .source-session-open`).click();
  await page.locator(".loading-state").waitFor();
  metrics.loadingOnly = await capture();
  assert.ok(metrics.loadingOnly.viewport.scrollHeight <= metrics.loadingOnly.viewport.clientHeight + 1, "Loading-only fixture has no overflow");
  if (!baseline) { near(metrics.loadingOnly.strips.top.opacity, 0, "Loading top", .001); near(metrics.loadingOnly.strips.bottom.opacity, 0, "Loading bottom", .001); }
  await page.locator('[data-transcript-item-id="fade-short-answer"]').waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await frames();
  metrics.short = await capture();
  assert.ok(metrics.short.viewport.scrollHeight <= metrics.short.viewport.clientHeight + 1, "Actual short fixture must have no overflow");
  if (!baseline) {
    near(metrics.short.strips.top.opacity, 0, "No-overflow top", .001);
    near(metrics.short.strips.bottom.opacity, 0, "No-overflow bottom", .001);
    const cdp = await within(page.context().newCDPSession(page), "Accessibility CDP session", 5000);
    try {
      metrics.accessibility = [];
      const { root: dom } = await within(cdp.send("DOM.getDocument"), "Accessibility document", 5000);
      for (const id of ["transcript-fade-top", "transcript-fade-bottom"]) {
        const { nodeId } = await within(cdp.send("DOM.querySelector", { nodeId: dom.nodeId, selector: `[data-testid="${id}"]` }), "Accessibility strip selector", 5000);
        const { node } = await within(cdp.send("DOM.describeNode", { nodeId }), "Accessibility strip node", 5000);
        const { nodes } = await within(cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false }), "Accessibility strip tree", 5000);
        const ax = nodes.find(value => value.backendDOMNodeId === node.backendNodeId);
        assert.ok(ax?.ignored, `${id} must be ignored by Chromium accessibility`);
        metrics.accessibility.push({ id, ignored: ax.ignored, ignoredReasons: ax.ignoredReasons });
      }
    } finally { await within(cdp.detach(), "Detach accessibility session", 5000); }
    await page.locator("form.sc-composer .sc-input").focus();
    assert.equal(await page.evaluate(() => {
      const before = document.activeElement;
      for (const node of document.querySelectorAll('[data-testid^="transcript-fade-"]')) node.focus();
      return document.activeElement === before;
    }), true, "Decorative strips cannot take focus from the composer");
  }
  checks.push(baseline ? "Baseline empty/empty-agent/loading-to-short fixtures have no overflow" : "Empty/empty-agent/loading-to-short content has zero final paint; both decorative strips are AX-ignored and cannot take focus");

  await open(LONG); await tail();
  assert.ok((await scrollState()).extent > (await scrollState()).height * 3);
  await scrollbarMode();
  await setPosition({ top: 500 }); await layout("wide-1468");
  await shot("wide-light");
  await size(1324, 768); await layout("default-1324");
  await size(780, 768); await layout("window-780");
  await size(781, 768); await layout("window-781");
  await size(1468); await openFiles();
  for (const width of [280, 419, 560]) { await paneWidth(width); await layout(`pane-${width}`); }
  await shot("narrow-pane"); await closeFiles();
  checks.push("Same real fixtures record wide/default/breakpoint/pane geometry; validation checks full-width strips, actual-gutter columns and source48 top/bottom reserve with unchanged10/15/8 interior spacing");

  const beforeHidden = await readRow("fade-8-a");
  await size(760); await openFiles();
  // 0.2.14 tile engine (2.2553.1 Sh overflowMin): below 588px the chat tile is a
  // 320px anchored shell, not a hidden compact chat.
  await page.waitForFunction(() => document.querySelector('[data-tile-id="chat"] .tiles-shell')?.getBoundingClientRect().width === 320);
  assert.ok((await page.locator(".transcript").evaluate(node => node.clientHeight)) > 0);
  await closeFiles(); await size(1468);
  await stableScroll();
  metrics.hiddenRestore = { before: beforeHidden, after: await sameAnchor(beforeHidden, "Narrow pane restoration") };
  await open(SHORT); await open(LONG); await stableScroll();
  metrics.sessionRestore = await sameAnchor(beforeHidden, "A to short B to A restoration");
  checks.push("Real compact Files hiding and session switching preserve the historical item anchor after reveal");

  if (!baseline) {
    await opacity("top", { top: 0 }, 0, 1);
    await opacity("top-half", { top: 16 }, .5, 1);
    await opacity("top-full", { top: 32 }, 1, 1);
    await opacity("middle", { top: 500 }, 1, 1);
    await opacity("bottom-half", { remaining: 24 }, 1, .5);
    await opacity("inside-old-eight-pixel-range", { remaining: 4 }, 1, 4 / 48);
    const small = metrics.opacity.at(-1);
    assert.ok(small.bottomOpacity > .02, "Near-bottom fade must not be suppressed by the8px diagnostic boolean");
    await opacity("bottom", { remaining: 0 }, 1, 0);
    checks.push("Actual scroll-driven opacity follows top32/bottom48 ranges, including a visible fade inside the old8px observer region");

    await readRow(CODE);
    await page.locator(".transcript").evaluate(viewport => {
      const code = viewport.querySelector('[data-transcript-item-id="fade-code"] .scb-block');
      viewport.scrollTop += code.getBoundingClientRect().top - viewport.getBoundingClientRect().top + 180;
    });
    await stableScroll();
    const code = page.locator('[data-transcript-item-id="fade-code"] .scb-block');
    metrics.passthrough = [];
    for (const edge of ["top", "bottom"]) {
      const point = await page.locator(".transcript").evaluate((viewport, edge) => {
        const r = viewport.getBoundingClientRect(), strip = viewport.querySelector(`[data-testid="transcript-fade-${edge}"]`);
        const x = r.x + r.width / 2, y = edge === "top" ? r.top + 5 : r.bottom - 5;
        const hit = document.elementFromPoint(x, y);
        globalThis.fadePointerHit = null;
        viewport.addEventListener("click", event => { globalThis.fadePointerHit = { trusted: event.isTrusted,
          strip: !!event.target.closest('[data-testid^="transcript-fade-"]'), item: event.target.closest("[data-transcript-item-id]")?.dataset.transcriptItemId }; }, { once: true, capture: true });
        return { x, y, containsHit: viewport.contains(hit), hitStrip: !!hit?.closest('[data-testid^="transcript-fade-"]'), opacity: Number(getComputedStyle(strip).opacity) };
      }, edge);
      assert.ok(point.containsHit && !point.hitStrip); near(point.opacity, 1, `${edge} pass-through tests painted strip`, .01);
      await page.mouse.click(point.x, point.y);
      const hit = await page.evaluate(() => globalThis.fadePointerHit);
      assert.ok(hit?.trusted && !hit.strip); assert.equal(hit.item, CODE);
      metrics.passthrough.push({ edge, point, hit });
    }
    metrics.stickyCopy = await code.locator(".scb-actions").evaluate(actions => {
      const viewport = actions.closest(".transcript").getBoundingClientRect(), r = actions.getBoundingClientRect();
      return { top: getComputedStyle(actions).top, offset: r.top - viewport.top, rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
    });
    assert.equal(metrics.stickyCopy.top, "37px"); near(metrics.stickyCopy.offset, 37, "Actual sticky Copy boundary", 1);
    await saveClipboard();
    const copy = code.getByRole("button", { name: "Copy code", exact: true });
    const copyBox = await copy.boundingBox();
    await page.mouse.click(copyBox.x + copyBox.width / 2, copyBox.y + copyBox.height / 2);
    await code.getByRole("button", { name: "Copied", exact: true }).waitFor();
    assert.equal(await within(app.evaluate(({ clipboard }) => clipboard.readText()), "Read real clipboard", 5000), codeText);
    checks.push("Painted top and bottom strips pass trusted clicks to real code text; sticky Copy sits37px below the scrollport and copies exact source text");
    await shot("code-light");

    const lightPaint = (await capture()).strips.top.backgroundImage;
    // The account menu has no appearance items (Claude parity): switch the theme preference.
    await page.evaluate((theme) => window.desktop.call("settings", { theme }), "dark");
    await page.waitForFunction(() => document.documentElement.dataset.mode === "dark");
    await frames();
    metrics.dark = await capture();
    assert.notEqual(metrics.dark.strips.top.backgroundImage, lightPaint);
    const rootSurface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cds-surface-1").trim());
    assert.equal(metrics.dark.strips.top.surface, rootSurface); assert.equal(metrics.dark.strips.bottom.surface, rootSurface);
    await shot("code-dark");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await opacity("reduced-motion-top-half", { top: 16 }, .5, 1);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    checks.push("Actual appearance switch updates gradient surface; reduced motion retains source scroll-driven rather than timed opacity");

    // The fixture streams 20 deltas on a 100 ms wall-clock timer (codex-server.cjs streamFixture, ~2 s), so under
    // parallel suite load the stream can finish before the reading snapshot settles (seen: +901px before reading,
    // +0 after). That only misses the scenario's precondition, so the turn is re-sent (at most 3 attempts); every
    // attempt still asserts following while streaming and the reading anchor after completion.
    const chunk03 = page.getByText(/SCROLL_CHUNK_03/, { exact: false });
    metrics.liveAttempts = [];
    const jumpChip = page.locator('[data-testid="jump-to-latest"][data-visible="true"]');
    for (let attempt = 1; ; attempt++) {
      // A retry after a stream that ended while following has no chip to press (already pinned at the tail).
      if (attempt === 1 || await jumpChip.count()) await jumpChip.click();
      await tail();
      const seen = await chunk03.count();
      await page.locator("form.sc-composer .sc-input").fill("fixture:scroll"); await page.locator("form.sc-composer .sc-input").press("Enter");
      await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor();
      await chunk03.nth(seen).waitFor();
      // tail(true), unless the stream already completed before following was seen at the tail while running: that
      // is the same missed precondition, so it also re-sends (a following regression never reaches 'tail' and fails).
      const live = await (await page.waitForFunction(() => {
        const viewport = document.querySelector(".transcript");
        if (!document.querySelector('[data-testid="code-prompt-stop"]:not([inert] *)')) return "done";
        return viewport?.closest(".source-transcript-frame")?.dataset.following === "true"
          && viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 2 && "tail";
      })).jsonValue();
      if (live === "done") {
        metrics.liveAttempts.push({ attempt, growth: null, streamEndedBeforeFollowing: true });
        assert.ok(attempt < 3, "Real protocol streaming was never observed following at the tail");
        await frames();
        continue;
      }
      await frames(2);
      metrics.liveFollowing = await scrollState();
      await wheelUp(); const reading = await scrollState();
      await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
      await frames();
      metrics.liveReading = { before: reading, after: await sameAnchor(reading, "Live deltas and tail completion") };
      metrics.liveAttempts.push({ attempt, growth: metrics.liveReading.after.extent - reading.extent });
      if (metrics.liveReading.after.extent > reading.extent + 100 || attempt === 3) break;
    }
    assert.ok(metrics.liveReading.after.extent > metrics.liveReading.before.extent + 100, "Meaningful protocol growth occurred after manual reading");
    await page.locator('[data-testid="jump-to-latest"][data-visible="true"]').click(); await tail();
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('[data-testid="transcript-fade-bottom"]')).opacity) < .01);
    await shot("stream-complete");
    checks.push("Real protocol streaming still follows, manual reading survives later deltas/completion, and explicit Jump resumes following with bottom fade0");
  }

  if (!baseline) {
    const bytes = await fs.readFile(baselineReport), previous = JSON.parse(bytes);
    assert.equal(previous.passed, true); assert.equal(previous.mode, "baseline");
    assert.equal(previous.fixtureDefinitionSha256, fixtureDefinitionSha256, "Baseline must contain exactly the same item text and identities");
    assert.equal(previous.build.version, "0.2.7", "Use the frozen pre-tail fixture baseline");
    // Mode gate (scrollbar-mode-gate.mjs). Same observed mode: the pre-gate
    // comparison unchanged (0.2.9 top +24 / tail +73; 0.2.14 +32 per ordinary
    // user article, USER_ROW_DELTA). Cross mode: layouts whose scrollports both
    // fit the 768 measure keep every box (the centered column does not move);
    // narrow layouts assert width == baseline - reserved gutters, x == baseline
    // + half of them, equal sizer/viewport padding, wrap-independent gaps and
    // the first-item top reserve, recording wrap-dependent heights and extents.
    const observedMode = metrics.scrollbarMode.mode;
    metrics.baselineComparison = { path: baselineReport, sha256: digest(bytes), build: previous.build, observedMode, layouts: [] };
    for (const [name, after] of Object.entries(metrics.layouts)) {
      const before = previous.metrics.layouts[name]; assert.ok(before, `Missing baseline layout ${name}`);
      const baselineMode = fadeLayoutMode(before);
      const kind = comparisonKind({ baselineMode, observedMode, windowWidth: after.window.width, baselineClientWidth: before.viewport.clientWidth, observedClientWidth: after.viewport.clientWidth });
      const gutterDelta = after.viewport.reservedInlineGutters - before.viewport.reservedInlineGutters;
      // 0.2.14 tile engine: the chat tile is an anchored shell with min-width 320
      // (2.2553.1 Sh overflowMin), so the frozen "pane-280" content column (chat
      // wrap 280) now measures 320: width algebra +40, x unchanged.
      // The shell part the neighbour covers is inset (tile-layout-model.mjs coveredWidth): the column shows the wrap
      // plus the 12px tile gap, so the algebra is +12 (was +40 while the column ran under the neighbour).
      const columnDelta = name === "pane-280" ? 12 : 0;
      const { failures, record } = compareFadeLayout(name, before, after, { kind, gutterDelta, columnDelta });
      assert.deepEqual(failures, [], `${name} ${kind} (${baselineMode} baseline vs ${observedMode} observed)`);
      metrics.baselineComparison.layouts.push({ ...record, baselineMode, observedMode, baselineClientWidth: before.viewport.clientWidth, observedClientWidth: after.viewport.clientWidth });
    }
    const layouts = metrics.baselineComparison.layouts, kinds = [...new Set(layouts.map(layout => layout.comparison))];
    const modes = [...new Set(layouts.map(layout => layout.baselineMode))].join("/");
    checks.push(`Captured 0.2.7 ${modes} baseline compared in observed ${observedMode} mode as ${layouts.map(layout => `${layout.name}=${layout.comparison}`).join(", ")}`
      + (kinds.length === 1 && kinds[0] === "same-mode-full" ? "; every assistant box preserved with documented top +24 / tail +73 plus +32 per user actions row"
        : "; width-invariant layouts keep every box, narrow layouts prove the gutter algebra with wrap-dependent heights recorded"));
  }
  metrics.observedScrollbarModes = [...new Set(Object.values(metrics.layouts).map(value => value.viewport.reservedInlineGutters > .5 ? "classic-reserved" : "zero-reserved/overlay"))];
  metrics.scrollbarModeLimit = metrics.observedScrollbarModes.length === 2 ? null : "Only the observed platform mode was exercised; no system scrollbar preferences or forced CSS were changed.";
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  if (page) await shot("failure").catch(error => cleanupErrors.push(`Screenshot: ${error.message}`));
} finally {
  if (app && clipboardSaved) {
    try {
      await within(app.evaluate(async ({ app, clipboard }, expectedProfile) => {
        if (app.getPath("userData") !== expectedProfile) throw new Error("Refusing clipboard cleanup in another profile");
        const saved = globalThis.fadeClipboardBackup;
        if (!saved) throw new Error("Missing clipboard backup");
        if (saved.kind === "items") { if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear(); }
        else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.fadeClipboardBackup;
      }, profile), "Clipboard restore", 5000);
      clipboardRestored = true;
    } catch (error) { failure ||= error; cleanupErrors.push(error.message); }
  }
  if (app) {
    try { await within(app.close(), "Close isolated app", 10000); }
    catch (error) {
      failure ||= error; cleanupErrors.push(error.message);
      const child = app.process();
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        if (!await ownedChildExit(child, 1000)) {
          child.kill("SIGKILL");
          safeToRemoveProfile = await ownedChildExit(child, 2000);
          if (!safeToRemoveProfile) cleanupErrors.push("Owned Electron exit was not confirmed; isolated profile was retained");
        }
      }
    }
  }
  if (build) await verifyBuild().catch(error => { failure ||= error; cleanupErrors.push(error.message); });
  if (safeToRemoveProfile) await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; cleanupErrors.push(error.message); });
  const report = { schemaVersion: 1, suite: "transcript-fade-ui", mode: baseline ? "baseline" : "validation", passed: !failure,
    startedAt, at: new Date().toISOString(), fixture: true, fixtureDefinitionSha256, testSourceHashes,
    build: build ? { version: build.version, sourceSha256: build.sourceSha256, builtAt: build.builtAt, verifiedSourceFiles: build.sources.length } : null,
    runtime, appPath, asarHash, executablePath, directory, screenshots, profile, profileRemoved, clipboardSaved, clipboardRestored,
    checks, metrics, rendererErrors, cleanupErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidenceRoot, baseline ? "transcript-fade-baseline-report.json" : appPath ? "transcript-fade-packaged-report.json" : "transcript-fade-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, mode: report.mode, build: report.build, checks, directory, screenshots, error: report.error }, null, 2));
}
if (failure) throw failure;

// The self-contained read-only metric collector is appended below so copying
// this script to app/scripts requires no scratch-directory runtime dependency.

// Read-only page.evaluate helper for pre/post built-Electron evidence.
// Importing this module performs no DOM access and starts no browser.
function captureTranscriptFadeMetrics({ selector = ".transcript", maxItems = 100 } = {}) {
  const viewport = document.querySelector(selector);
  if (!viewport) return { present: false };
  const frame = viewport.closest(".source-transcript-frame");
  const sizer = viewport.querySelector('[data-testid="transcript-sizer"]');
  const style = getComputedStyle(viewport);
  const box = viewport.getBoundingClientRect();
  const number = (value) => Number.parseFloat(value) || 0;
  const rect = (node) => {
    if (!node) return null;
    const value = node.getBoundingClientRect();
    return {
      x: value.x, y: value.y, width: value.width, height: value.height,
      left: value.left, right: value.right, top: value.top, bottom: value.bottom,
      contentTop: value.top - box.top + viewport.scrollTop,
    };
  };
  const padding = (node) => {
    if (!node) return null;
    const value = getComputedStyle(node);
    return {
      top: number(value.paddingTop), right: number(value.paddingRight),
      bottom: number(value.paddingBottom), left: number(value.paddingLeft),
    };
  };
  const sizerPadding = padding(sizer);
  const sizerStyle = sizer && getComputedStyle(sizer);
  const sizerBox = rect(sizer);
  const describeStrip = (node) => {
    if (!node) return null;
    const value = getComputedStyle(node);
    return {
      rect: rect(node), directViewportChild: node.parentElement === viewport,
      ariaHidden: node.getAttribute("aria-hidden"), tabIndex: node.tabIndex,
      hasItemMarker: node.hasAttribute("data-transcript-item-id"),
      text: node.textContent, childCount: node.childElementCount,
      position: value.position, opacity: number(value.opacity),
      height: number(value.height), marginTop: number(value.marginTop),
      marginBottom: number(value.marginBottom), top: value.top, bottom: value.bottom,
      pointerEvents: value.pointerEvents, zIndex: value.zIndex, maxWidth: value.maxWidth,
      backgroundImage: value.backgroundImage, animationTimeline: value.animationTimeline,
      animationRangeStart: value.animationRangeStart, animationRangeEnd: value.animationRangeEnd,
      raw: value.getPropertyValue("--cds-scroll-fade-strip-raw").trim(),
      active: value.getPropertyValue("--cds-scroll-fade-strip-active").trim(),
      surface: value.getPropertyValue("--cds-scroll-fade-strip-color").trim(),
    };
  };
  const children = sizer ? [...sizer.children] : [];
  const items = children.filter((node) => node.matches("[data-transcript-item-id],.stf-footer"));
  const limit = Math.max(1, Math.min(300, Number(maxItems) || 100));
  return {
    present: true, window: { width: innerWidth, height: innerHeight },
    mode: document.documentElement.dataset.mode,
    supportsTimeline: CSS.supports("animation-timeline: scroll()"),
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    frame: { rect: rect(frame), following: frame?.dataset.following, diagnosticFade: frame?.dataset.scrollFade },
    viewport: {
      rect: rect(viewport), padding: padding(viewport), scrollTop: viewport.scrollTop,
      clientWidth: viewport.clientWidth, clientHeight: viewport.clientHeight,
      scrollWidth: viewport.scrollWidth, scrollHeight: viewport.scrollHeight,
      reservedInlineGutters: viewport.offsetWidth - viewport.clientWidth
        - number(style.borderLeftWidth) - number(style.borderRightWidth),
      scrollbarGutter: style.scrollbarGutter, scrollbarWidth: style.scrollbarWidth,
      topFadeHeight: style.getPropertyValue("--epitaxy-top-fade-height").trim(),
    },
    sizer: {
      rect: sizerBox, padding: sizerPadding, display: sizerStyle?.display,
      innerWidth: sizerBox && sizerPadding ? sizerBox.width - sizerPadding.left - sizerPadding.right
        - number(sizerStyle.borderLeftWidth) - number(sizerStyle.borderRightWidth) : null,
      children: children.length, sentinel: rect(sizer?.querySelector('[data-testid="transcript-end-sentinel"]')),
    },
    strips: {
      top: describeStrip(viewport.querySelector('[data-testid="transcript-fade-top"]')),
      bottom: describeStrip(viewport.querySelector('[data-testid="transcript-fade-bottom"]')),
    },
    userItemCount: items.filter(node => node.classList.contains("source-user-message")).length,
    items: items.slice(0, limit).map((node, index) => {
      const value = getComputedStyle(node);
      const previous = index > 0 ? items[index - 1] : null;
      return {
        id: node.dataset.transcriptItemId ?? null, footerTurn: node.dataset.turnCopyId ?? null,
        user: node.classList.contains("source-user-message"),
        usersBefore: items.slice(0, index).filter(other => other.classList.contains("source-user-message")).length,
        rect: rect(node), marginTop: number(value.marginTop), marginBottom: number(value.marginBottom),
        previousGap: previous ? node.getBoundingClientRect().top - previous.getBoundingClientRect().bottom : null,
        classes: node.className,
      };
    }),
    status: [...viewport.querySelectorAll(".source-transcript-status,.sts-row,.sts-spark")].map(node => ({
      classes: node.getAttribute("class"), rect: rect(node),
      marginTop: getComputedStyle(node).marginTop, height: getComputedStyle(node).height,
      turnGap: getComputedStyle(node).getPropertyValue("--chat-turn-gap"),
      chatBody: getComputedStyle(node).getPropertyValue("--chat-body"),
    })),
    itemCount: items.length,
    tailItems: items.slice(-3).map(node => ({
      id: node.dataset.transcriptItemId ?? null, footerTurn: node.dataset.turnCopyId ?? null,
      user: node.classList.contains("source-user-message"),
      usersBefore: items.slice(0, items.indexOf(node)).filter(other => other.classList.contains("source-user-message")).length,
      rect: rect(node),
    })),
    codeActions: [...viewport.querySelectorAll(".scb-actions")].slice(0, 10).map((node) => ({
      rect: rect(node), top: getComputedStyle(node).top, position: getComputedStyle(node).position,
    })),
  };
}
