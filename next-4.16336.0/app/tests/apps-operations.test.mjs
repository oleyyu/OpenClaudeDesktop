import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createCustomizeOperations } = require('../electron/customize-operations.cjs');

const rpcError = (code, message) => Object.assign(new Error(message), { code });
const operations = (request) => createCustomizeOperations({
  getClient: () => ({ start: async () => {}, serverInfo: { capabilities: {} }, request }),
  getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd,
});

test('apps: a core without app/list (-32601) reads as no apps, so Customize › Connectors hides the section', async () => {
  const ops = operations(async (method) => { assert.equal(method, 'app/list'); throw rpcError(-32601, 'Unknown test method'); });
  assert.deepEqual(await ops.run({ operation: 'apps' }), { data: [], unsupported: true });
});

test('apps: any other app/list failure still reaches the page', async () => {
  const ops = operations(async () => { throw rpcError(-32603, 'Directory unavailable'); });
  await assert.rejects(ops.run({ operation: 'apps' }), /Directory unavailable/);
});

test('apps: pages through app/list and remembers the listed ids for the switch', async () => {
  const calls = [];
  const ops = operations(async (method, params) => {
    calls.push({ method, params });
    if (method === 'app/list') return params.cursor ? { data: [{ id: 'b' }], nextCursor: null } : { data: [{ id: 'a' }], nextCursor: 'next' };
    return {};
  });
  assert.deepEqual(await ops.run({ operation: 'apps', reload: true }), { data: [{ id: 'a' }, { id: 'b' }] });
  assert.deepEqual(calls.map((call) => call.params), [{ limit: 100, forceRefetch: true }, { limit: 100, cursor: 'next' }]);
  await assert.rejects(ops.run({ operation: 'app-enabled', id: 'unlisted', enabled: false }), /Unknown app/);
});
