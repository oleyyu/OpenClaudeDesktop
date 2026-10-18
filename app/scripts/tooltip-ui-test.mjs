import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

// Real integrated components and the existing protocol fixture; no production
// profile, installed app, or real Codex prompts are touched by this suite.
const root = path.resolve(import.meta.dirname, "..");
const build = JSON.parse(
  await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"),
);
const buildInfo = {
  version: build.version,
  builtAt: build.builtAt,
  sourceSha256: build.sourceSha256,
};
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "tooltip-ui-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
await fs.writeFile(
  path.join(workspace, "fixture.txt"),
  "Isolated tooltip fixture\n",
);
const id = "tooltip-fixture-session";
const now = Math.floor(Date.now() / 1000);
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    threadIds: [id],
    model: "fixture",
    sidebarWidth: 288,
    displayName: "Fixture",
  }),
);
await fs.writeFile(
  path.join(profile, "fixture-threads.json"),
  JSON.stringify({
    next: 100,
    threads: {
      [id]: {
        id,
        name: "Tooltip integration fixture",
        cwd: workspace,
        createdAt: now,
        updatedAt: now,
        archived: false,
        turns: [
          {
            id: "tooltip-history",
            status: "completed",
            items: [
              {
                id: "tooltip-history-answer",
                type: "agentMessage",
                text: "Isolated fixture for titlebar and composer tooltip interactions.",
              },
            ],
          },
        ],
      },
    },
  }),
);
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"),
};
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
  executablePath:
    process.env.TEST_ELECTRON_BINARY ||
    path.join(
      root,
      "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
    ),
  args: [root],
  env,
});
const checks = [],
  metrics = {},
  errors = [];
let page;
const near = (actual, expected, label, tolerance = 1) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`,
  );
const tipSelector = '.source-tooltip-popup:not([data-state="ending"])';
async function noTooltip() {
  await page
    .locator(".source-tooltip-popup")
    .waitFor({ state: "detached", timeout: 3000 });
  await page
    .locator(cdsTipSelector)
    .waitFor({ state: "detached", timeout: 3000 });
}
// R4i-gui GU1 (R4g-composer CP1–CP7): the Code composer's triggers (Add: source-composer-add-menu.jsx ComposerAddTrigger;
// Mode / Effort / Usage: source-composer-row-chin.jsx; Send / Stop: generated composer-send-cell.mjs lM) sit under the
// view-tabs CdsTooltip (shared-frame Zp: side "top", sideOffset 4), not the host SourceTooltip: its positioner is
// [data-cds="Tooltip"] (data-side) and its popup [role="tooltip"]; a multiline content is lM's rows (sM: the label then a
// [data-cds="Shortcut"] of kbd caps).
const cdsTipSelector = '[data-cds="Tooltip"] [role="tooltip"]';
async function cdsTooltip(label) {
  await page.waitForFunction(
    ({ selector, label }) => [...document.querySelectorAll(selector)].some((node) => {
      const style = getComputedStyle(node), text = node.querySelector(":scope span span")?.textContent ?? node.textContent;
      return (text === label || node.textContent.startsWith(label)) && Number(style.opacity) === 1 &&
        node.getAnimations().every((animation) => animation.playState === "finished" || animation.playState === "idle");
    }),
    { selector: cdsTipSelector, label },
    { timeout: 3000 },
  );
  return page.locator(cdsTipSelector);
}
async function cdsTipMetrics() {
  return page.locator(cdsTipSelector).evaluate((node) => {
    const r = node.getBoundingClientRect(), p = node.closest('[data-cds="Tooltip"]'), pr = p.getBoundingClientRect();
    return { bottom: r.bottom, positionerBottom: pr.bottom, side: p.dataset.side };
  });
}
// lM's rows: [label, keys] per sM row (or the single content with its shortcut).
async function cdsTipRows() {
  return page.locator(cdsTipSelector).evaluate((node) => {
    const keys = (scope) => [...(scope?.querySelectorAll('[data-cds="Shortcut"] kbd') ?? [])].map((kbd) => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent).join("");
    const rows = [...node.querySelectorAll("span.inline-flex.flex-col > span")];
    return rows.length ? rows.map((row) => [row.childNodes[0]?.textContent ?? null, keys(row)]) : [[node.textContent.replace(node.querySelector('[data-cds="Shortcut"]')?.textContent ?? "", ""), keys(node)]];
  });
}
async function cdsHover(locator, label) {
  await neutral();
  await locator.hover();
  return cdsTooltip(label);
}
async function neutral({ cool = false } = {}) {
  await page.mouse.move(120, 700);
  await page
    .getByRole("textbox", { name: "Message DeepSeek", exact: true })
    .focus();
  await noTooltip();
  if (cool) await page.waitForTimeout(450);
}
async function tooltip(label) {
  await page.waitForFunction(
    ({ selector, label }) => {
      const node = document.querySelector(selector);
      if (!node) return false;
      const style = getComputedStyle(node);
      return (
        node?.querySelector(".source-tooltip-label")?.textContent === label &&
        node.dataset.state === "open" &&
        Number(style.opacity) === 1 &&
        (style.scale === "none" || Number(style.scale) === 1) &&
        node
          .getAnimations()
          .every(
            (animation) =>
              animation.playState === "finished" ||
              animation.playState === "idle",
          )
      );
    },
    { selector: tipSelector, label },
    { timeout: 3000 },
  );
  return page.locator(tipSelector);
}
async function geometry(locator) {
  return locator.evaluate((node) => {
    const b = node.getBoundingClientRect();
    return {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      right: b.right,
      bottom: b.bottom,
    };
  });
}
async function tipMetrics() {
  return page.locator(tipSelector).evaluate((node) => {
    const s = getComputedStyle(node),
      r = node.getBoundingClientRect(),
      p = node.parentElement,
      pr = p.getBoundingClientRect(),
      ps = getComputedStyle(p);
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      bottom: r.bottom,
      positionerTop: pr.top,
      positionerBottom: pr.bottom,
      positionerHeight: pr.height,
      positionerWidth: pr.width,
      popupOffsetTop: node.offsetTop,
      popupVisualOffsetY: r.top - pr.top,
      positionerFont: ps.fontSize,
      positionerLineHeight: ps.lineHeight,
      bodyFont: getComputedStyle(document.body).fontSize,
      bodyLineHeight: getComputedStyle(document.body).lineHeight,
      opacity: s.opacity,
      scale: s.scale,
      animations: node
        .getAnimations()
        .map((animation) => ({
          state: animation.playState,
          currentTime: animation.currentTime,
        })),
      side: p.dataset.side,
      hidden: p.dataset.anchorHidden,
      phase: node.dataset.state,
      font: s.fontSize,
      lineHeight: s.lineHeight,
      radius: s.borderRadius,
      paddingX: s.paddingLeft,
      paddingY: s.paddingTop,
      color: s.color,
      background: s.backgroundColor,
      transition: s.transitionDuration,
      origin: s.transformOrigin,
      layer: getComputedStyle(p).zIndex,
      portalMode: node.closest(".source-tooltip-scope").dataset.mode,
      density: node.closest(".source-tooltip-scope").dataset.density,
      hoverable: node.dataset.hoverable,
    };
  });
}
async function hover(locator, label) {
  await neutral();
  await locator.hover();
  return tooltip(label);
}
async function keyboardFocus(locator) {
  // Trusted Tab records keyboard modality before a deterministic DOM focus.
  // A synthetic focus alone can inherit the prior pointer modality in Chromium.
  await page.keyboard.press("Tab");
  await locator.focus();
}
async function escapeMenu(trigger) {
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    // Fidelity F03: the legacy .code-popover is gone; CDS popovers carry data-cds-overlay.
    () => !document.querySelector('[data-cds-overlay],[role="menu"]'),
  );
  await page.waitForTimeout(450);
  assert.equal(
    await page.locator(".source-tooltip-popup").count(),
    0,
    "Menu handback must not flash a tooltip",
  );
  if (trigger)
    assert.equal(
      await trigger.evaluate((node) => document.activeElement === node),
      true,
    );
}

try {
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.setContentSize(1468, 852);
    // Run this timing-sensitive Chromium test off the shared native desktop.
    // Native Computer Use acceptance is performed separately on the installed app.
    window.webContents.setBackgroundThrottling(false);
    window.hide();
  });
  const inputSession = await page.context().newCDPSession(page);
  await inputSession.send("Emulation.setFocusEmulationEnabled", {enabled:true});
  metrics.inputIsolation = "Hidden isolated Electron window with CDP focus emulation and Chromium pointer/keyboard input; native desktop interaction is covered separately";
  await page
    .locator(`[data-source-session-id="${id}"] .source-session-open`)
    .click();
  await page
    .locator('[data-transcript-item-id="tooltip-history-answer"]')
    .waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await page.evaluate(() => document.fonts.ready);
  metrics.nativeWindow = await app.evaluate(({BrowserWindow,screen}) => { const win=BrowserWindow.getAllWindows()[0]; return {bounds:win.getBounds(), focused:win.isFocused(), workArea:screen.getDisplayMatching(win.getBounds()).workArea}; });
  await page.evaluate(() => {
    window.tooltipInputTrace=[];
    for(const type of ['pointermove','pointerover','pointerout','blur','focus','scroll','visibilitychange']) window.addEventListener(type,event=>{
      const target=event.target;
      window.tooltipInputTrace.push({type,at:performance.now(),x:event.clientX,y:event.clientY,focus:document.hasFocus(),target:target?.getAttribute?.('aria-label')||target?.className||target?.tagName});
      if(window.tooltipInputTrace.length>60)window.tooltipInputTrace.shift();
    },true);
  });
  const changes = page.getByRole("button", {
    // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
    name: "Changes",
    exact: true,
  });
  const options = page.getByRole("button", {
    name: "View options",
    exact: true,
  });
  metrics.triggerGeometry = await page
    .locator(".st-trailing")
    .evaluate((row) => {
      const buttons = [...row.querySelectorAll("button")];
      return {
        count: buttons.length,
        direct: buttons.every((node) => node.parentElement === row),
        boxes: buttons.map((node) => {
          const r = node.getBoundingClientRect();
          return { x: r.x, width: r.width, height: r.height, right: r.right };
        }),
      };
    });
  // Preview and Terminal (the built-in panes) precede Changes and View options when the session has a folder.
  assert.ok([2, 3, 4].includes(metrics.triggerGeometry.count), `titlebar buttons: ${metrics.triggerGeometry.count}`);
  assert.equal(metrics.triggerGeometry.direct, true);
  for (const box of metrics.triggerGeometry.boxes) {
    near(box.width, 24, "Titlebar button width");
    near(box.height, 24, "Titlebar button height");
  }
  for (let index = 1; index < metrics.triggerGeometry.boxes.length; index += 1)
    near(
      metrics.triggerGeometry.boxes[index].x - metrics.triggerGeometry.boxes[index - 1].right,
      4,
      "Titlebar gap",
    );
  assert.equal(await changes.getAttribute("title"), null);
  assert.equal(await options.getAttribute("title"), null);
  checks.push(
    "Tooltip triggers preserve direct titlebar buttons, 24px size and 4px spacing; no duplicate native title",
  );

  await neutral({ cool: true });
  await changes.hover();
  await page.waitForTimeout(120);
  assert.equal(
    await page.locator(tipSelector).count(),
    0,
    "Initial hover must retain its 300ms delay",
  );
  await tooltip("Changes");
  metrics.light = await tipMetrics();
  // Fidelity F02 (shared-frame-C_2npUJq.js:4572-4580 Mu → Qa text): the 'cmd+shift+d' spec renders one <kbd>
  // per key in io order (⇧ ⌘ D) at 12px in the muted ink, each modifier with an sr-only spoken name.
  metrics.changesShortcut = await page.locator(`${tipSelector} .source-tooltip-shortcut`).evaluate((node) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--cds-text-muted)";
    node.append(probe);
    const muted = getComputedStyle(probe).color;
    probe.remove();
    const kbds = [...node.querySelectorAll("kbd")];
    return {
      variant: node.dataset.variant,
      glyphs: kbds.map((kbd) => (kbd.querySelector('[aria-hidden="true"]') ?? kbd).textContent),
      spoken: kbds.map((kbd) => kbd.querySelector(".scds-sr")?.textContent ?? null),
      fontSize: getComputedStyle(node).fontSize,
      ink: kbds.every((kbd) => getComputedStyle(kbd).color === muted),
      gap: getComputedStyle(node).columnGap,
    };
  });
  assert.deepEqual(metrics.changesShortcut.glyphs, ["⇧", "⌘", "D"]);
  assert.deepEqual(metrics.changesShortcut.spoken, ["Shift", "Command", null]);
  assert.equal(metrics.changesShortcut.variant, "text");
  assert.equal(metrics.changesShortcut.fontSize, "12px");
  assert.equal(metrics.changesShortcut.ink, true);
  // menus-01 (2.42304.0 shared-frame Es.text gap-[0.15em]): 12px × 0.15em.
  assert.equal(metrics.changesShortcut.gap, "1.8px");
  checks.push("Changes tooltip shortcut is the CDS Shortcut text variant: kbd ⇧, ⌘, D in that order (spoken Shift/Command), 12px muted ink, 0.15em gap");
  const changesBox = await geometry(changes);
  assert.equal(metrics.light.side, "bottom");
  metrics.light.actualPopupGap = metrics.light.y - changesBox.bottom;
  near(
    metrics.light.positionerTop,
    changesBox.bottom + 4,
    "Bottom positioner offset",
  );
  // Ordinary source popup is inline-flex inside a block positioner. Its
  // baseline offset is not the FloatingUI sideOffset and is recorded separately.
  near(
    metrics.light.popupVisualOffsetY,
    metrics.light.popupOffsetTop,
    "Settled popup baseline offset",
    0.51,
  );
  assert.equal(metrics.light.positionerFont, metrics.light.bodyFont);
  assert.equal(
    metrics.light.positionerLineHeight,
    metrics.light.bodyLineHeight,
  );
  assert.equal(metrics.light.hidden, undefined);
  assert.equal(metrics.light.font, "13px");
  assert.equal(metrics.light.lineHeight, "18px");
  assert.equal(metrics.light.radius, "6px");
  assert.equal(metrics.light.paddingX, "8px");
  assert.equal(metrics.light.paddingY, "3px");
  assert.ok(metrics.light.height >= 24 && metrics.light.width <= 240);
  assert.equal(metrics.light.background, "rgb(11, 11, 11)");
  assert.equal(metrics.light.color, "rgb(255, 255, 255)");
  assert.equal(metrics.light.hoverable, "true");
  checks.push(
    "First hover waits; bottom positioner escapes titlebar clipping at 4px offset; fully settled inline-flex popup baseline and actual gap recorded, with 13/18 typography and light palette",
  );

  // Detect logical opening independently of its 120ms visual entrance.
  const warmAt = await page.evaluate(() => performance.now());
  await options.hover();
  await page.waitForFunction(
    (selector) =>
      document.querySelector(selector)?.textContent === "View options",
    tipSelector,
    { timeout: 240 },
  );
  metrics.warmSwitchMs = await page.evaluate(
    (start) => performance.now() - start,
    warmAt,
  );
  assert.equal(
    await page.locator(".source-tooltip-popup").count(),
    1,
    "A new owner removes the previous popup, including its exit animation",
  );
  await tooltip("View options");
  let popupBox = await geometry(page.locator(tipSelector));
  await page.mouse.move(
    popupBox.x + popupBox.width / 2,
    popupBox.y + popupBox.height / 2,
    { steps: 8 },
  );
  await page.waitForTimeout(250);
  assert.equal(
    await page.locator(tipSelector).count(),
    1,
    "Hoverable popup survives travel across the 4px gap",
  );
  await page.mouse.move(120, 700);
  await page.waitForTimeout(80);
  assert.equal(
    await page.locator(tipSelector).count(),
    1,
    "Group close retains 200ms pointer grace",
  );
  await noTooltip();
  checks.push(
    "Group warm switch opens immediately and stays exclusive; hoverable gap/popup remains open, leaving observes 200ms close grace",
  );

  await neutral({ cool: true });
  await keyboardFocus(options);
  await page.waitForFunction(
    (selector) => !!document.querySelector(selector),
    tipSelector,
    { timeout: 240 },
  );
  await tooltip("View options");
  assert.equal(
    await options.evaluate((node) => node.matches(":focus-visible")),
    true,
  );
  // Nu registers its ancestor-scroll close handler only when F was populated
  // by trigger-hover. Focus-open hints remain attached to the focused control.
  await page
    .locator(".st-trailing")
    .evaluate((node) => node.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(100);
  assert.equal(await page.locator(tipSelector).count(), 1);
  await page.keyboard.press("Escape");
  await noTooltip();
  assert.equal(
    await options.evaluate((node) => document.activeElement === node),
    true,
  );
  assert.equal(
    await page.getByRole("menu", { name: "Session menu", exact: true }).count(),
    0,
  );
  // Enter still performs the original button action, then Escape returns focus.
  await options.press("Enter");
  await page.getByRole("menu", { name: "Session menu", exact: true }).waitFor();
  assert.equal(await options.getAttribute("aria-expanded"), "true");
  await noTooltip();
  await escapeMenu(options);
  assert.equal(await options.getAttribute("aria-expanded"), "false");
  checks.push(
    "Focus-visible opens immediately and survives ancestor scroll; Escape dismisses only the tooltip; Enter/menu action and Escape focus handback retain behavior without reopening a hint",
  );

  await changes.click();
  await page
    .getByRole("button", { name: "Close panel", exact: true })
    .waitFor();
  assert.equal(await changes.getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  assert.equal(await changes.getAttribute("aria-pressed"), "false");
  near(
    (await geometry(changes)).x,
    changesBox.x,
    "Titlebar action position after pane cycle",
  );
  // c360a9e1c-GPs-MV9u.js mm (7387-7420) / Fp (6760-6810): since 0.2.114 the
  // title and folder pill use Zt CDS tooltips ("Rename" / cwd), not native titles.
  assert.equal(await page.locator(".st-title").getAttribute("title"), null);
  // R4i-gui GU1: rail mode (source-titlebar.jsx:471/:475 gate .st-folder on !railMode) moves the folder to the rail's
  // Environment card, whose chip (repo-name-chip.mjs pLe) is a CdsButton under a CdsTooltip ("Working folder" + the
  // path), never a native title.
  assert.equal(await page.locator(".st-toolbar .st-folder").count(), 0);
  const railFolderTitles = await page.getByRole("complementary", { name: "Session details", exact: true })
    .locator("section[data-rail-section] button[aria-haspopup='menu']")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("title")));
  assert.ok(railFolderTitles.length > 0, "the rail Environment card shows the folder chip");
  assert.deepEqual(railFolderTitles.filter((title) => title !== null), []);
  // 0.2.120 correction (HANDOFF 0.2.120): the earlier expectation of native titles on Model/Effort was the
  // local ComposerButton title={label} fallback, not source. shared-14 :7160-7226: the Model pill has NO tooltip
  // unless a warning exists (none locally) → no title; c8e04f916 (prettier :236-262) wraps the effort trigger
  // in a CDS tooltip {content: effortLabel} → no native title, hover checked in the chin loop below.
  assert.equal(
    await page
      .getByRole("button", { name: "Model", exact: true })
      .getAttribute("title"),
    null,
  );
  assert.equal(
    await page
      .getByRole("button", { name: /^Effort: / })
      .getAttribute("title"),
    null,
  );
  checks.push(
    "Panel action and pressed state survive integration; Rename/folder use CDS tooltips (no title); Model has no tooltip or title and Effort uses a CDS tooltip (no title)",
  );

  const add = page.getByRole("button", { name: "Add", exact: true });
  const mode = page.getByRole("button", {
    name: "Permission mode",
    exact: true,
  });
  const usage = page.getByRole("button", { name: "Usage", exact: true });
  const effortTrigger = page.getByRole("button", { name: /^Effort: / });
  metrics.composer = {};
  for (const [trigger, label] of [
    [add, "Add"],
    [mode, "Mode"],
    // 0.2.120 c8e04f916 effort f{content: effortLabel 'Effort'}.
    [effortTrigger, "Effort"],
    // c360a9e1c-GPs-MV9u.js:4138-4165 hd: a resumed session without tokenUsage has
    // ie=false, so ge (tooltip) and Se (aria-label) are both 'Usage'.
    [usage, "Usage"],
  ]) {
    await cdsHover(trigger, label);
    const b = await geometry(trigger),
      t = await cdsTipMetrics();
    assert.equal(t.side, "top");
    near(t.positionerBottom, b.y - 4, `${label} positioner top offset`);
    metrics.composer[label] = {
      ...t,
      actualPopupGap: b.y - t.bottom,
      triggerTop: b.y,
    };
    assert.equal(await trigger.getAttribute("title"), null);
    // R4i-gui GU1: the presets card's + is ChatComposerActions' leading (source-composer.jsx Actions leading
    // CARD_ADD_TRIGGER); Mode / Effort / Usage are the row chin's (ChatComposerChin, source-composer.jsx:743).
    assert.equal(
      await trigger.evaluate((node) =>
        !!node.closest('[data-cds="ChatComposerActions"], [data-cds="ChatComposerChin"]'),
      ),
      true,
    );
  }
  await add.click();
  // Add menu = CDS Menu with Skills/Plugins submenus (c752b32f8 yr), role=menu "Add".
  await page.getByRole("menu", { name: "Add", exact: true }).waitFor();
  await noTooltip();
  await escapeMenu(add);
  await mode.click();
  await page.getByRole("menu", { name: "Mode", exact: true }).waitFor();
  await noTooltip();
  await escapeMenu(mode);
  checks.push(
    "Add/Mode/Effort/Usage keep native button parents and open top hints; real Add/Permission menus suppress hints and preserve Escape focus return",
  );

  // R4i-gui GU1 (composer-send-cell.mjs lM, presets card: sendOnDraftOnly, idleSendAction null): an empty draft shows no
  // Send at all (the slot keeps only the invisible size-control placeholder); Send appears with a draft.
  const send = page.locator('[data-testid="code-prompt-send"]:not([inert] *)');
  assert.equal(await send.count(), 0, "no Send in the presets card without a draft");
  await page
    .getByRole("textbox", { name: "Message DeepSeek", exact: true })
    .fill("fixture:scroll");
  await send.waitFor();
  // lM `ne`: the Send button sits in a div.flex under CdsTooltip; with fork on offer (y) the content is multiline rows.
  const sendSlot = send.locator("xpath=..");
  await cdsHover(sendSlot, "Send");
  // Fidelity F02: the 'enter' spec draws ⏎, read from the visible glyph. ca80fca8d vP: an open idle session whose core can
  // fork adds the ⌥⌘⏎ 'Send in a forked session' row.
  metrics.sessionSendTooltip = await cdsTipRows();
  assert.deepEqual(metrics.sessionSendTooltip.map(([label]) => label), ["Send", "Send in a forked session"]);
  assert.equal(metrics.sessionSendTooltip[0][1], "⏎");
  near((await geometry(send)).width, 24, "Send width");
  near((await geometry(send)).height, 24, "Send height");
  assert.equal(await send.getAttribute("title"), null);
  await send.click();
  const stop = page.locator('[data-testid="code-prompt-stop"]:not([inert] *)');
  await stop.waitFor();
  await cdsHover(stop.locator("xpath=.."), "Stop");
  assert.equal(await stop.getAttribute("title"), null);
  // Official lM `B = S ? void 0 : "escape"`: the Stop tooltip carries the escape shortcut (rendered "Esc") unless another
  // surface has claimed Escape; Escape in the editor really issues turn/interrupt, so the hint is a real shortcut.
  assert.equal(await page.locator(`${cdsTipSelector} [data-cds="Shortcut"]`).count(), 1);
  assert.equal((await cdsTipRows()).at(-1)[1], "Esc");
  await stop.click();
  await stop.waitFor({ state: "detached" });
  await noTooltip();
  checks.push(
    "Presets card: no Send without a draft; with one the 24px Send shows the CDS 'Send' ⏎ + fork rows; streaming Stop has no duplicate title, shows the official Esc shortcut and still stops the fixture",
  );

  // 0.2.113 product correction: the former disabled-reason phase targeted the fabricated always-disabled
  // dictation split. Source hides dictation when !dictationEnabled (c360a9e1c:4892-4907 bH empty:hidden,
  // nf :5067-5095 → null; cc43287c9:36836 hideDictation:!Bu), and this Codex client has no dictation, so no
  // chin control carries a disabled reason. The Pu disabled-reason wrapper (tabindex 0, hidden
  // data-cds-disabled-reason description, hover/keyboard) stays covered by git-band-ui-test on the real
  // disabled Commit reason.
  assert.equal(await page.locator('.sc-chin [data-cds="SplitDropdownButton"], [data-cds="ChatComposer"] [data-cds="SplitDropdownButton"]').count(), 0);
  assert.equal(await page.getByRole("button", { name: "Dictate", exact: true }).count(), 0);
  assert.equal(await page.locator(".sc-chin [data-cds-disabled-reason-wrapper], .sc-chin .source-tooltip-disabled-trigger").count(), 0);
  checks.push(
    "No dictation control (source hideDictation branch): no SplitDropdownButton, no Dictate button and no disabled-reason trigger in the chin",
  );

  await neutral({ cool: true });
  await changes.dispatchEvent("pointerover", { pointerType: "touch" });
  await page.waitForTimeout(350);
  assert.equal(
    await page.locator(tipSelector).count(),
    0,
    "Touch must not schedule hover hints",
  );
  await hover(changes, "Changes");
  await page
    .locator(".st-trailing")
    .evaluate((node) => node.dispatchEvent(new Event("scroll")));
  await noTooltip();
  checks.push(
    "Touch hover does not open a hint; ancestor scrolling immediately dismisses a hover tooltip",
  );

  await neutral({ cool: true });
  const previousMode = await page.evaluate(
    () => document.documentElement.dataset.mode,
  );
  await page.evaluate(() => {
    document.documentElement.dataset.mode = "dark";
  });
  await changes.hover();
  await tooltip("Changes");
  metrics.dark = await tipMetrics();
  assert.equal(metrics.dark.portalMode, "dark");
  assert.equal(metrics.dark.background, "rgb(32, 32, 31)");
  await page.screenshot({ path: path.join(evidence, "tooltip-ui-dark.png") });
  await neutral();
  await page.evaluate((value) => {
    document.documentElement.dataset.mode = value;
  }, previousMode);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await changes.hover();
  await tooltip("Changes");
  metrics.reduced = await tipMetrics();
  assert.equal(metrics.reduced.transition, "0s");
  await page.screenshot({ path: path.join(evidence, "tooltip-ui-light.png") });
  await neutral();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  checks.push(
    "Body portal copies actual theme context; dark surface token and reduced-motion transition are applied",
  );

  await neutral({ cool: true });
  await options.hover();
  await page.waitForTimeout(80);
  // Remove the trigger through actual app navigation while the pointer stays
  // over it, so pointerleave cannot conceal a missing unmount timer cleanup.
  await page.keyboard.press("Meta+n");
  await options.waitFor({ state: "detached" });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".source-tooltip-popup").count(), 0);
  assert.equal(await page.locator(".source-tooltip-scope").count(), 0);
  checks.push(
    "Pending tooltip unmount clears timers and leaves no orphan portal during real session navigation",
  );

  // R05 (c099c328d :8870-8895 Tm rows; cc43287c9 :28620 stayOnDraftHint = Home draft): on Home the Send tooltip is
  // two rows, 'Send' ⏎ and 'Send and stay here' ⌘⏎ (no ⌘⌥⏎ fork row: thread/fork is unsupported).
  // R4i-gui GU1: the Home draft's presets card also shows Send only with a draft (lM sendOnDraftOnly).
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill("home tooltip probe");
  const homeSend = page.locator('[data-testid="code-prompt-send"]:not([inert] *)');
  await homeSend.waitFor();
  await page.mouse.move(120, 700);
  await noTooltip();
  await homeSend.locator("xpath=..").hover();
  await cdsTooltip("Send");
  metrics.homeSendTooltip = await cdsTipRows();
  assert.deepEqual(metrics.homeSendTooltip, [["Send", "⏎"], ["Send and stay here", "⌘⏎"]]);
  await neutral({ cool: true });
  checks.push("R05 Home Send tooltip: two kbd rows, 'Send' ⏎ and 'Send and stay here' ⌘⏎");
  assert.deepEqual(errors, []);
  const report = {
    at: new Date().toISOString(),
    buildInfo,
    pass: true,
    passed: true, // run-suite.mjs asserts result.passed; mirrors `pass`
    profile,
    checks,
    metrics,
    errors,
  };
  await fs.writeFile(
    path.join(evidence, "tooltip-ui-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (page) {
    await page
      .screenshot({ path: path.join(evidence, "tooltip-ui-failure.png") })
      .catch(() => {});
    metrics.failure = await page
      .evaluate(() => ({
        focused: document.hasFocus(), visibility: document.visibilityState,
        inputTrace: window.tooltipInputTrace,
        active: document.activeElement?.outerHTML,
        popups: [...document.querySelectorAll(".source-tooltip-popup")].map(
          (node) => ({
            text: node.textContent,
            phase: node.dataset.state,
            html: node.parentElement.outerHTML,
          }),
        ),
      }))
      .catch(() => null);
  }
  await fs.writeFile(
    path.join(evidence, "tooltip-ui-report.json"),
    JSON.stringify(
      {
        at: new Date().toISOString(),
        buildInfo,
        pass: false,
        passed: false, // run-suite.mjs asserts result.passed; mirrors `pass`
        profile,
        checks,
        metrics,
        errors,
        failure: String(error.stack || error),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await app.close();
}
