// host-native (surfaces-prod-2): claude.windowVibrancy — electron/window-vibrancy.cjs against the official 4.16336.0 main
// process (asar/.vite/build index.chunk-Du-Wqi0E.js unr / Mto, index.chunk-puk2Wpzf.js createWindowVibrancyImpl,
// mainView.js preload) and the preload exposure the page's shared-22 rz reads. Fake windows only (no Electron, no GUI).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const root = path.resolve(app, '..');
const require = createRequire(import.meta.url);
const V = require('../electron/window-vibrancy.cjs');
const build = path.join(root, 'reference/snapshots/claude-4.16336.0-20261104/asar/.vite/build');
const ion = path.join(root, 'reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(file, 'utf8');
const once = (text, needle, what) => assert.equal(text.split(needle).length - 1, 1, `${what}: ${needle.slice(0, 80)}`);

test('official sources: the main window material, the WindowVibrancy methods, the preload and the page reader', { skip: !fs.existsSync(build) && 'snapshot not present' }, () => {
  const main = read(path.join(build, 'index.chunk-Du-Wqi0E.js'));
  once(main, 'var rnr="sidebarMaterialAsked",inr=3,anr={vibrancy:"sidebar"}', 'unr record and creation options');
  once(main, 'function unr(e,t){if(!lnr())return t(e);let n=t({...e,...anr});try{n.setVibrancy(null),onr.add(n)}', 'unr');
  once(main, 'methods:[["showUnderSidebar",[["request",Eto]],L],["clear",[]],["tintUnderSidebar",[["tint",kto]],L],["clearTintUnderSidebar",[]]]', 'Mto methods');
  once(main, 'function Eto(e){return!(!e||typeof e!="object"||!Tto(e.material)||!Tto(e.windowColor)||!wto(e.sidebarWidth)||e.underBootPlaceholder!==void 0&&typeof e.underBootPlaceholder!="boolean")}', 'Eto');
  assert.ok(!main.includes('visualEffectState:"'), 'the official main window sets no visualEffectState');
  const impl = read(path.join(build, 'index.chunk-puk2Wpzf.js'));
  once(impl, 'var n=["sidebar","under-window","window","content","header","hud","menu","popover","sheet","fullscreen-ui","under-page"],r="glass",i="appkit-glass"', 'materials');
  once(impl, 'return{showUnderSidebar:e=>n()&&G(e,t),clear:()=>{n()&&H()},tintUnderSidebar:e=>n()&&z(e),clearTintUnderSidebar:()=>{n()&&B()}}', 'q');
  once(impl, 'body{background-color:transparent !important}body::before{content:\'\';position:fixed;inset:0;z-index:-1;background-color:${S()};clip-path:inset(0 0 0 ${t}px)}', 'j');
  assert.ok(impl.includes(V.GROUND_SCRIPT), 'O (the page ground script) is the official text');
  assert.deepEqual(V.MATERIALS, ['sidebar', 'under-window', 'window', 'content', 'header', 'hud', 'menu', 'popover', 'sheet', 'fullscreen-ui', 'under-page']);
  const preload = read(path.join(build, 'mainView.js'));
  once(preload, 'e["claude.windowVibrancy"].WindowVibrancy=yt', 'mainView preload');
  const page = read(path.join(ion, 'shared-22-BACJUrcb.js'));
  once(page, 'var rz=globalThis["claude.windowVibrancy"]?.WindowVibrancy,iz={light:"#fafafa",dark:"#1f1f1f"},az={material:"appkit-glass",behind:"flat"}', 'shared-22 rz');
  once(page, 'n({material:t,windowColor:t==="sidebar"?"clear":D.current,sidebarWidth:Lz(r,t==="sidebar"?0:c,N.current)', 'Kz request');
  once(page, 'if(n!==!0&&t!=="sidebar"){s="sidebar"', 'Kz falls back to the sidebar material when told no');
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
  constructor(options) { this.options = options; this.vibrancy = options.vibrancy ?? null; this.bg = options.backgroundColor ?? '#fcfcfb'; this.calls = []; this.webContents = new FakeContents(); this.listeners = {}; }
  setVibrancy(v) { this.calls.push(['setVibrancy', v]); this.vibrancy = v; }
  setBackgroundColor(c) { this.bg = c; }
  getBackgroundColor() { return this.bg; }
  getContentSize() { return [1440, 900]; }
  // BrowserWindow.getMediaSourceId: the official I() reads the window number (w) before it asks the add-on, even when there is none.
  getMediaSourceId() { return 'window:42:0'; }
  isDestroyed() { return false; }
  once(name, fn) { (this.listeners[name] ??= []).push(fn); }
}
const theme = () => ({ shouldUseDarkColors: false, handlers: [], on(name, fn) { this.handlers.push(fn); } });
function setup({ asked = false, nativeGlass = null, systemVersion = '27.2.0' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'window-vibrancy-'));
  const file = path.join(dir, 'window-vibrancy.json');
  if (asked) fs.writeFileSync(file, JSON.stringify({ [V.ASKED_KEY]: true }));
  const logs = [];
  const nativeTheme = theme();
  const vib = V.createWindowVibrancy({ nativeTheme, windowColor: (dark) => (dark ? '#151515' : '#fcfcfb'), recordFile: () => file,
    log: { info: (m) => logs.push(m), warn: (m) => logs.push(m) }, systemVersion: () => systemVersion, nativeGlass });
  return { vib, file, logs, nativeTheme, record: () => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}) };
}
const request = (material, windowColor, extra = {}) => ({ material, windowColor, sidebarWidth: 280, ...extra });
const lastCss = (win) => { const s = win.webContents.scripts.at(-1); return s && JSON.parse(s.slice(s.lastIndexOf(')(') + 2, -1)); };

test('unr: opaque main window unless the page asked last run; then vibrancy "sidebar" at creation, taken off, record cleared', () => {
  const plain = setup();
  const w1 = plain.vib.createMainWindow({ width: 1 }, (o) => new FakeWindow(o));
  assert.equal(w1.options.vibrancy, undefined);
  assert.equal(plain.vib.canShow(w1), false);
  const asked = setup({ asked: true });
  const w2 = asked.vib.createMainWindow({ width: 1 }, (o) => new FakeWindow(o));
  assert.equal(w2.options.vibrancy, 'sidebar');
  assert.deepEqual(w2.calls, [['setVibrancy', null]]);
  assert.equal(asked.vib.canShow(w2), true);
  assert.equal(asked.record()[V.ASKED_KEY], undefined, 'lnr deletes the record once read');
});

test('without the native add-on glass is told no; the ask is recorded for the next main window', () => {
  const s = setup({ asked: true });
  const win = s.vib.createMainWindow({}, (o) => new FakeWindow(o));
  assert.equal(s.vib.implFor(win).showUnderSidebar(request('appkit-glass', 'solid:#fafafa')), false);
  assert.equal(s.record()[V.ASKED_KEY], true, 'fnr');
  assert.ok(s.logs.some((m) => m.includes('this app build has no glass')));
  assert.equal(s.vib.implFor(win).tintUnderSidebar({ red: 1, green: 2, blue: 3, alpha: 1 }), false);
  assert.equal(win.vibrancy, null);
});

test('W reads the major version as the official VA(): "26.x" is before 27, a version without a minor reads as 0 (not before 27)', () => {
  const old = setup({ asked: true, systemVersion: '26.4.1' });
  const w1 = old.vib.createMainWindow({}, (o) => new FakeWindow(o));
  assert.equal(old.vib.implFor(w1).showUnderSidebar(request('appkit-glass', 'solid:#fafafa')), false);
  assert.ok(old.logs.some((m) => m.includes("AppKit's glass under the sidebar needs macOS 27 or later")));
  const odd = setup({ asked: true, systemVersion: '26' });
  const w2 = odd.vib.createMainWindow({}, (o) => new FakeWindow(o));
  assert.equal(odd.vib.implFor(w2).showUnderSidebar(request('appkit-glass', 'solid:#fafafa')), false);
  assert.ok(!odd.logs.some((m) => m.includes('needs macOS 27')), 'VA: no minor → major 0 → W false; told no by I instead');
  assert.ok(odd.logs.some((m) => m.includes('this app build has no glass')));
});

test('a window not created able: sidebar material told no, asked recorded (quit and reopen)', () => {
  const s = setup();
  const win = s.vib.createMainWindow({}, (o) => new FakeWindow(o));
  assert.equal(s.vib.implFor(win).showUnderSidebar(request('sidebar', 'clear')), false);
  assert.equal(s.record()[V.ASKED_KEY], true);
  assert.ok(s.logs.some((m) => m.includes('Quit and reopen the app')));
  assert.deepEqual(win.calls, []);
});

test('able window: "sidebar" over "clear" shows the material, holds the window colour clear and cuts the page ground; clear undoes all', () => {
  const s = setup({ asked: true });
  const win = s.vib.createMainWindow({ backgroundColor: '#fcfcfb' }, (o) => new FakeWindow(o));
  const impl = s.vib.implFor(win);
  assert.equal(impl.showUnderSidebar(request('sidebar', 'clear')), true);
  assert.equal(win.vibrancy, 'sidebar');
  assert.equal(win.bg, '#00000000');
  assert.match(lastCss(win), /^body\{background-color:transparent !important\}body::before\{content:'';position:fixed;inset:0;z-index:-1;background-color:#fcfcfb;clip-path:inset\(0 0 0 280px\)\}/);
  // A theme repaint meanwhile (main.cjs nativeTheme "updated" → setBackgroundColor) is kept for the release, not applied.
  win.setBackgroundColor('#151515');
  assert.equal(win.bg, '#00000000');
  // Same request again: nothing new is set, the ground is unchanged.
  const scripts = win.webContents.scripts.length;
  assert.equal(impl.showUnderSidebar(request('sidebar', 'clear')), true);
  assert.equal(win.webContents.scripts.length, scripts);
  // A wider sidebar re-cuts; the cut is capped at half the window.
  impl.showUnderSidebar(request('sidebar', 'clear', { sidebarWidth: 2000 }));
  assert.match(lastCss(win), /inset\(0 0 0 720px\)/);
  impl.clear();
  assert.equal(win.vibrancy, null);
  assert.equal(lastCss(win), null, 'the ground style is removed');
  assert.equal(win.bg, '#151515', 'the colour set while held is restored');
  win.setBackgroundColor('#fcfcfb');
  assert.equal(win.bg, '#fcfcfb', 'setBackgroundColor is the window\'s own again');
});

test('unknown material or window colour: told no, nothing shown; a navigation switches the material off', () => {
  const s = setup({ asked: true });
  const win = s.vib.createMainWindow({}, (o) => new FakeWindow(o));
  const impl = s.vib.implFor(win);
  assert.equal(impl.showUnderSidebar(request('mica', 'clear')), false);
  assert.equal(impl.showUnderSidebar(request('sidebar', 'solid:#ffffff')), false);
  assert.equal(win.vibrancy, null);
  assert.equal(impl.showUnderSidebar(request('sidebar', 'keep')), true);
  assert.equal(win.bg, '#fcfcfb', '"keep" leaves the window colour');
  win.webContents.emit('did-navigate');
  assert.equal(win.vibrancy, null);
  assert.equal(s.vib.stateOf(win), null);
});

test('IPC: validated arguments, only a full main window\'s top frame is answered', async () => {
  const s = setup({ asked: true });
  const win = s.vib.createMainWindow({}, (o) => new FakeWindow(o));
  let handler;
  V.installWindowVibrancyIpc({ handle: (name, fn) => { assert.equal(name, V.IPC_CHANNEL); handler = fn; } }, s.vib, (event) => (event.sender === win.webContents ? win : null));
  const top = { sender: win.webContents, senderFrame: { parent: null } };
  assert.equal(await handler(top, 'showUnderSidebar', request('sidebar', 'clear')), true);
  assert.equal(await handler({ ...top, senderFrame: { parent: {} } }, 'showUnderSidebar', request('sidebar', 'clear')), false, 'a subframe is not answered');
  assert.equal(await handler({ sender: {}, senderFrame: { parent: null } }, 'tintUnderSidebar', { red: 0, green: 0, blue: 0, alpha: 1 }), false, 'another window');
  assert.equal(await handler(top, 'tintUnderSidebar', { red: 0, green: 0, blue: 0, alpha: 1 }), false, 'no glass, no tint');
  assert.equal(await handler(top, 'clearTintUnderSidebar'), undefined);
  assert.throws(() => handler(top, 'showUnderSidebar', { material: 'sidebar' }), /invalid argument/);
  assert.throws(() => handler(top, 'tintUnderSidebar', { red: 300, green: 0, blue: 0, alpha: 1 }), /invalid argument/);
  assert.throws(() => handler(top, 'setVibrancy', 'sidebar'), /Unknown WindowVibrancy method/);
  assert.equal(await handler(top, 'clear'), undefined);
  assert.equal(win.vibrancy, null);
});

test('preload exposes globalThis["claude.windowVibrancy"].WindowVibrancy with the four official methods over the host channel', async () => {
  const exposed = {}, invoked = [];
  const electron = {
    contextBridge: { exposeInMainWorld: (key, value) => { exposed[key] = value; } },
    ipcRenderer: { sendSync: () => null, invoke: (...args) => { invoked.push(args); return Promise.resolve(true); }, on() {}, removeListener() {}, send() {} },
    webUtils: { getPathForFile: () => '' },
  };
  vm.runInNewContext(fs.readFileSync(path.join(app, 'electron/preload.cjs'), 'utf8'), { require: () => electron, Promise });
  const api = exposed['claude.windowVibrancy']?.WindowVibrancy;
  assert.deepEqual(Object.keys(api), ['showUnderSidebar', 'clear', 'tintUnderSidebar', 'clearTintUnderSidebar']);
  for (const name of Object.keys(api)) assert.equal(typeof api[name], 'function');
  await api.showUnderSidebar(request('sidebar', 'clear'));
  await api.clearTintUnderSidebar();
  assert.deepEqual(invoked.map((a) => a.slice(0, 2)), [[V.IPC_CHANNEL, 'showUnderSidebar'], [V.IPC_CHANNEL, 'clearTintUnderSidebar']]);
  assert.ok(exposed.desktop, 'the host desktop API is unchanged');
});

test('main.cjs: full main windows go through unr; the IPC answers only full, non-pane main windows', () => {
  const main = fs.readFileSync(path.join(app, 'electron/main.cjs'), 'utf8');
  once(main, 'const window = windowVibrancy.createMainWindow({', 'createMainWindow builds through unr');
  once(main, '}, (options) => new BrowserWindow(options));', 'construct callback');
  once(main, 'return window && windowRegistry.fullWindows().includes(window) && !windowRegistry.isPaneWindow(window) ? window : null;', 'windowOf');
  const code = main.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
  assert.equal(code.split('vibrancy:').length - 1, 0, 'no other window takes a material');
});
