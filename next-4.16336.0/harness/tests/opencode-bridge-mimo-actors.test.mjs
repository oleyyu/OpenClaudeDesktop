// MiMo actors (background sub-agents inside the parent session, kept as their own message slices), their usage, MiMo's
// native side question (POST /session/:id/ask), and the per-agent tool switches OpenClaude Desktop's workflow engine uses.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Projector, actorErrorLine, actorThreadId, messageSliceQuery, toolItem } from '../packages/opencode-bridge/src/projection.js'
import { denyRules, mcpConfigSelection, mergeToolSelections } from '../packages/opencode-bridge/src/tools.js'
import { AgentHttpError } from '../packages/opencode-bridge/src/server.js'
import { Bridge, LiveThread, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-actors-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const S = 'ses_main'
const user = (id, created, text, extra = {}) => ({ info: { id, sessionID: S, role: 'user', time: { created }, ...extra }, parts: [{ id: `${id}-p0`, sessionID: S, messageID: id, type: 'text', text }] })
const assistant = (id, parentID, created, parts, extra = {}) => ({
  info: { id, sessionID: S, role: 'assistant', parentID, time: { created, completed: created + 5 }, finish: 'stop', tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } }, providerID: 'p', modelID: 'm', ...extra },
  parts: parts.map((part, index) => ({ id: `${id}-p${index}`, sessionID: S, messageID: id, ...part })),
})
const spawnPart = (status = 'completed') => ({
  type: 'tool', tool: 'actor', callID: 'call-spawn',
  state: { status, input: { operation: { action: 'spawn', subagent_type: 'general', description: 'Look around', prompt: 'look' } }, output: 'Background sub-session started. actor_id: general-1', metadata: { actorId: 'general-1' } },
})
const history = ({ actorFails = false } = {}) => [
  user('msg_1', 1000, 'investigate'),
  assistant('msg_2', 'msg_1', 1100, [spawnPart()]),
  assistant('msg_3', 'msg_1', 1200, [{ type: 'text', text: 'spawned', time: { start: 1, end: 2 } }]),
  user('msg_a1', 1150, 'look', { agentID: 'general-1' }),
  actorFails
    ? assistant('msg_a2', 'msg_a1', 1160, [], { agentID: 'general-1', finish: undefined, error: { name: 'APIError', data: { message: 'bad request from probe', statusCode: 400 } } })
    : assistant('msg_a2', 'msg_a1', 1160, [{ type: 'text', text: 'sub ok', time: { start: 1, end: 2 } }], { agentID: 'general-1' }),
]

function bridgeFor(flavor, routes) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const calls = []
  bridge.api = async (method, route, options = {}) => {
    calls.push({ method, route, query: options.query ?? null, body: options.body ?? null })
    for (const [pattern, answer] of routes) {
      const [verb, at] = pattern.split(' ')
      if (verb === method && (at === route || (at.endsWith('*') && route.startsWith(at.slice(0, -1))))) return typeof answer === 'function' ? answer(options, route) : answer
    }
    if (method === 'GET') return route.endsWith('/message') ? [] : {}
    return {}
  }
  bridge.mergedConfig = async () => ({})
  bridge.mcpServers = async () => []
  return { bridge, notes, calls, home }
}

const agentsStateOf = (projector) => {
  const turn = projector.turns().at(-1)
  return turn.items.find((item) => item.type === 'collabAgentToolCall').agentsStates[actorThreadId(S, 'general-1')]
}

// ------------------------------------------------------------------ slices and spawn states

test('the main view keeps its actors\' slices apart: never in its transcript, but in their tokens', () => {
  const projector = new Projector({ threadId: S, cwd: '/w', meta: {} })
  projector.load(history())
  assert.deepEqual([...projector.messages.keys()], ['msg_1', 'msg_2', 'msg_3'])
  assert.deepEqual([...projector.slices.keys()], ['msg_a1', 'msg_a2'])
  assert.equal(projector.context().actorTokens('general-1'), 15)
  // A live actor message the main thread hands to the actor's thread is still counted.
  projector.noteSlice({ id: 'msg_a3', sessionID: S, role: 'assistant', agentID: 'general-1', time: { created: 1170 }, tokens: { input: 1, output: 1 } })
  assert.equal(projector.context().actorTokens('general-1'), 17)
  // The main view's own usage stays the main agent's.
  assert.equal(projector.usage().total.totalTokens, 30)
})

test('a background actor spawn reports how the actor ended, not the spawn acknowledgement', () => {
  // Finished: its slice's last message (MiMo restarted, no record).
  let projector = new Projector({ threadId: S, cwd: '/w', meta: {} })
  projector.load(history())
  assert.deepEqual(agentsStateOf(projector), { status: 'completed', message: 'sub ok' })
  // Failed: its slice ended on an error.
  projector = new Projector({ threadId: S, cwd: '/w', meta: {} })
  projector.load(history({ actorFails: true }))
  assert.deepEqual(agentsStateOf(projector), { status: 'errored', message: 'bad request from probe' })
  // MiMo's own record (GET /session/:id/actors executionState) wins; the slice's error reads better than its lastError.
  projector.actorStates.set('general-1', { state: 'failed', error: 'Actor assistant failed: APIError' })
  assert.deepEqual(agentsStateOf(projector), { status: 'errored', message: 'bad request from probe' })
  projector.load(history().slice(0, 3))
  assert.deepEqual(agentsStateOf(projector), { status: 'errored', message: 'Actor assistant failed: APIError' })
  assert.equal(actorErrorLine('Error: Actor assistant failed: APIError\n    at <anonymous> (/$bunfs/root/chunk.js:22:1066)'), 'Actor assistant failed: APIError')
  projector.actorStates.set('general-1', { state: 'running', error: null })
  assert.deepEqual(agentsStateOf(projector), { status: 'running', message: null })
  projector.actorStates.set('general-1', { state: 'stopped', error: null })
  assert.equal(agentsStateOf(projector).status, 'interrupted')
  // Nothing known yet: still running (the acknowledgement is no result).
  projector = new Projector({ threadId: S, cwd: '/w', meta: {} })
  projector.load(history().slice(0, 3))
  assert.deepEqual(agentsStateOf(projector), { status: 'running', message: null })
})

test('a blocking actor run and an OpenCode task keep their call\'s own result', () => {
  const run = { ...spawnPart(), state: { ...spawnPart().state, input: { operation: { action: 'run', prompt: 'look' } }, output: 'the result' } }
  const item = toolItem({ ...run, id: 'p1', sessionID: S, messageID: 'm' }, { threadId: S, cwd: '/w', actorOutcome: () => ({ status: 'errored', message: 'x' }) })
  assert.deepEqual(Object.values(item.agentsStates), [{ status: 'completed', message: 'the result' }])
  const task = toolItem({ type: 'tool', tool: 'task', id: 'p2', sessionID: S, messageID: 'm', callID: 'c', state: { status: 'completed', input: { prompt: 'p', subagent_type: 'general' }, output: 'done', metadata: { sessionId: 'ses_child' } } }, { threadId: S, cwd: '/w' })
  assert.deepEqual(task.agentsStates, { ses_child: { status: 'completed', message: 'done' } })
})

test('message slice queries: MiMo actors read their own slice, every slice on *, OpenCode none', () => {
  assert.deepEqual(messageSliceQuery(FLAVORS.mimo, 'general-1'), { agent_id: 'general-1' })
  assert.deepEqual(messageSliceQuery(FLAVORS.mimo), { agent_id: '*' })
  assert.equal(messageSliceQuery(FLAVORS.opencode, 'x'), null)
})

test('reopening a MiMo session reads its actors\' record and slices; the actor\'s thread reads its own slice', async () => {
  const all = history({ actorFails: true })
  const { bridge, calls } = bridgeFor('mimo', [
    [`GET /session/${S}`, { id: S, directory: '/w', time: { created: 1, updated: 2 } }],
    [`GET /session/${S}/message`, (options) => (options.query?.agent_id === '*' ? all : options.query?.agent_id ? all.filter((entry) => entry.info.agentID === options.query.agent_id) : all.filter((entry) => !entry.info.agentID))],
    [`GET /session/${S}/actors`, [{ actorID: 'general-1', executionState: 'failed', lastOutcome: 'failure', lastError: 'bad request from probe' }]],
    ['GET /session/status', {}],
  ])
  const thread = new LiveThread(bridge, { info: { id: S, directory: '/w', time: { created: 1 } } })
  await thread.reload()
  assert.ok(calls.some((call) => call.route === `/session/${S}/message` && call.query?.agent_id === '*'))
  assert.ok(calls.some((call) => call.route === `/session/${S}/actors`))
  const snapshot = thread.projector.snapshot(thread.turns().at(-1))
  const spawn = snapshot.items.find((item) => item.type === 'collabAgentToolCall')
  assert.deepEqual(spawn.agentsStates[actorThreadId(S, 'general-1')], { status: 'errored', message: 'bad request from probe' })
  // The actor's own thread: its prompt and its failed reply.
  calls.length = 0
  const actor = await bridge.historyOf(actorThreadId(S, 'general-1'))
  const read = calls.find((call) => call.route === `/session/${S}/message`)
  assert.deepEqual(read.query, { agent_id: 'general-1' })
  const turns = actor.turns()
  assert.equal(turns.length, 1)
  assert.equal(turns[0].items[0].type, 'userMessage')
  assert.equal(actor.projector.snapshot(turns[0]).status, 'failed')
})

test('OpenCode reloads a session as before (no slice or actor requests)', async () => {
  const { bridge, calls } = bridgeFor('opencode', [[`GET /session/${S}`, { id: S, directory: '/w', time: { created: 1 } }]])
  const thread = new LiveThread(bridge, { info: { id: S, directory: '/w', time: { created: 1 } } })
  await thread.reload()
  assert.ok(!calls.some((call) => call.query?.agent_id || call.route.endsWith('/actors')))
})

test('live: an actor\'s messages and status reach the main thread\'s spawn card and token count', () => {
  const { bridge } = bridgeFor('mimo', [])
  const thread = new LiveThread(bridge, { info: { id: S, directory: '/w', time: { created: 1 } } })
  thread.projector.load(history().slice(0, 3))
  bridge.threads.set(S, thread)
  thread.onEvent('message.updated', { info: { id: 'msg_a2', sessionID: S, role: 'assistant', agentID: 'general-1', time: { created: 1160 }, tokens: { input: 7, output: 3 } } })
  assert.equal(thread.projector.context().actorTokens('general-1'), 10)
  thread.onEvent('actor.status', { sessionID: S, actorID: 'general-1', status: 'idle', lastOutcome: 'failure', error: 'it broke', turnCount: 1, lastTurnTime: 1 })
  assert.deepEqual(agentsStateOf(thread.projector), { status: 'errored', message: 'it broke' })
  // The actor's own thread got the events (never the main transcript).
  assert.ok(bridge.children.has(actorThreadId(S, 'general-1')))
  assert.deepEqual([...thread.projector.messages.keys()], ['msg_1', 'msg_2', 'msg_3'])
})

// ------------------------------------------------------------------ usage

test('MiMo usage folds every slice of a session, OpenCode only its listing', async () => {
  for (const flavor of ['mimo', 'opencode']) {
    const all = history()
    const { bridge } = bridgeFor(flavor, [
      [`GET /session/${S}/message`, (options) => (options.query?.agent_id === '*' ? all : all.filter((entry) => !entry.info.agentID))],
    ])
    bridge.listSessions = async () => [{ id: S, directory: '/w', time: { created: 1, updated: 2 } }]
    const folds = await bridge.usageFolds()
    const tokens = folds.reduce((sum, fold) => sum + Object.values(fold.days).reduce((total, day) => total + day.tokens, 0), 0)
    assert.equal(tokens, flavor === 'mimo' ? 45 : 30, flavor)
    assert.equal(Object.values(folds[0].days).reduce((total, day) => total + day.sessions, 0), 1)
  }
})

// ------------------------------------------------------------------ side question

function sideBridge(ask) {
  const deleted = []
  const env = bridgeFor('mimo', [
    [`GET /session/${S}`, { id: S, directory: '/w', time: { created: 1 }, model: { providerID: 'p', id: 'm' } }],
    [`POST /session/${S}/ask`, (options) => ask(options, env)],
    [`GET /session/${S}/children`, () => env.listed ?? []],
    ['DELETE /session/*', (options, route) => { deleted.push(route); return true }],
    [`POST /session/${S}/fork`, () => { throw new Error('forked') }],
  ])
  env.deleted = deleted
  return env
}

test('MiMo answers a side question with its own /ask and keeps its answer session out of the app', async () => {
  const env = sideBridge((options, { bridge }) => {
    // MiMo opens an 'ask: …' child session for the read-only answer while the request runs.
    bridge.onEvent({ payload: { type: 'session.created', properties: { info: { id: 'ses_ask', parentID: S, title: 'ask: what happened?', directory: '/w', time: { created: Date.now() } } } } })
    bridge.onEvent({ payload: { type: 'actor.registered', properties: { sessionID: 'ses_ask', actorID: 'ses_ask', mode: 'subagent', description: 'fork-query', agent: 'build', background: false } } })
    assert.ok(fs.existsSync(path.join(bridge.config.runtimeDir, 'sessions', 'ses_ask.json')))
    return { answer: 'side answer' }
  })
  const result = await env.bridge.sideQuestion({ threadId: S, question: 'what happened?', history: [{ question: 'first?', answer: 'one' }], requestId: 'r1' })
  assert.equal(result.text, 'side answer')
  assert.equal(result.finish, 'stop')
  const ask = env.calls.find((call) => call.route === `/session/${S}/ask`)
  assert.deepEqual(ask.body, { question: 'Earlier side question: first?\nAnswer: one\n\nwhat happened?', providerID: 'p', modelID: 'm' })
  assert.ok(!env.calls.some((call) => call.route.endsWith('/fork')))
  assert.deepEqual(env.deleted, ['/session/ses_ask'])
  assert.ok(!env.notes.some((note) => note.method === 'thread/started'))
  assert.deepEqual(env.notes.filter((note) => note.method === 'codeDesktop/sideQuestion/delta').map((note) => note.params.text), ['side answer'])
  assert.equal(env.bridge.store.get('ses_ask').hidden, true)
  assert.equal(env.bridge.sideAsks.size, 0)
  assert.equal(env.bridge.sideSessions.size, 0)
})

test('MiMo side question: a missed answer session is found and deleted; failures are errors', async () => {
  let env = sideBridge((options, state) => { state.listed = [{ id: 'ses_late', parentID: S, title: 'ask: q', time: { created: Date.now() } }, { id: 'ses_other', parentID: S, title: 'Real child', time: { created: Date.now() } }]; return { answer: 'ok' } })
  await env.bridge.sideQuestion({ threadId: S, question: 'q', requestId: 'r2' })
  assert.deepEqual(env.deleted, ['/session/ses_late'])
  env = sideBridge(() => ({ answer: '(fork-query failed: provider said no)' }))
  await assert.rejects(env.bridge.sideQuestion({ threadId: S, question: 'q', requestId: 'r3' }), /provider said no/)
  // An older MiMo without /ask: the forked copy answers instead.
  env = sideBridge(() => { throw new AgentHttpError(404, 'MiMo Code: 404 Not Found') })
  await assert.rejects(env.bridge.sideQuestion({ threadId: S, question: 'q', requestId: 'r4' }), /forked/)
})

// ------------------------------------------------------------------ workflow agents' tool switches

test('workflow agents: web, sub-agent and connector exclusions have switches on both agents', () => {
  assert.deepEqual(capabilitiesFor(FLAVORS.opencode).workflowToolSwitches, { WebFetch: ['webfetch'], WebSearch: ['websearch', 'codesearch'], Agent: ['task'], Task: ['task'] })
  // MiMo's sub-agents are actors; its `task` is the work-item list and stays.
  assert.deepEqual(capabilitiesFor(FLAVORS.mimo).workflowToolSwitches, { WebFetch: ['webfetch'], WebSearch: ['websearch', 'codesearch'], Agent: ['actor'], Task: ['actor'] })
  for (const id of ['opencode', 'mimo']) assert.equal(capabilitiesFor(FLAVORS[id]).workflowMcpSwitches, true)
  const selection = mcpConfigSelection({ web_search: 'disabled', 'mcp_servers.github.enabled': false, 'mcp_servers.my.server.disabled_tools': ['create issue', ''], mcp_servers: { linear: { enabled: false } } })
  assert.deepEqual(selection, { disabled: ['my_server_create_issue'], disabledServers: ['github', 'linear'] })
  assert.equal(mcpConfigSelection({ 'mcp_servers.github.enabled': true }), null)
  assert.deepEqual(denyRules(mergeToolSelections({ disabled: ['webfetch'], disabledServers: [] }, selection), FLAVORS.mimo).map((rule) => rule.permission), ['webfetch', 'my_server_create_issue', 'github_*', 'linear_*'])
})

test('thread/start config connector overrides join the thread\'s tool selection', async () => {
  const { bridge, calls } = bridgeFor('mimo', [])
  const thread = new LiveThread(bridge, { info: { id: S, directory: '/w', time: { created: 1 } } })
  await thread.applyParams({ model: 'p/m', codeDesktop: { tools: { disabled: ['actor', 'webfetch'] } }, config: { 'mcp_servers.github.enabled': false } }, { initial: true })
  assert.deepEqual(thread.tools, { disabled: ['actor', 'webfetch'], disabledServers: ['github'] })
  const patch = calls.find((call) => call.method === 'PATCH')
  const denied = patch.body.permission.filter((rule) => rule.action === 'deny' && rule.pattern === '*').map((rule) => rule.permission)
  for (const name of ['actor', 'webfetch', 'github_*']) assert.ok(denied.includes(name), name)
})

test('MiMo actor wait / status / send / cancel are agent operation rows tied to the actor thread; models stays a tool row', () => {
  const part = (operation, output, metadata = {}, status = 'completed') => ({ type: 'tool', tool: 'actor', id: `p-${operation.action}`, sessionID: S, messageID: 'm', callID: 'c', state: { status, input: { operation }, output, metadata, title: 'Actor wait: idle/success' } })
  const child = actorThreadId(S, 'general-1')
  const wait = toolItem(part({ action: 'wait', actor_id: 'general-1', timeout_ms: 20000 }, JSON.stringify({ status: 'idle', executionState: 'completed', actor_id: 'general-1', result: 'sub ok' })), { threadId: S, cwd: '/w' })
  assert.equal(wait.type, 'collabAgentToolCall')
  assert.equal(wait.tool, 'wait')
  assert.deepEqual(wait.receiverThreadIds, [child])
  assert.deepEqual(wait.agentsStates, { [child]: { status: 'completed', message: 'sub ok' } })
  const status = toolItem(part({ action: 'status', actor_id: 'general-1' }, JSON.stringify({ status: 'running', executionState: 'running' })), { threadId: S, cwd: '/w' })
  assert.equal(status.tool, 'wait')
  assert.deepEqual(status.agentsStates[child], { status: 'running', message: null })
  const send = toolItem(part({ action: 'send', to_actor_id: 'general-1', content: 'also check docs' }, 'Sent'), { threadId: S, cwd: '/w', actorOutcome: () => ({ status: 'running', message: null }) })
  assert.equal(send.tool, 'sendMessage')
  assert.equal(send.prompt, 'also check docs')
  const toMain = toolItem(part({ action: 'send', to_actor_id: 'main', content: 'progress' }, 'Sent'), { threadId: child, cwd: '/w' })
  assert.deepEqual(toMain.receiverThreadIds, [])
  const cancel = toolItem(part({ action: 'cancel', actor_id: 'general-1' }, JSON.stringify({ status: 'cancelled' }), { actor_id: 'general-1', status: 'cancelled' }), { threadId: S, cwd: '/w' })
  assert.equal(cancel.tool, 'interruptAgent')
  assert.deepEqual(cancel.agentsStates[child], { status: 'interrupted', message: null })
  const running = toolItem(part({ action: 'wait', actor_id: 'general-1' }, null, {}, 'running'), { threadId: S, cwd: '/w' })
  assert.equal(running.status, 'inProgress')
  const models = toolItem(part({ action: 'models' }, 'm1\nm2'), { threadId: S, cwd: '/w' })
  assert.equal(models.type, 'dynamicToolCall')
})
