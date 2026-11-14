import { registerCodexPack } from './codex-pack.mjs';
registerCodexPack();
import test from 'node:test';
import assert from 'node:assert/strict';
import { canRemoveDeveloperServer, removeDeveloperServer } from '../src/developer-server-actions.mjs';
import operations from '../electron/customize-operations.cjs';

test('Developer deletion requires an actual unowned definition and a lossless key path', () => {
  assert.equal(canRemoveDeveloperServer({ name: 'local-server_1' }), true);
  for (const definition of [null, {}, {name:''}, {name:'a.b'}, {name:'[x]'}, {name:42}]) assert.equal(canRemoveDeveloperServer(definition), false);
  assert.equal(canRemoveDeveloperServer({ name: 'local' }, { pluginId: 'plugin' }), false);
});

test('canceling confirmation sends no mutation or refresh; invalid names cannot reach confirmation', async () => {
  let calls = 0;
  const options = { confirm: () => false, call: () => { calls++; }, refresh: () => { calls++; } };
  assert.equal(await removeDeveloperServer('local', options), false); assert.equal(calls, 0);
  await assert.rejects(removeDeveloperServer(undefined, { ...options, confirm() { throw Error('must not ask'); } }), /Edit config/);
});

test('confirmed removal uses the production RPC adapter and awaits refresh after the actual write and reload', async () => {
  const events = [];
  const client = { start: async () => {}, request: async (method, params) => { events.push({ method, params }); return {}; } };
  const backend = operations.createCustomizeOperations({ getClient: () => client, getConfig: () => ({}), knownCwd: cwd => cwd });
  let prompt = '';
  const result = await removeDeveloperServer('local', { confirm: message => { prompt = message; return true; }, call: backend.run,
    refresh: async () => { events.push('refresh'); }, core: { engine: 'deepseek-harness' } });
  assert.equal(result, true); assert.match(prompt, /“local”/); assert.match(prompt, /DeepSeek Harness configuration/);
  assert.deepEqual(events, [
    { method: 'config/batchWrite', params: { edits: [{ keyPath: 'mcp_servers.local', value: null, mergeStrategy: 'replace' }], reloadUserConfig: true } },
    { method: 'config/mcpServer/reload', params: {} }, 'refresh',
  ]);
});

test('the confirm names the running core’s configuration, never a fixed DeepSeek Harness', async () => {
  const { removeDeveloperServerPrompt } = await import('../src/developer-server-actions.mjs');
  const { setLocale, setAssistantName } = await import('../electron/i18n/index.mjs');
  for (const [core, name] of [['deepseek', 'DeepSeek Harness'], [{ engine: 'deepseek-harness' }, 'DeepSeek Harness'], [{}, 'Codex'], ['codex', 'Codex'],
    [{ engine: 'zcode' }, 'ZCode'], ['opencode', 'OpenCode'], ['mimo', 'MiMo Code']])
    assert.match(removeDeveloperServerPrompt('local', core), new RegExp(`This changes the ${name} configuration\\.`), JSON.stringify(core));
  // A caller without boot.core (Settings › Developer before any core reports) gets the core this window runs, so the
  // DeepSeek core keeps its exact wording; only an assistant no core owns gets the neutral copy.
  try {
    for (const [assistant, expected] of [['DeepSeek', /This changes the DeepSeek Harness configuration\./], ['Codex', /This changes the Codex configuration\./],
      ['GLM', /This changes the ZCode configuration\./], ['Acme', /This changes the agent core’s configuration\./]]) {
      setAssistantName(assistant);
      for (const core of [undefined, null, '']) {
        const prompt = removeDeveloperServerPrompt('local', core);
        assert.match(prompt, /“local”/); assert.match(prompt, expected, `${assistant} ${core}`);
      }
    }
    setAssistantName('Codex');
    let shown = '';
    await removeDeveloperServer('local', { confirm: message => { shown = message; return false; }, call() {}, refresh() {} });
    assert.match(shown, /Codex configuration/); assert.doesNotMatch(shown, /DeepSeek/);
  } finally { setAssistantName('DeepSeek'); }
  let asked = '';
  await removeDeveloperServer('local', { confirm: message => { asked = message; return false; }, call() {}, refresh() {}, core: { engine: 'zcode' } });
  assert.match(asked, /ZCode configuration/);
  try { setLocale('zh-CN'); assert.match(removeDeveloperServerPrompt('local', 'codex'), /这会更改 Codex 配置/); } finally { setLocale('en-US'); }
});

test('a write/reload error still refreshes and remains visible even if the refresh also fails', async () => {
  const failure = Error('Reload failed after config write'); let refreshed = 0;
  await assert.rejects(removeDeveloperServer('local', { confirm: () => true, call: async () => { throw failure; }, refresh: async () => { refreshed++; throw Error('Read failed'); } }), error => error === failure);
  assert.equal(refreshed, 1);
  await assert.rejects(removeDeveloperServer('local', { confirm: () => true, call: async () => {}, refresh: async () => { throw Error('Read failed'); } }), /Read failed/);
});

const { createSettingsSnapshotReader } = await import('../src/developer-server-actions.mjs');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return {promise,resolve,reject}; };

test('post-removal snapshot wins over a delayed initial read, including late failures', async () => {
 const requests = [], values = [], errors = []; let catalog = 0;
 const reader = createSettingsSnapshotReader({read:() => { const d = deferred(); requests.push(d); return d.promise; }, onValue:v => values.push(v), onError:e => errors.push(e), refreshCatalog:async () => {catalog++;}});
 const old = reader.refresh(), fresh = reader.refresh(true);
 requests[1].resolve({mcpDefinitions:[]}); await fresh;
 requests[0].resolve({mcpDefinitions:[{name:'removed'}]}); await old;
 assert.deepEqual(values,[{mcpDefinitions:[]}]); assert.equal(catalog,1);
 const oldError = reader.refresh(), newest = reader.refresh();
 requests[3].resolve({mcpDefinitions:[{name:'new'}]}); await newest;
 requests[2].reject(Error('obsolete failure')); await assert.rejects(oldError,/obsolete/);
 assert.deepEqual(errors,[]); assert.deepEqual(values.at(-1),{mcpDefinitions:[{name:'new'}]});
 reader.dispose();
});

test('closing or changing the settings owner rejects late paints and prevents old catalog refreshes', async () => {
 const reply = deferred(); let reads=0, paints=0, catalogs=0, errors=0;
 const reader = createSettingsSnapshotReader({read:() => {reads++;return reply.promise;},onValue:()=>paints++,onError:()=>errors++,refreshCatalog:()=>catalogs++});
 const pending=reader.refresh(true); reader.dispose(); reply.resolve({}); await pending; await reader.refresh(true);
 assert.deepEqual({reads,paints,catalogs,errors},{reads:1,paints:0,catalogs:0,errors:0});
});
