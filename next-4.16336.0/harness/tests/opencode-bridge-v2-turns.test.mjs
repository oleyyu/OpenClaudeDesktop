// OpenCode 2.x bridge, phase 5: the turn lifecycle through the in-process v2 fake and its event stream — thread/start
// in one POST, turn/start on a prompt id the bridge chose (agent and model only when they change), v2's event
// sequences as Codex notifications (a plain turn, an external turn, a steer and a queued prompt in one execution, an
// interrupt with nothing running), /command claimed from the inbox, review, compact, fork, revert, the side question,
// a sub-agent's rules, a session deleted elsewhere, and the resync after a reconnection.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { REVIEW_PROMPT_V2 } from '../packages/opencode-bridge/src/v2/review.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'
import { assistant, idle, text, tool, user } from './fixtures/v2-history.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-turns-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const MODEL = { id: 'claude-x', providerID: 'anthropic' }
const TOKENS = { input: 100, output: 20, reasoning: 5, cache: { read: 50, write: 0 } }

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.pid = 4321
  child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

const until = async (condition, what = 'condition', ms = 3000) => {
  const end = Date.now() + ms
  while (!condition()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

/** A started v2 Bridge on the fake, its event stream open; notifications and log collected. */
async function v2Bridge({ models = true } = {}) {
  const fake = createV2Fake({ cwd: '/home' })
  if (models) {
    fake.state.models = [{ id: 'claude-x', providerID: 'anthropic', name: 'Claude X', capabilities: { tools: true, input: ['text', 'image'], output: ['text'] }, variants: [{ id: 'high' }], cost: [{ input: 3, output: 15 }], limit: { context: 200000, output: 32000 }, enabled: true }]
    fake.state.providers = [{ id: 'anthropic', name: 'Anthropic', activation: 'enabled', package: 'aisdk:@ai-sdk/anthropic' }]
    fake.state.defaultModel = fake.state.models[0]
  }
  fake.state.agents = [{ id: 'build', name: 'Build', mode: 'primary', permissions: [] }, { id: 'plan', name: 'Plan', mode: 'primary', permissions: [] },
    { id: 'general', name: 'General', mode: 'subagent', permissions: [{ action: '*', resource: '*', effect: 'allow' }, { action: 'read', resource: '*.env', effect: 'ask' }, { action: 'read', resource: '*.env.*', effect: 'ask' }, { action: 'read', resource: '*.env.example', effect: 'allow' }, { action: 'question', resource: '*', effect: 'deny' }, { action: 'subagent', resource: '*', effect: 'deny' }] }]
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { fake.serve(options.env); return fakeChild() }
  bridge.v2.claimMs = 60
  bridge.v2.resyncMs = 1
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  await new Promise((resolve) => setTimeout(resolve, 10))
  return { bridge, fake, home, notes, logs }
}

/** The fake's requests to a route since `from`. */
const requests = (fake, method, pathname, from = 0) => fake.state.requests.slice(from).filter((request) => request.method === method && request.path === pathname)
/** Notifications of one thread since `from`, as [method, detail]. */
const seq = (notes, threadId, from = 0) => notes.slice(from).filter((note) => note.params?.threadId === threadId || note.params?.thread?.id === threadId).map(({ method, params }) => {
  if (method === 'turn/started' || method === 'turn/completed') return [method, params.turn.id, ...(method === 'turn/completed' ? [params.turn.status] : [])]
  if (method === 'item/started' || method === 'item/completed') return [method, params.item.type, params.item.id, params.turnId]
  if (method === 'item/agentMessage/delta') return [method, params.delta]
  return [method]
}).filter(([method]) => method !== 'thread/status/changed')

async function startThread(bridge, params = {}) {
  const { thread } = await bridge.handle('thread/start', { cwd: '/w', ...params })
  return bridge.threads.get(thread.id)
}

test('thread/start is one POST /api/session with id, location, agent, model, the ruleset and metadata; no PATCH, no /agent, no /model', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    const from = fake.state.requests.length
    const live = await startThread(bridge, { model: 'anthropic/claude-x', effort: 'high' })
    const [create] = requests(fake, 'POST', '/api/session', from)
    assert.match(create.body.id, /^ses_/)
    assert.equal(create.body.id, live.id)
    assert.deepEqual(create.body.location, { directory: '/w' }, 'a folder that is not there stays as given')
    assert.equal(create.body.agent, 'build')
    assert.deepEqual(create.body.model, { id: 'claude-x', providerID: 'anthropic', variant: 'high' })
    assert.deepEqual(create.body.metadata, { codeDesktop: { root: live.id } })
    assert.deepEqual(create.body.permissions[0], { action: '*', resource: '*', effect: 'ask' })
    assert.ok(create.body.permissions.some((rule) => rule.action === 'execute' && rule.effect === 'deny'))
    assert.equal(requests(fake, 'PATCH', `/api/session/${live.id}`, from).length, 0, 'the ruleset went with the create')
    assert.equal(fake.state.requests.slice(from).filter((request) => /\/(agent|model)$/.test(request.path) && request.method === 'POST').length, 0)
    assert.equal(bridge.store.get(live.id).engine, 'v2')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('a plain turn: the prompt id is the turn; inbox.enqueued → execution.started → delivered → step → text → tool → step.ended → succeeded as Codex notifications', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge, { model: 'anthropic/claude-x' })
    const sid = live.id
    const from = notes.length
    const sent = fake.state.requests.length
    const { turn } = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'hi' }] })
    const [prompt] = requests(fake, 'POST', `/api/session/${sid}/prompt`, sent)
    assert.equal(prompt.body.id, turn.id)
    assert.deepEqual(prompt.body, { id: turn.id, text: 'hi', delivery: 'steer' })
    assert.equal(fake.state.requests.slice(sent).filter((request) => request.method === 'POST' && /\/(agent|model)$/.test(request.path)).length, 0, 'agent and model already the session\'s')
    const e = (type, data = {}) => fake.emit(type, { sessionID: sid, ...data })
    e('session.execution.started')
    fake.deliver(sid, turn.id)
    e('session.step.started', { assistantMessageID: 'msg_a1', agent: 'build', model: MODEL, started: 1 })
    e('session.text.started', { assistantMessageID: 'msg_a1', ordinal: 0 })
    e('session.text.delta', { assistantMessageID: 'msg_a1', ordinal: 0, delta: 'Look' })
    e('session.text.ended', { assistantMessageID: 'msg_a1', ordinal: 0, text: 'Looking.' })
    e('session.tool.input.started', { assistantMessageID: 'msg_a1', id: 'call_1', name: 'shell' })
    e('session.tool.called', { assistantMessageID: 'msg_a1', id: 'call_1', input: { command: 'ls' }, executed: true })
    e('session.tool.success', { assistantMessageID: 'msg_a1', id: 'call_1', content: [{ type: 'text', text: 'a.txt' }], metadata: { exit: 0 }, executed: true })
    e('session.step.ended', { assistantMessageID: 'msg_a1', finish: 'tool-calls', cost: 0.01, tokens: TOKENS })
    e('session.execution.succeeded')
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    assert.deepEqual(seq(notes, sid, from), [
      ['turn/started', turn.id],
      ['item/started', 'userMessage', `${turn.id}-user`, turn.id],
      ['item/completed', 'userMessage', `${turn.id}-user`, turn.id],
      ['item/started', 'agentMessage', 'msg_a1:text:0', turn.id],
      ['item/agentMessage/delta', 'Look'],
      ['item/agentMessage/delta', 'ing.'],
      ['item/completed', 'agentMessage', 'msg_a1:text:0', turn.id],
      ['item/started', 'commandExecution', 'msg_a1:tool:call_1', turn.id],
      ['item/commandExecution/outputDelta'],
      ['item/completed', 'commandExecution', 'msg_a1:tool:call_1', turn.id],
      ['thread/tokenUsage/updated'],
      ['turn/completed', turn.id, 'completed'],
    ])
    assert.equal(live.busy, false)
    assert.equal(live.activeTurn, null)
    // A reload groups it the same way.
    assert.deepEqual(live.turns().map((entry) => [entry.id, entry.status]), [[turn.id, 'completed']])
    // The composer's model changed: POSTed once before the next prompt; the agent still the session's.
    live.model = null
    const before = fake.state.requests.length
    await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'again' }], effort: 'high' })
    const paths = fake.state.requests.slice(before).filter((request) => request.method === 'POST').map((request) => request.path.replace(sid, 'S'))
    assert.deepEqual(paths, ['/api/session/S/model', '/api/session/S/prompt'])
    assert.deepEqual(requests(fake, 'POST', `/api/session/${sid}/model`, before)[0].body, { model: { id: 'claude-x', providerID: 'anthropic', variant: 'high' } })
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('external turns: a background sub-agent\'s synthetic wake is a turn named after it; another client\'s prompt is a turn with its message', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const e = (type, data = {}) => fake.emit(type, { sessionID: sid, ...data })
    let from = notes.length
    e('session.inbox.enqueued', { inboxID: 'msg_wake', item: { type: 'synthetic', payload: { text: '<subagent sessionID=ses_c state=completed>\ndone\n</subagent>', metadata: { source: 'subagent', childID: 'ses_c', state: 'completed' } }, delivery: 'steer' } })
    e('session.execution.started')
    e('session.inbox.delivered', { inboxID: 'msg_wake' })
    e('session.step.started', { assistantMessageID: 'msg_a9', agent: 'build', model: MODEL, started: 1 })
    e('session.text.started', { assistantMessageID: 'msg_a9', ordinal: 0 })
    e('session.text.ended', { assistantMessageID: 'msg_a9', ordinal: 0, text: 'The sub-agent finished.' })
    e('session.step.ended', { assistantMessageID: 'msg_a9', finish: 'stop', cost: 0, tokens: TOKENS })
    e('session.execution.succeeded')
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the wake turn')
    assert.deepEqual(seq(notes, sid, from), [
      ['turn/started', 'msg_wake'],
      ['item/started', 'agentMessage', 'msg_a9:text:0', 'msg_wake'],
      ['item/agentMessage/delta', 'The sub-agent finished.'],
      ['item/completed', 'agentMessage', 'msg_a9:text:0', 'msg_wake'],
      ['thread/tokenUsage/updated'],
      ['turn/completed', 'msg_wake', 'completed'],
    ])
    assert.deepEqual(live.turns().map((turn) => turn.id), ['msg_wake'], 'a reload names it the same')
    from = notes.length
    e('session.inbox.enqueued', { inboxID: 'msg_tui', item: { type: 'user', payload: { text: 'from the TUI' }, delivery: 'steer' } })
    e('session.execution.started')
    e('session.inbox.delivered', { inboxID: 'msg_tui' })
    e('session.step.started', { assistantMessageID: 'msg_a10', agent: 'build', model: MODEL, started: 2 })
    e('session.step.failed', { assistantMessageID: 'msg_a10', error: { type: 'provider.auth', message: 'Bad key', status: 401 } })
    e('session.execution.failed', { error: { type: 'provider.auth', message: 'Bad key', status: 401 } })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the external turn')
    const steps = seq(notes, sid, from)
    assert.deepEqual(steps.slice(0, 3), [['turn/started', 'msg_tui'], ['item/started', 'userMessage', 'msg_tui-user', 'msg_tui'], ['item/completed', 'userMessage', 'msg_tui-user', 'msg_tui']])
    assert.deepEqual(steps.at(-1), ['turn/completed', 'msg_tui', 'failed'])
    const error = notes.slice(from).find((note) => note.method === 'error')
    assert.equal(error.params.error.codexErrorInfo, 'unauthorized')
    assert.equal(error.params.willRetry, false)
    assert.equal(notes.slice(from).find((note) => note.method === 'turn/completed').params.turn.error.message, 'Bad key')
  } finally { await bridge.stop() }
})

test('a steer and a queued prompt in one execution: the steer\'s item waits for its delivery; another prompt delivered with no idle starts the next turn', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const e = (type, data = {}) => fake.emit(type, { sessionID: sid, ...data })
    const from = notes.length
    const { turn } = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'build it' }] })
    e('session.execution.started')
    fake.deliver(sid, turn.id)
    e('session.step.started', { assistantMessageID: 'msg_s1', agent: 'build', model: MODEL, started: 1 })
    await until(() => live.turnOf.has('msg_s1'), 'the first step')
    const { turnId } = await bridge.handle('turn/steer', { threadId: sid, expectedTurnId: turn.id, input: [{ type: 'text', text: 'use tabs' }], clientUserMessageId: 'client-1' })
    assert.equal(turnId, turn.id)
    const steer = requests(fake, 'POST', `/api/session/${sid}/prompt`).at(-1).body
    assert.equal(steer.delivery, 'steer')
    assert.deepEqual(bridge.store.get(sid).steers, [steer.id])
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.ok(!notes.slice(from).some((note) => note.params?.item?.id === `${steer.id}-user`), 'no item before v2 delivers it')
    e('session.step.ended', { assistantMessageID: 'msg_s1', finish: 'tool-calls', cost: 0, tokens: TOKENS })
    fake.deliver(sid, steer.id)
    e('session.step.started', { assistantMessageID: 'msg_s2', agent: 'build', model: MODEL, started: 2 })
    e('session.step.ended', { assistantMessageID: 'msg_s2', finish: 'stop', cost: 0, tokens: TOKENS })
    // A queued prompt (another client's) delivered in the same execution, no idle between: a turn of its own.
    e('session.inbox.enqueued', { inboxID: 'msg_queued', item: { type: 'user', payload: { text: 'then this' }, delivery: 'queue' } })
    e('session.inbox.delivered', { inboxID: 'msg_queued' })
    e('session.step.started', { assistantMessageID: 'msg_s3', agent: 'build', model: MODEL, started: 3 })
    e('session.step.ended', { assistantMessageID: 'msg_s3', finish: 'stop', cost: 0, tokens: TOKENS })
    e('session.execution.succeeded')
    await until(() => notes.slice(from).filter((note) => note.method === 'turn/completed').length === 2, 'both turns')
    const steps = seq(notes, sid, from).filter(([method]) => method !== 'thread/tokenUsage/updated')
    const steerItem = notes.slice(from).find((note) => note.method === 'item/started' && note.params.item.id === `${steer.id}-user`)
    assert.equal(steerItem.params.turnId, turn.id)
    assert.equal(steerItem.params.item.clientId, 'client-1')
    assert.deepEqual(steps.filter(([method]) => method.startsWith('turn/')), [['turn/started', turn.id], ['turn/completed', turn.id, 'completed'], ['turn/started', 'msg_queued'], ['turn/completed', 'msg_queued', 'completed']])
    assert.ok(steps.findIndex((step) => step[0] === 'turn/completed') > steps.findIndex((step) => step[2] === `${steer.id}-user`))
    assert.deepEqual(live.turns().map((entry) => entry.id), [turn.id, 'msg_queued'], 'a reload groups it the same way')
    assert.deepEqual(live.turns()[0].items.filter((item) => item.type === 'userMessage').map((item) => item.id), [`${turn.id}-user`, `${steer.id}-user`])
    // A steer delivered after its turn ended (into the next execution) starts a turn of its own.
    const after = notes.length
    const next = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'one more' }] })
    e('session.execution.started')
    fake.deliver(sid, next.turn.id)
    await until(() => live.busy, 'busy')
    await bridge.handle('turn/steer', { threadId: sid, input: [{ type: 'text', text: 'late' }] })
    const late = requests(fake, 'POST', `/api/session/${sid}/prompt`).at(-1).body.id
    e('session.execution.succeeded')
    await until(() => notes.slice(after).some((note) => note.method === 'turn/completed'), 'the turn before the late steer')
    e('session.execution.started')
    fake.deliver(sid, late)
    e('session.execution.succeeded')
    await until(() => notes.slice(after).filter((note) => note.method === 'turn/completed').length === 2, 'the late steer\'s turn')
    assert.deepEqual(seq(notes, sid, after).filter(([method]) => method.startsWith('turn/')), [['turn/started', next.turn.id], ['turn/completed', next.turn.id, 'completed'], ['turn/started', late], ['turn/completed', late, 'completed']])
    assert.ok(!(bridge.store.get(sid).steers ?? []).includes(late), 'no longer a steer: its own turn')
  } finally { await bridge.stop() }
})

test('turn/interrupt with nothing running (interrupted:false): the prompt still in the inbox is deleted and the turn ends at once', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const from = notes.length
    const { turn } = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'never runs' }] })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/started'), 'turn/started')
    const sent = fake.state.requests.length
    await bridge.handle('turn/interrupt', { threadId: sid, turnId: turn.id })
    const paths = fake.state.requests.slice(sent).map((request) => `${request.method} ${request.path.replace(sid, 'S')}`)
    assert.deepEqual(paths, ['POST /api/session/S/interrupt', 'GET /api/session/S/inbox', `DELETE /api/session/S/inbox/${turn.id}`])
    assert.equal(new URL(requests(fake, 'POST', `/api/session/${sid}/interrupt`, sent)[0].url).searchParams.get('resume'), 'false')
    assert.deepEqual(seq(notes, sid, from).filter(([method]) => method.startsWith('turn/')), [['turn/started', turn.id], ['turn/completed', turn.id, 'interrupted']])
    assert.equal(live.activeTurn, null)
    assert.deepEqual(fake.state.inbox.get(sid), [])
    // Running: the interrupt is reported by the execution's end.
    const again = notes.length
    const second = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'runs' }] })
    fake.state.active.add(sid)
    fake.emit('session.execution.started', { sessionID: sid })
    fake.deliver(sid, second.turn.id)
    await until(() => live.busy, 'busy')
    await bridge.handle('turn/interrupt', { threadId: sid, turnId: second.turn.id })
    assert.ok(live.activeTurn, 'waits for the execution to end')
    fake.emit('session.execution.interrupted', { sessionID: sid, reason: 'user' })
    await until(() => notes.slice(again).some((note) => note.method === 'turn/completed'), 'turn/completed')
    assert.deepEqual(seq(notes, sid, again).at(-1), ['turn/completed', second.turn.id, 'interrupted'])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('/command: the turn is the user item it enqueues; a sub-agent command enqueues nothing here and its turn ends at once; an unknown one fails', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  fake.state.commands.deploy = 'prompt'
  fake.state.commands.research = 'subtask'
  try {
    const live = await startThread(bridge)
    const sid = live.id
    let from = notes.length
    const { turn } = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: '/deploy staging' }, { type: 'skill', name: 'deploy', path: 'command:deploy' }] })
    const command = requests(fake, 'POST', `/api/session/${sid}/command`).at(-1).body
    assert.deepEqual(command, { name: 'deploy', text: 'staging', delivery: 'steer' })
    const enqueued = (fake.state.inbox.get(sid) ?? []).at(-1)
    assert.equal(turn.id, enqueued.id, 'claimed from session.inbox.enqueued')
    fake.emit('session.execution.started', { sessionID: sid })
    fake.deliver(sid, turn.id)
    fake.emit('session.execution.succeeded', { sessionID: sid })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the command turn')
    assert.deepEqual(seq(notes, sid, from).filter(([method]) => method.startsWith('turn/')), [['turn/started', turn.id], ['turn/completed', turn.id, 'completed']])
    from = notes.length
    const sub = await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: '/research llamas' }, { type: 'skill', name: 'research', path: 'command:research' }] })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the sub-agent command turn')
    assert.match(sub.turn.id, /^msg_/)
    assert.deepEqual(seq(notes, sid, from).filter(([method]) => method.startsWith('turn/')), [['turn/started', sub.turn.id], ['turn/completed', sub.turn.id, 'completed']])
    await until(() => notes.slice(from).some((note) => note.method === 'thread/started' && note.params.thread.parentThreadId === sid), 'the sub-agent thread')
    await assert.rejects(bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: '/nope' }, { type: 'skill', name: 'nope', path: 'command:nope' }] }), /Command not found/)
    assert.equal(live.activeTurn, null)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('review/start: 2.2.5\'s review prompt as a prompt with its id, under the read-only review mode, no agent switch', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const from = notes.length
    const sent = fake.state.requests.length
    const { turn, reviewThreadId } = await bridge.handle('review/start', { threadId: sid, target: { type: 'commit', sha: 'abc1234' } })
    assert.equal(reviewThreadId, sid)
    const prompt = requests(fake, 'POST', `/api/session/${sid}/prompt`, sent)[0].body
    assert.equal(prompt.id, turn.id)
    assert.equal(prompt.text, REVIEW_PROMPT_V2.replaceAll('$ARGUMENTS', 'abc1234'))
    assert.equal(fake.state.requests.slice(sent).filter((request) => request.method === 'POST' && request.path.endsWith('/agent')).length, 0, 'not switched to plan')
    assert.equal(live.permission.mode, 'review')
    assert.deepEqual(bridge.store.get(sid).reviews[turn.id], { label: 'Commit abc1234' })
    fake.emit('session.execution.started', { sessionID: sid })
    fake.deliver(sid, turn.id)
    fake.emit('session.step.started', { sessionID: sid, assistantMessageID: 'msg_r1', agent: 'build', model: MODEL, started: 1 })
    fake.emit('session.text.started', { sessionID: sid, assistantMessageID: 'msg_r1', ordinal: 0 })
    fake.emit('session.text.ended', { sessionID: sid, assistantMessageID: 'msg_r1', ordinal: 0, text: 'Looks fine.' })
    fake.emit('session.step.ended', { sessionID: sid, assistantMessageID: 'msg_r1', finish: 'stop', cost: 0, tokens: TOKENS })
    fake.emit('session.execution.succeeded', { sessionID: sid })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the review turn')
    const items = seq(notes, sid, from).filter(([method]) => method === 'item/completed').map(([, type]) => type)
    assert.deepEqual(items, ['userMessage', 'enteredReviewMode', 'agentMessage', 'exitedReviewMode'])
    await until(() => live.permission.mode !== 'review', 'the session\'s own mode back')
  } finally { await bridge.stop() }
})

test('thread/compact/start: POST …/compact {id}; the compaction message is the turn, its summary on the item', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const from = notes.length
    assert.deepEqual(await bridge.handle('thread/compact/start', { threadId: sid }), {})
    const { id } = requests(fake, 'POST', `/api/session/${sid}/compact`).at(-1).body
    assert.match(id, /^msg_/)
    fake.emit('session.execution.started', { sessionID: sid })
    fake.emit('session.compaction.started', { sessionID: sid, reason: 'manual', inputID: id })
    fake.emit('session.compaction.ended', { sessionID: sid, reason: 'manual', text: 'We set things up.', model: MODEL, cost: 0, tokens: TOKENS })
    fake.emit('session.execution.succeeded', { sessionID: sid })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the compaction turn')
    assert.deepEqual(seq(notes, sid, from), [
      ['turn/started', id],
      ['item/started', 'contextCompaction', `${id}:compaction`, id],
      ['item/completed', 'contextCompaction', `${id}:compaction`, id],
      ['turn/completed', id, 'completed'],
    ])
    assert.equal(notes.slice(from).find((note) => note.method === 'item/completed').params.item.codeDesktop.summary, 'We set things up.')
    await assert.rejects(Promise.all([bridge.handle('thread/compact/start', { threadId: sid }), bridge.handle('thread/compact/start', { threadId: sid })]), /Wait for the current turn/)
  } finally { await bridge.stop() }
})

test('fork before a turn, revert (stage then commit, files only when asked; busy is refused), the side question in one answer', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const info = fake.makeSession({ title: 'Old', location: { directory: '/w' }, agent: 'build', model: MODEL })
    fake.addMessages(info.id, [user('msg_u1', 10, 'one'), assistant('msg_a1', 11, [text('1')]), idle('msg_i1', 12), user('msg_u2', 20, 'two'), assistant('msg_a2', 21, [text('2')]), idle('msg_i2', 22)])
    await bridge.handle('thread/resume', { threadId: info.id })
    const fork = await bridge.handle('thread/fork', { threadId: info.id, lastTurnId: 'msg_u1' })
    assert.deepEqual(requests(fake, 'POST', `/api/session/${info.id}/fork`)[0].body, { before: 'msg_u2' })
    const forkId = fork.thread.id
    assert.deepEqual(requests(fake, 'PATCH', `/api/session/${forkId}`).find((request) => request.body.metadata)?.body.metadata, { codeDesktop: { root: forkId } })
    assert.equal(bridge.store.get(forkId).forkedFrom, info.id)
    assert.equal(fork.thread.turns.length, 1)
    await bridge.handle('thread/revert', { threadId: info.id, beforeTurnId: 'msg_u2' })
    assert.deepEqual(fake.state.reverts.at(-1), { sessionID: info.id, messageID: 'msg_u2', files: false })
    assert.equal(requests(fake, 'POST', `/api/session/${info.id}/revert/commit`).length, 1)
    assert.deepEqual(bridge.threads.get(info.id).turns().map((turn) => turn.id), ['msg_u1'])
    fake.addMessages(info.id, [user('msg_u3', 30, 'three'), assistant('msg_a3', 31, [text('3')]), idle('msg_i3', 32)])
    await bridge.threads.get(info.id).reload()
    await bridge.handle('thread/revert', { threadId: info.id, beforeTurnId: 'msg_u3', codeDesktop: { restoreFiles: true } })
    assert.equal(fake.state.reverts.at(-1).files, true)
    fake.state.active.add(info.id)
    fake.addMessages(info.id, [user('msg_u4', 40, 'four'), assistant('msg_a4', 41, [text('4')]), idle('msg_i4', 42)])
    const live = bridge.threads.get(info.id)
    live.busy = false
    await assert.rejects(bridge.handle('thread/revert', { threadId: info.id, beforeTurnId: 'msg_u1' }), /Wait for the current turn/)
    fake.state.active.delete(info.id)
    const from = notes.length
    const answer = await bridge.handle('codeDesktop/sideQuestion', { threadId: info.id, question: 'What was two?', requestId: 'r1' })
    assert.equal(answer.text, 'The answer.')
    assert.equal(answer.finish, 'stop')
    const generate = requests(fake, 'POST', `/api/session/${info.id}/generate`)[0].body
    assert.ok(generate.prompt.endsWith('What was two?'))
    assert.deepEqual(notes.slice(from).filter((note) => note.method === 'codeDesktop/sideQuestion/delta').map((note) => note.params.text), ['The answer.'])
    assert.equal(fake.state.sessions.length, 2, 'no temporary session')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('a sub-agent session: its thread, its runtime and sandbox files, and its agent\'s limits PATCHed after the root\'s', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const child = fake.makeSession({ parentID: live.id, title: 'look around', agent: 'general' })
    const from = fake.state.requests.length
    fake.emit('session.created', { sessionID: child.id, parentID: live.id, projectID: 'prj_fake', location: child.location, slug: 's', title: 'look around', agent: 'general', version: '2.2.5' })
    await until(() => notes.some((note) => note.method === 'thread/started' && note.params.thread.id === child.id), 'the sub-agent thread')
    await until(() => requests(fake, 'PATCH', `/api/session/${child.id}`, from).length === 1, 'its ruleset')
    const rules = requests(fake, 'PATCH', `/api/session/${child.id}`, from)[0].body.permissions
    assert.deepEqual(rules.slice(-3), [{ action: 'question', resource: '*', effect: 'deny' }, { action: 'subagent', resource: '*', effect: 'deny' }, { action: 'question', resource: '*', effect: 'deny' }])
    const runtime = JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', `${child.id}.json`), 'utf8'))
    assert.equal(runtime.root, live.id)
    assert.ok(fs.existsSync(path.join(bridge.config.sandboxDir, `${child.id}.sb`)))
    assert.equal(bridge.store.get(child.id).root, live.id)
    // A message from the parent's tool starts the child's (external) turn.
    const at = notes.length
    fake.emit('session.inbox.enqueued', { sessionID: child.id, inboxID: 'msg_task', item: { type: 'user', payload: { text: 'look around' }, delivery: 'steer' } })
    fake.emit('session.execution.started', { sessionID: child.id })
    fake.emit('session.inbox.delivered', { sessionID: child.id, inboxID: 'msg_task' })
    fake.emit('session.execution.succeeded', { sessionID: child.id })
    await until(() => notes.slice(at).some((note) => note.method === 'turn/completed'), 'the child turn')
    assert.deepEqual(seq(notes, child.id, at).filter(([method]) => method.startsWith('turn/')), [['turn/started', 'msg_task'], ['turn/completed', 'msg_task', 'completed']])
  } finally { await bridge.stop() }
})

test('a session deleted elsewhere closes its thread; thread/delete, rename and archive use v2\'s routes', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    await bridge.handle('thread/name/set', { threadId: live.id, name: 'Named' })
    assert.deepEqual(requests(fake, 'PATCH', `/api/session/${live.id}`).at(-1).body, { title: 'Named' })
    await bridge.handle('thread/archive', { threadId: live.id })
    assert.deepEqual(requests(fake, 'PATCH', `/api/session/${live.id}`).at(-1).body, { archived: true })
    await bridge.handle('thread/unarchive', { threadId: live.id })
    assert.deepEqual(requests(fake, 'PATCH', `/api/session/${live.id}`).at(-1).body, { archived: false })
    const other = await startThread(bridge)
    fake.emit('session.deleted', { sessionID: other.id })
    await until(() => notes.some((note) => note.method === 'thread/deleted' && note.params.threadId === other.id), 'thread/deleted')
    assert.equal(bridge.threads.has(other.id), false)
    assert.equal(bridge.store.get(other.id).deleted, true)
    const at = notes.length
    await bridge.handle('thread/delete', { threadId: live.id })
    assert.equal(requests(fake, 'DELETE', `/api/session/${live.id}`).length, 1)
    fake.emit('session.deleted', { sessionID: live.id })
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(notes.slice(at).filter((note) => note.method === 'thread/deleted').length, 1, 'said once')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('a reconnection resyncs from REST (messages, active, inbox, asks) with the events of the meantime applied over it; retries are announced', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const info = fake.makeSession({ title: 'Busy', location: { directory: '/w' }, agent: 'build', model: MODEL })
    fake.addMessages(info.id, [user('msg_u1', 10, 'go'), assistant('msg_a1', 11, [], { completed: null })])
    fake.state.active.add(info.id)
    await bridge.handle('thread/resume', { threadId: info.id })
    const live = bridge.threads.get(info.id)
    assert.equal(live.activeTurn.id, 'msg_u1')
    // The stream drops; meanwhile the step wrote its text (in the stored messages now).
    fake.drop()
    fake.addMessages(info.id, [])
    fake.state.messages.get(info.id)[1] = assistant('msg_a1', 11, [text('Half')], { completed: null })
    const sent = fake.state.requests.length
    await until(() => requests(fake, 'GET', `/api/session/${info.id}/message`, sent).length > 0, 'the resync')
    for (const route of ['/api/session/active', `/api/session/${info.id}/inbox`, `/api/session/${info.id}/permission`, `/api/session/${info.id}/form`]) {
      await until(() => requests(fake, 'GET', route, sent).length > 0, route)
    }
    await until(() => !live.resyncBufferV2, 'the resync to end')
    assert.equal(live.projector.messages.get('msg_a1').parts[0].text, 'Half')
    const from = notes.length
    fake.emit('session.retry.scheduled', { sessionID: info.id, assistantMessageID: 'msg_a1', attempt: 1, at: 123, error: { type: 'provider.rate-limit', message: 'Too many requests', status: 429 } })
    fake.emit('session.text.started', { sessionID: info.id, assistantMessageID: 'msg_a1', ordinal: 1 })
    fake.emit('session.text.ended', { sessionID: info.id, assistantMessageID: 'msg_a1', ordinal: 1, text: 'Done.' })
    fake.emit('session.step.ended', { sessionID: info.id, assistantMessageID: 'msg_a1', finish: 'stop', cost: 0, tokens: TOKENS })
    fake.emit('session.execution.succeeded', { sessionID: info.id })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    const retry = notes.slice(from).find((note) => note.method === 'error')
    assert.deepEqual([retry.params.willRetry, retry.params.error.codexErrorInfo, retry.params.retry.maxRetries, retry.params.codeDesktop.nextAt], [true, 'rateLimitExceeded', 10, 123])
    assert.deepEqual(seq(notes, info.id, from).filter(([method]) => method.startsWith('item/') || method.startsWith('turn/')).map((step) => step.slice(0, 3)), [
      ['item/started', 'agentMessage', 'msg_a1:text:1'], ['item/agentMessage/delta', 'Done.'], ['item/completed', 'agentMessage', 'msg_a1:text:1'], ['turn/completed', 'msg_u1', 'completed'],
    ])
  } finally { await bridge.stop() }
})

test('a resync replays the events it held over a reload that already has their items: one text, one tool card that completes', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const info = fake.makeSession({ title: 'Busy', location: { directory: '/w' }, agent: 'build', model: MODEL })
    fake.addMessages(info.id, [user('msg_u1', 10, 'go'), assistant('msg_a1', 11, [], { completed: null })])
    fake.state.active.add(info.id)
    await bridge.handle('thread/resume', { threadId: info.id })
    const live = bridge.threads.get(info.id)
    const from = notes.length
    // The events come while the session reloads (resyncV2's hold), and v2 had projected them before GET …/message.
    live.holdV2()
    const e = (type, data = {}) => fake.emit(type, { sessionID: info.id, assistantMessageID: 'msg_a1', ...data })
    e('session.text.started', { ordinal: 0 })
    e('session.text.delta', { ordinal: 0, delta: 'Look' })
    e('session.tool.input.started', { id: 'call_1', name: 'shell' })
    e('session.tool.called', { id: 'call_1', input: { command: 'ls' }, executed: true })
    await until(() => live.resyncBufferV2?.length === 4, 'the events held')
    fake.state.messages.get(info.id)[1] = assistant('msg_a1', 11, [text(''), tool('call_1', 'shell', { command: 'ls' }, { status: 'running', at: 12 })], { completed: null })
    await live.reload()
    live.releaseV2()
    e('session.text.ended', { ordinal: 0, text: 'Looking.' })
    e('session.tool.success', { id: 'call_1', content: [{ type: 'text', text: 'a.txt' }], metadata: { exit: 0 }, executed: true })
    e('session.step.ended', { finish: 'tool-calls', cost: 0.01, tokens: TOKENS })
    fake.emit('session.execution.succeeded', { sessionID: info.id })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    assert.deepEqual(live.projector.messages.get('msg_a1').parts.map((part) => [part.id, part.text ?? part.state?.status]), [['msg_a1:text:0', 'Looking.'], ['msg_a1:tool:call_1', 'completed']])
    const done = notes.slice(from).filter((note) => note.method === 'item/completed' && note.params.item.id === 'msg_a1:tool:call_1')
    assert.deepEqual(done.map((note) => note.params.item.status), ['completed'])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('events of a running session that come while openThread loads it (an ask for a session not loaded, turn/start) wait, then apply over what it read', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const info = fake.makeSession({ title: 'Busy', location: { directory: '/w' }, agent: 'build', model: MODEL })
    fake.addMessages(info.id, [user('msg_u1', 10, 'go'), assistant('msg_a1', 11, [], { completed: null })])
    fake.state.active.add(info.id)
    // The tool starts while GET …/message is being answered (v2 published it after the read).
    const server = bridge.server
    const inner = server.fetch
    let once = false
    server.fetch = async (url, init) => {
      if (!once && new URL(String(url)).pathname === `/api/session/${info.id}/message`) {
        once = true
        fake.emit('session.tool.input.started', { sessionID: info.id, assistantMessageID: 'msg_a1', id: 'call_1', name: 'shell' })
        await until(() => bridge.v2.loading.get(info.id)?.resyncBufferV2?.length > 0, 'the event held', 300).catch(() => {})
        const response = await inner(url, init)
        fake.state.messages.get(info.id)[1] = assistant('msg_a1', 11, [tool('call_1', 'shell', { command: 'ls' }, { status: 'streaming', at: 12 })], { completed: null })
        return response
      }
      return inner(url, init)
    }
    const live = await bridge.openThread(info.id)
    assert.equal(bridge.threads.get(info.id), live)
    assert.equal(live.resyncBufferV2, null, 'released once registered')
    assert.equal(bridge.v2.loading.has(info.id), false)
    const from = notes.length
    const e = (type, data = {}) => fake.emit(type, { sessionID: info.id, assistantMessageID: 'msg_a1', ...data })
    e('session.tool.called', { id: 'call_1', input: { command: 'ls' }, executed: true })
    e('session.tool.success', { id: 'call_1', content: [{ type: 'text', text: 'a.txt' }], metadata: { exit: 0 }, executed: true })
    e('session.step.ended', { finish: 'tool-calls', cost: 0.01, tokens: TOKENS })
    fake.emit('session.execution.succeeded', { sessionID: info.id })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    assert.deepEqual(live.projector.messages.get('msg_a1').parts.map((part) => [part.id, part.state?.status]), [['msg_a1:tool:call_1', 'completed']])
    assert.deepEqual(notes.slice(from).filter((note) => note.method === 'item/completed' && note.params.item.id === 'msg_a1:tool:call_1').map((note) => note.params.item.status), ['completed'])
  } finally { await bridge.stop() }
})

test('reading a thread not loaded here (thread/read, unarchive) asks for nothing live: no inbox, permissions or forms', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    const info = fake.makeSession({ title: 'Cold', location: { directory: '/w' }, agent: 'build', model: MODEL })
    fake.addMessages(info.id, [user('msg_u1', 10, 'go'), assistant('msg_a1', 11, [text('ok')]), idle('msg_i1', 30)])
    const sent = fake.state.requests.length
    const read = await bridge.handle('thread/read', { threadId: info.id, includeTurns: true })
    assert.equal(read.thread.turns.length, 1)
    await bridge.handle('thread/unarchive', { threadId: info.id })
    assert.ok(requests(fake, 'GET', `/api/session/${info.id}/message`, sent).length >= 2, 'the history was read')
    for (const tail of ['/inbox', '/permission', '/form']) assert.equal(requests(fake, 'GET', `/api/session/${info.id}${tail}`, sent).length, 0, tail)
    assert.equal(bridge.threads.has(info.id), false)
    // Loaded, it does.
    await bridge.handle('thread/resume', { threadId: info.id })
    for (const tail of ['/inbox', '/permission', '/form']) assert.ok(requests(fake, 'GET', `/api/session/${info.id}${tail}`, sent).length > 0, tail)
  } finally { await bridge.stop() }
})

test('turn/interrupt of a thread not loaded answers {} even when the server can\'t start', async () => {
  const { bridge } = await v2Bridge()
  try {
    bridge.v2Api = async () => { throw new Error('OpenCode keeps exiting') }
    assert.deepEqual(await bridge.handle('turn/interrupt', { threadId: 'ses_cold', turnId: 'msg_x' }), {})
  } finally { await bridge.stop() }
})
