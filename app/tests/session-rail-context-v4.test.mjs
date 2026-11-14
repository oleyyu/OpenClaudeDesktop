import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionRailContextV4, ROOTS, HOST_ADAPTERS, MEASURED, rawCallSites, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-session-rail-context-v4.mjs';

// account2 batch 6, region session-rail-context: the 4.16336.0 session rail Context section (scripts/extract-session-rail-
// context-v4.mjs -> src/generated/session-rail-context-v4, staged next to the 3.6556.2 src/generated/session-rail-context
// the host still renders). Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR of
// the card / panel / readout through Vite with a fixture host (no user data).
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const read = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/session-rail-context-v4';
const manifest = JSON.parse(read(`${out}/manifest.json`));
const provenance = JSON.parse(read(`${out}/provenance.json`));

let server, gen, Adapters, Usage, savedWindow, savedDocument;
before(async () => {
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  globalThis.document = { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window = { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, localStorage: undefined, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  Adapters = await server.ssrLoadModule('/src/source-session-rail-context-adapters.jsx');
  Usage = await server.ssrLoadModule('/src/source-session-rail-context-v4.jsx');
});
after(async () => { await server.close(); globalThis.window = savedWindow; globalThis.document = savedDocument; });

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-session-rail-context-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-session-rail-context-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['code-composer-v4', 'routines-shared-v4', 'session-rail-kit-v4', 'working-line-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(read(`${out}/${mod.target}`)), mod.target);
  }
  await extractSessionRailContextV4({ check: true });
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned; the 3.6556.2 output stays its own graph', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}${r.export ? `/${r.export}` : ''}`), [
    'c73f45bc3-C7dtUSq8.js#rC=SessionRailContext/u', 'c73f45bc3-C7dtUSq8.js#iC=RailContextCard', 'c73f45bc3-C7dtUSq8.js#nC=railContextRollup',
    'c73f45bc3-C7dtUSq8.js#tC=railContextRowActions', 'c227f4d5e-DGDdGBTz.js#T3=RailContextPanel', 'c227f4d5e-DGDdGBTz.js#X4=contextWindowMax/z',
    'c227f4d5e-DGDdGBTz.js#Q4=contextWindowView', 'c227f4d5e-DGDdGBTz.js#_4=autoCompactWindowOption/G', 'c2d611398-B4PMFQ_p.js#Ye=ContextUsagePanel/t',
    'c2d611398-B4PMFQ_p.js#ce=ContextBreakdown/o', 'c2d611398-B4PMFQ_p.js#Q=contextUsedTokens/c', 'shared-8-BqfCbkJd.js#zZ=contextSummary/A',
    'c6b47b88e-lSBDS3wY.js#o=ReadoutCard/ReadoutCard']);
  assert.ok(provenance.roots.every(r => r.pinned), 'every root declaration is pinned');
  assert.ok(provenance.adapters.every(a => a.pinned), 'every adapted original is pinned');
  for (const r of provenance.roots) {
    assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
    assert.notEqual(gen[r.name], undefined, r.name);
  }
  // every 4.16336.0 root carries a 3.6556.2 export name of the old graph (same semantics)
  const old = JSON.parse(read('src/generated/session-rail-context/manifest.json'));
  const oldNames = new Set(old.modules.flatMap(m => Object.values(m.exports ?? {}).concat(m.bindings?.map(b => b.exportName ?? b.name) ?? [])));
  for (const r of provenance.roots) assert.ok(oldNames.has(r.name), `${r.name} is a 3.6556.2 name`);
  // the generated folder imports nothing of the 3.6556.2 graphs
  for (const name of fs.readdirSync(path.join(app, out)).filter(n => n.endsWith('.mjs')))
    assert.ok(!/from "\.\.\/(session-rail-context|session-rail-kit|working-line|code-composer|routines-shared)\//.test(read(`${out}/${name}`)), name);
});

test('w3 stays a host stand-in: re-measured, its inline branch pinned once; the adapters re-export existing host services', () => {
  assert.equal(provenance.measured.local, 'w3');
  assert.ok(provenance.measured.declarations >= MEASURED.minLocals && provenance.measured.imports >= MEASURED.minImports, JSON.stringify(provenance.measured));
  for (const site of rawCallSites) for (const f of site.features) assert.equal(official(site.source).split(f).length - 1, 1, `${site.source}: ${f.slice(0, 80)}`);
  const adapters = read('src/source-session-rail-context-v4-adapters.jsx');
  for (const a of Object.values(HOST_ADAPTERS)) assert.ok(adapters.includes(a.name), a.name);
  assert.ok(!/^(?:export )?(?:function|const) /m.test(adapters.replace(/^\/\/.*$/gm, '')), 'the adapter module defines nothing itself');
  // the stand-in follows w3's inline expressions (local names kept)
  const usage = read('src/source-session-rail-context-v4.jsx');
  for (const f of ['const P = u === "inline";', 'const Ke = We.kind === "staleEngine" ? We : null;', 'const rt = xe || $e || le !== null;',
    'autoCompactWindowOption(q, { onThisComputer: true }) !== null', 'const r = ht ?? ($e && Ye === null ? 0 : null);',
    'import("./generated/session-rail-context-v4/c6b47b88e.mjs")'])
    assert.ok(usage.includes(f), f);
  // D1: the rail store hooks and the RailCard come from session-rail-kit-v4, not a second copy
  const card = read(`${out}/c73f45bc3.mjs`);
  assert.match(card, /from "\.\.\/session-rail-kit-v4\//);
  assert.ok(!fs.existsSync(path.join(app, out, 'cdbb20c70.mjs')));
});

const HOST = { usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x', running: false, connected: true };

test('SSR (4.16336.0): T3 over Ye\'s rail layout — headline, bar, Compact session, window-only text, a fresh 0%, the breakdown', () => {
  const facts = Adapters.railWindowFacts(HOST);
  const render = props => renderToString(h(Adapters.SessionRailContextHostContext.Provider, { value: HOST }, h(gen.RailContextPanel, props)));
  const base = { sessionRef: { id: 's1', type: 'local' }, onCompact: () => {}, autoCompactSettable: false, contextTokens: 120000, contextTokensOutdated: false, cold: false,
    summary: '120k / 200k', contextPct: 60, contextUsage: null, windowFacts: facts, isFetching: false, staleSince: null, turnRunning: false, noData: false,
    reportDue: false, windowOnly: true, staleEngineNotice: null, expanded: true, onToggle() {}, memoryFileLink: undefined };
  const html = render(base);
  assert.ok(html.includes('60% used'), html);
  assert.match(html, /data-rail-context-summary="" data-rail-context-pct="60"[^>]*>120k \/ 200k</);
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="60"/);
  assert.ok(html.includes('60k until auto-compact'), html);
  assert.ok(html.includes('Compact session'), html);
  assert.ok(html.includes('Send a message to see the breakdown.'), html);
  assert.ok(!render({ ...base, windowOnly: false }).includes('Send a message to see the breakdown.'));
  // h4 off (GrowthBook __gb__2706548410): no auto-compact window row
  assert.ok(!html.includes('steady_goblet'));
  const fresh = render({ ...base, contextTokens: null, summary: '0', contextPct: 0, windowFacts: null, windowOnly: false, onCompact: undefined });
  assert.ok(fresh.includes('0% used'), fresh);
  assert.ok(!fresh.includes('Compact session'), fresh);
  assert.ok(render({ ...base, noData: true, windowOnly: false }).includes('Send a message to see context usage.'));
  const report = { categories: [{ name: 'System prompt', tokens: 6000, kind: 'used', color: 'promptBorder' }, { name: 'Messages', tokens: 14000, kind: 'used', color: 'purple_FOR_SUBAGENTS_ONLY' },
    { name: 'Free space', tokens: 180000, kind: 'free', color: 'promptBorder' }], totalTokens: 20000, rawMaxTokens: 200000, maxTokens: 200000, percentage: 10, mcpTools: [], memoryFiles: [], agents: [] };
  const breakdown = render({ ...base, contextUsage: report, contextTokens: 30000, summary: '30k / 200k', contextPct: 15, windowOnly: false });
  assert.ok(breakdown.includes('data-cds="StackedMeter"'), breakdown);
  assert.ok(breakdown.includes('Since last update'), breakdown);
  assert.ok(!render({ ...base, contextUsage: report, contextTokens: 20000, summary: '20k / 200k', contextPct: 10, windowOnly: false }).includes('Since last update'));
});

test('SSR (4.16336.0): RailContextUsage follows w3\'s inline branch over the host; nothing without a host or outside inline', () => {
  const render = (value, props = {}) => renderToString(h(Adapters.SessionRailContextHostContext.Provider, { value },
    h(Usage.RailContextUsage, { sessionRef: { id: 's1', type: 'local' }, modelId: 'gpt-x', onCompact() {}, presentation: 'inline', inlineOpen: true, ...props })));
  const html = render(HOST);
  assert.ok(html.includes('60% used'), html);
  assert.match(html, /data-rail-context-pct="60"[^>]*>120k \/ 200k</);
  assert.ok(html.includes('Compact session'), html);
  assert.ok(html.includes('Send a message to see the breakdown.'), 'a count over the live window only');
  assert.equal(render(null), '');
  assert.equal(render(HOST, { presentation: 'ring' }), '');
  // running: tA's disabled reason (aA: "Available when Claude finishes this turn")
  assert.ok(render({ ...HOST, running: true }).includes('Available when Claude finishes this turn'));
  // no usage yet and a fresh session: rt via $e, contextPct 0
  assert.ok(render({ ...HOST, usage: null, fresh: true }).includes('0% used'));
  assert.ok(render({ ...HOST, usage: null }).includes('Send a message to see context usage.'));
});

test('SSR (4.16336.0): SessionRailContext renders the kit\'s "Context" RailCard only with a bridge; folded keeps the panel mounted', () => {
  const state = { openComposerMenu: null };
  const scope = { getState: () => state, getInitialState: () => state, subscribe: () => () => {}, setState() {} };
  const render = value => renderToString(h(Adapters.SessionRailContextHostContext.Provider, { value }, h(gen.SessionRailContext, { scopeStore: scope, sessionRef: { id: 's1', type: 'local' } })));
  assert.equal(render(null), '', 'dS: no bridge, no card');
  const folded = render({ ...HOST, onCompact() {} });
  assert.ok(folded.includes('Context'), folded);
  assert.match(folded, /aria-expanded="false"/);
  assert.match(folded, /data-rail-context-summary="" data-rail-context-pct="60"/);
  assert.ok(folded.includes('Compact session'), folded);
});

test('SSR (4.16336.0): ReadoutCard (c6b47b88e o) — the <bdi> heading and the rows; the host loader resolves to it', async () => {
  const rows = [{ id: 'used-0', label: 'Messages', paint: 'var(--cds-chart-categorical-1)', amount: '14k', share: '7%' }, { id: 'free', label: 'Free space', paint: 'var(--cds-chart-reference-tint)', amount: '180k', share: '90%' }];
  const html = renderToString(h(gen.ReadoutCard, { barRef: { current: null }, width: 240, thickness: 8, x: 40, heading: 'Context window', rows, pointedId: 'used-0', above: false, onDismiss() {} }));
  assert.ok(html.includes('<bdi>Context window</bdi>'), html);
  assert.ok(html.includes('Messages') && html.includes('180k'), html);
  const loaded = await Usage.loadStackedMeterReadout();
  assert.equal(loaded.default, (await server.ssrLoadModule(`/${out}/c6b47b88e.mjs`)).ReadoutCard);
});
