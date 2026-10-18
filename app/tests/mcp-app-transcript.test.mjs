import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';

// R4g-mcp MA-7: the transcript mount of the 2.42304.0 MCP App / Visualize card (c96d752d0 KBe / m2e / e0 → VX).
// A tool call item goes through the host's row (source-session.jsx SourceMessage) to source-mcp-app.jsx, which lists the
// session's servers through the real main-process bridge (electron/mcp-apps-host.cjs, MA-4, driven in process with a
// fake core client), loads the generated card (MA-6) and mounts it; the AppRenderer chunk (the sandbox iframe) is a test
// double that records its props, so the widget's resource read and ui/message are driven through them. No frame, no
// server, no port, no process, no real configuration.
const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const h = React.createElement;
const VISUALIZE_UUID = '6f616b42-0ed8-571e-823f-ee4aca6b7ce9';
const { createMcpAppsHost } = require('../electron/mcp-apps-host.cjs');

let server, Session, Mount, Adapters, Card, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Session = await server.ssrLoadModule('/src/source-session.jsx');
  Mount = await server.ssrLoadModule('/src/source-mcp-app.jsx');
  Adapters = await server.ssrLoadModule('/src/source-mcp-app-card-adapters.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  Card = await Mount.loadMcpAppCard();
});
after(async () => { await server?.close(); });
beforeEach(() => { Mount.mcpAppTranscriptHost.reset(); I18n.setLocale('en-US'); });

// ---- the main-process bridge (MA-4) behind a fake window.desktop.call
const sessions = new Set(['s1', 's2']);
function codexCore(requests) {
  return { serverInfo: { engine: 'codex' }, connection: {}, request: async (method, params) => {
    requests.push([method, params]);
    if (method === 'mcpServerStatus/list') return { data: [{ name: 'weather', runtimeStatus: 'ready', tools: {
      forecast: { name: 'forecast', description: 'Forecast', inputSchema: { type: 'object' }, _meta: { ui: { resourceUri: 'ui://weather/forecast.html' } } },
      plain: { name: 'plain', inputSchema: { type: 'object' } } } }] };
    if (method === 'mcpServer/resource/read') return { contents: [{ uri: params.uri, mimeType: 'text/html;profile=mcp-app', text: '<p>forecast</p>' }] };
    throw Object.assign(new Error('unexpected'), { code: -32601 });
  } };
}
const harnessCore = requests => ({ serverInfo: { engine: 'deepseek' }, connection: {}, request: async (method) => { requests.push([method]); throw new Error('must not be asked'); } });
function bridge({ core = 'codex', visualize = true } = {}) {
  const requests = [], calls = [];
  const owner = core === 'codex' ? codexCore(requests) : harnessCore(requests);
  const host = createMcpAppsHost({ client: () => owner, session: id => (sessions.has(id) ? { id, cwd: '/work' } : null),
    visualizeEnabled: () => visualize, coreSupportsMcpApps: info => info?.engine === 'codex' });
  const call = async (action, params) => { calls.push([action, params]); if (!action.startsWith('mcp-app:')) return null; return host.call(action, params); };
  return { call, calls, requests };
}

// ---- items
const widgetCall = (extra = {}) => ({ id: 'call-w', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', turnId: 't1', status: 'completed',
  arguments: { title: 'Sales chart', loading_messages: ['Drawing'], widget_code: '<svg viewBox="0 0 10 10"></svg>' },
  result: { content: [{ type: 'text', text: 'Widget rendered.' }] }, error: null, ...extra });
const forecastCall = (extra = {}) => ({ id: 'call-f', type: 'mcpToolCall', server: 'weather', tool: 'forecast', turnId: 't1', status: 'completed',
  arguments: { city: 'Paris' }, result: { content: [{ type: 'text', text: 'Sunny' }], structuredContent: { temp: 21 } }, error: null, ...extra });
const message = (item, props = {}) => h(Session.SourceMessage, { item, sessionKey: 's1', cwd: '/work', ...props });

// ---- a small fake DOM (as tests/session-error-boundary-mount.test.mjs), with what the card's hooks read.
function createDom(desktopCall) {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), style: { setProperty() {}, removeProperty() {} }, dataset: {} });
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    closest() { return null; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 640, height: 0 }; }
    focus() { document.activeElement = this; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelector: () => null, querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  class Observer { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  const window = Object.assign(Object.create(events), { document, location: { pathname: '/', href: 'app://openclaude/' },
    desktop: { call: desktopCall }, HTMLIFrameElement: class {}, MutationObserver: Observer, ResizeObserver: Observer,
    getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {}, devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800 });
  window.window = window;
  document.defaultView = window;
  return { window, document, Element, Observer };
}
async function withDom(desktopCall, run) {
  const dom = createDom(desktopCall);
  const names = ['window', 'document', 'MutationObserver', 'ResizeObserver'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['MutationObserver', dom.Observer], ['ResizeObserver', dom.Observer]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
// The AppRenderer chunk (the sandbox iframe) is a double that records the props PQe hands it.
function withRendererDouble(run) {
  const handle = Card.appRendererChunk.handle;
  const saved = { module: handle.module, resident: handle.resident, state: handle.state };
  const seen = [];
  handle.module = function AppRendererDouble(props) { seen.push(props); return h('div', { 'data-app-renderer-double': props.toolResourceUri }); };
  handle.resident = true;
  handle.state = 'loaded';
  return Promise.resolve(run(seen)).finally(() => Object.assign(handle, saved));
}
const settle = async (rounds = 8) => { for (let i = 0; i < rounds; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); };

test('source-session.jsx mounts SourceMcpAppRow for MCP calls only, with the generic row as fallback (AST)', () => {
  const source = fs.readFileSync(path.join(app, 'src/source-session.jsx'), 'utf8');
  assert.ok(parseAst(source, { lang: 'jsx' }));
  assert.equal(source.split("import {SourceMcpAppRow,isMcpCallItem} from './source-mcp-app.jsx';").length - 1, 1);
  assert.equal(source.split('return isMcpCallItem(item)?<SourceMcpAppRow item={item} sessionKey={sessionKey} awaitingApproval={pendingApprovalItemIds.has(item.id)} turnStart={turnStart} fallback={row}/>:row;').length - 1, 1);
  const main = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  // R4i-mcp MC1 adds the send-time model context hand-over to the same import.
  assert.equal(main.split('import { useMcpAppTranscript, noteMcpAppSendContext } from "./source-mcp-app.jsx";').length - 1, 1);
  assert.equal(main.split('const shownRows =mcpAppRows.group(groupFileTools, ').length - 1, 1);
  assert.equal(main.split('const mcpAppRows = useMcpAppTranscript({ sessionId: current, onPrefillComposer: (text) => {').length - 1, 1);
});

test('SSR: a non-App MCP call, and any call before the session’s servers are listed, is the plain generic row', async () => {
  const plain = renderToStaticMarkup(message(forecastCall({ id: 'p', tool: 'plain' })));
  assert.match(plain, /source-generic-step/);
  assert.doesNotMatch(plain, /data-mcp-app-row/);
  // Not listed yet: the visualize call is the generic row too (no placeholder, no fake card).
  const early = renderToStaticMarkup(message(widgetCall()));
  assert.match(early, /source-generic-step/);
  assert.doesNotMatch(early, /data-mcp-app-row|data-mcp-app-card/);
});

test('servers: mcp-app:servers through MA-4 feeds the session state; code_desktop show_widget reads as the built-in visualize', async () => {
  const { call, calls, requests } = bridge();
  const saved = globalThis.window;
  globalThis.window = { desktop: { call } };
  try {
    const reply = await Mount.ensureMcpAppServers('s1', 'mcp__visualize__show_widget');
    assert.deepEqual(calls[0], ['mcp-app:servers', { sessionId: 's1' }]);
    assert.deepEqual(reply.servers.map(entry => [entry.name, entry.isBuiltIn]), [['visualize', true], ['weather', false]]);
    assert.deepEqual(requests.map(([method, params]) => [method, params?.threadId]), [['mcpServerStatus/list', 's1']]);
    // Once per session, and again only for a server segment the session has not asked about.
    await Mount.ensureMcpAppServers('s1', 'mcp__visualize__read_me');
    await Mount.ensureMcpAppServers('s1', 'mcp__weather__forecast');
    await Mount.ensureMcpAppServers('s1', 'mcp__weather__plain');
    assert.equal(calls.filter(([action]) => action === 'mcp-app:servers').length, 2);
    // The adapters' matcher (dP): show_widget and the weather forecast are App tools, read_me and plain are not.
    const html = renderToStaticMarkup(h(function Probe() {
      const rows = Mount.useMcpAppTranscript({ sessionId: 's1' });
      return h('pre', null, ['mcp__visualize__show_widget', 'mcp__visualize__read_me', 'mcp__weather__forecast', 'mcp__weather__plain', 'mcp__code_desktop__terminal_run']
        .map(name => `${name}=${rows.isMcpAppTool(name)}`).join(' '));
    }));
    assert.match(html, /show_widget=true mcp__visualize__read_me=false mcp__weather__forecast=true mcp__weather__plain=false mcp__code_desktop__terminal_run=false/);
  } finally { globalThis.window = saved; }
});

test('SSR: once listed and loaded, a visualize call is the card row (item anchor, turn start); the card falls back to the host row while the hash is pending', async () => {
  const { call } = bridge();
  const saved = globalThis.window;
  globalThis.window = { desktop: { call } };
  try { await Mount.ensureMcpAppServers('s1', 'mcp__visualize__show_widget'); } finally { globalThis.window = saved; }
  const html = renderToStaticMarkup(message(widgetCall(), { turnStart: true }));
  assert.match(html, /^<div class="source-message source-mcp-app-row" data-transcript-item-id="call-w" data-mcp-app-row="" data-turn-start="true">/);
  // kQe on the server: the conversation hash is computed in an effect, so the fallback (the host's own row) is drawn.
  assert.match(html, /<div class="source-message source-step source-step-classic source-generic-step" data-transcript-item-id="call-w"/);
  assert.doesNotMatch(html, /data-mcp-app-card/);
  // Another session that was never listed: plain row.
  assert.doesNotMatch(renderToStaticMarkup(message(widgetCall(), { sessionKey: 's2' })), /data-mcp-app-row/);
});

test('harness core (no MCP App source): a third-party App call degrades to the generic row and its interactive-view note', async () => {
  const { call, requests } = bridge({ core: 'harness' });
  const saved = globalThis.window;
  globalThis.window = { desktop: { call } };
  let reply;
  try { reply = await Mount.ensureMcpAppServers('s1', 'mcp__weather__forecast'); } finally { globalThis.window = saved; }
  assert.deepEqual(reply.core, { supported: false, unavailable: 'not_connected', reason: 'core_unsupported' });
  assert.deepEqual(reply.servers.map(entry => entry.name), ['visualize']);
  assert.deepEqual(requests, [], 'the harness core is never asked');
  // The ACP / harness projection marks the call (codeDesktop.mcpApp); the host row keeps its note.
  const html = renderToStaticMarkup(message(forecastCall({ codeDesktop: { mcpApp: { serverName: 'weather', resourceUri: 'ui://weather/forecast.html' } } })));
  assert.doesNotMatch(html, /data-mcp-app-row/);
  assert.match(html, /source-generic-step/);
  // The built-in visualize still draws on that core.
  assert.match(renderToStaticMarkup(message(widgetCall())), /data-mcp-app-row/);
  // Visualize switched off (Settings, config.agentVisualize false): not listed, so the plain row.
  Mount.mcpAppTranscriptHost.reset();
  const off = bridge({ core: 'harness', visualize: false });
  globalThis.window = { desktop: { call: off.call } };
  try { await Mount.ensureMcpAppServers('s1', 'mcp__visualize__show_widget'); } finally { globalThis.window = saved; }
  assert.doesNotMatch(renderToStaticMarkup(message(widgetCall())), /data-mcp-app-row/);
});

test('the host row keeps its interactive-view note for an MCP App it cannot show', () => {
  const item = forecastCall({ codeDesktop: { mcpApp: { serverName: 'weather' } } });
  const html = renderToStaticMarkup(h(Session.SourceMessage, { item, sessionKey: 's1', cwd: '/work', transcriptView: 'verbose' }));
  assert.match(html, /source-generic-step/);
  assert.match(html, /data-mcp-app=""[^>]*>This connector also has an interactive view, which OpenClaude Desktop can’t show yet\./);
  assert.doesNotMatch(html, /data-mcp-app-row/);
});

test('full chain: tool call → servers → card → conversation hash → sandbox renderer (double) → resource read and ui/message', async () => {
  const { call, calls } = bridge();
  await withRendererDouble(async seen => withDom(call, async ({ container, root, logged }) => {
    const prefilled = [];
    function Transcript({ item }) {
      Mount.useMcpAppTranscript({ sessionId: 's1', onPrefillComposer: text => { prefilled.push(text); return true; } });
      return h(Session.SourceMessage, { item, sessionKey: 's1', cwd: '/work' });
    }
    act(() => root.render(h(Transcript, { item: widgetCall() })));
    await settle();
    assert.deepEqual(calls.filter(([action]) => action === 'mcp-app:servers'), [['mcp-app:servers', { sessionId: 's1' }]]);
    const row = container.find(node => node.getAttribute?.('data-mcp-app-row') === '');
    assert.ok(row, 'the card row is mounted');
    assert.equal(row.getAttribute('data-transcript-item-id'), 'call-w');
    assert.ok(row.find(node => node.getAttribute?.('data-mcp-app-card') === ''), 'PQe drew its card');
    const props = seen.at(-1);
    assert.ok(props, 'the sandbox renderer (double) is mounted');
    assert.equal(props.toolResourceUri, 'ui://imagine/show-widget.html');
    assert.match(props.conversationHash, /^[0-9a-f]{32}$/);
    assert.equal(props.serverIdentifier, VISUALIZE_UUID);
    assert.equal(props.retrySandboxSetupAfterLoadMs, 0);
    assert.deepEqual(props.toolInput, widgetCall().arguments);
    assert.deepEqual(props.toolResult.content, [{ type: 'text', text: 'Widget rendered.' }]);
    assert.equal(String(props.sandboxProxyUrl), 'oc-mcp-sandbox://sandbox/mcp_apps');
    // The widget's resource read goes through the card's client → MA-4 → the built-in visualize template.
    const read = await props.client.readResource({ uri: props.toolResourceUri });
    assert.equal(read.contents.length, 1);
    assert.equal(read.contents[0].uri, 'ui://imagine/show-widget.html');
    assert.match(read.contents[0].text, /<title>Visualize Widget<\/title>/);
    assert.ok(calls.some(([action, params]) => action === 'mcp-app:read-resource' && params.server === 'visualize' && params.serverUuid === VISUALIZE_UUID && params.sessionId === 's1'));
    // ui/message with an iframe-originated activation fills this session's composer (never sends).
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const now = performance.now;
    try {
      Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userActivation: { isActive: true }, userAgent: 'test' } });
      performance.now = () => now.call(performance) + 60_000;
      assert.deepEqual(await props.onmessage({ role: 'user', content: [{ type: 'text', text: 'Make the bars blue' }] }), {});
    } finally { performance.now = now; if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator; }
    assert.deepEqual(prefilled, ['Make the bars blue']);
    assert.deepEqual(logged.map(args => String(args[0]).slice(0, 200)), [], 'no render errors or warnings');
  }));
});

test('full chain, third-party App on Codex: the core’s server is session-owned, read through mcpServer/resource/read; an App tools/call is refused', async () => {
  const { call, requests } = bridge();
  await withRendererDouble(async seen => withDom(call, async ({ container, root }) => {
    act(() => root.render(h(Session.SourceMessage, { item: forecastCall(), sessionKey: 's1', cwd: '/work' })));
    await settle();
    assert.ok(container.find(node => node.getAttribute?.('data-mcp-app-card') === ''), 'the widget card');
    const props = seen.at(-1);
    assert.equal(props.toolResourceUri, 'ui://weather/forecast.html');
    assert.equal(props.toolResult.structuredContent.temp, 21);
    assert.equal(props.onDownloadFile, undefined, 'only visualize downloads');
    const read = await props.client.readResource({ uri: props.toolResourceUri });
    assert.deepEqual(read.contents, [{ uri: 'ui://weather/forecast.html', mimeType: 'text/html;profile=mcp-app', text: '<p>forecast</p>' }]);
    assert.deepEqual(requests.find(([method]) => method === 'mcpServer/resource/read')?.[1], { threadId: 's1', server: 'weather', uri: 'ui://weather/forecast.html' });
    // A widget calling back into its server's tools: the core's servers are CLI-owned (official refusal).
    const called = await props.client.request({ method: 'tools/call', params: { name: 'forecast', arguments: { city: 'Rome' } } });
    assert.deepEqual(called, { content: [{ type: 'text', text: "Tool 'forecast' is not permitted" }], isError: true });
  }));
});

test('a call waiting on approval keeps the host row (kQe pending_approval) and releases it once answered', async () => {
  const { call } = bridge();
  await withRendererDouble(async () => withDom(call, async ({ container, root }) => {
    const running = widgetCall({ status: 'inProgress', result: null });
    act(() => root.render(h(Session.SourceMessage, { item: running, sessionKey: 's1', cwd: '/work', pendingApprovalItemIds: new Set(['call-w']) })));
    await settle();
    assert.equal(container.find(node => node.getAttribute?.('data-mcp-app-card') === ''), null, 'no widget while the approval is pending');
    assert.ok(container.find(node => node.getAttribute?.('data-mcp-app-row') === ''));
    assert.deepEqual(Adapters.toolApprovalStore.getState().requestsBySession, { s1: { 'call-w': { status: 'pending', toolName: 'mcp__visualize__show_widget' } } });
    act(() => root.render(h(Session.SourceMessage, { item: running, sessionKey: 's1', cwd: '/work', pendingApprovalItemIds: new Set() })));
    await settle();
    assert.deepEqual(Adapters.toolApprovalStore.getState().requestsBySession, {});
    assert.ok(container.find(node => node.getAttribute?.('data-mcp-app-card') === ''), 'the widget once approved');
  }));
});

test('zh-CN: the card, link and download dialogs, the widget’s host strings and the Settings visualize row are translated', async () => {
  const keys = ['Making a visual', 'Made a visual', 'Failed to make a visual', 'Visual from Claude', 'Rendering widget', 'Widget from {server}',
    'Widget from this session’s server: {server}', 'Widget from a server on {host}: {server}', 'A server on {host}: {server}', 'This session’s server: {server}',
    '{names}. {tool}', 'Showing in another pane', 'Show here', 'More actions', 'Copy as image', 'Download as HTML', 'Download as SVG', 'Download as PNG', 'Copying…',
    'Couldn’t copy image. Try again.', 'Couldn’t copy image.\nTake a screenshot instead.', 'Couldn’t download image. Try again.',
    'Couldn’t download image.\nTake a screenshot instead.', 'Couldn’t download image.', 'Not sent:', 'Download files', 'This app wants to download a file to your device:',
    'This app wants to download {count} files to your device:', 'Don’t ask again for links to <code>{domain}</code>', 'Start a call?', 'Start call',
    'You’re leaving Claude. You’ll place the call yourself.', 'Start a text?', 'Start text', 'Start an email?', 'Start email', 'You’re leaving Claude. You’ll send it yourself.',
    'Phone number', 'To', 'Cc', 'Bcc', 'Subject', 'Message', 'Visuals', 'DeepSeek can draw charts, diagrams and interactive widgets right in the conversation. They run in a sandboxed frame.'];
  const dictionary = I18n.dictionary('zh-CN');
  for (const key of keys) assert.ok(Object.hasOwn(dictionary, key) && dictionary[key].trim(), key);
  // Every message of the generated card and host library has an entry.
  const missing = [];
  for (const dir of ['src/generated/mcp-app-card', 'src/generated/mcp-app-host'])
    for (const file of fs.readdirSync(path.join(app, dir)).filter(name => name.endsWith('.mjs'))) {
      const text = fs.readFileSync(path.join(app, dir, file), 'utf8');
      for (const match of text.matchAll(/defaultMessage:\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g)) {
        const value = match[1][0] === '`' ? match[1].slice(1, -1).replace(/\\u2019/g, '’') : JSON.parse(match[1]);
        if (value.trim() && !Object.hasOwn(dictionary, value)) missing.push(`${file}: ${value}`);
      }
    }
  assert.deepEqual(missing, []);
  // The card speaks Chinese through the start intl (t()).
  I18n.setLocale('zh-CN');
  try {
    const html = renderToStaticMarkup(h(Card.McpAppWidgetCard, {
      tool: { id: 'c', name: 'mcp__visualize__show_widget', status: 'running', input: {} }, sessionRef: { type: 'local', id: 's1' }, sharesWithSession: true,
      match: Adapters.matchSessionMcpTool('mcp__visualize__show_widget', { servers: [{ uuid: VISUALIZE_UUID, name: 'visualize', type: 'local', isBuiltIn: true,
        tools: [{ name: 'show_widget', _meta: { ui: { resourceUri: 'ui://imagine/show-widget.html' } } }] }] }),
      serverUuid: VISUALIZE_UUID, serverIdentifier: VISUALIZE_UUID, sessionOwned: false, firstPartyServer: true, client: {}, sandboxProxyUrl: new URL('oc-mcp-sandbox://sandbox/mcp_apps'),
      conversationHash: 'a'.repeat(32), expanded: false, onToggleExpanded() {}, onInitError() {}, onInitialized() {}, hostResident: false, reservedHeight: 0 }));
    assert.match(html, new RegExp(dictionary['Making a visual']));
  } finally { I18n.setLocale('en-US'); }
});
