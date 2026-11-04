import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

// Run only after the parent has integrated SourcePermissionMenu and built the
// app. All protocol requests below use a new isolated profile and fixture.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "permission-ui-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const preferencesPath = path.join(profile, "preferences.json");
const requestPath = path.join(profile, "permission-requests.jsonl");
await fs.writeFile(preferencesPath, JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", permission: "auto",
  displayName: "Fixture", sidebarWidth: 288, threadIds: [],
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 0, threads: {} }));
const fixture = path.join(root, "tests/fixtures/codex-server.cjs");
const binary = path.join(profile, "codex-permission-proxy.cjs");
await fs.writeFile(binary, `#!/usr/bin/env node
const {spawn}=require('node:child_process'),readline=require('node:readline'),fs=require('node:fs');
const child=spawn(process.execPath,[${JSON.stringify(fixture)}],{stdio:['pipe','pipe','inherit']});
readline.createInterface({input:process.stdin}).on('line',line=>{
  const message=JSON.parse(line);
  if(['thread/start','thread/resume','turn/start'].includes(message.method))fs.appendFileSync(${JSON.stringify(requestPath)},line+'\\n');
  // R07: the plan card's responses (codeDesktop.afterPlan) are logged too.
  if(!message.method&&message.result?.codeDesktop)fs.appendFileSync(${JSON.stringify(requestPath)},line+'\\n');
  child.stdin.write(line+'\\n');
});
child.stdout.pipe(process.stdout);
process.stdin.on('end',()=>child.stdin.end());
child.on('exit',code=>process.exit(code||0));
`);
await fs.chmod(binary, 0o755);
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
delete env.ELECTRON_RUN_AS_NODE;
const executablePath = process.env.TEST_ELECTRON_BINARY ||
  path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const errors = [], checks = [], metrics = {};
let app, page;
const preferences = async () => JSON.parse(await fs.readFile(preferencesPath, "utf8"));
const requests = async () => {
  try { return (await fs.readFile(requestPath, "utf8")).split("\n").filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
};
const waitUntil = async (condition, message) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  assert.fail(message);
};
const trigger = () => page.getByRole("button", { name: "Permission mode", exact: true });
const menu = () => page.getByRole("menu", { name: "Mode", exact: true });
const input = () => page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ });
async function launch() {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}
async function openMenu() {
  await trigger().click();
  await menu().waitFor();
  // Initial menu focus is scheduled by rAF; issuing navigation before this
  // boundary would test an artificial race rather than a user's key press.
  await page.waitForFunction(() => !!document.activeElement?.closest(".sp-permission-menu"));
  return menu();
}
async function picked(value, label) {
  await menu().waitFor({ state: "detached" });
  await page.waitForFunction((label) => document.querySelector(".sc-permission")?.textContent === label, label);
  await waitUntil(async () => (await preferences()).permission === value, `Persisted permission ${value}`);
  await page.waitForFunction(() => document.activeElement === document.querySelector(".sc-input"));
}
async function select(value, label) {
  const popup = await openMenu();
  await popup.locator(`[data-permission-value="${value}"]`).click();
  await picked(value, label);
}
async function measureMenu() {
  return menu().evaluate((node) => {
    const item = node.querySelector(".sp-permission-item");
    const style = (selector) => getComputedStyle(node.querySelector(selector));
    return {
      rect: node.getBoundingClientRect().toJSON(), viewport: { width: innerWidth, height: innerHeight },
      radius: getComputedStyle(node).borderRadius, shadow: getComputedStyle(node).boxShadow,
      background: getComputedStyle(node).backgroundColor,
      headingHeight: node.querySelector(".sp-permission-heading").getBoundingClientRect().height,
      headingFont: style(".sp-permission-heading").fontSize,
      rowHeight: item.getBoundingClientRect().height,
      // Row parts come from the shared SourceMenu primitive (shared-frame Wg/Gg);
      // the measured values are unchanged.
      labelFont: style(".smenu-label").fontSize,
      labelLineHeight: style(".smenu-label").lineHeight,
      descriptionFont: style(".smenu-description").fontSize,
      descriptionLineHeight: style(".smenu-description").lineHeight,
      descriptionWhiteSpace: style(".smenu-description").whiteSpace,
      checkWidth: node.querySelector(".smenu-check").getBoundingClientRect().width,
      checkFont: style('.smenu-check [data-cds="Icon"]').fontFamily,
      trailingMargin: style(".smenu-trailing").marginLeft,
      trailingGap: style(".smenu-trailing").gap,
    };
  });
}
function assertBounds(value) {
  assert.ok(value.rect.width >= 128 && value.rect.width <= 320, "Intrinsic menu width is 128–320px");
  assert.ok(value.rect.x >= 8 && value.rect.right <= value.viewport.width - 8 + 0.1);
  assert.ok(value.rect.y >= 48 && value.rect.bottom <= value.viewport.height - 8 + 0.1);
}
try {
  await launch();
  const popup = await openMenu();
  assert.equal(await trigger().getAttribute("aria-haspopup"), "menu");
  assert.equal(await trigger().getAttribute("aria-expanded"), "true");
  // F07 shared-14-BOJVa-jT.js:10259-10273 nE/rE (local: default, acceptEdits, plan; auto first) with
  // aE copy (:10283-10440): Manual 'Always ask before making changes', Accept edits 'Automatically
  // accept all file edits'. The Bypass mode stays out of the radios without the Settings opt-in.
  assert.equal(await popup.getByRole("menuitemradio").count(), 4);
  for (const [index, [value, label, description]] of [["auto", "Auto", "DeepSeek handles permission decisions"], ["ask", "Manual", "Always ask before making changes"],
    ["acceptEdits", "Accept edits", "Automatically accept all file edits"], ["plan", "Plan", "Create a plan before making changes"]].entries()) {
    const row = popup.getByRole("menuitemradio", { name: label, exact: true });
    assert.equal(await row.getAttribute("data-permission-value"), value);
    assert.equal(await row.getAttribute("aria-checked"), String(value === "auto"));
    assert.equal(await row.getAttribute("aria-keyshortcuts"), String(index + 1));
    assert.equal(await row.locator("kbd").innerText(), String(index + 1));
    assert.equal(await row.locator(".smenu-description").textContent(), description);
  }
  assert.equal(await popup.getByRole("separator").count(), 0);
  assert.equal(await popup.locator('[data-cds="Icon"]').count(), 1, "Only the selected Check glyph is rendered");
  assert.equal(await popup.locator(".smenu-check").count(), 4, "All mode rows reserve their check slot");
  // No mode row is Bypass before the opt-in; only the trailing 'Bypass permissions · Enable' row names it.
  assert.doesNotMatch(await popup.innerText(), /Claude/);
  assert.equal(await popup.locator('[data-permission-value="bypass"]').count(), 0);
  assert.deepEqual(await popup.locator('[data-permission-action="enable-bypass"]').evaluate(node => [node.getAttribute("role"), node.querySelector(".smenu-label").textContent, node.querySelector(".sp-permission-enable-text").textContent, !!node.querySelector(".smenu-check")]),
    ["menuitem", "Bypass permissions", "Enable", false]);
  // B30 ca80fca8d fz "inline" (:19299-19322): the configured default mode's neutral xxs Badge 'Default' sits in the
  // label after the name (flex min-w-0 gap-sm), not at the trailing edge; the row is still named by the mode alone.
  metrics.defaultBadge = await popup.locator('[data-cds="Badge"]').evaluate(node => {
    const css = getComputedStyle(node), item = node.closest('[role="menuitemradio"]');
    const probe = document.createElement("span"); probe.style.color = "var(--cds-text-secondary)"; node.append(probe);
    const secondary = getComputedStyle(probe).color; probe.remove();
    return { text: node.textContent, value: item.dataset.permissionValue, name: item.getAttribute("aria-labelledby") && document.getElementById(item.getAttribute("aria-labelledby")).textContent,
      height: node.getBoundingClientRect().height, fontSize: css.fontSize, weight: css.fontWeight, color: css.color, secondary, background: css.backgroundColor,
      radius: css.borderTopLeftRadius, padding: css.paddingLeft, pointer: css.pointerEvents, step: node.dataset.step,
      inTrailing: !!node.closest(".smenu-trailing"), beforeCheck: !!(node.compareDocumentPosition(item.querySelector(".smenu-check")) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  assert.equal(await popup.locator('[data-cds="Badge"]').count(), 1);
  assert.deepEqual({ text: metrics.defaultBadge.text, value: metrics.defaultBadge.value, name: metrics.defaultBadge.name }, { text: "Default", value: "auto", name: "Auto" });
  assert.equal(metrics.defaultBadge.height, 16); assert.equal(metrics.defaultBadge.fontSize, "10px");
  assert.equal(metrics.defaultBadge.color, metrics.defaultBadge.secondary); assert.notEqual(metrics.defaultBadge.background, "rgba(0, 0, 0, 0)");
  assert.equal(metrics.defaultBadge.radius, "4px"); assert.equal(metrics.defaultBadge.padding, "4px");
  assert.equal(metrics.defaultBadge.pointer, "none"); assert.equal(metrics.defaultBadge.step, "1");
  assert.equal(metrics.defaultBadge.inTrailing, false); assert.equal(metrics.defaultBadge.beforeCheck, true);
  metrics.light = await measureMenu();
  assertBounds(metrics.light);
  assert.equal(metrics.light.headingHeight, 23);
  assert.equal(metrics.light.headingFont, "12px");
  assert.ok(Math.abs(metrics.light.rowHeight - 40.5) < 0.1);
  assert.equal(metrics.light.labelFont, "13px");
  assert.equal(metrics.light.labelLineHeight, "19px");
  assert.equal(metrics.light.descriptionFont, "12px");
  assert.equal(metrics.light.descriptionLineHeight, "15px");
  assert.equal(metrics.light.descriptionWhiteSpace, "nowrap");
  assert.equal(metrics.light.checkWidth, 16);
  assert.match(metrics.light.checkFont, /Anthropicons/);
  assert.equal(metrics.light.trailingMargin, "12px");
  assert.equal(metrics.light.trailingGap, "6px");
  assert.equal(metrics.light.radius, "10px");
  assert.notEqual(metrics.light.shadow, "none");
  await page.screenshot({ path: path.join(evidence, "permission-source-light.png") });
  checks.push("Current chin DOM menu: Mode header, Auto/Manual/Accept edits/Plan in the nE order with the aE copy, radio/check/number semantics, an inline xxs neutral Default badge on the saved mode, compact source dimensions");

  // Before the Bypass opt-in the last row is 'Bypass permissions · Enable' (approval-shared-current.js :8781-8799):
  // reachable by keyboard, but it has no digit and selects no mode.
  assert.equal(await popup.locator('[data-permission-action="enable-bypass"]').getAttribute("aria-keyshortcuts"), null);
  await page.keyboard.press("End");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionAction === "enable-bypass");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionValue === "plan");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionValue === "auto");
  await page.keyboard.press("ArrowUp");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionAction === "enable-bypass");
  await page.keyboard.press("Home");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionValue === "auto");
  await page.keyboard.press("3");
  await picked("acceptEdits", "Accept edits");
  assert.equal(await trigger().innerText(), "Accept edits", "the chin shows the full label");
  await openMenu();
  // The menu choice is the saved default here (one preference), so the badge follows it; with Auto no longer current,
  // Auto carries 'Recommended' (dz, An = Ie && St !== "auto").
  assert.equal(await menu().locator('[data-permission-badge="default"]').evaluate(node => node.closest('[role="menuitemradio"]').dataset.permissionValue), "acceptEdits");
  assert.deepEqual(await menu().locator('[data-permission-badge="recommended"]').evaluate(node => [node.textContent, node.closest('[role="menuitemradio"]').dataset.permissionValue]), ["Recommended", "auto"]);
  await page.keyboard.press("4");
  await picked("plan", "Plan");
  assert.equal((await requests()).length, 0, "Changing preference does not pretend to mutate a live server mode");
  checks.push("Home/End/arrows wrap correctly; Digit3 selects Accept edits (trigger 'Accept edits', Default badge follows the saved mode), Digit4 Plan; persists and restores editor focus without changing wire policy early");

  await openMenu();
  assert.equal(await menu().locator('[aria-checked="true"]').getAttribute("data-permission-value"), "plan");
  await page.keyboard.press("Control+1");
  await menu().waitFor();
  assert.equal((await preferences()).permission, "plan");
  await page.keyboard.press("m");
  await page.waitForFunction(() => document.activeElement?.dataset.permissionValue === "ask");
  await page.keyboard.press("Enter");
  await picked("ask", "Manual");
  checks.push("Selection survives reopen; modified digits do not select; typeahead + Enter commits Manual");

  await openMenu();
  await page.keyboard.press("Escape");
  await menu().waitFor({ state: "detached" });
  assert.equal(await trigger().evaluate((node) => document.activeElement === node), true);
  assert.equal(await trigger().getAttribute("aria-expanded"), "false");
  await openMenu();
  // The Mode popup can overlap the editor's center (0.2.113: Mode now sits
  // right after Add, the dictation slot being hidden as in the source).
  // Dismiss through an actually exposed part of the editor.
  const editorBounds = await input().boundingBox(), menuBounds = await menu().boundingBox();
  const outsidePoint = { x: editorBounds.width - 8, y: editorBounds.height / 2 };
  assert.ok(editorBounds.x + outsidePoint.x > menuBounds.x + menuBounds.width);
  await input().click({ position: outsidePoint });
  await menu().waitFor({ state: "detached" });
  assert.equal(await input().evaluate((node) => document.activeElement === node), true);
  await openMenu();
  await page.keyboard.press("Tab");
  await menu().waitFor({ state: "detached" });
  assert.equal((await preferences()).permission, "ask");
  checks.push("Escape returns to trigger; outside click and Tab dismiss without changing permission");

  for (const [value, label, policy, sandbox] of [
    ["auto", "Auto", "on-request", "workspaceWrite"],
    ["ask", "Manual", "untrusted", "workspaceWrite"],
    // A core without permission hints (permission-policy.mjs): Accept edits is on-request + workspaceWrite (Codex
    // applies workspace patches without asking), Plan is read-only with approvalPolicy never (nothing escalates).
    ["acceptEdits", "Accept edits", "on-request", "workspaceWrite"],
    ["plan", "Plan", "never", "readOnly"],
  ]) {
    await select(value, label);
    const text = `fixture:complete permission-${value}`;
    await input().fill(text);
    await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
    await waitUntil(async () => {
      const db = JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8"));
      return Object.values(db.threads).some((thread) => thread.turns.some((turn) =>
        turn.status === "completed" && turn.items.some((item) => item.content?.[0]?.text === text)));
    }, `Fixture ${value} turn completed`);
    await page.waitForFunction(() => !document.querySelector('[data-testid="code-prompt-send"][aria-busy="true"]') && !document.querySelector('[data-testid="code-prompt-stop"]:not([inert] *)'));
    const request = (await requests()).find((request) => request.method === "turn/start" && request.params.input[0].text === text);
    assert.ok(request);
    assert.equal(request.params.approvalPolicy, policy);
    assert.equal(request.params.approvalsReviewer, "user");
    assert.equal(request.params.sandboxPolicy.type, sandbox);
    assert.equal(request.params.sandboxPolicy.networkAccess, false);
    if (sandbox === "workspaceWrite") assert.deepEqual(request.params.sandboxPolicy.writableRoots, [workspace]);
    assert.equal(Object.hasOwn(request.params, "codeDesktop"), false, "the Codex fixture gets no mode hint");
    // The fixture reports no engine, so it is the Codex core, whose descriptor implies collaboration modes
    // (cores/codex.mjs): main completes the Mode's native collaborationMode with the turn's model and effort.
    assert.equal(request.params.collaborationMode?.mode, value === "plan" ? "plan" : "default", "the Codex core gets its native collaboration mode");
    assert.ok(typeof request.params.collaborationMode.settings.model === "string" && request.params.collaborationMode.settings.model, "completed with a model");
    assert.equal(request.params.collaborationMode.settings.developer_instructions, null);
  }
  const initialStart = (await requests()).find((request) => request.method === "thread/start");
  assert.equal(initialStart.params.approvalPolicy, "on-request");
  assert.equal(initialStart.params.sandbox, "workspace-write");
  assert.equal(initialStart.params.approvalsReviewer, "user");
  checks.push("Real fixture thread/start and four turn/start requests map a core without permission hints: Auto and Accept edits on-request, Manual untrusted, Plan never + readOnly, workspaceWrite/readOnly, network=false, user reviewer, and the Codex core's native collaborationMode (plan for Plan, default otherwise)");

  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(800, 600));
  await openMenu();
  metrics.narrow = await measureMenu();
  assertBounds(metrics.narrow);
  await page.screenshot({ path: path.join(evidence, "permission-source-narrow.png") });
  await page.keyboard.press("Escape");
  checks.push("Permission popup stays inside 800x600 viewport with 48px top and 8px remaining collision insets");

  await page.evaluate(() => window.desktop.call("settings", { theme: "dark" }));
  const db = JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8"));
  const threadId = Object.keys(db.threads)[0];
  const requestCountBeforeRestart = (await requests()).length;
  await app.close(); app = null;
  await launch();
  assert.equal((await preferences()).permission, "plan");
  assert.equal(await trigger().innerText(), "Plan");
  await page.locator(`[data-source-session-id="${threadId}"] .source-session-open`).click();
  await waitUntil(async () => (await requests()).slice(requestCountBeforeRestart)
    .some((request) => request.method === "thread/resume" && request.params.threadId === threadId), "Plan resume after restart");
  const resume = (await requests()).slice(requestCountBeforeRestart).find((request) => request.method === "thread/resume");
  // Plan on a core without permission hints is never + read-only on the thread too (permission-policy.mjs).
  assert.equal(resume.params.approvalPolicy, "never");
  assert.equal(resume.params.sandbox, "read-only");
  assert.equal(resume.params.approvalsReviewer, "user");
  await openMenu();
  assert.equal(await menu().locator('[aria-checked="true"]').getAttribute("data-permission-value"), "plan");
  metrics.dark = await measureMenu();
  assertBounds(metrics.dark);
  assert.notEqual(metrics.dark.background, metrics.light.background);
  assert.notEqual(metrics.dark.shadow, "none");
  await page.screenshot({ path: path.join(evidence, "permission-source-dark.png") });
  await page.keyboard.press("Escape");
  checks.push("Fresh Electron restart preserves Plan preference; restored session resumes read-only with user reviewer; dark menu tokens remain present");

  // R07 plan card (Rse ee → onModeChange, approval-current.js:9520-9578) under the DeepSeek core
  // (fixture-core.json engine): an approved plan leaves Plan for the target its button names.
  // Accept continues in Manual; the primary ('Accept and allow edits') in the mode used before Plan.
  await app.close(); app = null;
  await fs.writeFile(path.join(profile, "fixture-core.json"), JSON.stringify({ engine: "deepseek-harness" }));
  await launch();
  const planCard = () => page.locator('[data-approval-card-root][data-approval-kind="plan"]');
  const settled = () => page.waitForFunction(() => !document.querySelector('[data-testid="code-prompt-stop"]:not([inert] *)'));
  async function planTurn(text) {
    await select("acceptEdits", "Accept edits");
    await select("plan", "Plan");
    await input().fill(text);
    await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
    await planCard().waitFor();
    await planCard().scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    return (await requests()).filter((request) => request.method === "turn/start" && request.params.input[0].text === text).at(-1);
  }
  const acceptTurn = await planTurn("fixture:plan-review accept");
  // C1/C5: DeepSeek turn/start always carries customization (null = none set, clears any earlier value).
  assert.deepEqual(acceptTurn.params.codeDesktop, { permissionMode: "plan", afterPlan: "acceptEdits", customization: { systemPrompt: null, instructions: null, modelParams: null }, dynamicWorkflows: false });
  metrics.planLabels = await planCard().locator(".sac-button-label").allTextContents();
  assert.deepEqual(metrics.planLabels, ["Reject", "Revise\u2026", "Accept", "Accept and allow edits"]);
  await planCard().getByRole("button", { name: "Accept", exact: true }).click();
  await planCard().waitFor({ state: "detached" });
  await page.waitForFunction(() => document.querySelector(".sc-permission")?.textContent === "Manual");
  await waitUntil(async () => (await preferences()).permission === "ask", "Accept continues in Manual");
  await settled();
  const primaryTurn = await planTurn("fixture:plan-review primary");
  assert.deepEqual(primaryTurn.params.codeDesktop, { permissionMode: "plan", afterPlan: "acceptEdits", customization: { systemPrompt: null, instructions: null, modelParams: null }, dynamicWorkflows: false });
  await planCard().getByRole("button", { name: "Accept and allow edits", exact: true }).click();
  await planCard().waitFor({ state: "detached" });
  await page.waitForFunction(() => document.querySelector(".sc-permission")?.textContent === "Accept edits");
  await waitUntil(async () => (await preferences()).permission === "acceptEdits", "the primary continues in Accept edits");
  await settled();
  metrics.planResponses = (await requests()).filter((request) => !request.method).map((request) => request.result);
  assert.deepEqual(metrics.planResponses, [
    { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "ask" } },
    { answers: { "plan-review": { answers: ["Approve"] } }, codeDesktop: { afterPlan: "acceptEdits" } },
  ]);
  checks.push("R07 DeepSeek plan card: with Accept edits before Plan the card offers Accept / 'Accept and allow edits'; Accept leaves Plan for Manual and the primary for Accept edits (persisted, codeDesktop.afterPlan on the wire)");

  assert.deepEqual(errors, []);
  const report = { passed: true, fixture: true, at: new Date().toISOString(), profile, checks, metrics, errors,
    requestCount: (await requests()).length };
  await fs.writeFile(path.join(evidence, "permission-source-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page?.screenshot({ path: path.join(evidence, "permission-source-failure.png") }).catch(() => {});
  await fs.writeFile(path.join(evidence, "permission-source-test.json"), JSON.stringify({
    passed: false, fixture: true, at: new Date().toISOString(), profile, checks, metrics, errors, error: error.stack,
  }, null, 2));
  throw error;
} finally {
  await app?.close();
}
