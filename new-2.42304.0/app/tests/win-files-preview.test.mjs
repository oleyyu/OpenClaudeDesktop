import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';

// The preview's .claude/launch.json watchers (Windows keeps a watched folder from being renamed or removed): they are
// closed on request for a folder about to go (closeWatchersUnder), and once no pane is subscribed. The stand-in
// Electron is preview-service.test.mjs's.
const require = createRequire(import.meta.url);
const { createPreviewService } = require('../electron/preview-service.cjs');

function fakeElectron() {
  const windows = new Map();
  const cdp = [];
  const partition = { handlers: {}, setPermissionRequestHandler(fn) { this.handlers.request = fn; }, setPermissionCheckHandler(fn) { this.handlers.check = fn; },
    on(event, fn) { this.handlers[event] = fn; }, webRequest: { onBeforeRequest(filter, fn) { partition.handlers.beforeRequest = fn; } }, getUserAgent: () => 'UA' };
  let nextId = 1;
  class Contents extends EventEmitter {
    constructor() {
      super();
      this.id = nextId++; this.url = ''; this.title = ''; this.entries = []; this.index = -1; this.session = partition; this.devtools = false; this.destroyed = false;
      this.navigationHistory = { canGoBack: () => this.index > 0, canGoForward: () => this.index < this.entries.length - 1, goBack: () => this.go(this.index - 1), goForward: () => this.go(this.index + 1) };
      this.debugger = { attached: false, attach: () => { this.debugger.attached = true; }, isAttached: () => this.debugger.attached, on() {},
        sendCommand: async (method, params) => { cdp.push([method, params]); return method === 'Page.captureScreenshot' ? { data: Buffer.from('png').toString('base64') } : {}; } };
    }
    isDestroyed() { return this.destroyed; }
    setWindowOpenHandler(fn) { this.openHandler = fn; }
    go(index) { this.index = index; this.url = this.entries[index]; this.emit('did-navigate', {}, this.url); }
    async loadURL(url) {
      this.emit('did-start-loading');
      this.entries = [...this.entries.slice(0, this.index + 1), url]; this.index = this.entries.length - 1; this.url = url; this.title = `Title of ${url}`;
      this.emit('did-navigate', {}, url);
      setImmediate(() => { this.emit('did-finish-load'); this.emit('did-stop-loading'); });
    }
    getURL() { return this.url; }
    getTitle() { return this.title; }
    isDevToolsOpened() { return this.devtools; }
    openDevTools() { this.devtools = true; } closeDevTools() { this.devtools = false; }
    reload() {} stop() {} focus() {} close() { this.destroyed = true; }
    async executeJavaScriptInIsolatedWorld() { return { ok: true }; }
  }
  class WebContentsView {
    constructor(options) { this.options = options; this.webContents = new Contents(); this.webContents.session = options.webPreferences.session; this.bounds = null; this.visible = true; }
    setBounds(bounds) { this.bounds = bounds; } setVisible(value) { this.visible = value; } setBackgroundColor() {}
  }
  class BrowserWindow extends EventEmitter {
    constructor(options = {}) { super(); this.options = options; this.children = new Set(); this.destroyed = false; this.contentView = { addChildView: (view) => this.children.add(view), removeChildView: (view) => this.children.delete(view) }; }
    isDestroyed() { return this.destroyed; } isVisible() { return this.options.show !== false; } destroy() { this.destroyed = true; this.emit('closed'); }
    static fromWebContents(sender) { return windows.get(sender) ?? null; }
  }
  const sender = (zoom = 1) => {
    const contents = Object.assign(new EventEmitter(), { sent: [], isDestroyed: () => false, getZoomFactor: () => zoom, send(channel, event) { this.sent.push(event); }, focus() {} });
    windows.set(contents, new BrowserWindow({ show: true }));
    return contents;
  };
  const opened = [];
  return { electron: { WebContentsView, BrowserWindow, session: { fromPartition: () => partition }, shell: { openExternal: async (url) => { opened.push(url); }, openPath: async () => '' }, nativeTheme: { shouldUseDarkColors: false } },
    partition, cdp, sender, windows, opened };
}


test('preview: closeWatchersUnder closes the launch.json watchers of a folder and those inside it; a pane re-arms them', async () => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-preview-')));
  fs.mkdirSync(path.join(dir, '.claude'));
  const fake = fakeElectron();
  const preview = createPreviewService({ ...worldOptions(processWorld()), electron: fake.electron, getSession: (id) => (id === 's1' ? { id, cwd: dir } : null), logger: { warn() {} } });
  try {
    const sender = fake.sender();
    await preview.call(sender, 'preview-state', { sessionId: 's1' });
    const record = preview._launchWatchers.get(dir);
    assert.ok(record?.folder && record?.claude, 'the folder and its .claude are watched while a pane shows it');
    assert.equal(preview.closeWatchersUnder(path.dirname(dir) + path.sep + 'elsewhere'), 0);
    assert.equal(preview.closeWatchersUnder(path.dirname(dir)), 1);
    assert.equal(preview._launchWatchers.size, 0);
    await preview.call(sender, 'preview-state', { sessionId: 's1' });
    assert.equal(preview._launchWatchers.size, 1, 'the next pane request watches it again');
    assert.equal(await preview.releaseFolder(dir), 0, 'no dev server ran there');
    assert.equal(preview._launchWatchers.size, 0);
    await preview.call(sender, 'preview-state', { sessionId: 's1' });
    // The pane's window goes: nobody is subscribed, the watchers close.
    sender.emit('destroyed');
    assert.equal(preview._launchWatchers.size, 0);
  } finally {
    await preview.dispose({ graceMs: 10 });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('custom commands: closeWatchersUnder lets go of a project folder (it may watch the project itself); list re-arms', async () => {
  const { createCustomCommands } = require('../electron/custom-commands.cjs');
  const data = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-commands-data-')));
  const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'win-commands-project-')));
  const handles = [];
  const watch = (dir) => { if (!fs.existsSync(dir)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); const handle = Object.assign(new EventEmitter(), { dir, closed: false, close() { this.closed = true; } }); handles.push(handle); return handle; };
  const commands = createCustomCommands({ app: { getPath: () => data }, shell: {}, dialog: {}, getConfig: () => ({}), watch });
  try {
    await commands.run({ op: 'list', cwd: project });
    assert.equal(commands.watcherCount(), 2);
    assert.ok(handles.some((handle) => handle.dir === project), 'no .code-desktop yet: the project folder itself is watched');
    assert.equal(commands.closeWatchersUnder(project), 1);
    assert.equal(commands.watcherCount(), 1, 'the global folder stays watched');
    assert.ok(handles.filter((handle) => handle.dir.startsWith(project)).every((handle) => handle.closed));
    await commands.run({ op: 'list', cwd: project });
    assert.equal(commands.watcherCount(), 2);
  } finally {
    commands.dispose();
    fs.rmSync(data, { recursive: true, force: true });
    fs.rmSync(project, { recursive: true, force: true });
  }
});
