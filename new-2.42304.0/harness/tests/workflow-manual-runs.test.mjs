// Manual workflow runs (codeDesktop/workflow/startScript, workflow-execution.js) on the real DeepSeek core: a scripted
// local Anthropic Messages server answers (a child whose prompt says CHILD_HANG waits until its request is dropped).
import test from 'node:test'
import assert from 'node:assert/strict'
import { core, textOf, until } from './workflow-core-fixture.mjs'

const hangChildren = (body) => textOf(body.messages[0]?.content).includes('CHILD_HANG') ? 'hang' : { text: 'DONE' }

test('a thread holding a manual workflow run stays loaded: leaving it keeps the run reachable', { timeout: 120000 }, async (t) => {
  const { client, hanging, thread, seen } = await core(t, hangChildren)
  const threadId = await thread()
  const run = await client.request('codeDesktop/workflow/startScript', { threadId, script: 'export const meta={name:"held",description:"Held run"}; return await agent("CHILD_HANG held")' })
  // The app leaves the session at once (sidebar switch): its run must not lose its parent agent or its holder.
  await client.request('thread/unsubscribe', { threadId })
  await until(() => hanging.size >= 1, () => `the run’s child request: ${seen()}`)
  assert.deepEqual(await client.request('codeDesktop/workflow/stop', { threadId, runId: run.runId, attemptId: run.attemptId }), { status: 'stopping' })
  const result = await client.request('codeDesktop/workflow/scriptResult', { threadId, runId: run.runId, attemptId: run.attemptId })
  assert.equal(result.stopReason, 'cancelled')
  await client.request('codeDesktop/workflow/releaseScript', { threadId, runId: run.runId, attemptId: run.attemptId })
  await until(() => hanging.size === 0, () => `the child request to be dropped: ${seen()}`)
})
