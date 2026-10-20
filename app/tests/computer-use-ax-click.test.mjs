import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Computer use M2: app_screenshot's AX summary and app_click on the AX rung (electron/computer-use/service.cjs,
// executor.cjs, reason-policy.cjs, guards.cjs) over a fake native module. Pins the fail-closed ladder: a non-ok AX
// result never turns into a coordinate click unless its reason is whitelisted, and the whitelist starts empty.
const require = createRequire(import.meta.url);
const { createComputerUse, summaryText } = require('../electron/computer-use/service.cjs');
const { decide, FALLBACK, BLOCK, unclassifiedMessage } = require('../electron/computer-use/reason-policy.cjs');
const { execute } = require('../electron/computer-use/executor.cjs');
const { fit } = require('../electron/computer-use/budget.cjs');

const quiet = () => { const warnings = []; return { warnings, warn: (m) => warnings.push(m) }; };

const ELEMENTS = [
  { index: 0, role: 'AXButton', title: 'Back', frame: { x: 200, y: 40, width: 56, height: 48 } },
  { index: 1, role: 'AXRadioButton', title: 'as Columns', frame: { x: 900, y: 40, width: 60, height: 48 }, checked: true },
  { index: 2, role: 'AXTextField', subrole: 'AXSearchField', title: 'Search', frame: { x: 1500, y: 40, width: 300, height: 44 }, enabled: false },
];

function fakeNative({ probe = {}, click = () => ({ outcome: 'ok', reasonCode: null, axOp: 'AXPress', pressedRole: 'AXButton' }) } = {}) {
  const calls = [];
  const handlers = {
    probe: () => ({ axTrusted: true, screenCapture: true, screenLocked: false, secureInput: false, ...probe }),
    captureWindow: (p) => {
      const [width, height] = fit(1840, 872);
      return { dataUrl: 'data:image/jpeg;base64,AA==', width, height, frameWidth: 1840, frameHeight: 872, scaleFactor: 2, jpegQuality: 0.75,
        windowId: p.windowId ?? 16678, bundleId: p.bundleId, bounds: { x: 95, y: 163, width: 920, height: 436 },
        ...(p.listsElements ? { elements: ELEMENTS, axTrusted: true } : {}) };
    },
    axClick: click,
  };
  return { calls, async call(method, params = {}) { calls.push({ method, params: JSON.parse(JSON.stringify(params)) }); return handlers[method](params); } };
}
function setUp(options) {
  const native = fakeNative(options), log = quiet();
  const cu = createComputerUse({ native, log, wait: async () => {} });
  cu.grantsFor('s1').grant(['com.apple.finder', 'com.apple.Safari', 'com.apple.Terminal']);
  return { native, cu, log, clicks: () => native.calls.filter((c) => c.method === 'axClick') };
}

test('reason policy: every non-ok AX result outside the whitelist blocks; unknown reasons warn (fail-closed)', () => {
  // M3 opened the two text reasons, for app_type only (computer-use-type.test.mjs); no click reason is open.
  assert.deepEqual(Object.keys(FALLBACK), ['no_focused_text', 'text_not_writable']);
  assert.ok(Object.values(FALLBACK).every((entry) => entry.ops.length === 1 && entry.ops[0] === 'type'));
  const log = quiet();
  assert.deepEqual(decide({ outcome: 'ok' }, { log }), { action: 'done', reason: null });
  for (const reason of Object.keys(BLOCK)) assert.equal(decide({ outcome: 'unsupported', reasonCode: reason }, { log }).action, 'block', reason);
  assert.deepEqual(log.warnings, []);
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'brand_new_reason' }, { log }), { action: 'block', reason: 'brand_new_reason', unclassified: true });
  assert.equal(log.warnings[0], unclassifiedMessage('brand_new_reason'));
  assert.match(log.warnings[0], /^\[cu ax\] unclassified rung-1 reasonCode="brand_new_reason" — no AX_REASON_LADDER_POLICY entry; blocking \(fail-closed\) rather than falling through to CGEvent\./);
  assert.equal(decide({ outcome: 'unsupported', reasonCode: null }, { log }).action, 'block');
  assert.equal(decide({ outcome: 'weird' }, { log }).action, 'block');
  assert.deepEqual(decide({ outcome: 'dryRun', reasonCode: null }, { log }), { action: 'block', reason: 'dry_run' });
  assert.equal(decide({ outcome: 'ineffective', reasonCode: 'ax_press_failed' }, { log }).action, 'block');
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'user_actively_typing' }, { log }).retry, { attempts: 3, delayMs: 200 });
});

test('executor: with the empty whitelist a raw rung is never reached, for any reason', async () => {
  let raw = 0;
  for (const reasonCode of ['canvas', 'foreign_pid', 'listed_element_covered', 'something_unknown', null]) {
    const result = await execute({ ax: async () => ({ outcome: 'unsupported', reasonCode }), raw: async () => { raw += 1; return { delivered: true }; }, log: quiet() });
    assert.equal(result.blocked, true);
    assert.equal(result.path, 'unavailable');
  }
  assert.equal(raw, 0);
});

test('executor: a whitelisted reason falls through only with a raw rung and never for target "focused"', async () => {
  const allow = () => ({ action: 'fallback', reason: 'whitelisted' });
  const ax = async () => ({ outcome: 'unsupported', reasonCode: 'whitelisted' });
  assert.equal((await execute({ ax, raw: async () => ({ delivered: true }), decide: allow })).path, 'cgevent');
  assert.equal((await execute({ ax, decide: allow })).blocked, true);
  assert.equal((await execute({ ax, raw: async () => ({ delivered: true }), focusedPointer: true, decide: allow })).blocked, true);
});

test('executor: user_actively_typing backs off three times, 200 ms apart, then refuses', async () => {
  let tries = 0; const waits = [];
  const result = await execute({ ax: async () => { tries += 1; return { outcome: 'unsupported', reasonCode: 'user_actively_typing' }; }, wait: async (ms) => waits.push(ms), log: quiet() });
  assert.equal(tries, 4);
  assert.deepEqual(waits, [200, 200, 200]);
  assert.equal(result.reasonCode, 'user_actively_typing');
  assert.equal(result.blocked, true);
  let second = 0;
  const recovered = await execute({ ax: async () => (second += 1) < 3 ? { outcome: 'unsupported', reasonCode: 'user_actively_typing' } : { outcome: 'ok' }, wait: async () => {} });
  assert.equal(recovered.outcome, 'ok');
});

test('app_screenshot returns the image with a [N] summary in frame pixels, and becomes the coordinate reference', async () => {
  const { cu, native } = setUp();
  const shot = await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  assert.deepEqual(native.calls.at(-1), { method: 'captureWindow', params: { bundleId: 'com.apple.finder', listsElements: true } });
  assert.equal(shot.summary, [
    'Window 16678 of com.apple.finder: 1840×872 frame px (image 1568×743).',
    '[0] AXButton "Back" (200, 40, 56×48)',
    '[1] AXRadioButton "as Columns" (900, 40, 60×48) checked',
    '[2] AXTextField/AXSearchField "Search" (1500, 40, 300×44) disabled',
  ].join('\n'));
  // The next screenshot of the app goes to the same window by default.
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  assert.equal(native.calls.at(-1).params.windowId, 16678);
  assert.match(summaryText({ windowId: 1, bundleId: 'x', frameWidth: 10, frameHeight: 10, width: 10, height: 10, elements: [], axTrusted: false }), /Accessibility is not granted/);
  const many = Array.from({ length: 45 }, (_, index) => ({ index, role: 'AXButton', frame: { x: 0, y: 0, width: 1, height: 1 } }));
  assert.match(summaryText({ windowId: 1, bundleId: 'x', frameWidth: 10, frameHeight: 10, width: 10, height: 10, elements: many }), /… 5 more: use app_ax_find\.$/);
});

test('app_click converts frame pixels to window-local points and presses through AX', async () => {
  const { cu, clicks } = setUp();
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [228, 64] });
  assert.equal(result.outcome, 'ok');
  assert.equal(result.path, 'ax');
  assert.deepEqual(clicks().at(-1).params, { bundleId: 'com.apple.finder', windowId: 16678, count: 1, button: 'left', dryRun: false, winLocalPt: { x: 114, y: 32 } });
  // No addressing is an error, never a replay of the last point (a second submit in a form).
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.finder' }), (e) => e.code === 'invalid_params');
  assert.equal(clicks().length, 1);
  // element_index: the native side gets the index and the role it must still have.
  await cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 1 });
  assert.deepEqual(clicks().at(-1).params, { bundleId: 'com.apple.finder', windowId: 16678, count: 1, button: 'left', dryRun: false, elementIndex: 1, expectRole: 'AXRadioButton' });
  await cu.appClick('s1', { bundleId: 'com.apple.finder', target: 'focused' });
  assert.equal(clicks().at(-1).params.focused, true);
});

test('app_click refuses before any native click: not granted, wrong tier, no screenshot, bad addressing', async () => {
  const { cu, clicks } = setUp();
  const code = (c) => (error) => error.code === c;
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.TextEdit', coordinate: [1, 1] }), code('app_not_granted'));
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.Safari', coordinate: [1, 1] }), (e) => e.code === 'tier_refused' && /tier "read"/.test(e.message));
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.Terminal', coordinate: [1, 1], button: 'right' }), (e) => e.code === 'tier_refused' && /tier "click"/.test(e.message));
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.Terminal', coordinate: [1, 1] }), code('screenshot_required'));
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [1, 1] }), code('screenshot_required'));
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  for (const args of [{ coordinate: [1840, 10] }, { coordinate: [-1, 10] }, { coordinate: [1] }, { element_index: 3 }, { element_index: 1.5 },
    { coordinate: [1, 1], element_index: 0 }, { target: 'focused', coordinate: [1, 1] }, { target: 'pointer' }, { count: 4, coordinate: [1, 1] }, { button: 'middle', coordinate: [1, 1] }, {}]) {
    await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.finder', ...args }), code('invalid_params'), JSON.stringify(args));
  }
  assert.deepEqual(clicks(), []);
});

test('a right click goes to the native AXShowMenu with button "right"; it has no raw rung, whatever the policy says', async () => {
  const { cu, clicks, native } = setUp({ click: (p) => (p.button === 'right'
    ? { outcome: 'ok', reasonCode: null, axOp: 'AXShowMenu', menuRole: 'AXTextField', menuItems: ['Open', 'Get Info'] }
    : { outcome: 'ok', reasonCode: null, axOp: 'AXPress' }) });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', element_index: 0, button: 'right' });
  assert.deepEqual([result.outcome, result.path, result.axOp, result.menuItems], ['ok', 'ax', 'AXShowMenu', ['Open', 'Get Info']]);
  assert.deepEqual(clicks().at(-1).params, { bundleId: 'com.apple.finder', windowId: 16678, count: 1, button: 'right', dryRun: false, elementIndex: 0, expectRole: 'AXButton' });
  // Even a policy that would fall through: the right click stops at its AX reason.
  for (const reasonCode of ['no_menu_action', 'menu_not_shown']) {
    const s = setUp({ click: () => ({ outcome: reasonCode === 'menu_not_shown' ? 'ineffective' : 'unsupported', reasonCode }) });
    s.native.calls.length = 0;
    const raw = [];
    s.native.call = ((call0) => async (method, params) => (method === 'rawClick' ? (raw.push(params), { outcome: 'ok' }) : call0(method, params)))(s.native.call.bind(s.native));
    const cu2 = createComputerUse({ native: s.native, log: quiet(), wait: async () => {}, decide: () => ({ action: 'fallback', reason: reasonCode }) });
    cu2.grantsFor('s1').grant(['com.apple.finder']);
    await cu2.appScreenshot('s1', { bundleId: 'com.apple.finder' });
    const refused = await cu2.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [228, 64], button: 'right' });
    assert.equal(refused.blocked, true, reasonCode);
    assert.equal(refused.reasonCode, reasonCode);
    assert.deepEqual(raw, [], 'no raw click for a right click');
  }
  // The policy knows both reasons (no "unclassified" warning) and blocks them.
  for (const reasonCode of ['no_menu_action', 'menu_not_shown']) {
    const log = quiet();
    assert.equal(decide({ outcome: 'unsupported', reasonCode }, { log, op: 'right_click' }).action, 'block');
    assert.deepEqual(log.warnings, []);
  }
  assert.equal(native.calls.filter((c) => c.method === 'rawClick').length, 0);
});

test('a double click reaches the native side as count 2 and never takes the raw rung, whatever the policy says', async () => {
  const { native } = setUp();
  const raw = [];
  native.call = ((call0) => async (method, params) => (method === 'rawClick' ? (raw.push(params), { outcome: 'ok' }) : call0(method, params)))(native.call.bind(native));
  const handlers = { ok: { outcome: 'ok', reasonCode: null, axOp: 'AXSelectedTextRange', selectedText: 'beta' }, none: { outcome: 'unsupported', reasonCode: 'no_press_action' } };
  for (const [name, answer] of Object.entries(handlers)) {
    const n = fakeNative({ click: () => answer });
    const rawCalls = [];
    n.call = ((call0) => async (method, params) => (method === 'rawClick' ? (rawCalls.push(params), { outcome: 'ok' }) : call0(method, params)))(n.call.bind(n));
    const cu = createComputerUse({ native: n, log: quiet(), wait: async () => {}, decide: (r) => (r.outcome === 'ok' ? { action: 'done' } : { action: 'fallback', reason: r.reasonCode }) });
    cu.grantsFor('s1').grant(['com.apple.finder']);
    await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
    const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [228, 64], count: 2 });
    assert.equal(n.calls.find((c) => c.method === 'axClick').params.count, 2, name);
    assert.equal(result.outcome, name === 'ok' ? 'ok' : 'unsupported', name);
    if (name === 'none') assert.deepEqual([result.reasonCode, result.blocked], ['no_press_action', true]);
    assert.deepEqual(rawCalls, [], 'no raw click for a double click');
  }
  assert.deepEqual(raw, []);
});

test('screen locked or secure input: refused with the reason and nothing is pressed', async () => {
  for (const [probe, reason] of [[{ screenLocked: true }, 'screen_locked'], [{ secureInput: true }, 'secure_input_active']]) {
    const { cu, clicks } = setUp({ probe });
    await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
    const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [100, 100] });
    assert.deepEqual(result, { outcome: 'unsupported', reasonCode: reason, path: 'unavailable', blocked: true });
    assert.deepEqual(clicks(), []);
  }
});

test('a plain-area click comes back unsupported (canvas), is not retried and leaves no action point', async () => {
  const { cu, clicks, log } = setUp({ click: () => ({ outcome: 'unsupported', reasonCode: 'canvas', role: 'AXStaticText', descentPath: ['AXStaticText', 'AXGroup', 'AXWindow'] }) });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [900, 600] });
  assert.equal(result.outcome, 'unsupported');
  assert.equal(result.reasonCode, 'canvas');
  assert.equal(result.blocked, true);
  assert.equal(clicks().length, 1);
  assert.deepEqual(log.warnings, []);
  await assert.rejects(() => cu.appClick('s1', { bundleId: 'com.apple.finder' }), (e) => e.code === 'invalid_params');
});

test('an unknown native reason is blocked and logged as needing a policy entry', async () => {
  const { cu, log } = setUp({ click: () => ({ outcome: 'unsupported', reasonCode: 'never_seen_before' }) });
  await cu.appScreenshot('s1', { bundleId: 'com.apple.finder' });
  const result = await cu.appClick('s1', { bundleId: 'com.apple.finder', coordinate: [10, 10] });
  assert.equal(result.blocked, true);
  assert.equal(result.unclassified, true);
  assert.equal(log.warnings.length, 1);
  assert.match(log.warnings[0], /never_seen_before.*fail-closed/);
});
