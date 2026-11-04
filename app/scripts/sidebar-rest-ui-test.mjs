import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Classic sidebar rest (2.2553.1 sidebar-groups / sidebar-session / items):
// multi-selection, count-based bulk menu, whitespace menu, nested lineage
// rows with fold handle and stub (incl. the awaiting "more" variant), no row
// hover card (official mq is disabled for every non-awaiting row), single-menu
// additions (Terminal, Move up/down only when movable, Fork, nested toggle,
// Delete), Older bucket bulk actions only with targets, and persisted pinned
// order. Runs only after a fresh
// build with no other GUI suite active; every row comes from the isolated
// protocol fixture (real thread/fork, thread/delete, thread/archive calls).
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `sidebar-rest-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const P = "rest-parent", F1 = "rest-fork-one", F2 = "rest-fork-two", M = "rest-middle", Q = "rest-quiet", R = "rest-reference", S = "rest-shelved";
const now = Math.floor(Date.now() / 1000), day = 86400;
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const turn = (id) => ({ id: `${id}-turn`, status: "completed", items: [userItem(`${id}-user`, `Request for ${id}`), textItem(`${id}-answer`, `Answer for ${id}`)] });
function thread(id, name, { updatedAt = now, preview = "", extra = {} } = {}) {
  return { id, name, cwd: workspace, createdAt: updatedAt - 10, updatedAt, archived: false, preview, turns: [turn(id)], ...extra };
}
const threads = {
  [P]: thread(P, "Parent session", { preview: "Parent preview text that the hover card shows as its body." }),
  [F1]: thread(F1, "Fork one", { updatedAt: now - 60, extra: { forkedFromId: P } }),
  [F2]: thread(F2, "Fork two", { updatedAt: now - 120, extra: { forkedFromId: P } }),
  [M]: thread(M, "Middle task", { updatedAt: now - 200, preview: "Middle preview." }),
  [Q]: thread(Q, "Quiet older task", { updatedAt: now - 10 * day, preview: "Quiet older preview for the card." }),
  [R]: thread(R, "Reference pinned", { updatedAt: now - 12 * day, preview: "Pinned preview." }),
  [S]: { ...thread(S, "Shelved task", { updatedAt: now - 3 * day }), archived: true },
};
const threadMetadata = Object.fromEntries(Object.values(threads).map(({ turns, ...meta }) => [meta.id, meta]));
await fs.writeFile(path.join(profile, "sidebar-rest-fixture.marker"), "isolated-sidebar-rest-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", sidebarWidth: 288, displayName: "Fixture",
  threadIds: [P, F1, F2, M, Q, R], archivedThreadIds: [S], threadMetadata,
  customGroups: [{ id: "g1", name: "Research" }], sessionMetadata: { [R]: { pinned: true } },
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, profileRemoved = false;
const testSources = ["scripts/sidebar-rest-ui-test.mjs", "tests/fixtures/codex-server.cjs"];
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
  for (const required of ["src/source-sidebar.jsx", "src/source-sidebar.css", "src/sidebar-model.js", "src/sidebar-selection.mjs",
    "src/main.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  assert.ok(!build.sources.some(entry => entry.path === "src/source-session-hover-card.jsx"), "the removed summary hover card must not be in the build");
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const configFile = path.join(profile, "preferences.json");
const readConfig = async () => JSON.parse(await fs.readFile(configFile, "utf8"));
const readThreads = async () => JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8"));
async function requests(method) {
  let text = "";
  try { text = await fs.readFile(path.join(profile, "fixture-requests.jsonl"), "utf8"); } catch { return []; }
  return text.split("\n").filter(Boolean).map(line => JSON.parse(line)).filter(entry => !method || entry.method === method);
}
async function poll(check, label, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await check()) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(`Timed out: ${label}`);
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const row = id => page.locator(`[data-source-session-id="${id}"]`);
const mainButton = id => row(id).locator(".source-session-open");
const sessionMenu = () => page.getByRole("menu", { name: "Session options", exact: true });
const hoverCard = () => page.locator("[data-session-hover-card], .source-hover-card, [data-cds=\"HoverCard\"], [role=\"tooltip\"]");
const stubOf = parent => page.locator(`.source-nested[data-nested-parent="${parent}"] .df-family-stub`);
const selectedIds = () => page.locator('.source-session-row[data-selected="focused"]').evaluateAll(nodes => nodes.map(node => node.dataset.sourceSessionId));
const currentIds = () => page.locator('[data-row-main-button][aria-current="page"]').evaluateAll(nodes => nodes.map(node => node.closest("[data-source-session-id]").dataset.sourceSessionId));
const visibleIds = () => page.locator(".source-session-row[data-source-session-id]").evaluateAll(nodes => nodes.filter(node => node.offsetParent !== null).map(node => node.dataset.sourceSessionId));
async function menuShape(menu) {
  return menu.evaluate(popup => [...popup.querySelectorAll('[role^="menuitem"], [role="separator"]')]
    .filter(node => node.closest('[role="menu"]') === popup)
    .map(node => node.getAttribute("role") === "separator" ? "—" : (node.dataset.label ?? node.querySelector(".smenu-label")?.textContent.trim() ?? node.textContent.trim())));
}
async function openDotsMenu(id) {
  await row(id).hover();
  await row(id).locator(".source-session-more").click();
  await sessionMenu().waitFor();
}
async function contextMenu(id) {
  await mainButton(id).click({ button: "right" });
  await sessionMenu().waitFor();
}
async function closeMenus() {
  await page.keyboard.press("Escape");
  await page.getByRole("menu").first().waitFor({ state: "detached" }).catch(() => {});
}
async function setFilter(submenu, choice) {
  await page.getByRole("button", { name: /^Filter(?: \(active\))?$/ }).click();
  const menu = page.getByRole("menu", { name: "Filter sessions", exact: true });
  const popup = page.getByRole("menu", { name: submenu, exact: true });
  // The submenu closes through the menu's own hover-intent tracking if the
  // pointer path from the trigger to the radio item leaves the safe polygon
  // (a pointer-timing race, not a product state): reopen it and retry once.
  for (let attempt = 0; ; attempt += 1) {
    await menu.getByRole("menuitem", { name: new RegExp(`^${submenu}`) }).click();
    await popup.waitFor();
    const item = popup.getByRole("menuitemradio", { name: choice, exact: true });
    await item.hover();
    try { await item.click({ timeout: 3000 }); break; }
    catch (error) { if (attempt >= 1 || !/detached|not attached|Timeout/.test(String(error))) throw error; }
  }
  await menu.waitFor({ state: "detached" });
}
async function launch() {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await row(P).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.evaluate(() => document.fonts.ready);
  await app.evaluate(({ shell }) => {
    globalThis.sidebarRestRevealed = []; globalThis.sidebarRestTerminals = [];
    shell.openPath = async folder => { globalThis.sidebarRestRevealed.push(folder); return ""; };
    globalThis.codeDesktopExternalOpeners.terminal = async cwd => { globalThis.sidebarRestTerminals.push(cwd); };
  });
  await page.mouse.move(700, 700);
}
async function relaunch() { await app.close(); app = null; await launch(); }
async function selectRange(first, last) {
  await mainButton(first).click({ modifiers: ["Shift"] });
  await mainButton(last).click({ modifiers: ["Shift"] });
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  await launch();
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");

  // 1. Nested lineage rows: container directly after the parent, 38px child inset, elbow geometry, sr-only lineage.
  assert.deepEqual(await visibleIds(), [R, P, F1, F2, M, Q], "pinned first, then the family and the rest by recency");
  metrics.nested = await page.evaluate(({ P, F1, F2 }) => {
    const parent = document.querySelector(`[data-source-session-id="${P}"]`);
    const container = parent.nextElementSibling;
    const rows = [...container.querySelectorAll(".source-session-row")];
    const groupRows = parent.closest(".source-group-rows").getBoundingClientRect();
    const first = rows[0], last = rows[rows.length - 1];
    const before = getComputedStyle(first, "::before"), beforeLast = getComputedStyle(last, "::before"), after = getComputedStyle(first, "::after");
    const authored = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } })
      .find(rule => rule.selectorText === ".source-nested > .source-session-row::before");
    return {
      containerClass: container.className, containerParent: container.dataset.nestedParent, ids: rows.map(node => node.dataset.sourceSessionId),
      childButtonInset: first.querySelector(".source-session-open").getBoundingClientRect().left - groupRows.left,
      rowPaddingLeft: getComputedStyle(first).paddingLeft,
      elbow: { left: beforeLast.left, width: beforeLast.width, height: beforeLast.height, borderLeft: beforeLast.borderLeftWidth, style: beforeLast.borderLeftStyle, radius: beforeLast.borderBottomLeftRadius },
      tick: { height: before.height, top: before.top }, rail: { borderLeft: after.borderLeftWidth, top: after.top },
      authoredBorder: authored?.style.borderLeft, authoredLeft: authored?.style.left,
      handle: (() => { const h = container.querySelector(".df-family-handle"); const s = getComputedStyle(h); const box = h.getBoundingClientRect(), c = container.getBoundingClientRect();
        return { expanded: h.getAttribute("aria-expanded"), tabIndex: h.tabIndex, left: box.left - c.left, top: box.top - c.top, bottomGap: c.bottom - box.bottom, width: box.width, radius: s.borderRadius }; })(),
      names: rows.map(node => node.querySelector(".source-session-open").textContent.trim()),
      handleCount: container.querySelectorAll(".df-family-handle").length,
    };
  }, { P, F1, F2 });
  assert.ok(metrics.nested.containerClass.includes("df-accordion-guide") && metrics.nested.containerClass.includes("source-nested"));
  assert.equal(metrics.nested.containerParent, P); assert.deepEqual(metrics.nested.ids, [F1, F2]);
  near(metrics.nested.childButtonInset, 38, "child main button inset from the group rows box (18 + 20)");
  assert.equal(metrics.nested.rowPaddingLeft, "38px");
  assert.equal(metrics.nested.elbow.left, "30.875px"); assert.equal(metrics.nested.elbow.width, "13px");
  assert.equal(metrics.nested.elbow.height, "13.625px", "elbow height reaches the 26px row midpoint + 0.625px");
  assert.equal(metrics.nested.elbow.style, "solid"); assert.equal(metrics.nested.elbow.radius, "4px");
  assert.match(metrics.nested.authoredBorder, /^1\.25px solid/, "authored 1.25px tree ink");
  assert.equal(metrics.nested.authoredLeft.replace(/\s+/g, ""), "calc(var(--df-row-px)+var(--df-group-indent,0px)+10.875px)", "authored elbow left (minifier strips spaces)");
  assert.ok(parseFloat(metrics.nested.elbow.borderLeft) >= 1 && parseFloat(metrics.nested.elbow.borderLeft) <= 1.25, `rendered border ${metrics.nested.elbow.borderLeft} is the snapped 1.25px`);
  assert.equal(metrics.nested.tick.height, "4px", "non-last child keeps a 4px corner piece plus the rail");
  assert.equal(metrics.nested.rail.top, "0px");
  assert.equal(metrics.nested.handleCount, 1); assert.equal(metrics.nested.handle.expanded, "true"); assert.equal(metrics.nested.handle.tabIndex, -1);
  near(metrics.nested.handle.left, 20, "handle left = group indent + 2"); near(metrics.nested.handle.top, 0, "handle top");
  near(metrics.nested.handle.bottomGap, 4, "handle bottom 4px"); near(metrics.nested.handle.width, 18, "handle width"); assert.equal(metrics.nested.handle.radius, "5px");
  assert.equal(metrics.nested.names[0], "Fork one Forked from Parent session", "child accessible name carries the sr-only lineage");
  assert.equal(await mainButton(F1).evaluate(node => getComputedStyle(node.querySelector(".sr-only")).position), "absolute");
  checks.push("Forked threads render in a df-accordion-guide run directly after their parent with 38px inset, 30.875px/13px/1.25px elbow, fold handle and sr-only 'Forked from' text");

  // c80a67939 g/_/b/x: the window items (Split view, New window) live inside the Open in submenu, so the top level has
  // no window rows and starts with Open in.
  const afterWindowItems = (shape) => { assert.ok(!shape.some(label => /^(Open in split view|Open in new window|Close split view|Split view|New window)$/.test(label)), JSON.stringify(shape)); return shape; };
  // 1b. Single menu order with children present, Open in submenu, pinned Move up/down.
  await openDotsMenu(P);
  metrics.singleMenuParent = await menuShape(sessionMenu());
  assert.deepEqual(afterWindowItems(metrics.singleMenuParent), ["Open in", "—", "Pin", "Mark as unread", "Rename", "Export", "Fork", "Hide nested sessions", "—", "Move to group", "—", "Keep computer awake", "—", "Archive", "Delete"]);
  assert.equal(await sessionMenu().getByRole("menuitem", { name: "Delete", exact: true }).getAttribute("data-variant"), "danger");
  await sessionMenu().getByRole("menuitem", { name: "Open in", exact: true }).click();
  // c80a67939 g/_/b: the layout section (Split view for a session this window does not show, New window), a separator,
  // then the installed editors (main.cjs installed-editors, whatever this Mac has), Terminal and Finder with no divider.
  const editorNames = (await page.evaluate(() => window.desktop.call("installed-editors"))).map(editor => editor.name);
  metrics.openInShape = await menuShape(page.getByRole("menu", { name: "Open in", exact: true }));
  const layoutRows = metrics.openInShape[0] === "Split view" ? ["Split view", "New window"] : ["New window"];
  assert.deepEqual(metrics.openInShape, [...layoutRows, "—", ...editorNames, "Terminal", "Finder"]);
  metrics.openInDigits = await page.getByRole("menu", { name: "Open in", exact: true }).evaluate(popup => [...popup.querySelectorAll('[role^="menuitem"]')].map(node => node.dataset.numberKey ?? null));
  assert.deepEqual(metrics.openInDigits, metrics.openInShape.filter(label => label !== "—").map((_, index) => (index < 9 ? String(index + 1) : null)), "rows are numbered 1-9");
  await page.getByRole("menu", { name: "Open in", exact: true }).getByRole("menuitem", { name: "Terminal", exact: true }).click();
  await poll(async () => (await app.evaluate(() => globalThis.sidebarRestTerminals)).includes(workspace), "open-terminal IPC reaches the launcher seam");
  await sessionMenu().waitFor({ state: "detached" });
  await openDotsMenu(R);
  metrics.singleMenuPinned = await menuShape(sessionMenu());
  assert.deepEqual(afterWindowItems(metrics.singleMenuPinned), ["Open in", "—", "Unpin", "Mark as unread", "Rename", "Export", "Fork", "—", "Move to group", "—", "Keep computer awake", "—", "Archive", "Delete"], "the only pinned row has neither Move up nor Move down (sidebar-session.js:16113-16114)");
  await closeMenus();
  checks.push("Single menu order: Open in(installed editors, Finder, Terminal) → sep → [Move up / Move down only when the pinned row can move] → Pin → Mark → Rename → Export → Fork → [Hide nested] → sep → Move to group → sep (ce4f4374c Yt && an) → Keep computer awake → sep → Archive → Delete(danger); Terminal reaches the validated open-terminal IPC");

  // 1c. Fold handle collapses to a 26px stub; the fold persists across restart.
  await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-handle`).click();
  await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-stub`).waitFor();
  metrics.stub = await page.locator(`.source-nested[data-nested-parent="${P}"]`).evaluate(container => {
    const stub = container.querySelector(".df-family-stub");
    const authored = [...document.styleSheets].flatMap(sheet => { try { return [...sheet.cssRules]; } catch { return []; } }).find(rule => rule.selectorText === ".df-family-stub");
    return { rows: container.querySelectorAll(".source-session-row").length, expanded: container.querySelector(".df-family-handle").getAttribute("aria-expanded"),
      height: stub.getBoundingClientRect().height, text: stub.textContent.trim(), label: stub.getAttribute("aria-label"), font: getComputedStyle(stub).fontSize, radius: getComputedStyle(stub).borderRadius,
      paddingLeft: getComputedStyle(stub).paddingLeft, paddingRight: getComputedStyle(stub).paddingRight, authoredPadding: authored?.style.padding || authored?.cssText,
      iconlessPad: getComputedStyle(stub.closest(".df-session-list")).getPropertyValue("--df-iconless-pad").trim(), meta: stub.querySelectorAll(".source-nested-stub-meta").length };
  });
  assert.equal(metrics.stub.rows, 0); assert.equal(metrics.stub.expanded, "false"); near(metrics.stub.height, 26, "stub row height");
  assert.equal(metrics.stub.text, "2 nested sessions"); assert.equal(metrics.stub.label, "Show 2 nested sessions"); assert.equal(metrics.stub.font, "12px"); assert.equal(metrics.stub.radius, "6px");
  assert.equal(metrics.stub.iconlessPad, "10px", "shared-styles .df-session-list --df-iconless-pad");
  assert.equal(metrics.stub.paddingLeft, "12px", "oI padding-left = row-px 2 + iconless-pad 10 (no family indent)"); assert.equal(metrics.stub.paddingRight, "2px");
  assert.ok(metrics.stub.authoredPadding.replace(/\s+/g, "").endsWith("calc(var(--df-row-px)+var(--df-iconless-pad,calc((var(--df-leading-slot)-var(--df-icon-size))/2)))"), `authored oI padding-left expression (minifier strips spaces): ${metrics.stub.authoredPadding}`);
  assert.equal(metrics.stub.meta, 0, "idle hidden children show no unread/working meta");
  await poll(async () => (await readConfig()).sidebarPreferences?.collapsedNested?.includes(P), "collapsedNested persisted");
  assert.deepEqual(await visibleIds(), [R, P, M, Q], "collapsed children leave the visible order");
  await relaunch();
  await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-stub`).waitFor();
  assert.equal(await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-handle`).getAttribute("aria-expanded"), "false");
  await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-stub`).click();
  await row(F2).waitFor();
  assert.equal(await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-handle`).getAttribute("aria-expanded"), "true");
  await poll(async () => !(await readConfig()).sidebarPreferences.collapsedNested.includes(P), "unfold persisted");
  checks.push("Fold handle hides the children behind a 26px '2 nested sessions' stub at the oI padding (row-px + 10px iconless pad), persists through restart via sidebarPreferences.collapsedNested, and the stub unfolds");

  // 1d. Awaiting child stays listed while folded (JF), the stub counts the rest as "more"
  //     (jK) and a running hidden child is a plain "{n} working" (ZF/oI: no dot, no accent).
  await mainButton(F2).click();
  await poll(async () => (await currentIds()).join() === F2, "F2 opened");
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("fixture:hold");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor();
  await mainButton(F1).click();
  await poll(async () => (await currentIds()).join() === F1, "F1 opened");
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("Nested approval fixture");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  const approvalCard = page.locator('[data-approval-presentation="card"][data-approval-method="item/commandExecution/requestApproval"]');
  await approvalCard.waitFor();
  await page.waitForFunction(id => document.querySelector(`[data-source-session-id="${id}"] [role="status"][aria-label="Awaiting input"]`) !== null, F1);
  await page.locator(`.source-nested[data-nested-parent="${P}"] .df-family-handle`).click();
  await stubOf(P).waitFor();
  metrics.stubMore = await page.locator(`.source-nested[data-nested-parent="${P}"]`).evaluate(container => {
    const stub = container.querySelector(".df-family-stub"), meta = [...stub.querySelectorAll(".source-nested-stub-meta")];
    const working = meta.map(node => node.lastElementChild).find(node => node.textContent.includes("working"));
    return { rows: [...container.querySelectorAll(".source-session-row")].map(node => node.dataset.sourceSessionId), text: stub.textContent.trim(), label: stub.getAttribute("aria-label"),
      meta: meta.map(node => node.textContent.trim()), workingDots: working?.querySelectorAll(".status-dot").length ?? null, workingAccent: working?.classList.contains("is-accent") ?? null,
      workingColor: working ? getComputedStyle(working).color : null, stubColor: getComputedStyle(stub).color };
  });
  assert.deepEqual(metrics.stubMore.rows, [F1], "the awaiting child stays listed while folded");
  assert.equal(metrics.stubMore.text, "1 more nested session·1 working", "stub text + '·' + plain working count (no whitespace nodes)");
  assert.equal(metrics.stubMore.label, "Show 1 more nested session", "aria-label without news: 'Show {sessions}'");
  assert.deepEqual(metrics.stubMore.meta, ["·1 working"]);
  assert.equal(metrics.stubMore.workingDots, 0, "working count has no status dot"); assert.equal(metrics.stubMore.workingAccent, false, "working count is not accent");
  assert.equal(metrics.stubMore.workingColor, metrics.stubMore.stubColor, "working count inherits the stub text colour");
  assert.deepEqual(await visibleIds(), [R, P, F1, M, Q]);
  await approvalCard.getByRole("button", { name: "Deny", exact: true }).click();
  await page.locator(".assistant-message").filter({ hasText: "APPROVAL_DENIED" }).waitFor();
  await page.waitForFunction(id => document.querySelector(`[data-source-session-id="${id}"]`) === null, F1);
  await poll(async () => (await stubOf(P).textContent()).trim() === "2 nested sessions·1 working", "once denied, F1 folds away and the stub drops 'more'");
  await stubOf(P).click();
  await row(F2).waitFor(); await row(F1).waitFor();
  await mainButton(F2).click();
  await poll(async () => (await currentIds()).join() === F2, "F2 opened to stop it");
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await poll(async () => !(await readConfig()).sidebarPreferences.collapsedNested.includes(P), "unfolded again");
  checks.push("While folded, an awaiting child stays listed and the stub reads '1 more nested session · 1 working' (aria 'Show 1 more nested session'; working count plain, no dot/accent); after Deny the child folds away and the stub returns to '2 nested sessions'");

  // 2. No summary hover card: 2.2553.1 mounts mq with disabled unless the row awaits input
  //    (sidebar-groups.js:17222-17229) and gates it on a feature flag, so an idle row shows nothing.
  await page.mouse.move(700, 700);
  await sleep(250);
  await row(Q).hover();
  await sleep(1200);
  metrics.hoverIdle = { cards: await hoverCard().count(), portals: await page.locator("body > [data-session-hover-card], body > .source-hover-card").count() };
  assert.equal(metrics.hoverIdle.cards, 0, "no hover card / tooltip after 1.2s over an idle row with a preview");
  assert.equal(metrics.hoverIdle.portals, 0);
  await mainButton(M).focus();
  await sleep(700);
  assert.equal(await hoverCard().count(), 0, "keyboard focus on a row opens nothing either");
  await page.mouse.move(700, 700);
  checks.push("No summary hover card: hovering an idle row (with a Codex preview) for 1.2s or focusing its main button renders no card, matching mq disabled for non-awaiting rows");

  // 3. Selection: shift range, cmd toggle, Escape, outside pointerdown, plain click clears and opens.
  // Children list by recency (line 165). Step 1's Deny (F1) and Stop (F2) both end turns, so either fork can be the
  // newest here (the F01 log's "Fork two above Fork one" flake): the range runs over the visible order and ends on
  // whichever fork is the family's last row.
  const [midFork, lastFork] = (await visibleIds()).filter(id => id === F1 || id === F2);
  await mainButton(P).click();
  await poll(async () => (await currentIds()).join() === P, "P opened");
  await mainButton(P).click({ modifiers: ["Shift"] });
  assert.deepEqual(await selectedIds(), [P], "shift-click without an anchor selects only the target");
  await mainButton(lastFork).click({ modifiers: ["Shift"] });
  assert.deepEqual(await selectedIds(), [P, midFork, lastFork]);
  // ⇧⌘-click toggles one row (2.2553.1 sidebar-groups H); ⌘-click alone opens the session in its own window.
  await mainButton(midFork).click({ modifiers: ["Shift", "Meta"] });
  assert.deepEqual(await selectedIds(), [P, lastFork], "shift-cmd-click removes one row");
  await page.keyboard.press("Escape");
  await poll(async () => (await selectedIds()).join() === P, "Escape clears the selection; the open row keeps its focused state");
  await selectRange(P, lastFork);
  assert.deepEqual(await selectedIds(), [P, midFork, lastFork]);
  // A blank point of the sidebar outside every row (the session list below its last row, else the bottom tray's gap
  // above the account footer): Routines is a nav row now, so the old section label is gone.
  const blank = await page.evaluate(() => {
    const nav = document.querySelector("nav.source-session-list").getBoundingClientRect();
    const rows = [...document.querySelectorAll("nav.source-session-list .source-session-row, nav.source-session-list .source-group-heading")].map((node) => node.getBoundingClientRect().bottom);
    const last = Math.max(nav.top, ...rows);
    if (nav.bottom - last >= 8) return { x: nav.left + nav.width / 2, y: (last + nav.bottom) / 2 };
    const tray = document.querySelector(".df-bottom-tray").getBoundingClientRect();
    return { x: tray.left + tray.width / 2, y: tray.top + 3 };
  });
  await page.mouse.click(Math.round(blank.x), Math.round(blank.y));
  await poll(async () => (await selectedIds()).join() === P, "pointerdown outside rows clears the selection");
  await selectRange(P, lastFork);
  await mainButton(M).click();
  await poll(async () => (await currentIds()).join() === M && (await selectedIds()).join() === M, "plain click clears and opens the clicked row");
  checks.push("Shift range over the visible order, cmd-click toggle, Escape and outside pointerdown clearing, plain click clears then opens with aria-current only on the opened row");

  // 4. Multi menu on a selected row: exact shape, 'u' marks unread and clears, digit moves to group.
  await mainButton(P).click();
  await poll(async () => (await currentIds()).join() === P, "P opened again");
  await selectRange(P, lastFork);
  await contextMenu(F1);
  metrics.multiMenu = await menuShape(sessionMenu());
  // B10 (ce4f4374c Me): Pin {count} while some selected row is unpinned, Set model for {count} over the core's catalog.
  assert.deepEqual(metrics.multiMenu, ["Pin 3", "Mark 3 as unread", "Move 3 to group", "Set model for 3", "—", "Archive 3", "Delete 3"]);
  assert.equal(await sessionMenu().getByRole("menuitem", { name: "Delete 3", exact: true }).getAttribute("data-variant"), "danger");
  await page.keyboard.press("u");
  await sessionMenu().waitFor({ state: "detached" });
  await poll(async () => { const config = await readConfig(); return [P, F1, F2].every(id => config.sessionMetadata[id]?.unread === true); }, "three threads marked unread");
  // The config file is saved before the last of the three concurrent IPC
  // responses reaches the renderer: wait on the rows, not the file.
  await page.waitForFunction(ids => ids.every(id => document.querySelector(`[data-source-session-id="${id}"]`)?.dataset.unread === "true"), [P, F1, F2]);
  assert.deepEqual(await selectedIds(), [P], "selection cleared after the bulk action");
  await selectRange(P, lastFork);
  await contextMenu(F1);
  await sessionMenu().getByRole("menuitem", { name: "Move 3 to group", exact: true }).click();
  const moveMenu = page.getByRole("menu", { name: "Move 3 to group", exact: true });
  await moveMenu.waitFor();
  metrics.moveMenu = await menuShape(moveMenu);
  metrics.moveMenuFocus = await page.evaluate(() => ({ label: document.activeElement?.dataset?.label ?? null, tag: document.activeElement?.tagName, inSubmenu: !!document.activeElement?.closest('[role="menu"][data-menu-depth="1"]') }));
  assert.deepEqual(metrics.moveMenu, ["Research", "—", "Ungrouped", "—", "New group…"]);
  assert.equal(await moveMenu.getByRole("menuitem", { name: "Research", exact: true }).getAttribute("data-number-key"), "1");
  await page.keyboard.press("1");
  await sessionMenu().waitFor({ state: "detached" });
  await poll(async () => { const config = await readConfig(); return [P, F1, F2].every(id => config.sessionMetadata[id]?.customGroupId === "g1"); }, "digit 1 moved three threads to the first group");
  // HANDOFF 0.2.124: as for 'u' above, the file lands before the last concurrent response reaches the renderer;
  // runBulk clears the selection only after all of them settle (source-sidebar.jsx runBulk). r1 read [P,F1,F2] here.
  await poll(async () => (await selectedIds()).join() === P, "selection cleared after the bulk move");
  assert.deepEqual(await selectedIds(), [P]);
  await setFilter("Group by", "Custom groups");
  assert.equal(await page.locator('[data-group-key="custom:g1"] .source-session-row').count(), 3, "the group's row count increased by 3");
  await setFilter("Group by", "Folder");
  checks.push("Multi menu = Pin 3 / Mark 3 as unread / Move 3 to group / Set model for 3 / sep / Archive 3 / Delete 3(danger); 'u' marks all three unread and clears; digit 1 in the move submenu assigns the first group");

  // 5. Bulk archive skips the open session, reports 'Archived 2 sessions' and clears the selection.
  // Fidelity F08: the report is a neutral CDS toast (sidebar-groups.js:6219-6240 Ro addSuccess, key
  // group-bulk-archive), not the old sidebar status row.
  const archivesBefore = (await requests("thread/archive")).length;
  await selectRange(P, lastFork);
  await contextMenu(F1);
  await sessionMenu().getByRole("menuitem", { name: "Archive 3", exact: true }).click();
  const archiveClicked = Date.now();
  const bulkToast = page.locator('.source-toast-card[data-variant="neutral"]:not([data-phase="ending"])').filter({ hasText: "Archived 2 sessions" });
  await bulkToast.waitFor({ timeout: 1000 });
  metrics.statusAppearedMs = Date.now() - archiveClicked;
  assert.equal(await bulkToast.locator(".source-toast-message").textContent(), "Archived 2 sessions");
  assert.equal(await page.locator("[data-sidebar-status], .source-sidebar-status").count(), 0, "no inline sidebar status row");
  assert.equal((await requests("thread/archive")).length - archivesBefore, 2, "exactly two thread/archive calls; the open session is skipped");
  await row(F1).waitFor({ state: "detached" }); await row(F2).waitFor({ state: "detached" });
  assert.deepEqual(await selectedIds(), [P]);
  assert.equal(await row(P).count(), 1, "the open session stays");
  await bulkToast.getByRole("button", { name: "Dismiss", exact: true }).click();
  await bulkToast.waitFor({ state: "detached" });
  checks.push("Archive 3 with the open session selected issues exactly two thread/archive calls, shows an 'Archived 2 sessions' toast, and clears the selection");

  // 6. Fork 'f' via the document-level hotkey; rename textbox letters never trigger hotkeys.
  const forksBefore = (await requests("thread/fork")).length;
  await contextMenu(Q);
  await page.keyboard.press("f");
  await sessionMenu().waitFor({ state: "detached" });
  await poll(async () => (await requests("thread/fork")).length === forksBefore + 1, "one thread/fork call");
  const forkContainer = page.locator(`.source-nested[data-nested-parent="${Q}"]`);
  await forkContainer.waitFor();
  const forkId = await forkContainer.locator(".source-session-row").first().getAttribute("data-source-session-id");
  assert.ok(forkId && forkId !== Q);
  assert.equal(await row(Q).evaluate(node => node.nextElementSibling?.dataset.nestedParent), Q, "the real fork renders nested directly after its source");
  assert.equal(await (await readThreads()).threads[forkId].forkedFromId, Q);
  assert.equal((await readConfig()).sessionMetadata[forkId]?.forkedFrom, Q);
  await openDotsMenu(M);
  await sessionMenu().getByRole("menuitem", { name: "Rename", exact: true }).click();
  // F08: the inline field is labelled 'Rename' (sidebar-rows.js:7400-7420).
  const rename = page.locator(".source-sidebar").getByRole("textbox", { name: "Rename", exact: true });
  await rename.waitFor();
  await rename.press("End");
  await rename.type("pad");
  await sleep(150);
  assert.equal(await rename.inputValue(), "Middle taskpad");
  assert.equal(await page.locator('[data-group-key="pinned"] .source-session-row').count(), 1, "typing p into the rename box did not pin");
  assert.equal((await readConfig()).sessionMetadata[M]?.pinned, undefined);
  await rename.press("Escape");
  await rename.waitFor({ state: "detached" });
  assert.equal((await readThreads()).threads[M].name, "Middle task");
  checks.push("'f' while the row menu is open sends thread/fork and the fork appears nested under its source; letters typed into the rename textbox never fire hotkeys");

  // 7. Older bucket overflow: hidden at rest, 60% on heading hover, Archive all (1) with confirm → one thread/archive.
  await setFilter("Group by", "Date");
  const older = page.locator('[data-group-key="older"]');
  await older.waitFor();
  assert.deepEqual(await older.locator(".source-session-row").evaluateAll(nodes => nodes.map(n => n.dataset.sourceSessionId)), [Q], "R is pinned, so only Q is an older row");
  const olderButton = older.getByRole("button", { name: "Bulk actions for older sessions", exact: true });
  await mainButton(Q).click();
  await poll(async () => (await currentIds()).join() === Q, "Q opened");
  await older.locator(".source-group-heading").hover();
  await sleep(200);
  assert.equal(await olderButton.count(), 0, "Vz returns null while nothing in the bucket is archivable or deletable (the only older row is open)");
  await mainButton(P).click();
  await poll(async () => (await currentIds()).join() === P, "P opened again");
  await olderButton.waitFor();
  await page.mouse.move(700, 700);
  metrics.olderRest = await olderButton.evaluate(node => getComputedStyle(node).opacity);
  assert.equal(metrics.olderRest, "0");
  await older.locator(".source-group-heading").hover();
  await poll(async () => Math.abs(parseFloat(await olderButton.evaluate(node => getComputedStyle(node).opacity)) - .6) < .01, "60% on heading hover");
  await olderButton.click();
  const olderMenu = page.getByRole("menu", { name: "Older sessions", exact: true });
  await olderMenu.waitFor();
  assert.deepEqual(await menuShape(olderMenu), ["Archive all (1)", "Delete all (1)"]);
  assert.equal(await olderMenu.getByRole("menuitem", { name: "Delete all (1)", exact: true }).getAttribute("data-variant"), "danger");
  await poll(async () => await olderButton.evaluate(node => getComputedStyle(node).opacity) === "1", "100% while expanded (after the 120ms opacity transition)");
  await olderMenu.getByRole("menuitem", { name: "Archive all (1)", exact: true }).click();
  const olderDialog = page.getByRole("alertdialog", { name: "Archive older sessions?", exact: true });
  await olderDialog.waitFor();
  assert.equal(await olderDialog.locator(".source-confirm-body").textContent(), "This will archive 1 session older than a week. Pinned sessions aren’t affected.");
  const olderArchivesBefore = (await requests("thread/archive")).length;
  // Fidelity F01: the non-danger confirm is the CDS primary Button (shared-frame-C_2npUJq.js:2722
  // text-on-primary on :2748-2749 bg-fill-primary); the old undefined --cds-text-on-primary made the
  // label inherit the dialog's text colour, i.e. the fill colour. Checked in light and dark.
  const confirmPaint = () => olderDialog.getByRole("button", { name: "Archive all", exact: true }).evaluate(node => {
    const channels = value => { const parts = value.match(/[\d.]+/g).map(Number); return value.startsWith("color(") ? parts.slice(0, 3).map(part => part * 255) : parts.slice(0, 3); };
    const luminance = value => { const [r, g, b] = channels(value).map(part => { const c = part / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    // Fidelity F02: the confirm is the CDS Button of the shared ConfirmationDialog; its fill is the paint layer.
    // Its paint fades colour over duration-fast; finish that transition, as a real theme flip does (theme-command-model finishColorTransitions).
    const paint = node.querySelector('[data-cds-part="paint"]') ?? node;
    for (const animation of paint.getAnimations()) animation.finish();
    const style = getComputedStyle(node), fill = getComputedStyle(paint).backgroundColor;
    const [a, b] = [luminance(style.color), luminance(fill)].sort((x, y) => y - x);
    return { mode: document.documentElement.dataset.mode, color: style.color, background: fill, contrast: Math.round((a + .05) / (b + .05) * 100) / 100 };
  });
  metrics.archiveAllConfirm = [await confirmPaint()];
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  metrics.archiveAllConfirm.push(await confirmPaint());
  await page.evaluate(() => { document.documentElement.dataset.mode = "light"; });
  assert.deepEqual(metrics.archiveAllConfirm.map(paint => paint.mode), ["light", "dark"]);
  for (const paint of metrics.archiveAllConfirm) {
    assert.notEqual(paint.color, paint.background, `${paint.mode}: label colour differs from the fill`);
    assert.ok(paint.contrast >= 4.5, `${paint.mode}: label contrast ${paint.contrast} >= 4.5`);
  }
  await olderDialog.getByRole("button", { name: "Archive all", exact: true }).click();
  await olderDialog.waitFor({ state: "detached" });
  await row(Q).waitFor({ state: "detached" });
  assert.equal((await requests("thread/archive")).length - olderArchivesBefore, 1);
  // F08: sidebar-groups.js:18866-18872 olderBulkArchived toast (key archive-older-bulk).
  await page.locator('.source-toast-card[data-variant="neutral"] .source-toast-message').filter({ hasText: "Archived 1 older session" }).waitFor();
  await olderButton.waitFor({ state: "detached" });
  await setFilter("Group by", "Folder");
  checks.push("Older bucket exposes 'Bulk actions for older sessions' only while a target exists (absent when the sole older row is the open session), opacity 0 → 0.6 on heading hover → 1 expanded, Archive all (1)/Delete all (1); confirming archives exactly one thread and leaves the pinned old row alone; the Archive all confirm label (--cds-on-primary) contrasts with its fill in light and dark");

  // 8. Pinned order: Move down swaps and persists through restart.
  await openDotsMenu(P);
  await sessionMenu().getByRole("menuitem", { name: "Pin", exact: true }).click();
  await poll(async () => (await page.locator('[data-group-key="pinned"] .source-session-row').evaluateAll(n => n.map(x => x.dataset.sourceSessionId))).join() === [P, R].join(), "P pinned above R");
  await openDotsMenu(P);
  metrics.pinnedFirstMenu = await menuShape(sessionMenu());
  assert.deepEqual(afterWindowItems(metrics.pinnedFirstMenu).slice(0, 4), ["Open in", "—", "Move down", "Unpin"], "first of two pinned rows: Move down only");
  await sessionMenu().getByRole("menuitem", { name: "Move down", exact: true }).click();
  await poll(async () => (await page.locator('[data-group-key="pinned"] .source-session-row').evaluateAll(n => n.map(x => x.dataset.sourceSessionId))).join() === [R, P].join(), "Move down swapped the pinned rows");
  await poll(async () => JSON.stringify((await readConfig()).pinnedOrder) === JSON.stringify([R, P]), "pinnedOrder persisted");
  await relaunch();
  assert.deepEqual(await page.locator('[data-group-key="pinned"] .source-session-row').evaluateAll(n => n.map(x => x.dataset.sourceSessionId)), [R, P]);
  await openDotsMenu(P);
  metrics.pinnedLastMenu = await menuShape(sessionMenu());
  assert.deepEqual(afterWindowItems(metrics.pinnedLastMenu).slice(0, 4), ["Open in", "—", "Move up", "Unpin"], "last pinned row: Move up only");
  await closeMenus();
  checks.push("Move down on the first pinned row (its menu offers Move down only) swaps it with the second; config.pinnedOrder survives restart and the now-last row offers Move up only");

  // 8b. B10 row drag (shared-19 DY/QJ/LY): reorder inside Pinned, Release to unpin below it, drag back in to pin.
  const pinnedIdsNow = () => page.locator('[data-group-key="pinned"] .source-session-row').evaluateAll(n => n.map(x => x.dataset.sourceSessionId));
  const dragRowTo = async (id, toY, check) => {
    const box = await page.locator(`[data-source-session-id="${id}"]`).boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let index = 1; index <= 8; index++) await page.mouse.move(x, y + (toY - y) * index / 8);
    if (check) await check();
    await page.mouse.up();
  };
  let reference = await page.locator(`[data-source-session-id="${R}"]`).boundingBox();
  await dragRowTo(P, reference.y + 3, async () => {
    await page.locator(`[data-source-session-id="${P}"][style*="visibility: hidden"]`).waitFor({ state: "attached" });
    metrics.dragShift = await page.locator(`[data-source-session-id="${R}"]`).evaluate((node) => node.style.transform);
  });
  // One row step = --df-row-h 26 + --df-row-stack-gap; 2.31226.0 shared-styles-CTu5t_TM sets
  // `.dframe-sidebar[data-code-list]{--df-row-stack-gap:2px}` (rows carry that margin-bottom), so 28px (was 26 + 1).
  assert.equal(metrics.dragShift, "translateY(28px)", "the row above opens a one-row gap");
  await poll(async () => (await pinnedIdsNow()).join() === [P, R].join(), "dragging P above R reorders Pinned");
  await poll(async () => JSON.stringify((await readConfig()).pinnedOrder) === JSON.stringify([P, R]), "drag reorder persisted");
  const pinnedBottom = (await page.locator('[data-group-key="pinned"]').boundingBox());
  await dragRowTo(P, pinnedBottom.y + pinnedBottom.height + 12, () => page.locator(".source-drag-ghost [data-drag-label]").filter({ hasText: "Release to unpin" }).first().waitFor());
  await poll(async () => (await pinnedIdsNow()).join() === R, "Release to unpin unpins P");
  assert.equal((await readConfig()).sessionMetadata[P]?.pinned, false);
  reference = await page.locator(`[data-source-session-id="${R}"]`).boundingBox();
  await dragRowTo(P, reference.y + reference.height - 3);
  await poll(async () => (await pinnedIdsNow()).join() === [R, P].join(), "dragging P into Pinned below R pins it last");
  await poll(async () => JSON.stringify((await readConfig()).pinnedOrder) === JSON.stringify([R, P]), "drag pin order persisted");
  checks.push("Row drag: a pinned row lifted over the first slot hides in place and opens a 28px gap, dropping reorders Pinned (pinnedOrder saved); below the list the ghost says Release to unpin and dropping unpins; an unpinned row dropped under the last pinned row pins it there");

  // 9. Delete: single confirm, bulk confirm with count, restart proof, running-thread Delete disabled.
  await openDotsMenu(M);
  await sessionMenu().getByRole("menuitem", { name: "Delete", exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete session?", exact: true });
  await deleteDialog.waitFor();
  assert.equal(await deleteDialog.locator(".source-confirm-body").textContent(), "“Middle task” will be permanently deleted. This can’t be undone.");
  await deleteDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await deleteDialog.waitFor({ state: "detached" });
  await row(M).waitFor({ state: "detached" });
  assert.deepEqual((await requests("thread/delete")).map(entry => entry.params.threadId), [M]);
  await setFilter("Status", "All");
  await row(F1).waitFor(); await row(F2).waitFor();
  // Fidelity F08: sidebar-groups.js:8756 CA (text-muted opacity-50) and CO (Archive sm, labelled 'Archived').
  metrics.archivedRow = await row(F1).evaluate(node => ({ opacity: getComputedStyle(node).opacity, archived: node.dataset.archived,
    label: node.querySelector('.source-leading-slot [role="img"]')?.getAttribute("aria-label"), iconSize: getComputedStyle(node.querySelector(".source-status-archived")).fontSize }));
  assert.deepEqual(metrics.archivedRow, { opacity: "0.5", archived: "true", label: "Archived", iconSize: "16px" });
  await selectRange(F1, F2);
  assert.deepEqual((await selectedIds()).sort(), [F1, F2].sort());
  await contextMenu(F2);
  assert.deepEqual(await menuShape(sessionMenu()), ["Pin 2", "Mark 2 as unread", "Move 2 to group", "Set model for 2", "—", "Unarchive 2", "Delete 2"], "all-archived selection offers Unarchive");
  await sessionMenu().getByRole("menuitem", { name: "Delete 2", exact: true }).click();
  const bulkDialog = page.getByRole("alertdialog", { name: "Delete 2 sessions?", exact: true });
  await bulkDialog.waitFor();
  assert.equal(await bulkDialog.locator(".source-confirm-body").textContent(), "These 2 sessions will be permanently deleted. This can’t be undone.");
  await bulkDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await bulkDialog.waitFor({ state: "detached" });
  await row(F1).waitFor({ state: "detached" }); await row(F2).waitFor({ state: "detached" });
  await page.locator('.source-toast-card[data-variant="neutral"] .source-toast-message').filter({ hasText: "Deleted 2 sessions" }).waitFor();
  assert.deepEqual((await requests("thread/delete")).map(entry => entry.params.threadId).sort(), [F1, F2, M].sort());
  await setFilter("Status", "Active");
  await relaunch();
  const afterDelete = await readConfig();
  for (const id of [M, F1, F2]) {
    assert.ok(!afterDelete.threadIds.includes(id) && !afterDelete.archivedThreadIds.includes(id), `${id} removed from config lists`);
    assert.equal(afterDelete.threadMetadata[id], undefined); assert.equal(afterDelete.sessionMetadata[id], undefined);
    assert.equal((await readThreads()).threads[id], undefined);
  }
  assert.equal(await row(M).count(), 0);
  await mainButton(P).click();
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).fill("fixture:hold");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor();
  await contextMenu(P);
  assert.equal(await sessionMenu().getByRole("menuitem", { name: "Delete", exact: true }).getAttribute("aria-disabled"), "true", "a running thread cannot be deleted");
  assert.equal(await sessionMenu().getByRole("menuitem", { name: "Fork", exact: true }).getAttribute("aria-disabled"), "true");
  await page.keyboard.press("d");
  await sleep(200);
  assert.equal(await page.getByRole("dialog").or(page.getByRole("alertdialog")).count(), 0, "the disabled hotkey does nothing");
  await closeMenus();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  const deletesBefore = (await requests("thread/delete")).length;
  assert.equal(deletesBefore, 3, "no thread/delete was issued for the running thread");
  checks.push("Single Delete and bulk Delete N confirm in a role=dialog with the count, send thread/delete per id, remove rows and every config record across restart; a running thread's Delete/Fork are disabled");

  // 10. Whitespace menu: Select all, then Archive/Delete selected counts excluding pinned and the open session.
  await mainButton(P).click();
  await poll(async () => (await currentIds()).join() === P, "P open");
  const nav = await page.locator(".source-session-list").boundingBox();
  await page.mouse.click(nav.x + nav.width / 2, nav.y + nav.height - 6, { button: "right" });
  const listMenu = page.getByRole("menu", { name: "Sessions list options", exact: true });
  await listMenu.waitFor();
  assert.deepEqual(await menuShape(listMenu), ["Select all"], "nothing selected yet: no bulk items");
  await listMenu.getByRole("menuitem", { name: "Select all", exact: true }).click();
  await listMenu.waitFor({ state: "detached" });
  const visible = await visibleIds();
  assert.deepEqual(await selectedIds(), visible, "every visible row is selected");
  assert.ok(visible.length >= 3);
  await page.mouse.click(nav.x + nav.width / 2, nav.y + nav.height - 6, { button: "right" });
  await listMenu.waitFor();
  const pinnedIds = await page.locator('[data-group-key="pinned"] .source-session-row').evaluateAll(n => n.map(x => x.dataset.sourceSessionId));
  const expected = visible.filter(id => !pinnedIds.includes(id) && id !== P).length;
  metrics.whitespace = { visible, pinnedIds, expected, shape: await menuShape(listMenu) };
  assert.deepEqual(metrics.whitespace.shape, ["Select all", "—", `Archive selected (${expected})`, `Delete selected (${expected})`]);
  assert.equal(await listMenu.getByRole("menuitem", { name: `Delete selected (${expected})`, exact: true }).getAttribute("data-variant"), "danger");
  await listMenu.getByRole("menuitem", { name: `Delete selected (${expected})`, exact: true }).click();
  const wsDialog = page.getByRole("alertdialog", { name: expected === 1 ? "Delete session?" : `Delete ${expected} sessions?`, exact: true });
  await wsDialog.waitFor();
  await wsDialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await wsDialog.waitFor({ state: "detached" });
  assert.equal((await requests("thread/delete")).length, deletesBefore, "cancel sends nothing");
  await page.keyboard.press("Escape");
  await poll(async () => (await selectedIds()).join() === P, "Escape clears");
  checks.push("Whitespace right-click offers Select all (every visible row), then Archive selected (N) / Delete selected (N, danger) with N excluding pinned rows and the open session; Delete confirms with the count and Cancel sends nothing");

  // 11. R01 ⌘⇧⌫ Archive session (ion-dist shared-19-CjdiaR4X.js rg/ag/ig/Zm/Qm): the target is the row shown in the
  // focused pane (Xm/ao data-selected="focused" = the open session here), not the keyboard-focused row; a focused field
  // with content keeps the chord; after the archive commits the next row (else the previous one) opens.
  const archivesBeforeChord = (await requests("thread/archive")).length;
  // The header Search opens the ⌘K palette (search mode); its filled field keeps the chord.
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const palette = page.getByRole("dialog", { name: "Command palette", exact: true }), searchField = palette.getByRole("combobox");
  await searchField.fill("Parent");
  await searchField.press("Meta+Shift+Backspace");
  await sleep(400);
  assert.equal((await requests("thread/archive")).length, archivesBeforeChord, "a filled search field keeps ⌘⇧⌫");
  assert.deepEqual(await currentIds(), [P]);
  await palette.getByRole("button", { name: "Close", exact: true }).click();
  await palette.waitFor({ state: "detached" });
  const order = await page.locator(".source-session-list .source-session-row[data-row-key]").evaluateAll(nodes => [...new Set(nodes.map(node => node.dataset.rowKey))]);
  const at = order.indexOf(P);
  assert.ok(at !== -1 && order.length > 1, "P and a neighbour are listed");
  const neighbour = order[at + 1] ?? order[at - 1];
  await mainButton(P).focus();
  await page.keyboard.press("ArrowDown");
  const keyboardRow = await page.evaluate(() => document.activeElement?.closest("[data-row-key]")?.dataset.rowKey ?? null);
  assert.ok(keyboardRow && keyboardRow !== P, "keyboard focus moved off the open row");
  await page.keyboard.press("Meta+Shift+Backspace");
  await poll(async () => (await requests("thread/archive")).length === archivesBeforeChord + 1, "⌘⇧⌫ sends one thread/archive");
  assert.equal((await requests("thread/archive")).at(-1).params.threadId, P, "the open session is archived");
  await poll(async () => (await currentIds()).join() === neighbour, "the neighbouring row opens");
  await poll(async () => await row(P).count() === 0 || await row(P).getAttribute("data-archived") === "true", "P leaves the Active list or shows Archived");
  metrics.archiveChord = { order, archived: P, neighbour, keyboardRow };
  checks.push("⌘⇧⌫ with a filled search field archives nothing; with the open session's row listed it archives that session (not the keyboard-focused row, shared-19 ao/rg) and opens the next row, else the previous one");
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "sidebar-rest-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "sidebar-rest-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
