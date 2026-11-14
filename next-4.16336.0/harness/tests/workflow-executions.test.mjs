import test from 'node:test'
import assert from 'node:assert/strict'
import { agentEndStatus, createWorkflowExecutions } from '../packages/codex-app-server/src/workflow-execution.js'

test('manual holders route events and release by attempt when a run ID is reused', async () => {
  const listeners = new Map(), notices = [], runs = []
  const engine = { prepareResume() {}, start() {
    const pending = Promise.withResolvers()
    const run = { id: 'wf_same-run', attemptId: `attempt-${runs.length}`, meta: { name: 'same', description: 'Resume' }, result: pending.promise, resolve: pending.resolve, cancel() {}, async dispose() {}, controlMember() { return true } }
    runs.push(run)
    return run
  } }
  const ctx = {
    sessions: { async flush() {} },
    get(name) { return name === 'workflowEngine' ? engine : undefined },
    on(name, listener) { const group = listeners.get(name) ?? new Set(); group.add(listener); listeners.set(name, group); return () => group.delete(listener) },
  }
  const executions = createWorkflowExecutions(ctx, (method, params) => notices.push({ method, ...params }))
  const thread = { id: 'owner', agent: { session: { header: { cwd: '/tmp' } } } }
  const script = 'export const meta={name:"same",description:"Resume"}; return 1'
  const first = await executions.start(thread, { script })
  runs[0].resolve({ value: 1, stopReason: 'completed' })
  await executions.result(thread, first.runId, first.attemptId)
  const second = await executions.start(thread, { script, resumeFromRunId: first.runId })
  const secondResult = executions.result(thread, second.runId, second.attemptId)
  for (const listener of listeners.get('workflow/phase')) listener({ id: second.runId, attemptId: first.attemptId }, 'stale')
  for (const listener of listeners.get('workflow/phase')) listener({ id: second.runId, attemptId: second.attemptId }, 'current', { index: 3, kind: 'child' })
  assert.deepEqual(notices.map(item => item.event), [{ type: 'phase', title: 'current', index: 3, kind: 'child' }])
  await executions.release(thread, first.runId, first.attemptId)
  assert.equal(executions.has(thread, second.runId), true)
  assert.equal(executions.member(thread, second.runId, 1, 'retry', second.attemptId), true)
  assert.throws(() => executions.member(thread, second.runId, 1, 'retry', first.attemptId), /Unknown/)
  runs[1].resolve({ value: 2, stopReason: 'completed' })
  assert.equal((await secondResult).value, 2)
  await executions.release(thread, second.runId, second.attemptId)
  assert.equal(executions.has(thread, second.runId), false)
  await executions.dispose()
})

for (const fails of [false, true]) test(`manual completion waits for Session durability${fails ? ' and reports persistence failure' : ''}`, async () => {
  const pending = Promise.withResolvers(), durability = Promise.withResolvers(), order = [];
  const session = { header: { cwd: '/tmp' } };
  const run = { id: 'wf_durable', attemptId: 'attempt', meta: {}, result: pending.promise, async dispose() { order.push('disposed'); this.outputFile='/owned/attempt.output' } };
  const ctx = {
    get: name => name === 'workflowEngine' ? { start: () => run } : undefined,
    on: () => () => {},
    sessions: { async flush(value) { assert.equal(value, session); order.push('flush'); await durability.promise; order.push('durable') } },
  };
  const executions = createWorkflowExecutions(ctx, () => {}), thread = { id: 'owner', agent: { session } };
  await executions.start(thread, { script: 'export const meta={name:"test",description:"Persistence"};return 1' });
  const result = executions.result(thread, run.id, run.attemptId);
  let settled = false; void result.then(() => { settled = true }, () => { settled = true });
  pending.resolve({ value: 1, stopReason: 'completed' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(order, ['disposed', 'flush']); assert.equal(settled, false);
  let released = false;
  const release = executions.release(thread, run.id, run.attemptId);
  void release.then(() => { released = true }, () => { released = true });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(released, false);
  if (fails) { durability.reject(Error('persistence failed')); await assert.rejects(result, /persistence failed/); await assert.rejects(release, /persistence failed/) }
  else { durability.resolve(); assert.deepEqual(await result,{value:1,stopReason:'completed',outputFile:'/owned/attempt.output'}); await release; assert.equal(order.at(-1), 'durable') }
  assert.equal(executions.has(thread, run.id), false);
  await executions.dispose();
});

test('manual runs report skipped members as skipped, not failed', () => {
  assert.equal(agentEndStatus({ outcome: 'completed' }), 'completed')
  assert.equal(agentEndStatus({ outcome: 'failed', error: 'skipped by user' }), 'skipped')
  assert.equal(agentEndStatus({ outcome: 'cancelled' }), 'skipped')
  assert.equal(agentEndStatus({ outcome: 'failed', error: 'boom' }), 'failed')
})
