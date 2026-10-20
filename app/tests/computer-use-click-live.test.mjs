import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native } from './computer-use-live-helpers.mjs';

// app_click's right and double click on this Mac (CU_LIVE=1 only; skipped otherwise), through the real native module and the
// Accessibility helper: Finder opens a temp folder in list view in the background, a file's context menu is opened by
// AXShowMenu and closed again with app_menu close; a toolbar control without AXShowMenu answers no_menu_action.
// TextEdit (only when it is not already running: your documents are not touched) opens a temp file; a double click
// selects the word under the point through AXSelectedTextRange.
// Needs Accessibility + Screen Recording for the process running it. When the folder's window opens on another Space
// (the current one is a full-screen app's), Finder is brought forward for the test and the app that was in front gets it back afterwards.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-click-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createAxHelper } = require('../electron/computer-use/ax-helper.cjs');
const skip = (await liveSkip()) ?? false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FINDER = 'com.apple.finder';

function session(bundleId) {
  const logs = [];
  const cu = createComputerUse({ native: native(), axHelper: createAxHelper(), log: { info: (m) => logs.push(m), warn: (m) => logs.push(m) } });
  cu.grantsFor('live').grant([bundleId]);
  return { cu, logs };
}

/** The name of the frontmost app, or null. */
function frontmostApp() {
  try { return execFileSync('osascript', ['-e', 'tell application "System Events" to get name of first process whose frontmost is true'], { encoding: 'utf8' }).trim(); } catch { return null; }
}

/** A temp folder with three files, open in a background Finder window in list view; {dir, windowId, close()}. */
async function finderFolder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-click-'));
  for (const name of ['alpha.txt', 'beta.txt', 'gamma.txt']) fs.writeFileSync(path.join(dir, name), name);
  const name = path.basename(dir);
  const front = frontmostApp();
  const find = async () => {
    for (let i = 0; i < 50; i += 1) {
      await sleep(100);
      const window = (await native().call('listWindows', { bundleId: FINDER })).windows.find((w) => w.title === name);
      if (window && !window.is_off_space) return window;
    }
    return null;
  };
  execFileSync('open', ['-g', dir]);
  let window = await find(), fronted = false;
  if (!window) { execFileSync('open', [dir]); fronted = true; window = await find(); }
  if (!window) throw new Error('the Finder window did not appear on the current Space');
  execFileSync('osascript', ['-e', `tell application "Finder" to set current view of Finder window "${name}" to list view`]);
  await sleep(600);
  return {
    dir, windowId: window.window_id,
    close() {
      try { execFileSync('osascript', ['-e', `tell application "Finder" to close Finder window "${name}"`]); } catch {}
      fs.rmSync(dir, { recursive: true, force: true });
      if (fronted && front && front !== 'Finder') try { execFileSync('osascript', ['-e', `tell application "${front}" to activate`]); } catch {}
    },
  };
}

test('acceptance 1 — Finder: a right click on a file opens its context menu (AXShowMenu), app_menu close closes it', { skip }, async () => {
  const folder = await finderFolder();
  const { cu } = session(FINDER);
  try {
    await cu.appScreenshot('live', { bundleId: FINDER, windowId: folder.windowId });
    const file = cu.axFind('live', { bundleId: FINDER, windowId: folder.windowId, titleContains: 'beta.txt' }).matches[0];
    assert.ok(file, 'beta.txt is in the element summary');
    const result = await cu.appClick('live', { bundleId: FINDER, windowId: folder.windowId, element_index: file.index, button: 'right', axOnly: true });
    assert.equal(result.outcome, 'ok', JSON.stringify(result));
    assert.equal(result.path, 'ax');
    assert.equal(result.axOp, 'AXShowMenu');
    assert.ok(result.menuItems.length > 3, JSON.stringify(result.menuItems));
    assert.ok(result.menuItems.some((title) => title.includes('beta.txt')), 'the menu is the file’s (e.g. Compress “beta.txt”)');
    const closed = await cu.appMenu('live', { bundleId: FINDER, close: true });
    assert.ok(closed.closed >= 1, JSON.stringify(closed));
  } finally {
    await cu.appMenu('live', { bundleId: FINDER, close: true }).catch(() => {});
    folder.close();
  }
});

test('acceptance 4 — Finder: a control without AXShowMenu (nor on its two parents) answers no_menu_action, nothing opens', { skip }, async () => {
  const folder = await finderFolder();
  const { cu } = session(FINDER);
  try {
    await cu.appScreenshot('live', { bundleId: FINDER, windowId: folder.windowId });
    const radio = cu.axFind('live', { bundleId: FINDER, windowId: folder.windowId, role: 'radiobutton' }).matches[0];
    assert.ok(radio, 'the toolbar view switcher is in the element summary');
    const result = await cu.appClick('live', { bundleId: FINDER, windowId: folder.windowId, element_index: radio.index, button: 'right', axOnly: true });
    assert.equal(result.outcome, 'unsupported', JSON.stringify(result));
    assert.equal(result.reasonCode, 'no_menu_action');
    assert.equal(result.blocked, true);
    assert.equal((await cu.appMenu('live', { bundleId: FINDER, close: true })).closed, 0, 'no menu was left open');
  } finally {
    folder.close();
  }
});

const TEXTEDIT = 'com.apple.TextEdit';
const textEditBusy = spawnSync('pgrep', ['-x', 'TextEdit']).status === 0 && 'TextEdit is running (not touching your documents)';
const LINES = Array.from({ length: 20 }, (_, i) => `line${String(i).padStart(2, '0')} alpha beta gamma`);

/** A temp file of LINES open in TextEdit on the current Space; {shot, area, click(count), close()}. */
async function textEditDocument() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-click-text-')), file = path.join(dir, 'words.txt');
  fs.writeFileSync(file, LINES.join('\n') + '\n');
  const front = frontmostApp();
  execFileSync('open', ['-a', 'TextEdit', file]);
  let window;
  for (let i = 0; i < 50 && !window; i += 1) {
    await sleep(100);
    try { window = (await native().call('listWindows', { bundleId: TEXTEDIT })).windows.find((w) => w.title?.startsWith('words.txt') && !w.is_off_space); } catch {}
  }
  const quit = () => {
    try { execFileSync('osascript', ['-e', 'tell application "TextEdit" to quit saving no']); } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
    if (front && front !== 'TextEdit') try { execFileSync('osascript', ['-e', `tell application "${front}" to activate`]); } catch {}
  };
  if (!window) { quit(); throw new Error('the TextEdit window did not appear on the current Space'); }
  await sleep(500);
  const { cu } = session(TEXTEDIT);
  const shot = await cu.appScreenshot('live', { bundleId: TEXTEDIT, windowId: window.window_id });
  // Short enough that the text view is not taller than the window (the summary lists what is mostly visible).
  const area = cu.axFind('live', { bundleId: TEXTEDIT, windowId: window.window_id, role: 'textarea' }).matches[0];
  if (!area) { quit(); throw new Error('no AXTextArea in the summary'); }
  // Just right of the left margin, half way down: the first word of whichever line is there.
  const coordinate = [Math.round(area.frame.x + 16 * shot.scaleFactor), Math.round(area.frame.y + area.frame.height / 2)];
  return {
    cu, windowId: window.window_id, coordinate,
    click: (count) => cu.appClick('live', { bundleId: TEXTEDIT, windowId: window.window_id, coordinate, count, axOnly: true }),
    close: quit,
  };
}

test('acceptance 2 — TextEdit: a double click selects the word under the point (AXSelectedTextRange, read back)', { skip: skip || textEditBusy }, async () => {
  const doc = await textEditDocument();
  try {
    const result = await doc.click(2);
    assert.equal(result.outcome, 'ok', JSON.stringify(result));
    assert.equal(result.path, 'ax');
    assert.equal(result.axOp, 'AXSelectedTextRange');
    assert.match(result.selectedText, /^line\d\d$/, 'exactly the first word of a line, no space, no neighbour');
    const n = Number(result.selectedText.slice(4));
    const offset = LINES.slice(0, n).reduce((sum, line) => sum + line.length + 1, 0);
    assert.deepEqual(result.selectedRange, { location: offset, length: 6 });
  } finally {
    doc.close();
  }
});
