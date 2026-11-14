// Parity smoke of the OpenCode / MiMo Code core: the app's real client (app/electron/codex.cjs
// CodexClient) drives harness/packages/opencode-bridge, which runs the REAL agent binary
// (work/agents/opencode-bridge/<flavor>/bin) against a local scripted Anthropic-Messages
// model server configured as a Settings › Models custom provider. Every home is a temp folder.
//
// Usage: node tests/opencode-bridge-smoke.mjs [opencode|mimo|both] [--from-packs] [--opencode <1.x binary>]
//   (exit 0 = all checks passed)
//   --from-packs imports work/agents/opencode-bridge/packs/<id>.zip with the app's extension-packs.cjs and runs the
//   bridge from the installed pack folder (run work/agents/opencode-bridge/make-pack.mjs first).
//   --opencode (or CODE_DESKTOP_OPENCODE_V1_BINARY): this is the bridge's 1.x path (CODE_DESKTOP_OPENCODE_API=v1), so it
//   needs an OpenCode 1.x binary (1.18.34). The default work/agents/opencode-bridge/opencode/bin/opencode now holds the
//   pinned 2.x release, which tests/opencode-bridge-v2-smoke.mjs drives; a 2.x binary here is refused up front.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const stderr = []
const childProcess = require('node:child_process')
const spawn = childProcess.spawn
childProcess.spawn = (...args) => {
  const child = spawn(...args)
  child.stderr?.on('data', (chunk) => { stderr.push(String(chunk)); if (stderr.length > 400) stderr.splice(0, 200) })
  return child
}
const { CodexClient } = require('../../app/electron/codex.cjs')
const bridgeScript = path.join(root, 'packages/opencode-bridge/bin/app-server.mjs')
const fromPacks = process.argv.includes('--from-packs')
const optionAt = process.argv.indexOf('--opencode')
const v1Binary = (optionAt > 0 ? process.argv[optionAt + 1] : '') || process.env.CODE_DESKTOP_OPENCODE_V1_BINARY || ''
const which = process.argv.slice(2).find((arg, index, args) => !arg.startsWith('--') && args[index - 1] !== '--opencode') ?? 'both'
const flavors = which === 'both' ? ['opencode', 'mimo'] : [which]
const BINARIES = { opencode: v1Binary ? path.resolve(v1Binary) : path.join(repo, 'work/agents/opencode-bridge/opencode/bin/opencode'), mimo: path.join(repo, 'work/agents/opencode-bridge/mimo/bin/mimo') }

let total = 0
let failures = 0

// ------------------------------------------------------------------ scripted model

const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
const systemOf = (body) => textOf(Array.isArray(body.system) ? body.system : body.system ?? '')
const toolNames = (body) => (body.tools ?? []).map((tool) => tool.name)
// The user's own prompts (not tool results, not OpenCode's system reminders).
const userTexts = (body) => body.messages.filter((message) => message.role === 'user').map((message) => (typeof message.content === 'string' ? message.content : message.content.filter((block) => block.type === 'text' && !/^<system-reminder>/.test(block.text ?? '')).map((block) => block.text).join('\n'))).filter((text) => text.trim())
const results = (body) => body.messages.filter((message) => message.role === 'user' && Array.isArray(message.content)).flatMap((message) => message.content.filter((block) => block.type === 'tool_result'))
const resultsSinceLastPrompt = (body) => {
  let count = 0
  for (const message of [...body.messages].reverse()) {
    if (message.role !== 'user') continue
    const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }]
    const tools = blocks.filter((block) => block.type === 'tool_result').length
    if (tools === 0 && blocks.some((block) => block.type === 'text' && block.text && !/^<system-reminder>/.test(block.text))) break
    count += tools
  }
  return count
}

function createModel(flavor, workspace, home) {
  const requests = []
  const snake = flavor === 'mimo'
  const args = (camel) => (snake ? Object.fromEntries(Object.entries(camel).map(([key, value]) => [key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`), value])) : camel)
  let hangers = []
  let mode = { error: null }
  function reply(body) {
    const tools = toolNames(body)
    const texts = userTexts(body)
    const last = texts.at(-1) ?? ''
    const first = texts[0] ?? ''
    const done = resultsSinceLastPrompt(body)
    const system = systemOf(body)
    // MiMo's own side question (POST /session/:id/ask): the session's prompt and tools, the question in a reminder.
    if (/This is a SIDE QUESTION about the session/.test(JSON.stringify(body.messages.at(-1) ?? ''))) return { text: 'SIDE_ANSWER about the conversation' }
    // Title / summary helpers (no tools or StructuredOutput only).
    if (!tools.length || (tools.length === 1 && tools[0] === 'StructuredOutput' && !/STRUCTURED/.test(first))) {
      if (tools[0] === 'StructuredOutput') return { tool: { name: 'StructuredOutput', input: { title: 'Scripted title' } } }
      if (/side question/i.test(system)) return { text: 'SIDE_ANSWER about the conversation' }
      if (/summar/i.test(system + last)) return { text: 'Summary of the conversation so far.' }
      return { text: 'Scripted title' }
    }
    if (mode.error) { const status = mode.error; mode.error = null; return { status } }
    const marker = /\b([A-Z][A-Z_]{3,})\b/.exec(last)?.[1] ?? /\b([A-Z][A-Z_]{3,})\b/.exec(first)?.[1]
    // Consecutive prompts (one interrupted before any reply) arrive merged: the newest is last.
    const lastUser = [...body.messages].reverse().find((message) => message.role === 'user' && (typeof message.content === 'string' || message.content.some((block) => block.type === 'text' && block.text?.trim() && !/^<system-reminder>/.test(block.text))))
    const newest = typeof lastUser?.content === 'string' ? lastUser.content : (lastUser?.content ?? []).filter((block) => block.type === 'text' && block.text?.trim() && !/^<system-reminder>/.test(block.text)).at(-1)?.text ?? last
    const at = (name) => newest.includes(name)
    if (last.includes('SUBAGENT_CHILD')) return { text: 'child finished' }
    if (at('HANG_FOREVER')) return { hang: true }
    if (at('SLOW_REPLY') && done === 0 && !last.includes('STEERED')) return { delay: 2500, text: 'slow done' }
    if (at('RUN_BASH') && done === 0) return { tool: { name: 'bash', input: { command: 'echo bash-output-1; echo bash-output-2', description: 'Print two lines' } } }
    if (at('LIST_REFERENCE') && done === 0) return { tool: { name: 'bash', input: { command: `ls '${path.join(home, 'team-docs')}'`, description: 'List the team docs' } } }
    if (at('TWO_BASH') && done < 2) return { tool: { name: 'bash', input: { command: `printf 'step-${done + 1}\\n'`, description: `Step ${done + 1}` } } }
    if (at('ESCAPE_SANDBOX') && done === 0) return { tool: { name: 'bash', input: { command: `echo escaped > '${path.join(home, 'outside.txt')}'; echo inside > '${path.join(workspace, 'inside.txt')}'; echo exit-$?`, description: 'Write inside and outside' } } }
    if (at('EDIT_FILE')) {
      if (done === 0) return { tool: { name: 'read', input: args({ filePath: path.join(workspace, 'hello.txt') }) } }
      if (done === 1) return { tool: { name: 'edit', input: args({ filePath: path.join(workspace, 'hello.txt'), oldString: 'before', newString: 'after' }) } }
    }
    if (at('TWO_WRITES') && done === 0) return { tools: ['one.txt', 'two.txt'].map((name) => ({ name: 'write', input: args({ filePath: path.join(workspace, name), content: `${name}\n` }) })) }
    if (at('WRITE_FILE') && done === 0) return { tool: { name: 'write', input: args({ filePath: path.join(workspace, 'written.txt'), content: 'written by the agent\n' }) } }
    if (at('ASK_QUESTION') && done === 0) return { tool: { name: 'question', input: { questions: [{ question: 'Which color?', header: 'Color', options: [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: 'cool' }] }] } } }
    if (at('MAKE_TODOS') && done === 0) {
      if (snake) return { tool: { name: 'task', input: { operation: { action: 'create', summary: 'Scripted step one' } } } }
      return { tool: { name: 'todowrite', input: { todos: [{ content: 'Scripted step one', status: 'in_progress', priority: 'high' }, { content: 'Scripted step two', status: 'pending', priority: 'low' }] } } }
    }
    if (at('SPAWN_AGENT') && done === 0) {
      if (snake) return { tool: { name: 'actor', input: { operation: { action: 'run', subagent_type: 'general', description: 'Scripted child', prompt: 'SUBAGENT_CHILD do the work' } } } }
      return { tool: { name: 'task', input: { description: 'Scripted child', prompt: 'SUBAGENT_CHILD do the work', subagent_type: 'general' } } }
    }
    if (/plan .*has been approved|approved.*plan|start implementing/i.test(last) && !mode.planned && (mode.planned = true)) return { tool: { name: 'write', input: args({ filePath: path.join(workspace, 'planned.txt'), content: 'implemented\n' }) } }
    if (at('PLAN_NOW')) {
      if (tools.includes('plan_exit') && done === 0) return { tool: { name: 'plan_exit', input: {} } }
      if (done === 1 && tools.includes('edit') && !tools.includes('plan_exit')) return { tool: { name: 'write', input: args({ filePath: path.join(workspace, 'planned.txt'), content: 'implemented\n' }) } }
    }
    if (at('CALL_MCP') && done === 0) {
      const name = tools.find((tool) => /_echo$/.test(tool))
      if (name) return { tool: { name, input: { text: 'from-model' } } }
    }
    if (at('STRUCTURED') && tools.includes('StructuredOutput') && done === 0) return { tool: { name: 'StructuredOutput', input: { answer: 'forty-two', count: 42 } } }
    if (at('THINK_FIRST')) return { think: 'Let me think about this.', text: 'thought reply' }
    if (at('FAIL_TURN')) { mode.error = null; return { status: 400 } }
    return { text: `plain reply ${marker ?? ''} ${done}`.trim() }
  }
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"not_found_error","message":"nope"}}'); return }
    const body = JSON.parse(raw)
    requests.push(body)
    const answer = reply(body)
    if (answer.status) {
      res.writeHead(answer.status, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ type: 'error', error: { type: answer.status === 400 ? 'invalid_request_error' : 'api_error', message: `scripted failure ${answer.status}` } }))
      return
    }
    if (answer.hang) {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write(`event: ping\ndata: {"type":"ping"}\n\n`)
      hangers.push(res)
      req.on('close', () => res.end())
      return
    }
    if (answer.delay) await new Promise((resolve) => setTimeout(resolve, answer.delay))
    const id = `msg_${requests.length}`
    const events = [['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, usage: { input_tokens: 120, output_tokens: 1, cache_read_input_tokens: 30 } } }]]
    let index = 0
    if (answer.think) {
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '' } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: answer.think } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'sig' } }], ['content_block_stop', { type: 'content_block_stop', index }])
      index++
    }
    if (answer.tools) {
      // Several tool calls in one step (the agent runs them in parallel).
      answer.tools.forEach((tool, n) => {
        if (n) { events.push(['content_block_stop', { type: 'content_block_stop', index }]); index++ }
        events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'tool_use', id: `toolu_${requests.length}_${n}`, name: tool.name, input: {} } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(tool.input) } }])
      })
    } else if (answer.tool) events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'tool_use', id: `toolu_${requests.length}`, name: answer.tool.name, input: {} } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(answer.tool.input) } }])
    else {
      const text = answer.text ?? ''
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: text.slice(0, 6) } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: text.slice(6) } }])
    }
    events.push(['content_block_stop', { type: 'content_block_stop', index }], ['message_delta', { type: 'message_delta', delta: { stop_reason: answer.tool || answer.tools ? 'tool_use' : 'end_turn' }, usage: { output_tokens: 9 } }], ['message_stop', { type: 'message_stop' }])
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  return { server, requests, mode, releaseHangers: () => { for (const res of hangers.splice(0)) try { res.end() } catch {} } }
}

// A tiny stdio MCP server with one `echo` tool.
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

// A remote MCP server behind OAuth (protected resource + authorization server metadata, dynamic
// client registration, PKCE code flow) with one `whoami` tool once the bearer token is valid.
function createOAuthMcp() {
  const state = { registered: 0, tokens: 0, token: null, codes: new Map() }
  const server = http.createServer(async (req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`
    const url = new URL(req.url, base)
    let raw = ''
    for await (const chunk of req) raw += chunk
    const json = (status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(body)) }
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) return json(200, { resource: `${base}/mcp`, authorization_servers: [base], bearer_methods_supported: ['header'] })
    if (url.pathname === '/.well-known/oauth-authorization-server' || url.pathname === '/.well-known/openid-configuration') {
      return json(200, { issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, registration_endpoint: `${base}/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none', 'client_secret_post'] })
    }
    if (url.pathname === '/register' && req.method === 'POST') { state.registered++; const body = JSON.parse(raw || '{}'); return json(201, { ...body, client_id: 'smoke-client', client_id_issued_at: Math.floor(Date.now() / 1000) }) }
    if (url.pathname === '/authorize') {
      const code = `code-${state.codes.size + 1}`
      state.codes.set(code, url.searchParams.get('code_challenge'))
      const back = new URL(url.searchParams.get('redirect_uri'))
      back.searchParams.set('code', code)
      if (url.searchParams.get('state')) back.searchParams.set('state', url.searchParams.get('state'))
      res.writeHead(302, { location: back.href }); res.end(); return
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      const form = new URLSearchParams(raw)
      if (form.get('grant_type') !== 'authorization_code' || !state.codes.has(form.get('code')) || !form.get('code_verifier')) return json(400, { error: 'invalid_grant' })
      state.tokens++
      state.token = `token-${state.tokens}`
      return json(200, { access_token: state.token, token_type: 'Bearer', expires_in: 3600, refresh_token: 'refresh-1' })
    }
    if (url.pathname === '/mcp') {
      if (!state.token || req.headers.authorization !== `Bearer ${state.token}`) {
        res.writeHead(401, { 'www-authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`, 'content-type': 'application/json' }); res.end('{"error":"unauthorized"}'); return
      }
      if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
      const message = JSON.parse(raw || '{}')
      if (message.id === undefined) { res.writeHead(202); res.end(); return }
      if (message.method === 'initialize') return json(200, { jsonrpc: '2.0', id: message.id, result: { protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'oauth-smoke', version: '1.0.0' } } })
      if (message.method === 'tools/list') return json(200, { jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'whoami', description: 'Who is signed in', inputSchema: { type: 'object', properties: {} } }] } })
      return json(200, { jsonrpc: '2.0', id: message.id, result: {} })
    }
    res.writeHead(404); res.end()
  })
  return { server, state }
}
const portFree = (port) => new Promise((resolve) => { const probe = http.createServer(); probe.once('error', () => resolve(false)); probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true))) })

// ------------------------------------------------------------------ one flavor

async function runFlavor(flavor) {
  const binary = BINARIES[flavor]
  if (!fs.existsSync(binary)) throw new Error(`missing ${binary}`)
  if (flavor === 'opencode') {
    const version = String(spawnSync(binary, ['--version'], { encoding: 'utf8' }).stdout ?? '').trim()
    if (!/^1\./.test(version)) throw new Error(`${binary} reports ${JSON.stringify(version)}: the 1.x smoke needs an OpenCode 1.x binary (--opencode <path>); 2.x is tests/opencode-bridge-v2-smoke.mjs`)
  }
  const P = flavor === 'mimo' ? 'MIMOCODE' : 'OPENCODE'
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `cd-${flavor}-smoke-`)))
  const workspace = path.join(home, 'workspace')
  fs.mkdirSync(workspace, { recursive: true })
  fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
  spawnSync('git', ['init', '-q'], { cwd: workspace })
  // --from-packs: import the assembled Extension Pack zip with the app's own importer
  // (extension-packs.cjs inspect + install into <home>/userData/extensions/<id>) and run the bridge from there.
  let script = bridgeScript
  if (fromPacks) {
    const { createExtensionPacks } = require('../../app/electron/extension-packs.cjs')
    const packs = createExtensionPacks({ dataDir: () => path.join(home, 'userData') })
    const summary = await packs.inspect(path.join(repo, `work/agents/opencode-bridge/packs/${flavor}.zip`))
    assert.equal(summary.id, flavor)
    await packs.install(summary.token)
    script = path.join(home, 'userData/extensions', flavor, 'bridge/bin/app-server.mjs')
    assert.ok(fs.existsSync(script), script)
    console.log(`[${flavor}] running the bridge from the imported pack: ${script}`)
  }
  const model = createModel(flavor, workspace, home)
  await new Promise((resolve) => model.server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${model.server.address().port}`
  const providersFile = path.join(home, 'providers.json')
  fs.writeFileSync(providersFile, JSON.stringify({ providers: [{ route: 'fake', displayName: 'Fake Lab', api: 'anthropic-messages', baseURL: base, models: ['fake-model', 'fake-plan'], modelInfo: { 'fake-model': { name: 'Fake Model', reasoning: true, attachment: true, limit: { context: 200000, output: 8000 } }, 'fake-plan': { name: 'Fake Plan Model', reasoning: true, attachment: true, limit: { context: 200000, output: 8000 } } } }] }))
  const mcpScript = path.join(home, 'mcp-echo.cjs')
  fs.writeFileSync(mcpScript, MCP_SERVER)
  // OpenCode `references` in the user's own config: a named local folder outside the workspace.
  fs.mkdirSync(path.join(home, 'team-docs'), { recursive: true })
  fs.writeFileSync(path.join(home, 'team-docs', 'guide.md'), '# Guide\n')
  if (flavor === 'opencode') {
    fs.mkdirSync(path.join(home, '.config', 'opencode'), { recursive: true })
    fs.writeFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), JSON.stringify({ references: { docs: { path: path.join(home, 'team-docs'), description: 'Team docs' } } }))
  }
  const env = {
    HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
    CODE_DESKTOP_AGENT_BINARY: binary, CODE_DESKTOP_AGENT_RUNNER: '', CODE_DESKTOP_AGENT_VERSION: '', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
    // The bridge's 1.x path, whatever --version detection would pick (MiMo is always 1.x).
    ...(flavor === 'opencode' ? { CODE_DESKTOP_OPENCODE_API: 'v1' } : {}),
    CODE_DESKTOP_PROVIDERS_FILE: providersFile, CODE_DESKTOP_PROVIDER_KEY_FAKE: 'sk-fake-smoke',
    // agent.plan.model: OpenCode's plan agent runs its own model (the bridge must not override it with the thread's).
    CODE_DESKTOP_OPENCODE_CONFIG_EXTRA: JSON.stringify({ model: 'fake/fake-model', small_model: 'fake/fake-model', agent: { plan: { model: 'fake/fake-plan' } } }),
    [`${P}_DISABLE_MODELS_FETCH`]: '1', [`${P}_DISABLE_LSP_DOWNLOAD`]: '1', [`${P}_DISABLE_SHARE`]: '1',
    // MiMo's Xiaomi sign-in opens a browser tab itself (plugin/mimo.ts openBrowser) unless CI is set: never on the desktop here.
    ...(flavor === 'mimo' ? { CI: '1' } : {}),
    // MiMo's `workflow` tool flag (MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL) is the bridge's own (serverEnv): not set here.
  }
  const checks = []
  const check = async (name, fn) => {
    total++
    try { await fn(); checks.push(name); console.log(`PASS [${flavor}] ${name}`) } catch (error) {
      failures++
      console.log(`FAIL [${flavor}] ${name}\n  ${error?.stack?.split('\n').slice(0, 4).join('\n  ') || error}`)
      if (process.env.SMOKE_DEBUG) console.log(JSON.stringify(model.requests.slice(-3).map((body) => ({ tools: toolNames(body).length, last: userTexts(body).at(-1)?.slice(0, 80), n: body.messages.length }))))
      if (process.env.SMOKE_DEBUG) console.log(events.slice(-Number(process.env.SMOKE_DEBUG)).map((event) => `  ${event.kind === 'request' ? 'REQ ' : ''}${event.method} ${event.params?.threadId?.slice(-6) ?? ''} ${event.params?.turn?.id?.slice(-8) ?? event.params?.turnId?.slice(-8) ?? ''} ${event.params?.turn?.status ?? event.params?.status?.type ?? event.params?.item?.type ?? ''}`).join('\n'))
    }
  }
  let client
  const events = []
  let waiters = []
  const responders = []
  const connect = async () => {
    client = new CodexClient({ binary: script, env, initializeTimeout: 120000 })
    client.on('event', (event) => {
      events.push(event)
      if (event.kind === 'request') {
        const responder = responders.find((candidate) => candidate.match(event))
        if (responder) setTimeout(() => { try { client.respond(event.id, responder.answer(event), event.bridgeApproval) } catch (error) { console.log('respond failed', error.message) } }, responder.delay ?? 0)
      }
      for (const waiter of waiters) waiter(event)
    })
    return client.start()
  }
  const waitFor = (predicate, ms = 90000, label = 'event') => {
    const seen = events.find(predicate)
    if (seen) return Promise.resolve(seen)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters = waiters.filter((candidate) => candidate !== waiter); reject(new Error(`timeout waiting for ${label}\n${stderr.join('').slice(-1500)}`)) }, ms)
      const waiter = (event) => {
        if (!predicate(event)) return
        clearTimeout(timer)
        waiters = waiters.filter((candidate) => candidate !== waiter)
        resolve(event)
      }
      waiters.push(waiter)
    })
  }
  const since = (from, predicate) => events.slice(from).filter(predicate)
  const note = (method, threadId) => (event) => event.method === method && (!threadId || event.params?.threadId === threadId)
  const turnDone = (threadId, from, ms) => waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/completed' && event.params?.threadId === threadId, ms, `turn/completed ${threadId}`)
  const request = (method, params, timeout) => client.request(method, params, timeout)
  const runTurn = async (threadId, text, extra = {}) => {
    const from = events.length
    const started = await request('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    const completed = await turnDone(threadId, from)
    return { from, started, completed, notes: events.slice(from) }
  }
  const lastMain = () => model.requests.filter((body) => (body.tools ?? []).length > 1).at(-1)
  const permissionParams = (mode, extra = {}) => {
    const approvalPolicy = mode === 'bypass' ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request'
    const sandbox = mode === 'plan' ? { type: 'readOnly', networkAccess: false } : mode === 'bypass' ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
    return { approvalPolicy, sandboxPolicy: sandbox, codeDesktop: { permissionMode: mode, afterPlan: 'auto', ...extra } }
  }

  try {
    // ---------------------------------------------------------------- lifecycle
    let init
    await check('initialize reports the engine, version and capabilities', async () => {
      init = await connect()
      assert.equal(init.engine, flavor)
      assert.match(init.engineVersion, /^\d+\.\d+\.\d+/)
      for (const key of ['customization', 'permissionHints', 'systemPromptPreview', 'livePermissions', 'toolSelection', 'codeStats', 'structuredOutput', 'deleteHistory', 'perTokenBilling', 'mcpConfigWrite', 'skillToggle', 'pluginManage']) assert.equal(init.capabilities[key], true, key)
      assert.ok(init.capabilities.unsupportedMethods.includes('thread/rollback'))
      assert.ok(init.configPath.endsWith(flavor === 'mimo' ? 'mimocode.json' : 'opencode.json'))
    })
    let modelId
    await check('model/list serves the custom provider model as default with efforts and context window', async () => {
      const models = await request('model/list', { limit: 100 })
      const fake = models.data.find((entry) => entry.id === 'fake/fake-model')
      assert.ok(fake, JSON.stringify(models.data.map((entry) => entry.id)))
      assert.equal(fake.isDefault, true)
      assert.equal(fake.displayName, 'Fake Model')
      assert.ok(fake.supportedReasoningEfforts.length >= 1)
      assert.equal(fake.contextWindow, 200000)
      assert.ok(fake.inputModalities.includes('image'))
      modelId = fake.id
    })
    await check('account/read reports a usable provider account; rate limits are per-token (empty)', async () => {
      const account = await request('account/read', { refreshToken: false })
      assert.equal(account.account?.type, 'apiKey')
      assert.equal(account.requiresOpenaiAuth, false)
      assert.ok(account[flavor].providers.some((provider) => provider.id === 'fake'))
      // The free tier and keyless built-in providers are never reported as signed in.
      for (const id of [flavor === 'mimo' ? 'mimo' : 'opencode', 'xiaomi']) assert.ok(!account[flavor].providers.some((provider) => provider.id === id), id)
      assert.equal(account[flavor].login.signedIn, false)
      assert.equal(account[flavor].unknown, false)
      const limits = await request('account/rateLimits/read', {})
      assert.equal(limits.rateLimits.primary, null)
    })

    // ---------------------------------------------------------------- customization + streaming
    const custom = { systemPrompt: 'CUSTOM_SYSTEM_PROMPT for {{model}} in {{cwd}}', instructions: 'PROJECT_INSTRUCTIONS_MARKER', modelParams: { 'fake/fake-model': { temperature: 0.37, maxTokens: 777 } } }
    const started = await request('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'on-request', sandbox: 'workspace-write', ...permissionParams('auto', { customization: custom, tools: { disabled: ['webfetch'], disabledServers: [] } }) })
    const threadId = started.thread.id
    await check('thread/start returns a Codex thread attributed to the core', async () => {
      assert.match(threadId, /^ses_/)
      assert.equal(started.thread.cliVersion.split(' ')[0], flavor)
      assert.equal(started.cwd, workspace)
      assert.equal(started.model, 'fake/fake-model')
      await waitFor((event) => event.method === 'thread/started' && event.params.thread.id === threadId, 5000, 'thread/started')
    })
    let first
    await check('turn/start streams agentMessage deltas and completes the turn', async () => {
      first = await runTurn(threadId, 'Say hello THINK_FIRST please')
      assert.match(first.started.turn.id, /^msg_/)
      const turnStarted = first.notes.find(note('turn/started', threadId))
      assert.equal(turnStarted.params.turn.id, first.started.turn.id)
      const deltas = first.notes.filter(note('item/agentMessage/delta', threadId)).map((event) => event.params.delta).join('')
      assert.equal(deltas, 'thought reply')
      const message = first.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'agentMessage')
      assert.equal(message.params.item.text, 'thought reply')
      assert.equal(first.completed.params.turn.status, 'completed')
      const user = first.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'userMessage')
      assert.equal(user.params.item.content[0].text, 'Say hello THINK_FIRST please')
    })
    await check('reasoning streams as summary text deltas', async () => {
      const deltas = first.notes.filter(note('item/reasoning/summaryTextDelta', threadId)).map((event) => event.params.delta).join('')
      assert.equal(deltas, 'Let me think about this.')
      const item = first.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'reasoning')
      assert.deepEqual(item.params.item.summary, ['Let me think about this.'])
    })
    await check('token usage reaches the context ring (thread/tokenUsage/updated with modelContextWindow)', async () => {
      const usage = first.notes.filter(note('thread/tokenUsage/updated', threadId)).at(-1)
      assert.ok(usage, 'no tokenUsage')
      assert.equal(usage.params.tokenUsage.modelContextWindow, 200000)
      assert.equal(usage.params.tokenUsage.last.inputTokens, 150)
      assert.equal(usage.params.tokenUsage.last.cachedInputTokens, 30)
      assert.ok(usage.params.tokenUsage.total.totalTokens >= usage.params.tokenUsage.last.totalTokens)
    })
    await check('a custom system prompt replaces the whole prompt the model receives (variables filled)', async () => {
      const body = lastMain()
      const system = systemOf(body)
      assert.ok(system.startsWith(`CUSTOM_SYSTEM_PROMPT for fake-model in ${workspace}`), system.slice(0, 300))
      assert.match(system, /PROJECT_INSTRUCTIONS_MARKER/)
      assert.doesNotMatch(system, /You are OpenCode|You are opencode|interactive CLI/i)
    })
    await check('per-model temperature and max tokens reach the request', async () => {
      const body = lastMain()
      assert.equal(body.temperature, 0.37)
      assert.equal(body.max_tokens, 777)
    })
    await check('a tool turned off in the profile is absent from the model request', async () => {
      const tools = toolNames(lastMain())
      assert.ok(tools.includes('bash'), tools.join(','))
      assert.ok(!tools.includes('webfetch'), tools.join(','))
    })
    await check('codeDesktop/systemPrompt/preview returns the exact prompt after a turn', async () => {
      const preview = await request('codeDesktop/systemPrompt/preview', { cwd: workspace, threadId, codeDesktop: { customization: custom } })
      assert.equal(preview.exact, true)
      assert.equal(preview.custom, true)
      assert.ok(preview.text.startsWith(`CUSTOM_SYSTEM_PROMPT for fake-model in ${workspace}`))
      assert.match(preview.text, /PROJECT_INSTRUCTIONS_MARKER/)
      assert.ok(preview.defaultText.length > 200, 'default prompt captured')
      assert.ok(preview.tools.includes('bash'))
    })

    // ---------------------------------------------------------------- tools in auto mode
    await check('auto: bash runs without a card and streams output deltas', async () => {
      const turn = await runTurn(threadId, 'Please RUN_BASH now')
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0)
      const output = turn.notes.filter(note('item/commandExecution/outputDelta', threadId)).map((event) => event.params.delta).join('')
      assert.match(output, /bash-output-1\nbash-output-2/)
      const item = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution').params.item
      assert.equal(item.command, 'echo bash-output-1; echo bash-output-2')
      assert.equal(item.status, 'completed')
      assert.equal(item.exitCode, 0)
    })
    await check('auto: shell commands run in the workspace-write sandbox (outside write denied)', async () => {
      await runTurn(threadId, 'Now ESCAPE_SANDBOX please')
      assert.equal(fs.existsSync(path.join(home, 'outside.txt')), false, 'outside write must be blocked')
      assert.equal(fs.readFileSync(path.join(workspace, 'inside.txt'), 'utf8'), 'inside\n')
    })
    await check('auto: edits apply without a card, as fileChange with a unified diff and turn/diff/updated', async () => {
      const turn = await runTurn(threadId, 'Go EDIT_FILE')
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
      const change = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'fileChange').params.item
      assert.equal(change.status, 'completed')
      assert.equal(change.changes[0].path, path.join(workspace, 'hello.txt'))
      assert.match(change.changes[0].diff, /-before\n\+after/)
      const read = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.commandActions?.[0]?.type === 'read')
      assert.ok(read, 'read renders as a file-tool row')
      const diff = turn.notes.filter(note('turn/diff/updated', threadId)).at(-1)
      assert.match(diff.params.diff, /\+after/)
    })

    await check('developerInstructions (workflow runner agents) reach the system prompt of their thread only', async () => {
      const dev = await request('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'read-only', developerInstructions: 'DEV_INSTRUCTIONS_MARKER answer tersely' })
      await runTurn(dev.thread.id, 'Developer check please')
      assert.match(systemOf(lastMain()), /DEV_INSTRUCTIONS_MARKER/)
      assert.match(systemOf(lastMain()), /Skills provide|skill|You are|opencode|mimo/i)
    })
    // ---------------------------------------------------------------- approvals per permission mode
    const setMode = (mode, extra) => request('codeDesktop/thread/permissions', { threadId, ...permissionParams(mode, extra) })
    const answer = (match, value, delay = 50) => { const responder = { match, answer: typeof value === 'function' ? value : () => value, delay }; responders.push(responder); return () => responders.splice(responders.indexOf(responder), 1) }
    const isRequest = (method) => (event) => event.kind === 'request' && event.method === method
    await check('ask: bash asks with a command card; accept runs it', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'accept' })
      const turn = await runTurn(threadId, 'Ask mode RUN_BASH', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/commandExecution/requestApproval'))[0]
      assert.ok(card, 'no approval card')
      assert.equal(card.params.threadId, threadId)
      assert.equal(card.params.command, 'echo bash-output-1; echo bash-output-2')
      const item = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution').params.item
      assert.equal(card.params.itemId, item.id)
      assert.equal(item.status, 'completed')
      assert.ok(turn.notes.some((event) => event.method === 'thread/status/changed' && event.params.status?.activeFlags?.includes('waitingOnApproval')))
    })
    await check('ask: declining a command marks it declined and the turn goes on', async () => {
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline' })
      const turn = await runTurn(threadId, 'Ask mode again RUN_BASH', permissionParams('ask'))
      off()
      const item = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution').params.item
      assert.ok(['declined', 'failed'].includes(item.status), item.status)
      assert.equal(turn.completed.params.turn.status, 'completed')
    })
    await check('ask: a plain Deny stops the agent (OpenCode\'s RejectedError: no further model call this turn)', async () => {
      // A fresh session: after a plain Deny the agent stops, so its next prompt would arrive merged with that tool result.
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline' })
      const before = model.requests.length
      const turn = await runTurn(fresh, 'Deny stops RUN_BASH', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/commandExecution/requestApproval'))[0]
      assert.ok(card, 'no approval card')
      assert.equal(card.params.codeDesktop?.declineFeedback, true, `the card offers feedback on Deny: ${JSON.stringify(card.params).slice(0, 500)}`)
      const after = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1)
      assert.equal(after.length, 1, `the agent kept going after a plain Deny (${after.length} model calls)`)
    })
    await check('ask: Deny with feedback is a correction the agent continues from', async () => {
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline', codeDesktop: { feedback: 'Use the staging script instead.' } })
      const before = model.requests.length
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      const turn = await runTurn(fresh, 'Deny with note RUN_BASH', permissionParams('ask'))
      off()
      const after = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1)
      assert.ok(after.length >= 2, 'the agent did not continue after the correction')
      assert.match(JSON.stringify(after.at(-1).messages.slice(-2)), /Use the staging script instead\./)
      assert.equal(turn.completed.params.turn.status, 'completed')
    })
    if (flavor === 'mimo') await check('MiMo\'s own workflow tool only with codeDesktop.dynamicWorkflows true (a deny rule drops it; turn/start toggles it)', async () => {
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('auto', { dynamicWorkflows: false }) })).thread.id
      let before = model.requests.length
      await runTurn(fresh, 'Workflow gate off', permissionParams('auto', { dynamicWorkflows: false }))
      const off = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1).at(-1)
      assert.ok(off, 'no main model call')
      assert.ok(!toolNames(off).includes('workflow'), `workflow offered while off: ${toolNames(off).join(',')}`)
      before = model.requests.length
      await runTurn(fresh, 'Workflow gate on', permissionParams('auto', { dynamicWorkflows: true }))
      const on = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1).at(-1)
      assert.ok(toolNames(on).includes('workflow'), `workflow missing while on: ${toolNames(on).join(',')}`)
      before = model.requests.length
      await runTurn(fresh, 'Workflow gate off again', permissionParams('auto', { dynamicWorkflows: false }))
      const again = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1).at(-1)
      assert.ok(!toolNames(again).includes('workflow'), 'workflow offered after turning it off')
    })
    if (flavor === 'opencode') await check('references: listed for the @ menu; Auto reads a reference folder without an outside-the-workspace card', async () => {
      const listed = await request('codeDesktop/references/list', { cwd: workspace })
      assert.deepEqual(listed.data.map((entry) => [entry.name, entry.path, entry.description]), [['docs', path.join(home, 'team-docs'), 'Team docs']])
      assert.equal(init.capabilities.references, true)
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('auto') })).thread.id
      const turn = await runTurn(fresh, 'Auto LIST_REFERENCE', permissionParams('auto'))
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0, 'a card asked for the reference folder')
      const item = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution')?.params.item
      assert.ok(item, 'the command did not run')
      assert.match(item.aggregatedOutput ?? '', /guide\.md/)
    })
    await check('ask: edits ask with a file-change card showing the diff', async () => {
      fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
      const off = answer(isRequest('item/fileChange/requestApproval'), { decision: 'accept' })
      const turn = await runTurn(threadId, 'Ask EDIT_FILE', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/fileChange/requestApproval'))[0]
      assert.ok(card, 'no file card')
      assert.match(JSON.stringify(card.params.changes), /after/)
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
    })
    await check('acceptEdits: edits apply without a card, commands still ask', async () => {
      fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
      await setMode('acceptEdits')
      const editTurn = await runTurn(threadId, 'AcceptEdits EDIT_FILE', permissionParams('acceptEdits'))
      assert.equal(since(editTurn.from, (event) => event.kind === 'request').length, 0)
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'accept' })
      const bashTurn = await runTurn(threadId, 'AcceptEdits RUN_BASH', permissionParams('acceptEdits'))
      off()
      assert.equal(since(bashTurn.from, isRequest('item/commandExecution/requestApproval')).length, 1)
    })
    await check('ask: "allow for this session" stops asking for the same command', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'acceptForSession' })
      const one = await runTurn(threadId, 'Session grant RUN_BASH', permissionParams('ask'))
      const two = await runTurn(threadId, 'Session grant again RUN_BASH', permissionParams('ask'))
      off()
      assert.equal(since(one.from, isRequest('item/commandExecution/requestApproval')).length, 1)
      assert.equal(since(two.from, isRequest('item/commandExecution/requestApproval')).length, 0)
    })
    await check('ask: "allow for this session" on an edit stays in its thread and never reaches read-only modes', async () => {
      const hello = path.join(workspace, 'hello.txt'), written = path.join(workspace, 'written.txt')
      fs.writeFileSync(hello, 'before\n')
      fs.rmSync(written, { force: true })
      await setMode('ask')
      const off = answer(isRequest('item/fileChange/requestApproval'), { decision: 'acceptForSession' })
      const one = await runTurn(threadId, 'Grant EDIT_FILE', permissionParams('ask'))
      off()
      assert.equal(since(one.from, isRequest('item/fileChange/requestApproval')).length, 1)
      assert.equal(fs.readFileSync(hello, 'utf8'), 'after\n')
      // The same thread: no second card.
      const two = await runTurn(threadId, 'Granted WRITE_FILE', permissionParams('ask'))
      assert.equal(since(two.from, isRequest('item/fileChange/requestApproval')).length, 0)
      assert.ok(fs.existsSync(written), 'granted write did not happen')
      fs.rmSync(written)
      // Another session in a read-only mode: the grant does not reach it (OpenCode's own `always` did).
      const other = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('chat') })).thread.id
      await runTurn(other, 'Read-only WRITE_FILE', permissionParams('chat'))
      assert.ok(!fs.existsSync(written), 'a read-only session wrote a file after another session\'s grant')
      // Another session in Ask mode asks again.
      const offOther = answer(isRequest('item/fileChange/requestApproval'), { decision: 'decline' })
      const four = await runTurn(other, 'Other session WRITE_FILE', permissionParams('ask'))
      offOther()
      assert.equal(since(four.from, isRequest('item/fileChange/requestApproval')).length, 1)
      assert.ok(!fs.existsSync(written))
      // The granting thread in a read-only mode stays read-only.
      await setMode('chat')
      await runTurn(threadId, 'Now read-only WRITE_FILE', permissionParams('chat'))
      assert.ok(!fs.existsSync(written), 'the granting thread wrote in a read-only mode')
      await setMode('ask')
      await request('thread/archive', { threadId: other }).catch(() => {})
    })
    await check('ask: "allow for this session" on one of two parallel edits also settles the other open card', async () => {
      const files = ['one.txt', 'two.txt'].map((name) => path.join(workspace, name))
      for (const file of files) fs.rmSync(file, { force: true })
      const grantThread = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      // Answer only the first card; the second must be withdrawn by the bridge once the grant covers it.
      let seen = 0
      const off = answer((event) => isRequest('item/fileChange/requestApproval')(event) && event.params.threadId === grantThread && seen++ === 0, { decision: 'acceptForSession' }, 1500)
      const turn = await runTurn(grantThread, 'Parallel TWO_WRITES', permissionParams('ask'))
      off()
      const cards = since(turn.from, isRequest('item/fileChange/requestApproval'))
      // OpenCode asks for both at once; an agent that asks one at a time (MiMo) never shows the second card at all.
      assert.ok(cards.length >= 1 && cards.length <= 2, `cards: ${cards.length}`)
      const withdrawn = since(turn.from, (event) => event.kind === 'resolved' && event.reason === 'server_resolved').map((event) => event.id)
      if (cards.length === 2) assert.ok(withdrawn.includes(cards[1].id), `the covered card was not withdrawn: ${JSON.stringify({ cards: cards.map((card) => card.id), withdrawn })}`)
      if (flavor === 'opencode') assert.equal(cards.length, 2, 'OpenCode runs the two writes in parallel')
      for (const file of files) assert.ok(fs.existsSync(file), `${path.basename(file)} was not written`)
      await request('thread/archive', { threadId: grantThread }).catch(() => {})
    })
    await check('livePermissions: switching to Bypass mid-turn applies to the next call', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), (event) => {
        void setMode('bypass')
        return { decision: 'accept' }
      }, 300)
      const turn = await runTurn(threadId, 'Live TWO_BASH', permissionParams('ask'))
      off()
      assert.equal(since(turn.from, isRequest('item/commandExecution/requestApproval')).length, 1)
      const commands = turn.notes.filter((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution')
      assert.equal(commands.length, 2)
    })
    await check('bypass: no cards and no sandbox (writes anywhere)', async () => {
      await setMode('bypass')
      const turn = await runTurn(threadId, 'Bypass ESCAPE_SANDBOX', permissionParams('bypass'))
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0)
      assert.equal(fs.readFileSync(path.join(home, 'outside.txt'), 'utf8'), 'escaped\n')
      fs.rmSync(path.join(home, 'outside.txt'))
    })
    await check('plan: read-only agent, plan card (plan item + plan-review question), approve switches mode and implements', async () => {
      await setMode('plan')
      const off = answer(isRequest('item/tool/requestUserInput'), (event) => ({ answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'acceptEdits' } }))
      const turn = await runTurn(threadId, 'Make a plan PLAN_NOW', permissionParams('plan'))
      off()
      const planRequest = model.requests.find((body) => toolNames(body).includes('plan_exit'))
      assert.ok(planRequest, 'plan agent has plan_exit')
      // The plan agent ran on its configured model (agent.plan.model), and the turn said so.
      assert.equal(planRequest.model, 'fake-plan')
      assert.ok(turn.notes.some((event) => event.method === 'model/rerouted' && event.params.toModel === 'fake/fake-plan' && event.params.fromModel === 'fake/fake-model'), 'no model/rerouted notice')
      const card = since(turn.from, isRequest('item/tool/requestUserInput'))[0]
      assert.ok(card, 'no plan card')
      assert.equal(card.params.questions[0].id, 'plan-review')
      assert.ok(card.params.questions[0].options.some((option) => option.label === 'Keep planning'))
      assert.ok(turn.notes.some((event) => event.method === 'item/completed' && event.params.item.type === 'plan'))
      if (!fs.existsSync(path.join(workspace, 'planned.txt'))) console.log(JSON.stringify(model.requests.slice(-4).map((body) => ({ tools: toolNames(body).join(','), last: userTexts(body).at(-1)?.slice(0, 200), done: resultsSinceLastPrompt(body) })), null, 1), JSON.stringify(turn.notes.filter((event) => event.method === 'item/completed').map((event) => [event.params.item.type, event.params.item.tool, event.params.item.status, event.params.item.contentItems?.[0]?.text?.slice(0, 200)])))
      assert.equal(fs.readFileSync(path.join(workspace, 'planned.txt'), 'utf8'), 'implemented\n')
      const resumed = await request('thread/read', { threadId, includeTurns: false })
      assert.equal(resumed.thread.id, threadId)
    })
    await setMode('auto')
    await check('question tool → item/tool/requestUserInput, the answer reaches the model', async () => {
      const off = answer(isRequest('item/tool/requestUserInput'), (event) => ({ answers: { [event.params.questions[0].id]: { answers: ['Blue'] } } }))
      const turn = await runTurn(threadId, 'Please ASK_QUESTION', permissionParams('auto'))
      off()
      const card = since(turn.from, isRequest('item/tool/requestUserInput'))[0]
      assert.equal(card.params.questions[0].question, 'Which color?')
      assert.deepEqual(card.params.questions[0].options.map((option) => option.label), ['Red', 'Blue'])
      const last = lastMain()
      assert.match(JSON.stringify(last.messages.at(-1)), /Blue/)
    })
    await check('todo list → turn/plan/updated checklist', async () => {
      const turn = await runTurn(threadId, 'Please MAKE_TODOS', permissionParams('auto'))
      const plan = turn.notes.filter(note('turn/plan/updated', threadId)).at(-1)
      assert.ok(plan, 'no plan update')
      assert.match(plan.params.plan[0].step, /Scripted step one/)
    })
    await check('sub-agent → spawned thread (parentThreadId) with its own turn and items; collab item on the parent', async () => {
      const turn = await runTurn(threadId, 'Please SPAWN_AGENT', permissionParams('auto'))
      const spawned = turn.notes.find((event) => event.method === 'thread/started' && event.params.thread.parentThreadId === threadId)
      assert.ok(spawned, 'no spawned thread')
      const childId = spawned.params.thread.id
      assert.equal(spawned.params.thread.source.subAgent.thread_spawn.parent_thread_id, threadId)
      assert.ok(turn.notes.some((event) => event.method === 'turn/started' && event.params.threadId === childId))
      assert.ok(turn.notes.some((event) => event.method === 'item/completed' && event.params.threadId === childId && event.params.item.type === 'agentMessage' && event.params.item.text === 'child finished'))
      const collab = turn.notes.filter((event) => event.method === 'item/completed' && event.params.threadId === threadId && event.params.item.type === 'collabAgentToolCall').at(-1)
      assert.ok(collab, 'no collab item')
      assert.deepEqual(collab.params.item.receiverThreadIds, [childId])
      const listed = await request('thread/list', { sourceKinds: ['subAgentThreadSpawn'], limit: 100 })
      assert.ok(listed.data.some((thread) => thread.id === childId && thread.parentThreadId === threadId))
      const child = await request('thread/read', { threadId: childId, includeTurns: true })
      assert.equal(child.thread.parentThreadId, threadId)
      assert.ok(child.thread.turns.at(-1).items.some((item) => item.type === 'agentMessage' && item.text === 'child finished'))
    })

    // ---------------------------------------------------------------- turns: steer, interrupt, queue, structured, attachments
    await check('turn/steer adds the message to the running turn and reaches the model', async () => {
      const from = events.length
      const startedTurn = await request('turn/start', { threadId, input: [{ type: 'text', text: 'Take time SLOW_REPLY', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      const steered = await request('turn/steer', { threadId, expectedTurnId: startedTurn.turn.id, input: [{ type: 'text', text: 'STEERED extra detail', text_elements: [] }] })
      assert.equal(steered.turnId, startedTurn.turn.id)
      await turnDone(threadId, from)
      const users = since(from, (event) => event.method === 'item/completed' && event.params.threadId === threadId && event.params.item.type === 'userMessage')
      assert.equal(users.length, 2)
      assert.ok(users.every((event) => event.params.turnId === startedTurn.turn.id))
      assert.ok(model.requests.some((body) => JSON.stringify(body.messages).includes('STEERED extra detail')))
      assert.equal(since(from, note('turn/completed', threadId)).length, 1)
      const history = await request('thread/turns/list', { threadId, limit: 1, sortDirection: 'desc' })
      assert.equal(history.data[0].items.filter((item) => item.type === 'userMessage').length, 2)
    })
    await check('turn/interrupt stops a running turn (status interrupted)', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'Never ends HANG_FOREVER', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      await new Promise((resolve) => setTimeout(resolve, 800))
      await request('turn/interrupt', { threadId })
      const completed = await turnDone(threadId, from, 30000)
      assert.equal(completed.params.turn.status, 'interrupted')
      model.releaseHangers()
    })
    await check('queued messages wait for the running turn, then start their own turn', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'First SLOW_REPLY', text_elements: [] }], ...permissionParams('auto') })
      const queued = await request('thread/queue/add', { threadId, input: [{ type: 'text', text: 'QUEUED_ONE follow-up', text_elements: [] }], clientUserMessageId: 'client-1' })
      assert.equal(queued.queuedSubmission.clientUserMessageId, 'client-1')
      const listed = await request('thread/queue/list', { threadId })
      assert.equal(listed.data.length, 1)
      assert.ok(since(from, note('thread/queue/changed', threadId)).length >= 1)
      await turnDone(threadId, from)
      const next = events.length
      const second = await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId && events.filter((other, index) => index >= from && other.method === 'turn/started' && other.params.threadId === threadId).length >= 2, 30000, 'second turn')
      await turnDone(threadId, events.indexOf(second))
      assert.ok(model.requests.some((body) => userTexts(body).at(-1)?.includes('QUEUED_ONE')))
      assert.equal((await request('thread/queue/list', { threadId })).data.length, 0)
      void next
    })
    await check('structured output: outputSchema returns the JSON as the final agent message', async () => {
      const schema = { type: 'object', properties: { answer: { type: 'string' }, count: { type: 'number' } }, required: ['answer', 'count'], additionalProperties: false }
      const turn = await runTurn(threadId, 'Answer STRUCTURED', { outputSchema: schema, ...permissionParams('auto') })
      const body = model.requests.find((candidate) => toolNames(candidate).includes('StructuredOutput') && userTexts(candidate).at(-1)?.includes('STRUCTURED'))
      assert.ok(body, 'StructuredOutput tool offered')
      const messages = turn.notes.filter((event) => event.method === 'item/completed' && event.params.item.type === 'agentMessage')
      assert.deepEqual(JSON.parse(messages.at(-1).params.item.text), { answer: 'forty-two', count: 42 })
    })
    await check('attachments: a local image and an @-mentioned file reach the model', async () => {
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
      fs.writeFileSync(path.join(workspace, 'pixel.png'), png)
      fs.writeFileSync(path.join(workspace, 'notes.md'), 'MENTIONED_FILE_CONTENT\n')
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'Look at these ATTACHMENTS', text_elements: [] }, { type: 'mention', name: 'notes.md', path: path.join(workspace, 'notes.md') }, { type: 'localImage', path: path.join(workspace, 'pixel.png') }], ...permissionParams('auto') })
      await turnDone(threadId, from)
      const body = model.requests.filter((candidate) => JSON.stringify(candidate.messages).includes('ATTACHMENTS')).at(-1)
      const raw = JSON.stringify(body.messages)
      assert.match(raw, /"type":"image"/)
      assert.match(raw, /MENTIONED_FILE_CONTENT/)
      const user = since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'userMessage' && JSON.stringify(event.params.item.content).includes('ATTACHMENTS'))[0].params.item
      assert.ok(user.content.some((part) => part.type === 'localImage'), JSON.stringify(user).slice(0, 600))
      // A structured turn's message the bridge re-created (repairStructured) never shows up as a turn of its own.
      assert.ok(!since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'userMessage' && JSON.stringify(event.params.item.content).includes('STRUCTURED')).length, 'a repaired structured message was announced again')
      assert.ok(user.content.some((part) => part.type === 'mention'))
    })
    await check('a model error fails the turn with the error (turn/completed failed + error notification)', async () => {
      const turn = await runTurn(threadId, 'Please FAIL_TURN', permissionParams('auto'))
      assert.equal(turn.completed.params.turn.status, 'failed')
      assert.match(turn.completed.params.turn.error.message, /scripted failure 400|400|invalid/i)
      assert.ok(turn.notes.some((event) => event.method === 'error' && event.params.threadId === threadId && event.params.willRetry === false))
    })

    // ---------------------------------------------------------------- session actions
    await check('/btw side question answers from the thread without entering it', async () => {
      const before = (await request('thread/turns/list', { threadId, limit: 200 })).data.length
      const from = events.length
      const result = await request('codeDesktop/sideQuestion', { threadId, question: 'What did we do so far?', history: [], requestId: 'side-1' }, 180000)
      assert.match(result.text, /SIDE_ANSWER/)
      const deltas = since(from, (event) => event.method === 'codeDesktop/sideQuestion/delta' && event.params.requestId === 'side-1').map((event) => event.params.text).join('')
      assert.match(deltas, /SIDE_ANSWER/)
      const after = (await request('thread/turns/list', { threadId, limit: 200 })).data.length
      assert.equal(after, before)
      if (flavor === 'mimo') {
        // MiMo answers with its own /ask: the session's system prompt and tools (a cache hit on the whole prefix).
        const sideRequest = model.requests.filter((body) => /This is a SIDE QUESTION about the session/.test(JSON.stringify(body.messages.at(-1) ?? ''))).at(-1)
        assert.ok(sideRequest, 'MiMo asked its own side question')
        const mainRequest = model.requests.filter((body) => body !== sideRequest && toolNames(body).length > 1 && /THINK_FIRST/.test(JSON.stringify(body.messages))).at(-1)
        assert.equal(systemOf(sideRequest), systemOf(mainRequest), 'the side question keeps the session\'s system prompt')
        assert.ok(toolNames(sideRequest).length > 1, 'the side question keeps the session\'s tool list')
        assert.match(JSON.stringify(sideRequest.messages), /THINK_FIRST/)
        assert.ok(!since(from, (event) => event.method === 'thread/started').length, 'no sub-agent thread for the answer session')
      } else {
        const sideRequest = model.requests.filter((body) => /side question/i.test(systemOf(body))).at(-1)
        assert.ok(sideRequest && toolNames(sideRequest).length === 0, 'the side question runs without tools')
        assert.match(JSON.stringify(sideRequest.messages), /THINK_FIRST/)
      }
      const listed = await request('thread/list', { limit: 200 })
      assert.ok(!listed.data.some((thread) => thread.id !== threadId && (thread.forkedFromId === threadId || /^ask: /.test(thread.name ?? thread.preview ?? ''))))
    })
    await check('thread/compact/start runs a compaction turn (contextCompaction item)', async () => {
      const from = events.length
      await request('thread/compact/start', { threadId })
      const completed = await turnDone(threadId, from, 120000)
      assert.equal(completed.params.turn.status, 'completed')
      assert.ok(since(from, (event) => event.method === 'item/started' && event.params.item.type === 'contextCompaction').length >= 1)
    })
    let forkId
    await check('thread/fork copies history through a turn into a new thread', async () => {
      const turns = (await request('thread/turns/list', { threadId, limit: 200, sortDirection: 'asc' })).data
      const forked = await request('thread/fork', { threadId, lastTurnId: turns[1].id, ...permissionParams('auto'), excludeTurns: true })
      forkId = forked.thread.id
      assert.notEqual(forkId, threadId)
      assert.equal(forked.thread.forkedFromId, threadId)
      const forkTurns = (await request('thread/turns/list', { threadId: forkId, limit: 200 })).data
      assert.equal(forkTurns.length, 2)
    })
    await check('thread/revert (rewind) removes a turn and every later one from history', async () => {
      const turns = (await request('thread/turns/list', { threadId: forkId, limit: 200, sortDirection: 'asc' })).data
      const reverted = await request('thread/revert', { threadId: forkId, beforeTurnId: turns[1].id })
      assert.equal(reverted.thread.id, forkId)
      const after = (await request('thread/turns/list', { threadId: forkId, limit: 200 })).data
      assert.equal(after.length, 1)
      assert.equal(after[0].id, turns[0].id)
    })
    await check('review/start runs the agent\'s review as an inline review turn', async () => {
      const from = events.length
      const review = await request('review/start', { threadId, target: { type: 'uncommittedChanges' }, delivery: 'inline' })
      assert.equal(review.reviewThreadId, threadId)
      const completed = await turnDone(threadId, from, 120000)
      assert.equal(completed.params.turn.id, review.turn.id)
      assert.ok(since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'enteredReviewMode').length === 1)
      assert.ok(since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'exitedReviewMode').length === 1)
    })
    await check('rename, archive / unarchive and list (search, archived filter)', async () => {
      await request('thread/name/set', { threadId, name: 'Smoke thread name' })
      await waitFor((event) => event.method === 'thread/name/updated' && event.params.threadId === threadId && event.params.threadName === 'Smoke thread name', 5000, 'name updated')
      const listed = await request('thread/list', { limit: 50, cwd: workspace })
      const row = listed.data.find((thread) => thread.id === threadId)
      assert.equal(row?.name, 'Smoke thread name')
      assert.equal(row.cliVersion.split(' ')[0], flavor)
      const searched = await request('thread/list', { limit: 50, searchTerm: 'Smoke thread' })
      assert.ok(searched.data.some((thread) => thread.id === threadId))
      await request('thread/archive', { threadId: forkId })
      assert.ok(!(await request('thread/list', { limit: 50 })).data.some((thread) => thread.id === forkId))
      assert.ok((await request('thread/list', { limit: 50, archived: true })).data.some((thread) => thread.id === forkId))
      await request('thread/unarchive', { threadId: forkId })
      assert.ok((await request('thread/list', { limit: 50 })).data.some((thread) => thread.id === forkId))
    })
    await check('thread/turns/list and thread/items/list page the history', async () => {
      const page = await request('thread/turns/list', { threadId, limit: 2, sortDirection: 'desc' })
      assert.equal(page.data.length, 2)
      assert.ok(page.nextCursor)
      const items = await request('thread/items/list', { threadId, limit: 5 })
      assert.equal(items.data.length, 5)
      assert.ok(items.data[0].turnId)
    })

    // ---------------------------------------------------------------- MCP, tools, skills, plugins
    await check('MCP: add a stdio server (config/batchWrite), status lists it connected with its tools', async () => {
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.smoke', value: { command: process.execPath, args: [mcpScript] }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
      await request('config/mcpServer/reload', {})
      const config = await request('config/read', { includeLayers: false, cwd: workspace })
      assert.equal(config.config.mcp_servers.smoke.command, process.execPath)
      let status
      for (let attempt = 0; attempt < 40; attempt++) {
        status = (await request('mcpServerStatus/list', { detail: 'toolsAndAuthOnly', threadId })).data.find((server) => server.name === 'smoke')
        if (status?.runtimeStatus === 'connected' && status.tools.echo) break
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      assert.equal(status?.runtimeStatus, 'connected')
      assert.ok(status.tools.echo)
      assert.equal(status.authStatus, 'unsupported')
    })
    await check('MCP: a connector turns off and back on (config/batchWrite mcp_servers.<name>.enabled)', async () => {
      assert.equal(init.capabilities?.mcpEnable, true)
      const statusOf = async () => (await request('mcpServerStatus/list', { detail: 'statusOnly', threadId })).data.find((server) => server.name === 'smoke')
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers."smoke".enabled', value: false, mergeStrategy: 'replace' }], reloadUserConfig: true })
      let status
      for (let attempt = 0; attempt < 40 && (status = await statusOf())?.runtimeStatus !== 'disabled'; attempt++) await new Promise((resolve) => setTimeout(resolve, 250))
      assert.equal(status?.runtimeStatus, 'disabled')
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers."smoke".enabled', value: true, mergeStrategy: 'replace' }], reloadUserConfig: true })
      await request('config/mcpServer/reload', {})
      for (let attempt = 0; attempt < 40 && (status = await statusOf())?.runtimeStatus !== 'connected'; attempt++) await new Promise((resolve) => setTimeout(resolve, 250))
      assert.equal(status?.runtimeStatus, 'connected')
    })
    await check('MCP tool call renders as mcpToolCall with its result', async () => {
      const turn = await runTurn(threadId, 'Use it CALL_MCP', permissionParams('auto', { tools: null }))
      const item = turn.notes.find((event) => event.method === 'item/completed' && event.params.item.type === 'mcpToolCall')?.params.item
      assert.ok(item, `no mcp item; tools: ${toolNames(lastMain()).join(',')}`)
      assert.equal(item.server, 'smoke')
      assert.equal(item.tool, 'echo')
      assert.equal(item.status, 'completed')
      assert.match(JSON.stringify(item.result), /echo:from-model/)
    })
    await check('session grants never come from Plan and are dropped on a mode change (an MCP tool asks again)', async () => {
      const mcpCards = (from) => since(from, isRequest('item/commandExecution/requestApproval'))
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'acceptForSession' })
      // Plan: the card (if the plan agent calls the tool) offers no session grant, and answering one records none.
      await setMode('plan')
      const planned = await runTurn(threadId, 'Plan Use it CALL_MCP', permissionParams('plan', { tools: null }))
      const planCard = mcpCards(planned.from)[0]
      if (planCard) assert.equal(planCard.params.sessionGrantable, false)
      else console.log(`  note [${flavor}]: the plan agent did not call the MCP tool (no Plan card to check)`)
      await setMode('ask')
      const asked = await runTurn(threadId, 'Ask Use it CALL_MCP', permissionParams('ask', { tools: null }))
      assert.equal(mcpCards(asked.from).length, 1, 'a grant from Plan carried into Ask')
      assert.equal(mcpCards(asked.from)[0].params.sessionGrantable, true)
      // Granted in Ask: no card for the same call.
      const again = await runTurn(threadId, 'Ask again Use it CALL_MCP', permissionParams('ask', { tools: null }))
      assert.equal(mcpCards(again.from).length, 0)
      // A mode change drops the grant.
      await setMode('acceptEdits')
      await setMode('ask')
      const after = await runTurn(threadId, 'After switch Use it CALL_MCP', permissionParams('ask', { tools: null }))
      off()
      assert.equal(mcpCards(after.from).length, 1, 'the grant survived a mode change')
      await setMode('auto')
    })
    await check('codeDesktop/tools/list lists built-in tools and MCP servers with their tools', async () => {
      const list = await request('codeDesktop/tools/list', { threadId })
      assert.ok(list.tools.some((tool) => tool.name === 'bash'))
      assert.ok(list.tools.some((tool) => tool.name === 'edit'))
      const smoke = list.servers.find((server) => server.name === 'smoke')
      assert.equal(smoke?.tools[0]?.name, 'smoke_echo')
    })
    await check('turning an MCP server off for the session removes its tools from the model request', async () => {
      await runTurn(threadId, 'No mcp now please', permissionParams('auto', { tools: { disabled: [], disabledServers: ['smoke'] } }))
      const tools = toolNames(lastMain())
      assert.ok(!tools.includes('smoke_echo'), tools.join(','))
      assert.ok(tools.includes('bash'))
    })
    await check('file-changing tool switches follow the agent (OpenCode: one edit switch; MiMo: one per tool, edit stops all)', async () => {
      const list = await request('codeDesktop/tools/list', { threadId })
      const edit = list.tools.find((tool) => tool.name === 'edit')
      assert.doesNotMatch(edit.description, flavor === 'mimo' ? /OpenCode/ : /MiMo/)
      const offWith = async (disabled) => {
        await runTurn(threadId, `No ${disabled.join(' ')} now please`, permissionParams('auto', { tools: { disabled, disabledServers: [] } }))
        return toolNames(lastMain())
      }
      const before = toolNames(lastMain())
      assert.ok(before.includes('edit') && before.includes('write'), before.join(','))
      if (flavor === 'mimo') {
        assert.ok(list.tools.some((tool) => tool.name === 'write' && tool.requires?.[0] === 'edit'), 'MiMo lists write on its own')
        const noWrite = await offWith(['write'])
        assert.ok(!noWrite.includes('write') && noWrite.includes('edit'), noWrite.join(','))
        const noEdit = await offWith(['edit'])
        for (const name of ['edit', 'write', 'multiedit', 'notebook_edit']) assert.ok(!noEdit.includes(name), `${name}: ${noEdit.join(',')}`)
      } else {
        assert.ok(!list.tools.some((tool) => tool.name === 'write'), 'OpenCode lists write under edit')
        const noEdit = await offWith(['edit'])
        assert.ok(!noEdit.includes('edit') && !noEdit.includes('write'), noEdit.join(','))
      }
      assert.ok((await offWith([])).includes('write'))
    })
    await check('MCP: removing the server (config/batchWrite null) drops it from config and status', async () => {
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.smoke', value: null, mergeStrategy: 'replace' }], reloadUserConfig: true })
      const config = await request('config/read', { includeLayers: false, cwd: workspace })
      assert.equal(config.config.mcp_servers.smoke, undefined)
    })
    await check('MCP OAuth: Sign in opens the server\'s page, the bridge takes the redirect and the server connects', async () => {
      // The agent's default callback address; another program holding it makes the check moot here.
      if (!(await portFree(19876))) { console.log(`  [${flavor}] port 19876 busy: OAuth sign-in check skipped`); return }
      const oauth = createOAuthMcp()
      await new Promise((resolve) => oauth.server.listen(0, '127.0.0.1', resolve))
      try {
        const mcpUrl = `http://127.0.0.1:${oauth.server.address().port}/mcp`
        await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.oauthsmoke', value: { url: mcpUrl }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
        await request('config/mcpServer/reload', {}).catch(() => {})
        let status
        for (let attempt = 0; attempt < 40; attempt++) {
          status = (await request('mcpServerStatus/list', { detail: 'statusOnly', threadId })).data.find((server) => server.name === 'oauthsmoke')
          if (status?.authStatus === 'notLoggedIn') break
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
        assert.equal(status?.authStatus, 'notLoggedIn', JSON.stringify(status))
        const from = events.length
        const started = await request('mcpServer/oauth/login', { name: 'oauthsmoke', threadId }, 60000)
        const page = new URL(started.authorizationUrl)
        assert.equal(page.origin, new URL(mcpUrl).origin)
        // The "browser": the consent page redirects to the agent's callback address, which the bridge serves.
        const consent = await fetch(page, { redirect: 'manual' })
        assert.equal(consent.status, 302)
        const back = new URL(consent.headers.get('location'))
        assert.equal(`${back.host}${back.pathname}`, '127.0.0.1:19876/mcp/oauth/callback')
        const landing = await fetch(back)
        assert.equal(landing.status, 200, await landing.clone().text())
        assert.match(await landing.text(), /Signed in to oauthsmoke/)
        const done = await waitFor((event) => events.indexOf(event) >= from && event.method === 'mcpServer/oauthLogin/completed' && event.params.name === 'oauthsmoke', 30000, 'oauthLogin/completed')
        assert.equal(done.params.success, true, done.params.error)
        assert.equal(oauth.state.tokens, 1)
        status = (await request('mcpServerStatus/list', { detail: 'statusOnly', threadId })).data.find((server) => server.name === 'oauthsmoke')
        assert.equal(status?.runtimeStatus, 'connected', JSON.stringify(status))
        // A replayed or forged redirect is refused (the bridge no longer listens).
        await assert.rejects(() => fetch(back))
      } finally {
        await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.oauthsmoke', value: null, mergeStrategy: 'replace' }], reloadUserConfig: true }).catch(() => {})
        oauth.server.close()
        oauth.server.closeAllConnections?.()
      }
    })
    const skillDir = path.join(workspace, `.${flavor === 'mimo' ? 'mimocode' : 'opencode'}`, 'skills', 'smoke-skill')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: smoke-skill\ndescription: SMOKE_SKILL_DESCRIPTION for the parity test\n---\n\nDo the smoke thing.\n')
    await check('skills/list lists project skills and the agent\'s slash commands', async () => {
      await request('config/mcpServer/reload', {})
      const list = await request('skills/list', { cwds: [workspace], forceReload: true })
      const skills = list.data[0].skills
      const skill = skills.find((entry) => entry.name === 'smoke-skill')
      assert.ok(skill, skills.map((entry) => entry.name).join(','))
      assert.equal(skill.enabled, true)
      assert.equal(skill.scope, 'repo')
      assert.ok(skills.some((entry) => entry.path === 'command:init'))
    })
    await check('skills/config/write turns a skill off: it leaves the model request', async () => {
      await runTurn(threadId, 'Skills on check', permissionParams('auto'))
      assert.match(JSON.stringify(lastMain()), /SMOKE_SKILL_DESCRIPTION/)
      const list = await request('skills/list', { cwds: [workspace] })
      const skill = list.data[0].skills.find((entry) => entry.name === 'smoke-skill')
      const written = await request('skills/config/write', { path: skill.path, enabled: false })
      assert.equal(written.effectiveEnabled, false)
      await runTurn(threadId, 'Skills off check', permissionParams('auto'))
      assert.doesNotMatch(JSON.stringify(lastMain()), /SMOKE_SKILL_DESCRIPTION/)
      assert.equal((await request('skills/list', { cwds: [workspace] })).data[0].skills.find((entry) => entry.name === 'smoke-skill').enabled, false)
      await request('skills/config/write', { path: skill.path, enabled: true })
    })
    await check('slash commands: the agent\'s custom command runs from the / menu (skill part command:<name>)', async () => {
      const dir = path.join(workspace, `.${flavor === 'mimo' ? 'mimocode' : 'opencode'}`, 'commands')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'smoke-cmd.md'), '---\ndescription: Smoke command\n---\nCOMMAND_TEMPLATE_RAN with $ARGUMENTS\n')
      const list = await request('skills/list', { cwds: [workspace], forceReload: true })
      // A command the user wrote is listed with its file (the repository's), so the detail can open it.
      const command = list.data[0].skills.find((entry) => entry.name === 'smoke-cmd')
      assert.ok(command, 'command listed')
      assert.equal(fs.realpathSync(command.path), fs.realpathSync(path.join(dir, 'smoke-cmd.md')))
      assert.equal(command.scope, 'repo')
      assert.equal(command.description, 'Smoke command')
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: '/smoke-cmd hello-args', text_elements: [] }, { type: 'skill', name: 'smoke-cmd', path: command.path }], ...permissionParams('auto') })
      await turnDone(threadId, from)
      assert.ok(model.requests.some((body) => JSON.stringify(body.messages).includes('COMMAND_TEMPLATE_RAN with hello-args')))
    })
    await check('plugins: install an OpenCode plugin module, it loads; remove it', async () => {
      const marker = path.join(home, 'plugin-loaded.txt')
      const pluginFile = path.join(home, 'smoke-plugin.js')
      fs.writeFileSync(pluginFile, `import fs from "node:fs"\nexport const Smoke = async () => { fs.writeFileSync(${JSON.stringify(marker)}, "loaded"); return {} }\n`)
      const spec = `file://${pluginFile}`
      await request('codeDesktop/plugin/install', { spec, requestId: 'plugin-1' })
      const installed = await request('plugin/installed', {})
      assert.ok(installed.marketplaces[0].plugins.some((plugin) => plugin.id === spec && plugin.codeDesktop.removable))
      await runTurn(threadId, 'Plugin check', permissionParams('auto'))
      assert.equal(fs.readFileSync(marker, 'utf8'), 'loaded')
      await request('codeDesktop/plugin/remove', { pluginName: spec })
      assert.ok(!(await request('plugin/installed', {})).marketplaces[0].plugins.some((plugin) => plugin.id === spec))
    })

    // ---------------------------------------------------------------- usage, account, extras
    await check('account/usage/read and codeDesktop/stats/read fold the agent\'s real token usage', async () => {
      const usage = await request('account/usage/read', {})
      assert.ok(usage.dailyUsageBuckets.length >= 1)
      assert.ok(usage.summary.lifetimeTokens > 0)
      const stats = await request('codeDesktop/stats/read', {})
      assert.ok(stats.dailyActivity[0].messageCount > 0)
      assert.ok(stats.dailyActivity[0].toolCallCount > 0)
      assert.ok(stats.modelUsage['fake/fake-model'].inputTokens > 0)
    })
    await check('sign-in starts the agent\'s own OAuth (https sign-in page) and can be cancelled', async () => {
      let started
      try { started = await request('account/login/start', { type: 'chatgpt' }, 60000) } catch (error) { started = { error: error.message } }
      if (started.error) assert.match(started.error, /sign-in|oauth|network|fetch|failed/i)
      else {
        assert.match(started.authUrl, /^https:\/\//)
        const cancelled = await request('account/login/cancel', { loginId: started.loginId })
        assert.equal(cancelled.status, 'canceled')
      }
    })
    await check('API-key sign-in stores the key in the agent\'s own auth (provider connected), sign-out removes it', async () => {
      const template = 'deepseek'
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-key', codeDesktop: { template } })
      const account = await request('account/read', { refreshToken: false })
      assert.ok(account[flavor].providers.some((provider) => provider.id === template), JSON.stringify(account[flavor].providers))
      await request('account/logout', { codeDesktop: { provider: template } })
      const after = await request('account/read', { refreshToken: false })
      assert.ok(!after[flavor].providers.some((provider) => provider.id === template))
    })
    await check('sign-out without a provider (the app sends {}) removes every saved credential; Settings › Models keys stay', async () => {
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-a', codeDesktop: { template: 'anthropic' } })
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-o', codeDesktop: { template: 'openrouter' } })
      const before = await request('account/read', { refreshToken: false })
      for (const id of ['anthropic', 'openrouter']) assert.equal(before[flavor].providers.find((provider) => provider.id === id)?.auth, 'api', JSON.stringify(before[flavor].providers))
      await request('account/logout', {})
      const after = await request('account/read', { refreshToken: false })
      assert.ok(!after[flavor].providers.some((provider) => ['anthropic', 'openrouter'].includes(provider.id)), JSON.stringify(after[flavor].providers))
      let auth = {}
      try { auth = JSON.parse(fs.readFileSync(path.join(home, '.local/share', flavor === 'mimo' ? 'mimocode' : 'opencode', 'auth.json'), 'utf8')) } catch {}
      assert.deepEqual(Object.keys(auth), [])
      // The custom provider's key comes from Settings › Models, not from a sign-in.
      assert.equal(after[flavor].providers.find((provider) => provider.id === 'fake')?.auth, 'settings')
      assert.equal(after.account?.type, 'apiKey')
      assert.equal(before[flavor].canSignOut, true)
      assert.equal(after[flavor].canSignOut, false, 'only a Settings › Models key is left: nothing account/logout can remove')
      assert.equal(after[flavor].unknown, false)
      // Signing out again says where the remaining key lives instead of answering as if it were gone.
      await assert.rejects(request('account/logout', {}), /Settings › Models/)
    })
    await check('background terminals: none (OpenCode has no background shell)', async () => {
      const list = await request('thread/backgroundTerminals/list', { threadId, limit: 100 })
      assert.deepEqual(list.data, [])
    })

    // ---------------------------------------------------------------- restart survival + delete
    const turnsBefore = (await request('thread/turns/list', { threadId, limit: 500 })).data.length
    await check('restart: sessions, titles and history survive a core restart', async () => {
      await client.stopAndWait()
      const reinit = await connect()
      assert.equal(reinit.engine, flavor)
      const listed = await request('thread/list', { limit: 100 })
      const row = listed.data.find((thread) => thread.id === threadId)
      assert.equal(row?.name, 'Smoke thread name')
      const read = await request('thread/read', { threadId, includeTurns: true })
      assert.equal(read.thread.turns.length, turnsBefore)
      const resumed = await request('thread/resume', { threadId, ...permissionParams('auto'), excludeTurns: true })
      assert.equal(resumed.thread.id, threadId)
      const turn = await runTurn(threadId, 'After restart hello', permissionParams('auto'))
      assert.equal(turn.completed.params.turn.status, 'completed')
    })
    await check('a turn running when the core stops ends cleanly after restart', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'Interrupted by restart HANG_FOREVER', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      await new Promise((resolve) => setTimeout(resolve, 500))
      await client.stopAndWait()
      model.releaseHangers()
      await connect()
      const read = await request('thread/read', { threadId, includeTurns: true })
      const last = read.thread.turns.at(-1)
      assert.ok(['interrupted', 'failed'].includes(last.status), last.status)
      const turn = await runTurn(threadId, 'Works again PLAIN_AGAIN', permissionParams('auto'))
      assert.equal(turn.completed.params.turn.status, 'completed')
    })
    await check('thread/delete removes the session and the agent\'s own history', async () => {
      await request('thread/delete', { threadId: forkId })
      assert.ok(!(await request('thread/list', { limit: 100 })).data.some((thread) => thread.id === forkId))
      await assert.rejects(() => request('thread/read', { threadId: forkId, includeTurns: true }), /not available/)
      const sessions = fs.readdirSync(path.join(home, '.local/share', flavor === 'mimo' ? 'mimocode' : 'opencode'))
      assert.ok(sessions.length > 0)
    })
  } finally {
    try { await client?.stopAndWait() } catch {}
    model.server.close()
    model.releaseHangers()
    if (!process.env.KEEP_SMOKE_HOME) fs.rmSync(home, { recursive: true, force: true })
  }
  return checks.length
}

let passed = 0
for (const flavor of flavors) {
  try { passed += await runFlavor(flavor) } catch (error) { failures++; console.log(`FAIL [${flavor}] setup: ${error?.stack || error}\n${stderr.join('').slice(-2000)}`) }
}
console.log(`${passed} checks passed${failures ? `, ${failures} failed` : ''} (${total} run)`)
process.exit(failures ? 1 : 0)
