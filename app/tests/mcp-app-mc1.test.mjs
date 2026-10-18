import test, { before, after, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// R4i-mcp MC1: the R4g-mcp follow-ups of the 2.42304.0 MCP App / Visualize migration.
//   (1) App-initiated tools/call: the card's bridge client sends MCP `name`, mcp-apps-host.cjs reads `name` (end to end).
//   (2) Settings › Code › Visuals › Inline visualizations (the official claude.ai Capabilities row, c71860c77 ze).
//   (3) Pane windows (POPOUT_ACTIONS) get the widget actions — asserted in tests/mcp-apps-host.test.mjs.
//   (4) The servers listing repolls on CFJssAFf XA after a failed / unsettled listing; warmSession's 5 s rule after that.
//   (5) ui/update-model-context → the next send's toolStates (c6b8adeaf) → noteAcceptedSend's widgetToolStates, the
//       <widget_context_hint> (B5tintml Wx) and read_widget_context (BPh06o4s r).
//   (6) runningStandalonesRollUp: an owned session never turns mcp_app into unsettled_standalone (source pin).
//   (7) The nested views (source-agent.jsx, source-btw-pane.jsx) group around MCP App rows.
// No frame, no server, no port, no process, no real configuration.
const require = createRequire(import.meta.url);
const app = path.resolve(import.meta.dirname, '..');
const reference = path.join(app, '../reference/installed-2.42304.0-20261017');
const h = React.createElement;
const host = require('../electron/mcp-apps-host.cjs');
const read = file => fs.readFileSync(path.join(app, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let server, Mount, Adapters, I18n, ModelContext;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Mount = await server.ssrLoadModule('/src/source-mcp-app.jsx');
  Adapters = await server.ssrLoadModule('/src/source-mcp-app-card-adapters.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  ModelContext = await server.ssrLoadModule('/src/generated/mcp-app-card/shared-28.mjs');
});
after(async () => { await server?.close(); });
beforeEach(() => { Mount.mcpAppTranscriptHost.reset(); });

const sessions = new Set(['s1', 's2']);
function makeHost({ owner = null, visualize = true } = {}) {
  return host.createMcpAppsHost({ client: () => owner, session: id => (sessions.has(id) ? { id, cwd: '/work' } : null),
    visualizeEnabled: () => visualize, coreSupportsMcpApps: info => info?.engine === 'codex' });
}
async function withWindow(call, run) {
  const saved = globalThis.window;
  globalThis.window = { desktop: { call } };
  try { return await run(); } finally { globalThis.window = saved; }
}
const flush = async (rounds = 6) => { for (let i = 0; i < rounds; i += 1) await new Promise(resolve => setImmediate(resolve)); };

test('MC1 official features re-checked in 2.42304.0 (counts with split)', { skip: !fs.existsSync(reference) }, () => {
  const c = (file, needle) => count(fs.readFileSync(path.join(reference, file), 'utf8'), needle);
  const B = 'asar/.vite/build/', V = 'ion-dist/assets/v1/';
  const pins = [
    [B + 'index.chunk-CFJssAFf.js', 'r&&"toolStates"in r&&(e.widgetToolStates=r.toolStates)'],
    [B + 'index.chunk-CFJssAFf.js', 'R=n.aa(u,R)'],
    [B + 'index.chunk-CFJssAFf.js', 'XA=[2e3,5e3,15e3,3e4,6e4]'],
    [B + 'index.chunk-CFJssAFf.js', 'Date.now()-(i.sdkMcpLastPollAt??0)>5e3'],
    [B + 'index.chunk-CFJssAFf.js', 'getWidgetToolStates(e){return this.sessions.get(e)?.widgetToolStates}'],
    [B + 'index.chunk-B5tintml.js', '<widget_context_hint>Interactive widgets in this conversation: '],
    [B + 'index.chunk-B5tintml.js', 'if(n==="read_widget_context")'],
    [B + 'index.chunk-BPh06o4s.js', 'No widget had shared anything when the user last sent a message'],
    [B + 'index.chunk-BPh06o4s.js', 'tool_name is required: the full name of the tool call that drew the widget.'],
    [B + 'index.chunk-muI2IV6k.js', 'y1t="read_widget_context"'],
    [V + 'c6b8adeaf-C5Aww7gq.js', 'f=dn()?wt.getState().getModelContextStates(t.ref.id).filter(e=>!(d&&He(e))):[]'],
    [V + 'c6b8adeaf-C5Aww7gq.js', 'f.length>0||dn()&&t.ref.type==="local"&&oe("__gb__3756952893")?f:void 0'],
    [V + 'c96d752d0-BOCqU7c2.js', 'mcpAppWidgets:e.isOwnedSession||e.ownershipUndecided===!0'],
    [V + 'c96d752d0-BOCqU7c2.js', '(n!=="mcp_app"||t.mcpAppWidgets!==!0)?"unsettled_standalone":n'],
    [V + 'c96d752d0-BOCqU7c2.js', 'runningStandalonesRollUp:k,mcpAppWidgets:j'],
    [V + 'c96d752d0-BOCqU7c2.js', 'j=f===!0||A'],
    [V + 'c71860c77-D15EbUZs.js', 'defaultMessage:"Inline visualizations",id:"5lU0AsuNui"'],
    [V + 'c71860c77-D15EbUZs.js', 'defaultMessage:"Allow Claude to generate interactive visualizations, charts, and diagrams directly in the conversation.",id:"y2KtEE7RW9"'],
    [V + 'c71860c77-D15EbUZs.js', 'c("claudeai_mcp_apps_visualize")'],
  ];
  for (const [file, needle] of pins) assert.equal(c(file, needle), 1, `${file}: ${needle}`);
});

test('(1) tools/call end to end: the card bridge client sends `name`, MA-4 reads `name` and runs the visualize tool', async () => {
  const bridge = makeHost();
  const calls = [];
  const call = async (action, params) => { calls.push([action, params]); return bridge.call(action, params); };
  await withWindow(call, async () => {
    const client = Adapters.createBridgeMcpAppClient({ sessionId: 's1', server: { name: 'visualize', uuid: host.VISUALIZE_SERVER_UUID, tools: [] } });
    const shown = await client.request({ method: 'tools/call', params: { name: 'show_widget', arguments: { title: 't', widget_code: '<p>x</p>', loading_messages: ['a'] } } });
    assert.match(shown.content[0].text, /^Content rendered and shown to the user\./);
    const refused = await client.request({ method: 'tools/call', params: { name: 'terminal', arguments: {} } });
    assert.deepEqual(refused, { content: [{ type: 'text', text: "Tool 'terminal' is not permitted" }], isError: true });
  });
  assert.deepEqual(calls.map(([action, params]) => [action, params.name, 'tool' in params]),
    [['mcp-app:call-tool', 'show_widget', false], ['mcp-app:call-tool', 'terminal', false]]);
  // The old key alone no longer names a tool.
  assert.deepEqual(await bridge.call('mcp-app:call-tool', { sessionId: 's1', server: 'visualize', tool: 'show_widget', arguments: {} }),
    { content: [{ type: 'text', text: "Tool '' is not permitted" }], isError: true });
  // The transcript mount no longer installs its own client (the bridge client is the default factory).
  const mount = read('src/source-mcp-app.jsx');
  assert.equal(count(mount, 'setClientFactory'), 0);
  assert.equal(count(mount, 'createBridgeMcpAppClient'), 0);
});

test('(2) Settings › Code › Visuals: one Inline visualizations row for agentVisualize (unset reads as on), translated', () => {
  const settings = read('src/source-settings.jsx');
  assert.equal(count(settings, "{tab:'code',title:'Visuals',rows:[booleanRow('agentVisualize',t('Inline visualizations'),t('Allow DeepSeek to generate interactive visualizations, charts, and diagrams directly in the conversation.'),{checked:shownValue('agentVisualize',config.agentVisualize)!==false})]},"), 1);
  // It sits right after the Browser section, before Model and permissions.
  assert.ok(settings.indexOf("title:'Browser'") < settings.indexOf("title:'Visuals'") && settings.indexOf("title:'Visuals'") < settings.indexOf("title:'Model and permissions'"));
  // The main-process save path (R4g-mcp) is unchanged: one write, and the agent tools re-list.
  const main = read('electron/main.cjs');
  assert.equal(count(main, 'if (typeof p.agentVisualize === "boolean") config.agentVisualize = p.agentVisualize;'), 1);
  const zh = I18n.dictionary('zh-CN');
  for (const key of ['Visuals', 'Inline visualizations', 'Allow DeepSeek to generate interactive visualizations, charts, and diagrams directly in the conversation.'])
    assert.ok(Object.hasOwn(zh, key) && zh[key].trim(), key);
});

test('(4) servers: a failed listing is asked again on XA; a settled one is not; warmSession 5 s rule after the schedule', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  try {
    let fail = 2;
    const calls = [];
    // The DeepSeek Harness answer (core_unsupported) settles the listing; a missing core would not.
    const bridge = makeHost({ owner: { serverInfo: { engine: 'deepseek' }, connection: {}, request: async () => { throw new Error('never'); } } });
    const call = async (action, params) => {
      calls.push(action);
      if (action === 'mcp-app:servers' && fail-- > 0) throw new Error('core busy');
      return bridge.call(action, params);
    };
    const warn = mock.method(console, 'warn', () => {});
    await withWindow(call, async () => {
      Mount.ensureMcpAppServers('s1', 'mcp__visualize__show_widget');
      await flush();
      assert.equal(calls.length, 1);
      mock.timers.tick(1999); await flush();
      assert.equal(calls.length, 1, 'not before the first XA delay');
      mock.timers.tick(1); await flush();
      assert.equal(calls.length, 2, 'second try after 2 s');
      mock.timers.tick(5000); await flush();
      assert.equal(calls.length, 3, 'third try after 5 s more, which settles');
      mock.timers.tick(120000); await flush();
      assert.equal(calls.length, 3, 'a settled listing is not repolled');
      // A settled session is not listed again by a mounting row of a known segment.
      Mount.ensureMcpAppServers('s1', 'mcp__visualize__show_widget'); await flush();
      assert.equal(calls.length, 3);
    });
    warn.mock.restore();
  } finally { mock.timers.reset(); }
});

test('(4) servers: a core server still starting (core.pending) repolls; the schedule ends after XA; a later row relists after 5 s', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 2_000_000 });
  try {
    let lists = 0;
    const owner = { serverInfo: { engine: 'codex' }, connection: {}, request: async (method) => {
      if (method !== 'mcpServerStatus/list') throw Object.assign(new Error('unexpected'), { code: -32601 });
      lists += 1;
      return { data: [{ name: 'weather', runtimeStatus: 'starting', tools: {} }] };
    } };
    const bridge = makeHost({ owner });
    assert.deepEqual((await bridge.servers({ sessionId: 's2' })).core, { supported: true, pending: true });
    lists = 0;
    await withWindow((action, params) => bridge.call(action, params), async () => {
      Mount.ensureMcpAppServers('s1'); await flush();
      assert.equal(lists, 1);
      for (const delay of [2e3, 5e3, 15e3, 3e4, 6e4]) { mock.timers.tick(delay); await flush(); }
      assert.equal(lists, 6, 'one listing and the five XA repolls');
      mock.timers.tick(600000); await flush();
      assert.equal(lists, 6, 'the schedule ran out');
      Mount.ensureMcpAppServers('s1'); await flush();
      assert.equal(lists, 7, 'a row mounting later relists (warmSession: last poll older than 5 s)');
      Mount.ensureMcpAppServers('s1'); await flush();
      assert.equal(lists, 7, 'its repoll is now scheduled, not repeated');
    });
  } finally { mock.timers.reset(); }
});

test('(4) servers: the harness answer (core_unsupported) is settled, a disconnected core is not', async () => {
  const unsupported = await makeHost({ owner: { serverInfo: { engine: 'deepseek' }, connection: {}, request: async () => { throw new Error('never'); } } }).servers({ sessionId: 's1' });
  assert.equal(unsupported.core.reason, host.CORE_UNSUPPORTED);
  const disconnected = await makeHost().servers({ sessionId: 's1' });
  assert.deepEqual(disconnected.core, { supported: false, unavailable: 'not_connected' });
  const source = read('src/source-mcp-app.jsx');
  assert.equal(count(source, "|| (reply?.core?.unavailable === 'not_connected' && reply?.core?.reason === undefined);"), 1);
  assert.equal(count(source, 'export const MCP_APP_REPOLL_MS = Object.freeze([2e3, 5e3, 15e3, 3e4, 6e4]);'), 1);
});

test('(5) model context: the card store → the send → MA-4 widgetToolStates, hint and read_widget_context', async () => {
  const bridge = makeHost();
  const calls = [];
  const call = async (action, params) => { calls.push([action, params]); return bridge.call(action, params); };
  const store = ModelContext.Ha;
  store.getState().clearConversationStates('s1');
  await withWindow(call, async () => {
    // No card loaded yet: no widget can have shared anything, nothing is sent.
    assert.equal(await Mount.noteMcpAppSendContext('s1'), null);
    await Mount.loadMcpAppCard();
    assert.equal(await Mount.noteMcpAppSendContext('s1'), null, 'nothing shared: no toolStates (f.length>0)');
    assert.equal(calls.length, 0);
    await store.getState().updateModelContext('s1', 'mcp__visualize__show_widget', [{ type: 'text', text: 'Chart of Q3: 42' }]);
    assert.deepEqual(await Mount.noteMcpAppSendContext('s1'), { stored: true, count: 1 });
  });
  assert.deepEqual(calls.at(-1), ['mcp-app:tool-states', { sessionId: 's1', toolStates: [{ tool_name: 'mcp__visualize__show_widget', content: [{ type: 'text', text: 'Chart of Q3: 42' }] }] }]);
  assert.deepEqual(bridge.widgetToolStates('s1'), [{ tool_name: 'mcp__visualize__show_widget', content: [{ type: 'text', text: 'Chart of Q3: 42' }] }]);
  // B5tintml Wx, with the host's own server name for the tool (official mcp__ccd_session__read_widget_context).
  assert.equal(bridge.widgetContextHint('s1', 'hello'), "hello\n\n<widget_context_hint>Interactive widgets in this conversation: mcp__visualize__show_widget. To read a widget's current state, call mcp__code_desktop__read_widget_context with the widget's tool_name.</widget_context_hint>");
  assert.equal(bridge.widgetContextHint('s2', 'hello'), 'hello');
  // BPh06o4s r.
  assert.deepEqual(bridge.readWidgetContext('s1', 'mcp__visualize__show_widget'), { content: [{ type: 'text', text: 'Chart of Q3: 42' }] });
  assert.equal(bridge.readWidgetContext('s1', '').isError, true);
  assert.match(bridge.readWidgetContext('s1', 'mcp__x__y').content[0].text, /^No widget context available for tool 'mcp__x__y'\. Widgets that have shared something: 'mcp__visualize__show_widget'\./);
  assert.match(bridge.readWidgetContext('s2', 'mcp__x__y').content[0].text, /^No widget had shared anything when the user last sent a message/);
  // Shapes the store never produces are refused; an unknown session stores nothing.
  assert.deepEqual(await bridge.call('mcp-app:tool-states', { sessionId: 's1', toolStates: [{ tool_name: 'a', content: [{ type: 'audio' }] }] }), { stored: false });
  assert.deepEqual(await bridge.call('mcp-app:tool-states', { sessionId: 'nope', toolStates: [] }), { stored: false });
  assert.equal(bridge.widgetToolStates('s1').length, 1, 'a refused send keeps the last states');
  // An image block keeps media_type in the states and comes back as MCP mimeType.
  assert.deepEqual(host.readWidgetContextFrom('w', host.parseToolStates([{ tool_name: 'w', content: [{ type: 'image', data: 'AAAA', media_type: 'image/png' }] }])),
    { content: [{ type: 'image', data: 'AAAA', mimeType: 'image/png' }] });
  store.getState().clearConversationStates('s1');
});

test('(5) main.jsx: the composer send hands the model context over once the turn/start is accepted', () => {
  const main = read('src/main.jsx');
  assert.equal(count(main, 'import { useMcpAppTranscript, noteMcpAppSendContext } from "./source-mcp-app.jsx";'), 1);
  const at = main.indexOf('if (!shellCommand) void noteMcpAppSendContext(id);');
  assert.ok(at > 0 && count(main, 'noteMcpAppSendContext(') === 1);
  const before = main.slice(main.lastIndexOf('else await rpc("turn/start"', at), at);
  assert.match(before, /^else await rpc\("turn\/start", \{ threadId: id, input: pendingEntry\?\.input[^\n]*\n\s+turnStarted = true;\n\s+\/\/ R4i-mcp MC1/);
});

test('(6) runningStandalonesRollUp: the host’s owned sessions keep mcp_app (no unsettled_standalone branch to migrate)', () => {
  const model = read('src/mcp-app-model.mjs');
  assert.equal(count(model, 'unsettled_standalone'), 0);
  assert.equal(count(read('src/source-mcp-app.jsx'), 'runningStandalonesRollUp'), 0);
});

test('(7) nested views group around MCP App rows of their own session', () => {
  const agent = read('src/source-agent.jsx'), btw = read('src/source-btw-pane.jsx');
  assert.equal(count(agent, "import {useMcpAppRowGrouping} from './source-mcp-app.jsx';"), 1);
  assert.equal(count(agent, 'const groupRows=useMcpAppRowGrouping(agent.id,ownerId);'), 1);
  assert.equal(count(agent, ' ownerId={sessionId} '), 1, 'a subagent view classifies under the pane’s session');
  assert.equal(count(agent, '{groupRows(groupFileTools,visible,transcriptView).map('), 1);
  assert.equal(count(agent, 'groupFileTools('), 0);
  assert.equal(count(btw, "import { useMcpAppRowGrouping } from './source-mcp-app.jsx';"), 1);
  assert.equal(count(btw, 'const groupRows = useMcpAppRowGrouping(sessionId);'), 1);
  assert.equal(count(btw, 'rows = groupRows(groupFileTools, ownItems);'), 1);
  assert.equal(count(btw, 'groupFileTools('), 0);
});

test('(7) useMcpAppRowGrouping: an App call splits the view’s groups; without App rows the grouping is unchanged', () => {
  Adapters.mcpAppCardHost.setSessionServers('s1', [{ uuid: host.VISUALIZE_SERVER_UUID, name: 'visualize', type: 'local', isBuiltIn: true,
    tools: [{ name: 'show_widget', _meta: { ui: { resourceUri: 'ui://imagine/show-widget.html' } } }, { name: 'read_me' }] }]);
  const items = [
    { id: 'a', type: 'commandExecution' },
    { id: 'w', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', status: 'completed' },
    { id: 'b', type: 'commandExecution' },
    { id: 'r', type: 'mcpToolCall', server: 'code_desktop', tool: 'read_me', status: 'completed' },
  ];
  const groupAll = (list, tag) => (list.length ? [{ id: `g:${list.map(item => item.id).join('+')}`, tag }] : []);
  let shown = null;
  function View({ sessionId }) { const group = Mount.useMcpAppRowGrouping(sessionId); shown = group(groupAll, items, 'view'); return null; }
  renderToStaticMarkup(h(View, { sessionId: 's1' }));
  assert.deepEqual(shown.map(entry => entry.id), ['g:a', 'w', 'g:b+r']);
  assert.equal(shown[0].tag, 'view', 'the view’s own arguments reach its grouping');
  renderToStaticMarkup(h(View, { sessionId: 's2' }));
  assert.deepEqual(shown.map(entry => entry.id), ['g:a+w+b+r'], 'no servers listed: the plain grouping');
});

test('(7) review fix: a child thread is no session of the host; a subagent view uses its owning session', async () => {
  // main.cjs: the listing keeps only threads without parentThreadId / source.subAgent, and agentToolSession (the host's
  // known()) reads config.threadIds / archivedThreadIds only, so a core child thread id is refused by mcp-app:servers.
  const main = read('electron/main.cjs');
  assert.equal(count(main, '!thread.parentThreadId && !thread.source?.subAgent'), 1);
  // Read inside agentToolSession itself: R4i-transcript TR3 btwPopoutView (a /btw popout view) uses the same known-id guard.
  const agentSession = main.slice(main.indexOf('const agentToolSession = (id) => {'), main.indexOf('\n};\n', main.indexOf('const agentToolSession = (id) => {')));
  assert.equal(count(agentSession, '![...config.threadIds, ...config.archivedThreadIds].includes(id)) return null;'), 1);
  assert.equal(count(main, 'session: agentToolSession'), 1);
  const bridge = makeHost();
  await assert.rejects(bridge.call('mcp-app:servers', { sessionId: 'child-1' }), /Unknown session/);
  assert.ok((await bridge.call('mcp-app:servers', { sessionId: 's1' })).servers.length >= 1, 'the owning session lists the servers');

  Adapters.mcpAppCardHost.setSessionServers('s1', [{ uuid: host.VISUALIZE_SERVER_UUID, name: 'visualize', type: 'local', isBuiltIn: true,
    tools: [{ name: 'show_widget', _meta: { ui: { resourceUri: 'ui://imagine/show-widget.html' } } }] }]);
  const items = [{ id: 'a', type: 'commandExecution' }, { id: 'w', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', status: 'completed' }];
  const groupAll = list => (list.length ? [{ id: `g:${list.map(item => item.id).join('+')}` }] : []);
  let shown = null;
  function View({ sessionId, ownerId }) { const group = Mount.useMcpAppRowGrouping(sessionId, ownerId); shown = group(groupAll, items); return null; }
  renderToStaticMarkup(h(View, { sessionId: 'child-0' }));
  assert.deepEqual(shown.map(entry => entry.id), ['g:a+w'], 'without an owner the child thread has no servers');
  assert.equal(Mount.mcpAppSessionOf('child-0'), 'child-0');
  renderToStaticMarkup(h(View, { sessionId: 'child-1', ownerId: 's1' }));
  assert.deepEqual(shown.map(entry => entry.id), ['g:a', 'w'], 'the owner’s servers classify the subagent’s App call');
  assert.equal(Mount.mcpAppSessionOf('child-1'), 's1');
  assert.equal(Mount.mcpAppSessionOf('s1'), 's1');
  assert.equal(Mount.mcpAppSessionOf(null), null);
  // A row of the child thread (main.jsx renderItem sessionKey={childId}) draws under the owner: the card's matcher sees
  // the App tool, so the row is no longer its fallback once the card module is there (here: the fallback, no card yet,
  // but the servers request goes to the owner).
  const calls = [];
  await withWindow(async (action, params) => { calls.push([action, params]); return { servers: [] }; }, async () => {
    renderToStaticMarkup(h(Mount.SourceMcpAppRow, { item: items[1], sessionKey: 'child-1', fallback: h('i', null, 'row') }));
    Mount.ensureMcpAppServers(Mount.mcpAppSessionOf('child-1'), 'mcp__code_desktop__show_widget');
    await flush();
  });
  assert.ok(calls.every(([, params]) => params?.sessionId !== 'child-1'), 'no request names the child thread');
  Mount.mcpAppTranscriptHost.reset();
  assert.equal(Mount.mcpAppSessionOf('child-1'), 'child-1', 'reset forgets the owners');
});

test('(5) review: a send without widget states keeps the stored ones (Code LocalSessions omits toolStates)', { skip: !fs.existsSync(reference) }, async () => {
  const c = (file, needle) => count(fs.readFileSync(path.join(reference, file), 'utf8'), needle);
  // c6b8adeaf: toolStates is f only when f.length>0 (or GrowthBook __gb__3756952893, off in the host), else void 0;
  // DLn6Mdsc LocalSessions.sendMessage then leaves the key out, so CFJssAFf noteAcceptedSend's `"toolStates"in r` is false.
  assert.equal(c('ion-dist/assets/v1/c6b8adeaf-C5Aww7gq.js', 'f.length>0||dn()&&t.ref.type==="local"&&oe("__gb__3756952893")?f:void 0'), 1);
  assert.equal(c('asar/.vite/build/index.chunk-DLn6Mdsc.js', '...o===void 0?{}:{toolStates:o}'), 1);
  assert.equal(c('asar/.vite/build/index.chunk-CFJssAFf.js', 'r&&"toolStates"in r&&(e.widgetToolStates=r.toolStates)'), 1);
  const bridge = makeHost();
  const states = [{ tool_name: 'mcp__visualize__show_widget', content: [{ type: 'text', text: 'kept' }] }];
  assert.deepEqual(await bridge.call('mcp-app:tool-states', { sessionId: 's2', toolStates: states }), { stored: true, count: 1 });
  assert.deepEqual(bridge.widgetToolStates('s2'), states);
  assert.equal(count(read('src/source-mcp-app.jsx'), "if (!Array.isArray(states) || states.length === 0) return null;"), 1);
});
