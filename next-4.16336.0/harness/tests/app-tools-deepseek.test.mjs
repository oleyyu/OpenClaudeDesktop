// OpenClaude Desktop's own tools server ("code_desktop", app/electron/agent-tools-server.mjs) on the DeepSeek core
// (packages/codex-app-server/src/app-tools.js): the real core, spawned with CODE_DESKTOP_AGENT_TOOLS_* pointing at a
// fake app channel (the unix-socket protocol of app/electron/agent-tools-host.cjs), starts the stdio server for each
// thread named by the thread id, its tools reach the model as mcp__code_desktop__<tool>, a call reaches the app
// channel for that thread, and Ask mode runs it without a card. A scripted local model answers; no network or key.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { appToolsServer, installAppTools, isAppTool, sessionToken } from '../packages/codex-app-server/src/app-tools.js'
import { preExecuteDecision, childDecision } from '../packages/codex-app-server/src/approval.js'

const root = path.resolve(import.meta.dirname, '..')
const SERVER_SCRIPT = path.resolve(root, '../app/electron/agent-tools-server.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The app's side of the channel: hello/welcome, list, call (agent-tools-host.cjs serve). */
async function fakeChannel(dir, token) {
  const seen = { hellos: [], lists: 0, calls: [] }
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
          // A thread's server carries that thread's own credential (app-tools.js sessionToken), never the channel's secret.
          if (message.type !== 'hello' || message.token !== sessionToken(token, message.session)) { socket.destroy(); return }
          hello = message
          seen.hellos.push(message)
          socket.write(JSON.stringify({ type: 'welcome' }) + '\n')
          continue
        }
        if (message.method === 'list') {
          seen.lists++
          socket.write(JSON.stringify({ id: message.id, result: { tools: [{ name: 'ping', description: 'Answers pong.', inputSchema: { type: 'object', properties: {} } }] } }) + '\n')
        } else if (message.method === 'call') {
          seen.calls.push({ session: hello.session, ...message.params })
          socket.write(JSON.stringify({ id: message.id, result: { content: [{ type: 'text', text: 'pong' }] } }) + '\n')
        }
      }
    })
    socket.on('error', () => {})
  })
  await new Promise((resolve) => server.listen(socketPath, resolve))
  return { seen, socketPath, close: () => server.close() }
}

/** A scripted Anthropic Messages server: the first request of a turn calls mcp__code_desktop__ping, then answers. */
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
    const answered = Array.isArray(last?.content) && last.content.some((block) => block.type === 'tool_result')
    const wantsTool = !answered && (body.tools ?? []).some((tool) => tool.name === 'mcp__code_desktop__ping') && JSON.stringify(last?.content ?? '').includes('CALL_PING')
    // SPAWN_CHILD: the root delegates "CHILD_TASK CALL_PING" to a sub-agent (the Harness subagent tool), which pings.
    const spawnTool = (body.tools ?? []).find((tool) => tool.name === 'subagent')
    const wantsChild = !answered && !wantsTool && spawnTool && JSON.stringify(last?.content ?? '').includes('SPAWN_CHILD')
    const id = `msg_${requests.length}`
    const usage = { input_tokens: 10, output_tokens: 5 }
    const block = wantsTool ? { type: 'tool_use', id: `toolu_${requests.length}`, name: 'mcp__code_desktop__ping', input: {} }
      : wantsChild ? { type: 'tool_use', id: `toolu_${requests.length}`, name: 'subagent', input: { description: 'ping the app', prompt: 'CHILD_TASK CALL_PING' } }
        : { type: 'text', text: answered ? 'got pong' : 'hello' }
    const events = [['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } }]]
    events.push(['content_block_start', { type: 'content_block_start', index: 0, content_block: block.type === 'tool_use' ? { ...block, input: {} } : { type: 'text', text: '' } }])
    events.push(['content_block_delta', { type: 'content_block_delta', index: 0, delta: block.type === 'tool_use' ? { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } : { type: 'text_delta', text: block.text } }])
    events.push(['content_block_stop', { type: 'content_block_stop', index: 0 }])
    events.push(['message_delta', { type: 'message_delta', delta: { stop_reason: block.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }])
    events.push(['message_stop', { type: 'message_stop' }])
    if (body.stream === false) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: [block], stop_reason: block.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null, usage }))
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

test('appToolsServer: parsed from the launch variables; absent or broken variables give nothing', () => {
  const env = { CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/bin/node', args: ['/x/server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 't' }
  assert.deepEqual(appToolsServer(env), { name: 'code_desktop', command: '/bin/node', args: ['/x/server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1', CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/s', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 't' } })
  assert.equal(appToolsServer({}), null)
  assert.equal(appToolsServer({ ...env, CODE_DESKTOP_AGENT_TOOLS_SERVER: '{not json' }), null)
  assert.equal(appToolsServer({ ...env, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ args: [] }) }), null)
  assert.equal(appToolsServer({ ...env, CODE_DESKTOP_AGENT_TOOLS_TOKEN: '' }), null)
  // Without a server or a session, nothing is installed (no plugin on the agent's scope).
  let plugged = 0
  installAppTools({ plugin: () => { plugged++ } }, null, { session: 't1' })
  installAppTools({ plugin: () => { plugged++ } }, appToolsServer(env), { session: '' })
  assert.equal(plugged, 0)
})

test('Ask mode: OpenClaude Desktop tools run without a card, for the thread and its sub-agents', async () => {
  assert.equal(isAppTool('mcp__code_desktop__preview_screenshot'), true)
  assert.equal(isAppTool('mcp__other__x'), false)
  const permission = { approvalPolicy: 'untrusted', mode: 'ask' }
  assert.equal(await preExecuteDecision({ permission, toolName: 'mcp__code_desktop__preview_click', args: {}, cwd: '/tmp' }), 'next')
  assert.equal(await preExecuteDecision({ permission, toolName: 'mcp__fixture__echo', args: {}, cwd: '/tmp' }), 'ask')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'mcp__code_desktop__preview_click' }), 'next')
  assert.equal(childDecision({ rootPolicy: 'untrusted', toolName: 'mcp__fixture__echo' }), 'ask-client')
})

test('DeepSeek core: each thread runs code_desktop named by its id; the model sees its tools and a call reaches the app for that thread', { timeout: 180000 }, async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-ds-')))
  const workspace = path.join(home, 'w')
  fs.mkdirSync(workspace)
  const token = 'secret-token'
  const channel = await fakeChannel(home, token)
  const model = await fakeModel()
  const stderr = []
  const child = spawn(process.execPath, [path.join(root, 'bin/codex-app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home,
    env: {
      PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
      XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
      DEEPSEEK_BASE_URL: model.url, DEEPSEEK_API_KEY: 'sk-fake-app-tools',
      CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: process.execPath, args: [SERVER_SCRIPT], env: {} }),
      CODE_DESKTOP_AGENT_TOOLS_SOCKET: channel.socketPath, CODE_DESKTOP_AGENT_TOOLS_TOKEN: token,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const notes = []
  const asked = []
  const client = new LineTransport(child.stdout, child.stdin, {
    onRequest: async (method, params) => { asked.push({ method, params }); return { decision: 'accept' } },
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
    const { thread } = await call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
    // The thread's server connects to the app named by the thread id, and lists the app's tools.
    await until(() => channel.seen.hellos.some((hello) => hello.session === thread.id) && channel.seen.lists > 0, 'the code_desktop hello and tool list')
    // A second thread gets its own server, named by its own id.
    const { thread: other } = await call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'read-only' })
    await until(() => channel.seen.hellos.some((hello) => hello.session === other.id), 'the second thread’s hello')
    await sleep(500)
    // A turn: the model is offered mcp__code_desktop__ping and calls it; Ask mode raises no card for it.
    const { turn } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'CALL_PING', text_elements: [] }] })
    await until(() => notes.some((note) => note.method === 'turn/completed' && note.params.turn.id === turn.id), 'turn/completed', 90000)
    assert.ok(model.requests.some((body) => (body.tools ?? []).some((tool) => tool.name === 'mcp__code_desktop__ping')), 'the model saw the app tool')
    assert.deepEqual(channel.seen.calls.map((entry) => [entry.session, entry.name]), [[thread.id, 'ping']])
    const item = notes.find((note) => note.method === 'item/completed' && note.params.item?.type === 'mcpToolCall')?.params.item
    assert.equal(item?.server, 'code_desktop')
    assert.equal(item?.tool, 'ping')
    // Ask mode (approvalPolicy untrusted) asked the client nothing for it.
    assert.deepEqual(asked.map((entry) => entry.method), [])
    // A sub-agent gets the tools too, named by the root thread (the session the user sees), and its call reaches the app.
    const { turn: delegated } = await call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'SPAWN_CHILD', text_elements: [] }] })
    await until(() => notes.some((note) => note.method === 'turn/completed' && note.params.turn.id === delegated.id), 'the delegating turn/completed', 120000)
    // The Harness runs the sub-agent in the background: wait for its ping.
    await until(() => channel.seen.calls.length >= 2, 'the sub-agent’s call', 120000).catch(() => {})
    const childRequest = model.requests.find((body) => JSON.stringify(body.messages[0]?.content ?? '').includes('CHILD_TASK'))
    assert.ok(childRequest, `the sub-agent ran: ${JSON.stringify(model.requests.map((body) => [body.messages.map((m) => JSON.stringify(m.content).slice(0, 120)), (body.tools ?? []).map((tool) => tool.name).join(',')]))}`)
    assert.ok((childRequest.tools ?? []).some((tool) => tool.name === 'mcp__code_desktop__ping'), 'the sub-agent saw the app tool on its first step')
    assert.deepEqual(channel.seen.calls.map((entry) => [entry.session, entry.name]), [[thread.id, 'ping'], [thread.id, 'ping']])
    // A fork is a thread of its own: its server is named by the fork's id.
    const { thread: fork } = await call('thread/fork', { threadId: thread.id })
    assert.notEqual(fork.id, thread.id)
    await until(() => channel.seen.hellos.some((hello) => hello.session === fork.id), 'the fork’s hello')
    // A thread reopened after unloading (openThread) starts its server again, named by the same id.
    const before = channel.seen.hellos.filter((hello) => hello.session === other.id).length
    await call('thread/unsubscribe', { threadId: other.id })
    await sleep(1500)
    await call('thread/resume', { threadId: other.id })
    await until(() => channel.seen.hellos.filter((hello) => hello.session === other.id).length > before, 'the reopened thread’s hello')
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
