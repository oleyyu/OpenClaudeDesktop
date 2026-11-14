// glass-native (surfaces-prod-3): the sidebar glass's native add-on (native/sidebar-glass, written to the interface of
// the official 4.16336.0 swift_addon.node ClaudeSwift/SidebarGlass module) and the glass branches of
// electron/window-vibrancy.cjs against the official createWindowVibrancyImpl (index.chunk-puk2Wpzf.js G / K / I / L / z
// / B / V / P / T / w). No GUI: the window-vibrancy branches run on fake windows and a fake add-on; the real add-on is
// loaded in plain Node only for its argument checks and the refusals that happen before any window is looked up.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const root = path.resolve(app, '..');
const require = createRequire(import.meta.url);
const V = require('../electron/window-vibrancy.cjs');
const snapshot = path.join(root, 'reference/snapshots/claude-4.16336.0-20261104/asar');
const officialAddOn = path.join(snapshot, 'node_modules/@ant/claude-swift/build/Release/swift_addon.node');
const officialImpl = path.join(snapshot, '.vite/build/index.chunk-puk2Wpzf.js');
const ownAddOn = path.join(app, 'native/sidebar-glass/build/sidebar_glass.node');
const read = (file) => fs.readFileSync(file, 'utf8');

const MESSAGES = [
  "SidebarGlassShowArgs: expected 1 argument(s)",
  "SidebarGlassShowArgs: argument 0 ('options') must be SidebarGlassShowOptions",
  "SidebarGlassShowOptions: missing or invalid 'windowNumber' (Int)",
  "SidebarGlassShowOptions: missing or invalid 'width' (Double)",
  "SidebarGlassTintArgs: expected 1 argument(s)",
  "SidebarGlassTintArgs: argument 0 ('options') must be SidebarGlassTintOptions",
  "SidebarGlassTintOptions: missing or invalid 'rgba' (Double)",
  "SidebarGlassTintOptions: missing or invalid 'width' (Double)",
];

test('official evidence: the add-on strings the glue repeats, and the main process calls it makes', { skip: !fs.existsSync(officialAddOn) && 'snapshot not present' }, () => {
  const binary = fs.readFileSync(officialAddOn).toString('latin1');
  for (const message of [...MESSAGES, 'ClaudeSwift/NAPIBindings+SidebarGlass.swift', '_TtC11ClaudeSwift18SidebarGlassHolder', '_TtC11ClaudeSwift18UnderSiblingsLayer',
    'CLAUDE_DEV_SIDEBAR_GLASS_LEAVE_ORDER', 'sidebar glass put in over ', 'sidebarWithViewController:', '_OBJC_CLASS_$_NSGlassEffectView']) {
    assert.ok(binary.includes(message), message);
  }
  assert.ok(!binary.includes('NSVisualEffectView'), 'the official add-on uses no NSVisualEffectView');
  const impl = read(officialImpl);
  assert.ok(impl.includes('v?.show({windowNumber:a,width:i,backing:typeof n=="number"?n:void 0,...n==="system"&&{systemBacking:!0},...r&&{appKitSidebar:r}})===!0'), 'I');
  assert.ok(impl.includes('n.setTint({rgba:t.tint,width:A(t)*t.win.webContents.getZoomFactor()})===!0'), 'L');
  assert.ok(impl.includes('v=e?.sidebarGlass??null'), 'P reads the sidebarGlass namespace');
  assert.ok(impl.includes('if(U(x,l),d===r&&v&&!u&&!(w(x)>0)){H();let e=b;return T(x).then(()=>E(e,l)&&K(t,l,!0))}'), 'K waits for a window number');
});

test('own add-on: the sidebarGlass namespace, the official TypeErrors and the refusals before any window lookup', { skip: (process.platform !== 'darwin' || !fs.existsSync(ownAddOn)) && 'add-on not built (node native/sidebar-glass/build.mjs)' }, () => {
  const glass = require(ownAddOn).sidebarGlass;
  assert.deepEqual(Object.keys(glass), ['show', 'hide', 'setTint', 'clearTint']);
  const typeError = (fn, message) => assert.throws(fn, (error) => error instanceof TypeError && error.message === message);
  typeError(() => glass.show(), MESSAGES[1]);
  typeError(() => glass.show(null), MESSAGES[1]);
  typeError(() => glass.show({ width: 1 }), MESSAGES[2]);
  typeError(() => glass.show({ windowNumber: 1.5, width: 1 }), MESSAGES[2]);
  typeError(() => glass.show({ windowNumber: 2 ** 31, width: 1 }), MESSAGES[2]);
  typeError(() => glass.show({ windowNumber: 1 }), MESSAGES[3]);
  typeError(() => glass.setTint({ width: 1 }), MESSAGES[6]);
  typeError(() => glass.setTint({ rgba: 1 }), MESSAGES[7]);
  typeError(() => glass.setTint('x'), MESSAGES[5]);
  // Refused before NSApp is read (0x11b1e0–0x11b234): each refusal answers false and takes any glass out.
  assert.equal(glass.show({ windowNumber: 0, width: 280 }), false, 'window number below 1');
  assert.equal(glass.show({ windowNumber: 7, width: Infinity }), false, 'width not finite');
  assert.equal(glass.show({ windowNumber: 7, width: NaN }), false);
  assert.equal(glass.show({ windowNumber: 7, width: 1, backing: 0x1000000 }), false, 'backing is #rrggbb');
  assert.equal(glass.show({ windowNumber: 7, width: 1, backing: -1 }), false);
  assert.equal(glass.show({ windowNumber: 7, width: 1, backing: 0xfafafa, systemBacking: true }), false, 'a solid colour or the system colour, not both');
  assert.equal(glass.show({ windowNumber: 7, width: 1, backing: 'white' }), false, 'a present field of the wrong type');
  assert.equal(glass.show({ windowNumber: 7, width: 1, appKitSidebar: 1 }), false);
  assert.equal(glass.setTint({ rgba: 0xfafafaff, width: 280 }), false, 'no glass to tint');
  assert.equal(glass.setTint({ rgba: 1.5, width: 280 }), false);
  assert.equal(glass.hide(), undefined);
  assert.equal(glass.clearTint(), undefined);
});

test('package.json: build:native builds the add-on and the package step unpacks it', () => {
  const pkg = JSON.parse(read(path.join(app, 'package.json')));
  assert.match(pkg.scripts['build:native'], /node native\/sidebar-glass\/build\.mjs/);
  assert.match(pkg.scripts['build:native'], /node native\/computer-use\/build\.mjs/);
  assert.match(pkg.scripts.package, /--asar\.unpackDir='\{[^}]*native\/sidebar-glass\/build[^}]*\}'/);
  assert.match(pkg.scripts.package, /--ignore='\^\/native\/sidebar-glass\/\(\?!build\(\/\|\$\)\)'/);
  assert.equal(V.NATIVE_MODULE, path.join(app, 'native/sidebar-glass/build/sidebar_glass.node'));
});

class FakeContents {
  constructor() { this.listeners = {}; this.scripts = []; this.zoom = 1; this.destroyed = false; }
  on(name, fn) { (this.listeners[name] ??= []).push(fn); }
  emit(name, ...args) { for (const fn of this.listeners[name] ?? []) fn({}, ...args); }
  getZoomFactor() { return this.zoom; }
  isDestroyed() { return this.destroyed; }
  executeJavaScript(code) { this.scripts.push(code); return Promise.resolve(); }
}
class FakeWindow {
  constructor(options, number = 42) { this.options = options; this.number = number; this.vibrancy = options.vibrancy ?? null; this.bg = '#fcfcfb'; this.calls = []; this.webContents = new FakeContents(); this.listeners = {}; }
  setVibrancy(v) { this.calls.push(['setVibrancy', v]); this.vibrancy = v; }
  setBackgroundColor(c) { this.bg = c; }
  getBackgroundColor() { return this.bg; }
  getContentSize() { return [1440, 900]; }
  getMediaSourceId() { return `window:${this.number}:0`; }
  isDestroyed() { return false; }
  once(name, fn) { (this.listeners[name] ??= []).push(fn); }
  emit(name) { const fns = this.listeners[name] ?? []; this.listeners[name] = []; for (const fn of fns) fn(); }
}
function fakeAddOn({ shows = true, tints = true } = {}) {
  const calls = [];
  return {
    calls,
    show: (options) => { calls.push(['show', options]); return shows; },
    hide: () => { calls.push(['hide']); },
    setTint: (options) => { calls.push(['setTint', options]); return tints; },
    clearTint: () => { calls.push(['clearTint']); },
  };
}
function setup({ glass, loadNative } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebar-glass-'));
  const file = path.join(dir, 'window-vibrancy.json');
  fs.writeFileSync(file, JSON.stringify({ [V.ASKED_KEY]: true }));
  const logs = [];
  const vib = V.createWindowVibrancy({ nativeTheme: { shouldUseDarkColors: false, on() {} }, windowColor: () => '#fcfcfb', recordFile: () => file,
    log: { info: (m) => logs.push(m), warn: (m) => logs.push(m) }, systemVersion: () => '27.2.0', nativeGlass: glass, loadNative });
  const make = (number) => { const win = vib.createMainWindow({}, (o) => new FakeWindow(o, number)); fs.writeFileSync(file, JSON.stringify({ [V.ASKED_KEY]: true })); return win; };
  return { vib, logs, make };
}
const request = (material, windowColor, extra = {}) => ({ material, windowColor, sidebarWidth: 280, ...extra });

test('appkit-glass over solid:#fafafa: the add-on loads on the first glass request and shows AppKit\'s sidebar glass', async () => {
  const addOn = fakeAddOn();
  let loads = 0;
  const s = setup({ loadNative: () => { loads += 1; return { sidebarGlass: addOn }; } });
  const win = s.make();
  const answer = s.vib.implFor(win).showUnderSidebar(request('appkit-glass', 'solid:#fafafa'));
  assert.equal(typeof answer.then, 'function', 'G answers through P while the add-on loads');
  assert.equal(await answer, true);
  assert.deepEqual(addOn.calls, [['show', { windowNumber: 42, width: 280, backing: 0xfafafa, appKitSidebar: true }]], 'I: the strip, no 64 for AppKit\'s sidebar');
  assert.ok(s.logs.includes('[window-vibrancy] showing the macOS "glass" material under the sidebar, drawn by AppKit\'s sidebar, with the solid colour #fafafa put behind the glass; Electron\'s window colour held clear'), s.logs.join('\n'));
  assert.equal(win.bg, '#00000000');
  assert.equal(win.vibrancy, null, 'glass is not an Electron material');
  assert.equal(s.vib.stateOf(win).material, 'glass');
  // Loaded once; the next request answers at once.
  assert.equal(s.vib.implFor(win).showUnderSidebar(request('appkit-glass', 'solid:#fafafa', { sidebarWidth: 300 })), true);
  assert.equal(loads, 1);
  assert.deepEqual(addOn.calls.at(-1), ['show', { windowNumber: 42, width: 300, backing: 0xfafafa, appKitSidebar: true }]);
  s.vib.implFor(win).clear();
  assert.deepEqual(addOn.calls.at(-1), ['hide']);
  assert.equal(win.bg, '#fcfcfb');
});

test('plain glass reaches 64 past the strip; "system" asks for the system colour behind it; zoom scales the width', () => {
  const addOn = fakeAddOn();
  const s = setup({ glass: addOn });
  const win = s.make();
  win.webContents.zoom = 1.25;
  assert.equal(s.vib.implFor(win).showUnderSidebar(request('glass', 'system')), true);
  assert.deepEqual(addOn.calls, [['show', { windowNumber: 42, width: 280 * 1.25 + 64, backing: undefined, systemBacking: true }]]);
  assert.ok(s.logs.at(-1).startsWith('[window-vibrancy] showing the macOS "glass" material under the sidebar, with the system\'s window colour put behind the glass;'));
});

test('told no: an add-on that does not load, one that has no glass, and one that refuses', async () => {
  const failing = setup({ loadNative: () => { throw new Error('dlopen'); } });
  assert.equal(await failing.vib.implFor(failing.make()).showUnderSidebar(request('appkit-glass', 'solid:#fafafa')), false);
  assert.ok(failing.logs.some((m) => m.startsWith("[window-vibrancy] could not load the app's native add-on")));
  assert.ok(failing.logs.some((m) => m.includes('this app build has no glass, or its native add-on did not load')));
  const empty = setup({ loadNative: () => ({}) });
  assert.equal(await empty.vib.implFor(empty.make()).showUnderSidebar(request('glass', 'clear')), false);
  const refusing = setup({ glass: fakeAddOn({ shows: false }) });
  const win = refusing.make();
  assert.equal(refusing.vib.implFor(win).showUnderSidebar(request('appkit-glass', 'clear')), false);
  assert.ok(refusing.logs.some((m) => m.includes("AppKit's sidebar glass not shown under the sidebar: the app's native add-on did not show it, and on macOS older than 27 it never does")));
  assert.equal(refusing.vib.stateOf(win), null);
  assert.equal(win.bg, '#fcfcfb', 'the window colour is released');
});

test('a window not shown yet has no window number: K waits for "show", then shows; a later request wins', async () => {
  const addOn = fakeAddOn();
  const s = setup({ glass: addOn });
  const win = s.make(0);
  const pending = s.vib.implFor(win).showUnderSidebar(request('glass', 'clear'));
  assert.equal(typeof pending.then, 'function');
  assert.deepEqual(addOn.calls, []);
  win.number = 77;
  win.emit('show');
  assert.equal(await pending, true);
  assert.equal(addOn.calls[0][1].windowNumber, 77);
  // A request superseded while waiting answers false and shows nothing.
  const t = setup({ glass: fakeAddOn() });
  const late = t.make(0);
  const first = t.vib.implFor(late).showUnderSidebar(request('glass', 'clear'));
  t.vib.implFor(late).clear();
  late.number = 5;
  late.emit('show');
  assert.equal(await first, false);
});

test('tint: packed rgba over the glass, kept across a re-show, cleared when it cannot apply', () => {
  const addOn = fakeAddOn();
  const s = setup({ glass: addOn });
  const win = s.make();
  const impl = s.vib.implFor(win);
  assert.equal(impl.tintUnderSidebar({ red: 1, green: 2, blue: 3, alpha: 1 }), false, 'no glass yet');
  assert.deepEqual(addOn.calls.at(-1), ['clearTint']);
  impl.showUnderSidebar(request('glass', 'clear'));
  assert.equal(impl.tintUnderSidebar({ red: 250, green: 250, blue: 250, alpha: 0.5 }), true);
  assert.deepEqual(addOn.calls.at(-1), ['setTint', { rgba: 0xfafafa80, width: 280 }]);
  impl.showUnderSidebar(request('glass', 'clear', { sidebarWidth: 300 }));
  assert.deepEqual(addOn.calls.slice(-2), [['show', { windowNumber: 42, width: 364, backing: undefined }], ['setTint', { rgba: 0xfafafa80, width: 300 }]], 'K re-applies the tint (L)');
  impl.showUnderSidebar(request('glass', 'clear', { sidebarWidth: 2000 }));
  assert.deepEqual(addOn.calls.at(-1), ['clearTint'], 'a strip wider than half the window cannot be tinted');
  assert.equal(s.vib.stateOf(win).tint, undefined);
  impl.clearTintUnderSidebar();
  assert.deepEqual(addOn.calls.at(-1), ['clearTint']);
});

test('one glass for the app: another window\'s request switches the first off; only the owner\'s close reaches the add-on', () => {
  const addOn = fakeAddOn();
  const s = setup({ glass: addOn });
  const a = s.make(10), b = s.make(11);
  assert.equal(s.vib.implFor(a).showUnderSidebar(request('glass', 'clear')), true);
  assert.equal(s.vib.implFor(b).showUnderSidebar(request('glass', 'clear')), true);
  assert.deepEqual(addOn.calls.map((c) => c[0] === 'show' ? `show ${c[1].windowNumber}` : c[0]), ['show 10', 'hide', 'show 11']);
  assert.equal(s.vib.stateOf(a), null);
  assert.equal(a.bg, '#fcfcfb');
  s.vib.implFor(a).clear();
  a.emit('closed');
  assert.equal(addOn.calls.at(-1)[0], 'show', 'a window without the glass does not hide it');
  s.vib.implFor(a).clearTintUnderSidebar();
  assert.equal(addOn.calls.at(-1)[0], 'show', 'nor take its tint off');
  b.emit('closed');
  assert.deepEqual(addOn.calls.at(-1), ['hide']);
});

test('IPC: a request answered after the add-on loads is answered true', async () => {
  const s = setup({ loadNative: () => ({ sidebarGlass: fakeAddOn() }) });
  const win = s.make();
  let handler;
  V.installWindowVibrancyIpc({ handle: (_name, fn) => { handler = fn; } }, s.vib, () => win);
  assert.equal(await handler({ senderFrame: { parent: null } }, 'showUnderSidebar', request('appkit-glass', 'solid:#fafafa')), true);
});
