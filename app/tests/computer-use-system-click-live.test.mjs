import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { app, liveSkip, native } from './computer-use-live-helpers.mjs';

// app_click on system apps, the official 2.42304.0 way (CU_LIVE=1 only; skipped otherwise): Finder list rows are
// selected through AXSelected (read back) and a folder row is opened through AXOpen on a double click — no mouse event
// is sent — while Finder stays in the background, the real cursor does not move and the front app does not change.
// A Dock item (CU_LIVE_DOCK=1 as well, since it brings Finder forward for a moment) is pressed once through AXPress:
// Finder's own Dock icon, whose press only switches to Finder; the app that was in front gets it back afterwards.
// Only a temp folder of empty files is touched; its window is closed and the folder removed at the end.
//   CU_LIVE=1 [CU_LIVE_DOCK=1] node --test --test-concurrency=1 tests/computer-use-system-click-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const FINDER = 'com.apple.finder', DOCK = 'com.apple.dock';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const liveReason = await liveSkip();
// A locked screen refuses every action (screen_locked, as the official build): say so instead of failing ten times.
const locked = !liveReason && (await native().call('probe')).screenLocked === true && 'the screen is locked: background actions are refused (screen_locked)';
const skip = liveReason ?? locked ?? false;

/** Facts a background click must not change: {cursor: [x, y], front: bundle id, zIndex} (tests/fixtures/cu-pointer-facts.swift). */
let factsBin = null;
function facts(windowId = 0) {
  if (!factsBin) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-facts-'));
    factsBin = path.join(dir, 'cu-pointer-facts');
    execFileSync('swiftc', ['-O', path.join(app, 'tests/fixtures/cu-pointer-facts.swift'), '-o', factsBin], { stdio: 'pipe' });
  }
  return JSON.parse(execFileSync(factsBin, [String(windowId)], { encoding: 'utf8' }));
}
const sameCursor = (a, b) => Math.abs(a.cursor[0] - b.cursor[0]) <= 0.5 && Math.abs(a.cursor[1] - b.cursor[1]) <= 0.5;

function session(bundleId) {
  const cu = createComputerUse({ native: native(), log: { info() {}, warn() {} } });
  cu.grantsFor('live').grant([bundleId]);
  return cu;
}

async function waitIdle(min = 0.6, maxMs = 20_000) {
  for (let waited = 0; waited < maxMs; waited += 100) {
    if ((await native().call('probe')).secondsSinceUserInput >= min) return true;
    await sleep(100);
  }
  return false;
}

/** A temp folder (12 empty files + one subfolder) in a background Finder window in list view. */
async function finderFolder() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-sysclick-'));
  for (let i = 0; i < 12; i += 1) fs.writeFileSync(path.join(dir, `file-${String(i).padStart(2, '0')}.txt`), '');
  fs.mkdirSync(path.join(dir, 'folder-a'));
  const name = path.basename(dir);
  execFileSync('open', ['-g', dir]);
  let window = null;
  for (let i = 0; i < 50 && !window; i += 1) {
    await sleep(100);
    const w = (await native().call('listWindows', { bundleId: FINDER })).windows.find((x) => x.title === name);
    if (w && w.is_off_space === false) window = w;
  }
  const close = () => {
    try { execFileSync('osascript', ['-e', `tell application "Finder" to if exists Finder window "${name}" then close Finder window "${name}"`]); } catch {}
    try { execFileSync('osascript', ['-e', 'tell application "Finder" to if exists Finder window "folder-a" then close Finder window "folder-a"']); } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
  };
  if (!window) { close(); throw new Error('the Finder window did not open on the current Space (a full-screen Space is current?)'); }
  execFileSync('osascript', ['-e', `tell application "Finder" to set current view of Finder window "${name}" to list view`]);
  await sleep(800);
  return { dir, name, windowId: window.window_id, close };
}

/** The content rows of the list (not the sidebar's), in the last screenshot's frame pixels. */
function contentRows(shot) {
  const sidebarRight = Math.max(0, ...shot.elements.filter((e) => e.role === 'AXRow' && e.frame.x === 0).map((e) => e.frame.width));
  return shot.elements.filter((e) => e.role === 'AXRow' && e.frame.x >= sidebarRight && e.frame.height > 0);
}

test('Finder list view: 10 single clicks select 10 rows through AXSelected (read back), Finder stays in the background, the cursor stays', { skip }, async () => {
  const folder = await finderFolder();
  const cu = session(FINDER);
  const attempts = [];
  try {
    for (let n = 0; n < 10; n += 1) {
      const shot = await cu.appScreenshot('live', { bundleId: FINDER, windowId: folder.windowId });
      const rows = contentRows(shot);
      assert.ok(rows.length >= 10, `content rows listed: ${rows.length}`);
      const row = rows[n % rows.length];
      // Three quarters across the row: a cell of the row, not its name field (official: either means the row).
      const coordinate = [Math.round(row.frame.x + row.frame.width * (n % 2 ? 0.75 : 0.2)), Math.round(row.frame.y + row.frame.height / 2)];
      await waitIdle();
      const before = facts(folder.windowId);
      const result = await cu.appClick('live', { bundleId: FINDER, windowId: folder.windowId, coordinate, axOnly: true });
      await sleep(150);
      const after = facts(folder.windowId);
      const entry = { n: n + 1, outcome: result.outcome, reasonCode: result.reasonCode ?? null, axOp: result.axOp, selectedRole: result.selectedRole,
        selected: result.selected, front: [before.front, after.front], zIndex: [before.zIndex, after.zIndex], cursorStill: sameCursor(before, after) };
      attempts.push(entry);
      assert.equal(result.outcome, 'ok', JSON.stringify(entry));
      assert.equal(result.path, 'ax');
      assert.match(result.axOp, /^set AXSelected=true( \((ascended|row of the text)\))?$/);
      assert.equal(result.selected, true);
      assert.equal(after.front, before.front, 'the front app did not change');
      assert.notEqual(after.front, FINDER, 'Finder was not brought forward');
      assert.equal(after.zIndex, before.zIndex, 'the window was not raised');
      assert.ok(entry.cursorStill, 'the real cursor did not move');
    }
  } finally {
    console.log(JSON.stringify({ finderRows: attempts }));
    folder.close();
  }
});

test('Finder list view: a double click on a folder row opens it through AXOpen when the row offers it (else selects, openUnavailable)', { skip }, async () => {
  const folder = await finderFolder();
  const cu = session(FINDER);
  try {
    await cu.appScreenshot('live', { bundleId: FINDER, windowId: folder.windowId });
    const row = cu.axFind('live', { bundleId: FINDER, windowId: folder.windowId, role: 'row', titleContains: 'folder-a' }).matches[0]
      ?? cu.axFind('live', { bundleId: FINDER, windowId: folder.windowId, titleContains: 'folder-a' }).matches[0];
    assert.ok(row, 'folder-a is in the element summary');
    await waitIdle();
    const before = facts(folder.windowId);
    const result = await cu.appClick('live', { bundleId: FINDER, windowId: folder.windowId, element_index: row.index, count: 2, axOnly: true });
    await sleep(600);
    const after = facts(folder.windowId);
    console.log(JSON.stringify({ finderDouble: { outcome: result.outcome, axOp: result.axOp, openUnavailable: result.openUnavailable ?? false, front: [before.front, after.front] } }));
    assert.equal(result.outcome, 'ok', JSON.stringify(result));
    if (/^AXOpen/.test(result.axOp)) {
      const titles = (await native().call('listWindows', { bundleId: FINDER })).windows.map((w) => w.title);
      assert.ok(titles.includes('folder-a'), 'the window now shows folder-a');
    } else {
      assert.equal(result.openUnavailable, true);
      assert.equal(result.selected, true);
    }
    assert.equal(after.front, before.front, 'the front app did not change');
    assert.ok(sameCursor(before, after), 'the real cursor did not move');
  } finally {
    folder.close();
  }
});

test('Dock: one AXPress on Finder\'s Dock item (the front app is given back afterwards)', { skip: skip || (process.env.CU_LIVE_DOCK !== '1' && 'set CU_LIVE_DOCK=1 (switches to Finder for a moment)') }, async () => {
  const cu = session(DOCK);
  const start = facts();
  let pressed = null;
  try {
    const strip = (await cu.listWindows('live', { bundleId: DOCK })).windows.find((w) => w.bounds.width > 0);
    assert.ok(strip, 'the Dock has an on-screen window');
    const shot = await cu.appScreenshot('live', { bundleId: DOCK, windowId: strip.window_id });
    const item = shot.elements.find((e) => e.role === 'AXDockItem' && e.title === 'Finder');
    assert.ok(item, `Finder's Dock item is listed (${shot.elements.filter((e) => e.role === 'AXDockItem').length} Dock items)`);
    await waitIdle();
    pressed = await cu.appClick('live', { bundleId: DOCK, windowId: strip.window_id, element_index: item.index, axOnly: true });
    await sleep(500);
    const after = facts();
    console.log(JSON.stringify({ dock: { outcome: pressed.outcome, axOp: pressed.axOp, pressedRole: pressed.pressedRole, frontBefore: start.front, frontAfter: after.front, cursorStill: sameCursor(start, after) } }));
    assert.equal(pressed.outcome, 'ok', JSON.stringify(pressed));
    assert.equal(pressed.axOp, 'AXPress');
    assert.equal(pressed.pressedRole, 'AXDockItem');
    assert.equal(after.front, FINDER, 'pressing Finder\'s Dock item switched to Finder');
    assert.ok(sameCursor(start, after), 'the real cursor did not move');
  } finally {
    // Give the front back to the app that had it (never quit anything).
    if (start.front && start.front !== FINDER) {
      try { execFileSync('open', ['-b', start.front]); } catch {}
      await sleep(500);
      console.log(JSON.stringify({ dockRestored: facts().front === start.front }));
    }
  }
});
