// A background model workflow is a dsh-tool-jobs job of the process that ran it. After the core restarts (the app quit
// and relaunched), a run whose job died with that process must not stay "running" forever with a Stop that fails.
import test from 'node:test'
import assert from 'node:assert/strict'
import { core, textOf, until } from './workflow-core-fixture.mjs'

test('a background workflow whose job died with the previous core settles as stopped on reopen', { timeout: 120000 }, async (t) => {
  const fixture = await core(t, (body) => {
    const first = textOf(body.messages[0]?.content)
    if (first.includes('CHILD_HANG')) return 'hang'
    if (textOf(body.messages.at(-1)?.content).startsWith('go')) return { name: 'Workflow', input: { script: 'export const meta={name:"restart",description:"Restart"}; return await agent("CHILD_HANG a",{label:"a"})' } }
    return { text: 'ROOT_DONE' }
  })
  const { events, hanging, thread, workspace, model, seen } = fixture
  const params = { approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { dynamicWorkflows: true } }
  const threadId = await thread(params)
  await fixture.client.request('turn/start', { threadId, input: [{ type: 'text', text: 'go' }] })
  // The run's agent holds its model request open (a retried request may briefly overlap the dropped one: at least one).
  await until(() => hanging.size >= 1 && events.some((event) => event.method === 'turn/completed' && event.params.threadId === threadId), () => `the running background run (its agent's held request and the root turn/completed): ${seen()}`)
  // While its job lives, the run is running (the tool result's job sync leaves it be).
  assert.equal(events.filter((event) => event.params?.threadId === threadId && event.params?.item?.workflowRun).at(-1).params.item.workflowRun.status, 'running')
  const client = await fixture.restart()
  const resumed = await client.request('thread/resume', { threadId, cwd: workspace, model, ...params })
  const run = resumed.thread.turns.flatMap((turn) => turn.items).find((item) => item.workflowRun)?.workflowRun
  assert.equal(run?.status, 'stopped', JSON.stringify(run))
  assert.deepEqual(run.workflowProgress.filter((entry) => entry.type === 'workflow_agent').map((agent) => [agent.label, agent.state]), [['a', 'error']])
  assert.equal(run.resumable, true)
  assert.deepEqual(await client.request('codeDesktop/workflow/stop', { threadId, runId: run.runId, attemptId: run.attemptId }), { status: 'alreadyFinished' })
})
