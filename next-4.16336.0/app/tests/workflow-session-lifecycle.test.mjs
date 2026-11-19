import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AppServerClient } from '../third-party/codex-workflows-runner/src/appServerClient.js';
import { shutdownClient } from '../third-party/codex-workflows-runner/src/codexAgent.js';
import { CodexSessionDriver, startCodexSession } from '../third-party/codex-workflows-runner/src/codexSession.js';
import { identityHash } from '../third-party/codex-workflows-runner/src/journal.js';
import { __activeSlots, createRuntime, setWorkflowPaused } from '../third-party/codex-workflows-runner/src/runtime.js';
import { runWorkflowSource } from '../third-party/codex-workflows-runner/src/runWorkflow.js';

async function server(t, code, args = []) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'oc-workflow-session-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const script = path.join(dir, 'server.cjs');
  await writeFile(script, code);
  return { cwd: dir, command: process.execPath, args: [script, ...args] };
}

const serve = `
const rl = require('node:readline').createInterface({ input: process.stdin });
const frame = (value) => JSON.stringify(value) + '\\n';
const reply = (id, result) => frame({ id, result });
const note = (method, params) => frame({ method, params });
const send = (value) => process.stdout.write(value);
`;

test('buffered tool starts, old turn frames and split UTF-8 preserve the session result', async (t) => {
  const options = await server(t, serve + `
    rl.on('line', line => {
      const q = JSON.parse(line);
      if (q.method === 'initialize') return send(reply(q.id, {}));
      if (q.method !== 'turn/start') return;
      const threadId = 'session';
      const tool = { id: 'tool', type: 'commandExecution' };
      const brokenOldResult = { id: 'old', type: 'agentMessage', text: 'stale' };
      send(reply(q.id, { turn: { id: 'current' } })
        + note('item/started', { threadId, turnId: 'current', item: tool })
        + note('item/completed', { threadId, turnId: 'old', item: tool }));
      setTimeout(() => {
        const bytes = Buffer.from(note('item/completed', {
          threadId, turnId: 'current', item: { id: 'new', type: 'agentMessage', text: '台灣 🧪' }
        }));
        const split = bytes.indexOf(Buffer.from('台')) + 1;
        send(bytes.subarray(0, split));
        setTimeout(() => {
          send(bytes.subarray(split));
          send(note('item/completed', { threadId, turnId: 'old', item: brokenOldResult })
            + note('item/completed', { threadId, turnId: 'current', item: tool })
            + note('turn/completed', { threadId, turn: { id: 'current', status: 'completed' } }));
        }, 20);
      }, 130);
    });
  `);
  const client = new AppServerClient(options);
  t.after(() => client.shutdown());
  await client.connect();
  const driver = new CodexSessionDriver({ client, threadId: 'session' });
  const { completion } = await driver.beginTurn('work', { timeoutMs: 75 });
  const outcome = await completion;
  assert.equal(outcome.status, 'completed');
  assert.equal(outcome.result, '台灣 🧪');
});

test('failed initialize reaps the rejecting subprocess', async (t) => {
  const options = await server(t, serve + `
    rl.on('line', line => {
      const q = JSON.parse(line);
      send(frame({ id: q.id, error: { code: -32603, message: String(process.pid) } }));
    });
  `);
  const client = new AppServerClient(options);
  t.after(() => client.shutdown());
  let pid;
  await assert.rejects(client.connect(), error => {
    pid = Number(/"message":"(\d+)"/.exec(error.message)?.[1]);
    return pid > 0;
  });
  assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
});

test('session thread creation retries on a fresh process after a dropped transport', async (t) => {
  const options = await server(t, serve + `
    const fs = require('node:fs');
    rl.on('line', line => {
      const q = JSON.parse(line);
      if (q.id === undefined) return;
      if (q.method !== 'thread/start') return send(reply(q.id, {}));
      if (!fs.existsSync('first-attempt')) {
        fs.writeFileSync('first-attempt', '');
        process.exit(0);
      }
      send(reply(q.id, { thread: { id: 'replacement' } }));
    });
  `);
  t.after(shutdownClient);
  const driver = await startCodexSession({ clientOptions: options, retries: 1 });
  assert.equal(driver.threadId, 'replacement');
});

function deferred() {
  return Promise.withResolvers();
}

test('a pending steer owns the session and close drains it before cleanup', async () => {
  const started = deferred();
  const ack = deferred();
  const followUp = deferred();
  const events = [];
  const runtime = createRuntime({
    startSession: async () => ({
      threadId: 't',
      async beginTurn(prompt) {
        events.push(prompt);
        if (prompt === 'first') return { turnId: '1', completion: Promise.resolve({ status: 'completed', result: 'first' }) };
        started.resolve();
        await ack.promise;
        return { turnId: '2', completion: followUp.promise };
      },
      async interruptCurrent() { events.push('interrupt'); followUp.resolve({ status: 'interrupted' }); },
      async cleanup() { events.push('cleanup'); },
    }),
  });
  const session = await runtime.agent.start('first');
  await session.wait();
  const steer = session.steer('second', { wait: false });
  await started.promise;
  await assert.rejects(session.steer('third'), /already running/);
  assert.equal((await session.wait({ timeoutMs: 1 })).status, 'timed_out');
  const closing = session.close();
  ack.resolve();
  await steer;
  await closing;
  assert.equal(session.status, 'closed');
  assert.deepEqual(events, ['first', 'second', 'interrupt', 'cleanup']);
  await runtime.finalize();
  assert.equal(__activeSlots(), 0);
});

test('workflow exit cleans a pending session whose creation is in flight', async () => {
  const events = [];
  const startSession = async (opts) => {
    events.push('thread');
    await new Promise(resolve => opts.signal.addEventListener('abort', resolve, { once: true }));
    return {
      async cleanup() { events.push('cleanup'); },
      async beginTurn() { events.push('unexpected turn'); },
    };
  };
  const script = 'export const meta={name:"check",description:"check"}; agent.start("side"); await new Promise(r=>setTimeout(r, 10)); return "done";';
  assert.equal(await runWorkflowSource(script, { startSession }), 'done');
  assert.deepEqual(events, ['thread', 'cleanup']);
  assert.equal(__activeSlots(), 0);
});

test('warm replay rejects an old cache entry that violates the requested schema', async () => {
  const entries = new Map([['sess:s1#0', { threadId: 't', status: 'completed', result: { old: 'ok' }, promptHash: identityHash('same') }]]);
  const runtime = createRuntime({
    journal: { reuse: true, entry: key => entries.get(key), async record() {} },
    startSession: async () => ({
      threadId: 't',
      resumed: true,
      async beginTurn() { return { turnId: '2', completion: Promise.resolve({ status: 'completed', result: { new: 'ok' } }) }; },
      async cleanup() {},
    }),
  });
  const session = await runtime.agent.start('same', { schema: { type: 'object', required: ['new'], properties: { new: { type: 'string' } }, additionalProperties: false } });
  assert.deepEqual((await session.wait()).result, { new: 'ok' });
  await runtime.finalize();
});

test('plan mode refuses steer after close without counting an extra turn', async () => {
  const runtime = createRuntime({ plan: true });
  const session = await runtime.agent.start('first');
  await session.close();
  await assert.rejects(session.steer('second'), /Cannot steer closed session/);
  assert.equal(runtime.agentCount(), 1);
});

test('queued session work is checked again on admission and withdrawn on close', async () => {
  let spent = 0;
  const prompts = [];
  const runtime = createRuntime({
    budgetTotal: 10,
    sharedBudget: { spent: () => spent },
    startSession: async () => ({
      threadId: 't',
      async beginTurn(prompt) {
        prompts.push(prompt);
        return { turnId: prompt, completion: Promise.resolve({ status: 'completed', result: prompt }) };
      },
      async cleanup() {},
    }),
  });
  try {
    const first = await runtime.agent.start('first');
    await first.wait();
    setWorkflowPaused(true);
    const rejectedSteer = assert.rejects(first.steer('queued steer'), /cancelled/);
    await first.close();
    await rejectedSteer;
    assert.equal(first.status, 'closed');
    const rejectedStart = assert.rejects(runtime.agent.start('queued start'), { name: 'WorkflowBudgetExceededError' });
    spent = 10;
    setWorkflowPaused(false);
    await rejectedStart;
    assert.deepEqual(prompts, ['first']);
  } finally {
    setWorkflowPaused(false);
    await runtime.finalize();
  }
});
