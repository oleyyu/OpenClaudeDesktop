import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runHarnessWorkflow } from '../electron/workflow-harness.mjs';

// A core-hosted run (DeepSeek Harness startScript): events that arrive before
// startScript answers are buffered; live events after it must not overtake them.
function fakeCore() {
  const client = new EventEmitter();
  const event = (threadId, type, extra = {}) => client.emit('notification', { method: 'codeDesktop/workflow/event', params: { threadId, runId: 'run-1', attemptId: 'att-1', event: { type, id: '1', label: 'A', ...extra } } });
  let finish;
  const done = new Promise(resolve => { finish = () => resolve({ stopReason: 'completed', value: 'ok' }); });
  client.startThread = async () => ({ thread: { id: 'thr-1' } });
  client.resumeThread = async () => ({ thread: { id: 'thr-1' } });
  client.request = async (method) => {
    if (method === 'codeDesktop/diagnostics') return { workflowExecute: true };
    if (method === 'codeDesktop/workflow/startScript') {
      event('thr-1', 'start');
      // The agent ends as soon as the response is out: before engine.json is written.
      setImmediate(() => { event('thr-1', 'end', { status: 'completed' }); finish(); });
      return { runId: 'run-1', attemptId: 'att-1', meta: { name: 'demo', description: 'Demo' } };
    }
    if (method === 'codeDesktop/workflow/scriptResult') return done;
    return {};
  };
  return client;
}

test('buffered workflow events replay before live ones and metadata is sent once (by the child)', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cd-wf-harness-'));
  try {
    const sent = [];
    const result = await runHarnessWorkflow(fakeCore(), { directory, cwd: directory, access: 'read-only', source: 'x', args: {} }, event => sent.push(event), () => {});
    assert.equal(result.supported, true);
    assert.deepEqual(sent.map(e => e.type), ['start', 'end']);
    assert.equal(sent.some(e => e.type === 'metadata'), false);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'engine.json'), 'utf8')), { threadId: 'thr-1', runId: 'run-1', attemptId: 'att-1' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});

// C1: real Codex 0.155.1 rejects codeDesktop/diagnostics with -32600 "unknown variant": not an engine,
// so /workflow falls back to the runner instead of failing every run.
test('a core that does not know codeDesktop/diagnostics (-32601 or Codex -32600 unknown variant) is not an engine', async () => {
  const { unsupportedMethod } = await import('../electron/workflow-harness.mjs');
  assert.equal(unsupportedMethod({ code: -32601, message: 'Method not found' }), true);
  assert.equal(unsupportedMethod({ code: -32600, message: 'Invalid request: unknown variant `codeDesktop/diagnostics`, expected one of `initialize`' }), true);
  assert.equal(unsupportedMethod({ code: -32600, message: 'thread not found' }), false);
  const failing = error => ({ request: async () => { throw Object.assign(new Error(error.message), error); } });
  assert.deepEqual(await runHarnessWorkflow(failing({ code: -32600, message: 'unknown variant `codeDesktop/diagnostics`' }), {}, () => {}, () => {}), { supported: false });
  await assert.rejects(runHarnessWorkflow(failing({ code: -32600, message: 'thread not found' }), {}, () => {}, () => {}), /thread not found/);
  // A known core without the capability (Codex) is never probed.
  let probed = false;
  assert.deepEqual(await runHarnessWorkflow({ request: async () => { probed = true; return { workflowExecute: true }; } }, { workflowScripts: false }, () => {}, () => {}), { supported: false });
  assert.equal(probed, false);
});

test('the Codex fixture answering like the real binary (-32600) falls back to the runner', async () => {
  const { AppServerClient } = await import('../third-party/codex-workflows-runner/src/appServerClient.js');
  const data = await mkdtemp(join(tmpdir(), 'cd-wf-codex-'));
  const saved = { data: process.env.CODE_DESKTOP_DATA, mode: process.env.CODE_DESKTOP_FIXTURE_UNKNOWN_METHOD };
  process.env.CODE_DESKTOP_DATA = data; process.env.CODE_DESKTOP_FIXTURE_UNKNOWN_METHOD = 'serde';
  const client = new AppServerClient({ command: join(import.meta.dirname, 'fixtures/codex-server.cjs'), args: [], cwd: data, clientInfo: { name: 'test', version: '0' } });
  try {
    await client.connect();
    const answer = await client.request('codeDesktop/diagnostics', {}).catch(error => error);
    assert.equal(answer.code, -32600); assert.match(answer.message, /unknown variant `codeDesktop\/diagnostics`/);
    assert.deepEqual(await runHarnessWorkflow(client, { directory: data, cwd: data }, () => {}, () => {}), { supported: false });
  } finally {
    await client.shutdown();
    for (const [key, value] of [['CODE_DESKTOP_DATA', saved.data], ['CODE_DESKTOP_FIXTURE_UNKNOWN_METHOD', saved.mode]]) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await rm(data, { recursive: true, force: true });
  }
});

test('a stop releases the core-hosted run once, even though the child exits right after', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cd-wf-harness-'));
  const client = new EventEmitter(), calls = [];
  let settle;
  client.startThread = async () => ({ thread: { id: 'thr-1' } });
  client.request = async (method) => {
    calls.push(method);
    if (method === 'codeDesktop/diagnostics') return { workflowExecute: true };
    if (method === 'codeDesktop/workflow/startScript') return { runId: 'run-1', attemptId: 'att-1', meta: { name: 'demo' } };
    if (method === 'codeDesktop/workflow/scriptResult') return new Promise(resolve => { settle = resolve; });
    if (method === 'codeDesktop/workflow/stop') { setImmediate(() => settle({ stopReason: 'cancelled' })); return { status: 'stopping' }; }
    return {};
  };
  let runtime;
  try {
    const running = runHarnessWorkflow(client, { directory, cwd: directory }, () => {}, value => { runtime = value; });
    while (!runtime) await new Promise(resolve => setImmediate(resolve));
    await runtime.cancel();
    assert.ok(calls.includes('codeDesktop/workflow/releaseScript'), 'released before cancel resolves');
    await assert.rejects(running, /Workflow cancelled/);
    assert.equal(calls.filter(method => method === 'codeDesktop/workflow/releaseScript').length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
