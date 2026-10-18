// cov8-01 (research/sidebar-sections.md WI-7): the sidebar width handle is the original 2.42304.0 shared-21 DF over
// shared-15 Jt, extracted by scripts/extract-sidebar-resize.mjs. Nothing here opens a window: the generator contract,
// SSR markup, and the official drag/keyboard/release logic under a controlled fake DOM, clock and event sequence (React
// handlers are invoked with synthetic-shaped events; document/window listeners receive dispatched plain events).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSidebarResize, sliceOriginalModules } from '../scripts/extract-sidebar-resize.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/sidebar-resize');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const sha = text => createHash('sha256').update(text).digest('hex');
let server, Handle, Resize, Adapters, Sidebar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Handle = await server.ssrLoadModule('/src/generated/sidebar-resize/sidebar-resize-handle.mjs');
  Resize = await server.ssrLoadModule('/src/generated/sidebar-resize/resize-handle.mjs');
  Adapters = await server.ssrLoadModule('/src/source-sidebar-resize-adapters.jsx');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
});
after(() => server?.close());

// The handle's root className: Jt `gt("cds-reset …", "w-3 cursor-col-resize", ["absolute", Gt[side]], className)`.
const handleClass = side => `cds-reset group/resize outline-none focus-visible:outline-hidden w-3 cursor-col-resize absolute ${Resize.resizeHandleSideClasses[side]} dframe-resize-handle`;

// ---------------------------------------------------------------- generator contract
test('generator output matches the pinned 2.42304.0 sources (check mode) and resolves only to React, itself or the adapter', async () => {
  const manifest = await extractSidebarResize({ check: true });
  assert.equal(manifest.referenceVersion, '2.42304.0');
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  for (const module of manifest.modules) {
    assert.equal(module.sourceSha256, sha(await fs.readFile(path.join(reference, module.source))), module.source);
    assert.equal(module.sha256, sha(await fs.readFile(path.join(generated, module.target), 'utf8')), module.target);
    for (const entry of module.imports) {
      assert.ok(['react', 'generated', 'adapter'].includes(entry.kind), `${module.target}:${entry.local}`);
      if (entry.kind === 'adapter') assert.equal(typeof Adapters[entry.name], 'function', `adapter export ${entry.name}`);
    }
  }
  assert.equal(byTarget['sidebar-resize-handle.mjs'].source, 'shared-21-IP-SVetq.js');
  assert.deepEqual(byTarget['sidebar-resize-handle.mjs'].bindings.map(b => b.name), ['_k', 'vk', 'yk', 'Tk', 'Ek', 'TF', 'EF', 'DF']);
  assert.deepEqual(byTarget['resize-handle.mjs'].bindings.map(b => b.name), ['Ht', 'Ut', 'Wt', 'Gt', 'Kt', 'qt', 'Jt']);
  assert.deepEqual(byTarget['sidebar-width.mjs'].bindings.map(b => b.name), ['Yu', 'Xu', '$u', 'Vp', 'Rm', 'Bm', 'rh', 'uh', 'fh']);
  assert.deepEqual(byTarget['escape-cancel.mjs'].bindings.map(b => b.name), ['XL']);
  const adapterImports = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via}=${i.name}`)).sort();
  assert.deepEqual(adapterImports, [
    'shared-52-DGviI8xb.js:G=useSidebarFrameStore', 'shared-52-DGviI8xb.js:If=useSidebarFrameStore',
    'shared-8-B5lJ8U5C.js:Wl=useHideSidebarIntent', 'shared-8-B5lJ8U5C.js:iu=sidebarCanHide', 'shared-8-B5lJ8U5C.js:xl=reportSidebarStateSet',
    'shared-frame-BfjMqbuN.js:Oc=SidebarResizeTooltip', 'shared-frame-BfjMqbuN.js:Uu=useCdsFeature', 'shared-frame-BfjMqbuN.js:xd=cdsClassNames',
    'vendor-frame-DfPJ1QmD.js:Wn=useDirection', 'vendor-intl-Db7hDWRO.js:p=useIntl',
  ]);
  // The release states, verbatim.
  const text = await fs.readFile(path.join(generated, 'sidebar-resize-handle.mjs'), 'utf8');
  for (const feature of ['release: "held"', '(u.release = "awaited")', '(u.release = "lost")', 'n.release === "lost" || (t && n.release === "awaited")', '}, 200)'])
    assert.ok(text.includes(feature), feature);
  // D0/R1: no view-tabs import anywhere in this lane, and no second React context.
  for (const file of [...(await fs.readdir(generated)).map(f => path.join(generated, f)), path.join(app, 'src/source-sidebar-resize-adapters.jsx')]) {
    const source = await fs.readFile(file, 'utf8');
    assert.doesNotMatch(source, /(?:from|import)\s*\(?\s*['"][^'"]*view-tabs/, file);
    assert.doesNotMatch(source, /createContext\(/, file);
  }
  assert.equal(await fs.readFile(path.join(app, 'scripts/verify-gen-sidebar-resize.mjs'), 'utf8'),
    "import { extractSidebarResize } from './extract-sidebar-resize.mjs';\nawait extractSidebarResize({ check: true });\n");
});

test('cdsClassNames is the identity tailwind-merge would be on the handle: checked against the original merge', async () => {
  // Slice the original shared-frame X (tailwind-merge over clsx, with its vendor-frame closure) from the reference and run it.
  const vendor = await fs.readFile(path.join(reference, 'vendor-frame-DfPJ1QmD.js'), 'utf8');
  const local = Object.fromEntries(vendor.match(/export\{([^}]*)\}/)[1].split(',').map(s => s.split(' as ').reverse()));
  const { files } = await sliceOriginalModules({ modules: [
    { target: 'merge-vendor.mjs', source: 'vendor-frame-DfPJ1QmD.js', exports: { [local.La]: 'La', [local.Ra]: 'Ra', [local.za]: 'za' } },
    { target: 'merge.mjs', source: 'shared-frame-BfjMqbuN.js', exports: { X: 'cn' }, features: { X: ['Gt(Y(e))'] } },
  ] });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sidebar-resize-merge-'));
  try {
    for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(dir, name), text);
    const { cn } = await import(path.join(dir, 'merge.mjs'));
    assert.equal(cn('px-2', 'px-4'), 'px-4', 'the sliced original really merges');
    for (const side of ['inline-start', 'inline-end']) {
      const args = ['cds-reset group/resize outline-none focus-visible:outline-hidden', 'w-3 cursor-col-resize', ['absolute', Resize.resizeHandleSideClasses[side]], 'dframe-resize-handle'];
      assert.equal(Adapters.cdsClassNames(...args), cn(...args));
      assert.equal(Adapters.cdsClassNames(...args), handleClass(side));
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- SSR
const resting = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current transition-[opacity,color,background-color] h-full max-h-12 w-[3px] group-focus-visible/resize:max-h-none text-muted opacity-[var(--cds-resize-pill-force,0)] delay-200 duration-base group-hover/resize:opacity-100 group-focus-visible/resize:bg-fill-accent group-focus-visible/resize:opacity-100 group-focus-visible/resize:delay-0';
test('SSR: the original markup, aria values from the store and the floor, and the pill (no CDS panels feature here)', () => {
  Adapters.useSidebarFrameStore.setState({ sidebarWidth: 300, collapsed: false, isResizing: false });
  const html = renderToStaticMarkup(React.createElement(Handle.SidebarResizeHandle, { minWidth: 230 }));
  assert.ok(html.startsWith(`<div aria-label="Resize sidebar" aria-valuenow="300" aria-valuemin="230" aria-valuemax="420" data-cds="ResizeHandle" role="separator" aria-orientation="vertical" tabindex="0" class="${handleClass('inline-end')}">`), html);
  assert.ok(html.includes('<div aria-hidden="true" class="absolute rounded-full transition-shadow duration-fast group-focus-visible/resize:shadow-focus inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize"></div>'));
  assert.ok(html.includes(`<div aria-hidden="true" data-cds-part="resize-pill" class="${resting}"></div>`), html);
  assert.doesNotMatch(html, /data-dragging/);
  Adapters.useSidebarFrameStore.setState({ sidebarWidth: 200 });
  assert.match(renderToStaticMarkup(React.createElement(Handle.SidebarResizeHandle, { minWidth: 230 })), /aria-valuenow="230"/, 'max(sidebarWidth, floor)');
});

test('SourceSidebar mounts the original handle (no hand-written handle left)', async () => {
  Adapters.useSidebarFrameStore.setState({ sidebarWidth: 312 });
  const html = renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar, { sessions: [], knownFolders: [], sidebarWidth: 312, sidebarFloor: 230, setSidebarWidth() {} }));
  assert.equal(html.match(/data-cds="ResizeHandle"/g)?.length, 1);
  assert.ok(html.includes(`aria-valuenow="312" aria-valuemin="230" aria-valuemax="420" data-cds="ResizeHandle" role="separator" aria-orientation="vertical" tabindex="0" class="${handleClass('inline-end')}"`));
  assert.doesNotMatch(html, /sidebar-resizer/);
  const source = await fs.readFile(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  assert.doesNotMatch(source, /RESIZE_(HANDLE|RING|PILL)|useSourcePointerResize|sidebarDragFrame/);
  assert.match(source, /import \{ SidebarResizeHandle as OriginalSidebarResizeHandle \} from "\.\/generated\/sidebar-resize\/sidebar-resize-handle\.mjs";/);
  assert.match(source, /useSidebarResizeHost\(\{ width, collapsed, onCommit, onCollapse, onCollapsedChange \}\);\n  return <OriginalSidebarResizeHandle minWidth=\{minWidth\} \/>;/);
  assert.match(source, /<SidebarResizeHandle width=\{sidebarWidth\} minWidth=\{sidebarFloor\} collapsed=\{collapsed\} onCommit=\{setSidebarWidth\}/);
});

// ---------------------------------------------------------------- controlled environment (no layout, no painting)
function createEnvironment({ innerWidth = 1200, width = 288, dir = 'ltr' } = {}) {
  let now = 0, nextId = 0;
  const timers = new Map();
  const events = {
    addEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture, signal = typeof options === 'object' ? options?.signal : undefined;
      if (signal?.aborted) return;
      const map = (this.__listeners ??= new Map()), list = map.get(type) ?? map.set(type, []).get(type);
      if (list.some(l => l.fn === fn && l.capture === capture)) return;
      list.push({ fn, capture, once: typeof options === 'object' && !!options?.once });
      signal?.addEventListener('abort', () => this.removeEventListener(type, fn, { capture }), { once: true });
    },
    removeEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture, list = this.__listeners?.get(type);
      const i = list?.findIndex(l => l.fn === fn && l.capture === capture) ?? -1;
      if (i >= 0) list.splice(i, 1);
    },
    dispatchEvent(event) {
      const list = this.__listeners?.get(event.type) ?? [];
      for (const entry of [...list.filter(l => l.capture), ...list.filter(l => !l.capture)]) {
        if (event.immediateStopped) break;
        if (!list.includes(entry)) continue;
        if (entry.once) list.splice(list.indexOf(entry), 1);
        entry.fn.call(this, event);
      }
      return !event.defaultPrevented;
    },
    listenerCount(type) { return this.__listeners?.get(type)?.length ?? 0; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  const style = () => {
    const values = new Map();
    return { cursor: '', userSelect: '', setProperty(k, v) { values.set(k, String(v)); }, getPropertyValue(k) { return values.get(k) ?? ''; }, removeProperty(k) { values.delete(k); } };
  };
  const simple = /^(\.[\w-]+)+$/;
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() }); this.style = style(); }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let x = this; x; x = x.parentNode) if (x === document) return true; return false; }
    get className() { return this.getAttribute('class') ?? ''; }
    set className(value) { this.setAttribute('class', value); }
    set textContent(_value) { this.childNodes = []; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }
    toggleAttribute(k, force) { const on = force ?? !this.attributes.has(k); on ? this.attributes.set(k, '') : this.attributes.delete(k); return on; }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    contains(node) { for (let x = node; x; x = x.parentNode) if (x === this) return true; return false; }
    matches(selector) { if (!simple.test(selector)) return false; const own = this.className.split(/\s+/); return selector.slice(1).split('.').every(c => own.includes(c)); }
    closest(selector) { for (let x = this; x?.nodeType === 1; x = x.parentNode) if (x.matches(selector)) return x; return null; }
    querySelectorAll(selector) { const out = [], walk = n => n.childNodes?.forEach(c => { if (c.nodeType === 1) { if (c.matches(selector)) out.push(c); walk(c); } }); walk(this); return out; }
    focus() { document.activeElement = this; }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: tag => new Element(tag), createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, ownerDocument: document, parentNode: null }) });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.documentElement.dir = dir;
  document.body = document.documentElement.appendChild(new Element('body'));
  const window = Object.assign(Object.create(events), {
    document, innerWidth, HTMLIFrameElement: class {},
    matchMedia: query => ({ media: query, matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: element => ({ getPropertyValue: name => element.style.getPropertyValue(name) }),
  });
  document.defaultView = window;
  document.hasFocus = () => true;
  // body > .dframe-root(--df-sidebar-width) > aside.app-sidebar.dframe-sidebar > container
  const root = document.body.appendChild(new Element('div'));
  root.setAttribute('class', 'dframe-root');
  root.style.setProperty('--df-sidebar-width', `${width}px`);
  const sidebar = root.appendChild(new Element('aside'));
  sidebar.setAttribute('class', 'app-sidebar dframe-sidebar source-sidebar');
  const container = sidebar.appendChild(new Element('div'));
  const clock = {
    get now() { return now; },
    pending: () => timers.size,
    setTimeout(fn, ms = 0) { const id = ++nextId; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = end;
    },
  };
  return { window, document, root, sidebar, container, clock };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
async function withEnvironment(options, run) {
  const env = createEnvironment(options);
  const names = ['window', 'document', 'getComputedStyle', 'setTimeout', 'clearTimeout'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const values = { window: env.window, document: env.document, getComputedStyle: env.window.getComputedStyle, setTimeout: env.clock.setTimeout, clearTimeout: env.clock.clearTimeout };
  for (const name of names) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  try { return await run(env); }
  finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}

// SourceSidebar's host component (source-sidebar.jsx SidebarResizeHandle), over a controlled host.
function mountHandle(env, { width = 288, minWidth = 200, collapsed = false } = {}) {
  const calls = { commit: [], collapse: 0, collapsed: [] };
  const hostState = { width, collapsed };
  const props = () => ({
    width: hostState.width, collapsed: hostState.collapsed,
    onCommit: w => { calls.commit.push(w); hostState.width = w; },
    onCollapse: () => { calls.collapse++; hostState.collapsed = !hostState.collapsed; },
    onCollapsedChange: v => { calls.collapsed.push(v); hostState.collapsed = v; },
  });
  function Host(p) {
    Adapters.useSidebarResizeHost(p);
    return React.createElement(Handle.SidebarResizeHandle, { minWidth });
  }
  const reactRoot = createRoot(env.container);
  const render = () => act(async () => { reactRoot.render(React.createElement(Host, props())); await flush(); });
  const handle = () => {
    const find = n => (n.getAttribute?.('data-cds') === 'ResizeHandle' ? n : n.childNodes?.map(find).find(Boolean));
    return find(env.container);
  };
  const reactProps = node => node[Object.keys(node).find(k => k.startsWith('__reactProps$'))];
  const event = (type, fields = {}) => ({ type, defaultPrevented: false, isComposing: false, keyCode: 0, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, stopImmediatePropagation() { this.immediateStopped = true; }, ...fields });
  const act_ = fn => act(async () => { fn(); await flush(); });
  const api = {
    calls, handle, render,
    // React handlers of the handle (Jt onMouseDown / onKeyDown, composed with DF's onKeyDown).
    press: (clientX = 300) => act_(() => { const node = handle(); reactProps(node).onMouseDown(event('mousedown', { button: 0, clientX, clientY: 10, currentTarget: node, target: node })); }),
    key: (key, fields = {}) => act_(() => { const node = handle(); reactProps(node).onKeyDown(event('keydown', { key, currentTarget: node, target: node, ...fields })); }),
    // Jt's document listeners, DF's document pointermove and window listeners, XL's window keydown.
    move: clientX => act_(() => env.document.dispatchEvent(event('mousemove', { clientX, clientY: 10, buttons: 1 }))),
    lostButtons: () => act_(() => env.document.dispatchEvent(event('pointermove', { pointerType: 'mouse', buttons: 0 }))),
    release: () => act_(() => { env.document.dispatchEvent(event('mouseup', { button: 0 })); env.window.dispatchEvent(event('mouseup', { button: 0 })); }),
    escape: () => act_(() => { env.window.dispatchEvent(event('keydown', { key: 'Escape' })); env.window.dispatchEvent(event('keyup', { key: 'Escape' })); }),
    blur: () => act_(() => env.window.dispatchEvent(event('blur'))),
    advance: ms => act_(() => env.clock.advance(ms)),
    sync: async () => { await render(); },
    unmount: () => act(async () => reactRoot.unmount()),
    liveWidth: () => env.sidebar.style.getPropertyValue('width'),
    rootWidth: () => env.root.style.getPropertyValue('--df-sidebar-width'),
    listeners: () => ['mousemove', 'mouseup', 'pointermove'].reduce((n, t) => n + env.document.listenerCount(t), 0),
  };
  return api;
}

test('drag: live inline width on .dframe-sidebar, [data-resizing] on the root, one commit at the end; the pill shows dragging', () => withEnvironment({}, async env => {
  Adapters.useSidebarFrameStore.setState({ sidebarWidth: 0, collapsed: true });
  const h = mountHandle(env);
  await h.render();
  assert.equal(Adapters.useSidebarFrameStore.getState().sidebarWidth, 288, 'host width synced into the store');
  await h.press(300);
  assert.equal(env.root.hasAttribute('data-resizing'), true);
  assert.equal(h.handle().getAttribute('data-dragging'), '');
  assert.match(h.handle().childNodes[1].className, /text-secondary opacity-100 duration-snap/);
  await h.move(262);
  assert.equal(h.liveWidth(), '250px');
  assert.equal(h.rootWidth(), '288px', 'the root variable only moves on commit');
  await h.move(1000);
  assert.equal(h.liveWidth(), '420px', 'clamped to $u(innerWidth)');
  await h.move(250);
  await h.release();
  assert.deepEqual(h.calls.commit, [238]);
  assert.equal(h.calls.collapse, 0);
  assert.equal(h.rootWidth(), '238px');
  assert.equal(h.liveWidth(), '', 'live width restored');
  assert.equal(env.root.hasAttribute('data-resizing'), false);
  assert.equal(h.handle().getAttribute('data-dragging'), null);
  assert.equal(h.listeners(), 0);
  await h.unmount();
}));

test('lost release: buttons=0 pointermove stops following, 200ms later the drag ends and commits without Hide', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.move(262);
  assert.equal(h.liveWidth(), '250px');
  await h.lostButtons(); // held -> awaited, 200ms timer
  await h.move(200);
  assert.equal(h.liveWidth(), '250px', 'awaited: no longer follows the pointer');
  await h.advance(199);
  assert.deepEqual(h.calls.commit, [], 'still waiting for a late mouseup');
  await h.advance(1); // -> lost: remount ends the press
  assert.deepEqual(h.calls.commit, [250]);
  assert.equal(h.calls.collapse, 0, 'a lost release is not a click');
  assert.equal(h.rootWidth(), '250px');
  assert.equal(h.liveWidth(), '');
  assert.equal(env.root.hasAttribute('data-resizing'), false);
  assert.equal(h.handle().getAttribute('data-dragging'), null, 'the remounted handle is no longer dragging');
  assert.equal(h.listeners(), 0, 'the remounted handle holds no document listeners');
  await h.move(100);
  assert.equal(h.liveWidth(), '', 'a move after the lost release does not resume the drag');
  await h.release();
  assert.deepEqual(h.calls.commit, [250], 'later moves and the late mouseup do nothing');
  assert.equal(h.calls.collapse, 0);
  assert.equal(env.clock.pending(), 0);
  await h.unmount();
}));

test('awaited release: the late mouseup commits the dragged width, does not Hide, and cancels the 200ms timer', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.move(330);
  await h.lostButtons();
  await h.release();
  assert.deepEqual(h.calls.commit, [318]);
  assert.equal(h.calls.collapse, 0);
  assert.equal(env.clock.pending(), 0);
  await h.advance(500);
  assert.deepEqual(h.calls.commit, [318]);
  await h.unmount();
}));

test('lost release with an unchanged width returns without committing or hiding', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.lostButtons();
  await h.advance(200);
  assert.deepEqual(h.calls.commit, []);
  assert.equal(h.calls.collapse, 0);
  assert.equal(env.root.hasAttribute('data-resizing'), false);
  // Contrast: a held press released without moving is the Hide sidebar click.
  await h.press(300);
  await h.release();
  assert.equal(h.calls.collapse, 1);
  assert.deepEqual(h.calls.commit, []);
  await h.unmount();
}));

test('below half the floor the drag hides live; mouseup keeps it hidden without a width commit', () => withEnvironment({}, async env => {
  const h = mountHandle(env, { minWidth: 230 });
  await h.render();
  await h.press(300);
  await h.move(126); // raw 114 < 230 / 2
  assert.deepEqual(h.calls.collapsed, [true]);
  await h.sync();
  await h.move(127); // raw 115 keeps it: shown again at the floor
  assert.deepEqual(h.calls.collapsed, [true, false]);
  await h.sync();
  assert.equal(h.liveWidth(), '230px');
  assert.equal(h.rootWidth(), '288px', 'the root variable does not follow the drag');
  await h.move(100);
  await h.sync();
  assert.equal(h.liveWidth(), '', 'hidden: the store subscription (vk false) clears the live width');
  assert.equal(h.rootWidth(), '288px');
  await h.release();
  assert.deepEqual(h.calls.collapsed, [true, false, true]);
  assert.deepEqual(h.calls.commit, []);
  assert.equal(h.rootWidth(), '288px', 'releasing hidden leaves the root variable at the pre-drag width');
  assert.equal(h.liveWidth(), '');
  assert.equal(h.calls.collapse, 0);
  await h.unmount();
}));

test('Escape restores the start width and the expanded state; the following mouseup only ends the press', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.move(262);
  assert.equal(h.liveWidth(), '250px');
  await h.move(50); // hide
  await h.sync();
  assert.deepEqual(h.calls.collapsed, [true]);
  await h.escape();
  assert.deepEqual(h.calls.collapsed, [true, false], 'un-hidden');
  assert.equal(h.liveWidth(), '', 'start width restored');
  assert.equal(h.rootWidth(), '288px');
  assert.equal(env.root.hasAttribute('data-resizing'), true, 'until the mouse is released');
  await h.move(200);
  assert.equal(h.liveWidth(), '', 'a cancelled press no longer follows');
  assert.equal(env.root.hasAttribute('data-resizing'), true);
  await h.release();
  assert.equal(env.root.hasAttribute('data-resizing'), false);
  assert.deepEqual(h.calls.commit, []);
  assert.equal(h.calls.collapse, 0);
  assert.equal(h.listeners(), 0);
  await h.unmount();
}));

test('window blur: drops the Escape cancel of a live drag (the release logic still ends it); after Escape it ends the press', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.move(280);
  await h.blur(); // u.cancelled ? d() : h() -- h is XL's disposer
  await h.escape();
  assert.equal(h.liveWidth(), '268px', 'Escape after blur no longer cancels');
  await h.lostButtons();
  await h.advance(200);
  assert.deepEqual(h.calls.commit, [268]);
  // Escape first, then blur: d() ends the press without a mouseup.
  await h.press(300);
  await h.move(320);
  await h.escape();
  assert.equal(env.root.hasAttribute('data-resizing'), true);
  await h.blur();
  assert.equal(env.root.hasAttribute('data-resizing'), false);
  assert.equal(h.listeners(), 0);
  assert.deepEqual(h.calls.commit, [268]);
  await h.unmount();
}));

test('keyboard: Home/End commit the floor / max width, arrows step 8/32 and commit, Enter is Hide sidebar', () => withEnvironment({ innerWidth: 1200 }, async env => {
  const h = mountHandle(env, { minWidth: 230 });
  await h.render();
  await h.key('Home');
  assert.deepEqual(h.calls.commit, [230]);
  assert.equal(h.rootWidth(), '230px');
  await h.sync();
  await h.key('Home');
  assert.deepEqual(h.calls.commit, [230], 'Home again: already at the floor');
  await h.key('End');
  assert.deepEqual(h.calls.commit, [230, 420]);
  await h.key('End', { metaKey: true });
  assert.deepEqual(h.calls.commit, [230, 420], 'modified keys are ignored');
  await h.sync();
  await h.key('ArrowLeft');
  await h.sync();
  await h.key('ArrowLeft', { shiftKey: true });
  assert.deepEqual(h.calls.commit, [230, 420, 412, 380]);
  assert.equal(h.calls.collapse, 0);
  await h.key('Enter');
  assert.equal(h.calls.collapse, 1);
  await h.unmount();
}));

test('End clamps to $u(innerWidth) and never below the floor', () => withEnvironment({ innerWidth: 600 }, async env => {
  const h = mountHandle(env, { minWidth: 280 });
  await h.render();
  await h.key('End');
  assert.deepEqual(h.calls.commit, [280], 'max(floor, $u(600) = 270)');
  await h.unmount();
}));

test('a click that hides the sidebar swallows the follow-up double-click (EF)', () => withEnvironment({}, async env => {
  const h = mountHandle(env);
  await h.render();
  await h.press(300);
  await h.release();
  assert.equal(h.calls.collapse, 1);
  const dbl = { type: 'dblclick', detail: 2, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
  env.window.dispatchEvent(dbl);
  assert.equal(dbl.defaultPrevented, true);
  assert.equal(dbl.stopped, true);
  await h.unmount();
}));
