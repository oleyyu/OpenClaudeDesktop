// devtools-mcp/cdp-proxy.cjs: the CDP "browser" endpoint chrome-devtools-mcp connects to, over the preview tabs only.
// A fake debugger stands in for webContents.debugger; the client is Node's own WebSocket (a puppeteer-shaped exchange).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createCdpProxy } = require('../electron/devtools-mcp/cdp-proxy.cjs');
const { createDevtoolsMcp, resolveServerScript } = require('../electron/devtools-mcp/index.cjs');
const { createPreviewService } = require('../electron/preview-service.cjs');

let nextContents = 1;
function fakeContents(url, title, { realId = `REAL-${nextContents}` } = {}) {
  const contents = new EventEmitter();
  const sent = [];
  let session = 0;
  Object.assign(contents, {
    id: nextContents++, url, title, destroyed: false, sent,
    isDestroyed: () => contents.destroyed, getURL: () => contents.url, getTitle: () => contents.title, getUserAgent: () => 'UA/1',
    debugger: Object.assign(new EventEmitter(), {
      attached: true,
      isAttached: () => contents.debugger.attached,
      async sendCommand(method, params = {}, sessionId) {
        sent.push([method, params, sessionId]);
        if (method === 'Target.getTargetInfo' && !sessionId) return { targetInfo: { targetId: realId, type: 'page' } };
        if (method === 'Target.attachToTarget') { assert.equal(params.targetId, realId); assert.equal(params.flatten, true); session += 1; return { sessionId: `S${contents.id}-${session}` }; }
        if (method === 'Runtime.evaluate') return { result: { type: 'string', value: `${params.expression}@${sessionId}` } };
        return {};
      },
    }),
  });
  return contents;
}

function fakeHost(tabs) {
  const changes = new Set(), taps = new Set(), navigations = [], activated = [], closed = [];
  return {
    tabs, navigations, activated, closed,
    emit: (contents, method, params, sessionId) => { for (const tap of taps) tap(contents, method, params, sessionId); },
    changed: () => { for (const fn of changes) fn(); },
    targets: () => tabs.filter((tab) => !tab.contents.destroyed).map(({ key, sessionId, contents }) => ({ key, sessionId, contents, active: true })),
    onChange(fn) { changes.add(fn); return () => changes.delete(fn); },
    onMessage(fn) { taps.add(fn); return () => taps.delete(fn); },
    checkNavigation(key, url) { navigations.push([key, url]); if (/outside\.example/.test(url)) throw new Error('outside.example isn’t allowed in this preview tab yet.'); return url; },
    activate(key) { activated.push(key); },
    async close(key) { closed.push(key); const tab = tabs.find((candidate) => candidate.key === key); tab.contents.destroyed = true; },
    async create(url) { const contents = fakeContents(url, 'New'); tabs.push({ key: `new-${contents.id}`, sessionId: 's1', contents }); return `new-${contents.id}`; },
  };
}

/** A CDP client over Node's WebSocket: send() resolves with the reply, events are kept. */
async function connect(wsEndpoint) {
  const ws = new WebSocket(wsEndpoint);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = () => reject(new Error('connect failed')); });
  const pending = new Map(), events = [];
  let id = 0;
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) { pending.get(message.id)?.(message); pending.delete(message.id); } else events.push(message);
  };
  return {
    ws, events,
    send(method, params = {}, sessionId) { id += 1; const message = { id, method, params, ...(sessionId ? { sessionId } : {}) }; ws.send(JSON.stringify(message)); return new Promise((resolve) => pending.set(id, resolve)); },
    close() { ws.close(); },
  };
}
const tick = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/** A raw upgrade request: the status the proxy answers it with. */
function upgradeStatus(port, pathname, headers = {}) {
  return new Promise((resolve) => {
    const request = http.request({ host: '127.0.0.1', port, path: pathname, headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', ...headers } });
    request.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
    request.on('response', (response) => { response.resume(); resolve(response.statusCode); });
    request.on('error', () => resolve('error'));
    request.end();
  });
}

test('the endpoint listens on 127.0.0.1 with a random token; a wrong token, a web page origin or another path are refused', async (t) => {
  const host = fakeHost([]);
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  t.after(() => proxy.stop());
  const { port, token, wsEndpoint } = await proxy.start();
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(wsEndpoint, `ws://127.0.0.1:${port}/devtools/browser/${token}`);
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token}`), 101);
  assert.equal(await upgradeStatus(port, `/devtools/browser/${'0'.repeat(64)}`), 403);
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token.slice(0, 63)}`), 403);
  assert.equal(await upgradeStatus(port, `/devtools/page/${token}`), 403);
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token}`, { Origin: 'https://evil.example' }), 403);
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token}`, { Host: `evil.example:${port}` }), 403);
  assert.equal(await upgradeStatus(port, '/json/version'), 403);
  await assert.rejects(connect(`ws://127.0.0.1:${port}/devtools/browser/${'f'.repeat(64)}`));
  const second = createCdpProxy({ host, logger: { warn() {} } });
  t.after(() => second.stop());
  assert.notEqual((await second.start()).token, token);
});

test('a puppeteer-shaped session: only the preview tabs are targets (tab + page), page sessions are real CDP sessions of the page', async (t) => {
  const appWindow = fakeContents('app://main', 'OpenClaude Desktop');
  const one = fakeContents('http://localhost:3000/', 'Fixture');
  const host = fakeHost([{ key: 'tab-1', sessionId: 's1', contents: one }]);
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  t.after(() => proxy.stop());
  const { wsEndpoint } = await proxy.start();
  const client = await connect(wsEndpoint);
  t.after(() => client.close());

  assert.deepEqual((await client.send('Target.getBrowserContexts')).result.browserContextIds, []);
  assert.match((await client.send('Browser.getVersion')).result.product, /^Chrome\//);
  assert.deepEqual((await client.send('Target.setDiscoverTargets', { discover: true, filter: [{}] })).result, {});
  const created = client.events.filter((event) => event.method === 'Target.targetCreated').map((event) => event.params.targetInfo);
  assert.deepEqual(created.map((info) => [info.type, info.url, info.title]), [['tab', 'http://localhost:3000/', 'Fixture'], ['page', 'http://localhost:3000/', 'Fixture']]);
  assert.equal(created[1].targetId, 'REAL-' + one.id, 'the page target is the page\'s own id');
  const listed = (await client.send('Target.getTargets')).result.targetInfos;
  assert.equal(listed.length, 2);
  assert.ok(!JSON.stringify(listed).includes('app://main'), 'the app window is never a target');

  // Browser-level auto-attach (pages excluded, as puppeteer asks): the tab; the tab's auto-attach: the page.
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true, filter: [{ type: 'page', exclude: true }, {}] });
  const tabAttach = client.events.find((event) => event.method === 'Target.attachedToTarget' && !event.sessionId);
  assert.equal(tabAttach.params.targetInfo.type, 'tab');
  assert.equal(tabAttach.params.waitingForDebugger, false);
  const tabSession = tabAttach.params.sessionId;
  assert.equal((await client.send('Target.getTargetInfo', {}, tabSession)).result.targetInfo.type, 'tab');
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true, filter: [{}] }, tabSession);
  const pageAttach = client.events.find((event) => event.method === 'Target.attachedToTarget' && event.sessionId === tabSession);
  const pageSession = pageAttach.params.sessionId;
  assert.equal(pageSession, `S${one.id}-1`, 'the page session is the debugger\'s own Target.attachToTarget session');
  assert.deepEqual(one.sent.find(([method]) => method === 'Target.attachToTarget')?.[2], undefined, 'attached through the root session of the existing debugger');

  // Commands go to the debugger with that session id; the reply carries it.
  const evaluated = await client.send('Runtime.evaluate', { expression: '1+1' }, pageSession);
  assert.equal(evaluated.sessionId, pageSession);
  assert.equal(evaluated.result.result.value, `1+1@${pageSession}`);

  // Events: the page session's and its children's are forwarded; the preview's own (no session) never are.
  host.emit(one, 'Runtime.consoleAPICalled', { type: 'error', args: [{ value: 'boom' }] }, pageSession);
  host.emit(one, 'Runtime.consoleAPICalled', { type: 'log', args: [{ value: 'preview-own' }] }, undefined);
  host.emit(one, 'Target.attachedToTarget', { sessionId: 'CHILD-1', targetInfo: { targetId: 'IFRAME-1', type: 'iframe' } }, pageSession);
  host.emit(one, 'Runtime.executionContextCreated', { context: { id: 9 } }, 'CHILD-1');
  host.emit(appWindow, 'Runtime.consoleAPICalled', { type: 'log', args: [{ value: 'stranger' }] }, 'S-unknown');
  await tick();
  const forwarded = client.events.filter((event) => event.method !== 'Target.targetCreated' && event.method !== 'Target.attachedToTarget' || event.sessionId === pageSession);
  assert.ok(forwarded.some((event) => event.method === 'Runtime.consoleAPICalled' && event.sessionId === pageSession));
  assert.ok(!JSON.stringify(client.events).includes('preview-own'));
  assert.ok(!JSON.stringify(client.events).includes('stranger'));
  assert.ok(client.events.some((event) => event.method === 'Runtime.executionContextCreated' && event.sessionId === 'CHILD-1'));
  await client.send('Runtime.runIfWaitingForDebugger', {}, 'CHILD-1');
  assert.deepEqual(one.sent.at(-1), ['Runtime.runIfWaitingForDebugger', {}, 'CHILD-1'], 'a child session id passes through unchanged');
  assert.equal((await client.send('Target.getTargetInfo', { targetId: 'IFRAME-1' }, pageSession)).error, undefined);
});

test('a page session can\'t reach other targets or the browser; navigation follows the preview\'s rules; bringToFront / close are tab actions', async (t) => {
  const one = fakeContents('http://localhost:3000/', 'Fixture');
  const host = fakeHost([{ key: 'tab-1', sessionId: 's1', contents: one }]);
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  t.after(() => proxy.stop());
  const client = await connect((await proxy.start()).wsEndpoint);
  t.after(() => client.close());
  await client.send('Target.setDiscoverTargets', { discover: true });
  const page = client.events.find((event) => event.params.targetInfo?.type === 'page').params.targetInfo;
  const { result: { sessionId } } = await client.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  assert.ok(client.events.some((event) => event.method === 'Target.attachedToTarget' && event.params.sessionId === sessionId), 'announced before the reply, as Chrome does');

  for (const [method, params] of [['Target.getTargets', {}], ['Target.attachToTarget', { targetId: 'APP-WINDOW', flatten: true }], ['Target.setDiscoverTargets', { discover: true }],
    ['Target.createTarget', { url: 'about:blank' }], ['Target.exposeDevToolsProtocol', { targetId: page.targetId }], ['Target.getTargetInfo', { targetId: 'APP-WINDOW' }], ['Browser.close', {}], ['Browser.getWindowForTarget', {}]]) {
    const reply = await client.send(method, params, sessionId);
    assert.ok(reply.error, `${method} is refused on a page session`);
  }
  assert.ok(!one.sent.some(([method]) => ['Target.getTargets', 'Target.setDiscoverTargets', 'Target.createTarget', 'Browser.close'].includes(method)), 'never reaches the debugger');
  assert.ok((await client.send('Browser.close')).error, 'nor the browser session');
  assert.equal((await client.send('Browser.getVersion', {}, sessionId)).result.userAgent, 'UA/1');

  const refused = await client.send('Page.navigate', { url: 'https://outside.example/' }, sessionId);
  assert.match(refused.error.message, /isn’t allowed/);
  assert.ok(!one.sent.some(([method]) => method === 'Page.navigate'));
  assert.equal((await client.send('Page.navigate', { url: 'http://localhost:3000/next' }, sessionId)).error, undefined);
  assert.deepEqual(one.sent.at(-1), ['Page.navigate', { url: 'http://localhost:3000/next' }, sessionId]);

  await client.send('Page.bringToFront', {}, sessionId);
  await client.send('Target.activateTarget', { targetId: page.targetId });
  assert.deepEqual(host.activated, ['tab-1', 'tab-1']);
  assert.ok(!one.sent.some(([method]) => method === 'Page.bringToFront'), 'no window is brought to the front');

  // The developer tools hold the page: the preview's message.
  one.debugger.attached = false;
  assert.match((await client.send('Runtime.evaluate', { expression: '1' }, sessionId)).error.message, /can’t be inspected while its developer tools hold it/);
  one.debugger.attached = true;

  // Another client's session isn't this one's.
  const other = await connect(proxy.endpoint().wsEndpoint);
  t.after(() => other.close());
  assert.ok((await other.send('Runtime.evaluate', { expression: '1' }, sessionId)).error);
});

test('targets follow the tabs; a closed tab ends its sessions; a disconnect detaches every page session it opened', async (t) => {
  const one = fakeContents('http://localhost:3000/', 'One');
  const host = fakeHost([{ key: 'tab-1', sessionId: 's1', contents: one }]);
  const proxy = createCdpProxy({ host, logger: { warn() {} } });
  t.after(() => proxy.stop());
  const client = await connect((await proxy.start()).wsEndpoint);
  await client.send('Target.setDiscoverTargets', { discover: true });
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true });

  const two = fakeContents('http://localhost:3000/two', 'Two');
  host.tabs.push({ key: 'tab-2', sessionId: 's1', contents: two });
  host.changed();
  await tick();
  assert.ok(client.events.some((event) => event.method === 'Target.targetCreated' && event.params.targetInfo.title === 'Two'));
  assert.equal(client.events.filter((event) => event.method === 'Target.attachedToTarget' && !event.sessionId).length, 2, 'a new tab is auto-attached');

  one.title = 'One renamed'; one.url = 'http://localhost:3000/renamed';
  host.changed();
  await tick();
  assert.ok(client.events.some((event) => event.method === 'Target.targetInfoChanged' && event.params.targetInfo.type === 'page' && event.params.targetInfo.url === 'http://localhost:3000/renamed'));

  // createTarget opens a preview tab and answers with its page id once it is a target.
  const { result: { targetId } } = await client.send('Target.createTarget', { url: 'about:blank' });
  assert.match(targetId, /^REAL-/);
  // closeTarget closes the preview tab.
  assert.deepEqual((await client.send('Target.closeTarget', { targetId })).result, { success: true });
  assert.equal(host.closed.length, 1);

  const tabTwo = client.events.find((event) => event.method === 'Target.attachedToTarget' && event.params.targetInfo.title === 'Two').params.sessionId;
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, tabTwo);
  const pageTwo = client.events.find((event) => event.method === 'Target.attachedToTarget' && event.sessionId === tabTwo).params.sessionId;
  two.destroyed = true;
  host.changed();
  await tick();
  assert.ok(client.events.some((event) => event.method === 'Target.detachedFromTarget' && event.params.sessionId === pageTwo));
  assert.ok(client.events.some((event) => event.method === 'Target.targetDestroyed' && event.params.targetId === `REAL-${two.id}`));

  const tabOne = client.events.find((event) => event.method === 'Target.attachedToTarget' && event.params.targetInfo.type === 'tab' && event.params.targetInfo.url.includes('localhost:3000/')).params.sessionId;
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, tabOne);
  const pageOne = client.events.find((event) => event.method === 'Target.attachedToTarget' && event.sessionId === tabOne).params.sessionId;
  // The page's developer tools take the debugger: Chrome ends the session, the client hears it.
  host.emit(one, 'Target.detachedFromTarget', { sessionId: pageOne }, undefined);
  await tick();
  assert.ok(client.events.some((event) => event.method === 'Target.detachedFromTarget' && event.params.sessionId === pageOne && event.sessionId === tabOne));
  await client.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, tabOne);
  const again = client.events.filter((event) => event.method === 'Target.attachedToTarget' && event.sessionId === tabOne).at(-1).params.sessionId;
  assert.notEqual(again, pageOne);
  client.close();
  await tick(150);
  assert.ok(one.sent.some(([method, params]) => method === 'Target.detachFromTarget' && params.sessionId === again), 'released on disconnect');
  assert.equal(proxy.clientCount, 0);
});

test('turning the preview tools off refuses new connections', async (t) => {
  let enabled = false;
  const proxy = createCdpProxy({ host: { ...fakeHost([]), enabled: () => enabled }, logger: { warn() {} } });
  t.after(() => proxy.stop());
  const { port, token } = await proxy.start();
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token}`), 403);
  enabled = true;
  assert.equal(await upgradeStatus(port, `/devtools/browser/${token}`), 101);
});

test('the launch: the pinned chrome-devtools-mcp of the harness, its flags, Codex overrides and the bridges\' variable', async (t) => {
  const script = resolveServerScript();
  assert.ok(script, 'harness/node_modules/chrome-devtools-mcp 1.13.0 is installed');
  assert.match(script, /harness\/node_modules\/chrome-devtools-mcp\/out\/Default\/gen\/src\/bin\/chrome-devtools-mcp\.js$/);
  const packaged = fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-mcp-res-'));
  t.after(() => fs.rmSync(packaged, { recursive: true, force: true }));
  const pkgDir = path.join(packaged, 'harness/node_modules/chrome-devtools-mcp');
  fs.mkdirSync(path.join(pkgDir, 'out/Default/gen/src/bin'), { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ version: '1.13.0' }));
  fs.writeFileSync(path.join(pkgDir, 'out/Default/gen/src/bin/chrome-devtools-mcp.js'), '');
  assert.equal(resolveServerScript({ resourcesPath: packaged }), path.join(pkgDir, 'out/Default/gen/src/bin/chrome-devtools-mcp.js'), 'the packaged copy (Resources/harness) first');
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ version: '1.14.0' }));
  assert.equal(resolveServerScript({ resourcesPath: packaged, repoRoot: packaged }), null, 'another version is never used');

  const host = fakeHost([]);
  const mcp = createDevtoolsMcp({ previewService: { devtools: host }, command: '/Applications/OpenClaude.app/Contents/MacOS/OpenClaude', runAsNode: true, script, logger: { warn() {} } });
  t.after(() => mcp.stop());
  assert.deepEqual(mcp.launchEnv(), {}, 'nothing before the proxy starts');
  assert.deepEqual(mcp.codexArgs(), []);
  const endpoint = await mcp.start();
  const definition = mcp.serverDefinition();
  assert.equal(definition.name, 'chrome-devtools');
  assert.deepEqual(definition.args, [path.join(path.dirname(require.resolve('../electron/devtools-mcp/index.cjs')), 'launch.mjs'), script, '--wsEndpoint', endpoint.wsEndpoint, '--no-usage-statistics', '--no-performance-crux']);
  assert.deepEqual(definition.env, { ELECTRON_RUN_AS_NODE: '1', CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: '1', CHROME_DEVTOOLS_MCP_NO_CONFIG_DISCOVERY: '1', CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1' });
  assert.deepEqual(JSON.parse(mcp.launchEnv().CODE_DESKTOP_DEVTOOLS_MCP_SERVER), definition);
  const args = mcp.codexArgs();
  assert.ok(args.includes(`mcp_servers.chrome_devtools.args=${JSON.stringify(definition.args)}`));
  assert.ok(args.includes('mcp_servers.chrome_devtools.env.ELECTRON_RUN_AS_NODE="1"'));
  assert.ok(args.includes('shell_environment_policy.set.CODE_DESKTOP_DEVTOOLS_MCP_SERVER=""'));
  const wrapped = mcp.wrapLaunch(() => ({ env: { A: '1' }, codexArgs: ['-c', 'x=1'] }))();
  assert.equal(wrapped.env.A, '1');
  assert.ok(wrapped.env.CODE_DESKTOP_DEVTOOLS_MCP_SERVER);
  assert.deepEqual(wrapped.codexArgs.slice(0, 2), ['-c', 'x=1']);
  assert.equal(await mcp.start(), endpoint, 'started once');
});

// The Preview service side: its devtools host lists preview tabs only, and its own logs never take a session's messages.
function serviceElectron() {
  let nextId = 100;
  const partition = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {}, on() {}, webRequest: { onBeforeRequest() {} }, getUserAgent: () => 'UA', setUserAgent() {} };
  class Contents extends EventEmitter {
    constructor() {
      super();
      this.id = nextId++; this.url = ''; this.title = ''; this.destroyed = false;
      this.navigationHistory = { canGoBack: () => false, canGoForward: () => false };
      this.debugger = Object.assign(new EventEmitter(), { attached: false, attach: () => { this.debugger.attached = true; }, isAttached: () => this.debugger.attached, sendCommand: async () => ({}) });
    }
    isDestroyed() { return this.destroyed; } setWindowOpenHandler() {}
    async loadURL(url) { this.url = url; this.title = `T ${url}`; this.emit('did-navigate', {}, url); setImmediate(() => { this.emit('did-finish-load'); this.emit('did-stop-loading'); }); }
    getURL() { return this.url; } getTitle() { return this.title; } isDevToolsOpened() { return false; } close() { this.destroyed = true; this.emit('destroyed'); } focus() {} reload() {} stop() {}
  }
  class WebContentsView { constructor(options) { this.webContents = new Contents(); this.webContents.session = options.webPreferences.session; } setBounds() {} setVisible() {} setBackgroundColor() {} }
  class BrowserWindow extends EventEmitter {
    constructor() { super(); this.contentView = { addChildView() {}, removeChildView() {} }; this.webContents = new Contents(); }
    isDestroyed() { return false; } isVisible() { return false; } destroy() {} static fromWebContents() { return null; }
  }
  return { WebContentsView, BrowserWindow, session: { fromPartition: () => partition }, shell: { openExternal: async () => {} }, nativeTheme: { shouldUseDarkColors: false } };
}

test('preview-service devtools host: preview tabs only, session messages fanned out and kept out of the preview\'s own console', async (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'devtools-host-'));
  const service = createPreviewService({ electron: serviceElectron(), getSession: (id) => (id === 's1' ? { id, cwd } : null), logger: { warn() {}, info() {} }, frameDir: null });
  t.after(() => { service.dispose(); fs.rmSync(cwd, { recursive: true, force: true }); });
  const { devtools } = service;
  assert.deepEqual(devtools.targets(), []);
  let changes = 0;
  devtools.onChange(() => { changes += 1; });
  const tapped = [];
  devtools.onMessage((contents, method, params, sessionId) => tapped.push([method, sessionId]));
  const agent = service.forSession({ id: 's1', cwd }, { requestApproval: async () => false });
  await agent.navigate('http://localhost:3999/');
  const listed = devtools.targets();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].sessionId, 's1');
  assert.equal(listed[0].contents.getURL(), 'http://localhost:3999/');
  assert.ok(changes > 0, 'tab changes reach the proxy');
  const contents = listed[0].contents;
  contents.debugger.emit('message', {}, 'Runtime.consoleAPICalled', { type: 'error', args: [{ value: 'own' }] });
  contents.debugger.emit('message', {}, 'Runtime.consoleAPICalled', { type: 'error', args: [{ value: 'proxied' }] }, 'S-proxy');
  assert.deepEqual(tapped.filter(([method]) => method === 'Runtime.consoleAPICalled'), [['Runtime.consoleAPICalled', undefined], ['Runtime.consoleAPICalled', 'S-proxy']]);
  const logs = JSON.stringify(agent.consoleMessages({ level: 'all' }));
  assert.ok(logs.includes('own'), 'the preview\'s own console still works');
  assert.ok(!logs.includes('proxied'), 'a proxy session\'s console never lands in the preview\'s log');

  assert.equal(devtools.checkNavigation(listed[0].key, 'http://localhost:3999/x'), 'http://localhost:3999/x');
  assert.throws(() => devtools.checkNavigation(listed[0].key, 'https://example.com/'), /isn’t allowed in this preview tab yet/);
  assert.throws(() => devtools.checkNavigation(listed[0].key, 'file:///etc/hosts'), /session’s folder only/);
  assert.throws(() => devtools.checkNavigation(listed[0].key, 'chrome://settings'), /web pages/);
  const key = await devtools.create('about:blank', listed[0].key);
  assert.equal(devtools.targets().length, 2);
  await devtools.close(key);
  assert.equal(devtools.targets().length, 1);
  await assert.rejects(devtools.create('https://example.com/', listed[0].key), /isn’t allowed in the preview yet/);
});
