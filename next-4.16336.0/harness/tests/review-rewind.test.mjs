// review/start and thread/revert on the DeepSeek core (codex-app-server review.js, rewind.js and their projection):
// the review prompt per target, the review turn's Codex items, the rewind's cut and surface runs, and the notices
// replayed on a real Harness Session (the model's history and the projected transcript both end at the cut).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { REVIEW_FIELD, reportedFindings, reviewLabelOf, reviewRequest } from '../packages/codex-app-server/src/review.js'
import { REWIND_GAP_NOTICE, REWIND_NOTICE, REWIND_SOURCE, rewindAppends, rewindBoundary, rewindRuns } from '../packages/codex-app-server/src/rewind.js'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'
import { approvalDecision, SessionGrants } from '../packages/codex-app-server/src/approval.js'

const require = createRequire(import.meta.url)
const { Session } = await import(require.resolve('@deepseek-ai/dsh-session'))
const { createAssistantMessage, createDeveloperMessage, createSystemMessage, createToolResultMessage, createUserMessage } = await import(require.resolve('@deepseek-ai/dsh-llm'))

const code = (fn) => { try { fn(); return null } catch (error) { return { code: error.code, message: error.message } } }

test('reviewRequest builds the prompt and label of every Codex review target', () => {
  const uncommitted = reviewRequest({ type: 'uncommittedChanges' })
  assert.equal(uncommitted.label, 'uncommitted changes')
  assert.match(uncommitted.prompt, /git diff --staged/)
  assert.match(uncommitted.prompt, /Do not change any files\.$/)
  assert.match(uncommitted.prompt, /ReportFindings/)
  assert.deepEqual(reviewRequest(undefined).label, 'uncommitted changes')
  const branch = reviewRequest({ type: 'baseBranch', branch: 'main' })
  assert.equal(branch.label, 'changes against main')
  assert.match(branch.prompt, /git diff main\.\.\.HEAD/)
  const commit = reviewRequest({ type: 'commit', sha: '0123456789abcdef0123', title: 'Fix  the\nthing' })
  assert.equal(commit.label, 'commit 0123456789ab')
  assert.match(commit.prompt, /Review commit 0123456789abcdef0123 \("Fix the thing"\) \(git show 0123456789abcdef0123\)/)
  const custom = reviewRequest({ type: 'custom', instructions: '  Check the locking.  ' })
  assert.equal(custom.label, 'custom review')
  assert.equal(custom.prompt, 'Check the locking.\n\nDo not change any files.')
  for (const target of [{ type: 'custom', instructions: ' ' }, { type: 'baseBranch' }, { type: 'baseBranch', branch: 'main\nrm -rf /' }, { type: 'commit', sha: '' }, { type: 'nope' }])
    assert.equal(code(() => reviewRequest(target))?.code, -32602, JSON.stringify(target))
})

test('a review prompt marks its turn: Review started, then the final answer as the review result', () => {
  const projector = new ThreadProjector({ threadId: 's', cwd: '/w' })
  const notes = []
  const apply = (event) => notes.push(...projector.apply(event))
  const prompt = { id: 'r1', content: [{ type: 'text', text: 'Review it' }], source: { kind: 'user', [REVIEW_FIELD]: 'uncommitted changes' } }
  assert.equal(reviewLabelOf(prompt), 'uncommitted changes')
  assert.equal(reviewLabelOf({ source: { kind: 'tool-jobs', [REVIEW_FIELD]: 'x' } }), null)
  apply({ type: 'user/message', seq: 0, data: prompt, surfaceOp: 'append' })
  apply({ type: 'turn/start', seq: 1, data: { turn: 1 } })
  apply({ type: 'assistant/message', seq: 2, data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: '- [P1] Race in save — /w/a.js:3' }] } } })
  apply({ type: 'turn/end', seq: 3, data: { turn: 1, reason: { kind: 'completed' } } })
  const [turn] = projector.turns
  assert.equal(turn.id, 'turn-r1')
  assert.deepEqual(turn.items.map((item) => item.type), ['userMessage', 'enteredReviewMode', 'agentMessage', 'exitedReviewMode'])
  assert.equal(turn.items[1].review, 'uncommitted changes')
  assert.equal(turn.items[3].review, '- [P1] Race in save — /w/a.js:3')
  // The client sees enteredReviewMode as an item/started of the review turn (session-operations observe), and the
  // result before the turn completes.
  const methods = notes.map((note) => `${note.method}:${note.params.item?.type ?? ''}`)
  assert.ok(methods.indexOf('item/started:enteredReviewMode') > methods.indexOf('turn/started:'))
  assert.ok(methods.indexOf('item/completed:exitedReviewMode') < methods.indexOf('turn/completed:'))
})

test('a review that reported its findings with ReportFindings, or did not complete, adds no second result', () => {
  for (const [reason, tool] of [[{ kind: 'completed' }, true], [{ kind: 'interrupted' }, false]]) {
    const projector = new ThreadProjector({ threadId: 's', cwd: '/w' })
    projector.apply({ type: 'user/message', seq: 0, data: { id: 'r1', content: [{ type: 'text', text: 'Review it' }], source: { kind: 'user', [REVIEW_FIELD]: 'custom review' } }, surfaceOp: 'append' })
    projector.apply({ type: 'turn/start', seq: 1, data: { turn: 1 } })
    if (tool) {
      projector.apply({ type: 'tool/call', seq: 2, data: { turn: 1, step: 1, callId: 'c1', name: 'mcp__code_desktop__ReportFindings', arguments: { findings: [] } } })
      projector.apply({ type: 'tool/result', seq: 3, data: { turn: 1, step: 1, message: { toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] } } })
    }
    projector.apply({ type: 'assistant/message', seq: 4, data: { turn: 1, step: 2, message: { content: [{ type: 'text', text: 'Reported.' }] } } })
    projector.apply({ type: 'turn/end', seq: 5, data: { turn: 1, reason } })
    const items = projector.turns[0].items
    assert.equal(items.some((item) => item.type === 'exitedReviewMode'), false, JSON.stringify(reason))
    assert.equal(reportedFindings(items), tool)
  }
})

test('a review turn refuses every escalation, as Plan does', async () => {
  const decision = await approvalDecision({ request: { callId: 'c', toolName: 'write', reason: 'escalate sandbox to workspace-write: edit' }, askedCalls: new Set(), permission: { mode: 'review', approvalPolicy: 'on-request', extraRoots: [] }, grants: new SessionGrants() })
  assert.equal(decision.kind, 'reject')
})

// ------------------------------------------------------------ rewind on a real Harness Session

/** A two-turn Harness session: the system prompt in turn 1, a tool call and a tool-registry change in turn 2. */
function harnessSession() {
  const session = new Session('rewind-test')
  // head: the first step's system prompt, which the loop appends before the step's prompt (inside the turn); a later
  // prompt waits in the inbox and lands before its turn starts.
  const turn = (number, text, body, head = null) => {
    const prompt = createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } })
    if (!head) session.append('user/message', prompt, { surfaceOp: 'append' })
    session.append('turn/start', { turn: number })
    session.append('step/start', { turn: number, step: 1 })
    if (head) {
      head(number)
      session.append('user/message', prompt, { surfaceOp: 'append' })
    }
    body(number)
    session.append('turn/end', { turn: number, reason: { kind: 'completed' } })
    return prompt.id
  }
  const answer = (number, step, text) => session.append('assistant/message', { turn: number, step, message: createAssistantMessage({ content: [{ type: 'text', text }], source: { provider: 'p', model: 'm' } }) }, { surfaceOp: 'append' })
  const first = turn(1, 'first question', (number) => {
    answer(number, 1, 'first answer')
    session.append('step/end', { turn: number, step: 1 })
  }, (number) => session.append('system/message', { turn: number, step: 1, message: createSystemMessage('SYSTEM') }, { surfaceOp: 'append' }))
  session.append('session/title', { title: 'Two turns' })
  const second = turn(2, 'second question', (number) => {
    session.append('assistant/message', { turn: number, step: 1, message: createAssistantMessage({ content: [{ type: 'tool-call', id: 'call1', name: 'read', arguments: {} }], source: { provider: 'p', model: 'm' } }) }, { surfaceOp: 'append' })
    session.append('tool/call', { turn: number, step: 1, callId: 'call1', name: 'read', arguments: {} })
    session.append('tool/result', { turn: number, step: 1, message: createToolResultMessage({ callId: 'call1', content: [{ type: 'text', text: 'file text' }], isError: false }) }, { surfaceOp: 'append' })
    session.append('step/end', { turn: number, step: 1 })
    session.append('step/start', { turn: number, step: 2 })
    session.append('developer/message', { turn: number, step: 2, message: createDeveloperMessage({ source: { kind: 'tool-registry' }, content: [{ type: 'tool-removal', toolName: 'grep' }] }) }, { surfaceOp: 'append' })
    answer(number, 2, 'second answer')
    session.append('step/end', { turn: number, step: 2 })
  })
  return { session, first: `turn-${first}`, second: `turn-${second}` }
}

function project(events) {
  const projector = new ThreadProjector({ threadId: 'rewind-test', cwd: '/w' })
  for (const event of events) projector.apply(event)
  return projector
}

const text = (message) => message.content.map((block) => block.text ?? block.type).join('')

/** Rewind `session` to before `turnId`, as index.js revertThread does. */
function rewind(session, turnId) {
  const events = session.snapshotEvents()
  const boundary = rewindBoundary({ turns: project(events).turns, events, beforeTurnId: turnId })
  const runs = rewindRuns({ events, boundary, nodes: session.surface.nodes })
  const appends = rewindAppends(runs, { boundary, beforeTurnId: turnId, newMessage: createUserMessage, estimate: (seqs) => seqs.length * 10 })
  for (const [type, data, surface] of appends) surface ? session.append(type, data, surface) : session.append(type, data)
  return { boundary, runs, appends }
}

test('rewinding the last turn: the model sees the first turn and the notice, the transcript ends at the first turn', () => {
  const { session, first, second } = harnessSession()
  const before = session.deriveMessages().map(text)
  assert.deepEqual(before, ['SYSTEM', 'first question', 'first answer', 'second question', 'tool-call', 'file text', 'tool-removal', 'second answer'])
  const { boundary, runs, appends } = rewind(session, second)
  const events = session.snapshotEvents()
  // The cut keeps the first turn and its title, and stops before the second prompt.
  assert.equal(events[boundary].type, 'session/title')
  assert.equal(events[boundary + 1].type, 'user/message')
  // Two runs: the tool-registry change stays where it is.
  assert.equal(runs.length, 2)
  assert.deepEqual(appends.map(([type]) => type), ['compaction/prune', 'user/message', 'compaction/prune', 'user/message'])
  assert.equal(appends[0][1].shadowedTokenCount, runs[0].length * 10)
  assert.deepEqual(session.deriveMessages().map(text), ['SYSTEM', 'first question', 'first answer', REWIND_NOTICE, 'tool-removal', REWIND_GAP_NOTICE])
  const projector = project(events)
  assert.deepEqual(projector.turns.map((turn) => turn.id), [first])
  assert.equal(events.filter((event) => event.data?.source?.kind === REWIND_SOURCE).length, 2)
  // The next prompt is a turn of its own after the cut.
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'again' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  session.append('turn/start', { turn: 3 })
  const after = project(session.snapshotEvents())
  assert.equal(after.turns.length, 2)
  assert.equal(after.turns[1].status, 'inProgress')
})

test('rewinding to before the first turn keeps only the system prompt node, and a second rewind cuts again', () => {
  const { session, first } = harnessSession()
  rewind(session, first)
  // Node 0 (the system prompt) may only be rewritten by a system/message: it stays, and the dialogue around it goes.
  assert.deepEqual(session.deriveMessages().map(text), ['SYSTEM', REWIND_NOTICE, 'tool-removal', REWIND_GAP_NOTICE])
  assert.deepEqual(project(session.snapshotEvents()).turns, [])
  // A new conversation after it, rewound again: the earlier notices are dropped content too.
  const prompt = createUserMessage({ content: [{ type: 'text', text: 'new start' }], source: { kind: 'user' } })
  session.append('user/message', prompt, { surfaceOp: 'append' })
  session.append('turn/start', { turn: 3 })
  session.append('step/start', { turn: 3, step: 1 })
  session.append('assistant/message', { turn: 3, step: 1, message: createAssistantMessage({ content: [{ type: 'text', text: 'new answer' }], source: { provider: 'p', model: 'm' } }) }, { surfaceOp: 'append' })
  session.append('step/end', { turn: 3, step: 1 })
  session.append('turn/end', { turn: 3, reason: { kind: 'completed' } })
  assert.deepEqual(project(session.snapshotEvents()).turns.map((turn) => turn.id), [`turn-${prompt.id}`])
  rewind(session, `turn-${prompt.id}`)
  assert.deepEqual(project(session.snapshotEvents()).turns, [])
  assert.equal(session.deriveMessages().some((message) => text(message).includes('new')), false)
})

test('a rewind is refused when a compaction after the cut covered kept content, but a tool-result prune stays kept', () => {
  const { session, second } = harnessSession()
  const events = session.snapshotEvents()
  const nodes = [...session.surface.nodes]
  // A summary over the first answer and the second prompt (both sides of the cut).
  const summary = createUserMessage({ content: [{ type: 'text', text: 'summary' }], source: { kind: 'compaction' } })
  const covered = nodes.slice(2, 4)
  session.append('user/message', summary, { surfaceOp: { op: 'replace', startSeq: covered[0], endSeq: covered[1] }, sourceEventSeqs: covered })
  const boundary = rewindBoundary({ turns: project(events).turns, events, beforeTurnId: second })
  assert.match(code(() => rewindRuns({ events: session.snapshotEvents(), boundary, nodes: session.surface.nodes })).message, /compacted after that message/)
  assert.match(code(() => rewindRuns({ events: session.snapshotEvents(), boundary, nodes: nodes })).message, /could not be read/)

  const pruned = harnessSession()
  const toolSeq = pruned.session.snapshotEvents().find((event) => event.type === 'tool/result').seq
  const firstAnswer = pruned.session.snapshotEvents().find((event) => event.type === 'assistant/message').seq
  // A prune of a node before the cut, logged after it (here: of the first answer), stays on the kept side.
  const all = pruned.session.snapshotEvents()
  const cut = rewindBoundary({ turns: project(all).turns, events: all, beforeTurnId: pruned.second })
  const synthetic = [...all, { type: 'user/message', seq: all.length, data: {}, surfaceOp: { op: 'replace', startSeq: firstAnswer, endSeq: firstAnswer } }]
  const runs = rewindRuns({ events: synthetic, boundary: cut })
  assert.ok(runs.flat().includes(toolSeq))
  assert.equal(runs.flat().includes(all.length), false)
})

test('rewindBoundary refuses unknown and running turns', () => {
  const { session, second } = harnessSession()
  const events = session.snapshotEvents()
  const turns = project(events).turns
  assert.match(code(() => rewindBoundary({ turns, events, beforeTurnId: 'turn-zz' })).message, /Unknown turn/)
  assert.match(code(() => rewindBoundary({ turns, events })).message, /beforeTurnId is required/)
  const running = turns.map((turn) => (turn.id === second ? { ...turn, status: 'inProgress' } : turn))
  assert.match(code(() => rewindBoundary({ turns: running, events, beforeTurnId: second })).message, /still running/)
})
