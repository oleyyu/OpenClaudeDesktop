// w13-chatfn-context: agent tool modules for one product surface (agent-tools-host.cjs `export const surfaces`), with
// the app's sessionSurface service (chat-context.mjs sessionSurfaceResolver, provided by main.cjs). A Code session never
// lists or calls a Chat-only tool; a module that doesn't say keeps every surface.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { applyChatContext, sessionSurfaceResolver } from '../electron/chat-context.mjs';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;
const AGENT_SESSION_KEY = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION';

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  return { child, request, close: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }) };
}

const tool = (name) => ({ name, description: name, inputSchema: { type: 'object', properties: {} }, handler: async (args, ctx) => `${name} for ${ctx.sessionId} (${ctx.sessionSurface ?? 'none'})` });
const MODULES = [
  { group: 'everywhere', tools: [tool('everywhere_tool')] },
  { group: 'chat', surfaces: ['chat'], tools: [tool('chat_tool')] },
  { group: 'knowledge', surfaces: ['chat', 'cowork'], tools: [tool('knowledge_tool')] },
  { group: 'code', surfaces: ['code'], tools: [tool('code_tool')] },
  { group: 'nowhere', surfaces: ['bogus'], tools: [tool('nowhere_tool')] },
  { group: 'deferred-chat', surfaces: ['chat'], tools: [tool('deferred_chat_tool')] },
];
const SESSIONS = { 'thread-chat': '/w/chat', 'thread-code': '/w/code', 'thread-old': '/w/old', 'thread-new': '/w/new' };

function makeHost({ provide = true, deferred = [] } = {}) {
  const config = { sessionMetadata: { 'thread-chat': { surface: 'chat' }, 'thread-code': { surface: 'code' }, 'thread-old': {} } };
  const host = createAgentToolsHost({
    modules: MODULES, tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-surfaces-')), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(SESSIONS, key ?? '') ? { id: key, cwd: SESSIONS[key] } : null; },
    deferredGroups: () => deferred,
  });
  if (provide) host.provide('sessionSurface', sessionSurfaceResolver(() => config));
  return { host, config };
}
const names = (list) => list.map((entry) => entry.name);
async function served(host, session, t) {
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: session });
  t.after(() => server.child.kill());
  await server.request('initialize', {});
  return server;
}

test('tools/list: a Code session (and an old session without a surface) never sees a Chat-only tool; a Chat session does', async (t) => {
  const { host } = makeHost();
  await host.start();
  t.after(() => host.stop());
  const expected = {
    'thread-chat': ['everywhere_tool', 'chat_tool', 'knowledge_tool', 'deferred_chat_tool'],
    'thread-code': ['everywhere_tool', 'code_tool'],
    'thread-old': ['everywhere_tool', 'code_tool'],
    'thread-unknown': ['everywhere_tool', 'code_tool'],
  };
  for (const [session, tools] of Object.entries(expected)) {
    const server = await served(host, session, t);
    const list = await server.request('tools/list', {});
    assert.deepEqual(names(list.result.tools), tools, session);
    await server.close();
  }
  // The app's own read of the list (no connection) still shows every tool, as before.
  assert.deepEqual(names(host.listTools()), ['everywhere_tool', 'chat_tool', 'knowledge_tool', 'code_tool', 'nowhere_tool', 'deferred_chat_tool']);
  // context-breakdown (sessionToolLists) follows the session's surface too.
  assert.deepEqual(names(host.sessionToolLists('thread-code').tools), ['everywhere_tool', 'code_tool']);
  assert.deepEqual(names(host.sessionToolLists('thread-chat').tools), expected['thread-chat']);
});

test('tools/call: a Code session calling a Chat-only tool is refused, whatever list its core holds; Chat calls run', async (t) => {
  const { host } = makeHost();
  await host.start();
  t.after(() => host.stop());
  const code = await served(host, 'thread-code', t);
  const refused = await code.request('tools/call', { name: 'chat_tool', arguments: {} });
  assert.equal(refused.result.isError, true);
  assert.match(refused.result.content[0].text, /^chat_tool isn’t available in this session\.$/);
  const allowed = await code.request('tools/call', { name: 'everywhere_tool', arguments: {} });
  assert.equal(allowed.result.content[0].text, 'everywhere_tool for thread-code (code)', 'ctx.sessionSurface is the service too');
  await code.close();
  const chat = await served(host, 'thread-chat', t);
  assert.equal((await chat.request('tools/call', { name: 'chat_tool', arguments: {} })).result.content[0].text, 'chat_tool for thread-chat (chat)');
  assert.equal((await chat.request('tools/call', { name: 'code_tool', arguments: {} })).result.isError, true);
  assert.equal((await chat.request('tools/call', { name: 'nowhere_tool', arguments: {} })).result.isError, true);
  await chat.close();
  // A server with no identity (the channel's secret): Codex names the calling thread (_meta.threadId); its surface decides.
  const shared = await served(host, '', t);
  assert.equal((await shared.request('tools/call', { name: 'chat_tool', arguments: {}, _meta: { threadId: 'thread-code' } })).result.isError, true);
  assert.equal((await shared.request('tools/call', { name: 'chat_tool', arguments: {}, _meta: { threadId: 'thread-chat' } })).result.content[0].text, 'chat_tool for thread-chat (chat)');
  assert.deepEqual(names((await shared.request('tools/list', {})).result.tools), ['everywhere_tool', 'code_tool'], 'no identity: listed as code');
  await shared.close();
});

test('a Chat thread/start: its start token is listed the Chat tools before the core answers, and keeps them once bound', async (t) => {
  const { host, config } = makeHost();
  await host.start();
  t.after(() => host.stop());
  // main.cjs order: applyChatContext (after applyProjectContext), then decorateAgentTools names the start token.
  const params = { cwd: '/w/new' };
  await applyChatContext(config, 'thread/start', params, 'chat', { contributors: [] });
  const identity = host.sessionIdentity(null);
  params.config = { ...params.config, [AGENT_SESSION_KEY]: identity };
  const before = await served(host, identity, t);
  assert.deepEqual(names((await before.request('tools/list', {})).result.tools), ['everywhere_tool', 'chat_tool', 'knowledge_tool', 'deferred_chat_tool']);
  // The core answers: the token is bound to the thread before main writes sessionMetadata (an await lies between).
  host.bindThread(identity, 'thread-new');
  assert.deepEqual(names((await before.request('tools/list', {})).result.tools), ['everywhere_tool', 'chat_tool', 'knowledge_tool', 'deferred_chat_tool']);
  assert.equal((await before.request('tools/call', { name: 'chat_tool', arguments: {} })).result.content[0].text, 'chat_tool for thread-new (chat)');
  await before.close();
  // A Code thread/start is never remembered: its token is a Code session's.
  const codeParams = { cwd: '/w/new' };
  await applyChatContext(config, 'thread/start', codeParams, 'code', { contributors: [] });
  const codeIdentity = host.sessionIdentity(null);
  codeParams.config = { [AGENT_SESSION_KEY]: codeIdentity };
  const code = await served(host, codeIdentity, t);
  assert.deepEqual(names((await code.request('tools/list', {})).result.tools), ['everywhere_tool', 'code_tool']);
  await code.close();
});

test('deferred groups: load_tools never offers a Code session a Chat-only group', async (t) => {
  const { host } = makeHost({ deferred: ['deferred-chat', 'code'] });
  await host.start();
  t.after(() => host.stop());
  const code = await served(host, 'thread-code', t);
  const codeList = (await code.request('tools/list', {})).result.tools;
  assert.deepEqual(names(codeList), ['everywhere_tool', 'load_tools']);
  assert.deepEqual(codeList.at(-1).inputSchema.properties.groups.items.enum, ['code']);
  await code.close();
  const chat = await served(host, 'thread-chat', t);
  const chatList = (await chat.request('tools/list', {})).result.tools;
  assert.deepEqual(names(chatList), ['everywhere_tool', 'chat_tool', 'knowledge_tool', 'load_tools']);
  assert.deepEqual(chatList.at(-1).inputSchema.properties.groups.items.enum, ['deferred-chat']);
  await chat.close();
  assert.deepEqual(host.sessionToolLists('thread-code').deferred.map((entry) => entry.name), ['code_tool']);
  assert.deepEqual(host.sessionToolLists('thread-chat').deferred.map((entry) => entry.name), ['deferred_chat_tool']);
});

test('without the sessionSurface service every session is Code (a module without `surfaces` is unaffected)', async (t) => {
  const { host } = makeHost({ provide: false });
  await host.start();
  t.after(() => host.stop());
  const chat = await served(host, 'thread-chat', t);
  assert.deepEqual(names((await chat.request('tools/list', {})).result.tools), ['everywhere_tool', 'code_tool']);
  await chat.close();
});

test('the real tool modules: none is limited to a surface yet, so every session’s list is what it was', async () => {
  const dir = new URL('../electron/agent-tools/', import.meta.url).pathname;
  const host = createAgentToolsHost({ resolveSession: () => null, logger: { warn() {}, log() {} } });
  host.provide('sessionSurface', () => 'code');
  await host.ready();
  const codeList = names(host.sessionToolLists('thread-code').tools);
  const everything = names(host.listTools());
  const limited = [];
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.mjs'))) {
    const module = await import(new URL(file, `file://${dir}`).href);
    // w13 closeout: files.mjs is now ["chat", "code"] (Cowork hands files with present_files only), so a module limited
    // to surfaces that still include Code keeps its tools in a Code session's list.
    if (module.surfaces !== undefined && !module.surfaces.includes('code')) limited.push(...(module.tools ?? []).map((entry) => entry.name));
  }
  assert.deepEqual(codeList.filter((name) => name !== 'load_tools'), everything.filter((name) => !limited.includes(name)));
});
