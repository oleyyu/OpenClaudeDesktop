// A workflow run's core gets the environment a session's core gets (proxy, shell variables, PATH), and not the
// runner's own ELECTRON_RUN_AS_NODE.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('a workflow core gets the proxy variables a session core gets, NODE_USE_ENV_PROXY included', () => {
  const saved = { ...process.env };
  try {
    process.env.HTTPS_PROXY = 'http://127.0.0.1:7890';
    delete process.env.NODE_USE_ENV_PROXY;
    delete process.env.NO_PROXY;
    delete process.env.no_proxy;
    const { workflowCoreEnv } = require('../electron/codex.cjs');
    const env = workflowCoreEnv('gemini-test-kind');
    assert.equal(env.NODE_USE_ENV_PROXY, '1');
    assert.match(env.NO_PROXY, /127\.0\.0\.1/);
    assert.match(env.PATH, /\/opt\/homebrew\/bin/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test('the runner\'s ELECTRON_RUN_AS_NODE does not reach its core unless the core\'s launch asked for it', async () => {
  const { sanitizeEnv } = await import('../third-party/codex-workflows-runner/src/appServerClient.js');
  assert.equal(sanitizeEnv({ CODE_DESKTOP_WORKFLOW_RUNNER: '1', ELECTRON_RUN_AS_NODE: '1' }, '/w').ELECTRON_RUN_AS_NODE, undefined);
  assert.equal(sanitizeEnv({ CODE_DESKTOP_WORKFLOW_RUNNER: '1', CODE_DESKTOP_CORE_RUN_AS_NODE: '1', ELECTRON_RUN_AS_NODE: '1' }, '/w').ELECTRON_RUN_AS_NODE, '1');
  assert.equal(sanitizeEnv({ ELECTRON_RUN_AS_NODE: '1' }, '/w').ELECTRON_RUN_AS_NODE, '1', 'outside the runner nothing changes');
});
