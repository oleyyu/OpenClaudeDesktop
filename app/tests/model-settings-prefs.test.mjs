import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT, normalize, validate, withEffortDefaults, modelParamsForCore, pricesForCore, pricesFromOfficial, modelParamError, isModelId, setModelParam, addPrice, coreTakesModelParams } from '../electron/prefs/model-settings.mjs';
import { settingsPatch } from '../electron/preferences.mjs';

const tier = (cacheHit, cacheMiss, output) => ({ cacheHit, cacheMiss, output });

test('modelSettings defaults and lenient normalize', () => {
  assert.deepEqual(DEFAULT, { params: {}, prices: null });
  assert.deepEqual(normalize(undefined), { params: {}, prices: null });
  assert.deepEqual(normalize({ params: { 'deepseek-flash': { maxTokens: 100, temperature: 0.5, effort: 'HIGH' }, 'x y': { maxTokens: 1000 }, empty: {} }, prices: {} }),
    { params: { 'deepseek-flash': { temperature: 0.5 } }, prices: null });
  assert.deepEqual(normalize({ prices: { m: { offPeak: tier(1, 2, 3), peak: tier(-1, 2, 3) }, n: { displayName: 'N', offPeak: tier(1, 2, 3), peak: tier(1, 2, 3) } } }).prices,
    { n: { displayName: 'N', offPeak: tier(1, 2, 3), peak: tier(1, 2, 3) } });
});

test('modelSettings strict validate throws user-facing messages', () => {
  assert.equal(validate(null), null);
  assert.deepEqual(validate({ params: { 'deepseek-flash': { maxTokens: 8192, temperature: 0.333, effort: 'high' } } }),
    { params: { 'deepseek-flash': { maxTokens: 8192, temperature: 0.33, effort: 'high' } }, prices: null });
  assert.throws(() => validate({ params: { m: { maxTokens: 100 } } }), /Max output tokens must be a whole number from 256/);
  assert.throws(() => validate({ params: { m: { maxTokens: 1000.5 } } }), /whole number/);
  assert.throws(() => validate({ params: { m: { temperature: 2.5 } } }), /Temperature must be a number from 0 to 2/);
  assert.throws(() => validate({ params: { m: { topP: 0.9 } } }), /Unknown model parameter/);
  assert.throws(() => validate({ params: { 'a b': {} } }), /Model ids/);
  assert.throws(() => validate({ params: {}, other: 1 }), /Invalid model settings/);
  assert.throws(() => validate({ prices: { m: { offPeak: tier(1, 2, 3) } } }), /off-peak and peak/);
  assert.throws(() => validate({ prices: { m: { offPeak: tier(1, 2, 3), peak: tier(1, 2, 10001) } } }), /0 to 10,000/);
  // Per-model params carry the core id since per-model options, so their cap is 200 (prices keep 50).
  const many = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`m${i}`, { maxTokens: 1000 }]));
  assert.throws(() => validate({ params: many }), /200 models or fewer/);
  const prices = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`m${i}`, { offPeak: tier(0, 1, 2), peak: tier(0, 1, 2) }]));
  assert.throws(() => validate({ prices }), /50 models or fewer/);
  // Empty entries are dropped; empty prices mean the official table.
  assert.deepEqual(validate({ params: { m: { maxTokens: '' } }, prices: {} }), { params: {}, prices: null });
  assert.equal(modelParamError('maxTokens', undefined), null);
});

test('settingsPatch stores modelSettings and null resets it', () => {
  const next = settingsPatch({ theme: 'dark' }, { modelSettings: { params: { m: { maxTokens: 4096 } }, prices: { m: { offPeak: tier(0, 1, 2), peak: tier(0, 2, 4) } } } });
  assert.deepEqual(next.modelSettings, { params: { m: { maxTokens: 4096 } }, prices: { m: { offPeak: tier(0, 1, 2), peak: tier(0, 2, 4) } } });
  assert.equal(next.theme, 'dark');
  assert.equal('modelSettings' in settingsPatch(next, { modelSettings: null }), false);
  assert.throws(() => settingsPatch({}, { modelSettings: { params: { m: { temperature: -1 } } } }), /Temperature/);
});

test('withEffortDefaults overrides defaultReasoningEffort only with a supported effort', () => {
  const models = [
    { model: 'deepseek-flash', defaultReasoningEffort: 'high', supportedReasoningEfforts: [{ reasoningEffort: 'off' }, { reasoningEffort: 'high' }, { reasoningEffort: 'max' }] },
    { model: 'deepseek-v4-pro', defaultReasoningEffort: 'high', supportedReasoningEfforts: [{ reasoningEffort: 'high' }] },
  ];
  assert.equal(withEffortDefaults(models, undefined), models);
  const out = withEffortDefaults(models, { params: { 'deepseek-flash': { effort: 'max' }, 'deepseek-v4-pro': { effort: 'max' } } });
  assert.equal(out[0].defaultReasoningEffort, 'max');
  assert.equal(out[1], models[1], 'unsupported effort keeps the entry');
  assert.equal(models[0].defaultReasoningEffort, 'high', 'the input is not mutated');
  assert.deepEqual(withEffortDefaults(null, {}), []);
});

test('modelParamsForCore and pricesForCore', () => {
  assert.equal(modelParamsForCore(undefined), null);
  assert.equal(modelParamsForCore({ params: { m: { effort: 'high' } } }), null);
  assert.deepEqual(modelParamsForCore({ params: { m: { effort: 'high', maxTokens: 2048 }, n: { temperature: 0 } } }), { m: { maxTokens: 2048 }, n: { temperature: 0 } });
  assert.equal(pricesForCore({}), null);
  const prices = { m: { offPeak: tier(0, 1, 2), peak: tier(0, 2, 4) } };
  assert.deepEqual(pricesForCore({ prices }), prices);
  assert.deepEqual(pricesFromOfficial({ 'deepseek-flash': { displayName: '4.1 Flash', offPeak: tier(0.02, 1, 4), peak: tier(0.04, 2, 8) } }),
    { 'deepseek-flash': { displayName: '4.1 Flash', offPeak: tier(0.02, 1, 4), peak: tier(0.04, 2, 8) } });
});

test('Settings → Models edit helpers', async () => {
  const { parseNumberInput, setModelParam, effectivePrices, setPrice, addPrice, removePrice, resetPrices, priceEdited } = await import('../electron/prefs/model-settings.mjs');
  assert.equal(parseNumberInput(''), undefined);
  assert.equal(parseNumberInput(' 0.5 '), 0.5);
  assert.ok(Number.isNaN(parseNumberInput('abc')));
  // Params: set, clear, back to the default (null).
  let settings = setModelParam(undefined, 'deepseek-flash', 'maxTokens', 8192);
  assert.deepEqual(settings, { params: { 'deepseek-flash': { maxTokens: 8192 } }, prices: null });
  settings = setModelParam(settings, 'deepseek-flash', 'temperature', 0.555);
  assert.equal(settings.params['deepseek-flash'].temperature, 0.56);
  settings = setModelParam(settings, 'deepseek-flash', 'maxTokens', undefined);
  settings = setModelParam(settings, 'deepseek-flash', 'temperature', undefined);
  assert.equal(settings, null);
  assert.throws(() => setModelParam(null, 'm', 'maxTokens', 10), /256/);
  // Prices: the first edit copies the official table.
  const official = { 'deepseek-flash': { displayName: '4.1 Flash', offPeak: tier(0.02, 1, 4), peak: tier(0.04, 2, 8) }, 'deepseek-v4-pro': { displayName: '4 Pro', offPeak: tier(0.15, 4.5, 13.5), peak: tier(0.3, 9, 27) } };
  assert.deepEqual(effectivePrices(null, official), official);
  let priced = setPrice(null, official, 'deepseek-flash', 'peak', 'output', 9);
  assert.equal(priced.prices['deepseek-flash'].peak.output, 9);
  assert.deepEqual(priced.prices['deepseek-v4-pro'], official['deepseek-v4-pro']);
  assert.equal(priceEdited(priced.prices, official, 'deepseek-flash'), true);
  assert.equal(priceEdited(priced.prices, official, 'deepseek-v4-pro'), false);
  priced = addPrice(priced, official, ' my-model ', 'Mine');
  assert.deepEqual(priced.prices['my-model'], { displayName: 'Mine', offPeak: tier(0, 0, 0), peak: tier(0, 0, 0) });
  assert.throws(() => addPrice(priced, official, 'my-model'), /already has a price/);
  assert.throws(() => addPrice(priced, official, 'bad id'), /Model ids/);
  assert.throws(() => setPrice(priced, official, 'my-model', 'peak', 'output', -1), /0 to 10,000/);
  priced = removePrice(priced, official, 'my-model');
  assert.equal('my-model' in priced.prices, false);
  assert.equal(resetPrices(priced), null);
  assert.deepEqual(resetPrices({ params: { m: { maxTokens: 1000 } }, prices: priced.prices }), { params: { m: { maxTokens: 1000 } }, prices: null });
});

test('custom provider definitions and the managed llm-pi-ai overlay row', async () => {
  const { validateProvider, normalizeProviders, providerOverlayRow, providerKeyEnv, PROVIDER_PROTOCOLS } = await import('../electron/prefs/model-settings.mjs');
  assert.deepEqual([...PROVIDER_PROTOCOLS], ['openai-completions', 'openai-responses', 'anthropic-messages']);
  const provider = validateProvider({ route: 'my-gw', displayName: ' Gateway ', baseURL: 'https://gw.example.com/v1', models: 'gpt-4.1-mini\nqwen3-coder, gpt-4.1-mini' });
  assert.deepEqual(provider, { route: 'my-gw', displayName: 'Gateway', api: 'openai-completions', baseURL: 'https://gw.example.com/v1', models: ['gpt-4.1-mini', 'qwen3-coder'] });
  assert.throws(() => validateProvider({ ...provider, route: 'deepseek' }), /built-in DeepSeek/);
  assert.throws(() => validateProvider({ ...provider, route: 'Bad Id' }), /lowercase/);
  assert.throws(() => validateProvider({ ...provider, baseURL: 'ftp://x' }), /http\(s\)/);
  assert.throws(() => validateProvider({ ...provider, baseURL: 'https://user:pw@x.test' }), /without credentials/);
  assert.throws(() => validateProvider({ ...provider, models: [] }), /at least one model/);
  assert.throws(() => validateProvider({ ...provider, api: 'bedrock' }), /protocol/);
  assert.equal(providerKeyEnv('my-gw'), 'CODE_DESKTOP_PROVIDER_KEY_MY_GW');
  assert.deepEqual(normalizeProviders([provider, provider, { route: 'x' }]), [provider]);
  assert.equal(providerOverlayRow([]), null);
  assert.deepEqual(providerOverlayRow([provider]), { config: { providers: { 'my-gw': { displayName: 'Gateway', api: 'openai-completions', baseURL: 'https://gw.example.com/v1',
    apiKeyEnv: 'CODE_DESKTOP_PROVIDER_KEY_MY_GW', models: [{ id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', input: ['text', 'image'] }, { id: 'qwen3-coder', name: 'Qwen 3 Coder', reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' } }] } } } });
});

test('model ids the cores list: Qwen `(authType)` suffixes and models.dev `@` ids', () => {
  for (const id of ['qwen3-coder-plus(openai)', 'anthropic/claude-sonnet@20260101', 'deepseek-flash', 'openrouter/qwen/qwen3:free', 'gpt-4.1+tools']) assert.equal(isModelId(id), true, id);
  for (const id of ['__proto__', '', 'a b', 'x'.repeat(129), 'm\n', 'a<b']) assert.equal(isModelId(id), false, JSON.stringify(id));
  let settings = setModelParam(undefined, 'qwen3-coder-plus(openai)', 'maxTokens', 4096);
  settings = setModelParam(settings, 'qwen3-coder-plus(openai)', 'effort', 'high');
  assert.deepEqual(normalize(settings).params, { 'qwen3-coder-plus(openai)': { maxTokens: 4096, effort: 'high' } });
  assert.deepEqual(modelParamsForCore(settings), { 'qwen3-coder-plus(openai)': { maxTokens: 4096 } });
  assert.deepEqual(validate(settings), settings, 'the strict write check accepts what setModelParam produced');
  assert.throws(() => setModelParam(undefined, '__proto__', 'maxTokens', 4096), /Invalid model/);
  assert.ok(addPrice(null, {}, 'qwen3-coder-plus(openai)').prices['qwen3-coder-plus(openai)']);
  assert.throws(() => addPrice(null, {}, 'bad id'), /\( \) @ \+/);
});

test('coreTakesModelParams: an explicit modelParams capability decides, else customization', () => {
  assert.equal(coreTakesModelParams({ customization: true }), true);
  assert.equal(coreTakesModelParams({ customization: true, modelParams: false }), false);
  assert.equal(coreTakesModelParams({ modelParams: true }), true);
  assert.equal(coreTakesModelParams({ customization: false }), false);
  assert.equal(coreTakesModelParams({}), false);
  assert.equal(coreTakesModelParams(undefined), false);
});

test('a thinking preset endpoint (GLM) declares Low/Medium/High; other custom endpoints stay undeclared', async () => {
  const { providerOverlayRow: row } = await import('../electron/prefs/model-settings.mjs');
  const providers = row([
    { route: 'glm-cn', api: 'anthropic-messages', baseURL: 'https://open.bigmodel.cn/api/anthropic/', models: ['glm-5.3'] },
    { route: 'mine', api: 'anthropic-messages', baseURL: 'https://example.com', models: ['m1'] },
  ]).config.providers;
  assert.deepEqual(providers['glm-cn'].models[0].reasoningEfforts, { off: null, low: 'low', medium: 'medium', high: 'high' });
  assert.equal('reasoningEfforts' in providers.mine.models[0], false);
});

test('a relay serving GLM/Kimi/Qwen ids gets effort levels by model id', async () => {
  const { providerOverlayRow: row } = await import('../electron/prefs/model-settings.mjs');
  const relay = row([{ route: 'glm-cn', api: 'anthropic-messages', baseURL: 'https://apitiantian.com', models: ['glm-5.3', 'glm-5.3-flash', 'zhipu/glm-5.3', 'qwen3.8-max', 'kimi-k3', 'my-model'] }]).config.providers['glm-cn'].models;
  assert.deepEqual(relay.map(model => 'reasoningEfforts' in model), [true, true, true, true, true, false]);
});

test('model families: a relay id is named and described like the vendor model', async () => {
  const { modelFamily } = await import('../electron/prefs/model-families.mjs');
  const { providerModelEntry } = await import('../electron/prefs/model-settings.mjs');
  const names = ['glm-5.3', 'zhipu/glm-5.3', 'claude-opus-5-5', 'gpt-6.1-sol', 'gpt-4o', 'qwen3.8-max', 'MiniMax-M3', 'kimi-k3', 'gemini-3.8-flash'].map(id => modelFamily(id).name);
  assert.deepEqual(names, ['GLM 5.3', 'GLM 5.3', 'Claude Opus 5.5', 'GPT-6.1 Sol', 'GPT-4o', 'Qwen 3.8 Max', 'MiniMax M3', 'Kimi K3', 'Gemini 3.8 Flash']);
  assert.equal(modelFamily('gpt-4.1-mini').reasoning, false);
  assert.equal(modelFamily('qwen3-235b-a22b-instruct').reasoning, false);
  assert.equal(modelFamily('my-model'), null);
  // GLM-5.3-Flash/FlashX take images (Z.ai: the first natively multimodal GLM-5); GLM-5.3 itself is text only.
  assert.deepEqual(['glm-5.3-flash', 'glm-5.3-flashx', 'zhipu/glm-5.3-flash', 'glm-5.3', 'glm-4.5v'].map(id => modelFamily(id).image), [true, true, true, false, true]);
  const relay = { route: 'relay', baseURL: 'https://relay.example', models: ['claude-opus-5-5'] };
  assert.deepEqual(providerModelEntry(relay, 'claude-opus-5-5').input, ['text', 'image'], 'family images apply until the user marks');
  assert.equal('input' in providerModelEntry({ ...relay, imageModels: [] }, 'claude-opus-5-5'), false, 'an empty mark list means none');
  assert.deepEqual(providerModelEntry({ ...relay, route: 'openai', models: ['gpt-6.1-sol'] }, 'gpt-6.1-sol').reasoningEfforts, { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' }, 'a model newer than the core catalog');
  assert.deepEqual(Object.keys(providerModelEntry(relay, 'claude-opus-5-5').reasoningEfforts), ['off', 'low', 'medium', 'high', 'xhigh', 'max']);
  assert.deepEqual(Object.keys(providerModelEntry(relay, 'claude-sonnet-4-5').reasoningEfforts), ['off', 'low', 'medium', 'high', 'max']);
  assert.deepEqual(Object.keys(providerModelEntry(relay, 'deepseek-v4-pro').reasoningEfforts), ['off', 'low', 'high', 'max']);
});

test('a model’s context window is stored, validated against max output tokens and sent to the core', () => {
  let settings = setModelParam(null, 'deepseek-v4-pro', 'contextWindow', 131072);
  assert.deepEqual(settings.params, { 'deepseek-v4-pro': { contextWindow: 131072 } });
  settings = setModelParam(settings, 'deepseek-v4-pro', 'maxTokens', 8000);
  assert.deepEqual(modelParamsForCore(settings), { 'deepseek-v4-pro': { maxTokens: 8000, contextWindow: 131072 } });
  assert.throws(() => setModelParam(settings, 'deepseek-v4-pro', 'maxTokens', 131072), /smaller than the context window/);
  assert.throws(() => setModelParam(settings, 'deepseek-v4-pro', 'contextWindow', 4096), /smaller than the context window/);
  assert.throws(() => setModelParam(settings, 'deepseek-v4-pro', 'contextWindow', 1000), /Context window must be/);
  assert.throws(() => setModelParam(settings, 'deepseek-v4-pro', 'contextWindow', 1.5e8), /Context window must be/);
  assert.match(modelParamError('contextWindow', 12.5), /whole number/);
  assert.equal(modelParamError('contextWindow', 1024), null);
  // Cleared, the model keeps only its other values; a valid saved table round-trips through validate().
  assert.deepEqual(setModelParam(settings, 'deepseek-v4-pro', 'contextWindow', undefined).params, { 'deepseek-v4-pro': { maxTokens: 8000 } });
  assert.deepEqual(validate({ params: { m: { contextWindow: 200000 } } }).params, { m: { contextWindow: 200000 } });
  assert.deepEqual(normalize({ params: { m: { contextWindow: 10 } } }).params, {}, 'an out-of-range stored value is dropped');
});
