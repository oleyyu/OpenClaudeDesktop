// Opt-in: the app's permission modes on the real Codex binary (0.155.1). Run with
//   CODEX_INTEGRATION=1 [CODEX_INTEGRATION_BINARY=~/.local/bin/codex] node --test tests/codex-modes-integration.test.mjs
// A fresh CODEX_HOME under the OS temp dir and a 127.0.0.1 Responses dummy only (the custom endpoint of
// model-settings.cjs, so nothing signs in and nothing reaches the network or ~/.codex). The dummy answers every
// first call of a turn with an apply_patch that adds one file, and the follow-up with a plain message.
//   Accept edits  (permission-policy.mjs: on-request + workspaceWrite) the patch applies with no approval request.
//   Manual        (untrusted) the same patch asks first (declined here, so nothing is written).
//   Plan          (never + readOnly + collaborationMode plan) no approval request, nothing written, and the
//                 model gets Codex's plan-mode instructions, which the default mode drops again.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { turnPermissionParams, threadPermissionParams, nativeCollaborationMode } from '../electron/permission-policy.mjs';

const require = createRequire(import.meta.url);
const binary = process.env.CODEX_INTEGRATION_BINARY || path.join(os.homedir(), '.local/bin/codex');
const skip = process.env.CODEX_INTEGRATION !== '1' ? 'set CODEX_INTEGRATION=1 to run against the real Codex binary'
  : !fs.existsSync(binary) ? `no Codex binary at ${binary}` : false;
const KEY = 'sk-integration-modes-0123';

function dummyEndpoint() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const json = body ? JSON.parse(body) : {};
      if (req.method !== 'POST' || req.url !== '/v1/responses') { res.writeHead(404); res.end('{}'); return; }
      if (!json.stream) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'r0', object: 'response', status: 'completed', output: [] })); return; }
      const input = JSON.stringify(json.input ?? []);
      const tool = (json.tools || []).find(entry => entry.name === 'apply_patch');
      requests.push({ input, instructions: String(json.instructions ?? ''), patchTool: tool?.type ?? null });
      const n = requests.length;
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      event('response.created', { response: { id: `r${n}`, object: 'response', status: 'in_progress', output: [] } });
      const file = /FILE=([a-z]+\.txt)/.exec(input)?.[1];
      const answered = /function_call_output|custom_tool_call_output/.test(input.slice(input.lastIndexOf('FILE=')));
      const patch = `*** Begin Patch\n*** Add File: ${file}\n+written\n*** End Patch\n`;
      const item = file && tool && !answered
        ? tool.type === 'custom'
          ? { id: `ct${n}`, type: 'custom_tool_call', status: 'completed', call_id: `call_${n}`, name: 'apply_patch', input: patch }
          : { id: `fc${n}`, type: 'function_call', status: 'completed', call_id: `call_${n}`, name: 'apply_patch', arguments: JSON.stringify({ input: patch }) }
        : { id: `m${n}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'done', annotations: [] }] };
      event('response.output_item.added', { output_index: 0, item });
      event('response.output_item.done', { output_index: 0, item });
      event('response.completed', { response: { id: `r${n}`, object: 'response', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } } });
      res.end();
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, requests, base: `http://127.0.0.1:${server.address().port}/v1` })));
}

test('Accept edits, Manual and Plan on the real Codex binary', { skip, timeout: 180000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-modes-int-'));
  const home = path.join(root, 'home');
  fs.mkdirSync(home); fs.mkdirSync(path.join(root, 'work'));
  const work = fs.realpathSync(path.join(root, 'work'));
  const saved = Object.fromEntries(['CODEX_HOME', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODE_DESKTOP_CORE', 'CODEX_BINARY', 'CODE_DESKTOP_CORE_SYSTEM_PATHS'].map(key => [key, process.env[key]]));
  Object.assign(process.env, { CODEX_HOME: home, CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '' });
  for (const key of ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODEX_BINARY']) delete process.env[key];
  const { CodexClient, setCoreChoice, setCodexLaunch } = require('../electron/codex.cjs');
  const { createModelSettings } = require('../electron/model-settings.cjs');
  setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
  const { server, requests, base } = await dummyEndpoint();
  let client = null;
  t.after(async () => {
    await client?.stopAndWait().catch(() => {});
    setCodexLaunch(null); setCoreChoice({});
    server.close();
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    fs.rmSync(root, { recursive: true, force: true });
  });
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => client, safeStorage, dir: path.join(root, 'harness'),
    getHarnessProfile: () => ({ coreEnvKeys: () => ({}) }), setCodexLaunch, codexCommand: () => binary });
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: base, models: ['relay-a'] }, apiKey: KEY });
  await settings.ready();
  client = new CodexClient({ serverCwd: work, initializeTimeout: 30000 });
  const approvals = [];
  client.on('event', event => { if (event.kind === 'request') approvals.push(event); });
  await client.start();

  // The core lists collaboration modes (main.cjs collaborationModes asks exactly this).
  const presets = await client.request('collaborationMode/list', {});
  assert.ok(presets.data.some(preset => preset.mode === 'plan'), JSON.stringify(presets).slice(0, 300));

  const run = async (permission, file, onApproval) => {
    const started = await client.request('thread/start', { cwd: work, ...threadPermissionParams({ permission }) });
    const threadId = started.thread.id;
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`turn/completed did not arrive (${permission})`)), 60000);
      client.on('event', event => {
        if (event.kind === 'request' && event.params?.threadId === threadId) onApproval?.(event);
        if (event.method === 'turn/completed' && event.params?.threadId === threadId) { clearTimeout(timer); resolve(event.params); }
      });
    });
    const params = { threadId, model: 'relay-a', effort: 'low', input: [{ type: 'text', text: `FILE=${file}`, text_elements: [] }], ...turnPermissionParams({ permission, cwd: work }) };
    const collaborationMode = nativeCollaborationMode(params);
    assert.ok(collaborationMode, permission);
    params.collaborationMode = collaborationMode;
    const before = approvals.length, sent = requests.length;
    await client.request('turn/start', params);
    const completed = await done;
    return { completed, asked: approvals.slice(before).filter(event => event.params?.threadId === threadId), calls: requests.slice(sent) };
  };

  // Accept edits: the workspace patch applies without asking.
  const accept = await run('acceptEdits', 'accept.txt');
  assert.equal(accept.completed.turn?.status, 'completed', JSON.stringify(accept.completed).slice(0, 300));
  assert.ok(accept.calls[0].patchTool, 'the endpoint offered apply_patch');
  assert.deepEqual(accept.asked.map(event => event.method), [], 'no approval request for a workspace edit');
  assert.equal(fs.readFileSync(path.join(work, 'accept.txt'), 'utf8'), 'written\n');

  // Manual (untrusted): the same patch asks first; declined, nothing is written.
  const manual = await run('ask', 'manual.txt', event => client.respond(event.id, { decision: 'decline' }, event.bridgeApproval));
  assert.deepEqual(manual.asked.map(event => event.method), ['item/fileChange/requestApproval']);
  assert.equal(fs.existsSync(path.join(work, 'manual.txt')), false);

  // Plan: Codex's plan mode, read-only and never escalating: no approval request, nothing written.
  const plan = await run('plan', 'plan.txt');
  assert.equal(plan.completed.turn?.status, 'completed', JSON.stringify(plan.completed).slice(0, 300));
  assert.deepEqual(plan.asked.map(event => event.method), [], 'Plan never asks to escalate');
  assert.equal(fs.existsSync(path.join(work, 'plan.txt')), false, 'the patch was rejected');
  const planText = plan.calls[0].input + plan.calls[0].instructions, acceptText = accept.calls[0].input + accept.calls[0].instructions;
  // Codex 0.155.1's built-in mode instructions (developer_instructions null): Plan's, and Default's after it.
  assert.match(planText, /<collaboration_mode># Plan Mode/, 'the model is told it is in plan mode');
  assert.match(acceptText, /<collaboration_mode># Collaboration Mode: Default/, 'other modes run in the default mode');
  assert.doesNotMatch(acceptText, /<collaboration_mode># Plan Mode/);
});
