// Installed code-desktop Loader/profile smoke for Claude command-hook context.
// The local model records requests; real shell hooks and Workflow children run.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, realpath, readFile, writeFile, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')
const home = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-hook-context-')))
const requests = []
let count = 0
const server = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
  const body = JSON.parse(raw)
  requests.push(body)
  const id = `msg_${++count}`
  const usage = { input_tokens: 10, output_tokens: 3 }
  const message = { id, type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'HOOK_CONTEXT_OK' }], stop_reason: 'end_turn', stop_sequence: null, usage }
  if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(message)); return }
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const [event, data] of [
    ['message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'HOOK_CONTEXT_OK' } }],
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 3 } }],
    ['message_stop', { type: 'message_stop' }],
  ]) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await writeFile(path.join(home, 'hooks.json'), JSON.stringify({ hooks: {
  SessionStart: [{ hooks: [{ type: 'command', command: 'printf STARTUP_PLAIN_CONTEXT' }] }],
  UserPromptSubmit: [{ hooks: [
    { type: 'command', command: 'printf PROMPT_PLAIN_CONTEXT' },
    { type: 'command', command: `printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"STRUCTURED_CONTEXT"}}'` },
    { type: 'command', command: 'printf FAILED_CONTEXT_MUST_NOT_APPEAR; exit 1' },
    { type: 'command', command: `printf '{"continue":true}'` },
    { type: 'command', command: 'exec node late-hook.cjs', timeout: 0.5 },
  ] }],
} }))
// The process emits control fields from its TERM handler; the executor must
// retain the timeout classification regardless of that numeric exit code.
await writeFile(path.join(home, 'late-hook.cjs'), `process.on('SIGTERM',()=>{require('fs').writeFileSync('late-hook-handled','handled');console.log(JSON.stringify({continue:false,hookSpecificOutput:{hookEventName:'UserPromptSubmit',additionalContext:'TIMED_OUT_CONTEXT_MUST_NOT_APPEAR'}}));process.exit(0)});setInterval(()=>{},1000)`)
await writeFile(path.join(home, 'hooks.patch.yml'), JSON.stringify([{ insert: [{ id: 'hook-context-smoke', name: '@deepseek-ai/dsh-hooks-claude-code', config: { configPath: path.join(home, 'hooks.json') } }] }]))
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
  const run = await client.request('codeDesktop/workflow/startScript', { threadId, script: 'export const meta={name:"hook-context",description:"Command hook stdout"}; return await agent("Confirm hook context")' })
  const result = await client.request('codeDesktop/workflow/scriptResult', { threadId, runId: run.runId })
  check('workflow child completes after a command hook times out', () => assert.equal(result.value, 'HOOK_CONTEXT_OK'))
  const request = requests.find(body => JSON.stringify(body.messages).includes('Confirm hook context'))
  check('workflow child made a model request', () => assert.ok(request))
  const text = JSON.stringify(request.messages)
  check('startup prose reaches the first request with CLI framing', () => assert.ok(text.includes('SessionStart:startup hook success: STARTUP_PLAIN_CONTEXT')))
  check('prompt prose reaches the first request with CLI framing', () => assert.ok(text.includes('UserPromptSubmit hook success: PROMPT_PLAIN_CONTEXT')))
  check('structured additionalContext remains available', () => assert.ok(text.includes('STRUCTURED_CONTEXT')))
  check('failed hook stdout stays out of model context', () => assert.ok(!text.includes('FAILED_CONTEXT_MUST_NOT_APPEAR')))
  check('timed-out hook context is discarded', () => assert.ok(!text.includes('TIMED_OUT_CONTEXT_MUST_NOT_APPEAR')))
  const handled = await readFile(path.join(home, 'late-hook-handled'), 'utf8')
  check('the timed-out process ran its termination handler', () => assert.equal(handled, 'handled'))
  check('JSON control output does not become prose', () => assert.ok(!text.includes('hook success: {')))
  await client.request('codeDesktop/workflow/releaseScript', { threadId, runId: run.runId })
  console.log(`${checks.length} hook context checks passed`)
} finally {
  client.stop()
  server.closeAllConnections()
  server.close()
  await rm(home, { recursive: true, force: true })
}
