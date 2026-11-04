// Stop on a turn the DeepSeek bridge isn't running (packages/codex-app-server/src/index.js settleStaleTurn): the client
// missed that turn's turn/completed, or holds a stale turn from history, so its "working" state and its Stop would wait
// for an event that never comes. turn/interrupt answers it with a turn/completed for that turn. A running turn still
// ends once, through the projection. Real Harness core, scripted Anthropic-Messages model on loopback.
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

/** A model that answers one short text, after `gate` (when set) opens. */
async function fakeModel() {
  const state = { gate: null, requests: 0 }
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ type: 'error', error: { type: 'not_found_error', message: req.url } }))
      return
    }
    const body = JSON.parse(raw)
    state.requests += 1
    if (state.gate) await state.gate
    const id = `msg_${state.requests}`
    const usage = { input_tokens: 10, output_tokens: 5 }
    if (body.stream === false) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: [{ type: 'text', text: 'hello' }], stop_reason: 'end_turn', stop_sequence: null, usage }))
      return
    }
    if (res.destroyed) return
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    send('message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } })
    send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
    send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hello' } })
    send('content_block_stop', { type: 'content_block_stop', index: 0 })
    send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } })
    send('message_stop', { type: 'message_stop' })
    res.end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { state, url: `http://127.0.0.1:${server.address().port}`, close: () => { server.closeAllConnections?.(); server.close() } }
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

async function withCore(run) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-stop-stale-')))
  const workspace = path.join(home, 'w')
  fs.mkdirSync(workspace)
  const model = await fakeModel()
  const stderr = []
  const child = spawn(process.execPath, [path.join(root, 'bin/codex-app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home,
    env: {
      PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
      XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
      DEEPSEEK_BASE_URL: model.url, DEEPSEEK_API_KEY: 'sk-fake-stop-stale',
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
    const models = await call('model/list', {})
    const modelId = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
    await run({ call, notes, workspace, model, modelId })
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

const completions = (notes, from, turnId) => notes.slice(from).filter((note) => note.method === 'turn/completed' && note.params.turn?.id === turnId)

test('Stop on a turn the core is not running ends it in the client: unknown → interrupted, finished → as it ended', { timeout: 180000 }, async () => {
  await withCore(async ({ call, notes, workspace, modelId }) => {
    const { thread } = await call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'workspace-write' })
    const { turn } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'hi', text_elements: [] }] })
    await until(() => completions(notes, 0, turn.id).length, 'the first turn/completed', 90000)

    // The client still shows a turn the core never ran (a stale one): Stop settles it as interrupted.
    let from = notes.length
    assert.deepEqual(await call('turn/interrupt', { threadId: thread.id, turnId: 'turn-stale' }), {})
    const stale = await until(() => completions(notes, from, 'turn-stale')[0], 'the stale turn settled')
    assert.equal(stale.params.threadId, thread.id)
    assert.equal(stale.params.turn.status, 'interrupted')
    assert.equal(stale.params.turn.error, null)

    // The client missed the real turn/completed of a turn that finished: Stop re-sends it as it ended.
    from = notes.length
    await call('turn/interrupt', { threadId: thread.id, turnId: turn.id })
    const again = await until(() => completions(notes, from, turn.id)[0], 'the finished turn settled again')
    assert.equal(again.params.turn.status, 'completed')

    // Without a turn id (an older client) nothing is invented.
    from = notes.length
    await call('turn/interrupt', { threadId: thread.id })
    await sleep(300)
    assert.equal(notes.slice(from).filter((note) => note.method === 'turn/completed').length, 0)

    // A session this core does not have loaded runs nothing: its stale turn is settled too.
    from = notes.length
    await call('turn/interrupt', { threadId: '00000000-0000-4000-8000-000000000000', turnId: 'turn-elsewhere' })
    const unloaded = await until(() => completions(notes, from, 'turn-elsewhere')[0], 'the unloaded thread’s stale turn')
    assert.equal(unloaded.params.turn.status, 'interrupted')
  })
})

test('Stop on the running turn still ends it exactly once, through the projection', { timeout: 180000 }, async () => {
  await withCore(async ({ call, notes, workspace, model, modelId }) => {
    const { thread } = await call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'workspace-write' })
    let release
    model.state.gate = new Promise((resolve) => { release = resolve })
    try {
      const { turn } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'wait', text_elements: [] }] })
      await until(() => notes.some((note) => note.method === 'turn/started' && note.params.turn?.id === turn.id), 'the running turn')
      await until(() => model.state.requests > 0, 'the model request')
      const from = notes.length
      await call('turn/interrupt', { threadId: thread.id, turnId: turn.id })
      const stopped = await until(() => completions(notes, from, turn.id)[0], 'the stopped turn', 90000)
      assert.equal(stopped.params.turn.status, 'interrupted')
      await sleep(500)
      assert.equal(completions(notes, from, turn.id).length, 1, 'one turn/completed for the stopped turn')
    } finally {
      release()
    }
  })
})
