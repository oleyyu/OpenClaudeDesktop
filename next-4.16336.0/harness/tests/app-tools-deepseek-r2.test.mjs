// OpenClaude Desktop's own tools (code_desktop, app/electron/agent-tools-server.mjs) on the DeepSeek core, round 2: the real
// core (bin/codex-app-server.mjs) in a temp home, a fake app channel and a scripted loopback model.
//   - a turn/start sent right after thread/start, or right after thread/unsubscribe (a Cron prompt or a workflow
//     <task-notification> reaching a session the user left), sees mcp__code_desktop__* on its first request;
//   - sub-agents borrow the root thread's client: no server process (no hello) of their own;
//   - Stop during a code_desktop call leaves an interrupted row, and the model's history says "tool call aborted",
//     never "Error: [object Object]".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { boundedReady, sessionToken, shareAppTools } from '../packages/codex-app-server/src/app-tools.js'
import { completeToolItem, toolItem } from '../packages/codex-app-server/src/projection.js'

const root = path.resolve(import.meta.dirname, '..')
const SERVER_SCRIPT = path.resolve(root, '../app/electron/agent-tools-server.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const APP_TOOL = 'mcp__code_desktop__ping'

/** The app's side of the channel (agent-tools-host.cjs serve): ping answers, hang never does. */
async function fakeChannel(dir, token) {
  const seen = { hellos: [], calls: [], cancels: [] }
  const socketPath = path.join(dir, 's')
  const server = net.createServer((socket) => {
    let buffer = ''
    let hello = null
    socket.setEncoding('utf8')
    socket.on('data', (chunk) => {
      buffer += chunk
      let newline
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(buffer.slice(0, newline))
        buffer = buffer.slice(newline + 1)
        if (!hello) {
          if (message.type !== 'hello' || message.token !== sessionToken(token, message.session)) { socket.destroy(); return }
          hello = message
          seen.hellos.push(message.session)
          socket.write(JSON.stringify({ type: 'welcome' }) + '\n')
          continue
        }
        if (message.method === 'list') {
          socket.write(JSON.stringify({ id: message.id, result: { tools: [
            { name: 'ping', description: 'Answers pong.', inputSchema: { type: 'object', properties: {} } },
            { name: 'hang', description: 'Never answers.', inputSchema: { type: 'object', properties: {} } },
          ] } }) + '\n')
        } else if (message.method === 'call') {
          seen.calls.push({ session: hello.session, name: message.params?.name })
          if (message.params?.name === 'ping') socket.write(JSON.stringify({ id: message.id, result: { content: [{ type: 'text', text: 'pong' }] } }) + '\n')
        } else if (message.type === 'cancel') seen.cancels.push(message.id)
      }
    })
    socket.on('error', () => {})
  })
  await new Promise((resolve) => server.listen(socketPath, resolve))
  return { seen, socketPath, close: () => server.close() }
}

/** Scripted Anthropic Messages server. CALL_HANG calls hang; SPAWN_CHILD delegates "CHILD_TASK" (which pings). */
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
    const last = body.messages.at(-1)
    const lastText = JSON.stringify(last?.content ?? '')
    const answered = Array.isArray(last?.content) && last.content.some((block) => block.type === 'tool_result')
    const has = (name) => (body.tools ?? []).some((tool) => tool.name === name)
    const child = JSON.stringify(body.messages[0]?.content ?? '').includes('CHILD_TASK')
    const id = `msg_${requests.length}`
    const usage = { input_tokens: 10, output_tokens: 5 }
    const use = (name, input = {}) => ({ type: 'tool_use', id: `toolu_${requests.length}`, name, input })
    const block = answered ? { type: 'text', text: 'done' }
      : child && has(APP_TOOL) ? use(APP_TOOL)
        : lastText.includes('CALL_HANG') && has('mcp__code_desktop__hang') ? use('mcp__code_desktop__hang')
          : lastText.includes('SPAWN_CHILD') && has('subagent') ? use('subagent', { description: 'ping the app', prompt: 'CHILD_TASK' })
            : { type: 'text', text: 'hello' }
    const tool = block.type === 'tool_use'
    const events = [
      ['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: tool ? { ...block, input: {} } : { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: tool ? { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } : { type: 'text_delta', text: block.text } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: tool ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }],
      ['message_stop', { type: 'message_stop' }],
    ]
    if (body.stream === false) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: [block], stop_reason: tool ? 'tool_use' : 'end_turn', stop_sequence: null, usage }))
      return
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
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

test('boundedReady: nothing installed stays undefined; a stuck server releases the wait', async () => {
  assert.equal(boundedReady(undefined), undefined)
  const started = Date.now()
  await boundedReady(new Promise(() => {}), 50)
  assert.ok(Date.now() - started < 2000)
  await boundedReady(Promise.resolve(), 50)
  assert.equal(shareAppTools(null, null, null), false)
})

test('projection: an MCP call stopped before the bridge recorded it as aborted is interrupted, not "[object Object]"', () => {
  const item = toolItem({ callId: 'c1', name: 'mcp__code_desktop__screenshot', args: {} })
  assert.equal(item.type, 'mcpToolCall')
  const legacy = completeToolItem(item, { name: 'mcp__code_desktop__screenshot', args: {}, result: { content: [{ type: 'text', text: 'Error: [object Object]' }], isError: true }, durationMs: 3 })
  assert.equal(legacy.status, 'interrupted')
  assert.equal(legacy.error, null)
  const aborted = completeToolItem(item, { name: 'mcp__code_desktop__screenshot', args: {}, result: { content: [{ type: 'text', text: 'Error: tool call aborted' }], isError: true }, error: { message: 'tool call aborted', info: { name: 'AbortError', code: 'ABORTED' } }, durationMs: 3 })
  assert.equal(aborted.status, 'interrupted')
  // A real failure stays failed with its text.
  const failed = completeToolItem(item, { name: 'mcp__code_desktop__screenshot', args: {}, result: { content: [{ type: 'text', text: 'Error: no preview is open' }], isError: true }, durationMs: 3 })
  assert.equal(failed.status, 'failed')
  assert.equal(failed.error.message, 'Error: no preview is open')
})

test('DeepSeek core: first turns see OpenClaude Desktop tools, sub-agents share the root client, Stop interrupts an app tool call', { timeout: 240000 }, async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-ds2-')))
  const workspace = path.join(home, 'w')
  fs.mkdirSync(workspace)
  const token = 'secret-token-r2'
  const channel = await fakeChannel(home, token)
  const model = await fakeModel()
  const stderr = []
  const child = spawn(process.execPath, [path.join(root, 'bin/codex-app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home,
    env: {
      PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
      XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
      DEEPSEEK_BASE_URL: model.url, DEEPSEEK_API_KEY: 'sk-fake-app-tools-r2',
      CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: process.execPath, args: [SERVER_SCRIPT], env: {} }),
      CODE_DESKTOP_AGENT_TOOLS_SOCKET: channel.socketPath, CODE_DESKTOP_AGENT_TOOLS_TOKEN: token,
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
  const call = (method, params, ms = 60000) => client.call(method, params, ms)
  const turnDone = (turnId, label) => until(() => notes.find((note) => note.method === 'turn/completed' && note.params.turn.id === turnId), label, 120000)
  const firstRequestWith = (marker) => model.requests.find((body) => JSON.stringify(body.messages.at(-1)?.content ?? '').includes(marker))
  const toolNames = (body) => (body?.tools ?? []).map((tool) => tool.name)
  try {
    await call('initialize', { clientInfo: { name: 'code_desktop_test', title: 'test', version: '0.0.0' }, capabilities: { experimentalApi: true } }, 120000)
    client.notify('initialized', {})
    const models = await call('model/list', {})
    const modelId = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
    // A turn sent the moment thread/start answers: its first request already lists the app's tools.
    const { thread } = await call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'workspace-write' })
    const { turn: first } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'FIRST_TURN', text_elements: [] }] })
    await turnDone(first.id, 'the first turn')
    assert.ok(toolNames(firstRequestWith('FIRST_TURN')).includes(APP_TOOL), `first request tools: ${toolNames(firstRequestWith('FIRST_TURN'))}`)
    assert.deepEqual(channel.seen.hellos, [thread.id])

    // A sub-agent borrows the root's client: its call reaches the app for the root session, and no second server starts.
    const { turn: delegated } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'SPAWN_CHILD', text_elements: [] }] })
    await turnDone(delegated.id, 'the delegating turn')
    await until(() => channel.seen.calls.some((entry) => entry.name === 'ping'), 'the sub-agent’s ping', 120000)
    const childRequest = model.requests.find((body) => JSON.stringify(body.messages[0]?.content ?? '').includes('CHILD_TASK'))
    assert.ok(toolNames(childRequest).includes(APP_TOOL), 'the sub-agent saw the app tool on its first step')
    assert.deepEqual(channel.seen.calls.filter((entry) => entry.name === 'ping').map((entry) => entry.session), [thread.id])
    assert.deepEqual(channel.seen.hellos, [thread.id], 'the sub-agent started no code_desktop server of its own')

    // Stop while a code_desktop call waits on the app: an interrupted row, and the model is told it was aborted.
    const { turn: hanging } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'CALL_HANG', text_elements: [] }] })
    await until(() => channel.seen.calls.some((entry) => entry.name === 'hang'), 'the hang call')
    await call('turn/interrupt', { threadId: thread.id, turnId: hanging.id })
    const stopped = await turnDone(hanging.id, 'the stopped turn')
    assert.equal(stopped.params.turn.status, 'interrupted')
    const row = await until(() => notes.find((note) => note.method === 'item/completed' && note.params.item?.type === 'mcpToolCall' && note.params.item.tool === 'hang')?.params.item, 'the hang row')
    assert.equal(row.status, 'interrupted')
    assert.equal(row.error, null)
    const { turn: after } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'AFTER_STOP', text_elements: [] }] })
    await turnDone(after.id, 'the turn after the stop')
    const history = JSON.stringify(firstRequestWith('AFTER_STOP')?.messages ?? [])
    assert.ok(!history.includes('[object Object]'), 'the model history has no "[object Object]"')
    assert.ok(history.includes('tool call aborted'), 'the model history says the call was aborted')

    // The user leaves the session (thread/unsubscribe unloads it); a prompt then reopens it: its first request lists the tools.
    await call('thread/unsubscribe', { threadId: thread.id })
    const { turn: reopened } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'REOPENED_TURN', text_elements: [] }] })
    await turnDone(reopened.id, 'the reopened turn')
    assert.ok(toolNames(firstRequestWith('REOPENED_TURN')).includes(APP_TOOL), `reopened request tools: ${toolNames(firstRequestWith('REOPENED_TURN'))}`)
  } catch (error) {
    error.message += `\n--- core stderr ---\n${stderr.join('').slice(-4000)}`
    throw error
  } finally {
    client.close?.()
    child.kill('SIGTERM')
    await sleep(300)
    channel.close()
    model.close()
  }
})
