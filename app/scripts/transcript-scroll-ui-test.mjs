import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

// All data and protocol events in this suite are confined to a fresh fixture
// profile. It never opens the installed application or a production Codex task.
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
const profile = await fs.mkdtemp(path.join(evidence, "transcript-ui-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
await fs.writeFile(
  path.join(workspace, "fixture.txt"),
  "Isolated scroll fixture\n",
);
const now = Math.floor(Date.now() / 1000);
const ids = ["scroll-fixture-A", "scroll-fixture-B"];
function thread(id, index) {
  const items = Array.from({ length: 54 }, (_, n) => ({
    id: `${id}-row-${n}`,
    type: "agentMessage",
    text:
      n === 53
        ? "Identical final text for both sessions."
        : `Reading row ${n}. This isolated fixture paragraph is deliberately long enough to wrap when the window is narrow.\n\nA second paragraph holds a stable item anchor across resizing.`,
  }));
  items.splice(15, 0, {
    id: `${id}-tool`,
    type: "commandExecution",
    command: "printf historical-tool",
    status: "completed",
    exitCode: 0,
    aggregatedOutput: "HISTORICAL_TOOL_OUTPUT\n".repeat(24),
  });
  return {
    id,
    cwd: workspace,
    name: `Scroll fixture ${index ? "B" : "A"}`,
    createdAt: now,
    updatedAt: now - index,
    archived: false,
    resumeDelayMs: index ? 0 : 350,
    turns: [{ id: `${id}-turn`, status: "completed", items }],
  };
}
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    threadIds: ids,
    model: "fixture",
    sidebarWidth: 288,
    displayName: "Fixture",
  }),
);
await fs.writeFile(
  path.join(profile, "fixture-threads.json"),
  JSON.stringify({
    next: 100,
    threads: Object.fromEntries(ids.map((id, i) => [id, thread(id, i)])),
  }),
);
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"),
};
delete env.ELECTRON_RUN_AS_NODE;
await fs.chmod(env.CODEX_BINARY, 0o755);
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
const near = (a, b, tolerance = 2, label = "Geometry") =>
  assert.ok(Math.abs(a - b) <= tolerance, `${label}: expected ${b}, got ${a}`);
async function settle() {
  await page.waitForTimeout(100);
}
async function size(width, height = 852) {
  await app.evaluate(
    ({ BrowserWindow }, { width, height }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(width, height),
    { width, height },
  );
  await settle();
}
async function open(id, wait = true) {
  await page
    .locator(`[data-source-session-id="${id}"] .source-session-open`)
    .click();
  if (wait) {
    await page
      .locator(`[data-transcript-item-id="${id}-row-0"]`)
      .waitFor({ state: "attached" });
    await page.locator(".loading-state").waitFor({ state: "detached" });
    await settle();
  }
}
async function state() {
  return page.locator(".transcript").evaluate((viewport) => {
    const frame = viewport.closest(".source-transcript-frame"),
      r = viewport.getBoundingClientRect();
    const rows = [...viewport.querySelectorAll("[data-transcript-item-id]")];
    const node = rows.find((node) => {
      const box = node.getBoundingClientRect();
      return box.height > 0 && box.bottom > r.top && box.top < r.bottom;
    });
    return {
      top: viewport.scrollTop,
      height: viewport.scrollHeight,
      viewport: viewport.clientHeight,
      remaining:
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop,
      following: frame.dataset.following,
      anchor: node?.dataset.transcriptItemId,
      offset: node ? node.getBoundingClientRect().top - r.top : null,
      jump: frame.querySelector('[data-testid="jump-to-latest"]')?.dataset
        .visible,
    };
  });
}
async function sameAnchor(before, label) {
  const after = await state();
  assert.equal(after.anchor, before.anchor, `${label}: item anchor`);
  near(after.offset, before.offset, 3, `${label}: anchor offset`);
  assert.equal(after.following, "false", `${label}: keep reading`);
  return after;
}
async function readRow(id, n = 20) {
  await page.locator(".transcript").evaluate((viewport, itemId) => {
    const row = [
      ...viewport.querySelectorAll("[data-transcript-item-id]"),
    ].find((node) => node.dataset.transcriptItemId === itemId);
    viewport.scrollTop +=
      row.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top +
      9;
  }, `${id}-row-${n}`);
  await settle();
  const result = await state();
  assert.equal(result.following, "false");
  return result;
}
async function waitForTail(label, requireRunning = false) {
  // Observe complete frames and return the successful sample itself. Reading
  // scrollHeight again in a later IPC call can land between a new token's
  // layout and the controller's next rAF, even though following is correct.
  const result = await page.evaluate(
    ({ requireRunning }) =>
      new Promise((resolve) => {
        const deadline = performance.now() + 2500;
        const samples = [];
        let consecutive = 0;
        function inspect() {
          const viewport = document.querySelector(".transcript");
          const frame = viewport?.closest(".source-transcript-frame");
          const sample = viewport && {
            at: performance.now(),
            top: viewport.scrollTop,
            height: viewport.scrollHeight,
            viewport: viewport.clientHeight,
            remaining:
              viewport.scrollHeight -
              viewport.clientHeight -
              viewport.scrollTop,
            following: frame?.dataset.following,
            running: !!document.querySelector(".source-working"),
            jump: frame?.querySelector('[data-testid="jump-to-latest"]')
              ?.dataset.visible,
          };
          samples.push(sample);
          if (samples.length > 12) samples.shift();
          const atTail =
            sample?.viewport > 0 &&
            sample.following === "true" &&
            sample.remaining <= 2 &&
            (!requireRunning || sample.running);
          consecutive = atTail ? consecutive + 1 : 0;
          if (consecutive >= 2) resolve({ passed: true, sample, samples });
          else if (performance.now() >= deadline)
            resolve({ passed: false, sample, samples });
          else requestAnimationFrame(inspect);
        }
        requestAnimationFrame(inspect);
      }),
    { requireRunning },
  );
  (metrics.tailChecks ??= []).push({ label, ...result });
  if (!result.passed) metrics.tailFailure = await state();
  assert.equal(
    result.passed,
    true,
    `${label}: expected following at current tail on two complete frames; final ${JSON.stringify(result.sample)}`,
  );
  return result.sample;
}
async function jump() {
  const button = page.getByTestId("jump-to-latest");
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="jump-to-latest"]')?.dataset
        .visible === "true",
  );
  await button.click();
  await waitForTail("Jump reaches the actual tail");
}
async function send(text) {
  await page
    .getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ })
    .fill(text);
  // B27 (c11959232 yd/Ed): switching between the same two sessions shows the split-view tip, a fixed 420px banner at
  // the bottom right (shared-frame wC) that sits over the Send button; dismiss it the way a user would.
  const splitTip = page.locator('[data-testid="epitaxy-split-suggestion"]');
  if (await splitTip.isVisible()) {
    await splitTip.getByRole("button", { name: "Dismiss", exact: true }).click();
    await splitTip.waitFor({ state: "detached" });
  }
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(".source-working").waitFor();
  await page.waitForTimeout(230);
}
async function wheelUp() {
  const box = await page.locator(".transcript").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -650);
  await settle();
  return state();
}
async function openFiles() {
  await page
    .getByRole("button", { name: "View options", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Files", exact: true })
    .click();
  await page.getByRole("complementary", { name: "Files panel" }).waitFor();
}
async function closeFiles() {
  await page
    .locator(".source-side-tile")
    .getByRole("button", { name: "Close panel", exact: true })
    .click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
  await settle();
}

try {
  page = await app.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await size(1468);
  await open(ids[0]);
  await page.evaluate(() => document.fonts.ready);
  metrics.initial = await state();
  assert.ok(
    metrics.initial.height > metrics.initial.viewport * 3,
    "Fixture must be meaningfully scrollable",
  );
  assert.ok(metrics.initial.remaining <= 2);
  assert.equal(metrics.initial.following, "true");
  checks.push(
    "First long session opening follows the tail after delayed resume",
  );

  const beforeSwitch = await readRow(ids[0]);
  await open(ids[1]);
  assert.ok(
    (await state()).remaining <= 2,
    "A new B follows even with equal count/final text",
  );
  const bReading = await readRow(ids[1], 28);
  await open(ids[0]);
  await sameAnchor(beforeSwitch, "A to B to A");
  await open(ids[1]);
  await sameAnchor(bReading, "B has its own saved anchor");
  await open(ids[0], false);
  await open(ids[1]);
  await open(ids[0]);
  await page.waitForTimeout(450);
  await sameAnchor(beforeSwitch, "Late A response after A to B to A");
  checks.push(
    "Per-session anchors and visit generations survive equal-tail sessions and delayed A to B to A navigation",
  );

  // Preserve stable anchors while tool expansion changes historical content.
  await page.locator(".transcript").evaluate((viewport, id) => {
    const node = viewport.querySelector(
      `[data-transcript-item-id="${id}-tool"]`,
    );
    viewport.scrollTop +=
      node.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      40;
  }, ids[0]);
  await settle();
  const toolReading = await state();
  await page
    .locator(`[data-transcript-item-id="${ids[0]}-tool"] .source-step-trigger`)
    .click();
  await settle();
  await sameAnchor(toolReading, "Historical tool expansion");
  checks.push(
    "Historical tool expansion releases following and preserves the visible row",
  );

  await jump();
  await send("fixture:scroll");
  await waitForTail("Live protocol deltas follow before user scrolls", true);
  const streamingReading = await wheelUp();
  assert.equal(streamingReading.following, "false");
  await page.locator(".source-working").waitFor({ state: "detached" });
  await settle();
  await sameAnchor(streamingReading, "Later live deltas");
  checks.push(
    "Real isolated agentMessage delta stream follows, then respects manual upward reading",
  );

  const button = page.getByTestId("jump-to-latest");
  // F06: the classic chip (c360a9e1c-GPs-MV9u.js:3944-3978 od, scroll-shared-current.js:121-161):
  // 24px tall, a 12px CaretDown, opacity over 150ms, 8px above the composer.
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-testid="jump-to-latest"]');
    return node && getComputedStyle(node).opacity === "1";
  });
  metrics.jump = await button.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    const composer = document.querySelector(".composer-zone").getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      height: box.height,
      icon: getComputedStyle(node.querySelector('[data-cds="Icon"]')).fontSize,
      iconCount: node.querySelectorAll('[data-cds="Icon"]').length,
      gap: composer.top - box.bottom,
      transition: `${style.transitionProperty} ${style.transitionDuration}`,
      radius: style.borderRadius,
      text: node.textContent.replace(/[\uE000-\uF8FF]/g, "").trim(),
      onTop: node.contains(hit),
      background: style.backgroundColor,
      shadow: style.boxShadow,
    };
  });
  assert.equal(metrics.jump.onTop, true, "Nothing (fade strip, composer) covers the chip");
  for (const theme of ["dark", "light"]) {
    await page.evaluate((theme) => { document.documentElement.dataset.mode = theme; }, theme);
    await page.waitForTimeout(250);
    const chipBox = await button.boundingBox();
    await page.screenshot({ path: path.join(evidence, `transcript-scroll-chip-${theme}.png`),
      clip: { x: chipBox.x - 60, y: chipBox.y - 30, width: chipBox.width + 120, height: chipBox.height + 60 } });
  }
  assert.equal(metrics.jump.height, 24);
  assert.equal(metrics.jump.icon, "12px");
  assert.equal(metrics.jump.iconCount, 1);
  assert.equal(metrics.jump.text, "");
  near(metrics.jump.gap, 8, 0.5, "Chip sits 8px above the composer");
  assert.equal(metrics.jump.transition, "opacity 0.15s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await button.evaluate((node) => getComputedStyle(node).transitionDuration),
    "0s",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // A wheel over the visible chip scrolls the transcript (od wrapper onWheel).
  const beforeWheel = await state();
  const chip = await button.boundingBox();
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.mouse.wheel(0, -240);
  // React's onWheel on the od wrapper is a passive listener, so the wheel dispatch is acknowledged before the
  // renderer's main thread runs forwardWheel (use-transcript-scroll.js); under parallel suite load that can land
  // after the fixed 100 ms settle (seen: 2621 -> 2621). Wait, bounded, for the scroll itself; the assertion is unchanged.
  await page.waitForFunction((top) => document.querySelector(".transcript").scrollTop < top - 100, beforeWheel.top, { timeout: 3000 }).catch(() => {});
  await settle();
  const afterWheel = await state();
  assert.ok(beforeWheel.top - afterWheel.top > 100, `Wheel over the chip scrolls the transcript: ${beforeWheel.top} -> ${afterWheel.top}`);
  assert.equal(afterWheel.following, "false");
  metrics.chipWheel = { before: beforeWheel.top, after: afterWheel.top };
  // The chip glides (scrollTo smooth) and pins at once: every sampled frame of
  // the glide reports following, none unpins, and the tail is reached.
  metrics.smoothJump = await page.evaluate(() => new Promise((resolve) => {
    const viewport = document.querySelector(".transcript");
    const frame = viewport.closest(".source-transcript-frame");
    const samples = [];
    frame.querySelector('[data-testid="jump-to-latest"]').click();
    const started = performance.now();
    const step = () => {
      const remaining = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
      samples.push({ at: Math.round(performance.now() - started), top: viewport.scrollTop, remaining, following: frame.dataset.following });
      if (remaining <= 2 && samples.length > 2) resolve(samples);
      else if (performance.now() - started > 2500) resolve(samples);
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }));
  assert.ok(metrics.smoothJump.every((sample) => sample.following === "true"), "Following is pinned through the whole smooth jump");
  assert.ok(metrics.smoothJump.at(-1).remaining <= 2, "Smooth jump reaches the tail");
  assert.ok(metrics.smoothJump.length > 2 && metrics.smoothJump[0].remaining > 2, "The jump glides rather than writing the tail at once");
  await waitForTail("Smooth jump stays at the tail");
  assert.equal(await button.getAttribute("tabindex"), "-1");
  assert.equal(await button.getAttribute("aria-hidden"), "true");
  checks.push(
    "Classic 24px chip with a 12px CaretDown 8px above the composer, 150ms opacity and reduced motion; a wheel over it scrolls the transcript; its smooth jump stays pinned through the glide; hidden accessibility state after",
  );

  const historicalTrigger = page.locator(
    `[data-transcript-item-id="${ids[0]}-tool"] .source-step-trigger`,
  );
  const expandedBeforeSpace =
    await historicalTrigger.getAttribute("aria-expanded");
  await historicalTrigger.evaluate((node) =>
    node.focus({ preventScroll: true }),
  );
  const beforeSpace = await state();
  assert.equal(beforeSpace.following, "true");
  await page.keyboard.down("Space");
  await settle();
  const afterSpaceDown = await state();
  // HANDOFF 0.2.123/0.2.124: the classic tool row is now the source div[role=button] (approval-current.js:17288-17300)
  // whose ce (:16875-16877) toggles on Enter/Space keydown, not a native <button> activating on keyup. r2 evidence:
  // keydown collapsed the expanded historical tool, scrollHeight 5011->4511 and scrollTop 4273->3773 while the
  // visible anchor row kept its exact offset. So "does not navigate" is the anchor staying put and the whole
  // scrollTop change being the collapsed height; activation is asserted at keydown, and keyup must not re-toggle.
  metrics.spaceKeydown = { before: beforeSpace, after: afterSpaceDown, expandedBefore: expandedBeforeSpace, expandedAfterDown: await historicalTrigger.getAttribute("aria-expanded"), role: await historicalTrigger.evaluate((node) => `${node.tagName}:${node.getAttribute("role")}`) };
  assert.equal(
    afterSpaceDown.following,
    "false",
    "Space on a historical tool releases following on keydown",
  );
  assert.equal(
    afterSpaceDown.anchor,
    beforeSpace.anchor,
    "Space release itself does not navigate the viewport (same anchor row)",
  );
  near(
    afterSpaceDown.offset,
    beforeSpace.offset,
    2,
    "Space release itself does not navigate the viewport (anchor offset)",
  );
  near(
    beforeSpace.top - afterSpaceDown.top,
    beforeSpace.height - afterSpaceDown.height,
    2,
    "Space release itself does not navigate the viewport (scrollTop moves only by the toggled height)",
  );
  assert.notEqual(
    await historicalTrigger.getAttribute("aria-expanded"),
    expandedBeforeSpace,
    "Source ce activates the tool row on Space keydown",
  );
  await page.keyboard.up("Space");
  await settle();
  assert.notEqual(
    await historicalTrigger.getAttribute("aria-expanded"),
    expandedBeforeSpace,
    "Space actually activates the tool button once (keyup does not toggle again)",
  );
  assert.equal((await state()).following, "false");

  await readRow(ids[0], 21);
  const blankSpaceTop = await page
    .locator(".transcript")
    .evaluate((viewport) => {
      viewport.tabIndex = -1;
      viewport.focus({ preventScroll: true });
      return viewport.scrollTop;
    });
  // Space on the blank viewport (not a button-like target) is type-to-focus: the session pane listener prevents the
  // native page scroll and focusAndInsert puts the space in the composer (cc43287c9 :45166-45175, main.jsx paneKey).
  await page.keyboard.press("Space");
  const spaceComposer = page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ });
  await page.waitForFunction(() => !!document.activeElement?.closest('[data-cds="ChatComposerEditor"]'));
  await page.waitForTimeout(300);
  assert.ok(
    Math.abs((await page.locator(".transcript").evaluate((viewport) => viewport.scrollTop)) - blankSpaceTop) <= 2,
    "blank viewport Space does not scroll the transcript (the pane listener prevents it)",
  );
  assert.equal((await spaceComposer.textContent()).replace(/ /g, " "), " ", "blank viewport Space types into the composer");
  await spaceComposer.fill("");
  await page.waitForTimeout(200);
  await page.locator(".transcript").evaluate((viewport) => {
    viewport.scrollTop = viewport.scrollHeight;
  });
  await waitForTail("Tail arrival before keep-pin keyboard exclusion");
  await historicalTrigger.evaluate((node) => {
    node.dataset.transcriptKeepsPin = "";
    node.focus({ preventScroll: true });
  });
  await page.keyboard.press("Space");
  await waitForTail(
    "Explicit keep-pin tool remains following after Space activation",
  );
  await historicalTrigger.evaluate((node) => {
    delete node.dataset.transcriptKeepsPin;
  });
  const composerInput = page.getByRole("textbox", {
    name: /^(?:Prompt|Message DeepSeek)$/,
  });
  await composerInput.focus();
  await page.keyboard.press("Space");
  assert.equal(
    (await state()).following,
    "true",
    "Typing Space in the composer does not release following",
  );
  await composerInput.fill("");
  checks.push(
    "Historical tool Space releases before activation; blank viewport Space types into the composer without scrolling (type-to-focus), and explicit keep-pin/editable targets keep their semantics",
  );

  await send("fixture:scroll-approval");
  const approvalReading = await wheelUp();
  const approval = page.locator("[data-approval-presentation=card]");
  await approval.waitFor({ state: "attached" });
  await page.waitForTimeout(300);
  await sameAnchor(approvalReading, "Actual pending approval arrival");
  assert.equal(
    await button.getAttribute("aria-label"),
    "Needs your input. Scroll to the request",
  );
  await jump();
  await page.waitForTimeout(450); // Source Allow activation guard.
  await approval
    .getByRole("button", { name: "Allow once", exact: true })
    .click();
  await page.locator(".source-working").waitFor({ state: "detached" });
  checks.push(
    "Approval arrival does not steal reading position; real pending-input label and jump reveal the request",
  );

  // Isolated geometry-race regression: growth and a scroll position change in
  // one JS task, before RO delivery. No transcript data or production state is
  // fabricated here. Chromium dispatches mousedown on the viewport for its own
  // scrollbar (dragActive); without that intent an upward clamp during a layout
  // change keeps following pinned (use-transcript-scroll.js isUserScrollMovement:
  // a placeholder shrink-and-regrow must not release it).
  const dragTarget = await page.locator(".transcript").evaluate((viewport) => {
    viewport.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    viewport.querySelector(".source-transcript-content").style.paddingBottom =
      "80px";
    viewport.scrollTop -= 140;
    viewport.dispatchEvent(new Event("scroll"));
    return viewport.scrollTop;
  });
  await settle();
  near(
    (await state()).top,
    dragTarget,
    2,
    "Same-frame growth and upward scrollbar position",
  );
  assert.equal((await state()).following, "false");
  await page.evaluate(() =>
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })),
  );
  await page.locator(".source-transcript-content").evaluate((node) => {
    node.style.paddingBottom = "";
  });
  await settle();
  await readRow(ids[0], 21);
  const downTarget = await page.locator(".transcript").evaluate((viewport) => {
    viewport.tabIndex = -1;
    viewport.focus({ preventScroll: true });
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }),
    );
    viewport.querySelector(".source-transcript-content").style.paddingBottom =
      "80px";
    viewport.scrollTop += 140;
    viewport.dispatchEvent(new Event("scroll"));
    return viewport.scrollTop;
  });
  await settle();
  near(
    (await state()).top,
    downTarget,
    2,
    "Same-frame growth and downward keyboard position",
  );
  assert.equal((await state()).following, "false");
  await page.locator(".source-transcript-content").evaluate((node) => {
    node.style.paddingBottom = "";
  });
  await settle();
  // Coalesced user scroll must consume the previous programmatic write target.
  await page.locator(".transcript").evaluate((viewport) => {
    viewport
      .closest(".source-transcript-frame")
      .querySelector('[data-testid="jump-to-latest"]')
      .click();
    const tail = viewport.scrollHeight - viewport.clientHeight;
    viewport.scrollTop = tail - 100;
    viewport.dispatchEvent(new Event("scroll"));
    viewport.scrollTop = tail;
    viewport.dispatchEvent(new Event("scroll"));
  });
  await settle();
  assert.equal(
    (await state()).following,
    "true",
    "Returning to an old write target is still a user tail arrival",
  );
  checks.push(
    "Same-task growth plus scrollbar/down-key movement preserves intent; coalesced old write targets cannot mask repinning",
  );

  // The exact 200px visibility region is independent of the 1/2px pin tests.
  for (const [distance, expected] of [
    [150, "false"],
    [260, "true"],
  ]) {
    await page.locator(".transcript").evaluate((viewport, distance) => {
      viewport.scrollTop =
        viewport.scrollHeight - viewport.clientHeight - distance;
    }, distance);
    await settle();
    assert.equal((await state()).jump, expected, `${distance}px tail distance`);
  }
  await page.locator(".transcript").evaluate((viewport) => {
    viewport.scrollTop = viewport.scrollHeight;
  });
  await settle();
  assert.equal(
    (await state()).following,
    "true",
    "Downward arrival at the tail repins",
  );
  await size(1468, 700);
  assert.ok(
    (await state()).remaining <= 2,
    "Pinned viewport resize follows tail",
  );
  await size(1468);
  const beforeResize = await readRow(ids[0], 23);
  await size(1180);
  await sameAnchor(beforeResize, "Reading viewport resize");
  await size(1468);
  checks.push(
    "200px jump region, downward tail repinning, and pinned/reading resize behaviors remain separate",
  );

  const beforeHidden = await readRow(ids[0], 24);
  await size(760);
  await openFiles();
  // 0.2.14 tile engine (2.2553.1 Sh overflowMin): the chat tile stays a
  // 320px anchored shell below 588px; the transcript re-wraps but never
  // collapses to zero size (the previous compact hide was a local adaptation).
  await page.waitForFunction(
    () =>
      document.querySelector('[data-tile-id="chat"] .tiles-shell')?.getBoundingClientRect().width === 320,
  );
  assert.ok(
    (await page.locator(".transcript").evaluate((node) => node.clientHeight)) > 0,
  );
  await closeFiles();
  await size(1468);
  await sameAnchor(beforeHidden, "Narrow Files overflow shell and reveal");
  checks.push(
    "Narrow Files (320px anchored chat shell) does not erase the saved reading anchor",
  );

  // Live A deltas arriving after navigation cannot manipulate B's controller.
  await send("fixture:scroll");
  await open(ids[1]);
  const backgroundReading = await readRow(ids[1], 25);
  await page.waitForTimeout(2300);
  await sameAnchor(backgroundReading, "Background A deltas while reading B");
  checks.push(
    "Late background-thread protocol events cannot scroll the visible session",
  );

  assert.deepEqual(errors, []);
  await page.screenshot({
    path: path.join(evidence, "transcript-reading-ui.png"),
  });
  await fs.writeFile(
    path.join(evidence, "transcript-scroll-ui-report.json"),
    JSON.stringify(
      {
        passed: true,
        at: new Date().toISOString(),
        buildInfo,
        profile,
        checks,
        metrics,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, checks, metrics }, null, 2));
} catch (error) {
  if (page)
    await page
      .screenshot({
        path: path.join(evidence, "transcript-scroll-failure.png"),
      })
      .catch(() => {});
  await fs.writeFile(
    path.join(evidence, "transcript-scroll-ui-report.json"),
    JSON.stringify(
      {
        passed: false,
        at: new Date().toISOString(),
        buildInfo,
        profile,
        checks,
        metrics,
        errors,
        error: String(error.stack || error),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await app.close();
}
