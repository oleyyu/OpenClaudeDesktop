// Parity smoke of the ZCode core: the real ZCode agent (`zcode app-server --stdio` from the official release)
// behind harness/packages/zcode-bridge, driven through OpenClaude Desktop's own client (app/electron/codex.cjs) with a
// local scripted Anthropic-Messages model standing in for GLM. Every notification is fed through the app's real
// transcript reducer (app/src/state.js) and the usage / customize / model-menu view models, so the checks assert
// what the UI would show. Isolated: a temp HOME (ZCode keeps everything under ~/.zcode), no network.
//
// Usage: node tests/zcode-bridge-smoke.mjs   (ZCODE_BINARY=/path/to/zcode.cjs to use another ZCode)
// Exit code 0 only when every check passes.
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { startFakeAnthropic, userText, toolResultFor, systemOf, textOf } from '../packages/zcode-bridge/test-support/fake-anthropic.mjs'
import { encryptCredential } from '../packages/zcode-bridge/src/accounts.js'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..', '..')
const stderr = []
const childProcess = require('node:child_process')
const originalSpawn = childProcess.spawn
childProcess.spawn = (...args) => {
  const child = originalSpawn(...args)
  child.stderr?.on('data', (chunk) => { stderr.push(String(chunk)); if (stderr.length > 400) stderr.splice(0, 100) })
  return child
}
const { CodexClient } = require(path.join(root, 'app/electron/codex.cjs'))
const { respondToApproval } = require(path.join(root, 'app/electron/respond-approval.cjs'))
const { reduce, emptyState } = await import(path.join(root, 'app/src/state.js'))
const { usagePresentation } = await import(path.join(root, 'app/electron/usage-model.mjs'))
const { skillRows, mcpRows, pluginRows } = await import(path.join(root, 'app/src/customize-model.mjs'))
const { modelMenuSections } = await import(path.join(root, 'app/src/model-menu-model.mjs'))
const { sessionCore, coreForEngine } = await import(path.join(root, 'app/electron/core-registry.mjs'))

const BRIDGE = process.env.ZCODE_BRIDGE || path.join(root, 'harness/packages/zcode-bridge/bin/app-server.mjs')
const AGENT = process.env.ZCODE_BINARY || path.join(root, 'work/agents/zcode-bridge/zcode-3.14.3/glm/zcode.cjs')
const FAKE_MCP = path.join(root, 'harness/packages/zcode-bridge/test-support/fake-mcp.mjs')
if (!fs.existsSync(AGENT)) { console.error(`ZCode runtime not found at ${AGENT} (set ZCODE_BINARY).`); process.exit(2) }

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cd-zcode-smoke-'))
const ws = path.join(home, 'project')
fs.mkdirSync(ws, { recursive: true })
fs.writeFileSync(path.join(ws, 'a.txt'), 'one\ntwo\n')
fs.writeFileSync(path.join(ws, 'notes.md'), '# Notes\nmentioned-file-content\n')
// A 1×1 PNG: an image GLM opens with Read, and a screenshot pasted while it works.
fs.writeFileSync(path.join(ws, 'pic.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'))
execFileSync('git', ['init', '-q'], { cwd: ws })
execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'add', '.'], { cwd: ws })
execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], { cwd: ws })
const skillDir = path.join(home, '.zcode', 'skills', 'smoke-skill')
fs.mkdirSync(skillDir, { recursive: true })
fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: smoke-skill\ndescription: A skill the smoke test installs.\n---\nSay SKILL-USED.\n')
const pluginDir = path.join(home, 'plugins', 'smoke-plugin')
fs.mkdirSync(path.join(pluginDir, '.zcode-plugin'), { recursive: true })
fs.mkdirSync(path.join(pluginDir, 'skills', 'plugin-hello'), { recursive: true })
fs.writeFileSync(path.join(pluginDir, '.zcode-plugin', 'plugin.json'), JSON.stringify({ name: 'smoke-plugin', version: '0.1.0', description: 'A local plugin for the smoke test.', skills: 'skills' }))
fs.writeFileSync(path.join(pluginDir, 'skills', 'plugin-hello', 'SKILL.md'), '---\nname: plugin-hello\ndescription: Says hello from a plugin.\n---\nHello.\n')
const officialPluginDir = path.join(home, 'plugins', 'official-smoke')
fs.mkdirSync(path.join(officialPluginDir, '.zcode-plugin'), { recursive: true })
fs.writeFileSync(path.join(officialPluginDir, '.zcode-plugin', 'plugin.json'), JSON.stringify({ name: 'official-smoke', version: '0.1.0', description: 'An official Z.ai MCP service stand-in (zcode_official auth).' }))
const stateDir = path.join(home, 'bridge-state')
const CREDENTIAL_SECRET = 'smoke-secret'
let retries = 0
// The 5-hour window's used tokens (of 1000): QUOTA_OUT uses it up, so the turn's failure refetches the quota.
let quotaUsed = 250
// The ExitPlanMode tool result GLM got back after GLM's self-entered plan was approved.
let selfPlanExit = null

// ------------------------------------------------------------------ scripted model

const lastUserOf = (body) => textOf([...(body.messages ?? [])].reverse().find((m) => m.role === 'user')?.content)
const fake = await startFakeAnthropic(async (body, req) => {
  const typed = userText(body)
  const all = JSON.stringify(body.messages ?? [])
  if (req.headers['x-api-key'] === 'sk-bad' || /sk-bad/.test(String(req.headers.authorization ?? ''))) return { error: 'invalid api key', status: 401 }
  if (/RETRY_ME/.test(typed) && ++retries <= 2) return { error: 'rate limit: too many requests', status: 429 }
  if (/STEER_TOOL/.test(typed) && !toolResultFor(body, 'Bash')) return { delayMs: 1500, tool: { name: 'Bash', input: { command: 'sleep 2; echo ok', description: 'wait' } } }
  if (/Generate a concise title/.test(systemOf(body))) return { text: 'Smoke title' }
  // A background sub-agent that keeps working until it is stopped.
  if (/BGCHILD/.test(textOf(body.messages?.[0]?.content))) return { hang: true }
  if (/CHILDTASK/.test(textOf(body.messages?.[0]?.content)) || /CHILDTASK/.test(typed)) {
    if (!toolResultFor(body, 'Bash')) return { thinking: 'child plans', text: 'child pre-tool text', tool: { name: 'Bash', input: { command: 'echo child-bash', description: 'child' } } }
    return { thinking: 'child reflects', text: 'child finished' }
  }
  if (/side question/i.test(systemOf(body)) || /SIDE_Q/.test(lastUserOf(body))) return { text: 'Side answer: the file is a.txt' }
  if (/HANG/.test(typed)) return { hang: true }
  if (/SCHEDULE_IT/.test(typed) && !toolResultFor(body, 'CronCreate')) return { tool: { name: 'CronCreate', input: { cron: '0 9 * * 1-5', prompt: 'run the tests', title: 'Weekday tests' } } }
  if (/SCHEDULE_IT/.test(typed)) return { text: `scheduled? ${JSON.stringify(toolResultFor(body, 'CronCreate'))}` }
  if (/FAIL_AUTH/.test(typed)) return { error: 'invalid api key', status: 401 }
  if (/QUOTA_OUT/.test(typed)) { quotaUsed = 1000; return { status: 429, error: 'usage limit', errorBody: { error: { code: '1308', message: 'Usage limit reached for 5 hour. Your limit will reset at 2026-10-05 18:00:00' } } } }
  if (/SLOW/.test(typed) && !/STEERED/.test(all)) return { delayMs: 2500, text: 'slow done' }
  if (/RUN_BASH/.test(typed) && !toolResultFor(body, 'Bash')) return { thinking: 'I should run it', text: 'Running.', tool: { name: 'Bash', input: { command: 'echo hi > out.txt && cat out.txt', description: 'Write out.txt' } } }
  if (/RUN_OTHER/.test(typed) && !toolResultFor(body, 'Bash')) return { tool: { name: 'Bash', input: { command: `echo ${typed.split(' ').pop()} > other.txt`, description: 'Write other.txt' } } }
  if (/EDIT_FILE/.test(typed) && !toolResultFor(body, 'Read')) return { tool: { name: 'Read', input: { file_path: path.join(ws, 'a.txt') } } }
  if (/EDIT_FILE/.test(typed) && !toolResultFor(body, 'Edit')) return { tool: { name: 'Edit', input: { file_path: path.join(ws, 'a.txt'), old_string: 'two', new_string: 'TWO' } } }
  if (/WRITE_NEW/.test(typed) && !toolResultFor(body, 'Write')) return { tool: { name: 'Write', input: { file_path: path.join(ws, 'new.txt'), content: 'brand new\n' } } }
  if (/REWIND_WRITE (\w+)/.test(typed) && !toolResultFor(body, 'Write')) return { tool: { name: 'Write', input: { file_path: path.join(ws, `rewind-${/REWIND_WRITE (\w+)/.exec(typed)[1]}.txt`), content: 'made by GLM\n' } } }
  if (/WRITE_OUTSIDE/.test(typed) && !toolResultFor(body, 'Write')) return { tool: { name: 'Write', input: { file_path: path.join(home, 'outside.txt'), content: 'outside\n' } } }
  if (/TODO/.test(typed) && !toolResultFor(body, 'TodoWrite')) return { tool: { name: 'TodoWrite', input: { todos: [{ content: 'Step one', status: 'in_progress', priority: 'high' }, { content: 'Step two', status: 'pending', priority: 'low' }] } } }
  if (/ASK_Q/.test(typed) && !toolResultFor(body, 'AskUserQuestion')) return { tool: { name: 'AskUserQuestion', input: { questions: [{ question: 'Pick a color?', header: 'Color', options: [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: 'cool' }], multiSelect: false }] } } }
  if (/PLAN_IT/.test(typed) && !toolResultFor(body, 'ExitPlanMode')) return { text: 'Here is my plan.', tool: { name: 'ExitPlanMode', input: { plan: '1. Edit a.txt\n2. Run tests' } } }
  if (/BG_AGENT/.test(typed) && !toolResultFor(body, 'Agent')) return { tool: { name: 'Agent', input: { description: 'Background child', prompt: 'BGCHILD keep going', subagent_type: 'general-purpose', run_in_background: true } } }
  if (/BG_AGENT/.test(typed)) return { delayMs: 6000, text: 'parent kept working' }
  if (/SELF_PLAN/.test(typed) && !toolResultFor(body, 'EnterPlanMode')) return { text: 'Let me plan first.', tool: { name: 'EnterPlanMode', input: {} } }
  if (/SELF_PLAN/.test(typed) && !toolResultFor(body, 'ExitPlanMode')) return { tool: { name: 'ExitPlanMode', input: { plan: '1. Self-made plan' } } }
  if (/SELF_PLAN/.test(typed)) { selfPlanExit = toolResultFor(body, 'ExitPlanMode'); return { text: 'Plan approved, working.' } }
  if (/AGENT_GO/.test(typed) && !toolResultFor(body, 'Agent')) return { tool: { name: 'Agent', input: { description: 'Child job', prompt: 'CHILDTASK say hi', subagent_type: 'general-purpose' } } }
  if (/MCP_CALL/.test(typed) && !toolResultFor(body, 'mcp__fake__echo')) return { tool: { name: 'mcp__fake__echo', input: { text: 'ping' } } }
  if (/READ_PNG/.test(typed) && !toolResultFor(body, 'Read')) return { tool: { name: 'Read', input: { file_path: path.join(ws, 'pic.png') } } }
  if (/WEB_FETCH/.test(typed) && !toolResultFor(body, 'WebFetch')) return { tool: { name: 'WebFetch', input: { url: `${fake.url}/page`, prompt: 'summarize' } } }
  if (/COUNT_BASH/.test(typed) && !toolResultFor(body, 'Bash')) return { tool: { name: 'Bash', input: { command: 'for i in 1 2 3; do echo line$i; sleep 1; done', description: 'Count slowly' } } }
  if (/BG_BASH/.test(typed) && !toolResultFor(body, 'Bash')) return { tool: { name: 'Bash', input: { command: 'sleep 2; echo bg-done', description: 'background job', run_in_background: true } } }
  if (/<task-notification>/.test(typed)) return { text: 'Background job finished.' }
  return { text: ['Hello ', 'from GLM.'] }
}, { quota: () => ({ success: true, code: 200, data: { level: 'pro', limits: [
  { type: 'TOKENS_LIMIT', unit: 3, number: 5, usage: 1000, currentValue: quotaUsed, remaining: 1000 - quotaUsed, nextResetTime: Date.now() + 3600e3 },
  { type: 'TOKENS_LIMIT', unit: 6, number: 1, usage: 10000, currentValue: 1000, remaining: 9000, nextResetTime: Date.now() + 5 * 86400e3 },
] } }) })
fs.writeFileSync(path.join(officialPluginDir, '.mcp.json'), JSON.stringify({ mcpServers: { finance_smoke: { type: 'http', url: `${fake.url}/api/v1/mcp/server/finance_smoke`, auth: { type: 'zcode_official', provider: 'jwt_token' } } } }))
const requestsSince = (index) => fake.requests.slice(index).filter((r) => r.headers['x-zcode-session-type'] !== 'other')

// ------------------------------------------------------------------ client

let client = null
let events = []
let appState = emptyState
let waiters = []
// ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS: ZCode's own switch that lets an http loopback stand in for the ZCode API origin.
const env = { HOME: home, ZCODE_CREDENTIAL_SECRET: CREDENTIAL_SECRET, ZCODE_OFFICIAL_MCP_DEV_TRUSTED_ORIGINS: fake.url, CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN: fake.url, CODE_DESKTOP_ZCODE_QUOTA_ORIGIN: fake.url, CODE_DESKTOP_AGENT_BINARY: AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_AGENT_VERSION: '3.14.3', CODE_DESKTOP_BRIDGE_STATE: stateDir, CODE_DESKTOP_NODE_BINARY: process.execPath, NO_PROXY: '*' }

async function connect() {
  events = []
  appState = emptyState
  client = new CodexClient({ binary: BRIDGE, initializeTimeout: 120000, env })
  client.on('event', (event) => {
    events.push(event)
    if (event.kind === 'notification') { try { appState = reduce(appState, { event }) } catch (error) { console.log(`reducer threw on ${event.method}: ${error.message}`) } }
    for (const waiter of [...waiters]) waiter(event)
  })
  return client.start()
}

function waitFor(predicate, ms = 45000, from = 0) {
  const hit = events.slice(from).find(predicate)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiters = waiters.filter((w) => w !== waiter); reject(new Error(`timed out waiting (${predicate.toString().slice(0, 120)})`)) }, ms)
    const waiter = (event) => { if (predicate(event)) { clearTimeout(timer); waiters = waiters.filter((w) => w !== waiter); resolve(event) } }
    waiters.push(waiter)
  })
}
const turnDone = (threadId, from = 0) => waitFor((e) => e.method === 'turn/completed' && e.params.threadId === threadId, 60000, from)
const nextRequest = (method, from = 0) => waitFor((e) => e.kind === 'request' && e.method === method, 45000, from)
const answer = (event, payload) => { const result = respondToApproval(client, { id: event.id, expected: event.bridgeApproval, ...payload }); assert.equal(result.ok, true, JSON.stringify(result)); }
const itemsOf = (threadId) => appState.items[threadId] ?? []
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const turnParams = (threadId, text, mode = 'auto', extra = {}) => ({
  threadId, input: [{ type: 'text', text, text_elements: [] }], cwd: ws, approvalsReviewer: 'user',
  approvalPolicy: mode === 'bypass' ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request',
  sandboxPolicy: mode === 'bypass' ? { type: 'dangerFullAccess' } : mode === 'plan' ? { type: 'readOnly', networkAccess: false } : { type: 'workspaceWrite', writableRoots: [ws], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false },
  codeDesktop: { permissionMode: mode, afterPlan: 'auto', ...(extra.codeDesktop ?? {}) }, ...extra.top,
})
async function newThread(mode = 'auto', codeDesktop = {}) {
  const { thread } = await client.request('thread/start', {
    cwd: ws, approvalsReviewer: 'user', approvalPolicy: mode === 'bypass' ? 'never' : mode === 'ask' || mode === 'acceptEdits' ? 'untrusted' : 'on-request',
    sandbox: mode === 'bypass' ? 'danger-full-access' : mode === 'plan' ? 'read-only' : 'workspace-write', codeDesktop: { permissionMode: mode, afterPlan: 'auto', ...codeDesktop },
  })
  return thread
}
async function runTurn(threadId, text, mode = 'auto', extra = {}) {
  const from = events.length
  const { turn } = await client.request('turn/start', turnParams(threadId, text, mode, extra))
  const done = await turnDone(threadId, from)
  return { turn, done: done.params.turn, from }
}

// ------------------------------------------------------------------ checks

let passed = 0
const failed = []
async function check(name, fn) {
  try { await fn(); passed++; console.log(`ok - ${name}`) } catch (error) { failed.push(name); console.log(`not ok - ${name}: ${error?.stack?.split('\n').slice(0, 3).join(' | ') || error}`) }
}

let init
let mainThread
let customThread
let deletedId
let childThreadId
try {
  init = await connect()
  await check('initialize reports the zcode engine and capabilities', async () => {
    assert.equal(init.engine, 'zcode')
    assert.match(init.engineVersion, /^\d+\.\d+\.\d+/)
    assert.equal(coreForEngine(init.engine).id, 'zcode')
    for (const key of ['customization', 'permissionHints', 'systemPromptPreview', 'livePermissions', 'toolSelection', 'deleteHistory', 'codeStats', 'skillToggle', 'mcpConfigWrite']) assert.equal(init.capabilities[key], true, key)
    assert.ok(!init.capabilities.unsupportedMethods.includes('thread/revert'), 'rewind runs on ZCode’s own conversation rewind')
    assert.ok(init.capabilities.unsupportedMethods.includes('thread/rollback'))
    assert.equal(init.capabilities.structuredOutput, false)
    // ZCode's own dynamic workflows (zcode-bridge workflows.js; tests/zcode-bridge-workflows-smoke.mjs), in every mode.
    assert.equal(init.capabilities.modelWorkflows, true)
    assert.equal(Object.hasOwn(init.capabilities, 'workflowsNeedBypass'), false)
    assert.ok(init.configPath.endsWith('.zcode/cli/config.json'))
  })

  await check('account: API-key sign-in writes a Coding Plan provider and account/read reports it', async () => {
    assert.equal((await client.request('account/read', {})).account, null)
    const login = await client.request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke', codeDesktop: { template: 'zai-api', baseUrl: fake.url } })
    assert.equal(login.type, 'apiKey')
    await waitFor((e) => e.method === 'account/updated')
    const account = await client.request('account/read', {})
    assert.equal(account.account.type, 'apiKey')
    assert.equal(account.zcode.apiKeyProviders[0].templateId, 'zai-api')
    const personal = JSON.parse(fs.readFileSync(path.join(home, '.zcode/v2/provider_config.json'), 'utf8'))
    assert.equal(personal.config.providerConfigRules.providerRules[0].config.access.apiKey, 'sk-smoke')
  })

  await check('account: a key the provider rejects is refused inline (ZCode’s key check); the earlier key stays signed in', async () => {
    const from = events.length
    await assert.rejects(client.request('account/login/start', { type: 'apiKey', apiKey: 'sk-bad', codeDesktop: { template: 'zai-api', baseUrl: fake.url } }), (error) => /This API key was rejected/.test(error.message))
    assert.ok(!events.slice(from).some((e) => e.method === 'account/updated'), 'no account change announced')
    const personal = JSON.parse(fs.readFileSync(path.join(home, '.zcode/v2/provider_config.json'), 'utf8'))
    assert.equal(personal.config.providerConfigRules.providerRules[0].config.access.apiKey, 'sk-smoke')
    assert.equal((await client.request('account/read', {})).account.type, 'apiKey')
  })

  await check('account: Coding Plan browser sign-in starts `zcode login` and hands back its authorize URL; cancel ends it', async () => {
    const started = await client.request('account/login/start', { type: 'chatgpt' })
    assert.equal(started.type, 'chatgpt')
    assert.equal(started.authUrl, 'https://z.ai/oauth/authorize?flow=fake-flow')
    assert.deepEqual(await client.request('account/login/cancel', { loginId: started.loginId }), { status: 'canceled' })
    const completed = await waitFor((e) => e.method === 'account/login/completed' && e.params.loginId === started.loginId)
    assert.equal(completed.params.success, false)
  })

  let models
  await check('model/list: GLM models with efforts and a default (model menu)', async () => {
    models = (await client.request('model/list', { limit: 100 })).data
    const glm = models.find((m) => m.model === 'code-desktop-zai-api/GLM-5.3')
    assert.ok(glm, JSON.stringify(models.map((m) => m.model)))
    assert.equal(glm.displayName, 'GLM-5.3')
    assert.deepEqual(glm.supportedReasoningEfforts.map((e) => e.reasoningEffort), ['low', 'high', 'max'])
    assert.ok(models.some((m) => m.isDefault))
    assert.ok(models.some((m) => /Flash/.test(m.displayName)))
    const sections = modelMenuSections({ models })
    assert.ok(JSON.stringify(sections).includes('GLM-5.3'))
  })

  await check('rate limits: Coding Plan 5-hour and weekly windows with reset times (usage popover)', async () => {
    const limits = await client.request('account/rateLimits/read', {})
    assert.equal(limits.rateLimits.primary.usedPercent, 25)
    assert.equal(limits.rateLimits.primary.windowDurationMins, 300)
    assert.ok(limits.rateLimits.primary.resetsAt > Date.now() / 1000)
    assert.equal(limits.rateLimits.secondary.windowDurationMins, 10080)
    const view = usagePresentation({ account: await client.request('account/read', {}), limits, tokenUsage: null })
    assert.equal(view.rows.length, 2)
    assert.ok(view.rows.every((row) => Number.isFinite(row.resetsAt)))
  })

  await check('system prompt preview before any session: the exact ZCode prompt, no model call', async () => {
    const before = fake.requests.length
    const preview = await client.request('codeDesktop/systemPrompt/preview', { cwd: ws })
    assert.match(preview.text, /You are ZCode/)
    assert.equal(preview.custom, false)
    assert.ok(preview.tools.includes('Bash'))
    assert.equal(fake.requests.length, before, 'the preview must not reach the model')
    const custom = await client.request('codeDesktop/systemPrompt/preview', { cwd: ws, codeDesktop: { customization: { systemPrompt: 'You are SMOKE.', instructions: 'Prefer tabs.' } } })
    assert.match(custom.text, /^You are SMOKE\./)
    assert.match(custom.text, /Prefer tabs\./)
    assert.equal(custom.custom, true)
  })

  // ---------------------------------------------------------- streaming, tools, approvals
  mainThread = await newThread('ask')
  await check('thread/start: a ZCode session attributed to the zcode core', async () => {
    assert.match(mainThread.id, /^sess_/)
    assert.match(mainThread.cliVersion, /^zcode \d/)
    assert.equal(sessionCore(mainThread), 'zcode')
    assert.equal(mainThread.cwd, fs.realpathSync(ws))
  })

  await check('streaming: reasoning, agent message deltas, token usage with context window', async () => {
    const from = events.length
    const index = fake.requests.length
    const { done } = await runTurn(mainThread.id, 'HELLO there', 'ask')
    assert.equal(done.status, 'completed')
    // Scheduled / off-peak tasks need ZCode desktop's host, so the model is never offered them (no tool selection here).
    const offered = requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main').body.tools.map((t) => t.name)
    assert.ok(offered.includes('Read'), offered.join(','))
    assert.ok(!offered.some((name) => /^(Cron|OffPeak)/.test(name)), offered.join(','))
    const items = itemsOf(mainThread.id)
    assert.ok(items.some((i) => i.type === 'userMessage'))
    assert.ok(items.some((i) => i.type === 'agentMessage' && i.text === 'Hello from GLM.'))
    assert.ok(events.slice(from).some((e) => e.method === 'item/agentMessage/delta'))
    const usage = events.slice(from).filter((e) => e.method === 'thread/tokenUsage/updated').at(-1)
    assert.ok(usage.params.tokenUsage.modelContextWindow > 0)
    assert.ok(usage.params.tokenUsage.last.totalTokens > 0)
  })

  await check('ask mode: a write command asks (commandExecution approval), output streams into the card', async () => {
    const from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'RUN_BASH now', 'ask'))
    const req = await nextRequest('item/commandExecution/requestApproval', from)
    assert.equal(req.params.command, 'echo hi > out.txt && cat out.txt')
    assert.equal(req.params.threadId, mainThread.id)
    answer(req, { decision: 'accept' })
    await turnDone(mainThread.id, from)
    const command = itemsOf(mainThread.id).find((i) => i.id === req.params.itemId)
    assert.equal(command.type, 'commandExecution')
    assert.equal(command.status, 'completed')
    assert.equal(command.aggregatedOutput, 'hi')
    assert.ok(itemsOf(mainThread.id).some((i) => i.type === 'reasoning' && JSON.stringify(i).includes('I should run it')))
    assert.equal(fs.readFileSync(path.join(ws, 'out.txt'), 'utf8').trim(), 'hi')
  })

  await check('one card per request: ZCode re-sends an unanswered approval / question every few seconds; OpenClaude Desktop shows it once', async () => {
    let from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'RUN_OTHER resent', 'ask'))
    const req = await nextRequest('item/commandExecution/requestApproval', from)
    await sleep(12000) // ZCode has re-sent it at 1, 2, 4 and 8 s by now
    const cards = () => events.slice(from).filter((e) => e.kind === 'request')
    assert.equal(cards().length, 1, `one card, not ${cards().length}`)
    answer(req, { decision: 'accept' })
    await turnDone(mainThread.id, from)
    await sleep(2500)
    assert.equal(cards().length, 1, 'no card after the answer')
    assert.equal(fs.readFileSync(path.join(ws, 'other.txt'), 'utf8').trim(), 'resent')
    assert.equal(appState.items[mainThread.id].find((i) => i.id === req.params.itemId)?.status, 'completed')
    from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'ASK_Q resent', 'ask'))
    const question = await nextRequest('item/tool/requestUserInput', from)
    await sleep(9000)
    assert.equal(cards().length, 1, `one question card, not ${cards().length}`)
    answer(question, { answers: { q0: { answers: ['Red'] } } })
    await turnDone(mainThread.id, from)
    await sleep(1500)
    assert.equal(cards().length, 1)
  })

  await check('ask mode: "allow for this session" covers the same command next time', async () => {
    let from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'RUN_BASH again', 'ask'))
    const req = await nextRequest('item/commandExecution/requestApproval', from)
    answer(req, { decision: 'acceptForSession' })
    await turnDone(mainThread.id, from)
    from = events.length
    await runTurn(mainThread.id, 'RUN_BASH third', 'ask')
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'), 'no second card')
  })

  await check('ask mode: file edit asks (fileChange approval); decline leaves the file untouched', async () => {
    const from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'EDIT_FILE please', 'ask'))
    const req = await nextRequest('item/fileChange/requestApproval', from)
    answer(req, { decision: 'decline' })
    await turnDone(mainThread.id, from)
    const change = itemsOf(mainThread.id).find((i) => i.id === req.params.itemId)
    assert.equal(change.type, 'fileChange')
    assert.ok(['declined', 'failed'].includes(change.status))
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\ntwo\n')
  })

  await check('acceptEdits: edits run without a card, diff in the card and the changes pane (turn/diff/updated)', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'EDIT_FILE please', 'acceptEdits')
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'))
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\nTWO\n')
    const change = [...itemsOf(mainThread.id)].reverse().find((i) => i.type === 'fileChange')
    assert.equal(change.status, 'completed')
    assert.match(change.changes[0].diff, /-two\n\+TWO/)
    const diff = events.slice(from).find((e) => e.method === 'turn/diff/updated')
    assert.match(diff.params.diff, /diff --git a\/a.txt b\/a.txt/)
    assert.ok(appState.diffs[mainThread.id])
  })

  await check('acceptEdits and auto still ask before a side-effect command (never weaker than the mode)', async () => {
    for (const mode of ['acceptEdits', 'auto']) {
      const from = events.length
      await client.request('turn/start', turnParams(mainThread.id, `RUN_OTHER ${mode}`, mode))
      const req = await nextRequest('item/commandExecution/requestApproval', from)
      answer(req, { decision: 'accept' })
      await turnDone(mainThread.id, from)
    }
  })

  await check('command output streams into the card (item/commandExecution/outputDelta)', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'COUNT_BASH count', 'bypass')
    const deltas = events.slice(from).filter((e) => e.method === 'item/commandExecution/outputDelta').map((e) => e.params.delta).join('')
    assert.match(deltas, /line1\nline2/)
    const command = [...itemsOf(mainThread.id)].reverse().find((i) => i.type === 'commandExecution')
    assert.equal(command.aggregatedOutput, 'line1\nline2\nline3')
  })

  await check('Write of a new file: fileChange add', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'WRITE_NEW file', 'acceptEdits')
    const change = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'fileChange').at(-1).params.item
    assert.equal(change.changes[0].kind.type, 'add')
    assert.equal(fs.readFileSync(path.join(ws, 'new.txt'), 'utf8'), 'brand new\n')
  })

  await check('bypass: no approval at all', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'RUN_BASH bypass', 'bypass')
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'))
  })

  await check('plan mode: edits are refused without touching the file', async () => {
    fs.writeFileSync(path.join(ws, 'a.txt'), 'one\ntwo\n')
    const from = events.length
    await runTurn(mainThread.id, 'EDIT_FILE in plan', 'plan')
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\ntwo\n')
    const change = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'fileChange').at(-1)?.params.item
    assert.ok(!change || change.status !== 'completed')
  })

  await check('plan card: ExitPlanMode → plan item + plan-review question → Approve switches to the chosen mode', async () => {
    const from = events.length
    await client.request('turn/start', turnParams(mainThread.id, 'PLAN_IT now', 'plan'))
    const req = await nextRequest('item/tool/requestUserInput', from)
    assert.equal(req.params.questions[0].id, 'plan-review')
    const planItem = events.slice(from).find((e) => e.method === 'item/completed' && e.params.item.type === 'plan')
    assert.equal(planItem.params.item.id, `plan-${req.params.itemId}`)
    assert.match(planItem.params.item.text, /Edit a.txt/)
    assert.match(appState.planDocs[mainThread.id]?.text ?? JSON.stringify(appState.planDocs[mainThread.id]), /Edit a.txt/)
    answer(req, { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'ask' } })
    await turnDone(mainThread.id, from)
    const after = events.length
    await client.request('turn/start', { threadId: mainThread.id, input: [{ type: 'text', text: 'RUN_OTHER afterplan', text_elements: [] }] })
    const card = await nextRequest('item/commandExecution/requestApproval', after)
    answer(card, { decision: 'accept' })
    await turnDone(mainThread.id, after)
  })

  await check('plan entered by GLM (EnterPlanMode): the app is told, the session is Plan, the plan card’s mode choice applies', async () => {
    const thread = await newThread('acceptEdits')
    const from = events.length
    selfPlanExit = null
    await client.request('turn/start', turnParams(thread.id, 'SELF_PLAN refactor', 'acceptEdits'))
    const mode = await waitFor((e) => e.method === 'codeDesktop/thread/mode' && e.params.threadId === thread.id, 45000, from)
    assert.deepEqual(mode.params, { threadId: thread.id, permission: 'plan', afterPlan: 'acceptEdits' })
    const req = await nextRequest('item/tool/requestUserInput', from)
    assert.equal(req.params.questions[0].id, 'plan-review')
    answer(req, { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'bypass' } })
    await turnDone(thread.id, from)
    assert.ok(selfPlanExit && !selfPlanExit.is_error, `ExitPlanMode left plan mode: ${JSON.stringify(selfPlanExit)}`)
    // The card chose Bypass: the next turn (no mode params) runs a command without asking.
    const after = events.length
    fs.rmSync(path.join(ws, 'other.txt'), { force: true })
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'RUN_OTHER selfplan', text_elements: [] }] })
    await turnDone(thread.id, after)
    assert.ok(!events.slice(after).some((e) => e.kind === 'request' && /requestApproval$/.test(e.method)), 'no approval in Bypass')
    assert.equal(fs.readFileSync(path.join(ws, 'other.txt'), 'utf8').trim(), 'selfplan')
  })

  await check('user questions: AskUserQuestion → item/tool/requestUserInput → the answer reaches the model', async () => {
    const from = events.length
    const index = fake.requests.length
    await client.request('turn/start', turnParams(mainThread.id, 'ASK_Q time', 'ask'))
    const req = await nextRequest('item/tool/requestUserInput', from)
    assert.equal(req.params.questions[0].question, 'Pick a color?')
    assert.deepEqual(req.params.questions[0].options.map((o) => o.label), ['Red', 'Blue'])
    answer(req, { answers: { q0: { answers: ['Blue'] } } })
    await turnDone(mainThread.id, from)
    assert.ok(requestsSince(index).some((r) => /Blue/.test(JSON.stringify(r.body.messages))))
  })

  await check('todo list → turn/plan/updated (plan checklist)', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'TODO list', 'ask')
    const plan = events.slice(from).find((e) => e.method === 'turn/plan/updated')
    assert.deepEqual(plan.params.plan, [{ step: 'Step one', status: 'inProgress' }, { step: 'Step two', status: 'pending' }])
    assert.ok(appState.plans[mainThread.id])
  })

  await check('sub-agent: Agent tool → spawned child thread with its own tool items, collab card on the parent', async () => {
    const from = events.length
    await runTurn(mainThread.id, 'AGENT_GO child', 'bypass')
    const started = events.slice(from).find((e) => e.method === 'thread/started' && e.params.thread.parentThreadId === mainThread.id)
    assert.ok(started, 'child thread/started')
    const childId = started.params.thread.id
    childThreadId = childId
    assert.ok(started.params.thread.source.subAgent.thread_spawn.parent_thread_id === mainThread.id)
    const childBash = events.slice(from).find((e) => e.method === 'item/completed' && e.params.threadId === childId && e.params.item.type === 'commandExecution')
    assert.equal(childBash.params.item.aggregatedOutput, 'child-bash')
    const collab = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'collabAgentToolCall').at(-1).params.item
    assert.deepEqual(collab.receiverThreadIds, [childId])
    assert.equal(collab.tool, 'spawnAgent')
    assert.ok(events.slice(from).some((e) => e.method === 'turn/completed' && e.params.threadId === childId))
  })

  await check('sub-agent: its thinking and text reach its thread live, in order, before it ends; a reread shows ZCode’s full record with the same items', async () => {
    const shown = (items) => items.filter((i) => i.type !== 'userMessage').map((i) => `${i.type}:${i.text ?? i.summary?.join('') ?? i.command ?? ''}`)
    const expected = ['reasoning:child plans', 'agentMessage:child pre-tool text', 'commandExecution:echo child-bash', 'reasoning:child reflects', 'agentMessage:child finished']
    assert.deepEqual(shown(itemsOf(childThreadId)), expected, 'the live child transcript (app state)')
    const childEvents = events.filter((e) => e.params?.threadId === childThreadId)
    const answered = childEvents.findIndex((e) => e.method === 'item/completed' && e.params.item.text === 'child finished')
    assert.ok(answered >= 0 && answered < childEvents.findIndex((e) => e.method === 'turn/completed'), 'the answer comes before the sub-agent’s turn ends')
    const read = await client.request('thread/read', { threadId: childThreadId, includeTurns: true })
    assert.equal(read.thread.turns.length, 1, 'no empty leading turn')
    assert.deepEqual(shown(read.thread.turns[0].items), expected)
    assert.equal(read.thread.turns[0].items[0].type, 'userMessage')
    const liveIds = itemsOf(childThreadId).map((i) => i.id)
    assert.deepEqual(read.thread.turns[0].items.map((i) => i.id), liveIds, 'the reread uses the live item ids (no duplicate rows)')
    assert.equal(read.thread.turns[0].id, itemsOf(childThreadId)[0].turnId)
  })

  await check('mentions attach the file; skills ride along as /skill', async () => {
    const index = fake.requests.length
    const from = events.length
    await client.request('turn/start', { ...turnParams(mainThread.id, 'look at this', 'ask'), input: [{ type: 'text', text: 'look at this', text_elements: [] }, { type: 'mention', name: 'notes.md', path: path.join(ws, 'notes.md') }] })
    await turnDone(mainThread.id, from)
    assert.ok(requestsSince(index).some((r) => /mentioned-file-content|notes\.md/.test(JSON.stringify(r.body.messages))))
    const user = events.slice(from).find((e) => e.method === 'item/completed' && e.params.item.type === 'userMessage').params.item
    assert.ok(user.content.some((part) => part.type === 'mention'))
  })

  await check('errors: a provider failure ends the turn failed with a typed TurnError', async () => {
    const thread = await newThread('bypass')
    const { done } = await runTurn(thread.id, 'FAIL_AUTH please', 'bypass')
    assert.equal(done.status, 'failed')
    assert.ok(done.error?.message)
    assert.equal(done.error.codexErrorInfo, 'unauthorized')
  })

  await check('rate limits: a turn that hits the plan limit sends account/rateLimits/updated (composer usage notice)', async () => {
    const thread = await newThread('bypass')
    const { done, from } = await runTurn(thread.id, 'QUOTA_OUT please', 'bypass')
    try {
      assert.equal(done.status, 'failed')
      // GLM's own plan-limit error (code 1308) as ZCode relays it.
      assert.equal(done.error.codexErrorInfo, 'usageLimitExceeded', JSON.stringify(done.error))
      assert.equal(done.error.additionalDetails, '1308')
      const update = await waitFor((e) => e.method === 'account/rateLimits/updated', 15000, from)
      assert.equal(update.params.rateLimits.limitId, 'codex')
      assert.equal(update.params.rateLimits.primary.usedPercent, 100)
      assert.equal(update.params.rateLimits.primary.windowDurationMins, 300)
    } finally { quotaUsed = 250 }
  })

  await check('turn/interrupt stops a running turn; a pending approval is resolved by the server', async () => {
    const thread = await newThread('ask')
    let from = events.length
    await client.request('turn/start', turnParams(thread.id, 'RUN_BASH wait', 'ask'))
    const req = await nextRequest('item/commandExecution/requestApproval', from)
    await client.request('turn/interrupt', { threadId: thread.id, turnId: req.params.turnId })
    await waitFor((e) => e.kind === 'resolved' && e.id === req.id, 15000, from)
    await turnDone(thread.id, from)
    from = events.length
    await client.request('turn/start', turnParams(thread.id, 'HANG forever', 'ask'))
    await waitFor((e) => e.method === 'turn/started' && e.params.threadId === thread.id, 15000, from)
    await sleep(800)
    await client.request('turn/interrupt', { threadId: thread.id })
    const done = await turnDone(thread.id, from)
    assert.equal(done.params.turn.status, 'interrupted')
  })

  await check('turn/steer: guidance reaches the running turn', async () => {
    const thread = await newThread('bypass')
    const index = fake.requests.length
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'SLOW work', 'bypass'))
    const started = await waitFor((e) => e.method === 'turn/started' && e.params.threadId === thread.id, 15000, from)
    await sleep(500)
    const steer = await client.request('turn/steer', { threadId: thread.id, expectedTurnId: started.params.turn.id, input: [{ type: 'text', text: 'STEERED: also say goodbye', text_elements: [] }] })
    assert.equal(steer.turnId, started.params.turn.id)
    await turnDone(thread.id, from)
    await sleep(500)
    assert.ok(requestsSince(index).some((r) => /STEERED/.test(JSON.stringify(r.body.messages))), 'steer text reached a model request')
  })

  await check('turn/steer: the steered message shows in the transcript right away, in the running turn (same item as after a reload)', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'STEER_TOOL work', 'bypass'))
    const started = await waitFor((e) => e.method === 'turn/started' && e.params.threadId === thread.id, 15000, from)
    await sleep(400)
    await client.request('turn/steer', { threadId: thread.id, expectedTurnId: started.params.turn.id, input: [{ type: 'text', text: 'STEERED: also say goodbye', text_elements: [] }] })
    const steered = await waitFor((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'userMessage' && JSON.stringify(e.params.item.content).includes('STEERED'), 30000, from)
    await waitFor((e) => e.method === 'turn/completed' && e.params.threadId === thread.id, 60000, from)
    await sleep(1500)
    const live = itemsOf(thread.id).filter((i) => i.type === 'userMessage').map((i) => i.content.map((c) => c.text).join(''))
    assert.deepEqual(live, ['STEER_TOOL work', 'STEERED: also say goodbye'])
    const history = (await client.request('thread/read', { threadId: thread.id, includeTurns: true })).thread.turns.flatMap((t) => t.items).filter((i) => i.type === 'userMessage')
    assert.ok(history.some((i) => i.id === steered.params.item.id), 'the live item is the stored message')
  })

  await check('turn/steer with an image is not steerable (ZCode guidance is text only): the app queues it and it goes, image and all, as the next turn', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'SLOW image steer', 'bypass'))
    const started = await waitFor((e) => e.method === 'turn/started' && e.params.threadId === thread.id, 15000, from)
    const input = [{ type: 'text', text: 'IMAGE_STEER look at this', text_elements: [] }, { type: 'localImage', path: path.join(ws, 'pic.png') }]
    const refused = await client.request('turn/steer', { threadId: thread.id, expectedTurnId: started.params.turn.id, input }).then(() => null, (error) => error)
    assert.ok(refused, 'the steer is refused')
    assert.match(`${refused.message} ${JSON.stringify(refused.data ?? '')}`, /activeTurnNotSteerable/)
    const index = fake.requests.length
    await client.request('thread/queue/add', { threadId: thread.id, input, clientUserMessageId: 'cu-image' })
    await waitFor(() => events.slice(from).filter((e) => e.method === 'turn/completed' && e.params.threadId === thread.id).length >= 2, 60000)
    const request = requestsSince(index).find((r) => /IMAGE_STEER/.test(JSON.stringify(r.body.messages)))
    assert.ok(request, 'the queued message reached the model')
    // With its image: an image block, or ZCode's attachment note when the model takes text only (GLM-5.3 here).
    assert.match(JSON.stringify(request.body.messages), /"type":"image"|Attached image\/png: [^\]]*pic\.png/, 'with its image')
  })

  await check('Read of an image → imageView item (the picture GLM looked at), live and after a reload', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await runTurn(thread.id, 'READ_PNG please', 'bypass')
    const view = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'imageView').at(-1)?.params.item
    assert.ok(view, 'imageView item')
    assert.equal(fs.realpathSync(view.path), fs.realpathSync(path.join(ws, 'pic.png')))
    const read = await client.request('thread/read', { threadId: thread.id, includeTurns: true })
    assert.ok(read.thread.turns.flatMap((t) => t.items).some((i) => i.type === 'imageView' && i.id === view.id))
  })

  await check('retries: ZCode backing off after a 429 shows "Retrying (n/max)" (error willRetry:true), then the turn completes', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    const { done } = await runTurn(thread.id, 'RETRY_ME hi', 'bypass')
    const notices = events.slice(from).filter((e) => e.method === 'error' && e.params.threadId === thread.id)
    assert.ok(notices.length >= 1, 'a retry notice')
    assert.ok(notices.every((e) => e.params.willRetry === true), JSON.stringify(notices.map((e) => e.params)))
    assert.equal(notices[0].params.retry.attempt, 1)
    assert.equal(notices[0].params.error.codexErrorInfo, 'rateLimitExceeded')
    assert.equal(done.status, 'completed')
    assert.ok(!appState.retrying?.[thread.id], 'the status row ended')
    assert.ok(!appState.turnErrors?.[thread.id]?.[done.id], 'no error card')
  })

  await check('queued messages: queue while running, auto-start after the turn', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'SLOW queued', 'bypass'))
    await waitFor((e) => e.method === 'turn/started' && e.params.threadId === thread.id, 15000, from)
    const queued = await client.request('thread/queue/add', { threadId: thread.id, input: [{ type: 'text', text: 'HELLO after queue', text_elements: [] }], clientUserMessageId: 'cu-1' })
    assert.ok(queued.queuedSubmission.id)
    assert.equal((await client.request('thread/queue/list', { threadId: thread.id })).data.length, 1)
    await waitFor((e) => e.method === 'thread/queue/changed' && e.params.threadId === thread.id, 15000, from)
    await waitFor(() => events.slice(from).filter((e) => e.method === 'turn/completed' && e.params.threadId === thread.id).length >= 2, 60000)
    assert.ok(itemsOf(thread.id).some((i) => i.type === 'userMessage' && JSON.stringify(i.content).includes('HELLO after queue')))
  })

  await check('background sub-agent: Stop cancels only that sub-agent; the parent turn goes on', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await client.request('turn/start', turnParams(thread.id, 'BG_AGENT go', 'bypass'))
    const started = await waitFor((e) => e.method === 'thread/started' && e.params.thread.parentThreadId === thread.id, 45000, from)
    const childId = started.params.thread.id
    // The parent's own turn is still running (its next model reply is slow).
    await waitFor((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'collabAgentToolCall', 45000, from)
    await sleep(500)
    await client.request('turn/interrupt', { threadId: childId, turnId: `turn-${childId.replace(/^sess_subagent_/, '')}` })
    const childDone = await waitFor((e) => e.method === 'turn/completed' && e.params.threadId === childId, 20000, from)
    assert.equal(childDone.params.turn.status, 'interrupted')
    const parentDone = await turnDone(thread.id, from)
    assert.equal(parentDone.params.turn.status, 'completed', 'the parent turn was not stopped')
    assert.ok(events.slice(from).some((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'agentMessage' && /parent kept working/.test(e.params.item.text)))
    // Stopping it again (already stopped) is not an error.
    await client.request('turn/interrupt', { threadId: childId, turnId: childDone.params.turn.id })
  })

  await check('background terminals: run_in_background shows up and completes', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await runTurn(thread.id, 'BG_BASH go', 'bypass')
    const list = await client.request('thread/backgroundTerminals/list', { threadId: thread.id })
    const launch = events.slice(from).find((e) => e.method === 'item/started' && e.params.item.type === 'commandExecution' && e.params.item.processId)
    assert.ok(launch, 'launch item carries the task id as processId')
    assert.ok(list.data.length === 1 || events.slice(from).some((e) => e.method === 'item/completed' && e.params.item.processId), JSON.stringify(list))
    const finished = await waitFor((e) => e.method === 'item/completed' && e.params.item.id === launch.params.item.id && e.params.item.status === 'completed', 30000, from)
    assert.match(finished.params.item.aggregatedOutput ?? '', /bg-done/)
  })

  // ---------------------------------------------------------- customization & tools
  await check('customization: system prompt replaced, instructions added, model params applied', async () => {
    customThread = await newThread('ask', { customization: { systemPrompt: 'You are SMOKE for {{model}}.', instructions: 'Always answer in haiku.', modelParams: { 'code-desktop-zai-api/GLM-5.3': { maxTokens: 777, temperature: 0.3 } } } })
    const index = fake.requests.length
    await runTurn(customThread.id, 'HELLO custom', 'ask', { codeDesktop: { customization: { systemPrompt: 'You are SMOKE for {{model}}.', instructions: 'Always answer in haiku.', modelParams: { 'code-desktop-zai-api/GLM-5.3': { maxTokens: 777, temperature: 0.3 } } } } })
    const request = requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main')
    const system = systemOf(request.body)
    assert.match(system, /^You are SMOKE for code-desktop-zai-api\/GLM-5\.3\./)
    assert.doesNotMatch(system, /You are ZCode/)
    assert.match(system, /Always answer in haiku\./)
    assert.equal(request.body.max_tokens, 777)
    assert.equal(request.body.temperature, 0.3)
    const preview = await client.request('codeDesktop/systemPrompt/preview', { cwd: ws, threadId: customThread.id })
    assert.equal(preview.exact, true)
    assert.match(preview.text, /^You are SMOKE/)
  })

  await check('MCP: config/batchWrite adds a stdio server, status lists it connected with its tools', async () => {
    await client.request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.fake', value: { command: process.execPath, args: [FAKE_MCP] }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
    await client.request('config/mcpServer/reload', {})
    const config = await client.request('config/read', { includeLayers: false, cwd: ws })
    assert.equal(config.config.mcp_servers.fake.command, process.execPath)
    const status = await client.request('mcpServerStatus/list', { detail: 'toolsAndAuthOnly', limit: 100 })
    const fakeRow = status.data.find((row) => row.name === 'fake')
    assert.equal(fakeRow.runtimeStatus, 'connected')
    assert.deepEqual(Object.keys(fakeRow.tools), ['echo'])
    assert.equal(mcpRows(status).find((row) => row.name === 'fake').toolCount ?? Object.keys(fakeRow.tools).length, 1)
  })

  await check('MCP: a connector added while a session is open reaches that session’s next turn (no “Tool not found”)', async () => {
    const thread = await newThread('bypass')
    await runTurn(thread.id, 'HELLO before connector', 'bypass')
    await client.request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.late', value: { command: process.execPath, args: [FAKE_MCP] }, mergeStrategy: 'upsert' }], reloadUserConfig: true })
    await client.request('config/mcpServer/reload', { cwd: ws })
    const from = events.length
    const index = fake.requests.length
    await runTurn(thread.id, 'HELLO after connector', 'bypass')
    const request = requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main')
    const tools = (request?.body.tools ?? []).map((tool) => tool.name)
    assert.ok(tools.includes('mcp__late__echo'), `the open session's next request offers the new connector's tools: ${tools.join(',')}`)
    assert.ok(itemsOf(thread.id).some((i) => i.type === 'agentMessage'), 'the session keeps working')
    assert.ok(!events.slice(from).some((e) => e.method === 'thread/status/changed' && e.params.threadId === thread.id && e.params.status.type === 'notLoaded'), 'no notLoaded flicker')
    await client.request('config/batchWrite', { edits: [{ keyPath: 'mcp_servers.late', value: null }] })
  })

  await check('MCP tool call → mcpToolCall item', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await runTurn(thread.id, 'MCP_CALL now', 'bypass')
    const call = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'mcpToolCall').at(-1)?.params.item
    assert.ok(call, 'mcpToolCall item')
    assert.equal(call.server, 'fake')
    assert.equal(call.tool, 'echo')
    assert.match(call.result.content[0].text, /echo: ping/)
  })

  await check('tool selection: codeDesktop/tools/list, disabled tools and servers are removed from the model request', async () => {
    const list = await client.request('codeDesktop/tools/list', {})
    assert.ok(list.tools.some((t) => t.name === 'Bash'))
    assert.ok(!list.tools.some((t) => /^(Cron|OffPeak)/.test(t.name)), list.tools.map((t) => t.name).join(','))
    const server = list.servers.find((s) => s.name === 'fake')
    assert.deepEqual(server.tools.map((t) => t.name), ['mcp__fake__echo'])
    const thread = await newThread('bypass', { tools: { disabled: ['WebFetch', 'Bash'], disabledServers: ['fake'] } })
    const index = fake.requests.length
    await runTurn(thread.id, 'HELLO tools', 'bypass', { codeDesktop: { tools: { disabled: ['WebFetch', 'Bash'], disabledServers: ['fake'] } } })
    const tools = requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main').body.tools.map((t) => t.name)
    assert.ok(!tools.includes('WebFetch') && !tools.includes('Bash'), tools.join(','))
    assert.ok(!tools.some((name) => name.startsWith('mcp__fake__')), tools.join(','))
    assert.ok(tools.includes('Read'))
  })

  await check('scheduled tasks: a CronCreate the model makes anyway never reports a retryable "Try again later"', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    const { done } = await runTurn(thread.id, 'SCHEDULE_IT weekdays at 9', 'bypass')
    assert.equal(done.status, 'completed')
    const call = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'dynamicToolCall' && e.params.item.tool === 'CronCreate').at(-1)?.params.item
    const answer = itemsOf(thread.id).filter((i) => i.type === 'agentMessage').at(-1)?.text ?? ''
    assert.ok(call, 'the failed call is shown')
    assert.equal(call.success, false)
    assert.match(call.contentItems[0].text, /not found|aren’t available/i)
    assert.doesNotMatch(JSON.stringify(call) + answer, /try again later/i)
  })

  await check('web fetch → webSearch openPage item', async () => {
    const thread = await newThread('bypass')
    const from = events.length
    await runTurn(thread.id, 'WEB_FETCH it', 'bypass')
    const web = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.item.type === 'webSearch').at(-1)?.params.item
    assert.ok(web)
    assert.equal(web.action.type, 'openPage')
  })

  await check('live permission change: codeDesktop/thread/permissions applies a mode mid-session', async () => {
    const thread = await newThread('ask')
    const result = await client.request('codeDesktop/thread/permissions', { threadId: thread.id, ...turnParams(thread.id, '', 'bypass') })
    assert.equal(result.applied, true)
    const from = events.length
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'RUN_BASH live', text_elements: [] }] })
    await turnDone(thread.id, from)
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'))
  })

  await check('approval policy "never" (the workflow runner’s Auto access): an ask is refused on the spot, no card nobody answers', async () => {
    const { thread } = await client.request('thread/start', { cwd: ws, approvalPolicy: 'never', sandbox: 'workspace-write' })
    fs.writeFileSync(path.join(ws, 'other.txt'), 'before\n')
    const from = events.length
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'RUN_OTHER never', text_elements: [] }] })
    await turnDone(thread.id, from)
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'), 'no approval request')
    const command = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'commandExecution').at(-1)?.params.item
    assert.ok(command && ['declined', 'failed'].includes(command.status), JSON.stringify(command))
    assert.equal(fs.readFileSync(path.join(ws, 'other.txt'), 'utf8'), 'before\n')
    await assert.rejects(client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'HELLO', text_elements: [] }], outputSchema: { type: 'object' } }), /outputSchema/)
  })

  await check('allow for this session: a workspace edit grant covers later workspace edits, never a file outside; a mode change drops it', async () => {
    const thread = await newThread('ask')
    fs.writeFileSync(path.join(ws, 'a.txt'), 'one\ntwo\n')
    let from = events.length
    await client.request('turn/start', turnParams(thread.id, 'EDIT_FILE grant', 'ask'))
    let req = await nextRequest('item/fileChange/requestApproval', from)
    assert.equal(req.params.sessionGrantable, true)
    answer(req, { decision: 'acceptForSession' })
    await turnDone(thread.id, from)
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\nTWO\n')
    fs.writeFileSync(path.join(ws, 'a.txt'), 'one\ntwo\n')
    from = events.length
    await runTurn(thread.id, 'EDIT_FILE covered', 'ask')
    assert.ok(!events.slice(from).some((e) => e.kind === 'request'), 'the grant covers another workspace edit')
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\nTWO\n')
    from = events.length
    await client.request('turn/start', turnParams(thread.id, 'WRITE_OUTSIDE please', 'ask'))
    req = await nextRequest('item/fileChange/requestApproval', from)
    assert.equal(req.params.sessionGrantable, false, 'no standing grant outside the workspace')
    answer(req, { decision: 'decline' })
    await turnDone(thread.id, from)
    assert.ok(!fs.existsSync(path.join(home, 'outside.txt')))
    await runTurn(thread.id, 'HELLO in acceptEdits', 'acceptEdits')
    fs.writeFileSync(path.join(ws, 'a.txt'), 'one\ntwo\n')
    from = events.length
    await client.request('turn/start', turnParams(thread.id, 'EDIT_FILE after mode change', 'ask'))
    req = await nextRequest('item/fileChange/requestApproval', from)
    answer(req, { decision: 'decline' })
    await turnDone(thread.id, from)
    assert.equal(fs.readFileSync(path.join(ws, 'a.txt'), 'utf8'), 'one\ntwo\n')
  })

  await check('allow for this session in a read-only mode: not offered, and a card answered after a switch to Plan grants nothing once the plan is approved', async () => {
    const thread = await newThread('ask')
    let from = events.length
    await client.request('turn/start', turnParams(thread.id, 'RUN_OTHER planswitch', 'ask'))
    let req = await nextRequest('item/commandExecution/requestApproval', from)
    assert.equal(req.params.sessionGrantable, true)
    // The user switches to Plan while the card is open, then picks "Allow for this session" there.
    await client.request('codeDesktop/thread/permissions', { threadId: thread.id, ...turnParams(thread.id, '', 'plan') })
    answer(req, { decision: 'acceptForSession' })
    await turnDone(thread.id, from)
    from = events.length
    await client.request('turn/start', turnParams(thread.id, 'PLAN_IT grants', 'plan'))
    req = await nextRequest('item/tool/requestUserInput', from)
    answer(req, { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'ask' } })
    await turnDone(thread.id, from)
    from = events.length
    await client.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'RUN_OTHER planswitch', text_elements: [] }] })
    req = await nextRequest('item/commandExecution/requestApproval', from)
    assert.match(req.params.command, /planswitch/)
    answer(req, { decision: 'decline' })
    await turnDone(thread.id, from)
  })

  let rewound
  await check('rewind: thread/revert drops the turn and every later one through ZCode’s own rewind, silently; the model no longer sees them', async () => {
    rewound = await newThread('bypass')
    for (const word of ['one', 'two', 'three']) assert.equal((await runTurn(rewound.id, `HELLO ${word}`, 'bypass')).done.status, 'completed')
    const before = (await client.request('thread/turns/list', { threadId: rewound.id, limit: 50, sortDirection: 'asc' })).data
    assert.equal(before.length, 3)
    const from = events.length
    const result = await client.request('thread/revert', { threadId: rewound.id, beforeTurnId: before[1].id })
    assert.equal(result.thread.id, rewound.id)
    assert.deepEqual(result.thread.turns, [])
    assert.ok(events.slice(from).some((e) => e.method === 'thread/reverted' && e.params.threadId === rewound.id))
    assert.ok(!events.slice(from).some((e) => ['turn/started', 'item/started', 'turn/completed'].includes(e.method) && e.params.threadId === rewound.id), 'the /rewind control turn never reaches the client')
    const after = (await client.request('thread/turns/list', { threadId: rewound.id, limit: 50, sortDirection: 'asc', itemsView: 'full' })).data
    assert.deepEqual(after.map((turn) => turn.id), [before[0].id])
    const index = fake.requests.length
    await runTurn(rewound.id, 'HELLO four', 'bypass')
    const sent = JSON.stringify(requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main')?.body.messages ?? requestsSince(index).at(-1).body.messages)
    assert.match(sent, /HELLO one/)
    assert.doesNotMatch(sent, /HELLO two|HELLO three/)
    const final = (await client.request('thread/turns/list', { threadId: rewound.id, limit: 50, sortDirection: 'asc', itemsView: 'full' })).data
    assert.equal(final.length, 2)
    assert.ok(JSON.stringify(final[1].items).includes('HELLO four'))
    await assert.rejects(client.request('thread/revert', { threadId: rewound.id, beforeTurnId: 'turn_missing' }), /not in this session/)
  })

  await check('rewind with files: codeDesktop.restoreFiles puts back what GLM wrote (`/rewind both`); without it the file stays', async () => {
    assert.equal(init.capabilities.rewindFiles, true)
    for (const [word, restore] of [['kept', false], ['undone', true]]) {
      const thread = await newThread('bypass')
      assert.equal((await runTurn(thread.id, 'HELLO before', 'bypass')).done.status, 'completed')
      assert.equal((await runTurn(thread.id, `REWIND_WRITE ${word}`, 'bypass')).done.status, 'completed')
      const file = path.join(ws, `rewind-${word}.txt`)
      assert.ok(fs.existsSync(file), 'GLM wrote the file')
      const turns = (await client.request('thread/turns/list', { threadId: thread.id, limit: 50, sortDirection: 'asc' })).data
      await client.request('thread/revert', { threadId: thread.id, beforeTurnId: turns[1].id, ...(restore ? { codeDesktop: { restoreFiles: true } } : {}) })
      const after = (await client.request('thread/turns/list', { threadId: thread.id, limit: 50, sortDirection: 'asc' })).data
      assert.deepEqual(after.map((turn) => turn.id), [turns[0].id], 'the conversation is cut either way')
      assert.equal(fs.existsSync(file), !restore, restore ? 'the file GLM made is gone' : 'a history-only rewind leaves files alone')
    }
  })

  // ---------------------------------------------------------- catalog
  await check('commands: ZCode’s slash commands are listed (slash menu) and run as ZCode’s own: /init, /goal', async () => {
    const listed = await client.request('skills/list', { cwds: [ws] })
    const rows = listed.data[0].skills.filter((s) => s.path.startsWith('command:'))
    assert.ok(rows.some((s) => s.name === 'init'), JSON.stringify(rows.map((s) => s.name)))
    assert.ok(rows.some((s) => s.name === 'goal'))
    assert.ok(!rows.some((s) => s.name === 'compact' || s.name === 'plan'), 'served through Codex methods instead')
    const row = skillRows(listed).skills.find((r) => r.path === 'command:init')
    assert.equal(row.toggleable, false)
    await assert.rejects(client.request('skills/config/write', { path: 'command:init', enabled: false }), /Only custom ZCode commands/)
    const thread = await newThread('bypass')
    const index = fake.requests.length
    let from = events.length
    await client.request('turn/start', { ...turnParams(thread.id, '', 'bypass'), input: [{ type: 'skill', name: 'init', path: 'command:init' }, { type: 'text', text: 'Keep it short.', text_elements: [] }] })
    await turnDone(thread.id, from)
    assert.ok(requestsSince(index).some((r) => /AGENTS\.md/.test(JSON.stringify(r.body.messages)) && /Keep it short/.test(JSON.stringify(r.body.messages))), 'ZCode expanded its /init prompt')
    const user = events.slice(from).find((e) => e.method === 'item/completed' && e.params.item.type === 'userMessage').params.item
    assert.ok(user.content.some((part) => part.type === 'skill' && part.path === 'command:init'), 'the transcript shows what was sent')
    from = events.length
    const { turn } = await client.request('turn/start', { ...turnParams(thread.id, '', 'bypass'), input: [{ type: 'skill', name: 'goal', path: 'command:goal' }] })
    assert.ok(turn.id)
    await turnDone(thread.id, from)
    const reply = events.slice(from).filter((e) => e.method === 'item/completed' && e.params.threadId === thread.id && e.params.item.type === 'agentMessage').at(-1)?.params.item
    assert.match(reply?.text ?? '', /goal/i, 'ZCode’s goal reply is shown')
  })

  await check('skills: user skill listed (slash menu) and toggled through ZCode config', async () => {
    const listed = await client.request('skills/list', { cwds: [ws] })
    const skill = listed.data[0].skills.find((s) => s.name === 'smoke-skill')
    assert.ok(skill, JSON.stringify(listed.data[0].skills.map((s) => s.name)))
    assert.equal(skill.enabled, true)
    assert.ok(skillRows(listed).skills.some((row) => row.path === skill.path))
    const write = await client.request('skills/config/write', { path: skill.path, enabled: false })
    assert.equal(write.effectiveEnabled, false)
    const again = await client.request('skills/list', { cwds: [ws] })
    assert.equal(again.data[0].skills.find((s) => s.name === 'smoke-skill').enabled, false)
    await client.request('skills/config/write', { path: skill.path, enabled: true })
  })

  await check('plugins: ZCode plugins listed (Customize › Plugins), plugin/read, hooks/list', async () => {
    const installed = await client.request('plugin/installed', {})
    const plugins = installed.marketplaces.flatMap((m) => m.plugins)
    assert.ok(plugins.some((p) => p.name === 'browser-use'))
    assert.ok(pluginRows(installed).length >= 1)
    const read = await client.request('plugin/read', { pluginName: 'browser-use@zcode-plugins-official' })
    assert.ok(read.plugin.skills.length >= 1)
    assert.ok(Array.isArray((await client.request('hooks/list', {})).data))
  })

  await check('plugins: install a local ZCode plugin, its skill appears, toggle it, remove it', async () => {
    assert.equal(init.capabilities.pluginManage, true)
    const inspected = await client.request('codeDesktop/plugin/inspect', { spec: pluginDir })
    assert.equal(inspected.status, 'accepted')
    assert.equal(inspected.name, 'smoke-plugin')
    const from = events.length
    const installed = await client.request('codeDesktop/plugin/install', { spec: pluginDir, requestId: 'plug-1' })
    assert.equal(installed.application, 'applied')
    assert.ok(events.slice(from).some((e) => e.method === 'codeDesktop/plugin/installProgress' && e.params.requestId === 'plug-1'))
    let plugin = (await client.request('plugin/installed', {})).marketplaces.flatMap((m) => m.plugins).find((p) => p.name === 'smoke-plugin')
    assert.ok(plugin, 'listed after install')
    assert.equal(plugin.codeDesktop.removable, true)
    const skills = await client.request('skills/list', { cwds: [ws] })
    assert.ok(skills.data[0].skills.some((skill) => /plugin-hello/.test(skill.name)))
    await client.request('codeDesktop/plugin/setEnabled', { pluginName: plugin.id, enabled: false })
    plugin = (await client.request('plugin/installed', {})).marketplaces.flatMap((m) => m.plugins).find((p) => p.name === 'smoke-plugin')
    assert.equal(plugin.enabled, false)
    await client.request('codeDesktop/plugin/remove', { pluginName: plugin.id })
    assert.ok(!(await client.request('plugin/installed', {})).marketplaces.flatMap((m) => m.plugins).some((p) => p.name === 'smoke-plugin'))
  })

  // ---------------------------------------------------------- session actions
  await check('thread/list: sessions with previews and names; search', async () => {
    const list = await client.request('thread/list', { limit: 100 })
    const row = list.data.find((t) => t.id === mainThread.id)
    assert.ok(row, 'main thread listed')
    assert.ok(row.preview)
    assert.equal(sessionCore(row), 'zcode')
    const searched = await client.request('thread/list', { searchTerm: 'HELLO custom' })
    assert.ok(searched.data.some((t) => t.id === customThread.id))
  })

  await check('rename → thread/read name; archive / unarchive', async () => {
    await client.request('thread/name/set', { threadId: mainThread.id, name: 'Smoke main' })
    assert.equal((await client.request('thread/read', { threadId: mainThread.id })).thread.name, 'Smoke main')
    await client.request('thread/archive', { threadId: customThread.id })
    assert.ok(!(await client.request('thread/list', {})).data.some((t) => t.id === customThread.id))
    assert.ok((await client.request('thread/list', { archived: true })).data.some((t) => t.id === customThread.id))
    await client.request('thread/unarchive', { threadId: customThread.id })
    assert.ok((await client.request('thread/list', {})).data.some((t) => t.id === customThread.id))
  })

  await check('thread/list: every ZCode session, not only the 50 most recent; sessions archived in the ZCode app are archived', async () => {
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(path.join(home, '.zcode/cli/db/db.sqlite'))
    db.exec('pragma busy_timeout = 5000')
    const columns = db.prepare("select name from pragma_table_info('session')").all().map((row) => row.name)
    const copy = (id, title, updated, archived) => db.prepare(`insert into session (${columns.join(', ')}) select ${columns.map((c) => (c === 'id' ? '?' : c === 'title' ? '?' : c === 'time_updated' ? '?' : c === 'time_archived' ? '?' : c)).join(', ')} from session where id = ?`)
      .run(...columns.flatMap((c) => (c === 'id' ? [id] : c === 'title' ? [title] : c === 'time_updated' ? [updated] : c === 'time_archived' ? [archived] : [])), mainThread.id)
    const ids = []
    try {
      for (let n = 0; n < 60; n++) { const id = `${mainThread.id}bulk${n}`; ids.push(id); copy(id, `Bulk session ${n}`, 1000 + n, null) }
      copy(`${mainThread.id}bulkarch`, 'Bulk archived in ZCode', 2000, Date.now())
      ids.push(`${mainThread.id}bulkarch`)
      const seen = new Set()
      let cursor = null
      for (let page = 0; page < 20; page++) {
        const list = await client.request('thread/list', { limit: 25, ...(cursor ? { cursor } : {}) })
        for (const row of list.data) seen.add(row.id)
        cursor = list.nextCursor
        if (!cursor) break
      }
      assert.equal(ids.slice(0, 60).filter((id) => !seen.has(id)).length, 0, 'every session is reachable by paging')
      assert.ok(seen.has(mainThread.id))
      assert.ok(!seen.has(`${mainThread.id}bulkarch`), 'archived in ZCode: not in the active list')
      assert.ok((await client.request('thread/list', { archived: true, limit: 100 })).data.some((row) => row.id === `${mainThread.id}bulkarch`))
      assert.ok((await client.request('thread/list', { searchTerm: 'Bulk session 3', limit: 100 })).data.some((row) => row.id === `${mainThread.id}bulk3`), 'search reaches old sessions')
      await client.request('thread/unarchive', { threadId: `${mainThread.id}bulkarch` })
      assert.ok((await client.request('thread/list', { searchTerm: 'Bulk archived', limit: 100 })).data.some((row) => row.id === `${mainThread.id}bulkarch`), 'unarchived here: active again')
    } finally {
      for (const id of ids) db.prepare('delete from session where id = ?').run(id)
      db.close()
    }
  })

  await check('history paging: thread/turns/list and thread/items/list match the live transcript', async () => {
    const page = await client.request('thread/turns/list', { threadId: mainThread.id, limit: 25, sortDirection: 'desc', itemsView: 'full' })
    assert.ok(page.data.length >= 5)
    const first = page.data.at(-1)
    assert.ok(first.items.some((i) => i.type === 'userMessage'))
    const items = await client.request('thread/items/list', { threadId: mainThread.id, turnId: first.id, limit: 200, sortDirection: 'asc' })
    assert.ok(items.data.some((entry) => entry.item.type === 'agentMessage'))
    const liveIds = new Set(itemsOf(mainThread.id).map((i) => i.id))
    const historyTool = page.data.flatMap((t) => t.items).find((i) => i.type === 'commandExecution')
    assert.ok(liveIds.has(historyTool.id), 'history and live share tool item ids')
  })

  await check('fork at a turn: new thread with the earlier history', async () => {
    const page = await client.request('thread/turns/list', { threadId: mainThread.id, limit: 50, sortDirection: 'asc' })
    const forked = await client.request('thread/fork', { threadId: mainThread.id, lastTurnId: page.data[0].id, excludeTurns: false })
    assert.notEqual(forked.thread.id, mainThread.id)
    assert.equal(forked.thread.forkedFromId, mainThread.id)
    assert.equal(forked.thread.turns.length, 1)
    assert.equal(sessionCore(forked.thread), 'zcode')
  })

  await check('compact: contextCompaction turn', async () => {
    const from = events.length
    await client.request('thread/compact/start', { threadId: mainThread.id })
    const done = await turnDone(mainThread.id, from)
    assert.equal(done.params.turn.status, 'completed')
    assert.ok(events.slice(from).some((e) => e.method === 'item/completed' && e.params.item.type === 'contextCompaction'))
  })

  await check('review: read-only review turn with entered/exited review mode items', async () => {
    const from = events.length
    const result = await client.request('review/start', { threadId: mainThread.id, target: { type: 'uncommittedChanges' }, delivery: 'inline' })
    assert.ok(result.turn.id)
    await turnDone(mainThread.id, from)
    assert.ok(events.slice(from).some((e) => e.method === 'item/started' && e.params.item.type === 'enteredReviewMode'))
    assert.ok(events.slice(from).some((e) => e.method === 'item/completed' && e.params.item.type === 'exitedReviewMode'))
  })

  await check('/btw side question: answered over the thread context, never enters the thread', async () => {
    const before = (await client.request('thread/turns/list', { threadId: mainThread.id, limit: 100 })).data.length
    const from = events.length
    const result = await client.request('codeDesktop/sideQuestion', { threadId: mainThread.id, question: 'SIDE_Q which file?', requestId: 'side-1' })
    assert.match(result.text, /Side answer/)
    assert.ok(events.slice(from).some((e) => e.method === 'codeDesktop/sideQuestion/delta' && e.params.requestId === 'side-1'))
    const after = (await client.request('thread/turns/list', { threadId: mainThread.id, limit: 100 })).data.length
    assert.equal(after, before)
    assert.deepEqual(await client.request('codeDesktop/sideQuestion/cancel', { requestId: 'nope' }), { cancelled: false })
  })

  await check('usage: Settings › Usage daily tokens and the home stats card come from ZCode’s ledger', async () => {
    const usage = await client.request('account/usage/read', {})
    assert.ok(usage.summary.lifetimeTokens > 0)
    assert.ok(usage.dailyUsageBuckets.length >= 1)
    const view = usagePresentation({ account: await client.request('account/read', {}), limits: await client.request('account/rateLimits/read', {}), tokenUsage: usage })
    assert.ok(view.daily.length >= 1)
    const stats = await client.request('codeDesktop/stats/read', {})
    assert.ok(stats.dailyActivity.length >= 1)
    assert.ok(stats.dailyActivity[0].sessionCount >= 1)
    assert.ok(Object.keys(stats.modelUsage).length >= 1)
  })

  await check('delete: thread/delete removes the session and ZCode’s own history', async () => {
    const thread = await newThread('bypass')
    await runTurn(thread.id, 'HELLO to delete', 'bypass')
    deletedId = thread.id
    await client.request('thread/delete', { threadId: thread.id })
    await assert.rejects(client.request('thread/read', { threadId: thread.id }), (error) => error.data?.codexErrorInfo === 'threadNotFound')
    assert.ok(!(await client.request('thread/list', {})).data.some((t) => t.id === thread.id))
    const { DatabaseSync } = await import('node:sqlite')
    const db = new DatabaseSync(path.join(home, '.zcode/cli/db/db.sqlite'), { readOnly: true })
    assert.equal(db.prepare('select count(*) c from session where id = ?').get(thread.id).c, 0)
    assert.equal(db.prepare('select count(*) c from message where session_id = ?').get(thread.id).c, 0)
    db.close()
  })

  // A turn that is still running when the core goes away.
  const hangThread = await newThread('bypass')
  await client.request('turn/start', turnParams(hangThread.id, 'HANG through restart', 'bypass'))
  await waitFor((e) => e.method === 'turn/started' && e.params.threadId === hangThread.id)
  await sleep(500)

  // Coding Plan account sign-in as `zcode login` stores it (encrypted credential store).
  const credentials = {
    'oauth:active_provider': 'zai', 'oauth:zai:user_info': JSON.stringify({ user_id: 'u-1', email: 'smoke@example.com', name: 'Smoke' }),
    zcodejwttoken: 'jwt-smoke', 'oauth:zai:access_token': 'maas-smoke',
    'account-provider:account:zai-individual-coding-plan:identity': 'u-1', 'account-provider:coding-plan:account:zai-individual-coding-plan:account:u-1:api-key': 'sk-account',
  }
  await client.stopAndWait()

  // ---------------------------------------------------------- restart
  fs.writeFileSync(path.join(home, '.zcode/v2/credentials.json'), JSON.stringify(Object.fromEntries(Object.entries(credentials).map(([key, value]) => [key, encryptCredential(value, { ZCODE_CREDENTIAL_SECRET: CREDENTIAL_SECRET })]))))
  init = await connect()

  await check('restart: sessions, names and history survive; the interrupted turn ended cleanly', async () => {
    const list = await client.request('thread/list', { limit: 100 })
    assert.equal(list.data.find((t) => t.id === mainThread.id)?.name, 'Smoke main')
    assert.ok(!list.data.some((t) => t.id === deletedId))
    const resumed = await client.request('thread/resume', { threadId: mainThread.id, excludeTurns: true, initialTurnsPage: { limit: 25, sortDirection: 'desc', itemsView: 'full' }, ...turnParams(mainThread.id, '', 'bypass') })
    assert.ok(resumed.initialTurnsPage.data.length >= 5)
    const hung = await client.request('thread/read', { threadId: hangThread.id, includeTurns: true })
    const last = hung.thread.turns.at(-1)
    assert.notEqual(last.status, 'inProgress')
    const { done } = await runTurn(mainThread.id, 'HELLO after restart', 'bypass')
    assert.equal(done.status, 'completed')
  })

  await check('restart: a rewound session keeps its active branch', async () => {
    const turns = (await client.request('thread/turns/list', { threadId: rewound.id, limit: 50, sortDirection: 'asc', itemsView: 'full' })).data
    assert.equal(turns.length, 2)
    assert.doesNotMatch(JSON.stringify(turns), /HELLO two|HELLO three/)
  })

  await check('restart: sub-agent rows and transcripts survive (background tasks pane, agent view)', async () => {
    const listed = await client.request('thread/list', { sourceKinds: ['subAgentThreadSpawn'], limit: 100 })
    const child = listed.data.find((t) => t.id === childThreadId)
    assert.ok(child, 'child listed')
    assert.equal(child.parentThreadId, mainThread.id)
    const read = await client.request('thread/read', { threadId: childThreadId, includeTurns: true })
    assert.ok(read.thread.turns[0].items.some((i) => i.type === 'commandExecution' && i.aggregatedOutput === 'child-bash'))
  })

  await check('Coding Plan sign-in: account/read names the user; account models run through the ZCode gateway with the account key', async () => {
    const account = await client.request('account/read', {})
    assert.equal(account.account.type, 'chatgpt')
    assert.equal(account.account.email, 'smoke@example.com')
    const models = (await client.request('model/list', {})).data
    const plan = models.find((m) => m.model === 'account:zai-individual-coding-plan/GLM-5.3')
    assert.ok(plan, JSON.stringify(models.map((m) => m.model)))
    const thread = await newThread('bypass')
    const index = fake.requests.length
    await runTurn(thread.id, 'HELLO plan', 'bypass', { top: { model: plan.model, effort: 'high' } })
    const sent = requestsSince(index).find((r) => r.headers['x-zcode-session-type'] === 'main')
    assert.ok(sent.url.startsWith('/api/v1/ultra-zai/anthropic/v1/messages'), sent.url)
    assert.ok(JSON.stringify(sent.headers).includes('sk-account'))
  })

  await check('Coding Plan resets: the browser sign-in’s earned 5-hour reset is listed and redeemed (coding-plan/reset)', async () => {
    const before = fake.resetRequests.length
    const limits = await client.request('account/rateLimits/read', {})
    assert.equal(limits.rateLimitResetCredits?.availableCount, 1, JSON.stringify(limits.rateLimitResetCredits))
    const credit = limits.rateLimitResetCredits.credits[0]
    assert.match(credit.id, /^FIVE_HOUR:\d+$/)
    assert.equal(credit.title, '5-hour reset')
    const status = fake.resetRequests.slice(before).find((request) => request.url.endsWith('/status'))
    assert.equal(status.headers.authorization, 'Bearer jwt-smoke')
    assert.equal(status.headers['x-bigmodel-authorization'], 'maas-smoke')
    const result = await client.request('account/rateLimitResetCredit/consume', { idempotencyKey: 'reset-attempt-1', creditId: credit.id })
    assert.equal(result.outcome, 'reset')
    const use = fake.resetRequests.slice(before).find((request) => request.url.endsWith('/use'))
    assert.deepEqual(JSON.parse(use.body), { idempotency_key: 'reset-attempt-1', reset_type: 'FIVE_HOUR' })
    const after = await client.request('account/rateLimits/read', {})
    assert.equal(after.rateLimitResetCredits?.availableCount, 0)
  })

  await check('official Z.ai MCP services (zcode_official plugins) connect with the browser sign-in’s identity headers', async () => {
    const installed = await client.request('codeDesktop/plugin/install', { spec: officialPluginDir, requestId: 'plug-official' })
    assert.equal(installed.application, 'applied')
    let row = null
    for (let attempt = 0; attempt < 10 && row?.runtimeStatus !== 'connected'; attempt++) {
      if (attempt) await sleep(1500)
      const status = await client.request('mcpServerStatus/list', { detail: 'toolsAndAuthOnly', limit: 100 })
      row = status.data.find((entry) => /finance_smoke/.test(entry.name)) ?? null
    }
    assert.equal(row?.runtimeStatus, 'connected', JSON.stringify(row))
    const sent = fake.mcpRequests.filter((r) => r.headers.authorization)
    assert.ok(sent.length, 'the service was called with an identity')
    assert.equal(sent[0].headers.authorization, 'Bearer jwt-smoke')
    assert.equal(sent[0].headers['x-bigmodel-authorization'], 'Bearer maas-smoke')
    assert.equal(sent[0].headers['bigmodel-target-type'], 'PERSONAL')
    const plugin = (await client.request('plugin/installed', {})).marketplaces.flatMap((m) => m.plugins).find((p) => p.name === 'official-smoke')
    if (plugin) await client.request('codeDesktop/plugin/remove', { pluginName: plugin.id }).catch(() => {})
  })

  await check('sign out removes the OpenClaude Desktop API key provider', async () => {
    await client.request('account/logout', {})
    const personal = JSON.parse(fs.readFileSync(path.join(home, '.zcode/v2/provider_config.json'), 'utf8'))
    assert.ok(!personal.config.providerConfigRules.providerRules.some((rule) => rule.providerId.startsWith('code-desktop-')))
  })
} catch (error) {
  failed.push(`fatal: ${error?.message}`)
  console.log(`fatal: ${error?.stack}`)
} finally {
  try { await client?.stopAndWait() } catch {}
  await fake.close()
  if (failed.length) console.log(stderr.join('').split('\n').filter((line) => /zcode-bridge|Error/.test(line)).slice(-40).join('\n'))
  if (!failed.length && process.env.KEEP_HOME !== '1') fs.rmSync(home, { recursive: true, force: true })
  console.log(`${passed} checks passed${failed.length ? `, ${failed.length} failed: ${failed.join('; ')}` : ''}`)
  process.exit(failed.length ? 1 : 0)
}
