import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";

// Split view and multiple windows end to end (electron/window-registry.cjs, src/source-split-view.jsx,
// src/split-view-store.mjs; Claude Desktop 2.2553.1 desktop-sidebar.js WR/GR "dframe-pane-host", View › Split View):
// a session row's Open in › "Split view" and "New window", the sidebar opening into the focused side, focus by
// click and ⌃] / ⌃[, the keyboard and pointer divider, View › Split View items, narrow tabs, ⌘W closing the focused
// side, a sidebar row dropped on the session area, File › New Window, menus acting on the window they target, a
// session list change and an approval seen by two windows (answered once), a non-last window closing for good, and the
// windows plus the split restored on relaunch. B27 (cd377abb5 xi/Q, shared-11 Zo): Open in › New window and File › New
// Window open sidebar-less session popouts (?window=session) with Open in main window and Keep window on top; they are
// restored through open-popouts.json, never open-windows.json. Runs against the isolated protocol fixture after a fresh build; every
// window stays hidden (the offscreen adapter blocks show, and without it show/focus are stubbed before any new window
// is created; CODE_DESKTOP_OFFSCREEN_LAUNCH keeps restored windows hidden). Not run by the feature work itself:
// scripts/validate-local.mjs runs it with the standard suite.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.resolve(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
// The run folder sits with the other suites' evidence (the offscreen run-suite adapter only accepts profiles there).
const directory = await fs.mkdtemp(path.join(evidence, "split-windows-ui-"));
const profile = path.join(directory, "profile"), workspace = path.join(profile, "workspace");
await fs.mkdir(workspace, { recursive: true });
const A = "split-a", B = "split-b", C = "split-c";
const NAMES = { [A]: "Split alpha session", [B]: "Split beta session", [C]: "Split gamma session" };
const now = Math.floor(Date.now() / 1000);
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text, text_elements: [] }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const thread = (id, index) => ({ id, name: NAMES[id], cwd: workspace, createdAt: now - index, updatedAt: now - index, archived: false,
  turns: [{ id: `${id}-turn`, status: "completed", items: [userItem(`${id}-user`, `Prompt of ${NAMES[id]}.`), textItem(`${id}-answer`, `ANSWER_${id.slice(6).toUpperCase()}`)] }] });
await fs.writeFile(path.join(profile, "split-windows-fixture.marker"), "isolated-split-windows-test\n");
// Terminal and Preview panes on both sides and in a second window: the shell is /bin/sh under a HOME inside the run
// folder (never the user's shell or dotfiles); the previewed site is a loopback server from the session folder's
// .claude/launch.json, run with this Node.
const home = path.join(directory, "home");
await fs.mkdir(home, { recursive: true });
await fs.mkdir(path.join(workspace, ".claude"), { recursive: true });
const sitePort = await new Promise((resolve) => { const server = http.createServer(); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(() => resolve(port)); }); });
await fs.writeFile(path.join(workspace, "site.js"), `require('node:http').createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Split site</title><h1>Split site</h1>');}).listen(Number(process.env.PORT),'127.0.0.1',()=>console.log('site listening on '+process.env.PORT));`);
await fs.writeFile(path.join(workspace, ".claude/launch.json"), JSON.stringify({ version: "0.0.1", configurations: [{ name: "site", runtimeExecutable: process.execPath, runtimeArgs: ["site.js"], port: sitePort }] }, null, 2));
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", permission: "auto", threadIds: [A, B, C], sidebarWidth: 288, displayName: "Split fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: { [A]: thread(A, 0), [B]: thread(B, 1), [C]: thread(C, 2) } }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: path.join(profile, "codex-home"), CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"), CODE_DESKTOP_OFFSCREEN_LAUNCH: "1",
  CODE_DESKTOP_TERMINAL_SHELL: "/bin/sh", HOME: home, SHELL: "/bin/sh", PS1: "split$ ", ENV: "" };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL; delete env.ZDOTDIR; delete env.BASH_ENV;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");

const build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const testSources = ["scripts/split-windows-ui-test.mjs", "tests/fixtures/codex-server.cjs"];
let testHashes;
async function integrity() {
  assert.ok(Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/main.jsx", "src/source-split-view.jsx", "src/source-split-view.css", "src/split-view-store.mjs", "src/split-view-model.mjs", "src/source-sidebar.jsx",
    "electron/main.cjs", "electron/window-registry.cjs", "electron/window-state.cjs", "electron/app-menu.cjs"])
    assert.ok(build.sources.some((entry) => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async (file) => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testHashes) assert.deepEqual(hashes, testHashes, "Test or protocol fixture changed during this run"); else testHashes = hashes;
}

const report = { at: new Date().toISOString(), directory, build: { version: build.version, sourceSha256: build.sourceSha256 }, checks: [], metrics: {}, rendererErrors: [], passed: false };
let app, page, phase = "launch";
const step = (name) => { phase = name; console.log("SPLIT " + name); };
const poll = async (fn, label, ms = 10000) => {
  const end = Date.now() + ms;
  let last;
  while (Date.now() < end) { try { if ((last = await fn())) return last; } catch {} await new Promise((resolve) => setTimeout(resolve, 30)); }
  throw new Error(`Timed out: ${label}`);
};
const frames = (target = page, count = 3) => target.evaluate((count) => new Promise((resolve) => { const next = () => (--count ? requestAnimationFrame(next) : resolve()); requestAnimationFrame(next); }), count);
const watch = (target, label) => target.on("pageerror", (error) => report.rendererErrors.push({ phase, window: label, message: error.message }));
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(profile, name), "utf8"));
const shot = (name, target = page) => target.screenshot({ path: path.join(directory, `${name}.png`) }).catch(() => {});

// Every window hidden: the adapter blocks show; without it, show/focus are stubbed on the prototype (recorded) before
// the test creates any window, and the launch window is hidden at once (as the other suites do).
async function hideWindows() {
  await app.evaluate(({ BrowserWindow }) => {
    globalThis.__splitShown ??= [];
    if (!globalThis.offscreenEvidence && !globalThis.__splitStubbed) {
      globalThis.__splitStubbed = true;
      for (const name of ["show", "showInactive", "focus", "moveTop"])
        BrowserWindow.prototype[name] = function stubbed() { globalThis.__splitShown.push([name, this.id]); };
    }
    for (const window of BrowserWindow.getAllWindows()) { window.webContents.setBackgroundThrottling(false); if (!globalThis.offscreenEvidence) window.hide(); }
  });
}
async function launch() {
  app = await electron.launch({ executablePath, args: [root], env, timeout: 20000 });
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  watch(page, "main");
  await hideWindows();
  await page.getByRole("button", { name: "Model", exact: true }).first().filter({ hasText: "Test model" }).waitFor();
  await size(page, 1468, 900);
}
async function windowId(target) { return (await app.browserWindow(target)).evaluate((window) => window.id); }
async function size(target, width, height = 900) {
  const id = await windowId(target);
  await app.evaluate(({ BrowserWindow }, { id, width, height }) => BrowserWindow.fromId(id).setContentSize(width, height), { id, width, height });
  await target.waitForFunction((s) => innerWidth === s.width && innerHeight === s.height, { width, height });
  await frames(target);
}
const row = (id, target = page) => target.locator(`[data-source-session-id="${id}"] [data-row-main-button]`);
const primaryTitle = (target = page) => target.locator(".split-pane-primary .st-title");
const secondaryTitle = (target = page) => target.locator(".split-pane-secondary .st-title");
const titleOf = async (locator) => (await locator.textContent())?.trim();
// A label path: ["Open in", "Split view"] opens the Open in submenu (c80a67939 x) and picks its row.
async function rowMenu(id, item, target = page) {
  await row(id, target).click({ button: "right" });
  const labels = Array.isArray(item) ? item : [item];
  let scope = target;
  for (const [index, label] of labels.entries()) {
    const entry = scope.getByRole("menuitem", { name: label, exact: true });
    await entry.waitFor();
    await entry.click();
    if (index < labels.length - 1) scope = target.getByRole("menu", { name: label, exact: true });
  }
  await frames(target);
}
async function openRow(id, target = page) {
  await row(id, target).click();
  await target.locator(".loading-state").first().waitFor({ state: "detached" }).catch(() => {});
  await frames(target);
}
const splitOpen = (target = page) => target.evaluate(() => !!document.querySelector(".split-host[data-split]"));
const focusedSide = (target = page) => target.evaluate(() => document.querySelector(".split-pane-primary")?.hasAttribute("data-focused") ? 0
  : document.querySelector(".split-pane-secondary")?.hasAttribute("data-focused") ? 1 : null);
const selectedRow = (target = page) => target.evaluate(() => document.querySelector('.source-sidebar [data-row-main-button][aria-current="page"]')?.closest("[data-source-session-id]")?.dataset.sourceSessionId ?? null);
const menuItem = (labels) => app.evaluate(({ Menu }, labels) => {
  let items = Menu.getApplicationMenu().items, item = null;
  for (const label of labels) { item = items.find((entry) => entry.label === label) ?? null; items = item?.submenu?.items ?? []; }
  return item ? { label: item.label, enabled: item.enabled, accelerator: item.accelerator ?? null } : null;
}, labels);
const clickMenu = (labels, id = null) => app.evaluate(({ Menu, BrowserWindow }, { labels, id }) => {
  let items = Menu.getApplicationMenu().items, item = null;
  for (const label of labels) { item = items.find((entry) => entry.label === label) ?? null; items = item?.submenu?.items ?? []; }
  if (!item) throw new Error("No menu item " + labels.join(" › "));
  item.click(undefined, id === null ? undefined : BrowserWindow.fromId(id));
}, { labels, id });
// Main windows load the app page; pane popouts add ?popout=, session popouts (B27) ?window=session, and the preview's
// hidden parking window (preview-service.cjs) has none.
const mainWindowIds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((window) => window.webContents.getURL().includes("index.html") && !window.webContents.getURL().includes("popout=") && !window.webContents.getURL().includes("window=")).map((window) => window.id));
const sessionPopoutIds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((window) => window.webContents.getURL().includes("window=session")).map((window) => window.id));
const requests = async () => (await fs.readFile(path.join(profile, "fixture-requests.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const turnStarts = async (threadId = null) => (await requests()).filter((entry) => entry.method === "turn/start" && (threadId === null || entry.params?.threadId === threadId)).length;
const badges = () => app.evaluate(() => (globalThis.__splitBadges ?? []).filter((value) => value === "•").length);
// The Dock badge desktop-settings.cjs sets once per notification (a finished turn, a request): counted here.
const countBadges = () => app.evaluate(({ app }) => {
  globalThis.__splitBadges = [];
  if (!app.dock || app.dock.__splitCounted) return;
  const previous = app.dock.setBadge.bind(app.dock);
  app.dock.setBadge = (value) => { globalThis.__splitBadges.push(value); return previous(value); };
  app.dock.__splitCounted = true;
});
const terminalIn = (scope) => scope.locator('.source-side-tile[data-tile-id="terminal"]');
const terminalText = (scope) => terminalIn(scope).locator(".stp-host .stp-xterm").evaluate((node) => node.stpReadText?.() ?? "").catch(() => "");
const previewViews = (id) => app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).contentView.children
  .filter((child) => child.webContents && child.webContents !== BrowserWindow.fromId(id).webContents).map((child) => child.webContents.getURL()), id);
async function sendIn(scope, text) {
  const box = scope.getByRole("textbox", { name: "Message DeepSeek", exact: true });
  await box.click();
  await box.fill(text);
  await scope.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}

try {
  await integrity();
  await launch();

  step("open-in-split");
  await openRow(A);
  assert.equal(await titleOf(primaryTitle()), NAMES[A]);
  assert.equal(await splitOpen(), false);
  assert.deepEqual(await menuItem(["View", "Split View", "New Session on the Right"]), { label: "New Session on the Right", enabled: true, accelerator: "Control+Command+\\" });
  assert.equal((await menuItem(["View", "Split View", "Close Split View"])).enabled, false);
  await rowMenu(B, ["Open in", "Split view"]);
  await poll(splitOpen, "split opens");
  await secondaryTitle().filter({ hasText: NAMES[B] }).waitFor();
  assert.equal(await titleOf(primaryTitle()), NAMES[A], "the primary side keeps its session");
  assert.equal(await focusedSide(), 1, "the new side takes the focus");
  assert.equal(await page.locator('[role="region"][aria-label="Secondary pane"]').getAttribute("aria-current"), "true");
  assert.equal(await page.locator('[role="region"][aria-label="Primary pane"]').getAttribute("data-split-inactive"), "");
  assert.equal(await selectedRow(), B, "the sidebar selects the focused side's session");
  assert.equal(await page.locator('[data-cds="ChatComposerEditor"]').count(), 2, "each side has its own composer");
  await page.locator(".split-pane-secondary").getByText("ANSWER_B", { exact: true }).waitFor();
  assert.equal(await page.locator(".split-pane-primary").getByText("ANSWER_B", { exact: true }).count(), 0, "each side has its own transcript");
  await poll(async () => (await menuItem(["View", "Split View", "Close Split View"])).enabled === true, "menus follow the split");
  report.metrics.splitMenu = await Promise.all(["New Session Below", "Focus Next Split View", "Focus Previous Split View", "Move Split View Left", "Move Split View Right", "Move Split View Up", "Move Split View Down", "Close Split View"]
    .map((label) => menuItem(["View", "Split View", label])));
  // B26 (2.31226.0 R$ / q$ / $7): from the pane at column 1 — a new session below it, Move Left (into the primary's
  // cell, trading sessions) and Move Down (under the primary); New Session on the Right follows the room left.
  assert.deepEqual(report.metrics.splitMenu.map((item) => item.enabled), [true, true, true, true, false, false, true, true]);
  assert.equal(report.metrics.splitMenu[0].accelerator, "Control+Command+-");
  await shot("split-open");
  report.checks.push("A row's Open in › Split view opens the session in a new column, focused, with its own transcript and composer; the sidebar selects it; View › Split View follows (New Session Below, focus/close and Move Left / Down on from the new pane)");

  step("sidebar-into-focused-side");
  await openRow(C);
  await secondaryTitle().filter({ hasText: NAMES[C] }).waitFor();
  assert.equal(await titleOf(primaryTitle()), NAMES[A]);
  await openRow(A);
  await frames();
  assert.equal(await focusedSide(), 0, "a session the other side shows takes the focus there");
  assert.equal(await titleOf(secondaryTitle()), NAMES[C], "and is not opened twice");
  report.checks.push("The sidebar opens a session in the focused side; a session the other side already shows moves the focus there instead of opening twice");

  step("focus-by-click-and-keys");
  await page.locator(".split-pane-secondary .source-chat-body").click({ position: { x: 40, y: 40 } });
  assert.equal(await focusedSide(), 1);
  assert.equal(await selectedRow(), C);
  await page.keyboard.press("Control+BracketLeft");
  await poll(async () => (await focusedSide()) === 0, "⌃[ focuses the other side");
  await poll(() => page.evaluate(() => !!document.activeElement?.closest(".split-pane-primary")), "keyboard focus moves into the primary side");
  await page.keyboard.press("Control+BracketRight");
  await poll(async () => (await focusedSide()) === 1, "⌃] focuses the secondary side");
  // The keyboard focus follows a moment later; let it land before the divider takes the focus.
  await poll(() => page.evaluate(() => !!document.activeElement?.closest(".split-pane-secondary")), "keyboard focus moves into the secondary side");
  report.checks.push("A click inside a side focuses it (and the sidebar follows); ⌃[ / ⌃] move the focus and the keyboard focus between sides");

  step("split-file-search-entry");
  const filesIn=side=>page.locator(`.split-pane-${side} [data-tile-id="files"]`);
  await page.locator('.split-pane-secondary [data-cds="ChatComposerEditor"]').click();await page.keyboard.press('Meta+p');
  await filesIn('secondary').getByRole('textbox',{name:'Filter files',exact:true}).waitFor();
  assert.equal(await filesIn('primary').count(),0,'Cmd P only opens Files in the focused split');
  await filesIn('secondary').getByRole('textbox',{name:'Filter files',exact:true}).fill('right-query');
  await page.locator('.split-pane-primary [data-cds="ChatComposerEditor"]').click();
  await app.evaluate(({Menu,BrowserWindow})=>{const item=Menu.getApplicationMenu().getMenuItemById('find-in-files');if(!item?.enabled)throw Error('Find in Files disabled');item.click(item,BrowserWindow.getAllWindows()[0],{});});
  const leftFilter=filesIn('primary').getByRole('textbox',{name:'Filter files',exact:true});await leftFilter.waitFor();
  await poll(async()=>(await leftFilter.inputValue())==='?','native Find in Files targets the focused primary split');
  assert.equal(await filesIn('secondary').getByRole('textbox',{name:'Filter files',exact:true}).inputValue(),'right-query','other split query stays unchanged');
  assert.equal(await leftFilter.evaluate(n=>document.activeElement===n),true);
  await filesIn('primary').getByRole('button',{name:'Close panel',exact:true}).click();await filesIn('secondary').getByRole('button',{name:'Close panel',exact:true}).click();
  await page.locator('.split-pane-secondary [data-cds="ChatComposerEditor"]').click();
  report.checks.push('Cmd+P and the real Electron Find in Files menu open search only in the focused split side; the other side keeps its query, and content mode places focus in the correct filter');

  step("divider");
  // B26 (shared-23 p$, CDS ResizeHandle): "Resize pane columns", arrows step 8px (Shift 32px), panes keep 320px.
  const separator = page.getByRole("separator", { name: "Resize pane columns", exact: true });
  assert.equal(await separator.getAttribute("aria-valuenow"), "50");
  await separator.focus();
  for (let index = 0; index < 3; index += 1) await page.keyboard.press("ArrowRight");
  assert.ok(Number(await separator.getAttribute("aria-valuenow")) > 50, "arrows move the column boundary");
  for (let index = 0; index < 40; index += 1) await page.keyboard.press("Shift+ArrowLeft");
  const floor = Number(await separator.getAttribute("aria-valuenow"));
  const widths = await page.evaluate(() => ({ primary: document.querySelector(".split-pane-primary").getBoundingClientRect().width, secondary: document.querySelector(".split-pane-secondary").getBoundingClientRect().width }));
  assert.ok(widths.primary >= 319, `the primary pane keeps its minimum width (${widths.primary})`);
  await separator.dblclick();
  assert.equal(await separator.getAttribute("aria-valuenow"), "50", "a double-click resets the split");
  const box = await separator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  const dragged = Number(await separator.getAttribute("aria-valuenow"));
  assert.ok(dragged > 50, `dragging the divider resizes the sides (${dragged})`);
  assert.equal(await separator.evaluate((node) => getComputedStyle(node).cursor), "col-resize");
  report.metrics.divider = { floor, widths, dragged };
  report.checks.push("The column boundary is a keyboard separator (arrows step 8px, Shift 32px, stopping at the 320px minimum), resets on double-click and resizes by pointer drag");

  step("layout-persisted");
  const layout = await poll(async () => { const saved = await readJson("open-windows.json"); const split = saved.windows?.[0]?.layout?.split; return split?.panes?.[0]?.sessionId === C && split.active === 1 ? saved : null; }, "the split layout (with the focused pane) is written for the window");
  assert.equal(layout.windows[0].key, "main");
  assert.equal(layout.windows[0].layout.current, A);
  assert.equal(layout.windows[0].layout.split.active, 1);
  report.metrics.openWindows = layout;
  report.checks.push("main.cjs persists the window's layout (primary session, the panes' cells, column weights, row split, focused pane) to userData/open-windows.json");

  step("move-left");
  await clickMenu(["View", "Split View", "Move Split View Left"]);
  await primaryTitle().filter({ hasText: NAMES[C] }).waitFor();
  await secondaryTitle().filter({ hasText: NAMES[A] }).waitFor();
  assert.equal(await focusedSide(), 0, "the focus follows the moved session");
  report.checks.push("View › Split View › Move Split View Left swaps the sessions and keeps the focus on the moved one");

  step("independent-turns");
  await page.locator(".split-pane-secondary .source-chat-body").click({ position: { x: 40, y: 40 } });
  const startsBefore = await turnStarts();
  await countBadges();
  await sendIn(page.locator(".split-pane-secondary"), "fixture:complete split");
  await page.locator(".split-pane-secondary").getByText("Fixture response", { exact: true }).waitFor();
  assert.equal(await page.locator(".split-pane-primary").getByText("Fixture response", { exact: true }).count(), 0);
  await page.waitForTimeout(900);
  assert.equal(await turnStarts() - startsBefore, 1, "one send from one side starts exactly one turn (the other side's App starts none)");
  assert.equal(await badges(), 1, "the finished turn notifies once (desktop-settings.cjs, not once per side)");
  assert.equal(await page.locator(`[data-source-session-id="${A}"][data-unread]`).count(), 0, "a session the other side shows does not turn unread");
  report.checks.push("A turn sent from the secondary side runs and answers there only: exactly one turn/start, one notification badge, no unread mark");

  step("split-sides-own-keys");
  assert.equal(await focusedSide(), 1);
  await page.keyboard.press("Control+Backquote");
  await terminalIn(page.locator(".split-pane-secondary")).locator(".stp-xterm .xterm").waitFor();
  assert.equal(await terminalIn(page.locator(".split-pane-primary")).count(), 0, "⌃` opens the terminal on the focused side only");
  await poll(() => page.evaluate(() => !!document.activeElement?.closest?.('.split-pane-secondary [data-tile-id="terminal"]')), "the secondary side's terminal takes the keys");
  await poll(async () => /\$ ?$/m.test(await terminalText(page.locator(".split-pane-secondary"))), "the secondary side's shell prompt");
  await page.keyboard.type("echo side-$((40+2))");
  await page.keyboard.press("Enter");
  await poll(async () => /side-42/.test(await terminalText(page.locator(".split-pane-secondary"))), "the secondary side's shell runs the command");
  // ⌃[ is Escape to a shell, so inside the terminal it stays with the shell; a click focuses the other side.
  await page.locator(".split-pane-primary .source-chat-body").click({ position: { x: 40, y: 40 } });
  await poll(async () => (await focusedSide()) === 0, "a click focuses the primary side");
  await page.keyboard.press("Control+Backquote");
  await terminalIn(page.locator(".split-pane-primary")).locator(".stp-xterm .xterm").waitFor();
  await poll(() => page.evaluate(() => !!document.activeElement?.closest?.('.split-pane-primary [data-tile-id="terminal"]')), "the primary side's terminal takes the keys");
  await poll(async () => /\$ ?$/m.test(await terminalText(page.locator(".split-pane-primary"))), "the primary side's shell prompt");
  assert.equal(/side-42/.test(await terminalText(page.locator(".split-pane-primary"))), false, "each side's session has its own shell");
  assert.equal(await terminalIn(page.locator(".split-pane-secondary")).count(), 1, "the other side's terminal stays open");
  await shot("split-terminals");
  // Hiding the focused side's terminal hands the keys back to that side's own composer.
  await page.keyboard.press("Control+Backquote");
  await terminalIn(page.locator(".split-pane-primary")).waitFor({ state: "detached" });
  await poll(() => page.evaluate(() => !!document.activeElement?.closest?.(".split-pane-primary .ProseMirror")), "focus returns to the primary side's composer");
  assert.equal(await terminalIn(page.locator(".split-pane-secondary")).count(), 1);
  await page.keyboard.press("Meta+f");
  const findBar = page.locator(".sfb-root:not(.stp-find)");
  await findBar.waitFor();
  assert.equal(await findBar.count(), 1, "⌘F opens one find bar, the focused side's");
  const findStatus = () => findBar.locator(".sfb-status").textContent();
  await findBar.getByRole("textbox", { name: "Find", exact: true }).fill("ANSWER_C");
  await poll(async () => (await findStatus()).trim() === "1/1", "the focused (primary) side's transcript is searched");
  await findBar.getByRole("textbox", { name: "Find", exact: true }).fill("ANSWER_A");
  await poll(async () => (await findStatus()).trim() === "0/0", "the other side's transcript is not searched");
  report.metrics.splitFind = await findStatus();
  await page.keyboard.press("Escape");
  await findBar.waitFor({ state: "detached" });
  // Drafts: each side keeps its own composer text under its own session.
  const primaryBox = page.locator(".split-pane-primary").getByRole("textbox", { name: "Message DeepSeek", exact: true });
  const secondaryBox = page.locator(".split-pane-secondary").getByRole("textbox", { name: "Message DeepSeek", exact: true });
  await primaryBox.fill("PRIMARY_SIDE_DRAFT");
  // composer-draft-store.mjs persistDraft: localStorage "<DRAFT_STORAGE_PREFIX><draftKey>" (draftKey = "epitaxy-<session>").
  const stored = (key) => page.evaluate((key) => Object.keys(localStorage).filter((name) => name.endsWith(key)).map((name) => localStorage.getItem(name)).join("\n"), key);
  await poll(async () => (await stored(`epitaxy-${C}`)).includes("PRIMARY_SIDE_DRAFT"), "the primary side's draft is stored under its session");
  assert.equal((await secondaryBox.innerText()).includes("PRIMARY_SIDE_DRAFT"), false, "the other side's composer stays empty");
  assert.equal((await stored(`epitaxy-${A}`)).includes("PRIMARY_SIDE_DRAFT"), false);
  await primaryBox.fill("");
  await poll(async () => !(await stored(`epitaxy-${C}`)).includes("PRIMARY_SIDE_DRAFT"), "the cleared draft leaves storage");
  // The secondary side's terminal closes from its own side.
  await page.keyboard.press("Control+BracketRight");
  await poll(async () => (await focusedSide()) === 1, "⌃] focuses the secondary side");
  await page.keyboard.press("Control+Backquote");
  await terminalIn(page.locator(".split-pane-secondary")).waitFor({ state: "detached" });
  // Each side's titlebar offers the Terminal pane with its ⌘J chord: as its own toggle, or — once the titlebar folded it
  // (R3-topbar TT-03: 2.42304.0 cd54a5401 un + c73f45bc3 jh fold toggles one by one, Vh lists the folded ones) — as a
  // View options item.
  const secondaryTrailing = page.locator(".split-pane-secondary .st-trailing");
  // The side widens once its terminal closes; the fold measure settles over a few frames (ResizeObserver ->
  // requestAnimationFrame), so read whether the toggle is inline only once that holds steady.
  const settledInline = async () => {
    let last, same = 0;
    for (let attempt = 0; attempt < 60 && same < 4; attempt += 1) {
      const value = await secondaryTrailing.locator('[data-pane-toggle="terminal"]').count();
      same = value === last ? same + 1 : 0;
      last = value;
      await page.waitForTimeout(50);
    }
    return last;
  };
  if (await settledInline() > 0) {
    const terminalToggle = secondaryTrailing.locator('[data-pane-toggle="terminal"]');
    await terminalToggle.waitFor();
    assert.match(await terminalToggle.getAttribute("aria-keyshortcuts"), /^Meta\+J\b/);
    assert.equal(await terminalToggle.getAttribute("aria-pressed"), "false");
  } else {
    await page.locator(".split-pane-secondary").getByRole("button", { name: "View options", exact: true }).click();
    const terminalItem = page.getByRole("menuitemcheckbox", { name: /^Terminal/ });
    await terminalItem.waitFor();
    assert.equal(await terminalItem.getAttribute("aria-keyshortcuts"), "Meta+J");
    assert.equal(await terminalItem.getAttribute("aria-checked"), "false");
    await page.keyboard.press("Escape");
    await terminalItem.waitFor({ state: "detached" });
  }
  report.checks.push("Each side has its own keys: ⌃` and ⌘F act on the focused side only, each side's session gets its own shell, hiding a terminal refocuses that side's composer, and drafts stay with their side's session");

  step("reduced-motion-and-dark");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator(".split-pane-secondary").evaluate((node) => getComputedStyle(node).transitionDuration.split(",").every((value) => parseFloat(value) === 0)), true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  await frames();
  await shot("split-dark");
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  report.checks.push("Under reduced motion the split has no transitions; the dark appearance renders (screenshot)");

  step("narrow-parks-panes");
  // B26 (shared-23 u1, "(max-width: 700px)"): a narrow window parks the extra panes and shows the primary alone.
  await size(page, 680, 900);
  await page.locator(".split-pane-secondary").waitFor({ state: "detached" });
  assert.equal(await page.locator(".split-pane-primary").isVisible(), true);
  assert.equal(await page.getByRole("tablist").count(), 0, "no tab strip");
  await shot("split-narrow-parked");
  await size(page, 1468, 900);
  await secondaryTitle().filter({ hasText: NAMES[A] }).waitFor();
  await page.getByRole("separator", { name: "Resize pane columns", exact: true }).waitFor();
  report.checks.push("A window 700px wide or less parks the extra panes (only the primary shows); widening brings them back with their sessions");

  step("cmd-w-closes-side");
  await page.locator(".split-pane-secondary .source-chat-body").click({ position: { x: 40, y: 40 } });
  await page.keyboard.press("Meta+W");
  await poll(async () => !(await splitOpen()), "⌘W closes the focused side");
  assert.equal(await titleOf(primaryTitle()), NAMES[C], "the primary side stays");
  assert.equal(await page.locator('[data-cds="ChatComposerEditor"]').count(), 1);
  report.checks.push("⌘W closes the focused split side before any session view; the other side stays");

  step("drop-to-split");
  // B10 (shared-19 DY): the row is a pointer drag (no native drag); its ghost and the session area both say
  // "Open in split view" over the session area.
  assert.equal(await row(B).getAttribute("draggable"), "false");
  const dropAt = await page.locator(".split-host").boundingBox();
  const from = await row(B).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let index = 1; index <= 8; index++) await page.mouse.move(from.x + from.width / 2 + (dropAt.x + dropAt.width * 0.75 - from.x - from.width / 2) * index / 8, from.y + (dropAt.y + 200 - from.y) * index / 8);
  await page.locator(".dframe-drop-overlay-badge").getByText("Split view", { exact: true }).waitFor();
  await page.locator(".source-drag-ghost [data-drag-label]").filter({ hasText: "Open in split view" }).first().waitFor();
  await shot("split-drop-indicator");
  await page.mouse.up();
  await poll(splitOpen, "dropping a session row opens it in split view");
  await secondaryTitle().filter({ hasText: NAMES[B] }).waitFor();
  assert.equal(await page.locator(".dframe-drop-overlay").count(), 0);
  report.checks.push("A sidebar row dragged (pointer) onto the session area outlines the cell with the accent Split view badge (the ghost says Open in split view) and opens the session there when dropped");

  step("row-close-split");
  // c80a67939 g: a session the window already shows has no Split view row, and the row menu has no Close split view
  // (that is View › Split View › Close Split View, ⌃⌘W).
  assert.equal(await focusedSide(), 1);
  await row(B).click({ button: "right" });
  const openIn = page.getByRole("menuitem", { name: "Open in", exact: true });
  await openIn.waitFor();
  assert.equal(await page.getByRole("menuitem", { name: /^Close split view/ }).count(), 0, "no Close split view row");
  await openIn.click();
  const openInMenu = page.getByRole("menu", { name: "Open in", exact: true });
  await openInMenu.getByRole("menuitem", { name: "New window", exact: true }).waitFor();
  assert.equal(await openInMenu.getByRole("menuitem", { name: "Split view", exact: true }).count(), 0, "a shown session offers no Split view");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await clickMenu(["View", "Split View", "Close Split View"], await windowId(page));
  await poll(async () => !(await splitOpen()), "View › Split View › Close Split View closes the split");
  report.checks.push("A session shown in split view has no Split view or Close split view row; View › Split View › Close Split View closes it");

  step("open-in-new-window");
  const created = app.waitForEvent("window");
  await rowMenu(A, ["Open in", "New window"]);
  const second = await created;
  second.setDefaultTimeout(12000);
  watch(second, "second");
  await hideWindows();
  await primaryTitle(second).filter({ hasText: NAMES[A] }).waitFor();
  assert.ok(second.url().includes("window=session"), "B27: a session popout");
  // A size of its own (a popout opens at 900x700).
  await size(second, 1280, 820);
  assert.equal(await second.locator(".source-sidebar").count(), 0, "the popout has no sidebar");
  assert.equal(await second.locator('[data-session-popout] [data-popout-dock]').count(), 1, "Open in main window");
  assert.equal(await second.locator('[data-session-popout] [data-popout-pin][aria-pressed="false"]').count(), 1, "Keep window on top");
  assert.equal(await selectedRow(), C, "the first window keeps its own selection");
  assert.equal((await mainWindowIds()).length, 1);
  assert.equal((await sessionPopoutIds()).length, 1);
  const firstId = await windowId(page), secondId = await windowId(second);
  report.metrics.windows = { firstId, secondId };
  // shared-11 Xo: asking again for a session that has a popout brings that popout forward instead of a second one.
  await rowMenu(A, ["Open in", "New window"]);
  await page.waitForTimeout(300);
  assert.equal((await sessionPopoutIds()).length, 1);
  report.checks.push("Open in new window opens the session in a sidebar-less session popout with Open in main window and Keep window on top; asking again for that session reuses the popout");

  step("menus-act-on-their-window");
  await clickMenu(["File", "New Session"], secondId);
  await poll(async () => (await primaryTitle(second).count()) === 0, "File › New Session reaches the targeted window");
  assert.equal(await titleOf(primaryTitle()), NAMES[C], "the other window is untouched");
  report.checks.push("Menu commands act on the window they target only");

  step("session-list-across-windows");
  const rowsBefore = await page.locator(".source-sidebar .source-session-row").count();
  const rowIds = () => page.evaluate(() => [...document.querySelectorAll(".source-sidebar [data-source-session-id]")].map((node) => node.dataset.sourceSessionId));
  const windowStartsBefore = await turnStarts();
  await countBadges();
  await sendIn(second, "fixture:complete from the second window");
  await second.getByText("Fixture response", { exact: true }).waitFor();
  // The draft popout became that session's popout (startSessionInDraftPopout); the first window lists the new row.
  const createdId = await poll(async () => (await rowIds()).find((id) => ![A, B, C].includes(id)) ?? null, "the second window opened its new session");
  await poll(async () => (await page.locator(".source-sidebar .source-session-row").count()) === rowsBefore + 1, "the first window's sidebar gains the new session");
  await row(createdId).waitFor();
  // main.cjs settles an automatic unread mark for 400 ms against the windows' layouts.
  await page.waitForTimeout(900);
  assert.equal(await turnStarts() - windowStartsBefore, 1, "a send in one window starts exactly one turn");
  assert.equal(await badges(), 1, "the finished turn notifies once with two windows open");
  assert.equal(await page.locator(`[data-source-session-id="${createdId}"][data-unread]`).count(), 0, "the first window does not mark a session the second window shows as unread");
  assert.notEqual((await readJson("preferences.json")).sessionMetadata?.[createdId]?.unread, true);
  report.checks.push("A session created in one window appears in the other window's sidebar (main.cjs session-list); its turn starts and notifies once and is not marked unread while the second window shows it");

  step("approval-across-windows");
  await openRow(createdId);
  await sendIn(page, "fixture:command-card");
  await page.locator('.sac-card[data-approval-kind="command"]').waitFor();
  await second.locator('.sac-card[data-approval-kind="command"]').waitFor();
  const cardState = (target) => target.evaluate(() => [...document.querySelectorAll(".sac-card")].map((node) => ({ kind: node.dataset.approvalKind, instance: node.dataset.approvalInstance, text: node.textContent.slice(0, 200) })));
  report.metrics.approvalBefore = { first: await cardState(page), second: await cardState(second) };
  // A grant click within 400 ms of the card arming is ignored on purpose (source-approval-card.jsx useAllowArming).
  await second.waitForTimeout(450);
  await second.locator('.sac-card[data-approval-kind="command"] [data-approval-action="accept"]').click();
  const responses = () => fs.readFile(path.join(profile, "fixture-responses.jsonl"), "utf8").catch(() => "");
  try {
    await second.locator('.sac-card[data-approval-kind="command"]').waitFor({ state: "detached" });
    await page.locator('.sac-card[data-approval-kind="command"]').waitFor({ state: "detached" });
  } catch (error) {
    report.metrics.approvalAfter = { first: await cardState(page), second: await cardState(second), responses: await responses(),
      secondErrors: await second.evaluate(() => [...document.querySelectorAll('[role="alert"], .sac-error')].map((node) => node.textContent)) };
    throw error;
  }
  // Answered once: the core received exactly one response for the request both windows showed.
  await page.locator(".transcript").getByText("APPROVAL_ACCEPTED", { exact: true }).waitFor();
  await second.locator(".transcript").getByText("APPROVAL_ACCEPTED", { exact: true }).waitFor();
  const answered = (await responses()).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.equal(answered.length, 1, "one approval response reaches the core");
  assert.equal(answered[0].result?.decision, "accept");
  report.checks.push("An approval for a session two windows show appears in both; answered in one, it leaves both and the core gets exactly one response");

  step("panes-in-second-window");
  await second.keyboard.press("Control+Backquote");
  await terminalIn(second).locator(".stp-xterm .xterm").waitFor();
  await poll(async () => /\$ ?$/m.test(await terminalText(second)), "the second window's shell prompt");
  await second.keyboard.type("echo second-window-$((6*7))");
  await second.keyboard.press("Enter");
  await poll(async () => /second-window-42/.test(await terminalText(second)), "the second window's terminal runs the command");
  await second.keyboard.press("Meta+Shift+KeyP");
  const secondPreview = second.locator('.source-side-tile[data-tile-id="preview"]');
  await secondPreview.waitFor();
  await secondPreview.getByRole("button", { name: "Run site", exact: true }).click();
  await poll(async () => (await previewViews(secondId)).some((url) => url.startsWith(`http://localhost:${sitePort}`)), "the page shows in the second window", 30000);
  assert.deepEqual(await previewViews(firstId), [], "the first window holds no preview view");
  await shot("second-window-panes", second);
  // The same session's Preview in the first window (2.2553.1 showPreview claimant): the second window's pane holds the
  // page, so the first pane is refused — no notice, an empty viewport — even after its 50/250/1000 ms retries.
  await page.keyboard.press("Meta+Shift+KeyP");
  const firstPreview = page.locator('.source-side-tile[data-tile-id="preview"]');
  await firstPreview.waitFor();
  await poll(async () => (await firstPreview.locator(".spv-pane").getAttribute("data-preview-surface")) === "page", "the first window's pane knows the page");
  await page.waitForTimeout(1600);
  assert.deepEqual(await previewViews(firstId), [], "the second window's pane keeps the page");
  assert.ok((await previewViews(secondId)).some((url) => url.startsWith(`http://localhost:${sitePort}`)));
  assert.equal(await firstPreview.getByText(/another pane|Show here/).count(), 0, "no showing-elsewhere notice");
  // The preview pane's server control is the original Dev servers menu (cf580efe9 preview server menu; preview-ui-test
  // source-server-menu-stop): the running row's pointer-only Stop action stops the server.
  await secondPreview.getByRole("button", { name: "Dev servers", exact: true }).click();
  const serverMenu = second.getByRole("menu", { name: "Dev servers", exact: true }); await serverMenu.waitFor();
  await serverMenu.getByRole("menuitem", { name: /site, Running/ }).locator('button[aria-label="Stop"]').click();
  const siteUp = () => new Promise((resolve) => { const request = http.get(`http://127.0.0.1:${sitePort}/`, (response) => { response.resume(); resolve(true); }); request.on("error", () => resolve(false)); request.setTimeout(1000, () => { request.destroy(); resolve(false); }); });
  await poll(async () => !(await siteUp()), "Stop site ends the dev server");
  await second.keyboard.press("Meta+Shift+KeyP");
  await secondPreview.waitFor({ state: "detached" });
  // Closing the holder's pane lets go of the page; the waiting pane takes it on its next layout change.
  await size(page, 1460, 900);
  await poll(async () => (await previewViews(firstId)).some((url) => url.startsWith(`http://localhost:${sitePort}`)), "the first window's pane takes the page");
  assert.deepEqual(await previewViews(secondId), [], "and the second window no longer holds it");
  await size(page, 1468, 900);
  await page.keyboard.press("Meta+Shift+KeyP");
  await firstPreview.waitFor({ state: "detached" });
  await terminalIn(second).locator(".stp-host").click();
  await second.keyboard.press("Control+Backquote");
  await terminalIn(second).waitFor({ state: "detached" });
  report.checks.push("In a second window the Terminal pane runs a shell and the Preview pane runs the session's dev server with its page laid over that window only; the first window's Preview of the same session is refused (no notice) until the second window's pane closes, then takes the page on its next layout change");

  step("file-new-window-and-close");
  const third = app.waitForEvent("window");
  await clickMenu(["File", "New Window"], firstId);
  const thirdPage = await third;
  watch(thirdPage, "third");
  await hideWindows();
  await thirdPage.getByRole("button", { name: "Model", exact: true }).first().waitFor();
  assert.ok(thirdPage.url().includes("window=session"), "cd377abb5 si: a code-draft popout");
  assert.equal(await thirdPage.locator(".source-sidebar").count(), 0);
  assert.equal(await primaryTitle(thirdPage).count(), 0, "File › New Window opens on the new-session page");
  assert.equal((await mainWindowIds()).length, 1);
  assert.equal((await sessionPopoutIds()).length, 2);
  const thirdId = await windowId(thirdPage);
  await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id).close(), thirdId);
  await poll(async () => (await sessionPopoutIds()).length === 1, "closing a popout closes it for good");
  assert.equal((await readJson("open-windows.json")).windows.length, 1, "popouts are never written as main windows");
  report.checks.push("File › New Window opens a new-session popout without sidebar; closing it destroys it, and open-windows.json keeps the main window only");

  step("relaunch-restores");
  const createdName = await titleOf(primaryTitle());
  await rowMenu(B, ["Open in", "Split view"]);
  await secondaryTitle().filter({ hasText: NAMES[B] }).waitFor();
  await poll(async () => { const saved = await readJson("open-windows.json"); return saved.windows.length === 1 && saved.windows[0].layout.split?.panes?.[0]?.sessionId === B; }, "layouts written before quit");
  await app.close(); app = null;
  const savedPopouts = await readJson("open-popouts.json");
  assert.ok(savedPopouts.popouts.some((entry) => entry.pane === "session" && entry.sessionId === createdId), "the session popout is saved at quit (cd377abb5 wr)");
  await launch();
  const launchedPage = page;
  await poll(async () => (await mainWindowIds()).length === 1 && (await sessionPopoutIds()).length === 1, "the main window and the session popout come back");
  // Both windows are created together at launch; whichever page Playwright saw first, the split one is the first window.
  page = await poll(async () => { for (const candidate of app.windows()) if (await splitOpen(candidate)) return candidate; return null; }, "the first window's split comes back");
  page.setDefaultTimeout(12000);
  await primaryTitle().filter({ hasText: createdName }).waitFor();
  await secondaryTitle().filter({ hasText: NAMES[B] }).waitFor();
  assert.equal(await focusedSide(), 1, "with the side that had the focus");
  const restoredPages = await poll(async () => { const list = app.windows().filter((candidate) => candidate !== page && candidate.url().includes("window=session")); return list.length ? list : null; }, "the popout's page");
  assert.equal(restoredPages.length, 1);
  restoredPages.forEach((candidate) => { if (candidate !== launchedPage) watch(candidate, "restored"); });
  if (page !== launchedPage) watch(page, "main");
  await primaryTitle(restoredPages[0]).filter({ hasText: createdName }).waitFor();
  report.metrics.relaunch = await readJson("open-windows.json");
  report.checks.push("A relaunch reopens the main window with its split and the session popout with the session it showed");

  assert.deepEqual(report.rendererErrors, []);
  await integrity();
  report.metrics.shownCalls = await app.evaluate(() => globalThis.__splitShown ?? []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  report.phase = phase;
  process.exitCode = 1;
  if (page) await shot("failure");
} finally {
  if (app) await app.close().catch(() => {});
  const bytes = JSON.stringify(report, null, 2) + "\n";
  await fs.writeFile(path.join(directory, "report.json"), bytes);
  await fs.writeFile(path.join(evidence, "split-windows-ui-report.json"), bytes);
  console.log(bytes);
}
