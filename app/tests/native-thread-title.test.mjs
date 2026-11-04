import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createNativeThreadTitles, threadTitlePrompt, parseThreadTitle, titleModel } = require('../electron/native-thread-title.cjs');

function fakeClient({ startFails = false, configFails = false, servers = { github: { command: 'gh-mcp' }, code_desktop: { command: 'node' } }, onStart = null } = {}) {
  const calls = [];
  let threads = 0, turns = 0;
  return { calls, async request(method, params) {
    calls.push({ method, params });
    if (method === 'config/read') { if (configFails) throw new Error('no config'); return { config: { model: 'x', ...(servers ? { mcp_servers: servers } : {}) } }; }
    if (method === 'thread/start') { if (startFails) throw new Error('nope'); onStart?.(`title-${threads + 1}`); return { thread: { id: `title-${++threads}`, ephemeral: true } }; }
    if (method === 'turn/start') return { turn: { id: `turn-${++turns}`, status: 'inProgress' } };
    return {};
  } };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('Codex titles: a hidden read-only ephemeral thread, one structured turn, the parsed title; its events stay in main', async () => {
  let early = null, titles = null;
  const client = fakeClient({ servers: { github: { command: 'gh-mcp' } }, onStart: (id) => { early = titles.observe({ method: 'thread/started', params: { thread: { id, ephemeral: true } } }); } });
  titles = createNativeThreadTitles({ getClient: () => client, ownServers: () => ['code_desktop'], context: () => ({ chatgpt: true, models: [{ model: 'gpt-5.6-luna' }], model: 'gpt-5.6-sol' }) });
  const answer = titles.generate({ text: 'hey can you look at why the login page is blank after deploy', cwd: '/repo' });
  await tick(); await tick();
  assert.equal(early, true, 'started before thread/start answers');
  const start = client.calls.find((call) => call.method === 'thread/start').params;
  assert.equal(start.model, 'gpt-5.6-luna');
  assert.equal(start.ephemeral, true);
  assert.equal(start.sandbox, 'read-only');
  assert.equal(start.approvalPolicy, 'never');
  assert.equal(start.cwd, '/repo');
  assert.equal(start.config['features.shell_tool'], false);
  assert.equal(start.config['token_budget.use_history_notes_extension'], undefined);
  // temporary_structured_request.rs: every configured MCP server (and OpenClaude Desktop's own) off, no environments or roots.
  assert.deepEqual(client.calls[0], { method: 'config/read', params: { includeLayers: false, cwd: '/repo' } });
  assert.equal(start.config['mcp_servers.code_desktop.enabled'], false);
  assert.equal(start.config['mcp_servers.github.enabled'], false);
  assert.equal(start.config.mcp_servers, undefined, 'one dotted key per server, never a whole table');
  assert.deepEqual([start.environments, start.selectedCapabilityRoots, start.runtimeWorkspaceRoots, start.dynamicTools], [[], [], [], []]);
  const turn = client.calls.find((call) => call.method === 'turn/start').params;
  assert.equal(turn.threadId, 'title-1');
  assert.equal(turn.effort, 'low');
  assert.equal(turn.outputSchema.properties.title.maxLength, 36);
  assert.match(turn.input[0].text, /User prompt:\nhey can you look/);
  assert.equal(titles.observe({ method: 'item/completed', params: { threadId: 'title-1', turnId: 'turn-1', item: { type: 'agentMessage', text: '{"title":"Fix blank login page."}' } } }), true);
  assert.equal(titles.observe({ method: 'turn/completed', params: { threadId: 'title-1', turn: { id: 'turn-1', status: 'completed' } } }), true);
  assert.deepEqual(await answer, { title: 'Fix blank login page' });
  assert.ok(client.calls.some((call) => call.method === 'thread/unsubscribe' && call.params.threadId === 'title-1'));
  assert.equal(titles.observe({ method: 'item/completed', params: { threadId: 'main', item: { type: 'agentMessage', text: 'x' } } }), false);
});

test('Codex titles: an API-key account uses the session model; a failed start or turn gives no title', async () => {
  const client = fakeClient();
  const titles = createNativeThreadTitles({ getClient: () => client, context: () => ({ chatgpt: false, models: [{ model: 'gpt-5.6-luna' }], model: 'gpt-5.6-sol' }) });
  const answer = titles.generate({ text: 'do it' });
  await tick(); await tick();
  assert.equal(client.calls.find((call) => call.method === 'thread/start').params.model, 'gpt-5.6-sol');
  assert.equal(client.calls.find((call) => call.method === 'turn/start').params.effort, undefined);
  titles.observe({ method: 'turn/completed', params: { threadId: 'title-1', turn: { id: 'turn-1', status: 'failed' } } });
  assert.deepEqual(await answer, { title: null });
  const failing = createNativeThreadTitles({ getClient: () => fakeClient({ startFails: true }) });
  assert.deepEqual(await failing.generate({ text: 'x' }), { title: null });
  assert.deepEqual(await failing.generate({ text: '  ' }), { title: null });
  // No effective config to read: no title thread at all (fail closed, as the TUI does).
  const blind = fakeClient({ configFails: true });
  assert.deepEqual(await createNativeThreadTitles({ getClient: () => blind }).generate({ text: 'x' }), { title: null });
  assert.ok(!blind.calls.some((call) => call.method === 'thread/start'));
  const none = fakeClient({ servers: null });
  const noneAnswer = createNativeThreadTitles({ getClient: () => none, ownServers: () => ['code_desktop'] }).generate({ text: 'x' });
  await tick(); await tick();
  const noneConfig = none.calls.find((call) => call.method === 'thread/start').params.config;
  assert.deepEqual(Object.keys(noneConfig).filter((key) => key.startsWith('mcp_servers.')), ['mcp_servers.code_desktop.enabled'], 'the app\'s own server even when config/read leaves it out');
  const odd = fakeClient({ servers: { 'my.server': { command: 'x' } } });
  assert.deepEqual(await createNativeThreadTitles({ getClient: () => odd }).generate({ text: 'x' }), { title: null }, 'a server that can\'t be turned off: no title');
  void noneAnswer;
});

test('the TUI prompt bound and title normalization', () => {
  const prompt = threadTitlePrompt('é'.repeat(2000));
  assert.ok(Buffer.byteLength(prompt) <= 960);
  assert.ok(!prompt.includes('�'));
  assert.equal(parseThreadTitle('{"title":"  “Add   retry logic”  "}'), 'Add retry logic');
  assert.equal(parseThreadTitle('{"title":"x","extra":1}'), null);
  assert.equal(parseThreadTitle('Title: x'), null);
  assert.equal(parseThreadTitle('{"title":"..."}'), null);
  assert.equal(Array.from(parseThreadTitle(`{"title":"${'a'.repeat(50)}"}`)).length, 36);
  assert.equal(titleModel({ chatgpt: true, models: [{ id: 'gpt-5.6-luna' }], model: 'm' }), 'gpt-5.6-luna');
  assert.equal(titleModel({ chatgpt: true, models: [], model: 'm' }), 'm');
});
