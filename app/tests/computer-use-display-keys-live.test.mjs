// Live: the screen-wide keyboard, wait and computer_batch on the global HID stream (CU_LIVE=1 only). The text fixture
// (tests/fixtures/cu-text-fixture, focus in `notes`) is in front and records what reached it; the real service and native
// module run the official order (takeover approval, display lock, frontmost tier, native gates per keystroke).
//   CU_LIVE=1 node --test --test-concurrency=1 tests/computer-use-display-keys-live.test.mjs
// While the screen is locked only the gates are checked: every keystroke is refused before anything is posted
// (secondsSinceOwnInput does not change), wait and a waits-only batch still answer. At the end the fixture quits and the
// app that was in front is brought back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { liveSkip, native, buildFixture, launchFixture, FIXTURE } from './computer-use-live-helpers.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const skip = await liveSkip();
const locked = skip ? null : (await native().call('probe')).screenLocked === true;

function setup(grants) {
  const fullControl = createFullControl();
  const service = createComputerUse({ native: native(), log: { log() {}, warn() {}, info() {} }, fullControl });
  service.grantsFor('live').grant(grants);
  service.requestFullControl('live', { approved: true });
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-keys-live-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service, askTakeover: async () => 'accept' }));
  const call = (name, args = {}) => host.call('live', { name, arguments: args });
  return { service, fullControl, call };
}
const text = (result) => result.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n');
const body = (result) => JSON.parse(result.content.at(-1).text);

test('locked screen: key, hold_key and type are refused before any keystroke; wait and a waits-only batch answer', { skip: skip ?? (locked ? false : 'the screen is not locked (the fixture test runs instead)') }, async () => {
  const n = native();
  const ownBefore = (await n.call('probe')).secondsSinceOwnInput;
  // Natively, with no main-process gate in front: the per-keystroke gate refuses (the lock screen's secure input).
  for (const [method, params] of [['hidKey', { modifiers: [], keys: ['a'], repeat: 1 }], ['hidKeyHold', { modifiers: ['shift'], keys: [], durationMs: 200 }],
    ['hidType', { text: 'abc' }]]) {
    const result = await n.call(method, params);
    assert.equal(result.outcome, 'unsupported', method);
    assert.ok(['secure_input_active', 'screen_locked'].includes(result.reasonCode), `${method}: ${result.reasonCode}`);
    assert.equal(result.delivered, false, `${method}: nothing delivered`);
  }
  assert.equal((await n.call('hidState')).keysHeld, 0);
  // Through the tools: loginwindow is in front and never granted.
  const { call, fullControl } = setup([{ bundleId: 'com.apple.TextEdit', displayName: 'TextEdit' }]);
  for (const [name, args] of [['key', { text: 'return' }], ['type', { text: 'x' }], ['hold_key', { text: 'shift', duration: 0.2 }]]) {
    const refused = body(await call(name, args));
    assert.deepEqual([refused.ok, refused.reasonCode], [false, 'app_not_granted'], name);
    assert.ok(refused.next_step, name);
  }
  assert.equal(text(await call('wait', { duration: 0.1 })), 'Waited 0.1s.');
  const waits = await call('computer_batch', { actions: [{ action: 'wait', duration: 0 }, { action: 'wait', duration: 0 }] });
  assert.equal(text(waits), '[1/2] wait: Waited 0s.\n[2/2] wait: Waited 0s.');
  const stopped = await call('computer_batch', { actions: [{ action: 'wait', duration: 0 }, { action: 'key', text: 'a' }, { action: 'type', text: 'never' }] });
  assert.equal(stopped.isError, true);
  assert.equal(body(stopped).message, 'Batch stopped at actions[1] (key). 1 completed, 1 remaining.');
  const displays = (await n.call('listDisplays')).displays;
  if (displays.length < 2) assert.match(body(await call('switch_display', { display: 'x' })).message, /Only one monitor/);
  fullControl.releaseAll?.();
  assert.equal((await n.call('probe')).secondsSinceOwnInput, ownBefore, 'not one event was posted');
});

test('fixture: type (graphemes, a new line), key with modifiers and repeat, hold_key released, a batch, all landing in the app in front', { skip: skip ?? (locked ? 'the screen is locked' : false), timeout: 120000 }, async () => {
  const n = native();
  const front = await n.call('frontmostApp');
  const fixture = await launchFixture(buildFixture(), { focus: 'notes' });
  const { call } = setup([{ bundleId: FIXTURE, displayName: 'CUTextFixture' }]);
  const retry = async (name, args) => {
    let result;
    for (let i = 0; i < 5; i += 1) {
      result = await call(name, args);
      if (!result.isError || body(result).reasonCode !== 'user_actively_typing') break;
      await sleep(1000);
    }
    assert.notEqual(result.isError, true, `${name}: ${text(result)}`);
    await sleep(250);
    return text(result);
  };
  try {
    for (let i = 0; i < 20 && (await n.call('frontmostApp')).bundleId !== FIXTURE; i += 1) await sleep(100);
    assert.equal((await n.call('frontmostApp')).bundleId, FIXTURE, 'the fixture is in front');
    assert.equal(await retry('type', { text: 'héllo 👋🏽\nworld' }), 'Typed 13 grapheme(s).');
    let state = await fixture.dump();
    assert.equal(state.notes, 'héllo 👋🏽\nworld');
    assert.equal(await retry('key', { text: 'left', repeat: 5 }), 'Key pressed 5 times.');
    await retry('type', { text: '_' });
    state = await fixture.dump();
    assert.equal(state.notes, 'héllo 👋🏽\n_world', 'five lefts, then the caret took the text');
    assert.equal(await retry('key', { text: 'cmd+a' }), 'Key pressed.');
    await retry('type', { text: 'X' });
    state = await fixture.dump();
    assert.equal(state.notes, 'X', 'cmd+a selected everything, typing replaced it');
    assert.equal(await retry('hold_key', { text: 'shift', duration: 0.3 }), 'Key held.');
    assert.equal((await n.call('hidState')).keysHeld, 0, 'the held key was released');
    await retry('type', { text: 'y' });
    state = await fixture.dump();
    assert.equal(state.notes, 'Xy', 'no shift left over');
    const batch = await retry('computer_batch', { actions: [{ action: 'key', text: 'return' }, { action: 'type', text: 'b1' }, { action: 'wait', duration: 0.1 }, { action: 'key', text: 'backspace' }] });
    assert.equal(batch, '[1/4] key: Key pressed.\n[2/4] type: Typed 2 grapheme(s).\n[3/4] wait: Waited 0.1s.\n[4/4] key: Key pressed.');
    state = await fixture.dump();
    assert.equal(state.notes, 'Xy\nb');
  } finally {
    await fixture.quit();
    if (typeof front?.bundleId === 'string' && front.bundleId !== 'com.apple.loginwindow') {
      try { execFileSync('open', ['-b', front.bundleId]); } catch {}
      await sleep(800);
    }
  }
});
