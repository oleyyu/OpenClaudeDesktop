import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R4f-proposal P1 (tasks-proposal-group-card WI-1; tasks-03 / tasks-04 / tasks-11): the generated 2.42304.0 group card
// (c96d752d0 R$ / z$ → B$ → c0e → s0e, the Options form c227f4d5e pq) over the host adapters
// (src/source-proposal-group-adapters.jsx) and the host spawner (src/proposal-spawner.mjs, P3) built from the generated
// helpers. SSR for the markup; the card's own components called under a hook dispatcher (D21, as
// tests/sessions-page-current.test.mjs) for the element props a click or a popover would reach: Start all's 400 ms
// guard, the Options form's rows and menus, a pick that changes the description line. No browser, no DOM, no network.
const app = path.resolve(import.meta.dirname, '..');
let server, G, A, S;
before(async () => {
  // ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  G = await server.ssrLoadModule('/src/generated/proposal-group/index.mjs');
  A = await server.ssrLoadModule('/src/source-proposal-group-adapters.jsx');
  S = await server.ssrLoadModule('/src/proposal-spawner.mjs');
});
after(async () => { await server?.close(); });

const taskId = n => `task_${String(n).padStart(8, '0')}`;
const tool = (n, extra = {}) => ({ id: `call_${n}`, name: G.SPAWN_TASK_TOOL, input: { title: `Task ${n}`, prompt: `Do task ${n}`, tldr: `Short ${n}`, cwd: '/repo' },
  output: `Noted (position ${n}, task_id: ${taskId(n)}).`, status: 'completed', isError: false, ...extra });
const toolsOf = count => Array.from({ length: count }, (_, i) => tool(i + 1));
const queued = tools => tools.map(t => ({ id: G.proposalTaskId(t), title: t.input.title, prompt: t.input.prompt, tldr: t.input.tldr, cwd: t.input.cwd, createdAt: 1 }));
const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)\}/g, (_, key) => values?.[key] ?? '') };
const MODELS = [{ id: 'gpt-5.5', name: 'GPT-5.5', efforts: [{ id: 'low' }, { id: 'medium', recommended: true }, { id: 'high' }, { id: 'xhigh' }] }, { id: 'gpt-5.4', name: 'GPT-5.4', efforts: [] }];
// The host spawner (P3) on the generated helpers, as the wiring step builds it.
function spawnerFor(parent, queue, { permissionMode = 'default', calls = [] } = {}) {
  const spawner = S.createProposalSpawner({
    official: { proposalKey: G.proposalKey, isOffer: G.isOfferProposal, crossRepoCwdOf: G.crossRepoCwdOf, keepSessionMode: G.keepSessionMode,
      resolvePermissionMode: G.resolveStartPermissionMode, needsModeConsent: G.startModeNeedsConsent, hereText: r => G.proposalHereText(intl, r) },
    spawning: { visible: (q, p) => G.visibleProposalQueue(q, G.spawningTaskIds(p)), mark: G.markProposalSpawning, clear: G.clearProposalSpawning },
    results: { record: G.recordProposalOutcome, clear: G.clearProposalOutcome },
    bridge: { popById: async () => true, sendMessage: async (...args) => { calls.push(['send', ...args]); },
      start: async request => { calls.push(['start', request]); return { sessionId: 'local_child' }; } },
    notify: (...args) => calls.push(['notify', ...args]),
  });
  spawner.setHost({ sessionId: parent, available: true, queue, session: { originCwd: '/repo', cwd: '/repo', model: 'gpt-5.5', effort: 'medium', permissionMode } });
  return spawner.getSnapshot();
}
const hostFor = (parent, queue, { sessions = [], permissionMode = 'default', spawner, ...extra } = {}) => ({
  sessions: [{ sessionId: parent, title: 'Parent', model: 'gpt-5.5', effort: 'medium', permissionMode, backgroundTaskSuggestions: queue }, ...sessions],
  catalog: { models: MODELS }, permissionModes: { auto: false }, ...extra,
});
const wrap = (host, spawner, child) => React.createElement(A.ProposalHostProvider, { value: host },
  React.createElement(G.ProposalSpawnerContext.Provider, { value: spawner }, child));
const turnCard = (parent, tools, options = {}) => {
  const queue = options.queue ?? queued(tools);
  return wrap(hostFor(parent, queue, options), options.spawner ?? spawnerFor(parent, queue, options),
    React.createElement(G.TurnProposalGroup, { tools, sessionRef: { id: parent, type: 'local' } }));
};
const count = (html, needle) => html.split(needle).length - 1;

// The hook dispatcher (D21, after tests/sessions-page-current.test.mjs fixture) the card's components run under here.
function fixture(component, props, contexts) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: context => (contexts.has(context) ? contexts.get(context) : context._currentValue),
    useId: () => `:pg${cursor++}:`,
    useState(initial) {
      const i = cursor++;
      cells[i] ??= { value: typeof initial === 'function' ? initial() : initial };
      return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }];
    },
    useReducer(reducer, arg, init) {
      const i = cursor++;
      if (!cells[i]) { const cell = { value: init ? init(arg) : arg }; cell.dispatch = action => { cell.value = reducer(cell.value, action); }; cells[i] = cell; }
      return [cells[i].value, cells[i].dispatch];
    },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); }
    },
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
    useDebugValue() {},
    useEffectEvent: fn => fn,
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const render = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return (tree = component(props)); } finally { internal.H = old; }
  };
  render();
  return { get tree() { return tree; }, render, flush() { while (effects.length) effects.shift()(); } };
}
const nodes = (tree, predicate) => {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  // Children and every element-valued prop (render, leading, items, …): what the component hands on to render.
  const handed = Object.entries(tree.props ?? {}).filter(([key, value]) => key === 'children' || React.isValidElement(value)
    || (Array.isArray(value) && value.some(v => React.isValidElement(v)))).map(([, value]) => value);
  return [...(predicate(tree) ? [tree] : []), ...handed.flatMap(value => nodes(value, predicate))];
};
const inner = element => element.type.type ?? element.type; // a memo component's render function
const contextsFor = (host, spawner) => new Map([[A.ProposalHost, host], [G.ProposalSpawnerContext, spawner]]);
// R$ → B$ (the group card), called under the dispatcher.
function cardFixture(parent, tools, options = {}) {
  const queue = options.queue ?? queued(tools), host = hostFor(parent, queue, options), spawner = options.spawner ?? spawnerFor(parent, queue, options);
  const contexts = contextsFor(host, spawner);
  const turn = fixture(inner({ type: G.TurnProposalGroup }), { tools, sessionRef: { id: parent, type: 'local' } }, contexts);
  const group = nodes(turn.tree, n => n.props?.cardKey !== undefined)[0];
  return { host, spawner, queue, contexts, card: fixture(inner(group), group.props, contexts) };
}
// … → c0e (a row) → s0e (a proposed row).
function rowFixture(parent, tools, options = {}) {
  const f = cardFixture(parent, tools, options);
  const row = nodes(f.card.tree, n => n.props?.item !== undefined && n.props?.registerStart !== undefined)[0];
  const proposed = nodes(fixture(inner(row), row.props, f.contexts).tree, n => n.props?.record !== undefined && n.props?.picksApply !== undefined)[0];
  const s0e = fixture(inner(proposed), proposed.props, f.contexts);
  s0e.flush();
  return { ...f, s0e };
}
// The Options popover's form (pq): CdsPopover.Popup's child in the row's Options popover.
const optionsForm = tree => nodes(tree, n => n.props?.places !== undefined && n.props?.resolved !== undefined && n.props?.catalog !== undefined)[0];

test('two proposals: the group card with its header, Start all and one row each (SSR)', () => {
  const html = renderToStaticMarkup(turnCard('local_two', toolsOf(2)));
  assert.match(html, /^<span role="status" class="sr-only select-none"><\/span><div class="my-\[6px\] flex w-full flex-col" role="group" aria-label="2 suggested tasks">/);
  assert.match(html, /<div class="epitaxy-card-outline flex w-full max-w-\[480px\] select-text flex-col overflow-clip rounded-card">/);
  assert.match(html, /<div class="flex min-w-0 items-center gap-md bg-alpha-1 px-lg py-md text-body text-primary"><span class="min-w-0 truncate">2 suggested tasks<\/span><span class="grow"><\/span><span class="-my-xs -me-sm flex shrink-0 items-center gap-xs"><button[^>]*data-cds="Button" data-cds-ghost="" data-size="sm"/);
  assert.equal(count(html, '>Start all</span>'), 1);
  assert.equal(count(html, 'data-proposed-task-state="proposed"'), 2);
  assert.equal(count(html, 'data-approval-card-root=""'), 2);
  for (const n of [1, 2]) {
    assert.match(html, new RegExp(`<span id="[^"]+" class="line-clamp-2 break-words text-body font-medium text-primary">Task ${n}</span><span id="[^"]+" class="line-clamp-2 break-words text-body text-secondary"><bdi>Short ${n}</bdi></span>`));
    assert.match(html, new RegExp(`aria-label="Dismiss suggestion Task ${n}"`));
  }
  assert.equal(count(html, 'data-options-toggle=""'), 2);
  assert.equal(count(html, '>Options</span>'), 2);
  assert.equal(count(html, '>Do it here</span>'), 2);
  assert.equal(count(html, '>Start</span>'), 2);
  // The unplaced group (queued tasks no tool row carries) is the same card.
  const queue = queued(toolsOf(2));
  const unplaced = renderToStaticMarkup(wrap(hostFor('local_two_u', queue), spawnerFor('local_two_u', queue),
    React.createElement(G.UnplacedProposalGroup, { tasks: queue.map(t => ({ id: t.id, title: t.title, createdAt: 1 })), sessionRef: { id: 'local_two_u', type: 'local' } })));
  assert.match(unplaced, /aria-label="2 suggested tasks"/);
  assert.equal(count(unplaced, 'data-proposed-task-state="proposed"'), 2);
});

test('one proposal: no "{count} suggested tasks" header and no Start all; the card is headed "New session"', () => {
  const html = renderToStaticMarkup(turnCard('local_one', toolsOf(1)));
  assert.match(html, /role="group" aria-label="1 suggested task"/);
  assert.doesNotMatch(html, /<span class="min-w-0 truncate">1 suggested task<\/span>/);
  assert.doesNotMatch(html, />Start all</);
  assert.match(html, /<div class="flex min-w-0 items-center gap-md bg-alpha-1 px-lg py-md text-body text-primary"><span class="min-w-0 truncate">New session<\/span><\/div>/);
  assert.equal(count(html, 'data-proposed-task-state="proposed"'), 1);
});

test('more than six: five rows and "Show {count} more"', () => {
  const html = renderToStaticMarkup(turnCard('local_seven', toolsOf(7)));
  assert.match(html, /aria-label="7 suggested tasks"/);
  assert.equal(count(html, 'data-proposed-task-state="proposed"'), 5);
  assert.match(html, /<div class="flex min-w-0 border-t px-sm py-xs"><button[^>]*aria-expanded="false"[^>]*>.*Show 2 more.*<\/button><\/div>/);
  assert.doesNotMatch(html, /Task 6/);
  // Six fit without the fold.
  const six = renderToStaticMarkup(turnCard('local_six', toolsOf(6)));
  assert.equal(count(six, 'data-proposed-task-state="proposed"'), 6);
  assert.doesNotMatch(six, /Show \d+ more/);
});

test('started: a child session spawned from a task turns its row into the session row; "{count} started"', () => {
  const tools = toolsOf(2);
  const child = { sessionId: 'local_child_1', title: 'Fix the flaky test', isRunning: true, spawnedFrom: { sessionId: 'local_started', taskId: taskId(1), title: 'Task 1' } };
  const queue = queued(tools).slice(1);
  const html = renderToStaticMarkup(turnCard('local_started', tools, { queue, sessions: [child] }));
  assert.match(html, /<span class="min-w-0 truncate">2 suggested tasks<\/span><span class="shrink-0 text-muted-as-secondary">1 started<\/span>/);
  assert.match(html, /<div data-proposed-task-state="started" class="flex min-w-0 border-t first:border-t-0"><div class="@container w-full"><div data-side-session-state="working" class="relative flex w-full flex-col text-start group\/tool">/);
  assert.match(html, /role="button" tabindex="0" aria-disabled="false" aria-label="Open session Fix the flaky test \(Working\)"/);
  assert.equal(count(html, 'data-proposed-task-state="proposed"'), 1);
  // One proposal left that can start: no Start all.
  assert.doesNotMatch(html, />Start all</);
  // A single started task is the session row alone (BQ), no group.
  const single = renderToStaticMarkup(turnCard('local_started', tools.slice(0, 1), { queue: [], sessions: [child] }));
  assert.doesNotMatch(single, /role="group"/);
  assert.match(single, /<div data-side-session-state="working" class="relative isolate flex min-h-8.75 w-fit min-w-\[min\(100%,440px\)\] max-w-\[max\(75%,min\(100%,440px\)\)\] flex-col rounded-lg text-start group\/tool">/);
  // The row opens the child through the host.
  const opened = [];
  const host = hostFor('local_started', [], { sessions: [child], openSession: (id, options) => opened.push([id, options.title]) });
  const contexts = contextsFor(host, spawnerFor('local_started', []));
  const turn = fixture(inner({ type: G.TurnProposalGroup }), { tools: tools.slice(0, 1), sessionRef: { id: 'local_started', type: 'local' } }, contexts);
  const group = nodes(turn.tree, n => n.props?.cardKey !== undefined)[0];
  const sessionRow = nodes(fixture(inner(group), group.props, contexts).tree, n => n.props?.child !== undefined)[0];
  const row = nodes(fixture(inner(sessionRow), sessionRow.props, contexts).tree, n => typeof n.props?.onOpen === 'function')[0];
  row.props.onOpen({ currentTarget: { contains: () => true }, target: {} });
  assert.deepEqual(opened, [['local_child_1', 'Fix the flaky test']]);
});

test('Start all ignores a click within 400 ms of a task joining, and lets a rewound clock through (u0e, tasks-11)', () => {
  const realNow = Date.now;
  const calls = [];
  try {
    let now = 1_000_000;
    Date.now = () => now;
    const tools = toolsOf(2), queue = queued(tools);
    const spawner = { ...spawnerFor('local_guard', queue), requestSpawnAll: list => { calls.push(list); return Promise.resolve(); } };
    const { card } = cardFixture('local_guard', tools, { spawner });
    card.flush(); // u0e's layout effect: both keys are new, lastJoinAt = now
    const click = tree => nodes(tree, n => n.props?.children === 'Start all')[0].props.onClick({ nativeEvent: { timeStamp: 0, type: 'click' } });
    now += 100;
    click(card.tree);
    assert.equal(calls.length, 0, 'ignored 100 ms after the join');
    now += 350;
    click(card.tree);
    assert.equal(calls.length, 1, 'accepted 450 ms after the join');
    assert.deepEqual(calls[0].map(({ target, clicked, options }) => [target, clicked, options]),
      [['worktree', { key: taskId(1), cwd: '/repo' }, { asProposed: true }], ['worktree', { key: taskId(2), cwd: '/repo' }, { asProposed: true }]]);
    // A card a third task just joined: ignored again.
    const { card: next } = cardFixture('local_guard_3', toolsOf(3), { spawner: { ...spawner } });
    next.flush();
    now += 10;
    click(next.tree);
    assert.equal(calls.length, 1);
    // A clock that went back more than 400 ms behind the join is let through (`Date.now() + 400 < n`).
    now -= 1000;
    click(next.tree);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].length, 3);
  } finally { Date.now = realNow; }
});

test('Options: Environment (Local; cloud disabled, no This session), Worktree, Model, Effort, Permissions (tasks-04)', () => {
  const { s0e, host } = rowFixture('local_options', toolsOf(2));
  const toggle = nodes(s0e.tree, n => n.props?.['data-options-toggle'] === '')[0];
  assert.equal(toggle.props.children, 'Options');
  const form = optionsForm(s0e.tree);
  assert.ok(form, 'the Options popover holds the c227f4d5e form');
  assert.equal(form.props.places.hereHidden, true);
  assert.equal(form.props.places.cloudHidden, false);
  assert.deepEqual(form.props.places.cloudTargets, []);
  assert.equal(form.props.resolved.place.kind, 'local');
  assert.equal(form.props.resolved.target, 'worktree');
  assert.equal(form.props.value.useWorktree, true);
  // The form's rows (SSR): each menu trigger is labelled "{name}: {value}"; the folder row; the worktree switch, on.
  const html = renderToStaticMarkup(React.createElement(A.ProposalHostProvider, { value: host }, React.createElement(form.type, form.props)));
  for (const label of ['Environment: Local', 'Model: GPT-5.5', 'Effort: Medium', 'Permissions: Manual']) assert.equal(count(html, `aria-label="${label}"`), 1, label);
  assert.deepEqual([...html.matchAll(/text-secondary row-start-1">([^<]+)</g)].map(m => m[1]), ['Environment', 'Model', 'Effort', 'Permissions']);
  assert.match(html, /<span class="sr-only">Folder<\/span><bdi class="whitespace-pre-wrap">repo<\/bdi>/);
  assert.match(html, /<label for="([^"]+)" class="min-w-0 flex-1 cursor-interactive truncate text-secondary">Worktree<\/label><span data-checked="" role="switch" tabindex="0" id="[^"]+" aria-checked="true" data-cds="Switch" data-size="xs"/);
  assert.doesNotMatch(html, /This session|Starts as Claude proposed/);
  // The Environment menu: Local (checked), the cloud entry disabled with the official reason, no "This session" item.
  const pq = fixture(inner(form), form.props, contextsFor(host, null));
  const environment = nodes(pq.tree, n => n.props?.name === 'Environment' && n.props?.items !== undefined)[0];
  const items = nodes(environment.props.items, n => n.props?.checkedRole === 'radio' || n.props?.disabledReason !== undefined);
  assert.deepEqual(items.map(n => [n.props.checked ?? null, n.props.disabled ?? false]), [[true, false], [null, true]]);
  assert.equal(items[0].props.children, 'Local');
  assert.equal(items[1].props.disabledReason, 'No cloud environment configured');
  // The Permissions menu: the local modes for a session in Manual (no bypass, no auto without the kernel's auto).
  const permissions = nodes(pq.tree, n => n.props?.name === 'Permissions' && Array.isArray(n.props?.items))[0];
  assert.deepEqual(permissions.props.items.map(i => [i.label, i.checked]), [['Manual', true], ['Accept edits', false], ['Plan', false]]);
  // Model / Effort menus list the host's models and the model's own levels (host adapter over CdsDropdown).
  const selector = nodes(pq.tree, n => n.props?.modelName === 'Model')[0];
  assert.deepEqual([selector.props.modelId, selector.props.effort, selector.props.modelLabel], ['gpt-5.5', 'medium', 'GPT-5.5']);
  const parts = fixture(A.ProposalModelSelector, nodes(fixture(inner(selector), selector.props, contextsFor(host, null)).tree, n => typeof n.props?.children === 'function')[0].props,
    contextsFor(host, null)).tree;
  const modelMenu = nodes(parts, n => n.type === A.ModelSelectorParts.Trigger)[0], effortMenu = nodes(parts, n => n.type === A.ModelSelectorParts.Effort)[0];
  assert.deepEqual(modelMenu.props.items.map(i => [i.label, i.checked, i.checkedRole]), [['GPT-5.5', true, 'radio'], ['GPT-5.4', false, 'radio']]);
  assert.deepEqual(effortMenu.props.items.map(i => [i.label, i.checked]), [['Low', false], ['Medium', true], ['High', false], ['Extra high', false]]);
});

test('Options: picking a model or a level writes the row options; a model without levels drops the Effort row', () => {
  const parent = 'local_model_pick';
  const { s0e, host } = rowFixture(parent, toolsOf(2));
  const pick = () => {
    const form = optionsForm(s0e.tree);
    const selector = nodes(fixture(inner(form), form.props, contextsFor(host, null)).tree, n => n.props?.modelName === 'Model')[0];
    const root = nodes(fixture(inner(selector), selector.props, contextsFor(host, null)).tree, n => typeof n.props?.children === 'function')[0];
    return fixture(A.ProposalModelSelector, root.props, contextsFor(host, null)).tree;
  };
  nodes(pick(), n => n.type === A.ModelSelectorParts.Effort)[0].props.items.find(i => i.label === 'High').onSelect();
  s0e.render();
  assert.equal(optionsForm(s0e.tree).props.resolved.effort, 'high');
  nodes(pick(), n => n.type === A.ModelSelectorParts.Trigger)[0].props.items.find(i => i.label === 'GPT-5.4').onSelect();
  s0e.render();
  const resolved = optionsForm(s0e.tree).props.resolved;
  assert.equal(resolved.modelId, 'gpt-5.4');
  // qG: the model differs from the session's, its level falls back (the model has none), the mode is spelled out.
  assert.deepEqual(resolved.pickOptions.overrides, { model: 'gpt-5.4', effort: undefined, permissionMode: 'default' });
  const html = renderToStaticMarkup(React.createElement(A.ProposalHostProvider, { value: host }, React.createElement(optionsForm(s0e.tree).type, optionsForm(s0e.tree).props)));
  assert.match(html, /aria-label="Model: GPT-5.4"/);
  assert.doesNotMatch(html, /aria-label="Effort:/);
});

test('row actions go to the spawner: Start (the primary target), Do it here, X (dismiss)', () => {
  const parent = 'local_actions', calls = [];
  const tools = toolsOf(2);
  const spawner = { ...spawnerFor(parent, queued(tools)), requestSpawn: (...args) => { calls.push(['spawn', ...args]); return Promise.resolve(true); },
    dismiss: ref => { calls.push(['dismiss', ref]); return Promise.resolve(); } };
  const { s0e } = rowFixture(parent, tools, { spawner });
  const actions = nodes(s0e.tree, n => typeof n.props?.onNewSession === 'function')[0].props;
  assert.equal(actions.hereHidden, false);
  actions.onNewSession();
  actions.onHere();
  nodes(s0e.tree, n => typeof n.props?.onDismiss === 'function')[0].props.onDismiss();
  assert.deepEqual(calls.map(c => c.slice(0, 3)), [['spawn', 'worktree', { key: taskId(1), cwd: '/repo' }], ['spawn', 'here', { key: taskId(1), cwd: '/repo' }],
    ['dismiss', { key: taskId(1) }]]);
});

test('a mode picked in Options shows on the row as "{mode} mode" (tasks-04); the row options outlive the popover', () => {
  const parent = 'local_mode', starts = [];
  const tools = toolsOf(2);
  const spawner = { ...spawnerFor(parent, queued(tools)), requestSpawn: (...args) => { starts.push(args); return Promise.resolve(true); } };
  const { s0e, host } = rowFixture(parent, tools, { spawner });
  const form = optionsForm(s0e.tree);
  const pq = fixture(inner(form), form.props, contextsFor(host, null));
  const permissions = nodes(pq.tree, n => n.props?.name === 'Permissions' && Array.isArray(n.props?.items))[0];
  permissions.props.items.find(i => i.label === 'Plan').onSelect();
  // The row's options store (c227f4d5e YG, keyed by the row) holds the edit: the description line names the mode.
  s0e.render();
  assert.equal(optionsForm(s0e.tree).props.resolved.mode, 'plan');
  // (SSR reads a zustand store's initial state, so the edited line is read from the row's own render here.)
  const line = nodes(s0e.tree, n => n.props?.className === 'line-clamp-2 break-words text-body text-secondary' && n.props?.id !== undefined)[0];
  assert.equal(renderToStaticMarkup(line).replace(/ id="[^"]+"/, ''),
    '<span class="line-clamp-2 break-words text-body text-secondary"><span data-start-where="" class="text-primary">Plan mode · </span><bdi>Short 1</bdi></span>');
  // Start hands the spawner the pick: qG's pickOptions with the mode as an override (F1e then resolves it with zG).
  nodes(s0e.tree, n => typeof n.props?.onNewSession === 'function')[0].props.onNewSession();
  assert.equal(starts.length, 1);
  assert.deepEqual(starts[0].slice(0, 2), ['worktree', { key: taskId(1), cwd: '/repo' }]);
  assert.equal(starts[0][2].overrides.permissionMode, 'plan');
  assert.equal(G.resolveStartPermissionMode(starts[0][2], 'default'), 'plan');
  // Another row of the same card is untouched.
  const other = rowFixture(parent, [tool(2), tool(1)]);
  assert.equal(optionsForm(other.s0e.tree).props.resolved.mode, 'default');
});

test('inline gate, "Sent to this session", and the fallback tool row for a call that cannot be a card', () => {
  assert.equal(G.inlineSpawnerGate(true, { id: 'local_x', type: 'local' }), true);
  assert.equal(renderToStaticMarkup(React.createElement(G.SentHereNotice, { task: { title: 'Task 1' } })), '<span role="status" class="sr-only select-none"></span>');
  // A failed proposing call is the host's own tool row (Uz), outside the card.
  const failed = tool(1, { status: 'error', isError: true, output: 'boom' });
  const fallback = record => React.createElement('div', { 'data-host-tool': record.id });
  assert.equal(renderToStaticMarkup(turnCard('local_failed', [failed], { queue: [], renderToolFallback: fallback })),
    '<span role="status" class="sr-only select-none"></span><div data-host-tool="call_1"></div>');
  // Without a spawner (no live parent) a proposed task is not a card row either: its tool row stays.
  const offline = renderToStaticMarkup(wrap(hostFor('local_off', queued(toolsOf(1)), { renderToolFallback: fallback }), null,
    React.createElement(G.TurnProposalGroup, { tools: toolsOf(1), sessionRef: { id: 'local_off', type: 'local' } })));
  assert.match(offline, /<div data-host-tool="call_1"><\/div>/);
  assert.doesNotMatch(offline, /data-proposed-task-state/);
});
