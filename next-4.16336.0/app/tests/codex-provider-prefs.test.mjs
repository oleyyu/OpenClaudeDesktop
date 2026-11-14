import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCodexProvider, normalizeCodexProvider, codexLaunchArgs, buildCodexCatalog, tomlString, codexThreadProvider, codexBaseURLError,
  CODEX_PROVIDER_ID, CODEX_KEY_ENV, CODEX_KEY_SLOT } from '../electron/prefs/codex-provider.mjs';

const pairs = args => { const out = []; for (let i = 0; i < args.length; i += 2) { assert.equal(args[i], '-c'); out.push(args[i + 1]); } return out; };

test('constants never change: threads and keys are recorded under them', () => {
  assert.equal(CODEX_PROVIDER_ID, 'codedesktop');
  assert.equal(CODEX_KEY_ENV, 'CODE_DESKTOP_CODEX_API_KEY');
  assert.equal(CODEX_KEY_SLOT, '@codex');
});

test('launch args: the provider table once saved, custom-only model settings, and never the key', () => {
  assert.deepEqual(codexLaunchArgs(null), [], 'nothing saved: Codex launches as before');
  assert.deepEqual(codexLaunchArgs({ mode: 'openai' }), []);
  const custom = { mode: 'custom', baseURL: 'https://relay.example.com/v1/', models: ['relay-a', 'relay-b'] };
  const args = pairs(codexLaunchArgs(custom, { catalogPath: '/Users/me/Library/Application Support/OpenClaude Desktop/codex/model-catalog.json' }));
  assert.deepEqual(args, [
    'model_providers.codedesktop={name="OpenClaude Desktop",base_url="https://relay.example.com/v1",env_key="CODE_DESKTOP_CODEX_API_KEY",wire_api="responses"}',
    'shell_environment_policy.set.CODE_DESKTOP_CODEX_API_KEY=""',
    'model_provider="codedesktop"',
    'model="relay-a"',
    'model_catalog_json="/Users/me/Library/Application Support/OpenClaude Desktop/codex/model-catalog.json"',
    'web_search="disabled"',
  ]);
  assert.equal(pairs(codexLaunchArgs({ ...custom, webSearch: true })).some(arg => arg.startsWith('web_search')), false, 'the toggle keeps hosted web search');
  assert.equal(pairs(codexLaunchArgs(custom)).some(arg => arg.startsWith('model_catalog_json')), false, 'no catalog path, no catalog arg');
  // OpenAI mode after a custom endpoint was saved: the table (and the blank key) stay; nothing selects it.
  const openai = pairs(codexLaunchArgs({ ...custom, mode: 'openai' }, { catalogPath: '/c.json' }));
  assert.equal(openai.length, 2);
  assert.match(openai[0], /^model_providers\.codedesktop=\{/);
  assert.equal(openai[1], 'shell_environment_policy.set.CODE_DESKTOP_CODEX_API_KEY=""');
  assert.equal(JSON.stringify(codexLaunchArgs({ ...custom, apiKey: 'sk-secret' })).includes('sk-secret'), false);
});

test('TOML strings are escaped', () => {
  assert.equal(tomlString('a"b\\c\nd\u0001'), '"a\\"b\\\\c\\u000ad\\u0001"');
  assert.equal(tomlString('/path with spaces/x.json'), '"/path with spaces/x.json"');
});

test('validation rejects what would stop the core or leak', () => {
  assert.deepEqual(validateCodexProvider({ mode: 'custom', baseURL: ' https://r.test/v1/ ', models: 'a\nb, a', webSearch: 1 }), { mode: 'custom', baseURL: 'https://r.test/v1', models: ['a', 'b'], webSearch: false });
  assert.throws(() => validateCodexProvider({ mode: 'custom', baseURL: 'https://r.test', models: ['a'], wireApi: 'chat' }), /Responses API/);
  assert.doesNotThrow(() => validateCodexProvider({ mode: 'custom', baseURL: 'https://r.test', models: ['a'], wireApi: 'responses' }));
  for (const baseURL of ['https://r.test/"x', 'https://r.test/\\x', 'https://r.test/\nx', 'https://user:pw@r.test', 'ftp://r.test', 'file:///etc', 'https://r.test/?k=1', 'https://r.test/#f', `https://r.test/${'a'.repeat(600)}`, ''])
    assert.throws(() => validateCodexProvider({ mode: 'custom', baseURL, models: ['a'] }), Error, baseURL);
  assert.throws(() => validateCodexProvider({ mode: 'custom', baseURL: 'https://r.test' }), /at least one model/);
  assert.throws(() => validateCodexProvider({ mode: 'custom', baseURL: 'https://r.test', models: ['bad id!'] }), /Invalid model id/);
  assert.throws(() => validateCodexProvider({ mode: 'chatgpt' }), /OpenAI or a custom endpoint/);
  assert.equal(codexBaseURLError('http://127.0.0.1:8080/v1'), null);
  // OpenAI mode rejects a typed invalid endpoint (a typo must not erase the saved one) and clears with an empty one;
  // reading an old file that holds an invalid OpenAI-mode URL still gives no endpoint; a broken file reads as the default.
  assert.throws(() => validateCodexProvider({ mode: 'openai', baseURL: 'nope' }), /endpoint URL/);
  assert.deepEqual(validateCodexProvider({ mode: 'openai', baseURL: '' }), { mode: 'openai', baseURL: '', models: [], webSearch: false });
  assert.deepEqual(normalizeCodexProvider({ mode: 'openai', baseURL: 'nope', models: ['a'] }), { mode: 'openai', baseURL: '', models: ['a'], webSearch: false });
  assert.deepEqual(normalizeCodexProvider({ mode: 'custom', baseURL: 'https://r.test' }), { mode: 'openai', baseURL: '', models: [], webSearch: false });
  assert.deepEqual(normalizeCodexProvider('garbage'), { mode: 'openai', baseURL: '', models: [], webSearch: false });
});

test('the thread provider exists only once an endpoint was saved', () => {
  assert.equal(codexThreadProvider(null), null);
  assert.equal(codexThreadProvider({ mode: 'custom', baseURL: 'https://r.test', models: ['a'] }), 'codedesktop');
  assert.equal(codexThreadProvider({ mode: 'openai', baseURL: 'https://r.test', models: ['a'] }), 'openai');
});

test('catalog: bundled entries hidden, gpt-5.5 cloned whole per id in order, service tiers cleared', () => {
  const entry = (slug, priority, extra = {}) => ({ slug, display_name: slug.toUpperCase(), description: `${slug} model`, visibility: 'list', priority,
    supported_reasoning_levels: [{ effort: 'low' }, { effort: 'xhigh' }], base_instructions: `base ${slug}`, model_messages: { instructions_template: slug },
    service_tiers: [{ id: 'priority', name: 'Fast' }], additional_speed_tiers: ['fast'], upgrade: { model: 'x' }, availability_nux: { message: 'new' }, ...extra });
  const bundled = { models: [entry('gpt-6-astra', 1), entry('gpt-5.5', 12), entry('codex-auto-review', 43, { visibility: 'hide' })] };
  const catalog = buildCodexCatalog(bundled, ['relay-a', 'relay-b'], { description: 'relay.test' });
  assert.deepEqual(catalog.models.map(model => [model.slug, model.visibility, model.priority]),
    [['gpt-6-astra', 'hide', 1], ['gpt-5.5', 'hide', 12], ['codex-auto-review', 'hide', 43], ['relay-a', 'list', 0], ['relay-b', 'list', 1]]);
  const clone = catalog.models.at(-2);
  assert.equal(clone.base_instructions, 'base gpt-5.5');
  assert.deepEqual(clone.model_messages, { instructions_template: 'gpt-5.5' });
  assert.equal(clone.display_name, 'relay-a');
  assert.equal(clone.description, 'relay.test');
  assert.deepEqual([clone.service_tiers, clone.additional_speed_tiers, clone.upgrade, clone.availability_nux], [[], [], null, null]);
  // An id naming a bundled model keeps its own metadata and replaces the hidden copy.
  const own = buildCodexCatalog(bundled, ['gpt-6-astra']);
  assert.deepEqual(own.models.filter(model => model.slug === 'gpt-6-astra').map(model => [model.visibility, model.base_instructions, model.priority]), [['list', 'base gpt-6-astra', 0]]);
  // Without gpt-5.5 the lowest-priority listed entry is the template; without any, it throws.
  assert.equal(buildCodexCatalog({ models: [entry('gpt-6-astra', 1), entry('old', 9)] }, ['r']).models.at(-1).base_instructions, 'base old');
  assert.throws(() => buildCodexCatalog({ models: [] }, ['r']), /template/);
  assert.throws(() => buildCodexCatalog({ models: [{ slug: 'gpt-5.5', visibility: 'list' }] }, ['r']), /template/);
});
