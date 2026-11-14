// The Chrome bridge's P0 channel without Chrome: protocol framing, the fixed extension ID, the host manifest, and
// native-host.cjs routing between a fake extension (its stdin/stdout, as Chrome drives it) and bridge-client.cjs.
// The real end-to-end run (headless Chrome for Testing + claude-ext/) is `npm run check:chrome-bridge`.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { encode, FrameReader, EXTENSION_ID, HOST_NAME } = require('../electron/browser/protocol.cjs');
const { ChromeBridgeClient, listSockets } = require('../electron/browser/bridge-client.cjs');
const { installNativeHost } = require('../electron/browser/install.cjs');
const HOST = new URL('../electron/browser/native-host.cjs', import.meta.url).pathname;
const EXT_MANIFEST = new URL('../../claude-ext/manifest.json', import.meta.url).pathname;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(test, timeoutMs = 5000) {
  const end = Date.now() + timeoutMs;
  for (;;) { const value = await test(); if (value) return value; if (Date.now() > end) throw new Error('timed out'); await wait(20); }
}

test('frames survive split and coalesced chunks', () => {
  const got = [];
  const reader = new FrameReader((message) => got.push(message));
  const bytes = Buffer.concat([encode({ method: 'notification', params: { type: 'hello', text: 'héllo' } }), encode({ method: 'get_status', tool_use_id: 'a' })]);
  for (let i = 0; i < bytes.length; i += 3) reader.push(bytes.subarray(i, i + 3));
  assert.deepEqual(got, [{ method: 'notification', params: { type: 'hello', text: 'héllo' } }, { method: 'get_status', tool_use_id: 'a' }]);
  assert.equal(bytes.readUInt32LE(0), Buffer.byteLength(JSON.stringify(got[0])));
});

test('the manifest key gives the fixed extension ID', () => {
  const manifest = JSON.parse(fs.readFileSync(EXT_MANIFEST, 'utf8'));
  const hex = crypto.createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32);
  assert.equal([...hex].map((digit) => String.fromCharCode(97 + parseInt(digit, 16))).join(''), EXTENSION_ID);
  assert.ok(manifest.permissions.includes('nativeMessaging'));
});

test('the host manifest names an absolute launcher and only the bridge extension', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-install-'));
  try {
    const { manifest, launcherPath } = installNativeHost({ manifestDir: path.join(dir, 'hosts'), launcherPath: path.join(dir, 'host.sh'), runtime: process.execPath, socketDir: path.join(dir, 's') });
    assert.equal(manifest.name, HOST_NAME);
    assert.ok(path.isAbsolute(manifest.path));
    assert.deepEqual(manifest.allowed_origins, [`chrome-extension://${EXTENSION_ID}/`]);
    assert.equal(fs.statSync(launcherPath).mode & 0o111, 0o111);
    assert.match(fs.readFileSync(launcherPath, 'utf8'), /exec '.+' '.+native-host\.cjs' "\$@"/);
    assert.throws(() => installNativeHost({ manifestDir: 'relative', launcherPath: path.join(dir, 'x.sh') }), /absolute/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the host routes execute_tool to the extension and the answer back to the asking client', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-'));
  const host = spawn(process.execPath, [HOST, `chrome-extension://${EXTENSION_ID}/`], { env: { PATH: process.env.PATH, OPENCLAUDE_CHROME_BRIDGE_DIR: dir }, stdio: ['pipe', 'pipe', 'ignore'] });
  const toExtension = [];
  const reader = new FrameReader((message) => toExtension.push(message));
  host.stdout.on('data', (chunk) => reader.push(chunk));
  const clients = [];
  try {
    const socket = await until(() => listSockets(dir)[0]);
    assert.equal(socket.pid, host.pid);
    assert.equal(fs.statSync(dir).mode & 0o777, 0o700);
    host.stdin.write(encode({ method: 'notification', params: { type: 'hello', extensionId: EXTENSION_ID, version: '0.1.0' }, tool_use_id: null }));
    const [a, b] = [await ChromeBridgeClient.connect({ dir }), await ChromeBridgeClient.connect({ dir })];
    clients.push(a, b);
    const status = await until(async () => { const value = await a.getStatus(); return value.connected ? value : null; });
    assert.equal(status.extension.extensionId, EXTENSION_ID);
    assert.equal(status.host.origin, `chrome-extension://${EXTENSION_ID}/`);

    const heardByB = [];
    b.on('notification', (params) => heardByB.push(params));
    const answer = a.executeTool('ping', { n: 1 }, { toolUseId: 'toolu_1' });
    const request = await until(() => toExtension.find((message) => message.tool_use_id === 'toolu_1'));
    assert.deepEqual(request, { method: 'execute_tool', params: { name: 'ping', args: { n: 1 } }, tool_use_id: 'toolu_1' });
    host.stdin.write(encode({ method: 'tool_response', params: { result: { pong: true } }, tool_use_id: 'toolu_1' }));
    assert.deepEqual(await answer, { pong: true });

    const failing = b.executeTool('read_page', {}, { toolUseId: 'toolu_2' });
    await until(() => toExtension.find((message) => message.tool_use_id === 'toolu_2'));
    host.stdin.write(encode({ method: 'tool_response', params: { error: { code: 'stale_ref', message: 'ref_3 is gone' } }, tool_use_id: 'toolu_2' }));
    await assert.rejects(failing, (error) => error.code === 'stale_ref' && /ref_3/.test(error.message));

    host.stdin.write(encode({ method: 'notification', params: { type: 'tab_changed', tabId: 7 }, tool_use_id: null }));
    await until(() => heardByB.some((params) => params.type === 'tab_changed'));

    await assert.rejects(a.executeTool('slow', {}, { timeoutMs: 100, toolUseId: 'toolu_slow' }), (error) => error.code === 'timeout');
    await until(() => toExtension.find((message) => message.method === 'cancel_tool' && message.tool_use_id === 'toolu_slow'));

    // Stop: the call is given up at once and the extension is told to stop it; b can't cancel a's call.
    const stopper = new AbortController();
    const stopped = a.executeTool('browser_batch', { actions: [] }, { toolUseId: 'toolu_3', signal: stopper.signal });
    await until(() => toExtension.find((message) => message.tool_use_id === 'toolu_3'));
    b.socket.write(encode({ method: 'cancel_tool', params: {}, tool_use_id: 'toolu_3' }));
    stopper.abort();
    await assert.rejects(stopped, (error) => error.code === 'stopped');
    await until(() => toExtension.some((message) => message.method === 'cancel_tool'));
    await wait(100);
    assert.deepEqual(toExtension.filter((message) => message.method === 'cancel_tool' && message.tool_use_id !== 'toolu_slow'), [{ method: 'cancel_tool', params: {}, tool_use_id: 'toolu_3' }]);
    assert.equal(a.pending.size, 0);

    const exited = new Promise((resolve) => host.once('exit', resolve));
    host.stdin.end();
    assert.equal(await exited, 0);
    assert.equal(fs.existsSync(socket.file), false, 'the socket is removed when Chrome closes the port');
    const log = fs.readFileSync(path.join(dir, 'host.log'), 'utf8');
    for (const line of ['electron→host execute_tool ping [toolu_1]', 'host→ext execute_tool ping [toolu_1]', 'ext→host tool_response ok [toolu_1]', 'host→electron tool_response ok [toolu_1]']) assert.ok(log.includes(line), line);
  } finally {
    for (const client of clients) client.close();
    if (host.exitCode === null) host.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('no host running is a clear not_connected error', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-'));
  try { await assert.rejects(ChromeBridgeClient.connect({ dir }), (error) => error.code === 'not_connected'); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// claude-ext's ref bookkeeping and URL rules, its debugger sessions, console / network monitoring and javascript_tool's
// two modes, with a stub of the chrome APIs they touch (chrome.debugger: a fake DevTools protocol per tab).
async function extensionModules() {
  const listeners = { updated: [], removed: [] };
  globalThis.chrome ??= {
    storage: { session: { get: async () => ({}), set: async () => {} } },
    tabs: { onUpdated: { addListener: (fn) => listeners.updated.push(fn) }, onRemoved: { addListener: (fn) => listeners.removed.push(fn) } },
    listeners,
  };
  const refs = await import('../../claude-ext/refs.js');
  const tabs = await import('../../claude-ext/tabs.js');
  return { refs, tabs, listeners: globalThis.chrome.listeners };
}
const codeOf = (fn) => { try { fn(); } catch (error) { return error.code; } return null; };

test('refs: read_page voids older refs, other tabs are refused, navigation makes them stale', async () => {
  const { refs, listeners } = await extensionModules();
  const read = (tabId, names, next) => refs.withRefs(() => refs.record(tabId, Object.fromEntries(names.map((name) => [name, { role: 'button', name }])), next, { replace: true }));
  await read(1, ['ref_1', 'ref_2'], 3);
  assert.equal(refs.checkRef(1, 'ref_2').tabId, 1);
  await refs.withRefs(() => refs.record(1, { ref_3: { role: 'link', name: 'x' } }, 4, { replace: false })); // find joins
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_1')), null);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_3')), null);
  await read(1, ['ref_4'], 5);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_1')), 'stale_ref');
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_3')), 'stale_ref');
  await read(2, ['ref_5'], 6);
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_5')), 'ref_wrong_tab');
  assert.equal(codeOf(() => refs.checkRef(2, 'ref_4')), 'ref_wrong_tab');
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_99')), 'unknown_ref');
  assert.equal(codeOf(() => refs.checkRef(1, 'button')), 'bad_request');
  for (const fn of listeners.updated) fn(1, { status: 'loading' });
  assert.equal(codeOf(() => refs.checkRef(1, 'ref_4')), 'stale_ref');
  assert.equal(codeOf(() => refs.checkRef(2, 'ref_5')), null);
});

// content.js against a page of one button: just enough DOM for find.
function contentScript() {
  const node = (tagName, props = {}) => ({ nodeType: 1, tagName, childNodes: [], hidden: false, attributes: {}, getAttribute(name) { return this.attributes[name] ?? null; }, hasAttribute(name) { return name in this.attributes; }, checkVisibility: () => true, querySelectorAll: () => [], ...props });
  const body = node('BODY');
  const button = node('BUTTON', { parentElement: body, innerText: 'Save', textContent: 'Save' });
  button.childNodes.push({ nodeType: 3, textContent: 'Save' });
  body.childNodes.push(button);
  const sandbox = { document: { body, title: 'T' }, location: { href: 'https://a.test/#top' }, Node: { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_FRAGMENT_NODE: 11 }, WeakRef, getComputedStyle: () => ({}) };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(new URL('../../claude-ext/content.js', import.meta.url), 'utf8'), sandbox);
  return sandbox.__openclaudeBridge;
}

test('refs: find hands a kept ref out again, so it stays valid after a same-document navigation', async () => {
  const { refs } = await extensionModules();
  const page = contentScript();
  const find = (startAt) => refs.withRefs(() => { const out = page.run('find', { query: 'save', startAt }); refs.record(9, out.refs, out.nextRef, { replace: false }); return Array.from(out.result.matches, (match) => match.ref); });
  const [ref] = await find(100);
  assert.equal(codeOf(() => refs.checkRef(9, ref)), null);
  refs.invalidateTab(9); // navigate to #section (tabs.js): the page, and content.js with it, stays
  assert.equal(codeOf(() => refs.checkRef(9, ref)), 'stale_ref');
  assert.deepEqual(await find(200), [ref], 'the element keeps its ref');
  assert.equal(codeOf(() => refs.checkRef(9, ref)), null);
});

test('sites: a page without a host of its own is refused unless it is the bridge’s blank tab', async () => {
  const { tabs } = await extensionModules();
  const ctx = { allowedHosts: ['other.example'] };
  const failure = async (tab) => { try { await tabs.assertTabSite(tab, ctx); } catch (error) { return [error.code, error.data?.host ?? null]; } return null; };
  assert.deepEqual(await failure({ id: 31, url: 'blob:https://bank.example/1234-uuid' }), ['site_not_allowed', 'bank.example']);
  assert.deepEqual(await failure({ id: 32, url: 'about:blank' }), ['site_unknown', null]);
  assert.deepEqual(await failure({ id: 33, url: 'https://other.example/a' }), null);
  const sites = await import('../../claude-ext/sites.js');
  assert.equal(codeOf(() => sites.assertSite('about:blank', ctx)), null, 'opening a blank tab is fine');
  assert.equal(codeOf(() => sites.assertSite('about:blank', ctx, { blankOk: false })), 'site_unknown');
});

test('navigate back checks the site it lands on, and leaves it again when that isn’t allowed', async () => {
  const { tabs } = await extensionModules();
  const history = ['https://bank.example/', 'https://a.example/'];
  let at = 1;
  const tab = () => ({ id: 41, url: history[at], title: `page ${at}`, status: 'complete' });
  Object.assign(globalThis.chrome.tabs, {
    get: async (id) => { if (id !== 41) throw new Error('no tab'); return tab(); },
    goBack: async () => { if (at === 0) throw new Error('no history'); at -= 1; },
    goForward: async () => { if (at === history.length - 1) throw new Error('no history'); at += 1; },
  });
  globalThis.chrome.tabs.onUpdated.removeListener ??= () => {};
  globalThis.chrome.tabs.onRemoved.removeListener ??= () => {};
  await assert.rejects(tabs.navigate({ url: 'back', tabId: 41 }, { allowedHosts: ['a.example'] }), (error) => error.code === 'site_not_allowed' && error.data.host === 'bank.example');
  assert.equal(history[at], 'https://a.example/', 'the tab went forward again');
  const landed = await tabs.navigate({ url: 'back', tabId: 41 }, { allowedHosts: ['a.example', 'bank.example'] });
  assert.deepEqual([landed.url, landed.status], ['https://bank.example/', 'complete']);
});

test('after a worker restart, opening a tab keeps the saved list of tabs the bridge opened', async () => {
  await extensionModules();
  const saved = { openedTabs: [11, 12], currentTabId: 12 };
  const session = globalThis.chrome.storage.session;
  globalThis.chrome.storage.session = { get: async () => ({ ...saved }), set: async (values) => { Object.assign(saved, values); } };
  const create = globalThis.chrome.tabs.create, get = globalThis.chrome.tabs.get;
  globalThis.chrome.tabs.create = async ({ url }) => ({ id: 50, url });
  globalThis.chrome.tabs.get = async (id) => ({ id, url: 'https://c.example/', title: 'C', status: 'complete' });
  globalThis.chrome.tabs.onUpdated.removeListener ??= () => {};
  globalThis.chrome.tabs.onRemoved.removeListener ??= () => {};
  try {
    const fresh = await import('../../claude-ext/tabs.js?restarted'); // a new worker: tabs.js's state starts empty
    await fresh.navigate({ url: 'https://c.example/' });
    assert.deepEqual([...saved.openedTabs].sort((a, b) => a - b), [11, 12, 50]);
  } finally { Object.assign(globalThis.chrome.tabs, { create, get }); globalThis.chrome.storage.session = session; }
});

test('navigate takes http(s) URLs and bare hosts only', async () => {
  const { tabs } = await extensionModules();
  assert.equal(tabs.normalizeUrl('example.com'), 'https://example.com/');
  assert.equal(tabs.normalizeUrl('localhost:3000/a'), 'https://localhost:3000/a');
  assert.equal(tabs.normalizeUrl('localhost:3000?q=1'), 'https://localhost:3000/?q=1');
  assert.equal(tabs.normalizeUrl('example.com:8080#top'), 'https://example.com:8080/#top');
  assert.equal(tabs.normalizeUrl('http://127.0.0.1:8080/x?y=1'), 'http://127.0.0.1:8080/x?y=1');
  for (const bad of ['chrome://version', 'javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,hi']) assert.equal(codeOf(() => tabs.normalizeUrl(bad)), 'bad_url', bad);
  assert.equal(codeOf(() => tabs.normalizeUrl('  ')), 'bad_request');
});

// ── chrome.debugger: attach / detach / sendCommand on a fake protocol, events sent by the test ─────────────────────────
// Each tab shows fake.pages.get(tabId) (default https://a.test/) in its main frame "MAIN"; Runtime.enable reports that
// document's context (as V8 does, before it answers) and Runtime.compileScript needs it, as in Chrome.
function fakeDebugger() {
  if (globalThis.chrome.debugger?.fake) return globalThis.chrome.debugger.fake;
  const fake = { attached: new Set(), runtime: new Set(), pages: new Map(), log: [], replies: {}, detachListeners: [], eventListeners: [] };
  fake.urlOf = (tabId) => fake.pages.get(tabId) ?? 'https://a.test/';
  const contextCreated = (tabId) => fake.emit(tabId, 'Runtime.executionContextCreated', { context: { id: 1, uniqueId: `ctx-${tabId}-${fake.urlOf(tabId)}`, origin: new URL(fake.urlOf(tabId)).origin, name: '', auxData: { frameId: 'MAIN', isDefault: true, type: 'default' } } });
  /** The tab's main frame loads url: its old document's context goes, the new one's comes (where Runtime is on). */
  fake.navigate = (tabId, url) => {
    if (fake.runtime.has(tabId)) fake.emit(tabId, 'Runtime.executionContextsCleared', {});
    if (url) fake.pages.set(tabId, url); else fake.pages.delete(tabId);
    if (fake.runtime.has(tabId)) contextCreated(tabId);
  };
  const defaults = {
    'Page.getFrameTree': (params, tabId) => ({ frameTree: { frame: { id: 'MAIN', url: fake.urlOf(tabId) } } }),
    'Runtime.enable': (params, tabId) => { contextCreated(tabId); return {}; },
  };
  fake.emit = (tabId, method, params) => { for (const fn of fake.eventListeners) fn({ tabId }, method, params); };
  fake.userCancels = (tabId) => { fake.attached.delete(tabId); for (const fn of fake.detachListeners) fn({ tabId }, 'canceled_by_user'); };
  fake.calls = (tabId, method) => fake.log.filter((entry) => entry.tabId === tabId && (!method || entry.method === method));
  globalThis.chrome.debugger = {
    fake,
    onDetach: { addListener: (fn) => fake.detachListeners.push(fn) },
    onEvent: { addListener: (fn) => fake.eventListeners.push(fn) },
    async attach({ tabId }) { if (fake.attached.has(tabId)) throw new Error(`Another debugger is already attached to the tab with id: ${tabId}.`); fake.attached.add(tabId); fake.log.push({ tabId, method: 'attach' }); },
    async detach({ tabId }) { if (!fake.attached.has(tabId)) throw new Error('Debugger is not attached to the tab'); fake.attached.delete(tabId); fake.runtime.delete(tabId); fake.log.push({ tabId, method: 'detach' }); },
    async sendCommand({ tabId }, method, params = {}) {
      if (!fake.attached.has(tabId)) throw new Error('Debugger is not attached to the tab');
      fake.log.push({ tabId, method, params });
      if (method === 'Runtime.enable') fake.runtime.add(tabId);
      if (method === 'Runtime.disable') fake.runtime.delete(tabId);
      if (method === 'Runtime.compileScript' && !fake.runtime.has(tabId)) throw new Error('Runtime agent is not enabled');
      const reply = fake.replies[method] ?? defaults[method];
      return typeof reply === 'function' ? reply(params, tabId) : reply ?? {};
    },
  };
  return fake;
}
async function debuggerModules() {
  const { listeners } = await extensionModules();
  const fake = fakeDebugger();
  const monitor = await import('../../claude-ext/monitor.js');
  const script = await import('../../claude-ext/script.js');
  const sites = await import('../../claude-ext/sites.js');
  return { fake, monitor, script, sites, listeners };
}
const str = (value) => ({ type: 'string', value });
const num = (value) => ({ type: 'number', value, description: String(value) });

test('console: the first read starts watching, replays what the page logged before, and filters, limits and clears', async () => {
  const { fake, monitor } = await debuggerModules();
  const tab = { id: 101, url: 'https://a.test/' };
  // V8 replays the messages it still holds while Runtime.enable runs.
  fake.replies['Runtime.enable'] = (params, tabId) => {
    fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 1, args: [str('boot %s: %d items %c'), str('app'), num(3.7), str('color: red'), { type: 'object', subtype: 'array', preview: { type: 'object', subtype: 'array', properties: [{ name: '0', type: 'number', value: '1' }, { name: '1', type: 'string', value: 'b' }], overflow: false } }], stackTrace: { callFrames: [{ url: 'https://a.test/app.js', lineNumber: 2, columnNumber: 8 }] } });
    return {};
  };
  const first = await monitor.readConsole(tab);
  assert.equal(first.started, true);
  assert.deepEqual(first.messages, [{ level: 'log', text: 'boot app: 3 items  [1, "b"]', url: 'https://a.test/app.js', line: 3, column: 9, timestamp: 1, source: 'console' }]);
  assert.deepEqual(fake.calls(101).map((entry) => entry.method), ['attach', 'Page.getFrameTree', 'Network.enable', 'Log.enable', 'Runtime.enable']);
  delete fake.replies['Runtime.enable'];
  fake.emit(101, 'Runtime.consoleAPICalled', { type: 'warning', timestamp: 2, args: [str('careful'), { type: 'object', className: 'Object', description: 'Object', preview: { type: 'object', description: 'Object', properties: [{ name: 'a', type: 'number', value: '1' }, { name: 'nested', type: 'object', valuePreview: { type: 'object', description: 'Object', properties: [{ name: 'b', type: 'boolean', value: 'true' }] } }], overflow: true } }] });
  fake.emit(101, 'Runtime.exceptionThrown', { timestamp: 3, exceptionDetails: { exceptionId: 7, text: 'Uncaught', lineNumber: 6, columnNumber: 0, url: 'https://a.test/app.js', exception: { type: 'object', subtype: 'error', description: 'TypeError: x is not a function\n    at https://a.test/app.js:7:1' } } });
  fake.emit(101, 'Log.entryAdded', { entry: { source: 'network', level: 'error', text: 'Failed to load resource: the server responded with a status of 404 (Not Found)', url: 'https://a.test/missing.png', timestamp: 4 } });
  fake.emit(101, 'Runtime.consoleAPICalled', { type: 'assert', timestamp: 5, args: [str('totals match')] });
  fake.emit(101, 'Runtime.exceptionThrown', { timestamp: 6, exceptionDetails: { exceptionId: 8, text: 'Uncaught (in promise)', exception: { type: 'string', value: 'later handled' } } });
  fake.emit(101, 'Runtime.exceptionRevoked', { exceptionId: 8, reason: 'Handler added to rejected promise' });
  const all = await monitor.readConsole(tab);
  assert.equal(all.started, false);
  assert.deepEqual(all.messages.map((m) => [m.level, m.source, m.text]), [
    ['log', 'console', 'boot app: 3 items  [1, "b"]'],
    ['warn', 'console', 'careful {a: 1, nested: {b: true}, …}'],
    ['error', 'exception', 'Uncaught TypeError: x is not a function'],
    ['error', 'network', 'Failed to load resource: the server responded with a status of 404 (Not Found)'],
    ['error', 'console', 'Assertion failed: totals match'],
  ]);
  assert.deepEqual([all.messages[2].url, all.messages[2].line, all.messages[2].column], ['https://a.test/app.js', 7, 1]);
  assert.deepEqual((await monitor.readConsole(tab, { onlyErrors: true, limit: 2 })).messages.map((m) => m.timestamp), [4, 5], 'the newest errors');
  assert.deepEqual((await monitor.readConsole(tab, { pattern: /TYPEERROR|careful/i })).messages.map((m) => m.timestamp), [2, 3]);
  const cleared = await monitor.readConsole(tab, { pattern: /careful/i, clear: true });
  assert.deepEqual([cleared.matched, cleared.cleared], [1, true]);
  assert.equal((await monitor.readConsole(tab)).total, 0);
  assert.equal(fake.calls(101, 'attach').length, 1, 'one attachment for the whole time');
  monitor.stop(101);
});

test('console: a replayed message’s objects (V8 replays them without previews) get their previews, in place', async () => {
  const { fake, monitor } = await debuggerModules();
  const tab = { id: 120, url: 'https://a.test/' };
  const bare = (objectId, subtype) => ({ type: 'object', ...(subtype ? { subtype } : {}), className: subtype === 'array' ? 'Array' : 'Object', description: subtype === 'array' ? 'Array(2)' : 'Object', objectId });
  // As V8RuntimeAgentImpl::enable replays its stored messages: generatePreview false, so objects come bare.
  fake.replies['Runtime.enable'] = (params, tabId) => {
    fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 1, args: [str('early boot'), bare('obj-boot')] });
    fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 2, args: [str('gone'), bare('obj-gone')] });
    fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'warning', timestamp: 3, args: [str('list %o'), bare('obj-list', 'array'), { type: 'object', subtype: 'null', value: null }] });
    return {};
  };
  const previews = {
    'obj-boot': { type: 'object', description: 'Object', overflow: false, properties: [{ name: 'stage', type: 'number', value: '1' }, { name: 'list', type: 'object', subtype: 'array', value: 'Array(2)' }] },
    'obj-list': { type: 'object', subtype: 'array', description: 'Array(2)', overflow: false, properties: [{ name: '0', type: 'number', value: '1' }, { name: '1', type: 'number', value: '2' }] },
  };
  fake.replies['Runtime.callFunctionOn'] = async (params) => {
    await wait(5);
    if (params.objectId === 'obj-gone') throw new Error('Could not find object with given id');
    return { result: { type: 'object', objectId: `copy-${params.objectId}`, description: 'Object', preview: previews[params.objectId] } };
  };
  const first = await monitor.readConsole(tab);
  assert.deepEqual(first.messages.map((m) => [m.timestamp, m.text]), [[1, 'early boot {stage: 1, list: Array(2)}'], [2, 'gone Object'], [3, 'list [1, 2] null']], 'previewed where V8 still had the object, in the order logged');
  const asked = fake.calls(120, 'Runtime.callFunctionOn');
  assert.deepEqual(asked.map((entry) => entry.params.objectId), ['obj-list', 'obj-gone', 'obj-boot'], 'only the bare objects, one after another, newest message first');
  for (const { params } of asked) assert.deepEqual([params.functionDeclaration, params.generatePreview, params.silent, params.objectGroup], ['function () { return this; }', true, true, 'openclaude-monitor']);
  assert.deepEqual(fake.calls(120, 'Runtime.releaseObjectGroup').map((entry) => entry.params.objectGroup), ['openclaude-monitor'], 'the previews’ objects released once all are in');
  // Live messages come with their previews: nothing more is asked.
  delete fake.replies['Runtime.enable'];
  fake.emit(120, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 4, args: [{ ...bare('obj-live'), preview: previews['obj-boot'] }] });
  assert.equal((await monitor.readConsole(tab)).messages.at(-1).text, '{stage: 1, list: Array(2)}');
  assert.equal(fake.calls(120, 'Runtime.callFunctionOn').length, 3);
  monitor.stop(120);
  delete fake.replies['Runtime.callFunctionOn'];
});

test('console: replayed previews are bounded, go to the newest messages, and a tab detached meanwhile keeps the plain text', async () => {
  const { fake, monitor } = await debuggerModules();
  const bare = (objectId) => ({ type: 'object', className: 'Object', description: 'Object', objectId });
  fake.replies['Runtime.enable'] = (params, tabId) => {
    for (let i = 0; i < 150; i++) fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: i, args: [str(`m${i}`), bare(`o${i}`)] });
    return {};
  };
  fake.replies['Runtime.callFunctionOn'] = () => ({ result: { type: 'object', objectId: 'c', preview: { type: 'object', description: 'Object', properties: [{ name: 'k', type: 'number', value: '1' }] } } });
  // A default read shows the newest 100: those are the ones previewed, the older ones keep the class name.
  const newest = await monitor.readConsole({ id: 121, url: 'https://a.test/' });
  assert.deepEqual([newest.total, newest.messages.length, newest.messages[0].text, newest.messages.at(-1).text], [150, 100, 'm50 {k: 1}', 'm149 {k: 1}']);
  assert.ok(newest.messages.every((m) => m.text.endsWith('{k: 1}')), 'every message a default read shows is previewed');
  const asked = fake.calls(121, 'Runtime.callFunctionOn').map((entry) => entry.params.objectId);
  assert.deepEqual([asked.length, asked[0], asked.at(-1)], [100, 'o149', 'o50'], 'at most 100 previews per monitor, newest first');
  const many = await monitor.readConsole({ id: 121, url: 'https://a.test/' }, { limit: 1000 });
  assert.deepEqual(many.messages.map((m) => m.timestamp), [...Array(150).keys()], 'the messages keep the order logged');
  assert.deepEqual([many.messages[49].text, many.messages[50].text], ['m49 Object', 'm50 {k: 1}']);
  monitor.stop(121);

  // Messages the tab no longer keeps (it went to another origin during the replay) cost no previews.
  fake.replies['Runtime.enable'] = (params, tabId) => {
    for (let i = 0; i < 3; i++) fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: i, args: [str(`old${i}`), bare(`old${i}`)] });
    fake.emit(tabId, 'Network.requestWillBeSent', { requestId: 'nav', loaderId: 'nav', frameId: 'MAIN', type: 'Document', timestamp: 1, request: { url: 'https://b.test/', method: 'GET' } });
    fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 9, args: [str('new'), bare('new')] });
    return {};
  };
  const moved = await monitor.readConsole({ id: 123, url: 'https://a.test/' });
  assert.deepEqual(moved.messages.map((m) => m.text), ['new {k: 1}']);
  assert.deepEqual(fake.calls(123, 'Runtime.callFunctionOn').map((entry) => entry.params.objectId), ['new'], 'only the message still kept');
  monitor.stop(123);

  // The user cancels the debugging bar while the previews are being asked for: the read still answers, unpreviewed.
  let cancel;
  fake.replies['Runtime.enable'] = (params, tabId) => { fake.emit(tabId, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 1, args: [str('early'), bare('o')] }); return {}; };
  fake.replies['Runtime.callFunctionOn'] = (params, tabId) => new Promise((resolve, reject) => { cancel = () => { fake.userCancels(tabId); reject(new Error('Debugger is not attached to the tab')); }; });
  const reading = monitor.readConsole({ id: 122, url: 'https://a.test/' });
  await until(() => cancel);
  await wait(150); // past the replay's settling: the read is waiting for the previews
  cancel();
  assert.deepEqual((await reading).messages.map((m) => m.text), ['early Object']);
  assert.deepEqual(monitor.monitoredTabs().filter((id) => id === 122), [], 'monitoring ended with the detach');
  delete fake.replies['Runtime.enable'];
  delete fake.replies['Runtime.callFunctionOn'];
});

test('network: requests from the first read on, with status, size, time, cache, failures and redirects', async () => {
  const { fake, monitor } = await debuggerModules();
  const tab = { id: 102, url: 'https://a.test/' };
  const start = await monitor.readNetwork(tab);
  assert.deepEqual([start.started, start.total], [true, 0]);
  const send = (requestId, url, extra = {}) => fake.emit(102, 'Network.requestWillBeSent', { requestId, loaderId: 'L', frameId: 'MAIN', type: 'Fetch', timestamp: 10, wallTime: 1700000000, initiator: { type: 'script' }, request: { url, method: 'GET', headers: { Accept: '*/*', Authorization: 'Bearer secret' } }, ...extra });
  send('1', 'https://a.test/api');
  fake.emit(102, 'Network.responseReceived', { requestId: '1', type: 'Fetch', response: { status: 200, statusText: 'OK', mimeType: 'application/json', headers: { 'Set-Cookie': 'sid=1', 'Content-Type': 'application/json' }, encodedDataLength: 80 } });
  fake.emit(102, 'Network.loadingFinished', { requestId: '1', timestamp: 10.25, encodedDataLength: 300 });
  send('2', 'https://cdn.test/x.js', { type: 'Script', initiator: { type: 'parser' } });
  fake.emit(102, 'Network.loadingFailed', { requestId: '2', timestamp: 10.5, errorText: 'net::ERR_BLOCKED_BY_CLIENT', blockedReason: 'inspector' });
  send('3', 'https://a.test/old', { type: 'Document', loaderId: '3' });
  send('3', 'https://a.test/new', { type: 'Document', loaderId: '3', timestamp: 10.1, redirectResponse: { status: 301, statusText: 'Moved Permanently', mimeType: 'text/html' } });
  fake.emit(102, 'Network.requestServedFromCache', { requestId: '3' });
  send('4', 'https://a.test/slow');
  const list = await monitor.readNetwork(tab, { headers: true });
  assert.deepEqual(list.requests.map((r) => [r.requestId, r.method, r.url, r.status ?? null, r.failed, r.pending ?? false]), [
    ['1', 'GET', 'https://a.test/api', 200, false, false], ['2', 'GET', 'https://cdn.test/x.js', null, true, false],
    ['3', 'GET', 'https://a.test/old', 301, false, false], ['3', 'GET', 'https://a.test/new', null, false, true], ['4', 'GET', 'https://a.test/slow', null, false, true],
  ]);
  const [api, blocked, , moved] = list.requests;
  assert.deepEqual([api.type, api.mimeType, api.size, api.duration, api.initiator, api.fromCache], ['Fetch', 'application/json', 300, 250, 'script', false]);
  assert.deepEqual(api.headers, { request: { Accept: '*/*', Authorization: '(redacted)' }, response: { 'Set-Cookie': '(redacted)', 'Content-Type': 'application/json' } });
  assert.equal(blocked.errorText, 'net::ERR_BLOCKED_BY_CLIENT, blocked: inspector');
  assert.equal(moved.fromCache, true);
  assert.equal((await monitor.readNetwork(tab)).requests[0].headers, undefined, 'no headers unless asked');
  assert.deepEqual((await monitor.readNetwork(tab, { match: (url) => url.includes('cdn.') })).requests.map((r) => r.requestId), ['2']);
  assert.deepEqual((await monitor.readNetwork(tab, { limit: 1 })).requests.map((r) => r.requestId), ['4']);
  // One request's body.
  fake.replies['Network.getResponseBody'] = ({ requestId }) => (requestId === '1' ? { body: '{"ok":true}', base64Encoded: false } : { body: 'AAAA', base64Encoded: true });
  const one = await monitor.readNetwork(tab, { requestId: '1' });
  assert.deepEqual([one.request.body, one.request.headers.request.Authorization], ['{"ok":true}', '(redacted)']);
  assert.equal((await monitor.readNetwork(tab, { requestId: '2' })).request.bodyOmitted, 'binary, 3 bytes');
  await assert.rejects(monitor.readNetwork(tab, { requestId: 'nope' }), (error) => error.code === 'not_found');
  monitor.stop(102);
});

test('a navigation to another origin starts over; the same origin keeps what was recorded', async () => {
  const { fake, monitor, listeners } = await debuggerModules();
  const tab = { id: 103, url: 'https://a.test/' };
  await monitor.readConsole(tab);
  const log = (text) => fake.emit(103, 'Runtime.consoleAPICalled', { type: 'log', timestamp: 1, args: [str(text)] });
  const nav = (url, frameId = 'MAIN') => fake.emit(103, 'Network.requestWillBeSent', { requestId: url, loaderId: url, frameId, type: 'Document', timestamp: 1, request: { url, method: 'GET' } });
  log('on a.test');
  nav('https://a.test/other');
  log('still a.test');
  nav('https://ads.test/frame', 'CHILD');
  assert.deepEqual((await monitor.readConsole(tab)).messages.map((m) => m.text), ['on a.test', 'still a.test']);
  assert.equal((await monitor.readNetwork(tab)).total, 2);
  nav('https://b.test/');
  log('on b.test');
  assert.deepEqual((await monitor.readConsole(tab)).messages.map((m) => m.text), ['on b.test']);
  assert.deepEqual((await monitor.readNetwork(tab)).requests.map((r) => r.url), ['https://b.test/'], 'the new page’s own request is kept');
  // A navigation the network didn't show (back/forward cache): the tab's URL says so.
  for (const fn of listeners.updated) fn(103, { url: 'https://c.test/' });
  assert.equal((await monitor.readConsole(tab)).total, 0);
  monitor.stop(103);
});

test('monitoring ends when the user cancels the debugging bar, the tab closes, or it is stopped; a read starts it again', async () => {
  const { fake, monitor, listeners } = await debuggerModules();
  const tab = { id: 104, url: 'https://a.test/' };
  await monitor.readConsole(tab);
  assert.ok(fake.attached.has(104));
  fake.userCancels(104);
  assert.deepEqual(monitor.monitoredTabs().includes(104), false);
  assert.equal((await monitor.readConsole(tab)).started, true, 'the next read watches again');
  assert.equal(fake.calls(104, 'attach').length, 2);
  monitor.stop(104);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(fake.attached.has(104), false, 'stopped: detached, so Chrome’s bar goes away');
  await monitor.readConsole(tab);
  for (const fn of listeners.removed) fn(104);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(monitor.monitoredTabs().includes(104), false);
});

test('monitoring stops after ten minutes without a read', async (t) => {
  const { fake, monitor } = await debuggerModules();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const tab = { id: 105, url: 'https://a.test/' };
  const reading = monitor.readConsole(tab);
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(100); // the replay settle
  await reading;
  t.mock.timers.tick(9 * 60_000);
  assert.ok(monitor.monitoredTabs().includes(105));
  t.mock.timers.tick(60_000);
  assert.equal(monitor.monitoredTabs().includes(105), false);
  t.mock.timers.reset();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fake.attached.has(105), false);
});

test('javascript_tool shares the tab’s debugger: attached for the call alone, never detaching a monitor', async () => {
  const { fake, monitor, script } = await debuggerModules();
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'string', value: 'T' } });
  const tab = { id: 106, url: 'https://a.test/' };
  assert.deepEqual(await script.runReadOnly(tab, 'document.title'), { type: 'string', value: 'T' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(fake.calls(106).filter((entry) => entry.method === 'attach' || entry.method === 'detach').map((entry) => entry.method), ['attach', 'detach']);
  await monitor.readConsole(tab);
  await script.runReadOnly(tab, 'document.title');
  await script.runWrite(tab, 'document.title = "x"');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(fake.attached.has(106), 'the monitor keeps it');
  assert.equal(fake.calls(106, 'attach').length, 2, 'the calls used the monitor’s session');
  monitor.stop(106);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(fake.attached.has(106), false);
  delete fake.replies['Runtime.evaluate'];
});

test('javascript_tool write: true runs as the console does; read-only stays as it was', async () => {
  const { fake, script } = await debuggerModules();
  const tab = { id: 107, url: 'https://a.test/' };
  fake.replies['Runtime.evaluate'] = (params) => (params.expression.includes('boom') ? { exceptionDetails: { lineNumber: 1, columnNumber: 4, exception: { className: 'Error', description: 'Error: boom\n    at <anonymous>:2:5' } } } : { result: { type: 'number', value: 2, description: '2' } });
  fake.replies['Runtime.compileScript'] = ({ expression }) => (expression.includes('await') ? { exceptionDetails: { text: 'SyntaxError' } } : {});
  assert.deepEqual(await script.runWrite(tab, 'let n = await Promise.resolve(1);\nn + 1', { timeoutMs: 5000 }), { type: 'number', value: 2 });
  const evaluate = fake.calls(107, 'Runtime.evaluate').at(-1).params;
  assert.deepEqual({ ...evaluate, objectGroup: undefined }, { expression: 'let n = await Promise.resolve(1);\nn + 1', replMode: true, awaitPromise: true, userGesture: true, includeCommandLineAPI: true, returnByValue: false, objectGroup: undefined, uniqueContextId: 'ctx-107-https://a.test/', timeout: 5000, allowUnsafeEvalBlockedByCSP: true, silent: true });
  assert.equal(fake.calls(107, 'Emulation.setDocumentCookieDisabled').length, 0, 'the page’s cookies as they are');
  // An object literal is wrapped as DevTools wraps it, when that compiles (Runtime is on for it, in a tab no monitor
  // holds too); a block with await is run as it is.
  await script.runWrite(tab, '{ a: 1 }');
  assert.equal(fake.calls(107, 'Runtime.evaluate').at(-1).params.expression, '({ a: 1 })');
  const order = fake.calls(107).map((entry) => entry.method);
  assert.ok(order.lastIndexOf('Runtime.enable') < order.lastIndexOf('Runtime.compileScript'));
  await script.runWrite(tab, '{ await go(); 1 }');
  assert.equal(fake.calls(107, 'Runtime.evaluate').at(-1).params.expression, '{ await go(); 1 }');
  await assert.rejects(script.runWrite(tab, 'x;\nboom()'), (error) => error.code === 'js_error' && error.message === 'Error: boom\n    at <anonymous>:2:5 (line 2, column 5)');
  // A promise the code ends with (no await): its value, as awaitPromise would give it; a rejection is an error.
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'object', subtype: 'promise', className: 'Promise', description: 'Promise', objectId: 'p1' } });
  fake.replies['Runtime.awaitPromise'] = ({ promiseObjectId }) => (promiseObjectId === 'p1' ? { result: { type: 'number', value: 42, description: '42' } } : {});
  assert.deepEqual(await script.runWrite(tab, 'fetch("/n").then((r) => r.json())'), { type: 'number', value: 42 });
  fake.replies['Runtime.awaitPromise'] = () => ({ exceptionDetails: { text: 'Uncaught (in promise)', exception: { className: 'TypeError', description: 'TypeError: Failed to fetch' } } });
  await assert.rejects(script.runWrite(tab, 'fetch("/n")'), (error) => error.code === 'js_error' && /Failed to fetch/.test(error.message));
  delete fake.replies['Runtime.awaitPromise'];
  // A promise that never settles: given up on after timeout_ms.
  fake.replies['Runtime.evaluate'] = () => new Promise(() => {});
  await assert.rejects(script.runWrite(tab, 'await new Promise(() => {})', { timeoutMs: 100 }), (error) => error.code === 'timeout' && /didn't finish within/.test(error.message));
  // Read-only: still refuses await, still evaluates with throwOnSideEffect and the cookies off.
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'string', value: 'T' } });
  await assert.rejects(script.runReadOnly(tab, 'await x'), (error) => error.code === 'not_supported' && /write: true/.test(error.message));
  await assert.rejects(script.runReadOnly(tab, 'fetch("/x")'), (error) => error.code === 'not_read_only');
  await script.runReadOnly(tab, 'document.title');
  assert.equal(fake.calls(107, 'Runtime.evaluate').at(-1).params.throwOnSideEffect, true);
  assert.equal(fake.calls(107, 'Runtime.evaluate').at(-1).params.uniqueContextId, 'ctx-107-https://a.test/');
  assert.deepEqual(fake.calls(107, 'Emulation.setDocumentCookieDisabled').map((entry) => entry.params.disabled), [true, false]);
  delete fake.replies['Runtime.evaluate'];
  delete fake.replies['Runtime.compileScript'];
});

// The exceptions as V8 reports them: an exception that rejected a promise (in replMode every runtime error, and a
// trailing promise's rejection, which Runtime.awaitPromise reports) has a 1-based lineNumber / columnNumber — and a
// value that isn't an Error, caught there in a microtask, no stack and line 0 —, one thrown synchronously (read-only)
// or a syntax error a 0-based one; the stack's frames are 0-based, the Error's stack text 1-based. The line and column
// reported are the model's code's, whatever the path and the wrapping, and only ever from the code's own script.
test('a script’s error says where in the code it was thrown, on every path', async () => {
  const { fake, script } = await debuggerModules();
  const tab = { id: 113, url: 'https://a.test/' };
  const error = (description, at, frames, extra = {}) => ({ exceptionDetails: { exceptionId: 1, text: 'Uncaught', lineNumber: at[0], columnNumber: at[1], scriptId: '42', ...(frames ? { stackTrace: { callFrames: frames } } : {}), exception: { type: 'object', subtype: 'error', className: description.split(':')[0], description }, ...extra } });
  const frame = (lineNumber, columnNumber, url = '', scriptId = url ? '7' : '42') => ({ functionName: '', scriptId, url, lineNumber, columnNumber });
  const fails = async (promise) => { try { await promise; } catch (failure) { return [failure.code, failure.message]; } return null; };
  fake.replies['Runtime.compileScript'] = ({ expression }) => (expression.includes('await') || expression.includes('throw') ? { exceptionDetails: { text: 'SyntaxError' } } : {});

  // replMode, a throw after an await (the live run: V8 said line 3, column 8): the stack's frame, 0-based.
  fake.replies['Runtime.evaluate'] = () => error("Error: bad\n    at <anonymous>:2:7", [2, 7], [frame(1, 6)]);
  assert.deepEqual(await fails(script.runWrite(tab, "await null;\nthrow new Error('bad')")), ['js_error', "Error: bad\n    at <anonymous>:2:7 (line 2, column 7)"]);
  // replMode, a synchronous throw: it rejects the evaluation's promise too.
  fake.replies['Runtime.evaluate'] = () => error("TypeError: Cannot read properties of null (reading 'x')\n    at <anonymous>:2:5", [2, 5], [frame(1, 4)]);
  assert.deepEqual(await fails(script.runWrite(tab, 'const a = 1;\nnull.x')), ['js_error', "TypeError: Cannot read properties of null (reading 'x')\n    at <anonymous>:2:5 (line 2, column 5)"]);
  // Thrown in the page’s own function the code called: placed at the call in the code.
  fake.replies['Runtime.evaluate'] = () => error('Error: inside\n    at go (https://a.test/app.js:10:11)\n    at <anonymous>:3:1', [10, 11], [frame(9, 10, 'https://a.test/app.js'), frame(2, 0)]);
  assert.equal((await fails(script.runWrite(tab, '1;\n2;\ngo()')))[1], 'Error: inside\n    at go (https://a.test/app.js:10:11)\n    at <anonymous>:3:1 (line 3, column 1)');
  // No stack frames given: the Error's own stack text (1-based), not exceptionDetails' line.
  fake.replies['Runtime.evaluate'] = () => error("Error: bad\n    at <anonymous>:2:7", [2, 7], null);
  assert.equal((await fails(script.runWrite(tab, "await null;\nthrow new Error('bad')")))[1], "Error: bad\n    at <anonymous>:2:7 (line 2, column 7)");
  // A value that isn't an Error, in replMode (after an await or not): caught in a microtask, where V8 captures no stack —
  // no stackTrace, line 0 —, so no place (not "line 1, column 1" whatever line threw).
  fake.replies['Runtime.evaluate'] = () => ({ exceptionDetails: { exceptionId: 2, text: 'Uncaught', lineNumber: 0, columnNumber: 0, exception: { type: 'string', value: 'x' } } });
  assert.deepEqual(await fails(script.runWrite(tab, "await null;\n\nthrow 'x'")), ['js_error', 'Uncaught "x"']);
  fake.replies['Runtime.evaluate'] = () => ({ exceptionDetails: { exceptionId: 3, text: 'Uncaught', lineNumber: 0, columnNumber: 0, exception: { type: 'number', value: 42, description: '42' } } });
  assert.deepEqual(await fails(script.runWrite(tab, '1;\nthrow 42')), ['js_error', 'Uncaught 42']);
  // With async stack traces on, the stack is there but has no frames: no place either.
  fake.replies['Runtime.evaluate'] = () => ({ exceptionDetails: { exceptionId: 4, text: 'Uncaught', lineNumber: 0, columnNumber: 0, stackTrace: { callFrames: [] }, exception: { type: 'string', value: 'x' } } });
  assert.deepEqual(await fails(script.runWrite(tab, "await null;\nthrow 'x'")), ['js_error', 'Uncaught "x"']);
  // An object that isn't an Error, the same: its description, no place.
  fake.replies['Runtime.evaluate'] = () => ({ exceptionDetails: { exceptionId: 5, text: 'Uncaught', lineNumber: 0, columnNumber: 0, exception: { type: 'object', className: 'Object', description: 'Object' } } });
  assert.deepEqual(await fails(script.runWrite(tab, '1;\nthrow { a: 1 }')), ['js_error', 'Object']);

  // A function an earlier write call declared (replMode keeps it; its script has no URL either), called by this one:
  // placed at the call in this code, not at the earlier script's line; that script's <anonymous> line is left as is.
  fake.replies['Runtime.evaluate'] = () => error('Error: x\n    at helper (<anonymous>:3:26)\n    at <anonymous>:3:1', [3, 26], [frame(2, 25, '', '41'), frame(2, 0)]);
  assert.equal((await fails(script.runWrite(tab, '1;\n2;\nhelper()')))[1], 'Error: x\n    at helper (<anonymous>:3:26)\n    at <anonymous>:3:1 (line 3, column 1)');
  // Read-only (a line before the code): only this code's stack lines are moved to its lines.
  fake.replies['Runtime.evaluate'] = ({ expression }) => (expression.startsWith('(')
    ? error("SyntaxError: Unexpected token ';'", [2, 1], null)
    : error('Error: x\n    at helper (<anonymous>:3:26)\n    at <anonymous>:4:1', [2, 25], [frame(2, 25, '', '41'), frame(3, 0)]));
  assert.equal((await fails(script.runReadOnly(tab, '1;\n2;\nhelper()')))[1], 'Error: x\n    at helper (<anonymous>:3:26)\n    at <anonymous>:3:1 (line 3, column 1)');
  // Code the page eval'd (no URL, another script), called by this code: placed at the call.
  fake.replies['Runtime.evaluate'] = () => error('Error: e\n    at eval (eval at load (https://a.test/app.js:1:1), <anonymous>:1:6)\n    at <anonymous>:2:1', [1, 6], [frame(0, 5, '', '99'), frame(1, 0)]);
  assert.match((await fails(script.runWrite(tab, '1;\nrunEvald()')))[1], /\(line 2, column 1\)$/);
  // The code's own callback, called back by a page function: placed in the callback, where it threw.
  fake.replies['Runtime.evaluate'] = () => error('Error: cb\n    at <anonymous>:2:11\n    at each (https://a.test/app.js:5:3)\n    at <anonymous>:1:1', [2, 11], [frame(1, 10), frame(4, 2, 'https://a.test/app.js'), frame(0, 0)]);
  assert.match((await fails(script.runWrite(tab, 'each(() => {\n  1; throw new Error("cb");\n})')))[1], /\(line 2, column 11\)$/);
  // Only another script's frame (an earlier call's async function that threw after an await of its own): its place is
  // past the end of this code's lines, so none is given.
  fake.replies['Runtime.evaluate'] = () => error('Error: later\n    at helperAsync (<anonymous>:3:26)', [3, 26], [frame(2, 25, '', '41')]);
  assert.deepEqual(await fails(script.runWrite(tab, 'await helperAsync()')), ['js_error', 'Error: later\n    at helperAsync (<anonymous>:3:26)']);
  // Read-only, a value that isn't an Error thrown synchronously: V8 has the stack (Runtime is on), the code's line.
  fake.replies['Runtime.evaluate'] = ({ expression }) => (expression.startsWith('(')
    ? error("SyntaxError: Unexpected token 'throw'", [2, 0], null)
    : { exceptionDetails: { exceptionId: 6, text: 'Uncaught', lineNumber: 2, columnNumber: 0, scriptId: '42', stackTrace: { callFrames: [frame(2, 0)] }, exception: { type: 'string', value: 'x' } } });
  assert.deepEqual(await fails(script.runReadOnly(tab, "1;\nthrow 'x'")), ['js_error', 'Uncaught "x" (line 2, column 1)']);
  // A syntax error: no stack; exceptionDetails' line, 0-based as compiled.
  fake.replies['Runtime.evaluate'] = () => error("SyntaxError: Unexpected identifier 'b'", [1, 4], null);
  assert.deepEqual(await fails(script.runWrite(tab, 'let a = 1;\na = b c')), ['js_error', "SyntaxError: Unexpected identifier 'b' (line 2, column 5)"]);

  // A trailing promise's rejection (Runtime.awaitPromise: "Uncaught (in promise) Error: nope", 1-based line): the
  // Error's text alone, placed by its frame.
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'object', subtype: 'promise', className: 'Promise', description: 'Promise', objectId: 'p2' } });
  fake.replies['Runtime.awaitPromise'] = () => error('Error: nope\n    at <anonymous>:2:9', [2, 9], [frame(1, 8)], { text: 'Uncaught (in promise) Error: nope' });
  assert.deepEqual(await fails(script.runWrite(tab, 'fetch("/n").then(() => {\n  throw new Error("nope");\n})')), ['js_error', 'Error: nope\n    at <anonymous>:2:9 (line 2, column 9)']);
  delete fake.replies['Runtime.awaitPromise'];

  // The console's object-literal parentheses: a character before the code on its first line, taken off the column (in
  // the stack's text too); a later line is as it is.
  fake.replies['Runtime.evaluate'] = ({ expression }) => (expression.startsWith('(') ? error('ReferenceError: b is not defined\n    at <anonymous>:1:7', [1, 7], [frame(0, 6)]) : { result: num(1) });
  assert.deepEqual(await fails(script.runWrite(tab, '{ a: b }')), ['js_error', 'ReferenceError: b is not defined\n    at <anonymous>:1:6 (line 1, column 6)']);
  assert.equal(fake.calls(113, 'Runtime.evaluate').at(-1).params.expression, '({ a: b })');
  fake.replies['Runtime.evaluate'] = () => error('ReferenceError: c is not defined\n    at <anonymous>:2:6', [2, 6], [frame(1, 5)]);
  assert.equal((await fails(script.runWrite(tab, '{ a: 1,\n  b: c }')))[1], 'ReferenceError: c is not defined\n    at <anonymous>:2:6 (line 2, column 6)');

  // Read-only: evaluated in forms() — a line before the code — synchronously (0-based lineNumber); the stack's text
  // is given in the code's lines too.
  fake.replies['Runtime.evaluate'] = ({ expression }) => (expression.startsWith('(')
    ? error("SyntaxError: Unexpected token 'const'", [1, 0], null)
    : error("TypeError: Cannot read properties of null (reading 'x')\n    at <anonymous>:3:5", [2, 4], [frame(2, 4)]));
  assert.deepEqual(await fails(script.runReadOnly(tab, 'const a = 1;\nnull.x')), ['js_error', "TypeError: Cannot read properties of null (reading 'x')\n    at <anonymous>:2:5 (line 2, column 5)"]);
  // A syntax error only the wrapping's closing line shows (the code ends early): no place in the code.
  fake.replies['Runtime.evaluate'] = () => error("SyntaxError: Unexpected token '}'", [2, 0], null);
  assert.deepEqual(await fails(script.runReadOnly(tab, 'foo(')), ['js_error', "SyntaxError: Unexpected token '}'"]);
  fake.replies['Runtime.evaluate'] = () => error("SyntaxError: Unexpected identifier 'b'", [1, 6], null);
  assert.deepEqual(await fails(script.runReadOnly(tab, 'a = 1 b')), ['js_error', "SyntaxError: Unexpected identifier 'b' (line 1, column 7)"]);
  // A side effect is still refused as such.
  fake.replies['Runtime.evaluate'] = () => error('EvalError: Possible side-effect in debug-evaluate', [1, 0], null);
  assert.equal((await fails(script.runReadOnly(tab, 'document.title = "x"')))[0], 'not_read_only');

  // The awaited promise was garbage-collected (nothing can settle it): stopped waiting, as a timeout, right away.
  fake.replies['Runtime.evaluate'] = () => { throw new Error('{"code":-32000,"message":"Promise was collected"}'); };
  assert.equal((await fails(script.runWrite(tab, 'await new Promise(() => {})', { timeoutMs: 60_000 })))[0], 'timeout');
  // The evaluation went to the new document's process and its target navigated: the page changed.
  fake.replies['Runtime.evaluate'] = () => { throw new Error('{"code":-32000,"message":"Inspected target navigated or closed"}'); };
  assert.equal((await fails(script.runWrite(tab, '1')))[0], 'page_changed');
  // The tab already shows another site, whose document has no context yet: refused as that site, not "not ready".
  fake.replies['Runtime.evaluate'] = () => ({ result: num(1) });
  fake.replies['Runtime.enable'] = () => ({});
  fake.pages.set(113, 'https://bank.test/');
  const { ToolError } = await import('../../claude-ext/errors.js');
  const verify = async (url) => { if (!url.startsWith('https://a.test/')) throw new ToolError('site_not_allowed', `not allowed: ${url}`); };
  assert.deepEqual(await fails(script.runWrite(tab, '1', { verify })), ['site_not_allowed', 'not allowed: https://bank.test/']);
  fake.pages.delete(113);
  delete fake.replies['Runtime.enable'];
  delete fake.replies['Runtime.evaluate'];
  delete fake.replies['Runtime.compileScript'];
});

test('write scripts run only on a site the app approved for the call', async () => {
  const { sites } = await debuggerModules();
  const failure = (url, ctx) => { try { sites.assertScriptSite(url, ctx, 5); } catch (error) { return [error.code, error.data]; } return null; };
  assert.deepEqual(failure('https://a.test/x', {}), ['write_not_approved', { host: 'a.test', url: 'https://a.test/x', tabId: 5 }], 'no writeHosts: never');
  assert.deepEqual(failure('https://a.test/x', { allowedHosts: ['*'] }), ['write_not_approved', { host: 'a.test', url: 'https://a.test/x', tabId: 5 }], 'allowing the site isn’t approving scripts');
  assert.equal(failure('https://a.test/x', { writeHosts: ['a.test'] }), null);
  assert.equal(failure('https://b.test/', { writeHosts: ['a.test'] })[0], 'write_not_approved');
  assert.equal(failure('https://b.test/', { writeHosts: ['*'] }), null);
  assert.deepEqual(failure('about:blank', { writeHosts: ['a.test'] }), ['write_not_approved', { host: 'about:blank', url: 'about:blank', tabId: 5 }]);
});

test('a script runs in the document its site was checked on: checked again in the tab’s turn, and pinned to it', async () => {
  const { fake, script } = await debuggerModules();
  const tab = { id: 109, url: 'https://a.test/' };
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'number', value: 1, description: '1' } });
  const seen = [];
  const verify = async (url) => { seen.push(url); if (!url.startsWith('https://a.test/')) throw Object.assign(new Error(`not allowed: ${url}`), { code: 'site_not_allowed' }); };
  // The tab moved on to another site after the call's first check (another call's script navigated it): refused there.
  fake.pages.set(109, 'https://bank.test/');
  await assert.rejects(script.runWrite(tab, 'document.title = "x"', { verify }), /not allowed: https:\/\/bank\.test\//);
  assert.equal(fake.calls(109, 'Runtime.evaluate').length, 0, 'nothing ran');
  await assert.rejects(script.runReadOnly(tab, 'document.title', { verify }), /not allowed/);
  fake.pages.set(109, 'https://a.test/');
  assert.deepEqual(await script.runWrite(tab, '1', { verify }), { type: 'number', value: 1 });
  assert.deepEqual(seen, ['https://bank.test/', 'https://bank.test/', 'https://a.test/']);
  // The frame tree and the context disagree (a navigation between them): refused.
  const enable = fake.replies['Runtime.enable'];
  fake.replies['Runtime.enable'] = (params, tabId) => { fake.emit(tabId, 'Runtime.executionContextCreated', { context: { id: 2, uniqueId: 'other', origin: 'https://bank.test', auxData: { frameId: 'MAIN', isDefault: true } } }); return {}; };
  await assert.rejects(script.runWrite(tab, '1', { verify }), (error) => error.code === 'page_changed');
  fake.replies['Runtime.enable'] = enable;
  // The pinned document went away before the evaluation (the context is gone): it didn't run on the new page. Pinned by
  // uniqueContextId (as here) V8 says "uniqueContextId not found" — also when Chrome sends the evaluation on to the new
  // document's process after a cross-process navigation —; by contextId or an objectId, "Cannot find context …".
  for (const message of ['{"code":-32602,"message":"uniqueContextId not found"}', 'Cannot find context with specified id']) {
    fake.replies['Runtime.evaluate'] = () => { throw new Error(message); };
    await assert.rejects(script.runWrite(tab, '1', { verify }), (error) => error.code === 'page_changed' && /nothing ran on the new page/.test(error.message), message);
    await assert.rejects(script.runReadOnly(tab, '1', { verify }), (error) => error.code === 'page_changed', message);
  }
  // No context for the main frame (still loading): a clear error, nothing evaluated.
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'number', value: 1, description: '1' } });
  fake.replies['Runtime.enable'] = () => ({});
  const before = fake.calls(109, 'Runtime.evaluate').length;
  await assert.rejects(script.runWrite(tab, '1', { verify }), (error) => error.code === 'page_not_ready');
  assert.equal(fake.calls(109, 'Runtime.evaluate').length, before);
  fake.replies['Runtime.enable'] = enable;
  if (!enable) delete fake.replies['Runtime.enable'];
  delete fake.replies['Runtime.evaluate'];
});

test('after a worker restart the tab’s leftover attachment is taken over; a monitor gets the replay even when Runtime was on', async () => {
  const { fake, monitor, script } = await debuggerModules();
  const debuggerJs = await import('../../claude-ext/debugger.js');
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'string', value: 'T' } });
  // Attached by a previous worker: this one has no session for it, so attach finds it taken.
  fake.attached.add(110);
  assert.deepEqual(await script.runReadOnly({ id: 110, url: 'https://a.test/' }, 'document.title'), { type: 'string', value: 'T' });
  assert.deepEqual(fake.calls(110).slice(0, 2).map((entry) => entry.method), ['detach', 'attach']);
  // Runtime enabled by a script call that holds the tab while a monitor starts: enabled anew, so V8 replays.
  const { release } = await debuggerJs.acquire({ id: 111, url: 'https://a.test/' });
  await debuggerJs.enableRuntime(111);
  await monitor.readConsole({ id: 111, url: 'https://a.test/' });
  assert.deepEqual(fake.calls(111).map((entry) => entry.method).filter((method) => method.startsWith('Runtime.')), ['Runtime.enable', 'Runtime.disable', 'Runtime.enable']);
  release();
  monitor.stop(111);
  delete fake.replies['Runtime.evaluate'];
});

test('headers are kept redacted and bounded from the start; credential headers beyond cookies are redacted', async () => {
  const { fake, monitor } = await debuggerModules();
  const tab = { id: 112, url: 'https://a.test/' };
  await monitor.readNetwork(tab);
  const many = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`x-h${i}`, 'v']));
  fake.emit(112, 'Network.requestWillBeSent', { requestId: 'r', loaderId: 'L', frameId: 'MAIN', type: 'Fetch', timestamp: 1, request: { url: 'https://a.test/x', method: 'GET', headers: { 'x-pad': 'a'.repeat(100_000), 'X-API-Key': 'sk-live', 'x-csrf-token': 't', 'X-Amz-Security-Token': 's', Accept: '*/*' } } });
  fake.emit(112, 'Network.responseReceived', { requestId: 'r', response: { status: 200, headers: many } });
  const [request] = (await monitor.readNetwork(tab, { headers: true })).requests;
  assert.equal(request.headers.request['x-pad'].length, 501, 'clipped when it arrived');
  assert.deepEqual([request.headers.request['X-API-Key'], request.headers.request['x-csrf-token'], request.headers.request['X-Amz-Security-Token'], request.headers.request.Accept], ['(redacted)', '(redacted)', '(redacted)', '*/*']);
  assert.equal(Object.keys(request.headers.response).length, 51);
  assert.equal(request.headers.response['…'], '10 more headers not kept');
  monitor.stop(112);
});

test('the service worker: the new tools by name, write scripts gated, and never in a batch', async () => {
  const { fake } = await debuggerModules();
  const posted = [];
  const portListeners = [];
  const saved = { runtime: globalThis.chrome.runtime, get: globalThis.chrome.tabs.get, query: globalThis.chrome.tabs.query };
  globalThis.chrome.runtime = {
    id: 'ext', getManifest: () => ({ version: '0.1.0' }), lastError: null,
    onStartup: { addListener() {} }, onInstalled: { addListener() {} },
    connectNative: () => ({ postMessage: (message) => posted.push(message), onMessage: { addListener: (fn) => portListeners.push(fn) }, onDisconnect: { addListener() {} } }),
  };
  globalThis.chrome.tabs.get = async (id) => ({ id, url: 'https://a.test/page', title: 'A', status: 'complete' });
  globalThis.chrome.tabs.query = async () => [];
  fake.replies['Runtime.evaluate'] = () => ({ result: { type: 'number', value: 1, description: '1' } });
  let seq = 0;
  const execute = async (params) => {
    const id = `t${++seq}`;
    for (const fn of portListeners) fn({ method: 'execute_tool', params, tool_use_id: id });
    for (let i = 0; i < 100; i++) { const reply = posted.find((message) => message.tool_use_id === id); if (reply) return reply.params; await new Promise((resolve) => setTimeout(resolve, 10)); }
    throw new Error('no answer');
  };
  try {
    await import('../../claude-ext/service-worker.js');
    const allowed = ['a.test'];
    assert.equal((await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: true }, allowedHosts: allowed })).error.code, 'write_not_approved');
    assert.equal((await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: true }, allowedHosts: [], writeHosts: ['*'] })).error.code, 'site_not_allowed', 'the site permission comes first');
    assert.deepEqual((await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: true }, allowedHosts: allowed, writeHosts: ['a.test'] })).result, { tabId: 108, write: true, type: 'number', value: 1 });
    assert.equal(fake.calls(108, 'Runtime.evaluate').at(-1).params.replMode, true);
    assert.equal((await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: 'yes' }, allowedHosts: allowed })).error.code, 'bad_request');
    const batch = await execute({ name: 'browser_batch', args: { actions: [{ name: 'read_console_messages', input: { tabId: 108 } }, { name: 'javascript_tool', input: { tabId: 108, code: '1', write: true } }] }, allowedHosts: allowed, writeHosts: ['*'] });
    assert.match(batch.error.message, /Step 2: javascript_tool with write: true runs on its own/);
    const read = await execute({ name: 'browser_batch', args: { actions: [{ name: 'read_console_messages', input: { tabId: 108, onlyErrors: true } }, { name: 'read_network_requests', input: { tabId: 108, urlPattern: '/api\\/v\\d/i' } }] }, allowedHosts: allowed });
    assert.deepEqual(read.result.steps.map((step) => [step.name, step.ok]), [['read_console_messages', true], ['read_network_requests', true]]);
    assert.equal((await execute({ name: 'read_console_messages', args: { tabId: 108, pattern: '(' }, allowedHosts: allowed })).error.code, 'bad_request');
    assert.equal((await execute({ name: 'read_network_requests', args: { tabId: 108 }, allowedHosts: ['b.test'] })).error.code, 'site_not_allowed');
    // urlPattern "/api/" is the path segment (as Claude in Chrome reads it); a /…/ with pattern characters or flags is a regular expression.
    for (const url of ['https://a.test/api/items', 'https://rapid.test/x', 'https://a.test/capital.png', 'https://a.test/v2/users']) fake.emit(108, 'Network.requestWillBeSent', { requestId: url, loaderId: 'L', frameId: 'MAIN', type: 'Fetch', timestamp: 1, request: { url, method: 'GET' } });
    const urls = async (urlPattern) => (await execute({ name: 'read_network_requests', args: { tabId: 108, urlPattern }, allowedHosts: allowed })).result.requests.map((r) => r.url);
    assert.deepEqual(await urls('/api/'), ['https://a.test/api/items']);
    assert.deepEqual(await urls('/\\/v\\d\\//'), ['https://a.test/v2/users']);
    assert.deepEqual(await urls('/API/i'), ['https://a.test/api/items', 'https://rapid.test/x', 'https://a.test/capital.png']);
    assert.deepEqual(await urls('/api/items'), ['https://a.test/api/items'], 'a path, not a regular expression with flags');
    // The site is checked again inside the tab's turn, on the document the script runs in: the tab's address before
    // the turn isn't enough.
    fake.navigate(108, 'https://bank.test/');
    const moved = await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: true }, allowedHosts: allowed, writeHosts: ['a.test'] });
    assert.deepEqual([moved.error.code, moved.error.host], ['site_not_allowed', 'bank.test']);
    const movedWrite = await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1', write: true }, allowedHosts: ['a.test', 'bank.test'], writeHosts: ['a.test'] });
    assert.deepEqual([movedWrite.error.code, movedWrite.error.host], ['write_not_approved', 'bank.test']);
    fake.navigate(108, null);
    // A navigation to another site under way: refused.
    globalThis.chrome.tabs.get = async (id) => ({ id, url: 'https://a.test/page', pendingUrl: 'https://bank.test/', title: 'A', status: 'loading' });
    const pending = await execute({ name: 'javascript_tool', args: { tabId: 108, code: '1' }, allowedHosts: allowed });
    assert.equal(pending.error.code, 'page_changed');
  } finally {
    globalThis.chrome.runtime = saved.runtime;
    Object.assign(globalThis.chrome.tabs, { get: saved.get, query: saved.query });
    delete fake.replies['Runtime.evaluate'];
    (await import('../../claude-ext/monitor.js')).stop(108);
  }
});
