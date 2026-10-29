import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { execFileSync, spawn } from "node:child_process";
import assert from "node:assert/strict";

const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "sidebar-ui-profile-"));
// The project root is a git repo now (analysis/ is gitignored inside it): keep the fixture workspace outside any repo.
const workspaceRoot = path.join(await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "cd-sidebar-"))), "workspace");
const folderA = path.join(workspaceRoot, "first-project");
const folderB = path.join(workspaceRoot, "second-project");
await fs.mkdir(folderA, { recursive: true });
await fs.mkdir(folderB, { recursive: true });
// Fidelity F08 Folder grouping keys on repo identity (sidebar-session.js:20892-20903 IJ): first-project is a
// repo with an origin (key fixture/first-project), second-project a repo without one (key = its cwd), and
// notes a plain folder, whose sessions land in the final 'Other' bucket.
const folderC = path.join(workspaceRoot, "notes");
await fs.mkdir(folderC, { recursive: true });
const git = (cwd, ...args) => execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } });
git(folderA, "init", "-q"); git(folderA, "remote", "add", "origin", "git@github.com:fixture/first-project.git");
git(folderB, "init", "-q");
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: folderA, theme: "light", displayName: "Sidebar fixture", threadIds: [],
}));
const server = net.createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
let serverLog = "";
const vite = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root, env: process.env, stdio: ["ignore", "pipe", "pipe"],
});
vite.stdout.on("data", (chunk) => { serverLog += chunk; });
vite.stderr.on("data", (chunk) => { serverLog += chunk; });
const devUrl = `http://127.0.0.1:${port}`;
const report = { passed: false, fixture: true, at: new Date().toISOString(), profile, checks: [], errors: [], screenshots: [] };
const configFile = path.join(profile, "preferences.json");
const threadFile = path.join(profile, "fixture-threads.json");
const readConfig = async () => JSON.parse(await fs.readFile(configFile, "utf8"));
const readThreads = async () => JSON.parse(await fs.readFile(threadFile, "utf8"));
async function poll(check, label, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await check()) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(`Timed out: ${label}`);
}
let app, page;
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"), CODE_DESKTOP_DEV_URL: devUrl };
delete env.ELECTRON_RUN_AS_NODE;
async function launch() {
  app = await electron.launch({
    executablePath: process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"),
    args: [root], env,
  });
  page = await app.firstWindow();
  await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.webContents.setBackgroundThrottling(false);win.hide();});
  const inputSession=await page.context().newCDPSession(page);
  await inputSession.send("Emulation.setFocusEmulationEnabled",{enabled:true});
  report.inputIsolation="Hidden isolated test window with CDP focus emulation; original hover/click assertions retained to avoid shared desktop pointer interference";
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await app.evaluate(({ shell }) => {
    globalThis.sidebarRevealedFolders = [];
    shell.openPath = async (folder) => { globalThis.sidebarRevealedFolders.push(folder); return ""; };
  });
}
async function close() { if (app) { await app.close(); app = null; } }
const row = (id) => page.locator(`[data-source-session-id="${id}"]`);
const rowTitle = (id) => row(id).locator(".source-session-name");
const sessionMenu = () => page.getByRole("menu", { name: "Session options", exact: true });
async function openRowMenu(id) {
  await row(id).hover();
  await row(id).locator(".source-session-more").click();
  await sessionMenu().waitFor();
}
async function rowAction(id, label) {
  await openRowMenu(id);
  await sessionMenu().getByRole("menuitem", { name: label, exact: true }).click();
}
async function setFilter(submenu, choice) {
  await page.getByRole("button", { name: /^Filter(?: \(active\))?$/ }).click();
  const menu = page.getByRole("menu", { name: "Filter sessions", exact: true });
  await menu.getByRole("menuitem", { name: new RegExp(`^${submenu}`) }).click();
  await page.getByRole("menu", { name: submenu, exact: true }).getByRole("menuitemradio", { name: choice, exact: true }).click();
  await menu.waitFor({ state: "detached" });
}
async function visibleNames() { return page.locator(".source-session-name").allTextContents(); }
async function rename(id, name, commit = true) {
  await rowAction(id, "Rename");
  // F08: the inline field is labelled 'Rename' (sidebar-rows.js:7400-7420); it closes on Enter at once.
  const input = page.locator(".source-sidebar").getByRole("textbox", { name: "Rename", exact: true });
  await input.fill(name);
  await input.press(commit ? "Enter" : "Escape");
  await input.waitFor({ state: "detached" });
}
async function create(name) {
  await page.getByRole("button", { name: /^New(?:\s*⌘ N)?$/, exact: false }).first().click();
  await page.getByRole("textbox", { name: "Message DeepSeek" }).fill(`fixture:complete ${name}`);
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(".assistant-message").filter({ hasText: "Fixture response" }).waitFor();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  const id = await page.locator('.source-session-row[data-selected="focused"]').getAttribute("data-source-session-id");
  assert.ok(id);
  await rename(id, name);
  assert.equal(await rowTitle(id).innerText(), name);
  return id;
}
async function createGroup(id, name) {
  await openRowMenu(id);
  await sessionMenu().getByRole("menuitem", { name: "Move to group", exact: true }).click();
  await page.getByRole("menu", { name: "Move to group", exact: true }).getByRole("menuitem", { name: "New group…", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New group", exact: true });
  await dialog.getByRole("textbox", { name: "Group name" }).fill(name);
  // F08 ZB: 'Create and group by custom' with the switch note unless the list is already grouped by custom.
  const custom = (await readConfig()).sidebarPreferences?.groupBy === "custom";
  assert.equal(await dialog.getByText("The list will switch to Custom groups to show it.", { exact: true }).count(), custom ? 0 : 1);
  await dialog.getByRole("button", { name: custom ? "Create group" : "Create and group by custom", exact: true }).click();
  await dialog.waitFor({ state: "detached" });
  await page.locator(".source-group-toggle").filter({ hasText: name }).waitFor();
}
const groupHeading = (label) => page.locator(".source-group-heading").filter({ has: page.locator(".source-group-toggle", { hasText: label }) });
async function headingMenu(label) {
  await groupHeading(label).click({ button: "right", position: { x: 4, y: 4 } });
  const menu = page.getByRole("menu", { name: "Group options", exact: true });
  await menu.waitFor();
  return menu;
}
const menuLabels = (menu) => menu.locator('[role="menuitem"], [role="separator"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("role") === "separator" ? "—" : node.textContent.trim()));
const headingLabels = () => page.locator(".source-group-toggle > span:first-child").allTextContents();

try {
  await poll(() => new Promise((resolve) => {
    const request = http.get(devUrl, (response) => { response.resume(); resolve(response.statusCode === 200); });
    request.on("error", () => resolve(false));
    request.setTimeout(1000, () => { request.destroy(); resolve(false); });
  }), "Vite startup");
  await launch();
  const zeta = await create("Zeta task");
  const alpha = await create("Alpha task");
  await page.locator(".source-sidebar-nav-row").filter({ hasText: "New" }).click();
  await app.evaluate(({ dialog }, folder) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [folder] }); }, folderB);
  await page.locator(".sc-folder-chip").click();
  // Fidelity F03: the composer folder chip opens the lH Recent picker (cc43287c9 :21638-21850); browsing is its
  // trailing 'Open folder…' row (was the local 'Choose a folder…').
  await page.getByRole("menuitem", { name: "Open folder…", exact: true }).click();
  await page.locator(".sc-folder-chip").filter({ hasText: "second-project" }).waitFor();
  const beta = await create("Beta task");
  report.ids = { zeta, alpha, beta };
  report.checks.push("three independent fixture:complete threads created through UI in two selected folders");
  await close();

  // Make date/order cases deterministic only in this isolated fixture store.
  const fixture = await readThreads();
  const timestamp = (days) => { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(12, 0, 0, 0); return Math.floor(date.getTime() / 1000); };
  Object.assign(fixture.threads[zeta], { updatedAt: timestamp(0), createdAt: timestamp(12), cwd: folderC });
  Object.assign(fixture.threads[alpha], { updatedAt: timestamp(10), createdAt: timestamp(10) });
  Object.assign(fixture.threads[beta], { updatedAt: timestamp(1), createdAt: timestamp(2) });
  await fs.writeFile(threadFile, JSON.stringify(fixture));
  await launch();
  await page.locator(".source-session-name").filter({ hasText: "Zeta task" }).waitFor();
  // F08 repo grouping: the repo identities resolve after the first paint (cwd keys until then).
  await poll(async () => (await headingLabels()).join() === "second-project,first-project,Other", "repo buckets then Other");
  assert.equal(await page.locator(".source-session-group").count(), 3);
  assert.deepEqual(await page.locator(".source-session-group").evaluateAll((nodes) => nodes.map((node) => node.dataset.groupKey)),
    [`project:${folderB}`, "project:fixture/first-project", "project:__no_project__"]);
  const otherGroup = page.locator('[data-group-key="project:__no_project__"]');
  assert.equal(await otherGroup.locator('[aria-label^="New session in"]').count(), 0, "Other has no '+'");
  assert.equal(await page.getByRole("button", { name: "New session in second-project", exact: true }).count(), 1);
  // OB/MB project header menu: New session, separator, Move up / Move down where possible, Sort A to Z.
  let projectMenu = await headingMenu("second-project");
  assert.deepEqual(await menuLabels(projectMenu), ["New session", "—", "Move down", "Sort A to Z"]);
  await projectMenu.getByRole("menuitem", { name: "Move down", exact: true }).click();
  await poll(async () => (await headingLabels()).join() === "first-project,second-project,Other", "Move down reorders the projects");
  assert.deepEqual((await readConfig()).projectOrder, ["fixture/first-project", folderB]);
  projectMenu = await headingMenu("second-project");
  assert.deepEqual(await menuLabels(projectMenu), ["New session", "—", "Move up", "Sort A to Z"]);
  await page.keyboard.press("Escape");
  await projectMenu.waitFor({ state: "detached" });
  assert.equal(await page.getByRole("menu", { name: "Group options", exact: true }).count(), 0, "the Other heading has no menu");
  report.checks.push("Folder grouping by repo identity: repo buckets, a final 'Other' with no '+', header menu Move down persisted as projectOrder");
  // pj/bL jump hints: holding ⌘ 250ms shows 1..n; release hides; ⌘2 opens the 2nd row. W12b-FTS-3: Code rows draw
  // shared-21 q0's df-jump-hint, which the loaded shared-styles `.df-session-list [data-jump-hint-row]>kbd` puts at the row end.
  await page.mouse.move(700, 700);
  await page.keyboard.down("Meta");
  await page.waitForTimeout(250);
  assert.deepEqual(await page.locator(".source-session-row > .df-jump-hint").allTextContents(), ["1", "2", "3"]);
  report.metrics = { ...(report.metrics || {}), jumpHint: await page.locator(".source-session-row > .df-jump-hint").first().evaluate((node) => {
    const style = getComputedStyle(node), row = node.parentElement.getBoundingClientRect(), box = node.getBoundingClientRect();
    return { height: box.height, minWidth: style.minWidth, radius: style.borderRadius, fontSize: style.fontSize, fontWeight: style.fontWeight,
      endGap: Math.round(row.right - box.right), rowWidth: Math.round(row.width), ariaHidden: node.getAttribute("aria-hidden") };
  }) };
  assert.equal(report.metrics.jumpHint.height, 16); assert.equal(report.metrics.jumpHint.fontSize, "10px"); assert.equal(report.metrics.jumpHint.ariaHidden, "true");
  assert.ok(report.metrics.jumpHint.endGap < report.metrics.jumpHint.rowWidth / 2, "the keycap sits at the row end");
  await page.keyboard.up("Meta");
  await page.locator(".source-session-row > .df-jump-hint").first().waitFor({ state: "detached" });
  await page.keyboard.press("Meta+2");
  await page.waitForFunction((id) => document.querySelector(`[data-source-session-id="${id}"] [data-row-main-button]`)?.getAttribute("aria-current") === "page", beta);
  report.checks.push("⌘1–9 jump: held ⌘ shows aria-hidden 16px keycaps 1–3 centred on the leading slots, release hides them, ⌘2 opens the second row");
  await setFilter("Group by", "Date");
  assert.deepEqual(await page.locator(".source-session-group").evaluateAll((nodes) => nodes.map((node) => node.dataset.groupKey)), ["day-0", "day-1", "older"]);
  await setFilter("Group by", "None");
  await setFilter("Sort by", "Name");
  assert.deepEqual(await visibleNames(), ["Alpha task", "Beta task", "Zeta task"]);
  await setFilter("Sort by", "Date created");
  assert.deepEqual(await visibleNames(), ["Beta task", "Alpha task", "Zeta task"]);
  await setFilter("Sort by", "Last activity");
  assert.deepEqual(await visibleNames(), ["Zeta task", "Beta task", "Alpha task"]);
  await setFilter("Group by", "State");
  assert.deepEqual(await visibleNames(), ["Zeta task", "Beta task"]);
  await setFilter("Last activity", "All");
  assert.equal((await visibleNames()).length, 3);
  await setFilter("Group by", "Custom groups");
  assert.equal(await page.locator(".source-group-toggle > span:first-child").innerText(), "Ungrouped");
  await setFilter("Group by", "Folder");
  report.checks.push("classic Date/Folder/State/Custom groups/None, all three sorts, State-only cutoff submenus");

  await rename(alpha, "A renamed task");
  await rename(alpha, "Discard this name", false);
  assert.equal(await rowTitle(alpha).innerText(), "A renamed task");
  // F08: the field closes at once with the optimistic label; the stored name follows the RPC.
  await poll(async () => (await readThreads()).threads[alpha].name === "A renamed task", "renamed thread stored");
  report.checks.push("inline rename Enter commits RPC; Escape leaves stored thread name unchanged");
  await rowAction(beta, "Pin");
  await page.locator(`[data-group-key="pinned"] [data-source-session-id="${beta}"]`).waitFor();
  assert.equal(await row(beta).count(), 1);
  await rowAction(beta, "Unpin");
  await page.locator('[data-group-key="pinned"]').waitFor({ state: "detached" });
  await rowAction(beta, "Mark as unread");
  await page.waitForFunction((id) => document.querySelector(`[data-source-session-id="${id}"]`)?.dataset.unread === "true", beta);
  await rowAction(beta, "Mark as read");
  await page.waitForFunction((id) => !document.querySelector(`[data-source-session-id="${id}"]`)?.dataset.unread, beta);
  await rowAction(beta, "Mark as unread");
  await row(beta).locator(".source-session-open").click();
  await poll(async () => (await readConfig()).sessionMetadata?.[beta]?.unread === false, "opening session marks it read");
  report.checks.push("pin/unpin, no duplicated rows, mark unread/read, opening session clears local unread metadata");
  // F08 automatic unread (kR / serverUnread && !paneSelected): beta's turn completes while zeta is open.
  await row(beta).locator(".source-session-open").click();
  await page.getByRole("textbox", { name: "Message DeepSeek" }).fill("fixture:complete delayed-start background reply");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await row(zeta).locator(".source-session-open").click();
  const unreadGlyph = row(beta).locator('.source-leading-slot [role="status"][aria-label="Unread response"] .status-dot[data-kind="ready"]');
  await unreadGlyph.waitFor({ timeout: 10000 });
  await poll(async () => (await readConfig()).sessionMetadata?.[beta]?.unread === true, "background completion persisted unread");
  assert.equal(await row(zeta).locator('[role="status"][aria-label="Unread response"]').count(), 0, "the open session stays read");
  await openRowMenu(beta);
  assert.equal(await sessionMenu().getByRole("menuitem", { name: "Mark as read", exact: true }).count(), 1);
  await page.keyboard.press("Escape");
  await sessionMenu().waitFor({ state: "detached" });
  await row(beta).locator(".source-session-open").click();
  await unreadGlyph.waitFor({ state: "detached" });
  await poll(async () => (await readConfig()).sessionMetadata?.[beta]?.unread === false, "opening the session clears unread");
  assert.equal(await row(beta).locator('[role="img"][aria-label="Idle"]').count(), 1);
  report.checks.push("a turn completing in a background session sets 'Unread response' (accent ready dot, Mark as read); opening it clears it");

  await openRowMenu(beta);
  await sessionMenu().getByRole("menuitem", { name: "Open in", exact: true }).click();
  await page.getByRole("menu", { name: "Open in", exact: true }).getByRole("menuitem", { name: "Finder", exact: true }).click();
  await poll(async () => (await app.evaluate(() => globalThis.sidebarRevealedFolders)).includes(folderB), "reveal-folder IPC");
  report.checks.push("Open in → Finder invokes actual reveal-folder IPC (OS opening intercepted in isolated test)");
  await createGroup(beta, "Research");
  // R01: the custom header's '+' (sidebar-groups.js:17392-17410 cI with the Dz target, :18560-18590; Mz :18411-18427):
  // labelled with the folder the group's sessions share and the group, hover-revealed, it opens Home with that folder
  // and files the started session into the group. The extra session is deleted again so the later counts hold.
  const researchPlus = groupHeading("Research").getByRole("button", { name: "New session in second-project, added to Research", exact: true });
  await page.mouse.move(700, 700);
  await page.evaluate(() => document.activeElement?.blur());
  await poll(async () => await researchPlus.evaluate((node) => getComputedStyle(node.closest(".source-group-reveal")).opacity) === "0", "'+' hidden at rest (no hover or focus within the section)");
  await groupHeading("Research").hover();
  await poll(async () => await researchPlus.evaluate((node) => getComputedStyle(node.closest(".source-group-reveal")).opacity) === "1", "'+' revealed on section hover");
  await researchPlus.click();
  await page.locator('.source-sidebar-nav-row[aria-current="page"]').waitFor();
  await page.locator(".sc-folder-chip").filter({ hasText: "second-project" }).waitFor();
  await page.getByRole("textbox", { name: "Message DeepSeek" }).fill("fixture:complete group plus");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await page.locator(".assistant-message").filter({ hasText: "Fixture response" }).waitFor();
  await page.locator('[data-testid="code-prompt-stop"]:not([inert] *)').waitFor({ state: "detached" });
  const researchId = (await readConfig()).customGroups.find((group) => group.name === "Research").id;
  const plusId = await page.locator('.source-session-row[data-selected="focused"]').getAttribute("data-source-session-id");
  assert.ok(plusId && ![zeta, alpha, beta].includes(plusId), "a new session is open");
  await poll(async () => (await readConfig()).sessionMetadata?.[plusId]?.customGroupId === researchId, "the started session is filed into Research");
  await page.locator(`[data-group-key="custom:${researchId}"] [data-source-session-id="${plusId}"]`).waitFor();
  assert.equal((await readThreads()).threads[plusId].cwd, folderB);
  await rowAction(plusId, "Delete");
  const plusDelete = page.getByRole("alertdialog", { name: "Delete session?", exact: true });
  await plusDelete.getByRole("button", { name: "Delete", exact: true }).click();
  await row(plusId).waitFor({ state: "detached" });
  await poll(async () => !(await readThreads()).threads[plusId], "the extra session is deleted again");
  report.checks.push("custom group header '+' (hover-revealed, 'New session in second-project, added to Research') opens Home with the group's folder and files the sent session into the group");
  // F08 XB: the custom header's context menu (no ⋮ trigger); Rename group is an inline header field.
  assert.equal(await page.getByRole("button", { name: /^More options for group/ }).count(), 0);
  let groupMenu = await headingMenu("Research");
  assert.deepEqual(await menuLabels(groupMenu), ["New session", "—", "Rename group", "New group…", "—", "Sort A to Z", "—", "Delete group"]);
  await groupMenu.getByRole("menuitem", { name: "Rename group", exact: true }).click();
  const groupField = page.locator(".source-sidebar").getByRole("textbox", { name: "Rename group", exact: true });
  await groupField.waitFor();
  await page.waitForTimeout(300);
  await groupField.fill("Delivery");
  await groupField.press("Enter");
  await groupField.waitFor({ state: "detached" });
  await page.locator(".source-group-toggle").filter({ hasText: "Delivery" }).waitFor();
  await poll(async () => (await readConfig()).customGroups[0]?.name === "Delivery", "inline group rename saved");
  groupMenu = await headingMenu("Delivery");
  await groupMenu.getByRole("menuitem", { name: "Delete group", exact: true }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "Delete group?", exact: true });
  await deleteDialog.waitFor();
  assert.equal(await deleteDialog.getByText("“Delivery” will be removed. The 1 item in it will no longer be grouped.", { exact: true }).count(), 1);
  await deleteDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await poll(async () => (await readConfig()).customGroups.length === 0, "custom group removed");
  assert.equal(await row(beta).count(), 1);
  assert.equal((await readConfig()).sessionMetadata[beta].customGroupId, null);
  await createGroup(beta, "Keep group");
  report.checks.push("custom group create+assignment, rename, removal preserves threads and clears assignments");

  await rowAction(alpha, "Archive");
  await row(alpha).waitFor({ state: "detached" });
  await setFilter("Status", "Archived");
  assert.deepEqual(await visibleNames(), ["A renamed task"]);
  assert.equal((await readThreads()).threads[alpha].archived, true);
  await rowAction(alpha, "Unarchive");
  await row(alpha).waitFor({ state: "detached" });
  await setFilter("Status", "All");
  assert.equal((await visibleNames()).length, 3);
  assert.equal((await readThreads()).threads[alpha].archived, false);
  await rowAction(alpha, "Archive");
  await page.waitForFunction((id) => document.querySelector(`[data-source-session-id="${id}"]`)?.dataset.archived === "true", alpha);
  await rowAction(zeta, "Pin");
  await setFilter("Group by", "Folder");
  await setFilter("Sort by", "Name");
  await page.getByRole("button", { name: /^Filter(?: \(active\))?$/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Show empty groups", exact: true }).click();
  assert.equal(await page.getByRole("menu", { name: "Filter sessions", exact: true }).count(), 1);
  await page.keyboard.press("Escape");
  report.checks.push("archive/unarchive use fixture server state, Active/Archived/All filters, keep-open checkbox");

  await row(zeta).locator(".source-session-open").focus();
  await page.keyboard.press("ArrowDown");
  assert.ok(await page.evaluate(() => document.activeElement.hasAttribute("data-roving-item")));
  await row(zeta).locator(".source-session-open").press("Shift+F10");
  await sessionMenu().waitFor();
  await page.keyboard.press("Escape");
  report.metrics = await row(zeta).evaluate((element) => {
    const label = element.querySelector(".source-session-open");
    const leading = element.querySelector(".source-leading-slot");
    const style = getComputedStyle(label);
    return { rowHeight: element.getBoundingClientRect().height, fontSize: style.fontSize, padding: style.padding, gap: style.gap,
      leadingWidth: leading.getBoundingClientRect().width, radius: getComputedStyle(element).borderRadius,
      iconFont: getComputedStyle(element.querySelector('[data-cds="Icon"]')).fontFamily };
  });
  assert.equal(report.metrics.rowHeight, 26); assert.equal(report.metrics.fontSize, "13px");
  assert.equal(report.metrics.leadingWidth, 24); assert.equal(report.metrics.radius, "6px");
  report.checks.push("keyboard row navigation, context-menu key, source row dimensions and original icon font");
  const beforeRestart = await readConfig();
  const shot = path.join(evidence, "sidebar-source-fixture.png");
  await page.screenshot({ path: shot }); report.screenshots.push(shot);
  await close();
  await launch();
  await row(zeta).waitFor(); await row(alpha).waitFor(); await row(beta).waitFor();
  const afterRestart = await readConfig();
  assert.deepEqual(afterRestart.sidebarPreferences, beforeRestart.sidebarPreferences);
  assert.deepEqual(afterRestart.sessionMetadata, beforeRestart.sessionMetadata);
  assert.deepEqual(afterRestart.customGroups, beforeRestart.customGroups);
  assert.equal(afterRestart.sessionMetadata[zeta].pinned, true);
  assert.ok(afterRestart.sessionMetadata[beta].customGroupId);
  assert.ok(afterRestart.archivedThreadIds.includes(alpha));
  assert.ok(!afterRestart.threadIds.includes(alpha));
  assert.equal(await rowTitle(alpha).innerText(), "A renamed task");
  assert.equal(await row(alpha).getAttribute("data-archived"), "true");
  const finalThreads = (await readThreads()).threads;
  assert.equal(Object.keys(finalThreads).length, 3);
  for (const record of Object.values(finalThreads)) {
    assert.equal(record.turns[0].status, "completed");
    assert.equal(record.turns[0].items.at(-1).text, "Fixture response");
  }
  assert.equal(finalThreads[beta].cwd, folderB); assert.equal(finalThreads[alpha].cwd, folderA);
  report.checks.push("restart preserves preferences, pin/read/group metadata, rename and real thread archived/cwd/turn fields");
  await setFilter("Status", "Archived");
  await row(alpha).locator(".source-session-open").click();
  await page.getByRole("button", { name: "Restore session", exact: true }).click();
  await page.getByRole("button", { name: "Restore session", exact: true }).waitFor({ state: "detached" });
  await page.getByRole("textbox", { name: "Message DeepSeek" }).fill("fixture:complete after archived read and restore");
  await page.locator('[data-testid="code-prompt-send"]:not([inert] *)').click();
  await poll(async () => {
    const restored = (await readThreads()).threads[alpha];
    return restored.turns.length === 2 && restored.turns[1].status === "completed";
  }, "restored thread is resumed before starting its next turn");
  assert.equal((await readThreads()).threads[alpha].archived, false);
  report.checks.push("after restart: Archived → read thread → Restore session → send resumes unloaded thread before turn/start");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) {
    report.pageText = (await page.locator("body").innerText().catch(() => "")).slice(0, 16000);
    const screenshot = path.join(evidence, "sidebar-source-failure.png");
    await page.screenshot({ path: screenshot }).then(() => report.screenshots.push(screenshot)).catch(() => {});
  }
  process.exitCode = 1;
} finally {
  await close().catch(() => {});
  vite.kill("SIGTERM");
  report.finishedAt = new Date().toISOString();
  if (!report.passed) report.serverLog = serverLog.slice(-5000);
  await fs.writeFile(path.join(evidence, "sidebar-ui-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
