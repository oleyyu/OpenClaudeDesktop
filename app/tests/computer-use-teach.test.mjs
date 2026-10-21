// Teach mode (docs/computer-use-official-spec-20261021.md §1.3, §2.1–2.3): the overlay page is the 2.42304.0 original,
// the overlay window (teach.cjs createTeachOverlay) and the session side (createTeachMode), the preload's CuTeach, and
// request_teach_access / teach_step / teach_batch in agent-tools/computer-use.mjs against a fake native (nothing is
// posted). The card is tests/computer-use-teach-card.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { TEACH_PAGE } = require('../electron/computer-use/teach-page.cjs');
const { createTeachOverlay, createTeachMode, HIDE_MS, PRELOAD } = require('../electron/computer-use/teach.cjs');
const { createComputerUse } = require('../electron/computer-use/service.cjs');
const { createFullControl } = require('../electron/computer-use/full-control.cjs');
const { fit, scaled } = require('../electron/computer-use/budget.cjs');
const { isNonTeachAction, computerUseAction } = await import('../electron/computer-use/actions.mjs');
const cu = await import('../electron/agent-tools/computer-use.mjs');

const REFERENCE = new URL('../../reference/installed-2.42304.0-20261017/asar/.vite/build/', import.meta.url);

test('the overlay page is the 2.42304.0 original rFa(), character for character (logo nFa, Spinner master16 tFa)', () => {
  const chunk = fs.readFileSync(new URL('index.chunk-muI2IV6k.js', REFERENCE), 'utf8');
  const start = chunk.indexOf('function rFa(){return`') + 'function rFa(){return`'.length;
  const raw = chunk.slice(start, chunk.indexOf('`}var iFa=320', start));
  const logo = /nFa="([^"]+)"/.exec(chunk)[1];
  const spinner = /tFa=\{name:"Spinner",master16:\[\{d:"([^"]+)"\}\]/.exec(chunk)[1];
  const original = new Function('nFa', 'tFa', `return \`${raw}\`;`)(logo, `<path d="${spinner}" vector-effect="non-scaling-stroke" />`);
  assert.equal(TEACH_PAGE, original);
  assert.match(TEACH_PAGE, /<title>Teaching<\/title>/);
  assert.match(TEACH_PAGE, /window\["claude\.internal\.computerUse"\]\.CuTeach/);
  // iFa = 320: the window hides 320 ms after the page's fade-out starts.
  assert.equal(HIDE_MS, Number(/var iFa=(\d+)/.exec(chunk)[1]));
});

test('the preload exposes CuTeach as the original computerUseTeach.js: four methods, four events, top frame only', () => {
  const official = fs.readFileSync(new URL('computerUseTeach.js', REFERENCE), 'utf8');
  for (const name of ['next', 'exit', 'mouseEnter', 'mouseLeave']) assert.match(official, new RegExp(`${name}\\(\\)\\{return e\\.ipcRenderer\\.invoke\\(n\\+"CuTeach_\\$_${name}"`));
  const exposed = {}, invoked = [], listeners = new Map();
  const electron = {
    contextBridge: { exposeInMainWorld: (key, value) => { exposed[key] = value; } },
    ipcRenderer: { invoke: (channel) => { invoked.push(channel); return Promise.resolve(); }, on: (channel, fn) => listeners.set(channel, fn), removeListener: (channel) => listeners.delete(channel) },
    webFrame: { routingId: 1, top: { routingId: 1 } },
  };
  vm.runInNewContext(fs.readFileSync(PRELOAD, 'utf8'), { require: (name) => { assert.equal(name, 'electron'); return electron; } });
  const api = exposed['claude.internal.computerUse'].CuTeach;
  assert.deepEqual(Object.keys(api), ['next', 'exit', 'mouseEnter', 'mouseLeave', 'onShow', 'onWorking', 'onHide', 'onReassertHover']);
  api.next(); api.exit(); api.mouseEnter(); api.mouseLeave();
  assert.deepEqual(invoked, ['cu-teach:next', 'cu-teach:exit', 'cu-teach:mouseEnter', 'cu-teach:mouseLeave']);
  const shown = [];
  const off = api.onShow((payload) => shown.push(payload));
  listeners.get('cu-teach:show')({}, { explanation: 'x' });
  assert.deepEqual(shown, [{ explanation: 'x' }]);
  off();
  assert.equal(listeners.has('cu-teach:show'), false);
  // A subframe gets nothing.
  const nested = { ...electron, webFrame: { routingId: 2, top: { routingId: 1 } } };
  const none = {};
  vm.runInNewContext(fs.readFileSync(PRELOAD, 'utf8'), { require: () => ({ ...nested, contextBridge: { exposeInMainWorld: (key, value) => { none[key] = value; } } }) });
  assert.deepEqual(none, {});
});

function overlayFakes({ loadFails = false } = {}) {
  const windows = [], timers = [], handlers = new Map();
  const displays = [{ id: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, workArea: { x: 0, y: 32, width: 1470, height: 900 } },
    { id: 2, bounds: { x: 1470, y: 0, width: 1920, height: 1080 }, workArea: { x: 1470, y: 25, width: 1920, height: 1055 } }];
  class BrowserWindow {
    constructor(options) {
      Object.assign(this, { options, destroyed: false, visible: false, bounds: { x: options.x, y: options.y, width: options.width, height: options.height }, calls: [], sent: [], handlers: {} });
      this.webContents = { send: (channel, payload) => this.sent.push([channel, payload]) };
      windows.push(this);
    }
    setAlwaysOnTop(...args) { this.calls.push(['setAlwaysOnTop', ...args]); }
    setFullScreenable(...args) { this.calls.push(['setFullScreenable', ...args]); }
    setIgnoreMouseEvents(...args) { this.calls.push(['setIgnoreMouseEvents', ...args]); }
    setHiddenInMissionControl(...args) { this.calls.push(['setHiddenInMissionControl', ...args]); }
    on(name, handler) { this.handlers[name] = handler; }
    loadFile(file) { this.file = file; return loadFails ? Promise.reject(new Error('load failed')) : Promise.resolve(); }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; this.handlers.closed?.(); }
    setBounds(bounds) { this.bounds = bounds; }
    isVisible() { return this.visible; }
    showInactive() { this.visible = true; }
    hide() { this.visible = false; }
  }
  const written = new Map();
  const events = { next: 0, exit: 0 };
  const overlay = createTeachOverlay({
    BrowserWindow, platform: 'darwin', log: {}, now: () => 42,
    screen: { getAllDisplays: () => displays, getPrimaryDisplay: () => displays[0] },
    ipcMain: { handle: (channel, fn) => handlers.set(channel, fn), removeHandler: (channel) => handlers.delete(channel) },
    app: { dock: { visible: true, isVisible() { return this.visible; }, show() { this.visible = true; } } },
    fs: { writeFile: async (file, text) => { written.set(file, text); }, unlink: async (file) => { written.delete(file); } },
    tmpdir: () => '/tmp/x',
    setTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    clearTimer: (timer) => { timer.cleared = true; },
    onNext: () => { events.next += 1; }, onExit: () => { events.exit += 1; },
  });
  const fire = () => { for (const timer of timers.splice(0)) if (!timer.cleared) timer.fn(); };
  return { overlay, windows, timers, written, fire, handlers, events, displays };
}

test('the overlay window (official hFa): a transparent click-through panel over the display work area, never focused', async () => {
  const { overlay, windows, written } = overlayFakes();
  overlay.step({ explanation: 'First', nextPreview: 'Next: click', anchorLogical: { x: 300, y: 232 } });
  await overlay.show();
  const [window] = windows;
  assert.equal(windows.length, 1);
  assert.deepEqual(window.options, { x: 0, y: 32, width: 1470, height: 900, transparent: true, frame: false, hasShadow: false, alwaysOnTop: true,
    skipTaskbar: true, focusable: false, acceptFirstMouse: true, movable: false, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, type: 'panel', show: false, backgroundColor: '#00000000',
    webPreferences: { preload: PRELOAD, sandbox: true, nodeIntegration: false, contextIsolation: true } });
  assert.deepEqual(window.calls.slice(0, 4), [['setAlwaysOnTop', true, 'screen-saver'], ['setFullScreenable', false], ['setIgnoreMouseEvents', true, { forward: true }], ['setHiddenInMissionControl', true]]);
  assert.equal(window.file, '/tmp/x/cu-teach-42.html');
  assert.equal(written.get('/tmp/x/cu-teach-42.html'), TEACH_PAGE);
  assert.equal(window.visible, true, 'shown inactive');
  // The step waiting for the window is dispatched once it is up, its anchor in the window's own CSS pixels.
  assert.deepEqual(window.sent, [['cu-teach:show', { explanation: 'First', nextPreview: 'Next: click', anchorLogical: { x: 300, y: 200 } }]]);
  overlay.step({ explanation: 'Second', nextPreview: '' });
  assert.deepEqual(window.sent.at(-1), ['cu-teach:show', { explanation: 'Second', nextPreview: '', anchorLogical: undefined }]);
  overlay.working();
  assert.deepEqual(window.sent.at(-1), ['cu-teach:working', undefined]);
  overlay.afterAction();
  assert.deepEqual(window.sent.at(-1), ['cu-teach:reassertHover', undefined]);
  assert.deepEqual(window.calls.at(-1), ['setIgnoreMouseEvents', true, { forward: true }]);
  overlay.setDisplay(2);
  assert.deepEqual(window.bounds, { x: 1470, y: 25, width: 1920, height: 1055 });
});

test('the overlay: hide fades the page then hides HIDE_MS later; a show meanwhile cancels it; IPC answers only the overlay page', async () => {
  const { overlay, windows, fire, timers, handlers, events } = overlayFakes();
  await overlay.show();
  const [window] = windows;
  overlay.hide();
  assert.deepEqual(window.sent.at(-1), ['cu-teach:hide', undefined]);
  assert.equal(timers[0].ms, HIDE_MS);
  fire();
  assert.equal(window.visible, false);
  await overlay.show();
  overlay.hide();
  await overlay.show();
  fire();
  assert.equal(window.visible, true, 'the later show cancelled the hide');
  // The page's methods: only from the overlay's own web contents and top frame.
  handlers.get('cu-teach:next')({ sender: window.webContents, senderFrame: { parent: null } });
  handlers.get('cu-teach:exit')({ sender: {}, senderFrame: { parent: null } });
  handlers.get('cu-teach:next')({ sender: window.webContents, senderFrame: { parent: {} } });
  assert.deepEqual(events, { next: 1, exit: 0 });
  handlers.get('cu-teach:mouseEnter')({ sender: window.webContents, senderFrame: { parent: null } });
  assert.deepEqual(window.calls.at(-1), ['setIgnoreMouseEvents', false]);
  handlers.get('cu-teach:mouseLeave')({ sender: window.webContents, senderFrame: { parent: null } });
  assert.deepEqual(window.calls.at(-1), ['setIgnoreMouseEvents', true, { forward: true }]);
  overlay.fadeTooltip();
  assert.deepEqual(window.sent.at(-1), ['cu-teach:hide', undefined]);
  assert.equal(window.visible, true, 'only the tooltip fades');
  overlay.dispose();
  assert.equal(handlers.size, 0);
});

/** A fake overlay for the session side. */
function fakeOverlay({ showFails = false } = {}) {
  const log = [];
  return { log, setDisplay: (id) => log.push(['display', id]), show: () => { log.push(['show']); return showFails ? Promise.reject(new Error('no window')) : Promise.resolve(); },
    step: (payload) => log.push(['step', payload.explanation]), working: () => log.push(['working']), hide: () => log.push(['hide']), fadeTooltip: () => log.push(['fade']),
    beforeAction: () => log.push(['before']), afterAction: () => log.push(['after']) };
}
function fakeMainWindow() {
  return { visible: true, hides: 0, shows: 0, isDestroyed: () => false, isVisible() { return this.visible; }, hide() { this.visible = false; this.hides += 1; }, show() { this.visible = true; this.shows += 1; } };
}

test('teach mode (the session side): a step hides the main window and waits for Next; the turn ending resolves it as exit and brings the window back', async () => {
  const overlay = fakeOverlay(), main = fakeMainWindow(), changes = [];
  const mode = createTeachMode({ overlay, mainWindow: () => main, displayFor: () => null, displayOf: () => 7, lockHolder: () => 'a', log: {}, onChange: (id, on) => changes.push([id, on]) });
  mode.activate('a');
  assert.deepEqual(overlay.log, [['display', 7]], 'no selected display: the main window\'s');
  const first = mode.showStep('a', { explanation: 'One', nextPreview: '' });
  assert.equal(main.visible, false);
  assert.deepEqual(overlay.log.slice(1), [['show'], ['step', 'One']]);
  mode.next();
  assert.deepEqual(await first, { action: 'next' });
  // A second step while one waits resolves the old one as exit (official).
  const second = mode.showStep('a', { explanation: 'Two', nextPreview: '' });
  const third = mode.showStep('a', { explanation: 'Three', nextPreview: '' });
  assert.deepEqual(await second, { action: 'exit' });
  // Another agent action: the tooltip fades and the window returns.
  mode.nonTeachAction('a');
  assert.equal(main.visible, true);
  assert.deepEqual(overlay.log.at(-1), ['fade']);
  mode.end('a');
  assert.deepEqual(await third, { action: 'exit' });
  assert.equal(mode.isActive('a'), false);
  assert.deepEqual(overlay.log.at(-1), ['hide']);
  assert.deepEqual(changes, [['a', true], ['a', false]]);
  // Not in teach mode: a step is an exit at once.
  assert.deepEqual(await mode.showStep('a', { explanation: 'x', nextPreview: '' }), { action: 'exit' });
});

test('teach mode: Exit resolves the step and stops the lock holder (official TFa); no holder clears the overlay; a failed overlay recovers', async () => {
  const stopped = [];
  const overlay = fakeOverlay(), main = fakeMainWindow();
  const mode = createTeachMode({ overlay, mainWindow: () => main, displayFor: () => 3, lockHolder: () => 'a', stopSession: (id) => stopped.push(id), log: {} });
  mode.activate('a');
  assert.deepEqual(overlay.log, [['display', 3]], 'the session\'s selected display');
  const step = mode.showStep('a', { explanation: 'One', nextPreview: '' });
  mode.exit();
  assert.deepEqual(await step, { action: 'exit' });
  assert.deepEqual(stopped, ['a']);
  assert.equal(main.visible, false, 'the window comes back when the stopped turn ends teach mode');
  mode.end('a');
  assert.equal(main.visible, true);
  const loneMain = fakeMainWindow();
  const lone = createTeachMode({ overlay: fakeOverlay(), mainWindow: () => loneMain, lockHolder: () => null, log: {} });
  lone.activate('b');
  lone.showStep('b', { explanation: 'x', nextPreview: '' });
  assert.equal(loneMain.visible, false);
  lone.exit();
  assert.equal(lone.activeSession(), null);
  assert.equal(loneMain.visible, true);
  const broken = fakeOverlay({ showFails: true }), stops = [];
  const failing = createTeachMode({ overlay: broken, mainWindow: () => fakeMainWindow(), lockHolder: () => 'c', stopSession: (id) => stops.push(id), log: {} });
  failing.activate('c');
  assert.deepEqual(await failing.showStep('c', { explanation: 'x', nextPreview: '' }), { action: 'exit' });
  assert.deepEqual(stops, ['c']);
});

test('teachNonTeachAction (official nu()): teach tools and passive looks keep the tooltip; anything else fades it', () => {
  const own = (tool, args = {}) => ({ type: 'mcpToolCall', server: 'code_desktop', tool, arguments: args });
  assert.equal(isNonTeachAction(own('teach_step', { explanation: 'e', next_preview: '', actions: [] })), false);
  assert.equal(isNonTeachAction(own('screenshot', { scale: 0.5 })), false);
  assert.equal(isNonTeachAction(own('screenshot')), false, 'a screenshot without arguments is a look too');
  assert.equal(isNonTeachAction(own('wait', { duration: 1 })), false);
  assert.equal(isNonTeachAction(own('left_click', { coordinate: [1, 2] })), true);
  assert.equal(isNonTeachAction(own('computer_batch', { actions: [{ action: 'wait' }, { action: 'screenshot' }] })), false);
  assert.equal(isNonTeachAction(own('computer_batch', { actions: [{ action: 'wait' }, { action: 'key', text: 'a' }] })), true);
  assert.equal(isNonTeachAction(own('app_click', { app: 'com.apple.finder' })), true);
  assert.equal(isNonTeachAction({ type: 'commandExecution', command: 'ls' }), true);
  assert.equal(isNonTeachAction(own('Workflow', {})), true, 'any tool that is not computer use');
  assert.equal(isNonTeachAction({ type: 'agentMessage', text: 'hi' }), false);
  assert.equal(isNonTeachAction({ type: 'reasoning' }), false);
  assert.deepEqual(['request_teach_access', 'teach_step', 'teach_batch'].map((tool) => computerUseAction(own(tool))?.kind), ['request_teach', 'teach_step', 'teach_batch']);
});

// ── The tools, end to end against a fake native (nothing is posted) ─────────────────────────────────────────────────
const TEXTEDIT = 'com.apple.TextEdit';
const DISPLAY = { displayId: 1, bounds: { x: 0, y: 0, width: 1470, height: 956 }, pixelWidth: 2940, pixelHeight: 1912, scaleFactor: 2, isMain: true, name: 'Main' };
function fakeNative({ front = TEXTEDIT, refuseClick = null } = {}) {
  const calls = [];
  return {
    calls,
    async call(method, params = {}) {
      calls.push([method, params]);
      switch (method) {
        case 'probe': return { screenLocked: false, secureInput: false, secondsSinceUserInput: 999 };
        case 'listDisplays': return { displays: [DISPLAY] };
        case 'frontmostApp': return { pid: 10, bundleId: front };
        case 'cursorPosition': return { x: 5, y: 5 };
        case 'pointOwner': return { owner: { windowId: 50, pid: 10, bundleId: TEXTEDIT, layer: 0, ownerName: 'TextEdit' } };
        case 'captureScreen': {
          const [width, height] = scaled(fit(2940, 1912), params.scale ?? 1);
          return { dataUrl: 'data:image/jpeg;base64,U0NSRUVO', width, height, frameWidth: 2940, frameHeight: 1912, scaleFactor: 2, displayId: 1,
            displayWidth: 1470, displayHeight: 956, displayBounds: DISPLAY.bounds, region: null, excludedBundleIds: [], desktopWindowIds: [], jpegQuality: 0.75 };
        }
        case 'hidMove': return { outcome: 'ok', delivered: true, to: params.point };
        case 'hidClick': return refuseClick ?? { outcome: 'ok', delivered: true, clicksDelivered: params.count };
        case 'hidMouseUp': return { outcome: 'ok', delivered: false, wasHeld: false };
        default: throw Object.assign(new Error(`unexpected ${method}`), { code: 'unknown_method' });
      }
    },
  };
}
function teachSetup({ answer = 'accept', installed = true, native: nativeOptions = {}, holder = null } = {}) {
  const fullControl = createFullControl();
  if (holder) { fullControl.approve(holder); fullControl.acquireLock(holder); }
  const native = fakeNative(nativeOptions);
  const service = createComputerUse({ native, axHelper: { call: async () => ({}) }, log: { log() {}, warn() {}, info() {} }, wait: async () => {}, fullControl, pointer: { beforeClick() {}, clicked() {} } });
  const overlay = fakeOverlay(), main = fakeMainWindow(), cards = [];
  const mode = createTeachMode({ overlay, mainWindow: () => main, displayFor: (id) => service.selectedDisplay(id), lockHolder: () => fullControl.holder(), log: {} });
  // The user: clicks Next on every step unless told to exit on step n (1-based).
  const user = { exitOn: null, seen: 0, manual: false };
  const teach = {
    isActive: () => mode.isActive('a'), activate: () => mode.activate('a'),
    showStep: (payload) => { const promise = mode.showStep('a', payload); user.seen += 1; if (user.manual) return promise; if (user.exitOn === user.seen) mode.exit(); else mode.next(); return promise; },
    working: () => mode.working('a'), beforeAction: () => mode.beforeAction('a'), afterAction: () => mode.afterAction('a'), cancelStep: () => mode.cancelStep('a'),
  };
  const ctx = { sessionId: 'a', computerUse: { service, teach,
    resolveApps: async (names) => names.map((name) => ({ requested: name, bundleId: name === 'TextEdit' ? TEXTEDIT : `com.example.${name}`, displayName: name, path: `/Applications/${name}.app`, installed })),
    askTeach: async (request) => { cards.push(request); return answer; },
    askTakeover: async () => 'unavailable', toolsChanged() {} } };
  const call = (name, args, signal) => cu.tools.find((tool) => tool.name === name).handler(args, signal ? { ...ctx, signal } : ctx);
  return { service, native, fullControl, overlay, main, mode, cards, user, call };
}
const body = (result) => JSON.parse((typeof result === 'string' ? result : result.content[0].text));

test('request_teach_access: the teach card; Start guide grants the apps (no flags), approves and locks the screen, and starts teach mode', async () => {
  const { call, cards, service, fullControl, mode } = teachSetup();
  const result = await call('request_teach_access', { apps: ['TextEdit'], reason: 'writing a note' });
  assert.equal(result.isError, undefined);
  const answer = body(result);
  assert.deepEqual(answer.granted, [{ app: 'TextEdit', bundleId: TEXTEDIT, name: 'TextEdit', tier: 'full' }]);
  assert.equal(answer.teachModeActive, true);
  assert.deepEqual(cards[0], { reason: 'writing a note', apps: [{ bundleId: TEXTEDIT, displayName: 'TextEdit', path: '/Applications/TextEdit.app', installed: true, tier: 'full', alreadyGranted: false }] });
  assert.deepEqual(service.grantsFor('a').flags(), { clipboardRead: false, clipboardWrite: false, systemKeyCombos: false });
  assert.equal(fullControl.isApproved('a'), true);
  assert.equal(fullControl.holder(), 'a');
  assert.equal(mode.isActive('a'), true);
  // Again while it is on: teach_mode_conflict; request_access too.
  for (const [name, args] of [['request_teach_access', { apps: ['TextEdit'], reason: 'r' }], ['request_access', { apps: ['TextEdit'], reason: 'r' }]]) {
    const refused = await call(name, args);
    assert.equal(refused.isError, true);
    assert.deepEqual([body(refused).ok, body(refused).reasonCode, typeof body(refused).next_step], [false, 'teach_mode_conflict', 'string'], name);
  }
});

test('request_teach_access: declined → teach_declined; not installed → no card; another session holding the screen → cu_lock_held; bad arguments → bad_args', async () => {
  const declined = teachSetup({ answer: 'decline' });
  const refused = await declined.call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  assert.deepEqual([refused.isError, body(refused).reasonCode], [true, 'teach_declined']);
  assert.equal(declined.service.grantsFor('a').has(TEXTEDIT), false);
  assert.equal(declined.mode.isActive('a'), false);
  const missing = teachSetup({ installed: false });
  const answer = body(await missing.call('request_teach_access', { apps: ['Nope'], reason: 'r' }));
  assert.deepEqual([answer.teachModeActive, answer.notInstalled.apps, missing.cards.length], [false, ['Nope'], 0]);
  const busy = teachSetup({ holder: 'other' });
  const held = await busy.call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  assert.deepEqual([held.isError, body(held).reasonCode, busy.mode.isActive('a')], [true, 'cu_lock_held', false]);
  const bad = teachSetup();
  assert.equal(body(await bad.call('request_teach_access', { apps: ['TextEdit'], reason: ' ' })).reasonCode, 'bad_args');
  assert.equal(body(await bad.call('request_teach_access', { apps: 'TextEdit', reason: 'r' })).reasonCode, 'bad_args');
});

test('teach_step: not in teach mode → teach_mode_not_active; a bad step → bad_args with no tooltip; Next runs the actions and returns them with a screenshot', async () => {
  const { call, overlay, native, user } = teachSetup();
  const inactive = await call('teach_step', { explanation: 'e', next_preview: '', actions: [] });
  assert.deepEqual([inactive.isError, body(inactive).reasonCode], [true, 'teach_mode_not_active']);
  await call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  const bad = await call('teach_step', { explanation: 'e', next_preview: '', actions: [{ action: 'zoom', region: [0, 0, 1, 1] }] });
  assert.deepEqual([bad.isError, body(bad).reasonCode], [true, 'bad_args']);
  assert.match(body(bad).message, /actions\[0\]\.action="zoom" isn't allowed/);
  assert.equal(overlay.log.some(([what]) => what === 'step'), false, 'no tooltip for a step that failed the check');
  // A screenshot first (the anchor's reference), then a step that explains only: no picture.
  await call('screenshot', {});
  const explain = await call('teach_step', { explanation: 'This is the toolbar.', next_preview: '', actions: [] });
  assert.deepEqual(body(explain), { executed: 0, results: [] });
  assert.equal(explain.content?.length ?? 1, 1);
  // A step with actions: the click runs on Next, the overlay is click-through around it, a fresh screenshot comes back.
  const shotsBefore = native.calls.filter(([m]) => m === 'captureScreen').length;
  const step = await call('teach_step', { explanation: 'Click the document.', next_preview: 'Next: I\'ll click it.', anchor: [686, 446], actions: [{ action: 'left_click', coordinate: [686, 446] }] });
  assert.deepEqual(body(step), { executed: 1, results: [{ action: 'left_click', ok: true, output: 'Clicked.' }] });
  assert.equal(step.content.at(-1).type, 'image');
  assert.equal(native.calls.filter(([m]) => m === 'captureScreen').length, shotsBefore + 1);
  assert.deepEqual(native.calls.filter(([m]) => m === 'hidClick').at(-1)[1].point, { x: 735, y: 478 });
  const tail = overlay.log.slice(-4);
  assert.deepEqual(tail, [['step', 'Click the document.'], ['working'], ['before'], ['after']]);
  assert.equal(user.seen, 2);
});

test('teach_batch: two steps — each waits for Next, then its actions; one screenshot at the end; Exit and a failing action stop it', async () => {
  const { call, user, native } = teachSetup();
  await call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  await call('screenshot', {});
  // Every step is checked first: a mistake in the second step shows no tooltip.
  const bad = await call('teach_batch', { steps: [{ explanation: 'a', next_preview: '', actions: [] }, { explanation: 'b', next_preview: 1, actions: [] }] });
  assert.deepEqual([body(bad).reasonCode, user.seen], ['bad_args', 0]);
  assert.match(body(bad).message, /^steps\[1\]: "next_preview" must be a string/);
  const steps = [
    { explanation: 'Step one', next_preview: 'Next: a click', anchor: [100, 100], actions: [{ action: 'mouse_move', coordinate: [100, 100] }, { action: 'left_click', coordinate: [100, 100] }] },
    { explanation: 'Step two', next_preview: '', actions: [{ action: 'wait', duration: 0 }] },
  ];
  const shots = native.calls.filter(([m]) => m === 'captureScreen').length;
  const done = await call('teach_batch', { steps });
  assert.equal(done.isError, undefined);
  assert.deepEqual(body(done), { stepsCompleted: 2, results: [[{ action: 'mouse_move', ok: true, output: 'Moved.' }, { action: 'left_click', ok: true, output: 'Clicked.' }], [{ action: 'wait', ok: true, output: 'Waited 0s.' }]] });
  assert.equal(done.content.at(-1).type, 'image');
  assert.equal(native.calls.filter(([m]) => m === 'captureScreen').length, shots + 1, 'one screenshot, at the end');
  assert.equal(user.seen, 2);
  // Only explanations: no picture.
  const plain = await call('teach_batch', { steps: [{ explanation: 'x', next_preview: '', actions: [] }] });
  assert.deepEqual(body(plain), { stepsCompleted: 1, results: [[]] });
  // Exit on the second tooltip.
  user.exitOn = user.seen + 2;
  assert.deepEqual(body(await call('teach_batch', { steps })), { exited: true, stepsCompleted: 1 });
});

test('teach_batch: a failing action stops the batch in the refusal shape with the official fields', async () => {
  const { call } = teachSetup({ native: { refuseClick: { outcome: 'unsupported', reasonCode: 'user_actively_typing', delivered: false } } });
  await call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  await call('screenshot', {});
  const result = await call('teach_batch', { steps: [
    { explanation: 'One', next_preview: '', actions: [] },
    { explanation: 'Two', next_preview: '', actions: [{ action: 'mouse_move', coordinate: [10, 10] }, { action: 'left_click', coordinate: [10, 10] }, { action: 'wait', duration: 0 }] },
  ] });
  assert.equal(result.isError, true);
  const answer = body(result);
  assert.deepEqual([answer.ok, answer.stepsCompleted, answer.stepFailed, answer.executed, answer.remaining, answer.failed.action, answer.failed.ok],
    [false, 1, 1, 1, 1, 'left_click', false]);
  assert.equal(answer.reasonCode, 'user_actively_typing');
  assert.deepEqual(answer.results, [[]]);
  assert.equal(typeof answer.next_step, 'string');
  assert.equal(typeof answer.message, 'string');
});

test('the turn ending (or the call being stopped) answers the waiting step as exited, with no action run', async () => {
  const { call, mode, user, native } = teachSetup();
  user.manual = true;
  await call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  const pending = call('teach_step', { explanation: 'waiting', next_preview: '', actions: [{ action: 'left_click', coordinate: [1, 1] }] });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(mode.hasPendingStep('a'), true);
  mode.end('a');
  assert.deepEqual(body(await pending), { exited: true });
  assert.equal(native.calls.some(([m]) => m === 'hidClick'), false);
  // Stopped: the call's signal aborts while the tooltip waits.
  const stopped = teachSetup();
  stopped.user.manual = true;
  await stopped.call('request_teach_access', { apps: ['TextEdit'], reason: 'r' });
  const controller = new AbortController();
  const waiting = stopped.call('teach_batch', { steps: [{ explanation: 'a', next_preview: '', actions: [] }, { explanation: 'b', next_preview: '', actions: [] }] }, controller.signal);
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  assert.deepEqual(body(await waiting), { exited: true, stepsCompleted: 0 });
});
