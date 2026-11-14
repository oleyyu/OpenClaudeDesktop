// The agent tools channel: agent-tools-server.mjs (the stdio MCP server a core runs) talking to
// agent-tools-host.cjs (the main process side) over its private socket, with fake tool modules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost, toolResult } = require('../electron/agent-tools-host.cjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map(), notes = [];
  let seq = 0;
  lines.on('line', (line) => {
    const message = JSON.parse(line);
    if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    else if (message.method) notes.push(message);
  });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  return { child, request, notify, notes, close: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }) };
}

const sessions = { 'thread-a': '/work/a', 'thread-b': '/work/b' };
function makeHost(extra = {}) {
  const seen = [];
  const modules = [
    { group: 'demo', tools: [
      { name: 'whoami', description: 'Who am I', inputSchema: { type: 'object', properties: {} }, handler: async (args, ctx) => { seen.push(ctx); return `session ${ctx.sessionId} in ${ctx.cwd}`; } },
      { name: 'picture', description: 'An image', inputSchema: { type: 'object', properties: {} }, handler: async () => ({ image: { data: 'iVBORw0KGgo=', mimeType: 'image/png' }, text: 'shot' }) },
      { name: 'broken', description: 'Throws', inputSchema: { type: 'object', properties: {} }, handler: async () => { throw new Error('nope'); } },
      { name: 'uses-service', description: 'Reads a service', inputSchema: { type: 'object', properties: {} }, handler: async (args, ctx) => ({ value: ctx.thing.value }) },
      { name: 'bad name!', description: 'Invalid', handler: async () => 'x' },
    ] },
    { group: 'off', tools: [{ name: 'hidden', description: 'Turned off', inputSchema: { type: 'object' }, handler: async () => 'should not run' }] },
  ];
  const host = createAgentToolsHost({
    modules, tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-test-')),
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    isGroupEnabled: (group) => group !== 'off', logger: { warn() {}, log() {} }, ...extra,
  });
  host.provide('thing', (session) => ({ value: `thing for ${session.id}` }));
  return { host, seen };
}

test('toolResult normalizes handler values into MCP results', () => {
  assert.deepEqual(toolResult('hi'), { content: [{ type: 'text', text: 'hi' }] });
  assert.deepEqual(toolResult({ image: { data: 'AA==', mimeType: 'image/jpeg' } }), { content: [{ type: 'image', data: 'AA==', mimeType: 'image/jpeg' }] });
  assert.deepEqual(toolResult({ content: [{ type: 'text', text: 'x' }, null], isError: true }), { content: [{ type: 'text', text: 'x' }], isError: true });
  assert.equal(toolResult({ a: 1 }).content[0].text, '{\n  "a": 1\n}');
  assert.equal(toolResult(undefined).content[0].text, 'Done.');
});

test('the stdio server lists and calls the main process tools for its own session', async (t) => {
  const { host, seen } = makeHost();
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  t.after(() => server.child.kill());
  const init = await server.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.protocolVersion, '2025-06-18');
  assert.deepEqual(init.result.capabilities, { tools: { listChanged: true } });
  server.notify('notifications/initialized');
  const listed = await server.request('tools/list', {});
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ['whoami', 'picture', 'broken', 'uses-service'], 'invalid names and turned-off groups are not listed');
  assert.equal(listed.result.tools[0].inputSchema.type, 'object');
  const who = await server.request('tools/call', { name: 'whoami', arguments: {} });
  assert.deepEqual(who.result, { content: [{ type: 'text', text: 'session thread-a in /work/a' }] });
  assert.equal(typeof seen[0].requestApproval, 'function');
  const picture = await server.request('tools/call', { name: 'picture', arguments: {} });
  assert.deepEqual(picture.result.content, [{ type: 'text', text: 'shot' }, { type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }]);
  const broken = await server.request('tools/call', { name: 'broken', arguments: {} });
  assert.deepEqual(broken.result, { content: [{ type: 'text', text: 'nope' }], isError: true });
  const service = await server.request('tools/call', { name: 'uses-service', arguments: {} });
  assert.match(service.result.content[0].text, /thing for thread-a/);
  const hidden = await server.request('tools/call', { name: 'hidden', arguments: {} });
  assert.equal(hidden.result.isError, true);
  assert.match(hidden.result.content[0].text, /turned off/);
  const unknown = await server.request('nope/method', {});
  assert.equal(unknown.error.code, -32601);
  assert.deepEqual((await server.request('ping', {})).result, {});
  host.notifyListChanged();
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.ok(server.notes.some((note) => note.method === 'notifications/tools/list_changed'));
  await server.close();
});

test('a start token resolves once bound; _meta.threadId is the fallback; no session refuses', async (t) => {
  const { host } = makeHost();
  await host.start();
  t.after(() => host.stop());
  const token = host.sessionIdentity(null);
  assert.match(token, /^start-/);
  assert.equal(host.sessionIdentity('thread-b'), 'thread-b');
  assert.deepEqual(host.sessionConfig(token), { 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': token });
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: token });
  t.after(() => server.child.kill());
  await server.request('initialize', { protocolVersion: '2024-11-05' });
  const before = await server.request('tools/call', { name: 'whoami', arguments: {} });
  assert.equal(before.result.isError, true, 'an unbound start token names no session');
  host.bindThread(token, 'thread-b');
  const after = await server.request('tools/call', { name: 'whoami', arguments: {} });
  assert.equal(after.result.content[0].text, 'session thread-b in /work/b');
  await server.close();

  const metaOnly = mcp({ ...host.launchEnv() });
  t.after(() => metaOnly.child.kill());
  await metaOnly.request('initialize', {});
  const viaMeta = await metaOnly.request('tools/call', { name: 'whoami', arguments: {}, _meta: { threadId: 'thread-a' } });
  assert.equal(viaMeta.result.content[0].text, 'session thread-a in /work/a');
  const none = await metaOnly.request('tools/call', { name: 'whoami', arguments: {} });
  assert.equal(none.result.isError, true);
  await metaOnly.close();
});

test('the channel refuses a wrong token and the server degrades without it', async (t) => {
  const { host } = makeHost();
  const { socketPath } = await host.start();
  t.after(() => host.stop());
  assert.equal((fs.statSync(path.dirname(socketPath)).mode & 0o777), 0o700);
  const closed = await new Promise((resolve) => {
    const socket = net.createConnection(socketPath, () => socket.write(JSON.stringify({ type: 'hello', token: 'wrong', session: 'thread-a' }) + '\n'));
    let data = '';
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('close', () => resolve(data));
    socket.on('error', () => {});
  });
  assert.equal(closed, '', 'nothing is answered before a valid hello');
  const orphan = mcp({ CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  t.after(() => orphan.child.kill());
  await orphan.request('initialize', {});
  assert.deepEqual((await orphan.request('tools/list', {})).result, { tools: [] });
  const call = await orphan.request('tools/call', { name: 'whoami', arguments: {} });
  assert.equal(call.result.isError, true);
  await orphan.close();
});

test('codexArgs and launchEnv describe the server without exposing the secret on the command line', async (t) => {
  const { host } = makeHost({ command: '/Applications/OpenClaude Desktop.app/Contents/MacOS/OpenClaude Desktop', runAsNode: true, serverScript: '/x/agent-tools-server.mjs' });
  assert.deepEqual(host.codexArgs(), [], 'nothing before the channel exists');
  await host.start();
  t.after(() => host.stop());
  const args = host.codexArgs();
  const values = args.filter((_, index) => index % 2 === 1);
  assert.ok(args.filter((_, index) => index % 2 === 0).every((flag) => flag === '-c'));
  assert.ok(values.includes('mcp_servers.code_desktop.command="/Applications/OpenClaude Desktop.app/Contents/MacOS/OpenClaude Desktop"'));
  assert.ok(values.includes('mcp_servers.code_desktop.args=["/x/agent-tools-server.mjs"]'));
  assert.ok(values.includes('mcp_servers.code_desktop.env.ELECTRON_RUN_AS_NODE="1"'));
  assert.ok(values.includes('mcp_servers.code_desktop.env_vars=["CODE_DESKTOP_AGENT_TOOLS_SOCKET","CODE_DESKTOP_AGENT_TOOLS_TOKEN"]'));
  const env = host.launchEnv();
  assert.ok(!args.join(' ').includes(env.CODE_DESKTOP_AGENT_TOOLS_TOKEN), 'the token travels in the environment only');
  const { instructions, ...definition } = JSON.parse(env.CODE_DESKTOP_AGENT_TOOLS_SERVER);
  assert.deepEqual(definition, { name: 'code_desktop', command: '/Applications/OpenClaude Desktop.app/Contents/MacOS/OpenClaude Desktop', args: ['/x/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } });
  // The server's instructions travel with the definition, for bridges whose agent never shows them to the model (ZCode).
  assert.match(instructions, /Verifying changes in the preview/);
  // …and say how to start a workflow (behind load_tools on a deferring core) and which tool delegates to a sub-agent.
  assert.match(instructions, /load_tools with \{"groups": \["workflow"\]\}/);
  assert.match(instructions, /your own sub-agent tool/);
  assert.throws(() => host.provide('sessionId', () => 1), /Invalid service name/);
});

test('recentImages keeps the image a session’s latest call of a tool returned (cores that report only a placeholder)', async () => {
  const shot = { name: 'shot', description: 'An image.', handler: async () => ({ image: { data: 'iVBOR', mimeType: 'image/png' }, text: 'shot' }) };
  const plain = { name: 'plain', description: 'Text.', handler: async () => 'no image' };
  const host = createAgentToolsHost({ resolveSession: (named) => (named ? { id: named, cwd: '/w' } : null), modules: [{ group: 'preview', tools: [shot, plain] }], logger: { warn() {}, log() {} } });
  await host.ready();
  assert.equal(host.recentImages('t1', 'shot'), null);
  await host.call('t1', { name: 'shot', arguments: {} });
  assert.deepEqual(host.recentImages('t1', 'shot'), [{ type: 'image', data: 'iVBOR', mimeType: 'image/png' }]);
  assert.equal(host.recentImages('t2', 'shot'), null, 'another session never gets it');
  await host.call('t1', { name: 'plain', arguments: {} });
  assert.equal(host.recentImages('t1', 'plain'), null);
});

test('a session\'s own credential: accepted only for the session it names, and its calls never act for another', async (t) => {
  const { sessionTokenFor } = require('../electron/agent-tools-host.cjs');
  const { host } = makeHost();
  await host.start();
  t.after(() => host.stop());
  const env = host.launchEnv();
  assert.equal(host.sessionToken('thread-a'), sessionTokenFor(env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, 'thread-a'));
  // The bridges compute the same value (harness app-tools.js sessionToken).
  const { sessionToken } = await import('../../harness/packages/acp-bridge/src/app-tools.js');
  assert.equal(sessionToken(env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, 'thread-a'), host.sessionToken('thread-a'));
  const scoped = mcp({ ...env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: host.sessionToken('thread-a'), CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  t.after(() => scoped.child.kill());
  await scoped.request('initialize', {});
  assert.equal((await scoped.request('tools/call', { name: 'whoami', arguments: {} })).result.content[0].text, 'session thread-a in /work/a');
  // Another session's name with thread-a's credential: refused at the hello, so nothing is served.
  const forged = mcp({ ...env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: host.sessionToken('thread-a'), CODE_DESKTOP_AGENT_SESSION: 'thread-b' });
  t.after(() => forged.child.kill());
  await forged.request('initialize', {});
  assert.equal((await forged.request('tools/call', { name: 'whoami', arguments: {} })).result.isError, true);
  await forged.close();
  // A scoped connection's per-call session and _meta.threadId are ignored.
  const direct = await host.call('thread-a', { name: 'whoami', arguments: {}, meta: { session: 'thread-b', threadId: 'thread-b' } }, undefined, { scoped: true });
  assert.equal(direct.content[0].text, 'session thread-a in /work/a');
  await assert.rejects(host.call(null, { name: 'whoami', arguments: {}, meta: { session: 'thread-b', threadId: 'thread-b' } }, undefined, { scoped: true }), /only in an OpenClaude Desktop session/);
  await scoped.close();
});

test('a core that cannot defer tools gets the deferred groups through load_tools, per connection', async (t) => {
  const { host } = makeHost({ deferredGroups: () => ['demo'] });
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  t.after(() => server.child.kill());
  await server.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  server.notify('notifications/initialized');
  const first = await server.request('tools/list', {});
  assert.deepEqual(first.result.tools.map((tool) => tool.name), ['load_tools'], 'only the loader while the group waits');
  assert.match(first.result.tools[0].description, /- demo: /);
  assert.deepEqual(first.result.tools[0].inputSchema.properties.groups.items.enum, ['demo']);
  const startedAt = Date.now();
  let answeredAt = 0;
  const loading = server.request('tools/call', { name: 'load_tools', arguments: { groups: ['demo'] } }).then((reply) => { answeredAt = Date.now(); return reply; });
  for (let i = 0; i < 50 && !server.notes.some((note) => note.method === 'notifications/tools/list_changed'); i++) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(server.notes.some((note) => note.method === 'notifications/tools/list_changed'), 'the core is told to list again');
  assert.equal(answeredAt, 0, 'load_tools answers only once the core has read the new list');
  // The core re-lists in its list_changed handler (as OpenCode does), and only then gets load_tools' result.
  const second = await server.request('tools/list', {});
  const listedAt = Date.now();
  const loaded = await loading;
  assert.match(loaded.result.content[0].text, /^Loaded demo: whoami, picture, broken, uses-service\./);
  assert.ok(answeredAt >= listedAt, 'the result follows the list');
  assert.ok(answeredAt - startedAt < 1500, 'and does not wait for the timeout once the list was read');
  assert.deepEqual(second.result.tools.map((tool) => tool.name), ['whoami', 'picture', 'broken', 'uses-service'], 'loaded, and no loader left');
  assert.deepEqual(host.listTools().map((tool) => tool.name), ['whoami', 'picture', 'broken', 'uses-service'], 'without a connection: every tool');
  const again = await server.request('tools/call', { name: 'load_tools', arguments: { groups: ['demo'] } });
  assert.match(again.result.content[0].text, /^Already loaded: demo\./);
});

test('load_tools answers after a timeout when the core never lists again, and a restarted server keeps the loaded groups', async (t) => {
  const { host } = makeHost({ deferredGroups: () => ['demo'] });
  await host.start();
  t.after(() => host.stop());
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-folder-'));
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-folder-'));
  t.after(() => { for (const dir of [cwd, other]) fs.rmSync(dir, { recursive: true, force: true }); });
  const inFolder = (folder) => {
    const child = spawn(process.execPath, [SERVER], { cwd: folder, env: { PATH: process.env.PATH, ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' }, stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = readline.createInterface({ input: child.stdout });
    const pending = new Map();
    let seq = 0;
    lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
    const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
    return { child, request, close: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }) };
  };
  const first = inFolder(cwd);
  t.after(() => first.child.kill());
  await first.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  const before = Date.now();
  const loaded = await first.request('tools/call', { name: 'load_tools', arguments: { groups: ['demo'] } });
  assert.match(loaded.result.content[0].text, /^Loaded demo/);
  assert.ok(Date.now() - before >= 1500, 'a core that never re-lists still gets the result, after the wait');
  await first.close();
  // The core restarts the server (same session, same folder): the groups the model loaded are still listed.
  const second = inFolder(cwd);
  t.after(() => second.child.kill());
  await second.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  const listed = await second.request('tools/list', {});
  assert.deepEqual(listed.result.tools.map((tool) => tool.name), ['whoami', 'picture', 'broken', 'uses-service']);
  await second.close();
  // Another folder's server starts with nothing loaded.
  const elsewhere = inFolder(other);
  t.after(() => elsewhere.child.kill());
  await elsewhere.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  const fresh = await elsewhere.request('tools/list', {});
  assert.deepEqual(fresh.result.tools.map((tool) => tool.name), ['load_tools']);
  await elsewhere.close();
});
