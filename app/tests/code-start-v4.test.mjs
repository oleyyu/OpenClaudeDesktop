// The 4.16336.0 start card (scripts/extract-code-start-v4.mjs -> src/generated/code-start-v4) under the host's adapters
// (src/source-code-start-v4-adapters.jsx) and host model (src/code-start-host-model.mjs, src/source-code-start.jsx).
// Synthetic fixture data only (folders under /Users/fixture, invented titles).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { startEnvironmentItems, startSessions, startSetupRows, startWaitingSessions } from '../src/code-start-host-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const appRoot = new URL('..', import.meta.url).pathname;
const out = path.join(appRoot, 'src/generated/code-start-v4');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const el = React.createElement;
let server, Start, Face, Adapters, Host, Core, Clawd, HomeLabel;
before(async () => {
  server = await createServer({ configFile: false, root: appRoot, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Start = await server.ssrLoadModule('/src/generated/code-start-v4/start.mjs');
  Face = await server.ssrLoadModule('/src/generated/code-start-v4/face.mjs');
  Clawd = await server.ssrLoadModule('/src/generated/code-start-v4/clawd-replay.mjs');
  Adapters = await server.ssrLoadModule('/src/source-code-start-v4-adapters.jsx');
  Host = await server.ssrLoadModule('/src/source-code-start.jsx');
  Core = await server.ssrLoadModule('/src/cds-core.mjs');
  // relink C3 L1: SourceCodeStart reads the official home label context (cc43287c9 dxe `Qt=rT()`, cd8a7d7c0 y over store u).
  HomeLabel = await server.ssrLoadModule('/src/generated/code-routines-v4/cd8a7d7c0-DuH0T8rm.mjs');
});
after(async () => { await server?.close(); });

const FOLDERS = [{ path: '/Users/fixture/alpha', label: 'alpha' }, { path: '/Users/fixture/beta', label: 'beta' }];
const SESSIONS = [{ id: 's-1', title: 'Fix the parser', cwd: '/Users/fixture/alpha', updatedAt: '2026-11-04T10:00:00Z' },
  { id: 's-2', title: 'Write docs', cwd: '/Users/fixture/beta', updatedAt: '2026-11-04T09:00:00Z' }];
const noop = () => {};
function fixtureHost(extra = {}) {
  const sessions = startSessions(SESSIONS, { approvals: [{ sessionId: 's-1', method: 'item/tool/requestUserInput' }] });
  const opened = [];
  return { opened, value: { sessions: startWaitingSessions(sessions), settled: true, onOpenSession: id => opened.push(id),
    ClawdLaptop: props => el('span', { 'data-fixture-clawd': '', 'data-class': props.className, 'data-replay-on-click': String(props.replayOnClick),
      'data-replay': String(props.replayToken), 'data-url': String(props.animationUrl) }), ...extra } };
}
const rows = () => Start.startEnvironmentRows({ items: startEnvironmentItems([], FOLDERS), labelContext: { home: '/Users/fixture' }, sshOffered: false, sshLoaded: true, sshHosts: [] });
const TASKS = { items: [], settled: true, onStart: () => null, onDelete: () => true, onDeleteAll: () => true };
function card(extra = {}, host = fixtureHost().value) {
  const environments = rows();
  return renderToStaticMarkup(el(Core.CdsRoot, { className: 'contents' }, el(Adapters.StartHostContext.Provider, { value: host },
    el(Start.StartCard, { ready: true, environments, selectedId: environments[0].id, setupRows: [], tasks: TASKS, openingKey: environments[0].id,
      onSelect: noop, chooseOpen: false, onChoose: noop, onRequestComposerFocus: noop, ...extra }))));
}

test('face: the presets gate on gives the start card; the slot shows for it even in a split window', () => {
  assert.equal(Face.startFace({ environments: true }), 'start-card');
  assert.equal(Face.startFace({ environments: false }), 'greeting');
  assert.equal(Face.showStartSlot({ face: 'start-card', inSplitWindow: true }), true);
  assert.equal(Face.showStartSlot({ face: 'greeting', inSplitWindow: true }), false);
  assert.equal(Face.showStartSlot({ face: 'greeting', inSplitWindow: false }), true);
});

test('slot: MQ markup; DQ (useStartSlotMeasure) returns OQ (measureStartSlot), as 3.6556.2 OK returned kK', () => {
  const html = renderToStaticMarkup(el(Start.StartSlot, { slotRef: noop }));
  assert.equal(html, '<div class="flex min-h-full w-full flex-col pb-6"><div aria-hidden="true" class="max-h-0 grow basis-0"></div><div class="flex w-full flex-col"></div></div>');
  assert.equal(Start.useStartSlotMeasure(), Start.measureStartSlot);
  assert.equal(Start.measureStartSlot(null), undefined);
});

test('environment rows: Dye over the host items, ~-relative under labelContext.home; s3 / B5 / V5 exported', () => {
  assert.deepEqual(rows(), [
    { id: '/Users/fixture/alpha', icon: 'Laptop', name: 'alpha', where: { kind: 'path', text: '~/alpha' } },
    { id: '/Users/fixture/beta', icon: 'Laptop', name: 'beta', where: { kind: 'path', text: '~/beta' } },
  ]);
  assert.equal(Start.folderRowId('/x'), 'folder:/x');
  const used = Start.environmentLastUsed({ environments: [{ id: 'preset:a', target: { kind: 'local', cwd: '/x' }, lastUsedAt: 5 }], startedPlaces: [] });
  assert.deepEqual([...used], [['preset:a', 5]]);
  assert.equal(typeof Start.useStableEnvironmentOrder, 'function');
});

test('StartCard SSR: recent environments, current row, Choose environment, Clawd lead, separator, waiting session', () => {
  const html = card();
  assert.match(html, /data-testid="epitaxy-start-card"/);
  assert.match(html, /<ul role="list" aria-label="Recent environments" data-testid="start-card-environments"/);
  assert.equal(html.match(/data-testid="start-card-environment"/g)?.length, 2);
  assert.match(html, /<li aria-current="true" class="px-1 pt-0.5 first:pt-1">/);
  assert.match(html, /data-testid="start-card-choose"/);
  assert.match(html, /Choose environment/);
  assert.match(html, /~\/alpha/);
  // g_e: the Clawd slot above the list, the NW player with m_e and replayOnClick, the default animation (h_e empty).
  assert.match(html, /data-testid="start-card-clawd" class="pointer-events-none relative h-0 -mb-3 w-80 max-w-full shrink-0 "/);
  assert.match(html, /data-fixture-clawd="" data-class="absolute right-\[-13px\] bottom-\[calc\(var\(--cds-ring-outer,0px\)-144px\/11\)\] w-\[80px\] h-\[80px\] -scale-x-100" data-replay-on-click="true" data-replay="0" data-url="undefined"/);
  assert.match(html, /data-cds="Separator"/);
  assert.match(html, /Next steps/);
  assert.match(html, /Fix the parser/);
  assert.match(html, /Asked a question/);
  assert.doesNotMatch(html, /Write docs/);
});

test('Next steps: suggested-task rows from the host task backlog (q8 items) with their delete action', () => {
  const items = [{ id: 't1', title: 'Tidy the fixture module', prompt: 'Tidy it.', cwd: '/Users/fixture/alpha' },
    { id: 't2', prompt: 'Rename the helper\nand more', cwd: '/Users/fixture/alpha' }];
  const html = card({ tasks: { ...TASKS, items } }, fixtureHost({ sessions: [] }).value);
  assert.match(html, /data-testid="start-card-setup"/);
  assert.match(html, /Tidy the fixture module/);
  // H8: an untitled task is named by its prompt's first line (the full prompt stays in the row's description).
  assert.match(html, /aria-label="Start “Rename the helper”"/);
  assert.match(html, /data-row-key="suggested-task:t2"/);
  assert.match(html, /aria-label="Delete “Tidy the fixture module”"/);
  // Unsettled backlog: Dve waits (H = prefs && sessions && tasks settled) and draws no Next steps.
  assert.doesNotMatch(card({ tasks: { ...TASKS, items, settled: false } }, fixtureHost({ sessions: [] }).value), /start-card-setup/);
});

test('Next steps: the host setup rows ($be ids and messages) render through Dve', () => {
  const intl = { formatMessage: (message, values) => message.defaultMessage.replace(/\{(\w+)\}/g, (_, k) => values?.[k] ?? '') };
  const sessions = startSessions([{ id: 'f-1', title: 'Broken run', cwd: '/Users/fixture/alpha', updatedAt: '2026-11-04T08:00:00Z' }], { errors: { 'f-1': 'boom' } });
  const setup = startSetupRows({ folder: '/Users/fixture/alpha', sessions, workspace: { isRepo: false } });
  assert.deepEqual(setup.map(row => row.card.id), ['resume-session']);
  const opened = [];
  const cards = Host.startSetupCards(setup, intl, { onChoose: noop, onSetWorktree: noop, onOpenSession: id => opened.push(id), onTake: noop });
  assert.equal(cards[0].title, 'Resume “Broken run”');
  cards[0].onPress({ currentTarget: null });
  assert.deepEqual(opened, ['f-1']);
  const html = card({ setupRows: cards }, fixtureHost({ sessions: [] }).value);
  assert.match(html, /data-testid="start-card-setup"/);
  assert.match(html, /Broken run/);
  // No folder: the choose-folder row blocks send.
  const choose = Host.startSetupCards(startSetupRows({ folder: '' }), intl, { onChoose: noop, onSetWorktree: noop, onOpenSession: noop, onTake: noop });
  assert.deepEqual(choose.map(row => [row.id, row.card.blocksSend, row.title]), [['choose-folder', true, 'Choose a folder to work in']]);
});

test('no environments and nothing next: no list, no Next steps', () => {
  const html = card({ environments: [] }, fixtureHost({ sessions: [] }).value);
  assert.match(html, /data-testid="epitaxy-start-card"/);
  assert.doesNotMatch(html, /start-card-environments/);
  assert.doesNotMatch(html, /Next steps/);
});

test('gated branches fail loudly (repoRows, tasks.startContext, a session href drag intent)', () => {
  assert.throws(() => card({ repoRows: { listSettled: true, listed: [] } }), /repo rows need the cloud account/);
  assert.throws(() => Adapters.StartTaskOptionsGated(), /tasks\.startContext/);
  assert.throws(() => Adapters.startDragIntent('/code/s-1'), /drag-to-split intent/);
  assert.deepEqual(Object.keys(Adapters.startDragIntent(null)), ['onPointerEnter', 'onPointerLeave', 'onPointerDown', 'onFocus', 'onBlur']);
  assert.throws(() => renderToStaticMarkup(el(Adapters.StartClawdLaptop, {})), /StartHostContext provider/);
});

test('the Clawd replay classes are the official template; the ClawdLaptop className is m_e', () => {
  assert.equal(Clawd.clawdReplayButtonClassName, "border-0 bg-transparent p-0 outline-none hide-focus-ring cursor-default pointer-events-none [&_path:not([fill-opacity='0'])]:pointer-events-auto");
  assert.equal(Start.clawdClassName, 'absolute right-[-13px] bottom-[calc(var(--cds-ring-outer,0px)-144px/11)] w-[80px] h-[80px] -scale-x-100');
});

test('one React and one CDS graph: the manifest links ../cds-core publicNames and the pinned cds-core manifest', async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8'));
  const provenance = JSON.parse(await fs.readFile(path.join(out, 'provenance.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '4.16336.0');
  assert.equal(manifest.sharedGraph, 'cds-core');
  assert.equal(provenance.sharedGraph.manifestSha256, sha(await fs.readFile(path.join(appRoot, 'src/generated/cds-core/manifest.json'))));
  for (const m of manifest.modules) {
    assert.equal(sha(await fs.readFile(path.join(out, m.target))), m.sha256, m.target);
    for (const i of m.imports) {
      // W8-RT (cds-integrate/wave8, extract-code-start-v4.mjs linkedAreas ['r3b-tasks']): the shared-0 Tl / shared-212 kv /
      // c8f38bf1f l links come from the 4.16336.0 r3b-tasks graph, their single owner (was: generated / react / adapter / shared-graph).
      assert.ok(['generated', 'react', 'adapter', 'shared-graph', 'linked'].includes(i.kind), `${m.target}: ${i.kind}`);
      if (i.kind === 'linked') assert.match(i.from, /^\.\.\/r3b-tasks\/(lazy-value|invisible-character|command-prefix)\.mjs$/);
      if (i.kind === 'react') assert.match(i.from, /^react(-dom)?(\/(jsx-runtime|compiler-runtime))?$/);
      if (i.kind === 'shared-graph') assert.match(i.from, /^\.\.\/cds-core\//);
      if (i.kind === 'adapter') assert.equal(i.from, '../../source-code-start-v4-adapters.jsx');
    }
  }
  assert.ok(provenance.roots.every(root => root.pinned));
  const copies = await fs.readFile(path.join(out, 'shared-frame.mjs'), 'utf8');
  assert.doesNotMatch(copies, /createContext|new (Weak)?Map\(|new (Weak)?Set\(/);
  const start = await fs.readFile(path.join(out, 'start.mjs'), 'utf8');
  for (const name of ['CdsButton', 'CdsIcon', 'CdsTooltip', 'CdsPopover', 'CdsTooltipProvider', 'CdsPreviewCard', 'CdsSeparator', 'useCdsLayerAwareZIndex'])
    assert.match(start, new RegExp(`\\b${name} as \\w+`));
  // The facade and the module the card imports are one object (no second CDS copy).
  const frame = await server.ssrLoadModule('/src/generated/cds-core/shared-frame.mjs');
  assert.equal(frame.CdsButton, Core.CdsButton);
  assert.equal(frame.CdsPopover, Core.CdsPopover);
});

test('the host start card: SSR of SourceCodeStart draws the official slot (the card portals in once the slot mounts)', () => {
  const html = renderToStaticMarkup(el(Core.CdsRoot, { className: 'contents' }, el(Host.SourceCodeStart, {
    ready: true, folders: FOLDERS, folder: '/Users/fixture/alpha', onSelect: noop, onChoose: noop, chooseOpen: false,
    call: undefined, onError: noop, sessions: [], onOpenSession: noop, onTake: noop, onFocusComposer: noop })));
  assert.match(html, /<div class="oc-start-slot"><div class="flex min-h-full w-full flex-col pb-6">/);
});

// Hook-level fixture (no DOM): renders one component with a hand-built dispatcher so the host callbacks and the generated
// rows' handlers can be driven directly (same technique as tests/code-start-current.test.mjs).
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
    useSyncExternalStore(subscribe, get) { return get(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  hooks.useInsertionEffect = hooks.useEffect;
  const run = next => {
    if (next) current = next;
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
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
const hostCard = props => {
  const f = fixture(Host.SourceCodeStart, props);
  nodes(f.tree, n => n.type === Start.StartSlot)[0].props.slotRef({ nodeType: 1 });
  f.render();
  return { f, card: nodes(f.tree, n => n.type === Start.StartCard)[0] };
};

test('SourceCodeStart: an unread task is prefilled (staged); one read to the end starts beside the draft and opens once sent', () => {
  const taken = [], beside = [], opened = [], dismissed = [];
  const call = (method, params) => { if (method === 'task-backlog-dismiss') dismissed.push([params.id, params.taken]); return Promise.resolve(method === 'task-backlog-list' ? [] : true); };
  // relink C3 L1: no home prop; the rows read cd8a7d7c0 y, whose store u (window.desktopHomePath on the client) the fixture sets
  // through its official set and restores (the hook fixture's useSyncExternalStore answers the client snapshot u.read()).
  HomeLabel.u.set('/Users/fixture');
  let hosted;
  try { hosted = hostCard({
    ready: true, folders: [{ path: '/Users/fixture/repo', label: 'repo' }], folder: '/Users/fixture/repo', onSelect: noop, onChoose: noop, chooseOpen: false, call, onError: noop,
    sessions: [], workspace: null, onOpenSession: id => opened.push(id), onFocusComposer: noop,
    onTake: prompt => { taken.push(prompt); return true; },
    onStartBesideDraft: (prompt, onSent) => { beside.push(prompt); setTimeout(() => onSent('s1'), 0); return 'asked'; },
  }); } finally { HomeLabel.u.set(undefined); }
  const { f, card } = hosted;
  assert.deepEqual(card.props.environments.map(e => [e.id, e.where.text]), [['/Users/fixture/repo', '~/repo']]);
  assert.equal(card.props.selectedId, '/Users/fixture/repo');
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
  const item = { id: 't', prompt: 'go' };
  assert.equal(hostCard({ ...base, onStartBesideDraft: () => 'blocked' }).card.props.tasks.onStart(item, { keyboard: true, shown: true }), 'staged');
  assert.equal(hostCard({ ...base, onStartBesideDraft: () => 'busy' }).card.props.tasks.onStart(item, { keyboard: true, shown: true }), null);
  assert.equal(hostCard(base).card.props.tasks.onStart(item, { keyboard: true, shown: true }), 'staged');
  assert.deepEqual(taken, ['go', 'go']);
});
test('SourceCodeStart: setup rows carry $be copy (resume title, continue prompt) and press through to the host; selection maps back', () => {
  const opened = [], picked = [], environments = [];
  const failed = startSessions([{ id: 'f', title: 'Broken', cwd: '/r', updatedAt: 9 }], { metadata: { f: { errorAt: 5 } } });
  const { card } = hostCard({ ready: true, folders: [{ path: '/r', label: 'r' }], folder: '/r', onSelect: id => picked.push(id), onChoose: noop, chooseOpen: false, call: () => Promise.resolve([]), onError: noop,
    savedEnvironments: [{ id: 'e1', name: 'Env', target: { kind: 'local', cwd: '/w' }, lastUsedAt: 1 }], onSelectEnvironment: id => environments.push(id),
    sessions: failed, workspace: { isRepo: false }, onOpenSession: id => opened.push(id), onTake: () => true });
  const [resume] = card.props.setupRows;
  assert.equal(resume.title, 'Resume “Broken”');
  assert.equal(resume.card.on, 'error');
  resume.onPress(event(), false, false, undefined);
  assert.deepEqual(opened, ['f']);
  assert.deepEqual(card.props.environments.map(e => e.id).sort(), ['/r', 'preset:e1']);
  card.props.onSelect('preset:e1');
  card.props.onSelect('/r');
  assert.deepEqual([environments, picked], [['e1'], ['/r']]);
  assert.equal(card.props.repoRows, undefined);
  assert.equal(card.props.chooseAlone, undefined);
});
test('Next steps rows press through the generated Dve: a waiting session opens via useStartNavigation', () => {
  const opened = [];
  const host = { sessions: [{ id: 'w1', type: 'local', isSsh: false, title: 'Waiting fixture', ask: 'question', stamp: '1' }], settled: true, onOpenSession: id => opened.push(id), ClawdLaptop: noop };
  const f = fixture(Start.StartNextSteps, { rows: [], tasks: TASKS, openingKey: 'A', groupClassName: '', previousRowRef: { current: null } }, new Map([[Adapters.StartHostContext, host]]));
  const rows = nodes(f.tree, n => n.props?.candidate?.facts);
  assert.deepEqual(rows.map(n => n.props.candidate.facts.id), ['waiting-session']);
  rows[0].props.candidate.onPress(event());
  assert.deepEqual(opened, ['w1']);
});
