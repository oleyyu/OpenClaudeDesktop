import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fillComposer } from "./composer-test-helpers.mjs";

// Dynamic workflows configuration and behavior, modeled on Claude Code 2.1.280, on the isolated Codex protocol
// fixture: Settings › Code › Dynamic workflows (layout in light, dark and narrow; Advanced collapsed by default; a
// numeric row saves and clears), the "ultracode" keyword (highlight, notice, alt+w, the turn's hidden reminder),
// ultracode mode (xhigh + its standing reminder, on/off) and a model-started run through OpenClaude Desktop's Workflow tool
// (agent-tools MCP server → approval → background run → <task-notification> back to the model as a new turn).
// Never opens user sessions, writes the clipboard or shows native dialogs (the approval sheet is stubbed in main).
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const directory = path.join(evidence, `workflow-config-ui-${new Date().toISOString().replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const RC = "wf-config-session", now = Math.floor(Date.now() / 1000);
const parent = { id: RC, name: "Workflow config fixture", cwd: workspace, historyMode: "paginated", createdAt: now, updatedAt: now,
  turns: [{ id: "original-turn", status: "completed", items: [{ id: "original-user", type: "userMessage", content: [{ type: "text", text: "Original prompt" }] }, { id: "original-answer", type: "agentMessage", text: "ORIGINAL_RESPONSE" }] }] };
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace, theme: "light", mode: "code", model: "fixture", permission: "auto", threadIds: [RC], sidebarWidth: 288 }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 900, threads: { [RC]: parent } }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: path.join(profile, "codex-home"), CODE_DESKTOP_WORKFLOW_BINARY: path.join(root, "tests/fixtures/workflow-server.cjs"), CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"),
  CODE_DESKTOP_MANAGED_SETTINGS: path.join(profile, "no-managed-settings.json"), HOME: path.join(profile, "home") };
for (const key of Object.keys(env)) if (/^(CLAUDE_CODE_.*WORKFLOW|CLAUDE_WORKFLOW_|MAX_STRUCTURED_OUTPUT_RETRIES|CLAUDE_CODE_SUBAGENT_MODEL)/.test(key)) delete env[key];
await fs.mkdir(env.CODEX_HOME); await fs.mkdir(env.HOME);
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, failure;
async function poll(check, label, timeout = 15000) {
  const until = Date.now() + timeout;
  for (;;) {
    try { const value = await check(); if (value) return value; } catch {}
    if (Date.now() > until) throw new Error(`Timed out: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
const requests = async () => (await fs.readFile(path.join(profile, "fixture-requests.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const preferences = async () => JSON.parse(await fs.readFile(path.join(profile, "preferences.json"), "utf8"));
const turnStarts = async () => (await requests()).filter((entry) => entry.method === "turn/start");
// The fixture holds an ordinary turn open; 'fixture:complete …' completes it at once. Idle = the last turn finished.
const idle = () => poll(async () => { const thread = JSON.parse(await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8")).threads[RC]; return thread.turns.at(-1).status !== "inProgress"; }, "session idle");
try {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow(); page.setDefaultTimeout(15000);
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  // The Workflow tool asks with the session's own approval card (main.cjs agentToolCard); the native sheet
  // (agent-tool-approval.cjs) is only the fallback when no core connection can carry the card, so it must stay unused here.
  await app.evaluate(({ dialog }) => { globalThis.__workflowBoxes = []; dialog.showMessageBox = async (...args) => { const options = args.length > 1 ? args[1] : args[0]; globalThis.__workflowBoxes.push({ message: options.message, detail: options.detail, buttons: options.buttons }); return { response: 0 }; }; });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 800));
  await page.waitForFunction(() => innerWidth === 1324);
  await page.locator(`[data-source-session-id="${RC}"] .source-session-open`).click();
  await page.getByText("ORIGINAL_RESPONSE", { exact: true }).waitFor();
  const editor = page.getByRole("textbox", { name: /^(?:Prompt|Message DeepSeek)$/ });

  // --- Settings › Code › Dynamic workflows
  await editor.focus(); await page.keyboard.press("Meta+,");
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.getByRole("navigation", { name: "Settings", exact: true }).getByRole("button", { name: "Code", exact: true }).click();
  // Claude 2.2553.1 c71860c77: the Dynamic workflows switch sits in Sessions (B23: hr titles it 'Sessions') straight after Bypass; the workflow
  // rows nest beneath it (indented).
  const group = settings.locator("section.ss-group").filter({ has: page.getByRole("heading", { name: "Sessions", exact: true }) });
  await group.waitFor();
  const allRowIds = async () => group.locator("[data-settings-row]").evaluateAll((rows) => rows.map((row) => row.getAttribute("data-setting-id")));
  const rowIds = async () => (await allRowIds()).filter((id) => /^(dynamicWorkflows|workflow)/.test(id));
  assert.equal((await allRowIds()).indexOf("dynamicWorkflows"), (await allRowIds()).indexOf("bypass") + 1, "right after Bypass");
  assert.deepEqual(await rowIds(), ["dynamicWorkflows", "workflowEngine", "workflowKeywordTrigger", "workflowSizeGuideline", "workflowAdvanced"], "uncrowded: Advanced collapsed by default");
  assert.equal(await group.getByRole("switch", { name: "Dynamic workflows", exact: true }).getAttribute("aria-checked"), "true", "on by default");
  assert.match(await group.locator('[data-setting-id="workflowEngine"]').textContent(), /no workflow engine of its own, so OpenClaude Desktop runs its workflows/);
  assert.equal(await group.getByRole("switch", { name: "Ultracode keyword trigger", exact: true }).getAttribute("aria-checked"), "true");
  assert.equal(await group.getByRole("combobox", { name: "Dynamic workflow size", exact: true }).getAttribute("data-value"), "medium");
  const advanced = group.getByRole("button", { name: "Advanced", exact: true });
  assert.equal(await advanced.getAttribute("aria-expanded"), "false");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") { await page.evaluate(() => window.desktop.call("settings", { theme: "dark" })); await page.waitForFunction(() => document.documentElement.getAttribute("data-mode") === "dark" || document.querySelector("[data-mode=dark]")); }
    await group.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(directory, `settings-workflows-${theme}.png`) });
  }
  await advanced.click();
  await poll(async () => await advanced.getAttribute("aria-expanded") === "true", "Advanced opened");
  assert.deepEqual((await rowIds()).slice(5), ["workflowMaxConcurrentAgents", "workflowStructuredOutputRetries", "workflowPrefixStaggerMs", "workflowPromptProvenance", "workflowSizeWarningAgents", "workflowSizeWarningTokens", "workflowSubagentModel", "workflowRules"]);
  const concurrent = group.getByRole("spinbutton", { name: "Agents running at once", exact: true });
  metrics.autoPlaceholder = await concurrent.getAttribute("placeholder");
  assert.match(metrics.autoPlaceholder, /^Auto \(\d+\)$/);
  assert.equal(await concurrent.inputValue(), "", "blank = automatic");
  await concurrent.fill("7"); await concurrent.press("Enter");
  await poll(async () => (await preferences()).workflowMaxConcurrentAgents === 7, "concurrency saved");
  await concurrent.fill("300"); await concurrent.press("Enter");
  await group.getByText("Enter a whole number from 1 to 256.", { exact: true }).waitFor();
  assert.equal((await preferences()).workflowMaxConcurrentAgents, 7, "an out-of-range value is refused");
  await concurrent.fill(""); await concurrent.press("Enter");
  await poll(async () => !("workflowMaxConcurrentAgents" in await preferences()), "blank clears to automatic");
  metrics.overflow = await group.evaluate((node) => node.scrollWidth - node.clientWidth);
  assert.ok(metrics.overflow <= 1, "no horizontal overflow");
  await group.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, "settings-workflows-advanced-dark.png") });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(720, 800));
  await page.waitForFunction(() => innerWidth === 720);
  await group.scrollIntoViewIfNeeded();
  metrics.narrowOverflow = await group.evaluate((node) => node.scrollWidth - node.clientWidth);
  assert.ok(metrics.narrowOverflow <= 1, "narrow: no horizontal overflow");
  await page.screenshot({ path: path.join(directory, "settings-workflows-narrow.png") });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 800));
  await page.waitForFunction(() => innerWidth === 1324);
  await page.evaluate(() => window.desktop.call("settings", { theme: "light" }));
  await advanced.click();
  await page.keyboard.press("Escape"); await settings.waitFor({ state: "detached" });
  checks.push("Settings: the master row right after Bypass in Sessions, engine/keyword/size indented beneath, Advanced collapsed; numeric row saves, refuses out of range, clears; light/dark/narrow screenshots without overflow");

  // --- The "ultracode" keyword: highlight, notice, alt+w, the turn's hidden reminder
  await fillComposer(page, editor, "fixture:complete ultracode fix the auth bug");
  const notice = page.locator(".sc-workflow-notice");
  await notice.getByText("Dynamic workflow requested for this turn · ⌥W to ignore", { exact: true }).waitFor();
  assert.equal(await page.locator(".sc-ultracode-keyword").count(), 1);
  await editor.focus(); await page.keyboard.press("Alt+KeyW");
  await notice.getByText("Ultracode keyword ignored for this prompt · ⌥W to undo", { exact: true }).waitFor();
  assert.equal(await page.locator(".sc-ultracode-keyword").count(), 0);
  await page.keyboard.press("Alt+KeyW");
  await notice.getByText("Dynamic workflow requested for this turn · ⌥W to ignore", { exact: true }).waitFor();
  assert.equal(await editor.evaluate((node) => node.value), "fixture:complete ultracode fix the auth bug", "alt+w types nothing");
  const before = (await turnStarts()).length;
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  const keywordTurn = await poll(async () => (await turnStarts())[before], "keyword turn");
  assert.equal(keywordTurn.params.input[0].text, "fixture:complete ultracode fix the auth bug");
  assert.match(keywordTurn.params.input[1]?.text ?? "", /^<system-reminder>\nThe user included the keyword "ultracode", opting this turn into multi-agent orchestration — use the Workflow tool to fulfill the request\.\n<\/system-reminder>$/);
  assert.ok(!("workflowTurn" in (keywordTurn.params.codeDesktop ?? {})), "the renderer's workflow facts never reach the core");
  await page.locator(".source-user-message, [data-cds=UserMessage]").filter({ hasText: "fixture:complete ultracode fix the auth bug" }).last().waitFor();
  assert.equal(await page.getByText("opting this turn into multi-agent orchestration").count(), 0, "the reminder is hidden in the transcript");
  await idle();
  await fillComposer(page, editor, "fixture:complete ultracode, but ignored");
  await editor.focus(); await page.keyboard.press("Alt+KeyW");
  const ignoredAt = (await turnStarts()).length;
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  const ignoredTurn = await poll(async () => (await turnStarts())[ignoredAt], "ignored keyword turn");
  await idle();
  assert.equal(ignoredTurn.params.input.length, 1, "alt+w: no reminder");
  checks.push("Keyword: highlighted, notice, alt+w toggles without typing, reminder only when not ignored, hidden in the transcript");

  // --- Ultracode mode: xhigh + the standing reminder, then off
  const send = async (text) => { await idle(); const at = (await turnStarts()).length; await fillComposer(page, editor, text); await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click(); const turn = await poll(async () => (await turnStarts())[at], `turn ${text}`); await idle(); return turn; };
  const runCommand = async (text) => { await fillComposer(page, editor, text); await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click(); };
  await runCommand("/effort ultracode");
  await page.locator('.sc-workflow-notice[data-workflow-notice="ultracode"]').waitFor();
  assert.match(await page.locator(".sc-workflow-notice").textContent(), /ultracode · xhigh effort \+ dynamic workflows for maximum thoroughness/);
  assert.equal(await page.locator(".sc-effort-trigger").getAttribute("data-top-tier"), "");
  const on = await send("fixture:complete first ultracode-mode task");
  assert.equal(on.params.effort, "xhigh", "ultracode runs at xhigh");
  assert.match(on.params.input[1]?.text ?? "", /Ultracode is on: optimize for the most exhaustive, correct answer/);
  const still = await send("fixture:complete second task");
  assert.equal(still.params.input.length, 1, "the full reminder is not repeated before 10 turns");
  assert.ok(!("effort" in await preferences()) || (await preferences()).effort !== "ultracode", "never saved as the default");
  await runCommand("/effort high");
  await poll(async () => !(await page.locator('.sc-workflow-notice[data-workflow-notice="ultracode"]').count()), "ultracode status gone");
  const off = await send("fixture:complete after ultracode");
  assert.match(off.params.input[1]?.text ?? "", /Ultracode is off — the Workflow tool's standard opt-in rule applies again\./);
  checks.push("Ultracode: status line, effort xhigh, full reminder once, exit reminder, never persisted");

  // --- The model's Workflow tool on the fixture core, through the agent-tools MCP server
  const script = 'export const meta={name:"ui-run",description:"UI workflow",phases:[{title:"Go"}]};\nphase("Go"); return await agent("FAST")';
  await idle(); const workflowAt = (await turnStarts()).length;
  await fillComposer(page, editor, `fixture:workflow-tool ${JSON.stringify({ script, args: { n: 1 } })}`);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await poll(async () => (await turnStarts())[workflowAt], "workflow-tool turn");
  const workflowCard = page.locator("[data-approval-card-root]").filter({ has: page.locator('[data-approval-action="accept"]') }).last();
  await workflowCard.waitFor();
  metrics.workflowCardText = await workflowCard.textContent();
  assert.match(metrics.workflowCardText, /run a dynamic workflow ui-run/);
  assert.match(metrics.workflowCardText, /UI workflow[\s\S]*1\. Go/);
  assert.deepEqual(await workflowCard.locator("[data-approval-action]").evaluateAll((nodes) => nodes.map((node) => node.textContent.replace(/⌘.*$/, "").trim())), ["No", "Yes, run it"]);
  // Allow buttons arm 400 ms after the card appears (or the window regains focus; source-approval-card.jsx ApprovalAllowArm, shared-10 OS).
  await poll(async () => { if (!(await workflowCard.count())) return true; await new Promise((resolve) => setTimeout(resolve, 500)); await workflowCard.locator('[data-approval-action="accept"]').click({ timeout: 2000 }).catch(() => {}); return false; }, "workflow card answered");
  await idle();
  const listed = await poll(async () => (await requests()).find((entry) => entry.method === "mcp:tools/list"), "tools/list");
  assert.ok(listed.params.tools.includes("Workflow"), "OpenClaude Desktop's Workflow tool is listed");
  assert.match(listed.params.workflowDescription, /ONLY when the user has explicitly opted into multi-agent orchestration/);
  const called = await poll(async () => (await requests()).find((entry) => entry.method === "mcp:tools/call"), "tools/call");
  metrics.launchText = called.params.result.content[0].text;
  assert.match(metrics.launchText, /^Workflow launched in background\. Task ID: w[0-9a-z]{8}\nSummary: UI workflow\nTranscript dir: [\s\S]*\nRun ID: wf_[0-9a-f-]{12}\n/);
  const boxes = await app.evaluate(() => globalThis.__workflowBoxes);
  assert.deepEqual(boxes, [], "answered in the transcript card, not a native sheet");
  const notified = await poll(async () => (await turnStarts()).find((entry) => entry.params.input?.[0]?.text?.includes("<task-notification>")), "notification turn", 30000);
  assert.match(notified.params.input[0].text, /^<system-reminder>\n\[SYSTEM NOTIFICATION - NOT USER INPUT\][\s\S]*<status>completed<\/status>\n<summary>Dynamic workflow "UI workflow" completed<\/summary>\n<result>"fixture result"<\/result>/);
  assert.equal(notified.params.threadId, RC);
  await page.locator(".source-task-event").filter({ hasText: /Background workflow completed\s*· UI workflow/ }).waitFor();
  assert.equal(await page.getByText("SYSTEM NOTIFICATION").count(), 0, "the notification is a system row, not the user's text");
  await page.screenshot({ path: path.join(directory, "workflow-notification.png") });
  checks.push("Workflow tool: listed over MCP, transcript approval card, Claude launch text, run completes, <task-notification> turn reaches the model, transcript notice");
  assert.deepEqual(rendererErrors, []);
} catch (error) { failure = error; }
finally {
  const report = { at: new Date().toISOString(), passed: !failure, directory, checks, metrics, rendererErrors, failure: failure ? String(failure.stack || failure) : null };
  await fs.writeFile(path.join(directory, "workflow-config-ui-report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "workflow-config-ui-report.json"), JSON.stringify(report, null, 2));
  try { await app?.close(); } catch {}
}
if (failure) throw failure;
console.log(JSON.stringify({ ok: true, checks, directory }, null, 2));
