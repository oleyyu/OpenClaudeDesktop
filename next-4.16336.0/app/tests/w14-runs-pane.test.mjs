import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// W14-code panes-files cccc-20: the Runs pane (3.6556.2 cccc2cf0a Xk → oA / uA / dA / fA / cA → mA / gA / _A / vA / bA /
// lA) and its View options row (c73f45bc3 j_ `y_(k, { icon: Is.runs, label: "Runs" })`), plus the review fix for the
// B32 added-folder read of a missing outside path (electron/main.cjs).
const app = path.resolve(import.meta.dirname, '..');
const official = fs.readFileSync(path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/cccc2cf0a-DhZC33Gc.js'), 'utf8');
let server, Pane, Model, Chord, Tiles;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Pane = await server.ssrLoadModule('/src/source-runs-pane.jsx');
  Model = await server.ssrLoadModule('/src/runs-pane-model.mjs');
  Chord = await server.ssrLoadModule('/src/session-chord-model.mjs');
  Tiles = await server.ssrLoadModule('/src/tile-layout-model.mjs');
});
after(() => server?.close());
const h = React.createElement;
const source = (file) => fs.readFileSync(path.join(app, file), 'utf8');

const HOUR = 3600e3, now = Date.now();
const rows = [{ id: 'daily-check', name: 'Daily check', cron: '0 9 * * *', runs: [
  { threadId: 's-old', startedAt: now - 30 * HOUR, finishedAt: now - 29 * HOUR, status: 'succeeded' },
  { threadId: 's-failed', startedAt: now - 5 * HOUR, finishedAt: now - 5 * HOUR, status: 'failed', error: 'boom' },
  { threadId: 's-live', startedAt: now - HOUR, status: 'running' },
] }];
const sessions = [{ id: 's-old', name: 'Old' }, { id: 's-failed', name: 'Failed' }, { id: 's-live', name: 'Live' }, { id: 'plain', name: 'Plain' }];
const metadata = { 's-old': { scheduledTaskId: 'daily-check' } };

test('runs-pane-model: the session’s task, its runs newest first, split by isRunning (oA sA / f)', () => {
  assert.equal(Model.runsPaneTaskId('s-old', { rows, sessions, metadata }), 'daily-check');
  assert.equal(Model.runsPaneTaskId('s-live', { rows, sessions, metadata }), 'daily-check', 'from the task runs');
  assert.equal(Model.runsPaneTaskId('plain', { rows, sessions, metadata }), null);
  const model = Model.runsPaneModel('s-failed', { rows, sessions, metadata });
  assert.equal(model.task.displayName, 'Daily check');
  assert.deepEqual(model.runs.map((run) => run.sessionId), ['s-live', 's-failed', 's-old']);
  assert.deepEqual(model.running.map((run) => run.sessionId), ['s-live']);
  assert.deepEqual(model.completed.map((run) => run.sessionId), ['s-failed', 's-old']);
  assert.deepEqual(model.runs.map(Model.runStatus), ['running', 'failed', 'succeeded']);
  // The official store keeps a run's scheduledTaskId after its task is deleted: metadata still names the runs.
  const gone = Model.runsPaneModel('s-old', { rows: [], sessions, metadata });
  assert.equal(gone.scheduledTaskId, 'daily-check');
  assert.equal(gone.task, null);
  assert.deepEqual(gone.runs.map((run) => run.sessionId), ['s-old']);
  // c73f45bc3 f_ (local): the View menu's Runs row only for a session a scheduled task started.
  assert.equal(Model.sessionHasRuns('s-old', { sessions, metadata }), true);
  assert.equal(Model.sessionHasRuns('plain', { sessions, metadata }), false);
  assert.equal(Model.runsSessionHref('a b'), '/epitaxy/a%20b?pane=runs');
  assert.equal(Model.runsTaskHref('daily-check'), '/epitaxy/scheduled/daily-check');
});

test('cccc2cf0a oA: header, sections and rows with the original classes and copy', () => {
  const html = renderToStaticMarkup(h(Pane.SourceRunsPane, { sessionId: 's-old', sessions, metadata,
    call: null, subscribe: null }));
  assert.match(html, /<header class="source-pane-header" data-pane-header="runs"><span class="source-pane-title">Runs<\/span>/);
  assert.match(html, /<div data-pane-retry-body="" role="group" aria-label="Runs" class="h-full outline-none">/);
  // Without the task list (still loading here), oA names the task from its id (Mr) and shows no schedule line.
  assert.match(html, /<div class="h-full overflow-y-auto \[scrollbar-gutter:stable_both-edges\]"><div class="flex flex-col gap-sm px-2\.5 py-2\.5">/);
  assert.match(html, /<header class="flex items-start justify-between gap-1\.25"><div class="min-w-0 flex-1 flex flex-col gap-0\.5"><div class="flex items-center gap-1 min-w-0"><h2 class="text-body text-primary truncate">Daily check<\/h2>/);
  assert.match(html, /data-cds="Badge"[^>]*>[\s\S]*?Local/);
  assert.match(html, /<a href="\/epitaxy\/scheduled\/daily-check" class="shrink-0 text-footnote text-muted-as-secondary hover:text-primary no-underline">Details<\/a>/);
  // The metadata run (the current session) is listed under Completed (fA) and marked current.
  assert.match(html, /<section class="flex flex-col gap-1"><h3 class="text-footnote text-muted-as-secondary">Completed<\/h3><ul class="flex flex-col gap-1"><li class="group rounded-lg bg-fill-ghost-selected">/);
  assert.doesNotMatch(html, />Running<\/h3>/, 'an empty section renders nothing');
  assert.doesNotMatch(html, /No runs yet/);
});

test('cccc2cf0a cA → mA: a run row (with the loaded task list)', () => {
  // The SSR pass cannot run the list effect, so the rows render through the model's output directly.
  const { runs } = Model.runsPaneModel('s-failed', { rows, sessions, metadata });
  const rowHtml = renderToStaticMarkup(h('ul', null, runs.map((run) => h(Pane.RunRow, { key: run.sessionId, run, isCurrent: run.sessionId === 's-failed' }))));
  assert.match(rowHtml, /<li class="group rounded-lg bg-fill-ghost-selected"><a href="\/epitaxy\/s-failed\?pane=runs" aria-current="page" class="flex items-center gap-sm no-underline focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus px-2\.5 py-md">/);
  assert.match(rowHtml, /<li class="group rounded-lg bg-alpha-1 hover:bg-alpha-2 focus-within:bg-alpha-2"><a href="\/epitaxy\/s-live\?pane=runs" class=/);
  assert.match(rowHtml, /<span class="shrink-0 flex items-center justify-center size-\[12px\]"><span data-cds="Pulse"/);
  assert.match(rowHtml, /<span class="flex" role="img" aria-label="Failed">/);
  assert.match(rowHtml, /<span class="flex-1 min-w-0 flex flex-col gap-0\.5 text-footnote"><span class="text-body text-primary truncate first-letter:uppercase">/);
  for (const status of ['Running', 'Failed', 'Completed']) assert.match(rowHtml, new RegExp(`>${status}<`));
});

test('cccc2cf0a bA: a session no scheduled task started', () => {
  const html = renderToStaticMarkup(h(Pane.SourceRunsPane, { sessionId: 'plain', sessions, metadata, call: null, subscribe: null }));
  // shared-18 sr (claude_ai_unified_routines; no GrowthBook here, so off) picks the routine wording.
  assert.match(html, /Not a routine run/);
  assert.match(html, /This session wasn’t started from a routine\. Open a session that a routine started to see its run history here\./);
  assert.match(html, /<div class="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center">/);
});

test('the restated class strings and copy are the original text', () => {
  const pane = source('src/source-runs-pane.jsx');
  for (const text of [
    'h-full overflow-y-auto [scrollbar-gutter:stable_both-edges]', 'flex flex-col gap-sm px-2.5 py-2.5',
    'flex items-start justify-between gap-1.25', 'min-w-0 flex-1 flex flex-col gap-0.5', 'flex items-center gap-1 min-w-0',
    'text-body text-primary truncate', 'text-footnote text-muted-as-secondary truncate',
    'shrink-0 text-footnote text-muted-as-secondary hover:text-primary no-underline', 'text-footnote text-muted-as-secondary',
    'flex flex-col gap-1', 'py-1.25 text-footnote text-muted-as-secondary text-center',
    'bg-alpha-1 hover:bg-alpha-2 focus-within:bg-alpha-2', 'flex items-center gap-sm no-underline focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus',
    'shrink-0 flex items-center justify-center size-[12px]', 'text-body text-primary truncate first-letter:uppercase',
    'flex-1 min-w-0 flex flex-col gap-0.5 text-footnote', 'h-full outline-none',
    'No runs yet', 'Not a scheduled task run', 'Not a routine run', 'Details',
    'This session wasn\\u2019t started from a scheduled task. Open a session that a scheduled task started to see its run history here.',
  ]) {
    assert.ok(official.includes(text), `official: ${text}`);
    assert.ok(pane.includes(text.replace('\\u2019', '’')), `host: ${text}`);
  }
});

test('the Runs pane kind, its View options row and main.jsx wiring', () => {
  assert.ok(Tiles.PANE_KINDS.includes('runs'));
  const items = Chord.titlebarViewOptionsItems({ session: true, panes: new Set(['chat', 'runs']), hasRuns: true });
  assert.deepEqual(items.map((item) => [item.kind, item.label, item.icon, item.checked]).at(-1), ['runs', 'Runs', 'Clock', true]);
  assert.equal(Chord.titlebarViewOptionsItems({ session: true, panes: new Set(['chat', 'runs']) }).some((item) => item.kind === 'runs'), false,
    'f_ alone decides (no `|| c.has("runs")`)');
  const main = source('src/main.jsx');
  assert.match(main, /runs: t\("Runs"\) \};/);
  assert.match(main, /hasRuns: mode === "code" && !!menu\.data && sessionHasRuns\(menu\.data\.id, \{ sessions, metadata: sessionMetadata \}\),/);
  assert.match(main, /\) : tileId === "runs" \? \(/);
  // W14-code pa2-05 (3.6556.2 cccc2cf0a mA): ⌘/Ctrl-click → new window, ⌥-click → split view, else open here.
  assert.match(main, /onOpenRun=\{\(id, event\) => \{/);
  assert.match(main, /if \(command && windowActions\.onOpenWindow\) \{ windowActions\.onOpenWindow\(\{ id \}\); return; \}/);
  assert.match(main, /if \(event\?\.altKey && !command && windowActions\.onOpenSplit\) \{ windowActions\.onOpenSplit\(\{ id \}\); return; \}\n\s*navigate\(id\); openPaneTile\("runs", id\);/);
  assert.match(source('src/source-runs-pane.jsx'), /onOpen\?\.\(run\.sessionId, event\)/);
  assert.match(main, /if \(tileId === "runs"\) return false;/);
});

test('B32 review fix: a missing path outside the working folder is still read from an added folder', () => {
  const main = source('electron/main.cjs');
  assert.match(main, /const outside = result\?\.unavailable === "outside_root" \|\| result\?\.unavailable === "missing_outside";/);
  assert.match(main, /const absolute = outside && Array\.isArray\(added\) \? sessionFileAccess\.requestedAbsolute\(root, p\.relative\) : null;/);
  assert.match(main, /return \{ \.\.\.inner, path: p\.relative, \.\.\.\(inner\.unavailable === "missing" \? \{ creatable: false \} : \{\}\) \};/);
});
