// ACP bridge: agent features that reach OpenClaude Desktop (agent-started turns, plan approaches, rewinds, background
// commands, per-thread config files). Server flows run against the scripted ACP agent
// (packages/acp-bridge/testing/fake-acp-agent.mjs); adapter details against files laid out as each agent writes them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { userSystemPrompt } from '../packages/acp-bridge/src/agents/kimi.js'
import { sessionTurnUsage, restoreSession, liveSessionUsage } from '../packages/acp-bridge/src/agents/gemini.js'
import { minimaxLogin, skillLocationUri } from '../packages/acp-bridge/src/agents/minimax.js'
import { threadConfigYaml, threadPermissionFile, readAgentsBlock, ruleFromString, storedRule } from '../packages/acp-bridge/src/agents/minimax-config.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-features-')))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** A bridge on the scripted agent, driven like OpenClaude Desktop's client. */
function bridge({ adapter = adapterById('kimi'), env = {}, answer } = {}) {
  const home = tmp()
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const fullEnv = {
    PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, QWEN_HOME: path.join(home, '.qwen'), QWEN_CODE_SYSTEM_SETTINGS_PATH: path.join(home, 'none.json'),
    CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0',
    CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), FAKE_ACP_LOG: path.join(home, 'agent.log'), ...env,
  }
  const server = serve({ input: toServer, output: toClient, env: fullEnv, adapter, log: () => {} })
  const notes = []
  const requests = []
  const waiters = []
  const client = new LineTransport(toClient, toServer, {
    onRequest: async (method, params) => { requests.push({ method, params }); return answer ? answer(method, params) : {} },
    onNotification: (method, params) => {
      notes.push({ method, params })
      for (const waiter of [...waiters]) if (waiter.test(method, params)) { waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(params) }
    },
    log: () => {},
  })
  client.start()
  const waitFor = (check, timeoutMs = 15000) => {
    const found = notes.find((note) => check(note.method, note.params))
    if (found) return Promise.resolve(found.params)
    return new Promise((resolve, reject) => {
      const waiter = { test: check, resolve }
      waiters.push(waiter)
      setTimeout(() => { if (waiters.includes(waiter)) { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('timed out waiting for a notification')) } }, timeoutMs).unref?.()
    })
  }
  const call = (method, params) => client.call(method, params, 30000)
  const turn = async (threadId, text, extra = {}) => {
    const { turn: started } = await call('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], ...extra })
    return (await waitFor((method, params) => method === 'turn/completed' && params.turn.id === started.id)).turn
  }
  const items = (turnId, type) => notes.filter((note) => note.method === 'item/completed' && note.params.turnId === turnId && note.params.item.type === type).map((note) => note.params.item)
  return { home, call, turn, notes, requests, waitFor, items, close: () => server.shutdown() }
}

// ------------------------------------------------------------------ live usage (Gemini)

test('an agent that reports a turn\'s tokens only at its end has them published while the turn runs', async () => {
  let spent = 0
  const adapter = Object.assign(Object.create(adapterById('kimi')), { liveTurnUsage: () => (spent ? { usage: { inputTokens: spent, outputTokens: 10 }, contextUsed: spent } : null) })
  const b = bridge({ adapter })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    spent = 500
    const { turn } = await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'slow 5000', text_elements: [] }] })
    const usage = (total) => (method, params) => method === 'thread/tokenUsage/updated' && params.turnId === turn.id && params.tokenUsage.total.totalTokens === total
    const first = await b.waitFor(usage(510))
    assert.equal(first.tokenUsage.last.totalTokens, 500, 'the context fill of the latest call')
    spent = 900
    await b.waitFor(usage(910))
    await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === turn.id)
    assert.equal(b.notes.filter((note) => usage(510)(note.method, note.params)).length, 1, 'an unchanged reading is not sent again')
  } finally { b.close() }
})

test('usage frames a turn adds up (Qwen) are published while it runs, for an agent with no live reader', async () => {
  const adapter = Object.assign(Object.create(adapterById('kimi')), {
    liveTurnUsage: undefined,
    filterUpdate: (update) => (update.sessionUpdate === 'agent_message_chunk' ? { update, usage: { inputTokens: 100, outputTokens: 1 } } : { update }),
  })
  const b = bridge({ adapter })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const { turn } = await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'slow 3000', text_elements: [] }] })
    const live = await b.waitFor((method, params) => method === 'thread/tokenUsage/updated' && params.turnId === turn.id && params.tokenUsage.total.totalTokens > 0)
    assert.equal(live.tokenUsage.total.totalTokens % 101, 0)
    await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === turn.id)
  } finally { b.close() }
})

test('Kimi: a running turn\'s usage records, read on from the last look and from the turn\'s start', () => {
  const kimi = adapterById('kimi')
  const home = tmp()
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: path.join(home, '.kimi-code') } }
  const id = 'k1'
  const main = path.join(home, '.kimi-code', 'sessions', 'ws', id, 'agents', 'main', 'wire.jsonl')
  fs.mkdirSync(path.dirname(main), { recursive: true })
  const record = (usage) => `${JSON.stringify({ type: 'usage.record', model: 'k2', usage })}\n`
  fs.writeFileSync(main, record({ inputOther: 999, output: 9 }))
  const thread = { id }
  kimi.beforeTurn(ctx, thread)
  assert.equal(kimi.liveTurnUsage(ctx, thread, { since: 1 }), null, 'the previous turn\'s records are not this one\'s')
  fs.appendFileSync(main, record({ inputOther: 100, output: 10, inputCacheRead: 50 }))
  assert.deepEqual(kimi.liveTurnUsage(ctx, thread, { since: 1 }).usage, { inputTokens: 150, cachedInputTokens: 50, outputTokens: 10 })
  const sub = path.join(path.dirname(path.dirname(main)), 'agent-0', 'wire.jsonl')
  fs.mkdirSync(path.dirname(sub), { recursive: true })
  fs.writeFileSync(sub, record({ inputOther: 20, output: 2 }))
  assert.deepEqual(kimi.liveTurnUsage(ctx, thread, { since: 1 }).usage, { inputTokens: 170, cachedInputTokens: 50, outputTokens: 12 })
  // The next turn starts over from where settleUsage left the cursor.
  assert.equal(kimi.liveTurnUsage(ctx, { ...thread, kimiUsageCursor: { [main]: fs.statSync(main).size, [sub]: fs.statSync(sub).size } }, { since: 2 }), null)
})

// ------------------------------------------------------------------ agent-started turns (Qwen)

test('a turn the agent starts itself (Qwen goal round) shows as running and lets queued messages wait', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const first = await b.turn(thread.id, 'goal')
    const started = await b.waitFor((method, params) => method === 'turn/started' && params.turn.id !== first.id)
    const own = started.turn.id
    await b.waitFor((method, params) => method === 'thread/status/changed' && params.threadId === thread.id && params.status.type === 'active' && b.notes.some((note) => note.method === 'turn/started' && note.params.turn.id === own))
    // A message sent while the agent's own turn runs waits for it (no second prompt on top of the goal round).
    const { turn: queued } = await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'after', text_elements: [] }] })
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === own)
    assert.equal(done.turn.status, 'completed')
    assert.deepEqual(b.items(own, 'agentMessage').map((item) => item.text), ['goal round'])
    const after = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === queued.id)
    assert.equal(after.turn.status, 'completed')
    const startedAt = b.notes.findIndex((note) => note.method === 'turn/started' && note.params.turn.id === queued.id)
    const ownDone = b.notes.findIndex((note) => note.method === 'turn/completed' && note.params.turn.id === own)
    assert.ok(startedAt > ownDone, 'the queued message runs after the agent turn')
  } finally { await b.close() }
})

test('a Qwen cron run (no start or end notice) becomes its own turn with the echoed prompt, closed once Qwen goes quiet', async () => {
  const b = bridge({ adapter: adapterById('qwen') })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const first = await b.turn(thread.id, 'cron')
    const started = await b.waitFor((method, params) => method === 'turn/started' && params.turn.id !== first.id)
    const own = started.turn.id
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === own, 10000)
    assert.equal(done.turn.status, 'completed')
    const user = b.items(own, 'userMessage')
    assert.equal(user[0]?.content?.[0]?.text, 'CRON_TICK')
    assert.deepEqual(b.items(own, 'agentMessage').map((item) => item.text), ['tick reply'])
    const usage = b.notes.filter((note) => note.method === 'thread/tokenUsage/updated' && note.params.turnId === own).at(-1)
    assert.equal(usage?.params.tokenUsage.last.outputTokens, 4)
  } finally { await b.close() }
})

test('Qwen keeps a session with scheduled jobs loaded; MCP sign-ins come from mcp-oauth-tokens.json', () => {
  const qwen = adapterById('qwen')
  const thread = {}
  qwen.filterUpdate({ sessionUpdate: 'tool_call', toolCallId: 'c1', status: 'in_progress', _meta: { toolName: 'cron_create' }, rawInput: { cron: '* * * * *', prompt: 'x' } }, thread)
  qwen.filterUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 'c1', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'Scheduled abc123 (every minute)' } }] }, thread)
  assert.equal(qwen.keepLoaded(thread), true)
  qwen.filterUpdate({ sessionUpdate: 'tool_call', toolCallId: 'c2', status: 'in_progress', _meta: { toolName: 'cron_delete' } }, thread)
  qwen.filterUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 'c2', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: 'Cancelled abc123' } }] }, thread)
  assert.equal(qwen.keepLoaded(thread), false)

  const home = tmp()
  fs.mkdirSync(path.join(home, '.qwen'), { recursive: true })
  fs.writeFileSync(path.join(home, '.qwen', 'mcp-oauth-tokens.json'), JSON.stringify([{ serverName: 'linear', token: { accessToken: 'tok', tokenType: 'Bearer', expiresAt: Date.now() + 60000 } }, { serverName: 'old', token: { accessToken: 'x', expiresAt: 1 } }]))
  const ctx = { env: { HOME: home } }
  assert.deepEqual(qwen.mcpAuth(ctx, { name: 'linear' }), { headers: { Authorization: 'Bearer tok' } })
  assert.equal(qwen.mcpAuth(ctx, { name: 'old' }), null)
  assert.match(qwen.mcpSignInHint({ name: 'linear' }), /\/mcp auth linear/)
})

// ------------------------------------------------------------------ Kimi

test('Kimi plan approaches: the plan card, then the approach to implement; the plan text without Kimi\'s framing', async () => {
  const b = bridge({
    answer: (method, params) => {
      const id = params.questions?.[0]?.id
      if (id === 'plan-review') return { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'auto' } }
      if (id === 'plan-approach') return { answers: { 'plan-approach': { answers: ['Approach B (Recommended)'] } } }
      return {}
    },
  })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const done = await b.turn(thread.id, 'plan-options', { codeDesktop: { permissionMode: 'plan', afterPlan: 'auto' } })
    assert.deepEqual(b.items(done.id, 'agentMessage').map((item) => item.text), ['picked:plan_opt_1'])
    assert.equal(b.items(done.id, 'plan')[0]?.text, '# Plan\nDo it')
    const asked = b.requests.filter((request) => request.method === 'item/tool/requestUserInput').map((request) => request.params.questions[0])
    assert.deepEqual(asked.map((question) => question.id), ['plan-review', 'plan-approach'])
    assert.deepEqual(asked[1].options.map((option) => option.label), ['Approach A', 'Approach B (Recommended)', 'Leave Plan mode without implementing'])
    assert.deepEqual(asked[1].options.slice(0, 2).map((option) => option.description), ['fast', 'safe'])
  } finally { await b.close() }
})

test('Kimi plan approaches: leaving Plan mode without implementing answers plan_reject_and_exit', async () => {
  const b = bridge({
    answer: (method, params) => {
      const id = params.questions?.[0]?.id
      if (id === 'plan-review') return { answers: { 'plan-review': { answers: ['Approve'] } } }
      if (id === 'plan-approach') return { answers: { 'plan-approach': { answers: ['Leave Plan mode without implementing'] } } }
      return {}
    },
  })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '1' } })
    const { thread } = await b.call('thread/start', { cwd: b.home })
    const done = await b.turn(thread.id, 'plan-options', { codeDesktop: { permissionMode: 'plan', afterPlan: 'auto' } })
    assert.deepEqual(b.items(done.id, 'agentMessage').map((item) => item.text), ['picked:plan_reject_and_exit'])
    const permissions = await b.call('codeDesktop/thread/permissions', { threadId: thread.id }).catch(() => null)
    if (permissions?.mode) assert.notEqual(permissions.mode, 'plan')
  } finally { await b.close() }
})

test('Kimi keeps the user\'s own SYSTEM.md when OpenClaude Desktop adds instructions', () => {
  const kimi = adapterById('kimi')
  const home = tmp()
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const threadDir = path.join(home, 'thread')
  const ctx = { env: { HOME: home, KIMI_CODE_HOME: kimiHome } }
  // No SYSTEM.md of the user's: the built-in prompt, then the instructions.
  let launch = kimi.launch(ctx, { threadDir, appendPrompt: 'PROJECT_RULE' })
  assert.equal(fs.readFileSync(path.join(launch.env.KIMI_CODE_HOME, 'SYSTEM.md'), 'utf8'), '${base_prompt}\n\nPROJECT_RULE')
  fs.writeFileSync(path.join(kimiHome, 'SYSTEM.md'), 'MY_OWN_SYSTEM_PROMPT ${base_prompt}\n')
  assert.equal(userSystemPrompt(kimiHome), 'MY_OWN_SYSTEM_PROMPT ${base_prompt}')
  launch = kimi.launch(ctx, { threadDir, appendPrompt: 'PROJECT_RULE' })
  assert.equal(fs.readFileSync(path.join(launch.env.KIMI_CODE_HOME, 'SYSTEM.md'), 'utf8'), 'MY_OWN_SYSTEM_PROMPT ${base_prompt}\n\nPROJECT_RULE')
  // A full replacement (customization.systemPrompt) still replaces it.
  launch = kimi.launch(ctx, { threadDir, systemPrompt: 'REPLACED', appendPrompt: 'PROJECT_RULE' })
  assert.equal(fs.readFileSync(path.join(launch.env.KIMI_CODE_HOME, 'SYSTEM.md'), 'utf8'), 'REPLACED\n\nPROJECT_RULE')
  assert.equal(kimi.planText('Plan saved to: /x/plans/a.md\n\n# Plan\nA\nRequesting approval to Presenting plan and exiting plan mode'), '# Plan\nA')
  assert.equal(kimi.sessionFeatures.revert, 'file')
  assert.equal(typeof kimi.revertSession, 'function')
})

// ------------------------------------------------------------------ Gemini

test('Gemini: never its own sandbox, full token split per turn, retention-deleted sessions written back', () => {
  const gemini = adapterById('gemini')
  const home = tmp()
  const ctx = { env: { HOME: home } }
  const launch = gemini.launch(ctx, { threadDir: path.join(home, 'thread'), cwd: home, writable: [home] })
  assert.equal(launch.env.GEMINI_SANDBOX, 'false')
  // Every built-in tool off: one stays, else Gemini sends an empty tools entry Vertex AI refuses (tool_type one_of).
  const all = gemini.builtinTools().map((tool) => tool.name)
  gemini.launch(ctx, { threadDir: path.join(home, 'toolless'), cwd: home, writable: [home], disabledTools: all })
  const toolless = JSON.parse(fs.readFileSync(path.join(home, 'toolless', 'gemini-home', '.gemini', 'settings.json'), 'utf8'))
  assert.deepEqual(all.filter((name) => !toolless.tools.exclude.includes(name)), ['update_topic'])
  gemini.launch(ctx, { threadDir: path.join(home, 'some'), cwd: home, writable: [home], disabledTools: ['update_topic', 'run_shell_command'] })
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, 'some', 'gemini-home', '.gemini', 'settings.json'), 'utf8')).tools.exclude, ['update_topic', 'run_shell_command'])

  const chat = { messages: [
    { type: 'user', content: [{ text: 'first' }] }, { type: 'gemini', content: 'a', tokens: { input: 999, output: 1, cached: 0, thoughts: 0, tool: 0, total: 1000 } },
    { type: 'user', content: [{ text: 'second' }] },
    { type: 'gemini', content: '', tokens: { input: 120, output: 30, cached: 20, thoughts: 8, tool: 2, total: 160 }, model: 'gemini-2.5-pro' },
    { type: 'user', content: [{ functionResponse: { name: 'x' } }] },
    { type: 'gemini', content: 'done', tokens: { input: 200, output: 10, cached: 100, thoughts: 5, tool: 0, total: 215 }, model: 'gemini-2.5-pro' },
  ] }
  assert.deepEqual(sessionTurnUsage(chat), { usage: { inputTokens: 322, cachedInputTokens: 120, outputTokens: 53, reasoningOutputTokens: 13, totalTokens: 375 }, model: 'gemini-2.5-pro' })
  assert.equal(sessionTurnUsage({ messages: [{ type: 'user', content: [{ text: 'q' }] }] }), null)
  // A turn that failed before Gemini recorded its prompt: the file's last prompt is the previous turn's, not counted again.
  const stamped = { messages: [{ type: 'user', timestamp: '2026-10-17T14:00:00.000Z', content: [{ text: 'old' }] }, { type: 'gemini', tokens: { input: 50, output: 5, total: 55 } }] }
  assert.equal(sessionTurnUsage(stamped, { since: Date.parse('2026-10-17T14:05:00.000Z') }), null)
  assert.equal(sessionTurnUsage(stamped, { since: Date.parse('2026-10-17T14:00:02.000Z') }).usage.totalTokens, 55)

  // A running turn's tokens, read from where the last read left off (a line written in two pieces counts once whole).
  const sessionId = 'c0ffee12-0000-4000-8000-000000000001'
  const chats = path.join(home, '.gemini', 'tmp', 'live', 'chats')
  fs.mkdirSync(chats, { recursive: true })
  const live = path.join(chats, 'session-2026-10-17T14-26-c0ffee12.jsonl')
  const line = (record) => `${JSON.stringify(record)}\n`
  const promptAt = Date.parse('2026-10-17T14:26:16.000Z')
  fs.writeFileSync(live, line({ sessionId, projectHash: 'h', startTime: '2026-10-17T14:26:16.000Z', lastUpdated: '2026-10-17T14:26:16.000Z' })
    + line({ id: 'u1', timestamp: '2026-10-17T14:26:16.000Z', type: 'user', content: [{ text: 'go' }] }))
  assert.equal(liveSessionUsage(ctx.env, sessionId, promptAt), null)
  const call = line({ id: 'g1', timestamp: '2026-10-17T14:26:40.000Z', type: 'gemini', content: '', tokens: { input: 1000, output: 40, cached: 0, thoughts: 10, tool: 0, total: 1050 } })
  fs.appendFileSync(live, call.slice(0, 30))
  assert.equal(liveSessionUsage(ctx.env, sessionId, promptAt), null)
  fs.appendFileSync(live, call.slice(30))
  assert.deepEqual(liveSessionUsage(ctx.env, sessionId, promptAt), { usage: { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 50, reasoningOutputTokens: 10, totalTokens: 1050 }, contextUsed: 1040 })
  fs.appendFileSync(live, line({ id: 'g2', timestamp: '2026-10-17T14:27:00.000Z', type: 'gemini', content: 'ok', tokens: { input: 1200, output: 20, cached: 900, thoughts: 0, tool: 0, total: 1220 } }))
  assert.equal(liveSessionUsage(ctx.env, sessionId, promptAt).usage.totalTokens, 2270)
  // The file's last prompt is from before this turn was sent: the previous turn's tokens are not this one's.
  assert.equal(liveSessionUsage(ctx.env, sessionId, promptAt + 60_000), null)

  // A project Gemini knows (tmp/<slug>/.project_root) whose session file is gone: the bridge's history becomes one again.
  const workspace = path.join(home, 'workspace')
  fs.mkdirSync(workspace)
  fs.mkdirSync(path.join(home, '.gemini', 'tmp', 'workspace'), { recursive: true })
  fs.writeFileSync(path.join(home, '.gemini', 'tmp', 'workspace', '.project_root'), workspace)
  const turns = [{ id: 't1', startedAtMs: 1000, completedAtMs: 2000, items: [{ type: 'userMessage', content: [{ type: 'text', text: 'hello' }] }, { type: 'agentMessage', text: 'hi there' }] }]
  assert.equal(restoreSession(ctx.env, '590d2884-c80c-43c3-887e-e0d5a0d072f6', { cwd: workspace, turns }), true)
  const files = fs.readdirSync(path.join(home, '.gemini', 'tmp', 'workspace', 'chats'))
  assert.equal(files.length, 1)
  assert.match(files[0], /^session-.*-590d2884\.jsonl$/)
  const records = fs.readFileSync(path.join(home, '.gemini', 'tmp', 'workspace', 'chats', files[0]), 'utf8').trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(records[0].sessionId, '590d2884-c80c-43c3-887e-e0d5a0d072f6')
  assert.deepEqual(records.slice(1, 3).map((record) => [record.type, record.type === 'user' ? record.content[0].text : record.content]), [['user', 'hello'], ['gemini', 'hi there']])
  // A session Gemini saved a prompt of can be reopened; one it never recorded can't (its process is kept instead).
  assert.equal(gemini.hasSavedSession(ctx, '590d2884-c80c-43c3-887e-e0d5a0d072f6'), true)
  assert.equal(gemini.hasSavedSession(ctx, '6ea195a6-c5da-4570-ad00-5f7cfb2d7f23'), false)
  // beforeLoad only writes one back when the file is missing.
  assert.equal(gemini.beforeLoad(ctx, '590d2884-c80c-43c3-887e-e0d5a0d072f6', { cwd: workspace, turns }), undefined)
})

test('Gemini background commands are listed, stopped with their process group, and stopped with the session', async () => {
  const gemini = adapterById('gemini')
  const child = spawn('/bin/sh', ['-c', 'sleep 60'], { detached: true, stdio: 'ignore' })
  child.unref()
  try {
    const thread = { cwd: '/tmp' }
    gemini.filterUpdate({ sessionUpdate: 'tool_call', toolCallId: 'run_shell_command__1', title: 'npm run dev', status: 'in_progress', rawInput: { command: 'npm run dev', is_background: true } }, thread)
    const shown = gemini.filterUpdate({ sessionUpdate: 'tool_call_update', toolCallId: 'run_shell_command__1', status: 'completed', content: [{ type: 'content', content: { type: 'text', text: `Command moved to background (PID: ${child.pid}). Output hidden. Press Ctrl+B to view.` } }] }, thread)
    assert.doesNotMatch(shown.update.content[0].content.text, /Ctrl\+B/)
    assert.deepEqual(gemini.backgroundProcesses(thread).map((entry) => [entry.processId, entry.command, entry.itemId]), [[String(child.pid), 'npm run dev', 'run_shell_command__1']])
    assert.equal(gemini.stopBackground(thread, String(child.pid)), true)
    for (let wait = 0; wait < 40; wait++) { try { process.kill(child.pid, 0) } catch { break } await sleep(50) }
    assert.throws(() => process.kill(child.pid, 0))
    assert.deepEqual(gemini.backgroundProcesses(thread), [])
  } finally { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
})

// ------------------------------------------------------------------ MiniMax

test('MiniMax config.yaml: permissionMode default, no nested sandbox, tool switches merged into agents.default', () => {
  const user = 'defaultModel: x\npermissionMode: bypassPermissions\nsandbox:\n  enabled: true\nagents:\n  default:\n    tools:\n      - read\n      - bash\n      - write\n    skills: [pdf]\n    features:\n      mavis: true\ncustom_provider:\n  local:\n    name: local\n'
  const { text, warnings } = threadConfigYaml(user, { disabled: ['bash', 'task', 'web_search', 'image_synthesize', 'memory'], nestedSandbox: true })
  assert.deepEqual(warnings, [])
  assert.match(text, /^permissionMode: default$/m)
  assert.doesNotMatch(text, /bypassPermissions/)
  assert.match(text, /^sandbox:\n {2}enabled: false$/m)
  const agents = readAgentsBlock(text)
  assert.deepEqual(agents.default.tools, ['read', 'write'])
  assert.deepEqual(agents.default.skills, ['pdf'])
  assert.deepEqual(agents.default.features, { mavis: true, delegation: false, webSearch: false })
  assert.ok(!agents.default.builtinTools.includes('image_synthesize') && agents.default.builtinTools.length === 16)
  assert.match(text, /^custom_provider:\n {2}local:\n {4}name: local$/m)
  // Bypass (no Seatbelt): the user's own sandbox setting stays; nothing switched off: no agents block.
  const plain = threadConfigYaml('defaultModel: y\nsandbox:\n  enabled: true\n', { disabled: [], nestedSandbox: false }).text
  assert.equal(plain, 'defaultModel: y\nsandbox:\n  enabled: true\npermissionMode: default\n')
})

test('MiniMax permission.json: valid v2 rules, the user\'s deny and ask rules kept (v1 converted), per-server MCP rules', () => {
  const v2 = threadPermissionFile({ version: 2, deny: [{ tool_name: 'write', matcher: { kind: 'tool' } }, 'not-v2', { tool_name: 'bash', matcher: { kind: 'path', pattern: '/x' } }], ask: [{ tool_name: 'read', matcher: { kind: 'tool' } }] }, 'ask', ['linear'])
  assert.equal(v2.version, 2)
  assert.deepEqual(v2.deny, [{ tool_name: 'write', matcher: { kind: 'tool' } }])
  assert.deepEqual(v2.ask.map((rule) => rule.tool_name), ['read', 'write', 'edit', 'bash', 'web_fetch', 'website_deploy', 'mcp__linear'])
  for (const rule of [...v2.ask, ...v2.deny]) assert.deepEqual(storedRule(rule), rule)
  const v1 = threadPermissionFile({ deny: ['bash(rm -rf:*)', 'write(/etc/*)', 'web_fetch'] }, 'acceptEdits')
  assert.deepEqual(v1.deny, [
    { tool_name: 'bash', matcher: { kind: 'command', pattern: 'rm -rf:*' } },
    { tool_name: 'write', matcher: { kind: 'path', pattern: '/etc/*', actions: ['read', 'write', 'delete', 'execute', 'network'] } },
    { tool_name: 'web_fetch', matcher: { kind: 'tool' } },
  ])
  assert.ok(!v1.ask.some((rule) => rule.tool_name === 'write' || rule.tool_name === 'edit'))
  assert.deepEqual(ruleFromString('bash'), { tool_name: 'bash', matcher: { kind: 'tool' } })
})

test('MiniMax: signed in only with a credential file; terminal sessions warn that OpenClaude Desktop settings do not apply', () => {
  const minimax = adapterById('minimax')
  const home = tmp()
  const data = path.join(home, '.minimax')
  fs.mkdirSync(path.join(data, 'auth', 'prod', 'cn', 'mcode-public'), { recursive: true })
  fs.writeFileSync(path.join(data, 'auth', 'auth.lock'), '')
  fs.writeFileSync(path.join(data, 'auth', 'prod', 'cn', 'mcode-public', 'auth.lock'), '')
  fs.writeFileSync(path.join(data, 'config.yaml'), 'defaultModel: minimax/MiniMax-M3\n')
  const ctx = { env: { HOME: home } }
  assert.equal(minimaxLogin(data), null)
  assert.equal(minimax.account(ctx).kind, null)
  fs.writeFileSync(path.join(data, 'auth', 'prod', 'cn', 'mcode-public', 'auth.json'), JSON.stringify({ access_token: 'x' }))
  assert.deepEqual(minimaxLogin(data), { region: 'cn' })
  const account = minimax.account(ctx)
  assert.equal(account.kind, 'oauth')
  assert.match(account.detail, /Mainland China/)

  assert.equal(minimax.permissionWarning('ask', { agentHome: null }), null)
  assert.match(minimax.permissionWarning('ask', { agentHome: 'real' }), /started in MiniMax Code's terminal/)
  assert.equal(minimax.permissionWarning('auto', { agentHome: 'real' }), null)
  assert.match(minimax.permissionWarning('auto', { agentHome: 'real', custom: { instructions: 'x' } }), /instructions don't apply/)
  // Only switches mcode honours are offered.
  const names = minimax.builtinTools().map((tool) => tool.name)
  for (const name of ['memory', 'code_review', 'skill', 'ask_user', 'task_append']) assert.ok(!names.includes(name), name)
  for (const name of ['web_search', 'task', 'image_synthesize', 'website_deploy']) assert.ok(names.includes(name), name)
  assert.match(skillLocationUri(path.join(data, 'config.yaml')), /^files:\/\/\//)
})

test('MiniMax thread launch: its own config.yaml and a valid permission.json for Ask', () => {
  const minimax = adapterById('minimax')
  const home = tmp()
  const data = path.join(home, '.minimax')
  fs.mkdirSync(data, { recursive: true })
  fs.writeFileSync(path.join(data, 'config.yaml'), 'defaultModel: custom_provider:local/m\npermissionMode: bypassPermissions\n')
  fs.writeFileSync(path.join(data, 'permission.json'), JSON.stringify({ version: 2, deny: [{ tool_name: 'write', matcher: { kind: 'tool' } }] }))
  fs.writeFileSync(path.join(data, 'mcp.json'), JSON.stringify({ mcpServers: { linear: { url: 'https://example.invalid/mcp' } } }))
  const ctx = { env: { HOME: home }, program: { node: process.execPath, binary: null }, log: () => {} }
  const launch = minimax.launch(ctx, { threadDir: path.join(home, 'thread'), cwd: home, askAll: 'ask', sandbox: 'workspace-write', disabledTools: ['bash'], disabledServers: [] })
  const own = launch.env.MINIMAX_DATA_DIR
  assert.ok(!fs.lstatSync(path.join(own, 'config.yaml')).isSymbolicLink())
  const config = fs.readFileSync(path.join(own, 'config.yaml'), 'utf8')
  assert.match(config, /^permissionMode: default$/m)
  assert.match(config, /^sandbox:\n {2}enabled: false$/m)
  assert.match(config, /tools: \[read, write, edit, task_query/)
  const permission = JSON.parse(fs.readFileSync(path.join(own, 'permission.json'), 'utf8'))
  assert.deepEqual(permission.deny, [{ tool_name: 'write', matcher: { kind: 'tool' } }])
  assert.ok(permission.ask.some((rule) => rule.tool_name === 'mcp__linear'))
  // The user's files are untouched.
  assert.match(fs.readFileSync(path.join(data, 'config.yaml'), 'utf8'), /bypassPermissions/)
})
