// V3-w10-ccres-rail-connectors: the session rail's Connectors card lists the session's servers the way 3.6556.2 yJ does.
//   c227f4d5e yJ   `a = rb(i, f)` (c9081d688 C over v), `ob(i)` (c9081d688 x), `listedNames: a.map(e => ib(e, m) …)`,
//                  `listedTargets: a.map(e => sJ(rJ(e, p)))`, `listedToolPrefixes: vJ(a.map(xJ), i.map(bJ))`.
//   c9081d688 v    servers without a scope left out, sorted by display name (a plugin's by its connector name),
//                  claude.ai proxies kept apart; E: the grouped id `session-mcp:<name>`; O: the user's own servers.
//   host           session-rail-connectors-model (hand port; c9081d688 is not sliced for a plain-node model, E42) and the
//                  customize "mcp" operation's per-server scope (electron/customize-operations.cjs mcpScope).
// Pure node: reads official chunks as text only (never runs them), no Electron, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import * as Model from '../src/session-rail-connectors-model.mjs';
import { mcpRows } from '../src/customize-model.mjs';

const require = createRequire(import.meta.url);
const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
const app = path.resolve(import.meta.dirname, '..');
const officialV3 = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const pin = (text, needles) => { for (const needle of needles) assert.equal(text.split(needle).length - 1, 1, `official text: ${needle}`); };

test('3.6556.2 sources: yJ lists through c9081d688 C / x / E / k / A / O, targets with rJ / sJ, names with ce38f2fa6 P', () => {
  const c9081 = officialV3('c9081d688-d6gSB2Ai.js');
  pin(c9081, [
    'function v(t,n,r){let a=[],o=new Map;for(let c of t){let{name:t,transport:f,scope:h}=c;if(h===void 0)continue;',
    'if(f==="claudeai-proxy"||h==="claudeai"||p(t)){n.has(t)&&o.set(t,c);continue}let y=e(t);if(y===null)continue;',
    'displayName:i(y.connectorName),pluginName:x&&b?b.pluginName:i(y.pluginName)',
    'return a.sort((e,t)=>e.displayName.localeCompare(t.displayName)),{items:a,byConnectorUuid:o}}',
    'var _=new Map([["project","project"],["user","user"],["local","local"],["flag","local"],["enterprise","managed"],["managed","managed"],["agent","agent"]])',
    'var l="session-mcp:",u="session-mcp-desktop:",d="session-mcp-held-back:"',
    'function x(e){return e!==void 0&&(e.length===0||e.some(e=>e.scope!==void 0))}',
    'function C(e,t){let n=S(e,t);return[...n.items.map(e=>e.server),...n.byConnectorUuid.values()]}',
    'function E(e){return S([e],b).items[0]?.id}',
    'var D=new Set(["user","local","managed"]);function O(e,t){if(e.scope===void 0)return!1;let n=_.get(e.scope);return n===void 0?k(e,t)!==void 0:D.has(n)}',
    'function k(e,t){return e.scope!==void 0&&!_.has(e.scope)&&!m(e)&&t.has(e.name)?e.name:void 0}',
    'function A(e,t){let n=k(e,t);return(n===void 0?void 0:t.get(n))??i(e.name)}',
    'import{_ as t,l as n,m as r,o as i}from"./ce38f2fa6-DZTvfIaH.js"',
    'E as T,', 'k as b,', 'g as c,', 'O as f,', 'C as h,', 'A as m,', 'm as u,', 'x as w,',
  ]);
  const c227 = officialV3('c227f4d5e-B-FYKrwT.js');
  pin(c227, [
    'import{T as $y,b as eb,c as tb,f as nb,h as rb,m as ib,u as ab,w as ob}from"./c9081d688-d6gSB2Ai.js"',
    'function rJ(e,t){let n=eb(e,t);if(n!==void 0)return e.status==="failed"?void 0:{kind:"account",id:n};let r=$y(e);return r===void 0?void 0:{kind:"session",id:r}}',
    'function sJ(e){try{return e===void 0?"":`${e.kind}:${encodeURIComponent(e.id)}`}catch{return""}}',
    'if(!ob(i))return _J;let a=rb(i,f)',
    'listedNames:a.map(e=>ib(e,m).replace(/\\s+/g," ")).join(',
    'listedTargets:a.map(e=>sJ(rJ(e,p))).join(',
    'reconnectOwnToolPrefixes:d.map(SJ).join(',
    'd=u.filter(e=>nb(e,f))',
  ]);
  const ce38 = officialV3('ce38f2fa6-DZTvfIaH.js');
  pin(ce38, ['function P(e){let t=l(e),n=[...t],r=n.length>64?n.slice(0,63).join(""):t;return N.test(r)?n.length>64?`${r}\\u2026`:t:"(unnamed)"}', 'P as o,']);
  pin(officialV3('shared-52-uHFNjl7C.js'), ['function Ro(e){let t=e.match(/^plugin:([^:]+):(.+)$/);if(!t)return null;let[,n,r]=t;return{pluginName:n,connectorName:r}}', 'Ro as ix,']);
  // The host model ports them and says so; the w6 "not ported" note is gone.
  const model = read('src/session-rail-connectors-model.mjs');
  assert.equal(model.includes('Host differences (not ported'), false);
  for (const needle of ['V3-w10-ccres-rail-connectors', 'c9081d688 v', 'c9081d688 x', 'c9081d688 E', 'c227f4d5e rJ', 'c227f4d5e sJ', 'ce38f2fa6 P']) assert.ok(model.includes(needle), needle);
});

test('c9081d688 v: unscoped servers left out, sorted by display name, plugins by connector, proxies apart', () => {
  const servers = [
    { name: 'zeta', status: 'connected', scope: 'user' },
    { name: 'nope', status: 'connected' },
    { name: 'plugin:acme:alpha', status: 'connected', scope: 'plugin' },
    { name: 'beta', status: 'failed', scope: 'project' },
    { name: 'proxy', status: 'connected', scope: 'claudeai' },
    { name: '0b5e7a3c-1d2e-4f50-8a9b-0c1d2e3f4a5b', status: 'connected', scope: 'dynamic' },
    { name: 'held', status: 'pending', scope: 'local', hostNote: 'held_back' },
    { name: 'weird', status: 'connected', scope: 'plugin' },
    { name: 'mine', status: 'connected', scope: 'plugin', pluginId: 'tools@market' },
  ];
  const { items, byConnectorUuid } = Model.groupSessionMcpServers(servers, new Set(['proxy']));
  assert.deepEqual(items.map((e) => [e.displayName, e.id, e.source]), [
    ['alpha', 'session-mcp:plugin:acme:alpha', 'plugin'], ['beta', 'session-mcp:beta', 'project'],
    ['held', 'session-mcp-held-back:held', 'local'], ['mine', 'session-mcp:mine', 'plugin'], ['zeta', 'session-mcp:zeta', 'user'],
  ]);
  assert.equal(items[0].pluginName, 'acme');
  assert.equal(items[3].pluginName, 'tools', 'a host plugin server (pluginId) is its plugin\'s connector');
  assert.deepEqual([...byConnectorUuid.keys()], ['proxy'], 'a known account proxy is kept apart; an unknown uuid one is dropped');
  assert.equal(Model.sessionMcpTargetId({ name: 'gh', status: 'connected', scope: 'user' }), 'session-mcp:gh');
  assert.equal(Model.sessionMcpTargetId({ name: 'gh', status: 'connected' }), undefined);
  assert.equal(Model.encodeConnectorTarget({ kind: 'session', id: 'session-mcp:gh' }), 'session:session-mcp%3Agh');
  assert.equal(Model.encodeConnectorTarget(undefined), '');
  assert.equal(Model.encodeConnectorTarget({ kind: 'session', id: '\ud800' }), '', 'an id encodeURIComponent refuses');
  // ce38f2fa6 P
  assert.equal(Model.mcpDisplayName('  a\u0007b  '), 'a b');
  assert.equal(Model.mcpDisplayName('\u200b'), '(unnamed)');
  assert.equal(Model.mcpDisplayName('x'.repeat(65)), `${'x'.repeat(63)}\u2026`);
  assert.equal(Model.mcpDisplayName('x'.repeat(64)), 'x'.repeat(64));
});

test('yJ over the host rows: scope fallback, the grouped order, targets, own servers, and a list with no scope', () => {
  const rows = [
    { name: 'zeta', kind: 'signIn', scope: 'user' },
    { name: 'plugin:acme:alpha', kind: 'connected' },
    { name: 'kimi-project', kind: 'trust' },
    { name: 'beta', kind: 'unreachable', scope: 'project' },
    { name: 'gamma', kind: 'connected' },
  ];
  assert.deepEqual(rows.map(Model.hostMcpScope), ['user', 'plugin', 'project', 'project', 'user']);
  const counts = Model.sessionMcpCounts({ status: 'ready', threadId: 's1', rows }, 's1');
  assert.equal(counts.count, 5);
  assert.equal(counts.listedNames, ['plugin:acme:alpha', 'beta', 'gamma', 'kimi-project', 'zeta'].join('\n'), 'sorted by display name (alpha, beta, \u2026)');
  assert.equal(counts.listedStates, ['', 'failed', '', 'unavailable', 'needs-auth'].join('\n'));
  assert.equal(counts.listedTargets, ['plugin%3Aacme%3Aalpha', 'beta', 'gamma', 'kimi-project', 'zeta'].map((e) => `session:session-mcp%3A${e}`).join('\n'));
  assert.equal(counts.needReconnect, 2);
  assert.equal(counts.unavailable, 1);
  // O: user / local / managed are the user's own; a project server is not
  assert.equal(counts.reconnectOwnNames, 'zeta');
  assert.equal(counts.reconnectOwnShownNames, 'zeta');
  assert.equal(counts.reconnectOwnToolPrefixes, 'mcp__zeta__');
  assert.equal(counts.listedToolPrefixes.split('\n')[0], 'mcp__plugin_acme_alpha__');
  // x: a non-empty list where no server has a scope is not known yet (_J); host rows always get one
  assert.equal(Model.sessionMcpCounts({ status: 'ready', threadId: 's1', rows: [{ name: 'a', kind: 'connected', scope: '' }] }, 's1').count, 1, 'an empty scope falls back');
  assert.equal(Model.sessionMcpCounts({ status: 'ready', threadId: 's1', rows: [] }, 's1').count, 0);
  // TN: yj gets the targets (the generated rows are checked over Vite in session-rail-connectors-save-env); a row's
  // press reaches the opener with the grouped id (cf74bc599 NA)
  const opened = [];
  const seen = [];
  const card = Model.railConnectors(counts, (id) => opened.push(id), (args) => { seen.push(args); return []; }, String);
  assert.equal(seen[0].targets, counts.listedTargets);
  assert.equal(seen[0].labelOf, String);
  card.onOpen({ kind: 'session', id: 'session-mcp:beta' });
  assert.deepEqual(opened, ['session-mcp:beta']);
  // w11-sweep-ccres: main's opener turns the grouped id into that connector's Customize page (cc43287c9 iv `ev({rowId:
  // e})` selects the row in the session MCP dialog the host does not have); no id opens the list.
  pin(fs.readFileSync(path.join(ionSource, 'cc43287c9-Me-M2ucD.js'), 'utf8'), ['ev({rowId:e})', 'if(Q_)return t.setState({openSessionMcpDialog:iv})']);
  assert.equal(Model.sessionMcpSettingsPage('session-mcp:plugin:acme:alpha'), 'customize-connectors#plugin%3Aacme%3Aalpha');
  assert.equal(Model.sessionMcpSettingsPage('session-mcp:beta'), 'customize-connectors#beta');
  assert.equal(Model.sessionMcpSettingsPage(undefined), 'customize-connectors');
  assert.equal(Model.sessionMcpSettingsPage('session-mcp-held-back:x'), 'customize-connectors');
  assert.equal(Model.sessionMcpSettingsPage('session-mcp:'), 'customize-connectors');
});

test('customize "mcp": each listed server gets its CLI scope from the config layer, the core, a plugin or the fallback', async () => {
  const requests = [];
  const listed = [
    { name: 'from-user' }, { name: 'from-project' }, { name: 'reported', scope: 'local' }, { name: 'plugin:acme:x' },
    { name: 'by-id', pluginId: 'tools@market' }, { name: 'untrusted', codeDesktop: { trustRequired: true } }, { name: 'elsewhere' },
    { name: 'code_desktop' },
  ];
  const client = { start: async () => {}, request: async (method, params) => {
    requests.push({ method, params });
    if (method === 'config/read') return { config: {}, origins: {
      'mcp_servers.from-user.command': { name: { type: 'user' } }, 'mcp_servers.from-project.url': { name: { type: 'project' } } } };
    if (method === 'mcpServerStatus/list') return { data: listed, nextCursor: null };
    return {};
  } };
  const ops = createCustomizeOperations({ getClient: () => client, getConfig: () => ({ threadIds: ['t1'] }), knownCwd: (cwd) => { if (cwd !== '/repo') throw new Error('Unknown workspace directory.'); return cwd; } });
  const result = await ops.run({ operation: 'mcp', threadId: 't1', cwd: '/repo' });
  assert.deepEqual(result.data.map((server) => [server.name, server.scope]), [
    ['from-user', 'user'], ['from-project', 'project'], ['reported', 'local'], ['plugin:acme:x', 'plugin'], ['by-id', 'plugin'], ['untrusted', 'project'], ['elsewhere', 'user'],
  ]);
  assert.deepEqual(requests.map((r) => r.method), ['config/read', 'mcpServerStatus/list'], 'asked alongside, the listing last');
  assert.deepEqual(requests[0].params, { cwd: '/repo' });
  // an unknown cwd or a core that cannot answer config/read only loses the layer
  requests.length = 0;
  const failing = { ...client, request: async (method, params) => { requests.push({ method, params }); if (method === 'config/read') throw new Error('nope'); return client.request(method, params); } };
  const ops2 = createCustomizeOperations({ getClient: () => failing, getConfig: () => ({ threadIds: [] }), knownCwd: () => { throw new Error('Unknown workspace directory.'); } });
  const second = await ops2.run({ operation: 'mcp', cwd: '/elsewhere' });
  assert.equal(second.data.find((server) => server.name === 'from-user').scope, 'user');
  assert.equal(second.data.find((server) => server.name === 'from-project').scope, 'user');
  assert.deepEqual(requests[0], { method: 'config/read', params: {} });
  // a bridge core is not asked config/read
  requests.length = 0;
  const bridge = createCustomizeOperations({ getClient: () => ({ ...client, serverInfo: { engine: 'opencode', capabilities: {} } }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  const third = await bridge.run({ operation: 'mcp' });
  assert.deepEqual(requests.map((r) => r.method), ['mcpServerStatus/list']);
  assert.equal(third.data.find((server) => server.name === 'reported').scope, 'local');
  // w11-sweep-ccres: the other config layer types (hooks-model SOURCES) map to the CLI scopes c9081d688 `_` knows
  const layered = createCustomizeOperations({ getClient: () => ({ start: async () => {}, request: async (method) => method === 'config/read'
    ? { config: {}, origins: { 'mcp_servers.f.command': { name: { type: 'sessionFlags' } }, 'mcp_servers.s.url': { name: { type: 'system' } },
      'mcp_servers.m.command': { name: { type: 'mdm' } }, 'mcp_servers.c.command': { name: { type: 'cloudManagedConfig' } }, 'mcp_servers.u.command': { name: { type: 'somethingNew' } } } }
    : { data: ['f', 's', 'm', 'c', 'u'].map((name) => ({ name })), nextCursor: null } }), getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd });
  assert.deepEqual((await layered.run({ operation: 'mcp', cwd: '/repo' })).data.map((server) => [server.name, server.scope]),
    [['f', 'flag'], ['s', 'managed'], ['m', 'managed'], ['c', 'managed'], ['u', 'user']]);
  // w11-sweep-ccres: the scope reaches the rail model through the Customize store's rows (customize-model mcpRows), so a
  // project-layer server is not one of the user's own (c9081d688 O: D = user / local / managed).
  const rows = mcpRows(result).map((row) => ({ ...row, kind: 'signIn' }));
  assert.deepEqual(rows.map((row) => [row.name, row.scope]), [
    ['by-id', 'plugin'], ['elsewhere', 'user'], ['from-project', 'project'], ['from-user', 'user'], ['plugin:acme:x', 'plugin'], ['reported', 'local'], ['untrusted', 'project'],
  ]);
  assert.equal('scope' in mcpRows({ data: [{ name: 'plain' }] })[0], false, 'a server without a scope keeps the old row shape');
  const counts = Model.sessionMcpCounts({ status: 'ready', threadId: 't1', rows }, 't1');
  assert.deepEqual(counts.reconnectOwnNames.split('\n').sort(), ['elsewhere', 'from-user', 'reported']);
});
