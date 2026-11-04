// W14-code r4 sidebar-new fr4-06 (fr3-10 / fr2-03): the Code sidebar's Routines section, sliced from 3.6556.2
// (scripts/extract-sidebar-routines.mjs → generated/sidebar-routines: shared-21 m4 / g4 / Q4 / s3 / y3 / JK / hJ / VJ / HJ)
// over the host scheduler (source-sidebar-routines.jsx, source-sidebar-routines-adapters.jsx, sidebar-routines-model.mjs).
//  1. the generator: --check, the roots verbatim, the adapters pinned, the rollback switch;
//  2. the model: the routine runs as the list's items, the unread state, the route;
//  3. the app-level task store: list, reload on the scheduler's event, delete through the bridge;
//  4. SSR: the section inside the session list (header "Routines", one row per enabled task, its newest run's unread
//     decoration), a disabled task with a live run as a group (renderGroup), hJ / VJ (Show › Routines) over the runs.
// Hover, menus, the delete dialog and Show › Routines in the real menu open only in a browser: GUI acceptance.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { routineRunEntries, routineRunFacts, routineUnreadState, routinesPathname } from '../src/sidebar-routines-model.mjs';
import { codeScheduledTask } from '../src/code-routine-model.mjs';
import { hostGrowthBookFlag } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const out = path.join(app, 'src/generated/sidebar-routines');
const read = file => fs.readFileSync(file, 'utf8');
const NOW = Date.now();
const rows = [
  { id: 'r1', name: 'Nightly tests', enabled: true, cron: '0 3 * * *', createdAt: NOW - 1e6, lastRunAt: NOW - 1e5, cwd: '/w',
    runs: [{ threadId: 's1', status: 'completed', startedAt: NOW - 2e5, finishedAt: NOW - 1e5 }] },
  { id: 'r2', name: 'Weekly report', enabled: true, cron: '0 9 * * 1', createdAt: NOW - 2e6, cwd: '/w', runs: [] },
  { id: 'r3', name: 'Paused digest', enabled: false, cron: '0 8 * * *', createdAt: NOW - 3e6, cwd: '/w',
    runs: [{ threadId: 's3', status: 'running', startedAt: NOW - 1e4 }] },
  { id: 'r4', name: 'Old paused', enabled: false, cron: '0 7 * * *', createdAt: NOW - 4e6, cwd: '/w',
    runs: [{ threadId: 's4', status: 'completed', startedAt: NOW - 5e6, finishedAt: NOW - 4e6 }] },
];
const sessions = [{ id: 's1', name: 'Run 1' }, { id: 's3', name: 'Paused run' }, { id: 's4', name: 'Old run' }];
const metadata = { s1: { unread: true, explicitUnread: false } };

// ---- 1. the generator ---------------------------------------------------------------------------------------------
test('generator --check: the generated Routines section is the extractor\'s current output', async () => {
  const { extractSidebarRoutines } = await import('../scripts/extract-sidebar-routines.mjs');
  await extractSidebarRoutines({ check: true });
});

test('the roots are the 3.6556.2 originals, verbatim; cloud routines and router are adapter boundaries', () => {
  const manifest = JSON.parse(read(path.join(out, 'manifest.json')));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const section = manifest.modules.find(m => m.target === 'routines-section.mjs');
  assert.equal(path.basename(section.source), 'shared-21-R7LldJ05.js');
  assert.deepEqual(Object.keys(section.exports).sort(), ['HJ', 'JK', 'Q4', 'VJ', 'g4', 'hJ', 'i4', 'm4', 'y3'].sort());
  const shared21 = read(path.join(v3, 'shared-21-R7LldJ05.js'));
  for (const needle of ['function m4(e){return wp()===null?u(Q4,{...e}):u(g4,{...e})}', 'newRuns:{defaultMessage:"{count} new",id:"bS10BvoB3g"}',
    '{collapsed:t,shown:n}=Ux()', 'function hJ(){let{selectedEnvironments:e}=MG(f_(),m_());return JK().some(gJ)&&ys(e,"local")}'])
    assert.ok(shared21.includes(needle), needle);
  assert.ok(read(path.join(v3, 'shared-22-Bwn3sJTG.js')).includes('kind:"code",presentation:bo,onOpenTask:gi,onOpenSession:bi,onOpenRemoteRoutine:xi,renderGroup:Oi'));
  const text = read(path.join(out, 'routines-section.mjs'));
  for (const needle of ['return wp() === null ? u(Q4, { ...e }) : u(g4, { ...e });', 'cn.updateScheduledTaskStatus(e, "deleted")',
    'defaultMessage: "{count} new", id: "bS10BvoB3g"', 'defaultMessage: "Mark all as read", id: "/af+jQ8xvW"', 'renderOverflowMenu: B4,'])
    assert.ok(text.includes(needle), needle);
  assert.doesNotMatch(text, /\bimport\s*\(/, 'no lazy chunk: the inline card (v0 / K$) is an adapter boundary');
  const adapters = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const name of ['useCodeScheduledTasks', 'CCDScheduledTasks', 'RoutineSessionsContext', 'useRoutineUnreadStore', 'confirmRoutineDelete',
    'useRemoteRoutinesAvailable', 'RemoteRoutineRow', 'useRouteSelect', 'useLeaveDeletedRoutine'])
    assert.ok(adapters.has(name), name);
  // The CDS row, its status glyph and the section label are the code-current / sidebar-sections modules the host uses.
  const linked = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'linked').map(i => i.from)));
  for (const from of ['../code-current/sidebar-row-view.mjs', '../code-current/sidebar-status-glyph.mjs', '../sidebar-sections/group-label.mjs', '../sidebar-sections/sections-model.mjs'])
    assert.ok(linked.has(from), from);
});

test('host table: the rollback switch local_sidebar_routines is open; verify-gen is discovered by prepare-ui', () => {
  assert.equal(hostGrowthBookFlag('local_sidebar_routines'), true);
  assert.ok(fs.existsSync(path.join(app, 'scripts/verify-gen-sidebar-routines.mjs')));
  assert.match(read(path.join(app, 'scripts/prepare-ui.mjs')), /verify-gen-\[a-z0-9-\]\+\\\.mjs/);
});

// ---- 2. the model ---------------------------------------------------------------------------------------------------
test('model: the routine runs as shared-11 xC list items (liveStatus, unread, error) with their task', () => {
  const entries = routineRunEntries(rows, { sessions, metadata, state: { approvals: [], active: {} } });
  const byId = Object.fromEntries(entries.map(e => [e.item.ref.id, e]));
  assert.deepEqual(Object.keys(byId).sort(), ['s1', 's3', 's4']);
  assert.equal(byId.s1.scheduledTaskId, 'r1');
  assert.deepEqual([byId.s1.item.liveStatus, byId.s1.item.isUnread, byId.s1.item.hasCompleted, byId.s1.item.title], ['idle', true, true, 'Run 1']);
  assert.deepEqual([byId.s3.item.liveStatus, byId.s3.item.isRunning, byId.s3.item.pendingPermissions], ['running', true, 0]);
  assert.equal(byId.s1.item.updatedAtMs, NOW - 1e5);
  const awaiting = routineRunEntries(rows, { sessions, metadata, state: { approvals: [{ params: { threadId: 's3' } }], active: {} } });
  const s3 = awaiting.find(e => e.item.ref.id === 's3').item;
  assert.deepEqual([s3.liveStatus, s3.pendingPermissions, s3.hasPendingApproval], ['awaiting', 1, true]);
  assert.equal(routineRunFacts(entries).get('s1'), byId.s1.item);
  const failed = routineRunEntries([{ ...rows[0], runs: [{ threadId: 's1', status: 'failed', error: 'boom', startedAt: 1 }] }], { sessions });
  assert.equal(failed[0].item.hasError, true);
});

test('model: unread / explicit unread from sessionMetadata, the route the rows select by', () => {
  assert.deepEqual(routineUnreadState({ a: { unread: true, explicitUnread: true }, b: { unread: true }, c: { unread: false } }),
    { unreadIds: ['a', 'b'], explicitUnreadIds: ['a'] });
  assert.equal(routinesPathname({ section: 'routines', routineId: 'r 1' }), '/code/routines/r%201');
  assert.equal(routinesPathname({ section: 'routines' }), '/code/routines');
  assert.equal(routinesPathname({ section: 'new', sessionId: 's1' }), '/code/s1');
  assert.equal(routinesPathname({ section: 'new' }), '/code');
});

// ---- 3./4. vite SSR ---------------------------------------------------------------------------------------------------
let server, R, A, G, SG, SA;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
  R = await server.ssrLoadModule('/src/source-sidebar-routines.jsx');
  A = await server.ssrLoadModule('/src/source-sidebar-routines-adapters.jsx');
  G = await server.ssrLoadModule('/src/generated/sidebar-routines/routines-section.mjs');
  SG = await server.ssrLoadModule('/src/generated/code-current/sidebar-status-glyph.mjs');
  SA = await server.ssrLoadModule('/src/source-sidebar-sections-adapters.jsx');
});
after(async () => { A?.sidebarRoutinesStore.reset(); await server?.close(); });

test('app-level store: connectSidebarRoutines lists Code tasks, reloads on the scheduler event, deletes through the bridge', async () => {
  const calls = [];
  let list = rows.slice(0, 2), handler = null;
  const call = async (action, payload) => { calls.push([action, payload]); if (payload?.action === 'list') return list; return true; };
  const disconnect = R.connectSidebarRoutines({ call, subscribe: (h) => { handler = h; return () => { handler = null; }; } });
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(A.sidebarRoutinesStore.getState().scheduledTasks.map(t => t.id), ['r1', 'r2']);
  assert.equal(A.sidebarRoutinesStore.getState().hasLastKnownList, true);
  assert.deepEqual(calls[0], ['local-routines', { action: 'list', kind: 'code' }]);
  list = rows;
  handler({ kind: 'local-routines' });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(A.sidebarRoutinesStore.getState().rows.length, 4);
  assert.equal(await A.CCDScheduledTasks.updateScheduledTaskStatus('r2', 'deleted'), true);
  assert.deepEqual(calls.at(-1), ['local-routines', { action: 'delete', id: 'r2' }]);
  disconnect();
  assert.equal(handler, null);
  assert.equal(A.CCDScheduledTasks.updateScheduledTaskStatus, undefined, 'no bridge once disconnected');
});

const seed = () => A.sidebarRoutinesStore.setState({ rows, scheduledTasks: rows.map(codeScheduledTask), hasLastKnownList: true, didResolveCompletely: true, isLoading: false });
const host = (child, extra = {}) => React.createElement(R.SidebarRoutinesHost, { call: undefined, sessions, metadata, state: { approvals: [], active: {} },
  pathname: '/code', onOpenTask() {}, onOpenSession() {}, ...extra }, child);
const inList = (child) => React.createElement(SG.SidebarStatusLayout.Provider, { value: {} }, child);
const text = html => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

test('SSR: Q4 in the session list — "Routines" header, a row per enabled task, a group for a disabled task with a live run', () => {
  seed();
  const groups = [];
  const html = renderToStaticMarkup(host(inList(React.createElement(G.RoutinesSection, {
    renderGroup: (group) => { groups.push(group); return React.createElement('i', { key: group.ref.id, 'data-group': group.ref.id }); },
    onOpenTask() {}, onOpenSession() {}, collapsed: false, onToggleCollapsed() {} }))));
  assert.match(html, /data-select-domain="scheduled"/);
  assert.match(html, /data-row-key="label:scheduled"/);
  assert.match(html, /data-row-key="scheduled-task:r1"/);
  assert.match(html, /data-row-key="scheduled-task:r2"/);
  assert.doesNotMatch(html, /scheduled-task:r4/, 'a disabled task without a live run is not listed');
  assert.deepEqual(groups.map(g => [g.ref.id, g.isRunning, g.source.data.children.map(c => c.ref.id)]), [['r3', true, ['s3']]]);
  assert.match(html, /data-group="r3"/);
  const words = text(html);
  for (const word of ['Routines', 'Nightly tests', 'Weekly report']) assert.ok(words.includes(`|${word}|`), word);
  // Rows are ranked by recency (v4): r1's run is newer than r2's creation.
  assert.ok(html.indexOf('scheduled-task:r1') < html.indexOf('scheduled-task:r2'));
});

test('SSR: collapsed, the section keeps its header only; outside the list context m4 takes Q4 directly', () => {
  seed();
  const html = renderToStaticMarkup(host(inList(React.createElement(G.RoutinesSection, { renderGroup: () => null, collapsed: true, onToggleCollapsed() {}, onOpenTask() {}, onOpenSession() {} }))));
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /scheduled-task:r1/);
  // g4 reads the sections store's routines section: hidden by default (sections-model shown: false), so nothing.
  assert.equal(renderToStaticMarkup(host(inList(React.createElement(R.SidebarRoutinesSection, {})))), '');
});

test('SSR: hJ is true only while a routine run is live (HJ\'s first-render latch then draws Show › Routines); VJ, without an organization, offers it only while the section is shown', () => {
  seed();
  let running, toggle;
  const Probe = ({ open }) => { running = R.useLocalRoutineRunning(); toggle = SA.useSidebarRoutinesToggle(open); return null; };
  renderToStaticMarkup(host(React.createElement(Probe, { open: true })));
  assert.equal(running, true, 's3 is running');
  assert.equal(toggle.label, 'Routines');
  assert.equal(toggle.checked, false, 'the section is hidden by default');
  const idle = rows.map(row => ({ ...row, runs: row.runs.map(run => ({ ...run, status: 'completed', finishedAt: NOW })) }));
  A.sidebarRoutinesStore.setState({ rows: idle, scheduledTasks: idle.map(codeScheduledTask) });
  renderToStaticMarkup(host(React.createElement(Probe, { open: false })));
  assert.equal(running, false);
  assert.equal(toggle.offered, false, 'without an organization: offered only while shown');
  // Outside the host (no routine runs) hJ is false.
  renderToStaticMarkup(React.createElement(Probe, { open: false }));
  assert.equal(running, false);
});

test('SSR: delete asks the host confirmation with fO\'s routine copy; the host answer settles it', async () => {
  seed();
  renderToStaticMarkup(host(null));
  // The confirmation host is installed by an effect (not run in SSR): without it the original resolves "no".
  assert.equal(await A.confirmRoutineDelete('Nightly tests', 'routine', { description: 'x' }), false);
  A.setRoutineConfirmHost(async (request) => request.kind === 'routine' && request.sessionTitle === 'Nightly tests');
  assert.equal(await A.confirmRoutineDelete('Nightly tests', 'routine', { description: 'x' }), true);
  A.setRoutineConfirmHost(null);
  const source = read(path.join(app, 'src/source-sidebar-routines.jsx'));
  assert.ok(source.includes("t('Delete scheduled task?') : t('Delete routine?')"));
  const shared46 = read(path.join(v3, 'shared-46-BIbZBGFq.js'));
  assert.ok(shared46.includes('routine:{defaultMessage:"Delete routine?",id:"9QpIaEAMM6"}'));
});

test('wiring: main.jsx wraps the sidebar in SidebarRoutinesHost; the filter menu passes VJ(open)', () => {
  const main = read(path.join(app, 'src/main.jsx'));
  assert.match(main, /<SidebarRoutinesHost call=\{call\} onEvent=\{api\?\.onEvent\}/);
  assert.match(main, /<\/SidebarRoutinesHost><\/SourceSidebarBoundary>/);
  assert.match(read(path.join(app, 'src/source-sidebar-filter-current.jsx')), /useSidebarRoutinesToggle\(open\)/);
  const adapters = read(path.join(app, 'src/source-sidebar-sections-adapters.jsx'));
  assert.match(adapters, /export \{ SidebarShowToggleItem \} from '\.\/generated\/sidebar-routines\/routines-section\.mjs';/);
});

// ---- W14-code r4 gen-final-4 (fr4-06 follow-up): renderGroup (shared-22 Oi) and routine runs out of Sessions ---------
test('renderGroup: shared-22 Oi → pC scheduled-task (leading icon shared-21 $1 → shared-20 YT, sliced) is the default group renderer', () => {
  const shared22 = read(path.join(v3, 'shared-22-Bwn3sJTG.js'));
  for (const needle of ['Oi=J1($,280,n)?K1($,280,n,e=>o(xC,{session:e,section:"recents",onOpen:n},wn(e.ref)))', 'n.session.ref.kind==="scheduled-task"?o(vC,{...n})',
    'variant:"session",selected:I,href:O,...A,icon:yg(t),onClick:W,children:S})', 'onClickCapture:G,children:[q,me]'])
    assert.ok(shared22.includes(needle), needle);
  // a0: in the session list a scheduled-task row's icon leads unless the list is text-first.
  assert.ok(read(path.join(v3, 'shared-21-R7LldJ05.js')).includes('case"scheduled-task":return t.textFirst?"trailing":"leading"'));
  const manifest = JSON.parse(read(path.join(out, 'manifest.json')));
  assert.deepEqual(manifest.modules.find(m => m.target === 'shared-20.mjs').exports, { YT: 'routineGroupIcon' });
  const icon = read(path.join(out, 'shared-20.mjs'));
  assert.ok(icon.includes('let t = e.children[0];') && icon.includes('import { sj as Zs } from "./shared-18.mjs";'));
  const adapters = new Set(manifest.modules.flatMap(m => m.imports.filter(i => i.kind === 'adapter').map(i => i.name)));
  for (const name of ['useRoutineRunDisplayState', 'SidebarCodeErrorGlyph', 'useKindGlyphStatus']) assert.ok(adapters.has(name), name);
  const host = read(path.join(app, 'src/source-sidebar-routines.jsx'));
  assert.match(host, /export function SidebarRoutinesSection\(\{ renderGroup = renderRoutineGroup,/);
});

test('SSR: a disabled task with a live run is the group row — the CDS session row, the run\'s status leading, the task name, focused on its page', () => {
  seed();
  const render = (pathname) => renderToStaticMarkup(host(inList(React.createElement(G.RoutinesSection, {
    renderGroup: R.renderRoutineGroup, onOpenTask() {}, onOpenSession() {}, collapsed: false, onToggleCollapsed() {} })), { pathname }));
  const html = render('/code');
  const row = html.slice(html.indexOf('<div data-row-key="scheduled-task:r3"'));
  assert.match(row, /^<div data-row-key="scheduled-task:r3" data-jump-hint-row="" class="relative df-drag-shiftable"><button type="button" data-row=""/);
  assert.match(row, /<span class="df-leading-slot[^"]*"><span role="status" aria-label="Running"[^>]*><span class="status-dot" data-kind="running">/);
  assert.ok(text(row).includes('|Paused digest|'));
  assert.doesNotMatch(row.slice(0, row.indexOf('</button>')), /data-selected=/);
  const open = render('/code/routines/r3');
  const focused = open.slice(open.indexOf('<div data-row-key="scheduled-task:r3"'));
  assert.match(focused.slice(0, focused.indexOf('</button>')), /data-selected="focused"/);
  // The flat rows stay y3's (no group row for an enabled task); r4 (disabled, no live run) is hidden (BK "hidden").
  assert.equal((html.match(/data-row-key="scheduled-task:r3"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /scheduled-task:r4/);
});

test('routine runs are no Sessions rows (shared-11 pw scheduledTaskId): the task comes from metadata or the scheduler\'s runs', async () => {
  const { listedSidebarSessions } = await import('../src/nested-less-side-chats.mjs');
  const list = [{ id: 'plain', name: 'Plain' }, { id: 's1', name: 'Run 1' }, { id: 'tagged', name: 'Tagged' }];
  const runTasks = new Map([['s1', 'r1']]);
  assert.deepEqual(listedSidebarSessions(list, { tagged: { scheduledTaskId: 'r2' } }, null, false, runTasks).map(s => s.id), ['plain']);
  assert.deepEqual(listedSidebarSessions(list, {}, null, false).map(s => s.id), ['plain', 's1', 'tagged'], 'no host: unchanged');
  seed();
  let tasks;
  const Probe = () => { tasks = R.useRoutineRunTasks(); return null; };
  renderToStaticMarkup(host(React.createElement(Probe)));
  assert.deepEqual([...tasks].sort(), [['s1', 'r1'], ['s3', 'r3'], ['s4', 'r4']]);
  renderToStaticMarkup(React.createElement(Probe));
  assert.equal(tasks.size, 0, 'outside the host (or the switch off) nothing is excluded by runs');
  assert.match(read(path.join(app, 'src/source-sidebar.jsx')), /listedSidebarSessions\(sourceSessions, sessionMetadata, engine, sideChatRowsShown, routineRunTasks\)/);
});
