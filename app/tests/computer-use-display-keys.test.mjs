// The screen-wide keyboard, open_application, switch_display, wait and computer_batch of official §1.1: service.cjs
// displayKeyboard / grantedAppFor / openApplication / openApplicationInBackground / switchDisplay, and the tools in
// agent-tools/computer-use.mjs (the takeover, the official success texts, the one refusal shape, the batch's stop rule).
// A fake native answers like the real one; nothing is posted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createComputerUse, displayLabels } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { chordProblem, displayChord } = require('../electron/computer-use/keys.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const TEXTEDIT = 'com.apple.TextEdit';
const FINDER = 'com.apple.finder';
const TERMINAL = 'com.apple.Terminal';
const MAIN = { displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, scaleFactor: 2, isMain: true, name: 'Built-in Retina Display' };
const SIDE = { displayId: 5, bounds: { x: 1470, y: 0, width: 1920, height: 1080 }, pixelWidth: 1920, pixelHeight: 1080, scaleFactor: 1, isMain: false, name: 'DELL U2720Q' };

/** front: the frontmost bundle id (or a function); refuse: native answers queued per method; windows: listWindows per bundle. */
function fakeNative({ front = TEXTEDIT, refuse = {}, displays = [MAIN], windows = {} } = {}) {
  const calls = [];
  const state = { held: false, aborts: 0, opened: [] };
  const gate = (method) => (refuse[method]?.length ? refuse[method].shift() : null);
  return {
    calls, state,
    async call(method, params = {}) {
      calls.push([method, params]);
      switch (method) {
        case 'listDisplays': return { displays };
        case 'frontmostApp': { const bundleId = typeof front === 'function' ? front() : front; return { pid: 42, bundleId }; }
        case 'cursorPosition': return { x: 300, y: 200 };
        case 'pointOwner': return { owner: { windowId: 50, pid: 42, bundleId: TEXTEDIT, layer: 0, ownerName: 'TextEdit' } };
        case 'captureScreen': {
          const [width, height] = scaled(fit(2940, 1912), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,U0NSRUVO', width, height, frameWidth: 2940, frameHeight: 1912, scaleFactor: 2, displayId: params.displayId ?? 1,
            displayWidth: 1470, displayHeight: 956, displayBounds: MAIN.bounds, region: params.region ?? null, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
        }
        case 'hidMove': case 'hidClick': case 'hidScroll': { const g = gate(method); if (g) return g; return { outcome: 'ok', delivered: true }; }
        case 'hidMouseDown': state.held = true; return { outcome: 'ok', delivered: true, held: true };
        case 'hidMouseUp': { const was = state.held; state.held = false; return { outcome: 'ok', delivered: was, wasHeld: was }; }
        case 'hidKey': { const g = gate(method); if (g) return g; return { outcome: 'ok', delivered: true, pressed: params.repeat, times: params.repeat }; }
        case 'hidKeyHold': { const g = gate(method); if (g) return g; return { outcome: 'ok', delivered: true, heldMs: params.durationMs, released: true, reasonCode: null }; }
        case 'hidType': { const g = gate(method); if (g) return g; const n = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(params.text)].length; return { outcome: 'ok', delivered: n > 0, typed: n, total: n }; }
        case 'hidKeyAbort': state.aborts += 1; (state.abortParams ??= []).push(params); return { aborted: true };
        case 'openApp': state.opened.push(params); return { bundleId: params.bundleId, pid: 77, wasRunning: false, activates: params.activates };
        case 'listWindows': return { windows: windows[params.bundleId] ?? [] };
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
}

function svc({ grants = [{ bundleId: TEXTEDIT, displayName: 'TextEdit' }], approve = true, flags = {}, escapes = [], onWait = null, ...options } = {}) {
  const fullControl = createFullControl();
  const native = fakeNative(options);
  const waits = [];
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {} }, wait: async (ms) => { waits.push(ms); await onWait?.(ms); }, fullControl,
    selfBundleIds: ['com.openclaude.desktop'], withOwnEscape: async (run, opts = {}) => { escapes.push(opts.releaseAfterMs ? `off(${opts.releaseAfterMs})` : 'off'); try { return await run(); } finally { escapes.push('on'); } } });
  service.grantsFor('a').grant(grants, flags);
  if (approve) service.requestFullControl('a', { approved: true });
  return { service, native, fullControl, waits, escapes };
}
const posted = (native, method) => native.calls.filter(([m]) => m === method).map(([, p]) => p);

function tools({ answer = 'accept', approve = false, ...options } = {}) {
  const made = svc({ approve, ...options });
  const takeovers = [];
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-keys-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service: made.service, resolveApps: async () => [], listApps: async () => ({ apps: [] }), ask: async () => answer,
    askTakeover: async (opts) => { takeovers.push(opts); return answer; } }));
  const call = (name, args = {}, session = 'a') => host.call(session, { name, arguments: args });
  return { ...made, host, takeovers, call };
}
const body = (result) => JSON.parse(result.content.at(-1).text);
const texts = (result) => result.content.filter((part) => part.type === 'text').map((part) => part.text);

test('chords (official wA()): one key besides the modifiers, shift + navigation keys excepted, at most 8 names; names fold to what native presses', () => {
  assert.equal(chordProblem('cmd+shift+a'), null);
  assert.equal(chordProblem('shift+down+down'), null, 'shift + navigation keys may be several');
  assert.equal(chordProblem('shift+down+down', 'hold_key'), null);
  assert.match(chordProblem('cmd+a+b'), /more than one key/);
  assert.match(chordProblem('a+b', 'hold_key'), /Hold one key/);
  assert.match(chordProblem('shift+delete+delete'), /more than one key/, 'delete keys are not navigation');
  assert.match(chordProblem('ctrl+alt+shift+cmd+ctrl+alt+shift+cmd+a'), /at most 8/);
  assert.deepEqual(displayChord('Command+Shift+Down'), { modifiers: ['shift', 'cmd'], keys: ['down'], unknown: [], empty: false });
  assert.deepEqual(displayChord('fn+f5'), { modifiers: ['fn'], keys: ['f5'], unknown: [], empty: false });
  assert.deepEqual(displayChord('esc').keys, ['escape']);
  assert.deepEqual(displayChord('cmd+frobnicate').unknown, ['frobnicate']);
});

test('key: the frontmost gate first, then the chord to native with the approved front pid and repeat; the official texts', async () => {
  const { service, native } = svc();
  const one = await service.displayKeyboard('a', { kind: 'key', text: 'Command+S' });
  assert.deepEqual([one.outcome, one.text], ['ok', 'Key pressed.']);
  assert.deepEqual(posted(native, 'hidKey').at(-1), { modifiers: ['cmd'], keys: ['s'], repeat: 1, frontPid: 42, opId: 1 });
  const order = native.calls.slice(-2).map(([m]) => m);
  assert.deepEqual(order, ['frontmostApp', 'hidKey']);
  assert.equal((await service.displayKeyboard('a', { kind: 'key', text: 'down', repeat: 3 })).text, 'Key pressed 3 times.');
  assert.equal(posted(native, 'hidKey').at(-1).repeat, 3);
  assert.equal((await service.displayKeyboard('a', { kind: 'key', text: 'shift+down+down' })).outcome, 'ok');
  const sent = posted(native, 'hidKey').length;
  for (const [args, pattern] of [[{ text: 'down', repeat: 0 }, /positive integer/], [{ text: 'down', repeat: 101 }, /at most 100/], [{ text: 'down', repeat: 2.5 }, /positive integer/],
    [{ text: '' }, /text is required/], [{ text: 'cmd+a+b' }, /more than one key/], [{ text: 'cmd+frobnicate' }, /isn't a key name/], [{ text: '+' }, /names no key/]]) {
    await assert.rejects(service.displayKeyboard('a', { kind: 'key', ...args }), (e) => e.code === 'bad_args' && pattern.test(e.message), JSON.stringify(args));
  }
  assert.equal(posted(native, 'hidKey').length, sent, 'nothing was pressed for bad arguments');
});

test('key: a system shortcut needs systemKeyCombos; tiers and grants of the app in front decide; nothing is pressed when refused', async () => {
  const plain = svc();
  const sys = await plain.service.displayKeyboard('a', { kind: 'key', text: 'cmd+tab' });
  assert.deepEqual([sys.reasonCode, sys.errorKind], ['grant_flag_required', 'grant_flag_required']);
  assert.equal((await plain.service.displayKeyboard('a', { kind: 'hold_key', text: 'cmd+q', duration: 1 })).reasonCode, 'grant_flag_required');
  assert.equal(posted(plain.native, 'hidKey').length + posted(plain.native, 'hidKeyHold').length, 0);
  const flagged = svc({ flags: { systemKeyCombos: true } });
  assert.equal((await flagged.service.displayKeyboard('a', { kind: 'key', text: 'cmd+tab' })).outcome, 'ok');
  const terminal = svc({ front: TERMINAL, grants: [{ bundleId: TERMINAL, displayName: 'Terminal' }] });
  const typed = await terminal.service.displayKeyboard('a', { kind: 'type', text: 'ls' });
  assert.deepEqual([typed.reasonCode, typed.tier], ['tier_insufficient', 'click']);
  assert.match(typed.message, /Bash/);
  assert.equal((await terminal.service.displayKeyboard('a', { kind: 'key', text: 'return' })).reasonCode, 'tier_insufficient');
  assert.equal((await svc({ front: FINDER }).service.displayKeyboard('a', { kind: 'key', text: 'return' })).reasonCode, 'app_not_granted');
  assert.equal((await svc({ front: 'com.openclaude.desktop' }).service.displayKeyboard('a', { kind: 'type', text: 'x' })).reasonCode, 'self_frontmost');
  const unapproved = svc({ approve: false });
  assert.equal((await unapproved.service.displayKeyboard('a', { kind: 'key', text: 'return' })).reasonCode, 'takeover_required');
  assert.equal(posted(terminal.native, 'hidType').length + posted(terminal.native, 'hidKey').length, 0);
});

test('delivery: the user typing is backed off 3 × 200 ms; another app coming forward mid-way stops it with delivery_focus_check_failed', async () => {
  const busy = { outcome: 'unsupported', delivered: false, reasonCode: 'user_actively_typing' };
  const backoff = svc({ refuse: { hidType: [busy, busy] } });
  const typed = await backoff.service.displayKeyboard('a', { kind: 'type', text: 'héllo 👋🏽\n' });
  assert.deepEqual([typed.outcome, typed.text], ['ok', 'Typed 8 grapheme(s).']);
  assert.deepEqual(backoff.waits, [200, 200]);
  assert.deepEqual(posted(backoff.native, 'hidType').at(-1), { text: 'héllo 👋🏽\n', frontPid: 42, opId: 1 });
  assert.deepEqual(posted(backoff.native, 'hidType').map((p) => p.opId), [1, 1, 1], 'every retry is the same operation');
  const stillBusy = svc({ refuse: { hidKey: [busy, busy, busy, busy] } });
  assert.equal((await stillBusy.service.displayKeyboard('a', { kind: 'key', text: 'return' })).reasonCode, 'user_actively_typing');
  assert.equal(posted(stillBusy.native, 'hidKey').length, 4, 'one try and three retries');
  const moved = svc({ refuse: { hidType: [{ outcome: 'unsupported', delivered: true, reasonCode: 'delivery_focus_check_failed', frontmostBundleId: 'com.apple.Safari', typed: 3, total: 9 }] } });
  const cut = await moved.service.displayKeyboard('a', { kind: 'type', text: 'abcdefghi' });
  assert.equal(cut.reasonCode, 'delivery_focus_check_failed');
  assert.match(cut.message, /after 3 of 9 graphemes/);
  assert.match(cut.message, /"com\.apple\.Safari" came to the front/);
  assert.match(cut.message, /NOT sent/);
  assert.equal(posted(moved.native, 'hidType').length, 1, 'a partly delivered text is never replayed');
  await assert.rejects(moved.service.displayKeyboard('a', { kind: 'type', text: 'x'.repeat(10001) }), (e) => e.code === 'bad_args');
});

test('hold_key: seconds → milliseconds, 0–100; an Escape is kept from the emergency stop; a cancel aborts natively', async () => {
  const escapes = [];
  const { service, native } = svc({ escapes });
  const held = await service.displayKeyboard('a', { kind: 'hold_key', text: 'shift', duration: 1.5 });
  assert.deepEqual([held.outcome, held.text], ['ok', 'Key held.']);
  assert.deepEqual(posted(native, 'hidKeyHold').at(-1), { modifiers: ['shift'], keys: [], durationMs: 1500, frontPid: 42, opId: 1 });
  for (const duration of [-1, 101, Number.NaN, '2', undefined]) {
    await assert.rejects(service.displayKeyboard('a', { kind: 'hold_key', text: 'shift', duration }), (e) => e.code === 'bad_args', String(duration));
  }
  assert.deepEqual(escapes, []);
  await service.displayKeyboard('a', { kind: 'key', text: 'escape' });
  assert.deepEqual(escapes, ['off', 'on'], 'the global Esc stop is off while our Escape is sent');
  // Official oPr: each press of a repeat on its own (never the whole repeat), a hold only until the key is down (50 ms),
  // and only a lone Escape — a chord with it isn't what the global shortcut catches.
  escapes.length = 0;
  const repeated = await service.displayKeyboard('a', { kind: 'key', text: 'escape', repeat: 3 });
  assert.deepEqual([repeated.outcome, repeated.text, repeated.pressed], ['ok', 'Key pressed 3 times.', 3]);
  assert.deepEqual(escapes, ['off', 'on', 'off', 'on', 'off', 'on']);
  assert.deepEqual(posted(native, 'hidKey').slice(-3).map((p) => p.repeat), [1, 1, 1]);
  escapes.length = 0;
  await service.displayKeyboard('a', { kind: 'hold_key', text: 'escape', duration: 2 });
  assert.deepEqual(escapes, ['off(50)', 'on']);
  escapes.length = 0;
  await service.displayKeyboard('a', { kind: 'key', text: 'cmd+escape' });
  assert.deepEqual(escapes, [], 'a chord with Escape is not the global shortcut');
  // A cancel while it runs: native hidKeyAbort (the hold lets its keys go itself), reported as aborted.
  const controller = new AbortController();
  const slow = svc();
  const original = slow.native.call;
  slow.native.call = async (method, params) => {
    if (method === 'hidKeyHold') { controller.abort(); await new Promise((r) => setTimeout(r, 5)); return { outcome: 'unsupported', delivered: true, heldMs: 20, released: true, reasonCode: 'aborted' }; }
    return original(method, params);
  };
  const aborted = await slow.service.displayKeyboard('a', { kind: 'hold_key', text: 'right', duration: 30, signal: controller.signal });
  assert.equal(aborted.reasonCode, 'aborted');
  assert.match(aborted.message, /released/);
  assert.equal(slow.native.state.aborts, 1);
  // The display lock going away stops a running hold / type too.
  await slow.service.releaseHeldMouse();
  assert.equal(slow.native.state.aborts, 2);
});

test('a Stop during the user_actively_typing back-off is not lost: nothing more is sent (signal, or the display lock gone), and the native abort names the operation', async () => {
  const busy = { outcome: 'unsupported', delivered: false, reasonCode: 'user_actively_typing' };
  // The tool call is cancelled while it waits to retry: the retry never reaches native.
  const controller = new AbortController();
  const cancelled = svc({ refuse: { hidType: [busy, busy] }, onWait: async () => { controller.abort(); } });
  const typed = await cancelled.service.displayKeyboard('a', { kind: 'type', text: 'a long text', signal: controller.signal });
  assert.equal(typed.reasonCode, 'aborted');
  assert.equal(typed.outcome, 'unsupported');
  assert.equal(posted(cancelled.native, 'hidType').length, 1, 'only the first, refused attempt');
  assert.deepEqual(cancelled.native.state.abortParams, [{ opId: 1 }], 'the native abort is for this operation');
  // The user's Esc / the strip's Stop releases the display lock during the back-off: no retry, aborted, nothing typed.
  let made;
  made = svc({ refuse: { hidKeyHold: [busy, busy] }, onWait: async () => { made.fullControl.releaseAll(); } });
  made.service.acquireDisplayLock('a');
  const held = await made.service.displayKeyboard('a', { kind: 'hold_key', text: 'right', duration: 100 });
  assert.equal(held.reasonCode, 'aborted');
  assert.equal(posted(made.native, 'hidKeyHold').length, 1, 'only the first, refused attempt: the hold never started');
  const lost = svc({ refuse: { hidKey: [busy, busy] } });
  lost.service.acquireDisplayLock('a');
  const pending = lost.service.displayKeyboard('a', { kind: 'key', text: 'return' });
  const result = await pending;
  assert.equal(result.outcome, 'ok', 'without a stop the retries still go through');
  // A Stop that arrives just as native finished still reports aborted (the signal is looked at first).
  const late = new AbortController();
  const finished = svc();
  const original = finished.native.call;
  finished.native.call = async (method, params) => { const answer = await original(method, params); if (method === 'hidType') late.abort(); return answer; };
  const done = await finished.service.displayKeyboard('a', { kind: 'type', text: 'abc', signal: late.signal });
  assert.equal(done.reasonCode, 'aborted');
});

test('the keyboard tools: takeover first, the official texts, refusals in the one shape', async () => {
  const { call, takeovers, native, fullControl } = tools();
  assert.equal((await call('key', { text: 'cmd+s' })).content[0].text, 'Key pressed.');
  assert.equal(takeovers.length, 1, 'the first screen-wide action asked with the take-over card');
  assert.equal(fullControl.holder(), 'a');
  assert.equal((await call('type', { text: 'hi' })).content[0].text, 'Typed 2 grapheme(s).');
  assert.equal((await call('hold_key', { text: 'shift', duration: 0 })).content[0].text, 'Key held.');
  const refused = await call('key', { text: 'cmd+q' });
  assert.equal(refused.isError, true);
  const shape = body(refused);
  for (const key of ['ok', 'outcome', 'reasonCode', 'message', 'next_step']) assert.ok(Object.hasOwn(shape, key), key);
  assert.deepEqual([shape.ok, shape.outcome, shape.reasonCode], [false, 'unsupported', 'grant_flag_required']);
  assert.match(shape.next_step, /systemKeyCombos/);
  const badArgs = body(await call('key', { text: 'a+b' }));
  assert.equal(badArgs.reasonCode, 'bad_args');
  assert.equal(posted(native, 'hidKey').length, 1);
  const declined = tools({ answer: 'decline' });
  assert.equal(body(await declined.call('type', { text: 'x' })).reasonCode, 'takeover_declined');
  assert.equal(posted(declined.native, 'hidType').length, 0);
});

test('open_application (official xi() / ua()): granted apps only; background mode never takes the screen; app windows held → in the background; full control → in front', async () => {
  // Background preference, nobody holds the screen, the app has a reachable window: the app_* tools, no takeover.
  const reachable = tools({ windows: { [TEXTEDIT]: [{ window_id: 9, is_minimized: false, is_hidden: false, is_off_space: false }] } });
  const r1 = await reachable.call('open_application', { app: 'textedit' });
  assert.match(r1.content[0].text, /^TextEdit is already running with a window you can reach\. .*asks the user to approve taking over the screen/);
  assert.equal(reachable.takeovers.length, 0);
  assert.equal(reachable.fullControl.holder(), null);
  assert.deepEqual(reachable.native.state.opened, []);
  // Not running: launched in the background, with its first window.
  const launched = tools({ windows: {} });
  let listCalls = 0;
  const list = launched.native.call;
  launched.native.call = async (method, params) => (method === 'listWindows' && ++listCalls > 1 ? { windows: [{ window_id: 31, is_auxiliary: false }] } : list(method, params));
  const r2 = await launched.call('open_application', { app: TEXTEDIT });
  assert.equal(r2.content[0].text, 'Launched TextEdit in the background — window_id 31 is ready for the app_* tools.');
  assert.deepEqual(launched.native.state.opened, [{ bundleId: TEXTEDIT, activates: false }]);
  // Minimized / off-Space windows: how to bring them back.
  const parked = tools({ windows: { [TEXTEDIT]: [{ window_id: 9, is_minimized: true, is_hidden: false, is_off_space: false }] } });
  assert.match((await parked.call('open_application', { app: 'TextEdit' })).content[0].text, /window is minimized\). To act on it, call app_bring_to_current_space/);
  const away = tools({ windows: { [TEXTEDIT]: [{ window_id: 9, is_minimized: false, is_hidden: false, is_off_space: true }] } });
  assert.match((await away.call('open_application', { app: 'TextEdit' })).content[0].text, /running on another Space/);
  // Not granted.
  const notGranted = body(await reachable.call('open_application', { app: 'Safari' }));
  assert.deepEqual([notGranted.reasonCode, notGranted.ok], ['app_not_granted', false]);
  assert.match(notGranted.message, /"Safari" isn't granted/);
  // Full control preferred: takes the screen and brings it to the front, with the other-monitor note on two displays.
  const front = tools({ displays: [MAIN, SIDE] });
  front.fullControl.setPreferredMode('full_control');
  const r3 = await front.call('open_application', { app: 'TextEdit' });
  assert.equal(r3.content[0].text, 'Opened "TextEdit". If the next screenshot doesn\'t show it, it may have opened on another monitor — check with switch_display.');
  assert.deepEqual(front.native.state.opened, [{ bundleId: TEXTEDIT, activates: true }]);
  assert.equal(front.fullControl.holder(), 'a');
  // Nothing granted at all.
  const empty = tools({ grants: [] });
  assert.equal(body(await empty.call('open_application', { app: 'TextEdit' })).reasonCode, 'allowlist_empty');
});

test('open_application while this session holds app windows: opened in the background, the user\'s front app undisturbed', async () => {
  const made = tools({ windows: { [TEXTEDIT]: [{ window_id: 9 }] } });
  const realLock = made.service.appLockBundles;
  made.service.appLockBundles = (id) => (id === 'a' ? [TEXTEDIT] : realLock(id));
  const result = await made.call('open_application', { app: 'TextEdit' });
  assert.equal(result.content[0].text, 'Opened "TextEdit" in the background (window_id 9) — the app in front wasn\'t disturbed. Act on it with app_list_windows or app_screenshot.');
  assert.deepEqual(made.native.state.opened, [{ bundleId: TEXTEDIT, activates: false }]);
  assert.equal(made.takeovers.length, 0);
});

test('switch_display (official Si() / si()): labels by name, "display <id>" without one, repeats numbered; "auto"; one monitor → bad_args', async () => {
  const labels = displayLabels([{ displayId: 9, name: 'DELL' }, { displayId: 2, name: 'DELL' }, { displayId: 4, name: null }]);
  assert.deepEqual([...labels.entries()], [[2, 'DELL'], [4, 'display 4'], [9, 'DELL (2)']]);
  const two = tools({ displays: [MAIN, SIDE] });
  assert.equal((await two.call('switch_display', { display: 'dell u2720q' })).content[0].text, 'Switched to monitor "DELL U2720Q". Call screenshot to see it.');
  assert.equal(two.service.selectedDisplay('a'), 5);
  assert.equal(two.takeovers.length, 0, 'switching takes nothing over');
  const unknown = body(await two.call('switch_display', { display: 'LG' }));
  assert.equal(unknown.reasonCode, 'bad_args');
  assert.match(unknown.message, /Available monitors: "Built-in Retina Display", "DELL U2720Q"/);
  assert.equal((await two.call('switch_display', { display: 'Auto' })).content[0].text, 'Returned to automatic monitor selection. Call screenshot to continue.');
  const one = tools();
  assert.match(body(await one.call('switch_display', { display: 'x' })).message, /Only one monitor is connected/);
  // The screenshot note names the monitor the way switch_display takes it.
  const shot = await two.call('screenshot', {});
  assert.equal(shot.content[0].text, 'This screenshot was taken on monitor "Built-in Retina Display". Other attached monitors: "DELL U2720Q". Use switch_display to capture a different monitor.');
});

test('wait (official ji()): seconds, no takeover, needs a grant; a cancel ends it as aborted', async () => {
  const { call, takeovers } = tools();
  assert.equal((await call('wait', { duration: 0.02 })).content[0].text, 'Waited 0.02s.');
  assert.equal(takeovers.length, 0);
  assert.equal(body(await call('wait', { duration: 101 })).reasonCode, 'bad_args');
  assert.equal(body(await tools({ grants: [] }).call('wait', { duration: 0 })).reasonCode, 'allowlist_empty');
  const controller = new AbortController();
  const made = svc();
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-keys-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service: made.service, askTakeover: async () => 'accept' }));
  setTimeout(() => controller.abort(), 30);
  const result = await host.call('a', { name: 'wait', arguments: { duration: 5 } }, controller.signal);
  assert.equal(JSON.parse(result.content[0].text).reasonCode, 'aborted');
});

test('computer_batch (official Zi()): one takeover, the actions in order with the official pauses, "[i/N] action: …" lines; the last screenshot becomes the reference', async () => {
  const { call, takeovers, native, service } = tools();
  const started = Date.now();
  const result = await call('computer_batch', { actions: [{ action: 'screenshot', scale: 0.5 }, { action: 'left_click', coordinate: [100, 100] },
    { action: 'type', text: 'hi' }, { action: 'key', text: 'return' }, { action: 'cursor_position' }, { action: 'wait', duration: 0 }] });
  assert.equal(result.isError, undefined);
  assert.equal(takeovers.length, 1);
  const lines = texts(result);
  assert.equal(lines[0], '[1/6] screenshot: 0.5-scale view; coordinate frame: 1372x892.');
  assert.equal(result.content[1].type, 'image', 'the picture follows its line');
  assert.deepEqual(lines.slice(1, 4), ['[2/6] left_click: Clicked.', '[3/6] type: Typed 2 grapheme(s).', '[4/6] key: Key pressed.']);
  assert.match(lines[4], /^\[5\/6\] cursor_position: \{/);
  assert.equal(lines[5], '[6/6] wait: Waited 0s.');
  // 10 + 150 (left_click) + 10 + 10 + 10 + 10 ms at least.
  assert.ok(Date.now() - started >= 200, 'the official pauses between actions');
  // The click inside the batch used the reference from before the batch (none: the x / scaleFactor fallback) …
  assert.deepEqual(posted(native, 'hidClick').at(-1).point, { x: 50, y: 50 });
  // … and the batch's screenshot is the reference afterwards.
  await call('left_click', { coordinate: [686, 446] });
  assert.deepEqual(posted(native, 'hidClick').at(-1).point, { x: 735, y: 478 });
  assert.equal(service.selectedDisplay('a'), 1);
});

test('computer_batch: the first failure stops it, a held button is let go, pictures are omitted, and the stop is one refusal; bad actions are bad_args', async () => {
  const { call, native } = tools();
  const result = await call('computer_batch', { actions: [{ action: 'screenshot' }, { action: 'left_mouse_down' }, { action: 'key', text: 'cmd+q' },
    { action: 'type', text: 'never' }] });
  assert.equal(result.isError, true);
  const lines = texts(result);
  assert.equal(lines[0], '[1/4] screenshot: ok [Image omitted due to error]');
  assert.equal(lines[1], '[2/4] left_mouse_down: Mouse button pressed.');
  assert.match(lines[2], /^\[3\/4\] key: FAILED — \{/);
  assert.equal(result.content.filter((part) => part.type === 'image').length, 0);
  const stop = body(result);
  assert.deepEqual([stop.ok, stop.outcome, stop.reasonCode, stop.stoppedAt, stop.completed, stop.remaining], [false, 'unsupported', 'grant_flag_required', 2, 2, 1]);
  assert.equal(stop.message, 'Batch stopped at actions[2] (key). 2 completed, 1 remaining.');
  assert.ok(stop.next_step);
  assert.equal(native.state.held, false, 'the button held by left_mouse_down was let go');
  assert.equal(posted(native, 'hidType').length, 0, 'nothing after the failure ran');
  for (const actions of [[], [{ action: 'open_application', app: 'TextEdit' }], [{ action: 7 }], ['x']]) {
    const bad = body(await call('computer_batch', { actions }));
    assert.equal(bad.reasonCode, 'bad_args', JSON.stringify(actions));
  }
});

test('computer_batch of waits only takes nothing over (official Ar()); a cancel between actions stops it as aborted', async () => {
  const { call, takeovers, fullControl } = tools();
  const result = await call('computer_batch', { actions: [{ action: 'wait', duration: 0 }, { action: 'wait', duration: 0 }] });
  assert.deepEqual(texts(result), ['[1/2] wait: Waited 0s.', '[2/2] wait: Waited 0s.']);
  assert.equal(takeovers.length, 0);
  assert.equal(fullControl.holder(), null);
  const made = svc();
  const host = createAgentToolsHost({ tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'cu-keys-')), logger: { warn() {}, log() {} }, modules: [cu],
    isGroupEnabled: () => true, resolveSession: (id) => (id ? { id, cwd: '/work' } : null) });
  host.provide('computerUse', () => ({ service: made.service, askTakeover: async () => 'accept' }));
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 40);
  const aborted = await host.call('a', { name: 'computer_batch', arguments: { actions: [{ action: 'wait', duration: 0.01 }, { action: 'left_mouse_down' }, { action: 'wait', duration: 5 }, { action: 'key', text: 'a' }] } }, controller.signal);
  const shape = JSON.parse(aborted.content.at(-1).text);
  assert.equal(shape.reasonCode, 'aborted');
  assert.equal(made.native.state.held, false, 'the held button was let go');
  assert.equal(posted(made.native, 'hidKey').length, 0);
});
