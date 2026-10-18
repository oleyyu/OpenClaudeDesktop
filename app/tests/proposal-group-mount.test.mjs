import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R4f-proposal P5 (tasks-proposal-group-card WI-5; tasks-03 / tasks-04 / tasks-11 / toolcards-20 / transcript-03): the
// inline proposal group card mounted in the transcript. src/source-proposal-host.jsx (the host's Lb: data from the open
// session, one spawner per parent, the background start) is driven here the way main.jsx drives it — the same filtered
// rows, the same anchors, the same two mount points — over host-shaped transcript items (code_desktop spawn_task
// mcpToolCalls) and stub rpc / call. SSR for the markup; the card's own components under a hook dispatcher (D21) for
// the clicks; main.jsx's wiring itself checked on its AST. No browser, no DOM, no network, no process, no port.
const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
let server, H, G, A;
before(async () => {
  // hmr: false, ws: false — no WebSocket server, so the test listens on no port.
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  H = await server.ssrLoadModule('/src/source-proposal-host.jsx');
  G = await server.ssrLoadModule('/src/generated/proposal-group/index.mjs');
  A = await server.ssrLoadModule('/src/source-proposal-group-adapters.jsx');
});
after(async () => { await server?.close(); });

const h = React.createElement;
const taskId = n => `task_${String(n).padStart(8, '0')}`;
// What a Codex core reports for OpenClaude Desktop's spawn_task (electron/agent-tools/session.mjs).
const spawn = (n, turnId, extra = {}) => ({ id: `call_${n}`, turnId, type: 'mcpToolCall', server: 'code_desktop', tool: 'spawn_task', status: 'completed',
  arguments: { title: `Task ${n}`, tldr: `Short ${n}`, prompt: `Do task ${n}` },
  result: { content: [{ type: 'text', text: `Noted (position ${n}, task_id: ${taskId(n)}). A chip is showing for the user.` }] }, error: null, ...extra });
const user = (id, turnId) => ({ id, turnId, type: 'userMessage', content: [{ type: 'text', text: 'Go' }] });
const reply = (id, turnId) => ({ id, turnId, type: 'agentMessage', text: 'Done.' });
const MODELS = [
  { id: 'gpt-5.5', model: 'gpt-5.5', displayName: 'GPT-5.5', defaultReasoningEffort: 'medium',
    supportedReasoningEfforts: [{ reasoningEffort: 'low' }, { reasoningEffort: 'medium' }, { reasoningEffort: 'high' }] },
  { id: 'gpt-5.4', model: 'gpt-5.4', displayName: 'GPT-5.4', supportedReasoningEfforts: [] },
  { id: 'old', model: 'old', displayName: 'Old', hidden: true },
];

// A stub host: main.jsx's primitives, recording what reaches the core and main.
function stubHost({ running = false, failTurn = false, workspace = { isRepo: true, branch: 'main' } } = {}) {
  const calls = [], state = { sessions: [], metadata: {}, discarded: [], notices: [], opened: [], resumed: new Set(), turnRequested: [] };
  let threads = 0;
  const call = async (name, payload) => {
    calls.push(['call', name, payload]);
    if (name === 'workspace-info') return workspace;
    if (name === 'prepare-worktree') return `${payload.cwd}-wt`;
    if (name === 'task-proposals') return { revision: 1, taskProposals: {} };
    return {};
  };
  const rpc = async (method, params) => {
    calls.push(['rpc', method, params]);
    if (method === 'thread/start') return { thread: { id: `local_child_${++threads}`, cwd: params.cwd } };
    if (method === 'turn/start' && failTurn) throw new Error('The core refused the turn.');
    return {};
  };
  const apply = (key, update) => { state[key] = typeof update === 'function' ? update(state[key]) : update; };
  const host = {
    serviceTier: 'flex', permissionHints: () => ({}), withAgentChoice: params => params, customization: false, generatesTitles: false,
    setSessions: u => apply('sessions', u), setSessionMetadata: u => apply('metadata', u), setBoot() {}, setAgentChoices() {}, resumed: { current: state.resumed },
    discardFailedStart: (id, options) => state.discarded.push([id, options]), ensureResumed: async id => { calls.push(['resume', id]); },
    setTurnRequested: value => state.turnRequested.push(value), turnOptions: cwd => ({ cwd, model: 'gpt-5.5', effort: 'medium' }), loadQueue: id => calls.push(['loadQueue', id]),
    isBusy: () => false, notify: (message, options) => state.notices.push([message, options?.variant]), captureGuardedSnapToBottom: () => () => calls.push(['snap']),
    openSession: (id, opener) => state.opened.push([id, opener?.title]),
    renderToolFallback: item => h('div', { 'data-host-tool': item.id }),
    renderMarkdown: text => h('p', { 'data-host-markdown': '' }, text),
  };
  return { calls, state, call, rpc, host, running };
}
const optionsFor = (parent, items, stub, extra = {}) => ({
  sessionId: parent, items, sessions: [{ id: parent, name: 'Parent', cwd: '/repo' }, ...(extra.sessions ?? [])], sessionMetadata: extra.metadata ?? {},
  fields: null, parent: { model: 'gpt-5.5', effort: 'medium', permission: 'ask', cwd: '/repo' }, connected: true, archived: false,
  running: stub.running, hereDisabled: false, runningTurns: extra.runningTurns ?? {}, needsInput: [], models: MODELS,
  call: stub.call, rpc: stub.rpc, onEvent: null, initialOutcomes: extra.outcomes, fallbackKey: 'normal', host: stub.host,
});
// main.jsx's shape: the filtered rows, a card after the anchor row, the feed end after the rows.
function Feed({ options, mode = 'code', onCards }) {
  const active = H.proposalCardsActive(mode, options.sessionId);
  const rows = H.withoutProposalCardTools(options.items, active);
  const cards = H.useProposalCards({ ...options, active });
  onCards?.(cards);
  const anchors = cards.anchors(rows);
  return h('div', { 'data-feed': '' }, rows.map((item, index) => h(React.Fragment, { key: item.id },
    h('div', { 'data-row': item.id }), anchors.has(index) ? h(H.ProposalTurnCard, { cards, row: anchors.get(index) }) : null)),
  h(H.ProposalFeedEnd, { cards }));
}
const render = (options, extra = {}) => {
  let cards;
  const html = renderToStaticMarkup(h(Feed, { options, mode: extra.mode, onCards: value => { cards = value; } }));
  return { html, cards };
};
const order = html => [...html.matchAll(/data-row="([^"]+)"|data-proposal-group="([^"]+)"/g)].map(m => m[1] ?? `card:${m[2]}`);

// The hook dispatcher (D21, after tests/sessions-page-current.test.mjs / proposal-group-card.test.mjs).
function fixture(component, props, contexts) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: context => (contexts.has(context) ? contexts.get(context) : context._currentValue),
    useId: () => `:pm${cursor++}:`,
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
  const run = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = hooks;
    try { return (tree = component(props)); } finally { internal.H = old; }
  };
  run();
  return { get tree() { return tree; }, render: run, flush() { while (effects.length) effects.shift()(); } };
}
const nodes = (tree, predicate) => {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  const handed = Object.entries(tree.props ?? {}).filter(([key, value]) => key === 'children' || React.isValidElement(value)
    || (Array.isArray(value) && value.some(v => React.isValidElement(v)))).map(([, value]) => value);
  return [...(predicate(tree) ? [tree] : []), ...handed.flatMap(value => nodes(value, predicate))];
};
const inner = element => element.type.type ?? element.type;
const contextsOf = cards => new Map([[A.ProposalHost, cards.host], [G.ProposalSpawnerContext, cards.spawner]]);
// The mounted card's TurnProposalGroup (R$) → its group card (B$), under the dispatcher with the mount's contexts.
function mountedCard(cards, rows) {
  const row = cards.anchors(rows).values().next().value;
  const turn = fixture(inner({ type: G.TurnProposalGroup }), { tools: row.tools, sessionRef: cards.sessionRef }, contextsOf(cards));
  const group = nodes(turn.tree, n => n.props?.cardKey !== undefined)[0];
  return fixture(inner(group), group.props, contextsOf(cards));
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test('official pins: the two feed rows the host mounts and the presets-on gate (2.42304.0)', () => {
  const c96 = raw('c96d752d0-BOCqU7c2.js'), cf74 = raw('cf74bc599-D9NZWRyl.js');
  for (const needle of [
    'case"turnSuggestions":return n===void 0?null:D9(Ye,b("div",{"data-find-omitted":"",className:Ye===!1?"flex flex-col gap-[var(--chat-item-gap)]":"flex flex-col",children:b(R$,{sessionRef:n,tools:e.tools})}))',
    'case"unplacedSuggestions":return n===void 0?null:D9(Ye,b("div",{"data-find-omitted":"",className:"contents",children:b(z$,{sessionRef:n,tasks:e.tasks})}))',
    'le!==void 0&&ce.length>0&&tf(e,r,!1,I)&&((ce.length!==1||t.sentHereSuggestionIds?.includes(pL(ce[0])??"")!==!0)&&s.push({kind:"turnSuggestions",id:`turnSuggestions:${le}`,tools:ce})',
    't.hostDrawsTurnSuggestions===!0&&gL(e)',
  ]) assert.equal(occurrences(c96, needle), 1, needle);
  for (const needle of ['cr=to(),lr=Zs(cr,t)', 'Or&&t&&dr&&!lr&&u(lb,{sessionRef:t,scrollRef:r,captureGuardedSnapToBottom:x},`chip-${e}`)',
    'function Lb({active:e,host:t,sessionRef:n,children:r}){let[i,s]=a(null),c=e?i:null;return u(Sc.Provider,{value:t,children:o(mc.Provider,{value:c,children:[r,u(nc,{task:c?.lastSentHere})'])
    assert.equal(occurrences(cf74, needle), 1, needle);
});

test('gate and rows: Code sessions only; placed spawn_task calls leave the rows, running and failed ones stay', () => {
  assert.equal(H.PRESETS_ON, true);
  assert.equal(H.proposalCardsActive('code', 'local_a'), true);
  assert.equal(H.proposalCardsActive('cowork', 'local_a'), false);
  assert.equal(H.proposalCardsActive('code', null), false);
  const running = spawn(3, 't1', { status: 'inProgress', result: null }), failed = spawn(4, 't1', { status: 'failed', result: null, error: { message: 'no' } });
  const items = [user('u1', 't1'), spawn(1, 't1'), running, failed, spawn(2, 't1'), reply('a1', 't1'), spawn(5, null)];
  assert.deepEqual(H.withoutProposalCardTools(items, true).map(i => i.id), ['u1', 'call_3', 'call_4', 'a1', 'call_5']);
  assert.equal(H.withoutProposalCardTools(items, true), H.withoutProposalCardTools(items, true), 'cached per items array');
  assert.equal(H.withoutProposalCardTools(items, false), items);
  const plain = [user('u1', 't1'), reply('a1', 't1')];
  assert.equal(H.withoutProposalCardTools(plain, true), plain, 'nothing to hide: the same array');
});

test('mount: the card follows the proposing turn\'s last shown row; its calls are not drawn again as tool rows', () => {
  const stub = stubHost();
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), reply('a1', 't1'), user('u2', 't2'), reply('a2', 't2')];
  const { html } = render(optionsFor('local_place', items, stub));
  assert.deepEqual(order(html), ['u1', 'a1', 'card:turnSuggestions:call_1', 'u2', 'a2']);
  assert.match(html, /<div class="source-message flex flex-col gap-\[var\(--chat-item-gap\)\]" data-find-omitted="" data-proposal-group="turnSuggestions:call_1"><span role="status" class="sr-only select-none"><\/span><div class="my-\[6px\] flex w-full flex-col" role="group" aria-label="2 suggested tasks">/);
  assert.equal(occurrences(html, 'data-proposed-task-state="proposed"'), 2);
  assert.equal(occurrences(html, '>Start all</span>'), 1);
  assert.equal(occurrences(html, '>Options</span>'), 2);
  assert.doesNotMatch(html, /data-row="call_|data-host-tool=/);
  // The last row of a turn that ends on the call itself is the reply before it (the call left the rows).
  const tail = render(optionsFor('local_tail', [user('u1', 't1'), reply('a1', 't1'), spawn(1, 't1')], stub)).html;
  assert.deepEqual(order(tail), ['u1', 'a1', 'card:turnSuggestions:call_1']);
  assert.match(tail, /<span class="min-w-0 truncate">New session<\/span>/, 'one proposal: the New session band');
  // A turn whose only call still runs keeps its tool row and gets no card yet.
  const proposing = render(optionsFor('local_running', [user('u1', 't1'), spawn(1, 't1', { status: 'inProgress', result: null })], stub)).html;
  assert.deepEqual(order(proposing), ['u1', 'call_1']);
  // Cowork: no card, the calls are ordinary rows.
  const cowork = renderToStaticMarkup(h(Feed, { options: optionsFor('local_cowork', items, stub), mode: 'cowork' }));
  assert.deepEqual(order(cowork), ['u1', 'call_1', 'call_2', 'a1', 'u2', 'a2']);
  // The feed end: Lb's "Sent to this session" announcer, no unplaced row (the host queue comes from these same calls).
  assert.match(html, /<span role="status" class="sr-only select-none"><\/span><\/div>$/);
});

test('Start: a background session in a worktree with the task\'s prompt; the parent stays open; "{count} started"', async () => {
  const parent = 'local_start', stub = stubHost();
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), reply('a1', 't1')];
  const { cards } = render(optionsFor(parent, items, stub));
  const queue = cards.spawner.readVisibleQueue();
  assert.deepEqual(queue.map(r => [r.id, r.title, r.prompt]), [[taskId(1), 'Task 1', 'Do task 1'], [taskId(2), 'Task 2', 'Do task 2']]);
  assert.equal(cards.spawner.primaryTarget, 'worktree');
  assert.equal(await cards.spawner.requestSpawn('worktree', { key: G.proposalKey(queue[0]), cwd: queue[0].cwd }, {}), true);
  await settle();
  const steps = stub.calls.filter(c => c[0] !== 'resume').map(c => [c[1], c[1] === 'task-proposals' ? c[2].operation : undefined]);
  assert.deepEqual(steps, [['workspace-info', undefined], ['prepare-worktree', undefined], ['thread/start', undefined], ['thread/name/set', undefined], ['turn/start', undefined], ['task-proposals', 'started']]);
  const [, , start] = stub.calls.find(c => c[1] === 'thread/start');
  assert.equal(start.cwd, '/repo-wt');
  assert.equal(start.model, 'gpt-5.5');
  assert.equal(start.serviceTier, 'flex');
  assert.deepEqual(start.codeDesktop, { surface: 'code' });
  assert.equal(start.developerInstructions, H.CODE_DEVELOPER_INSTRUCTIONS);
  assert.equal(start.approvalPolicy !== undefined, true, 'thread permission params of the parent\'s mode');
  const [, , turn] = stub.calls.find(c => c[1] === 'turn/start');
  assert.deepEqual(turn.input, [{ type: 'text', text: 'Do task 1', text_elements: [] }]);
  assert.deepEqual([turn.threadId, turn.cwd, turn.model, turn.effort], ['local_child_1', '/repo-wt', 'gpt-5.5', 'medium']);
  assert.equal(turn.sandboxPolicy?.type, 'workspaceWrite');
  assert.deepEqual(turn.sandboxPolicy.writableRoots, ['/repo-wt'], 'its own folder, none of the parent\'s additional folders');
  assert.deepEqual(stub.calls.find(c => c[1] === 'thread/name/set')[2], { threadId: 'local_child_1', name: 'Task 1' });
  assert.deepEqual(stub.calls.find(c => c[1] === 'task-proposals')[2], { operation: 'started', parentId: parent, childId: 'local_child_1', taskId: taskId(1) });
  // The row is listed, never opened; the lineage is on its metadata at once.
  assert.deepEqual(stub.state.sessions.map(s => [s.id, s.name]), [['local_child_1', 'Task 1']]);
  assert.deepEqual(stub.state.metadata.local_child_1, { surface: 'code', spawnedFrom: { sessionId: parent, taskId: taskId(1), title: 'Task 1' } });
  assert.ok(stub.state.resumed.has('local_child_1'));
  assert.deepEqual(stub.state.opened, []);
  assert.deepEqual(stub.state.notices, []);
  // The next render: the task is started (its child's row), one proposal left, "1 started".
  const next = render(optionsFor(parent, items, stub, { sessions: [{ id: 'local_child_1', name: 'Task 1', cwd: '/repo-wt' }], metadata: stub.state.metadata, runningTurns: { local_child_1: 'turn' } }));
  assert.match(next.html, /<span class="min-w-0 truncate">2 suggested tasks<\/span><span class="shrink-0 text-muted-as-secondary">1 started<\/span>/);
  assert.match(next.html, /data-proposed-task-state="started"[^>]*><div class="@container w-full"><div data-side-session-state="working"/);
  assert.equal(occurrences(next.html, 'data-proposed-task-state="proposed"'), 1);
  assert.deepEqual(next.cards.spawner.readVisibleQueue().map(r => r.id), [taskId(2)]);
});

test('Start all: the card\'s own handler starts every task in the background, one after another', async () => {
  const realNow = Date.now;
  try {
    let now = 5_000_000;
    Date.now = () => now;
    const parent = 'local_all', stub = stubHost({ workspace: { isRepo: false } });
    const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), spawn(3, 't1'), reply('a1', 't1')];
    const options = optionsFor(parent, items, stub);
    const { cards } = render(options);
    const card = mountedCard(cards, H.withoutProposalCardTools(items, true));
    card.flush(); // u0e: the tasks just joined
    now += 450;
    const startAll = nodes(card.tree, n => n.props?.children === 'Start all')[0];
    startAll.props.onClick({ nativeEvent: { timeStamp: 0, type: 'click' } });
    for (let i = 0; i < 20 && stub.calls.filter(c => c[1] === 'task-proposals').length < 3; i++) await settle();
    const starts = stub.calls.filter(c => c[1] === 'thread/start' || c[1] === 'turn/start').map(c => [c[1], c[2].threadId ?? c[2].cwd]);
    assert.deepEqual(starts, [['thread/start', '/repo'], ['turn/start', 'local_child_1'], ['thread/start', '/repo'], ['turn/start', 'local_child_2'],
      ['thread/start', '/repo'], ['turn/start', 'local_child_3']], 'in order; a folder that is not a repository starts in place');
    assert.deepEqual(stub.calls.filter(c => c[1] === 'turn/start').map(c => c[2].input[0].text), ['Do task 1', 'Do task 2', 'Do task 3']);
    assert.equal(stub.calls.some(c => c[1] === 'prepare-worktree'), false);
    assert.deepEqual(stub.state.sessions.map(s => s.id), ['local_child_3', 'local_child_2', 'local_child_1']);
    assert.deepEqual(stub.state.opened, []);
  } finally { Date.now = realNow; }
});

test('Options: the popover\'s form over the host catalog (model/list), the parent\'s mode and the host\'s Auto', () => {
  const parent = 'local_opts', stub = stubHost();
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1')];
  const { cards } = render(optionsFor(parent, items, stub));
  assert.deepEqual(cards.host.catalog, { models: [
    { id: 'gpt-5.5', name: 'GPT-5.5', efforts: [{ id: 'low' }, { id: 'medium', recommended: true }, { id: 'high' }] },
    { id: 'gpt-5.4', name: 'GPT-5.4', efforts: [] }] }, 'hidden models are left out; levels are the kernel\'s own');
  const card = mountedCard(cards, H.withoutProposalCardTools(items, true));
  const row = nodes(card.tree, n => n.props?.item !== undefined && n.props?.registerStart !== undefined)[0];
  const proposed = nodes(fixture(inner(row), row.props, contextsOf(cards)).tree, n => n.props?.record !== undefined && n.props?.picksApply !== undefined)[0];
  const s0e = fixture(inner(proposed), proposed.props, contextsOf(cards));
  s0e.flush();
  assert.equal(nodes(s0e.tree, n => n.props?.['data-options-toggle'] === '')[0].props.children, 'Options');
  const form = nodes(s0e.tree, n => n.props?.places !== undefined && n.props?.resolved !== undefined && n.props?.catalog !== undefined)[0];
  assert.ok(form, 'the Options popover holds the c227f4d5e form');
  assert.deepEqual([form.props.resolved.place.kind, form.props.resolved.target, form.props.value.useWorktree], ['local', 'worktree', true]);
  assert.equal(form.props.places.localLabel, 'Local');
  assert.deepEqual(form.props.places.cloudTargets, []);
  const markup = renderToStaticMarkup(h(A.ProposalHostProvider, { value: cards.host }, h(form.type, form.props)));
  for (const label of ['Environment: Local', 'Model: GPT-5.5', 'Effort: Medium', 'Permissions: Manual']) assert.equal(occurrences(markup, `aria-label="${label}"`), 1, label);
  const pq = fixture(inner(form), form.props, contextsOf(cards));
  const permissions = nodes(pq.tree, n => n.props?.name === 'Permissions' && Array.isArray(n.props?.items))[0];
  const modes = permissions.props.items.map(i => [i.label, !!i.checked]);
  assert.ok(modes.some(([label, checked]) => label === 'Manual' && checked), JSON.stringify(modes));
  assert.ok(modes.some(([label]) => label === 'Auto'), 'the host kernel offers Auto');
  assert.ok(!modes.some(([label]) => /Bypass/.test(label)), 'no Bypass unless the parent runs it');
});

test('results: main\'s and this window\'s outcomes leave the queue; a resolved call is the host tool row, once', () => {
  const parent = 'local_results', stub = stubHost();
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), spawn(3, 't1'), reply('a1', 't1')];
  // Main dismissed task 1 before this window opened (persisted): not queued, no outcome in this window → the original
  // reads it as resolved: a settled row of the card (P$; c0e `inLedger: e.length > 1`), never a second tool row.
  const { html, cards } = render(optionsFor(parent, items, stub, { outcomes: { [parent]: { [taskId(1)]: 'dismissed' } } }));
  assert.deepEqual(cards.spawner.readVisibleQueue().map(r => r.id), [taskId(2), taskId(3)]);
  assert.deepEqual(order(html), ['u1', 'a1', 'card:turnSuggestions:call_1']);
  assert.equal(occurrences(html, 'data-proposed-task-state="resolved"'), 1);
  assert.equal(occurrences(html, 'data-proposed-task-state="proposed"'), 2);
  assert.doesNotMatch(html, /data-host-tool=/);
  // Every task of the turn settled before this window: B$ hands each call back to the plain tool row (Uz → the host's
  // row for that item), in the card's slot — each call drawn once.
  const settled = render(optionsFor('local_results_all', items, stub, { outcomes: { local_results_all: { [taskId(1)]: 'dismissed', [taskId(2)]: 'dismissed', [taskId(3)]: 'sent_here' } } })).html;
  assert.deepEqual([...settled.matchAll(/data-host-tool="([^"]+)"/g)].map(m => m[1]), ['call_1', 'call_2', 'call_3']);
  assert.deepEqual(order(settled), ['u1', 'a1', 'card:turnSuggestions:call_1']);
  assert.doesNotMatch(settled, /data-proposed-task-state/);
  // This window dismissed task 2 (the spawner records it before main answers): it leaves the queue at once and the
  // card reads its outcome from the results store (EQ) — the Dismissed row. (SSR reads a zustand store's initial state,
  // so the card's rows are read under the dispatcher, where the store answers its current state.)
  G.recordProposalOutcome(parent, taskId(2), 'dismissed');
  const next = render(optionsFor(parent, items, stub, { outcomes: { [parent]: { [taskId(1)]: 'dismissed' } } }));
  assert.deepEqual(next.cards.spawner.readVisibleQueue().map(r => r.id), [taskId(3)]);
  const rows = H.withoutProposalCardTools(items, true);
  const turn = fixture(inner({ type: G.TurnProposalGroup }), { tools: next.cards.anchors(rows).values().next().value.tools, sessionRef: next.cards.sessionRef }, contextsOf(next.cards));
  const group = nodes(turn.tree, n => n.props?.cardKey !== undefined)[0];
  assert.deepEqual(group.props.items.map(item => [item.taskId, item.state]), [[taskId(1), 'resolved'], [taskId(2), 'dismissed'], [taskId(3), 'proposed']]);
  const dismissedRow = nodes(fixture(inner(group), group.props, contextsOf(next.cards)).tree, n => n.props?.item?.state === 'dismissed')[0];
  assert.equal(renderToStaticMarkup(h(dismissedRow.type, dismissedRow.props)).includes('>Dismissed<'), true);
});

test('Do it here, dismiss and a failed start go through the host bridge', async () => {
  const parent = 'local_here', stub = stubHost();
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), spawn(3, 't1')];
  const { cards } = render(optionsFor(parent, items, stub));
  const [first, second] = cards.spawner.readVisibleQueue();
  await cards.spawner.requestSpawn('here', { key: G.proposalKey(first), cwd: first.cwd }, {});
  await settle();
  const [, , turn] = stub.calls.find(c => c[1] === 'turn/start');
  assert.deepEqual([turn.threadId, turn.input], [parent, [{ type: 'text', text: 'Do this task here: “Task 1”', text_elements: [] }]]);
  assert.deepEqual(stub.calls.filter(c => c[0] === 'resume' || c[0] === 'snap').map(c => c[0]), ['snap', 'resume'], 'snap to the bottom, then the send');
  assert.deepEqual(stub.calls.find(c => c[1] === 'task-proposals')[2], { operation: 'outcome', parentId: parent, taskId: taskId(1), outcome: 'sent_here' });
  assert.equal(G.proposalOutcomeStore.getState().byParent[parent][taskId(1)], 'sent_here');
  // Dismiss: main records it, then the task is filed for later (B29 task-backlog-file).
  stub.calls.length = 0;
  await cards.spawner.dismiss({ key: G.proposalKey(second) });
  await settle();
  assert.deepEqual(stub.calls.map(c => [c[1], c[2].operation ?? c[2].source]), [['task-proposals', 'outcome'], ['task-backlog-file', 'dismissed']]);
  assert.equal(stub.calls[0][2].outcome, 'dismissed');
  // While a turn runs, "Do it here" queues behind it.
  const busy = stubHost({ running: true });
  const queued = render(optionsFor('local_here_busy', items, busy)).cards;
  const [task] = queued.spawner.readVisibleQueue();
  await queued.spawner.requestSpawn('here', { key: G.proposalKey(task), cwd: task.cwd }, {});
  await settle();
  assert.deepEqual(busy.calls.filter(c => c[0] === 'rpc' || c[0] === 'loadQueue').map(c => c[1]), ['thread/queue/add', 'local_here_busy']);
  // A start whose first turn is refused: the empty thread is discarded (stay), start_failed, the official toast.
  const failing = stubHost({ failTurn: true });
  const failed = render(optionsFor('local_fail', items, failing)).cards;
  const [record] = failed.spawner.readVisibleQueue();
  await failed.spawner.requestSpawn('worktree', { key: G.proposalKey(record), cwd: record.cwd }, {});
  await settle();
  assert.deepEqual(failing.state.discarded, [['local_child_1', { stay: true, text: '', entries: [], mentions: [] }]]);
  assert.deepEqual(failing.state.notices, [['Couldn’t start the suggested task.', 'danger']]);
  assert.equal(G.proposalOutcomeStore.getState().byParent.local_fail[taskId(1)], 'start_failed');
  assert.equal(failing.calls.some(c => c[1] === 'task-proposals' && c[2].operation === 'started'), false, 'no lineage for a discarded thread');
});

test('zh-CN: the card\'s copy is translated, ICU plurals included', async () => {
  // The intl the card formats with (source-code-start-adapters.jsx useStartIntl: the vendored react-intl createIntl).
  const { kt: createIntl } = await server.ssrLoadModule('/src/generated/chat/vendor-intl-Cf4IuK3L.js');
  const zh = (await import('../electron/i18n/zh-CN/agent-tools.mjs')).default;
  const source = fs.readFileSync(path.join(app, 'electron/i18n/zh-CN/agent-tools.mjs'), 'utf8');
  const block = source.slice(source.indexOf('// R4f-proposal:'), source.indexOf('// R4f-proposal end.'));
  const keys = [...block.matchAll(/^  "((?:[^"\\]|\\.)*)":/gm)].map(m => JSON.parse(`"${m[1]}"`));
  assert.equal(keys.length, 70);
  const intl = createIntl({ locale: 'zh-CN', defaultLocale: 'zh-CN', messages: {}, onError: error => { throw error; } });
  const values = { count: 2, title: 'T', status: 'S', mode: '计划', dir: 'repo', host: 'h', state: '工作中', reason: 'r', name: 'n', value: 'v', repo: 'o/r' };
  for (const key of keys) assert.equal(typeof intl.formatMessage({ id: key, defaultMessage: zh[key] }, values), 'string', key);
  assert.equal(intl.formatMessage({ id: 'x', defaultMessage: zh['{count} started'] }, { count: 1 }), '已启动 1 个');
  for (const english of ['Start all', 'Options', '{mode} mode', 'Couldn’t start the suggested task.', 'Do this task here: “{title}”'])
    assert.ok(keys.includes(english), english);
});

// ---------------------------------------------------------------- main.jsx, read as an AST
test('main.jsx: the floating card is gone; Lb is wired; the card mounts after a turn\'s tail and the feed end after the rows', async () => {
  const { parseAst } = await import('rolldown/parseAst');
  const source = fs.readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const ast = parseAst(source, { lang: 'jsx' }, 'src/main.jsx');
  const text = node => source.slice(node.start, node.end);
  const findAll = (node, predicate, out = []) => {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { for (const child of node) findAll(child, predicate, out); return out; }
    if (typeof node.type === 'string' && predicate(node)) out.push(node);
    for (const key of Object.keys(node)) if (key !== 'parent') findAll(node[key], predicate, out);
    return out;
  };
  const jsx = name => findAll(ast, n => n.type === 'JSXElement' && n.openingElement.name.name === name);
  const calls = name => findAll(ast, n => n.type === 'CallExpression' && (n.callee.name === name || (n.callee.type === 'MemberExpression' && n.callee.property?.name === name)));
  // Imports: the host module, and no floating card.
  const imports = ast.body.filter(n => n.type === 'ImportDeclaration');
  assert.deepEqual(imports.filter(n => n.source.value === './source-proposal-host.jsx').map(n => n.specifiers.map(s => s.imported.name)),
    [['useProposalCards', 'proposalCardsActive', 'withoutProposalCardTools', 'ProposalTurnCard', 'ProposalFeedEnd']]);
  assert.equal(imports.some(n => /source-suggested-tasks/.test(n.source.value)), false);
  assert.equal(jsx('SourceSuggestedTasks').length, 0);
  // The gate and the one filtered list both the footers and the rows read.
  const declarators = Object.fromEntries(findAll(ast, n => n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init).map(n => [n.id.name, text(n.init)]));
  assert.equal(declarators.proposalGate, 'proposalCardsActive(mode, current)');
  assert.equal(declarators.proposalItems, 'withoutProposalCardTools(items, proposalGate)');
  // turn-plan: the Code rows also drop the ccd_turn calls and carry the settled wrap-up receipts (turn-plan-model.mjs).
  assert.equal(declarators.toolRuns, 'withWorkflowToolRuns(mode === "code" ? withTurnBoxRows(proposalItems, settledTurnBoxes) : proposalItems, workflows)');
  assert.equal(declarators.proposalAnchors, 'proposalCards.anchors(shownRows)');
  assert.deepEqual(calls('buildTurnCopyFooters').map(n => text(n.arguments[0])), ['proposalItems']);
  // useProposalCards: the open session, its state, IPC and the host primitives proposal-launch / the spawner need.
  const [hook] = calls('useProposalCards');
  assert.ok(hook, 'useProposalCards is called');
  const props = node => Object.fromEntries(node.properties.filter(p => p.type === 'Property').map(p => [p.key.name, text(p.value)]));
  const options = props(hook.arguments[0]);
  assert.equal(options.active, 'proposalGate');
  assert.equal(options.sessionId, 'current');
  for (const [key, value] of [['items', 'items'], ['sessions', 'sessions'], ['sessionMetadata', 'sessionMetadata'], ['models', 'models'], ['call', 'call'], ['rpc', 'rpc'],
    ['running', 'running'], ['runningTurns', 'state.active'], ['onEvent', 'api?.onEvent'], ['initialOutcomes', 'boot?.config?.taskProposals'],
    ['connected', '!!boot?.connected'], ['archived', '!!session?.archived'], ['hereDisabled', '!!misalignedTurn'], ['needsInput', 'state.approvals.map(approvalOwner)']])
    assert.equal(options[key], value, key);
  assert.match(options.parent, /model, effort, permission: effectivePermission, cwd: workdir \|\| cwd/);
  const host = props(hook.arguments[0].properties.find(p => p.key?.name === 'host').value);
  for (const key of ['serviceTier', 'permissionHints', 'withAgentChoice', 'setSessions', 'setSessionMetadata', 'resumed', 'discardFailedStart', 'ensureResumed',
    'setTurnRequested', 'turnOptions', 'loadQueue']) assert.equal(host[key], key, key);
  for (const key of ['customization', 'toolsFor', 'generatesTitles', 'isBusy', 'notify', 'captureGuardedSnapToBottom', 'openSession', 'renderToolFallback', 'renderMarkdown'])
    assert.ok(host[key], key);
  assert.equal(host.openSession, '(id) => navigate(id)', 'a started session opens only from its row');
  assert.match(host.renderToolFallback, /^\(item\) => <SourceTranscriptRowBoundary sessionId=\{current\} item=\{item\}[^]*<Message item=\{item\}/);
  assert.match(host.renderMarkdown, /<SourceMarkdown text=\{text\}/);
  assert.ok(hook.start < findAll(ast, n => n.type === 'VariableDeclarator' && n.id.name === 'toolRuns')[0].start, 'before the rows are built');
  // ProposalTurnCard: once, inside the shownRows map, after the turn's edits card and before its task events.
  const rowsMap = findAll(ast, n => n.type === 'CallExpression' && text(n.callee) === 'shownRows.map')[0];
  const [card] = jsx('ProposalTurnCard');
  assert.equal(jsx('ProposalTurnCard').length, 1);
  assert.ok(card.start > rowsMap.start && card.end < rowsMap.end, 'inside the row loop');
  assert.equal(text(card.openingElement), '<ProposalTurnCard cards={proposalCards} row={proposalAnchors.get(index)} />');
  const guard = findAll(rowsMap, n => n.type === 'LogicalExpression' && n.right === card)[0];
  assert.equal(text(guard.left), 'proposalAnchors.has(index)');
  const [edits] = findAll(rowsMap, n => n.type === 'JSXElement' && n.openingElement.name.name === 'SourceTurnEdits');
  const [events] = findAll(rowsMap, n => n.type === 'JSXElement' && n.openingElement.name.name === 'SourceTaskEvent');
  assert.ok(edits.end < card.start && card.end < events.start, 'after the edits card, before the task events');
  // ProposalFeedEnd: once, right after the rows and before the optimistic sends.
  const [end] = jsx('ProposalFeedEnd');
  assert.equal(jsx('ProposalFeedEnd').length, 1);
  assert.equal(text(end), '<ProposalFeedEnd cards={proposalCards} />');
  const pending = calls('pendingUserRow')[0];
  assert.ok(rowsMap.end < end.start && end.end < pending.start);
  // Both inside the session's load error boundary, with the transcript.
  const [boundary] = jsx('SourceSessionErrorBoundary');
  assert.ok(boundary.start < card.start && end.end < boundary.end);
  // The Code developer instructions the child session starts with are main.jsx's own.
  assert.ok(source.includes(JSON.stringify(H.CODE_DEVELOPER_INSTRUCTIONS)));
});

test('retired: the floating card\'s files; mark_chapter\'s base style moved to source-chapters.css', () => {
  for (const file of ['src/source-suggested-tasks.jsx', 'src/source-suggested-tasks.css']) assert.equal(fs.existsSync(path.join(app, file)), false, file);
  const session = fs.readFileSync(path.join(app, 'src/source-session.jsx'), 'utf8');
  assert.doesNotMatch(session, /source-suggested-tasks/);
  assert.match(session, /import \{ SourceClaudeChapter \} from "\.\/source-chapters\.jsx";/);
  const chapters = fs.readFileSync(path.join(app, 'src/source-chapters.jsx'), 'utf8');
  assert.match(chapters, /import "\.\/source-chapters\.css";/);
  const css = fs.readFileSync(path.join(app, 'src/source-chapters.css'), 'utf8');
  assert.match(css, /\.source-chapter \{ margin: 0; color: var\(--cds-text-primary\); font-size: var\(--cds-font-size-body, 13px\); line-height: var\(--cds-leading-body, 19px\);\n  font-weight: var\(--cds-font-weight-semibold, 600\); font-variation-settings: var\(--cds-font-wght-semibold, normal\); scroll-margin-top: 56px; user-select: text; overflow-wrap: break-word; \}/);
  assert.ok(css.indexOf('.source-chapter {') < css.indexOf('.source-chapter[aria-hidden="true"]'));
  assert.equal(occurrences(css, '.source-chapter {'), 1);
});

test('a streaming transcript does not rebuild the card\'s inputs; a newly placed call does', () => {
  const stub = stubHost();
  const base = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1'), reply('a1', 't1')];
  const options = { ...optionsFor('local_stream', base, stub), active: true };
  const probe = fixture(props => H.useProposalCards(props), options, new Map());
  const first = probe.tree, firstRow = first.anchors(base).get(3);
  // The next delta: a new items array (a reply growing at the end), the same proposals.
  options.items = [...base, { ...reply('a2', 't2'), text: 'Wor' }];
  probe.render();
  assert.equal(probe.tree.spawner, first.spawner, 'the spawner snapshot');
  assert.equal(probe.tree.host, first.host, 'the session store host');
  assert.equal(probe.tree.anchors(options.items).get(3), firstRow, 'the turn row and its tools');
  assert.equal(probe.tree.spawner.readVisibleQueue().length, 2);
  // A third task placed: new rows, a new queue.
  options.items = [...base, spawn(3, 't1')];
  probe.render();
  assert.notEqual(probe.tree.host, first.host);
  assert.equal(probe.tree.anchors(H.withoutProposalCardTools(options.items, true)).get(1).tools.length, 3, 'the reply is the last shown row of the turn');
  assert.equal(probe.tree.spawner.readVisibleQueue().length, 3);
});

test('a start keeps its parent\'s tools and agent when the window switches to another session meanwhile', async () => {
  const stub = stubHost();
  stub.host.toolsFor = id => ({ local_tools_a: { disabled: ['Bash'] }, local_tools_b: { disabled: ['Edit'] } })[id] ?? null;
  stub.host.withAgentChoice = (params, key) => ({ ...params, codeDesktop: { ...params.codeDesktop, agent: `agent-of-${key}` } });
  const items = [user('u1', 't1'), spawn(1, 't1'), spawn(2, 't1')];
  const options = { ...optionsFor('local_tools_a', items, stub), active: true };
  const probe = fixture(props => H.useProposalCards(props), options, new Map());
  const [task] = probe.tree.spawner.readVisibleQueue();
  const started = probe.tree.spawner.requestSpawn('worktree', { key: G.proposalKey(task), cwd: task.cwd }, {});
  // The user opens another session before the start reaches the core.
  Object.assign(options, { sessionId: 'local_tools_b', items: [] });
  probe.render();
  await started;
  await settle();
  const [, , start] = stub.calls.find(c => c[1] === 'thread/start');
  assert.deepEqual(start.codeDesktop, { surface: 'code', tools: { disabled: ['Bash'] }, agent: 'agent-of-local_tools_a' });
  const [, , turn] = stub.calls.find(c => c[1] === 'turn/start');
  assert.equal(turn.codeDesktop.agent, 'agent-of-local_tools_a');
  assert.deepEqual(stub.calls.find(c => c[1] === 'task-proposals')[2].parentId, 'local_tools_a');
});
