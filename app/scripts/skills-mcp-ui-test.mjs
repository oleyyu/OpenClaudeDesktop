import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { shortDate } from "../src/customize-model.mjs";

// Settings › Customize (Skills / Connectors / Plugins), the composer Add-menu
// Skills/Plugins submenus and the /skills /mcp /plugins commands against the
// (nav labels are read from text nodes only: Icon renders a glyph text node)
// isolated protocol fixture. Runs with an isolated profile and a throwaway
// CODEX_HOME; the real ~/.codex is never read or written.
const project = path.resolve(import.meta.dirname, "../..");
const root = path.join(project, "app");
const evidence = path.join(project, "analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const startedAt = new Date().toISOString();
const directory = path.join(evidence, `skills-mcp-ui-${startedAt.replaceAll(":", "-")}`);
await fs.mkdir(directory, { recursive: true });
const profile = await fs.mkdtemp(path.join(directory, "profile-"));
const workspace = path.join(profile, "workspace");
const codexHome = path.join(profile, "codex-home");
await fs.mkdir(workspace);
const T = "skills-mcp-thread";
const now = Math.floor(Date.now() / 1000);
const skillFile = (dir) => path.join(dir, "SKILL.md");
const alphaDir = path.join(codexHome, "skills/fx-alpha"), betaDir = path.join(codexHome, "skills/fx-beta");
const repoDir = path.join(workspace, ".agents/skills/fx-repo"), pluginSkillDir = path.join(codexHome, "plugins/fx-plugin/skills/fx-plugin-skill");
for (const dir of [alphaDir, betaDir, pluginSkillDir]) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(skillFile(dir), `---\nname: ${path.basename(dir)}\n---\n# ${path.basename(dir)}\n`); }
// c1ff8b71a + cb5bb65ab W: structured metadata needs description or extra fields.
// Keep the other fixtures name-only to cover the source's unstructured fallback.
await fs.writeFile(skillFile(alphaDir), '---\nname: fx-alpha\ndescription: Alpha fixture skill\nmetadata:\n  author: Fixture author\nallowed-tools: [Read, Edit]\n---\n# fx-alpha\n\nA **real skill file** with `inline code`.\n\n## Instructions\n\n- Read the source\n- Review the changes\n\n[Documentation](https://example.test/docs)\n');
await fs.writeFile(skillFile(betaDir), '---\r\nname: fx-beta\r\n---\r\n# fx-beta\r\n\r\n');
await fs.mkdir(repoDir, { recursive: true }); // fx-repo has no SKILL.md on disk → "—"
const alphaMtime = Math.floor((await fs.stat(skillFile(alphaDir))).mtimeMs / 1000);
const skill = (dir, over) => ({ name: path.basename(dir), description: `${path.basename(dir)} description`, path: skillFile(dir), scope: "user", enabled: true, pluginId: null, ...over });
const seed = {
  autoCompleteTurns: true,
  skills: [{ cwd: workspace, skills: [
    skill(alphaDir, { interface: { displayName: "fx-alpha", shortDescription: "Alpha fixture skill" } }),
    skill(betaDir, { enabled: false }),
    skill(repoDir, { scope: "repo" }),
    skill(pluginSkillDir, { pluginId: "fx-plugin" }),
  ], errors: [{ path: path.join(workspace, ".agents/skills/broken/SKILL.md"), message: "invalid frontmatter" }] }],
  mcp: { servers: [
    { name: "fx-connected", runtimeStatus: "connected", serverInfo: { name: "fx", title: "Fixture Connected", version: "1.0" }, tools: { one: {}, two: {} }, authStatus: "unsupported" },
    { name: "fx-starting", runtimeStatus: "starting", tools: {}, authStatus: "unsupported" },
    { name: "fx-failed", runtimeStatus: "failed", tools: {}, authStatus: "unsupported" },
    { name: "fx-auth", runtimeStatus: "notStarted", tools: {}, authStatus: "notLoggedIn" },
  ] },
  // R04 fixture knob: config/read mcp_servers for the connected server (the drill's LocalConfig); the env
  // value must never reach the renderer (main.cjs mcpDefinitions keeps names only).
  mcpConfig: { "fx-connected": { command: "npx", args: ["-y", "fx-connected-server"], env: { FX_TOKEN: "fixture-secret-value" } } },
  plugins: {
    marketplaces: [{ name: "fx-market", path: path.join(codexHome, "plugins/fx-market.json"), interface: { displayName: "Fixture Market" }, plugins: [
      { id: "fx-plugin", name: "fx-plugin", installed: true, enabled: true, source: { type: "local", path: path.join(codexHome, "plugins/fx-plugin") }, interface: { displayName: "Fx Plugin", shortDescription: "Fixture plugin", developerName: "Fixture Labs" } },
      { id: "fx-off", name: "fx-off", installed: true, enabled: false, source: { type: "git" }, interface: { displayName: "Fx Off", developerName: "Fixture Labs" } },
      { id: "fx-remote", name: "fx-remote", installed: false, enabled: true, source: { type: "remote" } },
    ] }],
    details: [{ marketplaceName: "fx-market", summary: { id: "fx-plugin", name: "fx-plugin" }, description: "Fixture plugin detail",
      skills: [{ name: "fx-plugin-skill", description: "", path: skillFile(pluginSkillDir), enabled: true }], hooks: [{ key: "fx-hook", eventName: "PreToolUse" }], apps: [], mcpServers: ["fx-connected"] }],
  },
};
// Load-state knobs (tests/fixtures/codex-server.cjs replyCustomize): skills/list and
// plugin/installed fail slowly from launch until step 1b clears them.
await fs.writeFile(path.join(profile, "fixture-customize.json"), JSON.stringify({ ...seed, skillsFail: true, skillsDelayMs: 3000, pluginsFail: true, pluginsDelayMs: 1500 }));
// F07 tool rows: two consecutive MCP calls (one classic group), a lone MCP call and a DeepSeek
// ask_user_question row, in a second older session opened at the end.
const T2 = "skills-mcp-tools";
const mcpCall = (id, text) => ({ id, type: "mcpToolCall", server: "fx-connected", tool: "one", status: "completed", arguments: { query: id },
  result: { content: [{ type: "text", text }], structuredContent: null }, error: null, durationMs: 5 });
const askQuestions = [{ id: "lang", header: "Language", question: "Which language?", options: [{ label: "TypeScript" }, { label: "Go" }] },
  { id: "kinds", question: "Which test kinds?", options: [{ label: "Unit" }, { label: "UI" }], multi_select: true }, { id: "name", question: "Package name?" }];
const toolsTurn = { id: "tools-turn", status: "completed", items: [
  { id: "tools-user", type: "userMessage", content: [{ type: "text", text: "Tool rows" }] },
  mcpCall("mcp-a", "MCP_A_RESULT"), mcpCall("mcp-b", "MCP_B_RESULT"),
  { id: "tools-between", type: "agentMessage", text: "Between the calls." },
  mcpCall("mcp-solo", "MCP_SOLO_RESULT"),
  { id: "tools-asked-lede", type: "agentMessage", text: "Then a question." },
  { id: "ask-row", type: "dynamicToolCall", namespace: null, tool: "ask_user_question", arguments: { questions: askQuestions }, status: "completed", success: true, durationMs: 9,
    contentItems: [{ type: "inputText", text: JSON.stringify({ answers: [{ id: "lang", selected: ["Go"] }, { id: "kinds", selected: ["Unit", "UI"], custom: "smoke" }, { id: "name", selected: [] }] }) }] },
  // R06: a DeepSeek todo_write pair and a command in one group (cf6ae6197 fk 'Updated todos, ran a command'),
  // then an MCP call returning a 1x1 PNG (QO 'View screenshot' thumbnail under the standalone row).
  { id: "tools-todo-lede", type: "agentMessage", text: "Then todos." },
  ...["todo-a", "todo-b"].map(id => ({ id, type: "dynamicToolCall", namespace: null, tool: "todo_write", arguments: { todos: [{ content: "Write tests", status: "in_progress" }] }, status: "completed", success: true, durationMs: 2,
    contentItems: [{ type: "inputText", text: "Updated todo list" }] })),
  { id: "todo-cmd", type: "commandExecution", command: "ls", cwd: workspace, processId: null, source: "agent", commandActions: [{ type: "unknown", command: "ls" }], status: "completed", aggregatedOutput: "a\n", exitCode: 0, durationMs: 4, shell: "bash" },
  { id: "tools-shot-lede", type: "agentMessage", text: "Then a screenshot." },
  { ...mcpCall("mcp-shot", "MCP_SHOT_RESULT"), result: { content: [{ type: "text", text: "MCP_SHOT_RESULT" },
    { type: "image", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", mimeType: "image/png" }], structuredContent: null } },
  { id: "tools-done", type: "agentMessage", text: "Tool rows done." },
] };
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace, theme: "light", mode: "code", model: "fixture", effort: "low", threadIds: [T, T2], sidebarWidth: 288, displayName: "Fixture" }));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: { [T]: { id: T, name: "Skills MCP", cwd: workspace, createdAt: now, updatedAt: now, archived: false,
  turns: [{ id: "sm-turn", status: "completed", items: [{ id: "sm-user", type: "userMessage", content: [{ type: "text", text: "Seed message" }] }, { id: "sm-answer", type: "agentMessage", text: "Seed answer." }] }] },
  [T2]: { id: T2, name: "Tool rows", cwd: workspace, createdAt: now - 600, updatedAt: now - 600, archived: false, turns: [toolsTurn] } } }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: codexHome, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const checks = [], metrics = {}, rendererErrors = [];
let app, page, build, failure, runtime, profileRemoved = false;
const testSources = ["scripts/skills-mcp-ui-test.mjs", "tests/fixtures/codex-server.cjs", "src/customize-model.mjs"];
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
  for (const required of ["src/source-customize.jsx", "src/source-customize.css", "src/customize-model.mjs", "src/customize-store.mjs", "src/source-settings.jsx",
    "src/main.jsx", "src/composer-attachments-model.mjs", "src/source-composer-attachments.jsx", "src/session-command-model.mjs", "src/source-menu.jsx",
    "src/source-menu.css", "electron/main.cjs", "electron/customize-operations.cjs"])
    assert.ok(build.sources.some(entry => entry.path === required), `Build does not identify ${required}`);
  const hashes = Object.fromEntries(await Promise.all(testSources.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])));
  if (testSourceHashes) assert.deepEqual(hashes, testSourceHashes, "Test or protocol fixture changed during this run");
  else testSourceHashes = hashes;
}
const near = (actual, expected, label, tolerance = 1) => assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
const trace = async () => (await fs.readFile(path.join(profile, "fixture-requests.jsonl"), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
const readSeed = async () => JSON.parse(await fs.readFile(path.join(profile, "fixture-customize.json"), "utf8"));
const writeSeed = data => fs.writeFile(path.join(profile, "fixture-customize.json"), JSON.stringify(data));
const emit = notifications => fs.writeFile(path.join(profile, "fixture-notify.json"), JSON.stringify({ notifications }));
async function waitTrace(predicate, label, timeout = 8000) {
  const until = Date.now() + timeout;
  while (Date.now() < until) { const entries = await trace(); if (predicate(entries)) return entries; await new Promise(resolve => setTimeout(resolve, 40)); }
  throw new Error(`Timed out waiting for trace: ${label}`);
}
const composer = () => page.getByRole("textbox", { name: "Message DeepSeek" });
// Visible labels without the Icon glyph text nodes (src/icons.jsx renders a private-use codepoint as text).
const labels = locator => locator.evaluateAll(items => items.map(item => { const clone = item.cloneNode(true); clone.querySelectorAll("[data-cds=Icon]").forEach(icon => icon.remove()); return clone.textContent.trim(); }));
// shared-11 Enter selects; use the submit control for action routing checks.
async function slash(text) { await composer().fill(text); await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click(); }
const dialog = () => page.getByRole("dialog", { name: "Settings", exact: true });
const nav = () => page.getByRole("navigation", { name: "Settings", exact: true });
async function openSection(command) {
  await slash(command); await dialog().waitFor();
  // shared-22 cw:4548–4606 enters from scale .98 over 200ms. Geometry
  // checks concern the settled surface; never loosen their tolerances to
  // accept the intermediate transformed rectangle.
  await page.waitForFunction(() => {
    const node = document.querySelector('.ss-settings-dialog');
    if (!node || node.dataset.open !== 'true') return false;
    const style = getComputedStyle(node);
    return style.opacity === '1' && ['none', '1'].includes(style.scale)
      && node.getAnimations().every(animation => animation.playState === 'finished');
  });
}
const closeSettings = async () => { await dialog().getByRole("button", { name: "Close", exact: true }).click(); await dialog().waitFor({ state: "detached" }); };
const token = async (name) => page.evaluate(name => { const probe = document.createElement("span"); probe.style.color = `var(${name})`; document.querySelector(".ss-dialog").appendChild(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; }, name);
// CDS Button (shared-frame ks via source-settings-button.jsx): variant, box and paint.
const buttonBox = locator => locator.evaluate(node => { const style = getComputedStyle(node), rect = node.getBoundingClientRect(), paint = node.querySelector('[data-cds-part=paint]');
  return { cds: node.dataset.cds, variant: node.dataset.variant, size: node.dataset.size ?? null, height: rect.height, radius: parseFloat(style.borderTopLeftRadius), color: style.color, paint: paint && getComputedStyle(paint).backgroundColor,
    decoration: style.textDecorationLine, opacity: parseFloat(style.opacity), marginStart: parseFloat(style.marginInlineStart), disabled: node.disabled }; });
const numberToken = name => page.evaluate(name => parseFloat(getComputedStyle(document.querySelector(".ss-dialog")).getPropertyValue(name)), name);
const bgToken = async (name) => page.evaluate(name => { const probe = document.createElement("span"); probe.style.backgroundColor = `var(${name})`; document.querySelector(".ss-dialog").appendChild(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; }, name);
// A token resolved on the element itself, so a [data-size] remap (design-system.css:54649
// `.cds-root [data-size="sm"]`) is honoured instead of the dialog-level value.
const ownLengthToken = (locator, name) => locator.evaluate((node, name) => { const probe = document.createElement("span"); Object.assign(probe.style, { position: "absolute", visibility: "hidden", display: "block", width: `var(${name})` }); node.appendChild(probe); const value = probe.getBoundingClientRect().width; probe.remove(); return value; }, name);
const lengthToken = async (name) => page.evaluate(name => { const probe = document.createElement("span"); probe.style.width = `var(${name})`; probe.style.display = "block"; document.querySelector(".ss-dialog").appendChild(probe); const value = probe.getBoundingClientRect().width; probe.remove(); return value; }, name);
try {
  build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
  await verifySource();
  app = await electron.launch({ executablePath, args: [root], env });
  runtime = await app.evaluate(({ app }) => ({ version: app.getVersion(), electron: process.versions.electron, chrome: process.versions.chrome }));
  assert.equal(runtime.version, build.version, "Runtime version must match the verified source build");
  page = await app.firstWindow();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => rendererErrors.push(error.message));
  await page.locator(`[data-source-session-id="${T}"]`).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1324, 768));
  await page.waitForFunction(() => innerWidth === 1324 && innerHeight === 768);
  // Record every external-open call in the main process; never let the URL load anywhere.
  await app.evaluate(({ shell }) => { globalThis.__skillsMcpExternal = []; shell.openExternal = async url => { globalThis.__skillsMcpExternal.push(url); }; shell.showItemInFolder = target => { globalThis.__skillsMcpReveal = target; }; });
  await page.locator(`[data-source-session-id="${T}"] .source-session-open`).click();
  await page.locator('[data-transcript-item-id="sm-answer"]').waitFor();
  await page.locator(".loading-state").waitFor({ state: "detached" });

  // 1. shared-22 QC:4132–4166 wraps the label in a dedicated truncating span.
  // shared-19 ZC: Settings, This computer, then Customize.
  // Keep the exact labels, aria-current and source geometry assertions.
  await openSection("/skills");
  // 1a. shared-22 FC :3620-3650 + jC :3397-3458 {className:"mt-sm"}: while the slow
  // (failing) skills/list is pending the list body is an sr-only "Loading" status
  // beside the aria-hidden 6-row skeleton; the invented "Loading skills…" line is gone.
  const skillsSkeleton = page.locator('[data-cz-page="skills"] [data-cz-skeleton="skills"]');
  await skillsSkeleton.waitFor();
  metrics.skillsSkeleton = await skillsSkeleton.evaluate(node => {
    const rows = [...node.querySelectorAll(':scope > div > div.flex')];
    return { hidden: node.getAttribute('aria-hidden'), status: node.previousElementSibling?.getAttribute('role'), statusText: node.previousElementSibling?.textContent, statusClass: node.previousElementSibling?.className,
      headers: [...rows[0].children].map(cell => cell.getBoundingClientRect().height), headerBars: [...rows[0].querySelectorAll('[data-cds=Skeleton]')].map(bar => bar.getBoundingClientRect().width),
      cells: rows.slice(1).map(row => row.firstElementChild.firstElementChild.getBoundingClientRect().height), borders: rows.slice(1).map(row => getComputedStyle(row.firstElementChild.firstElementChild).borderTopWidth),
      widths: rows.slice(1).map(row => row.firstElementChild.querySelector('[data-cds=Skeleton]').getBoundingClientRect().width),
      trailing: rows.slice(1).map(row => [...row.children].slice(1).map(cell => cell.querySelector('[data-cds=Skeleton]').getBoundingClientRect().width)),
      columns: [...rows[1].children].map(cell => cell.getBoundingClientRect().width), leading: node.querySelectorAll('.size-6').length,
      shimmer: getComputedStyle(node.querySelector('[data-cds=Skeleton]'), '::after').animationName };
  });
  const skeletonPadSm = await lengthToken("--cds-pad-sm"), skeletonControl = await lengthToken("--cds-h-control");
  assert.equal(metrics.skillsSkeleton.hidden, "true"); assert.equal(metrics.skillsSkeleton.status, "status"); assert.equal(metrics.skillsSkeleton.statusText, "Loading"); assert.equal(metrics.skillsSkeleton.statusClass, "sr-only");
  assert.equal(metrics.skillsSkeleton.cells.length, 6, "TC.length rows");
  for (const height of metrics.skillsSkeleton.headers) near(height, skeletonControl, "skeleton header cell = h-control", 0.5);
  assert.deepEqual(metrics.skillsSkeleton.headerBars, [64, 32, 32], "header bars w-16 then w-8");
  for (const [index, height] of metrics.skillsSkeleton.cells.entries()) near(height, 28 + 2 * skeletonPadSm + 1 + (index === 0 ? 1 : 0), `skeleton row ${index} = h-7 + py-sm + alpha-1 rule`, 0.5);
  assert.deepEqual(metrics.skillsSkeleton.borders, ["1px", "0px", "0px", "0px", "0px", "0px"], "border-t on the first row only");
  assert.deepEqual(metrics.skillsSkeleton.widths, [128, 160, 112, 144, 96, 128], "TC widths");
  assert.ok(metrics.skillsSkeleton.trailing.every(([second, third]) => second === 32 && third === 64), "w-8 / w-16 trailing bars");
  near(metrics.skillsSkeleton.columns[1], 160, "w-40 column"); near(metrics.skillsSkeleton.columns[2], 160, "w-40 column");
  assert.equal(metrics.skillsSkeleton.leading, 0, "skills rows have no leading icon slot");
  assert.equal(metrics.skillsSkeleton.shimmer, "cds-shimmer");
  assert.equal(await page.getByText("Loading skills…", { exact: true }).count(), 0);
  assert.equal(await page.locator('[data-cz-page="skills"] :is(table,.cz-notice,[role=radiogroup])').count(), 0, "header + skeleton only while loading");
  checks.push("Skills loading = FC sr-only 'Loading' status + aria-hidden jC mt-sm skeleton: 32px header cells (w-16/w-8 bars), 6 rows at h-7 + 2×pad-sm + alpha-1 rule (border-t first), TC widths 128/160/112/144/96/128, w-40 columns, shimmer; no 'Loading skills…' text and no table");
  const skillsNav = nav().getByRole("button", { name: "Skills", exact: true });
  await page.waitForFunction(() => (button => button && button.querySelector(':scope > span:not([data-cds=Icon])')?.textContent.trim() === "Skills")(document.querySelector('.ss-nav li>button[aria-current="page"]')));
  metrics.nav = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".ss-nav-scroll > div")].map(group => ({ title: group.querySelector("p").textContent, buttons: [...group.querySelectorAll("li>button")].map(button => {
      const style = getComputedStyle(button), rect = button.getBoundingClientRect();
      return { name: button.querySelector(':scope > span:not([data-cds=Icon])')?.textContent.trim(), height: rect.height, paddingInline: style.paddingInlineStart, gap: style.gap, current: button.getAttribute("aria-current") };
    }) }));
    return groups;
  });
  assert.deepEqual(metrics.nav.map(group => group.title), ["Settings", "This computer", "Customize"]);
  // Hooks follows Plugins for a core that lists hooks (capabilities.hooksList; the Codex fixture does).
  assert.deepEqual(metrics.nav[2].buttons.map(button => button.name), ["Skills", "Connectors", "Plugins", "Hooks"]);
  for (const button of metrics.nav[2].buttons) { near(button.height, 32, `${button.name} nav height`, 0.5); assert.equal(button.paddingInline, "8px"); assert.equal(button.gap, "12px"); }
  assert.equal(metrics.nav[2].buttons[0].current, "page");
  // QC/pS:2197–2200,4132–4166 explicitly uses md. shared-frame ra/aa:1654–1677
  // maps md to 20px; compact affects auto only. Correct the old 16px assumption.
  for (const name of ['General', 'Connectors']) {
    const item = nav().getByRole('button', { name, exact:true });
    const box = await item.evaluate(button => ({
      icon: button.querySelector('[data-cds=Icon]').getBoundingClientRect().width,
      label: button.querySelector('span:not([data-cds=Icon])').clientWidth,
      text: button.querySelector('span:not([data-cds=Icon])').scrollWidth,
    }));
    assert.equal(box.icon, 20, `${name} icon does not stretch with the label`);
    assert.equal(box.label, box.text, `${name} fits the normal 192px navigation`);
  }
  checks.push("/skills opens Settings with a Customize group (Skills/Connectors/Plugins/Hooks) after Settings and This computer; 32px rows, 8px inline padding, 12px icon gap, aria-current on Skills");

  // 1b. customize-skills Ti {missing:"all"} → c27f32a39 Ie: the failed list renders only the
  // role=status failure with a secondary busy "Retry" (no table, no raw backend text).
  const skillsError = page.getByTestId("skills-tabbed-list-error");
  await skillsError.waitFor();
  assert.equal(await skillsError.getAttribute("role"), "status");
  assert.deepEqual(await skillsError.locator("p").allTextContents(), ["Couldn’t load your skills."]);
  assert.equal(await page.locator('[data-cz-page="skills"] :is(table,th,.cz-notice)').count(), 0, "error state renders no table or notice");
  assert.equal(await page.getByText("skills unavailable in fixture").count(), 0, "raw backend error stays out of the DOM");
  const skillsRetry = skillsError.getByRole("button", { name: "Retry", exact: true });
  metrics.skillsRetry = await buttonBox(skillsRetry);
  assert.equal(metrics.skillsRetry.cds, "Button"); assert.equal(metrics.skillsRetry.variant, "secondary");
  // c27f32a39 Ie: size:a with a = A() = shared-20 Za → sm in the classic dialog (so()'s Try again stays base).
  assert.equal(metrics.skillsRetry.size, "sm", "Ie Retry size:a = sm");
  near(metrics.skillsRetry.height, await ownLengthToken(skillsRetry, "--cds-h-control"), "Retry = own (sm) h-control", 0.5);
  near(metrics.skillsRetry.height, await lengthToken("--cds-h-control--sm"), "Retry = h-control--sm", 0.5);
  near(metrics.skillsRetry.radius, await ownLengthToken(skillsRetry, "--cds-radius"), "Retry radius = own (sm) --cds-radius", 0.1);
  let count = (await trace()).length;
  await skillsRetry.click();
  await page.waitForFunction(() => document.querySelector('[data-testid="skills-tabbed-list-error"] button')?.getAttribute("aria-busy") === "true");
  await page.waitForFunction(() => { const button = document.querySelector('[data-testid="skills-tabbed-list-error"] button'); return button && !button.hasAttribute("aria-busy"); }, null, { timeout: 8000 });
  assert.equal((await trace()).slice(count).filter(entry => entry.method === "skills/list").at(0)?.params.forceReload, true, "Retry forces skills/list");
  const recovered = await readSeed(); delete recovered.skillsFail; delete recovered.skillsDelayMs; await writeSeed(recovered);
  await skillsRetry.click();
  await page.locator('[data-testid="skills-tabbed-list-row"]').nth(4).waitFor();
  checks.push("Skills load failure: only the Ie role=status 'Couldn’t load your skills.' with a secondary size-sm (Za) CDS 'Retry' (no list/notice, raw error to console only); Retry stays on the failure with aria-busy during a failing forceReload skills/list and recovers the list once the backend answers");
  // Plugins: no classic-page failure branch in the source; so() with the catalog copy.
  await nav().getByRole("button", { name: "Plugins", exact: true }).click();
  await page.locator('[data-cz-page="plugins"] [data-cz-skeleton="plugins"]').waitFor();
  assert.equal(await page.getByText("Loading plugins…", { exact: true }).count(), 0);
  assert.equal(await page.locator('[data-cz-page="plugins"] [data-cz-skeleton="plugins"] .size-6').count(), 0, "plugins rows use jC without the icon slot");
  await page.locator('[data-cz-page="plugins"] .cz-load-error').waitFor();
  assert.deepEqual(await page.locator('[data-cz-page="plugins"] .cz-load-error p').allTextContents(), ["Couldn’t load plugins."]);
  assert.equal(await page.locator('[data-cz-page="plugins"] :is(table,th,.cz-notice)').count(), 0);
  const pluginsRetry = page.locator('[data-cz-page="plugins"]').getByRole("button", { name: "Try again", exact: true });
  assert.equal(await pluginsRetry.getAttribute("data-variant"), "secondary");
  const pluginsBack = await readSeed(); delete pluginsBack.pluginsFail; delete pluginsBack.pluginsDelayMs; await writeSeed(pluginsBack);
  count = (await trace()).length;
  await pluginsRetry.click();
  await page.locator('[data-testid="plugins-tabbed-list-row"]').nth(1).waitFor();
  assert.ok((await trace()).slice(count).some(entry => entry.method === "plugin/installed"), "Try again re-lists plugins");
  await nav().getByRole("button", { name: "Skills", exact: true }).click();
  checks.push("Plugins loading shows the jC skeleton (no icon slot, no 'Loading plugins…'); a failed plugin/installed renders only so() 'Couldn’t load plugins.' + secondary 'Try again', which re-lists and restores the list");

  // 2. Skills list (B24: c5e558aae "Your skills" tabbed list, ccea1f474 Ws rows over c27f32a39 je).
  const skillsTable = page.getByTestId("skills-tabbed-list-mine");
  const skillRows = skillsTable.locator('[data-testid="skills-tabbed-list-row"]');
  const openSkill = (file) => skillsTable.locator(`[data-row-id="${file}"] > button`).click();
  await skillRows.nth(4).waitFor();
  // cc011544b:846–978: real catalog subpaths and More query seed.
  // Exercise protocol-backed entries; never inject result rows into the DOM.
  const catalogTraceStart = (await trace()).length;
  const globalSearch = page.getByRole("textbox", { name: "Search settings", exact: true });
  await globalSearch.fill("fx-alpha");
  await page.getByRole("button", { name: "fx-alpha in Skills", exact: true }).click();
  await page.locator('[data-cz-detail="skill"] h2').getByText('fx-alpha', {exact:true}).waitFor();
  await page.waitForFunction(() => document.querySelector('[data-skill-file] .skf-markdown h1')?.textContent === 'fx-alpha');
  await page.locator('.cz-drill-header').getByRole('button', { name: 'Skills', exact: true }).click();
  await globalSearch.fill("fx-beta");
  await page.getByRole("button", { name: "fx-beta in Skills", exact: true }).click();
  assert.equal(await page.getByRole("switch", {name:"Enable skill",exact:true}).getAttribute("aria-checked"),"false");
  // cfaabd194 skill header: the primary "Try in chat" is disabled while the skill is off,
  // with the source disabledReason; opacity = --cds-opacity-disabled (shared-frame _s).
  const useDisabled = page.getByRole("button", { name: "Try in chat", exact: true });
  metrics.useDisabled = { ...await buttonBox(useDisabled), token: await numberToken("--cds-opacity-disabled"),
    reason: await useDisabled.evaluate(node => node.closest('.source-tooltip-disabled-trigger')?.querySelector('[data-cds-disabled-reason]')?.textContent) };
  assert.equal(metrics.useDisabled.variant, "primary"); assert.equal(metrics.useDisabled.disabled, true);
  assert.equal(metrics.useDisabled.opacity, metrics.useDisabled.token, "disabled opacity = --cds-opacity-disabled");
  assert.equal(metrics.useDisabled.reason, "Enable skill to try in chat");
  // A different real file owns a fresh Preview/Code state (c2eed content keyed by path).
  await page.locator('[data-skill-file] .skf-markdown h1').getByText('fx-beta',{exact:true}).waitFor();
  // Scope to the file: the app's background mode switch is also named Code.
  await page.locator('[data-skill-file]').getByRole('radio',{name:'Code',exact:true}).click();
  assert.equal(await page.locator('[data-skill-source-line]').evaluateAll(nodes=>nodes.map(node=>
    node.firstElementChild?.getAttribute('aria-hidden')==='true'?'':node.textContent).join('\n')),
    await fs.readFile(skillFile(betaDir),'utf8'), 'actual raw DOM preserves CRLF and final blank lines');
  await globalSearch.fill("fx-plugin-skill");
  await page.getByRole("button", { name: "fx-plugin-skill · Fx Plugin in Skills", exact: true }).waitFor();
  assert.equal(await page.locator('.ss-search-results button').count(),1);
  await page.getByRole("button", { name: "fx-plugin-skill · Fx Plugin in Skills", exact: true }).click();
  await page.locator('[data-cz-page="plugins"] [data-cz-detail="skill"]').waitFor();
  assert.deepEqual(await labels(page.locator('.cz-drill-header [data-cds=Button]')),['Fx Plugin']);
  await page.waitForFunction(() => document.querySelector('[data-skill-file] .skf-markdown h1')?.textContent === 'fx-plugin-skill');
  await page.locator('.cz-drill-header').getByRole('button', { name: 'Fx Plugin', exact: true }).click();
  // customize-plugins-current :1180–1204 replaces the list with the full-page drill.
  await page.locator('[data-cz-detail="plugin"]').waitFor();
  await globalSearch.fill("Fixture Connected");
  await page.getByRole("button", {name:"Fixture Connected in Connectors",exact:true}).click();
  // F13: the connector opens as the page-shell drill (customize-connectors :3164-3178), not a side card.
  await page.locator('[data-cz-detail="connector"] h2').getByText("Fixture Connected", {exact:true}).waitFor();
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(aside,table,.cz-detail)').count(), 0);
  await globalSearch.fill("fx");
  await page.getByRole("button", {name:"1 more match in Skills",exact:true}).click();
  assert.equal(await page.getByRole("searchbox", {name:"Search skills",exact:true}).inputValue(),"fx");
  assert.equal(await skillRows.count(),4);
  await page.getByRole("button", {name:"Clear search",exact:true}).click();
  await skillRows.nth(4).waitFor();
  assert.equal((await trace()).slice(catalogTraceStart).filter(entry=>['skills/config/write','config/batchWrite'].includes(entry.method)).length,0);
  checks.push("Settings catalog search opens exact real skill/connector/plugin-skill details; disabled skill stays disabled, plugin-skill is not duplicated, More seeds the actual list without configuration writes");
  // ccefd43d9 SearchInput: Clear retains the expanded field; Escape closes it.
  // Restore the initial collapsed state for the existing independent shell check.
  await page.getByRole("searchbox", {name:"Search skills",exact:true}).press("Escape");
  metrics.tokens = { hControl: await lengthToken("--cds-h-control"), padSm: await lengthToken("--cds-pad-sm"), padMd: await lengthToken("--cds-pad-md"), footnote: await lengthToken("--cds-font-size-footnote"), textSecondary: await token("--cds-text-secondary") };
  assert.equal(metrics.tokens.hControl, 32, "dialog density resolves h-control to 32px");
  // ccefd43d9 b inDialog: the c3c330885 D toolbar beside the title — the "Your skills" tab, then the Filter and Sort triggers.
  const skillsHeader = page.locator('[data-cz-page="skills"] .cz-header');
  assert.deepEqual(await skillsHeader.getByRole("tab").allTextContents(), ["Your skills"]);
  assert.equal(await skillsHeader.getByRole("button", { name: "Filter", exact: true }).getAttribute("data-variant"), "secondary");
  assert.equal(await skillsHeader.getByRole("button", { name: "Sort by Last edited", exact: true }).evaluate(node => node.textContent.replace(/[\uE000-\uF8FF]/g, "")), "Sort · Last edited", "the Sort icon-font glyph aside");
  assert.equal(await skillsHeader.getByRole("button", { name: "Reset filters and sort", exact: true }).count(), 0, "nothing held: no reset");
  // c6a2a31c4 Nc order and c27f32a39 K headers with their "· {count}".
  assert.deepEqual(await skillsTable.locator("[data-cz-section]").evaluateAll(nodes => nodes.map(node => node.textContent)),
    ["Needs attention· 1", "In this project· 1", "Created by you· 3"]);
  metrics.skillsList = await skillsTable.evaluate(list => [...list.querySelectorAll('[data-testid="skills-tabbed-list-row"]')].map(row => {
    const rect = row.getBoundingClientRect(), tile = row.querySelector('[data-testid="tabbed-list-icon-tile"]').getBoundingClientRect();
    return { id: row.getAttribute("data-row-id"), error: row.hasAttribute("data-skill-error"), height: rect.height, tile: [tile.width, tile.height], padding: getComputedStyle(row).paddingLeft,
      name: row.querySelector(".text-body-medium")?.textContent ?? null, credit: row.querySelector(".text-footnote.text-secondary, .truncate.text-secondary")?.textContent ?? null,
      off: row.querySelector('[data-cds="Badge"][data-variant="neutral"]')?.textContent ?? null, time: row.querySelector("time")?.getAttribute("datetime") ?? null,
      chip: row.querySelector("[data-cz-plugin-chip]")?.textContent ?? null, menu: row.querySelector('button[aria-haspopup="menu"]')?.getAttribute("aria-label") ?? null };
  }));
  assert.equal(metrics.skillsList.length, 5, "4 skills + 1 error row");
  const byId = Object.fromEntries(metrics.skillsList.filter(row => !row.error).map(row => [path.basename(path.dirname(row.id)), row]));
  for (const row of metrics.skillsList) { near(row.tile[0], 36, `${row.id} size-9 tile`, 0.5); assert.equal(row.padding, `${metrics.tokens.padMd}px`, "row p-md"); }
  assert.equal(byId["fx-beta"].off, "Disabled"); assert.equal(byId["fx-alpha"].off, null);
  assert.equal(byId["fx-alpha"].credit, "by you·Alpha fixture skill", "Ie: credit, the aria-hidden ·, then the description"); assert.equal(byId["fx-plugin-skill"].chip, "Fx Plugin");
  assert.equal(byId["fx-alpha"].time, new Date(alphaMtime * 1000).toISOString(), "the trailing time is the real SKILL.md mtime");
  assert.equal(byId["fx-repo"].time, null, "no SKILL.md: no time");
  assert.equal(byId["fx-alpha"].menu, "More actions for fx-alpha"); assert.equal(byId["fx-plugin-skill"].menu, null, "a plugin's skill has no menu (ec)");
  assert.equal(metrics.skillsList.find(row => row.error).credit.includes("invalid frontmatter"), true);
  await page.screenshot({ path: path.join(directory, "skills.png") });
  checks.push(`Skills list: "Your skills" toolbar with Filter / Sort · Last edited, Needs attention / In this project / Created by you sections with counts, 36px tiles, p-md rows, Disabled badge, "by you" credits, the Fx Plugin chip, real mtime <time> and the More actions menu`);

  // Source page-shell U: min-h-14 header outside the overflow-y-auto body.
  // No GUI run is claimed by merely adding these assertions.
  metrics.customizeShell = await page.locator('[data-cz-page="skills"]').evaluate(root => {
    const header = root.querySelector('.cz-header'), body = root.querySelector('.cz-page-body');
    const rect = header.getBoundingClientRect();
    return { headerHeight: rect.height, headerInBody: body.contains(header),
      bodyOverflow: getComputedStyle(body).overflowY, outerOverflow: getComputedStyle(root.parentElement).overflowY,
      rootTop: root.getBoundingClientRect().top, headerTop: rect.top };
  });
  assert.equal(metrics.customizeShell.headerHeight, 56);
  assert.equal(metrics.customizeShell.headerInBody, false);
  assert.equal(metrics.customizeShell.bodyOverflow, 'auto');
  assert.equal(metrics.customizeShell.outerOverflow, 'hidden');
  near(metrics.customizeShell.headerTop, metrics.customizeShell.rootTop, 'no extra 56px blank band before the page header', 0.1);

  // 3. Search, empty state, owner segments.
  // Official CDS SearchInput (ccefd43d9-FDEFOjev x / c13348442-CimsxjYd t) defaults to collapsible: an icon-only ghost
  // Search button that expands into a role=search wrapper (classic pageLayout=false: w-48) around <input type="search"> (→ ARIA role searchbox).
  assert.equal(await page.getByRole("button", { name: "Refresh", exact: true }).count(), 0, "no invented Refresh action in the Skills header");
  const searchToggle = page.getByRole("button", { name: "Search skills", exact: true });
  await searchToggle.waitFor();
  assert.equal(await page.getByRole("searchbox", { name: "Search skills" }).count(), 0, "the page search starts collapsed");
  metrics.searchCollapsed = await searchToggle.evaluate(node => { const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; });
  near(metrics.searchCollapsed.width, metrics.tokens.hControl, "collapsed search button is an h-control square", 0.5);
  near(metrics.searchCollapsed.height, metrics.tokens.hControl, "collapsed search button is an h-control square", 0.5);
  await searchToggle.click();
  const search = page.getByRole("searchbox", { name: "Search skills" });
  await search.waitFor();
  metrics.searchExpanded = await page.locator('[data-cz-page="skills"] [role=search]').evaluate(node => node.getBoundingClientRect().width);
  // ccefd43d9 x:118–121 + shared-20 Ff:2007: co is pageLayout,
  // not isModal. This classic shell uses w-48; w-64 belongs to pageLayout.
  near(metrics.searchExpanded, 192, "classic expanded search field = w-48");
  await search.fill("nomatch");
  await page.getByRole("button", { name: "Clear search", exact: true }).waitFor();
  await page.getByText("No skills match your search", { exact: true }).waitFor();
  assert.equal(await skillsTable.count(), 0);
  // Source ccefd43d9 x: Clear stays expanded; composing Escape stops at the
  // field, and an ordinary Escape clears/collapses only this search.
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  assert.equal(await search.inputValue(), '');
  assert.equal(await search.evaluate(el => document.activeElement === el), true);
  await search.fill('nomatch');
  await search.dispatchEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true });
  assert.equal(await search.inputValue(), 'nomatch');
  assert.equal(await page.locator('.ss-settings-dialog').count(), 1);
  await search.press('Escape');
  await searchToggle.waitFor();
  assert.equal(await page.locator('.ss-settings-dialog').count(), 1);
  await searchToggle.click();
  await search.fill("");
  await skillRows.nth(4).waitFor();
  // c3c3eda79 ct: with plugin skills listed the Filter menu is "Filter by" › Plugin / Created by submenus.
  const filterButton = skillsHeader.getByRole("button", { name: "Filter", exact: true });
  await filterButton.click();
  const filterMenu = page.getByRole("menu", { name: "Filter", exact: true });
  await filterMenu.waitFor();
  await filterMenu.getByRole("menuitem", { name: "Created by", exact: true }).click();
  const createdBy = page.getByRole("menu", { name: "Created by", exact: true });
  await createdBy.waitFor();
  assert.deepEqual(await createdBy.locator('[role="menuitemradio"] .smenu-label').allTextContents(), ["All", "You", "Your organization", "Codex"]);
  await createdBy.getByRole("menuitemradio", { name: "You", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="skills-tabbed-list-row"]').length === 4);
  assert.equal(await skillsTable.locator("[data-skill-error]").count(), 0, "an error row has no owner");
  await skillsHeader.getByRole("button", { name: "Filter, 1 on", exact: true }).waitFor();
  await skillsHeader.getByRole("button", { name: "Reset filters and sort", exact: true }).click();
  await skillRows.nth(4).waitFor();
  // c5e558aae Nt / At: a held sort (Name) is one untitled run; the reset puts Last edited and the sections back.
  await skillsHeader.getByRole("button", { name: "Sort by Last edited", exact: true }).click();
  const sortMenu = page.getByRole("menu", { name: "Sort by", exact: true });
  assert.deepEqual(await sortMenu.locator('[role="menuitemradio"] .smenu-label').allTextContents(), ["Last edited", "Name", "Plugin name"]);
  await sortMenu.getByRole("menuitemradio", { name: "Name", exact: true }).click();
  await skillsHeader.getByRole("button", { name: "Sort by Name", exact: true }).waitFor();
  assert.equal(await skillsTable.locator("[data-cz-section]").count(), 0, "a held sort lists one flat run");
  const named = await skillRows.evaluateAll(rows => rows.map(row => row.querySelector(".text-body-medium").textContent));
  assert.deepEqual(named, [...named].sort((a, b) => a.localeCompare(b)));
  await skillsHeader.getByRole("button", { name: "Reset filters and sort", exact: true }).click();
  await skillsHeader.getByRole("button", { name: "Sort by Last edited", exact: true }).waitFor();
  assert.equal(await skillsTable.locator("[data-cz-section]").count(), 3);
  checks.push(`Page search is collapsible: a ${metrics.searchCollapsed.width}px ghost Search button expands to a ${Math.round(metrics.searchExpanded)}px role=search field with a Clear search button; 'nomatch' empties the list with the official copy; Filter › Created by › You leaves the 4 owned skills ("Filter, 1 on"), Sort › Name lists one flat run by name, and Reset filters and sort restores both`);

  // 4. Drill-in detail (page shell W): the list is replaced by an ArrowLeft "Skills" header plus the
  // skill header and the SKILL.md file view (customize-skill-detail :276 = flex flex-col h-full pb-xs px-xl gap-md).
  const detail = page.locator(".cz-skill-detail");
  const back = page.locator(".cz-drill-header").getByRole("button", { name: "Skills", exact: true });
  const goBack = async () => { await back.click(); await skillRows.first().waitFor(); };
  await openSkill(skillFile(alphaDir));
  await detail.waitFor();
  assert.equal(await skillsTable.count(), 0, "the drill-in replaces the list, it is not a side card");
  assert.equal(await page.locator('[data-cz-page="skills"] [role=search]').count(), 0, "detailPresenting hides the page header");
  assert.deepEqual(await labels(back), ["Skills"], "ArrowLeft back button labelled with the page title");
  // customize-page-shell :486-493: CDS Button ghost + size:c + ArrowLeft + flush (ms-outset = -pad-md).
  // c = A() = shared-20 Za = Lf (`Ff() ? void 0 : "sm"`, tmp-shared-20:2013): the classic dialog is
  // not pageLayout, so the button is size sm and its h-control/radius/pad-md are the [data-size=sm]
  // remap on the button itself. (Pre-review this compared against the dialog-level 32px h-control,
  // which asserted the wrong, base size.)
  metrics.backButton = await buttonBox(back);
  metrics.buttonTokens = { radius: await lengthToken("--cds-radius"), smControl: await lengthToken("--cds-h-control--sm"), smRadius: await lengthToken("--cds-radius--sm"), smPadMd: await lengthToken("--cds-pad-md--sm"),
    own: { hControl: await ownLengthToken(back, "--cds-h-control"), radius: await ownLengthToken(back, "--cds-radius"), padMd: await ownLengthToken(back, "--cds-pad-md") },
    ghostHover: await bgToken("--cds-fill-ghost-hover"), primary: await bgToken("--cds-fill-primary"), secondary: await bgToken("--cds-fill-secondary") };
  assert.equal(metrics.backButton.cds, "Button"); assert.equal(metrics.backButton.variant, "ghost"); assert.equal(metrics.backButton.size, "sm", "Za → sm outside pageLayout");
  assert.deepEqual(metrics.buttonTokens.own, { hControl: metrics.buttonTokens.smControl, radius: metrics.buttonTokens.smRadius, padMd: metrics.buttonTokens.smPadMd }, "back button resolves the sm token remap");
  assert.equal(await back.locator('[data-cds=Icon]').count(), 2, "density-auto ArrowLeft masters");
  near(metrics.backButton.height, metrics.buttonTokens.own.hControl, "back button = own (sm) --cds-h-control", 0.5);
  near(metrics.backButton.radius, metrics.buttonTokens.own.radius, "back button radius = own (sm) --cds-radius", 0.1);
  near(metrics.backButton.marginStart, -metrics.buttonTokens.own.padMd, "flush start outset = -own (sm) pad-md", 0.1);
  await back.hover();
  await page.waitForFunction(expected => getComputedStyle(document.querySelector('.cz-drill-header [data-cds=Button] [data-cds-part=paint]')).backgroundColor === expected, metrics.buttonTokens.ghostHover);
  metrics.backHover = await buttonBox(back);
  assert.equal(metrics.backHover.paint, metrics.buttonTokens.ghostHover, "ghost hover paint = --cds-fill-ghost-hover");
  assert.equal(metrics.backHover.decoration, "none", "no underline on hover");
  // F13 cfaabd194 wt: primary "Try in chat" (icon Chat), the sm "Enable skill" switch without a visible label, then the
  // ghost icon-only ⋮ "More options for fx-alpha"; all at size:te (te = Te() = shared-20 Za → sm), measured on own tokens.
  const useSkill = page.getByRole("button", { name: "Try in chat", exact: true }), moreSkill = page.getByRole("button", { name: "More options for fx-alpha", exact: true });
  metrics.skillActions = { use: await buttonBox(useSkill), more: await buttonBox(moreSkill) };
  assert.equal(metrics.skillActions.use.variant, "primary"); assert.equal(metrics.skillActions.use.disabled, false); assert.equal(metrics.skillActions.more.variant, "ghost");
  for (const [name, box] of Object.entries(metrics.skillActions)) { const locator = name === "use" ? useSkill : moreSkill; assert.equal(box.size, "sm", `${name} size:te = sm`);
    near(box.height, await ownLengthToken(locator, "--cds-h-control"), `${name} = own (sm) h-control`, 0.5); near(box.height, metrics.buttonTokens.smControl, `${name} = h-control--sm`, 0.5);
    near(box.radius, await ownLengthToken(locator, "--cds-radius"), `${name} radius = own (sm) --cds-radius`, 0.1); }
  assert.equal(metrics.skillActions.use.paint, metrics.buttonTokens.primary);
  assert.equal(await moreSkill.evaluate(node => Math.round(node.getBoundingClientRect().width)), Math.round(metrics.buttonTokens.smControl), "icon-only ⋮ is an sm square");
  metrics.skillActionOrder = await page.locator(".cz-skill-actions").evaluate(node => [...node.querySelectorAll("button")].map(button => button.getAttribute("role") === "switch" ? `switch:${button.getAttribute("aria-label")}:${button.dataset.size}` : button.getAttribute("aria-label") || button.textContent.replace(/[\uE000-\uF8FF]/g, "").trim()));
  // (the aria-hidden Icon glyphs are private-use font characters inside the button's textContent; the label is the rest)
  assert.deepEqual(metrics.skillActionOrder, ["Try in chat", "switch:Enable skill:sm", "More options for fx-alpha"]);
  assert.equal(await detail.getByText("Enabled", { exact: true }).count(), 0, "no visible Enabled label");
  assert.equal(await detail.getByRole("button", { name: /Show in Finder|Use in message/ }).count(), 0);
  checks.push("Drill back = CDS ghost Button size sm (page-shell size:c = Za → sm outside pageLayout; ArrowLeft auto masters, own sm h-control/--cds-radius, flush -sm pad-md, hover paint --cds-fill-ghost-hover without underline); F13 header actions Try in chat (primary) · Enable skill switch (sm, no label) · ⋮ More options (ghost icon-only) at size:te = sm; a disabled skill disables Try in chat at --cds-opacity-disabled with 'Enable skill to try in chat'");
  // F13 c9a7e510b D (drill isModal branch): wrapper "flex flex-col h-full px-6 pb-6 gap-3", header "flex justify-between
  // min-h-14 items-center py-3 -me-6 pe-md" (2.42304.0 logical; LTR computed margin-right -24 / padding-right pad-md), h2 font-large-bold; facts row and the Description block below it.
  metrics.skillDetail = await detail.evaluate(node => { const style = getComputedStyle(node), head = node.querySelector(".cz-skill-head"), headStyle = getComputedStyle(head), title = head.querySelector("h2");
    return { display: style.display, direction: style.flexDirection, gap: parseFloat(style.rowGap), paddingBottom: parseFloat(style.paddingBottom), paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight),
      headMinHeight: parseFloat(headStyle.minHeight), headHeight: head.getBoundingClientRect().height, headPadding: [parseFloat(headStyle.paddingTop), parseFloat(headStyle.paddingBottom)], headMarginRight: parseFloat(headStyle.marginRight), headPaddingRight: parseFloat(headStyle.paddingRight), headAlign: headStyle.alignItems,
      titleWeight: getComputedStyle(title).fontWeight, titleSize: parseFloat(getComputedStyle(title).fontSize), titleOverflow: getComputedStyle(title).textOverflow,
      facts: [...node.querySelectorAll(".cz-skill-facts > div")].map(fact => [...fact.children].map(child => child.textContent)), factLabelColor: getComputedStyle(node.querySelector(".cz-skill-facts span")).color,
      description: node.querySelector(".cz-skill-description h3")?.textContent, infoTip: node.querySelector(".cz-skill-description [data-cds=InfoTip]")?.getAttribute("aria-label"),
      filesMarginTop: parseFloat(getComputedStyle(node.querySelector(".cz-skill-files")).marginTop) }; });
  metrics.detailTokens = { padMd: await lengthToken("--cds-pad-md"), heading: await lengthToken("--cds-font-size-heading"), muted: await token("--cds-text-muted") };
  assert.deepEqual({ ...metrics.skillDetail, facts: undefined, factLabelColor: undefined, headHeight: undefined, titleSize: undefined, titleWeight: undefined },
    { display: "flex", direction: "column", gap: 12, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, headMinHeight: 56, headHeight: undefined, headPadding: [12, 12], headMarginRight: -24, headPaddingRight: metrics.detailTokens.padMd, headAlign: "center",
      titleWeight: undefined, titleSize: undefined, titleOverflow: "ellipsis", facts: undefined, factLabelColor: undefined, description: "Description", infoTip: "More info", filesMarginTop: 8 });
  near(metrics.skillDetail.headHeight, 56, "skill header min-h-14", 0.5); near(metrics.skillDetail.titleSize, metrics.detailTokens.heading, "h2 font-large-bold = heading size", 0.1);
  assert.ok(Number(metrics.skillDetail.titleWeight) >= 500, `font-large-bold weight ${metrics.skillDetail.titleWeight}`);
  assert.deepEqual(metrics.skillDetail.facts, [["Added by", "You"], ["Last updated", shortDate(alphaMtime)]]); assert.equal(metrics.skillDetail.factLabelColor, metrics.detailTokens.muted);
  assert.equal(await detail.locator(".cz-skill-head h2").textContent(), "fx-alpha");
  // B37 shared-frame pw: the InfoTip is a Popover (role dialog "More info") that opens on hover and stays open on a click.
  const infoTip = detail.locator("[data-cds=InfoTip]");
  const infoPopup = page.getByRole("dialog", { name: "More info", exact: true }).filter({ hasText: "Codex uses these descriptions when deciding which skills to use in chat." });
  await infoTip.hover();
  await infoPopup.waitFor();
  await page.mouse.move(2, 2);
  await infoPopup.waitFor({ state: "detached" });
  await infoTip.click();
  await infoPopup.waitFor();
  assert.equal(await infoTip.getAttribute("aria-expanded"), "true");
  await page.mouse.move(2, 2);
  await page.waitForTimeout(400);
  assert.equal(await infoPopup.count(), 1, "a clicked InfoTip stays open after the pointer leaves");
  await page.keyboard.press("Escape");
  await infoPopup.waitFor({ state: "detached" });
  checks.push(`F13 skill detail geometry px 24 / pb 24 / gap 12, header min-h ${metrics.skillDetail.headHeight}px py 12 -me-6 (-24px) pe-md, h2 font-large-bold; facts Added by / Last updated; Description h3 + InfoTip tooltip; files mt-2`);
  await page.locator("[data-skill-file]").waitFor();
  // c2eed normal + shared-16 inherit Markdown: rendered preview by default;
  // the previous raw-text assertion is retained below in the explicit Code mode.
  const fileCard = page.locator('[data-skill-file]');
  const previewMode = fileCard.getByRole('radio', { name: 'Preview', exact: true });
  const codeMode = fileCard.getByRole('radio', { name: 'Code', exact: true });
  assert.equal(await previewMode.getAttribute('aria-checked'), 'true');
  assert.equal(await fileCard.locator('.skf-markdown h1').textContent(), 'fx-alpha');
  assert.equal(await fileCard.locator('.skf-markdown strong').textContent(), 'real skill file');
  assert.deepEqual(await fileCard.locator('.skf-metadata h3').allTextContents(), ['Author', 'Allowed Tools']);
  assert.deepEqual(await fileCard.locator('.skf-metadata p').allTextContents(), ['Fixture author', 'Read,Edit']);
  assert.ok(!(await fileCard.textContent()).includes('Alpha fixture skill'), 'description already shown above file is not repeated');
  metrics.skillPreview = await fileCard.evaluate(node => {
    const style = selector => getComputedStyle(node.querySelector(selector));
    const preview=style('.skf-preview'), modes=style('.skf-modes'), heading=style('.skf-markdown h1');
    return { padding:preview.padding, leading:preview.lineHeight, heading:heading.fontSize,
      gap:style('.skf-markdown').gap, radius:getComputedStyle(node).borderRadius,
      toolbarTop:style('.skf-toolbar').top, toolbarRight:style('.skf-toolbar').right,
      controlHeight:parseFloat(modes.height), buttonWidth:node.querySelector('[role=radio]').getBoundingClientRect().width };
  });
  assert.deepEqual({...metrics.skillPreview, controlHeight:undefined, buttonWidth:undefined}, {
    padding:'20px', leading:'26.4px', heading:'22px', gap:'12px', radius:'12px', toolbarTop:'12px', toolbarRight:'12px', controlHeight:undefined,buttonWidth:undefined,
  });
  assert.equal(metrics.skillPreview.controlHeight, await lengthToken('--cds-h-control--sm'));
  assert.equal(metrics.skillPreview.buttonWidth, metrics.skillPreview.controlHeight-2);
  await page.screenshot({ path:path.join(directory,'skill-file-preview.png') });
  await previewMode.focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await codeMode.getAttribute('aria-checked'), 'true');
  assert.equal(await codeMode.evaluate(node=>document.activeElement===node), true);
  const original = await fs.readFile(skillFile(alphaDir), 'utf8');
  const rawSource = await fileCard.locator('[data-skill-source-line]').evaluateAll(nodes => nodes.map(node =>
    node.firstElementChild?.getAttribute('aria-hidden') === 'true' ? '' : node.textContent).join('\n'));
  assert.equal(rawSource, original, 'Code preserves the complete real SKILL.md, including frontmatter and final newline');
  assert.ok(rawSource.includes('# fx-alpha'), 'retained original raw-content assertion');
  assert.equal(await fileCard.locator('.skf-line-number').last().textContent(), String(original.split('\n').length));
  assert.deepEqual(await fileCard.locator('[data-skill-source-line]').first().evaluate(node=>{
    const s=getComputedStyle(node);return [s.fontSize,s.lineHeight,s.whiteSpace,s.wordBreak];
  }), ['12px','22px','pre-wrap','break-all']);
  assert.equal(await fileCard.getByRole('button',{name:'Copy',exact:true}).count(),0);
  await page.screenshot({ path:path.join(directory,'skill-file-code.png') });
  await page.keyboard.press('ArrowLeft');
  assert.equal(await previewMode.getAttribute('aria-checked'),'true');
  assert.equal(await previewMode.evaluate(node=>document.activeElement===node),true);
  checks.push('Skills real SKILL.md: default rendered Preview, structured metadata without repeated description, exact file typography/control geometry, roving keyboard radio focus; Code preserves complete original bytes and terminal empty line with 12/22 source rows');
  const enabled = page.getByRole("switch", { name: "Enable skill", exact: true });
  await enabled.waitFor();
  assert.equal(await enabled.getAttribute("aria-checked"), "true");
  const before = (await trace()).filter(entry => entry.method === "skills/config/write").length;
  await enabled.click();
  await page.waitForFunction(() => document.querySelector('[role=switch][aria-label="Enable skill"]')?.getAttribute("aria-checked") === "false" && !document.querySelector('[role=switch][aria-label="Enable skill"]').disabled);
  const writes = (await trace()).filter(entry => entry.method === "skills/config/write");
  assert.equal(writes.length - before, 1, "exactly one skills/config/write");
  assert.deepEqual(writes.at(-1).params, { path: skillFile(alphaDir), enabled: false });
  await page.screenshot({ path: path.join(directory, "skill-detail.png") });
  await goBack();
  await page.waitForFunction(path => document.querySelector(`[data-testid="skills-tabbed-list-row"][data-row-id="${CSS.escape(path)}"] [data-cds="Badge"][data-variant="neutral"]`)?.textContent === "Disabled", skillFile(alphaDir));
  await fs.writeFile(path.join(profile, "customize-fail.marker"), "fail");
  await openSkill(skillFile(repoDir));
  await page.waitForFunction(() => document.querySelector('[role=switch][aria-label="Enable skill"]')?.getAttribute("aria-checked") === "true");
  // fx-repo has no SKILL.md on disk → the official "No files to show." copy.
  await page.getByText("No files to show.", { exact: true }).waitFor();
  assert.equal(await page.locator("[data-skill-file]").count(), 0);
  await enabled.click();
  await page.getByRole("alert").filter({ hasText: "fixture refused" }).waitFor();
  assert.equal(await enabled.getAttribute("aria-checked"), "true", "failed toggle reverts");
  await fs.rm(path.join(profile, "customize-fail.marker"));
  // main.cjs "reveal-item" refuses missing files (role=alert, nothing revealed). F13: "Show in Folder" is the ct ⋮ menu item
  // (cfaabd194), and the menu layers above the Settings dialog (its --cds-layer-base) so the item takes the click.
  const showInFolder = async (name) => {
    await page.getByRole("button", { name: `More options for ${name}`, exact: true }).click();
    const menu = page.getByRole("menu", { name: `More options for ${name}`, exact: true });
    await menu.waitFor();
    const layering = await menu.evaluate(node => ({ menu: Number(getComputedStyle(node.closest(".smenu-positioner")).zIndex), dialog: Number(getComputedStyle(document.querySelector(".ss-settings-backdrop")).zIndex),
      items: [...node.querySelectorAll("[role=menuitem]")].map(item => item.textContent.trim()) }));
    assert.ok(layering.menu > layering.dialog, `menu z ${layering.menu} above the Settings backdrop ${layering.dialog}`);
    assert.deepEqual(layering.items.map(item => item.replace(/^\S\s*/u, "")), ["Show in Folder"]);
    await menu.getByRole("menuitem", { name: "Show in Folder", exact: true }).click();
    await menu.waitFor({ state: "detached" });
  };
  await showInFolder("fx-repo");
  // R03 (c856385e2 8Kiu8ZnCtS showSessionFileInFolder refused): the refusal is a danger toast with the catalog copy,
  // above the Settings dialog; main.cjs's raw reason ("no longer exists") is console-only.
  const revealToast = page.locator('[data-cds="Toast"] [role="alertdialog"]').filter({ hasText: "Couldn’t show this file in its folder." });
  await revealToast.waitFor();
  assert.equal(await page.locator('[data-cds="Toast"]').filter({ hasText: "no longer exists" }).count(), 0);
  await revealToast.getByRole("button", { name: "Dismiss", exact: true }).click();
  await revealToast.waitFor({ state: "detached" });
  assert.equal(await app.evaluate(() => globalThis.__skillsMcpReveal), undefined, "a missing skill file is never revealed");
  await goBack();
  assert.equal(await skillsTable.locator(`[data-row-id="${skillFile(repoDir)}"] [data-cds="Badge"][data-variant="neutral"]`).count(), 0);
  await openSkill(skillFile(alphaDir));
  await page.waitForFunction(name => document.querySelector(".cz-skill-detail h2")?.textContent === name, "fx-alpha");
  await showInFolder("fx-alpha");
  const revealed = await (async () => { for (let i = 0; i < 50; i++) { const value = await app.evaluate(() => globalThis.__skillsMcpReveal); if (value) return value; await new Promise(resolve => setTimeout(resolve, 40)); } return undefined; })();
  assert.equal(revealed, skillFile(alphaDir), "Show in Folder reveals the listed skill path");
  await goBack();
  checks.push("Row click drills in (list replaced, ArrowLeft 'Skills' header, flex-col px-6 pb-6 gap-3 body, real SKILL.md file view, 'No files to show.' when the file is missing); the 'Enable skill' switch sends one skills/config/write {path, enabled:false}, the badge follows the response; a refused write shows role=alert and reverts; ⋮ › Show in Folder (menu above the Settings dialog) refuses a missing SKILL.md and reveals an existing one");

  // 5. skills/changed → fresh skills/list within 500 ms.
  const changed = await readSeed();
  for (const entry of changed.skills) for (const item of entry.skills) if (item.path === skillFile(betaDir)) item.enabled = true;
  await writeSeed(changed);
  await emit([{ method: "skills/changed", params: {} }]);
  await page.waitForFunction(path => { const row = document.querySelector(`[data-testid="skills-tabbed-list-row"][data-row-id="${CSS.escape(path)}"]`); return row && !row.querySelector('[data-cds="Badge"][data-variant="neutral"]'); }, skillFile(betaDir));
  const afterChange = await trace();
  const notifyAt = afterChange.filter(entry => entry.method === "notify:skills/changed").at(-1);
  const relist = afterChange.filter(entry => entry.method === "skills/list" && Date.parse(entry.at) >= Date.parse(notifyAt.at)).at(0);
  assert.ok(relist, "skills/list after skills/changed");
  metrics.skillsChangedLatencyMs = Date.parse(relist.at) - Date.parse(notifyAt.at);
  assert.ok(metrics.skillsChangedLatencyMs <= 500, `re-list within 500 ms (${metrics.skillsChangedLatencyMs})`);
  assert.equal(relist.params.forceReload, true);
  checks.push(`skills/changed re-runs skills/list (forceReload) in ${metrics.skillsChangedLatencyMs} ms and the table drops the Disabled badge`);

  // 6. Connectors with the open session.
  await nav().getByRole("button", { name: "Connectors", exact: true }).click();
  const mcpTable = page.getByRole("table", { name: "Connectors", exact: true });
  await mcpTable.locator("tbody tr").nth(3).waitFor();
  assert.deepEqual(await mcpTable.getByRole("columnheader").allTextContents(), ["Connector", "Type", "Status"]);
  // SettingsNavSearch cc011544b:846–920 now loads this catalog before
  // entering the page. Desktop Developer also issues full status requests
  // (main.cjs desktop-settings-read); identify the Customize request by the
  // backend's exact shape, then keep both detail and thread assertions.
  const listWithThread = (await trace()).filter(entry => entry.method === "mcpServerStatus/list" && !Object.hasOwn(entry.params,"limit")).at(-1);
  assert.ok(listWithThread, "Customize issued its own catalog request");
  assert.equal(listWithThread.params.threadId, T); assert.equal(listWithThread.params.detail, "toolsAndAuthOnly");
  const row = name => mcpTable.locator(`tr[data-mcp-name="${name}"]`);
  assert.equal(await row("fx-connected").locator(".cz-status [data-cds=Icon]").count(), 1, "Check icon (src/icons.jsx renders glyph spans, not svg)");
  assert.equal(await row("fx-connected").locator(".cz-status .cz-sr-only").textContent(), "Connected");
  assert.equal(await row("fx-starting").locator('.cz-status[role="status"] .cz-sr-only').textContent(), "Connecting");
  // customize-connectors ca (:2027-2048): Warning sm + tooltip-wrapped action; the explanation is only the
  // tooltip content and span.sr-only, never visible text beside the button.
  for (const [name, status, label, action] of [["fx-failed", "unreachable", "Server not responding", "Reconnect"], ["fx-auth", "sign-in", "Sign-in required", "Sign in"]]) {
    const cell = row(name).locator(`.cz-status[data-status="${status}"]`);
    assert.deepEqual(await cell.evaluate(node => [...node.children].map(child => child.dataset.cds === "Icon" ? `Icon:${child.getAttribute("aria-hidden")}` : child.className)), ["Icon:true", "cz-status-action", "cz-sr-only"]);
    assert.equal(await cell.locator(".cz-sr-only").textContent(), label);
    assert.deepEqual(await labels(cell.locator(".cz-status-action")), [action]);
    await cell.locator(".cz-status-action").getByRole("button", { name: action, exact: true }).waitFor();
  }
  // F13 io (:3737-3820): Type reads "Desktop" (no tools badge); the name cell leads with the 24/16 connector tile.
  assert.deepEqual(await mcpTable.locator("tbody tr td:nth-child(2)").allTextContents(), ["Desktop", "Desktop", "Desktop", "Desktop"]);
  assert.equal(await mcpTable.locator(".cz-badge").count(), 0, "no tools badge");
  metrics.rowTile = await row("fx-connected").locator(".cz-connector-tile").evaluate(tile => { const style = getComputedStyle(tile), rect = tile.getBoundingClientRect();
    return { size: [rect.width, rect.height], border: [style.borderTopWidth, style.borderTopColor], shadow: style.boxShadow, background: style.backgroundColor, radius: style.borderTopLeftRadius, glyph: tile.querySelector("[data-cds=Icon]").style.fontSize, next: tile.nextElementSibling?.textContent }; });
  assert.deepEqual(metrics.rowTile.size, [24, 24]); assert.equal(metrics.rowTile.glyph, "16px"); assert.equal(metrics.rowTile.next, "Fixture Connected");
  // G :555 row name, F13 row a11y.
  assert.equal(await mcpTable.getByRole("row", { name: "View Fixture Connected", exact: true }).count(), 1);
  // Row actions: secondary CDS Buttons at the sm size (.cds-root [data-size=sm] re-maps h-control/radius).
  metrics.rowButtons = { reconnect: await buttonBox(row("fx-failed").getByRole("button", { name: "Reconnect", exact: true })), signIn: await buttonBox(row("fx-auth").getByRole("button", { name: "Sign in", exact: true })),
    add: await buttonBox(page.getByRole("button", { name: "Add custom connector", exact: true })), smControl: await lengthToken("--cds-h-control--sm"), smRadius: await lengthToken("--cds-radius--sm") };
  for (const key of ["reconnect", "signIn"]) { const box = metrics.rowButtons[key]; assert.equal(box.variant, "secondary"); assert.equal(box.size, "sm"); near(box.height, metrics.rowButtons.smControl, `${key} = h-control--sm`, 0.5); near(box.radius, metrics.rowButtons.smRadius, `${key} radius--sm`, 0.1); }
  assert.equal(metrics.rowButtons.add.variant, "primary"); near(metrics.rowButtons.add.height, metrics.tokens.hControl, "Add custom connector = h-control", 0.5); near(metrics.rowButtons.add.radius, metrics.buttonTokens.radius, "Add custom connector radius", 0.1);
  // Pa :2885-2888 Type = sn "w-40" and the Status sn "w-40" (:3610-3640): both 160px; ca is text-warning with
  // gap-xs, and its action fits the fixed Status cell (HANDOFF 0.2.107 recorded the old label truncating there).
  metrics.connectorColumns = await mcpTable.locator("thead th").evaluateAll(cells => cells.map(cell => cell.getBoundingClientRect().width));
  near(metrics.connectorColumns[1], 160, "Type column = w-40", 0.5); near(metrics.connectorColumns[2], 160, "Status column = w-40", 0.5);
  metrics.statusCells = {};
  for (const [name, status, action] of [["fx-failed", "unreachable", "Reconnect"], ["fx-auth", "sign-in", "Sign in"]]) {
    const measured = await row(name).locator("td").nth(2).evaluate((cell, action) => {
      const status = cell.querySelector(".cz-status"), button = [...cell.querySelectorAll("button")].find(node => node.textContent.trim() === action), icon = status.querySelector("[data-cds=Icon]");
      const box = cell.getBoundingClientRect(), style = getComputedStyle(cell), rect = button.getBoundingClientRect();
      return { color: getComputedStyle(status).color, gap: parseFloat(getComputedStyle(status).columnGap), icon: parseFloat(getComputedStyle(icon).fontSize), cellWidth: box.width,
        contentRight: box.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth), cellLeft: box.left, buttonLeft: rect.left, buttonRight: rect.right, buttonWidth: rect.width, buttonScroll: button.scrollWidth, buttonClient: button.clientWidth,
        cellScroll: cell.scrollWidth, cellClient: cell.clientWidth, gapToken: (probe => { Object.assign(probe.style, { position: "absolute", visibility: "hidden", display: "block", width: "var(--cds-gap-xs)" }); status.appendChild(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return width; })(document.createElement("span")) };
    }, action);
    metrics.statusCells[status] = measured;
    assert.equal(measured.color, await token("--cds-text-warning"), `${status} cell = text-warning`);
    near(measured.gap, measured.gapToken, `${status} gap-xs`, 0.01); assert.equal(measured.icon, 16, "Warning sm");
    near(measured.cellWidth, 160, `${status} cell = 160px`, 0.5);
    assert.ok(measured.buttonLeft >= measured.cellLeft && measured.buttonRight <= measured.contentRight + 0.01, `${action} inside the Status cell (${measured.buttonRight} <= ${measured.contentRight})`);
    assert.ok(measured.buttonScroll <= measured.buttonClient && measured.cellScroll <= measured.cellClient, `${action} not clipped`);
  }
  // ca Y content=explanation: hovering the action shows the CDS tooltip.
  await row("fx-failed").getByRole("button", { name: "Reconnect", exact: true }).hover();
  await page.locator('[data-cds="Tooltip"]').filter({ hasText: "Server not responding" }).waitFor();
  await row("fx-auth").getByRole("button", { name: "Sign in", exact: true }).hover();
  await page.locator('[data-cds="Tooltip"]').filter({ hasText: "Sign-in required" }).waitFor();
  await page.mouse.move(2, 2);
  await page.locator('[data-cds="Tooltip"]').filter({ hasText: "Sign-in required" }).waitFor({ state: "detached" });
  await page.screenshot({ path: path.join(directory, "connectors.png") });
  checks.push("Connectors: one row per server, Check + sr-only Connected, role=status spinner + Connecting, ca Warning + Reconnect/Sign in with the explanation only in sr-only and the hover tooltip; Type/Status columns 160px, warning cells text-warning gap-xs with the action inside the cell; list uses the open thread with toolsAndAuthOnly");
  // F13 shared-7 SR uncontained, size sm: the segmented-control metrics (kept for the status filter after the owner segments went).
  const segmentMetrics = async (group) => group.evaluate(node => {
    const thumb = node.querySelector(".ss-segment-thumb"), radios = [...node.querySelectorAll("[role=radio]")], checked = node.querySelector("[role=radio][aria-checked=true]"), unchecked = radios.find(radio => radio !== checked);
    const table = node.parentElement.querySelector("table"), rect = node.getBoundingClientRect();
    return { height: rect.height, gap: getComputedStyle(node).columnGap, padding: getComputedStyle(node).paddingTop, track: getComputedStyle(node).backgroundColor, variant: node.dataset.variant, size: node.dataset.size,
      thumbShadow: getComputedStyle(thumb).boxShadow, thumbBg: getComputedStyle(thumb).backgroundColor, thumbHeight: thumb.getBoundingClientRect().height, thumbLeft: thumb.getBoundingClientRect().left - checked.getBoundingClientRect().left,
      checkedColor: getComputedStyle(checked).color, checkedWeight: getComputedStyle(checked).fontWeight, uncheckedColor: getComputedStyle(unchecked).color,
      radius: parseFloat(getComputedStyle(checked).borderTopLeftRadius), tableGap: table ? table.getBoundingClientRect().top - rect.bottom : null };
  });
  const segmentTokens = { smControl: await lengthToken("--cds-h-control--sm"), border: await token("--cds-border"), thumb: await bgToken("--cds-segmented-control-thumb"),
    primary: await token("--cds-text-primary"), secondary: await token("--cds-text-secondary"), smRadius: await lengthToken("--cds-radius--sm") };
  // F13 customize-connectors :3580-3600: the uncontained sm "Filter by status" sits with the table in a gap-sm block
  // (the table has no mt-sm there); Connected keeps only the connected row, Not connected the other three.
  const statusFilter = page.getByRole("radiogroup", { name: "Filter by status", exact: true });
  assert.deepEqual(await statusFilter.getByRole("radio").allTextContents(), ["All", "Connected", "Not connected"]);
  metrics.statusSegments = await segmentMetrics(statusFilter);
  near(metrics.statusSegments.height, segmentTokens.smControl, "status radiogroup = h-control--sm", 0.5);
  assert.equal(metrics.statusSegments.thumbShadow, `${segmentTokens.border} 0px 0px 0px 1px inset`); assert.equal(metrics.statusSegments.checkedWeight, "400");
  near(metrics.statusSegments.tableGap, await lengthToken("--cds-gap-sm"), "status filter → table = gap-sm", 0.5);
  await statusFilter.getByRole("radio", { name: "Connected", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('table[aria-label="Connectors"] tbody tr').length === 1);
  assert.deepEqual(await mcpTable.locator("tbody tr").evaluateAll(rows => rows.map(row => row.dataset.mcpName)), ["fx-connected"]);
  await statusFilter.getByRole("radio", { name: "Not connected", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('table[aria-label="Connectors"] tbody tr').length === 3);
  assert.deepEqual(await mcpTable.locator("tbody tr").evaluateAll(rows => rows.map(row => row.dataset.mcpName)), ["fx-auth", "fx-failed", "fx-starting"]);
  await statusFilter.getByRole("radio", { name: "All", exact: true }).click();
  await mcpTable.locator("tbody tr").nth(3).waitFor();
  // G :558-561: a keyboard-focused row draws --cds-focus-shadow with no outline; V clears the row fill while an inline button is hovered.
  await statusFilter.getByRole("radio", { name: "All", exact: true }).focus();
  await page.keyboard.press("Tab");
  metrics.rowFocus = await page.evaluate(() => { const row = document.activeElement, cell = row.querySelector("td"), probe = document.createElement("span");
    probe.style.boxShadow = "var(--cds-focus-shadow)"; cell.appendChild(probe); const expected = getComputedStyle(probe).boxShadow; probe.remove();
    return { tag: row.tagName, name: row.getAttribute("aria-label"), shadow: getComputedStyle(row).boxShadow, outline: getComputedStyle(row).outlineStyle, expected }; });
  assert.equal(metrics.rowFocus.tag, "TR"); assert.equal(metrics.rowFocus.name, "View fx-auth");
  assert.equal(metrics.rowFocus.shadow, metrics.rowFocus.expected, "focused row = --cds-focus-shadow"); assert.equal(metrics.rowFocus.outline, "none");
  await row("fx-failed").locator("td").first().hover();
  assert.notEqual(await row("fx-failed").locator("td").first().evaluate(cell => getComputedStyle(cell).backgroundColor), "rgba(0, 0, 0, 0)", "row hover fill");
  await row("fx-failed").getByRole("button", { name: "Reconnect", exact: true }).hover();
  assert.deepEqual(await row("fx-failed").locator("td").evaluateAll(cells => cells.map(cell => getComputedStyle(cell).backgroundColor)), ["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"], "hovering the inline Reconnect clears the row fill");
  await page.mouse.move(2, 2);
  await page.locator('[data-cds="Tooltip"]').filter({ hasText: "Server not responding" }).waitFor({ state: "detached" });
  checks.push(`F13 connectors: Type 'Desktop', 24×24 row tile, 'View {name}' rows; uncontained sm 'Filter by status' (${metrics.statusSegments.height}px, table gap-sm below) filters Connected → fx-connected and Not connected → the other three; a Tab-focused row draws --cds-focus-shadow without outline and hovering its Reconnect clears the row fill`);
  // "Connectors that stopped working" card (customize-connectors :2404-2490) is the only home of Reconnect all.
  assert.equal(await page.getByRole("button", { name: "Reconnect all", exact: true }).count(), 0, "no bare Reconnect all in the page header");
  const brokenCard = page.getByRole("region", { name: "Connectors that stopped working", exact: true });
  await brokenCard.waitFor();
  assert.deepEqual(await labels(brokenCard.locator("h3")), ["2 connectors stopped working"]);
  assert.deepEqual(await brokenCard.locator("li").evaluateAll(items => items.map(item => item.getAttribute("data-broken-name"))), ["fx-auth", "fx-failed"]);
  // ba heading (:2300-2530) "-mx-pad-lg … border-b px-lg pb-lg"; Ca rows (:2644-2750): 24px connector tile (_r size 24 /
  // imageSize 16), name text-primary, reason text-secondary flex-1 truncate, trailing secondary sm "Retry" for unreachable
  // (Si :1674-1692 "Server not responding"); signIn keeps the honest "Sign-in required" / "Sign in".
  metrics.brokenCard = await brokenCard.evaluate(card => {
    const head = card.querySelector(".cz-broken-head"), headStyle = getComputedStyle(head), cardBox = card.getBoundingClientRect(), headBox = head.getBoundingClientRect();
    const cardStyle = getComputedStyle(card);
    const padLg = (probe => { Object.assign(probe.style, { position: "absolute", visibility: "hidden", display: "block", width: "var(--cds-pad-lg)" }); card.appendChild(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return width; })(document.createElement("span"));
    return { padLg, headPaddingBottom: parseFloat(headStyle.paddingBottom), headBorder: parseFloat(headStyle.borderBottomWidth),
      headInset: [headBox.left - cardBox.left - parseFloat(cardStyle.borderLeftWidth), cardBox.right - parseFloat(cardStyle.borderRightWidth) - headBox.right],
      rows: [...card.querySelectorAll("li")].map(item => { const tile = item.querySelector(".cz-connector-tile"), name = item.querySelector(".cz-broken-name"), reason = item.querySelector(".cz-broken-reason"), button = item.querySelector("button");
        const tileBox = tile.getBoundingClientRect();
        return { name: item.dataset.brokenName, tile: [tileBox.width, tileBox.height], glyph: tile.querySelector("[data-cds=Icon]").style.fontSize, warningInRow: !!item.querySelector(".cz-broken-icon"),
          nameColor: getComputedStyle(name).color, reason: reason.textContent, reasonColor: getComputedStyle(reason).color, reasonFlex: getComputedStyle(reason).flexGrow, reasonOverflow: getComputedStyle(reason).textOverflow,
          button: [button.dataset.variant, button.dataset.size, button.textContent.trim()] }; }) };
  });
  near(metrics.brokenCard.headPaddingBottom, metrics.brokenCard.padLg, "card heading pb-lg", 0.01); assert.equal(metrics.brokenCard.headBorder, 1);
  for (const inset of metrics.brokenCard.headInset) near(inset, 0, "-mx-pad-lg heading spans the card", 0.5);
  const [primaryText, secondaryText] = [await token("--cds-text-primary"), await token("--cds-text-secondary")];
  assert.deepEqual(metrics.brokenCard.rows.map(item => [item.name, item.tile, item.glyph, item.warningInRow, item.nameColor === primaryText, item.reason, item.reasonColor === secondaryText, item.reasonFlex, item.reasonOverflow, item.button]),
    [["fx-auth", [24, 24], "16px", false, true, "Sign-in required", true, "1", "ellipsis", ["secondary", "sm", "Sign in"]], ["fx-failed", [24, 24], "16px", false, true, "Server not responding", true, "1", "ellipsis", ["secondary", "sm", "Retry"]]]);
  assert.equal(await brokenCard.getByRole("button", { name: /^Show (all|less)$/ }).count(), 0, "no collapse at 5 rows or fewer");
  // F13: the row tile is the card's tile (one .cz-connector-tile rule): same border and shadow.
  metrics.cardTile = await brokenCard.locator(".cz-connector-tile").first().evaluate(tile => { const style = getComputedStyle(tile); return { border: [style.borderTopWidth, style.borderTopColor], shadow: style.boxShadow, background: style.backgroundColor, radius: style.borderTopLeftRadius }; });
  assert.deepEqual(metrics.cardTile, { border: metrics.rowTile.border, shadow: metrics.rowTile.shadow, background: metrics.rowTile.background, radius: metrics.rowTile.radius });
  await brokenCard.screenshot({ path: path.join(directory, "connectors-broken-card.png") });
  // Reconnect all → reload then list.
  count = (await trace()).length;
  await brokenCard.getByRole("button", { name: "Reconnect all 1 connector whose sign-in expired", exact: true }).click();
  const afterReconnect = await waitTrace(entries => entries.slice(count).some(entry => entry.method === "mcpServerStatus/list"), "reconnect all re-list");
  assert.deepEqual(afterReconnect.slice(count).filter(entry => ["config/mcpServer/reload", "mcpServerStatus/list"].includes(entry.method)).map(entry => entry.method), ["config/mcpServer/reload", "mcpServerStatus/list"]);
  // Row keydown must not swallow a nested button (page shell G :540-548): Enter on the in-row Reconnect
  // reconnects that server and does not select the row.
  await page.waitForFunction(() => { const button = document.querySelector('tr[data-mcp-name="fx-failed"] button'); return !!button && !button.disabled; });
  await mcpTable.locator('tr[data-mcp-name="fx-failed"]').getByRole("button", { name: "Reconnect", exact: true }).focus();
  await page.waitForFunction(() => document.activeElement === document.querySelector('tr[data-mcp-name="fx-failed"] button'));
  count = (await trace()).length;
  await page.keyboard.press("Enter");
  await waitTrace(entries => entries.slice(count).some(entry => entry.method === "config/mcpServer/reload"), "Enter on the in-row Reconnect button");
  assert.equal(await page.locator('[data-cz-detail="connector"]').count(), 0, "the row keydown handler did not steal the button's activation");
  checks.push("Reconnect all lives only in the 'Connectors that stopped working' card (2 rows, official aria-label with the expired count); Enter on an in-row Reconnect activates the button instead of selecting the row");
  // Sign in → oauth login, external open exactly once, completion re-lists.
  count = (await trace()).length;
  await row("fx-auth").getByRole("button", { name: "Sign in", exact: true }).click();
  // R04: the source shows no "finish signing in" notice (its feedback is toasts, and only on failure).
  await waitTrace(entries => entries.slice(count).some(entry => entry.method === "mcpServer/oauth/login"), "oauth login");
  await page.waitForFunction(() => [...document.querySelectorAll('[data-cz-page="connectors"] button')].every(button => !button.disabled || button.matches('[role=switch], [data-connector-setting] *, .cz-tool-list *')));
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(.cz-info,.cz-error,[role=alert])').count(), 0, "no inline notice paragraphs");
  const login = (await trace()).slice(count).find(entry => entry.method === "mcpServer/oauth/login");
  assert.deepEqual(login.params, { name: "fx-auth", threadId: T });
  for (const until = Date.now() + 8000; (await app.evaluate(() => globalThis.__skillsMcpExternal.length)) < 1 && Date.now() < until;) await new Promise(resolve => setTimeout(resolve, 40));
  metrics.externalOpens = await app.evaluate(() => globalThis.__skillsMcpExternal);
  assert.deepEqual(metrics.externalOpens, ["https://example.invalid/oauth?server=fx-auth"], "authorizationUrl passed to the external opener exactly once");
  assert.equal(await page.evaluate(() => location.href.includes("example.invalid")), false);
  count = (await trace()).length;
  await emit([{ method: "mcpServer/oauthLogin/completed", params: { name: "fx-auth", threadId: T, success: true } }]);
  await waitTrace(entries => entries.slice(count).some(entry => entry.method === "mcpServerStatus/list"), "re-list after oauthLogin/completed");
  // Startup notification patches the row and re-lists on ready.
  count = (await trace()).length;
  await emit([{ method: "mcpServer/startupStatus/updated", params: { threadId: T, name: "fx-starting", status: "ready", error: null, failureReason: null } }]);
  await page.waitForFunction(() => document.querySelector('tr[data-mcp-name="fx-starting"]')?.getAttribute("data-mcp-status") === "connected");
  await waitTrace(entries => entries.slice(count).some(entry => entry.method === "mcpServerStatus/list"), "re-list after startup ready");
  // ba va = 5 (:2302) and the Show all / Show less ghost toggle (:2516-2530): four more failing servers make six
  // broken rows (sorted fx-auth, fx-down-1..4, fx-failed), so fx-failed is behind Show all. The in-table Reconnect
  // re-lists; card Retry (Ca :2733-2748) sends the same reload + list. `te && !G && H(!1)` collapses again once the
  // count is back to five or fewer, so growing past five later starts collapsed.
  const baseSeed = await readSeed();
  const withDown = n => ({ ...baseSeed, mcp: { servers: [...baseSeed.mcp.servers, ...Array.from({ length: n }, (_, index) => ({ name: `fx-down-${index + 1}`, runtimeStatus: "failed", tools: {}, authStatus: "unsupported" }))] } });
  const brokenNames = () => brokenCard.locator("li").evaluateAll(items => items.map(item => item.getAttribute("data-broken-name")));
  // The connector settings controls (on/off switch, approval selects) stay disabled for a connector defined outside
  // the user's own config, so only the action buttons signal the end of a reload.
  const reloadConnectors = async (label, click) => { await page.waitForFunction(() => [...document.querySelectorAll('[data-cz-page="connectors"] button')].every(button => !button.disabled || button.matches('[role=switch], [data-connector-setting] *, .cz-tool-list *')));
    count = (await trace()).length; await click(); await waitTrace(entries => entries.slice(count).some(entry => entry.method === "mcpServerStatus/list"), label);
    await page.waitForFunction(() => [...document.querySelectorAll('[data-cz-page="connectors"] button')].every(button => !button.disabled || button.matches('[role=switch], [data-connector-setting] *, .cz-tool-list *'))); };
  await writeSeed(withDown(4));
  await reloadConnectors("re-list with six broken", () => row("fx-failed").getByRole("button", { name: "Reconnect", exact: true }).click());
  await brokenCard.locator("h3").filter({ hasText: "6 connectors stopped working" }).waitFor();
  assert.deepEqual(await brokenNames(), ["fx-auth", "fx-down-1", "fx-down-2", "fx-down-3", "fx-down-4"]);
  const showAll = brokenCard.getByRole("button", { name: "Show all", exact: true }), listId = await brokenCard.locator("ul").getAttribute("id");
  metrics.brokenToggle = await showAll.evaluate(node => ({ variant: node.dataset.variant, size: node.dataset.size, flush: node.dataset.flush, expanded: node.getAttribute("aria-expanded"), controls: node.getAttribute("aria-controls"),
    glyph: node.querySelector(".ssb-content [data-cds=Icon]")?.textContent.codePointAt(0), alignSelf: getComputedStyle(node).alignSelf, afterList: node.previousElementSibling?.tagName }));
  assert.deepEqual(metrics.brokenToggle, { variant: "ghost", size: "sm", flush: "start", expanded: "false", controls: listId, glyph: 57383, alignSelf: "flex-start", afterList: "UL" }, "ghost CaretDown Show all controlling the list");
  await brokenCard.screenshot({ path: path.join(directory, "connectors-broken-collapsed.png") });
  await showAll.click();
  const showLess = brokenCard.getByRole("button", { name: "Show less", exact: true });
  await showLess.waitFor();
  assert.equal(await showLess.getAttribute("aria-expanded"), "true");
  assert.equal(await showLess.evaluate(node => node.querySelector(".ssb-content [data-cds=Icon]")?.textContent.codePointAt(0)), 57387, "CaretUp");
  assert.deepEqual(await brokenNames(), ["fx-auth", "fx-down-1", "fx-down-2", "fx-down-3", "fx-down-4", "fx-failed"]);
  await brokenCard.screenshot({ path: path.join(directory, "connectors-broken-expanded.png") });
  await writeSeed(withDown(2));
  await reloadConnectors("card Retry re-list", () => brokenCard.locator('li[data-broken-name="fx-failed"]').getByRole("button", { name: "Retry", exact: true }).click());
  assert.deepEqual((await trace()).slice(count).filter(entry => ["config/mcpServer/reload", "mcpServerStatus/list"].includes(entry.method)).map(entry => entry.method), ["config/mcpServer/reload", "mcpServerStatus/list"], "Retry = reload then list");
  await brokenCard.locator("h3").filter({ hasText: "4 connectors stopped working" }).waitFor();
  assert.equal(await brokenCard.getByRole("button", { name: /^Show (all|less)$/ }).count(), 0);
  await writeSeed(withDown(4));
  await reloadConnectors("re-list back to six", () => brokenCard.locator('li[data-broken-name="fx-failed"]').getByRole("button", { name: "Retry", exact: true }).click());
  await brokenCard.locator("h3").filter({ hasText: "6 connectors stopped working" }).waitFor();
  assert.equal(await brokenCard.getByRole("button", { name: "Show all", exact: true }).getAttribute("aria-expanded"), "false", "collapsed again after dropping to five or fewer");
  assert.equal(await brokenCard.locator("li").count(), 5);
  await writeSeed(baseSeed);
  await reloadConnectors("restore the four fixture servers", () => row("fx-failed").getByRole("button", { name: "Reconnect", exact: true }).click());
  await brokenCard.locator("h3").filter({ hasText: "2 connectors stopped working" }).waitFor();
  checks.push("Stopped-working card: rows are Ca (24px connector tile, primary name, secondary truncating reason, Retry for unreachable, honest Sign-in required / Sign in), heading pb-lg spans the card; six rows show five plus a ghost CaretDown 'Show all' (aria-expanded/aria-controls = list id) that expands to 'Show less', card Retry reloads then lists, and dropping to four then back to six starts collapsed again");
  checks.push("Reconnect all sends config/mcpServer/reload then mcpServerStatus/list; Sign in sends mcpServer/oauth/login {name:fx-auth} and opens the authorizationUrl externally once; oauthLogin/completed and startup ready re-list (row patched first)");
  // F13 connector drill (customize-connectors :3164-3178 + c08e79e85 En): a row click replaces the list (no aside), Back
  // restores it and its scroll position; the drill's Reconnect actions reuse config/mcpServer/reload then mcpServerStatus/list.
  const connectorsBody = page.locator('[data-cz-page="connectors"] .cz-page-body');
  const connectorDrill = page.locator('[data-cz-detail="connector"]');
  const backToConnectors = async () => { await page.locator(".cz-drill-header").getByRole("button", { name: "Connectors", exact: true }).click(); await mcpTable.locator("tbody tr").nth(3).waitFor(); };
  const reloadMethods = async () => (await trace()).slice(count).filter(entry => ["config/mcpServer/reload", "mcpServerStatus/list"].includes(entry.method)).map(entry => entry.method);
  const scrolled = await connectorsBody.evaluate(node => { node.scrollTop = node.scrollHeight; return node.scrollTop; });
  await row("fx-connected").click();
  await connectorDrill.waitFor();
  assert.equal(await mcpTable.count(), 0, "the drill replaces the list");
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(.cz-header,aside,.cz-broken,[role=radiogroup])').count(), 0);
  assert.deepEqual(await labels(page.locator(".cz-drill-header [data-cds=Button]")), ["Connectors"]);
  metrics.connectorDrill = await connectorDrill.locator('[data-connector-view="connected"]').evaluate(node => { const head = node.firstElementChild, style = getComputedStyle(node), headStyle = getComputedStyle(head), tile = head.querySelector(".cz-connector-tile").getBoundingClientRect();
    return { padding: [parseFloat(style.paddingLeft), parseFloat(style.paddingRight), parseFloat(style.paddingBottom)], headMinHeight: parseFloat(headStyle.minHeight), headPadding: [parseFloat(headStyle.paddingTop), parseFloat(headStyle.paddingBottom)],
      tile: [tile.width, tile.height], title: head.querySelector("h2").textContent, tools: [...node.querySelectorAll(".cz-tool-list li")].map(item => item.dataset.tool ?? item.textContent),
      actions: [...head.querySelectorAll("button")].map(button => `${button.dataset.variant ?? button.getAttribute("role")}:${button.getAttribute("aria-label") || button.textContent.trim()}`) }; });
  assert.deepEqual(metrics.connectorDrill, { padding: [24, 24, 24], headMinHeight: 56, headPadding: [12, 12], tile: [24, 24], title: "Fixture Connected", tools: ["one", "two"],
    // A Codex core's connector settings (config/read mcp_servers): the on/off switch sits before Reconnect, and each tool
    // row carries its approval select and switch (data-tool holds the name).
    actions: ["switch:Turn Fixture Connected on or off", "secondary:Reconnect", "ghost:More options for Fixture Connected"] });
  // R04 c2e7fd468 LocalConfig in En's mt-4 slot (c08e79e85), from desktop-settings-read mcpDefinitions over the fixture's
  // config/read mcp_servers: default-open Command / Arguments / Environment variables, env names masked, never the value.
  const localConfig = connectorDrill.locator("[data-cz-local-config]");
  await localConfig.waitFor();
  assert.deepEqual(await labels(localConfig.locator(".source-disclosure-trigger")), ["Command", "Arguments", "Environment variables"]);
  assert.deepEqual(await localConfig.locator(".source-disclosure-trigger").evaluateAll(nodes => nodes.map(node => node.getAttribute("aria-expanded"))), ["true", "true", "true"]);
  metrics.localConfig = await localConfig.evaluate(node => { const codes = [...node.querySelectorAll("code")], style = getComputedStyle(codes[0]), drill = node.closest("[data-connector-view]");
    return { codes: codes.map(code => code.textContent), margin: parseFloat(getComputedStyle(node).marginTop), mt4: parseFloat(getComputedStyle(document.documentElement).fontSize), radius: parseFloat(style.borderTopLeftRadius), mono: style.fontFamily,
      afterDescription: !drill.querySelector("p.font-base.text-secondary") || !!(drill.querySelector("p.font-base.text-secondary").compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeTools: !!(node.compareDocumentPosition(drill.querySelector(".cz-tool-list")) & Node.DOCUMENT_POSITION_FOLLOWING) }; });
  assert.deepEqual(metrics.localConfig.codes, ["npx", "-y fx-connected-server", "FX_TOKEN=••••••••"], "Command equals the fixture command; env name only");
  near(metrics.localConfig.margin, metrics.localConfig.mt4, "mt-4 = 4 × --spacing (.25rem)", 0.01); assert.ok(metrics.localConfig.afterDescription && metrics.localConfig.beforeTools, "between the description and the tools");
  assert.match(metrics.localConfig.mono, /mono/i, "font-mono code block");
  assert.equal((await connectorDrill.textContent()).includes("fixture-secret-value"), false, "env values never reach the renderer");
  await page.screenshot({ path: path.join(directory, "connector-drill-local-config.png") });
  await reloadConnectors("drill Reconnect", () => connectorDrill.getByRole("button", { name: "Reconnect", exact: true }).click());
  assert.deepEqual(await reloadMethods(), ["config/mcpServer/reload", "mcpServerStatus/list"], "drill Reconnect = reload then list");
  // R04 c08e79e85 Sn addSuccess: the connected drill's reload reports "Tools list refreshed" as a toast, never a page line.
  const refreshedToast = page.locator('[data-cds="Toast"] .source-toast-card[data-variant="neutral"]').filter({ hasText: "Tools list refreshed" });
  await refreshedToast.waitFor();
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(.cz-info,.cz-error,[role=alert])').count(), 0);
  await refreshedToast.getByRole("button", { name: "Dismiss", exact: true }).click();
  await refreshedToast.waitFor({ state: "detached" });
  await backToConnectors();
  near(await connectorsBody.evaluate(node => node.scrollTop), scrolled, "Back restores the list scroll position", 1);
  await row("fx-failed").click();
  const failedView = connectorDrill.locator('[data-connector-view="disconnected"]');
  await failedView.waitFor();
  metrics.failedDrill = await failedView.evaluate(node => { const issue = node.querySelector("[data-connection-issue]"), tile = node.querySelector(".cz-connector-tile").getBoundingClientRect();
    return { issue: issue?.textContent.replace(/^\S/u, ""), issueColor: issue && getComputedStyle(issue).color, message: node.querySelector("p").textContent, tile: [tile.width, tile.height],
      primary: [...node.querySelectorAll('[data-variant="primary"]')].map(button => button.textContent.trim()) }; });
  assert.deepEqual({ ...metrics.failedDrill, issueColor: undefined }, { issue: "Connection issue", issueColor: undefined, message: "Your connection to fx-failed stopped working. Reconnect to continue.", tile: [56, 56], primary: ["Reconnect"] });
  assert.equal(metrics.failedDrill.issueColor, await token("--cds-text-warning"));
  await reloadConnectors("drill not-connected Reconnect", () => failedView.getByRole("button", { name: "Reconnect", exact: true }).click());
  assert.deepEqual(await reloadMethods(), ["config/mcpServer/reload", "mcpServerStatus/list"], "not-connected Reconnect = reload then list");
  await backToConnectors();
  await row("fx-auth").click();
  await connectorDrill.getByText("You’re not connected to fx-auth yet.", { exact: true }).waitFor();
  assert.equal(await connectorDrill.getByRole("button", { name: "Sign in", exact: true }).getAttribute("data-variant"), "primary");
  assert.equal(await connectorDrill.getByText("Connection issue", { exact: true }).count(), 0);
  await backToConnectors();
  await row("fx-starting").click();
  await connectorDrill.locator('[data-connector-view="checking"] [role=status]').getByText("Checking connection…", { exact: true }).waitFor();
  await page.screenshot({ path: path.join(directory, "connector-drill-checking.png") });
  await backToConnectors();
  checks.push("F13 connector drill: a row click replaces the list with the 'Connectors' drill (no aside/table/header); connected = px-6 pb-6, 56px header, 24px tile, tools one/two, secondary Reconnect + ⋮; failing = 56px tile, 'Connection issue' in text-warning, stopped-working copy, primary Reconnect; sign-in = not-connected copy + primary Sign in; starting = 'Checking connection…'; both Reconnects send reload then list; Back restores the list and its scroll position");
  // Add custom connector: invalid name rejected client-side, valid form writes config then reloads.
  await page.getByRole("button", { name: "Add custom connector", exact: true }).click();
  // The official custom connector dialog: URL first; a local server is the Command segment.
  const form = page.getByRole("dialog", { name: "Add custom connector", exact: true }).getByRole("form", { name: "Add custom connector", exact: true });
  await form.getByRole("radio", { name: "Command", exact: true }).click();
  await form.getByRole("textbox", { name: "Connector name" }).fill("bad name!");
  await form.getByRole("textbox", { name: "Command" }).fill("npx");
  count = (await trace()).length;
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await form.getByRole("alert").waitFor();
  assert.equal((await trace()).slice(count).filter(entry => entry.method === "config/batchWrite").length, 0, "invalid name sends nothing");
  // An existing mcp_servers.<name> must never be upserted over: the CLI shares its config.toml. The copy names the
  // running core's real file, this launch's CODEX_HOME (profile/codex-home), not ~/.codex.
  await form.getByRole("textbox", { name: "Connector name" }).fill("fx-connected");
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await form.getByRole("alert").filter({ hasText: /already in \S*\/codex-home\/config\.toml/ }).waitFor();
  assert.equal((await trace()).slice(count).filter(entry => entry.method === "config/batchWrite").length, 0, "a duplicate name sends nothing");
  await form.getByRole("textbox", { name: "Connector name" }).fill("fx-new");
  await form.getByRole("textbox", { name: "Arguments" }).fill("-y demo");
  await form.getByRole("button", { name: "Add", exact: true }).click();
  await mcpTable.locator('tr[data-mcp-name="fx-new"]').waitFor();
  const adds = (await trace()).slice(count).filter(entry => ["config/batchWrite", "config/mcpServer/reload", "mcpServerStatus/list"].includes(entry.method));
  assert.deepEqual(adds.map(entry => entry.method), ["config/batchWrite", "config/mcpServer/reload", "mcpServerStatus/list"]);
  assert.deepEqual(adds[0].params, { edits: [{ keyPath: "mcp_servers.fx-new", value: { command: "npx", args: ["-y", "demo"] }, mergeStrategy: "upsert" }], reloadUserConfig: true });
  checks.push("Add custom connector: 'bad name!' and the already-configured 'fx-connected' are rejected with role=alert and no request; fx-new npx -y demo sends config/batchWrite (upsert, reloadUserConfig) then config/mcpServer/reload and re-lists");
  // F13 la default branch: the never-started fx-new shows a secondary sm "Connect" that reloads then re-lists.
  const connectNew = mcpTable.locator('tr[data-mcp-name="fx-new"]').getByRole("button", { name: "Connect", exact: true });
  metrics.connectButton = await buttonBox(connectNew);
  assert.equal(metrics.connectButton.variant, "secondary"); assert.equal(metrics.connectButton.size, "sm");
  await reloadConnectors("row Connect", () => connectNew.click());
  assert.deepEqual(await reloadMethods(), ["config/mcpServer/reload", "mcpServerStatus/list"], "Connect = reload then list");
  assert.equal(await connectorDrill.count(), 0, "Connect does not open the row");
  // Remove through the drill's ⋮ menu (c08e79e85 Sn danger item) and the c5fb58ef0 ConfirmationDialog.
  await mcpTable.locator('tr[data-mcp-name="fx-new"]').click();
  await connectorDrill.getByText("You’re not connected to fx-new yet.", { exact: true }).waitFor();
  await connectorDrill.getByRole("button", { name: "More options for fx-new", exact: true }).click();
  const newMenu = page.getByRole("menu", { name: "More options for fx-new", exact: true });
  const removeItem = newMenu.getByRole("menuitem", { name: "Remove connector", exact: true });
  assert.equal(await removeItem.getAttribute("data-variant"), "danger");
  await removeItem.click();
  await newMenu.waitFor({ state: "detached" });
  count = (await trace()).length;
  // R04: "Remove {serverName}?" alert dialog layered above the z-500 Settings backdrop, initial focus on Remove.
  const removeDialog = page.getByRole("alertdialog", { name: "Remove fx-new?", exact: true });
  await removeDialog.waitFor();
  assert.equal(await connectorDrill.getByRole("group", { name: "Confirm removal" }).count(), 0, "no inline confirmation card");
  const confirmRemove = removeDialog.getByRole("button", { name: "Remove", exact: true });
  await page.waitForFunction(() => document.activeElement?.closest('[data-cds="ConfirmationDialog"]') && document.activeElement.textContent.trim() === "Remove");
  metrics.removeDialog = await removeDialog.evaluate(node => ({ cds: node.dataset.cds, z: Number(getComputedStyle(node.closest(".sdlg-backdrop")).zIndex), settings: Number(getComputedStyle(document.querySelector(".ss-settings-backdrop")).zIndex),
    body: node.querySelector(".sdlg-description")?.textContent ?? "" }));
  assert.equal(metrics.removeDialog.cds, "ConfirmationDialog");
  assert.ok(metrics.removeDialog.z > metrics.removeDialog.settings, `dialog z ${metrics.removeDialog.z} above the Settings backdrop ${metrics.removeDialog.settings}`);
  assert.doesNotMatch(metrics.removeDialog.body, /Claude/); assert.match(metrics.removeDialog.body, /You can still continue previous chats that reference fx-new content\./);
  metrics.removeConfirm = await buttonBox(confirmRemove);
  assert.equal(metrics.removeConfirm.variant, "danger", "c5fb58ef0 confirmVariant danger"); assert.equal(metrics.removeConfirm.paint, await bgToken("--cds-fill-danger"));
  assert.equal(metrics.removeConfirm.color, await token("--cds-on-danger"));
  await page.screenshot({ path: path.join(directory, "connector-remove-dialog.png") });
  await confirmRemove.click();
  await mcpTable.locator('tr[data-mcp-name="fx-new"]').waitFor({ state: "detached" });
  await removeDialog.waitFor({ state: "detached" });
  const removal = (await trace()).slice(count).find(entry => entry.method === "config/batchWrite");
  assert.deepEqual(removal.params.edits, [{ keyPath: "mcp_servers.fx-new", value: null, mergeStrategy: "replace" }]);
  // The outcome is a toast, not an inline "Removed …" line in the page.
  const removedToast = page.locator('[data-cds="Toast"] .source-toast-card').filter({ hasText: /Removed fx-new from \S*\/codex-home\/config\.toml\./ });
  await removedToast.waitFor();
  assert.equal(await page.locator('[data-cz-page="connectors"]').getByText(/Removed fx-new/).count(), 0);
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(.cz-info,.cz-error,[role=alert])').count(), 0);
  await removedToast.getByRole("button", { name: "Dismiss", exact: true }).click();
  await removedToast.waitFor({ state: "detached" });
  checks.push(`F13 a never-started row's secondary sm Connect sends reload then list; R04 ⋮ › Remove connector (danger item) opens the c5fb58ef0 'Remove fx-new?' ConfirmationDialog (z ${metrics.removeDialog.z} over the Settings backdrop ${metrics.removeDialog.settings}, focus on Remove), which writes mcp_servers.fx-new = null (replace), returns to the list and reports a toast instead of a page line`);
  // F13 Ee (page shell :566-612): with no connectors the NodeShapes empty state fills the connectors body and centres its
  // pictogram, copy and actions; the pictogram → copy gap is --cds-gap-lg. The search no-match case is a plain p.
  const keptSeed = await readSeed();
  await writeSeed({ ...keptSeed, mcp: { servers: [] } });
  count = (await trace()).length;
  await emit([{ method: "mcpServer/startupStatus/updated", params: { threadId: T, name: "fx-connected", status: "ready", error: null, failureReason: null } }]);
  const emptyConnectors = page.locator('[data-cz-page="connectors"] [data-cz-empty]');
  await emptyConnectors.waitFor();
  metrics.connectorsEmpty = await emptyConnectors.evaluate(node => {
    const body = node.closest(".cz-connectors-body"), page = node.closest(".cz-page-body"), bodyRect = body.getBoundingClientRect(), bodyStyle = getComputedStyle(body), pageRect = page.getBoundingClientRect(), pageStyle = getComputedStyle(page);
    const rect = node.getBoundingClientRect(), svg = node.querySelector("svg[data-cds=Pictogram]").getBoundingClientRect(), copy = node.querySelector("p"), last = node.lastElementChild.getBoundingClientRect();
    const gapLg = (probe => { probe.style.width = "var(--cds-gap-lg)"; probe.style.display = "block"; probe.style.position = "absolute"; node.appendChild(probe); const width = probe.getBoundingClientRect().width; probe.remove(); return width; })(document.createElement("span"));
    // Nothing but an open Add form precedes Ee in the gap-lg body (R04: outcomes are toasts).
    const above = node.previousElementSibling ? node.previousElementSibling.getBoundingClientRect().bottom + gapLg : bodyRect.top + parseFloat(bodyStyle.paddingTop);
    return { top: rect.top - above, bottom: (pageRect.bottom - parseFloat(pageStyle.paddingBottom)) - rect.bottom, centre: (rect.top + rect.bottom) / 2 - (svg.top + last.bottom) / 2,
      svg: [svg.width, svg.height], gap: copy.getBoundingClientRect().top - svg.bottom, gapLg, copy: copy.textContent, copyWidth: copy.getBoundingClientRect().width, copyColor: getComputedStyle(copy).color, role: node.getAttribute("role"),
      actions: [...node.querySelectorAll("button")].map(button => `${button.dataset.variant}:${button.textContent.trim()}`), table: !!page.querySelector("table"), filter: !!page.querySelector("[role=radiogroup]") };
  });
  near(metrics.connectorsEmpty.top, 0, "Ee starts at the connectors body content box (after any notice + gap-lg)", 1); near(metrics.connectorsEmpty.bottom, 0, "Ee fills the page body (flex-1)", 1);
  near(metrics.connectorsEmpty.centre, 0, "pictogram, copy and actions are centred", 1);
  assert.deepEqual(metrics.connectorsEmpty.svg, [96, 96]); near(metrics.connectorsEmpty.gap, metrics.connectorsEmpty.gapLg, "pictogram → copy = --cds-gap-lg", 0.5);
  assert.ok(metrics.connectorsEmpty.copyWidth <= 320.5, `copy max-w-xs (${metrics.connectorsEmpty.copyWidth})`);
  assert.equal(metrics.connectorsEmpty.copy, "Unlock more with Codex when you connect your team’s tools."); assert.equal(metrics.connectorsEmpty.copyColor, secondaryText);
  assert.equal(metrics.connectorsEmpty.role, null); assert.deepEqual(metrics.connectorsEmpty.actions, ["secondary:Add custom connector"]);
  assert.equal(metrics.connectorsEmpty.table, false); assert.equal(metrics.connectorsEmpty.filter, false, "no status filter without connectors");
  await page.screenshot({ path: path.join(directory, "connectors-empty.png") });
  await writeSeed(keptSeed);
  await emit([{ method: "mcpServer/startupStatus/updated", params: { threadId: T, name: "fx-connected", status: "ready", error: null, failureReason: null } }]);
  await mcpTable.locator("tbody tr").nth(3).waitFor();
  checks.push(`F13 empty Connectors = Ee: NodeShapes 96px pictogram, ${metrics.connectorsEmpty.gap}px (--cds-gap-lg) to the secondary max-w-xs copy, secondary Add custom connector; flex-1 and centred in the body, no live region, no filter`);

  // 7. Plugins.
  await nav().getByRole("button", { name: "Plugins", exact: true }).click();
  // B24: c6a2a31c4 "Your plugins" tabbed list (ccea1f474 Ul rows) with the Show filter and sort in the header toolbar.
  const pluginTable = page.getByTestId("plugins-tabbed-list-mine");
  const pluginRow = (id) => pluginTable.locator(`[data-testid="plugins-tabbed-list-row"][data-plugin-id="${id}"]`);
  const openPlugin = (id) => pluginRow(id).locator(":scope > button").click();
  await pluginTable.locator('[data-testid="plugins-tabbed-list-row"]').nth(1).waitFor();
  const pluginsHeader = page.locator('[data-cz-page="plugins"] .cz-header');
  assert.deepEqual(await pluginsHeader.getByRole("tab").allTextContents(), ["Your plugins"]);
  assert.equal(await page.getByRole("button", { name: "Refresh", exact: true }).count(), 0, "no invented Refresh action in the Plugins header");
  assert.equal(await pluginTable.locator('[data-testid="plugins-tabbed-list-row"]').count(), 2, "installed plugins only");
  assert.deepEqual(await pluginTable.locator("[data-cz-section]").evaluateAll(nodes => nodes.map(node => node.textContent)), ["Created by you· 1", "From marketplaces you added· 1"]);
  assert.equal(await pluginRow("fx-off").locator('[data-cds="Badge"][data-variant="neutral"]').textContent(), "Disabled");
  assert.equal(await pluginRow("fx-plugin").locator(".truncate.text-secondary").textContent(), "by Fixture Labs·Fixture plugin");
  assert.equal(await pluginRow("fx-off").locator(".truncate.text-secondary").textContent(), "by Fixture Labs·0 skills", "Gl: the skill count when there is no description");
  // F13 shared-4 _L: unique display names carry no "(Fixture Market)" suffix.
  assert.equal(await pluginTable.locator("[data-plugin-suffix]").count(), 0);
  assert.equal(await pluginRow("fx-plugin").locator(".text-body-medium").textContent(), "Fx Plugin");
  assert.equal(await page.getByText("Fixture Market", { exact: true }).count(), 0);
  // c3c3eda79 lt: Show › Disabled leaves fx-off; the reset (dn clear) brings the other back.
  await pluginsHeader.getByRole("button", { name: "Filter", exact: true }).click();
  const showMenu = page.getByRole("menu", { name: "Filter", exact: true });
  assert.deepEqual(await showMenu.locator('[role="menuitemradio"] .smenu-label').allTextContents(), ["All plugins", "Enabled", "Disabled"]);
  await showMenu.getByRole("menuitemradio", { name: "Disabled", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="plugins-tabbed-list-row"]').length === 1);
  assert.equal(await pluginRow("fx-off").count(), 1);
  await pluginsHeader.getByRole("button", { name: "Reset filters and sort", exact: true }).click();
  await pluginTable.locator('[data-testid="plugins-tabbed-list-row"]').nth(1).waitFor();
  // No notice and no body gap: the list follows the header directly.
  metrics.pluginsTableGap = await pluginTable.evaluate(list => { const body = list.closest(".cz-page-body");
    return { gap: list.getBoundingClientRect().top - (body.getBoundingClientRect().top + parseFloat(getComputedStyle(body).paddingTop)), notices: body.querySelectorAll(".cz-notice").length }; });
  near(metrics.pluginsTableGap.gap, 0, "Plugins list starts at the top of the body", 0.5); assert.equal(metrics.pluginsTableGap.notices, 0);
  // F13 c36b3644c be: while plugin/read is held the drill shows the c9d36aa51 skeleton, not "Loading plugin details…".
  const slowRead = await readSeed(); slowRead.pluginReadDelayMs = 1500; await writeSeed(slowRead);
  count = (await trace()).length;
  await openPlugin("fx-plugin");
  const pluginSkeleton = page.getByTestId("plugin-page-skeleton");
  await pluginSkeleton.waitFor();
  metrics.pluginSkeleton = await pluginSkeleton.evaluate(node => ({ bars: [...node.querySelectorAll("[data-cds=Skeleton]")].map(bar => { const rect = bar.getBoundingClientRect(); return [Math.round(rect.width), Math.round(rect.height)]; }).slice(0, 3),
    count: node.querySelectorAll("[data-cds=Skeleton]").length, shimmer: getComputedStyle(node.querySelector("[data-cds=Skeleton]"), "::after").animationName, read: !!document.querySelector("[data-plugin-skills]") }));
  assert.deepEqual(metrics.pluginSkeleton.bars, [[200, 24], [40, 20], [32, 32]]); assert.equal(metrics.pluginSkeleton.count, 14); assert.equal(metrics.pluginSkeleton.read, false);
  assert.equal(metrics.pluginSkeleton.shimmer, "cds-shimmer");
  assert.equal(await page.getByText("Loading plugin details…", { exact: true }).count(), 0);
  await page.screenshot({ path: path.join(directory, "plugin-skeleton.png") });
  await page.locator("[data-plugin-skills]").waitFor();
  assert.equal(await pluginSkeleton.count(), 0);
  delete slowRead.pluginReadDelayMs; await writeSeed(slowRead);
  checks.push("F13 Plugins: no notice, unique names without the marketplace suffix, the list right below the header; the drill shows the plugin-page skeleton (200×24 title, 40×20 pill, 32×32 square, 14 shimmer bars) until plugin/read answers");
  const read = (await trace()).slice(count).find(entry => entry.method === "plugin/read");
  assert.deepEqual(read.params, { pluginName: "fx-plugin", marketplacePath: path.join(codexHome, "plugins/fx-market.json") });
  // c36b3644c :200–538: slash skill labels, contents tabs rather than simultaneous side-panel lists.
  assert.equal(await pluginTable.count(), 0, "detail replaces the entire table");
  const pluginDetail = page.locator('[data-cz-detail="plugin"]');
  assert.deepEqual(await pluginDetail.getByRole('tab').allTextContents(), ['Skills', 'Connectors', 'Hooks']);
  assert.deepEqual(await page.locator("[data-plugin-skills] li").allTextContents(), ["/fx-plugin-skill"]);
  // R04: c36b3644c _e tab copy follows the Claude → DeepSeek convention.
  const tabCopy = {};
  tabCopy.skills = await pluginDetail.locator(".cz-plugin-tab-description").textContent();
  await pluginDetail.getByRole('tab', {name:'Hooks',exact:true}).click();
  assert.equal(await page.locator("[data-plugin-hooks] li span").textContent(), "PreToolUse");
  assert.equal(await page.locator("[data-plugin-hooks] li small").textContent(), "fx-hook");
  tabCopy.hooks = await pluginDetail.locator(".cz-plugin-tab-description").textContent();
  await pluginDetail.getByRole('tab', {name:'Connectors',exact:true}).click();
  tabCopy.connectors = await pluginDetail.locator(".cz-plugin-tab-description").textContent();
  assert.deepEqual(tabCopy, { skills: "Invoke by typing / in chat, or let Codex use them automatically for relevant tasks.",
    hooks: "Commands this plugin runs automatically — on session events, or when its skills are used.",
    connectors: "Tools and data sources this plugin connects to. Connect each one so Codex can use it." });
  assert.equal((await pluginDetail.textContent()).includes("Claude"), false, "no Claude copy in the Fx Plugin drill");
  // R04 c36b3644c fe → c26958849 rows: 24px connector tile, the catalog title, its status as the muted description.
  const pluginConnector = pluginDetail.locator('[data-plugin-mcp] button[data-connector-name="fx-connected"]');
  metrics.pluginConnector = await pluginConnector.evaluate(node => ({ name: node.querySelector(".truncate").textContent, status: node.querySelector(".font-small.text-muted")?.textContent,
    muted: node.classList.contains("text-muted"), tile: node.querySelector(".cz-connector-tile").getBoundingClientRect().width }));
  assert.deepEqual(metrics.pluginConnector, { name: "Fixture Connected", status: "Connected", muted: false, tile: 24 });
  assert.equal(await pluginDetail.locator("[data-plugin-mcp] li").count(), 1);
  await pluginDetail.getByRole('tab', {name:'Skills',exact:true}).click();
  await pluginDetail.getByRole('button', {name:'/fx-plugin-skill',exact:true}).click();
  await page.locator('[data-cz-detail="skill"]').waitFor();
  await page.getByRole('button', {name:'Fx Plugin',exact:true}).click();
  await pluginDetail.getByRole('tab', {name:'Skills',exact:true}).waitFor();
  assert.equal(await pluginDetail.getByRole('tab', {name:'Skills',exact:true}).getAttribute('aria-selected'), 'true');
  await page.screenshot({ path: path.join(directory, "plugins.png") });
  await pluginDetail.getByRole('button', {name:'Plugins',exact:true}).click();
  await pluginTable.waitFor();
  assert.equal(await pluginTable.locator('[data-testid="plugins-tabbed-list-row"]').count(), 2);
  checks.push("Plugins: 'Your plugins' toolbar, Created by you / From marketplaces you added sections, 2 installed rows, Disabled badge, 'by Fixture Labs' credits with the description or skill count, Show › Disabled filters and Reset restores; plugin/read detail lists skills/hooks/connectors");
  // R04 c26e90ba3 qt: a non-local plugin's metadata ends with "Last updated —"; a local one has none.
  await openPlugin("fx-off");
  await page.locator('[data-cz-detail="plugin"] .cz-plugin-metadata').waitFor();
  assert.deepEqual(await page.locator('[data-cz-detail="plugin"] .cz-plugin-metadata > div').evaluateAll(nodes => nodes.map(node => [node.firstElementChild.textContent, node.lastElementChild.textContent])).then(rows => rows.at(-1)), ["Last updated", "—"]);
  await page.locator('[data-cz-detail="plugin"]').getByRole('button', {name:'Plugins',exact:true}).click();
  await openPlugin("fx-plugin");
  await pluginDetail.getByRole('tab', {name:'Connectors',exact:true}).click();
  assert.equal(await pluginDetail.locator('.cz-plugin-metadata').getByText("Last updated").count(), 0, "local plugins have no Last updated");
  // A Connectors-tab row opens that server's connector drill (pe onSelect).
  await pluginConnector.click();
  await page.locator('[data-cz-detail="connector"]').waitFor();
  assert.equal(await page.locator('[data-cz-detail="connector"] h2').textContent(), "Fixture Connected");
  checks.push("R04 Fx Plugin drill: DeepSeek tab copy (no 'Claude'), the Connectors tab row is a 24px-tile 'Fixture Connected · Connected' row that opens data-cz-detail=connector; Fx Off shows 'Last updated —'");
  await closeSettings();
  // R03: the refused "Show in Folder" (step 4) was a toast, so no app-level error banner waits behind the modal.
  assert.equal(await page.locator(".composer-error").count(), 0, `no error banner: ${await page.locator(".composer-error").allTextContents().catch(() => [])}`);

  // 8. Composer Add menu: no placeholder, Skills submenu with footer, chip → turn/start skill input.
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click();
  const addMenu = page.getByRole("menu", { name: "Add", exact: true });
  await addMenu.waitFor();
  // B30 ca80fca8d jN re: with connectors listed, 'Manage connectors' is the first row inside the Connectors submenu,
  // never a top-level row (that plain row is only the no-connector state).
  assert.equal(await page.getByRole("menuitem", { name: "Manage connectors" }).count(), 0);
  // jy returns null with no skill rows and Bv's empty state has no Codex counterpart: none of these invented rows exist.
  for (const invented of ["Loading skills…", "No enabled skills", "Loading plugins…", "No installed plugins provide skills"])
    assert.equal(await page.getByText(invented, { exact: true }).count(), 0, `add menu must not render "${invented}"`);
  await addMenu.getByRole("menuitem", { name: "Skills", exact: true }).click();
  const skillsMenu = page.getByRole("menu", { name: "Skills", exact: true });
  await skillsMenu.locator("[data-skill-path]").first().waitFor();
  assert.deepEqual(await labels(skillsMenu.locator("[data-skill-path]")), ["fx-beta", "fx-repo"], "enabled non-plugin skills sorted by label");
  await skillsMenu.getByRole("menuitem", { name: "Manage skills", exact: true }).click();
  await dialog().waitFor();
  await page.waitForFunction(() => (button => button && button.querySelector(':scope > span:not([data-cds=Icon])')?.textContent.trim() === "Skills")(document.querySelector('.ss-nav li>button[aria-current="page"]')));
  await closeSettings();
  await add.click();
  await addMenu.getByRole("menuitem", { name: "Plugins", exact: true }).click();
  const pluginsMenu = page.getByRole("menu", { name: "Plugins", exact: true });
  await pluginsMenu.getByRole("menuitem", { name: "Fx Plugin", exact: true }).click();
  await page.getByRole("menu", { name: "Fx Plugin", exact: true }).locator("[data-skill-path]").first().waitFor();
  assert.deepEqual(await labels(page.getByRole("menu", { name: "Fx Plugin", exact: true }).locator("[data-skill-path]")), ["fx-plugin-skill"]);
  // Cr (:616-653) + the c17e03edc card: hovering a skill row shows its description and "{plugin} plugin".
  await page.getByRole("menu", { name: "Fx Plugin", exact: true }).locator("[data-skill-path]").first().hover();
  const hoverCard = page.locator(".smenu-hovercard");
  await hoverCard.waitFor();
  assert.deepEqual(await hoverCard.locator("div").allTextContents(), ["fx-plugin-skill description", "Fx Plugin plugin"]);
  metrics.hoverCard = await hoverCard.evaluate(node => ({ position: getComputedStyle(node).position, pointerEvents: getComputedStyle(node).pointerEvents }));
  assert.deepEqual(metrics.hoverCard, { position: "fixed", pointerEvents: "none" });
  // Escape closes one popup level at a time (same contract as menus-states-ui-test); repeat until the tree is gone.
  for (let level = 0; level < 4 && await page.locator('[role="menu"]').count(); level++) { await page.keyboard.press("Escape"); await new Promise(resolve => setTimeout(resolve, 60)); }
  await page.waitForFunction(() => !document.querySelector('[role="menu"]'));
  await add.click();
  await addMenu.getByRole("menuitem", { name: "Skills", exact: true }).click();
  await skillsMenu.locator(`[data-skill-path="${skillFile(betaDir)}"]`).click();
  // Fidelity F05 (c099c328d-CbkcmYSW.js:7926-7940 B → wv; shared-14 :18578-18600 skillChip): the row puts the editor's
  // '/fx-beta' skill chip plus a space at the start of the draft instead of a 'Skill' attachment pill (an intended change of
  // the behaviour this step asserted); the leading chip is still sent as the {type:'skill'} input after the text.
  const chip = page.locator('.sc-input [data-skill-chip][data-chip-kind="skill"]');
  await chip.waitFor();
  metrics.skillChip = { text: (await labels(chip))[0], value: await composer().evaluate(node => node.value), pills: await page.locator("[data-cds-attachment]").count() };
  assert.deepEqual(metrics.skillChip, { text: "/fx-beta", value: "/fx-beta ", pills: 0 });
  await page.screenshot({ path: path.join(directory, "skill-chip.png") });
  count = (await trace()).length;
  await page.waitForFunction(() => document.activeElement?.closest(".sc-input"));
  await page.keyboard.insertText("use it");
  await page.waitForFunction(() => document.querySelector(".sc-input").value === "/fx-beta use it");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(".assistant-message").filter({ hasText: "CUSTOMIZE_FIXTURE_REPLY" }).first().waitFor();
  const sent = (await trace()).slice(count).find(entry => entry.method === "turn/start");
  assert.deepEqual(sent.params.input, [{ type: "text", text: "use it", text_elements: [] }, { type: "skill", name: "fx-beta", path: skillFile(betaDir) }]);
  await chip.waitFor({ state: "detached" });
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await add.click();
  await addMenu.getByRole("menuitem", { name: "Skills", exact: true }).click();
  await skillsMenu.locator(`[data-skill-path="${skillFile(betaDir)}"]`).click();
  await chip.waitFor();
  // Backspace removes the separator, then selects the chip, then deletes it.
  await page.waitForFunction(() => document.activeElement?.closest(".sc-input"));
  for (let press = 0; press < 3; press++) await page.keyboard.press("Backspace");
  await chip.waitFor({ state: "detached" });
  assert.equal(await composer().evaluate(node => node.value), "");
  count = (await trace()).length;
  await slash("no skill");
  await page.locator(".assistant-message").filter({ hasText: "CUSTOMIZE_FIXTURE_REPLY" }).nth(1).waitFor();
  const plain = (await trace()).slice(count).find(entry => entry.method === "turn/start");
  assert.deepEqual(plain.params.input, [{ type: "text", text: "no skill", text_elements: [] }]);
  checks.push("Add menu drops 'Manage connectors' and every invented loading/empty row; Skills submenu lists enabled skills sorted with a 'Manage skills' footer that opens Settings › Skills; Plugins submenu nests per-plugin skills and a hovered skill row shows the description + '{plugin} plugin' card; F05: a chosen skill becomes the editor's '/fx-beta' chip (no attachment pill) and turn/start carries [text 'use it', {type:skill,name,path}]; a chip removed with Backspace sends none");
  // F05 skills in '/' (cc183b3ab-BNeMUZS1.js:619-700; c099c328d-CbkcmYSW.js:10637-10690): the slash list ends with the enabled
  // skills; choosing one inserts the chip marked kind 'skill', '/fx-beta …' parses as a message and the turn carries the skill item.
  await page.locator(".assistant-message").filter({ hasText: "CUSTOMIZE_FIXTURE_REPLY" }).nth(1).waitFor();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  await composer().fill("/fx");
  const slashMenu = page.getByRole("menu", { name: "Slash commands", exact: true });
  await slashMenu.waitFor();
  metrics.slashSkills = await labels(slashMenu.getByRole("menuitem"));
  assert.ok(["fx-beta", "fx-repo"].every(name => metrics.slashSkills.includes(name)), `the slash list carries the enabled skills: ${metrics.slashSkills}`);
  assert.ok(!metrics.slashSkills.includes("fx-alpha"), "a disabled skill stays out");
  await slashMenu.getByRole("menuitem").filter({ hasText: /^fx-beta$/ }).hover();
  await page.locator(".slash-description").filter({ hasText: "fx-beta description" }).waitFor();
  await slashMenu.getByRole("menuitem").filter({ hasText: /^fx-beta$/ }).click();
  await chip.waitFor();
  assert.equal(await composer().evaluate(node => node.value), "/fx-beta ");
  await page.waitForFunction(() => document.activeElement?.closest(".sc-input"));
  await page.keyboard.insertText("via slash");
  count = (await trace()).length;
  await page.keyboard.press("Enter");
  await page.locator(".assistant-message").filter({ hasText: "CUSTOMIZE_FIXTURE_REPLY" }).nth(2).waitFor();
  const viaSlash = (await trace()).slice(count).find(entry => entry.method === "turn/start");
  assert.deepEqual(viaSlash.params.input, [{ type: "text", text: "via slash", text_elements: [] }, { type: "skill", name: "fx-beta", path: skillFile(betaDir) }]);
  assert.equal(await page.locator(".composer-error").count(), 0, "a skill is not rejected as an unknown command");
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  checks.push("F05 '/fx' lists the enabled skills after the host commands with their descriptions; choosing fx-beta inserts the kind 'skill' chip ('/fx-beta '), Enter sends [text 'via slash', {type:skill,name:'fx-beta',path}] with no unknown-command error");
  // Text typed first, then Add › Skills (c099c328d-CbkcmYSW.js:7926-7940 B: every skill chip is deleted, then the picked one
  // goes in at the start): the chip leads the draft, a second pick replaces it, and turn/start still carries the skill item.
  await composer().fill("summarize this");
  await page.waitForFunction(() => document.querySelector(".sc-input").value === "summarize this");
  for (const [dir, value] of [[betaDir, "/fx-beta summarize this"], [repoDir, "/fx-repo summarize this"]]) {
    await add.click();
    await addMenu.getByRole("menuitem", { name: "Skills", exact: true }).click();
    await skillsMenu.locator(`[data-skill-path="${skillFile(dir)}"]`).click();
    await page.waitForFunction((value) => document.querySelector(".sc-input").value === value, value);
  }
  metrics.skillAfterText = { value: await composer().evaluate(node => node.value), chips: await labels(chip) };
  assert.deepEqual(metrics.skillAfterText, { value: "/fx-repo summarize this", chips: ["/fx-repo"] }, "the second skill replaces the first at the start");
  count = (await trace()).length;
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(".assistant-message").filter({ hasText: "CUSTOMIZE_FIXTURE_REPLY" }).nth(3).waitFor();
  const afterText = (await trace()).slice(count).find(entry => entry.method === "turn/start");
  assert.deepEqual(afterText.params.input, [{ type: "text", text: "summarize this", text_elements: [] }, { type: "skill", name: "fx-repo", path: skillFile(repoDir) }]);
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  checks.push("F05 review: 'summarize this' typed first, then Add › Skills fx-beta → '/fx-beta summarize this'; picking fx-repo replaces it ('/fx-repo summarize this', one chip); turn/start carries [text 'summarize this', {type:skill,name:'fx-repo',path}]");

  // 9. Slash commands and /help.
  await openSection("/mcp");
  await page.waitForFunction(() => (button => button && button.querySelector(':scope > span:not([data-cds=Icon])')?.textContent.trim() === "Connectors")(document.querySelector('.ss-nav li>button[aria-current="page"]')));
  // Without a session: every runtime status is null, nothing reads Connected.
  await closeSettings();
  await slash("/new");
  await page.waitForFunction(() => !document.querySelector('[data-transcript-item-id="sm-answer"]'));
  await openSection("/plugins");
  await page.waitForFunction(() => (button => button && button.querySelector(':scope > span:not([data-cds=Icon])')?.textContent.trim() === "Plugins")(document.querySelector('.ss-nav li>button[aria-current="page"]')));
  await nav().getByRole("button", { name: "Connectors", exact: true }).click();
  await mcpTable.locator("tbody tr").nth(3).waitFor();
  const homeList = (await trace()).filter(entry => entry.method === "mcpServerStatus/list").at(-1);
  assert.equal(homeList.params.threadId, undefined, "no thread → global listing");
  metrics.homeStatuses = await mcpTable.locator("tbody tr").evaluateAll(rows => rows.map(row => [row.getAttribute("data-mcp-name"), row.getAttribute("data-mcp-status"), row.querySelector(".cz-status").textContent]));
  assert.ok(metrics.homeStatuses.every(([, kind, text]) => kind !== "connected" && !text.includes("Connected")), "never Connected without runtime status");
  assert.deepEqual(metrics.homeStatuses.map(([name, kind]) => [name, kind]), [["fx-auth", "signIn"], ["fx-connected", "notStarted"], ["fx-failed", "notStarted"], ["fx-starting", "notStarted"]]);
  await closeSettings();
  await slash("/help");
  // cc183b3ab help = support, not a command palette. Local support is the honest Codex adaptation.
  const commands = page.getByRole("dialog", { name: "Help and support", exact: true });
  await commands.waitFor();
  await commands.getByText('OpenClaude Desktop runs local DeepSeek sessions. Slash commands open tools, settings and conversation actions.', {exact:true}).waitFor();
  await page.keyboard.press("Escape");
  checks.push("/skills, /mcp and /plugins open the matching Customize page (aria-current); without a session the connector list has no threadId and no row reads Connected; /help opens local support");

  // 10. Connectors load states: reopening the session changes the catalog key, so the
  // slow failing mcpServerStatus/list shows MC then so() (customize-connectors :3136-3147, :3830-3848).
  const failing = await readSeed(); failing.mcpFail = true; failing.mcpDelayMs = 5000; await writeSeed(failing);
  await page.locator(`[data-source-session-id="${T}"] .source-session-open`).click();
  await page.locator('[data-transcript-item-id="sm-answer"]').waitFor();
  await openSection("/mcp");
  const mcpSkeleton = page.locator('[data-cz-page="connectors"] [data-testid="connectors-rows-skeleton"]');
  await mcpSkeleton.waitFor();
  metrics.mcpSkeleton = await mcpSkeleton.evaluate(node => ({ className: node.className, search: node.firstElementChild.firstElementChild.getBoundingClientRect().width,
    searchHeight: node.firstElementChild.querySelector('[data-cds=Skeleton]').getBoundingClientRect().height, rowsHidden: node.lastElementChild.getAttribute('aria-hidden'),
    leading: [...node.querySelectorAll('.size-6')].map(bar => [bar.getBoundingClientRect().width, bar.getBoundingClientRect().height]), hidden: node.closest('[aria-hidden="true"]') !== null }));
  assert.equal(metrics.mcpSkeleton.className, "flex flex-col gap-sm pt-sm");
  near(metrics.mcpSkeleton.search, 252, "VS w-63 search stand-in"); near(metrics.mcpSkeleton.searchHeight, metrics.tokens.hControl, "VS h-control", 0.5);
  assert.equal(metrics.mcpSkeleton.rowsHidden, "true"); assert.equal(metrics.mcpSkeleton.hidden, true);
  assert.deepEqual(metrics.mcpSkeleton.leading, Array.from({ length: 6 }, () => [24, 24]), "size-6 leading icon slot per row");
  assert.equal(await page.getByText("Loading connectors…", { exact: true }).count(), 0);
  // Screenshot after the DOM facts: under host load it can outlast the held reply.
  await page.screenshot({ path: path.join(directory, "connectors-skeleton.png") });
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(table,.cz-notice,.cz-broken)').count(), 0, "G loading = header + MC only; previous-key rows and their card are not shown");
  const mcpError = page.locator('[data-cz-page="connectors"] .cz-load-error');
  await mcpError.getByText("Couldn’t load connectors", { exact: true }).waitFor();
  assert.equal(await mcpError.locator("p").getAttribute("class"), "text-body text-muted");
  assert.equal(await page.locator('[data-cz-page="connectors"] :is(table,th,.cz-notice,[role=alert])').count(), 0, "error state renders no table, notice or raw alert");
  assert.equal(await page.getByText("MCP status unavailable in fixture").count(), 0);
  const tryAgain = mcpError.getByRole("button", { name: "Try again", exact: true });
  metrics.tryAgain = await buttonBox(tryAgain);
  assert.equal(metrics.tryAgain.cds, "Button"); assert.equal(metrics.tryAgain.variant, "secondary"); assert.equal(metrics.tryAgain.size, null, "so() Try again passes no size (base)"); near(metrics.tryAgain.height, metrics.tokens.hControl, "Try again = h-control", 0.5);
  await page.screenshot({ path: path.join(directory, "connectors-error.png") });
  const healthy = await readSeed(); delete healthy.mcpFail; delete healthy.mcpDelayMs; await writeSeed(healthy);
  count = (await trace()).length;
  await tryAgain.click();
  await mcpTable.locator("tbody tr").nth(3).waitFor();
  const retried = (await trace()).slice(count).filter(entry => entry.method === "mcpServerStatus/list" && !Object.hasOwn(entry.params, "limit"));
  assert.equal(retried.length, 1); assert.equal(retried[0].params.threadId, T);
  await closeSettings();
  checks.push("Connectors loading = MC (connectors-rows-skeleton, flex-col gap-sm pt-sm, 252px h-control search stand-in, aria-hidden rows with 24px leading slots, no 'Loading connectors…'); a failed mcpServerStatus/list renders only so() 'Couldn’t load connectors' + secondary CDS 'Try again' (no table/th/notice/raw text), which re-lists once for the open thread and restores the table");
  // F07 KO :6943-6944 (i = onlyBody && !inCard && mcp__): a group row's MCP body is the plain GO body,
  // a lone MCP row keeps the standalone WO card. An answered question is the vZ receipt (R06 below);
  // the Qoe Asked row remains only for an unanswered one (tests/tool-cards-f07.test.mjs).
  await page.locator(`[data-source-session-id="${T2}"] .source-session-open`).click();
  await page.locator('[data-transcript-item-id="tools-done"]').waitFor();
  const mcpGroup = page.locator('.stg[data-tool-group="mcp-a"]');
  await mcpGroup.locator(".stg-trigger").click();
  for (const id of ["mcp-a", "mcp-b"]) {
    const member = mcpGroup.locator(`.stg-row [data-transcript-item-id="${id}"]`);
    await member.locator(".source-step-trigger").first().click();
    await member.locator(".sgt-body").waitFor();
  }
  metrics.mcpInGroup = await mcpGroup.evaluate(node => ({ standalone: node.querySelectorAll(".stg-row .sgt-body[data-standalone]").length,
    bodies: node.querySelectorAll(".stg-row .sgt-body").length, rings: [...node.querySelectorAll(".stg-row .sgt-body-inner")].map(inner => getComputedStyle(inner).boxShadow) }));
  assert.deepEqual(metrics.mcpInGroup, { standalone: 0, bodies: 2, rings: ["none", "none"] });
  const solo = page.locator('.source-step[data-transcript-item-id="mcp-solo"]');
  await solo.locator(".source-step-trigger").first().click();
  await solo.locator('.sgt-body[data-standalone]').waitFor();
  assert.match(await solo.locator(".sgt-body[data-standalone] > .sgt-body-inner").evaluate(node => getComputedStyle(node).boxShadow), / 0px 0px 0px 1px inset$/);
  // R06 wue/vZ (approval-current.js:45232-45240, :35628-35651; rules :16269): the answered question is the
  // always-visible receipt card, not an 'Asked' row: pairs in px-lg py-md with a border-top between them,
  // the question font-medium text-primary, the answer text-secondary.
  assert.equal(await page.locator('.source-step[data-transcript-item-id="ask-row"]').count(), 0, "no Asked row for an answered question");
  const receipt = page.locator('.sqr[data-transcript-item-id="ask-row"]');
  await receipt.waitFor();
  metrics.receipt = await receipt.evaluate(node => {
    const probe = (property, value) => { const div = document.createElement("div"); div.style[property] = value; node.append(div); const result = getComputedStyle(div)[property]; div.remove(); return result; };
    const pairs = [...node.querySelectorAll(".sqr-pair")], style = getComputedStyle(node), question = getComputedStyle(pairs[0].querySelector(".sqr-question"));
    return { pairs: pairs.map(pair => [pair.querySelector(".sqr-question")?.textContent, pair.querySelector(".sqr-answer")?.textContent]),
      questionWeight: question.fontWeight, questionColor: question.color, answerColor: getComputedStyle(pairs[0].querySelector(".sqr-answer")).color,
      primary: probe("color", "var(--cds-text-primary)"), secondary: probe("color", "var(--cds-text-secondary)"), border: probe("color", "var(--cds-border)"),
      borders: pairs.map(pair => `${getComputedStyle(pair).borderTopWidth} ${getComputedStyle(pair).borderTopStyle}`), borderColor: getComputedStyle(pairs[1]).borderTopColor,
      padding: [getComputedStyle(pairs[0]).paddingTop, getComputedStyle(pairs[0]).paddingLeft], padMd: probe("paddingTop", "var(--cds-pad-md)"), padLg: probe("paddingLeft", "var(--cds-pad-lg)"),
      maxWidth: style.maxWidth, radius: style.borderTopLeftRadius, ring: style.boxShadow, marginBottom: style.marginBottom, userSelect: style.userSelect,
      triggers: node.querySelectorAll(".source-step-trigger").length, text: node.textContent };
  });
  assert.deepEqual(metrics.receipt.pairs, [["Which language?", "Go"], ["Which test kinds?", "Unit, UI, smoke"], ["Package name?", "Skipped"]]);
  assert.equal(metrics.receipt.questionWeight, "500", "font-medium question"); assert.equal(metrics.receipt.questionColor, metrics.receipt.primary);
  assert.equal(metrics.receipt.answerColor, metrics.receipt.secondary, "text-secondary answer");
  // The CDS preflight gives every element border-style solid (as the original's Tailwind base), so the first pair reads 0px solid.
  assert.deepEqual(metrics.receipt.borders, ["0px solid", "1px solid", "1px solid"], "a border-top between pairs only"); assert.equal(metrics.receipt.borderColor, metrics.receipt.border);
  assert.deepEqual(metrics.receipt.padding, [metrics.receipt.padMd, metrics.receipt.padLg], "px-lg py-md");
  assert.equal(metrics.receipt.maxWidth, "480px"); assert.equal(metrics.receipt.radius, "8px"); assert.equal(metrics.receipt.ring, `${metrics.receipt.border} 0px 0px 0px 1px`, "epitaxy-card-outline is an outer ring (design-system.css:56758-56768)");
  assert.equal(metrics.receipt.marginBottom, "10px", "margin-bottom chat-item-gap"); assert.equal(metrics.receipt.userSelect, "text");
  assert.equal(metrics.receipt.triggers, 0); assert.doesNotMatch(metrics.receipt.text, /questions:|"answers"/);
  await receipt.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, "tool-rows.png") });
  // R06 cf6ae6197 xk/fk: two DeepSeek todo_write calls and a command read 'Updated todos, ran a command'.
  const todoGroup = page.locator('.stg[data-tool-group="todo-a"]');
  await todoGroup.waitFor();
  metrics.todoGroupSummary = (await todoGroup.locator(".stg-summary").textContent()).trim();
  assert.equal(metrics.todoGroupSummary, "Updated todos, ran a command");
  // R06 QO (approval-current.js:7398-7445): an MCP screenshot is a 'View screenshot' thumbnail hoisted
  // under its standalone row (RN :17302), never '[image]' or base64 text; it opens the image viewer.
  // The column stays in the row's own root, so the row and the agent text after it remain one feed
  // article (no boundary row, no second 'DeepSeek responded' heading).
  const shotRow = page.locator('.source-step[data-transcript-item-id="mcp-shot"]');
  const shot = page.locator('[data-tool-images-for="mcp-shot"] button[aria-label="View screenshot"]');
  await shot.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-tool-images-for="mcp-shot"] img')?.complete);
  metrics.shot = await shot.evaluate(button => { const img = button.querySelector("img"), column = button.parentElement;
    return { naturalWidth: img.naturalWidth, cursor: getComputedStyle(button).cursor, src: img.getAttribute("src").slice(0, 22), paddingTop: getComputedStyle(column).paddingTop,
      row: column.parentElement?.getAttribute("data-transcript-item-id"), rowTopLevel: !!column.parentElement?.parentElement?.classList.contains("source-transcript-content"),
      lastInRow: column.nextElementSibling === null, imgBorder: getComputedStyle(img).borderTopWidth, maxHeight: getComputedStyle(img).maxHeight }; });
  metrics.shotFeed = await page.evaluate(() => { const row = document.querySelector('.source-transcript-content > [data-transcript-item-id="mcp-shot"]'), between = [];
    let node = row?.nextElementSibling; while (node && node.getAttribute("data-transcript-item-id") !== "tools-done") { between.push(node.getAttribute("data-transcript-item-id") ?? node.className); node = node.nextElementSibling; }
    return { found: !!node, between, doneRole: node?.getAttribute("role"), doneHeading: !!node?.querySelector("[data-feed-heading]"), rowRole: row?.getAttribute("role"),
      articleRows: [...document.querySelectorAll('.source-transcript-content > [role="article"]')].map(element => element.getAttribute("data-transcript-item-id") ?? element.getAttribute("data-tool-group")) }; });
  assert.ok(metrics.shot.naturalWidth > 0, "the PNG decodes"); assert.equal(metrics.shot.cursor, "zoom-in"); assert.equal(metrics.shot.src, "data:image/png;base64,");
  assert.equal(metrics.shot.row, "mcp-shot", "in the row root"); assert.equal(metrics.shot.rowTopLevel, true); assert.equal(metrics.shot.lastInRow, true, "after the row body");
  assert.deepEqual(metrics.shotFeed.between, [], "no boundary row between the MCP row and the agent text");
  assert.equal(metrics.shotFeed.found, true); assert.notEqual(metrics.shotFeed.doneRole, "article", "the agent text is not its own feed article");
  assert.equal(metrics.shotFeed.doneHeading, false); assert.notEqual(metrics.shotFeed.rowRole, "article");
  assert.equal(metrics.shotFeed.articleRows.length, 2, `one user article and one response article: ${metrics.shotFeed.articleRows}`); assert.equal(metrics.shot.imgBorder, "1px"); assert.equal(metrics.shot.maxHeight, "360px");
  await shotRow.locator(".source-step-trigger").first().click();
  await shotRow.locator(".sgt-body").waitFor();
  const shotText = await shotRow.textContent();
  assert.match(shotText, /MCP_SHOT_RESULT/); assert.doesNotMatch(shotText, /\[image\]|iVBORw0KGgo/);
  assert.equal(await page.getByText("[image]", { exact: true }).count(), 0);
  await shot.click();
  const shotViewer = page.getByRole("dialog", { name: "Screenshot", exact: true });
  await shotViewer.waitFor();
  metrics.shotViewer = await shotViewer.evaluate(node => { const img = node.querySelector("img");
    return { src: img?.getAttribute("src")?.slice(0, 22), natural: img?.naturalWidth, close: !!node.querySelector('button[aria-label="Close image preview"]'), modal: node.getAttribute("aria-modal") }; });
  assert.equal(metrics.shotViewer.src, "data:image/png;base64,"); assert.ok(metrics.shotViewer.natural > 0); assert.equal(metrics.shotViewer.close, true); assert.equal(metrics.shotViewer.modal, "true");
  await page.screenshot({ path: path.join(directory, "tool-image-viewer.png") });
  await page.keyboard.press("Escape");
  await shotViewer.waitFor({ state: "detached" });
  assert.equal(await shot.evaluate(node => node === document.activeElement), true, "focus returns to the thumbnail");
  checks.push("F07: MCP bodies inside a classic group row are not standalone (no inset ring), a lone MCP row keeps the WO card. R06: the answered question is the vZ receipt (no Asked row; pairs 'Go', 'Unit, UI, smoke', 'Skipped'; 500-weight primary question, secondary answer, border-top between pairs, px-lg py-md, 480px max, outer card-outline ring, 10px margin-bottom); a todo_write pair + command group reads 'Updated todos, ran a command'; an MCP 1x1 PNG is a hoisted 'View screenshot' thumbnail inside its row root (decoded, zoom-in cursor, no [image]; the row and the following agent text stay one feed article) whose viewer dialog opens and closes on Escape with focus back on the thumbnail");
  await page.screenshot({ path: path.join(directory, "verified.png") });
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(directory, "failure.png") }).catch(() => {});
} finally {
  await app?.close().catch(error => { failure ||= error; });
  if (build) await verifySource().catch(error => { failure ||= error; });
  await fs.rm(profile, { recursive: true, force: true }).then(() => { profileRemoved = true; }).catch(error => { failure ||= error; });
  const report = { schemaVersion: 1, suite: "skills-mcp-ui", passed: !failure, startedAt, at: new Date().toISOString(), fixture: true, directory, profileRemoved,
    build: build ? { version: build.version, builtAt: build.builtAt, sourceSha256: build.sourceSha256, verifiedSourceFiles: build.sources?.length } : null,
    runtime, testSourceHashes, executablePath, checks, metrics, rendererErrors, ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(directory, "report.json"), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(evidence, "skills-mcp-ui-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (failure) throw failure;
