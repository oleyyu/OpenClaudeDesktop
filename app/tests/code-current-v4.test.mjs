// Region batch 3 (code-current:base): the isolated 4.16336.0 staging graph src/generated/code-current-v4
// (scripts/extract-code-current-v4.mjs, contract scripts/extract-code-current-v4-roots.mjs, sharedGraph cds-core, linking
// routines-shared-v4 and r3b-tasks). The 3.6556.2 graph src/generated/code-current (scripts/extract-code-ui-current.mjs)
// keeps serving the host and its consumers until productionSwitchNotBeforeBatch 11; this file never touches it beyond
// reading it. Only modules whose closure stays off host .jsx adapters are imported (plain node, no Vite, no spawn).
// Run serially: node --max-old-space-size=3072 --test tests/code-current-v4.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as official from '../scripts/official-4.16336.0.mjs';
import { extractCodeCurrentV4, CODE_CURRENT_V4_OUTPUT } from '../scripts/extract-code-current-v4.mjs';
import { contract } from '../scripts/extract-code-current-v4-roots.mjs';

const app = path.resolve(import.meta.dirname, '..');
const gen = path.join(app, 'src/generated');
const out = path.join(app, CODE_CURRENT_V4_OUTPUT);
const legacyOut = path.join(gen, 'code-current');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'));
const mod = target => manifest.modules.find(m => m.target === target);
const sourceOf = name => (name.startsWith('asar/') ? path.join(official.asarSource, name.slice(5)) : path.join(official.ionSource, name));
const one = (target, patch) => ({ ...contract, output: 'src/generated/code-current-v4-test-never-written',
  modules: [{ ...contract.modules.find(m => m.target === target), ...patch }] });
const before = path.join(app, '../analysis/claude-4.16336.0-migrate-20261104/regions/batch3/code-current:base/before');

test('the 4.16336.0 contract regenerates byte for byte against frozen cds-core and linked graphs', async () => {
  assert.match(readFileSync(path.join(app, 'scripts/verify-gen-code-current-v4.mjs'), 'utf8'), /extractCodeCurrentV4\(\{ check: true \}\)/);
  assert.deepEqual(JSON.parse(JSON.stringify(await extractCodeCurrentV4({ check: true }))), manifest); // the manifest is its JSON form
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-code-current-v4.mjs');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.sharedGraphManifestSha256, sha(readFileSync(path.join(gen, 'cds-core/manifest.json'))));
  // cds-core wave 5b (region-changes code-current.link-code-composer): shared-2 hm, the grapheme splitter, is linked from
  // code-composer-v4 (its region owner), so the lazily built Intl.Segmenter mm stays one copy.
  assert.deepEqual(Object.keys(manifest.linkedGraphs), ['routines-shared-v4', 'r3b-tasks', 'code-composer-v4']);
  assert.ok(manifest.modules.some(m => m.imports?.some(i => i.from?.startsWith('../code-composer-v4/'))), 'a code-composer-v4 link is used');
  assert.ok(!manifest.modules.some(m => m.source === 'shared-2-CsjIBQD8.js' && m.bindings.some(b => ['hm', 'mm'].includes(b.name ?? b))), 'shared-2 hm / mm are not cut here');
  for (const [area, sum] of Object.entries(manifest.linkedGraphs)) assert.equal(sum, sha(readFileSync(path.join(gen, area, 'manifest.json'))), area);
  assert.equal(manifest.isolatedGraph.legacyOutput, 'src/generated/code-current');
  assert.equal(manifest.isolatedGraph.productionSwitchNotBeforeBatch, 11);
  assert.deepEqual(readdirSync(out).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  for (const m of manifest.modules) {
    assert.equal(m.sha256, sha(readFileSync(path.join(out, m.target))), m.target);
    if (m.source) assert.equal(m.sourceSha256, sha(readFileSync(sourceOf(m.source))), m.source);
    assert.match(readFileSync(path.join(out, m.target), 'utf8'), /^\/\/ Original Claude Desktop 4\.16336\.0 bindings from /);
  }
  // D1: a binding is held by one module only.
  const held = manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`));
  assert.equal(new Set(held).size, held.length);
  // d1Pending: only module state cds-core's fifth wave will publish.
  const wave5 = new Set(contract.d1Wave5.map(c => c.binding));
  for (const p of manifest.d1Pending) assert.ok(wave5.has(p.binding), p.binding);
  // The 12 upper modules stay out of this contract (batch 7).
  for (const upper of ['breadcrumb-file', 'breadcrumb-view', 'environment-delete-question', 'sessions-page-view', 'sidebar-filter-controls', 'sidebar-filter-view',
    'sidebar-nested-caret', 'terminal-action-bar', 'titlebar-folder-pill', 'titlebar-seed-latch', 'titlebar-spawn-lead', 'titlebar-spawn-origin'])
    assert.equal(mod(`${upper}.mjs`), undefined, upper);
  // Blocked roots name the host adapters they need instead of a hand-written stand-in.
  for (const b of manifest.blocked) assert.ok(Object.keys(b.hostAdaptersNeeded).length, b.export);
});

test('the 3.6556.2 graph stays byte-identical and links nothing of 4.16336.0', () => {
  const legacy = JSON.parse(readFileSync(path.join(legacyOut, 'manifest.json'), 'utf8'));
  assert.equal(legacy.referenceVersion, '3.6556.2');
  for (const m of legacy.modules) assert.equal(m.sha256, sha(readFileSync(path.join(legacyOut, m.target))), m.target);
  const text = readdirSync(legacyOut).filter(n => n.endsWith('.mjs')).map(n => readFileSync(path.join(legacyOut, n), 'utf8')).join('\n');
  assert.doesNotMatch(text, /code-current-v4|\.\.\/cds-core\/|routines-shared-v4|r3b-tasks/);
  if (!existsSync(before)) return; // the local analysis snapshot of the pre-migration bytes
  for (const line of readFileSync(path.join(before, 'legacy-sha256.txt'), 'utf8').trim().split('\n')) {
    const [sum, file] = line.split(/\s+/);
    assert.equal(sha(readFileSync(path.join(legacyOut, file))), sum, file);
  }
  for (const line of readFileSync(path.join(before, 'legacy-electron-sha256.txt'), 'utf8').trim().split('\n')) {
    const [sum, file] = line.split(/\s+/);
    assert.equal(sha(readFileSync(path.join(app, 'electron/generated', file))), sum, file);
  }
  for (const line of readFileSync(path.join(before, 'generator-sha256.txt'), 'utf8').trim().split('\n')) {
    const [sum, file] = line.split(/\s+/);
    assert.equal(sha(readFileSync(path.join(app, file))), sum, file);
  }
});

test('every relative import resolves to a file that exports the imported name', () => {
  const exportsCache = new Map();
  const exportsOf = file => {
    if (!exportsCache.has(file)) {
      const text = readFileSync(file, 'utf8'), names = new Set();
      for (const [, list] of text.matchAll(/export\s*\{([^}]*)\}/g)) for (const s of list.split(',')) { const n = s.trim().split(/\s+as\s+/).pop(); if (n) names.add(n); }
      for (const [, n] of text.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([\w$]+)/g)) names.add(n);
      if (/export\s+default\b/.test(text)) names.add('default');
      exportsCache.set(file, names);
    }
    return exportsCache.get(file);
  };
  for (const m of manifest.modules) for (const i of m.imports) {
    if (!i.from.startsWith('.')) { assert.ok(['react', 'react-dom', 'react/jsx-runtime', 'prosemirror-state'].includes(i.from), `${m.target}: ${i.from}`); continue; }
    const file = path.resolve(out, i.from);
    assert.ok(existsSync(file), `${m.target}: ${i.from}`);
    assert.ok(exportsOf(file).has(i.name), `${m.target}: ${i.from} does not export ${i.name}`);
  }
});

test('top-level initializers travel with their binding: the csv vendor Buffer polyfill parses like 3.6556.2', async () => {
  const vendor = mod('csv-parser-vendor.mjs');
  assert.ok(vendor.initializers.length > 0 && vendor.initializers.every(i => i.assigns.every(n => vendor.bindings.some(b => b.name === n))));
  const v4 = await import(pathToFileURL(path.join(out, 'csv-parser.mjs')));
  const legacy = await import(pathToFileURL(path.join(legacyOut, 'csv-parser.mjs')));
  for (const text of ['name,count\n"a\nb",1\n"x""y",2\n', 'a'.repeat(299) + '😀z,1', 'name,count\nfirst,1\n"unfinished'])
    assert.deepEqual(v4.parseCsvPreview(text, ','), legacy.parseCsvPreview(text, ','));
});

test('pure modules import and behave like their 3.6556.2 originals', async () => {
  const sort = await import(pathToFileURL(path.join(out, 'sidebar-sort-model.mjs')));
  const a = { updatedAtMs: 20, createdAtMs: 5, title: 'b' }, b = { updatedAtMs: 10, createdAtMs: 0, title: null };
  assert.equal(sort.compareSidebarUpdated(a, b), -10);
  assert.equal(sort.sidebarCreatedTimestamp(b), 10);
  assert.equal(sort.compareSidebarTitle(a, b), -1);
  // Electron targets stay off React, cds-core and host adapters (their production home is the main process).
  for (const [target, e] of Object.entries(manifest.electronTargets)) {
    for (const t of e.modules) for (const i of mod(t).imports) assert.ok(i.from.startsWith('./'), `${target}: ${t} imports ${i.from}`);
    await import(pathToFileURL(path.join(out, target)));
  }
});

test('generation stops: a re-pointed alias, a non-unique feature, cds-core module state without a name (D46), a test write', async () => {
  const base = contract.modules.find(m => m.target === 'sidebar-sort-model.mjs');
  await assert.rejects(extractCodeCurrentV4({ dry: true, contract: one('sidebar-sort-model.mjs', { aliases: { ...base.aliases, ZT: 'Z' } }) }), /exports Z as QT, not ZT/);
  await assert.rejects(extractCodeCurrentV4({ dry: true, contract: one('sidebar-sort-model.mjs', { features: { ...base.features, ZT: ['return'] } }) }),
    /root ZT \(compareSidebarUpdated\) is not the unique declaration with its features/);
  await assert.rejects(extractCodeCurrentV4({ contract: one('sidebar-sort-model.mjs', {}) }), /A test contract never writes/);
  const core = JSON.parse(readFileSync(path.join(gen, 'cds-core/manifest.json'), 'utf8'));
  if (Object.values(core.publicNames).some(e => e.file === official.sharedFrame && e.local === 'Ic')) return; // named since
  // shared-frame Rc (private; cds-core holds it without a name, hash-equal) reads Ic, a WeakMap cds-core holds without a
  // publicName: generation must stop instead of making a second copy.
  const d46 = { ...contract, output: 'src/generated/code-current-v4-test-never-written', modules: [{ target: 'probe.mjs', source: official.sharedFrame,
    exports: { Rc: 'probe' }, aliases: { Rc: null }, features: { Rc: [{ loose: 'function Rc(e){return Ic.get(e)}', keep: ['Ic'] }] } }] };
  await assert.rejects(extractCodeCurrentV4({ dry: true, contract: d46 }), /module state cds-core holds without a publicName \(D46\): probe\.mjs: shared-frame-CJdE5Ria\.js#Ic \(new WeakMap\)/);
  const survey = await extractCodeCurrentV4({ survey: true, contract: d46 });
  assert.ok(survey.stateConflicts.some(c => c.binding === `${official.sharedFrame}#Ic` && /new WeakMap/.test(c.text) && c.reachedBy), JSON.stringify(survey.stateConflicts));
});
