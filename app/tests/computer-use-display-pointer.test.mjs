// The screen-wide (display-scope) screenshot and pointer tools of official §1.1: service.cjs displayScreenshot /
// displayZoom / displayCursor / displayPointer, the tools in agent-tools/computer-use.mjs (the takeover before the first
// action, the official success texts, the one refusal shape), and the host serving computer use's screenshot / scroll
// instead of preview's to a session with full-screen approval (agent-tools-host.cjs sharesName). A fake native answers
// like the real one; nothing is posted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const FINDER = 'com.apple.finder';
const TERMINAL = 'com.apple.Terminal';
const DISPLAY = { displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, scaleFactor: 2, isMain: true, name: 'Main' };

/** front: the frontmost app; under(point): the pointOwner answer; refuse: native gate answers queued per method. */
function fakeNative({ front = FINDER, under = () => ({ windowId: 50, pid: 10, bundleId: FINDER, layer: 0, ownerName: 'Finder' }), refuse = {}, cursor = { x: 300, y: 200 } } = {}) {
  const calls = [];
  const state = { cursor: { ...cursor }, held: false };
  const gate = (method) => (refuse[method]?.length ? refuse[method].shift() : null);
  return {
    calls, state,
    async call(method, params = {}) {
      calls.push([method, params]);
      switch (method) {
        case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 999 };
        case 'listDisplays': return { displays: [DISPLAY] };
        case 'frontmostApp': return { pid: 10, bundleId: typeof front === 'function' ? front() : front };
        case 'cursorPosition': return { ...state.cursor };
        case 'pointOwner': return { owner: under(params.point) };
        case 'captureScreen': {
          const frame = params.region ? [Math.round(params.region.width * 2), Math.round(params.region.height * 2)] : [2940, 1912];
          const [width, height] = scaled(fit(...frame), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,U0NSRUVO', width, height, frameWidth: frame[0], frameHeight: frame[1], scaleFactor: 2, displayId: 1,
            displayWidth: 1470, displayHeight: 956, displayBounds: DISPLAY.bounds, region: params.region ?? null, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
        }
        case 'captureWindow': {
          const [width, height] = scaled(fit(1600, 1000), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,QUJD', width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7,
            bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
        }
        case 'hidMove': { const g = gate(method); if (g) return g; state.cursor = { ...params.point }; return { outcome: 'ok', delivered: true, dragging: state.held, to: params.point }; }
        case 'hidClick': { const g = gate(method); if (g) return g; state.cursor = { ...params.point }; return { outcome: 'ok', delivered: true, clicksDelivered: params.count }; }
        case 'hidScroll': { const g = gate(method); if (g) return g; return { outcome: 'ok', delivered: true, dx: params.dx, dy: params.dy }; }
        case 'hidMouseDown': { const g = gate(method); if (g) return g; state.held = true; return { outcome: 'ok', delivered: true, held: true }; }
        case 'hidMouseUp': { const was = state.held; state.held = false; return { outcome: 'ok', delivered: was, wasHeld: was }; }
        case 'hidDrag': { const g = gate(method); if (g) return g; state.cursor = { ...params.to }; return { outcome: 'ok', delivered: true }; }
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
}

function svc({ grants = [{ bundleId: FINDER, displayName: 'Finder' }], approve = true, onWait = null, clickThrough = null, ...options } = {}) {
  const fullControl = createFullControl();
  const native = fakeNative(options);
  const waits = [];
  const pointer = { hidden: 0, beforeClick() { this.hidden += 1; }, clicked() { throw new Error('the phantom cursor is not used full-screen'); } };
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async (ms) => { waits.push(ms); await onWait?.(ms, fullControl); }, fullControl, pointer, clickThrough });
  service.grantsFor('a').grant(grants);
  if (approve) service.requestFullControl('a', { approved: true });
  return { service, native, fullControl, waits, pointer };
}
const posted = (native, method) => native.calls.filter(([m]) => m === method).map(([, p]) => p);

test('coordinates: image pixels of the scale-1 screenshot even after a 0.5-scale one; outside the frame is bad_args; no screenshot falls back to x / scaleFactor', async () => {
  const { service, native } = svc();
  // No screenshot yet: the official fallback, x / scaleFactor on the main display.
  await service.displayPointer('a', { kind: 'mouse_move', coordinate: [200, 100] });
  assert.deepEqual(posted(native, 'hidMove').at(-1).point, { x: 100, y: 50 });
  await assert.rejects(service.displayPointer('a', { kind: 'left_click', coordinate: [5000, 10] }), (e) => e.code === 'screenshot_required');
  const shot = await service.displayScreenshot('a', { scale: 0.5 });
  assert.deepEqual([shot.width, shot.height], [686, 446]);
  assert.deepEqual(shot.coordFrame, { width: 1372, height: 892 });
  await service.displayPointer('a', { kind: 'left_click', coordinate: [686, 446] });
  assert.deepEqual(posted(native, 'hidClick').at(-1).point, { x: 735, y: 478 }, 'the middle of the scale-1 frame is the middle of the display');
  await assert.rejects(service.displayPointer('a', { kind: 'left_click', coordinate: [1400, 10] }), (e) => e.code === 'bad_args' && /1372×892/.test(e.message));
  await assert.rejects(service.displayPointer('a', { kind: 'left_click', coordinate: [1, 'x'] }), (e) => e.code === 'bad_args');
});

test('clicks (official mi()): the cursor moves first, then the frontmost gate and the hit test; button and count by tool; modifiers checked', async () => {
  const { service, native, pointer } = svc();
  await service.displayScreenshot('a', {});
  for (const [kind, button, count] of [['left_click', 'left', 1], ['double_click', 'left', 2], ['triple_click', 'left', 3], ['right_click', 'right', 1], ['middle_click', 'middle', 1]]) {
    const result = await service.displayPointer('a', { kind, coordinate: [100, 100] });
    assert.equal(result.outcome, 'ok', kind);
    const click = posted(native, 'hidClick').at(-1);
    assert.deepEqual([click.button, click.count, click.animate], [button, count, false], kind);
  }
  // The order: move, frontmost, hit test, click.
  const order = native.calls.slice(-5).map(([m]) => m);
  assert.deepEqual(order, ['listDisplays', 'hidMove', 'frontmostApp', 'pointOwner', 'hidClick']);
  assert.ok(pointer.hidden >= 5, 'the phantom pointer is kept out of the way');
  // Modifiers: key syntax, aliases folded, ordered; anything but a modifier is bad_args.
  await service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100], text: 'Command+Shift' });
  assert.deepEqual(posted(native, 'hidClick').at(-1).modifiers, ['shift', 'cmd']);
  await assert.rejects(service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100], text: 'cmd+a' }), (e) => e.code === 'bad_args');
});

test('tiers: a click-level app takes a plain left click and scroll, not a right / modifier click or a drop; the cursor moved but nothing was pressed', async () => {
  const terminal = () => ({ windowId: 60, pid: 11, bundleId: TERMINAL, layer: 0, ownerName: 'Terminal' });
  const { service, native } = svc({ front: TERMINAL, under: terminal, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }, { bundleId: FINDER, displayName: 'Finder' }] });
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] })).outcome, 'ok');
  assert.equal((await service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'up', scroll_amount: 2 })).outcome, 'ok');
  const clicks = posted(native, 'hidClick').length;
  const right = await service.displayPointer('a', { kind: 'right_click', coordinate: [10, 10] });
  assert.deepEqual([right.reasonCode, right.tier], ['tier_insufficient', 'click']);
  assert.match(right.message, /context menu can paste/);
  const mod = await service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10], text: 'cmd' });
  assert.equal(mod.reasonCode, 'tier_insufficient');
  const drag = await service.displayPointer('a', { kind: 'left_click_drag', start_coordinate: [10, 10], coordinate: [50, 50] });
  assert.equal(drag.reasonCode, 'tier_insufficient', 'the drop end is checked at the full level');
  assert.equal(posted(native, 'hidClick').length, clicks, 'nothing was clicked');
  assert.equal(posted(native, 'hidDrag').length, 0, 'nothing was dragged');
  // An ungranted app in front: refused before anything is pressed.
  const other = svc({ front: 'com.example.other' });
  await other.service.displayScreenshot('a', {});
  assert.equal((await other.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] })).reasonCode, 'app_not_granted');
  assert.equal(posted(other.native, 'hidClick').length, 0);
});

test('mouse_move: any tier and no hit test while nothing is held; scroll direction / amount → dx / dy', async () => {
  const { service, native } = svc({ under: () => { throw new Error('no hit test for a plain move'); } });
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'mouse_move', coordinate: [20, 20] })).outcome, 'ok');
  const scroll = svc();
  await scroll.service.displayScreenshot('a', {});
  for (const [direction, dx, dy] of [['up', 0, -4], ['down', 0, 4], ['left', -4, 0], ['right', 4, 0]]) {
    await scroll.service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: direction, scroll_amount: 4 });
    const p = posted(scroll.native, 'hidScroll').at(-1);
    assert.deepEqual([p.dx, p.dy], [dx, dy], direction);
  }
  await assert.rejects(scroll.service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'in', scroll_amount: 1 }), (e) => e.code === 'bad_args');
  await assert.rejects(scroll.service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'up', scroll_amount: 101 }), (e) => e.code === 'bad_args');
  assert.equal(native.calls.some(([m]) => m === 'pointOwner'), false);
});

test('left_mouse_down / mouse_move / left_mouse_up: held state, a second press is state_conflict, moves while held are drags (mouse_full), up after a move is checked as a drop', async () => {
  const hits = [];
  const { service, native } = svc({ under: (point) => { hits.push(point); return { windowId: 50, pid: 10, bundleId: FINDER, layer: 0, ownerName: 'Finder' }; } });
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_up' })).outcome, 'ok', 'up with nothing held is safe');
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).outcome, 'ok');
  const again = await service.displayPointer('a', { kind: 'left_mouse_down' });
  assert.equal(again.reasonCode, 'state_conflict');
  const before = hits.length;
  assert.equal((await service.displayPointer('a', { kind: 'mouse_move', coordinate: [400, 300] })).outcome, 'ok');
  assert.equal(hits.length, before + 1, 'a move with the button held is hit-tested like a drag');
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_up' })).outcome, 'ok');
  assert.equal(native.state.held, false);
  // A click while held lets go first (official mi()).
  await service.displayPointer('a', { kind: 'left_mouse_down' });
  await service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  const tail = native.calls.map(([m]) => m);
  assert.ok(tail.lastIndexOf('hidMouseUp') < tail.lastIndexOf('hidClick') && tail.lastIndexOf('hidMouseUp') > tail.lastIndexOf('hidMouseDown'));
  // The lock going away releases a held button.
  await service.displayPointer('a', { kind: 'left_mouse_down' });
  assert.equal(await service.releaseHeldMouse(), true);
  assert.equal(native.state.held, false);
  assert.equal(await service.releaseHeldMouse(), false);
});

test('mouse_move with nothing held (official yi() → V("mouse_position")): passes whatever is in front — not granted, read tier, the desktop shell, this app — with no hit test', async () => {
  const SAFARI = 'com.apple.Safari';
  const cases = [
    ['an app that isn\'t granted', { front: 'com.example.other' }],
    ['a read-tier app', { front: SAFARI, grants: [{ bundleId: SAFARI, displayName: 'Safari' }] }],
    ['a click-tier app', { front: TERMINAL, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }] }],
    ['the desktop shell without a Finder grant', { front: FINDER, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }] }],
    ['no app in front', { front: () => null }],
  ];
  for (const [name, options] of cases) {
    const { service, native } = svc({ ...options, under: () => { throw new Error('no hit test for a plain move'); } });
    await service.displayScreenshot('a', {});
    const moved = await service.displayPointer('a', { kind: 'mouse_move', coordinate: [100, 100] });
    assert.equal(moved.outcome, 'ok', name);
    assert.equal(posted(native, 'hidMove').length, 1, name);
    // …while anything that presses is refused there (a plain left click: the frontmost gate at "mouse").
    if (name !== 'no app in front' && name !== 'a click-tier app') {
      const click = await service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100] });
      assert.equal(click.outcome, 'unsupported', name);
      assert.equal(posted(native, 'hidClick').length, 0, name);
    }
  }
  // This app in front: the pointer passes the frontmost gate (official V(): the host lets the mouse through).
  const self = 'com.example.self';
  const { service, native } = (() => {
    const fullControl = createFullControl();
    const n = fakeNative({ front: self, under: () => { throw new Error('no hit test'); } });
    const s = createComputerUse({ native: n, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async () => {}, fullControl, selfBundleIds: [self] });
    s.grantsFor('a').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
    s.requestFullControl('a', { approved: true });
    return { service: s, native: n };
  })();
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'mouse_move', coordinate: [10, 10] })).outcome, 'ok');
  assert.equal(posted(native, 'hidMove').length, 1);
});

test('held button (official yi() / _i() / zi()): the frontmost app is checked at "mouse", the point at "mouse_full"; a refused release still lets go', async () => {
  const terminalWindow = { windowId: 60, pid: 11, bundleId: TERMINAL, layer: 0, ownerName: 'Terminal' };
  const finderWindow = { windowId: 50, pid: 10, bundleId: FINDER, layer: 0, ownerName: 'Finder' };
  let under = finderWindow;
  const { service, native } = svc({ front: TERMINAL, under: () => under, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }, { bundleId: FINDER, displayName: 'Finder' }] });
  await service.displayScreenshot('a', {});
  // Press on the click-tier app in front, drag over a full-tier window: the frontmost gate is "mouse" (click tier passes).
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).outcome, 'ok');
  assert.equal((await service.displayPointer('a', { kind: 'mouse_move', coordinate: [200, 200] })).outcome, 'ok');
  // Moving onto the click-tier window while held: the point is checked at "mouse_full".
  under = terminalWindow;
  const onto = await service.displayPointer('a', { kind: 'mouse_move', coordinate: [210, 210] });
  assert.deepEqual([onto.reasonCode, onto.tier], ['tier_insufficient', 'click']);
  // The release over it is a drop ("mouse_full"): refused, and the button is let go anyway.
  const up = await service.displayPointer('a', { kind: 'left_mouse_up' });
  assert.equal(up.reasonCode, 'tier_insufficient');
  assert.equal(native.state.held, false, 'never left down');
  // A plain press and release on the click-tier window (no move between) are "mouse": allowed.
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).outcome, 'ok');
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_up' })).outcome, 'ok');
});

test('scroll while held counts as moving the drag: the release after it is checked as a drop', async () => {
  const terminalWindow = { windowId: 60, pid: 11, bundleId: TERMINAL, layer: 0, ownerName: 'Terminal' };
  const finderWindow = { windowId: 50, pid: 10, bundleId: FINDER, layer: 0, ownerName: 'Finder' };
  let under = terminalWindow;
  const { service, native } = svc({ front: FINDER, under: () => under, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }, { bundleId: FINDER, displayName: 'Finder' }] });
  await service.displayScreenshot('a', {});
  // Without a move, a release on the click-tier window is a click ("mouse"): fine.
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).outcome, 'ok');
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_up' })).outcome, 'ok');
  // Press on Finder, scroll there while held (allowed: "mouse_full" on a full-tier window), release over Terminal: a drop.
  under = finderWindow;
  assert.equal((await service.displayPointer('a', { kind: 'left_mouse_down' })).outcome, 'ok');
  assert.equal((await service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'down', scroll_amount: 1 })).outcome, 'ok');
  under = terminalWindow;
  const up = await service.displayPointer('a', { kind: 'left_mouse_up' });
  assert.equal(up.reasonCode, 'tier_insufficient');
  assert.equal(native.state.held, false);
});

test('each press / release / click / drag / scroll runs through the app\'s own windows (official executor NG), a move does not', async () => {
  const seen = [];
  const clickThrough = { async around(points, run) { seen.push(points.map((p) => [p.x, p.y])); return run(); }, beginInputBurst: () => () => {} };
  const { service } = svc({ clickThrough });
  await service.displayScreenshot('a', {});
  await service.displayPointer('a', { kind: 'mouse_move', coordinate: [100, 100] });
  assert.equal(seen.length, 0, 'a move is not wrapped (official moveMouse has no NG)');
  await service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100] });
  await service.displayPointer('a', { kind: 'scroll', coordinate: [100, 100], scroll_direction: 'up', scroll_amount: 1 });
  await service.displayPointer('a', { kind: 'left_mouse_down' });
  await service.displayPointer('a', { kind: 'left_mouse_up' });
  await service.displayPointer('a', { kind: 'left_click_drag', start_coordinate: [0, 0], coordinate: [100, 100] });
  assert.equal(seen.length, 5);
  assert.deepEqual(seen.at(-1).length, 2, 'a drag passes its start and end');
  const end = service.beginInputBurst();
  assert.equal(typeof end, 'function');
  // Without a click-through the burst is a no-op.
  assert.equal(typeof svc().service.beginInputBurst(), 'function');
});

test('left_click_drag: from start_coordinate or the cursor; start and end hit-tested; the native drag gets global points', async () => {
  const { service, native } = svc();
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'left_click_drag', start_coordinate: [0, 0], coordinate: [1372, 892] })).outcome, 'ok');
  assert.deepEqual(posted(native, 'hidDrag').at(-1), { from: { x: 0, y: 0 }, to: { x: 1469, y: 955 } });
  assert.equal((await service.displayPointer('a', { kind: 'left_click_drag', coordinate: [686, 446] })).outcome, 'ok');
  assert.deepEqual(posted(native, 'hidDrag').at(-1), { to: { x: 735, y: 478 } }, 'no start: from where the cursor is');
});

test('the user typing backs off 3 × 200 ms like the app_* raw rung, then refuses; other native gates refuse at once', async () => {
  const busy = { outcome: 'unsupported', reasonCode: 'user_actively_typing', delivered: false };
  const { service, waits } = svc({ refuse: { hidClick: [busy, busy] } });
  await service.displayScreenshot('a', {});
  assert.equal((await service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] })).outcome, 'ok');
  assert.deepEqual(waits, [200, 200]);
  const stuck = svc({ refuse: { hidClick: [busy, busy, busy, busy] } });
  await stuck.service.displayScreenshot('a', {});
  const refused = await stuck.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.deepEqual([refused.outcome, refused.reasonCode, refused.blocked], ['unsupported', 'user_actively_typing', true]);
  const secure = svc({ refuse: { hidMove: [{ outcome: 'unsupported', reasonCode: 'secure_input_active', delivered: false }] } });
  await secure.service.displayScreenshot('a', {});
  const s = await secure.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.equal(s.reasonCode, 'secure_input_active');
  assert.deepEqual(secure.waits, []);
  assert.equal(posted(secure.native, 'hidClick').length, 0);
});

test('a Stop during the user_actively_typing back-off sends no late click or scroll (the call aborted, or the display lock gone)', async () => {
  const busy = { outcome: 'unsupported', delivered: false, reasonCode: 'user_actively_typing' };
  // The user's Esc releases the lock while the click waits to retry.
  const esc = svc({ refuse: { hidClick: [busy, busy] }, onWait: async (ms, fullControl) => { fullControl.releaseAll(); } });
  await esc.service.displayScreenshot('a', {});
  const click = await esc.service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100] });
  assert.deepEqual([click.outcome, click.reasonCode], ['unsupported', 'aborted']);
  assert.equal(posted(esc.native, 'hidClick').length, 1, 'only the refused first attempt');
  // The tool call is cancelled while a scroll waits to retry.
  const controller = new AbortController();
  const cancelled = svc({ refuse: { hidScroll: [busy] }, onWait: async () => { controller.abort(); } });
  await cancelled.service.displayScreenshot('a', {});
  const scrolled = await cancelled.service.displayPointer('a', { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'down', scroll_amount: 3, signal: controller.signal });
  assert.equal(scrolled.reasonCode, 'aborted');
  assert.equal(posted(cancelled.native, 'hidScroll').length, 1);
});

test('zoom: needs a screenshot; region in its pixels → a display-local rect; checks the region; the reference stays', async () => {
  const { service, native } = svc();
  const none = await service.displayZoom('a', { region: [0, 0, 10, 10] });
  assert.deepEqual([none.outcome, none.reasonCode], ['unsupported', 'state_conflict']);
  await service.displayScreenshot('a', {});
  const zoomed = await service.displayZoom('a', { region: [686, 446, 1372, 892] });
  assert.deepEqual(posted(native, 'captureScreen').at(-1).region, { x: 735, y: 478, width: 735, height: 478 });
  assert.equal(zoomed.dataUrl.startsWith('data:image/jpeg'), true);
  await assert.rejects(service.displayZoom('a', { region: [10, 10, 5, 20] }), (e) => e.code === 'bad_args');
  await assert.rejects(service.displayZoom('a', { region: [0, 0, 1373, 20] }), (e) => e.code === 'bad_args');
  await assert.rejects(service.displayZoom('a', { region: [0, 0, 10.5, 20] }), (e) => e.code === 'bad_args');
  // The pointer tools still use the full screenshot.
  await service.displayPointer('a', { kind: 'left_click', coordinate: [686, 446] });
  assert.deepEqual(posted(native, 'hidClick').at(-1).point, { x: 735, y: 478 });
});

test('zoom at the right / bottom edge of a display whose scale does not divide evenly (1512×982 in a 1372×891 frame) stays inside the display', async () => {
  const bounds = { x: 0, y: 0, width: 1512, height: 982 };
  const odd = { displayId: 1, bounds, pixelWidth: 3024, pixelHeight: 1964, scaleFactor: 2, isMain: true, name: 'Main' };
  const fullControl = createFullControl();
  const base = fakeNative();
  const regions = [];
  const native = { calls: base.calls, state: base.state, async call(method, params = {}) {
    if (method === 'listDisplays') return { displays: [odd] };
    if (method === 'captureScreen') {
      base.calls.push([method, params]);
      const r = params.region;
      // The native check (Capture.swift): the region must lie inside the display, the plain CGRect.contains way.
      if (r && (r.x < 0 || r.y < 0 || r.x + r.width > bounds.width || r.y + r.height > bounds.height || r.width <= 0 || r.height <= 0)) {
        throw Object.assign(new Error(`region must lie inside the display's 1512×982 points (${JSON.stringify(r)})`), { code: 'invalid_params' });
      }
      if (r) regions.push(r);
      const frame = r ? [Math.round(r.width * 2), Math.round(r.height * 2)] : [3024, 1964];
      const [width, height] = scaled(fit(...frame), params.scale ?? 1);
      return { dataUrl: 'data:image/jpeg;base64,U0NSRUVO', width, height, frameWidth: frame[0], frameHeight: frame[1], scaleFactor: 2, displayId: 1,
        displayWidth: 1512, displayHeight: 982, displayBounds: bounds, region: r ?? null, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
    }
    return base.call(method, params);
  } };
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async () => {}, fullControl });
  service.grantsFor('a').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  service.requestFullControl('a', { approved: true });
  const shot = await service.displayScreenshot('a', {});
  assert.deepEqual(shot.coordFrame, { width: 1372, height: 891 });
  // The whole frame, the bottom strip (the Dock) and the right strip, every y0 against the bottom edge.
  for (const region of [[0, 0, 1372, 891], [0, 800, 1372, 891], [1200, 0, 1372, 891], [5, 37, 1372, 891]]) {
    const zoomed = await service.displayZoom('a', { region });
    assert.equal(zoomed.outcome === 'unsupported', false, JSON.stringify(region));
  }
  for (let y0 = 0; y0 < 891; y0 += 7) await service.displayZoom('a', { region: [0, y0, 100, 891] });
  for (let x0 = 0; x0 < 1372; x0 += 11) await service.displayZoom('a', { region: [x0, 0, 1372, 100] });
  const last = regions[0];
  assert.deepEqual([last.x, last.y], [0, 0]);
  assert.ok(Math.abs(last.width - 1512) < 1e-6 && Math.abs(last.height - 982) < 1e-6 && last.height <= 982 && last.width <= 1512, `the whole frame is the whole display: ${JSON.stringify(last)}`);
});

test('cursor_position: image pixels after a screenshot, logical points before; the background answer while app windows are held', async () => {
  const { service, native } = svc({ cursor: { x: 735, y: 478 } });
  assert.deepEqual(await service.displayCursor('a'), { x: 735, y: 478, coordinateSpace: 'logical_points' });
  await service.displayScreenshot('a', { scale: 0.5 });
  assert.deepEqual(await service.displayCursor('a'), { x: 686, y: 446, coordinateSpace: 'image_pixels', coordFrame: { width: 1372, height: 892 } });
  native.state.cursor = { x: -500, y: 10 };
  assert.equal((await service.displayCursor('a')).coordinateSpace, 'logical_points', 'a cursor on another display');
  // While app windows are held (background), the last app_* action's point.
  const bg = svc({ approve: false });
  await bg.service.appScreenshot('a', { bundleId: FINDER });
  assert.deepEqual(await bg.service.displayCursor('a'), { coordinateSpace: 'app_screenshot_pixels', x: null, y: null, note: 'No app_* action of this session has aimed at a point yet.' });
});

test('displayPrecheck: nothing granted → allowlist_empty; app windows held → state_conflict (cursor_position excepted)', async () => {
  const { service } = svc({ grants: [] });
  assert.equal(service.displayPrecheck('a').reasonCode, 'allowlist_empty');
  const held = svc();
  await held.service.appScreenshot('a', { bundleId: FINDER });
  assert.equal(held.service.displayPrecheck('a').reasonCode, 'state_conflict');
  assert.equal(held.service.displayPrecheck('a', { appLocksAllowed: true }), null);
});

/** The tools through a host that never starts. answer: what the take-over card answers. */
function tools({ answer = 'accept', preferred = 'background', grants = [{ bundleId: FINDER, displayName: 'Finder' }], ...options } = {}) {
  const fullControl = createFullControl();
  fullControl.setPreferredMode(preferred);
  const native = fakeNative(options);
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async () => {}, fullControl });
  service.grantsFor('thread-a').grant(grants);
  const takeovers = [];
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-display-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service, resolveApps: async () => [], listApps: async () => ({ apps: [] }), ask: async () => answer,
    askTakeover: async (opts) => { takeovers.push(opts); return answer; } }));
  const call = (name, args = {}) => host.call('thread-a', { name, arguments: args });
  return { host, service, native, fullControl, takeovers, call };
}
const body = (result) => JSON.parse(result.content[0].text);

test('the tools: the first screen-wide action asks with the take-over card (background), then works with the official texts', async () => {
  const { call, takeovers, native, fullControl } = tools();
  const shot = await call('screenshot', {});
  assert.equal(takeovers.length, 1);
  assert.deepEqual(takeovers[0], { becausePreferredBackground: false });
  assert.equal(shot.isError, undefined);
  assert.deepEqual(shot.content.map((part) => part.type), ['image']);
  assert.equal(fullControl.holder(), 'thread-a', 'the action took the display lock');
  assert.deepEqual((await call('left_click', { coordinate: [100, 100] })).content[0].text, 'Clicked.');
  assert.equal(takeovers.length, 1, 'approved once for the session');
  assert.equal((await call('double_click', { coordinate: [100, 100] })).content[0].text, 'Clicked.');
  assert.equal((await call('mouse_move', { coordinate: [10, 10] })).content[0].text, 'Moved.');
  assert.equal((await call('scroll', { coordinate: [10, 10], scroll_direction: 'down', scroll_amount: 2 })).content[0].text, 'Scrolled.');
  assert.equal((await call('left_click_drag', { coordinate: [20, 20], start_coordinate: [10, 10] })).content[0].text, 'Dragged.');
  assert.equal((await call('left_mouse_down')).content[0].text, 'Mouse button pressed.');
  assert.equal((await call('left_mouse_up')).content[0].text, 'Mouse button released.');
  const half = await call('screenshot', { scale: 0.5 });
  assert.equal(half.content[0].text, '0.5-scale view; coordinate frame: 1372x892.');
  const zoom = await call('zoom', { region: [0, 0, 100, 100] });
  assert.equal(zoom.content.at(-1).type, 'image');
  assert.equal(body(await call('cursor_position')).coordinateSpace, 'image_pixels');
  assert.ok(posted(native, 'hidClick').length >= 2);
});

test('the tools: declined / unavailable cards, preferred Full control (no card), nothing granted, and the one refusal shape', async () => {
  const declined = tools({ answer: 'decline' });
  const no = await declined.call('left_click', { coordinate: [1, 1] });
  assert.equal(no.isError, true);
  assert.deepEqual([body(no).ok, body(no).outcome, body(no).reasonCode], [false, 'unsupported', 'takeover_declined']);
  assert.equal(posted(declined.native, 'hidMove').length, 0, 'nothing moved');
  const unavailable = tools({ answer: 'unavailable' });
  const u = body(await unavailable.call('screenshot', {}));
  assert.equal(u.reasonCode, 'takeover_unavailable');
  assert.match(u.next_step, /request_full_control/);
  const preferred = tools({ preferred: 'full_control' });
  assert.equal((await preferred.call('left_click', { coordinate: [1, 1] })).content[0].text, 'Clicked.');
  assert.equal(preferred.takeovers.length, 0);
  const empty = tools({ grants: [] });
  const e = body(await empty.call('mouse_move', { coordinate: [1, 1] }));
  assert.deepEqual([e.reasonCode, typeof e.message, typeof e.next_step], ['allowlist_empty', 'string', 'string']);
  assert.equal(empty.takeovers.length, 0, 'no card before anything is granted');
  // A refusal from the gates and a bad argument come back in the same shape.
  const ok = tools({ front: 'com.example.other' });
  const r = body(await ok.call('left_click', { coordinate: [1, 1] }));
  assert.deepEqual([r.ok, r.outcome, r.reasonCode], [false, 'unsupported', 'app_not_granted']);
  assert.ok(r.message && r.next_step);
  const b = body(await ok.call('zoom', { region: [5, 5, 1, 1] }));
  assert.deepEqual([b.ok, b.reasonCode], [false, 'bad_args']);
  const m = body(await ok.call('right_click', { coordinate: [1, 1], text: 'cmd+q' }));
  assert.equal(m.reasonCode, 'bad_args');
});

test('the host: computer use\'s screenshot / scroll are listed to a session prefersSharedTool picks, preview\'s to the rest; a call follows the connection\'s last list and the arguments; a preview module stays first', async () => {
  const preview = { group: 'preview', tools: [
    { name: 'screenshot', description: 'preview screenshot', inputSchema: { type: 'object', properties: { quality: { type: 'integer' } } }, handler: async () => 'preview shot' },
    { name: 'scroll', description: 'preview scroll', inputSchema: { type: 'object', properties: { direction: { type: 'string' }, amount: { type: 'integer' } } }, handler: async () => 'preview scroll' },
  ] };
  const approved = new Set();
  const warnings = [];
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-display-')), logger: { warn: (w) => warnings.push(w), log() {} },
    modules: [cu, preview], isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null),
    prefersSharedTool: (tool, server) => tool.group === 'computer-use' && approved.has(server.session) });
  await host.ready();
  assert.deepEqual(warnings, [], 'a shared name is not a duplicate');
  const description = (session, name) => host.listTools({ identity: session, loaded: new Set() }).find((tool) => tool.name === name)?.description;
  assert.equal(description('s1', 'screenshot'), 'preview screenshot');
  assert.equal(host.listTools().filter((tool) => tool.name === 'screenshot').length, 1, 'one tool per name');
  approved.add('s1');
  assert.match(description('s1', 'screenshot'), /whole screen/);
  assert.match(description('s1', 'scroll'), /mouse wheel/);
  assert.equal(description('s2', 'scroll'), 'preview scroll');
  assert.equal((await host.call('s2', { name: 'screenshot', arguments: {} })).content[0].text, 'preview shot');
  // A call goes to the tool the core was listed, not to whatever the session's state picks now: a core that listed
  // before s1 had granted apps keeps preview's schema (Codex doesn't read the list again), so preview's tool runs.
  approved.delete('s1');
  const connection = { identity: 's1', loaded: new Set() };
  assert.equal(host.listTools(connection, { record: true }).find((tool) => tool.name === 'screenshot').description, 'preview screenshot');
  approved.add('s1');
  assert.equal((await host.call('s1', { name: 'screenshot', arguments: {} }, undefined, { connection })).content[0].text, 'preview shot', 'the stale list wins');
  // A list the app reads for itself (sessionToolLists) doesn't change it; the core's next list does.
  host.listTools(connection);
  assert.equal((await host.call('s1', { name: 'screenshot', arguments: {} }, undefined, { connection })).content[0].text, 'preview shot');
  host.listTools(connection, { record: true });
  assert.match((await host.call('s1', { name: 'screenshot', arguments: {} }, undefined, { connection })).content[0].text, /Computer use isn’t available here/, 'now computer use’s (no service in this test)');
  // Arguments only the other tool takes pick that one, whatever the list said: preview's scroll {direction, amount}.
  assert.equal((await host.call('s1', { name: 'scroll', arguments: { direction: 'down', amount: 2 } }, undefined, { connection })).content[0].text, 'preview scroll');
  assert.equal((await host.call('s1', { name: 'scroll', arguments: { direction: 'down' } })).content[0].text, 'preview scroll', 'no list: state, then the arguments');
  // Preview turned off: computer use's take the names for everyone.
  const off = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-display-')), logger: { warn() {}, log() {} },
    modules: [cu, preview], isGroupEnabled: (group) => group !== 'preview', resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  await off.ready();
  assert.match(off.listTools({ identity: 's2', loaded: new Set() }).find((tool) => tool.name === 'screenshot').description, /whole screen/);
  // Without preview loaded at all, computer use's are simply the tools.
  const alone = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-display-')), logger: { warn() {}, log() {} },
    modules: [cu], isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  await alone.ready();
  assert.match(alone.listTools().find((tool) => tool.name === 'scroll').description, /mouse wheel/);
});

test('full-control approval changes notify (main.cjs re-lists the tools)', () => {
  const changes = [];
  const fc = createFullControl({ onApprovalChange: (id) => changes.push(id) });
  fc.approve('a'); fc.approve('a');
  fc.releaseLock('a', { revokeApproval: true });
  fc.setPreferredMode('full_control'); fc.setPreferredMode('full_control');
  fc.approve('b'); fc.forget('b');
  assert.deepEqual(changes, ['a', 'a', null, 'b', 'b']);
});
