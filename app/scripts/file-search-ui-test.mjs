import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

// Integrated UI + real temporary Git repositories. No production profile or
// account is used. The only race adapter delays a real IPC outcome in this
// isolated Electron host; it never supplies invented files or production hooks.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
const at = new Date().toISOString();
const runDirectory = path.join(
  evidence,
  `file-search-ui-${at.replaceAll(":", "-")}`,
);
await fs.mkdir(runDirectory, { recursive: true });
const profile = await fs.mkdtemp(path.join(runDirectory, "profile-"));
const workspaceA = path.join(profile, "workspace-a");
const workspaceB = path.join(profile, "workspace-b");
const outside = path.join(profile, "outside-the-selected-workspace");
const sessionA = "file-search-fixture-a",
  sessionB = "file-search-fixture-b";
const names = {
  [sessionA]: "File search fixture A",
  [sessionB]: "File search fixture B",
};
const deepFile = "deep/never/opened/UniqueNeedle.ts";
const checks = [],
  metrics = {},
  screenshots = [],
  rendererErrors = [];
let app,
  page,
  buildInfo,
  runtime,
  failure,
  ipcRecords = [],
  movedWorkspace = false;
let requestNumber = 0;

const panel = () =>
  page.getByRole("complementary", { name: "Files panel", exact: true });
const input = () =>
  panel().getByRole("textbox", { name: "Filter files", exact: true });
// F11: the kept tree is labelled "Project files" too (panes-tile-current.js:4727: one tree whose rows are
// either the folder tree or the filename results), so each is addressed by its element; only one is shown.
const results = () =>
  panel().locator('.sfs-results[role="tree"][aria-label="Project files"]');
const tree = () =>
  panel().locator('.sfs-kept-tree [role="tree"][aria-label="Project files"]');
const resultButton = (pathname) =>
  results().getByRole("button", { name: pathname, exact: true });
// These fixture paths are ASCII CSS strings; quoting also keeps '/' literal.
const treeRow = (pathname) =>
  tree().locator(`[data-tree-row-body]:has(> [data-tree-primary][data-file-path=${JSON.stringify(pathname)}])`); // 0.2.97: rows have no native title (panes-tile-current.js:5692 Wr.Trigger).
const tabs = () => panel().locator(".source-file-tab");
const tabPaths = () =>
  tabs().evaluateAll((nodes) => nodes.map((node) => node.dataset.filePath));
const previewText = () => panel().locator(".source-file-preview").textContent();
async function screenshot(name) {
  const file = path.join(runDirectory, name);
  await page.screenshot({ path: file });
  screenshots.push(file);
}
async function size(width, height = 852) {
  await app.evaluate(
    ({ BrowserWindow }, bounds) =>
      BrowserWindow.getAllWindows()[0].setContentSize(
        bounds.width,
        bounds.height,
      ),
    { width, height },
  );
  await page.waitForTimeout(120);
}
async function ensureFiles() {
  if (!(await panel().isVisible())) {
    await page
      .getByRole("button", { name: "View options", exact: true })
      .click();
    await page
      .getByRole("menuitemcheckbox", { name: "Files", exact: true })
      .click();
  }
  await panel().waitFor();
}
async function ensureBrowser() {
  await ensureFiles();
  const show = panel().getByRole("button", {
    name: "Show file tree",
    exact: true,
  });
  if (await show.isVisible()) await show.click();
  await input().waitFor({ state: "visible" });
}
async function selectSession(id) {
  await page
    .locator(`[data-source-session-id="${id}"] .source-session-open`)
    .click();
  await page.waitForFunction(
    (name) => document.querySelector(".st-title")?.textContent.includes(name),
    names[id],
  );
  await page.locator(".loading-state").waitFor({ state: "hidden" });
  await ensureBrowser();
}
async function phase(value) {
  await panel().locator(`.sfs-browser[data-search-phase="${value}"]`).waitFor();
}
async function query(value) {
  await ensureBrowser();
  await input().fill(value);
  await phase("success");
  assert.equal(await input().inputValue(), value);
}
async function assertFocused(locator) {
  assert.equal(
    await locator.evaluate((node) => node === node.ownerDocument.activeElement),
    true,
  );
}
async function waitHost(predicate, message) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail(message);
}
async function armGate(id, sessionId, query) {
  await app.evaluate(
    (_, gate) => globalThis.fileSearchUiFixture.armed.push(gate),
    { id, sessionId, query },
  );
}
async function heldGate(id) {
  await waitHost(
    () =>
      app.evaluate((_, id) => globalThis.fileSearchUiFixture.held.has(id), id),
    `Real filename IPC did not reach gate ${id}`,
  );
  return app.evaluate(
    (_, id) => globalThis.fileSearchUiFixture.held.get(id).summary,
    id,
  );
}
async function releaseGate(id) {
  await app.evaluate(
    (_, id) => globalThis.fileSearchUiFixture.held.get(id)?.release(),
    id,
  );
  await waitHost(
    () =>
      app.evaluate(
        (_, id) => globalThis.fileSearchUiFixture.delivered.includes(id),
        id,
      ),
    `Gate ${id} was not delivered`,
  );
  // Let the real IPC reply and React promise handlers run after host delivery.
  await page.waitForTimeout(120);
}
async function call(action, params) {
  return page.evaluate(
    ({ action, params }) => window.desktop.call(action, params),
    { action, params },
  );
}
async function invalidCall(params) {
  return page.evaluate(async (params) => {
    try {
      await window.desktop.call("files:search", params);
      return null;
    } catch (error) {
      return error.message;
    }
  }, params);
}
async function writeFile(cwd, relative, text) {
  const target = path.join(cwd, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, text);
}

try {
  const build = JSON.parse(
    await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"),
  );
  const packageInfo = JSON.parse(
    await fs.readFile(path.join(root, "package.json"), "utf8"),
  );
  buildInfo = {
    version: build.version,
    builtAt: build.builtAt,
    sourceSha256: build.sourceSha256,
  };
  assert.equal(
    build.version,
    packageInfo.version,
    "Build version must match the current package",
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(build.sources)).digest("hex"),
    build.sourceSha256,
  );
  for (const entry of build.sources)
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(path.join(root, entry.path)))
        .digest("hex"),
      entry.sha256,
      `Build is stale: ${entry.path}`,
    );
  assert.ok(
    build.sources.some((entry) => entry.path === "src/source-files-search.jsx"),
  );
  assert.ok(
    build.sources.some(
      (entry) => entry.path === "electron/file-name-search.cjs",
    ),
  );

  await Promise.all(
    [workspaceA, workspaceB, outside].map((folder) => fs.mkdir(folder)),
  );
  await writeFile(workspaceA, ".gitignore", "ignored/\n");
  await writeFile(workspaceA, "kept/AnchorKeep.txt", "ANCHOR_A_STAYS_OPEN\n");
  await writeFile(workspaceA, deepFile, "DEEP_A_REAL_PREVIEW\n");
  await writeFile(
    workspaceA,
    "ignored/UniqueNeedleIgnored.txt",
    "MUST_NOT_APPEAR_IN_SEARCH\n",
  );
  await writeFile(workspaceA, "BoundaryToken-inside-a.txt", "INSIDE_A\n");
  await writeFile(workspaceA, "SharedRace-A.txt", "RACE_A\n");
  await writeFile(
    workspaceA,
    "delayed/DelayedTarget.txt",
    "DELAYED_TARGET_A\n",
  );
  await writeFile(
    workspaceA,
    "delayed/BlurTarget.txt",
    "BLUR_MUST_NOT_AUTO_OPEN\n",
  );
  await writeFile(workspaceA, "RecoverableFile.txt", "RECOVERED_REAL_SEARCH\n");
  for (let n = 0; n < 55; n++)
    await writeFile(
      workspaceA,
      `many/ManyHit-${String(n).padStart(2, "0")}.txt`,
      `MANY_FILE_${n}\n`,
    );
  await writeFile(workspaceB, "BoundaryToken-inside-b.txt", "INSIDE_B\n");
  await writeFile(workspaceB, "SharedRace-B.txt", "RACE_B\n");
  await writeFile(workspaceB, "ClosePending-B.txt", "CLOSE_PENDING_B\n");
  await writeFile(
    outside,
    "BoundaryToken-OUTSIDE.txt",
    "OUTSIDE_SELECTED_ROOT\n",
  );
  const gitEnvironment = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
    ),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  for (const cwd of [workspaceA, workspaceB]) {
    execFileSync("git", ["-C", cwd, "init", "-q"], {
      env: gitEnvironment,
      stdio: "pipe",
    });
    execFileSync("git", ["-C", cwd, "add", "."], {
      env: gitEnvironment,
      stdio: "pipe",
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const fixtureThreads = Object.fromEntries(
    [
      [sessionA, workspaceA],
      [sessionB, workspaceB],
    ].map(([id, cwd]) => [
      id,
      {
        id,
        cwd,
        name: names[id],
        createdAt: now,
        updatedAt: now,
        archived: false,
        turns: [],
      },
    ]),
  );
  await fs.writeFile(
    path.join(profile, "preferences.json"),
    JSON.stringify({
      cwd: workspaceA,
      theme: "light",
      mode: "code",
      model: "fixture",
      displayName: "Fixture",
      sidebarWidth: 288,
      threadIds: [sessionA, sessionB],
      threadMetadata: fixtureThreads,
    }),
  );
  await fs.writeFile(
    path.join(profile, "fixture-threads.json"),
    JSON.stringify({ next: 100, threads: fixtureThreads }),
  );
  const env = {
    ...process.env,
    CODE_DESKTOP_DATA: profile,
    CODEX_BINARY: path.join(root, "tests/fixtures/codex-server.cjs"),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.CODE_DESKTOP_DEV_URL;
  app = await electron.launch({
    executablePath:
      process.env.TEST_ELECTRON_BINARY ||
      path.join(
        root,
        "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
      ),
    args: [root],
    env,
  });
  page = await app.firstWindow();
  page.on("pageerror", (error) => rendererErrors.push(error.message));
  runtime = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
  }));
  assert.equal(runtime.version, buildInfo.version);
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await size(1468);
  await selectSession(sessionA);

  await app.evaluate(({ ipcMain }) => {
    const channel = "desktop:call";
    const original = ipcMain._invokeHandlers?.get(channel);
    if (typeof original !== "function")
      throw new Error(
        "This Electron test adapter cannot access the registered IPC handler.",
      );
    const fixture = { records: [], armed: [], held: new Map(), delivered: [] };
    globalThis.fileSearchUiFixture = fixture;
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, action, params = {}) => {
      const watched = ["files:search", "files:search:cancel"].includes(action);
      const record = watched
        ? { action, params: { ...params }, at: Date.now() }
        : null;
      if (record) fixture.records.push(record);
      const gateIndex =
        action === "files:search"
          ? fixture.armed.findIndex(
              (gate) =>
                gate.sessionId === params.sessionId &&
                gate.query === params.query,
            )
          : -1;
      const gate =
        gateIndex >= 0 ? fixture.armed.splice(gateIndex, 1)[0] : null;
      let result, error;
      try {
        result = await original(event, action, params);
      } catch (caught) {
        error = caught;
      }
      if (record)
        record.outcome = error
          ? { thrown: error.message }
          : {
              error: result?.error?.code || null,
              cancelled: action.endsWith(":cancel") ? result : undefined,
              root: result?.root,
              paths: result?.matches?.map((match) => match.path),
            };
      if (gate) {
        await new Promise((resolve) =>
          fixture.held.set(gate.id, {
            release: resolve,
            summary: {
              requestId: params.requestId,
              sessionId: params.sessionId,
              query: params.query,
              ...record.outcome,
            },
          }),
        );
        fixture.held.delete(gate.id);
        fixture.delivered.push(gate.id);
      }
      if (error) throw error;
      return result;
    });
    fixture.restore = () => {
      fixture.held.forEach((gate) => gate.release());
      fixture.armed = [];
      ipcMain.removeHandler(channel);
      ipcMain.handle(channel, original);
    };
  });

  // Security/ownership checks go through the actual trusted renderer IPC path.
  const payload = (sessionId, pane = "main") => ({
    sessionId,
    pane,
    requestId: `boundary-${++requestNumber}`,
    query: "BoundaryToken",
    cwd: outside,
    root: outside,
  });
  const scoped = await page.evaluate(
    async (requests) =>
      Promise.all(
        requests.map((request) => window.desktop.call("files:search", request)),
      ),
    [
      { ...payload(sessionA), homeWorkspace: outside },
      { ...payload(sessionB, "artifacts"), homeWorkspace: outside },
    ],
  );
  assert.deepEqual(
    scoped.map((result) => result.error),
    [null, null],
  );
  assert.notEqual(
    scoped[0].scope,
    scoped[1].scope,
    "Main and Artifacts must not supersede one another",
  );
  assert.deepEqual(
    scoped.map((result) => result.matches.map((match) => match.path)),
    [["BoundaryToken-inside-a.txt"], ["BoundaryToken-inside-b.txt"]],
  );
  assert.deepEqual(
    scoped.map((result) => result.requestedRoot),
    [workspaceA, workspaceB],
  );
  const home = await call("files:search", payload(null));
  assert.equal(home.requestedRoot, workspaceA);
  assert.deepEqual(
    home.matches.map((match) => match.path),
    ["BoundaryToken-inside-a.txt"],
  );
  assert.match(
    await invalidCall({ ...payload(null), homeWorkspace: outside }),
    /Unknown home workspace/,
  );
  assert.match(
    await invalidCall(payload("not-a-known-session")),
    /Unknown session/,
  );
  assert.match(
    await invalidCall(payload(sessionA, "invented-pane")),
    /Unknown file browser/,
  );
  checks.push(
    "Real IPC derives roots from main-process session/config data, ignores forged session cwd/root/homeWorkspace, rejects unknown session/pane and unapproved home roots, and keeps main/Artifacts scopes independent",
  );

  // New keeps the current renderer project, even when config.cwd still points
  // at A. The home hint must select a main-process-known root, not widen access.
  // Keep the existing Files pane: the actual home titlebar has no Files menu.
  await selectSession(sessionB);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.locator(".welcome").waitFor();
  assert.equal(await panel().isVisible(), true);
  assert.equal(
    await page
      .getByRole("button", { name: "View options", exact: true })
      .count(),
    0,
  );
  await input().waitFor({ state: "visible" });
  assert.equal(await input().inputValue(), "");
  await query("BoundaryToken");
  await resultButton("BoundaryToken-inside-b.txt").waitFor();
  assert.equal(await resultButton("BoundaryToken-inside-a.txt").count(), 0);
  const homeBRequest = await app.evaluate(() =>
    globalThis.fileSearchUiFixture.records
      .filter((record) => record.action === "files:search")
      .at(-1),
  );
  assert.equal(homeBRequest.params.sessionId, null);
  assert.equal(homeBRequest.params.homeWorkspace, workspaceB);
  assert.deepEqual(homeBRequest.outcome.paths, ["BoundaryToken-inside-b.txt"]);

  const newInA = page.getByRole("button", {
    name: "New session in workspace-a",
    exact: true,
  });
  await page.locator(".source-session-group").filter({ has: newInA }).hover();
  await newInA.click();
  await page.locator(".welcome").waitFor();
  assert.equal(await panel().isVisible(), true);
  await page.waitForFunction(
    () =>
      document.querySelector(
        '.source-file-panel input[aria-label="Filter files"]',
      )?.value === "",
  );
  await query("BoundaryToken");
  await resultButton("BoundaryToken-inside-a.txt").waitFor();
  assert.equal(await resultButton("BoundaryToken-inside-b.txt").count(), 0);
  const homeARequest = await app.evaluate(() =>
    globalThis.fileSearchUiFixture.records
      .filter((record) => record.action === "files:search")
      .at(-1),
  );
  assert.equal(homeARequest.params.sessionId, null);
  assert.equal(homeARequest.params.homeWorkspace, workspaceA);
  assert.deepEqual(homeARequest.outcome.paths, ["BoundaryToken-inside-a.txt"]);
  await screenshot("home-known-workspace.png");
  checks.push(
    "Config A → session B → New keeps Files and searches trusted B; choosing A's sidebar New session action searches A on home, with null session and the exact approved homeWorkspace in real IPC",
  );
  await selectSession(sessionA);

  await tree().getByRole("button", { name: "kept", exact: true }).click();
  // Fidelity F11 opens a tab synchronously and drops the tree peek (panes-state-current.js F / vi): the first click
  // swaps the tree for the viewer, so keep the preview through its tab's double-click instead of the row's.
  await tree()
    .getByRole("button", { name: "AnchorKeep.txt", exact: true })
    .click();
  await panel()
    .locator('.source-file-tab[data-file-path$="AnchorKeep.txt"][data-preview]')
    .dblclick();
  await panel()
    .locator(".source-file-preview")
    .filter({ hasText: "ANCHOR_A_STAYS_OPEN" })
    .waitFor();
  await ensureBrowser();
  assert.equal(
    await treeRow("kept").locator("..").getAttribute("aria-expanded"),
    "true",
  );
  assert.equal(
    await treeRow("deep").locator("..").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await tree()
      .getByRole("button", { name: "UniqueNeedle.ts", exact: true })
      .count(),
    0,
  );
  await query("UniqueNeedle");
  assert.equal(await results().getByRole("treeitem").count(), 1);
  await resultButton(deepFile).waitFor();
  assert.equal(
    await results()
      .getByRole("button", { name: /UniqueNeedleIgnored/ })
      .count(),
    0,
  );
  assert.equal(await input().getAttribute("placeholder"), "Filter files…");
  metrics.wide = await panel().evaluate((node) => {
    const bar = node.querySelector(".sfs-filter-bar"),
      field = node.querySelector(".sfs-field"),
      row = node.querySelector(".sfs-result-row");
    return {
      paneWidth: node.clientWidth,
      barHeight: bar.getBoundingClientRect().height,
      fieldHeight: field.getBoundingClientRect().height,
      rowHeight: row.getBoundingClientRect().height,
      radius: getComputedStyle(field).borderRadius,
    };
  });
  assert.equal(metrics.wide.barHeight, 32);
  assert.equal(metrics.wide.fieldHeight, 24);
  assert.equal(metrics.wide.rowHeight, 24);
  await screenshot("wide-search.png");
  await resultButton(deepFile).click();
  await panel()
    .locator(".source-file-preview")
    .filter({ hasText: "DEEP_A_REAL_PREVIEW" })
    .waitFor();
  // A result click opens a preview tab, whose name ends with the sr-only
  // ", preview" hint (panes-tabs-current.js:436-441).
  await panel()
    // HANDOFF 0.2.119: the ", preview" name was written unexecuted (0.2.101); the source `.sr-only`
    // (design-system.css:4083-4093) is position:absolute, so accname pads it with spaces
    // (same markup locally, source-session.jsx:929; session-ui-test.mjs:513-517, 0.2.118).
    .getByRole("tab", { name: "UniqueNeedle.ts , preview", exact: true })
    .dblclick();
  const retainedTabs = await tabPaths();
  assert.deepEqual(retainedTabs, ["kept/AnchorKeep.txt", deepFile]);
  await input().focus();
  await panel()
    .getByRole("button", { name: "Clear filter", exact: true })
    .click();
  await treeRow(deepFile).waitFor({ state: "visible" });
  await assertFocused(input());
  // 2.42304.0 tree rows (cccc2cf0a NS / source-session.jsx:1273): boolean aria-current="true"
  // sits on the treeitem wrapper, while the inner [data-tree-primary] button is plain.
  assert.equal(await treeRow(deepFile).locator("..").getAttribute("aria-current"), "true");
  assert.equal(
    await treeRow("kept").locator("..").getAttribute("aria-expanded"),
    "true",
  );
  assert.deepEqual(await tabPaths(), retainedTabs);
  checks.push(
    "Search finds an unopened deep real Git file and excludes ignored files; preview/keep work; Clear reveals and selects its real ancestors while preserving other expanded folders, tabs and input focus",
  );

  await query("ManyHit");
  assert.equal(await results().getByRole("treeitem").count(), 50);
  assert.match(
    await panel().locator(".sfs-limit").textContent(),
    /first 50 results/,
  );
  const limitId = await panel().locator(".sfs-limit").getAttribute("id");
  assert.ok(
    (await input().getAttribute("aria-describedby"))
      .split(/\s+/)
      .includes(limitId),
  );
  await input().press("ArrowDown");
  await assertFocused(results().getByRole("treeitem").first());
  await page.keyboard.press("End");
  await assertFocused(results().getByRole("treeitem").last());
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await assertFocused(input());
  const beforeIme = await tabPaths();
  await input().dispatchEvent("compositionstart", { data: "試" });
  await input().dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
    keyCode: 229,
  });
  await input().dispatchEvent("compositionend", { data: "試" });
  await page.waitForTimeout(150);
  assert.deepEqual(
    await tabPaths(),
    beforeIme,
    "IME Enter must not activate a filename",
  );
  await input().press("ArrowDown");
  const firstManyPath = await results()
    .getByRole("treeitem")
    .first()
    .getByRole("button")
    .getAttribute("aria-label");
  await page.keyboard.press("Space");
  // Space previews (source-files-search.jsx activate, preview: !keep): the tab
  // name carries the sr-only ", preview" hint (panes-tabs-current.js:436-441), space-padded
  // by accname because .sr-only is position:absolute (HANDOFF 0.2.119, as at :585).
  await panel()
    .getByRole("tab", { name: `${path.basename(firstManyPath)} , preview`, exact: true })
    .waitFor();
  assert.equal(
    await panel()
      .getByRole("tab", { name: `${path.basename(firstManyPath)} , preview`, exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  checks.push(
    "Real 55-file query exposes exactly 50 matches with its truncation description; ArrowDown/Up/Home/End and Space operate results; composing Enter does not activate a file",
  );

  await armGate("pending-enter", sessionA, "DelayedTarget");
  const previewBeforePending = await previewText();
  await input().fill("DelayedTarget");
  await input().press("Enter");
  const pending = await heldGate("pending-enter");
  assert.deepEqual(pending.paths, ["delayed/DelayedTarget.txt"]);
  assert.equal(
    await previewText(),
    previewBeforePending,
    "Pending Enter cannot open a retained old result",
  );
  assert.equal(await results().getAttribute("aria-busy"), "true");
  await releaseGate("pending-enter");
  await panel()
    .locator(".source-file-preview")
    .filter({ hasText: "DELAYED_TARGET_A" })
    .waitFor();
  await armGate("blur-enter", sessionA, "BlurTarget");
  await input().fill("BlurTarget");
  await input().press("Enter");
  await heldGate("blur-enter");
  await page
    .getByRole("textbox", { name: "Message DeepSeek", exact: true })
    .focus();
  await releaseGate("blur-enter");
  await phase("success");
  assert.match(await previewText(), /DELAYED_TARGET_A/);
  assert.equal((await tabPaths()).includes("delayed/BlurTarget.txt"), false);
  checks.push(
    "Enter during a delayed real query waits for its own first result; blurring the input cancels pending activation without discarding the completed search",
  );

  await query("NothingMatchesZQ987");
  await results().getByText("No matching files", { exact: true }).waitFor();
  await input().fill("? contents");
  await phase("error");
  assert.match(
    await panel().locator(".sfs-error").textContent(),
    /filenames only/,
  );
  assert.equal(
    await results().getByText("No matching files", { exact: true }).count(),
    0,
  );
  await fs.rename(workspaceA, `${workspaceA}-offline`);
  movedWorkspace = true;
  await input().fill("RecoverableFile");
  await phase("error");
  assert.match(
    await panel().locator(".sfs-error").textContent(),
    /workspace root no longer exists/,
  );
  await fs.rename(`${workspaceA}-offline`, workspaceA);
  movedWorkspace = false;
  await panel().getByRole("button", { name: "Retry", exact: true }).click();
  await phase("success");
  await resultButton("RecoverableFile.txt").waitFor();
  checks.push(
    "Successful empty results, unsupported ? content queries and a real missing-root error remain distinct; Retry recovers using the restored real workspace",
  );

  await input().press("Escape");
  assert.equal(await input().inputValue(), "");
  assert.equal(
    await panel().isVisible(),
    true,
    "First Escape clears a non-empty filter instead of closing Files",
  );
  await size(760);
  // 0.2.14 tile engine (2.2553.1 Sh overflowMin): below 588px the chat tile is
  // an anchored 320px shell under the 280px side tile; no compact hide mode.
  assert.equal(
    await page.locator('[data-tile-id="chat"] .tiles-shell').getAttribute("data-tile-overflow-anchor"),
    "left",
  );
  assert.equal(
    await page.locator('[data-tile-id="chat"] .tiles-shell').evaluate((node) => getComputedStyle(node).minWidth),
    "320px",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await screenshot("compact-window.png");
  await size(1468);
  const divider = page.getByRole("separator", {
    name: /^Resize Chat and /,
    exact: true,
  });
  await divider.press("End");
  await page.waitForTimeout(120);
  metrics.narrowPane = await panel().evaluate((node) => ({
    width: node.clientWidth,
    treeVisible: !node.querySelector(".source-files-tree").hidden,
  }));
  assert.ok(metrics.narrowPane.width < 400);
  await ensureBrowser();
  await query("UniqueNeedle");
  await resultButton(deepFile).click();
  await panel()
    .locator(".source-file-preview")
    .filter({ hasText: "DEEP_A_REAL_PREVIEW" })
    .waitFor();
  assert.equal(await input().isVisible(), false);
  assert.equal(
    await panel().locator(".sfs-browser").getAttribute("data-search-phase"),
    "paused",
  );
  await screenshot("narrow-file-preview.png");
  // F11: no "Back to files" (cd2efac6e jo); under 400px the ListBullet switches back to the tree.
  await panel()
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await input().waitFor({ state: "visible" });
  await phase("success");
  assert.equal(await input().inputValue(), "UniqueNeedle");
  await divider.press("Enter");
  await page.waitForTimeout(120);
  checks.push(
    "760px compact layout stays within the viewport; a real divider narrows Files below 400px, file activation pauses the hidden search, and the file tree toggle restores and refreshes the same query",
  );

  await armGate("old-success", sessionA, "SharedRace");
  await input().fill("SharedRace");
  const oldSuccess = await heldGate("old-success");
  assert.deepEqual(oldSuccess.paths, ["SharedRace-A.txt"]);
  await selectSession(sessionB);
  await query("SharedRace");
  await resultButton("SharedRace-B.txt").waitFor();
  await releaseGate("old-success");
  assert.equal(
    await results()
      .getByRole("button", { name: "SharedRace-A.txt", exact: true })
      .count(),
    0,
  );
  await resultButton("SharedRace-B.txt").waitFor();

  await selectSession(sessionA);
  await fs.rename(workspaceA, `${workspaceA}-offline`);
  movedWorkspace = true;
  await armGate("old-error", sessionA, "SharedRace");
  await input().fill("SharedRace");
  const oldError = await heldGate("old-error");
  assert.equal(oldError.error, "ROOT_NOT_FOUND");
  await fs.rename(`${workspaceA}-offline`, workspaceA);
  movedWorkspace = false;
  await selectSession(sessionB);
  await query("SharedRace");
  await releaseGate("old-error");
  assert.equal(await panel().locator(".sfs-error").count(), 0);
  await resultButton("SharedRace-B.txt").waitFor();
  checks.push(
    "A→B with an identical query rejects both a late real A result and a late real A missing-root error; B retains only B paths and no stale alert",
  );

  await armGate("close-pending", sessionB, "ClosePending");
  await input().fill("ClosePending");
  const closing = await heldGate("close-pending");
  await panel()
    .getByRole("button", { name: "Close panel", exact: true })
    .click();
  await panel().waitFor({ state: "detached" });
  await waitHost(
    () =>
      app.evaluate(
        (_, requestId) =>
          globalThis.fileSearchUiFixture.records.some(
            (record) =>
              record.action === "files:search:cancel" &&
              record.params.requestId === requestId &&
              record.params.pane === "main",
          ),
        closing.requestId,
      ),
    "Closing Files must cancel its actual request identifier",
  );
  await releaseGate("close-pending");
  assert.equal(await panel().count(), 0);
  await ensureBrowser();
  assert.equal(await input().inputValue(), "");
  assert.equal(await tabs().count(), 0);
  await input().press("Escape");
  await panel().waitFor({ state: "detached" });
  checks.push(
    "Closing a pending search emits its scoped cancel and late delivery cannot reopen a pane/tab; a reopened pane is clean and Escape with an empty filter closes it",
  );
  assert.deepEqual(rendererErrors, []);
  await screenshot("completed.png");
} catch (error) {
  failure = error;
  await screenshot("failure.png").catch(() => {});
} finally {
  if (movedWorkspace)
    await fs.rename(`${workspaceA}-offline`, workspaceA).catch(() => {});
  if (app) {
    ipcRecords = await app
      .evaluate(() => globalThis.fileSearchUiFixture?.records || [])
      .catch(() => []);
    await app
      .evaluate(() => globalThis.fileSearchUiFixture?.restore())
      .catch(() => {});
    await app.close().catch((error) => {
      failure ||= error;
    });
  }
  const report = {
    passed: !failure,
    at: new Date().toISOString(),
    startedAt: at,
    fixture: true,
    realGit: true,
    build: buildInfo,
    runtime,
    profile,
    workspaces: { workspaceA, workspaceB, outside },
    checks,
    metrics,
    screenshots,
    rendererErrors,
    ipcRecords,
    ...(failure ? { error: failure.stack || String(failure) } : {}),
  };
  await fs.writeFile(
    path.join(evidence, "file-search-ui-test.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await fs.writeFile(
    path.join(runDirectory, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        build: buildInfo,
        checks,
        screenshots,
        error: report.error,
      },
      null,
      2,
    ),
  );
}
if (failure) throw failure;
