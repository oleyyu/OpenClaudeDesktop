// R3-sections step 3, work item sidebar-filter-sessionlist-current (research/sidebar-sections.md WI-5; ledger sidebar-17):
// the Code list's Group and sort is 2.42304.0 shared-21 _U / vU / aU / oU in its sessionList layout -- the generated
// code-current sidebar-filter-options / -controls / -view (oU's Se, its sessionList branch, one copy of the controls
// shared with the section view menu) over the view-tabs CDS Dropdown -- and the nested Hide / Show all items moved to the
// command palette (shared-20 _S). Nothing opens a window: generator manifests against an independent parse of the
// original chunk, SSR of the real SourceSidebar, and controlled renders through a hook dispatcher (D21).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import * as Store from '../electron/sidebar-sections-store.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFile(path.join(app, file), 'utf8');
const sha = (text) => createHash('sha256').update(text).digest('hex');
// D21: view-tabs' preload-helper calls document.createElement while it evaluates; sidebar-resize reads documentElement.
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = (id) => server.ssrLoadModule(id);
  M.filter = await load('/src/source-sidebar-filter-current.jsx');
  M.sidebar = await load('/src/source-sidebar.jsx');
  M.sections = await load('/src/source-sidebar-sections.jsx');
  M.adapters = await load('/src/source-sidebar-sections-adapters.jsx');
  M.view = await load('/src/generated/code-current/sidebar-filter-view.mjs');
  M.controls = await load('/src/generated/code-current/sidebar-filter-controls.mjs');
  M.sectionControls = await load('/src/generated/sidebar-sections/section-filter-controls.mjs');
  M.viewTabs = await load('/src/generated/view-tabs/shared-frame-BfjMqbuN.js');
  M.palette = await load('/src/source-sidebar-palette.jsx');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

// ---------------------------------------------------------------- hook dispatcher (D21)
function fixture(component, props = {}) {
  const cells = [], effects = []; let cursor = 0, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (next) => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useReducer(reducer, initial) { const [value, set] = hooks.useState(initial); return [value, (next) => set((old) => reducer(old, next))]; },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useId() { return hooks.useMemo(() => `fixture-${cursor}`, []); },
    useContext(context) { return context._currentValue; },
    use(context) { return context._currentValue; },
    useDebugValue() {},
    useSyncExternalStore(_subscribe, snapshot, serverSnapshot) { return (serverSnapshot ?? snapshot)(); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const old = cells[i]; cells[i] = { deps }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const run = () => { cursor = 0; const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
    internals.H = hooks; try { tree = component(props); } finally { internals.H = previous; } return tree; };
  run();
  return { get tree() { return tree; }, render: run, flush: () => { while (effects.length) effects.shift()(); }, close: () => cells.forEach((c) => c?.cleanup?.()) };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const node = (tree, predicate) => nodes(tree, predicate)[0];

// ---------------------------------------------------------------- generator: the three code-current targets
async function originalOU() {
  const code = await format((await fs.readFile(path.join(reference, 'shared-21-IP-SVetq.js'))).toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const oU = ast.program.body.find((n) => n.type === 'FunctionDeclaration' && n.id?.name === 'oU');
  const found = { Se: [], sessionList: [] };
  const visit = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'VariableDeclarator' && n.id?.name === 'Se') found.Se.push(n.init.arguments[0].body);
    if (n.type === 'ConditionalExpression' && code.slice(n.test.start, n.test.end) === 't === "sessionList"' && n.consequent.callee?.name === 'f') found.sessionList.push(n.consequent);
    for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v);
  };
  visit(oU);
  return { code, found };
}

test('code-current sidebar-filter-options / -view are shared-21 oU (2.42304.0): its Se and its sessionList branch, verbatim', async () => {
  const manifest = JSON.parse(await read('src/generated/code-current/manifest.json'));
  const entry = (target) => manifest.modules.find((m) => m.target === target);
  const { code, found } = await originalOU();
  assert.equal(found.Se.length, 1); assert.equal(found.sessionList.length, 1);
  const options = entry('sidebar-filter-options.mjs'), view = entry('sidebar-filter-view.mjs'), controls = entry('sidebar-filter-controls.mjs');
  for (const m of [options, view, controls]) assert.deepEqual([m.referenceVersion, path.basename(m.source)], ['2.42304.0', 'shared-21-IP-SVetq.js'], m.target);
  const fragment = (n) => code.slice(n.start, n.end);
  assert.deepEqual(options.sourceSelections.map((s) => [s.binding, s.local, s.fragmentSha256]), [['oU', 'Se', sha(fragment(found.Se[0]))]]);
  assert.deepEqual(view.sourceSelections.map((s) => [s.binding, s.test, s.callee, s.fragmentSha256]), [['oU', 't === "sessionList"', 'f', sha(fragment(found.sessionList[0]))]]);
  assert.deepEqual(controls.bindings, [], 'controls: a re-export of the one sidebar-sections copy');
  const viewText = await read('src/generated/code-current/sidebar-filter-view.mjs');
  // oU's dt reaches sU as atDefaults: !dt (the selection's resetAvailable parameter).
  assert.match(viewText, /resetAvailable: dt,/); assert.match(viewText, /_\(sU, \{ atDefaults: !dt, onReset: ft \}\)/);
  assert.match(viewText, /import \{ CdsDropdown as X \} from "\.\.\/view-tabs\/shared-frame-BfjMqbuN\.js";/);
  for (const text of [viewText, await read('src/generated/code-current/sidebar-filter-controls.mjs'), await read('src/generated/code-current/sidebar-filter-options.mjs')]) {
    assert.doesNotMatch(text, /source-menu\.jsx|source-sidebar-filter-adapters|nested-session-copy|allNestedToggleLabel|hideAllNested|cds-merge-props/);
    assert.doesNotMatch(text, /Original Claude Desktop 2\.37337\.1/);
  }
  // JC (old shared-20 Hide / Show all nested copy) was deleted in 2.42304.0; it is not re-pointed to shared-2 PH (pin copy).
  assert.doesNotMatch(viewText + (await read('src/generated/code-current/sidebar-filter-controls.mjs')), /pinFailed|unpinFailed|\bPH\b|\bJC\b/);
  await fs.access(path.join(app, 'src/source-sidebar-filter-adapters.jsx')).then(() => assert.fail('the 2.37337.1 filter adapters are gone'), () => {});
});

test('one copy of the controls: code-current re-exports the sidebar-sections slice (KH, uU, dU, lU, sU, cU, aU, CB, hU, gU)', () => {
  for (const name of ['SidebarViewAllContext', 'SidebarOptionMenu', 'SidebarSortMenu', 'useSidebarSortOptions', 'SidebarViewResetItems', 'SidebarViewAllItem',
    'SidebarFilterTrigger', 'trailingControlClass', 'focusSidebarAfterRegroup', 'useSidebarRegroupFocus', 'sortAscendingShown', 'sortAscendingStored'])
    assert.equal(M.controls[name], M.sectionControls[name], name);
  assert.equal(M.controls.SidebarNestedVisibilityItems, undefined);
});

// ---------------------------------------------------------------- the trigger and its menu (shared-21 _U / vU / aU)
test('SourceCodeSidebarFilter (_U + vU): CB span, aU trigger on the lazy menu handle, the body mounts on the first press, open state and regroup focus', () => {
  const store = M.adapters.useSidebarSectionsStore;
  const focused = [];
  const heading = { focus: () => focused.push('heading') };
  const list = { ownerDocument: { body: {}, activeElement: null }, querySelector: (selector) => selector === '[data-group-toggle]' ? heading : null };
  const f = fixture(M.filter.SourceCodeSidebarFilter, { preferences: { groupBy: 'project' }, listRef: { current: list } });
  f.flush();
  const span = () => f.tree.props.children[0];
  const trigger = () => span().props.children;
  assert.equal(span().type, 'span');
  assert.equal(span().props.className, M.controls.trailingControlClass(false, false), 'hidden until the label row is hovered');
  // aU: CDS Tooltip {content, hoverable:false, open: !n && void 0} around the CDS Dropdown trigger rendering CdsButton.
  assert.equal(trigger().type, M.viewTabs.CdsTooltip);
  assert.deepEqual([trigger().props.content, trigger().props.hoverable, trigger().props.open], ['Group and sort', false, undefined]);
  const button = trigger().props.children;
  assert.equal(button.type, M.viewTabs.CdsDropdown.Trigger);
  assert.equal(button.props.className, M.filter.FILTER_TRIGGER_MARKER);
  assert.equal(button.props['aria-expanded'], false);
  assert.equal(typeof button.props.onFocusCapture, 'function', 'L$ trigger props');
  assert.equal(typeof button.props.handle?.open, 'function', 'a CdsMenuCreateHandle handle');
  assert.deepEqual([button.props.render.type, button.props.render.props.icon, button.props.render.props.variant, button.props.render.props.className, button.props.render.props['aria-label'],
    button.props.render.props.tooltip, button.props.render.props.size], [M.viewTabs.CdsButton, 'Filter', 'ghost', 'df-chrome-btn relative -my-1', 'Group and sort', false, 'xs']);
  // aU `size: a ? "sm" : i ? "xs" : void 0`: comfortable here (no CDS density around); the sidebar heading is compact (Shift).
  assert.equal(f.tree.props.children[1], false, 'no menu body before the first press (L$)');
  button.props.onFocusCapture();
  f.render();
  const menu = () => f.tree.props.children[1];
  assert.equal(menu().type, M.filter.SessionListFilterMenu);
  assert.equal(menu().props.handle, button.props.handle);
  assert.equal(menu().props.open, false);
  // Opening: the trigger shows expanded, CB keeps the span shown, the tooltip is held closed, the overflow flag is set.
  menu().props.onOpenChange(true, 'trigger-id');
  f.render(); f.flush();
  assert.deepEqual([menu().props.open, span().props.className, trigger().props.open, trigger().props.children.props['aria-expanded']],
    [true, M.controls.trailingControlClass(true, false), false, true]);
  assert.equal(store.getState().overflowMenuOpen, true);
  // A keyboard regroup, then the close: gU focuses the list's first heading (hU).
  menu().props.onRegroup(true);
  menu().props.onRegroup(false);
  f.render(); f.flush();
  assert.deepEqual(focused, []);
  menu().props.onOpenChange(false);
  f.render(); f.flush();
  assert.deepEqual(focused, ['heading']);
  assert.equal(store.getState().overflowMenuOpen, false);
  f.close();
});

test('SSR: the Sessions heading carries the original trigger once; the menu body is not rendered until it is asked for', () => {
  const now = Math.floor(Date.now() / 1000);
  const html = renderToStaticMarkup(React.createElement(M.sidebar.SourceSidebar, { knownFolders: ['/fixture/work'],
    sessions: [{ id: 'a', name: 'A', cwd: '/fixture/work', createdAt: now, updatedAt: now }], onSessionAction() {} }));
  const triggers = [...html.matchAll(/<span class="([^"]*)"><button([^>]*)>/g)].filter((m) => /aria-label="Group and sort"/.test(m[2]));
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0][1], 'flex w-0 overflow-hidden group-hover/labelrow:w-auto group-hover/labelrow:overflow-visible group-has-[:focus-visible]/labelrow:w-auto group-has-[:focus-visible]/labelrow:overflow-visible touch:w-auto touch:overflow-visible');
  for (const attribute of ['data-cds="Button"', 'aria-haspopup="menu"', 'aria-expanded="false"', 'data-row-action=""', 'data-base-ui-tooltip-trigger=""'])
    assert.ok(triggers[0][2].includes(attribute), attribute);
  assert.match(triggers[0][2], /class="[^"]*df-chrome-btn relative -my-1 source-current-filter-button"/);
  assert.doesNotMatch(html, /role="menu"|Reset to defaults|Hide all nested/);
});

// ---------------------------------------------------------------- View all's context (HQ) around the whole list
test('HQ: SidebarSectionsList provides View all (KH) around the list, so the Sessions filter and every section view menu read one value', () => {
  const opened = [];
  const host = { viewAll: { onViewAll: () => opened.push('page'), listSettled: true, archivedInHand: true } };
  const model = { layout: [], buckets: [] };
  const f = fixture(M.sections.SidebarSectionsList, { model, host });
  assert.equal(f.tree.type, M.sectionControls.SidebarViewAllContext);
  assert.equal(f.tree.props.value, host.viewAll.onViewAll);
  const loading = fixture(M.sections.SidebarSectionsList, { model, host: { viewAll: { ...host.viewAll, listSettled: false } } }).tree;
  assert.equal(loading.props.value, 'loading');
  assert.equal(fixture(M.sections.SidebarSectionsList, { model, host: { viewAll: { ...host.viewAll, archivedInHand: false } } }).tree.props.value, null);
});

// ---------------------------------------------------------------- the sidebar's wiring
const listeners = { addEventListener() {}, removeEventListener() {} };
function withDom(run) {
  const savedWindow = globalThis.window, savedDoc = globalThis.document;
  globalThis.window = { ...listeners, requestAnimationFrame: () => 0 };
  globalThis.document = { ...documentStub, ...listeners, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, activeElement: null };
  try { return run(); } finally {
    M.adapters.useSidebarSectionsStore.setState(Store.sidebarSectionsStoreSlice({}));
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    globalThis.document = savedDoc;
  }
}
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });

test('SourceSidebar: the Code list gets the original filter and HQ facts; the chat list keeps its classic Filter', () => withDom(() => {
  const views = [], saved = [];
  const props = { sessions: [thread('a'), thread('b', { archived: true })], knownFolders: ['/fixture/work'], onSessionAction() {},
    onViewAllSessions: (...args) => views.push(args), onSidebarPreferencesChange: (value) => saved.push(value) };
  const f = fixture(M.sidebar.SourceSidebar, props);
  const { host } = node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props;
  const filter = node(host.headerControls, (n) => n.type === M.filter.SourceCodeSidebarFilter);
  assert.ok(filter, 'the Code list heading holds SourceCodeSidebarFilter');
  assert.equal(filter.props.preferences.groupBy, 'project');
  assert.ok('current' in filter.props.listRef);
  assert.deepEqual([host.viewAll.listSettled, host.viewAll.archivedInHand], [true, true]);
  host.viewAll.onViewAll();
  assert.deepEqual(views, [[]], 'View all opens the Sessions page (no archived-only argument)');
  const loading = fixture(M.sidebar.SourceSidebar, { ...props, loading: true });
  assert.equal(node(loading.tree, (n) => n.type === M.sections.SidebarSectionsList).props.host.viewAll.listSettled, false);
  const chat = fixture(M.sidebar.SourceSidebar, { ...props, mode: 'chat' });
  assert.equal(nodes(chat.tree, (n) => n.type === M.filter.SourceCodeSidebarFilter).length, 0);
  assert.ok(nodes(chat.tree, (n) => n.props?.label === 'Filter' && n.props?.icon === 'Filter').length >= 1, 'the classic chat Filter');
  // The bubbled Hide / Show all nested items are no part of any filter menu now.
  assert.equal(nodes(f.tree, (n) => typeof n.props?.children === 'string' && /all nested sessions/.test(n.props.children)).length, 0);
}));

test('SourceSidebar: the command palette carries hide_all_nested_sessions / show_all_nested_sessions for the listed families (shared-20 _S)', () => withDom(() => {
  const saved = [];
  const props = { sessions: [thread('parent'), thread('child', { forkedFromId: 'parent' }), thread('solo')], knownFolders: ['/fixture/work'], onSessionAction() {},
    showSearch: 'default', setShowSearch() {}, onSidebarPreferencesChange: (value) => saved.push(value) };
  const actions = (extra = {}) => node(fixture(M.sidebar.SourceSidebar, { ...props, ...extra }).tree, (n) => n.type === M.palette.SourceSidebarPalette).props.actions;
  const shown = actions(), ids = shown.map((a) => a.id);
  assert.ok(ids.includes('hide_all_nested_sessions') && !ids.includes('show_all_nested_sessions'), ids.join());
  shown.find((a) => a.id === 'hide_all_nested_sessions').run();
  assert.deepEqual(saved.at(-1).collapsedNested, ['parent']);
  const folded = actions({ sidebarPreferences: { collapsedNested: ['parent'] } }).map((a) => a.id);
  assert.ok(folded.includes('show_all_nested_sessions') && !folded.includes('hide_all_nested_sessions'), folded.join());
  // A pinned family is not offered (Gx excludes starred rows); the palette closed computes nothing.
  assert.ok(!actions({ sessionMetadata: { parent: { pinned: true } } }).some((a) => /nested/.test(a.id)));
  assert.ok(!actions({ showSearch: false }).some((a) => /nested/.test(a.id)));
  assert.ok(!actions({ mode: 'chat' }).some((a) => /nested/.test(a.id)));
}));
