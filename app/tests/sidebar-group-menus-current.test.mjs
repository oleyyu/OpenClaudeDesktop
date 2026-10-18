// R3-sections step 2, work item sidebar-group-menus-current (research/sidebar-sections.md WI-4; ledger sidebar-02 / 03 /
// 04 / 06): the Code list's group / section header menus, blank-area menu and multi-selection menu as 2.42304.0 has them
// with the presets gate on (D10):
//   - the blank-area menu is the original shared-21 _B / bB (yB's six ordered sections, Select all's two disabled
//     reasons), with the list element as its trigger and its list context over everything inside the list;
//   - a Sessions folder bucket's header menu is the original shared-20 yx as a "worked-out" group (sT → bC: no Rename /
//     Delete / New section, Other greyed with place-unknown), inside shared-19 x$ when it can move (Move up / Move down,
//     "Sort A to Z" only while an order is stored, which clears it), the folder buckets ordered by name (shared-19 c2);
//   - the multi-selection menu is flat (ce4f4374c Be).
// Nothing opens a window: generator manifest, controlled renders over a hook dispatcher (D21), SSR markup, pure functions.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as Layout from '../src/sidebar-sections-layout.mjs';
import { buildSidebarGroups, OTHER_PROJECT_KEY, customOrderKey } from '../src/sidebar-model.js';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = (file) => server.ssrLoadModule(file);
  M.sidebar = await load('/src/source-sidebar.jsx');
  M.sections = await load('/src/source-sidebar-sections.jsx');
  M.adapters = await load('/src/source-sidebar-sections-adapters.jsx');
  M.blank = await load('/src/generated/sidebar-sections/blank-area-menu.mjs');
  M.menu = await load('/src/generated/sidebar-sections/group-menu.mjs');
  M.reorder = await load('/src/generated/sidebar-sections/group-reorder.mjs');
  M.sortable = await load('/src/generated/sidebar-sections/section-sortable.mjs');
  M.reasons = await load('/src/generated/sidebar-sections/group-reasons.mjs');
  M.organize = await load('/src/generated/sidebar-sections/group-organize.mjs');
  M.archive = await load('/src/generated/sidebar-sections/group-archive.mjs');
  M.filter = await load('/src/generated/sidebar-sections/section-filter-controls.mjs');
  M.dialog = await load('/src/generated/sidebar-sections/group-dialog.mjs');
  M.view = await load('/src/generated/code-current/sidebar-group-view.mjs');
  M.items = await load('/src/generated/code-current/sidebar-menu-groups.mjs');
  M.sourceMenu = await load('/src/source-menu.jsx');
  M.menuModel = await load('/src/menu-model.mjs');
  M.viewTabs = await load('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  M.kit = await load('/src/source-sidebar-menu-kit.jsx');
  M.i18n = await load('/electron/i18n/index.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

// ---------------------------------------------------------------- hook dispatcher (D21)
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const read = (c) => (contexts.has(c) ? contexts.get(c) : c._currentValue);
  const hooks = {
    use: read, useContext: read, useId: () => ':menus:', useDebugValue() {}, useSyncExternalStore: (subscribe, get, server) => (server ?? get)(),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (value) => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useReducer(reducer, initialArg, init) { const i = cursor++; if (!cells[i]) { const cell = { value: init ? init(initialArg) : initialArg }; cell.dispatch = (action) => { cell.value = reducer(cell.value, action); }; cells[i] = cell; } return [cells[i].value, cells[i].dispatch]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    useImperativeHandle(ref, make, deps) { hooks.useEffect(() => { if (ref) ref.current = make(); }, deps); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const render = (next = props) => { props = next; cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H; internal.H = hooks; try { return (tree = component(props)); } finally { internal.H = old; } };
  render();
  return { get tree() { return tree; }, render, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach((c) => c?.cleanup?.()); } };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((n) => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const byType = (tree, type) => nodes(tree, (n) => n.type === type);
const h = React.createElement;
const message = (item) => item.props.children?.props?.defaultMessage;
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/w/alpha', createdAt: now, updatedAt: now, ...fields });
// A list element with group toggles for sZ / oZ (`[data-group-toggle][aria-expanded=…]`, none inert).
const listWith = (collapsed) => ({ querySelectorAll: (selector) => (/aria-expanded="false"/.test(selector) ? collapsed : []).map(() => ({ closest: () => null })) });
const resetRegistry = () => M.adapters.setSidebarRowRegistry({ buckets: new Map(), rows: new Map(), visible: [], open: new Set() });

// ---------------------------------------------------------------- generator
test('generator: shared-21 _B / bB / mB / hB / yB extracted with the original contexts and the blank-area adapters', async () => {
  const manifest = JSON.parse(await read(path.join(app, 'src/generated/sidebar-sections/manifest.json')));
  const module = manifest.modules.find((m) => m.target === 'blank-area-menu.mjs');
  assert.equal(module.source, 'shared-21-IP-SVetq.js');
  assert.deepEqual(module.bindings.map((b) => b.name).sort(), ['_B', 'bB', 'hB', 'mB', 'yB']);
  const imports = Object.fromEntries(module.imports.map((i) => [i.local, `${i.kind}:${i.from}#${i.name}`]));
  // The same list context instance the header menus read (code-current nZ), and code-current's one copy of uZ
  // (Collapse all / Expand all) and sZ (sidebarHasCollapsedGroups, the "Expand a section…" test); dx / vB / HX / KX
  // from this tree.
  assert.equal(imports.Ni, 'external:../code-current/sidebar-group-view.mjs#SidebarListContext');
  assert.equal(imports.U_, 'generated:./group-dialog.mjs#useCreateGroupDialog');
  assert.equal(imports.vB, 'generated:./section-filter-controls.mjs#useNewSectionOpener');
  assert.equal(imports.ji, 'external:../code-current/sidebar-group-view.mjs#SidebarGroupViewItems');
  assert.equal(imports.mi, 'external:../code-current/sidebar-group-view.mjs#sidebarHasCollapsedGroups');
  // No second slice of uZ / sZ anywhere in this tree: every importer reads code-current's.
  for (const m of manifest.modules) {
    assert.ok(!m.bindings.some((b) => b.name === 'uZ' || b.name === 'sZ'), `${m.target} re-slices uZ / sZ`);
    for (const i of m.imports.filter((i) => i.original === 'shared-19-CkPOiIKm.js:uZ' || i.original === 'shared-19-CkPOiIKm.js:sZ'))
      assert.equal(i.from.endsWith('code-current/sidebar-group-view.mjs'), true, `${m.target} ${i.local}`);
  }
  assert.equal(imports.wi, 'generated:./group-archive.mjs#emptyBulkScope');
  assert.equal(imports.Qi, 'generated:./group-archive.mjs#useUnloadedRows');
  assert.equal(imports.Rx, 'external:../code-current/sidebar-menu-groups.mjs#OrderedSidebarMenuGroups');
  assert.equal(imports.zx, 'external:../code-current/sidebar-menu-groups.mjs#SidebarMenuItem');
  for (const [local, name] of Object.entries({ Sb: 'usePresetsGate', Vu: 'sidebarRowKeys', wu: 'sidebarVisibleKeys', Nu: 'useSidebarSelectionStore',
    uf: 'SidebarContextMenu', mx: 'useSidebarNavigate', Ua: 'useHomeRoutes', Qg: 'startCodeDraft', lB: 'requestNewEnvironment', $i: 'useSidebarBulkArchive' }))
    assert.equal(imports[local], `adapter:../../source-sidebar-sections-adapters.jsx#${name}`, local);
  // The strings the menu is pinned to are in the original chunk, verbatim.
  const chunk = await read(path.join(reference, 'shared-21-IP-SVetq.js'));
  for (const text of ['yB=["session","create","select","fold","convert","bulk"]', 'defaultMessage:"Expand a section to select its sessions.",id:"K3IOhSxgC/"',
    'defaultMessage:"You need at least 2 sessions that can be selected.",id:"q1iA95GkB0"', 'defaultMessage:"New environment",id:"bz16qO90l5"', 'U_("whitespace_menu")'])
    assert.ok(chunk.includes(text), text);
});

// ---------------------------------------------------------------- bB: the menu body
test('blank-area menu (bB): yB order, New session / New section… from the list context, New environment, fold', () => {
  const actions = [];
  const disconnect = M.adapters.connectSidebarBlankArea({ newSession: () => actions.push('new'), newEnvironment: () => actions.push('environment') });
  M.adapters.setSidebarRowRegistry({ rows: new Map([['code:a', {}], ['code:b', {}]]), visible: ['code:a', 'code:b'] });
  try {
    const context = { getList: () => listWith([]), onNewSession: () => actions.push('ctx-new'), onNewSection: () => actions.push('section') };
    const contexts = new Map([[M.view.SidebarListContext, context]]);
    const menu = fixture(M.blank.SidebarBlankAreaMenu, { showCreateGroup: true, onSelectAll: () => actions.push('select') }, contexts).tree;
    assert.equal(menu.type, M.items.OrderedSidebarMenuGroups);
    assert.deepEqual(menu.props.order, ['session', 'create', 'select', 'fold', 'convert', 'bulk']);
    assert.equal(M.blank.blankAreaMenuOrder, menu.props.order);
    assert.deepEqual([menu.props.groups.convert, menu.props.groups.bulk], [false, false]);
    // session: mB → New session (the list context's onNewSession).
    const session = fixture(M.blank.BlankAreaNewSessionItem, {}, contexts).tree;
    assert.deepEqual([session.type, message(session)], [M.items.SidebarMenuItem, 'New session']);
    session.props.onClick();
    // create: hB → the section copy's New section…, then New environment (showCreateGroup && the presets gate).
    const section = fixture(M.blank.BlankAreaNewSectionItem, {}, contexts).tree;
    assert.equal(message(section), 'New section');
    section.props.onClick();
    const create = byType(menu.props.groups.create, M.items.SidebarMenuItem);
    assert.deepEqual(create.map(message), ['New environment']);
    assert.equal(byType(menu.props.groups.create, M.blank.BlankAreaNewSectionItem).length, 1);
    // New environment: ST (to the Code page: the host's new session) then lB (the host's environment editor).
    create[0].props.onClick();
    assert.deepEqual(actions, ['ctx-new', 'section', 'new', 'environment']);
    // fold: the original uZ (Collapse all / Expand all over the list context).
    assert.equal(menu.props.groups.fold.type, M.view.SidebarGroupViewItems);
    // select: Select all, enabled with two visible rows; its click is _B's onSelectAll.
    const select = menu.props.groups.select;
    assert.deepEqual([message(select), select.props.disabled], ['Select all', false]);
    select.props.onClick();
    assert.equal(actions.at(-1), 'select');
    // Without showCreateGroup: no New environment (hB still follows the context).
    const plain = fixture(M.blank.SidebarBlankAreaMenu, { showCreateGroup: false, onSelectAll() {} }, contexts).tree;
    assert.deepEqual(byType(plain.props.groups.create, M.items.SidebarMenuItem), []);
    // Outside a list context mB / hB render nothing.
    assert.equal(fixture(M.blank.BlankAreaNewSessionItem, {}).tree, undefined);
    assert.equal(fixture(M.blank.BlankAreaNewSectionItem, {}).tree, undefined);
  } finally { disconnect(); resetRegistry(); }
});

test('blank-area Select all: disabled under 2 visible rows, "Expand a section…" only when ≥ 2 rows exist and a group is folded', () => {
  const reason = (registry, collapsed) => {
    M.adapters.setSidebarRowRegistry(registry);
    const contexts = new Map([[M.view.SidebarListContext, { getList: () => listWith(collapsed) }]]);
    const select = fixture(M.blank.SidebarBlankAreaMenu, { showCreateGroup: false, onSelectAll() {} }, contexts).tree.props.groups.select;
    return [select.props.disabled, select.props.disabledReason.props.defaultMessage];
  };
  const three = new Map([['code:a', {}], ['code:b', {}], ['code:c', {}]]);
  try {
    assert.deepEqual(reason({ rows: three, visible: ['code:a'] }, [1]), [true, 'Expand a section to select its sessions.']);
    assert.deepEqual(reason({ rows: three, visible: ['code:a'] }, []), [true, 'You need at least 2 sessions that can be selected.']);
    assert.deepEqual(reason({ rows: new Map([['code:a', {}]]), visible: ['code:a'] }, [1]), [true, 'You need at least 2 sessions that can be selected.']);
    assert.deepEqual(reason({ rows: three, visible: ['code:a', 'code:b'] }, [1]), [false, 'Expand a section to select its sessions.'],
      'enabled: the reason element is passed but the CDS Dropdown item (shared-frame XS) only shows it while disabled (`disabled === !0 && Wc(p)`)');
    assert.deepEqual(M.adapters.sidebarRowKeys(), ['code:a', 'code:b', 'code:c']);
  } finally { resetRegistry(); }
});

// ---------------------------------------------------------------- _B: the host over the list
test('blank-area host (_B): the list is the ContextMenu trigger, its list context covers the list, Select all selects the visible rows', () => {
  const selected = [];
  const disconnect = M.adapters.connectSidebarSelection((keys) => selected.push(keys));
  M.adapters.setSidebarRowRegistry({ rows: new Map([['code:a', {}], ['code:b', {}]]), visible: ['code:b', 'code:a'] });
  const list = React.createElement('div', { className: 'df-session-list flex flex-col' }, 'rows');
  const onNewSession = () => {};
  try {
    const f = fixture(M.blank.SidebarBlankAreaHost, { enabled: true, showCreateGroup: true, onNewSession, children: list });
    f.flush();
    const provider = f.tree;
    assert.equal(provider.props.value.onNewSession, onNewSession);
    assert.equal(typeof provider.props.value.onNewSection, 'function', 'showCreateGroup: New section… opens _B\'s own dialog');
    assert.equal(provider.props.value.getList(), null, 'getList reads the trigger ref (the list element once mounted)');
    const [root, modal] = provider.props.children;
    assert.equal(root.type, M.adapters.SidebarContextMenu.Root);
    const [trigger, popup] = root.props.children;
    assert.equal(trigger.type, M.adapters.SidebarContextMenu.Trigger);
    assert.equal(trigger.props.render, list, 'the list element itself is the trigger (official AS df-session-list)');
    assert.equal(typeof trigger.props.onContextMenuCapture, 'function');
    assert.equal(popup.type, M.adapters.SidebarContextMenu.Popup);
    const body = popup.props.children;
    assert.equal(body.type, M.blank.SidebarBlankAreaMenu);
    assert.equal(body.props.showCreateGroup, true);
    body.props.onSelectAll();
    assert.deepEqual(selected, [['code:b', 'code:a']], 'Nu.setSelection(wu()): the visible rows in list order, through the host selection');
    // vB: _B registers its dialog as the "New section…" opener (a section view menu's sU → dB).
    assert.equal(typeof M.filter.newSectionOpener.getState().open, 'function');
    assert.equal(modal.type, M.dialog.CreateGroupDialog);
    assert.equal(modal.props.isOpen, false);
    M.filter.openNewSection();
    f.render();
    assert.equal(f.tree.props.children[1].props.isOpen, true, 'dB opened _B\'s new-section dialog');
    // The menu's open state holds the frame store's overflow flag (onOpenChange with Base UI's event details).
    root.props.onOpenChange(true, { event: {} });
    assert.equal(M.adapters.useSidebarSectionsStore.getState().overflowMenuOpen, true);
    root.props.onOpenChange(false, { event: undefined });
    assert.equal(M.adapters.useSidebarSectionsStore.getState().overflowMenuOpen, false);
    f.close();
    assert.equal(M.filter.newSectionOpener.getState().open, null, 'unregistered on unmount');
    // Disabled (another mode): the list renders as it is.
    assert.equal(fixture(M.blank.SidebarBlankAreaHost, { enabled: false, children: list }).tree, list);
  } finally { disconnect(); resetRegistry(); }
});

// ---------------------------------------------------------------- R4g-sidebar SB3 (X7-06): the CDS ContextMenu
// shared-20 yx (`Ii as Vs`), shared-19 g$ (`Ii as Rf`) and shared-21 _B (`Ii as uf`) open shared-frame iD (view-tabs
// CdsContextMenu); the rows inside are shared-16 au / cu / lu over `K` = shared-frame EC (`qa as K`), the CDS Dropdown.
test('ContextMenu: shared-frame iD is view-tabs CdsContextMenu; the rows are shared-16 K = CDS Dropdown parts, SourceMenu only in a host SourceMenu body', async () => {
  const count = (text, needle) => text.split(needle).length - 1;
  const chunk = async (prefix) => read(path.join(reference, (await fs.readdir(reference)).find((name) => name.startsWith(prefix) && name.endsWith('.js'))));
  const [frame, s16, s19, s20, s21] = await Promise.all(['shared-frame-BfjMqbuN', 'shared-16-', 'shared-19-', 'shared-20-', 'shared-21-'].map(chunk));
  for (const [text, needle, times] of [
    [frame, 'iD={Root:tD,Trigger:E,Popup:eD,Item:EC.Item,Separator:EC.Separator,Group:EC.Group', 1], [frame, 'iD as Ii', 1], [frame, 'EC as qa', 1],
    [frame, 'QE=q((e,t)=>H(Wx,{ref:t,"data-cds":"ContextMenu",...e}))', 1],
    [s16, 'qa as K,', 1], [s16, 'function au(e){return s(iu,{children:s(K.Item,{...e})})}', 1], [s16, 'l=(t||i>0)&&s(K.Separator,{})', 1],
    [s16, 'r&&s(K.Separator,{}),s(K.Group,{role:n?"group":"presentation",children:i})', 1],
    [s20, ',Ii as Vs,', 1], [s20, 'Vs.Root,', 2], [s19, ',Ii as Rf,', 1], [s19, 'Rf.Root,', 5], [s21, ',Ii as uf,', 1], [s21, 'uf.Root,', 4],
  ]) assert.equal(count(text, needle), times, needle);
  // The context menu name every section menu imports is CdsContextMenu itself; its rows are the CDS Dropdown's.
  const { CdsContextMenu, CdsDropdown } = M.viewTabs;
  assert.equal(M.adapters.SidebarContextMenu, CdsContextMenu);
  for (const part of ['Item', 'Separator', 'Group']) assert.equal(CdsContextMenu[part], CdsDropdown[part], part);
  // code-current sidebar-menu-groups.mjs (D19: `--only sidebar-menu-groups.mjs`): K is the host kit, nothing else changed.
  const generated = await read(path.join(app, 'src/generated/code-current/sidebar-menu-groups.mjs'));
  assert.equal(count(generated, 'import { SidebarMenuKit as K } from "../../source-sidebar-menu-kit.jsx";'), 1);
  assert.equal(count(generated, 'source-menu.jsx'), 0);
  const entry = JSON.parse(await read(path.join(app, 'src/generated/code-current/manifest.json'))).modules.find((m) => m.target === 'sidebar-menu-groups.mjs');
  assert.deepEqual([entry.referenceVersion, path.basename(entry.source), entry.bindings], ['2.42304.0', 'shared-16-B0xHzPjj.js', ['ru', 'iu', 'au', 'cu', 'lu', 'uu']]);
  assert.equal(entry.sha256, createHash('sha256').update(generated).digest('hex'));
  // The kit: EC's parts by default (the section menus' CDS ContextMenu), SourceMenu's inside SourceMenuRows.
  const provider = fixture(M.kit.SourceMenuRows, { children: 'rows' }).tree;
  const RowsContext = provider.type._context ?? provider.type;
  const inSourceMenu = new Map([[RowsContext, provider.props.value]]);
  for (const part of ['Item', 'Separator', 'Group']) {
    assert.equal(fixture(M.kit.SidebarMenuKit[part], { 'data-x': '' }).tree.type, CdsDropdown[part], `${part}: CDS by default`);
    assert.equal(fixture(M.kit.SidebarMenuKit[part], { 'data-x': '' }, inSourceMenu).tree.type, M.sourceMenu.SourceMenu[part], `${part}: SourceMenu in a SourceMenu body`);
  }
  assert.deepEqual([fixture(M.kit.useSidebarMenuRowsKind).tree, fixture(M.kit.useSidebarMenuRowsKind, {}, inSourceMenu).tree], ['cds', 'source-menu']);
  // SSR: au in the CDS ContextMenu is a Base UI menu item with the CDS item classes; in a SourceMenu body a SourceMenu row.
  const item = h(M.items.SidebarMenuItem, { onClick() {} }, 'New session');
  const cds = renderToStaticMarkup(h(CdsContextMenu.Root, { open: true }, item));
  assert.match(cds, /^<div role="menuitem" id="base-ui-[^"]*" tabindex="-1" class="cds-reset flex w-full items-center gap-xs [^"]*"><span class="min-w-0 flex-1 truncate">New session<\/span><\/div>$/);
  const host = renderToStaticMarkup(h(M.kit.SourceMenuRows, null, item));
  assert.match(host, /role="menuitem"[^>]*class="smenu-item"[\s\S]*New session/);
  // The host's own SourceMenu popups (row / group / blank-area / Older menus, the title bar's session menu) keep their rows.
  const popup = fixture(M.sidebar.SourceSidebarMenu, { label: 'Session options', onClose() {}, children: 'rows' }).tree;
  assert.equal(popup.type, M.sourceMenu.SourceMenu.Popup);
  assert.deepEqual([popup.props.children.type, popup.props.children.props.children], [M.kit.SourceMenuRows, 'rows']);
});

// A small fake DOM (as tests/sidebar-reorder-current): enough for react-dom and Base UI's ContextMenu (floating-ui
// positioning over a cursor anchor, the CDS portal, focus management).
function createDom() {
  class Events {
    addEventListener(type, fn, options) { const capture = options === true || !!options?.capture; (this.__l ??= []).push({ type, fn, capture }); options?.signal?.addEventListener?.('abort', () => this.removeEventListener(type, fn, options)); }
    removeEventListener(type, fn, options) { const capture = options === true || !!options?.capture; this.__l = (this.__l ?? []).filter((l) => !(l.type === type && l.fn === fn && l.capture === capture)); }
    dispatchEvent(event) { for (const l of [...(this.__l ?? [])]) if (l.type === event.type) l.fn.call(this, event); return !event.defaultPrevented; }
  }
  class Node extends Events {}
  Object.assign(Node, { ELEMENT_NODE: 1, TEXT_NODE: 3, DOCUMENT_NODE: 9, DOCUMENT_POSITION_PRECEDING: 2, DOCUMENT_POSITION_FOLLOWING: 4, DOCUMENT_POSITION_CONTAINS: 8, DOCUMENT_POSITION_CONTAINED_BY: 16 });
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
    get lastChild() { return this.childNodes.at(-1) ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
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
    getRootNode() { let at = this; while (at.parentNode) at = at.parentNode; return at; }
    compareDocumentPosition(other) {
      if (other === this) return 0;
      if (this.contains(other)) return 20;
      if (other.contains?.(this)) return 10;
      const order = document.documentElement.findAll(() => true);
      return order.indexOf(other) > order.indexOf(this) ? 4 : 2;
    }
    closest(selector) { const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1]; for (let at = this; at?.nodeType === 1; at = at.parentNode) if (attr ? at.hasAttribute(attr) : at.localName === selector) return at; return null; }
    matches() { return false; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { top: 0, bottom: 20, left: 0, right: 200, width: 200, height: 20, x: 0, y: 0 }; }
    getClientRects() { return [this.getBoundingClientRect()]; }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = null; }
    findAll(predicate, out = []) {
      if (predicate(this)) out.push(this);
      for (const child of this.childNodes) if (child.nodeType === 1) child.findAll(predicate, out);
      return out;
    }
  }
  class HTMLElement extends Element {}
  class SVGElement extends Element {}
  class HTMLInputElement extends HTMLElement {}
  Object.assign(document, {
    createElement: (tag) => new HTMLElement(tag),
    createElementNS: (ns, tag) => Object.assign(new SVGElement(tag), { namespaceURI: ns }),
    createTextNode: (text) => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    getSelection: () => ({ removeAllRanges() {} }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    hasFocus: () => true,
  });
  document.documentElement = new HTMLElement('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new HTMLElement('body'));
  class Window extends Events {}
  const window = new Window();
  class Observer { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  const DOMRect = { fromRect: ({ x = 0, y = 0, width = 0, height = 0 } = {}) => ({ x, y, width, height, top: y, left: x, right: x + width, bottom: y + height }) };
  Object.assign(window, { DOMRect, document, Node, Element, HTMLElement, HTMLInputElement, SVGElement, Document, HTMLIFrameElement: class {}, ShadowRoot: class {}, EventTarget: Events,
    KeyboardEvent: class {}, FocusEvent: class {}, MouseEvent: class {}, PointerEvent: class {}, TouchEvent: class {},
    ResizeObserver: Observer, MutationObserver: Observer, IntersectionObserver: Observer,
    innerWidth: 1024, innerHeight: 768, scrollX: 0, scrollY: 0, devicePixelRatio: 1, navigator: { userAgent: 'node', platform: 'MacIntel' }, location: { pathname: '/' },
    getComputedStyle: () => ({ transform: 'none', transformOrigin: '0 0', overflow: 'visible', overflowX: 'visible', overflowY: 'visible', position: 'static', display: 'block', direction: 'ltr', lineHeight: '20px', getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (fn) => globalThis.setTimeout(() => fn(0), 0), cancelAnimationFrame: (id) => globalThis.clearTimeout(id),
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms), clearTimeout: (id) => globalThis.clearTimeout(id),
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms), clearInterval: (id) => globalThis.clearInterval(id) });
  window.window = window;
  document.defaultView = window;
  return { window, document, Node, Element, HTMLElement, HTMLInputElement };
}
async function withDom(run) {
  const dom = createDom();
  const globals = [['window', dom.window], ['document', dom.document], ['Node', dom.Node], ['HTMLElement', dom.HTMLElement], ['HTMLInputElement', dom.HTMLInputElement],
    ['Element', dom.Element], ['navigator', dom.window.navigator], ['getComputedStyle', dom.window.getComputedStyle], ['requestAnimationFrame', dom.window.requestAnimationFrame],
    ['cancelAnimationFrame', dom.window.cancelAnimationFrame], ['ResizeObserver', dom.window.ResizeObserver], ['MutationObserver', dom.window.MutationObserver],
    ['DOMRect', dom.window.DOMRect]];
  const saved = globals.map(([name]) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const [name, value] of globals) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
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
// A native event at `target`, delivered along its ancestors the way the browser would (capture listeners top-down, then
// bubble listeners bottom-up until something stops it): React listens on the root and on each portal container.
function fire(container, type, target, extra = {}) {
  const event = Object.assign({ type, target, bubbles: true, cancelable: true, defaultPrevented: false, button: type === 'contextmenu' ? 2 : 0, buttons: 0, clientX: 30, clientY: 40,
    detail: 1, pointerType: 'mouse', timeStamp: Date.now(), composedPath: () => { const path = []; for (let at = target; at; at = at.parentNode) path.push(at); return path; },
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; } }, extra);
  const path = event.composedPath();
  for (const node of [...path].reverse()) for (const l of [...(node.__l ?? [])]) if (l.type === type && l.capture) l.fn.call(node, event);
  for (const node of path) {
    for (const l of [...(node.__l ?? [])]) if (l.type === type && !l.capture) l.fn.call(node, event);
    if (event.propagationStopped) break;
  }
  return event;
}
const openMenus = (dom) => dom.document.documentElement.findAll((el) => el.getAttribute('data-cds') === 'ContextMenu');
const menuItems = (menu) => menu.findAll((el) => el.getAttribute('role') === 'menuitem');

test('controlled right-click: the list opens _B\'s CDS ContextMenu, a section header yx\'s; their rows are Base UI items that run their action', async () => {
  const actions = [];
  const disconnect = M.adapters.connectSidebarBlankArea({ newSession: () => actions.push('host-new'), newEnvironment() {} });
  M.adapters.setSidebarRowRegistry({ rows: new Map([['code:a', {}], ['code:b', {}]]), visible: ['code:a', 'code:b'] });
  try {
    await withDom(async ({ dom, container, root, logged }) => {
      const header = h(M.menu.SidebarGroupMenu, { groupName: 'Alpha', groupEditsHidden: true, onNewSession: () => actions.push('alpha-new'),
        section: h('div', { 'data-group-key': 'project:/w/alpha' }), greyed: M.reasons.groupDisabledReasons('worked-out', true),
        children: () => h('button', { 'data-group-toggle': '', 'aria-expanded': 'true' }, 'Alpha') });
      await act(async () => {
        root.render(h(M.blank.SidebarBlankAreaHost, { enabled: true, showCreateGroup: false, onNewSession: () => actions.push('list-new'),
          children: h('div', { className: 'df-session-list flex flex-col' }, header) }));
      });
      const list = container.findAll((el) => el.getAttribute('class') === 'df-session-list flex flex-col')[0];
      assert.ok(list, 'the list element is _B\'s trigger (render: i)');
      assert.equal(list.style.WebkitTouchCallout ?? list.style['-webkit-touch-callout'], 'none', 'Base UI ContextMenuTrigger props on the list element');
      assert.equal(openMenus(dom).length, 0);
      // Right-click the blank area: Base UI's trigger opens _B's menu at the cursor (and stops the native menu).
      const blankPress = await act(async () => fire(container, 'contextmenu', list));
      assert.equal(blankPress.defaultPrevented, true);
      let menus = openMenus(dom);
      assert.equal(menus.length, 1, 'one CDS ContextMenu popup');
      assert.equal(menus[0].getAttribute('role'), 'menu');
      assert.deepEqual(menuItems(menus[0]).map((el) => el.textContent), ['New session', 'Select all'], 'yB: session, select (no fold rows: nothing to fold)');
      assert.ok(menuItems(menus[0]).every((el) => /^cds-reset flex w-full items-center/.test(el.getAttribute('class'))), 'CDS Dropdown item classes');
      // Its New session row (mB: the list context's onNewSession) runs and the menu closes.
      await act(async () => { fire(container, 'click', menuItems(menus[0])[0], { detail: 1 }); });
      assert.deepEqual(actions, ['list-new']);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
      assert.equal(openMenus(dom).filter((menu) => menu.getAttribute('data-open') !== null).length, 0, 'closed after the row ran');
      // Right-click the section header: yx's own menu; its trigger stops the press, so the list menu does not open too.
      const toggle = container.findAll((el) => el.hasAttribute('data-group-toggle'))[0];
      await act(async () => fire(container, 'contextmenu', toggle));
      menus = openMenus(dom).filter((menu) => menu.getAttribute('data-open') !== null);
      assert.equal(menus.length, 1, 'only the header menu');
      const rows = menuItems(menus[0]).map((el) => el.textContent);
      assert.equal(rows[0], 'New session');
      assert.ok(!rows.includes('Select all'), 'not the blank-area menu');
      await act(async () => { fire(container, 'click', menuItems(menus[0])[0], { detail: 1 }); });
      assert.deepEqual(actions, ['list-new', 'alpha-new']);
      assert.deepEqual(logged.map((args) => String(args[0]).slice(0, 120)), [], 'no React or Base UI errors');
    });
  } finally { disconnect(); resetRegistry(); }
});

// ---------------------------------------------------------------- folder buckets (sT → bC "worked-out")
test('folderBucketMenu: order slots for folders other than Other, move saves the moved order, Sort A to Z only with a stored folder order', () => {
  const saved = [];
  const options = (projectOrder) => ({ order: ['/a', '/b', '/c'], projectOrder, newSession: () => {}, save: (ids) => saved.push(ids) });
  const folder = (projectKey) => ({ kind: 'project', key: `project:${projectKey}`, projectKey });
  assert.equal(Layout.folderBucketMenu({ kind: 'date', key: 'today' }, options([])), null, 'date / status buckets: no groupMenuKind');
  assert.equal(Layout.folderBucketMenu(folder('/a'), { order: ['/a'] }), null, 'no way to store an order: the host has no menu for it');
  const b = Layout.folderBucketMenu(folder('/b'), options([customOrderKey('g1')]));
  assert.deepEqual([b.order.index, b.order.count, b.order.reset], [1, 3, undefined], 'only the legacy ccg:: order is stored: no Sort A to Z');
  b.order.move(1, 0);
  assert.deepEqual(saved.at(-1), [customOrderKey('g1'), '/b', '/a', '/c']);
  b.order.move(0, 0); b.order.move(1, 3);
  assert.equal(saved.length, 1, 'out-of-range and no-op moves are ignored (nT fe)');
  const stored = Layout.folderBucketMenu(folder('/c'), options([customOrderKey('g1'), '/c', '/a', '/gone']));
  assert.equal(typeof stored.order.reset, 'function');
  stored.order.reset();
  assert.deepEqual(saved.at(-1), [customOrderKey('g1')], 'H([]) for the folder order; the legacy ccg:: keys stay (D10)');
  const other = Layout.folderBucketMenu(folder(OTHER_PROJECT_KEY), options(['/a']));
  assert.equal(other.order, null, 'Other has no order slot (nT X skips project-__no_project__)');
});

test('folder buckets render the original yx as a worked-out group inside x$; Other is greyed with place-unknown', () => {
  const sessions = [thread('a1'), thread('a2'), thread('b1', { cwd: '/w/beta' }), thread('o1', { cwd: '' })];
  const sections = Layout.sidebarSectionsList({ sidebarSections: [{ id: 'pinned', kind: 'pinned', order: 0 }, { id: 'sessions', kind: 'sessions', order: 1, groupBy: 'environment' }] });
  const model = Layout.buildSidebarSections({ sections, sessions, preferences: {}, knownFolders: [] });
  const keys = model.layout.at(-1).buckets.map((bucket) => bucket.key);
  assert.deepEqual(keys, ['project:/w/alpha', 'project:/w/beta', `project:${OTHER_PROJECT_KEY}`]);
  const saved = [];
  const host = { renderRows: () => null, shiftStyle: () => undefined, toggle() {}, folded: new Set(['project:/w/beta']), dropTargets: true, headerControls: null, trailing: () => null,
    folderMenu: (group) => Layout.folderBucketMenu(group, { order: ['/w/alpha', '/w/beta'], projectOrder: ['/w/beta'], newSession: group.cwd ? () => saved.push(['new', group.cwd]) : undefined, save: (ids) => saved.push(ids) }) };
  const list = fixture(M.sections.SidebarSectionsList, { model, host }).tree;
  // R4g-sidebar SB2: the Sessions buckets render in their own component, nT's shared-19 S$ around the folder buckets.
  const sessionsNode = nodes(list, (n) => n.props?.entry?.kind === 'sessions' && n.props?.host)[0];
  const sessionsTree = fixture(sessionsNode.type, sessionsNode.props).tree;
  assert.deepEqual([...sessionsTree.props.positionByBucketKey], [['project:/w/alpha', '/w/alpha'], ['project:/w/beta', '/w/beta']]);
  const buckets = nodes(sessionsTree, (n) => n.props?.menu && n.props?.bucket);
  assert.deepEqual(buckets.map((n) => n.props.bucket.key), keys);
  const [alpha, beta, other] = buckets.map((n) => fixture(n.type, n.props).tree);
  // alpha / beta: x$ (sT pn) with the order slot, Sort A to Z (a folder order is stored), no keyboard reorder.
  assert.equal(alpha.type, M.sortable.SectionSortable);
  assert.deepEqual([alpha.props.bucketKey, alpha.props.sectionIndex, alpha.props.sectionCount, alpha.props.resetsToRecent, alpha.props.keyboardReorder],
    ['project:/w/alpha', 0, 2, false, undefined]);
  assert.equal(typeof alpha.props.onResetOrder, 'function');
  const menu = alpha.props.children;
  assert.equal(menu.type, M.menu.SidebarGroupMenu);
  assert.deepEqual([menu.props.groupId, menu.props.groupEditsHidden, menu.props.onCreateGroup, menu.props.bulkBucketKey, menu.props.groupName, menu.props.onExpand],
    [undefined, true, undefined, 'project:/w/alpha', 'alpha', undefined]);
  assert.deepEqual(menu.props.greyed, M.reasons.groupDisabledReasons('worked-out', true));
  assert.equal(menu.props.section.props['data-group-key'], 'project:/w/alpha');
  assert.match(menu.props.section.props.className, /group\/section relative isolate flex flex-col gap-px rounded-lg/);
  menu.props.onNewSession();
  assert.deepEqual(saved.at(-1), ['new', '/w/alpha']);
  alpha.props.onMoveSection(0, 1, 'menu');
  assert.deepEqual(saved.at(-1), ['/w/beta', '/w/alpha']);
  // The heading inside yx's trigger: uD kind "group" in f$ with `menu: !V` (false) and bC's bulk key.
  const inner = menu.props.children();
  const gate = byType(inner, M.reorder.SectionReorderGate)[0];
  assert.deepEqual([gate.props.menu, gate.props.bulkBucketKey, gate.props.groupName], [false, 'project:/w/alpha', 'alpha']);
  // beta is folded: onExpand is its toggle (aZ expands before it selects).
  assert.equal(typeof beta.props.children.props.onExpand, 'function');
  // Other: no x$, New session greyed with place-unknown.
  assert.equal(other.type, M.menu.SidebarGroupMenu);
  assert.equal(other.props.onNewSession, undefined);
  assert.equal(other.props.greyed.newSession.defaultMessage, 'Where these sessions run isn’t known, so there’s nowhere to start a new one.');
});

test('worked-out yx items: New session, Move up / Move down / Sort A to Z from x$, Select all, view, Archive all; no Rename / Delete / New section', () => {
  const props = { groupName: 'alpha', groupEditsHidden: true, onNewSession() {}, bulkBucketKey: 'project:/w/alpha', section: React.createElement('div'),
    greyed: M.reasons.groupDisabledReasons('worked-out', true), children: () => null };
  const groups = nodes(fixture(M.menu.SidebarGroupMenu, props).tree, (n) => n.props?.groups)[0].props.groups;
  assert.deepEqual(Object.keys(groups), ['new', 'edit', 'organize', 'view', 'staff', 'remove']);
  assert.deepEqual(byType(groups.new, M.items.SidebarMenuItem).map(message), ['New session']);
  assert.deepEqual(byType(groups.edit, M.items.SidebarMenuItem).map(message), [], 'groupEditsHidden: no Rename');
  assert.equal(byType(groups.edit, M.reorder.SectionReorderItems).length, 1);
  assert.equal(byType(groups.organize, M.organize.SidebarGroupSelectAll)[0].props.bucketKey, 'project:/w/alpha');
  assert.deepEqual(byType(groups.remove, M.items.SidebarMenuItem).map(message), [], 'no Delete');
  assert.equal(byType(groups.remove, M.archive.SidebarGroupArchiveAll)[0].props.groupName, 'alpha');
  // m$ inside x$: Move up / Move down where the bucket can move, Sort A to Z with a stored order.
  const sortable = fixture(M.sortable.SectionSortable, { bucketKey: 'project:/w/alpha', sectionIndex: 0, sectionCount: 2, onMoveSection() {}, onResetOrder() {}, resetsToRecent: false, children: 'x' });
  const ctx = sortable.tree.props.children.props.value;
  const actions = fixture(M.reorder.SectionReorderItems, { fixedReason: undefined }, new Map([[M.reorder.SectionReorderContext, ctx]])).tree;
  assert.equal(actions.type, M.reorder.SectionReorderActions);
  const rows = fixture(actions.type, actions.props).tree.props.children.filter(Boolean);
  assert.deepEqual(rows.map(message), ['Move down', 'Sort A to Z']);
  // Other (no x$): Move up / Move down greyed with "This group stays at the end of the list."
  const fixed = fixture(M.reorder.SectionReorderItems, { fixedReason: props.greyed.reorder ? React.createElement('span', null, 'fixed') : undefined }).tree;
  const greyed = fixed.props.children;
  assert.deepEqual(greyed.map((item) => [message(item), item.props.disabled]), [['Move up', true], ['Move down', true]]);
  assert.equal(props.greyed.reorder.defaultMessage, 'This group stays at the end of the list.');
  // Other's New session: disabled with the place-unknown reason.
  const otherGroups = nodes(fixture(M.menu.SidebarGroupMenu, { ...props, onNewSession: undefined, greyed: M.reasons.groupDisabledReasons('worked-out', false) }).tree, (n) => n.props?.groups)[0].props.groups;
  const newSession = byType(otherGroups.new, M.items.SidebarMenuItem)[0];
  assert.deepEqual([message(newSession), newSession.props.disabled], ['New session', true]);
  assert.match(newSession.props.disabledReason.props.defaultMessage, /^Where these sessions run/);
});

test('folder buckets are ordered by name (shared-19 c2) until a stored order names a present folder, then ranked first and the rest most recent first', () => {
  const sessions = [thread('b', { cwd: '/w/beta', updatedAt: now }), thread('a', { cwd: '/w/alpha', updatedAt: now - 60 }), thread('g', { cwd: '/w/gamma', updatedAt: now - 120 }),
    thread('d', { cwd: '/w/delta', updatedAt: now - 30 })];
  const labels = (projectOrder, sortBy = 'recency') => buildSidebarGroups({ sessions, preferences: { groupBy: 'project', sortBy }, projectOrder, currentLayout: true }).map((group) => group.label);
  assert.deepEqual(labels([]), ['alpha', 'beta', 'delta', 'gamma'], 'no stored order: by name, whatever the sort');
  assert.deepEqual(labels([], 'created'), ['alpha', 'beta', 'delta', 'gamma']);
  assert.deepEqual(labels(['/w/missing']), ['alpha', 'beta', 'delta', 'gamma'], 'an order naming no present folder is the name order');
  assert.deepEqual(labels(['/w/gamma', '/w/alpha']), ['gamma', 'alpha', 'beta', 'delta'], 'ranked, then the rest by latest activity');
  // The classic list keeps its own order (tests/sidebar-model.test.mjs).
  assert.deepEqual(buildSidebarGroups({ sessions, preferences: { groupBy: 'project' } }).map((group) => group.label), ['beta', 'delta', 'alpha', 'gamma']);
  // A shared name sorts by its disambiguation next.
  const twins = [thread('x', { cwd: '/q/work' }), thread('y', { cwd: '/p/work', updatedAt: now + 5 })];
  assert.deepEqual(buildSidebarGroups({ sessions: twins, preferences: { groupBy: 'project' }, currentLayout: true }).map((group) => group.label), ['work · /p', 'work · /q']);
});

// ---------------------------------------------------------------- SourceSidebar wiring
test('SourceSidebar: the Code list is _B\'s trigger, folder buckets get the worked-out menu, the nav leaves the Code list to _B', () => {
  const oldElement = globalThis.Element;
  class FakeElement { closest() { return null; } }
  globalThis.Element = FakeElement;
  const actions = [];
  const props = { sessions: [thread('one'), thread('two', { cwd: '/w/beta' })], knownFolders: ['/w/alpha', '/w/beta'], sidebarPreferences: {},
    sidebarSections: [{ id: 'pinned', kind: 'pinned', order: 0 }, { id: 'sessions', kind: 'sessions', order: 1, groupBy: 'environment' }],
    projectOrder: [customOrderKey('g'), '/w/beta'], onSessionAction() {}, onCreateGroup() {}, onProject: (cwd) => actions.push(['project', cwd]),
    onGroupAction: (...args) => actions.push(args), onNew: () => actions.push('new'), onCreateEnvironment: () => actions.push('environment') };
  try {
    const f = fixture(M.sidebar.SourceSidebar, props);
    const blank = nodes(f.tree, (n) => n.type === M.sections.SidebarBlankArea)[0];
    assert.ok(blank, 'the Code list is wrapped in the blank-area host');
    assert.deepEqual([blank.props.enabled, blank.props.showCreateGroup, blank.props.onNewSession, blank.props.onNewEnvironment], [true, true, props.onNew, props.onCreateEnvironment]);
    assert.match(blank.props.children.props.className, /^df-session-list /);
    assert.ok(nodes(blank.props.children, (n) => n.type === M.sections.SidebarSectionsList).length === 1, 'the sections list is inside it (its list context)');
    // The nav's own handler no longer opens a host menu in the Code list.
    const nav = nodes(f.tree, (n) => n.type === 'nav')[0];
    nav.props.onContextMenu({ target: new FakeElement(), currentTarget: {}, clientX: 1, clientY: 2, defaultPrevented: false, preventDefault() {} });
    f.render();
    assert.equal(nodes(f.tree, (n) => n.type === M.sidebar.SourceSidebarMenu).length, 0);
    // SidebarBlankArea → _B, connected to the host's New session and environment editor.
    const host = fixture(M.sections.SidebarBlankArea, blank.props);
    assert.equal(host.tree.type, M.blank.SidebarBlankAreaHost);
    assert.equal(host.tree.props.enabled, true);
    host.flush();
    host.tree.props.onNewSession();
    M.adapters.startCodeDraft(M.adapters.useSidebarNavigate(), M.adapters.useHomeRoutes().code);
    M.adapters.requestNewEnvironment();
    assert.deepEqual(actions, ['new', 'new', 'environment']);
    host.close();
    // Folder buckets: the worked-out menu with the stored folder order.
    const { host: sectionsHost, model } = nodes(f.tree, (n) => n.type === M.sections.SidebarSectionsList)[0].props;
    assert.equal(sectionsHost.groupMenu, undefined, 'no host header menu for a folder bucket any more');
    const [beta, alpha] = model.layout.at(-1).buckets;
    assert.deepEqual([beta.key, alpha.key], ['project:/w/beta', 'project:/w/alpha'], 'the stored order ranks beta first');
    const menu = sectionsHost.folderMenu(alpha);
    assert.deepEqual([menu.order.index, menu.order.count, typeof menu.order.reset], [1, 2, 'function']);
    menu.onNewSession();
    menu.order.move(1, 0);
    menu.order.reset();
    assert.deepEqual(actions.slice(-3), [['project', '/w/alpha'], ['project-order', null, { ids: [customOrderKey('g'), '/w/alpha', '/w/beta'] }], ['project-order', null, { ids: [customOrderKey('g')] }]]);
    assert.equal(sectionsHost.folderMenu({ key: 'today', kind: 'date' }), null);
    f.close();
    // Chat keeps the host's own blank-area menu (2.42304.0 mounts _B for the Code list only: `enabled: t === "code"`).
    const chat = fixture(M.sidebar.SourceSidebar, { ...props, mode: 'chat' });
    assert.equal(nodes(chat.tree, (n) => n.type === M.sections.SidebarBlankArea)[0].props.enabled, false);
    nodes(chat.tree, (n) => n.type === 'nav')[0].props.onContextMenu({ target: new FakeElement(), currentTarget: {}, clientX: 1, clientY: 2, defaultPrevented: false, preventDefault() {} });
    chat.render();
    assert.equal(nodes(chat.tree, (n) => n.type === M.sidebar.SourceSidebarMenu)[0].props.kind, 'whitespace');
    chat.close();
  } finally { globalThis.Element = oldElement; }
});

// ---------------------------------------------------------------- multi-selection menu (sidebar-06)
test('multi menu (ce4f4374c Be): flat items, a separator before Move {count} to, section copy, Unarchive only when every row is archived', async () => {
  const copy = (await server.ssrLoadModule('/src/generated/sidebar-sections/group-copy.mjs')).sectionMessages;
  const sessions = [thread('a'), thread('b')];
  const menu = (selected, extra = {}) => renderToStaticMarkup(React.createElement(M.sidebar.SourceSidebarSessionMenu, { session: selected[0], onAction() {}, onClose() {}, onRename() {},
    customGroups: [{ id: 'g', name: 'Research' }], onCreateGroup() {}, sectionCopy: copy, multi: { count: selected.length, sessions: selected, onBulk() {}, ...extra } }));
  const html = menu(sessions, { pin: { count: 2, sessions } });
  assert.doesNotMatch(html, /role="group"/, 'no Menu.Group around the items');
  const sections = html.split('<div role="separator" class="smenu-separator"></div>').map((part) => [...part.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1]));
  assert.deepEqual(sections, [['Pin 2', 'Mark 2 as unread'], ['Move 2 to'], ['Archive 2', 'Delete 2']]);
  const archived = menu([thread('a', { archived: true }), thread('b', { archived: true })]);
  assert.match(archived, /data-label="Unarchive 2"/);
  assert.match(menu([thread('a', { archived: true }), thread('b')]), /data-label="Archive 2"/, 'one live row: Archive (onUnarchive needs every row archived)');
});

test('zh-CN: the blank-area Select all reasons read the R3-sections block', () => {
  const previous = M.i18n.getLocale();
  M.i18n.setLocale('zh-CN');
  try {
    assert.equal(M.i18n.t('Expand a section to select its sessions.'), '展开分区后才能选择其中的会话。');
    assert.equal(M.i18n.t('You need at least 2 sessions that can be selected.'), '至少需要 2 个可选择的会话。');
  } finally { M.i18n.setLocale(previous); }
});
