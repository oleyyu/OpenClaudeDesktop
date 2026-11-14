// U-QUICK-ENTRY: the Quick Entry bar (electron/quick-entry) — the official page slices, the host page around them, the
// window's rules (official Vhi: Zhi / ngi) and the menu bar click.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { extractQuickWindow } from '../scripts/extract-quick-window.mjs';
import * as i18n from '../electron/i18n/index.mjs';

const require = createRequire(import.meta.url);
const official = require('../electron/generated/quick-window-official.cjs');
const { quickEntryPage, WIDTH, HEIGHT, HOST_STYLE, HOST_SCRIPT } = require('../electron/quick-entry/page.cjs');
const { createQuickEntry, openPosition, skoochPosition, targetMenuTemplate, sendable } = require('../electron/quick-entry/window.cjs');
const { createMenuBar } = require('../electron/menu-bar.cjs');
const root = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(root, '../reference/snapshots/claude-4.16336.0-20261104/asar/.vite/renderer/quick_window');

test('the generated slices are the frozen 4.16336.0 quick window, byte for byte', { skip: !fs.existsSync(snapshot) }, async () => {
  await extractQuickWindow({ check: true });
  const html = fs.readFileSync(path.join(snapshot, 'quick-window.html'), 'utf8');
  const script = fs.readFileSync(path.join(snapshot, 'assets/main-BIvVfet_.js'), 'utf8');
  for (const part of [official.htmlOpenTag, official.styleSheet, official.bodyOpenTag, official.bodyMarkup]) assert.ok(html.includes(part));
  for (const part of [official.themeScript, official.loadScript]) assert.ok(script.includes(part));
  assert.equal(official.referenceVersion, '4.16336.0');
});

test('the page runs the official slices unchanged and adds the target and send buttons after them', () => {
  const page = quickEntryPage({ fontBase: 'file:///app/dist/assets/v1/' });
  for (const part of [official.htmlOpenTag, official.styleSheet, official.bodyOpenTag, official.bodyMarkup, official.themeScript, official.loadScript]) assert.ok(page.includes(part));
  // Every name the official spans leave free is bound by the host before they run.
  const bindings = page.slice(page.indexOf('<script>'), page.indexOf(official.themeScript));
  for (const name of official.freeNames) assert.match(bindings, new RegExp(`const ${name.replace('$', '\\$')} = `));
  // The official fonts load from the app's own copies.
  for (const [name, shipped] of Object.entries(official.fonts)) {
    assert.ok(!page.includes(`url(./${name})`));
    assert.ok(page.includes(`url(file:///app/dist/assets/v1/${shipped})`));
    assert.ok(fs.existsSync(path.join(root, 'public/assets/v1', shipped)), `${shipped} ships with the app`);
  }
  // Host additions come after the official sheet and script, and never rewrite the official markup.
  assert.ok(page.indexOf(HOST_STYLE) > page.indexOf(official.styleSheet));
  assert.ok(page.indexOf(HOST_SCRIPT) > page.indexOf(official.loadScript));
  assert.match(HOST_SCRIPT, /zf\?\.requestDismiss\?\.\(input\.value\); input\.value = ""/);
  assert.match(HOST_STYLE, /\.container \{ max-width: none; min-height: 64px;/);
  assert.equal(WIDTH, 760);
  assert.equal(HEIGHT, 470);
});

test('ngi: only a prompt longer than two characters is sent', () => {
  assert.equal(sendable('abc'), true);
  assert.equal(sendable('  ab  '), false);
  assert.equal(sendable(''), false);
  assert.equal(sendable(null), false);
});

test('Qhi / $hi: centred in the primary work area, or back on the saved monitor', () => {
  const primary = { label: 'Built-in', bounds: { x: 0, y: 0, width: 1470, height: 956 }, workArea: { x: 0, y: 38, width: 1470, height: 918 }, workAreaSize: { width: 1470, height: 918 } };
  assert.deepEqual(openPosition(null, [primary], primary), { x: 355, y: 262 });
  const saved = { absolutePointInWorkspace: { x: 100, y: 138 }, monitor: { label: 'Built-in', bounds: { width: 1470, height: 956 }, workArea: { width: 1470, height: 918 } }, relativePointFromMonitor: { x: 100, y: 100 } };
  assert.deepEqual(openPosition(saved, [primary], primary), { x: 100, y: 138 });
  // The monitor is gone: the same relative place on the primary display.
  const other = { ...saved, monitor: { label: 'External', bounds: { width: 2940, height: 1912 }, workArea: { width: 2940, height: 1836 } }, relativePointFromMonitor: { x: 1470, y: 918 } };
  assert.deepEqual(openPosition(other, [primary], primary), { x: 735, y: 38 + 459 });
});

test('requestSkooch moves a container that leaves the work area back inside it', () => {
  const workArea = { x: 0, y: 38, width: 1470, height: 918 };
  assert.equal(skoochPosition([355, 262], workArea, 760, 64), null);
  assert.deepEqual(skoochPosition([355, 900], workArea, 760, 200), { x: 355, y: 956 - 200 - 30 });
  assert.deepEqual(skoochPosition([1000, 262], workArea, 760, 64), { x: 1470 - 760 - 30, y: 262 });
});

test('the target menu: Send to new chat, then Recent and the chats', () => {
  const labels = { sendToNewChat: 'Send to new chat', recent: 'Recent' };
  assert.deepEqual(targetMenuTemplate({ chats: [], target: null, labels }).map((row) => row.label), ['Send to new chat']);
  const chats = [{ chatId: 'a', chatName: 'Alpha' }, { chatId: 'b', chatName: 'Beta' }];
  const rows = targetMenuTemplate({ chats, target: chats[1], labels });
  assert.deepEqual(rows.map((row) => [row.type ?? 'normal', row.label ?? '', row.checked ?? null, row.enabled ?? null]),
    [['checkbox', 'Send to new chat', false, null], ['separator', '', null, null], ['normal', 'Recent', null, false], ['checkbox', 'Alpha', false, null], ['checkbox', 'Beta', true, null]]);
});

function harness({ chats = [], canOpen = () => true } = {}) {
  const submitted = [], saved = [], windows = [], menus = [];
  const handlers = new Map();
  class FakeWindow extends EventEmitter {
    constructor(options) { super(); this.options = options; this.visible = false; this.position = [options.x, options.y]; this.sent = []; windows.push(this);
      this.webContents = { send: (channel, payload) => this.sent.push([channel, payload]), setWindowOpenHandler() {}, on() {}, focus() {} }; }
    isDestroyed() { return false; } isVisible() { return this.visible; }
    show() { this.visible = true; } hide() { if (!this.visible) return; this.visible = false; this.emit('hide'); }
    focus() {} setAlwaysOnTop(...args) { this.onTop = args; } setFullScreenable() {} setHiddenInMissionControl() {} invalidateShadow() {}
    getPosition() { return this.position; } setPosition(x, y) { this.position = [x, y]; }
    loadFile() { queueMicrotask(() => this.emit('ready-to-show')); return Promise.resolve(); }
    destroy() { this.emit('closed'); }
  }
  const display = { label: 'Built-in', bounds: { x: 0, y: 0, width: 1470, height: 956 }, workArea: { x: 0, y: 38, width: 1470, height: 918 }, workAreaSize: { width: 1470, height: 918 } };
  const quickEntry = createQuickEntry({
    BrowserWindow: FakeWindow, screen: { getAllDisplays: () => [display], getPrimaryDisplay: () => display, getDisplayNearestPoint: () => display },
    ipcMain: { handle: (channel, fn) => handlers.set(channel, fn), removeHandler: (channel) => handlers.delete(channel) },
    Menu: { buildFromTemplate: (template) => { const menu = { template, popup: ({ callback }) => { menus.push(menu); menu.close = callback; } }; return menu; } },
    fs: { writeFileSync() {}, unlinkSync() {} }, tmpdir: () => '/tmp', fontBase: 'file:///fonts/', t: (source) => source, locale: () => 'en-US', canOpen,
    getRecentChats: () => chats, getSavedPosition: () => saved.at(-1) ?? null, savePosition: (record) => saved.push(record), submit: (payload) => submitted.push(payload), platform: 'linux', log: {},
  });
  const invoke = (name, ...args) => handlers.get(`quick-entry:${name}`)({ sender: windows[0].webContents }, ...args);
  return { quickEntry, submitted, saved, windows, menus, handlers, invoke };
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('the window follows Zhi: a floating panel, toggled, dismissed on blur, its position saved on hide', async () => {
  const h = harness();
  assert.equal(await h.quickEntry.toggle(), true);
  const [window] = h.windows;
  assert.deepEqual({ ...window.options, webPreferences: undefined, x: undefined, y: undefined }, { titleBarStyle: 'hidden', skipTaskbar: true, x: undefined, y: undefined, transparent: true,
    frame: false, hiddenInMissionControl: true, backgroundColor: '#00000000', hasShadow: true, resizable: false, minimizable: false, maximizable: false, type: 'panel', show: false,
    width: 760, height: 470, closable: false, webPreferences: undefined });
  assert.deepEqual(window.options.webPreferences.sandbox, true);
  assert.deepEqual(window.onTop, [true, 'pop-up-menu']);
  assert.equal(window.visible, true);
  assert.deepEqual(window.position, [355, 262]);
  // A second toggle dismisses; nothing is sent.
  assert.equal(await h.quickEntry.toggle(), true);
  assert.equal(window.visible, false);
  assert.equal(h.saved.at(-1).absolutePointInWorkspace.x, 355);
  await h.quickEntry.toggle();
  window.emit('blur');
  await settle();
  assert.equal(window.visible, false);
  assert.deepEqual(h.submitted, []);
  assert.equal(h.windows.length, 1, 'the window is created once and kept');
});

test('Enter sends to a new chat; the target menu sends to a recent chat and resets on hide', async () => {
  const h = harness({ chats: [{ chatId: 't1', chatName: 'First' }, { chatId: 't2', chatName: '' }, { chatId: 't1', chatName: 'dup' }] });
  await h.quickEntry.toggle();
  const [window] = h.windows;
  await h.invoke('requestDismiss', 'hi');
  await settle();
  assert.equal(window.visible, false);
  assert.deepEqual(h.submitted, [], 'a prompt under three characters only hides the bar');
  await h.quickEntry.toggle();
  await h.invoke('requestDismiss', 'hello there');
  await settle();
  assert.deepEqual(h.submitted, [{ text: 'hello there' }]);
  await h.quickEntry.toggle();
  const opened = h.invoke('openTargetMenu', { x: 10, y: 20 });
  const menu = h.menus.at(-1);
  assert.deepEqual(menu.template.map((row) => row.label ?? '-'), ['Send to new chat', '-', 'Recent', 'First', 'Untitled']);
  window.emit('blur');
  await settle();
  assert.equal(window.visible, true, 'the open menu does not dismiss the bar');
  menu.template[4].click();
  menu.close();
  await opened;
  assert.deepEqual((await h.invoke('getState')).target, { chatId: 't2', chatName: 'Untitled' });
  assert.deepEqual(window.sent.at(-1), ['quick-entry:state', await h.invoke('getState')]);
  await h.invoke('requestDismiss', 'and another thing');
  await settle();
  assert.deepEqual(h.submitted.at(-1), { text: 'and another thing', chatId: 't2' });
  assert.equal((await h.invoke('getState')).target, null);
  assert.deepEqual(await h.invoke('getInitialLocale'), { locale: 'en-US', messages: { S3MXlbjkax: 'What can I help you with today?' } });
  // Another web contents is not answered.
  assert.equal(await h.handlers.get('quick-entry:getState')({ sender: {} }), undefined);
});

test('Quick Entry that cannot open reports false, and the menu bar click then shows the app', async () => {
  const h = harness({ canOpen: () => false });
  assert.equal(await h.quickEntry.toggle(), false);
  assert.equal(h.windows.length, 0);
  const shown = [];
  const window = { isDestroyed: () => false, isMinimized: () => false, show: () => shown.push('show'), focus: () => shown.push('focus') };
  class Tray extends EventEmitter { setToolTip() {} isDestroyed() { return false; } destroy() {} }
  const trays = [];
  const bar = (quickEntry) => createMenuBar({ Tray: class extends Tray { constructor() { super(); trays.push(this); } }, Menu: {}, nativeImage: { createFromPath: () => ({}) }, app: { name: 'App' },
    iconPath: '', menuModel: {}, getWindow: () => window, getEnabled: () => true, getAccount: () => null, getClient: () => null, quickEntry });
  bar(() => Promise.resolve(false)).update();
  trays.at(-1).emit('click');
  await settle();
  assert.deepEqual(shown, ['show', 'focus']);
  shown.length = 0;
  bar(() => Promise.resolve(true)).update();
  trays.at(-1).emit('click');
  await settle();
  assert.deepEqual(shown, [], 'Quick Entry took the click');
  bar(undefined).update();
  trays.at(-1).emit('click');
  assert.deepEqual(shown, ['show', 'focus'], 'without Quick Entry the click shows the app at once');
});

test('Quick Entry copy has zh-CN, with the official zh-Hans placeholder', () => {
  const previous = i18n.getLocale();
  i18n.setLocale('zh-CN');
  try {
    assert.equal(i18n.t('What can I help you with today?'), '今天有什么可以帮您的？');
    for (const source of ['New Chat', 'Send to new chat', 'Recent', 'Send', 'Untitled', 'Keep chatting about...', 'Your Quick Entry message wasn’t sent. Try again.'])
      assert.notEqual(i18n.t(source), source, source);
  } finally { i18n.setLocale(previous); }
});

test('main.cjs and main.jsx wire Quick Entry through the existing paths', () => {
  const main = fs.readFileSync(path.join(root, 'electron/main.cjs'), 'utf8'), app = fs.readFileSync(path.join(root, 'src/main.jsx'), 'utf8');
  assert.match(main, /quickEntry:\(\)=>quickEntry\.toggle\(\)/);
  assert.match(main, /const QUICK_ENTRY_DEFAULT_ACCELERATOR = "Alt\+Space";/);
  assert.match(main, /windowRegistry\.send\(win, \{ kind: "quick-entry-submit", text, \.\.\.\(chatId \? \{ sessionId: chatId \} : \{\}\) \}\);/);
  // The transparent bar is one of the app's own overlays: it never gets the window background or the quit prompt.
  assert.match(main, /const computerUseOwnOverlay = .*\|\| \(!!quickEntry && quickEntry\.window\(\) === window\);/);
  assert.match(app, /if \(e\.kind === "quick-entry-submit" && side === 0 && !PANE_WINDOW\) quickEntrySubmit\.current\?\.\(e\);/);
  assert.match(app, /sendMessage\(text, \[\], \[\], \{ demonstration: \{ input, title: firstMessageName\(text, \[\], \{ max: 64 \}\), newSession: sessionId === null \} \}\)/);
});
