// Full control (official §1.4): the lock / approval / preferred-mode state machine (full-control.cjs), the display-scope
// common layer on the service (service.cjs: requestFullControl / releaseFullControl / acquireDisplayLock /
// frontmostTierGate / displayScreenshot / displayPointer / switchDisplay), the in-use holder signal (in-use.cjs), the
// display coordinate chain (budget.cjs imageToDisplayPoint) and the take-over card model (computer-use-model.mjs /
// approval-card-model.mjs). No native module, no real input: a fake native answers like the real one.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createFullControl, emergencyStop } = require('../electron/computer-use/full-control.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createInUse } = require('../electron/computer-use/in-use.cjs');
const { imageToDisplayPoint, displayPointToImage, displayCoordFrame, fit, scaled } = require('../electron/computer-use/budget.cjs');
const { computerUseTakeoverRequest } = await import('../src/computer-use-model.mjs');
const { approvalCardModel } = await import('../src/approval-card-model.mjs');

const FINDER = 'com.apple.finder';
const DISPLAY = { displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, scaleFactor: 2, isMain: true, name: 'Main' };

test('full-control state machine: approve lasts the session, the lock is single-holder, release / turn-end / forget', () => {
  const changes = [];
  const fc = createFullControl({ onLockChange: (h) => changes.push(h) });
  assert.equal(fc.preferredMode(), 'background');
  assert.equal(fc.isApproved('a'), false);
  // The lock can't be taken before approval.
  assert.equal(fc.acquireLock('a'), 'not_approved');
  fc.approve('a');
  assert.equal(fc.isApproved('a'), true);
  assert.equal(fc.acquireLock('a'), 'ok');
  assert.equal(fc.holder(), 'a');
  assert.deepEqual(changes, ['a']);
  // Another session can't take the lock while a holds it.
  fc.approve('b');
  assert.equal(fc.acquireLock('b'), 'cu_lock_held');
  assert.equal(fc.holder(), 'a');
  // A turn ending drops the lock but keeps the approval (official finishTurnCleanup).
  assert.equal(fc.releaseTurn('a'), true);
  assert.equal(fc.holder(), null);
  assert.equal(fc.isApproved('a'), true);
  assert.deepEqual(changes, ['a', null]);
  // Re-acquire without a fresh card, then release_full_control drops the lock AND the approval.
  assert.equal(fc.acquireLock('a'), 'ok');
  assert.equal(fc.releaseLock('a', { revokeApproval: true }), true);
  assert.equal(fc.isApproved('a'), false);
  // preferred full_control counts as approved without a card; forget clears everything.
  fc.setPreferredMode('full_control');
  assert.equal(fc.isApproved('c'), true);
  assert.equal(fc.acquireLock('c'), 'ok');
  fc.forget('c');
  assert.equal(fc.holder(), null);
  fc.setPreferredMode('background');
  assert.equal(fc.isApproved('c'), false);
});

test('full-control releaseAll / setPreferredMode validation', () => {
  const fc = createFullControl();
  fc.approve('a'); fc.acquireLock('a');
  assert.deepEqual(fc.releaseAll(), ['a']);
  assert.equal(fc.holder(), null);
  assert.deepEqual(fc.releaseAll(), []);
  assert.equal(fc.setPreferredMode('nonsense'), false);
  assert.equal(fc.setPreferredMode('full_control'), true);
  assert.equal(fc.preferredMode(), 'full_control');
});

test('budget display coordinates (official R()): image px of the scale-1 screenshot → global points, and back', () => {
  const shot = { frameWidth: 2940, frameHeight: 1912, scaleFactor: 2, displayBounds: { x: 100, y: 50, width: 1470, height: 956 } };
  assert.deepEqual(displayCoordFrame(shot), { width: 1372, height: 892 }, 'the coordinate frame is the fitted image, not the physical pixels');
  assert.deepEqual(imageToDisplayPoint([0, 0], shot), { x: 100, y: 50 });
  assert.deepEqual(imageToDisplayPoint([686, 446], shot), { x: 100 + 735, y: 50 + 478 });
  assert.deepEqual(imageToDisplayPoint([1372, 892], shot), { x: 100 + 1469, y: 50 + 955 }, 'clamped to the display');
  assert.equal(imageToDisplayPoint([1373, 10], shot), null, 'outside the frame');
  assert.equal(imageToDisplayPoint([-1, 10], shot), null);
  assert.deepEqual(displayPointToImage({ x: 100 + 735, y: 50 + 478 }, shot), { x: 686, y: 446 });
  assert.equal(displayPointToImage({ x: 0, y: 0 }, shot), null, 'a point on another display');
});

/**
 * A fake native that answers the display-scope methods; `front` is the frontmost app, `under` the pointOwner answer
 * (default: a normal window of the frontmost app), `calls` records what was posted.
 */
function fakeNative({ front = FINDER, under, calls = [] } = {}) {
  const screen = { dataUrl: 'data:image/jpeg;base64,AAAA', width: 1372, height: 892, frameWidth: 2940, frameHeight: 1912,
    scaleFactor: 2, displayId: 1, displayWidth: 1470, displayHeight: 956, displayBounds: DISPLAY.bounds, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params]);
      switch (method) {
        case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 999, axTrusted: true, screenCapture: true };
        case 'listDisplays': return { displays: [DISPLAY] };
        case 'frontmostApp': return front === null ? { pid: null, bundleId: null } : { pid: 10, bundleId: front };
        case 'cursorPosition': return { x: 1, y: 1 };
        case 'pointOwner': return { owner: under !== undefined ? under : front === null ? null : { windowId: 50, pid: 10, bundleId: front, layer: 0, ownerName: front } };
        case 'captureWindow': {
          const [width, height] = scaled(fit(1600, 1000), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,QUJD', width, height, frameWidth: 1600, frameHeight: 1000, scaleFactor: 2, windowId: 7,
            bundleId: params.bundleId, bounds: { x: 0, y: 0, width: 800, height: 500 }, jpegQuality: 0.75, elements: [] };
        }
        case 'captureScreen': return { ...screen, displayId: params.displayId ?? 1 };
        case 'hidMove': return { outcome: 'ok', delivered: true, from: { x: 1, y: 1 }, to: params.point };
        case 'hidClick': return { outcome: 'ok', delivered: true, clicksDelivered: params.count ?? 1, at: params.point };
        case 'hidScroll': return { outcome: 'ok', delivered: true, at: params.point, dx: params.dx, dy: params.dy };
        case 'hidMouseDown': return { outcome: 'ok', delivered: true, held: true };
        case 'hidMouseUp': return { outcome: 'ok', delivered: true, wasHeld: true };
        case 'hidDrag': return { outcome: 'ok', delivered: true, from: params.from ?? { x: 1, y: 1 }, to: params.to };
        default: throw new Error(`unexpected ${method}`);
      }
    },
  };
}

function svc({ selfBundleIds = [], overlayWindowIds, ...options } = {}) {
  const fullControl = createFullControl();
  const native = fakeNative(options);
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async () => {}, fullControl,
    selfBundleIds, ...(overlayWindowIds ? { overlayWindowIds } : {}) });
  service.grantsFor('a').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  return { service, native, fullControl };
}

test('display-scope needs approval first: screenshot and input refuse with takeover_required until request_full_control', async () => {
  const { service, native } = svc();
  const shot = await service.displayScreenshot('a', {});
  assert.deepEqual([shot.outcome, shot.reasonCode], ['unsupported', 'takeover_required']);
  // Nothing was captured (acquireDisplayLock refused before the native capture).
  assert.equal(native.calls.some(([m]) => m === 'captureScreen'), false);
  service.requestFullControl('a', { approved: true });
  const ok = await service.displayScreenshot('a', {});
  assert.equal(ok.displayId, 1);
  assert.equal(ok.frameWidth, 2940);
});

test('displayPointer converts the screenshot image px to a global point and posts to the HID layer', async () => {
  const { service, native } = svc();
  service.requestFullControl('a', { approved: true });
  await service.displayScreenshot('a', {});
  const click = await service.displayPointer('a', { kind: 'left_click', coordinate: [200, 100] });
  assert.equal(click.outcome, 'ok');
  const posted = native.calls.findLast(([m]) => m === 'hidClick')[1];
  assert.deepEqual(posted.point, { x: 214, y: 107 }); // 200·1470/1372, 100·956/892 (the 1372×892 image frame)
  // A right click maps to the right button; a scroll goes to hidScroll; a move to hidMove.
  await service.displayPointer('a', { kind: 'right_click', coordinate: [0, 0] });
  assert.equal(native.calls.findLast(([m]) => m === 'hidClick')[1].button, 'right');
  await service.displayPointer('a', { kind: 'scroll', coordinate: [0, 0], scroll_direction: 'down', scroll_amount: 3 });
  assert.equal(native.calls.findLast(([m]) => m === 'hidScroll')[1].dy, 3);
  await service.displayPointer('a', { kind: 'mouse_move', coordinate: [0, 0] });
  assert.equal(native.calls.some(([m]) => m === 'hidMove'), true);
});

test('frontmostTierGate: the frontmost app decides — ungranted / read tier / click-tier typing are refused', async () => {
  // A browser (read tier) in front: a click is refused.
  const browser = svc({ front: 'com.apple.Safari' });
  browser.service.grantsFor('a').grant([{ bundleId: 'com.apple.Safari', displayName: 'Safari' }]);
  browser.service.requestFullControl('a', { approved: true });
  await browser.service.displayScreenshot('a', {});
  const read = await browser.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.deepEqual([read.outcome, read.reasonCode], ['unsupported', 'tier_insufficient']);

  // An ungranted app in front: app_not_granted.
  const ungranted = svc({ front: 'com.example.other' });
  ungranted.service.requestFullControl('a', { approved: true });
  await ungranted.service.displayScreenshot('a', {});
  const ng = await ungranted.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.deepEqual([ng.outcome, ng.reasonCode], ['unsupported', 'app_not_granted']);

  // No bundle id in front: unattributed_window.
  const none = svc({ front: null });
  none.service.requestFullControl('a', { approved: true });
  await none.service.displayScreenshot('a', {});
  const un = await none.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.deepEqual([un.outcome, un.reasonCode], ['unsupported', 'unattributed_window']);
});

test('switchDisplay (official Si()): "auto" (any case) clears the pin; one monitor or no name is bad_args', async () => {
  const { service } = svc();
  const result = await service.switchDisplay('a', { display: 'AUTO' });
  assert.equal(result.pinned, null);
  assert.match(result.text, /automatic monitor selection/);
  // Only one display here: any name is refused with the official bad_args (nothing to switch to).
  await assert.rejects(() => service.switchDisplay('a', { display: 'Nope' }), (e) => e.code === 'bad_args' && /Only one monitor/.test(e.message));
  await assert.rejects(() => service.switchDisplay('a', { display: 1 }), (e) => e.code === 'bad_args');
});

test('one session holds the display lock at a time: a second session is refused cu_lock_held', async () => {
  const { service } = svc();
  service.grantsFor('b').grant([{ bundleId: FINDER, displayName: 'Finder' }]);
  service.requestFullControl('a', { approved: true });
  await service.displayScreenshot('a', {}); // a takes the lock
  service.requestFullControl('b', { approved: true });
  const refused = await service.displayScreenshot('b', {});
  assert.deepEqual([refused.outcome, refused.reasonCode], ['unsupported', 'cu_lock_held']);
  // a releases; b can now take it.
  service.releaseFullControl('a');
  assert.equal((await service.displayScreenshot('b', {})).displayId, 1);
});

test('in-use setHolder: the full-control lock holder stays "using the computer" across turn boundaries', () => {
  const states = [];
  const inUse = createInUse({ isComputerUse: () => true, isRelease: () => false });
  inUse.onChange((s) => states.push(s));
  inUse.setHolder('a');
  assert.deepEqual(inUse.sessions(), ['a']);
  // A step from a is folded in; a turn ending removes the step but the lock holder remains.
  inUse.observe({ method: 'item/started', params: { threadId: 'a', item: {} } });
  inUse.observe({ method: 'turn/completed', params: { threadId: 'a' } });
  assert.deepEqual(inUse.sessions(), ['a'], 'held until the lock releases');
  inUse.setHolder(null);
  assert.deepEqual(inUse.sessions(), []);
});

test('the take-over card model: _meta.computer_use_takeover → the three "Take over the screen?" variants', () => {
  const card = (meta) => approvalCardModel({ method: 'mcpServer/elicitation/request',
    params: { mode: 'form', requestedSchema: { type: 'object', properties: {} }, _meta: { codex_approval_kind: 'mcp_tool_call', persist: ['session'], ...meta } } }, null);

  const background = card({ computer_use_takeover: { becausePreferredBackground: true } });
  assert.equal(background.access, undefined);
  assert.deepEqual(background.takeover, { becausePreferredBackground: true, appName: null, reason: null });
  assert.match(background.title, /Take over the screen\?.*Background as your preferred mode/);
  assert.equal(background.deny.key, 'decline');
  // Official c96d752d0 (Code page): "Deny" (esc) and "Allow for this session" (⌘↵), not the chat card's "Stay in background".
  assert.equal(background.deny.label, 'Deny');
  assert.deepEqual(background.allows.map((allow) => [allow.label, allow.primary]), [['Allow for this session', true]]);

  const named = card({ computer_use_takeover: { becausePreferredBackground: false, appName: 'Preview' } });
  assert.match(named.title, /working on Preview/);

  const plain = card({ computer_use_takeover: { becausePreferredBackground: false } });
  assert.match(plain.title, /working in the background/);

  assert.equal(computerUseTakeoverRequest({ _meta: { codex_approval_kind: 'mcp_tool_call' } }), null, 'no takeover meta → null');
});

test('the preferred mode is restored from a saved preferences.json, after main.cjs has read it (not at module load)', () => {
  // A relaunch: preferences.json says full_control; reading it the way main.cjs does restores the mode.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cu-pref-'));
  const file = path.join(dir, 'preferences.json');
  fs.writeFileSync(file, JSON.stringify({ computerUsePreferredMode: 'full_control' }));
  const config = { theme: 'auto', ...JSON.parse(fs.readFileSync(file, 'utf8')) };
  const fc = createFullControl();
  assert.equal(fc.restore(config.computerUsePreferredMode), 'full_control');
  assert.equal(fc.preferredMode(), 'full_control');
  assert.equal(fc.isApproved('any'), true, 'full_control counts as approved without a card');
  // Missing or invalid values leave the default.
  assert.equal(createFullControl().restore(undefined), 'background');
  assert.equal(createFullControl().restore('nonsense'), 'background');
  fs.rmSync(dir, { recursive: true, force: true });

  // main.cjs restores it inside app.whenReady, after preferences.json is read and merged, and nowhere at load time.
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const read = main.indexOf('config = JSON.parse(fs.readFileSync(configPath, "utf8"))');
  const merged = main.indexOf('    ...config,\n  };', read);
  const restored = main.indexOf('computerUseFullControl.restore(config.computerUsePreferredMode)');
  assert.ok(read > 0 && merged > read, 'the preferences read and merge were found');
  assert.ok(restored > merged, 'restore runs after the merge');
  assert.equal(main.match(/computerUseFullControl\.(restore|setPreferredMode)\(config/g)?.length, 1, 'restored once, only there');
});

test('Esc emergency stop (official GNr / qNr): the holder first, then every app-lock session once; the display lock drops, the approval stays', () => {
  const fc = createFullControl();
  fc.approve('a'); fc.acquireLock('a');
  const stopped = [];
  const result = emergencyStop({ fullControl: fc, appHolders: () => ['b', 'a', 'c'], stopSession: (id) => stopped.push(id) });
  assert.deepEqual(result, ['a', 'b', 'c']);
  assert.deepEqual(stopped, ['a', 'b', 'c']);
  assert.equal(fc.holder(), null);
  assert.equal(fc.isApproved('a'), true, 'a turn ending keeps the approval; Esc stops the turn');
  // No holder: still stops the app-lock sessions; a throwing stop doesn't stop the others.
  const again = [];
  assert.deepEqual(emergencyStop({ fullControl: fc, appHolders: () => ['x', 'y'], stopSession: (id) => { again.push(id); if (id === 'x') throw new Error('boom'); } }), ['x', 'y']);
  assert.deepEqual(again, ['x', 'y']);
  assert.deepEqual(emergencyStop({ fullControl: fc, stopSession: () => {} }), []);
});

test('coexistence with app_* (official §1.4.3): app locks refuse display-scope with state_conflict until app_release; another session\'s lock refuses app_* with cu_lock_held', async () => {
  const { service, native, fullControl } = svc();
  service.requestFullControl('a', { approved: true });
  await service.appScreenshot('a', { bundleId: FINDER }); // a now holds an app lock on Finder's window 7
  assert.deepEqual(service.appLockBundles('a'), [FINDER]);
  assert.deepEqual(service.appLockSessions(), ['a']);
  const shot = await service.displayScreenshot('a', {});
  assert.deepEqual([shot.outcome, shot.reasonCode], ['unsupported', 'state_conflict']);
  assert.match(shot.message, /currently controlling Finder in the background.*app_release first/);
  assert.equal(native.calls.some(([m]) => m === 'captureScreen'), false, 'nothing captured');
  const input = await service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.equal(input.reasonCode, 'state_conflict');
  assert.equal(fullControl.holder(), null, 'the lock was not taken');
  // app_release: the display-scope tools work again.
  service.release('a', {});
  assert.deepEqual(service.appLockSessions(), []);
  assert.equal((await service.displayScreenshot('a', {})).displayId, 1);
  assert.equal(fullControl.holder(), 'a');

  // Another session's app_* gate: b is refused cu_lock_held while a holds the display lock; a itself is not.
  const lockedOut = service.displayLockedByOther('b');
  assert.deepEqual([lockedOut.outcome, lockedOut.reasonCode], ['unsupported', 'cu_lock_held']);
  assert.equal(service.displayLockedByOther('a'), null);
  service.releaseFullControl('a');
  assert.equal(service.displayLockedByOther('b'), null);
});

test('displayPointer hit test (official U()): the window under the point decides, before anything is posted', async () => {
  const posted = (native) => native.calls.some(([m]) => m === 'hidClick' || m === 'hidScroll');
  const run = async (options, input = { kind: 'left_click', coordinate: [10, 10] }, grant = []) => {
    const ctx = svc(options);
    ctx.service.grantsFor('a').grant(grant);
    ctx.service.requestFullControl('a', { approved: true });
    await ctx.service.displayScreenshot('a', {});
    return { result: await ctx.service.displayPointer('a', input), native: ctx.native };
  };
  // A window with no app bundle under the point: unattributed_window.
  let { result, native } = await run({ under: { windowId: 9, pid: 77, bundleId: null, layer: 0, ownerName: 'helperd' } });
  assert.deepEqual([result.reasonCode, result.ownerName], ['unattributed_window', 'helperd']);
  assert.equal(posted(native), false);
  // The app's own window: hit_test_self_intercept.
  ({ result, native } = await run({ selfBundleIds: ['com.example.self'], under: { windowId: 9, pid: 1, bundleId: 'com.example.self', layer: 0, ownerName: 'Self' } }));
  assert.equal(result.reasonCode, 'hit_test_self_intercept');
  assert.equal(posted(native), false);
  // An ungranted app's (visible, not frontmost) window: app_not_granted, and it is not clicked (nor activated).
  ({ result, native } = await run({ under: { windowId: 9, pid: 5, bundleId: 'com.example.other', layer: 0, ownerName: 'Other' } }));
  assert.deepEqual([result.reasonCode, result.hitBundleId], ['app_not_granted', 'com.example.other']);
  assert.equal(posted(native), false);
  // A click-tier app (a terminal) under the point: a plain click passes, a right click is tier_insufficient.
  const TERMINAL = 'com.apple.Terminal';
  const terminal = { under: { windowId: 9, pid: 6, bundleId: TERMINAL, layer: 0, ownerName: 'Terminal' } };
  ({ result, native } = await run(terminal, { kind: 'right_click', coordinate: [10, 10] }, [{ bundleId: TERMINAL, displayName: 'Terminal' }]));
  assert.deepEqual([result.reasonCode, result.tier], ['tier_insufficient', 'click']);
  assert.equal(posted(native), false);
  ({ result, native } = await run(terminal, { kind: 'left_click', coordinate: [10, 10] }, [{ bundleId: TERMINAL, displayName: 'Terminal' }]));
  assert.equal(result.outcome, 'ok');
  // Nothing under the point (the desktop) is Finder's: granted here, so it passes; scroll is hit-tested as well.
  ({ result, native } = await run({ under: null }, { kind: 'scroll', coordinate: [10, 10], scroll_direction: 'down', scroll_amount: 2 }));
  assert.equal(result.outcome, 'ok');
  assert.equal(native.calls.findLast(([m]) => m === 'hidScroll')[1].dy, 2);
  // The menu bar (layer 24) passes while the frontmost app is granted.
  ({ result } = await run({ under: { windowId: 3, pid: 2, bundleId: null, layer: 24, ownerName: 'Window Server' } }));
  assert.equal(result.outcome, 'ok');
  // The app's own overlays are skipped by window id (passed to the native hit test).
  ({ native } = await run({ overlayWindowIds: () => [41, 42, 'x'] }));
  assert.deepEqual(native.calls.find(([m]) => m === 'pointOwner')[1].ignoreWindowIds, [41, 42]);
  assert.deepEqual(native.calls.find(([m]) => m === 'pointOwner')[1].point, { x: 11, y: 11 });
});

test('displayPointer hit test: the desktop shell without a Finder grant is app_not_granted, with the Finder hint', async () => {
  const ctx = svc({ front: 'com.example.app', under: null });
  ctx.service.grantsFor('a').revoke(FINDER);
  ctx.service.grantsFor('a').grant([{ bundleId: 'com.example.app', displayName: 'App' }]);
  ctx.service.requestFullControl('a', { approved: true });
  await ctx.service.displayScreenshot('a', {});
  const result = await ctx.service.displayPointer('a', { kind: 'left_click', coordinate: [10, 10] });
  assert.deepEqual([result.reasonCode, result.hitBundleId], ['app_not_granted', FINDER]);
  assert.match(result.message, /request_access with "Finder"/);
});

test('main.cjs (final review): the turn end lets go of the app locks too; the global Esc is let go only for one model Escape at a time', () => {
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  // Official finishTurnCleanup → pw.release: the full-screen lock and every app lock.
  assert.match(main, /computerUseFullControl\.releaseTurn\(e\.params\.threadId\);[\s\S]{0,300}computerUse\.release\(e\.params\.threadId\);/);
  // Official HNr / BNr / XNr: per press, at most 500 ms, re-registered from the lock and the count — never around a whole hold.
  assert.match(main, /withOwnEscape: async \(run, \{ releaseAfterMs \} = \{\}\) => \{\n    const release = await computerUseTakeOwnEscape\(\);/);
  assert.match(main, /timer = setTimeout\(release, 500\);/);
  assert.match(main, /if \(computerUseLockHolder && computerUseOwnEscapes === 0\) computerUseRegisterEscStop\(\); else computerUseUnregisterEscStop\(\);/);
  assert.doesNotMatch(main, /setTimeout\(\(\) => \{ if \(computerUseLockHolder\) computerUseRegisterEscStop\(\); \}, 150\)/);
  // The shared names follow the grants, not the approval.
  assert.match(main, /function computerUseServesDisplayTools\(sessionId\) \{\n  return typeof sessionId === "string" && !!sessionId && computerUse\.hasGrants\(sessionId\);\n\}/);
});
