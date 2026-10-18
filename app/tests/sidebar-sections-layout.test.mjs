// R3-sections, work item sidebar-sections-layout (research/sidebar-sections.md WI-3; decisions D10): the Code sidebar is
// laid out by sections -- Pinned → the manual sections → Sessions -- with the original 2.42304.0 heading (shared-18 uD),
// section header menu (shared-20 yx), section view button (shared-22 eO), sortable wrapper (shared-19 x$) and visibility
// rule (shared-22 KO), and the store the original pieces call is bridged to main's sidebar-state. Nothing opens a
// window: the pure layout model, SSR markup of the real SourceSidebar, its handlers taken from a controlled render (a
// hook dispatcher, D21), and the bridged store with a recording handler.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as Layout from '../src/sidebar-sections-layout.mjs';
import * as Store from '../electron/sidebar-sections-store.mjs';
import * as Model from '../electron/generated/sidebar-sections-model.mjs';
import { extractSidebarSections } from '../scripts/extract-sidebar-sections.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
// D21: view-tabs' preload-helper calls document.createElement while it evaluates; sidebar-resize reads documentElement.
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, M = {};
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  M.sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  M.sections = await server.ssrLoadModule('/src/source-sidebar-sections.jsx');
  M.adapters = await server.ssrLoadModule('/src/source-sidebar-sections-adapters.jsx');
  M.mode = await server.ssrLoadModule('/src/generated/sidebar-sections/group-mode.mjs');
  M.view = await server.ssrLoadModule('/src/generated/sidebar-sections/section-view-menu.mjs');
  M.label = await server.ssrLoadModule('/src/generated/sidebar-sections/group-label.mjs');
  M.menu = await server.ssrLoadModule('/src/generated/sidebar-sections/group-menu.mjs');
  M.sortable = await server.ssrLoadModule('/src/generated/sidebar-sections/section-sortable.mjs');
  M.reorder = await server.ssrLoadModule('/src/generated/sidebar-sections/group-reorder.mjs');
  M.dialog = await server.ssrLoadModule('/src/generated/sidebar-sections/group-dialog.mjs');
  M.model = await server.ssrLoadModule('/src/generated/sidebar-sections/sections-model.mjs');
  M.reasons = await server.ssrLoadModule('/src/generated/sidebar-sections/group-reasons.mjs');
  M.filter = await server.ssrLoadModule('/src/source-sidebar-filter-current.jsx');
  M.filterView = await server.ssrLoadModule('/src/generated/code-current/sidebar-filter-view.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const groups = [{ id: 'g1', name: 'Research' }, { id: 'g2', name: 'Empty' }, { id: 'g3', name: 'Ops' }];
const sectionsOf = (config) => Store.sidebarSectionsFor(config);
const render = (props) => renderToStaticMarkup(React.createElement(M.sidebar.SourceSidebar, { knownFolders: ['/fixture/work'], ...props }));
const list = (html) => html.slice(html.indexOf('<div class="df-session-list'), html.indexOf('</nav>'));
const keysIn = (html) => [...list(html).matchAll(/data-group-key="([^"]+)"/g)].map((m) => m[1]);

// ---------------------------------------------------------------- hook dispatcher (D21), as tests/sidebar-current-source
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

// ---------------------------------------------------------------- the layout model (pure)
test('the layout follows the section list: Pinned, the manual sections KO shows, Sessions; pinned rows only in Pinned', () => {
  const metadata = { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g3', pinned: true }, s3: {}, s4: { customGroupId: 'gone' } };
  const config = { customGroups: groups, sessionMetadata: metadata, sidebarPreferences: { groupBy: 'custom' }, projectOrder: ['ccg::g3', 'ccg::g1'] };
  const sections = sectionsOf(config);
  const result = Layout.buildSidebarSections({ sections, sessions: ['s1', 's2', 's3', 's4'].map((id) => thread(id)), preferences: config.sidebarPreferences, metadata, customGroups: groups });
  // Bp: the "ccg::" order; KO: g2 has no member and is not kept, g3's only member is pinned (still listed, empty).
  assert.deepEqual(result.layout.map((entry) => [entry.kind, entry.key]), [['pinned', 'pinned'], ['manual', 'custom-g3'], ['manual', 'custom-g1'], ['sessions', 'sessions']]);
  assert.deepEqual([...result.shownIds].sort(), ['g1', 'g3']);
  assert.deepEqual(result.buckets.map((bucket) => [bucket.key, bucket.sessions.map((s) => s.id)]),
    [['pinned', ['s2']], ['custom-g3', []], ['custom-g1', ['s1']], ['sessions', ['s3', 's4']]], 'a deleted group files nothing');
  assert.deepEqual(result.layout.find((entry) => entry.key === 'custom-g3').rows, [], 'a pinned member is not a row of its section (Cj skips Bt keys)');
  // custom → none (mp): the flat Sessions list, 20 rows; manual sections 5; Pinned 20 (Cj / qk).
  assert.equal(result.preferences.groupBy, 'none');
  assert.deepEqual(result.buckets.map((bucket) => bucket.truncateAt), [20, 5, 5, 20]);
  assert.deepEqual(result.layout.filter((e) => e.kind === 'manual').map((e) => [e.index, e.count, e.sortableId]), [[0, 2, 'section:g3'], [1, 2, 'section:g1']]);
  // Kept while empty (a new section) or Sessions' Show › Empty groups lists g2 too.
  const kept = Layout.buildSidebarSections({ sections, sessions: [thread('s1')], preferences: {}, metadata, customGroups: groups, keptWhileEmpty: ['g2'] });
  assert.ok(kept.layout.some((entry) => entry.key === 'custom-g2'));
  const all = Layout.buildSidebarSections({ sections: Model.setSectionView(sections, 'sessions', { show: { emptyGroups: true } }), sessions: [thread('s1')], preferences: {}, metadata, customGroups: groups });
  assert.equal(all.shownIds, undefined);
  assert.deepEqual(all.layout.filter((e) => e.kind === 'manual').map((e) => e.key), ['custom-g3', 'custom-g1', 'custom-g2']);
});

test('Sessions groups, sorts and shows from its own section; a manual section sub-groups by date / status (sO)', () => {
  const metadata = { a: { customGroupId: 'g1' }, b: { customGroupId: 'g1' } };
  const base = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  const sessions = [thread('a', { name: 'Zed' }), thread('b', { name: 'Alpha', updatedAt: now - 3 * 86400 }), thread('c'), thread('d', { cwd: '/fixture/other' })];
  // No groupBy on Sessions → shared-16 Qf undefined → vh: the desktop default "project".
  const byFolder = Layout.buildSidebarSections({ sections: base, sessions, preferences: { groupBy: 'date' }, metadata, customGroups: groups });
  assert.equal(byFolder.preferences.groupBy, 'project', 'the legacy groupBy no longer decides once the sections are seeded');
  const sessionsPart = byFolder.layout.at(-1);
  assert.equal(sessionsPart.flat, false);
  assert.deepEqual(sessionsPart.buckets.map((b) => [b.key, b.heading, b.truncateAt]).sort(), [['project:/fixture/other', 'group', 5], ['project:/fixture/work', 'group', 5]]);
  assert.deepEqual(sessionsPart.buckets.flatMap((b) => b.sessions.map((s) => s.id)).sort(), ['c', 'd'], 'Sessions holds the unsectioned rows only');
  // The manual section: date sub-buckets keyed `${rO(id)}:`, not cut (sO cap Infinity), drawsOpenRows, first heading flush.
  const dated = Model.setSectionView(base, 'g1', { groupBy: 'date', sortBy: 'alpha' });
  const result = Layout.buildSidebarSections({ sections: dated, sessions, preferences: {}, metadata, customGroups: groups });
  const manual = result.layout.find((e) => e.kind === 'manual');
  assert.equal(manual.subgrouped, true);
  assert.ok(manual.buckets.length >= 2);
  for (const [index, bucket] of manual.buckets.entries()) {
    assert.match(bucket.key, /^section:g1:/);
    assert.deepEqual([bucket.heading, bucket.truncateAt, bucket.drawsOpenRows, bucket.flushHeading, bucket.parentKey, bucket.ownSection, bucket.sortBy], ['group', undefined, true, index === 0, 'custom-g1', true, 'alpha']);
  }
  assert.deepEqual(manual.rows.map((s) => s.id).sort(), ['a', 'b']);
  // A flat manual section sorts by its own view (oO's dv / Pu providers): Name ascending puts Alpha first.
  const flat = Layout.buildSidebarSections({ sections: Model.setSectionView(base, 'g1', { sortBy: 'alpha' }), sessions, preferences: {}, metadata, customGroups: groups });
  assert.deepEqual(flat.buckets.find((b) => b.key === 'custom-g1').sessions.map((s) => s.id), ['b', 'a']);
  // Sessions' metadata is its own switch; a manual section's rows read the section's.
  const shown = Layout.buildSidebarSections({ sections: Model.setSectionView(Model.setSectionView(base, 'sessions', { groupBy: 'none', show: { metadata: true } }), 'g1', { show: { metadata: false } }),
    sessions, preferences: {}, metadata, customGroups: groups });
  assert.equal(shown.preferences.showMetadata, true);
  assert.deepEqual(shown.buckets.map((b) => [b.key, b.showMetadata]), [['custom-g1', false], ['sessions', true]]);
});

test('the Sessions group-by is shared-16 Qf → ep over the Sessions section; rO is `section:${id}`', () => {
  const store = (groupBy) => ({ activeGroupScope: 'local', codeSidebarByScope: { local: { sections: Model.normalizeSections([{ id: 'sessions', kind: 'sessions', v: 2, order: 0, ...(groupBy ? { groupBy } : {}) }]) } } });
  for (const groupBy of [undefined, 'none', 'environment', 'status', 'date']) {
    const state = store(groupBy);
    const official = M.model.effectiveGroupBy(M.mode.sessionsGroupByAsLegacy(state), 'code', true);
    assert.equal(Layout.sessionsGroupBy(M.model.selectCodeSidebar(state).sections), official, String(groupBy));
  }
  for (const id of ['g1', 'cg-1', 'sessions']) assert.equal(Layout.sectionSortableId(id), M.view.sectionSortableId(id));
});

test('the filter menu writes Sessions-owned fields as a Sessions view patch (shared-16 ip/op/sp) and keeps the legacy ones', () => {
  const before = { groupBy: 'project', sortBy: 'recency', ascending: false, showEmptyGroups: false, showMetadata: false, status: 'active' };
  assert.equal(Layout.sessionsViewPatch(before, { ...before }), null);
  assert.deepEqual(Layout.sessionsViewPatch(before, { ...before, groupBy: 'state' }), { groupBy: 'status' });
  assert.deepEqual(Layout.sessionsViewPatch(before, { ...before, groupBy: 'custom' }), { groupBy: 'none' }, 'Wt(custom) ?? "none"');
  assert.deepEqual(Layout.sessionsViewPatch(before, { ...before, sortBy: 'alpha', ascending: true, showMetadata: true, showEmptyGroups: true }),
    { sortBy: 'alpha', ascending: true, show: { metadata: true, emptyGroups: true } });
  const legacy = { groupBy: 'custom', sortBy: 'created', ascending: true, showEmptyGroups: true, showMetadata: true, collapsedGroups: ['x'] };
  const stored = Layout.withLegacyListFields({ ...before, groupBy: 'date', collapsedGroups: ['y'], showPrStatus: false }, legacy);
  assert.deepEqual([stored.groupBy, stored.sortBy, stored.ascending, stored.showEmptyGroups, stored.showMetadata], ['custom', 'created', true, true, true]);
  assert.deepEqual([stored.collapsedGroups, stored.showPrStatus], [['y'], false]);
});

test('folds: a section folds by its collapsed flag, other buckets by collapsedGroups; legacy section keys are not read twice', () => {
  const metadata = { a: { customGroupId: 'g1' }, b: {} };
  let sections = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: { groupBy: 'none' } });
  sections = Model.setSectionView(Model.setSectionView(sections, 'g1', { collapsed: true, groupBy: 'date' }), 'pinned', { collapsed: false });
  const result = Layout.buildSidebarSections({ sections, sessions: [thread('a'), thread('b', { updatedAt: now - 10 * 86400 })], preferences: {}, metadata, customGroups: groups });
  const manual = result.layout.find((e) => e.kind === 'manual');
  const folded = Layout.sectionsFoldedKeys(result.layout, ['pinned', 'custom:g1', 'custom-g1', 'sessions', 'project:/x', 'older']);
  assert.ok(folded.has('custom-g1') && manual.buckets.every((b) => folded.has(b.key)), 'a folded section hides its sub-buckets');
  assert.ok(!folded.has('pinned') && !folded.has('sessions'), 'Pinned / flat Sessions read their sections, not the legacy keys');
  assert.ok(folded.has('project:/x') && folded.has('older'));
  assert.equal(Layout.sectionFoldTarget(result.layout, 'custom-g1').id, 'g1');
  assert.equal(Layout.sectionFoldTarget(result.layout, 'sessions').id, 'sessions');
  assert.equal(Layout.sectionFoldTarget(result.layout, 'pinned').id, 'pinned');
  assert.equal(Layout.sectionFoldTarget(result.layout, 'older'), null);
  assert.equal(Layout.foldingSection(result.layout, manual.buckets[0].key).id, 'g1');
});

test('the row registry: rows by bucket (a sub-grouped section under its own key too), records, visible keys, open keys', () => {
  const metadata = { a: { customGroupId: 'g1', pinned: false }, b: { customGroupId: 'g1' }, c: { pinned: true } };
  const sections = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'g1', { groupBy: 'date' });
  const result = Layout.buildSidebarSections({ sections, sessions: [thread('a'), thread('b', { archived: false }), thread('c')], preferences: {}, metadata, customGroups: groups });
  const registry = Layout.sectionsRowRegistry({ layout: result.layout, buckets: result.buckets, visibleOrder: ['c', 'a'], metadata, state: { active: { b: 'turn' } }, openIds: ['a', null] });
  assert.deepEqual(registry.buckets.get('custom-g1').sort(), ['code:a', 'code:b']);
  assert.deepEqual(registry.buckets.get('pinned'), ['code:c']);
  assert.deepEqual(registry.visible, ['code:c', 'code:a']);
  assert.deepEqual([...registry.open], ['code:a']);
  assert.deepEqual(registry.rows.get('code:c'), { ref: { kind: 'code', id: 'c' }, codeRef: { id: 'c', type: 'local' }, isAgentOwned: false, startedByAccountId: undefined,
    isArchived: false, isPinned: true, canPin: true, isWorking: false });
  assert.equal(registry.rows.get('code:b').isWorking, true);
});

test('before init the sidebar derives the list main would (Em + Bp); afterwards main\'s record is kept in step with the groups', () => {
  const config = { customGroups: groups, sessionMetadata: { a: { customGroupId: 'g1' } }, sidebarPreferences: { groupBy: 'state', showMetadata: true }, projectOrder: [] };
  assert.deepEqual(Layout.sidebarSectionsList(config), Store.sidebarSectionsFor(config));
  assert.deepEqual(Layout.sidebarSectionsList({ ...config, sidebarSections: [] }), Store.sidebarSectionsFor(config), 'main.jsx starts with []');
  const stored = Model.setSectionView(Store.sidebarSectionsFor(config), 'sessions', { groupBy: 'date' });
  const withGroup = Layout.sidebarSectionsList({ ...config, customGroups: [...groups, { id: 'g9', name: 'New' }], sidebarSections: stored });
  assert.equal(withGroup.find((s) => s.id === 'sessions').groupBy, 'date', 'a seeded record is not seeded again');
  assert.ok(withGroup.some((s) => s.id === 'g9' && s.kind === 'manual'), 'kp files a group the snapshot did not have yet');
});

// ---------------------------------------------------------------- SSR of the real SourceSidebar
test('SSR: Pinned → manual sections → Sessions, every heading the original uD; no Ungrouped, no Custom, no New group button', () => {
  const metadata = { s1: { customGroupId: 'g1' }, s3: { pinned: true } };
  const html = render({ sessions: [thread('s1'), thread('s2'), thread('s3')], customGroups: groups, sessionMetadata: metadata, sidebarPreferences: { groupBy: 'custom' },
    onSessionAction() {}, onGroupAction() {}, onProject() {}, onCreateGroup() {} });
  const body = list(html);
  assert.deepEqual(keysIn(html), ['pinned', 'custom-g1', 'sessions']);
  // uD / fD: label row, toggle with aria-expanded, name (fade label), caret; no hand-written heading.
  assert.equal((body.match(/data-sidebar-group-label=""/g) || []).length, 3);
  assert.equal((body.match(/data-group-toggle="" aria-expanded="true"/g) || []).length, 3);
  assert.match(body, /class="group\/labelrow df-label-inset flex w-full items-center/);
  assert.match(body, /<span data-group-name="" class="min-w-0"><span dir="auto" class="dframe-fade-label [^"]*"[^>]*>(?:<[^>]+>)*Research</, 'uD fadeLabel (aD)');
  assert.match(body, /data-group-caret=""/);
  assert.doesNotMatch(body, /source-group-heading|source-group-toggle|source-create-group|Ungrouped|>Custom</);
  // bC: the manual section is a group list with its label; its trailing is eO then the "+".
  // R4g-sidebar SB3 (X7-06): the section element is yx's CdsContextMenu.Trigger render, so Base UI adds its touch-callout style.
  assert.match(body, /<div class="source-session-group group\/section relative isolate flex flex-col gap-px rounded-lg" data-group-key="custom-g1" data-group-list="g1" data-group-label="Research" style="-webkit-touch-callout:none">/);
  const manual = body.slice(body.indexOf('data-group-key="custom-g1"'), body.indexOf('data-group-key="sessions"'));
  // eO's trigger is the CDS Dropdown trigger (Base UI Menu.Trigger rendering CdsButton) since R3-sections step 3.
  assert.match(manual, /aria-label="Group and sort" data-row-action=""[^>]*aria-haspopup="menu"[^>]*aria-expanded="false"/);
  assert.match(manual, /df-chrome-btn relative -my-1/);
  assert.ok(manual.indexOf('Group and sort') < manual.indexOf('source-group-reveal'), 'eO before the "+"');
  assert.match(manual, /source-group-drop-band/);
  // Pinned and Sessions: no section header menu trigger, no drop list; the list's Group and sort sits on Sessions.
  const pinned = body.slice(0, body.indexOf('data-group-key="custom-g1"'));
  assert.doesNotMatch(pinned, /data-group-list|Group and sort/);
  const sessions = body.slice(body.indexOf('data-group-key="sessions"'));
  assert.match(sessions, /<span data-group-name="" class="min-w-0"><span dir="auto" class="dframe-fade-label [^"]*"[^>]*>(?:<[^>]+>)*Sessions</);
  // The list's own Group and sort (shared-21 vU → aU, R3-sections step 3): the same CDS trigger in CB's hover-revealed span.
  assert.match(sessions, /<span class="flex w-0 overflow-hidden group-hover\/labelrow:w-auto[^"]*"><button[^>]*class="[^"]*df-chrome-btn relative -my-1 source-current-filter-button"[^>]*aria-label="Group and sort" data-row-action=""[^>]*aria-haspopup="menu"/);
  assert.doesNotMatch(sessions, /data-group-list/);
  assert.doesNotMatch(body, /data-kind="group"/, 'Pinned, manual and the flat Sessions headings carry no kind');
});

test('SSR: an empty kept section shows bC\'s drop hint; Sessions sub-buckets carry data-kind="group"; a folded sub-bucket marks data-cycle-expands-group', async () => {
  const empty = render({ sessions: [thread('s1')], customGroups: groups, sessionMetadata: {}, onSessionAction() {}, onGroupAction() {},
    sidebarSections: Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: {}, sidebarPreferences: {} }), 'sessions', { show: { emptyGroups: true } }) });
  assert.match(empty, /<div class="df-drag-shiftable" data-drag-key="label:hint:custom-g1"><p data-empty-group-hint="" class="df-label-inset flex min-h-\[var\(--df-row-h\)\] select-none items-center py-1 pe-\[var\(--df-row-px\)\] text-caption text-muted-as-secondary">Drag or move sessions here<\/p><\/div>/);
  assert.match(empty, /data-group-key="custom-g1"[^>]*>[^]*?data-rowless=""/, 'an empty manual section heading is rowless (bC De)');
  // Sessions by date: each date bucket is a group heading (bC kind "group"), the first carries the list's controls.
  const dated = Model.setSectionView(sectionsOf({ customGroups: [], sessionMetadata: {}, sidebarPreferences: {} }), 'sessions', { groupBy: 'date' });
  const html = render({ sessions: [thread('a'), thread('b', { updatedAt: now - 40 * 86400 })], sidebarSections: dated, onSessionAction() {} });
  const headings = [...list(html).matchAll(/data-sidebar-group-label="" data-kind="group"/g)];
  assert.ok(headings.length >= 2, 'date buckets are group headings');
  assert.equal((list(html).match(/source-current-filter-button/g) || []).length, 1);
  // A manual section by date: `section:g1:` sub-buckets, a folded one (collapsedGroups) leaves the cycle marker.
  const metadata = { a: { customGroupId: 'g1' }, b: { customGroupId: 'g1' } };
  const bySection = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'g1', { groupBy: 'date' });
  const model = Layout.buildSidebarSections({ sections: bySection, sessions: [thread('a'), thread('b', { updatedAt: now - 40 * 86400 })], preferences: {}, metadata, customGroups: groups });
  const sub = model.layout.find((e) => e.kind === 'manual').buckets[1].key;
  const folded = render({ sessions: [thread('a'), thread('b', { updatedAt: now - 40 * 86400 })], customGroups: groups, sessionMetadata: metadata, sidebarSections: bySection,
    sidebarPreferences: { collapsedGroups: [sub] }, onSessionAction() {} });
  // R4i SI1 (Y1-R3-sidebar2-2): the folded sub-bucket's rows stay inside bC's hidden container, which carries the marker.
  assert.match(folded, new RegExp(`<div class="hidden" data-cycle-expands-group="${sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"><div [^>]*data-row-key="b"`));
  assert.match(folded, /data-group-key="section:g1:[^"]+" data-flush-heading=""/, 'the first sub-bucket heading is flush (sO flushFirstHeading)');
});

test('SSR: truncation 5 for a manual section and grouped Sessions, 20 for the flat list (Cj / Sr)', () => {
  const ids = Array.from({ length: 23 }, (_, i) => `r${i}`);
  const metadata = Object.fromEntries(ids.slice(0, 7).map((id) => [id, { customGroupId: 'g1' }]));
  const sessions = ids.map((id, i) => thread(id, { updatedAt: now - i }));
  const sections = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'sessions', { groupBy: 'none' });
  const html = render({ sessions, customGroups: groups, sessionMetadata: metadata, sidebarSections: sections });
  assert.match(html, /aria-label="Show 2 more in Research"/, '7 rows in a manual section: 5 shown');
  assert.doesNotMatch(html, /Show \d+ more in Sessions/, '16 unsectioned rows fit the flat 20');
  const more = render({ sessions: [...sessions, ...Array.from({ length: 6 }, (_, i) => thread(`x${i}`, { updatedAt: now - 100 - i }))], customGroups: groups, sessionMetadata: metadata, sidebarSections: sections });
  assert.match(more, /aria-label="Show 2 more in Sessions"/, '22 unsectioned rows: 20 shown');
  const grouped = render({ sessions: ids.slice(0, 7).map((id) => thread(id)), sidebarSections: Model.setSectionView(sections, 'sessions', { groupBy: 'environment' }) });
  assert.match(grouped, /aria-label="Show 2 more in work"/, 'grouped Sessions: 5 per bucket');
});

test('SSR: a folded section (its collapsed flag) hides its rows; the legacy custom:<id> key no longer folds once main sends the record', () => {
  const metadata = { s1: { customGroupId: 'g1' } };
  const record = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  const folded = render({ sessions: [thread('s1'), thread('s2')], customGroups: groups, sessionMetadata: metadata, sidebarSections: Model.setSectionView(record, 'g1', { collapsed: true }) });
  const manual = folded.slice(folded.indexOf('data-group-key="custom-g1"'));
  assert.match(manual, /data-rowless=""[^>]*>[^]*?aria-expanded="false"/);
  // R4i SI1 (Y1-R3-sidebar2-2): bC keeps the folded rows in its `hidden` container (the session cycle still lists them).
  assert.match(manual, /<div class="hidden"><div [^>]*data-source-session-id="s1"/);
  const legacy = render({ sessions: [thread('s1')], customGroups: groups, sessionMetadata: metadata, sidebarSections: record, sidebarPreferences: { collapsedGroups: ['custom:g1', 'custom-g1'] } });
  assert.match(legacy, /data-source-session-id="s1"/);
});

test('X7-04 SSR: a folded heading carries bC\'s badge (shared-21 HG) over its rows; an open one has none (R4g-sidebar SB1)', () => {
  const metadata = { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g1', unread: true }, s3: { customGroupId: 'g3' }, s4: { pinned: true, unread: true } };
  let record = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  record = Model.setSectionView(Model.setSectionView(Model.setSectionView(record, 'g1', { collapsed: true }), 'g3', { collapsed: true }), 'pinned', { collapsed: true });
  // s1 waits on an approval: the folded Research section shows "awaiting" before s2's unread (IG order).
  const state = { approvals: [{ params: { threadId: 's1' } }] };
  const html = render({ sessions: [thread('s1'), thread('s2'), thread('s3'), thread('s4'), thread('s5')], customGroups: groups, sessionMetadata: metadata,
    sidebarSections: record, state, onSessionAction() {}, onGroupAction() {} });
  const part = (key, next) => { const body = list(html); const from = body.indexOf(`data-group-key="${key}"`); return body.slice(from, next ? body.indexOf(`data-group-key="${next}"`, from) : undefined); };
  const badge = (label) => new RegExp(`<span data-group-badge="" [^>]*><span role="img" aria-label="${label}" class="flex items-center justify-center"><span class="contents \\[--cds-page-bg:transparent\\]"><span data-cds="Pulse"`);
  assert.match(part('custom-g1', 'custom-g3'), badge('A session in this group is waiting on you'));
  assert.match(part('pinned', 'custom-g1'), badge('Unread response'), 'Pinned folded (qk): its rows\' status');
  // Ops holds s3 with no status: the badge slot is there (bC passes HG), HG itself renders nothing.
  assert.match(part('custom-g3', 'sessions'), /<span data-group-badge="" [^>]*><\/span>/);
  // Sessions is open: no badge.
  assert.doesNotMatch(part('sessions'), /data-group-badge/);
  // The model carries the rows HG reads and the responding ids (shared-11 n_).
  const model = Layout.buildSidebarSections({ sections: record, sessions: [thread('s1'), thread('s2', { status: { type: 'active' } })], preferences: {}, metadata, customGroups: groups, state });
  assert.deepEqual(model.statusRows.get('s1'), { ref: { kind: 'code', id: 's1' }, source: { kind: 'code', data: { isArchived: false } }, hasError: false,
    liveStatus: 'awaiting', pendingPermissions: 0, isUnread: false });
  assert.equal(model.statusRows.get('s2').isUnread, true);
  assert.deepEqual([...model.respondingIds], ['s2']);
  assert.equal(Layout.foldedBadgeRows([thread('s1')], false, model.statusRows), null, 'open: no badge (bC Ee = yC)');
  assert.equal(Layout.foldedBadgeRows([], true, model.statusRows), null, 'folded and empty: no badge');
  assert.deepEqual(Layout.foldedBadgeRows([thread('s1')], true, model.statusRows), [model.statusRows.get('s1')]);
});

// ---------------------------------------------------------------- controlled render: SourceSidebar wiring
test('the sections list gets the original pieces: x$ / yx / f$ / uD / eO per manual section, iO\'s move by order', () => {
  const metadata = { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g3' } };
  const sections = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  const html = renderToStaticMarkup(React.createElement(M.sections.SidebarSectionsList, {
    model: Layout.buildSidebarSections({ sections, sessions: [thread('s1'), thread('s2')], preferences: {}, metadata, customGroups: groups }),
    host: { renderRows: () => null, shiftStyle: () => undefined, toggle() {}, folded: new Set(), drag: null, dropTargets: true, headerControls: null, trailing: () => null },
  }));
  assert.equal((html.match(/data-group-list="g/g) || []).length, 2);
  // Element tree of one manual section, rendered through its components with the hook dispatcher.
  const model = Layout.buildSidebarSections({ sections, sessions: [thread('s1'), thread('s2')], preferences: {}, metadata, customGroups: groups });
  const moves = [];
  const store = M.adapters.useSidebarSectionsStore;
  store.setState(Store.sidebarSectionsStoreSlice({ customGroups: groups, sessionMetadata: metadata, sidebarSections: sections }));
  const disconnect = M.adapters.connectSidebarSectionActions((action, payload) => moves.push([action, payload]));
  try {
    const createRef = { current: null };
    const f = fixture(M.sections.SidebarSectionsList, { model, host: { renderRows: () => null, shiftStyle: () => undefined, toggle() {}, folded: new Set(), dropTargets: true, headerControls: null, trailing: () => null }, createRef });
    assert.equal(typeof createRef.current, 'function', 'dx openCreate handed to the host menus');
    assert.ok(node(f.tree, (n) => n.type === M.dialog.CreateGroupDialog), 'iO mounts dx\'s createModal');
    const manuals = nodes(f.tree, (n) => n.props?.entry?.kind === 'manual');
    const sortables = manuals.map((manual) => fixture(manual.type, manual.props).tree);
    assert.ok(sortables.every((n) => n.type === M.sortable.SectionSortable), 'iO: x$ around every manual section');
    assert.deepEqual(sortables.map((n) => [n.props.bucketKey, n.props.sectionIndex, n.props.sectionCount, n.props.keyboardReorder, n.props.childOwnsMenu]),
      [['section:g1', 0, 2, true, true], ['section:g3', 1, 2, true, true]]);
    // iO x(e, t): the section at e takes the order of the one at t.
    sortables[0].props.onMoveSection(0, 1);
    assert.deepEqual(moves, [['move', { id: 'g1', index: sections.find((s) => s.id === 'g3').order }]]);
    const g = fixture(manuals[0].type, manuals[0].props);
    const menu = node(g.tree, (n) => n.type === M.menu.SidebarGroupMenu);
    assert.deepEqual([menu.props.groupId, menu.props.groupName, menu.props.bulkBucketKey], ['g1', 'Research', 'custom-g1']);
    assert.equal(menu.props.section.props['data-group-list'], 'g1');
    // tZ("hand-made", hasNewSession): without the host's new-session-in-group, New session is greyed (place-unknown).
    assert.deepEqual(menu.props.greyed, M.reasons.groupDisabledReasons('hand-made', false));
    assert.equal(menu.props.greyed.newSession.defaultMessage, M.reasons.newSessionReasonMessages['place-unknown'].defaultMessage);
    const body = menu.props.children({ onRename() {}, renameValue: 'Research', startRenameRef: { current: null }, onRenameEntered() {} });
    const gate = node(body, (n) => n.type === M.reorder.SectionReorderGate);
    assert.deepEqual([gate.props.bulkBucketKey, gate.props.groupName, gate.props.menu], ['custom-g1', 'Research', false]);
    const label = node(body, (n) => n.type === M.label.SidebarGroupLabel);
    assert.equal(label.props.renameValue, 'Research');
    assert.equal(typeof label.props.onRename, 'function', 'dD inline rename');
    assert.equal(node(label.props.trailing, (n) => n.type === M.view.SectionViewButton).props.section.id, 'g1');
  } finally { disconnect(); store.setState(Store.sidebarSectionsStoreSlice({})); }
});

test('SourceSidebar: seeds once, folds go to the section or collapsedGroups, the filter menu writes Sessions, Archive all confirms (YX)', async () => {
  const saved = [], sectionCalls = [];
  const metadata = { s1: { customGroupId: 'g1' } };
  const sidebarSections = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  const props = { sessions: [thread('s1'), thread('s2'), thread('s3', { cwd: '/fixture/other' })], knownFolders: ['/fixture/work', '/fixture/other'], customGroups: groups,
    sessionMetadata: metadata, sidebarSections, sidebarPreferences: { groupBy: 'custom', sortBy: 'created', collapsedGroups: [] }, onSessionAction: async () => {}, onGroupAction() {}, onCreateGroup() {},
    onSidebarPreferencesChange: (value) => saved.push(value), onSectionAction: (action, payload) => { sectionCalls.push([action, payload]); return Promise.resolve(); } };
  // The sidebar's own effects (key listeners, jump hints) only subscribe; nothing here dispatches a DOM event.
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const savedWindow = globalThis.window, savedDoc = globalThis.document;
  globalThis.window = { ...listeners, requestAnimationFrame: () => 0 };
  globalThis.document = { ...documentStub, ...listeners, querySelector: () => null, getElementById: () => null, activeElement: null };
  const store = M.adapters.useSidebarSectionsStore;
  try {
    const f = fixture(M.sidebar.SourceSidebar, props);
    const list = node(f.tree, (n) => n.type === M.sections.SidebarSectionsList);
    assert.ok(list, 'the Code list renders the sections layout');
    let { host, model } = list.props;
    assert.deepEqual(model.layout.map((e) => e.key), ['pinned', 'custom-g1', 'sessions']);
    // Effects: the store is hydrated from the snapshot, the bridge connected, and main's record seeded once (ex()).
    f.flush();
    assert.deepEqual(sectionCalls, [['seed', {}]]);
    assert.deepEqual(M.model.selectCodeSidebar(store.getState()).sections.map((s) => s.id), sidebarSections.map((s) => s.id), 'hydrated');
    f.render(); f.flush();
    assert.equal(sectionCalls.filter(([action]) => action === 'seed').length, 1);
    ({ host, model } = node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props);
    // Sessions (no groupBy) → project: folder buckets; the list's Group and sort on the first one only.
    assert.equal(model.preferences.groupBy, 'project');
    const sessionBuckets = model.layout.at(-1).buckets;
    assert.ok(host.trailing(sessionBuckets[0], { first: true }));
    assert.equal(host.trailing(sessionBuckets[1], { first: false }) === null || !!sessionBuckets[1].cwd, true);
    // A section's fold: setSectionView (bridged to main); a folder bucket's: the sidebar preferences, accumulated.
    host.toggle('custom-g1');
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'g1', view: { collapsed: true } }]);
    host.toggle('pinned');
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'pinned', view: { collapsed: true } }]);
    for (const bucket of sessionBuckets) host.toggle(bucket.key);
    assert.deepEqual(saved.at(-1).collapsedGroups, sessionBuckets.map((b) => b.key), 'folder folds accumulate in one event');
    assert.equal(saved.at(-1).groupBy, 'custom', 'the legacy groupBy is kept (D10), not rewritten');
    // The Group and sort menu (R3-sections step 3: shared-21 _U / vU / oU): the list's own filter in the Sessions heading,
    // its group / sort writers the original Sessions section writers (shared-16 ip / op), bridged to main.
    f.render();
    ({ host } = node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props);
    const filter = node(host.headerControls, (n) => n.type === M.filter.SourceCodeSidebarFilter);
    assert.equal(filter.props.preferences.groupBy, 'project');
    assert.ok('current' in filter.props.listRef, 'the list element ref (gU)');
    assert.deepEqual(Object.keys(host.viewAll).sort(), ['archivedInHand', 'listSettled', 'onViewAll']);
    const before = saved.length;
    const menu = fixture(M.filter.SessionListFilterMenu, { handle: {}, open: true, onOpenChange() {}, onRegroup() {}, preferences: filter.props.preferences });
    const content = node(menu.tree, (n) => n.type === M.filterView.CurrentSidebarFilterContent).props;
    content.onGroupBy('date', false);
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'sessions', view: { groupBy: 'date' } }]);
    content.onSortBy('alpha');
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'sessions', view: { sortBy: 'alpha' } }]);
    assert.equal(saved.length, before, 'the legacy sidebar preferences are not written (qf() || …)');
    // Select all (aZ → the selection store's setSelection): the keys land in the sidebar's own selection.
    M.adapters.useSidebarSelectionStore.getState().setSelection(['code:s2', 'code:s3']);
    f.render();
    ({ host, model } = node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props);
    const rows = model.buckets.flatMap((bucket) => nodes(host.renderRows(bucket), (n) => n.props?.['data-source-session-id']));
    assert.deepEqual(rows.filter((n) => n.props['data-selected'] === 'focused').map((n) => n.props['data-source-session-id']).sort(), ['s2', 's3']);
    // Archive all (XX → YX): the host flow asks with shared-19's confirmation, then archives the archivable rows.
    const archive = fixture(() => M.adapters.useSidebarBulkArchive(() => {})).tree;
    await archive('archive', ['code:s1', 'code:missing'], { confirmArchive: { groupName: 'Research' }, unloadedRemain: false });
    f.render();
    const confirm = node(f.tree, (n) => n.type === M.sidebar.SourceConfirmDialog);
    assert.deepEqual([confirm.props.title, confirm.props.body, confirm.props.confirmLabel, confirm.props.danger],
      ['Archive all sessions in \u201CResearch\u201D?', '1 session will be archived.', 'Archive all', false]);
    f.close();
  } finally {
    M.sections.clearPendingSectionFolds(); // R4g-sidebar SB1: the folds it sent are pending at main (X7-05)
    store.setState(Store.sidebarSectionsStoreSlice({}));
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    globalThis.document = savedDoc;
  }
});

test('X7-05: Select all on a folded section selects its rows before main answers the unfold (pending overlay); main\'s answer or refusal settles it', async () => {
  const sectionCalls = [], answers = [];
  const metadata = { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g1' }, s3: {} };
  const record = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'g1', { collapsed: true });
  const props = { sessions: [thread('s1'), thread('s2', { updatedAt: now - 1 }), thread('s3')], customGroups: groups, sessionMetadata: metadata, sidebarSections: record,
    sidebarPreferences: {}, onSessionAction: async () => {}, onGroupAction() {},
    onSectionAction: (action, payload) => { sectionCalls.push([action, payload]); return action === 'view' ? new Promise((resolve, reject) => answers.push({ resolve, reject })) : Promise.resolve(); } };
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const savedWindow = globalThis.window, savedDoc = globalThis.document;
  globalThis.window = { ...listeners, requestAnimationFrame: () => 0 };
  globalThis.document = { ...documentStub, ...listeners, querySelector: () => null, getElementById: () => null, activeElement: null };
  const organize = await server.ssrLoadModule('/src/generated/sidebar-sections/group-organize.mjs');
  const ListContext = (await server.ssrLoadModule('/src/generated/code-current/sidebar-group-view.mjs')).SidebarListContext;
  const store = M.adapters.useSidebarSectionsStore;
  const sectionsList = (f) => node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props;
  const selectedRows = (f) => { const { host, model } = sectionsList(f);
    return model.buckets.flatMap((bucket) => nodes(host.renderRows(bucket), (n) => n.props?.['data-source-session-id']))
      .filter((n) => n.props['data-selected'] === 'focused').map((n) => n.props['data-source-session-id']).sort(); };
  try {
    const f = fixture(M.sidebar.SourceSidebar, props);
    f.flush(); f.render(); f.flush();
    let { host } = sectionsList(f);
    assert.ok(host.folded.has('custom-g1'), 'Research starts folded (main\'s record)');
    // shared-19 aZ in the folded section's header menu: onExpand is the section's toggle (bC Ne), run by flushSync --
    // here the fixture's render and its layout effects, which is what flushSync does for the sidebar.
    const saved = ListContext._currentValue;
    ListContext._currentValue = { getList: () => null };
    let item;
    try { item = fixture(organize.SidebarGroupSelectAll, { bucketKey: 'custom-g1', onExpand: () => { host.toggle('custom-g1'); f.render(); f.flush(); } }).tree.props; }
    finally { ListContext._currentValue = saved; }
    assert.equal(item.disabled, false, 'the folded rows are registered');
    item.onClick();
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'g1', view: { collapsed: false } }]);
    assert.equal(answers.length, 1, 'main has not answered yet');
    assert.deepEqual([...M.adapters.useSidebarSelectionStore.getState().selectedKeys].sort(), ['code:s1', 'code:s2'], 'Select all took both rows at once');
    f.render(); f.flush();
    ({ host } = sectionsList(f));
    assert.ok(!host.folded.has('custom-g1'), 'the section shows open while main has not answered');
    assert.deepEqual(selectedRows(f), ['s1', 's2']);
    // Main answers with its record: the pending fold gives way to main's own (open) record.
    answers[0].resolve();
    await new Promise((resolve) => setImmediate(resolve));
    props.sidebarSections = Model.setSectionView(record, 'g1', { collapsed: false });
    f.render(); f.flush(); f.render();
    ({ host } = sectionsList(f));
    assert.ok(!host.folded.has('custom-g1'));
    // A fold main refuses: it shows at once, then main's record (open) again once refused.
    host.toggle('custom-g1');
    f.render(); f.flush();
    ({ host } = sectionsList(f));
    assert.ok(host.folded.has('custom-g1'), 'the fold shows before main answers');
    answers[1].reject(new Error('refused'));
    await new Promise((resolve) => setImmediate(resolve));
    f.render(); f.flush();
    ({ host } = sectionsList(f));
    assert.ok(!host.folded.has('custom-g1'), 'a refused fold falls back to main\'s record');
    // Main decides otherwise: an answered fold whose snapshot disagrees gives way to the next snapshot.
    host.toggle('custom-g1');
    f.render(); f.flush();
    answers[2].resolve();
    await new Promise((resolve) => setImmediate(resolve));
    f.render();
    assert.ok(sectionsList(f).host.folded.has('custom-g1'), 'answered, but main\'s snapshot has not arrived: still the pending fold');
    props.sidebarSections = Model.setSectionView(record, 'g1', { collapsed: false, sortBy: 'alpha' });
    f.render(); f.flush(); f.render();
    assert.ok(!sectionsList(f).host.folded.has('custom-g1'), 'the next snapshot is main\'s answer');
    f.close();
  } finally {
    M.sections.clearPendingSectionFolds();
    M.adapters.useSidebarSelectionStore.getState().clear();
    store.setState(Store.sidebarSectionsStoreSlice({}));
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    globalThis.document = savedDoc;
  }
});

test('X7-05: withPendingSectionFolds lays pending folds over main\'s list and keeps identities when nothing differs', () => {
  const sections = sectionsOf({ customGroups: groups, sessionMetadata: { a: { customGroupId: 'g1' } }, sidebarPreferences: {} });
  assert.equal(Layout.withPendingSectionFolds(sections, new Map()), sections);
  assert.equal(Layout.withPendingSectionFolds(sections, new Map([['g1', false]])), sections, 'already open');
  const next = Layout.withPendingSectionFolds(sections, new Map([['g1', true], ['gone', true]]));
  assert.notEqual(next, sections);
  assert.equal(next.find((s) => s.id === 'g1').collapsed, true);
  assert.deepEqual(next.filter((s) => s.id !== 'g1'), sections.filter((s) => s.id !== 'g1'));
  assert.ok(next.filter((s) => s.id !== 'g1').every((s, i) => s === sections.filter((t) => t.id !== 'g1')[i]), 'other sections keep their identity');
  assert.equal(Layout.withPendingSectionFolds(null, new Map([['g1', true]])), null);
});

test('R4g review fix (X7-03): withPendingSectionMoves runs main\'s own moveSection (zp) over the list, keeping it when nothing moves', () => {
  const sections = sectionsOf({ customGroups: groups, sessionMetadata: { a: { customGroupId: 'g1' }, b: { customGroupId: 'g3' } }, sidebarPreferences: {} });
  const ids = (list) => list.map((s) => s.id);
  assert.equal(Layout.withPendingSectionMoves(sections, []), sections);
  assert.equal(Layout.withPendingSectionMoves(null, [{ id: 'g1', index: 0 }]), null);
  const g1 = sections.find((s) => s.id === 'g1'), g3 = sections.find((s) => s.id === 'g3');
  assert.equal(Layout.withPendingSectionMoves(sections, [{ id: 'g1', index: g1.order }]), sections, 'already there');
  assert.equal(Layout.withPendingSectionMoves(sections, [{ id: 'gone', index: 0 }]), sections);
  const moved = Layout.withPendingSectionMoves(sections, [{ id: 'g1', index: g3.order }]);
  assert.deepEqual(ids(moved), ids(Model.moveSection(sections, 'g1', g3.order)), 'the same function main applies (section-move)');
  assert.ok(ids(moved).indexOf('g1') > ids(moved).indexOf('g3'));
  assert.equal(moved.at(-1).id, 'sessions', 'Sessions stays last');
  assert.deepEqual(moved.map((s) => s.order), moved.map((_, i) => i), 'orders renumbered (Tp)');
  // Moves apply in the order sent.
  const back = Layout.withPendingSectionMoves(sections, [{ id: 'g1', index: g3.order }, { id: 'g1', index: g1.order }]);
  assert.deepEqual(ids(back), ids(sections));
});

test('R4g review fix (X7-03): a dropped section is at its new place before main answers (pending move); main\'s snapshot, a refusal or main deciding otherwise settles it', async () => {
  const sectionCalls = [], answers = [];
  const metadata = { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g3' }, s3: {} };
  const record = sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} });
  const props = { sessions: [thread('s1'), thread('s2'), thread('s3')], customGroups: groups, sessionMetadata: metadata, sidebarSections: record,
    sidebarPreferences: {}, onSessionAction: async () => {}, onGroupAction() {},
    onSectionAction: (action, payload) => { sectionCalls.push([action, payload]); return action === 'move' ? new Promise((resolve, reject) => answers.push({ resolve, reject })) : Promise.resolve(); } };
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const savedWindow = globalThis.window, savedDoc = globalThis.document;
  globalThis.window = { ...listeners, requestAnimationFrame: () => 0 };
  globalThis.document = { ...documentStub, ...listeners, querySelector: () => null, getElementById: () => null, activeElement: null };
  const store = M.adapters.useSidebarSectionsStore;
  const listProps = (f) => node(f.tree, (n) => n.type === M.sections.SidebarSectionsList).props;
  const manualKeys = (f) => listProps(f).model.layout.filter((e) => e.kind === 'manual').map((e) => e.key);
  // iO's S$ (the first SectionReorder in the list): a drop calls its onCommitDrag(activeKey, overKey) -- iO `b`.
  const drop = (f, active, over) => {
    const list = fixture(M.sections.SidebarSectionsList, listProps(f));
    const reorder = node(list.tree, (n) => typeof n.props?.onCommitDrag === 'function' && Array.isArray(n.props?.sortableBucketKeys));
    reorder.props.onCommitDrag(active, over);
    return reorder.props.sortableBucketKeys;
  };
  const settle = async (f) => { await new Promise((resolve) => setImmediate(resolve)); f.render(); f.flush(); f.render(); };
  try {
    const f = fixture(M.sidebar.SourceSidebar, props);
    f.flush(); f.render(); f.flush();
    assert.deepEqual(manualKeys(f), ['custom-g1', 'custom-g3']);
    assert.deepEqual(drop(f, 'section:g1', 'section:g3'), ['section:g1', 'section:g3']);
    const g3 = record.find((s) => s.id === 'g3');
    assert.deepEqual(sectionCalls.at(-1), ['move', { id: 'g1', index: g3.order }]);
    assert.equal(answers.length, 1, 'main has not answered yet');
    f.render(); f.flush();
    assert.deepEqual(manualKeys(f), ['custom-g3', 'custom-g1'], 'the dropped section is at its new place while main has not answered (no spring back)');
    assert.deepEqual(M.sections.storeSections().map((s) => s.id), Model.moveSection(record, 'g1', g3.order).map((s) => s.id), 'the store hydrates from the same list');
    // Main answers and its snapshot shows the move: the pending move gives way to main's record.
    answers[0].resolve();
    const moved = Model.moveSection(record, 'g1', g3.order);
    props.sidebarSections = moved;
    await settle(f);
    assert.deepEqual(manualKeys(f), ['custom-g3', 'custom-g1']);
    // A move main refuses: it shows at once, then main's order again once refused.
    drop(f, 'section:g3', 'section:g1');
    f.render(); f.flush();
    assert.deepEqual(manualKeys(f), ['custom-g1', 'custom-g3'], 'the move shows before main answers');
    answers[1].reject(new Error('refused'));
    await settle(f);
    assert.deepEqual(manualKeys(f), ['custom-g3', 'custom-g1'], 'a refused move falls back to main\'s order');
    // Main decides otherwise: an answered move whose snapshot disagrees gives way to the next snapshot.
    drop(f, 'section:g3', 'section:g1');
    f.render(); f.flush();
    answers[2].resolve();
    await new Promise((resolve) => setImmediate(resolve));
    f.render();
    assert.deepEqual(manualKeys(f), ['custom-g1', 'custom-g3'], 'answered, but main\'s snapshot has not arrived: still the pending move');
    props.sidebarSections = Model.setSectionView(moved, 'g1', { sortBy: 'alpha' });
    await settle(f);
    assert.deepEqual(manualKeys(f), ['custom-g3', 'custom-g1'], 'the next snapshot is main\'s answer');
    f.close();
  } finally {
    M.sections.clearPendingSectionFolds();
    store.setState(Store.sidebarSectionsStoreSlice({}));
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    globalThis.document = savedDoc;
  }
});

test('zh-CN: the Archive all confirmation reads the R3-sections dictionary block (ICU plural / select)', async () => {
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const start = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  const previous = i18n.getLocale();
  i18n.setLocale('zh-CN');
  try {
    let copy, plain;
    renderToStaticMarkup(React.createElement(function Probe() {
      const intl = start.useStartIntl();
      copy = M.sections.bulkArchiveConfirmCopy(intl, { groupName: '研究', count: 3, unloadedRemain: true });
      plain = M.sections.bulkArchiveConfirmCopy(intl, { count: 1 });
      return null;
    }));
    assert.deepEqual(copy, { title: '归档“研究”中的所有会话？', body: '将归档 3 个会话。尚未加载的会话不会被归档。', confirmLabel: '全部归档', danger: false });
    assert.deepEqual([plain.title, plain.body], ['归档所有会话？', '将归档 1 个会话。']);
  } finally { i18n.setLocale(previous); }
  // The English source strings are shared-19's, verbatim.
  const shared19 = await read(path.join(reference, 'shared-19-CkPOiIKm.js'));
  for (const message of Object.values(M.sections.BULK_ARCHIVE_COPY))
    assert.ok(shared19.includes(`defaultMessage:${JSON.stringify(message.defaultMessage).replace(/[\u2018-\u201d]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).toUpperCase())},id:"${message.id}"`), message.id);
});

test('the store bridge: the original actions run locally, the outermost one is sent to main; add proposes its id', () => {
  const store = M.adapters.useSidebarSectionsStore;
  const metadata = { s1: { customGroupId: 'g1' } };
  store.setState({ ...Store.sidebarSectionsStoreSlice({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), groupsKeptWhileEmpty: [] });
  const sent = [];
  const disconnect = M.adapters.connectSidebarSectionActions((action, payload) => sent.push([action, payload]));
  try {
    const section = store.getState().addSection('Fresh');
    assert.match(section.id, /^cg-[0-9a-f-]{36}$/);
    assert.deepEqual(sent, [['add', { name: 'Fresh', id: section.id }]], 'addSection → addCustomGroup → keepGroupWhileEmpty / Rp: one request');
    assert.ok(store.getState().groupsKeptWhileEmpty.includes(section.id));
    assert.deepEqual(Store.sidebarSectionRequest('add', { name: 'Fresh', id: section.id }), { operation: 'create-group', name: 'Fresh', sections: true, id: section.id });
    store.getState().addCustomGroup('Research');
    assert.deepEqual(sent.at(-1), ['add', { name: 'Research', id: 'g1' }], 'a same-named group is reused (and expanded) by main too');
    store.getState().renameCustomGroup('g1', 'Renamed');
    store.getState().deleteSection('g3');
    store.getState().moveSection('g2', 0);
    store.getState().setSectionView('g2', { sortBy: 'alpha' });
    store.getState().assignToSection(['code:s1', 'code:s2'], 'g2');
    assert.deepEqual(sent.slice(2), [['rename', { id: 'g1', name: 'Renamed' }], ['delete', { id: 'g3' }], ['move', { id: 'g2', index: 0 }],
      ['view', { id: 'g2', view: { sortBy: 'alpha' } }], ['assign', { keys: ['code:s1', 'code:s2'], sectionId: 'g2' }]]);
    // expandGroup(um(id)) on a folded section opens it (the shared-52 expandGroup branch); an open one sends nothing.
    store.getState().setSectionView('g2', { collapsed: true });
    const before = sent.length;
    store.getState().expandGroup('custom-g2');
    assert.deepEqual(sent.slice(before), [['view', { id: 'g2', view: { collapsed: false } }]]);
    store.getState().expandGroup('custom-g2');
    assert.equal(sent.length, before + 1);
    // Without a handler (no main) the original actions still work on the store alone.
    disconnect();
    store.getState().renameCustomGroup('g2', 'Local');
    assert.equal(sent.length, before + 1);
  } finally { disconnect(); store.setState(Store.sidebarSectionsStoreSlice({})); }
});

test('main takes the proposed id for a new section and refuses a malformed or taken one', () => {
  const config = { threadIds: ['s1'], archivedThreadIds: [], customGroups: [{ id: 'g1', name: 'A' }], sessionMetadata: {}, sidebarPreferences: {} };
  const deps = { knownSessionIds: () => new Set(['s1']), mirror() {}, codexSections: {}, randomUUID: () => '00000000-0000-4000-8000-000000000000' };
  const id = 'cg-12345678-1234-4123-8123-123456789abc';
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'B', sections: true, id }, deps);
  assert.ok(config.customGroups.some((g) => g.id === id && g.name === 'B'));
  for (const bad of ['g1', 'cg-nope', id, '../x']) {
    Store.applySidebarSectionOperation(config, { operation: 'create-group', name: `C ${bad}`, sections: true, id: bad }, deps);
    assert.equal(config.customGroups.at(-1).id, 'cg-00000000-0000-4000-8000-000000000000', bad);
    config.customGroups.pop();
  }
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'D', id: 'cg-22345678-1234-4123-8123-123456789abc' }, deps);
  assert.equal(config.customGroups.at(-1).id, 'cg-00000000-0000-4000-8000-000000000000', 'the classic create never takes a renderer id');
});

test('generator: the new section pieces are original 2.42304.0 bindings (x$ v$ y$ _$, f$, shared-11 Ub/Wb, shared-21 Uk)', async () => {
  const manifest = await extractSidebarSections({ check: true });
  const find = (target) => manifest.modules.find((m) => m.target === target);
  assert.deepEqual(find('section-sortable.mjs').bindings.map((b) => b.name).sort(), ['_$', 'v$', 'x$', 'y$']);
  assert.equal(find('section-sortable.mjs').source, 'shared-19-CkPOiIKm.js');
  assert.deepEqual(find('section-focus.mjs').bindings.map((b) => b.name).sort(), ['Ub', 'Vb', 'Wb']);
  assert.ok(find('group-reorder.mjs').bindings.some((b) => b.name === 'f$'));
  assert.ok(find('section-hover.mjs').bindings.some((b) => b.name === 'Uk'));
  // shared-19 imports dx / xx from shared-11's D / N (Wb / Ub), shared-22 its hv from shared-21's do (Uk), cn from Ii (f$).
  const shared19 = await read(path.join(reference, 'shared-19-CkPOiIKm.js'));
  assert.match(shared19, /D as dx,/); assert.match(shared19, /N as xx,/); assert.match(shared19, /f\$ as Ii/); assert.match(shared19, /x\$ as Li/);
  const shared11 = await read(path.join(reference, 'shared-11-BuQ3CK5I.js'));
  assert.match(shared11, /Wb as D[,}]/); assert.match(shared11, /Ub as N[,}]/);
  const shared22 = await read(path.join(reference, 'shared-22-HztmyUTM.js'));
  assert.match(shared22, /do as hv/); assert.match(shared22, /Ii as cn/); assert.match(shared22, /Li as pn/);
  // The host wiring stays in the R3-sections modules: source-sidebar.jsx only mounts SidebarSectionsList.
  const sidebar = await read(path.join(app, 'src/source-sidebar.jsx'));
  assert.match(sidebar, /sectionsModel \? <SidebarSectionsList model=\{sectionsModel\} host=\{sectionsHost\} createRef=\{sectionDialog\} \/> : displayed\.map/);
});

// ---------------------------------------------------------------- R4i-sidebar SI1: folded rows stay in a hidden container
// Y1-R3-sidebar2-2 / cov7-02: shared-22 bC keeps a folded bucket's rows in `c("div",{className:z?"hidden":"contents",…})`
// (data-cycle-expands-group on a drawsOpenRows bucket not itself under a folded one), so the session cycle's tm lists
// them and rm / yS unfold the group the step enters. The SSR markup of the real SourceSidebar is read into a small DOM
// (no DOM library here) for the cycle's own selectors.
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const decodeHtml = (text) => text.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function selectorTest(selector) {
  const one = (text) => {
    const checks = []; let rest = text.trim(), m;
    while (rest) {
      if ((m = /^\.([\w-]+)/.exec(rest))) { const cls = m[1]; checks.push((el) => (el.getAttribute('class') ?? '').split(/\s+/).includes(cls)); }
      else if ((m = /^\[([\w-]+)(?:="([^"]*)")?\]/.exec(rest))) { const [, name, value] = m; checks.push((el) => el.hasAttribute(name) && (value === undefined || el.getAttribute(name) === value)); }
      else if ((m = /^:not\(([^)]*)\)/.exec(rest))) { const inner = one(m[1]); checks.push((el) => !inner(el)); }
      else if ((m = /^[a-z][\w-]*/.exec(rest))) { const tag = m[0]; checks.push((el) => el.tag === tag); }
      else throw Error(`selector ${text}`);
      rest = rest.slice(m[0].length);
    }
    return (el) => checks.every((check) => check(el));
  };
  const alternatives = selector.split(',').map((complex) => complex.trim().split(/\s+(?![^[(]*[\])])/).map(one));
  return (el) => alternatives.some((chain) => {
    if (!chain.at(-1)(el)) return false;
    let index = chain.length - 2;
    for (let at = el.parent; index >= 0 && at; at = at.parent) if (at.tag && chain[index](at)) index -= 1;
    return index < 0;
  });
}
class MiniEl {
  constructor(tag) { this.tag = tag; this.attrs = new Map(); this.children = []; this.parent = null; this.clicks = 0; }
  getAttribute(name) { return this.attrs.has(name) ? this.attrs.get(name) : null; }
  hasAttribute(name) { return this.attrs.has(name); }
  get isConnected() { let at = this; while (at.parent) at = at.parent; return at.connected === true; }
  *walk() { for (const child of this.children) { yield child; yield* child.walk(); } }
  querySelectorAll(selector) { const match = selectorTest(selector); return [...this.walk()].filter(match); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector) { const match = selectorTest(selector); for (let at = this; at?.tag; at = at.parent) if (match(at)) return at; return null; }
  scrollIntoView() {}
  click() { this.clicks += 1; }
}
function miniDom(html) {
  const root = new MiniEl(null); root.connected = true; let at = root;
  for (const m of html.matchAll(/<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[^\s"'>/=]+(?:="[^"]*")?)*)\s*(\/?)>|[^<]+/g)) {
    if (m[1]) { const tag = m[1].toLowerCase(); let up = at; while (up !== root && up.tag !== tag) up = up.parent; if (up !== root) at = up.parent; continue; }
    if (!m[2]) continue;
    const el = new MiniEl(m[2].toLowerCase());
    for (const a of m[3].matchAll(/([^\s"'>/=]+)(?:="([^"]*)")?/g)) el.attrs.set(a[1], decodeHtml(a[2] ?? ''));
    el.parent = at; at.children.push(el);
    if (!m[4] && !VOID_TAGS.has(el.tag)) at = el;
  }
  return root;
}
const rowKeyOf = (button) => button?.closest('[data-row-key]')?.getAttribute('data-row-key') ?? null;
const hiddenAround = (el) => { for (let at = el.parent; at?.tag; at = at.parent) if ((at.getAttribute('class') ?? '').split(/\s+/).includes('hidden')) return at; return null; };

test('R4i SI1 SSR: a folded bucket keeps its rows in bC\'s hidden container; the cycle marker only on a drawsOpenRows bucket not under a folded one; Pinned folds as qk', () => {
  const metadata = { a: { customGroupId: 'g1' }, b: { customGroupId: 'g1' }, c: { customGroupId: 'g3' }, p: { pinned: true } };
  const sessions = [thread('a'), thread('b', { updatedAt: now - 40 * 86400 }), thread('c'), thread('p'), thread('s')];
  let record = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'g1', { groupBy: 'date' });
  const model = Layout.buildSidebarSections({ sections: record, sessions, preferences: {}, metadata, customGroups: groups });
  const sub = model.layout.find((e) => e.key === 'custom-g1').buckets[1].key;
  // Research open by date with its older sub-bucket folded; Ops (flat) folded; Pinned folded.
  record = Model.setSectionView(Model.setSectionView(record, 'g3', { collapsed: true }), 'pinned', { collapsed: true });
  const html = render({ sessions, customGroups: groups, sessionMetadata: metadata, sidebarSections: record, sidebarPreferences: { collapsedGroups: [sub] }, onSessionAction() {}, onGroupAction() {} });
  const dom = miniDom(html);
  const rowOf = (id) => dom.querySelector(`[data-row-key="${id}"]`);
  // The folded sub-bucket: rows inside `hidden`, which carries data-cycle-expands-group (sO drawsOpenRows, B !== null, !te).
  const markers = dom.querySelectorAll('[data-cycle-expands-group]');
  assert.deepEqual(markers.map((el) => el.getAttribute('data-cycle-expands-group')), [sub]);
  assert.equal(hiddenAround(rowOf('b')), markers[0], 'b sits in the folded sub-bucket\'s hidden container');
  assert.equal(markers[0].hasAttribute('data-group-rows'), false);
  // The folded flat section (Ops): rows in `hidden`, no marker (oO passes no drawsOpenRows); its heading stays rowless.
  const ops = rowOf('c');
  assert.ok(ops && hiddenAround(ops), 'c is rendered, hidden');
  assert.equal(hiddenAround(ops).hasAttribute('data-cycle-expands-group'), false);
  // Open buckets keep the host rows container; Pinned folded draws no rows (qk `!F && J.flatMap(…)`).
  assert.equal(hiddenAround(rowOf('a')), null);
  assert.equal(hiddenAround(rowOf('s')), null);
  assert.equal(rowOf('p'), null, 'a folded Pinned list has no rows');
  // A folded sub-grouped section: its sub-buckets stay inside its hidden container (oO rowsBody under rv), and a folded
  // sub-bucket there leaves no marker of its own (te).
  const folded = render({ sessions, customGroups: groups, sessionMetadata: metadata, sidebarSections: Model.setSectionView(record, 'g1', { collapsed: true }),
    sidebarPreferences: { collapsedGroups: [sub] }, onSessionAction() {}, onGroupAction() {} });
  const foldedDom = miniDom(folded);
  assert.equal(foldedDom.querySelectorAll('[data-cycle-expands-group]').length, 0);
  const outer = foldedDom.querySelector('[data-group-key="custom-g1"]').children.find((el) => el.getAttribute('class') === 'hidden');
  assert.ok(outer && outer.querySelector('[data-row-key="b"]'), 'a and b both under the section\'s hidden container');
  assert.ok(outer.querySelectorAll('[data-group-key]').length >= 2, 'the sub-buckets are drawn inside it');
});

test('R4i SI1 controlled: the session cycle enters a folded group -- rm unfolds a drawsOpenRows bucket through the sidebar\'s expandGroup, yS unfolds the others once the row opens', async () => {
  const cycle = await server.ssrLoadModule('/src/session-cycle-model.mjs');
  const cycleAdapters = await server.ssrLoadModule('/src/session-cycle-adapters.mjs');
  const saved = [], sectionCalls = [];
  const metadata = { a: { customGroupId: 'g1' }, b: { customGroupId: 'g1' }, c: { customGroupId: 'g3' } };
  const sessions = [thread('a'), thread('b', { updatedAt: now - 40 * 86400 }), thread('c'), thread('s')];
  let record = Model.setSectionView(sectionsOf({ customGroups: groups, sessionMetadata: metadata, sidebarPreferences: {} }), 'g1', { groupBy: 'date' });
  const sub = Layout.buildSidebarSections({ sections: record, sessions, preferences: {}, metadata, customGroups: groups }).layout.find((e) => e.key === 'custom-g1').buckets[1].key;
  record = Model.setSectionView(record, 'g3', { collapsed: true });
  // The sidebar re-renders on its preferences (main.jsx keeps them in sync, as flushSync does for rm): the test answers
  // onSidebarPreferencesChange by re-rendering the fixture and the markup the cycle reads.
  let dom = null;
  const props = { sessions, customGroups: groups, sessionMetadata: metadata, sidebarSections: record, sidebarPreferences: { collapsedGroups: [sub] }, current: 'a',
    onSessionAction: async () => {}, onGroupAction() {}, onOpen() {},
    onSidebarPreferencesChange: (value) => { saved.push(value); props.sidebarPreferences = value; f.render(); dom = miniDom(render(props)); },
    onSectionAction: (action, payload) => { sectionCalls.push([action, payload]); return Promise.resolve(); } };
  const listeners = { addEventListener() {}, removeEventListener() {} };
  const savedWindow = globalThis.window, savedDoc = globalThis.document;
  globalThis.window = { ...listeners, requestAnimationFrame: () => 0, navigator: globalThis.navigator };
  globalThis.document = { ...documentStub, ...listeners, querySelector: () => null, getElementById: () => null, activeElement: null };
  const store = M.adapters.useSidebarSectionsStore;
  let f;
  try {
    f = fixture(M.sidebar.SourceSidebar, props);
    f.flush(); f.render(); f.flush();
    dom = miniDom(render(props));
    // W.getState() (session-cycle-adapters) is the sidebar's: the folded keys and its expandGroup.
    assert.ok(cycleAdapters.sessionCycleGroupStore.getState().collapsedGroups.includes(sub));
    // tm over the host list: the hidden rows' buttons are listed (before: only drawn rows), the open row selected.
    const listed = cycle.sidebarCycleButtons(dom);
    const order = listed.buttons.map(rowKeyOf);
    assert.ok(order.includes('b') && order.includes('c'), `folded rows are cycled through: ${order}`);
    assert.equal(rowKeyOf(listed.buttons[listed.selectedIdx]), 'a');
    const opened = [];
    const cycler = cycle.createSessionCycler({ rows: () => cycle.sidebarCycleButtons(dom), open: (button) => opened.push(rowKeyOf(button)), now: () => 0 });
    // ⌃Tab from a: b is next, in the folded drawsOpenRows sub-bucket -> rm: expandGroup(sub) (flushSync), the step is
    // taken again over the unfolded list and opens b, now outside any hidden container.
    const toB = order.indexOf('b') - order.indexOf('a');
    for (let i = 0; i < toB; i += 1) {
      assert.equal(cycler.step(1), true);
      if (opened.at(-1) !== 'b') { props.current = opened.at(-1); f.render(); dom = miniDom(render(props)); }
    }
    assert.equal(opened.at(-1), 'b');
    assert.ok(!saved.at(-1).collapsedGroups.includes(sub), 'rm unfolded the sub-bucket through the sidebar');
    assert.equal(hiddenAround(dom.querySelector('[data-row-key="b"]')), null);
    assert.equal(dom.querySelectorAll('[data-cycle-expands-group]').length, 0);
    // c is in the folded Ops section (no marker): the step opens its hidden row; once it is the open session, the
    // sidebar's yS unfolds Ops (setSectionView collapsed false, bridged to main).
    props.current = 'b'; f.render(); f.flush(); dom = miniDom(render(props));
    const now2 = cycle.sidebarCycleButtons(dom).buttons.map(rowKeyOf);
    const steps = (now2.indexOf('c') - now2.indexOf('b') + now2.length + 1) % (now2.length + 1);
    const before = sectionCalls.length;
    for (let i = 0; i < steps; i += 1) {
      cycler.step(1);
      if (opened.at(-1) !== 'c') { props.current = opened.at(-1); f.render(); f.flush(); dom = miniDom(render(props)); }
    }
    assert.equal(opened.at(-1), 'c');
    assert.ok(hiddenAround(dom.querySelector('[data-row-key="c"]')), 'c was opened from the hidden container');
    assert.equal(sectionCalls.length, before, 'rm does not unfold a bucket without the marker');
    props.current = 'c'; f.render(); f.flush();
    assert.deepEqual(sectionCalls.at(-1), ['view', { id: 'g3', view: { collapsed: false } }], 'yS unfolds the folded section the open row is in');
  } finally {
    f?.close();
    M.sections.clearPendingSectionFolds();
    store.setState(Store.sidebarSectionsStoreSlice({}));
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
    globalThis.document = savedDoc;
  }
});
