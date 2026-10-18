import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  MCP_APP_ROW, VISUALIZE_SERVER_UUID, mcpCallOf, officialToolName, mcpAppRowKind, groupAroundMcpAppRows, toMcpAppTool,
  sessionMcpAppServers, coreServesMcpApps, pendingMcpAppRequests,
} from '../src/mcp-app-model.mjs';
import { groupFileTools } from '../src/file-tool-model.mjs';

// R4g-mcp MA-7: the transcript model of the MCP App row (KBe "mcp_app", m2e / e0, cef1e6037 lt / pt), table-driven over
// controlled items. The official bindings are counted in the installed 2.42304.0 chunks.
const require = createRequire(import.meta.url);
const reference = path.resolve(import.meta.dirname, '../../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(reference, file), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const { appResourceUri } = require('../electron/mcp-apps-host.cjs');

test('official bindings: KBe mcp_app, UV stands-alone, m2e / e0 mounts, lt matcher, pt result', () => {
  const host = raw('c96d752d0-BOCqU7c2.js');
  for (const [needle, n] of [
    ['t.isMcpAppTool?.(e.name)?"mcp_app"', 1],
    ['mcp_app:{rollUp:"stands-alone"}', 1],
    ['"skill_proposal","env_help","mcp_app"]', 1],
    ['if(a&&r?.(e.tools[0].name))return b(VX,{tool:e.tools[0],sessionRef:t,onPrefillComposer:n})', 1],
    ['o&&r?.(d.name)?b(VX,{tool:d,sessionRef:i,onPrefillComposer:a,fallback:_})', 1],
    ['N as cm,', 1],
  ]) assert.equal(count(host, needle), n, needle);
  const cef = raw('cef1e6037-8DivyY4m.js');
  assert.equal(count(cef, 'function lt(e,t){let r=ne(),i=Bt(t),a=n(()=>r?e.filter(e=>_(e.name)).map(e=>e.name):ct,[r,e]),o=g(a,{sessionServers:i});return n(()=>ut(o),[o])}'), 1);
  assert.equal(count(cef, 'r=e.rawResultContent??(Array.isArray(t?.content)?t.content:Array.isArray(e.toolUseResult)?e.toolUseResult:n?[{type:"text",text:e.output??""}]:void 0)'), 1);
  // pb (the server segment cleaner) and one other cleaner share the expression.
  assert.equal(count(raw('shared-156-Bikz018e.js'), 'e.replace(/[^a-zA-Z0-9_-]/g,"_")'), 2);
  assert.equal(count(raw('shared-156-Bikz018e.js'), 'function pb(e){return e.replace(/[^a-zA-Z0-9_-]/g,"_")}'), 1);
});

test('mcpCallOf / officialToolName: core MCP calls, OpenClaude Desktop’s own server, OpenCode prefixes', () => {
  const rows = [
    [{ type: 'mcpToolCall', server: 'weather', tool: 'forecast' }, { server: 'weather', tool: 'forecast' }, 'mcp__weather__forecast'],
    [{ type: 'mcpToolCall', server: 'my server.v2', tool: 'chart' }, { server: 'my server.v2', tool: 'chart' }, 'mcp__my_server_v2__chart'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget' }, { server: 'code_desktop', tool: 'show_widget' }, 'mcp__visualize__show_widget'],
    [{ type: 'mcpToolCall', server: 'mcp__code_desktop', tool: 'read_me' }, { server: 'code_desktop', tool: 'read_me' }, 'mcp__visualize__read_me'],
    [{ type: 'mcpToolCall', server: 'code_desktop', tool: 'terminal_run' }, { server: 'code_desktop', tool: 'terminal_run' }, 'mcp__code_desktop__terminal_run'],
    [{ type: 'dynamicToolCall', tool: 'code_desktop_show_widget' }, { server: 'code_desktop', tool: 'show_widget' }, 'mcp__visualize__show_widget'],
    [{ type: 'dynamicToolCall', namespace: 'code_desktop', tool: 'show_widget' }, { server: 'code_desktop', tool: 'show_widget' }, 'mcp__visualize__show_widget'],
    [{ type: 'mcpToolCall', tool: 'mcp__weather__forecast' }, { server: 'weather', tool: 'forecast' }, 'mcp__weather__forecast'],
    [{ type: 'dynamicToolCall', namespace: 'tools', tool: 'lookup' }, null, null],
    [{ type: 'dynamicToolCall', tool: 'todo_write' }, null, null],
    [{ type: 'commandExecution', command: 'ls' }, null, null],
    [{ type: 'mcpToolCall', server: 'weather' }, null, null],
    [null, null, null],
  ];
  for (const [item, call, name] of rows) {
    assert.deepEqual(mcpCallOf(item), call, JSON.stringify(item));
    assert.equal(officialToolName(item), name, JSON.stringify(item));
  }
});

// The session matcher as main.jsx builds it: an MCP name whose server lists the tool with a ui:// resource (dP).
const visualize = { name: 'visualize', uuid: VISUALIZE_SERVER_UUID, isBuiltIn: true,
  tools: [{ name: 'show_widget', _meta: { ui: { resourceUri: 'ui://imagine/show-widget.html' } } }, { name: 'read_me', _meta: { 'claude.ai/hidden_in_chat': true } }] };
const weather = { name: 'weather', type: 'core', isBuiltIn: false, tools: [{ name: 'forecast', _meta: { ui: { resourceUri: 'ui://weather/forecast.html' } } }] };
function matcher(servers) {
  return name => servers.some(server => server.tools.some(tool => name === `mcp__${server.name}__${tool.name}` && appResourceUri(tool._meta) !== undefined));
}

test('KBe: an MCP App tool is the "mcp_app" row; other MCP calls and other items are not', () => {
  const isApp = matcher([visualize, weather]);
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget' }, isApp), MCP_APP_ROW);
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'weather', tool: 'forecast' }, isApp), MCP_APP_ROW);
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'code_desktop', tool: 'read_me' }, isApp), null, 'read_me has no ui:// resource');
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'weather', tool: 'plain' }, isApp), null);
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'code_desktop', tool: 'terminal_run' }, isApp), null);
  assert.equal(mcpAppRowKind({ type: 'commandExecution' }, isApp), null);
  // Without the session's servers (not listed yet, or visualize switched off) nothing is an App row.
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget' }, matcher([])), null);
  assert.equal(mcpAppRowKind({ type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget' }, undefined), null);
});

test('UV.mcp_app stands alone: the tool grouping runs around MCP App rows, never folding them into a group', () => {
  const isApp = matcher([visualize]);
  const isAppItem = item => mcpAppRowKind(item, isApp) === MCP_APP_ROW;
  const items = [
    { id: 'u', type: 'userMessage', turnId: 't1' },
    { id: 'c1', type: 'commandExecution', status: 'completed', turnId: 't1' },
    { id: 'c2', type: 'commandExecution', status: 'completed', turnId: 't1' },
    { id: 'w', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', status: 'completed', turnId: 't1' },
    { id: 'c3', type: 'commandExecution', status: 'completed', turnId: 't1' },
    { id: 'm', type: 'mcpToolCall', server: 'weather', tool: 'plain', status: 'completed', turnId: 't1' },
    { id: 'a', type: 'agentMessage', text: 'done', turnId: 't1' },
  ];
  const rows = groupAroundMcpAppRows(groupFileTools, items, isAppItem, 'normal');
  assert.deepEqual(rows.map(row => row.type === 'fileToolGroup' ? `group(${row.toolGroup.map(member => member.id)})` : row.id),
    ['u', 'group(c1,c2)', 'w', 'group(c3,m)', 'a']);
  // Without the official kind (the plain grouping), the widget call would be a group member.
  assert.deepEqual(groupFileTools(items).map(row => row.type === 'fileToolGroup' ? row.toolGroup.map(member => member.id).join() : row.id),
    ['u', 'c1,c2,w,c3,m', 'a']);
  // No App row: exactly the plain grouping.
  const plain = groupAroundMcpAppRows(groupFileTools, items, () => false, 'normal');
  assert.deepEqual(plain.map(row => row.id), groupFileTools(items).map(row => row.id));
});

test('toMcpAppTool: the official tool shape (pt / ft / hQe read it) from a host MCP call', () => {
  const result = { content: [{ type: 'text', text: 'Rendered' }], structuredContent: { ok: true } };
  const running = { id: 'call-1', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', status: 'inProgress', arguments: { title: 'Chart', widget_code: '<svg/>' }, result: null, error: null };
  assert.deepEqual({ ...toMcpAppTool(running) }, { id: 'call-1', name: 'mcp__visualize__show_widget', status: 'running', input: { title: 'Chart', widget_code: '<svg/>' }, isError: false });
  assert.equal(toMcpAppTool(running, { awaitingApproval: true }).status, 'awaiting_approval');
  const done = { ...running, status: 'completed', result };
  assert.deepEqual({ ...toMcpAppTool(done) }, { id: 'call-1', name: 'mcp__visualize__show_widget', status: 'completed', input: running.arguments, toolUseResult: result, isError: false });
  assert.equal(toMcpAppTool(done), toMcpAppTool(done), 'stable for the memoized card');
  const failed = { ...running, status: 'failed', error: { message: 'MCP server "weather" is not connected' } };
  assert.deepEqual({ ...toMcpAppTool(failed) }, { id: 'call-1', name: 'mcp__visualize__show_widget', status: 'error', input: running.arguments, isError: true, output: 'MCP server "weather" is not connected' });
  assert.equal(toMcpAppTool({ ...running, status: 'interrupted' }).interrupted, true);
  assert.equal(toMcpAppTool({ ...running, status: 'declined' }).rejected, true);
  assert.deepEqual(toMcpAppTool({ ...running, arguments: '{"title":"From JSON"}' }).input, { title: 'From JSON' });
  assert.deepEqual(toMcpAppTool({ ...running, arguments: 'not json' }).input, {});
  const dynamic = { id: 'd', type: 'dynamicToolCall', tool: 'code_desktop_show_widget', status: 'completed', success: true,
    contentItems: [{ type: 'inputText', text: 'ok' }, { type: 'inputImage', imageUrl: 'data:image/png;base64,AAAA' }] };
  assert.deepEqual(toMcpAppTool(dynamic).toolUseResult, { content: [{ type: 'text', text: 'ok' }, { type: 'image', mimeType: 'image/png', data: 'AAAA' }] });
  assert.equal(toMcpAppTool({ type: 'commandExecution' }), null);
});

test('sessionMcpAppServers: MA-4 servers → the card adapters’ session state', () => {
  const reply = { servers: [
    { name: 'visualize', uuid: VISUALIZE_SERVER_UUID, type: 'local', isBuiltIn: true, tools: visualize.tools },
    { name: 'weather', type: 'core', isBuiltIn: false, status: 'ready', tools: weather.tools },
    { name: 'weather', type: 'core', tools: [] }, { name: '' }, null,
  ], core: { supported: true } };
  assert.deepEqual(sessionMcpAppServers(reply).map(server => ({ ...server })), [
    { uuid: VISUALIZE_SERVER_UUID, name: 'visualize', type: 'local', isBuiltIn: true, sessionOwned: false, tools: visualize.tools },
    { uuid: 'weather', name: 'weather', type: 'local', isBuiltIn: false, sessionOwned: true, tools: weather.tools, status: 'ready' },
  ]);
  assert.deepEqual(sessionMcpAppServers(null), []);
  assert.equal(coreServesMcpApps(reply), true);
  assert.equal(coreServesMcpApps({ core: { supported: false, unavailable: 'not_connected', reason: 'core_unsupported' } }), false);
  assert.equal(coreServesMcpApps({ core: { supported: true, unavailable: 'read_failed' } }), false);
});

test('pendingMcpAppRequests: the approvals kQe waits on, under the official tool name', () => {
  const items = [{ id: 'w', type: 'mcpToolCall', server: 'code_desktop', tool: 'show_widget', status: 'inProgress' },
    { id: 'c', type: 'commandExecution', status: 'inProgress' }];
  assert.deepEqual(pendingMcpAppRequests(items, new Set(['w', 'c'])), { w: { status: 'pending', toolName: 'mcp__visualize__show_widget' } });
  assert.deepEqual(pendingMcpAppRequests(items, new Set()), {});
});
