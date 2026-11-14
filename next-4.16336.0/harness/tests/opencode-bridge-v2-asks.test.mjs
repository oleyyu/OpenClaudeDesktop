// OpenCode 2.x bridge, phase 6: approvals, questions and the plan card through the in-process v2 fake — permission.asked
// answered from the mode (no card) or on a Codex card replied at v2's route, the reject that rejects the session's other
// asks too (their permission.replied withdraws those cards), a plain Deny as an interrupt (never a reject without a
// message) shown declined, an interrupt's asks withdrawn by the turn's end with no reply (a failed interrupt's rejected
// or cancelled with a message; another session's left up), "Allow for this session" kept
// by the bridge (the runtime policy, covered cards), read-only fallbacks, question forms (single choice a string, cancel
// with a message, unattended, other kinds, "global"), the cards a resync raises again once, the plan card after
// turn/completed (Approve: rules, /agent, the build agent's model, a queued prompt), and the plugin's turn of a saved
// "always" allow into an ask.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { CANCELLED_V2, DECLINED_V2, DISMISSED_V2, OTHER_FORM_V2, PLAN_APPROVED_V2, UNATTENDED_V2, decideV2, formAnswerV2, questionsOfFormV2, sessionGrantV2 } from '../packages/opencode-bridge/src/v2/asks.js'
import { PLUGIN_ID, pluginSourceV2 } from '../packages/opencode-bridge/src/v2/plugin.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-asks-'))); made.push(dir); return dir }
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
const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))

/** A started v2 Bridge on the fake; server→client requests (cards) are recorded and answered by the test. */
async function v2Bridge() {
  const fake = createV2Fake({ cwd: '/home' })
  fake.state.models = [{ id: 'claude-x', providerID: 'anthropic', name: 'Claude X', capabilities: { tools: true, input: ['text'], output: ['text'] }, variants: [], cost: [{ input: 3, output: 15 }], limit: { context: 200000, output: 32000 }, enabled: true }]
  fake.state.providers = [{ id: 'anthropic', name: 'Anthropic', activation: 'enabled', package: 'aisdk:@ai-sdk/anthropic' }]
  fake.state.defaultModel = fake.state.models[0]
  fake.state.agents = [{ id: 'build', name: 'Build', mode: 'primary', permissions: [] }, { id: 'plan', name: 'Plan', mode: 'primary', permissions: [] }]
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
  const cards = []
  let seqNo = 0
  bridge.transport.request = (method, params) => {
    const card = { id: ++seqNo, method, params }
    card.promise = new Promise((resolve, reject) => { card.answer = resolve; card.reject = reject })
    cards.push(card)
    return { id: card.id, promise: card.promise }
  }
  bridge.transport.abandon = (id, why) => { const card = cards.find((entry) => entry.id === id); if (card && !card.withdrawn) { card.withdrawn = why; card.reject(new Error(why)) } return true }
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  await settle(10)
  return { bridge, fake, home, notes, logs, cards }
}

const requests = (fake, method, pathname, from = 0) => fake.state.requests.slice(from).filter((request) => request.method === method && request.path === pathname)
const open = (cards) => cards.filter((card) => !card.withdrawn && !card.answered)
const answer = (card, value) => { card.answered = true; card.answer(value) }

async function startThread(bridge, params = {}) {
  const { thread } = await bridge.handle('thread/start', { cwd: '/w', model: 'anthropic/claude-x', ...params })
  return bridge.threads.get(thread.id)
}
const ASK_MODE = { approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [] }, codeDesktop: { permissionMode: 'ask', afterPlan: 'ask' } }
const PLAN_MODE = { approvalPolicy: 'on-request', sandboxPolicy: { type: 'readOnly' }, codeDesktop: { permissionMode: 'plan', afterPlan: 'acceptEdits' } }

/** A running turn in the thread: prompt sent and delivered, a step open (`step`), its calls out. */
async function runningTurn(bridge, fake, live, calls = [], step = 'msg_a1') {
  const { turn } = await bridge.handle('turn/start', { threadId: live.id, input: [{ type: 'text', text: 'go' }] })
  const e = (type, data = {}) => fake.emit(type, { sessionID: live.id, ...data })
  fake.state.active.add(live.id)
  e('session.execution.started')
  fake.deliver(live.id, turn.id)
  e('session.step.started', { assistantMessageID: step, agent: live.info.agent ?? 'build', model: MODEL, started: 1 })
  for (const [id, name, input] of calls) {
    e('session.tool.input.started', { assistantMessageID: step, id, name })
    e('session.tool.called', { assistantMessageID: step, id, input, executed: true })
  }
  await until(() => calls.every(([id]) => live.projector.messages.get(step)?.parts.some((part) => part.id === `${step}:tool:${id}`)), 'the calls')
  return { turn, e }
}
const shellAsk = (sid, id, command, extra = {}) => ({ id, sessionID: sid, action: 'shell', resources: [command], save: [`${command.split(' ')[0]} *`], source: { type: 'tool', messageID: 'msg_a1', id: id.replace('per_', 'call_') }, ...extra })

test('decideV2 / sessionGrantV2 / the form helpers: 1.x policy over v2 names, single choice a string', () => {
  const ask = { mode: 'ask', approvalPolicy: 'untrusted', sandbox: 'workspace-write', extraRoots: [] }
  const auto = { ...ask, mode: 'auto', approvalPolicy: 'on-request' }
  const plan = { ...ask, mode: 'plan', sandbox: 'read-only' }
  const shell = { action: 'shell', resources: ['git status'], save: ['git status *'] }
  assert.deepEqual(decideV2(auto, shell, { tool: 'shell', cwd: '/w' }), { action: 'allow' })
  assert.equal(decideV2(ask, shell, { tool: 'shell', cwd: '/w' }).action, 'ask')
  assert.equal(decideV2(plan, shell, { tool: 'shell', cwd: '/w' }).action, 'allow', 'shell runs in the read-only sandbox')
  assert.equal(decideV2(ask, { action: 'subagent', resources: ['general'] }, { tool: 'subagent', cwd: '/w' }).action, 'allow', 'subagent is a read tool')
  assert.equal(decideV2(auto, { action: 'edit', resources: ['a.js'] }, { tool: 'patch', cwd: '/w' }).action, 'allow')
  assert.equal(decideV2(plan, { action: 'edit', resources: ['a.js'] }, { tool: 'edit', cwd: '/w' }).action, 'reject', 'the fallback when the plugin did not refuse it')
  assert.equal(decideV2(plan, { action: 'external_directory', resources: ['/etc/*'] }, { tool: 'write', cwd: '/w' }).action, 'allow', 'the edit asked next is refused in-process')
  assert.equal(decideV2({ ...ask, approvalPolicy: 'never' }, shell, { tool: 'shell', cwd: '/w' }).action, 'reject')
  assert.equal(decideV2(ask, { action: 'external_directory', resources: ['/w/sub/*'] }, { tool: 'read', cwd: '/w' }).action, 'allow')
  const grant = sessionGrantV2(shell)
  assert.deepEqual(grant, { permission: 'shell', patterns: ['git status *'] })
  assert.deepEqual(decideV2(ask, { action: 'shell', resources: ['git status -s'] }, { tool: 'shell', cwd: '/w', grants: [grant] }), { action: 'allow', reason: 'Allowed for this session.' })
  assert.equal(decideV2(plan, { action: 'shell', resources: ['rm x'] }, { tool: 'shell', cwd: '/w', grants: [{ permission: 'shell', patterns: ['*'] }] }).action, 'allow', 'sandboxed, not granted')
  const fields = [
    { key: 'q0', type: 'string', title: 'Color', description: 'Which color?', custom: true, options: [{ value: 'Red', label: 'Red', description: 'warm' }, { value: 'Blue', label: 'Blue' }] },
    { key: 'q1', type: 'multiselect', title: 'Sizes', description: 'Which sizes?', custom: true, options: [{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }] },
    { key: 'q2', type: 'string', title: 'Note', description: 'Anything else?', custom: true, options: [] },
  ]
  assert.deepEqual(questionsOfFormV2(fields)[0], { id: 'q0', header: 'Color', question: 'Which color?', isOther: true, isSecret: false, multiSelect: false, options: [{ label: 'Red', description: 'warm' }, { label: 'Blue', description: '' }] })
  assert.equal(questionsOfFormV2(fields)[1].multiSelect, true)
  assert.deepEqual(formAnswerV2(fields, { q0: { answers: ['Blue'] }, q1: { answers: ['S', 'M'] }, q2: { answers: [] } }), { q0: 'Blue', q1: ['S', 'M'] })
  assert.deepEqual(formAnswerV2(fields, { q0: { answers: ['Green, typed'] } }), { q0: 'Green, typed' })
})

test('permission.asked: allowed by the mode with no card (`once`), else a card replied at the owning session\'s route', async () => {
  const { bridge, fake, cards } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'git status' }], ['call_2', 'shell', { command: 'make' }]])
    fake.ask(shellAsk(sid, 'per_1', 'git status'))
    await until(() => fake.state.replies.length === 1, 'the auto answer')
    assert.deepEqual(fake.state.replies[0], { sessionID: sid, requestID: 'per_1', decision: 'once' })
    assert.equal(cards.length, 0, 'Auto runs shell commands (in the sandbox) without a card')
    live.setPermission({ ...live.permission, mode: 'ask', approvalPolicy: 'untrusted' })
    fake.ask(shellAsk(sid, 'per_2', 'make'))
    await until(() => cards.length === 1, 'the card')
    const [card] = cards
    assert.equal(card.method, 'item/commandExecution/requestApproval')
    assert.equal(card.params.command, 'make', 'the call\'s own input')
    assert.equal(card.params.itemId, 'msg_a1:tool:call_2')
    assert.equal(card.params.approvalId, 'per_2')
    assert.equal(card.params.turnId, live.activeTurn.id)
    assert.equal(card.params.sessionGrantable, true)
    answer(card, { decision: 'accept' })
    await until(() => fake.state.replies.length === 2, 'the reply')
    assert.deepEqual(fake.state.replies[1], { sessionID: sid, requestID: 'per_2', decision: 'once' })
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('Deny with feedback: one reject with the message; v2 rejects the session\'s other asks too and their cards are withdrawn unanswered', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'make a' }], ['call_2', 'shell', { command: 'make b' }], ['call_3', 'shell', { command: 'make c' }]])
    for (const n of [1, 2, 3]) fake.ask(shellAsk(sid, `per_${n}`, `make ${'abc'[n - 1]}`))
    await until(() => cards.length === 3, 'three cards')
    const from = notes.length
    answer(cards[0], { decision: 'decline', codeDesktop: { feedback: 'Use the Makefile in sub/ instead.' } })
    await until(() => open(cards).length === 0, 'the other cards withdrawn')
    await settle()
    assert.deepEqual(fake.state.replies, [{ sessionID: sid, requestID: 'per_1', decision: 'reject', message: 'Use the Makefile in sub/ instead.' }], 'nothing replied for the cascade')
    assert.deepEqual(cards.slice(1).map((card) => card.withdrawn), ['Answered.', 'Answered.'])
    assert.equal(notes.slice(from).filter((note) => note.method === 'serverRequest/resolved').length, 2)
    assert.equal(requests(fake, 'POST', `/api/session/${sid}/interrupt`).length, 0, 'the model goes on')
  } finally { await bridge.stop() }
})

test('a plain Deny interrupts (no reject without a message) and the call shows declined; a reload agrees', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    const { turn, e } = await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'rm -rf build' }], ['call_2', 'shell', { command: 'make' }]])
    fake.ask(shellAsk(sid, 'per_1', 'rm -rf build'))
    fake.ask(shellAsk(sid, 'per_2', 'make'))
    await until(() => cards.length === 2, 'the cards')
    const from = notes.length
    const sent = fake.state.requests.length
    answer(cards[0], { decision: 'decline' })
    await until(() => requests(fake, 'POST', `/api/session/${sid}/interrupt`, sent).length === 1, 'the interrupt')
    assert.equal(new URL(requests(fake, 'POST', `/api/session/${sid}/interrupt`, sent)[0].url).searchParams.get('resume'), 'false')
    await until(() => open(cards).length === 0, 'the other card withdrawn')
    // v2: the interrupt drops both asks (no permission.replied), the calls fail interrupted, the execution ends.
    e('session.tool.failed', { assistantMessageID: 'msg_a1', id: 'call_1', error: { type: 'aborted', message: 'Tool execution interrupted' } })
    e('session.tool.failed', { assistantMessageID: 'msg_a1', id: 'call_2', error: { type: 'aborted', message: 'Tool execution interrupted' } })
    e('session.step.failed', { assistantMessageID: 'msg_a1', error: { type: 'aborted', message: 'Step interrupted' } })
    e('session.execution.interrupted', { reason: 'user' })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    await settle()
    assert.deepEqual(fake.state.replies, [], 'no reply at all: never a message-less reject, nothing for the dropped ask')
    const status = (id) => notes.slice(from).filter((note) => note.method === 'item/completed' && note.params.item.id === id).at(-1)?.params.item.status
    assert.equal(status('msg_a1:tool:call_1'), 'declined')
    assert.equal(status('msg_a1:tool:call_2'), 'failed')
    assert.equal(notes.slice(from).find((note) => note.method === 'turn/completed').params.turn.status, 'interrupted')
    assert.deepEqual(bridge.store.get(sid).declined, ['msg_a1:tool:call_1'])
    // The stored transcript says 'interrupted' too; the thread's `declined` makes the reload agree.
    const stored = fake.state.messages.get(sid)
    stored.push({ id: 'msg_a1', type: 'assistant', agent: 'build', model: MODEL, time: { created: 2, completed: 3 }, content: [
      { type: 'tool', id: 'call_1', name: 'shell', state: { status: 'error', input: { command: 'rm -rf build' }, error: { type: 'aborted', message: 'Tool execution interrupted' } }, time: { created: 2, ran: 2, completed: 3 } },
    ] })
    await live.reload()
    const items = live.turns().find((entry) => entry.id === turn.id)?.items ?? []
    assert.equal(items.find((item) => item.id === 'msg_a1:tool:call_1')?.status, 'declined')
  } finally { await bridge.stop() }
})

test('an interrupt drops the session\'s asks with no permission.replied: the turn\'s end withdraws their cards and nothing is replied', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    const { e } = await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'make' }]])
    fake.ask(shellAsk(sid, 'per_1', 'make'))
    await until(() => cards.length === 1, 'the card')
    const from = notes.length
    // Another client interrupts: v2 drops the ask silently and ends the execution.
    fake.state.asks.clear()
    e('session.execution.interrupted', { reason: 'user' })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    await settle()
    assert.equal(cards[0].withdrawn, 'Turn finished.')
    assert.deepEqual(fake.state.replies, [])
    // The user's own Stop: the card goes first, the interrupt then drops the ask (no reply either).
    await runningTurn(bridge, fake, live, [['call_9', 'shell', { command: 'deploy' }]], 'msg_a2')
    fake.ask(shellAsk(sid, 'per_9', 'deploy', { source: { type: 'tool', messageID: 'msg_a2', id: 'call_9' } }))
    await until(() => cards.length === 2, 'the second card')
    await bridge.handle('turn/interrupt', { threadId: sid, turnId: live.activeTurn.id })
    await settle()
    assert.equal(cards[1].withdrawn, 'Turn interrupted.')
    assert.deepEqual(fake.state.replies, [], 'nothing replied to an ask the interrupt dropped')
  } finally { await bridge.stop() }
})

test('a failed interrupt leaves the asks open in v2: a plain Deny rejects with a message, a Stop cancels the open cards with one', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    // v2 unreachable for the interrupt only (a 5xx): every other call goes through.
    let failInterrupt = false
    const fetch = bridge.server.fetch
    bridge.server.fetch = (url, init) => (failInterrupt && new URL(url).pathname.endsWith('/interrupt')
      ? Promise.resolve(new Response(JSON.stringify({ _tag: 'UnknownError', message: 'down' }), { status: 500, headers: { 'content-type': 'application/json' } }))
      : fetch(url, init))
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'rm -rf build' }], ['call_2', 'shell', { command: 'make' }]])
    fake.ask(shellAsk(sid, 'per_1', 'rm -rf build'))
    fake.ask(shellAsk(sid, 'per_2', 'make'))
    await until(() => cards.length === 2, 'the cards')
    failInterrupt = true
    let from = notes.length
    answer(cards[0], { decision: 'decline' })
    await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'the turn ended here')
    await settle()
    // The denied ask is rejected with a message (v2 rejects the other with it): nothing is left waiting in v2.
    assert.deepEqual(fake.state.replies, [{ sessionID: sid, requestID: 'per_1', decision: 'reject', message: DECLINED_V2 }])
    assert.deepEqual([...fake.state.asks.keys()], [])
    assert.ok(cards[1].withdrawn)
    assert.deepEqual(bridge.store.get(sid).declined, ['msg_a1:tool:call_1'])
    // A Stop that fails: the open card is cancelled with a message (not settled unanswered by the turn's end).
    await runningTurn(bridge, fake, live, [['call_9', 'shell', { command: 'deploy' }]], 'msg_a2')
    fake.ask(shellAsk(sid, 'per_9', 'deploy', { source: { type: 'tool', messageID: 'msg_a2', id: 'call_9' } }))
    await until(() => cards.length === 3, 'the third card')
    from = notes.length
    await bridge.handle('turn/interrupt', { threadId: sid, turnId: live.activeTurn.id })
    await until(() => fake.state.replies.length === 2, 'the cancel')
    assert.equal(cards[2].withdrawn, 'Turn interrupted.')
    assert.deepEqual(fake.state.replies[1], { sessionID: sid, requestID: 'per_9', decision: 'reject', message: CANCELLED_V2 })
    assert.ok(notes.slice(from).some((note) => note.method === 'turn/completed'))
  } finally { await bridge.stop() }
})

test('"Allow for this session": kept by the bridge (runtime policy for the plugin), an open card it covers is answered `once`, the next ask needs none', async () => {
  const { bridge, fake, cards } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'git status' }], ['call_2', 'shell', { command: 'git status -s' }], ['call_3', 'shell', { command: 'git log' }]])
    fake.ask(shellAsk(sid, 'per_1', 'git status', { save: ['git status *'] }))
    fake.ask(shellAsk(sid, 'per_2', 'git status -s', { save: ['git status *'] }))
    await until(() => cards.length === 2, 'two cards')
    answer(cards[0], { decision: 'acceptForSession' })
    await until(() => fake.state.replies.length === 2, 'both answered')
    assert.deepEqual(fake.state.replies.map((reply) => [reply.requestID, reply.decision]).sort(), [['per_1', 'once'], ['per_2', 'once']], 'never `always`')
    assert.equal(cards[1].withdrawn, 'Allowed for this session.')
    assert.deepEqual(live.sessionGrants, [{ permission: 'shell', patterns: ['git status *'] }])
    const runtime = JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', `${sid}.json`), 'utf8'))
    assert.deepEqual(runtime.policy.grants, [{ permission: 'shell', patterns: ['git status *'] }])
    fake.ask(shellAsk(sid, 'per_3', 'git status --short', { save: ['git status *'] }))
    await until(() => fake.state.replies.length === 3, 'the covered ask')
    assert.equal(cards.length, 2, 'no card for what the grant covers')
    // A mode change drops the grants.
    live.setPermission({ ...live.permission, mode: 'acceptEdits' })
    assert.deepEqual(live.sessionGrants, [])
  } finally { await bridge.stop() }
})

test('file cards carry the ask\'s FileDiff; read-only modes: an external folder is `once` (the edit is refused in-process), an edit reaching the bridge is the fallback reject', async () => {
  const { bridge, fake, cards, logs } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'write', { filePath: 'new.txt', content: 'hi\n' }], ['call_2', 'write', { filePath: '/etc/x', content: 'y' }]])
    const diff = '--- /dev/null\n+++ new.txt\n@@ -0,0 +1 @@\n+hi\n'
    fake.ask({ id: 'per_1', sessionID: sid, action: 'edit', resources: ['new.txt'], save: ['*'], metadata: { files: [{ file: 'new.txt', patch: diff, additions: 1, deletions: 0, status: 'added' }] }, source: { type: 'tool', messageID: 'msg_a1', id: 'call_1' } })
    await until(() => cards.length === 1, 'the file card')
    assert.equal(cards[0].method, 'item/fileChange/requestApproval')
    assert.deepEqual(cards[0].params.changes, [{ path: '/w/new.txt', kind: { type: 'add' }, diff }])
    assert.equal(cards[0].params.itemId, 'msg_a1:tool:call_1')
    assert.equal(live.askDiffs.get('call_1'), diff, 'write\'s success has no diff: the ask\'s stands in')
    answer(cards[0], { decision: 'accept' })
    await until(() => fake.state.replies.length === 1, 'the reply')
    live.setPermission({ ...live.permission, mode: 'plan', sandbox: 'read-only' })
    fake.ask({ id: 'per_2', sessionID: sid, action: 'external_directory', resources: ['/etc/*'], save: ['/etc/*'], source: { type: 'tool', messageID: 'msg_a1', id: 'call_2' } })
    await until(() => fake.state.replies.length === 2, 'the external folder')
    assert.equal(fake.state.replies[1].decision, 'once')
    fake.ask({ id: 'per_3', sessionID: sid, action: 'edit', resources: ['/etc/x'], save: ['*'], source: { type: 'tool', messageID: 'msg_a1', id: 'call_2' } })
    await until(() => fake.state.replies.length === 3, 'the fallback')
    assert.deepEqual(fake.state.replies[2], { sessionID: sid, requestID: 'per_3', decision: 'reject', message: 'This mode cannot change files.' })
    assert.ok(logs.some((line) => /per_3: edit refused by the bridge/.test(line)))
    assert.equal(cards.length, 1)
  } finally { await bridge.stop() }
})

test('question forms: a card from the fields, answered at v2\'s route (single choice a string); dismissed, unattended, other kinds and "global" are cancelled with a message', async () => {
  const { bridge, fake, cards } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_q', 'question', { questions: [{ question: 'Which color?', header: 'Color', options: [{ label: 'Red' }, { label: 'Blue' }] }] }]])
    const fields = [
      { key: 'q0', type: 'string', title: 'Color', description: 'Which color?', custom: true, options: [{ value: 'Red', label: 'Red', description: 'warm' }, { value: 'Blue', label: 'Blue' }] },
      { key: 'q1', type: 'multiselect', title: 'Sizes', description: 'Which sizes?', custom: true, options: [{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }] },
    ]
    const form = fake.form({ sessionID: sid, metadata: { kind: 'question', tool: { messageID: 'msg_a1', id: 'call_q' } }, fields })
    await until(() => cards.length === 1, 'the question card')
    assert.equal(cards[0].method, 'item/tool/requestUserInput')
    assert.equal(cards[0].params.itemId, 'msg_a1:tool:call_q')
    assert.deepEqual(cards[0].params.questions.map((question) => [question.id, question.header, question.multiSelect]), [['q0', 'Color', false], ['q1', 'Sizes', true]])
    answer(cards[0], { answers: { q0: { answers: ['Blue'] }, q1: { answers: ['S', 'M'] } } })
    await until(() => fake.state.formReplies.length === 1, 'the answer')
    assert.deepEqual(fake.state.formReplies[0], { sessionID: sid, formID: form.id, answer: { q0: 'Blue', q1: ['S', 'M'] } })
    // Dismissed: cancelled with a message (without one the question tool would end the execution).
    const second = fake.form({ sessionID: sid, metadata: { kind: 'question', tool: { messageID: 'msg_a1', id: 'call_q' } }, fields })
    await until(() => cards.length === 2, 'the second card')
    answer(cards[1], null)
    await until(() => fake.state.formCancels.length === 1, 'the cancel')
    assert.deepEqual(fake.state.formCancels[0], { sessionID: sid, formID: second.id, message: DISMISSED_V2, directory: null })
    // Answered elsewhere: the card goes, nothing is sent.
    const third = fake.form({ sessionID: sid, metadata: { kind: 'question' }, fields })
    await until(() => cards.length === 3, 'the third card')
    fake.state.forms.delete(third.id)
    fake.emit('form.replied', { id: third.id, sessionID: sid, answer: {} })
    await until(() => cards[2].withdrawn === 'Answered.', 'the card withdrawn')
    // Other kinds have no card yet.
    const elicitation = fake.form({ sessionID: sid, metadata: { kind: 'websearch.provider' }, fields: [{ key: 'provider', type: 'string' }] })
    await until(() => fake.state.formCancels.length === 2, 'the other kind')
    assert.deepEqual([fake.state.formCancels[1].formID, fake.state.formCancels[1].message], [elicitation.id, OTHER_FORM_V2])
    const global = fake.form({ sessionID: 'global', metadata: { kind: 'mcp-elicitation' }, fields: [{ key: 'ok', type: 'external', url: 'https://x' }] }, { directory: '/w' })
    await until(() => fake.state.formCancels.length === 3, 'the global form')
    assert.deepEqual(fake.state.formCancels[2], { sessionID: 'global', formID: global.id, message: OTHER_FORM_V2, directory: '/w' })
    // Nobody to answer (a workflow agent, approvalPolicy never): cancelled with the unattended message.
    live.setPermission({ ...live.permission, approvalPolicy: 'never' })
    const unattended = fake.form({ sessionID: sid, metadata: { kind: 'question' }, fields })
    await until(() => fake.state.formCancels.length === 4, 'the unattended form')
    assert.deepEqual([fake.state.formCancels[3].formID, fake.state.formCancels[3].message], [unattended.id, UNATTENDED_V2])
    assert.equal(cards.length, 3)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('a resync raises the open asks again once: a card already up stays single, one dropped meanwhile is withdrawn, a new one gets its card', async () => {
  const { bridge, fake, cards } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'make a' }], ['call_2', 'shell', { command: 'make b' }], ['call_3', 'shell', { command: 'make c' }]])
    fake.ask(shellAsk(sid, 'per_1', 'make a'))
    fake.ask(shellAsk(sid, 'per_2', 'make b'))
    await until(() => cards.length === 2, 'two cards')
    // The stream drops; meanwhile per_2 is answered elsewhere and per_3 asked (neither event seen here).
    fake.drop()
    await settle(5)
    fake.state.asks.delete('per_2')
    fake.state.asks.set('per_3', shellAsk(sid, 'per_3', 'make c'))
    await until(() => cards.length === 3, 'the card for the ask missed')
    await until(() => !live.resyncBufferV2, 'the resync')
    await settle()
    assert.equal(cards[2].params.approvalId, 'per_3')
    assert.equal(cards[1].withdrawn, 'Answered.')
    assert.equal(cards[0].withdrawn, undefined, 'still open, not raised twice')
    assert.equal(cards.filter((card) => card.params.approvalId === 'per_1').length, 1)
    assert.deepEqual(fake.state.replies, [])
    // An ask for a session not loaded: the thread opens and its card comes once (the event and the list both name it).
    const other = fake.makeSession({ title: 'Other', location: { directory: '/w' }, agent: 'build', model: MODEL })
    bridge.store.update(other.id, { cwd: '/w', permission: { ...live.permission } })
    fake.state.active.add(other.id)
    fake.ask({ id: 'per_x', sessionID: other.id, action: 'shell', resources: ['ls'], save: ['ls *'] })
    await until(() => cards.some((card) => card.params.approvalId === 'per_x'), 'the unloaded session\'s card')
    await settle(50)
    assert.equal(cards.filter((card) => card.params.approvalId === 'per_x').length, 1)
    assert.ok(bridge.threads.has(other.id))
  } finally { await bridge.stop() }
})

test('Plan mode: the plan item, turn/completed, then the card; Approve → rules (if changed), POST /agent {build} and its model, a queued execution prompt; Keep planning queues feedback; a new turn withdraws it', async () => {
  const { bridge, fake, cards, notes, home } = await v2Bridge()
  try {
    // The plan agent has its own model: the planning turns run on it, the execution on the build agent's (the thread's).
    fake.state.agents.find((agent) => agent.id === 'plan').model = { id: 'claude-p', providerID: 'anthropic' }
    bridge.agentListCache?.clear()
    const live = await startThread(bridge, PLAN_MODE)
    const sid = live.id
    assert.equal(fake.state.sessions.find((info) => info.id === sid).agent, 'plan')
    let steps = 0
    const finishPlan = async (text, { file } = {}) => {
      const step = `msg_p${++steps}`
      const { turn, e } = await runningTurn(bridge, fake, live, file ? [['call_p', 'write', { filePath: file, content: 'Step 1\n' }]] : [], step)
      if (file) {
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, '# Plan\n1. Do it\n')
        e('session.tool.success', { assistantMessageID: step, id: 'call_p', content: [{ type: 'text', text: 'Wrote' }], executed: true })
      }
      e('session.text.started', { assistantMessageID: step, ordinal: 0 })
      e('session.text.ended', { assistantMessageID: step, ordinal: 0, text })
      e('session.step.ended', { assistantMessageID: step, finish: 'stop', cost: 0, tokens: TOKENS })
      fake.state.active.delete(sid)
      e('session.execution.succeeded')
      return turn
    }
    let from = notes.length
    const turn = await finishPlan('1. Edit a.js\n2. Run tests')
    await until(() => cards.length === 1, 'the plan card')
    assert.deepEqual(fake.state.sessions.find((info) => info.id === sid).model, { id: 'claude-p', providerID: 'anthropic' }, 'the plan agent\'s model')
    const order = notes.slice(from).map((note) => note.method === 'item/completed' ? `item:${note.params.item.type}` : note.method).filter((method) => ['item:plan', 'turn/completed'].includes(method))
    assert.deepEqual(order, ['item:plan', 'turn/completed'], 'the card does not hold the turn')
    assert.equal(notes.slice(from).find((note) => note.method === 'item/completed' && note.params.item.type === 'plan').params.item.text, '1. Edit a.js\n2. Run tests')
    assert.deepEqual([cards[0].method, cards[0].params.turnId, cards[0].params.questions[0].id], ['item/tool/requestUserInput', turn.id, 'plan-review'])
    assert.equal(live.activeTurn, null)

    // Keep planning with feedback: the feedback runs as the next prompt.
    let sent = fake.state.requests.length
    answer(cards[0], { answers: { 'plan-review': { answers: ['Also update the docs'] } } })
    await until(() => requests(fake, 'POST', `/api/session/${sid}/prompt`, sent).length === 1, 'the feedback prompt')
    assert.equal(requests(fake, 'POST', `/api/session/${sid}/prompt`, sent)[0].body.text, 'Also update the docs')
    assert.equal(requests(fake, 'POST', `/api/session/${sid}/agent`, sent).length, 0, 'still the plan agent')
    // (That prompt's turn runs and ends without a plan here: interrupted.)
    fake.emit('session.execution.interrupted', { sessionID: sid, reason: 'user' })
    await until(() => !live.activeTurn, 'the feedback turn over')

    // A plan file written this turn is the plan; a new turn withdraws an unanswered card.
    from = notes.length
    const planFile = path.join(home, '.opencode', 'plan', 'p.md')
    await finishPlan('Plan written to p.md.', { file: planFile })
    await until(() => cards.length === 2, 'the second plan card')
    assert.equal(notes.slice(from).find((note) => note.method === 'item/completed' && note.params.item.type === 'plan').params.item.text, '# Plan\n1. Do it\n')
    await bridge.handle('turn/start', { threadId: sid, input: [{ type: 'text', text: 'actually, wait' }] })
    assert.equal(cards[1].withdrawn, 'A new turn started.')
    fake.emit('session.execution.interrupted', { sessionID: sid, reason: 'user' })
    await until(() => !live.activeTurn, 'that turn over')

    // Approve: the mode after the plan, the ruleset (changed meanwhile: a tool turned off), the agent switch and its
    // model, then the execution prompt queued.
    await finishPlan('Final plan.')
    await until(() => cards.length === 3, 'the third plan card')
    live.tools = { disabled: ['webfetch'], disabledServers: [] }
    sent = fake.state.requests.length
    from = notes.length
    answer(cards[2], { answers: { 'plan-review': { answers: ['Approve'] } }, codeDesktop: { afterPlan: 'acceptEdits' } })
    await until(() => requests(fake, 'POST', `/api/session/${sid}/prompt`, sent).length === 1, 'the execution prompt')
    const calls = fake.state.requests.slice(sent).filter((request) => ['PATCH', 'POST'].includes(request.method) && request.path.startsWith(`/api/session/${sid}`)).map((request) => `${request.method} ${request.path.slice(`/api/session/${sid}`.length) || '/'}`)
    assert.deepEqual(calls, ['PATCH /', 'POST /agent', 'POST /model', 'POST /prompt'])
    assert.ok(requests(fake, 'PATCH', `/api/session/${sid}`, sent)[0].body.permissions.some((rule) => rule.action === 'webfetch' && rule.effect === 'deny'))
    assert.deepEqual(requests(fake, 'POST', `/api/session/${sid}/agent`, sent)[0].body, { agent: 'build' })
    assert.deepEqual(requests(fake, 'POST', `/api/session/${sid}/model`, sent)[0].body, { model: { id: 'claude-x', providerID: 'anthropic' } })
    await settle()
    assert.equal(notes.slice(from).filter((note) => note.method === 'model/rerouted').length, 0, 'the build agent runs the thread\'s model')
    const prompt = requests(fake, 'POST', `/api/session/${sid}/prompt`, sent)[0].body
    assert.deepEqual([prompt.text, prompt.delivery], [PLAN_APPROVED_V2, 'queue'])
    assert.equal(live.permission.mode, 'acceptEdits')
    const runtime = JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', `${sid}.json`), 'utf8'))
    assert.deepEqual([runtime.policy.mode, runtime.policy.readOnly, runtime.sandbox.mode], ['acceptEdits', false, 'workspace-write'])
    assert.equal(live.activeTurn?.id, prompt.id, 'the bridge\'s own turn')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('no plan card outside Plan mode, for a failed or interrupted plan turn, or when nobody answers', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const sid = live.id
    const e = (type, data = {}) => fake.emit(type, { sessionID: sid, ...data })
    let steps = 0
    const run = async (end) => {
      const from = notes.length
      const step = `msg_n${++steps}`
      await runningTurn(bridge, fake, live, [], step)
      e('session.text.started', { assistantMessageID: step, ordinal: 0 })
      e('session.text.ended', { assistantMessageID: step, ordinal: 0, text: 'A plan.' })
      e(end.type, end.data)
      await until(() => notes.slice(from).some((note) => note.method === 'turn/completed'), 'turn/completed')
    }
    await run({ type: 'session.execution.succeeded' })
    live.setPermission({ ...live.permission, mode: 'plan', sandbox: 'read-only' })
    live.info = { ...live.info, agent: 'plan' }
    await run({ type: 'session.execution.failed', data: { error: { type: 'provider.auth', message: 'Bad key' } } })
    await run({ type: 'session.execution.interrupted', data: { reason: 'user' } })
    live.setPermission({ ...live.permission, approvalPolicy: 'never' })
    await run({ type: 'session.execution.succeeded' })
    await settle()
    assert.equal(cards.length, 0)
    assert.equal(notes.filter((note) => note.method === 'item/completed' && note.params.item.type === 'plan').length, 0)
  } finally { await bridge.stop() }
})

test('a sub-agent\'s ask: its card on the root thread (childThreadId), replied at the child\'s route; the child\'s end withdraws it, the root\'s does not', async () => {
  const { bridge, fake, cards, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    fake.state.agents.push({ id: 'general', name: 'General', mode: 'subagent', permissions: [] })
    const child = fake.makeSession({ parentID: sid, title: 'child', agent: 'general', location: { directory: '/w' } })
    fake.emit('session.created', { sessionID: child.id, parentID: sid, projectID: 'prj_fake', location: { directory: '/w' }, title: 'child', agent: 'general' })
    await until(() => bridge.children.has(child.id), 'the child thread')
    const childThread = bridge.children.get(child.id)
    const c = (type, data = {}) => fake.emit(type, { sessionID: child.id, ...data })
    c('session.execution.started')
    c('session.step.started', { assistantMessageID: 'msg_c1', agent: 'general', model: MODEL, started: 1 })
    c('session.tool.input.started', { assistantMessageID: 'msg_c1', id: 'call_c', name: 'shell' })
    c('session.tool.called', { assistantMessageID: 'msg_c1', id: 'call_c', input: { command: 'make' }, executed: true })
    await until(() => childThread.projector.messages.get('msg_c1')?.parts.length === 1, 'the child call')
    fake.ask({ id: 'per_c', sessionID: child.id, action: 'shell', resources: ['make'], save: ['make *'], source: { type: 'tool', messageID: 'msg_c1', id: 'call_c' } })
    await until(() => cards.length === 1, 'the child card')
    assert.deepEqual([cards[0].params.threadId, cards[0].params.childThreadId, cards[0].params.itemId], [sid, child.id, 'msg_c1:tool:call_c'])
    // The root's own execution ends (a background sub-agent goes on): the card stays.
    await runningTurn(bridge, fake, live, [], 'msg_r1')
    fake.emit('session.execution.succeeded', { sessionID: sid })
    await until(() => !live.activeTurn, 'the root turn over')
    assert.equal(cards[0].withdrawn, undefined)
    answer(cards[0], { decision: 'accept' })
    await until(() => fake.state.replies.length === 1, 'the reply')
    assert.deepEqual(fake.state.replies[0], { sessionID: child.id, requestID: 'per_c', decision: 'once' })
    // A second ask, then the child's execution ends: withdrawn, unanswered.
    fake.ask({ id: 'per_c2', sessionID: child.id, action: 'shell', resources: ['make'], save: ['make *'], source: { type: 'tool', messageID: 'msg_c1', id: 'call_c' } })
    await until(() => cards.length === 2, 'the second child card')
    fake.state.asks.delete('per_c2')
    c('session.execution.interrupted', { reason: 'user' })
    await until(() => cards[1].withdrawn, 'withdrawn')
    await settle()
    assert.equal(cards[1].withdrawn, 'Turn finished.')
    assert.equal(fake.state.replies.length, 1)
    assert.ok(notes.length)
  } finally { await bridge.stop() }
})

test('a background sub-agent\'s card stays up, unanswered, when the root turn is stopped or a root ask gets a plain Deny', async () => {
  const { bridge, fake, cards } = await v2Bridge()
  try {
    const live = await startThread(bridge, ASK_MODE)
    const sid = live.id
    fake.state.agents.push({ id: 'general', name: 'General', mode: 'subagent', permissions: [] })
    const child = fake.makeSession({ parentID: sid, title: 'child', agent: 'general', location: { directory: '/w' } })
    fake.emit('session.created', { sessionID: child.id, parentID: sid, projectID: 'prj_fake', location: { directory: '/w' }, title: 'child', agent: 'general' })
    await until(() => bridge.children.has(child.id), 'the child thread')
    const childThread = bridge.children.get(child.id)
    const c = (type, data = {}) => fake.emit(type, { sessionID: child.id, ...data })
    c('session.execution.started')
    c('session.step.started', { assistantMessageID: 'msg_c1', agent: 'general', model: MODEL, started: 1 })
    c('session.tool.input.started', { assistantMessageID: 'msg_c1', id: 'call_c', name: 'shell' })
    c('session.tool.called', { assistantMessageID: 'msg_c1', id: 'call_c', input: { command: 'make' }, executed: true })
    await until(() => childThread.projector.messages.get('msg_c1')?.parts.length === 1, 'the child call')
    fake.ask({ id: 'per_c', sessionID: child.id, action: 'shell', resources: ['make'], save: ['make *'], source: { type: 'tool', messageID: 'msg_c1', id: 'call_c' } })
    await until(() => cards.length === 1, 'the child card')
    // A root ask turned down with nothing to say: the root is interrupted, the child's card is not touched.
    const { e } = await runningTurn(bridge, fake, live, [['call_1', 'shell', { command: 'rm -rf build' }]])
    fake.ask(shellAsk(sid, 'per_1', 'rm -rf build'))
    await until(() => cards.length === 2, 'the root card')
    let sent = fake.state.requests.length
    answer(cards[1], { decision: 'decline' })
    await until(() => requests(fake, 'POST', `/api/session/${sid}/interrupt`, sent).length === 1, 'the interrupt')
    e('session.execution.interrupted', { reason: 'user' })
    await until(() => !live.activeTurn, 'the root turn over')
    await settle()
    assert.equal(cards[0].withdrawn, undefined)
    assert.deepEqual(fake.state.replies, [])
    // The user's Stop on the root: the same.
    await runningTurn(bridge, fake, live, [], 'msg_a2')
    sent = fake.state.requests.length
    await bridge.handle('turn/interrupt', { threadId: sid, turnId: live.activeTurn.id })
    assert.equal(requests(fake, 'POST', `/api/session/${sid}/interrupt`, sent).length, 1)
    await settle()
    assert.equal(cards[0].withdrawn, undefined)
    assert.deepEqual(fake.state.replies, [])
    assert.ok(fake.state.asks.has('per_c'))
    // Still answerable: the child's reply goes to the child's route.
    answer(cards[0], { decision: 'accept' })
    await until(() => fake.state.replies.length === 1, 'the reply')
    assert.deepEqual(fake.state.replies[0], { sessionID: child.id, requestID: 'per_c', decision: 'once' })
  } finally { await bridge.stop() }
})

// ---------------------------------------------------------------- the plugin

test('plugin permission.evaluate: an allow only a saved "always" rule gives asks again; the session\'s own allows stay', async () => {
  const state = tmp()
  const dir = path.join(state, 'opencode-plugin', PLUGIN_ID)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `index-${Math.random().toString(36).slice(2)}.js`)
  fs.writeFileSync(file, pluginSourceV2())
  const plugin = (await import(pathToFileURL(file).href)).default
  const hooks = {}
  const registration = { dispose: async () => {} }
  const domain = (name) => ({ hook: async (hook, callback) => { (hooks[`${name}.${hook}`] ??= []).push(callback); return registration } })
  const rules = [{ action: '*', resource: '*', effect: 'ask' }, { action: 'read', resource: '*', effect: 'allow' }, { action: 'shell', resource: 'git *', effect: 'allow' }]
  const sessions = { ses_a: { id: 'ses_a', permissions: rules, metadata: {} }, ses_b: { id: 'ses_b', permissions: rules, metadata: {} } }
  const ctx = {
    options: { state, wrapper: path.join(state, 'wrapper') }, location: { directory: '/work', project: {} },
    session: { ...domain('session'), get: async ({ sessionID }) => { if (!sessions[sessionID]) throw new Error('not found'); return { data: sessions[sessionID] } } },
    tool: domain('tool'), permission: domain('permission'), shell: domain('shell'), mcp: { transform: async () => registration },
  }
  const cleanup = await plugin.setup(ctx)
  const write = (id, policy) => { fs.mkdirSync(path.join(state, 'runtime', 'sessions'), { recursive: true }); fs.writeFileSync(path.join(state, 'runtime', 'sessions', `${id}.json`), JSON.stringify({ root: id, policy })) }
  write('ses_a', { mode: 'ask', readOnly: false, cwd: '/work', planDirs: [], agentDirs: [], roots: [], grants: [], noUser: false })
  write('ses_b', { mode: 'ask', readOnly: false, cwd: '/work', planDirs: [], agentDirs: [], roots: [], grants: [{ permission: 'shell', patterns: ['make *'] }], noUser: true })
  const evaluate = async (id, request) => { const event = { sessionID: id, agent: 'build', ...request }; for (const callback of hooks['permission.evaluate']) await callback(event); return event }
  assert.equal((await evaluate('ses_a', { action: 'shell', resources: ['make'], effect: 'allow' })).effect, 'ask', 'a saved `make *` allow asks again')
  assert.equal((await evaluate('ses_a', { action: 'shell', resources: ['git status'], effect: 'allow' })).effect, 'allow', 'the session allows it itself')
  assert.equal((await evaluate('ses_a', { action: 'read', resources: ['a.txt', 'b.txt'], effect: 'allow' })).effect, 'allow')
  assert.equal((await evaluate('ses_a', { action: 'shell', resources: ['git status', 'make'], effect: 'allow' })).effect, 'ask', 'one resource not the session\'s')
  assert.equal((await evaluate('ses_b', { action: 'shell', resources: ['make'], effect: 'allow' })).effect, 'allow', 'then a session grant allows it again')
  const unattended = await evaluate('ses_b', { action: 'webfetch', resources: ['https://x'], effect: 'allow' })
  assert.deepEqual([unattended.effect, /runs without approvals/.test(unattended.message)], ['deny', true], 'or nobody is there: refused')
  assert.equal((await evaluate('ses_none', { action: 'shell', resources: ['make'], effect: 'allow' })).effect, 'allow', 'no runtime file: untouched')
  sessions.ses_a.permissions = []
  assert.equal((await evaluate('ses_a', { action: 'shell', resources: ['make'], effect: 'allow' })).effect, 'allow', 'a session without a ruleset: untouched')
  cleanup?.()
})
