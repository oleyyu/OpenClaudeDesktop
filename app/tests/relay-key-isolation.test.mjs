// integration bug D6–D9: where the DeepSeek official key, a relay's key and the Codex endpoint key may go.
import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createHarnessProfile } = require('../electron/harness-profile.cjs');
const { createModelSettings } = require('../electron/model-settings.cjs');
const { createRelayProxy } = require('../electron/relay-proxy.cjs');
const i18n = require('../electron/i18n/index.mjs');

const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
const deepseek = () => ({ serverInfo: { engine: 'deepseek-harness' }, start: async () => {}, request: async () => ({}) });
const codex = () => ({ serverInfo: { engine: 'codex' }, start: async () => {}, request: async () => ({}) });
const tempDir = (t, name) => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), name)); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const patches = env => String(env.CODE_DESKTOP_CORE_PATCHES || '').split(path.delimiter).filter(Boolean)
  .flatMap(file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^#.*\n/gm, '')));

// ---------------------------------------------------------------- D6
test('D6: relay mode’s managed rows (web search key variable, relay catalog, providers) survive overlays off, Reset overlay and Restart without overlay', async (t) => {
  const root = tempDir(t, 'd6-');
  const prefsFile = path.join(root, 'preferences.json');
  fs.writeFileSync(prefsFile, '{}');
  const env = {};
  const state = { config: undefined, client: { serverInfo: { engine: 'deepseek-harness' }, request: async () => ({ entries: [{ id: 'tool-web', module: '@deepseek-ai/dsh-tool-web' }] }) } };
  const harness = createHarnessProfile({ app: { getPath: () => root }, shell: { openPath: async () => '' }, dialog: {}, getConfig: () => state.config, getClient: () => state.client, env });
  const forwarder = { async start() { return 'http://127.0.0.1:4321/r/anthropic'; }, async stop() {} };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: deepseek, getHarnessProfile: () => harness, safeStorage, dir: path.join(root, 'harness'), relayProxy: forwarder });
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic', relayModels: 'relay-model-a' }, relayKey: 'sk-relay' });
  await settings.run({ op: 'provider-save', provider: { route: 'glm-x', name: 'GLM', api: 'openai-completions', baseURL: 'https://glm.test/v1', models: 'glm-x' }, apiKey: 'sk-glm' });
  await harness.run({ op: 'set-enabled', id: 'tool-web', enabled: false });
  const managed = () => {
    const rows = patches(env);
    return {
      search: rows.find(row => row.id === 'web-search-deepseek')?.config?.apiKeyEnv ?? null,
      catalog: (rows.find(row => row.id === 'llm-deepseek')?.config?.models ?? []).map(model => model.id),
      providers: !!rows.find(row => row.id === 'llm-pi-ai'),
      toolWeb: rows.find(row => row.id === 'tool-web')?.disabled ?? null,
    };
  };
  const relayRows = { search: 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY', catalog: ['relay-model-a'], providers: true };
  assert.deepEqual(managed(), { ...relayRows, toolWeb: true }, 'overlays on');
  assert.equal(env.DEEPSEEK_API_KEY, 'sk-relay');
  assert.equal(env.CODE_DESKTOP_DEEPSEEK_SEARCH_KEY, undefined, 'no official key: web search fails instead of using the relay key');

  // "Use overlays" off (and "Restart without overlay", which saves the same switch): the page's rows go, ours stay.
  state.config = { harnessProfile: { overlayEnabled: false } };
  await harness.run({ op: 'sync' });
  assert.deepEqual(managed(), { ...relayRows, toolWeb: null });
  // Next app launch with overlays still off: the same patch list from the first spawn.
  const relaunched = {};
  createHarnessProfile({ app: { getPath: () => root }, shell: {}, dialog: {}, getConfig: () => state.config, getClient: () => undefined, env: relaunched });
  assert.equal(relaunched.CODE_DESKTOP_CORE_PATCHES, env.CODE_DESKTOP_CORE_PATCHES);

  // "Reset overlay" removes every change made on the page, not Settings › Models' rows.
  state.config = undefined;
  await harness.run({ op: 'reset-overlay' });
  assert.deepEqual(managed(), { ...relayRows, toolWeb: null });
  const read = await harness.run({ op: 'read' });
  assert.equal(read.overlay.rows['llm-deepseek'], undefined, 'the page lists only its own rows');

  // Back to the official API: the relay rows go.
  await settings.run({ op: 'connection-save', connection: { mode: 'official' } });
  assert.deepEqual(managed(), { search: null, catalog: [], providers: true, toolWeb: null });
});

test('D6: rows an older version kept in overlay.json move out of it, a page switch on the row stays', async (t) => {
  const root = tempDir(t, 'd6-migrate-');
  const dir = path.join(root, 'harness');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(root, 'preferences.json'), '{}');
  fs.writeFileSync(path.join(dir, 'overlay.json'), JSON.stringify({ rows: { 'web-search-deepseek': { disabled: false, config: { apiKeyEnv: 'OLD' } }, 'llm-deepseek': { config: { models: [{ id: 'old' }] } }, 'tool-web': { disabled: true } }, inserts: [] }));
  const env = {};
  const harness = createHarnessProfile({ app: { getPath: () => root }, shell: {}, dialog: {}, getConfig: () => undefined, getClient: () => undefined, env });
  await harness.setManagedRow('web-search-deepseek', { config: { apiKeyEnv: 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY' } });
  await harness.removeManagedRow('llm-deepseek');
  const overlay = JSON.parse(fs.readFileSync(path.join(dir, 'overlay.json'), 'utf8'));
  assert.deepEqual(overlay.rows, { 'web-search-deepseek': { disabled: false }, 'tool-web': { disabled: true } });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'managed.json'), 'utf8')).rows, { 'web-search-deepseek': { config: { apiKeyEnv: 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY' } } });
  const files = env.CODE_DESKTOP_CORE_PATCHES.split(path.delimiter);
  assert.deepEqual(files, [path.join(dir, 'managed.patch.yml'), path.join(dir, 'overlay.patch.yml')], 'managed first, the page and user.patch.yml after it');
});

// ---------------------------------------------------------------- D7
test('D7: a bridge core (acp-bridge, ZCode, OpenCode) never inherits the DeepSeek, relay, web search or Codex keys', async (t) => {
  const { resolveCore, setCoreChoice } = require('../electron/codex.cjs');
  const names = ['CODE_DESKTOP_CORE', 'CODEX_BINARY', 'DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'CODE_DESKTOP_PROVIDER_KEY_MYGLM', 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY', 'CODE_DESKTOP_CODEX_API_KEY'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  t.after(() => { setCoreChoice({}); for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
  delete process.env.CODEX_BINARY;
  Object.assign(process.env, { DEEPSEEK_API_KEY: 'sk-FAKE-deepseek-official', DEEPSEEK_BASE_URL: 'http://127.0.0.1:9/r', CODE_DESKTOP_PROVIDER_KEY_MYGLM: 'sk-FAKE-glm', CODE_DESKTOP_DEEPSEEK_SEARCH_KEY: 'sk-FAKE-search', CODE_DESKTOP_CODEX_API_KEY: 'sk-FAKE-codex' });
  setCoreChoice({});
  const childEnv = (core) => {
    process.env.CODE_DESKTOP_CORE = core;
    const resolved = resolveCore();
    assert.equal(resolved.kind, core);
    // What CodexClient.start hands spawn (process.env, then core.env); undefined values are dropped by spawn.
    return Object.fromEntries(Object.entries({ ...process.env, ...resolved.env }).filter(([, value]) => value !== undefined));
  };
  for (const core of ['kimi', 'gemini', 'qwen', 'minimax', 'zcode', 'opencode', 'mimo']) {
    const env = childEnv(core);
    for (const name of ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY', 'CODE_DESKTOP_CODEX_API_KEY']) assert.equal(env[name], undefined, `${core}: ${name}`);
    // The OpenCode-based adapters reference the custom providers' keys ({env:…}); nobody else gets them.
    assert.equal(env.CODE_DESKTOP_PROVIDER_KEY_MYGLM, ['opencode', 'mimo'].includes(core) ? 'sk-FAKE-glm' : undefined, `${core}: provider key`);
  }
  // The built-in DeepSeek core still gets its own connection.
  assert.equal(childEnv('deepseek').DEEPSEEK_API_KEY, 'sk-FAKE-deepseek-official');
});

// ---------------------------------------------------------------- D8
test('D8: a relay or Codex base URL on another host is never saved with the old key', async (t) => {
  const dir = tempDir(t, 'd8-');
  const env = new Map();
  const profile = { setManagedRow: async () => {}, removeManagedRow: async () => {}, setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); } };
  const forwarder = { async start(url) { return `loopback:${url}`; }, async stop() {} };
  let launch = null;
  const settings = createModelSettings({ getConfig: () => ({}), getClient: deepseek, getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder,
    setCodexLaunch: value => { launch = value; }, codexCommand: () => null });
  const keys = () => JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(dir, 'provider-keys.bin'))));
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-a.test/anthropic' }, relayKey: 'sk-relayA' });
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-b.test/anthropic' } }), /different host.*Enter the new relay’s API key/);
  assert.equal((await settings.run({ op: 'connection-read' })).relayBaseURL, 'https://relay-a.test/anthropic', 'nothing saved');
  assert.equal(env.get('DEEPSEEK_BASE_URL'), 'loopback:https://relay-a.test/anthropic');
  for (const other of ['http://relay-a.test/anthropic', 'https://relay-a.test:8443/anthropic']) await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: other } }), /different host/, other);
  // Same origin, another path: still that relay's key.
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-a.test/v2' } });
  // A new key with the new URL saves.
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-b.test/anthropic' }, relayKey: 'sk-relayB' });
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-relayB');
  // Official mode with the relay URL changed: the old relay key is dropped, never kept for the new host.
  await settings.run({ op: 'connection-save', connection: { mode: 'official', relayBaseURL: 'https://relay-c.test' }, officialKey: 'sk-official' });
  assert.equal(keys()['@relay'], undefined);
  // Chinese copy.
  i18n.setLocale('zh-CN');
  t.after(() => i18n.setLocale('en-US'));
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-c.test' }, relayKey: 'sk-relayC' });
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay-d.test' } }), /已换到另一台主机/);
  i18n.setLocale('en-US');

  // Codex custom endpoint.
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://one.test/v1', models: ['m'] }, apiKey: 'sk-codex-one' });
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://two.test/v1', models: ['m'] } }), /different host.*Enter the new endpoint’s API key/);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).baseURL, 'https://one.test/v1');
  assert.equal(launch().env.CODE_DESKTOP_CODEX_API_KEY, 'sk-codex-one');
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://one.test/other/v1', models: ['m'] } });
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://two.test/v1', models: ['m'] }, apiKey: 'sk-codex-two' });
  assert.equal(launch().env.CODE_DESKTOP_CODEX_API_KEY, 'sk-codex-two');
  // A model server on this Mac needs no key: switching to it runs keyless rather than sending the remote key there.
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'http://127.0.0.1:1234/v1', models: ['m'] } });
  assert.equal(launch().env.CODE_DESKTOP_CODEX_API_KEY, undefined);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).hasKey, false);
});

// ---------------------------------------------------------------- D9
async function relayServer(t, name, seen, { stream = false } = {}) {
  const server = http.createServer(async (req, res) => {
    for await (const _ of req) { /* drain */ }
    seen.push({ relay: name, url: req.url, key: req.headers['x-api-key'] ?? null });
    if (!stream || server.finish) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{}'); return; }
    res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('data: one\n\n');
    server.finish = () => res.end('data: two\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  return { url: `http://127.0.0.1:${server.address().port}/anthropic`, server };
}

test('D9: each relay has its own forwarder route; a save never redirects, cuts off or waits for a running core', async (t) => {
  const seen = [];
  const { url: relayA, server: serverA } = await relayServer(t, 'A', seen, { stream: true }), { url: relayB } = await relayServer(t, 'B', seen);
  const proxy = createRelayProxy();
  t.after(() => proxy.stop());
  const dir = tempDir(t, 'd9-');
  const env = new Map();
  const profile = { setManagedRow: async () => {}, removeManagedRow: async () => {}, setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); } };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: deepseek, getHarnessProfile: () => profile, safeStorage, dir, relayProxy: proxy });
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: relayA }, relayKey: 'sk-relayA-AAAA' });
  // The running core: the environment it was spawned with.
  const coreA = { base: env.get('DEEPSEEK_BASE_URL'), key: env.get('DEEPSEEK_API_KEY') };
  const send = (core) => fetch(`${core.base}/v1/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': core.key }, body: '{}' });
  // A reply is streaming when the user switches to relay B.
  const streaming = await send(coreA);
  const reader = streaming.body.getReader();
  assert.equal(new TextDecoder().decode((await reader.read()).value), 'data: one\n\n');
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: relayB }, relayKey: 'sk-relayB-BBBB' });
  const coreB = { base: env.get('DEEPSEEK_BASE_URL'), key: env.get('DEEPSEEK_API_KEY') };
  assert.notEqual(coreB.base, coreA.base);
  // Not restarted: the old core still reaches relay A with key A; never B.
  seen.length = 0;
  await (await send(coreA)).text();
  await (await send(coreB)).text();
  assert.deepEqual(seen.map(entry => [entry.relay, entry.key]), [['A', 'sk-relayA-AAAA'], ['B', 'sk-relayB-BBBB']]);
  // Back to the official API while A's reply is still streaming: the save returns at once and the old core keeps working.
  const started = Date.now();
  await settings.run({ op: 'connection-save', connection: { mode: 'official' } });
  assert.ok(Date.now() - started < 1000, 'the save did not wait for the stream');
  assert.equal(env.has('DEEPSEEK_BASE_URL'), false);
  seen.length = 0;
  const after = await send(coreB);
  assert.equal(after.status, 200, 'the running core is not cut off');
  await after.text();
  assert.deepEqual(seen.map(entry => entry.relay), ['B']);
  // The reply under way still completes.
  serverA.finish();
  let rest = '';
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) rest += new TextDecoder().decode(chunk.value);
  assert.equal(rest, 'data: two\n\n');
  // An address the forwarder never handed out answers 404 and reaches no relay.
  const port = new URL(coreA.base).port;
  const stray = await fetch(`http://127.0.0.1:${port}/anthropic/v1/messages`, { method: 'POST', body: '{}' });
  assert.equal(stray.status, 404);
  await stray.text();
  // The same relay saved again gets the same route (no restart asked for nothing).
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: relayA }, relayKey: 'sk-relayA-AAAA' });
  assert.equal(env.get('DEEPSEEK_BASE_URL'), coreA.base);
});
