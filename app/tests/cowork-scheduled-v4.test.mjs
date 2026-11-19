import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { contracts, contractVersions, defaultVersions, extractCoworkScheduled, legacyConsumers } from '../scripts/extract-cowork-scheduled.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

// Region batch 3 (4.16336.0 migration): cowork-scheduled keeps its 3.6556.2 production graph byte for byte (15 generated
// areas still link it by original identity, region-plan cutover.oldConsumersAtGeneration) and gains a 4.16336.0 source
// contract over cds-core and routines-shared-v4. Generation used to stop at D46 (the form's CDS coachmark, shared-frame WP,
// reaches two module-level bindings cds-core held without a publicName); cds-core wave 5b publishes them, so the contract
// writes src/generated/cowork-scheduled-v4 (no host import; reached only through the D1 links of the production-switched
// 4.16336.0 graphs, round-3 S1/S6/S7) and links the seven module states it shares
// with code-routines-v4 from there (D1). The rehearsal below runs the whole emission in memory; it never writes.
const ROOT = path.resolve(import.meta.dirname, '..');
const GENERATED = path.join(ROOT, 'src/generated');
const OUT = path.join(GENERATED, 'cowork-scheduled-v4');
const V4 = official4.referenceVersion;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async rel => JSON.parse(await fs.readFile(path.join(GENERATED, rel), 'utf8'));
let legacy, rehearsal;
before(async () => {
  legacy = await extractCoworkScheduled({ check: true });
  rehearsal = await extractCoworkScheduled({ rehearse: true, version: V4 });
});

test('two source contracts; the 3.6556.2 production graph is unchanged and the CLI default runs both once D46 is lifted', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  assert.equal(legacy.referenceVersion, '3.6556.2');
  assert.equal(legacy.sharedGraph, undefined);
  assert.equal(legacy.modules.length, 54);
  assert.deepEqual(contracts[V4].blockedByD46, []);
  assert.deepEqual(defaultVersions, ['3.6556.2', V4]);
  assert.equal(legacyConsumers.length, 15);
  assert.deepEqual(contracts[V4].isolatedGraph, { productionOutput: 'src/generated/cowork-scheduled', productionSwitchNotBeforeBatch: 11, heldBy: [...legacyConsumers] });
  // The 4.16336.0 graph is written; no host file imports it. 4.16336.0 graphs link it through D1 only (manifest
  // linkedAreas, imports of kind 'linked'). Since the round-3 production switch (S1 chat-export, S6 chat-projects,
  // S7 sessions-page) some linkers are reached from src/main.jsx: every 4.16336.0 graph the host reaches is one a host
  // file imports directly, or one a reached graph declares in its linkedAreas (no undeclared path into this graph).
  assert.ok((await fs.stat(path.join(OUT, 'manifest.json'))).isFile());
  const hostFiles = (await fs.readdir(path.join(ROOT, 'src'))).filter(file => /\.(m?js|jsx)$/.test(file));
  // library-pages-r1-03 (cutover; the old assertion "no host file imports it" encoded the staged state): the Scheduled page
  // host (source-routines.jsx) and its card / detail / form wrappers (source-routine-cowork-page-adapters.jsx) import it;
  // no other host file does.
  const scheduledHosts = ['source-routine-cowork-page-adapters.jsx', 'source-routines.jsx'];
  for (const file of hostFiles) {
    const text = await fs.readFile(path.join(ROOT, 'src', file), 'utf8');
    if (scheduledHosts.includes(file)) assert.match(text, /from '\.\/generated\/cowork-scheduled-v4\/index\.mjs';/, `host ${file}`);
    else assert.doesNotMatch(text, /cowork-scheduled-v4\//, `host ${file}`);
  }
  const linking = new Set();
  for (const area of await fs.readdir(GENERATED)) {
    if (area === 'cowork-scheduled-v4' || !(await fs.stat(path.join(GENERATED, area))).isDirectory()) continue;
    for (const name of await fs.readdir(path.join(GENERATED, area)))
      if (/\.m?js$/.test(name) && /\.\.\/cowork-scheduled-v4\//.test(await fs.readFile(path.join(GENERATED, area, name), 'utf8'))) linking.add(area);
  }
  assert.ok(linking.size > 0);
  // linkedAreas is a list (names or { area, modules }) in the region generators, a { area: manifest sha } map in some.
  const linkedNames = m => { const la = m?.linkedAreas; return !la ? [] : Array.isArray(la) ? la.map(e => typeof e === 'string' ? e : e.area) : Object.keys(la); };
  const manifests = new Map();
  const manifestOf = async area => {
    if (!manifests.has(area)) manifests.set(area, await readJson(`${area}/manifest.json`).catch(() => null));
    return manifests.get(area);
  };
  for (const area of linking) {
    const m = await manifestOf(area);
    assert.equal(m?.referenceVersion, V4, `${area} is a 4.16336.0 graph`);
    assert.ok(linkedNames(m).includes('cowork-scheduled-v4'), `${area} declares cowork-scheduled-v4 in linkedAreas`);
    for (const mod of m.modules) for (const i of mod.imports ?? [])
      if (/\.\.\/cowork-scheduled-v4\//.test(i.from ?? '')) assert.equal(i.kind, 'linked', `${area}/${mod.target} -> ${i.from}`);
  }
  // Static relative import closure from src/main.jsx.
  const reached = new Set(), stack = [path.join(ROOT, 'src/main.jsx')];
  const specifiers = /(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
  // Vite resolves extensionless specifiers (main.jsx: "./source-settings"); try the extensions it would.
  const resolveFile = async spec => {
    for (const candidate of [spec, ...['.jsx', '.mjs', '.js'].map(ext => spec + ext), ...['index.jsx', 'index.mjs', 'index.js'].map(name => path.join(spec, name))])
      if (/\.(m?js|jsx)$/.test(candidate) && (await fs.stat(candidate).catch(() => null))?.isFile()) return candidate;
    return null;
  };
  while (stack.length) {
    const file = await resolveFile(stack.pop());
    if (!file || reached.has(file)) continue;
    const text = await fs.readFile(file, 'utf8');
    reached.add(file);
    for (const m of text.matchAll(specifiers)) stack.push(path.resolve(path.dirname(file), m[1] ?? m[2]));
  }
  const reachedAreas = new Set([...reached].map(file => path.relative(GENERATED, file)).filter(rel => !rel.startsWith('..')).map(rel => rel.split(path.sep)[0]));
  const hostImported = new Set();
  for (const file of hostFiles)
    for (const m of (await fs.readFile(path.join(ROOT, 'src', file), 'utf8')).matchAll(/from ["']\.\/generated\/([^/"']+)\//g)) hostImported.add(m[1]);
  const declared = new Set();
  // A D1 declaration is a linkedAreas entry or an import of kind 'linked' (the manifest field that names the linked
  // graph varies by generator: linkedAreas, linkedGraphs, …; every linked import carries kind 'linked').
  for (const area of reachedAreas) {
    const m = await manifestOf(area);
    for (const name of linkedNames(m)) declared.add(name);
    for (const mod of m?.modules ?? []) for (const i of mod.imports ?? [])
      if (i.kind === 'linked' && /^\.\.\/[^/]+\//.test(i.from ?? '')) declared.add(i.from.split('/')[1]);
  }
  for (const area of reachedAreas) if (area.endsWith('-v4'))
    assert.ok(hostImported.has(area) || declared.has(area), `${area} is reached from src/main.jsx without a host import or a D1 declaration`);
  for (const area of ['chat-export-v4', 'chat-projects-v4', 'sessions-page-v4']) {
    assert.ok(hostImported.has(area) && linking.has(area), `${area}: production linker of cowork-scheduled-v4`);
    assert.ok(reachedAreas.has(area), `${area} is reached from src/main.jsx`);
  }
  assert.ok(reachedAreas.has('cowork-scheduled-v4'), 'reached through the production linkers');
});

test('D46 lifted (cds-core wave 5b): the former blockers are cds-core publicNames, check passes, and none is cut here', async () => {
  const written = await extractCoworkScheduled({ check: true, version: V4 });
  assert.equal(written.referenceVersion, V4);
  const core = await readJson('cds-core/manifest.json');
  const published = new Map(Object.entries(core.publicNames).map(([name, e]) => [`${e.file}#${e.local}`, name]));
  assert.deepEqual(['vendor-frame-BckkO60Y.js#Xl', 'vendor-frame-BckkO60Y.js#Kr', 'shared-frame-CJdE5Ria.js#WP'].map(k => published.get(k)),
    ['microtaskBatchQueue', 'backdropFilterSupport', 'CdsCoachMark']);
  const manifest = await readJson('cowork-scheduled-v4/manifest.json');
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.modules.length, 67);
  for (const m of manifest.modules) assert.equal(sha(await fs.readFile(path.join(OUT, m.target))), m.sha256, m.target);
  const cut = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const key of ['vendor-frame-BckkO60Y.js#Xl', 'vendor-frame-BckkO60Y.js#Kr', 'shared-frame-CJdE5Ria.js#WP']) assert.ok(!cut.has(key), `${key} is not cut here`);
  // The coachmark the code/local toggle (c97b955f1 Ui) renders is cds-core's.
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.via === 'shared-frame-CJdE5Ria.js#WP').map(i => [m.target, i.kind, i.from])),
    [['c97b955f1-7qm6xzAi.mjs', 'shared-graph', '../cds-core/shared-frame.mjs']]);
});

test('rehearsal: the 4.16336.0 graph keeps the semantic index names and host class strings of the production graph', async () => {
  const { manifest, files, stateConflicts, unboundGlobals } = rehearsal;
  assert.deepEqual(stateConflicts.map(c => c.binding), contracts[V4].blockedByD46);
  assert.deepEqual(unboundGlobals, []);
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.routinesShared, 'routines-shared-v4');
  assert.deepEqual(Object.keys(manifest.publicNames).sort(), Object.keys(legacy.publicNames).sort());
  assert.deepEqual(Object.fromEntries(Object.entries(manifest.literals).map(([k, v]) => [k, v.value])),
    Object.fromEntries(Object.entries(legacy.literals).map(([k, v]) => [k, v.value])));
  // The CDS roots come from cds-core, the card menu and the scheduled copy from routines-shared-v4, the rest are cut here.
  for (const name of ['Pictogram', 'CdsField', 'CdsFieldLabel', 'CdsFieldDescription', 'CdsFieldError', 'CdsTextArea']) assert.ok(manifest.publicNames[name].cdsCore, name);
  assert.equal(manifest.publicNames.ScheduledTaskMenu.routinesShared, 'shared-18-Cfqwgjc5.mjs');
  assert.equal(manifest.publicNames.SCHEDULED_TASK_COPY.routinesShared, 'shared-140-DfG6VwpK.mjs');
  assert.match(files['index.mjs'], /export \{ CdsPictogram as Pictogram \} from "\.\.\/cds-core\/shared-183\.mjs";/);
  assert.match(files['index.mjs'], /export \{ SY as ScheduledTaskMenu \} from "\.\.\/routines-shared-v4\/shared-18-Cfqwgjc5\.mjs";/);
  for (const [name, text] of Object.entries(files)) {
    if (!name.endsWith('.mjs')) continue;
    assert.doesNotMatch(text, /\.\.\/view-tabs\/|\.\.\/routines-shared\/|3\.6556\.2/, name);
    if (name !== 'index.mjs') assert.match(text, /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /, name);
  }
  for (const m of manifest.modules) assert.equal(sha(await fs.readFile(path.join(official4.ionSource, m.source))), m.sourceSha256, m.target);
});

test('rehearsal D1: every binding routines-shared-v4 holds is imported from it (hash-pinned), cds-core links are hash-pinned', async () => {
  const { manifest } = rehearsal;
  const rs = await readJson('routines-shared-v4/manifest.json');
  const rsHeld = new Map(rs.modules.flatMap(m => m.bindings.map(b => [`${m.source}#${b.name}`, { target: m.target, sha256: b.sha256 }])));
  const cut = manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`));
  assert.deepEqual(cut.filter(k => rsHeld.has(k)), [], 'no second copy of a routines-shared-v4 binding');
  const core = await readJson('cds-core/manifest.json');
  const coreHeld = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`, typeof b === 'string' ? null : b.sha256])));
  let rsLinks = 0, coreLinks = 0;
  for (const m of manifest.modules) for (const i of m.imports) {
    if (i.kind === 'routines-shared') { rsLinks++; assert.equal(i.linkedSha256, rsHeld.get(i.via).sha256, i.via); assert.equal(i.from, `../routines-shared-v4/${rsHeld.get(i.via).target}`, i.via); }
    if (i.kind === 'shared-graph') { coreLinks++; assert.equal(i.linkedSha256, coreHeld.get(i.via), i.via); assert.match(i.from, /^\.\.\/cds-core\//, i.via); }
    // cds-core wave 8: the only cds-core host boundary this graph reaches is shared-0 Ru (the official GrowthBook isOn,
    // answered by host-growthbook through the adapter); vendor-frame i is no longer reached (was: every one of them
    // ['vendor-frame-BckkO60Y.js#i', '../../cds-core-adapter.mjs', 'loadHostReact']).
    if (i.kind === 'cds-core-adapter') assert.deepEqual([i.via, i.from, i.name], ['shared-0-CnnWnVrT.js#Ru', '../../cds-core-adapter.mjs', 'hostGrowthBookIsOn']);
  }
  assert.ok(rsLinks > 100 && coreLinks > 50, `${rsLinks} routines-shared-v4 / ${coreLinks} cds-core links`);
  // Module bytes of everything linked are pinned (a regeneration there requires a rerun here).
  for (const [key, digest] of Object.entries(manifest.linkedGraphModules)) assert.equal(sha(await fs.readFile(path.join(GENERATED, key))), digest, key);
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules)) assert.equal(sha(await fs.readFile(path.join(GENERATED, 'cds-core', target))), digest, target);
  assert.deepEqual(manifest.linkedAreas, ['routines-shared-v4', 'code-routines-v4']);
  // D1 (wave 5b): the seven module states this graph shares with code-routines-v4 are imported from there, hash-pinned,
  // never cut here.
  const linkedGraphs = contracts[V4].linkedGraphs;
  // cds-core wave 8 (W8-M4): shared-2 wH is published by cds-core (store_shared2_wH) and linked from there, hash-pinned
  // (was: one more code-routines-v4 link 'shared-2-CsjIBQD8.js#wH').
  // cds-core wave 8s (W8S-M4): shared-7 iI / nI / rI / TI are published by cds-core (settings_shared7_*) and linked from there
  // (W8S-T3; was: four more code-routines-v4 links 'shared-7-D2e77H6v.js#TI', '#iI', '#nI', '#rI').
  assert.deepEqual(Object.keys(linkedGraphs).sort(), ['cae55dd08-DePgBnl2.js#s', 'cd8a7d7c0-DuH0T8rm.js#u']);
  for (const local of ['TI', 'iI', 'nI', 'rI']) {
    const via = `shared-7-D2e77H6v.js#${local}`, links = manifest.modules.flatMap(m => m.imports).filter(i => i.via === via);
    assert.ok(links.length > 0 && links.every(i => i.kind === 'shared-graph' && i.from === '../cds-core/shared-7.mjs' && i.linkedSha256 === coreHeld.get(via)), `${via} from cds-core`);
  }
  const wH = manifest.modules.flatMap(m => m.imports).filter(i => i.via === 'shared-2-CsjIBQD8.js#wH');
  assert.ok(wH.length > 0 && wH.every(i => i.kind === 'shared-graph' && i.from === '../cds-core/shared-2.mjs' && i.linkedSha256 === coreHeld.get(i.via)), 'shared-2 wH from cds-core');
  const cr = await readJson('code-routines-v4/manifest.json');
  const crHeld = new Map(cr.modules.flatMap(m => m.bindings.map(b => [`${m.source}#${b.name}`, { target: m.target, sha256: b.sha256 }])));
  const viaLinked = new Set();
  for (const m of manifest.modules) for (const i of m.imports) if (i.kind === 'linked-graph') {
    const link = linkedGraphs[i.via];
    assert.ok(link, `${m.target} ${i.via} is a contract link`);
    assert.equal(link.area, 'code-routines-v4', i.via);
    assert.equal(i.from, `../code-routines-v4/${crHeld.get(i.via)?.target}`, i.via);
    assert.equal(i.linkedSha256, crHeld.get(i.via).sha256, i.via);
    viaLinked.add(i.via);
  }
  assert.deepEqual([...viaLinked].sort(), Object.keys(linkedGraphs).sort());
  for (const key of Object.keys(linkedGraphs)) assert.ok(!cut.includes(key), `${key} is not cut again`);
  // No context this graph copies is one cds-core or routines-shared-v4 holds.
  for (const key of manifest.contexts) assert.ok(!coreHeld.has(key) && !rsHeld.has(key), key);
});

test('rehearsal adapters: the host answers stay the 3.6556.2 ones (same names, same overrides), all exported today', async () => {
  const { manifest } = rehearsal;
  const byName = new Map();
  for (const a of manifest.adapters) byName.set(a.name, [...(byName.get(a.name) ?? []), a]);
  // Every 3.6556.2 adapter name is still answered (the 4.16336.0 originals they replace are pinned by features).
  // cds-core wave 8 (W8-M1, W7-D3 ruling (a)): trackEvent (shared-0 H) and reportError (shared-0 qB) are no longer host
  // answers here: cds-core publishes the official ones (o11y_shared0_H / o11y_shared0_qB) and this graph links them,
  // hash-pinned (was: every legacy name, RouterLink aside, is an adapter name).
  const fromCore = new Map([['trackEvent', 'shared-0-CnnWnVrT.js#H'], ['reportError', 'shared-0-CnnWnVrT.js#qB']]);
  const imports = manifest.modules.flatMap(m => m.imports);
  for (const { name } of legacy.adapters) {
    if (fromCore.has(name)) {
      assert.ok(!byName.has(name), `adapter ${name} is gone`);
      const links = imports.filter(i => i.via === fromCore.get(name));
      assert.ok(links.length > 0 && links.every(i => i.kind === 'shared-graph' && i.from === '../cds-core/shared-0.mjs'), `${name} is linked from cds-core`);
      continue;
    }
    assert.ok(byName.has(name) || name === 'RouterLink', `adapter ${name}`);
  }
  // This graph keeps answering the CoworkScheduledTasks bridge and the Cowork model catalog itself, as in 3.6556.2.
  assert.deepEqual(byName.get('CoworkScheduledTasks').map(a => a.original), ['shared-0-CnnWnVrT.js#ek']);
  assert.ok(contracts[V4].adapters['shared-0-CnnWnVrT.js'].ek.overridesShared);
  assert.deepEqual(byName.get('useCoworkModelCatalog').map(a => a.original), ['shared-1-D1bGaTaN.js#R1']);
  // RouterLink (now reached from ccd3f68fe) is the routines-shared host adapter of that name.
  assert.deepEqual(byName.get('RouterLink'), [{ original: 'shared-25-D-aF0gt9.js#Ky', name: 'RouterLink', module: 'src/source-routines-shared-adapters.jsx' }]);
  const own = await fs.readFile(path.join(ROOT, 'src/source-routine-cowork-adapters.jsx'), 'utf8');
  for (const m of manifest.modules) for (const i of m.imports) if (i.kind === 'adapter') assert.match(own, new RegExp(`export (?:async )?(?:function|const|let|var) ${i.name.replace(/\$/g, '\\$')}\\b|export \\{[^}]*\\b${i.name}\\b`), i.name);
});

test('fail fast: a root whose features no longer locate a unique 4.16336.0 declaration stops generation', async () => {
  const base = contracts[V4];
  const variant = (file, local, features) => ({ ...base, roots: { ...base.roots, [file]: { ...base.roots[file], [local]: { ...base.roots[file][local], features } } } });
  await assert.rejects(extractCoworkScheduled({ check: true, version: V4, contract: variant('ccd3f68fe-D3_oyEUp.js', 'zl', ['id: "no_such_template",']) }), /root ccd3f68fe-D3_oyEUp\.js#zl \(SCHEDULED_TASK_TEMPLATES\) lacks/);
  await assert.rejects(extractCoworkScheduled({ check: true, version: V4, contract: variant('ccd3f68fe-D3_oyEUp.js', 'Wl', ['let $ = J9(']) }), /root ScheduledTaskTemplateCard: root Wl is not the unique declaration/);
  await assert.rejects(extractCoworkScheduled({ check: false, version: V4, contract: base }), /contract variant runs with check: true only/);
});
