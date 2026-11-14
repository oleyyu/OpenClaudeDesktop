import test from 'node:test';
import assert from 'node:assert/strict';
import { coworkProvider } from '../electron/cowork-runtime/provider.mjs';
const base = { officialKeySlot: 'official', relayKeySlot: 'relay', officialBaseURL: 'https://official.test/anthropic' };
test('Cowork resolves an explicitly configured Anthropic route without mixing provider credentials', () => {
  const providers = [{ route: 'custom', models: ['model'], api: 'anthropic-messages', baseURL: 'https://custom.test/anthropic' }];
  const chosen = coworkProvider({ ...base, model: 'custom/model', providers, keys: { custom: 'custom-key', official: 'other-key' } });
  assert.deepEqual(chosen, { model: 'model', env: { ANTHROPIC_BASE_URL: 'https://custom.test/anthropic', ANTHROPIC_API_KEY: 'custom-key' } });
  assert.throws(() => coworkProvider({ ...base, model: 'model', providers: [{ ...providers[0], api: 'openai-responses' }], keys: { custom: 'key' } }), /Messages-compatible/);
});
test('official/relay credentials stay with their selected endpoint; unsupported models and missing keys fail', () => {
  const request = { ...base, model: 'deepseek-v4-pro', keys: { official: 'official-key', relay: 'relay-key' } };
  assert.equal(coworkProvider(request).env.ANTHROPIC_API_KEY, 'official-key');
  assert.equal(coworkProvider({ ...request, connection: { mode: 'relay', relayBaseURL: 'https://relay.test' } }).env.ANTHROPIC_API_KEY, 'relay-key');
  assert.throws(() => coworkProvider({ ...request, model: 'unknown' }), /Configure this model/);
  assert.throws(() => coworkProvider({ ...request, keys: {} }), /Save an API key/);
  assert.throws(() => coworkProvider({ ...request, inherited: { DEEPSEEK_BASE_URL: 'http://localhost:1234' } }), /loopback/);
});
