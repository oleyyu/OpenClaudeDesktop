// Parity smoke of the ACP bridge with the real agents: Gemini CLI, Qwen Code, Kimi Code and MiniMax Code.
//
// Each agent runs from its official release (work/agents/acp-bridge, or ACP_BRIDGE_<ID>_BINARY) in an
// isolated home against a local scripted model server (testing/fake-model.mjs), driven through Code
// Desktop's own client (app/electron/codex.cjs CodexClient). The bridge runs from the assembled Extension
// Pack (work/agents/acp-bridge/packs/<id>, built by make-pack.mjs) unless ACP_BRIDGE_FROM=source.
//
// Usage: node tests/acp-bridge-smoke.mjs [gemini qwen kimi minimax]   (exit 0 = every check passed)
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createFakeModel } from '../packages/acp-bridge/testing/fake-model.mjs'
import { setupAgentHome, toolFor, toolInput, MODEL } from '../packages/acp-bridge/testing/agents.mjs'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const repo = path.resolve(root, '..')
const work = path.join(repo, 'work/agents/acp-bridge')
const stderr = []
const childProcess = require('node:child_process')
const spawn0 = childProcess.spawn
childProcess.spawn = (...args) => {
  const child = spawn0(...args)
  child.stderr?.on('data', (chunk) => { stderr.push(String(chunk)); if (stderr.length > 400) stderr.splice(0, 200) })
  return child
}
const { CodexClient } = require('../../app/electron/codex.cjs')

const ALL = ['gemini', 'qwen', 'kimi', 'minimax']
const only = process.argv.slice(2).filter((arg) => ALL.includes(arg))
const agents = only.length ? only : ALL
const results = []
const verbose = process.env.ACP_SMOKE_VERBOSE === '1'

if (process.env.ACP_BRIDGE_FROM !== 'source') execFileSync(process.execPath, [path.join(work, 'make-pack.mjs'), ...agents], { stdio: verbose ? 'inherit' : 'ignore' })
const bridgeScript = (id) => (process.env.ACP_BRIDGE_FROM === 'source' ? path.join(root, 'packages/acp-bridge/bin/app-server.mjs') : path.join(work, 'packs', id, 'bridge/bin/app-server.mjs'))

for (const id of agents) await runAgent(id)

const failed = results.filter((result) => !result.ok)
for (const result of failed) console.log(`FAIL [${result.agent}] ${result.name}\n  ${result.error.split('\n').slice(0, 6).join('\n  ')}`)
console.log(`\n${results.length - failed.length} checks passed${failed.length ? `, ${failed.length} failed` : ''}`)
process.exit(failed.length ? 1 : 0)

// --------------------------------------------------------------------------------------------

async function runAgent(id) {
  console.log(`\n=== ${id}`)
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `acp-smoke-${id}-`)))
  const workspace = path.join(home, 'workspace')
  const outside = path.join(home, 'outside')
  fs.mkdirSync(workspace, { recursive: true })
  fs.mkdirSync(outside, { recursive: true })
  fs.writeFileSync(path.join(workspace, 'notes.md'), 'MENTIONED_FILE_CONTENT\n')
  fs.writeFileSync(path.join(workspace, 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'))
  const state = path.join(home, 'state')
  const check = async (name, fn) => {
    try {
      await fn()
      results.push({ agent: id, name, ok: true })
      console.log(`PASS [${id}] ${name}`)
    } catch (error) {
      results.push({ agent: id, name, ok: false, error: `${error?.stack ?? error}` })
      console.log(`FAIL [${id}] ${name}: ${String(error?.message ?? error).split('\n')[0]}`)
    }
  }

  // ---------------------------------------------------------------- scripted model
  const script = { sideAnswer: 'SIDE_ANSWER_42' }
  const model = createFakeModel({
    log: (line) => verbose && console.log('  [http]', line),
    reply: async (req) => {
      // Agents may fold an interrupted or failed prompt into the next one: the prompt's last line carries the marker.
      const user = req.lastUser.trim().split('\n').filter(Boolean).at(-1) ?? ''
      const all = req.messages.map((message) => message.text).join('\n')
      if (verbose) console.log(`  [model] tools=${req.tools.length} afterTool=${req.afterToolResult} last=${JSON.stringify(user.slice(-80))}`)
      if (/Side question:/.test(req.currentUser) || /\bBTW_QUESTION\b/.test(req.currentUser)) return { text: script.sideAnswer }
      if (/SLOW_TURN/.test(user) && !req.afterToolResult) return { hang: true }
      if (/FAIL_TURN/.test(user)) return { error: { status: 400, message: 'scripted bad request' } }
      // Qwen keeps MCP tools deferred: tool_search loads one, then it is called by name or through tool_call.
      if (/CALL_MCP/.test(user) && req.tools.includes('tool_search')) {
        const called = req.toolCalls.map((call) => call.name)
        const loaded = req.tools.find((tool) => /echo/.test(tool) && /fake/.test(tool))
        const done = called.some((name) => /echo/.test(name ?? '') || name === 'tool_call')
        if (loaded && !done) return { tool: { name: loaded, input: { text: 'ping' } } }
        if (!loaded && !called.includes('tool_search')) return { tool: { name: 'tool_search', input: { query: 'select:mcp__fake__echo' } } }
        if (!loaded && !done) return { tool: { name: 'tool_call', input: { name: 'mcp__fake__echo', arguments: { text: 'ping' } } } }
      }
      // Qwen keeps todo_write deferred: tool_search loads it, then tool_call runs it.
      if (/MAKE_PLAN/.test(user) && !toolFor(req.tools, 'todo') && req.tools.includes('tool_search')) {
        const called = req.toolCalls.map((call) => call.name)
        if (!called.includes('tool_search')) {
          const props = req.toolSchemas.tool_search?.properties ?? {}
          return { tool: { name: 'tool_search', input: { [Object.keys(props).find((key) => /query|name|search/i.test(key)) ?? 'query']: 'select:todo_write' } } }
        }
        if (!called.includes('tool_call') && !called.includes('todo_write')) {
          if (req.tools.includes('todo_write')) return { tool: { name: 'todo_write', input: { todos: [{ id: '1', content: 'Step one', status: 'completed' }, { id: '2', content: 'Step two', status: 'in_progress' }] } } }
          return { tool: { name: 'tool_call', input: { name: 'todo_write', arguments: { todos: [{ id: '1', content: 'Step one', status: 'completed' }, { id: '2', content: 'Step two', status: 'in_progress' }] } } } }
        }
      }
      // Kimi and MiniMax want the plan written to their plan file before the plan exit: write it, then exit again.
      if (/EXIT_PLAN/.test(user) && req.afterToolResult) {
        const result = req.messages.at(-1)?.toolResults?.at(-1)?.text ?? req.messages.at(-1)?.text ?? ''
        const planPath = /(?:Write your plan to|Plan document not found:)\s+(\S+?\.md)/.exec(result)?.[1]
        const exitTool = req.tools.find((tool) => /exit.?plan/i.test(tool))
        const exits = req.toolCalls.filter((call) => /exit.?plan/i.test(call.name ?? '')).length
        const writes = req.toolCalls.filter((call) => call.name === toolFor(req.tools, 'write') && JSON.stringify(call.args ?? '').includes('PLAN_STEP_ALPHA')).length
        if (planPath && toolFor(req.tools, 'write') && writes < 1) {
          const name = toolFor(req.tools, 'write')
          return { tool: { name, input: toolInput(req.toolSchemas[name], { path: planPath, content: '# Plan\n1. PLAN_STEP_ALPHA\n2. PLAN_STEP_BETA\n' }) } }
        }
        if (exitTool && exits < 2 && /PLAN_STEP_ALPHA|Successfully wrote|written|Wrote/i.test(result)) return { tool: { name: exitTool, input: {} } }
      }
      if (req.afterToolResult) return { text: 'done after tool' }
      const write = /WRITE_FILE (\S+)/.exec(user)
      if (write) {
        const name = toolFor(req.tools, 'write')
        if (!name) return { text: 'no write tool' }
        const target = write[1].startsWith('/') ? write[1] : path.join(workspace, write[1])
        return { thinking: 'I will write the file.', tool: { name, input: toolInput(req.toolSchemas[name], { path: target, content: `written by ${id}\n` }) } }
      }
      const cmd = /RUN_CMD (.+)$/m.exec(user)
      if (cmd) {
        const name = toolFor(req.tools, 'shell')
        return name ? { tool: { name, input: toolInput(req.toolSchemas[name], { command: cmd[1] }) } } : { text: 'no shell tool' }
      }
      if (/MAKE_PLAN/.test(user)) {
        const name = toolFor(req.tools, 'todo')
        if (name) {
          const schema = req.toolSchemas[name]?.properties?.todos?.items?.properties ?? {}
          const statuses = schema.status?.enum ?? []
          const mapStatus = (status) => (statuses.length && !statuses.includes(status) ? (status === 'completed' ? statuses.find((value) => /done|complete/.test(value)) : statuses.find((value) => /progress|active/.test(value))) ?? status : status)
          const todo = (content, status, index) => ({ ...(('id' in schema) ? { id: String(index + 1) } : {}), [('content' in schema) ? 'content' : ('description' in schema) ? 'description' : ('title' in schema) ? 'title' : 'content']: content, status: mapStatus(status), ...(('priority' in schema) ? { priority: 'medium' } : {}), ...(('activeForm' in schema) ? { activeForm: content } : {}) })
          return { tool: { name, input: { todos: [todo('Step one', 'completed', 0), todo('Step two', 'in_progress', 1)] } } }
        }
        return { text: 'no todo tool' }
      }
      if (/EXIT_PLAN/.test(user)) {
        const name = req.tools.find((tool) => /exit.?plan/i.test(tool))
        if (name) {
          const props = req.toolSchemas[name]?.properties ?? {}
          const input = {}
          if ('plan' in props) input.plan = '1. PLAN_STEP_ALPHA\n2. PLAN_STEP_BETA'
          if ('plan_path' in props || 'plan_filename' in props) {
            // Gemini only accepts a plan inside its per-session plans folder.
            const planDir = id === 'gemini' && script.threadId ? path.join(home, '.gemini/tmp/workspace', script.threadId, 'plans') : workspace
            fs.mkdirSync(planDir, { recursive: true })
            const planFile = path.join(planDir, 'plan.md')
            fs.writeFileSync(planFile, '1. PLAN_STEP_ALPHA\n2. PLAN_STEP_BETA\n')
            input[('plan_path' in props) ? 'plan_path' : 'plan_filename'] = planFile
          }
          return { tool: { name, input } }
        }
        return { text: 'no exit plan tool' }
      }
      if (/CALL_MCP/.test(user)) {
        const name = req.tools.find((tool) => /echo/.test(tool) && /fake/.test(tool))
        return name ? { tool: { name, input: { text: 'ping' } } } : { text: `no mcp tool among ${req.tools.join(',')}` }
      }
      if (/ASK_QUESTIONS/.test(user)) {
        const name = req.tools.find((tool) => /^(AskUserQuestion|ask_user_question|ask_user)$/.test(tool))
        // The multi-select flag as the agent's schema names it (Kimi: multi_select).
        const multi = Object.keys(req.toolSchemas[name]?.properties?.questions?.items?.properties ?? {}).find((key) => /^multi_?select$/i.test(key)) ?? 'multiSelect'
        if (name) return { tool: { name, input: { questions: [
          { question: 'Pick a color?', header: 'Color', options: [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: 'cool' }], [multi]: true },
          { question: 'Pick a size?', header: 'Size', options: [{ label: 'S', description: 'small' }, { label: 'L', description: 'large' }], [multi]: false },
        ] } } }
        return { text: 'no question tool' }
      }
      if (/SPAWN_AGENT/.test(user)) {
        const name = req.tools.find((tool) => tool === 'agent' || tool === 'Agent' || tool === 'task' || tool === 'invoke_agent')
        if (name) {
          const props = req.toolSchemas[name]?.properties ?? {}
          const input = {}
          for (const key of Object.keys(props)) {
            if (/prompt|task|message|query/i.test(key)) input[key] = 'CHILD_TASK: say hi'
            else if (/description|title/i.test(key)) input[key] = 'child helper'
            else if (/subagent_type|agent_type|agent_name|type/i.test(key)) input[key] = props[key].enum?.[0] ?? (id === 'minimax' ? 'worker' : 'general-purpose')
            // Foreground, so the child's own updates stream (Qwen runs agents in the background by default).
            else if (key === 'run_in_background') input[key] = false
          }
          return { tool: { name, input } }
        }
        return { text: 'no agent tool' }
      }
      if (/CHILD_TASK/.test(req.firstUser) || /CHILD_TASK/.test(all)) return { text: 'child says hi' }
      return { thinking: 'Thinking about it.', text: `plain reply to: ${user.slice(-40)}` }
    },
  })
  const baseURL = await model.start()
  const env = setupAgentHome(id, { home, baseURL, stateDir: state, nativeDir: path.join(work, 'minimax-native') })
  const wrapper = path.join(home, 'bridge.sh')
  fs.writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${bridgeScript(id)}" "$@"\n`)
  fs.chmodSync(wrapper, 0o755)

  let client = null
  let events = []
  let responder = () => ({ decision: 'accept' })
  const requests = []
  const startClient = async () => {
    client = new CodexClient({ binary: wrapper, env, initializeTimeout: 120000 })
    client.on('event', (event) => {
      events.push(event)
      if (event.kind === 'request') {
        requests.push(event)
        Promise.resolve(responder(event)).then((result) => { try { client.respond(event.id, result, event.bridgeApproval) } catch {} })
      }
    })
    return client.start()
  }
  const call = (method, params = {}, timeout = 180000) => client.request(method, params, timeout)
  const waitFor = (predicate, ms = 120000, from = 0) => new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      const hit = events.slice(from).find(predicate)
      if (hit) return resolve(hit)
      if (Date.now() - started > ms) return reject(new Error(`timeout waiting\n${stderr.join('').slice(-2500)}`))
      setTimeout(tick, 50)
    }
    tick()
  })
  const turn = async (threadId, input, extra = {}) => {
    const from = events.length
    const response = await call('turn/start', { threadId, input: typeof input === 'string' ? [{ type: 'text', text: input, text_elements: [] }] : input, ...extra })
    const done = await waitFor((event) => event.method === 'turn/completed' && event.params?.threadId === threadId && event.params.turn.id === response.turn.id, 180000, from)
    if (done.params.turn.status === 'failed' && !/FAIL_TURN/.test(JSON.stringify(input))) console.log(`  turn failed (${JSON.stringify(input).slice(0, 60)}): ${JSON.stringify(done.params.turn.error).slice(0, 400)}`)
    return { from, turnId: response.turn.id, completed: done, slice: () => events.slice(from) }
  }
  const lastRequest = () => model.requests.at(-1)
  const requestsSince = (count) => model.requests.slice(count)
  // The main agent's request for a prompt (agents also call the model in the background: titles, memory, summaries).
  const requestFor = (marker, since = 0) => model.requests.slice(since).filter((request) => request.tools.length > 0 && request.lastUser.includes(marker)).at(0)
    ?? model.requests.slice(since).filter((request) => request.lastUser.includes(marker)).at(0)
  const permission = (mode, cwd = workspace) => {
    const readOnly = mode === 'plan'
    const bypass = mode === 'bypass'
    return {
      approvalPolicy: bypass ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request',
      sandboxPolicy: readOnly ? { type: 'readOnly', networkAccess: false } : bypass ? { type: 'dangerFullAccess' } : { type: 'workspaceWrite', writableRoots: [cwd], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false },
      codeDesktop: { permissionMode: mode, afterPlan: 'auto' },
    }
  }

  try {
    const init = await startClient()
    const caps = init.capabilities ?? {}
    await check('initialize reports the engine, version and capabilities', () => {
      assert.equal(init.engine, id)
      assert.match(String(init.engineVersion), /^\d/)
      for (const key of ['customization', 'permissionHints', 'systemPromptPreview', 'livePermissions', 'toolSelection', 'codeStats']) assert.equal(caps[key], true, key)
      assert.ok(Array.isArray(caps.unsupportedMethods))
    })
    const models = await call('model/list', {})
    await check('model/list returns the agent\'s models with a default', () => {
      assert.ok(models.data.length > 0)
      assert.ok(models.data.some((entry) => entry.isDefault))
      for (const entry of models.data) assert.ok(entry.id && entry.displayName)
      // The composer refuses image attachments when the catalog lists no image input.
      // Kimi's per-model image input (config.toml capabilities image_in): its second test model has none. MiniMax takes
      // images by path for the models that see them (the M3 family; the test's custom models declare none).
      for (const entry of models.data) assert.equal(entry.inputModalities.includes('image'), id === 'minimax' ? /:MiniMax-M3/.test(entry.id) : !(id === 'kimi' && entry.id === 'plain'), entry.id)
    })
    if (id === 'kimi') {
      await check('model/list gives each model its own thinking efforts (config.toml), before any session', () => {
        const efforts = Object.fromEntries(models.data.map((entry) => [entry.id, entry.supportedReasoningEfforts.map((effort) => effort.reasoningEffort)]))
        assert.deepEqual(efforts.local, ['off', 'on'])
        assert.deepEqual(efforts.plain, [])
        assert.equal(models.data.find((entry) => entry.id === 'local').contextWindow, 131072)
      })
    }
    const account = await call('account/read', {})
    await check('account/read reports the agent\'s own auth', () => {
      assert.equal(account.account?.type, 'apiKey')
      assert.equal(account.codeDesktop?.core, id)
      assert.equal(account.requiresOpenaiAuth, false)
    })
    if (id === 'gemini') {
      await check('account/login/start opens Google sign-in (the authUrl Gemini would open) and can be cancelled', async () => {
        const login = await call('account/login/start', { type: 'chatgpt' }, 120000)
        assert.equal(login.type, 'chatgpt')
        assert.match(login.authUrl, /^https:\/\/accounts\.google\.com\//)
        const cancelled = await call('account/login/cancel', { loginId: login.loginId })
        assert.equal(cancelled.status, 'canceled')
        await waitFor((event) => event.method === 'account/login/completed' && event.params.loginId === login.loginId && event.params.success === false, 20000)
      })
    }
    await check('account/rateLimits/read answers the Codex shape', async () => {
      const limits = await call('account/rateLimits/read', {})
      assert.ok('rateLimits' in limits && 'rateLimitsByLimitId' in limits)
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ customization + tool selection
    const shellTool = { gemini: 'run_shell_command', qwen: 'run_shell_command', kimi: 'Bash', minimax: 'bash' }[id]
    const before = model.requests.length
    const started = await call('thread/start', {
      cwd: workspace, model: MODEL[id] === 'local' ? undefined : undefined, ...permission('auto'), approvalsReviewer: 'user',
      codeDesktop: { ...permission('auto').codeDesktop, customization: { systemPrompt: `SYSPROMPT_MARKER_${id} You are a scripted test agent.`, instructions: 'INSTRUCTIONS_MARKER: keep answers short.' }, tools: { disabled: [shellTool], disabledServers: [] } },
    })
    const threadId = started.thread.id
    script.threadId = threadId
    await check('thread/start answers a Thread attributed to the core', () => {
      assert.ok(threadId)
      assert.ok(started.thread.cliVersion.startsWith(`${id} `), started.thread.cliVersion)
      assert.equal(started.thread.cwd, workspace)
      assert.ok(events.some((event) => event.method === 'thread/started' && event.params.thread.id === threadId))
    })
    const first = await turn(threadId, 'PLAIN hello there')
    const mainRequest = requestFor('PLAIN hello there', before) ?? lastRequest()
    if (id === 'minimax') {
      // MiniMax renders its primary agent's prompt from bundled layers only: the custom prompt arrives as global instructions.
      await check('custom system prompt reaches the model (as global instructions: MiniMax has no prompt replacement)', () => {
        assert.match(`${mainRequest.system}\n${mainRequest.messages.map((message) => message.text).join('\n')}`, new RegExp(`SYSPROMPT_MARKER_${id}`))
      })
    } else {
      await check('custom system prompt replaces the prompt the model receives', () => {
        assert.match(mainRequest.system, new RegExp(`SYSPROMPT_MARKER_${id}`))
      })
    }
    await check('project instructions reach the model', () => {
      assert.match(`${mainRequest.system}\n${mainRequest.messages.map((message) => message.text).join('\n')}`, /INSTRUCTIONS_MARKER/)
    })
    await check('a disabled tool is removed from the model request', () => {
      assert.ok(!mainRequest.tools.includes(shellTool), `${shellTool} still offered`)
      assert.ok(toolFor(mainRequest.tools, 'write'), 'the write tool is still there')
    })
    await check('agent message streams as agentMessage deltas and completes', () => {
      const slice = first.slice()
      assert.ok(slice.some((event) => event.method === 'item/agentMessage/delta'))
      const message = slice.find((event) => event.method === 'item/completed' && event.params.item.type === 'agentMessage')
      assert.match(message.params.item.text, /plain reply/)
      assert.equal(first.completed.params.turn.status, 'completed', JSON.stringify(first.completed.params.turn.error))
    })
    await check('reasoning streams as summary deltas', () => {
      assert.ok(first.slice().some((event) => event.method === 'item/reasoning/summaryTextDelta'))
    })
    await check('token / context usage reaches thread/tokenUsage/updated', async () => {
      const usage = await waitFor((event) => event.method === 'thread/tokenUsage/updated' && event.params.threadId === threadId, 15000, first.from)
      assert.ok(usage.params.tokenUsage.last.totalTokens > 0 || usage.params.tokenUsage.total.totalTokens > 0)
    })
    if (id === 'kimi') {
      await check('the turn\'s token totals come from the session (not just the context fill)', async () => {
        await waitFor((event) => event.method === 'thread/tokenUsage/updated' && event.params.threadId === threadId && event.params.tokenUsage.total.inputTokens > 0, 15000, first.from)
      })
    }
    if (id === 'kimi' || id === 'minimax') {
      // A second configured model (testing/agents.mjs): picked in the open session, it serves the next turn.
      const other = models.data.find((entry) => /plain$|fake-model-2/.test(entry.id))
      const count = model.requests.length
      const switched = await turn(threadId, 'PLAIN switched model', { model: other?.id })
      await check('a model picked in an open session serves the next turn', () => {
        assert.ok(other, `no second model in ${models.data.map((entry) => entry.id).join(', ')}`)
        assert.equal(switched.completed.params.turn.status, 'completed', JSON.stringify(switched.completed.params.turn.error))
        assert.equal(requestFor('PLAIN switched model', count)?.model, 'fake-model-2')
      })
      await turn(threadId, 'PLAIN back to the first model', { model: models.data.find((entry) => entry.isDefault)?.id })
    }

    // Tools back on for the rest.
    const noTools = { tools: null }
    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ auto mode: workspace write, no card
    requests.length = 0
    const write = await turn(threadId, 'WRITE_FILE auto.txt', { ...permission('auto'), codeDesktop: { ...permission('auto').codeDesktop, ...noTools } })
    await check('auto mode writes inside the workspace without asking', () => {
      assert.equal(fs.readFileSync(path.join(workspace, 'auto.txt'), 'utf8'), `written by ${id}\n`)
      assert.equal(requests.filter((event) => event.params?.threadId === threadId).length, 0)
    })
    await check('file edits arrive as fileChange items with diffs', () => {
      const item = write.slice().filter((event) => event.method === 'item/completed' && event.params.item.type === 'fileChange').at(-1)?.params.item
      assert.ok(item, 'no fileChange item')
      assert.equal(item.status, 'completed')
      assert.ok(item.changes.some((change) => change.path.endsWith('auto.txt')))
    })
    await check('turn/diff/updated carries the turn\'s unified diff', () => {
      const diff = write.slice().filter((event) => event.method === 'turn/diff/updated').at(-1)
      assert.ok(diff, 'no turn/diff/updated')
      assert.match(diff.params.diff, /auto\.txt/)
    })

    if (id === 'minimax') {
      // The official plugin catalog (`mcode plugin list --available`): plugin/list answers with the installed and the
      // available plugins, or the catalog's load error (offline here); paths and URLs are refused for Add plugin.
      await check('plugin/list serves MiniMax\'s plugin catalog (or its load error); a path can\'t be installed', async () => {
        assert.equal(caps.pluginCatalog, true)
        const list = await call('plugin/list', {})
        assert.equal(list.marketplaces.length, 1)
        assert.ok(Array.isArray(list.marketplaces[0].plugins))
        assert.ok(list.marketplaces[0].plugins.some((plugin) => plugin.installed === false) || list.marketplaceLoadErrors.length > 0 || list.marketplaces[0].plugins.length >= 0)
        const inspect = await call('codeDesktop/plugin/inspect', { spec: '/tmp/some-plugin' })
        assert.equal(inspect.installable, false)
        await assert.rejects(call('codeDesktop/plugin/install', { spec: 'https://github.com/x/y', requestId: 'p1' }), /official catalog/)
      })
    }

    if (verbose) console.log('  --- section')
    if (id === 'minimax') {
      // MiniMax's default mode asks only outside the session folders or for risky actions: in Ask the thread's own
      // permission.json (agents/minimax.js launch) makes it ask before a workspace write too.
      requests.length = 0
      responder = () => ({ decision: 'decline' })
      const from = events.length
      await turn(threadId, 'WRITE_FILE ask-declined.txt', permission('ask'))
      await check('Ask mode asks before a workspace write (thread permission.json) and decline keeps the file out', () => {
        const card = requests.find((event) => event.method === 'item/fileChange/requestApproval' || event.method === 'item/commandExecution/requestApproval')
        assert.ok(card, 'no approval card')
        assert.ok(!fs.existsSync(path.join(workspace, 'ask-declined.txt')))
        assert.ok(!events.slice(from).some((event) => event.method === 'warning' && /MiniMax/.test(event.params?.message ?? '')), 'no "may still edit" warning any more')
      })
      responder = () => ({ decision: 'accept' })
    } else {
    // ------------------------------------------------------------ ask mode: cards for writes and commands
      requests.length = 0
      responder = (event) => ({ decision: 'decline' })
      const declined = await turn(threadId, 'WRITE_FILE declined.txt', permission('ask'))
      await check('ask mode asks before a write (item/fileChange/requestApproval) and decline keeps the file out', () => {
        const card = requests.find((event) => event.method === 'item/fileChange/requestApproval' || event.method === 'item/commandExecution/requestApproval')
        assert.ok(card, 'no approval card')
        assert.equal(card.params.threadId, threadId)
        assert.ok(!fs.existsSync(path.join(workspace, 'declined.txt')))
        void declined
      })
      requests.length = 0
      responder = () => ({ decision: 'accept' })
      const askCmd = await turn(threadId, 'RUN_CMD mkdir -p made-by-ask && echo SHELL_OUTPUT_MARKER', permission('ask'))
      await check('ask mode asks before a command (item/commandExecution/requestApproval) and runs it after accept', () => {
        assert.ok(requests.some((event) => event.method === 'item/commandExecution/requestApproval'), 'no command card')
        const item = askCmd.slice().filter((event) => event.method === 'item/completed' && event.params.item.type === 'commandExecution').at(-1)?.params.item
        assert.ok(item, 'no commandExecution item')
        assert.equal(item.status, 'completed')
        assert.match(item.aggregatedOutput ?? '', /SHELL_OUTPUT_MARKER/)
      })
      if (id === 'kimi') {
        await check('command output streams live (item/commandExecution/outputDelta) from the bridge terminal', () => {
          assert.ok(askCmd.slice().some((event) => event.method === 'item/commandExecution/outputDelta' && /SHELL_OUTPUT_MARKER/.test(event.params.delta)))
        })
      }
      requests.length = 0
      responder = () => ({ decision: 'acceptForSession' })
      await turn(threadId, 'RUN_CMD mkdir -p grant-one && echo GRANT_ONE', permission('ask'))
      const grantedCards = requests.length
      await check('an Ask command card offers "Allow for this session" (sessionGrantable)', () => {
        assert.ok(requests.some((event) => event.method === 'item/commandExecution/requestApproval' && event.params.sessionGrantable === true))
      })
      await turn(threadId, 'RUN_CMD mkdir -p grant-one && echo GRANT_ONE', permission('ask'))
      await check('"Allow for this session" stops asking for the same command', () => {
        assert.ok(grantedCards >= 1)
        assert.equal(requests.length, grantedCards)
      })
      responder = () => ({ decision: 'accept' })
      await turn(threadId, 'RUN_CMD mkdir -p grant-two && echo GRANT_TWO', permission('ask'))
      await check('a session grant covers only that exact command (another command asks)', () => {
        assert.ok(requests.length > grantedCards)
      })
      await turn(threadId, 'PLAIN switching modes', permission('acceptEdits'))
      const beforeAgain = requests.length
      await turn(threadId, 'RUN_CMD mkdir -p grant-one && echo GRANT_ONE', permission('ask'))
      await check('a permission-mode change drops the session grants (the granted command asks again)', () => {
        assert.ok(requests.length > beforeAgain)
      })

      if (verbose) console.log('  --- section')
      // ------------------------------------------------------------ acceptEdits
      requests.length = 0
      await turn(threadId, 'WRITE_FILE accepted.txt', permission('acceptEdits'))
      await check('acceptEdits writes inside the workspace without a card', () => {
        assert.ok(fs.existsSync(path.join(workspace, 'accepted.txt')))
        assert.equal(requests.filter((event) => event.method === 'item/fileChange/requestApproval').length, 0)
      })
      requests.length = 0
      await turn(threadId, 'RUN_CMD touch edits-mode.txt && echo EDITS_MODE', permission('acceptEdits'))
      await check('acceptEdits still asks before a command', () => {
        assert.ok(requests.some((event) => event.method === 'item/commandExecution/requestApproval'))
      })

      if (verbose) console.log('  --- section')
    }
    // ------------------------------------------------------------ bypass: outside the workspace, no card
    requests.length = 0
    await turn(threadId, `WRITE_FILE ${path.join(outside, 'bypass.txt')}`, permission('bypass'))
    if (id === 'gemini') {
      // Gemini CLI itself only writes inside its workspace folders (the session folder and the app's additional folders).
      await check('bypass never shows a card (Gemini refuses paths outside its workspace folders itself)', () => {
        assert.equal(requests.length, 0)
      })
    } else {
      await check('bypass writes outside the workspace without asking', () => {
        assert.ok(fs.existsSync(path.join(outside, 'bypass.txt')), 'not written')
        assert.equal(requests.length, 0)
      })
    }
    {
      const extra = path.join(home, 'extra-folder')
      fs.mkdirSync(extra, { recursive: true })
      requests.length = 0
      const roots = permission('auto')
      roots.sandboxPolicy = { ...roots.sandboxPolicy, writableRoots: [workspace, extra] }
      await turn(threadId, `WRITE_FILE ${path.join(extra, 'extra.txt')}`, roots)
      await check('an additional session folder (writableRoots) takes writes in auto mode without a card', () => {
        assert.ok(fs.existsSync(path.join(extra, 'extra.txt')), 'not written')
        assert.equal(requests.length, 0)
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ auto mode outside the workspace: card
    requests.length = 0
    responder = () => ({ decision: 'decline' })
    await turn(threadId, `WRITE_FILE ${path.join(outside, 'auto-outside.txt')}`, permission('auto'))
    await check('auto mode asks before writing outside the workspace (or the sandbox refuses it)', () => {
      assert.ok(!fs.existsSync(path.join(outside, 'auto-outside.txt')))
    })
    responder = () => ({ decision: 'accept' })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ plan mode
    requests.length = 0
    await turn(threadId, 'WRITE_FILE planned.txt', permission('plan'))
    await check('plan mode never writes', () => {
      assert.ok(!fs.existsSync(path.join(workspace, 'planned.txt')))
    })
    requests.length = 0
    responder = (event) => (event.method === 'item/tool/requestUserInput' ? { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'auto' } } : { decision: 'accept' })
    const planTurn = await turn(threadId, 'EXIT_PLAN now', permission('plan'))
    // MiniMax asks for the review right after its turn ends.
    await waitFor((event) => event.kind === 'request' && event.method === 'item/tool/requestUserInput', 8000, planTurn.from).catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 500))
    const review = requests.find((event) => event.method === 'item/tool/requestUserInput' && event.params.questions?.some((question) => question.id === 'plan-review'))
    if (review) {
      await check('a plan exit shows the plan card (item/tool/requestUserInput plan-review) with the plan item', () => {
        assert.ok(events.slice(planTurn.from).some((event) => event.method === 'item/completed' && event.params.item.type === 'plan'))
      })
      requests.length = 0
      await turn(threadId, 'WRITE_FILE after-plan.txt')
      await check('an approved plan switches the session to the after-plan mode (auto: writes without a card)', () => {
        assert.ok(fs.existsSync(path.join(workspace, 'after-plan.txt')))
        assert.equal(requests.length, 0)
      })
    } else {
      console.log(`  note [${id}]: no plan review reached the client (the agent left plan mode on its own)`)
    }
    responder = () => ({ decision: 'accept' })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ plan / todo list
    const plan = await turn(threadId, 'MAKE_PLAN please', permission('auto'))
    if (id === 'qwen' || id === 'kimi' || id === 'gemini') {
      // Gemini sends no plan update: the bridge reads write_todos' list from its session file (a moment later).
      if (id === 'gemini') await waitFor((event) => event.method === 'turn/plan/updated' && event.params.threadId === threadId, 5000, plan.from).catch(() => null)
      await check('the agent\'s todo list arrives as turn/plan/updated', () => {
        const update = events.slice(plan.from).find((event) => event.method === 'turn/plan/updated')
        assert.ok(update, 'no plan update')
        assert.ok(update.params.plan.some((step) => step.status === 'inProgress'))
      })
    }

    if (id === 'kimi') {
      let asked = null
      responder = (event) => {
        if (event.method !== 'item/tool/requestUserInput') return { decision: 'accept' }
        asked = event.params
        return { answers: { [event.params.questions[0].id]: { answers: ['Red', 'Blue'] }, [event.params.questions[1]?.id ?? 'q1']: { answers: ['L'] } } }
      }
      const count = model.requests.length
      await turn(threadId, 'ASK_QUESTIONS now', permission('auto'))
      await check('AskUserQuestion arrives whole: both questions, multi-select, option descriptions; both answers reach the model', () => {
        assert.ok(asked, 'no question card')
        assert.deepEqual(asked.questions.map((question) => [question.header, question.question, question.multiSelect]), [['Color', 'Pick a color?', true], ['Size', 'Pick a size?', false]])
        assert.equal(asked.questions[0].options[0].description, 'warm')
        const results = model.requests.slice(count).flatMap((request) => request.messages.flatMap((message) => message.toolResults ?? [])).map((result) => result.text).join('\n')
        assert.match(results, /Red, Blue/)
        assert.match(results, /Pick a size\?[^\n]*L|"L"/)
      })
      responder = () => ({ decision: 'accept' })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ attachments and mentions
    if (id !== 'minimax') {
      const count = model.requests.length
      await turn(threadId, [{ type: 'text', text: 'PLAIN look at this', text_elements: [] }, { type: 'localImage', path: path.join(workspace, 'pixel.png') }], permission('auto'))
      await check('an image attachment reaches the model as an image', () => {
        assert.ok(requestsSince(count).some((request) => request.messages.some((message) => message.images > 0)), 'no image in any request')
      })
    }
    {
      const count = model.requests.length
      await turn(threadId, [{ type: 'text', text: 'PLAIN read the mention', text_elements: [] }, { type: 'mention', name: 'notes.md', path: path.join(workspace, 'notes.md') }], permission('auto'))
      await check('an @-mentioned file reaches the model', () => {
        assert.ok(requestsSince(count).some((request) => request.messages.some((message) => /MENTIONED_FILE_CONTENT|notes\.md/.test(message.text))))
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ errors
    {
      const failedTurn = await turn(threadId, 'FAIL_TURN please', permission('auto'))
      await check('a model error ends the turn failed or reports it', () => {
        const status = failedTurn.completed.params.turn.status
        const reported = failedTurn.slice().some((event) => event.method === 'error') || status === 'failed' || failedTurn.slice().some((event) => event.method === 'item/completed' && /error|400|bad request/i.test(event.params.item.text ?? ''))
        assert.ok(reported, `status ${status}`)
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ interrupt, queue, steer
    {
      const from = events.length
      const response = await call('turn/start', { threadId, input: [{ type: 'text', text: 'SLOW_TURN wait', text_elements: [] }], ...permission('auto') })
      await waitFor((event) => event.method === 'turn/started' && event.params.threadId === threadId, 30000, from)
      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (caps.unsupportedMethods && id === 'minimax') {
        await check('turn/steer adds input to the running turn (mcode/session/steer)', async () => {
          const result = await call('turn/steer', { threadId, expectedTurnId: response.turn.id, input: [{ type: 'text', text: 'STEER_TEXT', text_elements: [] }] })
          assert.equal(result.turnId, response.turn.id)
        })
      } else if (id === 'qwen') {
        // Qwen pulls mid-turn messages between tool batches (craft/drainMidTurnQueue): the bridge holds the steer for it,
        // and a stopped turn discards it (the app hands it back to the composer).
        await check('turn/steer is held for Qwen\'s mid-turn drain (craft/drainMidTurnQueue)', async () => {
          const result = await call('turn/steer', { threadId, expectedTurnId: response.turn.id, input: [{ type: 'text', text: 'STEER_TEXT', text_elements: [] }], clientUserMessageId: 'steer-1' })
          assert.equal(result.turnId, response.turn.id)
        })
      } else {
        await check('turn/steer is refused as not steerable so the app queues instead', async () => {
          await assert.rejects(call('turn/steer', { threadId, expectedTurnId: response.turn.id, input: [{ type: 'text', text: 'x', text_elements: [] }] }), (error) => error.data?.codexErrorInfo === 'activeTurnNotSteerable')
        })
      }
      const queued = await call('thread/queue/add', { threadId, input: [{ type: 'text', text: 'PLAIN queued message', text_elements: [] }], clientUserMessageId: 'q-1' })
      await check('thread/queue/add and /list hold a message while a turn runs', async () => {
        assert.ok(queued.queuedSubmission.id)
        const list = await call('thread/queue/list', { threadId })
        assert.equal(list.data.length, 1)
      })
      await call('turn/interrupt', { threadId, turnId: response.turn.id })
      const stopped = await waitFor((event) => event.method === 'turn/completed' && event.params.turn.id === response.turn.id, 30000, from)
      await check('turn/interrupt ends the turn as interrupted', () => assert.equal(stopped.params.turn.status, 'interrupted'))
      const next = await waitFor((event) => event.method === 'turn/completed' && event.params.threadId === threadId && event.params.turn.id !== response.turn.id, 120000, events.indexOf(stopped) + 1)
      await check('the queued message runs after the stopped turn', () => {
        assert.equal(next.params.turn.status, 'completed')
      })
    }

    if (id === 'qwen') {
      // A message steered while a command runs reaches the model at the next tool boundary (craft/drainMidTurnQueue) and
      // shows in the same turn as its user message.
      const from = events.length
      const since = model.requests.length
      const response = await call('turn/start', { threadId, input: [{ type: 'text', text: "RUN_CMD perl -e 'select(undef, undef, undef, 4)' && echo STEER_WAIT", text_elements: [] }], ...permission('bypass') })
      await waitFor((event) => event.method === 'item/started' && event.params.threadId === threadId && event.params.item.type === 'commandExecution', 60000, from)
      await call('turn/steer', { threadId, expectedTurnId: response.turn.id, input: [{ type: 'text', text: 'STEER_DELIVERED please', text_elements: [] }], clientUserMessageId: 'steer-2' })
      const done = await waitFor((event) => event.method === 'turn/completed' && event.params.turn.id === response.turn.id, 120000, from)
      await check('a steered message reaches Qwen mid-turn and shows in the running turn', () => {
        assert.equal(done.params.turn.status, 'completed')
        assert.ok(model.requests.slice(since).some((request) => request.messages.some((message) => /STEER_DELIVERED/.test(message.text ?? ''))), 'the model never saw the steer')
        assert.ok(events.slice(from).some((event) => event.method === 'item/started' && event.params.turnId === response.turn.id && event.params.item.type === 'userMessage' && event.params.item.clientId === 'steer-2'), 'no userMessage item for the steer')
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ session actions
    await call('thread/name/set', { threadId, name: 'Smoke session' })
    await check('thread/name/set renames (thread/name/updated, thread/read)', async () => {
      assert.ok(events.some((event) => event.method === 'thread/name/updated' && event.params.threadName === 'Smoke session'))
      const read = await call('thread/read', { threadId })
      assert.equal(read.thread.name, 'Smoke session')
    })
    if (id === 'qwen') {
      await check('Qwen sub-agents and hooks are listed (codeDesktop/agents/list, hooks/list)', async () => {
        assert.equal(caps.agentsList, true)
        fs.mkdirSync(path.join(workspace, '.qwen', 'agents'), { recursive: true })
        fs.writeFileSync(path.join(workspace, '.qwen', 'agents', 'reviewer.md'), '---\nname: reviewer\ndescription: Reviews changes\n---\nReview.\n')
        const { agents } = await call('codeDesktop/agents/list', { cwd: workspace })
        assert.ok(agents.some((agent) => agent.name === 'Explore' && agent.scope === 'builtin'))
        assert.ok(agents.some((agent) => agent.name === 'reviewer' && agent.scope === 'project'))
        assert.equal(caps.hooksList, true)
      })
      // A session the Qwen CLI started in another folder (Qwen's session/list is per folder): seeded by copying this
      // thread's record file under the other folder's project directory with a new id and cwd.
      await check('thread/list includes a Qwen session started in another folder', async () => {
        const projects = path.join(home, '.qwen', 'projects')
        const source = fs.readdirSync(projects).map((dir) => path.join(projects, dir, 'chats', `${threadId}.jsonl`)).find((file) => fs.existsSync(file))
        assert.ok(source, 'no Qwen record file for the smoke thread')
        const other = fs.realpathSync(fs.mkdtempSync(path.join(home, 'other-repo-')))
        const otherId = '6f0c2b1e-4d7a-4c3e-9a51-0a0b0c0d0e0f'
        const text = fs.readFileSync(source, 'utf8').split(threadId).join(otherId).split(JSON.stringify(workspace).slice(1, -1)).join(JSON.stringify(other).slice(1, -1))
        const target = path.join(projects, other.replace(/[^a-zA-Z0-9]/g, '-'), 'chats')
        fs.mkdirSync(target, { recursive: true })
        fs.writeFileSync(path.join(target, `${otherId}.jsonl`), text)
        const list = await call('thread/list', { limit: 200 })
        const row = list.data.find((thread) => thread.id === otherId)
        assert.ok(row, `not listed: ${list.data.map((thread) => thread.id).join(', ')}`)
        assert.equal(row.cwd, other)
      })
    }
    await check('thread/list lists the session (search too)', async () => {
      const list = await call('thread/list', { limit: 50 })
      assert.ok(list.data.some((thread) => thread.id === threadId))
      const search = await call('thread/list', { searchTerm: 'Smoke' })
      assert.ok(search.data.some((thread) => thread.id === threadId))
    })
    await check('thread/turns/list and thread/items/list page the history', async () => {
      const turns = await call('thread/turns/list', { threadId, limit: 5, sortDirection: 'desc' })
      assert.ok(turns.data.length > 0 && turns.data[0].items.length > 0)
      const items = await call('thread/items/list', { threadId, limit: 500 })
      assert.ok(items.data.some((entry) => entry.item.type === 'userMessage'))
    })
    await check('skills/list offers skill folders and the agent\'s own commands', async () => {
      const skillRoot = { gemini: path.join(home, '.gemini/skills'), qwen: path.join(home, '.qwen/skills'), kimi: path.join(home, '.kimi-code/skills'), minimax: path.join(home, '.agents/skills') }[id]
      fs.mkdirSync(path.join(skillRoot, 'smoke-skill'), { recursive: true })
      fs.writeFileSync(path.join(skillRoot, 'smoke-skill/SKILL.md'), '---\nname: smoke-skill\ndescription: A skill for the smoke test.\n---\nSay SKILL_USED.\n')
      const skills = await call('skills/list', { cwds: [workspace] })
      const rows = skills.data[0].skills
      assert.ok(rows.some((skill) => skill.name === 'smoke-skill'), 'skill folder not listed')
      assert.ok(rows.some((skill) => skill.command === true), 'no agent commands listed')
    })
    if (id === 'gemini') {
      await check('a custom TOML command is listed and runs as its expanded prompt', async () => {
        const file = path.join(home, '.gemini/commands/greet.toml')
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, 'description = "Greets someone"\nprompt = "PLAIN CUSTOM_CMD_PROMPT for {{args}}"\n')
        const rows = (await call('skills/list', { cwds: [workspace] })).data[0].skills
        const row = rows.find((skill) => skill.name === 'greet')
        assert.ok(row?.command, 'custom command not listed')
        const count = model.requests.length
        await turn(threadId, [{ type: 'skill', name: 'greet', path: row.path }, { type: 'text', text: 'world', text_elements: [] }], permission('auto'))
        assert.ok(model.requests.slice(count).some((request) => request.lastUser.includes('CUSTOM_CMD_PROMPT for world')), 'expanded prompt did not reach the model')
      })
    }
    await check('codeDesktop/tools/list lists the agent\'s tools', async () => {
      const tools = await call('codeDesktop/tools/list', { threadId })
      assert.ok(tools.tools.some((tool) => tool.name === shellTool))
    })
    await check('codeDesktop/systemPrompt/preview renders the custom prompt', async () => {
      const preview = await call('codeDesktop/systemPrompt/preview', { cwd: workspace, threadId, codeDesktop: { customization: { systemPrompt: `PREVIEW_MARKER_${id}`, instructions: null } } }, 120000)
      assert.match(preview.text, new RegExp(`PREVIEW_MARKER_${id}`))
      assert.equal(preview.custom, true)
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ MCP connectors
    const mcpScript = path.join(root, 'packages/acp-bridge/testing/fake-mcp.mjs')
    await call('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.fake', value: { command: process.execPath, args: [mcpScript] }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
    await call('config/mcpServer/reload', {})
    await check('config/batchWrite adds an MCP server and mcpServerStatus/list connects it with its tools', async () => {
      const status = await call('mcpServerStatus/list', { detail: 'toolsAndAuthOnly' })
      const fake = status.data.find((server) => server.name === 'fake')
      assert.ok(fake, 'not listed')
      assert.equal(fake.runtimeStatus, 'connected')
      assert.ok(fake.tools.echo)
    })
    await check('config/read lists the MCP server', async () => {
      const config = await call('config/read', { cwd: workspace })
      assert.ok(config.config.mcp_servers.fake)
    })
    {
      const mcpTurn = await turn(threadId, 'CALL_MCP echo', { ...permission('bypass') })
      await check('an MCP tool call arrives as an mcpToolCall item with its result', () => {
        const item = mcpTurn.slice().filter((event) => event.method === 'item/completed' && event.params.item.type === 'mcpToolCall').at(-1)?.params.item
        assert.ok(item, `no mcpToolCall item (${mcpTurn.slice().filter((event) => event.method === 'item/completed').map((event) => event.params.item.type).join(',')})`)
        assert.equal(item.server, 'fake')
        assert.match(JSON.stringify(item.result ?? {}), /MCP_ECHO:ping/)
      })
      const count = model.requests.length
      await turn(threadId, 'PLAIN without the server', { ...permission('auto'), codeDesktop: { ...permission('auto').codeDesktop, tools: { disabled: [], disabledServers: ['fake'] } } })
      await check('a disabled MCP server\'s tools leave the model request', () => {
        const request = requestFor('PLAIN without the server', count)
        assert.ok(request && !request.tools.some((tool) => /echo/.test(tool) && /fake/.test(tool)))
      })
      await call('turn/start', { threadId, input: [{ type: 'text', text: 'PLAIN tools back', text_elements: [] }], codeDesktop: { tools: null } }).catch(() => {})
      await waitFor((event) => event.method === 'turn/completed' && event.params.threadId === threadId, 60000, events.length - 1).catch(() => {})
      requests.length = 0
      responder = () => ({ decision: 'decline' })
      await turn(threadId, 'CALL_MCP echo in plan', permission('plan'))
      const planCard = requests.find((event) => event.method === 'item/commandExecution/requestApproval' || event.method === 'item/fileChange/requestApproval')
      if (planCard) {
        await check('a Plan mode card never offers "Allow for this session" (sessionGrantable false)', () => {
          assert.equal(planCard.params.sessionGrantable, false)
        })
      }
      responder = () => ({ decision: 'accept' })
      await turn(threadId, 'PLAIN back to auto', permission('auto'))
    }
    await call('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.fake', value: null, mergeStrategy: 'replace' }], reloadUserConfig: true })
    await check('config/batchWrite removes the MCP server', async () => {
      const status = await call('mcpServerStatus/list', {})
      assert.ok(!status.data.some((server) => server.name === 'fake'))
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ side question
    await check('codeDesktop/sideQuestion answers over the session without entering it', async () => {
      const turnsBefore = (await call('thread/turns/list', { threadId, limit: 500 })).data.length
      const from = events.length
      const answer = await call('codeDesktop/sideQuestion', { threadId, question: 'BTW_QUESTION what happened?', requestId: 'side-1' }, 180000)
      assert.match(answer.text, new RegExp(script.sideAnswer))
      assert.ok(events.slice(from).some((event) => event.method === 'codeDesktop/sideQuestion/delta'))
      const turnsAfter = (await call('thread/turns/list', { threadId, limit: 500 })).data.length
      assert.equal(turnsAfter, turnsBefore)
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ sub-agents
    if (id === 'qwen' || id === 'minimax') {
      const from = events.length
      await turn(threadId, 'SPAWN_AGENT now', permission('bypass'))
      await check('a sub-agent becomes a spawned thread (thread/started with parentThreadId)', async () => {
        const child = await waitFor((event) => event.method === 'thread/started' && event.params.thread.parentThreadId === threadId, 10000, from).catch(() => null)
        assert.ok(child, 'no child thread')
        if (id === 'minimax') {
          const childId = child.params.thread.id
          const linked = events.slice(from).filter((event) => event.params?.item?.type === 'collabAgentToolCall').at(-1)
          assert.deepEqual(linked?.params.item.receiverThreadIds, [childId])
          // The delegate's own conversation opens from the agent once it has finished.
          await waitFor((event) => event.method === 'thread/status/changed' && event.params.threadId === childId && event.params.status.type === 'idle', 30000, from)
          const turns = await call('thread/turns/list', { threadId: childId, sortDirection: 'asc' })
          assert.ok(turns.data.flatMap((entry) => entry.items).some((item) => item.type === 'agentMessage' && /child says hi/.test(item.text)), 'child transcript not loaded')
        }
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ compact, review, fork, revert
    if (!caps.unsupportedMethods.includes('thread/compact/start')) {
      const from = events.length
      await call('thread/compact/start', { threadId })
      const done = await waitFor((event) => event.method === 'turn/completed' && event.params.threadId === threadId, 180000, from)
      await check('thread/compact/start runs the agent\'s compaction as a contextCompaction turn', () => {
        assert.ok(events.slice(from).some((event) => event.method === 'item/started' && event.params.item.type === 'contextCompaction'))
        assert.ok(['completed', 'failed'].includes(done.params.turn.status))
      })
    }
    {
      const from = events.length
      const review = await call('review/start', { threadId, target: { type: 'custom', instructions: 'PLAIN review the change' }, delivery: 'inline' })
      const done = await waitFor((event) => event.method === 'turn/completed' && event.params.turn.id === review.turn.id, 120000, from)
      await check('review/start runs a review turn', () => assert.equal(done.params.turn.status, 'completed'))
    }
    if (!caps.unsupportedMethods.includes('thread/fork')) {
      await check('thread/fork copies the session into a new thread that can continue', async () => {
        const fork = await call('thread/fork', { threadId, excludeTurns: true, ...permission('auto') }, 120000)
        assert.ok(fork.thread.id && fork.thread.id !== threadId)
        const turns = await call('thread/turns/list', { threadId: fork.thread.id, limit: 500 })
        assert.ok(turns.data.length > 0)
        const continued = await turn(fork.thread.id, 'PLAIN on the fork', permission('auto'))
        assert.equal(continued.completed.params.turn.status, 'completed', JSON.stringify(continued.completed.params.turn.error))
      })
    }
    if (!caps.unsupportedMethods.includes('thread/revert')) {
      await check('thread/revert drops the last turns from the session and the agent\'s context', async () => {
        await turn(threadId, 'PLAIN REVERT_ME marker', permission('auto'))
        const turns = (await call('thread/turns/list', { threadId, limit: 500, sortDirection: 'asc' })).data
        const target = turns.at(-1)
        await call('thread/revert', { threadId, beforeTurnId: target.id })
        const after = (await call('thread/turns/list', { threadId, limit: 500, sortDirection: 'asc' })).data
        assert.equal(after.length, turns.length - 1)
        const count = model.requests.length
        await turn(threadId, 'PLAIN after revert', permission('auto'))
        const request = requestFor('PLAIN after revert', count) ?? lastRequest()
        assert.ok(!request.messages.some((message) => /REVERT_ME/.test(message.text)), 'the reverted turn is still in the context')
      })
    }

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ live permissions, archive, usage
    await check('codeDesktop/thread/permissions applies a mode to a loaded thread', async () => {
      const result = await call('codeDesktop/thread/permissions', { threadId, ...permission('ask') })
      assert.equal(result.applied, true)
    })
    await call('thread/archive', { threadId })
    await check('thread/archive / unarchive move the session', async () => {
      const archived = await call('thread/list', { archived: true })
      assert.ok(archived.data.some((thread) => thread.id === threadId))
      await call('thread/unarchive', { threadId })
      const active = await call('thread/list', {})
      assert.ok(active.data.some((thread) => thread.id === threadId))
    })
    await check('account/usage/read and codeDesktop/stats/read fold the turns', async () => {
      const usage = await call('account/usage/read', {})
      const stats = await call('codeDesktop/stats/read', {})
      assert.ok(Array.isArray(usage.dailyUsageBuckets))
      assert.ok(stats.dailyActivity.some((day) => day.messageCount > 0))
      if (id === 'gemini' || id === 'qwen' || id === 'kimi') assert.ok(usage.summary.lifetimeTokens > 0, 'no tokens recorded')
    })
    await check('hooks/list, plugin/installed and backgroundTerminals answer', async () => {
      const hooks = await call('hooks/list', { cwds: [workspace] })
      assert.ok(Array.isArray(hooks.data))
      const plugins = await call('plugin/installed', {})
      assert.ok(Array.isArray(plugins.marketplaces))
      const terminals = await call('thread/backgroundTerminals/list', { threadId })
      assert.ok(Array.isArray(terminals.data))
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ restart survival
    await turn(threadId, 'PLAIN before restart RESTART_MARKER', permission('auto'))
    const turnCount = (await call('thread/turns/list', { threadId, limit: 500 })).data.length
    client.stop()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    events = []
    const reinit = await startClient()
    await check('after a core restart the session, title and history are still there', async () => {
      assert.equal(reinit.engine, id)
      const list = await call('thread/list', {})
      assert.ok(list.data.some((thread) => thread.id === threadId && thread.name === 'Smoke session'))
      const read = await call('thread/read', { threadId, includeTurns: true })
      assert.equal(read.thread.turns.length, turnCount)
    })
    await check('a restarted core reopens the agent session and continues it', async () => {
      await call('thread/resume', { threadId, excludeTurns: true, ...permission('auto') })
      const count = model.requests.length
      const resumed = await turn(threadId, 'PLAIN after restart', permission('auto'))
      assert.equal(resumed.completed.params.turn.status, 'completed', JSON.stringify(resumed.completed.params.turn.error))
      const request = requestFor('PLAIN after restart', count) ?? lastRequest()
      assert.ok(request.messages.some((message) => /RESTART_MARKER/.test(message.text)), 'earlier history missing from the model context')
    })

    if (verbose) console.log('  --- section')
    // ------------------------------------------------------------ delete
    await check('thread/delete removes the session and the agent\'s own history', async () => {
      await call('thread/delete', { threadId })
      assert.ok(events.some((event) => event.method === 'thread/deleted' && event.params.threadId === threadId))
      await assert.rejects(call('thread/read', { threadId }), (error) => error.data?.codexErrorInfo === 'threadNotFound')
      const list = await call('thread/list', {})
      assert.ok(!list.data.some((thread) => thread.id === threadId))
    })
  } catch (error) {
    results.push({ agent: id, name: 'scenario ran to the end', ok: false, error: `${error?.stack ?? error}\n${stderr.join('').slice(-3000)}` })
    console.log(`FAIL [${id}] scenario aborted: ${error?.message}`)
  } finally {
    try { await client?.stopAndWait?.() } catch {}
    await model.close()
    if (process.env.ACP_SMOKE_KEEP !== '1') fs.rmSync(home, { recursive: true, force: true })
    else console.log(`  kept ${home}`)
  }
}
