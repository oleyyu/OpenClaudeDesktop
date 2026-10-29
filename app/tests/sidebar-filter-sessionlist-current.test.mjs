// R3-sections step 3, work item sidebar-filter-sessionlist-current (research/sidebar-sections.md WI-5; ledger sidebar-17):
// the Code list's Group and sort is shared-21 rY / iY / NJ / PJ in its sessionList layout (3.6556.2, w4-sidebar-filter;
// 2.42304.0 _U / vU / aU / oU) -- the generated code-current sidebar-group-options / -controls / -view (GJ, PJ's
// sessionList block, one copy of the controls shared with the section view menu) over the view-tabs CDS Dropdown -- and
// the nested Hide / Show all items moved to the command palette (shared-20 _S). Nothing opens a window: generator manifests against an independent parse of the
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
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
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
  M.viewTabs = await load('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  M.groupOptions = await load('/src/generated/code-current/sidebar-group-options.mjs');
  M.model = await load('/src/sidebar-filter-current-model.mjs');
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
    internals.H = withMemoCache(hooks); try { tree = component(props); } finally { internals.H = previous; } return tree; };
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
async function originalPJ() {
  const code = await format((await fs.readFile(path.join(reference, 'shared-21-R7LldJ05.js'))).toString(), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const fn = (name) => ast.program.body.find((n) => n.type === 'FunctionDeclaration' && n.id?.name === name);
  const blocks = [];
  const visit = (n) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'IfStatement' && code.slice(n.test.start, n.test.end) === 'n === "sessionList"') blocks.push(n.consequent);
    for (const v of Object.values(n)) if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v);
  };
  visit(fn('PJ'));
  return { code, GJ: fn('GJ'), blocks };
}

test('code-current sidebar-group-options / -view are shared-21 GJ and PJ (3.6556.2): GJ whole, PJ\'s sessionList block, verbatim', async () => {
  const manifest = JSON.parse(await read('src/generated/code-current/manifest.json'));
  const entry = (target) => manifest.modules.find((m) => m.target === target);
  const { code, GJ, blocks } = await originalPJ();
  assert.ok(GJ); assert.equal(blocks.length, 1);
  const options = entry('sidebar-group-options.mjs'), view = entry('sidebar-filter-view.mjs'), controls = entry('sidebar-filter-controls.mjs');
  for (const m of [options, view, controls]) assert.deepEqual([m.referenceVersion, path.basename(m.source)], ['3.6556.2', 'shared-21-R7LldJ05.js'], m.target);
  assert.deepEqual(options.bindings, ['GJ']);
  const optionsText = await read('src/generated/code-current/sidebar-group-options.mjs');
  assert.ok(optionsText.includes(code.slice(GJ.start, GJ.end)), 'GJ verbatim');
  assert.match(optionsText, /export \{ GJ as useSidebarGroupByOptions \};/);
  // GJ: Date / [Status] / Folder (project) / Environment (bYA6fPCd5A) / [Custom] / None.
  for (const needle of ['["date", r]', '["project", o]', 'defaultMessage: "Environment", id: "bYA6fPCd5A"', '["environment", c]', '[i, ...a, s, l, ...u, f]'])
    assert.ok(optionsText.includes(needle), needle);
  assert.deepEqual(view.sourceSelections.map((s) => [s.binding, s.ifTest, s.result, s.cache]), [['PJ', 'n === "sessionList"', 'fn', '$ = J9(482)']]);
  assert.equal(view.sourceSelections[0].fragmentSha256, sha(code.slice(blocks[0].start, blocks[0].end)));
  assert.deepEqual(controls.bindings, [], 'controls: a re-export of the one sidebar-sections copy');
  const viewText = await read('src/generated/code-current/sidebar-filter-view.mjs');
  // PJ's Zt reaches UJ as atDefaults: !Zt (the selection's resetAvailable parameter); Group by keeps the menu open.
  assert.match(viewText, /resetAvailable: Zt,/); assert.match(viewText, /u\(UJ, \{ atDefaults: y, onReset: Qt \}\)/);
  assert.match(viewText, /keepOpen: !0,\s+label: e,\s+options: we,\s+value: Xt,\s+onChange: Vt,\s+separatorBefore: "none",/);
  assert.match(viewText, /CdsDropdown as H,\n\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  for (const text of [viewText, await read('src/generated/code-current/sidebar-filter-controls.mjs'), optionsText]) {
    assert.doesNotMatch(text, /source-menu\.jsx|source-sidebar-filter-adapters|nested-session-copy|allNestedToggleLabel|hideAllNested|cds-merge-props/);
    assert.doesNotMatch(text, /Original Claude Desktop 2\.(37337\.1|42304\.0)/);
  }
  // The host takes Group by from GJ now; the 2.42304.0 oU Se slice (sidebar-filter-options.mjs) has no host consumer left.
  const host = await read('src/source-sidebar-filter-current.jsx');
  assert.match(host, /import \{ useSidebarGroupByOptions \} from '\.\/generated\/code-current\/sidebar-group-options\.mjs';/);
  assert.doesNotMatch(host, /sidebar-filter-options|keyRegroups|onRegroup|shared-frame-BfjMqbuN/);
  await fs.access(path.join(app, 'src/source-sidebar-filter-adapters.jsx')).then(() => assert.fail('the 2.37337.1 filter adapters are gone'), () => {});
});

test('GJ in the host menu: Date first, Folder, Environment (the host buckets by saved environment, E17)', () => {
  const all = [['date', 'Date'], ['state', 'Status'], ['project', 'Folder'], ['environment', 'Environment'], ['none', 'None']];
  assert.equal(M.model.SAVED_ENVIRONMENT_GROUPS_HOST, true);
  assert.deepEqual(M.model.sessionListGroupOptions(all), all);
  assert.deepEqual(M.model.sessionListGroupOptions(all, { savedEnvironmentGroups: false }), [['date', 'Date'], ['state', 'Status'], ['project', 'Folder'], ['none', 'None']]);
  // Rendered through the real host adapters (overlay gate on: no Custom; status grouping on).
  const f = fixture(M.filter.SessionListFilterMenu, { handle: {}, open: true, onOpenChange() {}, preferences: { groupBy: 'date' } });
  const content = f.tree.props.children.props.children.props;
  assert.deepEqual(content.groupOptions, all);
  assert.equal(content.groupBy, 'date');
  // Environment stays the shown radio (normalizeSidebarPreferences keeps it; the classic menu does not offer it).
  const g = fixture(M.filter.SessionListFilterMenu, { handle: {}, open: true, onOpenChange() {}, preferences: { groupBy: 'environment' } });
  assert.equal(g.tree.props.children.props.children.props.groupBy, 'environment');
});

test('Group by › Environment: shared-22 OE buckets by saved environment (SE / _E / yE / JE / YE), stored as savedEnvironment (E17)', async () => {
  const shared22 = await fs.readFile(path.join(reference, 'shared-22-Bwn3sJTG.js'), 'utf8');
  const shared46 = await fs.readFile(path.join(reference, 'shared-46-BIbZBGFq.js'), 'utf8');
  const shared20 = await fs.readFile(path.join(reference, 'shared-20-mUr7IqZY.js'), 'utf8');
  for (const [text, needle] of [
    [shared22, 'r&&!t){P=bE;break bb0}P=J3($,7,n,A,N)?K3($,7,n,A,N,n&&A?SE(n,A,N):null)'],
    [shared22, 'a=(typeof i=="string"?r.get(i)??(typeof e.startedFromEnvironmentId=="string"?r.get(e.startedFromEnvironmentId):void 0):void 0)??t(e);return a&&xE(a)?{kind:"saved",environment:a}:bE(e)'],
    [shared22, 'for(let e of r.values())e.sort(rE);return e=>{for(let i of uE(e,t,n)){let e=r.get(i)?.[0];if(e)return e}}'],
    [shared22, 'function vE(e){let t,n=0;for(let[r,i]of e)i>n&&(t=r,n=i);return t}'],
    [shared22, 't!==void 0&&e.target.kind==="local"&&(!i||rE(e,i)<0)&&n.set(t,e)'],
    [shared22, 'e.kind==="folder"&&e.folder.ran===void 0&&mE(t).kind==="local"?n.get(e.folder'],
    [shared22, 'case"saved":return`project-${BE}${e.environment.id}`;case"folder":return`project-${tE(e.folder)}`;case"unsaved":return`project-${VE}${eE(e.unsaved)}`'],
    [shared22, 'i.push({...qE(a,e.name,o),environment:e,legacyOrderKey:vE(o.legacyKeys)})'],
    [shared22, 'BE="preset::",VE="kind::"'],
    [shared22, 'function XE(e,t,n){return e.kind==="local"?Pi(n)'],
    [shared22, 'environment===void 0&&d!==void 0?20:d,'],
    [shared46, 'function LL(e,t=ML.getState().bySessionId){let n=Object.hasOwn(t,e.id)?t[e.id]:void 0;'],
    [shared46, 'function VL(e){return e.formatMessage({defaultMessage:"This computer",id:"Red8UM0oCv"})}'],
    [shared46, 'e.legacyOrderKey&&!n.has(t)&&n.has(e.legacyOrderKey)&&r.set(e.legacyOrderKey,'],
    [shared46, 'n=Kj(t)?-1/0:1/0;return[e,i.get(t)??n]'],
    [shared20, 'case"local":return`local:${e.wslDistro??""}:${e.cwd}`'],
  ]) assert.ok(text.includes(needle), needle);
  const { buildSidebarGroups } = await import('../src/sidebar-model.js');
  const Layout = await import('../src/sidebar-sections-layout.mjs');
  const Model = await import('../electron/generated/sidebar-sections-model.mjs');
  const now = Date.UTC(2026, 9, 26, 12);
  const s = (id, cwd, ago) => ({ id, cwd, name: id, updatedAt: now - ago, createdAt: now - ago });
  const sessions = [s('a', '/w/app', 1), s('b', '/w/app/', 2), s('c', '/w/lib', 3), s('d', '/tmp/x', 4), s('e', '/w/repo', 5), s('f', '/w/repo2', 6), s('g', '/w/app', 7)];
  const environments = [
    { id: 'E1', name: 'App env', createdAt: 2, target: { kind: 'local', cwd: '/w/app' } },
    { id: 'E0', name: 'Older app', createdAt: 1, target: { kind: 'local', cwd: '/w/app/' } },
    { id: 'E2', name: 'Zeta', createdAt: 3, target: { kind: 'local', cwd: '/elsewhere' } },
    { id: 'E3', name: 'Unused', createdAt: 4, target: { kind: 'local', cwd: '/nowhere' } },
  ];
  const repoIdentities = { '/w/app': { isRepo: true, owner: 'o', name: 'app' }, '/w/app/': { isRepo: true, owner: 'o', name: 'app' },
    '/w/lib': { isRepo: true, owner: null, name: 'lib' }, '/tmp/x': { isRepo: false }, '/w/repo': { isRepo: true, owner: 'o', name: 'repo' },
    '/w/repo2': { isRepo: true, owner: 'o', name: 'repo' } };
  // e was started in E2 (main's sessionMetadata.environmentId); g in E1, a deleted id falls back to its place (_E).
  const metadata = { e: { environmentId: 'E2' }, g: { environmentId: 'E1' }, b: { environmentId: 'gone' } };
  const shape = (groups) => groups.map((g) => [g.key, g.kind, g.label, g.sessions.map((x) => x.id).join('')]);
  const groups = buildSidebarGroups({ sessions, preferences: { groupBy: 'environment' }, metadata, repoIdentities, savedEnvironments: environments, currentLayout: true, now });
  assert.deepEqual(shape(groups), [
    // _E: the oldest environment of the place (E0 over E1, trailing separators trimmed); SE: g's own E1 first.
    ['project:preset::E1', 'environment', 'App env', 'g'],
    ['project:/w/lib', 'project', 'lib', 'c'],
    ['project:preset::E0', 'environment', 'Older app', 'ab'],
    // yE: f is in o/repo, the repo E2's rows are in, so it joins E2's bucket.
    ['project:preset::E2', 'environment', 'Zeta', 'ef'],
    // YE: no repo, the place bucket "This computer" (XE → zL), last.
    ['project:kind::local', 'project', 'This computer', 'd'],
  ]);
  assert.equal(groups[0].environmentId, 'E1'); assert.equal(groups[0].cwd, undefined, 'a saved bucket is no folder bucket');
  assert.equal(groups.at(-1).projectKey, '__no_project__');
  // Yj / Xj over the stored order: lib first; E1 and E0 (their rows mostly o/app) right after a stored o/app, in label
  // order; E2 (o/repo, not stored) unranked after them.
  const ordered = buildSidebarGroups({ sessions, preferences: { groupBy: 'environment' }, metadata, repoIdentities, savedEnvironments: environments,
    currentLayout: true, now, projectOrder: ['/w/lib', 'ccg::x', 'o/app'] });
  assert.deepEqual(ordered.map((g) => g.key), ['project:/w/lib', 'project:preset::E1', 'project:preset::E0', 'project:preset::E2', 'project:kind::local']);
  const stored = buildSidebarGroups({ sessions, preferences: { groupBy: 'environment' }, metadata, repoIdentities, savedEnvironments: environments,
    currentLayout: true, now, projectOrder: ['preset::E2', '/w/lib'] });
  assert.deepEqual(stored.map((g) => g.key), ['project:preset::E2', 'project:/w/lib', 'project:preset::E1', 'project:preset::E0', 'project:kind::local']);
  // Without saved environments: folder buckets, sorted by label, and the place bucket.
  assert.deepEqual(shape(buildSidebarGroups({ sessions, preferences: { groupBy: 'environment' }, repoIdentities, currentLayout: true, now })).map((g) => g[0]),
    ['project:o/app', 'project:/w/lib', 'project:o/repo', 'project:kind::local']);
  // The sections layout: the Sessions section's savedEnvironment reads back as environment; IE's cut (preset 5, others 20).
  const sections = Model.setSectionView(Model.normalizeSections([]), 'sessions', { groupBy: 'savedEnvironment' });
  assert.equal(Layout.sessionsGroupBy(sections), 'environment');
  const model = Layout.buildSidebarSections({ sections, sessions, preferences: {}, metadata, repoIdentities, savedEnvironments: environments, now });
  assert.equal(model.preferences.groupBy, 'environment');
  assert.deepEqual(model.buckets.map((b) => [b.key, b.truncateAt]), [['project:preset::E1', 5], ['project:/w/lib', 20], ['project:preset::E0', 5],
    ['project:preset::E2', 5], ['project:kind::local', 20]]);
  // OE serves the Folder grouping too: its folder / place buckets (no environment) cut at 20 (w10-shell-sidebar-folder).
  assert.equal(Layout.environmentBucketTruncateAt('project', { key: 'project:/w/lib' }), 20, 'a folder bucket cuts at 20');
  assert.equal(Layout.environmentBucketTruncateAt('project', { key: 'project:kind::local' }), 20, 'the place bucket cuts at 20');
  assert.equal(Layout.environmentBucketTruncateAt('date', { key: 'date:today' }), 5, 'other groupings keep 5');
  // Choosing Environment writes the Sessions section's savedEnvironment (shared-11 vf: Ft = shared-52 _m).
  assert.deepEqual(Layout.sessionsViewPatch({ groupBy: 'project' }, { groupBy: 'environment' }), { groupBy: 'savedEnvironment' });
  // main passes its saved environments to the sidebar, which hands them to the sections layout.
  const main = await read('src/main.jsx'), sidebar = await read('src/source-sidebar.jsx');
  assert.match(main, /savedEnvironments=\{savedEnvironments\.environments\}\n\s+onSaveAsEnvironment|sidebarSections=\{sidebarSections\}\n(?:\s*\/\/.*\n)?\s+savedEnvironments=\{savedEnvironments\.environments\}/);
  assert.match(sidebar, /held: loading, savedEnvironments \}\) : null,/);
});

test('one copy of the controls: code-current re-exports the sidebar-sections slice (_J, qJ, JJ, KJ, UJ, WJ, NJ, OG, nY)', () => {
  for (const name of ['SidebarViewAllContext', 'SidebarOptionMenu', 'SidebarSortMenu', 'useSidebarSortOptions', 'SidebarViewResetItems', 'SidebarViewAllItem',
    'SidebarFilterTrigger', 'trailingControlClass', 'focusSidebarAfterRegroup', 'sortAscendingShown', 'sortAscendingStored']) {
    assert.equal(typeof M.controls[name], name === 'SidebarViewAllContext' ? 'object' : 'function', name);
    assert.equal(M.controls[name], M.sectionControls[name], name);
  }
  // SB-26: 3.6556.2 deleted gU (useSidebarRegroupFocus).
  assert.equal(M.controls.useSidebarRegroupFocus, undefined);
  assert.equal(M.controls.SidebarNestedVisibilityItems, undefined);
});

// ---------------------------------------------------------------- the trigger and its menu (shared-21 rY / iY / NJ)
test('SourceCodeSidebarFilter (rY + iY): OG span, NJ trigger on the lazy menu handle, the body mounts on the first press, the frozen anchor and the wheel guard', () => {
  const store = M.adapters.useSidebarSectionsStore;
  store.setState({ overflowMenuOpen: false, sortMenuOpen: false });
  const listeners = [];
  const doc = { addEventListener: (type, fn, options) => listeners.push(['add', type, fn, options]), removeEventListener: (type, fn) => listeners.push(['remove', type, fn]) };
  const f = fixture(M.filter.SourceCodeSidebarFilter, { preferences: { groupBy: 'project' }, listRef: { current: null } });
  f.flush();
  const span = () => f.tree.props.children[0];
  const trigger = () => span().props.children;
  const id = span().props['data-group-sort-trigger'];
  // iY: the span OG(o && !held, s) with scrollMarginBlock 8 and data-group-sort-trigger = the trigger's id.
  assert.deepEqual([span().type, span().props.className, span().props.style], ['span', M.controls.trailingControlClass(false, false), { scrollMarginBlock: 8 }], 'hidden until the label row is hovered');
  assert.equal(typeof id, 'string');
  // NJ: CDS Tooltip {content, hoverable:false, open: !n && void 0} around the CDS Dropdown trigger rendering yJ.
  assert.equal(trigger().type, M.viewTabs.CdsTooltip);
  assert.deepEqual([trigger().props.content, trigger().props.hoverable, trigger().props.open], ['Group and sort', false, undefined]);
  const button = trigger().props.children;
  assert.equal(button.type, M.viewTabs.CdsDropdown.Trigger);
  assert.deepEqual([button.props.className, button.props.id, button.props['aria-expanded']], [M.filter.FILTER_TRIGGER_MARKER, id, false]);
  assert.equal(typeof button.props.onFocusCapture, 'function', 'xl trigger props');
  assert.equal(typeof button.props.handle?.open, 'function', 'a CdsMenuCreateHandle handle');
  // SB-23: yJ reads the density itself (no comfortable / sm arguments), the class gains aria-expanded:touch-none, data-held.
  const render = button.props.render;
  assert.equal(typeof render.type, 'function');
  assert.deepEqual([render.props.icon, render.props.className, render.props['aria-label'], render.props['data-row-action'], render.props['data-held'], render.props['data-list-filter']],
    ['Filter', 'df-chrome-btn relative -my-1 aria-expanded:touch-none', 'Group and sort', '', undefined, undefined]);
  assert.equal(f.tree.props.children[1], false, 'no menu body before the first press (xl)');
  button.props.onFocusCapture();
  f.render();
  const menu = () => f.tree.props.children[1];
  assert.equal(menu().type, M.filter.SessionListFilterMenu);
  assert.deepEqual([menu().props.handle, menu().props.open, menu().props.triggerId, menu().props.anchor], [button.props.handle, false, null, undefined]);
  // Opening from the trigger (rY y): its id and ZJ(trigger), the rect frozen at that moment; the overflow flag with the
  // sort-menu flag (Fj, `m(e, !0)`); QJ guards the wheel on the trigger's document while open.
  let top = 40;
  const element = { id, ownerDocument: doc, getBoundingClientRect: () => ({ top, left: 0, width: 24, height: 24 }) };
  menu().props.onOpenChange(true, element, 'trigger-press');
  f.render(); f.flush();
  assert.deepEqual([menu().props.open, menu().props.triggerId, span().props.className, trigger().props.open, trigger().props.children.props['aria-expanded']],
    [true, id, M.controls.trailingControlClass(true, false), false, true]);
  const anchor = menu().props.anchor;
  top = 400;
  assert.deepEqual([anchor.contextElement, anchor.getBoundingClientRect().top], [element, 40], 'ZJ: the rect at the open');
  assert.deepEqual([store.getState().overflowMenuOpen, store.getState().sortMenuOpen], [true, true]);
  assert.deepEqual(listeners.map(([kind, type, fn, options]) => [kind, type, fn, options]), [['add', 'wheel', M.filter.menuWheelGuard, { passive: false }]]);
  // $J: a wheel outside the menu is held, one inside it (or a ctrl zoom) is not.
  const prevented = [];
  const wheel = (target, ctrlKey = false) => ({ target, ctrlKey, preventDefault: () => prevented.push(target?.name ?? null) });
  const inside = { nodeType: 1, name: 'item', closest: (selector) => selector === '[role="menu"]' ? {} : null };
  const outside = { nodeType: 1, name: 'row', closest: () => null };
  M.filter.menuWheelGuard(wheel(inside)); M.filter.menuWheelGuard(wheel(outside)); M.filter.menuWheelGuard(wheel(outside, true)); M.filter.menuWheelGuard(wheel({ nodeType: 3 }));
  assert.deepEqual(prevented, ['row', null]);
  // Closing (Escape): the record keeps the trigger and the anchor (`{...t, open: !1}`); the guard and the flag go.
  menu().props.onOpenChange(false, undefined, 'escape-key');
  f.render(); f.flush();
  assert.deepEqual([menu().props.open, menu().props.triggerId, menu().props.anchor, trigger().props.children.props['aria-expanded']], [false, id, anchor, false]);
  assert.deepEqual(listeners.at(-1), ['remove', 'wheel', M.filter.menuWheelGuard]);
  assert.equal(store.getState().overflowMenuOpen, false);
  f.close();
});

test('SessionListFilterMenu (PJ): Root with the opening trigger, Popup at the frozen anchor with finalFocus; Reset has no regroup step', () => {
  const anchor = { contextElement: {}, getBoundingClientRect: () => ({}) }, opened = [];
  const f = fixture(M.filter.SessionListFilterMenu, { handle: {}, open: true, onOpenChange: (...args) => opened.push(args), triggerId: 'trigger', anchor, preferences: { groupBy: 'date' } });
  const root = f.tree, popup = root.props.children;
  assert.deepEqual([root.type, root.props.open, root.props.triggerId], [M.viewTabs.CdsDropdown.Root, true, 'trigger']);
  assert.deepEqual([popup.type, popup.props.side, popup.props.align, popup.props.sideOffset, popup.props.anchor, popup.props.finalFocus, popup.props.className],
    [M.viewTabs.CdsDropdown.Popup, 'bottom', 'end', 4, anchor, true, undefined]);
  // en: `a(e, r?.trigger, r?.reason)`.
  const element = { id: 'trigger' };
  root.props.onOpenChange(false, { trigger: element, reason: 'item-press' });
  assert.deepEqual(opened, [[false, element, 'item-press']]);
  const plain = fixture(M.filter.SessionListFilterMenu, { handle: {}, open: false, onOpenChange() {}, triggerId: null, preferences: {} }).tree;
  assert.deepEqual([plain.props.triggerId, plain.props.children.props.anchor, plain.props.children.props.finalFocus], [null, undefined, undefined]);
  // Qt (3.6556.2): no regroup step.
  assert.deepEqual(M.model.sessionListResetSteps({ sortBy: 'created', ascending: true, emptyGroups: true }), { sortBy: 'recency', descending: true, emptyGroupsOff: true });
});

test('SSR: the Sessions heading carries the original trigger once; the menu body is not rendered until it is asked for', () => {
  const now = Math.floor(Date.now() / 1000);
  const html = renderToStaticMarkup(React.createElement(M.sidebar.SourceSidebar, { knownFolders: ['/fixture/work'],
    sessions: [{ id: 'a', name: 'A', cwd: '/fixture/work', createdAt: now, updatedAt: now }], onSessionAction() {} }));
  const triggers = [...html.matchAll(/<span class="([^"]*)" style="([^"]*)" data-group-sort-trigger="([^"]*)"><button([^>]*)>/g)].filter((m) => /aria-label="Group and sort"/.test(m[4]));
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0][1], 'flex w-0 overflow-hidden group-hover/labelrow:w-auto group-hover/labelrow:overflow-visible group-has-[:focus-visible]/labelrow:w-auto group-has-[:focus-visible]/labelrow:overflow-visible touch:w-auto touch:overflow-visible');
  assert.equal(triggers[0][2], 'scroll-margin-block:8px');
  for (const attribute of ['data-cds="Button"', 'aria-haspopup="menu"', 'aria-expanded="false"', 'data-row-action=""', 'data-base-ui-tooltip-trigger=""', `id="${triggers[0][3]}"`])
    assert.ok(triggers[0][4].includes(attribute), attribute);
  assert.doesNotMatch(triggers[0][4], /data-held|data-list-filter/);
  assert.match(triggers[0][4], /class="[^"]*df-chrome-btn relative -my-1 aria-expanded:touch-none source-current-filter-button"/);
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
