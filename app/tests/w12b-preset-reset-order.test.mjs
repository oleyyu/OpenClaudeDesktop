// w12b-preset-reset-order (W12b; clue: reports/W11/w11-sweep-shell-a.md, preset-menu "Reset order 保留 ccg::"):
// the Sessions folder / preset buckets' "Sort A to Z" (shared-19 x$ onResetOrder) is 3.6556.2 shared-22 OE's `Se`:
//   [se, G] = yd(Ra, yi, W)                        Ra = shared-78 cQ "code-projects-order", yi = shared-46 Uj []
//   K = ii(se)                                      ii = shared-46 Zj (the stored string keys, ccg:: keys included)
//   if (K.length === 0) Se = void 0; else Se = () => { G([]), track(…"reset"…) }
// so it is offered while any key is stored and clears the whole preference. The ccg:: keys only feed the sections'
// seeding (shared-21 _E manualOrder, read by vE while `!prefsSeeded`); the host's sections layout seeds main's record when
// it first renders (useSidebarSectionsHost → sections-seed, shared-21 yE), so a cleared order leaves the manual sections
// where they are. Source text comparison, the model (folderBucketMenu) and the store (sections-seed, then a cleared
// projectOrder). Nothing here opens a window; the official chunks are only read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as Layout from '../src/sidebar-sections-layout.mjs';
import { customOrderKey } from '../src/sidebar-model.js';
import * as Store from '../electron/sidebar-sections-store.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFile(file, 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

test('official text: OE Se clears the whole code-projects-order whenever a key is stored', async () => {
  const shared22 = await read(path.join(reference, 'shared-22-Bwn3sJTG.js'));
  const shared46 = await read(path.join(reference, 'shared-46-BIbZBGFq.js'));
  const shared78 = await read(path.join(reference, 'shared-78-D5Fw2h0a.js'));
  const shared21 = await read(path.join(reference, 'shared-21-R7LldJ05.js'));
  for (const needle of [
    '[se,G]=yd(Ra,yi,W)',
    'K=J1($,23,se)?K1($,23,se,ii(se)):$[24]',
    'if(K.length===0){Se=void 0;break bb2}',
    'Se=J2($,80,G,ve)?K2($,80,G,ve,()=>{G([]),ve({event_key:"claudeai.epitaxy.sidebar.project_order_changed",method:"reset",project_count:0})}):$[82]',
    'onResetOrder:Ce',
    'pr as Ra', 'dr as ii', 'or as yi',
  ]) assert.equal(count(shared22, needle), 1, needle);
  assert.equal(count(shared78, 'cQ="code-projects-order"'), 1);
  assert.equal(count(shared78, 'cQ as pr'), 1);
  assert.equal(count(shared46, 'function Zj(e){if(!Array.isArray(e))return Uj;let t=e.filter(e=>typeof e=="string");return t.length>0?t:Uj}'), 1);
  assert.equal(count(shared46, 'Zj as dr'), 1);
  assert.equal(count(shared46, 'Uj as or'), 1);
  // The ccg:: keys are read only while seeding (shared-21 vE `if(e.prefsSeeded)return e`; _E manualOrder).
  assert.equal(count(shared21, 'gE="ccg::"'), 1);
  assert.equal(count(shared21, 'filter(e=>typeof e=="string"&&e.startsWith(gE)).map(e=>e.slice(5))'), 1);
  assert.equal(count(shared21, 'function vE(e,t,n){if(e.prefsSeeded)return e;'), 1);
  assert.equal(count(shared21, '!i.prefsSeeded&&Jv()&&(i=vE(i,n,t.customGroupsByScope?.[n]))'), 1);
});

test('folderBucketMenu: Sort A to Z with any stored key (ccg:: too), and it saves []', () => {
  const saved = [];
  const options = (projectOrder) => ({ order: ['/a', '/b'], projectOrder, save: (ids) => saved.push(ids) });
  const folder = { kind: 'project', key: 'project:/b', projectKey: '/b' };
  assert.equal(Layout.folderBucketMenu(folder, options([])).order.reset, undefined, 'K.length === 0: Se = void 0');
  assert.equal(Layout.folderBucketMenu(folder, options([1, null])).order.reset, undefined, 'Zj keeps the string keys only');
  for (const stored of [[customOrderKey('g1')], ['/b', '/a'], [customOrderKey('g1'), '/b', '/gone']]) {
    const menu = Layout.folderBucketMenu(folder, options(stored));
    assert.equal(typeof menu.order.reset, 'function', JSON.stringify(stored));
    menu.order.reset();
    assert.deepEqual(saved.at(-1), [], `G([]) for ${JSON.stringify(stored)}`);
  }
  // The preset bucket menu takes the same slot (source-sidebar.jsx folderMenu: folderBucketMenu({kind: 'project',
  // projectKey: group.orderKey}) then presetBucketMenu with slot.order).
  const preset = Layout.folderBucketMenu({ kind: 'project', projectKey: 'preset::E1' }, { order: ['preset::E1', '/a'], projectOrder: [customOrderKey('g1')], save: (ids) => saved.push(ids) });
  preset.order.reset();
  assert.deepEqual(saved.at(-1), []);
});

test('store: once the sections layout has seeded, a cleared projectOrder leaves the manual sections in place', () => {
  const base = () => ({
    customGroups: [{ id: 'g1', name: 'Alpha' }, { id: 'g2', name: 'Beta' }],
    sessionMetadata: {},
    projectOrder: [customOrderKey('g2'), customOrderKey('g1'), '/w/a'],
    sidebarPreferences: { groupBy: 'custom' },
  });
  const deps = { knownSessionIds: () => new Set(), mirror() {}, codexSections: {} };
  const manual = (config) => Store.sidebarSectionsFor(config).filter((s) => s.id === 'g1' || s.id === 'g2').map((s) => s.id);
  // Seeded first (useSidebarSectionsHost's sections-seed on the layout's first render), then Sort A to Z (main.cjs
  // project-order with ids []).
  const seeded = base();
  assert.deepEqual(manual(seeded), ['g2', 'g1'], 'the ccg:: order seeds the sections');
  assert.equal(Store.applySidebarSectionOperation(seeded, Store.sidebarSectionRequest('seed'), deps), true);
  seeded.projectOrder = [];
  assert.deepEqual(manual(seeded), ['g2', 'g1'], 'officially the seeded record no longer reads code-projects-order');
  assert.equal(Store.syncSidebarSections(seeded), false);
  // Why the seeding matters: unseeded, the sections are still derived from the legacy order.
  const unseeded = base();
  unseeded.projectOrder = [];
  assert.notDeepEqual(manual(unseeded), ['g2', 'g1']);
});

test('host source: the sections layout seeds on its first render, and only the sections layout has these menus', async () => {
  const sections = await read(path.join(app, 'src/source-sidebar-sections.jsx'));
  const sidebar = await read(path.join(app, 'src/source-sidebar.jsx'));
  assert.match(sections, /if \(!active \|\| !onSectionAction \|\| seeded\.current\) return;\s*seeded\.current = true;\s*send\.current\('seed', \{\}\);/);
  assert.match(sidebar, /useSidebarSectionsHost\(\{ active: !!sectionsModel,/);
  assert.match(sidebar, /const sectionsHost = sectionsModel && \{/);
  assert.equal(count(sidebar, 'folderBucketMenu('), 2, 'the folder bucket and the preset slot, both inside sectionsHost.folderMenu');
});
