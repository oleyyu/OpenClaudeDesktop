// Live: the screen-wide pointer tools on the real cursor (CU_LIVE=1 only). A fixture window of its own
// (tests/fixtures/cu-pointer-fixture) records what reached it: hover (tracking area), a context menu and its item, a
// canvas drag, double / triple / modifier clicks, a press-move-release drag, the wheel. The real service and native module
// run the official order (takeover approval, frontmost tier, hit test, native gates). At the end the cursor goes back to
// where it was, the fixture quits, and the app that was in front is brought back.
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-display-pointer-live.test.mjs
// While the screen is locked only the gates are checked: every pointer action is refused before anything is posted, the
// cursor does not move, and screenshot / zoom / cursor_position still answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, app } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { displayPointToImage } = require('../electron/computer-use/budget.cjs');

const FIXTURE = 'dev.openclaude.cu-pointer-fixture';
const FINDER = 'com.apple.finder';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const skip = await liveSkip();
const locked = skip ? null : (await native().call('probe')).screenLocked === true;

function service(grants) {
  const fullControl = createFullControl();
  const cu = createComputerUse({ native: native(), log: { log() {}, warn() {}, info() {} }, fullControl });
  cu.grantsFor('live').grant(grants);
  cu.requestFullControl('live', { approved: true });
  return cu;
}

function buildFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-pointer-fixture-'));
  const bundle = path.join(dir, 'CUPointerFixture.app'), macos = path.join(bundle, 'Contents/MacOS');
  fs.mkdirSync(macos, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'Contents/Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>${FIXTURE}</string>
<key>CFBundleName</key><string>CUPointerFixture</string>
<key>CFBundleExecutable</key><string>CUPointerFixture</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
</dict></plist>`);
  try { execFileSync('swiftc', ['-O', '-o', path.join(macos, 'CUPointerFixture'), path.join(app, 'tests/fixtures/cu-pointer-fixture/main.swift')], { stdio: 'pipe' }); }
  catch (error) { throw new Error(`fixture build failed:\n${error.stderr}`); }
  return { dir, bundle };
}

async function launch({ dir, bundle }) {
  const dumpFile = path.join(dir, 'dump.json');
  const child = spawn(path.join(bundle, 'Contents/MacOS/CUPointerFixture'), [], { env: { ...process.env, CU_POINTER_FIXTURE_DUMP: dumpFile }, stdio: 'ignore' });
  const dump = async () => {
    fs.rmSync(dumpFile, { force: true });
    process.kill(child.pid, 'SIGUSR1');
    for (let i = 0; i < 80; i += 1) { await sleep(25); if (fs.existsSync(dumpFile)) return JSON.parse(fs.readFileSync(dumpFile, 'utf8')); }
    throw new Error('fixture did not dump');
  };
  let state;
  for (let i = 0; i < 60; i += 1) {
    await sleep(100);
    try { state = await dump(); if (state.frontmost) break; } catch { /* not up yet */ }
  }
  if (!state?.frontmost) { child.kill('SIGKILL'); throw new Error('fixture did not come to the front'); }
  await sleep(400);
  return { child, dump, quit: async () => { child.kill('SIGKILL'); await sleep(300); } };
}

const center = (frame, fx = 0.5, fy = 0.5) => ({ x: frame.x + frame.width * fx, y: frame.y + frame.height * fy });

test('locked screen: every pointer action is refused before anything is posted; screenshot, zoom and cursor_position answer', { skip: skip ?? (locked ? false : 'the screen is not locked (the interaction test runs instead)') }, async () => {
  const cu = service([{ bundleId: FINDER, displayName: 'Finder' }]);
  const before = await native().call('cursorPosition');
  const shot = await cu.displayScreenshot('live', {});
  assert.ok(shot.dataUrl.startsWith('data:image/jpeg'), 'a screenshot under the lock');
  assert.ok(shot.coordFrame.width > 0 && shot.coordFrame.height > 0);
  const zoom = await cu.displayZoom('live', { region: [0, 0, 200, 100] });
  assert.ok(zoom.dataUrl.startsWith('data:image/jpeg'));
  const cursor = await cu.displayCursor('live');
  assert.equal(cursor.coordinateSpace, 'image_pixels');
  assert.deepEqual(cursor, { ...displayPointToImage(before, shot), coordinateSpace: 'image_pixels' });
  const at = [Math.round(shot.coordFrame.width / 2), Math.round(shot.coordFrame.height / 2)];
  for (const input of [{ kind: 'mouse_move', coordinate: at }, { kind: 'left_click', coordinate: at }, { kind: 'double_click', coordinate: at },
    { kind: 'right_click', coordinate: at }, { kind: 'scroll', coordinate: at, scroll_direction: 'down', scroll_amount: 2 },
    { kind: 'left_click_drag', start_coordinate: at, coordinate: [at[0] + 50, at[1]] }, { kind: 'left_mouse_down' }]) {
    const result = await cu.displayPointer('live', input);
    assert.equal(result.outcome, 'unsupported', input.kind);
    // The native gates (secure input: the lock screen's password field; the lock), or the frontmost gate first
    // (loginwindow is in front, never granted). A plain move passes the frontmost gate (official mouse_position) and is
    // refused by the native gates.
    assert.ok(['secure_input_active', 'screen_locked', 'app_not_granted'].includes(result.reasonCode), `${input.kind}: ${result.reasonCode}`);
    assert.notEqual(result.delivered, true, `${input.kind}: nothing delivered`);
  }
  assert.equal((await cu.displayPointer('live', { kind: 'left_mouse_up' })).delivered, false, 'nothing was held, nothing posted');
  assert.deepEqual(await native().call('cursorPosition'), before, 'the cursor did not move');
  assert.equal((await native().call('hidState')).held, false);
});

test('fixture: hover, context menu and its item, canvas drag, double / triple / modifier clicks, press-move-release, wheel', { skip: skip ?? (locked ? 'the screen is locked' : false), timeout: 120000 }, async () => {
  const n = native();
  const front = await n.call('frontmostApp');
  const cursorBefore = await n.call('cursorPosition');
  const fixture = await launch(buildFixture());
  const cu = service([{ bundleId: FIXTURE, displayName: 'CUPointerFixture' }]);
  try {
    let state = await fixture.dump();
    const shot = await cu.displayScreenshot('live', {});
    const px = (point) => { const image = displayPointToImage(point, shot); assert.ok(image, `on the screenshot: ${JSON.stringify(point)}`); return [image.x, image.y]; };
    const act = async (input, label) => {
      let result;
      for (let i = 0; i < 5; i += 1) {
        result = await cu.displayPointer('live', input);
        if (result.reasonCode !== 'user_actively_typing') break;
        await sleep(1000);
      }
      assert.equal(result.outcome, 'ok', `${label}: ${JSON.stringify(result)}`);
      await sleep(250);
      return result;
    };
    const { hover, menu, canvas, wheel } = state.areas;

    // Hover: a plain move into the tracking area.
    await act({ kind: 'mouse_move', coordinate: px(center(hover)) }, 'hover move');
    state = await fixture.dump();
    assert.ok(state.hoverEnters >= 1 && state.hovering, `hover reached: ${JSON.stringify(state)}`);
    await act({ kind: 'mouse_move', coordinate: px(center(canvas)) }, 'leave hover');
    state = await fixture.dump();
    assert.equal(state.hovering, false);

    // Context menu: right click shows it; a left click on its first item chooses it.
    const menuAt = center(menu);
    await act({ kind: 'right_click', coordinate: px(menuAt) }, 'right click');
    await sleep(300);
    state = await fixture.dump();
    assert.equal(state.menuShown, 1, 'the context menu opened');
    await act({ kind: 'left_click', coordinate: px({ x: menuAt.x + 40, y: menuAt.y + 12 }) }, 'menu item');
    await sleep(300);
    state = await fixture.dump();
    assert.equal(state.menuChosen, 'Fixture Action');

    // Canvas drag with left_click_drag.
    await act({ kind: 'left_click_drag', start_coordinate: px(center(canvas, 0.2, 0.5)), coordinate: px(center(canvas, 0.8, 0.5)) }, 'drag');
    state = await fixture.dump();
    const drag = state.drags.at(-1);
    assert.ok(drag && drag.dragEvents >= 5, `drag events: ${JSON.stringify(drag)}`);
    assert.ok(drag.to.x - drag.from.x > canvas.width * 0.5, `dragged across: ${JSON.stringify(drag)}`);

    // Double, triple and a shift click.
    await act({ kind: 'double_click', coordinate: px(center(canvas, 0.5, 0.3)) }, 'double click');
    state = await fixture.dump();
    assert.equal(state.clicks.at(-1).clickCount, 2);
    await sleep(600);
    await act({ kind: 'triple_click', coordinate: px(center(canvas, 0.3, 0.3)) }, 'triple click');
    state = await fixture.dump();
    assert.equal(state.clicks.at(-1).clickCount, 3);
    await sleep(600);
    await act({ kind: 'left_click', coordinate: px(center(canvas, 0.6, 0.7)), text: 'shift' }, 'shift click');
    state = await fixture.dump();
    assert.deepEqual(state.clicks.at(-1).modifiers, ['shift']);

    // Press, move with the button held, release: one drag.
    const drags = state.drags.length;
    await act({ kind: 'mouse_move', coordinate: px(center(canvas, 0.2, 0.8)) }, 'to press');
    await act({ kind: 'left_mouse_down' }, 'press');
    await act({ kind: 'mouse_move', coordinate: px(center(canvas, 0.7, 0.8)) }, 'held move');
    await act({ kind: 'left_mouse_up' }, 'release');
    state = await fixture.dump();
    assert.equal(state.drags.length, drags + 1, 'press-move-release is a drag');
    assert.equal((await n.call('hidState')).held, false);

    // Wheel.
    await act({ kind: 'scroll', coordinate: px(center(wheel)), scroll_direction: 'down', scroll_amount: 3 }, 'scroll');
    state = await fixture.dump();
    assert.ok(state.scrollEvents >= 1 && state.scrollY !== 0, `wheel: ${state.scrollEvents} events, ${state.scrollY}`);

    // cursor_position answers in the screenshot's pixels where the last action left it.
    const cursor = await cu.displayCursor('live');
    assert.equal(cursor.coordinateSpace, 'image_pixels');
    const expected = px(center(wheel));
    assert.ok(Math.abs(cursor.x - expected[0]) <= 2 && Math.abs(cursor.y - expected[1]) <= 2, JSON.stringify({ cursor, expected }));
  } finally {
    await cu.releaseHeldMouse();
    await fixture.quit();
    // Back where it was: the cursor (one plain move), and the app that was in front.
    await n.call('hidMove', { point: cursorBefore, animate: false }).catch(() => {});
    if (typeof front?.bundleId === 'string' && front.bundleId !== 'com.apple.loginwindow') {
      try { execFileSync('open', ['-b', front.bundleId]); } catch {}
      await sleep(800);
    }
  }
  const after = await n.call('cursorPosition');
  assert.ok(Math.abs(after.x - cursorBefore.x) < 1 && Math.abs(after.y - cursorBefore.y) < 1, 'the cursor is back');
});

// Official yi() → V("mouse_position"): a plain move passes whatever app is in front, granted or not; anything that
// presses is still refused there. Only the fixture's bundle id is granted (the fixture is not even started), so the app
// in front is never granted. Runs only unlocked and with nobody at the computer (idle ≥ 120 s): it moves the real cursor
// a few points and puts it back.
test('mouse_move over an app that isn\'t granted passes (mouse_position); a click there is refused; the cursor goes back', { skip: skip ?? (locked ? 'the screen is locked' : false), timeout: 60000 }, async (t) => {
  // Nobody at the Mac: checked by liveSkip's presence gate before any test here runs.
  const n = native();
  const cu = service([{ bundleId: FIXTURE, displayName: 'CUPointerFixture' }]);
  const front = await n.call('frontmostApp');
  assert.notEqual(front?.bundleId, FIXTURE);
  const cursorBefore = await n.call('cursorPosition');
  try {
    const shot = await cu.displayScreenshot('live', {});
    const here = displayPointToImage(cursorBefore, shot);
    const to = [Math.max(0, here.x - 20), Math.max(0, here.y - 20)];
    const moved = await cu.displayPointer('live', { kind: 'mouse_move', coordinate: to, animate: false });
    assert.equal(moved.outcome, 'ok', JSON.stringify(moved));
    const now = await n.call('cursorPosition');
    assert.ok(Math.abs(now.x - cursorBefore.x) > 1 || Math.abs(now.y - cursorBefore.y) > 1, 'the real cursor moved');
    const clicked = await cu.displayPointer('live', { kind: 'left_click', coordinate: to });
    assert.equal(clicked.outcome, 'unsupported');
    assert.equal(clicked.reasonCode, 'app_not_granted');
    assert.notEqual(clicked.delivered, true);
    assert.equal((await n.call('frontmostApp'))?.bundleId, front?.bundleId, 'the app in front did not change');
  } finally {
    await n.call('hidMove', { point: cursorBefore, animate: false }).catch(() => {});
  }
  const after = await n.call('cursorPosition');
  assert.ok(Math.abs(after.x - cursorBefore.x) < 1 && Math.abs(after.y - cursorBefore.y) < 1, 'the cursor is back');
});
