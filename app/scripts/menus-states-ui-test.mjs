import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Shared CDS Menu states (2.2553.1 shared-frame B_/Wr over Base UI): popup and
// row geometry for Model / Mode / Account / Filter / Session (row + titlebar),
// single-highlight invariants, trigger states, close-reason focus restoration,
// transition-free desktop open/close, disabled reasons, catalog loading on the
// trigger, nested submenus and the (pointer: coarse) sheet gate. Runs alone
// after a fresh build against the isolated protocol fixture.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `menus-states-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const A = "menus-states-A", B = "menus-states-B";
const now = Math.floor(Date.now() / 1000);
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const textItem = (id, text) => ({ id, type: "agentMessage", text });
const thread = (id, name, turns, index = 0) => ({ id, name, cwd: workspace, createdAt: now, updatedAt: now - index, archived: false, turns });
await fs.writeFile(path.join(profile, "menus-states-fixture.marker"), "isolated-menus-states-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", permission: "auto", threadIds: [A, B], sidebarWidth: 288, displayName: "Menus fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [A]: thread(A, "Menus session A", [{ id: "ma-turn", status: "completed", items: [userItem("ma-user", "Menus fixture prompt."), textItem("ma-answer", "Menus fixture answer.")] }]),
  [B]: thread(B, "Menus session B", [], 1),
} }));
// Slow catalog for the first launch: model/list answers after 6s (shared-14 kS loading state);
// "Test model 2" (fixture-1) carries a Codex ModelServiceTier named Fast so the Fast row can render real tier data.
const knobPath = path.join(profile, "fixture-model-list.json");
await fs.writeFile(knobPath, JSON.stringify({ delayMs: 6000, fastTierModels: ["fixture-1"] }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, cdp, build, failure, runtime, profileRemoved = false, touchEmulated = false;
const testSources = ["scripts/menus-states-ui-test.mjs", "tests/fixtures/codex-server.cjs"];
let testSourceHashes;
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function verifySource() {
  assert.ok(build && Array.isArray(build.sources) && build.sources.length, "Build must contain a source manifest");
  assert.equal(sha(JSON.stringify(build.sources)), build.sourceSha256, "Build source digest must be internally consistent");
  const current = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  assert.equal(current.sourceSha256, build.sourceSha256, "Build changed during this test");
  assert.equal(current.builtAt, build.builtAt, "Build was replaced during this test");
  assert.equal(JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")).version, build.version, "Package version must match build");
  for (const entry of build.sources) assert.equal(sha(await fs.readFile(path.join(root, entry.path))), entry.sha256, `Build is stale: ${entry.path}`);
  for (const required of ["src/source-menu.jsx", "src/source-menu.css", "src/menu-model.mjs", "src/source-model-menu.jsx", "src/source-model-menu.css", "src/source-permission-menu.jsx",
    "src/source-sidebar.jsx", "src/source-composer.jsx", "src/source-titlebar.jsx", "src/main.jsx", "src/style.css", "src/source-settings.css", "electron/main.cjs"])
    assert.ok(build.sources.some((entry) => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async (file) => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
// W14-code r4 closeout (frame-sidebar fr4-03): the session / titlebar menu has no accessible name (shared-20 j.Popup has no
// aria-label), so SESSION_MENU (null) means "the unnamed top-level menu".
const SESSION_MENU = null, UNNAMED_MENU = '[role="menu"]:not([aria-label]):not([aria-labelledby])';
const menu = (name) => name === null ? page.locator(UNNAMED_MENU) : page.getByRole("menu", { name, exact: true });
const button = (name) => page.getByRole("button", { name, exact: true });
const frames = (count = 2) => page.evaluate((count) => new Promise((resolve) => { const step = () => --count ? requestAnimationFrame(step) : resolve(); requestAnimationFrame(step); }), count);
async function waitFocusIn(name) {
  if (name === null) { await page.waitForFunction((selector) => !!document.activeElement?.closest(selector), UNNAMED_MENU); return; }
  // Initial focus lands on the next animation frame (retained local behavior);
  // keys sent before that boundary would test a race, not a user's press.
  await page.waitForFunction((name) => !!document.activeElement?.closest(`[role="menu"][aria-label="${name}"], [role="menu"][aria-labelledby]`)
    && (document.activeElement.closest('[role="menu"]').getAttribute("aria-label") === name || document.getElementById(document.activeElement.closest('[role="menu"]').getAttribute("aria-labelledby") || "")?.textContent === name), name);
}
// Triggers keep their own short background transition; sample colors once it has settled.
const settled = (selector) => page.waitForFunction((selector) => document.querySelector(selector)?.getAnimations().length === 0, selector);
async function noSheet() {
  assert.equal(await page.evaluate(() => document.querySelectorAll("[data-cds-sheet-tree], [data-cds-sheet-pending], .smenu-sheet").length), 0, "no sheet nodes on a fine pointer");
}
async function measurePopup(name, anchorSelector) {
  return page.evaluate(({ name, anchorSelector, unnamed }) => {
    const popup = [...document.querySelectorAll('[role="menu"]')].find((node) => name === null ? node.matches(unnamed) : node.getAttribute("aria-label") === name
      || document.getElementById(node.getAttribute("aria-labelledby") || "")?.textContent === name);
    const anchor = document.querySelector(anchorSelector);
    const probe = (property) => {
      const span = document.createElement("span");
      span.style.backgroundColor = `var(${property})`;
      popup.appendChild(span);
      const value = getComputedStyle(span).backgroundColor;
      span.remove();
      return value;
    };
    const rect = popup.getBoundingClientRect(), anchorRect = anchor.getBoundingClientRect();
    const style = getComputedStyle(popup), body = popup.querySelector(":scope > .smenu-body");
    const portal = popup.closest("[data-cds-portal]");
    const positioner = popup.parentElement;
    return {
      role: popup.getAttribute("role"), dataCds: popup.getAttribute("data-cds"), dataOpen: popup.hasAttribute("data-open"),
      side: popup.getAttribute("data-side"), align: popup.getAttribute("data-align"),
      radius: style.borderRadius, background: style.backgroundColor, surface3: probe("--cds-surface-3"), shadow: style.boxShadow,
      bodyPadding: getComputedStyle(body).padding, bodyOverflow: getComputedStyle(body).overflowY,
      width: rect.width, height: rect.height, rect: rect.toJSON(), anchor: anchorRect.toJSON(),
      gapAbove: anchorRect.top - rect.bottom, gapBelow: rect.top - anchorRect.bottom,
      // Scroll-driven timelines (sg scroll-fade-y on the body) are position, not motion; only document-timeline animations count as motion.
      transitionDuration: style.transitionDuration, animations: popup.getAnimations({ subtree: true }).filter((animation) => !(animation.timeline instanceof ScrollTimeline)).length,
      scrollTimelines: popup.getAnimations({ subtree: true }).filter((animation) => animation.timeline instanceof ScrollTimeline).length,
      ownAnimations: popup.getAnimations().length,
      portal: portal ? { density: portal.getAttribute("data-density"), mode: portal.getAttribute("data-mode"), z: getComputedStyle(portal).getPropertyValue("--cds-portal-z").trim(), layerBase: getComputedStyle(portal).getPropertyValue("--cds-layer-base").trim(), childZ: getComputedStyle(positioner).zIndex } : null,
      viewport: { width: innerWidth, height: innerHeight },
    };
  }, { name, anchorSelector, unnamed: UNNAMED_MENU });
}
function assertPopup(value, { dataCds = "Menu", maxWidth = 320, minWidth = 128, gap, gapSide, label }) {
  assert.equal(value.role, "menu", `${label}: role`);
  assert.equal(value.dataCds, dataCds, `${label}: data-cds`);
  assert.equal(value.dataOpen, true, `${label}: data-open`);
  assert.equal(value.radius, "10px", `${label}: rounded-card 10px`);
  assert.equal(value.background, value.surface3, `${label}: bg-surface-3`);
  assert.match(value.shadow, /0px 8px 24px/, `${label}: shadow-popover first layer`);
  assert.match(value.shadow, /0px 2px 6px/, `${label}: shadow-popover second layer`);
  assert.equal(value.bodyPadding, "4px", `${label}: body padding`);
  assert.equal(value.bodyOverflow, "auto", `${label}: body scrolls`);
  assert.ok(value.width >= minWidth && value.width <= maxWidth, `${label}: width ${value.width} within ${minWidth}..${maxWidth}`);
  assert.ok(value.rect.left >= 8 && value.rect.right <= value.viewport.width - 8 + .5 && value.rect.top >= 8 && value.rect.bottom <= value.viewport.height - 8 + .5, `${label}: inside collision box`);
  near(gapSide === "above" ? value.gapAbove : value.gapBelow, gap, `${label}: ${gap}px sideOffset`, .5);
  assert.equal(value.transitionDuration, "0s", `${label}: no transition on desktop`);
  assert.equal(value.animations, 0, `${label}: no motion animations (document timeline) anywhere in the popup`);
  assert.equal(value.ownAnimations, 0, `${label}: the popup element itself has no animations (what Base UI waits on at close)`);
  assert.equal(value.scrollTimelines, 3, `${label}: the sg body carries exactly the three scroll-fade-y scroll timelines`);
  assert.equal(value.portal.density, "compact", `${label}: portal density`);
  assert.equal(value.portal.z, "120", `${label}: root --cds-portal-z`);
  assert.equal(value.portal.childZ, "120", `${label}: positioner z-index`);
}
async function measureRow(locator) {
  return locator.evaluate((node) => {
    const style = getComputedStyle(node), rect = node.getBoundingClientRect();
    const check = node.querySelector(".smenu-check"), description = node.querySelector(".smenu-description"), separator = node.closest('[role="menu"]').querySelector('[role="separator"]');
    const probe = (property) => { const span = document.createElement("span"); span.style.backgroundColor = `var(${property})`; node.appendChild(span); const value = getComputedStyle(span).backgroundColor; span.remove(); return value; };
    const color = (property) => { const span = document.createElement("span"); span.style.color = `var(${property})`; node.appendChild(span); const value = getComputedStyle(span).color; span.remove(); return value; };
    return {
      height: rect.height, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, gap: style.columnGap, radius: style.borderRadius,
      fontSize: style.fontSize, lineHeight: style.lineHeight, background: style.backgroundColor, ghost: probe("--cds-fill-ghost-hover"),
      opacity: style.opacity, pointerEvents: style.pointerEvents, highlighted: node.hasAttribute("data-highlighted"), disabled: node.hasAttribute("data-disabled"),
      check: check ? { width: check.getBoundingClientRect().width, height: check.getBoundingClientRect().height, marginRight: getComputedStyle(check).marginRight, color: getComputedStyle(check).color, accent: color("--cds-fill-accent") } : null,
      description: description ? { fontSize: getComputedStyle(description).fontSize, lineHeight: getComputedStyle(description).lineHeight, color: getComputedStyle(description).color, muted: color("--cds-text-muted") } : null,
      separator: separator ? { height: separator.getBoundingClientRect().height, margin: getComputedStyle(separator).margin } : null,
    };
  });
}
const highlightState = (name) => page.evaluate((name) => {
  const popup = [...document.querySelectorAll('[role="menu"]')].find((node) => node.getAttribute("aria-label") === name);
  const highlighted = [...popup.querySelectorAll("[data-highlighted]")].filter((node) => node.closest('[role="menu"]') === popup);
  return { count: highlighted.length, label: highlighted[0]?.dataset.label ?? null, focused: highlighted[0] === document.activeElement, activeLabel: document.activeElement?.dataset?.label ?? null };
}, name);
async function installMountObserver() {
  await page.evaluate(() => {
    const record = { starting: null, translate: null, backdropStarting: null };
    const observer = new MutationObserver((records) => {
      for (const entry of records) for (const node of entry.addedNodes) {
        if (node.nodeType !== 1) continue;
        const popup = node.matches('[role="menu"]') ? node : node.querySelector('[role="menu"]');
        if (popup && record.starting === null) {
          record.starting = popup.hasAttribute("data-starting-style");
          record.translate = getComputedStyle(popup).translate;
          record.backdropStarting = node.querySelector(".smenu-sheet-backdrop")?.hasAttribute("data-starting-style") ?? null;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis.__menuMount = { record, stop: () => observer.disconnect() };
  });
}
const readMountObserver = () => page.evaluate(() => { const { record, stop } = globalThis.__menuMount; stop(); delete globalThis.__menuMount; return record; });
async function openModel() {
  await button("Model").click();
  await menu("Models").waitFor();
  await waitFocusIn("Models");
}
// Isolation used by the sidebar/tooltip suites: a hidden window with background
// throttling off and CDP focus emulation, so the shared desktop pointer (a
// physical mouse is attached) cannot inject pointer events or steal focus.
async function isolateWindow() {
  await app.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.webContents.setBackgroundThrottling(false); win.hide(); });
  cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // Diagnostics: every trusted-or-not document pointerdown/keydown/blur and each
  // removal of a role=menu node, so an unexpected close is explained, not guessed.
  await page.evaluate(() => {
    const log = [];
    const push = (entry) => { log.push({ t: Math.round(performance.now()), ...entry }); if (log.length > 60) log.shift(); };
    for (const type of ["pointerdown", "keydown", "blur", "focusout"]) document.addEventListener(type, (event) => push({ type, key: event.key, trusted: event.isTrusted, pointerType: event.pointerType, x: event.clientX, y: event.clientY,
      target: event.target?.getAttribute?.("aria-label") || event.target?.className?.toString?.().slice(0, 40) || event.target?.nodeName }), true);
    window.addEventListener("blur", () => push({ type: "window-blur" }));
    new MutationObserver((records) => { for (const record of records) for (const node of record.removedNodes) if (node.nodeType === 1 && (node.matches?.('[role="menu"]') || node.querySelector?.('[role="menu"]')))
      push({ type: "menu-removed", label: (node.matches?.('[role="menu"]') ? node : node.querySelector('[role="menu"]')).getAttribute("aria-label"), active: document.activeElement?.getAttribute?.("aria-label") || document.activeElement?.className?.toString?.().slice(0, 40) }); })
      .observe(document.body, { childList: true, subtree: true });
    globalThis.__menuDiagnostics = log;
  });
}
async function closeMenus() {
  // Escape inside a child popup only closes that child; repeat until the tree is gone.
  for (let round = 0; round < 3 && await page.locator('[role="menu"]').count(); round++) {
    await page.keyboard.press("Escape");
    await frames(2);
  }
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
}
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  await isolateWindow();
  metrics.isolation = "Hidden window, background throttling off, CDP focus emulation; event/menu-removal diagnostics recorded";

  // 1. Catalog loading lives on the trigger (shared-14 kS: disabled + spinner + "Loading models…").
  const loadingTrigger = page.locator('.sc-model-trigger[aria-busy="true"]');
  // R4 closeout: the pill's loading spinner is shared-7's CDS Spinner (`<CdsSpinner size="sm" />`, data-cds="Spinner"
  // aria-hidden; source-composer-row-chin.jsx ComposerModelTrigger); the host .sc-spinner markup no longer exists.
  await loadingTrigger.waitFor();
  metrics.loading = await loadingTrigger.evaluate((node) => ({ disabled: node.disabled, text: node.textContent, spinner: !!node.querySelector('[data-cds="Spinner"]'), expanded: node.getAttribute("aria-expanded"), popup: node.getAttribute("aria-haspopup") }));
  assert.equal(metrics.loading.disabled, true);
  assert.equal(metrics.loading.text, "Loading models…");
  assert.equal(metrics.loading.spinner, true);
  assert.equal(metrics.loading.popup, "menu");
  // HANDOFF 0.2.124: since 0.2.99 the sidebar's own session-list loading state (SourceSidebarSkeleton,
  // source-sidebar.jsx:408-413, sidebar-groups.js:7761-7830 AO) reuses the CDS .smenu-skeleton inside an aria-busy
  // list; r1 matched exactly its 3 rows x (dot + bar) = 6. The check is about a model popup skeleton, so that
  // unrelated sidebar placeholder is excluded; any menu or other busy skeleton still fails. Diagnostic names matches.
  // B30: the chin Mode trigger's own loading bar (ca80fca8d W$ :29115-29129, .sc-permission-skeleton over the
  // invisible 'Mode' label) is a trigger state, not a popup skeleton, so it is excluded the same way.
  const loadingPopupSelector = '[role="menu"], [aria-busy="true"] .smenu-skeleton:not([data-testid="sidebar-rows-skeleton"] *):not(.sc-permission-skeleton)';
  metrics.loadingPopups = await page.locator(loadingPopupSelector).evaluateAll((nodes) => nodes.map((node) => ({ role: node.getAttribute("role"), label: node.getAttribute("aria-label"), className: String(node.className).slice(0, 80), rendered: node.getClientRects().length > 0, host: node.parentElement?.closest("[class]")?.className?.slice?.(0, 80) })));
  assert.equal(await page.locator(loadingPopupSelector).count(), 0, "no popup and no skeleton list while the catalog loads");
  await button("Model").filter({ hasText: "Test model" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  metrics.loaded = await page.locator(".sc-model-trigger").evaluate((node) => ({ disabled: node.disabled, busy: node.getAttribute("aria-busy"), text: node.textContent }));
  assert.equal(metrics.loaded.disabled, false);
  assert.equal(metrics.loaded.busy, null);
  checks.push("Catalog loading: trigger disabled with aria-busy, spinner and 'Loading models…' until model/list resolves (6s fixture delay); no popup skeleton is invented");

  // 2. Sheet gate baseline.
  metrics.coarse = await page.evaluate(() => ({ coarse: matchMedia("(pointer: coarse)").matches, fine: matchMedia("(pointer: fine)").matches }));
  assert.equal(metrics.coarse.coarse, false, "a Mac with a mouse never enters the sheet branch");

  // 3. Model popup geometry, starting-style frame, trigger state.
  await installMountObserver();
  await openModel();
  metrics.modelMount = await readMountObserver();
  assert.equal(metrics.modelMount.starting, true, "data-starting-style is present in the mount frame");
  await frames(2);
  assert.equal(await menu("Models").evaluate((node) => node.hasAttribute("data-starting-style")), false, "data-starting-style is gone after the next frame");
  await noSheet();
  metrics.model = await measurePopup("Models", ".sc-model-trigger");
  assertPopup(metrics.model, { dataCds: "ModelSelector", maxWidth: 416, gap: 6, gapSide: "above", label: "Model" });
  assert.equal(metrics.model.side, "top");
  assert.equal(metrics.model.align, "end");
  await settled(".sc-model-trigger");
  metrics.modelTrigger = await page.locator(".sc-model-trigger").evaluate((node) => {
    const probe = document.createElement("span"); probe.style.backgroundColor = "var(--cds-fill-ghost-hover)"; node.appendChild(probe);
    const ghost = getComputedStyle(probe).backgroundColor; probe.remove();
    return { expanded: node.getAttribute("aria-expanded"), popupOpen: node.hasAttribute("data-popup-open"), background: getComputedStyle(node).backgroundColor, ghost };
  });
  assert.equal(metrics.modelTrigger.expanded, "true");
  assert.equal(metrics.modelTrigger.popupOpen, true);
  assert.equal(metrics.modelTrigger.background, metrics.modelTrigger.ghost, "ghost trigger paints fill-ghost-hover while open");
  const firstRow = menu("Models").getByRole("menuitemradio").first();
  metrics.modelRow = await measureRow(firstRow);
  assert.equal(metrics.modelRow.height, 24, "single-line row is h-control 24px");
  assert.equal(metrics.modelRow.paddingLeft, "8px"); assert.equal(metrics.modelRow.paddingRight, "8px");
  assert.equal(metrics.modelRow.gap, "6px"); assert.equal(metrics.modelRow.radius, "6px");
  assert.equal(metrics.modelRow.fontSize, "13px"); assert.equal(metrics.modelRow.lineHeight, "19px");
  assert.equal(metrics.modelRow.separator.height, 1); assert.equal(metrics.modelRow.separator.margin, "4px 8px");
  // focusItemOnOpen "auto" (vendor-frame-BmPfNbgY.js:20180-20190, :20357-20359): a mouse open highlights no row and
  // focuses the popup itself; the highlight follows hover, and ArrowDown starts at the first row.
  assert.equal(metrics.modelRow.highlighted, false, "a pointer open highlights no row");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role") === "menu" && document.activeElement.getAttribute("aria-label")), "Models", "a pointer open focuses the popup");
  checks.push("Model popup: role=menu/ModelSelector, 10px radius, surface-3, shadow-popover, 4px body, 6px above the trigger, portal z 120, no transition; trigger aria-expanded/data-popup-open with ghost fill; 24px rows with 8/6/6 geometry and 1px 4/8 separators");

  // 4. Highlight invariants; no Fast section for a model without a service tier (shared-14 ES returns null).
  let state = await highlightState("Models");
  assert.deepEqual([state.count, state.focused], [0, false], "nothing highlighted until hover or a key");
  const secondRow = menu("Models").getByRole("menuitemradio").nth(1);
  await secondRow.hover();
  await page.waitForFunction(() => document.activeElement?.dataset.modelId === "fixture-1");
  state = await highlightState("Models");
  assert.deepEqual([state.count, state.label, state.focused], [1, "Test model 2", true], "hover moves the single highlight and focus");
  metrics.hoveredRow = await measureRow(secondRow);
  assert.equal(metrics.hoveredRow.background, metrics.hoveredRow.ghost, "highlighted row paints fill-ghost-hover");
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.activeElement?.dataset.label === "More models");
  assert.equal((await highlightState("Models")).count, 1);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.dataset.modelId === "fixture");
  assert.equal((await highlightState("Models")).label, "Test model", "ArrowDown from the last enabled row wraps to the first");
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.activeElement?.dataset.modelId === "fixture");
  metrics.noFast = await menu("Models").evaluate((node) => ({
    rows: node.querySelectorAll('[role="menuitemcheckbox"]').length,
    headers: Array.from(node.querySelectorAll(".sm-model-header")).map((header) => header.textContent),
    text: /Fast mode/.test(node.textContent),
  }));
  assert.deepEqual(metrics.noFast, { rows: 0, headers: [], text: false }, "no Fast separator, header or row without a Fast tier");
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.activeElement?.dataset.label === "More models");
  assert.equal((await highlightState("Models")).count, 1);
  checks.push("Single data-highlighted row that owns focus; hover, wrap, Home/End; a model without a Fast tier shows no Fast separator, header or row (End lands on More models)");

  // 5. Escape restores the trigger; ArrowDown/ArrowUp from the closed trigger; trigger re-press.
  await closeMenus();
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("sc-model-trigger")), true, "Escape → trigger");
  metrics.modelTriggerClosed = await page.locator(".sc-model-trigger").evaluate((node) => ({ expanded: node.getAttribute("aria-expanded"), popupOpen: node.hasAttribute("data-popup-open") }));
  assert.deepEqual(metrics.modelTriggerClosed, { expanded: "false", popupOpen: false });
  await page.keyboard.press("ArrowDown");
  await menu("Models").waitFor(); await waitFocusIn("Models");
  assert.equal((await highlightState("Models")).label, "Test model", "ArrowDown on the trigger opens with the first row");
  await closeMenus();
  await page.keyboard.press("ArrowUp");
  await menu("Models").waitFor(); await waitFocusIn("Models");
  assert.equal((await highlightState("Models")).label, "More models", "ArrowUp on the trigger opens with the last enabled row");
  await button("Model").click();
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await page.waitForTimeout(350);
  assert.equal(await page.locator('[role="menu"]').count(), 0, "re-pressing the open trigger closes without reopening");
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("sc-model-trigger")), true);
  checks.push("Trigger contract: Escape returns focus, aria-expanded/data-popup-open clear, ArrowDown/ArrowUp entry highlights first/last, re-press closes without reopening (cancel-open)");

  // 6. Outside press (non-focusable), Tab, item-click finalFocus.
  await openModel();
  const outside = await page.evaluate(() => {
    const popup = document.querySelector('[role="menu"]').getBoundingClientRect(), stats = document.querySelector(".code-stats")?.getBoundingClientRect();
    const candidates = [[Math.max(9, (stats?.left ?? 400) - 60), (stats?.top ?? 200) + 60], [innerWidth - 40, 120], [innerWidth / 2, 110]];
    for (const [x, y] of candidates) {
      if (x >= popup.left - 4 && x <= popup.right + 4 && y >= popup.top - 4 && y <= popup.bottom + 4) continue;
      const target = document.elementFromPoint(x, y);
      if (target && !target.closest("button, input, textarea, select, a, [tabindex], [contenteditable], [role=menu]")) return { x, y, target: target.className || target.tagName };
    }
    return null;
  });
  assert.ok(outside, "found a non-focusable outside point");
  metrics.outsidePoint = outside;
  await page.mouse.click(outside.x, outside.y);
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-model-trigger"));
  await openModel();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  assert.equal(await page.evaluate(() => document.activeElement?.classList.contains("sc-model-trigger")), false, "Tab closes without restoring the trigger");
  await openModel();
  await menu("Models").getByRole("menuitemradio").nth(1).click();
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await page.waitForFunction(() => document.activeElement?.classList.contains("sc-model-trigger"));
  await button("Model").filter({ hasText: "Test model 2" }).waitFor();
  await button("Permission mode").click();
  await menu("Mode").waitFor();
  await page.waitForFunction(() => !!document.activeElement?.closest(".sp-permission-menu"));
  metrics.mode = await measurePopup("Mode", ".sc-permission");
  assertPopup(metrics.mode, { gap: 6, gapSide: "above", label: "Mode" });
  assert.equal(metrics.mode.side, "top"); assert.equal(metrics.mode.align, "start");
  const modeRow = menu("Mode").getByRole("menuitemradio", { name: "Manual", exact: true });
  metrics.modeRow = await measureRow(modeRow);
  assert.equal(metrics.modeRow.description.fontSize, "12px"); assert.equal(metrics.modeRow.description.lineHeight, "15px");
  assert.equal(metrics.modeRow.description.color, metrics.modeRow.description.muted, "description uses text-muted");
  assert.deepEqual([metrics.modeRow.check.width, metrics.modeRow.check.height], [16, 16]);
  assert.equal(metrics.modeRow.check.color, metrics.modeRow.check.accent, "check slot uses fill-accent");
  assert.equal(metrics.modeRow.check.marginRight, "0px", "digit shortcut present: no -4px pull-in");
  await modeRow.click();
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await page.waitForFunction(() => document.activeElement === document.querySelector(".sc-input"));
  await button("Permission mode").filter({ hasText: "Manual" }).waitFor();
  checks.push("Close reasons: outside press on a non-focusable area restores the trigger, Tab does not, Model row selection returns to the Model trigger, Mode row selection hands focus to the editor; Mode popup geometry and description/check tokens");

  // 7. Timing: instant close, reduced motion.
  await openModel();
  const goneWithinFrame = await page.evaluate(() => new Promise((resolve) => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    requestAnimationFrame(() => resolve(!document.querySelector('[role="menu"]')));
  }));
  assert.equal(goneWithinFrame, true, "after Escape the menu node is gone within one frame (no ending animation)");
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openModel();
  metrics.modelReduced = await measurePopup("Models", ".sc-model-trigger");
  assert.equal(metrics.modelReduced.transitionDuration, "0s"); assert.equal(metrics.modelReduced.animations, 0);
  assert.equal(metrics.modelReduced.scrollTimelines, 3, "reduced motion keeps the scroll-position timelines (as the transcript strips do)");
  await closeMenus();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  checks.push("Desktop menus are transition-free: data-starting-style for one frame, transitionDuration 0s, no animations, synchronous removal, identical under reduced motion");

  // 8. Submenu: More models. Hover opens after the Base UI SubmenuTrigger delay/restMs (100ms), mouse only.
  await openModel();
  const more = menu("Models").getByRole("menuitem", { name: "More models", exact: true });
  await page.evaluate(() => {
    const row = document.querySelector('[data-label="More models"]');
    const record = { enter: null, mount: null };
    row.addEventListener("pointerenter", () => { record.enter ??= performance.now(); });
    const observer = new MutationObserver((records) => {
      for (const entry of records) for (const node of entry.addedNodes) {
        if (node.nodeType !== 1 || record.mount !== null) continue;
        if (node.matches('[role="menu"][aria-label="More models"]') || node.querySelector('[role="menu"][aria-label="More models"]')) record.mount = performance.now();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis.__hoverTiming = { record, stop: () => observer.disconnect() };
  });
  await more.hover();
  await menu("More models").waitFor();
  metrics.hoverOpen = await page.evaluate(() => { const { record, stop } = globalThis.__hoverTiming; stop(); delete globalThis.__hoverTiming; return { enter: record.enter, mount: record.mount, delay: record.mount - record.enter }; });
  assert.ok(metrics.hoverOpen.delay >= 95 && metrics.hoverOpen.delay <= 400, `hover opens the child ~100ms after pointerenter (measured ${metrics.hoverOpen.delay}ms)`);
  metrics.moreTrigger = await more.evaluate((node) => {
    const probe = document.createElement("span"); probe.style.backgroundColor = "var(--cds-fill-ghost-hover)"; node.appendChild(probe);
    const ghost = getComputedStyle(probe).backgroundColor; probe.remove();
    return { haspopup: node.getAttribute("aria-haspopup"), expanded: node.getAttribute("aria-expanded"), popupOpen: node.hasAttribute("data-popup-open"), background: getComputedStyle(node).backgroundColor, ghost };
  });
  assert.deepEqual([metrics.moreTrigger.haspopup, metrics.moreTrigger.expanded, metrics.moreTrigger.popupOpen], ["menu", "true", true]);
  assert.equal(metrics.moreTrigger.background, metrics.moreTrigger.ghost);
  metrics.moreChild = await page.evaluate(() => {
    const parent = document.querySelector('[role="menu"][aria-label="Models"]').getBoundingClientRect();
    const child = document.querySelector('[role="menu"][aria-label="More models"]');
    const rect = child.getBoundingClientRect(), row = document.querySelector('[data-label="More models"]').getBoundingClientRect();
    return { gap: rect.left - parent.right, mirrored: parent.left - rect.right, top: rect.top - row.top, descriptions: child.querySelectorAll(".smenu-description").length,
      z: getComputedStyle(child.closest("[data-cds-portal]")).getPropertyValue("--cds-portal-z").trim(), rows: child.querySelectorAll('[role="menuitemradio"]').length };
  });
  assert.ok(Math.abs(metrics.moreChild.gap - 2) <= .5 || Math.abs(metrics.moreChild.mirrored - 2) <= .5, `child popup sits 2px beside the parent (gap ${metrics.moreChild.gap}, mirrored ${metrics.moreChild.mirrored})`);
  assert.equal(metrics.moreChild.descriptions, 0); assert.equal(metrics.moreChild.rows, 2); assert.equal(metrics.moreChild.z, "220");
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.label), "More models", "hover-opened child does not take focus");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.activeElement?.closest('[aria-label="More models"]') && document.activeElement.hasAttribute("data-highlighted"));
  assert.equal((await highlightState("More models")).count, 1);
  await page.keyboard.press("ArrowLeft");
  await menu("More models").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.label), "More models", "ArrowLeft closes the child and focuses its row");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.activeElement?.closest('[aria-label="More models"]'));
  await page.keyboard.press("Escape");
  await menu("More models").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.label), "More models", "Escape inside the child returns to its row");
  await menu("Models").waitFor();
  await closeMenus();
  // Passing over the trigger for less than the delay never opens the child.
  await openModel();
  const moreBox = await more.boundingBox(), firstBox = await firstRow.boundingBox();
  await page.mouse.move(moreBox.x + moreBox.width / 2, moreBox.y + moreBox.height / 2);
  await page.waitForTimeout(30);
  await page.mouse.move(firstBox.x + 24, firstBox.y + firstBox.height / 2);
  await page.waitForTimeout(300);
  metrics.hoverPass = { child: await menu("More models").count(), highlight: (await highlightState("Models")).label };
  assert.equal(metrics.hoverPass.child, 0, "a 30ms pass over the trigger does not open the child");
  assert.equal(metrics.hoverPass.highlight, "Test model", "highlight followed the pointer to the first row");
  await closeMenus();
  checks.push("More models submenu: trigger row aria-haspopup/aria-expanded/data-popup-open with ghost fill, child 2px beside the parent at layer 220 without descriptions, opens ~100ms after pointerenter and not on a 30ms pass, ArrowRight opens and focuses, ArrowLeft/Escape return to the row");

  // 8b. Fast row with a real tier (Test model 2 is selected since step 6 and carries a Fast service tier): every core
  // reads like Code's Claude catalog (2.31226.0 shared-8 Rk/Ik): "Fast mode" header and a one-line switch row; the
  // Codex tier description moves to the right-side multiline tooltip and aria-description; keepOpen toggle.
  await openModel();
  const fastLive = menu("Models").getByRole("menuitemcheckbox", { name: /^Enable fast mode/ });
  metrics.fastLive = await fastLive.evaluate((node) => ({
    disabled: node.hasAttribute("data-disabled"), checked: node.getAttribute("aria-checked"), height: node.getBoundingClientRect().height,
    name: node.querySelector(".sm-fast-label")?.textContent ?? null, inline: node.querySelector("[data-fast-description], .smenu-description")?.textContent ?? null,
    ariaDescription: node.getAttribute("aria-description"), describedBy: node.getAttribute("aria-describedby"),
    header: [...node.closest('[role="menu"]').querySelectorAll(".sm-model-header")].map((h) => h.textContent),
  }));
  assert.equal(metrics.fastLive.disabled, false, "a model with a Fast tier enables the row");
  assert.equal(metrics.fastLive.checked, "false");
  assert.equal(metrics.fastLive.name, "Enable fast mode");
  assert.deepEqual(metrics.fastLive.header, ["Fast mode"]);
  assert.equal(metrics.fastLive.inline, null, "no second description line");
  assert.equal(metrics.fastLive.ariaDescription, "2x speed, increased usage", "ModelServiceTier.description is the row's aria-description");
  assert.ok(metrics.fastLive.height < 40, `one-line Fast row (${metrics.fastLive.height}px)`);
  assert.equal(metrics.fastLive.describedBy, null, "no disabled reason on an enabled row");
  await fastLive.hover();
  await page.locator(".source-tooltip-popup").filter({ hasText: "2x speed, increased usage" }).waitFor();
  await fastLive.click();
  await page.waitForFunction(() => document.querySelector('[data-label="Enable fast mode"]')?.getAttribute("aria-checked") === "true");
  assert.equal(await menu("Models").count(), 1, "keepOpen: the popup stays open after toggling");
  await fastLive.click();
  await page.waitForFunction(() => document.querySelector('[data-label="Enable fast mode"]')?.getAttribute("aria-checked") === "false");
  await closeMenus();
  checks.push("Fast row with a real Codex tier: 'Fast mode' header and a one-line enabled menuitemcheckbox, tier description in the right-side tooltip and aria-description (no second line), keepOpen toggle on/off");

  // 9. Account menu.
  await button("Account menu").click();
  await menu("Account menu").waitFor(); await waitFocusIn("Account menu");
  await noSheet();
  metrics.account = await measurePopup("Account menu", ".account-button");
  assertPopup(metrics.account, { gap: 6, gapSide: "above", label: "Account" });
  // R02: pw's lr className w-[17rem] (sidebar-groups.js:5250-5253) reaches $B's J.Popup; align start at the 8px collision padding.
  assert.equal(metrics.account.width, 272, "Account menu: w-[17rem]");
  assert.equal(metrics.account.rect.left, 8, "Account menu: left 8");
  metrics.accountContent = await menu("Account menu").evaluate((node) => ({
    header: node.querySelector('[role="presentation"]')?.textContent ?? null,
    settingsShortcut: node.querySelector('[data-testid="user-menu-settings"]')?.getAttribute("aria-keyshortcuts"),
    // Fidelity F02: c_ draws the 'cmd+,' spec as the Shortcut text variant (visible glyphs read past the sr-only names).
    settingsCaps: ((node) => node && [...node.querySelectorAll('kbd')].map((kbd) => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent).join(''))(node.querySelector('[data-testid="user-menu-settings"] .smenu-shortcut')),
    signOut: [...node.querySelectorAll('[role^="menuitem"]')].some((item) => /sign out/i.test(item.textContent)),
    submenus: node.querySelectorAll('[aria-haspopup], [data-submenu-trigger]').length,
    items: [...node.querySelectorAll('[role^="menuitem"]')].map((item) => item.dataset.label),
  }));
  assert.match(metrics.accountContent.header, /Menus fixture/); // The fixture reports no engine, so it is the Codex core: the org line names it (account-label-model accountMenuLines).
  assert.match(metrics.accountContent.header, /Codex$/); assert.doesNotMatch(metrics.accountContent.header, /DeepSeek/); assert.doesNotMatch(metrics.accountContent.header, /Codex · Codex/);
  assert.equal(metrics.accountContent.settingsShortcut, "Meta+,"); assert.equal(metrics.accountContent.settingsCaps, "⌘,");
  // Log out (sidebar-rows.js:16434-16440) is Sign out, after a separator, whenever Settings › Preferences offers it: the
  // Codex fixture reports a signed-in ChatGPT account (account-settings-model accountMenuSignOut).
  assert.equal(metrics.accountContent.signOut, true, "Sign out for a core that reports a signed-in account");
  // R02 (sidebar-rows.js:16345-16432): View changelog, then the Learn more submenu (its links have no DeepSeek URL here).
  assert.equal(metrics.accountContent.submenus, 1, "one nested submenu: Learn more");
  // Fidelity F14 (on purpose): sidebar-rows.js:16769-16793 uV puts Usage right after Settings, then Language (shared-21 $B
  // :16218-16227, which opens "Choose your language"). $B has no light/dark row (appearance is Settings › Theme); the Codex
  // fixture has no DeepSeek key row; Keyboard shortcuts moved into Learn more.
  assert.deepEqual(metrics.accountContent.items, ["Settings", "Usage", "Language", "View changelog", "Learn more", "Sign out"], "Settings, Usage, Language, View changelog, Learn more, Sign out");
  // shared-21-D098Wd--.js:16424-16431: inside Learn more, the Keyboard shortcuts item carries the shortcuts_modal chord ⌘/.
  await menu("Account menu").getByRole("menuitem", { name: /^Learn more/ }).focus();
  await page.keyboard.press("ArrowRight");
  await menu("Learn more").waitFor();
  await page.waitForFunction(() => document.activeElement?.closest('[role="menu"]')?.getAttribute("aria-label") === "Learn more");
  metrics.accountLearnMore = await menu("Learn more").evaluate((node) => ({
    items: [...node.querySelectorAll('[role^="menuitem"]')].map((item) => item.dataset.label),
    width: node.getBoundingClientRect().width,
    shortcutsCaps: ((row) => row && [...row.querySelectorAll('kbd')].map((kbd) => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent).join(''))([...node.querySelectorAll('[role^="menuitem"]')].find((item) => item.dataset.label === "Keyboard shortcuts")?.querySelector(".smenu-shortcut")),
  }));
  // Then the running core's project page (descriptor homepage; Codex's GitHub repository).
  assert.deepEqual(metrics.accountLearnMore.items, ["Keyboard shortcuts", "Codex project page"]);
  assert.ok(metrics.accountLearnMore.width >= 208, `Learn more: min-w-[208px] (${metrics.accountLearnMore.width})`);
  assert.equal(metrics.accountLearnMore.shortcutsCaps, "⌘/");
  await page.keyboard.press("ArrowLeft");
  await menu("Learn more").waitFor({ state: "detached" });
  assert.equal(await menu("Account menu").count(), 1, "ArrowLeft closes only the Learn more child");
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.activeElement?.dataset.testid === "user-menu-settings");
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "Settings", exact: true }).waitFor();
  assert.equal(await page.locator('[role="menu"]').count(), 0, "Enter on Settings removes the menu");
  await page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("dialog", { name: "Settings", exact: true }).waitFor({ state: "detached" });
  // R02: View changelog (Scroll, sidebar-rows.js:16345-16354) reopens the release notes (xB WhatsNewModal).
  await button("Account menu").click();
  await menu("Account menu").waitFor();
  await menu("Account menu").getByRole("menuitem", { name: "View changelog", exact: true }).click();
  await page.getByRole("dialog", { name: "What’s new", exact: true }).waitFor();
  assert.equal(await page.locator('[role="menu"]').count(), 0, "View changelog removes the menu");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "What’s new", exact: true }).waitFor({ state: "detached" });
  checks.push("Account menu: role=menu 6px above the account button, 272px (w-[17rem]) at left 8, Header with display name and the org line naming the running core, 'Codex' on the Codex fixture (account-label-model; a ChatGPT fixture account has no 'API key' part), Settings aria-keyshortcuts Meta+, and ⌘, caps, items Settings / Usage / Language / View changelog / Learn more (no appearance row), Learn more (min 208px) holding Keyboard shortcuts ⌘/ and the core's project page, then Sign out for the signed-in fixture account, Enter opens Settings and removes the menu, View changelog opens What’s new");

  // 10. Filter menu (offset 4, min 200, align end) and its Status submenu.
  await page.getByRole("button", { name: /^Filter(?: \(active\))?$/ }).click();
  await menu("Filter sessions").waitFor(); await waitFocusIn("Filter sessions");
  await noSheet();
  metrics.filter = await measurePopup("Filter sessions", '[aria-label="Filter"], [aria-label="Filter (active)"]');
  assertPopup(metrics.filter, { gap: 4, gapSide: "below", minWidth: 200, label: "Filter" });
  assert.equal(metrics.filter.side, "bottom"); assert.equal(metrics.filter.align, "end");
  near(metrics.filter.rect.right, metrics.filter.anchor.right, "align end: popup right edge meets the trigger", .5);
  await settled('[aria-label="Filter"], [aria-label="Filter (active)"]');
  metrics.filterTrigger = await page.locator('[aria-label="Filter"], [aria-label="Filter (active)"]').evaluate((node) => {
    const probe = document.createElement("span"); probe.style.backgroundColor = "var(--cds-fill-ghost-hover)"; node.appendChild(probe);
    const ghost = getComputedStyle(probe).backgroundColor; probe.remove();
    const secondary = document.createElement("span"); secondary.style.color = "var(--cds-text-secondary)"; node.appendChild(secondary);
    const secondaryColor = getComputedStyle(secondary).color; secondary.remove();
    return { popupOpen: node.hasAttribute("data-popup-open"), expanded: node.getAttribute("aria-expanded"), background: getComputedStyle(node).backgroundColor, ghost, color: getComputedStyle(node).color, secondary: secondaryColor };
  });
  assert.equal(metrics.filterTrigger.popupOpen, true); assert.equal(metrics.filterTrigger.background, metrics.filterTrigger.ghost);
  assert.equal(metrics.filterTrigger.color, metrics.filterTrigger.secondary, "icon-only trigger reads text-secondary while open");
  const statusRow = menu("Filter sessions").getByRole("menuitem", { name: /^Status/ });
  await statusRow.hover();
  await menu("Status").waitFor();
  metrics.filterChild = await page.evaluate(() => {
    const parent = document.querySelector('[role="menu"][aria-label="Filter sessions"]').getBoundingClientRect();
    const rect = document.querySelector('[role="menu"][aria-label="Status"]').getBoundingClientRect();
    return { gap: rect.left - parent.right, mirrored: parent.left - rect.right, descriptions: document.querySelectorAll('[aria-label="Status"] .smenu-description').length, radios: document.querySelectorAll('[aria-label="Status"] [role="menuitemradio"]').length };
  });
  assert.ok(Math.abs(metrics.filterChild.gap - 2) <= .5 || Math.abs(metrics.filterChild.mirrored - 2) <= .5, "Filter option submenu sits 2px beside the parent");
  assert.equal(metrics.filterChild.descriptions, 0); assert.ok(metrics.filterChild.radios >= 3);
  // Safe polygon (floating-ui safePolygon with blockPointerEvents, closeDelay 0): a diagonal path from the
  // Status row across the Group by row into the child keeps the child open and leaves the sibling unhighlighted;
  // leaving the child sideways onto the sibling closes it at once.
  const statusBox = await statusRow.boundingBox(), childBox = await menu("Status").boundingBox();
  const groupRow = menu("Filter sessions").getByRole("menuitem", { name: /^Group by/ });
  const groupBox = await groupRow.boundingBox();
  const start = { x: statusBox.x + statusBox.width / 4, y: statusBox.y + statusBox.height / 2 };
  const target = { x: childBox.x + 6, y: childBox.y + childBox.height - 6 };
  const crossingX = start.x + (groupBox.y + groupBox.height / 2 - start.y) * (target.x - start.x) / (target.y - start.y);
  metrics.safePolygonPath = { start, target, groupBox, crossingX };
  assert.ok(crossingX > groupBox.x && crossingX < groupBox.x + groupBox.width, "precondition: the straight path crosses the Group by row");
  await page.mouse.move(start.x, start.y);
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.waitForTimeout(120);
  metrics.safePolygon = await page.evaluate(() => ({
    child: !!document.querySelector('[role="menu"][aria-label="Status"]'),
    groupHighlighted: document.querySelector('[data-label="Group by"]')?.hasAttribute("data-highlighted") ?? null,
    triggerOpen: document.querySelector('[data-label="Status"]')?.hasAttribute("data-popup-open") ?? null,
    parentPointerEvents: getComputedStyle(document.querySelector('[role="menu"][aria-label="Filter sessions"]')).pointerEvents,
    triggerPointerEvents: getComputedStyle(document.querySelector('[data-label="Status"]')).pointerEvents,
  }));
  assert.equal(metrics.safePolygon.child, true, "the child survives the diagonal path across a sibling row");
  assert.equal(metrics.safePolygon.groupHighlighted, false, "the crossed sibling row was never highlighted");
  assert.equal(metrics.safePolygon.triggerOpen, true);
  assert.deepEqual([metrics.safePolygon.parentPointerEvents, metrics.safePolygon.triggerPointerEvents], ["none", "auto"], "parent rows are pointer-inert while the corridor is active; the trigger stays live");
  // Every inline pointer-events change of the parent from here on, with Group by's own submenu state at that moment.
  await page.evaluate(() => {
    const popup = document.querySelector('[role="menu"][aria-label="Filter sessions"]');
    window.__filterPointer = [];
    new MutationObserver(() => window.__filterPointer.push({ value: popup.style.pointerEvents,
      groupOpen: !!document.querySelector('[data-label="Group by"]')?.hasAttribute("data-popup-open") })).observe(popup, { attributes: true, attributeFilter: ["style"] });
  });
  await page.mouse.move(groupBox.x + groupBox.width / 2, groupBox.y + groupBox.height / 2, { steps: 4 });
  await menu("Status").waitFor({ state: "detached" });
  await page.mouse.move(groupBox.x + groupBox.width / 2 + 1, groupBox.y + groupBox.height / 2);
  await page.waitForFunction(() => document.querySelector('[data-label="Group by"]')?.hasAttribute("data-highlighted"));
  const released = await page.evaluate(() => ({ pointerEvents: getComputedStyle(document.querySelector('[role="menu"][aria-label="Filter sessions"]')).pointerEvents,
    groupOpen: document.querySelector('[data-label="Group by"]').hasAttribute("data-popup-open"), log: window.__filterPointer }));
  metrics.corridorRelease = released;
  // Group by is itself an option submenu (SUBMENU_HOVER_DELAY 100 ms, menu-model.mjs:18). Under parallel suite load it
  // can open before this read, and the pointer resting on its trigger then makes the parent pointer-inert for Group by's
  // own corridor (MenuSubmenu block; failure.png of a 6-way run showed its Date/Folder/State child open). The Status
  // corridor's release is still required: its first change is the restore, and any later block belongs to Group by.
  assert.equal(released.log[0]?.value, "", "pointer events restored after the close");
  if (released.groupOpen) assert.ok(released.log.slice(1).every((entry) => entry.value === "" || entry.groupOpen), "only Group by's own open submenu blocks the parent again");
  else assert.equal(released.pointerEvents, "auto", "pointer events restored after the close");
  await statusRow.hover();
  await menu("Status").waitFor();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.activeElement?.closest('[aria-label="Status"]') && document.activeElement.hasAttribute("data-highlighted"));
  await closeMenus();
  checks.push("Filter popup: 4px below, min 200px, align end, icon-only trigger data-popup-open with ghost fill and text-secondary; Status submenu 2px beside without descriptions; safe polygon keeps the child open across the Group by row with the parent pointer-inert, leaving sideways closes it at once; ArrowRight focuses its first row");

  // 11. Session row menu (sidebar) and titlebar Session menu with disabled command reasons.
  const rowA = page.locator(`[data-source-session-id="${A}"]`);
  await rowA.hover();
  await rowA.locator(".source-session-more").click();
  await menu("Session options").waitFor(); await waitFocusIn("Session options");
  await noSheet();
  metrics.sessionRow = await measurePopup("Session options", `[data-source-session-id="${A}"] .source-session-more`);
  assertPopup(metrics.sessionRow, { gap: 6, gapSide: "below", label: "Session row" });
  assert.equal(metrics.sessionRow.align, "end");
  metrics.sessionRowTrigger = await rowA.locator(".source-session-more").evaluate((node) => ({ popupOpen: node.hasAttribute("data-popup-open"), expanded: node.getAttribute("aria-expanded") }));
  assert.deepEqual(metrics.sessionRowTrigger, { popupOpen: true, expanded: "true" });
  const pinRow = menu("Session options").getByRole("menuitem", { name: "Pin", exact: true });
  metrics.pinRow = await pinRow.evaluate((node) => ({ shortcut: node.getAttribute("aria-keyshortcuts"), caps: node.querySelector("kbd")?.textContent }));
  // Fidelity F02: the Shortcut text variant upper-cases a single-letter key (shared-frame uo), so "p" reads P.
  assert.deepEqual(metrics.pinRow, { shortcut: "p", caps: "P" });
  await closeMenus();
  await page.waitForFunction((id) => document.activeElement?.closest(`[data-source-session-id="${id}"]`) !== null, A);
  // Right-click context menu (context-menu-shared ev.Root over Base UI ContextMenu): cursor anchor with the
  // positioner's context-menu defaults (alignOffset 2, sideOffset -5), data-cds ContextMenu, al('contextmenu') z 130.
  const readContextMenu = () => page.evaluate(() => {
    const popup = document.querySelector('[role="menu"][aria-label="Session options"]');
    if (!popup) return null;
    const rect = popup.getBoundingClientRect(), portal = popup.closest("[data-cds-portal]");
    return { left: rect.left, top: rect.top, width: rect.width, dataCds: popup.getAttribute("data-cds"), side: popup.getAttribute("data-side"), align: popup.getAttribute("data-align"),
      z: getComputedStyle(portal).getPropertyValue("--cds-portal-z").trim(), layerBase: getComputedStyle(portal).getPropertyValue("--cds-layer-base").trim(), childZ: getComputedStyle(popup.parentElement).zIndex };
  });
  const rowBBox = await page.locator(`[data-source-session-id="${B}"] .source-session-open`).boundingBox();
  const cursor = { x: Math.round(rowBBox.x + 40), y: Math.round(rowBBox.y + rowBBox.height / 2) };
  await page.mouse.click(cursor.x, cursor.y, { button: "right" });
  await menu("Session options").waitFor(); await waitFocusIn("Session options");
  metrics.contextMenu = { cursor, ...(await readContextMenu()) };
  near(metrics.contextMenu.left - cursor.x, 2, "context menu: alignOffset 2 right of the pointer", .5);
  near(metrics.contextMenu.top - cursor.y, -5, "context menu: sideOffset -5 lifts the popup 5px above the pointer", .5);
  assert.deepEqual([metrics.contextMenu.dataCds, metrics.contextMenu.side, metrics.contextMenu.align], ["ContextMenu", "bottom", "start"]);
  assert.deepEqual([metrics.contextMenu.z, metrics.contextMenu.layerBase, metrics.contextMenu.childZ], ["130", "100", "130"], "al('contextmenu'): base 100 + offset 30");
  // Re-target race: macOS Chromium dispatches contextmenu inside the mousedown task, so the outside press that
  // reaches the open menu and the right-click that opens the next one share a task; the new menu must stay open.
  const rowABox = await page.locator(`[data-source-session-id="${A}"] .source-session-open`).boundingBox();
  const cursor2 = { x: Math.round(rowABox.x + 60), y: Math.round(rowABox.y + rowABox.height / 2) };
  await page.mouse.click(cursor2.x, cursor2.y, { button: "right" });
  await page.waitForTimeout(350);
  metrics.contextRace = await readContextMenu();
  assert.ok(metrics.contextRace, "a right-click while a context menu is open leaves the new context menu open");
  near(metrics.contextRace.left - cursor2.x, 2, "re-targeted context menu follows the new pointer", .5);
  near(metrics.contextRace.top - cursor2.y, -5, "re-targeted context menu keeps sideOffset -5", .5);
  await closeMenus();
  await rowA.hover();
  await rowA.locator(".source-session-more").click();
  await menu("Session options").waitFor(); await waitFocusIn("Session options");
  await page.mouse.click(cursor.x, cursor.y, { button: "right" });
  await page.waitForTimeout(350);
  metrics.contextRaceFromButton = await readContextMenu();
  assert.equal(metrics.contextRaceFromButton?.dataCds, "ContextMenu", "a right-click while a row's More options menu is open leaves the context menu open");
  await closeMenus();
  // Fidelity F02 Escape layering with the ⌘K palette: the header Search button (sidebar-groups.js:5352-5377 _w) opens
  // XP in search mode, a modal (#root inert) — the sidebar never hides rows behind a filter. Escape closes only the
  // palette, and closing clears the query, so ⌘K reopens it empty.
  const rowB = page.locator(`[data-source-session-id="${B}"]`), palette = page.getByRole("dialog", { name: "Command palette", exact: true });
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await palette.waitFor();
  await palette.getByRole("combobox").fill("session A");
  metrics.escapeLayering = { mode: await palette.getAttribute("data-palette-mode"), query: await palette.getByRole("combobox").inputValue(), rowB: await rowB.count(), rootInert: await page.evaluate(() => document.getElementById("root")?.hasAttribute("inert") ?? null) };
  assert.deepEqual(metrics.escapeLayering, { mode: "search", query: "session A", rowB: 1, rootInert: true }, "search mode palette over an inert app; every sidebar row still shows");
  await page.keyboard.press("Escape");
  await palette.waitFor({ state: "detached" });
  await rowB.waitFor();
  await page.keyboard.press("Meta+k"); await palette.waitFor();
  metrics.escapeLayering.reopenedQuery = await palette.getByRole("combobox").inputValue();
  assert.equal(metrics.escapeLayering.reopenedQuery, "", "closing the palette cleared its query");
  await page.keyboard.press("Escape"); await palette.waitFor({ state: "detached" });
  checks.push("Escape layering: the header Search opens the ⌘K palette in search mode over an inert app (no sidebar filter); Escape closes only the palette and clears the query, so ⌘K reopens it empty");
  await page.locator(`[data-source-session-id="${B}"] .source-session-open`).click();
  await page.locator(".loading-state").waitFor({ state: "detached" }).catch(() => {});
  // B09 (cf74bc599 ZT): the ⋮ is 'View options' — view items and Keep computer awake, no session commands.
  await button("View options").waitFor();
  await button("View options").click();
  await menu(SESSION_MENU).waitFor(); await waitFocusIn(SESSION_MENU);
  await noSheet();
  metrics.titlebar = await measurePopup(SESSION_MENU, '[aria-label="View options"]');
  assertPopup(metrics.titlebar, { gap: 6, gapSide: "below", label: "Titlebar session" });
  const filesRow = menu(SESSION_MENU).getByRole("menuitemcheckbox", { name: "Files", exact: true });
  metrics.filesRow = await measureRow(filesRow);
  // HANDOFF 0.2.105/0.2.124: Files now carries its toggleBrowser ⌘⇧F (panes-toggle-current.js:3236-3253, main.jsx:1868),
  // so by source-menu.jsx:425 (bareCheck = check && !hint && !shortcut) its slot is not bare and keeps 0 margin on
  // a fine pointer, like the digit-shortcut Mode row above (:369); the -4px pull-in stays for bare slots only.
  // Fidelity F02: c_ renders the 'cmd+shift+f' spec in io order, ⇧⌘F (shared-frame-C_2npUJq.js:2136, :8874-8881).
  metrics.filesRow.shortcut = await filesRow.evaluate((node) => ({ bare: node.querySelector(".smenu-check").hasAttribute("data-bare"), kbd: ((node) => node && [...node.querySelectorAll('kbd')].map((kbd) => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent).join(''))(node.querySelector(".smenu-shortcut")), variant: node.querySelector(".smenu-shortcut")?.dataset.variant, ariaHidden: node.querySelector(".smenu-shortcut")?.getAttribute("aria-hidden") }));
  assert.deepEqual(metrics.filesRow.shortcut, { bare: false, kbd: "⇧⌘F", variant: "text", ariaHidden: "true" });
  assert.deepEqual([metrics.filesRow.check.width, metrics.filesRow.check.height, metrics.filesRow.check.marginRight], [16, 16, "0px"], "Files check slot with ⌘⇧F: 16x16, no -4px pull-in");
  assert.equal(metrics.filesRow.check.color, metrics.filesRow.check.accent);
  assert.equal(metrics.filesRow.height, 24);
  // The View options menu holds no command rows (zt clears them), so the walk only proves ArrowDown stays on enabled rows.
  assert.equal(await menu(SESSION_MENU).locator('[role="menuitem"][data-label="Compact conversation"]').count(), 0, "no session commands in View options");
  metrics.viewOptionsRows = await menu(SESSION_MENU).evaluate((node) => [...node.querySelectorAll('[role^="menuitem"]')].map((row) => row.dataset.label ?? row.textContent));
  const visited = [];
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("ArrowDown");
    await frames(1);
    visited.push(await page.evaluate(() => ({ label: document.activeElement?.dataset?.label ?? null, disabled: document.activeElement?.hasAttribute("data-disabled") ?? null })));
  }
  metrics.titlebarWalk = visited;
  assert.ok(visited.every((entry) => entry.disabled === false), "ArrowDown never lands on a disabled row");
  // Re-target race (titlebar): right-clicking the session title while the View options menu is open opens the
  // header session menu in the same task; it must stay open. shared-21 IV contextMenuTrigger: it is a ContextMenu at
  // the pointer (as the sidebar rows' context menu above), and the CaretDown stays collapsed.
  const titleBox = await page.locator("button:is(.st-title,[data-pane-title])").boundingBox();
  const titleCursor = { x: Math.round(titleBox.x + Math.min(20, titleBox.width / 2)), y: Math.round(titleBox.y + titleBox.height / 2) };
  await page.mouse.click(titleCursor.x, titleCursor.y, { button: "right" });
  await page.waitForTimeout(350);
  metrics.titleRace = await page.evaluate(() => {
    const popup = document.querySelector('[role="menu"]:not([aria-label]):not([aria-labelledby])'), caret = document.querySelector(".st-session-caret");
    return popup ? { left: popup.getBoundingClientRect().left, top: popup.getBoundingClientRect().top, dataCds: popup.getAttribute("data-cds"),
      rows: popup.querySelectorAll('[role^="menuitem"]').length, caretExpanded: caret?.getAttribute("aria-expanded") ?? null } : null;
  });
  assert.ok(metrics.titleRace, "the title's context menu stays open after re-targeting");
  near(metrics.titleRace.left - titleCursor.x, 2, "title context menu: alignOffset 2 right of the pointer", .5);
  near(metrics.titleRace.top - titleCursor.y, -5, "title context menu: sideOffset -5 above the pointer", .5);
  assert.equal(metrics.titleRace.dataCds, "ContextMenu");
  assert.equal(metrics.titleRace.caretExpanded, "false", "the CaretDown is not the context menu's trigger");
  await closeMenus();
  checks.push("Session menus: sidebar row popup 6px below/align end with data-popup-open trigger and 'p' shortcut caps; right-click context menu at pointer + (2, -5) with data-cds ContextMenu on layer 130 and it survives re-targeting from an open context/More options/titlebar menu (the title's right-click is a ContextMenu at the pointer); titlebar View options menu (Session menu popup) with bare 16px accent check slot and no session command rows; ArrowDown stays on enabled rows");

  // 12. Scroll body (sg: scroll-fade-y mask over a scroll timeline): a 220px viewport makes the titlebar Session menu
  // exceed --available-height, so the body scrolls with the official edge fade (bottom at the top, top at the bottom).
  // B09: the View options menu is short now; the header session menu (CaretDown beside the title, c593f7513 Om) is the
  // longer titlebar menu, so a 220px viewport makes it overflow.
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 220, deviceScaleFactor: 0, mobile: false });
  await page.waitForFunction(() => innerHeight === 220);
  await page.locator(".st-toolbar").getByRole("button", { name: /^More options for / }).click();
  await menu(SESSION_MENU).waitFor(); await waitFocusIn(SESSION_MENU);
  const readScrollBody = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const popup = document.querySelector('[role="menu"]:not([aria-label]):not([aria-labelledby])'), body = popup.querySelector(":scope > .smenu-body"), style = getComputedStyle(body);
    const read = (name) => style.getPropertyValue(name).trim();
    resolve({ classes: body.className, overflow: style.overflowY, scrollTop: body.scrollTop, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight,
      popupMaxHeight: getComputedStyle(popup).maxHeight, availableHeight: popup.parentElement.style.getPropertyValue("--available-height"), viewportHeight: innerHeight,
      mask: style.maskImage || style.webkitMaskImage, animationName: style.animationName, timeline: style.animationTimeline, size: read("--cds-scroll-fade-size"),
      topRaw: read("--cds-scroll-fade-top-raw"), bottomRaw: read("--cds-scroll-fade-bottom-raw"), active: read("--cds-scroll-fade-y-active"), top: read("--cds-scroll-fade-top"), bottom: read("--cds-scroll-fade-bottom") });
  }))));
  metrics.scrollFadeTop = await readScrollBody();
  assert.match(metrics.scrollFadeTop.classes, /\bscroll-fade-y\b/, "sg body carries scroll-fade-y");
  assert.equal(metrics.scrollFadeTop.overflow, "auto");
  assert.ok(metrics.scrollFadeTop.scrollHeight > metrics.scrollFadeTop.clientHeight + 8, `body scrolls (${metrics.scrollFadeTop.scrollHeight} > ${metrics.scrollFadeTop.clientHeight})`);
  assert.match(metrics.scrollFadeTop.mask, /linear-gradient/, "official scroll-fade-y mask-image applies");
  for (const name of ["cds-scroll-fade-top", "cds-scroll-fade-bottom", "cds-scroll-fade-y-active"]) assert.ok(metrics.scrollFadeTop.animationName.includes(name), `animation ${name}`);
  assert.match(metrics.scrollFadeTop.timeline, /scroll\(self/, "scroll(self) timeline");
  assert.equal(metrics.scrollFadeTop.size, "28px", "--cds-scroll-fade-size 28px");
  assert.equal(metrics.scrollFadeTop.scrollTop, 0);
  assert.equal(metrics.scrollFadeTop.active, "1", "scroll timeline active");
  assert.equal(metrics.scrollFadeTop.topRaw, "0px", "no top fade at scrollTop 0");
  assert.equal(metrics.scrollFadeTop.bottomRaw, "28px", "full bottom fade at scrollTop 0");
  await page.evaluate(() => { const body = document.querySelector('[role="menu"]:not([aria-label]):not([aria-labelledby]) > .smenu-body'); body.scrollTop = body.scrollHeight; });
  metrics.scrollFadeBottom = await readScrollBody();
  assert.ok(metrics.scrollFadeBottom.scrollTop > 0);
  assert.equal(metrics.scrollFadeBottom.topRaw, "28px", "full top fade at the end of the scroll range");
  assert.equal(metrics.scrollFadeBottom.bottomRaw, "0px", "no bottom fade at the end of the scroll range");
  await closeMenus();
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  await page.waitForFunction(() => innerHeight !== 220);
  checks.push("Scroll body: .smenu-body is sg's scroll-fade-y (official mask-image + scroll(self) timeline, 28px size); when the popup hits --available-height the body scrolls with the bottom fade at the top of the range and the top fade at the end");

  // 13. Sheet branch via CDP touch emulation ((pointer: coarse) → eh() sheet mode).
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  touchEmulated = true;
  await page.waitForFunction(() => matchMedia("(pointer: coarse)").matches);
  await installMountObserver();
  await button("Model").click();
  await page.locator(".smenu-sheet").waitFor();
  metrics.sheetMount = await readMountObserver();
  assert.equal(metrics.sheetMount.starting, true); assert.equal(metrics.sheetMount.backdropStarting, true);
  assert.match(metrics.sheetMount.translate, /100%/, "starting style translates the sheet below the viewport (calc(100% + 1.5rem))");
  await frames(2);
  metrics.sheet = await page.evaluate(() => {
    const sheet = document.querySelector(".smenu-sheet"), backdrop = document.querySelector(".smenu-sheet-backdrop"), tree = document.querySelector("[data-cds-sheet-tree]");
    const probe = document.createElement("span"); probe.style.backgroundColor = "var(--cds-backdrop)"; tree.appendChild(probe);
    const backdropToken = getComputedStyle(probe).backgroundColor; probe.remove();
    const rect = sheet.getBoundingClientRect(), style = getComputedStyle(sheet);
    return { tree: !!tree, role: sheet.getAttribute("role"), transitionDuration: style.transitionDuration, transitionProperty: style.transitionProperty, translate: style.translate,
      radius: style.borderRadius, paddingBottom: style.paddingBottom, left: rect.left, width: rect.width, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight,
      backdrop: getComputedStyle(backdrop).backgroundColor, backdropToken, backdropTransition: getComputedStyle(backdrop).transitionDuration, positioner: !!document.querySelector(".smenu-positioner") };
  });
  assert.equal(metrics.sheet.tree, true); assert.equal(metrics.sheet.role, "menu");
  assert.match(metrics.sheet.transitionDuration, /^0\.3s/, "duration-sheet 300ms"); assert.match(metrics.sheet.transitionProperty, /translate/);
  assert.equal(metrics.sheet.radius, "10px 10px 0px 0px", "rounded-t-card");
  assert.equal(metrics.sheet.paddingBottom, "8px", "max(safe-area-inset-bottom, .5rem) without an inset");
  near(metrics.sheet.left, 0, "sheet spans from the left edge", .5); near(metrics.sheet.width, metrics.sheet.viewportWidth, "sheet spans the viewport", .5);
  assert.equal(metrics.sheet.backdrop, metrics.sheet.backdropToken, "backdrop paints --cds-backdrop"); assert.match(metrics.sheet.backdropTransition, /^0\.3s/);
  assert.equal(metrics.sheet.positioner, false, "no desktop positioner in sheet mode");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".smenu-sheet")).translate === "none" || Math.abs(document.querySelector(".smenu-sheet").getBoundingClientRect().bottom - innerHeight) < 1);
  await page.mouse.click(20, 20);
  const closeStarted = Date.now();
  await page.locator(".smenu-sheet").waitFor({ state: "detached" });
  metrics.sheetCloseMs = Date.now() - closeStarted;
  assert.ok(metrics.sheetCloseMs >= 150, `sheet close waits for its ending transition (${metrics.sheetCloseMs}ms)`);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await button("Model").click();
  await page.locator(".smenu-sheet").waitFor();
  metrics.sheetReduced = await page.locator(".smenu-sheet").evaluate((node) => getComputedStyle(node).transitionDuration);
  assert.equal(metrics.sheetReduced, "0s", "motion-reduce removes the sheet transition");
  await page.keyboard.press("Escape");
  await page.locator(".smenu-sheet").waitFor({ state: "detached" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  touchEmulated = false;
  await page.waitForFunction(() => !matchMedia("(pointer: coarse)").matches);
  await openModel();
  await noSheet();
  await closeMenus();
  checks.push("Sheet gate: coarse pointer (CDP touch emulation) renders the sheet tree with starting-style translate below the viewport, 300ms ease-out translate transition, rounded-t-card, 8px safe-area padding, --cds-backdrop fade, ending transition before removal, none under reduced motion; restored fine pointer renders the desktop popup again");

  // 14. Empty catalog: the trigger shows the empty label without aria-busy; no popup skeleton.
  await app.close(); app = null;
  await fs.writeFile(knobPath, JSON.stringify({ empty: true }));
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  await isolateWindow();
  await page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ }).waitFor();
  await page.waitForFunction(() => document.querySelector(".sc-model-trigger") && document.querySelector(".sc-model-trigger").getAttribute("aria-busy") !== "true");
  metrics.empty = await page.locator(".sc-model-trigger").evaluate((node) => ({ disabled: node.disabled, busy: node.getAttribute("aria-busy"), text: node.textContent }));
  assert.equal(metrics.empty.disabled, true); assert.equal(metrics.empty.busy, null); assert.equal(metrics.empty.text, "Default model");
  assert.equal(await page.locator("[aria-busy=true] .smenu-skeleton, .smenu-skeleton").count(), 0);
  checks.push("Empty catalog: trigger disabled with the 'Default model' empty label and no aria-busy (shared-14 kS emptyLabel); nothing pretends to load");
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  metrics.diagnostics = await page?.evaluate(() => globalThis.__menuDiagnostics ?? null).catch(() => null);
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  if (touchEmulated) await cdp?.send("Emulation.setTouchEmulationEnabled", { enabled: false }).catch(() => {});
  await app?.close().catch((error) => { failure ||= error; });
  if (build) await verifySource().catch((error) => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch((error) => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "menus-states-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "menus-states-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined, metrics: failure ? report.metrics : undefined }, null, 2));
}
if (failure) throw failure;
