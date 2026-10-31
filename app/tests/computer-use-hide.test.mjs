// hideBeforeAction (official sub-gate, on by default; spec §1.4.5): before a full-screen screenshot or action the apps
// outside the session's allowlist with a window on the selected display are hidden (native prepareDisplay), once per
// computer_batch / teach step; the next screenshot says which; the turn's end, a stop or a dropped connection brings
// them back unless Settings › "Unhide apps when Claude finishes" is off; release_full_control does not (official Bn()).
// The access / teach cards say so (willHide). A fake native answers; nothing is hidden or posted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');
const { computerUseAccessRequest, computerUseTeachRequest, computerUseHideNote } = await import('../src/computer-use-model.mjs');

const TEXTEDIT = 'com.apple.TextEdit', SELF = 'dev.openclaude.desktop';
const DISPLAY = { displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, scaleFactor: 2, isMain: true, name: 'Main' };

function fakeNative({ hide = () => [{ bundleId: 'com.tencent.xinWeChat', name: 'WeChat' }], noHide = false } = {}) {
  const calls = [];
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params]);
      switch (method) {
        case 'prepareDisplay': if (noHide) throw Object.assign(new Error('Unknown method prepareDisplay.'), { code: 'unknown_method' }); return { hidden: hide(params), activated: null };
        case 'previewHideSet': return { apps: [{ bundleId: 'com.tencent.xinWeChat', name: 'WeChat' }] };
        case 'unhideApps': return { unhidden: params.bundleIds };
        case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 999 };
        case 'listDisplays': return { displays: [DISPLAY] };
        case 'frontmostApp': return { pid: 10, bundleId: TEXTEDIT };
        case 'cursorPosition': return { x: 5, y: 5 };
        case 'pointOwner': return { owner: { windowId: 50, pid: 10, bundleId: TEXTEDIT, layer: 0, ownerName: 'TextEdit' } };
        case 'captureScreen': {
          const [width, height] = scaled(fit(2940, 1912), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,U0NSRUVO', width, height, frameWidth: 2940, frameHeight: 1912, scaleFactor: 2, displayId: 1,
            displayWidth: 1470, displayHeight: 956, displayBounds: DISPLAY.bounds, region: null, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
        }
        case 'hidMove': return { outcome: 'ok', delivered: true, to: params.point };
        case 'hidClick': return { outcome: 'ok', delivered: true, clicksDelivered: params.count };
        case 'hidKey': return { outcome: 'ok', delivered: true, pressed: 1 };
        case 'hidMouseUp': return { outcome: 'ok', delivered: false, wasHeld: false };
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
}
function setup({ subGates = {}, ...nativeOptions } = {}) {
  const native = fakeNative(nativeOptions);
  const fullControl = createFullControl();
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {}, info() {} }, wait: async () => {}, fullControl,
    selfBundleIds: [SELF], subGates });
  service.grantsFor('a').grant([{ bundleId: TEXTEDIT, displayName: 'TextEdit' }, { bundleId: 'com.apple.Safari', displayName: 'Safari' }]);
  service.requestFullControl('a', { approved: true });
  return { service, native, fullControl };
}
const sent = (native, method) => native.calls.filter(([m]) => m === method).map(([, p]) => p);

test('prepareForAction: the allowlist (every tier), this app as the host, the selected display; what was hidden is remembered', async () => {
  const { service, native } = setup();
  assert.deepEqual(await service.prepareForAction('a'), ['com.tencent.xinWeChat']);
  assert.deepEqual(sent(native, 'prepareDisplay')[0], { allowedBundleIds: [TEXTEDIT, 'com.apple.Safari'], hostBundleIds: [SELF] });
  await service.displayScreenshot('a', { hide: false });
  await service.prepareForAction('a');
  assert.equal(sent(native, 'prepareDisplay').at(-1).displayId, 1, 'after a screenshot: its display');
  assert.deepEqual(service.sessionsWithHiddenApps(), ['a']);
});

test('the screen-wide actions hide first (official V() / ui()), the screenshot names what was hidden once', async () => {
  const { service, native } = setup();
  const shot = await service.displayScreenshot('a', {});
  assert.equal(native.calls.findIndex(([m]) => m === 'prepareDisplay') < native.calls.findIndex(([m]) => m === 'captureScreen'), true);
  assert.equal(shot.hiddenNote, '"WeChat" was open and got hidden before this screenshot (not in the session allowlist). If a previous action was meant to open it, that\'s why you don\'t see it — call request_access to add it.');
  const again = await service.displayScreenshot('a', { hide: false });
  assert.equal(again.hiddenNote, undefined, 'said once');
  // An action hides first (before the frontmost app is read); the next screenshot reports it.
  native.calls.length = 0;
  await service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100] });
  assert.deepEqual(native.calls.slice(0, 2).map(([m]) => m), ['prepareDisplay', 'listDisplays']);
  await service.displayKeyboard('a', { kind: 'key', text: 'a' });
  const keyCalls = native.calls.map(([m]) => m);
  assert.ok(keyCalls.lastIndexOf('prepareDisplay') < keyCalls.lastIndexOf('frontmostApp'));
  const note = (await service.displayScreenshot('a', { hide: false })).hiddenNote;
  assert.match(note, /^"WeChat" was open and got hidden/);
  // hide: false (inside a batch / teach step): nothing is hidden by the action itself.
  native.calls.length = 0;
  await service.displayPointer('a', { kind: 'left_click', coordinate: [100, 100], hide: false });
  assert.equal(sent(native, 'prepareDisplay').length, 0);
});

test('a hidden app without a name: the official second sentence; two apps: plural', async () => {
  const { service } = setup({ hide: () => [{ bundleId: 'com.example.helper', name: null }, { bundleId: 'org.example.Foo', name: 'Foo' }, { bundleId: 'com.example.Bar', name: 'Bar‮' }] });
  const note = (await service.displayScreenshot('a', {})).hiddenNote;
  assert.match(note, /^"Foo", "Bar" were open and got hidden before this screenshot/);
  assert.match(note, /call request_access to add them\. "helper" was also hidden\. This process owns the visible window but isn't in the installed-apps list/);
});

test('the turn ends: the hidden apps come back (autoUnhide), or stay hidden when it is off; the record is cleared either way', async () => {
  const { service, native } = setup();
  await service.prepareForAction('a');
  assert.deepEqual(await service.restoreHiddenApps('a'), ['com.tencent.xinWeChat']);
  assert.deepEqual(sent(native, 'unhideApps'), [{ bundleIds: ['com.tencent.xinWeChat'] }]);
  assert.deepEqual(await service.restoreHiddenApps('a'), [], 'nothing left');
  await service.prepareForAction('a');
  assert.deepEqual(await service.restoreHiddenApps('a', { autoUnhide: false }), []);
  assert.equal(sent(native, 'unhideApps').length, 1);
  assert.deepEqual(service.sessionsWithHiddenApps(), []);
  // release_full_control does not unhide (official Bn(): the lock and the approval only).
  await service.prepareForAction('a');
  service.releaseFullControl('a');
  assert.equal(sent(native, 'unhideApps').length, 1);
  assert.deepEqual(service.sessionsWithHiddenApps(), ['a']);
});

test('the sub-gate off, or a native module without prepareDisplay: nothing hidden, nothing asked again', async () => {
  const off = setup({ subGates: { hideBeforeAction: false } });
  await off.service.displayScreenshot('a', {});
  assert.equal(sent(off.native, 'prepareDisplay').length, 0);
  assert.deepEqual(await off.service.previewHideSet('a'), []);
  const old = setup({ noHide: true });
  await old.service.displayScreenshot('a', {});
  await old.service.displayScreenshot('a', {});
  assert.equal(sent(old.native, 'prepareDisplay').length, 1);
});

test('previewHideSet: the allowlist, the requested apps and this app are exempt (the access card\'s willHide)', async () => {
  const { service, native } = setup();
  assert.deepEqual(await service.previewHideSet('a', ['com.apple.Notes']), [{ bundleId: 'com.tencent.xinWeChat', displayName: 'WeChat' }]);
  assert.deepEqual(sent(native, 'previewHideSet')[0], { exemptBundleIds: [TEXTEDIT, 'com.apple.Safari', 'com.apple.Notes', SELF] });
});

function toolCtx(service, extra = {}) {
  const cards = [];
  return { cards, ctx: { sessionId: 'a', computerUse: { service, resolveApps: async (names) => names.map((name) => ({ requested: name, bundleId: `com.apple.${name}`, displayName: name, installed: true })),
    ask: async (access) => { cards.push(access); return 'accept'; }, askTakeover: async () => 'accept', autoUnhideEnabled: () => extra.autoUnhide !== false, toolsChanged() {}, ...extra } } };
}
const call = (name, args, ctx) => cu.tools.find((tool) => tool.name === name).handler(args, ctx);

test('computer_batch hides once before its first action, none of its actions hides again (official Zi()); a batch of waits doesn\'t', async () => {
  const { service, native } = setup();
  const { ctx } = toolCtx(service);
  const result = await call('computer_batch', { actions: [{ action: 'left_click', coordinate: [10, 10] }, { action: 'key', text: 'a' }, { action: 'screenshot' }] }, ctx);
  assert.equal(result.isError, undefined, JSON.stringify(result));
  assert.equal(sent(native, 'prepareDisplay').length, 1);
  assert.ok(native.calls.findIndex(([m]) => m === 'prepareDisplay') < native.calls.findIndex(([m]) => m === 'hidClick'));
  assert.match(result.content.find((part) => part.type === 'text' && part.text.startsWith('[3/3]')).text, /"WeChat" was open and got hidden/, 'the batch\'s screenshot names it');
  await call('computer_batch', { actions: [{ action: 'wait', duration: 0 }] }, ctx);
  assert.equal(sent(native, 'prepareDisplay').length, 1);
  // A single screenshot tool call hides itself.
  const shot = await call('screenshot', {}, ctx);
  assert.equal(sent(native, 'prepareDisplay').length, 2);
  assert.equal(shot.content[0].type, 'text');
});

test('request_access: the card gets willHide and autoUnhideEnabled, and the Background line unless full control is approved', async () => {
  const { service } = setup();
  service.grantsFor('b');
  const { ctx, cards } = toolCtx(service, { autoUnhide: false });
  await call('request_access', { apps: ['Notes'], reason: 'notes' }, { ...ctx, sessionId: 'b' });
  assert.deepEqual(cards[0].willHide, [{ bundleId: 'com.tencent.xinWeChat', displayName: 'WeChat' }]);
  assert.equal(cards[0].autoUnhideEnabled, false);
  assert.equal(cards[0].preferredModeDefault, 'background');
  await call('request_access', { apps: ['Maps'], reason: 'maps' }, ctx);
  assert.equal(cards[1].preferredModeDefault, undefined, 'session a has full-screen approval');
});

test('the cards\' footnote (official c96d752d0 / ca31fdde5): Background line first, else the hiding line', () => {
  const meta = (access) => ({ _meta: { codex_approval_kind: 'mcp_tool_call', computer_use_access: { reason: 'r', flags: {}, apps: [], ...access } } });
  assert.deepEqual(computerUseAccessRequest(meta({ preferredModeDefault: 'background', willHide: [{ bundleId: 'x' }] }), null).note, { kind: 'background' });
  assert.deepEqual(computerUseAccessRequest(meta({ willHide: [{ bundleId: 'x' }], autoUnhideEnabled: true }), null).note, { kind: 'hide', autoUnhide: true });
  assert.deepEqual(computerUseAccessRequest(meta({ willHide: [{ bundleId: 'x' }], autoUnhideEnabled: false }), null).note, { kind: 'hide', autoUnhide: false });
  assert.equal(computerUseAccessRequest(meta({}), null).note, null);
  assert.equal(computerUseHideNote({ willHide: [] }), null);
  const teach = computerUseTeachRequest({ _meta: { codex_approval_kind: 'mcp_tool_call', computer_use_teach: { reason: 'r', apps: [], willHide: [{ bundleId: 'x' }], autoUnhideEnabled: true } } });
  assert.deepEqual(teach.hide, { kind: 'hide', autoUnhide: true });
});

test('main.cjs: the turn\'s end, a stop and a dropped connection restore the hidden apps; Settings saves computerUseAutoUnhide', () => {
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const turnEnd = main.slice(main.indexOf('if (e.method === "turn/completed" && typeof e.params?.threadId === "string") {'));
  assert.match(turnEnd.slice(0, 1500), /computerUse\.restoreHiddenApps\?\.\(e\.params\.threadId, \{ autoUnhide: config\?\.computerUseAutoUnhide !== false \}\)/);
  assert.match(turnEnd.slice(0, 2000), /sessionsWithHiddenApps/);
  const stop = main.slice(main.indexOf('function computerUseStopSession('), main.indexOf('function computerUseEmergencyStop('));
  assert.match(stop, /restoreHiddenApps\?\.\(threadId/);
  assert.match(main, /if \(typeof p\.computerUseAutoUnhide === "boolean"\) config\.computerUseAutoUnhide = p\.computerUseAutoUnhide;/);
  assert.match(main, /autoUnhideEnabled: \(\) => config\?\.computerUseAutoUnhide !== false/);
});

test('teach_step hides once after Next, before the step\'s actions (official ti()); a step without actions hides nothing itself', async () => {
  const { service, native } = setup();
  const teach = { isActive: () => true, showStep: async () => ({ action: 'next' }), working() {}, beforeAction() {}, afterAction() {}, cancelStep() {} };
  const { ctx } = toolCtx(service, { teach });
  const result = await call('teach_step', { explanation: 'Click it', next_preview: '', actions: [{ action: 'left_click', coordinate: [10, 10] }, { action: 'left_click', coordinate: [20, 20] }] }, ctx);
  assert.equal(result.isError, undefined, JSON.stringify(result));
  const methods = native.calls.map(([m]) => m);
  assert.equal(methods.slice(0, methods.indexOf('hidClick')).filter((m) => m === 'prepareDisplay').length, 1, 'once before the actions');
  assert.equal(methods.filter((m) => m === 'hidClick').length, 2);
  native.calls.length = 0;
  await call('teach_step', { explanation: 'Look', next_preview: '', actions: [] }, ctx);
  assert.equal(sent(native, 'prepareDisplay').length, 0);
});
