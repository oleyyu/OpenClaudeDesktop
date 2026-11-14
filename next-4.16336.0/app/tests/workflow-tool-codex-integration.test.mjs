// Opt-in: the real Codex binary (0.155.1) lists OpenClaude Desktop's Workflow tool over the app's MCP server and a model call
// round-trips: the tool launches a background run on OpenClaude Desktop's engine (workflow-tool-service.cjs over the real
// workflow-service.cjs, the runner's core being the isolated app-server fixture), answers with Claude's launch text, and
// the finished run's <task-notification> reaches the model as a new turn on the same Codex thread. Run with
//   CODEX_INTEGRATION=1 [CODEX_INTEGRATION_BINARY=~/.local/bin/codex] node --test tests/workflow-tool-codex-integration.test.mjs
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
const FIXTURE = new URL('./fixtures/workflow-runner-server.cjs', import.meta.url).pathname;
const SCRIPT = 'export const meta={name:"codex-integration",description:"Integration workflow"};\nreturn await agent("FAST")';

// A model that calls code_desktop's Workflow once (with the inline script), then answers every later request.
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
      const item = namespace && !input.includes('function_call_output') && !input.includes('task-notification')
        ? { id: `fc${n}`, type: 'function_call', status: 'completed', name: 'Workflow', namespace: 'mcp__code_desktop', call_id: `call_${n}`, arguments: JSON.stringify({ script: SCRIPT }) }
        : { id: `m${n}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'done', annotations: [] }] };
      event('response.output_item.added', { output_index: 0, item });
      event('response.output_item.done', { output_index: 0, item });
      event('response.completed', { response: { id: `r${n}`, object: 'response', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } } });
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests, base: `http://127.0.0.1:${server.address().port}/v1` })));
}

test('Codex lists OpenClaude Desktop\'s Workflow tool; a model call launches a run and its notification comes back as a turn', { skip, timeout: 240000 }, async (t) => {
  const tmp = '/private/tmp/claude-501';
  fs.mkdirSync(tmp, { recursive: true });
  const root = fs.mkdtempSync(path.join(tmp, 'codex-workflow-tool-'));
  const work = path.join(root, 'work');
  for (const dir of ['home', 'codex', 'xdg/config', 'xdg/data', 'xdg/cache', 'xdg/state', 'work', 'runs', 'sessions']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  const keys = ['HOME', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_STATE_HOME', 'CODE_DESKTOP_CORE', 'CODEX_BINARY', 'CODE_DESKTOP_CORE_SYSTEM_PATHS', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'DUMMY_KEY'];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { HOME: path.join(root, 'home'), CODEX_HOME: path.join(root, 'codex'), XDG_CONFIG_HOME: path.join(root, 'xdg/config'), XDG_DATA_HOME: path.join(root, 'xdg/data'),
    XDG_CACHE_HOME: path.join(root, 'xdg/cache'), XDG_STATE_HOME: path.join(root, 'xdg/state'), CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '', DUMMY_KEY: 'dummy' });
  for (const key of ['CODEX_BINARY', 'OPENAI_API_KEY', 'OPENAI_BASE_URL']) delete process.env[key];
  const { CodexClient, setCoreChoice, setCodexLaunch, setAgentToolsLaunch } = require('../electron/codex.cjs');
  const { createAgentToolsHost } = require('../electron/agent-tools-host.cjs');
  const { createWorkflowService } = require('../electron/workflow-service.cjs');
  const { createWorkflowToolService } = require('../electron/workflow-tool-service.cjs');
  const { resolveWorkflowSettings } = await import('../electron/prefs/workflow-settings.mjs');
  const { server, requests, base } = await dummyModel();
  const threads = new Map();
  let config = { threadIds: [], cwd: work, model: 'dummy-model' };
  let client, toolService;
  const workflowService = createWorkflowService({ root: path.join(root, 'runs'), getConfig: () => config, emit() {}, version: 'test', home: path.join(root, 'home'),
    core: () => ({ command: process.execPath, args: [FIXTURE] }), enabled: () => true, runnerEnv: () => ({ CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS: '0' }), onSettled: (run) => { void toolService.settled(run); } });
  const approvals = [];
  toolService = createWorkflowToolService({ workflowService, getConfig: () => config, settings: () => resolveWorkflowSettings({ config }), dataRoot: path.join(root, 'sessions'), home: path.join(root, 'home'),
    updateConfig: () => {}, requestApproval: async (_session, request) => { approvals.push(request); return { approved: true }; },
    startTurn: async (_threadId, params) => { await client.request('turn/start', params); } });
  const host = createAgentToolsHost({ toolsDir: TOOLS_DIR, tmpRoot: tmp, command: process.execPath, runAsNode: false, logger: { warn() {}, log() {} },
    resolveSession: (id, meta) => threads.get(id ?? meta.threadId) ?? null });
  host.provide('workflows', (session) => ({ launch: (args) => toolService.launch(args, { sessionId: session.id, cwd: session.cwd }) }));
  await host.start();
  setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
  setCodexLaunch({ args: ['-c', 'model_provider="dummy"', '-c', `model_providers.dummy={name="dummy",base_url="${base}",wire_api="responses",env_key="DUMMY_KEY"}`, '-c', 'model="dummy-model"'], env: {} });
  setAgentToolsLaunch(() => ({ env: host.launchEnv(), codexArgs: host.codexArgs() }));
  client = new CodexClient({ serverCwd: work, initializeTimeout: 30000, shellProxy: () => ({}) });
  t.after(async () => {
    await workflowService.dispose();
    await client.stopAndWait().catch(() => {});
    setAgentToolsLaunch(null); setCodexLaunch(null); setCoreChoice({});
    host.stop(); server.close();
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    fs.rmSync(root, { recursive: true, force: true });
  });
  await client.start();
  client.on('event', (event) => toolService.observe(event));
  const identity = host.sessionIdentity(null);
  const started = await client.request('thread/start', { cwd: work, approvalPolicy: 'on-request', sandbox: 'workspace-write', config: host.sessionConfig(identity) });
  const threadId = started.thread.id;
  threads.set(threadId, { id: threadId, cwd: work });
  host.bindThread(identity, threadId);
  config = { ...config, threadIds: [threadId] };

  let status = null;
  for (let i = 0; i < 40; i++) {
    status = (await client.request('mcpServerStatus/list', { threadId })).data.find((entry) => entry.name === 'code_desktop');
    if (status?.runtimeStatus === 'connected' && Object.keys(status.tools).length) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(status?.runtimeStatus, 'connected', JSON.stringify(status));
  assert.ok(status.tools.Workflow, 'Workflow is listed');
  assert.match(status.tools.Workflow.description ?? '', /ONLY when the user has explicitly opted into multi-agent orchestration/);

  const items = [];
  client.on('event', (event) => { if (event.method === 'item/completed' && event.params?.item?.type === 'mcpToolCall') items.push(event.params.item); });
  const turnParams = { threadId, input: [{ type: 'text', text: 'ultracode audit the repo', text_elements: [] }], cwd: work, sandboxPolicy: { type: 'workspaceWrite', writableRoots: [work], networkAccess: false } };
  await toolService.turnStart(turnParams, { permission: 'auto', mode: 'code', keyword: true });
  assert.equal(turnParams.input.length, 2, 'the keyword reminder rides on the turn');
  await client.request('turn/start', turnParams);
  // The model's call, then (after the run) the notification turn: the dummy model sees <task-notification>.
  for (let i = 0; i < 400 && !requests.some((request) => request.input.includes('task-notification')); i++) await new Promise((resolve) => setTimeout(resolve, 100));
  assert.ok(requests.some((request) => request.namespaceTools?.includes('Workflow')), 'the model saw mcp__code_desktop.Workflow');
  assert.ok(requests.some((request) => request.input.includes('The user included the keyword')), 'the keyword reminder reached the model');
  assert.equal(items.length, 1, JSON.stringify(items).slice(0, 600));
  assert.equal(items[0].server, 'code_desktop'); assert.equal(items[0].tool, 'Workflow'); assert.equal(items[0].status, 'completed');
  assert.match(items[0].result.content[0].text, /^Workflow launched in background\. Task ID: w[0-9a-z]{8}\nSummary: Integration workflow/);
  assert.equal(approvals.length, 1);
  const notified = requests.find((request) => request.input.includes('task-notification'));
  assert.ok(notified, 'the <task-notification> reached the model');
  assert.match(notified.input, /SYSTEM NOTIFICATION - NOT USER INPUT[\s\S]*status>completed[\s\S]*Dynamic workflow \\"Integration workflow\\" completed[\s\S]*fixture result/);
  const runs = await workflowService.list(threadId);
  assert.equal(runs[0].status, 'completed'); assert.equal(runs[0].origin, 'tool');
});
