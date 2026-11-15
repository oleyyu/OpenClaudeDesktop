// Dynamic workflows are one level deep (index.js tools/pre-execute): only the session's own agent may start one, behind
// the Dynamic workflows setting and its "Run a dynamic workflow?" card. A sub-agent the model delegated to must not
// start one itself, whatever the tool's spelling, in any Mode.
import test from 'node:test'
import assert from 'node:assert/strict'
import { core, textOf, until } from './workflow-core-fixture.mjs'

const usedTool = (body) => body.messages.some((message) => Array.isArray(message.content) && message.content.some((block) => block.type === 'tool_use'))

for (const [label, params] of [
  ['Default mode with Dynamic workflows on', { approvalPolicy: 'on-request', sandbox: 'workspace-write', codeDesktop: { dynamicWorkflows: true } }],
  ['Bypass with Dynamic workflows off', { approvalPolicy: 'never', sandbox: 'danger-full-access', codeDesktop: { dynamicWorkflows: false } }],
]) for (const name of ['Workflow', 'RunWorkflow']) test(`${label}: a sub-agent's ${name} call starts nothing`, { timeout: 120000 }, async (t) => {
  const subResults = []
  const { client, events, requests, thread } = await core(t, (body) => {
    const first = textOf(body.messages[0]?.content)
    const last = body.messages.at(-1)
    if (first.includes('SUB_TASK')) {
      if (!usedTool(body)) return { name, input: { script: 'export const meta={name:"nested",description:"Nested"}; return await agent("NESTED_CHILD")' } }
      subResults.push(last.content.find((block) => block.type === 'tool_result'))
      return { text: 'SUB_DONE' }
    }
    if (first.includes('NESTED_CHILD') || first.includes('[Workflow harness')) return { text: 'NESTED_RAN' }
    if (textOf(last?.content).startsWith('go') && !usedTool(body)) return { name: 'subagent', input: { description: 'delegate', prompt: 'SUB_TASK delegate', run_in_background: false } }
    return { text: 'ROOT_DONE' }
  })
  const cards = []
  client.on('event', (event) => { if (event.kind === 'request') { cards.push(event); client.respond(event.id, { decision: 'decline' }, event.bridgeApproval) } })
  const threadId = await thread(params)
  await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'go' }], codeDesktop: params.codeDesktop })
  await until(() => events.some((event) => event.method === 'turn/completed' && event.params.threadId === threadId), 'the root turn')
  assert.equal(subResults.length, 1)
  assert.equal(subResults[0].is_error, true, JSON.stringify(subResults[0]))
  assert.ok(!requests.some((body) => /NESTED_CHILD|\[Workflow harness/.test(textOf(body.messages[0]?.content))), 'a nested workflow agent ran')
  assert.deepEqual(cards, [])
})
