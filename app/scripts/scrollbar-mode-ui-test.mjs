import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { classifyMode, expectedColumnInner, paintIssues, probeIssues, probeScrollbarMode, probeScrollbarPaint } from "./scrollbar-mode-gate.mjs";

// Scrollbar-mode acceptance: the official runtime probe (feed reserved width,
// hidden both-edges probe), the design-system scrollbar paint inherited by
// every scroller, the clientWidth-based centered column with both-edges
// symmetry in every window/pane layout, composer/column alignment, the pane
// scrollers' stable both-edges gutters and the sidebar's measured lane
// compensation. Only the mode the machine is in is exercised; the OS
// preference is read, never changed. Isolated profile and protocol fixture;
// runs serially after a fresh build with no other GUI suite active.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `scrollbar-mode-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(path.join(workspace, "kept"), { recursive: true });
const git = (...args) => execFileSync("git", args, { cwd: workspace, env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" }, encoding: "utf8" });
git("init", "-b", "main"); git("config", "user.name", "Fixture"); git("config", "user.email", "fixture@example.invalid");
await fs.writeFile(path.join(workspace, "change.txt"), "original\n");
await fs.writeFile(path.join(workspace, "kept", "NeedleFile.txt"), Array.from({ length: 80 }, (_, i) => `preview line ${i}`).join("\n") + "\n");
await fs.writeFile(path.join(workspace, "kept", "OtherNeedle.txt"), "other\n");
git("add", "."); git("commit", "-m", "Fixture base");
await fs.writeFile(path.join(workspace, "change.txt"), "replacement\nsecond\n");
const LONG = "sm-long", FILLERS = Array.from({ length: 14 }, (_, i) => `sm-fill-${i}`);
const now = Math.floor(Date.now() / 1000);
const agent = (id, text) => ({ id, type: "agentMessage", text });
const user = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const history = i => ({ id: `sm-turn-${i}`, status: "completed", items: [
  user(`sm-${i}-user`, `Isolated prompt ${i}.`),
  agent(`sm-${i}-a`, `Reading item ${i}. A real Markdown paragraph wraps naturally when a side pane narrows the conversation.\n\nThe second paragraph retains a stable item identity while the window resizes.`),
  agent(`sm-${i}-b`, `Second assistant item ${i}, to retain a real within-turn gap.`),
] });
const thread = (id, name, turns, index = 0) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns });
await fs.writeFile(path.join(profile, "scrollbar-mode-fixture.marker"), "isolated-scrollbar-mode-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [LONG, ...FILLERS], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [LONG]: thread(LONG, "Scrollbar mode long fixture", Array.from({ length: 14 }, (_, i) => history(i))),
  ...Object.fromEntries(FILLERS.map((id, i) => [id, thread(id, `Filler session ${i}`, [{ id: `${id}-turn`, status: "completed", items: [agent(`${id}-answer`, "Filler.")] }], i + 1)])),
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = { layouts: {} }, rendererErrors = [], screenshots = [];
let app, page, build, failure, runtime, profileRemoved = false, testSourceHashes;
const testSources = ["scripts/scrollbar-mode-ui-test.mjs", "scripts/scrollbar-mode-gate.mjs", "tests/fixtures/codex-server.cjs"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/style.css", "src/source-transcript.css", "src/source-transcript.jsx", "src/source-sidebar.jsx", "src/source-sidebar.css",
    "src/source-session.css", "src/source-files-search.css", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test, gate or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
function readAppleShowScrollBars() {
  try { return execFileSync("defaults", ["read", "-g", "AppleShowScrollBars"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch (error) { return /Could not find key|does not exist/i.test(String(error.stderr || error.message)) ? "unset/Automatic" : `unreadable: ${error.message || error}`; }
}
async function frames(count = 4) {
  await page.evaluate(count => new Promise(resolve => { const step = () => --count ? requestAnimationFrame(step) : resolve(); requestAnimationFrame(step); }), count);
}
async function size(width, height = 852) {
  await app.evaluate(({ BrowserWindow }, value) => BrowserWindow.getAllWindows()[0].setContentSize(value.width, value.height), { width, height });
  await page.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, { width, height });
  await frames();
}
async function shot(name) { const file = path.join(directory, `${name}.png`); await page.screenshot({ path: file }); screenshots.push(file); }
const panel = () => page.getByRole("complementary", { name: "Files panel", exact: true });
async function openFiles() {
  if (await panel().isVisible()) return;
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).click();
  await panel().waitFor(); await frames();
}
async function closeFiles() {
  await page.locator(".source-side-tile").getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" }); await frames();
}
async function paneWidth(width) {
// 0.2.14 tile engine: separators are labelled "Resize {i} and {i+1}" (2.2553.1 Mh aria-label).
  const divider = page.getByRole("separator", { name: /^Resize Chat and / });
  await divider.focus(); await page.keyboard.press("Home"); await frames();
  const tile = () => page.locator(".source-chat-tile").evaluate(node => node.getBoundingClientRect().width);
  // Setup only: a real pointer drag, corrected up to three times if the
  // pointer lands off; the final width is still asserted within 1.5px.
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = await tile();
    if (Math.abs(width - actual) <= .5) break;
    const box = await divider.boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await frames(2); await page.mouse.down(); await page.mouse.move(x + width - actual, y, { steps: 8 }); await page.mouse.up(); await frames();
  }
  near(await tile(), width, "Actual resized chat tile", 1.5);
}
// Column geometry of the transcript scroller plus the composer, all from live
// boxes (no injected DOM).
async function capture() {
  return page.evaluate(() => {
    const number = value => Number.parseFloat(value) || 0;
    const rect = node => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, top: r.top, height: r.height }; };
    const viewport = document.querySelector(".transcript"), sizer = viewport.querySelector('[data-testid="transcript-sizer"]');
    const vs = getComputedStyle(viewport), ss = getComputedStyle(sizer), composer = document.querySelector(".composer-zone"), cs = composer && getComputedStyle(composer);
    const strips = Object.fromEntries(["top", "bottom"].map(edge => { const node = viewport.querySelector(`[data-testid="transcript-fade-${edge}"]`); return [edge, node ? rect(node) : null]; }));
    const sr = rect(sizer), inner = { left: sr.left + number(ss.paddingLeft) + number(ss.borderLeftWidth), right: sr.right - number(ss.paddingRight) - number(ss.borderRightWidth) };
    const cr = composer && rect(composer), content = composer && { left: cr.left + number(cs.paddingLeft) + number(cs.borderLeftWidth), right: cr.right - number(cs.paddingRight) - number(cs.borderRightWidth) };
    return {
      window: { width: innerWidth, height: innerHeight },
      viewport: { rect: rect(viewport), clientWidth: viewport.clientWidth, offsetWidth: viewport.offsetWidth, scrollWidth: viewport.scrollWidth,
        reservedInlineGutters: viewport.offsetWidth - viewport.clientWidth - number(vs.borderLeftWidth) - number(vs.borderRightWidth),
        scrollbarGutter: vs.scrollbarGutter, scrollbarWidth: vs.scrollbarWidth, scrollbarColor: vs.scrollbarColor, padding: { left: number(vs.paddingLeft), right: number(vs.paddingRight) } },
      sizer: { rect: sr, padding: { left: number(ss.paddingLeft), right: number(ss.paddingRight) }, inner: { ...inner, width: inner.right - inner.left, center: (inner.left + inner.right) / 2 } },
      strips,
      composer: composer ? { rect: cr, padding: { left: number(cs.paddingLeft), right: number(cs.paddingRight) }, content: { ...content, width: content.right - content.left, center: (content.left + content.right) / 2 }, maxWidth: cs.maxWidth } : null,
    };
  });
}
async function layout(name) {
  const value = await capture(); metrics.layouts[name] = value;
  const reserved = value.viewport.reservedInlineGutters, mode = metrics.scrollbarMode;
  near(reserved, mode.feedReserved, `${name}: reserved gutters match the probe`, .5);
  assert.equal(value.viewport.scrollbarGutter, "stable both-edges", `${name}: feed scrollbar-gutter`);
  assert.equal(value.viewport.scrollbarWidth, "thin", `${name}: feed scrollbar-width`);
  assert.equal(value.viewport.scrollbarColor, metrics.scrollbarPaint.html, `${name}: feed inherits the design-system scrollbar-color`);
  near(value.viewport.padding.left, 0, `${name}: viewport start padding`, .05); near(value.viewport.padding.right, 0, `${name}: viewport end padding`, .05);
  near(value.sizer.rect.left - value.viewport.rect.left, reserved / 2, `${name}: both-edges start symmetry`, .5);
  near(value.viewport.rect.right - value.sizer.rect.right, reserved / 2, `${name}: both-edges end symmetry`, .5);
  near(value.sizer.rect.width, value.viewport.clientWidth, `${name}: sizer spans the scrollport`, .5);
  near(value.sizer.inner.width, expectedColumnInner({ windowWidth: value.window.width, clientWidth: value.viewport.clientWidth }), `${name}: column inner width from clientWidth`, .25);
  assert.ok(value.viewport.scrollWidth <= value.viewport.clientWidth + 1, `${name}: no horizontal overflow`);
  for (const edge of ["top", "bottom"]) {
    assert.ok(value.strips[edge], `${name}: ${edge} strip exists`);
    near(value.strips[edge].width, value.viewport.clientWidth, `${name}: ${edge} strip spans usable scrollport`, 1);
    near(value.strips[edge].left, value.sizer.rect.left, `${name}: ${edge} strip starts with the sizer`, .5);
  }
  return value;
}
// A scroller's reserved gutters and the inset of its first child from its
// padding edge: both-edges means the child starts half the reserved width in.
async function scroller(selector) {
  return page.locator(selector).first().evaluate(node => {
    const number = value => Number.parseFloat(value) || 0;
    const style = getComputedStyle(node), r = node.getBoundingClientRect();
    const child = [...node.children].find(child => child.getBoundingClientRect().width > 0) ?? null;
    let cr = child?.getBoundingClientRect() ?? null, text = false;
    if (!child && node.firstChild) { const range = document.createRange(); range.selectNodeContents(node); cr = range.getBoundingClientRect(); text = cr.width > 0; if (!text) cr = null; }
    return { selector: node.className, scrollbarGutter: style.scrollbarGutter, scrollbarWidth: style.scrollbarWidth, scrollbarColor: style.scrollbarColor,
      reserved: node.offsetWidth - node.clientWidth - number(style.borderLeftWidth) - number(style.borderRightWidth),
      overflowing: node.scrollHeight > node.clientHeight + 1, paddingLeft: number(style.paddingLeft), paddingRight: number(style.paddingRight),
      childInset: cr ? cr.left - r.left - number(style.borderLeftWidth) - number(style.paddingLeft) : null,
      // Text content (a <pre>) does not span the content box; only element children prove the end lane.
      childRightInset: cr && !text ? r.right - cr.right - number(style.borderRightWidth) - number(style.paddingRight) : null, childWidth: cr?.width ?? null, textContent: text };
  });
}
function assertBothEdges(name, value) {
  const mode = metrics.scrollbarMode;
  assert.equal(value.scrollbarGutter, "stable both-edges", `${name}: scrollbar-gutter`);
  assert.equal(value.scrollbarWidth, "thin", `${name}: scrollbar-width (design-system thin global)`);
  assert.equal(value.scrollbarColor, metrics.scrollbarPaint.html, `${name}: inherits the design-system scrollbar-color (no local override)`);
  near(value.reserved, mode.probeBothEdges, `${name}: reserved gutters equal the both-edges probe`, .5);
  assert.ok(value.childInset !== null, `${name}: has a laid-out child`);
  near(value.childInset, mode.laneThin * (mode.mode === "classic" ? 1 : 0), `${name}: content starts one thin lane in`, .5);
  if (value.childRightInset !== null) near(value.childRightInset, value.childInset, `${name}: symmetric end lane`, .5);
}
async function sidebar() {
  return page.evaluate(() => {
    const nav = document.querySelector("nav.source-session-list"), body = nav.parentElement, style = getComputedStyle(nav);
    const r = node => node ? node.getBoundingClientRect() : null;
    const row = r(nav.querySelector(".source-session-open")), heading = r(nav.querySelector(".source-group-heading")), primary = r(document.querySelector(".source-sidebar-nav-row"));
    const routines = r(document.querySelector(".source-routines-label > button"));
    return { lane: body.style.getPropertyValue("--df-nav-scrollbar-lane"), measured: nav.offsetWidth - nav.clientWidth, scrollbarGutter: style.scrollbarGutter, scrollbarColor: style.scrollbarColor,
      marginRight: style.marginRight, paddingRight: style.paddingRight, overflowing: nav.scrollHeight > nav.clientHeight + 1,
      navRight: r(nav).right, bodyRight: r(body).right, rowRight: row?.right ?? null, rowLeft: row?.left ?? null, headingRight: heading?.right ?? null,
      primaryRight: primary?.right ?? null, primaryLeft: primary?.left ?? null, routinesRight: routines?.right ?? null, rows: nav.querySelectorAll(".source-session-open").length,
      sentinel: !!nav.querySelector(":scope > .source-session-list-lane-sentinel[aria-hidden=\"true\"]") };
  });
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env, timeout: 20000 });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), userData: app.getPath("userData"), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  assert.equal(runtime.userData, profile, "Runtime must use the isolated profile");
  page = await app.firstWindow(); page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  const served = await page.evaluate(async () => (await fetch("./build-info.json")).json());
  assert.equal(served.sourceSha256, build.sourceSha256, "Runtime must serve the verified build");
  await page.evaluate(() => document.fonts.ready);
  await size(1468);
  await page.locator(`[data-source-session-id="${LONG}"] .source-session-open`).click();
  await page.locator('[data-transcript-item-id="sm-0-user"]').waitFor({ state: "attached" });
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await frames(6);

  // 1. Official-order runtime probe and the design-system thin global.
  const probe = await page.evaluate(probeScrollbarMode);
  metrics.scrollbarMode = { mode: classifyMode(probe.feedReserved), ...probe, electron: runtime.electron, chrome: runtime.chrome, appleShowScrollBars: readAppleShowScrollBars() };
  assert.deepEqual(probeIssues(probe), [], "Probe consistency with the official feed-first order");
  assert.equal(probe.probesRemaining, 0, "Probe nodes are removed");
  assert.equal(probe.globalScrollbarWidth, "thin", "design-system.css:1263 global thin scrollbar-width");
  metrics.scrollbarMode.limit = "Only the observed platform mode was exercised; the OS scrollbar preference was read, not changed.";
  checks.push(`Observed ${metrics.scrollbarMode.mode} scrollbars: feed reserved ${probe.feedReserved} == both-edges probe ${probe.probeBothEdges}; thin lane ${probe.laneThin}, auto lane ${probe.laneAuto}; AppleShowScrollBars ${metrics.scrollbarMode.appleShowScrollBars}`);
  // design-system.css:1266-1268: one global scrollbar-color on html,[data-theme];
  // the feed and the nav inherit it (the pane scrollers are checked when open).
  const paint = await page.evaluate(probeScrollbarPaint, [".transcript", "nav.source-session-list"]);
  metrics.scrollbarPaint = paint;
  assert.deepEqual(paintIssues(paint, { scrollers: [".transcript", "nav.source-session-list"] }), [], "design-system scrollbar paint inherited by the feed and the nav");
  checks.push(`Scrollbar paint: html[data-theme=${paint.theme}] computes scrollbar-color ${paint.html} == hsla(var(--border-300) / 35%) transparent with --border-300 ${paint.borderToken}; feed and nav inherit it`);

  // 2. Seven layouts: clientWidth column, both-edges symmetry, strips.
  await layout("wide-1468");
  await size(1324, 768); await layout("default-1324");
  await size(780, 768); await layout("window-780");
  await size(781, 768); await layout("window-781");
  await size(1468); await openFiles();
  for (const width of [280, 419, 560]) { await paneWidth(width); await layout(`pane-${width}`); }
  await shot("narrow-pane");
  for (const name of ["wide-1468", "default-1324"]) {
    const value = metrics.layouts[name];
    near(value.sizer.inner.width, 768, `${name}: full measure`, .25);
    assert.ok(value.composer, `${name}: composer present`);
    near(value.composer.content.width, 768, `${name}: composer content box is the 768 measure`, .5);
    near(value.composer.content.center, value.sizer.inner.center, `${name}: composer content centered on the transcript column`, .5);
  }
  checks.push(`Seven real layouts keep the column at min(768, clientWidth-64) (or clientWidth-40 at <=780) centered by half the reserved gutters (${metrics.layouts["wide-1468"].viewport.reservedInlineGutters}px) with full-width strips; composer content box is 768 and centered on the column at 1468/1324`);

  // 3. Pane scrollers reserve stable both-edges gutters (pane still 560 wide).
  metrics.tree = await scroller('.sfs-kept-tree [role="tree"][aria-label="Project files"]'); assertBothEdges("tree", metrics.tree);
  const input = panel().getByRole("textbox", { name: "Filter files", exact: true });
  await input.fill("Needle");
  await panel().locator('.sfs-browser[data-search-phase="success"]').waitFor();
  await panel().locator(".sfs-result-row").first().waitFor();
  metrics.results = await scroller(".sfs-results"); assertBothEdges("search results", metrics.results);
  await input.fill(""); await panel().locator('.sfs-results[hidden]').waitFor({ state: "attached" });
  await panel().locator('[data-tree-row-body]:has(> [data-tree-primary][data-file-path="kept/NeedleFile.txt"])').waitFor().catch(() => {});
  const fileRow = panel().locator("[data-tree-row-body]").filter({ hasText: "NeedleFile.txt" }).first();
  if (await fileRow.count() === 0) { await panel().locator("[data-tree-row-body]").filter({ hasText: "kept" }).first().click(); }
  await panel().locator("[data-tree-row-body]").filter({ hasText: "NeedleFile.txt" }).first().click();
  await panel().locator(".source-file-preview").waitFor();
  await page.waitForFunction(() => document.querySelector(".source-file-preview")?.textContent.includes("preview line 79"));
  metrics.preview = await scroller(".source-file-preview"); assertBothEdges("file preview", metrics.preview);
  assert.ok(metrics.preview.overflowing, "preview fixture overflows vertically");
  await closeFiles();
  // R4i-gui GU1 (R4i-rail RL2): no band in rail mode; the rail Changes row's counts button (changes-row.mjs OLe,
  // "Open changes, {added} added, {removed} removed") opens the Changes pane (main.jsx sessionRailHost changes.onOpen).
  await page.locator('aside[aria-label="Session details"] nav[aria-label="Repository and pull request controls"] [data-rail-changes-row]').getByRole("button", { name: /^Open changes, / }).click();
  await page.locator(".source-diff").filter({ hasText: "+replacement" }).waitFor();
  metrics.changes = await scroller(".source-changes"); assertBothEdges("changes", metrics.changes);
  await shot("changes-pane");
  await page.locator(".source-side-tile").getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" }); await frames();
  checks.push("Tree, search results, file preview and changes scrollers compute stable both-edges gutters with content inset one thin lane on both sides (zero in overlay mode) and inherit the design-system scrollbar-color");

  // 4. Sidebar lane compensation: rows keep their right edge when the list
  //    starts overflowing; headers above the list align with the rows.
  await size(1468);
  const before = await sidebar();
  assert.equal(before.sentinel, true, "lane sentinel is the last aria-hidden child of the list");
  assert.equal(before.scrollbarGutter, "stable", "sidebar-rows.js:1337 stable gutter");
  assert.equal(before.marginRight, "-8px", "sidebar-rows.js:7980 -mr-2");
  // sidebar-rows.js:7902-7906 seeds the comparison with `|| "0px"` and only writes a changed value, so in overlay mode
  // (lane 0) the variable stays unset and every consumer falls back to var(--df-nav-scrollbar-lane, 0px).
  assert.equal(before.lane || "0px", `${before.measured}px`, "--df-nav-scrollbar-lane equals nav offsetWidth - clientWidth");
  near(before.measured, metrics.scrollbarMode.laneThin, "sidebar lane is the thin lane", .5);
  assert.equal(before.overflowing, false, "fifteen sessions fit at 852");
  assert.equal(before.rows, 15);
  near(before.headingRight, before.rowRight, "group heading right edge equals the row right edge", .5);
  near(before.primaryRight, before.rowRight, "primary navigation rows end where session rows end", .5);
  near(before.bodyRight - before.rowRight, Math.max(8, before.measured), "rows end max(8px, lane) from the sidebar edge", .5);
  await size(1468, 580);
  const after = await sidebar();
  assert.equal(after.overflowing, true, "the list overflows at 580");
  near(after.rowRight, before.rowRight, "row right edge does not shift when the list overflows", .5);
  near(after.rowLeft, before.rowLeft, "row left edge does not shift when the list overflows", .5);
  near(after.headingRight, before.headingRight, "heading right edge is stable", .5);
  near(after.primaryRight, before.primaryRight, "primary row right edge is stable", .5);
  assert.equal(after.lane, before.lane);
  // sidebar-rows.js:7975-7982 has no scrollbar-color override, hovered or not.
  await page.locator("nav.source-session-list").hover({ position: { x: 40, y: 40 } }); await frames(2);
  const hovered = await page.locator("nav.source-session-list").evaluate(node => ({ hovering: node.matches(":hover"), scrollbarColor: getComputedStyle(node).scrollbarColor }));
  assert.equal(hovered.hovering, true, "nav is hovered for the paint read");
  assert.deepEqual(paintIssues(metrics.scrollbarPaint, { hovered: { "nav.source-session-list": hovered.scrollbarColor, "nav.source-session-list (overflowing)": after.scrollbarColor, "nav.source-session-list (fitting)": before.scrollbarColor } }), [], "nav keeps the inherited scrollbar-color while hovered and while overflowing");
  metrics.sidebar = { before, after, hovered };
  await shot("sidebar-overflow");
  await size(1468);
  checks.push(`Sidebar list reserves a stable ${before.measured}px lane absorbed by the 8px zone: row/heading/primary right edges identical before and after overflow; its thumb keeps the inherited scrollbar-color ${hovered.scrollbarColor} hovered, fitting and overflowing`);
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "scrollbar-mode-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, productionProfileUsed: false,
    directory, profile, profileRemoved, systemPreferenceChanged: false,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, screenshots, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "scrollbar-mode-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, build: report.build, scrollbarMode: metrics.scrollbarMode, checks, directory, error: report.error }, null, 2));
}
if (failure) throw failure;
