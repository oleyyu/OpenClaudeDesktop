// R4g-sidebar SB2 (research-ext/X7-partial-gaps.md X7-03; research/sidebar-sections.md WI-6): the Code sidebar's
// sections and folder buckets reorder by drag with the original 2.42304.0 pieces -- shared-19 S$ / b$ around them,
// the lazily loaded c1afd40ea ProjectReorderBindings over the c09f6b4e5 dnd-kit copy, shared-19 x$ / f$ on each
// section -- and a drop commits through the sidebar's existing persistence paths (the store's moveSection, bridged to
// main's sidebar-state `section-move`; a folder bucket's order move, saved as projectOrder through "project-order").
// Nothing opens a window: generator checks, SSR, and a real react-dom render into a small fake DOM driven by
// controlled pointer / keyboard events (the gesture's pointerdown through the React handler x$ / f$ give the heading,
// then pointermove / pointerup on the document, as the browser would deliver them to dnd-kit's PointerSensor).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as Layout from '../src/sidebar-sections-layout.mjs';
import * as Store from '../electron/sidebar-sections-store.mjs';
import { OTHER_PROJECT_KEY, withSectionOrder } from '../src/sidebar-model.js';
import { extractSidebarReorder } from '../scripts/extract-sidebar-reorder.mjs';

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/sidebar-reorder');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const raw = (file) => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;

// D21: view-tabs' preload-helper calls document.createElement while it evaluates; sidebar-resize reads documentElement.
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = (file) => server.ssrLoadModule(file);
  M.sections = await load('/src/source-sidebar-sections.jsx');
  M.adapters = await load('/src/source-sidebar-sections-adapters.jsx');
  M.reorderAdapters = await load('/src/source-sidebar-reorder-adapters.jsx');
  M.reorder = await load('/src/generated/sidebar-reorder/section-reorder.mjs');
  M.bindings = await load('/src/generated/sidebar-reorder/project-reorder-bindings.mjs');
  M.support = await load('/src/generated/sidebar-reorder/reorder-support.mjs');
  M.sortable = await load('/src/generated/sidebar-sections/section-sortable.mjs');
  M.gate = await load('/src/generated/sidebar-sections/group-reorder.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

// ---------------------------------------------------------------- a small fake DOM (as tests/session-load-error)
// Enough for react-dom, dnd-kit's PointerSensor / measuring and qs's cursor chrome: elements with attributes, styles,
// children and listeners; getBoundingClientRect lays every `data-group-key` section out as a 32px row, 40px apart, in
// document order (an element measures as the first section inside it, else the section it is in).
function createDom() {
  class Events {
    addEventListener(type, fn, options) { const capture = options === true || !!options?.capture; (this.__l ??= []).push({ type, fn, capture }); }
    removeEventListener(type, fn, options) { const capture = options === true || !!options?.capture; this.__l = (this.__l ?? []).filter((l) => !(l.type === type && l.fn === fn && l.capture === capture)); }
    dispatchEvent(event) { for (const l of [...(this.__l ?? [])]) if (l.type === event.type) l.fn.call(this, event); return !event.defaultPrevented; }
  }
  class Node extends Events {}
  class Document extends Node {}
  const document = new Document();
  Object.assign(document, { nodeType: 9, nodeName: '#document', activeElement: null, scrollingElement: null });
  class Element extends Node {
    constructor(tag) {
      super();
      const style = { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; }, getPropertyValue(name) { return this[name] ?? ''; } };
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), style });
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get children() { return this.childNodes.filter((node) => node.nodeType === 1); }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map((node) => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    get id() { return this.getAttribute('id') ?? ''; }
    set id(value) { this.setAttribute('id', value); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    remove() { this.parentNode?.removeChild(this); }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    closest(selector) { const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1]; for (let at = this; at?.nodeType === 1; at = at.parentNode) if (attr ? at.hasAttribute(attr) : at.localName === selector) return at; return null; }
    matches() { return false; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return rectOf(this); }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = null; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
    findAll(predicate, out = []) {
      if (predicate(this)) out.push(this);
      for (const child of this.childNodes) if (child.nodeType === 1) child.findAll(predicate, out);
      return out;
    }
  }
  class HTMLElement extends Element {}
  class SVGElement extends Element {}
  class HTMLInputElement extends HTMLElement {}
  const sections = () => document.documentElement.findAll((el) => el.hasAttribute('data-group-key'));
  const ROW = (index) => ({ top: index * 40, bottom: index * 40 + 32, left: 0, right: 240, width: 240, height: 32, x: 0, y: index * 40 });
  const ZERO = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0 };
  function rectOf(el) {
    const own = el.find((node) => node.hasAttribute('data-group-key'));
    let section = own;
    for (let at = el; !section && at?.nodeType === 1; at = at.parentNode) if (at.hasAttribute('data-group-key')) section = at;
    if (!section) return ZERO;
    return ROW(sections().indexOf(section));
  }
  Object.assign(document, {
    createElement: (tag) => new HTMLElement(tag),
    createElementNS: (ns, tag) => Object.assign(new SVGElement(tag), { namespaceURI: ns }),
    createTextNode: (text) => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    getSelection: () => ({ removeAllRanges() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
  });
  document.documentElement = new HTMLElement('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new HTMLElement('body'));
  class Window extends Events {}
  const window = new Window();
  const timers = [];
  // No-op observers: the fade label (code-current iD) and dnd-kit's measuring observe sizes that never change here.
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  Object.assign(window, { document, Node, Element, HTMLElement, HTMLInputElement, SVGElement, Document, HTMLIFrameElement: class {}, EventTarget: Events, ResizeObserver: Observer, MutationObserver: Observer,
    innerWidth: 1024, innerHeight: 768, scrollX: 0, scrollY: 0, devicePixelRatio: 1, navigator: { userAgent: 'node' },
    location: { pathname: '/' },
    getComputedStyle: () => ({ transform: 'none', transformOrigin: '0 0', overflow: 'visible', overflowX: 'visible', overflowY: 'visible', position: 'static', direction: 'ltr', lineHeight: '20px', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (fn) => { timers.push(fn); return timers.length; }, cancelAnimationFrame() {},
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms), clearTimeout: (id) => globalThis.clearTimeout(id),
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms), clearInterval: (id) => globalThis.clearInterval(id) });
  window.window = window;
  document.defaultView = window;
  return { window, document, Node, Element, HTMLElement, HTMLInputElement };
}
async function withDom(run) {
  const dom = createDom();
  const names = ['window', 'document', 'Node', 'HTMLElement', 'HTMLInputElement', 'Element', 'navigator'];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['Node', dom.Node], ['HTMLElement', dom.HTMLElement], ['HTMLInputElement', dom.HTMLInputElement], ['Element', dom.Element], ['navigator', dom.window.navigator]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.HTMLElement('div'));
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
const reactProps = (element) => element[Object.keys(element).find((key) => key.startsWith('__reactProps$'))];
// The heading's gesture target: f$'s presentation wrapper (it carries the dnd-kit listeners and the keyboard move).
const gateOf = (section) => {
  for (let at = section.find((el) => el.hasAttribute('data-group-toggle')); at; at = at.parentNode) if (at.getAttribute?.('role') === 'presentation') return at;
  return null;
};
const sectionEl = (dom, key) => dom.document.documentElement.find((el) => el.getAttribute('data-group-key') === key);
const pointer = (type, target, x, y, extra = {}) => Object.assign({ type, target, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
  defaultPrevented: false, cancelable: true, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} }, extra);
// pointerdown through the React handler (f$ → dnd-kit's activator), then the document gets the moves and the release.
async function drag(dom, from, to, during) {
  const source = gateOf(from);
  const [fromRect, toRect] = [from.getBoundingClientRect(), to.getBoundingClientRect()];
  const x = 40, y0 = fromRect.top + 16, y1 = toRect.top + 16;
  const down = pointer('pointerdown', source.find((el) => el.hasAttribute('data-group-toggle')), x, y0);
  await act(async () => { reactProps(source).onPointerDown({ nativeEvent: down, target: down.target, currentTarget: source, button: 0, isPrimary: true, preventDefault() {}, stopPropagation() {} }); });
  await act(async () => { dom.document.dispatchEvent(pointer('pointermove', down.target, x, y0 + 4)); });
  await act(async () => { dom.document.dispatchEvent(pointer('pointermove', down.target, x, y0 + 12)); });
  await act(async () => { dom.document.dispatchEvent(pointer('pointermove', down.target, x, y1)); });
  await during?.();
  await act(async () => { dom.document.dispatchEvent(pointer('pointerup', down.target, x, y1)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
}

// ---------------------------------------------------------------- fixtures
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/w/alpha', createdAt: now, updatedAt: now, ...fields });
const groups = [{ id: 'g1', name: 'Research' }, { id: 'g2', name: 'Docs' }, { id: 'g3', name: 'Ops' }];
// Legacy data (before the sections record): custom groups ordered by projectOrder's `ccg::` keys, beside folder keys.
const legacyConfig = () => ({
  customGroups: groups.map((group) => ({ ...group })),
  sessionMetadata: { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g2' }, s3: { customGroupId: 'g3' } },
  sidebarPreferences: {},
  projectOrder: ['ccg::g3', 'ccg::g1', 'ccg::g2', '/w/gone', '/w/beta'],
  threadIds: ['s1', 's2', 's3', 'a1', 'b1', 'o1'], archivedThreadIds: [],
});
const sessions = [thread('s1'), thread('s2'), thread('s3'), thread('a1'), thread('b1', { cwd: '/w/beta' }), thread('o1', { cwd: '' })];
function listProps(config, { saved, single = false } = {}) {
  const sections = Store.sidebarSectionsFor(config).filter((section) => !single || section.kind !== 'manual' || section.id === 'g1');
  const model = Layout.buildSidebarSections({ sections, sessions, preferences: {}, metadata: config.sessionMetadata, customGroups: config.customGroups, projectOrder: config.projectOrder, knownFolders: [] });
  const folders = model.layout.at(-1).buckets.filter((bucket) => bucket.projectKey && bucket.projectKey !== OTHER_PROJECT_KEY).map((bucket) => bucket.projectKey);
  const host = { renderRows: () => null, shiftStyle: () => undefined, toggle() {}, folded: new Set(), drag: null, dropTargets: true, headerControls: null, trailing: () => null,
    folderMenu: (group) => Layout.folderBucketMenu(group, { order: folders, projectOrder: config.projectOrder, save: (ids) => saved?.push(ids) }) };
  return { sections, model, host, folders };
}

// ---------------------------------------------------------------- generator
test('generator: the check passes; the dnd chunks are byte copies, the slices original 2.42304.0 bindings', async () => {
  await extractSidebarReorder({ check: true });
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.deepEqual(manifest.modules.map((m) => [m.target, m.source, m.kind]), [
    ['dnd-kit.mjs', 'c09f6b4e5-DErbwtLQ.js', 'copy'], ['layer-base.mjs', 'shared-frame-BfjMqbuN.js', 'slice'],
    ['reorder-support.mjs', 'shared-19-CkPOiIKm.js', 'slice'], ['drag-gesture.mjs', 'shared-11-BuQ3CK5I.js', 'slice'],
    ['project-reorder-bindings.mjs', 'c1afd40ea-iYz9kai5.js', 'copy'], ['section-reorder.mjs', 'shared-19-CkPOiIKm.js', 'slice']]);
  for (const entry of manifest.modules) assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
  // Copies: everything after the chunk's leading import statements is the generated module's body, byte for byte.
  for (const entry of manifest.modules.filter((m) => m.kind === 'copy')) {
    const original = raw(entry.source), body = original.replace(/^(import\{[^}]*\}from"\.\/[^"]+";)+/, '');
    assert.ok(body.length < original.length && body.length === entry.bodyBytes, entry.source);
    const generated = fs.readFileSync(path.join(directory, entry.target), 'utf8');
    assert.ok(generated.endsWith(`\n${body}\n`), `${entry.target} keeps ${entry.source}'s bytes`);
    assert.equal(sha(Buffer.from(body)), entry.bodySha256);
    assert.ok(entry.imports.every((i) => ['react', 'react-dom', 'react/jsx-runtime'].includes(i.from) || i.kind === 'generated'), `${entry.target} imports React or generated modules only`);
  }
  assert.equal(raw('c09f6b4e5-DErbwtLQ.js').length, 47657);
  // dnd-kit's own React imports: vendor-frame aliases checked against `local=<ns>.<member>`.
  assert.deepEqual(manifest.modules[0].imports.map((i) => `${i.via}=${i.from}:${i.name}`).sort(), [
    '$a=react:cloneElement', 'Co=react:useState', 'Sa=react-dom:createPortal', 'So=react:useRef', 'Ta=react-dom:unstable_batchedUpdates', 'bo=react:useMemo',
    'do=react:useContext', 'eo=react:createContext', 'mo=react:useEffect', 'oo=react:memo', 'ro=react:forwardRef', 'so=react:default', 'uo=react:useCallback',
    'xo=react:useReducer', 'yo=react:useLayoutEffect'].map((s) => `vendor-frame-DfPJ1QmD.js:${s}`).sort());
  // c1afd40ea: shared-19 Gi / Ki and shared-11 Xa resolve to the slices, c09f6b4e5 to the copy.
  const bindings = manifest.modules.find((m) => m.target === 'project-reorder-bindings.mjs');
  assert.deepEqual(bindings.imports.filter((i) => i.kind === 'generated' && i.from !== './dnd-kit.mjs').map((i) => [i.via, i.from, i.name, i.original]), [
    ['shared-19-CkPOiIKm.js:Gi', './reorder-support.mjs', 'suppressClickAfterDrag', 'shared-19-CkPOiIKm.js:u$'],
    ['shared-19-CkPOiIKm.js:Ki', './reorder-support.mjs', 'dragOverlayZIndex', 'shared-19-CkPOiIKm.js:JQ'],
    ['shared-11-BuQ3CK5I.js:Xa', './drag-gesture.mjs', 'beginDragGesture', 'shared-11-BuQ3CK5I.js:qs']]);
  assert.equal(bindings.imports.filter((i) => i.from === './dnd-kit.mjs').length, 11);
  // S$ / b$: the drag bridge is x$'s own (sidebar-sections section-sortable.mjs), the lazy loader a host adapter.
  const reorder = manifest.modules.find((m) => m.target === 'section-reorder.mjs');
  assert.deepEqual(reorder.bindings.map((b) => b.name), ['b$', 'S$']);
  assert.deepEqual(reorder.imports.filter((i) => i.kind === 'external').map((i) => [i.local, i.from, i.name]), [
    ['_$', '../sidebar-sections/section-sortable.mjs', 'SectionDragBridge'], ['v$', '../sidebar-sections/section-sortable.mjs', 'SectionDragBridgeContext']]);
  assert.deepEqual(reorder.imports.filter((i) => i.kind === 'adapter').map((i) => [i.local, i.name, i.original]).sort(), [
    ['K', 'defineLazyChunk', 'shared-104-Cqo2-vQh.js:Fo'], ['Ti', 'useLazyChunkStatus', 'shared-156-Bikz018e.js:dB'],
    ['Uu', 'noFallback', 'shared-104-Cqo2-vQh.js:ko'], ['f', 'preloadChunk', 'preload-helper-D0dM6GpB.js:s']]);
  // b$'s only rewrite: its load imports the generated copy and drops vite's asset map.
  assert.deepEqual(reorder.rewrites, [{ binding: 'b$', original: 'f(() => import("./c1afd40ea-iYz9kai5.js"), __vite__mapDeps([0, 1]))', replacement: 'f(() => import("./project-reorder-bindings.mjs"))' }]);
  const text = fs.readFileSync(path.join(directory, 'section-reorder.mjs'), 'utf8');
  assert.equal(occurrences(text, 'import("./project-reorder-bindings.mjs")'), 1);
  assert.equal(occurrences(text, '__vite__'), 0);
  // The installed chunks still say what the generated modules rely on (each exactly once).
  const s19 = raw('shared-19-CkPOiIKm.js'), s22 = raw('shared-22-HztmyUTM.js'), dnd = raw('c1afd40ea-iYz9kai5.js');
  for (const [chunk, needle] of [[s19, 'id:"sidebar_project_reorder_dnd"'], [s19, 'pick:e=>e.ProjectReorderBindings'], [s19, 'S$ as Fi'], [s19, 'x$ as Li'],
    [s19, 'u$ as Gi'], [s19, 'JQ as Ki'], [s19, ',JQ=Mf+1;'], [s22, 'Fi as Qt'], [s22, 'Li as pn'],
    [s22, 'c(Qt,{sortableBucketKeys:v,labelByBucketKey:y,onCommitDrag:b,children:['],
    [s22, 'c(Qt,{sortableBucketKeys:X.bucketKeys,labelByBucketKey:X.labelByBucketKey,positionByBucketKey:X.orderKeyByBucketKey,onCommitDrag:de,children:['],
    [s22, 'b=C((e,t)=>{let n=_.find(t=>rO(t.id)===e),r=_.find(e=>rO(e.id)===t);n&&r&&n!==r&&(d(n.id,r.order),Id({action:"reorder",section_kind:n.kind,source:"drag"}))},[_,d])'],
    [s22, 'de=C((e,t)=>{let n=X.orderKeyByBucketKey.get(e),r=X.orderKeyByBucketKey.get(t),i=n===void 0||r===void 0?null:En(X.orderKeys,n,r);i!==null&&le(i,"drag")},[X,le])'],
    [dnd, 'w={activationConstraint:{distance:8}}'], [dnd, 'export{E as ProjectReorderBindings}']])
    assert.equal(occurrences(chunk, needle), 1, needle);
});

test('adapters: the lazy chunk is pending until loaded, resident afterwards, nothing while disabled; a failed load renders nothing (fail-open)', async () => {
  const { defineLazyChunk, useLazyChunkStatus, noFallback, preloadChunk } = M.reorderAdapters;
  assert.deepEqual(noFallback('no-ui'), { noFallback: true, reason: 'no-ui' });
  assert.equal(await preloadChunk(() => Promise.resolve(7)), 7);
  const ok = defineLazyChunk({ entry: { id: 'ok', load: () => Promise.resolve({ Thing: ({ label }) => h('b', null, label) }) }, pick: (m) => m.Thing, options: { onChunkError: 'fail-open' } });
  const Probe = ({ chunk, enabled }) => h('i', null, useLazyChunkStatus(chunk.handle, enabled, { reportWait: false }));
  assert.equal(renderToStaticMarkup(h(Probe, { chunk: ok, enabled: true })), '<i>pending</i>');
  assert.equal(renderToStaticMarkup(h(ok.Component, { label: 'x' })), '');
  assert.equal(ok.handle.state, 'idle', 'SSR does not start the load');
  await ok.handle.load();
  assert.equal(renderToStaticMarkup(h(Probe, { chunk: ok, enabled: true })), '<i>resident</i>');
  assert.equal(renderToStaticMarkup(h(Probe, { chunk: ok, enabled: false })), '<i>pending</i>');
  assert.equal(renderToStaticMarkup(h(ok.Component, { label: 'x' })), '<b>x</b>');
  const bad = defineLazyChunk({ entry: { id: 'bad', load: () => Promise.reject(Error('gone')) }, pick: (m) => m.Thing, options: { onChunkError: 'fail-open' } });
  assert.equal(await bad.handle.load(), null);
  assert.equal(renderToStaticMarkup(h(Probe, { chunk: bad, enabled: true })), '<i>failed</i>');
  assert.equal(renderToStaticMarkup(h(bad.Component, {})), '');
  // b$ itself: the generated chunk handle loads the generated copy of c1afd40ea.
  const module = await M.reorder.projectReorderChunk.handle.load();
  assert.equal(module.ProjectReorderBindings, M.bindings.ProjectReorderBindings);
});

test('S$ mounts the bindings only for two or more positions (positionByBucketKey groups buckets); SSR has no drag DOM', async () => {
  await M.reorder.projectReorderChunk.handle.load();
  const seen = [];
  const Child = () => { seen.push(React.useContext(M.sortable.SectionDragBridgeContext)); return null; };
  const html = (props) => renderToStaticMarkup(h(M.reorder.SectionReorder, { labelByBucketKey: new Map(), onCommitDrag() {}, ...props }, h(Child)));
  html({ sortableBucketKeys: ['a', 'b'] });
  assert.ok(seen.at(-1) instanceof M.sortable.SectionDragBridge, 'x$ below S$ reads its _$ bridge');
  // Ti's enabled flag: more than one distinct position. Mounted, each sortable publishes its drag state into the bridge
  // x$ reads (listeners for f$); two buckets at one position (positionByBucketKey) mount nothing.
  const states = async (props) => withDom(async ({ root }) => {
    let bridge = null;
    const Grab = () => { bridge = React.useContext(M.sortable.SectionDragBridgeContext); return null; };
    const item = (key) => h(M.sortable.SectionSortable, { key, bucketKey: key, sectionIndex: 0, sectionCount: 2, onMoveSection() {} },
      h('div', { 'data-group-key': key }, h(M.gate.SectionReorderGate, { menu: false }, h('button', { 'data-group-toggle': '' }))));
    await act(async () => { root.render(h(M.reorder.SectionReorder, { labelByBucketKey: new Map(), onCommitDrag() {}, ...props }, h(Grab), item('a'), item('b'))); });
    return ['a', 'b'].map((key) => typeof bridge.drag(key)?.listeners?.onPointerDown);
  });
  assert.deepEqual(await states({ sortableBucketKeys: ['a', 'b'] }), ['function', 'function']);
  assert.deepEqual(await states({ sortableBucketKeys: ['a', 'b'], positionByBucketKey: new Map([['a', 'p'], ['b', 'p']]) }), ['undefined', 'undefined']);
  assert.deepEqual(await states({ sortableBucketKeys: ['a'] }), ['undefined', 'undefined']);
  assert.equal(html({ sortableBucketKeys: ['a', 'b'] }), '', 'the dnd-kit sortables render no markup');
});

test('controlled pointer drag: a manual section dropped on another moves to its order (iO b → moveSection → main section-move), legacy ccg:: order kept', async () => {
  const config = legacyConfig();
  const saved = [], actions = [];
  const { sections, model, host } = listProps(config, { saved });
  // Legacy data: the section order is seeded from projectOrder's ccg:: keys (D10, kp/Bp), folder keys stay as they are.
  assert.deepEqual(sections.filter((s) => s.kind === 'manual').map((s) => s.id), ['g3', 'g1', 'g2']);
  const store = M.adapters.useSidebarSectionsStore;
  store.setState(Store.sidebarSectionsStoreSlice({ customGroups: config.customGroups, sessionMetadata: config.sessionMetadata, sidebarSections: sections }));
  const disconnect = M.adapters.connectSidebarSectionActions((action, payload) => { actions.push([action, payload]); });
  await M.reorder.projectReorderChunk.handle.load();
  try {
    await withDom(async ({ dom, root, logged }) => {
      await act(async () => { root.render(h(M.sections.SidebarSectionsList, { model, host })); });
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
      const [g3, g1, g2] = ['custom-g3', 'custom-g1', 'custom-g2'].map((key) => sectionEl(dom, key));
      assert.ok(g3 && g1 && g2, 'the manual sections render');
      assert.ok(gateOf(g1), 'f$ wraps the heading');
      assert.equal(typeof reactProps(gateOf(g1)).onPointerDown, 'function');
      // Drag g3 (first) onto g2 (third): iO b → moveSection(g3, g2.order).
      await drag(dom, g3, g2, () => {
        // While it is held: C, the drag ghost (DragOverlay at JQ = Bd + 1) with the section name; x$ dims the section
        // (u.isDragging → opacity-40); qs shows the grabbing cursor chrome over the window.
        const ghost = dom.document.body.find((el) => /shadow-\[var\(--df-shadow-float\)\]/.test(el.getAttribute('class') ?? ''));
        assert.ok(ghost, 'the drag ghost renders');
        assert.equal(ghost.textContent, 'Ops');
        assert.equal(M.support.dragOverlayZIndex, 9001);
        let wrapper = g3; while (wrapper && wrapper.getAttribute?.('class') !== 'opacity-40') wrapper = wrapper.parentNode;
        assert.ok(wrapper, 'x$ dims the dragged section');
        assert.equal(sectionEl(dom, 'custom-g1').find((el) => el.getAttribute('class') === 'opacity-40') ?? null, null);
        const chrome = dom.document.body.find((el) => el.hasAttribute('data-drag-chrome'));
        assert.equal(chrome?.style.cursor, 'grabbing');
      });
      assert.deepEqual(actions, [['move', { id: 'g3', index: sections.find((s) => s.id === 'g2').order }]]);
      assert.deepEqual(saved, [], 'a section drop is not a folder order save');
      // A drop leaves no cursor chrome behind (qs → Bs, removed on end) and swallows the click it would make (u$).
      assert.equal(dom.document.body.find((el) => el.hasAttribute('data-drag-chrome')), null);
      let clicked = 0;
      const click = { type: 'click', defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      dom.window.dispatchEvent(click);
      assert.equal(click.defaultPrevented, true, 'u$: the click after the drop is swallowed once');
      const next = { ...click, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; clicked++; } };
      dom.window.dispatchEvent(next);
      assert.equal(next.defaultPrevented, false);
      assert.equal(clicked, 0);
      // A press that moves less than 8px is not a drag (activationConstraint distance 8).
      const before = actions.length;
      const source = gateOf(g1), toggle = source.find((el) => el.hasAttribute('data-group-toggle'));
      const down = pointer('pointerdown', toggle, 40, 56);
      await act(async () => { reactProps(source).onPointerDown({ nativeEvent: down, target: toggle, currentTarget: source, button: 0, preventDefault() {}, stopPropagation() {} }); });
      await act(async () => { dom.document.dispatchEvent(pointer('pointermove', toggle, 40, 61)); });
      await act(async () => { dom.document.dispatchEvent(pointer('pointerup', toggle, 40, 61)); });
      assert.equal(actions.length, before);
      assert.deepEqual(logged.filter((args) => !String(args[0]).includes('act(')), []);
    });
    // The persistence path: the bridged action becomes main's sidebar-state request and moves the record.
    const [action, payload] = actions[0];
    const request = Store.sidebarSectionRequest(action, payload);
    assert.equal(request.operation, 'section-move');
    Store.applySidebarSectionOperation(config, request, { knownSessionIds: () => new Set(config.threadIds), mirror() {}, codexSections: {} });
    assert.deepEqual(Store.sidebarSectionsFor(config).filter((s) => s.kind === 'manual').map((s) => s.id), ['g1', 'g2', 'g3']);
    assert.deepEqual(config.projectOrder, ['ccg::g3', 'ccg::g1', 'ccg::g2', '/w/gone', '/w/beta'], 'the legacy projectOrder stays as it was (D10)');
  } finally { disconnect(); store.setState(Store.sidebarSectionsStoreSlice({})); }
});

test('controlled pointer drag: a folder bucket dropped on another saves the moved order as projectOrder, keeping ccg:: and stale keys (nT de)', async () => {
  const config = legacyConfig();
  const saved = [];
  const { model, host, folders } = listProps(config, { saved });
  const buckets = model.layout.at(-1).buckets.map((bucket) => bucket.key);
  assert.deepEqual(buckets, ['project:/w/beta', 'project:/w/alpha', `project:${OTHER_PROJECT_KEY}`], 'the stored order ranks beta first');
  assert.deepEqual(folders, ['/w/beta', '/w/alpha']);
  await M.reorder.projectReorderChunk.handle.load();
  await withDom(async ({ dom, root }) => {
    await act(async () => { root.render(h(M.sections.SidebarSectionsList, { model, host })); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const [beta, alpha, other] = buckets.map((key) => sectionEl(dom, key));
    assert.ok(gateOf(beta) && gateOf(alpha), 'folder buckets with an order slot are draggable');
    // Other has no order slot: no x$, so f$ gives its heading no drag listeners.
    assert.equal(gateOf(other), null);
    await drag(dom, alpha, beta);
    const expected = withSectionOrder(config.projectOrder, ['/w/alpha', '/w/beta']);
    assert.deepEqual(saved, [expected]);
    assert.deepEqual(expected, ['ccg::g3', 'ccg::g1', 'ccg::g2', '/w/alpha', '/w/beta', '/w/gone']);
    // Dropping a folder bucket on a manual section is no move: they are in different S$ (nT's and iO's).
    saved.length = 0;
    await drag(dom, alpha, sectionEl(dom, 'custom-g1'));
    assert.ok(saved.length <= 1 && saved.every((ids) => ids.join() === expected.join()), 'the over target is always a folder slot (closestCenter among nT\'s sortables), never the section');
  });
});

test('controlled keyboard: Alt+Shift+Arrow on a section heading moves it (x$ keyboardReorder → the same moveSection); folder buckets have none', async () => {
  const config = legacyConfig();
  const actions = [];
  const { sections, model, host } = listProps(config);
  const store = M.adapters.useSidebarSectionsStore;
  store.setState(Store.sidebarSectionsStoreSlice({ customGroups: config.customGroups, sessionMetadata: config.sessionMetadata, sidebarSections: sections }));
  const disconnect = M.adapters.connectSidebarSectionActions((action, payload) => { actions.push([action, payload]); });
  try {
    await withDom(async ({ dom, root }) => {
      await act(async () => { root.render(h(M.sections.SidebarSectionsList, { model, host })); });
      const g1 = sectionEl(dom, 'custom-g1'), gate = gateOf(g1);
      const key = (fields) => ({ altKey: true, shiftKey: true, metaKey: false, ctrlKey: false, target: gate, currentTarget: gate, defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...fields });
      const down = key({ key: 'ArrowDown' });
      await act(async () => { reactProps(gate).onKeyDown(down); });
      assert.equal(down.defaultPrevented, true);
      assert.deepEqual(actions.at(-1), ['move', { id: 'g1', index: sections.find((s) => s.id === 'g2').order }]);
      await act(async () => { reactProps(gate).onKeyDown(key({ key: 'ArrowUp' })); });
      assert.deepEqual(actions.at(-1), ['move', { id: 'g1', index: sections.find((s) => s.id === 'g3').order }]);
      // Without both modifiers nothing moves.
      const count = actions.length;
      await act(async () => { reactProps(gate).onKeyDown(key({ key: 'ArrowDown', shiftKey: false })); });
      assert.equal(actions.length, count);
      const alpha = gateOf(sectionEl(dom, 'project:/w/alpha'));
      assert.equal(reactProps(alpha).onKeyDown, undefined, 'sT gives folder buckets no keyboard reorder');
    });
  } finally { disconnect(); store.setState(Store.sidebarSectionsStoreSlice({})); }
});

test('one manual section: iO\'s S$ stays a plain bridge (no bindings); the folder buckets still get their own', async () => {
  const config = legacyConfig();
  const { model, host } = listProps(config, { single: true });
  assert.deepEqual(model.layout.filter((e) => e.kind === 'manual').map((e) => e.section.id), ['g1']);
  await withDom(async ({ dom, root }) => {
    await act(async () => { root.render(h(M.sections.SidebarSectionsList, { model, host })); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const gate = gateOf(sectionEl(dom, 'custom-g1'));
    assert.equal(typeof reactProps(gate).onPointerDown, 'function', 'f$ always takes the press');
    // f$ forwards to the dnd-kit listeners only when S$ mounted them: a lone section has nothing to drag.
    const down = pointer('pointerdown', gate, 40, 16);
    reactProps(gate).onPointerDown({ nativeEvent: down, target: gate, currentTarget: gate, preventDefault() {}, stopPropagation() {} });
    assert.equal(dom.document.__l?.some((l) => l.type === 'pointermove') ?? false, false, 'no sensor attached');
    assert.ok(gateOf(sectionEl(dom, 'project:/w/alpha')));
  });
});
