// Session lifecycle of the DeepSeek core's Codex bridge (packages/codex-app-server/src/index.js) on the real Harness
// core, spawned against a scripted Anthropic-Messages model on loopback: no key, no network, a private
// HOME/DSH_HOME/XDG under a temp root.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'

const root = path.resolve(import.meta.dirname, '..')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** A scripted model: every request gets one short text answer. */
async function fakeModel() {
  const requests = []
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: req.url } }))
      return
    }
    const body = JSON.parse(raw)
    requests.push(body)
    const id = `msg_${requests.length}`
    const usage = { input_tokens: 10, output_tokens: 5 }
    const text = 'hello'
    if (body.stream === false) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', stop_sequence: null, usage }))
      return
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    send('message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } })
    send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } })
    send('content_block_stop', { type: 'content_block_stop', index: 0 })
    send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } })
    send('message_stop', { type: 'message_stop' })
    res.end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { requests, url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }
}

async function until(check, label, ms = 60000) {
  const end = Date.now() + ms
  for (;;) {
    const value = check()
    if (value) return value
    if (Date.now() > end) throw new Error(`timed out waiting for ${label}`)
    await sleep(50)
  }
}

/** The core on a private home; `run(call, notes, home)` drives it. */
async function withCore(run) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-lifecycle-')))
  const workspace = path.join(home, 'w')
  fs.mkdirSync(workspace)
  const model = await fakeModel()
  const stderr = []
  const child = spawn(process.execPath, [path.join(root, 'bin/codex-app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home,
    env: {
      PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
      XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
      DEEPSEEK_BASE_URL: model.url, DEEPSEEK_API_KEY: 'sk-fake-lifecycle',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const notes = []
  const client = new LineTransport(child.stdout, child.stdin, {
    onRequest: async () => ({ decision: 'accept' }),
    onNotification: (method, params) => notes.push({ method, params }),
    log: () => {},
  })
  client.start()
  try {
    const call = (method, params, ms = 60000) => client.call(method, params, ms)
    await call('initialize', { clientInfo: { name: 'code_desktop_test', title: 'test', version: '0.0.0' }, capabilities: { experimentalApi: true } }, 120000)
    client.notify('initialized', {})
    await run({ call, notes, home, workspace })
  } catch (error) {
    error.message += `\n--- core stderr ---\n${stderr.join('').slice(-4000)}`
    throw error
  } finally {
    client.close?.()
    child.kill('SIGTERM')
    await sleep(300)
    model.close()
    fs.rmSync(home, { recursive: true, force: true })
  }
}

test('a review stopped before its prompt was logged ends review mode: the thread can review again and change modes', { timeout: 180000 }, async () => {
  await withCore(async ({ call, notes, workspace }) => {
    const models = await call('model/list', {})
    const model = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
    const { thread } = await call('thread/start', { cwd: workspace, model, approvalPolicy: 'on-request', sandbox: 'workspace-write' })
    const { turn } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'hi', text_elements: [] }] })
    await until(() => notes.some((note) => note.method === 'turn/completed' && note.params.turn.id === turn.id), 'turn/completed', 90000)
    // Review code, then Stop at once: the review's turn opens and claims the prompt, and is cancelled before the
    // prompt reaches the log (as a blocked prompt would end it too).
    const from = notes.length
    await call('review/start', { threadId: thread.id, target: { type: 'uncommittedChanges' } })
    await call('turn/interrupt', { threadId: thread.id })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the stopped review turn', 90000)
    await until(() => notes.slice(from).some((note) => note.method === 'thread/status/changed' && note.params.threadId === thread.id && note.params.status.type === 'idle'), 'idle', 90000)
    // The review is over: a mode change applies, and the next review starts.
    const applied = await call('codeDesktop/thread/permissions', { threadId: thread.id, approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: true }, codeDesktop: { permissionMode: 'auto' } })
    assert.deepEqual(applied, { applied: true })
    const again = await call('review/start', { threadId: thread.id, target: { type: 'uncommittedChanges' } })
    assert.equal(again.reviewThreadId, thread.id)
  })
})
