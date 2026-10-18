// R4f-rail SR-3: the Code session rail's Servers and Background tasks sections, generated from the installed 2.42304.0
// originals into src/generated/session-rail-sections (scripts/extract-session-rail-sections.mjs), over the host adapters
// in src/source-session-rail-sections-adapters.jsx. Source/AST pins, pure functions, Vite SSR renders and mounts in the
// R3b fake DOM (tests/fixtures/preview-r3b-dom.mjs) driven through React's own props, with fixture servers, tasks and
// loops and stub stop / open callbacks: no browser, no Electron, no network, no process, no real storage.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractSessionRailSections } from '../scripts/extract-session-rail-sections.mjs';
import { createPreviewDom, reactProps } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const directory = path.join(app, 'src/generated/session-rail-sections');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const reference = path.resolve(app, '../reference', manifest.referenceSnapshot, 'ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const generated = file => fs.readFileSync(path.join(directory, file), 'utf8');
const occurrences = (text, needle) => text.split(needle).length - 1;
const squeeze = text => text.replace(/\s+/g, '');
const h = React.createElement;
const iso = ms => new Date(ms).toISOString();

let previousWindow, previousDocument;
let server, I18n, Servers, Tasks, Groups, Kinds, Scope, Hosted, Description, Adapters, Model, Sections;
before(async () => {
  previousWindow = globalThis.window; previousDocument = globalThis.document;
  // view-tabs' preload helper creates a link element while it evaluates (D21); the kit's section store persists through
  // shared-52's guarded localStorage (a Map stub here).
  const storage = new Map();
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, String(value)); }, removeItem: key => { storage.delete(key); } }, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
  const load = name => server.ssrLoadModule(`/src/generated/session-rail-sections/${name}`);
  [Servers, Tasks, Groups, Kinds, Scope, Hosted, Description] = await Promise.all(['servers-card.mjs', 'background-tasks-card.mjs', 'task-groups.mjs',
    'task-kinds.mjs', 'server-scope.mjs', 'hosted-page-url.mjs', 'task-description.mjs'].map(load));
  Adapters = await server.ssrLoadModule('/src/source-session-rail-sections-adapters.jsx');
  Model = await server.ssrLoadModule('/src/background-tasks-model.mjs');
  Sections = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-sections-store.mjs');
});
after(async () => {
  await server?.close();
  globalThis.window = previousWindow; globalThis.document = previousDocument;
});

// ---- fixtures ---------------------------------------------------------------------------------------------------------
const local = { id: 's1', type: 'local' };
function serverRows(now) {
  return [
    { serverId: 'preview:web', name: 'web', port: 5173, status: 'running', cwd: '/w/app', startedAt: iso(now - 2000) },
    { serverId: 'preview:api', name: 'api', port: 0, status: 'starting', cwd: '/w/app', startedAt: iso(now - 3000) },
    { serverId: 'preview:docs', name: 'docs', port: 4000, status: 'error', cwd: '/w/app/docs', startedAt: iso(now - 1000) },
    // not this session's: stopped, in a nested worktree, another folder, a sibling folder sharing the prefix, a page
    // preview id, a claude.ai-hosted page
    { serverId: 'preview:old', name: 'old', port: 3000, status: 'stopped', cwd: '/w/app', startedAt: iso(now - 9000) },
    { serverId: 'preview:tree', name: 'tree', port: 3001, status: 'running', cwd: '/w/app/.claude/worktrees/x', startedAt: iso(now) },
    { serverId: 'preview:other', name: 'other', port: 3002, status: 'running', cwd: '/w/other', startedAt: iso(now) },
    { serverId: 'preview:apple', name: 'apple', port: 3003, status: 'running', cwd: '/w/apple', startedAt: iso(now) },
    { serverId: 'html-preview-1', name: 'page', port: 3004, status: 'running', cwd: '/w/app', startedAt: iso(now) },
    { serverId: 'preview:hosted', name: 'hosted', port: 443, status: 'running', cwd: '/w/app', startedAt: iso(now),
      externalUrl: 'https://claude.ai/artifact/0f8fad5b-d9cb-469f-a165-70867728950e' },
  ];
}
function taskRows(now) {
  return [
    { taskId: 'agent:2', status: 'running', description: 'Explore the repo', taskType: 'local_agent', startedAt: now - 5000 },
    { taskId: 'bash:1', status: 'running', description: 'npm run dev', taskType: 'local_bash', startedAt: now - 65000 },
    { taskId: 'dream:3', status: 'running', description: 'dream', wireTaskType: 'dream', startedAt: now - 1000 },
    { taskId: 'bash:4', status: 'completed', description: 'ls', taskType: 'local_bash', startedAt: now - 9e5, completedAt: now - 8e5 },
    { taskId: 'bash:5', status: 'failed', description: 'make', taskType: 'local_bash', startedAt: now - 9e5, completedAt: now - 7e5 },
    { taskId: 'agent:6', status: 'stopped', description: 'Review', taskType: 'local_agent', startedAt: now - 9e5, completedAt: now - 6e5 },
  ];
}
function loopRows(now) {
  return [
    { id: 'job-1', prompt: 'check CI', recurring: true, cron: '*/5 * * * *', humanSchedule: 'every 5 minutes', createdAt: now - 3600e3, nextRunAt: now + 180e3 },
    { id: 'job-0', prompt: undefined, recurring: false, cron: '30 14 * * *', createdAt: now - 600e3, nextRunAt: now + 60e3 },
    // expired: a one-shot past its run plus grace, a recurring loop created four days ago
    { id: 'job-2', prompt: 'once', recurring: false, cron: '0 9 * * *', createdAt: now - 7200e3, nextRunAt: now - 3600e3 },
    { id: 'job-3', prompt: 'old loop', recurring: true, cron: '0 */2 * * *', createdAt: now - 4 * 864e5, nextRunAt: now + 600e3 },
  ];
}
function hostFor(now, extra = {}) {
  const calls = [];
  const rowsStore = Model.createTaskRowsStore(), dismissedStore = Model.createDismissedTasksStore(null);
  const host = {
    meta: { workingDir: '/w/app', originCwd: '/w/app', loops: loopRows(now), tags: [], isArchived: false, createdAt: now - 864e5 },
    servers: serverRows(now), tasks: taskRows(now),
    sidePanes: { hasSidePanes: true, previewViews: true, previewServerId: 'preview:web', openSidePanes: ['preview'],
      requestServerLogs: (...args) => calls.push(['requestServerLogs', ...args]), setSidePane: pane => calls.push(['setSidePane', pane]),
      setPendingRemotePreviewOpen: request => calls.push(['remotePreview', request]) },
    openTasksPane: request => calls.push(['openTasksPane', request]),
    rememberPreviewServer: (folder, name) => calls.push(['remember', folder, name]),
    stopServer: server => { calls.push(['stopServer', server.serverId]); return Promise.resolve(); },
    stopTask: taskId => { calls.push(['stopTask', taskId]); return Promise.resolve(); },
    stopLoop: loop => { calls.push(['stopLoop', loop.id]); return Promise.resolve(); },
    rowsStore, dismissedStore, ...extra,
  };
  return { host, calls, rowsStore, dismissedStore };
}
const withHost = (host, node) => h(Adapters.SessionRailSectionsHostContext.Provider, { value: host }, node);
const render = node => renderToStaticMarkup(node);

// ---- a mount in the R3b fake DOM, with what the CDS parts read on top of it ---------------------------------------
const GLOBALS = ['localStorage', 'window', 'document', 'ResizeObserver', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame',
  'getComputedStyle', 'CSS', 'HTMLElement', 'Element', 'Node'];
async function mounted(body) {
  const dom = createPreviewDom();
  const style = dom.window.getComputedStyle;
  // Base UI reads the panel's animation / transition; CDS parts set timers through the element's window.
  dom.window.getComputedStyle = node => ({ ...style(node), animationName: 'none', animationDuration: '0s', transitionDuration: '0s' });
  Object.assign(dom.window, { setTimeout, clearTimeout, setInterval, clearInterval, navigator: { userAgent: 'node' } });
  const saved = GLOBALS.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const values = { localStorage: dom.window.localStorage, window: dom.window, document: dom.document, ResizeObserver: dom.window.ResizeObserver,
    MutationObserver: dom.window.MutationObserver, requestAnimationFrame: dom.window.requestAnimationFrame, cancelAnimationFrame: dom.window.cancelAnimationFrame,
    getComputedStyle: dom.window.getComputedStyle, CSS: { escape: value => String(value) }, HTMLElement: dom.Element, Element: dom.Element, Node: dom.Element };
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  for (const name of GLOBALS) Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  const container = dom.document.body.appendChild(dom.document.createElement('div'));
  const root = createRoot(container);
  try {
    return await body({ container, show: node => act(async () => root.render(node)) });
  } finally {
    await act(async () => root.unmount());
    for (const [name, descriptor] of saved) descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name];
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
}
const settle = () => act(async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); });
const press = node => act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, detail: 1, defaultPrevented: false }); });
const buttons = container => container.querySelectorAll('button');
const byLabel = (container, label) => buttons(container).find(node => node.getAttribute('aria-label') === label);
// The live region appends a zero-width space on every other announcement (shared-20 pE), so a repeat is re-read.
const status = container => container.querySelectorAll('[role="status"]').map(node => node.textContent.replace(/\u200B/g, '')).join('|');

// ---- source ---------------------------------------------------------------------------------------------------------
test('generator: the originals still match 2.42304.0 and src/generated/session-rail-sections is current', async () => {
  const checked = await extractSessionRailSections({ check: true });
  assert.equal(checked.referenceVersion, '2.42304.0');
  assert.deepEqual(checked.modules.map(m => m.target), manifest.modules.map(m => m.target));
  const verify = fs.readFileSync(path.join(app, 'scripts/verify-gen-session-rail-sections.mjs'), 'utf8');
  assert.match(verify, /from '\.\/extract-session-rail-sections\.mjs'/, 'prepare-ui verifies it (D0)');
  assert.match(verify, /check: true/);
});

test('feature strings: each pinned message is in the original chunk (exact count) and in the generated module', () => {
  const pins = [
    ['defaultMessage:"Servers",id:"QOxktDjUiT"', 1, 'servers-card.mjs'], ['defaultMessage:"{count} running",id:"gjhcMbSA41"', 2, 'servers-card.mjs'],
    ['defaultMessage:"Open {name} in Preview",id:"rrBTXINTfh"', 1, 'servers-card.mjs'], ['defaultMessage:"Open {name} in Browser",id:"UH4Po59ttY"', 1, 'servers-card.mjs'],
    ['defaultMessage:"Stop this server",id:"QfdbSIr/ZZ"', 1, 'servers-card.mjs'], ['defaultMessage:"Stopping server\\u2026",id:"YyAB/Ltrj7"', 2, 'servers-card.mjs'],
    ['defaultMessage:"Failed to start",id:"4fGytPLZ4o"', 1, 'servers-card.mjs'], ['defaultMessage:"Starting\\u2026",id:"RFCwI6lJ1a"', 1, 'servers-card.mjs'],
    ['B("sink_planter_vase")', 1, 'servers-card.mjs'],
    ['defaultMessage:"Background tasks",id:"PO+0DdDIId"', 1, 'background-tasks-card.mjs'], ['defaultMessage:"{count} finished",id:"ltUUM7UiZ8"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Open {name} in Background tasks",id:"fFubbBep+3"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Stop requested\\u2026",id:"V02rUvAsBz"', 2, 'background-tasks-card.mjs'], ['defaultMessage:"Task stopped",id:"GNohzeuiQ7"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Loop stopped",id:"1rcSX6fVan"', 1, 'background-tasks-card.mjs'], ['defaultMessage:"Scheduled prompt stopped",id:"o0tDiNLMXL"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Stop this task",id:"+ZLTl3VMv+"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Stop this loop. Claude will cancel it.",id:"w393XAy25t"', 1, 'background-tasks-card.mjs'],
    ['defaultMessage:"Next {countdown}",id:"o/mZ8m2Nmr"', 1, 'background-tasks-card.mjs'], ['defaultMessage:"Stopping\\u2026",id:"NACfNicI6z"', 2, 'background-tasks-card.mjs'],
    ['ju("session_rail")', 1, 'background-tasks-card.mjs'],
  ];
  const chunk = raw('cf74bc599-D9NZWRyl.js');
  for (const [needle, count, target] of pins) {
    assert.equal(occurrences(chunk, needle), count, `cf74bc599: ${needle}`);
    assert.ok(squeeze(generated(target)).includes(squeeze(needle)), `${target}: ${needle}`);
  }
  // Both sections reach the rail through fO, which this host replaces (SR-7): pinned on the bytes.
  const sites = manifest.callSites.map(site => site.features).flat();
  assert.ok(sites.includes('serversSection:u(QD,{sessionRef:e,readOnly:o}),backgroundSection:u(BD,{sessionRef:e,readOnly:o})'));
  for (const feature of sites) assert.equal(occurrences(chunk, feature), 1, feature);
});

test('one copy: the rail parts are the kit\'s, CDS parts are view-tabs public names, no context is sliced here', () => {
  const kit = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/session-rail-kit/manifest.json'), 'utf8'));
  const viewTabs = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  const kitNames = new Set(Object.keys(kit.publicNames)), viewNames = new Set(Object.keys(viewTabs.publicNames));
  for (const m of manifest.modules) {
    for (const i of m.imports) {
      assert.notEqual(i.kind, 'unresolved', `${m.target}: ${i.local}`);
      if (i.kind === 'session-rail-kit') assert.ok(kitNames.has(i.name), `${m.target} imports kit ${i.name}`);
      if (i.kind === 'view-tabs') assert.ok(viewNames.has(i.name), `${m.target} imports view-tabs ${i.name}`);
    }
    assert.doesNotMatch(generated(m.target), /createContext/, `${m.target} creates no context`);
  }
  const imported = (target, local) => manifest.modules.find(m => m.target === target).imports.find(i => i.local === local);
  for (const target of ['servers-card.mjs', 'background-tasks-card.mjs']) {
    assert.deepEqual([imported(target, 'ag').kind, imported(target, 'ag').name], ['session-rail-kit', 'RailCard']);
    assert.equal(imported(target, 'qu').name, 'useRailCardPresence');
    assert.equal(imported(target, '_u').name, 'RailLimitedList');
    assert.equal(imported(target, 'Su').name, 'RailRowButton');
    assert.equal(imported(target, 'Vg').name, 'useRailFocusRescue');
    assert.equal(imported(target, 'kn').name, 'pickFields');
    assert.equal(imported(target, 'kr').name, 'CdsButton');
    assert.equal(imported(target, 'gr').name, 'CdsOverflowTooltip');
    assert.deepEqual([imported(target, 'li').kind, imported(target, 'li').name], ['sidebar-resize', 'physicalSide']);
  }
  // A binding another area slices is imported from it; vendor-query's replaceEqualDeep is the one recorded second copy.
  assert.equal(imported('minute-clock.mjs', 'qe').name, 'subscribeNever');
  const servers = manifest.modules.find(m => m.target === 'servers-card.mjs');
  assert.deepEqual(servers.bindings.map(b => b.name).sort(), ['GD', 'HD', 'JD', 'KD', 'QD', 'UD', 'VD', 'WD', 'XD', 'YD', 'ZD', 'qD'].sort());
  const tasks = manifest.modules.find(m => m.target === 'background-tasks-card.mjs');
  assert.deepEqual(tasks.bindings.map(b => b.name).sort(), ['AD', 'BD', 'FD', 'ID', 'LD', 'MD', 'ND', 'OD', 'PD', 'RD', 'jD', 'kD', 'zD'].sort());
});

test('adapters: exactly the host data plane is replaced, each original checked; no GrowthBook, no Launch, no remote', () => {
  const replaced = new Map();
  for (const m of manifest.modules) for (const i of m.imports) if (i.kind === 'adapter') replaced.set(i.original, i.name);
  assert.deepEqual(Object.fromEntries([...replaced].sort()), Object.fromEntries([
    ['c03935b01-CyJKQj4N.js:Q', 'useRailScopeState'], ['c03935b01-CyJKQj4N.js:To', 'railSidePaneOpen'], ['c03935b01-CyJKQj4N.js:_c', 'useRailScopeStoreApi'],
    ['c03935b01-CyJKQj4N.js:wc', 'useRailPreviewViews'], ['c155b6b71-CwKMsMtR.js:f', 'useSessionPreviewId'], ['c227f4d5e-Ba-r--Rl.js:HW', 'useOpenTasksPane'],
    ['c227f4d5e-Ba-r--Rl.js:Mz', 'useRemoteSessionServers'], ['c227f4d5e-Ba-r--Rl.js:WR', 'usePreferredPreviewServers'],
    ['c5da7eb42-B8cTG8SI.js:LM', 'useRemoteSessionBridgeUp'], ['c5da7eb42-B8cTG8SI.js:iM', 'useSessionRailMeta'], ['c68c4283d-CPuRD0vx.js:Cd', 'logRailStopPressed'],
    ['c68c4283d-CPuRD0vx.js:_u', 'logSidePaneOpened'], ['cccc2cf0a-B0D--VZp.js:iE', 'useServerStop'], ['cccc2cf0a-B0D--VZp.js:nE', 'useRailStoppingIds'],
    ['cccc2cf0a-B0D--VZp.js:oE', 'useTaskStop'], ['cccc2cf0a-B0D--VZp.js:rE', 'useLoopStop'], ['cccc2cf0a-B0D--VZp.js:tE', 'useDismissedTaskIds'],
    ['cea7057eb-p4xbrGBz.js:ve', 'useSessionTasks'], ['shared-0-ByI5P0CP.js:Fx', 'claudeWebLaunch'], ['shared-1-CAAiD7E3.js:cu', 'useActiveServers'],
    ['shared-25-DP8p7i1Z.js:Zs', 'useGrowthBookFeature'], ['shared-78-D6VXYXaQ.js:SU', 'usePreviewOpensInBrowser'],
    ['vendor-intl-Db7hDWRO.js:Gt', 'FormattedMessage'], ['vendor-intl-Db7hDWRO.js:q', 'useIntl'],
  ].sort()));
  assert.equal(Adapters.useGrowthBookFeature('sink_planter_vase'), false);
  assert.equal(Adapters.usePreviewOpensInBrowser('local'), false);
  assert.equal(Adapters.useRemoteSessionBridgeUp(null), false);
  assert.deepEqual(Adapters.useRemoteSessionServers(null), []);
  assert.ok(Object.isFrozen(Adapters.useRemoteSessionServers(null)));
  assert.equal(Adapters.claudeWebLaunch, undefined);
  assert.equal(Adapters.useSessionPreviewId(local), undefined);
  assert.equal(Adapters.railSidePaneOpen({ openSidePanes: ['tasks', 'preview'] }, 's1', 'preview'), true);
  assert.equal(Adapters.railSidePaneOpen({}, 's1', 'preview'), false);
});

// R4i-rail RL3: the Context section left this area for its own generator (extract-session-rail-context.mjs).
test('the Context section is no longer deferred here: session-rail-context emits it and pins fO\'s call site', () => {
  assert.deepEqual(manifest.deferred, []);
  assert.ok(!manifest.callSites.some(site => site.features.includes('contextSection:o?void 0:u(cg,{scopeStore:t,sessionRef:e})')));
  const context = JSON.parse(fs.readFileSync(path.join(app, 'src/generated/session-rail-context/manifest.json'), 'utf8'));
  assert.ok(context.callSites.some(site => site.features.includes('contextSection:o?void 0:u(cg,{scopeStore:t,sessionRef:e})')));
  assert.equal(occurrences(raw('c73f45bc3-CFrHin0p.js'), 'defaultMessage:"Context",id:"V2qutIKrxy"'), 2);
  assert.equal(context.adapted.binding, 'hZ');
  assert.ok(context.adapted.declarations >= 100 && context.adapted.imports >= 100 && context.adapted.chunks >= 20, JSON.stringify(context.adapted));
  assert.ok(!manifest.modules.some(m => m.source === 'c73f45bc3-CFrHin0p.js'), 'nothing of c73f45bc3 is sliced here (RailCard is the kit\'s)');
});

// ---- pure originals ---------------------------------------------------------------------------------------------------
test('cccc2cf0a cE / QT / EE, cea7057eb T / D: task groups, dismissal, a loop\'s next run and expiry', () => {
  const now = Date.UTC(2026, 9, 17, 12, 0, 0);
  const tasks = taskRows(now);
  const groups = Groups.groupTasks(tasks);
  assert.deepEqual(groups.running.map(g => g.task.taskId), ['bash:1', 'agent:2'], 'running, oldest first; the ambient dream task is not a task row');
  assert.deepEqual(groups.finished.map(g => g.task.taskId), ['agent:6', 'bash:5', 'bash:4'], 'finished, newest end first');
  // a child is grouped under its parent; the parent stays live while a child runs
  const nested = Groups.groupTasks([{ taskId: 'p', status: 'completed', completedAt: 1 }, { taskId: 'c', parentTaskId: 'p', status: 'running', startedAt: 2 }]);
  assert.deepEqual(nested.running.map(g => [g.task.taskId, g.children.map(c => c.task.taskId)]), [['p', ['c']]]);
  assert.equal(Groups.isDismissedTask(new Set(['bash:5']), tasks[4]), true);
  assert.equal(Groups.isDismissedTask(new Set(['bash:5']), tasks[3]), false);
  const [loop, once, expiredOnce, oldLoop] = loopRows(now);
  assert.equal(Kinds.loopExpired(loop, now), false);
  assert.equal(Kinds.loopExpired(once, now), false);
  assert.equal(Kinds.loopExpired(expiredOnce, now), true, 'a one-shot past its run plus two minutes of grace');
  assert.equal(Kinds.loopExpired(oldLoop, now), true, 'a loop three days after it was created (the host scheduler keeps them seven: host difference)');
  assert.equal(Groups.loopNextRunAt({ nextRunAt: now + 1000, cron: '*/5 * * * *' }, now), now + 1000);
  assert.equal(Groups.loopNextRunAt({ nextRunAt: now - 7 * 60e3, cron: '*/5 * * * *' }, now), now + 3 * 60e3, 'a past run steps by the cron interval');
  assert.equal(Groups.loopNextRunAt({ nextRunAt: now - 1000, cron: '17 9 * * 1' }, now), undefined, 'not a simple interval');
  assert.equal(Kinds.isAmbientTask({ wireTaskType: 'auto_mode_scan' }), true);
  assert.equal(Kinds.isAmbientTask({ taskType: 'local_bash' }), false);
});

test('cf74bc599 KD / JD / qD / GD / RD / MD / FD / jD and c227f4d5e oz / zR: row state, names, icons, labels, scope', () => {
  const row = server => ({ kind: 'local', server });
  assert.equal(Servers.railServerState(row({ status: 'running' })), 'running');
  assert.equal(Servers.railServerState(row({ status: 'error' })), 'failed');
  assert.equal(Servers.railServerState(row({ status: 'starting' })), 'starting');
  assert.equal(Servers.railServerState({ kind: 'remote', server: { state: 'running' } }), 'running');
  assert.equal(Servers.railServerName(row({ serverId: 'x', port: 0 })), 'x');
  assert.equal(Servers.railServerName(row({ serverId: 'x', port: 8080 })), 'localhost:8080');
  assert.equal(Servers.railServerName(row({ serverId: 'x', name: 'web', port: 8080 })), 'web');
  assert.equal(Servers.railServerKey(row({ serverId: 'preview:web' })), 'local:preview:web');
  assert.equal(Servers.RAIL_SERVERS_LIMIT, 4);
  assert.equal(Tasks.RAIL_TASKS_LIMIT, 4);
  assert.equal(Tasks.railTaskIcon({ kind: 'task', taskType: 'local_bash' }), 'CommandLine');
  assert.equal(Tasks.railTaskIcon({ kind: 'task', taskType: 'local_agent' }), 'AgentsSimple');
  assert.equal(Tasks.railTaskIcon({ kind: 'loop' }), 'Clock');
  assert.equal(Tasks.railTaskKey({ kind: 'loop', loop: { id: 'job-1' } }), 'loop:job-1');
  const intl = { formatMessage: message => message.defaultMessage };
  assert.equal(Tasks.railStopLabel(intl, { kind: 'task' }), 'Stop this task');
  assert.equal(Tasks.railStopLabel(intl, { kind: 'loop', loop: { recurring: false } }), 'Stop this scheduled prompt. Claude will cancel it.');
  // A task title that names an artifact keeps the word, not the link; a shell command never is parsed.
  const artifact = 'https://claude.ai/artifact/0f8fad5b-d9cb-469f-a165-70867728950e';
  assert.equal(Tasks.railTaskTitle({ description: `live updates for artifact ${artifact}`, taskType: 'monitor_ws' }), 'live updates for artifact');
  assert.equal(Tasks.railTaskTitle({ description: `curl ${artifact}`, taskType: 'local_bash' }), `curl ${artifact}`);
  assert.equal(Tasks.railTaskTitle({ description: 'see https://example.com/x', taskType: 'local_agent' }), 'see https://example.com/x');
  assert.deepEqual(Description.taskDescriptionParts('see artifact https://example.com', undefined), undefined);
  assert.equal(Hosted.isHostedPageUrl(artifact), true);
  assert.equal(Hosted.isHostedPageUrl('http://localhost:5173/'), false);
  assert.equal(Scope.originFolder('/w/app/.claude/worktrees/feature'), '/w/app');
  assert.equal(Scope.serverInSession({ serverId: 'preview:a', cwd: '/w/app/docs' }, '/w/app', 's1'), true);
  assert.equal(Scope.serverInSession({ serverId: 'preview:a', cwd: '/w/apple' }, '/w/app', 's1'), false);
  assert.equal(Scope.serverInSession({ serverId: 'preview:a', cwd: '/w/app', sessionId: 's2' }, '/w/app', 's1'), false);
  assert.equal(Scope.serverInSession({ serverId: 'browser-preview-1', cwd: '/w/app' }, '/w/app', 's1'), false);
});

test('host shapes: preview servers, background tasks and scheduled prompts become the official rows', () => {
  const at = Date.UTC(2026, 9, 17, 12, 0, 0);
  assert.deepEqual(Adapters.railServerRows({ cwd: '/w/app', servers: [
    { name: 'web', port: 5173, url: 'http://localhost:5173', status: 'running', startedAt: at },
    { name: 'api', port: null, status: 'starting', startedAt: at + 1 },
    { name: 'db', port: 5432, status: 'stopping' }, { name: 'docs', port: 4000, status: 'failed' }, { name: '', status: 'running' },
  ] }), [
    { serverId: 'preview:web', name: 'web', port: 5173, status: 'running', cwd: '/w/app', startedAt: iso(at) },
    { serverId: 'preview:api', name: 'api', port: 0, status: 'starting', cwd: '/w/app', startedAt: iso(at + 1) },
    { serverId: 'preview:db', name: 'db', port: 5432, status: 'running', cwd: '/w/app' },
    { serverId: 'preview:docs', name: 'docs', port: 4000, status: 'error', cwd: '/w/app' },
  ]);
  assert.deepEqual(Adapters.railServerRows(null), []);
  assert.deepEqual(Adapters.railTaskRows([
    { id: 'bash:1', kind: 'bash', status: 'running', description: 'npm test', startedAt: at, completedAt: null },
    { id: 'monitor:m', kind: 'bash', taskType: 'monitor_mcp', status: 'running', description: 'tail', startedAt: null },
    { id: 'workflow:w', kind: 'workflow', status: 'completed', description: 'Release', startedAt: at, completedAt: at + 5 },
    { id: 'agent:a', kind: 'agent', status: 'unknown', description: 'Agent' },
  ]), [
    { taskId: 'bash:1', status: 'running', description: 'npm test', taskType: 'local_bash', startedAt: at, completedAt: undefined },
    { taskId: 'monitor:m', status: 'running', description: 'tail', taskType: 'monitor_mcp', startedAt: undefined, completedAt: undefined },
    { taskId: 'workflow:w', status: 'completed', description: 'Release', taskType: 'local_workflow', startedAt: at, completedAt: at + 5 },
    { taskId: 'agent:a', status: 'unknown', description: 'Agent', taskType: 'local_agent', startedAt: undefined, completedAt: undefined },
  ]);
  assert.deepEqual(Adapters.railLoopRows([
    { id: 'j1', cron: '*/5 * * * *', humanSchedule: 'Every 5 minutes', prompt: 'check', recurring: true, createdAt: at, expiresAt: at + 7 * 864e5, nextFireAt: at + 300e3, fired: 0 },
    { id: 'j2', cron: '30 14 * * *', humanSchedule: null, prompt: '', recurring: false, createdAt: at, nextFireAt: null },
  ]), [
    { id: 'j1', prompt: 'check', recurring: true, cron: '*/5 * * * *', humanSchedule: 'Every 5 minutes', createdAt: at, nextRunAt: at + 300e3 },
    { id: 'j2', prompt: undefined, recurring: false, cron: '30 14 * * *', humanSchedule: undefined, createdAt: at, nextRunAt: undefined },
  ]);
});

// ---- Servers ------------------------------------------------------------------------------------------------------
test('QD (Servers): this session\'s servers by start, open in Preview when running, the current one, Stop on each', () => {
  const { host } = hostFor(Date.now());
  const html = render(withHost(host, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
  assert.match(html, /^<section data-rail-section="" [^>]*data-open="" data-cds="Collapsible" class="group\/railcard /);
  assert.match(html, /<span class="shrink-0">Servers<\/span>/);
  assert.match(html, />1 running<\/span>/, 'the summary counts the running rows');
  const names = [...html.matchAll(/data-cds="OverflowTooltip"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.deepEqual(names, ['api', 'web', 'docs'], 'oldest first; stopped, nested worktree, other folder, page preview and hosted page left out');
  assert.match(html, />api<\/span><\/span><span class="shrink-0 text-end text-footnote text-muted-as-secondary tabular-nums">Starting…<\/span>/);
  assert.match(html, /<span class="text-danger">Failed to start<\/span>/);
  assert.match(html, /<button type="button" aria-label="Open web in Preview" class="flex min-h-6\.5 [^"]* flex-1 bg-fill-ghost-selected" aria-current="true">/,
    'running with a port: openable; it is the server the open Preview pane shows');
  assert.match(html, />localhost:5173<\/span>/);
  assert.match(html, /<div class="flex min-h-6\.5 w-full min-w-0 items-center gap-sm px-xs text-body flex-1">/, 'not openable: the row class without a button');
  assert.equal(occurrences(html, 'aria-label="Stop this server"'), 3);
  assert.match(html, /<span class="sr-only" role="status"><\/span>/);
  // read-only: no Stop and no announcements
  const readOnly = render(withHost(host, h(Servers.SessionRailServers, { sessionRef: local, readOnly: true })));
  assert.equal(occurrences(readOnly, 'Stop this server'), 0);
  assert.doesNotMatch(readOnly, /role="status"/);
});

test('QD: nothing without side panes or servers; a remote session lists no remote servers (sink_planter_vase off)', () => {
  const { host } = hostFor(Date.now());
  assert.equal(render(h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })), '', 'no provider: no scope store');
  assert.equal(render(withHost({ ...host, sidePanes: { ...host.sidePanes, hasSidePanes: false } }, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false }))), '');
  const empty = render(withHost({ ...host, servers: undefined }, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
  assert.equal(empty, '<span class="sr-only" role="status"></span>', 'claude.web Launch missing: no rows, no card');
  const remote = render(withHost(host, h(Servers.SessionRailServers, { sessionRef: { id: 's1', type: 'remote' }, readOnly: false })));
  assert.deepEqual([...remote.matchAll(/data-cds="OverflowTooltip"[^>]*>([^<]+)</g)].map(m => m[1]), ['api', 'web', 'docs'], 'only the local rows, never remote ones');
  // no preview views in this window: nothing opens
  const noViews = render(withHost({ ...host, sidePanes: { ...host.sidePanes, previewViews: false } }, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
  assert.doesNotMatch(noViews, /Open web in Preview/);
});

test('QD: more than four servers show four and Show more (QL, the kit\'s limited list)', () => {
  const now = Date.now();
  const servers = Array.from({ length: 6 }, (_, index) => ({ serverId: `preview:s${index}`, name: `s${index}`, port: 3000 + index, status: 'running', cwd: '/w/app', startedAt: iso(now + index) }));
  const { host } = hostFor(now, { servers });
  const html = render(withHost(host, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
  assert.deepEqual([...html.matchAll(/data-cds="OverflowTooltip"[^>]*>([^<]+)</g)].map(m => m[1]), ['s0', 's1', 's2', 's3']);
  assert.match(html, />Show more</);
  assert.match(html, />6 running<\/span>/);
});

test('QD mounted: a row opens its server in the Preview pane; Stop asks the host, is busy until the server is gone', async () => {
  const now = Date.now();
  const { host, calls, rowsStore } = hostFor(now);
  await mounted(async ({ container, show }) => {
    await show(withHost(host, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
    await press(byLabel(container, 'Open web in Preview'));
    assert.deepEqual(calls.splice(0), [['requestServerLogs', 'preview:web', 'preview:web'], ['remember', '/w/app', 'web'], ['setSidePane', 'preview']]);
    const stops = buttons(container).filter(node => node.getAttribute('aria-label') === 'Stop this server');
    await press(stops[0]);
    await settle();
    assert.deepEqual(calls.splice(0), [['stopServer', 'preview:api']]);
    assert.deepEqual([...rowsStore.stopping('s1', 'server')], ['preview:api'], 'the stop is the Background tasks pane\'s stop too');
    assert.equal(byLabel(container, 'Stopping server…')?.getAttribute('aria-busy'), 'true');
    assert.equal(status(container), 'Stopping server…');
    await press(byLabel(container, 'Stopping server…'));
    await settle();
    assert.deepEqual(calls, [], 'a second press while stopping does nothing');
    // the server leaves the active list: the stop settles
    await show(withHost({ ...host, servers: host.servers.filter(server => server.serverId !== 'preview:api') }, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
    await settle();
    assert.deepEqual([...rowsStore.stopping('s1', 'server')], []);
    assert.equal(byLabel(container, 'Stopping server…'), undefined);
  });
});

test('QD mounted: a stop the host refuses is released (the row is not left busy)', async () => {
  const now = Date.now();
  const { host, calls, rowsStore } = hostFor(now, {});
  host.stopServer = server => { calls.push(['stopServer', server.serverId]); return Promise.reject(Error('busy')); };
  await mounted(async ({ container, show }) => {
    await show(withHost(host, h(Servers.SessionRailServers, { sessionRef: local, readOnly: false })));
    await press(buttons(container).find(node => node.getAttribute('aria-label') === 'Stop this server'));
    await settle();
    assert.deepEqual(calls, [['stopServer', 'preview:api']]);
    assert.deepEqual([...rowsStore.stopping('s1', 'server')], []);
    assert.equal(byLabel(container, 'Stopping server…'), undefined, 'the row is not busy');
    assert.equal(buttons(container).filter(node => node.getAttribute('aria-label') === 'Stop this server').length, 3);
    assert.equal(status(container), 'Stopping server…', 'the press was announced (QD announces when the stop is accepted)');
  });
});

// ---- Background tasks ----------------------------------------------------------------------------------------------
test('BD (Background tasks): the card is folded by default (kZ) with "{count} running"; nothing without the Tasks pane', () => {
  const { host } = hostFor(Date.now());
  const html = render(withHost(host, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false })));
  assert.match(html, /^<section data-rail-section="" [^>]*data-closed="" data-cds="Collapsible"/);
  assert.match(html, /<span class="shrink-0">Background tasks<\/span>/);
  assert.match(html, /<span class="ms-auto min-w-0 truncate ps-sm text-footnote font-normal text-muted-as-secondary">4 running<\/span>/,
    'two live loops and two running tasks (not the ambient task, not the expired loops)');
  assert.equal(render(withHost({ ...host, openTasksPane: undefined }, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false }))), '');
  assert.equal(render(h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false })), '');
  assert.equal(render(withHost({ ...host, tasks: [], meta: { ...host.meta, loops: [] } }, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false }))),
    '<span class="sr-only" role="status"></span>', 'nothing running: no card');
});

test('BD mounted: loops by next run then tasks by start, Next / elapsed, finished count without dismissed, open in the Tasks pane', async () => {
  const now = Date.now();
  const { host, calls, dismissedStore } = hostFor(now);
  dismissedStore.dismiss('s1', ['bash:5']);
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', true);
  await mounted(async ({ container, show }) => {
    await show(withHost(host, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false })));
    const labels = buttons(container).map(node => node.getAttribute('aria-label')).filter(Boolean);
    assert.deepEqual(labels, [
      'Open Scheduled prompt in Background tasks', 'Stop this scheduled prompt. Claude will cancel it.',
      'Open check CI in Background tasks', 'Stop this loop. Claude will cancel it.',
      'Open npm run dev in Background tasks', 'Stop this task',
      'Open Explore the repo in Background tasks', 'Stop this task',
    ]);
    const text = container.textContent;
    assert.match(text, /Scheduled promptNext 1m/);
    assert.match(text, /check CINext 3m/);
    assert.match(text, /npm run dev1m 0[45]s/);
    assert.match(text, /2 finished/, 'bash:4 and agent:6; bash:5 was dismissed in the Tasks pane');
    await press(byLabel(container, 'Open npm run dev in Background tasks'));
    const finished = buttons(container).find(node => node.textContent.endsWith('finished'));
    assert.match(finished?.textContent ?? '', /^\p{Co}?2 finished$/u, 'the AgentsSimple icon glyph, then the count');
    await press(finished);
    assert.deepEqual(calls.splice(0), [['openTasksPane', { taskId: 'bash:1', finished: false }], ['openTasksPane', { finished: true }]]);
  });
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', false);
});

test('BD mounted: Stop on a task is busy until it stops ("Task stopped"); Stop on a loop is "Stop requested…" until it is gone ("Loop stopped")', async () => {
  const now = Date.now();
  const { host, calls, rowsStore } = hostFor(now);
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', true);
  await mounted(async ({ container, show }) => {
    const view = next => show(withHost(next, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false })));
    await view(host);
    const stops = buttons(container).filter(node => node.getAttribute('aria-label') === 'Stop this task');
    await press(stops[1]);
    await settle();
    assert.deepEqual(calls.splice(0), [['stopTask', 'agent:2']]);
    assert.deepEqual([...rowsStore.stopping('s1', 'task')], ['agent:2']);
    assert.match(container.textContent, /Explore the repoStopping…/);
    // the task stops: released, and the announcement says so
    const stopped = host.tasks.map(task => (task.taskId === 'agent:2' ? { ...task, status: 'stopped', completedAt: now } : task));
    const after = { ...host, tasks: stopped };
    await view(after);
    await settle();
    assert.deepEqual([...rowsStore.stopping('s1', 'task')], []);
    assert.match(status(container), /Task stopped/);
    assert.match(container.textContent, /4 finished/);
    // a loop
    await press(byLabel(container, 'Stop this loop. Claude will cancel it.'));
    await settle();
    assert.deepEqual(calls.splice(0), [['stopLoop', 'job-1']]);
    assert.deepEqual([...rowsStore.stopping('s1', 'loop')], ['job-1']);
    assert.match(container.textContent, /check CIStop requested…/);
    assert.equal(byLabel(container, 'Stop this loop. Claude will cancel it.'), undefined, 'no Stop while the stop is requested');
    assert.match(status(container), /Stop requested…/);
    await view({ ...after, meta: { ...after.meta, loops: after.meta.loops.filter(loop => loop.id !== 'job-1') } });
    await settle();
    assert.deepEqual([...rowsStore.stopping('s1', 'loop')], []);
    assert.match(status(container), /Loop stopped/);
  });
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', false);
});

test('BD mounted: read-only has no Stop; a stop the host refuses is released', async () => {
  const now = Date.now();
  const { host, calls, rowsStore } = hostFor(now);
  host.stopTask = taskId => { calls.push(['stopTask', taskId]); return Promise.reject(Error('offline')); };
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', true);
  await mounted(async ({ container, show }) => {
    await show(withHost(host, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: true })));
    assert.equal(buttons(container).filter(node => /^Stop /.test(node.getAttribute('aria-label') ?? '')).length, 0);
    assert.equal(container.querySelectorAll('[role="status"]').length, 0);
    await show(withHost(host, h(Tasks.SessionRailBackgroundTasks, { sessionRef: local, readOnly: false })));
    await press(byLabel(container, 'Stop this task'));
    await settle();
    assert.deepEqual(calls, [['stopTask', 'bash:1']]);
    assert.deepEqual([...rowsStore.stopping('s1', 'task')], []);
  });
  Sections.railSectionsStore.getState().setOpen('session-rail', 'backgroundTasks', false);
});
