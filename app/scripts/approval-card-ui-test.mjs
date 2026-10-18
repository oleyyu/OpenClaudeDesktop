import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Fresh app build required. This suite covers ordinary card presentation and
// local keys, not transport identity/races or question drafts (separate suite).
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "approval-card-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
await fs.writeFile(path.join(workspace, "fixture.txt"), "APPROVAL_CARD_FIXTURE\n");
const threadId = "approval-card-fixture", now = Math.floor(Date.now() / 1000);
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace,
  theme: "light", mode: "code", model: "fixture", threadIds: [threadId], sidebarWidth: 288, displayName: "Fixture" }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [threadId]: { id: threadId, cwd: workspace, name: "Ordinary approval card fixture", createdAt: now,
    updatedAt: now, archived: false, turns: [{ id: "history", status: "completed", items: [
      { id: "history-user", type: "userMessage", content: [{ type: "text", text: "Isolated card layout history." }] },
      { id: "history-agent", type: "agentMessage", text: Array.from({ length: 70 }, (_, i) =>
        `CARD_HISTORY_${i + 1}: Existing transcript content allows an actual scroll-away check.`).join("\n\n") },
    ] }] },
} }));
// The fixture's opt-in profile knob (tests/fixtures/codex-server.cjs, fixture-approval-card.json)
// only enriches request data; the real turn/start/pending-ID/response pipeline stays intact and the
// unmodified fixture binary is launched, so the suite also runs through the offscreen adapter.
const longCommand = Array.from({ length: 150 }, (_, i) => `printf 'CARD_LINE_${String(i + 1).padStart(3, "0")} synthetic fixture text'`).join("\n");
await fs.writeFile(path.join(profile, "fixture-approval-card.json"), JSON.stringify({ enrichCommand: true }));
const binary = path.join(root, "tests/fixtures/codex-server.cjs");
assert.equal((await fs.readFile(binary, "utf8")).split("'fixture-approval-card.json'").length, 2, "Fixture must expose the approval-card knob exactly once");
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
delete env.ELECTRON_RUN_AS_NODE;
delete env.CODE_DESKTOP_DEV_URL;
const checks = [], metrics = {}, errors = [], screenshots = [];
let app, page, buildInfo;
const near = (actual, expected, tolerance = .5) => assert.ok(Math.abs(actual - expected) <= tolerance,
  `${actual} should be within ${tolerance} of ${expected}`);
const card = () => page.locator(".sac-card");
async function records() {
  try { return (await fs.readFile(path.join(profile, "fixture-responses.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
}
async function frames() { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function screenshot(name) {
  const file = path.join(evidence, name);
  await page.screenshot({ path: file });
  screenshots.push(file);
}
async function send(prompt, kind) {
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill(prompt);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(`.sac-card[data-approval-kind="${kind}"]`).waitFor();
  await card().scrollIntoViewIfNeeded();
  assert.ok(await card().getAttribute("data-approval-instance"));
  assert.equal(await card().count(), 1);
}
async function finish(action, expected) {
  const before = (await records()).length;
  if (action !== "decline" && action !== "deny") await page.waitForTimeout(450);
  await card().locator(`[data-approval-action="${action}"]`).click();
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal((await records()).length, before + 1);
  assert.deepEqual((await records()).at(-1).result, expected);
}
async function measure() {
  return card().evaluate(element => {
    const style = getComputedStyle(element), heading = element.querySelector(".sac-heading");
    const allows = element.querySelector(".sac-allows"), actions = element.querySelector(".sac-actions");
    const rectangle = element.getBoundingClientRect();
    return { outerWidth: rectangle.width, contentWidth: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow,
      cardHeight: rectangle.height, maxHeight: style.maxHeight, headingFont: getComputedStyle(heading).fontSize,
      headingLine: getComputedStyle(heading).lineHeight, headingWeight: getComputedStyle(heading).fontWeight,
      direction: getComputedStyle(actions).flexDirection, allowsDirection: getComputedStyle(allows).flexDirection,
      actionsWidth: actions.getBoundingClientRect().width,
      buttons: [...element.querySelectorAll(".sac-button")].map(button => {
        const css = getComputedStyle(button), rect = button.getBoundingClientRect();
        return { action: button.dataset.approvalAction, height: rect.height, width: rect.width,
          font: css.fontSize, line: css.lineHeight, border: css.borderTopWidth, radius: css.borderRadius };
      }) };
  });
}
async function widthViaDivider(targetOuterWidth) {
// 0.2.14 tile engine: separators are labelled "Resize {i} and {i+1}" (2.2553.1 Mh aria-label).
  const divider = page.getByRole("separator", { name: /^Resize Chat and / });
  await divider.focus();
  await page.keyboard.press("Home");
  await frames();
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await card().evaluate(element => element.getBoundingClientRect().width);
    if (Math.abs(current - targetOuterWidth) < .01) break;
    const box = await divider.boundingBox();
    assert.ok(box);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + targetOuterWidth - current, y, { steps: 3 });
    await page.mouse.up(); await frames();
  }
  await card().scrollIntoViewIfNeeded();
  return measure();
}

async function reenterThenActivate(mode) {
  // Let initial mount / window activation arming expire first. Only actual
  // observed hidden -> visible can explain the following new 400ms window.
  await page.waitForTimeout(450);
  return card().evaluate(async (element, mode) => {
    const viewport = element.closest(".transcript");
    const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const observed = want => new Promise((resolve, reject) => {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting === want)) return;
        clearTimeout(timer); observer.disconnect(); resolve();
      });
      const timer = setTimeout(() => { observer.disconnect(); reject(new Error(`Card never became ${want ? "visible" : "hidden"}`)); }, 2500);
      observer.observe(element);
    });
    element.focus({ preventScroll: true });
    viewport.scrollTop = 0;
    await observed(false); await frame();
    const hidden = element.getBoundingClientRect().top >= viewport.getBoundingClientRect().bottom;
    if (!hidden) throw new Error("Fixture history did not fully clip the focused card");
    element.scrollIntoView({ block: "nearest", behavior: "instant" });
    const returnedAt = performance.now();
    await observed(true); await frame();
    const activationDelay = performance.now() - returnedAt;
    if (activationDelay >= 400) throw new Error(`Re-entry probe missed its 400ms window (${activationDelay}ms)`);
    if (mode === "click") element.querySelector('[data-approval-action="accept"]').click();
    else element.dispatchEvent(new KeyboardEvent("keydown", { key: mode === "escape" ? "Escape" : "Enter",
      metaKey: mode === "grant", bubbles: true, cancelable: true }));
    return { mode, hiddenObserved: hidden, activationDelay, keptFocus: document.activeElement === element };
  }, mode);
}

try {
  const manifest = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  const packageInfo = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  buildInfo = { version: manifest.version, builtAt: manifest.builtAt, sourceSha256: manifest.sourceSha256,
    verifiedSourceFiles: manifest.sources.length };
  assert.equal(packageInfo.version, manifest.version, "Build version must match the current package");
  assert.equal(createHash("sha256").update(JSON.stringify(manifest.sources)).digest("hex"), manifest.sourceSha256,
    "Build manifest source digest must be internally consistent");
  for (const entry of manifest.sources)
    assert.equal(createHash("sha256").update(await fs.readFile(path.join(root, entry.path))).digest("hex"), entry.sha256,
      `Build is stale: ${entry.path}`);
  for (const required of ["src/source-approval-card.jsx", "src/source-approval-card.css", "src/approval-card-model.mjs",
    "src/approval-draft-model.mjs", "src/main.jsx", "electron/main.cjs"])
    assert.ok(manifest.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  app = await electron.launch({ executablePath: process.env.TEST_ELECTRON_BINARY || path.join(root,
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"), args: [root], env });
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), buildInfo.version);
  page = await app.firstWindow(); page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1468, 852));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await page.locator(".source-session-open").filter({ hasText: "Ordinary approval card fixture" }).click();
  await page.getByText("CARD_HISTORY_70", { exact: false }).waitFor();
  await page.evaluate(() => document.fonts.ready);

  // Hold only a chosen respond call BEFORE it reaches the actual handler. This
  // creates real pending UI without sending a response and then pretending not to.
  await app.evaluate(({ ipcMain }) => {
    const channel = "desktop:call", original = ipcMain._invokeHandlers?.get(channel);
    if (typeof original !== "function") throw new Error("Cannot wrap the real fixture IPC handler");
    const state = { holdNext: false, release: null, calls: 0 };
    globalThis.approvalCardUiGate = state;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, action, params) => {
      if (action === "respond") {
        state.calls++;
        if (state.holdNext) {
          state.holdNext = false;
          await new Promise(resolve => { state.release = resolve; });
          state.release = null;
        }
      }
      return original(event, action, params);
    });
    state.restore = () => { state.release?.(); ipcMain.removeHandler(channel); ipcMain.handle(channel, original); };
  });

  // Observe mounting to activate within the actual initial 400ms grace. This is
  // a synthetic click regression, recorded as such, never a real command.
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const button = document.querySelector('.sac-card[data-approval-kind="command"] [data-approval-action="accept"]');
      if (!button) return;
      observer.disconnect();
      window.cardInitialClick = { disabled: button.disabled, ariaDisabled: button.getAttribute("aria-disabled"), at: performance.now() };
      button.click();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.cardInitialObserver = observer;
  });
  await send("fixture:command-card", "command");
  // F07 NM (approval-current.js:15959-16006): an sr-only role=status span in the card is cleared, then
  // filled 50 ms after a new request with pM's 'Permission requested: …' (polled from the send; ~100 ms).
  metrics.announcement = await page.evaluate(() => new Promise(resolve => {
    const node = document.querySelector(".sac-card [data-approval-announcement]"), start = performance.now();
    const check = () => node?.textContent ? resolve({ text: node.textContent, role: node.getAttribute("role"), at: performance.now() - start,
      hidden: getComputedStyle(node).clip }) : performance.now() - start > 2000 ? resolve(null) : requestAnimationFrame(check);
    check();
  }));
  assert.ok(metrics.announcement, "the live region is filled");
  assert.equal(metrics.announcement.role, "status");
  assert.equal(metrics.announcement.text, "Permission requested: run this command. printf approval-test. Protocol fixture: wait for the user decision.");
  assert.ok(metrics.announcement.at < 150, `announced within ~100 ms (${metrics.announcement.at} ms after the card was found)`);
  metrics.initialClick = await page.evaluate(() => window.cardInitialClick);
  assert.ok(metrics.initialClick);
  assert.equal(metrics.initialClick.disabled, false);
  assert.notEqual(metrics.initialClick.ariaDisabled, "true");
  assert.equal((await records()).length, 0, "Allow click during initial grace sends nothing");
  const heading = card().locator(".sac-heading");
  assert.equal(await heading.evaluate(element => element.tagName), "BUTTON");
  assert.equal(await heading.getAttribute("aria-expanded"), "true");
  await heading.click();
  assert.equal(await heading.getAttribute("aria-expanded"), "false");
  assert.equal(await card().locator(".sac-details").isVisible(), false);
  // approval-current.js:15275-15284: the reason is its own block (.sac-reason), not a context line.
  assert.equal(await card().locator(".sac-reason").isVisible(), true);
  assert.equal(await card().locator('[data-context="reason"]').count(), 0);
  for (const key of ["cwd", "network"]) assert.equal(await card().locator(`[data-context="${key}"]`).isVisible(), true);
  assert.match(await card().locator('[data-context="cwd"]').innerText(), /workspace/);
  assert.match(await card().locator('[data-context="network"]').innerText(), /https:\/\/approval-card\.example\.invalid:8443/);
  await heading.click();
  assert.equal(await card().locator(".sac-code").textContent(), "printf approval-test");
  assert.equal(await card().locator(".sac-heading [data-cds=Icon]").count(), 0);
  checks.push("real command request: reason/cwd/network persist outside raw detail disclosure; source heading adds no caret; initial allow grace prevents a synthetic mount click");

  await page.waitForTimeout(450);
  await card().focus(); await page.keyboard.press("Enter");
  assert.equal(await card().locator('[data-approval-action="accept"]').evaluate(element => element === document.activeElement), true);
  assert.equal((await records()).length, 0, "Container Enter moves focus and never approves");
  for (const [key, expected] of [["ArrowRight", "decline"], ["ArrowDown", "acceptForSession"], ["ArrowLeft", "decline"], ["ArrowUp", "accept"]]) {
    await page.keyboard.press(key);
    assert.equal(await card().locator(`[data-approval-action="${expected}"]`).evaluate(element => element === document.activeElement), true);
  }
  await card().evaluate(element => {
    for (const fields of [{ ctrlKey: true, altKey: true }, { metaKey: true, repeat: true },
      { ctrlKey: true, isComposing: true }, { metaKey: true, keyCode: 229 }])
      element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...fields }));
  });
  await frames(); assert.equal((await records()).length, 0);
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menu", { name: "Session menu", exact: true }).waitFor();
  await card().evaluate(element => element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true, cancelable: true })));
  await frames(); assert.equal((await records()).length, 0);
  await page.keyboard.press("Escape");
  await page.getByRole("menu", { name: "Session menu", exact: true }).waitFor({ state: "detached" });
  checks.push("local card Enter only focuses primary; four action arrows wrap; Alt/IME/229/repeat and real open-menu state do not grant");

  // Exercise the exact bug: keep focus on the card, scroll it fully outside its
  // real transcript clipping viewport and dispatch in that same JS task. No IO
  // callback or cached visibility state has an opportunity to update first.
  metrics.offscreen = await card().evaluate(element => {
    const viewport = element.closest(".transcript");
    element.focus({ preventScroll: true }); viewport.scrollTop = 0;
    const a = element.getBoundingClientRect(), b = viewport.getBoundingClientRect();
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true, cancelable: true }));
    element.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    return { cardTop: a.top, viewportBottom: b.bottom, keptFocus: document.activeElement === element };
  });
  assert.ok(metrics.offscreen.cardTop >= metrics.offscreen.viewportBottom);
  assert.equal(metrics.offscreen.keptFocus, true);
  await frames(); assert.equal((await records()).length, 0, "A fully clipped old focused card cannot respond");
  await card().scrollIntoViewIfNeeded();
  checks.push("same-task scroll-away + old-focus grant/deny keys are rejected using current ancestor clipping geometry");

  metrics.wide = await measure();
  near(metrics.wide.outerWidth, 480);
  near(metrics.wide.contentWidth, 456);
  assert.equal(metrics.wide.background, "rgba(0, 0, 0, 0)");
  assert.equal(metrics.wide.border, "0px"); assert.notEqual(metrics.wide.shadow, "none");
  assert.match(metrics.wide.shadow, /0px 0px 0px 1px/);
  assert.equal(metrics.wide.headingFont, "13px"); assert.equal(metrics.wide.headingLine, "19px");
  assert.equal(metrics.wide.headingWeight, "580");
  for (const button of metrics.wide.buttons) { near(button.height, 24, .1); assert.equal(button.font, "13px"); assert.equal(button.line, "19px"); assert.equal(button.border, "0px"); }
  // CDS Shortcut keycap (2.2553.1 shared-frame Qa/Wa/Ga :2031-2046, Button ks :2936-2944 with gs :2716):
  // only Allow once carries it (approval-current.js:15846-15854); deny/persistent allows hide chord hints.
  const keycapProbe = () => card().evaluate(element => {
    const shortcuts = [...element.querySelectorAll('[data-cds="Shortcut"]')], shortcut = shortcuts[0];
    const button = shortcut?.closest("button"), css = shortcut && getComputedStyle(shortcut), buttonCss = button && getComputedStyle(button);
    const kbds = shortcut ? [...shortcut.querySelectorAll("kbd")] : [];
    return { count: shortcuts.length, owner: button?.dataset.approvalAction, primary: !!shortcut?.closest("[data-approval-primary]"),
      ariaHidden: shortcut?.getAttribute("aria-hidden"), variant: shortcut?.dataset.variant, display: css?.display,
      marginStart: css?.marginInlineStart, marginEnd: parseFloat(css?.marginInlineEnd), fontSize: parseFloat(css?.fontSize),
      buttonHeight: button?.getBoundingClientRect().height, buttonPad: parseFloat(buttonCss?.paddingLeft), buttonColor: buttonCss?.color,
      labelGap: shortcut && shortcut.getBoundingClientRect().left - button.querySelector(".sac-button-label").getBoundingClientRect().right,
      glyphs: kbds.map(kbd => kbd.querySelector('[aria-hidden="true"]')?.textContent), spoken: kbds.map(kbd => kbd.lastElementChild?.textContent),
      keys: kbds.map(kbd => { const style = getComputedStyle(kbd), rect = kbd.getBoundingClientRect();
        return { height: rect.height, width: rect.width, fontSize: parseFloat(style.fontSize), radius: style.borderRadius, border: style.borderTopWidth,
          borderStyle: style.borderTopStyle, color: style.color, background: style.backgroundColor, lineHeight: style.lineHeight }; }),
      others: [...element.querySelectorAll(".sac-button:not([data-approval-primary])")].map(other => ({ action: other.dataset.approvalAction,
        caps: other.querySelectorAll('[data-cds="Shortcut"], kbd').length })),
      coarse: matchMedia("(pointer: coarse)").matches };
  });
  metrics.keycap = await keycapProbe();
  assert.equal(metrics.keycap.count, 1); assert.equal(metrics.keycap.owner, "accept"); assert.equal(metrics.keycap.primary, true);
  assert.equal(metrics.keycap.ariaHidden, "true"); assert.equal(metrics.keycap.variant, "keycap"); assert.equal(metrics.keycap.display, "flex");
  assert.deepEqual(metrics.keycap.glyphs, ["\u2318", "\u23CE"]); assert.deepEqual(metrics.keycap.spoken, ["Command", "Enter"]);
  assert.equal(metrics.keycap.marginStart, "4px"); near(metrics.keycap.labelGap, 8, .5);
  near(metrics.keycap.marginEnd, (metrics.keycap.buttonHeight - metrics.keycap.fontSize - 6) / 2 - metrics.keycap.buttonPad, .1);
  for (const key of metrics.keycap.keys) {
    near(key.height, Math.round(key.fontSize + 6), .5); near(key.width, key.fontSize + 6, .5);
    assert.equal(key.fontSize, metrics.keycap.fontSize); assert.equal(key.radius, "4px"); assert.equal(key.border, "1px"); assert.equal(key.borderStyle, "solid");
    assert.equal(key.color, metrics.keycap.buttonColor, "Primary Button sets --cds-shortcut-cap-ink: currentColor");
    assert.equal(key.background, "rgba(0, 0, 0, 0)");
  }
  assert.deepEqual(metrics.keycap.others.map(other => other.caps), metrics.keycap.others.map(() => 0));
  assert.ok(metrics.keycap.others.some(other => other.action === "decline"));
  // pointer-coarse:hidden. Playwright emulateMedia has no pointer feature, so drive Chromium's own
  // touch emulation through CDP; fall back to the emulated media feature only if touch does not flip it.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  let coarse = await keycapProbe(), coarseVia = "Emulation.setTouchEmulationEnabled";
  if (!coarse.coarse) { await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "pointer", value: "coarse" }] }); coarse = await keycapProbe(); coarseVia = "Emulation.setEmulatedMedia pointer"; }
  metrics.keycapCoarse = { via: coarseVia, coarse: coarse.coarse, display: coarse.display, count: coarse.count };
  await cdp.send("Emulation.setEmulatedMedia", { features: [] });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await cdp.detach();
  assert.equal(metrics.keycapCoarse.coarse, true, "pointer: coarse emulation must take effect");
  assert.equal(metrics.keycapCoarse.display, "none"); assert.equal(metrics.keycapCoarse.count, 1);
  const restored = await keycapProbe(); assert.equal(restored.coarse, false); assert.equal(restored.display, "flex");
  await screenshot("approval-card-keycap.png");
  checks.push("CDS Shortcut keycap: exactly one aria-hidden ⌘⏎ keycap inside [data-approval-primary] Allow once (Command/Enter sr text), kbd height/width round(font+6), 4px radius, 1px solid line, currentColor ink on primary, ms 4px after the gap-1 label, gs trailing end margin, none on Deny/session allow, hidden under pointer: coarse");
  await page.getByRole("button", { name: "View options", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: "Files", exact: true }).click();
  await page.getByRole("complementary", { name: "Files panel", exact: true }).waitFor();
  metrics.widths = [];
  for (const [outer, content, direction] of [[480, 456, "row"], [444, 420, "column"], [443, 419, "column"], [304, 280, "column"]]) {
    const result = await widthViaDivider(outer);
    near(result.outerWidth, outer, .1); near(result.contentWidth, content, .1);
    assert.equal(result.direction, direction); assert.equal(result.allowsDirection, direction);
    if (direction === "column") for (const button of result.buttons) near(button.width, result.actionsWidth, .5);
    for (const button of result.buttons) near(button.height, 24, .1);
    metrics.widths.push(result);
  }
  await screenshot("approval-card-narrow.png");
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
  checks.push("computed borderless transparent shadow card, 13/19 semibold heading and 24px 13/19 actions; real pane divider tests outer480/content456 and content420/419/280 two-group layout");

  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Settings/ }).click();
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  await page.waitForFunction(()=>document.documentElement.dataset.mode==='dark');
  await page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  // Let the Settings dialog finish its exit fade so the dark screenshot shows the card, not the overlay.
  await page.getByRole("dialog", { name: "Settings", exact: true }).waitFor({ state: "detached" });
  assert.equal(await page.locator("html").getAttribute("data-mode"), "dark");
  await card().scrollIntoViewIfNeeded(); metrics.dark = await measure();
  assert.equal(metrics.dark.background, "rgba(0, 0, 0, 0)");
  assert.notEqual(metrics.dark.shadow, metrics.wide.shadow);
  await screenshot("approval-card-dark.png");

  await app.evaluate(() => { globalThis.approvalCardUiGate.holdNext = true; });
  await page.waitForTimeout(450);
  const beforeBusy = await card().locator('[data-approval-action="accept"]').boundingBox();
  await card().locator('[data-approval-action="accept"]').click();
  await page.waitForFunction(() => document.querySelector(".sac-card")?.getAttribute("aria-busy") === "true");
  const callsWhileHeld = await app.evaluate(() => globalThis.approvalCardUiGate.calls);
  assert.equal(callsWhileHeld, 1);
  assert.equal((await records()).length, 0, "The real response is still gated before dispatch");
  assert.equal(await card().locator('.sac-button[aria-disabled="true"]').count(), 3);
  assert.equal(await card().locator('.sac-button[aria-busy="true"]').getAttribute("data-approval-action"), "accept");
  assert.equal(await card().locator(".sac-button-spinner").count(), 1);
  // ks :2886 fades the whole content span (label + Shortcut) while busy; the cap keeps its width.
  assert.equal(await card().locator('[data-approval-action="accept"] [data-cds="Shortcut"]').evaluate(element => getComputedStyle(element).opacity), "0");
  const busyBox = await card().locator('[data-approval-action="accept"]').boundingBox();
  near(busyBox.width, beforeBusy.width, .1); near(busyBox.height, beforeBusy.height, .1);
  // The busy toggle does not re-announce the same request (NM keys on the tool id + copy).
  await page.waitForTimeout(120);
  assert.match(await card().locator("[data-approval-announcement]").textContent(), /^Permission requested: run this command\./);
  await card().locator('[data-approval-action="decline"]').evaluate(element => element.click());
  assert.equal(await app.evaluate(() => globalThis.approvalCardUiGate.calls), callsWhileHeld);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await card().evaluate(element => getComputedStyle(element).animationName), "none");
  assert.equal(await card().locator(".sac-button-spinner i:last-child").evaluate(element => getComputedStyle(element).animationName), "none");
  await screenshot("approval-card-busy.png");
  await app.evaluate(() => globalThis.approvalCardUiGate.release?.());
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.deepEqual((await records()).at(-1).result, { decision: "accept" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  checks.push("real theme control changes tokens; delayed real respond shows one stable-size busy action, blocks other actions and honors reduced motion");

  await send("fixture:command-card-long", "command");
  const body = card().locator(".sac-body");
  await page.waitForFunction(() => document.querySelector(".sac-body")?.getAttribute("tabindex") === "0");
  assert.equal(await body.getAttribute("role"), "group"); assert.equal(await body.getAttribute("aria-label"), "Request details");
  assert.equal(await card().locator(".sac-code").textContent(), longCommand);
  await body.focus(); await page.keyboard.press("End");
  await page.waitForFunction(() => document.querySelector(".sac-body").scrollTop > 0);
  metrics.longBody = await body.evaluate(element => ({ scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, scrollTop: element.scrollTop }));
  await card().locator(".sac-heading").click();
  await page.waitForFunction(() => !document.querySelector(".sac-body")?.hasAttribute("tabindex"));
  assert.equal(await card().locator(".sac-reason").isVisible(), true);
  for (const key of ["cwd", "network"]) assert.equal(await card().locator(`[data-context="${key}"]`).isVisible(), true);
  await finish("decline", { decision: "decline" });
  checks.push("real long protocol detail is preserved; only overflowing body receives labeled keyboard scroll focus; collapse removes overflow focus while retaining context");

  await send("fixture:file card", "file");
  assert.equal(await card().locator(".sac-heading").evaluate(element => element.tagName), "DIV");
  assert.equal(await card().locator(".sac-details").count(), 0);
  assert.match(await card().locator('[data-context="grant-root"]').innerText(), /Requested write root:/);
  await finish("decline", { decision: "decline" });
  // approval-current.js:14521-14534 Write -> "write" + SM(file_path); :15201-15205 SM basename meta +
  // clampTitle; :15399-15470 EM "Allow Claude to <b>{action}</b> <meta>{metaText}</meta>?" with both parts
  // span.text-primary [unicode-bidi:plaintext] inside a line-clamp-2 span (detail present). Real item.changes.
  await send("fixture:file-tool-approval", "file");
  metrics.fileHeading = await card().locator(".sac-heading").evaluate(element => {
    const probe = document.createElement("span"); probe.style.color = "var(--cds-text-primary)"; element.append(probe);
    const primary = getComputedStyle(probe).color;
    // The source .line-clamp-2 rule (ion-dist css) verbatim: Chromium reports this legacy -webkit-box
    // combination as its own computed display (flow-root here), so compare against the same engine.
    probe.style.cssText = "-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden";
    const sourceDisplay = getComputedStyle(probe).display; probe.remove();
    const inner = element.firstElementChild, css = getComputedStyle(inner);
    return { tag: element.tagName, text: element.textContent, aria: element.closest(".sac-card").getAttribute("aria-label"), primary,
      heading: getComputedStyle(element).color, clamp: inner.getAttribute("data-clamp"), lineClamp: css.webkitLineClamp,
      display: css.display, sourceDisplay, boxOrient: css.webkitBoxOrient, overflow: css.overflow,
      em: [...element.querySelectorAll(".sac-em")].map(span => ({ text: span.textContent, color: getComputedStyle(span).color, bidi: getComputedStyle(span).unicodeBidi })) };
  });
  assert.equal(metrics.fileHeading.tag, "BUTTON");
  assert.equal(metrics.fileHeading.text, "Allow DeepSeek to write created.ts?");
  assert.equal(metrics.fileHeading.aria, "Permission request: Allow DeepSeek to write created.ts?");
  assert.deepEqual(metrics.fileHeading.em.map(span => span.text), ["write", "created.ts"]);
  for (const span of metrics.fileHeading.em) { assert.equal(span.color, metrics.fileHeading.primary); assert.equal(span.bidi, "plaintext"); }
  assert.equal(metrics.fileHeading.heading, metrics.fileHeading.primary, "ev header around B is text-primary, not secondary");
  assert.equal(metrics.fileHeading.clamp, ""); assert.equal(metrics.fileHeading.lineClamp, "2");
  assert.equal(metrics.fileHeading.display, metrics.fileHeading.sourceDisplay); assert.equal(metrics.fileHeading.boxOrient, "vertical");
  assert.equal(metrics.fileHeading.overflow, "hidden");
  // F07 EM file request (approval-current.js:15528-15552 U, :15596-15607 yce → cd98a1763): the full-path
  // detail box, then the transcript's in-card diff body (UO header path + Copy over the code box); no
  // local FileChanges title or Changes-pane file header. YO pure side: the gutter reads '+ 1'.
  metrics.fileDetail = await card().locator(".sac-details").evaluate(node => ({
    path: node.querySelector(".sac-path")?.textContent, children: [...node.children].map(child => child.className),
    inCard: node.querySelectorAll(".sft-outer[data-in-card]").length, legacy: node.querySelectorAll(".source-file-change-title, .source-file-changes, [data-placement=changes]").length,
    header: node.querySelector(".sft-outer[data-in-card] > .sft-header .sft-path")?.getAttribute("aria-label"),
    gutter: node.querySelector(".sft-diff[data-pure-side] .sft-number")?.textContent, signs: node.querySelectorAll(".sft-sign").length,
    pathBox: (() => { const box = node.querySelector(".sac-path"); const css = box && getComputedStyle(box); return css && { radius: css.borderTopLeftRadius, font: css.fontFamily, color: css.color }; })() }));
  assert.equal(metrics.fileDetail.path, path.join(workspace, "created.ts"));
  assert.deepEqual(metrics.fileDetail.children, ["sac-code sac-path", "sft-outer"]);
  assert.equal(metrics.fileDetail.inCard, 1); assert.equal(metrics.fileDetail.legacy, 0);
  assert.equal(metrics.fileDetail.header, path.join(workspace, "created.ts"));
  assert.equal(metrics.fileDetail.gutter, "+ 1"); assert.equal(metrics.fileDetail.signs, 0);
  assert.equal(metrics.fileDetail.pathBox.radius, "5px");
  // NM fills the live region 50 ms after the request identity/copy settles (the in-card diff body can still be
  // re-rendering the card here), so wait for it as the agent-approval step below does.
  metrics.fileAnnouncementWait = await page.evaluate(async () => {
    const start = performance.now();
    while (performance.now() - start < 2000) {
      const text = document.querySelector(".sac-card [data-approval-announcement]")?.textContent;
      if (text) return { text, waited: Math.round(performance.now() - start) };
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return { text: "", waited: null };
  });
  assert.match(metrics.fileAnnouncementWait.text, /^Permission requested: write\. .*created\.ts, created\.ts\. Fixture file change$/);
  await screenshot("approval-card-file-heading.png");
  await finish("decline", { decision: "decline" });
  await send("fixture:file-tool-approval-multi", "file");
  assert.equal(await card().locator(".sac-path").textContent(), [path.join(workspace, "created.ts"), path.join(workspace, "fixture.txt")].join("\n"));
  assert.equal(await card().locator(".sac-details .sft-outer[data-in-card]").count(), 2);
  assert.equal(await card().locator(".sac-heading").textContent(), "Allow DeepSeek to edit files?");
  assert.equal(await card().locator(".sac-heading .sac-em").count(), 0);
  assert.equal(await card().locator(".sac-heading [data-clamp]").count(), 0);
  await finish("decline", { decision: "decline" });
  checks.push("single real FileUpdateChange add names its basename with two text-primary spans and a 2-line clamp; two changes keep the generic title");
  checks.push("F07 file request: the full-path sac-code box then one .sft-outer[data-in-card] diff per change (no FileChanges title / Changes-pane header), pure-side gutter '+ 1', two changes list both paths");
  // F07 Task/Agent (approval-current.js:14570-14579): "run an agent" + description, no detail, so the
  // heading is a plain div (no toggle, no clamp) and there is no Working directory line.
  await send("fixture:agent-approval", "command");
  assert.equal(await card().locator(".sac-heading").evaluate(element => element.tagName), "DIV");
  assert.equal(await card().locator(".sac-heading").textContent(), "Allow DeepSeek to run an agent Audit the parser?");
  assert.equal(await card().locator(".sac-details").count(), 0);
  assert.equal(await card().locator('[data-context="cwd"]').count(), 0);
  assert.equal(await card().locator(".sac-heading [data-clamp]").count(), 0);
  await page.waitForFunction(() => document.querySelector(".sac-card [data-approval-announcement]")?.textContent === "Permission requested: run an agent, Audit the parser");
  await finish("decline", { decision: "decline" });
  checks.push("F07 agent approval: div heading 'Allow DeepSeek to run an agent Audit the parser?' with no detail, clamp or cwd; announced as 'Permission requested: run an agent, Audit the parser'");
  await send("fixture:permissions card", "permissions");
  assert.equal(await card().locator('[data-approval-action="acceptForSession"]').count(), 0);
  await card().locator(".sac-heading").click();
  assert.equal(await card().locator('[data-context="scope"]').innerText(), "Applies to this turn only.");
  assert.equal(await card().locator('[data-context="scope"]').isVisible(), true);
  await page.waitForTimeout(450); await card().focus(); await page.keyboard.press("Meta+Shift+Enter");
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.deepEqual((await records()).at(-1).result, { permissions: { network: { enabled: true } }, scope: "turn" });
  checks.push("real file request without raw diff has no fake disclosure; permission scope stays visible and shifted grant shortcut remains turn-only");

  // Question card primary (approval-current.js:8249-8256 `shortcut: a ? "cmd+enter"`) draws the same keycap,
  // and yk's ep({ allowOnce: K }) (:8011-8023) makes ⌘⏎ advance from the card, not only from the Other input.
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill("fixture:input card");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  const question = page.locator(".sq-card");
  await question.waitFor(); await question.scrollIntoViewIfNeeded();
  const questionProbe = () => question.evaluate(element => {
    const shortcuts = [...element.querySelectorAll('[data-cds="Shortcut"]')], shortcut = shortcuts[0];
    const submit = element.querySelector(".sq-submit"), kbd = shortcut?.querySelector("kbd");
    return { count: shortcuts.length, inSubmit: !!shortcut && submit.contains(shortcut), ariaHidden: shortcut?.getAttribute("aria-hidden"),
      label: submit.querySelector(".sq-submit-label").firstChild?.textContent,
      marginStart: shortcut && getComputedStyle(shortcut).marginInlineStart, disabled: submit.disabled,
      height: kbd?.getBoundingClientRect().height, fontSize: kbd && parseFloat(getComputedStyle(kbd).fontSize),
      radius: kbd && getComputedStyle(kbd).borderRadius, ink: kbd && getComputedStyle(kbd).color, buttonColor: getComputedStyle(submit).color,
      glyphs: shortcut ? [...shortcut.querySelectorAll('kbd > [aria-hidden="true"]')].map(glyph => glyph.textContent) : [] };
  });
  metrics.questionKeycap = await questionProbe();
  assert.equal(metrics.questionKeycap.count, 1); assert.equal(metrics.questionKeycap.inSubmit, true);
  assert.equal(metrics.questionKeycap.ariaHidden, "true"); assert.equal(metrics.questionKeycap.label, "Submit");
  assert.deepEqual(metrics.questionKeycap.glyphs, ["\u2318", "\u23CE"]); assert.equal(metrics.questionKeycap.marginStart, "4px");
  near(metrics.questionKeycap.height, Math.round(metrics.questionKeycap.fontSize + 6), .5); assert.equal(metrics.questionKeycap.radius, "4px");
  // Product correction (0.2.115), not a loosening: _se (approval-current.js:7790-7800) preselects options[0],
  // so the single-page Submit starts enabled (was asserted disabled before preselection existed).
  assert.equal(metrics.questionKeycap.ink, metrics.questionKeycap.buttonColor); assert.equal(metrics.questionKeycap.disabled, false);
  assert.equal(await question.locator(".sq-option").filter({ hasText: "First test choice" }).getAttribute("aria-pressed"), "true");
  assert.equal(await question.locator('.sq-option[aria-pressed="true"]').count(), 1);
  // Footer :8232-8258: `flex items-center justify-end gap-sm` = br{secondary 'Skip'} then the primary.
  const skipProbe = () => question.evaluate(element => {
    const footer = element.querySelector(".sq-actions"), skip = footer.querySelector(".sq-skip"), submit = footer.querySelector(".sq-submit");
    const probe = footer.ownerDocument.createElement("div"); probe.style.columnGap = "var(--cds-gap-sm)"; footer.append(probe);
    const gapSm = parseFloat(getComputedStyle(probe).columnGap); probe.remove();
    const a = skip.getBoundingClientRect(), b = submit.getBoundingClientRect(), css = getComputedStyle(skip), paint = getComputedStyle(skip, "::before");
    return { order: [...footer.children].map(child => child.matches(".sq-submit") || child.querySelector(".sq-submit") ? "submit" : child.className),
      text: skip.textContent, variant: skip.dataset.variant, disabled: skip.disabled, keycaps: skip.querySelectorAll('[data-cds="Shortcut"]').length,
      justify: getComputedStyle(footer).justifyContent, footerGap: parseFloat(getComputedStyle(footer).columnGap), gapSm,
      spacing: b.left - a.right, skipHeight: a.height, submitHeight: b.height, sameRow: Math.abs(a.top - b.top),
      rightInset: footer.getBoundingClientRect().right - parseFloat(getComputedStyle(footer).paddingRight) - b.right,
      skipColor: css.color, paint: paint.backgroundColor, ring: paint.boxShadow, submitPaint: getComputedStyle(submit, "::before").backgroundColor };
  });
  metrics.questionSkip = await skipProbe();
  assert.deepEqual(metrics.questionSkip.order, ["sq-skip", "submit"]);
  assert.equal(metrics.questionSkip.text, "Skip"); assert.equal(metrics.questionSkip.variant, "secondary");
  assert.equal(metrics.questionSkip.disabled, false); assert.equal(metrics.questionSkip.keycaps, 0);
  assert.equal(metrics.questionSkip.justify, "flex-end"); assert.ok(metrics.questionSkip.gapSm > 0);
  assert.equal(metrics.questionSkip.footerGap, metrics.questionSkip.gapSm);
  near(metrics.questionSkip.spacing, metrics.questionSkip.gapSm, .5);
  near(metrics.questionSkip.skipHeight, metrics.questionSkip.submitHeight, .1); near(metrics.questionSkip.sameRow, 0, .1);
  near(metrics.questionSkip.rightInset, 0, .5);
  assert.notEqual(metrics.questionSkip.paint, metrics.questionSkip.submitPaint); assert.match(metrics.questionSkip.ring, /inset/);
  await screenshot("approval-card-question-keycap.png");
  const beforeQuestion = (await records()).length;
  await question.locator(".sq-option").filter({ hasText: "First test choice" }).click();
  await question.locator(".sq-option").filter({ hasText: "First test choice" }).focus();
  await page.keyboard.press("Meta+Enter");
  await question.waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal((await records()).length, beforeQuestion + 1);
  assert.deepEqual((await records()).at(-1).result, { answers: { approach: { answers: ["First"] } } });
  checks.push("question card: first option preselected (_se) so Submit starts enabled; one aria-hidden ⌘⏎ keycap inside the Submit primary (round(font+6) cap, 4px radius, currentColor ink, ms 4px); secondary Skip left of Submit at gap-sm, same height, no keycap; card-scoped Cmd+Enter from a focused option submits the real answer");

  // Skip q (approval-current.js:7997-8008) on the single (last) page: uk counts skipped, so it submits at once.
  // The real respond is held first: while busy Skip is disabled (br disabled: l) and nothing is dispatched.
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill("fixture:input skip");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await question.waitFor(); await question.scrollIntoViewIfNeeded();
  const beforeSkip = (await records()).length;
  await app.evaluate(() => { globalThis.approvalCardUiGate.holdNext = true; });
  await question.locator(".sq-skip").click();
  await page.waitForFunction(() => document.querySelector(".sq-card")?.getAttribute("aria-busy") === "true");
  metrics.questionSkipBusy = await question.evaluate(element => ({ skipDisabled: element.querySelector(".sq-skip").disabled,
    submitBusy: element.querySelector(".sq-submit").getAttribute("aria-busy"), spinner: element.querySelectorAll(".sq-spinner").length }));
  assert.deepEqual(metrics.questionSkipBusy, { skipDisabled: true, submitBusy: "true", spinner: 1 });
  assert.equal((await records()).length, beforeSkip, "Skip's response is still gated before dispatch");
  await screenshot("approval-card-question-skip-busy.png");
  await app.evaluate(() => globalThis.approvalCardUiGate.release?.());
  await question.waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal((await records()).length, beforeSkip + 1);
  assert.deepEqual((await records()).at(-1).result, { answers: {} });
  checks.push("question Skip on the last page submits immediately with the skipped key omitted (wire result {answers:{}}); Skip is disabled while the held real respond is busy");

  // F07 multiSelect (approval-current.js:7789-7962, :8085-8088): checkbox marks (li) for every option
  // and Other, nothing preselected (_se), clicks toggle (V), Submit sends every chosen label in order.
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill("fixture:input-multi kinds");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await question.waitFor(); await question.scrollIntoViewIfNeeded();
  const multiProbe = () => question.evaluate(element => ({
    marks: [...element.querySelectorAll(".sq-option .sq-checkbox-mark, .sq-custom-label .sq-checkbox-mark")].length,
    radios: element.querySelectorAll(".sq-radio-mark").length,
    pressed: [...element.querySelectorAll(".sq-option[aria-pressed]")].map(node => node.getAttribute("aria-pressed")),
    checked: [...element.querySelectorAll(".sq-checkbox-mark[data-checked]")].length,
    submitDisabled: element.querySelector(".sq-submit").disabled,
    box: (() => { const mark = element.querySelector(".sq-checkbox-mark"), css = getComputedStyle(mark), rect = mark.getBoundingClientRect();
      return { width: rect.width, height: rect.height, radius: css.borderTopLeftRadius }; })(),
    filled: (() => { const mark = element.querySelector(".sq-checkbox-mark[data-checked]"); if (!mark) return null;
      const probe = document.createElement("span"); probe.style.color = "var(--cds-fill-accent)"; element.append(probe);
      const accent = getComputedStyle(probe).color; probe.remove();
      return { background: getComputedStyle(mark).backgroundColor, accent, glyph: mark.querySelector("[data-cds=Icon]") !== null }; })(),
  }));
  metrics.multiSelect = { initial: await multiProbe() };
  assert.equal(metrics.multiSelect.initial.marks, 4, "three options + Other draw checkbox marks");
  assert.equal(metrics.multiSelect.initial.radios, 0);
  assert.deepEqual(metrics.multiSelect.initial.pressed, ["false", "false", "false"], "nothing is preselected");
  assert.equal(metrics.multiSelect.initial.submitDisabled, true);
  near(metrics.multiSelect.initial.box.width, metrics.multiSelect.initial.box.height, .1);
  assert.notEqual(metrics.multiSelect.initial.box.radius, "9999px");
  const beforeMulti = (await records()).length;
  for (const label of ["Live", "Unit", "UI", "UI"]) await question.locator(".sq-option").filter({ hasText: `${label === "UI" ? "UI suites" : label === "Unit" ? "Unit tests" : "Live smoke"}` }).click();
  metrics.multiSelect.toggled = await multiProbe();
  assert.deepEqual(metrics.multiSelect.toggled.pressed, ["true", "false", "true"], "two aria-pressed options after toggling UI back off");
  assert.equal(metrics.multiSelect.toggled.checked, 2);
  assert.equal(metrics.multiSelect.toggled.filled.background, metrics.multiSelect.toggled.filled.accent);
  assert.equal(metrics.multiSelect.toggled.filled.glyph, true);
  assert.equal(metrics.multiSelect.toggled.submitDisabled, false);
  await screenshot("approval-card-question-multiselect.png");
  await question.locator(".sq-submit").click();
  await question.waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal((await records()).length, beforeMulti + 1);
  assert.deepEqual((await records()).at(-1).result, { answers: { kinds: { answers: ["Unit", "Live"] } } });
  checks.push("F07 multiSelect question: four square checkbox marks (options + Other), nothing preselected, clicks toggle (two aria-pressed=true), filled accent mark with a Check glyph, Submit sends both labels in option order");

  await send("fixture:command-card-reenter", "command");
  const beforeReentry = (await records()).length;
  metrics.reentry = [await reenterThenActivate("grant")];
  await frames();
  assert.equal((await records()).length, beforeReentry, "Observed reentry restarts grant-chord grace");
  assert.equal(await card().count(), 1);
  await page.waitForTimeout(450);
  await card().focus(); await page.keyboard.press("Meta+Enter");
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.equal((await records()).length, beforeReentry + 1);
  assert.deepEqual((await records()).at(-1).result, { decision: "accept" });

  await send("fixture:command-card-reenter-escape", "command");
  metrics.reentry.push(await reenterThenActivate("escape"));
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.deepEqual((await records()).at(-1).result, { decision: "decline" });

  await send("fixture:command-card-reenter-click", "command");
  metrics.reentry.push(await reenterThenActivate("click"));
  await card().waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  assert.deepEqual((await records()).at(-1).result, { decision: "accept" });
  assert.equal((await records()).length, beforeReentry + 3);
  checks.push("observed scroll-out/frame/return re-arms only grant hotkeys: early Cmd+Enter is blocked then succeeds after400ms; Escape and an already-armed visible allow click remain immediate");

  // ---- R07 (fidelity round 3): plan approval card, dismiss-on-send, empty Other, one card at a time ----
  const planCard = () => page.locator('.sac-card[data-approval-kind="plan"]');
  const composer = () => page.getByRole("textbox", { name: "Message DeepSeek", exact: true });
  const settled = () => page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  async function requestLog() {
    try { return (await fs.readFile(path.join(profile, "fixture-requests.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(JSON.parse); }
    catch (error) { if (error.code === "ENOENT") return []; throw error; }
  }
  const approve = afterPlan => ({ answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan } });
  const marker = "[User did not answer this question — they sent a message instead. Treat that message as their response; do not re-ask.]";
  // Rse (approval-current.js:9734-9884) under the bridge's 'plan-review' question (fixture:plan-review).
  await send("fixture:plan-review", "plan");
  metrics.planCard = await planCard().evaluate(element => {
    const buttons = [...element.querySelectorAll(".sac-button:not(.spc-more)")], more = element.querySelector(".spc-split .spc-more"), link = element.querySelector(".spc-open-plan"), title = element.querySelector(".spc-title");
    return { heading: title?.textContent, labelledBy: element.getAttribute("aria-labelledby") === title?.id, questionCard: element.querySelectorAll(".sq-option").length,
      link: link?.textContent, linkInTrailing: !!link?.closest(".spc-trailing"), linkSize: link && getComputedStyle(link).fontSize, linkDecoration: link && getComputedStyle(link).textDecorationLine,
      titleWeight: getComputedStyle(title).fontWeight, titleSize: getComputedStyle(title).fontSize,
      groups: [...element.querySelectorAll(".spc-actions > div")].map(group => [...group.querySelectorAll(".sac-button:not(.spc-more)")].map(button => button.dataset.approvalAction)),
      // xee split primary: the caret half opens 'More accept options' (the other trust-forward accept modes).
      more: more && { label: more.getAttribute("aria-label"), popup: more.getAttribute("aria-haspopup"), variant: more.dataset.variant, height: more.getBoundingClientRect().height,
        joined: Math.abs(more.getBoundingClientRect().left - more.previousElementSibling.getBoundingClientRect().right) < 1.5 },
      labels: buttons.map(button => button.querySelector(".sac-button-label").textContent), variants: buttons.map(button => button.dataset.variant),
      caps: buttons.map(button => [...button.querySelectorAll('[data-cds="Shortcut"] kbd')].map(kbd => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent).join("")),
      heights: buttons.map(button => button.getBoundingClientRect().height),
      // Rse epitaxy-approval-actions is flex-wrap justify-between with [&>div]:grow and a justify-end right group: in the
      // 480px card the four buttons (489px) wrap, as in the original, so the split is the left group at the start
      // edge and the accept group ending at the end edge, on one row or two.
      split: (() => { const actions = element.querySelector(".spc-actions").getBoundingClientRect(), [left, right] = element.querySelectorAll(".spc-actions > div");
        const first = left.querySelector(".sac-button").getBoundingClientRect(), last = [...right.querySelectorAll(".sac-button")].at(-1).getBoundingClientRect();
        return Math.abs(first.left - actions.left) < 1 && Math.abs(last.right - actions.right) < 1 && getComputedStyle(right).justifyContent === "flex-end"; })(),
      planItem: document.querySelector('[data-transcript-item-id^="plan-call-plan-"]')?.dataset.transcriptItemId };
  });
  assert.equal(metrics.planCard.heading, "DeepSeek proposed a plan"); assert.equal(metrics.planCard.labelledBy, true);
  assert.equal(metrics.planCard.questionCard, 0, "not the generic question card");
  assert.equal(metrics.planCard.link, "Open plan"); assert.equal(metrics.planCard.linkInTrailing, true);
  assert.equal(metrics.planCard.linkSize, "12px"); assert.equal(metrics.planCard.linkDecoration, "underline");
  assert.equal(metrics.planCard.titleWeight, "580"); assert.equal(metrics.planCard.titleSize, "13px");
  assert.deepEqual(metrics.planCard.groups, [["reject", "revise-open"], ["accept", "primary"]]);
  assert.deepEqual(metrics.planCard.labels, ["Reject", "Revise…", "Accept", "Accept and auto mode"]);
  assert.deepEqual(metrics.planCard.more && [metrics.planCard.more.label, metrics.planCard.more.popup, metrics.planCard.more.variant, metrics.planCard.more.joined], ["More accept options", "menu", "primary", true]);
  near(metrics.planCard.more.height, 24, .1);
  assert.deepEqual(metrics.planCard.variants, ["secondary", "secondary", "secondary", "primary"]);
  assert.deepEqual(metrics.planCard.caps, ["", "Esc", "⇧⌘⏎", "⌘⏎"]);
  for (const height of metrics.planCard.heights) near(height, 24, .1);
  assert.equal(metrics.planCard.split, true);
  assert.ok(metrics.planCard.planItem, "the fixture's plan item renders in the transcript");
  await screenshot("approval-card-plan-dark.png");
  // 'Open plan' scrolls to and focuses the turn's plan item.
  await planCard().getByRole("button", { name: "Open plan", exact: true }).click();
  await page.waitForFunction(id => document.activeElement?.dataset?.transcriptItemId === id, metrics.planCard.planItem);
  metrics.planOpen = await page.evaluate(() => { const row = document.activeElement, viewport = row.closest(".transcript").getBoundingClientRect(), rect = row.getBoundingClientRect();
    return { top: rect.top - viewport.top, visible: rect.top >= viewport.top - 1 && rect.top < viewport.bottom }; });
  assert.equal(metrics.planOpen.visible, true);
  // Dd skips the plan review: a composer send steers and leaves the card pending.
  const beforePlanSend = { requests: (await requestLog()).length, responses: (await records()).length };
  await composer().fill("plan note"); await page.keyboard.press("Enter");
  for (let attempt = 0; attempt < 100 && !(await requestLog()).slice(beforePlanSend.requests).some(entry => entry.method === "turn/steer"); attempt++) await page.waitForTimeout(40);
  const planSendLog = (await requestLog()).slice(beforePlanSend.requests).map(entry => entry.method);
  assert.ok(planSendLog.includes("turn/steer")); assert.equal(planSendLog.some(method => method.startsWith("response:")), false);
  await frames();
  assert.equal(await planCard().count(), 1, "a pending plan review is not dismissed by sending");
  assert.equal((await records()).length, beforePlanSend.responses);
  await planCard().scrollIntoViewIfNeeded();
  await planCard().locator('[data-approval-action="reject"]').click();
  await planCard().waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).at(-1).result, { answers: { "plan-review": { answers: ["Keep planning"] } } });
  checks.push("R07 plan card (Rse): heading 'DeepSeek proposed a plan' with a trailing 12px underlined 'Open plan' TextLink that focuses the plan item; Reject / Revise… (Esc) left, Accept (⇧⌘⏎) / 'Accept and auto mode' primary (⌘⏎) right; a composer send steers and leaves it pending; Reject sends 'Keep planning'");

  // Light theme; Escape opens the 3-row 'Plan feedback' field, Escape goes Back, Revise sends option + text.
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Settings/ }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await page.waitForFunction(() => document.documentElement.dataset.mode === "light");
  await page.getByRole("dialog", { name: "Settings", exact: true }).getByRole("button", { name: "Close", exact: true }).click();
  // #root stays inert through the dialog's exit transition (as Base UI keeps outside elements marked until unmount), so a
  // fill before it detaches never reaches the composer.
  await page.getByRole("dialog", { name: "Settings", exact: true }).waitFor({ state: "detached" });
  await send("fixture:plan-review", "plan");
  await screenshot("approval-card-plan-light.png");
  await planCard().focus(); await page.keyboard.press("Escape");
  const feedback = planCard().getByRole("textbox", { name: "Plan feedback", exact: true });
  await feedback.waitFor();
  metrics.planFeedback = await feedback.evaluate(node => ({ focused: document.activeElement === node, rows: node.rows, placeholder: node.placeholder,
    buttons: [...node.closest(".sac-card").querySelectorAll(".spc-actions .sac-button")].map(button => [button.dataset.variant, button.textContent]),
    caps: node.closest(".sac-card").querySelectorAll('.spc-actions [data-cds="Shortcut"]').length }));
  assert.deepEqual(metrics.planFeedback, { focused: true, rows: 3, placeholder: "What should change? (optional)",
    buttons: [["secondary", "Back"], ["primary", "Revise"]], caps: 0 });
  await page.keyboard.type("throwaway"); await page.keyboard.press("Escape");
  await feedback.waitFor({ state: "detached" });
  assert.equal(await planCard().locator('[data-approval-action="revise-open"]').count(), 1, "Escape in the field goes Back");
  await page.keyboard.press("Escape"); await feedback.waitFor();
  assert.equal(await feedback.inputValue(), "", "Back clears the feedback");
  await feedback.fill("Split step two");
  await screenshot("approval-card-plan-feedback-light.png");
  await planCard().getByRole("button", { name: "Revise", exact: true }).click();
  await planCard().waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).at(-1).result, { answers: { "plan-review": { answers: ["Keep planning", "Split step two"] } } });
  // Accept (Manual) and the primary (⌘⏎, the trust-forward target) carry codeDesktop.afterPlan.
  await send("fixture:plan-review", "plan");
  await page.waitForTimeout(450);
  await planCard().locator('[data-approval-action="accept"]').click();
  await planCard().waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).at(-1).result, approve("ask"));
  await send("fixture:plan-review", "plan");
  await page.waitForTimeout(450);
  await planCard().focus(); await page.keyboard.press("Meta+Enter");
  await planCard().waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).at(-1).result, approve("auto"));
  checks.push("R07 plan card in light: Escape swaps in the focused 3-row 'Plan feedback' field ('What should change? (optional)') with Back / Revise and no keycaps; Escape there goes Back and clears it; Revise sends ['Keep planning', text]; Accept sends Approve + codeDesktop.afterPlan 'ask'; ⌘⏎ sends Approve + 'auto'");

  // Dd: a composer send while a question waits answers it with lO before the steer.
  await composer().fill("fixture:input-steer card");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await question.waitFor(); await question.scrollIntoViewIfNeeded();
  const beforeDismiss = { requests: (await requestLog()).length, responses: (await records()).length };
  await composer().fill("free reply"); await page.keyboard.press("Enter");
  await question.waitFor({ state: "detached" }); await settled();
  const dismissLog = (await requestLog()).slice(beforeDismiss.requests).filter(entry => ["response:item/tool/requestUserInput", "turn/steer"].includes(entry.method));
  metrics.dismissOrder = dismissLog.map(entry => entry.method);
  assert.deepEqual(metrics.dismissOrder, ["response:item/tool/requestUserInput", "turn/steer"]);
  assert.deepEqual(dismissLog[0].params.result, { answers: { approach: { answers: [marker] } } });
  assert.equal(dismissLog[1].params.input[0].text, "free reply");
  assert.equal((await records()).length, beforeDismiss.responses + 1);
  await page.getByText("DISMISSED_QUESTION_STEER_REPLY", { exact: false }).waitFor();
  checks.push("R07 dismiss-on-send: Enter in the composer while fixture:input waits answers every question with the lO marker (logged before the turn/steer carrying 'free reply'); the .sq-card detaches");

  // uk: Other with an empty field answers and enables Submit; R sends 'Something else'.
  await composer().fill("fixture:input other");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await question.waitFor(); await question.scrollIntoViewIfNeeded();
  // The source's transparent Other button lies behind the textarea, so its center is no pointer target; activate it
  // from the keyboard as approval-transport's chooseOther does.
  await question.getByRole("button", { name: "Other", exact: true }).focus();
  await question.getByRole("button", { name: "Other", exact: true }).press("Space");
  assert.equal(await question.getByRole("button", { name: "Other", exact: true }).getAttribute("aria-pressed"), "true");
  assert.equal(await question.locator(".sq-submit").isDisabled(), false);
  await question.locator(".sq-submit").click();
  await question.waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).at(-1).result, { answers: { approach: { answers: ["Something else"] } } });
  checks.push("R07 empty Other: selecting Other without text enables Submit and sends ['Something else']");

  // One card at a time: two simultaneous requests show only the head; B mounts after A with a fresh 400 ms clock.
  await composer().fill("fixture:approval-pair");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await card().waitFor();
  await page.waitForTimeout(250); // the fixture sends B 30 ms after A
  await frames();
  assert.equal(await page.locator(".sac-card, .sq-card").count(), 1, "only the head request renders");
  const headInstance = await card().getAttribute("data-approval-instance");
  await page.evaluate(first => {
    const observer = new MutationObserver(() => {
      const button = [...document.querySelectorAll(".sac-card")].find(node => node.dataset.approvalInstance !== first)?.querySelector('[data-approval-action="accept"]');
      if (!button) return;
      observer.disconnect();
      window.pairEarlyClick = { at: performance.now(), cards: document.querySelectorAll(".sac-card, .sq-card").length };
      button.click();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, headInstance);
  const beforePair = (await records()).length;
  await card().locator('[data-approval-action="decline"]').click();
  await page.waitForFunction(() => !!window.pairEarlyClick);
  metrics.pair = await page.evaluate(() => window.pairEarlyClick);
  assert.equal(metrics.pair.cards, 1);
  await frames();
  assert.equal((await records()).length, beforePair + 1, "B's allow click inside its first 400 ms sends nothing");
  assert.notEqual(await card().getAttribute("data-approval-instance"), headInstance);
  await page.waitForTimeout(450);
  await card().locator('[data-approval-action="accept"]').click();
  await card().waitFor({ state: "detached" }); await settled();
  assert.deepEqual((await records()).slice(-2).map(record => record.result), [{ decision: "decline" }, { decision: "accept" }]);
  checks.push("R07 one card at a time: two pending command approvals render one card; answering A mounts B, whose allow is armed only after 400 ms");

  // mcpServer/elicitation/request (codex-schema-0.155.1; fixture:elicitation-*): an MCP tool-call
  // approval is a tool card, a server form is a small generated form, url mode offers the link,
  // and an unshowable request can still be declined, so the turn always continues.
  await send("fixture:elicitation-tool", "elicitation");
  assert.equal(await card().getAttribute("data-approval-method"), "mcpServer/elicitation/request");
  assert.equal(await card().getAttribute("aria-label"), "Permission request: Allow DeepSeek to use write_note (probe)?");
  // toolcards-01: the arguments sit in the read gate (generated ApprovalReadRows, Mj's q block), not the .sac-code pre.
  assert.equal(await card().locator('[data-testid="approval-read-rows"] [data-approval-value]').innerText(), "text: fixture note");
  assert.deepEqual(await card().locator("[data-approval-action]").evaluateAll(nodes => nodes.map(node => node.dataset.approvalAction)),
    ["decline", "acceptAlways", "acceptForSession", "accept"]);
  assert.equal(await card().locator('[data-approval-action="acceptAlways"]').innerText(), "Always allow");
  await finish("acceptForSession", { action: "accept", content: {}, _meta: { persist: "session" } });
  await send("fixture:elicitation-tool", "elicitation");
  // The fixture offers _meta.persist ['session','always'] (Codex's MCP tool approval 'Always allow').
  await finish("acceptAlways", { action: "accept", content: {}, _meta: { persist: "always" } });
  await send("fixture:elicitation-tool", "elicitation");
  await finish("decline", { action: "decline" });
  checks.push("MCP tool approval (mcpServer/elicitation/request, mcp_tool_call): 'Allow DeepSeek to use write_note (probe)?' with its parameters; Always allow sends accept + _meta.persist always, Allow for this session sends accept + _meta.persist session, Deny sends decline");

  await send("fixture:elicitation-form", "elicitation");
  await screenshot("approval-card-elicitation-form.png");
  const beforeForm = (await records()).length;
  await page.waitForTimeout(450);
  await card().locator('[data-approval-action="accept"]').click();
  await page.waitForFunction(() => document.querySelector(".sac-card .sac-error")?.textContent === "Title is required.");
  assert.equal(await card().locator('[data-elicitation-field="title"]').evaluate(node => node === document.activeElement), true);
  assert.equal((await records()).length, beforeForm, "an invalid form sends nothing");
  await card().locator('[data-elicitation-field="title"]').fill("probe run");
  await card().locator('[data-elicitation-field="count"]').fill("3");
  // Enum fields use the app's popover select (SourceSelect), not a native <select>.
  assert.equal(await card().locator('[data-elicitation-field="tier"]').getAttribute("role"), "combobox");
  await card().locator('[data-elicitation-field="tier"]').click();
  await page.locator('.sselect-popup [role="option"][data-value="pro"]').click();
  assert.equal(await card().locator('[data-elicitation-field="tier"]').getAttribute("data-value"), "pro");
  await card().locator('[data-elicitation-field="tags"] input').first().check();
  await finish("accept", { action: "accept", content: { title: "probe run", count: 3, notify: false, tier: "pro", tags: ["unit"] } });
  checks.push("MCP form elicitation: required/min checks stay local and focus the field; Submit sends the typed content");

  await send("fixture:elicitation-url", "elicitation");
  assert.equal(await card().locator(".sac-code").innerText(), "https://probe.example.invalid/authorize");
  assert.equal(await card().getByRole("button", { name: "Open link", exact: true }).count(), 1);
  await finish("accept", { action: "accept" });
  await send("fixture:elicitation-unsupported", "elicitation");
  assert.equal(await card().locator('[data-approval-action="accept"]').count(), 0);
  await finish("decline", { action: "decline" });
  checks.push("MCP url elicitation shows the link with Open link and Done; an openai/form request offers Decline only and still ends the turn");

  assert.deepEqual(errors, []);
  const report = { passed: true, at: new Date().toISOString(), scope: "isolated ordinary-card visual/local-key UI; no transport-race or production approval claim",
    build: buildInfo, screenshots, checks, metrics, profile, responseCount: (await records()).length, errors };
  await fs.writeFile(path.join(evidence, "approval-card-ui-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (page) await screenshot("approval-card-failure.png").catch(() => {});
  await fs.writeFile(path.join(evidence, "approval-card-ui-test.json"), JSON.stringify({ passed: false, at: new Date().toISOString(), build: buildInfo, screenshots, checks, metrics, profile, errors, error: error.stack }, null, 2));
  throw error;
} finally {
  await page?.evaluate(() => window.cardInitialObserver?.disconnect()).catch(() => {});
  await app?.evaluate(() => globalThis.approvalCardUiGate?.restore()).catch(() => {});
  await app?.close();
}
