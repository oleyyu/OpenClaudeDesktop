import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Tile layout engine acceptance (2.2553.1 pane tiles): geometry, third-pane
// rule, drag handle, drop zones, live reorder, keyboard reorder/split,
// separators, narrow overflow shell, Fill/Tile, per-session + relaunch
// persistence, tree keyboard, popout window and reduced motion. Isolated
// profile + protocol fixture only; never a production session.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `pane-layout-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(path.join(workspace, "nested", "inner"), { recursive: true });
await fs.writeFile(path.join(workspace, "alpha.txt"), "ALPHA_KEPT_FILE\n");
await fs.writeFile(path.join(workspace, "beta.md"), "# BETA_PREVIEW_FILE\n");
await fs.writeFile(path.join(workspace, "gamma.txt"), "GAMMA_FILE\n");
await fs.writeFile(path.join(workspace, "nested", "deep.txt"), "NESTED_DEEP_FILE\n");
await fs.writeFile(path.join(workspace, "nested", "inner", "leaf.txt"), "NESTED_LEAF_FILE\n");
const git = (...args) => execFileSync("git", ["-C", workspace, ...args], { stdio: "pipe" });
git("init"); git("add", ".");
git("-c", "user.name=Pane fixture", "-c", "user.email=pane@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "isolated baseline");
await fs.writeFile(path.join(workspace, "alpha.txt"), "ALPHA_KEPT_FILE_CHANGED\n");
const A = "pane-layout-A", B = "pane-layout-B";
const now = Math.floor(Date.now() / 1000);
const thread = (id, name, index) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns: [] });
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [A, B], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: { [A]: thread(A, "Pane layout A", 0), [B]: thread(B, "Pane layout B", 1) } }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, profileRemoved = false;
const testSources = ["scripts/pane-layout-ui-test.mjs", "tests/fixtures/codex-server.cjs"];
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
  for (const required of ["src/source-tile-layout.jsx", "src/source-tile-layout.css", "src/tile-layout-model.mjs", "src/tile-drop-zones.mjs", "src/tile-layout-store.mjs",
    "src/source-pane-controls.jsx", "src/source-session.jsx", "src/main.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  assert.equal(build.sources.some(entry => entry.path === "src/source-pane-layout.jsx"), false, "The single-tile layout module must be gone");
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = 1) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const keyOf = node => node.kind === "tile" ? `T:${node.tileId}` : `S[${node.direction}](${node.children.map(keyOf).join(",")})`;
async function frames(count = 4) {
  await page.evaluate(count => new Promise(resolve => { const step = () => --count ? requestAnimationFrame(step) : resolve(); requestAnimationFrame(step); }), count);
}
async function layoutRoot() { return JSON.parse(await page.locator(".source-pane-layout").getAttribute("data-tile-layout")); }
async function layoutKey() { return keyOf(await layoutRoot()); }
async function waitLayout(key, label = key, timeout = 6000) {
  const deadline = Date.now() + timeout;
  let current = await layoutKey();
  while (current !== key && Date.now() < deadline) { await page.waitForTimeout(50); current = await layoutKey(); }
  assert.equal(current, key, `${label}: layout`);
}
async function launch() {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await size(1468, 852);
}
async function size(width, height = 852) {
  await app.evaluate(({ BrowserWindow }, s) => BrowserWindow.getAllWindows()[0].setContentSize(s.width, s.height), { width, height });
  await page.waitForFunction(s => innerWidth === s.width && innerHeight === s.height, { width, height });
  await frames();
}
async function open(id) {
  await page.locator(`[data-source-session-id="${id}"] .source-session-open`).click();
  await page.locator(":is(.st-title,button[data-pane-title])").waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await frames(4);
}
const pane = kind => page.locator(`.source-side-tile[data-tile-id="${kind}"]`);
const handle = kind => pane(kind).locator(".tiles-drag-handle");
const separators = () => page.locator(".tiles-handle");
async function menuToggle(label) {
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: label, exact: true }).click();
}
async function openFiles() { await menuToggle("Files"); await pane("files").waitFor(); await frames(); }
async function openPlan() { await menuToggle("Plan"); await pane("plan").waitFor(); await frames(); }
async function closePane(kind) {
  await pane(kind).getByRole("button", { name: "Close panel", exact: true }).click();
  await pane(kind).waitFor({ state: "detached" });
  await frames();
}
// The arrange popup hangs off the Expand/Collapse button (official sa): a
// right-click opens it without toggling Fill/Tile; picks are icon buttons.
const arrangeTrigger = kind => pane(kind).locator("[data-pane-arrange-trigger]");
// W14-code r4 closeout R4DC-REG-01: since fr3-07 the popup is the CDS Popover (c4db265df mt/bt Popup
// `className:"flex min-w-44 flex-col gap-xs"`), not a role=menu .spc-arrange; it is the popover holding the picks.
const ARRANGE_POPUP = '.min-w-44:has([data-pane-arrange="fill"])';
const arrangePopup = () => page.locator(ARRANGE_POPUP);
async function paneMenu(kind, item) {
  await arrangeTrigger(kind).click({ button: "right" });
  const menu = arrangePopup();
  await menu.waitFor();
  if (item === null) return menu;
  await menu.getByRole("button", { name: item, exact: true }).click();
  await menu.waitFor({ state: "detached" });
  await frames();
  return null;
}
async function rect(locator) { const box = await locator.boundingBox(); assert.ok(box, "element must be visible"); return box; }
async function dragHandle(kind, dx, dy, { steps = 8, before, cancel = false, release = true } = {}) {
  const box = await rect(handle(kind));
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps });
  await frames(2);
  if (before) await before({ x: x + dx, y: y + dy });
  if (cancel) { await page.keyboard.press("Escape"); await frames(2); }
  if (release) { await page.mouse.up(); await frames(3); }
}
async function sendPlan() {
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("fixture:plan");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.getByText("PLAN_FIXTURE_REPLY", { exact: true }).waitFor();
  await frames(4);
}
const tilesStore = () => page.evaluate(() => JSON.parse(localStorage.getItem("code-desktop-tiles") || "null"));

try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  await launch();
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  await open(A);

  // 1. Geometry: padding 8, gap 12 separator with 3x56 affordance, files at 3/5.
  assert.equal(await layoutKey(), "S[row](T:chat)");
  await openFiles();
  await waitLayout("S[row](T:chat,T:files)");
  metrics.geometry = await page.evaluate(() => {
    const host = document.querySelector(".source-pane-layout"), container = host.querySelector(".tiles-container");
    const css = getComputedStyle(container);
    const chat = host.querySelector('[data-tile-id="chat"]'), files = host.querySelector('[data-tile-id="files"]'), sep = host.querySelector(".tiles-handle");
    const aff = sep.querySelector(".tiles-handle-affordance");
    const r = node => node.getBoundingClientRect();
    const shell = files.querySelector(".tiles-shell");
    return { hostWidth: r(host).width, padding: [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft], chat: r(chat).width, files: r(files).width,
      separator: r(sep).width, gap: r(files).left - r(chat).right, affordance: { width: r(aff).width, height: r(aff).height, opacity: getComputedStyle(aff).opacity },
      sepAria: { orientation: sep.getAttribute("aria-orientation"), now: sep.getAttribute("aria-valuenow"), label: sep.getAttribute("aria-label") },
      radius: getComputedStyle(files).borderRadius, surface: getComputedStyle(files).backgroundColor, shadow: getComputedStyle(files).boxShadow,
      shellOverflow: getComputedStyle(shell).overflow, containerType: getComputedStyle(chat.querySelector(".tiles-shell")).containerType,
      headerTops: [document.querySelector(".st-inner"), document.querySelector(".source-pane-header")].map(node => Math.round(r(node).top)) };
  });
  assert.deepEqual(metrics.geometry.padding, ["8px", "8px", "8px", "8px"]);
  near(metrics.geometry.separator, 12, "separator hit area");
  near(metrics.geometry.gap, 12, "tile gap");
  near(metrics.geometry.affordance.width, 3, "affordance width", .1);
  near(metrics.geometry.affordance.height, 56, "affordance height", .1);
  assert.equal(metrics.geometry.affordance.opacity, "0");
  // The local container omits hh.tileContainer's 1px transparent border (see implementation.md).
  const available = metrics.geometry.hostWidth - 16 - 12;
  near(metrics.geometry.files, Math.round(available * 3 / 5), "files width = 3/5 of available", 1);
  near(metrics.geometry.chat + metrics.geometry.files, available, "chat + files fill the available width", 1);
  assert.deepEqual(metrics.geometry.sepAria, { orientation: "vertical", now: "40", label: "Resize Chat and Files" });
  assert.equal(metrics.geometry.radius, "10px");
  assert.notEqual(metrics.geometry.shadow, "none");
  assert.equal(metrics.geometry.containerType, "inline-size");
  assert.equal(metrics.geometry.headerTops[0], metrics.geometry.headerTops[1], "chat titlebar and pane header align");
  await closePane("files");
  await waitLayout("S[row](T:chat)");
  await sendPlan();
  await openPlan();
  await waitLayout("S[row](T:chat,T:plan)");
  const planRoot = await layoutRoot();
  assert.deepEqual(planRoot.children.map(child => child.flex), [2, 1], "plan initial 2:1");
  // R09 (panes-tile-current.js kp/Dp/Op/Mp): fixture:plan proposes a plan document (a Codex plan item) beside its
  // todos, so the Plan pane shows the document heading, then the Tasks section; "Copy plan" leads the trailing controls.
  metrics.planDocument = await pane("plan").evaluate(node => {
    const body = node.querySelector(".source-plan"), heading = body?.querySelector(".source-plan-document h1"), tasks = body?.querySelector(".source-plan-tasks h2");
    return { heading: heading?.textContent ?? null, tasksAfter: !!heading && !!tasks && !!(heading.compareDocumentPosition(tasks) & Node.DOCUMENT_POSITION_FOLLOWING),
      steps: body?.querySelectorAll(".source-plan-tasks li").length ?? 0, trailing: [...node.querySelectorAll(".source-pane-header .spc-controls button")].map(button => button.getAttribute("aria-label")) };
  });
  assert.deepEqual([metrics.planDocument.heading, metrics.planDocument.tasksAfter, metrics.planDocument.steps], ["Plan fixture heading", true, 3], "plan document heading, then Tasks");
  assert.equal(metrics.planDocument.trailing[0], "Copy plan", "Copy plan leads the Plan trailing controls");
  await closePane("plan");
  checks.push("Files opens at chat 2 : side 3 inside 8px padding with a 12px separator (3x56 affordance, aria 'Resize Chat and Files' = 40); Plan opens 2 : 1");

  // 2. Third pane: Plan stacks under Files; with chat last it appends.
  await openFiles();
  await openPlan();
  await waitLayout("S[row](T:chat,S[column](T:files,T:plan))");
  const stackedRoot = await layoutRoot();
  assert.deepEqual(stackedRoot.children[1].children.map(child => child.flex), [1, 1]);
  assert.equal(stackedRoot.children[1].flex, 3, "the column inherits the files flex");
  const columnSep = separators().nth(1);
  assert.equal(await columnSep.getAttribute("aria-orientation"), "horizontal");
  near((await rect(columnSep)).height, 12, "column separator height");
  await paneMenu("plan", "Move to right");
  await waitLayout("S[row](T:chat,T:files,T:plan)");
  await paneMenu("files", "Move to left");
  await waitLayout("S[row](T:files,T:chat,T:plan)");
  await closePane("plan");
  // Already at the edge: the pick is pressed and inert (official ra passes no
  // onClick while active), so the popup stays open and nothing moves.
  const edgeMenu = await paneMenu("files", null);
  const leftPick = edgeMenu.getByRole("button", { name: "Move to left", exact: true });
  assert.equal(await leftPick.getAttribute("aria-pressed"), "true", "Move to left is pressed while files sits at the left edge");
  await leftPick.click();
  await frames(2);
  assert.equal(await edgeMenu.count(), 1, "a pressed pick keeps the popup open");
  assert.equal(await layoutKey(), "S[row](T:files,T:chat)", "files already left");
  await page.keyboard.press("Escape"); await edgeMenu.waitFor({ state: "detached" });
  await closePane("files");
  await waitLayout("S[row](T:chat)");
  // chat-last append case: build row[files, chat] then open plan.
  await openFiles(); await paneMenu("files", "Move to left"); await waitLayout("S[row](T:files,T:chat)");
  assert.equal(await page.locator('[data-tile-id="chat"] .tiles-shell').getAttribute("data-tile-overflow-anchor"), "right", "chat anchored right when it is last");
  await openPlan();
  await waitLayout("S[row](T:files,T:chat,T:plan)", "append when chat is last");
  checks.push("Third pane stacks under a trailing non-chat tile (column flex 1/1 inheriting 3) and appends when chat is last; Move to left/right edges update the tree");

  // 3. Drag handle geometry/affordance and viewport state.
  await paneMenu("files", "Move to right"); await waitLayout("S[row](T:chat,T:plan,T:files)");
  await paneMenu("plan", "Move to right"); await waitLayout("S[row](T:chat,T:files,T:plan)");
  metrics.handle = await pane("plan").evaluate(node => {
    const header = node.querySelector(".source-pane-header"), button = node.querySelector(".tiles-drag-handle"), aff = button.querySelector(".tiles-drag-handle-affordance");
    const r = el => el.getBoundingClientRect();
    return { label: button.getAttribute("aria-label"), width: r(button).width, height: r(button).height, centerDelta: (r(button).left + r(button).width / 2) - (r(header).left + r(header).width / 2),
      top: r(button).top - r(header).top, affordance: { width: r(aff).width, height: r(aff).height, opacity: getComputedStyle(aff).opacity, radius: getComputedStyle(aff).borderRadius },
      describedBy: document.getElementById(button.getAttribute("aria-describedby"))?.textContent };
  });
  assert.equal(metrics.handle.label, "Move");
  near(metrics.handle.width, 44, "handle width", .5); near(metrics.handle.height, 16, "handle height", .5);
  near(metrics.handle.centerDelta, 0, "handle is horizontally centred in the header", 1);
  near(metrics.handle.top, 0, "handle sits at the header top", .5);
  near(metrics.handle.affordance.width, 32, "affordance width", .5); near(metrics.handle.affordance.height, 3, "affordance height", .5);
  assert.equal(metrics.handle.affordance.opacity, "0");
  assert.equal(metrics.handle.describedBy, "Arrow keys move the tile. Perpendicular arrows preview a split; press Enter to commit or Escape to cancel.");
  await handle("plan").hover();
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-tile-id="plan"] .tiles-drag-handle-affordance')).opacity === "1");
  await page.mouse.move(400, 700);
  await handle("plan").focus();
  await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-tile-id="plan"] .tiles-drag-handle-affordance')).opacity === "1");
  const focusVisible = await pane("plan").evaluate(node => {
    const button = node.querySelector(".tiles-drag-handle");
    return { matches: button.matches(":focus-visible"), opacity: getComputedStyle(button.querySelector(".tiles-drag-handle-affordance")).opacity };
  });
  assert.equal(focusVisible.matches, true); assert.equal(focusVisible.opacity, "1");
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cds-fill-accent").trim());
  const primary = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cds-fill-primary").trim());
  const toRgb = (value) => page.evaluate(value => { const probe = document.createElement("span"); probe.style.color = value; document.body.append(probe); const out = getComputedStyle(probe).color; probe.remove(); return out; }, value);
  metrics.tokens = { accent: await toRgb(accent), primary: await toRgb(primary) };
  await dragHandle("plan", 0, 60, { release: false, before: async () => {
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-tile-id="plan"] .tiles-drag-handle-affordance')).opacity === "1");
    metrics.dragging = await page.evaluate(() => {
      const host = document.querySelector(".source-pane-layout"), aff = document.querySelector('[data-tile-id="plan"] .tiles-drag-handle-affordance');
      const sep = document.querySelector(".tiles-handle");
      return { cls: host.className, cursor: getComputedStyle(host).cursor, handleCursor: getComputedStyle(document.querySelector(".source-pane-header")).cursor,
        affordance: getComputedStyle(aff).backgroundColor, opacity: getComputedStyle(aff).opacity, sepDisabled: sep.getAttribute("aria-disabled"), sepPointer: getComputedStyle(sep).pointerEvents, sepTab: sep.getAttribute("tabindex") };
    });
  } });
  await page.keyboard.press("Escape"); await page.mouse.up(); await frames(2);
  assert.ok(metrics.dragging.cls.includes("tiles-dragging"));
  assert.equal(metrics.dragging.cursor, "move"); assert.equal(metrics.dragging.handleCursor, "move");
  assert.equal(metrics.dragging.affordance, metrics.tokens.primary, "affordance uses --cds-fill-primary while dragging");
  assert.equal(metrics.dragging.opacity, "1");
  assert.deepEqual([metrics.dragging.sepDisabled, metrics.dragging.sepPointer, metrics.dragging.sepTab], ["true", "none", "-1"], "separators are disabled during a tile drag");
  assert.equal(await page.locator(".source-pane-layout.tiles-dragging").count(), 0, "drag state cleared");
  checks.push("Drag handle is a 44x16 'Move' button at the header centre with a 32x3 affordance (opacity 0 -> 1 on hover/focus-visible, fill-primary while dragging); viewport gets tiles-dragging/cursor move and separators disable");

  // 4. Drop zones: <16px no-op, wrap strip indicator on the files top edge, Escape restore, release commit.
  const before = await layoutKey();
  await dragHandle("plan", 10, 8);
  assert.equal(await layoutKey(), before, "sub-16px move changes nothing");
  assert.equal(await page.locator(".tiles-drop-indicator").count(), 0);
  const filesBox = await rect(pane("files"));
  const planHandle = await rect(handle("plan"));
  const toFilesTop = { dx: filesBox.x + filesBox.width / 2 - (planHandle.x + planHandle.width / 2), dy: filesBox.y + 10 - (planHandle.y + planHandle.height / 2) };
  await dragHandle("plan", toFilesTop.dx, toFilesTop.dy, { release: false, before: async () => {
    metrics.indicator = await pane("files").evaluate(node => {
      const bar = node.querySelector(".tiles-drop-indicator");
      if (!bar) return null;
      const r = bar.getBoundingClientRect(), tile = node.getBoundingClientRect();
      return { edge: bar.dataset.edge, height: r.height, width: r.width, top: tile.top - r.bottom, left: r.left - tile.left, color: getComputedStyle(bar).backgroundColor, radius: getComputedStyle(bar).borderRadius };
    });
  } });
  assert.ok(metrics.indicator, "an indicator shows on the files top strip");
  assert.equal(metrics.indicator.edge, "top");
  near(metrics.indicator.height, 3, "indicator thickness", .1);
  near(metrics.indicator.left, 0, "indicator spans from the tile left", .5);
  near(metrics.indicator.top, 3, "indicator sits 6px outset above the tile (gap/2)", .5);
  assert.equal(metrics.indicator.color, metrics.tokens.accent);
  assert.equal(metrics.indicator.radius, "999px");
  await page.mouse.up(); await frames(3);
  await waitLayout("S[row](T:chat,S[column](T:plan,T:files))", "top wrap strip commits a column over files");
  assert.equal(await page.locator(".tiles-drop-indicator").count(), 0);
  // Escape mid-drag restores the start layout (after a live reorder inside the column).
  const columnBefore = await layoutKey();
  const filesBox2 = await rect(pane("files"));
  const planHandle2 = await rect(handle("plan"));
  await dragHandle("plan", 0, filesBox2.y + filesBox2.height * .8 - (planHandle2.y + planHandle2.height / 2), { release: false, before: async () => {
    metrics.liveColumn = await layoutKey();
  } });
  assert.equal(metrics.liveColumn, "S[row](T:chat,S[column](T:files,T:plan))", "crossing the sibling midpoint reorders live inside the column");
  await page.keyboard.press("Escape"); await frames(2); await page.mouse.up(); await frames(2);
  assert.equal(await layoutKey(), columnBefore, "Escape restores the start layout");
  assert.equal(await page.locator(".tiles-drop-indicator").count(), 0);
  checks.push("Drop zones: sub-16px drags are no-ops, the 24px top strip shows a 3px accent indicator at 6px outset and commits row[chat, column[plan, files]], Escape mid-drag restores the start layout");

  // 5. Live reorder in a row, committed before pointerup.
  await paneMenu("plan", "Move to right"); await waitLayout("S[row](T:chat,T:files,T:plan)");
  const filesBox3 = await rect(pane("files"));
  const planHandle3 = await rect(handle("plan"));
  await dragHandle("plan", filesBox3.x + filesBox3.width * .3 - (planHandle3.x + planHandle3.width / 2), 200, { release: false, before: async () => {
    metrics.liveRow = { key: await layoutKey(), indicators: await page.locator(".tiles-drop-indicator").count() };
  } });
  assert.equal(metrics.liveRow.key, "S[row](T:chat,T:plan,T:files)", "layout JSON updates before pointerup");
  assert.equal(metrics.liveRow.indicators, 0, "live reorder shows no indicator");
  await page.mouse.up(); await frames(3);
  assert.equal(await layoutKey(), "S[row](T:chat,T:plan,T:files)", "pointerup with no pending target keeps the live order");
  checks.push("Dragging past a sibling midpoint reorders live (JSON updated before pointerup) and the release keeps that order");

  // 6. Keyboard reorder and split preview.
  await handle("plan").focus();
  await page.keyboard.press("ArrowLeft");
  await waitLayout("S[row](T:plan,T:chat,T:files)");
  await page.waitForFunction(() => document.querySelector("[data-tiles-status]")?.textContent === "Tile moved to position 1 of 3");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Move", "focus stays on the moved handle");
  await page.keyboard.press("End");
  await waitLayout("S[row](T:chat,T:files,T:plan)");
  await page.waitForFunction(() => document.querySelector("[data-tiles-status]")?.textContent === "Tile moved to position 3 of 3");
  await page.keyboard.press("ArrowUp");
  await frames(2);
  metrics.preview = await page.evaluate(() => {
    const handle = document.activeElement, bar = document.querySelector(".tiles-stack > .tiles-drop-indicator");
    const tooltip = [...document.querySelectorAll('[role="tooltip"]')].map(node => node.textContent).join("|");
    return { label: handle?.getAttribute("aria-label"), edge: bar?.dataset.edge, status: document.querySelector("[data-tiles-status]")?.textContent, tooltip };
  });
  assert.equal(metrics.preview.label, "Move up");
  assert.equal(metrics.preview.edge, "top", "perpendicular arrow previews a top-edge split of the row");
  assert.ok(metrics.preview.tooltip.includes("Move up"), `tooltip shows Move up (${metrics.preview.tooltip})`);
  assert.equal(metrics.preview.status, "Press Enter to move up, or Escape to cancel.");
  await page.keyboard.press("Escape"); await frames(2);
  assert.equal(await page.locator(".tiles-drop-indicator").count(), 0, "Escape cancels the preview");
  assert.equal(await layoutKey(), "S[row](T:chat,T:files,T:plan)");
  await page.keyboard.press("ArrowUp"); await frames(2); await page.keyboard.press("Enter");
  await waitLayout("S[column](T:plan,S[row](T:chat,T:files))", "Enter commits the column split");
  assert.equal(await page.locator(".tiles-drop-indicator").count(), 0);
  await handle("plan").focus(); await page.keyboard.press("ArrowDown"); await frames(1); await page.keyboard.press("Enter");
  await waitLayout("S[column](S[row](T:chat,T:files),T:plan)");
  await paneMenu("plan", "Move to right");
  await waitLayout("S[row](T:chat,T:files,T:plan)");
  checks.push("Keyboard: arrows along the row reorder with 'Tile moved to position n of 3' status and focus retained, Home/End reach the ends, perpendicular arrows preview a top/bottom split with 'Move up' label + tooltip, Enter commits, Escape cancels");

  // 7. Separator keyboard/pointer semantics.
  await closePane("plan"); await waitLayout("S[row](T:chat,T:files)");
  const sep = separators().first();
  const widths = async () => page.evaluate(() => ({ chat: document.querySelector('[data-tile-id="chat"]').getBoundingClientRect().width, files: document.querySelector('[data-tile-id="files"]').getBoundingClientRect().width }));
  const start = await widths();
  await sep.focus();
  await page.keyboard.press("ArrowRight"); await frames(2);
  near((await widths()).chat - start.chat, 24, "ArrowRight moves 24px");
  await page.keyboard.press("Shift+ArrowRight"); await frames(2);
  near((await widths()).chat - start.chat, 144, "Shift+ArrowRight moves 120px");
  const flexes = (await layoutRoot()).children.map(child => child.flex);
  assert.equal(await sep.getAttribute("aria-valuenow"), String(Math.round(flexes[0] / (flexes[0] + flexes[1]) * 100)), "aria-valuenow = round(left/(left+right)*100)");
  await page.keyboard.press("Home"); await frames(2);
  near((await widths()).chat, 320, "Home reaches the chat keyboard minimum (overflowMin 320)");
  await page.keyboard.press("End"); await frames(2);
  near((await widths()).files, 280, "End reaches the side tile 280 minimum");
  await page.keyboard.press("Enter"); await frames(2);
  const equal = await widths();
  near(equal.chat, equal.files, "Enter equalizes", 1.5);
  await sep.dblclick(); await frames(2);
  near((await widths()).chat, equal.chat, "double-click keeps the equalized split", 1.5);
  const sepBox = await rect(sep);
  // Pointer resize without keyboard focus: the official affordance order is hover < is-active < focus-visible.
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(sepBox.x + 6, sepBox.y + 200); await page.mouse.down(); await page.mouse.move(sepBox.x + 6 - 80, sepBox.y + 200, { steps: 6 }); await frames(2);
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".tiles-handle-affordance")).opacity === "1");
  metrics.resizing = await page.evaluate(() => { const aff = document.querySelector(".tiles-handle-affordance"); return { color: getComputedStyle(aff).backgroundColor, opacity: getComputedStyle(aff).opacity, cursor: getComputedStyle(document.querySelector(".tiles-handle")).cursor }; });
  assert.equal(metrics.resizing.color, metrics.tokens.primary, "active resize uses fill-primary");
  assert.equal(metrics.resizing.opacity, "1");
  await page.keyboard.press("Escape"); await page.mouse.up(); await frames(2);
  near((await widths()).chat, equal.chat, "Escape cancels the pointer resize", 1.5);
  await page.mouse.move(sepBox.x + 6, sepBox.y + 200); await page.mouse.down(); await page.mouse.move(sepBox.x + 6 - 100, sepBox.y + 200, { steps: 6 }); await page.mouse.up(); await frames(2);
  near((await widths()).chat, equal.chat - 100, "pointer drag commits", 1.5);
  await closePane("files"); await openFiles();
  near((await widths()).chat, equal.chat - 100, "the remembered ratio reopens the pane at the same split", 1.5);
  metrics.remembered = await tilesStore();
  assert.ok(metrics.remembered.lastPaneFlexByKind.files > 0, "lastPaneFlexByKind persisted");
  await sep.focus(); await page.keyboard.press("Enter"); await frames(2);
  // A tile arriving from another stack (Plan out of the Files column) makes the
  // root separator the insert target: full-length accent affordance. A tile
  // dragged inside its own row reorders live instead (rearrange zone).
  await openPlan(); await waitLayout("S[row](T:chat,S[column](T:files,T:plan))");
  const midSep = separators().first();
  const midBox = await rect(midSep);
  const planHandle4 = await rect(handle("plan"));
  await dragHandle("plan", midBox.x + midBox.width / 2 - (planHandle4.x + planHandle4.width / 2), 60, { release: false, before: async () => {
    metrics.sepTarget = await page.evaluate(() => {
      const target = document.querySelector(".tiles-handle[data-drop-target]");
      if (!target) return null;
      const aff = target.querySelector(".tiles-handle-affordance"), r = aff.getBoundingClientRect(), t = target.getBoundingClientRect();
      return { height: r.height, full: t.height, color: getComputedStyle(aff).backgroundColor, opacity: getComputedStyle(aff).opacity };
    });
  } });
  assert.ok(metrics.sepTarget, "the separator between chat and files becomes the drop target");
  near(metrics.sepTarget.height, metrics.sepTarget.full, "target affordance is 100% height", 1);
  assert.equal(metrics.sepTarget.color, metrics.tokens.accent);
  await page.mouse.up(); await frames(3);
  await waitLayout("S[row](T:chat,T:plan,T:files)", "dropping on the separator inserts between its flanks (the column collapses)");
  await closePane("plan");
  checks.push("Separator: aria-valuenow follows the flex ratio, 24/120px keys, Home 320 (chat overflowMin) / End 280 minima, Enter/double-click equalize, pointer drag with Escape cancel and fill-primary affordance, remembered ratio on reopen, full-height accent affordance while it is a drop target");

  // 8. Narrow host: chat remains an anchored 320px shell, side tile at 280.
  await sep.focus(); await page.keyboard.press("Enter"); await frames(2);
  await size(760, 852);
  metrics.narrow = await page.evaluate(() => {
    const host = document.querySelector(".source-pane-layout"), chat = document.querySelector('[data-tile-id="chat"]'), shell = chat.querySelector(".tiles-shell"), files = document.querySelector('[data-tile-id="files"]');
    const r = node => node.getBoundingClientRect();
    return { host: r(host).width, chatWrap: r(chat).width, shell: r(shell).width, shellMin: getComputedStyle(shell).minWidth, anchor: shell.dataset.tileOverflowAnchor, files: r(files).width,
      transcript: document.querySelector(".transcript")?.clientHeight ?? null, composer: !!document.querySelector('[data-cds="ChatComposerEditor"][role="textbox"]'), position: getComputedStyle(shell).position };
  });
  assert.ok(metrics.narrow.host < 588, `host is narrow (${metrics.narrow.host})`);
  assert.equal(metrics.narrow.anchor, "left");
  assert.equal(metrics.narrow.shellMin, "320px");
  near(metrics.narrow.shell, 320, "chat shell holds 320px", 1);
  near(metrics.narrow.files, 280, "side tile shrinks to its 280 minimum", 1);
  assert.ok(metrics.narrow.chatWrap < 320, "the chat wrap yields below 320 while the shell overflows");
  assert.ok(metrics.narrow.transcript > 0 && metrics.narrow.composer, "chat body stays rendered (no hidden compact mode)");
  assert.equal(metrics.narrow.position, "absolute");
  await size(1468, 852);
  checks.push("Below 588px the chat tile stays an absolutely anchored 320px shell (data-tile-overflow-anchor=left) under the 280px side tile instead of hiding");

  // 9. Fill / Tile, Cmd+Shift+\\, Move-to-edge active state.
  await openPlan(); await waitLayout("S[row](T:chat,S[column](T:files,T:plan))");
  const tiled = await layoutRoot();
  await paneMenu("plan", "Fill");
  await waitLayout("S[row](T:plan)");
  metrics.fill = await page.evaluate(() => {
    const host = document.querySelector(".source-pane-layout"), plan = document.querySelector('[data-tile-id="plan"]');
    return { hostWidth: host.getBoundingClientRect().width, planWidth: plan.getBoundingClientRect().width, chat: !!document.querySelector('[data-tile-id="chat"]'), files: !!document.querySelector('[data-tile-id="files"]'),
      collapse: !!plan.querySelector('button[aria-label="Collapse"]'), expand: !!plan.querySelector('button[aria-label="Expand"]') };
  });
  near(metrics.fill.planWidth, metrics.fill.hostWidth - 16, "Fill renders the pane at full host width (8px padding)", 1);
  assert.equal(metrics.fill.chat, false); assert.equal(metrics.fill.files, false);
  assert.equal(metrics.fill.collapse, true); assert.equal(metrics.fill.expand, false);
  const fillMenu = await paneMenu("plan", null);
  metrics.arrange = await fillMenu.evaluate(node => ({
    name: document.querySelector("[data-pane-arrange-trigger][data-popup-open]")?.getAttribute("aria-label") ?? null,
    minWidth: getComputedStyle(node).minWidth, width: node.getBoundingClientRect().width,
    // c4db265df q: each group is `div[role=presentation]` (the label) followed by `div.flex.px-1 > CdsButtonGroup`.
    groups: [...node.querySelectorAll('[role="presentation"]')].map(label => ({ label: label.textContent, picks: [...(label.nextElementSibling?.querySelectorAll("button") ?? [])].map(button => button.getAttribute("aria-label")) })),
    popout: node.querySelector("[data-pane-popout] span.truncate")?.textContent ?? null,
    popoutGlyph: node.querySelector("[data-pane-popout] [data-cds=Icon]")?.textContent.codePointAt(0) ?? null, separators: node.querySelectorAll('[role="separator"]').length,
  }));
  assert.equal(metrics.arrange.name, "Collapse", "the popup hangs off its Expand/Collapse trigger");
  assert.equal(metrics.arrange.minWidth, "176px"); assert.ok(metrics.arrange.width >= 176);
  assert.deepEqual(metrics.arrange.groups, [
    { label: "Move", picks: ["Move to left", "Move to right", "Move to top", "Move to bottom"] },
    { label: "Fill and arrange", picks: ["Fill", "Tile"] },
  ], "Move and Fill-and-arrange rows of icon picks");
  assert.equal(metrics.arrange.popout, "Open in new window"); assert.equal(metrics.arrange.separators, 1);
  assert.equal(metrics.arrange.popoutGlyph, JSON.parse(await fs.readFile(path.join(root, "src/generated/icons.json"), "utf8")).WindowNew, "Open in new window carries the WindowNew glyph");
  assert.equal(await fillMenu.getByRole("button", { name: "Fill", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await fillMenu.getByRole("button", { name: "Tile", exact: true }).getAttribute("aria-pressed"), "false");
  await page.keyboard.press("Escape"); await fillMenu.waitFor({ state: "detached" });
  assert.equal(await page.locator('[role="menu"]').count(), 0, "no other menu was opened by the arrange popup");
  await pane("plan").getByRole("button", { name: "Collapse", exact: true }).click();
  await waitLayout("S[row](T:chat,S[column](T:files,T:plan))");
  // The clicked trigger never opens its popup. Collapse puts the Files header's trigger under the
  // stationary pointer; like any trigger the pointer enters (Base UI openOnHover on mouseenter) it may
  // hover-open 100 ms later, so the check names the clicked trigger, and the pointer then leaves.
  const collapsedTrigger = await arrangeTrigger("plan").getAttribute("id");
  assert.equal(await arrangeTrigger("plan").getAttribute("data-popup-open"), null, "a plain click toggles without opening the popup");
  await page.mouse.move(400, 700);
  await arrangePopup().waitFor({ state: "detached" });
  assert.deepEqual(await layoutRoot(), tiled, "Collapse restores the exact prior layout JSON");
  await pane("plan").getByRole("button", { name: "Expand", exact: true }).focus();
  await page.keyboard.press("Meta+Shift+\\");
  await waitLayout("S[row](T:plan)", "Cmd+Shift+\\ fills the focused pane");
  await page.keyboard.press("Meta+Shift+\\");
  await waitLayout("S[row](T:chat,S[column](T:files,T:plan))", "Cmd+Shift+\\ collapses again");
  assert.deepEqual(await layoutRoot(), tiled);
  // Hover opens the popup (openOnHover) and leaving both trigger and popup closes it.
  await page.mouse.move(400, 700);
  const focusedBeforeHover = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName);
  await arrangeTrigger("plan").hover();
  await arrangePopup().waitFor();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? document.activeElement?.tagName), focusedBeforeHover, "a hover open does not move focus");
  await page.mouse.move(400, 700);
  await arrangePopup().waitFor({ state: "detached" });
  // ArrowDown on the focused trigger opens the popup with focus on it; the
  // arrows then land on the first/last pick and Escape returns to the trigger.
  await arrangeTrigger("plan").focus();
  await page.keyboard.press("ArrowDown");
  await arrangePopup().waitFor();
  assert.equal(await page.evaluate((selector) => !!document.activeElement?.closest(selector), ARRANGE_POPUP), true, "keyboard open focuses the popup");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Move to left");
  // The focused pick shows its tooltip; the local tooltip contract takes the
  // first Escape for itself (tooltip-ui-test), so a second one may be needed
  // to dismiss the popup. Recorded, not asserted either way.
  metrics.arrangeEscapes = 0;
  for (let attempt = 0; attempt < 2 && await arrangePopup().count(); attempt++) {
    await page.keyboard.press("Escape"); metrics.arrangeEscapes++;
    await page.waitForFunction((selector) => !document.querySelector(selector) || !document.querySelector('[role="tooltip"]'), ARRANGE_POPUP);
  }
  await arrangePopup().waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Expand", "Escape hands focus back to the trigger");
  assert.equal(await layoutKey(), "S[row](T:chat,S[column](T:files,T:plan))", "neither hover nor keyboard open toggled Fill");
  await paneMenu("files", "Move to left"); await waitLayout("S[row](T:files,T:chat,T:plan)");
  await paneMenu("files", "Move to right"); await waitLayout("S[row](T:chat,T:plan,T:files)");
  const moveMenu = await paneMenu("files", null);
  assert.equal(await moveMenu.getByRole("button", { name: "Move to right", exact: true }).getAttribute("aria-pressed"), "true", "Move to right is pressed once at the right edge");
  assert.equal(await moveMenu.getByRole("button", { name: "Move to left", exact: true }).getAttribute("aria-pressed"), "false");
  assert.equal(await moveMenu.getByRole("button", { name: "Open in new window", exact: true }).count(), 1);
  await page.keyboard.press("Escape"); await moveMenu.waitFor({ state: "detached" });
  // "{pane} settings" carries only pane-supplied sections: Files offers the
  // "Show file tree" checkbox (menu stays open); Plan has no settings button.
  assert.equal(await pane("plan").getByRole("button", { name: "Plan settings", exact: true }).count(), 0, "Plan supplies no settings sections");
  await pane("files").getByRole("button", { name: "Files settings", exact: true }).click();
  const settings = page.getByRole("menu", { name: "Files settings", exact: true });
  await settings.waitFor();
  metrics.settings = await settings.evaluate(node => [...node.querySelectorAll('[role^="menuitem"]')].map(item => ({ role: item.getAttribute("role"), label: item.getAttribute("data-label"), checked: item.getAttribute("aria-checked") })));
  assert.deepEqual(metrics.settings, [{ role: "menuitemcheckbox", label: "Show file tree", checked: "true" }, { role: "menuitemcheckbox", label: "Preview tabs", checked: "true" }, { role: "menuitemcheckbox", label: "Auto-save", checked: "true" }, { role: "menuitemcheckbox", label: "Tab key indents", checked: "true" }, { role: "menuitemcheckbox", label: "Word wrap", checked: "true" }, { role: "menuitemcheckbox", label: "Indent guides", checked: "true" }, { role: "menuitemcheckbox", label: "Show whitespace", checked: "false" }, { role: "menuitemcheckbox", label: "Scroll past end", checked: "false" }, { role: "menuitem", label: "Tab size", checked: null }]);
  await settings.getByRole("menuitemcheckbox", { name: "Show file tree", exact: true }).click();
  await pane("files").getByRole("tree", { name: "Project files" }).waitFor({ state: "hidden" });
  assert.equal(await settings.count(), 1, "the checkbox keeps the menu open");
  assert.equal(await settings.getByRole("menuitemcheckbox", { name: "Show file tree", exact: true }).getAttribute("aria-checked"), "false");
  await settings.getByRole("menuitemcheckbox", { name: "Show file tree", exact: true }).click();
  await pane("files").getByRole("tree", { name: "Project files" }).waitFor({ state: "visible" });
  await page.keyboard.press("Escape"); await settings.waitFor({ state: "detached" });
  await pane("plan").getByRole("button", { name: "Close panel", exact: true }).focus();
  await page.keyboard.press("Meta+\\");
  await waitLayout("S[row](T:chat,T:files)", "Cmd+\\ closes the focused pane");
  checks.push("Fill renders only that pane at full width with Collapse restoring the exact JSON; Cmd+Shift+\\ toggles, Cmd+\\ closes; the Expand/Collapse button is the arrange trigger (click toggles, hover/right-click/ArrowDown open a 176px popup with Move and Fill-and-arrange icon rows, pressed = current, Escape refocuses the trigger); '{pane} settings' renders only pane sections (Files: Show file tree checkbox, keepOpen; Plan: none)");

  // 10. Per-session restore + relaunch.
  let tree = pane("files").getByRole("tree", { name: "Project files" });
  await tree.getByRole("button", { name: "nested", exact: true }).click();
  await tree.getByRole("button", { name: "deep.txt", exact: true }).waitFor();
  // 2.31226.0 go retains the tree while opening the first file. Keep the preview through its tab.
  await tree.getByRole("button", { name: "alpha.txt", exact: true }).click();
  await pane("files").locator('[data-view-tab-bar] [data-vtb-id$="alpha.txt"]:has(.italic)').dblclick();
  await pane("files").locator("[data-file-viewer], .sfv-editor").filter({ hasText: "ALPHA_KEPT_FILE" }).waitFor();
  assert.equal(await tree.isVisible(), true, "2.31226.0 opening the first file retains the tree");
  // Explicitly commit the shown preference for the persistence checks below (peek alone must not persist).
  await pane("files").getByRole("button", { name: "Hide file tree", exact: true }).click();
  await pane("files").getByRole("button", { name: "Show file tree", exact: true }).click();
  await tree.waitFor();
  await tree.getByRole("button", { name: "beta.md", exact: true }).click();
  await pane("files").locator("[data-file-viewer], .sfv-editor").filter({ hasText: "BETA_PREVIEW_FILE" }).waitFor();
  const tabsOf = () => pane("files").evaluate(node => [...node.querySelectorAll("[data-view-tab-bar] [data-vtb-id]")].map(tab => ({ path: tab.dataset.vtbId, preview: !!tab.querySelector(".italic"), selected: tab.querySelector('[role="tab"]').getAttribute("aria-selected") })));
  const treeDivider = pane("files").getByRole("separator", { name: "Resize file tree", exact: true });
  await treeDivider.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await frames(2);
  const stateA = { key: await layoutKey(), tabs: await tabsOf(), treeWidth: (await rect(pane("files").locator(".source-files-tree"))).width, treeVisible: await tree.isVisible(), nested: await tree.getByRole("button", { name: "deep.txt", exact: true }).count() };
  assert.deepEqual(stateA.tabs.map(tab => [path.basename(tab.path), tab.preview]), [["alpha.txt", false], ["beta.md", true]]);
  await open(B);
  assert.equal(await layoutKey(), "S[row](T:chat)", "session B has no panes");
  await open(A);
  await waitLayout(stateA.key, "session A layout restored");
  await pane("files").locator("[data-file-viewer], .sfv-editor").filter({ hasText: "BETA_PREVIEW_FILE" }).waitFor();
  const stateA2 = { key: await layoutKey(), tabs: await tabsOf(), treeWidth: (await rect(pane("files").locator(".source-files-tree"))).width, treeVisible: await tree.isVisible(), nested: await tree.getByRole("button", { name: "deep.txt", exact: true }).count() };
  assert.deepEqual(stateA2, stateA, "layout, tabs (order + preview flag), tree width/visibility and expanded folders restore");
  const storeBefore = await tilesStore();
  assert.equal(storeBefore.version, 1);
  assert.ok(Object.keys(storeBefore.sessions).length <= 100);
  assert.deepEqual(storeBefore.sessions[A].fileTabs, [{ path: stateA.tabs[0].path, preview: false }, { path: stateA.tabs[1].path, preview: true }], "persisted tabs carry no file contents");
  await app.close();
  await launch();
  tree = pane("files").getByRole("tree", { name: "Project files" });
  await open(A);
  await waitLayout(stateA.key, "relaunch restores the layout from localStorage code-desktop-tiles");
  await pane("files").locator("[data-file-viewer], .sfv-editor").filter({ hasText: "BETA_PREVIEW_FILE" }).waitFor();
  const stateA3 = { key: await layoutKey(), tabs: await tabsOf(), treeWidth: (await rect(pane("files").locator(".source-files-tree"))).width, treeVisible: await tree.isVisible(), nested: await tree.getByRole("button", { name: "deep.txt", exact: true }).count() };
  assert.deepEqual(stateA3, stateA, "relaunch restores tabs, preview flag, tree width and expanded folders");
  checks.push("Session switch A -> B -> A and a relaunch with the same profile restore layout JSON, ordered tabs with preview flags, tree width/visibility and expanded folders from localStorage code-desktop-tiles (<= 100 entries, no file contents)");

  // 11. Tree keyboard.
  await pane("files").getByRole("textbox", { name: "Filter files", exact: true }).focus();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "treeitem");
  const rowInfo = () => page.evaluate(() => {
    const row = document.activeElement;
    if (row?.getAttribute("role") !== "treeitem") return { role: row?.getAttribute("role") ?? null, label: row?.getAttribute("aria-label") ?? null, tag: row?.tagName ?? null, className: row?.className ?? null };
    const button = row.querySelector("[data-tree-primary]");
    return { role: "treeitem", name: button.getAttribute("aria-label"), level: row.getAttribute("aria-level"), expanded: row.getAttribute("aria-expanded"), index: row.getAttribute("data-row-index"),
      parent: row.getAttribute("data-parent-index"), tabIndex: row.getAttribute("tabindex"), current: row.getAttribute("aria-current"), paddingLeft: getComputedStyle(button).paddingLeft, height: button.getBoundingClientRect().height };
  });
  let info = await rowInfo();
  assert.equal(info.name, "beta.md", "Tab into the tree lands on the aria-current row");
  assert.equal(info.current, "page"); assert.equal(info.tabIndex, "-1"); assert.equal(info.level, "1"); assert.equal(info.paddingLeft, "8px");
  near(info.height, 24, "row height is the 24px h-control", .5);
  await page.keyboard.press("Home"); info = await rowInfo();
  const firstName = info.name; assert.equal(info.index, "0", `Home focuses the first row (${JSON.stringify(info)})`);
  await page.keyboard.press("End"); info = await rowInfo();
  assert.notEqual(info.name, firstName, "End reaches the last row");
  await page.keyboard.press("Home");
  const names = [];
  for (let step = 0; step < 6; step++) { names.push((await rowInfo()).name); await page.keyboard.press("ArrowDown"); }
  const nestedIndex = names.indexOf("nested");
  assert.ok(nestedIndex >= 0, `nested folder visible (${names.join(",")})`);
  await page.keyboard.press("Home");
  for (let step = 0; step < nestedIndex; step++) await page.keyboard.press("ArrowDown");
  info = await rowInfo(); assert.equal(info.name, "nested"); assert.equal(info.expanded, "true");
  await page.keyboard.press("ArrowLeft"); await page.waitForFunction(() => document.activeElement?.getAttribute("aria-expanded") === "false");
  info = await rowInfo(); assert.equal(info.name, "nested"); assert.equal(info.expanded, "false", "ArrowLeft collapses an expanded directory");
  await page.keyboard.press("ArrowRight"); await page.waitForFunction(() => document.activeElement?.getAttribute("aria-expanded") === "true");
  await tree.getByRole("button", { name: "deep.txt", exact: true }).waitFor();
  await frames(2);
  await page.keyboard.press("ArrowRight"); info = await rowInfo();
  assert.equal(info.level, "2", "ArrowRight on an expanded directory moves to the next row (its first child)");
  assert.equal(info.parent, String(nestedIndex), "data-parent-index points at the nested row");
  assert.equal(info.paddingLeft, "16px", "indent = 8 + 8 * level");
  const childName = info.name;
  await page.keyboard.press("ArrowLeft"); info = await rowInfo();
  assert.equal(info.name, "nested", "ArrowLeft on a child focuses its parent");
  await page.keyboard.press("ArrowRight"); info = await rowInfo();
  assert.equal(info.name, childName);
  assert.equal(childName, "inner", "directories list first");
  await page.keyboard.press("ArrowRight"); await page.waitForFunction(() => document.activeElement?.getAttribute("aria-expanded") === "true");
  await tree.getByRole("button", { name: "leaf.txt", exact: true }).waitFor();
  await frames(2);
  await page.keyboard.press("ArrowRight"); info = await rowInfo();
  assert.equal(info.name, "leaf.txt"); assert.equal(info.level, "3"); assert.equal(info.paddingLeft, "24px");
  await page.keyboard.press("Enter");
  await pane("files").locator("[data-file-viewer], .sfv-editor").filter({ hasText: "NESTED_LEAF_FILE" }).waitFor();
  const opened = await tabsOf();
  // cccc2cf0a :5714 p(k, {keep: Vv(t)}) with Vv(e) = e.detail !== 1 (:4738): a keyboard Enter (a detail-0 click) keeps the tab;
  // only a single pointer click opens a preview.
  assert.ok(opened.some(tab => path.basename(tab.path) === "leaf.txt" && !tab.preview), "Enter opens a kept (non-preview) tab");
  // B33 (cccc2cf0a ly/oy :4978-5079, c82eca2bd M, Db :6969-6980): releasing Enter on a file row hands focus to the
  // opened file's editor. Put focus back on the leaf row to check leaving the tree backwards.
  await page.waitForFunction(() => !!document.activeElement?.closest(".cm-content"));
  await tree.locator('[role="treeitem"]').filter({ has: page.getByRole("button", { name: "leaf.txt", exact: true }) }).first().focus();
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "treeitem");
  // Shift+Tab from a row leaves the tree backwards (the container hands focus
  // to the row only on a keyboard arrival from outside: official yg guards);
  // a pointer press on the tree background keeps focus on the container.
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+Tab");
  await frames(2);
  const afterShiftTab = await page.evaluate(() => ({ label: document.activeElement?.getAttribute("aria-label") ?? null, insideTree: !!document.activeElement?.closest('[role="tree"]') }));
  assert.equal(afterShiftTab.insideTree, false, `Shift+Tab leaves the tree (${JSON.stringify(afterShiftTab)})`);
  assert.equal(afterShiftTab.label, "Filter files", "Shift+Tab lands on the element before the tree");
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "treeitem");
  const treeBox = await rect(tree);
  await page.mouse.click(treeBox.x + treeBox.width / 2, treeBox.y + treeBox.height - 12);
  await frames(2);
  const afterBackgroundClick = await page.evaluate(() => ({ role: document.activeElement?.getAttribute("role") ?? null, label: document.activeElement?.getAttribute("aria-label") ?? null }));
  // F11: the tree is labelled "Project files" (panes-tile-current.js:4727).
  assert.deepEqual(afterBackgroundClick, { role: "tree", label: "Project files" }, "a background press focuses the container without jumping to a row");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.getAttribute("role") === "treeitem");
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Filter files");
  metrics.tree = { firstName, childName, opened: opened.map(tab => path.basename(tab.path)), afterShiftTab, afterBackgroundClick };
  checks.push("Tree: single tab stop landing on the aria-current row, ArrowDown/Up, Home/End, ArrowRight expand-or-next, ArrowLeft collapse-or-parent via data-parent-index, Enter opens a kept tab (Vv detail !== 1), ArrowUp on the first row returns to Filter, Shift+Tab leaves the tree to Filter and a background press keeps focus on the container, 24px rows indented 8 + 8 * level");

  // 12. Popout: header entry, tear-off bounds, dock, duplicate focus, window.open denied.
  const popoutWindow = app.waitForEvent("window", { timeout: 10000 });
  await paneMenu("files", "Open in new window");
  const popout = await popoutWindow;
  popout.on("pageerror", error => rendererErrors.push(`popout: ${error.message}`));
  await waitLayout("S[row](T:chat)", "the tile leaves the layout once the window exists");
  await popout.locator('[data-popout-pane="files"]').waitFor();
  await popout.getByRole("tree", { name: "Project files" }).getByRole("button", { name: "gamma.txt", exact: true }).waitFor();
  const popoutMenu = page.getByRole("button", { name: "View options", exact: true });
  await popoutMenu.click(); await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).click(); await pane("files").waitFor();
  const popMenu = await paneMenu("files", null);
  assert.equal(await popMenu.getByRole("button", { name: "Open in new window", exact: true }).count(), 0, "a second window for the same session+pane is not offered");
  assert.equal(await popMenu.locator('[role="separator"]').count(), 0, "no trailing separator without the pop-out row");
  await page.keyboard.press("Escape"); await popMenu.waitFor({ state: "detached" });
  // Popped-out header (sidebar-support.js Sw): ghost "Open in main window"
  // with the ArrowInSquare glyph, next to the pane's own settings menu.
  const glyphs = JSON.parse(await fs.readFile(path.join(root, "src/generated/icons.json"), "utf8"));
  metrics.popoutHeader = await popout.evaluate(() => {
    const dock = document.querySelector("[data-pane-dock]");
    return { label: dock?.getAttribute("aria-label") ?? null, glyph: dock?.querySelector("[data-cds=Icon]")?.textContent.codePointAt(0) ?? null,
      buttons: [...document.querySelectorAll(".spc-controls button")].map(node => node.getAttribute("aria-label")) };
  });
  assert.equal(metrics.popoutHeader.label, "Open in main window", "popout header control is 'Open in main window'");
  assert.equal(metrics.popoutHeader.glyph, glyphs.ArrowInSquare, "popout header control uses the ArrowInSquare icon");
  // 0.2.128: ka's trailing (panes-toggle-current.js:1508-1551) is [c, Lr settings, la, close, ma dock]; for the file
  // pane c is the tile trailing whose first control is c_ "Search files" (panes-tile-current.js:6791-6807, :16366-16378),
  // in the popped-out window too.
  // Fidelity F04 (on purpose): ma renders Et (dock) then Ot, the tE "Keep window on top" pin (sidebar-support.js:9509-9547).
  // 2.31226.0 cccc2cf0a :7181 labels that control "Go to file or search" (the go-to-file chord).
  assert.deepEqual(metrics.popoutHeader.buttons, ["Go to file or search", "Files settings", "Open in main window", "Keep window on top"]);
  // The pin toggles setPopoutAlwaysOnTop: main stores it on the pane window entry (popout-list) and calls
  // setAlwaysOnTop, which the offscreen adapter stops (blocked) while a native run reads isAlwaysOnTop().
  const pinState = async () => ({
    button: await popout.locator("[data-popout-pin]").evaluate(node => ({ label: node.getAttribute("aria-label"), pressed: node.getAttribute("aria-pressed"), glyph: node.querySelector("[data-cds=Icon]")?.textContent.codePointAt(0) ?? null })),
    stored: (await page.evaluate(() => window.desktop.call("popout-list"))).find(entry => entry.pane === "files")?.alwaysOnTop ?? null,
    native: await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find(window => window.webContents.getURL().includes("popout=")); return globalThis.offscreenEvidence ? null : w.isAlwaysOnTop(); }),
  });
  const blockedBeforePin = await app.evaluate(() => globalThis.offscreenEvidence?.blocked.length ?? 0);
  assert.deepEqual(await pinState(), { button: { label: "Keep window on top", pressed: "false", glyph: glyphs.Pin }, stored: false, native: await app.evaluate(() => globalThis.offscreenEvidence ? null : false) });
  await popout.getByRole("button", { name: "Keep window on top", exact: true }).click();
  await popout.getByRole("button", { name: "Stop keeping window on top", exact: true }).waitFor();
  metrics.popoutPinned = await pinState();
  assert.deepEqual(metrics.popoutPinned.button, { label: "Stop keeping window on top", pressed: "true", glyph: glyphs.PinFilled });
  assert.equal(metrics.popoutPinned.stored, true); if (metrics.popoutPinned.native !== null) assert.equal(metrics.popoutPinned.native, true);
  const pinColor = await popout.locator("[data-popout-pin]").evaluate(node => { const probe = document.createElement("span"); probe.style.color = "var(--cds-text-accent)"; node.parentElement.append(probe); const accent = getComputedStyle(probe).color; probe.remove(); return { color: getComputedStyle(node).color, accent }; });
  assert.equal(pinColor.color, pinColor.accent, "pressed ghost pin is text-accent");
  await popout.getByRole("button", { name: "Stop keeping window on top", exact: true }).click();
  await popout.getByRole("button", { name: "Keep window on top", exact: true }).waitFor();
  metrics.popoutUnpinned = await pinState();
  assert.deepEqual([metrics.popoutUnpinned.button.pressed, metrics.popoutUnpinned.stored], ["false", false]); if (metrics.popoutUnpinned.native !== null) assert.equal(metrics.popoutUnpinned.native, false);
  if (await app.evaluate(() => !!globalThis.offscreenEvidence)) assert.deepEqual((await app.evaluate(() => globalThis.offscreenEvidence.blocked)).slice(blockedBeforePin), ["window.setAlwaysOnTop", "window.setAlwaysOnTop"]);
  checks.push("Popped-out header: 'Keep window on top' Pin ghost button after 'Open in main window'; a click stores alwaysOnTop on the pane window entry (setAlwaysOnTop), shows PinFilled, aria-pressed=true, text-accent and 'Stop keeping window on top'; a second click resets it");
  const duplicate = await page.evaluate(() => window.desktop.call("popout-open", { sessionId: "pane-layout-A", pane: "files" }));
  assert.equal(duplicate.existing, true, "a duplicate request focuses the existing window");
  assert.equal((await app.windows()).length, 2);
  assert.equal(await page.evaluate(() => window.open("https://example.invalid")), null, "window.open stays denied");
  assert.equal((await app.windows()).length, 2);
  await closePane("files");
  await popout.getByRole("button", { name: "Open in main window", exact: true }).click();
  await popout.waitForEvent("close", { timeout: 10000 }).catch(() => {});
  await waitLayout("S[row](T:chat,T:files)", "Open in main window closes the window and reinserts the tile");
  assert.equal((await app.windows()).length, 1);
  // Tear-off: pointer leaves the window while dragging the handle and the
  // window is placed at the event's screen point minus 120/14 (Kh tear-off
  // callback). The main window is parked at the work-area origin at 600x600
  // (its minimum width) so the wanted point and the 900x700 pane window
  // (cd377abb5 Vn/Q default size) lie strictly inside the display: a clamped
  // placement would fail rather than pass by coincidence.
  const parked = await app.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const before = win.getBounds();
    const work = screen.getDisplayMatching(before).workArea;
    win.setPosition(work.x, work.y);
    return { before, work };
  });
  await size(600, 600);
  await page.evaluate(() => { window.__lastMove = null; window.addEventListener("pointermove", event => { window.__lastMove = { clientX: event.clientX, clientY: event.clientY, screenX: event.screenX, screenY: event.screenY, inner: innerWidth }; }, true); });
  const tearHandle = await rect(handle("files"));
  await page.mouse.move(tearHandle.x + 22, tearHandle.y + 8); await page.mouse.down();
  await page.mouse.move((await page.evaluate(() => innerWidth)) + 40, 150, { steps: 8 }); await frames(2);
  let lastMove = await page.evaluate(() => window.__lastMove);
  if (!(lastMove && lastMove.clientX > lastMove.inner)) {
    // Chromium sometimes clamps a synthesized pointer to the viewport; the
    // official tear-off condition is a pointermove with clientX beyond
    // innerWidth, so dispatch that move for the same captured pointer.
    await page.evaluate(() => {
      const target = document.querySelector('[data-tile-id="files"] .tiles-drag-handle');
      target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 1, pointerType: "mouse", clientX: innerWidth + 40, clientY: 150, screenX: screenX + innerWidth + 40, screenY: screenY + 150, buttons: 1 }));
    });
    await frames(2);
    lastMove = await page.evaluate(() => window.__lastMove);
    metrics.tearOffDispatched = true;
  }
  assert.ok(lastMove && lastMove.clientX > lastMove.inner, `pointer left the window (${JSON.stringify(lastMove)})`);
  const tearWindow = app.waitForEvent("window", { timeout: 10000 });
  await page.mouse.up();
  const torn = await tearWindow;
  await torn.locator('[data-popout-pane="files"]').waitFor();
  await waitLayout("S[row](T:chat)", "tear-off removes the tile");
  const { bounds } = await app.evaluate(({ BrowserWindow }) => ({
    bounds: BrowserWindow.getAllWindows().filter(w => w.webContents.getURL().includes("popout=")).map(w => w.getBounds()) }));
  const work = parked.work;
  const wanted = { x: Math.round(lastMove.screenX - 120), y: Math.round(lastMove.screenY - 14) };
  metrics.popout = { lastMove, wanted, bounds, work, parked: parked.before };
  assert.equal(bounds.length, 1);
  assert.deepEqual([bounds[0].width, bounds[0].height], [900, 700], "a torn-off pane window opens at the reference 900x700 default (cd377abb5 Vn)");
  assert.ok(wanted.x > work.x && wanted.x + bounds[0].width < work.x + work.width, `wanted x ${wanted.x} (+${bounds[0].width}) is strictly inside the work area ${JSON.stringify(work)}`);
  assert.ok(wanted.y > work.y && wanted.y + bounds[0].height < work.y + work.height, `wanted y ${wanted.y} (+${bounds[0].height}) is strictly inside the work area ${JSON.stringify(work)}`);
  near(bounds[0].x, wanted.x, "tear-off window x = pointer.x - 120", 4);
  near(bounds[0].y, wanted.y, "tear-off window y = pointer.y - 14", 4);
  await torn.close();
  await waitLayout("S[row](T:chat,T:files)", "closing the window docks the tile");
  await app.evaluate(({ BrowserWindow }, before) => BrowserWindow.getAllWindows()[0].setPosition(before.x, before.y), parked.before);
  await size(1468, 852);
  checks.push("Open in new window creates one sandboxed popout per session+pane (duplicates focus it, window.open denied) showing the real file list; the popped-out header offers 'Open in main window' (ArrowInSquare) and window close reinserts the tile; tear-off places the window at pointer-120/-14 (verified unclamped, strictly inside the work area)");

  // 13. Reduced motion.
  metrics.motion = await page.evaluate(() => getComputedStyle(document.querySelector('[data-tile-id="files"]')).transitionDuration);
  assert.equal(metrics.motion, "0.3s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-tile-id="files"]')).transitionDuration), "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await dragHandle("files", 120, 160, { release: false });
  const lifted = await page.evaluate(() => document.querySelector('[data-tile-id="files"]').style.transform);
  assert.ok(lifted.includes("translate"), "the dragged tile follows the pointer");
  await page.keyboard.press("Escape"); await page.mouse.up();
  await page.waitForFunction(() => { const node = document.querySelector('[data-tile-id="files"]'); return getComputedStyle(node).transform === "none" || getComputedStyle(node).transform === "matrix(1, 0, 0, 1, 0, 0)"; }, null, { timeout: 600 });
  checks.push("Tile transform transition is 300ms (0s under prefers-reduced-motion) and a cancelled drag settles within 500ms");

  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
  // Failure evidence only (0.2.119): what receives a press at each drag handle's center.
  metrics.failureHandleHits = await page?.evaluate(() => [...document.querySelectorAll(".tiles-drag-handle")].map(node => {
    const r = node.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    return { tile: node.dataset.tileDragHandle, rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      hits: document.elementsFromPoint(x, y).slice(0, 4).map(hit => { const c = getComputedStyle(hit); return `${hit.tagName.toLowerCase()}.${[...hit.classList].join(".")}${hit.getAttribute("aria-label") ? `[${hit.getAttribute("aria-label")}]` : ""} pos=${c.position} z=${c.zIndex} iso=${c.isolation} tf=${c.transform}`; }),
      headerOrder: [...(node.closest("header")?.children || [])].map(child => `${child.tagName.toLowerCase()}.${[...child.classList].join(".")}`),
      parent: `${node.parentElement?.tagName.toLowerCase()}.${[...(node.parentElement?.classList || [])].join(".")}` };
  })).catch(e => ({ error: e.message }));
  // Failure evidence only (0.2.119): the arrange triggers' hook refs (timers / hover
  // suppression / pointer-over flags), read from the React fiber of each trigger.
  metrics.failureArrangeState = await page?.evaluate(() => [...document.querySelectorAll("[data-pane-arrange-trigger]")].map(node => {
    const key = Object.keys(node).find(name => name.startsWith("__reactFiber$"));
    let fiber = key && node[key], refs = null;
    while (fiber && !refs) {
      const values = [];
      for (let hook = fiber.memoizedState; hook && typeof hook === "object" && "next" in hook; hook = hook.next) values.push(hook.memoizedState);
      if (values.some(value => value && typeof value === "object" && value.current && typeof value.current === "object" && "hover" in value.current && "leave" in value.current))
        refs = values.map(value => value && typeof value === "object" && "current" in value ? (value.current instanceof Element ? `<${value.current.tagName}>` : value.current) : value);
      fiber = fiber.return;
    }
    return { tile: node.closest("[data-tile-id]")?.dataset.tileId, label: node.getAttribute("aria-label"), hovered: node.matches(":hover"), refs: JSON.parse(JSON.stringify(refs, (k, v) => typeof v === "function" ? "fn" : v)) };
  })).catch(e => ({ error: e.message }));
} finally {
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "pane-layout-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "pane-layout-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
