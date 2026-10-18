// R4e-preview (renderer): preview-01 the start-failed card shows main's original port error as it came, and an
// identity failure gets its own words (not the agent's guidance); preview-13 + reuses SourceTooltip's disabledReason
// (shared-frame Qp) and stays the same button across the cap; preview-07 the Discard confirmation over a sketch with
// marks, mounted: Select element asks, Discard closes the sketch and turns picking on, a stopped server drops it.
// The pane is mounted in the R3b fake DOM (tests/fixtures/preview-r3b-dom.mjs) over a stub bridge; the sketch canvas is
// drawn on through React's own pointer handlers, with a recording 2D context on <canvas>. Nothing is started or opened.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';
import { processWorld } from './fixtures/preview-r3b-world.mjs';
import { createPreviewPortHost } from '../electron/r3b-preview-host.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017');
const v1 = path.join(reference, 'ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const local = (file) => fs.readFileSync(path.join(app, file), 'utf8');

let server, P, Tabs, M, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  P = await server.ssrLoadModule('/src/source-preview-pane.jsx');
  Tabs = await server.ssrLoadModule('/src/source-preview-tabs.jsx');
  M = await server.ssrLoadModule('/src/preview-model.mjs');
});
after(() => server?.close());

const flush = async (times = 6) => { for (let i = 0; i < times; i++) await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); };
const click = node => act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, detail: 1, defaultPrevented: false }); });

// ---- preview-01 / preview-03: the start-failed card's text ----------------------------------------------------------

test('preview-01 source: the original card shows main\'s start error as it came (no client copy per code)', () => {
  const pane = official('cf580efe9-b-DCvKJg.js');
  assert.equal(count(pane, 'logLine:n===void 0?Wr(t.message):void 0,onCopyLog:()=>V(h,t.message)'), 1);
  assert.equal(count(pane, 'a.setPreviewStartError({kind:"start-failed",message:r,name:n,...i!==void 0&&{heldPort:i}})'), 1);
  assert.equal(count(official('c227f4d5e-Ba-r--Rl.js'), '{kind:"start-failed",message:r.error,name:f,...e!==void 0&&{heldPort:e}}'), 1);
  assert.equal(count(pane, 'autoPort'), 0, 'the original card has no "autoPort" hint');
  const main = fs.readFileSync(path.join(reference, 'asar/.vite/build/index.chunk-muI2IV6k.js'), 'utf8');
  assert.equal(count(main, 'N.warn("[Preview] Server identity check failed %o",{serverId:a,port:t.port}),l.push(`${o.guidance}\\n`,"stderr"),u.status="error"'), 1,
    'a2.start: an identity mismatch goes to the log and the output, not to a start error');
});

test('preview-01: a port that can\'t move shows main\'s original message; the old "autoPort": true hint is gone', async () => {
  // Main's own errors (the generated 2.42304.0 I2i over a stand-in world): "autoPort": false (D2i), and an OS-reserved
  // fixed port (k2i / E2i words differ by cause; what matters is that the card shows whichever came).
  const world = processWorld();
  world.occupy(3000);
  const ports = createPreviewPortHost({ registry: () => [], netApi: world.net, wait: async () => {}, logger: { warn() {}, info() {} } });
  const messages = [];
  for (const [autoPort, retargetable] of [[false, true], [undefined, false]]) {
    try { await ports.resolvePort(3000, autoPort, '/work', true, undefined, retargetable); assert.fail('3000 is busy'); }
    catch (error) { assert.ok(error instanceof ports.PortInUseError, String(error)); messages.push(error.message); }
  }
  assert.match(messages[0], /^Port 3000 is required by this server but is in use by another process\. Nothing was started\./);
  for (const message of messages) assert.equal(M.serverErrorText({ code: 'port-in-use', message }, 'web'), message);
  assert.equal(M.serverErrorText({ code: 'port-in-use' }, 'web'), 'Couldn’t start the dev server.');
  assert.equal(count(local('src/preview-model.mjs'), '“autoPort”: true'), 0);
  assert.equal(I18n.dictionary('zh-CN')['Port {port} is already in use. Stop whatever is using it, or set “autoPort”: true in .claude/launch.json.'], undefined);
  // zh-CN shows the original's English message too (it is main's text, as the original card shows it).
  I18n.setLocale('zh-CN');
  try { assert.equal(M.serverErrorText({ code: 'port-in-use', message: messages[0] }, 'web'), messages[0]); }
  finally { I18n.setLocale('en-US'); }
});

test('preview-03: an identity failure says what happened in the user\'s words, never the agent\'s guidance (en, zh-CN)', () => {
  const guidance = 'This server is listening on port 5173, not on its assigned port 3001. Port 3001 is answered by a different process, so the preview pane would show that process\'s content instead of this server. Port 3001 is in use by another preview server from this chat. Call preview_stop for that server (its serverId is in the preview list) or set "port" in .claude/launch.json to a different port. Then call preview_stop for this server and preview_start again.';
  const text = M.serverErrorText({ code: 'identity', message: guidance, port: 3001 }, 'web');
  assert.equal(text, 'Another process is also answering on port 3001, so the preview could show it instead of this dev server. Check its output below.');
  assert.doesNotMatch(text, /preview_stop|preview_start|serverId/);
  assert.equal(M.serverErrorText({ code: 'identity', message: guidance }, 'web'), text, 'the port from the guidance when main gave none');
  I18n.setLocale('zh-CN');
  try { assert.equal(M.serverErrorText({ code: 'identity', message: guidance, port: 3001 }, 'web'), '端口 3001 上还有另一个进程在响应，预览可能会显示它而不是这个开发服务器。请查看下方的输出。'); }
  finally { I18n.setLocale('en-US'); }
  // The card's text is this sentence, then the output (where main put the guidance, as a2.start's stderr line).
  const fullText = M.startFailureText({ message: text }, ['$ npm run web', guidance]);
  assert.equal(fullText, `${text}\n\n${guidance}`);
  assert.equal(M.failureLogLine(fullText, { code: 'identity', message: guidance, port: 3001 }), text, 'the chip shows the user sentence, not the trailing guidance');
  assert.equal(M.startFailureText({ code: 'identity', message: guidance, port: 3001 }, ['$ npm run web', 'Local: http://localhost:5173/', guidance]),
    `${guidance}\n\nLocal: http://localhost:5173/`, 'the fix prompt does not duplicate the guidance logged at the end of the output');
});

test('preview-03: the mounted start-failed card shows the user-facing identity sentence in its chip, never the agent guidance (en, zh-CN)', async () => {
  const guidance = 'This server is listening on port 5173, not on its assigned port 3001. Port 3001 is answered by a different process, so the preview pane would show that process\'s content instead of this server. Port 3001 is in use by another preview server from this chat. Call preview_stop for that server (its serverId is in the preview list) or set "port" in .claude/launch.json to a different port. Then call preview_stop for this server and preview_start again.';
  const failedState = (startedAt = 1) => ({
    ...page, hasPage: false, url: '', title: '', tabs: [], activeTabId: null,
    servers: [{ name: 'web', port: 3001, url: 'http://localhost:3001', status: 'failed', attach: false, startedAt, error: { code: 'identity', message: guidance, port: 3001 } }],
  });
  await withPreviewDom(async (dom) => {
    let state = failedState(1);
    const copied = [];
    const prevClipboard = globalThis.navigator?.clipboard;
    Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { copied.push(value); } } });
    try {
      const desktop = createDesktop({
        'preview-state': () => state,
        'preview-attach': () => null,
        'preview-occlude': () => ({}),
        'preview-server-logs': () => ({ lines: ['$ npm run web', 'Local: http://localhost:5173/', guidance] }),
      });
      const host = dom.document.body.appendChild(dom.document.createElement('div'));
      const root = createRoot(host);
      await act(async () => root.render(React.createElement(P.SourcePreviewPane, { sessionId: 't1', desktop, initialState: state, onError() {} })));
      await flush();
      assert.equal(host.querySelector('aside')?.getAttribute('data-preview-surface'), 'failed');
      const card = host.querySelector('[data-preview-failure="web"]');
      assert.ok(card, 'the start-failed card is mounted');
      const chip = card.querySelector('.text-code');
      assert.ok(chip, 'the chip is rendered');
      assert.match(chip.textContent, /Another process is also answering on port 3001, so the preview could show it instead of this dev server\. Check its output below\./);
      assert.doesNotMatch(chip.textContent, /preview_stop|preview_start|serverId/);
      await click(card.querySelector('button[aria-label="Copy error log"]'));
      await flush();
      assert.equal(copied.length, 1);
      assert.match(copied[0], /^Another process is also answering on port 3001/);
      assert.match(copied[0], /Local: http:\/\/localhost:5173\//);
      assert.match(copied[0], /Then call preview_stop for this server and preview_start again\.$/);
      I18n.setLocale('zh-CN');
      try {
        state = failedState(2);
        await act(async () => desktop.push({ kind: 'preview', sessionId: 't1', state }));
        await flush();
        assert.match(card.querySelector('.text-code').textContent, /端口 3001 上还有另一个进程在响应，预览可能会显示它而不是这个开发服务器。请查看下方的输出。/);
        assert.doesNotMatch(card.querySelector('.text-code').textContent, /preview_stop|preview_start|serverId/);
      } finally {
        I18n.setLocale('en-US');
      }
      await act(async () => root.unmount());
    } finally {
      Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: prevClipboard });
    }
  });
});

// ---- preview-13: + reuses SourceTooltip's disabledReason (Qp) ---------------------------------------------------------

const tabsOf = n => Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, url: `http://localhost:${3000 + i}/`, title: `Tab ${i + 1}` }));
const stripProps = (n, extra = {}) => ({ tabs: tabsOf(n), activeId: `t${n}`, onSelect() {}, onCreate() {}, onClose() {}, onCloseOthers() {}, onExternal() {}, onReorder() {}, ...extra });

test('preview-13: the + slot is SourceTooltip disabledReason (Qp), not a DisabledReason rebuilt in the tab strip', () => {
  const tabs = local('src/source-preview-tabs.jsx');
  assert.equal(count(tabs, '<SourceTooltip disabledReason={capped ? t(PREVIEW_TAB_CAP_TEXT) : null} keepReasonWrapper side="bottom" hoverable={false}>'), 1);
  for (const gone of ['data-cds-disabled-reason-wrapper', 'data-cds-disabled-reason=', 'DISABLED_REASON_WRAPPER', 'openOnHandedBackFocus', 'descriptionId'])
    assert.equal(count(tabs, gone), 0, gone);
  const tooltip = local('src/source-tooltip.jsx');
  assert.equal(count(tooltip, 'keepReasonWrapper = false'), 1, 'off unless asked');
});

test('preview-13: reaching and lifting the cap keeps the same + button and wrapper nodes (no remount)', async () => {
  await withPreviewDom(async (dom) => {
    const host = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(host);
    const render = (n) => act(async () => root.render(React.createElement(Tabs.SourcePreviewTabs, stripProps(n))));
    const plus = () => host.querySelector('[data-preview-new-tab] button');
    const wrapper = () => host.querySelector('[data-preview-new-tab] [data-cds-disabled-reason-wrapper]');
    const reason = () => host.querySelector('[data-preview-new-tab] [data-cds-disabled-reason]');
    await render(8);
    await flush();
    const [button, box, hidden] = [plus(), wrapper(), reason()];
    assert.ok(button && box && hidden);
    assert.equal(box.getAttribute('tabindex'), '-1');
    assert.equal(box.getAttribute('aria-describedby'), null);
    assert.equal(hidden.textContent, '');
    await render(9);
    await flush();
    assert.equal(plus(), button, 'the same button');
    assert.equal(wrapper(), box, 'the same wrapper');
    assert.equal(button.disabled, true);
    assert.equal(box.getAttribute('tabindex'), '0');
    assert.equal(box.getAttribute('aria-describedby'), reason().getAttribute('id'));
    assert.equal(reason().textContent, 'Tab limit reached. Close a tab to open a new one.');
    await render(8);
    await flush();
    assert.equal(plus(), button);
    assert.equal(wrapper(), box);
    assert.equal(box.getAttribute('tabindex'), '-1');
    await act(async () => root.unmount());
  });
});

// ---- preview-07: Discard your annotations? before picking, mounted ---------------------------------------------------

const web = { name: 'web', port: 5173, url: 'http://localhost:5173', attach: false };
const page = { sessionId: 't1', cwd: '/work', url: 'http://localhost:5173/', title: 'Web', loading: false, error: null, hasPage: true, canGoBack: false, canGoForward: false, devtools: false,
  viewport: { preset: 'responsive', width: null, height: null, colorScheme: 'system', setByAgent: false }, hostId: null, consoleErrors: 0,
  selection: { enabled: false, busy: false }, tabs: [{ id: 'tab-1', url: 'http://localhost:5173/', title: 'Web' }], activeTabId: 'tab-1',
  servers: [{ name: 'web', port: 5173, url: 'http://localhost:5173', status: 'running', attach: false, startedAt: 1 }],
  launch: { exists: true, error: null, problems: [], configs: [web], autoVerify: true } };

// What the fake DOM lacks for the sketch and its confirmation: a laid-out <canvas> (the canvas sizes its bitmap from its
// box and only then takes its 2D context) with a recording 2D context, and document.getElementById (SourceDialog).
function install2d(dom) {
  const drawn = [];
  const context = new Proxy({ canvas: null }, {
    get(target, key) { if (key in target) return target[key]; return (...args) => { drawn.push([key, ...args]); return undefined; }; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const proto = dom.Element.prototype;
  proto.getContext = function getContext(kind) { return kind === '2d' && this.localName === 'canvas' ? context : null; };
  for (const [name, size] of [['offsetWidth', 400], ['offsetHeight', 300]]) {
    const base = Object.getOwnPropertyDescriptor(proto, name).get;
    Object.defineProperty(proto, name, { configurable: true, get() { return this.localName === 'canvas' ? size : base.call(this); } });
  }
  dom.document.getElementById = id => dom.document.documentElement.find(node => node.getAttribute?.('id') === id);
  return drawn;
}
function pointer(node, type, { x, y, buttons = 1 }) {
  const handler = { pointerdown: 'onPointerDown', pointermove: 'onPointerMove', pointerup: 'onPointerUp' }[type];
  const captured = [];
  const event = { type, pointerId: 1, pointerType: 'mouse', button: 0, buttons, clientX: x, clientY: y, shiftKey: false, altKey: false, metaKey: false, ctrlKey: false,
    target: node, currentTarget: Object.assign(Object.create(node), { setPointerCapture: id => captured.push(id), releasePointerCapture() {}, hasPointerCapture: () => true }),
    preventDefault() {}, stopPropagation() {}, nativeEvent: { stopImmediatePropagation() {} }, defaultPrevented: false };
  return act(async () => { reactProps(node)[handler]?.(event); });
}

async function sketchWithMarks(dom, handlers = {}, { draw = true } = {}) {
  const drawn = install2d(dom);
  let state = page;
  const desktop = createDesktop({
    'preview-state': () => state, 'preview-attach': () => null, 'preview-occlude': () => ({}),
    'preview-capture': () => ({ bytes: new Uint8Array(0), type: 'image/png', displayWidth: 0 }),
    'preview-selection': ({ enabled }) => { state = { ...state, selection: { enabled, busy: false } }; return state; },
    ...handlers,
  });
  const host = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(host);
  await act(async () => root.render(React.createElement(P.SourcePreviewPane, { sessionId: 't1', desktop, initialState: page, onError() {}, onAttachElement() {}, onAttachScreenshot() {} })));
  await flush();
  const instanceId = desktop.calls.find(entry => entry.action === 'preview-attach')?.params.instanceId;
  await act(async () => desktop.push({ kind: 'preview-shortcut', sessionId: 't1', instanceId, action: 'sketch' }));
  await flush();
  const layer = host.querySelector('[data-preview-sketch]');
  assert.equal(layer?.getAttribute('data-drawing'), '', 'the sketch is drawing (empty capture: no backdrop)');
  const canvas = layer.querySelector('canvas[role="application"]');
  assert.ok(canvas, 'the sketch canvas');
  // A pen stroke, through the canvas's own pointer handlers.
  if (draw) {
    await pointer(canvas, 'pointerdown', { x: 10, y: 10 });
    await pointer(canvas, 'pointermove', { x: 40, y: 30 });
    await pointer(canvas, 'pointermove', { x: 80, y: 60 });
    await pointer(canvas, 'pointerup', { x: 80, y: 60, buttons: 0 });
    await flush();
  }
  return { desktop, host, root, instanceId, drawn, setState: next => { state = next; return act(async () => desktop.push({ kind: 'preview', sessionId: 't1', state: next })); } };
}
const dialog = dom => dom.document.querySelector('[role="alertdialog"]');
const buttonNamed = (scope, name) => [...scope.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === name || node.textContent.trim() === name);

test('preview-07: Select element over a sketch with marks asks first; Discard closes the sketch and turns picking on', async () => {
  await withPreviewDom(async (dom) => {
    const view = await sketchWithMarks(dom);
    assert.ok(view.drawn.some(([method]) => method === 'lineTo'), 'the stroke was drawn into the 2D context');
    assert.equal(dialog(dom), null);
    const layer = view.host.querySelector('[data-preview-sketch]');
    const select = buttonNamed(layer, 'Select element');
    assert.ok(select, 'the sketch bar offers Select element');
    await click(select);
    await flush();
    const ask = dialog(dom);
    assert.ok(ask, 'Discard your annotations? (Zr: nothing else was open)');
    assert.match(ask.textContent, /Discard your annotations\?/);
    assert.equal(view.desktop.count('preview-selection'), 0, 'nothing is picked yet');
    await click(buttonNamed(ask, 'Discard'));
    await flush(10);
    assert.equal(dialog(dom), null, 'the confirmation closed');
    assert.equal(view.host.querySelector('[data-preview-sketch] canvas'), null, 'the sketch closed');
    assert.deepEqual(view.desktop.last('preview-selection'), { sessionId: 't1', instanceId: view.instanceId, enabled: true }, 'si: picking, the pending action');
    await act(async () => view.root.unmount());
  });
});

test('preview-07: without marks Select element asks nothing and picks at once', async () => {
  await withPreviewDom(async (dom) => {
    const view = await sketchWithMarks(dom, {}, { draw: false });
    await click(buttonNamed(view.host.querySelector('[data-preview-sketch]'), 'Select element'));
    await flush(10);
    assert.equal(dialog(dom), null, 'no confirmation for an empty sketch');
    assert.deepEqual(view.desktop.last('preview-selection'), { sessionId: 't1', instanceId: view.instanceId, enabled: true });
    await act(async () => view.root.unmount());
  });
});

test('preview-07: Keep editing leaves the sketch; the confirmation goes by itself once the page\'s server stops (Kr: V)', async () => {
  await withPreviewDom(async (dom) => {
    const view = await sketchWithMarks(dom);
    const layer = () => view.host.querySelector('[data-preview-sketch]');
    await click(buttonNamed(layer(), 'Select element'));
    await flush();
    await click(buttonNamed(dialog(dom), 'Keep editing'));
    await flush();
    assert.equal(dialog(dom), null);
    assert.ok(layer()?.querySelector('canvas'), 'still sketching');
    assert.equal(view.desktop.count('preview-selection'), 0);
    // Ask again, then the page's server stops: the pending action is dropped and its confirmation with it.
    await click(buttonNamed(layer(), 'Select element'));
    await flush();
    assert.ok(dialog(dom));
    await view.setState({ ...page, servers: [{ ...page.servers[0], status: 'stopped' }] });
    await flush();
    assert.equal(view.host.querySelector('aside').getAttribute('data-preview-surface'), 'stopped');
    assert.equal(dialog(dom), null, 'the confirmation went away');
    assert.equal(view.desktop.count('preview-selection'), 0, 'and nothing was picked');
    await act(async () => view.root.unmount());
  });
});
