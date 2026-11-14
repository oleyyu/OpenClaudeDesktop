// Region batch 3 (4.16336.0 migration): session-rail-kit keeps its 3.6556.2 production graph byte for byte (the region
// plan's 15 consumers, cutover.oldConsumersAtGeneration, and mcp-app-host import it) and gains a staged isolated 4.16336.0 graph,
// src/generated/session-rail-kit-v4, cut by the same generator (scripts/extract-session-rail-kit.mjs --version 4.16336.0,
// contract scripts/extract-session-rail-kit-v4.mjs) from the frozen snapshot over cds-core, linking routines-shared-v4 and
// files-changes-v4 (D1 owners). Source only: generator output, official chunk text and Vite SSR; no browser, no network,
// a Map-backed localStorage stub.
//
// The one new host adapter (shared-123 kB, useServerGatedFeature) is exported by src/source-session-rail-kit-adapters.jsx
// (session-page lane; it replaces the region folder's fixed-false patch with kB's two legs: the host GrowthBook table AND
// the server gate, which this host never loads); the SSR here loads the host file as it is.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { contractVersions, extractSessionRailKitVersion } from '../scripts/extract-session-rail-kit.mjs';
import { contract, extractSessionRailKitV4, legacyConsumers, legacyConsumersOutsidePlan, planConsumers } from '../scripts/extract-session-rail-kit-v4.mjs';
import * as official4 from '../scripts/official-4.16336.0.mjs';

const app = path.resolve(import.meta.dirname, '..');
const OUT = path.join(app, 'src/generated/session-rail-kit-v4');
const LEGACY = path.join(app, 'src/generated/session-rail-kit');
const REGION = path.resolve(app, '../analysis/claude-4.16336.0-migrate-20261104/regions/batch3/session-rail-kit');
const ADAPTERS = path.join(app, 'src/source-session-rail-kit-adapters.jsx');
const V4 = official4.referenceVersion;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const officialText = name => fs.readFileSync(path.join(official4.ionSource, name), 'utf8');
const h = React.createElement;
const render = node => renderToStaticMarkup(node);

const storage = new Map();
let server, K, Adapters, manifest, previousWindow, previousDocument;
before(async () => {
  manifest = await extractSessionRailKitV4({ check: true });
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // W8 stub contract (design class c): cds-core now holds shared-0 CQ/Wo, which read document.cookie at load (as in the app).
  // W8 stub contract (design class c): cds-core now holds shared-92 cS, which reads documentElement.hasAttribute at load.
  globalThis.document = { cookie: '', createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }), querySelector: () => null, querySelectorAll: () => [],
    head: { appendChild() {} }, documentElement: { hasAttribute: () => false, getAttribute: () => null, dataset: {} }, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { localStorage: { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => { storage.set(k, String(v)); }, removeItem: k => { storage.delete(k); } },
    matchMedia: undefined, addEventListener() {}, removeEventListener() {}, location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' } };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  K = await server.ssrLoadModule('/src/generated/session-rail-kit-v4/index.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-kit-adapters.jsx');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

test('two source contracts: 3.6556.2 production (byte for byte as before batch 3) and the staged 4.16336.0 graph, both --check', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', V4]);
  const legacy = await extractSessionRailKitVersion({ version: '3.6556.2', check: true });
  assert.equal(legacy.referenceVersion, '3.6556.2');
  const before = new Map(fs.readFileSync(path.join(REGION, 'before/legacy-sha256.txt'), 'utf8').trim().split('\n').map(l => l.trim().split(/\s+/).reverse()));
  assert.deepEqual(fs.readdirSync(LEGACY).sort(), [...before.keys()].sort());
  for (const [name, hash] of before) assert.equal(sha(fs.readFileSync(path.join(LEGACY, name))), hash, name);
  assert.equal(manifest.referenceVersion, V4);
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.sharedGraphManifestSha256, sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))));
  assert.deepEqual(Object.keys(manifest.linkedAreas), ['files-changes-v4', 'routines-shared-v4']);
  for (const [area, hash] of Object.entries(manifest.linkedAreas)) assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), hash, area);
  // code-current-v4 is pending until code-current:base is delivered (its batch 3 region report exists; the output folder alone
  // may still be mid-generation). From then on its names must be linked, not cut here: this test fails and so does generation.
  assert.deepEqual(Object.keys(manifest.pendingLinks), ['code-current-v4']);
  assert.deepEqual(Object.keys(manifest.pendingLinkDelivery), ['code-current-v4']);
  const delivered = fs.existsSync(path.resolve(app, manifest.pendingLinkDelivery['code-current-v4']));
  assert.ok(!(delivered && fs.existsSync(path.join(app, 'src/generated/code-current-v4/manifest.json'))), 'code-current:base is delivered: move pendingLinks code-current-v4 to linkedAreas and rerun');
  assert.deepEqual(manifest.contractFreshness.pendingDelivered, []);
  // Legacy consumers: the region plan's 15 plus mcp-app-host (its 3.6556.2 output imports isPlainObject from the legacy
  // folder; the plan turned that edge into resliceInsteadOfLink for its 4.16336.0 output). Every importer is listed.
  assert.deepEqual(manifest.isolatedGraph, { productionOutput: 'src/generated/session-rail-kit', productionSwitchNotBeforeBatch: 11, heldBy: [...legacyConsumers],
    outsidePlan: { ...legacyConsumersOutsidePlan } });
  assert.deepEqual(planConsumers, ['chat-side-chat', 'code-current:upper', 'code-transcript', 'composer-notices', 'cowork-approval', 'cowork-live', 'effort-control',
    'pierre-changes', 'proposal-group', 'session-rail', 'session-rail-changes', 'session-rail-context', 'session-rail-sections', 'sidebar-hover-card', 'transcript-rows']);
  assert.deepEqual(Object.keys(legacyConsumersOutsidePlan), ['mcp-app-host']);
  assert.equal(legacyConsumers.length, 16);
  const importers = fs.readdirSync(path.join(app, 'src/generated'), { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== 'session-rail-kit')
    .map(e => e.name).filter(dir => fs.readdirSync(path.join(app, 'src/generated', dir)).some(f => /\.(?:m?js|jsx)$/.test(f)
      && /from\s*["']\.\.\/session-rail-kit\//.test(fs.readFileSync(path.join(app, 'src/generated', dir, f), 'utf8')))).sort();
  assert.deepEqual(manifest.contractFreshness.legacyImporters, importers);
  const listed = new Set(legacyConsumers.map(c => c.split(':')[0]));
  for (const dir of importers) assert.ok(listed.has(dir), `${dir} imports ../session-rail-kit/ but is not a listed legacy consumer`);
  assert.deepEqual(fs.readdirSync(OUT).sort(), [...manifest.modules.map(m => m.target), 'index.mjs', 'manifest.json'].sort());
});

test('modules: original 4.16336.0 bindings only, bytes and source chunks pinned, no 3.6556.2 graph imported', () => {
  const allowed = /^(?:\.\/|\.\.\/cds-core\/|\.\.\/routines-shared-v4\/|\.\.\/files-changes-v4\/|\.\.\/\.\.\/source-session-rail-kit-adapters\.jsx$|\.\.\/\.\.\/source-routines-shared-adapters\.jsx$|react(?:-dom|\/jsx-runtime|\/compiler-runtime)?$)/;
  for (const m of manifest.modules) {
    assert.equal(m.referenceVersion, V4, m.target);
    const text = fs.readFileSync(path.join(OUT, m.target), 'utf8');
    assert.equal(sha(text), m.sha256, m.target);
    assert.equal(sha(fs.readFileSync(path.join(official4.ionSource, m.source))), m.sourceSha256, m.target);
    assert.match(text, /^\/\/ Original Claude Desktop 4\.16336\.0 (?:bindings from|chunk) /, m.target);
    assert.doesNotMatch(text, /3\.6556\.2|\.\.\/view-tabs\/|\.\.\/code-current\/|\.\.\/session-rail-kit\//, m.target);
    for (const [, from] of text.matchAll(/^import\s[^;]*?from\s"([^"]+)";/gms)) assert.match(from, allowed, `${m.target} imports ${from}`);
    const src = officialText(m.source);
    for (const b of m.bindings) assert.ok(src.includes(`${b.name}`), `${m.target} ${b.name}`);
  }
  const index = fs.readFileSync(path.join(OUT, 'index.mjs'), 'utf8');
  for (const name of Object.keys(manifest.publicNames)) assert.match(index, new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`), name);
});

// round3 legacy-prep #4: the old assertion was a staging-time snapshot of the linkers (none). Under D1 every 4.16336.0
// region that shares a binding this graph holds links it through manifest.linkedAreas, so the linker set grows; what the
// test guards is the isolation, now an invariant derived from the manifests (stricter than the file-name check): only
// staged or production-switched 4.16336.0 graphs link session-rail-kit-v4, each by a D1 declaration; no host file imports
// it; every 4.16336.0 graph src/main.jsx reaches is one a host file imports or one a reached graph declares (no undeclared
// path); and the 16 legacy consumers stay on the 3.6556.2 src/generated/session-rail-kit.
test('only 4.16336.0 graphs link session-rail-kit-v4, each by a D1 declaration; no host import, no undeclared path from src/main.jsx; the 16 legacy consumers stay on 3.6556.2', () => {
  const SRC = path.join(app, 'src'), GENERATED = path.join(SRC, 'generated');
  const readJson = rel => { try { return JSON.parse(fs.readFileSync(path.join(GENERATED, rel), 'utf8')); } catch { return null; } };
  const linkedNames = m => { const la = m?.linkedAreas; return !la ? [] : Array.isArray(la) ? la.map(e => typeof e === 'string' ? e : e.area) : Object.keys(la); };
  // (5) No src/ file outside src/generated names the folder.
  const hostLinking = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { if (file !== GENERATED && entry.name !== 'node_modules') walk(file); continue; }
      if (/\.(?:m?js|jsx)$/.test(entry.name) && fs.readFileSync(file, 'utf8').includes('session-rail-kit-v4/')) hostLinking.push(path.relative(app, file));
    }
  };
  walk(SRC);
  // 4.16336.0 rail cutover (2026-11-13): source-session-rail.jsx provides the v4 RailFlatContext (shared-18 iw) around
  // the v4 SessionRail body; it is the one host importer, and it imports only that context.
  assert.deepEqual(hostLinking, ['src/source-session-rail.jsx'], 'only the rail host imports session-rail-kit-v4');
  assert.match(fs.readFileSync(path.join(SRC, 'source-session-rail.jsx'), 'utf8'), /import \{ RailFlatContext as RailFlatContextV4 \} from "\.\/generated\/session-rail-kit-v4\/index\.mjs";/);
  // (1)-(3) The linkers: non-empty, all 4.16336.0, each declaring the graph in linkedAreas, every import of it kind 'linked'.
  const linking = new Set();
  for (const area of fs.readdirSync(GENERATED)) {
    const dir = path.join(GENERATED, area);
    if (dir === OUT || !fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir))
      if (/\.m?js$/.test(name) && fs.readFileSync(path.join(dir, name), 'utf8').includes('../session-rail-kit-v4/')) linking.add(area);
  }
  assert.ok(linking.size > 0, 'D1 linkers exist');
  for (const area of linking) {
    const m = readJson(`${area}/manifest.json`);
    assert.equal(m?.referenceVersion, V4, `${area} is a 4.16336.0 graph`);
    assert.ok(linkedNames(m).includes('session-rail-kit-v4'), `${area} declares session-rail-kit-v4 in linkedAreas`);
    for (const mod of m.modules) for (const i of mod.imports ?? [])
      if (/\.\.\/session-rail-kit-v4\//.test(i.from ?? '')) assert.equal(i.kind, 'linked', `${area}/${mod.target} -> ${i.from}`);
  }
  // The 16 legacy consumers (isolatedGraph.heldBy) are 3.6556.2 graphs and none of them links the 4.16336.0 folder.
  assert.equal(legacyConsumers.length, 16);
  for (const area of new Set(legacyConsumers.map(c => c.split(':')[0]))) assert.ok(!linking.has(area), `${area} (legacy consumer) stays on src/generated/session-rail-kit`);
  // (4) The static relative import closure of src/main.jsx (extensions as Vite resolves them).
  const resolveFile = spec => {
    for (const candidate of [spec, ...['.jsx', '.mjs', '.js'].map(ext => spec + ext), ...['index.jsx', 'index.mjs', 'index.js'].map(name => path.join(spec, name))])
      if (/\.(m?js|jsx)$/.test(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    return null;
  };
  const specifiers = /(?:import|export)\s*(?:[^'"]*?from\s*)?["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;
  const reached = new Set(), stack = [path.join(SRC, 'main.jsx')];
  while (stack.length) {
    const file = resolveFile(stack.pop());
    if (!file || reached.has(file)) continue;
    reached.add(file);
    for (const m of fs.readFileSync(file, 'utf8').matchAll(specifiers)) stack.push(path.resolve(path.dirname(file), m[1] ?? m[2]));
  }
  const reachedAreas = new Set([...reached].map(file => path.relative(GENERATED, file)).filter(rel => !rel.startsWith('..')).map(rel => rel.split(path.sep)[0]));
  const hostImported = new Set();
  for (const file of fs.readdirSync(SRC).filter(file => /\.(m?js|jsx)$/.test(file)))
    for (const m of fs.readFileSync(path.join(SRC, file), 'utf8').matchAll(/from ["']\.\/generated\/([^/"']+)\//g)) hostImported.add(m[1]);
  const declared = new Set();
  for (const area of reachedAreas) {
    const m = readJson(`${area}/manifest.json`);
    for (const name of linkedNames(m)) declared.add(name);
    for (const mod of m?.modules ?? []) for (const i of mod.imports ?? [])
      if (i.kind === 'linked' && /^\.\.\/[^/]+\//.test(i.from ?? '')) declared.add(i.from.split('/')[1]);
  }
  for (const area of reachedAreas) if (area.endsWith('-v4'))
    assert.ok(hostImported.has(area) || declared.has(area), `${area} is reached from src/main.jsx without a host import or a D1 declaration`);
  // Reached at all only through a reached linker's declaration.
  if (reachedAreas.has('session-rail-kit-v4'))
    assert.ok([...linking].some(area => reachedAreas.has(area)), 'session-rail-kit-v4 is reached only through a reached D1 linker');
});

test('links: cds-core publicNames and the linked areas by declaration hash; pinned module bytes are current', () => {
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const coreHeld = new Map(core.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name ?? b}`, b.sha256])));
  const imports = manifest.modules.flatMap(m => m.imports);
  const shared = imports.filter(i => i.kind === 'shared-graph');
  assert.ok(shared.length > 0);
  for (const i of shared) assert.equal(i.linkedSha256, coreHeld.get(i.via), i.via);
  const linked = imports.filter(i => i.kind === 'linked');
  const held = new Map();
  for (const area of Object.keys(manifest.linkedAreas)) {
    const m = JSON.parse(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'), 'utf8'));
    for (const mod of m.modules) for (const b of mod.bindings) held.set(`${area}|${path.basename(mod.source)}#${b.name}`, b.sha256);
  }
  for (const i of linked) {
    const area = i.from.split('/')[1];
    assert.equal(i.linkedSha256, held.get(`${area}|${i.via}`), i.via);
  }
  // D1 owners: the panels icon size context (shared-120 Ke via qe) from routines-shared-v4. The breadcrumb head cut and its
  // measure state (ce574895a _, h / m / c / s) came from files-changes-v4 until cds-core wave 5b, which holds the chunk and
  // publishes the hook (useHeadTruncationCut): it is a cds-core link now, by declaration hash.
  const vias = new Set(linked.map(i => i.via));
  for (const via of ['shared-120-DCdTP1_5.js#qe', 'shared-62-DoCqVpIq.js#zI']) assert.ok(vias.has(via), via);
  assert.ok(!vias.has('ce574895a-AyUKk43x.js#_'), 'the head cut is no longer a files-changes-v4 link');
  assert.deepEqual(shared.filter(i => i.via.startsWith('ce574895a-')).map(i => [i.name, i.from]), [['_', '../cds-core/ce574895a.mjs']]);
  assert.deepEqual(core.publicNames.useHeadTruncationCut, { file: 'ce574895a-AyUKk43x.js', local: '_', target: 'ce574895a.mjs', exportName: '_' });
  assert.ok(!manifest.modules.some(m => m.source === 'ce574895a-AyUKk43x.js' || m.source === 'shared-120-DCdTP1_5.js'), 'D1: not re-cut here');
  for (const [target, hash] of Object.entries(manifest.sharedGraphModules)) assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core', target))), hash, target);
  for (const [target, hash] of Object.entries(manifest.linkedGraphModules)) assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', target))), hash, target);
  // Contexts cut here are owned here (no other graph holds them).
  assert.ok(manifest.contexts.includes('cdbb20c70-MNoYKqNP.js#O') && manifest.contexts.includes('cc43287c9-dzfX-J5i.js#eq'));
});

test('adapters: the host answers pinned by features; kB (useServerGatedFeature) is new: the host GrowthBook table AND the server gate', async () => {
  assert.deepEqual(manifest.adapters.map(a => a.name), ['useIntl', 'FormattedMessage', 'useSessionPresetsFlat', 'useGithubSyncEnabled', 'useServerGatedFeature', 'RegionEntry',
    'logLocalPrMenuAction', 'logRailSectionEvent', 'logRailTogglePressed', 'paneLayoutStore', 'panesOfMode', 'sessionRailLazyHandle']);
  assert.deepEqual(manifest.sharedAdapters, [{ original: 'shared-62-DoCqVpIq.js#rP', name: 'useErrors' }]);
  const host = fs.readFileSync(ADAPTERS, 'utf8');
  for (const { name } of manifest.adapters) {
    const exported = new RegExp(`export (?:function|const) ${name}\\b|export \\{[^}]*\\bas ${name}\\b`).test(host);
    assert.ok(exported, name);
  }
  const { hostGrowthBookFlag } = await server.ssrLoadModule('/src/host-growthbook.mjs');
  // shared-55 Yz's key: absent from the host table (3P bootstrap Wbn), and no server gate: off.
  assert.equal(hostGrowthBookFlag('__gb__428353835'), false);
  assert.equal(Adapters.useServerGatedFeature('__gb__428353835'), false);
  // kB is `AB(e) && V(e)`: a key the host GrowthBook table turns on is still off without its server gate (this host has
  // no boot configuration serverGateNames and never loads the server gate store hu, so NB is undefined and AB false).
  assert.equal(hostGrowthBookFlag('__gb__3525173228'), true);
  assert.equal(Adapters.useServerGatedFeature('__gb__3525173228'), false);
  const s123src = officialText('shared-123-1Hc1RTKl.js');
  for (const piece of ['function AB(e){return NB(e)===!0}', 'function MB(e,t){']) assert.ok(s123src.includes(piece), piece);
  const s123 = officialText('shared-123-1Hc1RTKl.js');
  assert.ok(s123.includes('function kB(e){let t=AB(e);return V(e)&&t}'));
  assert.ok(officialText('shared-55-BRv2XBP7.js').includes('function Yz(){return Mr("__gb__428353835")}'));
});

test('roots: unique in their chunk; a stale feature or a vague one stops generation; a variant never writes', async () => {
  const stale = structuredClone(contract.roots);
  stale.railFit.features = [...stale.railFit.features, 'return bw(e, yw, 771);'];
  await assert.rejects(extractSessionRailKitV4({ check: true, contract: { ...contract, roots: stale } }), /railFit/);
  const vague = structuredClone(contract.roots);
  vague.isPlainObject.features = ['return'];
  await assert.rejects(extractSessionRailKitV4({ check: true, contract: { ...contract, roots: vague } }), /isPlainObject/);
  await assert.rejects(extractSessionRailKitV4({ contract }), /check: true only/);
});

test('absent / deferred / unrooted: evidence recorded; the deferred shell roots are pinned by declaration hash', () => {
  assert.deepEqual(Object.keys(manifest.absent).sort(), Object.keys(contract.absent).sort());
  assert.deepEqual(Object.keys(manifest.deferred).sort(), ['SessionRailDockedColumn', 'SessionRailOverlay']);
  const cc43 = officialText('cc43287c9-dzfX-J5i.js');
  assert.ok(cc43.includes('PrBarSlot:'));
  for (const d of Object.values(manifest.deferred)) assert.equal(d.file, 'cc43287c9-dzfX-J5i.js');
  assert.deepEqual(Object.keys(manifest.unrooted), ['pickFields']);
  assert.ok(!('SessionRailDockedColumn' in manifest.publicNames) && !('SessionRailOverlay' in manifest.publicNames));
});

test('D1 / D46: survey clean; no module state is held elsewhere (the logger tag Set is the cds-core link loggerTags)', async () => {
  const log = console.log;
  console.log = () => {}; // the survey prints its report lines
  const survey = await extractSessionRailKitV4({ survey: true }).finally(() => { console.log = log; });
  assert.deepEqual(survey.problems, []);
  assert.deepEqual(survey.stateConflicts, []);
  // Since cds-core wave 5 (region-changes session-rail-kit.d1Pending.Pc) shared-0 Pc is the publicName loggerTags, linked.
  assert.deepEqual(survey.d1Pending.filter(d => d.areas.length).map(d => d.binding), []);
  assert.deepEqual(manifest.d1Pending, []);
  assert.deepEqual(contract.d1Pending, {});
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  assert.deepEqual(core.publicNames.loggerTags, { file: 'shared-0-CnnWnVrT.js', local: 'Pc', target: 'shared-0.mjs', exportName: 'Pc' });
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.via === 'shared-0-CnnWnVrT.js#Pc').map(i => [m.target, i.kind, i.from])),
    [['shared-0-CnnWnVrT.mjs', 'shared-graph', '../cds-core/shared-0.mjs']]);
  assert.ok(!manifest.modules.some(m => m.source === 'shared-0-CnnWnVrT.js' && m.bindings.some(b => b.name === 'Pc')), 'Pc is not cut here');
  // A stale d1Pending entry stops generation (fail closed).
  await assert.rejects(extractSessionRailKitV4({ check: true, contract: { ...contract, d1Pending: { 'shared-0-CnnWnVrT.js#Pc': 'stale' } } }),
    /d1Pending shared-0-CnnWnVrT\.js#Pc is no longer module state cut here and elsewhere; remove it/);
});

test('fail-stop contract freshness: an unlisted legacy importer stops generation; a delivered pending link is reported (and stops writes)', async () => {
  const withoutHost = { ...contract.isolatedGraph, heldBy: legacyConsumers.filter(c => c !== 'mcp-app-host') };
  await assert.rejects(extractSessionRailKitV4({ check: true, contract: { ...contract, isolatedGraph: withoutHost } }),
    /mcp-app-host imports \.\.\/session-rail-kit\/ but is not in isolatedGraph\.heldBy/);
  await assert.rejects(extractSessionRailKitV4({ check: true, contract: { ...contract, pendingLinkDelivery: {} } }), /pendingLinks code-current-v4 has no pendingLinkDelivery report/);
  // Probe delivery with a report that exists (this region's own folder): the survey reports it as a problem.
  const log = console.log, warn = console.warn;
  console.log = () => {}; console.warn = () => {};
  const probe = { ...contract, pendingLinkDelivery: { 'code-current-v4': path.relative(app, path.join(REGION, 'before/legacy-sha256.txt')) } };
  const survey = await extractSessionRailKitV4({ survey: true, contract: probe }).finally(() => { console.log = log; console.warn = warn; });
  if (!fs.existsSync(path.join(app, 'src/generated/code-current-v4/manifest.json'))) { assert.deepEqual(survey.pendingDelivered, []); return; }
  assert.deepEqual(survey.pendingDelivered, ['code-current-v4']);
  assert.ok(survey.problems.some(p => /^pendingLinks code-current-v4: its region is delivered .* move .*environment-name-parts.* to linkedAreas and rerun$/.test(p)), survey.problems.join('\n'));
});

test('fail-stop D46: module state cds-core holds without a publicName stops generation with binding, text and chain', async () => {
  // Probe: shared-frame Bc (the toolbar focus guard teardown) reads Ic, the WeakMap of guarded toolbars; cds-core holds
  // both without a publicName (focusCdsToolbar Vc is published, its state is not).
  const core = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'), 'utf8'));
  const published = new Set(Object.values(core.publicNames).map(e => `${e.file}#${e.local}`));
  const frame = core.modules.find(m => m.target === 'shared-frame.mjs');
  assert.ok(['Bc', 'Ic'].every(n => frame.bindings.some(b => b.name === n)), 'cds-core holds Bc and Ic');
  if (published.has(`${official4.sharedFrame}#Ic`) || published.has(`${official4.sharedFrame}#Bc`)) return; // named by a later wave
  const probe = { probeToolbarGuardTeardown: { at: `${official4.sharedFrame}#Bc`, features: ['let t = Ic.get(e);', 'e.removeEventListener("pointerdown", t.onLeft, !0)'] } };
  const variant = { ...contract, roots: probe, adapters: {}, callSites: [], rawCallSites: [], d1Pending: {}, absent: {}, unrooted: {} };
  const error = await extractSessionRailKitV4({ check: true, contract: variant }).then(() => null, e => e);
  assert.ok(error, 'generation stops');
  assert.match(error.message, /D46/);
  const conflict = error.stateConflicts.find(c => c.binding === `${official4.sharedFrame}#Ic`);
  assert.deepEqual([conflict.kind, conflict.heldBy], ['module WeakMap', 'cds-core/shared-frame.mjs']);
  assert.equal(conflict.text, 'Ic=new WeakMap');
  assert.match(conflict.reachedBy, /Bc/);
});

test('call sites: the composer raise, the ⋮ menu item, the presets gate, the lazy host and the session view wiring are pinned', () => {
  assert.deepEqual(manifest.callSites.map(c => c.binding ?? `${c.source} (raw)`), ['BK', 'hM', 'shared-39-ZCs0lAwB.js (raw)', 'shared-31-C9BqSSuD.js (raw)',
    'cc43287c9-dzfX-J5i.js (raw)', 'cc43287c9-dzfX-J5i.js (raw)', 'cc43287c9-dzfX-J5i.js (raw)', 'cc43287c9-dzfX-J5i.js (raw)']);
  for (const site of manifest.callSites) assert.equal(sha(fs.readFileSync(path.join(official4.ionSource, site.source))), site.sourceSha256, site.source);
  const cc43 = officialText('cc43287c9-dzfX-J5i.js');
  assert.ok(cc43.includes('yn&&!An&&p(BK,{sessionRef:yn,scopeStore:ce,isPanelActive:Vt,readOnly:He||nn,pickersElsewhere:Mn,onRaise:Ln})'));
  assert.ok(officialText('cf74bc599-BytvntCE.js').includes('defaultMessage:"Hide session rail",id:"U0R7oYkTM1"'));
});

test('SSR: section ids with "flask", the 640 / 800 fit, stores and flat released pickers', () => {
  assert.deepEqual(K.RAIL_SECTION_IDS, ['environment', 'goal', 'settings', 'context', 'usage', 'flask', 'connectors', 'progress', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.equal(K.isRailSectionId('flask'), true);
  assert.equal(K.isRailSectionId('nope'), false);
  assert.deepEqual(K.RAIL_SECTIONS_FOLDED_BY_DEFAULT, ['connectors', 'context', 'usage', 'flask']);
  assert.deepEqual(K.railHideableSections(true), ['goal', 'context', 'flask', 'connectors', 'outputs', 'pullRequests', 'servers', 'backgroundTasks']);
  assert.equal(K.RAIL_FIT_ALONE, 640);
  assert.deepEqual([639, 640, 799, 800, 1200].map(width => K.railFit({ width })), ['none', 'alone', 'alone', 'beside-pane', 'beside-pane']);
  assert.deepEqual([...K.FLAT_RELEASED_MENUS], ['model', 'mode', 'permissions', 'effort']);
  assert.equal(K.RAIL_WIDTH_CLASS, 'w-[var(--session-rail-w,17.5rem)]');
  assert.equal(K.RAIL_FLAT_ATTRIBUTE, 'data-session-rail-flat');
  assert.equal(K.RAIL_COLUMN_ATTRIBUTE, 'data-epitaxy-rail-column');
  assert.equal(K.railSectionsStore.persist.getOptions().name, 'epitaxy.sessionRailSections');
  assert.deepEqual([K.sessionRailShownStore.persist.getOptions().name, K.sessionRailShownStore.persist.getOptions().version], ['persisted.epitaxy.sessionRailShown', 1]);
  assert.equal(K.selectRailShown(K.sessionRailShownStore.getState()), true);
  K.sessionRailShownStore.getState().setShown(false);
  assert.deepEqual(JSON.parse(storage.get('persisted.epitaxy.sessionRailShown')), { state: { shown: false }, version: 1 });
  K.sessionRailShownStore.getState().setShown(true);
  const store = { state: { pickerRowMounted: false, openComposerMenu: null }, getState() { return this.state; }, setState(patch) { this.state = { ...this.state, ...patch }; } };
  const effort = { menu: 'effort' }; store.state.openComposerMenu = effort;
  K.releaseFlatComposerMenu(store, effort);
  assert.equal(store.state.openComposerMenu, null);
  const context = { menu: 'context' }; store.state.openComposerMenu = context;
  K.releaseFlatComposerMenu(store, context);
  assert.equal(store.state.openComposerMenu, context);
});

test('SSR: SessionRailToggle (aria-label "Session rail", flat accent) and BranchChip (mono, head / tail split)', () => {
  const off = render(h(K.SessionRailToggle, { model: { onScreen: false, raises: false, panelId: 'p1', onToggle() {} } }));
  assert.match(off, /aria-label="Session rail"/);
  assert.match(off, /aria-pressed="false"/);
  assert.match(off, /--cds-bg-accent:var\(--cds-fill-ghost-selected\)/);
  assert.doesNotMatch(off, / aria-expanded="/);
  const raised = render(h(K.SessionRailToggle, { model: { onScreen: true, raises: true, panelId: 'p1', onToggle() {} } }));
  assert.match(raised, /aria-pressed="true"/);
  assert.match(raised, /aria-expanded="true"/);
  assert.match(raised, /aria-controls="p1"/);
  const chip = render(h(K.BranchChip, { branchName: 'feature/a-very-long-branch-name-for-the-chip' }));
  assert.match(chip, /aria-label="feature\/a-very-long-branch-name-for-the-chip"/);
  assert.match(chip, /class="relative flex min-w-0 overflow-hidden font-mono-ui"><span class="min-w-\[2em\] truncate">feature\/a-very-long-branch-name-fo<\/span><span class="max-w-\[calc\(100%-2em\)\] shrink-0 truncate">r-the-chip<\/span>/);
});
