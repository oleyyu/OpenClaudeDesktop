// Installed code-desktop Workflow test: real tool selection, Bash execution and file effects.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, realpath, readFile, writeFile, rm, stat } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')
const taskHome = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-selector-')))
const requests = []
let sequence = 0
const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
  let raw = ''
  for await (const chunk of req) raw += chunk
  const body = JSON.parse(raw)
  requests.push(body)
  const clamp = JSON.stringify(body.messages).includes('CLAMP_RUN')
  const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use').length
  const actions = clamp
    ? [{ name: 'bash', input: { command: "printf '(ok)' > clamp.txt", description: 'Check escaped command rule' } }]
    : [{ name: 'read', input: { file_path: 'private.txt' } }, { name: 'write', input: { file_path: 'denied.txt', content: 'not allowed' } }, { name: 'bash', input: { command: 'printf selected > selected.txt', description: 'Write permitted selector result' } }]
  const action = actions[calls]
  const id = `selector_${++sequence}`
  const content = action ? { type: 'tool_use', id: `call_${sequence}`, ...action } : { type: 'text', text: clamp ? 'CLAMP_DONE' : 'SELECTORS_DONE' }
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
await writeFile(path.join(taskHome, '.claude/agents/selectors.md'), '---\nname: selectors\ndescription: Tool selector fixture\ntools: Bash(echo:*) Read(src/*) Write(*)\ndisallowedTools: Read(private/*)\n---\nSELECTOR_PERSONA\n')
await writeFile(path.join(taskHome, 'private.txt'), 'MUST_NOT_REACH_MODEL')
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
  const selected = await workflow('return await agent("Run the selected tools",{agentType:"selectors",disallowedTools:["Write(other/*)"]})')
  check('space-separated argument-bearing tool selectors start the child', () => assert.equal(selected.value, 'SELECTORS_DONE'))
  check('child schema intersects definition and caller denials', () => assert.deepEqual(requests[0].tools.map(tool => tool.name), ['bash']))
  const allowed = await readFile(path.join(taskHome, 'selected.txt'), 'utf8')
  check('tool-list arguments admit the whole Bash tool rather than a command pattern', () => assert.equal(allowed, 'selected'))
  const denied = await stat(path.join(taskHome, 'denied.txt')).then(() => true, () => false)
  check('argument-bearing caller denial prevents Write side effects', () => assert.equal(denied, false))
  check('argument-bearing definition denial prevents Read content reaching the model', () => assert.ok(!JSON.stringify(requests).includes('MUST_NOT_REACH_MODEL')))
  const before = requests.length
  const inert = await workflow('try { await agent("INERT_CLAMP",{bashCommandClamp:["Bash(*)"]}); return "incorrectly admitted" } catch (error) { return String(error) }')
  check('Bash(*) is rejected as an inert command clamp', () => assert.match(inert.value, /invalid bashCommandClamp rule/))
  check('inert clamp rejection happens before the child requests a model', () => assert.equal(requests.length, before))
  const rule = String.raw`Bash(printf '\(ok\)')`
  const escaped = await workflow(`return await agent("CLAMP_RUN",{bashCommandClamp:${JSON.stringify([rule])}})`)
  check('escaped parentheses in a clamp permit the matching real command', () => assert.equal(escaped.value, 'CLAMP_DONE'))
  const result = await readFile(path.join(taskHome, 'clamp.txt'), 'utf8')
  check('escaped clamp writes the expected literal value', () => assert.equal(result, '(ok)'))
  console.log(`${checks} tool selector checks passed`)
} finally {
  client.stop()
  server.closeAllConnections()
  server.close()
  await rm(taskHome, { recursive: true, force: true })
}
