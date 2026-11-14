// Opt-in: the real Codex binary (0.155.1) on a custom Responses endpoint, through the main-process path
// (model-settings.cjs codex-provider-* → codex.cjs setCodexLaunch → CodexClient). Run with
//   CODEX_INTEGRATION=1 [CODEX_INTEGRATION_BINARY=~/.local/bin/codex] node --test tests/codex-provider-integration.test.mjs
// It uses a fresh CODEX_HOME under the OS temp dir and a 127.0.0.1 dummy endpoint only: nothing signs in, and
// nothing reaches the network or ~/.codex.
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
const KEY = 'sk-integration-0123456789';

function dummyEndpoint() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const json = body ? JSON.parse(body) : {};
      const input = JSON.stringify(json.input ?? []);
      requests.push({ method: req.method, url: req.url, auth: req.headers.authorization, tools: (json.tools || []).map(tool => tool.name || tool.type), model: json.model, stream: json.stream === true, input });
      if (req.method === 'GET' && req.url === '/v1/models') { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ data: [{ id: 'relay-a' }, { id: 'relay-b' }] })); return; }
      if (req.method !== 'POST' || req.url !== '/v1/responses') { res.writeHead(404); res.end('{}'); return; }
      if (!json.stream) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'r0', object: 'response', status: 'completed', output: [] })); return; }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const n = requests.length;
      const event = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      event('response.created', { response: { id: `r${n}`, object: 'response', status: 'in_progress', output: [] } });
      const item = input.includes('RUN_ENV') && !input.includes('function_call_output')
        ? { id: `fc${n}`, type: 'function_call', status: 'completed', name: 'exec_command', call_id: `call_${n}`,
          arguments: JSON.stringify({ cmd: "env | grep -E '^(CODE_DESKTOP_CODEX_API_KEY|DEEPSEEK_API_KEY|CODE_DESKTOP_PROVIDER_KEY_GW)=' ; echo END_OF_ENV" }) }
        : { id: `m${n}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'done', annotations: [] }] };
      event('response.output_item.added', { output_index: 0, item });
      event('response.output_item.done', { output_index: 0, item });
      event('response.completed', { response: { id: `r${n}`, object: 'response', status: 'completed', output: [], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } } } });
      res.end();
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, requests, base: `http://127.0.0.1:${server.address().port}/v1` })));
}

test('a custom Responses endpoint on the real Codex binary', { skip, timeout: 120000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-provider-int-'));
  const home = path.join(root, 'home'), work = path.join(root, 'work');
  fs.mkdirSync(home); fs.mkdirSync(work);
  const saved = Object.fromEntries(['CODEX_HOME', 'DEEPSEEK_API_KEY', 'CODE_DESKTOP_PROVIDER_KEY_GW', 'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODE_DESKTOP_CORE', 'CODEX_BINARY', 'CODE_DESKTOP_CORE_SYSTEM_PATHS'].map(key => [key, process.env[key]]));
  // The DeepSeek and Harness-managed keys are in this process's environment, as harness-profile.cjs leaves them.
  Object.assign(process.env, { CODEX_HOME: home, DEEPSEEK_API_KEY: 'leak-deepseek', CODE_DESKTOP_PROVIDER_KEY_GW: 'leak-provider', CODE_DESKTOP_CORE: 'codex', CODE_DESKTOP_CORE_SYSTEM_PATHS: '' });
  for (const key of ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODEX_BINARY']) delete process.env[key];
  const { CodexClient, setCoreChoice, setCodexLaunch } = require('../electron/codex.cjs');
  const { createModelSettings } = require('../electron/model-settings.cjs');
  setCoreChoice({ core: 'codex', agents: { codex: { path: binary } } });
  const { server, requests, base } = await dummyEndpoint();
  const clients = [];
  t.after(async () => {
    for (const client of clients) await client.stopAndWait().catch(() => {});
    setCodexLaunch(null); setCoreChoice({});
    server.close();
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    fs.rmSync(root, { recursive: true, force: true });
  });
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  let client = null;
  // main.cjs keeps each thread's metadata (its recorded modelProvider) in preferences.json.
  const appConfig = { threadMetadata: {} };
  const settings = createModelSettings({ getConfig: () => appConfig, getClient: () => client, safeStorage, dir: path.join(root, 'harness'),
    getHarnessProfile: () => ({ coreEnvKeys: () => ({ CODE_DESKTOP_PROVIDER_KEY_GW: 'leak-provider' }) }), setCodexLaunch, codexCommand: () => binary });
  const connect = async () => {
    await settings.ready();
    client = new CodexClient({ serverCwd: work, initializeTimeout: 30000 });
    clients.push(client);
    await client.start();
    return client;
  };
  const turnDone = (owner, threadId) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('turn/completed did not arrive')), 60000);
    owner.on('event', event => { if (event.method === 'turn/completed' && event.params?.threadId === threadId) { clearTimeout(timer); resolve(event.params); } });
  });

  // Fetch and test with the typed key; save keeps it encrypted and never returns it.
  assert.deepEqual(await settings.run({ op: 'codex-provider-models', baseURL: base, apiKey: KEY }), { models: ['relay-a', 'relay-b'] });
  assert.equal(requests.at(-1).auth, `Bearer ${KEY}`);
  assert.equal((await settings.run({ op: 'codex-provider-test', baseURL: base, apiKey: KEY, model: 'relay-a' })).ok, true);
  const view = await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: base, models: ['relay-a', 'relay-b'] }, apiKey: KEY });
  assert.deepEqual(view, { available: true, mode: 'custom', baseURL: base, models: ['relay-a', 'relay-b'], webSearch: false, hasKey: true, pending: true });
  assert.ok(fs.existsSync(path.join(root, 'harness/codex/model-catalog.json')), 'the catalog was built from codex debug models --bundled');

  let owner = await connect();
  assert.equal((await owner.request('account/read', {})).requiresOpenaiAuth, false);
  const list = await owner.request('model/list', { limit: 100 });
  assert.deepEqual(list.data.map(model => [model.model, model.isDefault]), [['relay-a', true], ['relay-b', false]]);
  const started = await owner.request('thread/start', { cwd: work, approvalPolicy: 'never', sandbox: 'read-only' });
  assert.equal(started.modelProvider, 'codedesktop');
  assert.equal(started.model, 'relay-a');
  const threadId = started.thread.id;
  appConfig.threadMetadata[threadId] = { modelProvider: started.thread.modelProvider ?? started.modelProvider };
  assert.equal(appConfig.threadMetadata[threadId].modelProvider, 'codedesktop');

  // One turn: the agent runs `env`; the endpoint sees the key as Bearer, no web_search tool, and a blank key in the output.
  const done = turnDone(owner, threadId);
  await owner.request('turn/start', { threadId, input: [{ type: 'text', text: 'RUN_ENV', text_elements: [] }] });
  const completed = await done;
  assert.equal(completed.turn?.status, 'completed', JSON.stringify(completed).slice(0, 400));
  const turns = requests.filter(request => request.method === 'POST' && request.stream);
  assert.ok(turns.length >= 2, `two Responses calls, saw ${turns.length}`);
  for (const request of turns) {
    assert.equal(request.url, '/v1/responses');
    assert.equal(request.auth, `Bearer ${KEY}`);
    assert.equal(request.model, 'relay-a');
    assert.equal(request.tools.includes('web_search'), false, 'hosted web_search is off on a custom endpoint');
  }
  const output = turns.find(request => request.input.includes('function_call_output'))?.input ?? '';
  assert.match(output, /CODE_DESKTOP_CODEX_API_KEY=\\n/, 'the agent shell sees the key blank');
  assert.ok(output.includes('END_OF_ENV'));
  for (const secret of [KEY, 'leak-deepseek', 'leak-provider']) assert.equal(output.includes(secret), false, `${secret} never reaches the agent shell`);

  // An MCP write that reloads the user config keeps the -c provider.
  await owner.request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.cdtest', value: { command: '/usr/bin/true', enabled: false }, mergeStrategy: 'upsert' }], reloadUserConfig: true });
  assert.equal((await owner.request('thread/start', { cwd: work, approvalPolicy: 'never', sandbox: 'read-only' })).modelProvider, 'codedesktop');
  assert.equal(fs.readFileSync(path.join(home, 'config.toml'), 'utf8').includes('codedesktop'), false, 'the provider is never written into config.toml');
  await owner.stopAndWait();

  // Back to OpenAI: the provider table stays defined, the custom thread resumes on OpenAI and is still listed.
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai' } });
  owner = await connect();
  assert.equal((await owner.request('account/read', {})).requiresOpenaiAuth, true);
  assert.ok((await owner.request('model/list', { limit: 100 })).data.every(model => !model.model.startsWith('relay-')), 'OpenAI mode lists Codex’s own catalog');
  const listed = await owner.request('thread/list', settings.decorateThread('thread/list', { limit: 50 }));
  assert.ok(listed.data.some(thread => thread.id === threadId), 'modelProviders: [] lists threads recorded under the custom endpoint');
  const plain = await owner.request('thread/list', { limit: 50 });
  assert.equal(plain.data.some(thread => thread.id === threadId), false, 'without modelProviders Codex lists only the current provider');
  const resumed = await owner.request('thread/resume', settings.decorateThread('thread/resume', { threadId, excludeTurns: true }));
  assert.equal(resumed.modelProvider, 'openai');
  await owner.stopAndWait();

  // And custom again: the same thread resumes on the endpoint.
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom' } });
  owner = await connect();
  const again = await owner.request('thread/resume', settings.decorateThread('thread/resume', { threadId, excludeTurns: true }));
  assert.equal(again.modelProvider, 'codedesktop');
  // Saved but not restarted: the running child's launch decides. OpenAI saved, the custom child keeps the endpoint.
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai' } });
  assert.equal(settings.decorateThread('thread/resume', { threadId }).modelProvider, 'codedesktop');
  assert.equal((await owner.request('thread/resume', settings.decorateThread('thread/resume', { threadId, excludeTurns: true }))).modelProvider, 'codedesktop');
  await owner.stopAndWait();
  // A child launched with no endpoint, then custom saved: resume / fork name no provider the child doesn't define,
  // which Codex rejects outright. (Resuming without one needs a thread this child can run, i.e. an OpenAI turn.)
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai', baseURL: '' } });
  owner = await connect();
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: base, models: ['relay-a'] } });
  for (const method of ['thread/resume', 'thread/fork']) assert.equal('modelProvider' in settings.decorateThread(method, { threadId, excludeTurns: true }), false, method);
  await assert.rejects(owner.request('thread/resume', { threadId, excludeTurns: true, modelProvider: 'codedesktop' }), /Model provider `codedesktop` not found/);
});
