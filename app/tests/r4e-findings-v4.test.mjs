import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import * as v4 from '../scripts/official-4.16336.0.mjs';

// R4e-findings, 4.16336.0 source contract (region plan batch 1, G5 / G6): scripts/extract-r4e-findings.mjs --target
// 4.16336.0 slices the card from the frozen 4.16336.0 snapshot into an isolated graph at the production folder depth
// (analysis/…/regions/batch1/r4e-findings/graph/src/generated/r4e-findings), linking cds-core by its publicNames. The
// production folder stays 3.6556.2 while code-editor, cowork-approval, session-rail and sidebar-hover-card link it by
// their 3.6556.2 identity (cutover not before batch 11). SSR and a small fake DOM over the host adapters
// (src/source-review-findings-adapters.jsx); no browser, no network, no real send.
const app = path.resolve(import.meta.dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const { extractR4eFindings, r4eFindingsIsolatedOutput: directory } = await import('../scripts/extract-r4e-findings.mjs');
const graphRoot = path.resolve(directory, '../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const cdsDirectory = path.join(app, 'src/generated/cds-core');
const cdsManifest = JSON.parse(fs.readFileSync(path.join(cdsDirectory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');

let server, V4, Adapters, FixText, Input, Sanitize, CdsCore;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  V4 = await server.ssrLoadModule(path.join(directory, 'findings-card.mjs'));
  FixText = await server.ssrLoadModule(path.join(directory, 'fix-findings-text.mjs'));
  Input = await server.ssrLoadModule(path.join(directory, 'findings-input.mjs'));
  Sanitize = await server.ssrLoadModule(path.join(directory, 'text-sanitize.mjs'));
  Adapters = await server.ssrLoadModule('/src/source-review-findings-adapters.jsx');
  CdsCore = await server.ssrLoadModule('/src/cds-core.mjs');
});
after(async () => { await server?.close(); });

const FINDINGS = [
  { file: 'src/a.js', line: 12, summary: 'Off by one in `loop` bound.', failure_scenario: 'n = 0 reads past the end', category: 'off_by_one_in_a_long_category_name' },
  { file: 'lib/a.js', summary: 'The handle leaks on every retry of the upload when the server answers with a redirect loop', failure_scenario: 'many opens',
    verdict: 'CONFIRMED' },
  { file: 'lib/b.js', line: 3, summary: 'Race', short_summary: 'Race on close', failure_scenario: '-' },
];
const tool = (id = 'rf1', input = { level: 'high', findings: FINDINGS }) => ({ id, name: 'ReportFindings', status: 'completed', isError: false, input });
function hostRecorder(sessionKey, overrides = {}) {
  const calls = [];
  return { calls, host: { sessionKey, running: false, canViewChanges: true, fileInChanges: () => true,
    openChanges: () => calls.push(['changes']), send: async text => { calls.push(['send', text]); return true; },
    queue: async text => { calls.push(['queue', text]); return true; }, rerun: text => calls.push(['rerun', text]),
    prefill: text => calls.push(['prefill', text]), ...overrides } };
}
// The feed's settled findings tools (dwt: YV.Provider value JV(entries)) around one card, as SourceFindingsCard provides.
const mount = (host, { item = tool(), sessionKey = host?.sessionKey, settled = [item.id], fallback = null, prefill = host?.prefill } = {}) =>
  React.createElement(Adapters.FindingsCardHost.Provider, { value: host },
    React.createElement(V4.SettledFindingsToolsContext.Provider, { value: settled },
      React.createElement(V4.FindingsCard, { tool: item, sessionRef: sessionKey ? { id: sessionKey, type: 'local' } : undefined, onPrefillComposer: prefill, fallback })));

test('generator: the 4.16336.0 isolated graph is the --check output, every module sliced from the frozen snapshot', async () => {
  const checked = await extractR4eFindings({ check: true, target: '4.16336.0' });
  assert.deepEqual(checked, manifest);
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.isolatedGraph.productionOutput, 'src/generated/r4e-findings');
  assert.equal(manifest.isolatedGraph.productionSwitchNotBeforeBatch, 11);
  for (const entry of manifest.modules) {
    assert.equal(entry.referenceVersion, '4.16336.0', entry.target);
    assert.equal(entry.sourceSha256, sha(fs.readFileSync(path.join(reference, entry.source))), entry.source);
    assert.equal(entry.sha256, sha(fs.readFileSync(path.join(directory, entry.target))), entry.target);
    assert.ok(Object.keys(entry.exports).length > 0, `${entry.target} exports something`);
  }
  assert.deepEqual(fs.readdirSync(directory).sort(), [...manifest.modules.map(m => m.target), 'manifest.json'].sort());
  // The graph's links reach the app's own cds-core, host adapter and React (one instance each).
  for (const [link, target] of Object.entries(manifest.isolatedGraph.links))
    assert.equal(fs.readlinkSync(path.join(graphRoot, link)), path.resolve(app, '..', target), link);
});

test('contract: imports are generated, React, host adapter or cds-core publicNames; no view-tabs, no 3.6556.2 area', () => {
  const published = new Map(Object.entries(cdsManifest.publicNames).map(([name, entry]) => [`${entry.target}#${entry.exportName}`, { name, ...entry }]));
  const cdsModules = new Map(cdsManifest.modules.map(m => [m.target, m]));
  const used = new Set();
  for (const entry of manifest.modules) for (const i of entry.imports) {
    assert.ok(['generated', 'react', 'adapter', 'shared-graph'].includes(i.kind), `${entry.target}: ${i.kind}`);
    if (i.kind === 'generated') assert.match(i.from, /^\.\/[\w-]+\.mjs$/);
    if (i.kind === 'react') assert.ok(['react', 'react/jsx-runtime', 'react-dom', 'react/compiler-runtime'].includes(i.from), i.from);
    if (i.kind === 'adapter') assert.equal(i.from, '../../source-review-findings-adapters.jsx');
    if (i.kind === 'shared-graph') {
      const target = i.from.replace('../cds-core/', '');
      const entryName = published.get(`${target}#${i.name}`);
      assert.ok(entryName, `${entry.target}: ${i.name} is a cds-core publicName`);
      // via is `file:export` for an import, `file#local` for a same-chunk declaration cds-core publishes (since cds-core
      // wave 5, e.g. shared-frame Bm getInvisibleCharsPattern).
      assert.equal(`${entryName.file}#${entryName.local}`, i.via.includes('#') ? i.via : i.via.replace(/:.*$/, '') + '#' + i.original);
      used.add(target);
    }
    assert.doesNotMatch(i.from, /view-tabs|routines-shared/);
  }
  // The cds-core modules imported are recorded by their bytes: a regenerated cds-core must be re-checked here.
  assert.deepEqual(Object.keys(manifest.sharedGraphModules).sort(), [...used].sort());
  for (const [target, digest] of Object.entries(manifest.sharedGraphModules)) {
    assert.equal(digest, cdsModules.get(target).sha256, target);
    assert.equal(digest, sha(fs.readFileSync(path.join(cdsDirectory, target))), target);
  }
  // A binding cds-core holds without a public name is sliced again only when it is the same declaration (same hash), and
  // only pure bindings are copied (the generator stops on held module state, D46).
  const held = new Map(cdsManifest.modules.flatMap(m => m.bindings.map(b => [`${path.basename(m.source)}#${b.name}`, b.sha256])));
  let copies = 0;
  for (const entry of manifest.modules) for (const name of entry.heldByCdsCore) {
    const binding = entry.bindings.find(b => b.name === name);
    assert.equal(binding.sha256, held.get(`${entry.source}#${name}`), `${entry.source}#${name}`);
    copies++;
  }
  assert.ok(copies > 0);
  // Module state this graph owns: the card's own context and sets, the head cut's caches and the scroll-restore contexts;
  // none of it is a binding cds-core holds (D46: one owner per piece of state). The constant key set shared-1 vI was owned
  // here until cds-core wave 5, which holds and publishes it (modifierKeys): focus-visible.mjs imports it now. The head
  // cut's caches (ce574895a c / m / s) were owned here until cds-core wave 5b, which holds the chunk and publishes its hook
  // (useHeadTruncationCut): truncated-path.mjs imports it, and head-cut.mjs is no longer written.
  const owned = manifest.modules.flatMap(m => m.ownedState.map(name => `${m.source}#${name}`)).sort();
  assert.deepEqual(owned, ['c96d752d0-D9VB6ArX.js#$V', 'c96d752d0-D9VB6ArX.js#XV', 'c96d752d0-D9VB6ArX.js#YV', 'ccd4c05b4-BnHE4SNJ.js#o', 'ccd4c05b4-BnHE4SNJ.js#s']);
  for (const key of owned) assert.ok(!held.has(key), `${key} is held by cds-core`);
  for (const local of ['c', 'm', 's']) assert.ok(held.has(`ce574895a-AyUKk43x.js#${local}`), `cds-core holds the head cut cache ${local}`);
  assert.ok(!manifest.modules.some(m => m.source === 'ce574895a-AyUKk43x.js'), 'the head cut chunk is not sliced here');
  assert.ok(!fs.existsSync(path.join(directory, 'head-cut.mjs')));
  assert.deepEqual(cdsManifest.publicNames.useHeadTruncationCut, { file: 'ce574895a-AyUKk43x.js', local: '_', target: 'ce574895a.mjs', exportName: '_' });
  assert.deepEqual(manifest.modules.flatMap(m => m.imports.filter(i => i.from === '../cds-core/ce574895a.mjs').map(i => [m.target, i.kind, i.name])), [['truncated-path.mjs', 'shared-graph', '_']]);
  const focusVisible = fs.readFileSync(path.join(directory, 'focus-visible.mjs'), 'utf8');
  assert.match(focusVisible, /^import \{ vI \} from "\.\.\/cds-core\/shared-1\.mjs";$/m);
  assert.doesNotMatch(focusVisible, /^var vI = /m);
  assert.deepEqual(cdsManifest.publicNames.modifierKeys, { file: 'shared-1-D1bGaTaN.js', local: 'vI', target: 'shared-1.mjs', exportName: 'vI' });
  for (const file of fs.readdirSync(directory).filter(f => f.endsWith('.mjs')))
    assert.doesNotMatch(fs.readFileSync(path.join(directory, file), 'utf8'), /\bvI\.(add|delete|clear)\(/, file);
  // A root cds-core publishes is imported by its public name, never sliced again (clsx since the wave3 regeneration).
  const publishedOriginals = new Set(Object.values(cdsManifest.publicNames).map(entry => `${entry.file}#${entry.local}`));
  for (const entry of manifest.modules) for (const local of Object.keys(entry.exports))
    assert.ok(!publishedOriginals.has(`${entry.source}#${local}`), `${entry.target}: ${entry.source}#${local} is a cds-core publicName`);
});

test('roots: the card and its row are c96d752d0 tH / IXe; the fix message, input reader and sanitizers are their 4.16336.0 chunks', () => {
  const byTarget = Object.fromEntries(manifest.modules.map(m => [m.target, m]));
  const card = byTarget['findings-card.mjs'];
  assert.equal(card.source, 'c96d752d0-D9VB6ArX.js');
  assert.deepEqual(card.exports, { tH: 'FindingsCard', IXe: 'FindingRow', GV: 'isFindingsCardTool', KV: 'hasReportedOutcomes', jXe: 'settledFindingsToolIds',
    JV: 'useSettledFindingsToolIds', YV: 'SettledFindingsToolsContext', ZV: 'findingLocation', FXe: 'findingRowSummary', MXe: 'findingsByFile' });
  // memoStoreDeps4 (shared-frame Z4, the React Compiler 4-dep memo) is a cds-core publicName since wave 4: linked, not cut
  // again; so is shared-0 ky (isPlainObject) since wave 5b (once.mjs keeps only Tl).
  assert.deepEqual(card.imports.filter(i => i.kind === 'shared-graph').map(i => i.name).sort(), ['CdsBadge', 'CdsButton', 'CdsOverflowTooltip', 'CdsTooltipProvider', 'clsx', 'ky', 'memoStoreDeps4']);
  assert.deepEqual(cdsManifest.publicNames.isPlainObject, { file: 'shared-0-CnnWnVrT.js', local: 'ky', target: 'shared-0.mjs', exportName: 'ky' });
  assert.ok(card.imports.some(i => i.kind === 'shared-graph' && i.name === 'ky' && i.from === '../cds-core/shared-0.mjs'));
  assert.deepEqual(byTarget['once.mjs'].bindings.map(b => b.name), ['Tl']);
  assert.ok(card.imports.some(i => i.kind === 'shared-graph' && i.name === 'clsx' && i.from === '../cds-core/vendor-frame.mjs' && i.original === 'ke'));
  assert.ok(!byTarget['vendor-frame.mjs'], 'clsx is cds-core\'s, not a local vendor-frame copy');
  assert.ok(card.imports.some(i => i.kind === 'adapter' && i.name === 'useCanActOnFindings' && i.via === 'cd2efac6e-B38TGyig.js:N' && i.original === 'el'));
  assert.equal(byTarget['fix-findings-text.mjs'].source, 'cc8941b7b-C4hsxbbb.js');
  assert.deepEqual(byTarget['fix-findings-text.mjs'].exports, { He: 'fixFindingsText' });
  assert.equal(byTarget['findings-input.mjs'].source, 'cd4f82e77-Cuw99s6A.js');
  assert.equal(byTarget['text-sanitize.mjs'].source, 'shared-212-BHMAi0oa.js');
  assert.equal(byTarget['send-stopped.mjs'].source, 'shared-92-BOgyxePb.js');
  // The compiler helpers keep their official-4.16336.0.mjs names (E3).
  const helpers = byTarget['shared-frame.mjs'].exports;
  for (const { local, name } of Object.values(v4.compilerHelpers)) if (helpers[local]) assert.equal(helpers[local], name);
  // The 4.16336.0 call sites: the feed mounts tH for an owned session's finished ReportFindings (solo and grouped), the
  // feeds provide YV / JV, and the renderer asks for the card ungated.
  assert.deepEqual(manifest.callSites.map(c => c.binding ?? c.source), ['Y$e', 'GW', 'ebt', 'dwt', 'NCt', 'twt', 'c8a3f7430-DpMWXuIz.js', 'cc43287c9-dzfX-J5i.js']);
});

test('production stays 3.6556.2 for the areas that link it by identity', () => {
  const production = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/r4e-findings/manifest.json'), 'utf8'));
  assert.equal(production.referenceVersion, '3.6556.2');
  for (const [area, file] of [['session-rail', 'sleep-band.mjs'], ['sidebar-hover-card', 'awaiting-body.mjs'], ['code-editor', 'side-chat-secrets.mjs'],
    ['code-editor', 'side-chat-context.mjs'], ['cowork-approval', 'c7ff9ff39-DJq8Lm3o.mjs']])
    assert.match(fs.readFileSync(path.join(app, 'src/generated', area, file), 'utf8'), /from "\.\.\/r4e-findings\/[\w-]+\.mjs"/, `${area}/${file}`);
});

test('SSR: 4.16336.0 header, "Findings" group, file labels, badges, inline code and the row caret', () => {
  const { host } = hostRecorder('s-ssr');
  const html = renderToStaticMarkup(mount(host));
  assert.match(html, /^<div tabindex="-1" class="my-\[6px\] flex w-full select-text flex-col gap-1 rounded-lg px-md py-xs shadow-\[inset_0_0_0_1px_var\(--cds-border\)\] focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus">/);
  assert.match(html, /<span role="status" class="sr-only"><\/span>/);
  assert.match(html, /<span class="shrink-0 text-body text-primary">Code review<\/span><span class="min-w-0 truncate text-body text-secondary">High effort, 3 findings<\/span>/);
  assert.match(html, /class="-me-0\.5 flex min-w-0 items-center gap-1 flex-wrap"/);
  assert.match(html, />Apply fixes<\/span><\/button>/);
  assert.match(html, />Walk through in diff<\/span><\/button>/);
  assert.match(html, /text-\[color:var\(--muted-as-secondary,var\(--cds-text-muted\)\)\] hover:text-secondary text-footnote shrink-0/);
  assert.match(html, /<div aria-hidden="true" class="-mx-\[calc\(var\(--cds-pad-md\)-1px\)\] h-px shrink-0 bg-alpha-2"><\/div>/);
  assert.match(html, /<div tabindex="0" role="group" aria-label="Findings" class="max-h-\[400px\] overflow-y-auto -mx-pad-xs grid min-w-0 grid-cols-\[minmax\(0,max-content\)_1fr\] gap-y-0\.75 px-xs">/);
  // Files: lib/a.js and src/a.js share their tail, so both keep the full path; lib/b.js is labelled b.js (NXe). The title
  // is the file.
  assert.deepEqual([...html.matchAll(/<div id="rf1-file-(\d)"[^>]*data-file-ref="([^"]+)"><span dir="ltr"[^>]*title="([^"]+)"[^>]*>(.*?)<\/span><\/div>/g)]
    .map(m => [m[1], m[2], m[3], m[4].replace(/<[^>]+>/g, '')]),
    [['0', 'src/a.js', 'src/a.js', 'src/a.js'], ['1', 'lib/a.js', 'lib/a.js', 'lib/a.js'], ['2', 'lib/b.js', 'lib/b.js', 'b.js']]);
  assert.equal((html.match(/data-cds="Badge"/g) ?? []).length, 3);
  assert.match(html, /max-w-\[7rem\]"><span[^>]*><span data-cds="OverflowTooltip"[^>]*>Off by one in a long category name<\/span>/);
  assert.match(html, />Confirmed<\/span>/);
  assert.match(html, />Unverified<\/span>/);
  // Row text renders inline code (c2ed6676f o) and the sr-only location; the short summary wins; a long summary is cut at a
  // word before 72 characters with an ellipsis.
  assert.match(html, /<span class="sr-only">src\/a\.js:12\. <\/span>Off by one in <code dir="ltr" class="rounded-chip bg-alpha-1 px-xs text-code-regular">loop<\/code> bound<\/span>/, 'FXe trims the closing punctuation');
  assert.match(html, /<span class="sr-only">lib\/b\.js:3\. <\/span>Race on close/);
  assert.match(html, /<span class="sr-only">lib\/a\.js\. <\/span>The handle leaks on every retry of the upload when the server answers…<\/span>/);
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 3);
  assert.equal((html.match(/data-cds="Icon"/g) ?? []).length, 3, 'one caret per row');
});

test('SSR: 4.16336.0 effort and empty headers, re-report fallback, and who may act', () => {
  const { host } = hostRecorder('s-hdr');
  assert.match(renderToStaticMarkup(mount(host, { item: tool('rf-none', { findings: [] }) })), /Code review<\/span><span class="min-w-0 truncate text-body text-secondary">No issues found<\/span>/);
  assert.match(renderToStaticMarkup(mount(host, { item: tool('rf-x', { level: 'xhigh', findings: [] }) })), /Extra high effort, no issues found/);
  assert.match(renderToStaticMarkup(mount(host, { item: tool('rf-m', { findings: [FINDINGS[2]] }) })), />1 finding<\/span>/);
  // A re-report with outcomes is no longer a one-line summary: tH shows its fallback (the tool row).
  const outcome = tool('rf-o', { findings: [{ ...FINDINGS[0], outcome: 'fixed' }] });
  assert.equal(V4.hasReportedOutcomes(outcome), true);
  assert.equal(renderToStaticMarkup(mount(host, { item: outcome, fallback: React.createElement('i', null, 'row') })), '<i>row</i>');
  // An unreadable input is the fallback too.
  assert.equal(renderToStaticMarkup(mount(host, { item: tool('rf-bad', { findings: 'x' }), fallback: React.createElement('i', null, 'row') })), '<i>row</i>');
  // useCanActOnFindings (cd2efac6e el): an archived session or a CLI session ref has no Re-run / Apply; Walk through stays.
  const archived = renderToStaticMarkup(mount({ ...host, archived: true }));
  assert.doesNotMatch(archived, /Apply fixes|Re-run review/);
  assert.match(archived, /Walk through in diff/);
  const cli = renderToStaticMarkup(React.createElement(Adapters.FindingsCardHost.Provider, { value: host },
    React.createElement(V4.SettledFindingsToolsContext.Provider, { value: ['rf1'] },
      React.createElement(V4.FindingsCard, { tool: tool(), sessionRef: { id: 's-hdr', type: 'cli' }, onPrefillComposer: host.prefill, fallback: null }))));
  assert.doesNotMatch(cli, /Apply fixes|Re-run review/);
  // Without the host (another session's card) and without side panes there are no header actions.
  assert.doesNotMatch(renderToStaticMarkup(mount(null, { sessionKey: 's-none' })), /Apply fixes|Walk through/);
  // Only the session's latest settled review has actions.
  assert.doesNotMatch(renderToStaticMarkup(mount(host, { settled: ['rf1', 'rf2'] })), /Apply fixes|Walk through/);
});

test('pure originals: input reading, file labels, settled tools, fix message and mention escapes', () => {
  const read = Input.parseReportFindingsInput({ level: 'high', findings: FINDINGS });
  assert.equal(read.level, 'high');
  assert.equal(read.findings.length, 3);
  assert.equal(read.findings[0].category, 'Off by one in a long category name'.slice(0, 40));
  assert.equal(Input.findingScenario('-'), undefined);
  assert.equal(Input.findingScenario(' many '), 'many');
  assert.deepEqual(V4.findingsByFile(read.findings).map(g => [g.file, g.label, g.entries.map(e => e.index)]),
    [['src/a.js', 'src/a.js', [0]], ['lib/a.js', 'lib/a.js', [1]], ['lib/b.js', 'b.js', [2]]]);
  assert.equal(V4.findingLocation({ file: 'a.js', line: 3 }), 'a.js:3');
  assert.equal(V4.findingRowSummary({ summary: 'x'.repeat(80) + ' tail.' }).endsWith('…'), true);
  const entries = [{ items: [{ kind: 'tools', tools: [tool('a'), tool('b', { findings: [{ ...FINDINGS[0], outcome: 'skipped' }] }), { ...tool('c'), status: 'running' }] }] }];
  assert.deepEqual(V4.settledFindingsToolIds(entries), ['a']);
  assert.equal(V4.isFindingsCardTool(tool()), true);
  assert.equal(V4.isFindingsCardTool({ ...tool(), isError: true }), false);
  // 4.16336.0 He: mentions neutralised (shared-212 zv), reserved transcript tags escaped (cfdc58f68 O), backticks dropped
  // from the path.
  const text = FixText.fixFindingsText([{ file: 'src/a`.js', line: 12, summary: 'Ask @alice about <system-reminder>x</system-reminder>', detail: 'n = 0' }]);
  assert.match(text, /^Apply this code-review finding with the minimal edit\. Don't re-run the review\./);
  assert.ok(text.includes('\n1. `src/a.js:12`\nSummary:\n> Ask ＠alice about <\\~system-reminder>x<\\~/system-reminder>\nFailure scenario:\n> n = 0\n'), text);
  assert.match(text, /add an `outcome`: `fixed`, `no_change_needed` \(the finding was wrong or already handled\), or `skipped`/);
  assert.equal(Sanitize.restoreMentions(Sanitize.neutralizeMentions('ping @bob')), 'ping @bob');
  assert.equal(Sanitize.neutralizeMentions('mail a@b.c'), 'mail a@b.c');
  assert.equal(Sanitize.neutralizeComposerText('/compact now'), '／compact now');
});

// A small fake DOM (as tests/r3b-transcript-turn-edits.test.mjs), with what these components read.
function createDom() {
  const events = {
    addEventListener(type, fn) { (this.__l ??= new Map()).set(type, [...(this.__l.get(type) ?? []), fn]); },
    removeEventListener(type, fn) { const list = this.__l?.get(type); if (list) this.__l.set(type, list.filter(entry => entry !== fn)); },
    dispatchEvent(event) { for (const fn of [...(this.__l?.get(event.type) ?? [])]) fn.call(this, event); return true; },
  };
  const document = Object.assign(Object.create(events), { nodeType: 9, nodeName: '#document', activeElement: null });
  const style = () => {
    const values = new Map();
    return new Proxy({ setProperty(name, value) { values.set(name, String(value)); }, removeProperty(name) { values.delete(name); },
      getPropertyValue(name) { return values.get(name) ?? ''; } }, {
      get(target, key) { return key in target ? target[key] : values.get(key) ?? ''; },
      set(target, key, value) { if (value === '' || value == null) values.delete(key); else values.set(key, String(value)); return true; },
    });
  };
  class Element {
    constructor(tag) {
      Object.assign(this, { tagName: tag.toUpperCase(), nodeName: tag.toUpperCase(), localName: tag, nodeType: 1, namespaceURI: 'http://www.w3.org/1999/xhtml',
        ownerDocument: document, childNodes: [], parentNode: null, attributes: new Map() });
      this.style = style();
    }
    get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get firstChild() { return this.childNodes[0] ?? null; }
    get nextSibling() { const siblings = this.parentNode?.childNodes; return siblings ? siblings[siblings.indexOf(this) + 1] ?? null : null; }
    get isConnected() { for (let at = this; at; at = at.parentNode) if (at === document) return true; return false; }
    set textContent(value) { this.childNodes = value ? [document.createTextNode(value)] : []; }
    get textContent() { return this.childNodes.map(node => (node.nodeType === 3 ? node.nodeValue : node.textContent) ?? '').join(''); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
    hasAttribute(name) { return this.attributes.has(name); }
    removeAttribute(name) { this.attributes.delete(name); }
    appendChild(child) { child.parentNode?.removeChild?.(child); this.childNodes.push(child); child.parentNode = this; return child; }
    insertBefore(child, ref) { child.parentNode?.removeChild?.(child); const index = ref ? this.childNodes.indexOf(ref) : -1; if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child); child.parentNode = this; return child; }
    removeChild(child) { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
    contains(node) { for (let at = node; at; at = at.parentNode) if (at === this) return true; return false; }
    matches() { return false; }
    getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
    focus() { document.activeElement = this; }
    blur() { if (document.activeElement === this) document.activeElement = document.body; }
    find(predicate) {
      if (predicate(this)) return this;
      for (const child of this.childNodes) { const hit = child.nodeType === 1 ? child.find(predicate) : null; if (hit) return hit; }
      return null;
    }
    findAll(predicate, out = []) {
      if (predicate(this)) out.push(this);
      for (const child of this.childNodes) if (child.nodeType === 1) child.findAll(predicate, out);
      return out;
    }
  }
  Object.assign(Element.prototype, events);
  Object.assign(document, {
    createElement: tag => new Element(tag),
    createElementNS: (ns, tag) => Object.assign(new Element(tag), { namespaceURI: ns }),
    createTextNode: text => ({ nodeType: 3, nodeName: '#text', textContent: text, nodeValue: text, ownerDocument: document, parentNode: null }),
    querySelectorAll: () => [],
  });
  document.documentElement = new Element('html');
  document.documentElement.parentNode = document;
  document.body = document.documentElement.appendChild(new Element('body'));
  class ResizeObserver { observe() {} unobserve() {} disconnect() {} }
  // ce574895a g measures text only where Range has getBoundingClientRect; this DOM does not lay out text.
  class Range {}
  const window = Object.assign(Object.create(events), { document, ResizeObserver, Range, location: { pathname: '/' }, HTMLIFrameElement: class {},
    getComputedStyle: () => ({ lineHeight: '20px', direction: 'ltr', width: '0px' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: id => clearTimeout(id) });
  document.defaultView = window;
  return { window, document, Element };
}
async function withDom(run) {
  const dom = createDom();
  const names = ['window', 'document', 'ResizeObserver', 'getComputedStyle', 'Element', 'HTMLElement', 'Node'];
  const saved = names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.assign(dom.window, { Element: dom.Element, HTMLElement: dom.Element, Node: dom.Element, setTimeout, clearTimeout });
  for (const [name, value] of [['window', dom.window], ['document', dom.document], ['ResizeObserver', dom.window.ResizeObserver], ['getComputedStyle', dom.window.getComputedStyle],
    ['Element', dom.Element], ['HTMLElement', dom.Element], ['Node', dom.Element]])
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const container = dom.document.body.appendChild(new dom.Element('div'));
  const root = createRoot(container);
  const error = console.error;
  const logged = [];
  console.error = (...args) => { logged.push(args); };
  try { return await run({ dom, container, root, logged }); }
  finally {
    act(() => root.unmount());
    console.error = error;
    for (const [name, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
}
const reactProps = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))];
// CdsIcon draws its glyph as a private-use character of the icon font.
const visible = node => node.textContent.replace(/[-]/g, '');
const press = element => ({ preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, isPropagationStopped: () => false, currentTarget: element,
  target: element, button: 0, detail: 1, nativeEvent: {} });
const buttons = container => container.findAll(node => node.tagName === 'BUTTON');
const buttonNamed = (container, label) => buttons(container).find(node => visible(node) === label);
const rowButtons = container => buttons(container).filter(node => node.hasAttribute('aria-expanded'));
const click = element => act(() => reactProps(element).onClick(press(element)));
const settle = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));
const badges = container => container.findAll(node => node.getAttribute?.('data-cds') === 'Badge').map(visible);
const statuses = sessionKey => Adapters.reviewFindingsStore.getState().findingStatusBySession[sessionKey] ?? {};

test('DOM: a row expands to its summary, scenario, path and line; Apply fixes sends the 4.16336.0 fix message and marks the findings fixing', async () => {
  await withDom(async ({ container, root }) => {
    const { host, calls } = hostRecorder('s-v4');
    act(() => root.render(mount(host, { item: tool('rf-v4') })));
    const row = rowButtons(container)[0];
    click(row);
    assert.equal(rowButtons(container)[0].getAttribute('aria-expanded'), 'true');
    const body = container.find(node => node.getAttribute?.('class') === 'col-span-full flex min-w-0 flex-col gap-0.75 pb-sm');
    assert.ok(body, 'the expanded body');
    assert.match(visible(body), /Off by one in loop bound\.n = 0 reads past the endsrc\/a\.js:12View in diff/);
    click(buttonNamed(container, 'Apply fixes'));
    await settle();
    const sent = calls.find(entry => entry[0] === 'send');
    assert.ok(sent, 'sent through the host');
    assert.equal(sent[1], FixText.fixFindingsText(FINDINGS.map(f => ({ file: f.file, line: f.line, summary: f.summary, detail: f.failure_scenario }))));
    assert.match(sent[1], /^Apply these 3 code-review findings with the minimal edits\./);
    assert.deepEqual(statuses('s-v4'), { 'finding-rf-v4-0': 'fixing', 'finding-rf-v4-1': 'fixing', 'finding-rf-v4-2': 'fixing' });
    assert.deepEqual(badges(container), ['Fixing…', 'Fixing…', 'Fixing…']);
  });
});
