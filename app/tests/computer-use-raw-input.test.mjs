import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Computer use M3, the raw click rung behind the reason policy. no_press_action was opened, seen failing live (Finder
// drops CGEventPostToPid mouse events) and closed again: it blocks. The rawClick wiring is pinned with a test-only
// policy that opens it. Every other AX reason — ax_error, unknown ones, and the text reasons on a click — never
// reaches rawClick (fail-closed). The native tests run against the built module (npm run build:native).
const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { decide, FALLBACK, PLANNED_M3, BLOCK } = require('../electron/computer-use/reason-policy.cjs');
const { policyHitMessage } = require('../electron/computer-use/executor.cjs');
const { fit } = require('../electron/computer-use/budget.cjs');

const ELEMENTS = [
  { index: 0, role: 'AXButton', title: 'Back', frame: { x: 200, y: 40, width: 56, height: 48 } },
  { index: 1, role: 'AXRow', frame: { x: 900, y: 40, width: 60, height: 48 } },
];

// Test-only policy: opens no_press_action for clicks (closed in reason-policy.cjs), everything else as shipped.
const openNoPress = (result, options) => (result?.reasonCode === 'no_press_action' ? { action: 'fallback', reason: 'no_press_action' } : decide(result, options));

function setUp({ click, raw = () => ({ outcome: 'ok', reasonCode: null, delivered: true, verified: false }), decide: policy } = {}) {
  const calls = [], infos = [], warnings = [], waits = [];
  const handlers = {
    probe: () => ({ axTrusted: true, screenCapture: true, screenLocked: false, secureInput: false, eventSource: true }),
    captureWindow: (p) => {
      const [width, height] = fit(1840, 872);
      return { dataUrl: 'data:image/jpeg;base64,AA==', width, height, frameWidth: 1840, frameHeight: 872, scaleFactor: 2, jpegQuality: 0.75,
        windowId: 16678, bundleId: p.bundleId, bounds: { x: 95, y: 163, width: 920, height: 436 }, elements: ELEMENTS, axTrusted: true };
    },
    axClick: click,
    rawClick: raw,
  };
  const native = { async call(method, params = {}) { calls.push({ method, params: JSON.parse(JSON.stringify(params)) }); return handlers[method](params); } };
  const log = { info: (m) => infos.push(m), warn: (m) => warnings.push(m) };
  const cu = createComputerUse({ native, log, wait: async (ms) => waits.push(ms), ...(policy ? { decide: policy } : {}) });
  cu.grantsFor('s1').grant(['com.apple.finder']);
  return { cu, infos, warnings, waits, raws: () => calls.filter((c) => c.method === 'rawClick') };
}

const noPress = () => ({ outcome: 'unsupported', reasonCode: 'no_press_action', role: 'AXRow', noPressRole: 'AXRow' });

test('policy: no_press_action is closed again (planned, with the live evidence) and blocks without a warning', () => {
  assert.equal(Object.hasOwn(FALLBACK, 'no_press_action'), false);
  assert.match(PLANNED_M3.no_press_action.live, /^CLOSED 2026-10-19\..*CGEventPostToPid.*SUPERSEDED 2026-10-21: the official 2\.42304\.0 ladder .*AXSelected/s);
  assert.match(PLANNED_M3.no_press_action.trigger, /^none since 2026-10-21/);
  const log = { warn: (m) => assert.fail(`unexpected warning ${m}`) };
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'no_press_action' }, { log, op: 'left_click' }), { action: 'block', reason: 'no_press_action' });
  assert.ok(Object.hasOwn(BLOCK, 'ax_error'));
  assert.deepEqual(decide({ outcome: 'ineffective', reasonCode: 'ax_error' }, { log }), { action: 'block', reason: 'ax_error' });
});

test('a shipped no_press_action never reaches rawClick', async () => {
  const { cu, raws, infos } = setUp({ click: noPress });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
  assert.equal(result.blocked, true);
  assert.equal(result.reasonCode, 'no_press_action');
  assert.deepEqual(raws(), []);
  assert.deepEqual(infos, []);
});

test('rawClick wiring (policy opened for the test): one click at the element centre, both coordinate forms, the grants', async () => {
  const { cu, raws, infos } = setUp({ click: noPress, decide: openNoPress });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
  assert.equal(result.outcome, 'ok');
  assert.equal(result.path, 'cgevent');
  assert.equal(result.axReason, 'no_press_action');
  assert.equal(result.verified, false);
  assert.equal('blocked' in result, false);
  // Frame centre (930, 64) ÷ scaleFactor 2 = window-local (465, 32); + bounds origin (95, 163) = screen (560, 195).
  assert.deepEqual(raws(), [{ method: 'rawClick', params: { bundleId: 'com.apple.finder', windowId: 16678, count: 1, button: 'left',
    winLocalPt: { x: 465, y: 32 }, screenPt: { x: 560, y: 195 }, grantedBundleIds: ['com.apple.finder'] } }]);
  assert.deepEqual(infos, [policyHitMessage('no_press_action', { op: 'left_click', bundleId: 'com.apple.finder', windowId: 16678 })]);
  assert.match(infos[0], /^\[cu policy\] fallback reasonCode="no_press_action" → cgevent op=left_click app=com\.apple\.finder window=16678$/);
});

test('fail-closed regression: canvas, ax_error and an unknown reason never reach rawClick', async () => {
  for (const reasonCode of ['canvas', 'ax_error', 'reason_nobody_has_seen', 'multi_click_needs_raw_input', 'no_focused_text', 'text_not_writable']) {
    const { cu, raws, infos, warnings } = setUp({ click: () => ({ outcome: 'unsupported', reasonCode }) });
    await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
    const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [930, 64] });
    assert.equal(result.blocked, true, reasonCode);
    assert.equal(result.path, 'unavailable', reasonCode);
    assert.equal(result.reasonCode, reasonCode);
    assert.deepEqual(raws(), [], reasonCode);
    assert.deepEqual(infos, [], reasonCode);
    if (reasonCode === 'reason_nobody_has_seen') {
      assert.equal(result.unclassified, true);
      assert.match(warnings[0], /reason_nobody_has_seen.*fail-closed/);
    }
  }
});

test('target "focused" never falls through, even for an opened no_press_action', async () => {
  const { cu, raws } = setUp({ click: noPress, decide: openNoPress });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', target: 'focused' });
  assert.equal(result.blocked, true);
  assert.deepEqual(raws(), []);
});

test('the raw rung refusing for user typing backs off 3 × 200 ms, then refuses; other raw refusals are final', async () => {
  const typing = { outcome: 'unsupported', reasonCode: 'user_actively_typing', delivered: false };
  let n = 0;
  const busy = setUp({ click: noPress, raw: () => typing, decide: openNoPress });
  await busy.cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const refused = await busy.cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
  assert.equal(busy.raws().length, 4);
  assert.deepEqual(busy.waits, [200, 200, 200]);
  assert.equal(refused.reasonCode, 'user_actively_typing');
  assert.equal(refused.blocked, true);

  const calm = setUp({ click: noPress, raw: () => ((n += 1) < 3 ? typing : { outcome: 'ok', reasonCode: null, delivered: true }), decide: openNoPress });
  await calm.cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  assert.equal((await calm.cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 })).outcome, 'ok');

  for (const reasonCode of ['secure_input_active', 'scgevent_unavailable', 'screen_locked', 'foreign_pid', 'window_moved', 'anotherWindowIsOnTopAtThePressPoint']) {
    const one = setUp({ click: noPress, raw: () => ({ outcome: 'unsupported', reasonCode, delivered: false }), decide: openNoPress });
    await one.cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
    const result = await one.cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
    assert.equal(result.reasonCode, reasonCode);
    assert.equal(result.blocked, true);
    assert.equal(one.raws().length, 1, reasonCode);
    assert.deepEqual(one.waits, []);
  }
});

test('a raw click the app did not accept (AXSelected unchanged) comes back ineffective and blocked, not ok', async () => {
  const { cu } = setUp({ click: noPress, raw: () => ({ outcome: 'ineffective', reasonCode: 'raw_click_ineffective', delivered: true, verified: true, readback: 'selection_unchanged' }), decide: openNoPress });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
  assert.equal(result.outcome, 'ineffective');
  assert.equal(result.reasonCode, 'raw_click_ineffective');
  assert.equal(result.blocked, true);
  assert.equal(result.path, 'cgevent');
});

// Two native files build events, each the one builder for its scope: EventFactory.swift is the app-scoped raw rung
// (pid-targeted, a hid-state source), DisplayInput.swift is the display-scope HID path (official §1.1: events posted to
// the global HID tap from a PRIVATE-state source, so they move the real cursor and don't refresh the user's idle timer).
test('only EventFactory.swift and DisplayInput.swift build a CGEvent or a CGEventSource (one per scope)', () => {
  const dir = path.join(path.resolve(import.meta.dirname, '..'), 'native/computer-use/Sources');
  const offenders = [];
  for (const sub of fs.readdirSync(dir)) {
    for (const file of fs.readdirSync(path.join(dir, sub)).filter((f) => f.endsWith('.swift'))) {
      const text = fs.readFileSync(path.join(dir, sub, file), 'utf8');
      if (/\bCGEvent\(|\bCGEventSource\(/.test(text) && !['EventFactory.swift', 'DisplayInput.swift'].includes(file)) offenders.push(`${sub}/${file}`);
    }
  }
  assert.deepEqual(offenders, []);
});

// Native: the refusal paths of the built module (no event is posted by any of these).
const app = path.resolve(import.meta.dirname, '..');
const built = fs.existsSync(path.join(app, 'native/computer-use/build/computer_use.node'));
const skip = !built && 'native module not built (npm run build:native)';
const call = (method, params, env = {}) => JSON.parse(execFileSync(process.execPath, ['-e',
  `require("./electron/computer-use/native.cjs").createNative().call(${JSON.stringify(method)}, ${JSON.stringify(params)})
     .then((r) => process.stdout.write(JSON.stringify({ result: r })), (e) => process.stdout.write(JSON.stringify({ error: e.code })))`],
{ cwd: app, env: { ...process.env, ...env }, encoding: 'utf8' }));
const RAW = { bundleId: 'com.apple.finder', windowId: 1, winLocalPt: { x: 1, y: 1 }, screenPt: { x: 1, y: 1 }, grantedBundleIds: ['com.apple.finder'] };

test('native rawClick: no event source refuses the whole path with scgevent_unavailable, before any gate', { skip }, () => {
  assert.deepEqual(call('rawClick', RAW, { CU_TEST_FAIL_EVENT_SOURCE: '1' }).result,
    { outcome: 'unsupported', reasonCode: 'scgevent_unavailable', delivered: false });
});

test('native params: the JSON numbers 0 and 1 are numbers, not booleans (window id 1, point (0, 1))', { skip }, () => {
  // Swift bridges JSON 0 / 1 to NSNumber, which `is Bool` also matches; only CFBoolean is a boolean.
  const env = { CU_TEST_FAIL_EVENT_SOURCE: '1' };
  assert.equal(call('rawClick', { ...RAW, winLocalPt: { x: 0, y: 1 } }, env).result?.reasonCode, 'scgevent_unavailable');
  assert.equal(call('rawClick', { ...RAW, windowId: true }, env).error, 'invalid_params');
  assert.equal(call('rawClick', { ...RAW, winLocalPt: { x: false, y: 1 } }, env).error, 'invalid_params');
});

test('native rawClick: the target app must be in the grants it is sent; bad params never reach the gates', { skip }, () => {
  assert.equal(call('rawClick', { ...RAW, grantedBundleIds: ['com.apple.TextEdit'] }).error, 'invalid_params');
  assert.equal(call('rawClick', { ...RAW, screenPt: undefined }).error, 'invalid_params');
  assert.equal(call('rawClick', { ...RAW, button: 'right' }).error, 'invalid_params');
  assert.equal(call('rawClick', { ...RAW, count: 2 }).error, 'invalid_params');
});
