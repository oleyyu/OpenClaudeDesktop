import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// This script uses only an isolated profile, a protocol fixture and a temporary
// Git repository. It never opens a production account/session/workspace.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "pane-ui-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
await fs.writeFile(path.join(workspace, "alpha.txt"), "original alpha\n");
await fs.writeFile(path.join(workspace, "beta.md"), "# BETA_PREVIEW\n");
await fs.writeFile(
  path.join(workspace, "slow-c.txt"),
  "DELAYED_C_REAL_FILE_PREVIEW\n",
);
await fs.mkdir(path.join(workspace, "empty-folder"));
await fs.mkdir(path.join(workspace, "removed-folder"));
for (let n = 1; n <= 9; n++)
  await fs.writeFile(
    path.join(workspace, `file-${n}.txt`),
    `PINNED_FILE_${n}\n`,
  );
const git = (...args) =>
  execFileSync("git", ["-C", workspace, ...args], { stdio: "pipe" });
git("init");
git("add", ".");
git(
  "-c",
  "user.name=Pane fixture",
  "-c",
  "user.email=pane@example.invalid",
  "-c",
  "commit.gpgsign=false",
  "commit",
  "-m",
  "isolated baseline",
);
await fs.writeFile(
  path.join(workspace, "alpha.txt"),
  "ALPHA_PREVIEW_CHANGED\n",
);
const id = "pane-fixture-session",
  now = Math.floor(Date.now() / 1000);
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    threadIds: [id],
    displayName: "Fixture",
    model: "fixture",
    sidebarWidth: 288,
  }),
);
await fs.writeFile(
  path.join(profile, "fixture-threads.json"),
  JSON.stringify({
    next: 10,
    threads: {
      [id]: {
        id,
        cwd: workspace,
        name: "Pane source fixture",
        createdAt: now,
        updatedAt: now,
        archived: false,
        turns: [],
      },
    },
  }),
);
const binary = path.join(root, "tests/fixtures/codex-server.cjs");
await fs.chmod(binary, 0o755);
const env = {
  ...process.env,
  CODE_DESKTOP_DATA: profile,
  CODEX_BINARY: binary,
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
const near = (actual, expected, tolerance = 1.5) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
async function settle() {
  await page.waitForTimeout(120);
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
  await settle();
}
// 0.2.14 tile engine (2.2553.1 Vh/hh): the 8px inset lives on the tiles
// container; tiles are wraps keyed by data-tile-id.
async function geometry() {
  return page.locator(".source-pane-layout").evaluate((node) => {
    const chat = node.querySelector(".source-chat-tile"),
      side = node.querySelector(".source-side-tile");
    const a = chat.getBoundingClientRect(),
      b = side?.getBoundingClientRect();
    const css = getComputedStyle(node.querySelector(".tiles-container"));
    return {
      width: node.getBoundingClientRect().width,
      chat: a.width,
      pane: b?.width,
      gap: b ? b.x - a.right : null,
      top: css.paddingTop,
      bottom: css.paddingBottom,
      shellAnchor: chat.querySelector(".tiles-shell")?.dataset.tileOverflowAnchor ?? null,
      shellWidth: chat.querySelector(".tiles-shell")?.getBoundingClientRect().width ?? null,
      shadow: side ? getComputedStyle(side).boxShadow : null,
      radius: side ? getComputedStyle(side).borderRadius : null,
      surface: side ? getComputedStyle(side).backgroundColor : null,
    };
  });
}
async function openFiles() {
  await page
    .getByRole("button", { name: "View options", exact: true })
    .click();
  await page
    .getByRole("menuitemcheckbox", { name: "Files", exact: true })
    .click();
  await page.getByRole("complementary", { name: "Files panel" }).waitFor();
  await settle();
}
async function closePane() {
  await page
    .locator(".source-side-tile")
    .getByRole("button", { name: "Close panel", exact: true })
    .click();
  await page.locator(".source-side-tile").waitFor({ state: "detached" });
}
async function drag(locator, delta, cancel = false) {
  const box = await locator.boundingBox();
  assert.ok(box, "Resize handle must be visible");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + delta, y, { steps: 6 });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
  await settle();
}
async function holdRead(relative, method = "readFile") {
  const target = await fs.realpath(path.join(workspace, relative));
  await app.evaluate(
    (_, { target, method }) => {
      const files = process.getBuiltinModule("fs/promises");
      const original = files[method];
      const waiting = [];
      const gate = {
        count: 0,
        release() {
          files[method] = original;
          waiting.splice(0).forEach((resolve) => resolve());
        },
      };
      globalThis.paneFixtureFileRead = gate;
      // Delay delivery of one real, successful file/directory read. The wrapper is
      // installed only inside this fresh Electron fixture host and only for the
      // exact file in its isolated workspace; production modules stay unchanged.
      files[method] = async function (filename, ...args) {
        const result = await original.call(this, filename, ...args);
        if (String(filename) === target) {
          gate.count++;
          await new Promise((resolve) => waiting.push(resolve));
          gate.returned = (gate.returned ?? 0) + 1;
        }
        return result;
      };
    },
    { target, method },
  );
}
async function waitForHeldRead() {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await app.evaluate(() => globalThis.paneFixtureFileRead?.count > 0))
      return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.fail("The isolated delayed file read was not reached");
}
// Release the held read and prove the renderer received its reply: once the
// wrapper has returned, the rest of listFiles and the ipcMain.handle reply run in
// the same microtask chain, so the reply is queued before this later task; a
// second real invoke on the same renderer pipe then cannot resolve before it.
// Two frames let React commit the state set from the delivered reply.
async function deliverHeldRead() {
  await app.evaluate(() => {
    globalThis.paneFixtureDeliveredRead = globalThis.paneFixtureFileRead;
    globalThis.paneFixtureFileRead?.release();
    delete globalThis.paneFixtureFileRead;
  });
  const deadline = Date.now() + 5000;
  while (!(await app.evaluate(() => globalThis.paneFixtureDeliveredRead?.returned > 0))) {
    if (Date.now() > deadline) assert.fail("The released file read did not return");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  await app.evaluate(() => delete globalThis.paneFixtureDeliveredRead);
  await page.evaluate(async (cwd) => {
    await window.desktop.call("files", { cwd, relative: "" });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, workspace);
}
async function releaseFileRead() {
  await app.evaluate(() => {
    globalThis.paneFixtureFileRead?.release();
    delete globalThis.paneFixtureFileRead;
  });
}
// 0.2.101: file tabs carry no native title (panes-tabs-current.js:333-491 he);
// the tab's path is read from its .source-file-tab root instead.
async function focusedTab(name) {
  await page.waitForFunction((name) => {
    const node = document.activeElement;
    return (
      node?.getAttribute("role") === "tab" &&
      node.closest(".source-file-tab")?.dataset.filePath === name
    );
  }, name);
}
// pe close X prevents mousedown focus (panes-tabs-current.js:196), and the tab strip
// restores focus only when a removed tab held it or it fell to body (:652-663). A
// close-X click while the tree row keeps focus therefore leaves focus on that row.
async function focusedTreeRow(name) {
  await page.waitForFunction((name) => {
    const node = document.activeElement;
    return node?.tagName === "BUTTON" && !!node.closest("[data-tree-row]") && (node.dataset.filePath === name || node.getAttribute("aria-label") === name);
  }, name);
}
// pe close button (panes-tabs-current.js:190-202) is aria-hidden with the
// shared label le.closeTab "Close file" (panes-tile-current.js:6671), so it is
// located structurally inside the tab of that path, not by role and name.
const closeTabButton = (panel, name) =>
  panel.locator(
    `.source-file-tab[data-file-path=${JSON.stringify(name)}] > button[aria-label="Close file"][aria-hidden="true"]`,
  );
try {
  page = await app.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await size(1468);
  await page
    .locator(`[data-source-session-id="${id}"] .source-session-open`)
    .click();
  await page.locator(".st-title").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const closed = await geometry();
  assert.equal(closed.bottom, "9px");
  await openFiles();
  metrics.initial = await geometry();
  near(
    metrics.initial.chat / (metrics.initial.chat + metrics.initial.pane),
    0.4,
    0.003,
  );
  near(metrics.initial.gap, 12);
  assert.equal(metrics.initial.radius, "10px");
  assert.notEqual(metrics.initial.shadow, "none");
  assert.equal(metrics.initial.surface, "rgb(255, 255, 255)");
  assert.equal(metrics.initial.top, "8px");
  const headers = await page.evaluate(() =>
    [
      document.querySelector(".st-inner"),
      document.querySelector(".source-pane-header"),
    ].map((node) => {
      const r = node.getBoundingClientRect();
      return { y: r.y, height: r.height };
    }),
  );
  near(headers[0].y, headers[1].y);
  headers.forEach((header) => near(header.height, 32));
  checks.push(
    "Initial Files pane uses 2:3 flex with 8px padding, 12px divider and aligned 32px headers; closed layout keeps the 9px bottom inset (padding 8 + border 1)",
  );

  const panel = page.getByRole("complementary", { name: "Files panel" });
  // F11: the tree is "Project files" (panes-tile-current.js:4727).
  const tree = panel.getByRole("tree", { name: "Project files" });
  const treeColumn = panel.locator(".source-files-tree");
  const emptyPreview = panel.locator(".source-file-empty-preview");
  const treeDivider = panel.getByRole("separator", {
    name: "Resize file tree",
    exact: true,
  });
  await tree.waitFor();
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  near((await treeColumn.boundingBox()).width, 240);
  metrics.emptyPreview = await emptyPreview.evaluate((node) => {
    // panes-tile-current.js:6355-6390: EmptyState yu (.source-empty-state)
    // inside the flex-1 wrapper; title p then body p.
    const state = node.querySelector(".source-empty-state");
    const [titleNode, bodyNode] = state.querySelectorAll("p");
    const title = getComputedStyle(titleNode);
    const body = getComputedStyle(bodyNode);
    return {
      width: node.getBoundingClientRect().width,
      iconSize: node.querySelector('[data-cds="Icon"]').getBoundingClientRect()
        .width,
      gap: getComputedStyle(state).gap,
      titleText: titleNode.textContent,
      bodyText: bodyNode.textContent,
      titleSize: title.fontSize,
      titleLeading: title.lineHeight,
      bodySize: body.fontSize,
      bodyLeading: body.lineHeight,
    };
  });
  assert.ok(metrics.emptyPreview.width >= 160);
  // Tree shown, no tabs: the source body (panes-tile-current.js:6377-6382).
  assert.equal(metrics.emptyPreview.titleText, "Open files appear here");
  assert.equal(metrics.emptyPreview.bodyText, "Pick a file in the tree, or click a file path in the conversation.");
  near(metrics.emptyPreview.iconSize, 28);
  // cc0a875c8 empty-state gap-md -> compact CDS gap-md = .75rem = 12px.
  // It differs from pad-md / gap-sm (8px), despite the shared "md" suffix.
  assert.equal(metrics.emptyPreview.gap, "12px");
  assert.equal(metrics.emptyPreview.titleSize, "13px");
  assert.equal(metrics.emptyPreview.titleLeading, "19px");
  assert.equal(metrics.emptyPreview.bodySize, "12px");
  assert.equal(metrics.emptyPreview.bodyLeading, "15px");
  await treeDivider.focus();
  await page.keyboard.press("ArrowRight");
  await settle();
  near((await treeColumn.boundingBox()).width, 264);
  await treeDivider.dblclick();
  await settle();
  near((await treeColumn.boundingBox()).width, 240);
  await drag(treeDivider, -190, true);
  assert.equal(
    await treeColumn.isVisible(),
    true,
    "Empty-tree hide drag can be cancelled",
  );
  near((await treeColumn.boundingBox()).width, 240);
  await treeDivider.focus();
  await page.keyboard.press("Enter");
  await settle();
  assert.equal(await treeColumn.isVisible(), false);
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("source-tree-edge"),
  );
  await page.keyboard.press("Enter");
  await tree.waitFor();
  await page.waitForFunction(() =>
    document.activeElement?.classList.contains("source-tree-divider"),
  );
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  assert.equal(await treeColumn.isVisible(), false);
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.waitFor();
  checks.push(
    "Wide no-file state has a resizable 240px tree beside the source empty preview; hide/show and divider focus work without open tabs",
  );

  // Pg (panes-tile-current.js:5335-5350): an expanded empty (or loading)
  // subfolder adds no rows and no notice; only a failed read adds the Lg
  // (:5547-5570) "Couldn’t read this folder." treeitem, never the raw error.
  const folderItem = (name) => tree.locator(`[role="treeitem"]:has(> [data-tree-row-body] > [data-tree-primary][data-file-path="${name}"])`);
  const emptyFolderItem = folderItem("empty-folder");
  const emptyFolderGroup = () => emptyFolderItem.evaluate((node) => ({
    items: node.querySelectorAll('[role="group"] [role="treeitem"]').length,
    text: node.querySelector('[role="group"]')?.textContent ?? null,
  }));
  // Hold the real subfolder readdir so the loading state is observed while the
  // read is provably in flight, then deliver it so the loaded-empty state is
  // observed after the reply reached the renderer (no fixed-time wait).
  await holdRead("empty-folder", "readdir");
  await tree.getByRole("button", { name: "empty-folder", exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[role="tree"][aria-label="Project files"] [role="treeitem"]:has(> [data-tree-row-body] > [data-tree-primary][data-file-path="empty-folder"])')?.getAttribute("aria-expanded") === "true");
  await waitForHeldRead();
  assert.deepEqual(await emptyFolderGroup(), { items: 0, text: "" }, "Loading subfolder has no child rows and no notice");
  await deliverHeldRead();
  assert.deepEqual(await emptyFolderGroup(), { items: 0, text: "" }, "Loaded empty folder has no child rows and no notice");
  assert.equal(await tree.getByText("Empty folder", { exact: true }).count(), 0);
  await fs.rm(path.join(workspace, "removed-folder"), { recursive: true });
  await tree
    .getByRole("button", { name: "removed-folder", exact: true })
    .click();
  const errorRow = tree.locator('[data-tree-row][role="treeitem"]:not(:has([data-tree-row-body]))');
  await errorRow.waitFor();
  const errorInfo = await errorRow.evaluate((node) => ({
    role: node.getAttribute("role"),
    level: node.getAttribute("aria-level"),
    parentLevel: node.parentElement.closest('[role="treeitem"]').getAttribute("aria-level"),
    text: node.textContent,
    color: getComputedStyle(node).color,
    minHeight: getComputedStyle(node).minHeight,
    paddingRight: getComputedStyle(node).paddingRight,
    paddingLeft: getComputedStyle(node).paddingLeft,
    muted: (() => { const probe = document.createElement("span"); probe.style.color = "var(--cds-text-muted)"; document.body.append(probe); const value = getComputedStyle(probe).color; probe.remove(); return value; })(),
    ...(() => { const probe = document.createElement("div"); probe.style.minHeight = "var(--cds-h-control)"; probe.style.paddingRight = "var(--cds-pad-lg)"; node.parentElement.append(probe);
      const style = getComputedStyle(probe), value = { control: style.minHeight, padLg: style.paddingRight }; probe.remove(); return value; })(),
  }));
  assert.equal(errorInfo.role, "treeitem");
  assert.equal(Number(errorInfo.level), Number(errorInfo.parentLevel) + 1);
  assert.equal(errorInfo.text, "Couldn’t read this folder.");
  assert.equal(errorInfo.color, errorInfo.muted);
  assert.equal(errorInfo.minHeight, errorInfo.control, "min-h-control");
  assert.equal(errorInfo.paddingRight, errorInfo.padLg, "px-lg (padding-left is Lg's inline ko(depth))");
  assert.equal(errorInfo.paddingLeft, `${8 + 8 * (Number(errorInfo.level) - 1)}px`, "ko(depth) = 8 + 8 * depth");
  metrics.treeErrorRow = errorInfo;
  await page.screenshot({ path: path.join(evidence, "pane-source-tree-error.png") });
  assert.equal(await tree.getByRole("alert").count(), 0);
  assert.equal(await tree.getByText(/ENOENT/).count(), 0, "The raw read error is never rendered");
  // Roving keys reach the error row; activating it does nothing.
  await folderItem("removed-folder").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(await errorRow.evaluate((node) => node === document.activeElement), true, "ArrowDown focuses the error row");
  await page.keyboard.press("Enter");
  await page.keyboard.press(" ");
  assert.equal(await errorRow.evaluate((node) => node === document.activeElement && node.isConnected), true, "Enter/Space on the error row are no-ops");
  await page.keyboard.press("ArrowUp");
  assert.equal(await folderItem("removed-folder").evaluate((node) => node === document.activeElement), true, "ArrowUp returns to the failed folder");
  checks.push("Expanded empty subfolder adds no rows or notice while its real read is held and after the reply is delivered; a failed subfolder read adds one muted Lg treeitem (no raw error) that the roving keys reach and that does nothing when activated");
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  await holdRead("", "readdir");
  await panel.getByRole("textbox", { name: "Filter files", exact: true }).fill("refresh");
  await panel.getByRole("button", { name: "Clear filter", exact: true }).click();
  await waitForHeldRead();
  await treeColumn
    .getByRole("status")
    .filter({ hasText: "Refreshing files" })
    .waitFor({ state: "attached" });
  assert.equal(await tree.isVisible(), true, "A refresh retains the existing tree DOM");
  assert.equal(await panel.getAttribute("aria-busy"), "true");
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  await releaseFileRead();
  await page.waitForFunction(() => document.querySelector('.source-file-panel')?.getAttribute('aria-busy') !== 'true');
  await tree.waitFor();
  assert.equal(await panel.getAttribute("aria-busy"), null);
  assert.equal(await tree.getByRole("alert").count(), 0);
  checks.push(
    "Real empty folders and removed-directory errors remain distinct from empty preview; clear triggers a real delayed refresh, retaining tree DOM and empty preview while reporting busy",
  );

  // 2.2553.1 Mh: "Resize {i} and {i+1}".
  const divider = page.getByRole("separator", {
    name: /^Resize Chat and /,
    exact: true,
  });
  await divider.focus();
  await page.keyboard.press("ArrowRight");
  await settle();
  near((await geometry()).chat - metrics.initial.chat, 24);
  await page.keyboard.press("Shift+ArrowRight");
  await settle();
  near((await geometry()).chat - metrics.initial.chat, 144);
  await divider.dblclick();
  await settle();
  const equal = await geometry();
  near(equal.chat, equal.pane);
  await drag(divider, 54, true);
  near((await geometry()).chat, equal.chat);
  assert.equal(
    await page.locator(".source-side-tile").count(),
    1,
    "Drag Escape cancels resize without closing the pane",
  );
  await divider.focus();
  await page.keyboard.press("Home");
  await settle();
  // Keyboard minima use the chat overflowMin width (c360a9e1c Me without
  // overflowMinReachable -> Qa = max(320, 100)); only pointer drags reach 100.
  near((await geometry()).chat, 320);
  await page.keyboard.press("End");
  await settle();
  near((await geometry()).pane, 280);
  assert.equal(
    await emptyPreview.count(),
    0,
    "Narrow no-file state uses the full-width browser tree",
  );
  near(
    (await treeColumn.boundingBox()).width,
    (await panel.boundingBox()).width,
  );
  assert.equal(await treeDivider.count(), 0);
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  assert.equal(await treeColumn.isVisible(), false);
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.waitFor();
  assert.equal(await emptyPreview.count(), 0);
  await divider.focus();
  await page.keyboard.press("Enter");
  await settle();
  await drag(divider, -72);
  const remembered = await geometry();
  await closePane();
  await openFiles();
  near((await geometry()).chat, remembered.chat);
  checks.push(
    "Outer divider supports 24px/120px keys, min 280px, equalize, pointer drag, Escape cancellation and remembered reopen ratio",
  );

  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  near((await treeColumn.boundingBox()).width, 240);
  await tree.getByRole("button", { name: "alpha.txt", exact: true }).click();
  await page
    .locator(".source-file-preview")
    .filter({ hasText: "ALPHA_PREVIEW_CHANGED" })
    .waitFor();
  assert.equal(await page.locator(".source-files-tree").isVisible(), false);
  const tabMetrics = await page
    .locator(".source-file-tab")
    .evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      fontSize: getComputedStyle(node.querySelector('[role="tab"]')).fontSize,
      preview: node.dataset.preview,
    }));
  assert.equal(tabMetrics.preview, "true");
  near(tabMetrics.height, 24);
  assert.equal(tabMetrics.fontSize, "13px");
  metrics.fileTab = tabMetrics;
  // F11: the original viewer has no "Back to files" (cd2efac6e jo; no such string in
  // reference/); in a pane that fits it, the ListBullet shows the tree beside the file
  // and hides it again, keeping that file.
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.waitFor();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "ALPHA_PREVIEW_CHANGED" })
    .waitFor();
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "ALPHA_PREVIEW_CHANGED" })
    .waitFor();
  assert.equal(
    await treeColumn.isVisible(),
    false,
    "Hiding the tree beside a file keeps that file",
  );
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.getByRole("button", { name: "beta.md", exact: true }).click();
  await page
    .locator(".source-file-preview")
    .filter({ hasText: "BETA_PREVIEW" })
    .waitFor();
  assert.equal(
    await panel.getByRole("tab").count(),
    1,
    "A second preview replaces the first preview",
  );
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  await treeColumn.waitFor({ state: "hidden" });
  // A preview tab's name ends with the sr-only ", preview" hint (panes-tabs-current.js:436-441).
  // HANDOFF 0.2.101 wrote "beta.md, preview" unexecuted (first offscreen run 0.2.119): `.sr-only`
  // is position:absolute (design-system.css:4083-4093; local source-session.jsx:929 same markup),
  // so accname pads the non-inline child with spaces, as session-ui-test.mjs:513-517 (0.2.118).
  await panel
    .getByRole("tab", { name: "beta.md , preview", exact: true })
    .dblclick();
  assert.equal(
    await panel.locator(".source-file-tab[data-preview]").count(),
    0,
    "Double-click keeps a preview tab",
  );
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.waitFor();
  near((await page.locator(".source-files-tree").boundingBox()).width, 240);
  await treeDivider.focus();
  await page.keyboard.press("ArrowRight");
  await settle();
  near((await page.locator(".source-files-tree").boundingBox()).width, 264);
  await page.keyboard.press("End");
  await settle();
  const paneWidth = (await panel.boundingBox()).width;
  near(
    (await page.locator(".source-files-tree").boundingBox()).width,
    Math.min(640, paneWidth - 160),
  );
  await treeDivider.dblclick();
  await settle();
  near((await page.locator(".source-files-tree").boundingBox()).width, 240);
  await drag(treeDivider, -190);
  assert.equal(await page.locator(".source-files-tree").isVisible(), false);
  await drag(
    panel.getByRole("separator", { name: "Show file tree", exact: true }),
    180,
  );
  near((await page.locator(".source-files-tree").boundingBox()).width, 180);
  for (let n = 1; n <= 9; n++) {
    await tree
      .getByRole("button", { name: `file-${n}.txt`, exact: true })
      .dblclick();
    await page
      .locator(".source-file-preview")
      .filter({ hasText: `PINNED_FILE_${n}` })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".source-file-tab[data-preview]").length ===
        0,
    );
  }
  // F11: tabs past the strip edge stay in the DOM but are invisible (behind "More files"),
  // so the cap is counted on the tab roots rather than on the visible tab roles.
  assert.equal(await panel.locator(".source-file-tab").count(), 8);
  assert.equal(
    await panel.getByRole("tab", { name: "beta.md", exact: true }).count(),
    0,
    "Old inactive tab is evicted at the cap",
  );
  checks.push(
    "File preview replacement, keep-on-double-click, 8-tab cap, 24px/13px tab styling and independent 240px tree resizing/hide/reveal",
  );

  const ninth = panel.getByRole("tab", { name: "file-9.txt", exact: true });
  await ninth.focus();
  await ninth.press("Delete");
  await focusedTab("file-8.txt");
  await page.keyboard.press("ArrowLeft");
  await focusedTab("file-7.txt");
  assert.equal(
    await panel
      .getByRole("tab", { name: "file-7.txt", exact: true })
      .getAttribute("aria-selected"),
    "true",
  );
  await closeTabButton(panel, "file-7.txt").click();
  await focusedTab("file-8.txt");
  checks.push(
    "Delete and close-X restore focus to an adjacent active tab so arrow-key navigation continues after removal",
  );

  await holdRead("slow-c.txt");
  await tree.getByRole("button", { name: "slow-c.txt", exact: true }).click();
  await waitForHeldRead();
  // F11 (openFileTab -> F, cd2efac6e Zo): the tab opens at once and its body is the delayed
  // lg spinner, a status named "Loading file" (no visible text), until the read lands.
  await panel
    .getByRole("status", { name: "Loading file", exact: true })
    .waitFor();
  // An unrelated tab that is in view (tabs past the strip edge sit behind "More files").
  const unrelatedTab = await panel.evaluate((node) =>
    [...node.querySelectorAll(".source-file-tab:not([data-selected]):not([data-overflowed])")].at(-1)?.dataset.filePath);
  assert.ok(unrelatedTab, "a visible inactive tab");
  await closeTabButton(panel, unrelatedTab).click();
  // HANDOFF 0.2.119: written when the close X was a focusable "Close <name>" button (clicking it put focus
  // inside the closing row). Since 0.2.101 the X is pe (tabIndex -1, mousedown preventDefault), so focus stays
  // on the tree row clicked above, as the source strip effect (panes-tabs-current.js:652-663) requires.
  await focusedTreeRow("slow-c.txt");
  assert.equal(
    await panel
      .getByRole("status", { name: "Loading file", exact: true })
      .count(),
    1,
    "Closing an unrelated existing tab preserves the pending file request",
  );
  await releaseFileRead();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "DELAYED_C_REAL_FILE_PREVIEW" })
    .waitFor();
  assert.equal(
    await panel
      .getByRole("tab", { name: "slow-c.txt , preview", exact: true }) // same sr-only accname padding as :508 (HANDOFF 0.2.119)
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await panel.locator(`.source-file-tab[data-file-path=${JSON.stringify(unrelatedTab)}]`).count(),
    0,
  );
  checks.push(
    "Closing inactive A during a deliberately held real read of C keeps the request alive and eventually activates C without restoring A",
  );

  await holdRead("slow-c.txt");
  await tree.getByRole("button", { name: "slow-c.txt", exact: true }).click();
  await waitForHeldRead();
  await closeTabButton(panel, "slow-c.txt").click();
  // HANDOFF 0.2.119: written when the close X was a focusable "Close <name>" button (clicking it put focus
  // inside the closing row). Since 0.2.101 the X is pe (tabIndex -1, mousedown preventDefault), so focus stays
  // on the tree row clicked above, as the source strip effect (panes-tabs-current.js:652-663) requires.
  await focusedTreeRow("slow-c.txt");
  assert.equal(
    await panel
      .getByRole("status", { name: "Loading file", exact: true })
      .count(),
    0,
  );
  await releaseFileRead();
  await settle();
  assert.equal(
    await panel.locator('.source-file-tab[data-file-path="slow-c.txt"]').count(),
    0,
    "A delayed reread of a tab that was itself closed must not resurrect it",
  );
  while (await panel.getByRole("tab").count()) {
    const selected = panel.locator('[role="tab"][aria-selected="true"]');
    await selected.focus();
    await selected.press("Backspace");
  }
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") === "Filter files",
  );
  await emptyPreview
    .getByText("Open files appear here", { exact: true })
    .waitFor();
  checks.push(
    "Closing the exact pending file cancels its result; closing the last tab restores focus to the visible file browser",
  );
  await tree
    .getByRole("button", { name: "file-9.txt", exact: true })
    .dblclick();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "PINNED_FILE_9" })
    .waitFor();

  await page.screenshot({ path: path.join(evidence, "pane-source-wide.png") });
  await size(760);
  metrics.narrow = await geometry();
  // 2.2553.1 Sh overflowMin: the chat tile becomes an absolutely anchored
  // 320px shell (anchor left when chat is first) under the 280px side tile;
  // the separator stays and the chat body remains rendered.
  assert.equal(metrics.narrow.shellAnchor, "left");
  near(metrics.narrow.shellWidth, 320);
  near(metrics.narrow.pane, 280);
  assert.ok(metrics.narrow.chat < 320, "chat wrap yields below its shell width");
  assert.equal(await divider.count(), 1);
  assert.equal(await page.locator(".source-chat-body").isVisible(), true);
  await page.screenshot({
    path: path.join(evidence, "pane-source-narrow.png"),
  });
  // Separately exercise the inner 400px threshold by shrinking only the isolated
  // test's sidebar-independent layout width through the real outer divider.
  await size(1468);
  await divider.focus();
  await page.keyboard.press("End");
  await settle();
  assert.equal(await page.locator(".source-files-tree").isVisible(), false);
  assert.equal(
    await panel
      .getByRole("button", { name: "Show file tree", exact: true })
      .count(),
    1,
  );
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  assert.equal(await page.locator(".source-files-tree").isVisible(), true);
  assert.equal(await emptyPreview.count(), 0);
  near(
    (await treeColumn.boundingBox()).width,
    (await panel.boundingBox()).width,
  );
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "PINNED_FILE_9" })
    .waitFor();
  assert.equal(await treeColumn.isVisible(), false);
  // c_ "Search files" (panes-tile-current.js:6791-6807) -> focusFilesTreeFilter
  // (panes-state-current.js:3097-3113): the tree cannot fit beside the file, so
  // vi() switches to the full-width tree (file tab kept, preview closed), then
  // "Filter files" is focused with its text selected.
  // The tree (and its filter) is hidden here, so it is reached by selector, not by role.
  await panel.locator('input[aria-label="Filter files"]').evaluate((node) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(node, "file-9");
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await panel.getByRole("button", { name: "Search files", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Filter files");
  const narrowSearch = await panel.evaluate((node) => ({
    width: node.clientWidth,
    treeVisible: node.querySelector(".source-file-body").dataset.treeVisible,
    column: node.querySelector(".source-file-body").dataset.treeColumn,
    preview: !!node.querySelector(".source-file-preview"),
    tabs: [...node.querySelectorAll(".source-file-tab")].map((tab) => tab.dataset.filePath),
    selected: node.querySelector(".source-file-tab[data-selected]")?.dataset.filePath ?? null,
    filter: (({ value, selectionStart, selectionEnd }) => ({ value, selectionStart, selectionEnd }))(document.activeElement),
  }));
  metrics.narrowSearchFiles = narrowSearch;
  assert.ok(narrowSearch.width < 400, `narrow pane ${narrowSearch.width}px`);
  assert.deepEqual([narrowSearch.treeVisible, narrowSearch.column, narrowSearch.preview, narrowSearch.selected], ["true", "false", false, null]);
  assert.ok(narrowSearch.tabs.some((tab) => tab.endsWith("file-9.txt")), "the open file tab is kept");
  assert.deepEqual(narrowSearch.filter, { value: "file-9", selectionStart: 0, selectionEnd: 6 });
  near((await treeColumn.boundingBox()).width, (await panel.boundingBox()).width);
  await panel.getByRole("button", { name: "Clear filter", exact: true }).click();
  // Hiding the tree again returns to the previous file, as before.
  await panel
    .getByRole("button", { name: "Hide file tree", exact: true })
    .click();
  await panel
    .locator(".source-file-preview")
    .filter({ hasText: "PINNED_FILE_9" })
    .waitFor();
  assert.equal(await treeColumn.isVisible(), false);
  // F11: no "Back to files"; under 400px the ListBullet switches to the full-width tree.
  await panel
    .getByRole("button", { name: "Show file tree", exact: true })
    .click();
  await tree.waitFor();
  checks.push(
    "Narrow container keeps a 320px anchored chat shell under the 280px pane; under 400px the tree toggle switches between the full-width browser and the previous file",
  );
  checks.push(
    "Under 400px, Search files with a file open switches to the full-width tree (tab kept, preview closed) and focuses Filter files with its text selected",
  );

  await closePane();
  // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  const changes = page.getByRole("complementary", { name: "Changes panel" });
  // F12 zm: the Changes title is the diff-scope trigger ("{base} → working tree"; `git init` picks the base name).
  await changes.getByRole("button", { name: /^Diff scope: .+ → working tree$/ }).waitFor();
  await changes
    .locator(".diff .added")
    .filter({ hasText: "ALPHA_PREVIEW_CHANGED" })
    .waitFor();
  metrics.diff = await changes
    .locator(".diff .added")
    .first()
    .evaluate((node) => {
      const css = getComputedStyle(node);
      return {
        fontSize: css.fontSize,
        lineHeight: css.lineHeight,
        color: css.color,
      };
    });
  assert.equal(metrics.diff.fontSize, "12px");
  assert.equal(metrics.diff.lineHeight, "17px");
  assert.equal(metrics.diff.color, "rgb(30, 158, 60)");
  await page.screenshot({
    path: path.join(evidence, "pane-source-changes.png"),
  });
  assert.deepEqual(errors, []);
  checks.push(
    "Changes title and diff come from a real isolated Git working tree; compact diff type is 12px/17px with Git-added ink",
  );
  await fs.writeFile(
    path.join(evidence, "pane-source-test.json"),
    JSON.stringify(
      {
        passed: true,
        at: new Date().toISOString(),
        profile,
        workspace,
        checks,
        metrics,
        rendererErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { passed: true, checks, metrics, rendererErrors: errors },
      null,
      2,
    ),
  );
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, "pane-source-failure.png") })
    .catch(() => {});
  // Failure evidence only (0.2.119): where focus actually was when an assertion stopped.
  metrics.failureFocus = await page
    ?.evaluate(() => { const n = document.activeElement; return { tag: n?.tagName, role: n?.getAttribute("role"), label: n?.getAttribute("aria-label"), text: n?.textContent?.slice(0, 80), filePath: n?.closest?.(".source-file-tab")?.dataset.filePath ?? null, treeRow: n?.closest?.("[data-tree-row]") ? true : false, hasFocus: document.hasFocus() }; })
    .catch((e) => ({ error: e.message }));
  await fs.writeFile(
    path.join(evidence, "pane-source-test.json"),
    JSON.stringify(
      {
        passed: false,
        at: new Date().toISOString(),
        error: error.stack,
        checks,
        metrics,
        rendererErrors: errors,
        profile,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await releaseFileRead().catch(() => {});
  await app.close();
}
