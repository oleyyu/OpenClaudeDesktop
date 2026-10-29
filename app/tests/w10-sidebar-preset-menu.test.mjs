// w10-shell-sidebar-preset-menu: notdone 60 (shared-21 HJ draws a Show item while it is offered or while mJ(!1, hJ())
// held at its first render -- not while it is merely checked) and notdone 85 (shared-22 IE, W = "preset": a
// saved-environment bucket's header menu has New session and Edit environment in that environment, and the bucket takes
// part in the session list's Move up / Move down order). Checked against 3.6556.2. Nothing opens a window: source locks on
// the minified chunks, pure helpers, controlled renders over a hook dispatcher (D21 / R5) and SSR markup.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
const count = (source, needle) => source.split(needle).length - 1;
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const load = (file) => server.ssrLoadModule(file);
  M.adapters = await load('/src/source-sidebar-sections-adapters.jsx');
  M.sections = await load('/src/source-sidebar-sections.jsx');
  M.sidebar = await load('/src/source-sidebar.jsx');
  M.layout = await load('/src/sidebar-sections-layout.mjs');
  M.model = await load('/electron/generated/sidebar-sections-model.mjs');
  M.menu = await load('/src/generated/sidebar-sections/group-menu.mjs');
  M.reasons = await load('/src/generated/sidebar-sections/group-reasons.mjs');
  M.items = await load('/src/generated/code-current/sidebar-menu-groups.mjs');
  M.view = await load('/src/generated/code-current/sidebar-group-view.mjs');
  M.viewTabs = await load('/src/generated/view-tabs/shared-frame-6jtSkIit.js');
  M.i18n = await load('/electron/i18n/index.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

// ---------------------------------------------------------------- hook dispatcher (D21)
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree;
  const cells = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const readContext = (c) => (contexts.has(c) ? contexts.get(c) : c._currentValue);
  const hooks = {
    use: readContext, useContext: readContext, useId: () => ':preset:', useDebugValue() {}, useSyncExternalStore: (subscribe, get, server) => (server ?? get)(),
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, (value) => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useReducer(reducer, initialArg, init) { const i = cursor++; if (!cells[i]) { const cell = { value: init ? init(initialArg) : initialArg }; cell.dispatch = (action) => { cell.value = reducer(cell.value, action); }; cells[i] = cell; } return [cells[i].value, cells[i].dispatch]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect() { cursor++; },
    useImperativeHandle() { cursor++; },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const render = (next = props) => { props = next; cursor = 0; const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H; internal.H = withMemoCache(hooks); try { return (tree = component(props)); } finally { internal.H = old; } };
  render();
  return { get tree() { return tree; }, render };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((n) => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
const byType = (tree, type) => nodes(tree, (n) => n.type === type);
const message = (item) => item.props.children?.props?.defaultMessage;
const plainHost = (extra = {}) => ({ renderRows: () => null, shiftStyle: () => undefined, toggle() {}, folded: new Set(), dropTargets: false, headerControls: null,
  trailing: () => null, ...extra });

// ---------------------------------------------------------------- notdone 60: HJ
test('60 source: 3.6556.2 HJ tests offered || cl(mJ(!1, hJ())), cl latches the first value, mJ / hJ / Ma / ys as read', async () => {
  const shared21 = await read(path.join(reference, 'shared-21-R7LldJ05.js'));
  const shared78 = await read(path.join(reference, 'shared-78-D5Fw2h0a.js'));
  const shared52 = await read(path.join(reference, 'shared-52-uHFNjl7C.js'));
  for (const needle of [
    'function HJ(e){let $=J9(9),{offered:t,checked:n,label:r,onToggle:i,separatorBefore:a}=e,o=a!==void 0&&a,s=mJ(!1,hJ()),c=cl(s);if(!t&&!c)return null;',
    'function mJ(e,t){let n=t!==void 0&&t,{codeEnabled:r,ccdGateSettled:i}=Gl(),{activeOrganization:a}=Ut(),o=Ma(a?.uuid);return(r||!i)&&(o||e||n)}',
    'function hJ(){let{selectedEnvironments:e}=MG(f_(),m_());return JK().some(gJ)&&ys(e,"local")}',
    'function gJ(e){return e.isRunning}',
    'zS as cl',
    // JK: the list's routine groups (one per scheduled task, MK takes isRunning from its newest run).
    'i.sort(YK);let t={kind:"scheduled-task",id:e},o=n.get(e);h.push(MK({ref:t,title:IK(e,o,i,r),children:i,',
    'isRunning:s?.isRunning??!1',
  ]) assert.equal(count(shared21, needle), 1, needle);
  // cl = shared-78 zS = Cv: useState(() => e)[0] (wo = useState, official-3.6556.2 reactAliases).
  assert.equal(count(shared78, 'Cv as zS'), 1);
  assert.equal(count(shared78, 'function Cv(e){let $=J9(2),t=J1($,0,e)?K1($,0,e,()=>e):$[1],[n]=E(t);return n}'), 1);
  assert.ok(shared78.includes('wo as E'));
  assert.equal(count(shared78, 'function yQ(e,t){return _Q().includes(t)&&(e.length===0||e.includes(t))}'), 1);
  // Ma = shared-52 yv: the org "has Code routines" latch, false without an organization.
  assert.equal(count(shared52, 'function yv(e){let $=J9(2);return q(J1($,0,e)?K1($,0,e,t=>e!==void 0&&t.navHasCodeRoutinesByOrg[e]===!0):$[1])}'), 1);
  // The host has no routine groups in the Code list (no scheduled-task bucket), so hJ is false here.
  const sidebarModel = await read(path.join(app, 'src/sidebar-model.js'));
  assert.equal(count(sidebarModel, 'scheduled-task'), 0);
  const filter = await import('../src/sidebar-filter-current-model.mjs');
  assert.equal(filter.CODE_ROUTINES_SECTION_HOST, false);
});

test('60 model: mJ and hJ over the host facts and over other facts', () => {
  const { sidebarShowItemOffered: mJ, sidebarRoutineRunning: hJ } = M.adapters;
  assert.equal(mJ(false, hJ()), false, 'host: no org routines, no running routine group');
  assert.equal(hJ(), false);
  const facts = { codeEnabled: true, ccdGateSettled: true, orgHasCodeRoutines: false };
  assert.equal(mJ(false, true, facts), true);
  assert.equal(mJ(true, false, facts), true);
  assert.equal(mJ(false, false, { ...facts, orgHasCodeRoutines: true }), true);
  assert.equal(mJ(false, true, { ...facts, codeEnabled: false }), false, 'Code off once the gate settled');
  assert.equal(mJ(false, true, { ...facts, codeEnabled: false, ccdGateSettled: false }), true, 'gate not settled yet');
  assert.equal(hJ({ routineGroups: [{ isRunning: false }, { isRunning: true }], localEnvironmentShown: true }), true);
  assert.equal(hJ({ routineGroups: [{ isRunning: true }], localEnvironmentShown: false }), false, 'ys(e, "local") false');
  assert.equal(hJ({ routineGroups: [], localEnvironmentShown: true }), false);
});

test('60 render: a Show item that is on but not offered is not drawn; an offered one is the keepOpen checkbox Item', () => {
  const { SidebarShowToggleItem } = M.adapters;
  const { CdsDropdown } = M.viewTabs;
  const onToggle = () => {};
  assert.equal(fixture(SidebarShowToggleItem, { offered: false, checked: true, label: 'Side chats', onToggle }).tree, null, 'checked alone no longer draws it');
  assert.equal(fixture(SidebarShowToggleItem, { offered: false, checked: false, label: 'Side chats', onToggle }).tree, null);
  const shown = fixture(SidebarShowToggleItem, { offered: true, checked: true, label: 'Side chats', onToggle, separatorBefore: true }).tree;
  const parts = shown.props.children;
  assert.equal(parts[0].type, CdsDropdown.Separator);
  assert.equal(parts[1].type, CdsDropdown.Item);
  assert.deepEqual({ ...parts[1].props }, { checked: true, keepOpen: true, onClick: onToggle, children: 'Side chats' });
  // The latch: what the first render saw holds (cl), so the result does not move with later renders.
  const f = fixture(SidebarShowToggleItem, { offered: false, checked: true, label: 'x', onToggle });
  f.render({ offered: false, checked: false, label: 'x', onToggle });
  assert.equal(f.tree, null);
  // SSR: nothing at all for the not-offered item.
  assert.equal(renderToStaticMarkup(React.createElement(SidebarShowToggleItem, { offered: false, checked: true, label: 'x', onToggle })), '');
});

// ---------------------------------------------------------------- notdone 85: IE's preset bucket
test('85 source: IE names the preset bucket, gives it New session / Edit environment in its environment, and one order', async () => {
  const shared22 = await read(path.join(reference, 'shared-22-Bwn3sJTG.js'));
  const shared20 = await read(path.join(reference, 'shared-20-mUr7IqZY.js'));
  const shared21 = await read(path.join(reference, 'shared-21-R7LldJ05.js'));
  const shared46 = await read(path.join(reference, 'shared-46-BIbZBGFq.js'));
  const env = await read(path.join(reference, 'cd0cf5b5e-BCzJmEwZ.js'));
  for (const needle of [
    'W=O===zE?"no_folder":oe?"other":N?"preset":t.unsaved?"place":"folder"',
    'de=N?N.id:',
    'v(U,void 0,de)',
    'N&&(v(U,void 0,N.id),Yv(N.id))',
    'De=N&&n?fe:void 0',
    'Oe=pe?Y:void 0',
    'ke=n&&!j',
    'if(s.key===o||s.key===zE||s.unsaved!==void 0)continue',
    'sectionIndex:_e.indexByBucketKey.get(e.key)',
    'di as Yv',
  ]) assert.equal(count(shared22, needle), 1, needle);
  assert.equal(count(shared21, 'uG as di'), 1);
  assert.equal(count(shared21, 'requestNewEnvironment(e,t,n)'), 1);
  assert.equal(count(env, 'requestNewEnvironment:(e,n,r)=>t().requestEnvironmentDialog({editId:e,place:n,checkout:r})'), 1);
  // Px's edit group: Edit environment only while given (o = onEditEnvironment).
  assert.equal(count(shared20, 'o&&i(vf,{onClick:o,children:i(X,{defaultMessage:"Edit environment",id:"hJI99YKOOT"})})'), 1);
  // shared-46 NO("preset"): its reasons, as the generated group-reasons slice has them.
  assert.equal(count(shared46, 'case"preset":return{newSession:r,rename:kO.environmentRename,deleteGroup:kO.environmentDelete,reorder:kO.fixedAtEnd}'), 1);
  assert.ok(M.reasons.groupDisabledReasons('preset', true).rename, 'preset reasons are sliced');
});

test('85 model: sessionsBucketOrderKeys skips Other, the place bucket and sections; presetBucketMenu wires IE', () => {
  const { sessionsBucketOrderKeys, presetBucketMenu } = M.adapters;
  const other = '__no_project__';
  const buckets = [
    { key: 'pinned', kind: 'pinned' },
    { key: 'project:preset::E1', kind: 'environment', environmentId: 'E1', orderKey: 'preset::E1' },
    { key: 'project:/w/lib', kind: 'project', projectKey: '/w/lib' },
    { key: 'project:kind::local', kind: 'project', projectKey: other, unsaved: { kind: 'local' } },
    { key: 'project:' + other, kind: 'project', projectKey: other },
    { key: 'custom:x', kind: 'custom', customGroupId: 'x' },
  ];
  assert.deepEqual(sessionsBucketOrderKeys(buckets, other), ['preset::E1', '/w/lib']);
  const calls = [];
  const menu = presetBucketMenu(buckets[1], { environmentsOn: true, order: { index: 0 },
    openNewForBucket: (id) => calls.push(['new', id]), editEnvironment: (id) => calls.push(['edit', id]) });
  assert.deepEqual(Object.keys(menu).sort(), ['groupMenuKind', 'onEditEnvironment', 'onNewSession', 'order']);
  assert.equal(menu.onSaveAsEnvironment, undefined, 'IE Oe: no Save as environment for a preset bucket');
  assert.equal(menu.groupMenuKind, 'preset');
  menu.onNewSession();
  menu.onEditEnvironment();
  assert.deepEqual(calls, [['new', 'E1'], ['new', 'E1'], ['edit', 'E1']], 'fe: v(U, void 0, N.id) then Yv(N.id)');
  assert.equal(presetBucketMenu(buckets[1], { environmentsOn: false, editEnvironment() {} }).onEditEnvironment, undefined, 'De: presets gate off');
  assert.equal(presetBucketMenu(buckets[2], { environmentsOn: true }), null, 'a folder bucket is not a preset');
});

test('85 render: the sections layout draws a preset bucket as Px with New session, Edit environment and Move up / down', () => {
  const now = Date.UTC(2026, 9, 26, 12);
  const s = (id, cwd, ago) => ({ id, cwd, name: id, updatedAt: now - ago, createdAt: now - ago });
  const sessions = [s('a', '/w/app', 1), s('c', '/w/lib', 3)];
  const environments = [{ id: 'E1', name: 'App env', createdAt: 2, target: { kind: 'local', cwd: '/w/app' } }];
  const metadata = { a: { environmentId: 'E1' } };
  const repoIdentities = { '/w/app': { isRepo: true, owner: 'o', name: 'app' }, '/w/lib': { isRepo: true, owner: null, name: 'lib' } };
  const sections = M.model.setSectionView(M.model.normalizeSections([]), 'sessions', { groupBy: 'savedEnvironment' });
  const model = M.layout.buildSidebarSections({ sections, sessions, preferences: {}, metadata, repoIdentities, savedEnvironments: environments, now });
  assert.deepEqual(model.buckets.map((b) => [b.key, b.kind, b.orderKey]), [['project:preset::E1', 'environment', 'preset::E1'], ['project:/w/lib', 'project', '/w/lib']]);
  const calls = [];
  // The source-sidebar folderMenu wiring for a preset bucket: its order slot from folderBucketMenu over OE's keys.
  const order = M.adapters.sessionsBucketOrderKeys(model.buckets, '__no_project__');
  const save = (ids) => calls.push(['save', ids]);
  const folderMenu = (group) => group.kind === 'environment'
    ? M.adapters.presetBucketMenu(group, { environmentsOn: true, order: M.layout.folderBucketMenu({ kind: 'project', projectKey: group.orderKey }, { order, projectOrder: [], save }).order,
      openNewForBucket: (id) => calls.push(['new', id]), editEnvironment: (id) => calls.push(['edit', id]) })
    : M.layout.folderBucketMenu(group, { order, projectOrder: [], save, environmentsOn: true, saveAsEnvironment: (target) => calls.push(['save-as', target]) });
  const host = plainHost({ folderMenu });
  const sessionsNode = nodes(fixture(M.sections.SidebarSectionsList, { model, host }).tree, (n) => n.props?.entry?.kind === 'sessions' && n.props?.host)[0];
  const buckets = nodes(fixture(sessionsNode.type, sessionsNode.props).tree, (n) => n.props?.menu && n.props?.bucket);
  assert.deepEqual(buckets.map((b) => b.props.bucket.key), ['project:preset::E1', 'project:/w/lib'], 'both are FolderBucket (Px) buckets');
  const sortable = fixture(buckets[0].type, buckets[0].props).tree;
  assert.deepEqual([sortable.props.sectionIndex, sortable.props.sectionCount], [0, 2], 'IE gi: the preset bucket has an order slot');
  const menu = sortable.props.children;
  assert.equal(menu.type, M.menu.SidebarGroupMenu);
  assert.equal(menu.props.groupEditsHidden, true);
  assert.equal(menu.props.onSaveAsEnvironment, undefined);
  assert.deepEqual(menu.props.greyed, M.reasons.groupDisabledReasons('preset', true), 'NO("preset")');
  const groups = nodes(fixture(M.menu.SidebarGroupMenu, menu.props).tree, (n) => n.props?.groups)[0].props.groups;
  const items = (group) => byType(group, M.items.SidebarMenuItem);
  assert.deepEqual(items(groups.new).map(message), ['New session']);
  assert.deepEqual(items(groups.edit).map(message).filter(Boolean), ['Edit environment']);
  items(groups.new)[0].props.onClick();
  items(groups.edit).find((item) => message(item) === 'Edit environment').props.onClick();
  assert.deepEqual(calls, [['new', 'E1'], ['new', 'E1'], ['edit', 'E1']]);
  // Move down: the preset bucket after lib, saved as the host's project order.
  sortable.props.onMoveSection(0, 1);
  assert.deepEqual(calls.at(-1), ['save', ['/w/lib', 'preset::E1']]);
  // The folder bucket keeps Save as environment and has no Edit environment.
  const folderMenuProps = fixture(buckets[1].type, buckets[1].props).tree.props.children.props;
  assert.equal(folderMenuProps.onEditEnvironment, undefined);
  assert.equal(typeof folderMenuProps.onSaveAsEnvironment, 'function');
  // SSR: the list renders with the preset bucket's heading.
  const html = renderToStaticMarkup(React.createElement(M.view.SidebarListContext.Provider ?? M.view.SidebarListContext, { value: null },
    React.createElement(M.sections.SidebarSectionsList, { model, host })));
  assert.match(html, /data-group-key="project:preset::E1"/);
  assert.match(html, />App env</);
});

test('85 wiring: SourceSidebar folderMenu takes presets through presetBucketMenu; main passes the environment handlers', async () => {
  const sidebar = await read(path.join(app, 'src/source-sidebar.jsx'));
  assert.equal(count(sidebar, 'const order = sessionsBucketOrderKeys(displayed, OTHER_PROJECT_KEY);'), 1);
  assert.equal(count(sidebar, 'return slot && presetBucketMenu(group, { environmentsOn, order: slot.order, openNewForBucket: onNewSessionInEnvironment, editEnvironment: onEditEnvironment });'), 1);
  assert.equal(count(sidebar, 'onNewSessionInEnvironment, onEditEnvironment,'), 1);
  const sections = await read(path.join(app, 'src/source-sidebar-sections.jsx'));
  assert.equal(count(sections, 'onEditEnvironment={menu.onEditEnvironment}'), 1);
  const main = await read(path.join(app, 'src/main.jsx'));
  const wiring = main.match(/onNewSessionInEnvironment=\{\(id\) => \{ navigate\(null\); selectSavedEnvironment\(id\); \}\}\n\s+onEditEnvironment=\{\(id\) => editSavedEnvironment\(id\)\}/);
  assert.ok(wiring, 'main.jsx passes both handlers');
  // The element runs from `<SourceSidebar` to its own `\n      />` (w11-frame-root-cont put a self-closed
  // <SourceCollapsedChrome … /> prop value inside it, so a bare "/>" no longer marks the end).
  const open = main.lastIndexOf('<SourceSidebar\n', wiring.index);
  assert.ok(open !== -1 && main.indexOf('\n      />', open) > wiring.index, 'inside the <SourceSidebar> element');
});

test('zh-CN: the preset menu labels are translated', () => {
  const previous = M.i18n.getLocale();
  M.i18n.setLocale('zh-CN');
  try {
    assert.equal(M.i18n.t('Edit environment'), '编辑环境');
    assert.equal(M.i18n.t('New session'), '新建会话');
    assert.equal(M.i18n.t('Move up'), '上移');
    assert.equal(M.i18n.t('Move down'), '下移');
  } finally { M.i18n.setLocale(previous); }
});
