// Round-2 fixes in the main process: app-tool cards end with their turn, the hidden Codex threads (title, /side)
// get no MCP server or only the parent's read-only app tools, a model-written session argument never steers a Codex
// thread's server, WebFetch follows the session's own web search, a Bypass the user left no longer reaches background
// turns, and the preview's file:// rule follows symlinks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createLiveWork } = require('../electron/quit-guard.cjs');
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createNativeSideChat } = require('../electron/native-side-chat.cjs');
const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
const { backgroundTurnPermission } = await import('../electron/permission-policy.mjs');
const { insideFolderReal, navigationAllowed } = await import('../electron/preview-launch.mjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  return { child, request, close: () => new Promise((resolve) => { child.once('exit', resolve); child.stdin.end(); }) };
}

test('live work: the running turn id of a thread, for the app\'s own approval cards (expireTurn)', () => {
  const live = createLiveWork({ getConfig: () => ({ threadIds: ['t1'] }) });
  assert.equal(live.turnOf('t1'), null);
  live.observe({ method: 'turn/started', params: { threadId: 't1', turn: { id: 'turn-7' } } });
  assert.equal(live.turnOf('t1'), 'turn-7');
  live.observe({ method: 'turn/completed', params: { threadId: 't1', turn: { id: 'turn-7', status: 'completed' } } });
  assert.equal(live.turnOf('t1'), null);
});

test('a Codex thread\'s server never acts for a session a tool argument names; a shared server still does', async (t) => {
  const sessions = { 'thread-a': '/work/a', 'thread-b': '/work/b' };
  const listedFor = [];
  const host = createAgentToolsHost({
    modules: [{ group: 'demo', tools: [
      { name: 'whoami', description: 'Who am I', inputSchema: { type: 'object', properties: {} }, handler: async (args, ctx) => `session ${ctx.sessionId}` },
      { name: 'fetchy', description: 'Stands in for WebFetch', native: 'WebFetch', inputSchema: { type: 'object', properties: {} }, handler: async () => 'fetched' },
    ] }],
    tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-scope-')), logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => { const key = id ?? meta.threadId; return Object.hasOwn(sessions, key ?? '') ? { id: key, cwd: sessions[key] } : null; },
    // WebFetch per server session: served to thread-b's server only.
    isToolListed: (tool, server) => { listedFor.push(server?.session ?? null); return tool.native !== 'WebFetch' || server?.session === 'thread-b'; },
  });
  await host.start();
  t.after(() => host.stop());
  // An undecorated Codex thread (the master secret, no identity): _meta.threadId names its own thread, and a model-written
  // __code_desktop_session never wins over it.
  const codex = mcp({ ...host.launchEnv() });
  t.after(() => codex.child.kill());
  await codex.request('initialize', {});
  const steered = await codex.request('tools/call', { name: 'whoami', arguments: { __code_desktop_session: 'thread-b' }, _meta: { threadId: 'fork-unknown' } });
  assert.equal(steered.result.isError, true, 'the fork is no session, and thread-b is not reachable through an argument');
  const own = await codex.request('tools/call', { name: 'whoami', arguments: { __code_desktop_session: 'thread-b' }, _meta: { threadId: 'thread-a' } });
  assert.equal(own.result.content[0].text, 'session thread-a');
  // A shared server (OpenCode: one per folder, no _meta.threadId) names the session per call.
  const shared = await codex.request('tools/call', { name: 'whoami', arguments: { __code_desktop_session: 'thread-b' } });
  assert.equal(shared.result.content[0].text, 'session thread-b');
  await codex.close();
  // The tool list asks per server: thread-b's server gets the WebFetch stand-in, thread-a's doesn't.
  for (const [session, expected] of [['thread-a', false], ['thread-b', true]]) {
    const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: session, CODE_DESKTOP_AGENT_TOOLS_TOKEN: host.sessionToken(session) });
    await server.request('initialize', {});
    const list = await server.request('tools/list', {});
    assert.equal(list.result.tools.some((tool) => tool.name === 'fetchy'), expected, session);
    const call = await server.request('tools/call', { name: 'fetchy', arguments: {} });
    assert.equal(call.result.isError === true, !expected, session);
    await server.close();
  }
  assert.ok(listedFor.includes('thread-a') && listedFor.includes('thread-b'));
});

test('agent-tool calls of a session are cancelled when its turn ends, however it ended (Codex tool_timeout_sec)', async (t) => {
  let release;
  const host = createAgentToolsHost({
    modules: [{ group: 'demo', tools: [{ name: 'wait', description: 'Waits for a yes', inputSchema: { type: 'object', properties: {} },
      handler: (args, ctx) => new Promise((resolve) => { release = () => resolve('ran'); ctx.signal.addEventListener('abort', () => resolve(`aborted: ${ctx.signal.reason?.message}`)); }) }] }],
    tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-scope-')), logger: { warn() {}, log() {} },
    resolveSession: (id) => id === 'thread-a' ? { id, cwd: '/work/a' } : null,
  });
  await host.start();
  t.after(() => host.stop());
  const pending = host.call('thread-a', { name: 'wait', arguments: {} }, undefined);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(host.cancelSession('thread-a', 'The turn ended.'), 1);
  release?.();
  assert.equal((await pending).content[0].text, 'aborted: The turn ended.');
});

test('/side: the fork is decorated by main (the parent\'s app tools, its own credential, read-only tools only)', async () => {
  const calls = [];
  const client = { async request(method, params) { calls.push({ method, params }); if (method === 'thread/fork') return { thread: { id: 'fork-1', ephemeral: true } }; if (method === 'turn/start') return { turn: { id: 'turn-1', status: 'inProgress' } }; return {}; } };
  const side = createNativeSideChat({ getClient: () => client, emit() {}, settings: () => ({ effort: 'high' }),
    decorateFork: (params, parentId) => ({ ...params, config: { ...params.config, 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': parentId, 'mcp_servers.code_desktop.enabled_tools': ['read_terminal'] } }) });
  const answer = side.ask({ threadId: 'main', question: 'what did the dev server print?', history: [], requestId: 'r1' });
  await new Promise((resolve) => setImmediate(resolve));
  const fork = calls.find((call) => call.method === 'thread/fork').params;
  assert.deepEqual(fork.config, { model_reasoning_effort: 'high', 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': 'main', 'mcp_servers.code_desktop.enabled_tools': ['read_terminal'] });
  side.observe({ method: 'turn/completed', params: { threadId: 'fork-1', turn: { id: 'turn-1', status: 'completed' } } });
  await answer;
  // A decorator that throws leaves the fork undecorated (its app tools then refuse) rather than failing the question.
  const broken = createNativeSideChat({ getClient: () => client, emit() {}, decorateFork: () => { throw new Error('x'); } });
  const second = broken.ask({ threadId: 'other', question: 'q', history: [], requestId: 'r2' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.filter((call) => call.method === 'thread/fork').length, 2);
  broken.observe({ method: 'turn/completed', params: { threadId: 'fork-1', turn: { id: 'turn-1', status: 'completed' } } });
  await second;
});

test('background turns: a recorded Bypass runs as Auto once Bypass is no longer the Mode or its opt-in is off', () => {
  const recorded = { threadId: 't1', cwd: '/work/a', model: 'm', approvalPolicy: 'never', approvalsReviewer: 'user', sandboxPolicy: { type: 'dangerFullAccess' }, input: [] };
  assert.equal(backgroundTurnPermission(recorded, { bypassAllowed: true }), recorded, 'still Bypass: unchanged');
  const down = backgroundTurnPermission(recorded, { bypassAllowed: false, networkAccess: true });
  assert.notEqual(down, recorded);
  assert.equal(recorded.sandboxPolicy.type, 'dangerFullAccess', 'the recorded options are not changed');
  assert.equal(down.approvalPolicy, 'on-request');
  assert.deepEqual(down.sandboxPolicy, { type: 'workspaceWrite', writableRoots: ['/work/a'], networkAccess: true, excludeTmpdirEnvVar: false, excludeSlashTmp: false });
  const hinted = backgroundTurnPermission({ ...recorded, codeDesktop: { permissionMode: 'bypass', afterPlan: 'auto', tools: null } }, { bypassAllowed: false });
  assert.deepEqual(hinted.codeDesktop, { permissionMode: 'auto', afterPlan: 'auto', tools: null });
  const auto = { ...recorded, approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: ['/work/a'] } };
  assert.equal(backgroundTurnPermission(auto, { bypassAllowed: false }), auto, 'other modes are never touched');
});

test('sessionAccess: a recorded Bypass gives danger-full-access only while Bypass is still allowed', async () => {
  let allowed = true;
  const service = createWorkflowToolService({ workflowService: { orphans: async () => [] }, getConfig: () => ({ threadIds: ['t1'] }), updateConfig() {}, settings: () => ({ enabled: false }),
    dataRoot: os.tmpdir(), home: os.tmpdir(), requestApproval: async () => false, startTurn: async () => {}, bypassAllowed: () => allowed });
  await service.turnStart({ threadId: 't1', input: [], sandboxPolicy: { type: 'dangerFullAccess' }, approvalPolicy: 'never' }, { permission: 'bypass', mode: 'code' });
  assert.equal(await service.sessionAccess('t1'), 'danger-full-access');
  allowed = false;
  assert.equal(await service.sessionAccess('t1'), 'workspace-write', 'the user left Bypass: the app tools ask again');
});

test('preview file:// follows symlinks: a link in the folder to a file outside is refused', (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'preview-sym-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'proj'), secret = path.join(root, 'secret');
  fs.mkdirSync(path.join(project, 'dist'), { recursive: true }); fs.mkdirSync(secret);
  fs.writeFileSync(path.join(secret, 'key.txt'), 'k'); fs.writeFileSync(path.join(project, 'dist', 'index.html'), '<p>');
  fs.symlinkSync(secret, path.join(project, 'link'));
  fs.symlinkSync(path.join(project, 'dist'), path.join(project, 'inner'));
  assert.equal(navigationAllowed(`file://${project}/dist/index.html`, project).ok, true);
  assert.equal(navigationAllowed(`file://${project}/inner/index.html`, project).ok, true, 'a link that stays inside is fine');
  assert.equal(navigationAllowed(`file://${project}/link/key.txt`, project).ok, false);
  assert.equal(navigationAllowed(`file://${project}/link/not-there.txt`, project).ok, false, 'a missing file under an outside link');
  assert.equal(insideFolderReal(project, path.join(project, 'link', 'key.txt')), false);
  assert.equal(insideFolderReal(project, path.join(project, 'new', 'file.html')), true, 'a file that does not exist yet');
  // The folder itself reached through a link (macOS /tmp → /private/tmp) still holds its files.
  const alias = path.join(root, 'alias');
  fs.symlinkSync(project, alias);
  assert.equal(insideFolderReal(alias, path.join(alias, 'dist', 'index.html')), true);
});
