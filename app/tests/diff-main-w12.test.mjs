// W12 diff-main: the Changes pane's diff body on its 3.6556.2 originals (c44d00c7f Jd).
// - The Changed files column is c219730b0 Sn (exported `_t`, generated useResizableDiffTree) with the c44d00c7f Ir / Lr /
//   Rr handles (generated DiffTreeResizeHandle / DiffTreeEdgeHandle / DiffTreeResizeShield) over the sidebar's shared-9
//   bm, replacing the host divider / edge (use-pointer-resize). Tooltip actionLabel "Hide files" / "Show files", the
//   ⇧⌘Y shortcut (cccc2cf0a treeToggleShortcut), detail "Drag to resize".
// - The large-diff fold-all rule `(le.collapsed || !qt)` and the collapsed banner.
// - The image viewer is the view-tabs CdsDialog (shared-frame Zc: Root / Popup 2xl / Header showClose).
// - The selection chip is ceb49ada3 Tt (generated code-current terminal-action-bar.mjs) in `div.absolute.isolate`.
// Nothing here opens a window: original text, generator output, SSR, and the original drag logic under a fake DOM.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as official from '../scripts/official-3.6556.2.mjs';
import { SELECTION_CHIP, selectionChipPosition } from '../src/diff-comments-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const chunk = (name) => fs.readFileSync(path.join(official.ionSource, name), 'utf8');
const once = (text, features) => { for (const f of features) assert.equal(text.split(f).length - 1, 1, f); };
const fnBody = (text, head) => { const at = text.indexOf(head); assert.ok(at >= 0, head); const next = text.indexOf('\nfunction ', at + head.length); return text.slice(at, next < 0 ? undefined : next); };
const h = React.createElement;

let server, Column, Handles, ActionBar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Column = await server.ssrLoadModule('/src/generated/sidebar-resize/diff-tree-column.mjs');
  Handles = await server.ssrLoadModule('/src/generated/sidebar-resize/diff-tree-resize-handle.mjs');
  ActionBar = await server.ssrLoadModule('/src/generated/code-current/terminal-action-bar.mjs');
});
after(() => server?.close());

// ---------------------------------------------------------------- original text (3.6556.2)
test('3.6556.2 Jd: Sn drives the column; Ir (Hide files) in the column, Lr (Show files) beside it, Rr while resizing', () => {
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  once(view, [
    'import{t as Tt}from"./ceb49ada3-COmVjFwx.js"',
    'Cn(Nn)',
    'actionLabel:zn?jn.formatMessage({defaultMessage:"Hide files",id:"ZU8NF+Epvo"}):void 0',
    'actionLabel:jn.formatMessage({defaultMessage:"Show files",id:"vuTg/99D1y"})',
    'n(Rr,{active:Ln})',
    'R(5)',
    // The large-diff fold rule and the collapsed note (Ud).
    '(le.collapsed||!qt)',
    'defaultMessage:"Files are collapsed for large diffs. Select a file to expand it."',
  ]);
  assert.match(view, /\{[^}]*\b_t as Cn\b[^}]*\}from"\.\/c219730b0-DGG9iA8k\.js"/);
  // treeToggleShortcut: cccc2cf0a `se=Vh("diff")` (c73f45bc3 Id: Ye("toggleDiffFileList", …)).
  once(chunk('cccc2cf0a-DhZC33Gc.js'), ['treeToggleShortcut:se', 'se=Vh("diff")']);
  once(chunk('c73f45bc3-B7hbL7H9.js'), ['Ye("toggleDiffFileList",n)']);
  assert.equal(read('src/source-session.jsx').match(/toggleShortcut: treeToggleRef \? TREE_TOGGLE_SHORTCUT : undefined/g)?.length, 1);
});

test('generator: Sn / Z and Ir / Lr / Rr are original bindings next to the sidebar handle (one shared-9 bm)', () => {
  const manifest = JSON.parse(read('src/generated/sidebar-resize/manifest.json'));
  const by = Object.fromEntries(manifest.modules.map((m) => [m.target, m]));
  assert.equal(by['diff-tree-column.mjs'].source, 'c219730b0-DGG9iA8k.js');
  assert.deepEqual(by['diff-tree-column.mjs'].bindings.map((b) => b.name), ['Z', 'tn', 'nn', 'rn', 'an', '_n', 'Sn', 'Cn']);
  assert.deepEqual(by['diff-tree-resize-handle.mjs'].bindings.map((b) => b.name), ['Fr', 'Ir', 'Lr', 'Rr']);
  assert.deepEqual(by['diff-tree-resize-handle.mjs'].exports, { Ir: 'DiffTreeResizeHandle', Lr: 'DiffTreeEdgeHandle', Rr: 'DiffTreeResizeShield' });
  const handle = read('src/generated/sidebar-resize/diff-tree-resize-handle.mjs');
  assert.match(handle, /import \{ ResizeHandle as it \} from "\.\/resize-handle\.mjs";/);
  assert.equal(manifest.modules.filter((m) => m.source === 'shared-9-CM21XrJw.js').length, 1);
  for (const f of ['"data-file-tree-resize-shield": ""', '"fixed inset-0 cursor-col-resize bg-alpha-1 opacity-20"', 'trackCursorAxis: "y"', '"relative w-0 shrink-0"'])
    assert.ok(handle.includes(f), f);
  assert.deepEqual({ ...Column.diffTreeWidthBounds }, { DEFAULT: 240, MIN: 160, MAX: 640 });
});

test('host: ChangesFileLayout renders the generated column and handles, no hand-written divider or edge', () => {
  const diff = read('src/source-diff.jsx');
  const layout = fnBody(diff, 'function ChangesFileLayout(');
  assert.doesNotMatch(diff, /useSourcePointerResize|source-tree-divider|source-tree-edge|sdiff-file-list-(?:divider|edge)/);
  once(layout, [
    'const column = useResizableDiffTree({ width, onWidthChange: fileList.onWidthChange, defaultWidth: DIFF_FILE_LIST_WIDTH.DEFAULT,',
    'onShownChange: fileList.onShownChange, shown: !!fileList.shown });',
    'const zIndex = useCdsLayerAwareZIndex(5);',
    '<DiffTreeResizeHandle handleProps={column.handleProps} label={DIFF_FILE_LIST_LABELS.resize}',
    'actionLabel={column.hidesColumn ? DIFF_FILE_LIST_LABELS.hideFiles : undefined} shortcut={shortcut} resizing={column.resizing} zIndex={zIndex} />',
    '{column.edgeHandleProps && canFit && <DiffTreeEdgeHandle handleProps={column.edgeHandleProps} label={DIFF_FILE_LIST_LABELS.resize}',
    'actionLabel={DIFF_FILE_LIST_LABELS.showFiles} shortcut={shortcut} resizing={column.resizing} zIndex={zIndex} />',
    '<DiffTreeResizeShield active={column.resizing} />',
    'style={column.columnStyle}>',
  ]);
  assert.doesNotMatch(read('src/source-diff.css'), /\[data-resizing\]|source-tree-edge/);
  // Fold all (Jd): an expand-all on a large diff is consumed without effect.
  once(diff, ['if (changes && foldAll && !foldAll.collapsed && large && ignoredFold.current !== foldAll) ignoredFold.current = foldAll;',
    'const foldRequest = foldAll && ignoredFold.current !== foldAll ? foldAll : null;']);
  assert.equal(diff.match(/foldAll=\{foldRequest\}/g)?.length, 2);
  assert.doesNotMatch(diff, /foldAll=\{foldAll\}/);
});

// ---------------------------------------------------------------- SSR of the original handles
test('SSR: Ir is bm at the column end with Fr clip-path and Sn aria values; Lr wraps it in the 0-width edge; Rr renders nothing on the server', () => {
  function Host({ shown }) {
    const c = Column.useResizableDiffTree({ width: 300, onWidthChange() {}, defaultWidth: 240, onShownChange() {}, shown });
    return h('div', null,
      shown && h('div', { ref: c.columnRef, style: c.columnStyle, className: 'relative' },
        h(Handles.DiffTreeResizeHandle, { handleProps: c.handleProps, label: 'Resize file list', actionLabel: c.hidesColumn ? 'Hide files' : undefined, shortcut: 'cmd+shift+y', resizing: c.resizing, zIndex: 5 })),
      c.edgeHandleProps && h(Handles.DiffTreeEdgeHandle, { handleProps: c.edgeHandleProps, label: 'Resize file list', actionLabel: 'Show files', shortcut: 'cmd+shift+y', resizing: c.resizing, zIndex: 5 }),
      h(Handles.DiffTreeResizeShield, { active: c.resizing }));
  }
  const shown = renderToStaticMarkup(h(Host, { shown: true }));
  assert.match(shown, /style="width:300px;min-width:min\(160px, 100% - 160px\);max-width:min\(640px, 100% - 160px\)"/);
  assert.match(shown, /aria-valuenow="300" aria-valuemin="160" aria-valuemax="640" aria-label="Resize file list" style="z-index:5" data-cds="ResizeHandle" role="separator" aria-orientation="vertical" tabindex="0"/);
  assert.ok(shown.includes('[clip-path:inset(0_0_0_37.5%)]'));
  assert.doesNotMatch(shown, /relative w-0 shrink-0|data-file-tree-resize-shield/);
  const hidden = renderToStaticMarkup(h(Host, { shown: false }));
  assert.match(hidden, /^<div><div class="relative w-0 shrink-0"><div aria-valuenow="0" aria-valuemin="0" aria-valuemax="640" aria-label="Resize file list"/);
  assert.ok(hidden.includes('w-[3px] [&amp;&gt;*]:pointer-events-none start-0 end-auto'));
});

// ---------------------------------------------------------------- the original drag logic under a fake DOM
function createEnvironment() {
  const events = {
    addEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture;
      const map = (this.__listeners ??= new Map()), list = map.get(type) ?? map.set(type, []).get(type);
      if (!list.some((l) => l.fn === fn && l.capture === capture)) list.push({ fn, capture });
    },
    removeEventListener(type, fn, options) {
      const capture = typeof options === 'boolean' ? options : !!options?.capture, list = this.__listeners?.get(type);
      const i = list?.findIndex((l) => l.fn === fn && l.capture === capture) ?? -1;
      if (i >= 0) list.splice(i, 1);
    },
    dispatchEvent(event) { for (const entry of [...(this.__listeners?.get(event.type) ?? [])]) entry.fn.call(this, event); return !event.defaultPrevented; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  class Element {
    constructor(tag) { Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map(), clientWidth: 0 }); this.style = { setProperty() {}, getPropertyValue() { return ''; }, removeProperty() {} }; }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const s = this.parentNode?.childNodes; return s ? s[s.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let x = this; x; x = x.parentNode) if (x === document) return true; return false; }
    // Layout stand-in: an element's width is its inline width.
    get offsetWidth() { return this.style.display === 'none' ? 0 : Number.parseFloat(this.style.width) || 0; }
    set textContent(_value) { this.childNodes = []; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.has(k) ? this.attributes.get(k) : null; }
    hasAttribute(k) { return this.attributes.has(k); }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(child) { child.parentNode?.removeChild(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild(child); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(child); else this.childNodes.splice(i, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i >= 0) this.childNodes.splice(i, 1); child.parentNode = null; return child; }
    contains(node) { for (let x = node; x; x = x.parentNode) if (x === this) return true; return false; }
    focus() { document.activeElement = this; }
    getBoundingClientRect() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, { createElement: (tag) => new Element(tag), createTextNode: (text) => ({ nodeType: 3, nodeName: '#text', textContent: text, ownerDocument: document, parentNode: null }) });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  const window = Object.assign(Object.create(events), { document, ResizeObserver, HTMLIFrameElement: class {}, setTimeout, clearTimeout,
    matchMedia: (query) => ({ media: query, matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }) });
  document.defaultView = window;
  document.hasFocus = () => true;
  const row = document.body.appendChild(new Element('div'));
  row.clientWidth = 1000;
  return { window, document, row };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
async function withColumn(initial, run) {
  const env = createEnvironment();
  const names = ['window', 'document', 'getComputedStyle', 'ResizeObserver'];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const values = { window: env.window, document: env.document, getComputedStyle: env.window.getComputedStyle, ResizeObserver: env.window.ResizeObserver };
  for (const name of names) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  const state = { ...initial }, calls = { width: [], shown: [] };
  function Host() {
    const [, force] = React.useReducer((n) => n + 1, 0);
    const onWidthChange = (w) => { calls.width.push(w); state.width = w; force(); };
    const onShownChange = (v) => { calls.shown.push(v); state.shown = v; force(); };
    const c = Column.useResizableDiffTree({ width: state.width, onWidthChange, defaultWidth: 240, onShownChange, shown: state.shown });
    return h(React.Fragment, null,
      state.shown && h('div', { ref: c.columnRef, style: c.columnStyle, 'data-column': '' },
        h(Handles.DiffTreeResizeHandle, { handleProps: c.handleProps, label: 'Resize file list', actionLabel: c.hidesColumn ? 'Hide files' : undefined, resizing: c.resizing, zIndex: 5 })),
      c.edgeHandleProps && h(Handles.DiffTreeEdgeHandle, { handleProps: c.edgeHandleProps, label: 'Resize file list', actionLabel: 'Show files', resizing: c.resizing, zIndex: 5 }),
      h(Handles.DiffTreeResizeShield, { active: c.resizing }));
  }
  const root = createRoot(env.row);
  const find = (pred, node = env.document.body) => (pred(node) ? node : node.childNodes?.map((child) => find(pred, child)).find(Boolean));
  const handles = () => { const out = []; const walk = (n) => n.childNodes?.forEach((c) => { if (c.getAttribute?.('data-cds') === 'ResizeHandle') out.push(c); walk(c); }); walk(env.row); return out; };
  const reactProps = (node) => node[Object.keys(node).find((k) => k.startsWith('__reactProps$'))];
  const event = (type, fields = {}) => ({ type, defaultPrevented: false, repeat: false, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...fields });
  const act_ = (fn) => act(async () => { fn(); await flush(); });
  const api = {
    env, state, calls, handles,
    column: () => find((n) => n.hasAttribute?.('data-column')),
    shield: () => find((n) => n.hasAttribute?.('data-file-tree-resize-shield')),
    press: (node, clientX) => act_(() => reactProps(node).onMouseDown(event('mousedown', { button: 0, clientX, clientY: 10, currentTarget: node, target: node }))),
    move: (clientX) => act_(() => env.document.dispatchEvent(event('mousemove', { clientX, clientY: 10 }))),
    release: () => act_(() => env.document.dispatchEvent(event('mouseup', { button: 0 }))),
    key: (node, key, fields = {}) => act_(() => reactProps(node).onKeyDown(event('keydown', { key, currentTarget: node, target: node, ...fields }))),
  };
  try {
    await act(async () => { root.render(h(Host)); await flush(); });
    await run(api);
    await act(async () => root.unmount());
  } finally { for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]; }
}

test('Sn: a click on the divider hides the column ("Hide files"), a click on the edge shows it ("Show files")', () => withColumn({ width: 300, shown: true }, async (c) => {
  assert.equal(c.handles().length, 1);
  await c.press(c.handles()[0], 500);
  assert.ok(c.shield(), 'Rr shield while the press holds');
  assert.equal(c.shield().getAttribute('class'), 'fixed inset-0 cursor-col-resize bg-alpha-1 opacity-20');
  await c.release();
  assert.deepEqual(c.calls.shown, [false]);
  assert.equal(c.shield(), undefined);
  assert.equal(c.column(), undefined);
  const [edge] = c.handles();
  assert.equal(edge.parentNode.getAttribute('class'), 'relative w-0 shrink-0');
  await c.press(edge, 10);
  await c.release();
  assert.deepEqual(c.calls.shown, [false, true]);
  assert.deepEqual(c.calls.width, []);
}));

test('Sn: dragging the divider sets the live width and stores it once; under MIN/2 it hides the column instead', () => withColumn({ width: 300, shown: true }, async (c) => {
  await c.press(c.handles()[0], 500);
  await c.move(560);
  assert.equal(c.column().style.width, '360px');
  await c.release();
  assert.deepEqual(c.calls.width, [360]);
  assert.deepEqual(c.calls.shown, []);
  await c.press(c.handles()[0], 500);
  await c.move(500 - 360 + 70);
  assert.equal(c.column().style.display, 'none', 'below MIN/2 (80) the column is hidden live');
  await c.release();
  assert.deepEqual(c.calls.shown, [false]);
  assert.deepEqual(c.calls.width, [360]);
}));

test('Sn: Home / End on the divider store MIN / MAX; bm arrows step 8 (32 with Shift)', () => withColumn({ width: 300, shown: true }, async (c) => {
  await c.key(c.handles()[0], 'End');
  assert.deepEqual(c.calls.width, [640]);
  await c.key(c.handles()[0], 'Home');
  assert.deepEqual(c.calls.width, [640, 160]);
  await c.key(c.handles()[0], 'ArrowRight');
  assert.deepEqual(c.calls.width, [640, 160, 168]);
  await c.key(c.handles()[0], 'ArrowRight', { shiftKey: true });
  assert.deepEqual(c.calls.width, [640, 160, 168, 200]);
}));

// ---------------------------------------------------------------- image dialog: view-tabs CdsDialog
test('image viewer: c44d00c7f Zc / tl on the shared-frame CDS Dialog (view-tabs CdsDialog), Popup 2xl, Header showClose', () => {
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  once(view, ['n(I.Root,{open:m,onOpenChange:h,onOpenChangeComplete:g,children:v})', 'n(I.Popup,{size:"2xl",children:_})',
    'n(I.Header,{showClose:!0,description:p,children:m})']);
  assert.match(view, /import\{[^}]*\bZc as I\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/);
  const viewTabs = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual([viewTabs.publicNames.CdsDialog.file, viewTabs.publicNames.CdsDialog.export], ['shared-frame-6jtSkIit.js', 'Zc']);
  const diff = read('src/source-diff.jsx');
  const dialog = fnBody(diff, 'function DiffImageDialog(');
  once(dialog, [
    '<CdsDialog.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }} onOpenChangeComplete={(next) => { if (!next) onExited(); }}>',
    '<CdsDialog.Popup size="2xl">',
    '<CdsDialog.Header showClose description={viewer.description}>{viewer.title}</CdsDialog.Header>',
    'className={`grid grid-cols-1 gap-md${viewer.columns > 1 ? " sm:grid-cols-2" : ""}`}',
  ]);
  assert.doesNotMatch(diff, /SourceDialog/);
  assert.match(diff, /import \{ CdsDialog, CdsIcon, CdsSkeleton, useCdsLayerAwareZIndex \} from '\.\/generated\/view-tabs\/index\.js';/);
});

// ---------------------------------------------------------------- selection chip: ceb49ada3 Tt
test('selection chip: ceb49ada3 Tt (the terminal action bar) under CdsLayerProvider in div.absolute.isolate[data-pane-editor]', () => {
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  once(view, ['className:"absolute isolate","data-pane-editor":""', 'n(V,{children:n(Tt,{actions:[{key:"add-comment"', 'b=R(4)']);
  assert.match(view, /import\{[^}]*\bou as V\b[^}]*\}from"\.\/shared-frame-6jtSkIit\.js"/);
  // The generated bar is ceb49ada3's `u` (exported `t`, imported by c44d00c7f as Tt): one copy, shared with the terminal.
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  const bar = (manifest.modules ?? manifest.files ?? []).find?.((m) => m.target === 'terminal-action-bar.mjs' || m.output === 'terminal-action-bar.mjs');
  assert.ok(bar, 'code-current manifest lists terminal-action-bar.mjs');
  assert.ok(String(bar.source).endsWith('/ceb49ada3-COmVjFwx.js'), bar.source);
  const comments = read('src/source-diff-comments.jsx');
  once(comments, [
    'import { SelectionActionBar } from "./generated/code-current/terminal-action-bar.mjs";',
    'const chipZIndex = useCdsLayerAwareZIndex(4);',
    '{chip && <div className="absolute isolate" data-pane-editor=""',
    'style={{ left: chip.x, top: chip.y, transform: chip.flipBelow ? `translate(-50%, ${SELECTION_CHIP.gap}px)` : `translate(-50%, calc(-100% - ${SELECTION_CHIP.gap}px))`, zIndex: chipZIndex }}>',
    '<SelectionActionBar actions={[{ key: "add-comment", label: t("Add comment"), ariaLabel: addCommentLabel(chip.lines), onSelect: () => commentSelection(chip.span) }]} />',
  ]);
  assert.doesNotMatch(comments, /createPortal|SourceSettingsButton|sdiff-selection-chip|Selection actions/);
  assert.match(read('src/source-diff.jsx'), /<section className="sdiff-file relative" ref=\{fileRef\}/);
  // The bar's markup: the popover surface `!rounded group/split flex`, one ghost CdsButton.
  const html = renderToStaticMarkup(h(ActionBar.SelectionActionBar, { actions: [{ key: 'add-comment', label: 'Add comment', ariaLabel: 'Add comment on line 3', onSelect() {} }] }));
  assert.match(html, /^<div class="[^"]*!rounded group\/split flex "/);
  assert.match(html, /<button[^>]*aria-label="Add comment on line 3"[^>]*>.*Add comment.*<\/button><\/div>$/);
});

test('selection chip position: Bl re in the wrapper\'s coordinates (Fl 72 inset, Il 8 gap, Ll 48 flip)', () => {
  once(chunk('c44d00c7f-Cr1FDL2F.js'), ['var Pl=250,Fl=72,Il=8,Ll=48', 'c=Math.min(Math.max(t-s.left,Fl),Math.max(s.width-Fl,Fl)),l=n-s.top,u=n-zl(e)<Ll']);
  assert.deepEqual({ ...SELECTION_CHIP }, { edge: 72, gap: 8, flipWithin: 48, multiClickDelay: 250 });
  assert.deepEqual(selectionChipPosition({ clientX: 210, clientY: 400, left: 200, top: 300, width: 600, scrollerTop: 100 }), { x: 72, y: 100, flipBelow: false });
  assert.deepEqual(selectionChipPosition({ clientX: 790, clientY: 130, left: 200, top: 100, width: 600, scrollerTop: 100 }), { x: 528, y: 30, flipBelow: true });
});

// ---------------------------------------------------------------- large-diff banner
test('large diff: the collapsed note is Jd vi (Ud classes, the q0jjHC00PT message) above the body; the gated 11jd482 tail needs marks', () => {
  const view = chunk('c44d00c7f-Cr1FDL2F.js');
  once(view, ['Ud="shrink-0 px-md py-1.25 text-body text-muted-as-secondary"',
    'defaultMessage:"Files are collapsed for large diffs. Select a file to expand it.",id:"q0jjHC00PT"']);
  // _i / the vi tail render shared-78 yG (a gated message, defaultMessage " ") only with a mark scope (lt: markScopeKey),
  // which the host has no source for; vi itself shows while the large diff folded files (mn).
  assert.match(view, /lt&&!bt&&o\(s,\{children:\[" ",n\(Fe,\{id:"11jd482"\}\)\]\}\)/);
  const diff = read('src/source-diff.jsx');
  once(diff, ['<div className="sdiff-large-banner shrink-0 px-md py-1.25 text-body text-muted-as-secondary">{DIFF_FILE_LIST_LABELS.largeBanner}</div>']);
  once(fnBody(diff, 'function ChangesFileLayout('), ['{banner}\n      <div className="source-changes">{children}</div>']);
  once(read('src/diff-file-list-model.mjs'), ['largeBanner: t("Files are collapsed for large diffs. Select a file to expand it."),']);
});
