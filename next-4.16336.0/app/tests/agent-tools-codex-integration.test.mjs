// Opt-in: the real Codex binary (0.155.1) runs OpenClaude Desktop's MCP server for the app's sessions, through the
// main-process path (codex.cjs setAgentToolsLaunch → CodexClient; the per-session identity on thread/start as
// main.cjs decorates it). Run with
//   CODEX_INTEGRATION=1 [CODEX_INTEGRATION_BINARY=~/.local/bin/codex] node --test tests/agent-tools-codex-integration.test.mjs
// Fresh HOME / CODEX_HOME / XDG_* under /private/tmp/claude-501 and a 127.0.0.1 dummy Responses endpoint: nothing signs
// in, nothing reaches the network, ~/.codex is never read or written.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const binary = process.env.CODEX_INTEGRATION_BINARY || path.join(os.homedir(), '.local/bin/codex');
const skip = process.env.CODEX_INTEGRATION !== '1' ? 'set CODEX_INTEGRATION=1 to run against the real Codex binary'
  : !fs.existsSync(binary) ? `no Codex binary at ${binary}` : false;
const TOOLS_DIR = new URL('../electron/agent-tools', import.meta.url).pathname;

// A model that calls code_desktop's preview_list once, then answers.
function dummyModel() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const json = body ? JSON.parse(body) : {};
      const input = JSON.stringify(json.input ?? []);
      const namespace = (json.tools || []).find((tool) => tool.type === 'namespace' && tool.name === 'mcp__code_desktop');
      requests.push({ url: req.url, namespaceTools: namespace ? (namespace.tools || []).map((tool) => tool.name) : null, input });
      if (req.method !== 'POST' || !req.url.endsWith('/responses')) { res.writeHead(404); res.end('{}'); return; }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const n = requests.length;
      const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      event('response.created', { response: { id: `r${n}`, object: 'response', status: 'in_progress', output: [] } });
      const item = namespace && !input.includes('function_call_output')
        ? { id: `fc${n}`, type: 'function_call', status: 'completed', name: 'preview_list', namespace: 'mcp__code_desktop', call_id: `call_${n}`, arguments: '{}' }
        : { id: `m${n}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'done', annotations: [] }] };
      event('response.output_item.added', { output_index: 0, item });
      event('response.output_item.done', { output_index: 0, item });
      event('response.completed', { response: { id: `r${n}`, object: 'response', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } } });
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, base: `http://127.0.0.1:${server.address().port}/v1` })));
}

test('Codex starts the code_desktop MCP server per session, lists its tools and calls them for that session', { skip, timeout: 180000 }, async (t) => {
  const tmp = '/private/tmp/claude-501';
  fs.mkdirSync(tmp, { recursive: true });
  const root = fs.mkdtempSync(path.join(tmp, 'codex-agent-tools-'));
  const work = path.join(root, 'work');
  for (const dir of ['home', 'codex', 'xdg/config', 'xdg/data', 'xdg/cache', 'xdg/state', 'work']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const keys = ['HOME', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'CODE_DESKTOP_CORE', 'CODEX_BINARY', 'CODE_DESKTOP_CORE_SYSTEM_PATHS', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'DUMMY_KEY'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { HOME: path.join(root, 'home'), CODEX_HOME: path.join(root, 'codex'), XDG_CONFIG_HOME: path.join(root, 'xdg/config'), XDG_DATA_HOME: path.join(root, 'xdg/data'),
    XDG_CACHE_HOME: path.join(root, 'xdg/cache'), XDG_STATE_HOME: path.join(root, 'xdg/state'), CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '', DUMMY_KEY: 'dummy' });
  for (const key of ['CODEX_BINARY', 'OPENAI_API_KEY', 'OPENAI_BASE_URL']) delete process.env[key];
  const { CodexClient, setCoreChoice, setCodexLaunch, setAgentToolsLaunch } = require('../electron/codex.cjs');
  const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
  const { server, requests, base } = await dummyModel();
  const threads = new Map();
  const calls = [];
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: tmp, command: process.execPath, runAsNode: false, logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => threads.get(id ?? meta.threadId) ?? null });
  host.provide('preview', (session) => ({ list: () => { calls.push(session.id); return { exists: false, launchFile: path.join(session.cwd, '.claude/launch.json'), servers: [], page: null, viewport: { preset: 'responsive' } }; } }));
  await host.start();
  setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
  setCodexLaunch({ args: ['-c', 'model_provider="dummy"', '-c', `model_providers.dummy={name="dummy",base_url="${base}",wire_api="responses",env_key="DUMMY_KEY"}`, '-c', 'model="dummy-model"'], env: {} });
  setAgentToolsLaunch(() => ({ env: host.launchEnv(), codexArgs: host.codexArgs() }));
  const client = new CodexClient({ serverCwd: work, initializeTimeout: 30000, shellProxy: () => ({}) });
  t.after(async () => {
    await client.stopAndWait().catch(() => {});
    setAgentToolsLaunch(null); setCodexLaunch(null); setCoreChoice({});
    host.stop(); server.close();
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    fs.rmSync(root, { recursive: true, force: true });
  });
  await client.start();
  assert.ok(client.child.spawnargs.some((arg) => arg.startsWith('mcp_servers.code_desktop.command=')), 'the -c overrides reach the Codex child');
  assert.ok(!client.child.spawnargs.join(' ').includes(host.launchEnv().CODE_DESKTOP_AGENT_TOOLS_TOKEN), 'the channel secret is not on the command line');

  // thread/start as main.cjs decorates it: a start identity, bound to the new thread.
  const identity = host.sessionIdentity(null);
  // As main.cjs decorates it for Codex: the thread's server gets the session's own credential, not the channel's secret.
  const started = await client.request('thread/start', { cwd: work, approvalPolicy: 'on-request', sandbox: 'workspace-write', config: { ...host.sessionConfig(identity), 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN': host.sessionToken(identity) } });
  const threadId = started.thread.id;
  threads.set(threadId, { id: threadId, cwd: work });
  host.bindThread(identity, threadId);

  let status = null;
  for (let i = 0; i < 40; i++) {
    status = (await client.request('mcpServerStatus/list', { threadId })).data.find((entry) => entry.name === 'code_desktop');
    if (status?.runtimeStatus === 'connected' && Object.keys(status.tools).length) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(status?.runtimeStatus, 'connected', JSON.stringify(status));
  for (const name of ['preview_start', 'preview_list', 'screenshot', 'read_page', 'click', 'resize_window', 'list_terminal_tabs']) assert.ok(status.tools[name], `${name} is listed`);

  // A client-side call and a model-side call both act on this session, without Codex's MCP approval prompt.
  const direct = await client.request('mcpServer/tool/call', { threadId, server: 'code_desktop', tool: 'preview_list', arguments: {} });
  assert.match(direct.content[0].text, /No dev servers are configured/);
  const serverRequests = [];
  client.on('event', (event) => { if (event.kind !== 'notification' && event.method) serverRequests.push(event.method); });
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('turn/completed did not arrive')), 60000);
    client.on('event', (event) => { if (event.method === 'turn/completed' && event.params?.threadId === threadId) { clearTimeout(timer); resolve(event.params); } });
  });
  const items = [];
  client.on('event', (event) => { if (event.method === 'item/completed' && event.params?.item?.type === 'mcpToolCall') items.push(event.params.item); });
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'list previews', text_elements: [] }] });
  const completed = await done;
  assert.equal(completed.turn?.status, 'completed', JSON.stringify(completed).slice(0, 400));
  assert.ok(requests.some((request) => request.namespaceTools?.includes('preview_list')), 'the model saw mcp__code_desktop tools');
  assert.equal(items.length, 1, JSON.stringify(items));
  assert.equal(items[0].server, 'code_desktop');
  assert.equal(items[0].tool, 'preview_list');
  assert.equal(items[0].status, 'completed');
  assert.match(items[0].result.content[0].text, /No dev servers are configured/);
  assert.deepEqual(calls, [threadId, threadId], 'both calls resolved to this session');
  assert.ok(!serverRequests.includes('mcpServer/elicitation/request'), 'no MCP approval prompt for the app’s tools');
});
