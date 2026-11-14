// Installed code-desktop Workflow children: fixed exclusions, forced calls and allowed file effects.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, realpath, readFile, writeFile, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')
const taskHome = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-workflow-child-tools-')))
const requests = []
let sequence = 0
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
  let raw = ''
  for await (const chunk of req) raw += chunk
  const body = JSON.parse(raw)
  requests.push(body)
  const fixed = JSON.stringify(body.system).includes('FIXED_CHILD_PERSONA')
  const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use').length
  const filename = fixed ? 'fixed.txt' : 'default.txt'
  const actions = [
    { name: 'subagent', input: { description: 'Attempt forbidden delegation', prompt: 'FORBIDDEN_GRANDCHILD', run_in_background: false } },
    { name: 'subagent_fork', input: { description: 'Attempt forbidden fork', prompt: 'FORBIDDEN_GRANDCHILD', run_in_background: false } },
    { name: 'workflow', input: { meta: { name: 'forbidden', description: 'Forbidden nested tool' }, script: 'return "FORBIDDEN_WORKFLOW"', run_in_background: false } },
    { name: 'ralph', input: { prompt: 'FORBIDDEN_GRANDCHILD', iterations: 1 } },
    { name: 'send_user_message', input: { message: 'FORBIDDEN_MESSAGE' } },
    { name: 'bash', input: { command: `printf allowed > ${filename}`, description: 'Write allowed child output' } },
  ]
  const action = actions[calls]
  const id = `selector_${++sequence}`
  const content = action ? { type: 'tool_use', id: `call_${sequence}`, ...action } : { type: 'text', text: 'CHILD_TOOLS_DONE' }
  const usage = { input_tokens: 10, output_tokens: 4 }
  const message = { id, type: 'message', role: 'assistant', model: body.model, content: [content], stop_reason: action ? 'tool_use' : 'end_turn', stop_sequence: null, usage }
  if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(message)); return }
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const [event, data] of [
    ['message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: action ? { ...content, input: {} } : { type: 'text', text: '' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: action ? { type: 'input_json_delta', partial_json: JSON.stringify(action.input) } : { type: 'text_delta', text: content.text } }],
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 4 } }],
    ['message_stop', { type: 'message_stop' }],
  ]) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(path.join(taskHome, '.claude/agents'), { recursive: true })
await writeFile(path.join(taskHome, '.claude/agents/fixed.md'), '---\nname: fixed\ndescription: Fixed exclusion fixture\ntools: Agent Workflow Bash\n---\nFIXED_CHILD_PERSONA\n')
process.env.HOME = taskHome
process.env.DSH_HOME = path.join(taskHome, 'dsh')
process.env.CODE_DESKTOP_CORE_STATE = path.join(taskHome, 'state')
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${server.address().port}`
process.env.DEEPSEEK_API_KEY = 'sk-local-selector-fixture'
const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
let checks = 0
function check(name, fn) { fn(); checks++; console.log('PASS', name) }
try {
  await client.start()
  const models = await client.request('model/list', { limit: 100 })
  const model = models.data.find(entry => entry.isDefault)?.id ?? models.data[0]?.id
  const threadId = (await client.request('thread/start', { cwd: taskHome, model, approvalPolicy: 'never', sandbox: 'workspace-write' })).thread.id
  async function workflow(script) {
    const run = await client.request('codeDesktop/workflow/startScript', { threadId, script: 'export const meta={name:"selectors",description:"Tool selector checks"}; ' + script })
    try { return await client.request('codeDesktop/workflow/scriptResult', { threadId, runId: run.runId }) }
    finally { await client.request('codeDesktop/workflow/releaseScript', { threadId, runId: run.runId }) }
  }
  const banned = ['subagent', 'subagent_fork', 'workflow', 'ralph', 'send_user_message', 'Agent', 'Task', 'Workflow', 'SendUserMessage']
  for (const fixed of [false, true]) {
    const from = requests.length
    const result = await workflow(`return await agent("Try delegation and write the allowed fixture",${fixed ? '{agentType:"fixed"}' : '{}'})`)
    const childRequests = requests.slice(from)
    const label = fixed ? 'declared agent' : 'default child'
    check(`${label} finishes after rejecting forced orchestration calls`, () => assert.equal(result.value, 'CHILD_TOOLS_DONE'))
    check(`${label} schemas exclude all fixed orchestration names`, () => {
      for (const body of childRequests) assert.ok(body.tools.every(tool => !banned.includes(tool.name)))
      assert.ok(childRequests[0].tools.some(tool => tool.name === 'bash'))
    })
    check(`${label} creates no delegated model request`, () => assert.equal(childRequests.length, 7))
    check(`${label} executor rejects every forced orchestration call`, () => {
      const results = childRequests.at(-1).messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_result')
      assert.equal(results.length, 6)
      assert.ok(results.slice(0, 5).every(result => result.is_error))
      assert.ok(!results[5].is_error)
    })
    const output = await readFile(path.join(taskHome, fixed ? 'fixed.txt' : 'default.txt'), 'utf8')
    check(`${label} retains permitted Bash file effects`, () => assert.equal(output, 'allowed'))
  }
  console.log(`${checks} workflow child tool checks passed`)
} finally {
  client.stop()
  server.closeAllConnections()
  server.close()
  await rm(taskHome, { recursive: true, force: true })
}
