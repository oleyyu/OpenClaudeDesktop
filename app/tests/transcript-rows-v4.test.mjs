import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { closeWhenSettled } from './support/vite-ssr-settle.mjs';
import { extractTranscriptRowsV4, ROOTS, ROOT_PINS, STEPS, FOREIGN_OWNERS, CDS_CORE_MANIFEST_SHA256, LINK_SURFACE, PENDING_ROOTS, LINKED_AREAS,
  HOST_ADAPTERS, ADAPTER_PINS, ADAPTER_FILE, CALL_SITES, GATE } from '../scripts/extract-transcript-rows-v4.mjs';

// account2 batch 7, region transcript-rows, steps tr-0 (owners) + tr-1 (verbatim) + tr-2 (semantic link surface) +
// tr-3 (file find / reveal, the turn mark outlet) + tr-4 (the thinking step, the running tool row, the live scope; the
// computed-import proof) + tr-5 (the turnStatusRows gate through working-line-v4, the seven call sites): the 4.16336.0 graph
// (scripts/extract-transcript-rows-v4.mjs -> src/generated/transcript-rows-v4), staged next to the 3.6556.2
// src/generated/transcript-rows the host still renders. Source only: manifest, --check, the official chunk text, the
// verbatim pins against both snapshots, the owner table, and the contexts loaded through Vite SSR.
const app = path.resolve(import.meta.dirname, '..');
const snapshots = path.resolve(app, '../reference/snapshots');
const ion = path.join(snapshots, 'claude-4.16336.0-20261104/ion-dist/assets/v1');
const ionBefore = path.join(snapshots, 'claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const local = rel => fs.readFileSync(path.join(app, rel));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/transcript-rows-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const owners = JSON.parse(local(`${out}/owners.json`));
const pins = JSON.parse(local('scripts/transcript-rows-v4.verbatim-pins.json'));
const previousManifest = JSON.parse(local('src/generated/transcript-rows/manifest.json'));

const linkSurface = JSON.parse(local(`${out}/link-surface.json`));
let server, gen, cdsPaths, morph, editorPrefs, statusRows;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  cdsPaths = await server.ssrLoadModule('/src/generated/cds-core/c856385e2.mjs');
  morph = await server.ssrLoadModule('/src/generated/working-line-v4/morph.mjs');
  editorPrefs = await server.ssrLoadModule('/src/generated/settings-pages-v4/editor-prefs.mjs');
  statusRows = await server.ssrLoadModule('/src/generated/working-line-v4/turn-status-rows.mjs');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-transcript-rows-v4.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(STEPS, ['tr-0', 'tr-1', 'tr-2', 'tr-3', 'tr-4', 'tr-5']);
  assert.deepEqual(provenance.steps, STEPS);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(local('src/generated/cds-core/manifest.json')), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
    // From tr-4 on: a host adapter import is only a pinned HOST_ADAPTERS entry (by its original), from the v4 adapter module.
    for (const imp of mod.imports.filter(i => i.kind === 'adapter')) {
      const chunk = imp.via.includes(':') ? imp.via.split(':')[0] : imp.via.split('#')[0];
      assert.equal(HOST_ADAPTERS[`${chunk}#${imp.original}`]?.name, imp.name, `${mod.target} imports host adapter ${imp.name} (${imp.via})`);
      assert.equal(imp.from, '../../source-transcript-rows-v4-adapters.jsx', mod.target);
    }
  }
  const adapterImports = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${m.target}:${i.name}`)).sort();
  // wave8b (tr-3 k_): the adapters are no longer all imported by group-status.mjs. Was:
  // assert.deepEqual(adapterImports, Object.values(HOST_ADAPTERS).map(a => `group-status.mjs:${a.name}`).sort());
  assert.deepEqual([...new Set(adapterImports.map(i => i.split(':')[1]))].sort(), [...new Set(Object.values(HOST_ADAPTERS).map(a => a.name))].sort());
  assert.deepEqual(adapterImports, [
    'group-status.mjs:sessionActivityEvents', 'group-status.mjs:sessionActivityStore', 'group-status.mjs:useErrors', 'group-status.mjs:useIntl',
    'group-status.mjs:useSessionAwaitsRequest', 'group-status.mjs:useVerboseTranscript',
    'rows-c19e90103.mjs:createHighlightWorker', 'rows-c19e90103.mjs:useIntl', 'rows-c19e90103.mjs:useTerminalInlineRunStore',
    'rows-c425fb3cf.mjs:useIntl', 'rows-cb8c5a88f.mjs:useIntl', 'rows-vendor-intl.mjs:useIntl']);
  await extractTranscriptRowsV4({ check: true });
});

test('tr-0 roots: semantic names, AST-located, pinned; the shape-identical alternatives are told apart', () => {
  const roots = new Map(provenance.roots.map(r => [`${r.file}#${r.local}`, r]));
  for (const [file, rs] of Object.entries(ROOTS)) for (const [name, spec] of Object.entries(rs)) {
    const r = roots.get(`${file}#${name}`);
    assert.ok(r, `${file}#${name}`);
    assert.equal(r.name, spec.name);
    assert.equal(r.pinned, true);
    assert.equal(r.declarationSha256, ROOT_PINS[`${file}#${name}`]);
  }
  // cea7057eb: L and z are both `t(new Map)`; L is the tool-id -> status map ve fills from fe.
  const tasks = fs.readFileSync(path.join(ion, 'cea7057eb-BrXukOIp.js'), 'utf8');
  assert.ok(tasks.includes('L=t(new Map)') && tasks.includes('z=t(new Map)'));
  assert.ok(tasks.includes('s=fe(a),') && tasks.includes('n(L.Provider,{value:s}'));
  assert.ok(tasks.includes('function fe(e){let $=J9(2),t;if(J1($,0,e)){t=new Map;for(let n of e)n.toolUseId&&t.set(n.toolUseId,n.status)'));
  assert.equal(roots.get('cea7057eb-BrXukOIp.js#L').shapeAlternatives, 2);
  assert.ok(roots.get('c856385e2-Cqx37C-b.js#Nt').shapeAlternatives > 1);
  // c856385e2: the path resolver provider is Nt (Mt.Provider), not Ot (Dt.Provider, r3b-transcript-v4's opener).
  const paths = fs.readFileSync(path.join(ion, 'c856385e2-Cqx37C-b.js'), 'utf8');
  assert.ok(paths.includes('Nt=Mt.Provider') && paths.includes('function Pt(){return Q()?.windowsRoot===!0}') && paths.includes('Ot=Dt.Provider'));
  // 3.6556.2 counterparts the old graph exported (same shapes).
  const before = fs.readFileSync(path.join(ionBefore, 'c856385e2-aEyDzrcK.js'), 'utf8');
  assert.ok(before.includes('ot=at.Provider'));
});

test('tr-0 owner table: owned state sliced only here, foreign owners verified', () => {
  assert.deepEqual(owners.owned.map(o => o.name).sort(),
    ['BackgroundTaskStatusContext', 'PathResolverProvider', 'ProposalPaneContext', 'SessionScopeContext', 'usePathResolver']);
  for (const o of owners.owned) assert.equal(o.owner, 'transcript-rows-v4');
  assert.deepEqual(owners.foreign.map(o => o.name), FOREIGN_OWNERS.map(o => o.name));
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  for (const name of ['CdsModeStoreContext', 'CdsSkeletonGroupContext', 'ctx_c856385e2_Mt']) assert.ok(cds.publicNames[name], name);
  const mod = manifest.modules.find(m => m.target === 'rows-c856385e2.mjs');
  assert.deepEqual(mod.bindings.map(b => b.name).sort(), ['It', 'Nt']);
  assert.ok(mod.imports.some(i => i.local === 'Mt' && i.kind === 'shared-graph' && i.from === '../cds-core/c856385e2.mjs'));
  for (const dir of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (dir === 'transcript-rows-v4') continue;
    const file = path.join(app, 'src/generated', dir, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.referenceVersion !== '4.16336.0') continue;
    for (const o of owners.owned) {
      const [chunk, name] = o.binding.split('#');
      assert.ok(!(m.modules ?? []).some(x => path.basename(x.source ?? '') === chunk && (x.bindings ?? []).some(b => (b.name ?? b) === name)), `${dir} slices ${o.binding}`);
    }
  }
});

test('tr-1 verbatim: 249 pinned (247 byte-identical with 3.6556.2, 2 same-family), all 249 emitted byte for byte from tr-3 on', () => {
  assert.equal(pins.files.length, 249);
  assert.equal(pins.files.filter(p => p.status === 'identical').length, 247);
  assert.deepEqual(pins.files.filter(p => p.status === 'same-family').map(p => p.file).sort(), ['cb3185f0d-BQp1BLps.js', 'cd14a9327-B9PBTVtf.js']);
  const previousVerbatim = new Set(previousManifest.modules.filter(m => m.verbatim).map(m => m.source));
  assert.equal(previousVerbatim.size, 249);
  for (const p of pins.files) {
    assert.ok(previousVerbatim.has(p.previous), p.previous);
    assert.equal(sha(fs.readFileSync(path.join(ion, p.file))), p.sha256, p.file);
    assert.equal(sha(fs.readFileSync(path.join(ionBefore, p.previous))), p.previousSha256, p.previous);
    if (p.status === 'identical') assert.equal(p.sha256, p.previousSha256, p.file);
  }
  const emitted = manifest.modules.filter(m => m.verbatim);
  assert.equal(emitted.length, 249);
  const byFile = new Map(pins.files.map(p => [p.file, p]));
  for (const m of emitted) {
    assert.equal(m.target, m.source);
    assert.equal(local(`${out}/${m.target}`).equals(fs.readFileSync(path.join(ion, m.source))), true, m.target);
    assert.equal(m.sha256, byFile.get(m.source).sha256, m.source);
  }
  // The oniguruma wasm (deferred until tr-3) is reached through pierre File -> c68fd9df8 z / Q, and emitted.
  assert.deepEqual(pins.files.filter(p => p.deferred).map(p => p.file), []);
  assert.deepEqual(pins.files.filter(p => p.reachedBy).map(p => [p.file, p.reachedBy.step]), [['c7c157339-BCwwaLv8.js', 'tr-3']]);
  assert.ok(emitted.some(m => m.source === 'c7c157339-BCwwaLv8.js'));
  assert.equal(provenance.verbatim.emitted, 249);
  assert.deepEqual(provenance.verbatim.deferred, []);
});

test('SSR: the contexts and lazy-load tables load; the path resolver provider feeds cds-core\'s one context', () => {
  assert.ok(gen.BackgroundTaskStatusContext.Provider && gen.SessionScopeContext.Provider && gen.ProposalPaneContext.Provider);
  const Read = ({ ctx, pick }) => String(pick(React.useContext(ctx)));
  assert.equal(renderToStaticMarkup(h(Read, { ctx: gen.BackgroundTaskStatusContext, pick: v => v instanceof Map && v.size })), '0');
  assert.equal(renderToStaticMarkup(h(Read, { ctx: gen.SessionScopeContext, pick: v => v })), 'null');
  assert.equal(renderToStaticMarkup(h(Read, { ctx: gen.ProposalPaneContext, pick: v => `${v.inline}:${typeof v.captureGuardedSnapToBottom()}` })), 'false:function');
  const statuses = new Map([['toolu_1', 'running']]);
  assert.equal(renderToStaticMarkup(h(gen.BackgroundTaskStatusContext.Provider, { value: statuses },
    h(Read, { ctx: gen.BackgroundTaskStatusContext, pick: v => v.get('toolu_1') }))), 'running');
  assert.equal(gen.PathResolverProvider, cdsPaths.Mt.Provider);
  assert.equal(renderToStaticMarkup(h(gen.PathResolverProvider, { value: { windowsRoot: false } }, h(Read, { ctx: cdsPaths.Mt, pick: v => v.windowsRoot }))), 'false');
  assert.equal(typeof gen.usePathResolver, 'function');
  assert.equal(typeof gen.bundledLanguages.typescript, 'function');
  assert.equal(typeof gen.bundledLanguages.ts, 'function');
  assert.equal(Object.keys(gen.bundledThemes).length, 65);
  assert.deepEqual(Object.keys(gen.pierreThemeLoaders).length, 10);
});

// The host's raw-identity imports of the 3.6556.2 graph (`<minified local> as <alias>`): every one has a tr-2 entry.
const hostRawImports = () => {
  const found = [];
  for (const file of fs.readdirSync(path.join(app, 'src')).filter(n => /\.(jsx|mjs|js)$/.test(n))) {
    const text = fs.readFileSync(path.join(app, 'src', file), 'utf8');
    for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']\.\/generated\/transcript-rows\/([^"']+)["']/g))
      for (const spec of m[1].split(',').map(x => x.trim()).filter(Boolean)) {
        const [orig, alias] = spec.split(/\s+as\s+/);
        if (alias && /^[\w$]{1,3}$/.test(orig)) found.push({ file: `src/${file}`, module: m[2], orig, alias });
      }
  }
  return found;
};

test('tr-2 link surface: every host raw-identity import has a semantic name and one 4.16336.0 owner', () => {
  const raw = hostRawImports();
  assert.equal(raw.length, 15, raw.map(r => r.alias).join(','));
  const byName = new Map(LINK_SURFACE.map(e => [e.name, e]));
  const previousByTarget = new Map(previousManifest.modules.map(m => [m.target, path.basename(m.source)]));
  for (const r of raw) {
    const e = byName.get(r.alias);
    assert.ok(e, `${r.file}: ${r.orig} as ${r.alias} has no tr-2 entry`);
    assert.equal(e.host, r.file, r.alias);
    assert.equal(e.previous, `${previousByTarget.get(r.module)}#${r.orig}`, r.alias);
  }
  assert.deepEqual(linkSurface.entries.map(e => e.name), LINK_SURFACE.map(e => e.name));
  for (const e of linkSurface.entries) {
    assert.match(e.previousDeclarationSha256, /^[0-9a-f]{64}$/);
    assert.match(e.declarationSha256, /^[0-9a-f]{64}$/);
    if (e.owner === 'transcript-rows-v4') assert.ok(gen[e.name] !== undefined, `${e.name} is not exported by index.mjs`);
    else assert.ok(!manifest.modules.some(m => m.source === e.binding.split('#')[0] && m.bindings.some(b => b.name === e.binding.split('#')[1])), `${e.name} is sliced here`);
  }
  // cds-core owns the live session stores; the watchers set is mE in 4.16336.0 (nT is now a counter).
  const cds = JSON.parse(local('src/generated/cds-core/manifest.json'));
  assert.equal(cds.publicNames.state_c06cf64bb_mE.local, 'mE');
  assert.ok(fs.readFileSync(path.join(ion, 'c06cf64bb-CoZso5N4.js'), 'utf8').includes('var nT=0;'));
  // No raw linkExports anywhere in this graph.
  for (const m of manifest.modules) assert.equal(m.linkExports, undefined, m.target);
});

test('tr-2 / tr-3 D1: module state sliced only here; linked areas answer what they hold', () => {
  assert.ok(owners.state.length > 0);
  const others = [];
  for (const dir of fs.readdirSync(path.join(app, 'src/generated'))) {
    if (dir === 'transcript-rows-v4') continue;
    const file = path.join(app, 'src/generated', dir, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.referenceVersion === '4.16336.0') others.push([dir, m]);
  }
  for (const st of owners.state) {
    const [chunk, name] = st.binding.split('#');
    for (const [dir, m] of others)
      assert.ok(!(m.modules ?? []).some(x => path.basename(x.source ?? '') === chunk && (x.bindings ?? []).some(b => (b.name ?? b) === name)), `${dir} slices ${st.binding}`);
  }
  // Wave 7: the shared-1 mF context this graph owned is the cds-core publicName ctx_shared1_mF; linked, no longer owned.
  assert.ok(!owners.state.some(s => s.binding === 'shared-1-D1bGaTaN.js#mF'));
  assert.ok(manifest.modules.find(m => m.target === 'rows-shared-1.mjs').imports.some(i => i.local === 'mF' && i.kind === 'shared-graph' && i.from === '../cds-core/shared-1.mjs' && i.via === 'shared-1-D1bGaTaN.js#mF'));
  assert.ok(!manifest.modules.some(m => m.source === 'shared-1-D1bGaTaN.js' && m.bindings.some(b => b.name === 'mF')));
  assert.deepEqual(manifest.linkedAreas ?? LINKED_AREAS, LINKED_AREAS);
  const outlet = manifest.modules.find(m => m.target === 'rows-cb6930dae.mjs');
  assert.ok(outlet.imports.some(i => i.local === 'du' && i.kind === 'linked' && i.from === '../working-line-v4/morph.mjs' && i.name === 'TurnMarkBrokerContext'));
  const find = manifest.modules.find(m => m.target === 'rows-c69eb6b8e.mjs');
  assert.ok(find.imports.some(i => i.local === 'S' && i.kind === 'linked' && i.from === '../settings-pages-v4/editor-prefs.mjs' && i.name === 'useEditorPrefsStore'));
  assert.ok(!manifest.modules.some(m => m.source === 'c5d464fa3-D1V4bYI5.js' && m.bindings.some(b => ['I', 'L', 'z'].includes(b.name))));
  // The compiler memo helpers stay in this graph's rows-shared-frame.mjs (artifact-library-v4 / effort-control-v4 link
  // them from here); working-line-v4 is linked for its mark broker (morph.mjs) and Vite's preload helper (tr-3) and, from
  // tr-4 on, the turn status step, the working line's spinner / clock / input label, the clipboard writer and shared-2 m7 —
  // never for its shared-frame.mjs.
  const frame = manifest.modules.find(m => m.target === 'rows-shared-frame.mjs');
  for (const n of ['J1', 'J2', 'J4', 'J9', 'K1', 'K2', 'K4']) assert.ok(frame.sharedExports.includes(n), n);
  const fromWorkingLine = [...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked' && i.from.startsWith('../working-line-v4/')).map(i => i.from)))].sort();
  assert.deepEqual(fromWorkingLine, ['../working-line-v4/clipboard.mjs', '../working-line-v4/morph.mjs', '../working-line-v4/preload-helper.mjs',
    '../working-line-v4/shared-2.mjs', '../working-line-v4/turn-status.mjs', '../working-line-v4/working-line.mjs']);
  for (const m of manifest.modules) for (const i of m.imports) if (i.kind === 'linked' && i.via?.startsWith('shared-frame-'))
    assert.notEqual(i.from, '../working-line-v4/shared-frame.mjs', `${m.target} links ${i.name} from working-line-v4's shared-frame`);
  // shared-36 (the editor-prefs store and its selectors) is settings-pages-v4's: not sliced here, every read linked.
  assert.ok(!manifest.modules.some(m => m.source === 'shared-36-fqRFYwOb.js'));
  const theme = manifest.modules.find(m => m.target === 'rows-c5d464fa3.mjs');
  assert.deepEqual(theme.imports.filter(i => i.via.startsWith('shared-36-')).map(i => [i.kind, i.from]),
    [['linked', '../settings-pages-v4/editor-prefs.mjs'], ['linked', '../settings-pages-v4/editor-prefs.mjs']]);
  // Wave 8b: UserBashRun (c19e90103 k_) is a root now (was pending: ['ToolGroupRows', 'ToolRow', 'UserBashRun']); tr-4 adds
  // ToolRow / ToolGroupRows (below), still pending.
  assert.deepEqual(Object.values(PENDING_ROOTS).map(p => p.name).sort(), ['ToolGroupRows', 'ToolRow']);
  assert.equal(provenance.roots.find(r => r.file === 'c19e90103-BKPMSRL2.js' && r.local === 'k_')?.name, 'UserBashRun');
  assert.equal(gen.UserBashRun !== undefined, true);
  for (const key of Object.keys(PENDING_ROOTS)) {
    const [chunk, name] = key.split('#');
    assert.ok(!manifest.modules.some(m => m.source === chunk && m.bindings.some(b => b.name === name)), key);
  }
});

test('tr-4 roots: the thinking step, the running tool row (caller-constrained among 3 shapes), the live scope; adapters pinned', () => {
  const roots = new Map(provenance.roots.map(r => [`${r.file}#${r.local}`, r]));
  const c96 = 'c96d752d0-D9VB6ArX.js';
  assert.equal(roots.get(`${c96}#SH`).name, 'ThoughtProcessStep');
  assert.equal(roots.get(`${c96}#Ize`).name, 'RunningToolRow');
  assert.equal(roots.get(`${c96}#Ize`).constraint, 'runningToolRowCaller');
  assert.equal(roots.get(`${c96}#Ize`).shapeAlternatives, 3);
  assert.equal(roots.get('cb6930dae-DPu57U90.js#Xu').name, 'TranscriptLiveScopeContext');
  const text = fs.readFileSync(path.join(ion, c96), 'utf8');
  // The three turn mark rows and their one caller each: Ize under the tool row's step qKe ($Ke, which ToolRow wz mounts),
  // Fze under the tool group t1e, Lze under the init checklist b$e.
  assert.ok(text.includes('f(Ize,{candidate:A,tail:j,step:k,runningLabel:M,trailing:E,busyTrailing:N,'));
  assert.ok(text.includes('f(Fze,{candidate:L,tail:g,state:_,label:R,meta:z,metaTitle:B,statusAnnouncement:V,failedLabel:"",'));
  assert.ok(text.includes('f(Lze,{"data-testid":"init-checklist",'));
  assert.ok(text.includes('wz=hP($Ke,e=>e.epitaxyEngineToolRow,'));
  const group = manifest.modules.find(m => m.target === 'group-status.mjs');
  assert.deepEqual(['Fze', 'Lze', 'wz', 'qW', '$Ke', 't1e'].filter(n => group.bindings.some(b => b.name === n)), []);
  // ToolRow / ToolGroupRows stay pending until the tool card boundary is pinned (wave 8b: UserBashRun no longer pending).
  assert.deepEqual(Object.values(PENDING_ROOTS).map(p => p.name).sort(), ['ToolGroupRows', 'ToolRow']);
  // Every adapter: the 3.6556.2 host adapter of the same binding, re-exported by the v4 adapter module, pinned.
  const entries = new Map(provenance.adapters.entries.map(a => [a.original, a]));
  assert.equal(provenance.adapters.module, ADAPTER_FILE);
  for (const [key, a] of Object.entries(HOST_ADAPTERS)) {
    const e = entries.get(key);
    assert.ok(e && e.pinned && e.declarationSha256 === ADAPTER_PINS[key], key);
    assert.equal(e.name, a.name);
    assert.equal(e.previous, a.previous);
  }
  const adapterText = local(ADAPTER_FILE).toString();
  assert.match(adapterText, /^export \{ [^}]+ \} from "\.\/source-transcript-rows-adapters\.jsx";$/m);
  assert.doesNotMatch(adapterText, /^\s*export\s+(const|let|var|function|class|default)\b/m);
});

test('tr-4 computed dynamic imports: c96d752d0\'s module graph enumerated, none in this graph', () => {
  const proof = provenance.computedImports;
  assert.equal(proof.from, 'c96d752d0-D9VB6ArX.js');
  assert.equal(proof.modules, 3862);
  assert.equal(proof.inThisGraph, 0);
  assert.ok(proof.declarations.length > 0);
  assert.ok(proof.declarations.includes('shared-26-B-POtn5S.js#hp'));
  const sliced = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const d of proof.declarations) for (const n of d.split('#')[1].split(',')) assert.ok(!sliced.has(`${d.split('#')[0]}#${n}`), d);
  // c96d752d0 itself has no computed import (its dynamic imports are literal chunk names).
  assert.doesNotMatch(fs.readFileSync(path.join(ion, 'c96d752d0-D9VB6ArX.js'), 'utf8'), /\bimport\s*\(\s*[^"\s]/);
});

test('tr-5 gate and call sites: turnStatusRows only through working-line-v4, host GrowthBook answer; 7 call sites re-pinned', () => {
  assert.equal(manifest.gate.flag, '__gb__2846116625');
  assert.equal(provenance.gate.owner, 'working-line-v4');
  for (const m of manifest.modules) assert.ok(!(m.source === GATE.chunk && m.bindings.some(b => Object.hasOwn(GATE.bindings, b.name))), m.target);
  const wl = JSON.parse(local('src/generated/working-line-v4/manifest.json'));
  const rows = wl.modules.find(m => m.target === 'turn-status-rows.mjs');
  assert.deepEqual(rows.bindings.map(b => b.name).sort(), ['d', 'f', 'l', 'p', 'u']);
  assert.deepEqual(rows.imports.filter(i => i.kind === 'adapter').map(i => i.name), ['useGrowthBookFlag']);
  // The host table does not serve the flag (E95); the Code session provides the rows value; the feed forces it on.
  const Flag = () => String(statusRows.useTurnStatusRows());
  assert.equal(renderToStaticMarkup(h(statusRows.TurnStatusRowsProvider, null, h(Flag))), 'false');
  assert.equal(renderToStaticMarkup(h(statusRows.TurnStatusRowsOverride, { value: true }, h(Flag))), 'true');
  assert.equal(provenance.gate.forcedOn, 'c96d752d0-D9VB6ArX.js#twt (Lv = ca7b95e24-BFvFgBI_.js#f)');
  assert.deepEqual(provenance.gate.pinnedReaders.map(r => r.split(' ')[0]), ['c96d752d0-D9VB6ArX.js#t1e', 'c96d752d0-D9VB6ArX.js#mM', 'c96d752d0-D9VB6ArX.js#JW']);
  // The seven 3.6556.2 call sites (Z1e, ak, gX, _X, R7, Ho, Aat), each at one 4.16336.0 declaration, pinned.
  assert.deepEqual(CALL_SITES.map(c => c.previous.split('#')[1]), ['Z1e', 'ak', 'gX', '_X', 'R7', 'Ho', 'Aat']);
  const sites = manifest.callSites.filter(c => !c.raw);
  assert.equal(sites.length, 7);
  for (const c of CALL_SITES) {
    const site = sites.find(x => x.source === c.source && x.binding === c.binding);
    assert.ok(site, c.binding);
    assert.equal(site.sourceSha256, sha(fs.readFileSync(path.join(ion, c.source))), c.binding);
    assert.deepEqual(site.features, c.features);
    assert.equal(provenance.callSites.find(x => x.binding === `${c.source}#${c.binding}`).declarationSha256, c.pin);
  }
  for (const c of CALL_SITES) {
    const [file, name] = c.previous.split('#');
    assert.ok(previousManifest.callSites.some(x => x.source === file && x.binding === name), c.previous);
  }
});

test('SSR tr-4: the thinking step and the running tool row from the official 4.16336.0 code', () => {
  const html = renderToStaticMarkup(h(gen.ThoughtProcessStep, { text: 'pondering', expansionKey: 'k1' }));
  assert.match(html, /data-cds="TurnStatusStep"/);
  assert.match(html, /title="Thought process"/);
  assert.match(html, /aria-label="Thinking actions"/);
  assert.match(html, /<bdi>pondering<\/bdi>/);
  assert.equal(renderToStaticMarkup(h(gen.ThoughtProcessStep, { text: '  ', expansionKey: 'k2' })), '');
  // Without the turn's mark (no broker) the running row is the tool row's own step.
  assert.equal(renderToStaticMarkup(h(gen.RunningToolRow, { step: h('span', null, 'STEP'), runningLabel: 'Reading', body: null })), '<span>STEP</span>');
  const Scope = () => JSON.stringify(React.useContext(gen.TranscriptLiveScopeContext));
  assert.equal(renderToStaticMarkup(h(Scope)), '{}');
  assert.equal(renderToStaticMarkup(h(gen.TranscriptLiveScopeContext.Provider, { value: { sessionId: 's1', turnLive: true } }, h(Scope))), '{&quot;sessionId&quot;:&quot;s1&quot;,&quot;turnLive&quot;:true}');
});

test('SSR tr-2 / tr-3: the file viewer helpers and the turn mark outlet from the official 4.16336.0 code', () => {
  assert.equal(gen.lineCount('a\nb\nc'), 3);
  assert.equal(gen.lineCount(''), 1);
  assert.equal(gen.findLineOrdinal([3, 3, 3, 5], 2), 2);
  assert.equal(gen.findLineOrdinal([3, 5], 1), 0);
  // A lone CR is shown as U+240D; a CRLF line ending is left alone (hu = /\r(?!\n)/g).
  assert.equal(gen.pierreContents('a\rb'), `a${String.fromCharCode(0x240d)}b`);
  assert.equal(gen.pierreContents('a\r\nb'), 'a\r\nb');
  assert.match(gen.pierreLetterSpacing, /^letter-spacing: .+; font-feature-settings: .+;$/);
  assert.deepEqual(gen.pierreWrapStyle, { '--diffs-overflow-override': 'clip', '--diffs-scrollbar-gutter-override': '0px' });
  assert.match(gen.codeSelectionCss, /^::selection \{ background-color: light-dark\(var\(--code-theme-light-selection-bg, /);
  assert.match(gen.fileGutterCss(false, 3), /\[data-line-number-content\]\{min-width:max\(calc\(2\.5rem - 18px - 8px\),3ch\)\}/);
  const metrics = gen.fileMetrics(1, 'compact');
  assert.equal(typeof metrics.lineHeight, 'number');
  assert.ok(metrics.lineHeight > 0);
  assert.equal(gen.fileLanguage('src/main.ts'), 'typescript');
  assert.equal(gen.fileLanguage('Makefile'), 'makefile');
  assert.equal(gen.fileLanguage('notes.unknownext'), 'text');
  assert.match(gen.TASK_LINK_CLASS, /^text-accent hover:underline/);
  for (const name of ['highlightFileFind', 'highlightFileLines', 'revealFileLine', 'resolveCodeTheme', 'PierreFile', 'PierreScroller'])
    assert.equal(typeof gen[name], 'function', name);
  const Mode = () => gen.useCodeThemeMode();
  assert.equal(renderToStaticMarkup(h(Mode)), 'light');
  const Theme = () => JSON.stringify(gen.useCodeTheme());
  const prefs = editorPrefs.useEditorPrefsStore.getState();
  assert.equal(renderToStaticMarkup(h(Theme)), JSON.stringify({ theme: { light: prefs.codeThemeLight, dark: prefs.codeThemeDark } }).replaceAll('"', '&quot;'));
  // The outlet registers with working-line-v4's broker context (one copy, D1); without a broker it is a plain div.
  assert.equal(renderToStaticMarkup(h(gen.TurnMarkOutlet, { className: 'x' })), '<div data-turn-mark-outlet="" class="[&amp;&gt;[data-turn-mark-box]&gt;*]:!my-0 x"></div>');
  const calls = [];
  const broker = { setOutletUnderPlan: v => calls.push(['underPlan', v]), openOutlet: () => calls.push(['open']), closeOutlet: () => calls.push(['close']) };
  renderToStaticMarkup(h(morph.TurnMarkBrokerContext.Provider, { value: broker }, h(gen.TurnMarkOutlet, { underPlan: true })));
  assert.deepEqual(calls, []); // effects do not run during SSR
});
