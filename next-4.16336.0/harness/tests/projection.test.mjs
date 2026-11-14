import test from 'node:test'
import assert from 'node:assert/strict'
import { ThreadProjector, LiveStreamMapper, isActivity, toolItem, completeToolItem, assistantItemId, projectHistory, settledMessage, settledStatus, codexErrorInfoOf, failureError, resumeReplayNotes } from '../packages/codex-app-server/src/projection.js'
import { unifiedDiff } from '../packages/codex-app-server/src/diff.js'

let seq = 0
const ev = (type, data) => ({ type, data, seq: ++seq, time: 1_000_000 + seq })

test('a turn takes its id from the first human message and streams ids match history', () => {
  const p = new ThreadProjector({ threadId: 't1', cwd: '/w' })
  const notes = [
    ...p.apply(ev('turn/start', { turn: 1 })),
    ...p.apply(ev('user/message', { id: 'u1', role: 'user', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } })),
    ...p.apply(ev('assistant/message', { turn: 1, step: 1, message: { id: 'a1', content: [{ type: 'reasoning', text: 'think' }, { type: 'text', text: 'hello' }] } })),
    ...p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } })),
  ]
  assert.deepEqual(notes.map((n) => n.method), ['turn/started', 'item/started', 'item/completed', 'item/completed', 'item/completed', 'turn/completed'])
  const turn = p.turns[0]
  assert.equal(turn.id, 'turn-u1')
  assert.deepEqual(turn.items.map((i) => [i.type, i.id]), [['userMessage', 'u1'], ['reasoning', assistantItemId(1, 1, 0)], ['agentMessage', assistantItemId(1, 1, 1)]])
  assert.equal(p.snapshot(turn).status, 'completed')
})

test('injected context messages do not become user items; held messages attach after turn/start', () => {
  const p = new ThreadProjector({ threadId: 't2' })
  p.apply(ev('user/message', { id: 'u0', content: [{ type: 'text', text: 'queued' }], source: { kind: 'user' } }))
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'ctx', content: [{ type: 'text', text: 'time' }], source: { kind: 'time-context' } }))
  assert.equal(p.turns[0].id, 'turn-u0')
  assert.deepEqual(p.turns[0].items.map((i) => i.id), ['u0'])
})

test('bash, write, edit, read and unknown tools map to the matching Codex items', () => {
  const bash = toolItem({ callId: 'c1', name: 'bash', args: { command: 'ls -la', description: 'list' }, cwd: '/w' })
  assert.equal(bash.type, 'commandExecution'); assert.equal(bash.command, 'ls -la'); assert.equal(bash.cwd, '/w')
  const done = completeToolItem(bash, { name: 'bash', args: {}, result: { content: [{ type: 'text', text: 'a\nb\n[exit code: 2]' }], isError: false }, durationMs: 5 })
  assert.equal(done.exitCode, 2); assert.equal(done.status, 'failed'); assert.equal(done.aggregatedOutput, 'a\nb')
  const write = toolItem({ callId: 'c2', name: 'write', args: { file_path: 'x.txt', content: 'hi\n' }, cwd: '/w' })
  assert.equal(write.type, 'fileChange'); assert.deepEqual(write.changes[0].kind, { type: 'add' }); assert.equal(write.changes[0].path, '/w/x.txt')
  const edit = toolItem({ callId: 'c3', name: 'edit', args: { file_path: '/w/y.txt', old_string: 'a', new_string: 'b' }, cwd: '/w' })
  assert.equal(edit.changes[0].diff, '@@ -1,1 +1,1 @@\n-a\n+b\n')
  const read = toolItem({ callId: 'c4', name: 'read', args: { file_path: 'z.md' }, cwd: '/w' })
  assert.equal(read.commandActions[0].type, 'read'); assert.equal(read.commandActions[0].path, '/w/z.md')
  const readDone = completeToolItem(read, { name: 'read', args: {}, result: { content: [{ type: 'text', text: '1: hello\n\n(End of file - total 1 lines)' }], isError: false }, durationMs: 1 })
  assert.equal(readDone.aggregatedOutput, '1: hello')
  const other = toolItem({ callId: 'c5', name: 'set_goal', args: { goal: 'x' } })
  assert.equal(other.type, 'dynamicToolCall'); assert.equal(other.tool, 'set_goal')
  assert.equal(toolItem({ callId: 'c6', name: 'mcp__github__search', args: {} }).type, 'mcpToolCall')
})

test('todo_write drives turn/plan/updated and an interrupted turn settles running tools', () => {
  const p = new ThreadProjector({ threadId: 't3' })
  p.apply(ev('turn/start', { turn: 4 }))
  p.apply(ev('user/message', { id: 'u4', content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
  const notes = p.apply(ev('tool/call', { turn: 4, step: 1, callId: 'k', name: 'todo_write', arguments: JSON.stringify({ todos: [{ content: 'a', status: 'in_progress' }, { content: 'b', status: 'pending' }] }) }))
  const plan = notes.find((n) => n.method === 'turn/plan/updated')
  assert.deepEqual(plan.params.plan, [{ step: 'a', status: 'inProgress' }, { step: 'b', status: 'pending' }])
  const end = p.apply(ev('turn/end', { turn: 4, reason: { kind: 'aborted', reason: { kind: 'user' } } }))
  assert.equal(end.at(-1).params.turn.status, 'interrupted')
  assert.equal(p.turns[0].items.find((i) => i.id === 'k').status, 'interrupted')
})

test('error turns carry a TurnError; replays are idempotent by seq', () => {
  const p = new ThreadProjector({ threadId: 't4' })
  const start = ev('turn/start', { turn: 1 })
  p.apply(start); p.apply(start)
  p.apply(ev('user/message', { id: 'u', content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } }))
  const notes = p.apply(ev('turn/end', { turn: 1, reason: { kind: 'error', error: { code: 'RATE_LIMIT', message: 'Too many requests' } } }))
  assert.equal(notes.at(-1).params.turn.status, 'failed')
  assert.equal(notes.at(-1).params.turn.error.message, 'Too many requests')
  assert.equal(p.turns.length, 1)
})

test('a max-tokens stop completes the turn with the output-limit TurnError (R08)', () => {
  const p = new ThreadProjector({ threadId: 't4m' })
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u', content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } }))
  p.apply(ev('assistant/message', { turn: 1, step: 1, message: { id: 'a', content: [{ type: 'text', text: 'cut off mid' }] } }))
  const notes = p.apply(ev('turn/end', { turn: 1, reason: { kind: 'max-tokens' } }))
  const turn = notes.at(-1).params.turn
  assert.equal(notes.at(-1).method, 'turn/completed')
  assert.equal(turn.status, 'completed')
  assert.deepEqual(turn.error, { message: 'Response exceeded the output limit', codexErrorInfo: null, additionalDetails: 'MAX_TOKENS', misalignment: null })
  // No ErrorNotification: the error rides on the completed turn only; history keeps it.
  assert.equal(notes.filter((n) => n.method === 'error').length, 0)
  assert.deepEqual(p.snapshot(p.turns[0]).error, turn.error)
  // A plain completion still has no error.
  const q = new ThreadProjector({ threadId: 't4c' })
  q.apply(ev('turn/start', { turn: 1 }))
  q.apply(ev('user/message', { id: 'u', content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } }))
  assert.equal(q.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } })).at(-1).params.turn.error, null)
})

test('unified diff keeps context and merges nearby hunks', () => {
  const a = 'a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n'
  assert.equal(unifiedDiff(a, a.replace('e\n', 'E\n')), '@@ -2,7 +2,7 @@\n b\n c\n d\n-e\n+E\n f\n g\n h\n')
  assert.equal(unifiedDiff(a, a), '')
})

const userTurn = (threadId, turn = 1, userId = 'u1') => {
  const p = new ThreadProjector({ threadId })
  p.apply(ev('turn/start', { turn }))
  p.apply(ev('user/message', { id: userId, content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
  return p
}

test('live stream closes a reasoning block at block-end, before the answer block starts', () => {
  const p = userTurn('ts')
  const mapper = new LiveStreamMapper({ threadId: 'ts', projector: p })
  const chunk = (value) => ({ type: 'chunk', attemptId: 'a', chunk: value })
  const notes = [
    { type: 'start', attemptId: 'a', turn: 1, step: 1 },
    chunk({ type: 'block-start', index: 0, blockType: 'reasoning' }),
    chunk({ type: 'reasoning-delta', index: 0, text: 'thi' }),
    chunk({ type: 'block-end', index: 0, block: { type: 'reasoning', text: 'think' } }),
    chunk({ type: 'block-start', index: 1, blockType: 'text' }),
    chunk({ type: 'text-delta', index: 1, text: 'hel' }),
    chunk({ type: 'block-start', index: 2, blockType: 'tool-call' }),
    chunk({ type: 'block-end', index: 2, block: { type: 'tool-call', id: 'k', name: 'bash', arguments: '{}' } }),
  ].flatMap((frame) => mapper.frame(frame, 5000))
  assert.deepEqual(notes.map((n) => [n.method, n.params.item?.id ?? n.params.itemId]), [
    ['item/started', 'msg-1.1.0'],
    ['item/reasoning/summaryTextDelta', 'msg-1.1.0'],
    ['item/completed', 'msg-1.1.0'],
    ['item/started', 'msg-1.1.1'],
    ['item/agentMessage/delta', 'msg-1.1.1'],
  ])
  const completed = notes[2].params
  assert.deepEqual(completed.item, { type: 'reasoning', id: assistantItemId(1, 1, 0), summary: ['think'], content: [] })
  assert.equal(completed.turnId, 'turn-u1'); assert.equal(completed.completedAtMs, 5000)
  // A text block-end completes the agentMessage with the assembled text.
  const text = mapper.frame(chunk({ type: 'block-end', index: 1, block: { type: 'text', text: 'hello' } }), 6000)
  assert.equal(text[0].params.item.type, 'agentMessage'); assert.equal(text[0].params.item.text, 'hello')
  // An attempt that does not commit clears what it showed, reasoning deltas included.
  const cleared = mapper.frame({ type: 'end', attemptId: 'a', outcome: { kind: 'abandoned' } }, 7000)
  assert.deepEqual(cleared.map((n) => n.params.item), [
    { type: 'reasoning', id: 'msg-1.1.0', summary: [], content: [], reasoningText: '' },
    { type: 'agentMessage', id: 'msg-1.1.1', text: '', phase: null, memoryCitation: null, delivery: null, questions: null },
  ])
  assert.equal(mapper.streams.size, 0)
})

test('live stream keeps retry reset, turn identity and turn-end bookkeeping', () => {
  const p = new ThreadProjector({ threadId: 'tr' })
  p.apply(ev('turn/start', { turn: 3 }))
  const mapper = new LiveStreamMapper({ threadId: 'tr', projector: p })
  mapper.frame({ type: 'start', attemptId: 'x', turn: 3, step: 2 }, 1)
  // No user message yet: the first block gives the turn its fallback identity.
  const first = mapper.frame({ type: 'chunk', attemptId: 'x', chunk: { type: 'text-delta', index: 0, text: 'a' } }, 2)
  assert.deepEqual(first.map((n) => n.method), ['turn/started', 'item/started', 'item/agentMessage/delta'])
  assert.equal(first[2].params.turnId, 'turn-n3')
  // A second attempt in the same step restarts the visible text.
  const retry = mapper.frame({ type: 'start', attemptId: 'y', turn: 3, step: 2 }, 3)
  assert.deepEqual(retry.map((n) => [n.method, n.params.item.id, n.params.item.text]), [['item/started', 'msg-3.2.0', '']])
  // A committed assistant/message keeps the items (the projector completes them).
  mapper.frame({ type: 'chunk', attemptId: 'y', chunk: { type: 'block-start', index: 0, blockType: 'text' } }, 4)
  assert.deepEqual(mapper.frame({ type: 'end', attemptId: 'y', outcome: { kind: 'committed', eventType: 'assistant/message', seq: 9 } }, 5), [])
  mapper.endTurn(3)
  assert.equal(mapper.streams.size, 0)
  assert.deepEqual(mapper.frame({ type: 'chunk', attemptId: 'x', chunk: { type: 'text-delta', index: 0, text: 'late' } }, 6), [])
})

test('stopped tools settle as interrupted with no error body', () => {
  for (const code of ['ABORTED', 'ABORTED_BEFORE_DISPATCH']) {
    const p = userTurn('ta')
    p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'b', name: 'bash', arguments: JSON.stringify({ command: 'sleep 9' }) }))
    const text = code === 'ABORTED' ? 'Error: tool call aborted' : 'Error: tool call aborted before dispatch'
    const notes = p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: 'b', content: [{ type: 'text', text }], isError: true }, error: { name: 'AbortError', code } }))
    const item = notes.at(-1).params.item
    assert.equal(item.status, 'interrupted'); assert.equal(item.aggregatedOutput, null); assert.equal(item.exitCode, null)
    assert.equal(typeof item.durationMs, 'number')
  }
  const abort = { content: [{ type: 'text', text: 'Error: tool call aborted' }], isError: true }
  const edit = completeToolItem(toolItem({ callId: 'e', name: 'edit', args: { file_path: '/w/a', old_string: 'a', new_string: 'b' } }), { name: 'edit', args: {}, result: abort, error: { name: 'AbortError', code: 'ABORTED' } })
  assert.equal(edit.status, 'interrupted'); assert.equal('error' in edit, false)
  // Logs without data.error still recognise the canonical abort text.
  const web = completeToolItem(toolItem({ callId: 'w', name: 'web_search', args: { queries: ['q'] } }), { name: 'web_search', args: {}, result: abort })
  assert.equal(web.status, 'interrupted'); assert.equal(web.results, null); assert.equal('error' in web, false)
  const mcp = completeToolItem(toolItem({ callId: 'm', name: 'mcp__gh__search', args: {} }), { name: 'mcp__gh__search', args: {}, result: abort, durationMs: 3 })
  assert.deepEqual([mcp.status, mcp.result, mcp.error, mcp.durationMs], ['interrupted', null, null, 3])
  const dynamic = completeToolItem(toolItem({ callId: 'd', name: 'set_goal', args: {} }), { name: 'set_goal', args: {}, result: abort, error: { name: 'AbortError', code: 'ABORTED_BEFORE_DISPATCH' } })
  assert.deepEqual([dynamic.status, dynamic.contentItems, dynamic.success], ['interrupted', [], null])
  // Any other error is still a failure.
  const failedBash = completeToolItem(toolItem({ callId: 'f', name: 'bash', args: { command: 'x' } }), { name: 'bash', args: {}, result: { content: [{ type: 'text', text: 'Error: boom' }], isError: true } })
  assert.equal(failedBash.status, 'failed')
})

test('a rejected approval makes the call Denied for commands and edits, failed otherwise', () => {
  const p = userTurn('tj')
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'k', name: 'bash', arguments: JSON.stringify({ command: 'rm -rf x' }) }))
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'e', name: 'edit', arguments: JSON.stringify({ file_path: '/w/a', old_string: 'a', new_string: 'b' }) }))
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'd', name: 'set_goal', arguments: '{}' }))
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'ok', name: 'bash', arguments: JSON.stringify({ command: 'ls' }) }))
  for (const [id, callId, outcome] of [['a1', 'k', 'rejected'], ['a2', 'e', 'rejected'], ['a3', 'd', 'rejected'], ['a4', 'ok', 'allowed-once']]) {
    p.apply(ev('approval/asked', { id, toolName: 'x', callId }))
    p.apply(ev('approval/decided', { id, outcome }))
  }
  const result = (callId, text, isError = true) => p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: callId, content: [{ type: 'text', text }], isError } })).at(-1).params.item
  const bash = result('k', 'Error: the user rejected tool "bash"')
  assert.deepEqual([bash.status, bash.aggregatedOutput, bash.exitCode], ['declined', null, null])
  const edit = result('e', 'Error: the user rejected tool "edit"')
  assert.equal(edit.status, 'declined'); assert.equal('error' in edit, false)
  const dynamic = result('d', 'Error: the user rejected tool "set_goal"')
  assert.equal(dynamic.status, 'failed'); assert.equal(dynamic.success, false)
  assert.equal(result('ok', 'a\n[exit code: 0]', false).status, 'completed')
})

test('the turn-end sweep settles running tools by how the turn ended', () => {
  for (const [reason, expected] of [[{ kind: 'aborted', reason: { kind: 'user' } }, 'interrupted'], [{ kind: 'error', error: { code: 'X' } }, 'failed']]) {
    const p = userTurn('tw')
    p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'r', name: 'bash', arguments: JSON.stringify({ command: 'sleep 9' }) }))
    p.apply(ev('tool/call', { turn: 1, step: 1, callId: 's', name: 'web_search', arguments: JSON.stringify({ queries: ['q'] }) }))
    p.apply(ev('turn/end', { turn: 1, reason }))
    assert.deepEqual(p.turns[0].items.filter((i) => i.type !== 'userMessage').map((i) => i.status), [expected, expected])
  }
})

test('read cards use the structured lines; envelopes and footers never reach the card', () => {
  const definition = {
    presentResult: () => ({ card: 'read', path: 'z.md', offset: 1, lines: [{ number: 1, text: 'hello' }, { number: 2, text: 'world' }], totalLines: 2, content: [{ type: 'text', text: '1: hello\n2: world\n\n(End of file - total 2 lines)' }] }),
  }
  const read = toolItem({ callId: 'r', name: 'read', args: { file_path: 'z.md' }, cwd: '/w' })
  const done = (text, def) => completeToolItem(read, { name: 'read', args: { file_path: 'z.md' }, definition: def, result: { content: [{ type: 'text', text }], isError: false }, durationMs: 1 }).aggregatedOutput
  assert.equal(done('ignored', definition), '1: hello\n2: world')
  const linesless = { presentResult: () => ({ card: 'read', content: [{ type: 'text', text: '7: x\n\n(Showing lines 7-7 of 9. Use offset=8 to continue.)' }] }) }
  assert.equal(done('ignored', linesless), '7: x')
  assert.equal(done('1: a\n2: b\n\n(Output capped. Showing lines 1-2. Use offset=3 to continue.)'), '1: a\n2: b')
  assert.equal(done('<path>/w/z.md</path>\n<type>file</type>\n<content>\n1: a\n\n(End of file - total 1 lines)\n</content>'), '1: a')
  assert.equal(done('(End of file - total 0 lines)'), '')
})

test('web_search is a web search item and glob a pattern search', () => {
  const presentCall = () => ({ card: 'generic', kind: 'search', title: 'a, b' })
  const web = toolItem({ callId: 'w', name: 'web_search', args: { queries: ['a', 'b'] }, definition: { presentCall } })
  assert.equal(web.type, 'webSearch'); assert.deepEqual(web.action.queries, ['a', 'b']); assert.equal(web.status, 'inProgress')
  const sources = [{ url: 'https://a.test', title: 'A', snippet: 'about a' }]
  const presentResult = (_args, result) => (result.isError ? undefined : { card: 'web', kind: 'search', title: 'a, b', sources, truncated: false })
  const ok = completeToolItem(web, { name: 'web_search', args: {}, definition: { presentResult }, result: { content: [{ type: 'text', text: 'Sources: …' }], isError: false } })
  assert.equal(ok.status, 'completed'); assert.deepEqual(ok.results, sources)
  const bad = completeToolItem(web, { name: 'web_search', args: {}, definition: { presentResult }, result: { content: [{ type: 'text', text: 'Error: quota' }], isError: true } })
  assert.equal(bad.status, 'failed'); assert.deepEqual(bad.error, { message: 'Error: quota' }); assert.equal(bad.results, null)
  const fetch = toolItem({ callId: 'f', name: 'web_fetch', args: { url: 'https://a.test' } })
  assert.deepEqual(fetch.action, { type: 'openPage', url: 'https://a.test' })
  assert.equal(completeToolItem(fetch, { name: 'web_fetch', args: {}, result: { content: [{ type: 'text', text: '# A' }], isError: false } }).results, '# A')
  const glob = toolItem({ callId: 'g', name: 'glob', args: { pattern: '**/*.md', path: 'docs' }, cwd: '/w', definition: { presentCall: () => ({ card: 'generic', kind: 'search', title: 'Glob **/*.md in docs' }) } })
  // The raw inputs ride along (arguments) so the row lists the call's real keys, not 'command:'.
  // tool (R06): glob reads 'found files' in a group summary, grep 'searched code'.
  assert.deepEqual(glob.commandActions[0], { type: 'search', command: 'Glob **/*.md in docs', query: '**/*.md', path: '/w/docs', tool: 'glob', arguments: { pattern: '**/*.md', path: 'docs' } })
  assert.deepEqual(toolItem({ callId: 'g3', name: 'grep', args: { pattern: 'x', glob: '*.js', output_mode: 'content' } }).commandActions[0].arguments, { pattern: 'x', glob: '*.js', output_mode: 'content' })
  assert.equal(toolItem({ callId: 'g2', name: 'grep', args: { pattern: 'TODO' } }).commandActions[0].query, 'TODO')
})

test('the last usage-bearing assistant message records its Codex turn', () => {
  const p = userTurn('tu', 1, 'u1')
  assert.equal(p.lastUsageTurnId, null)
  p.apply(ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'x' }] }, usage: { inputTokens: 5, outputTokens: 2 } }))
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  p.apply(ev('turn/start', { turn: 2 }))
  p.apply(ev('user/message', { id: 'u2', content: [{ type: 'text', text: 'again' }], source: { kind: 'user' } }))
  p.apply(ev('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'y' }] } }))
  assert.equal(p.lastUsageTurnId, 'turn-u1'); assert.deepEqual(p.lastUsage, { inputTokens: 5, outputTokens: 2 })
})

test('the installed Harness web and search presenters route to the matching items', async () => {
  const web = await import('@deepseek-ai/dsh-tool-web')
  const search = await import('@deepseek-ai/dsh-tool-fs-search')
  const args = { queries: ['dsh', 'codex'] }
  const item = toolItem({ callId: 'w', name: 'web_search', args, definition: { presentCall: web.presentSearchCall } })
  assert.equal(item.type, 'webSearch'); assert.deepEqual(item.action.queries, ['dsh', 'codex'])
  const value = { sources: [{ url: 'https://a.test', title: 'A', snippet: 's' }], truncated: false }
  const done = completeToolItem(item, {
    name: 'web_search', args, definition: { presentResult: web.presentSearchResult },
    result: { content: [{ type: 'text', text: web.formatSearchOutput(value) }], isError: false, meta: web.searchMetaFromValue(value) },
  })
  assert.equal(done.status, 'completed'); assert.deepEqual(done.results, value.sources)
  const fetch = toolItem({ callId: 'f', name: 'web_fetch', args: { url: 'https://a.test' }, definition: { presentCall: web.presentFetchCall } })
  assert.deepEqual([fetch.type, fetch.action.type], ['webSearch', 'openPage'])
  const glob = toolItem({ callId: 'g', name: 'glob', args: { pattern: '*.md' }, cwd: '/w', definition: { presentCall: search.presentGlobCall } })
  assert.deepEqual([glob.commandActions[0].type, glob.commandActions[0].query], ['search', '*.md'])
})

test('a manual compaction between turns is its own synthetic turn, live and on replay', () => {
  const events = [
    ev('turn/start', { turn: 1 }),
    ev('user/message', { id: 'u1', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } }),
    ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ev('command/run', { commandId: 'cmd-1', name: 'compact', args: '', source: { kind: 'user' } }),
    ev('compaction/start', { compactionId: 'k1', sourceCommandId: 'cmd-1', turn: null }),
    ev('compaction/summary', { compactionId: 'k1', summary: [{ type: 'text', text: 'sum' }], shadowedSeqs: [2, 3], shadowedTokenCount: 1234 }),
    ev('user/message', { id: 'ck', content: [{ type: 'text', text: 'checkpoint' }], source: { kind: 'compact-checkpoint' } }),
    ev('compaction/end', { compactionId: 'k1', sourceCommandId: 'cmd-1', turn: null }),
    ev('command/done', { commandId: 'cmd-1', kind: 'success' }),
  ]
  const p = new ThreadProjector({ threadId: 'tc' })
  for (const event of events.slice(0, 3)) p.apply(event)
  const notes = events.slice(3).flatMap((event) => p.apply(event))
  assert.deepEqual(notes.map((n) => n.method), ['turn/started', 'item/started', 'item/completed', 'turn/completed'])
  assert.ok(notes.every((n) => (n.params.turn?.id ?? n.params.turnId) === 'turn-ck1'))
  assert.deepEqual(notes[1].params.item, { type: 'contextCompaction', id: 'compaction-k1' })
  // The completed item carries what was compacted and the summary (the app's 'Compacted 2 items (~1,234 tokens)').
  assert.deepEqual(notes[2].params.item, { type: 'contextCompaction', id: 'compaction-k1', codeDesktop: { summary: 'sum', shadowedItems: 2, shadowedTokens: 1234 } })
  assert.equal(notes.at(-1).params.turn.status, 'completed')
  assert.equal(p.lastSyntheticCompactionTurnId, 'turn-ck1')
  assert.equal(p.activeTurn, null)
  assert.deepEqual(p.closeSynthetic('turn-ck1', 'failed', { message: 'late' }), [], 'a settled turn is not closed twice')
  // Replaying the log again (same projector, then a fresh one) gives the same turn.
  assert.deepEqual(events.flatMap((event) => p.apply(event)), [])
  const replay = new ThreadProjector({ threadId: 'tc' })
  for (const event of events) replay.apply(event)
  const shape = (projector) => projector.turns.map((turn) => projector.snapshot(turn))
  assert.deepEqual(shape(replay), shape(p))
  assert.deepEqual(shape(replay).map((turn) => [turn.id, turn.status, turn.items.map((item) => item.type)]), [['turn-u1', 'completed', ['userMessage']], ['turn-ck1', 'completed', ['contextCompaction']]])
})

test('a failed or stopped synthetic compaction settles by its error, without completing the item', () => {
  const failed = new ThreadProjector({ threadId: 'tf' })
  failed.apply(ev('compaction/start', { compactionId: 'f', turn: null }))
  const failNotes = failed.apply(ev('compaction/end', { compactionId: 'f', turn: null, error: 'summary is not smaller than the shadowed content (9 >= 8)' }))
  assert.deepEqual(failNotes.map((n) => n.method), ['turn/completed'])
  assert.equal(failNotes[0].params.turn.status, 'failed')
  assert.equal(failNotes[0].params.turn.error.message, 'Compaction failed: summary is not smaller than the shadowed content (9 >= 8)')

  const stopped = new ThreadProjector({ threadId: 'ts' })
  stopped.apply(ev('compaction/start', { compactionId: 's', turn: null }))
  const stopNotes = stopped.apply(ev('compaction/end', { compactionId: 's', turn: null, error: 'Compaction interrupted.' }))
  assert.deepEqual(stopNotes.map((n) => [n.method, n.params.turn.status, n.params.turn.error]), [['turn/completed', 'interrupted', null]])
})

test('compaction inside a turn keeps the turn; a cut-off synthetic turn never stays running', () => {
  const p = userTurn('ti', 1, 'u1')
  const inTurn = [
    ...p.apply(ev('compaction/start', { compactionId: 'a', turn: 1 })),
    ...p.apply(ev('compaction/end', { compactionId: 'a', turn: 1 })),
  ]
  assert.deepEqual(inTurn.map((n) => [n.method, n.params.turnId]), [['item/started', 'turn-u1'], ['item/completed', 'turn-u1']])
  assert.equal(p.turns.length, 1)
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))

  // Unmatched start (crash before compaction/end): the next turn closes it,
  // a user message meanwhile waits for that turn, and a replay settles it.
  p.apply(ev('compaction/start', { compactionId: 'b', turn: null }))
  p.apply(ev('user/message', { id: 'u2', content: [{ type: 'text', text: 'next' }], source: { kind: 'user' } }))
  assert.deepEqual(p.turns.at(-1).items.map((item) => item.type), ['contextCompaction'])
  const next = p.apply(ev('turn/start', { turn: 2 }))
  assert.deepEqual(next.slice(0, 2).map((n) => [n.method, n.params.turn?.id, n.params.turn?.status]), [['turn/completed', 'turn-cb', 'interrupted'], ['turn/started', 'turn-u2', 'inProgress']])

  const cut = new ThreadProjector({ threadId: 'tx' })
  cut.apply(ev('compaction/start', { compactionId: 'c', turn: null }))
  assert.equal(cut.activeTurn?.id, 'turn-cc')
  assert.deepEqual(cut.settleStaleCompaction().map((n) => [n.method, n.params.turn.status]), [['turn/completed', 'interrupted']])
  assert.equal(cut.activeTurn, null)
  assert.deepEqual(cut.settleStaleCompaction(), [])
})

test('exit_plan_mode shows its plan as a Codex plan item before the tool item', () => {
  const p = userTurn('tp', 1, 'u1')
  const notes = p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'x1', name: 'exit_plan_mode', arguments: JSON.stringify({ plan: '# P' }) }))
  assert.deepEqual(notes.map((n) => [n.method, n.params.item.type, n.params.item.id]), [
    ['item/started', 'plan', 'plan-x1'], ['item/completed', 'plan', 'plan-x1'], ['item/started', 'dynamicToolCall', 'x1'],
  ])
  assert.deepEqual(notes[1].params.item, { type: 'plan', id: 'plan-x1', text: '# P' })
  assert.deepEqual(p.turns[0].items.map((item) => item.id), ['u1', 'plan-x1', 'x1'])
  // A malformed call (no plan string) and other tools add no plan item.
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 'x2', name: 'exit_plan_mode', arguments: '{"plan":' }))
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 'x3', name: 'ask_user_question', arguments: JSON.stringify({ questions: [{ id: 'q', question: 'Pick' }] }) }))
  assert.deepEqual(p.turns[0].items.map((item) => item.id), ['u1', 'plan-x1', 'x1', 'x2', 'x3'])
})

// dsh-subagent's own notice builders (not exported by the package entry).
const continuation = () => import(new URL('../node_modules/@deepseek-ai/dsh-subagent/lib/types/continuation-messages.js', import.meta.url))
const settledNotice = (childId, closing, summary = `Background subagent ${childId} finished and will do no further work unless you send it more.`) => ({
  id: `n-${childId}`, role: 'user',
  content: [{ type: 'text', text: summary }, ...(closing === null ? [{ type: 'text', text: 'It left no closing message.' }] : [{ type: 'text', text: 'Its closing message:' }, { type: 'text', text: closing }])],
  source: { kind: 'subagent-settled', form: 'notice', summary, senderSessionId: childId },
})

test('a continuable delegation is one agent row that its settled notice completes, with no user bubble', () => {
  const log = []
  const p = new ThreadProjector({ threadId: 'tsa' })
  const apply = p.apply.bind(p)
  p.apply = (event) => { log.push(event); return apply(event) }
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u1', content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }))
  const call = p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'sa', name: 'subagent', arguments: JSON.stringify({ description: 'Audit deps', prompt: 'p' }) }))
  assert.deepEqual(call.at(-1).params.item, {
    type: 'collabAgentToolCall', id: 'sa', tool: 'spawnAgent', status: 'inProgress', senderThreadId: 'tsa', receiverThreadIds: [], prompt: 'p',
    model: null, reasoningEffort: null, agentsStates: {}, description: 'Audit deps',
  })
  const started = p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: 'sa', content: [{ type: 'text', text: 'started subagent child-1' }], isError: false } })).at(-1).params.item
  assert.equal(started.status, 'completed'); assert.deepEqual(started.receiverThreadIds, ['child-1'])
  assert.deepEqual(started.agentsStates, { 'child-1': { status: 'running', message: null } })
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  assert.equal(p.childLabel('child-1'), 'Audit deps'); assert.equal(p.childTurnId('child-1'), 'turn-u1')
  // The notice opens the parent's next turn (turn/start precedes its message).
  p.apply(ev('turn/start', { turn: 2 }))
  const settled = p.apply(ev('user/message', settledNotice('child-1', 'done')))
  assert.deepEqual(settled.map((n) => [n.method, n.params.item?.type, n.params.turnId]), [['item/completed', 'collabAgentToolCall', 'turn-u1']])
  const answer = p.apply(ev('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'Audit finished.' }] } }))
  assert.deepEqual(answer.map((n) => [n.method, n.params.item?.type ?? n.params.turn?.id]), [
    ['turn/started', 'turn-n2'], ['item/started', 'subAgentActivity'], ['item/completed', 'subAgentActivity'], ['item/completed', 'agentMessage'],
  ])
  p.apply(ev('turn/end', { turn: 2, reason: { kind: 'completed' } }))
  const items = p.turns.flatMap((turn) => turn.items)
  const collab = items.filter((item) => item.type === 'collabAgentToolCall')
  assert.equal(collab.length, 1)
  assert.deepEqual(collab[0].receiverThreadIds, ['child-1'])
  assert.deepEqual(collab[0].agentsStates['child-1'], { status: 'completed', message: 'done' })
  assert.deepEqual(items.filter((item) => item.type === 'userMessage').map((item) => item.id), ['u1'])
  assert.deepEqual(p.turns[1].items[0], { type: 'subAgentActivity', id: 'subagent-n-child-1', kind: 'completed', agentThreadId: 'child-1', agentPath: 'child-1' })
  // Replay yields the same turns and rows.
  const replay = projectHistory(log, { threadId: 'tsa' })
  assert.deepEqual(replay.turns.map((turn) => replay.snapshot(turn)), p.turns.map((turn) => p.snapshot(turn)))
})

test('a notice never decides the turn id; a human message after it still does', () => {
  const p = userTurn('tsb', 1, 'u1')
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'sb', name: 'subagent', arguments: JSON.stringify({ description: 'Scan', prompt: 'p' }) }))
  p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: 'sb', content: [{ type: 'text', text: 'started subagent child-2' }], isError: false } }))
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  p.apply(ev('turn/start', { turn: 2 }))
  p.apply(ev('user/message', settledNotice('child-2', null, 'Background subagent child-2 was stopped before it finished.')))
  const human = p.apply(ev('user/message', { id: 'u2', content: [{ type: 'text', text: 'next' }], source: { kind: 'user' } }))
  assert.equal(human[0].params.turn.id, 'turn-u2')
  assert.deepEqual(p.turns[1].items.map((item) => [item.type, item.kind ?? item.id]), [['subAgentActivity', 'interrupted'], ['userMessage', 'u2']])
  assert.deepEqual(p.turns[0].items.find((item) => item.id === 'sb').agentsStates['child-2'], { status: 'interrupted', message: null })
})

test('settled notices read status and closing text from the Harness notice itself', async () => {
  const { createSettlementMessage, createAgentMessage } = await continuation()
  const closing = [{ type: 'text', text: 'line one' }, { type: 'text', text: 'line two' }]
  for (const [stopReason, status] of [['completed', 'completed'], ['aborted', 'interrupted'], ['error', 'errored'], ['max-tokens', 'completed'], ['refusal', 'completed'], ['weird', 'errored']]) {
    const notice = createSettlementMessage('child-9', { stopReason, output: closing })
    assert.equal(settledStatus(notice.source.summary), status, stopReason)
    assert.equal(settledMessage(notice.content), 'line one\nline two')
    assert.equal(settledMessage(createSettlementMessage('child-9', { stopReason }).content), null)
  }
  // An adjacent agent's message is activity only.
  const p = userTurn('tsc', 1, 'u1')
  const relay = createAgentMessage({ id: 'child-9' }, [{ type: 'text', text: 'partial result' }])
  const notes = p.apply(ev('user/message', relay))
  assert.deepEqual(notes.map((n) => [n.params.item.type, n.params.item.kind, n.params.item.agentThreadId]), [['subAgentActivity', 'interacted', 'child-9'], ['subAgentActivity', 'interacted', 'child-9']])
  assert.equal(p.turns[0].items.filter((item) => item.type === 'userMessage').length, 1)
})

test('a foreground delegation finds its child in the catalog and ends with the child output', () => {
  const p = userTurn('tsd', 1, 'u1')
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'f1', name: 'subagent_fork', arguments: JSON.stringify({ description: 'Review', prompt: 'look' }) }))
  p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'f2', name: 'subagent', arguments: JSON.stringify({ description: 'Lint', prompt: 'lint', run_in_background: false, model: 'm', reasoning_effort: 'high' }) }))
  // Parallel calls: each catalog fact matches its call by label.
  const lint = p.apply(ev('subagent/catalog', { version: 0, childId: 'c-lint', childCreatedAt: 1, mode: 'one-shot', label: 'Lint' }))
  assert.deepEqual(lint.map((n) => [n.method, n.params.item.id, n.params.item.status, n.params.item.receiverThreadIds]), [['item/started', 'f2', 'inProgress', ['c-lint']]])
  assert.deepEqual([lint[0].params.item.model, lint[0].params.item.reasoningEffort], ['m', 'high'])
  // A child some other tool made (no running call with that label) is not attached.
  assert.deepEqual(p.apply(ev('subagent/catalog', { version: 0, childId: 'c-other', childCreatedAt: 1, mode: 'continuable', label: 'Workflow step' })), [])
  p.apply(ev('subagent/catalog', { version: 0, childId: 'c-review', childCreatedAt: 1, mode: 'one-shot', label: 'Review' }))
  const result = (callId, text, isError = false) => p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: callId, content: [{ type: 'text', text }], isError } })).at(-1).params.item
  const review = result('f1', 'Looks good.')
  assert.equal(review.status, 'completed'); assert.deepEqual(review.agentsStates, { 'c-review': { status: 'completed', message: 'Looks good.' } })
  const failed = result('f2', 'Error: subagent run was cancelled', true)
  assert.equal(failed.status, 'failed'); assert.equal(failed.agentsStates['c-lint'].status, 'interrupted')
  assert.equal(p.childLabel('c-review'), 'Review'); assert.equal(p.childLabel('c-other'), null)
  const errored = completeToolItem({ ...toolItem({ callId: 'f3', name: 'subagent', args: {} }), receiverThreadIds: ['c3'] }, { name: 'subagent', args: {}, result: { content: [{ type: 'text', text: 'Error: subagent run failed' }], isError: true } })
  assert.equal(errored.agentsStates.c3.status, 'errored')
  const job = completeToolItem(toolItem({ callId: 'f4', name: 'subagent_fork', args: {} }), { name: 'subagent_fork', args: {}, result: { content: [{ type: 'text', text: 'started background subagent job j1' }], isError: false } })
  // A background job keeps its row running: the child runs on as the job (background-jobs.test.mjs).
  assert.deepEqual([job.status, job.agentsStates], ['inProgress', {}])
  const stopped = completeToolItem({ ...toolItem({ callId: 'f5', name: 'subagent', args: {} }), receiverThreadIds: ['c5'], agentsStates: { c5: { status: 'running', message: null } } }, { name: 'subagent', args: {}, result: { content: [{ type: 'text', text: 'Error: tool call aborted' }], isError: true } })
  assert.deepEqual([stopped.status, stopped.agentsStates.c5.status], ['interrupted', 'interrupted'])
})

test('agent-control tools map to their Codex collab tools', () => {
  const send = toolItem({ callId: 's', name: 'send_message', args: { agent_id: 'c1', message: 'more' }, threadId: 'p' })
  assert.deepEqual([send.type, send.tool, send.receiverThreadIds, send.prompt, send.senderThreadId], ['collabAgentToolCall', 'sendMessage', ['c1'], 'more', 'p'])
  const stop = toolItem({ callId: 'i', name: 'interrupt_agent', args: { agent_id: 'c1' }, threadId: 'p' })
  assert.deepEqual([stop.tool, stop.receiverThreadIds, stop.prompt], ['interruptAgent', ['c1'], null])
  const list = toolItem({ callId: 'l', name: 'list_agents', args: {}, threadId: 'p' })
  assert.deepEqual([list.tool, list.receiverThreadIds], ['listAgents', []])
  assert.equal(completeToolItem(send, { name: 'send_message', args: {}, result: { content: [{ type: 'text', text: 'message delivered to agent c1' }], isError: false } }).status, 'completed')
  assert.equal('description' in send, false)
})

test('a sub-agent fork shows only the turns after its seeded history', () => {
  const log = () => {
    seq = 0
    return [
      ev('turn/start', { turn: 1 }),
      ev('user/message', { id: 'parent-u', content: [{ type: 'text', text: 'parent prompt' }], source: { kind: 'user' } }),
      ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'parent answer' }] } }),
      ev('session/title', { title: 'Parent title' }),
      ev('subagent/descriptor', { version: 3, mode: 'one-shot', provider: 'fork', label: 'Ancestor' }),
      ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
      ev('turn/start', { turn: 2 }),
      ev('tool/call', { turn: 2, step: 1, callId: 'fork-call', name: 'subagent_fork', arguments: '{}' }),
      ev('session/end-seed', { inherited: true }),
      // The fork's synthetic closers for the inherited open turn.
      ev('tool/result', { turn: 2, step: 1, message: { toolCallId: 'fork-call', content: [{ type: 'text', text: 'x' }], isError: true } }),
      ev('turn/end', { turn: 2, reason: { kind: 'aborted', reason: { kind: 'user' } } }),
      ev('turn/start', { turn: 3 }),
      ev('subagent/descriptor', { version: 3, mode: 'one-shot', provider: 'fork', label: 'Fork review' }),
      ev('user/message', { id: 'child-u', content: [{ type: 'text', text: 'child task' }], source: { kind: 'user' } }),
      ev('assistant/message', { turn: 3, step: 1, message: { content: [{ type: 'text', text: 'child answer' }] } }),
      ev('turn/end', { turn: 3, reason: { kind: 'completed' } }),
    ]
  }
  const child = projectHistory(log(), { threadId: 'fork', inheritedHistory: 'hide' })
  assert.deepEqual(child.turns.map((turn) => [turn.id, turn.status, turn.items.map((item) => item.id)]), [['turn-child-u', 'completed', ['child-u', assistantItemId(3, 1, 0)]]])
  assert.deepEqual([child.preview, child.title, child.agentLabel], ['child task', null, 'Fork review'])
  // A fork the user made keeps the history it copied; an untagged marker resets nothing.
  const user = projectHistory(log(), { threadId: 'fork' })
  assert.deepEqual(user.turns.map((turn) => turn.id), ['turn-parent-u', 'turn-n2', 'turn-child-u'])
  seq = 0
  const plain = projectHistory([ev('turn/start', { turn: 1 }), ev('user/message', { id: 'a', content: [{ type: 'text', text: 'a' }], source: { kind: 'user' } }), ev('session/end-seed', {}), ev('turn/end', { turn: 1, reason: { kind: 'completed' } })], { threadId: 'p', inheritedHistory: 'hide' })
  assert.deepEqual(plain.turns.map((turn) => turn.id), ['turn-a'])
})

test('lastActivityMs moves on prompts, replies and turn bounds only', () => {
  const at = (type, data, time) => ({ type, data, seq: ++seq, time })
  const p = new ThreadProjector({ threadId: 'recency' })
  assert.equal(p.lastActivityMs, null)
  p.apply(at('turn/start', { turn: 1 }, 100))
  p.apply(at('user/message', { id: 'u1', content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' } }, 200))
  // Opening the session later: a preset change and a title are not activity.
  p.apply(at('permission/preset', { preset: 'workspace-write' }, 900))
  p.apply(at('session/title', { title: 'Hi', messageSeqs: [], source: { kind: 'fallback' } }, 950))
  assert.equal(p.lastActivityMs, 200)
  assert.equal(p.updatedAtMs, 950)
  p.apply(at('user/message', { id: 'ctx', content: [{ type: 'text', text: 'now' }], source: { kind: 'time-context' } }, 960))
  assert.equal(p.lastActivityMs, 200)
  p.apply(at('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'hello' }] } }, 1000))
  assert.equal(p.lastActivityMs, 1000)
  p.apply(at('turn/end', { turn: 1, reason: { kind: 'completed' } }, 1100))
  assert.equal(p.lastActivityMs, 1100)
  assert.deepEqual(['turn/start', 'assistant/message', 'turn/end', 'tool/call', 'plan/mode'].map((type) => isActivity({ type, data: {} })), [true, true, true, false, false])
  // A sub-agent fork's activity is its own: the seeded parent history resets it.
  const fork = new ThreadProjector({ threadId: 'fork', inheritedHistory: 'hide' })
  fork.apply(at('user/message', { id: 'p', content: [{ type: 'text', text: 'parent' }], source: { kind: 'user' } }, 50))
  fork.apply(at('session/end-seed', { inherited: true }, 60))
  assert.equal(fork.lastActivityMs, null)
})

test('a user message with marker blocks and an image block renders as Codex parts; the preview has no markers', () => {
  const ref = { attachmentId: 'img-1', mediaType: 'image/png', bytes: 10, width: 1, height: 1, name: 'shot.png' }
  const p = new ThreadProjector({ threadId: 'parts', cwd: '/w', imagePath: (attachment) => (attachment === ref ? '/stub/a.png' : undefined) })
  p.apply(ev('turn/start', { turn: 1 }))
  const notes = p.apply(ev('user/message', {
    id: 'u-parts', role: 'user', source: { kind: 'user' },
    content: [{ type: 'text', text: '@src/a.js fix' }, { type: 'text', text: '[Referenced: /w/src/a.js]' }, { type: 'image', attachment: ref }],
  }))
  const expected = [{ type: 'text', text: '@src/a.js fix', text_elements: [] }, { type: 'mention', name: 'a.js', path: '/w/src/a.js' }, { type: 'localImage', path: '/stub/a.png' }]
  assert.deepEqual(p.turns[0].items[0].content, expected)
  assert.deepEqual(notes.find((note) => note.method === 'item/started').params.item.content, expected, 'the live item carries the same parts')
  assert.equal(p.preview, '@src/a.js fix')
  assert.doesNotMatch(p.preview, /\[/)
  // Replay of the same log without an attachment store: the image is '[image]' text, the preview unchanged.
  const replay = projectHistory([ev('turn/start', { turn: 1 }), ev('user/message', { id: 'u2', source: { kind: 'user' }, content: [{ type: 'image', attachment: ref }, { type: 'text', text: '[Attached image: /old/shot.png — use read_image to view it]' }] })], { threadId: 'old' })
  assert.deepEqual(replay.turns[0].items[0].content, [{ type: 'text', text: '[image]', text_elements: [] }, { type: 'localImage', path: '/old/shot.png' }])
  assert.equal(replay.preview, '')
})

test('Harness failure codes map to CodexErrorInfo; turn errors keep the code in additionalDetails', () => {
  const cases = [
    [{ code: 'AUTH', status: 401 }, 'unauthorized'], [{ code: 'INVALID_CREDENTIAL' }, 'unauthorized'], [{ code: 'MISSING_CREDENTIAL' }, 'unauthorized'],
    [{ code: 'RATE_LIMIT', status: 429 }, 'rateLimitExceeded'],
    [{ code: 'SERVER', status: 503 }, 'serverOverloaded'], [{ code: 'SERVER', status: 529 }, 'serverOverloaded'],
    [{ code: 'SERVER', status: 500 }, 'internalServerError'], [{ code: 'SERVER' }, 'internalServerError'],
    [{ code: 'TRANSPORT' }, { responseStreamConnectionFailed: { httpStatusCode: null } }],
    [{ code: 'TIMEOUT', status: 504 }, { responseStreamConnectionFailed: { httpStatusCode: 504 } }],
    [{ code: 'CONTEXT_WINDOW_EXCEEDED' }, 'contextWindowExceeded'], [{ code: 'INVALID_REQUEST', status: 400 }, 'badRequest'],
    [{ code: 'QUOTA', status: 402 }, 'usageLimitExceeded'], [{ code: 'ACCOUNT_QUOTA' }, 'usageLimitExceeded'],
    [{ code: 'EMPTY_RESPONSE' }, null], [{ code: 'HTTP_418', status: 418 }, null], [{ code: 'UNKNOWN' }, null], [{}, null], [null, null],
  ]
  for (const [failure, expected] of cases) assert.deepEqual(codexErrorInfoOf(failure), expected, JSON.stringify(failure))

  const p = userTurn('quota')
  const notes = p.apply(ev('turn/end', { turn: 1, reason: { kind: 'error', error: { code: 'QUOTA', status: 402, message: 'Insufficient Balance' } } }))
  const turn = notes.at(-1).params.turn
  assert.equal(turn.status, 'failed')
  assert.deepEqual(turn.error, { message: 'Insufficient Balance', codexErrorInfo: 'usageLimitExceeded', additionalDetails: 'QUOTA', misalignment: null })
  // agent/error: a live LlmError keeps its facts in `failure`; a plain Error has no code.
  const llmError = Object.assign(new Error('Insufficient Balance'), { code: 'QUOTA', failure: { message: 'Insufficient Balance', code: 'QUOTA', status: 402 } })
  assert.deepEqual(failureError(llmError.failure, 'LlmError: Insufficient Balance'), { message: 'LlmError: Insufficient Balance', codexErrorInfo: 'usageLimitExceeded', additionalDetails: 'QUOTA', misalignment: null })
  assert.deepEqual(failureError(new Error('boom'), 'Error: boom'), { message: 'Error: boom', codexErrorInfo: null, additionalDetails: null, misalignment: null })
  // A code that is the whole message is not repeated as details.
  assert.deepEqual(failureError({ code: 'AUTH' }), { message: 'AUTH', codexErrorInfo: 'unauthorized', additionalDetails: null, misalignment: null })
})

test('llm/retry carries the failure identity and the retry count', () => {
  const p = userTurn('retry')
  const notes = p.apply(ev('llm/retry', { retryId: 'r1', turn: 1, step: 1, provider: 'deepseek', mode: 'normal', policyKey: 'k', retry: 1, maxRetries: 5, delayMs: 500, failure: { code: 'RATE_LIMIT', status: 429, message: 'Too many requests' } }))
  const error = notes.find((note) => note.method === 'error').params
  assert.equal(error.willRetry, true)
  assert.equal(error.turnId, 'turn-u1')
  assert.deepEqual(error.error, { message: 'Too many requests', codexErrorInfo: 'rateLimitExceeded', additionalDetails: 'RATE_LIMIT', misalignment: null })
  assert.deepEqual(error.retry, { attempt: 1, maxRetries: 5 })
  // An 'always' policy has no maximum; a message-less failure reads as its code.
  const always = p.apply(ev('llm/retry', { retryId: 'r2', turn: 1, step: 1, provider: 'deepseek', mode: 'always', policyKey: 'k', retry: 7, delayMs: 500, failure: { code: 'RATE_LIMIT' } }))[0].params
  assert.deepEqual(always.retry, { attempt: 7, maxRetries: null })
  assert.equal(always.error.message, 'RATE_LIMIT')
  assert.equal(always.error.codexErrorInfo, 'rateLimitExceeded')
})

test('a replayed todo log restores the plan and resume replays usage then plan', () => {
  const todos = [{ content: 'Read `src/a.js`', status: 'completed' }, { content: 'Fix it', status: 'in_progress' }, { content: 'Test', status: 'pending' }, { content: 'Odd', status: 'blocked' }]
  const log = [
    ev('turn/start', { turn: 1 }),
    ev('user/message', { id: 'u1', content: [{ type: 'text', text: 'plan it' }], source: { kind: 'user' } }),
    ev('tool/call', { turn: 1, step: 1, callId: 'k1', name: 'todo_write', arguments: JSON.stringify({ todos: todos.slice(0, 2) }) }),
    ev('assistant/message', { turn: 1, step: 2, message: { id: 'a1', content: [{ type: 'text', text: 'ok' }] }, usage: { inputTokens: 10, outputTokens: 2 } }),
    ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    ev('turn/start', { turn: 2 }),
    ev('user/message', { id: 'u2', content: [{ type: 'text', text: 'go on' }], source: { kind: 'user' } }),
    ev('todo/write', { todos }),
    ev('turn/end', { turn: 2, reason: { kind: 'completed' } }),
  ]
  const projector = projectHistory(log, { threadId: 'tp' })
  const plan = [{ step: 'Read `src/a.js`', status: 'completed' }, { step: 'Fix it', status: 'inProgress' }, { step: 'Test', status: 'pending' }, { step: 'Odd', status: 'pending' }]
  assert.deepEqual(projector.plan, plan)
  const notes = resumeReplayNotes({ threadId: 'tp', projector, tokenUsage: (usage) => ({ wrapped: usage }) })
  assert.deepEqual(notes, [
    { method: 'thread/tokenUsage/updated', params: { threadId: 'tp', turnId: 'turn-u1', tokenUsage: { wrapped: { inputTokens: 10, outputTokens: 2 } } } },
    { method: 'turn/plan/updated', params: { threadId: 'tp', turnId: 'turn-u2', explanation: null, plan } },
  ])
  // Nothing to replay for a log without usage or todos.
  assert.deepEqual(resumeReplayNotes({ threadId: 'tq', projector: projectHistory([ev('turn/start', { turn: 1 })], { threadId: 'tq' }), tokenUsage: () => assert.fail('no usage') }), [])
})

// R06: glob/grep search actions name their tool (cf6ae6197 fk 'found files' vs 'searched code'),
// shell commands name their shell (Uoe approval-current.js:6874-6907), and tool-result images
// reach the UI as the source's outputImages (QO :7398-7445) instead of '[image]'.
test('R06: glob carries its tool name and bash/pwsh commands carry their shell', () => {
  assert.equal(toolItem({ callId: 'g', name: 'glob', args: { pattern: '**/*.ts' }, cwd: '/w' }).commandActions[0].tool, 'glob')
  assert.equal(toolItem({ callId: 'r', name: 'grep', args: { pattern: 'x' }, cwd: '/w' }).commandActions[0].tool, 'grep')
  const bash = toolItem({ callId: 'b', name: 'bash', args: { command: 'ls' }, cwd: '/w' })
  assert.equal(bash.shell, 'bash')
  const pwsh = toolItem({ callId: 'p', name: 'pwsh', args: { command: 'Get-ChildItem' }, cwd: '/w', definition: { presentCall: () => ({ card: 'terminal', title: 'Get-ChildItem' }) } })
  assert.equal(pwsh.type, 'commandExecution'); assert.equal(pwsh.shell, 'powershell')
  // The shell survives completion, a stop and a denial.
  assert.equal(completeToolItem(bash, { name: 'bash', args: {}, result: { content: [{ type: 'text', text: 'ok' }], isError: false }, durationMs: 1 }).shell, 'bash')
  assert.equal(completeToolItem(bash, { name: 'bash', args: {}, result: { content: [{ type: 'text', text: 'Error: tool call aborted' }], isError: true }, durationMs: 1 }).shell, 'bash')
  // Read/search commandExecutions are not shell cards.
  assert.equal(toolItem({ callId: 'rd', name: 'read', args: { file_path: 'a.md' }, cwd: '/w' }).shell, undefined)
})

test('R06: MCP, dynamic and read_image results keep their images; oversized or unresolvable ones read [image]', async () => {
  const { TOOL_IMAGE_LIMIT } = await import('../packages/codex-app-server/src/projection.js')
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  const done = (item, content, extra = {}) => completeToolItem(item, { name: 'x', args: {}, result: { content, isError: false }, durationMs: 1, ...extra })
  const mcp = toolItem({ callId: 'm', name: 'mcp__shots__take', args: {} })
  assert.deepEqual(done(mcp, [{ type: 'text', text: 'Took it' }, { type: 'image', data: PNG, mimeType: 'image/png' }]).result.content,
    [{ type: 'text', text: 'Took it' }, { type: 'image', data: PNG, mimeType: 'image/png' }])
  assert.deepEqual(done(mcp, [{ type: 'image', data: 'A'.repeat(TOOL_IMAGE_LIMIT + 4), mimeType: 'image/png' }]).result.content, [{ type: 'text', text: '[image]' }])
  assert.deepEqual(done(mcp, [{ type: 'image', data: PNG, mimeType: 'image/svg+xml' }]).result.content, [{ type: 'text', text: '[image]' }], 'only raster types')
  // A failed MCP call has no result body; its error text is the text blocks.
  assert.equal(completeToolItem(mcp, { name: 'x', args: {}, result: { content: [{ type: 'text', text: 'boom' }], isError: true }, durationMs: 1 }).error.message, 'boom')

  const dir = mkdtempSync(join(tmpdir(), 'r06-images-'))
  try {
    const file = join(dir, 'att.png')
    writeFileSync(file, Buffer.from(PNG, 'base64'))
    const ref = { attachmentId: 'a1', mediaType: 'image/png', bytes: 68, width: 1, height: 1 }
    const imagePath = (value) => (value.attachmentId === 'a1' ? file : undefined)
    // Harness attachment refs resolve through the attachment store's host path.
    const dynamic = toolItem({ callId: 'd', name: 'screenshot', args: {} })
    assert.deepEqual(done(dynamic, [{ type: 'text', text: 'Shot' }, { type: 'image', attachment: ref }], { imagePath }).contentItems,
      [{ type: 'inputText', text: 'Shot' }, { type: 'inputImage', imageUrl: `data:image/png;base64,${PNG}` }])
    assert.deepEqual(done(dynamic, [{ type: 'image', attachment: ref }]).contentItems, [{ type: 'inputText', text: '[image]' }], 'no imagePath: [image]')
    assert.deepEqual(done(dynamic, [{ type: 'image', attachment: { ...ref, bytes: TOOL_IMAGE_LIMIT } }], { imagePath: () => assert.fail('an oversized ref is never read') }).contentItems,
      [{ type: 'inputText', text: '[image]' }])
    // read_image: one description line and the image as outputImages.
    const read = toolItem({ callId: 'ri', name: 'read_image', args: { file_path: 'shot.png' }, cwd: '/w' })
    assert.equal(read.commandActions[0].type, 'read')
    const envelope = '<path>/w/shot.png</path>\n<type>image</type>\n<content>\nimage/png image, 1x1 px, 68 bytes\n</content>'
    const readDone = done(read, [{ type: 'text', text: envelope }, { type: 'image', attachment: ref }], { imagePath })
    assert.equal(readDone.aggregatedOutput, 'image/png image, 1x1 px, 68 bytes')
    assert.deepEqual(readDone.outputImages, [{ type: 'inputImage', imageUrl: `data:image/png;base64,${PNG}` }])
    assert.doesNotMatch(JSON.stringify(readDone.aggregatedOutput), /\[image\]/)
    // Through the projector: its imagePath reaches the completion.
    const p = new ThreadProjector({ threadId: 'ti', cwd: '/w', imagePath })
    p.apply(ev('turn/start', { turn: 1 }))
    p.apply(ev('user/message', { id: 'ui', content: [{ type: 'text', text: 'look' }], source: { kind: 'user' } }))
    p.apply(ev('tool/call', { turn: 1, step: 1, callId: 'mi', name: 'mcp__shots__take', arguments: '{}' }))
    const item = p.apply(ev('tool/result', { turn: 1, step: 1, message: { toolCallId: 'mi', content: [{ type: 'image', attachment: ref }], isError: false } })).at(-1).params.item
    assert.deepEqual(item.result.content, [{ type: 'image', data: PNG, mimeType: 'image/png' }])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('tool input rewrites render accepted commands in live and replayed rows', () => {
  const records = [
    ev('turn/start', { turn: 1 }),
    ev('user/message', { id: 'rewrite-user', content: [{ type: 'text', text: 'go' }], source: { kind: 'user' } }),
    ev('tool/call', { turn: 1, step: 1, callId: 'rewrite-call', name: 'bash', arguments: '{"command":"echo original"}', effectiveArguments: '{"command":"echo accepted"}' }),
    ev('tool/result', { turn: 1, step: 1, message: { toolCallId: 'rewrite-call', content: [{ type: 'text', text: 'accepted' }], isError: false } }),
    ev('turn/end', { turn: 1, reason: { kind: 'completed' } }),
  ]
  const live = new ThreadProjector({ threadId: 'rewrite', cwd: '/w' })
  const notifications = records.flatMap(record => live.apply(record))
  assert.equal(notifications.find(note => note.method === 'item/started' && note.params.item.id === 'rewrite-call').params.item.command, 'echo accepted')
  const replay = new ThreadProjector({ threadId: 'rewrite', cwd: '/w' })
  records.forEach(record => replay.apply(record))
  assert.equal(replay.turns[0].items.find(item => item.id === 'rewrite-call').command, 'echo accepted')
  assert.equal(records[2].data.arguments, '{"command":"echo original"}')
})


test('Claude-classified shell results keep exit codes without marking no-match as a failure', () => {
  for (const withDefinition of [false, true]) {
    for (const [isError, exitCode, status] of [[false, 1, 'completed'], [true, 3, 'failed']]) {
      const args = { command: 'grep needle file', description: 'Search file' }
      const item = toolItem({ callId: 'exit-policy', name: 'bash', args })
      const result = { content: [{ type: 'text', text: `output\n[exit code: ${exitCode}]` }], isError, meta: { exitCodePolicy: 'claude-code' } }
      const definition = withDefinition ? { presentResult: () => ({ card: 'terminal', output: 'output', exitCode }) } : undefined
      const done = completeToolItem(item, { name: 'bash', args, result, definition })
      assert.deepEqual([done.status, done.exitCode, done.aggregatedOutput], [status, exitCode, 'output'])
    }
  }
})
