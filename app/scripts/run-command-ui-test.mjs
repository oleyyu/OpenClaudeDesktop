import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// Run-a-command (official Bash tool row) acceptance.
//
// Verb and meta (approval-current.js:4118-4160 with Soe :6213-6255), the card
// body Uoe :6874-6941 inside WO :6838 for a standalone row and GO
// non-standalone :6847-6862 for classic group rows (m8 :54035-54063 passes
// inCard), the output group RO :6741-6760, the
// running footer KE :2894-2926 with the ten-second threshold and the
// c3894114c duration format, the Copy control c425fb3cf:oe, ANSI colouring
// c966e2bd9, the blocked/denied/failed/stopped outcome words c05970c42:61-92,
// and the body that stays mounted after the first expansion c425fb3cf:j.
//
// Runs only after a fresh build with no other GUI suite active; every row and
// every notification comes from the isolated protocol fixture, never from
// injected DOM. Window 1324x768 so it fits an 851pt macOS work area.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `run-command-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);

const RC = "run-command-thread";
const now = Math.floor(Date.now() / 1000);
// Long enough to overflow the 400px output box, so a scroll offset exists.
const DONE_OUTPUT = `${Array.from({ length: 120 }, (_, index) => `RC_DONE_LINE_${index}`).join("\n")}\n`;
const DONE_COMMAND = "git status --short";
const userItem = (id, text) => ({ id, type: "userMessage", content: [{ type: "text", text }] });
const commandItem = (id, command, extra) => ({
  id, type: "commandExecution", command, cwd: workspace, processId: null, source: "agent",
  commandActions: [], aggregatedOutput: "", exitCode: null, durationMs: null, ...extra,
});
const turns = [
  { id: "rc-t1", status: "completed", items: [
    userItem("rc-u1", "RC_USER_ONE"),
    commandItem("rc-done", DONE_COMMAND, { status: "completed", exitCode: 0, durationMs: 1234, aggregatedOutput: DONE_OUTPUT }),
    commandItem("rc-plain", "printf RC_PLAIN", { status: "completed", exitCode: 0, durationMs: 10, aggregatedOutput: "RC_PLAIN_OUTPUT\n" }),
    commandItem("rc-failed", "git push origin main", { status: "failed", exitCode: 128, durationMs: 40, aggregatedOutput: "RC_FAILED_OUTPUT\n" }),
    commandItem("rc-extra1", "uname -a", { status: "completed", exitCode: 0, aggregatedOutput: "fixture OS output\n" }),
    commandItem("rc-extra2", "df -h", { status: "completed", exitCode: 0, aggregatedOutput: "fixture disk output\n" }),
    commandItem("rc-extra3", "printf color", { status: "completed", exitCode: 0, aggregatedOutput: "\x1b[31mred\x1b[0m\n" }),
    commandItem("rc-silent", "true", { status: "completed", exitCode: 0 }),
    commandItem("rc-exit1", "grep missing notes.txt", { status: "completed", exitCode: 1, durationMs: 22, aggregatedOutput: "RC_EXIT1_OUTPUT\n" }),
  ] },
  // A single tool between prose boundaries is not grouped: the standalone WO card.
  { id: "rc-t2", status: "completed", items: [
    userItem("rc-u2", "RC_USER_TWO"),
    // R06: the DeepSeek bridge names the shell (Uoe approval-current.js:6874-6907 'Bash').
    commandItem("rc-solo", "printf RC_SOLO", { status: "completed", exitCode: 0, durationMs: 10, aggregatedOutput: "RC_SOLO_OUTPUT\n", shell: "bash" }),
  ] },
  // A non-tool TurnStatusStep (Compacted session, c80ec48f8 rt) keeps the 26px step geometry.
  { id: "rc-t3", status: "completed", items: [
    userItem("rc-u3", "RC_USER_THREE"),
    { id: "rc-compact", type: "contextCompaction" },
  ] },
  // R06: a Codex command reports no shell, so its standalone card keeps the 'Shell' title.
  { id: "rc-t4", status: "completed", items: [
    userItem("rc-u4", "RC_USER_FOUR"),
    commandItem("rc-codex", "printf RC_CODEX", { status: "completed", exitCode: 0, durationMs: 10, aggregatedOutput: "RC_CODEX_OUTPUT\n" }),
  ] },
];
await fs.writeFile(path.join(profile, "run-command-fixture.marker"), "isolated-run-command-test\n");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low",
  threadIds: [RC], sidebarWidth: 288, displayName: "Fixture",
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 700, threads: {
  [RC]: { id: RC, name: "Run command fixture", cwd: workspace, createdAt: now, updatedAt: now, archived: false, turns },
} }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, clipboardSaved = false, clipboardRestored = false, profileRemoved = false;
const testSources = ["scripts/run-command-ui-test.mjs", "tests/fixtures/codex-server.cjs",
  "src/command-summary.mjs", "src/ansi-model.mjs", "src/command-row-model.mjs"];
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
  for (const required of ["src/command-summary.mjs", "src/ansi-model.mjs", "src/command-row-model.mjs",
    "src/source-command.jsx", "src/source-command.css", "src/source-session.jsx", "src/source-session.css",
    "src/state.js", "src/main.jsx", "electron/main.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
async function poll(check, label, timeout = 12000) {
  const until = Date.now() + timeout;
  for (;;) {
    try { const value = await check(); if (value) return value; } catch {}
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise(resolve => setTimeout(resolve, 40));
  }
}
const row = id => page.locator(`.source-step[data-transcript-item-id="${id}"]`);
// .src-cmd-card-outer is the body root in both Uoe branches (WO card / GO).
const body = id => row(id).locator(".src-cmd-card-outer");
async function expand(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click();
  await body(id).waitFor();
}
async function collapse(id) {
  const trigger = row(id).locator(".source-step-trigger");
  if (await trigger.getAttribute("aria-expanded") === "true") await trigger.click();
}
async function send(text) {
  await page.getByRole("textbox", { name: "Message DeepSeek", exact: true }).fill(text);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
}
// Resolve a CDS token to the colour the renderer actually paints.
async function tokenColor(name) {
  return page.evaluate(name => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}
// Resolve a CDS length token to the pixels the renderer computes.
// Resolved inside a transcript body: density scopes remap CDS lengths there.
async function tokenLength(name, host) {
  return host.evaluate((node, name) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;width:var(${name})`;
    node.append(probe);
    const value = getComputedStyle(probe).width;
    probe.remove();
    return value;
  }, name);
}
const readClipboard = () => app.evaluate(({ clipboard }) => clipboard.readText());
// Resolve a CDS duration token to the computed transition-duration.
async function tokenDuration(name, host) {
  return host.evaluate((node, name) => {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;transition-duration:var(${name})`;
    node.append(probe);
    const value = getComputedStyle(probe).transitionDuration;
    probe.remove();
    return value;
  }, name);
}
// Standalone classic row: zv geometry (c425fb3cf:143-144 Y, approval-current.js:17298)
// and the Ue caret / He verb colours (:17099-17101, c425fb3cf:149-153).
const classicStyle = id => row(id).evaluate(node => {
  const trigger = node.querySelector(":scope > .source-step-trigger"), caret = trigger.querySelector(".source-step-caret");
  const s = getComputedStyle(trigger), c = getComputedStyle(caret);
  return { inGroupRow: !!node.closest(".stg-row"), classic: node.classList.contains("source-step-classic"), state: node.dataset.state,
    padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft], margin: [s.marginLeft, s.marginRight],
    minHeight: s.minHeight, maxWidth: s.maxWidth, gap: s.gap, radius: s.borderTopLeftRadius, cursor: s.cursor,
    height: trigger.getBoundingClientRect().height, caretColor: c.color, caretOpacity: c.opacity,
    caretTransitionProperty: c.transitionProperty, caretTransitionDuration: c.transitionDuration, caretTransitionEasing: c.transitionTimingFunction,
    labelColor: getComputedStyle(trigger.querySelector(".source-step-label")).color,
    focusVisible: trigger.matches(":focus-visible"), boxShadow: s.boxShadow, outlineStyle: s.outlineStyle };
});
async function assertClassicGeometry(id, tokens) {
  const style = await classicStyle(id);
  // approval-current.js:17298 / c425fb3cf:143: py-0, no min-height, no overhang,
  // max-w-full, gap-0.75, rounded-sm. The pre-0.2.123 26px/-4px geometry was the
  // non-tool TurnStatusStep's, not zv's.
  assert.equal(style.inGroupRow, false, `${id} is a standalone row`);
  assert.equal(style.classic, true);
  assert.deepEqual(style.padding, ["0px", "0px", "0px", "0px"], `${id} zv py-0 and no inline padding`);
  assert.deepEqual(style.margin, ["0px", "0px"], `${id} has no negative overhang`);
  assert.ok(["0px", "auto"].includes(style.minHeight), `${id} min-height ${style.minHeight}`);
  assert.equal(style.maxWidth, "100%");
  assert.equal(style.gap, "3px");
  // rounded-sm = c6a992d55 var(--radius-sm) (.25rem); guard against an unresolved token.
  assert.notEqual(tokens.radiusSm, "0px", "--radius-sm resolves");
  assert.equal(style.radius, tokens.radiusSm, "rounded-sm");
  assert.equal(style.height, tokens.leadingBody, `${id} is one transcript text-body line`);
  // R08: `${zv} cursor-pointer` is an arrow under :root[data-dframe] (desktop-layout.css:1026-1032).
  assert.equal(style.cursor, "default");
  assert.equal(style.caretOpacity, "1", "the caret is always visible");
  assert.equal(style.caretTransitionProperty, tokens.transitionProperty ?? "transform");
  assert.equal(style.caretTransitionDuration, tokens.durFast, "duration-fast");
  // ie `transition-transform`: shipped .transition-transform easing resolves
  // --default-transition-timing-function = cubic-bezier(.4,0,.2,1), not the `ease` default.
  assert.equal(style.caretTransitionEasing, tokens.easing ?? "cubic-bezier(0.4, 0, 0.2, 1)", "transition-transform easing");
  return style;
}
// Settled (Ve) caret: Jv muted -> secondary on hover and keyboard focus; ey when expanded.
async function assertSettledCaret(id, colors) {
  const trigger = row(id).locator(".source-step-trigger").first();
  // Toggle by keyboard: a pointer click could land on a nested control (ToolPath).
  if (await trigger.getAttribute("aria-expanded") === "true") { await trigger.focus(); await trigger.press("Enter"); }
  await trigger.evaluate(node => node.blur());
  await page.mouse.move(2, 2);
  const states = {};
  states.rest = await classicStyle(id);
  assert.equal(states.rest.caretColor, colors.muted, `${id} settled caret is muted`);
  assert.equal(states.rest.labelColor, colors.muted, `${id} settled verb is muted`);
  await trigger.hover();
  states.hover = await classicStyle(id);
  assert.equal(states.hover.caretColor, colors.secondary, `${id} caret group-hover secondary`);
  assert.equal(states.hover.labelColor, colors.secondary, `${id} verb group-hover secondary`);
  await page.mouse.move(2, 2);
  await trigger.focus();
  // The trusted Shift+Tab records keyboard modality; Tab itself cannot come back here, since a Tab inside the
  // transcript moves to the composer (cc43287c9 :45157-45164, main.jsx paneKey).
  await page.keyboard.press("Shift+Tab");
  await trigger.focus();
  states.focus = await classicStyle(id);
  assert.equal(states.focus.focusVisible, true, "keyboard focus is focus-visible");
  assert.equal(states.focus.caretColor, colors.secondary, `${id} caret group-focus-visible secondary`);
  assert.equal(states.focus.outlineStyle, "none");
  assert.equal(states.focus.boxShadow, colors.focusShadow, "focus-visible:shadow-focus");
  await page.keyboard.press("Enter");
  await trigger.evaluate(node => node.blur());
  states.expanded = await classicStyle(id);
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  assert.equal(states.expanded.caretColor, colors.secondary, `${id} expanded caret ey text-secondary`);
  await trigger.focus(); await trigger.press("Enter");
  assert.equal(await trigger.getAttribute("aria-expanded"), "false");
  await trigger.evaluate(node => node.blur());
  await page.mouse.move(2, 2);
  return states;
}
async function classicTokens(host) {
  // One transcript text-body line: inside the transcript c6a992d55
  // `.epitaxy-transcript-typography :where(.text-body)` remaps the zv verb's text-body
  // to --chat-body / --chat-leading (local source-transcript.css), so the bare
  // --cds-leading-body token (chrome 19px) is not the row's line. Measured as laid out.
  const leadingBody = await host.evaluate(node => {
    const probe = document.createElement("div"); probe.style.cssText = "position:absolute;height:calc(var(--chat-body) * var(--chat-leading))";
    node.append(probe); const value = probe.getBoundingClientRect().height; probe.remove(); return value;
  });
  return { radiusSm: await tokenLength("--radius-sm", host), leadingBody,
    durFast: await tokenDuration("--cds-dur-fast", host) };
}
async function classicColors(host) {
  const focusShadow = await host.evaluate(node => {
    const probe = document.createElement("div"); probe.style.cssText = "position:absolute;box-shadow:var(--cds-focus-shadow)";
    node.append(probe); const value = getComputedStyle(probe).boxShadow; probe.remove(); return value;
  });
  return { muted: await tokenColor("--cds-text-muted"), secondary: await tokenColor("--cds-text-secondary"),
    primary: await tokenColor("--cds-text-primary"), focusShadow };
}

try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  // The clipboard is the user's; save it before the Copy checks and restore it
  // in the finally block whatever happens.
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read !== "function" || typeof clipboard.write !== "function" || typeof ClipboardItem !== "function")
      throw new Error("All-format clipboard backup is required");
    const originals = await clipboard.read();
    globalThis.rcClipboardBackup = await Promise.all(originals.map(async item =>
      new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))));
    return "all-formats";
  });
  clipboardSaved = true;
  await page.locator(`[data-source-session-id="${RC}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  await page.mouse.move(100, 700);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();
  // Classic group Npe :53865–54010 starts collapsed; opening reveals rows.
  const batch = page.locator('[data-tool-group="rc-done"]');
  await batch.waitFor();
  assert.equal(await batch.locator('.stg-summary').textContent(), 'Ran 8 commands (1 failed)');
  assert.equal(await batch.locator('.stg-list').count(), 0);
  await page.screenshot({path:path.join(directory,'commands-collapsed.png')});
  await batch.locator('.stg-trigger').focus();
  await page.keyboard.press('Enter');
  await row("rc-exit1").waitFor();
  assert.equal(await batch.locator('.stg-row').count(),8);
  await page.screenshot({path:path.join(directory,'commands-expanded.png')});
  checks.push('Eight real command items form one collapsed group with exactly one protocol failure; Enter opens eight divided rows');
  await page.locator(".loading-state").waitFor({ state: "detached" });
  await page.evaluate(() => document.fonts.ready);

  const primary = await tokenColor("--cds-text-primary");
  const danger = await tokenColor("--cds-text-danger");
  const warning = await tokenColor("--cds-text-warning");
  const secondary = await tokenColor("--cds-text-secondary");
  metrics.tokens = { primary, danger, warning, secondary };

  // 1. Verb and meta come from the official summary, in the code colour.
  metrics.done = await row("rc-done").evaluate(node => ({
    state: node.dataset.state,
    label: node.querySelector(".source-step-label").textContent,
    meta: node.querySelector(".source-step-meta")?.textContent ?? null,
    metaColor: node.querySelector(".source-step-meta") && getComputedStyle(node.querySelector(".source-step-meta")).color,
    outcomes: node.querySelectorAll(".source-step-outcome").length,
  }));
  assert.equal(metrics.done.state, "done");
  assert.equal(metrics.done.label, "Ran");
  assert.equal(metrics.done.meta, "git status…", "the summary drops the leading dash word and marks the cut");
  assert.equal(metrics.done.metaColor, primary);
  assert.equal(metrics.done.outcomes, 0, "a settled command has no status word");

  // 2. A command outside the official allow-list has no code meta at all.
  metrics.plain = await row("rc-plain").evaluate(node => ({
    label: node.querySelector(".source-step-label").textContent,
    meta: node.querySelector(".source-step-meta")?.textContent ?? null,
  }));
  assert.equal(metrics.plain.label, "Ran a command");
  assert.equal(metrics.plain.meta, null, "the plain meta is folded into the label, not rendered as code");
  checks.push("Ran/Running plus the official command summary; an unsummarisable command falls back to the plain 'a command' label with no code meta");

  // 3. Codex status drives failure; a non-zero exit code alone never does.
  metrics.failed = await row("rc-failed").evaluate(node => ({
    state: node.dataset.state,
    word: node.querySelector(".source-step-label")?.textContent ?? null,
    color: getComputedStyle(node.querySelector(".source-step-label")).color,
    duplicateOutcome: node.querySelectorAll('.source-step-outcome').length,
  }));
  assert.deepEqual({ state: metrics.failed.state, word: metrics.failed.word }, { state: "failed", word: "Failed to run" });
  // User selected classic PN :17105–17255, whose failedVerb is red;
  // gated Step's extra Failed outcome must not be duplicated here.
  assert.equal(metrics.failed.color, danger);
  assert.equal(metrics.failed.duplicateOutcome,0);
  metrics.exit1 = await row("rc-exit1").evaluate(node => ({
    state: node.dataset.state,
    label: node.querySelector(".source-step-label").textContent,
    word: node.querySelector(".source-step-outcome")?.textContent ?? null,
  }));
  assert.deepEqual(metrics.exit1, { state: "done", label: "Ran", word: null }, "exitCode 1 with status completed stays a settled row");
  checks.push("Failure comes from CommandExecutionStatus only; exitCode 1 on a completed command is not rendered as a failure");

  // 4. The body: group rows are GO non-standalone (no card, no title); prompt
  // and output group geometry are shared with the standalone WO card.
  await expand("rc-done");
  metrics.card = await body("rc-done").evaluate(node => {
    const output = node.querySelector('[role="group"][aria-label="Tool output"]');
    const prompt = node.querySelector(".src-cmd-prompt");
    const line = node.querySelector(".src-cmd-line");
    const style = element => getComputedStyle(element);
    return {
      inCard: node.hasAttribute("data-in-card"),
      title: node.querySelector(".src-cmd-title")?.textContent ?? null,
      promptText: prompt.textContent,
      promptHidden: prompt.getAttribute("aria-hidden"),
      promptSelect: style(prompt).userSelect,
      commandText: line.querySelector(".src-cmd-text").textContent,
      outputMaxHeight: style(output).maxHeight,
      outputOverflowY: style(output).overflowY,
      outputWhiteSpace: style(output).whiteSpace,
      outputWordBreak: style(output).wordBreak,
      outputColor: style(output).color,
      outputTabIndex: output.tabIndex,
      contentGap: style(node.querySelector(".src-cmd-content")).gap,
      cards: node.querySelectorAll(".src-cmd-card").length,
      footers: node.querySelectorAll(".src-cmd-footer").length,
      hasExitCode: /Exit code/.test(node.textContent),
      hasDuration: /1\.2s/.test(node.textContent),
    };
  });
  // m8 :54035-54063 renders group members with inCard, and Uoe with inCard
  // uses GO (:6847-6862): no title span, no WO card. (Earlier versions of this
  // suite asserted the WO 'Shell' title here on a grouped row; that was the
  // standalone geometry, not the source group row.)
  assert.equal(metrics.card.inCard, true);
  assert.equal(metrics.card.title, null, "a grouped command has no title span");
  assert.equal(metrics.card.cards, 0, "a grouped command has no nested WO card");
  assert.equal(metrics.card.promptText, "$\u00a0", "the official prompt uses a non-breaking space");
  assert.equal(metrics.card.promptHidden, "true");
  assert.equal(metrics.card.promptSelect, "none");
  assert.equal(metrics.card.commandText, DONE_COMMAND);
  assert.equal(metrics.card.outputMaxHeight, "400px");
  assert.equal(metrics.card.outputOverflowY, "auto");
  assert.equal(metrics.card.outputWhiteSpace, "pre-wrap");
  assert.equal(metrics.card.outputWordBreak, "break-all");
  assert.equal(metrics.card.outputColor, secondary);
  assert.equal(metrics.card.outputTabIndex, 0);
  assert.equal(metrics.card.footers, 0, "a settled command has no running footer");
  assert.equal(metrics.card.hasExitCode, false, "the official row shows no exit code");
  assert.equal(metrics.card.hasDuration, false, "the official row shows no completed duration");
  await expand("rc-failed");
  metrics.failedOutputColor = await body("rc-failed").locator('[role="group"][aria-label="Tool output"]')
    .evaluate(node => getComputedStyle(node).color);
  assert.equal(metrics.failedOutputColor, danger, "a failed command colours its output as an error");
  await collapse("rc-failed");
  checks.push("Grouped command body: no nested card or title, aria-hidden unselectable $ prompt, role=group Tool output clamped to 400px with pre-wrap/break-all, no exit code and no completed duration");

  // 4b. GO non-standalone vs the standalone WO card (Uoe :6908-6940).
  const padXs = await tokenLength("--cds-pad-xs", body("rc-done")), padSm = await tokenLength("--cds-pad-sm", body("rc-done"));
  const padMd = await tokenLength("--cds-pad-md", body("rc-done")), padLg = await tokenLength("--cds-pad-lg", body("rc-done")), gapMd = await tokenLength("--cds-gap-md", body("rc-done"));
  metrics.tokenLengths = { padXs, padSm, padMd, padLg, gapMd };
  const geometry = node => {
    const style = element => getComputedStyle(element);
    const card = node.querySelector(".src-cmd-card"), head = node.querySelector(".src-cmd-head");
    const content = node.querySelector(".src-cmd-content"), line = node.querySelector(".src-cmd-line");
    return {
      wrapper: { paddingTop: style(node).paddingTop, paddingBottom: style(node).paddingBottom, display: style(node).display,
        position: style(node).position, boxShadow: style(node).boxShadow, outlineStyle: style(node).outlineStyle },
      card: card ? { boxShadow: style(card).boxShadow, borderRadius: style(card).borderRadius } : null,
      head: head ? { padding: style(head).padding, title: head.querySelector(".src-cmd-title")?.textContent ?? null } : null,
      content: { padding: style(content).padding, gap: style(content).gap, fontFamily: style(content).fontFamily,
        fontSize: style(content).fontSize, lineHeight: style(content).lineHeight, flexGrow: style(content).flexGrow },
      line: { background: style(line).backgroundColor, radius: style(line).borderRadius, padding: style(line).padding, boxShadow: style(line).boxShadow },
      text: node.textContent,
    };
  };
  metrics.inCard = await body("rc-done").evaluate(geometry);
  assert.equal(metrics.inCard.wrapper.paddingTop, padXs, "GO pt-xs");
  assert.equal(metrics.inCard.wrapper.paddingBottom, "0px");
  assert.equal(metrics.inCard.wrapper.display, "flex");
  assert.equal(metrics.inCard.wrapper.position, "relative");
  assert.equal(metrics.inCard.wrapper.boxShadow, "none", "no WO epitaxy-card-outline-inset on the group row");
  assert.equal(metrics.inCard.wrapper.outlineStyle, "none");
  assert.equal(metrics.inCard.card, null);
  assert.equal(metrics.inCard.head, null);
  assert.ok(!metrics.inCard.text.includes("Shell"), "no Shell text inside the group");
  assert.equal(metrics.inCard.content.padding, "0px");
  assert.equal(metrics.inCard.content.gap, gapMd);
  assert.equal(metrics.inCard.content.flexGrow, "1");
  assert.equal(metrics.inCard.line.radius, "8px", "UT rounded-lg");
  assert.notEqual(metrics.inCard.line.background, "rgba(0, 0, 0, 0)", "UT keeps its Tv background");
  // F07 design-system.css:56758-56768: under the default Claude Light code theme the UT block
  // (epitaxy-diff) carries the 0 0 0 1px var(--cds-border) ring.
  const borderColor = await body("rc-done").evaluate(node => { const probe = document.createElement("span"); probe.style.color = "var(--cds-border)"; node.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
  assert.equal(metrics.inCard.line.boxShadow, `${borderColor} 0px 0px 0px 1px`, "Claude Light rings the $ block");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.codeThemeLight), "claude-light");
  await page.screenshot({ path: path.join(directory, "commands-grouped-light.png") });
  await expand("rc-solo");
  metrics.standalone = await body("rc-solo").evaluate(geometry);
  assert.equal(metrics.standalone.head.title, "Bash", "R06: the standalone WO card of a bash command is titled Bash (Uoe :6904-6907)");
  assert.deepEqual(metrics.standalone.wrapper, { paddingTop: padMd, paddingBottom: padMd, display: "block", position: "static", boxShadow: "none", outlineStyle: "none" }, "WO group/body py-md");
  assert.match(metrics.standalone.card.boxShadow, / 0px 0px 0px 1px inset$/, "WO epitaxy-card-outline-inset");
  assert.equal(metrics.standalone.card.borderRadius, "8px");
  assert.equal(metrics.standalone.head.padding, `${padSm} ${padMd}`);
  assert.equal(metrics.standalone.content.padding, `0px ${padMd} ${padLg}`);
  assert.equal(metrics.standalone.content.gap, gapMd);
  assert.deepEqual(metrics.standalone.line, metrics.inCard.line, "the $ block is identical in both branches");
  await row("rc-solo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, "command-standalone-light.png") });
  await collapse("rc-solo");
  // zv geometry and Ue/He colour states on the standalone row (light).
  metrics.classicTokens = await classicTokens(row("rc-solo"));
  metrics.classicColors = await classicColors(row("rc-solo"));
  metrics.classicSolo = await assertClassicGeometry("rc-solo", metrics.classicTokens);
  metrics.classicSoloStates = await assertSettledCaret("rc-solo", metrics.classicColors);
  // The non-tool TurnStatusStep keeps its 26px step geometry (source-session.css).
  metrics.compactionStep = await row("rc-compact").evaluate(node => {
    const trigger = node.querySelector(".source-step-trigger"), s = getComputedStyle(trigger);
    return { classic: node.classList.contains("source-step-classic"), label: trigger.textContent, minHeight: s.minHeight,
      height: trigger.getBoundingClientRect().height, marginLeft: s.marginLeft, paddingLeft: s.paddingLeft };
  });
  assert.deepEqual(metrics.compactionStep, { classic: false, label: "Compacted session", minHeight: "26px", height: 26, marginLeft: "-4px", paddingLeft: "4px" });
  checks.push("Standalone classic row: zv padding 0, no margin, min-height 0, rounded-sm radius, one text-body line, always-visible caret with duration-fast transform; settled caret muted, secondary on hover, keyboard focus-visible (shadow-focus) and when expanded; Compacted session keeps 26px");
  await collapse("rc-solo");
  // R06: without item.shell (the Codex protocol has none) the standalone card keeps 'Shell' and the '$' prompt.
  await expand("rc-codex");
  metrics.codexTitle = await body("rc-codex").evaluate(node => ({ title: node.querySelector(".src-cmd-title")?.textContent, prompt: node.querySelector(".src-cmd-prompt")?.textContent }));
  assert.deepEqual(metrics.codexTitle, { title: "Shell", prompt: "$\u00a0" });
  await collapse("rc-codex");
  checks.push("Grouped command rows use GO non-standalone (pt-xs, no outline, no Shell title, unpadded gap-md code column, same UT $ block); a standalone command keeps the WO card and inset outline, titled Bash with item.shell 'bash' and Shell without it");

  // 5. Copy: hidden until the body is hovered, canonical payload, 1200ms reset.
  const copy = body("rc-done").locator(".src-cmd-copy");
  // Collapsing the preceding row can move this card under the stationary pointer.
  // Establish the non-hover state and await its existing opacity transition.
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.source-step[data-transcript-item-id="rc-done"] .src-cmd-copy')).opacity === "0");
  assert.equal(await copy.evaluate(node => getComputedStyle(node).opacity), "0", "Copy is hidden before hover");
  await body("rc-done").hover();
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.source-step[data-transcript-item-id="rc-done"] .src-cmd-copy')).opacity) === 1);
  assert.equal(await copy.getAttribute("aria-label"), "Copy");
  await copy.click();
  await poll(async () => await copy.getAttribute("aria-label") === "Copied", "Copy reports success");
  metrics.clipboard = await readClipboard();
  assert.equal(metrics.clipboard, `$ ${DONE_COMMAND}\n\n${DONE_OUTPUT}`, "the payload is the prompt line, a blank line and the output");
  await poll(async () => await copy.getAttribute("aria-label") === "Copy", "Copy resets after 1200ms");
  checks.push("Copy is hover-revealed, writes '$ <command>' + blank line + output, and returns from Copied after 1200ms");

  // 6. The body stays mounted when the row closes, so the output keeps its
  // scroll offset (c425fb3cf:j).
  const output = body("rc-done").locator('[role="group"][aria-label="Tool output"]');
  await output.evaluate(node => { node.scrollTop = 120; });
  const scrolled = await output.evaluate(node => node.scrollTop);
  assert.ok(scrolled > 0, "the fixture output really overflows the 400px box");
  await collapse("rc-done");
  metrics.collapsed = await row("rc-done").evaluate(node => {
    const detail = node.querySelector(".source-step-detail");
    return { mounted: !!detail, hidden: detail?.hasAttribute("hidden") ?? null,
      scrollTop: detail?.querySelector('[role="group"]')?.scrollTop ?? null };
  });
  assert.deepEqual({ mounted: metrics.collapsed.mounted, hidden: metrics.collapsed.hidden }, { mounted: true, hidden: true });
  await expand("rc-done");
  metrics.restoredScrollTop = await output.evaluate(node => node.scrollTop);
  assert.equal(metrics.restoredScrollTop, scrolled, "reopening the row keeps the output scroll offset");
  await collapse("rc-done");
  checks.push("The expanded body mounts once and is only hidden on close, so a scrolled tool output keeps its offset");

  // 7. A live command: running footer past the threshold, silent below it.
  await send("fixture:run-command");
  const liveGroup = page.locator('[data-tool-group^="run-cmd-slow-"]');
  await liveGroup.waitFor();
  await poll(async()=>await liveGroup.locator('.stg-summary').textContent()==='Running git status…','live group displays first running command');
  assert.equal(await liveGroup.locator('.stg-trigger').getAttribute('aria-expanded'),'false');
  await liveGroup.locator('.stg-trigger').focus();
  await page.keyboard.press(' ');
  await liveGroup.locator('.stg-row').first().waitFor();
  await page.screenshot({path:path.join(directory,'commands-running.png')});
  const slowId = await poll(async () => (await page.$$eval(".source-step[data-transcript-item-id]", nodes =>
    nodes.map(node => node.dataset.transcriptItemId))).find(id => id.startsWith("run-cmd-slow-")), "the live command row appears");
  const freshId = await poll(async () => (await page.$$eval(".source-step[data-transcript-item-id]", nodes =>
    nodes.map(node => node.dataset.transcriptItemId))).find(id => id.startsWith("run-cmd-fresh-")), "the second live row appears");
  assert.equal(await row(slowId).getAttribute("data-state"), "busy");
  assert.equal(await row(slowId).locator(".source-step-label").textContent(), "Running");
  await expand(slowId);
  await expand(freshId);
  const footer = body(slowId).locator(".src-cmd-footer");
  await footer.waitFor();
  metrics.footer = {
    text: (await footer.textContent()).trim(),
    codes: [...(await footer.textContent()).trim()].map(character => character.codePointAt(0)),
    word: await footer.locator(".src-cmd-footer-status > span").first().textContent(),
    elapsed: await footer.locator(".src-cmd-elapsed").textContent(),
    copyLabel: await footer.locator(".src-cmd-copy").getAttribute("aria-label"),
    copyOpacity: await footer.locator(".src-cmd-copy").evaluate(node => getComputedStyle(node).opacity),
    minHeight: await footer.evaluate(node => getComputedStyle(node).minHeight),
    gap: await footer.evaluate(node => getComputedStyle(node).gap),
  };
  // KE renders the word and the duration as two spans separated by the 5px
  // flex gap, so the concatenated text carries no space between them.
  assert.equal(metrics.footer.word, "Running");
  assert.match(metrics.footer.elapsed, /^\u00b7 \d+s$/, "the duration is the official middle dot plus the formatted seconds");
  const seconds = Number(/(\d+)s$/.exec(metrics.footer.elapsed)[1]);
  assert.ok(seconds >= 11, `the eleven-second-old command shows its duration (got ${seconds}s)`);
  assert.equal(metrics.footer.copyLabel, "Copy");
  assert.equal(metrics.footer.copyOpacity, "1", "the running footer Copy is always visible");
  assert.equal(metrics.footer.gap, "5px");
  metrics.freshFooter = {
    present: await body(freshId).locator(".src-cmd-footer").count(),
    elapsed: await body(freshId).locator(".src-cmd-elapsed").count(),
  };
  assert.deepEqual(metrics.freshFooter, { present: 1, elapsed: 0 }, "below ten seconds the footer shows no duration");
  // The clock really advances on whole seconds.
  await poll(async () => Number(/(\d+)s$/.exec(await footer.locator(".src-cmd-elapsed").textContent())[1]) > seconds,
    "the running duration advances");
  checks.push("The running footer shows Running plus the duration only from ten seconds on, advances every second, and carries an always-visible Copy");

  // 8. Streamed output: three real outputDelta notifications, ANSI coloured.
  const liveOutput = body(slowId).locator('[role="group"][aria-label="Tool output"]');
  await poll(async () => (await liveOutput.textContent()).includes("RUN_COMMAND_THREE"), "all three deltas arrive");
  metrics.stream = await liveOutput.evaluate(node => ({
    text: node.textContent,
    hasEscape: /\x1b/.test(node.textContent),
    red: [...node.querySelectorAll("span")].map(span => getComputedStyle(span).color),
  }));
  assert.equal(metrics.stream.text, "RUN_COMMAND_ONE\nRUN_COMMAND_RED\nRUN_COMMAND_THREE\n");
  assert.equal(metrics.stream.hasEscape, false, "escape sequences are consumed, never printed");
  assert.ok(metrics.stream.red.includes("rgb(200, 40, 41)"), "SGR 31 paints the shipped palette red");
  checks.push("Three real item/commandExecution/outputDelta notifications concatenate, and an SGR colour becomes a styled span with no escape characters left in the text");

  // 9. A turn interrupt stops the rows and states so in the output.
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await poll(async () => await row(slowId).getAttribute("data-state") === "stopped", "the interrupted row settles");
  await poll(async()=>await liveGroup.locator('.stg-summary').textContent()==='Ran 2 commands','terminal group returns to count summary');
  assert.equal(await liveGroup.locator('.stg-trigger').getAttribute('aria-expanded'),'true','status updates preserve expanded group');
  metrics.stopped = {
    word: await row(slowId).locator(".source-step-outcome").textContent(),
    color: await row(slowId).locator(".source-step-outcome").evaluate(node => getComputedStyle(node).color),
    output: await liveOutput.textContent(),
    outputColor: await liveOutput.evaluate(node => getComputedStyle(node).color),
  };
  assert.equal(metrics.stopped.word, "Stopped");
  assert.equal(metrics.stopped.color, secondary);
  assert.ok(metrics.stopped.output.endsWith("Tool execution was interrupted."), "the interrupt sentence closes the output");
  assert.ok(metrics.stopped.output.startsWith("RUN_COMMAND_ONE"), "the partial output Codex really produced is kept");
  assert.equal(metrics.stopped.outputColor, danger);
  checks.push("turn/interrupt settles a running command as Stopped and appends the official interrupt sentence below the partial output");

  // 10. An unresolved approval blocks the row and withholds the footer.
  await send("fixture:run-command-approval");
  const approvalId = await poll(async () => (await page.$$eval(".source-step[data-transcript-item-id]", nodes =>
    nodes.map(node => node.dataset.transcriptItemId))).find(id => id.startsWith("run-cmd-approval-")), "the approval row appears");
  await poll(async () => await row(approvalId).getAttribute("data-state") === "blocked", "the row becomes blocked");
  await expand(approvalId);
  metrics.blocked = {
    word: await row(approvalId).locator(".source-step-outcome").textContent(),
    color: await row(approvalId).locator(".source-step-outcome").evaluate(node => getComputedStyle(node).color),
    label: await row(approvalId).locator(".source-step-label").textContent(),
    footers: await body(approvalId).locator(".src-cmd-footer").count(),
  };
  assert.equal(metrics.blocked.word, "Needs approval");
  assert.equal(metrics.blocked.color, warning);
  assert.equal(metrics.blocked.label, "Running");
  assert.equal(metrics.blocked.footers, 0, "an unresolved approval withholds the running footer");
  // Ve false for an approval-blocked row (K): ry = secondary, primary on hover, for
  // both the caret (Ue) and the verb (He); approval-current.js:17099-17101.
  metrics.blockedClassic = await assertClassicGeometry(approvalId, metrics.classicTokens);
  await page.mouse.move(2, 2);
  metrics.blockedRest = await classicStyle(approvalId);
  assert.equal(metrics.blockedRest.state, "blocked");
  assert.equal(metrics.blockedRest.caretColor, metrics.classicColors.secondary, "blocked caret ry text-secondary");
  assert.equal(metrics.blockedRest.labelColor, metrics.classicColors.secondary, "blocked verb ry text-secondary");
  await row(approvalId).locator(".source-step-trigger").first().hover();
  metrics.blockedHover = await classicStyle(approvalId);
  assert.equal(metrics.blockedHover.caretColor, metrics.classicColors.primary, "blocked caret group-hover primary");
  assert.equal(metrics.blockedHover.labelColor, metrics.classicColors.primary, "blocked verb group-hover primary");
  await page.mouse.move(2, 2);
  const card = page.locator(".sac-card").first();
  await card.waitFor();
  await card.locator('[data-approval-action="decline"]').click();
  await poll(async () => await row(approvalId).getAttribute("data-state") === "denied", "the declined row settles");
  metrics.denied = {
    word: await row(approvalId).locator(".source-step-outcome").textContent(),
    color: await row(approvalId).locator(".source-step-outcome").evaluate(node => getComputedStyle(node).color),
  };
  assert.equal(metrics.denied.word, "Denied");
  assert.equal(metrics.denied.color, secondary);
  const answered = JSON.parse((await fs.readFile(path.join(profile, "fixture-responses.jsonl"), "utf8")).split("\n").filter(Boolean).at(-1));
  assert.equal(answered.result?.decision, "decline", "the decision really reached the server");
  checks.push("An unresolved item/commandExecution/requestApproval for the same itemId renders 'Needs approval' in the warning tone with no footer; declining settles the row as Denied");

  // Y5 classic :58245–58300,58595–58665: elapsed · tokens · live status.
  // Use the real isolated fixture transport, never inject DOM or override Date.
  await send("fixture:status-stats");
  const statsTail = page.locator('.source-transcript-status');
  await statsTail.locator('[data-runtime-stat="elapsed"]').waitFor();
  const statsTurn = JSON.parse(await fs.readFile(path.join(profile, 'fixture-threads.json'), 'utf8')).threads[RC].turns.at(-1);
  const emit = async notifications => {
    const file = path.join(profile, 'fixture-notify.json');
    await fs.writeFile(file+'.next', JSON.stringify({notifications})); await fs.rename(file+'.next', file);
    await poll(async()=>{try{await fs.access(file);return false;}catch{return true;}}, 'fixture consumed notifications');
  };
  const tokenUsage = (output, last=output) => ({ total:{inputTokens:400,cachedInputTokens:0,cacheWriteInputTokens:0,outputTokens:output,reasoningOutputTokens:0,totalTokens:400+output},last:{inputTokens:400,cachedInputTokens:0,cacheWriteInputTokens:0,outputTokens:last,reasoningOutputTokens:0,totalTokens:400+last},modelContextWindow:128000 });
  const statsCommand = {id:'stats-command',type:'commandExecution',command:'printf runtime-stats',cwd:workspace,status:'inProgress',commandActions:[],aggregatedOutput:'',exitCode:null,durationMs:null};
  await emit([
    {method:'thread/tokenUsage/updated',params:{threadId:RC,turnId:statsTurn.id,tokenUsage:tokenUsage(287)}},
    {method:'item/started',params:{threadId:RC,turnId:statsTurn.id,item:statsCommand,startedAtMs:Date.now()}}
  ]);
  await poll(async()=>await statsTail.locator('[data-runtime-stat="tokens"]').textContent()==='287 tokens','real output token usage');
  // Ghe :58134–58160 / WM :16293–16325: waiting text stabilizes for
  // 150ms and retains the displayed label for 650ms. Usage can arrive first.
  await poll(async()=>await statsTail.locator('.sts-activity').textContent()==='Running tools…','source waiting-label transition');
  assert.equal(await statsTail.locator('.sts-activity').textContent(),'Running tools…');
  metrics.runtimeStats = await statsTail.evaluate((node, startedAt) => {
    const elapsed=node.querySelector('[data-runtime-stat="elapsed"]'), tokens=node.querySelector('[data-runtime-stat="tokens"]'), activity=node.querySelector('.sts-activity');
    // H5 px-xs: resolve the token to pixels before exact comparison; custom
    // properties retain their literal calc(.25rem * 1) expression in CSSOM.
    const probe=document.createElement('span');probe.style.cssText='position:absolute;width:var(--cds-pad-xs)';node.append(probe);
    const expectedPadding=getComputedStyle(probe).width;probe.remove();
    return {elapsed:elapsed.textContent,expectedSeconds:Math.floor(Date.now()/1000-startedAt),tokens:tokens.textContent,activity:activity.textContent,rowHeight:node.querySelector('.sts-row').getBoundingClientRect().height,gap:getComputedStyle(node.querySelector('.sts-row')).gap,tokenAnimation:getComputedStyle(tokens).animationName,activityAnimation:getComputedStyle(activity).animationName,separatorPadding:getComputedStyle(node.querySelector('.sts-separator')).paddingLeft,expectedPadding};
  },statsTurn.startedAt);
  assert.ok(Math.abs(parseInt(metrics.runtimeStats.elapsed)-metrics.runtimeStats.expectedSeconds)<=1,'real clock advances at the source one-second boundary');
  assert.equal(metrics.runtimeStats.rowHeight,20);assert.equal(metrics.runtimeStats.gap,'16px');
  assert.equal(metrics.runtimeStats.tokenAnimation,'none');assert.notEqual(metrics.runtimeStats.activityAnimation,'none');
  assert.equal(metrics.runtimeStats.separatorPadding,metrics.runtimeStats.expectedPadding);
  await page.screenshot({path:path.join(directory,'runtime-stats.png')});
  await emit([
    {method:'thread/tokenUsage/updated',params:{threadId:RC,turnId:'obsolete-turn',tokenUsage:tokenUsage(999)}},
    {method:'thread/tokenUsage/updated',params:{threadId:RC,turnId:statsTurn.id,tokenUsage:tokenUsage(287)}}
  ]);
  assert.equal(await statsTail.locator('[data-runtime-stat="tokens"]').textContent(),'287 tokens','late and duplicate snapshots cannot add tokens');
  await emit([
    {method:'item/completed',params:{threadId:RC,turnId:statsTurn.id,item:{...statsCommand,status:'completed',exitCode:0}}},
    {method:'item/started',params:{threadId:RC,turnId:statsTurn.id,item:{id:'stats-reasoning',type:'reasoning',summary:['Runtime stats fixture reasoning'],content:[]}}}
  ]);
  await poll(async()=>/Thinking|thinking/.test(await statsTail.locator('.sts-activity').textContent()),'reported reasoning phase');
  // Y5/X5 (scroll-messages-current.js:58637-58668, 58760-58778): the active
  // thinking label is a button that switches the transcript to Thinking and back.
  const thinkingToggle=statsTail.locator('button.sts-thinking-toggle');
  // The zhe ladder follows the turn's elapsed time ("Thinking more…" and so on).
  assert.match(await thinkingToggle.getAttribute('aria-label'),/^(Thinking|Still thinking|Thinking more|Thinking some more|Almost done thinking)…, show in transcript$/);
  await thinkingToggle.click();
  await page.getByText('Switched transcript view to Thinking.',{exact:true}).waitFor();
  await page.locator('[data-transcript-item-id="stats-reasoning"].source-reasoning').waitFor();
  assert.match(await thinkingToggle.getAttribute('aria-label'),/, hide from transcript$/);
  await thinkingToggle.click();
  await page.getByText('Switched transcript view to Normal.',{exact:true}).waitFor();
  await page.locator('[data-transcript-item-id="stats-reasoning"]').waitFor({state:'detached'});
  // Clear both toasts so they cannot cover later rows (an unfocused window pauses their timers).
  for(let i=0;i<4&&await page.locator('.source-toast-card[data-front="true"]').count();i++)await page.locator('.source-toast-card[data-front="true"] .source-toast-dismiss').click();
  await page.locator('.source-toast-scope').waitFor({state:'detached'});
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').click();
  await poll(async()=>await statsTail.getAttribute('data-transcript-status')==='idle','completed turn clears runtime stats');
  assert.equal(await statsTail.locator('[data-runtime-stat]').count(),0);
  checks.push('Classic runtime status: real Turn.startedAt, 287 output tokens without duplicate/late-turn inflation, plain stats and shimmer activity, 20px/16px geometry, source separators, tools to reasoning to stopped cleanup; the thinking label toggles the Thinking view with the source toasts');

  // 11. Reduced motion removes the Copy reveal transition.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expand("rc-done");
  metrics.reducedMotion = await body("rc-done").locator(".src-cmd-copy").evaluate(node => getComputedStyle(node).transitionDuration);
  assert.equal(metrics.reducedMotion, "0s");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  checks.push("Reduced motion removes the Copy reveal transition");

  await page.mouse.move(100, 700);
  await page.screenshot({ path: path.join(directory, "verified.png") });
  // Dark appearance: the same grouped and standalone bodies.
  // The account menu has no appearance row (shared-21 $B); flip html[data-mode] as the theme effect does.
  await page.evaluate(() => { document.documentElement.dataset.mode = "dark"; });
  await page.waitForFunction(() => document.documentElement.dataset.mode === "dark");
  await expand("rc-solo");
  metrics.dark = { inCard: await body("rc-done").evaluate(node => ({ shadow: getComputedStyle(node).boxShadow, title: node.querySelectorAll(".src-cmd-title").length })),
    standaloneTitle: await body("rc-solo").locator(".src-cmd-title").textContent() };
  assert.deepEqual(metrics.dark, { inCard: { shadow: "none", title: 0 }, standaloneTitle: "Bash" });
  metrics.darkLineRing = await body("rc-done").evaluate(node => getComputedStyle(node.querySelector(".src-cmd-line")).boxShadow);
  assert.match(metrics.darkLineRing, / 0px 0px 0px 1px$/, "Claude Dark rings the $ block too");
  await row("rc-done").scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.screenshot({ path: path.join(directory, "commands-grouped-dark.png") });
  await collapse("rc-solo");
  metrics.darkClassicColors = await classicColors(row("rc-solo"));
  // text-muted is the same grey in both appearances; secondary really changes.
  assert.notEqual(metrics.darkClassicColors.secondary, metrics.classicColors.secondary, "dark tokens really apply");
  metrics.darkClassicSolo = await assertClassicGeometry("rc-solo", metrics.classicTokens);
  metrics.darkClassicSoloStates = await assertSettledCaret("rc-solo", metrics.darkClassicColors);
  await expand("rc-solo");
  await page.mouse.move(2, 2);
  await row("rc-solo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, "command-standalone-dark.png") });
  checks.push("Dark appearance keeps the grouped command without card/title and the standalone Bash card, and the standalone zv row keeps its geometry and muted/secondary caret states; screenshots recorded");
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.rcClipboardBackup;
        if (!saved) throw new Error("Clipboard backup unavailable");
        if (saved.length) await clipboard.write(saved); else await clipboard.clear();
        delete globalThis.rcClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { metrics.clipboardRestoreError = String(error); failure ||= error; }
  }
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "run-command-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profile, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, clipboardSaved, clipboardRestored, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "run-command-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined }, null, 2));
}
if (failure) throw failure;
