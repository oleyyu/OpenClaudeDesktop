import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCustomizeOperations } = require('../electron/customize-operations.cjs');
const { customizeCore } = await import('../src/customize-model.mjs');

// Customize › Agents on Codex: its built-in roles (role.rs default / explorer / worker) and the [agents.<role>] tables
// config/read reports (shape checked against the real codex 0.155.1 with an isolated CODEX_HOME), never the agents.*
// settings beside them; a role's config_file is the one path Show in Finder may reveal.
const operations = (request, serverInfo = { engine: 'codex', capabilities: {} }) => createCustomizeOperations({
  getClient: () => ({ start: async () => {}, serverInfo, request }),
  getConfig: () => ({ threadIds: [] }), knownCwd: (cwd) => cwd,
});
const CONFIG = {
  config: { agents: { enabled: null, max_concurrent_threads_per_session: 3, max_depth: null, default_subagent_model: 'gpt-5.6-terra', default_subagent_reasoning_effort: null, job_max_runtime_seconds: null, interrupt_message: null,
    reviewer: { description: 'Reviews diffs for bugs.', config_file: '/tmp/roles/reviewer.toml', nickname_candidates: ['Rex'] },
    docs: { description: 'Writes docs.', config_file: null, nickname_candidates: null } } },
  origins: { 'agents.reviewer.description': { name: { type: 'user' } }, 'agents.docs.description': { name: { type: 'project' } } },
};

test('Codex roles: built-ins first, then the user\'s and the project\'s own, no settings keys', async () => {
  const calls = [];
  const ops = operations(async (method, params) => { calls.push([method, params]); return CONFIG; });
  const { agents } = await ops.run({ operation: 'agents', cwd: '/work' });
  assert.deepEqual(calls, [['config/read', { cwd: '/work' }]]);
  assert.deepEqual(agents.map((agent) => [agent.name, agent.scope]), [['default', 'builtin'], ['explorer', 'builtin'], ['worker', 'builtin'], ['reviewer', 'user'], ['docs', 'project']]);
  assert.equal(agents.find((agent) => agent.name === 'reviewer').path, '/tmp/roles/reviewer.toml');
  assert.ok(ops.knownAgentPaths.has('/tmp/roles/reviewer.toml'));
  assert.equal(ops.knownSkillPaths.has('/tmp/roles/reviewer.toml'), false, 'an agent file is never a skill');
  assert.ok(agents.every((agent) => !['max_concurrent_threads_per_session', 'default_subagent_model'].includes(agent.name)));
});

test('Codex roles: a config/read failure still lists the built-ins; a bridge without agentsList lists none', async () => {
  const failing = operations(async () => { throw new Error('boom'); });
  assert.deepEqual((await failing.run({ operation: 'agents' })).agents.map((agent) => agent.name), ['default', 'explorer', 'worker']);
  const bridge = operations(async () => { throw new Error('not called'); }, { engine: 'kimi', capabilities: {} });
  assert.deepEqual(await bridge.run({ operation: 'agents' }), { agents: [] });
});

test('Customize shows the Agents section on Codex (its descriptor implies agentsList)', () => {
  assert.equal(customizeCore({ engine: 'codex', capabilities: {} }).agentsList, true);
  assert.equal(customizeCore({ engine: 'kimi', capabilities: {} }).agentsList, false);
});
