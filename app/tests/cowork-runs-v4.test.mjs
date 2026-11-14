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
import { extractCoworkRunsV4, ROOTS, HOST_ADAPTERS, CDS_CORE_MANIFEST_SHA256 } from '../scripts/extract-cowork-runs-v4.mjs';

// account2 batch 6, region cowork-runs: the 4.16336.0 Cowork activity panel's Runs (c21f11e6d gT) and Upcoming (WT)
// sections (scripts/extract-cowork-runs-v4.mjs -> src/generated/cowork-runs-v4, staged next to the 3.6556.2
// src/generated/cowork-runs the host still renders), fed from the local scheduler records through the existing host
// adapters (src/cowork-runs-model.mjs, src/source-cowork-runs-adapters.jsx) inside the cowork-progress-v4 panel contexts.
// Source only: manifest, the generator's --check, the official chunk text, D1 links, and SSR through Vite.
const app = path.resolve(import.meta.dirname, '..');
const ion = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist');
const official = name => fs.readFileSync(path.join(ion, 'assets/v1', name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const out = 'src/generated/cowork-runs-v4';
const manifest = JSON.parse(local(`${out}/manifest.json`));
const provenance = JSON.parse(local(`${out}/provenance.json`));

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, adapters, shared, model, panel, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule(`/${out}/index.mjs`);
  adapters = await server.ssrLoadModule('/src/source-cowork-runs-adapters.jsx');
  shared = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  model = await server.ssrLoadModule('/src/cowork-runs-model.mjs');
  panel = await server.ssrLoadModule('/src/generated/cowork-progress-v4/index.mjs');
});
after(async () => { i18n?.setLocale('en-US'); await closeWhenSettled(server); await server.close(); });

const HOUR = 3600_000;
const task = runs => ({ id: 'task-1', name: 'Morning digest', displayName: 'Morning digest', runs });
const run = (id, threadId, startedAt, extra = {}) => ({ id, threadId, startedAt, finishedAt: startedAt + 60_000, status: 'completed', trigger: 'scheduled', ...extra });
// Inside the activity panel the sections read cowork-progress-v4's merged context (true: no own card) and its layout
// context (flat for a header-hosted panel, card otherwise); `merged: false` renders a section on its own.
const wrap = (value, child, { flat = false, merged = true, navigate = () => {} } = {}) => {
  let node = h(adapters.CoworkRunsHost.Provider, { value }, child);
  node = h(panel.CoworkPanelLayoutContext.Provider, { value: flat ? panel.coworkPanelFlatLayout : panel.coworkPanelCardLayout }, node);
  if (merged) node = h(panel.CoworkPanelMergedContext.Provider, { value: true }, node);
  return h(shared.RoutinesSharedHost.Provider, { value: { navigate, pathname: '', search: '', bridge: undefined, models: [] } }, node);
};
const renderRuns = (data, currentSessionId, options, extra = {}) => renderToStaticMarkup(wrap(data.host,
  h(gen.CoworkRunsSection, { scheduledTaskId: data.scheduledTaskId, currentSessionId, isExpanded: true, onToggle() {}, ...extra }), options));
const renderUpcoming = (triggers, now, options) => renderToStaticMarkup(wrap({}, h(gen.CoworkUpcomingSection, { triggers, isExpanded: true, onToggle() {}, now }), options));

test('manifest: 4.16336.0 snapshot, cds-core shared graph, linked areas, chunk and module hashes; --check', async () => {
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-4.16336.0-20261104');
  assert.equal(manifest.generator, 'scripts/extract-cowork-runs-v4.mjs');
  assert.equal(manifest.adapterModule, 'src/source-cowork-runs-v4-adapters.jsx');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.deepEqual(manifest.linkedAreas, ['cowork-progress-v4', 'cowork-scheduled-v4', 'routines-shared-v4']);
  assert.equal(provenance.sharedGraph.manifestSha256, CDS_CORE_MANIFEST_SHA256);
  assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated/cds-core/manifest.json'))), CDS_CORE_MANIFEST_SHA256);
  for (const [area, pinned] of Object.entries(provenance.linkedAreas))
    assert.equal(sha(fs.readFileSync(path.join(app, 'src/generated', area, 'manifest.json'))), pinned, area);
  for (const mod of manifest.modules) {
    assert.equal(mod.referenceVersion, '4.16336.0', mod.target);
    assert.equal(mod.sourceSha256, sha(fs.readFileSync(path.join(ion, 'assets/v1', mod.source))), mod.source);
    assert.equal(mod.sha256, sha(local(`${out}/${mod.target}`)), mod.target);
  }
  await extractCoworkRunsV4({ check: true });
});

test('roots: the 3.6556.2 semantic names, AST-located and pinned; the panel mounts them as pinned', () => {
  assert.deepEqual(provenance.roots.map(r => `${r.file}#${r.local}=${r.name}`), ['c21f11e6d-Cyj5xu_D.js#gT=CoworkRunsSection', 'c21f11e6d-Cyj5xu_D.js#WT=CoworkUpcomingSection']);
  assert.ok(provenance.roots.every(r => r.pinned && r.export === null), 'chunk-internal, pinned');
  for (const r of provenance.roots) assert.ok(official(r.file).includes(ROOTS[r.file][r.local].probe), `${r.file}#${r.local} probe`);
  // Same public names as the 3.6556.2 graph (nothing removed upstream).
  assert.deepEqual(Object.keys(JSON.parse(local('src/generated/cowork-runs/manifest.json')).publicNames).sort(), provenance.roots.map(r => r.name).sort());
  for (const r of provenance.roots) assert.equal(typeof gen[r.name], 'function', r.name);
  const c21 = official('c21f11e6d-Cyj5xu_D.js');
  for (const s of ['de&&p(gT,{scheduledTaskId:de,currentSessionId:fe??q,isExpanded:fr,onToggle:()=>pr(!fr),onListedChange:Na})', 'p(WT,{triggers:H,isExpanded:mr,onToggle:Ls})',
    '{defaultMessage:"Runs",id:"pYmrK6Njpr"}', '{defaultMessage:"Run - {time}",id:"28KG348KqB"}', '{defaultMessage:"Unread completed run",id:"gN5ix3ELxz"}',
    '{defaultMessage:"Upcoming",id:"6/aEFZbs2i"}'])
    assert.equal(c21.split(s).length - 1, 1, s);
  assert.deepEqual(manifest.callSites.map(c => c.source), ['c21f11e6d-Cyj5xu_D.js', 'c21f11e6d-Cyj5xu_D.js', 'c21f11e6d-Cyj5xu_D.js', 'cb1e253a0-Ct0IcfPp.js']);
});

test('host boundaries: each adapted original pinned, re-exported unchanged from the host adapter that documents it', () => {
  assert.deepEqual(provenance.adapters.map(a => `${a.original.replace(/-[\w-]{8}\.js#/, '#')}=${a.name}`), [
    'shared-123#By=useCoworkScheduledTasksStatus', 'shared-31#Yp=useScheduledTaskDisplayName', 'shared-31#Tm=useScheduledTaskSessions',
    'shared-2#wH=useCoworkRunsReadState', 'shared-123#_L=useDesktopFrame', 'shared-25#Ky=RouterLink', 'vendor-intl#q=useIntl', 'vendor-intl#Gt=FormattedMessage']);
  assert.ok(provenance.adapters.every(a => a.pinned));
  assert.equal(Object.keys(HOST_ADAPTERS).length, provenance.adapters.length);
  const used = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => `${i.via.split(/[:#]/)[0]}#${i.original}`)));
  assert.deepEqual([...used].sort(), Object.keys(HOST_ADAPTERS).sort());
  for (const m of manifest.modules) for (const i of m.imports.filter(i => i.kind === 'adapter')) assert.equal(i.from, '../../source-cowork-runs-v4-adapters.jsx');
  const adapterText = local('src/source-cowork-runs-v4-adapters.jsx');
  assert.doesNotMatch(adapterText, /^export (const|function|class|default)/m);
  assert.deepEqual([...adapterText.matchAll(/from "([^"]+)"/g)].map(m => m[1]),
    ['./source-cowork-runs-adapters.jsx', './source-cowork-progress-v3-adapters.jsx', './source-routines-shared-adapters.jsx']);
});

test('D1: bindings the linked areas hold are imported from them, never cut again; only the reviewed pure copies', () => {
  const held = new Map();
  for (const area of manifest.linkedAreas) {
    const m = JSON.parse(local(`src/generated/${area}/manifest.json`));
    for (const mod of m.modules) for (const b of mod.bindings ?? []) held.set(`${path.basename(mod.source)}#${typeof b === 'string' ? b : b.name}`, area);
  }
  const own = manifest.modules.flatMap(mod => mod.bindings.map(b => `${mod.source}#${b.name}`));
  assert.deepEqual(own.filter(k => held.has(k)).sort(), Object.keys(provenance.linkedCopies).sort(), 'only the pure linkedCopies are cut again');
  const linked = manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from.split('/')[1]));
  for (const area of manifest.linkedAreas) assert.ok(linked.includes(area), `links ${area}`);
  // The panel section, its contexts and row classes are cowork-progress-v4's; the unread rule, the relative time and the
  // "now" ticker routines-shared-v4's; the origin badge cowork-scheduled-v4's.
  const imports = new Map(manifest.modules.flatMap(m => m.imports).map(i => [i.local, i]));
  for (const [localName, from] of [['t_', 'cowork-progress-v4'], ['e_', 'cowork-progress-v4'], ['Kg', 'cowork-progress-v4'], ['qg', 'cowork-progress-v4'],
    ['nc', 'routines-shared-v4'], ['Bc', 'routines-shared-v4'], ['Zi', 'routines-shared-v4'], ['M_', 'cowork-scheduled-v4']])
    assert.equal(imports.get(localName)?.from.split('/')[1], from, localName);
  // What this graph cuts outside the roots' chunk: pure helpers and constants only.
  assert.deepEqual(manifest.modules.filter(m => m.source !== 'c21f11e6d-Cyj5xu_D.js').map(m => `${m.target}:${m.bindings.map(b => b.name).sort().join(',')}`).sort(),
    ['shared-0.mjs:Kc,qc', 'shared-120.mjs:Ze', 'shared-62.mjs:Fd,ql', 'shared-92.mjs:xW']);
  // The Runs card surface class (cc5a62f6f ie) is linked from cowork-progress-v4 (its linkExports), never cut again here.
  assert.deepEqual(provenance.linkedCopies, {});
  assert.equal(imports.get('a_')?.from, '../cowork-progress-v4/cc5a62f6f.mjs', 'a_ (cc5a62f6f ie)');
  assert.equal(imports.get('a_')?.name, 'ie', 'a_ (cc5a62f6f ie)');
});

test('the staged double output: the 3.6556.2 graph is still the one the host reads', () => {
  const old = JSON.parse(local('src/generated/cowork-runs/manifest.json'));
  assert.equal(old.referenceVersion, '3.6556.2');
  for (const name of fs.readdirSync(path.join(app, 'src'))) {
    if (!/\.(jsx|mjs|js)$/.test(name) || name === 'source-cowork-runs-v4-adapters.jsx') continue;
    assert.ok(!local(`src/${name}`).includes('generated/cowork-runs-v4'), `src/${name} does not import the staged graph`);
  }
});

test('SSR: a session a scheduled task started (card layout): task title, open-task link, newest run first, the current run', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-b', tasks: [task([run('r1', 'thr-a', now - 3 * HOUR), run('r2', 'thr-b', now - HOUR), run('r3', undefined, now - 2 * HOUR, { status: 'failed' })])] });
  assert.equal(data.scheduledTaskId, 'task-1');
  const listed = [];
  const html = renderRuns(data, 'thr-b', {}, { onListedChange: v => listed.push(v) });
  assert.match(html, /^<div class="overflow-hidden shrink-0"><div role="button" tabindex="0" aria-expanded="true"/);
  assert.ok(html.includes('<span class="truncate">Morning digest</span>'));
  assert.ok(html.includes('<a href="/scheduled-task/task-1" aria-label="Open scheduled task" class="df-link-card inline-flex h-5 w-5 items-center justify-center rounded text-muted-as-secondary hover:text-secondary hover:bg-fill-ghost-hover"'));
  assert.ok(html.includes('style="max-height:16rem"><ul role="list" class="flex flex-col gap-px">'));
  const rows = [...html.matchAll(/<li><a href="\/cowork\/([^"]+)" class="([^"]+)">/g)].map(m => [m[1], m[2].endsWith('bg-surface-0 text-primary')]);
  assert.deepEqual(rows, [['thr-b', true], ['thr-a', false]]);
  assert.match(html, /<span>Run - [^<]+<\/span>/);
  assert.doesNotMatch(html, /Manual/);
  assert.deepEqual(listed, [], 'effects do not run in SSR');
  // Outside the merged panel the section takes the desktop-frame card (_L, the same answer as cowork-progress-v4).
  assert.match(renderRuns(data, 'thr-b', { merged: false }), /^<div class="dframe-card rounded-lg bg-\[var\(--df-sidebar-bg,var\(--cds-surface-1\)\)\] \[box-shadow:var\(--df-shadow-card,none\)\] forced-colors:border/);
});

test('SSR: flat layout: the panel Section header, the task chip, History rows with aria-current and the sr-only label', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-b', tasks: [task([run('r1', 'thr-a', now - 3 * HOUR), run('r2', 'thr-b', now - HOUR)])] });
  const flat = renderRuns(data, 'thr-b', { flat: true });
  assert.ok(flat.includes('data-section-header=""'), 'cowork-progress-v4 CoworkPanelSection');
  assert.ok(flat.includes('<span class="font-medium text-primary min-w-0 truncate text-footnote">Runs</span>'));
  assert.ok(flat.includes('<a href="/scheduled-task/task-1" class="group/task-chip df-link-card inline-flex min-w-0 rounded-chip outline-none focus-visible:shadow-focus"'));
  assert.ok(flat.includes('<bdi class="-my-[0.125em] truncate py-[0.125em] leading-3">Morning digest</bdi>'));
  assert.ok(flat.includes('<a href="/cowork/thr-b" aria-current="page" class="-mx-2 flex items-center gap-2.5 rounded px-2 py-1.5 df-link-card bg-neutral-30">'));
  assert.match(flat, /<span class="sr-only">Run - [^<]+<\/span>/);
  assert.ok(flat.includes('<ul role="list" class="-my-1 flex flex-col">'));
  assert.ok(flat.includes(`<span class="${panel.coworkPanelRow.glyph}">`), 'the panel row glyph class');
});

test('SSR: an unread finished run shows the "Unread completed run" dot; a run started by hand the " · Manual" origin', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-a', metadata: { 'thr-c': { unread: true } },
    tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR, { trigger: 'manual' })])] });
  const html = renderRuns(data, 'thr-a');
  assert.equal([...html.matchAll(/aria-label="Unread completed run"/g)].length, 1);
  assert.match(html, /href="\/cowork\/thr-c"(?:(?!<\/li>).)*<span class="text-muted-as-secondary"> · Manual<\/span><\/span><span aria-label="Unread completed run" class="size-2 rounded-full bg-fill-accent flex-shrink-0"><\/span>/);
  assert.match(renderRuns(data, 'thr-a', { flat: true }), /<span aria-label="Unread completed run" class="size-2 shrink-0 rounded-full bg-fill-accent"><\/span>/);
  const running = model.coworkRunsData({ sessionId: 'thr-a', metadata: { 'thr-c': { unread: true } },
    tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR, { status: 'running' })])] });
  assert.doesNotMatch(renderRuns(running, 'thr-a'), /Unread completed run/);
  const read = model.coworkRunsData({ sessionId: 'thr-a', tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR)])] });
  assert.doesNotMatch(renderRuns(read, 'thr-a'), /Unread completed run/);
});

test('SSR: no runs and nothing loading: Runs renders null; no triggers: Upcoming renders null', () => {
  assert.equal(renderToStaticMarkup(wrap({ scheduledTasks: [], sessions: [], readState: null },
    h(gen.CoworkRunsSection, { scheduledTaskId: 'task-1', currentSessionId: 'thr-x', isExpanded: true, onToggle() {} }))), '');
  assert.equal(renderUpcoming([], new Date()), '');
});

test('SSR: Upcoming: future send_later triggers only, the count in the card layout, the flat Clock rows', () => {
  const now = new Date('2026-10-28T09:00:00Z');
  const triggers = [{ triggerId: 't-past', fireAt: new Date('2026-10-28T08:00:00Z'), message: 'Gone' },
    { triggerId: 't-1', fireAt: new Date('2026-10-28T12:00:00Z'), message: 'Check the build\nsecond line' }];
  const html = renderUpcoming(triggers, now);
  assert.ok(html.includes('data-section-header=""'), 'cowork-progress-v4 CoworkPanelSection');
  assert.ok(html.includes('<span class="inline-flex items-center gap-1.5">Upcoming<span class="text-muted-as-secondary">1</span></span>'));
  assert.ok(html.includes('style="max-height:12rem"><ul role="list" class="flex flex-col"><li class="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded">'));
  assert.ok(html.includes('class="text-caption text-muted-as-secondary truncate" title="Check the build\nsecond line">Check the build</span>'));
  assert.doesNotMatch(html, /Gone/);
  const flat = renderUpcoming(triggers, now, { flat: true });
  assert.ok(flat.includes('<span class="inline-flex items-center gap-1.5">Upcoming</span>'));
  assert.ok(flat.includes('<li class="flex items-center gap-2.5 py-1.5" title="Check the build\nsecond line">'));
  assert.ok(flat.includes(`<span class="${panel.coworkPanelRow.kind}">`), 'the time on the right with the panel row kind class');
  assert.equal(renderUpcoming(triggers.slice(0, 1), now), '');
});

test('SSR zh-CN: the section titles, the run label and the unread label are translated', () => {
  i18n.setLocale('zh-CN');
  try {
    const now = Date.now();
    const data = model.coworkRunsData({ sessionId: 'thr-a', metadata: { 'thr-c': { unread: true } },
      tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR)])] });
    const flat = renderRuns(data, 'thr-a', { flat: true });
    assert.notEqual(i18n.t('Runs'), 'Runs');
    assert.ok(flat.includes(`>${i18n.t('Runs')}</span>`));
    assert.ok(flat.includes(`aria-label="${i18n.t('Unread completed run')}"`));
    assert.match(flat, /<span class="sr-only">运行 - [^<]+<\/span>/);
    const upcoming = renderUpcoming([{ triggerId: 't', fireAt: new Date(now + HOUR), message: 'm' }], new Date(now));
    assert.notEqual(i18n.t('Upcoming'), 'Upcoming');
    assert.ok(upcoming.includes(`>${i18n.t('Upcoming')}<`));
  } finally { i18n.setLocale('en-US'); }
});
