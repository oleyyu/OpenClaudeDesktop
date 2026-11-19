// End-to-end: a thread that ran on a model other than the catalog's default must still report that model when a
// fresh core lists or cold-reads it (no log replay). It used to report the catalog default: the app's Background
// tasks pane then named the wrong model on every finished agent.
//
// Usage: node tests/cold-thread-model-smoke.mjs   (exit code 0 = passed; a scripted local model, no key or network)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const { CodexClient } = require('../../app/electron/codex.cjs')

const home = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'cd-cold-model-')))
const workspace = path.join(home, 'workspace')
await fs.mkdir(workspace, { recursive: true })

let counter = 0
const server = http.createServer(async (req, res) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"not_found_error","message":"no"}}'); return }
  const body = JSON.parse(raw), id = `msg_${++counter}`, usage = { input_tokens: 10, output_tokens: 5 }
  const blocks = [{ type: 'text', text: 'plain reply' }]
  if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: 'end_turn', stop_sequence: null, usage })); return }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  for (const [event, data] of [
    ['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
    ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'plain reply' } }],
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }],
    ['message_stop', { type: 'message_stop' }],
  ]) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.end()
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

process.env.HOME = home
process.env.DSH_HOME = path.join(home, 'dsh')
process.env.CODE_DESKTOP_CORE_STATE = path.join(home, 'state')
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${server.address().port}`
process.env.DEEPSEEK_API_KEY = 'sk-fake-cold-model'

async function core() {
  const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
  const events = [], waiters = new Set()
  client.on('event', (event) => { events.push(event); for (const waiter of waiters) waiter(event) })
  await client.start()
  const done = (threadId) => new Promise((resolve, reject) => {
    const hit = (event) => event.method === 'turn/completed' && event.params?.threadId === threadId
    if (events.some(hit)) return resolve()
    const timer = setTimeout(() => reject(new Error('timeout waiting for turn/completed')), 60000)
    const waiter = (event) => { if (hit(event)) { clearTimeout(timer); waiters.delete(waiter); resolve() } }
    waiters.add(waiter)
  })
  return { client, done }
}

let exitCode = 0
const cores = []
try {
  const first = await core(); cores.push(first.client)
  const models = (await first.client.request('model/list', { limit: 100 })).data
  const fallback = models.find((entry) => entry.isDefault) ?? models[0]
  const other = models.find((entry) => entry.id !== fallback.id)
  assert.ok(other, 'the catalog lists a model besides its default')
  const threadId = (await first.client.request('thread/start', { cwd: workspace, model: other.id, approvalPolicy: 'never', sandbox: 'read-only' })).thread.id
  await first.client.request('turn/start', { threadId, input: [{ type: 'text', text: 'hello' }] })
  await first.done(threadId)
  const warm = (await first.client.request('thread/list', { limit: 50 })).data.find((thread) => thread.id === threadId)
  assert.equal(warm?.model, other.id, 'the loaded thread names its model')
  first.client.stop()

  // A fresh core: the thread is not loaded, thread/list and a cold thread/read build its row without replaying the log.
  const second = await core(); cores.push(second.client)
  const read = (await second.client.request('thread/read', { threadId, includeTurns: false })).thread
  assert.equal(read.status?.type, 'notLoaded', 'the second core has not loaded the thread')
  // thread/list builds its rows the same way; a session this young may not be in the list cache yet, so it is optional.
  const listed = (await second.client.request('thread/list', { limit: 50 })).data.find((thread) => thread.id === threadId)
  console.log(JSON.stringify({ default: fallback.id, ranOn: other.id, coldRead: read.model, listed: listed?.model ?? '(not listed)' }))
  assert.equal(read.model, other.id, 'a cold thread/read names the model the thread ran on')
  if (listed) assert.equal(listed.model, other.id, 'thread/list names the model the thread ran on')
  console.log('PASS cold rows report the model the thread ran on')
} catch (error) {
  exitCode = 1
  console.error('FAIL', error.message)
} finally {
  for (const client of cores) { try { client.stop() } catch {} }
  server.close()
  await fs.rm(home, { recursive: true, force: true }).catch(() => {})
}
process.exit(exitCode)
