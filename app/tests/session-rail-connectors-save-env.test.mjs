// R4i-rail RL1 (2.42304.0): the Session rail's Connectors card and Save environment.
//   cf74bc599 fO     `p = Q(t, e => e.openSessionMcpDialog)`, `g = _g(local && p !== null ? e.id : null)`, `ke` (the card's
//                    counts with PE / uE), `St = Ay(…)`, `saveEnvironment: Ly`, `environmentSave: Iy` (flat, unnamed).
//   c73f45bc3 Cd     the session MCP counts (needs-auth / failed to reconnect, unavailable apart, the listed servers);
//                    host: session-rail-connectors-model over the Customize store's `mcp` slice.
//   cc43287c9        the session view puts the MCP opener on the scope store; host: Customize › Connectors.
//   cf74bc599 Ay / Iy / Ly / Py / My / Ny, c73f45bc3 qc   the save setup, the link, the request and its dialog;
//                    host: the generated save-environment.mjs over adapter stores, the host's saved environment dialog.
// Nothing here launches Electron or a browser: the fake DOM is tests/fixtures/preview-r3b-dom.mjs, the desktop bridge a
// stub that answers from tables (no processes, no ports, no network, no real config).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withPreviewDom, reactProps, createDesktop } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const pin = (text, needles, expected = 1) => { for (const needle of needles) assert.equal(count(text, needle), expected, needle); };
const h = React.createElement;

let server, Rail, Model, Derive, SaveEnv, Adapters, Shown, Breadcrumb;
const ROOTS = new Set();
let savedWindow, savedDocument;
before(async () => {
  savedWindow = globalThis.window; savedDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ relList: { supports: () => false } }), querySelector: () => null, documentElement: { getAttribute: () => null } };
  globalThis.window = { document: globalThis.document, localStorage: undefined, addEventListener() {}, removeEventListener() {}, matchMedia: undefined };
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Rail = await server.ssrLoadModule('/src/source-session-rail.jsx');
  Model = await server.ssrLoadModule('/src/session-rail-connectors-model.mjs');
  Derive = await server.ssrLoadModule('/src/generated/session-rail/rail-derive.mjs');
  SaveEnv = await server.ssrLoadModule('/src/generated/session-rail/save-environment.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-adapters.jsx');
  Shown = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-shown-store.mjs');
  Breadcrumb = await server.ssrLoadModule('/src/source-breadcrumb-adapters.jsx');
  globalThis.window = savedWindow; globalThis.document = savedDocument;
});
after(async () => {
  for (const root of ROOTS) { try { root.unmount(); } catch { /* its DOM is gone */ } }
  Breadcrumb?.fileBrowserQueryClient.clear();
  await server?.close(); globalThis.window = savedWindow; globalThis.document = savedDocument;
});

// ---------------------------------------------------------------------------------------------------------------
test('official 2.42304.0: fO wiring, Cd, the opener on the scope store, Ay / Iy / Ly / Py and the qc dialog', () => {
  const rail = official('cf74bc599-D9NZWRyl.js');
  pin(rail, [
    'p=Q(t,e=>e.openSessionMcpDialog)', 'g=_g(e.type==="local"&&p!==null?e.id:null)', 'p?{counts:g,onOpen:p}:void 0',
    'servers:PE({names:e.counts.listedNames,states:e.counts.listedStates,iconTypes:e.counts.listedIconTypes,iconSrcs:e.counts.listedIconSrcs,labelOf:uE})',
    'St=Ay({scopeStore:t,environmentsOn:ce,sessionId:e.id,isLocal:e.type==="local",meta:S.data,besideNamed:c&&!K})',
    'saveEnvironment:St&&!o?u(Ly,{scopeStore:t,sessionId:e.id,setup:St}):void 0,environmentSave:St&&!o&&c&&!K?u(Iy,{scopeStore:t,sessionId:e.id,setup:St}):void 0',
    'O!==void 0&&O.count!==0&&u(lD,{connectors:O})',
    '"data-testid":"rail-save-environment-link","aria-label":r.formatMessage({defaultMessage:"Save as environment",id:"FoenYxDPY/"})',
    'u(X,{defaultMessage:"Save",id:"fs11ci1KNs"})', 'function Ly({scopeStore:e,sessionId:t,setup:n}){return m(ki)?null:',
    'defaultMessage:"Saved as environment \\u201C{name}\\u201D",id:"Cd+p5rNL1Y"', 'e.setState({saveEnvironmentRequest:{setup:t,checkout:Ny(e,t,n),onSaved:r}})',
    'zt as _g',
  ]);
  pin(official('c73f45bc3-CFrHin0p.js'), [
    'Sd={count:null,needReconnect:0,unavailable:0,', 'needReconnect:u.length,unavailable:p.size',
    'u=s.filter(e=>(e.status==="needs-auth"||e.status==="failed")&&(!Vs(e)||c(e)&&!l(e)))',
    'listedStates:s.map(e=>f.has(e)?e.status:p.has(e)?"unavailable":"").join(', 'Cd as zt',
    'return(!d||s.count!==null&&s!==c.counts)&&l({id:e,counts:s}),s.count!==null||!d?s:c.counts',
    'initialTarget:r?.setup.target??null,initialKind:"local",focusName:!0', 'e.getState().saveEnvironmentRequest?.onSaved(r)',
  ]);
  pin(official('cc43287c9-DAfOi8yP.js'), ['if(Em)return e.setState({openSessionMcpDialog:jm}),()=>e.setState({openSessionMcpDialog:null})',
    'e==="settings-connectors-yours"?Tm(Io()):_m({section:"connectors"})']);
  // the official Cd's hold, read back literally (the host's heldMcpCounts follows it)
  assert.ok(official('c73f45bc3-CFrHin0p.js').includes('[c,l]=r({id:e,counts:s}),d=c.id===e;'));
});

// ---------------------------------------------------------------------------------------------------------------
const rows = [
  { name: 'docs', kind: 'connected' }, { name: 'github', kind: 'signIn' }, { name: 'linear', kind: 'unreachable' },
  { name: 'plugin:acme:search', kind: 'connected' }, { name: 'project-tool', kind: 'trust' }, { name: 'blocked-one', kind: 'notStarted', blocked: { kind: 'policy' } },
  { name: 'quiet', kind: 'disabled' }, { name: 'slow', kind: 'connecting' },
];
test('Cd over the host list: statuses, counts, listed names and states; loading, another thread and an error', () => {
  assert.deepEqual(rows.map(Model.sdkStatus), ['connected', 'needs-auth', 'failed', 'connected', 'unavailable', 'unavailable', 'disabled', 'pending']);
  const counts = Model.sessionMcpCounts({ status: 'ready', threadId: 's1', rows }, 's1');
  assert.equal(counts.count, 8);
  assert.equal(counts.needReconnect, 2);
  assert.equal(counts.unavailable, 2);
  assert.equal(counts.listedNames, rows.map((row) => row.name).join('\n'));
  assert.equal(counts.listedStates, ['', 'needs-auth', 'failed', '', 'unavailable', 'unavailable', '', ''].join('\n'));
  assert.equal(counts.reconnectNames, 'github\nlinear');
  assert.equal(counts.listedIconTypes, '\n\n\n\n\n\n\n');
  // Sd while loading, for another thread or without a session; null when the core cannot list (no source).
  assert.equal(Model.sessionMcpCounts({ status: 'loading', threadId: 's1', rows: [] }, 's1'), Model.NO_SESSION_MCP_COUNTS);
  assert.equal(Model.sessionMcpCounts({ status: 'ready', threadId: 's2', rows }, 's1'), Model.NO_SESSION_MCP_COUNTS);
  assert.equal(Model.sessionMcpCounts({ status: 'error', threadId: 's1', rows: [] }, 's1'), null);
  assert.equal(Model.sessionMcpCounts({ status: 'ready', threadId: 's1', rows: [] }, 's1').count, 0);
  // the hold: same session, a pending list shows the last counts; another session shows its own pending state
  const held = Model.heldMcpCounts({ id: 's1', counts }, 's1', Model.NO_SESSION_MCP_COUNTS);
  assert.equal(held.shown, counts);
  assert.equal(Model.heldMcpCounts({ id: 's1', counts }, 's2', Model.NO_SESSION_MCP_COUNTS).shown, Model.NO_SESSION_MCP_COUNTS);
  // fO ke with PE / uE: the servers to reconnect first, plugin connectors labelled with their plugin, the opener
  const open = () => {};
  const card = Model.railConnectors(counts, open, Derive.connectorRows, Derive.connectorLabel);
  assert.equal(card.onOpen, open);
  assert.deepEqual(card.servers.map((row) => [row.name, row.state]).slice(0, 2), [['github', 'needs-auth'], ['linear', 'failed']]);
  assert.deepEqual(card.servers.find((row) => row.name === 'plugin:acme:search').plugin, 'Acme');
  assert.equal(Model.railConnectors(counts, null, Derive.connectorRows, Derive.connectorLabel), undefined);
  assert.equal(Model.railConnectors(null, open, Derive.connectorRows, Derive.connectorLabel), undefined);
});

// ---------------------------------------------------------------------------------------------------------------
const ROOT = '/Users/me/widgets';
function desktopFor(records = {}) {
  return createDesktop({
    'session-rail-meta': ({ sessionId }) => records[sessionId] ?? null,
    'monitor-state': () => [], 'schedule-state': () => [],
    'repo-identities': ({ cwds }) => Object.fromEntries(cwds.map((cwd) => [cwd, { isRepo: true, toplevel: ROOT, owner: 'me', name: 'widgets' }])),
  });
}
function hostFor(desktop, over = {}) {
  const calls = [];
  const log = (name) => (...args) => { calls.push([name, ...args]); };
  const host = {
    call: desktop.call, desktop, cwd: ROOT, recordKey: 'live', mountKey: 's1', isPanelActive: true, readOnly: false, transcriptRef: { current: null },
    items: [], gitStatus: { isRepo: true, cwd: ROOT, branch: 'main', hasChanges: false, added: 0, removed: 0 },
    changes: { diffOpenable: false, onOpen: log('openChanges'), onToggle: log('toggleChanges'), hasChord: true, verb: null },
    preview: { available: false, snapshot: null }, openPanes: new Set(['chat']), openPane: log('openPane'),
    tasks: [], stopTask: async () => {}, openTasks: log('openTasks'), openFile: log('openFile'),
    revealFolder: log('reveal'), copyText: log('copy'), openTerminal: log('terminal'),
    environmentId: undefined, savedEnvironments: [], recentFolders: [], openLocalEnvironment: log('localEnvironment'),
    ...over,
  };
  return { host, calls };
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
  // the saved environment dialog (source-dialog.jsx) looks its title up by id
  if (typeof dom.document.getElementById !== "function") dom.document.getElementById = (id) => dom.document.querySelector(`[id="${id}"]`);
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
  return { container, root, rerender: async (next) => { await act(async () => { root.render(h(Tile, { host: next })); }); await flush(); } };
}
const aside = (container) => container.querySelector('aside[aria-label="Session details"]');
const connectorsCard = (container) => aside(container).querySelector('[data-rail-card="connectors"]');

test('fO stand-in: the Connectors card from the session list, loadMcp for the session, the opener is Customize › Connectors', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const loads = [];
    let mcp = { status: 'loading', threadId: 's1', rows: [] };
    const opened = [];
    const make = () => hostFor(desktop, { connectors: { mcp, load: () => loads.push('s1') }, openSessionMcpDialog: () => opened.push('customize-connectors') }).host;
    const { container, root, rerender } = await mountTile(dom, make());
    assert.deepEqual(loads, ['s1'], 'Cd asks once for the session');
    // Sd: the card shows with its skeleton while the list is pending (count null !== 0)
    assert.ok(connectorsCard(container), 'the pending Connectors card');
    mcp = { status: 'ready', threadId: 's1', rows };
    await rerender(make());
    const card = connectorsCard(container);
    assert.ok(card.textContent.includes('Connectors'));
    assert.ok(card.textContent.includes('2 to reconnect'), card.textContent);
    // kZ folds Connectors by default: unfold it, then a listed server opens the opener (Settings › Customize › Connectors)
    const fold = [...card.querySelectorAll('[aria-expanded]')][0];
    assert.equal(fold?.getAttribute('aria-expanded'), 'false', 'folded by default');
    await act(async () => { reactProps(fold).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: fold, target: fold, button: 0, nativeEvent: {} }); });
    await flush();
    const github = [...connectorsCard(container).querySelectorAll('button')].find((button) => button.textContent.includes('Github') || button.textContent.includes('github'));
    assert.ok(github, connectorsCard(container).textContent);
    assert.ok(github.textContent.includes('Authenticate') || github.textContent.includes('Reconnect'), github.textContent);
    await act(async () => { reactProps(github).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: github, target: github, button: 0, nativeEvent: {} }); });
    assert.deepEqual(opened, ['customize-connectors']);
    assert.equal(loads.length, 1, 'no reload while the session stays');
    // no connectors at all: no card (iD: O.count !== 0)
    mcp = { status: 'ready', threadId: 's1', rows: [] };
    await rerender(make());
    assert.equal(connectorsCard(container), null);
    // the core cannot list: no source, no card
    mcp = { status: 'error', threadId: 's1', rows: [] };
    await rerender(make());
    assert.equal(connectorsCard(container), null);
    await act(async () => { root.unmount(); });
    // without an opener (core not connected) fO reads nothing: no card and no load
    const quiet = [];
    const second = await mountTile(dom, hostFor(desktop, { connectors: { mcp: { status: 'ready', threadId: 's1', rows }, load: () => quiet.push(1) }, openSessionMcpDialog: null }).host);
    assert.equal(connectorsCard(second.container), null);
    assert.deepEqual(quiet, []);
    await act(async () => { second.root.unmount(); });
  });
});

test('fO stand-in: the flat rail\'s Save link beside an unnamed local environment opens the save dialog; saving names the session\'s environment', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const saved = [];
    let environments = [];
    const created = { id: 'env9', name: 'widgets', target: { kind: 'local', cwd: ROOT } };
    const make = () => hostFor(desktop, { savedEnvironments: environments,
      saveEnvironment: async (value) => { saved.push(value); environments = [{ ...created, settings: {} }]; return created; } }).host;
    const { container, root, rerender } = await mountTile(dom, make());
    const link = aside(container).querySelector('[data-testid="rail-save-environment-link"]');
    assert.ok(link, 'Iy');
    assert.equal(link.getAttribute('aria-label'), 'Save as environment');
    assert.equal(link.getAttribute('data-cds'), 'TextLink');
    assert.equal(link.textContent, 'Save');
    assert.equal(aside(container).querySelector('[data-testid="rail-save-environment"]'), null, 'Ly is null in the flat rail');
    // Py: the request goes on the scope store; qc (the host dialog) opens for it
    await act(async () => { reactProps(link).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: link, target: link, button: 0, nativeEvent: {} }); });
    await flush();
    const dialogText = dom.document.body.textContent;
    assert.ok(/New environment|Save environment|Name/.test(dialogText), 'the saved environment dialog');
    // save through the dialog's form
    const form = dom.document.body.querySelector('form');
    assert.ok(form, 'the dialog form');
    await act(async () => { await reactProps(form).onSubmit?.({ preventDefault() {}, stopPropagation() {} }); });
    await flush();
    assert.equal(saved.length, 1);
    assert.deepEqual(saved[0].target.cwd, ROOT);
    await rerender(make());
    // D7 recorded env9 for s1, so K is the named environment: the link goes, the environment row shows its name
    assert.equal(aside(container).querySelector('[data-testid="rail-save-environment-link"]'), null);
    assert.ok(aside(container).textContent.includes('widgets'));
    await act(async () => { root.unmount(); });
    // read-only: no save (St && !o)
    const second = await mountTile(dom, hostFor(desktop, { readOnly: true, savedEnvironments: [] }).host);
    assert.equal(aside(second.container).querySelector('[data-testid="rail-save-environment-link"]'), null);
    await act(async () => { second.root.unmount(); });
  });
});

test('Ay: the setup for a local folder (label, suggested name), none for a remote or scratch meta; Ly when stacked; the adapter stores', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
  prepare(dom);
  const { renderToStaticMarkup: staticMarkup } = await import('react-dom/server');
  const host = dom.document.body.appendChild(dom.document.createElement('div'));
  const probeRoot = createRoot(host);
  ROOTS.add(probeRoot);
  const renderToStaticMarkup = (element) => { probeRoot.render(element); };
  const settle = async (element) => { await act(async () => { renderToStaticMarkup(element); }); };
  const Kit = await server.ssrLoadModule('/src/generated/session-rail-kit/react-store.mjs');
  const Layout = await server.ssrLoadModule('/src/generated/session-rail-kit/rail-layout.mjs');
  const scope = Rail.createRailScopeStore();
  for (const key of ['startedSetup', 'moveLineOutcome', 'saveEnvironmentRequest', 'sessionRef']) assert.equal(scope.getState()[key], null, key);
  let setup;
  const Probe = ({ meta, besideNamed = false }) => { setup = SaveEnv.useSaveEnvironmentSetup({ scopeStore: scope, environmentsOn: true, sessionId: 'sX', isLocal: true, meta, besideNamed }); return null; };
  Adapters.setRailSavedEnvironments([]);
  await settle(h(Probe, { meta: { originCwd: '/Users/me/widgets', isScratchWorkspace: false } }));
  assert.deepEqual(setup.target, { kind: 'local', cwd: '/Users/me/widgets' });
  assert.equal(setup.suggestedName, 'widgets');
  assert.equal(setup.label, 'This computer · widgets');
  assert.equal(setup.startCount, 1);
  assert.deepEqual(setup.settings, {});
  await settle(h(Probe, { meta: { originCwd: '/Users/me/widgets', remote: { kind: 'ssh' } } }));
  assert.equal(setup, undefined, 'a remote meta has no local folder');
  await settle(h(Probe, { meta: { originCwd: '/tmp/scratch', isScratchWorkspace: true } }));
  assert.equal(setup, undefined, 'a scratch workspace has no folder to save');
  // an environment for the folder already exists: no setup unless beside the unnamed row (besideNamed)
  Adapters.setRailSavedEnvironments([{ id: 'e1', name: 'Widgets', target: { kind: 'local', cwd: '/Users/me/widgets', additionalFolders: ['/x'] } }]);
  await settle(h(Probe, { meta: { originCwd: '/Users/me/widgets' } }));
  assert.equal(setup, undefined);
  await settle(h(Probe, { meta: { originCwd: '/Users/me/widgets' }, besideNamed: true }));
  assert.ok(setup);
  Adapters.setRailSavedEnvironments([]);
  // Ly outside the flat rail: the Bookmark row; with savedAs the saved line
  const stacked = staticMarkup(h(Layout.RailFlatContext.Provider, { value: false }, h(SaveEnv.RailSaveEnvironmentRow, { scopeStore: scope, sessionId: 'sX', setup: { target: { kind: 'local', cwd: '/w' } } })));
  assert.match(stacked, /data-testid="rail-save-environment"/);
  assert.match(stacked, /Save as environment/);
  const done = staticMarkup(h(Layout.RailFlatContext.Provider, { value: false }, h(SaveEnv.RailSaveEnvironmentRow, { scopeStore: scope, sessionId: 'sX', setup: { target: { kind: 'local', cwd: '/w' }, savedAs: 'W' } })));
  assert.match(done, /Saved as environment “W”/);
  // Py for a local target puts the request with Ny's checkout (a worktree session's own record)
  Adapters.setRailLocalSession('sX', { cwd: '/w', startedWithWorktree: true });
  SaveEnv.requestSaveEnvironment(scope, { target: { kind: 'local', cwd: '/w' }, suggestedName: 'w', settings: {} }, 'sX');
  assert.deepEqual(scope.getState().saveEnvironmentRequest.checkout, { worktree: true });
  scope.getState().saveEnvironmentRequest.onSaved({ id: 'e2', name: 'W', target: { kind: 'local', cwd: '/w' } });
  assert.deepEqual(scope.getState().moveLineOutcome, { cwd: '/w', savedAs: 'W' });
  let recorded;
  const Env = () => { recorded = Adapters.useSessionEnvironmentId('sX', undefined); return null; };
  await settle(h(Env));
  assert.equal(recorded, 'e2', 'shared-19 D7 → O7');
  assert.throws(() => SaveEnv.requestSaveEnvironment(scope, { target: { kind: 'cloud' }, suggestedName: 'c', settings: {} }, 'sX'), /non-local environment/);
  Adapters.setRailLocalSession('sX', null);
  assert.equal(Kit.useStore !== undefined, true);
  await act(async () => { probeRoot.unmount(); });
  });
});

test('main.jsx and zh-CN: the rail host gets the connector list, the opener and the save; the new copy is translated', async () => {
  const main = read('src/main.jsx');
  pin(main, [
    'connectors: boot?.connected ? { mcp: customizeSnapshot.mcp, load: () => customizeStore.loadMcp({ cwd: workdir || cwd, threadId: current ?? null }) } : undefined,',
    'openSessionMcpDialog: boot?.connected ? () => setSettings("customize-connectors") : null,',
    "saveEnvironment: async (value) => { const result = await savedEnvironments.run({ op: 'save', value }); await selectSavedEnvironment(result.environment.id); return result.environment; },",
  ]);
  const zh = (await import('../electron/i18n/zh-CN/session.mjs')).default;
  assert.equal(zh['Save as environment'], '另存为环境');
  assert.equal(zh['Saved as environment “{name}”'], '已另存为环境“{name}”');
  for (const key of ['Save', 'Connectors', '{count} connected', '{count} to reconnect', 'Manage connectors', 'Unavailable', 'Reconnect', 'Authenticate']) {
    const files = fs.readdirSync(path.join(app, 'electron/i18n/zh-CN')).filter((file) => file.endsWith('.mjs'));
    const found = [];
    for (const file of files) { const table = (await import(`../electron/i18n/zh-CN/${file}`)).default; if (table && Object.hasOwn(table, key)) found.push(file); }
    assert.ok(found.length > 0, key);
  }
});
