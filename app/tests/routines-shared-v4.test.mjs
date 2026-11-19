import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { contracts, contractVersions, extractRoutinesShared, legacyConsumers } from '../scripts/extract-routines-shared.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

// Region batch 2b (4.16336.0 migration): routines-shared keeps its 3.6556.2 production graph byte for byte (34 generated
// areas still link it by original identity, region-plan cutover.oldConsumersAtGeneration) and gains an isolated
// 4.16336.0 graph, src/generated/routines-shared-v4, cut by the same generator from the frozen snapshot over cds-core.
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/generated/routines-shared-v4');
const LEGACY = path.join(ROOT, 'src/generated/routines-shared');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const V4 = official4.referenceVersion;
let server, shared, adapters, createIntl, manifest, Core;
before(async () => {
  manifest = await extractRoutinesShared({ check: true, version: V4 });
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  shared = await server.ssrLoadModule('/src/generated/routines-shared-v4/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  ({ createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-BJgYK7RA.js'));
  // Since cds-core wave 5 describeStartFailure (shared-60 On) and the look-backed hook (shared-123 ad) are cds-core
  // publicNames: host code reads them from the facade, no longer from this graph.
  Core = await server.ssrLoadModule('/src/cds-core.mjs');
});
after(() => server?.close());
const intl = () => createIntl({ locale: 'en-US', defaultLocale: 'en-US', messages: {} });

test('two source contracts: 3.6556.2 production (unchanged) and the 4.16336.0 isolated graph, both --check', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  const legacy = await extractRoutinesShared({ check: true });
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.equal(legacy.sharedGraph, undefined);
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.isolatedGraph, { productionOutput: 'src/generated/routines-shared', productionSwitchNotBeforeBatch: 11, heldBy: [...legacyConsumers] });
  assert.equal(legacyConsumers.length, 34);
  assert.deepEqual((await fs.readdir(OUT)).sort(), [...manifest.modules.map(m => m.target), 'index.mjs', 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, V4, m.target);
    const bytes = await fs.readFile(path.join(OUT, m.target));
    assert.equal(sha(bytes), m.sha256, m.target);
    assert.match(bytes.toString(), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /, m.target);
    assert.doesNotMatch(bytes.toString(), /\.\.\/view-tabs\/|\.\.\/routines-shared\/|3\.6556\.2/, m.target);
    assert.equal(sha(await fs.readFile(path.join(official4.ionSource, m.source))), m.sourceSha256, m.target);
  }
  // Every root has its semantic name in index.mjs, every adapter is one the (unchanged) host adapter module exports.
  for (const name of Object.keys(manifest.publicNames)) assert.ok(name in shared, `index.mjs exports ${name}`);
  for (const { name } of manifest.adapters) assert.equal(typeof adapters[name], 'function', `adapter ${name}`);
  assert.equal(manifest.adapters.length, 34);
  // RouterLink is the one 3.6556.2 adapter 4.16336.0 no longer reaches (cf8745532 u now renders the CDS card's Link).
  assert.ok(!manifest.adapters.some(a => a.name === 'RouterLink'));
});

test('the production graph and its 3.6556.2 consumers are untouched: no 3.6556.2 graph links the -v4 graph', async () => {
  const legacy = JSON.parse(await fs.readFile(path.join(LEGACY, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const m of legacy.modules) assert.equal(sha(await fs.readFile(path.join(LEGACY, m.target))), m.sha256, m.target);
  const generated = path.join(ROOT, 'src/generated');
  const linking = [], v4Linking = new Set();
  const v4Targets = new Set(manifest.modules.map(m => m.target).concat(['index.mjs']));
  for (const area of await fs.readdir(generated)) {
    if (area === 'routines-shared' || area === 'routines-shared-v4') continue;
    const dir = path.join(generated, area);
    if (!(await fs.stat(dir)).isDirectory()) continue;
    for (const name of await fs.readdir(dir)) {
      if (!/\.m?js$/.test(name)) continue;
      const text = await fs.readFile(path.join(dir, name), 'utf8');
      // Staged 4.16336.0 consumer graphs (<area>-v4, not wired: the host check below) link the -v4 graph by design
      // (region batch 3: cowork-session-states-v4; patch regions/batch3/cowork-session-states/patches/
      // routines-shared-v4-test-allow-staged-v4-consumers.patch); 3.6556.2 graphs never do. A -v4 link must name a
      // module this graph writes, and the linking area's manifest must declare routines-shared-v4.
      if (!area.endsWith('-v4')) assert.doesNotMatch(text, /routines-shared-v4\//, `${area}/${name}`);
      else for (const [, target] of text.matchAll(/from "\.\.\/routines-shared-v4\/([^"]+)"/g)) {
        assert.ok(v4Targets.has(target), `${area}/${name} links routines-shared-v4/${target}, a module the graph writes`);
        v4Linking.add(area);
      }
      if (/from "\.\.\/routines-shared\//.test(text)) linking.push(area);
    }
  }
  // A declaration is a linkedAreas entry naming the graph, or (multi-area generators such as code-editor-v4, which record
  // their links per binding) manifest entries of kind 'linked' whose module / from is a routines-shared-v4 module this graph
  // writes, with no routines-shared-v4 reference of any other kind (round3 integrate-gates).
  for (const area of v4Linking) {
    const text = await fs.readFile(path.join(generated, area, 'manifest.json'), 'utf8');
    if (/"routines-shared-v4"/.test(text)) continue;
    const refs = [];
    const visit = node => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      const to = [node.module, node.from].find(v => typeof v === 'string' && /^\.\.\/routines-shared-v4\//.test(v));
      if (to) refs.push({ to, kind: node.kind });
      for (const value of Object.values(node)) visit(value);
    };
    visit(JSON.parse(text));
    assert.ok(refs.length > 0 && refs.every(r => r.kind === 'linked' && v4Targets.has(r.to.slice('../routines-shared-v4/'.length))),
      `${area}/manifest.json declares routines-shared-v4 (${JSON.stringify(refs.filter(r => r.kind !== 'linked').slice(0, 3))})`);
  }
  // The 3.6556.2 consumers still link the production folder by original identity.
  for (const area of ['code-routines', 'cowork-scheduled', 'session-rail', 'sessions-page', 'turn-box', 'cowork-approval'])
    assert.ok(linking.includes(area), `${area} links ../routines-shared/`);
  // Code only (round3 integrate-gates): a comment that explains which graph adapts the same bindings
  // (source-cowork-context-v4-adapters.jsx, source-projects.jsx) imports nothing; any code mention still counts.
  const code = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
  // library-pages-r1-03 (cutover; the old assertion "no host file is cut over" encoded the staged state): the Scheduled page
  // host takes the status line / divider (source-routines.jsx) and the card (source-routine-cowork-page-adapters.jsx) from
  // routines-shared-v4; no other host file imports it.
  const scheduledHosts = ['source-routine-cowork-page-adapters.jsx', 'source-routines.jsx'];
  for (const file of await fs.readdir(path.join(ROOT, 'src')))
    if (/\.(m?js|jsx)$/.test(file)) {
      const text = code(await fs.readFile(path.join(ROOT, 'src', file), 'utf8'));
      if (scheduledHosts.includes(file)) assert.match(text, /from '\.\/generated\/routines-shared-v4\/index\.mjs';/, `host ${file}`);
      else assert.doesNotMatch(text, /routines-shared-v4/, `host ${file} is not cut over`);
    }
});

test('roots: each 4.16336.0 root is the exported (or private) unique declaration the routes import', async () => {
  const expected = {
    'cdbc75b4b-TExYNEy0.js': { Rn: 'N', Hn: 'O', Fn: 'k', In: 'A', Qn: 'T', Vn: 'E', Un: 'D', Wn: 'j', er: 'w', rn: 'F', Ln: 'P', Nn: 'I', sr: 'S', dr: 'v',
      Jr: 'a', Sr: 'd', $r: 'n', Xr: 'i', li: 't', cr: 'b', ir: 'C', lr: 'x', Zn: 'M', on: 'L', Qt: 'z' },
    'c1984a75c-CZgeZ21y.js': { _e: 't' },
    'c43d31dd8-BRyXMvOp.js': { A: 'a', O: 'c', D: 'l', P: 'f', N: 'p', _: 'g', w: 'i', I: 'u', v: 'h', M: 'n', E: 'o', F: 'm', x: 'r', L: 's', k: 't', j: 'd' },
    'shared-62-DoCqVpIq.js': { kv: 'zm', xv: null, Ev: 'Hm', vv: 'Km', yv: 'Wm', gv: 'qm', wv: null },
    'shared-60-DmOyT7JJ.js': { Q: 'a' },
  };
  const roots = contracts[V4].roots;
  assert.deepEqual(Object.fromEntries(Object.entries(roots).map(([f, n]) => [f, Object.fromEntries(Object.entries(n).map(([l, s]) => [l, s.export]))])), expected);
  // c43d31dd8: every one of its 16 exports is a root (3.6556.2 had 15; O, the waiting detail kind, is new).
  const exportsOf = async file => [...(await fs.readFile(path.join(official4.ionSource, file), 'utf8')).matchAll(/export\{([^}]*)\}/g)].at(-1)[1].split(',').length;
  assert.equal(await exportsOf('c43d31dd8-BRyXMvOp.js'), 16);
  assert.equal(manifest.publicNames.ScheduledTaskCard.local, 'Jr');
  assert.equal(manifest.publicNames.scheduledTaskErrorCategory.file, 'shared-62-DoCqVpIq.js');
  assert.equal(manifest.publicNames.normalizeStartFailureCategory.file, 'shared-60-DmOyT7JJ.js');
  // Roots no more since cds-core wave 5 (it publishes them; the routes' reads link it).
  assert.ok(!('describeStartFailure' in manifest.publicNames) && !('useLookBacked' in manifest.publicNames));
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.deepEqual([core.publicNames.describeStartFailure, core.publicNames.useHubLookBacked].map(e => `${e.file}#${e.local}`), ['shared-60-DmOyT7JJ.js#On', 'shared-123-1Hc1RTKl.js#ad']);
  // The pinned raw call sites are the 4.16336.0 route / detail / form imports, the Run now toast and the lookBacked store.
  assert.deepEqual(manifest.callSites.map(c => c.source), ['cbd6c85c8-CxDdK_2w.js', 'cbd6c85c8-CxDdK_2w.js', 'cfc18e0f4-C_rkZ1o0.js', 'c0fd2fda3-CulNgT2Q.js', 'shared-123-1Hc1RTKl.js']);
});

test('cds-core: publicNames linked by hash, held pure bindings re-cut by hash, no module state copied (D46: 0)', async () => {
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const exportName = new Map(Object.values(core.publicNames).map(e => [`${e.target}:${e.exportName}`, e]));
  const held = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name ?? b}`, b.sha256])));
  let links = 0;
  for (const m of manifest.modules) {
    for (const i of m.imports) {
      if (i.kind !== 'shared-graph') continue;
      links++;
      const target = i.from.replace('../cds-core/', '');
      const entry = exportName.get(`${target}:${i.name}`);
      assert.ok(entry, `${m.target} ${i.local} imports a cds-core publicName (${i.name})`);
      assert.equal(`${entry.file}#${entry.local}`, i.via, `${m.target} ${i.local}`);
      assert.equal(held.get(i.via), i.linkedSha256, `${m.target} ${i.local} hash`);
    }
    for (const name of m.heldByCdsCore) assert.equal(held.get(`${m.source}#${name}`), m.bindings.find(b => b.name === name).sha256, `${m.target} ${name}`);
  }
  // 70 since cds-core wave 5 (its state / message tables of shared-0 / shared-25 / shared-60 / shared-62 / shared-123 are
  // publicNames now); 84 since cds-core wave 6, which publishes the titlebar-frame state this graph held unexported
  // (shared-0 jH UserAgentContext / PH userAgentPlatformCache, shared-31 Tu scrollbarLaneProbes, shared-120 Ke, linked
  // twice) and shared-4 py, shared-0 bV / DV / JT, shared-1 kV, shared-140 lo, shared-18 KJ, shared-2 p_ / hE; the pure
  // bindings of those chunks it holds unpublished are cut again by hash; 85 since cds-core wave 7, which publishes the
  // shared-frame compiler state I4 (state_sharedframe_I4) shared-18 reads: linked, no longer cut here.
  // 86 since cds-core wave 8s (W8S-T8 / W8S-M3), which publishes shared-25 Dz (settings_shared25_Dz): linked, no longer cut here
  // (was 85).
  // 92 since cds-core wave 8a (R4-K1 addendum A, identity family), which publishes six module-load values of shared-0 this
  // graph cut again by hash (AF / EF / PT / ZF / jF / kF: identity_shared0_*): linked, no longer cut here; the pure CF / DF /
  // OF / SF / TF / wF / xF only they reached are not cut either (was 86).
  assert.equal(links, 92);
  assert.deepEqual(Object.fromEntries(manifest.modules.filter(m => m.heldByCdsCore.length).map(m => [m.target, m.heldByCdsCore])), {
    'preload-helper-BBljBeZo.mjs': ['e'],
    'rolldown-runtime-C3OYiQ02.mjs': ['a', 'c', 'e', 'i', 'l', 'n', 'o', 'r', 't'],
    // cds-core wave 8 holds 29 more pure shared-0 bindings (unpublished, closure of the wave-8 publicNames): $F AF BT CI
    // DF JF MF OF QF U XF YF ZF aI cI dF eI iI jF kF lF nI oI rI sI tI uF wI yI, cut again here by hash (was: ['BF', 'Bu',
    // 'CF', 'D6', 'E6', 'EF', 'FF', 'LO', 'NF', 'Or', 'PF', 'PT', 'RF', 'SF', 'SV', 'T6', 'TF', 'Tl', 'VF', 'Y', '_I', '_e',
    // '_u', 'bF', 'gu', 'ju', 'kr', 'me', 'q', 'vI', 've', 'wF', 'xF', 'yu', 'zF', 'zu']).
    // cds-core wave 8s (W8S-T8b) also holds the pure shared-0 NV (unpublished, closure of the wave-8s publicNames), cut again
    // here by hash (was: the list below without 'NV').
    // cds-core wave 8a (R4-K1): AF / EF / PT / ZF / jF / kF are publicNames now (linked, above) and CF / DF / OF / SF / TF / wF /
    // xF, which only they reached, are not cut (was: the wave-8s list with 'AF', 'CF', 'DF', 'EF', 'OF', 'PT', 'SF', 'TF', 'ZF',
    // 'jF', 'kF', 'wF', 'xF').
    'shared-0-CnnWnVrT.mjs': ['$F', 'BF', 'BT', 'Bu', 'CI', 'D6', 'E6', 'FF', 'JF', 'LO', 'MF', 'NF', 'NV', 'Or', 'PF', 'QF',
      'RF', 'SV', 'T6', 'Tl', 'U', 'VF', 'XF', 'Y', 'YF', '_I', '_e', '_u', 'aI', 'bF', 'cI', 'dF', 'eI', 'gu', 'iI', 'ju',
      'kr', 'lF', 'me', 'nI', 'oI', 'q', 'rI', 'sI', 'tI', 'uF', 'vI', 've', 'wI', 'yI', 'yu', 'zF', 'zu'],
    'shared-153-DMw2VzSq.mjs': ['_g'],
    'shared-2-CsjIBQD8.mjs': ['aE', 'oE'],
    // cds-core wave 8d (R4-Q1 addendum D, stage 14d) also holds the pure shared-25 VB (unpublished, closure of the wave-8d
    // publicNames), cut again here by hash (was: ['Ci', 'FW', 'MW', 'NW', 'Si', 'ga', 'ha', 'wi', 'xi']).
    'shared-25-D-aF0gt9.mjs': ['Ci', 'FW', 'MW', 'NW', 'Si', 'VB', 'ga', 'ha', 'wi', 'xi'],
    'shared-33-DtdykY0y.mjs': ['Cb'],
    'shared-60-DmOyT7JJ.mjs': ['Q'],
    'shared-62-DoCqVpIq.mjs': ['Cv', 'Ev', 'Ko', 'Sv', 'xv'],
    'shared-frame-CJdE5Ria.mjs': ['I1', 'I2', 'I3', 'I5', 'J0', 'J1', 'J2', 'J3', 'J4', 'J5', 'J8', 'J9', 'K0', 'K1', 'K2', 'K3', 'K4', 'K5', 'Qt', 'Yt', 'Z1', 'Z2', 'Z3', 'Z5', 'Zt', 'bs', 'en', 'nn', 'on', 'tn'],
    'vendor-intl-BJgYK7RA.mjs': ['tn'],
  });
  // wave 6: the four titlebar-frame bindings are cds-core publicNames imported here, not cut here.
  const coreName = (file, local) => Object.entries(core.publicNames).find(([, e]) => e.file === file && e.local === local)?.[0];
  assert.deepEqual([['shared-0-CnnWnVrT.js', 'jH'], ['shared-0-CnnWnVrT.js', 'PH'], ['shared-31-C9BqSSuD.js', 'Tu'], ['shared-120-DCdTP1_5.js', 'Ke']].map(([f, l]) => coreName(f, l)),
    ['UserAgentContext', 'userAgentPlatformCache', 'scrollbarLaneProbes', 'ctx_shared120_Ke']);
  for (const via of ['shared-0-CnnWnVrT.js#jH', 'shared-0-CnnWnVrT.js#PH', 'shared-31-C9BqSSuD.js#Tu', 'shared-120-DCdTP1_5.js#Ke']) {
    assert.ok(manifest.modules.some(m => m.imports.some(i => i.kind === 'shared-graph' && i.via === via)), via);
    assert.ok(!manifest.modules.some(m => m.bindings.some(b => `${path.basename(m.source)}#${b.name}` === via)), `${via} is not cut here`);
  }
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules))
    assert.equal(core.modules.find(m => m.target === target).sha256, digest, target);
  // No context cds-core holds is copied: this graph's own contexts are not cds-core bindings.
  for (const key of manifest.contexts) assert.equal(held.has(key), false, key);
});

test('D1: shared-0 Tl (lazyValue) follows the cds-core rule since cds-core holds it (wave 5): cut again only as its declaration', async () => {
  // Until cds-core wave 5 Tl was linked from r3b-tasks' lazy-value.mjs. cds-core holds Tl now (pure, no publicName), so
  // the generator refuses the r3b-tasks link ("link cds-core") and Tl is a held pure copy, byte for byte cds-core's.
  assert.deepEqual(manifest.linkedGraphModules, {});
  assert.deepEqual(contracts[V4].linkedGraphs, {});
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked-graph')), []);
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const owner = core.modules.find(m => m.source === 'shared-0-CnnWnVrT.js').bindings.find(b => b.name === 'Tl');
  const mine = manifest.modules.find(m => m.source === 'shared-0-CnnWnVrT.js');
  assert.ok(mine.heldByCdsCore.includes('Tl'));
  assert.equal(mine.bindings.find(b => b.name === 'Tl').sha256, owner.sha256);
  assert.ok(!Object.values(core.publicNames).some(e => e.file === 'shared-0-CnnWnVrT.js' && e.local === 'Tl'));
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => ({ linkedGraphs: { 'shared-0-CnnWnVrT.js#Tl': { area: 'r3b-tasks', target: 'lazy-value.mjs', exportName: 'lazyValue' } } })) }),
    /linked from r3b-tasks but cds-core holds it; link cds-core/);
});

// Fail-stop: a contract variant runs check-only (never written) and must throw on every drift the gate covers.
const variant = (patch) => { const c = contracts[V4]; return { ...c, ...patch(c) }; };
const withRoot = (c, file, local, spec) => ({ roots: { ...c.roots, [file]: { ...c.roots[file], [local]: { ...c.roots[file][local], ...spec } } } });
test('fail-stop: drifted features, an ambiguous root, a wrong export pin, a drifted adapter, a stale link', async () => {
  await assert.rejects(extractRoutinesShared({ version: V4, contract: contracts[V4] }), /check: true only/);
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => withRoot(c, 'cdbc75b4b-TExYNEy0.js', 'Jr', { features: ['D = o.surface === "chat",'] })) }), /lacks/);
  // Without `reads` the ?edit opener Qt and the ?create opener $t carry the same features.
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => withRoot(c, 'cdbc75b4b-TExYNEy0.js', 'Qt', { reads: undefined })) }), /not the unique declaration .*\(Qt, \$t\)/);
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => withRoot(c, 'cdbc75b4b-TExYNEy0.js', 'Jr', { export: 'b' })) }), /is not exported as b/);
  // A private root must stay private: pinning xv (not exported) to an alias fails.
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => withRoot(c, 'shared-62-DoCqVpIq.js', 'xv', { export: 'Hm' })) }), /is not exported as Hm/);
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => ({ adapters: { ...c.adapters, 'shared-31-C9BqSSuD.js': { ...c.adapters['shared-31-C9BqSSuD.js'],
    zp: { name: 'useScheduledTasksBridge', features: ['Y("some_other_flag")'] } } } })) }), /adapter shared-31-C9BqSSuD\.js#zp lacks/);
  await assert.rejects(extractRoutinesShared({ check: true, contract: variant(c => ({ linkedGraphs: { 'shared-0-CnnWnVrT.js#Tl': { area: 'r3b-tasks', target: 'lazy-value.mjs', exportName: 'Tl' } } })) }), /does not export Tl as Tl/);
});

test('fail-stop D46: module state cds-core holds without a publicName stops generation with binding, text and chain', async () => {
  // shared-frame Fc (a WeakSet) and un (a scalar hn writes) are held by cds-core without a publicName; rooting them here
  // must report both instead of copying them.
  const core = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(core.publicNames).map(e => `${e.file}#${e.local}`));
  const frame = core.modules.find(m => m.target === 'shared-frame.mjs');
  for (const name of ['Fc', 'un']) {
    assert.ok(frame.bindings.some(b => b.name === name), `cds-core holds ${name}`);
    if (published.has(`${official4.sharedFrame}#${name}`)) return; // named by a later wave: nothing left to refuse here
  }
  const contract = { ...contracts[V4], uniqueRoots: false, adapters: {}, linkedGraphs: {}, rawCallSites: [],
    roots: { [official4.sharedFrame]: { Fc: { name: 'probeWeakSet', features: ['Fc = new WeakSet'] }, un: { name: 'probeWritten', features: ['un = ln'] } } } };
  const error = await extractRoutinesShared({ check: true, contract }).then(() => null, e => e);
  assert.ok(error, 'generation stops');
  assert.match(error.message, /D46/);
  assert.deepEqual(error.stateConflicts.map(c => [c.binding, c.kind]), [
    [`${official4.sharedFrame}#Fc`, 'module WeakSet'], [`${official4.sharedFrame}#un`, 'module-level binding written after its declaration']]);
  for (const c of error.stateConflicts) { assert.equal(c.heldBy, 'cds-core/shared-frame.mjs'); assert.ok(c.text.length > 0); assert.equal(typeof c.reachedBy, 'string'); }
});

test('kv reads the [ccdErrorCategory:<cat>] suffix and never reports vv / yv / gv (4.16336.0 adds staff_controls_unapproved and yv)', () => {
  const { scheduledTaskErrorCategory: kv, stripStartErrorMessage: Ev, UNREPORTED_START_CATEGORIES: vv, UNREPORTED_HOST_CATEGORIES: yv, UNREPORTED_POLICY_CATEGORIES: gv } = shared;
  assert.equal(kv(new Error('Folder not found: /tmp/gone [ccdErrorCategory:cwd_not_found]')), 'cwd_not_found');
  assert.equal(kv('[ccdErrorCategory:cwd_not_found] then more'), undefined);
  const ipc = "Error invoking remote method 'desktop:call': Error: Folder not found [ccdErrorCategory:cwd_not_found]";
  assert.equal(kv(ipc), 'cwd_not_found');
  assert.equal(Ev(ipc), 'Folder not found');
  assert.equal(kv(new Error(shared.STALE_RELOGIN_MESSAGE)), 'session_stale_relogin');
  assert.deepEqual([...yv], ['session_host_refused', 'session_host_waiting', 'session_host_setup_fault', 'user_facing_refusal', 'session_host_said_wait']);
  assert.deepEqual([...gv], ['sandbox_required_unavailable', 'managed_settings_refused', 'gateway_access_denied']);
  for (const category of [...vv, ...yv, ...gv, 'session_stale_relogin', 'untrusted_device', 'org_policy_denied', 'github_auth', 'staff_controls_unapproved', 'cloud_storage_mount_denied', 'api_billing_error'])
    assert.equal(kv(`Failed [ccdErrorCategory:${category}]`), undefined, category);
});

test('On describes start failures as the routes word the Run now toast', () => {
  const { describeStartFailure: On } = Core, { normalizeStartFailureCategory: Q } = shared;
  const network = On(intl(), 'network_error', undefined, { errorMessage: 'socket hang up' });
  assert.equal(network.title, 'Connection lost');
  assert.equal(network.retryHelps, true);
  assert.equal(network.isKnownCategory, true);
  const unknown = On(intl(), undefined, undefined, {});
  assert.equal(unknown.isKnownCategory, false);
  assert.equal(Q('spawn_error_ENOENT'), 'spawn_failed');
  assert.equal(Q('api_error_529'), 'api_overloaded');
  assert.equal(Q('api_error_503'), 'api_server_error');
});

test('filters, sort, status and Runs on helpers are the 4.16336.0 originals', () => {
  assert.deepEqual(shared.ROUTINE_FILTER_DEFAULTS, { runsOn: 'all', schedule: 'all', status: 'all', source: 'all' });
  assert.deepEqual(shared.defaultRoutineFilters({ hideNonCode: true }), { runsOn: 'all', schedule: 'all', status: 'all', source: 'code' });
  assert.equal(shared.activeRoutineFilterCount({ runsOn: 'all', schedule: 'all', status: 'paused', source: 'all' }), 1);
  assert.equal(shared.localRoutineStatus({ enabled: true }), 'active');
  assert.equal(shared.localRoutineStatus({ enabled: false }), 'paused');
  assert.deepEqual(shared.sortRoutines([{ id: 'b', displayName: 'Beta' }, { id: 'a', displayName: 'Alpha' }], 'name').map(t => t.id), ['a', 'b']);
  assert.equal(shared.routineRowKey('local', 'x'), 'local-x');
  assert.equal(shared.placeTargetName({ remoteTarget: { kind: 'ssh', sshHost: 'h', sshPort: 2222 } }), 'h:2222');
  // New in 4.16336.0: with the place turned off the waiting detail is dropped (k), and O names a due / too-late wait.
  const waiting = { place: true, waiting: { reason: 'not_available', detail: 'run_due' } };
  assert.equal(shared.withPlaceEnabled({ ...waiting }, true).enabled, true);
  assert.equal(typeof shared.placeWaitingDetail, 'function');
  assert.equal(shared.placeWaitingDetail({}), undefined);
});

const task = { id: 't1', displayName: 'Nightly tests', source: 'local', surface: 'code', enabled: true, cronExpression: '0 9 * * *',
  prompt: 'Run the tests', createdAt: Date.UTC(2026, 9, 1), nextRunAt: '2026-10-18T09:00:00.000Z', cwd: '/repo' };
const host = (extra = {}) => ({ navigate() {}, pathname: '/code/routines', search: '', bridge: undefined, models: [], ...extra });
const render = (node, value = host()) => renderToStaticMarkup(React.createElement(adapters.RoutinesSharedHost.Provider, { value }, node));

test('the 4.16336.0 card, divider, skeleton rows, status line and template card render the original markup', () => {
  const card = render(React.createElement(shared.ScheduledTaskCard, { task, title: task.displayName, href: '/code/routines/t1' }));
  assert.match(card, /href="\/code\/routines\/t1"/);
  assert.match(card, /Nightly tests/);
  assert.match(render(React.createElement(shared.ScheduledTaskDivider, {})), /viewBox="0 0 1600 6"/);
  const rows = render(React.createElement(shared.RoutineSkeletonRows, { count: 3 }));
  assert.match(rows, /^<div class="flex flex-col gap-1">/);
  const status = render(React.createElement(shared.ScheduledTaskStatusLine, { task }));
  assert.match(status, />Active</);
  assert.match(render(React.createElement(shared.ScheduledTaskStatusLine, { task: { ...task, enabled: false } })), />Paused</);
  const template = render(React.createElement(shared.RoutineTemplateCard, { icon: 'Clock', title: 'Daily briefing', description: 'Summary', onSelect() {} }));
  assert.match(template, /class="group relative hit-row hit-row-main flex w-full gap-md rounded-lg p-2 text-start/);
});

test('useLookBacked answers the stored flag outside a provider (Qu, false until nd sets it)', () => {
  let seen;
  const Probe = () => { seen = Core.useHubLookBacked(); return null; };
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(seen, false);
});
