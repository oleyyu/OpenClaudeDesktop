import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
// Main-process copy names the core it is about and follows the UI language; a native Extension Pack core runs its
// own agent program; per-token accounts get an empty usage answer; model settings reach every core that reads them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const codexModule = require('../electron/codex.cjs');
const { CodexClient, resolveCore, setCoreChoice, setCodexLaunch, clientCoreName, coreError } = codexModule;
const { workflowCoreCommand } = require('../electron/workflow-service.cjs');
const { perTokenAccount, perTokenUsage, perTokenRefusal } = require('../electron/account-operations.cjs');
const { createModelSettings } = require('../electron/model-settings.cjs');
const i18n = require('../electron/i18n/index.mjs');
const { registerCores } = require('../electron/core-registry.mjs');

const withEnv = (t, values) => {
  const saved = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  t.after(() => { for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value; });
};

test('errors name the client’s own core: its engine report, else the core it spawned, else the chosen core', (t) => {
  withEnv(t, { CODE_DESKTOP_CORE: undefined, CODEX_BINARY: undefined });
  t.after(() => { setCoreChoice({}); i18n.setLocale('en-US'); });
  assert.equal(clientCoreName({ serverInfo: { engine: 'codex' } }), 'Codex');
  assert.equal(clientCoreName({ serverInfo: { engine: 'opencode' } }), 'OpenCode');
  assert.equal(clientCoreName({ spawnedCore: 'zcode' }), 'GLM', 'the descriptor’s assistant, as the renderer names it');
  // No engine report (an override binary or a fixture): the chosen core, never Codex by default.
  assert.equal(clientCoreName({ serverInfo: {} }), 'DeepSeek');
  setCoreChoice({ core: 'kimi' });
  assert.equal(clientCoreName({}), 'Kimi');
  assert.equal(coreError({ serverInfo: { engine: 'codex' } }, 'The {core} connection changed. Try again.').message, 'The Codex connection changed. Try again.');
  // A value named DeepSeek is interpolated after the assistant rewrite, so DeepSeek Harness stays DeepSeek.
  setCoreChoice({});
  assert.equal(coreError({}, '{core} stopped.').message, 'DeepSeek stopped.');
  i18n.setLocale('zh-CN');
  assert.equal(coreError({ serverInfo: { engine: 'codex' } }, '{core} disconnected ({code}). {reason}Reconnect to continue.', { code: 'SIGKILL', reason: '' }).message, 'Codex 已断开连接（SIGKILL）。请重新连接以继续。');
  assert.equal(coreError({ spawnedCore: 'mimo' }, '{core} returned an invalid sign-in response.').message, 'MiMo 返回了无效的登录响应。');
});

test('no main-process error string hardcodes DeepSeek as the failing core', () => {
  const files = ['codex.cjs', 'main.cjs', 'session-operations.cjs', 'background-tasks.cjs', 'account-operations.cjs', 'workflow-service.cjs', 'model-settings.cjs'];
  for (const file of files) {
    const source = fs.readFileSync(new URL(`../electron/${file}`, import.meta.url), 'utf8');
    const offenders = source.split('\n').filter((line) => !/^\s*\/\//.test(line))
      .filter((line) => /(?:Error\(|error\s*=\s*)\s*["'`][^"'`]*\bDeepSeek\b(?!\s*Harness)/.test(line));
    assert.deepEqual(offenders, [], file);
  }
});

test('a core that exits before initialize is named in the disconnect error, in the UI language', { timeout: 10000 }, async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'core-exit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const binary = path.join(directory, 'acme');
  fs.writeFileSync(binary, `#!${process.execPath}\nprocess.stderr.write('acme: no license\\n'); process.exit(2);\n`, { mode: 0o755 });
  withEnv(t, { CODE_DESKTOP_CORE: undefined, CODEX_BINARY: undefined });
  registerCodexPack([{ id: 'acme', name: 'Acme Agent', assistant: 'Acme', kind: 'native', engine: 'acme', agent: { binary: 'acme' } }]);
  setCoreChoice({ core: 'acme', agents: { acme: { path: binary } } });
  t.after(() => { registerCodexPack([]); setCoreChoice({}); i18n.setLocale('en-US'); });
  const client = new CodexClient({ initializeTimeout: 3000, shutdownTimeout: 80 });
  t.after(() => client.stopAndWait());
  const error = await client.start().then(() => null, (failure) => failure);
  assert.equal(error?.message, 'Acme disconnected (2). acme: no license Reconnect to continue.');
  assert.throws(() => client.send({ id: 1, method: 'x' }), /^Error: Acme is not connected\.$/);
  i18n.setLocale('zh-CN');
  const again = await client.start().then(() => null, (failure) => failure);
  assert.equal(again?.message, 'Acme 已断开连接（2）。acme: no license 请重新连接以继续。');
});

test('a native Extension Pack core runs its own agent program, never Codex or its launch overrides', (t) => {
  withEnv(t, { CODE_DESKTOP_CORE: undefined, CODEX_BINARY: undefined, CODE_DESKTOP_CORE_SYSTEM_PATHS: '' });
  setCodexLaunch({ args: ['-c', 'model_provider="codedesktop"'], env: { CODE_DESKTOP_CODEX_API_KEY: 'sk-codex' } });
  registerCodexPack([
    { id: 'acme', name: 'Acme Agent', kind: 'native', engine: 'acme', agent: { binary: 'acme' } },
    { id: 'beta', name: 'Beta', kind: 'native', engine: 'beta', agent: { binary: 'beta', args: ['serve', '--protocol', 'codex', 'bad\narg'] } },
  ]);
  t.after(() => { registerCodexPack([]); setCoreChoice({}); setCodexLaunch(null); });
  setCoreChoice({ core: 'acme', agents: { acme: { path: '/opt/acme/bin/acme' } } });
  const acme = resolveCore();
  const defined = (env) => Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined));
  assert.deepEqual({ ...acme, env: defined(acme.env) }, { command: '/opt/acme/bin/acme', prefix: [], kind: 'acme', serverArgs: ['app-server', '--stdio'], env: { CODE_DESKTOP_CORE_ID: 'acme' } });
  assert.equal(JSON.stringify(acme).includes('codedesktop') || JSON.stringify(acme).includes('sk-codex'), false, 'no Codex launch overrides');
  // A Node-run agent, and descriptor agent.args (unsafe entries dropped).
  setCoreChoice({ core: 'beta', agents: { beta: { path: '/opt/beta/cli.js', runner: 'node' } } });
  const beta = resolveCore();
  assert.deepEqual(beta.prefix, ['/opt/beta/cli.js']);
  assert.deepEqual(beta.serverArgs, ['serve', '--protocol', 'codex']);
  assert.equal(beta.kind, 'beta');
  // Not installed yet: the descriptor's program from PATH, which fails as itself (ENOENT acme), not as codex.
  setCoreChoice({ core: 'acme', agents: {} });
  assert.equal(resolveCore().command, 'acme');
  // Workflow agents start the same program with the same server arguments.
  setCoreChoice({ core: 'beta', agents: { beta: { path: '/opt/beta/cli.js', runner: 'node' } } });
  assert.deepEqual(workflowCoreCommand(resolveCore()).args, ['/opt/beta/cli.js', 'serve', '--protocol', 'codex']);
  setCoreChoice({ core: 'acme', agents: { acme: { path: '/opt/acme/bin/acme' } } });
  const workflow = workflowCoreCommand(resolveCore());
  assert.deepEqual({ ...workflow, env: defined(workflow.env) }, { command: '/opt/acme/bin/acme', args: ['app-server', '--stdio'], env: { CODE_DESKTOP_CORE_ID: 'acme' }, workflowScripts: false });
  // Codex itself still gets its launch.
  setCoreChoice({ core: 'codex', agents: { codex: { path: '/opt/codex' } } });
  withEnv(t, { CODE_DESKTOP_CORE_SYSTEM_PATHS: '' });
  const codex = resolveCore();
  assert.equal(codex.kind, 'codex');
  assert.deepEqual(codex.args, ['-c', 'model_provider="codedesktop"']);
});

test('a native Extension Pack core never inherits the saved API keys, nor do its workflow runs', (t) => {
  withEnv(t, { CODE_DESKTOP_CORE: undefined, CODEX_BINARY: undefined, CODE_DESKTOP_CORE_SYSTEM_PATHS: '',
    DEEPSEEK_API_KEY: 'sk-deepseek', DEEPSEEK_BASE_URL: 'http://127.0.0.1:9/relay', CODE_DESKTOP_PROVIDER_KEY_ACME_CLOUD: 'sk-provider', HARNESS_MANAGED_X: 'secret' });
  // The Codex launch blanks the Harness-managed keys and carries the Codex endpoint key (model-settings codexLaunch).
  setCodexLaunch(() => ({ args: [], env: { DEEPSEEK_API_KEY: undefined, HARNESS_MANAGED_X: undefined, CODE_DESKTOP_CODEX_API_KEY: 'sk-codex' } }));
  registerCodexPack([{ id: 'acme', name: 'Acme Agent', kind: 'native', engine: 'acme', agent: { binary: 'acme' } }]);
  t.after(() => { registerCodexPack([]); setCoreChoice({}); setCodexLaunch(null); });
  for (const runner of [undefined, 'node']) {
    setCoreChoice({ core: 'acme', agents: { acme: { path: '/opt/acme/bin/acme', runner } } });
    const core = resolveCore(), workflow = workflowCoreCommand(core);
    for (const env of [core.env, workflow.env]) {
      const spawned = { ...process.env, ...env };
      for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'CODE_DESKTOP_PROVIDER_KEY_ACME_CLOUD', 'HARNESS_MANAGED_X', 'CODE_DESKTOP_CODEX_API_KEY'])
        assert.equal(spawned[key], undefined, `${key} (${runner ?? 'binary'})`);
      assert.equal(spawned.CODE_DESKTOP_CORE_ID, 'acme');
    }
  }
  // Without any Codex launch set (no Settings › Models yet), the DeepSeek connection and provider keys still stay out.
  setCodexLaunch(null);
  setCoreChoice({ core: 'acme', agents: { acme: { path: '/opt/acme/bin/acme' } } });
  const bare = { ...process.env, ...resolveCore().env };
  assert.equal(bare.DEEPSEEK_API_KEY, undefined);
  assert.equal(bare.DEEPSEEK_BASE_URL, undefined);
  assert.equal(bare.CODE_DESKTOP_PROVIDER_KEY_ACME_CLOUD, undefined);
});

test('only a native core’s auth-required refusal becomes the per-token empty usage; every other error comes through', () => {
  const apiKey = { account: { type: 'apiKey' }, requiresOpenaiAuth: true };
  const refusal = (message) => ({ code: -32600, message });
  // Codex 0.155.1 account_processor.rs: an API key, and no auth at all on a custom endpoint.
  assert.equal(perTokenRefusal('account/rateLimits/read', refusal('chatgpt authentication required to read rate limits'), { serverInfo: { engine: 'codex' }, account: apiKey }).codeDesktop.perTokenBilling, true);
  assert.equal(perTokenRefusal('account/usage/read', refusal('codex account authentication required to read token usage'), { serverInfo: {}, account: { account: null, requiresOpenaiAuth: false } }).codeDesktop.perTokenBilling, true, 'no engine report is Codex');
  // A native Extension Pack speaking the Codex protocol refuses the same way.
  registerCodexPack([{ id: 'acme', name: 'Acme Agent', kind: 'native', engine: 'acme', agent: { binary: 'acme' } }]);
  try {
    assert.ok(perTokenRefusal('account/usage/read', refusal('chatgpt authentication required to read token usage'), { serverInfo: { engine: 'acme' }, account: apiKey }));
    assert.equal(perTokenRefusal('account/usage/read', refusal('chatgpt authentication required to read token usage'), { serverInfo: { engine: 'acme', capabilities: { perTokenBilling: true } }, account: apiKey }), null, 'a core that meters its own usage answers itself');
  } finally { registerCodexPack([]); }
  // DeepSeek (builtin, per-token account) whose usage read fails (a log scan EACCES, bad prices): the error stays.
  const deepseek = { serverInfo: { engine: 'deepseek-harness' }, account: { account: null, requiresOpenaiAuth: false } };
  assert.equal(perTokenRefusal('account/usage/read', { code: -32603, message: 'EACCES: permission denied, scandir' }, deepseek), null);
  assert.equal(perTokenRefusal('account/usage/read', { code: -32602, message: 'Invalid codeDesktop.prices' }, deepseek), null);
  assert.equal(perTokenRefusal('account/usage/read', refusal('authentication required'), deepseek), null, 'a builtin core never');
  // Bridges (OpenCode API key, a signed-out ZCode) keep their errors too.
  for (const engine of ['opencode', 'zcode', 'kimi'])
    assert.equal(perTokenRefusal('account/rateLimits/read', refusal('authentication required'), { serverInfo: { engine }, account: apiKey }), null, engine);
  // Codex itself: any other error, or the refusal for a plan account, stays an error.
  assert.equal(perTokenRefusal('account/usage/read', { code: -32603, message: 'backend unavailable' }, { serverInfo: { engine: 'codex' }, account: apiKey }), null);
  assert.equal(perTokenRefusal('account/usage/read', refusal('chatgpt authentication required to read token usage'), { serverInfo: { engine: 'codex' }, account: { account: { type: 'chatgpt' }, requiresOpenaiAuth: true } }), null);
  assert.equal(perTokenRefusal('account/usage/read', new Error('Codex is not connected.'), { serverInfo: { engine: 'codex' }, account: apiKey }), null, 'a lost connection');
  // main.cjs asks perTokenRefusal with the requesting connection, and returns every other JSON-RPC error whole.
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /const empty = requester === client \? perTokenRefusal\(p\.method, error, \{ serverInfo: requester\.serverInfo, account: accountOperations\.accountSnapshot\(\) \}\) : null;\n\s+if \(empty\) return empty;/);
  assert.match(main, /return \{ __codeDesktopRpcError: \{ message: error\.message, code: error\.code, data: error\.data \?\? null \} \};/);
});

test('a per-token account gets empty usage answers; a signed-in plan account keeps the core’s answer', () => {
  assert.equal(perTokenAccount({ account: { type: 'apiKey' }, requiresOpenaiAuth: true }), true);
  assert.equal(perTokenAccount({ account: null, requiresOpenaiAuth: false }), true, 'a custom endpoint with no sign-in');
  assert.equal(perTokenAccount({ account: { type: 'chatgpt', planType: 'plus' }, requiresOpenaiAuth: true }), false);
  assert.equal(perTokenAccount({ account: null, requiresOpenaiAuth: true }), false, 'signed out is not per token');
  assert.equal(perTokenAccount(null), false);
  const limits = perTokenUsage('account/rateLimits/read', { account: { type: 'apiKey' } });
  assert.equal(limits.rateLimits, null);
  assert.equal(limits.rateLimitsByLimitId, null);
  assert.deepEqual(limits.codeDesktop, { perTokenBilling: true });
  const usage = perTokenUsage('account/usage/read', { account: { type: 'apiKey' } });
  assert.equal(usage.dailyUsageBuckets, null);
  assert.equal(usage.summary.lifetimeTokens, null);
  assert.equal(perTokenUsage('thread/list', { account: { type: 'apiKey' } }), null);
  assert.equal(perTokenUsage('account/rateLimits/read', { account: { type: 'chatgpt' } }), null);
  const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /perTokenAccount\(account\) \? \{ perTokenBilling: true \} : \{\}/);
});

test('model params reach every core with customization; prices only a core that reads them', () => {
  const config = { modelSettings: { params: { 'glm-5': { maxTokens: 4096, temperature: 0.2 } }, prices: { 'glm-5': { offPeak: { cacheHit: 0, cacheMiss: 1, output: 2 }, peak: { cacheHit: 0, cacheMiss: 1, output: 2 } } } } };
  let client = { serverInfo: { engine: 'zcode' } };
  const settings = createModelSettings({ getConfig: () => config, getClient: () => client });
  for (const engine of ['zcode', 'opencode', 'kimi', 'deepseek-harness']) {
    client = { serverInfo: { engine } };
    const params = { threadId: 't', codeDesktop: { customization: { instructions: 'x' } } };
    settings.decorate('turn/start', params);
    assert.deepEqual(params.codeDesktop.customization, { instructions: 'x', modelParams: { 'glm-5': { maxTokens: 4096, temperature: 0.2 } } }, engine);
  }
  // OpenCode bills per token but its bridge never reads price overrides: none are sent.
  client = { serverInfo: { engine: 'opencode' } };
  const usage = {};
  settings.decorate('account/usage/read', usage);
  assert.deepEqual(usage, {});
  // A bridge that reports capabilities.priceOverrides gets them, like DeepSeek.
  client = { serverInfo: { engine: 'opencode', capabilities: { priceOverrides: true } } };
  settings.decorate('account/usage/read', usage);
  assert.deepEqual(usage.codeDesktop.prices, config.modelSettings.prices);
  // Codex has no customization: nothing.
  client = { serverInfo: { engine: 'codex' } };
  const codex = { threadId: 't' };
  settings.decorate('turn/start', codex);
  assert.deepEqual(codex, { threadId: 't' });
});

const safeStorage = (available = () => true) => ({ isEncryptionAvailable: available, encryptString: (text) => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: (buffer) => Buffer.from(String(buffer).slice(4), 'base64').toString() });

test('the saved relay key goes only to the saved relay’s origin', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'relay-origin-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const profile = { setManagedRow: async () => {}, removeManagedRow: async () => {}, setCoreEnv: () => {} };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => ({ serverInfo: { engine: 'deepseek-harness' } }), getHarnessProfile: () => profile,
    safeStorage: safeStorage(), dir, relayProxy: { async start() { return 'http://127.0.0.1:1'; }, async stop() {} } });
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test' }, relayKey: 'sk-relay' });
  const realFetch = globalThis.fetch, calls = [];
  t.after(() => { globalThis.fetch = realFetch; });
  globalThis.fetch = async (url, init) => { calls.push([url, init.headers.authorization]); return { ok: true, json: async () => ({ data: [{ id: 'm' }] }) }; };
  for (const relayBaseURL of ['https://other.test', 'http://relay.test', 'https://relay.test:8443'])
    await assert.rejects(settings.run({ op: 'connection-models', relayBaseURL }), /relay’s API key/, relayBaseURL);
  assert.deepEqual(calls, [], 'the saved key never went to another origin');
  await settings.run({ op: 'connection-models', relayBaseURL: 'https://relay.test/anthropic' });
  await settings.run({ op: 'connection-models', relayBaseURL: 'https://other.test', relayKey: 'sk-other' });
  assert.deepEqual(calls, [['https://relay.test/anthropic/v1/models', 'Bearer sk-relay'], ['https://other.test/v1/models', 'Bearer sk-other']]);
});

test('a Codex endpoint save that can’t store its key changes nothing', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-keyfirst-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let encryption = true;
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => ({ serverInfo: { engine: 'codex' } }), getHarnessProfile: () => null,
    safeStorage: safeStorage(() => encryption), dir, setCodexLaunch: () => {}, codexCommand: () => null });
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai' } });
  const file = path.join(dir, 'codex/provider.json');
  const before = fs.readFileSync(file, 'utf8');
  encryption = false;
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1', models: ['relay-a'] }, apiKey: 'sk-x' }), /Secure storage/);
  assert.equal(fs.readFileSync(file, 'utf8'), before, 'provider.json still says OpenAI: custom mode is never saved keyless');
  assert.equal((await settings.run({ op: 'codex-provider-read' })).mode, 'openai');
});

test('a native Extension Pack whose initialize reports no engine is keyed as itself, never as Codex', (t) => {
  const { reportedServerInfo } = codexModule;
  const { coreForEngine, coreSupports } = require('../electron/core-registry.mjs');
  registerCodexPack([{ id: 'acme', name: 'Acme Agent', assistant: 'Acme', kind: 'native', engine: 'acme', agent: { binary: 'acme' }, implies: { customization: true } }]);
  t.after(() => registerCodexPack([]));
  const info = reportedServerInfo({ userAgent: 'acme/1.0', codexHome: '/x' }, 'acme');
  assert.equal(info.engine, 'acme');
  assert.equal(info.codexHome, '/x', 'the rest of the report is kept');
  assert.equal(coreForEngine(info.engine).id, 'acme');
  assert.equal(coreSupports(info, 'codexProvider'), false, 'no Codex capabilities are implied');
  // A reported engine, the Codex child, an override or fixture binary (no spawned core) stay as they are.
  assert.deepEqual(reportedServerInfo({ engine: 'kimi' }, 'acme'), { engine: 'kimi' });
  assert.deepEqual(reportedServerInfo({ userAgent: 'codex' }, 'codex'), { userAgent: 'codex' });
  assert.deepEqual(reportedServerInfo({ userAgent: 'x' }, null), { userAgent: 'x' });
  assert.deepEqual(reportedServerInfo({ userAgent: 'x' }, 'gone'), { userAgent: 'x' }, 'an unknown core id changes nothing');
  // A pack whose manifest engine names another core is keyed by its own id.
  registerCodexPack([{ id: 'beta', name: 'Beta', kind: 'native', engine: 'opencode', agent: { binary: 'beta' } }]);
  assert.equal(reportedServerInfo({}, 'beta').engine, 'beta');
});
