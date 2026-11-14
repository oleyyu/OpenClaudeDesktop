import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, buildFixture, launchFixture, FIXTURE } from './computer-use-live-helpers.mjs';

// app_scroll live (official 2.42304.0 §1.6.2), CU_LIVE=1 only. Each part scrolls one window that only the test owns —
// the background text fixture (300 numbered lines in `notes`), ONE uniquely named temp TextEdit document (open -g;
// the user's own documents are never looked at, and TextEdit is never quit), and a temp folder of empty files in a
// background Finder window in list view — through the agent tool, and reads the vertical scroll bar back
// independently: the fixture's own clip view (SIGUSR1 dump), and for TextEdit / Finder the window's scroll bars through
// Accessibility (tests/fixtures/cu-ax-scrollbar.swift, read only, no text). The frontmost app and the cursor must be the
// same before and after: app_scroll sets AXValue, it posts no event. Windows are closed and temp files removed at the end.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-scroll-live.test.mjs
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');
const liveReason = await liveSkip();
// A locked screen refuses every action (screen_locked, as the official build): say so instead of failing.
const locked = !liveReason && (await native().call('probe')).screenLocked === true && 'the screen is locked: background actions are refused (screen_locked)';
const skip = liveReason ?? locked ?? false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtures = path.resolve(import.meta.dirname, 'fixtures');
const TEXTEDIT = 'com.apple.TextEdit', FINDER = 'com.apple.finder';

/** Whether the main display's current Space is a full-screen (tiled) one (com.apple.spaces, read only). */
function fullScreenSpace() {
  try {
    const xml = execFileSync('defaults', ['export', 'com.apple.spaces', '-']);
    const json = JSON.parse(String(execFileSync('plutil', ['-convert', 'json', '-o', '-', '-'], { input: xml })));
    return json.SpacesDisplayConfiguration['Management Data'].Monitors.some((m) => m['Current Space']?.type === 4);
  } catch { return false; }
}
const spaceSkip = skip || (fullScreenSpace() && 'the current Space is a full-screen Space: a background window would open on another Space (window_off_space)');

function compile(dir, name) {
  const out = path.join(dir, name);
  execFileSync('swiftc', ['-O', path.join(fixtures, `${name}.swift`), '-o', out], { stdio: 'pipe' });
  return out;
}
const center = (e) => [Math.round(e.frame.x + e.frame.width / 2), Math.round(e.frame.y + Math.min(e.frame.height / 2, 60))];

/** A session with one granted app and the agent tools' handlers, returning parsed JSON plus isError. */
function session(id, bundleId, displayName) {
  const service = createComputerUse({ native: native(), log: { info() {}, warn() {} } });
  service.grantsFor(id).grant([{ bundleId, displayName }]);
  const ctx = { sessionId: id, computerUse: { service } };
  const call = async (toolName, args) => {
    const result = await cu.tools.find((entry) => entry.name === toolName).handler({ app: bundleId, ...args }, ctx);
    return { ...JSON.parse(result.content.find((part) => part.type === 'text').text), isError: result.isError === true };
  };
  return { service, call };
}

test('app_scroll on the background fixture: the notes scroll bar moves by 5 % steps, saturates at the top, the app agrees; dx refused', { skip }, async () => {
  const build = buildFixture();
  const fixture = await launchFixture(build, { background: true, notesLines: 300 });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-scroll-fixture-'));
  const factsBin = compile(dir, 'cu-pointer-facts');
  const facts = () => JSON.parse(String(execFileSync(factsBin, [String(fixture.windowId)])));
  const log = [];
  try {
    const before = facts();
    assert.notEqual(before.front, FIXTURE, 'the fixture did not take the front');
    const { service, call } = session('scroll-fixture', FIXTURE, 'CU Text Fixture');
    const shot = await service.appScreenshot('scroll-fixture', { bundleId: FIXTURE, windowId: fixture.windowId });
    const notes = shot.elements.find((e) => e.title === 'notes');
    assert.ok(notes, 'the notes text is listed');
    assert.ok((await fixture.dump()).notesScroll < 0.01, 'starts at the top');
    const scroll = async (args) => { const r = await call('app_scroll', { window_id: fixture.windowId, ...args }); log.push({ args, ...r }); return r; };

    const down = await scroll({ dy: 3, coordinate: center(notes) });
    assert.equal(down.ok, true, JSON.stringify(down));
    assert.equal(down.path, 'ax');
    assert.match(down.message, /^ok \(set scrollbar AXValue=0\.15 on AXScrollArea/);
    assert.ok(Math.abs(down.after - 0.15) < 0.02, `read back ${down.after}`);
    assert.ok(Math.abs((await fixture.dump()).notesScroll - down.after) < 0.03, 'the app scrolled as far as the bar says');
    // No coordinate: the last point. Back past the top saturates at 0.
    const up = await scroll({ dy: -10 });
    assert.equal(up.ok, true, JSON.stringify(up));
    assert.equal(up.after, 0);
    assert.ok((await fixture.dump()).notesScroll < 0.01);
    const top = await scroll({ dy: -2 });
    assert.deepEqual([top.ok, top.outcome, top.atLimit, top.isError], [false, 'ineffective', 'top', false], JSON.stringify(top));
    const sideways = await scroll({ dy: 0, dx: 2 });
    assert.deepEqual([sideways.reasonCode, sideways.errorKind, sideways.isError], ['horizontal_scroll', 'feature_unavailable', true]);
    // app_batch: two scroll steps, the second at the first one's point.
    const batch = await call('app_batch', { window_id: fixture.windowId, actions: [{ action: 'scroll', dy: 2, coordinate: center(notes) }, { action: 'scroll', dy: 2 }] });
    assert.equal(batch.ok, true, JSON.stringify(batch));
    assert.ok(Math.abs((await fixture.dump()).notesScroll - 0.2) < 0.03);

    const after = facts();
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    assert.deepEqual(after.cursor, before.cursor, 'the cursor did not move');
    console.log(JSON.stringify({ fixture: log.map(({ args, ok, outcome, before: b, after: a, atLimit, message }) => ({ args, ok, outcome, before: b, after: a, atLimit, message })) }, null, 1));
  } finally {
    await fixture.quit();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(build.dir, { recursive: true, force: true });
  }
});

test('app_scroll on a background TextEdit document: the text area\'s scroll bar moves and reads back through Accessibility', { skip: spaceSkip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-scroll-live-'));
  const name = `cu-scroll-${process.pid}-${Date.now()}.txt`, file = path.join(dir, name);
  fs.writeFileSync(file, Array.from({ length: 400 }, (_, i) => `line ${i + 1}`).join('\n'));
  const bars = compile(dir, 'cu-ax-scrollbar'), factsBin = compile(dir, 'cu-pointer-facts');
  const { service, call } = session('scroll-textedit', TEXTEDIT, 'TextEdit');
  const n = native();
  const log = [];
  let windowId, pid;
  try {
    execFileSync('open', ['-g', '-a', 'TextEdit', file]);
    for (let i = 0; i < 50 && !windowId; i += 1) {
      await sleep(200);
      try { windowId = (await n.call('listWindows', { bundleId: TEXTEDIT })).windows.find((w) => w.title === name)?.window_id; } catch {}
    }
    assert.ok(windowId, 'the temp document window appeared');
    pid = Number(String(execFileSync('pgrep', ['-x', 'TextEdit'])).trim().split('\n')[0]);
    await sleep(500);
    const before = JSON.parse(String(execFileSync(factsBin, [String(windowId)])));
    const bar = () => JSON.parse(String(execFileSync(bars, [String(pid), name]))).bars.find((b) => b.area === 'AXTextArea')?.value;
    const shot = await service.appScreenshot('scroll-textedit', { bundleId: TEXTEDIT, windowId });
    const area = shot.elements.find((e) => e.role === 'AXTextArea');
    assert.ok(area, 'the text area is listed');
    assert.ok(bar() < 0.01, 'starts at the top');
    const down = await call('app_scroll', { window_id: windowId, dy: 5, coordinate: center(area) });
    log.push(down);
    assert.equal(down.ok, true, JSON.stringify(down));
    assert.match(down.message, /^ok \(set scrollbar AXValue=0\.25 on AXScrollArea/);
    assert.ok(Math.abs(bar() - down.after) < 0.01 && down.after > 0.2, `bar ${bar()} after ${down.after}`);
    const up = await call('app_scroll', { window_id: windowId, dy: -5 });
    log.push(up);
    assert.equal(up.ok, true, JSON.stringify(up));
    assert.ok(bar() < 0.01);
    const top = await call('app_scroll', { window_id: windowId, dy: -1 });
    log.push(top);
    assert.deepEqual([top.outcome, top.atLimit, top.isError], ['ineffective', 'top', false]);
    const after = JSON.parse(String(execFileSync(factsBin, [String(windowId)])));
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    assert.deepEqual(after.cursor, before.cursor, 'the cursor did not move');
    console.log(JSON.stringify({ textedit: log.map(({ ok, outcome, before: b, after: a, atLimit, message }) => ({ ok, outcome, before: b, after: a, atLimit, message })) }, null, 1));
  } finally {
    // Close only this document's window, by its own close button (it is unmodified, so nothing is asked).
    try {
      if (windowId) {
        const shot = await service.appScreenshot('scroll-textedit', { bundleId: TEXTEDIT, windowId });
        const close = shot.elements.find((e) => e.subrole === 'AXCloseButton');
        if (close) await service.appClick('scroll-textedit', { bundleId: TEXTEDIT, windowId, element_index: close.index, axOnly: true });
        await sleep(800);
      }
    } catch (error) { console.log(`cleanup: ${error.message}`); }
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('app_scroll on a background Finder list: the list\'s scroll bar moves and reads back through Accessibility', { skip: spaceSkip }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-scroll-finder-'));
  for (let i = 0; i < 150; i += 1) fs.writeFileSync(path.join(dir, `file-${String(i).padStart(3, '0')}.txt`), '');
  const tools = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-scroll-tools-'));
  const bars = compile(tools, 'cu-ax-scrollbar'), factsBin = compile(tools, 'cu-pointer-facts');
  const name = path.basename(dir);
  const { service, call } = session('scroll-finder', FINDER, 'Finder');
  const n = native();
  const log = [];
  try {
    execFileSync('open', ['-g', dir]);
    let window = null;
    for (let i = 0; i < 50 && !window; i += 1) {
      await sleep(100);
      const w = (await n.call('listWindows', { bundleId: FINDER })).windows.find((x) => x.title === name);
      if (w && w.is_off_space === false) window = w;
    }
    assert.ok(window, 'the temp folder window opened on the current Space');
    execFileSync('osascript', ['-e', `tell application "Finder" to set current view of Finder window "${name}" to list view`]);
    await sleep(800);
    const pid = Number(String(execFileSync('pgrep', ['-x', 'Finder'])).trim().split('\n')[0]);
    const before = JSON.parse(String(execFileSync(factsBin, [String(window.window_id)])));
    const bar = () => JSON.parse(String(execFileSync(bars, [String(pid), name]))).bars.find((b) => b.area === 'AXOutline')?.value;
    const shot = await service.appScreenshot('scroll-finder', { bundleId: FINDER, windowId: window.window_id });
    const sidebarRight = Math.max(0, ...shot.elements.filter((e) => e.role === 'AXRow' && e.frame.x === 0).map((e) => e.frame.width));
    const row = shot.elements.find((e) => e.role === 'AXRow' && e.frame.x >= sidebarRight && e.frame.height > 0);
    assert.ok(row, 'a content row is listed');
    assert.ok(bar() < 0.01, 'the list starts at the top');
    const down = await call('app_scroll', { window_id: window.window_id, dy: 4, coordinate: center(row) });
    log.push(down);
    assert.equal(down.ok, true, JSON.stringify(down));
    assert.match(down.message, /^ok \(set scrollbar AXValue=0\.20 on AXScrollArea/);
    assert.ok(Math.abs(bar() - down.after) < 0.01 && down.after > 0.15, `bar ${bar()} after ${down.after}`);
    const up = await call('app_scroll', { window_id: window.window_id, dy: -4 });
    log.push(up);
    assert.equal(up.ok, true, JSON.stringify(up));
    assert.ok(bar() < 0.01);
    const after = JSON.parse(String(execFileSync(factsBin, [String(window.window_id)])));
    assert.equal(after.front, before.front, 'the frontmost app did not change');
    assert.deepEqual(after.cursor, before.cursor, 'the cursor did not move');
    console.log(JSON.stringify({ finder: log.map(({ ok, outcome, before: b, after: a, message }) => ({ ok, outcome, before: b, after: a, message })) }, null, 1));
  } finally {
    try { execFileSync('osascript', ['-e', `tell application "Finder" to if exists Finder window "${name}" then close Finder window "${name}"`]); } catch {}
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(tools, { recursive: true, force: true });
  }
});
