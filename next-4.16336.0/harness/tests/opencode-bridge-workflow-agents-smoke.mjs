// Real-binary smoke of OpenClaude Desktop workflow agents on the OpenCode / MiMo bridge: the bridge runs as the workflow
// runner's core (clientInfo code-desktop-workflows, CODE_DESKTOP_WORKFLOW_RUNNER=1) and is driven the way
// app/third-party/codex-workflows-runner drives it (approvalPolicy "never"; every approval declined, every
// requestUserInput an error). The REAL agent binary (work/agents/opencode-bridge/<flavor>/bin) talks to a loopback
// scripted Anthropic-Messages model. Every home is a fresh temp folder.
//   - the `question` tool is not offered to a workflow agent;
//   - a secrets read (.env) and, in a read-only sandbox, a connector tool call are refused with a reason the agent reads:
//     the model gets a second request and the turn ends with its answer (not an empty result);
//   - when the runner's bridge stops, its agents' sessions are gone from the agent's own history.
//
// Usage: node tests/opencode-bridge-workflow-agents-smoke.mjs [opencode|mimo|both]   (exit 0 = all checks passed)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { spawn, spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const bridgeScript = path.join(root, 'packages/opencode-bridge/bin/app-server.mjs')
const which = process.argv[2] ?? 'both'
const flavors = which === 'both' ? ['opencode', 'mimo'] : [which]
const BINARIES = { opencode: path.join(repo, 'work/agents/opencode-bridge/opencode/bin/opencode'), mimo: path.join(repo, 'work/agents/opencode-bridge/mimo/bin/mimo') }
let failures = 0

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
const MCP_SERVER = `
const readline = require('node:readline')
const rl = readline.createInterface({ input: process.stdin })
const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n')
rl.on('line', (line) => {
  let message; try { message = JSON.parse(line) } catch { return }
  if (message.method === 'initialize') send({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'smoke-mcp', version: '1.0.0' } } })
  else if (message.method === 'tools/list') send({ jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'echo', description: 'Echo the text back', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] } })
  else if (message.method === 'tools/call') send({ jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: 'echo:' + (message.params?.arguments?.text ?? '') }] } })
  else if (message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: {} })
})
`

function createModel(flavor, workspace) {
  const requests = []
  const snake = flavor === 'mimo'
  const args = (camel) => (snake ? Object.fromEntries(Object.entries(camel).map(([key, value]) => [key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), value])) : camel)
  const reply = (body) => {
    const tools = (body.tools ?? []).map((tool) => tool.name)
    if (tools.length <= 1) return { text: 'Scripted title' }
    const user = body.messages.filter((message) => message.role === 'user')
    const first = textOf(user[0]?.content)
    const results = user.flatMap((message) => (Array.isArray(message.content) ? message.content.filter((block) => block.type === 'tool_result') : []))
    if (results.length) return { text: `AFTER_TOOL ${textOf(results.at(-1).content).slice(0, 200).replace(/\s+/g, ' ')}` }
    // MiMo: a background actor (the actor tool's default spawn) that calls one of OpenClaude Desktop's own tools.
    if (/SPAWN_TOOLS_CHILD/.test(first)) return { tool: { name: 'actor', input: { operation: { action: 'spawn', subagent_type: 'general', description: 'Tools child', prompt: 'TOOLS_CHILD call the echo tool' } } } }
    if (/TOOLS_CHILD/.test(first)) {
      const name = tools.find((tool) => tool === 'code_desktop_echo')
      if (name) return { tool: { name, input: { text: 'from-child' } } }
    }
    if (/READ_SECRET/.test(first)) return { tool: { name: 'read', input: args({ filePath: path.join(workspace, '.env') }) } }
    if (/CALL_MCP/.test(first)) {
      const name = tools.find((tool) => /_echo$/.test(tool))
      if (name) return { tool: { name, input: { text: 'from-model' } } }
    }
    return { text: 'plain reply' }
  }
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"not_found_error","message":"nope"}}'); return }
    const body = JSON.parse(raw)
    requests.push(body)
    const answer = reply(body)
    const id = `msg_${requests.length}`
    const events = [['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 1 } } }]]
    if (answer.tool) events.push(['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: `toolu_${requests.length}`, name: answer.tool.name, input: {} } }], ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(answer.tool.input) } }])
    else events.push(['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }], ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: answer.text } }])
    events.push(['content_block_stop', { type: 'content_block_stop', index: 0 }], ['message_delta', { type: 'message_delta', delta: { stop_reason: answer.tool ? 'tool_use' : 'end_turn' }, usage: { output_tokens: 5 } }], ['message_stop', { type: 'message_stop' }])
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  return { server, requests }
}

/** A JSON-RPC client that answers server requests the way the workflow runner does (appServerClient.js defaultServerResponse). */
function runnerClient(env, { decision = 'decline' } = {}) {
  const child = spawn(process.execPath, [bridgeScript, 'app-server', '--stdio'], { env, stdio: ['pipe', 'pipe', 'pipe'] })
  const stderr = []
  child.stderr.on('data', (chunk) => { stderr.push(String(chunk)); if (stderr.length > 200) stderr.splice(0, 100) })
  const pending = new Map()
  const notes = []
  const serverRequests = []
  let waiters = []
  let next = 1
  const send = (message) => child.stdin.write(JSON.stringify(message) + '\n')
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    let message
    try { message = JSON.parse(line) } catch { return }
    if (message.id !== undefined && message.method) {
      serverRequests.push(message)
      if (message.method === 'item/commandExecution/requestApproval' || message.method === 'item/fileChange/requestApproval') send({ id: message.id, result: { decision } })
      else send({ id: message.id, error: { code: -32603, message: 'This workflow runtime does not support interactive server requests.' } })
      return
    }
    if (message.id !== undefined) {
      const entry = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) entry?.reject(Object.assign(new Error(message.error.message), { code: message.error.code }))
      else entry?.resolve(message.result)
      return
    }
    notes.push(message)
    for (const waiter of waiters) waiter(message)
  })
  const request = (method, params, timeout = 120000) => new Promise((resolve, reject) => {
    const id = next++
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout ${method}\n${stderr.join('').slice(-1500)}`)) }, timeout)
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value) }, reject: (error) => { clearTimeout(timer); reject(error) } })
    send({ id, method, params })
  })
  const waitFor = (predicate, ms = 120000, label = 'notification') => {
    const seen = notes.find(predicate)
    if (seen) return Promise.resolve(seen)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters = waiters.filter((candidate) => candidate !== waiter); reject(new Error(`timeout waiting for ${label}\n${stderr.join('').slice(-1500)}`)) }, ms)
      const waiter = (message) => { if (!predicate(message)) return; clearTimeout(timer); waiters = waiters.filter((candidate) => candidate !== waiter); resolve(message) }
      waiters.push(waiter)
    })
  }
  const exited = new Promise((resolve) => child.once('exit', resolve))
  return { child, request, waitFor, notes, serverRequests, stderr, exited }
}

async function runFlavor(flavor) {
  const binary = BINARIES[flavor]
  if (!fs.existsSync(binary)) throw new Error(`missing ${binary}`)
  const P = flavor === 'mimo' ? 'MIMOCODE' : 'OPENCODE'
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `cd-${flavor}-wfa-`)))
  const workspace = path.join(home, 'workspace')
  fs.mkdirSync(workspace, { recursive: true })
  fs.writeFileSync(path.join(workspace, '.env'), 'SECRET=hunter2\n')
  spawnSync('git', ['init', '-q'], { cwd: workspace })
  const model = createModel(flavor, workspace)
  await new Promise((resolve) => model.server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${model.server.address().port}`
  const providersFile = path.join(home, 'providers.json')
  fs.writeFileSync(providersFile, JSON.stringify({ providers: [{ route: 'fake', displayName: 'Fake Lab', api: 'anthropic-messages', baseURL: base, models: ['fake-model'], modelInfo: { 'fake-model': { name: 'Fake Model', reasoning: false, attachment: false, limit: { context: 200000, output: 8000 } } } }] }))
  const mcpScript = path.join(home, 'mcp-echo.cjs')
  fs.writeFileSync(mcpScript, MCP_SERVER)
  const configDir = path.join(home, '.config', flavor === 'mimo' ? 'mimocode' : 'opencode')
  fs.mkdirSync(configDir, { recursive: true })
  fs.writeFileSync(path.join(configDir, flavor === 'mimo' ? 'mimocode.json' : 'opencode.json'), JSON.stringify({ mcp: { smoke: { type: 'local', command: [process.execPath, mcpScript], enabled: true } } }))
  const env = {
    PATH: process.env.PATH, SHELL: '/bin/sh', TMPDIR: os.tmpdir(),
    HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
    CODE_DESKTOP_AGENT_BINARY: binary, CODE_DESKTOP_AGENT_RUNNER: '', CODE_DESKTOP_AGENT_VERSION: '', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_OPENCODE_FLAVOR: flavor,
    CODE_DESKTOP_PROVIDERS_FILE: providersFile, CODE_DESKTOP_PROVIDER_KEY_FAKE: 'sk-fake-smoke', CODE_DESKTOP_WORKFLOW_RUNNER: '1',
    CODE_DESKTOP_OPENCODE_CONFIG_EXTRA: JSON.stringify({ model: 'fake/fake-model', small_model: 'fake/fake-model' }),
    [`${P}_DISABLE_MODELS_FETCH`]: '1', [`${P}_DISABLE_LSP_DOWNLOAD`]: '1', [`${P}_DISABLE_SHARE`]: '1',
    ...(flavor === 'mimo' ? { CI: '1' } : {}),
  }
  const client = runnerClient(env)
  const check = async (name, fn) => {
    try { await fn(); console.log(`PASS [${flavor}] ${name}`) } catch (error) {
      failures++
      console.log(`FAIL [${flavor}] ${name}\n  ${error?.stack?.split('\n').slice(0, 6).join('\n  ') || error}\n${client.stderr.join('').slice(-800)}`)
    }
  }
  const threadIds = []
  const turn = async (sandbox, text) => {
    const { thread } = await client.request('thread/start', { cwd: workspace, model: 'fake/fake-model', approvalPolicy: 'never', sandbox })
    threadIds.push(thread.id)
    const from = client.notes.length
    const before = model.requests.length
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text, text_elements: [] }] })
    const done = await client.waitFor((note) => client.notes.indexOf(note) >= from && note.method === 'turn/completed' && note.params?.threadId === thread.id, 180000, `turn/completed ${text}`)
    const messages = client.notes.slice(from).filter((note) => note.method === 'item/completed' && note.params?.threadId === thread.id && note.params?.item?.type === 'agentMessage').map((note) => note.params.item.text)
    return { thread, done, messages, requests: model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1) }
  }
  try {
    await client.request('initialize', { clientInfo: { name: 'code-desktop-workflows', title: 'OpenClaude Desktop', version: '0' }, capabilities: { experimentalApi: true } }, 180000)
    await check('a workflow agent is not offered the question tool', async () => {
      const { requests, messages } = await turn('workspace-write', 'PLAIN_REPLY hi')
      assert.ok(requests.length >= 1)
      assert.equal(requests[0].tools.some((tool) => tool.name === 'question'), false, `tools: ${requests[0].tools.map((tool) => tool.name).join(',')}`)
      assert.ok(messages.some((text) => /plain reply/.test(text)))
    })
    await check('a .env read is refused with a reason; the agent continues and answers', async () => {
      const result = await turn('workspace-write', 'READ_SECRET open the env file')
      assert.equal(client.serverRequests.length, 0, 'no approval card reached the runner')
      assert.ok(result.requests.length >= 2, `the model got the refusal (${result.requests.length} requests)`)
      const answer = result.messages.join('\n')
      assert.match(answer, /AFTER_TOOL/)
      assert.doesNotMatch(answer, /hunter2/)
    })
    await check('read-only sandbox: a connector tool call is refused with a reason; the agent continues and answers', async () => {
      const result = await turn('read-only', 'CALL_MCP echo something')
      assert.ok(result.requests[0].tools.some((tool) => /_echo$/.test(tool.name)), 'the connector tool is offered')
      assert.equal(client.serverRequests.length, 0, 'no approval card reached the runner')
      assert.ok(result.requests.length >= 2, `the model got the refusal (${result.requests.length} requests)`)
      assert.match(result.messages.join('\n'), /AFTER_TOOL/)
    })
    await check('when the runner\'s bridge stops, its agents\' sessions leave the agent\'s history', async () => {
      const dbs = []
      const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (/\.db$/.test(entry.name)) dbs.push(file) } }
      walk(path.join(home, '.local/share'))
      assert.ok(dbs.length, 'the agent keeps a database')
      const count = () => dbs.reduce((sum, db) => sum + (Number(spawnSync('sqlite3', [db, "select count(*) from session where title = 'Workflow agent'"], { encoding: 'utf8' }).stdout.trim()) || 0), 0)
      assert.ok(count() >= threadIds.length, `sessions before: ${count()}`)
      // The runner's shutdown (appServerClient.js): stdin closed, SIGTERM, SIGKILL after a second.
      client.child.stdin.end()
      client.child.kill('SIGTERM')
      const stopped = Date.now()
      const killer = setTimeout(() => client.child.kill('SIGKILL'), Number(process.env.SMOKE_KILL_MS ?? 1000))
      await client.exited
      clearTimeout(killer)
      if (process.env.SMOKE_KILL_MS) console.log(`[${flavor}] the runner's bridge stopped in ${Date.now() - stopped} ms`)
      assert.equal(count(), 0, 'no Workflow agent session is left')
    })
    if (flavor === 'mimo') {
      // The app's own bridge, Ask permissions, OpenClaude Desktop's tools server attached (here: the echo server named code_desktop).
      const appEnv = { ...env, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: process.execPath, args: [mcpScript], env: {} }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: path.join(home, 'tools.sock'), CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'smoke-token' }
      delete appEnv.CODE_DESKTOP_WORKFLOW_RUNNER
      const app = runnerClient(appEnv, { decision: 'accept' })
      try {
        await check('Ask permissions: a background actor can call OpenClaude Desktop\'s own tools (no rules dump)', async () => {
          await app.request('initialize', { clientInfo: { name: 'code-desktop', title: 'OpenClaude Desktop', version: '0' }, capabilities: { experimentalApi: true } }, 180000)
          const { thread } = await app.request('thread/start', { cwd: workspace, model: 'fake/fake-model', approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false }, codeDesktop: { permissionMode: 'ask' } })
          await app.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'SPAWN_TOOLS_CHILD please', text_elements: [] }] })
          const deadline = Date.now() + 120000
          let childResult = null
          while (!childResult && Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            for (const body of model.requests) {
              const user = body.messages.filter((message) => message.role === 'user')
              if (!/TOOLS_CHILD/.test(textOf(user[0]?.content)) || /SPAWN_TOOLS_CHILD/.test(textOf(user[0]?.content))) continue
              const result = user.flatMap((message) => (Array.isArray(message.content) ? message.content.filter((block) => block.type === 'tool_result') : [])).at(-1)
              if (result) childResult = textOf(result.content)
            }
          }
          assert.ok(childResult !== null, 'the background actor called the tool')
          assert.match(childResult, /echo:from-child/, `the tool ran: ${childResult.slice(0, 300)}`)
          assert.doesNotMatch(childResult, /specified a rule/)
        })
      } finally {
        app.child.stdin.end(); app.child.kill('SIGTERM')
        const killer = setTimeout(() => app.child.kill('SIGKILL'), 3000)
        await app.exited
        clearTimeout(killer)
      }
    }
  } finally {
    if (client.child.exitCode === null && client.child.signalCode === null) { client.child.kill('SIGKILL'); await client.exited }
    model.server.close()
    if (!process.env.KEEP_SMOKE_HOME) fs.rmSync(home, { recursive: true, force: true })
  }
}

for (const flavor of flavors) {
  try { await runFlavor(flavor) } catch (error) { failures++; console.log(`FAIL [${flavor}] ${error?.stack || error}`) }
}
console.log(failures ? `${failures} check(s) failed` : 'all checks passed')
process.exit(failures ? 1 : 0)
