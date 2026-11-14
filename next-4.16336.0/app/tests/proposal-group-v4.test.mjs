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
import { extractProposalGroupV4, ROOTS, HOST_ADAPTERS, REMOVED_ROOTS, CDS_CORE_MANIFEST_SHA256, FEED, PANE } from '../scripts/extract-proposal-group-v4.mjs';

// account2 prestage, region proposal-group: the 4.16336.0 suggested-task card (scripts/extract-proposal-group-v4.mjs ->
// src/generated/proposal-group-v4, staged next to the 3.6556.2 src/generated/proposal-group the host still renders).
// Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR of the card through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const out = 'src/generated/proposal-group-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));
const areaName = a => (typeof a === 'string' ? a : a.area);

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };

let server, gen, host, spawnerModule, v4adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  host = await server.ssrLoadModule('/src/source-proposal-group-adapters.jsx');
  v4adapters = await server.ssrLoadModule('/src/source-proposal-group-v4-adapters.jsx');
  spawnerModule = await server.ssrLoadModule('/src/proposal-spawner.mjs');
});
after(async () => { await closeWhenSettled(server); await server.close(); });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-proposal-group-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-proposal-group-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  // W8-RT (cds-integrate/wave8, extract-proposal-group-v4.mjs LINKED_AREAS += 'r3b-tasks'): r3b-tasks, the single owner of
  // shared-0 Tl / shared-212 j_ M_ yv Cv Dv kv / shared-92 mk, is linked too (was: the first five).
  assert.deepEqual(manifest.linkedAreas.map(areaName), ['approval-landing-v4', 'files-changes-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'code-start-v4', 'r3b-tasks']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const a of manifest.linkedAreas)
    assert.equal(provenance.linkedAreas[areaName(a)].manifestSha256, sha(fs.readFileSync(path.join(app, `src/generated/${areaName(a)}/manifest.json`))), areaName(a));
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractProposalGroupV4({ check: true });
});

test('roots: the 3.6556.2 public names, every one AST-located in 4.16336.0 and pinned; none removed', () => {
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  for (const r of provenance.roots) {
    const spec = ROOTS[r.file][r.local];
    if (spec.probe) assert.ok(official(r.file).includes(spec.probe), `${r.file}#${r.local} probe`);
    if (r.export) assert.match(official(r.file), new RegExp(`\\b${r.local.replace('$', '\\$')} as ${r.export.replace('$', '\\$')}\\b`), `${r.file} export ${r.export}`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  const old = Object.keys(JSON.parse(local('src/generated/proposal-group/manifest.json')).publicNames).sort();
  assert.deepEqual(provenance.roots.map(r => r.name).sort(), old, 'the same public names as the 3.6556.2 graph');
  assert.deepEqual(REMOVED_ROOTS, []);
  // startModeNeedsConsent moved to its own chunk (cf059c6df p, exported r).
  assert.ok(provenance.roots.some(r => r.name === 'startModeNeedsConsent' && r.file === 'cf059c6df-B32mQ24C.js' && r.local === 'p' && r.export === 'r'));
});

test('host boundaries: each adapted original pinned; the adapter module re-exports host adapters, plus one widened catalog', () => {
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  assert.equal(provenance.adapters.length, 42);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-proposal-group-v4-adapters.jsx');
  const adapterText = local('src/source-proposal-group-v4-adapters.jsx');
  assert.deepEqual([...adapterText.matchAll(/^export (?:const|function|class|default) ?(\w*)/gm)].map(m => m[1]), ['useModelCatalog']);
  assert.deepEqual([...new Set([...adapterText.matchAll(/from "(\.[^"]+)"/g)].map(m => m[1]))], ['./source-proposal-group-adapters.jsx']);
  assert.equal(HOST_ADAPTERS['shared-1-D1bGaTaN.js#R1'].from, 'src/source-proposal-group-v4-adapters.jsx');
  // The widened members the Options form reads through shared-212 hJ exist in the official factory.
  const s212 = fs.readdirSync(path.join(ion, 'assets/v1')).find(n => /^shared-212-.*\.js$/.test(n));
  assert.ok(official(s212).includes('autoModeCompatible:') && official(s212).includes('autoModeUnavailableNote:'), s212);
});

test('D1: bindings the linked areas hold are imported, never cut again; code-start-v4 c5b9e310e linked, not sliced', () => {
  // held: what the linked modules hold; outside: what a module-restricted area (code-start-v4) holds in modules not linked.
  const held = new Map(), outside = new Map();
  for (const a of manifest.linkedAreas) {
    const area = areaName(a);
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? [])
      (typeof a === 'string' || a.modules.includes(mod.target) ? held : outside).set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)).sort(), Object.keys(provenance.linkedCopies).sort(), 'only the pure linkedCopies are cut again');
  // code-start-v4 exports only c5b9e310e k for linking; its shared-212 text-class helpers, shared-55 rw/iw and cd4fb5ac7 n
  // are cut by both graphs. They are pure functions / lazily built regexes (no state writer: d1-gate --app-only reports 0).
  // W8-RT: shared-212 Cv Dv M_ j_ kv yv left that list: code-start-v4 and this graph both link them from r3b-tasks
  // invisible-character.mjs, their single owner (was: 'Av Bv Cv Dv Fv Iv Jv Lv M_ Nv Pv Rv Sv Yv bv gv j_ jv kv qv vv xv yv zv').
  assert.deepEqual(own.filter(k => outside.has(k)).sort(), ['cd4fb5ac7-DCVeUpE6.js#n',
    ...'Av Bv Fv Iv Jv Lv Nv Pv Rv Sv Yv bv gv jv qv vv xv zv'.split(' ').map(n => `shared-212-BHMAi0oa.js#${n}`),
    'shared-55-BRv2XBP7.js#iw', 'shared-55-BRv2XBP7.js#rw'].sort());
  for (const n of 'Cv Dv M_ j_ kv yv'.split(' ')) assert.ok(!own.includes(`shared-212-BHMAi0oa.js#${n}`), `shared-212 ${n} not cut here`);
  assert.deepEqual([...new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked' && i.from.startsWith('../r3b-tasks/')).map(i => `${i.from}:${i.name}:${i.original}`)))].sort(),
    ['../r3b-tasks/invisible-character.mjs:isHiddenCharacter:kv', '../r3b-tasks/lazy-value.mjs:lazyValue:Tl', '../r3b-tasks/path-basename.mjs:pathBasename:mk']);
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1])));
  for (const a of manifest.linkedAreas) assert.ok(linked.has(areaName(a)), `links ${areaName(a)}`);
  // ca0294fab A/M/j/k (state writers) belong to code-start-v4; this graph reaches them only through c5b9e310e k.
  assert.ok(!manifest.modules.some(m => /^ca0294fab-|^c5b9e310e-/.test(m.source)), 'ca0294fab / c5b9e310e not sliced here');
  const cs = manifest.modules.flatMap(m => m.imports.filter(i => i.from === '../code-start-v4/c5b9e310e.mjs').map(i => i.name));
  assert.deepEqual([...new Set(cs)], ['k']);
  const csManifest = JSON.parse(local('src/generated/code-start-v4/manifest.json'));
  assert.ok(csManifest.modules.some(m => m.target === 'c5b9e310e.mjs' && (m.linkExports ?? []).includes('k')), 'code-start-v4 exports c5b9e310e k for linking');
});

test('the official text: feed rows and the session pane mounts are pinned raw', () => {
  for (const site of manifest.callSites) {
    assert.equal(site.raw, true);
    assert.equal(site.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', site.source))), site.source);
    const chunk = official(site.source);
    for (const f of site.features) assert.ok(chunk.includes(f), `${site.source}: ${f}`);
  }
  assert.deepEqual(manifest.callSites.map(s => s.source), [FEED, PANE]);
  const feed = official(FEED);
  for (const s of ['kind:"turnSuggestions"', 'kind:"unplacedSuggestions"', 'hostDrawsTurnSuggestions']) assert.ok(feed.includes(s), s);
});

const taskId = n => `task_${String(n).padStart(8, '0')}`;
const intl = { formatMessage: (m, v) => m.defaultMessage.replace(/\{(\w+)\}/g, (_, k) => v?.[k] ?? '') };
function fixture({ auto = false } = {}) {
  const tool = n => ({ id: `call_${n}`, name: gen.SPAWN_TASK_TOOL, input: { title: `Task ${n}`, prompt: `Do task ${n}`, tldr: `Short ${n}`, cwd: '/repo' },
    output: `Noted (position ${n}, task_id: ${taskId(n)}).`, status: 'completed', isError: false });
  const tools = [tool(1), tool(2)];
  const queue = tools.map(t => ({ id: gen.proposalTaskId(t), title: t.input.title, prompt: t.input.prompt, tldr: t.input.tldr, cwd: t.input.cwd, createdAt: 1 }));
  const spawner = spawnerModule.createProposalSpawner({
    official: { proposalKey: gen.proposalKey, isOffer: gen.isOfferProposal, crossRepoCwdOf: gen.crossRepoCwdOf, keepSessionMode: gen.keepSessionMode,
      resolvePermissionMode: gen.resolveStartPermissionMode, needsModeConsent: gen.startModeNeedsConsent, hereText: r => gen.proposalHereText(intl, r) },
    spawning: { visible: (q, p) => gen.visibleProposalQueue(q, gen.spawningTaskIds(p)), mark: gen.markProposalSpawning, clear: gen.clearProposalSpawning },
    results: { record: gen.recordProposalOutcome, clear: gen.clearProposalOutcome },
    bridge: { popById: async () => true, sendMessage: async () => {}, start: async () => ({ sessionId: 'local_child' }) }, notify: () => {} });
  spawner.setHost({ sessionId: 'local_p', available: true, queue, session: { originCwd: '/repo', cwd: '/repo', model: 'gpt-5.5', effort: 'medium', permissionMode: 'default' } });
  const value = { sessions: [{ sessionId: 'local_p', title: 'Parent', model: 'gpt-5.5', effort: 'medium', permissionMode: 'default', backgroundTaskSuggestions: queue }],
    catalog: { models: [{ id: 'gpt-5.5', name: 'GPT-5.5', efforts: [{ id: 'medium', recommended: true }] }] }, permissionModes: { auto } };
  const wrap = child => h(host.ProposalHostProvider, { value }, h(gen.ProposalSpawnerContext.Provider, { value: spawner.getSnapshot() }, child));
  return { tools, queue, wrap };
}
const sessionRef = { id: 'local_p', type: 'local' };

test('proposal helpers: task ids from the tool results, the proposing calls of a turn', () => {
  const { tools, queue } = fixture();
  assert.deepEqual(queue.map(q => q.id), [taskId(1), taskId(2)]);
  assert.equal(gen.isProposingTool(tools[0]), true);
  const p = gen.proposingTools([{ kind: 'tools', tools }]);
  assert.equal(p.firstProposingCallId, 'call_1');
  assert.deepEqual(p.tools.map(t => t.id), ['call_1', 'call_2']);
  assert.equal(gen.proposalHereText(intl, queue[0]), 'Do this task here: “Task 1”');
  assert.deepEqual(gen.proposalStartLabels(intl, undefined, false),
    { startLocally: 'Start locally', startWithWorktree: 'Start with worktree', shown: { startLocally: 'Start locally', startWithWorktree: 'Start with worktree' },
      sendToCloud: 'Send to cloud', fixHere: 'Do it here' });
});

test('SSR: TurnProposalGroup renders the official grouped card: header, Start all, one row per task with dismiss', () => {
  const { tools, wrap } = fixture();
  const html = renderToStaticMarkup(wrap(h(gen.TurnProposalGroup, { tools, sessionRef })));
  const words = text(html);
  assert.ok(html.includes('role="group" aria-label="2 suggested tasks"'), 'group label');
  assert.ok(html.includes('max-w-[480px]') && html.includes('rounded-card'), 'card surface');
  assert.ok(words.startsWith('2 suggested tasks'), words.slice(0, 80));
  assert.ok(words.includes('Start all'));
  for (const n of [1, 2]) {
    assert.ok(words.includes(`Task ${n}`) && words.includes(`Short ${n}`), `row ${n}`);
    assert.ok(html.includes(`aria-label="Dismiss suggestion Task ${n}"`), `dismiss ${n}`);
  }
  assert.equal(html.split('data-proposed-task-state="proposed"').length - 1, 2);
});

test('SSR: UnplacedProposalGroup renders the queue leftovers with the same card', () => {
  const { tools, queue, wrap } = fixture();
  const un = renderToStaticMarkup(wrap(h(gen.UnplacedProposalGroup, { tasks: queue, sessionRef })));
  const turn = renderToStaticMarkup(wrap(h(gen.TurnProposalGroup, { tools, sessionRef })));
  assert.ok(un.includes('aria-label="2 suggested tasks"'));
  assert.equal(un.split('data-proposed-task-state="proposed"').length - 1, 2);
  assert.ok(text(un).includes('Task 1') && text(un).includes('Task 2'));
  assert.equal(text(un), text(turn).replace(/\s+/g, ' '), 'same visible text as the turn card');
});

test('useModelCatalog (v4 adapter): the host catalog plus the 4.16336.0 auto-mode members', () => {
  const probe = auto => {
    let cat;
    const P = () => { cat = v4adapters.useModelCatalog(); return null; };
    const { wrap } = fixture({ auto });
    renderToStaticMarkup(wrap(h(P)));
    return cat;
  };
  const off = probe(false), on = probe(true);
  for (const c of [off, on]) {
    assert.equal(typeof c.nameFor, 'function');
    assert.equal(typeof c.entryFor, 'function');
    assert.equal(c.autoModeUnavailableNote('gpt-5.5'), undefined);
  }
  assert.equal(off.autoModeCompatible('gpt-5.5'), false);
  assert.equal(on.autoModeCompatible('gpt-5.5'), true);
});
