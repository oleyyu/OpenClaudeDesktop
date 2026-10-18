// Work item sidebar-sections-store (research/sidebar-sections.md WI-2, decisions D10): config.sidebarSections and the
// sidebar-state section operations (electron/sidebar-sections-store.mjs), seeded once from the legacy custom groups
// (customGroups / sessionMetadata[].customGroupId / "ccg::" order / sidebarPreferences) the way 2.42304.0 seeds its
// sections from the account's legacy preferences: shared-52 Em (kp) and shared-22 $b (Bp over Qb). The seeding waits for
// the sections layout (its first section operation, or sections-seed): until then the classic list keeps writing the
// legacy preferences, and the sections are derived from them as they are (R2 review fix). Nothing here opens a
// window or talks to a core: pure functions over config objects, the original store actions on a plain store, a mocked
// Codex owner for the threadSection mirror, and the renderer store loaded through Vite SSR.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { format } from '../../tools/node_modules/prettier/index.mjs';
import * as Store from '../electron/sidebar-sections-store.mjs';
import * as Model from '../electron/generated/sidebar-sections-model.mjs';
import * as RendererModel from '../src/generated/sidebar-sections/sections-model.mjs';

const require = createRequire(import.meta.url);
const codexSections = require('../electron/codex-sections.cjs');
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
const copy = (value) => structuredClone(value);

// ---------------------------------------------------------------- the official flow, written from the 2.42304.0 text
// Independently of the store module: how shared-22 Qb reads the account's legacy preferences, over the host's fields.
const LEGACY_GROUP_BYS = ['date', 'project', 'state', 'custom', 'none'];
function officialGroups(config) {
  const groups = (Array.isArray(config.customGroups) ? config.customGroups : [])
    .filter((g) => g && typeof g === 'object' && !Array.isArray(g) && typeof g.id === 'string' && typeof g.name === 'string')
    .map((g) => ({ id: g.id, name: g.name }));
  const ids = new Set(groups.map((g) => g.id));
  const assignments = {};
  const metadata = config.sessionMetadata && typeof config.sessionMetadata === 'object' ? config.sessionMetadata : {};
  for (const [id, meta] of Object.entries(metadata)) if (meta && typeof meta === 'object' && ids.has(meta.customGroupId)) assignments[`code:${id}`] = meta.customGroupId;
  return { groups, assignments, order: {} };
}
function officialCollapsedGroups(config) {
  const keys = Array.isArray(config.sidebarPreferences?.collapsedGroups) ? config.sidebarPreferences.collapsedGroups : [];
  return keys.filter((k) => typeof k === 'string' && k).map((k) => k.startsWith('custom:') ? `custom-${k.slice(7)}` : k);
}
// shared-22 Qb: {collapsedGroups: t} = Q.getState(); jc(`${key}.${account}`) for gi (code-projects-order), Ub
// (code-sessions-sort-ascending), Ni (code-sessions-show-empty-projects); `t.includes("recents")`, `t.includes("pinned")`,
// `t.includes($a(e))`; Zb filter + slice(5). Host keys: the flat list folds as "sessions" too; no Routines section.
function officialQb(config) {
  const prefs = config.sidebarPreferences && typeof config.sidebarPreferences === 'object' ? config.sidebarPreferences : {};
  const t = officialCollapsedGroups(config);
  const r = Array.isArray(config.projectOrder) ? config.projectOrder : [];
  return {
    ascending: prefs.ascending === true,
    emptyGroups: prefs.showEmptyGroups === true,
    routinesCollapsed: true,
    sessionsCollapsed: t.includes('recents') || t.includes('sessions'),
    pinnedCollapsed: t.includes('pinned'),
    isManualCollapsed: (e) => t.includes(`custom-${e}`),
    manualOrder: r.filter((e) => typeof e == 'string' && e.startsWith('ccg::')).map((e) => e.slice(5)),
  };
}
// onIdentityResolve: `i = La(t, n)` (Em), then `!i.prefsSeeded && Ic() && (i = $b(i, n, …))`; $b without the legacy
// dframe-code-sections: `{...i, sections: Aa(i.sections, Qb(a)), prefsSeeded: !0}` (Aa = Bp).
function officialSeed(model, config) {
  const prefs = config.sidebarPreferences && typeof config.sidebarPreferences === 'object' ? config.sidebarPreferences : {};
  const state = { activeGroupScope: 'local', codeSidebarByScope: {}, customGroupsByScope: { local: officialGroups(config) },
    groupByByMode: { code: LEGACY_GROUP_BYS.includes(prefs.groupBy) ? prefs.groupBy : undefined }, sortByByMode: { code: prefs.sortBy } };
  const i = model.reconcileCodeSidebar(state, 'local');
  const seeded = model.seedSectionPrefs(i.sections, officialQb(config));
  // R3-sections host step after Bp (store seedLegacyMetadata): the host's Show › Metadata carries into Sessions
  // show.metadata, as 2.37337.1's Bp (shared-52 Th) seeded it; 2.42304.0's Bp does not.
  const sections = prefs.showMetadata === true ? model.patchSectionView(seeded, 'sessions', { show: { metadata: true } }) : seeded;
  return { ...i, sections, prefsSeeded: true };
}
// A plain store over the original shared-52 store actions (zustand-like set / get).
function officialStore(initial) {
  let state = { activeGroupScope: 'local', collapsedGroups: [], groupsKeptWhileEmpty: [], overflowMenuOpen: false, ...initial };
  const set = (update) => { const next = typeof update === 'function' ? update(state) : update; if (next !== state) state = { ...state, ...next }; };
  const get = () => state;
  state = { ...state, ...Model.sectionsStoreActions(set, get) };
  return { get };
}
function itemByItem(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label}: section count`);
  expected.forEach((section, index) => assert.deepEqual(actual[index], section, `${label}: section ${index} (${section.id})`));
}

// ---------------------------------------------------------------- fixtures
const legacyConfig = () => ({
  threadIds: ['s1', 's2', 's3', 's4', 's5'], archivedThreadIds: ['old'],
  customGroups: [{ id: 'g1', name: 'Auth' }, { id: 'g2', name: 'Docs', codexSectionId: 'sec-docs' }, { id: 'g3', name: 'Infra' }],
  sessionMetadata: { s1: { customGroupId: 'g1' }, s2: { customGroupId: 'g3', pinned: true }, s3: { customGroupId: 'g1', unread: true },
    s4: { customGroupId: 'deleted' }, old: { customGroupId: 'g2' }, s5: {} },
  projectOrder: ['/work/web', 'ccg::g3', 'owner/repo', 'ccg::g1'],
  sidebarPreferences: { groupBy: 'custom', sortBy: 'alpha', ascending: true, showEmptyGroups: true, showMetadata: true,
    collapsedGroups: ['pinned', 'custom:g1', 'sessions', 'project:/work/web'] },
});
function deps(config, calls = []) {
  let uuid = 0;
  return { calls, knownSessionIds: () => new Set([...config.threadIds, ...config.archivedThreadIds]),
    mirror: (task) => calls.push(task), codexSections, randomUUID: () => `uuid-${++uuid}`, getConfig: () => config };
}

// ---------------------------------------------------------------- the functions called are the originals
test('the model functions the store calls are the original 2.42304.0 shared-52 declarations; Qb / $b read what the host maps', async () => {
  const code = await format(await read(path.join(reference, 'shared-52-DGviI8xb.js')), { parser: 'babel' });
  const ast = parsers.babel.parse(code, {});
  const generated = await read(path.join(app, 'electron/generated/sidebar-sections-model.mjs'));
  for (const name of ['kp', 'Bp', 'Em', 'zp', 'Lp', 'Ip', 'Rp', 'Sp', 'Tp', 'xp', 'Dp', 'Ep', 'um', 'pm', '_m', 'gm', 'Tm', 'km', 'Om', 'Fp']) {
    const node = ast.program.body.find((n) => n.type === 'FunctionDeclaration' && n.id?.name === name);
    assert.ok(node, `shared-52 ${name}`);
    assert.ok(generated.includes(code.slice(node.start, node.end)), `electron model carries shared-52 ${name} verbatim`);
  }
  // Exported names the other chunks use: Bp → Op (shared-22 Aa), kp → Sp (Ia), Em → Tf (La), um → ff ($a).
  const shared52 = await read(path.join(reference, 'shared-52-DGviI8xb.js'));
  for (const alias of ['Bp as Op', 'kp as Sp', 'Em as Tf', 'um as ff']) assert.ok(shared52.includes(alias), alias);
  const shared22 = await read(path.join(reference, 'shared-22-HztmyUTM.js'));
  for (const alias of ['Op as Aa', 'Sp as Ia', 'Tf as La', 'ff as $a', 'gt as gi', 'vt as Ni']) assert.ok(shared22.includes(alias), alias);
  // shared-22 Qb / $b / onIdentityResolve as officialQb / officialSeed above read them.
  assert.ok(shared22.includes('Zb="ccg::";function Qb(e){let{collapsedGroups:t}=Q.getState(),n=t=>`${t}.${e}`,r=jc(n(gi),[]);return{ascending:jc(n(Ub),!1)===!0,emptyGroups:jc(n(Ni),!1)===!0,routinesCollapsed:!qo.getState().expandedIds.includes(Ho),sessionsCollapsed:t.includes("recents"),pinnedCollapsed:t.includes("pinned"),isManualCollapsed:e=>t.includes($a(e)),manualOrder:(Array.isArray(r)?r:[]).filter(e=>typeof e=="string"&&e.startsWith(Zb)).map(e=>e.slice(5))}}'));
  assert.ok(shared22.includes('function $b(e,t,n){if(e.prefsSeeded)return e;let r=Yb()[t],i=r?Xb(r,n??Kb(t)):e;if(i.prefsSeeded)return i;let a=t.slice(0,t.indexOf("/"));return{...i,sections:Aa(i.sections,Qb(a)),prefsSeeded:!0}}'));
  assert.ok(shared22.includes('i=La(t,n);!i.prefsSeeded&&Ic()&&(i=$b(i,n,t.customGroupsByScope?.[n]))'));
  assert.ok(shared22.includes('Ub="code-sessions-sort-ascending"'));
  const shared78 = await read(path.join(reference, 'shared-78-D6VXYXaQ.js'));
  for (const key of ['DX="code-projects-order"', 'OX="code-sessions-show-empty-projects"', 'DX as gt', 'OX as vt']) assert.ok(shared78.includes(key), key);
  // The store reads the legacy fields the same way as the independent reading above.
  const config = legacyConfig();
  const qb = Store.legacySectionPrefs(config), expected = officialQb(config);
  for (const key of ['ascending', 'emptyGroups', 'routinesCollapsed', 'sessionsCollapsed', 'pinnedCollapsed', 'manualOrder']) assert.deepEqual(qb[key], expected[key], key);
  for (const id of ['g1', 'g2', 'g3', 'x']) assert.equal(qb.isManualCollapsed(id), expected.isManualCollapsed(id), id);
  assert.deepEqual(Store.legacyCustomGroups(config), officialGroups(config));
});

// ---------------------------------------------------------------- seeding
test('a legacy config (groupBy custom, ccg:: order, custom:<id> folds) seeds the sections item by item as Em + $b(Bp)', () => {
  const config = legacyConfig();
  const sections = Store.sidebarSectionsFor(config);
  itemByItem(sections, officialSeed(Model, config).sections, 'electron model');
  itemByItem(sections, officialSeed(RendererModel, config).sections, 'renderer model');
  // What that is, spelled out: Pinned (folded), Routines (folded, hidden), the groups in the "ccg::" order (unranked
  // last, Bp), Sessions last with the legacy view (custom → none; alpha, ascending, empty groups; folded).
  assert.deepEqual(sections.map((s) => [s.id, s.kind, s.name, s.order, s.collapsed]), [
    ['pinned', 'pinned', '', 0, true], ['routines', 'routines', '', 1, true], ['g3', 'manual', 'Infra', 2, false],
    ['g1', 'manual', 'Auth', 3, true], ['g2', 'manual', 'Docs', 4, false], ['sessions', 'sessions', '', 5, true]]);
  assert.equal(sections[1].shown, false);
  assert.deepEqual(sections.find((s) => s.id === 'g1').members, ['code:s1', 'code:s3']);
  assert.deepEqual(sections.find((s) => s.id === 'g3').members, ['code:s2']);
  assert.deepEqual(sections.find((s) => s.id === 'g2').members, ['code:old'], 'archived members stay filed');
  const sessions = sections.at(-1);
  // show.metadata: the host's Show › Metadata (R3-sections seedLegacyMetadata, as 2.37337.1's Bp seeded it).
  assert.deepEqual([sessions.groupBy, sessions.sortBy, sessions.ascending, sessions.show], ['none', 'alpha', true, { metadata: true, emptyGroups: true }]);
  const off = { ...legacyConfig(), sidebarPreferences: { ...legacyConfig().sidebarPreferences, showMetadata: false } };
  assert.equal(Store.sidebarSectionsFor(off).at(-1).show.metadata, false, 'without the legacy switch Sessions keeps the 2.42304.0 default');
  const plain = Model.reconcileCodeSidebar({ activeGroupScope: 'local', codeSidebarByScope: {}, customGroupsByScope: { local: officialGroups(off) },
    groupByByMode: { code: 'custom' }, sortByByMode: { code: 'alpha' } }, 'local');
  itemByItem(Store.sidebarSectionsFor(off), Model.seedSectionPrefs(plain.sections, officialQb(off)), 'switch off: exactly 2.42304.0 Em + Bp');
  assert.ok(sections.every((s) => s.v === 2));
  // mp: project → environment, state → status, date / unknown-to-mp → date; unset (or a value the host never offered)
  // → no groupBy, which the sections read as the default (shared-16 Qf → vh: project).
  for (const [groupBy, expected] of [['project', 'environment'], ['state', 'status'], ['date', 'date'], ['none', 'none'], [undefined, undefined], ['status', undefined]]) {
    const one = { ...legacyConfig(), sidebarPreferences: { groupBy } };
    assert.equal(Store.sidebarSectionsFor(one).at(-1).groupBy, expected, String(groupBy));
    itemByItem(Store.sidebarSectionsFor(one), officialSeed(Model, one).sections, String(groupBy));
  }
});

test('seeding is idempotent, survives a save / load, and never changes the legacy fields', () => {
  const config = legacyConfig();
  const legacy = copy({ customGroups: config.customGroups, sessionMetadata: config.sessionMetadata, projectOrder: config.projectOrder, sidebarPreferences: config.sidebarPreferences });
  assert.equal(Store.syncSidebarSections(config, { seed: true }), true);
  assert.equal(config.sidebarSectionsSeeded, true);
  assert.equal(Store.sidebarSectionsSeeded(config), true);
  const seeded = copy(config.sidebarSections);
  itemByItem(seeded, officialSeed(Model, config).sections, 'stored at the switch');
  assert.equal(Store.syncSidebarSections(config), false, 'second sync');
  assert.equal(Store.syncSidebarSections(config, { seed: true }), false, 'second seed');
  const reloaded = JSON.parse(JSON.stringify(config));
  assert.equal(Store.syncSidebarSections(reloaded), false, 'after config.json round trip');
  assert.equal(Store.syncSidebarSections(reloaded, { seed: true }), false, 'seed after config.json round trip');
  assert.deepEqual(reloaded.sidebarSections, seeded);
  assert.deepEqual({ customGroups: config.customGroups, sessionMetadata: config.sessionMetadata, projectOrder: config.projectOrder, sidebarPreferences: config.sidebarPreferences }, legacy);
  // Seeded once ($b `if (e.prefsSeeded) return e`): later legacy preference changes do not re-seed the sections.
  config.sidebarPreferences = { ...config.sidebarPreferences, ascending: false, collapsedGroups: [] };
  config.projectOrder = ['ccg::g2', 'ccg::g1', 'ccg::g3'];
  assert.equal(Store.syncSidebarSections(config), false);
  assert.equal(Store.syncSidebarSections(config, { seed: true }), false);
  assert.deepEqual(config.sidebarSections, seeded);
  // The groups and members still follow (kp): a rename, a new member, a new group (Codex import) before Sessions.
  config.customGroups = [...config.customGroups.map((g) => g.id === 'g1' ? { ...g, name: 'Auth v2' } : g), { id: 'g4', name: 'From Codex', codexSectionId: 'sec-4' }];
  config.sessionMetadata.s5 = { customGroupId: 'g1' };
  assert.equal(Store.syncSidebarSections(config), true);
  const next = config.sidebarSections;
  assert.deepEqual(next.map((s) => s.id), ['pinned', 'routines', 'g3', 'g1', 'g2', 'g4', 'sessions']);
  assert.equal(next.find((s) => s.id === 'g1').name, 'Auth v2');
  assert.deepEqual(next.find((s) => s.id === 'g1').members, ['code:s1', 'code:s3', 'code:s5']);
  const state = { activeGroupScope: 'local', customGroupsByScope: { local: officialGroups(config) }, codeSidebarByScope: { local: { sections: seeded, prefsSeeded: true } } };
  itemByItem(next, Model.reconcileCodeSidebar(state, 'local').sections, 'Em over the seeded record');
});

test('randomized legacy configs: the store equals the original Em + $b(Bp), item by item, and is idempotent', () => {
  let seed = 0x5eed;
  const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const pick = (list) => list[Math.floor(random() * list.length)];
  for (let run = 0; run < 300; run++) {
    const groupIds = Array.from({ length: Math.floor(random() * 6) }, (_, i) => `g${i}`);
    const customGroups = groupIds.map((id) => ({ id, name: pick(['A', 'B', 'Docs', '', 'Docs']) })).filter(() => random() > 0.1);
    if (random() < 0.1) customGroups.push(pick([null, 3, { id: 7, name: 'x' }, { id: 'n' }]));
    const sessionMetadata = {};
    for (let i = 0; i < 8; i++) if (random() < 0.8) sessionMetadata[`s${i}`] = random() < 0.2 ? pick([null, 'x', {}]) : { customGroupId: pick([...groupIds, 'gone', null]), pinned: random() < 0.2 };
    const projectOrder = [...groupIds, 'gone'].filter(() => random() < 0.6).sort(() => random() - 0.5).map((id) => pick([`ccg::${id}`, `ccg::${id}`, `/w/${id}`]));
    const collapsedGroups = [...groupIds.map((id) => pick([`custom:${id}`, `custom-${id}`, `project:${id}`])), 'pinned', 'sessions', 'recents', 'older'].filter(() => random() < 0.3);
    const config = { customGroups: random() < 0.05 ? 'broken' : customGroups, sessionMetadata, projectOrder: random() < 0.05 ? {} : projectOrder,
      sidebarPreferences: { groupBy: pick([...LEGACY_GROUP_BYS, undefined, 'coder', 7]), sortBy: pick(['alpha', 'created', 'recency', 'name', undefined]),
        ascending: pick([true, false, 'yes', undefined]), showEmptyGroups: pick([true, false, undefined]), collapsedGroups } };
    const expected = officialSeed(Model, config).sections;
    itemByItem(Store.sidebarSectionsFor(config), expected, `run ${run}`);
    const untouched = JSON.stringify(config);
    assert.equal(Store.syncSidebarSections(config), false, `run ${run}: nothing stored before the switch`);
    assert.equal(JSON.stringify(config), untouched);
    Store.syncSidebarSections(config, { seed: true });
    assert.equal(Store.syncSidebarSections(config), false, `run ${run} idempotent`);
    assert.equal(Store.syncSidebarSections(config, { seed: true }), false, `run ${run} seeded once`);
    itemByItem(config.sidebarSections, expected, `run ${run} stored`);
  }
});

// R2 review: the classic list stays on screen until the sections layout renders (R3) and keeps writing the legacy
// preferences. Seeding at startup froze the sections at the first launch; officially $b seeds as the app starts with the
// sections layout, i.e. from the preferences as they are at the switch.
test('before the sections layout seeds the record, classic-list changes flow into the sections; the switch seeds them once', () => {
  const config = legacyConfig();
  const d = deps(config);
  const atFirstLaunch = officialSeed(Model, config).sections;
  // main.cjs at startup, then after each sidebar-state operation (project-order is answered by main.cjs itself).
  const startup = JSON.stringify(config);
  assert.equal(Store.syncSidebarSections(config), false);
  assert.equal(JSON.stringify(config), startup, 'startup stores nothing');
  const step = (label) => {
    assert.equal(Store.syncSidebarSections(config), false, `${label}: still nothing to store`);
    assert.equal('sidebarSections' in config || 'sidebarSectionsSeeded' in config, false, `${label}: not seeded`);
    itemByItem(Store.sidebarSectionsFor(config), officialSeed(Model, config).sections, `${label}: the official seeding over the legacy fields now`);
  };
  config.projectOrder = ['ccg::g2', '/work/web', 'ccg::g1', 'ccg::g3'];
  step('project-order');
  config.sidebarPreferences = { ...config.sidebarPreferences, collapsedGroups: ['custom:g2', 'recents'], ascending: false, showEmptyGroups: false, groupBy: 'state', sortBy: 'created' };
  step('settings sidebarPreferences');
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'Ship', sessionId: 's5' }, d);
  step('classic create-group');
  Store.applySidebarSectionOperation(config, { operation: 'rename-group', id: 'g3', name: 'Ops' }, d);
  step('rename-group');
  Store.applySidebarSectionOperation(config, { operation: 'section-assign', keys: ['code:s4'], sectionId: 'g3' }, d);
  step('section-assign');
  Store.applySidebarSectionOperation(config, { operation: 'delete-group', id: 'g1' }, d);
  step('delete-group');
  const now = Store.sidebarSectionsFor(config);
  assert.deepEqual(now.map((s) => [s.id, s.collapsed]), [['pinned', false], ['routines', true], ['g2', true], ['g3', false], ['cg-uuid-1', false], ['sessions', true]]);
  assert.deepEqual([now.at(-1).groupBy, now.at(-1).sortBy, now.at(-1).ascending, now.at(-1).show.emptyGroups], ['none', 'created', false, false],
    'groupBy "custom" (set by the classic create) maps to none; sortBy, ascending, empty groups as now');
  assert.notDeepEqual(now.map((s) => [s.id, s.collapsed]), atFirstLaunch.map((s) => [s.id, s.collapsed]), 'the first launch would have frozen another list');
  // The switch, either way: sections-seed (ex()) or the layout's first section operation.
  const viaOperation = copy(config);
  Store.applySidebarSectionOperation(viaOperation, { operation: 'section-view', id: 'sessions', view: { sortBy: 'alpha' } }, deps(viaOperation));
  assert.equal(viaOperation.sidebarSectionsSeeded, true);
  itemByItem(viaOperation.sidebarSections, Model.setSectionView(officialSeed(Model, config).sections, 'sessions', { sortBy: 'alpha' }), 'seeded by the first section-view');
  const expected = officialSeed(Model, config).sections;
  assert.equal(Store.applySidebarSectionOperation(config, Store.sidebarSectionRequest('seed'), d), true);
  assert.equal(config.sidebarSectionsSeeded, true);
  itemByItem(config.sidebarSections, expected, 'seeded by sections-seed');
  // Seeded once: later legacy writes no longer move the sections ($b `if (e.prefsSeeded) return e`) ...
  const seeded = copy(config.sidebarSections);
  config.projectOrder = ['ccg::g3', 'ccg::g2'];
  config.sidebarPreferences = { ...config.sidebarPreferences, collapsedGroups: [], ascending: true, groupBy: 'date' };
  assert.equal(Store.syncSidebarSections(config), false);
  assert.equal(Store.applySidebarSectionOperation(config, { operation: 'sections-seed' }, d), true);
  assert.deepEqual(config.sidebarSections, seeded);
  // ... while the groups and members still follow (kp).
  Store.applySidebarSectionOperation(config, { operation: 'rename-group', id: 'g2', name: 'Docs 2' }, d);
  assert.equal(config.sidebarSections.find((s) => s.id === 'g2').name, 'Docs 2');
});

test('damaged data is tolerated: an unreadable sidebarSections is migrated again, a readable one is normalized (Sp)', () => {
  for (const sidebarSections of ['garbage', 7, null, {}, { sections: [] }]) {
    const config = { ...legacyConfig(), sidebarSections, sidebarSectionsSeeded: true };
    itemByItem(Store.sidebarSectionsFor(config), officialSeed(Model, config).sections, `sidebarSections ${JSON.stringify(sidebarSections)}`);
    assert.equal(Store.syncSidebarSections(config), true);
    assert.ok(Array.isArray(config.sidebarSections));
  }
  // Unknown kinds, duplicates, a member in two sections, Sessions not last, a stale v1 metadata flag, an unknown group.
  const config = { ...legacyConfig(), sidebarSectionsSeeded: true, sidebarSections: [
    { id: 'sessions', kind: 'sessions', order: 0, groupBy: 'status', show: { metadata: true } },
    { id: 'g1', kind: 'manual', name: 'Old name', order: 1, members: ['code:s1', 'code:s1', 'code:s3'], collapsed: 'yes' },
    { id: 'g1', kind: 'manual', order: 2 }, { id: 'zz', kind: 'manual', order: 3, members: ['code:s1'] },
    { id: 'x', kind: 'folder', order: 4 }, null, 'pinned', { kind: 'pinned' }, { id: 'pinned', kind: 'pinned', order: 9, collapsed: true, v: 2 },
  ] };
  const sections = Store.sidebarSectionsFor(config);
  const state = { activeGroupScope: 'local', customGroupsByScope: { local: officialGroups(config) },
    codeSidebarByScope: Model.normalizeCodeSidebarByScope({ local: { sections: config.sidebarSections, prefsSeeded: true } }) };
  itemByItem(sections, Model.reconcileCodeSidebar(state, 'local').sections, 'persist merge (Cp → Sp) then Em');
  // Stored order kept (Sp sorts by order, Tp keeps Sessions last; kp adds Routines after Pinned, drops zz, files the
  // groups without a section before Sessions); already seeded, so no Bp re-sort by the "ccg::" order.
  assert.deepEqual(sections.map((s) => s.id), ['g1', 'pinned', 'routines', 'g2', 'g3', 'sessions']);
  assert.equal(sections.find((s) => s.id === 'g1').name, 'Auth');
  assert.equal(sections.find((s) => s.id === 'g1').collapsed, false, 'a non-boolean collapsed reads as the default');
  assert.equal(sections.at(-1).show.metadata, false, 'metadata only from v ≥ 2 records (ip)');
  assert.equal(sections.at(-1).groupBy, 'status');
  // A readable record that was never seeded (no sidebarSectionsSeeded): $b seeds it (Bp over Qb), kp keeps its order.
  const unseeded = { ...legacyConfig(), sidebarSections: [{ id: 'g2', kind: 'manual', order: 0 }, { id: 'sessions', kind: 'sessions', v: 2, order: 1 }] };
  const record = { activeGroupScope: 'local', customGroupsByScope: { local: officialGroups(unseeded) }, groupByByMode: { code: 'custom' }, sortByByMode: { code: 'alpha' },
    codeSidebarByScope: Model.normalizeCodeSidebarByScope({ local: { sections: unseeded.sidebarSections } }) };
  const i = Model.reconcileCodeSidebar(record, 'local');
  assert.equal(i.prefsSeeded, undefined);
  itemByItem(Store.sidebarSectionsFor(unseeded), Model.patchSectionView(Model.seedSectionPrefs(i.sections, officialQb(unseeded)), 'sessions', { show: { metadata: true } }), 'unseeded record');
  assert.equal(Store.sidebarSectionsFor(unseeded).find((s) => s.id === 'pinned').collapsed, true, 'legacy fold seeded');
  assert.equal(Store.sidebarSectionsFor({ ...unseeded, sidebarSectionsSeeded: true }).find((s) => s.id === 'pinned').collapsed, false, 'seeded: not again');
  // Not seeded yet: the sync keeps the record in step (kp, without Bp, the flag left unset) and the legacy preferences
  // still flow in; the seed then stores Bp over the preferences of that moment.
  const kept = copy(unseeded);
  assert.equal(Store.syncSidebarSections(kept), true);
  assert.equal('sidebarSectionsSeeded' in kept, false);
  itemByItem(kept.sidebarSections, i.sections, 'kp only');
  kept.sidebarPreferences = { ...kept.sidebarPreferences, collapsedGroups: ['custom:g2'] };
  assert.equal(Store.syncSidebarSections(kept), false);
  const live = Store.sidebarSectionsFor(kept);
  assert.deepEqual([live.find((s) => s.id === 'pinned').collapsed, live.find((s) => s.id === 'g2').collapsed], [false, true]);
  assert.equal(Store.syncSidebarSections(kept, { seed: true }), true);
  itemByItem(kept.sidebarSections, live, 'seeded at the switch');
  assert.equal(kept.sidebarSectionsSeeded, true);
  // Broken legacy fields: no throw, no manual sections from records without a string id / name.
  for (const broken of [{}, { customGroups: 'x', sessionMetadata: null, projectOrder: 'x', sidebarPreferences: null },
    { customGroups: [null, { id: 1 }, { id: 'ok', name: 'Ok' }], sessionMetadata: { a: null, b: 4, c: { customGroupId: 3 } }, sidebarPreferences: { collapsedGroups: 'pinned' } }]) {
    const list = Store.sidebarSectionsFor(broken);
    itemByItem(list, officialSeed(Model, broken).sections, JSON.stringify(broken));
    assert.equal(list.at(-1).kind, 'sessions');
    const copyOf = copy(broken);
    Store.syncSidebarSections(copyOf);
    assert.equal(Store.syncSidebarSections(copyOf), false);
  }
});

// ---------------------------------------------------------------- operations
test('create-group in the sections layout copies the Sessions view (Rp) and keeps groupBy, as the original addCustomGroup', () => {
  const config = legacyConfig();
  config.sidebarPreferences.groupBy = 'project';
  Store.syncSidebarSections(config);
  const d = deps(config);
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'sessions', view: { groupBy: 'status', sortBy: 'created', ascending: true, show: { metadata: true } } }, d);
  const before = copy(config.sidebarSections);
  const official = officialStore({ customGroupsByScope: { local: officialGroups(config) }, codeSidebarByScope: { local: { sections: before, prefsSeeded: true } } });
  const officialGroup = official.get().addSection('Release');
  assert.equal(Store.applySidebarSectionOperation(config, { operation: 'create-group', name: '  Release ', sections: true }, d), true);
  assert.equal(config.sidebarPreferences.groupBy, 'project', 'the legacy groupBy is not switched to "custom"');
  assert.deepEqual(config.customGroups.at(-1), { id: 'cg-uuid-1', name: 'Release' });
  const created = config.sidebarSections.find((s) => s.id === 'cg-uuid-1');
  assert.deepEqual({ ...created, id: officialGroup.id }, official.get().codeSidebarByScope.local.sections.find((s) => s.id === officialGroup.id));
  assert.deepEqual([created.groupBy, created.sortBy, created.ascending, created.show], ['status', 'created', true, { metadata: true, emptyGroups: false }]);
  assert.deepEqual(config.sidebarSections.map((s) => s.id), ['pinned', 'routines', 'g3', 'g1', 'g2', 'cg-uuid-1', 'sessions']);
  // An environment grouping is not copied (Rp: `r === "environment" ? {}`).
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'sessions', view: { groupBy: 'environment' } }, d);
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'Env', sections: true, sessionIds: ['s5', 'nope'] }, d);
  const env = config.sidebarSections.find((s) => s.name === 'Env');
  assert.equal(env.groupBy, undefined);
  assert.deepEqual(env.members, ['code:s5'], 'only known sessions are filed');
  assert.equal(config.sessionMetadata.s5.customGroupId, env.id);
  // A same-named group is reused and opened (addCustomGroup `_m` → expandGroup(um(id))), not duplicated.
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'g1', view: { collapsed: true } }, d);
  config.sidebarPreferences = { ...config.sidebarPreferences, collapsedGroups: ['custom:g1', 'custom-g1', 'pinned'] };
  const count = config.customGroups.length;
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'Auth', sections: true, sessionId: 's4' }, d);
  assert.equal(config.customGroups.length, count);
  assert.equal(config.sessionMetadata.s4.customGroupId, 'g1');
  assert.equal(config.sidebarSections.find((s) => s.id === 'g1').collapsed, false);
  assert.deepEqual(config.sidebarPreferences.collapsedGroups, ['pinned']);
});

test('create-group from the classic list keeps its groupBy "custom" switch; rename and delete keep the section in step', () => {
  // Before the sections layout seeds the record: a legacy group like the others. Nothing is stored; at the switch kp
  // gives it the default view (cp) and Bp its fold and position, as for an official user's legacy groups.
  const early = legacyConfig();
  early.sidebarPreferences.groupBy = 'date';
  Store.syncSidebarSections(early);
  Store.applySidebarSectionOperation(early, { operation: 'create-group', name: 'Auth', sessionId: 's5' }, deps(early));
  assert.equal(early.sidebarPreferences.groupBy, 'custom');
  assert.equal(early.customGroups.filter((g) => g.name === 'Auth').length, 2, 'the classic list still creates a new group');
  assert.equal('sidebarSections' in early || 'sidebarSectionsSeeded' in early, false, 'nothing stored before the switch');
  const derived = Store.sidebarSectionsFor(early);
  itemByItem(derived, officialSeed(Model, early).sections, 'derived: the official seeding over the legacy fields now');
  const legacyGroup = derived.find((s) => s.id === 'cg-uuid-1');
  assert.deepEqual([legacyGroup.kind, legacyGroup.groupBy, legacyGroup.sortBy, legacyGroup.members], ['manual', undefined, 'recency', ['code:s5']]);
  // After the switch (a seeded record): the original addCustomGroup, kp then Rp (the Sessions view is copied).
  const config = legacyConfig();
  config.sidebarPreferences.groupBy = 'date';
  Store.syncSidebarSections(config, { seed: true });
  const d = deps(config);
  const added = officialStore({ customGroupsByScope: { local: officialGroups(config) }, codeSidebarByScope: { local: { sections: copy(config.sidebarSections), prefsSeeded: true } } });
  const officialGroup = added.get().addCustomGroup('Release');
  Store.applySidebarSectionOperation(config, { operation: 'create-group', name: 'Release', sessionId: 's5' }, d);
  assert.equal(config.sidebarPreferences.groupBy, 'custom');
  const created = config.sidebarSections.find((s) => s.id === 'cg-uuid-1');
  assert.deepEqual({ ...created, id: officialGroup.id, members: [] }, added.get().codeSidebarByScope.local.sections.find((s) => s.id === officialGroup.id));
  assert.deepEqual([created.kind, created.groupBy, created.members], ['manual', 'date', ['code:s5']]);
  // rename-group: kp renames the section.
  Store.applySidebarSectionOperation(config, { operation: 'rename-group', id: 'g3', name: ' Platform ' }, d);
  assert.equal(config.sidebarSections.find((s) => s.id === 'g3').name, 'Platform');
  assert.equal(config.customGroups.find((g) => g.id === 'g3').name, 'Platform');
  // delete-group: the section, its members' assignment, its "ccg::" key and both fold-key forms go.
  config.sidebarPreferences.collapsedGroups = ['custom:g1', 'custom-g1', 'pinned', 'custom:g3'];
  const official = officialStore({ customGroupsByScope: { local: officialGroups(config) }, codeSidebarByScope: { local: { sections: copy(config.sidebarSections), prefsSeeded: true } },
    collapsedGroups: ['custom-g1', 'pinned', 'custom-g3'] });
  official.get().deleteSection('g1');
  Store.applySidebarSectionOperation(config, { operation: 'delete-group', id: 'g1' }, d);
  assert.equal(config.sidebarSections.some((s) => s.id === 'g1'), false);
  itemByItem(config.sidebarSections, official.get().codeSidebarByScope.local.sections, 'deleteCustomGroup');
  assert.deepEqual(Store.officialCollapsedGroups(config.sidebarPreferences), official.get().collapsedGroups);
  assert.deepEqual(config.sidebarPreferences.collapsedGroups, ['pinned', 'custom:g3']);
  assert.deepEqual(config.projectOrder, ['/work/web', 'ccg::g3', 'owner/repo']);
  assert.equal(config.sessionMetadata.s1.customGroupId, null);
  assert.equal(config.sessionMetadata.s3.customGroupId, null);
  assert.equal(config.sessionMetadata.s3.unread, true, 'the rest of the metadata stays');
});

test('section-move (zp) and section-view (Lp) persist through config.json; Sessions cannot move', () => {
  const config = legacyConfig();
  Store.syncSidebarSections(config);
  const d = deps(config);
  const ids = () => config.sidebarSections.map((s) => s.id);
  Store.applySidebarSectionOperation(config, { operation: 'section-move', id: 'g2', index: 0 }, d);
  assert.deepEqual(ids(), ['g2', 'pinned', 'routines', 'g3', 'g1', 'sessions']);
  Store.applySidebarSectionOperation(config, { operation: 'section-move', id: 'g2', index: 99 }, d);
  assert.deepEqual(ids(), ['pinned', 'routines', 'g3', 'g1', 'g2', 'sessions'], 'clamped to length - 2');
  const before = copy(config.sidebarSections);
  Store.applySidebarSectionOperation(config, { operation: 'section-move', id: 'sessions', index: 0 }, d);
  assert.deepEqual(config.sidebarSections, before, 'zp leaves Sessions where it is');
  Store.applySidebarSectionOperation(config, { operation: 'section-move', id: 'g1', index: 2.4 }, d);
  itemByItem(config.sidebarSections, Model.moveSection(before, 'g1', 2.4), 'zp');
  assert.deepEqual(config.sidebarSections.map((s) => s.order), [0, 1, 2, 3, 4, 5]);
  // Lp: switching between alpha and another sort resets ascending; groupBy null clears (eO Reset).
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'g3', view: { sortBy: 'alpha', ascending: true, groupBy: 'date' } }, d);
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'g3', view: { sortBy: 'created' } }, d);
  const g3 = config.sidebarSections.find((s) => s.id === 'g3');
  assert.deepEqual([g3.sortBy, g3.ascending, g3.groupBy], ['created', false, 'date']);
  const viewed = copy(config.sidebarSections);
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'g3', view: { groupBy: null, sortBy: 'recency', ascending: false, show: { metadata: true } } }, d);
  itemByItem(config.sidebarSections, Model.setSectionView(viewed, 'g3', { groupBy: null, sortBy: 'recency', ascending: false, show: { metadata: true } }), 'Lp');
  assert.equal('groupBy' in config.sidebarSections.find((s) => s.id === 'g3'), false);
  const reloaded = JSON.parse(JSON.stringify(config));
  assert.equal(Store.syncSidebarSections(reloaded), false);
  assert.deepEqual(Store.sidebarSectionsFor(reloaded), config.sidebarSections);
  // section-assign: only a manual section takes sessions; null files them back into Sessions.
  Store.applySidebarSectionOperation(config, { operation: 'section-assign', keys: ['code:s5', 'code:s1', 'code:s5'], sectionId: 'g2' }, d);
  assert.deepEqual(config.sidebarSections.find((s) => s.id === 'g2').members, ['code:s1', 'code:old', 'code:s5']);
  Store.applySidebarSectionOperation(config, { operation: 'section-assign', keys: ['code:s1'], sectionId: null }, d);
  assert.equal(config.sessionMetadata.s1.customGroupId, null);
  assert.equal(config.sidebarSections.find((s) => s.id === 'g2').members.includes('code:s1'), false);
});

test('invalid payloads are rejected and leave config.json untouched; other operations are left to main.cjs', () => {
  const config = legacyConfig();
  Store.syncSidebarSections(config);
  const d = deps(config);
  const bad = [
    [{ operation: 'section-move', id: 'nope', index: 0 }, /Unknown section/], [{ operation: 'section-move', id: 5, index: 0 }, /Unknown section/],
    [{ operation: 'section-move', id: 'g1' }, /position/], [{ operation: 'section-move', id: 'g1', index: NaN }, /position/],
    [{ operation: 'section-move', id: 'g1', index: Infinity }, /position/], [{ operation: 'section-move', id: 'g1', index: '1' }, /position/],
    [{ operation: 'section-view', id: 'nope', view: { collapsed: true } }, /Unknown section/],
    [{ operation: 'section-view', id: 'g1' }, /Invalid section view/], [{ operation: 'section-view', id: 'g1', view: {} }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { groupBy: 'custom' } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { groupBy: 'project' } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { sortBy: 'name' } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { ascending: 'yes' } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { members: ['code:s5'] } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { show: { pr: true } } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: { show: { metadata: 1 } } }, /Invalid section view/],
    [{ operation: 'section-view', id: 'g1', view: [] }, /Invalid section view/],
    [{ operation: 'section-assign', keys: 'code:s1', sectionId: 'g1' }, /Unknown session/], [{ operation: 'section-assign', keys: [], sectionId: 'g1' }, /Unknown session/],
    [{ operation: 'section-assign', keys: ['code:ghost'], sectionId: 'g1' }, /Unknown session/], [{ operation: 'section-assign', keys: ['s1'], sectionId: 'g1' }, /Unknown session/],
    [{ operation: 'section-assign', keys: ['code:s1'], sectionId: 'sessions' }, /section/], [{ operation: 'section-assign', keys: ['code:s1'], sectionId: 'pinned' }, /section/],
    [{ operation: 'section-assign', keys: ['code:s1'], sectionId: 'gone' }, /Unknown section/], [{ operation: 'section-assign', keys: ['code:s1'] }, /Unknown section/],
    [{ operation: 'create-group', name: '   ' }, /Enter a group name/], [{ operation: 'create-group', name: 4 }, /Enter a group name/],
    [{ operation: 'rename-group', id: 'g1', name: '' }, /Enter a group name/],
  ];
  for (const [payload, error] of bad) {
    const before = copy(config);
    assert.throws(() => Store.applySidebarSectionOperation(config, payload, d), error, JSON.stringify(payload));
    assert.deepEqual(config, before, `${JSON.stringify(payload)} changed nothing`);
  }
  assert.equal(d.calls.length, 0, 'nothing mirrored');
  for (const operation of ['metadata', 'pinned-order', 'project-order', 'nope', undefined]) assert.equal(Store.applySidebarSectionOperation(config, { operation }, d), false);
  assert.throws(() => Store.sidebarSectionRequest('collapse', {}), /Unsupported sidebar operation/);
});

test('Codex threadSection mirrors the groups and members only, with the same calls as before; section order and view stay local', async () => {
  const config = legacyConfig();
  Store.syncSidebarSections(config);
  const tasks = [];
  const d = deps(config, tasks);
  const calls = [];
  const owner = { request: async (method, params) => { calls.push([method, params]); return method === 'threadSection/create' ? { section: { id: `sec-${params.name}` } } : {}; } };
  const run = async () => { while (tasks.length) await tasks.shift()(owner); };
  Store.applySidebarSectionOperation(config, { operation: 'section-move', id: 'g1', index: 2 }, d);
  Store.applySidebarSectionOperation(config, { operation: 'section-view', id: 'g1', view: { collapsed: false, sortBy: 'alpha' } }, d);
  assert.equal(tasks.length, 0, 'no mirror for the section order or view');
  let mirrored = 0;
  for (const payload of [{ operation: 'create-group', name: 'Ship', sections: true, sessionIds: ['s5'] }, { operation: 'create-group', name: 'Empty' },
    { operation: 'rename-group', id: 'g2', name: 'Docs 2' }, { operation: 'delete-group', id: 'g2' },
    { operation: 'section-assign', keys: ['code:s1', 'code:s3'], sectionId: 'cg-uuid-1' }]) {
    Store.applySidebarSectionOperation(config, payload, d);
    mirrored += tasks.length;
    assert.equal(tasks.length, 1, `one mirror task for ${payload.operation}, as main.cjs ran before`);
    await run();
  }
  assert.equal(mirrored, 5);
  assert.deepEqual(calls, [
    ['threadSection/create', { name: 'Ship' }], ['thread/section/move', { threadId: 's5', sectionId: 'sec-Ship' }],
    ['threadSection/create', { name: 'Empty' }],
    ['threadSection/update', { sectionId: 'sec-docs', name: 'Docs 2' }], ['threadSection/delete', { sectionId: 'sec-docs' }],
    ['thread/section/move', { threadId: 's1', sectionId: 'sec-Ship' }], ['thread/section/move', { threadId: 's3', sectionId: 'sec-Ship' }],
  ]);
  assert.equal(config.customGroups.find((g) => g.id === 'cg-uuid-1').codexSectionId, 'sec-Ship');
  // The legacy mirror helper reads the groups and members only: the sections are not consulted.
  const without = { ...copy(config), sidebarSections: 'ignored' };
  const placed = [];
  await codexSections.placeSession({ request: async (m, p) => placed.push([m, p]) }, without, 's1');
  assert.deepEqual(placed, [['thread/section/move', { threadId: 's1', sectionId: 'sec-Ship' }]]);
});

test('the renderer requests and the store slice: official store actions on the hydrated slice match the IPC results', () => {
  assert.deepEqual(Store.sidebarSectionRequest('add', { name: 'X', sessionIds: ['a'] }), { operation: 'create-group', name: 'X', sections: true, sessionIds: ['a'] });
  assert.deepEqual(Store.sidebarSectionRequest('rename', { id: 'g', name: 'Y' }), { operation: 'rename-group', id: 'g', name: 'Y' });
  assert.deepEqual(Store.sidebarSectionRequest('delete', { id: 'g' }), { operation: 'delete-group', id: 'g' });
  assert.deepEqual(Store.sidebarSectionRequest('move', { id: 'g', index: 1 }), { operation: 'section-move', id: 'g', index: 1 });
  assert.deepEqual(Store.sidebarSectionRequest('view', { id: 'g', view: { collapsed: true } }), { operation: 'section-view', id: 'g', view: { collapsed: true } });
  assert.deepEqual(Store.sidebarSectionRequest('assign', { keys: ['code:a'] }), { operation: 'section-assign', keys: ['code:a'], sectionId: null });
  assert.deepEqual(Store.sidebarSectionRequest('seed'), { operation: 'sections-seed' });
  const config = legacyConfig();
  Store.syncSidebarSections(config, { seed: true });
  const snapshot = () => copy({ sessionMetadata: config.sessionMetadata, customGroups: config.customGroups, sidebarPreferences: config.sidebarPreferences,
    projectOrder: config.projectOrder, sidebarSections: Store.sidebarSectionsFor(config) });
  const slice = Store.sidebarSectionsStoreSlice(snapshot());
  assert.deepEqual(Model.selectCodeSidebar(slice).sections, config.sidebarSections);
  assert.deepEqual(Model.selectCustomGroups(slice), officialGroups(config));
  assert.deepEqual(slice.collapsedGroups, ['pinned', 'custom-g1', 'sessions', 'project:/work/web']);
  // The same change through the original store action and through sidebar-state lands on the same sections.
  for (const [action, payload, run] of [
    ['move', { id: 'g2', index: 0 }, (s) => s.moveSection('g2', 0)],
    ['view', { id: 'sessions', view: { sortBy: 'created', show: { emptyGroups: false } } }, (s) => s.setSectionView('sessions', { sortBy: 'created', show: { emptyGroups: false } })],
    ['assign', { keys: ['code:s5'], sectionId: 'g3' }, (s) => s.assignToSection(['code:s5'], 'g3')],
    ['rename', { id: 'g3', name: 'Ops' }, (s) => s.renameSection('g3', 'Ops')],
    ['delete', { id: 'g1' }, (s) => s.deleteSection('g1')],
  ]) {
    const official = officialStore(Store.sidebarSectionsStoreSlice(snapshot()));
    run(official.get());
    Store.applySidebarSectionOperation(config, Store.sidebarSectionRequest(action, payload), deps(config));
    // Host difference: no manual member order inside a group (official order[groupId], appended to by assignToCustomGroup),
    // so a section's members follow the assignment order; the set of members is the same.
    const members = (list) => list.map((section) => section.members ? { ...section, members: [...section.members].sort() } : section);
    itemByItem(members(Store.sidebarSectionsStoreSlice(snapshot()).codeSidebarByScope.local.sections), members(official.get().codeSidebarByScope.local.sections), action);
  }
  // metadata: the renderer's view of the members (Codex sections included) replaces the snapshot's.
  const shown = { ...config.sessionMetadata, s4: { customGroupId: 'g2' } };
  assert.deepEqual(Store.sidebarSectionsStoreSlice(snapshot(), { metadata: shown }).codeSidebarByScope.local.sections.find((s) => s.id === 'g2').members, ['code:s4', 'code:old']);
});

// ---------------------------------------------------------------- wiring (D18: the smallest hooks in the hot files)
test('main.cjs keeps the record in step at startup (no seeding) and delegates; main.jsx keeps the sections and sends section actions', async () => {
  const main = await read(path.join(app, 'electron/main.cjs'));
  assert.match(main, /sidebarSectionsStore = await import\("\.\/sidebar-sections-store\.mjs"\);\n\s+try \{ sidebarSectionsStore\.syncSidebarSections\(config\); \}/);
  assert.match(main, /sidebarSections: sidebarSectionsStore \? sidebarSectionsStore\.sidebarSectionsFor\(config\) :/);
  assert.match(main, /\} else if \(!sidebarSectionsStore\.applySidebarSectionOperation\(config, p, \{ knownSessionIds: \(\) => new Set\(\[\.\.\.config\.threadIds, \.\.\.config\.archivedThreadIds\]\),\n\s+mirror: mirrorSections, codexSections,/);
  assert.match(main, /throw new Error\("Unsupported sidebar operation\."\);\n\s+sidebarSectionsStore\.syncSidebarSections\(config\);\n\s+config\.sidebarRevision =/);
  assert.equal((main.match(/mirrorSections\(/g) ?? []).length, 2, 'metadata pin/group mirror and the helper itself stay in main.cjs');
  const jsx = await read(path.join(app, 'src/main.jsx'));
  assert.match(jsx, /import \{ sidebarSectionRequest, sidebarSectionsFor \} from "\.\.\/electron\/sidebar-sections-store\.mjs";/);
  assert.match(jsx, /if \(Array\.isArray\(result\.sidebarSections\)\) setSidebarSections\(result\.sidebarSections\);/);
  // init reads the sections as the sidebar-state snapshot does (derived from the legacy fields until the seed).
  assert.match(jsx, /setSidebarSections\(sidebarSectionsFor\(b\.config\)\);/);
  // The startup call is the default sync: it must not seed (only the sections layout does, R2 review).
  assert.doesNotMatch(main, /syncSidebarSections\(config, \{ seed/);
  assert.match(jsx, /applySidebarState\(await call\("sidebar-state", sidebarSectionRequest\(action, payload\)\)\);/);
  assert.match(jsx, /sidebarSections=\{sidebarSections\}/);
  assert.match(jsx, /onSectionAction=\{sectionAction\}/);
});

// ---------------------------------------------------------------- the renderer store (src/source-sidebar-sections-adapters.jsx)
const documentStub = { createElement: () => ({ relList: { supports: () => false } }),
  documentElement: { dir: 'ltr', getAttribute: () => null, hasAttribute: () => false } };
let server, savedDocument, adapters, rendererModel;
before(async () => {
  savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  if (!globalThis.document) Object.defineProperty(globalThis, 'document', { value: documentStub, configurable: true, writable: true });
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  adapters = await server.ssrLoadModule('/src/source-sidebar-sections-adapters.jsx');
  rendererModel = await server.ssrLoadModule('/src/generated/sidebar-sections/sections-model.mjs');
});
after(async () => {
  await server?.close();
  if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument); else delete globalThis.document;
});

test('hydrateSidebarSectionsStore loads a sidebar-state snapshot into the original frame store', () => {
  const config = legacyConfig();
  Store.syncSidebarSections(config, { seed: true });
  const store = adapters.useSidebarSectionsStore;
  store.getState().setOverflowMenuOpen(true);
  store.getState().keepGroupWhileEmpty('g9');
  adapters.hydrateSidebarSectionsStore({ ...copy(config), sidebarSections: Store.sidebarSectionsFor(config) });
  const state = store.getState();
  assert.equal(state.activeGroupScope, 'local');
  assert.deepEqual(rendererModel.selectCodeSidebar(state).sections, config.sidebarSections);
  assert.deepEqual(rendererModel.selectCustomGroups(state), officialGroups(config));
  assert.deepEqual(state.collapsedGroups, ['pinned', 'custom-g1', 'sessions', 'project:/work/web']);
  assert.equal(state.overflowMenuOpen, true, 'not persisted, not reset');
  assert.deepEqual(state.groupsKeptWhileEmpty, ['g9']);
  assert.equal(typeof state.addSection, 'function', 'the original store actions stay');
  // The original selector path the sections chunks use (shared-16 Gf via group-mode) reads the hydrated Sessions view.
  state.setSectionView('sessions', { groupBy: 'status' });
  assert.equal(rendererModel.selectCodeSidebar(store.getState()).sections.at(-1).groupBy, 'status');
});
