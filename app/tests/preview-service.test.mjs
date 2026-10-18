// The preview service's renderer requests and safety rules (electron/preview-service.cjs) with stand-in Electron
// objects; dev servers are stand-in processes on stand-in sockets (tests/fixtures/preview-r3b-world.mjs: no real port,
// process, lsof or ps), run from a temp folder's .claude/launch.json. The real WebContentsView path runs in
// preview-service-electron.test.mjs (opt-in).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { processWorld, worldOptions } from './fixtures/preview-r3b-world.mjs';

const require = createRequire(import.meta.url);
const { createPreviewService, previewShortcut } = require('../electron/preview-service.cjs');

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

// One stand-in world for the file; each test's ports are its own (nothing in the world holds them until a test does).
const world = processWorld();
let nextTestPort = 41000;
const freePort = async () => nextTestPort++;
function project(configurations) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-service-'));
  fs.mkdirSync(path.join(dir, '.claude'));
  fs.writeFileSync(path.join(dir, 'server.js'), 'require("node:http").createServer((q, s) => s.end("ok")).listen(Number(process.env.PORT), "127.0.0.1", () => console.log("listening " + process.env.PORT));');
  if (configurations) fs.writeFileSync(path.join(dir, '.claude/launch.json'), JSON.stringify({ version: '0.0.1', configurations }));
  return dir;
}

function service(cwd, fake = fakeElectron()) {
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === 's1' || id === 's2' ? { id, cwd } : null), spawnEnv: async () => ({ ...process.env }), logger: { warn() {} } });
  return { fake, instance };
}

test('renderer requests are validated: unknown action, unknown session, unsafe addresses, bad viewports', async (t) => {
  const cwd = project([{ name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port: 4999 }]);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  await assert.rejects(instance.call(sender, 'preview-nope', { sessionId: 's1' }), /Unknown operation/);
  await assert.rejects(instance.call(sender, 'preview-state', { sessionId: 'other' }), /Unknown session/);
  const state = await instance.call(sender, 'preview-state', { sessionId: 's1' });
  assert.deepEqual(state.launch.configs, [{ name: 'web', port: 4999, url: 'http://localhost:4999', attach: false }]);
  assert.equal(state.hasPage, false);
  await assert.rejects(instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'chrome://settings' }), /web pages \(http and https\)/);
  await assert.rejects(instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'file:///etc/hosts' }), /session’s folder only/);
  await assert.rejects(instance.call(sender, 'preview-emulate', { sessionId: 's1', preset: 'watch' }), /Unknown viewport preset/);
  await assert.rejects(instance.call(sender, 'preview-emulate', { sessionId: 's1', preset: 'custom', width: 50, height: 50 }), /200–4000/);
  await assert.rejects(instance.call(sender, 'preview-emulate', { sessionId: 's1', colorScheme: 'sepia' }), /Unknown color scheme/);
  await assert.rejects(instance.call(sender, 'preview-capture', { sessionId: 's1' }), /Nothing is open/);
  await assert.rejects(instance.call(sender, 'preview-external', { sessionId: 's1' }), /only works for websites/);
  await assert.rejects(instance.call(sender, 'preview-attach', { sessionId: 's1' }), /Unknown preview pane/);
});

test('the partition denies permissions and downloads, and file loads outside the folder', async (t) => {
  const cwd = project(null);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'localhost:3000' });
  const { handlers } = fake.partition;
  const ask = (permission, requestingUrl) => new Promise((resolve) => handlers.request(null, permission, resolve, { requestingUrl }));
  assert.equal(await ask('media', 'http://localhost:3000/'), false);
  assert.equal(await ask('notifications', 'http://localhost:3000/'), false);
  assert.equal(await ask('clipboard-sanitized-write', 'http://localhost:3000/'), true);
  assert.equal(await ask('clipboard-sanitized-write', 'https://example.com/'), false);
  assert.equal(handlers.check(null, 'geolocation', 'http://localhost:3000'), false);
  let prevented = false;
  handlers['will-download']({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true, 'downloads are refused');
  const view = instance._previews.get('s1').view;
  const fileRequest = (url) => new Promise((resolve) => handlers.beforeRequest({ url, webContentsId: view.webContents.id }, resolve));
  assert.deepEqual(await fileRequest(`file://${cwd}/index.html`), { cancel: false });
  assert.deepEqual(await fileRequest('file:///etc/passwd'), { cancel: true });
  // Outside hosts: a page the user opened reaches them; a local file page the agent drives reaches only allowed ones.
  const subresource = (url, resourceType = 'xhr') => new Promise((resolve) => handlers.beforeRequest({ url, resourceType, webContentsId: view.webContents.id }, resolve));
  assert.deepEqual(await subresource('https://cdn.example.com/a.js', 'script'), { cancel: false }, 'the user\'s own page');
  const entry = instance._previews.get('s1');
  entry.agentDriven = true;
  assert.deepEqual(await subresource('https://evil.example.com/?d=x'), { cancel: false }, 'a localhost dev page keeps its outside requests');
  view.webContents.url = `file://${cwd}/index.html`;
  assert.deepEqual(await subresource('https://evil.example.com/?d=x'), { cancel: true }, 'an agent-driven file page reaches no outside host');
  assert.deepEqual(await subresource('wss://evil.example.com/s'), { cancel: true });
  assert.deepEqual(await subresource('http://localhost:5173/api'), { cancel: false });
  assert.deepEqual(await subresource('https://evil.example.com/', 'mainFrame'), { cancel: false }, 'navigations have their own gate (holdOutside)');
  assert.match(entry.console.at(-1).text, /blocked a request to evil\.example\.com/);
  entry.approvedHosts.add('api.example.com');
  assert.deepEqual(await subresource('https://api.example.com/v1'), { cancel: false }, 'a site allowed in this session');
  entry.agentDriven = false;
  assert.equal(view.options.webPreferences.nodeIntegration, false);
  assert.equal(view.options.webPreferences.contextIsolation, true);
  assert.equal(view.options.webPreferences.sandbox, true);
  assert.equal(view.options.webPreferences.disableDialogs, true);
});

test('a download from a shown page gets the Save dialog in Downloads; an unseen page\'s download is cancelled and says why', async (t) => {
  const cwd = project(null);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  const entry = instance._previews.get('s1');
  const item = (name) => Object.assign(new EventEmitter(), { options: null, getFilename: () => name, setSaveDialogOptions(options) { this.options = options; }, getSavePath: () => '', getURLChain: () => ['http://localhost:3000/download'], getURL: () => 'http://localhost:3000/download' });
  // Nobody shows the page (parked): no dialog could reach the user.
  let prevented = false;
  const unseen = item('report.csv');
  fake.partition.handlers['will-download']({ preventDefault: () => { prevented = true; } }, unseen, entry.view.webContents);
  assert.equal(prevented, true);
  assert.equal(unseen.options, null);
  assert.match(entry.console.at(-1).text, /didn’t download report\.csv: the preview isn’t on screen/);
  let state = await instance.call(sender, 'preview-state', { sessionId: 's1' });
  assert.deepEqual({ ...state.download, at: 0 }, { file: 'report.csv', state: 'cancelled', reason: 'not-shown', at: 0, canReveal: false });
  // Shown in a pane: the download runs, through the system Save dialog that starts in Downloads.
  await instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width: 300, height: 300 }, visible: true });
  prevented = false;
  const shown = item('report.csv');
  fake.partition.handlers['will-download']({ preventDefault: () => { prevented = true; } }, shown, entry.view.webContents);
  assert.equal(prevented, false, 'the download proceeds');
  assert.equal(shown.options.defaultPath, path.join(os.homedir(), 'Downloads', 'report.csv'));
  assert.equal((await instance.call(sender, 'preview-state', { sessionId: 's1' })).download.state, 'saving');
  const saved = path.join(cwd, 'report.csv');
  fs.writeFileSync(saved, 'a,b\n');
  shown.getSavePath = () => saved;
  shown.emit('done', {}, 'completed');
  state = await instance.call(sender, 'preview-state', { sessionId: 's1' });
  assert.equal(state.download.state, 'completed');
  assert.equal(state.download.canReveal, true);
  // A download nobody's page started (another contents) is refused.
  prevented = false;
  fake.partition.handlers['will-download']({ preventDefault: () => { prevented = true; } }, item('x.bin'), { id: 9999 });
  assert.equal(prevented, true);
});

test('the pane showing the page holds it; another pane is refused until it lets go; a pane that leaves parks it', async (t) => {
  const cwd = project(null);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const first = fake.sender(1.25), second = fake.sender();
  const attach = (sender, instanceId, patch = {}) => instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId, bounds: { x: 0, y: 0, width: 200, height: 200 }, visible: true, ...patch });
  await instance.call(first, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  const entry = instance._previews.get('s1');
  const parking = entry.parent;
  assert.equal(parking.options.show, false, 'a page nobody shows lives in a hidden window');
  let state = await attach(first, 'pane-a', { bounds: { x: 100, y: 40, width: 400, height: 300 } });
  assert.equal(state.hostId, 'pane-a');
  assert.equal(entry.parent, fake.windows.get(first));
  assert.deepEqual(entry.view.bounds, { x: 125, y: 50, width: 500, height: 375 }, 'CSS pixels scaled by the window zoom');
  assert.equal(entry.view.visible, true);
  // 2.2553.1 showPreview: a non-owner claimant is refused while the owner shows the page; its hide is ignored too.
  state = await attach(second, 'pane-b');
  assert.equal(state.hostId, 'pane-a', 'a second pane does not take the page');
  assert.equal(state.hasPage, true, 'it still knows there is a page (and paints its empty viewport)');
  assert.equal(entry.parent, fake.windows.get(first));
  await attach(second, 'pane-b', { visible: false });
  await instance.call(second, 'preview-detach', { sessionId: 's1', instanceId: 'pane-b' });
  assert.equal(entry.parent, fake.windows.get(first), 'another pane’s hide leaves the page where it is');
  assert.equal(entry.view.visible, true);
  // The holder hides it (start page, collapsed pane): it lets go, and the next pane that shows the page takes it.
  state = await attach(first, 'pane-a', { visible: false });
  assert.equal(state.hostId, null, 'nobody shows the page');
  state = await attach(second, 'pane-b');
  assert.equal(state.hostId, 'pane-b');
  assert.equal(entry.parent, fake.windows.get(second));
  state = await attach(first, 'pane-a');
  assert.equal(state.hostId, 'pane-b', 'the first pane is refused now');
  // An overlay over the holder hides the page behind a capture — and lets go of it, like 2.2553.1's occluded slot.
  const occluded = await instance.call(second, 'preview-occlude', { sessionId: 's1', instanceId: 'pane-b', occluded: true });
  assert.match(occluded.image, /^data:image\/jpeg;base64,/);
  assert.equal(entry.view.visible, false, 'hidden while an overlay covers it');
  assert.equal(instance.snapshot('s1').hostId, null);
  await instance.call(second, 'preview-occlude', { sessionId: 's1', instanceId: 'pane-b', occluded: false });
  assert.equal(entry.view.visible, true);
  assert.equal(instance.snapshot('s1').hostId, 'pane-b', 'nobody took it meanwhile, so it shows again');
  await instance.call(second, 'preview-occlude', { sessionId: 's1', instanceId: 'pane-b', occluded: true });
  state = await attach(first, 'pane-a');
  assert.equal(state.hostId, 'pane-a', 'a pane takes the page while the holder is covered');
  assert.equal(entry.view.visible, true, 'the cover over the other pane does not hide it here');
  await instance.call(second, 'preview-occlude', { sessionId: 's1', instanceId: 'pane-b', occluded: false });
  assert.equal(entry.parent, fake.windows.get(first), 'the covered pane does not get it back when the cover leaves');
  await instance.call(first, 'preview-detach', { sessionId: 's1', instanceId: 'pane-a' });
  assert.equal(entry.parent.options.show, false, 'parked again');
  assert.equal(instance.snapshot('s1').hostId, null);
  assert.equal((await instance.call(first, 'preview-state', { sessionId: 's1' })).url, 'http://localhost:3000/');
});

test('a page nobody shows is closed after the reap delay and reopens at its address; outside sites and dev servers stay', async (t) => {
  const port = await freePort();
  const cwd = project([{ name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port }]);
  const fake = fakeElectron();
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === 's1' || id === 's2' ? { id, cwd } : null), spawnEnv: async () => ({ ...process.env }), logger: { warn() {} }, reapHiddenMs: 40 });
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const started = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
  assert.equal(started.ok, true, started.message);
  const entry = instance._previews.get('s1');
  const url = entry.url;
  await instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width: 300, height: 300 }, visible: true });
  await wait(90);
  assert.ok(entry.view, 'a shown page is never reaped');
  entry.console.push({ level: 'error', text: 'old error', url: '', line: null, time: 0 });
  const firstView = entry.view;
  await instance.call(sender, 'preview-detach', { sessionId: 's1', instanceId: 'pane' });
  await wait(90);
  assert.equal(entry.view, null, 'reaped once nobody showed it for the delay');
  assert.equal(firstView.webContents.isDestroyed(), true);
  assert.equal(entry.parent, null);
  const snapshot = instance.snapshot('s1');
  assert.equal(snapshot.hasPage, true, 'the pane still offers the page');
  assert.equal(snapshot.url, url);
  assert.equal(snapshot.servers.find((server) => server.name === 'web').status, 'running', 'the dev server keeps running');
  const agent = instance.forSession({ id: 's1', cwd });
  assert.equal(agent.consoleMessages(), null, 'earlier console output is gone (the tool says so)');
  assert.equal(agent.networkRequests(), null);
  assert.equal(agent.list().page.reclaimed, true);
  // The agent's next page tool reopens it, unseen, at the same address.
  const shot = await agent.screenshot();
  assert.equal(shot.mimeType, 'image/jpeg');
  assert.ok(entry.view && entry.view !== firstView, 'a new page');
  assert.equal(entry.view.webContents.getURL(), url);
  assert.deepEqual(agent.consoleMessages(), [], 'fresh output');
  assert.equal(entry.parent.options.show, false, 'in the parking window');
  // Showing a pane reopens a reaped page too.
  await wait(90);
  assert.equal(entry.view, null, 'reaped again');
  await instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width: 300, height: 300 }, visible: true });
  assert.ok(entry.view, 'the pane reopens it');
  assert.equal(entry.parent, fake.windows.get(sender));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(entry.view.webContents.getURL(), url);
  // An outside site is never reaped (2.2553.1 reaps port and static previews only).
  const outside = instance.forSession({ id: 's2', cwd }, { requestApproval: async () => true });
  await outside.navigate('https://example.com/');
  await wait(90);
  assert.ok(instance._previews.get('s2').view, 'an outside site stays open');
  await instance.call(sender, 'preview-server-stop', { sessionId: 's1', name: 'web' });
});

test('viewport presets and the color scheme go to CDP emulation; screenshots come from CDP', async (t) => {
  const cwd = project(null);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  await instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'pane', bounds: { x: 0, y: 0, width: 300, height: 600 }, visible: true });
  const viewport = await instance.call(sender, 'preview-emulate', { sessionId: 's1', preset: 'mobile', colorScheme: 'dark' });
  assert.deepEqual(viewport, { preset: 'mobile', width: 375, height: 812, colorScheme: 'dark', setByAgent: false });
  await instance._previews.get('s1').emulating;
  const metrics = fake.cdp.filter(([method]) => method === 'Emulation.setDeviceMetricsOverride').at(-1)[1];
  assert.equal(metrics.width, 375);
  assert.equal(metrics.mobile, true);
  assert.ok(metrics.scale < 1, 'scaled to fit the pane');
  const view = instance._previews.get('s1').view;
  assert.ok(view.bounds.width <= 300 && view.bounds.height <= 600);
  assert.deepEqual(fake.cdp.filter(([method]) => method === 'Emulation.setEmulatedMedia').at(-1)[1], { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  assert.ok(fake.cdp.some(([method, params]) => method === 'Emulation.setUserAgentOverride' && /Android/.test(params.userAgent)));
  const shot = await instance.call(sender, 'preview-capture', { sessionId: 's1' });
  assert.equal(Buffer.from(shot.bytes).toString(), 'png');
  assert.equal(shot.type, 'image/png');
  assert.equal(shot.displayWidth, view.bounds.width, 'capture carries the native displayed width for density-correct drawing');
});

test('dev servers: start from launch.json, reuse, logs, stop; busy port, autoPort and a missing command', async (t) => {
  const port = await freePort();
  const busyPort = await freePort();
  const busy = { close: world.occupy(busyPort) };
  const cwd = project([
    { name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port },
    { name: 'clash', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port: busyPort, autoPort: false },
    { name: 'auto', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port: busyPort, autoPort: true },
    { name: 'ghost', runtimeExecutable: 'definitely-not-a-command-xyz', port: await freePort() },
  ]);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); busy.close(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const started = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' });
  assert.equal(started.ok, true, started.message);
  assert.equal(started.server.status, 'running');
  assert.match(instance.snapshot('s1').url, new RegExp(`^http://localhost:${port}/?$`));
  assert.equal(instance.snapshot('s2').servers.find((server) => server.name === 'web').status, 'running', 'sessions of the same folder share the server');
  const serverAsks = [];
  const agent = instance.forSession({ id: 's2', cwd }, { requestApproval: async (request) => { serverAsks.push(request); return true; } });
  const again = await agent.start({ name: 'web' });
  assert.equal(again.reused, true);
  assert.deepEqual(serverAsks, [], 'a server already running starts nothing, so nothing is asked');
  const logs = await instance.call(sender, 'preview-server-logs', { sessionId: 's1', name: 'web' });
  assert.ok(logs.lines.some((line) => line.includes(`listening ${port}`)), logs.lines.join('\n'));
  // "autoPort": false never moves (2.42304.0 I2i → k2i).
  const clash = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'clash' });
  assert.deepEqual({ ok: clash.ok, code: clash.code }, { ok: false, code: 'port-in-use' });
  assert.match(clash.message, new RegExp(`^Port ${busyPort} is required by this server but is in use by another process\\.`));
  // "autoPort": true takes the next free port (P2i), no longer an OS-assigned one.
  const auto = await agent.start({ name: 'auto' });
  assert.equal(auto.server.port, busyPort + 1);
  assert.equal(auto.assignedPort, auto.server.port);
  assert.equal(auto.movedFrom, busyPort);
  assert.deepEqual(serverAsks.map(({ kind, name, command, args, cwd: folder }) => ({ kind, name, command, args, folder })),
    [{ kind: 'preview-server', name: 'auto', command: process.execPath, args: ['server.js'], folder: cwd }], 'the agent starting a command asks first, with the exact command line');
  // The card's "Runs in {cwd} on port {port}" (2.42304.0 c96d752d0 Kk / wA): the configured port, and (a0i) "(or the
  // next free port)" since an autoPort configuration may move (preview-01).
  assert.deepEqual(serverAsks.map(({ port, portMayReassign }) => ({ port, portMayReassign })), [{ port: busyPort, portMayReassign: true }]);
  const ghost = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'ghost' });
  assert.deepEqual({ ok: ghost.ok, code: ghost.code }, { ok: false, code: 'not-found' });
  const missing = await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'nope' });
  assert.equal(missing.code, 'no-server');
  await instance.call(sender, 'preview-server-stop', { sessionId: 's1', name: 'web' });
  assert.equal(instance.snapshot('s1').servers.find((server) => server.name === 'web').status, 'stopped');
  await agent.stop('auto');
});

test('the agent asks once per outside site; localhost never asks', async (t) => {
  const cwd = project(null);
  const { instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const asked = [];
  let answer = false;
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request); return answer; } });
  await agent.navigate('http://localhost:3000/');
  assert.deepEqual(asked, []);
  await assert.rejects(agent.navigate('https://example.com/'), /didn’t allow opening example\.com/);
  answer = true;
  await assert.rejects(agent.navigate('https://example.com/a'), /didn’t allow opening example\.com/, 'a declined site stays declined in this session');
  assert.deepEqual(asked.map((request) => request.host), ['example.com'], 'and is never asked about again');
  await agent.navigate('https://example.org/a');
  await agent.navigate('https://example.org/b');
  assert.deepEqual(asked.map((request) => request.host), ['example.com', 'example.org'], 'an allowed site is remembered');
  await assert.rejects(agent.click({}), /Name an element/);
});

test('the host window comes from the injected lookup (window registry); a closed window parks its pages', async (t) => {
  const cwd = project(null);
  const fake = fakeElectron();
  const asked = [];
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === 's1' || id === 's2' ? { id, cwd } : null), logger: { warn() {} },
    hostWindow: (sender) => { asked.push(sender); return fake.windows.get(sender) ?? null; } });
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const window = fake.windows.get(sender);
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  await instance.call(sender, 'preview-navigate', { sessionId: 's2', url: 'http://localhost:4000/' });
  // Two split sides of one window: two sessions, two views, side by side in the same window.
  await instance.call(sender, 'preview-attach', { sessionId: 's1', instanceId: 'left', bounds: { x: 0, y: 0, width: 300, height: 400 }, visible: true });
  await instance.call(sender, 'preview-attach', { sessionId: 's2', instanceId: 'right', bounds: { x: 640, y: 0, width: 300, height: 400 }, visible: true });
  assert.ok(asked.includes(sender));
  const left = instance._previews.get('s1'), right = instance._previews.get('s2');
  assert.equal(left.parent, window);
  assert.equal(right.parent, window);
  assert.equal(right.view.bounds.x, 640);
  instance.windowClosed(window);
  assert.notEqual(left.parent, window);
  assert.equal(left.parent.options.show, false, 'parked in the hidden window');
  assert.equal(right.parent.options.show, false);
  assert.equal(instance.snapshot('s1').hostId, null);
});

test('the agent starts a launch.json command only after the user approves that exact configuration', async (t) => {
  const port = await freePort();
  const cwd = project([
    { name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port },
    { name: 'site', url: `http://localhost:${port}` },
  ]);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const asked = [];
  let answer = false;
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request); return answer; } });
  await assert.rejects(agent.start({ name: 'web' }), (error) => error.code === 'declined' && /didn’t allow starting “web”\. Nothing was run\./.test(error.message));
  assert.equal(instance._servers.size, 0, 'a declined command never runs');
  answer = true;
  const started = await agent.start({ name: 'web' });
  assert.equal(started.server.status, 'running');
  // The configured port is the card's "on port {port}" (c96d752d0 Kk / wA); this entry has no "autoPort" and a start
  // command that pins no port, so it may move ("(or the next free port)", a0i).
  assert.deepEqual(asked.map(({ port, portMayReassign }) => ({ port, portMayReassign })), [{ port, portMayReassign: true }, { port, portMayReassign: true }]);
  await agent.stop('web');
  await agent.start({ name: 'web' });
  assert.equal(asked.length, 2, 'approved once per configuration and session');
  await agent.stop('web');
  // An edited launch.json is a new command: asked again.
  fs.writeFileSync(path.join(cwd, '.claude/launch.json'), JSON.stringify({ version: '0.0.1', configurations: [{ name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js', '--edited'], port }] }));
  await agent.start({ name: 'web' });
  assert.equal(asked.length, 3);
  assert.deepEqual(asked[2].args, ['server.js', '--edited']);
  await agent.stop('web');
  // Another session asks for itself; the user's own Start never asks.
  const other = instance.forSession({ id: 's2', cwd }, { requestApproval: async (request) => { asked.push(request); return false; } });
  await assert.rejects(other.start({ name: 'web' }), /didn’t allow starting/);
  const sender = fake.sender();
  const own = await instance.call(sender, 'preview-server-start', { sessionId: 's2', name: 'web' });
  assert.equal(own.ok, true, own.message);
  assert.equal(asked.length, 4);
  await instance.call(sender, 'preview-server-stop', { sessionId: 's2', name: 'web' });
  // A stopped turn (the call's signal) asks nothing and runs nothing.
  const controller = new AbortController();
  controller.abort();
  const stopped = instance.forSession({ id: 's2', cwd }, { requestApproval: async (request) => { asked.push(request); return true; }, signal: controller.signal });
  await assert.rejects(stopped.start({ name: 'web' }), /The turn was stopped\. Nothing was run\./);
  assert.equal(asked.length, 4);
});

test('a page the agent drives never leaves for an outside site the user hasn’t allowed (links, redirects, popups)', async (t) => {
  const cwd = project(null);
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const asked = [];
  let answer = false;
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request); return answer; } });
  await agent.navigate('http://localhost:3000/');
  const contents = instance._previews.get('s1').view.webContents;
  const navigate = (event, url) => { let prevented = false; contents.emit(event, { preventDefault: () => { prevented = true; } }, url); return prevented; };
  assert.equal(navigate('will-navigate', 'http://localhost:3000/next'), false, 'localhost needs no approval');
  assert.equal(navigate('will-navigate', 'https://evil.example/?d=secret'), true, 'an outside site is held');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(asked.map((request) => [request.kind, request.host]), [['preview-site', 'evil.example']]);
  assert.equal(contents.getURL(), 'http://localhost:3000/', 'declined: the page stays');
  assert.equal(navigate('will-redirect', 'https://evil.example/again'), true, 'a declined site stays blocked');
  contents.openHandler({ url: 'https://evil.example/popup' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(asked.length, 1, 'and is not asked about again');
  await assert.rejects(agent.navigate('https://evil.example/'), /didn’t allow opening evil\.example/);
  assert.equal(asked.length, 1);
  // The click's result names the site it was kept from.
  contents.executeJavaScriptInIsolatedWorld = async () => { navigate('will-navigate', 'https://evil.example/clicked'); return { ok: true }; };
  const clicked = await agent.click({ selector: 'a' });
  assert.deepEqual(clicked.blocked, { host: 'evil.example', declined: true });
  assert.equal(clicked.url, 'http://localhost:3000/');
  // An allowed site opens once the user allows it.
  answer = true;
  assert.equal(navigate('will-navigate', 'https://docs.example/page'), true);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(contents.getURL(), 'https://docs.example/page');
  assert.equal(navigate('will-navigate', 'https://docs.example/other'), false, 'remembered');
  // The user's own address-bar navigation hands the page back: their browsing isn't held.
  const sender = fake.sender();
  await instance.call(sender, 'preview-navigate', { sessionId: 's1', url: 'http://localhost:3000/' });
  assert.equal(navigate('will-navigate', 'https://elsewhere.example/'), false);
});

test('previewShortcut: the pane chords pressed inside the page (⇧⌘X Annotate, ⌘W close, ⌘L address); others stay the page\'s', () => {
  const mac = process.platform === 'darwin';
  const press = (key, mods = {}) => ({ type: 'keyDown', key, meta: mac, control: !mac, shift: false, alt: false, ...mods });
  assert.equal(previewShortcut(press('X', { shift: true })), 'sketch');
  assert.equal(previewShortcut(press('S', { shift: true })), 'selection');
  assert.equal(previewShortcut(press('S', { shift: true, isComposing: true })), null);
  assert.equal(previewShortcut(press('S', { shift: true, keyCode: 229 })), null);
  assert.equal(previewShortcut(press('w')), 'close');
  assert.equal(previewShortcut(press('l')), 'address');
  assert.equal(previewShortcut(press('x')), null, '⌘X is the page\'s cut');
  assert.equal(previewShortcut(press('w', { shift: true })), null);
  assert.equal(previewShortcut(press('w', { alt: true })), null);
  assert.equal(previewShortcut({ ...press('w'), type: 'keyUp' }), null);
  assert.equal(previewShortcut({ ...press('w'), isAutoRepeat: true }), null);
  assert.equal(previewShortcut(press('w', { meta: false, control: false })), null);
});

test('a .claude/launch.json written while the pane is open reaches it without reopening the pane', async (t) => {
  const cwd = project();
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const state = await instance.call(sender, 'preview-state', { sessionId: 's1' });
  assert.equal(state.launch.exists, false);
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.claude/launch.json'), JSON.stringify({ version: '0.0.1', configurations: [{ name: 'web', runtimeExecutable: 'npm', runtimeArgs: ['run', 'dev'], port: 5288 }] }));
  const seen = () => sender.sent.some((event) => event.kind === 'preview' && event.state.launch.configs.some((config) => config.name === 'web'));
  for (let i = 0; i < 60 && !seen(); i++) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(seen(), 'the pane got the new configuration');
});

test('start page detection: preview-detect lists package.json scripts; preview-use-server creates, appends, refuses (addServerFromCandidate)', async (t) => {
  const cwd = project();
  const { fake, instance } = service(cwd);
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ scripts: { dev: 'vite', start: 'node server.js', build: 'vite build' } }));
  fs.writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), '');
  fs.writeFileSync(path.join(cwd, 'vite.config.ts'), '');
  const found = await instance.call(sender, 'preview-detect', { sessionId: 's1' });
  assert.deepEqual(found.map((c) => [c.name, c.runtimeExecutable, c.runtimeArgs.join(' '), c.port, c.framework, c.validation.status]),
    [['dev', 'pnpm', 'run dev', 5173, 'vite', 'ok'], ['start', 'pnpm', 'run start', 5173, 'vite', 'ok']]);
  const file = path.join(cwd, '.claude/launch.json');
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: found[0] }), { ok: true, name: 'dev' });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).configurations, [{ name: 'dev', runtimeExecutable: 'pnpm', runtimeArgs: ['run', 'dev'], port: 5173 }]);
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: { ...found[0], name: 'DEV' } }), { ok: false, reason: 'name-exists' });
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: found[1] }), { ok: true, name: 'start' });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).configurations.map((c) => c.name), ['dev', 'start']);
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: { ...found[0], runtimeArgs: ['run', 'build && rm -rf ~'] } }), { ok: false, reason: 'shell-metachar' });
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: { ...found[0], runtimeArgs: ['run', 'serve'] } }), { ok: false, reason: 'script-not-found' });
  assert.deepEqual(await instance.call(sender, 'preview-use-server', { sessionId: 's1', candidate: { ...found[0], runtimeExecutable: 'sh' } }), { ok: false, reason: 'runner-not-allowed' });
  const state = await instance.call(sender, 'preview-state', { sessionId: 's1' });
  assert.deepEqual(state.launch.configs.map((c) => c.name), ['dev', 'start']);
});

test('preview tabs retain independent native pages and history, isolate background events and validate ownership', async t => {
  const cwd = project(), { fake, instance } = service(cwd), sender = fake.sender();
  t.after(async () => { await instance.dispose(); fs.rmSync(cwd, { recursive:true, force:true }); });
  const call = (action, extra={}) => instance.call(sender, action, {sessionId:'s1', ...extra});
  const initial = await call('preview-state'); assert.deepEqual(initial.tabs, []);
  await call('preview-navigate', {url:'http://localhost:3000/'});
  await call('preview-navigate', {url:'http://localhost:3000/about'});
  await call('preview-attach', {instanceId:'pane', bounds:{x:0,y:0,width:400,height:300}, visible:true});
  const first = instance._previews.get('s1'), view = first.view;
  const secondState = await call('preview-tab-new'), second = instance._previews.get('s1');
  assert.equal(secondState.tabs.length,2); assert.equal(first.visible,false); assert.notEqual(first.parent,fake.windows.get(sender));
  await call('preview-navigate',{url:'http://localhost:3000/second'});
  view.webContents.emit('page-title-updated', {}, 'Background title');
  const state = await call('preview-state');
  assert.equal(state.url,'http://localhost:3000/second'); assert.equal(state.tabs[0].title,'Background title');
  const fileRequest = url => new Promise(resolve => fake.partition.handlers.beforeRequest({url,webContentsId:view.webContents.id},resolve));
  assert.deepEqual(await fileRequest('file:///etc/passwd'),{cancel:true});
  await call('preview-tab-activate',{tabId:first.tabId});
  assert.equal(instance._previews.get('s1').view,view); assert.equal(view.webContents.index,1);assert.equal(view.visible,true);
  await call('preview-history',{action:'back'});assert.equal(view.webContents.getURL(),'http://localhost:3000/');
  assert.equal(second.view.webContents.getURL(),'http://localhost:3000/second');
  const reordered = await call('preview-tab-reorder',{tabId:first.tabId,toIndex:1});
  assert.deepEqual(reordered.tabs.map(t=>t.id),[second.tabId,first.tabId]);
  await assert.rejects(call('preview-tab-reorder',{tabId:first.tabId,toIndex:9}),/position/);
  await assert.rejects(call('preview-tab-activate',{sessionId:'s2',tabId:first.tabId}),/Unknown preview tab/);
  const result=await call('preview-tab-close',{tabId:second.tabId});
  assert.equal(second.view,null); assert.equal(result.activeTabId,first.tabId);
  assert.equal(result.tabs.length,1);assert.equal(result.lastTabClosed,false);
  const final=await call('preview-tab-close',{tabId:first.tabId});
  assert.equal(final.lastTabClosed,true);assert.equal(final.tabs.length,0);assert.equal(view.webContents.destroyed,true);
  for(let i=0;i<9;i++) await call('preview-tab-new');
  await assert.rejects(call('preview-tab-new'),/Close a preview tab/);
});

test('closing server tabs asks only for the last reference; keep/stop and Close others use current state', async t => {
  const port=await freePort(),cwd=project([{name:'web',runtimeExecutable:process.execPath,runtimeArgs:['server.js'],port}]);
  const {fake,instance}=service(cwd),sender=fake.sender();
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  const call=(action,extra={})=>instance.call(sender,action,{sessionId:'s1',...extra});
  assert.equal((await call('preview-server-start',{name:'web'})).ok,true);
  await call('preview-navigate',{url:`http://localhost:${port}/`});const first=(await call('preview-state')).activeTabId;
  const second=(await call('preview-tab-new')).activeTabId;
  await call('preview-navigate',{url:`http://localhost:${port}/about`});
  assert.equal((await call('preview-tab-close',{tabId:first})).confirmation,undefined);
  let pending=await call('preview-tab-close',{tabId:second});assert.equal(pending.confirmation.processes[0].name,'web');
  assert.equal((await call('preview-state')).tabs.length,1);
  const kept=await call('preview-tab-close',{tabId:second,decision:'keep'});assert.equal(kept.lastTabClosed,true);assert.equal(kept.servers[0].status,'running');
  await call('preview-navigate',{url:`http://localhost:${port}/`});const active=(await call('preview-state')).activeTabId;
  const blank=(await call('preview-tab-new')).activeTabId;
  pending=await call('preview-tab-close',{tabId:blank,others:true});assert.equal(pending.confirmation.others,true);
  // Another pane opened a reference during confirmation: the decision rechecks before stopping.
  await call('preview-navigate',{url:`http://localhost:${port}/new-reference`});
  const closed=await call('preview-tab-close',{tabId:active,decision:'stop'});assert.equal(closed.servers[0].status,'running');
  const stopped=await call('preview-tab-close',{tabId:blank,decision:'stop'});assert.equal(stopped.servers[0].status,'stopped');assert.equal(stopped.lastTabClosed,true);
});

test('popup tabs preserve the originating page and its site approval boundary; closed loads settle promptly', async t => {
  const cwd=project(),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  let allow=false;const asked=[];
  const agent=instance.forSession({id:'s1',cwd},{requestApproval:async request=>{asked.push(request);return allow;}});
  await agent.navigate('http://localhost:3000/');const first=instance._previews.get('s1'),contents=first.view.webContents;
  contents.openHandler({url:'https://denied.example/page'});await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(first.group.tabs.size,1);assert.equal(contents.getURL(),'http://localhost:3000/');
  allow=true;contents.openHandler({url:'https://allowed.example/page'});await new Promise(resolve=>setTimeout(resolve,30));
  const second=instance._previews.get('s1');assert.notEqual(second,first);assert.equal(second.url,'https://allowed.example/page');
  assert.equal(second.agentDriven,true);assert.equal(contents.getURL(),'http://localhost:3000/');assert.equal(asked.length,2);
  second.view.webContents.loadURL=async()=>{};
  second.view.webContents.close=function(){this.destroyed=true;this.emit('destroyed');};
  const pending=instance.call(sender,'preview-navigate',{sessionId:'s1',url:'http://localhost:3000/held'});
  await instance.call(sender,'preview-tab-close',{sessionId:'s1',tabId:second.tabId});
  const result=await Promise.race([pending,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('load did not settle on close')),500);timer.unref();})]);
  assert.equal(result.code,'closed');assert.equal(instance._previews.get('s1'),first);
  const mac=process.platform==='darwin';assert.equal(previewShortcut({type:'keyDown',key:'t',meta:mac,control:!mac}),'new-tab');
});

test('closing a tab while its outside-site approval is pending cannot resurrect its native view', async t => {
  const cwd=project(),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  let grant;const approval=new Promise(resolve=>grant=resolve);
  const agent=instance.forSession({id:'s1',cwd},{requestApproval:()=>approval});
  await agent.navigate('http://localhost:3000/');
  const entry=instance._previews.get('s1');
  const navigation=agent.navigate('https://allowed.example/');
  const rejection=assert.rejects(navigation,/preview tab was closed/);
  await instance.call(sender,'preview-tab-close',{sessionId:'s1',tabId:entry.tabId});
  grant(true);await rejection;
  assert.equal(entry.view,null);assert.equal(instance._previews.get('s1').group.tabs.size,1);
  assert.equal((await instance.call(sender,'preview-state',{sessionId:'s1'})).tabs.length,0);
});

test('closed web tabs reopen LIFO in fresh views, skip blank/files, retain cap-blocked history and isolate sessions', async t=>{
  const cwd=project(),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  const call=(action,extra={})=>instance.call(sender,action,{sessionId:'s1',...extra});
  fs.writeFileSync(path.join(cwd,'page.html'),'hello');
  for(const url of ['http://localhost:3000/first','http://localhost:3000/second',`file://${cwd}/page.html`]){
    await call('preview-navigate',{url});const tab=instance._previews.get('s1');
    await call('preview-tab-close',{tabId:tab.tabId});
  }
  await call('preview-tab-new');await call('preview-tab-close',{tabId:instance._previews.get('s1').tabId});
  assert.equal((await call('preview-state')).lastTabClosed,true);
  assert.equal((await call('preview-tab-reopen',{sessionId:'s2'})).reopened,false);
  let reopened=await call('preview-tab-reopen');assert.equal(reopened.reopened,true);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(instance._previews.get('s1').url,'http://localhost:3000/second');
  assert.equal(instance._previews.get('s1').view.webContents.entries.length,1);
  for(let i=0;i<8;i++)await call('preview-tab-new');
  assert.equal((await call('preview-tab-reopen')).reopened,false);
  await call('preview-tab-close',{tabId:instance._previews.get('s1').tabId});
  assert.equal((await call('preview-tab-reopen')).reopened,true);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(instance._previews.get('s1').url,'http://localhost:3000/first');
  assert.equal((await call('preview-tab-reopen')).reopened,false);
});

test('closed tab history enforces original 25-entry bound and rejects a changed session folder', async t=>{
  const cwd=project(),other=project(),fake=fakeElectron();let folder=cwd;
  const instance=createPreviewService({ ...worldOptions(world), electron:fake.electron,getSession:id=>({id,cwd:folder}),logger:{warn(){}}}),sender=fake.sender();
  t.after(async()=>{await instance.dispose();for(const dir of [cwd,other])fs.rmSync(dir,{recursive:true,force:true});});
  const call=(action,extra={})=>instance.call(sender,action,{sessionId:'s1',...extra});
  for(let i=0;i<28;i++) {await call('preview-navigate',{url:`http://localhost:3000/${i}`});await call('preview-tab-close',{tabId:instance._previews.get('s1').tabId});}
  // Reopened tabs remain open; remove them without adding another web history item by navigating to a local file first.
  fs.writeFileSync(path.join(cwd,'blank.html'),'blank');
  for(let i=27;i>=3;i--){assert.equal((await call('preview-tab-reopen')).reopened,true);await new Promise(resolve=>setImmediate(resolve));assert.equal(instance._previews.get('s1').url,`http://localhost:3000/${i}`);await call('preview-navigate',{url:`file://${cwd}/blank.html`});await call('preview-tab-close',{tabId:instance._previews.get('s1').tabId});}
  assert.equal((await call('preview-tab-reopen')).reopened,false);
  await call('preview-navigate',{url:'http://localhost:3000/changed'});await call('preview-tab-close',{tabId:instance._previews.get('s1').tabId});folder=other;
  assert.equal((await call('preview-tab-reopen')).reopened,false);
});

test('closed-tab history evicts the oldest session after the original 50-session bound', async t=>{
  const cwd=project(),fake=fakeElectron(),sender=fake.sender();
  const instance=createPreviewService({ ...worldOptions(world), electron:fake.electron,getSession:id=>({id,cwd}),logger:{warn(){}}});
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  for(let i=0;i<51;i++){
    const sessionId=`history-${i}`;await instance.call(sender,'preview-navigate',{sessionId,url:`http://localhost:3000/${i}`});
    await instance.call(sender,'preview-tab-close',{sessionId,tabId:instance._previews.get(sessionId).tabId});
  }
  assert.equal(sender.listenerCount('destroyed'),1,'one renderer cleanup hook across all sessions');
  assert.equal((await instance.call(sender,'preview-tab-reopen',{sessionId:'history-0'})).reopened,false);
  assert.equal((await instance.call(sender,'preview-tab-reopen',{sessionId:'history-1'})).reopened,true);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(instance._previews.get('history-1').url,'http://localhost:3000/1');
  sender.emit('destroyed');assert.equal(sender.listenerCount('destroyed'),0);
  for(const entry of instance._previews.values())assert.equal(entry.subscribers.has(sender),false);
});

test('agent-dispatched page keys cannot switch host tabs while real native selection keys can', async t=>{
  const cwd=project(),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(async()=>{await instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  const call=(action,extra={})=>instance.call(sender,action,{sessionId:'s1',...extra});
  await call('preview-navigate',{url:'http://localhost:3000/first'});const first=instance._previews.get('s1');
  await call('preview-tab-new');await call('preview-navigate',{url:'http://localhost:3000/second'});const second=instance._previews.get('s1');
  await call('preview-attach',{instanceId:'pane',bounds:{x:0,y:0,width:400,height:300},visible:true});
  const contents=second.view.webContents,mac=process.platform==='darwin';let prevented=0;
  const press=()=>contents.emit('before-input-event',{preventDefault(){prevented++;}},{type:'keyDown',key:'1',code:'Digit1',meta:mac,control:!mac,shift:false,alt:false});
  contents.debugger.sendCommand=async method=>{if(method==='Input.dispatchKeyEvent')press();return {};};
  const agent=instance.forSession({id:'s1',cwd},{requestApproval:async()=>true});
  await agent.press({keys:mac?'cmd+1':'ctrl+1'});
  assert.ok(prevented>=1);assert.equal(instance._previews.get('s1'),second);
  second.group.syntheticInputUntil=0;press();assert.equal(instance._previews.get('s1'),first);
});

test('address navigation uses original context-aware URL/search parsing and consumes invalid input', async t => {
  const cwd=project(null),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(()=>{instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  const address=text=>instance.call(sender,'preview-address-navigate',{sessionId:'s1',text});
  assert.deepEqual(await address('user:secret@example.test'),{ok:false,invalid:true});
  assert.equal(instance._previews.get('s1').view,null,'invalid input does not create a native page');
  await address('http://localhost:3000/base');const view=instance._previews.get('s1').view;
  await address('/about?q=1');assert.equal(view.webContents.getURL(),'http://localhost:3000/about?q=1');
  await address('other.test/page');assert.equal(view.webContents.getURL(),'http://other.test/page');
  const before=view.webContents.entries.length;
  for(const value of ['ghp_fake@example.test','file://remote/private','\ud800/secret'])assert.deepEqual(await address(value),{ok:false,invalid:true});
  assert.equal(view.webContents.entries.length,before);
  // The Electron stand-in records the destination without making any network request.
  await address('find useful examples');assert.equal(view.webContents.getURL(),'https://www.google.com/search?q=find%20useful%20examples');
  await assert.rejects(address('https://user:secret@example.test'),/user name or password/);
});

test('address file intents retain workspace checks and reload the displayed path without adding history', async t => {
  const cwd=project(null),outside=project(null),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(()=>{instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});fs.rmSync(outside,{recursive:true,force:true});});
  fs.writeFileSync(path.join(cwd,'page one.html'),'<title>Page</title>');fs.symlinkSync(outside,path.join(cwd,'outside'));
  const address=text=>instance.call(sender,'preview-address-navigate',{sessionId:'s1',text});
  await address('./page one.html');const view=instance._previews.get('s1').view;
  assert.ok(view.webContents.getURL().endsWith('/page%20one.html'));
  const before=view.webContents.entries.length;let reloads=0;view.webContents.reload=()=>reloads++;
  const result=await address(path.join(cwd,'page one.html'));assert.equal(result.reloaded,true);assert.equal(reloads,1);assert.equal(view.webContents.entries.length,before);
  assert.deepEqual(await address('private file words'),{ok:false,invalid:true});
  await assert.rejects(address('./outside/private.html'),/session’s folder only/);
  await assert.rejects(address(path.join(outside,'private.html')),/session’s folder only/);
  assert.equal(view.webContents.entries.length,before,'blocked file paths and file-like searches leave the native page intact');
});

test('element picker is owned by the visible pane and cancels on native Escape or tab switch', async t=>{
 const cwd=project(null),{fake,instance}=service(cwd),sender=fake.sender(),other=fake.sender();
 t.after(()=>{instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
 await instance.call(sender,'preview-navigate',{sessionId:'s1',url:'localhost:3000'});
 await instance.call(sender,'preview-attach',{sessionId:'s1',instanceId:'pane',bounds:{x:0,y:0,width:500,height:400}});
 const entry=instance._previews.get('s1');
 await assert.rejects(instance.call(other,'preview-selection',{sessionId:'s1',instanceId:'pane',enabled:true}),/does not own/);
 let state=await instance.call(sender,'preview-selection',{sessionId:'s1',instanceId:'pane',enabled:true});assert.equal(state.selection.enabled,true);
 // Bounds updates retain ownership and must not invalidate a live selection.
 await instance.call(sender,'preview-attach',{sessionId:'s1',instanceId:'pane',bounds:{x:0,y:0,width:510,height:400}});
 entry.elementInspector.captureElementContext=async()=>({tagName:'button',screenshot:'fixture'});
 entry.elementInspector.inspectModeCallback(42);await entry.picker.whenIdle();
 const picked=sender.sent.find(event=>event.kind==='preview-element-selected');assert.equal(picked.context.tagName,'button');assert.equal(picked.tabId,entry.tabId);assert.equal(picked.instanceId,'pane');assert.equal(other.sent.some(event=>event.kind==='preview-element-selected'),false);
 await instance.call(sender,'preview-selection',{sessionId:'s1',instanceId:'pane',enabled:true});let prevented=false;
 entry.view.webContents.emit('before-input-event',{preventDefault(){prevented=true;}},{type:'keyDown',key:'Escape'});await entry.picker.whenIdle();assert.equal(prevented,true);assert.equal(entry.selection.enabled,false);
 await instance.call(sender,'preview-selection',{sessionId:'s1',instanceId:'pane',enabled:true});entry.view.webContents.emit('did-navigate-in-page',{},'http://localhost:3000/#next',true);await entry.picker.whenIdle();assert.equal(entry.selection.enabled,false);
 await instance.call(sender,'preview-selection',{sessionId:'s1',instanceId:'pane',enabled:true});await instance.call(sender,'preview-tab-new',{sessionId:'s1'});await entry.picker.whenIdle();assert.equal(entry.selection.enabled,false);assert.equal(entry.elementInspector.inspectModeCallback,null);
});

test('storage changes rebuild Code views with the selected jar, keep Cowork shared, and clear only the active jar', async t => {
  const cwd = project(null), fake = fakeElectron(), jars = new Map();
  const makeJar = name => ({ ...fake.partition, name, clearCount: 0, authCount: 0,
    async clearData() { this.clearCount++; }, async clearAuthCache() { this.authCount++; } });
  fake.electron.session.fromPartition = name => {
    if (!jars.has(name)) jars.set(name, makeJar(name));
    return jars.get(name);
  };
  let mode = 'none';
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: id => ({ id, cwd }),
    getStorageMode: () => mode, setStorageMode: value => { mode = value; }, isCoworkSession: id => id === 'cowork', logger: { warn() {} } });
  t.after(async () => { await instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const call = (action, sessionId, props = {}) => instance.call(sender, action, { sessionId, ...props });
  const open = id => call('preview-navigate', id, { url: 'http://localhost:3200/page' });
  await open('s1');await open('s2');await open('cowork');
  const initial = await call('preview-state', 's1');
  const ephemeral = [...jars.keys()].find(name => !name.startsWith('persist:'));
  assert.ok(ephemeral);assert.equal(jars.size, 2);
  await assert.rejects(call('preview-storage', 's1', { mode: 'invalid' }), /Unknown storage/);
  assert.equal(mode, 'none');
  const changed = await call('preview-storage', 's1', { mode: 'session' });
  assert.equal(mode, 'session');assert.equal(changed.previewStorage, 'session');
  assert.notEqual(changed.activeTabId, initial.activeTabId);
  assert.equal(changed.tabs.length, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await call('preview-state', 's1')).url, 'http://localhost:3200/page');
  assert.equal((await call('preview-state', 'cowork')).previewStorage, 'shared');
  assert.equal([...jars.keys()].filter(name => name.startsWith('persist:preview-session-')).length, 2);
  await call('preview-clear-data', 's1');
  assert.equal([...jars.values()].reduce((n, jar) => n + jar.clearCount, 0), 1);
  assert.equal(jars.get('persist:preview').clearCount, 0);
  assert.equal(jars.get(ephemeral).clearCount, 0);
  assert.equal((await call('preview-state', 's1')).previewStorage, 'session', 'clearing does not turn persistence off');
  const shared = await call('preview-storage', 's1', { mode: 'shared' });
  assert.equal(shared.tabs.length, 0, 'source shared rebind starts a fresh browser');
  await open('s1');await call('preview-clear-data', 's1');
  assert.equal(jars.get('persist:preview').clearCount, 1);
  assert.equal(jars.get('persist:preview').authCount, 1);
  jars.get('persist:preview').clearData = async () => { throw Error('cannot clear'); };
  await assert.rejects(call('preview-clear-data', 's1'), /cannot clear/);
  // Settings › Code › Browser › Keep cookies (c71860c77-DzP8HoeV Kr): the same mode without a session; open panes follow.
  assert.deepEqual(await call('preview-storage-read'), { previewStorage: 'shared' });
  await assert.rejects(call('preview-storage', undefined, { mode: 'forever' }), /Unknown storage/);
  assert.deepEqual(await call('preview-storage', undefined, { mode: 'session' }), { previewStorage: 'session' });
  assert.equal(mode, 'session');
  assert.equal((await call('preview-state', 's1')).previewStorage, 'session');
});

test('Until quit startup clears tracked persistent Code jars and preserves the shared jar', async t => {
  const cwd = project(null), fake = fakeElectron();
  const name = 'persist:preview-session-' + 'a'.repeat(64), calls = [];
  let saved = [name, 'persist:preview', 'another-app'];
  fake.electron.session.fromPartition = partitionName => ({ ...fake.partition,
    async clearData() { calls.push(['data', partitionName]); }, async clearAuthCache() { calls.push(['auth', partitionName]); } });
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: id => ({ id, cwd }),
    getStorageMode: () => 'none', getStoredPartitions: () => saved, setStoredPartitions: value => { saved = value; } });
  t.after(async () => { await instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  await instance.call(fake.sender(), 'preview-state', { sessionId: 's1' });
  assert.deepEqual(calls, [['data', name], ['auth', name]]);
  assert.deepEqual(saved, []);
});

test('transcript links reuse source-normalized origin tabs, preserve other sites and respect cap/validation', async t => {
  const cwd=project(null),{fake,instance}=service(cwd),sender=fake.sender();
  t.after(()=>{instance.dispose();fs.rmSync(cwd,{recursive:true,force:true});});
  const open=url=>instance.call(sender,'preview-link-open',{sessionId:'s1',url});
  const first=await open('https://example.com/one');assert.equal(first.opened,true);await new Promise(resolve=>setImmediate(resolve));
  const second=await open('https://www.example.com/two');assert.equal(second.tabId,first.tabId);await new Promise(resolve=>setImmediate(resolve));
  const third=await open('https://other.example.com/');assert.notEqual(third.tabId,first.tabId);await new Promise(resolve=>setImmediate(resolve));
  let state=await instance.call(sender,'preview-state',{sessionId:'s1'});assert.equal(state.tabs.length,2);assert.ok(state.tabs.some(tab=>tab.url==='https://www.example.com/two'));
  for(const url of ['file:///etc/hosts','javascript:alert(1)','https://user:pass@example.com/','https://chromewebstore.google.com/detail/x'])assert.equal((await open(url)).opened,false);
  for(let i=2;i<9;i++)await open(`https://site${i}.example.com/`);
  assert.equal((await open('https://cap.example.com/')).opened,false);assert.equal((await open('https://example.com/three')).tabId,first.tabId);
  state=await instance.call(sender,'preview-state',{sessionId:'s1'});assert.equal(state.tabs.length,9);assert.deepEqual(fake.opened,[],'renderer owns external fallback');
  await assert.rejects(instance.call(sender,'preview-link-open',{sessionId:'unknown',url:'https://example.com'}),/Unknown session/);
});

test('ca80fca8d xq: a port another session\'s dev server holds fails as port-held with that port', async (t) => {
  const port = await freePort();
  // "autoPort": false: the port can't move to the next free one (preview-01), so the other folder's server is named.
  const config = [{ name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port, autoPort: false }];
  const first = project(config), second = project(config);
  const fake = fakeElectron();
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => ({ s1: { id, cwd: first }, s2: { id, cwd: second } })[id] ?? null, spawnEnv: async () => ({ ...process.env }), logger: { warn() {} } });
  t.after(async () => { await instance.dispose(); for (const dir of [first, second]) fs.rmSync(dir, { recursive: true, force: true }); });
  const sender = fake.sender();
  assert.equal((await instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' })).ok, true);
  const held = await instance.call(sender, 'preview-server-start', { sessionId: 's2', name: 'web' });
  assert.deepEqual({ ok: held.ok, code: held.code, heldPort: held.heldPort }, { ok: false, code: 'port-held', heldPort: port });
  assert.match(held.message, new RegExp(`^Port ${port} is in use by another chat's dev server`));
  const entry = instance.snapshot('s2').servers.find((server) => server.name === 'web');
  assert.deepEqual({ status: entry.status, code: entry.error.code, heldPort: entry.error.heldPort }, { status: 'failed', code: 'port-held', heldPort: port });
});

test('cf580efe9 Pi: a session\'s dev-server page is kept as a frame at quit and offered after the restart until shown or dismissed', async (t) => {
  const port = await freePort();
  const cwd = project([{ name: 'web', runtimeExecutable: process.execPath, runtimeArgs: ['server.js'], port }]);
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-frames-'));
  const make = () => { const fake = fakeElectron(); return { fake, instance: createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === 's1' ? { id, cwd } : null), spawnEnv: async () => ({ ...process.env }), logger: { warn() {} }, frameDir }) }; };
  t.after(() => { for (const dir of [cwd, frameDir]) fs.rmSync(dir, { recursive: true, force: true }); });
  // First run: the server's page is open when the app quits.
  const one = make();
  const sender = one.fake.sender();
  assert.equal((await one.instance.call(sender, 'preview-server-start', { sessionId: 's1', name: 'web' })).ok, true);
  assert.equal(one.instance.snapshot('s1').lastFrame, null, 'nothing from before this run');
  await one.instance.dispose();
  assert.ok(one.fake.cdp.some(([method, params]) => method === 'Page.captureScreenshot' && params.format === 'jpeg'));
  assert.equal(fs.readdirSync(frameDir).length, 2, 'the frame and its record');
  // Second run: the snapshot names it, preview-last-frame reads it, and a page shown again discards it. (A frame counts
  // as from before a run when it was saved before that run started: a later millisecond, which stand-in servers reach
  // within the same one.)
  const nextMillisecond = () => new Promise((resolve) => setTimeout(resolve, 5));
  await nextMillisecond();
  const two = make();
  const lastFrame = two.instance.snapshot('s1').lastFrame;
  assert.equal(lastFrame.configName, 'web');
  const frame = await two.instance.call(two.fake.sender(), 'preview-last-frame', { sessionId: 's1' });
  assert.deepEqual({ jpeg: Buffer.from(frame.jpegBase64, 'base64').toString(), configName: frame.configName }, { jpeg: 'png', configName: 'web' });
  await two.instance.call(two.fake.sender(), 'preview-navigate', { sessionId: 's1', url: `http://localhost:${port}/` });
  assert.equal(two.instance.snapshot('s1').lastFrame, null, 'a page shown again replaces it');
  assert.equal(await two.instance.call(two.fake.sender(), 'preview-last-frame', { sessionId: 's1' }), null);
  await two.instance.dispose();
  // Third run: Show start page discards it.
  await nextMillisecond();
  const three = make();
  assert.equal(three.instance.snapshot('s1').lastFrame?.configName, 'web', 'the page was still open at the second quit');
  const after = await three.instance.call(three.fake.sender(), 'preview-last-frame-discard', { sessionId: 's1' });
  assert.equal(after.lastFrame, null);
  assert.deepEqual(fs.readdirSync(frameDir), []);
  await three.instance.dispose();
  // Without a frame folder the feature is off.
  const { instance } = service(cwd);
  assert.equal(instance.snapshot('s1').lastFrame, null);
  assert.equal(await instance.call(fakeElectron().sender(), 'preview-last-frame', { sessionId: 's1' }), null);
  await instance.dispose();
});

test('main.cjs lets Settings › Keep cookies read and set the storage mode without a session (B23 review)', () => {
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  const gate = main.slice(main.indexOf('action.startsWith("preview-")'), main.indexOf('return previewService.call(e.sender, action, p);'));
  assert.match(gate, /action === "preview-storage-read" \|\| action === "preview-storage"\) && p\?\.sessionId === undefined/);
  // B39: the Allowed sites calls need no session either, and the New session page's preview is owned by "home:<folder>".
  assert.match(gate, /"preview-allowed-origins", "preview-allowed-origin-add", "preview-allowed-origin-remove", "preview-allowed-origins-clear"\]\.includes\(action\)/);
  assert.match(gate, /!sessionless && \(typeof p\?\.sessionId !== "string" \|\| !\(agentToolSession\(p\.sessionId\) \?\? previewHomeOwner\(p\.sessionId\)\)\)/);
  assert.match(main, /getSession: \(id\) => agentToolSession\(id\) \?\? previewHomeOwner\(id\)/);
});

// B39 Allowed sites (2.31226.0 launchPreviewAllowedOrigins): sites saved from the dialog need no approval in any session;
// removing one (or Clear all) drops the sessions' own approvals for it, so the agent asks again.
test('Allowed sites: a saved site needs no approval; remove and Clear all ask again', async (t) => {
  const cwd = project(null);
  let saved = ['https://docs.example'];
  const fake = fakeElectron();
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === 's1' ? { id, cwd } : null), logger: { warn() {} },
    getAllowedOrigins: () => saved, setAllowedOrigins: (list) => { saved = list; } });
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const asked = [];
  let answer = true;
  const agent = instance.forSession({ id: 's1', cwd }, { requestApproval: async (request) => { asked.push(request.host); return answer; } });
  await agent.navigate('https://www.docs.example/guide');
  assert.deepEqual(asked, [], 'a saved site opens without asking');
  const contents = instance._previews.get('s1').view.webContents;
  const held = (url) => { let prevented = false; contents.emit('will-navigate', { preventDefault: () => { prevented = true; } }, url); return prevented; };
  assert.equal(held('https://docs.example/other'), false, 'nor are its own navigations held');
  const sender = fake.sender();
  // The dialog's calls need no session.
  assert.deepEqual(await instance.call(sender, 'preview-allowed-origins', {}), [{ origin: 'https://docs.example', builtin: false }]);
  assert.equal(await instance.call(sender, 'preview-allowed-origin-add', { origin: 'https://news.example', schemeless: true }), 'ok');
  assert.equal(await instance.call(sender, 'preview-allowed-origin-add', { origin: 'https://news.example/' }), 'exists');
  assert.equal(await instance.call(sender, 'preview-allowed-origin-add', { origin: 'http://localhost:5173' }), 'loopback');
  assert.equal(await instance.call(sender, 'preview-allowed-origin-add', { origin: 'mailto:x@example.com' }), 'invalid');
  assert.deepEqual(saved, ['https://docs.example', 'https://news.example']);
  // A site allowed for this session only, then saved: removing it from the list revokes both.
  await agent.navigate('https://shop.example/');
  assert.deepEqual(asked, ['shop.example']);
  assert.equal(await instance.call(sender, 'preview-allowed-origin-add', { origin: 'https://shop.example' }), 'ok');
  assert.equal(await instance.call(sender, 'preview-allowed-origin-remove', { origin: 'https://shop.example' }), true);
  assert.equal(await instance.call(sender, 'preview-allowed-origin-remove', { origin: 'https://shop.example' }), false, 'already gone');
  answer = false;
  await assert.rejects(agent.navigate('https://shop.example/'), /didn’t allow opening shop\.example/);
  assert.deepEqual(asked, ['shop.example', 'shop.example'], 'asked again');
  // Clear all empties the list and the session approvals.
  answer = true;
  await agent.navigate('https://blog.example/');
  assert.equal(await instance.call(sender, 'preview-allowed-origins-clear', {}), true);
  assert.deepEqual(saved, []);
  assert.equal(instance._previews.get('s1').group.approvedHosts.size, 0);
  assert.equal(held('https://news.example/'), true, 'a cleared site is held again');
});

// B39 landing preview: the New session page's browser is owned by its folder ("home:<folder>"), as getSession resolves.
test('the New session page owns a preview by its folder', async (t) => {
  const cwd = project(null);
  const fake = fakeElectron();
  const instance = createPreviewService({ ...worldOptions(world),  electron: fake.electron, getSession: (id) => (id === `home:${cwd}` ? { id, cwd } : null), logger: { warn() {} } });
  t.after(() => { instance.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const sender = fake.sender();
  const owner = `home:${cwd}`;
  const state = await instance.call(sender, 'preview-state', { sessionId: owner });
  assert.equal(state.sessionId, owner);
  assert.equal(state.cwd, cwd);
  await instance.call(sender, 'preview-navigate', { sessionId: owner, url: 'https://example.com/' });
  assert.equal(instance.snapshot(owner).url, 'https://example.com/', 'the user browses without an agent or approval');
  await assert.rejects(instance.call(sender, 'preview-state', { sessionId: 'home:/elsewhere' }), /Unknown session/);
});
