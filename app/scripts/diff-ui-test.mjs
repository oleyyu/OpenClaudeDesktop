import { _electron as electron } from "../../tools/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Run after a fresh application build. Only this isolated profile and Git
// workspace are changed; Codex is replaced by the existing protocol fixture.
const root = path.resolve(import.meta.dirname, "..");
const evidence = path.join(root, "../analysis/batch-20260920");
await fs.mkdir(evidence, { recursive: true });
const profile = await fs.mkdtemp(path.join(evidence, "diff-ui-profile-"));
const workspace = path.join(profile, "workspace");
await fs.mkdir(workspace);
const gitEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
const git = (...args) => execFileSync("git", ["-c", "core.hooksPath=/dev/null", ...args], {
  cwd: workspace,
  env: { ...gitEnv, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", LC_ALL: "C" },
  encoding: "utf8",
  stdio: "pipe",
});
git("init", "-b", "main");
git("config", "user.name", "Diff fixture");
git("config", "user.email", "diff@example.invalid");
git("config", "core.quotePath", "true");
await fs.writeFile(path.join(workspace, "alpha.txt"), "ALPHA_KEEP_1\nALPHA_OLD_2\nALPHA_KEEP_3\nALPHA_KEEP_4\nALPHA_OLD_5\nALPHA_KEEP_6\n");
await fs.writeFile(path.join(workspace, "你好.txt"), "UNICODE_OLD\n");
await fs.writeFile(path.join(workspace,"app.ts"),"export const answer = 1; // " + "wrap ".repeat(80) + "\n");
// Real separated edits exercise line-info separators, not synthetic DOM rows.
const contextLines=Array.from({length:60},(_,i)=>`CONTEXT_${i+1}`);
await fs.writeFile(path.join(workspace,'context.txt'),contextLines.join('\n')+'\n');
git("add", ".");
git("-c", "commit.gpgsign=false", "commit", "-m", "isolated diff baseline");
await fs.writeFile(path.join(workspace, "alpha.txt"), "ALPHA_KEEP_1\nALPHA_NEW_2\nALPHA_EXTRA_3\nALPHA_KEEP_3\nALPHA_KEEP_4\nALPHA_NEW_6\nALPHA_KEEP_6\n");
await fs.writeFile(path.join(workspace, "你好.txt"), "UNICODE_NEW\n");
await fs.writeFile(path.join(workspace, "new-file.txt"), "NEW_FILE_FIRST\nNEW_FILE_SECOND\n");
await fs.writeFile(path.join(workspace,"app.ts"),"export const answer = 2; // " + "wrap ".repeat(80) + "\n");
contextLines[9]='CONTEXT_CHANGED_10'; contextLines[49]='CONTEXT_CHANGED_50';
await fs.writeFile(path.join(workspace,'context.txt'),contextLines.join('\n')+'\n');
// Independent Git output is the oracle for copied bytes, not the application
// parser or a DOM-derived string. These flags match the actual backend scope.
const alphaPatch = git("diff", "--no-ext-diff", "--no-textconv", "--no-color", "--no-relative", "--src-prefix=a/", "--dst-prefix=b/", "--find-renames", "--ignore-submodules=none", "--unified=2147483647", "HEAD", "--", "alpha.txt");
const unicodePatch = git("diff", "HEAD", "--", "你好.txt");
assert.match(unicodePatch, /\\344\\275\\240/, "Fixture must exercise actual Git octal path quoting");
const malformedPatch = "diff --git a/broken.txt b/broken.txt\n--- a/broken.txt\n+++ b/broken.txt\n@@ -1,2 +1,2 @@\n-BROKEN_OLD\n+BROKEN_NEW\n";
const rawFragment = "-RAW_FRAGMENT_OLD\n+RAW_FRAGMENT_NEW\n";
const threadId = "diff-ui-thread", now = Math.floor(Date.now() / 1000);
await fs.writeFile(path.join(profile, "preferences.json"), JSON.stringify({
  cwd: workspace, theme: "light", mode: "code", model: "fixture", threadIds: [threadId], sidebarWidth: 288,
}));
await fs.writeFile(path.join(profile, "fixture-threads.json"), JSON.stringify({ next: 100, threads: {
  [threadId]: {
    id: threadId, cwd: workspace, name: "Diff renderer verification", createdAt: now, updatedAt: now, archived: false,
    turns: [{ id: "diff-fixture-turn", status: "completed", items: [
      { id: "diff-fixture-user", type: "userMessage", content: [{ type: "text", text: "Inspect isolated diff fixtures." }] },
      { id: "diff-fixture-files", type: "fileChange", status: "completed", changes: [
        { path: "broken.txt", kind: { type: "update" }, diff: malformedPatch },
        { path: "fragment.txt", kind: { type: "update" }, diff: rawFragment },
      ] },
      { id: "diff-fixture-reply", type: "agentMessage", text: "Diff fixture ready." },
    ] }],
  },
} }));
const binary = path.join(root, "tests/fixtures/codex-server.cjs");
await fs.chmod(binary, 0o755);
const executablePath = process.env.TEST_ELECTRON_BINARY || path.join(root, "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron");
const env = { ...process.env, CODE_DESKTOP_DATA: profile, CODEX_BINARY: binary };
delete env.ELECTRON_RUN_AS_NODE;
const checks = [], metrics = {}, errors = [];
let app, page, clipboardSaved = false, clipboardRestored = false, failure;
try {
  app = await electron.launch({ executablePath, args: [root], env });
  page = await app.firstWindow();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => errors.push(error.message));
  // Electron 44 uses async read/write(ClipboardItem[]), as declared in the
  // installed electron.d.ts. Materialize every payload before changing the
  // clipboard: a read item may otherwise resolve data lazily. Nothing from the
  // clipboard is serialized into the test report or sent back to Playwright.
  metrics.clipboardApi = await app.evaluate(async ({ clipboard, ClipboardItem }) => {
    if (typeof clipboard.read === "function" && typeof ClipboardItem === "function") {
      const originals = await clipboard.read();
      const items = await Promise.all(originals.map(async (item) => new ClipboardItem(
        Object.fromEntries(await Promise.all(item.types.map(async (type) => [type, await item.getType(type)]))),
      )));
      globalThis.diffUiClipboardBackup = { kind: "items", items };
      return "async ClipboardItem[]";
    }
    // Older Electron builds expose synchronous named format readers instead.
    const data = { text: await clipboard.readText() };
    if (typeof clipboard.readHTML === "function") data.html = clipboard.readHTML();
    if (typeof clipboard.readRTF === "function") data.rtf = clipboard.readRTF();
    if (typeof clipboard.readImage === "function") {
      const image = clipboard.readImage();
      if (!image.isEmpty()) data.image = image;
    }
    if (typeof clipboard.readBookmark === "function") {
      const bookmark = clipboard.readBookmark();
      if (bookmark.title) data.bookmark = bookmark.title;
    }
    const empty = typeof clipboard.availableFormats === "function" && clipboard.availableFormats().length === 0;
    globalThis.diffUiClipboardBackup = { kind: typeof clipboard.readHTML === "function" ? "legacy" : "text", empty, data };
    return typeof clipboard.readHTML === "function" ? "legacy formats" : "text";
  });
  clipboardSaved = true;
  await page.getByRole("button", { name: "Model", exact: true }).filter({ hasText: "Test model" }).waitFor();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1468, 852));
  await page.locator(`[data-source-session-id="${threadId}"] .source-session-open`).click();
  await page.locator(".st-title").waitFor();
  await page.evaluate(() => document.fonts.ready);
  // R4i-gui GU1 (R4i-rail RL2): rail mode hides the band (main.jsx railHidesBand); the session's git row is the rail
  // Changes card's (changes-row.mjs OLe, data-rail-changes-row).
  await page.locator('aside[aria-label="Session details"] nav[aria-label="Repository and pull request controls"] [data-rail-changes-row]').waitFor();
  // panes-toggle-current.js:3165 cl label is "Changes" (was the non-source "Show changes").
  await page.getByRole("button", { name: "Changes", exact: true }).click();
  const changes = page.getByRole("complementary", { name: "Changes panel" });
  // F12 zm: the Changes title is the diff-scope trigger, default "All changes" vs the session base (main here).
  await changes.getByRole("button", { name: "Diff scope: main → working tree", exact: true }).waitFor();
  const alpha = changes.locator('.sdiff-file[data-file-path="alpha.txt"]');
  const unicode = changes.locator('.sdiff-file[data-file-path="你好.txt"]');
  const created = changes.locator('.sdiff-file[data-file-path="new-file.txt"]');
  await alpha.locator(".sdiff-row.added").filter({ hasText: "ALPHA_NEW_2" }).waitFor();
  await unicode.locator(".sdiff-row.added").filter({ hasText: "UNICODE_NEW" }).waitFor();
  await created.locator(".sdiff-row.added").filter({ hasText: "NEW_FILE_SECOND" }).waitFor();
  // Added one actual Git fixture file; the original four file assertions remain below.
  assert.equal(await changes.locator(".sdiff-file").count(), 5);
  assert.equal(await changes.locator(".sdiff-notice").count(), 0);
  // c219730b0 We renders the counts as '+{n}' text-git-added / '\u2212{n}' text-git-removed spans without an
  // aria-label (the old "3 additions, 2 deletions" label was local); the same counts are asserted on the text.
  assert.deepEqual(await alpha.locator(".sdiff-counts > span").evaluateAll((nodes) => nodes.map((node) => [node.className, node.textContent])),
    [["text-git-added", "+3"], ["text-git-removed", "\u22122"]]);
  assert.equal(await unicode.locator(".sdiff-path").textContent(), "你好.txt");
  const rowData = async (file) => file.locator(".sdiff-row").evaluateAll((rows) => rows.map((row) => ({
    text: row.querySelector(".sdiff-line-content").textContent,
    old: row.getAttribute("data-old-line"), new: row.getAttribute("data-new-line"),
    visible: Array.from(row.querySelectorAll(".sdiff-line-number"), (number) => number.textContent),
  })));
  metrics.alphaRows = await rowData(alpha);
  assert.deepEqual(metrics.alphaRows, [
    { text: "ALPHA_KEEP_1", old: "1", new: "1", visible: ["1"] },
    { text: "ALPHA_OLD_2", old: "2", new: null, visible: ["2"] },
    { text: "ALPHA_NEW_2", old: null, new: "2", visible: ["2"] },
    { text: "ALPHA_EXTRA_3", old: null, new: "3", visible: ["3"] },
    { text: "ALPHA_KEEP_3", old: "3", new: "4", visible: ["4"] },
    { text: "ALPHA_KEEP_4", old: "4", new: "5", visible: ["5"] },
    { text: "ALPHA_OLD_5", old: "5", new: null, visible: ["5"] },
    { text: "ALPHA_NEW_6", old: null, new: "6", visible: ["6"] },
    { text: "ALPHA_KEEP_6", old: "6", new: "7", visible: ["7"] },
  ]);
  assert.deepEqual(await rowData(created), [
    { text: "NEW_FILE_FIRST", old: null, new: "1", visible: ["1"] },
    { text: "NEW_FILE_SECOND", old: null, new: "2", visible: ["2"] },
  ]);
  assert.deepEqual(await rowData(unicode), [
    { text: "UNICODE_OLD", old: "1", new: null, visible: ["1"] },
    { text: "UNICODE_NEW", old: null, new: "1", visible: ["1"] },
  ]);
  checks.push("Real Git HEAD/working-tree and untracked diffs render five files, decoded Unicode paths, accurate counts, one unified gutter and exact old/new DOM coordinates");
  const contextFile=changes.locator('.sdiff-file[data-file-path="context.txt"]');
  assert.equal(await alpha.locator('.sdiff-hunk-separator').count(),0,'ca7 Jn: zero omitted lines has no separator');
  assert.deepEqual(await contextFile.locator('.sdiff-separator-content').allTextContents(), ['6 unmodified lines','33 unmodified lines','7 unmodified lines']);
  // 0.2.58: the actual Git adapter now supplies a complete pinned-HEAD patch; ca7 Jn/Ut includes known tail and expansion. Historical partial-patch assertions remain in model/SSR tests.
  assert.equal(await contextFile.locator('[data-expand-index]').count(),3);
  assert.equal(await contextFile.locator('.sdiff-expand').count(),3);
  assert.equal(await contextFile.locator('.sdiff-line-content').filter({hasText:'CONTEXT_30'}).count(),0,'omitted text is not invented');
  metrics.separators=await contextFile.locator('.sdiff-hunk-separator').evaluateAll(nodes=>nodes.map(node=>{
    const s=getComputedStyle(node),c=getComputedStyle(node.querySelector('.sdiff-separator-content'));return {height:node.getBoundingClientRect().height,top:s.marginTop,bottom:s.marginBottom,padding:s.paddingLeft,radius:c.borderRadius,select:s.userSelect};
  }));
  assert.deepEqual(metrics.separators,[{height:32,top:'0px',bottom:'8px',padding:'8px',radius:'0px 6px 6px 0px',select:'none'},{height:32,top:'8px',bottom:'8px',padding:'8px',radius:'0px 6px 6px 0px',select:'none'},{height:32,top:'8px',bottom:'0px',padding:'8px',radius:'0px 6px 6px 0px',select:'none'}]);
  // c49 line-info expandable clears left radii; ca7 Gi/Qi final CDS injection keeps transparent background/16px controls.
  checks.push('Real complete Git patch shows6/33/7 known unmodified lines with32px height,8px inset and source expandable corner geometry; real context stays collapsed until requested');
  metrics.style = await alpha.evaluate((file) => {
    const css = getComputedStyle(file.querySelector(".sdiff-row.added"));
    return { headerHeight: file.querySelector(".sdiff-header").getBoundingClientRect().height,
      fontSize: css.fontSize, lineHeight: css.lineHeight, addedColor: css.color };
  });
  assert.equal(metrics.style.headerHeight, 32);
  assert.equal(metrics.style.fontSize, "12px");
  assert.equal(metrics.style.lineHeight, "17px");
  assert.equal(metrics.style.addedColor, "rgb(30, 158, 60)");
  checks.push("Current-source file headers are 32px; compact rows use 12px/17px and Git-added ink");
  const typed=changes.locator('.sdiff-file[data-file-path="app.ts"]');
  await typed.locator('.sdiff-hunk[data-highlighted][data-word-diff]').waitFor();
  assert.deepEqual(await typed.locator('[data-diff-span]').allTextContents(),['1','2']);
  assert.ok(await typed.locator('[data-code-token]').count()>2);
  assert.equal(await typed.locator('[data-code-token]').first().evaluate(el=>getComputedStyle(el).display),'inline');
  assert.equal(await typed.locator('[data-code-token]').first().evaluate(el=>getComputedStyle(el).paddingLeft),'0px');
  assert.equal(await typed.locator('.sdiff-line-content').first().evaluate(el=>getComputedStyle(el).whiteSpace),'pre-wrap');
  assert.equal(await typed.locator('.sdiff-file-body').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.ok(await typed.locator('.sdiff-row').first().evaluate(el=>el.getBoundingClientRect().height)>17);
  checks.push('Actual TypeScript syntax and word spans compose, preserve token spacing, and wrap long code within the Changes pane');


  const toggle = alpha.locator(".sdiff-file-toggle");
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await toggle.click();
  await alpha.locator(".sdiff-file-body").waitFor({ state: "detached" });
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.equal(await unicode.locator(".sdiff-file-body").isVisible(), true);
  await toggle.focus();
  await toggle.press("Enter");
  await alpha.locator(".sdiff-file-body").waitFor();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.deepEqual(await rowData(alpha), metrics.alphaRows);
  checks.push("Mouse collapse removes only one file body; Enter reopens it with the same verified rows and accessible expanded state");

  // The Changes header had a local "Copy patch for <path>" button with a role=status "Copied patch" line. The
  // source header has neither: c219730b0 $e is a ContextMenu whose c3e58cab4 Copy submenu offers Absolute path /
  // Relative path / Filename (toast "Copied to clipboard."). Copy the relative path through that menu instead. The
  // byte-exact patch-copy check goes with the removed feature (nothing in the source header copies a patch); the
  // rendered rows above remain verified against the real Git fixture, and alphaPatch still anchors its header.
  assert.match(alphaPatch, /^diff --git a\/alpha\.txt b\/alpha\.txt\n/);
  assert.equal(await alpha.getByRole("button", { name: /Copy patch/ }).count(), 0);
  await alpha.locator(".sdiff-header").click({ button: "right" });
  const fileMenu = page.locator('[data-cds="ContextMenu"]');
  await fileMenu.waitFor();
  await fileMenu.getByRole("menuitem", { name: "Copy", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Relative path", exact: true }).click();
  await fileMenu.waitFor({ state: "detached" });
  await page.locator(".source-toast-card").filter({ hasText: "Copied to clipboard." }).first().waitFor();
  assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), "alpha.txt");
  checks.push("Changes header context menu Copy > Relative path (c219730b0 $e / c3e58cab4) writes exactly 'alpha.txt' to the clipboard and raises the 'Copied to clipboard.' toast; the non-source Copy patch button is gone");
  await page.screenshot({ path: path.join(evidence, "diff-source-real-git.png") });

  // Source controls: selected split survives a narrow pane; only the actual
  // rendered layout falls back. The initial 2:3 tile ratio does not guarantee
  // <560px, so use the source Mh divider's actual 120px Shift+Arrow step to
  // enter that scenario. Keep the window size and 560px boundary unchanged.
  const diffView = changes.locator('.sdiff-view');
  const divider = page.getByRole('separator', { name: /^Resize Chat and / });
  await divider.focus();
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  assert.ok(await diffView.evaluate(el => el.getBoundingClientRect().width) < 560);
  await changes.getByRole('button', { name: 'Changes settings', exact: true }).click();
  const sideBySide = page.getByRole('menuitemcheckbox', { name: /^Side by side/ });
  const wordWrap = page.getByRole('menuitemcheckbox', { name: /^Word wrap/ });
  assert.equal(await sideBySide.getAttribute('aria-checked'), 'false');
  assert.equal(await wordWrap.getAttribute('aria-checked'), 'true');
  await sideBySide.click();
  await page.getByRole('menuitemcheckbox', { name: /Side by side.*Needs a wider pane/, checked: true }).waitFor();
  assert.equal(await diffView.getAttribute('data-layout'), 'unified');
  await page.keyboard.press('Escape');
  await changes.getByRole('button', { name: 'Expand', exact: true }).click();
  await changes.locator('.sdiff-view[data-layout="split"]').waitFor();
  assert.ok(await diffView.evaluate(el => el.getBoundingClientRect().width) >= 560);
  assert.deepEqual(await contextFile.locator('.sdiff-separator-content').allTextContents(),['6 unmodified lines','33 unmodified lines','7 unmodified lines'],'split renders one gap label, not duplicated counts');
  assert.deepEqual(await alpha.locator('.sdiff-split-row').first().locator('.sdiff-line-content').allTextContents(), ['ALPHA_KEEP_1', 'ALPHA_KEEP_1']);
  assert.equal(await created.locator('.sdiff-split-empty .sdiff-line-number').count(), 0);
  await typed.locator('.sdiff-hunk[data-highlighted][data-word-diff]').waitFor();
  assert.deepEqual(await typed.locator('[data-diff-span]').allTextContents(), ['1', '2']);
  await changes.getByRole('button', { name: 'Changes settings', exact: true }).click();
  await wordWrap.click();
  await page.getByRole('menuitemcheckbox', { name: /^Word wrap/, checked: false }).waitFor();
  assert.equal(await typed.locator('.sdiff-line-content').first().evaluate(el => getComputedStyle(el).whiteSpace), 'pre');
  await wordWrap.click();
  await page.keyboard.press('Escape');
  await changes.getByRole('button', { name: 'Collapse', exact: true }).click();
  await changes.locator('.sdiff-view[data-layout="unified"]').waitFor();
  await changes.getByRole('button', { name: 'Changes settings', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: /Side by side.*Needs a wider pane/, checked: true }).waitFor();
  await sideBySide.click();
  await page.keyboard.press('Escape');
  assert.deepEqual(await rowData(alpha), metrics.alphaRows);
  checks.push('Changes settings keep checkbox menus open, retain selected split across the 560px boundary, render real paired rows and word spans, and restore unified/wrap defaults');

  await changes.getByRole("button", { name: "Close panel", exact: true }).click();
  await changes.waitFor({ state: "detached" });
  await page.locator(".source-step-trigger").filter({ hasText: "2 files" }).click();
  // File tools now use approval-current UO:6784–6837 code cards (0.2.17),
  // not the old generic Changes renderer. Its Codex fallback contract keeps
  // unknown update patches as literal text without invented line numbers,
  // counts, or inferred +/- styling; preserve byte and Copy coverage here.
  const tool = page.locator('[data-transcript-item-id="diff-fixture-files"]');
  const inline = tool.locator('.sft-card');
  const broken = inline.nth(0), fragment = inline.nth(1);
  await broken.locator('.sft-read').waitFor();
  assert.equal(await inline.count(), 2);
  assert.equal(await broken.locator('.sft-path').getAttribute('aria-label'), 'broken.txt');
  assert.equal(await fragment.locator('.sft-path').getAttribute('aria-label'), 'fragment.txt');
  assert.equal(await broken.locator('.sft-read').textContent(), malformedPatch);
  assert.equal(await fragment.locator('.sft-read').textContent(), rawFragment);
  assert.equal(await tool.locator('.sft-counts, .sft-diff-line, .sft-line-number, [data-code-token], .sdiff-notice').count(), 0);
  for (const [card, expected] of [[broken, malformedPatch], [fragment, rawFragment]]) {
    await card.hover(); await card.getByRole('button', {name:'Copy',exact:true}).click();
    const until = Date.now() + 5000;
    while (await app.evaluate(({clipboard}) => clipboard.readText()) !== expected && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(await app.evaluate(({clipboard}) => clipboard.readText()), expected);
  }
  checks.push("Source file-tool cards preserve malformed patches and raw fragments byte-for-byte, including real Copy, with real filenames and no invented counts/line numbers/styling");
  await page.screenshot({ path: path.join(evidence, "diff-source-fallback.png") });
  assert.deepEqual(errors, []);
} catch (error) {
  failure = error;
  await page?.screenshot({ path: path.join(evidence, "diff-source-failure.png") }).catch(() => {});
} finally {
  if (app && clipboardSaved) {
    try {
      await app.evaluate(async ({ clipboard }) => {
        const saved = globalThis.diffUiClipboardBackup;
        if (!saved) throw new Error("Clipboard snapshot unavailable");
        if (saved.kind === "items") {
          if (saved.items.length) await clipboard.write(saved.items); else await clipboard.clear();
        } else if (saved.empty) await clipboard.clear();
        else if (saved.kind === "legacy") await clipboard.write(saved.data);
        else await clipboard.writeText(saved.data.text);
        delete globalThis.diffUiClipboardBackup;
      });
      clipboardRestored = true;
    } catch (error) { failure ||= error; }
  }
  await app?.close().catch((error) => { failure ||= error; });
  const report = { passed: !failure, at: new Date().toISOString(), fixture: true, realGit: true,
    profile, workspace, executablePath, checks, metrics, clipboardRestored, rendererErrors: errors,
    ...(failure ? { error: failure.stack || String(failure) } : {}) };
  await fs.writeFile(path.join(evidence, "diff-ui-test.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, profile: undefined, workspace: undefined }, null, 2));
}
if (failure) throw failure;
