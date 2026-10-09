// The real DeepSeek core (bin/codex-app-server.mjs over app/electron/codex.cjs) against a scripted local Anthropic
// Messages server, in an isolated HOME/DSH_HOME. `respond(body)` answers each model request with
// {text} | {name, input} (one tool call) | 'hang' (held open until the core drops it).
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { CodexClient } = require('../../app/electron/codex.cjs')
const root = path.resolve(import.meta.dirname, '..')

export const textOf = (content) => typeof content === 'string' ? content : Array.isArray(content) ? content.map((block) => block.type === 'text' ? block.text : block.type === 'tool_result' ? textOf(block.content) : '').join('') : ''
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function until(check, label, ms = 30000) {
  const end = Date.now() + ms
  for (;;) {
    const value = check()
    if (value) return value
    if (Date.now() > end) throw new Error(`timed out waiting for ${label}`)
    await sleep(25)
  }
}

export async function core(t, respond) {
  const home = await realpath(await mkdtemp(path.join(os.tmpdir(), 'lab-wf-core-')))
  const hanging = new Set(), requests = []
  let sequence = 0
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404).end(); return }
    const body = JSON.parse(raw)
    requests.push(body)
    const action = await respond(body)
    if (action === 'hang') { hanging.add(res); res.on('close', () => hanging.delete(res)); return }
    const id = ++sequence
    const block = action?.name ? { type: 'tool_use', id: `call_${id}`, name: action.name, input: action.input } : { type: 'text', text: action?.text ?? 'DONE' }
    const message = { id: `m_${id}`, type: 'message', role: 'assistant', model: body.model, content: [block], stop_reason: action?.name ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: 10, output_tokens: 4 } }
    if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(message)); return }
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const data of [
      { type: 'message_start', message: { ...message, content: [], stop_reason: null } },
      { type: 'content_block_start', index: 0, content_block: action?.name ? { ...block, input: {} } : { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: action?.name ? { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } : { type: 'text_delta', text: block.text } },
      { type: 'content_block_stop', index: 0 },
      { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 4 } },
      { type: 'message_stop' },
    ]) res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  Object.assign(process.env, {
    HOME: home, DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
    DEEPSEEK_BASE_URL: `http://127.0.0.1:${server.address().port}`, DEEPSEEK_API_KEY: 'sk-local-fixture',
  })
  const events = []
  const connect = async () => {
    const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
    client.on('event', (event) => events.push(event))
    await client.start()
    return client
  }
  let client = null
  t.after(async () => {
    client?.stop()
    for (const res of hanging) res.destroy()
    server.closeAllConnections()
    server.close()
    await rm(home, { recursive: true, force: true })
  })
  client = await connect()
  const models = await client.request('model/list', { limit: 100 })
  const model = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
  const workspace = path.join(home, 'ws')
  await mkdir(workspace)
  const thread = async (params = {}) => (await client.request('thread/start', { cwd: workspace, model, approvalPolicy: 'never', sandbox: 'workspace-write', ...params })).thread.id
  // The app's quit and relaunch: the same state folders, a new core process.
  const restart = async () => {
    await client.stopAndWait()
    for (const res of hanging) res.destroy()
    client = await connect()
    return client
  }
  return { client, events, requests, hanging, thread, workspace, model, restart }
}
