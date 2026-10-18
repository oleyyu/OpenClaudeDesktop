import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCodeRoutines } from '../scripts/extract-code-routines.mjs';

// R4g-routines RT4 (tasks-code-routines WI-4, D32): the 2.42304.0 Code Routines page sliced by
// scripts/extract-code-routines.mjs (cbd6c85c8 zl and its local path, cfc18e0f4 local detail, c0243d234 create page / edit
// dialog, c0fd2fda3 form fields) over src/source-code-routines-adapters.jsx and the routines-shared graph.
const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/generated/code-routines');
const REFERENCE = path.resolve(ROOT, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
let server, page, chunk, adapters, sharedAdapters, createIntl, manifest;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  page = await server.ssrLoadModule('/src/generated/code-routines/index.mjs');
  // Tests may read a chunk module's original locals (host code imports index.mjs only).
  chunk = await server.ssrLoadModule('/src/generated/code-routines/cbd6c85c8-PO73iD62.mjs');
  adapters = await server.ssrLoadModule('/src/source-code-routines-adapters.jsx');
  sharedAdapters = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  ({ kt: createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-Cf4IuK3L.js'));
  manifest = JSON.parse(await fs.readFile(path.join(OUT, 'manifest.json'), 'utf8'));
});
after(() => server?.close());

const intl = () => createIntl({ locale: 'en-US', defaultLocale: 'en-US', messages: {} });
const sharedHost = { navigate() {}, pathname: '/code/routines', search: '', bridge: undefined, models: [] };
const render = (node, host = {}) => renderToStaticMarkup(
  React.createElement(sharedAdapters.RoutinesSharedHost.Provider, { value: { ...sharedHost, bridge: adapters.CCDScheduledTasks } },
    React.createElement(adapters.CodeRoutinesHostProvider, { value: host }, node)));
const text = (html) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('the generated graph is current (--check) and every mapping is accounted for', async () => {
  const checked = await extractCodeRoutines({ check: true });
  assert.equal(checked.referenceVersion, '2.42304.0');
  assert.deepEqual(Object.keys(checked.publicNames).sort(), Object.keys(page).sort());
  assert.equal(Object.keys(checked.publicNames).length, 20);
  for (const { name } of checked.adapters) assert.ok(name in adapters, `adapter ${name} is exported`);
  for (const { name } of checked.sharedAdapters) assert.ok(name in sharedAdapters, `shared adapter ${name} is exported`);
  // Every unreachable branch replaced by an adapter is listed as a host difference with its reason.
  const boundaries = new Set(checked.hostDifferences.map((d) => d.original));
  for (const original of ['cbd6c85c8-PO73iD62.js#Ec', 'cbd6c85c8-PO73iD62.js#Oc', 'cbd6c85c8-PO73iD62.js#Nc', 'cbd6c85c8-PO73iD62.js#Ml',
    'cd1ced056-CT2SxE9T.js#r', 'shared-1-CAAiD7E3.js#UT', 'shared-104-Cqo2-vQh.js#yO', 'shared-78-D6VXYXaQ.js#VW'])
    assert.ok(boundaries.has(original), `${original} is a recorded host difference`);
  for (const difference of checked.hostDifferences) assert.ok(difference.difference.length > 20, difference.original);
  // The graph copies no binding routines-shared or view-tabs holds (one copy of each binding, so contexts stay single).
  const held = new Set();
  for (const dir of ['routines-shared', 'view-tabs']) {
    const other = JSON.parse(await fs.readFile(path.join(ROOT, 'src/generated', dir, 'manifest.json'), 'utf8'));
    for (const mod of other.modules) for (const b of mod.bindings) held.add(`${mod.source}#${typeof b === 'string' ? b : b.name}`);
  }
  for (const mod of checked.modules) for (const b of mod.bindings) assert.ok(!held.has(`${mod.source}#${b.name}`), `${mod.source}#${b.name} is copied twice`);
  assert.ok(checked.modules.some((mod) => mod.imports.some((i) => i.kind === 'routines-shared')), 'imports routines-shared bindings');
  // The reachable lazy surfaces keep their declaration; only the specifier points at the generated module, which carries
  // the export alias `pick` reads.
  assert.deepEqual(checked.lazyImports.map((l) => `${l.declaration}>${l.target}:${l.alias}`).sort(), [
    'cae55dd08-oEwAOna-.js#f>c0243d234-Bc7r1pNg.mjs:EpitaxyLocalRoutineCreateFormEmbed',
    'cbd6c85c8-PO73iD62.js#Dc>c0243d234-Bc7r1pNg.mjs:EpitaxyLocalRoutineCreatePage',
    'cbd6c85c8-PO73iD62.js#kc>cfc18e0f4-Cr7owzD3.mjs:EpitaxyLocalRoutineDetail',
  ]);
  const routeChunk = await fs.readFile(path.join(OUT, 'cbd6c85c8-PO73iD62.mjs'), 'utf8');
  assert.match(routeChunk, /import\("\.\/c0243d234-Bc7r1pNg\.mjs"\)/);
  assert.match(routeChunk, /import\("\.\/cfc18e0f4-Cr7owzD3\.mjs"\)/);
  assert.doesNotMatch(routeChunk, /import\("\.\/c1c5fa449|import\("\.\/cd3378dac/);
  const detailChunk = await fs.readFile(path.join(OUT, 'cfc18e0f4-Cr7owzD3.mjs'), 'utf8');
  assert.match(detailChunk, /export \{ J as EpitaxyLocalRoutineDetail \}/);
});

test('the pinned 2.42304.0 feature strings occur exactly once in their chunks', async () => {
  assert.equal(manifest.callSites.length, 5);
  for (const site of manifest.callSites) {
    const source = await fs.readFile(path.join(REFERENCE, site.source), 'utf8');
    for (const feature of site.features) assert.equal(source.split(feature).length - 1, 1, `${site.source}: ${feature}`);
  }
});

test('an adapter the closure never reaches (an unused mapping) stops generation', async () => {
  await assert.rejects(extractCodeRoutines({ check: true, extraAdapters: { 'cbd6c85c8-PO73iD62.js': { Bl: { name: 'Unused', features: [] } } } }),
    /adapter cbd6c85c8-PO73iD62\.js#Bl is not reached/);
  // A mapping whose original declaration lost its feature string fails too.
  await assert.rejects(extractCodeRoutines({ check: true, extraAdapters: { 'shared-78-D6VXYXaQ.js': { VW: { name: 'useCodeScheduledTasksGate', features: ['no such text'] } } } }),
    /adapter shared-78-D6VXYXaQ\.js#VW lacks "no such text"/);
});

test('Hc words a failed Run now from the [ccdErrorCategory:<cat>] suffix (cov11-01)', () => {
  const { Hc, zc, Bc, Vc } = chunk;
  const toast = (error, m = zc) => Hc({ intl: intl(), m, displayName: 'Nightly tests', billingNotSelfManageable: false, place: undefined }, error, undefined);
  const folder = toast(new Error('Folder not found: /gone [ccdErrorCategory:cwd_not_found]'));
  assert.equal(folder.message, 'Couldn’t start “Nightly tests”. Folder not found.');
  // retryHelps adds "Try again" (network_error is not rate_limit).
  assert.equal(toast(new Error('socket hang up [ccdErrorCategory:network_error]')).message, 'Couldn’t start “Nightly tests”. Connection lost. Try again.');
  // Through the preload's IPC wrapper the suffix still ends the message.
  assert.equal(toast(new Error("Error invoking remote method 'desktop:call': Error: Not a repo [ccdErrorCategory:not_git_repo]")).message,
    'Couldn’t start “Nightly tests”. This folder isn’t a Git repository.');
  // No suffix, or a category in Vc: the generic sentence.
  assert.equal(toast(new Error('core disconnected')).message, 'Couldn’t start “Nightly tests”. Try again.');
  assert.ok(Vc.has('spawn_failed'));
  assert.equal(toast(new Error('spawn ENOENT [ccdErrorCategory:spawn_error_enoent]')).message, 'Couldn’t start “Nightly tests”. Try again.');
  // The Scheduled vocabulary (Bc) says the same with its own messages.
  assert.match(toast(new Error('x [ccdErrorCategory:cwd_not_found]'), Bc).message, /^Couldn’t start “Nightly tests”\. Folder not found\.$/);
  // Run now needs a folder and instructions (Wc).
  assert.equal(chunk.Wc({ cwd: '/repo', prompt: 'go' }), true);
  assert.equal(chunk.Wc({ cwd: '/repo', prompt: '' }), false);
});

test('the list page renders the original frame and waits for the host bridge (loading rows)', () => {
  const html = render(React.createElement(page.CodeRoutinesPage, { scheduledTaskId: undefined, onNavigate() {}, onOpenSession() {} }),
    { bridge: { getAllScheduledTasks: async () => [] } });
  assert.match(html, /^<div class="h-full overflow-y-auto \[scrollbar-gutter:stable\]">/);
  assert.match(html, /data-cds="Page"/);
  // The page band is the host Sessions page's (no frame shell, a desktop top bar): compact.
  assert.match(html, /data-band="compact"/);
  assert.match(text(html), /^Routines Loading/);
  // No cloud pieces: no template grid, no Yours / Templates tabs.
  assert.doesNotMatch(html, /grid w-full grid-cols-1 gap-x-6 gap-y-md md:grid-cols-2/);
  assert.doesNotMatch(text(html), /Templates/);
});

test('new-local mounts the lazy local create page (its original loading frame first), the cloud "new" renders nothing', () => {
  const html = render(React.createElement(page.CodeRoutinesPage, { scheduledTaskId: 'new-local', onNavigate() {}, onOpenSession() {} }),
    { bridge: { getAllScheduledTasks: async () => [] } });
  assert.equal(text(html), 'Routines / New local routine Loading form');
  const cloud = render(React.createElement(page.CodeRoutinesPage, { scheduledTaskId: 'new', onNavigate() {}, onOpenSession() {} }),
    { bridge: { getAllScheduledTasks: async () => [] } });
  assert.doesNotMatch(text(cloud), /New local routine/);
});

test('the local create page renders the original form; no Runs on and no "(Ant only)" here', () => {
  const html = render(React.createElement(page.LocalRoutineCreatePage, { existingNames: new Set(), onBack() {}, onCreated() {} }),
    { bridge: { getAllScheduledTasks: async () => [], createScheduledTask: async () => undefined } });
  const words = text(html);
  for (const part of ['Routines / New local routine', 'Local routines only run while your computer is awake and online.', 'Name *', 'Description *',
    'Instructions', 'Select folder', 'Worktree', 'Schedule', 'Hourly', 'Daily', 'Weekdays', 'Weekly', 'Custom', 'Cancel', 'Create'])
    assert.ok(words.includes(part), part);
  assert.doesNotMatch(words, /Ant only|Runs on/);
});

test('an unknown routine id shows the original detail loading frame until the list resolves', () => {
  const html = render(React.createElement(page.CodeRoutinesPage, { scheduledTaskId: 't1', onNavigate() {}, onOpenSession() {} }),
    { bridge: { getAllScheduledTasks: async () => [] } });
  assert.match(text(html), /Loading (routine|scheduled task)/);
});

test('the module-level bridges answer only what the mounted host provides', () => {
  const start = async () => ({ sessionId: 's1' });
  const branches = async () => ['main'];
  render(React.createElement('div'), { localSessions: { start, getLocalBranches: branches }, bridge: { getAllScheduledTasks: async () => [] } });
  assert.equal(typeof adapters.LocalSessions.start, 'function');
  assert.equal(typeof adapters.LocalSessions.getLocalBranches, 'function');
  assert.equal(adapters.LocalSessions.getAll, undefined);
  assert.equal(typeof adapters.CCDScheduledTasks.getAllScheduledTasks, 'function');
  // hostGaps 5 / 7: no task files and no per-routine approvals unless the host adds them.
  assert.equal(adapters.CCDScheduledTasks.removeApprovedPermission, undefined);
  assert.equal(adapters.CCDScheduledTasks.getScheduledTaskFileContent, undefined);
  assert.equal(adapters.CCDScheduledTasks.createScheduledTask, undefined);
  assert.equal(adapters.FileSystem.browseFolder, undefined);
  render(React.createElement('div'), {});
  assert.equal(adapters.LocalSessions.start, undefined);
});

test('lazySurface keeps the entry / pick contract and the handle state', async () => {
  function Loaded() { return React.createElement('span', null, 'loaded'); }
  const surface = adapters.lazySurface({ entry: { id: 'x', load: async () => ({ Picked: Loaded }) }, pick: (m) => m.Picked,
    options: { loading: () => React.createElement('span', null, 'waiting') } });
  assert.equal(surface.handle.state, 'idle');
  assert.equal(renderToStaticMarkup(React.createElement(surface.Component)), '<span>waiting</span>');
  surface.handle.preload();
  assert.equal(surface.handle.state, 'loading');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(surface.handle.state, 'loaded');
  assert.equal(adapters.viteChunkStylesheets([0, 1]).length, 0);
});

test('the host query answers a disabled query like react-query (pending, not loading, not fetched)', () => {
  let seen;
  function Probe() { seen = adapters.useHostQuery({ queryKey: ['localGitBranches', null, null], queryFn: async () => [], enabled: false }); return null; }
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(seen.data, undefined);
  assert.equal(seen.isPending, true);
  assert.equal(seen.isLoading, false);
  assert.equal(seen.isFetched, false);
  assert.equal(typeof seen.refetch, 'function');
});
