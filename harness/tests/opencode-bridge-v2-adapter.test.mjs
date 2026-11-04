// OpenCode 2.x bridge, phase 5: the live event adapter (src/v2/live.js). Live events build exactly the entries a
// reload builds from the messages v2 stored for them (message-updater.ts + the inbox delivery of projector.ts), so a
// reload never doubles or reorders an item; plus the prompt body, the bridge's ids and the retry notice.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Projector } from '../packages/opencode-bridge/src/projection.js'
import { toV1Messages } from '../packages/opencode-bridge/src/v2/history.js'
import { LiveAdapterV2, messageIdOfEvent, newMessageId, newSessionId, promptBodyV2, promptInputV2, retryNoticeV2 } from '../packages/opencode-bridge/src/v2/live.js'

const SID = 'ses_live'
const MODEL = { id: 'claude-x', providerID: 'anthropic' }
const TOKENS = { input: 100, output: 20, reasoning: 5, cache: { read: 50, write: 0 } }
let events = 0
const ev = (type, data, created, id = `evt_${String(++events).padStart(4, '0')}`) => ({ id, type, created, sessionID: SID, data: { sessionID: SID, ...data }, kind: 'session', durable: null })
const setup = () => {
  const projector = new Projector({ threadId: SID, cwd: '/w', api: 'v2' })
  return { projector, adapter: new LiveAdapterV2(projector, { sessionID: SID }) }
}
const same = (projector, messages) => assert.deepEqual(projector.ordered(), toV1Messages(messages, { sessionID: SID }))

test('a plain turn\'s events build the entries a reload of the stored messages builds (ids, text, tools, usage, idle)', () => {
  const { projector, adapter } = setup()
  const changes = []
  const run = (event) => { const out = adapter.apply(event); changes.push([event.type, out]); return out }
  run(ev('session.inbox.enqueued', { inboxID: 'msg_u1', item: { type: 'user', payload: { text: 'hi', files: [{ uri: 'file:///w/a.png', name: 'a.png' }] }, delivery: 'steer' } }, 1))
  run(ev('session.execution.started', {}, 2))
  run(ev('session.inbox.delivered', { inboxID: 'msg_u1' }, 3))
  run(ev('session.step.started', { assistantMessageID: 'msg_a1', agent: 'build', model: MODEL, started: 4 }, 4))
  run(ev('session.reasoning.started', { assistantMessageID: 'msg_a1', ordinal: 0 }, 5))
  run(ev('session.reasoning.delta', { assistantMessageID: 'msg_a1', ordinal: 0, delta: 'thi' }, 5))
  run(ev('session.reasoning.ended', { assistantMessageID: 'msg_a1', ordinal: 0, text: 'think' }, 6))
  run(ev('session.text.started', { assistantMessageID: 'msg_a1', ordinal: 0 }, 7))
  run(ev('session.text.delta', { assistantMessageID: 'msg_a1', ordinal: 0, delta: 'Hel' }, 8))
  assert.equal(projector.messages.get('msg_a1').parts.find((part) => part.id === 'msg_a1:text:0').text, 'Hel', 'a delta shows at once')
  run(ev('session.text.delta', { assistantMessageID: 'msg_a1', ordinal: 0, delta: 'lo' }, 9))
  const ended = run(ev('session.text.ended', { assistantMessageID: 'msg_a1', ordinal: 0, text: 'Hello' }, 10))
  assert.deepEqual(ended, [{ messageID: 'msg_a1', partID: 'msg_a1:text:0', done: true }])
  run(ev('session.tool.input.started', { assistantMessageID: 'msg_a1', id: 'call_1', name: 'shell' }, 11))
  assert.equal(projector.messages.get('msg_a1').parts.at(-1).state.status, 'pending')
  run(ev('session.tool.input.delta', { assistantMessageID: 'msg_a1', id: 'call_1', delta: '{"comm' }, 11))
  run(ev('session.tool.called', { assistantMessageID: 'msg_a1', id: 'call_1', input: { command: 'ls' }, executed: true }, 12))
  run(ev('session.tool.progress', { assistantMessageID: 'msg_a1', id: 'call_1', metadata: { shellID: 'shl_1' } }, 12))
  assert.deepEqual(projector.messages.get('msg_a1').parts.at(-1).state.metadata, { shellID: 'shl_1' })
  run(ev('session.tool.success', { assistantMessageID: 'msg_a1', id: 'call_1', content: [{ type: 'text', text: 'a\nb' }], metadata: { exit: 0, status: 'exited' }, executed: true }, 13))
  run(ev('session.step.ended', { assistantMessageID: 'msg_a1', finish: 'tool-calls', cost: 0.01, tokens: TOKENS }, 14))
  run(ev('session.step.started', { assistantMessageID: 'msg_a2', agent: 'build', model: MODEL, started: 15 }, 15))
  run(ev('session.text.started', { assistantMessageID: 'msg_a2', ordinal: 0 }, 15))
  run(ev('session.text.ended', { assistantMessageID: 'msg_a2', ordinal: 0, text: 'Done' }, 16))
  run(ev('session.step.ended', { assistantMessageID: 'msg_a2', finish: 'stop', cost: 0.002, tokens: TOKENS }, 17))
  run(ev('session.execution.succeeded', {}, 18, 'evt_idle1'))
  same(projector, [
    { id: 'msg_u1', type: 'user', time: { created: 3 }, text: 'hi', files: [{ uri: 'file:///w/a.png', name: 'a.png' }] },
    { id: 'msg_a1', type: 'assistant', agent: 'build', model: MODEL, time: { created: 4, completed: 14 }, finish: 'tool-calls', cost: 0.01, tokens: TOKENS, content: [
      { type: 'reasoning', text: 'think', time: { created: 5, completed: 6 } },
      { type: 'text', text: 'Hello' },
      { type: 'tool', id: 'call_1', name: 'shell', time: { created: 11, ran: 12, completed: 13 }, state: { status: 'completed', input: { command: 'ls' }, content: [{ type: 'text', text: 'a\nb' }], metadata: { exit: 0, status: 'exited' } } },
    ] },
    { id: 'msg_a2', type: 'assistant', agent: 'build', model: MODEL, time: { created: 15, completed: 17 }, finish: 'stop', cost: 0.002, tokens: TOKENS, content: [{ type: 'text', text: 'Done' }] },
    { id: 'msg_idle1', type: 'idle', outcome: 'succeeded', time: { created: 18 } },
  ])
  const turns = projector.turns()
  assert.deepEqual(turns.map((turn) => [turn.id, turn.status]), [['msg_u1', 'completed']])
  assert.deepEqual(turns[0].items.map((item) => item.id), ['msg_u1-user', 'msg_a1:reasoning:0', 'msg_a1:text:0', 'msg_a1:tool:call_1', 'msg_a2:text:0'])
  assert.deepEqual(changes.find(([type]) => type === 'session.tool.called')[1], [{ messageID: 'msg_a1', partID: 'msg_a1:tool:call_1' }])
})

test('retries, failures, compaction, synthetic wakes, shutdown and the user\'s own command, as v2 records them', () => {
  const { projector, adapter } = setup()
  const error = { type: 'provider.rate-limit', message: 'Slow down', status: 429 }
  adapter.apply(ev('session.step.started', { assistantMessageID: 'msg_a1', agent: 'build', model: MODEL, started: 1 }, 1))
  adapter.apply(ev('session.retry.scheduled', { assistantMessageID: 'msg_a1', attempt: 1, at: 5000, error }, 2))
  assert.deepEqual(projector.messages.get('msg_a1').info.retry, { attempt: 1, at: 5000, error })
  // The retried step starts over: the same message, its retry gone.
  adapter.apply(ev('session.step.started', { assistantMessageID: 'msg_a1', agent: 'build', model: MODEL, started: 6 }, 6))
  adapter.apply(ev('session.text.started', { assistantMessageID: 'msg_a1', ordinal: 0 }, 7))
  adapter.apply(ev('session.text.ended', { assistantMessageID: 'msg_a1', ordinal: 0, text: 'ok' }, 8))
  adapter.apply(ev('session.tool.input.started', { assistantMessageID: 'msg_a1', id: 'call_2', name: 'edit' }, 9))
  adapter.apply(ev('session.tool.failed', { assistantMessageID: 'msg_a1', id: 'call_2', error: { type: 'aborted', message: 'The user declined this tool call' }, executed: false }, 10))
  adapter.apply(ev('session.step.failed', { assistantMessageID: 'msg_a1', error: { type: 'aborted', message: 'Aborted' } }, 11))
  // A shutdown leaves no idle (the resumed run continues the turn).
  assert.deepEqual(adapter.apply(ev('session.execution.interrupted', { reason: 'shutdown' }, 12)), [])
  adapter.apply(ev('session.compaction.started', { reason: 'manual', inputID: 'msg_c1' }, 13))
  adapter.apply(ev('session.compaction.delta', { text: 'Sum' }, 14))
  adapter.apply(ev('session.compaction.ended', { reason: 'manual', text: 'Summary.', model: MODEL, cost: 0.1, tokens: TOKENS }, 15))
  adapter.apply(ev('session.execution.interrupted', { reason: 'user' }, 16, 'evt_idle2'))
  adapter.apply(ev('session.inbox.enqueued', { inboxID: 'msg_s1', item: { type: 'synthetic', payload: { text: '<subagent sessionID=ses_c state=completed>\nok\n</subagent>', metadata: { source: 'subagent', childID: 'ses_c', state: 'completed' } }, delivery: 'steer' } }, 17))
  adapter.apply(ev('session.inbox.delivered', { inboxID: 'msg_s1' }, 18))
  adapter.apply(ev('session.shell.started', { shell: { id: 'shl_9', command: 'make', status: 'running', metadata: {} } }, 19, 'evt_shell'))
  const shellEnd = adapter.apply(ev('session.shell.ended', { shell: { id: 'shl_9', command: 'make', status: 'exited', exit: 0 }, output: { output: 'built', cursor: 5, size: 5, truncated: false } }, 20))
  assert.deepEqual(shellEnd, [{ messageID: 'msg_shell', partID: 'msg_shell:shell' }])
  adapter.apply(ev('session.execution.failed', { error }, 21, 'evt_idle3'))
  same(projector, [
    { id: 'msg_a1', type: 'assistant', agent: 'build', model: MODEL, time: { created: 6, completed: 11 }, finish: 'error', error: { type: 'aborted', message: 'Aborted' }, content: [
      { type: 'text', text: 'ok' },
      { type: 'tool', id: 'call_2', name: 'edit', time: { created: 9, completed: 10 }, state: { status: 'error', error: { type: 'aborted', message: 'The user declined this tool call' }, input: {} } },
    ] },
    { id: 'msg_c1', type: 'compaction', status: 'completed', reason: 'manual', summary: 'Summary.', model: MODEL, cost: 0.1, tokens: TOKENS, time: { created: 13 } },
    { id: 'msg_idle2', type: 'idle', outcome: 'interrupted', time: { created: 16 } },
    { id: 'msg_s1', type: 'synthetic', time: { created: 18 }, text: '<subagent sessionID=ses_c state=completed>\nok\n</subagent>', metadata: { source: 'subagent', childID: 'ses_c', state: 'completed' } },
    { id: 'msg_shell', type: 'shell', shellID: 'shl_9', command: 'make', status: 'exited', exit: 0, output: { output: 'built', cursor: 5, size: 5, truncated: false }, time: { created: 19, completed: 20 } },
    { id: 'msg_idle3', type: 'idle', outcome: 'failed', error, time: { created: 21 } },
  ])
})

test('session.revert.committed drops its boundary and everything after it, by position; reset seeds a reload\'s messages and inbox', () => {
  const { projector, adapter } = setup()
  const stored = [
    { id: 'msg_z', type: 'user', time: { created: 1 }, text: 'one' },
    { id: 'msg_a', type: 'assistant', agent: 'build', model: MODEL, time: { created: 2 }, content: [] },
  ]
  projector.load(toV1Messages(stored, { sessionID: SID }))
  adapter.reset(stored, [{ id: 'msg_q', sessionID: SID, time: { created: 3 }, type: 'user', payload: { text: 'queued' }, delivery: 'queue' }])
  // A step still running when the reload read it continues live.
  adapter.apply(ev('session.text.started', { assistantMessageID: 'msg_a', ordinal: 0 }, 4))
  adapter.apply(ev('session.text.ended', { assistantMessageID: 'msg_a', ordinal: 0, text: 'two' }, 5))
  adapter.apply(ev('session.inbox.delivered', { inboxID: 'msg_q' }, 6))
  assert.deepEqual(projector.messages.get('msg_q').parts.map((part) => part.text), ['queued'])
  assert.deepEqual([...projector.messages.keys()], ['msg_z', 'msg_a', 'msg_q'])
  adapter.apply(ev('session.revert.committed', { to: 'msg_a' }, 7))
  assert.deepEqual([...projector.messages.keys()], ['msg_z'])
  assert.deepEqual([...adapter.raw.keys()], ['msg_z'])
})

test('events replayed over a reload that already has their items (a resync) start nothing twice: one text, one reasoning, one tool per id', () => {
  const { projector, adapter } = setup()
  // What GET …/message read: the step had started its reasoning, text and tool (deltas are live-only: empty text).
  const stored = [{ id: 'msg_a', type: 'assistant', agent: 'build', model: MODEL, time: { created: 1 }, content: [
    { type: 'reasoning', text: '', time: { created: 2 } },
    { type: 'text', text: '' },
    { type: 'tool', id: 'call_1', name: 'shell', time: { created: 4 }, state: { status: 'streaming', input: '' } },
  ] }]
  projector.load(toV1Messages(stored, { sessionID: SID }))
  adapter.reset(stored)
  const replay = [
    ev('session.reasoning.started', { assistantMessageID: 'msg_a', ordinal: 0 }, 2),
    ev('session.reasoning.ended', { assistantMessageID: 'msg_a', ordinal: 0, text: 'think' }, 3),
    ev('session.text.started', { assistantMessageID: 'msg_a', ordinal: 0 }, 3),
    ev('session.text.delta', { assistantMessageID: 'msg_a', ordinal: 0, delta: 'Lo' }, 3),
    ev('session.tool.input.started', { assistantMessageID: 'msg_a', id: 'call_1', name: 'shell' }, 4),
    ev('session.tool.called', { assistantMessageID: 'msg_a', id: 'call_1', input: { command: 'ls' } }, 5),
    ev('session.tool.success', { assistantMessageID: 'msg_a', id: 'call_1', content: [{ type: 'text', text: 'a.txt' }] }, 6),
    ev('session.text.started', { assistantMessageID: 'msg_a', ordinal: 1 }, 7),
    ev('session.text.ended', { assistantMessageID: 'msg_a', ordinal: 1, text: 'Done.' }, 8),
  ]
  const changes = replay.flatMap((event) => adapter.apply(event))
  const parts = projector.messages.get('msg_a').parts
  assert.deepEqual(parts.map((part) => [part.id, part.type, part.text ?? part.state?.status]), [
    ['msg_a:reasoning:0', 'reasoning', 'think'], ['msg_a:text:0', 'text', 'Lo'], ['msg_a:tool:call_1', 'tool', 'completed'], ['msg_a:text:1', 'text', 'Done.'],
  ])
  assert.ok(changes.some((change) => change.partID === 'msg_a:tool:call_1'), 'the tool card still changes')
  // A new tool id in the same step is still a new tool.
  adapter.apply(ev('session.tool.input.started', { assistantMessageID: 'msg_a', id: 'call_2', name: 'read' }, 9))
  assert.deepEqual(projector.messages.get('msg_a').parts.filter((part) => part.type === 'tool').map((part) => part.id), ['msg_a:tool:call_1', 'msg_a:tool:call_2'])
})

test('the envelope\'s metadata lands on the messages it makes; compaction.ended merges its own over the started one\'s', () => {
  const { projector, adapter } = setup()
  adapter.apply({ ...ev('session.step.started', { assistantMessageID: 'msg_a1', agent: 'build', model: MODEL, started: 1 }, 1), metadata: { origin: 'app' } })
  assert.deepEqual(adapter.raw.get('msg_a1').metadata, { origin: 'app' })
  adapter.apply({ ...ev('session.compaction.started', { reason: 'auto', inputID: 'msg_c1' }, 2), metadata: { origin: 'auto' } })
  adapter.apply({ ...ev('session.compaction.ended', { reason: 'auto', text: 'Summary.' }, 3), metadata: { keep: 'msg_k' } })
  assert.deepEqual(adapter.raw.get('msg_c1').metadata, { origin: 'auto', keep: 'msg_k' })
  adapter.apply(ev('session.compaction.started', { reason: 'manual', inputID: 'msg_c2' }, 4))
  adapter.apply(ev('session.compaction.ended', { reason: 'manual', text: 'Again.' }, 5))
  assert.equal(adapter.raw.get('msg_c2').metadata, undefined, 'none on either: none')
  assert.equal(projector.messages.get('msg_c2').info.id, 'msg_c2')
})

test('a Codex input as v2\'s prompt body; the bridge\'s ids; the retry notice by error type', () => {
  const input = [{ type: 'text', text: 'look' }, { type: 'localImage', path: '/w/shot #1.png' }, { type: 'mention', path: '/w/src', name: 'src' }, { type: 'image', url: 'data:image/png;base64,AA==' }, { type: 'skill', name: 'pdf', path: '/Users/me/.agents/skills/pdf/SKILL.md' }]
  const prompt = promptInputV2(input)
  assert.deepEqual(promptBodyV2(prompt), {
    text: 'look',
    files: [{ uri: 'file:///w/shot%20%231.png', name: 'shot #1.png' }, { uri: 'file:///w/src', name: 'src' }, { uri: 'data:image/png;base64,AA==', name: 'image' }],
    skills: [{ id: 'pdf' }],
  })
  assert.equal(promptInputV2([{ type: 'text', text: '/review main' }, { type: 'skill', name: 'review', path: 'command:review' }]).command, 'review')
  assert.deepEqual(promptBodyV2(promptInputV2([{ type: 'text', text: 'x' }])), { text: 'x' })
  assert.throws(() => promptInputV2([]), /empty/)
  assert.throws(() => promptInputV2([{ type: 'image', url: 'https://example.com/a.png' }]), /data: URLs/)
  const ids = Array.from({ length: 50 }, () => newMessageId())
  for (const id of ids) assert.match(id, /^msg_[0-9a-f]{12}[0-9A-Za-z]{14}$/)
  assert.deepEqual([...ids].sort(), ids, 'ascending, like v2\'s own')
  const sessions = Array.from({ length: 5 }, () => newSessionId())
  for (const id of sessions) assert.match(id, /^ses_[0-9a-f]{12}[0-9A-Za-z]{14}$/)
  assert.deepEqual([...sessions].sort().reverse(), sessions, 'descending, like v2\'s own')
  assert.equal(messageIdOfEvent('evt_abc'), 'msg_abc')
  const limit = retryNoticeV2({ attempt: 2, at: 99, error: { type: 'provider.quota', message: 'Quota used up' } }, { threadId: 't', turnId: 'u' })
  assert.deepEqual(limit, { error: { message: 'Quota used up', codexErrorInfo: 'usageLimitExceeded', additionalDetails: 'provider.quota', misalignment: null }, willRetry: true, threadId: 't', turnId: 'u', retry: { attempt: 2, maxRetries: 10 }, codeDesktop: { nextAt: 99, action: null } })
  assert.equal(retryNoticeV2({ attempt: 1, at: 1, error: { type: 'provider.rate-limit', message: 'x' } }, {}).error.codexErrorInfo, 'rateLimitExceeded')
  assert.equal(retryNoticeV2({ attempt: 1, at: 1, error: { type: 'provider.internal', message: 'x', status: 500 } }, {}).error.codexErrorInfo, 'other')
})
