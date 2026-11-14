// R3b transcript, 4.16336.0 graph (claude-4.16336.0-migrate-20261104 region batch 2b): the same semantic exports the
// 3.6556.2 graph cuts (src/generated/r3b-transcript, tests/r3b-transcript-current.test.mjs), re-located in
// snapshots/claude-4.16336.0-20261104 by scripts/extract-r3b-transcript.mjs into the isolated
// src/generated/r3b-transcript-v4. The 3.6556.2 graph stays what the host and its consumers (chat-renderer,
// code-transcript, sessions-page, transcript-rows) import until the production switch (not before batch 10).
// Nothing here renders, sends or reads a real session.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parsers } from '../../tools/node_modules/prettier/plugins/babel.mjs';
import { contract4, extractR3bTranscriptV4, contractVersions } from '../scripts/extract-r3b-transcript.mjs';
import { relativePath, isUrlPath } from '../src/generated/r3b-transcript-v4/relative-path.mjs';
import { stripInvisibleCharacters, collapseControlCharacters } from '../src/generated/r3b-transcript-v4/invisible-characters.mjs';
import { isWindowsPath, WINDOWS_DRIVE, WINDOWS_UNC } from '../src/generated/r3b-transcript-v4/windows-path.mjs';
import { fileBasename } from '../src/generated/r3b-transcript-v4/file-basename.mjs';
import { tableRemeasureStride } from '../src/generated/r3b-transcript-v4/table-column-freeze.mjs';
// cds-core wave 5: shared-62 cf is cds-core isPageUnloading (page-leave-state.mjs had every root linked and is gone).
import { isPageUnloading as pageUnloading } from '../src/cds-core.mjs';
import { documentTearingDown } from '../src/generated/r3b-transcript-v4/document-teardown.mjs';
import { lazyValue } from '../src/generated/r3b-tasks/lazy-value.mjs';

const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated');
const output = path.join(generated, 'r3b-transcript-v4');
const legacy = path.join(generated, 'r3b-transcript');
const reference = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const manifest = JSON.parse(read(path.join(output, 'manifest.json')));
const declarations = new Map();
function declarationsOf(chunk) {
  if (!declarations.has(chunk)) {
    const text = read(path.join(reference, chunk));
    declarations.set(chunk, { text, map: new Map(parsers.babel.parse(text, {}).program.body.flatMap(node => (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' ? [[node.id.name, node]]
      : node.type === 'VariableDeclaration' ? node.declarations.map(d => [d.id.name, d]) : []))) });
  }
  return declarations.get(chunk);
}
const importsOf = text => parsers.babel.parse(text, {}).program.body.filter(n => n.type === 'ImportDeclaration')
  .map(n => ({ from: n.source.value, names: n.specifiers.map(s => s.imported?.name ?? 'default') }));

test('r3b-transcript-v4: the isolated 4.16336.0 graph is what the generator writes (--check), linked to cds-core', async () => {
  assert.deepEqual(contractVersions, ['3.6556.2', '4.16336.0']);
  const checked = await extractR3bTranscriptV4({ check: true });
  assert.equal(JSON.stringify(checked, null, 2) + '\n', read(path.join(output, 'manifest.json')));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(manifest.cdsCoreManifestSha256, sha(fs.readFileSync(path.join(generated, 'cds-core/manifest.json'))));
  assert.equal(manifest.isolatedGraph.legacyOutput, 'src/generated/r3b-transcript');
  assert.equal(manifest.isolatedGraph.productionSwitchNotBeforeBatch, 10);
  // The production graph is untouched: still 3.6556.2, and neither graph imports the other.
  const legacyManifest = JSON.parse(read(path.join(legacy, 'manifest.json')));
  assert.equal(legacyManifest.referenceVersion, '3.6556.2');
  for (const file of fs.readdirSync(legacy).filter(f => f.endsWith('.mjs'))) assert.doesNotMatch(read(path.join(legacy, file)), /r3b-transcript-v4|4\.16336\.0/, file);
  for (const file of fs.readdirSync(output).filter(f => f.endsWith('.mjs'))) {
    const text = read(path.join(output, file));
    assert.doesNotMatch(text, /3\.6556\.2|\.\.\/r3b-transcript\//, file);
    for (const { from } of importsOf(text)) assert.ok(!from.startsWith('../') || /^\.\.\/(cds-core|r3b-tasks|r4e-plugin)\/|^\.\.\/\.\.\/source-r3b-transcript-adapters\.jsx$/.test(from), `${file} imports ${from}`);
  }
});

test('r3b-transcript-v4: every binding is the shipped declaration; every import is pinned and resolves', () => {
  const adapterText = read(path.join(app, 'src/source-r3b-transcript-adapters.jsx'));
  const adapterExports = new Set(parsers.babel.parse(adapterText, {}).program.body.filter(n => n.type === 'ExportNamedDeclaration')
    .flatMap(n => [...(n.specifiers ?? []).map(s => s.exported.name), ...(n.declaration?.id ? [n.declaration.id.name] : []), ...(n.declaration?.declarations ?? []).map(d => d.id.name)]));
  const cdsCore = JSON.parse(read(path.join(generated, 'cds-core/manifest.json')));
  for (const entry of manifest.modules) {
    const { text, map } = declarationsOf(entry.source);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(sha(fs.readFileSync(path.join(output, entry.target))), entry.sha256, entry.target);
    for (const b of entry.bindings) {
      const node = map.get(b.name);
      assert.ok(node, `${entry.source} declares ${b.name}`);
      assert.equal(b.sha256, sha(text.slice(node.start, node.end)), `${entry.target} ${b.name}`);
    }
    for (const imported of entry.imports) {
      assert.ok(['react', 'generated', 'shared-graph', 'adapter', 'linked-area'].includes(imported.kind), `${entry.target} ${imported.local} ${imported.kind}`);
      if (imported.kind === 'adapter') {
        assert.ok(adapterExports.has(imported.name), `adapter ${imported.name}`);
        assert.match(imported.replacedSha256, /^[0-9a-f]{64}$/);
      }
      if (imported.kind === 'shared-graph') {
        const entryName = Object.entries(cdsCore.publicNames).find(([, e]) => `../cds-core/${e.target}` === imported.from && e.exportName === imported.name);
        assert.ok(entryName, `${entry.target} ${imported.local}: cds-core publishes ${imported.name}`);
      }
      if (imported.kind === 'linked-area') {
        const key = imported.via.includes('#') ? imported.via : null;
        const link = Object.entries(contract4.linkedAreas).find(([k, l]) => `../${l.area}/${l.target}` === imported.from && l.exportName === imported.name);
        assert.ok(link, `${entry.target} ${imported.local} links ${imported.from}`);
        const [file, local] = link[0].split('#');
        const { text: chunk, map: chunkMap } = declarationsOf(file);
        assert.equal(imported.linkedSha256, sha(chunk.slice(chunkMap.get(local).start, chunkMap.get(local).end)), `${link[0]} ${key ?? ''}`);
      }
    }
  }
  // Every relative import resolves to an export of its target.
  for (const file of fs.readdirSync(output).filter(f => f.endsWith('.mjs'))) {
    for (const { from, names } of importsOf(read(path.join(output, file)))) {
      if (!from.startsWith('.')) continue;
      const target = path.resolve(output, from);
      if (target.endsWith('.jsx')) { for (const name of names) assert.ok(adapterExports.has(name), `${file}: ${name}`); continue; }
      const exported = new Set(parsers.babel.parse(read(target), {}).program.body.filter(n => n.type === 'ExportNamedDeclaration').flatMap(n => (n.specifiers ?? []).map(s => s.exported.name)));
      for (const name of names) assert.ok(exported.has(name), `${file}: ${from} exports ${name}`);
    }
  }
  // Call sites and the inline style are pinned on the shipped bytes.
  assert.equal(manifest.callSites.length, contract4.callSites.length);
  for (const site of manifest.callSites) {
    const { text, map } = declarationsOf(site.source);
    assert.equal(site.sha256, sha(text.slice(map.get(site.binding).start, map.get(site.binding).end)), `${site.source} ${site.binding}`);
  }
  assert.deepEqual(manifest.inlineStyles.map(s => [s.source, s.id, s.target]), [['c425fb3cf-Gc8R9PSy.js', 'cbbd9b21e', 'summary-card.css']]);
  assert.match(read(path.join(output, 'summary-card.css')), /\.epitaxy-root \.epitaxy-summary-card-control-text\{/);
});

test('r3b-transcript-v4: D46 is 0 and D1 module-state copies are the listed ones', () => {
  // cds-core holds no module state this graph reaches without a publicName (heldByCdsCore entries are pure).
  const cdsCore = JSON.parse(read(path.join(generated, 'cds-core/manifest.json')));
  const published = new Set(Object.values(cdsCore.publicNames).map(e => `${e.file}#${e.local}`));
  for (const entry of manifest.modules) for (const name of entry.heldByCdsCore) {
    const { text, map } = declarationsOf(entry.source);
    const node = map.get(name);
    assert.ok(!published.has(`${entry.source}#${name}`), `${entry.target} ${name} is published: link it`);
    assert.doesNotMatch(text.slice(node.start, node.end), /^[\w$]+=new (WeakMap|Map|Set|WeakSet)\b/, `${entry.target} ${name}`);
  }
  // Other 4.16336.0 regions holding module state this graph cuts: only foreignState, which is empty since cds-core wave 5
  // (af and zm are cds-core publicNames: render-error-boundary links cf, invisible-characters links Bm).
  const others = new Map();
  for (const area of fs.readdirSync(generated, { withFileTypes: true }).filter(d => d.isDirectory() && !['r3b-transcript-v4', 'r3b-transcript', 'cds-core'].includes(d.name)).map(d => d.name)) {
    let other; try { other = JSON.parse(read(path.join(generated, area, 'manifest.json'))); } catch { continue; }
    for (const m of Array.isArray(other.modules) ? other.modules : []) {
      if ((m.referenceVersion ?? other.referenceVersion) !== '4.16336.0' || typeof m.source !== 'string') continue;
      for (const b of m.bindings ?? []) {
        const key = `${path.basename(m.source)}#${typeof b === 'string' ? b : b.name}`;
        if (!others.has(key)) others.set(key, new Set());
        others.get(key).add(area);
      }
    }
  }
  assert.deepEqual(manifest.foreignStateCopies.map(c => c.binding).sort(), Object.keys(contract4.foreignState).sort());
  for (const copy of manifest.foreignStateCopies) {
    const holders = [...(others.get(copy.binding) ?? [])].sort();
    assert.ok(holders.length, `${copy.binding} is still held elsewhere`);
    if (!copy.anyAreas) assert.deepEqual(holders, copy.areas, copy.binding);
  }
  assert.deepEqual([manifest.foreignStateCopies, Object.keys(contract4.foreignState)], [[], []]);
  const links = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'shared-graph' && ['cf', 'Bm'].includes(i.name)).map(i => `${m.target}:${i.from}:${i.name}`));
  assert.deepEqual(links.sort(), ['invisible-characters.mjs:../cds-core/shared-frame.mjs:Bm', 'render-error-boundary.mjs:../cds-core/shared-62.mjs:cf']);
  for (const key of ['shared-62-DoCqVpIq.js#af', 'shared-62-DoCqVpIq.js#cf', 'shared-frame-CJdE5Ria.js#zm', 'shared-frame-CJdE5Ria.js#Bm'])
    assert.ok(!manifest.modules.some(m => m.bindings.some(b => `${m.source}#${b.name}` === key)), `${key} is linked, not cut`);
  assert.ok(!fs.existsSync(path.join(output, 'page-leave-state.mjs')));
  // Linked, not cut: shared-0 Tl (r3b-tasks lazy-value). W8A (cds-wave8 addendum): r4e-plugin no longer cuts shared-0 T6
  // (its reader links the published owner value), so T6 is cut here (invisible-code-points.mjs, cds-core-held pure regex).
  // Was: "… and T6 (r4e-plugin url-safety)" and linkedAreas [r3b-tasks lazy-value.mjs, { area: 'r4e-plugin', modules: ['url-safety.mjs'] }].
  const mine = new Set(manifest.modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  for (const key of Object.keys(contract4.linkedAreas)) assert.ok(!mine.has(key), key);
  assert.deepEqual(manifest.linkedAreas, [{ area: 'r3b-tasks', modules: ['lazy-value.mjs'] }]);
  assert.deepEqual(manifest.modules.filter(m => m.bindings.some(b => `${m.source}#${b.name}` === 'shared-0-CnnWnVrT.js#T6')).map(m => m.target), ['invisible-code-points.mjs']);
});

// A contract of the path modules only: fail-closed probes run it with check:true (never writes).
// W8A: + invisible-code-points.mjs (shared-0 T6, which relative-path reads; was linked from r4e-plugin).
const pathModules = ['compiler-helpers.mjs', 'invisible-characters.mjs', 'windows-path.mjs', 'relative-path.mjs', 'invisible-code-points.mjs'];
// (W8A: relative-path's spec is looked up by target below, was probe().modules[3]; invisible-code-points precedes it.)
const probe = changes => ({ ...contract4, callSites: [], inlineStyles: [], foreignState: {},
  modules: contract4.modules.filter(m => pathModules.includes(m.target)), ...changes });
const withModule = (target, change) => probe({ modules: probe().modules.map(m => (m.target === target ? { ...m, ...change } : m)) });

test('r3b-transcript-v4: fail closed (root identity, features, unlinked bindings, D46)', async () => {
  // The path subset itself resolves (survey: nothing unresolved, no state conflict, no D1 problem).
  const survey = await extractR3bTranscriptV4({ contract: probe(), survey: true });
  assert.deepEqual(survey.unresolved, []);
  assert.deepEqual(survey.stateConflicts, []);
  assert.deepEqual(survey.foreignProblems, []);
  // A wrong export alias, a missing feature, a private root that is exported.
  await assert.rejects(extractR3bTranscriptV4({ contract: withModule('relative-path.mjs', { aliases: { rN: 'St', YM: 'St', VM: 'rn' } }), check: true }), /exports St as YM, not rN/);
  await assert.rejects(extractR3bTranscriptV4({ contract: withModule('relative-path.mjs', { features: { ...probe().modules.find(m => m.target === 'relative-path.mjs').features, rN: ['if (!t) return null;'] } }), check: true }), /root rN lacks/);
  await assert.rejects(extractR3bTranscriptV4({ contract: withModule('windows-path.mjs', { aliases: { IA: null, MA: 'fu', NA: 'du' } }), check: true }), /private root IA is exported/);
  // Without the linked areas, shared-0 Tl is unresolved (never silently cut again). (W8A: was "Tl / T6".)
  await assert.rejects(extractR3bTranscriptV4({ contract: probe({ linkedAreas: {} }), check: true }), /unresolved import shared-0-CnnWnVrT\.js:nS \(Tl\)/);
  // A stale foreignState entry (zm, which this graph links from cds-core since wave 5) fails closed (survey reports it).
  const stale = await extractR3bTranscriptV4({ contract: probe({ foreignState: { 'shared-frame-CJdE5Ria.js#zm': { anyAreas: true, reason: 'probe' } } }), survey: true });
  assert.deepEqual(stale.foreignProblems.map(p => p.binding), ['shared-frame-CJdE5Ria.js#zm']);
  // D46: a cds-core-held module state without a publicName (shared-frame F_, a WeakMap) stops the region.
  const d46 = probe({ modules: [...probe().modules.slice(0, 1), { target: 'd46-probe.mjs', source: 'shared-frame-CJdE5Ria.js', exports: { F_: 'probe' }, aliases: { F_: null },
    features: { F_: [/\bF_\s*=\s*new WeakMap\b/] } }] });
  await assert.rejects(extractR3bTranscriptV4({ contract: d46, check: true }), /module state cds-core holds without a semantic name .*D46.*shared-frame-CJdE5Ria\.js#F_/);
  const d46Survey = await extractR3bTranscriptV4({ contract: d46, survey: true });
  assert.deepEqual(d46Survey.stateConflicts.map(c => c.binding), ['shared-frame-CJdE5Ria.js#F_']);
});

test('r3b-transcript-v4: behaviour of the original path helpers (4.16336.0)', () => {
  assert.equal(relativePath('/work/app/src/main.jsx', '/work/app'), 'src/main.jsx');
  assert.equal(relativePath('/elsewhere/a.txt', '/work/app'), '/elsewhere/a.txt');
  assert.equal(isUrlPath('https://example.com/a'), true);
  assert.equal(isUrlPath('/work/app'), false);
  assert.equal(stripInvisibleCharacters('a\u200bb\u2066c'), 'abc');
  assert.equal(collapseControlCharacters('a\n\tb'), 'a b');
  assert.equal(isWindowsPath('C:\\work\\a.txt'), true);
  assert.equal(isWindowsPath('\\\\server\\share'), true);
  assert.equal(isWindowsPath('/work/a.txt'), false);
  assert.ok(WINDOWS_DRIVE.test('D:/x') && WINDOWS_UNC.test('//server/x'));
  assert.equal(fileBasename('C:\\work\\notes.md'), 'notes.md');
  assert.equal(fileBasename('/work/app/main.jsx'), 'main.jsx');
  assert.equal(tableRemeasureStride(100), 6);
  // Nothing has marked the page unloading (cds-core's pagehide registration needs a window) or the document torn down.
  assert.equal(pageUnloading(), false);
  assert.equal(documentTearingDown(), false);
  let calls = 0;
  const once = lazyValue(() => ++calls);
  assert.equal(once() + once(), 2);
});
