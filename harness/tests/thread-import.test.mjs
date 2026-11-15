// codeDesktop/thread/import (packages/codex-app-server/src/thread-import.js): the seed an imported conversation becomes
// passes dsh-session's own seed validation (Session.create, as ctx.agents.create builds it) and its relational
// invariant checker (dsh-session/invariant), and reads back as the Codex turns thread/read answers (ThreadProjector, as
// the bridge's LiveThread hydrates). No core, no spawn, no listen.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Session } from '@deepseek-ai/dsh-session'
import { apply as applyInvariant } from '@deepseek-ai/dsh-session/invariant'
import { IMPORT_OPENING, importMessages, importSeed, importedFromOf, importedToolItem } from '../packages/codex-app-server/src/thread-import.js'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'
import { forkBoundary } from '../packages/codex-app-server/src/fork.js'

const ROUTE = { provider: 'deepseek-official', model: 'deepseek-flash', now: 1_800_000_000_000 }

/** dsh-session's invariant install, captured from its companion registration, run over one session's log. */
async function invariantFailures(session) {
  let install
  await applyInvariant({ invariants: { register: (_name, fn) => { install = fn; return () => {} } } })
  const failures = []
  install({ sessions: { list: () => [session] }, on: () => {} }, (message) => { failures.push(message) })
  return failures
}

/** The session ctx.agents.create would build for the import (index.js createThread meta + seed). */
const seededSession = ({ seed, inheritedEventCount }, id = 'import-1') =>
  Session.create(id, seed, { version: 4, id, createdAt: ROUTE.now, cwd: '/w', isSeeded: true }, inheritedEventCount)

const CONVERSATION = [
  { role: 'user', text: 'Fix the failing test' },
  { role: 'assistant', text: 'Looking at it.' },
  { role: 'assistant', text: '[tool: shell] npm test\n(exit 1)' },
  { role: 'user', text: '  ' },
  { role: 'user', text: 'Try again' },
  { role: 'tool', text: 'dropped' },
  { role: 'assistant', text: 'Done: the assertion was off by one.' },
  { role: 'user', text: 'Thanks' },
]

test('messages become alternating turns: blanks and unknown roles dropped, one role in a row joined', () => {
  assert.deepEqual(importMessages(CONVERSATION).map((message) => [message.role, message.text]), [
    ['user', 'Fix the failing test'],
    ['assistant', 'Looking at it.\n\n[tool: shell] npm test\n(exit 1)'],
    ['user', 'Try again'],
    ['assistant', 'Done: the assertion was off by one.'],
    ['user', 'Thanks'],
  ])
  // A conversation that starts with a reply gets an opening prompt.
  assert.deepEqual(importMessages([{ role: 'assistant', text: 'Hi' }]).map((message) => message.text), [IMPORT_OPENING, 'Hi'])
  const reason = (value) => { try { importMessages(value); return null } catch (error) { return [error.code, error.message] } }
  assert.equal(reason(null)[0], -32602)
  assert.match(reason([{ role: 'user', text: ' ' }])[1], /no messages/)
  assert.match(reason(Array.from({ length: 5001 }, () => ({ role: 'user', text: 'x' })))[1], /at most/)
})

test('the seed passes Session seed validation and the session invariant checker', async () => {
  const built = importSeed(importMessages(CONVERSATION), ROUTE)
  assert.equal(built.seed.at(-1).type, 'session/end-seed')
  assert.deepEqual(built.seed.at(-1).data, { inherited: true })
  assert.equal(built.inheritedEventCount, built.seed.length - 1)
  built.seed.forEach((event, index) => assert.equal(event.seq, index))
  assert.equal(built.seed.some((event) => event.type === 'tool/call' || event.type === 'tool/result'), false)
  const session = seededSession(built)
  // The constructor kept the marked seed as is (no extra end-seed appended) and counts the inherited prefix.
  assert.equal(session.snapshotEvents().length, built.seed.length)
  assert.equal(session.inheritedEventCount, built.inheritedEventCount)
  assert.deepEqual(await invariantFailures(session), [])
  // The model's view: an empty system node first, then the conversation in order.
  const surface = session.surface.nodes.map((seq) => session.eventAt(seq).type)
  assert.deepEqual(surface, ['system/message', 'user/message', 'assistant/message', 'user/message', 'assistant/message', 'user/message'])
  for (const event of session.snapshotEvents().filter((entry) => entry.type === 'assistant/message'))
    assert.deepEqual([event.data.message.source.kind, event.data.message.source.provider, event.data.message.source.model], ['model', ROUTE.provider, ROUTE.model])
})

test('the checker this test drives does catch a broken seed (negative control)', async () => {
  const { seed, inheritedEventCount } = importSeed(importMessages(CONVERSATION), ROUTE)
  // A second turn/start while turn 1 is open.
  const broken = seed.map((event) => (event.type === 'turn/end' && event.data.turn === 1 ? { ...event, type: 'step/start', data: { turn: 1, step: 2 } } : event))
  const failures = await invariantFailures(seededSession({ seed: broken, inheritedEventCount }, 'import-broken'))
  assert.ok(failures.some((message) => /turn\/start 2 while turn 1 is still open/.test(message)), failures.join('\n'))
})

test('thread/read shows the imported turns: prompts and replies, completed, with the Codex turn ids', () => {
  const { seed } = importSeed(importMessages(CONVERSATION), ROUTE)
  const projector = new ThreadProjector({ threadId: 'import-1', cwd: '/w' })
  for (const event of seed) projector.apply(event)
  const turns = projector.turns.map((turn) => projector.snapshot(turn))
  assert.equal(turns.length, 3)
  assert.deepEqual(turns.map((turn) => turn.status), ['completed', 'completed', 'completed'])
  assert.deepEqual(turns.map((turn) => turn.items.map((item) => [item.type, item.type === 'userMessage' ? item.content?.[0]?.text : item.text])), [
    [['userMessage', 'Fix the failing test'], ['agentMessage', 'Looking at it.\n\n[tool: shell] npm test\n(exit 1)']],
    [['userMessage', 'Try again'], ['agentMessage', 'Done: the assertion was off by one.']],
    [['userMessage', 'Thanks']],
  ])
  const userIds = seed.filter((event) => event.type === 'user/message').map((event) => `turn-${event.data.id}`)
  assert.deepEqual(turns.map((turn) => turn.id), userIds)
  // The preview is the first prompt; no turn is left running, so the thread can be forked at its last turn.
  assert.equal(projector.activeTurn ?? null, null)
  assert.equal(forkBoundary({ turns: projector.turns, events: seed }), seed.length - 1)
})

test('event times follow the source clock but never go backwards or pass now', () => {
  const { seed } = importSeed(importMessages([
    { role: 'user', text: 'a', ts: ROUTE.now - 5000 },
    { role: 'assistant', text: 'b', ts: ROUTE.now - 9000 },
    { role: 'user', text: 'c', ts: ROUTE.now + 60000 },
  ]), ROUTE)
  const times = seed.map((event) => event.time)
  assert.deepEqual([...times].sort((a, b) => a - b), times)
  assert.equal(times[0], ROUTE.now - 5000)
  assert.equal(Math.max(...times), ROUTE.now)
})

test('importedFrom keeps only short provenance strings and an import time', () => {
  assert.equal(importedFromOf(null), null)
  assert.equal(importedFromOf({ title: 'no source' }), null)
  assert.deepEqual(importedFromOf({ source: 'codex', sourceId: 'abc', title: ' T ', items: [1], strategy: 'x', importedAt: -1 }, 42),
    { source: 'codex', sourceId: 'abc', title: 'T', importedAt: 42 })
  assert.equal(importedFromOf({ source: 'x'.repeat(5000) }).source.length, 1000)
})

test('an imported tool call is its own content block and a collapsed tool row, not prose', () => {
  const tool = '[Tool: shell]\nnpm test\n[Result (exit 1)]\n1 failing\n\nAssertionError'
  const messages = importMessages([
    { role: 'user', text: 'Fix it' },
    { role: 'assistant', text: `Looking.\n\n${tool}\n\nFixed.`, parts: [{ text: 'Looking.' }, { text: tool, tool: true }, { text: 'Fixed.' }] },
    { role: 'user', text: 'More' },
    { role: 'assistant', text: 'a\n\nb' },
  ])
  assert.deepEqual(messages[1].parts.map((part) => part.text), ['Looking.', tool, 'Fixed.'])
  assert.equal(importMessages([{ role: 'user', text: 'q' }, { role: 'assistant', text: 'x \n\n\n[Tool: a]\n\n[Result]', parts: [{ text: 'x \n' }, { text: '[Tool: a]\n\n[Result]\n', tool: true }] }])[1].text, 'x\n\n[Tool: a]\n\n[Result]', 'the text is the parts joined')
  assert.equal(importedToolItem('x', '[Tool: a]\n\n[Result]').tool, 'a')
  const { seed } = importSeed(messages, ROUTE)
  const replies = seed.filter((event) => event.type === 'assistant/message')
  assert.deepEqual(replies[0].data.message.content.map((block) => block.text), ['Looking.', tool, 'Fixed.'], 'the model reads the same text')
  const projector = new ThreadProjector({ threadId: 'import-2', cwd: '/w' })
  for (const event of seed) projector.apply(event)
  const items = projector.snapshot(projector.turns[0]).items
  assert.deepEqual(items.map((item) => item.type), ['userMessage', 'agentMessage', 'dynamicToolCall', 'agentMessage'])
  assert.deepEqual([items[2].tool, items[2].arguments, items[2].status, items[2].success, items[2].contentItems[0].text],
    ['shell', { input: 'npm test' }, 'failed', false, '1 failing\n\nAssertionError'])
  assert.equal(importedToolItem('x', 'Prose that mentions [Tool: shell]\nls\n[Result]\nok'), null)
  assert.equal(importedToolItem('x', '[Tool: Read]\n/a\n[Result]\nok').status, 'completed')
  // A reply that came without parts is one block: several calls in it stay prose, not one row swallowing the rest.
  assert.equal(importedToolItem('x', '[Tool: Bash]\nnpm test\n[Result]\nok\n\n[Tool: Read]\n/a\n[Result]\nbody\n\nRefactored.'), null)
  assert.equal(importedToolItem('x', '[Tool: Bash]\necho hi\n[Result]\n[Tool: x] is mentioned, not opened').tool, 'Bash')
})

test('with the blocks\' calls the seeded reply shows the rows a native call shows; the model reads the same text; the seed stays valid', async () => {
  const shell = '[Tool: Bash]\nnpm test\n[Result (exit 1)]\n1 failing'
  const edit = '[Tool: Edit]\nupdate /w/a.js\n[Result]\nok'
  const fetch = '[Tool: WebFetch]\nhttps://e.com\n[Result (error)]\nHTTP 404'
  const diff = '@@ -1,1 +1,1 @@\n-a\n+b\n'
  const parts = [{ text: 'Looking.' },
    { text: shell, tool: true, call: { type: 'commandExecution', command: 'npm test', cwd: '/w' } },
    { text: edit, tool: true, call: { type: 'fileChange', changes: [{ path: '/w/a.js', kind: { type: 'update', move_path: null }, diff }] } },
    { text: fetch, tool: true, call: { type: 'webSearch', query: 'https://e.com', action: { type: 'openPage', url: 'https://e.com' }, junk: 1 } },
    { text: 'Fixed.', call: { type: 'commandExecution', command: 'ignored on prose' } }]
  const messages = importMessages([{ role: 'user', text: 'Fix it' }, { role: 'assistant', text: parts.map((part) => part.text).join('\n\n'), parts }])
  const built = importSeed(messages, ROUTE)
  const [reply] = built.seed.filter((event) => event.type === 'assistant/message')
  assert.deepEqual(reply.data.message.content.map((block) => block.text), ['Looking.', shell, edit, fetch, 'Fixed.'], 'the model reads the same text')
  assert.deepEqual(reply.data.importedCalls, [null, { type: 'commandExecution', command: 'npm test', cwd: '/w' },
    { type: 'fileChange', changes: [{ path: '/w/a.js', kind: { type: 'update', move_path: null }, diff }] }, { type: 'webSearch', query: 'https://e.com', action: { type: 'openPage', url: 'https://e.com' } }, null])
  assert.ok(!JSON.stringify(reply.data.message).includes('importedCalls'), 'never in the message the model is handed')
  const session = seededSession(built, 'import-calls')
  assert.deepEqual(await invariantFailures(session), [])
  const projector = new ThreadProjector({ threadId: 'import-calls', cwd: '/w' })
  for (const event of session.snapshotEvents()) projector.apply(event)
  const items = projector.snapshot(projector.turns[0]).items
  assert.deepEqual(items.map((item) => item.type), ['userMessage', 'agentMessage', 'commandExecution', 'fileChange', 'webSearch', 'agentMessage'])
  const [, , ran, change, web] = items
  assert.deepEqual([ran.command, ran.cwd, ran.exitCode, ran.status, ran.aggregatedOutput], ['npm test', '/w', 1, 'failed', '1 failing'])
  assert.deepEqual([change.changes[0].diff, change.status], [diff, 'completed'])
  assert.deepEqual([web.action, web.results, web.error, web.status], [{ type: 'openPage', url: 'https://e.com' }, null, { message: 'HTTP 404' }, 'failed'])
  // A seed written before calls rode on the event shows the rows from their text, as it did.
  const old = built.seed.map((event) => (event.type === 'assistant/message' ? { ...event, data: { ...event.data, importedCalls: undefined } } : event))
  const before = new ThreadProjector({ threadId: 'import-old', cwd: '/w' })
  for (const event of old) before.apply(event)
  assert.deepEqual(before.snapshot(before.turns[0]).items.map((item) => item.type), ['userMessage', 'agentMessage', 'dynamicToolCall', 'dynamicToolCall', 'dynamicToolCall', 'agentMessage'])
})
