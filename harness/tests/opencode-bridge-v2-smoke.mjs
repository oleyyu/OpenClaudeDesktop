// Parity smoke of the OpenCode core on OpenCode 2.x: the app's real client (app/electron/codex.cjs CodexClient) drives
// harness/packages/opencode-bridge, which runs the REAL `opencode serve` 2.x (the bridge's src/v2 path) against a local
// scripted Anthropic-Messages model server (tests/fixtures/anthropic-scripted.mjs) configured as a Settings › Models
// custom provider. Every home is a temp folder; the user's own OpenCode data, config and database are never touched.
// It is opencode-bridge-smoke.mjs (the 1.x path) redone for 2.x: what 2.x does differently is checked as 2.x does it
// (shell / subagent tools, no share links, no structured output, its own database, a plan card without plan_exit …).
//
// Run it in a normal terminal (it listens on loopback ports and spawns the binary; a sandbox that refuses listen() or
// spawn fails with EPERM):
//
//   cd harness
//   node tests/opencode-bridge-v2-smoke.mjs                       # work/agents/opencode-bridge/opencode/bin/opencode
//   node tests/opencode-bridge-v2-smoke.mjs --binary ~/Downloads/opencode-2.2.5/opencode
//   CODE_DESKTOP_OPENCODE_V2_BINARY=/path/to/opencode node tests/opencode-bridge-v2-smoke.mjs
//   node tests/opencode-bridge-v2-smoke.mjs --only plan,move      # only the checks whose name contains one of these
//
// The binary must report 2.x (`opencode --version`). The release zip (descriptor agent.release, 2.2.5) unpacks to one
// `opencode` executable; macOS may need `xattr -d com.apple.quarantine <it>` first. Exit 0 = every check passed.
// SMOKE_DEBUG=<n> prints the last n client events on a failure; KEEP_SMOKE_HOME=1 keeps the temp home (bridge.log is in
// <home>/state).
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { createAnthropicServer, fakeProviders, newestPrompt, resultsSinceLastPrompt, systemOf, toolNames, userTexts } from './fixtures/anthropic-scripted.mjs'

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
const argValue = (name) => { const index = process.argv.indexOf(name); return index > 0 ? process.argv[index + 1] : undefined }
const binary = path.resolve(argValue('--binary') ?? process.env.CODE_DESKTOP_OPENCODE_V2_BINARY ?? path.join(repo, 'work/agents/opencode-bridge/opencode/bin/opencode'))
const only = (argValue('--only') ?? '').split(',').map((word) => word.trim().toLowerCase()).filter(Boolean)

let total = 0
let failures = 0
let skipped = 0

// ------------------------------------------------------------------ scripted model

function createModel(workspace, home) {
  const mode = { error: null, planned: false }
  const model = createAnthropicServer((body) => {
    const tools = toolNames(body)
    const texts = userTexts(body)
    const last = texts.at(-1) ?? ''
    const done = resultsSinceLastPrompt(body)
    const system = systemOf(body)
    const raw = JSON.stringify(body.messages.at(-1) ?? '')
    // The bridge's side question (POST …/generate: the session's prompt and tools, the question last).
    if (/You answer a side question/.test(raw)) return { text: 'SIDE_ANSWER about the conversation' }
    // Title / summary / compaction helpers (no tools).
    if (!tools.length) {
      if (/summar|compact/i.test(system + last)) return { text: 'Summary of the conversation so far.' }
      return { text: 'Scripted title' }
    }
    if (mode.error) { const status = mode.error; mode.error = null; return { status } }
    const newest = newestPrompt(body) || last
    const at = (name) => newest.includes(name)
    const marker = /\b([A-Z][A-Z_]{3,})\b/.exec(newest)?.[1]
    if (last.includes('SUBAGENT_CHILD')) return { text: 'child finished' }
    if (at('HANG_FOREVER')) return { hang: true }
    if (at('SLOW_REPLY') && done === 0 && !last.includes('STEERED')) return { delay: 2500, text: 'slow done' }
    // 2.x's shell tool: {command, workdir?, timeout?, background?} (no description).
    if (at('RUN_SHELL') && done === 0) return { tool: { name: 'shell', input: { command: 'echo shell-output-1; echo shell-output-2' } } }
    if (at('SHOW_CWD') && done === 0) return { tool: { name: 'shell', input: { command: 'pwd' } } }
    if (at('LIST_REFERENCE') && done === 0) return { tool: { name: 'shell', input: { command: `ls '${path.join(home, 'team-docs')}'` } } }
    if (at('TWO_SHELL') && done < 2) return { tool: { name: 'shell', input: { command: `printf 'step-${done + 1}\\n'` } } }
    if (at('ESCAPE_SANDBOX') && done === 0) return { tool: { name: 'shell', input: { command: `echo escaped > '${path.join(home, 'outside.txt')}'; echo inside > '${path.join(workspace, 'inside.txt')}'; echo exit-$?` } } }
    // 2.x's file tools take `path`.
    if (at('EDIT_FILE')) {
      if (done === 0) return { tool: { name: 'read', input: { path: path.join(workspace, 'hello.txt') } } }
      if (done === 1) return { tool: { name: 'edit', input: { path: path.join(workspace, 'hello.txt'), oldString: 'before', newString: 'after' } } }
    }
    if (at('TWO_WRITES') && done === 0) return { tools: ['one.txt', 'two.txt'].map((name) => ({ name: 'write', input: { path: path.join(workspace, name), content: `${name}\n` } })) }
    if (at('WRITE_FILE') && done === 0) return { tool: { name: 'write', input: { path: path.join(workspace, 'written.txt'), content: 'written by the agent\n' } } }
    if (at('ASK_QUESTION') && done === 0) return { tool: { name: 'question', input: { questions: [{ question: 'Which color?', header: 'Color', options: [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: 'cool' }] }] } } }
    if (at('MAKE_TODOS') && done === 0) return { tool: { name: 'todowrite', input: { todos: [{ content: 'Scripted step one', status: 'in_progress' }, { content: 'Scripted step two', status: 'pending' }] } } }
    if (at('SPAWN_AGENT') && done === 0) return { tool: { name: 'subagent', input: { agent: 'general', description: 'Scripted child', prompt: 'SUBAGENT_CHILD do the work' } } }
    // 2.x has no plan_exit: the plan is the plan agent's answer; Approve queues the bridge's execution prompt.
    if (/plan is approved|implement it now/i.test(last) && !mode.planned && (mode.planned = true)) return { tool: { name: 'write', input: { path: path.join(workspace, 'planned.txt'), content: 'implemented\n' } } }
    if (at('PLAN_NOW') && done === 0) return { text: 'PLAN:\n1. Write planned.txt with "implemented".' }
    if (at('CALL_MCP') && done === 0) {
      const name = tools.find((tool) => /_echo$/.test(tool))
      if (name) return { tool: { name, input: { text: 'from-model' } } }
    }
    if (at('THINK_FIRST')) return { think: 'Let me think about this.', text: 'thought reply' }
    if (at('FAIL_TURN')) return { status: 400 }
    return { text: `plain reply ${marker ?? ''} ${done}`.trim() }
  })
  model.mode = mode
  return model
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

// ------------------------------------------------------------------ the run

async function run() {
  if (!fs.existsSync(binary)) throw new Error(`missing ${binary} (pass --binary <opencode 2.x> or set CODE_DESKTOP_OPENCODE_V2_BINARY)`)
  const reported = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 30000 })
  const version = /(\d+\.\d+\.\d+)/.exec(`${reported.stdout ?? ''}`)?.[1]
  if (!version || Number(version.split('.')[0]) < 2) throw new Error(`${binary} reports ${JSON.stringify((reported.stdout || reported.stderr || String(reported.error ?? '')).trim())}: this smoke needs OpenCode 2.x`)
  console.log(`OpenCode ${version} (${binary})`)
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cd-opencode-v2-smoke-')))
  const workspace = path.join(home, 'workspace')
  const elsewhere = path.join(home, 'elsewhere')
  fs.mkdirSync(workspace, { recursive: true })
  fs.mkdirSync(elsewhere, { recursive: true })
  fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
  spawnSync('git', ['init', '-q'], { cwd: workspace })
  const model = createModel(workspace, home)
  const base = await model.listen()
  const providersFile = path.join(home, 'providers.json')
  fs.writeFileSync(providersFile, JSON.stringify(fakeProviders(base)))
  const mcpScript = path.join(home, 'mcp-echo.cjs')
  fs.writeFileSync(mcpScript, MCP_SERVER)
  // OpenCode `references` in the user's own config: a named local folder outside the workspace.
  fs.mkdirSync(path.join(home, 'team-docs'), { recursive: true })
  fs.writeFileSync(path.join(home, 'team-docs', 'guide.md'), '# Guide\n')
  fs.mkdirSync(path.join(home, '.config', 'opencode'), { recursive: true })
  fs.writeFileSync(path.join(home, '.config', 'opencode', 'opencode.json'), JSON.stringify({ references: { docs: { path: path.join(home, 'team-docs'), description: 'Team docs' } } }))
  // A 1.x auth.json API key: 2.x's fresh database imports it once (v2/db.js importAuthKeys).
  const data = path.join(home, '.local/share')
  fs.mkdirSync(path.join(data, 'opencode'), { recursive: true })
  fs.writeFileSync(path.join(data, 'opencode', 'auth.json'), JSON.stringify({ deepseek: { type: 'api', key: 'sk-imported-smoke' } }), { mode: 0o600 })
  const state = path.join(home, 'state')
  // A stand-in `claude` (the bridge takes an exported OPENCODE_CLAUDE_PATH first, and hands it to serve): it passes the
  // bridge's checks (2.1.311, signed in) but is no Claude Code, so v2's own check (the Agent SDK starting it) fails and
  // reports needs_auth. That runs the whole connect step on a real serve without anyone's Claude account.
  const standInClaude = path.join(home, 'bin', 'claude')
  fs.mkdirSync(path.dirname(standInClaude), { recursive: true })
  fs.writeFileSync(standInClaude, `#!/bin/sh
case "$1" in
  --version) echo '2.1.311 (Claude Code)' ;;
  auth) echo '{"loggedIn":true,"authMethod":"claude.ai","apiProvider":"firstParty","email":"smoke@example.com","subscriptionType":"max"}' ;;
  *) echo 'smoke: a stand-in, not Claude Code' >&2; exit 1 ;;
esac
`, { mode: 0o755 })
  const env = {
    HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: data, XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
    CODE_DESKTOP_AGENT_BINARY: binary, CODE_DESKTOP_AGENT_RUNNER: '', CODE_DESKTOP_AGENT_VERSION: version, CODE_DESKTOP_BRIDGE_STATE: state,
    CODE_DESKTOP_OPENCODE_API: 'v2',
    CODE_DESKTOP_PROVIDERS_FILE: providersFile, CODE_DESKTOP_PROVIDER_KEY_FAKE: 'sk-fake-smoke',
    // 2.x config keys: `model`, and `agents.plan.model` (the plan agent runs its own model).
    CODE_DESKTOP_OPENCODE_CONFIG_EXTRA: JSON.stringify({ model: 'fake/fake-model', agents: { plan: { model: 'fake/fake-plan' } } }),
    OPENCODE_DISABLE_MODELS_FETCH: '1',
    OPENCODE_CLAUDE_PATH: standInClaude,
  }
  const checks = []
  let client
  const events = []
  let waiters = []
  const responders = []
  const check = async (name, fn) => {
    if (only.length && !only.some((word) => name.toLowerCase().includes(word))) { skipped++; return }
    total++
    try { await fn(); checks.push(name); console.log(`PASS ${name}`) } catch (error) {
      failures++
      console.log(`FAIL ${name}\n  ${error?.stack?.split('\n').slice(0, 4).join('\n  ') || error}`)
      if (process.env.SMOKE_DEBUG) console.log(JSON.stringify(model.requests.slice(-3).map((body) => ({ tools: toolNames(body).length, last: userTexts(body).at(-1)?.slice(0, 80), n: body.messages.length }))))
      if (process.env.SMOKE_DEBUG) console.log(events.slice(-Number(process.env.SMOKE_DEBUG)).map((event) => `  ${event.kind === 'request' ? 'REQ ' : ''}${event.method} ${event.params?.threadId?.slice(-6) ?? ''} ${event.params?.turn?.id?.slice(-8) ?? event.params?.turnId?.slice(-8) ?? ''} ${event.params?.turn?.status ?? event.params?.status?.type ?? event.params?.item?.type ?? ''}`).join('\n'))
    }
  }
  const connect = async () => {
    client = new CodexClient({ binary: bridgeScript, env, initializeTimeout: 180000 })
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
  const completedItems = (notes, type) => notes.filter((event) => event.method === 'item/completed' && event.params.item.type === type).map((event) => event.params.item)
  const permissionParams = (mode, extra = {}) => {
    const approvalPolicy = mode === 'bypass' ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request'
    const sandbox = mode === 'plan' ? { type: 'readOnly', networkAccess: false } : mode === 'bypass' ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false, excludeTmpdirEnvVar: true, excludeSlashTmp: true }
    return { approvalPolicy, sandboxPolicy: sandbox, codeDesktop: { permissionMode: mode, afterPlan: 'auto', ...extra } }
  }
  const answer = (match, value, delay = 50) => { const responder = { match, answer: typeof value === 'function' ? value : () => value, delay }; responders.push(responder); return () => responders.splice(responders.indexOf(responder), 1) }
  const isRequest = (method) => (event) => event.kind === 'request' && event.method === method
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  try {
    // ---------------------------------------------------------------- lifecycle, database, capabilities
    let init
    await check('initialize: engine opencode 2.x on the v2 path, its own database, 2.x capabilities', async () => {
      init = await connect()
      assert.equal(init.engine, 'opencode')
      assert.match(init.engineVersion, /^2\.\d+\.\d+/)
      for (const key of ['customization', 'permissionHints', 'systemPromptPreview', 'livePermissions', 'toolSelection', 'codeStats', 'deleteHistory', 'perTokenBilling', 'mcpConfigWrite', 'skillToggle', 'pluginManage', 'moveCwd', 'references', 'sideQuestion']) assert.equal(init.capabilities[key], true, key)
      assert.equal(init.capabilities.structuredOutput, false)
      assert.equal(init.capabilities.threadShare, false)
      assert.deepEqual(init.capabilities.sessionStore, { database: 'opencode-v2' })
      assert.equal(init.capabilities.historyLocation, '~/state/opencode-v2')
      assert.ok(init.configPath.endsWith(path.join('config-v2', 'opencode.json')), init.configPath)
      // The bridge's own database, never OpenCode's default one.
      assert.ok(fs.existsSync(path.join(state, 'opencode-v2', 'opencode.db')), 'no <state>/opencode-v2/opencode.db')
      assert.ok(!fs.existsSync(path.join(data, 'opencode', 'opencode.db')), 'OpenCode\'s own database was created')
      const diagnostics = await request('codeDesktop/diagnostics', {})
      assert.equal(diagnostics.api, 'v2')
      console.log(`  claude: ${JSON.stringify(diagnostics.claude)}`)
    })
    await check('auth.json: its API key was imported once into the new database (v2-import.json, no key in it)', async () => {
      const record = JSON.parse(fs.readFileSync(path.join(state, 'v2-import.json'), 'utf8'))
      assert.doesNotMatch(JSON.stringify(record), /sk-imported-smoke/)
      const account = await request('account/read', { refreshToken: false })
      assert.equal(account.opencode.providers.find((provider) => provider.id === 'deepseek')?.auth, 'api', JSON.stringify(account.opencode.providers))
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
    await check('account/read reports a usable provider account; the free tier is not "signed in"', async () => {
      const account = await request('account/read', { refreshToken: false })
      assert.equal(account.account?.type, 'apiKey')
      assert.equal(account.requiresOpenaiAuth, false)
      assert.ok(account.opencode.providers.some((provider) => provider.id === 'fake'))
      assert.ok(!account.opencode.providers.some((provider) => provider.id === 'opencode' && provider.auth !== 'none'))
      assert.equal(account.opencode.unknown, false)
      const limits = await request('account/rateLimits/read', {})
      assert.equal(limits.rateLimits.primary, null)
    })

    // ---------------------------------------------------------------- customization + streaming
    const custom = { systemPrompt: 'CUSTOM_SYSTEM_PROMPT for {{model}} in {{cwd}}', instructions: 'PROJECT_INSTRUCTIONS_MARKER', modelParams: { 'fake/fake-model': { temperature: 0.37, maxTokens: 777 } } }
    const started = await request('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'on-request', sandbox: 'workspace-write', ...permissionParams('auto', { customization: custom, tools: { disabled: ['webfetch'], disabledServers: [] } }) })
    const threadId = started.thread.id
    await check('thread/start returns a Codex thread attributed to the core (one POST /api/session)', async () => {
      assert.match(threadId, /^ses/)
      assert.equal(started.thread.cliVersion.split(' ')[0], 'opencode')
      assert.equal(started.cwd, workspace)
      assert.equal(started.model, 'fake/fake-model')
      await waitFor((event) => event.method === 'thread/started' && event.params.thread.id === threadId, 5000, 'thread/started')
    })
    let first
    await check('turn/start streams agentMessage deltas and completes the turn (the turn id is the bridge\'s msg_ id)', async () => {
      first = await runTurn(threadId, 'Say hello THINK_FIRST please')
      assert.match(first.started.turn.id, /^msg_/)
      assert.equal(first.notes.find(note('turn/started', threadId)).params.turn.id, first.started.turn.id)
      assert.equal(first.notes.filter(note('item/agentMessage/delta', threadId)).map((event) => event.params.delta).join(''), 'thought reply')
      assert.equal(completedItems(first.notes, 'agentMessage').at(-1).text, 'thought reply')
      assert.equal(first.completed.params.turn.status, 'completed')
      assert.equal(completedItems(first.notes, 'userMessage')[0].content[0].text, 'Say hello THINK_FIRST please')
    })
    await check('reasoning streams as summary text deltas', async () => {
      assert.equal(first.notes.filter(note('item/reasoning/summaryTextDelta', threadId)).map((event) => event.params.delta).join(''), 'Let me think about this.')
      assert.deepEqual(completedItems(first.notes, 'reasoning')[0].summary, ['Let me think about this.'])
    })
    await check('token usage reaches the context ring (thread/tokenUsage/updated with modelContextWindow)', async () => {
      const usage = first.notes.filter(note('thread/tokenUsage/updated', threadId)).at(-1)
      assert.ok(usage, 'no tokenUsage')
      assert.equal(usage.params.tokenUsage.modelContextWindow, 200000)
      assert.ok(usage.params.tokenUsage.last.inputTokens > 0)
      assert.ok(usage.params.tokenUsage.total.totalTokens >= usage.params.tokenUsage.last.totalTokens)
    })
    await check('a custom system prompt replaces the prompt (session.context), project instructions kept', async () => {
      const system = systemOf(lastMain())
      assert.ok(system.includes(`CUSTOM_SYSTEM_PROMPT for fake-model in ${workspace}`), system.slice(0, 300))
      assert.match(system, /PROJECT_INSTRUCTIONS_MARKER/)
      assert.doesNotMatch(system, /You are OpenCode|You are opencode|interactive CLI/i)
    })
    await check('per-model temperature and max tokens reach the request', async () => {
      const body = lastMain()
      assert.equal(body.temperature, 0.37)
      assert.equal(body.max_tokens, 777)
    })
    await check('a tool turned off in the profile is absent from the model request; Code Mode is off (no execute)', async () => {
      const tools = toolNames(lastMain())
      assert.ok(tools.includes('shell'), tools.join(','))
      assert.ok(!tools.includes('webfetch'), tools.join(','))
      assert.ok(!tools.includes('execute'), tools.join(','))
    })
    await check('codeDesktop/systemPrompt/preview returns the prompt the plugin saw', async () => {
      const preview = await request('codeDesktop/systemPrompt/preview', { cwd: workspace, threadId, codeDesktop: { customization: custom } })
      assert.equal(preview.custom, true)
      assert.ok(preview.text.includes(`CUSTOM_SYSTEM_PROMPT for fake-model in ${workspace}`))
      assert.match(preview.text, /PROJECT_INSTRUCTIONS_MARKER/)
      assert.ok(preview.tools.includes('shell'), preview.tools.join(','))
    })

    // ---------------------------------------------------------------- tools in auto mode
    await check('auto: shell runs without a card; its output is on the item', async () => {
      const turn = await runTurn(threadId, 'Please RUN_SHELL now')
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0)
      const item = completedItems(turn.notes, 'commandExecution')[0]
      assert.equal(item.command, 'echo shell-output-1; echo shell-output-2')
      assert.equal(item.status, 'completed')
      assert.match(item.aggregatedOutput ?? '', /shell-output-1\nshell-output-2/)
    })
    await check('auto: shell commands run in the workspace-write sandbox (the wrapper reads $OPENCODE_SESSION_ID)', async () => {
      await runTurn(threadId, 'Now ESCAPE_SANDBOX please')
      assert.equal(fs.existsSync(path.join(home, 'outside.txt')), false, 'outside write must be blocked')
      assert.equal(fs.readFileSync(path.join(workspace, 'inside.txt'), 'utf8'), 'inside\n')
      assert.ok(fs.existsSync(path.join(state, 'runtime', 'sandbox')), 'no runtime/sandbox folder')
    })
    await check('auto: edits apply without a card, as fileChange with a unified diff and turn/diff/updated', async () => {
      const turn = await runTurn(threadId, 'Go EDIT_FILE')
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
      const change = completedItems(turn.notes, 'fileChange')[0]
      assert.equal(change.status, 'completed')
      assert.equal(change.changes[0].path, path.join(workspace, 'hello.txt'))
      assert.match(change.changes[0].diff, /-before\n\+after/)
      assert.ok(turn.notes.some((event) => event.method === 'item/completed' && event.params.item.commandActions?.[0]?.type === 'read'), 'read renders as a file-tool row')
      assert.match(turn.notes.filter(note('turn/diff/updated', threadId)).at(-1)?.params.diff ?? '', /\+after/)
    })
    await check('developerInstructions (workflow runner agents) reach the system prompt of their thread only', async () => {
      const dev = await request('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'read-only', developerInstructions: 'DEV_INSTRUCTIONS_MARKER answer tersely' })
      await runTurn(dev.thread.id, 'Developer check please')
      assert.match(systemOf(lastMain()), /DEV_INSTRUCTIONS_MARKER/)
    })

    // ---------------------------------------------------------------- approvals per permission mode
    const setMode = (mode, extra) => request('codeDesktop/thread/permissions', { threadId, ...permissionParams(mode, extra) })
    await check('ask: shell asks with a command card; accept runs it', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'accept' })
      const turn = await runTurn(threadId, 'Ask mode RUN_SHELL', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/commandExecution/requestApproval'))[0]
      assert.ok(card, 'no approval card')
      assert.equal(card.params.threadId, threadId)
      assert.match(card.params.command ?? '', /shell-output-1/)
      const item = completedItems(turn.notes, 'commandExecution')[0]
      assert.equal(item.status, 'completed')
      assert.ok(turn.notes.some((event) => event.method === 'thread/status/changed' && event.params.status?.activeFlags?.includes('waitingOnApproval')))
    })
    await check('ask: a plain Deny stops the agent (an interrupt, not a reject without a message), the call shows declined', async () => {
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline' })
      const before = model.requests.length
      const turn = await runTurn(fresh, 'Deny stops RUN_SHELL', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/commandExecution/requestApproval'))[0]
      assert.ok(card, 'no approval card')
      assert.equal(card.params.codeDesktop?.declineFeedback, true)
      const after = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1)
      assert.equal(after.length, 1, `the agent kept going after a plain Deny (${after.length} model calls)`)
      const item = completedItems(turn.notes, 'commandExecution')[0]
      assert.equal(item?.status, 'declined', JSON.stringify(item))
      // A later turn of the same thread still works (no claim left behind by a shutdown-style reject).
      const next = await runTurn(fresh, 'After deny PLAIN_AFTER', permissionParams('ask'))
      assert.equal(next.completed.params.turn.status, 'completed')
    })
    await check('ask: Deny with feedback is a reject with the message the agent continues from', async () => {
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline', codeDesktop: { feedback: 'Use the staging script instead.' } })
      const before = model.requests.length
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      const turn = await runTurn(fresh, 'Deny with note RUN_SHELL', permissionParams('ask'))
      off()
      const after = model.requests.slice(before).filter((body) => (body.tools ?? []).length > 1)
      assert.ok(after.length >= 2, 'the agent did not continue after the correction')
      assert.match(JSON.stringify(after.at(-1).messages.slice(-2)), /Use the staging script instead\./)
      assert.equal(turn.completed.params.turn.status, 'completed')
    })
    await check('references: listed for the @ menu; Auto reads a reference folder without an outside-the-workspace card', async () => {
      const listed = await request('codeDesktop/references/list', { cwd: workspace })
      assert.deepEqual(listed.data.map((entry) => [entry.name, entry.path, entry.description]), [['docs', path.join(home, 'team-docs'), 'Team docs']])
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('auto') })).thread.id
      const turn = await runTurn(fresh, 'Auto LIST_REFERENCE', permissionParams('auto'))
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0, 'a card asked for the reference folder')
      assert.match(completedItems(turn.notes, 'commandExecution')[0]?.aggregatedOutput ?? '', /guide\.md/)
    })
    await check('ask: edits ask with a file-change card showing the diff', async () => {
      fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
      const off = answer(isRequest('item/fileChange/requestApproval'), { decision: 'accept' })
      const turn = await runTurn(threadId, 'Ask EDIT_FILE', permissionParams('ask'))
      off()
      const card = since(turn.from, isRequest('item/fileChange/requestApproval'))[0]
      assert.ok(card, 'no file card')
      assert.match(JSON.stringify(card.params.changes ?? card.params), /after/)
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
    })
    await check('acceptEdits: edits apply without a card, commands still ask', async () => {
      fs.writeFileSync(path.join(workspace, 'hello.txt'), 'before\n')
      await setMode('acceptEdits')
      const editTurn = await runTurn(threadId, 'AcceptEdits EDIT_FILE', permissionParams('acceptEdits'))
      assert.equal(since(editTurn.from, (event) => event.kind === 'request').length, 0)
      assert.equal(fs.readFileSync(path.join(workspace, 'hello.txt'), 'utf8'), 'after\n')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'accept' })
      const shellTurn = await runTurn(threadId, 'AcceptEdits RUN_SHELL', permissionParams('acceptEdits'))
      off()
      assert.equal(since(shellTurn.from, isRequest('item/commandExecution/requestApproval')).length, 1)
    })
    await check('ask: "allow for this session" stops asking for the same command (the bridge\'s grant, never v2\'s always)', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'acceptForSession' })
      const one = await runTurn(threadId, 'Session grant RUN_SHELL', permissionParams('ask'))
      const two = await runTurn(threadId, 'Session grant again RUN_SHELL', permissionParams('ask'))
      off()
      assert.equal(since(one.from, isRequest('item/commandExecution/requestApproval')).length, 1)
      assert.equal(since(two.from, isRequest('item/commandExecution/requestApproval')).length, 0)
      // Another session still asks.
      const other = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      const offOther = answer(isRequest('item/commandExecution/requestApproval'), { decision: 'decline', codeDesktop: { feedback: 'no' } })
      const three = await runTurn(other, 'Other session RUN_SHELL', permissionParams('ask'))
      offOther()
      assert.equal(since(three.from, isRequest('item/commandExecution/requestApproval')).length, 1)
    })
    await check('ask: two parallel edits ask together; Deny with a note on one also settles the other card (v2 rejects the session\'s asks)', async () => {
      const files = ['one.txt', 'two.txt'].map((name) => path.join(workspace, name))
      for (const file of files) fs.rmSync(file, { force: true })
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('ask') })).thread.id
      let seen = 0
      const off = answer((event) => isRequest('item/fileChange/requestApproval')(event) && event.params.threadId === fresh && seen++ === 0, { decision: 'decline', codeDesktop: { feedback: 'Not these files.' } }, 1500)
      const turn = await runTurn(fresh, 'Parallel TWO_WRITES', permissionParams('ask'))
      off()
      const cards = since(turn.from, isRequest('item/fileChange/requestApproval'))
      assert.ok(cards.length >= 1 && cards.length <= 2, `cards: ${cards.length}`)
      const withdrawn = since(turn.from, (event) => event.kind === 'resolved').map((event) => event.id)
      if (cards.length === 2) assert.ok(withdrawn.includes(cards[1].id), `the second card was not withdrawn: ${JSON.stringify({ cards: cards.map((card) => card.id), withdrawn })}`)
      for (const file of files) assert.ok(!fs.existsSync(file), `${path.basename(file)} was written`)
    })
    await check('livePermissions: switching to Bypass mid-turn applies to the next call', async () => {
      await setMode('ask')
      const off = answer(isRequest('item/commandExecution/requestApproval'), () => { void setMode('bypass'); return { decision: 'accept' } }, 300)
      const turn = await runTurn(threadId, 'Live TWO_SHELL', permissionParams('ask'))
      off()
      assert.equal(since(turn.from, isRequest('item/commandExecution/requestApproval')).length, 1)
      assert.equal(completedItems(turn.notes, 'commandExecution').length, 2)
    })
    await check('bypass: no cards and no sandbox (writes anywhere)', async () => {
      await setMode('bypass')
      const turn = await runTurn(threadId, 'Bypass ESCAPE_SANDBOX', permissionParams('bypass'))
      assert.equal(since(turn.from, (event) => event.kind === 'request').length, 0)
      assert.equal(fs.readFileSync(path.join(home, 'outside.txt'), 'utf8'), 'escaped\n')
      fs.rmSync(path.join(home, 'outside.txt'))
    })
    await check('plan: the plan agent (its own model) answers, the plan card follows turn/completed, Approve implements in a new turn', async () => {
      await setMode('plan')
      const off = answer(isRequest('item/tool/requestUserInput'), () => ({ answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'acceptEdits' } }))
      const turn = await runTurn(threadId, 'Make a plan PLAN_NOW', permissionParams('plan'))
      const planRequest = model.requests.filter((body) => (body.tools ?? []).length > 1 && JSON.stringify(body.messages).includes('PLAN_NOW')).at(-1)
      assert.equal(planRequest?.model, 'fake-plan', 'the plan agent ran on agents.plan.model')
      assert.ok(turn.notes.some((event) => event.method === 'item/completed' && event.params.item.type === 'plan'), 'no plan item')
      const card = await waitFor((event) => events.indexOf(event) >= turn.from && isRequest('item/tool/requestUserInput')(event), 30000, 'plan card')
      assert.equal(card.params.questions[0].id, 'plan-review')
      assert.ok(events.indexOf(card) > events.indexOf(turn.completed), 'the plan card came before turn/completed')
      const next = await waitFor((event) => events.indexOf(event) > events.indexOf(card) && event.method === 'turn/started' && event.params.threadId === threadId, 30000, 'the implementation turn')
      await turnDone(threadId, events.indexOf(next), 90000)
      off()
      assert.equal(fs.readFileSync(path.join(workspace, 'planned.txt'), 'utf8'), 'implemented\n')
    })
    await setMode('auto')
    await check('question tool → item/tool/requestUserInput (a v2 form), the answer reaches the model', async () => {
      const off = answer(isRequest('item/tool/requestUserInput'), (event) => ({ answers: { [event.params.questions[0].id]: { answers: ['Blue'] } } }))
      const turn = await runTurn(threadId, 'Please ASK_QUESTION', permissionParams('auto'))
      off()
      const card = since(turn.from, isRequest('item/tool/requestUserInput'))[0]
      assert.equal(card.params.questions[0].question, 'Which color?')
      assert.deepEqual(card.params.questions[0].options.map((option) => option.label), ['Red', 'Blue'])
      assert.match(JSON.stringify(lastMain().messages.at(-1)), /Blue/)
    })
    await check('todowrite (experimental.todo on) → turn/plan/updated checklist', async () => {
      const turn = await runTurn(threadId, 'Please MAKE_TODOS', permissionParams('auto'))
      const plan = turn.notes.filter(note('turn/plan/updated', threadId)).at(-1)
      assert.ok(plan, 'no plan update')
      assert.match(plan.params.plan[0].step, /Scripted step one/)
    })
    await check('subagent → spawned thread (parentThreadId) with its own turn and items; collab item on the parent', async () => {
      const turn = await runTurn(threadId, 'Please SPAWN_AGENT', permissionParams('auto'))
      const spawned = turn.notes.find((event) => event.method === 'thread/started' && event.params.thread.parentThreadId === threadId)
      assert.ok(spawned, 'no spawned thread')
      const childId = spawned.params.thread.id
      assert.ok(turn.notes.some((event) => event.method === 'item/completed' && event.params.threadId === childId && event.params.item.type === 'agentMessage' && event.params.item.text === 'child finished'))
      const collab = turn.notes.filter((event) => event.method === 'item/completed' && event.params.threadId === threadId && event.params.item.type === 'collabAgentToolCall').at(-1)
      assert.ok(collab, 'no collab item')
      assert.deepEqual(collab.params.item.receiverThreadIds, [childId])
      const child = await request('thread/read', { threadId: childId, includeTurns: true })
      assert.equal(child.thread.parentThreadId, threadId)
    })

    // ---------------------------------------------------------------- turns: steer, interrupt, queue, structured, attachments
    await check('turn/steer is delivered into the running turn and reaches the model', async () => {
      const from = events.length
      const startedTurn = await request('turn/start', { threadId, input: [{ type: 'text', text: 'Take time SLOW_REPLY', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      const steered = await request('turn/steer', { threadId, expectedTurnId: startedTurn.turn.id, input: [{ type: 'text', text: 'STEERED extra detail', text_elements: [] }] })
      assert.equal(steered.turnId, startedTurn.turn.id)
      await turnDone(threadId, from)
      await sleep(500)
      const users = since(from, (event) => event.method === 'item/completed' && event.params.threadId === threadId && event.params.item.type === 'userMessage')
      assert.ok(model.requests.some((body) => JSON.stringify(body.messages).includes('STEERED extra detail')))
      assert.ok(users.some((event) => JSON.stringify(event.params.item.content).includes('STEERED')), 'the steer has no item')
    })
    await check('turn/interrupt stops a running turn (status interrupted, POST …/interrupt)', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'Never ends HANG_FOREVER', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      await sleep(800)
      await request('turn/interrupt', { threadId })
      const completed = await turnDone(threadId, from, 30000)
      assert.equal(completed.params.turn.status, 'interrupted')
      model.releaseHangers()
      const next = await runTurn(threadId, 'After interrupt PLAIN_AGAIN', permissionParams('auto'))
      assert.equal(next.completed.params.turn.status, 'completed')
    })
    await check('queued messages wait for the running turn, then start their own turn', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'First SLOW_REPLY', text_elements: [] }], ...permissionParams('auto') })
      const queued = await request('thread/queue/add', { threadId, input: [{ type: 'text', text: 'QUEUED_ONE follow-up', text_elements: [] }], clientUserMessageId: 'client-1' })
      assert.equal(queued.queuedSubmission.clientUserMessageId, 'client-1')
      await turnDone(threadId, from)
      const second = await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId && events.filter((other, index) => index >= from && other.method === 'turn/started' && other.params.threadId === threadId).length >= 2, 30000, 'second turn')
      await turnDone(threadId, events.indexOf(second))
      assert.ok(model.requests.some((body) => userTexts(body).at(-1)?.includes('QUEUED_ONE')))
      assert.equal((await request('thread/queue/list', { threadId })).data.length, 0)
    })
    await check('structured output: turn/start with outputSchema is refused on 2.x (invalid params), nothing sent', async () => {
      const before = model.requests.length
      await assert.rejects(request('turn/start', { threadId, input: [{ type: 'text', text: 'Answer STRUCTURED', text_elements: [] }], outputSchema: { type: 'object', properties: { answer: { type: 'string' } } }, ...permissionParams('auto') }), /structured output/)
      await sleep(500)
      assert.equal(model.requests.length, before)
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
      assert.match(raw, /MENTIONED_FILE_CONTENT|notes\.md/)
      const user = since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'userMessage' && JSON.stringify(event.params.item.content).includes('ATTACHMENTS'))[0].params.item
      assert.ok(user.content.some((part) => part.type === 'localImage'), JSON.stringify(user).slice(0, 600))
    })
    await check('a model error fails the turn with the error (turn/completed failed + error notification)', async () => {
      const turn = await runTurn(threadId, 'Please FAIL_TURN', permissionParams('auto'))
      assert.equal(turn.completed.params.turn.status, 'failed')
      assert.ok(turn.notes.some((event) => event.method === 'error' && event.params.threadId === threadId && event.params.willRetry === false))
    })

    // ---------------------------------------------------------------- session actions
    await check('/btw side question answers from the thread without entering it (…/generate: one delta)', async () => {
      const before = (await request('thread/turns/list', { threadId, limit: 200 })).data.length
      const from = events.length
      const result = await request('codeDesktop/sideQuestion', { threadId, question: 'What did we do so far?', history: [], requestId: 'side-1' }, 180000)
      assert.match(result.text, /SIDE_ANSWER/)
      assert.match(since(from, (event) => event.method === 'codeDesktop/sideQuestion/delta' && event.params.requestId === 'side-1').map((event) => event.params.text).join(''), /SIDE_ANSWER/)
      assert.equal((await request('thread/turns/list', { threadId, limit: 200 })).data.length, before)
      const listed = await request('thread/list', { limit: 200 })
      assert.ok(!listed.data.some((thread) => thread.id !== threadId && thread.forkedFromId === threadId))
    })
    await check('thread/compact/start runs a compaction turn (contextCompaction item)', async () => {
      const from = events.length
      await request('thread/compact/start', { threadId })
      const completed = await turnDone(threadId, from, 120000)
      assert.equal(completed.params.turn.status, 'completed')
      assert.ok(since(from, (event) => event.method === 'item/started' && event.params.item.type === 'contextCompaction').length >= 1)
    })
    let forkId
    await check('thread/fork copies history through a turn into a new thread (…/fork {before})', async () => {
      const turns = (await request('thread/turns/list', { threadId, limit: 200, sortDirection: 'asc' })).data
      const forked = await request('thread/fork', { threadId, lastTurnId: turns[1].id, ...permissionParams('auto'), excludeTurns: true })
      forkId = forked.thread.id
      assert.notEqual(forkId, threadId)
      assert.equal(forked.thread.forkedFromId, threadId)
      assert.equal((await request('thread/turns/list', { threadId: forkId, limit: 200 })).data.length, 2)
    })
    await check('thread/revert (rewind) removes a turn and every later one (…/revert/stage + commit)', async () => {
      const turns = (await request('thread/turns/list', { threadId: forkId, limit: 200, sortDirection: 'asc' })).data
      const reverted = await request('thread/revert', { threadId: forkId, beforeTurnId: turns[1].id })
      assert.equal(reverted.thread.id, forkId)
      const after = (await request('thread/turns/list', { threadId: forkId, limit: 200 })).data
      assert.equal(after.length, 1)
      assert.equal(after[0].id, turns[0].id)
    })
    await check('review/start runs 2.2.5\'s review prompt as an inline review turn', async () => {
      const from = events.length
      const review = await request('review/start', { threadId, target: { type: 'uncommittedChanges' }, delivery: 'inline' })
      assert.equal(review.reviewThreadId, threadId)
      const completed = await turnDone(threadId, from, 120000)
      assert.equal(completed.params.turn.id, review.turn.id)
      assert.equal(since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'enteredReviewMode').length, 1)
      assert.equal(since(from, (event) => event.method === 'item/completed' && event.params.item.type === 'exitedReviewMode').length, 1)
    })
    await check('rename, archive / unarchive and list (search, archived filter)', async () => {
      await request('thread/name/set', { threadId, name: 'Smoke thread name' })
      await waitFor((event) => event.method === 'thread/name/updated' && event.params.threadId === threadId && event.params.threadName === 'Smoke thread name', 5000, 'name updated')
      const row = (await request('thread/list', { limit: 50, cwd: workspace })).data.find((thread) => thread.id === threadId)
      assert.equal(row?.name, 'Smoke thread name')
      assert.ok((await request('thread/list', { limit: 50, searchTerm: 'Smoke thread' })).data.some((thread) => thread.id === threadId))
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
    })
    await check('share links: codeDesktop/thread/share is not offered on 2.x (METHOD_NOT_FOUND)', async () => {
      await assert.rejects(request('codeDesktop/thread/share', { threadId, enabled: true }), /share/i)
    })
    await check('/cd: codeDesktop/thread/move moves the session (…/move), the next command runs in the new folder', async () => {
      const moving = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('auto') })).thread.id
      await runTurn(moving, 'Before the move PLAIN_BEFORE', permissionParams('auto'))
      assert.deepEqual(await request('codeDesktop/thread/move', { threadId: moving, check: true }), { changes: 0 })
      const moved = await request('codeDesktop/thread/move', { threadId: moving, cwd: elsewhere, moveChanges: false }, 60000)
      assert.equal(moved.moved, true)
      assert.equal(moved.thread.cwd, elsewhere)
      const turn = await runTurn(moving, 'Where now SHOW_CWD', permissionParams('auto'))
      assert.match(completedItems(turn.notes, 'commandExecution')[0]?.aggregatedOutput ?? '', new RegExp(path.basename(elsewhere)))
    })

    // ---------------------------------------------------------------- MCP, tools, skills, plugins
    await check('MCP: add a stdio server (config/batchWrite), status lists it connected with its tools', async () => {
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.smoke', value: { command: process.execPath, args: [mcpScript] }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
      await request('config/mcpServer/reload', {})
      const config = await request('config/read', { includeLayers: false, cwd: workspace })
      assert.equal(config.config.mcp_servers.smoke.command, process.execPath)
      let status
      for (let attempt = 0; attempt < 60; attempt++) {
        status = (await request('mcpServerStatus/list', { detail: 'toolsAndAuthOnly', threadId })).data.find((server) => server.name === 'smoke')
        if (status?.runtimeStatus === 'connected' && status.tools.echo) break
        await sleep(500)
      }
      assert.equal(status?.runtimeStatus, 'connected', JSON.stringify(status))
      assert.ok(status.tools.echo)
    })
    await check('MCP: a connector turns off and back on (the plugin\'s mcp.transform)', async () => {
      const statusOf = async () => (await request('mcpServerStatus/list', { detail: 'statusOnly', threadId })).data.find((server) => server.name === 'smoke')
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers."smoke".enabled', value: false, mergeStrategy: 'replace' }], reloadUserConfig: true })
      let status
      for (let attempt = 0; attempt < 60 && (status = await statusOf())?.runtimeStatus !== 'disabled'; attempt++) await sleep(250)
      assert.equal(status?.runtimeStatus, 'disabled')
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers."smoke".enabled', value: true, mergeStrategy: 'replace' }], reloadUserConfig: true })
      await request('config/mcpServer/reload', {})
      for (let attempt = 0; attempt < 60 && (status = await statusOf())?.runtimeStatus !== 'connected'; attempt++) await sleep(250)
      assert.equal(status?.runtimeStatus, 'connected')
    })
    await check('MCP tool call (a direct tool: Code Mode off) renders as mcpToolCall with its result', async () => {
      const turn = await runTurn(threadId, 'Use it CALL_MCP', permissionParams('auto', { tools: null }))
      const item = completedItems(turn.notes, 'mcpToolCall')[0]
      assert.ok(item, `no mcp item; tools: ${toolNames(lastMain()).join(',')}`)
      assert.equal(item.server, 'smoke')
      assert.equal(item.tool, 'echo')
      assert.equal(item.status, 'completed')
      assert.match(JSON.stringify(item.result), /echo:from-model/)
    })
    await check('codeDesktop/tools/list lists 2.2.5\'s built-ins and the MCP server\'s tools', async () => {
      const list = await request('codeDesktop/tools/list', { threadId })
      for (const name of ['shell', 'edit', 'read', 'subagent']) assert.ok(list.tools.some((tool) => tool.name === name), name)
      for (const name of ['list', 'lsp', 'codesearch', 'todoread']) assert.ok(!list.tools.some((tool) => tool.name === name), name)
      assert.equal(list.servers.find((server) => server.name === 'smoke')?.tools[0]?.name, 'smoke_echo')
    })
    await check('turning an MCP server off for the session removes its tools from the model request', async () => {
      await runTurn(threadId, 'No mcp now please', permissionParams('auto', { tools: { disabled: [], disabledServers: ['smoke'] } }))
      const tools = toolNames(lastMain())
      assert.ok(!tools.includes('smoke_echo'), tools.join(','))
      assert.ok(tools.includes('shell'))
    })
    await check('MCP: removing the server (config/batchWrite null) drops it from config', async () => {
      await request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.smoke', value: null, mergeStrategy: 'replace' }], reloadUserConfig: true })
      assert.equal((await request('config/read', { includeLayers: false, cwd: workspace })).config.mcp_servers.smoke, undefined)
    })
    const skillDir = path.join(workspace, '.opencode', 'skills', 'smoke-skill')
    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: smoke-skill\ndescription: SMOKE_SKILL_DESCRIPTION for the parity test\n---\n\nDo the smoke thing.\n')
    await check('skills/list lists project skills by id', async () => {
      const list = await request('skills/list', { cwds: [workspace], forceReload: true })
      const skill = list.data[0].skills.find((entry) => entry.name === 'smoke-skill')
      assert.ok(skill, list.data[0].skills.map((entry) => entry.name).join(','))
      assert.equal(skill.enabled, true)
      assert.equal(skill.scope, 'repo')
    })
    await check('skills/config/write turns a skill off: it leaves the model request (deny by name and id)', async () => {
      await runTurn(threadId, 'Skills on check', permissionParams('auto'))
      assert.match(JSON.stringify(lastMain()), /SMOKE_SKILL_DESCRIPTION/)
      const skill = (await request('skills/list', { cwds: [workspace] })).data[0].skills.find((entry) => entry.name === 'smoke-skill')
      assert.equal((await request('skills/config/write', { path: skill.path, enabled: false })).effectiveEnabled, false)
      // v2 freezes a skill list change into the session's history (skill/instructions.ts, session/instruction-state.ts):
      // the update that added the skill stays in this session's requests, and turning it off appends a removal by id.
      await runTurn(threadId, 'Skills off check', permissionParams('auto'))
      assert.match(JSON.stringify(lastMain()), /no longer available and must not be used: [^"]*\bsmoke-skill\b/)
      // A session started now is never offered it.
      const fresh = (await request('thread/start', { cwd: workspace, model: modelId, ...permissionParams('auto') })).thread.id
      await runTurn(fresh, 'Skills off fresh check', permissionParams('auto'))
      assert.doesNotMatch(JSON.stringify(lastMain()), /SMOKE_SKILL_DESCRIPTION/)
      await request('skills/config/write', { path: skill.path, enabled: true })
    })
    await check('slash commands: a custom command runs from the / menu (POST …/command)', async () => {
      const dir = path.join(workspace, '.opencode', 'commands')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'smoke-cmd.md'), '---\ndescription: Smoke command\n---\nCOMMAND_TEMPLATE_RAN with $ARGUMENTS\n')
      const list = await request('skills/list', { cwds: [workspace], forceReload: true })
      const command = list.data[0].skills.find((entry) => entry.name === 'smoke-cmd')
      assert.ok(command, 'command listed')
      assert.equal(command.description, 'Smoke command')
      assert.ok(!list.data[0].skills.some((entry) => entry.name === 'goal'), '/goal is not offered')
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: '/smoke-cmd hello-args', text_elements: [] }, { type: 'skill', name: 'smoke-cmd', path: command.path }], ...permissionParams('auto') })
      await turnDone(threadId, from)
      assert.ok(model.requests.some((body) => JSON.stringify(body.messages).includes('COMMAND_TEMPLATE_RAN with hello-args')))
    })
    await check('plugins: a 2.x plugin folder ({id, setup}) installs and loads; a 1.x module is reported incompatible', async () => {
      const marker = path.join(home, 'plugin-loaded.txt')
      const folder = path.join(home, 'smoke-plugin')
      fs.mkdirSync(folder, { recursive: true })
      fs.writeFileSync(path.join(folder, 'index.js'), `import fs from "node:fs"\nexport default { id: "smoke-plugin", setup: async () => { fs.writeFileSync(${JSON.stringify(marker)}, "loaded") } }\n`)
      const installed = await request('codeDesktop/plugin/install', { spec: folder, requestId: 'plugin-1' }, 90000)
      assert.equal(installed.application, 'applied', JSON.stringify(installed))
      const listed = (await request('plugin/installed', {})).marketplaces[0].plugins
      assert.ok(listed.some((plugin) => plugin.id === folder || plugin.name === 'smoke-plugin'), JSON.stringify(listed.map((plugin) => plugin.id)))
      for (let attempt = 0; attempt < 40 && !fs.existsSync(marker); attempt++) await sleep(250)
      assert.equal(fs.readFileSync(marker, 'utf8'), 'loaded')
      await request('codeDesktop/plugin/remove', { pluginName: folder })
      const old = path.join(home, 'old-plugin')
      fs.mkdirSync(old, { recursive: true })
      fs.writeFileSync(path.join(old, 'index.js'), 'export const Old = async () => ({})\n')
      const refused = await request('codeDesktop/plugin/install', { spec: old, requestId: 'plugin-2' }, 90000)
      const after = (await request('plugin/installed', {})).marketplaces[0].plugins.find((plugin) => plugin.id === old)
      assert.ok(refused.application === 'failed' || after?.codeDesktop?.incompatible, JSON.stringify({ refused, after }))
      await request('codeDesktop/plugin/remove', { pluginName: old }).catch(() => {})
    })

    // ---------------------------------------------------------------- usage, account
    await check('account/usage/read and codeDesktop/stats/read fold the real token usage (checked against v2 stats)', async () => {
      const usage = await request('account/usage/read', {})
      assert.ok(usage.dailyUsageBuckets.length >= 1)
      assert.ok(usage.summary.lifetimeTokens > 0)
      const stats = await request('codeDesktop/stats/read', {})
      assert.ok(stats.dailyActivity[0].messageCount > 0)
      assert.ok(stats.modelUsage['fake/fake-model'].inputTokens > 0)
      const diagnostics = await request('codeDesktop/diagnostics', {}).catch(() => null)
      if (diagnostics?.usageCheck) console.log(`  usageCheck: ${JSON.stringify(diagnostics.usageCheck).slice(0, 300)}`)
    })
    await check('ChatGPT sign-in starts token sharing (a browser page) and can be cancelled', async () => {
      let started
      try { started = await request('account/login/start', { type: 'chatgpt' }, 60000) } catch (error) { started = { error: error.message } }
      if (started.error) assert.match(started.error, /sign-in|oauth|network|fetch|failed|ChatGPT/i)
      else {
        assert.match(started.authUrl, /^https?:\/\//)
        assert.equal((await request('account/login/cancel', { loginId: started.loginId })).status, 'canceled')
      }
    })
    await check('API-key sign-in replaces the integration\'s key (connect/key, older deleted); sign-out removes it', async () => {
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-key', codeDesktop: { template: 'deepseek' } })
      const account = await request('account/read', { refreshToken: false })
      assert.equal(account.opencode.providers.filter((provider) => provider.id === 'deepseek').length, 1, JSON.stringify(account.opencode.providers))
      await request('account/logout', { codeDesktop: { provider: 'deepseek' } })
      assert.ok(!(await request('account/read', { refreshToken: false })).opencode.providers.some((provider) => provider.id === 'deepseek' && provider.auth === 'api'))
    })
    await check('sign-out without a provider removes every saved credential; Settings › Models keys stay', async () => {
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-a', codeDesktop: { template: 'anthropic' } })
      await request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke-o', codeDesktop: { template: 'openrouter' } })
      const before = await request('account/read', { refreshToken: false })
      for (const id of ['anthropic', 'openrouter']) assert.equal(before.opencode.providers.find((provider) => provider.id === id)?.auth, 'api', JSON.stringify(before.opencode.providers))
      await request('account/logout', {})
      const after = await request('account/read', { refreshToken: false })
      assert.ok(!after.opencode.providers.some((provider) => ['anthropic', 'openrouter'].includes(provider.id) && provider.auth === 'api'), JSON.stringify(after.opencode.providers))
      assert.equal(after.opencode.providers.find((provider) => provider.id === 'fake')?.auth, 'settings')
      assert.equal(after.account?.type, 'apiKey')
    })
    await check('Claude (claude-agent) sign-in with a stand-in claude: connect/external finds v2\'s integration, v2\'s own check reports needs_auth, sign-out removes it', async () => {
      // Live round 2: the first connect/external of a fresh serve answered 404 "Integration not found: claude-agent"
      // (…/:id and connect/* don't wait for the location's plugins). The bridge lists first; this runs it for real.
      const from = events.length
      const started = await request('account/login/start', { type: 'chatgpt', codeDesktop: { provider: 'claude-agent' } }, 60000)
      assert.equal(started.codeDesktop?.openedByAgent, true, JSON.stringify(started))
      const done = await waitFor((event) => events.indexOf(event) >= from && event.method === 'account/login/completed' && event.params?.loginId === started.loginId, 150000, 'account/login/completed (claude-agent)')
      console.log(`  claude-agent: ${JSON.stringify(done.params).slice(0, 300)}`)
      assert.equal(done.params.success, false)
      // v2's status message, not one of the bridge's own (connect refused or 404, the integration missing, no answer in 120 s).
      assert.doesNotMatch(String(done.params.error), /couldn’t connect Claude Code|missing or turned off|Couldn’t confirm/)
      const account = await request('account/read', { refreshToken: false })
      const claude = account.opencode.providers.find((provider) => provider.id === 'claude-agent')
      assert.equal(claude?.auth, 'external', JSON.stringify(account.opencode.providers))
      assert.equal(claude?.needsAuth, true)
      assert.ok(claude.statusMessage, 'v2\'s needs_auth message')
      const out = await request('account/logout', { codeDesktop: { provider: 'claude-agent' } })
      assert.match(out.codeDesktop?.notice ?? '', /claude auth logout/)
      assert.ok(!(await request('account/read', { refreshToken: false })).opencode.providers.some((provider) => provider.id === 'claude-agent'))
    })

    // ---------------------------------------------------------------- restart survival + delete
    const turnsBefore = (await request('thread/turns/list', { threadId, limit: 500 })).data.length
    await check('restart: sessions, titles and history survive a core restart (same database; first-start lock skipped)', async () => {
      await client.stopAndWait()
      assert.ok(fs.existsSync(path.join(state, 'opencode-v2', 'ready.json')), 'no ready.json')
      // A thread from OpenCode 1.x (no engine marker), as threads.json keeps it after the switch: hidden on 2.x.
      const index = JSON.parse(fs.readFileSync(path.join(state, 'threads.json'), 'utf8'))
      assert.equal(index[threadId]?.engine, 'v2', 'no engine:v2 marker')
      index.ses_legacy1x = { cwd: workspace, preview: 'A 1.x thread', lastActivity: Date.now() }
      fs.writeFileSync(path.join(state, 'threads.json'), JSON.stringify(index))
      const reinit = await connect()
      assert.equal(reinit.engine, 'opencode')
      const row = (await request('thread/list', { limit: 100 })).data.find((thread) => thread.id === threadId)
      assert.equal(row?.name, 'Smoke thread name')
      assert.equal((await request('thread/read', { threadId, includeTurns: true })).thread.turns.length, turnsBefore)
      const resumed = await request('thread/resume', { threadId, ...permissionParams('auto'), excludeTurns: true })
      assert.equal(resumed.thread.id, threadId)
      assert.equal((await runTurn(threadId, 'After restart hello', permissionParams('auto'))).completed.params.turn.status, 'completed')
    })
    await check('a turn running when the core stops ends cleanly after restart (interrupt before stdin closes)', async () => {
      const from = events.length
      await request('turn/start', { threadId, input: [{ type: 'text', text: 'Interrupted by restart HANG_FOREVER', text_elements: [] }], ...permissionParams('auto') })
      await waitFor((event) => events.indexOf(event) >= from && event.method === 'turn/started' && event.params.threadId === threadId, 20000, 'turn/started')
      await sleep(500)
      await client.stopAndWait()
      model.releaseHangers()
      await connect()
      const last = (await request('thread/read', { threadId, includeTurns: true })).thread.turns.at(-1)
      assert.ok(['interrupted', 'failed'].includes(last.status), last.status)
      assert.equal((await runTurn(threadId, 'Works again PLAIN_AGAIN', permissionParams('auto'))).completed.params.turn.status, 'completed')
    })
    await check('a 1.x thread in threads.json stays hidden on 2.x, and is never deleted', async () => {
      assert.ok(!(await request('thread/list', { limit: 200 })).data.some((thread) => thread.id === 'ses_legacy1x'))
      await assert.rejects(() => request('thread/read', { threadId: 'ses_legacy1x', includeTurns: false }), /not available|not found/i)
      await sleep(1500)
      assert.ok(JSON.parse(fs.readFileSync(path.join(state, 'threads.json'), 'utf8')).ses_legacy1x, 'the 1.x thread was deleted')
    })
    await check('thread/delete removes the session from 2.x\'s database', async () => {
      await request('thread/delete', { threadId: forkId })
      assert.ok(!(await request('thread/list', { limit: 100 })).data.some((thread) => thread.id === forkId))
      await assert.rejects(() => request('thread/read', { threadId: forkId, includeTurns: true }), /not available/)
    })
  } finally {
    try { await client?.stopAndWait() } catch {}
    model.close()
    if (!process.env.KEEP_SMOKE_HOME) fs.rmSync(home, { recursive: true, force: true })
    else console.log(`home kept: ${home}`)
  }
  return checks.length
}

let passed = 0
try { passed = await run() } catch (error) { failures++; console.log(`FAIL setup: ${error?.stack || error}\n${stderr.join('').slice(-2000)}`) }
console.log(`${passed} checks passed${failures ? `, ${failures} failed` : ''} (${total} run${skipped ? `, ${skipped} skipped by --only` : ''})`)
process.exit(failures ? 1 : 0)
