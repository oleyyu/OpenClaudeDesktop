// w10-ccres-rail-openers (3.6556.2): the Session rail's two remaining openers.
//   cf74bc599 TN     `openSkills: Je ? Ye : null` (Je = shared-78 tQ, the skills feature; Ye opens the skills page): the
//                    Context card's Skills row is c73f45bc3 Fx's press row ("Manage skills") with an opener. Host: main's
//                    rail host `openSkills` (Customize › Skills while the core is connected), source-session-rail.jsx
//                    hands `host.openSkills ?? null` to the card.
//   cf74bc599 IM     a running task row opens `c({ taskId, agent: e.kind === "task" && e.agentToolUseId !== void 0 ?
//                    { toolUseId: e.agentToolUseId, description: e.title } : void 0, finished: !1 })`, BM's
//                    `agentToolUseId: gg(e)` (task-kinds Te: the toolUseId of an agent task). Host: railTaskRows gives a
//                    sub-agent its spawn call's item id as `toolUseId`; main's openTasks pushes that agent's view from the
//                    root, as c227f4d5e mQ's `i("tasks", {kind: "subagent", ...l}, {fromRoot: !0})`.
// Source pins, Vite SSR and mounts in the R3b fake DOM (tests/fixtures/preview-r3b-dom.mjs): no browser, no Electron,
// no network, no process, no real storage.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, createPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;

let server, Rail, Shown, Breadcrumb, Adapters, Kinds, Tasks, Model, Sections;
const ROOTS = new Set();
let savedWindow, savedDocument;
before(async () => {
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  const storage = new Map();
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { document: globalThis.document, localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, String(value)); }, removeItem: (key) => { storage.delete(key); } },
    addEventListener() {}, removeEventListener() {}, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Rail = await server.ssrLoadModule('/src/source-session-rail.jsx');
  Shown = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-shown-store.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-sections-adapters.jsx');
  Kinds = await server.ssrLoadModule('/src/generated/session-rail-sections/task-kinds.mjs');
  Tasks = await server.ssrLoadModule('/src/generated/session-rail-sections/background-tasks-card.mjs');
  Model = await server.ssrLoadModule('/src/background-tasks-model.mjs');
  Sections = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-sections-store.mjs');
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});
after(async () => {
  for (const root of ROOTS) { try { root.unmount(); } catch { /* its DOM is gone */ } }
  Breadcrumb?.fileBrowserQueryClient.clear();
  await server?.close(); globalThis.window = savedWindow; globalThis.document = savedDocument;
});

// ---- source --------------------------------------------------------------------------------------------------------
test('official 3.6556.2: TN hands L_ openSkills (Je ? Ye : null), IM names a sub-agent row\'s view, mQ pushes it from the root', () => {
  const rail = official('cf74bc599-CRYqipWN.js');
  pin(rail, ['openSkills:Je?Ye:null', 'Je=on(),Ye=J1($,73,Ke)?K1($,73,Ke,()=>{Ke(wt())}):$[74]']);
  pin(rail, ['agent:e.kind==="task"&&e.agentToolUseId!==void 0?{toolUseId:e.agentToolUseId,description:e.title}:void 0,finished:!1']);
  pin(rail, ['agentToolUseId:gg(e)']);
  const kit = official('c227f4d5e-B-FYKrwT.js');
  pin(kit, ['let{taskId:s,agent:l,finished:u}=e;', 'l===void 0?s===void 0?n("tasks"):r(s):i("tasks",{kind:"subagent",...l},{fromRoot:!0})']);
});

test('host: main\'s rail host opens Customize › Skills and a sub-agent row\'s view; the rail hands openSkills to the card', () => {
  const main = read('src/main.jsx');
  pin(main, ['openSkills: boot?.connected ? () => setSettings("customize-skills") : null,',
    // w11-sweep-ccres: the agent branch moved into openRailTask (adapters) so it runs under test (below).
    'openTasks: (request) => openRailTask(request, { tasks, changeTileView, openAgent, setTaskFocus, openPane: openPaneTile }),',
    'import { openRailTask } from "./source-session-rail-sections-adapters.jsx";']);
  assert.equal(count(main, 'openTasks: ({ taskId, finished }) =>'), 0);
  assert.equal(count(main, 'openTasks: ({ taskId, agent, finished }) => {'), 0);
  const view = read('src/source-session-rail.jsx');
  pin(view, ['<SessionRailContext scopeStore={t} sessionRef={e} openConnectors={p} openSkills={host.openSkills ?? null} openMemory={v} mcpToolOpener={NO_MCP_TOOL_OPENER} />']);
  assert.equal(count(view, 'openSkills={null}'), 0);
  const adapters = read('src/source-session-rail-sections-adapters.jsx');
  assert.equal(count(adapters, '`agent` is always undefined'), 0);
});

// ---- openRailTask (c227f4d5e mQ) -------------------------------------------------------------------------------------
test('openRailTask: a sub-agent row pushes that agent\'s view from the root (mQ fromRoot); a plain row focuses its task', () => {
  const spawn = { id: 'toolu_1', type: 'collabAgentToolCall', tool: 'spawnAgent' };
  const tasks = [{ id: 'agent:x', kind: 'agent', threadId: 'x', sourceItem: spawn }, { id: 'bash:1', kind: 'bash', sourceItem: { id: 'toolu_1' } }];
  const run = (request) => {
    const log = [];
    Adapters.openRailTask(request, { tasks, changeTileView: (v) => log.push(['view', v]), openAgent: (item, thread) => log.push(['agent', item.id, thread]),
      setTaskFocus: (id) => log.push(['focus', id]), openPane: (pane) => log.push(['pane', pane]) });
    return log;
  };
  // IM's request for a sub-agent row: the root view first (taskViews: []), then the agent's own view (openAgent).
  assert.deepEqual(run({ taskId: 'agent:x', agent: { toolUseId: 'toolu_1', description: 'Explore' }, finished: false }),
    [['view', { taskViews: [] }], ['agent', 'toolu_1', 'x']]);
  // the task id unknown: found by the spawn call's id, and only among agent tasks (bash:1 shares the id, never chosen)
  assert.deepEqual(run({ taskId: 'gone', agent: { toolUseId: 'toolu_1', description: 'Explore' } }), [['view', { taskViews: [] }], ['agent', 'toolu_1', 'x']]);
  // mQ `r(s)`: no agent -> focus the task and open the tile; `n("tasks")`: neither -> just open the tile
  assert.deepEqual(run({ taskId: 'bash:1', finished: true }), [['view', { taskViews: [], finishedExpanded: true }], ['focus', 'bash:1'], ['pane', 'tasks']]);
  assert.deepEqual(run({}), [['view', { taskViews: [] }], ['pane', 'tasks']]);
  // an agent the host has no spawn item for falls back to the task focus (Te needs a toolUseId as well)
  assert.deepEqual(run({ taskId: 'agent:z', agent: { toolUseId: 'toolu_9' } }), [['view', { taskViews: [] }], ['focus', 'agent:z'], ['pane', 'tasks']]);
});

// ---- railTaskRows -> task-kinds Te ---------------------------------------------------------------------------------
test('railTaskRows: a sub-agent carries its spawn call\'s id as toolUseId; Te reads it, other kinds have none', () => {
  const rows = Adapters.railTaskRows([
    { id: 'agent:x', kind: 'agent', threadId: 'x', sourceItem: { id: 'toolu_1', type: 'collabAgentToolCall', tool: 'spawnAgent' }, status: 'running', description: 'Explore', startedAt: 5 },
    { id: 'agent:y', kind: 'agent', threadId: 'y', status: 'running', description: 'Orphan' },
    { id: 'bash:1', kind: 'bash', sourceItem: { id: 'cmd_1' }, status: 'running', description: 'npm test' },
  ]);
  assert.equal(rows[0].toolUseId, 'toolu_1');
  assert.deepEqual(rows[0], { taskId: 'agent:x', status: 'running', description: 'Explore', taskType: 'local_agent', startedAt: 5, completedAt: undefined, toolUseId: 'toolu_1' });
  assert.equal('toolUseId' in rows[1], false, 'no spawn item: no tool use id');
  assert.equal('toolUseId' in rows[2], false, 'only a sub-agent names a tool use');
  assert.deepEqual(rows.map(Kinds.taskAgentToolUseId), ['toolu_1', undefined, undefined]);
  // the host model's own agent task (background-tasks-model backgroundTasks: sourceItem is the spawnAgent item)
  const state = { items: { s1: [{ id: 'toolu_9', type: 'collabAgentToolCall', tool: 'spawnAgent', receiverThreadIds: ['c1'], agentsStates: { c1: { status: 'running' } } }] },
    threads: {}, usage: {}, active: {}, taskTurnFacts: {} };
  const tasks = Model.backgroundTasks(state, 's1');
  const agent = tasks.find((task) => task.kind === 'agent');
  assert.equal(agent?.id, 'agent:c1');
  assert.equal(Adapters.railTaskRows([agent])[0].toolUseId, 'toolu_9');
});

// ---- mounts --------------------------------------------------------------------------------------------------------
const GLOBALS = ['localStorage', 'window', 'document', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'CSS', 'HTMLElement', 'Element', 'Node'];
async function mounted(body) {
  const dom = createPreviewDom();
  const style = dom.window.getComputedStyle;
  dom.window.getComputedStyle = (node) => ({ ...style(node), animationName: 'none', animationDuration: '0s', transitionDuration: '0s' });
  Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'node' } });
  const saved = GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const values = { localStorage: dom.window.localStorage, window: dom.window, document: dom.document, ResizeObserver: dom.window.ResizeObserver,
    MutationObserver: dom.window.MutationObserver, requestAnimationFrame: dom.window.requestAnimationFrame, cancelAnimationFrame: dom.window.cancelAnimationFrame,
    getComputedStyle: dom.window.getComputedStyle, CSS: { escape: (value) => String(value) }, HTMLElement: dom.Element, Element: dom.Element, Node: dom.Element };
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const name of GLOBALS) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  const container = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(container);
  try {
    return await body({ container, show: (node) => act(async () => root.render(node)) });
  } finally {
    await act(async () => root.unmount());
    for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
}
const press = (node) => act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, detail: 1, defaultPrevented: false }); });

test('IM mounted: a running sub-agent row opens the Tasks pane with its agent { toolUseId, description }', async () => {
  const now = Date.now();
  const calls = [];
  const tasks = Adapters.railTaskRows([
    { id: 'agent:c1', kind: 'agent', threadId: 'c1', sourceItem: { id: 'toolu_1' }, status: 'running', description: 'Explore the repo', startedAt: now - 5000 },
    { id: 'bash:1', kind: 'bash', status: 'running', description: 'npm run dev', startedAt: now - 65000 },
  ]);
  const host = {
    meta: { workingDir: '/w/app', originCwd: '/w/app', loops: [], tags: [], isArchived: false, createdAt: now - 864e5 },
    servers: [], tasks,
    sidePanes: { hasSidePanes: true, previewViews: false, previewServerId: undefined, openSidePanes: [], requestServerLogs() {}, setSidePane() {}, setPendingRemotePreviewOpen() {} },
    openTasksPane: (request) => calls.push(request),
    stopTask: () => Promise.resolve(), stopServer: () => Promise.resolve(), stopLoop: () => Promise.resolve(),
    rowsStore: Model.createTaskRowsStore(), dismissedStore: Model.createDismissedTasksStore(null),
  };
  await mounted(async ({ container, show }) => {
    Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', true);
    await show(h(Adapters.SessionRailSectionsHostContext.Provider, { value: host }, h(Tasks.SessionRailBackgroundTasks, { sessionRef: { id: 's1', type: 'local' }, readOnly: false })));
    const byLabel = (label) => container.querySelectorAll('button').find((node) => node.getAttribute('aria-label') === label);
    const agentRow = byLabel('Open Explore the repo in Background tasks');
    assert.ok(agentRow, 'the sub-agent row is listed');
    await press(agentRow);
    await press(byLabel('Open npm run dev in Background tasks'));
    assert.deepEqual(calls, [
      { taskId: 'agent:c1', agent: { toolUseId: 'toolu_1', description: 'Explore the repo' }, finished: false },
      { taskId: 'bash:1', agent: undefined, finished: false },
    ]);
    Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', false);
  });
});

// The whole rail mount (SessionRailRow + SessionRailColumn over the host object main builds), as session-rail-context's.
const ROOT = '/Users/me/widgets';
function desktopFor(records = {}) {
  return createDesktop({
    'session-rail-meta': ({ sessionId }) => records[sessionId] ?? null,
    'monitor-state': () => [], 'schedule-state': () => [],
    'repo-identities': ({ cwds }) => Object.fromEntries(cwds.map((cwd) => [cwd, { isRepo: true, toplevel: ROOT, owner: 'me', name: 'widgets' }])),
  });
}
function hostFor(desktop, over = {}) {
  return {
    call: desktop.call, desktop, cwd: ROOT, recordKey: 'live', mountKey: 's1', isPanelActive: true, readOnly: false, transcriptRef: { current: null },
    items: [], gitStatus: { isRepo: true, cwd: ROOT, branch: 'main', hasChanges: false, added: 0, removed: 0 },
    changes: { diffOpenable: false, onOpen() {}, onToggle() {}, hasChord: true, verb: null },
    preview: { available: false, snapshot: null }, openPanes: new Set(['chat']), openPane() {},
    tasks: [], stopTask: async () => {}, openTasks() {}, openFile() {}, revealFolder() {}, copyText() {}, openTerminal() {},
    environmentId: undefined, savedEnvironments: [], recentFolders: [], openLocalEnvironment() {},
    ...over,
  };
}
function Tile({ host }) {
  const rail = Rail.useSessionRail({ enabled: true, sessionId: 's1' });
  return h('div', { className: 'source-chat-tile-content' },
    h('button', { ref: rail.railToggleRef, type: 'button', onClick: rail.railToggle?.onToggle }, 'toggle'),
    h(Rail.SessionRailRow, { rail, host },
      h('div', { className: 'conversation' }, h(Rail.SessionRailChatBody, null, h('div', null, 'transcript'))),
      h(Rail.SessionRailColumn)));
}
const flush = async (times = 6) => { for (let i = 0; i < times; i++) await act(async () => { await new Promise((resolve) => setImmediate(resolve)); }); };
function prepare(dom) {
  if (dom.__railPrepared) return;
  dom.__railPrepared = true;
  const style = dom.window.getComputedStyle;
  dom.window.getComputedStyle = (node) => ({ ...style(node), animationName: 'none', animationDuration: '0s', transitionDuration: '0s' });
  globalThis.getComputedStyle = dom.window.getComputedStyle;
  if (typeof dom.document.getElementById !== 'function') dom.document.getElementById = (id) => dom.document.querySelector(`[id="${id}"]`);
  Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
  const rect = dom.Element.prototype.getBoundingClientRect;
  dom.Element.prototype.getBoundingClientRect = function () {
    return (this.getAttribute('class') ?? '').split(/\s+/).includes('@container') ? { x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600 } : rect.call(this);
  };
}
async function mountTile(dom, host) {
  prepare(dom);
  Shown.sessionRailShownStore.setState({ shown: true });
  const container = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(container);
  ROOTS.add(root);
  await act(async () => { root.render(h(Tile, { host })); });
  await flush();
  return { container, root };
}
const contextCard = (container) => container.querySelector('aside[aria-label="Session details"]')?.querySelector('[data-rail-card="context"]') ?? null;
const click = async (node) => { await act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, nativeEvent: {} }); }); await flush(); };
const contextOf = (over = {}) => ({ usage: { last: { totalTokens: 64400 }, modelContextWindow: 262100 }, core: { engine: 'deepseek-harness' }, modelId: 'gpt-x',
  running: false, connected: true, compacting: false, fresh: false, onCompact: undefined, contextUsageId: 's1', ...over });
const COUNTS = { categories: { systemPrompt: { tokens: 6000 }, mcpTools: { tokens: 3000 }, memoryFiles: { tokens: 1500 }, skills: { tokens: 900 } },
  memoryFiles: [{ path: '/Users/me/widgets/AGENTS.md', type: 'Project', tokens: 1500 }], mcpTools: [{ name: 'update_plan', serverName: 'code_desktop', tokens: 3000, isLoaded: true }], agents: [] };

async function openCard(container) {
  const fold = [...contextCard(container).querySelectorAll('[aria-expanded]')][0];
  if (fold.getAttribute('aria-expanded') === 'false') await click(fold);
  await flush();
  return contextCard(container);
}

test('Context card: the host\'s openSkills makes the Skills row Fx\'s press row ("Manage skills") that opens it; without it the row stays plain', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const opened = [];
    const context = contextOf({ readContextUsage: async () => COUNTS });
    const { container, root } = await mountTile(dom, hostFor(desktop, { context, openSkills: (...args) => { opened.push(args); } }));
    try {
      const card = await openCard(container);
      const hints = [...card.querySelectorAll('button .sr-only')].map((n) => n.textContent);
      assert.equal(hints.filter((t) => t === 'Manage skills').length, 1, JSON.stringify(hints));
      const row = [...card.querySelectorAll('button')].find((b) => b.querySelector('.sr-only')?.textContent === 'Manage skills');
      assert.ok(row.textContent.startsWith('Skills'), row.textContent);
      await click(row);
      assert.equal(opened.length, 1);
    } finally { await act(async () => { root.unmount(); }); ROOTS.delete(root); }
  });
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const context = contextOf({ readContextUsage: async () => COUNTS });
    // main's openSkills is null while the core is disconnected: TN's `Je ? Ye : null` null branch
    const { container, root } = await mountTile(dom, hostFor(desktop, { context, openSkills: null }));
    try {
      const card = await openCard(container);
      const hints = [...card.querySelectorAll('button .sr-only')].map((n) => n.textContent);
      assert.ok(!hints.includes('Manage skills'), JSON.stringify(hints));
      assert.ok(card.textContent.includes('Skills'), card.textContent);
    } finally { await act(async () => { root.unmount(); }); ROOTS.delete(root); }
  });
});
