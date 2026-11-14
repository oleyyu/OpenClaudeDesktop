import test from 'node:test'
import assert from 'node:assert/strict'
import { ThreadQueue, toQueuedSubmission, reorderedMessages } from '../packages/codex-app-server/src/queue.js'

const text = (value) => ({ type: 'text', text: value, text_elements: [] })
const tick = () => new Promise((resolve) => setImmediate(resolve))

// Array-backed stand-in for a Harness agent: followup queues while running and
// is claimed at once when idle; splice/remove/replace follow ReactLoopInbox.
function fakeAgent(status = 'running') {
  const calls = []
  const started = []
  const inbox = {
    nextTurn: [],
    nextStep: [],
    remove(id) {
      const index = inbox.nextTurn.findIndex((message) => message.id === id)
      if (index < 0) return false
      inbox.nextTurn.splice(index, 1)
      return true
    },
    replace(id, message) {
      const index = inbox.nextTurn.findIndex((candidate) => candidate.id === id)
      if (index < 0) return false
      inbox.nextTurn.splice(index, 1, message)
      return true
    },
    splice(target, start, deleteCount, inserted) {
      calls.push(['splice', target, start, deleteCount, inserted.map((message) => message.id)])
      const list = target === 'next-turn' ? inbox.nextTurn : inbox.nextStep
      return list.splice(start, deleteCount, ...inserted)
    },
  }
  const agent = {
    status,
    inbox,
    calls,
    started,
    followup(message) {
      calls.push(['followup', message.id])
      if (agent.status === 'idle') {
        agent.status = 'running'
        started.push(message.id)
      } else inbox.nextTurn.push(message)
    },
    steer(message) {
      calls.push(['steer', message.id])
      inbox.nextStep.push(message)
    },
    cancel(cause, options) {
      calls.push(['cancel', cause, options])
      if (!options?.keepInbox) { inbox.nextTurn.length = 0; inbox.nextStep.length = 0 }
      agent.status = 'idle'
    },
    whenIdle: () => Promise.resolve(),
  }
  return agent
}

function setup(status) {
  const agent = fakeAgent(status)
  const notes = []
  let next = 0
  const inputMessage = (input) => {
    if (!Array.isArray(input) || input.length === 0) throw Object.assign(new Error('input must be a non-empty array'), { code: -32602 })
    return {
      id: `m${++next}`,
      role: 'user',
      content: input.map((part) => ({ type: 'text', text: part.type === 'localImage' ? `[Attached image: ${part.path} — use read_image to view it]` : part.text })),
      source: { kind: 'user' },
    }
  }
  const queue = new ThreadQueue({ agent, threadId: 't', notify: (method, params) => notes.push({ method, params }), inputMessage })
  return { agent, queue, notes }
}

test('add while running queues the next turn; list returns the original input and client id', async () => {
  const { agent, queue, notes } = setup('running')
  const input = [text('later please'), { type: 'localImage', path: '/tmp/a.png' }]
  const added = await queue.add({ threadId: 't', input, clientUserMessageId: 'c1' })
  assert.deepEqual(added, { queuedSubmission: { id: 'm1', input, clientUserMessageId: 'c1' } })
  assert.deepEqual(agent.inbox.nextTurn.map((message) => message.id), ['m1'])
  assert.deepEqual(queue.list(), { data: [{ id: 'm1', input, clientUserMessageId: 'c1' }], nextCursor: null })
  await tick()
  assert.deepEqual(notes, [{ method: 'thread/queue/changed', params: { threadId: 't' } }])
  // Several inbox events in one tick (a reorder splice fires one per message) are one notification.
  notes.length = 0
  queue.changed(); queue.changed(); queue.changed()
  await tick()
  assert.equal(notes.length, 1)
})

test('add while idle starts the turn at once', async () => {
  const { agent, queue } = setup('idle')
  await queue.add({ input: [text('go')], clientUserMessageId: 'c1' })
  assert.deepEqual(agent.started, ['m1'])
  assert.deepEqual(queue.list().data, [])
})

test('delete, update and reorder mutate the inbox', async () => {
  const { agent, queue } = setup('running')
  for (const [index, value] of ['one', 'two', 'three'].entries()) await queue.add({ input: [text(value)], clientUserMessageId: `c${index + 1}` })

  assert.deepEqual(queue.delete('m2'), {})
  assert.deepEqual(agent.inbox.nextTurn.map((message) => message.id), ['m1', 'm3'])
  assert.throws(() => queue.delete('m2'), (error) => error.code === -32602 && /already started/.test(error.message))

  const updated = await queue.update('m1', [text('ONE')])
  assert.equal(updated.queuedSubmission.id, 'm4')
  assert.equal(updated.queuedSubmission.clientUserMessageId, 'c1')
  assert.deepEqual(agent.inbox.nextTurn.map((message) => message.id), ['m4', 'm3'])
  assert.deepEqual(queue.list().data[0].input, [text('ONE')])
  await assert.rejects(queue.update('gone', [text('x')]), (error) => error.code === -32602)

  assert.deepEqual(queue.reorder(['m3', 'm4']), {})
  assert.deepEqual(agent.inbox.nextTurn.map((message) => message.id), ['m3', 'm4'])
  assert.deepEqual(agent.calls.filter((call) => call[0] === 'splice').at(-1), ['splice', 'next-turn', 0, 2, ['m3', 'm4']])
  for (const ids of [['m3'], ['m3', 'm3'], ['m3', 'nope'], 'm3,m4'])
    assert.throws(() => queue.reorder(ids), (error) => error.code === -32602, JSON.stringify(ids))
  const splices = agent.calls.filter((call) => call[0] === 'splice').length
  queue.reorder(['m3', 'm4'])
  assert.equal(agent.calls.filter((call) => call[0] === 'splice').length, splices, 'an unchanged order writes no splice')
})

test('without a remembered entry the input comes from the message; claimed entries are forgotten', async () => {
  const { agent, queue, notes } = setup('running')
  agent.inbox.nextTurn.push({ id: 'old', content: [{ type: 'text', text: 'from before a restart' }], source: { kind: 'user' } })
  assert.deepEqual(queue.list().data, [{ id: 'old', input: [text('from before a restart')], clientUserMessageId: null }])
  await queue.add({ input: [text('x')], clientUserMessageId: 'c1' })
  await tick()
  notes.length = 0
  const [claimed] = agent.inbox.nextTurn.splice(1, 1)
  queue.claimed(claimed)
  assert.equal(queue.remembered.has('m1'), false)
  await tick()
  assert.deepEqual(notes.map((note) => note.method), ['thread/queue/changed'])
})

test('after a restart a queued image and mention come back as their Codex parts', () => {
  const ref = { attachmentId: 'q1', mediaType: 'image/png', bytes: 1, width: 1, height: 1 }
  const message = { id: 'old', content: [{ type: 'text', text: 'look' }, { type: 'image', attachment: ref }, { type: 'text', text: '[Referenced: /w/a.js]' }], source: { kind: 'user' } }
  assert.deepEqual(toQueuedSubmission(message, undefined, () => '/dsh/attachments/q1').input, [text('look'), { type: 'localImage', path: '/dsh/attachments/q1' }, { type: 'mention', name: 'a.js', path: '/w/a.js' }])
  const agent = fakeAgent('running')
  agent.inbox.nextTurn.push(message)
  const queue = new ThreadQueue({ agent, threadId: 't', notify: () => {}, inputMessage: () => undefined, imagePath: () => '/dsh/attachments/q1' })
  assert.deepEqual(queue.list().data[0].input[1], { type: 'localImage', path: '/dsh/attachments/q1' })
})

test('interrupt keeps queued turns, drops steering and runs the queue once idle', async () => {
  const { agent, queue } = setup('running')
  await queue.add({ input: [text('first')], clientUserMessageId: 'c1' })
  await queue.add({ input: [text('second')], clientUserMessageId: 'c2' })
  agent.steer({ id: 's1', content: [{ type: 'text', text: 'steer' }] })
  assert.equal(queue.interrupt(), true)
  assert.deepEqual(agent.calls.find((call) => call[0] === 'cancel'), ['cancel', { kind: 'user' }, { keepInbox: true }])
  assert.deepEqual(agent.inbox.nextStep, [])
  await tick()
  // Re-submitted in order: the first starts, the second stays queued.
  assert.deepEqual(agent.started, ['m1'])
  assert.deepEqual(agent.inbox.nextTurn.map((message) => message.id), ['m2'])
  assert.deepEqual(queue.list().data.map((entry) => entry.clientUserMessageId), ['c2'])
})

test('interrupt with nothing queued cancels plainly', async () => {
  const { agent, queue } = setup('running')
  assert.equal(queue.interrupt(), false)
  assert.deepEqual(agent.calls, [['cancel', { kind: 'user' }, { keepInbox: false }]])
  await tick()
  assert.deepEqual(agent.started, [])
})

test('start steers a queued message into a running turn, wakes an idle one', async () => {
  const running = setup('running')
  await running.queue.add({ input: [text('a')], clientUserMessageId: 'c1' })
  await running.queue.add({ input: [text('b')], clientUserMessageId: 'c2' })
  running.queue.start('m2')
  assert.deepEqual(running.agent.inbox.nextTurn.map((message) => message.id), ['m1'])
  assert.deepEqual(running.agent.inbox.nextStep.map((message) => message.id), ['m2'])

  const idle = setup('running')
  await idle.queue.add({ input: [text('parked')], clientUserMessageId: 'c1' })
  idle.agent.status = 'idle'
  idle.queue.start()
  assert.deepEqual(idle.agent.started, ['m1'])
  assert.throws(() => idle.queue.start(), (error) => error.code === -32600 && /empty/.test(error.message))
})

test('pure helpers', () => {
  const message = { id: 'x', content: [{ type: 'text', text: 'hi' }] }
  assert.deepEqual(toQueuedSubmission(message), { id: 'x', input: [text('hi')], clientUserMessageId: null })
  assert.deepEqual(toQueuedSubmission(message, { input: [text('orig')], clientUserMessageId: 'c' }), { id: 'x', input: [text('orig')], clientUserMessageId: 'c' })
  const a = { id: 'a' }, b = { id: 'b' }
  assert.deepEqual(reorderedMessages([a, b], ['b', 'a']), [b, a])
  assert.throws(() => reorderedMessages([a, b], ['a']), (error) => error.code === -32602)
})
