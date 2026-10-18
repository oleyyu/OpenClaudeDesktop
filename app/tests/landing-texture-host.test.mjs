// blue-bg-02 (R3-composer step 4): main.jsx mounts the generated 2.42304.0 landing-texture host (cc43287c9 mH,
// src/generated/landing-texture/host.mjs) as the first child of the Code pane root, the place and gate of jre's
// `children: [v(mH, { available: Jt && !Ot, onLanding: Kt }), …]` in YI. WebGL cannot run in Node and nothing here
// claims the texture draws or what colour it is: these tests pin the mount position and gate against the official
// source, drive the gate under a controlled DOM and clock (WebGL2 always refused), resolve the real stylesheets to show
// that the official `[[data-landing-texture=canvas]~div_&]` variants of the start card / environment bar reach only
// through this position, and check the `__vite__mapDeps` seam the build will see.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';
import { appSheets, computed, element, loadCascade } from './fixtures/transcript-css-cascade.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (file) => fs.readFileSync(path.join(reference, file), 'utf8');
const layerClass = 'pointer-events-none absolute inset-0 font-mono-ui text-muted-as-secondary transition-opacity ease-out [contain:strict]';
const h = React.createElement;

let server, Host, Layer, Env, View;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/generated/landing-texture/host.mjs');
  Layer = await server.ssrLoadModule('/src/generated/landing-texture/layer.mjs');
  Env = await server.ssrLoadModule('/src/generated/code-composer/environment-bar.mjs');
  View = await server.ssrLoadModule('/src/generated/code-start/view.mjs');
});
after(() => server?.close());

// ---------------------------------------------------------------- main.jsx, read as an AST
const mainSource = read('src/main.jsx');
const mainAst = parseAst(mainSource, { lang: 'jsx' }, 'src/main.jsx');
const text = (node) => mainSource.slice(node.start, node.end);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value, visit);
  }
}
function findAll(root, predicate) { const out = []; walk(root, (node) => { if (predicate(node)) out.push(node); }); return out; }
const jsxName = (node) => node.type === 'JSXElement' ? node.openingElement.name.name : null;
const attr = (node, name) => node.openingElement.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === name);
const classOf = (node) => { const a = attr(node, 'className'); return a?.value?.type === 'Literal' ? a.value.value : null; };
// Rendered children only: whitespace text and {/* comments */} produce no node.
const meaningful = (node) => node.children.filter((c) => !(c.type === 'JSXText' && !c.value.trim()) && !(c.type === 'JSXExpressionContainer' && c.expression.type === 'JSXEmptyExpression'));

function paneMount() {
  const panes = findAll(mainAst, (n) => jsxName(n) === 'div' && classOf(n) === 'source-chat-tile-content');
  assert.equal(panes.length, 1, 'one Code/Chat pane root');
  const [pane] = panes;
  const [first, second, ...rest] = meaningful(pane);
  assert.equal(first.type, 'JSXExpressionContainer');
  const gate = first.expression;
  assert.equal(gate.type, 'LogicalExpression');
  assert.equal(gate.operator, '&&');
  const hostEl = gate.right;
  assert.equal(jsxName(hostEl), 'LandingTextureHost');
  return { pane, gate, hostEl, second, rest };
}

// The gate exactly as main.jsx writes it, evaluated (not a copy): null when the host is not rendered at all.
function mainGate() {
  const { gate, hostEl } = paneMount();
  const props = hostEl.openingElement.attributes.map((a) => `${JSON.stringify(a.name.name)}: ${text(a.value.expression)}`).join(', ');
  // eslint-disable-next-line no-new-func
  return new Function('mode', 'splitView', 'current', 'section', 'spawnPhase', `return (${text(gate.left)}) ? { ${props} } : null;`);
}

test('official mount: jre puts mH first in YI (relative), gated by presets, landing face and no other session pane', () => {
  const cc = official('cc43287c9-DAfOi8yP.js'), shared20 = official('shared-20-B7UqYfsi.js');
  for (const needle of [
    'children:[v(mH,{available:Jt&&!Ot,onLanding:Kt}),',
    'ie=P_()', 'Ze=hh({sessionId:_e,hasDraftEntry:he,phase:le})', 'Ot=Nv()',
    'Gt=_h({environments:ie,environmentBar:ae})', 'Kt=Ze&&gh({face:Gt,inSplitWindow:Ot})', 'Jt=ie&&!I',
    'var mH=O(function({available:e,onLanding:t})',
  ]) assert.equal(cc.split(needle).length, 2, needle);
  for (const needle of [
    'function rh({sessionId:e,hasDraftEntry:t,phase:n}){return!e&&!t&&n!=="spawning"}',
    'function oh({environments:e,environmentBar:t}){return e?t?"start-card":"turn-zero":"greeting"}',
    'function sh({face:e,inSplitWindow:t}){return e==="start-card"||!t}',
  ]) assert.equal(shared20.split(needle).length, 2, needle);
  // YI = c4c113f6f `f`: the drop zone div whose className is i("relative", m): the texture's absolute inset-0 box.
  assert.match(cc, /import\{t as YI\}from"\.\/c4c113f6f-C_6eb8-V\.js"/);
  assert.ok(official('c4c113f6f-C_6eb8-V.js').includes('e("div",{ref:_,className:i("relative",m),'));
});

test('main.jsx: the generated host is the first child of the pane root, imported by its semantic name only', () => {
  const imports = mainAst.body.filter((n) => n.type === 'ImportDeclaration' && /landing-texture/.test(n.source.value));
  assert.deepEqual(imports.map((n) => [n.source.value, n.specifiers.map((s) => [s.imported.name, s.local.name])]),
    [['./generated/landing-texture/host.mjs', [['LandingTextureHost', 'LandingTextureHost']]]], 'only the host, never layer.mjs');
  assert.equal(findAll(mainAst, (n) => jsxName(n) === 'LandingTextureHost').length, 1, 'mounted once');
  const { pane, gate, hostEl, second, rest } = paneMount();
  assert.equal(text(gate.left), 'mode === "code"', 'Code only: Chat/Cowork are other routes in the official app');
  assert.deepEqual(hostEl.openingElement.attributes.map((a) => [a.name.name, text(a.value.expression)]), [
    ['available', '!splitView.open'],
    ['onLanding', '!current && section === "new" && !spawnPhase'],
  ]);
  assert.equal(hostEl.children.length, 0);
  // The landing gate is the pane's own data-home condition plus "not spawning" (rh's phase !== "spawning").
  assert.equal(text(attr(pane, 'data-home').value.expression), '!current && section === "new" || undefined');
  // Next comes the titlebar, then the body div whose subtree holds the start card and the composer (environment bar):
  // both are descendants of a later sibling <div>, which is what `[data-landing-texture=canvas]~div .x` needs.
  assert.match(text(second), /^\{!artifactPreviewOpen && <SourceTitlebar /);
  const body = rest.find((c) => jsxName(c) === 'div' && classOf(c) === 'source-chat-body');
  assert.ok(body, 'a later sibling div.source-chat-body');
  const homes = findAll(body, (n) => jsxName(n) === 'SourceSurfaceHome');
  assert.equal(homes.length, 1, 'the section "new" home');
  assert.equal(findAll(homes[0], (n) => jsxName(n) === 'SourceCodeStart').length, 1);
  assert.equal(findAll(homes[0], (n) => n.type === 'CallExpression' && n.callee.name === 'renderMainComposer').length, 1);
  // YI's `relative` is played by the chat tile's absolutely positioned shell (same box as the pane root); no CSS added.
  assert.match(read('src/source-tile-layout.css'), /\.source-chat-tile > \.tiles-shell \{\s*position: absolute;\s*\}/);
  assert.match(read('src/source-tile-layout.css'), /\.tiles-content-host \{\s*display: contents;\s*\}/);
  for (const file of fs.readdirSync(path.join(app, 'src')).filter((f) => f.endsWith('.css')))
    assert.doesNotMatch(read(`src/${file}`), /landing-texture|LandingTexture/, `${file} draws nothing for the texture`);
});

test('gate: main.jsx\'s expressions agree with the official rh/oh/sh mapping on every Code state', () => {
  const gate = mainGate();
  // eslint-disable-next-line no-new-func
  const fn = (src) => new Function(`return (${src});`)();
  const rh = fn('function rh({sessionId:e,hasDraftEntry:t,phase:n}){return!e&&!t&&n!=="spawning"}');
  const oh = fn('function oh({environments:e,environmentBar:t}){return e?t?"start-card":"turn-zero":"greeting"}');
  const sh = fn('function sh({face:e,inSplitWindow:t}){return e==="start-card"||!t}');
  let cases = 0;
  for (const mode of ['code', 'chat', 'cowork']) for (const section of ['new', 'sessions', 'routines', 'projects'])
    for (const current of [null, 'thread-1']) for (const spawnPhase of [null, { phase: 'creating' }]) for (const open of [false, true]) {
      const props = gate(mode, { open }, current, section, spawnPhase);
      if (mode !== 'code') { assert.equal(props, null, `${mode}: no host`); continue; }
      // Host facts: presets on (D10: ie = ae = true), no composerOnly pane (I = false); local Home is the start card.
      const ie = true, ae = true, I = false, Ot = open;
      const Ze = rh({ sessionId: current, hasDraftEntry: !!spawnPhase, phase: spawnPhase ? 'spawning' : 'draft' });
      const Gt = oh({ environments: ie, environmentBar: ae });
      const Kt = Ze && sh({ face: Gt, inSplitWindow: Ot }), Jt = ie && !I;
      // Off the Code home route (Sessions page, Routines, Projects) the official jre pane is not mounted at all.
      const onRoute = section === 'new';
      assert.equal(props.available, Jt && !Ot, JSON.stringify({ section, current, spawnPhase, open }));
      assert.equal(props.onLanding, onRoute && Kt, JSON.stringify({ section, current, spawnPhase, open }));
      cases += 1;
    }
  assert.equal(cases, 32);
});

test('SSR: the mounted host renders nothing on the server, so the pane starts with the titlebar and touches no window', () => {
  assert.equal(typeof globalThis.window, 'undefined');
  const gate = mainGate();
  const markup = renderToStaticMarkup(h('div', { className: 'source-chat-tile-content' },
    h(Host.LandingTextureHost, gate('code', { open: false }, null, 'new', null)), h('div', { className: 'st-toolbar' }), h('div', { className: 'source-chat-body' })));
  assert.equal(markup, '<div class="source-chat-tile-content"><div class="st-toolbar"></div><div class="source-chat-body"></div></div>');
});

// ---------------------------------------------------------------- controlled DOM and clock (WebGL2 always refused)
function createEnvironment() {
  let now = 0, nextId = 0;
  const timers = new Map(), frames = new Map();
  const events = {
    addEventListener(type, fn) { ((this.__listeners ??= new Map()).get(type) ?? this.__listeners.set(type, []).get(type)).push(fn); },
    removeEventListener(type, fn) { const list = this.__listeners?.get(type); const i = list?.indexOf(fn) ?? -1; if (i >= 0) list.splice(i, 1); },
    dispatchEvent(event) { for (const fn of [...(this.__listeners?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', hidden: false, activeElement: null });
  document.fonts = { load: () => Promise.resolve([]) };
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), dataset: {} }); this.style = { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }; }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
    get className() { return this.getAttribute('class') ?? ''; }
    set className(value) { this.setAttribute('class', value); }
    set textContent(_value) { this.childNodes = []; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    append(...children) { children.forEach((child) => this.appendChild(child)); }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    remove() { this.parentNode?.removeChild(this); }
    contains(node) { for (let x = node; x; x = x.parentNode) if (x === this) return true; return false; }
    closest() { return null; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; }
    getContext() { return null; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: (tag) => new Element(tag), createTextNode: (value) => ({ nodeType: 3, nodeName: '#text', textContent: value, ownerDocument: document, parentNode: null }) });
  document.documentElement = new Element('html');
  document.body = document.documentElement.appendChild(new Element('body'));
  const storage = new Map();
  const window = Object.assign(Object.create(events), {
    focused: true, document, devicePixelRatio: 2, HTMLIFrameElement: class {},
    performance: { now: () => now },
    setTimeout(fn, ms = 0) { const id = ++nextId; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++nextId; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    matchMedia: (query) => ({ media: query, matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ fontFamily: 'ui-monospace', color: 'rgb(137, 135, 129)', colorScheme: 'light' }),
    crypto: { getRandomValues: (array) => { array[0] = 0x2468ace; return array; } },
    localStorage: { getItem: (k) => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
  });
  window.ResizeObserverEntry = class { get devicePixelContentBoxSize() { return []; } };
  document.defaultView = window;
  document.hasFocus = () => window.focused;
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      const timer = [...timers].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!timer || timer[1].at > end) break;
      now = timer[1].at; timers.delete(timer[0]); timer[1].fn();
    }
    now = end;
  };
  return { window, document, advance };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
async function withGlobals(env, run) {
  const saved = ['window', 'document', 'localStorage'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', env.window], ['document', env.document], ['localStorage', env.window.localStorage]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try { return await run(); }
  finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}
// The props the official host hands the official layer, read from React's current tree (container → FiberRoot.current;
// a host node's own fiber pointer can be the stale alternate after an update).
function layerProps(container) {
  const key = Object.keys(container).find((k) => k.startsWith('__reactContainer$'));
  const stack = [container[key].stateNode.current];
  while (stack.length) {
    const fiber = stack.pop();
    if (fiber.type === Layer.LandingTextureLayer) return fiber.memoizedProps;
    if (fiber.sibling) stack.push(fiber.sibling);
    if (fiber.child) stack.push(fiber.child);
  }
  return null;
}

test('controlled: main.jsx\'s gate reveals the official layer as the pane\'s first child, follows spawn/session/split, and the local Reduce motion', async () => {
  const env = createEnvironment();
  const gate = mainGate();
  await withGlobals(env, async () => {
    const container = env.document.body.appendChild(env.document.createElement('div'));
    const root = createRoot(container);
    const Pane = ({ mode = 'code', open = false, current = null, section = 'new', spawnPhase = null }) => {
      const props = gate(mode, { open }, current, section, spawnPhase);
      return h('div', { className: 'source-chat-tile-content' }, props && h(Host.LandingTextureHost, props),
        h('div', { className: 'st-toolbar' }), h('div', { className: 'source-chat-body' }, h('ul', { className: View.startCardClassName })));
    };
    const render = (state) => act(async () => root.render(h(Pane, state)));
    const advance = (ms) => act(async () => { env.advance(ms); await flush(); });
    const pane = () => container.firstChild;
    const kinds = () => pane().childNodes.map((n) => n.getAttribute('aria-hidden') === 'true' ? 'texture' : n.getAttribute('class').split(' ')[0]);

    await render({});
    await advance(2999);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body'], 'NB = 3000 ms of visibility first');
    await advance(1);
    await act(async () => { await Host.loadLandingTextureLayer(); await flush(); });
    assert.deepEqual(kinds(), ['texture', 'st-toolbar', 'source-chat-body'], 'the layer box is the first child, the body a later sibling div');
    const box = pane().firstChild;
    assert.equal(box.getAttribute('class'), `${layerClass} opacity-0`, 'WebGL2 refused here: it stays transparent');
    assert.deepEqual(pick(layerProps(container)), { shown: true, animate: true });

    // Local Settings › Reduce motion: appearance-root.mjs writes html[data-reduce-motion], main.jsx announces it.
    env.document.documentElement.dataset.reduceMotion = 'true';
    await act(async () => { env.window.dispatchEvent({ type: 'local-motion-change' }); await flush(); });
    assert.deepEqual(pick(layerProps(container)), { shown: true, animate: false }, 'still shown, not animated (Xn shouldReduceMotion)');
    delete env.document.documentElement.dataset.reduceMotion;
    await act(async () => { env.window.dispatchEvent({ type: 'local-motion-change' }); await flush(); });
    assert.equal(layerProps(container).animate, true);

    // First message sent: spawning → onLanding false → the official 500 ms fade, then gone.
    await render({ spawnPhase: { phase: 'creating' } });
    assert.equal(layerProps(container).shown, false);
    assert.deepEqual(kinds(), ['texture', 'st-toolbar', 'source-chat-body']);
    await advance(500);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body']);
    // Spawn failed / back on Home: the reveal waits its 3000 ms again.
    await render({});
    await advance(2999);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body']);
    await advance(1);
    assert.deepEqual(kinds(), ['texture', 'st-toolbar', 'source-chat-body']);
    // A session opens: hidden; another session pane (split) makes it unavailable.
    await render({ current: 'thread-1' });
    await advance(500);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body']);
    await render({ open: true });
    await advance(10000);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body'], 'Ot: never in a split');
    await render({ section: 'sessions' });
    await advance(10000);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body']);
    await render({ mode: 'chat' });
    await advance(10000);
    assert.deepEqual(kinds(), ['st-toolbar', 'source-chat-body']);
    await act(async () => root.unmount());
  });
  function pick(props) { return { shown: props.shown, animate: props.animate }; }
});

// ---------------------------------------------------------------- real stylesheets
let sheets;
const cascade = () => (sheets ??= loadCascade([...appSheets(app), {
  // Probes for the two start-card variants the resolver cannot read (transform / position): the official selectors,
  // copied verbatim from c6a992d55, given a tracked declaration, so a match is what is being tested.
  name: 'probe', code: probeSelectors().map((selector, i) => `${selector}{letter-spacing:${i + 1}px}`).join(''),
}]));
function probeSelectors() {
  const css = fs.readFileSync(path.join(app, 'public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  return [/\[data-landing-texture=canvas\]~div \.\\\[\\\[data-landing-texture\\=canvas\\\]\\~div_\\&\\\]\\:transform-gpu(?=\{)/,
    /\[data-landing-texture=canvas\]~div \.\\\[\\\[data-landing-texture\\=canvas\\\]\\~div_\\&\\\]\\:\\\[\\&\\>li\\\]\\:relative>li(?=\{)/]
    .map((re) => { const m = css.match(re); assert.ok(m, re); return m[0]; });
}
function home({ marker, inside = false }) {
  const layer = element('div', { 'aria-hidden': 'true', class: `${layerClass} opacity-100`, ...(marker ? { 'data-landing-texture': 'canvas' } : {}) });
  const card = element('ul', { class: View.startCardClassName }, [element('li', {})]);
  const chips = element('div', { class: `flex empty:hidden ${Env.environmentChipClass}` });
  const line = element('div', { class: Env.environmentLineSurfaceClass });
  const conversation = element('div', { class: 'conversation' }, [element('div', { class: 'source-transcript-frame' }, [element('div', { class: 'welcome' }, [card])]),
    element('div', { class: 'sc-zone composer-zone' }, [chips, line])]);
  const body = element('div', { class: 'source-chat-body' }, inside ? [conversation, layer] : [conversation]);
  element('div', { class: 'source-chat-tile-content', 'data-surface': 'code', 'data-section': 'new', 'data-home': '' },
    inside ? [element('div', { class: 'st-toolbar' }), body] : [layer, element('div', { class: 'st-toolbar' }), body]);
  return { layer, card, li: card.children[0], chips, line };
}
const value = (node, property) => { const r = computed(cascade(), node, property); return { value: typeof r.value === 'string' ? r.value : JSON.stringify(r.value), sheet: r.from?.sheet ?? null }; };
const OFFICIAL = 'public/assets/v1/c6a992d55-sXiDGMFQ.css';

test('cascade: with the layer first and marked canvas, the official landing variants of the start card and environment bar apply', () => {
  const on = home({ marker: true });
  assert.deepEqual(value(on.chips, 'border-top-left-radius'), { value: '0px', sheet: OFFICIAL }, 'o0 rounded-none');
  assert.deepEqual(value(on.line, 'padding-left'), { value: 'padding-inline(var(--spacing))', sheet: OFFICIAL }, 's0 px-1');
  assert.deepEqual(value(on.line, 'max-width'), { value: '100%', sheet: OFFICIAL }, 's0 max-w-full');
  assert.deepEqual(value(on.line, 'background-color'), { value: 'var(--epitaxy-transcript-surface, var(--cds-surface-1))', sheet: OFFICIAL }, 's0 surface');
  assert.equal(value(on.card, 'letter-spacing').value, '1px', 'o6 transform-gpu selector matches the card');
  assert.equal(value(on.li, 'letter-spacing').value, '2px', 'o6 [&>li]:relative selector matches its rows');
  // The card and chips keep their opaque FP surface either way; the layer's own box is the official class string.
  assert.deepEqual(value(on.card, 'background-color'), { value: 'var(--epitaxy-transcript-surface, var(--cds-surface-1))', sheet: OFFICIAL });
  assert.deepEqual(value(on.layer, 'pointer-events'), { value: 'none', sheet: OFFICIAL });
  assert.deepEqual(value(on.layer, 'color'), { value: 'var(--muted-as-secondary, var(--cds-text-muted))', sheet: OFFICIAL });
  assert.deepEqual(value(on.layer, 'font-family'), { value: 'var(--cds-font-mono-ui)', sheet: OFFICIAL });
});

test('cascade: without the canvas marker (still loading, WebGL2 refused) or with the layer elsewhere, nothing changes', () => {
  for (const state of [home({ marker: false }), home({ marker: true, inside: true })]) {
    assert.deepEqual(value(state.chips, 'border-top-left-radius'), { value: 'border-radius(var(--cds-radius))', sheet: OFFICIAL }, 'o0 keeps `rounded`');
    assert.equal(value(state.line, 'max-width').value, 'initial');
    assert.equal(value(state.line, 'background-color').value, 'initial');
    assert.notEqual(value(state.card, 'letter-spacing').sheet, 'probe');
    assert.notEqual(value(state.li, 'letter-spacing').sheet, 'probe');
  }
});

test('cascade: no positioned local container between the layer and the content paints a background over it', () => {
  // The texture is absolute (z-index auto) at the front of the pane: it paints above non-positioned backgrounds and
  // below later positioned boxes (.source-transcript-frame, .sc-zone are relative). None of those has a background,
  // so the only opaque surfaces above it are the official FP ones on the start card and the environment bar.
  const nodes = {
    pane: element('div', { class: 'source-chat-tile-content', 'data-surface': 'code', 'data-home': '' }),
    body: element('div', { class: 'source-chat-body' }), conversation: element('div', { class: 'conversation' }),
    frame: element('div', { class: 'source-transcript-frame' }), transcript: element('div', { class: 'transcript' }),
    content: element('div', { class: 'source-transcript-content' }), welcome: element('div', { class: 'welcome' }),
    zone: element('div', { class: 'sc-zone composer-zone', 'data-code-layout': 'presets' }), toolbar: element('div', { class: 'workspace-toolbar st-toolbar' }),
  };
  element('div', { class: 'tiles-tile-wrap source-chat-tile' }, [element('div', { class: 'tiles-shell' }, [element('div', { class: 'tiles-content-host' }, [nodes.pane])])]);
  nodes.pane.children.push(nodes.toolbar, nodes.body); nodes.toolbar.parent = nodes.pane; nodes.body.parent = nodes.pane;
  for (const [parent, child] of [['body', 'conversation'], ['conversation', 'frame'], ['frame', 'transcript'], ['transcript', 'content'], ['content', 'welcome'], ['conversation', 'zone']]) {
    nodes[parent].children.push(nodes[child]); nodes[child].parent = nodes[parent];
  }
  for (const [name, node] of Object.entries(nodes)) {
    assert.equal(value(node, 'background-color').value, 'initial', `${name} background-color`);
    assert.equal(value(node, 'background-image').value, 'initial', `${name} background-image`);
  }
});

// ---------------------------------------------------------------- build seam
test('__vite__mapDeps is only an imported alias; nothing in the renderer graph declares it; the layer stays a lazy chunk', async () => {
  const parse = (file) => parseAst(read(file), { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file);
  const hostAst = parse('src/generated/landing-texture/host.mjs');
  const spec = hostAst.body.filter((n) => n.type === 'ImportDeclaration').flatMap((n) => n.specifiers.map((s) => ({ from: n.source.value, imported: s.imported?.name, local: s.local.name })))
    .find((s) => s.local === '__vite__mapDeps');
  assert.deepEqual(spec, { from: '../../source-landing-texture-adapters.jsx', imported: 'chunkDependencies', local: '__vite__mapDeps' });
  const calls = findAll(hostAst, (n) => n.type === 'CallExpression' && n.callee.name === '__vite__mapDeps');
  assert.equal(calls.length, 1);
  const adapters = parse('src/source-landing-texture-adapters.jsx');
  assert.ok(adapters.body.some((n) => n.type === 'ExportNamedDeclaration' && n.declaration?.type === 'FunctionDeclaration' && n.declaration.id.name === 'chunkDependencies'));

  // Vite prepends `const __vite__mapDeps=` to every chunk with preload deps; a top-level binding of that name anywhere
  // in the static graph would be a redeclaration once modules are hoisted into one chunk.
  const EXT = ['', '.jsx', '.js', '.mjs', '/index.jsx', '/index.js', '/index.mjs'];
  const resolve = (from, specifier) => {
    if (!/^\.\.?\//.test(specifier)) return null;
    const base = path.resolve(path.dirname(from), specifier);
    return EXT.map((ext) => base + ext).find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
  };
  const declared = (program) => program.body.flatMap((n) => {
    const d = n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration' ? n.declaration : n;
    if (!d) return [];
    if (d.type === 'FunctionDeclaration' || d.type === 'ClassDeclaration') return d.id ? [d.id.name] : [];
    if (d.type === 'VariableDeclaration') return findAll({ type: 'X', list: d.declarations.map((x) => x.id) }, (x) => x.type === 'Identifier').map((x) => x.name);
    return [];
  });
  const seen = new Set(), lazy = new Set();
  const visit = (file) => {
    if (seen.has(file) || !/\.(jsx?|mjs)$/.test(file)) return;
    seen.add(file);
    const program = parseAst(fs.readFileSync(file, 'utf8'), { lang: file.endsWith('.jsx') ? 'jsx' : 'js' }, file);
    assert.ok(!declared(program).includes('__vite__mapDeps'), `${path.relative(app, file)} declares __vite__mapDeps`);
    for (const n of program.body) if (n.source && /^(Import|ExportNamed|ExportAll)Declaration$/.test(n.type)) { const target = resolve(file, n.source.value); if (target) visit(target); }
    for (const n of findAll(program, (x) => x.type === 'ImportExpression' && x.source.type === 'Literal')) { const target = resolve(file, n.source.value); if (target) lazy.add(target); }
  };
  visit(path.join(app, 'src/main.jsx'));
  const hostFile = path.join(app, 'src/generated/landing-texture/host.mjs'), layerFile = path.join(app, 'src/generated/landing-texture/layer.mjs');
  assert.ok(seen.has(hostFile), 'host is in the static graph of main.jsx');
  assert.ok(!seen.has(layerFile), 'the layer is not statically reachable');
  assert.ok(lazy.has(layerFile), 'the layer is reached through host.mjs\'s import()');
  // SSR: the adapter seam evaluates (mapDeps → [], preload → load) and yields the official layer.
  assert.equal(await Host.loadLandingTextureLayer(), Layer.LandingTextureLayer);
});
