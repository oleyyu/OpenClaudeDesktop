import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import {
  startCardPlacement, startCardGroups, startDismissKey, withDismissal, isDismissed, startRowOrder, isLowPriorityRow, startRowFamily, dismissalsPrefKey,
} from '../src/generated/code-start/model.mjs';
import { environmentLastUsed, startEnvironmentRows } from '../src/generated/code-start/environments.mjs';
import { homeRelativePath } from '../src/generated/code-start/home-path.mjs';
import { startAsk, startEnvironmentItems, startEnvironmentRecords, startSessions, startSetupRows, startWaitingSessions } from '../src/code-start-host-model.mjs';

// Tests exercise the official 2.42304.0 algorithms with independent boundary cases and the local service mapping.
test('start-card keeps setup at the height boundary, hides it below it and reserves hysteresis', () => {
  assert.deepEqual(startCardPlacement({ room: 324, rest: 400, environments: 100, setup: 100, hidden: false }), { top: 100, setupFits: true });
  assert.deepEqual(startCardPlacement({ room: 323, rest: 400, environments: 100, setup: 100, hidden: false }), { top: 100, setupFits: false });
  assert.equal(startCardPlacement({ room: 324, rest: 400, environments: 100, setup: 100, hidden: true }).setupFits, false);
  assert.equal(startCardPlacement({ room: 325, rest: 400, environments: 100, setup: 100, hidden: true }).setupFits, true);
  assert.deepEqual(startCardPlacement({ room: 80, rest: 80, environments: 100, setup: 100 }), { top: 0, setupFits: false });
});

const candidate = (id, extra = {}) => ({ facts: { id, ...extra } });
const shape = groups => groups.map(g => g.kind === 'row' ? `row:${g.candidate.facts.id}` : `rest:${g.family}:${g.rest.length}${g.whole ? ':whole' : ''}`);
test('x3 gives each of three groups a seat; a family with no spare seat collapses into a whole rest row', () => {
  const rows = [
    candidate('suggested-task', { item: { id: 't1' } }), candidate('waiting-session', { sessionId: 'a' }), candidate('worktree-apart', { folder: '/r' }),
    candidate('suggested-task', { item: { id: 't2' } }), candidate('resume-session', { sessionId: 'c' }), candidate('waiting-session', { sessionId: 'b' }),
    candidate('suggested-task', { item: { id: 't3' } }), candidate('unknown'),
  ];
  assert.deepEqual(shape(startCardGroups(rows)), ['rest:blocked-sessions:3:whole', 'row:worktree-apart', 'rest:suggested-tasks:3:whole']);
});
test('x3 hands spare seats to the first longer family: rows first, then a partial rest', () => {
  const sessions = ['a', 'b'].map(id => candidate('waiting-session', { sessionId: id }));
  const tasks = ['t1', 't2', 't3'].map(id => candidate('suggested-task', { item: { id } }));
  assert.deepEqual(shape(startCardGroups([...tasks, ...sessions])), ['row:waiting-session', 'row:waiting-session', 'rest:suggested-tasks:3:whole']);
  assert.deepEqual(shape(startCardGroups([sessions[0], ...tasks])), ['row:waiting-session', 'row:suggested-task', 'rest:suggested-tasks:2']);
  const five = ['1', '2', '3', '4', '5'].map(id => candidate('suggested-task', { item: { id } }));
  const [first, second, rest] = startCardGroups(five);
  assert.deepEqual(shape([first, second, rest]), ['row:suggested-task', 'row:suggested-task', 'rest:suggested-tasks:3']);
  assert.deepEqual(rest.rest.map(row => row.facts.item.id), ['3', '4', '5']);
});
test('_3 low-priority rows show only alone; m3 ranks resume before worktree; blockers stay first', () => {
  const low = [candidate('connect-github', { blocksSend: false }), candidate('cli-import'), candidate('auto-mode')];
  assert.deepEqual(shape(startCardGroups(low)), ['row:connect-github', 'row:cli-import', 'row:auto-mode']);
  assert.deepEqual(shape(startCardGroups([...low, candidate('continue-branch')])), ['row:continue-branch']);
  assert.equal(isLowPriorityRow({ id: 'connect-github', blocksSend: true }), false);
  assert.ok(startRowOrder.indexOf('resume-session') < startRowOrder.indexOf('worktree-apart'));
  assert.equal(startRowFamily({ id: 'resume-session' }), 'blocked-sessions');
  const result = startCardGroups([candidate('worktree-apart'), candidate('choose-folder', { blocksSend: true }), candidate('resume-session', { sessionId: 'x' })]);
  assert.deepEqual(shape(result), ['row:choose-folder', 'row:resume-session', 'row:worktree-apart']);
});
test('dismissals are subject-specific and reopen when the state stamp changes', () => {
  const a = startDismissKey({ id: 'waiting-session', sessionId: 'a', stamp: '1' });
  const store = withDismissal({}, a);
  assert.equal(isDismissed(store, a), true);
  assert.equal(isDismissed(store, { ...a, stamp: '2' }), false);
  assert.equal(isDismissed(store, { ...a, subject: 'b' }), false);
  assert.equal(startDismissKey({ id: 'choose-folder', blocksSend: true }), null);
  assert.equal(startDismissKey({ id: 'worktree-apart', taken: true }), null);
  assert.equal(startDismissKey({ id: 'suggested-task' }), null);
  assert.equal(dismissalsPrefKey, 'startCardDismissals');
});
test('dismissal storage is capped at 100 and preserves unstamped choices first', () => {
  let store = withDismissal({}, { row: 'auto-mode' });
  for (let i = 0; i < 110; i++) store = withDismissal(store, { row: 'waiting-session', subject: String(i), stamp: '1' });
  assert.equal(Object.keys(store).length, 100);
  assert.equal(isDismissed(store, { row: 'auto-mode' }), true);
  assert.equal(isDismissed(store, { row: 'waiting-session', subject: '0', stamp: '1' }), false);
  assert.equal(isDismissed(store, { row: 'waiting-session', subject: '109', stamp: '1' }), true);
});
test('f6 shows local folders home-relative; d6 keeps the latest use per key; items keep recent folders (D14)', () => {
  assert.equal(homeRelativePath('/Users/x/a/b'), '~/a/b');
  assert.equal(homeRelativePath('/home/x'), '~');
  assert.equal(homeRelativePath('C:\\Users\\x\\repo'), '~\\repo');
  assert.equal(homeRelativePath('/opt/x'), '/opt/x');
  const saved = [{ id: 'e1', name: 'App', target: { kind: 'local', cwd: '/Users/me/app' }, lastUsedAt: 50, createdAt: 10 }];
  const items = startEnvironmentItems(saved, [{ path: '/Users/me/notes', label: 'notes' }]);
  assert.deepEqual(startEnvironmentRows({ items, sshOffered: false, sshLoaded: true, sshHosts: [] }), [
    { id: 'preset:e1', icon: 'Laptop', name: 'App', where: { kind: 'path', text: '~/app' } },
    { id: '/Users/me/notes', icon: 'Laptop', name: 'notes', where: { kind: 'path', text: '~/notes' } },
  ]);
  const used = environmentLastUsed({ environments: [...startEnvironmentRecords(saved), { id: 'preset:e1', target: { kind: 'local' }, lastUsedAt: 20 }], startedPlaces: [] });
  assert.deepEqual([...used], [['preset:e1', 50]]);
  assert.equal(startEnvironmentRecords([{ id: 'n', target: {}, createdAt: 7 }])[0].lastUsedAt, 7);
});
test('pending requests mark sessions awaiting with M3 ask; unrelated/archived/scheduled failures cannot produce resume suggestions', () => {
  assert.equal(startAsk(['item/tool/requestUserInput', 'item/permissions/requestApproval']), 'question');
  assert.equal(startAsk(['item/commandExecution/requestApproval']), 'permission');
  assert.equal(startAsk([]), 'question');
  const data = startSessions([
    { id: 'p', title: 'Pinned', cwd: '/repo' },
    { id: 'q', title: 'Asks', cwd: '/repo' },
    { id: 'a', title: 'Archived', cwd: '/repo', archived: true },
    { id: 's', title: 'Routine', cwd: '/repo', scheduledTaskId: 'job' },
    { id: 'f', title: 'Failed', cwd: '/repo', updatedAt: 100 },
  ], { metadata: { p: { pinned: true }, s: { errorAt: 4 }, f: { errorAt: 5 } },
    approvals: [{ sessionId: 'p', method: 'item/fileChange/requestApproval' }, { sessionId: 'q', method: 'item/tool/requestUserInput' }, { sessionId: null, method: 'x' }] });
  assert.equal(data.find(s => s.id === 'p').awaiting, true);
  assert.equal(data.find(s => s.id === 'p').ask, 'permission');
  assert.equal(data.find(s => s.id === 'q').ask, 'question');
  assert.equal(data.some(s => s.id === 'a'), false);
  assert.deepEqual(startWaitingSessions(data).map(s => [s.id, s.type, s.isSsh, s.ask]), [['p', 'local', false, 'permission'], ['q', 'local', false, 'question']]);
  const rows = startSetupRows({ folder: '/repo', sessions: data, workspace: { isRepo: true, branch: 'main', branches: ['main'] } });
  assert.deepEqual(rows.map(row => [row.card.sessionId, row.card.on]), [['f', 'error']]);
  assert.deepEqual(startSetupRows({ folder: '/other', sessions: data, workspace: {} }), []);
  assert.equal(startSessions([{ id: 'w', title: 'W' }], { awaiting: new Set(['w']) })[0].ask, 'question');
});
test('worktree suggestion uses actual working directory; continuation requires a non-default checked-out branch', () => {
  const workspace = { isRepo: true, branch: 'feature', branches: ['main', 'feature'] };
  const sessions = [{ running: true, actualCwd: '/scratch', cwd: '/scratch', originCwd: '/repo' }];
  const params = { folder: '/repo', sessions, workspace, status: { workingTreeFiles: 2 } };
  assert.deepEqual(startSetupRows(params).map(row => row.action), ['continue']);
  assert.deepEqual(startSetupRows({ ...params, worktree: true }), []);
  assert.deepEqual(startSetupRows({ ...params, workspace: { ...workspace, checkedOut: 'main' } }), []);
  sessions[0].actualCwd = '/repo';
  assert.deepEqual(startSetupRows(params).map(row => row.action), ['worktree', 'continue']);
  assert.deepEqual(startSetupRows({ ...params, starting: true }), []);
  assert.equal(startSetupRows({})[0].card.blocksSend, true);
});

let server, View, Adapters, Host;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  View = await server.ssrLoadModule('/src/generated/code-start/view.mjs');
  Adapters = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  Host = await server.ssrLoadModule('/src/source-code-start.jsx');
});
after(async () => { await server?.close(); });
const noop = () => {};
const hostValue = (sessions = [], extra = {}) => ({ sessions, settled: true, splitPane: false, onOpenSession: noop, ...extra });
function render(props = {}, sessions = [], extra = {}) {
  return renderToStaticMarkup(React.createElement(Adapters.StartHostContext.Provider, { value: hostValue(sessions, extra) },
    React.createElement(View.StartCard, { ready: true, environments: [], setupRows: [], openingKey: 'test', onSelect: noop, onChoose: noop, chooseOpen: false, ...props })));
}
const waiting = (id, title, ask = 'question') => ({ id, type: 'local', isSsh: false, title, ask, stamp: '1' });
const tasks = (count, extra = {}) => ({ settled: true, items: Array.from({ length: count }, (_, i) => ({ id: `t${i + 1}`, title: `Task ${i + 1}`, prompt: `do ${i + 1}`, cwd: '/Users/me/repo' })),
  onStart: () => null, onDelete: noop, onDeleteAll: noop, ...extra });

test('original markup shows three environments, replacing the third with an out-of-range selection', () => {
  const environments = ['A', 'B', 'C', 'D'].map(id => ({ id, name: `Repo ${id}`, icon: 'Laptop', where: { kind: 'path', text: `~/work/${id}` } }));
  const html = render({ environments, selectedId: 'D' });
  assert.equal((html.match(/data-testid="start-card-environment"/g) || []).length, 3);
  assert.match(html, /Repo A/); assert.match(html, /Repo B/); assert.match(html, /Repo D/);
  assert.doesNotMatch(html, /Repo C/);
  assert.match(html, /aria-current="true"/);
  assert.match(html, /aria-hidden="true" class="border-t" style="margin-inline:var\(--cds-ring-inner\)"/);
  assert.match(html, /hidden="">~\/work\/A/);
  assert.match(html, /aria-haspopup="menu" aria-expanded="false"/);
  // o6: the transcript surface and the landing-texture variant classes come along verbatim.
  assert.match(html, /bg-\[var\(--epitaxy-transcript-surface,var\(--cds-surface-1\)\)\] \[\[data-landing-texture=canvas\]~div_&amp;\]:transform-gpu/);
  assert.match(html, /\[\[data-landing-texture=canvas\]~div_&amp;\]:after:shadow-card-ring/);
});
test('Next steps: a lone blocked session is a row with the warning status; tasks fill the spare seats and the rest', () => {
  const html = render({ tasks: tasks(3) }, [waiting('a', 'Alpha')]);
  assert.match(html, /<ul[^>]+aria-label="Next steps"/);
  assert.match(html, /data-testid="start-card-waiting-session"/);
  assert.match(html, /<span class="text-warning">Blocked<\/span> Alpha/);
  assert.match(html, /Asked a question/);
  assert.equal((html.match(/data-testid="start-card-suggested-task"/g) || []).length, 1);
  assert.match(html, /data-testid="start-card-suggested-tasks"[^>]*aria-haspopup="dialog" aria-expanded="false"/);
  assert.match(html, />2 more suggested tasks</);
  assert.match(html, /aria-label="Start “Task 1”"/);
  assert.doesNotMatch(html, /and \d+ more|CaretRight|Waiting on you|Answer “/);
  assert.doesNotMatch(html, />Next steps<|oc-start-heading|oc-start-task/);
  assert.match(html, /data-start-card-setup=""/);
});
test('Next steps: a family without a spare seat is one rest row that opens a popover list', () => {
  const html = render({ tasks: tasks(3), setupRows: [{ card: { id: 'worktree-apart', folder: '/r', taken: false }, onPress: noop }] },
    [waiting('a', 'Alpha'), waiting('b', 'Beta', 'permission')]);
  assert.match(html, /data-testid="start-card-blocked-sessions"[^>]*aria-haspopup="dialog" aria-expanded="false"[^>]*>.*Claude is blocked in 2 sessions/);
  assert.match(html, />3 suggested tasks</);
  assert.match(html, /data-testid="start-card-worktree-apart"/);
  assert.doesNotMatch(html, /Alpha|Beta/);
  assert.match(html, /aria-label="Dismiss 2 blocked sessions"|Dismiss 2 blocked sessions/);
});
test('empty environment collection omits the environments card while the required folder row remains visible', () => {
  const html = render({ setupRows: [{ card: { id: 'choose-folder', blocksSend: true }, onPress: noop }] });
  assert.doesNotMatch(html, /start-card-environments|start-card-choose"|data-start-card-setup=""/);
  assert.match(html, /start-card-choose-folder/);
  assert.match(html, /Needed to start/);
  assert.doesNotMatch(render({ ready: false }), /start-card-environments|start-card-setup/);
});
test('row and preview pieces: detailSet uses Y4, the task preview footers follow how far it was read', () => {
  const row = renderToStaticMarkup(React.createElement(View.StartRow, { title: 'T', detail: 'D', detailSet: true, onPress: noop }));
  assert.ok(row.includes(`class="${View.startRowDetailSetClassName} ${View.startRowDetailTone}">D<`));
  assert.equal(View.startRowDetailSetClassName, 'max-w-1/2 shrink-0 truncate');
  assert.match(View.startRowClassName, /text-start/);
  const item = { id: 't', title: 'Fix it', prompt: 'Fix the bug', cwd: '/Users/me/repo' };
  const preview = whole => renderToStaticMarkup(React.createElement(View.StartTaskPreview, { item, whole, onEndSeen: noop }));
  assert.match(preview(false), /Suggested task.*Fix it.*Fix the bug.*Scroll to the end to start it now\./);
  assert.match(preview(true), /Starts now in repo/);
});

// Hook-driven fixture: runs one component with a scripted dispatcher (same technique as sessions-page-current).
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree, current = props, ids = 0;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: c => contexts.has(c) ? contexts.get(c) : c._currentValue,
    useId() { const i = cursor++; cells[i] ??= { value: `:f${ids++}:` }; return cells[i].value; },
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const run = next => {
    if (next) current = next;
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return tree = component(current); } finally { internal.H = old; }
  };
  run();
  return { get tree() { return tree; }, render: run, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach(c => c?.cleanup?.()); } };
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  const children = tree.props?.children ?? tree.children;
  return [...(predicate(tree) ? [tree] : []), ...nodes(children, predicate)];
}
const event = (extra = {}) => ({ detail: 1, stopPropagation: noop, currentTarget: { matches: () => false, ownerDocument: { activeElement: null } }, ...extra });
const hostContext = value => new Map([[Adapters.StartHostContext, value]]);
// Each a6 row: its i6 element rendered down to the t3 props (e6 holds hooks of its own).
function rowsOf(tree) {
  return nodes(tree, n => n.type === View.StartStepRow).map(n => {
    const step = fixture(View.StartStep, { ...n.props });
    const row = nodes(step.tree, m => m.type === View.StartRow)[0];
    return { id: n.props.candidate.facts.id, listed: n.props.listed, step, props: row.props };
  });
}
const steps = (props, host) => fixture(View.StartNextSteps, { rows: [], openingKey: 'A', groupClassName: '', previousRowRef: { current: null }, ...props }, hostContext(hostValue(host)));

test('G3: nothing shows until every source settled; split panes hide blocked-session rows', () => {
  const unsettled = fixture(View.StartNextSteps, { rows: [], tasks: tasks(1), openingKey: 'A', groupClassName: '', previousRowRef: { current: null } }, hostContext({ ...hostValue([waiting('a', 'Alpha')]), settled: false }));
  assert.equal(unsettled.tree, null);
  const split = steps({ tasks: tasks(1) }, [waiting('a', 'Alpha')]);
  assert.deepEqual(rowsOf(split.tree).map(r => r.id), ['waiting-session', 'suggested-task']);
  const paned = fixture(View.StartNextSteps, { rows: [], tasks: tasks(1), openingKey: 'A', groupClassName: '', previousRowRef: { current: null } }, hostContext({ ...hostValue([waiting('a', 'Alpha')]), splitPane: true }));
  assert.deepEqual(rowsOf(paned.tree).map(r => r.id), ['suggested-task']);
});
test('fills rows (continue-branch) hide after a press for this opening and come back in the next one', () => {
  let pressed = 0;
  const setupRows = [{ card: { id: 'continue-branch', folder: '/r', branch: 'f', files: 2 }, onPress: () => { pressed++; } }];
  const f = steps({ rows: setupRows, openingKey: 'A' });
  const [row] = rowsOf(f.tree);
  assert.equal(row.id, 'continue-branch');
  row.props.onPress(event(), false);
  assert.equal(pressed, 1);
  f.render();
  assert.equal(f.tree, null, 'the only row is used up for this opening');
  f.render({ rows: setupRows, openingKey: 'B', groupClassName: '', previousRowRef: { current: null } });
  assert.deepEqual(rowsOf(f.tree).map(r => r.id), ['continue-branch']);
});
test('rest rows open their popover list; dismissing a family drops its tasks and dismisses each blocked session', () => {
  const deleted = [];
  const f = steps({ tasks: tasks(3, { onDeleteAll: list => deleted.push(...list.map(item => item.id)) }), rows: [{ card: { id: 'worktree-apart', folder: '/r', taken: false }, onPress: noop }] },
    [waiting('a', 'Alpha'), waiting('b', 'Beta')]);
  const roots = nodes(f.tree, n => n.type === Adapters.StartPopover.Root);
  assert.equal(roots.length, 2);
  assert.equal(roots[0].props.open, false);
  roots[0].props.onOpenChange(true);
  f.render();
  const open = nodes(f.tree, n => n.type === Adapters.StartPopover.Root)[0];
  assert.equal(open.props.open, true);
  const listed = rowsOf(nodes(open, n => n.type === Adapters.StartPopover.Popup)[0]);
  assert.deepEqual(listed.map(r => [r.id, r.listed, r.props.title]), [['waiting-session', true, 'Alpha'], ['waiting-session', true, 'Beta']]);
  assert.equal(listed[0].props.dismiss, undefined, 'a listed session has no own dismiss');
  // The suggested-tasks family's dismiss deletes its tasks; the blocked family's dismisses each session (d3).
  const restRows = nodes(f.tree, n => n.type === View.StartRow && n.props.list);
  assert.deepEqual(restRows.map(r => r.props['data-testid']), ['start-card-blocked-sessions', 'start-card-suggested-tasks']);
  restRows[1].props.dismiss.onPress(event());
  assert.deepEqual(deleted, ['t1', 't2', 't3']);
  restRows[0].props.dismiss.onPress(event());
  f.render();
  assert.deepEqual(nodes(f.tree, n => n.type === View.StartRow && n.props.list).map(r => r.props['data-testid']), ['start-card-suggested-tasks']);
  assert.equal(rowsOf(f.tree).some(r => r.id === 'waiting-session'), false);
});
test('a staged suggested task hides the task family for this opening', () => {
  const calls = [];
  const f = steps({ tasks: tasks(1, { onStart: (item, options, entry) => { calls.push([item.id, options.shown, entry]); return 'staged'; } }) });
  const [row] = rowsOf(f.tree);
  assert.equal(row.props.label, 'Start “Task 1”');
  row.props.onPress(event(), false);
  assert.deepEqual(calls, [['t1', false, 'chip']]);
  f.render();
  assert.equal(f.tree, null);
});

test('SourceCodeStart: an unread task is prefilled (staged); one read to the end starts beside the draft and opens once sent', () => {
  const taken = [], beside = [], opened = [], dismissed = [];
  const call = (method, params) => { if (method === 'task-backlog-dismiss') dismissed.push([params.id, params.taken]); return Promise.resolve(method === 'task-backlog-list' ? [] : true); };
  const f = fixture(Host.SourceCodeStart, {
    ready: true, folders: [{ path: '/Users/me/repo', label: 'repo' }], folder: '/Users/me/repo', onSelect: noop, onChoose: noop, chooseOpen: false, call, onError: noop,
    sessions: [], workspace: null, onOpenSession: id => opened.push(id), onFocusComposer: noop,
    onTake: prompt => { taken.push(prompt); return true; },
    onStartBesideDraft: (prompt, onSent) => { beside.push(prompt); setTimeout(() => onSent('s1'), 0); return 'asked'; },
  });
  nodes(f.tree, n => n.type === View.StartSlot)[0].props.slotRef({ nodeType: 1 });
  f.render();
  const card = nodes(f.tree, n => n.type === View.StartCard)[0];
  assert.deepEqual(card.props.environments.map(e => e.where.text), ['~/repo']);
  const item = { id: 't1', title: 'Fix', prompt: 'Fix\r\nit ' };
  const started = [];
  assert.equal(card.props.tasks.onStart(item, { keyboard: true, shown: false, onStart: id => started.push(id) }, 'chip'), 'staged');
  assert.deepEqual(taken, ['Fix\r\nit ']);
  assert.equal(card.props.tasks.onStart(item, { keyboard: false, shown: true, onStart: id => started.push(id) }, 'chip'), null, 'a second pointer take right after is a double click');
  assert.equal(card.props.tasks.onStart(item, { keyboard: true, shown: true, onStart: id => started.push(id) }, 'chip'), 'starting');
  assert.deepEqual(beside, ['Fix\nit']);
  return new Promise(resolve => setTimeout(resolve, 5)).then(() => {
    assert.deepEqual(started, ['s1']);
    assert.deepEqual(dismissed, [['t1', true], ['t1', true]]);
    f.close();
  });
});
test('SourceCodeStart: a blocked or missing beside-draft start falls back to the message box; busy does nothing', () => {
  const taken = [];
  const base = { ready: true, folders: [], folder: '/r', onSelect: noop, onChoose: noop, chooseOpen: false, call: () => Promise.resolve([]), onError: noop, sessions: [], workspace: null, onOpenSession: noop, onTake: prompt => { taken.push(prompt); return true; } };
  const cardOf = props => { const f = fixture(Host.SourceCodeStart, props); nodes(f.tree, n => n.type === View.StartSlot)[0].props.slotRef({ nodeType: 1 }); f.render(); return nodes(f.tree, n => n.type === View.StartCard)[0]; };
  const item = { id: 't', prompt: 'go' };
  assert.equal(cardOf({ ...base, onStartBesideDraft: () => 'blocked' }).props.tasks.onStart(item, { keyboard: true, shown: true }), 'staged');
  assert.equal(cardOf({ ...base, onStartBesideDraft: () => 'busy' }).props.tasks.onStart(item, { keyboard: true, shown: true }), null);
  assert.equal(cardOf(base).props.tasks.onStart(item, { keyboard: true, shown: true }), 'staged');
  assert.deepEqual(taken, ['go', 'go']);
});
test('SourceCodeStart: setup rows carry M8 copy (resume title, continue prompt) and press through to the host', () => {
  const taken = [], opened = [];
  const failed = startSessions([{ id: 'f', title: 'Broken', cwd: '/r', updatedAt: 9 }], { metadata: { f: { errorAt: 5 } } });
  const f = fixture(Host.SourceCodeStart, { ready: true, folders: [], folder: '/r', onSelect: noop, onChoose: noop, chooseOpen: false, call: () => Promise.resolve([]), onError: noop,
    sessions: failed, workspace: { isRepo: false }, onOpenSession: id => opened.push(id), onTake: prompt => { taken.push(prompt); return true; } });
  nodes(f.tree, n => n.type === View.StartSlot)[0].props.slotRef({ nodeType: 1 });
  f.render();
  const [resume] = nodes(f.tree, n => n.type === View.StartCard)[0].props.setupRows;
  assert.equal(resume.title, 'Resume “Broken”');
  assert.equal(resume.card.on, 'error');
  resume.onPress(event(), false, false, undefined);
  assert.deepEqual(opened, ['f']);
});
test('d3 dismissals keep using the stored startCardDismissals record and write it back', () => {
  const store = new Map([['startCardDismissals', JSON.stringify({ 'auto-mode': '', bad: 3 })]]);
  const events = [];
  globalThis.window = { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }, addEventListener: noop, removeEventListener: noop, dispatchEvent: e => events.push(e.detail) };
  try {
    const f = fixture(View.useStartDismissals, {});
    assert.equal(f.tree.settled, true);
    assert.equal(f.tree.isDismissed({ row: 'auto-mode' }), true);
    f.tree.dismiss({ row: 'waiting-session', subject: 'a', stamp: '1' });
    f.render();
    assert.equal(f.tree.isDismissed({ row: 'waiting-session', subject: 'a', stamp: '1' }), true);
    const saved = JSON.parse(store.get('startCardDismissals'));
    assert.equal(saved['auto-mode'], '');
    assert.equal('bad' in saved, false);
    assert.equal(Object.keys(saved).length, 2);
    assert.deepEqual(events, ['startCardDismissals']);
  } finally { delete globalThis.window; }
});
test('popover and preview-card triggers keep the row button and add the official trigger semantics', () => {
  const button = React.createElement('button', { type: 'button', 'data-testid': 'x', onClick: noop });
  const root = fixture(Adapters.StartPopover.Root, { open: true, onOpenChange: noop, children: null });
  const context = root.tree.props.value;
  const changes = [];
  // React 19: the provider element's type is the context itself.
  const trigger = fixture(Adapters.StartPopover.Trigger, { render: button }, new Map([[root.tree.type, { ...context, change: next => changes.push(next) }]]));
  assert.equal(trigger.tree.props['aria-haspopup'], 'dialog');
  assert.equal(trigger.tree.props['aria-expanded'], true);
  assert.equal(trigger.tree.props['data-testid'], 'x');
  trigger.tree.props.onClick(event());
  assert.deepEqual(changes, [false]);
  const markup = renderToStaticMarkup(React.createElement(Adapters.StartPreviewCard.Root, { delay: 800 },
    React.createElement(Adapters.StartPreviewCard.Trigger, { render: button }), React.createElement(Adapters.StartPreviewCard.Popup, { side: 'top' }, 'card')));
  assert.equal(markup, '<button type="button" data-testid="x"></button>');
});

// R2-home: the zh-CN catalog through the react-intl stand-in (rich-text tag, plural, quoted title).
test('zh-CN: the Blocked status keeps its warning span; family and task labels come from the catalog', async () => {
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  const previous = i18n.getLocale();
  i18n.setLocale('zh-CN');
  try {
    const html = render({ tasks: tasks(3) }, [waiting('a', 'Alpha', 'permission')]);
    assert.match(html, /<span class="text-warning">受阻<\/span> Alpha/);
    assert.match(html, /需要权限/);
    assert.match(html, />另外 2 个建议的任务</);
    assert.match(html, /aria-label="开始“Task 1”"/);
    assert.doesNotMatch(html, /Blocked|suggested task|Next steps/);
  } finally { i18n.setLocale(previous); }
});
// B4 is wired to main.jsx's Send and stay here path (send()'s sendMessage with `beside`): any prompt, and the Home
// composer (text, attachments, mentions, issue, tools, agent choice, group) stays as it is. main.jsx is a shared
// file other lanes edit; this pins the wiring the start card relies on.
test('main.jsx: the start card gets the split flag and B4, which sends a plain prompt beside the kept draft', async () => {
  const main = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const at = main.indexOf('<SourceCodeStart');
  const mount = main.slice(at, main.indexOf('/>', at));
  assert.match(mount, /splitPane=\{splitView\.open\} onStartBesideDraft=\{startBesideDraft\}/);
  assert.match(mount, /sessions=\{startCardSessions\}/);
  assert.match(main, /approvals: state\.approvals\.map\(approval => \(\{ sessionId: ownerThreadId\(state, approval\.params\?\.threadId\), method: approval\.method \}\)\)/);
  assert.match(main, /if \(backgroundSpawnsRef\.current > 0\) return "busy";/);
  assert.match(main, /void sendMessage\(prompt, \[\], \[\], \{ priority: "stay", beside: \{ onStart: onSent \} \}\);\s*return "asked";/);
  const send = main.slice(main.indexOf('async function sendMessage('), main.indexOf('function discardFailedStart('));
  for (const guard of [
    'const sentIssue = !current && !beside && draftIssue',
    'const shellCommand = mode === "code" && !beside ?',
    'const keywordRequested = !beside &&',
    'const startedGroup = current || beside ? null',
    'if (!beside) { setDraft(""); setAttachments([]); setMentions([]); }',
    'if (!beside) setDraftTools(undefined);',
    'if (!beside) forgetDraft(browserStorage(), homeDraftKey, { text });',
    'if (beside && launched) beside.onStart?.(id);',
  ]) assert.ok(send.includes(guard), guard);
  assert.match(send, /const restoreStay = \(\) => \{\s*if \(beside\) return;/);
});
