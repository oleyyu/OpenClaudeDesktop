// ACP bridge (harness/packages/acp-bridge): Kimi modes, sub-agents, config, skills; Qwen workspace folders, tools and
// usage history; Gemini sign-out, /init and tools; MiniMax accounts, usage, background tasks, images and review.
// Server flows run against the scripted agent (packages/acp-bridge/testing/fake-acp-agent.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { scanSkills } from '../packages/acp-bridge/src/catalog.js'
import { toAcpPrompt } from '../packages/acp-bridge/src/input.js'
import { UsageLedger } from '../packages/acp-bridge/src/usage.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { readKimiConfig, kimiModelInfo, kimiWireUpdates, kimiSubagentCall, tomlKeyParts } from '../packages/acp-bridge/src/agents/kimi.js'
import { readQwenUsageRecords, BUILTIN_TOOLS as QWEN_TOOLS } from '../packages/acp-bridge/src/agents/qwen.js'
import { BUILTIN_TOOLS as GEMINI_TOOLS, staleGoogleSignIn } from '../packages/acp-bridge/src/agents/gemini.js'
import { readMinimaxConfig, minimaxModelRoute, reviewResultMarkdown } from '../packages/acp-bridge/src/agents/minimax.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-r3-')))

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), log = () => {} } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log,
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'),
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'no-system-settings.json'), ...env,
    },
  })
  const notes = []
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({}), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }] })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, kimiHome, call, turn, notes, waitFor, agentLog, close: () => server.shutdown() }
}

test('Kimi: the thread\'s mode is sent on every open, whatever mode Kimi reports (its config can start it in YOLO or plan)', async () => {
  const b = bridge({ env: { FAKE_ACP_MODES: '1' } })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'hello')
    const modes = b.agentLog().filter((entry) => entry.method === 'session/set_mode')
    assert.deepEqual(modes.map((entry) => entry.params.modeId), ['default'])
    // A non-Kimi adapter trusts the reported mode.
    assert.equal(adapterById('qwen').syncModeOnOpen, undefined)
  } finally { await b.close() }
})

test('Kimi: a sub-agent recorded only in its own log becomes a child thread, linked to its launch, ended by its log', async () => {
  const b = bridge()
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.turn(thread.id, 'kimi-agent')
    const childId = `${thread.id}~0_call-agent_agent-0`
    await b.waitFor((method, params) => method === 'turn/completed' && params.threadId === childId)
    const started = b.notes.filter((note) => note.method === 'thread/started').map((note) => note.params.thread.id)
    assert.ok(started.includes(childId))
    const childItems = b.notes.filter((note) => note.method === 'item/completed' && note.params.threadId === childId).map((note) => note.params.item)
    assert.deepEqual(childItems.map((item) => item.type), ['userMessage', 'commandExecution', 'reasoning', 'agentMessage'])
    assert.equal(childItems.at(-1).text, 'sub done')
    const launch = b.notes.filter((note) => note.method === 'item/completed' && note.params.threadId === thread.id && note.params.item.type === 'collabAgentToolCall').at(-1).params.item
    assert.deepEqual(launch.receiverThreadIds, [childId])
    assert.equal(launch.description, 'read the notes')
    assert.deepEqual(Object.keys(launch.agentsStates), [childId])
  } finally { await b.close() }
})

test('Kimi: tools are told by their description titles; sub-agent log records become ACP updates', () => {
  const kimi = adapterById('kimi')
  assert.equal(kimi.classify({ title: 'Launching background coder agent: x', rawInput: { description: 'x', prompt: 'p', run_in_background: true } }).type, 'subagent')
  assert.equal(kimiSubagentCall({ title: 'Launching background coder agent: x', rawInput: { description: 'x', prompt: 'p' } }).background, true)
  assert.deepEqual(kimiSubagentCall({ title: 'Launching agent swarm: split', rawInput: { description: 'split', items: [] } }).swarm, true)
  assert.equal(kimi.classify({ title: 'Fetching: https://a.b', kind: 'other', rawInput: { url: 'https://a.b' } }).type, 'fetch')
  assert.equal(kimi.classify({ title: 'Searching: kimi docs', kind: 'fetch', rawInput: { query: 'kimi docs' } }).type, 'webSearch')
  assert.deepEqual(kimi.classify({ title: "Searching for 'foo' in src", kind: 'read', rawInput: { pattern: 'foo' } }), { type: 'search', tool: 'grep' })
  assert.deepEqual(kimi.classify({ title: 'Searching **/*.ts', kind: 'read', rawInput: { pattern: '**/*.ts' } }), { type: 'search', tool: 'glob' })
  assert.deepEqual(kimiWireUpdates({ type: 'context.append_loop_event', event: { type: 'tool.call', toolCallId: 'c', name: 'Edit', args: { path: '/a' }, display: { kind: 'diff', path: '/a', before: 'x', after: 'y' } } }, 'agent-1').updates[0].content, [{ type: 'diff', path: '/a', oldText: 'x', newText: 'y' }])
  assert.equal(kimiWireUpdates({ type: 'turn.ended', agentId: 'agent-1', reason: 'completed' }, 'agent-1').ended, true)
  assert.equal(kimiWireUpdates({ type: 'turn.ended', agentId: 'agent-2' }, 'agent-1').ended, false)
})

test('Kimi config: quoted aliases with dots, [models.<alias>.overrides] and [thinking] defaults', () => {
  assert.deepEqual(tomlKeyParts('models."kimi-code/k3".overrides'), ['models', 'kimi-code/k3', 'overrides'])
  const file = path.join(tmp(), 'config.toml')
  fs.writeFileSync(file, [
    'default_model = "gpt-4.1"', 'extra_skill_dirs = ["~/team-skills", "rel/skills"]', '',
    '[models."gpt-4.1"]', 'provider = "openai"', 'model = "gpt-4.1"', 'max_context_size = 1047576', '',
    '[models."kimi-code/k3"]', 'provider = "managed:kimi-code"', 'max_context_size = 1048576', 'capabilities = ["thinking", "always_thinking"]', 'support_efforts = ["low", "high", "max"]', 'default_effort = "high"', '',
    '[models."kimi-code/k3".overrides]', 'max_context_size = 131072', 'default_effort = "max"', 'display_name = "K3 pinned"', '',
    '[thinking]', 'enabled = true', 'effort = "low"',
  ].join('\n'))
  const config = readKimiConfig(file)
  assert.deepEqual(Object.keys(config.models).sort(), ['gpt-4.1', 'kimi-code/k3'])
  assert.deepEqual(config.extraSkillDirs, ['~/team-skills', 'rel/skills'])
  const k3 = kimiModelInfo('kimi-code/k3', config.models['kimi-code/k3'])
  assert.deepEqual([k3.name, k3.contextWindow, k3.defaultEffort], ['K3 pinned', 131072, 'max'])
  // [thinking] effort wins when the model takes it.
  assert.equal(kimiModelInfo('kimi-code/k3', config.models['kimi-code/k3'], config.thinking).defaultEffort, 'low')
  assert.equal(kimiModelInfo('gpt-4.1', config.models['gpt-4.1']).contextWindow, 1047576)
})

test('Kimi skills: the flat <name>.md form and extra_skill_dirs; a directory skill wins over its flat twin', () => {
  const home = tmp()
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(path.join(kimiHome, 'skills', 'dirskill'), { recursive: true })
  fs.writeFileSync(path.join(kimiHome, 'skills', 'dirskill', 'SKILL.md'), '---\nname: dirskill\ndescription: Dir form\n---\nbody')
  fs.writeFileSync(path.join(kimiHome, 'skills', 'dirskill.md'), 'ignored twin')
  fs.writeFileSync(path.join(kimiHome, 'skills', 'commit.md'), '# Write a good commit message\n\nSteps')
  fs.mkdirSync(path.join(home, 'team-skills'), { recursive: true })
  fs.writeFileSync(path.join(home, 'team-skills', 'teamskill.md'), '---\ndescription: Team flat skill\n---\nbody')
  fs.writeFileSync(path.join(kimiHome, 'config.toml'), 'extra_skill_dirs = ["~/team-skills"]\n')
  const skills = adapterById('kimi').skills({ env: { HOME: home, KIMI_CODE_HOME: kimiHome } }, null)
  const byName = Object.fromEntries(skills.map((skill) => [skill.name, skill]))
  assert.deepEqual(Object.keys(byName).sort(), ['commit', 'dirskill', 'teamskill'])
  assert.equal(byName.commit.description, 'Write a good commit message')
  assert.equal(byName.dirskill.path, path.join(kimiHome, 'skills', 'dirskill', 'SKILL.md'))
  assert.equal(byName.teamskill.scope, 'user')
  assert.equal(adapterById('kimi').skillCommandPrefix, 'skill:')
  // Without the flat option only the directory form counts.
  assert.deepEqual(scanSkills([{ path: path.join(kimiHome, 'skills'), scope: 'user' }]).map((skill) => skill.name), ['dirskill'])
})

test('Qwen: added folders join its workspace; its other tools can be switched off; its own usage history is merged once', () => {
  const qwen = adapterById('qwen')
  const home = tmp()
  const { args } = qwen.launch({ env: { HOME: home, QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') } }, { threadDir: path.join(home, 't'), writable: [path.join(home, 'proj'), path.join(home, 'shared')] })
  assert.deepEqual(args.slice(args.indexOf('--include-directories')), ['--include-directories', path.join(home, 'shared')])
  const names = QWEN_TOOLS.map(([name]) => name)
  for (const name of ['cron_create', 'team_create', 'image_gen', 'enter_worktree', 'read_mcp_resource']) assert.ok(names.includes(name), name)
  for (const name of ['tool_call', 'tool_search', 'structured_output']) assert.ok(!names.includes(name), name)

  const file = path.join(home, 'usage_record.jsonl')
  const record = (sessionId, startTime, tokens) => JSON.stringify({ version: 1, sessionId, timestamp: startTime + 1000, startTime, project: '/p', durationMs: 1000, models: { 'qwen3-coder': { requests: 2, inputTokens: tokens, outputTokens: 10, cachedTokens: 5, thoughtsTokens: 0, totalTokens: tokens + 10 } }, tools: { totalCalls: 3 } })
  const day = new Date(2026, 8, 1, 10).getTime()
  fs.writeFileSync(file, `${record('terminal-1', day, 100)}\n${record('code-desktop-1', day, 400)}\n${JSON.stringify({ version: 1, sessionId: 'empty', models: {} })}\n`)
  const ledger = new UsageLedger(home)
  ledger.mergeExternal((cursor) => readQwenUsageRecords(file, cursor), (id) => id === 'code-desktop-1')
  ledger.mergeExternal((cursor) => readQwenUsageRecords(file, cursor), (id) => id === 'code-desktop-1')
  const usage = ledger.accountUsage()
  assert.equal(usage.summary.lifetimeTokens, 110)
  assert.deepEqual(usage.breakdown.models.map((model) => [model.model, model.tokens]), [['qwen3-coder', 110]])
  assert.equal(ledger.codeStats().dailyActivity[0].messageCount, 2)
  // A record appended later is read from the cursor on.
  fs.appendFileSync(file, `${record('terminal-2', day, 50)}\n`)
  ledger.mergeExternal((cursor) => readQwenUsageRecords(file, cursor), () => false)
  assert.equal(ledger.accountUsage().summary.lifetimeTokens, 170)
})

test('Gemini: signing out clears the Google sign-in choice; a stale choice is signed out and never starts a session', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const env = { HOME: home, GEMINI_API_KEY: 'key', GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') }
  fs.mkdirSync(path.join(home, '.gemini'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'settings.json'), JSON.stringify({ security: { auth: { selectedType: 'oauth-personal', useExternal: false } }, ui: { theme: 'x' } }))
  assert.equal(staleGoogleSignIn(env), true)
  assert.equal(gemini.account({ env }).kind, null)
  assert.throws(() => gemini.launch({ env, stateDir: home }, { threadDir: path.join(home, 't') }), /Sign in to Gemini/)
  gemini.logout({ env })
  const settings = JSON.parse(fs.readFileSync(path.join(home, '.gemini', 'settings.json'), 'utf8'))
  assert.deepEqual(settings, { security: { auth: { useExternal: false } }, ui: { theme: 'x' } })
  assert.equal(gemini.account({ env }).kind, 'apiKey')
  // Session processes never open a browser tab of Gemini's own.
  const { env: launchEnv } = gemini.launch({ env, stateDir: home }, { threadDir: path.join(home, 't') })
  assert.ok(fs.existsSync(path.join(launchEnv.PATH.split(path.delimiter)[0], 'open')))
  const tools = GEMINI_TOOLS.map(([name]) => name)
  assert.ok(!tools.includes('read_many_files'))
  assert.ok(tools.includes('read_mcp_resource') && tools.includes('list_mcp_resources'))
})

test('Gemini /init: a turn that writes GEMINI.md (an empty one counts as missing); with one there, OpenClaude Desktop says so without a prompt', async () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const workspace = path.join(home, 'ws')
  fs.mkdirSync(workspace, { recursive: true })
  const ctx = { env: { HOME: home, GEMINI_CLI_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json') } }
  const init = gemini.commands(ctx, workspace).find((command) => command.name === 'init')
  assert.ok(init)
  fs.writeFileSync(path.join(workspace, 'GEMINI.md'), '')
  const prompt = await gemini.expandCommand(ctx, init, { args: '', cwd: workspace, runShell: async () => ({ output: '', exitCode: 0 }) })
  assert.match(prompt, /write a GEMINI\.md file/)
  fs.writeFileSync(path.join(workspace, 'GEMINI.md'), '# Project')
  assert.match((await gemini.expandCommand(ctx, init, { args: '', cwd: workspace, runShell: async () => ({}) })).reply, /already has a GEMINI\.md/)

  const b = bridge({ adapter: gemini, home })
  try {
    await b.call('initialize', {})
    const { thread } = await b.call('thread/start', { cwd: workspace })
    const done = await b.turn(thread.id, '/init')
    assert.equal(done.status, 'completed')
    const reply = b.notes.filter((note) => note.method === 'item/completed' && note.params.turnId === done.id && note.params.item.type === 'agentMessage').map((note) => note.params.item.text).join('')
    assert.match(reply, /already has a GEMINI\.md/)
    assert.equal(b.agentLog().filter((entry) => entry.method === 'session/prompt').length, 0)
  } finally { await b.close() }
})

test('MiniMax: MiniMax API key and configured providers are signed in per token; image models; review results', () => {
  const minimax = adapterById('minimax')
  const home = tmp()
  const mm = path.join(home, '.minimax')
  fs.mkdirSync(mm, { recursive: true })
  const account = () => minimax.account({ env: { HOME: home } })
  fs.writeFileSync(path.join(mm, 'config.yaml'), 'minimaxModelSource: minimax_api_key\nminimax_api:\n  apiKey: sk-test\ndefaultModel: minimax/MiniMax-M3\n')
  assert.deepEqual([account().kind, account().label, account().perToken], ['apiKey', 'MiniMax API key', true])
  fs.writeFileSync(path.join(mm, 'config.yaml'), 'defaultModel: openrouter/some-model\nprovider:\n  openrouter:\n    options:\n      apiKey: k\n')
  assert.deepEqual([account().kind, account().label], ['apiKey', 'openrouter provider'])
  fs.writeFileSync(path.join(mm, 'config.yaml'), 'defaultModel: minimax/MiniMax-M3\n')
  assert.equal(minimaxModelRoute(readMinimaxConfig(path.join(mm, 'config.yaml'))).route, 'managed_token_plan')
  assert.equal(account().kind, null)

  fs.writeFileSync(path.join(mm, 'config.yaml'), [
    'custom_provider:', '  mine:', '    api: openai', '    models:', '      vision-1:', '        modalities:', '          input:', '            - text', '            - image',
    '        limit:', '          context: 1000', '      text-1:', '        limit:', '          context: 1000',
  ].join('\n'))
  const config = readMinimaxConfig(path.join(mm, 'config.yaml'))
  assert.deepEqual(config.providers.mine.models, ['vision-1', 'text-1'])
  // Model ids as mcode's ACP lists them (m:<provider>:<model>:<variant>) and as config.yaml writes them.
  const modalities = (id) => minimax.inputModalities({ env: { HOME: home } }, id)
  assert.deepEqual(modalities('m:minimax:MiniMax-M3:u'), ['text', 'image'])
  assert.deepEqual(modalities('m:minimax:MiniMax-M2.7:u'), ['text'])
  assert.deepEqual(modalities('m:custom_provider%3Amine:vision-1:v:thinking'), ['text', 'image'])
  assert.deepEqual(modalities('custom_provider:mine/text-1'), ['text'])

  const markdown = reviewResultMarkdown({ schemaVersion: 1, type: 'review.result', scope: 'local_changes', verdict: 'needs_changes', summary: 'Two issues.', findings: [
    { id: 'b', priority: 'P2', targetType: 'file', path: 'b.js', title: 'Minor', content: '' },
    { id: 'a', priority: 'P0', targetType: 'line-range', path: 'a.js', startLine: 3, endLine: 5, title: 'Crash', content: 'Null deref.' },
  ] })
  assert.equal(markdown, '**Code review: 2 findings.**\n\nTwo issues.\n\n- **P0** `a.js:3-5` Crash\n\n  Null deref.\n- **P2** `b.js` Minor')
  assert.equal(minimax.reviewRun({}, { type: 'baseBranch', branch: 'main' }, { cwd: home }), null)
  assert.deepEqual(minimax.reviewRun({}, { type: 'uncommittedChanges' }, { cwd: home, model: 'm:minimax:MiniMax-M3:u' }).args, ['exec', 'review', '--cwd', home, '--output-format', 'json', '--model', 'minimax/MiniMax-M3'])
  assert.match(minimax.reviewOutput(`${JSON.stringify({ status: 'succeeded', output: { type: 'review.result', verdict: 'pass', summary: 'Looks good.', findings: [] } })}\n`, '', 0), /no changes needed\.\*\*\n\nLooks good\./)
  assert.throws(() => minimax.reviewOutput(JSON.stringify({ status: 'failed', error: { message: 'no git repo' } }), '', 1), /no git repo/)
})

test('Images by path: a file is linked, a pasted image saved to the thread folder and linked (MiniMax reads images itself)', async () => {
  const dir = tmp()
  const file = path.join(dir, 'shot.png')
  fs.writeFileSync(file, Buffer.from([137, 80, 78, 71]))
  const blocks = await toAcpPrompt([
    { type: 'text', text: 'what is this' }, { type: 'localImage', path: file }, { type: 'image', url: `data:image/png;base64,${Buffer.from('png').toString('base64')}` },
  ], { prompt: { image: false }, imageLinks: { dir: path.join(dir, 'images') } })
  assert.deepEqual(blocks.map((block) => block.type), ['text', 'resource_link', 'resource_link'])
  assert.equal(blocks[1].uri, `file://${file}`)
  const saved = new URL(blocks[2].uri).pathname
  assert.equal(path.dirname(saved), path.join(dir, 'images'))
  assert.equal(fs.readFileSync(saved, 'utf8'), 'png')
  // Without imageLinks an agent that takes no images still gets the note.
  assert.match((await toAcpPrompt([{ type: 'localImage', path: file }], { prompt: { image: false } })).at(-1).text, /Attached image/)
})

test('Usage ledger: spend the agent metered in dollars is priced; the rest stays unpriced', () => {
  const ledger = new UsageLedger(tmp())
  ledger.record({ threadId: 't', model: 'm', usage: { inputTokens: 100, outputTokens: 50 }, costUsd: 0.25 })
  ledger.record({ threadId: 't', model: 'm', usage: { inputTokens: 10, outputTokens: 0 } })
  const { breakdown } = ledger.accountUsage()
  assert.equal(breakdown.priced, true)
  assert.equal(breakdown.allTime.costUsd, 0.25)
  assert.equal(breakdown.allTime.unpricedTokens, 10)
  assert.equal(breakdown.models[0].costUsd, 0.25)
  // A ledger with no spend keeps the unpriced shape.
  assert.equal(new UsageLedger(tmp()).accountUsage().breakdown.priced, false)
})
