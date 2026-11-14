// Installed code-desktop Loader/profile smoke for local-agent HTTP hooks.
// The local model records requests; real HTTP hooks, Bash tools and Workflow children run.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, realpath, readFile, writeFile, rm, stat } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')
const home = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-http-hook-')))
const requests = []
const hookRequests = []
let count = 0
const server = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (req.method === 'POST' && req.url === '/hook') {
    const payload = JSON.parse(raw)
    hookRequests.push({ payload, authorization: req.headers.authorization })
    let output = {}
    if (payload.hook_event_name === 'PreToolUse') {
      output = { hookSpecificOutput: payload.tool_input.command.includes('denied.txt')
        ? { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'HTTP_TOOL_DENIED' }
        : { hookEventName: 'PreToolUse', updatedInput: { ...payload.tool_input, command: payload.tool_input.command.replace('original', 'rewritten') }, additionalContext: 'HTTP_PRE_CONTEXT' } }
    } else if (payload.hook_event_name === 'PostToolUse') {
      output = { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'HTTP_POST_CONTEXT' } }
    } else if (payload.hook_event_name === 'SubagentStop' && !payload.stop_hook_active) {
      output = { decision: 'block', reason: 'HTTP_STOP_CONTINUE' }
    }
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(output))
    return
  }
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
  const body = JSON.parse(raw)
  requests.push(body)
  const id = `msg_${++count}`
  const usage = { input_tokens: 10, output_tokens: 3 }
  const calls = body.messages.flatMap(message => Array.isArray(message.content) ? message.content : []).filter(block => block.type === 'tool_use' && block.name === 'bash').length
  const answer = calls < 2 ? { type: 'tool_use', id: `tool_${count}`, name: 'bash', input: { command: calls === 0 ? 'printf denied > denied.txt' : 'printf original > allowed.txt', description: 'HTTP hook integration' } }
    : { type: 'text', text: JSON.stringify(body.messages).includes('HTTP_STOP_CONTINUE') ? 'HTTP_HOOK_DONE' : 'first answer' }
  const message = { id, type: 'message', role: 'assistant', model: body.model, content: [answer], stop_reason: answer.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null, usage }
  if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(message)); return }
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const [event, data] of [
    ['message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: answer.type === 'tool_use' ? { ...answer, input: {} } : { type: 'text', text: '' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: answer.type === 'tool_use' ? { type: 'input_json_delta', partial_json: JSON.stringify(answer.input) } : { type: 'text_delta', text: answer.text } }],
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 3 } }],
    ['message_stop', { type: 'message_stop' }],
  ]) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}/hook`
await mkdir(path.join(home, '.claude/agents'), { recursive: true })
await writeFile(path.join(home, '.claude.json'), JSON.stringify({ projects: { [home]: { hasTrustDialogAccepted: true } } }))
const hook = { type: 'http', url, headers: { Authorization: 'Bearer $HOOK_SMOKE_TOKEN' }, allowedEnvVars: ['HOOK_SMOKE_TOKEN'] }
const hooks = Object.fromEntries(['PreToolUse', 'PostToolUse', 'Stop'].map(point => [point, [{ hooks: [hook] }]]))
await writeFile(path.join(home, '.claude/agents/http-guard.md'), '---\nname: http-guard\ndescription: HTTP hook fixture\ntools: [Bash]\nhooks: ' + JSON.stringify(hooks) + '\n---\nHTTP_HOOK_PERSONA\n')
await writeFile(path.join(home, 'hooks.json'), '{}')
await writeFile(path.join(home, 'hooks.patch.yml'), JSON.stringify([{ insert: [{ id: 'http-hook-smoke', name: '@deepseek-ai/dsh-hooks-claude-code', config: { configPath: path.join(home, 'hooks.json'), allowedHttpHookUrls: [url], httpHookAllowedEnvVars: ['HOOK_SMOKE_TOKEN'] } }] }]))
process.env.HOOK_SMOKE_TOKEN = 'local-hook-token'
process.env.HOME = home
process.env.DSH_HOME = path.join(home, 'dsh')
process.env.CODE_DESKTOP_CORE_STATE = path.join(home, 'state')
process.env.CODE_DESKTOP_CORE_PATCHES = path.join(home, 'hooks.patch.yml')
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${server.address().port}`
process.env.DEEPSEEK_API_KEY = 'sk-local-hook-fixture'
const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
const checks = []
const check = (name, fn) => { fn(); checks.push(name); console.log('PASS', name) }
try {
  await client.start()
  const models = await client.request('model/list', { limit: 100 })
  const model = models.data.find(entry => entry.isDefault)?.id ?? models.data[0]?.id
  const threadId = (await client.request('thread/start', { cwd: home, model, approvalPolicy: 'never', sandbox: 'workspace-write' })).thread.id
  const run = await client.request('codeDesktop/workflow/startScript', { threadId, script: 'export const meta={name:"http-hook",description:"HTTP tool hooks"}; return await agent("Run the guarded commands",{agentType:"http-guard"})' })
  const result = await client.request('codeDesktop/workflow/scriptResult', { threadId, runId: run.runId })
  check('HTTP Stop hook forces continuation and then settles', () => assert.equal(result.value, 'HTTP_HOOK_DONE'))
  const denied = await stat(path.join(home, 'denied.txt')).then(() => true, () => false)
  check('HTTP PreToolUse deny prevents the file side effect', () => assert.equal(denied, false))
  const contents = await readFile(path.join(home, 'allowed.txt'), 'utf8')
  check('HTTP updatedInput changes the command before dispatch', () => assert.equal(contents, 'rewritten'))
  check('hook requests carry canonical events in execution order', () => assert.deepEqual(hookRequests.map(entry => entry.payload.hook_event_name), ['PreToolUse', 'PreToolUse', 'PostToolUse', 'SubagentStop', 'SubagentStop']))
  check('HTTP headers interpolate the explicitly allowed variable', () => assert.ok(hookRequests.every(entry => entry.authorization === 'Bearer local-hook-token')))
  check('post-tool payload observes the accepted input', () => assert.equal(hookRequests[2].payload.tool_input.command, 'printf rewritten > allowed.txt'))
  const text = JSON.stringify(requests.at(-1).messages)
  check('denial feedback reaches the model', () => assert.ok(text.includes('HTTP_TOOL_DENIED')))
  check('HTTP pre/post additionalContext reaches the model', () => assert.ok(text.includes('HTTP_PRE_CONTEXT') && text.includes('HTTP_POST_CONTEXT')))
  check('Stop payload marks the second stop as already continued', () => assert.deepEqual(hookRequests.slice(-2).map(entry => entry.payload.stop_hook_active), [false, true]))
  await client.request('codeDesktop/workflow/releaseScript', { threadId, runId: run.runId })
  console.log(`${checks.length} HTTP hook checks passed`)
} finally {
  client.stop()
  server.closeAllConnections()
  server.close()
  await rm(home, { recursive: true, force: true })
}
