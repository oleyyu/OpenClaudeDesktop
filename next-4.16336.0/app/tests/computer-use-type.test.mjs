import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Computer use M3: app_type (AX rung → policy → raw text rung) and app_key over a fake native module, plus the built
// module's refusal paths and chunking. Opened for app_type only: no_focused_text and text_not_writable. Everything else
// — ax_error, the readback verdicts, unknown reasons — blocks (fail-closed). Live runs: computer-use-type-live.test.mjs.
const require = createRequire(import.meta.url);
const { createComputerUse, normalizeCombo, MAX_TYPE_UNITS } = require('../electron/computer-use/service.cjs');
const { decide, FALLBACK, BLOCK } = require('../electron/computer-use/reason-policy.cjs');
const { policyHitMessage } = require('../electron/computer-use/executor.cjs');
const { fit } = require('../electron/computer-use/budget.cjs');

const APP = 'com.apple.TextEdit';
const ELEMENTS = [
  { index: 0, role: 'AXButton', title: 'Bold', frame: { x: 20, y: 10, width: 40, height: 40 } },
  { index: 1, role: 'AXTextArea', title: 'body', frame: { x: 0, y: 100, width: 1840, height: 700 } },
];
const OK = { outcome: 'ok', reasonCode: null, verified: true, deliveredPrefixChars: 5, charsDelivered: 5, textLength: 5 };

function setUp({ axType = () => OK, rawType = () => OK, axKey = () => ({ outcome: 'unsupported', reasonCode: 'no_ax_key_action' }),
  rawKey = () => ({ outcome: 'ok', reasonCode: null, verified: false, delivered: true }), probe = {},
  axClick = () => ({ outcome: 'ok', reasonCode: null, verified: true }),
  drag = () => ({ outcome: 'ok', reasonCode: null, delivered: true, before: {}, after: {} }) } = {}) {
  const calls = [], infos = [], warnings = [], waits = [];
  const handlers = {
    probe: () => ({ axTrusted: true, screenCapture: true, screenLocked: false, secureInput: false, eventSource: true, ...probe }),
    captureWindow: (p) => {
      const [width, height] = fit(1840, 872);
      return { dataUrl: 'data:image/jpeg;base64,AA==', width, height, frameWidth: 1840, frameHeight: 872, scaleFactor: 2, jpegQuality: 0.75,
        windowId: 4242, bundleId: p.bundleId, bounds: { x: 95, y: 163, width: 920, height: 436 }, elements: ELEMENTS, axTrusted: true };
    },
    axType, rawType, axKey, rawKey, axClick, drag,
  };
  const native = { async call(method, params = {}) { calls.push({ method, params: JSON.parse(JSON.stringify(params)) }); if (!handlers[method] && method === 'savePanelProbe') throw Object.assign(new Error('Unknown method savePanelProbe.'), { code: 'unknown_method' }); return handlers[method](params); } };
  const cu = createComputerUse({ native, log: { info: (m) => infos.push(m), warn: (m) => warnings.push(m) }, wait: async (ms) => waits.push(ms) });
  cu.grantsFor('s1').grant([APP, 'com.apple.Terminal']);
  const of = (method) => calls.filter((c) => c.method === method);
  return { cu, calls, infos, warnings, waits, of };
}
const shoot = (cu) => cu.appScreenshot('s1', { bundleId: APP });
const refusedBy = (reasonCode, extra = {}) => () => ({ outcome: 'unsupported', reasonCode, ...extra });

test('policy: exactly the two text reasons are open, for app_type only, each with app, scene, trigger and a live sighting', () => {
  assert.deepEqual(Object.keys(FALLBACK).filter((reason) => FALLBACK[reason].ops.includes('type')).sort(), ['no_focused_text', 'text_not_writable']);
  for (const [reason, entry] of Object.entries(FALLBACK).filter(([, entry]) => entry.ops.includes('type'))) {
    assert.deepEqual(entry.ops, ['type'], reason);
    for (const key of ['app', 'scene', 'trigger', 'falls_to']) assert.equal(typeof entry[key], 'string', `${reason}.${key}`);
    assert.match(entry.live, /^SEEN 2026-10-19/, reason);
  }
  const log = { warn: (m) => assert.fail(`unexpected warning ${m}`) };
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'no_focused_text' }, { log, op: 'type' }), { action: 'fallback', reason: 'no_focused_text' });
  assert.deepEqual(decide({ outcome: 'ineffective', reasonCode: 'text_not_writable' }, { log, op: 'type' }), { action: 'fallback', reason: 'text_not_writable' });
  // The same reason on another op blocks.
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'text_not_writable' }, { log, op: 'left_click' }), { action: 'block', reason: 'text_not_writable', outOfScope: true });
  assert.equal(decide({ outcome: 'unsupported', reasonCode: 'no_focused_text' }, { log }).action, 'block');
  for (const reason of ['ax_error', 'no_text_target', 'text_unchanged', 'text_mismatch', 'partial_delivery', 'target_exited', 'focus_refused', 'secure_input_active']) {
    assert.ok(Object.hasOwn(BLOCK, reason), reason);
    assert.equal(decide({ outcome: 'ineffective', reasonCode: reason }, { log, op: 'type' }).action, 'block', reason);
  }
});

test('app_type on the AX rung: one native call, path ax, the address of the last screenshot', async () => {
  const { cu, of } = setUp();
  await shoot(cu);
  const result = await cu.appType('s1', { bundleId: APP, text: 'hello', element_index: 1 });
  assert.equal(result.outcome, 'ok');
  assert.equal(result.path, 'ax');
  assert.equal(result.verified, true);
  assert.deepEqual(of('axType').map((c) => c.params), [{ bundleId: APP, windowId: 4242, text: 'hello', mode: 'insert', elementIndex: 1, expectRole: 'AXTextArea' }]);
  assert.deepEqual(of('rawType'), []);
  await cu.appType('s1', { bundleId: APP, text: 'x', coordinate: [400, 300], mode: 'replace' });
  assert.deepEqual(of('axType').at(-1).params, { bundleId: APP, windowId: 4242, text: 'x', mode: 'replace', winLocalPt: { x: 200, y: 150 } });
  await cu.appType('s1', { bundleId: APP, text: 'y' });
  assert.deepEqual(of('axType').at(-1).params, { bundleId: APP, windowId: 4242, text: 'y', mode: 'insert', focused: true });
});

for (const reason of ['no_focused_text', 'text_not_writable']) {
  test(`${reason} falls to rawType with the AX reason, the same address and the grants; the hit is logged`, async () => {
    const { cu, of, infos } = setUp({ axType: () => ({ outcome: 'ineffective', reasonCode: reason, axWriteIgnored: true }) });
    await shoot(cu);
    const result = await cu.appType('s1', { bundleId: APP, text: '世界 👨‍👩‍👧', element_index: 1, mode: 'replace' });
    assert.equal(result.outcome, 'ok');
    assert.equal(result.path, 'cgevent');
    assert.equal(result.axReason, reason);
    assert.deepEqual(of('rawType').map((c) => c.params), [{ bundleId: APP, windowId: 4242, text: '世界 👨‍👩‍👧', mode: 'replace', elementIndex: 1,
      expectRole: 'AXTextArea', axReason: reason, grantedBundleIds: [APP, 'com.apple.Terminal'] }]);
    assert.deepEqual(infos, [policyHitMessage(reason, { op: 'type', bundleId: APP, windowId: 4242 })]);
  });
}

test('acceptance 5 — fail-closed: ax_error, readback verdicts, a secure field and unknown reasons never reach rawType', async () => {
  for (const reasonCode of ['ax_error', 'no_text_target', 'text_unchanged', 'text_mismatch', 'secure_input_active', 'listed_element_gone', 'reason_nobody_has_seen', null]) {
    const { cu, of, infos, warnings } = setUp({ axType: () => ({ outcome: reasonCode === 'text_unchanged' ? 'ineffective' : 'unsupported', reasonCode }) });
    await shoot(cu);
    const result = await cu.appType('s1', { bundleId: APP, text: 'abc', element_index: 1 });
    assert.equal(result.blocked, true, String(reasonCode));
    assert.equal(result.path, 'unavailable', String(reasonCode));
    assert.deepEqual(of('rawType'), [], String(reasonCode));
    assert.deepEqual(infos, [], String(reasonCode));
    if (reasonCode === 'reason_nobody_has_seen') {
      assert.equal(result.unclassified, true);
      assert.match(warnings[0], /reason_nobody_has_seen.*fail-closed/);
    }
  }
});

test('acceptance 2 — secure input: refused before any native write (probe), or by the native gate; nothing typed', async () => {
  const locked = setUp({ probe: { secureInput: true } });
  await shoot(locked.cu);
  assert.deepEqual(await locked.cu.appType('s1', { bundleId: APP, text: 'secret', element_index: 1 }),
    { outcome: 'unsupported', reasonCode: 'secure_input_active', path: 'unavailable', blocked: true });
  assert.deepEqual(locked.of('axType'), []);
  // The raw rung's own gate (secure input began after the AX check): final, no retry.
  const late = setUp({ axType: refusedBy('text_not_writable'), rawType: refusedBy('secure_input_active') });
  await shoot(late.cu);
  const result = await late.cu.appType('s1', { bundleId: APP, text: 'secret', element_index: 1 });
  assert.equal(result.reasonCode, 'secure_input_active');
  assert.equal(result.blocked, true);
  assert.equal(late.of('rawType').length, 1);
  assert.deepEqual(late.waits, []);
});

test('acceptance 3 — user typing: the raw rung backs off 3 × 200 ms, then succeeds or finally refuses', async () => {
  const typing = { outcome: 'unsupported', reasonCode: 'user_actively_typing' };
  let n = 0;
  const calm = setUp({ axType: refusedBy('text_not_writable'), rawType: () => ((n += 1) <= 2 ? typing : OK) });
  await shoot(calm.cu);
  assert.equal((await calm.cu.appType('s1', { bundleId: APP, text: 'hello', element_index: 1 })).outcome, 'ok');
  assert.deepEqual(calm.waits, [200, 200]);
  const busy = setUp({ axType: refusedBy('text_not_writable'), rawType: () => typing });
  await shoot(busy.cu);
  const refused = await busy.cu.appType('s1', { bundleId: APP, text: 'hello', element_index: 1 });
  assert.equal(refused.reasonCode, 'user_actively_typing');
  assert.equal(refused.blocked, true);
  assert.equal(busy.of('rawType').length, 4);
  assert.deepEqual(busy.waits, [200, 200, 200]);
});

test('acceptance 6 — a partial delivery comes back ineffective with deliveredPrefixChars, never ok', async () => {
  for (const partial of [
    { outcome: 'ineffective', reasonCode: 'target_exited', deliveredPrefixChars: 380, charsDelivered: 380, textLength: 2000, verified: false },
    { outcome: 'ineffective', reasonCode: 'partial_delivery', deliveredPrefixChars: 120, charsDelivered: 2000, textLength: 2000, verified: true },
  ]) {
    const { cu } = setUp({ axType: refusedBy('text_not_writable'), rawType: () => partial });
    await shoot(cu);
    const result = await cu.appType('s1', { bundleId: APP, text: 'x'.repeat(2000), element_index: 1 });
    assert.equal(result.outcome, 'ineffective');
    assert.equal(result.reasonCode, partial.reasonCode);
    assert.equal(result.deliveredPrefixChars, partial.deliveredPrefixChars);
    assert.equal(result.blocked, true);
    assert.equal(result.path, 'cgevent');
  }
});

test('app_type refuses before any native call: tier, text, mode, addressing, no screenshot', async () => {
  const { cu, calls } = setUp();
  const code = (c) => (error) => error.code === c;
  await assert.rejects(() => cu.appType('s1', { bundleId: 'com.apple.Terminal', text: 'ls' }), (e) => e.code === 'tier_refused' && /tier "click"/.test(e.message));
  await assert.rejects(() => cu.appType('s1', { bundleId: APP, text: 'a' }), code('screenshot_required'));
  await shoot(cu);
  const before = calls.length;
  for (const args of [{ text: '' }, { text: 7 }, { text: 'x'.repeat(MAX_TYPE_UNITS + 1) }, { text: 'a', mode: 'append' },
    { text: 'a', element_index: 2 }, { text: 'a', element_index: 0.5 }, { text: 'a', coordinate: [1840, 1] }, { text: 'a', coordinate: [1, 1], element_index: 1 },
    { text: 'a', target: 'pointer' }]) {
    await assert.rejects(() => cu.appType('s1', { bundleId: APP, ...args }), code('invalid_params'), JSON.stringify(args).slice(0, 80));
  }
  assert.equal(calls.length, before);
});

test('app_key: one normalized combo; AX rung, then the raw rung for no_ax_key_action; refusals before native', async () => {
  const axKey = (p) => (p.combo === 'backspace' ? { outcome: 'ok', reasonCode: null, axOp: 'set AXSelectedText="" (delete)', role: 'AXTextArea', verified: true }
    : { outcome: 'unsupported', reasonCode: 'no_ax_key_action', role: 'AXTextArea' });
  const { cu, of, waits, infos } = setUp({ axKey });
  await shoot(cu);
  // AX: backspace on the text area at the coordinate, no keystroke.
  const deleted = await cu.appKey('s1', { bundleId: APP, combo: 'Backspace', coordinate: [100, 200] });
  assert.deepEqual([deleted.outcome, deleted.path, deleted.verified, deleted.combo, deleted.aimed], ['ok', 'ax', true, 'backspace', '(100, 200)']);
  assert.deepEqual(of('axKey').map((c) => c.params), [{ bundleId: APP, windowId: 4242, combo: 'backspace', winLocalPt: { x: 50, y: 100 } }]);
  assert.equal(of('rawKey').length, 0);
  // Raw: shift+cmd+down has no AX action; the keystroke goes at the same (last) point, unverified, the policy hit logged.
  const moved = await cu.appKey('s1', { bundleId: APP, combo: 'Command+Shift+Down' });
  assert.deepEqual([moved.outcome, moved.path, moved.verified, moved.axReason, moved.combo], ['ok', 'cgevent', false, 'no_ax_key_action', 'shift+cmd+down']);
  assert.deepEqual(of('rawKey').map((c) => c.params), [{ bundleId: APP, windowId: 4242, combo: 'shift+cmd+down', winLocalPt: { x: 50, y: 100 }, grantedBundleIds: [APP, 'com.apple.Terminal'] }]);
  assert.ok(infos.some((m) => m.startsWith('[cu policy] fallback reasonCode="no_ax_key_action" → cgevent op=key')));
  // element_index and target "focused" are passed through (the raw rung refuses element_index natively).
  await cu.appKey('s1', { bundleId: APP, combo: 'escape', element_index: 1 });
  assert.deepEqual(of('axKey').at(-1).params, { bundleId: APP, windowId: 4242, combo: 'escape', elementIndex: 1, expectRole: 'AXTextArea' });
  await cu.appKey('s1', { bundleId: APP, combo: 'tab', target: 'focused' });
  assert.equal(of('axKey').at(-1).params.focused, true);
  // Refused before native: one key exactly, system combos without the flag, clipboard combos, bad targets.
  const before = of('axKey').length + of('rawKey').length;
  for (const [combo, reasonCode] of [['cmd+shift', 'bad_args'], ['a+b', 'bad_args'], ['', 'bad_args'], ['cmd++', 'bad_args'],
    ['cmd+q', 'grant_flag_required'], ['Command+Tab', 'grant_flag_required'], ['shift+cmd+tab', 'grant_flag_required'], ['cmd+alt+esc', 'grant_flag_required'],
    ['ctrl+cmd+q', 'grant_flag_required'], ['cmd+space', 'grant_flag_required'], ['ctrl+up', 'grant_flag_required'], ['cmd+é', 'grant_flag_required'],
    ['cmd+c', 'state_conflict'], ['cmd+v', 'state_conflict'], ['ctrl+x', 'state_conflict'], ['shift+delete', 'state_conflict']]) {
    const result = await cu.appKey('s1', { bundleId: APP, combo, coordinate: [100, 200] });
    assert.deepEqual([result.outcome, result.reasonCode, result.blocked], ['unsupported', reasonCode, true], combo);
    assert.equal(typeof result.message, 'string', combo);
  }
  for (const args of [{ coordinate: [1, 1], element_index: 1 }, { target: 'pointer' }, { element_index: 9 }, { coordinate: [5000, 1] }]) {
    assert.equal((await cu.appKey('s1', { bundleId: APP, combo: 'tab', ...args })).reasonCode, 'bad_args', JSON.stringify(args));
  }
  assert.equal(of('axKey').length + of('rawKey').length, before);
  // With the systemKeyCombos flag a system combo goes on (and the background key set then decides).
  cu.grantsFor('s1').grant([], { systemKeyCombos: true });
  await cu.appKey('s1', { bundleId: APP, combo: 'cmd+q', coordinate: [100, 200] });
  assert.equal(of('rawKey').at(-1).params.combo, 'cmd+q');
  await assert.rejects(() => cu.appKey('s1', { bundleId: 'com.apple.Terminal', combo: 'return' }), (e) => e.code === 'tier_refused');
  assert.deepEqual(waits, []);
  // The session gates: secure input (official state_conflict wording) and the lock, before native.
  const secure = setUp({ axKey, probe: { secureInput: true } });
  await shoot(secure.cu);
  const blocked = await secure.cu.appKey('s1', { bundleId: APP, combo: 'tab', coordinate: [1, 1] });
  assert.deepEqual([blocked.reasonCode, blocked.errorKind], ['secure_input_active', 'state_conflict']);
  assert.match(blocked.message, /secure input active; keyboard actions are blocked/);
  assert.equal(secure.of('axKey').length, 0);
  // The raw rung's user_actively_typing backs off 3 × 200 ms like every raw call.
  const typing = setUp({ axKey, rawKey: refusedBy('user_actively_typing', { delivered: false }) });
  await shoot(typing.cu);
  const busy = await typing.cu.appKey('s1', { bundleId: APP, combo: 'tab', coordinate: [1, 1] });
  assert.equal(busy.reasonCode, 'user_actively_typing');
  assert.deepEqual(typing.waits, [200, 200, 200]);
  assert.equal(typing.of('rawKey').length, 4);
  // The policy opens no_ax_key_action for app_key only.
  assert.deepEqual(decide({ outcome: 'unsupported', reasonCode: 'no_ax_key_action' }, { op: 'key' }), { action: 'fallback', reason: 'no_ax_key_action' });
  assert.equal(decide({ outcome: 'unsupported', reasonCode: 'no_ax_key_action' }, { op: 'type' }).action, 'block');
  for (const reason of ['would_replace_content', 'key_cannot_be_aimed', 'menu_command_disabled', 'focus_in_sibling_window', 'bad_args', 'grant_flag_required', 'state_conflict']) {
    assert.ok(Object.hasOwn(BLOCK, reason), reason);
  }
  assert.match(FALLBACK.no_ax_key_action.live, /^SEEN 2026-10-21/);
  // normalizeCombo is the official one: modifiers ctrl, alt, shift, cmd; esc → escape; del → delete.
  assert.equal(normalizeCombo('alt+Command+Escape'), 'alt+cmd+escape');
  assert.equal(normalizeCombo('Shift+Option+Ctrl+Left'), 'ctrl+alt+shift+left');
  assert.equal(normalizeCombo('esc'), 'escape');
  assert.equal(normalizeCombo('del'), 'delete');
});

test('app_key without a target reuses the point of the last action in the window: click, type and drag all set it; "focused" forgets it', async () => {
  const axKey = () => ({ outcome: 'ok', reasonCode: null, axOp: 'delete', role: 'AXTextField', verified: true });
  const { cu, of } = setUp({ axKey });
  await shoot(cu);
  // click field A (element 0, centre [40, 30] → local {20, 15}), then type into field B by coordinate, then backspace.
  assert.equal((await cu.appClick('s1', { bundleId: APP, element_index: 0 })).outcome, 'ok');
  assert.equal((await cu.appType('s1', { bundleId: APP, text: 'hello', coordinate: [60, 310] })).outcome, 'ok');
  assert.equal((await cu.appKey('s1', { bundleId: APP, combo: 'backspace' })).outcome, 'ok');
  assert.deepEqual(of('axKey').at(-1).params.winLocalPt, { x: 30, y: 155 }, 'the key lands on B, where app_type typed, not on A');
  // app_type by element_index: the element's centre.
  await cu.appType('s1', { bundleId: APP, text: 'hello', element_index: 1 });
  await cu.appKey('s1', { bundleId: APP, combo: 'return' });
  assert.deepEqual(of('axKey').at(-1).params.winLocalPt, { x: 460, y: 225 });
  // app_drag: its end point.
  assert.notEqual((await cu.appDrag('s1', { bundleId: APP, coordinate: [100, 200], to_coordinate: [300, 400] })).outcome, 'unsupported');
  await cu.appKey('s1', { bundleId: APP, combo: 'backspace' });
  assert.deepEqual(of('axKey').at(-1).params.winLocalPt, { x: 150, y: 200 });
  // target "focused": no known point any more, so a bare app_key is refused instead of reusing the drag's end.
  await cu.appType('s1', { bundleId: APP, text: 'hello', target: 'focused' });
  const count = of('axKey').length;
  const bare = await cu.appKey('s1', { bundleId: APP, combo: 'backspace' });
  assert.deepEqual([bare.outcome, bare.reasonCode], ['unsupported', 'bad_args']);
  assert.equal(of('axKey').length, count);
  // A refused action (unsupported: nothing was done) leaves the point alone.
  const refused = setUp({ axKey, axType: refusedBy('ax_error') });
  await shoot(refused.cu);
  await refused.cu.appKey('s1', { bundleId: APP, combo: 'tab', coordinate: [60, 310] });
  assert.equal((await refused.cu.appType('s1', { bundleId: APP, text: 'hello', coordinate: [100, 200] })).outcome, 'unsupported');
  await refused.cu.appKey('s1', { bundleId: APP, combo: 'tab' });
  assert.deepEqual(refused.of('axKey').at(-1).params.winLocalPt, { x: 30, y: 155 });
});

// Native: the built module (no event is posted by any of these).
const app = path.resolve(import.meta.dirname, '..');
const built = fs.existsSync(path.join(app, 'native/computer-use/build/computer_use.node'));
const skip = !built && 'native module not built (npm run build:native)';
const call = (method, params, env = {}) => JSON.parse(execFileSync(process.execPath, ['-e',
  `require("./electron/computer-use/native.cjs").createNative().call(${JSON.stringify(method)}, ${JSON.stringify(params)})
     .then((r) => process.stdout.write(JSON.stringify({ result: r })), (e) => process.stdout.write(JSON.stringify({ error: e.code })))`],
{ cwd: app, env: { ...process.env, ...env }, encoding: 'utf8' }));

test('native chunking: ≤ 20 UTF-16 units, a surrogate pair never split, the text intact', { skip }, () => {
  const text = `${'中'.repeat(19)}😀${'a'.repeat(18)}👨‍👩‍👧🇨🇳${'b'.repeat(5)}`;
  const { chunks, maxChunkUnits } = call('textChunks', { text }).result;
  assert.equal(maxChunkUnits, 20);
  assert.ok(chunks.every((c) => c.length >= 1 && c.length <= 20));
  assert.ok(chunks.every((c) => !(c.at(-1) >= 0xd800 && c.at(-1) <= 0xdbff)), 'no chunk ends on a lead surrogate');
  assert.equal(String.fromCharCode(...chunks.flat()), text);
  assert.deepEqual(chunks.slice(0, 2).map((c) => c.length), [19, 20]);
  const long = 'x'.repeat(1990) + '🎉'.repeat(5);
  assert.equal(String.fromCharCode(...call('textChunks', { text: long }).result.chunks.flat()), long);
});

test('native rawType / rawKey / axKey: no event source refuses first; key_not_mapped outside the background key set; params checked', { skip }, () => {
  const base = { bundleId: 'com.apple.finder', windowId: 1, text: 'a', focused: true, grantedBundleIds: ['com.apple.finder'] };
  assert.equal(call('rawType', base, { CU_TEST_FAIL_EVENT_SOURCE: '1' }).result.reasonCode, 'scgevent_unavailable');
  assert.equal(call('rawKey', { bundleId: 'com.apple.finder', combo: 'tab', grantedBundleIds: ['com.apple.finder'] }, { CU_TEST_FAIL_EVENT_SOURCE: '1' }).result.reasonCode, 'scgevent_unavailable');
  for (const combo of ['cmd+bogus', 'hyper+a', 'cmd+', 'cmd++', 'a', 'cmd+s', 'ctrl+tab', 'cmd+return', 'shift+escape', 'fn+left']) {
    assert.deepEqual(call('rawKey', { bundleId: 'com.apple.finder', combo, grantedBundleIds: ['com.apple.finder'] }).result, { outcome: 'unsupported', reasonCode: 'key_not_mapped', combo, delivered: false }, combo);
  }
  for (const bad of [{ text: '' }, { mode: 'append' }, { focused: false }, { grantedBundleIds: ['x.y'] }, { winLocalPt: { x: 1, y: 1 } }]) {
    assert.equal(call('rawType', { ...base, ...bad }).error, 'invalid_params', JSON.stringify(bad));
  }
  assert.equal(call('rawKey', { bundleId: 'com.apple.finder', combo: 'tab', repeat: 2, grantedBundleIds: ['com.apple.finder'] }).error, 'invalid_params', 'one key per call');
  assert.equal(call('rawKey', { bundleId: 'com.apple.finder', combo: 'tab', grantedBundleIds: ['x.y'] }).error, 'invalid_params');
  assert.equal(call('rawKey', { bundleId: 'com.apple.finder', combo: 'tab', focused: true, elementIndex: 1, grantedBundleIds: ['com.apple.finder'] }).error, 'invalid_params');
  assert.equal(call('axKey', { bundleId: 'com.apple.finder', windowId: 1, combo: 'return' }).error, 'invalid_params', 'axKey needs an address');
  assert.equal(call('axKey', { bundleId: 'com.apple.finder', windowId: 1, combo: '', focused: true }).error, 'invalid_params');
});
