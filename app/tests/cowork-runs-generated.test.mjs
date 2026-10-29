import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-runs (research/w13-coworkui.md cwui-21 / cwui-22): the 3.6556.2 Cowork activity panel's Runs (c21f11e6d Ew)
// and Upcoming (eT) sections, generated into src/generated/cowork-runs and fed from local scheduler records
// (src/cowork-runs-model.mjs, src/source-cowork-runs-adapters.jsx). Source only: generator output text, official chunk text
// and SSR; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, generated, adapters, shared, model, i18n, section;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  generated = await server.ssrLoadModule('/src/generated/cowork-runs/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-cowork-runs-adapters.jsx');
  shared = await server.ssrLoadModule('/src/source-routines-shared-adapters.jsx');
  model = await server.ssrLoadModule('/src/cowork-runs-model.mjs');
  section = await server.ssrLoadModule('/src/generated/cowork-progress/cc5a62f6f-CwJjes2b.mjs');
});
after(() => { i18n?.setLocale('en-US'); return server?.close(); });

const HOUR = 3600_000;
const task = (runs) => ({ id: 'task-1', name: 'Morning digest', displayName: 'Morning digest', runs });
const run = (id, threadId, startedAt, extra = {}) => ({ id, threadId, startedAt, finishedAt: startedAt + 60_000, status: 'completed', trigger: 'scheduled', ...extra });
// Inside the panel body AT provides qh = true (the sections drop their own card) and Gh = `o ? ng : Yh` (ng the flat look
// of a header-hosted panel, Yh the default; cc5a62f6f C / S). `panel: false` renders a section on its own.
const wrap = (value, child, { navigate = () => {}, flat = false, panel = true } = {}) => {
  let node = h(adapters.CoworkRunsHost.Provider, { value }, child);
  if (panel) node = h(section.ne.Provider, { value: true }, h(section.w.Provider, { value: flat ? section.C : section.S }, node));
  return h(shared.RoutinesSharedHost.Provider, { value: { navigate, pathname: '', search: '', bridge: undefined, models: [] } }, node);
};
const renderRuns = (data, currentSessionId, options) => renderToStaticMarkup(wrap(data.host,
  data.scheduledTaskId ? h(generated.CoworkRunsSection, { scheduledTaskId: data.scheduledTaskId, currentSessionId, isExpanded: true, onToggle() {} }) : null, options));
const renderUpcoming = (triggers, now, options) => renderToStaticMarkup(wrap({}, h(generated.CoworkUpcomingSection, { triggers, isExpanded: true, onToggle() {}, now }), options));

test('the generated graph pins the official 3.6556.2 roots, call sites and service boundary', () => {
  const manifest = JSON.parse(local('src/generated/cowork-runs/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  assert.deepEqual(manifest.publicNames, { CoworkRunsSection: { file: 'c21f11e6d-Cyd8_HO8.js', local: 'Ew' }, CoworkUpcomingSection: { file: 'c21f11e6d-Cyd8_HO8.js', local: 'eT' } });
  assert.deepEqual(manifest.adapters.map(a => `${a.original}=>${a.name}`).sort(), [
    'shared-2-TF8v67kg.js#OG=>useCoworkRunsReadState', 'shared-4-DUB1Oi0O.js#R_=>useScheduledTaskSessions', 'shared-4-DUB1Oi0O.js#l_=>useScheduledTaskDisplayName',
    'shared-78-D5Fw2h0a.js#gK=>useDesktopFrame', 'shared-78-D5Fw2h0a.js#yE=>useCoworkScheduledTasksStatus']);
  assert.deepEqual(manifest.pendingDedupe, []);
  // D1: the panel Section, row classes and contexts are cowork-progress's; the origin badge and messages cowork-scheduled's.
  const linked = manifest.linkedImports.map(l => `${l.original}=>${l.from}`);
  for (const key of ['cc5a62f6f-CwJjes2b.js#L=>../cowork-progress/cc5a62f6f-CwJjes2b.mjs', 'cc5a62f6f-CwJjes2b.js#w=>../cowork-progress/cc5a62f6f-CwJjes2b.mjs',
    'c1dd841c3-BM8bL70i.js#o=>../cowork-scheduled/c1dd841c3-BM8bL70i.mjs', 'shared-16-ByfgAyLr.js#Xp=>../cowork-scheduled/shared-16-ByfgAyLr.mjs'])
    assert.ok(linked.includes(key), key);
  const c21 = official('c21f11e6d-Cyd8_HO8.js');
  assert.ok(c21.includes('de&&p(Ew,{scheduledTaskId:de,currentSessionId:J,isExpanded:nn,onToggle:()=>rn(!nn)}),p(eT,{triggers:U,isExpanded:an,onToggle:()=>on(!an)})'));
  for (const s of ['{defaultMessage:"Runs",id:"pYmrK6Njpr"}', '{defaultMessage:"Run - {time}",id:"28KG348KqB"}', '{defaultMessage:"Unread completed run",id:"gN5ix3ELxz"}',
    '{defaultMessage:"Upcoming",id:"6/aEFZbs2i"}'])
    assert.equal(c21.split(s).length - 1, 1, s);
  const out = local('src/generated/cowork-runs/c21f11e6d-Cyd8_HO8.mjs');
  for (const s of ['"-mx-2 flex items-center gap-2.5 rounded px-2 py-1.5 df-link-card"', '"min-w-0 flex-1 truncate text-body first-letter:uppercase"',
    '"size-2 shrink-0 rounded-full bg-fill-accent"', 'maxContentHeight: "16rem"', '"flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded"'])
    assert.ok(out.includes(s), s);
});

test('a session a scheduled task started: Runs titled with the task, newest run first, the current run marked', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-b', tasks: [task([run('r1', 'thr-a', now - 3 * HOUR), run('r2', 'thr-b', now - HOUR), run('r3', undefined, now - 2 * HOUR, { status: 'failed' })])] });
  assert.equal(data.scheduledTaskId, 'task-1');
  // The default panel look (Gh = Yh): jw's own header, the task name as title, an "Open scheduled task" link (shared-16 Xp
  // openEntity for a task on this device), Aw rows "Run - {time}" with the current one on bg-surface-0.
  const html = renderRuns(data, 'thr-b');
  assert.match(html, /^<div class="overflow-hidden shrink-0"><div role="button" tabindex="0" aria-expanded="true"/);
  assert.ok(html.includes('<span class="font-medium text-sm text-primary flex items-center gap-1 min-w-0"><span class="truncate">Morning digest</span>'));
  assert.ok(html.includes('<a href="/scheduled-task/task-1" aria-label="Open scheduled task" class="df-link-card inline-flex h-5 w-5 items-center justify-center rounded text-muted-as-secondary hover:text-secondary hover:bg-fill-ghost-hover"'));
  assert.ok(html.includes('style="max-height:16rem"><ul class="flex flex-col gap-px">'));
  const rows = [...html.matchAll(/<li><a href="\/cowork\/([^"]+)" class="([^"]+)">/g)].map(m => [m[1], m[2].endsWith('bg-surface-0 text-primary')]);
  assert.deepEqual(rows, [['thr-b', true], ['thr-a', false]]);
  assert.match(html, /<span>Run - [^<]+<\/span>/);
  // A run without a thread (it failed before a session started) has no row; a scheduled run carries no origin badge.
  assert.doesNotMatch(html, /Manual/);
  // The flat look (Gh = ng, a header-hosted panel): the task chip, History rows with aria-current and the sr-only label.
  const flat = renderRuns(data, 'thr-b', { flat: true });
  assert.ok(flat.includes('<span class="font-medium text-primary min-w-0 truncate text-footnote">Runs</span>'));
  assert.ok(flat.includes('<bdi class="-my-[0.125em] truncate py-[0.125em] leading-3">Morning digest</bdi>'));
  assert.ok(flat.includes('<a href="/cowork/thr-b" aria-current="page" class="-mx-2 flex items-center gap-2.5 rounded px-2 py-1.5 df-link-card bg-neutral-30">'));
  assert.match(flat, /<span class="sr-only">Run - [^<]+<\/span>/);
  assert.ok(flat.includes('<ul role="list" class="-my-1 flex flex-col">'));
  // Outside the panel (qh false) the section takes the desktop-frame card (gK, the same answer as cowork-progress).
  assert.match(renderRuns(data, 'thr-b', { panel: false }), /^<div class="dframe-card rounded-lg bg-\[var\(--df-sidebar-bg,var\(--cds-surface-1\)\)\] \[box-shadow:var\(--df-shadow-card,none\)\] overflow-hidden shrink-0">/);
});

test('a run link and the task link go to the host navigate (RoutinesSharedHost) as the official routes', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-a', tasks: [task([run('r1', 'thr-a', now - HOUR)])] });
  const html = renderRuns(data, 'thr-a');
  assert.ok(html.includes('href="/cowork/thr-a"') && html.includes('href="/scheduled-task/task-1"'));
  assert.deepEqual(model.coworkRunsRoute('/cowork/thr-a'), { kind: 'session', id: 'thr-a' });
  assert.deepEqual(model.coworkRunsRoute('/scheduled-task/task%201'), { kind: 'scheduled-task', id: 'task 1' });
});

test('an unread finished run shows the "Unread completed run" dot; a run started by hand the " · Manual" origin', () => {
  const now = Date.now();
  const data = model.coworkRunsData({ sessionId: 'thr-a', metadata: { 'thr-c': { unread: true } },
    tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR, { trigger: 'manual' })])] });
  const html = renderRuns(data, 'thr-a');
  assert.equal([...html.matchAll(/aria-label="Unread completed run"/g)].length, 1);
  assert.match(html, /href="\/cowork\/thr-c"(?:(?!<\/li>).)*<span class="text-muted-as-secondary"> · Manual<\/span><\/span><span aria-label="Unread completed run" class="size-2 rounded-full bg-fill-accent flex-shrink-0"><\/span>/);
  assert.match(renderRuns(data, 'thr-a', { flat: true }), /<span aria-label="Unread completed run" class="size-2 shrink-0 rounded-full bg-fill-accent"><\/span>/);
  // A running run never shows the dot; neither does a read one.
  const running = model.coworkRunsData({ sessionId: 'thr-a', metadata: { 'thr-c': { unread: true } },
    tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR, { status: 'running' })])] });
  assert.doesNotMatch(renderRuns(running, 'thr-a'), /Unread completed run/);
  const read = model.coworkRunsData({ sessionId: 'thr-a', tasks: [task([run('r1', 'thr-a', now - 2 * HOUR), run('r2', 'thr-c', now - HOUR)])] });
  assert.doesNotMatch(renderRuns(read, 'thr-a'), /Unread completed run/);
});

test('an ordinary session: no scheduled task, so AT does not mount Runs, and Upcoming renders null without triggers', () => {
  const data = model.coworkRunsData({ sessionId: 'thr-x', tasks: [task([run('r1', 'thr-a', Date.now() - HOUR)])] });
  assert.equal(data.scheduledTaskId, undefined);
  assert.deepEqual(data.triggers, []);
  assert.equal(renderRuns(data, 'thr-x'), '');
  assert.equal(renderUpcoming(data.triggers), '');
  // Ew itself returns null for a task without sessions (`f.length === 0 && !l`).
  assert.equal(renderToStaticMarkup(wrap({ scheduledTasks: [], sessions: [], readState: null },
    h(generated.CoworkRunsSection, { scheduledTaskId: 'task-1', currentSessionId: 'thr-x', isExpanded: true, onToggle() {} }))), '');
});

test('Upcoming: future send_later triggers only, "Upcoming" with the count, the message first line', () => {
  const now = new Date('2026-10-28T09:00:00Z');
  const triggers = [{ triggerId: 't-past', fireAt: new Date('2026-10-28T08:00:00Z'), message: 'Gone' },
    { triggerId: 't-1', fireAt: new Date('2026-10-28T12:00:00Z'), message: 'Check the build\nsecond line' }];
  const html = renderUpcoming(triggers, now);
  assert.ok(html.includes('<span class="inline-flex items-center gap-1.5">Upcoming<span class="text-muted-as-secondary">1</span></span>'));
  assert.ok(html.includes('style="max-height:12rem"><ul class="flex flex-col"><li class="flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded">'));
  assert.ok(html.includes('class="text-caption text-muted-as-secondary truncate" title="Check the build\nsecond line">Check the build</span>'));
  assert.doesNotMatch(html, /Gone/);
  // Flat: no count, the Clock glyph row with the time on the right.
  const flat = renderUpcoming(triggers, now, { flat: true });
  assert.ok(flat.includes('<span class="inline-flex items-center gap-1.5">Upcoming</span>'));
  assert.ok(flat.includes('<li class="flex items-center gap-2.5 py-1.5" title="Check the build\nsecond line">'));
  // Only past triggers: null.
  assert.equal(renderUpcoming(triggers.slice(0, 1), now), '');
});

test('zh-CN: the section titles, the run label and the unread label are translated', () => {
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
    assert.match(renderRuns(data, 'thr-a'), /<span>运行 - [^<]+<\/span>/);
    const upcoming = renderUpcoming([{ triggerId: 't', fireAt: new Date(now + HOUR), message: 'm' }], new Date(now));
    assert.notEqual(i18n.t('Upcoming'), 'Upcoming');
    assert.ok(upcoming.includes(`>${i18n.t('Upcoming')}<`));
  } finally { i18n.setLocale('en-US'); }
});
