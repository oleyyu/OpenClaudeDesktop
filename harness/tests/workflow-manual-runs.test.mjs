// Manual workflow runs (codeDesktop/workflow/startScript, workflow-execution.js) on the real DeepSeek core: a scripted
// local Anthropic Messages server answers (a child whose prompt says CHILD_HANG waits until its request is dropped).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')
const textOf = (content) => typeof content === 'string' ? content : Array.isArray(content) ? content.map((block) => block.type === 'text' ? block.text : '').join('') : ''
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function until(check, label, ms = 30000) {
  const end = Date.now() + ms
  for (;;) {
    const value = check()
    if (value) return value
    if (Date.now() > end) throw new Error(`timed out waiting for ${label}`)
    await sleep(25)
  }
}

async function core(t) {
  const home = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-wf-manual-')))
  const hanging = new Set()
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
    const body = JSON.parse(raw)
    if (textOf(body.messages[0]?.content).includes('CHILD_HANG')) { hanging.add(res); res.on('close', () => hanging.delete(res)); return }
    const message = { id: 'm', type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'DONE' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 4 } }
    if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(message)); return }
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const data of [
      { type: 'message_start', message: { ...message, content: [], stop_reason: null } },
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'DONE' } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } },
      { type: 'message_stop' },
    ]) res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  Object.assign(process.env, {
    HOME: home, DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${server.address().port}`, DEEPSEEK_API_KEY: 'sk-local-fixture',
  })
  const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
  t.after(async () => {
    client.stop()
    for (const res of hanging) res.destroy()
    server.closeAllConnections()
    server.close()
    await rm(home, { recursive: true, force: true })
  })
  await client.start()
  const models = await client.request('model/list', { limit: 100 })
  const model = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
  const workspace = path.join(home, 'ws')
  await mkdir(workspace)
  const thread = async (params = {}) => (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'workspace-write', ...params })).thread.id
  return { client, hanging, thread }
}

test('a thread holding a manual workflow run stays loaded: leaving it keeps the run reachable', { timeout: 120000 }, async (t) => {
  const { client, hanging, thread } = await core(t)
  const threadId = await thread()
  const run = await client.request('codeDesktop/workflow/startScript', { threadId, script: 'export const meta={name:"held",description:"Held run"}; return await agent("CHILD_HANG held")' })
  // The app leaves the session at once (sidebar switch): its run must not lose its parent agent or its holder.
  await client.request('thread/unsubscribe', { threadId })
  await until(() => hanging.size === 1, 'the run’s child request')
  assert.deepEqual(await client.request('codeDesktop/workflow/stop', { threadId, runId: run.runId, attemptId: run.attemptId }), { status: 'stopping' })
  const result = await client.request('codeDesktop/workflow/scriptResult', { threadId, runId: run.runId, attemptId: run.attemptId })
  assert.equal(result.stopReason, 'cancelled')
  await client.request('codeDesktop/workflow/releaseScript', { threadId, runId: run.runId, attemptId: run.attemptId })
  await until(() => hanging.size === 0, 'the child request to be dropped')
})
