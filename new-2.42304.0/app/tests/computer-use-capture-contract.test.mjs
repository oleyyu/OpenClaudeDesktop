import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Computer use M1: the capture contract of electron/computer-use/service.cjs over a fake native module.
// Apps outside the session's grants are never listed or captured (the native call is not even made); a screen capture
// excludes them in the native filter; tiers follow the app category; the IPC envelope keeps reason codes.
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createGrants, tierFor, allows } = require('../electron/computer-use/grants.cjs');
const { createNative } = require('../electron/computer-use/native.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');

function fakeNative(overrides = {}) {
  const calls = [];
  const shot = (frameWidth, frameHeight, scale = 1) => {
    const [width, height] = scaled(fit(frameWidth, frameHeight), scale);
    return { dataUrl: 'data:image/jpeg;base64,AA==', width, height, frameWidth, frameHeight, scaleFactor: 2, jpegQuality: 0.75 };
  };
  const handlers = {
    probe: () => ({ axTrusted: true, screenCapture: true, screenLocked: false, secureInput: false }),
    listWindows: () => ({ windows: [{ window_id: 7, title: 'Home', is_main: true, is_minimized: false, is_hidden: false, is_off_space: false, bounds: { x: 0, y: 25, width: 900, height: 600 }, is_auxiliary: false }] }),
    captureWindow: (p) => ({ ...shot(1800, 1200, p.scale), windowId: p.windowId ?? 7, bundleId: p.bundleId, bounds: { x: 0, y: 25, width: 900, height: 600 } }),
    captureScreen: (p) => ({ ...shot(3024, 1964, p.scale), displayId: 1, excludedBundleIds: ['com.apple.finder', 'com.example.other'].filter((id) => !p.allowedBundleIds.includes(id)) }),
    ...overrides,
  };
  return {
    calls,
    async call(method, params = {}) {
      calls.push({ method, params: JSON.parse(JSON.stringify(params)) });
      return handlers[method](params);
    },
  };
}

test('an app outside the grants is not listed or captured, and the native module is never asked', async () => {
  const native = fakeNative(), cu = createComputerUse({ native });
  for (const run of [() => cu.captureWindow('s1', { bundleId: 'com.apple.finder' }), () => cu.listWindows('s1', { bundleId: 'com.apple.finder' })]) {
    await assert.rejects(run, (error) => error.code === 'app_not_granted');
  }
  assert.deepEqual(native.calls, []);
  // Granted in another session only: still refused here.
  cu.grantsFor('s2').grant(['com.apple.finder']);
  await assert.rejects(() => cu.captureWindow('s1', { bundleId: 'com.apple.finder' }), (error) => error.code === 'app_not_granted');
  // Revoked: refused again.
  cu.grantsFor('s1').grant(['com.apple.finder']);
  assert.equal((await cu.captureWindow('s1', { bundleId: 'com.apple.finder' })).bundleId, 'com.apple.finder');
  cu.grantsFor('s1').revoke('com.apple.finder');
  await assert.rejects(() => cu.captureWindow('s1', { bundleId: 'com.apple.finder' }), (error) => error.code === 'app_not_granted');
  assert.equal(native.calls.length, 1);
});

test('a screen capture passes exactly the granted apps (every tier) as the allowlist', async () => {
  const native = fakeNative(), cu = createComputerUse({ native });
  cu.grantsFor('s1').grant(['com.apple.TextEdit', 'com.apple.Safari', 'com.apple.Terminal']);
  const shot = await cu.captureScreen('s1', {});
  assert.deepEqual(native.calls.at(-1), { method: 'captureScreen', params: { allowedBundleIds: ['com.apple.TextEdit', 'com.apple.Safari', 'com.apple.Terminal'] } });
  assert.deepEqual([shot.width, shot.height], [1372, 891]);
  assert.ok(shot.excludedBundleIds.includes('com.apple.finder'));
});

test('an empty allowlist is not an error: the capture returns the desktop with every app excluded', async () => {
  // Fixed contract (M1): native Capture.screen excludes every running app and returns the image; no throw.
  const native = fakeNative(), cu = createComputerUse({ native });
  const shot = await cu.captureScreen('s1', { scale: 0.5 });
  assert.deepEqual(native.calls.at(-1).params, { allowedBundleIds: [], scale: 0.5 });
  assert.deepEqual([shot.width, shot.height], [686, 446]);
  assert.deepEqual(shot.excludedBundleIds, ['com.apple.finder', 'com.example.other']);
});

test('a capture that includes a granted app among the excluded ones, or breaks the budget, is refused', async () => {
  const leak = fakeNative({ captureScreen: (p) => ({ dataUrl: 'x', width: 1372, height: 891, frameWidth: 3024, frameHeight: 1964, jpegQuality: 0.75, excludedBundleIds: p.allowedBundleIds }) });
  const cu = createComputerUse({ native: leak });
  cu.grantsFor('s1').grant(['com.apple.TextEdit']);
  await assert.rejects(() => cu.captureScreen('s1', {}), (error) => error.code === 'internal');
  const oversized = fakeNative({ captureWindow: (p) => ({ dataUrl: 'x', width: 1800, height: 1200, frameWidth: 1800, frameHeight: 1200, jpegQuality: 0.75, bundleId: p.bundleId }) });
  const cu2 = createComputerUse({ native: oversized });
  cu2.grantsFor('s1').grant(['com.apple.finder']);
  await assert.rejects(() => cu2.captureWindow('s1', { bundleId: 'com.apple.finder' }), /breaks the budget/);
  const quality = fakeNative({ captureWindow: (p) => ({ dataUrl: 'x', width: 1372, height: 891, frameWidth: 3024, frameHeight: 1964, jpegQuality: 0.9, bundleId: p.bundleId }) });
  const cu3 = createComputerUse({ native: quality });
  cu3.grantsFor('s1').grant(['com.apple.finder']);
  await assert.rejects(() => cu3.captureWindow('s1', { bundleId: 'com.apple.finder' }), /breaks the budget/);
});

test('a window capture that comes back for another app is refused as foreign_pid', async () => {
  const native = fakeNative({ captureWindow: () => ({ dataUrl: 'x', width: 1372, height: 891, frameWidth: 3024, frameHeight: 1964, jpegQuality: 0.75, bundleId: 'com.example.other' }) });
  const cu = createComputerUse({ native });
  cu.grantsFor('s1').grant(['com.apple.finder']);
  await assert.rejects(() => cu.captureWindow('s1', { bundleId: 'com.apple.finder' }), (error) => error.code === 'foreign_pid');
});

test('scale, windowId, displayId and bundleId are validated before the native call', async () => {
  const native = fakeNative(), cu = createComputerUse({ native });
  cu.grantsFor('s1').grant(['com.apple.finder']);
  for (const args of [{ scale: 0.05 }, { scale: 2 }, { scale: '1' }, { windowId: -1 }, { windowId: 1.5 }, { windowId: 2 ** 32 }]) {
    await assert.rejects(() => cu.captureWindow('s1', { bundleId: 'com.apple.finder', ...args }), (error) => error.code === 'invalid_params', JSON.stringify(args));
  }
  await assert.rejects(() => cu.captureScreen('s1', { displayId: 0 }), (error) => error.code === 'invalid_params');
  await assert.rejects(() => cu.captureWindow('s1', { bundleId: '../etc' }), (error) => error.code === 'invalid_params');
  await assert.rejects(() => cu.captureWindow('', { bundleId: 'com.apple.finder' }), (error) => error.code === 'invalid_params');
  assert.deepEqual(native.calls, []);
});

test('IPC envelope keeps reason codes, and no IPC action can add a grant', async () => {
  const native = fakeNative(), cu = createComputerUse({ native });
  assert.deepEqual(await cu.call('computer-use:capture-window', { sessionId: 's1', bundleId: 'com.apple.finder' }),
    { ok: false, error: { code: 'app_not_granted', message: 'com.apple.finder is not in this session’s granted applications. Call request_access first.' } });
  for (const action of ['computer-use:grant', 'computer-use:request-access', 'computer-use:grants-set']) {
    assert.equal((await cu.call(action, { sessionId: 's1', apps: ['com.apple.finder'] })).error.code, 'unknown_action');
  }
  assert.deepEqual((await cu.call('computer-use:grants', { sessionId: 's1' })).result.apps, []);
  cu.grantsFor('s1').grant(['com.apple.finder']);
  const listed = await cu.call('computer-use:list-windows', { sessionId: 's1', bundleId: 'com.apple.finder' });
  assert.equal(listed.ok, true);
  assert.deepEqual(Object.keys(listed.result.windows[0]), ['window_id', 'title', 'is_main', 'is_minimized', 'is_hidden', 'is_off_space', 'bounds', 'is_auxiliary']);
});

test('tiers by category: browsers read, terminals and IDEs click, the rest full', () => {
  assert.equal(tierFor('com.apple.Safari'), 'read');
  assert.equal(tierFor('com.google.Chrome'), 'read');
  assert.equal(tierFor('org.mozilla.firefox'), 'read');
  assert.equal(tierFor('com.apple.Terminal'), 'click');
  assert.equal(tierFor('com.googlecode.iterm2'), 'click');
  assert.equal(tierFor('com.microsoft.VSCode'), 'click');
  assert.equal(tierFor('com.jetbrains.intellij'), 'click');
  assert.equal(tierFor('com.apple.finder'), 'full');
  assert.equal(tierFor('com.apple.TextEdit'), 'full');
  assert.deepEqual(['see', 'left_click', 'type'].map((op) => allows('read', op)), [true, false, false]);
  assert.deepEqual(['see', 'left_click', 'scroll', 'type', 'key', 'right_click', 'modifier_click', 'drag'].map((op) => allows('click', op)), [true, true, true, false, false, false, false, false]);
  assert.deepEqual(['type', 'key', 'right_click', 'drag'].map((op) => allows('full', op)), [true, true, true, true]);
  const grants = createGrants();
  assert.deepEqual(grants.grant(['com.apple.Safari', 'not a bundle id', { bundleId: 'com.apple.Terminal' }], { clipboardRead: true, clipboardWrite: 'yes' }).map((g) => g.tier), ['read', 'click']);
  assert.deepEqual(grants.flags(), { clipboardRead: true, clipboardWrite: false, systemKeyCombos: false });
});

test('the native loader: unloadable or non-macOS → native_unavailable; error envelopes keep their code', async () => {
  const missing = createNative({ load: () => { throw new Error('dlopen failed'); }, platform: 'darwin' });
  assert.equal(missing.available(), false);
  await assert.rejects(() => missing.call('probe'), (error) => error.code === 'native_unavailable' && /dlopen failed/.test(error.message));
  const linux = createNative({ load: () => ({ call: async () => '{}' }), platform: 'linux' });
  await assert.rejects(() => linux.call('probe'), (error) => error.code === 'native_unavailable');
  const refusing = createNative({ platform: 'darwin', load: () => ({ call: async (method, json) => JSON.stringify(JSON.parse(json).bundleId ? { ok: false, error: { code: 'window_not_found', message: 'gone' } } : { ok: true, result: { method } }) }) });
  assert.deepEqual(await refusing.call('probe'), { method: 'probe' });
  await assert.rejects(() => refusing.call('captureWindow', { bundleId: 'com.apple.finder' }), (error) => error.code === 'window_not_found');
  assert.match(createNative().file, /native\/computer-use\/build\/computer_use\.node$/);
  assert.match(createNative({ file: undefined }).file, /computer_use\.node$/);
});
