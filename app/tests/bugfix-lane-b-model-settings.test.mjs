// Bug check 2026-11-15, lane B: provider keys that can't be decrypted, key-before-config writes, the relay never
// getting the launch environment's official key, adds that would overwrite a provider, and the API connection /
// Codex endpoint restart notices kept in the main process.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { createModelSettings } = require('../electron/model-settings.cjs');

const deepseek = (extra = {}) => ({ serverInfo: { engine: 'deepseek-harness' }, start: async () => {}, request: async () => ({}), ...extra });
const codex = (extra = {}) => ({ serverInfo: { engine: 'codex' }, start: async () => {}, request: async () => { throw new Error('no'); }, ...extra });
// A stub safeStorage: `locked` makes decryptString fail as a keychain denial does; `available` false as no secure storage.
function stubStorage() {
  const state = { locked: false, available: true };
  return Object.assign(state, {
    isEncryptionAvailable: () => state.available,
    encryptString: text => Buffer.from(`enc:${Buffer.from(text).toString('base64')}`),
    decryptString: buffer => { if (state.locked) throw new Error('Error while decrypting the ciphertext provided to safeStorage.decryptString.'); return Buffer.from(String(buffer).slice(4), 'base64').toString(); },
  });
}
function stubProfile() {
  const env = new Map(), rows = new Map();
  return { env, rows, setManagedRow: async (id, row) => { rows.set(id, row); }, removeManagedRow: async id => { rows.delete(id); },
    setCoreEnv: (key, value) => { if (value == null) env.delete(key); else env.set(key, value); }, coreEnvKeys: () => Object.fromEntries(env) };
}
function tempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lane-b-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function withLaunchEnv(t, values) {
  const saved = { key: process.env.DEEPSEEK_API_KEY, url: process.env.DEEPSEEK_BASE_URL };
  for (const [name, value] of Object.entries(values)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  t.after(() => {
    if (saved.key === undefined) delete process.env.DEEPSEEK_API_KEY; else process.env.DEEPSEEK_API_KEY = saved.key;
    if (saved.url === undefined) delete process.env.DEEPSEEK_BASE_URL; else process.env.DEEPSEEK_BASE_URL = saved.url;
  });
}
const forwarder = () => ({ async start() { return 'http://127.0.0.1:4321/anthropic'; }, async stop() {} });

test('a keys file that can’t be decrypted is reported and never deleted or overwritten', async (t) => {
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder(), setCodexLaunch: () => {} });
  await settings.run({ op: 'provider-save', provider: { route: 'alpha', baseURL: 'https://a.test/v1', models: ['a1'] }, apiKey: 'KEY-A' });
  await settings.run({ op: 'provider-save', provider: { route: 'beta', baseURL: 'https://b.test/v1', models: ['b1'] }, apiKey: 'KEY-B' });
  await settings.run({ op: 'connection-save', connection: { mode: 'official' }, officialKey: 'KEY-OFFICIAL' });
  const keysFile = path.join(dir, 'provider-keys.bin'), before = fs.readFileSync(keysFile);

  safeStorage.locked = true;
  const providers = await settings.run({ op: 'providers-read' });
  assert.equal(providers.keysUnreadable, true);
  assert.deepEqual(providers.providers.map(provider => provider.hasKey), [false, false]);
  assert.equal((await settings.run({ op: 'connection-read' })).keysUnreadable, true);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).keysUnreadable, true);
  for (const op of [
    { op: 'provider-remove', route: 'alpha' },
    { op: 'provider-remove-model', route: 'beta', id: 'b1' },
    { op: 'provider-save', previousRoute: 'beta', provider: { route: 'beta', baseURL: 'https://b.test/v2', models: ['b1'] } },
    { op: 'provider-save', provider: { route: 'gamma', baseURL: 'https://c.test/v1', models: ['c1'] }, apiKey: 'KEY-C' },
    { op: 'connection-save', officialKey: null },
    { op: 'connection-save', connection: { mode: 'official' } },
    { op: 'codex-provider-save', provider: { mode: 'openai' }, apiKey: null },
  ]) await assert.rejects(settings.run(op), error => error.code === 'KEYS_LOCKED' && /can’t be read/.test(error.message), op.op);
  assert.deepEqual(fs.readFileSync(keysFile), before, 'the keys file is untouched');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'providers.json'), 'utf8')).providers.map(provider => provider.route), ['alpha', 'beta']);

  // Keychain access comes back: every key is still there.
  safeStorage.locked = false;
  const back = await settings.run({ op: 'providers-read' });
  assert.equal(back.keysUnreadable, undefined);
  assert.deepEqual(back.providers.map(provider => provider.hasKey), [true, true]);
  assert.equal((await settings.run({ op: 'connection-read' })).officialKey, true);
  // A missing file is just "no keys", not locked.
  fs.rmSync(keysFile);
  assert.equal((await settings.run({ op: 'providers-read' })).keysUnreadable, undefined);
});

test('a failed key write leaves no provider, relay or endpoint saved without its key', async (t) => {
  withLaunchEnv(t, { DEEPSEEK_API_KEY: undefined, DEEPSEEK_BASE_URL: undefined });
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder(), setCodexLaunch: () => {} });
  safeStorage.available = false;
  await assert.rejects(settings.run({ op: 'provider-save', provider: { route: 'gamma', baseURL: 'https://c.test/v1', models: ['c1'] }, apiKey: 'KEY-C' }), /Secure storage/);
  assert.equal(fs.existsSync(path.join(dir, 'providers.json')), false);
  assert.deepEqual((await settings.run({ op: 'providers-read' })).providers, []);
  await assert.rejects(settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }, relayKey: 'KEY-R' }), /Secure storage/);
  assert.equal(fs.existsSync(path.join(dir, 'connection.json')), false);
  assert.equal((await settings.run({ op: 'connection-read' })).mode, 'official');
  assert.equal(profile.env.has('DEEPSEEK_BASE_URL'), false);
});

test('relay mode never hands the launch environment’s official DEEPSEEK_API_KEY to the relay', async (t) => {
  withLaunchEnv(t, { DEEPSEEK_API_KEY: 'sk-launch-official', DEEPSEEK_BASE_URL: undefined });
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  const make = () => createModelSettings({ getConfig: () => ({ model: 'deepseek-flash' }), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder(),
    app: { whenReady: () => Promise.resolve() } });
  const first = make();
  await first.ready();
  assert.equal(profile.env.get('DEEPSEEK_API_KEY'), 'sk-launch-official', 'official mode still uses the launch key');
  await first.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }, relayKey: 'sk-relay' });
  assert.equal(profile.env.get('DEEPSEEK_API_KEY'), 'sk-relay');
  // The relay key becomes unreadable (or was never written): the next start blanks the key instead of the launch key.
  safeStorage.locked = true;
  await make().ready();
  assert.equal(profile.env.get('DEEPSEEK_API_KEY'), '', 'an empty value outranks the inherited official key');
  assert.match(profile.env.get('DEEPSEEK_BASE_URL'), /^http:\/\/127\.0\.0\.1:4321/);
  // Cowork resolves the same way: no relay key means no key, never the launch one.
  await assert.rejects(make().coworkConnection('deepseek-flash'), /Save an API key/);
});

test('relay mode keeps a launch key that was given for that same relay', async (t) => {
  withLaunchEnv(t, { DEEPSEEK_API_KEY: 'sk-launch-relay', DEEPSEEK_BASE_URL: 'https://relay.test/anthropic' });
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  fs.writeFileSync(path.join(dir, 'connection.json'), JSON.stringify({ version: 1, mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }));
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder(), app: { whenReady: () => Promise.resolve() } });
  await settings.ready();
  assert.equal(profile.env.get('DEEPSEEK_API_KEY'), 'sk-launch-relay');
});

test('adding a provider with a taken id is refused; editing it still works', async (t) => {
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => deepseek(), getHarnessProfile: () => profile, safeStorage, dir });
  await settings.run({ op: 'provider-save', provider: { route: 'custom', baseURL: 'https://a.test/v1', models: ['a1'] }, apiKey: 'KEY-A' });
  // Quick setup's second Custom run (no previousRoute, id 'custom') and Add provider with the same id.
  await assert.rejects(settings.run({ op: 'provider-save', provider: { route: 'custom', baseURL: 'https://b.test/v1', models: ['b1'] }, apiKey: 'KEY-B' }), /already exists/);
  let view = await settings.run({ op: 'providers-read' });
  assert.deepEqual(view.providers.map(provider => [provider.route, provider.baseURL, provider.models]), [['custom', 'https://a.test/v1', ['a1']]]);
  assert.equal(profile.env.get('CODE_DESKTOP_PROVIDER_KEY_CUSTOM'), 'KEY-A');
  view = await settings.run({ op: 'provider-save', previousRoute: 'custom', provider: { route: 'custom', baseURL: 'https://a.test/v2', models: ['a1', 'a2'] } });
  assert.deepEqual(view.providers.map(provider => [provider.route, provider.baseURL, provider.hasKey]), [['custom', 'https://a.test/v2', true]]);
  view = await settings.run({ op: 'provider-save', provider: { route: 'custom-2', baseURL: 'https://b.test/v1', models: ['b1'] }, apiKey: 'KEY-B' });
  assert.deepEqual(view.providers.map(provider => provider.route), ['custom', 'custom-2']);
});

test('the API connection reports a pending restart from the running core, after Settings reopens too', async (t) => {
  withLaunchEnv(t, { DEEPSEEK_API_KEY: undefined, DEEPSEEK_BASE_URL: undefined });
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  let client = deepseek({ child: {} });
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => client, getHarnessProfile: () => profile, safeStorage, dir, relayProxy: forwarder() });
  assert.equal((await settings.run({ op: 'connection-read' })).pending, undefined);
  assert.equal((await settings.run({ op: 'connection-save', connection: { mode: 'official' }, officialKey: 'sk-1' })).pending, true);
  assert.equal((await settings.run({ op: 'connection-read' })).pending, true, 'reopened Settings still offers Restart core');
  assert.equal((await settings.run({ op: 'providers-read' })).changed, false, 'the providers did not change');
  // Undone: the running core has exactly this.
  assert.equal((await settings.run({ op: 'connection-save', officialKey: null })).pending, undefined);
  await settings.run({ op: 'connection-save', connection: { mode: 'relay', relayBaseURL: 'https://relay.test/anthropic' }, relayKey: 'sk-relay' });
  assert.equal((await settings.run({ op: 'connection-read' })).pending, true);
  // A restarted core read the saved files.
  client = deepseek({ child: {} });
  assert.equal((await settings.run({ op: 'connection-read' })).pending, undefined);
});

test('the Codex endpoint reports a pending restart from the running Codex child, both directions', async (t) => {
  const dir = tempDir(t), safeStorage = stubStorage(), profile = stubProfile();
  let client = codex({ child: { spawnargs: ['codex', 'app-server'] } });
  const settings = createModelSettings({ getConfig: () => ({}), getClient: () => client, getHarnessProfile: () => profile, safeStorage, dir, setCodexLaunch: () => {}, codexCommand: () => null });
  assert.equal((await settings.run({ op: 'codex-provider-read' })).pending, undefined);
  const saved = await settings.run({ op: 'codex-provider-save', provider: { mode: 'custom', baseURL: 'https://relay.test/v1', models: ['relay-a'] }, apiKey: 'sk-codex' });
  assert.equal(saved.pending, true);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).pending, true, 'reopened Settings doesn’t claim the endpoint is in effect');
  client = codex({ child: { spawnargs: ['codex', 'app-server', '-c', 'model_provider="codedesktop"'] } });
  assert.equal((await settings.run({ op: 'codex-provider-read' })).pending, undefined, 'restarted on the endpoint');
  const removed = await settings.run({ op: 'codex-provider-save', provider: { mode: 'openai', baseURL: '', models: [], webSearch: false }, apiKey: null });
  assert.equal(removed.pending, true);
  assert.equal((await settings.run({ op: 'codex-provider-read' })).pending, true, 'Remove endpoint waits for a restart too');
});
