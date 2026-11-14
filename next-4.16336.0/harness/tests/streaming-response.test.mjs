import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { AssistantUsageFold } from '../packages/codex-app-server/src/assistant-response.js'
import { LiveStreamMapper, ThreadProjector, projectHistory } from '../packages/codex-app-server/src/projection.js'
import { foldSessionBilling, foldSessionStats, foldSessionUsage } from '../packages/codex-app-server/src/usage.js'

const fixture = JSON.parse(fs.readFileSync(new URL('../../vendor/deepseek-harness/packages/sdk/client/tests/fixtures/streaming-response.json', import.meta.url), 'utf8'))
const response = () => structuredClone(fixture)
const shift = (events, offset) => events.map(event => ({ ...event, seq: event.seq + offset,
  data: event.type === 'assistant/stream-merge' ? { ...event.data, startSeq: event.data.startSeq + offset,
    attemptSeq: event.data.attemptSeq + offset, messageSeqs: event.data.messageSeqs.map(seq => seq + offset) } : event.data,
}))

for (const interrupted of [false, true]) test(`streamed response preserves block indexes, feedback identity and live text after ${interrupted ? 'failure' : 'success'}`, () => {
  const events = response()
  // Tool blocks can separate visible text blocks; segments must not renumber them.
  for (const event of events) for (const entry of event.data.stream ?? []) {
    if ('index' in entry.chunk) entry.chunk.index = entry.chunk.index === 0 ? 1 : 4
    if (interrupted && entry.chunk.type === 'finish') entry.chunk.reason = { kind: 'error', failure: { code: 'TRANSPORT', message: 'EOF' } }
  }
  if (interrupted) events.at(-1).data.reason = { kind: 'error', error: { code: 'TRANSPORT', message: 'EOF' } }
  const projector = new ThreadProjector({ threadId: 'streamed' })
  const mapper = new LiveStreamMapper({ threadId: 'streamed', projector })
  const visible = new Map()
  const apply = (notes) => {
    for (const note of notes) if (note.method === 'item/started' || note.method === 'item/completed') visible.set(note.params.item.id, note.params.item)
  }
  for (const event of events) {
    if (event.type === 'assistant/stream-start') apply(mapper.frame({ type: 'start', attemptId: 'live', turn: 1, step: 1 }))
    if (event.type === 'assistant/message') for (const { chunk } of event.data.stream) {
      apply(mapper.frame({ type: 'chunk', attemptId: 'live', chunk: { type: 'text-delta', index: chunk.index, text: chunk.block.text } }))
      apply(mapper.frame({ type: 'chunk', attemptId: 'live', chunk }))
    }
    apply(projector.apply(event))
    if (event.type === 'assistant/stream-merge') {
      const notes = mapper.frame({ type: 'end', attemptId: 'live', outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: event.data.attemptSeq } })
      assert.deepEqual(notes, [], 'the durably merged attempt must not clear its text')
    }
  }
  assert.deepEqual([...visible.values()].map(({ id, text }) => [id, text]), [['msg-1.1.1', 'before '], ['msg-1.1.4', 'after']])
  assert.equal(projector.assistantMessageIds.get('1.1'), 'segment-0')
  assert.deepEqual(projector.lastUsage, { inputTokens: 10, outputTokens: 4 })
  const replay = projectHistory(events, { threadId: 'streamed' })
  assert.deepEqual(replay.turns, projector.turns)
  assert.deepEqual(replay.turns[0].items, [...visible.values()])
  assert.equal(replay.turns[0].status, interrupted ? 'failed' : 'completed')
})

test('an unrelated or unmerged committed attempt still clears transient text', () => {
  for (const merged of [false, true]) {
    const projector = projectHistory(response().slice(0, merged ? 7 : 6), { threadId: 'attempt' })
    const mapper = new LiveStreamMapper({ threadId: 'attempt', projector })
    mapper.frame({ type: 'start', attemptId: 'live', turn: 1, step: 1 })
    mapper.frame({ type: 'chunk', attemptId: 'live', chunk: { type: 'text-delta', index: 99, text: 'transient' } })
    const notes = mapper.frame({ type: 'end', attemptId: 'live', outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: merged ? 99 : 5 } })
    assert.equal(notes[0].params.item.text, '')
  }
})

test('abandoned settlement retains a saved checkpoint and clears unsaved text', () => {
  const projector = projectHistory(response().slice(0, 4), { threadId: 'prefix' })
  const mapper = new LiveStreamMapper({ threadId: 'prefix', projector })
  mapper.frame({ type: 'start', attemptId: 'live', turn: 1, step: 1 })
  for (const index of [0, 1]) mapper.frame({ type: 'chunk', attemptId: 'live', chunk: { type: 'text-delta', index, text: 'live' } })
  const notes = mapper.frame({ type: 'end', attemptId: 'live', outcome: { kind: 'abandoned' } })
  assert.deepEqual(notes.map(note => note.params.item.text), ['before ', ''])
})

test('segmented response statistics and billing equal a single buffered response', () => {
  const streamed = response()
  const attempt = streamed[5]
  const buffered = [streamed[0], {
    type: 'assistant/message', seq: 3, time: streamed[3].time,
    data: { turn: 1, step: 1, usage: attempt.data.stream[2].chunk.usage,
      message: { id: 'whole', source: { model: 'mock' }, content: [{ type: 'text', text: 'before after' }] } },
  }, streamed.at(-1)]
  for (const fold of [foldSessionUsage, foldSessionStats, foldSessionBilling]) assert.deepEqual(fold(streamed), fold(buffered))
  const live = new AssistantUsageFold()
  const usage = streamed.flatMap(event => {
    const result = live.push(event)
    assert.equal(live.push(event), undefined, 'repeated delivery must not charge twice')
    return result?.usage ? [result.usage] : []
  })
  assert.deepEqual(usage, [{ inputTokens: 10, outputTokens: 4 }])
})

test('repeated requests in one step are billed separately and inherited usage is excluded', () => {
  const first = response().slice(0, 7)
  const second = shift(response().slice(2, 7), 5)
  const both = [...first, ...second]
  assert.equal(Object.values(foldSessionUsage(both).days)[0], 28)
  assert.equal(Object.values(foldSessionStats(both).days)[0].messages, 2)
  const own = [...first, { type: 'session/end-seed', seq: 7, time: first.at(-1).time, data: { inherited: true } },
    ...shift(second, 1)]
  assert.deepEqual(foldSessionUsage(own), foldSessionUsage(first))
  assert.deepEqual(foldSessionStats(own), foldSessionStats(first))
  assert.deepEqual(foldSessionBilling(own), foldSessionBilling(first))
})

test('usage-only failed streams are billed without creating an assistant message', () => {
  const events = response().filter(event => event.type !== 'assistant/message')
  events[3].data.stream = [{ type: 'chunk', time: events[3].time, chunk: { type: 'usage', usage: { inputTokens: 8, outputTokens: 0 } } }]
  events[4].data.messageSeqs = []
  const stats = foldSessionStats(events)
  assert.equal(Object.values(stats.days)[0].messages, 0)
  assert.equal(Object.values(stats.days)[0].models.mock, 8)
  assert.equal(Object.values(foldSessionUsage(events).days)[0], 8)
})

test('a failed merged response clears only unclosed live text and reasoning', () => {
  const events = JSON.parse(fs.readFileSync(new URL('../../vendor/deepseek-harness/packages/sdk/client/tests/fixtures/streaming-text-recovery.json', import.meta.url), 'utf8'))
  const projector = new ThreadProjector({ threadId: 'text-recovery' })
  const mapper = new LiveStreamMapper({ threadId: 'text-recovery', projector })
  for (const event of events.slice(0, 3)) projector.apply(event)
  mapper.frame({ type: 'start', attemptId: 'live', turn: 1, step: 1 })
  for (const [index, type] of [[0, 'text-delta'], [1, 'text-delta'], [2, 'reasoning-delta']]) {
    mapper.frame({ type: 'chunk', attemptId: 'live', chunk: { type, index, text: 'transient' } })
  }
  for (const event of events.slice(3, 6)) projector.apply(event)
  const notes = mapper.frame({ type: 'end', attemptId: 'live', outcome: { kind: 'committed', eventType: 'assistant/attempt', seq: 4 } })
  assert.deepEqual(notes.map(note => note.params.item.id), ['msg-1.1.1', 'msg-1.1.2'])
  assert.equal(notes[0].params.item.text, '')
  assert.equal(notes[1].params.item.reasoningText, '')
  assert.equal(projector.turns[0].items[0].text, 'kept text')
  assert.deepEqual(projector.turns, projectHistory(events.slice(0, 6), { threadId: 'text-recovery' }).turns)
})
