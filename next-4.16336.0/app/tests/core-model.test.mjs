import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogId, configuredCatalogModels, customCatalogModels, pickCoreModel, reconcileCoreModel, recordCoreModel, seedCoreModel, validateCoreModels } from '../electron/prefs/core-model.mjs';

// model/list as Codex 0.155.1 answers it (probed with a temp CODEX_HOME), trimmed to the fields the app reads.
const efforts = list => list.map(reasoningEffort => ({ reasoningEffort, description: reasoningEffort }));
const fast = [{ id: 'priority', name: 'Fast', description: '2x speed' }];
const ALL = ['low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const codex = [
  { id: 'gpt-6-astra', model: 'gpt-6-astra', displayName: 'GPT-6-Astra', supportedReasoningEfforts: efforts(ALL), defaultReasoningEffort: 'low', serviceTiers: fast, isDefault: true },
  { id: 'gpt-5.6-sol', model: 'gpt-5.6-sol', displayName: 'GPT-5.6-Sol', supportedReasoningEfforts: efforts(ALL), defaultReasoningEffort: 'low', serviceTiers: [...fast, { id: 'ultrafast', name: 'Ultrafast' }], isDefault: false },
  { id: 'gpt-5.6-terra', model: 'gpt-5.6-terra', displayName: 'GPT-5.6-Terra', supportedReasoningEfforts: efforts(ALL), defaultReasoningEffort: 'medium', serviceTiers: fast, isDefault: false },
  { id: 'gpt-5.6-luna', model: 'gpt-5.6-luna', displayName: 'GPT-5.6-Luna', supportedReasoningEfforts: efforts(ALL.slice(0, 5)), defaultReasoningEffort: 'medium', serviceTiers: fast, isDefault: false },
  { id: 'gpt-5.5', model: 'gpt-5.5', displayName: 'GPT-5.5', supportedReasoningEfforts: efforts(ALL.slice(0, 4)), defaultReasoningEffort: 'medium', serviceTiers: fast, isDefault: false },
];
const deepseek = [
  { id: 'deepseek-flash', model: 'deepseek-v4.1-flash', displayName: '4.1 Flash', supportedReasoningEfforts: efforts(['off', 'high', 'max']), defaultReasoningEffort: 'high', serviceTiers: [], isDefault: true },
  { id: 'deepseek-pro', model: 'deepseek-v4-pro', displayName: 'V4 Pro', supportedReasoningEfforts: efforts(['off', 'high', 'max']), defaultReasoningEffort: 'high', serviceTiers: [], isDefault: false },
];

test('a stale DeepSeek choice on Codex becomes the Codex default and its default effort', () => {
  assert.deepEqual(reconcileCoreModel({ model: 'deepseek-v4.1-flash', effort: 'off' }, 'codex', codex), { model: 'gpt-6-astra', effort: 'low' });
});

test('the remembered DeepSeek choice comes back on DeepSeek', () => {
  const config = { model: 'gpt-6-astra', effort: 'low', coreModels: { deepseek: { model: 'deepseek-v4.1-flash', effort: 'max' }, codex: { model: 'gpt-6-astra', effort: 'low' } } };
  assert.deepEqual(reconcileCoreModel(config, 'deepseek', deepseek), { model: 'deepseek-v4.1-flash', effort: 'max' });
});

test('supported efforts are kept; unsupported ones reset to the model default', () => {
  assert.equal(reconcileCoreModel({ model: 'gpt-5.6-sol', effort: 'high' }, 'codex', codex), null);
  assert.deepEqual(reconcileCoreModel({ model: 'gpt-5.5', effort: 'ultra' }, 'codex', codex), { effort: 'medium' });
  // The user's per-model default effort (Settings › Models) is the reset target.
  assert.deepEqual(reconcileCoreModel({ model: 'gpt-5.5', effort: 'ultra', modelSettings: { params: { 'gpt-5.5': { effort: 'high' } } } }, 'codex', codex), { effort: 'high' });
});

test('an empty or missing catalog changes nothing', () => {
  assert.equal(reconcileCoreModel({ model: 'x', effort: 'off' }, 'codex', []), null);
  assert.equal(reconcileCoreModel({ model: 'x', effort: 'off' }, 'codex', undefined), null);
  assert.equal(pickCoreModel([], { model: 'x' }), null);
});

test('ids are the catalog model field, never the entry id', () => {
  const fixture = [{ id: 'fixture-0', model: 'fixture', isDefault: true, supportedReasoningEfforts: efforts(['medium']), defaultReasoningEffort: 'medium' }];
  assert.equal(catalogId(fixture[0]), 'fixture');
  assert.equal(catalogId({ id: 'only-id' }), 'only-id');
  assert.deepEqual(reconcileCoreModel({ model: '', effort: 'medium' }, 'codex', fixture), { model: 'fixture' });
  assert.deepEqual(reconcileCoreModel({ model: 'fixture-0', effort: 'medium' }, 'codex', fixture), { model: 'fixture' }, 'a saved entry id maps to its model');
});

test('Fast mode turns off on a model without a Fast tier and follows the remembered choice', () => {
  assert.deepEqual(reconcileCoreModel({ model: 'gpt-6-astra', effort: 'low', fastMode: true }, 'deepseek', deepseek), { model: 'deepseek-v4.1-flash', effort: 'high', fastMode: false });
  assert.equal(reconcileCoreModel({ model: 'gpt-6-astra', effort: 'low', fastMode: true }, 'codex', codex), null);
  const config = { model: 'deepseek-v4.1-flash', effort: 'high', fastMode: false, coreModels: { codex: { model: 'gpt-5.6-sol', effort: 'high', fastMode: true } } };
  assert.deepEqual(reconcileCoreModel(config, 'codex', codex), { model: 'gpt-5.6-sol', fastMode: true });
});

test('a fresh profile gets the default model and keeps medium when supported', () => {
  assert.deepEqual(reconcileCoreModel({ model: '', effort: 'medium' }, 'codex', codex), { model: 'gpt-6-astra' });
  assert.deepEqual(reconcileCoreModel({ model: '', effort: 'medium' }, 'deepseek', deepseek), { model: 'deepseek-v4.1-flash', effort: 'high' });
});

test('reconciling never writes coreModels, so a shrunken catalog keeps the remembered choice', () => {
  const config = { model: 'relay-b', effort: 'medium', coreModels: { codex: { model: 'relay-b', effort: 'medium' } } };
  const patch = reconcileCoreModel(config, 'codex', codex);
  assert.deepEqual(patch, { model: 'gpt-6-astra' }, 'medium is supported on the default, so it stays');
  assert.equal('coreModels' in patch, false);
  Object.assign(config, patch);
  const relay = [{ id: 'relay-a', model: 'relay-a', isDefault: true, supportedReasoningEfforts: efforts(['medium']) }, { id: 'relay-b', model: 'relay-b', supportedReasoningEfforts: efforts(['medium']) }];
  assert.deepEqual(reconcileCoreModel(config, 'codex', relay), { model: 'relay-b' }, 'the full catalog brings it back');
});

test('recordCoreModel and seedCoreModel', () => {
  assert.deepEqual(recordCoreModel({ model: 'gpt-5.5', effort: 'high', fastMode: true, coreModels: { deepseek: { model: 'd', effort: 'off' } } }, 'codex'),
    { deepseek: { model: 'd', effort: 'off' }, codex: { model: 'gpt-5.5', effort: 'high', fastMode: true } });
  assert.equal(recordCoreModel({ model: '' }, 'codex'), undefined, 'no choice, nothing recorded');
  assert.deepEqual(seedCoreModel({ model: 'deepseek-v4.1-flash', effort: 'max' }, 'deepseek', deepseek), { deepseek: { model: 'deepseek-v4.1-flash', effort: 'max' } });
  assert.equal(seedCoreModel({ model: 'deepseek-v4.1-flash', effort: 'max' }, 'codex', codex), null, 'only a listed model seeds');
  assert.equal(seedCoreModel({ model: 'deepseek-v4-pro', effort: 'max', coreModels: { deepseek: { model: 'deepseek-v4.1-flash', effort: 'max' } } }, 'deepseek', deepseek), null, 'never over a record');
});

test('validateCoreModels drops bad keys and entries', () => {
  const value = JSON.parse('{"__proto__":{"model":"x","effort":"low"}}');
  Object.assign(value, { codex: { model: 'gpt-5.5', effort: 'high', fastMode: true, extra: 1 }, ['x'.repeat(65)]: { model: 'm', effort: '' },
    bad: { model: 'a\nb', effort: 'low' }, noEffort: { model: 'm' }, fast: { model: 'm', effort: 'low', fastMode: 'yes' }, list: [] });
  assert.deepEqual(validateCoreModels(value), { codex: { model: 'gpt-5.5', effort: 'high', fastMode: true } });
  assert.equal(validateCoreModels({ bad: { model: '' } }), null);
  assert.equal(validateCoreModels([]), null);
  assert.equal(validateCoreModels(null), null);
  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`core${i}`, { model: 'm', effort: 'low' }]));
  assert.equal(Object.keys(validateCoreModels(many)).length, 32);
});

test('a Codex custom endpoint without its catalog reconciles against its own ids, never the bundled list', () => {
  // `codex debug models` failed: model/list answers the bundled OpenAI catalog; the endpoint serves relay-a / gpt-5.5.
  const list = customCatalogModels(['relay-a', 'gpt-5.5'], codex, { template: 'gpt-5.5' });
  assert.deepEqual(list.map(model => [model.model, model.isDefault]), [['relay-a', true], ['gpt-5.5', false]]);
  assert.deepEqual(list[0].supportedReasoningEfforts, codex[4].supportedReasoningEfforts, 'an unknown id takes the template efforts');
  assert.equal(list[0].defaultReasoningEffort, 'medium');
  assert.equal(list[1].displayName, 'GPT-5.5', 'a bundled id keeps its own metadata');
  assert.ok(list.every(model => model.serviceTiers.length === 0 && model.hidden === false), 'no Fast tier, as in the built catalog');
  // A stale DeepSeek id, a remembered bundled Codex model and a fresh profile all land on the first relay id.
  assert.deepEqual(reconcileCoreModel({ model: 'deepseek-v4.1-flash', effort: 'off' }, 'codex', list), { model: 'relay-a', effort: 'medium' });
  assert.deepEqual(reconcileCoreModel({ model: 'gpt-6-astra', effort: 'low', fastMode: true, coreModels: { codex: { model: 'gpt-6-astra', effort: 'low', fastMode: true } } }, 'codex', list), { model: 'relay-a', fastMode: false }, 'low is a template effort, so it stays');
  assert.deepEqual(reconcileCoreModel({ model: '', effort: 'medium' }, 'codex', list), { model: 'relay-a' });
  assert.equal(reconcileCoreModel({ model: 'gpt-5.5', effort: 'high' }, 'codex', list), null, 'a listed relay id stays');
  // Without a template entry an unknown id lists no efforts (the saved effort is kept); junk ids are dropped.
  assert.deepEqual(customCatalogModels(['relay-a', '', 7], [], { template: 'gpt-5.5' }).map(model => [model.model, model.supportedReasoningEfforts.length, model.defaultReasoningEffort]), [['relay-a', 0, null]]);
  assert.deepEqual(customCatalogModels(undefined, codex), []);
});

test('configuredCatalogModels: the model of the user’s own Codex config.toml is listed as the default and survives the reconcile', () => {
  const label = 'Set in your Codex config.toml';
  // A relay provider's model, which model/list (bundled OpenAI catalog) never lists.
  const relay = configuredCatalogModels(codex, { model: 'relay-a', model_provider: 'dummy', model_reasoning_effort: 'high' }, { appProvider: 'codedesktop', label });
  assert.equal(catalogId(relay[0]), 'relay-a');
  assert.equal(relay[0].isDefault, true);
  assert.equal(relay[0].source, 'config');
  assert.equal(relay[0].description, label);
  assert.equal(relay[0].defaultReasoningEffort, 'high');
  assert.deepEqual(relay[0].serviceTiers, [], 'no Fast tier is assumed for a provider’s own model');
  assert.equal(relay.filter(model => model.isDefault).length, 1);
  assert.equal(relay.length, codex.length + 1, 'the bundled models stay listed');
  assert.equal(codex[0].isDefault, true, 'the input is not mutated');
  // The saved model is kept on connect, never replaced with gpt-6-astra.
  assert.equal(reconcileCoreModel({ model: 'relay-a', effort: 'high' }, 'codex', relay)?.model, undefined);
  // A model saved for another core falls to the configured one.
  assert.equal(reconcileCoreModel({ model: 'deepseek-v4-pro', effort: 'high' }, 'codex', relay).model, 'relay-a');
  // A bundled id on another provider keeps its metadata and becomes the default.
  const azure = configuredCatalogModels(codex, { model: 'gpt-5.6-sol', model_provider: 'azure' }, { label });
  assert.equal(catalogId(azure[0]), 'gpt-5.6-sol');
  assert.equal(azure[0].displayName, 'GPT-5.6-Sol');
  assert.equal(azure.length, codex.length);
  assert.equal(azure.find(model => catalogId(model) === 'gpt-6-astra').isDefault, false);
  // An unlisted model on OpenAI is added too; a listed one changes nothing.
  assert.equal(catalogId(configuredCatalogModels(codex, { model: 'o3', model_provider: null }, { label })[0]), 'o3');
  assert.equal(configuredCatalogModels(codex, { model: 'gpt-5.6-terra', model_provider: 'openai' }, { label }), null);
  assert.equal(configuredCatalogModels(codex, { model: 'gpt-5.6-terra' }, { label }), null);
  // OpenClaude Desktop's own endpoint already has its catalog; no model, or a bad one, changes nothing.
  assert.equal(configuredCatalogModels(codex, { model: 'relay-a', model_provider: 'codedesktop' }, { appProvider: 'codedesktop', label }), null);
  assert.equal(configuredCatalogModels(codex, { model: null, model_provider: 'dummy' }, { label }), null);
  assert.equal(configuredCatalogModels(codex, null, { label }), null);
  assert.equal(configuredCatalogModels(codex, { model: 'bad\nid', model_provider: 'dummy' }, { label }), null);
  // model/list failed: the configured model is still listed.
  assert.deepEqual(configuredCatalogModels([], { model: 'relay-a', model_provider: 'dummy' }, { label }).map(catalogId), ['relay-a']);
});

test('a remembered Ultrafast comes back on a model that lists it, and is Standard on one that doesn\'t', () => {
  const record = recordCoreModel({ model: 'gpt-5.6-sol', effort: 'low', fastMode: true, speed: 'ultrafast' }, 'codex');
  assert.deepEqual(record.codex, { model: 'gpt-5.6-sol', effort: 'low', fastMode: true, speed: 'ultrafast' });
  assert.equal(validateCoreModels({ codex: { model: 'm', effort: '', speed: 'Bad!' } }), null, 'a malformed speed drops the record');
  // Back on Codex from DeepSeek (Standard there): Ultrafast returns with the model.
  assert.deepEqual(reconcileCoreModel({ model: 'deepseek-v4.1-flash', effort: 'high', fastMode: false, speed: 'standard', coreModels: record }, 'codex', codex),
    { model: 'gpt-5.6-sol', effort: 'low', fastMode: true, speed: 'ultrafast' });
  // The remembered model no longer lists Ultrafast: Standard.
  const terra = { codex: { model: 'gpt-5.6-terra', effort: 'medium', fastMode: true, speed: 'ultrafast' } };
  assert.deepEqual(reconcileCoreModel({ model: 'deepseek-v4.1-flash', effort: 'high', fastMode: false, speed: 'standard', coreModels: terra }, 'codex', codex),
    { model: 'gpt-5.6-terra', effort: 'medium' });
});
