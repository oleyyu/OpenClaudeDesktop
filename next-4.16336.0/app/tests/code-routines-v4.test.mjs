import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { contracts, contractVersions, extractCodeRoutines, legacyConsumers } from '../scripts/extract-code-routines.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

// Region batch 3 (4.16336.0 migration): code-routines keeps its 3.6556.2 production graph byte for byte (12 generated
// areas still link it by original identity, region-plan cutover.oldConsumersAtGeneration) and gains an isolated 4.16336.0
// contract, src/generated/code-routines-v4, cut by the same generator from the frozen snapshot over cds-core and
// routines-shared-v4. It was stopped by D46 (cds-core held two vendor-frame module states the Base UI combobox reaches
// without a publicName); cds-core wave 5b publishes them and the combobox parts, so the contract now generates over
// cds-core. Run serially (node --test-concurrency=1).
const app = path.resolve(import.meta.dirname, '..');
const V4 = official4.referenceVersion;
const OUT_V4 = path.join(app, 'src/generated/code-routines-v4');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const quiet = async fn => { const log = console.log; console.log = () => {}; try { return await fn(); } finally { console.log = log; } };

// The cds-core publication this region requested (analysis .../batch3/code-routines/cds-core-publication-request.json): the
// Base UI combobox parts the 4.16336.0 SearchablePillSelect (cd2687f9f Me) renders, and the labelable id hooks the model
// selector (shared-7 SI) reads. cds-core wave 5b publishes all of them (vendor-frame.mjs) under these names.
const PUBLICATION_REQUEST = {
  P_: 'BaseComboboxRoot', $_: 'BaseComboboxTrigger', Z_: 'BaseComboboxInput', iv: 'BaseComboboxList', mv: 'BaseComboboxPopup',
  dv: 'BaseComboboxPortal', fv: 'BaseComboboxPositioner', Tv: 'BaseComboboxItem', Ev: 'BaseComboboxItemIndicator',
  Nv: 'BaseComboboxEmpty', _v: 'BaseComboboxGroup', vv: 'BaseComboboxGroupLabel', cv: 'BaseComboboxStatus',
  Xm: 'useLabelableId', Gm: 'useLabelableContext',
};
// The two vendor-frame module states D46 stopped on, published by wave 5b.
const MODULE_STATE = { Xl: 'microtaskBatchQueue', Kr: 'backdropFilterSupport' };
const cdsCoreManifest = () => JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
const generatedManifest = () => JSON.parse(fs.readFileSync(path.join(OUT_V4, 'manifest.json'), 'utf8'));

test('two source contracts: 3.6556.2 production (unchanged, the default) and the 4.16336.0 isolated contract', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  const legacy = await quiet(() => extractCodeRoutines({ check: true }));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.equal(legacy.adapterModule, 'src/source-code-routines-adapters.jsx');
  assert.equal(legacy.modules.length, 73);
  assert.equal(legacy.sharedGraph, undefined);
  const t = contracts[V4];
  assert.equal(path.relative(app, t.output), 'src/generated/code-routines-v4');
  assert.equal(t.adapterFile, 'src/source-code-routines-v4-adapters.jsx');
  assert.equal(t.sharedGraph, 'cds-core');
  assert.equal(t.linkedArea, 'routines-shared-v4');
  assert.equal(t.uniqueRoots, true);
  assert.deepEqual(t.isolatedGraph, { productionOutput: 'src/generated/code-routines', productionSwitchNotBeforeBatch: 11, heldBy: legacyConsumers });
  assert.deepEqual([...legacyConsumers], ['approval-titles', 'artifact-library', 'chat-knowledge', 'chat-projects', 'code-editor', 'code-transcript',
    'cowork-approval', 'cowork-home', 'sessions-page', 'sidebar-routines', 'transcript-rows', 'turn-plan']);
});

test('cds-core wave 5b publishes the two vendor-frame module states D46 stopped on, and every requested combobox part', () => {
  const manifest = cdsCoreManifest();
  assert.equal(manifest.referenceVersion, V4);
  const vendorFrame = manifest.modules.find(m => m.target === 'vendor-frame.mjs');
  assert.equal(vendorFrame?.source, 'vendor-frame-BckkO60Y.js');
  const held = new Set(vendorFrame.bindings.map(b => b.name));
  const named = new Map(Object.entries(manifest.publicNames).filter(([, p]) => p.file === 'vendor-frame-BckkO60Y.js').map(([name, p]) => [p.local, name]));
  for (const [local, name] of Object.entries({ ...MODULE_STATE, ...PUBLICATION_REQUEST })) {
    assert.ok(held.has(local), `cds-core vendor-frame.mjs holds ${local}`);
    assert.equal(named.get(local), name, `${local} is the cds-core publicName ${name}`);
  }
});

test('the 4.16336.0 contract generates over cds-core: check passes, the combobox parts link cds-core, no cds-core state is cut again', async () => {
  const result = await quiet(() => extractCodeRoutines({ check: true, version: V4 }));
  assert.equal(result.referenceVersion, V4);
  const manifest = generatedManifest();
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.linkedArea, 'routines-shared-v4');
  assert.equal(manifest.modules.length, 86);
  // 1145 - 6: shared-212 kv links r3b-tasks (D1, cds-integrate wave5b fix), so kv and j_ M_ yv Cv Dv are not cut here;
  // 1139 - 60 since cds-core wave 6: bindings it now publishes are linked from cds-core, and what only they reached is not cut;
  // 1079 - 7 since cds-core wave 7 (the same for the writers and state it publishes);
  // 1072 - 3 since cds-core wave 8 (W8-M4 / W8-M7): shared-92 Y and vendor-zod Ks are linked from cds-core, not answered by
  // host adapters, and the bindings only those adapters' features reached are not cut;
  // 1069 - 10 since cds-core wave 8s (W8S-T6): shared-7 iI / nI / rI / TI and shared-123 cg / lg / mg / ug are linked from
  // cds-core (settings_* publicNames), and shared-123 fg / sg, which only they reached, are not cut. Was 1069.
  // 1059 - 55 since cds-core wave 8a / 8b (R4-K1): 20 wave-8a identity values (shared-0 Fc / M / Ma / Mo / Na / bs / is / ja / lQ,
  // shared-123 Fh, shared-25 nu / ql, shared-62 ZS / y_, shared-92 fy / gx / ly / my / ux / vx) are linked from cds-core and the
  // 35 bindings only they reached are not cut; shared-8 bv (the CCD sessions store, store_shared8_bv) is linked from cds-core
  // instead of answered by the ccdSessionsStore host adapter (W8B-C2). Was 1059.
  assert.equal(manifest.modules.reduce((n, m) => n + m.bindings.length, 0), 1004);
  for (const m of manifest.modules) assert.equal(sha(fs.readFileSync(path.join(OUT_V4, m.target))), m.sha256, m.target);
  // D1: the shared-212 invisible / hidden character predicates are r3b-tasks' (4.16336.0 production, invisible-character.mjs):
  // kv is imported from there by its export name, its declaration hashes as r3b-tasks holds it, and none of the six
  // r3b-tasks bindings of shared-212 is cut here.
  const r3bTasks = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/r3b-tasks/manifest.json'), 'utf8'));
  const invisible = r3bTasks.modules.find(m => m.target === 'invisible-character.mjs');
  assert.equal(invisible.source, 'shared-212-BHMAi0oa.js');
  const shared212 = manifest.modules.find(m => m.source === 'shared-212-BHMAi0oa.js');
  for (const b of invisible.bindings) assert.equal(shared212.bindings.some(x => x.name === b.name), false, `shared-212 ${b.name} is r3b-tasks'`);
  assert.deepEqual(shared212.imports.filter(i => i.kind === 'linked-graph').map(i => [i.local, i.from, i.name, i.linkedSha256]),
    [['kv', '../r3b-tasks/invisible-character.mjs', 'isHiddenCharacter', invisible.bindings.find(b => b.name === 'kv').sha256]]);
  assert.equal(manifest.linkedGraphModules['r3b-tasks/invisible-character.mjs'], invisible.sha256);
  // Every requested combobox part / labelable hook is imported from cds-core vendor-frame.mjs, never cut here.
  const fromCore = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph' && i.from === '../cds-core/vendor-frame.mjs').map(i => i.name)));
  for (const local of Object.keys(PUBLICATION_REQUEST)) assert.ok(fromCore.has(local), `${local} links cds-core vendor-frame.mjs`);
  // Neither module state is cut here; the one vendor-frame binding this graph cuts (oe) is pure and the same declaration
  // cds-core holds.
  const core = cdsCoreManifest();
  const coreVendor = new Map(core.modules.find(m => m.target === 'vendor-frame.mjs').bindings.map(b => [b.name, b.sha256]));
  const cutVendor = manifest.modules.filter(m => m.source === 'vendor-frame-BckkO60Y.js');
  assert.deepEqual(cutVendor.map(m => [m.target, m.bindings.map(b => b.name), m.heldByCdsCore]), [['vendor-frame-BckkO60Y.mjs', ['oe'], ['oe']]]);
  assert.equal(cutVendor[0].bindings[0].sha256, coreVendor.get('oe'));
  for (const local of Object.keys(MODULE_STATE)) assert.equal(manifest.modules.some(m => m.source === 'vendor-frame-BckkO60Y.js' && m.bindings.some(b => b.name === local)), false, local);
  // 'crypto' is an allowed global only for caf74d8e3 x: its official declaration calls crypto.randomUUID() (once in the
  // frozen chunk), first reached when wave 5b lifted D46 for this graph.
  assert.ok(contracts[V4].allowedGlobals.has('crypto'));
  assert.equal(fs.readFileSync(path.join(official4.ionSource, 'caf74d8e3-DEbQKttf.js'), 'utf8').split('crypto').length - 1, 1);
  const usingCrypto = manifest.modules.filter(m => /\bcrypto\./.test(fs.readFileSync(path.join(OUT_V4, m.target), 'utf8'))).map(m => m.target);
  assert.deepEqual(usingCrypto, ['caf74d8e3-DEbQKttf.mjs']);
  assert.match(fs.readFileSync(path.join(OUT_V4, 'caf74d8e3-DEbQKttf.mjs'), 'utf8'), /crypto\.randomUUID\(\)\.slice\(0, 13\)/);
});

test('survey: the closure is complete without assumptions: unique roots, pins, no state conflicts, no D1 state overlap', async () => {
  const r = await quiet(() => extractCodeRoutines({ survey: true, version: V4 }));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.stateConflicts, []);
  let bindings = 0; for (const [, s] of r.chunks) bindings += s.size;
  assert.equal(r.chunks.size, 86);
  assert.equal(bindings, 1004); // cds-core wave 8a / 8b (R4-K1, see the contract test above); wave 8s: 1059 (W8S-T6); wave 8: 1069; wave 7: 1072
  // The wave 5 d1Pending list (report.json) is resolved: cds-core wave 5b publishes or the -v4 graphs link every stateful
  // binding another 4.16336.0 graph also cuts, so none is cut twice.
  assert.deepEqual(r.d1.filter(x => x.state).map(x => x.binding), []);
  for (const local of Object.keys(PUBLICATION_REQUEST)) assert.equal(r.resolved.get(`vendor-frame-BckkO60Y.js#${local}`)?.publicName, PUBLICATION_REQUEST[local], local);
  // The persisted sidebar store is one instance, not a second cut: since cds-core wave 8 (W8-M4 / W8-M7) the official Y that
  // cds-core holds and publishes (wave 7: the host adapter useSidebarSectionsStore).
  assert.equal(r.chunks.get('shared-92-BOgyxePb.js')?.has('Y') ?? false, false);
  assert.equal(r.resolved.get('shared-92-BOgyxePb.js#Y')?.publicName, 'store_shared92_Y');
  assert.equal(r.resolved.get('shared-18-Cfqwgjc5.js#uA')?.name, 'useUnifiedRoutinesGate');
  assert.equal(r.resolved.get('shared-18-Cfqwgjc5.js#dA')?.name, 'useUnifiedRoutinesGate');
});

test('the 4.16336.0 raw call sites occur exactly once in the frozen snapshot', () => {
  const sites = contracts[V4].rawCallSites;
  assert.equal(sites.length, 6);
  for (const site of sites) {
    const text = fs.readFileSync(path.join(official4.ionSource, site.source), 'utf8');
    for (const feature of site.features) assert.equal(text.split(feature).length - 1, 1, `${site.source}: ${feature}`);
  }
  // tnnK1JFUSw (the 3.6556.2 Run now id) is gone from the 4.16336.0 detail chunk.
  assert.equal(fs.readFileSync(path.join(official4.ionSource, 'cfc18e0f4-C_rkZ1o0.js'), 'utf8').includes('tnnK1JFUSw'), false);
});

// cds-core wave 8 (W8-M7): useSidebarSectionsStore (shared-92 Y) is no longer an answer of this graph (wave 7: three answers).
test('the 4.16336.0 adapters: the 3.6556.2 names, plus two answers the new host module adds', () => {
  const names = t => new Set(Object.values(t.adapterTable).flatMap(tab => Object.values(tab).map(a => a.name)));
  const v3 = names(contracts['3.6556.2']), v4 = names(contracts[V4]);
  assert.deepEqual([...v4].filter(n => !v3.has(n)).sort(), ['removeSearchParams', 'useRouterSearchParam']);
  // wave 8 (W8-M7): the 3.6556.2 zodNumber answer (vendor-zod Ks) is the official schema cds-core publishes (zod_vendorzod_Ks),
  // linked in 4.16336.0 (wave 7: ['useIsFocusedExtraPane']).
  // wave 8b (R4-K1, W8B-C2): the 3.6556.2 ccdSessionsStore answer (shared-8 bv) is the official store cds-core publishes
  // (store_shared8_bv). Was ['useIsFocusedExtraPane', 'zodNumber'].
  assert.deepEqual([...v3].filter(n => !v4.has(n)), ['ccdSessionsStore', 'useIsFocusedExtraPane', 'zodNumber']);
  const base = fs.readFileSync(path.join(app, 'src/source-code-routines-adapters.jsx'), 'utf8');
  for (const n of v4) if (!['removeSearchParams', 'useRouterSearchParam', 'useSidebarSectionsStore'].includes(n))
    assert.match(base, new RegExp(`export (?:const|function|async function|let|class) ${n.replace('$', '\\$')}\\b|export \\{[^}]*\\b${n}\\b`), n);
});
