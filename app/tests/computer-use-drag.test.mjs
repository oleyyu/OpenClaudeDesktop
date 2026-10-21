import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { dragCoordinates } = require('../electron/computer-use/service.cjs');
const shot = { frameWidth: 1800, frameHeight: 1000, width: 450, height: 250, scaleFactor: 2,
  bounds: { x: -1200, y: 80, width: 900, height: 500 } };

test('drag uses full-resolution pixels on a Retina secondary display, independent of image scaling', () => {
  assert.deepEqual(dragCoordinates(shot, [20, 40], [800, 400], [[100, 200], [200, 300]]), {
    pixelScale: 2,
    points: [
      { winLocalPt: { x: 10, y: 20 }, screenPt: { x: -1190, y: 100 } },
      { winLocalPt: { x: 50, y: 100 }, screenPt: { x: -1150, y: 180 } },
      { winLocalPt: { x: 100, y: 150 }, screenPt: { x: -1100, y: 230 } },
      { winLocalPt: { x: 400, y: 200 }, screenPt: { x: -800, y: 280 } },
    ],
  });
  assert.deepEqual(dragCoordinates({ ...shot, scaleFactor: undefined }, [20, 40], [800, 400]),
    dragCoordinates(shot, [20, 40], [800, 400]));
});

test('drag refuses missing endpoints, malformed or out-of-frame vertices before delivery', () => {
  for (const point of [undefined, null, [1], [1, 2, 3], [-1, 0], [1800, 0], [0, 1000], [NaN, 1], [Infinity, 1], ['1', 2]]) {
    assert.throws(() => dragCoordinates(shot, point, [20, 40]), { code: 'invalid_params' });
    assert.throws(() => dragCoordinates(shot, [20, 40], point), { code: 'invalid_params' });
    assert.throws(() => dragCoordinates(shot, [20, 40], [40, 60], [[10, 20], point]), { code: 'invalid_params' });
  }
  for (const path of [null, [], [[0, 0]], Array(21).fill([0, 0]), 'bad']) {
    assert.throws(() => dragCoordinates(shot, [20, 40], [40, 60], path), { code: 'invalid_params' });
  }
});

const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { fit } = require('../electron/computer-use/budget.cjs');
const { actionGate } = require('../electron/computer-use/guards.cjs');
function setup({ bundleId = 'com.apple.TextEdit', result, probe = {} } = {}) {
  const calls = [], waits = [];
  const cu = createComputerUse({ wait: async (ms) => waits.push(ms), native: { async call(method, params) {
    calls.push({ method, params });
    if (method === 'probe') return { secureInput: false, screenLocked: false, secondsSinceUserInput: 5, ...probe };
    if (method === 'captureWindow') {
      const [width, height] = fit(shot.frameWidth, shot.frameHeight);
      return { ...shot, width, height, windowId: 42, bundleId, jpegQuality: 0.75 };
    }
    if (method === 'drag') return typeof result === 'function' ? result() : result ?? { outcome: 'ok', delivered: true, mouseUpSent: true, verified: false };
    throw new Error(method);
  } } });
  cu.grantsFor('s').grant([bundleId]);
  return { cu, calls, waits, params: { bundleId, coordinate: [20, 40], to_coordinate: [800, 400] },
    drags: () => calls.filter((c) => c.method === 'drag') };
}

test('drag requires grants and screenshot; VS Code remains click-only per user decision', async () => {
  const f = setup();
  await assert.rejects(f.cu.appDrag('other', f.params), { code: 'app_not_granted' });
  await assert.rejects(f.cu.appDrag('s', f.params), { code: 'screenshot_required' });
  const vscode = setup({ bundleId: 'com.microsoft.VSCode' });
  await assert.rejects(vscode.cu.appDrag('s', vscode.params), { code: 'tier_refused' });
  assert.equal(vscode.drags().length, 0);
});

test('drag sends both coordinate forms, button and grants to native', async () => {
  const f = setup();
  await f.cu.appScreenshot('s', f.params);
  const result = await f.cu.appDrag('s', { ...f.params, button: 'middle' });
  assert.equal(result.path, 'cgevent');
  assert.equal(result.verified, false);
  assert.deepEqual(f.drags()[0].params, { bundleId: f.params.bundleId, windowId: 42,
    ...dragCoordinates(shot, f.params.coordinate, f.params.to_coordinate), button: 'middle', grantedBundleIds: [f.params.bundleId] });
});

test('drag checks secure input before typing and lock; lock before delivery blocks', async () => {
  assert.equal(actionGate({ secureInput: true, secondsSinceUserInput: 0, screenLocked: true }, 'drag'), 'secure_input_active');
  assert.equal(actionGate({ secondsSinceUserInput: 0, screenLocked: true }, 'drag'), 'user_actively_typing');
  const f = setup({ probe: { screenLocked: true } });
  await f.cu.appScreenshot('s', f.params);
  assert.equal((await f.cu.appDrag('s', f.params)).reasonCode, 'screen_locked');
  assert.equal(f.drags().length, 0);
});

test('mid-drag user activity releases without replaying a partially delivered drag', async () => {
  const f = setup({ result: { outcome: 'ineffective', reasonCode: 'user_actively_typing', delivered: true, mouseUpSent: true } });
  await f.cu.appScreenshot('s', f.params);
  const result = await f.cu.appDrag('s', f.params);
  assert.equal(result.reasonCode, 'user_actively_typing');
  assert.equal(result.mouseUpSent, true);
  assert.equal(f.drags().length, 1);
  assert.deepEqual(f.waits, []);
});

test('typing before a drag retries only while nothing has been pressed', async () => {
  let count = 0;
  const f = setup({ result: () => ++count < 3
    ? { outcome: 'unsupported', reasonCode: 'user_actively_typing', delivered: false }
    : { outcome: 'ok', delivered: true, mouseUpSent: true } });
  await f.cu.appScreenshot('s', f.params);
  assert.equal((await f.cu.appDrag('s', f.params)).outcome, 'ok');
  assert.deepEqual(f.waits, [200, 200]);
});

const { dragReadback } = require('../electron/computer-use/service.cjs');
const { decide } = require('../electron/computer-use/reason-policy.cjs');
const sent = { outcome: 'ok', reasonCode: null, delivered: true, mouseUpSent: true };

test('readback contract: text range 10–40, slider 30–70, and an app tab position changing verify delivery', () => {
  const examples = [
    [{ AXValue: '0123456789'.repeat(8), AXSelectedTextRange: { location: 0, length: 0 } },
      { AXValue: '0123456789'.repeat(8), AXSelectedTextRange: { location: 10, length: 30 } }],
    [{ AXValue: 0.3 }, { AXValue: 0.7 }],
    [{ AXPosition: { x: 100, y: 40 } }, { AXPosition: { x: 300, y: 40 } }],
  ];
  for (const [before, after] of examples) {
    const result = dragReadback({ ...sent, before, after }, 'dev.example.app');
    assert.equal(result.outcome, 'ok');
    assert.equal(result.verified, true);
    assert.deepEqual(result.before, before);
    assert.deepEqual(result.after, after);
  }
});

test('readback: unchanged values are ineffective with before/after; object key order is irrelevant', async () => {
  const before = { AXSelectedTextRange: { location: 10, length: 0 }, AXPosition: { x: 10, y: 20 } };
  const after = { AXPosition: { y: 20, x: 10 }, AXSelectedTextRange: { length: 0, location: 10 } };
  const f = setup({ result: { ...sent, before, after } });
  await f.cu.appScreenshot('s', f.params);
  const result = await f.cu.appDrag('s', f.params);
  assert.equal(result.outcome, 'ineffective');
  assert.equal(result.reasonCode, 'drag_ineffective');
  assert.equal(result.verified, true);
  assert.deepEqual([result.before, result.after], [before, after]);
});

test('Finder unchanged readback is drag_ineffective like any app (official: no system-app reason) and blocks', async () => {
  const state = { AXPosition: { x: 100, y: 200 } };
  const f = setup({ bundleId: 'com.apple.finder', result: { ...sent, before: state, after: state } });
  await f.cu.appScreenshot('s', f.params);
  const result = await f.cu.appDrag('s', f.params);
  assert.equal(result.reasonCode, 'drag_ineffective');
  assert.equal(result.mouseUpSent, true);
  assert.equal(decide(result, { op: 'drag' }).action, 'block');
  assert.equal(decide(result, { op: 'left_click' }).action, 'block');
  assert.equal(dragReadback({ ...sent, before: state, after: state }).reasonCode, 'drag_ineffective');
});

test('unreadable or vanished attributes do not turn delivery into verified success or a system-app diagnosis', () => {
  for (const [before, after] of [[{}, {}], [{ AXValue: 30 }, {}], [{ AXValue: 30, AXPosition: { x: 1, y: 2 } }, { AXPosition: { x: 1, y: 2 } }]]) {
    const result = dragReadback({ ...sent, before, after }, 'com.apple.finder');
    assert.equal(result.outcome, 'ok');
    assert.equal(result.verified, false);
  }
  const abort = { ...sent, outcome: 'ineffective', reasonCode: 'screen_locked', before: { AXValue: 30 }, after: { AXValue: 70 } };
  assert.deepEqual(dragReadback(abort, 'com.apple.finder'), abort, 'partial change cannot erase a safety abort');
});
