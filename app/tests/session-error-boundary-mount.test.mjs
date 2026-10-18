import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parseAst } from 'rolldown/parseAst';

// R4f-error E36 (transcript-session-error-boundary, WI-3): main.jsx mounts the 2.42304.0 session load error boundary
// (shared-26 kl = generated RenderErrorBoundary, fallback cc43287c9 fV = generated SessionLoadError) around the session
// pane's content, through src/source-session-error-boundary.jsx. Official call sites pinned in the installed chunks; the
// boundary driven under a small fake DOM through React's own props (no browser, no reload, no network); main.jsx's
// mount read as an AST.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
const MESSAGE = 'Something went wrong loading this session.';

let server, Mount, Expansion, I18n;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Mount = await server.ssrLoadModule('/src/source-session-error-boundary.jsx');
  Expansion = await server.ssrLoadModule('/src/tool-group-expansion.mjs');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
});
after(async () => { await server?.close(); });

// A small fake DOM (as tests/session-load-error.test.mjs), enough for the CDS button and the boundary.
function createDom() {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), style: {} });
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
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
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
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
    querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  // location.reload is a spy: the closed chunk heal gate (D33) must never reach it.
  const reloads = [];
  const window = Object.assign(Object.create(events), { document, location: { pathname: '/', reload: () => reloads.push('reload') },
    HTMLIFrameElement: class {}, getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame() {} });
  document.defaultView = window;
  return { window, document, Element, reloads };
}
function storageSpy() {
  const values = new Map(), calls = [];
  return { calls, getItem: key => (calls.push(['get', key]), values.has(key) ? values.get(key) : null),
    setItem: (key, value) => { calls.push(['set', key]); values.set(key, String(value)); } };
}
async function withDom(run) {
  const dom = createDom();
  const storage = storageSpy();
  const names = ['window', 'document', 'sessionStorage'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['sessionStorage', storage]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, storage, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, currentTarget: element, target: element, button: 0, detail: 1, nativeEvent: {} });
const buttonOf = container => container.find(node => node.tagName === 'BUTTON');

// A session pane stand-in: renders its session's content, or throws while `failing` names it.
function paneProbe() {
  const probe = { failing: new Set(), renders: [] };
  probe.Pane = function Pane({ sessionId }) {
    probe.renders.push(sessionId ?? 'draft');
    if (probe.failing.has(sessionId ?? 'draft')) throw Error(`pane ${sessionId ?? 'draft'} failed to render`);
    return h('p', { 'data-pane': sessionId ?? 'draft' }, `content of ${sessionId ?? 'draft'}`);
  };
  return probe;
}
const mounted = (container, key) => !!container.find(node => node.getAttribute?.('data-pane') === key);

test('official: the three chat panel boundaries mount cc43287c9 fV with EpitaxyChatPanel / feature epitaxy, the draft panel included', () => {
  const pins = [
    // c11959232 Nm (main pane): resetOn the mount key, the panel's sessionId (undefined for the draft panel).
    ['c11959232-Dx4NfIyJ.js', 'componentName:"EpitaxyChatPanel",tags:{feature:"epitaxy"},metadata:{sessionId:r},fallback:(e,t)=>s(qo,{error:e,reset:t,sessionId:r})'],
    ['c11959232-Dx4NfIyJ.js', 'draftPersistKey:r?ze(r):cm,initialSessionId:r'],
    // c11959232 Pm (secondary pane).
    ['c11959232-Dx4NfIyJ.js', 'let p=n??`pane-draft-${r??i}`;return s(Zt,{resetOn:p,componentName:"EpitaxyChatPanel",tags:{feature:"epitaxy",pane:"secondary"},metadata:{sessionId:n},fallback:(e,t)=>s(qo,{error:e,reset:t,sessionId:n})'],
    // c5638815a lt (pop-out), whose sanitizeError / rethrow the host does not port.
    ['c5638815a-D1NXo6h5.js', 'componentName:"EpitaxyChatPanel",tags:{feature:"epitaxy",pane:"popout"},metadata:{sessionId:a},sanitizeError:ct,fallback:(e,t)=>{if(p(e))throw e;return n(Se,{error:e,reset:t,sessionId:a})}'],
    // fV: export C, its Try again forgets only a defined session's caches.
    ['cc43287c9-DAfOi8yP.js', 'fV as C'], ['cc43287c9-DAfOi8yP.js', 'n!==void 0&&($A(n),jP(n))'],
    ['cc43287c9-DAfOi8yP.js', 'defaultMessage:"Something went wrong loading this session.",id:"z0PjNhLbSp"'],
  ];
  for (const [file, needle] of pins) assert.equal(occurrences(raw(file), needle), 1, `${file}: ${needle}`);
  assert.equal(occurrences(raw('c11959232-Dx4NfIyJ.js'), 'fallback:(e,t)=>s(qo,{error:e,reset:t,sessionId:'), 3);
});

test('sessionErrorBoundaryProps: the call sites\' componentName / tags / metadata, resetOn the mount key', () => {
  const { sessionErrorBoundaryProps, SESSION_PANEL_COMPONENT, SESSION_DRAFT_MOUNT_KEY } = Mount;
  assert.equal(SESSION_PANEL_COMPONENT, 'EpitaxyChatPanel');
  assert.deepEqual(sessionErrorBoundaryProps({ sessionId: 's1', mountKey: 's1' }),
    { sessionId: 's1', resetOn: 's1', componentName: 'EpitaxyChatPanel', tags: { feature: 'epitaxy' }, metadata: { sessionId: 's1' } });
  // The draft panel: no session, fV gets sessionId undefined; the mount key falls back to "draft".
  assert.deepEqual(sessionErrorBoundaryProps({ sessionId: null }),
    { sessionId: undefined, resetOn: SESSION_DRAFT_MOUNT_KEY, componentName: 'EpitaxyChatPanel', tags: { feature: 'epitaxy' }, metadata: { sessionId: undefined } });
  assert.equal(sessionErrorBoundaryProps({ sessionId: 's2' }).resetOn, 's2');
  assert.deepEqual(sessionErrorBoundaryProps({ sessionId: 's1', pane: 'secondary' }).tags, { feature: 'epitaxy', pane: 'secondary' });
  assert.deepEqual(sessionErrorBoundaryProps({ sessionId: 's1', pane: 'popout' }).tags, { feature: 'epitaxy', pane: 'popout' });
  assert.deepEqual(sessionErrorBoundaryProps({ sessionId: 's1', pane: 'other' }).tags, { feature: 'epitaxy' });
});

test('SSR: children render through the boundary untouched (it adds no DOM)', () => {
  const markup = renderToStaticMarkup(h(Mount.SourceSessionErrorBoundary, { sessionId: 's1', mountKey: 's1' }, h('div', { className: 'conversation' }, 'rows')));
  assert.equal(markup, '<div class="conversation">rows</div>');
});

test('a child that throws while rendering shows fV (original DOM); Try again re-renders it, forgets that session only, never reloads', async () => {
  const { toolGroupExpansion, toolRowExpansion, groupExpansionKey, rowExpansionKey } = Expansion;
  toolGroupExpansion.set(groupExpansionKey('s1', 'g1'), true);
  toolRowExpansion.set(rowExpansionKey('s1', 'r1'), true);
  toolGroupExpansion.set(groupExpansionKey('s2', 'g1'), true);
  const probe = paneProbe();
  await withDom(async ({ dom, storage, container, root, logged }) => {
    const tree = sessionId => h(Mount.SourceSessionErrorBoundary, { sessionId, mountKey: sessionId ?? 'draft' }, h(probe.Pane, { sessionId }));
    probe.failing.add('s1');
    act(() => root.render(tree('s1')));
    assert.ok(container.textContent.includes(MESSAGE), 'the fallback replaces the session pane');
    assert.ok(!mounted(container, 's1'));
    assert.ok(logged.length > 0, 'React reported the render error');
    // shared-19 T9's own DOM: the full-screen column, the danger message, one Try again button.
    const page = container.find(node => node.getAttribute?.('class') === 'min-h-screen flex flex-col items-center justify-center px-4');
    assert.ok(page, 'T9 root');
    assert.ok(container.find(node => node.getAttribute?.('class') === 'text-danger mb-6 text-lg font-medium' && node.textContent === MESSAGE));
    const button = buttonOf(container);
    assert.ok(button && button.textContent.includes('Try again'));
    assert.equal(container.textContent.includes('Back to landing page'), false);
    probe.failing.delete('s1');
    const before = probe.renders.length;
    act(() => reactProps(button).onClick(press(button)));
    assert.ok(probe.renders.length > before, 'the reset re-rendered the pane');
    assert.ok(mounted(container, 's1'), 'the session pane is back');
    assert.ok(!container.textContent.includes(MESSAGE));
    assert.equal(toolGroupExpansion.get(groupExpansionKey('s1', 'g1')), undefined, 'group expansion forgotten');
    assert.equal(toolRowExpansion.get(rowExpansionKey('s1', 'r1')), undefined, 'row expansion forgotten');
    assert.equal(toolGroupExpansion.get(groupExpansionKey('s2', 'g1')), true, 'another session keeps its expansion');
    assert.deepEqual(dom.reloads, [], 'window.location.reload is never called (D33: chunk heal gate closed)');
    assert.deepEqual(storage.calls, [], 'no pane_retry claim either');
  });
  toolGroupExpansion.forgetSession('s2');
});

test('a session switch (sessionId / mount key change) resets a shown fallback by itself; the same session keeps it', async () => {
  const probe = paneProbe();
  await withDom(async ({ dom, container, root }) => {
    const tree = sessionId => h(Mount.SourceSessionErrorBoundary, { sessionId, mountKey: sessionId ?? 'draft' }, h(probe.Pane, { sessionId }));
    probe.failing.add('s1');
    act(() => root.render(tree('s1')));
    assert.ok(container.textContent.includes(MESSAGE));
    // Same session, re-rendered by the App: the fallback stays (only Try again or a switch resets it).
    probe.failing.delete('s1');
    act(() => root.render(tree('s1')));
    assert.ok(container.textContent.includes(MESSAGE), 'no reset without a mount key change');
    probe.failing.add('s1');
    // Another session: kl's componentDidUpdate sees resetOn change and resets, no button pressed.
    act(() => root.render(tree('s2')));
    assert.ok(!container.textContent.includes(MESSAGE), 'the fallback is gone');
    assert.ok(mounted(container, 's2'), 'the other session renders');
    // Back to a session that still throws: the fallback again; then to the draft panel, which renders.
    act(() => root.render(tree('s1')));
    assert.ok(container.textContent.includes(MESSAGE));
    act(() => root.render(tree(null)));
    assert.ok(mounted(container, 'draft'), 'Home / draft renders after a switch');
    assert.deepEqual(dom.reloads, []);
  });
});

test('the draft panel (no session) is covered too: fV with sessionId undefined only resets', async () => {
  const { toolGroupExpansion, groupExpansionKey } = Expansion;
  toolGroupExpansion.set(groupExpansionKey('s9', 'g1'), true);
  const probe = paneProbe();
  await withDom(async ({ dom, container, root }) => {
    probe.failing.add('draft');
    act(() => root.render(h(Mount.SourceSessionErrorBoundary, { sessionId: null, mountKey: 'draft' }, h(probe.Pane, { sessionId: null }))));
    assert.ok(container.textContent.includes(MESSAGE));
    probe.failing.delete('draft');
    const button = buttonOf(container);
    act(() => reactProps(button).onClick(press(button)));
    assert.ok(mounted(container, 'draft'));
    assert.equal(toolGroupExpansion.get(groupExpansionKey('s9', 'g1')), true, 'no session forgotten');
    assert.deepEqual(dom.reloads, []);
  });
  toolGroupExpansion.forgetSession('s9');
});

test('zh-CN: the fallback message and Try again come from the local catalog', async () => {
  const previous = I18n.getLocale();
  I18n.setLocale('zh-CN');
  try {
    const probe = paneProbe();
    await withDom(async ({ container, root }) => {
      probe.failing.add('s1');
      act(() => root.render(h(Mount.SourceSessionErrorBoundary, { sessionId: 's1' }, h(probe.Pane, { sessionId: 's1' }))));
      assert.ok(container.textContent.includes('加载此会话时出错。'));
      assert.equal(buttonOf(container).textContent, '重试');
    });
  } finally { I18n.setLocale(previous); }
  const zh = (await import('../electron/i18n/zh-CN/session.mjs')).default;
  assert.equal(zh[MESSAGE], '加载此会话时出错。');
});

// ---------------------------------------------------------------- main.jsx, read as an AST
const mainSource = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
const mainAst = parseAst(mainSource, { lang: 'jsx' }, 'src/main.jsx');
const text = node => mainSource.slice(node.start, node.end);
function findAll(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
  if (typeof node.type === 'string' && predicate(node)) out.push(node);
  for (const key of Object.keys(node)) if (key !== 'parent') findAll(node[key], predicate, out);
  return out;
}
const jsxName = node => node?.type === 'JSXElement' ? node.openingElement.name.name : null;
const attr = (element, name) => element.openingElement.attributes.find(a => a.name?.name === name);

test('main.jsx: one boundary, at a fixed place inside the section "new" pane content, around the transcript and the composer', () => {
  const imports = mainAst.body.filter(n => n.type === 'ImportDeclaration' && n.source.value === './source-session-error-boundary.jsx');
  assert.deepEqual(imports.map(n => n.specifiers.map(s => s.imported.name)), [['SourceSessionErrorBoundary']]);
  const boundaries = findAll(mainAst, n => jsxName(n) === 'SourceSessionErrorBoundary');
  assert.equal(boundaries.length, 1, 'mounted once');
  const [boundary] = boundaries;
  // Never conditional: the same element for the draft and the session, so a draft that starts its session keeps its
  // composer mounted; the mount key is the transcript's own key.
  assert.equal(text(attr(boundary, 'sessionId').value.expression), 'current');
  assert.equal(text(attr(boundary, 'mountKey').value.expression), 'current ?? "draft"');
  assert.equal(text(attr(boundary, 'pane').value.expression), 'SESSION_POPOUT ? "popout" : side !== 0 ? "secondary" : undefined');
  const homes = findAll(mainAst, n => jsxName(n) === 'SourceSurfaceHome');
  assert.equal(homes.length, 1);
  const elements = homes[0].children.filter(c => c.type === 'JSXElement');
  assert.deepEqual(elements.map(jsxName), ['SourceSessionErrorBoundary'], 'the home column\'s only element child');
  const inside = name => findAll(boundary, n => jsxName(n) === name).length;
  for (const name of ['SourceFindBar', 'SourceTranscript', 'ProposalFeedEnd', 'SourceGoalStrip', 'SourceSessionNotices', 'SourceAutoResumeStatus'])
    assert.equal(inside(name), 1, name);
  assert.equal(findAll(boundary, n => n.type === 'CallExpression' && n.callee.name === 'renderMainComposer').length, 1, 'the composer is inside');
  assert.equal(text(attr(findAll(boundary, n => jsxName(n) === 'SourceTranscript')[0], 'key').value.expression), 'current ?? "draft"');
  // The row boundary stays nested inside (per-row crashes are still caught by rows first).
  assert.ok(findAll(boundary, n => jsxName(n) === 'SourceTranscriptRowBoundary').length >= 1);
});
