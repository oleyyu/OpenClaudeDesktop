import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { createModelSettings } = require('../electron/model-settings.cjs');

const tier = (cacheHit, cacheMiss, output) => ({ cacheHit, cacheMiss, output });
const deepseek = (request = async () => ({})) => ({ serverInfo: { engine: 'deepseek-harness' }, start: async () => {}, request });
const codex = (request = async () => { throw new Error('should not be called'); }) => ({ serverInfo: { engine: 'codex' }, start: async () => {}, request });

test('decorate adds modelParams to thread methods on the DeepSeek core only', () => {
  const config = { modelSettings: { params: { 'deepseek-flash': { maxTokens: 4096, temperature: 0.4, effort: 'max' } } } };
  let client = deepseek();
  const settings = createModelSettings({ getConfig: () => config, getClient: () => client });
  for (const method of ['thread/start', 'thread/resume', 'turn/start']) {
    const params = { threadId: 't', codeDesktop: { afterPlan: 'auto', customization: { instructions: 'hi' } } };
    settings.decorate(method, params);
    assert.deepEqual(params.codeDesktop, { afterPlan: 'auto', customization: { instructions: 'hi', modelParams: { 'deepseek-flash': { maxTokens: 4096, temperature: 0.4 } } } });
  }
  const none = createModelSettings({ getConfig: () => ({}), getClient: () => client });
  const params = {};
  none.decorate('turn/start', params);
  assert.deepEqual(params, { codeDesktop: { customization: { modelParams: null } } }, 'null clears a value the bridge holds');
  const other = {};
  settings.decorate('thread/list', other);
  assert.deepEqual(other, {});
  client = codex();
  const codexParams = { threadId: 't' };
  settings.decorate('turn/start', codexParams);
  settings.decorate('account/usage/read', codexParams);
  assert.deepEqual(codexParams, { threadId: 't' });
});

test('decorate sends modelParams on coreTakesModelParams: Qwen-shaped ids reach the bridge, modelParams:false opts out', () => {
  const config = { modelSettings: { params: { 'qwen3-coder-plus(openai)': { maxTokens: 4096 }, 'anthropic/claude@2026': { temperature: 0.2 } } } };
  let client = { serverInfo: { engine: 'qwen' }, start: async () => {}, request: async () => ({}) };
  const settings = createModelSettings({ getConfig: () => config, getClient: () => client });
  const params = {};
  settings.decorate('turn/start', params);
  assert.deepEqual(params, { codeDesktop: { customization: { modelParams: { 'qwen3-coder-plus(openai)': { maxTokens: 4096 }, 'anthropic/claude@2026': { temperature: 0.2 } } } } });
  // A customization core that declares it doesn't read modelParams (reported or implied) gets nothing.
  client = { serverInfo: { engine: 'qwen', capabilities: { modelParams: false } }, start: async () => {}, request: async () => ({}) };
  const optOut = { threadId: 't' };
  settings.decorate('turn/start', optOut);
  assert.deepEqual(optOut, { threadId: 't' });
  // An explicit modelParams:true wins over a missing customization.
  client = { serverInfo: { engine: 'some-bridge', capabilities: { modelParams: true } }, start: async () => {}, request: async () => ({}) };
  const optIn = {};
  settings.decorate('thread/start', optIn);
  assert.ok(optIn.codeDesktop?.customization?.modelParams?.['qwen3-coder-plus(openai)']);
});

test('decorate adds price overrides to account/usage/read', () => {
  const prices = { 'deepseek-flash': { offPeak: tier(0, 1, 2), peak: tier(0, 2, 4) } };
  let config = { modelSettings: { prices } };
  const settings = createModelSettings({ getConfig: () => config, getClient: () => deepseek() });
  const params = {};
  settings.decorate('account/usage/read', params);
  assert.deepEqual(params, { codeDesktop: { prices } });
  config = {};
  const reset = {};
  settings.decorate('account/usage/read', reset);
  assert.deepEqual(reset, { codeDesktop: { prices: null } });
});

test('official-prices reads codeDesktop/pricing/read; Codex or an old bridge is unsupported', async () => {
  const official = { 'deepseek-flash': { displayName: '4.1 Flash', offPeak: tier(0.02, 1, 4), peak: tier(0.04, 2, 8) } };
  const calls = [];
  const bridge = deepseek(async (method, params) => { calls.push([method, params]); return { official, aliases: { 'deepseek-v4-flash': 'deepseek-flash' }, pricingUrl: 'https://example.test/pricing', peakWindows: 'Beijing' }; });
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => bridge });
  assert.deepEqual(await settings.run({ op: 'official-prices' }), { official, aliases: { 'deepseek-v4-flash': 'deepseek-flash' }, pricingUrl: 'https://example.test/pricing', peakWindows: 'Beijing' });
  assert.deepEqual(calls, [['codeDesktop/pricing/read', {}]]);
  assert.deepEqual(await createModelSettings({ getConfig: () => ({}), getClient: () => codex() }).run({ op: 'official-prices' }), { unsupported: true });
  const old = deepseek(async () => { throw Object.assign(new Error('Method not found'), { code: -32601 }); });
  assert.deepEqual(await createModelSettings({ getConfig: () => ({}), getClient: () => old }).run({ op: 'official-prices' }), { unsupported: true });
  const broken = deepseek(async () => { throw new Error('boom'); });
  await assert.rejects(createModelSettings({ getConfig: () => ({}), getClient: () => broken }).run({ op: 'official-prices' }), /boom/);
  await assert.rejects(settings.run({ op: 'nope' }), /Unsupported/);
});

test('main.cjs wires the decorator before client.request and the desktop:call case', () => {
  const main = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /const \{ createModelSettings \} = require\("\.\/model-settings\.cjs"\);/);
  // decorate, then the collaboration mode (it reads the decorated model), both before client.request.
  const rpc = main.slice(main.indexOf('async function requestRpc('), main.indexOf('ipcMain.handle("desktop:call"'));
  const at = text => { const index = rpc.indexOf(text); assert.ok(index > 0, text); return index; };
  assert.ok(at('modelSettings.decorate(p.method, params);') < at('nativeCollaborationMode(params,'));
  // The request now goes through `requester` (the client captured for this call) with the expected-connection guard;
  // default timeout spelled out (codex.cjs request(method, params, timeout = 120000, connection)). Same ordering.
  assert.ok(at('nativeCollaborationMode(params,') < at('result = await requester.request(p.method, params, 120000, expectedConnection ?? undefined);'));
  assert.match(main, /case "model-settings": return modelSettings\.run\(p\);/);
});

test('Settings › Models server-renders per-model rows and the price table on DeepSeek; Codex gets its endpoint and model list', async (t) => {
  const path = await import('node:path');
  const app = path.resolve(import.meta.dirname, '..');
  const React = (await import('react')).default;
  const { renderToStaticMarkup: render } = await import('react-dom/server');
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  const server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  t.after(() => server.close());
  const { SourceModelsSettings, CodexConnectionGroup } = await server.ssrLoadModule('/src/source-settings-models.jsx');
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  t.after(() => i18n.setLocale('en-US'));
  const models = [{ model: 'deepseek-flash', displayName: '4.1 Flash', defaultReasoningEffort: 'high', supportedReasoningEfforts: [{ reasoningEffort: 'off' }, { reasoningEffort: 'high' }, { reasoningEffort: 'max' }] }];
  const config = { modelSettings: { params: { 'deepseek-flash': { maxTokens: 8192, temperature: 0.3, effort: 'max' } }, prices: { 'my-model': { displayName: 'Mine', offPeak: tier(0, 1, 2), peak: tier(0, 2, 4) } } } };
  const page = (engine, list = models, extra = {}) => render(React.createElement(SourceModelsSettings, { config, boot: { connected: true, models: list }, engine, desktopCall: async () => ({ unsupported: true }), onSave: async () => {}, ...extra }));
  // DeepSeek (providerSettings): unchanged.
  const html = page('deepseek');
  // Per-model options sit on the page (not under Advanced), one collapsible entry per model.
  assert.match(html, /<h3[^>]*>Models<\/h3>/);
  assert.match(html, /data-model-options="deepseek-flash"[\s\S]*4\.1 Flash/);
  assert.match(html, /<input type="number"[^>]*aria-label="4.1 Flash max output tokens"[^>]*value="8192"/);
  assert.match(html, /aria-label="4.1 Flash temperature"[^>]*value="0.3"/);
  assert.match(html, /aria-label="4.1 Flash default reasoning effort"[^>]*data-value="max"/);
  assert.ok(html.includes('top_p is not supported by the DeepSeek Harness adapter.'));
  assert.match(html, /aria-label="Mine off-peak cache miss price"[^>]*value="1"/);
  assert.match(html, /Reset to official prices<\/span><\/button>/);
  const reset = /<button[^>]*>(?:(?!<button).)*Reset to official prices/.exec(html)[0];
  assert.doesNotMatch(reset.slice(0, reset.indexOf('>')), /disabled/, 'custom prices can be reset');
  assert.ok(html.includes('Showing DeepSeek’s official prices.') || html.includes('Your prices replace the official ones.'));
  assert.ok(html.includes('API connection') && html.includes('aria-label="API provider"'), 'the connection group renders first');
  assert.match(html, /aria-label="DeepSeek API key"/);
  assert.ok(page('deepseek', models, { onQuickSetup() {} }).includes('Quick setup…'));
  for (const gone of ['manages its own connection', 'aria-label="Codex provider"', 'data-models-layout']) assert.equal(html.includes(gone), false, gone);
  const plain = render(React.createElement(SourceModelsSettings, { config: {}, boot: { connected: true, models }, engine: 'deepseek', desktopCall: async () => ({ unsupported: true }), onSave: async () => {} }));
  assert.ok(plain.includes('Advanced') && plain.includes('Pricing and custom providers'));
  assert.equal(plain.includes('Add model price'), false, 'Advanced (pricing, providers) starts closed when nothing in it was changed');
  assert.ok(plain.includes('aria-label="4.1 Flash max output tokens"'), 'per-model options are visible outside Advanced');
  assert.ok(plain.includes('aria-label="4.1 Flash display name"') && plain.includes('aria-label="4.1 Flash image input"'));

  // Codex (codexProvider): the endpoint group and the running core's models; no DeepSeek connection, prices,
  // providers, Quick setup, Advanced or customization-only fields.
  const gpt = [
    { id: 'gpt-6-astra', model: 'gpt-6-astra', displayName: 'GPT-6 Astra', description: 'Frontier agentic coding.', isDefault: true, defaultReasoningEffort: 'low',
      supportedReasoningEfforts: ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'].map(reasoningEffort => ({ reasoningEffort })), serviceTiers: [{ id: 'priority', name: 'Fast', description: '2x' }] },
    { id: 'gpt-5.5', model: 'gpt-5.5', displayName: 'GPT-5.5', defaultReasoningEffort: 'medium', supportedReasoningEfforts: ['low', 'medium', 'high', 'xhigh'].map(reasoningEffort => ({ reasoningEffort })), serviceTiers: [] },
    { id: 'helper', model: 'codex-auto-review', displayName: 'Hidden helper', hidden: true, supportedReasoningEfforts: [] },
  ];
  const codex = page('codex', gpt, { onQuickSetup() {} });
  assert.match(codex, /data-models-layout="codex"/);
  assert.match(codex, /role="radiogroup" aria-label="Codex provider"/);
  assert.match(codex, /aria-label="OpenAI"[^>]*aria-checked="true"/, 'OpenAI until the saved endpoint is read');
  assert.match(codex, /aria-label="Custom endpoint"/);
  assert.match(codex, /<h3[^>]*>Codex models<\/h3>/);
  assert.match(codex, /GPT-6 Astra<span class="msx-badge">Default<\/span>/);
  assert.equal((codex.match(/>Default<\/span>/g) || []).length, 1, 'only the catalog default carries the badge');
  assert.ok(codex.includes('Frontier agentic coding.'));
  assert.match(codex, /<span data-top-tier="true">Ultra<\/span>/, 'the efforts list Ultra, in the top-tier accent');
  assert.equal((codex.match(/Fast available/g) || []).length, 1);
  assert.equal(codex.includes('Hidden helper'), false, 'hidden catalog entries are not listed');
  for (const name of ['GPT-6 Astra', 'GPT-5.5']) {
    const select = new RegExp(`<button[^>]*role="combobox"[^>]*aria-label="${name.replace('.', '\\.')} default reasoning effort"[^>]*>`).exec(codex)?.[0];
    assert.ok(select, name);
    assert.doesNotMatch(select, /disabled/, `${name} default effort is editable`);
  }
  for (const gone of ['aria-label="API provider"', 'DeepSeek API key', '>Pricing<', 'Custom providers', 'Quick setup', 'Advanced', 'max output tokens', 'temperature', 'apply with DeepSeek Harness', 'manages its own connection'])
    assert.equal(codex.includes(gone), false, gone);
  assert.equal(page(undefined, gpt).includes('aria-label="Codex provider"'), true, 'no engine is Codex');

  // A core with neither connection capability: a one-line notice naming it and its models. A customization core
  // also gets Max output tokens and Temperature (decorate() sends modelParams to every customization core); a
  // reported customization:false (ZCode without a provider proxy) drops them. Prices only where they are read: the
  // providerSettings bridge, never perTokenBilling alone (OpenCode and MiMo price usage themselves).
  const zcode = page('zcode', gpt);
  assert.ok(zcode.includes('ZCode manages its own connection and prices.'));
  assert.match(zcode, /<h3[^>]*>ZCode models<\/h3>/);
  for (const core of ['zcode', 'opencode', 'gemini']) {
    const html = page(core, gpt);
    assert.match(html, /<input type="number"[^>]*aria-label="GPT-6 Astra max output tokens"/, `${core}: max output tokens`);
    assert.match(html, /aria-label="GPT-5\.5 temperature"/, `${core}: temperature`);
    assert.match(html, /data-model-options="gpt-6-astra"(?:(?!data-model-options=).)*data-setting-id="model-gpt-6-astra-maxTokens"/s, `${core}: the param rows sit under their model`);
  }
  const noProxy = render(React.createElement(SourceModelsSettings, { config, boot: { connected: true, models: gpt, core: { engine: 'zcode', capabilities: { customization: false } } }, desktopCall: async () => ({ unsupported: true }), onSave: async () => {} }));
  assert.equal(noProxy.includes('max output tokens') || noProxy.includes('temperature'), false, 'reported customization:false wins');
  // Qwen lists `${id}(${authType})` ids: the param rows render for them and keep the id intact.
  const qwenModels = [{ id: 'qwen3-coder-plus(openai)', model: 'qwen3-coder-plus(openai)', displayName: 'Qwen3 Coder Plus', isDefault: true, supportedReasoningEfforts: [] }];
  const qwen = page('qwen', qwenModels);
  assert.match(qwen, /<input type="number"[^>]*aria-label="Qwen3 Coder Plus max output tokens"/, 'qwen: max output tokens');
  assert.match(qwen, /data-setting-id="model-qwen3-coder-plus\(openai\)-temperature"/, 'qwen: temperature keyed by the listed id');
  // A core declaring modelParams:false (a customization bridge that never reads them) shows no rows it would ignore.
  const ignores = render(React.createElement(SourceModelsSettings, { config, boot: { connected: true, models: gpt, core: { engine: 'qwen', capabilities: { modelParams: false } } }, desktopCall: async () => ({ unsupported: true }), onSave: async () => {} }));
  assert.equal(ignores.includes('max output tokens') || ignores.includes('temperature'), false, 'modelParams:false drops the rows');
  assert.ok(ignores.includes('GPT-6 Astra'), 'the models are still listed');
  assert.equal(zcode.includes('aria-label="Codex provider"') || zcode.includes('>Pricing<'), false);
  for (const core of ['opencode', 'mimo']) assert.equal(page(core, gpt).includes('>Pricing<'), false, `${core}: perTokenBilling alone shows no unread prices`);

  // Custom mode: Base URL (/responses added), write-only key (only "Saved"), model ids, web search off, Test,
  // the Chat Completions caveat and Remove endpoint.
  const custom = render(React.createElement(CodexConnectionGroup, { core: 'Codex', desktopCall: async () => ({}),
    initialView: { available: true, mode: 'custom', baseURL: 'https://relay.example.com/v1', models: ['relay-a', 'relay-b'], webSearch: false, hasKey: true } }));
  assert.match(custom, /aria-label="Endpoint base URL"[^>]*value="https:\/\/relay\.example\.com\/v1"/);
  assert.ok(custom.includes('/responses is added'));
  assert.match(custom, /type="password" aria-label="Endpoint API key"[^>]*placeholder="•••••••• Saved" value=""/);
  assert.match(custom, /aria-label="Endpoint model ids"[^>]*>relay-a\nrelay-b<\/textarea>/);
  assert.match(custom, /role="switch" aria-label="Web search" aria-checked="false"/);
  assert.ok(custom.includes('>Test connection<') && custom.includes('>Fetch from endpoint<') && custom.includes('>Remove endpoint<'));
  assert.ok(custom.includes('Sends one small request to /responses.'));
  assert.ok(custom.includes('Codex speaks only the OpenAI Responses API') && custom.includes('custom provider on DeepSeek Harness'));
  assert.match(custom, /<button disabled="" type="submit"[^>]*>(?:(?!<\/button>).)*Save/, 'nothing to save until something changes');
  const openai = render(React.createElement(CodexConnectionGroup, { core: 'Codex', desktopCall: async () => ({}), initialView: { available: true, mode: 'openai', baseURL: '', models: [], webSearch: false, hasKey: false } }));
  assert.equal(openai.includes('Endpoint base URL') || openai.includes('Remove endpoint') || openai.includes('Responses API'), false, 'OpenAI mode shows only the provider choice');

  // zh-CN: the new copy resolves.
  i18n.setLocale('zh-CN');
  const zh = page('codex', gpt);
  assert.ok(zh.includes('Codex 模型') && zh.includes('支持快速模式') && zh.includes('推理强度') && zh.includes('自定义端点'), zh.slice(0, 400));
  const zhCustom = render(React.createElement(CodexConnectionGroup, { core: 'Codex', desktopCall: async () => ({}),
    initialView: { available: true, mode: 'custom', baseURL: 'https://relay.example.com/v1', models: ['relay-a'], webSearch: false, hasKey: true } }));
  assert.ok(zhCustom.includes('测试连接') && zhCustom.includes('端点 API 密钥') && zhCustom.includes('只支持 OpenAI Responses API'));
});

test('custom providers: definitions on disk, keys encrypted, one managed overlay row and env per route', async (t) => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-settings-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const rows = new Map(), env = new Map();
  const profile = { setManagedRow: async (id, row) => { rows.set(id, row); }, removeManagedRow: async id => { rows.delete(id); }, setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); } };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir });
  assert.deepEqual(await settings.run({ op: 'providers-read' }), { available: true, protocols: ['openai-completions', 'openai-responses', 'anthropic-messages'], providers: [] });
  const saved = await settings.run({ op: 'provider-save', provider: { route: 'gw', baseURL: 'https://gw.example.com/v1', models: ['m1'] }, apiKey: 'sk-secret' });
  assert.deepEqual(saved.providers, [{ route: 'gw', api: 'openai-completions', baseURL: 'https://gw.example.com/v1', models: ['m1'], keyEnv: 'CODE_DESKTOP_PROVIDER_KEY_GW', hasKey: true }]);
  assert.equal(JSON.stringify(saved).includes('sk-secret'), false, 'the key never goes back to the renderer');
  assert.equal(fs.readFileSync(path.join(dir, 'providers.json'), 'utf8').includes('sk-secret'), false);
  assert.equal(fs.readFileSync(path.join(dir, 'provider-keys.bin'), 'utf8').includes('sk-secret'), false);
  assert.equal(rows.get('llm-pi-ai').config.providers.gw.apiKeyEnv, 'CODE_DESKTOP_PROVIDER_KEY_GW');
  assert.equal(env.get('CODE_DESKTOP_PROVIDER_KEY_GW'), 'sk-secret');
  // Rename keeps the key; an empty apiKey keeps it.
  await settings.run({ op: 'provider-save', previousRoute: 'gw', provider: { route: 'gw2', baseURL: 'https://gw.example.com/v1', models: ['m1', 'm2'] }, apiKey: '' });
  assert.equal(env.get('CODE_DESKTOP_PROVIDER_KEY_GW'), undefined);
  assert.equal(env.get('CODE_DESKTOP_PROVIDER_KEY_GW2'), 'sk-secret');
  assert.deepEqual(Object.keys(rows.get('llm-pi-ai').config.providers), ['gw2']);
  await assert.rejects(settings.run({ op: 'provider-save', provider: { route: 'deepseek', baseURL: 'https://x.test', models: ['m'] } }), /built-in/);
  const removed = await settings.run({ op: 'provider-remove', route: 'gw2' });
  assert.deepEqual(removed.providers, []);
  assert.equal(rows.has('llm-pi-ai'), false);
  assert.equal(env.size, 0);
  assert.equal(fs.existsSync(path.join(dir, 'provider-keys.bin')), false);
  // Without Settings › Harness the feature is unavailable.
  const bare = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), safeStorage, dir });
  assert.equal((await bare.run({ op: 'providers-read' })).available, false);
  await assert.rejects(bare.run({ op: 'provider-save', provider: { route: 'gw', baseURL: 'https://gw.example.com/v1', models: ['m1'] }, apiKey: 'k' }), /Harness/);
});

test('API connection: official or relay, keys encrypted, exported as DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL', async (t) => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-connection-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const saved = { key: process.env.DEEPSEEK_API_KEY, url: process.env.DEEPSEEK_BASE_URL };
  delete process.env.DEEPSEEK_API_KEY; delete process.env.DEEPSEEK_BASE_URL;
  t.after(() => { if (saved.key !== undefined) process.env.DEEPSEEK_API_KEY = saved.key; if (saved.url !== undefined) process.env.DEEPSEEK_BASE_URL = saved.url; });
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const env = new Map();
  const profile = { setManagedRow: async () => {}, removeManagedRow: async () => {}, setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); } };
  const forwarder = { calls: [], async start(url) { this.calls.push(['start', url]); return 'http://127.0.0.1:4321/anthropic'; }, async stop() { this.calls.push(['stop']); } };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder });
  assert.deepEqual(await settings.run({ op: 'connection-read' }), { available: true, mode: 'official', relayBaseURL: '', relayModels: [], relayImageModels: [], officialKey: false, relayKey: false, inheritedKey: false });
  let view = await settings.run({ op: 'connection-save', connection: { mode: 'official' }, officialKey: 'sk-official' });
  assert.equal(view.officialKey, true);
  assert.equal(JSON.stringify(view).includes('sk-official'), false);
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-official');
  assert.equal(env.has('DEEPSEEK_BASE_URL'), false);
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' } }), /relay’s API key/);
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'mailto:x' }, relayKey: 'k' }), /https/);
  view = await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic/' }, relayKey: 'sk-relay' });
  assert.deepEqual(view, { available: true, mode: 'relay', relayBaseURL: 'https://relay.test/anthropic', relayModels: [], relayImageModels: [], officialKey: true, relayKey: true, inheritedKey: false });
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-relay');
  assert.equal(env.get('DEEPSEEK_BASE_URL'), 'http://127.0.0.1:4321/anthropic', 'the core talks to the loopback forwarder');
  assert.deepEqual(forwarder.calls.at(-1), ['start', 'https://relay.test/anthropic']);
  assert.equal(fs.readFileSync(path.join(dir, 'provider-keys.bin'), 'utf8').includes('sk-'), false);
  // Back to official keeps both keys; removing the official key falls back to ~/.dsh.
  await settings.run({ op: 'connection-save', connection: { mode: 'official' } });
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-official');
  assert.equal(env.has('DEEPSEEK_BASE_URL'), false);
  view = await settings.run({ op: 'connection-save', officialKey: null });
  assert.equal(view.officialKey, false);
  assert.equal(view.relayKey, true);
  assert.equal(env.has('DEEPSEEK_API_KEY'), false);
  // Provider routes never see the reserved key names.
  assert.deepEqual((await settings.run({ op: 'providers-read' })).providers, []);
});

test('relay models replace the llm-deepseek catalog; connection-models reads the relay /v1/models', async (t) => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-relay-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const rows = new Map();
  const profile = { setManagedRow: async (id, row) => { rows.set(id, row); }, removeManagedRow: async id => { rows.delete(id); }, setCoreEnv: () => {} };
  const forwarder = { async start() { return 'http://127.0.0.1:4321'; }, async stop() {} };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder });
  const view = await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test', relayModels: 'deepseek-v4.1-flash\nglm-5.2, glm-5.2' }, relayKey: 'sk-relay' });
  assert.deepEqual(view.relayModels, ['deepseek-v4.1-flash', 'glm-5.2']);
  assert.deepEqual(rows.get('llm-deepseek'), { config: { models: [{ id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash' }, { id: 'glm-5.2', name: 'GLM 5.2' }] } });
  await settings.run({ op: 'connection-save', connection: { mode: 'official' } });
  assert.equal(rows.has('llm-deepseek'), false, 'the official API keeps the built-in catalog');
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test', relayModels: 'bad id!' } }), /Invalid model id/);
  const realFetch = globalThis.fetch, calls = [];
  t.after(() => { globalThis.fetch = realFetch; });
  globalThis.fetch = async (url, init) => { calls.push([url, init.headers.authorization]); return { ok: true, json: async () => ({ data: [{ id: 'glm-5.2' }, { id: 'deepseek-v4-pro' }] }) }; };
  assert.deepEqual(await settings.run({ op: 'connection-models', relayBaseURL: 'https://relay.test/' }), { models: ['glm-5.2', 'deepseek-v4-pro'] });
  assert.deepEqual(calls, [['https://relay.test/v1/models', 'Bearer sk-relay']], 'the saved relay key, /v1 added once');
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  await assert.rejects(settings.run({ op: 'connection-models', relayBaseURL: 'https://relay.test/v1', relayKey: 'typed' }), /401/);
});

test('relay forwarder renames <system-reminder> in request bodies and streams the reply back', async (t) => {
  const http = await import('node:http');
  const { createRelayProxy, rewriteBody } = require('../electron/relay-proxy.cjs');
  assert.equal(rewriteBody('a<system-reminder>x</system-reminder>b'), 'a<system_reminder>x</system_reminder>b');
  const seen = [];
  const relay = http.createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    seen.push({ url: req.url, key: req.headers['x-api-key'], body: Buffer.concat(chunks).toString() });
    res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write('data: one\n\n'); setTimeout(() => res.end('data: two\n\n'), 20);
  });
  await new Promise(resolve => relay.listen(0, '127.0.0.1', resolve));
  const proxy = createRelayProxy();
  t.after(async () => { await proxy.stop(); relay.close(); });
  const base = await proxy.start(`http://127.0.0.1:${relay.address().port}/anthropic/`);
  assert.match(base, /^http:\/\/127\.0\.0\.1:\d+\/anthropic$/);
  const response = await fetch(`${base}/v1/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': 'k' }, body: JSON.stringify({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }, { type: 'text', text: '<system-reminder>skills</system-reminder>' }] }] }) });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'data: one\n\ndata: two\n\n');
  assert.equal(seen[0].url, '/anthropic/v1/messages');
  assert.equal(seen[0].key, 'k');
  assert.ok(seen[0].body.includes('<system_reminder>skills</system_reminder>') && !seen[0].body.includes('<system-reminder>'));
});

// Settings › Models on the Codex core: OpenAI or a custom Responses endpoint (prefs/codex-provider.mjs).
test('Codex endpoint: key encrypted under @codex, launch env scoped to Codex, catalog, never the key in args', async (t) => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-codex-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const coreEnv = [];
  const profile = { setManagedRow: async () => {}, removeManagedRow: async () => {}, setCoreEnv: (key, value) => coreEnv.push([key, value]), coreEnvKeys: () => ({ CODE_DESKTOP_PROVIDER_KEY_GW: 'k', DEEPSEEK_API_KEY: 'd' }) };
  let launch = null, catalogCalls = 0, catalogFails = false;
  const bundled = { models: [{ slug: 'gpt-6-astra', visibility: 'list', priority: 1, base_instructions: 'b' }, { slug: 'gpt-5.5', visibility: 'list', priority: 12, base_instructions: 'b55', model_messages: {} }] };
  const command = path.join(dir, 'codex-bin'); fs.writeFileSync(command, '');
  let client = codex();
  // Thread 't' was recorded under the custom endpoint, 'own' under the user's own config.toml provider.
  const appConfig = { threadMetadata: { t: { modelProvider: 'codedesktop' }, own: { modelProvider: 'azure' } } };
  const settings = createModelSettings({ getConfig: () => appConfig, getClient: () => client, getHarnessProfile: () => profile, safeStorage, dir,
    setCodexLaunch: value => { launch = value; }, codexCommand: () => command,
    readBundledCatalog: async (binary, env) => { catalogCalls++; assert.equal(binary, command); assert.equal(env.DEEPSEEK_API_KEY, undefined); if (catalogFails) throw new Error('no'); return bundled; } });
  assert.deepEqual(await settings.run({ op: 'codex-provider-read' }), { available: true, mode: 'openai', baseURL: '', models: [], webSearch: false, hasKey: false });
  // decorate: nothing is named before an endpoint is saved.
  const before = { threadId: 't' };
  settings.decorate('thread/resume', before);
  assert.deepEqual(before, { threadId: 't' });
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1', models: ['relay-a'] } }), /API key/);
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1' }, apiKey: 'sk-codex' }), /model id/);
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1', models: ['relay-a'], wireApi: 'chat' }, apiKey: 'sk-codex' }), /Responses API/);
  const view = await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1/', models: ['relay-a', 'relay-b'] }, apiKey: 'sk-codex' });
  assert.deepEqual(view, { available: true, mode: 'custom', baseURL: 'https://relay.test/v1', models: ['relay-a', 'relay-b'], webSearch: false, hasKey: true, pending: true });
  assert.equal(JSON.stringify(view).includes('sk-codex'), false, 'the key never goes back');
  assert.equal(fs.readFileSync(path.join(dir, 'codex/provider.json'), 'utf8').includes('sk-codex'), false);
  assert.equal(fs.readFileSync(path.join(dir, 'provider-keys.bin'), 'utf8').includes('sk-codex'), false);
  assert.equal(JSON.parse(safeStorage.decryptString(fs.readFileSync(path.join(dir, 'provider-keys.bin'))))['@codex'], 'sk-codex');
  assert.equal(coreEnv.some(([, value]) => value === 'sk-codex'), false, 'the Codex key never enters the shared core environment');
  assert.equal(typeof launch, 'function', 'codex.cjs reads the launch at each spawn');
  let current = launch();
  // Saved but not restarted: the running child has no codedesktop table, so resume / fork name no provider
  // (Codex 0.155.1 answers "Model provider `codedesktop` not found"); nor does a CODEX_BINARY / options.binary child.
  const customArgs = [...current.args];
  const spawned = args => ({ ...codex(), child: { spawnargs: ['codex', 'app-server', '--stdio', ...args] } });
  for (const method of ['thread/resume', 'thread/fork']) assert.deepEqual(settings.decorateThread(method, { threadId: 't' }, spawned([])), { threadId: 't' }, `${method} before the restart`);
  assert.equal(settings.decorateThread('thread/resume', { threadId: 't' }, spawned(customArgs)).modelProvider, 'codedesktop', 'after the restart');
  assert.deepEqual(settings.decorateThread('thread/resume', { threadId: 't' }, { ...codex(), options: { binary: '/fixture' } }), { threadId: 't' });
  const override = process.env.CODEX_BINARY;
  process.env.CODEX_BINARY = '/fixture/server';
  try { assert.deepEqual(settings.decorateThread('thread/resume', { threadId: 't' }), { threadId: 't' }, 'CODEX_BINARY never gets the launch args'); }
  finally { if (override === undefined) delete process.env.CODEX_BINARY; else process.env.CODEX_BINARY = override; }
  assert.equal(current.env.CODE_DESKTOP_CODEX_API_KEY, 'sk-codex');
  for (const key of ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL', 'CODE_DESKTOP_PROVIDER_KEY_GW']) assert.ok(Object.hasOwn(current.env, key) && current.env[key] === undefined, `${key} is removed`);
  assert.equal(JSON.stringify(current.args).includes('sk-codex'), false);
  const catalogPath = path.join(dir, 'codex/model-catalog.json');
  assert.ok(current.args.includes(`model_catalog_json="${catalogPath}"`));
  assert.deepEqual(JSON.parse(fs.readFileSync(catalogPath, 'utf8')).models.filter(model => model.visibility === 'list').map(model => model.slug), ['relay-a', 'relay-b']);
  assert.equal(catalogCalls, 1);
  assert.equal(settings.codexCustomModels(), null, 'a built catalog lists the ids itself');
  await settings.ready();
  assert.equal(catalogCalls, 1, 'cached for the same binary');
  // decorate on Codex: the custom provider on resume / fork, every provider on thread/list; explicit values win.
  for (const method of ['thread/resume', 'thread/fork']) { const params = { threadId: 't' }; settings.decorate(method, params); assert.equal(params.modelProvider, 'codedesktop'); }
  const explicit = { threadId: 't', modelProvider: 'openai' };
  settings.decorate('thread/resume', explicit);
  assert.equal(explicit.modelProvider, 'openai');
  const listed = { limit: 10 };
  settings.decorate('thread/list', listed);
  assert.deepEqual(listed, { limit: 10, modelProviders: [] });
  const turn = { threadId: 't' };
  settings.decorate('turn/start', turn);
  settings.decorate('thread/start', turn);
  assert.deepEqual(turn, { threadId: 't' }, 'thread/start and turn/start stay untouched');
  assert.deepEqual(settings.decorateThread('thread/resume', { threadId: 't' }, deepseek()), { threadId: 't' }, 'other cores are untouched');
  client = deepseek();
  const ds = { threadId: 't' };
  settings.decorate('thread/resume', ds);
  assert.equal('modelProvider' in ds, false);
  client = codex();
  // OpenAI mode keeps the endpoint defined; a catalog failure means no catalog arg.
  catalogFails = true; fs.writeFileSync(command, 'changed');
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai' } });
  current = launch();
  assert.equal(current.args.length, 4, 'only the provider table and the blank key');
  assert.equal(settings.codexCustomModels(), null, 'OpenAI mode keeps model/list');
  assert.equal(current.env.CODE_DESKTOP_CODEX_API_KEY, undefined, 'the key stays out of Codex while OpenAI is chosen');
  const resumed = { threadId: 't' };
  settings.decorate('thread/resume', resumed);
  assert.equal(resumed.modelProvider, 'openai');
  // OpenAI mode moves only threads recorded under the endpoint: the user's own provider and an unknown thread stay.
  for (const threadId of ['own', 'unknown']) for (const method of ['thread/resume', 'thread/fork']) {
    const params = { threadId }; settings.decorate(method, params);
    assert.equal('modelProvider' in params, false, `${method} ${threadId} keeps its own provider`);
  }
  // An invalid base URL is rejected in OpenAI mode too, and the saved endpoint survives the attempt.
  await assert.rejects(settings.run({ op: 'codex-provider-save', provider: { mode: 'openai', baseURL: 'htps//typo' } }), /endpoint URL/);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).baseURL, 'https://relay.test/v1');
  assert.equal(settings.decorateThread('thread/resume', { threadId: 't' }, spawned(customArgs)).modelProvider, 'codedesktop', 'a custom child not yet restarted keeps its endpoint');
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom' } });
  assert.ok(launch().args.includes(`model_catalog_json="${catalogPath}"`), 'the last catalog still lists exactly these ids');
  assert.equal(settings.codexCustomModels(), null);
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', models: ['relay-a'] } });
  current = launch();
  assert.equal(current.args.some(arg => arg.startsWith('model_catalog_json')), false, 'a failed build for other ids gives no catalog');
  assert.ok(current.args.includes('model="relay-a"'));
  // No catalog: connect() must list (and reconcile against) these ids, not model/list's bundled OpenAI models.
  assert.deepEqual(settings.codexCustomModels(), { ids: ['relay-a'], template: 'gpt-5.5' });
  await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', models: ['relay-a', 'relay-b'] } });
  // Probes use the saved key and URL when none are typed.
  const realFetch = globalThis.fetch, calls = [];
  t.after(() => { globalThis.fetch = realFetch; });
  globalThis.fetch = async (url, init) => { calls.push([url, init.headers.authorization, init.body && JSON.parse(init.body).model]); return { ok: true, json: async () => ({ data: [{ id: 'relay-c' }] }) }; };
  assert.deepEqual(await settings.run({ op: 'codex-provider-models' }), { models: ['relay-c'] });
  assert.equal((await settings.run({ op: 'codex-provider-test' })).ok, true);
  assert.deepEqual(calls, [['https://relay.test/v1/models', 'Bearer sk-codex', undefined], ['https://relay.test/v1/responses', 'Bearer sk-codex', 'relay-a']]);
  await assert.rejects(settings.run({ op: 'codex-provider-test', baseURL: 'https://u:p@relay.test' }), /credentials/);
  // The saved key goes only to the saved origin: another host, or http for https, needs its own typed key.
  calls.length = 0;
  for (const baseURL of ['https://relay-b.test/v1', 'http://relay.test/v1', 'https://relay.test:8443/v1']) {
    await assert.rejects(settings.run({ op: 'codex-provider-models', baseURL }), /Enter the API key/, baseURL);
    await assert.rejects(settings.run({ op: 'codex-provider-test', baseURL, model: 'relay-a' }), /Enter the API key/, baseURL);
  }
  assert.deepEqual(calls, [], 'no request carries the saved key to another origin');
  assert.deepEqual(await settings.run({ op: 'codex-provider-models', baseURL: 'https://relay.test/other' }), { models: ['relay-c'] });
  assert.deepEqual(await settings.run({ op: 'codex-provider-models', baseURL: 'https://relay-b.test/v1', apiKey: 'sk-b' }), { models: ['relay-c'] });
  assert.deepEqual(calls.map(([url, auth]) => [url, auth]), [['https://relay.test/other/models', 'Bearer sk-codex'], ['https://relay-b.test/v1/models', 'Bearer sk-b']]);
  // Removing the key and the endpoint returns Codex to its own launch.
  const cleared = await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai', baseURL: '' }, apiKey: null });
  assert.equal(cleared.hasKey, false);
  current = launch();
  assert.deepEqual(current.args, []);
  assert.equal(settings.codexCustomModels(), null);
  assert.equal(current.env.CODE_DESKTOP_CODEX_API_KEY, undefined);
  const after = { threadId: 't' };
  settings.decorate('thread/resume', after);
  assert.equal('modelProvider' in after, false);
  // Without setCodexLaunch (no Codex launch hook) the endpoint can't be saved.
  const bare = createModelSettings({ getConfig: () => ({}), getClient: () => codex(), safeStorage, dir });
  assert.equal((await bare.run({ op: 'codex-provider-read' })).available, false);
  await assert.rejects(bare.run({ op: 'codex-provider-save', provider: { mode: 'openai' } }), /can’t be changed/);
});

test('main.cjs gives model-settings the Codex launch hook and reconciles the default model on connect', () => {
  const main = readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
  assert.match(main, /setCodexLaunch, codexCommand: codexBinary \}\);/);
  // The agent tools (agent-tools-host.cjs) add the session identity on top of model-settings' own decoration.
  assert.match(main, /decorateThread: \(method, params, owner\) => decorateAgentTools\(method, modelSettings\.decorateThread\(method, params, owner\) \?\? params, owner\)/);
  const connect = main.slice(main.indexOf('async function connect()'), main.indexOf('connecting = attempt;'));
  // A Codex custom endpoint without its catalog: its own ids replace model/list's bundled ones before reconciling.
  assert.match(connect, /const custom = initial\.core\.id === "codex" \? modelSettings\.codexCustomModels\?\.\(\) : null;\n\s+if \(custom\?\.ids\.length\) initial\.models = coreModel\.customCatalogModels\(custom\.ids, initial\.models, \{ template: custom\.template \}\);/);
  // Otherwise the model of the user's own config.toml (config/read) is merged in before reconciling, never replaced.
  assert.match(connect, /if \(initial\.core\.id === "codex" && !custom\?\.ids\.length\) \{\n\s+const codexConfig = await owner\.request\("config\/read"/);
  assert.match(connect, /configured = coreModel\.configuredCatalogModels\(initial\.models, codexConfig, \{ appProvider: CODEX_PROVIDER_ID,/);
  assert.match(connect, /if \(\(models\.status === "fulfilled" \|\| custom\?\.ids\.length \|\| configured\) && initial\.models\.length\) \{\n\s+const patch = coreModel\.reconcileCoreModel\(config, initial\.core\.id, initial\.models\);/);
  assert.match(connect, /Object\.assign\(config, patch \?\? \{\}, seeded \? \{ coreModels: seeded \} : \{\}\);/);
  const settingsCase = main.slice(main.indexOf('case "settings": {'), main.indexOf('case "navigation-state"'));
  assert.match(settingsCase, /\["model", "effort", "fastMode", "speed"\]\.some\(\(key\) => key in p\) && initial\?\.core\?\.id/);
  assert.match(main, /throw Error\(i18n\.t\('Choose an available model\.'\)\)/);
  assert.match(main, /createWorkflowService\(\{[^}]*core:workflowCore,/);
});

test('relay mode: web search reads its own key variable, set only from the official key, never the relay key', async (t) => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'model-search-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const saved = { key: process.env.DEEPSEEK_API_KEY, url: process.env.DEEPSEEK_BASE_URL };
  delete process.env.DEEPSEEK_API_KEY; delete process.env.DEEPSEEK_BASE_URL;
  t.after(() => { if (saved.key !== undefined) process.env.DEEPSEEK_API_KEY = saved.key; if (saved.url !== undefined) process.env.DEEPSEEK_BASE_URL = saved.url; });
  const safeStorage = { isEncryptionAvailable: () => true, encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`), decryptString: buffer => Buffer.from(String(buffer).slice(4), 'base64').toString() };
  const env = new Map(), rows = new Map();
  const profile = { setManagedRow: async (id, row) => { if (row) rows.set(id, row); else rows.delete(id); }, removeManagedRow: async id => { rows.delete(id); }, setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); } };
  const forwarder = { async start() { return 'http://127.0.0.1:4321/anthropic'; }, async stop() {} };
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder });
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }, relayKey: 'sk-relay' });
  // No official key: search gets no key at all (it fails for want of one) rather than the relay's.
  assert.deepEqual(rows.get('web-search-deepseek'), { config: { apiKeyEnv: 'CODE_DESKTOP_DEEPSEEK_SEARCH_KEY' } });
  assert.equal(env.has('CODE_DESKTOP_DEEPSEEK_SEARCH_KEY'), false);
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-relay');
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }, officialKey: 'sk-official' });
  assert.equal(env.get('CODE_DESKTOP_DEEPSEEK_SEARCH_KEY'), 'sk-official');
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-relay');
  // Official mode: search uses DEEPSEEK_API_KEY (the official key) again, through the profile's own row.
  await settings.run({ op: 'connection-save', connection: { mode: 'official' } });
  assert.equal(rows.has('web-search-deepseek'), false);
  assert.equal(env.has('CODE_DESKTOP_DEEPSEEK_SEARCH_KEY'), false);
  assert.equal(env.get('DEEPSEEK_API_KEY'), 'sk-official');
});
