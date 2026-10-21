// Live: savePanelProbe / save_panel_restricted on TextEdit's own save sheet (CU_LIVE=1 only, and only when nobody has
// used the keyboard or mouse for 120 s and the screen is unlocked). A uniquely named temporary document is opened in
// TextEdit in the background; its window's File ▸ Export as PDF… sheet (an NSSavePanel) is opened through the menu
// (Accessibility, background), probed, and a protected name typed into it is refused before anything is typed; escape
// (app_key, allowed in a save sheet) cancels it; File ▸ Close closes the document (saved: no prompt) and the file is
// deleted. TextEdit is not quit; the front app and the cursor are checked unchanged.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-save-panel-live.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');

const TEXTEDIT = 'com.apple.TextEdit';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// liveSkip's presence gate: skipped while the screen is locked or someone used this Mac in the last 120 s.
const skip = await liveSkip();

test('TextEdit Export as PDF… sheet: probed as a save panel; a protected name is refused untyped; escape cancels it', { skip: skip ?? false, timeout: 120000 }, async () => {
  const n = native();
  const frontBefore = await n.call('frontmostApp');
  const cursorBefore = await n.call('cursorPosition');
  const name = `cu-save-panel-live-${Date.now()}`;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cu-save-live-')), `${name}.txt`);
  fs.writeFileSync(file, 'save panel live check\n');
  const cu = createComputerUse({ native: n, log: { log() {}, warn() {}, info() {} }, fullControl: createFullControl() });
  cu.grantsFor('live').grant([{ bundleId: TEXTEDIT, displayName: 'TextEdit' }]);
  let windowId = null;
  try {
    execFileSync('open', ['-g', '-a', 'TextEdit', file]);
    for (let i = 0; i < 60 && windowId === null; i += 1) {
      await sleep(100);
      const listed = (await n.call('listWindows', { bundleId: TEXTEDIT })).windows ?? [];
      windowId = listed.find((w) => String(w.title ?? '').includes(name))?.window_id ?? null;
    }
    assert.ok(windowId, 'the document window is listed');
    await cu.appScreenshot('live', { bundleId: TEXTEDIT, windowId });
    assert.equal((await cu.appFocus('live', { bundleId: TEXTEDIT, windowId })).outcome, 'ok', 'our window is the app\'s main window');
    const menu = await cu.appMenu('live', { bundleId: TEXTEDIT, path: ['File', 'Export as PDF…'] });
    assert.equal(menu.outcome, 'ok', JSON.stringify(menu));
    let sheet = null;
    for (let i = 0; i < 40; i += 1) {
      await sleep(100);
      sheet = (await n.call('savePanelProbe', { windowId })).probe;
      if (sheet?.sheetIdentifiers?.includes('save-panel')) break;
    }
    assert.ok(sheet?.sheetIdentifiers?.includes('save-panel'), `a save sheet: ${JSON.stringify(sheet)}`);
    assert.match(sheet.saveNameValue ?? '', /\.pdf$/, 'the name box read');
    assert.equal(typeof sheet.saveWhereDisplayName, 'string', 'the folder pop-up read');
    const typed = await cu.appType('live', { bundleId: TEXTEDIT, windowId, text: '.zshrc', target: 'focused' });
    assert.equal(typed.reasonCode, 'save_panel_restricted', JSON.stringify(typed));
    assert.equal((await n.call('savePanelProbe', { windowId })).probe.saveNameValue, sheet.saveNameValue, 'nothing typed');
    const escape = await cu.appKey('live', { bundleId: TEXTEDIT, windowId, combo: 'escape', target: 'focused' });
    assert.notEqual(escape.reasonCode, 'save_panel_restricted', JSON.stringify(escape));
    let gone = false;
    for (let i = 0; i < 40 && !gone; i += 1) { await sleep(100); gone = !(await n.call('savePanelProbe', { windowId })).probe?.sheetIdentifiers?.includes('save-panel'); }
    assert.equal(gone, true, 'the sheet was cancelled');
  } finally {
    if (windowId !== null) {
      const still = (await n.call('savePanelProbe', { windowId }).catch(() => null))?.probe;
      if (still?.sheetIdentifiers?.includes('save-panel')) await cu.appKey('live', { bundleId: TEXTEDIT, windowId, combo: 'escape', target: 'focused' }).catch(() => {});
      await sleep(300);
      await cu.appFocus('live', { bundleId: TEXTEDIT, windowId }).catch(() => {});
      await cu.appMenu('live', { bundleId: TEXTEDIT, path: ['File', 'Close'] }).catch(() => {});
    }
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
    if (frontBefore?.bundleId && (await n.call('frontmostApp'))?.bundleId !== frontBefore.bundleId) {
      try { execFileSync('open', ['-b', frontBefore.bundleId]); } catch {}
    }
  }
  assert.deepEqual(await n.call('cursorPosition'), cursorBefore, 'the cursor did not move');
});
