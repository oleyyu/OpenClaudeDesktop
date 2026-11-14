// integration-2 links: the host's one link policy (electron/main.cjs installLinkPolicy, after the 4.16336.0 main view's
// window-open handler `oe` / Y9 / _b and will-navigate Mwo, asar/.vite/build/index.chunk-Du-Wqi0E.js) in the real app.
// Isolated profile in os.tmpdir(), fixture core (tests/fixtures/codex-server.cjs), throwaway CODEX_HOME; 1440x900, en-US.
// shell.openExternal is replaced in the main process before any click, so no browser is ever opened; every call is
// recorded. Checks: a Code transcript markdown link, a Chat transcript markdown link and the r4e plugin Overview's
// linkified description each reach shell.openExternal exactly once with their URL; window.open of an http(s) / mailto:
// URL goes to the stub, every other scheme or a URL with credentials is denied without a call; an in-window navigation to
// an external URL is cancelled (the page stays) and goes to the stub; no BrowserWindow is ever created.
// Usage: node --max-old-space-size=4096 scripts/external-links-ui-test.mjs  (needs a built app/dist; writes the report to
// analysis/claude-4.16336.0-migrate-20261104/integration-2/links/gui-links.json and screenshots next to it).
import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(root, "../analysis/claude-4.16336.0-migrate-20261104/integration-2/links");
await fs.mkdir(path.join(out, "gui"), { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "links-gui-profile-"));
const workspace = path.join(profile, "workspace"), codexHome = path.join(profile, "codex-home");
await fs.mkdir(workspace); await fs.mkdir(codexHome);
const now = Math.floor(Date.now() / 1000);
const URLS = { code: "https://example.com/code-link", chat: "https://example.com/chat-link", plugin: "https://example.com/plugin-docs" };
const thread = (id, name, text, updated) => ({ id, cwd: workspace, name, createdAt: updated, updatedAt: updated, archived: false,
  turns: [{ id: `${id}-turn`, status: "completed", items: [
    { id: `${id}-user`, type: "userMessage", content: [{ type: "text", text: "Where are the docs?" }] },
    { id: `${id}-agent`, type: "agentMessage", text } ] }] });
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  "links-code": thread("links-code", "Links code session", `Code docs: [Code docs link](${URLS.code}).`, now),
  "links-chat": thread("links-chat", "Links chat session", `Chat docs: [Chat docs link](${URLS.chat}).`, now - 60),
} }));
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({ cwd: workspace, mode: "code", theme: "light", locale: "en-US", model: "fixture",
  effort: "low", permission: "auto", threadIds: ["links-code", "links-chat"], sidebarWidth: 288, displayName: "Local user", onboardingComplete: true,
  sessionMetadata: { "links-chat": { surface: "chat" } } }));
const pluginDir = path.join(codexHome, "plugins/fx-plugin");
await fs.writeFile(path.join(profile, "fixture-customize.json"), JSON.stringify({ plugins: {
  marketplaces: [{ name: "fx-market", path: path.join(codexHome, "plugins/fx-market.json"), interface: { displayName: "Fixture Market" }, plugins: [
    { id: "fx-plugin", name: "fx-plugin", installed: true, enabled: true, source: { type: "local", path: pluginDir }, interface: { displayName: "Fx Plugin", developerName: "Fixture Labs" } }] }],
  details: [{ marketplaceName: "fx-market", summary: { id: "fx-plugin", name: "fx-plugin" }, description: `Fixture plugin. Docs at ${URLS.plugin} for setup.`,
    skills: [], hooks: [], apps: [], mcpServers: [] }] } }));
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_HOME: codexHome, CODE_DESKTOP_COWORK: "0", CODE_DESKTOP_OFFSCREEN_LAUNCH: "1",
  CODE_DESKTOP_LOCALE: "en-US", CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs") };
delete env.ELECTRON_RUN_AS_NODE; delete env.CODE_DESKTOP_DEV_URL;

const report = { purpose: "integration-2 links: Electron isolated-profile link policy check", startedAt: new Date().toISOString(), checks: [], pageErrors: [], consoleErrors: [] };
const build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
report.build = { builtAt: build.builtAt, sourceSha256: build.sourceSha256 };
let app, page;
const opened = () => app.evaluate(() => globalThis.__linksOpened.slice());
const windows = () => app.evaluate(({ BrowserWindow }) => ({ count: BrowserWindow.getAllWindows().length, created: globalThis.__linksCreated }));
async function expectOpened(label, before, urls) {
  const deadline = Date.now() + 5000;
  let calls;
  do { calls = (await opened()).slice(before); if (calls.length >= urls.length) break; await page.waitForTimeout(100); } while (Date.now() < deadline);
  await page.waitForTimeout(600); // a second (duplicate) open would land here
  calls = (await opened()).slice(before);
  assert.deepEqual(calls, urls, `${label}: shell.openExternal calls`);
  const w = await windows();
  assert.equal(w.count, 1, `${label}: window count`); assert.equal(w.created, 0, `${label}: no BrowserWindow created`);
  report.checks.push({ check: label, openExternal: calls, windows: w.count, created: w.created });
}
const shot = name => page.screenshot({ path: path.join(out, "gui", `${name}.png`) });
try {
  app = await electron.launch({ executablePath: path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"), args: [root], env, timeout: 30000 });
  // Stub before the first window can act: record, never open.
  await app.evaluate(({ shell, app: electronApp }) => {
    globalThis.__linksOpened = []; globalThis.__linksCreated = 0;
    shell.openExternal = async url => { globalThis.__linksOpened.push(url); };
    electronApp.on("browser-window-created", () => { globalThis.__linksCreated++; });
  });
  assert.equal(await app.evaluate(({ shell }) => shell.openExternal.toString().includes("__linksOpened")), true, "shell.openExternal is stubbed");
  page = await app.firstWindow();
  page.on("pageerror", e => report.pageErrors.push(e.message));
  page.on("console", m => { if (m.type() === "error") report.consoleErrors.push(m.text().slice(0, 300)); });
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1440, 900); w.webContents.setBackgroundThrottling(false); });
  await page.getByRole("radio", { name: "Code", exact: true }).waitFor({ timeout: 30000 });

  // 1. Code transcript markdown link.
  await page.getByText("Links code session", { exact: true }).first().click({ timeout: 10000 });
  const codeLink = page.getByRole("link", { name: "Code docs link" }).first();
  await codeLink.waitFor({ timeout: 15000 });
  report.codeLink = await codeLink.evaluate(a => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), cds: a.dataset.cds ?? null }));
  await shot("code-session");
  let before = (await opened()).length;
  await codeLink.click();
  await expectOpened("Code markdown link click", before, [URLS.code]);

  // 2. window.open / navigation policy, from the app's own window (the native path c4acc1503 h leaves to the shell).
  before = (await opened()).length;
  const results = await page.evaluate(() => ["https://example.com/window-open", "mailto:someone@example.com", "file:///etc/hosts", "javascript:void(0)",
    "https://user:secret@example.com/creds", "ftp://example.com/x", "tel:+15550100"].map(url => window.open(url, "_blank") === null));
  assert.deepEqual(results, [true, true, true, true, true, true, true], "window.open always returns null (denied)");
  await expectOpened("window.open policy (http(s) + mailto opened, file/javascript/credentials/ftp/tel denied)", before,
    ["https://example.com/window-open", "mailto:someone@example.com"]);

  // 3. r4e plugin Overview description link.
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Settings/ }).click();
  const settings = page.getByRole("dialog", { name: "Settings", exact: true });
  await settings.waitFor({ timeout: 10000 });
  await settings.getByRole("navigation", { name: "Settings", exact: true }).getByRole("button", { name: "Plugins", exact: true }).click();
  await page.locator('[data-testid="plugins-tabbed-list-row"][data-plugin-id="fx-plugin"] > button').click({ timeout: 10000 });
  const overviewTab = page.locator('[data-cz-detail="plugin"]').getByRole("tab", { name: "Overview", exact: true });
  if (await overviewTab.count()) await overviewTab.click();
  const pluginLink = page.locator(`[data-plugin-overview] a[href="${URLS.plugin}"]`);
  await pluginLink.waitFor({ timeout: 10000 });
  report.pluginLink = await pluginLink.evaluate(a => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), cds: a.dataset.cds ?? null }));
  await shot("plugin-overview");
  before = (await opened()).length;
  await pluginLink.click();
  await expectOpened("r4e plugin Overview description link click", before, [URLS.plugin]);
  await settings.getByRole("button", { name: "Close", exact: true }).click();
  await settings.waitFor({ state: "detached" });

  // 4. Chat transcript markdown link.
  await page.evaluate(() => [...document.querySelectorAll("[role=radio]")].find(r => r.getAttribute("aria-label") !== "Code").click());
  await page.waitForTimeout(1500);
  await page.getByText("Links chat session", { exact: true }).first().click({ timeout: 10000 });
  const chatLink = page.getByRole("link", { name: "Chat docs link" }).first();
  await chatLink.waitFor({ timeout: 15000 });
  report.chatLink = await chatLink.evaluate(a => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), cds: a.dataset.cds ?? null }));
  await shot("chat-session");
  before = (await opened()).length;
  await chatLink.click();
  // The Chat link first asks (c82d645d5 J: "Open external link"); nothing opens until its own "Open link" is pressed.
  const confirm = page.getByRole("button", { name: "Open link", exact: true });
  await confirm.waitFor({ timeout: 8000 });
  report.chatConfirm = true; await shot("chat-confirm");
  assert.deepEqual((await opened()).slice(before), [], "nothing opens before the Chat link is confirmed");
  await confirm.click();
  await expectOpened("Chat markdown link click (after its Open external link confirmation)", before, [URLS.chat]);

  // 5. In-window navigation (last: Playwright keeps waiting on a navigation the main process cancelled).
  before = (await opened()).length;
  const appUrl = page.url();
  await page.evaluate(() => { location.href = "https://example.com/navigated"; });
  await page.waitForTimeout(800);
  assert.equal(page.url(), appUrl, "the page did not leave the app");
  assert.ok(page.url().startsWith("file:"), `page stays on the app: ${page.url()}`);
  await expectOpened("in-window navigation to an external URL", before, ["https://example.com/navigated"]);
  before = (await opened()).length;
  await page.evaluate(() => { location.href = "file:///etc/hosts"; });
  await page.waitForTimeout(800);
  assert.ok(page.url().startsWith("file:") && !page.url().includes("/etc/hosts"), "file navigation cancelled");
  await expectOpened("in-window navigation to a file URL (cancelled, not opened)", before, []);

  assert.deepEqual(report.pageErrors, [], "no page errors");
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = error.stack?.split("\n").slice(0, 6).join("\n");
  if (page) { await shot("failure").catch(() => {}); report.failureText = await page.evaluate(() => document.body.innerText.slice(0, 2000)).catch(() => null); }
  if (app) report.openedAtFailure = await opened().catch(() => null);
} finally {
  if (app) { await Promise.race([app.close().catch(() => {}), new Promise(r => setTimeout(r, 15000))]); try { app.process().kill("SIGKILL"); } catch {} }
  await fs.rm(profile, { recursive: true, force: true });
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, "gui-links.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ passed: report.passed, error: report.error, checks: report.checks.map(c => c.check), pageErrors: report.pageErrors.length }, null, 1));
process.exitCode = report.passed ? 0 : 1;
