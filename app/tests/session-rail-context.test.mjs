// R4i-rail RL3 (2.42304.0): the Session rail's Context card.
//   cf74bc599 fO     `contextSection: o ? void 0 : u(cg, { scopeStore: t, sessionRef: e })` (c73f45bc3 p = iy).
//   c73f45bc3 iy/ay  Q_'s composer footer bridge, then the kit's RailCard "Context" (folded by default, `rollup: ry`) around
//                    c227f4d5e F (hZ) as `presentation: "inline", contextOnly: !0`.
//   c227f4d5e hZ     not sliced (re-measured); its inline branch is the host's RailContextUsage, which renders the generated
//                    gZ: oB's Compact session action and c2d611398 og's rail layout.
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
const manifest = JSON.parse(read('src/generated/session-rail-context/manifest.json'));

let server, Rail, Compact, Tokens, Adapters, Shown, Breadcrumb;
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
  Compact = await server.ssrLoadModule('/src/generated/session-rail-context/context-compact.mjs');
  Tokens = await server.ssrLoadModule('/src/generated/session-rail-context/context-tokens.mjs');
  Adapters = await server.ssrLoadModule('/src/source-session-rail-context-adapters.jsx');
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
test('official 2.42304.0: fO hands the rail cg, iy / ay / ry, hZ\'s inline branch, gZ / oB and og\'s rail layout', () => {
  pin(official('cf74bc599-D9NZWRyl.js'), ['contextSection:o?void 0:u(cg,{scopeStore:t,sessionRef:e})', 'p as cg']);
  const card = official('c73f45bc3-CFrHin0p.js');
  pin(card, ['iy as p', 'var iy=v(function({scopeStore:e,sessionRef:t}){let n=Q_(e);return n?c(ay,{scopeStore:e,sessionRef:t,bridge:n}):null})',
    'presentation:"inline",contextOnly:!0,inlineOpen:o,inlineIntentRef:u,sessionRef:t,modelId:n,onCompact:r,openRequest:i',
    'data-rail-context-pct', 'onShowUsageReport:t.onShowUsageReport,onCompact:t.onCompact,openRequest:n,creditOffered:r']);
  // "Context" is the card title (ay) and the kit's section title (Hv's table)
  assert.equal(count(card, 'defaultMessage:"Context",id:"V2qutIKrxy"'), 2);
  const panel = official('c227f4d5e-Ba-r--Rl.js');
  pin(panel, ['hZ as F', 'G=U===null&&A!==null&&!te?W??null:null', 'Be=fe||Ie||G!==null', 'kt=w?ze||!Be:ze||c&&!Be',
    'qe=r!==void 0&&!O&&(U!==null||G!==null)&&!Ke', 'td(Ne,Oe,A===null&&V?.stale===!1,!w)', 'return D(gZ,',
    'return D(og,{...o,layout:"rail",compactAction:s})', 'qz="__gb__4236285942"',
    'defaultMessage:"Available when Claude finishes this turn",id:"tZl2bQVjIE"']);
  const og = official('c2d611398-D9vRECA9.js');
  pin(og, ['De="data-rail-context-summary"', 'defaultMessage:"Send a message to see context usage.",id:"4XCjSHnPX/"',
    'defaultMessage:"{percent} used",id:"fNzhJnomJo"', 'ke as t']);
});

test('generator: the modules, roots and adapters; hZ re-measured and stood in for; one copy of the kit\'s card', () => {
  assert.equal(manifest.referenceVersion, '2.42304.0');
  assert.deepEqual(manifest.modules.map((m) => m.target), ['context-tokens.mjs', 'context-usage-shape.mjs', 'mcp-names.mjs', 'cds-frame-helpers.mjs',
    'chart-kit.mjs', 'chart-meter.mjs', 'chart-legend.mjs', 'version-compare.mjs', 'telemetry-session-type.mjs', 'compact-messages.mjs',
    'context-panel.mjs', 'context-compact.mjs', 'context-card.mjs']);
  const card = manifest.modules.find((m) => m.target === 'context-card.mjs');
  assert.deepEqual(card.exports, { iy: 'SessionRailContext', ay: 'RailContextCard', ry: 'railContextRollup' });
  const via = (m, local) => m.imports.find((i) => i.local === local);
  assert.equal(via(card, 'Xv').kind, 'session-rail-kit');
  assert.equal(via(card, 'Xv').name, 'RailCard');
  assert.deepEqual([via(card, 'ui').kind, via(card, 'ui').name, via(card, 'ui').from], ['adapter', 'RailContextUsage', '../../source-session-rail-context.jsx']);
  assert.deepEqual([via(card, 'Q_').kind, via(card, 'Q_').name], ['adapter', 'useRailContextBridge']);
  const compact = manifest.modules.find((m) => m.target === 'context-compact.mjs');
  assert.equal(via(compact, 'og').name, 'ContextUsagePanel');
  assert.equal(via(compact, 'cB').name, 'useCompactSendState');
  assert.equal(via(compact, 'we').from, '../../source-session-rail-sections-adapters.jsx');
  assert.ok(!compact.bindings.some((b) => b.name === 'hZ'), 'hZ is not sliced');
  const panel = manifest.modules.find((m) => m.target === 'context-panel.mjs');
  // context-breakdown: H (the /context categories) is sliced with og, not an adapter (tests/context-breakdown.test.mjs)
  assert.ok(panel.bindings.some((b) => b.name === 'H'));
  for (const [local, name] of [['A', 'CdsIcon'], ['k', 'CdsDisabledReason'], ['M', 'CdsButton'], ['D', 'CdsRelativeTime']])
    assert.deepEqual([via(panel, local).kind, via(panel, local).name], ['view-tabs', name]);
  assert.equal(manifest.adapted.binding, 'hZ');
  assert.ok(manifest.adapted.declarations >= 100 && manifest.adapted.imports >= 100, JSON.stringify(manifest.adapted));
  // the host modules never import each other back (no cycle with the generated area)
  assert.ok(!/from "\.\/generated\/session-rail-context\//.test(read('src/source-session-rail-context-adapters.jsx')));
  // the chart kit / meter own their chart contexts (no other area slices those chunks); every other module reads the kit's
  for (const target of manifest.modules.map((m) => m.target).filter((t) => t !== 'chart-kit.mjs' && t !== 'chart-meter.mjs'))
    assert.ok(!read(`src/generated/session-rail-context/${target}`).includes('createContext'), target);
});

test('pure originals and host facts: qV, eB / tB, Jz / Yz, KX\'s engine branch, the host\'s window facts', () => {
  assert.deepEqual(Tokens.contextSummary(120000, 200000, false, false), { summary: '120k / 200k', contextPct: 60 });
  assert.deepEqual(Tokens.contextSummary(120000, 200000), { summary: '120k / 200k (60%)', contextPct: 60 });
  assert.deepEqual(Tokens.contextSummary(0, null, false, false), { summary: '0', contextPct: null });
  // the host's facts: the report's window, the core's auto-compact limit (Codex: 90%)
  const host = { usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x' };
  const facts = Adapters.railWindowFacts(host);
  assert.deepEqual(facts, { rawMaxTokens: 200000, liveModel: 'gpt-x', autoCompactThreshold: 180000, isAutoCompactEnabled: true });
  assert.equal(Adapters.railLiveContextTokens(host), 120000);
  assert.equal(Adapters.railWindowFacts({ usage: { last: { totalTokens: 5 } } }), null);
  assert.deepEqual(Adapters.railWindowFacts({ usage: { modelContextWindow: 1000 }, core: { engine: 'opencode' } }), { rawMaxTokens: 1000, liveModel: null });
  assert.deepEqual(Compact.autoCompactHint({ usage: facts, used: 120000, refType: 'local' }), { kind: 'left', tokens: 60000 });
  assert.deepEqual(Compact.autoCompactHint({ usage: facts, used: 160000, refType: 'local' }), { kind: 'soon' });
  assert.deepEqual(Compact.autoCompactHint({ usage: { rawMaxTokens: 1000 }, used: 5, refType: 'local' }), { kind: 'none' });
  const send = { hasHandler: true, owned: true, reach: 'live', turnArmed: false, responding: false, workerSaysWorking: false, compacting: false };
  assert.deepEqual(Compact.compactAvailability({ ...send, contextPct: 60, minPct: 50, contextTokens: 120000, minTokens: null }), { kind: 'enabled' });
  assert.deepEqual(Compact.compactAvailability({ ...send, contextPct: 40, minPct: 50, contextTokens: 80000, minTokens: null }), { kind: 'hidden' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, responding: true }), { kind: 'disabled', reason: 'replying' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, reach: 'detached' }), { kind: 'disabled', reason: 'reconnect' });
  assert.deepEqual(Compact.compactSendAvailability({ ...send, compacting: true }), { kind: 'hidden' });
  assert.deepEqual(Compact.contextWindowMax({ usage: null, windowFacts: facts, liveModel: 'gpt-x', pickedModel: null, servedWindows: {}, engineVersion: null }),
    { kind: 'engine', max: 200000 });
  assert.deepEqual(Compact.contextWindowView({ kind: 'engine', max: 200000 }, null, facts), { usage: null, windowFacts: facts });
  assert.equal(Compact.STALE_COMPACT_DEFAULTS.minContextPct, 75);
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
  return { container, root, rerender: async (next) => { await act(async () => { root.render(h(Tile, { host: next })); }); await flush(); } };
}
const aside = (container) => container.querySelector('aside[aria-label="Session details"]');
const contextCard = (container) => aside(container)?.querySelector('[data-rail-card="context"]') ?? null;
// fO always hands the rail the cg element; without a bridge iy renders nothing inside the slot (as the original). Never
// pass a DOM node to assert: node:assert would inspect the whole fake document.
const cardText = (container) => contextCard(container)?.textContent ?? '';
const click = async (node) => { await act(async () => { reactProps(node).onClick?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node, target: node, button: 0, nativeEvent: {} }); }); await flush(); };
const contextOf = (over = {}) => ({ usage: { last: { totalTokens: 120000 }, modelContextWindow: 200000 }, core: { engine: 'codex' }, modelId: 'gpt-x',
  running: false, connected: true, compacting: false, fresh: false, onCompact: undefined, ...over });

test('fO stand-in: the Context card (folded by default), its headline, bar, Compact session and auto-compact hint', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const compacts = [];
    const { container, root, rerender } = await mountTile(dom, hostFor(desktop, { context: contextOf({ onCompact: () => compacts.push('compact') }) }));
    const card = contextCard(container);
    assert.ok(card !== null, aside(container)?.textContent);
    assert.ok(card.textContent.includes('Context'), card.textContent);
    const fold = [...card.querySelectorAll('[aria-expanded]')][0];
    assert.equal(fold?.getAttribute('aria-expanded'), 'false', 'kZ folds Context by default');
    await click(fold);
    const open = contextCard(container);
    assert.ok(open.textContent.includes('60% used'), open.textContent);
    assert.ok(open.textContent.includes('120k / 200k'), open.textContent);
    assert.ok(!open.textContent.includes('(60%)'), 'td(…, !w): the inline summary has no percent');
    const summary = open.querySelector('[data-rail-context-summary]');
    assert.equal(summary?.getAttribute('data-rail-context-pct'), '60');
    const bar = open.querySelector('[role="progressbar"]');
    assert.equal(bar?.getAttribute('aria-valuenow'), '60');
    assert.equal(bar?.getAttribute('aria-label'), 'Context window');
    assert.ok(open.textContent.includes('60k until auto-compact'), open.textContent);
    const button = [...open.querySelectorAll('button')].find((b) => b.textContent.includes('Compact session'));
    assert.ok(button, open.textContent);
    assert.equal(button.disabled, false);
    await click(button);
    assert.deepEqual(compacts, ['compact']);
    // a running turn: Yz "replying" (lB keeps the original "Claude", D23)
    await rerender(hostFor(desktop, { context: contextOf({ onCompact: () => {}, running: true }) }));
    const busy = [...contextCard(container).querySelectorAll('button')].find((b) => b.textContent.includes('Compact session'));
    assert.equal(busy?.disabled, true);
    assert.equal(Compact.compactDisabledReason({ formatMessage: (m) => m.defaultMessage }, 'replying'), 'Available when Claude finishes this turn');
    // below oB's minPct 50: no compact row
    await rerender(hostFor(desktop, { context: contextOf({ onCompact: () => {}, usage: { last: { totalTokens: 40000 }, modelContextWindow: 200000 } }) }));
    assert.ok(![...contextCard(container).querySelectorAll('button')].some((b) => b.textContent.includes('Compact session')));
    assert.ok(contextCard(container).textContent.includes('20% used'));
    // no session handler: qe false, no row
    await rerender(hostFor(desktop, { context: contextOf() }));
    assert.ok(![...contextCard(container).querySelectorAll('button')].some((b) => b.textContent.includes('Compact session')));
    // no report yet: og's noData text
    await rerender(hostFor(desktop, { context: contextOf({ usage: null }) }));
    assert.ok(contextCard(container).textContent.includes('Send a message to see context usage.'), contextCard(container).textContent);
    // a fresh session (Ie): context mode with nothing used and no window
    await rerender(hostFor(desktop, { context: contextOf({ usage: null, fresh: true }) }));
    const fresh = contextCard(container);
    assert.ok(!fresh.textContent.includes('Send a message'), fresh.textContent);
    assert.equal(fresh.querySelector('[data-rail-context-summary]')?.textContent, '0');
    // no context source: Q_ has no bridge, the card renders nothing
    await rerender(hostFor(desktop));
    assert.equal(cardText(container), '');
    assert.equal(contextCard(container)?.querySelector('[data-rail-context-summary]') ?? null, null);
    // read-only: fO passes no contextSection
    await rerender(hostFor(desktop, { readOnly: true, context: contextOf() }));
    assert.equal(cardText(container), '');
    await act(async () => { root.unmount(); });
  });
});

test('main and the host view wire the card; zh-CN covers its copy', () => {
  const main = read('src/main.jsx');
  pin(main, ['context: current ? { usage: state.usage[current] ?? null, core: boot?.core, modelId: model || null,',
    'onCompact: !session?.archived && !unsupportedMethods?.includes("thread/compact/start") ? () => executeCommand("compact") : undefined } : undefined,']);
  const view = read('src/source-session-rail.jsx');
  pin(view, ['contextSection={o ? undefined : <SessionRailContext scopeStore={t} sessionRef={e} />}',
    '<SessionRailContextHostContext.Provider value={host.context ?? null}>{wt}</SessionRailContextHostContext.Provider>']);
  assert.equal(count(view, 'contextSection={undefined}'), 0);
  const zh = read('electron/i18n/zh-CN/session.mjs');
  pin(zh, ['// R4i-rail RL3:', '"Available when Claude finishes this turn": "Claude 完成本轮后可用",', '"{percent} used": "已用 {percent}",',
    '"Send a message to see context usage.": "发送一条消息即可查看上下文用量。",']);
});

// context-breakdown: c2d611398 H in og's rail layout over the host's categories report (main's "context-usage", read
// while the card is open): the StackedMeter replaces the plain bar, then H's ue rows (used rows by size, the buffer, Free
// space), the MCP tools / Memory files sub-lists.
test('context-breakdown: the unfolded card reads the categories and draws H\'s meter and rows', { timeout: 60000 }, async () => {
  await withPreviewDom(async (dom) => {
    const desktop = desktopFor({ s1: { cwd: ROOT, originCwd: ROOT } });
    dom.window.desktop = desktop;
    const reads = [];
    const counts = { categories: { systemPrompt: { tokens: 6000 }, systemTools: { tokens: 12000 }, mcpTools: { tokens: 3000 }, memoryFiles: { tokens: 1500 }, skills: { tokens: 900 }, mcpServerInstructions: { tokens: 600 } },
      memoryFiles: [{ path: '/Users/me/widgets/AGENTS.md', type: 'Project', tokens: 1500 }], mcpTools: [{ name: 'update_plan', serverName: 'code_desktop', tokens: 3000, isLoaded: true }], agents: [] };
    const context = contextOf({ usage: { last: { totalTokens: 64400 }, modelContextWindow: 262100 }, core: { engine: 'deepseek-harness' }, contextUsageId: 's1',
      readContextUsage: async (id) => { reads.push(id); return counts; } });
    const { container, root } = await mountTile(dom, hostFor(desktop, { context }));
    // the card's fold is the rail's per-session section state (an earlier test may have unfolded it): read only once open
    const fold = [...contextCard(container).querySelectorAll('[aria-expanded]')][0];
    if (fold.getAttribute('aria-expanded') === 'false') {
      assert.deepEqual(reads, [], 'nothing is read while the card is folded');
      await click(fold);
    }
    await flush();
    assert.deepEqual(reads, ['s1']);
    const card = contextCard(container);
    const text = card.textContent;
    assert.ok(text.includes('25% used'), text);
    const meter = card.querySelector('[data-cds="StackedMeter"]');
    assert.ok(meter, 'the StackedMeter replaces je');
    assert.ok((meter.getAttribute('aria-label') ?? '').startsWith('Context window: '), meter.getAttribute('aria-label'));
    // ue rows: used categories by size (Messages = 64400 - 24000 = 40400 first), then Free space (no threshold: no buffer);
    // MCP server instructions is Claude Code 2.1.299's row
    const order = ['Messages', 'System tools', 'System prompt', 'MCP tools', 'Memory files', 'Skills', 'MCP server instructions', 'Free space'];
    let at = -1;
    for (const name of order) { const next = text.indexOf(name, at + 1); assert.ok(next > at, `${name} after the previous row: ${text}`); at = next; }
    assert.ok(text.includes('40.4k'), text);
    assert.ok(text.includes('15.4%'), text);
    assert.ok(!text.includes('Autocompact buffer'), text);
    // de's sub-lists (q, rail): MCP tools and Memory files toggles with their counts
    const toggles = [...card.querySelectorAll('button[aria-expanded]')].map((b) => b.textContent);
    assert.ok(toggles.some((label) => label.includes('MCP tools1')), JSON.stringify(toggles));
    assert.ok(toggles.some((label) => label.includes('Memory files1')), JSON.stringify(toggles));
    await act(async () => { root.unmount(); });
  });
});
