import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { RELEASE_NOTES, releaseNoteDate } from "../src/release-notes.mjs";

const root = path.resolve(import.meta.dirname, "..");
const build = JSON.parse(await fs.readFile(path.join(root, "dist/build-info.json"), "utf8"));
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "titlebar-ui-profile-"));
const workspace = path.join(profile, "isolated-titlebar-workspace");
await fs.mkdir(workspace);
const firstId = "titlebar-first",
  secondId = "titlebar-second";
const initialTitle =
  "Titlebar fixture with a clear and sufficiently long session title";
const secondTitle = "Second isolated titlebar session";
const now = Math.floor(Date.now() / 1000);
await fs.writeFile(
  path.join(profile, "preferences.json"),
  JSON.stringify({
    cwd: workspace,
    theme: "light",
    mode: "code",
    threadIds: [firstId, secondId],
    displayName: "Fixture",
    model: "fixture",
    sidebarWidth: 288,
  }),
);
await fs.writeFile(
  path.join(profile, "fixture-threads.json"),
  JSON.stringify({
    next: 100,
    threads: Object.fromEntries(
      [
        [firstId, initialTitle],
        [secondId, secondTitle],
      ].map(([id, name]) => [
        id,
        {
          id,
          name,
          cwd: workspace,
          createdAt: now,
          updatedAt: now,
          archived: false,
          turns: [],
        },
      ]),
    ),
  }),
);
// The proxy delays only named fixture rename responses, while the actual
// existing protocol fixture performs/persists every mutation. No production
// process or source fixture is modified. This makes stale-result races testable.
const fixture = path.join(root, "tests/fixtures/codex-server.cjs");
const binary = path.join(profile, "codex-titlebar-proxy.cjs");
await fs.writeFile(
  binary,
  `#!/usr/bin/env node\nconst {spawn}=require('node:child_process');\nconst readline=require('node:readline');\nconst fs=require('node:fs');\nconst child=spawn(process.execPath,[${JSON.stringify(fixture)}],{stdio:['pipe','pipe','inherit']});\nconst delayed=new Set();\nreadline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line); if(m.method==='thread/name/set'){fs.appendFileSync(${JSON.stringify(path.join(profile, "rename-requests.jsonl"))},line+'\\n'); if(m.params.name.startsWith('Delayed '))delayed.add(m.id);} child.stdin.write(line+'\\n');});\nreadline.createInterface({input:child.stdout}).on('line',line=>{const m=JSON.parse(line); if(delayed.delete(m.id))setTimeout(()=>process.stdout.write(line+'\\n'),1200); else process.stdout.write(line+'\\n');});\nprocess.stdin.on('end',()=>child.stdin.end());\nchild.on('exit',code=>process.exit(code||0));\n`,
);
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
const errors = [],
  checks = [],
  metrics = {};
let page;
const readDb = async () =>
  JSON.parse(
    await fs.readFile(path.join(profile, "fixture-threads.json"), "utf8"),
  );
const requests = async () => {
  try {
    return (
      await fs.readFile(path.join(profile, "rename-requests.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
};
async function openSession(id) {
  await page
    .locator(`[data-source-session-id="${id}"] .source-session-open`)
    .click();
  await page.locator(".st-title").waitFor();
}
// R4i-gui GU1: the rail's Environment card. rail-view.mjs rD renders aside[aria-label="Session details"]; each card is
// rail-card.mjs Xv, a section[data-rail-section] labelled by its h3 ("Environment" + the summary). The rail is shown by
// default (rail-shown-store.mjs `shown: !0`); if a previous step hid it, the titlebar toggle (rail-shell.mjs EH,
// aria-label "Show session rail") brings it back.
async function railEnvironmentCard() {
  const toggle = page.locator(".st-toolbar").getByRole("button", { name: "Show session rail", exact: true });
  if (await toggle.count()) await toggle.click();
  const rail = page.getByRole("complementary", { name: "Session details", exact: true });
  await rail.waitFor();
  const card = rail.locator("section[data-rail-section]").filter({ has: page.locator("h3", { hasText: /^Environment/ }) });
  await card.waitFor();
  return card;
}
try {
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await openSession(firstId);
  await page.evaluate(() => document.fonts.ready);
  metrics.header = await page.locator(".st-toolbar").evaluate((node) => {
    const s = getComputedStyle(node),
      inner = node.querySelector(".st-inner");
    return {
      height: node.getBoundingClientRect().height,
      innerHeight: inner.getBoundingClientRect().height,
      topPadding: s.paddingTop,
      innerTop: inner.getBoundingClientRect().top,
      titleFont: getComputedStyle(node.querySelector(".st-title")).fontSize,
      controlHeight: node.querySelector(".st-title").getBoundingClientRect()
        .height,
      // R4i-gui GU1: in rail mode (main.jsx railMode={sessionRail.railMode}, c73f45bc3 w_ `origin: null, pill: null`)
      // the Code lead has no origin glyph and no folder pill; source-titlebar.jsx:372 renders the empty
      // LEAD_NO_ORIGIN_CLASS slot instead and :471/:475 gate both .st-folder variants on !railMode.
      folderPills: node.querySelectorAll(".st-folder").length,
      origins: node.querySelectorAll(".st-origin").length,
    };
  });
  assert.equal(metrics.header.height, 40);
  assert.equal(metrics.header.innerHeight, 32);
  assert.equal(metrics.header.innerTop, 8);
  assert.equal(metrics.header.topPadding, "8px");
  assert.equal(metrics.header.titleFont, "13px");
  assert.equal(metrics.header.controlHeight, 24);
  assert.equal(metrics.header.folderPills, 0, "rail mode: no titlebar folder pill (w_ pill: null)");
  assert.equal(metrics.header.origins, 0, "rail mode: no titlebar origin glyph (w_ origin: null)");
  checks.push(
    "Code header 40px = 8px top inset + 32px inner, title13px/control24px; rail mode drops the origin glyph and folder pill (the rail's Environment card carries the folder)",
  );

  const title = page.locator(".st-title"),
    input = page.getByRole("textbox", { name: "Session name", exact: true });
  await title.focus();
  await title.press("Enter");
  await input.waitFor();
  assert.equal(await input.inputValue(), initialTitle);
  assert.deepEqual(
    await input.evaluate((node) => [node.selectionStart, node.selectionEnd]),
    [0, initialTitle.length],
  );
  await input.fill("Cancelled draft");
  await input.press("Escape");
  await title.waitFor();
  assert.equal(await title.innerText(), initialTitle);
  assert.equal(
    await title.evaluate((node) => document.activeElement === node),
    true,
  );
  assert.equal((await requests()).length, 0);
  checks.push(
    "Keyboard rename selects full title; Escape restores title focus and sends no mutation",
  );

  await title.press("Enter");
  await input.fill("  Renamed through actual Codex protocol  ");
  await input.press("Enter");
  await page.waitForFunction(
    () =>
      document.querySelector(".st-title")?.textContent ===
      "Renamed through actual Codex protocol",
  );
  assert.equal(
    (await readDb()).threads[firstId].name,
    "Renamed through actual Codex protocol",
  );
  assert.equal((await requests()).length, 1);
  assert.equal(
    await title.evaluate((node) => document.activeElement === node),
    true,
  );
  checks.push(
    "Enter trims and persists via actual fixture thread/name/set; one RPC despite Enter/blur, restores keyboard focus",
  );

  await title.click();
  await input.fill("Never submitted to second session");
  await input.press("Escape");
  await openSession(secondId);
  assert.equal(await page.locator(".st-title").innerText(), secondTitle);
  assert.equal((await requests()).length, 1);
  checks.push("Cancelled draft does not leak when selecting another session");

  await openSession(firstId);
  await title.click();
  await input.fill("Delayed first session rename");
  await input.press("Enter");
  await page.waitForFunction(
    () =>
      document.querySelector(".st-title-input")?.getAttribute("aria-busy") ===
      "true",
  );
  assert.equal(await input.getAttribute("readonly"), "");
  await openSession(secondId);
  // Let the source component consume the intentionally delayed stale response.
  await page.waitForTimeout(1400);
  assert.equal(await page.locator(".st-title").innerText(), secondTitle);
  assert.equal(await page.locator(".st-title-input").count(), 0);
  assert.equal(
    (await readDb()).threads[firstId].name,
    "Delayed first session rename",
  );
  assert.equal((await readDb()).threads[secondId].name, secondTitle);
  assert.equal((await requests()).length, 2);
  checks.push(
    "Pending rename readonly; delayed success after session switch updates correct stored thread without reopening or changing current title",
  );

  // Retain a natural long title for responsive pill validation.
  await openSession(firstId);
  await title.click();
  await input.fill(initialTitle);
  await input.press("Enter");
  await page.waitForFunction(
    (name) => document.querySelector(".st-title")?.textContent === name,
    initialTitle,
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(760, 650),
  );
  await page.waitForFunction(() => innerWidth < 800);
  // R4i-gui GU1: rail mode has no folder pill to compact (source-titlebar.jsx:471/:475), so the narrow check is the
  // title against the trailing controls only.
  metrics.narrow = await page.locator(".st-toolbar").evaluate((node) => {
    const title = node.querySelector(".st-title"),
      controls = node.querySelector(".st-trailing");
    return {
      viewport: innerWidth,
      title: title.getBoundingClientRect().toJSON(),
      controls: controls.getBoundingClientRect().toJSON(),
      folderPills: node.querySelectorAll(".st-folder").length,
    };
  });
  assert.equal(metrics.narrow.folderPills, 0);
  assert.ok(metrics.narrow.title.right <= metrics.narrow.controls.left + 1);
  assert.ok(metrics.narrow.title.width > 30);
  await page.screenshot({
    path: path.join(evidence, "titlebar-source-narrow.png"),
  });
  // Source labels (sidebar-groups.js hw "Hide sidebar" / Nb "Show sidebar"),
  // renamed from the earlier local Collapse/Expand wording; same controls.
  await page
    .getByRole("button", { name: "Hide sidebar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show sidebar", exact: true })
    .waitFor();
  metrics.collapsed = await page
    .locator(".st-toolbar")
    .evaluate((node) => ({
      firstControlX: node.querySelector("button").getBoundingClientRect().left,
      innerX: node.querySelector(".st-inner").getBoundingClientRect().left,
      headerHeight: node.getBoundingClientRect().height,
      controlsRight: node.querySelector(".st-trailing").getBoundingClientRect()
        .right,
      width: innerWidth,
    }));
  assert.ok(
    metrics.collapsed.firstControlX >= 88,
    "Expand control clears native traffic lights",
  );
  assert.ok(metrics.collapsed.innerX >= metrics.collapsed.firstControlX + 24);
  assert.ok(metrics.collapsed.controlsRight <= metrics.collapsed.width);
  assert.equal(metrics.collapsed.headerHeight, 40);
  await page.screenshot({
    path: path.join(evidence, "titlebar-source-collapsed.png"),
  });
  checks.push(
    "760px window keeps the title clear of the trailing tools (rail mode: no folder pill); collapsed sidebar leaves88px native traffic-light clearance",
  );
  await page
    .getByRole("button", { name: "Show sidebar", exact: true })
    .click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(1468, 852),
  );
  await page.waitForFunction(() => innerWidth > 1400);
  checks.push(
    "Window restored to 1468px (rail mode: the folder lives on the rail's Environment card, not a titlebar pill)",
  );
  // R4i-gui GU1 (R4f-rail SR-7/SR-8): in rail mode the folder pill's actions live on the rail's Environment card. The
  // working folder row is rail-view.mjs gD (c96d752d0 rD → gD → Qu/Jo): repo-name-chip.mjs pLe, a ghost CdsButton named
  // by the folder's basename under CdsTooltip {content "Working folder", detail: the path}, opening CdsDropdown.Popup
  // side bottom / align start over renderMenuItems(railRepoMenuItems(...)) (source-session-rail.jsx:379: reveal, Copy
  // path, Open in terminal, one group each, so two separators). The menu has no group label (no 'Working directory').
  const railEnvironment = await railEnvironmentCard();
  const folderPill = railEnvironment.getByRole("button", { name: path.basename(workspace), exact: true });
  await folderPill.click();
  const folderMenu = page.getByRole("menu").filter({ has: page.getByRole("menuitem", { name: "Copy path", exact: true }) });
  await folderMenu.waitFor();
  await page.waitForFunction(() => !!document.activeElement?.closest('[role="menu"]'));
  metrics.folderMenu = await folderPill.evaluate((pill) => {
    const menu = [...document.querySelectorAll('[role="menu"]')].find((node) => [...node.querySelectorAll('[role="menuitem"]')].some((item) => item.textContent === "Copy path"));
    const anchor = pill.getBoundingClientRect(), box = menu.getBoundingClientRect();
    return {
      side: menu.dataset.side, align: menu.dataset.align,
      groupLabels: menu.querySelectorAll('[role="group"][aria-labelledby]').length,
      items: [...menu.querySelectorAll('[role="menuitem"]')].map((node) => node.textContent),
      separators: menu.querySelectorAll('[role="separator"]').length, haspopup: pill.getAttribute("aria-haspopup"), expanded: pill.getAttribute("aria-expanded"),
      below: box.top >= anchor.bottom, highlighted: menu.querySelector("[data-highlighted]")?.textContent ?? null,
    };
  });
  assert.deepEqual(metrics.folderMenu, { side: "bottom", align: "start", groupLabels: 0,
    // revealLabel (source-session-rail.jsx:354, c18ab0d94 C) is "Show in Finder" on macOS; the last group is Open in terminal.
    // focusItemOnOpen "auto": a mouse open highlights nothing; ArrowDown starts at the first row.
    items: ["Show in Finder", "Copy path", "Open in terminal"], separators: 2, haspopup: "menu", expanded: "true", below: true, highlighted: null });
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.querySelector('[role="menu"] [data-highlighted]')?.textContent === "Show in Finder");
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => document.querySelector('[role="menu"] [data-highlighted]')?.textContent === "Copy path");
  await page.keyboard.press("s");
  await page.waitForFunction(() => document.querySelector('[role="menu"] [data-highlighted]')?.textContent === "Show in Finder");
  await page.keyboard.press("Escape");
  await folderMenu.waitFor({ state: "detached" });
  assert.equal(await folderPill.evaluate((node) => document.activeElement === node), true, "Escape refocuses the folder chip");
  assert.equal(await folderPill.getAttribute("aria-expanded"), "false");
  checks.push(
    "R4i-gui GU1 rail folder chip (rail Environment card, repo-name-chip pLe): role=menu below the chip (side bottom, align start), no group label, Show in Finder / separator / Copy path / separator / Open in terminal; nothing highlighted after a mouse open, ArrowDown and typeahead move the highlight, Escape closes and refocuses the chip",
  );
  // R03 (c856385e2 X0Ntx9olgx; sidebar-groups.js:15393-15402 addError): a failed session action is a danger toast with
  // the catalog copy, never the composer banner with Electron's "Error invoking remote method" text. The offscreen
  // boundary forbids shell.openPath; this stub stands in for a removed fixture folder and rejects like a failed call.
  await app.evaluate(({ shell }) => {
    globalThis.__titlebarOpenPath = shell.openPath;
    shell.openPath = async (target) => { throw new Error(`Fixture folder is gone: ${target}`); };
  });
  // B09 (c593f7513 Om): Open in lives in the header session menu behind the CaretDown beside the title.
  await page.locator(".st-toolbar").getByRole("button", { name: /^More options for / }).click();
  await page.getByRole("menuitem", { name: "Open in", exact: true }).click();
  await page.getByRole("menu", { name: "Open in", exact: true }).getByRole("menuitem", { name: "Finder", exact: true }).click();
  const failureToast = page.locator('[data-cds="Toast"] [role="alertdialog"]').filter({ hasText: "Couldn’t show this folder in the file manager." });
  await failureToast.waitFor();
  metrics.actionErrorToast = {
    variant: await failureToast.getAttribute("data-variant"),
    text: await page.locator('[data-cds="Toast"]').innerText(),
    banners: await page.locator(".composer-error").count(),
  };
  await app.evaluate(({ shell }) => { shell.openPath = globalThis.__titlebarOpenPath; });
  assert.equal(metrics.actionErrorToast.variant, "danger");
  assert.doesNotMatch(metrics.actionErrorToast.text, /Error invoking remote method|Fixture folder is gone|Could not/);
  assert.equal(metrics.actionErrorToast.banners, 0, "no inline composer banner for a non-composer action");
  await failureToast.getByRole("button", { name: "Dismiss", exact: true }).click();
  await failureToast.waitFor({ state: "detached" });
  checks.push(
    "R03 action errors: titlebar ⋮ › Open in › Finder failing in main shows a danger [data-cds=Toast] 'Couldn’t show this folder in the file manager.' (no .composer-error, no IPC prefix or raw reason)",
  );

  await page.getByRole("button", { name: "New", exact: true }).click();
  const whatsNew = page.getByRole("button", {
    name: "What’s new",
    exact: true,
  });
  // R03 (titlebar-release-notes.js:5059-5069 P `n`): the nudge needs a RELEASE_NOTES entry for the running version;
  // without one (a bumped package with no notes yet) it is absent and the seen flow does not apply.
  const releaseEntry = RELEASE_NOTES.find((entry) => entry.version === build.version);
  if (!releaseEntry) {
  await page.locator(".st-trailing").waitFor({ state: "attached" });
  assert.equal(await whatsNew.count(), 0, "no release notes entry for this version, so no nudge");
  checks.push("What’s new: the running version has no RELEASE_NOTES entry, so the home nudge is absent (P n)");
  } else {
  await whatsNew.focus();
  await whatsNew.press("Enter");
  const dialog = page.getByRole("dialog", { name: "What’s new", exact: true });
  await dialog.waitFor();
  // The open transition starts once data-starting-style leaves (data-open); before that getAnimations() is empty and
  // the wait would be vacuous, measuring a scaled popup under load.
  await dialog.evaluate(async (node) => {
    while (!node.hasAttribute("data-open")) await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(node.getAnimations().map((animation) => animation.finished));
  });
  // R03 (titlebar-release-notes.js:5156-5236 B): the shared CDS Dialog, size md, max-h min(720px,85vh), initial focus
  // on the popup, the bleed header (h-12, alpha-1 tint) with one dialog-scoped 'Close', #root inert while open.
  metrics.release = await dialog.evaluate((node) => {
    const header = node.querySelector(".sdlg-bleed-header"), probe = document.createElement("span");
    probe.style.background = "var(--cds-alpha-1)"; header.append(probe);
    const tint = getComputedStyle(probe).backgroundColor; probe.remove();
    const badge = node.querySelector('.st-release-entry [data-cds="Badge"]');
    return {
      cds: node.dataset.cds, size: node.dataset.dialogSize,
      width: node.getBoundingClientRect().width,
      maxHeight: parseFloat(getComputedStyle(node).maxHeight), expectedMaxHeight: Math.min(720, innerHeight * 0.85),
      headerHeight: header.getBoundingClientRect().height, headerBackground: getComputedStyle(header).backgroundColor, tint,
      focused: document.activeElement === node,
      shadow: getComputedStyle(node).boxShadow,
      rootInert: document.getElementById("root").inert,
      badge: { text: badge?.textContent, variant: badge?.dataset.variant, font: getComputedStyle(badge).fontFamily },
      date: node.querySelector(".st-release-date h4")?.textContent,
      // The running version's entry (newest first); older releases follow with their own groups.
      groups: [...node.querySelector(".st-release-entry").querySelectorAll(".st-release-group h5")].map((h5) => h5.textContent),
    };
  });
  assert.equal(metrics.release.cds, "Dialog");
  assert.equal(metrics.release.size, "md");
  assert.equal(metrics.release.width, 520);
  assert.ok(Math.abs(metrics.release.maxHeight - metrics.release.expectedMaxHeight) <= 0.5, `max-height ${metrics.release.maxHeight}`);
  assert.equal(metrics.release.headerHeight, 48);
  assert.equal(metrics.release.headerBackground, metrics.release.tint, "bleed header carries the alpha-1 tint");
  assert.equal(metrics.release.focused, true);
  assert.notEqual(metrics.release.shadow, "none");
  assert.equal(metrics.release.rootInert, true);
  assert.deepEqual(metrics.release.badge.text, build.version);
  assert.equal(metrics.release.badge.variant, "neutral");
  assert.match(metrics.release.badge.font, /mono/i);
  assert.equal(metrics.release.date, releaseNoteDate(releaseEntry.date));
  assert.deepEqual(metrics.release.groups, ["New", "Improved", "Fixed"].filter((label, index) => releaseEntry.items.some((item) => item.kind === ["feat", "improvement", "fix"][index])));
  assert.equal(await dialog.getByRole("button", { name: "Close release notes" }).count(), 0);
  assert.match(await dialog.innerText(), /OpenClaude Desktop is now a frame for agent cores/);
  assert.doesNotMatch(await dialog.innerText(), /Codex/);
  assert.doesNotMatch(await dialog.innerText(), /Native model menu/);
  await dialog.press("Tab");
  const close = dialog.getByRole("button", {
    name: "Close",
    exact: true,
  });
  assert.equal(
    await close.evaluate((node) => document.activeElement === node),
    true,
  );
  await close.press("Tab");
  assert.equal(
    await close.evaluate((node) => document.activeElement === node),
    true,
  );
  await close.press("Shift+Tab");
  assert.equal(
    await close.evaluate((node) => document.activeElement === node),
    true,
  );
  await page.screenshot({
    path: path.join(evidence, "titlebar-source-release-notes.png"),
  });
  // The Dialog's exit transition: data-ending-style lands on the popup before it unmounts (useDialogRetention).
  await page.evaluate(() => {
    const node = document.querySelector(".sdlg-popup.st-release-notes");
    window.__releaseEnding = false;
    new MutationObserver(() => { if (node.hasAttribute("data-ending-style")) window.__releaseEnding = true; }).observe(node, { attributes: true });
  });
  await close.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => window.__releaseEnding), true, "the popup played its exit transition");
  assert.equal(await page.evaluate(() => document.getElementById("root").inert), false);
  // titlebar-release-notes.js:5064-5068 P + :5166-5168 B: opening the notes
  // stores this version (markSeen), so justUpdated is false and V (:5238-5256,
  // `justUpdated || modalOpen`) drops the nudge once the modal closes. Before
  // 0.2.126 the button stayed and this step asserted focus returned to it and
  // reopened it; that trigger no longer exists, so the restore target is gone
  // (LocalReleaseNotes restores only a still-connected element) and focus must
  // not be left on a detached node.
  assert.equal(await whatsNew.count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement?.isConnected === true),
    true,
  );
  const seenKey = "ccd-whats-new-seen-version";
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), seenKey),
    build.version,
  );
  await openSession(firstId);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.locator(".st-trailing").waitFor({ state: "attached" });
  await page.locator(".st-title").waitFor({ state: "detached" });
  assert.equal(await whatsNew.count(), 0);
  await page.reload();
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.locator(".st-trailing").waitFor({ state: "attached" });
  await page.locator(".st-title").waitFor({ state: "detached" });
  assert.equal(await whatsNew.count(), 0);
  await page.screenshot({
    path: path.join(evidence, "titlebar-source-whats-new-seen.png"),
  });
  checks.push(
    "What’s new hidden once seen (P markSeen on open): absent after close, after session→home and after reload; seen key holds build version",
  );
  // A different stored version reads as a new client version with notes:
  // the nudge returns; the Close button path marks it seen again.
  await page.evaluate((key) => localStorage.setItem(key, "0.0.0-previous"), seenKey);
  await page.reload();
  await page
    .getByRole("button", { name: "Model", exact: true })
    .filter({ hasText: "Test model" })
    .waitFor();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await whatsNew.waitFor();
  await whatsNew.click();
  await dialog.waitFor();
  assert.equal(await whatsNew.count(), 1, "nudge stays while the modal is open (V: || modalOpen)");
  await dialog
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await dialog.waitFor({ state: "detached" });
  assert.equal(await whatsNew.count(), 0);
  assert.equal(
    await page.evaluate(() => document.activeElement?.isConnected === true),
    true,
  );
  assert.equal(
    await page.evaluate((key) => localStorage.getItem(key), seenKey),
    build.version,
  );
  checks.push(
    "Release notes: shared CDS Dialog md (520px, max-h min(720px,85vh), #root inert), bleed 48px alpha-1 header with a single dialog-scoped Close, neutral font-mono version Badge, dated entry with New/Improved groups; initial focus on the popup, Tab trap, Escape (exit transition) and Close; nudge returns for an older stored version and hides after closing; truthful local-client identity",
  );
  }
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    fixture: true,
    build,
    at: new Date().toISOString(),
    checks,
    metrics,
    profile,
    errors,
    renameRequestCount: (await requests()).length,
  };
  await fs.writeFile(
    path.join(evidence, "titlebar-source-test.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(evidence, "titlebar-source-failure.png") })
      .catch(() => {});
  await fs.writeFile(
    path.join(evidence, "titlebar-source-test.json"),
    JSON.stringify(
      {
        passed: false,
        fixture: true,
        build,
        at: new Date().toISOString(),
        checks,
        metrics,
        profile,
        errors,
        error: error.stack,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await app.close();
}
