// OpenCode 2.x bridge, phase 4 (pure): v2 session messages → 1.x-shaped entries with synthetic part ids
// (src/v2/history.js), turns grouped by position (attributeTurns: idle messages, steers, synthetic-started runs,
// switched / system messages, compaction, shell, a staged revert), and projection.js's v2 branches (Projector api
// 'v2', the shell / subagent / patch tools, FileDiff changes, errorType declines, errorInfoOfV2).
import test from 'node:test'
import assert from 'node:assert/strict'
import { Projector, errorInfoOfV2, errorInfoOf, toolItem } from '../packages/opencode-bridge/src/projection.js'
import { attributeTurns, beforeRevert, compactionMessageId, compactionPartId, reasoningPartId, textPartId, toV1Message, toV1Messages, toV1Session, toolPart, toolPartId } from '../packages/opencode-bridge/src/v2/history.js'
import { agentSwitched, assistant, compaction, idle, modelSwitched, msgId, reasoning, shell, synthetic, system, text, tool, user } from './fixtures/v2-history.mjs'

const SES = 'ses_hist'
const project = (messages, { meta = {}, busy = false, revert = null, cwd = '/w' } = {}) => {
  const projector = new Projector({ threadId: SES, cwd, meta, api: 'v2' })
  projector.load(toV1Messages(messages, { sessionID: SES }))
  projector.revert = revert
  return { projector, turns: projector.turns({ busy }) }
}
const itemTypes = (turn) => turn.items.map((item) => item.type)

// ---------------------------------------------------------------- entries

test('an assistant step becomes 1.x parts with the ids the live path builds: the n-th text / reasoning, the tool id as callID', () => {
  const id = msgId('a')
  const entry = toV1Message(assistant(id, 1000, [
    reasoning('thinking', 1001), text('first'), tool('call_1', 'shell', { command: 'ls' }, { output: 'a\nb', metadata: { exit: 0 }, at: 1002 }),
    reasoning('more', 1003), text('second'),
  ]), { sessionID: SES })
  assert.equal(entry.info.role, 'assistant')
  assert.equal(entry.info.type, 'assistant')
  assert.equal(entry.info.providerID, 'anthropic')
  assert.equal(entry.info.modelID, 'claude-x')
  assert.deepEqual(entry.parts.map((part) => part.id), [reasoningPartId(id, 0), textPartId(id, 0), toolPartId(id, 'call_1'), reasoningPartId(id, 1), textPartId(id, 1)])
  assert.deepEqual(entry.parts.map((part) => part.id), [`${id}:reasoning:0`, `${id}:text:0`, `${id}:tool:call_1`, `${id}:reasoning:1`, `${id}:text:1`])
  const call = entry.parts[2]
  assert.equal(call.callID, 'call_1')
  assert.equal(call.tool, 'shell')
  assert.equal(call.state.status, 'completed')
  assert.equal(call.state.output, 'a\nb')
  assert.deepEqual(call.state.time, { start: 1003, end: 1004 })
  assert.equal(compactionMessageId(undefined, 'evt_123abc'), 'msg_123abc')
  assert.equal(compactionMessageId('msg_inbox', 'evt_1'), 'msg_inbox')
  assert.equal(compactionPartId('msg_c'), 'msg_c:compaction')
})

test('tool states: streaming is pending with no input yet, an error keeps its type, a file result is an attachment', () => {
  const streaming = toolPart('msg_x', SES, tool('c1', 'edit', { path: 'a.ts' }, { status: 'streaming' }))
  assert.equal(streaming.state.status, 'pending')
  assert.deepEqual(streaming.state.input, {})
  const failed = toolPart('msg_x', SES, tool('c2', 'edit', { path: 'a.ts' }, { status: 'error', error: { type: 'permission.rejected', message: 'Not that file' } }))
  assert.equal(failed.state.error, 'Not that file')
  assert.equal(failed.state.errorType, 'permission.rejected')
  const image = toolPart('msg_x', SES, tool('c3', 'read', { path: '/w/p.png' }, { output: 'Image read successfully', files: [{ type: 'file', uri: 'data:image/png;base64,AAAA', mime: 'image/png', name: 'p.png' }] }))
  assert.deepEqual(image.state.attachments, [{ mime: 'image/png', url: 'data:image/png;base64,AAAA', filename: 'p.png' }])
  assert.equal(toolItem(image, { threadId: SES, cwd: '/w', api: 'v2' }).type, 'imageView')
})

test('user messages: text, inline files as data: urls, agents mentioned in the text not repeated; a synthetic message is synthetic', () => {
  const entry = toV1Message(user('msg_u', 5, 'look @explore', {
    files: [{ data: 'aGk=', mime: 'text/plain', source: { type: 'inline' }, name: 'note.txt' }, { data: 'AAAA', mime: 'image/png', source: { type: 'uri', uri: 'file:///w/shot.png' } }],
    agents: [{ name: 'explore', mention: { start: 5, end: 13, text: '@explore' } }, { name: 'general' }],
  }))
  assert.deepEqual(entry.parts, [
    { id: 'msg_u:text:0', type: 'text', text: 'look @explore' },
    { type: 'file', mime: 'text/plain', url: 'data:text/plain;base64,aGk=', filename: 'note.txt' },
    { type: 'file', mime: 'image/png', url: 'file:///w/shot.png' },
    { type: 'agent', name: 'general' },
  ])
  const note = toV1Message(synthetic('msg_s', 6, '<subagent …>', { description: 'done' }))
  assert.equal(note.info.role, 'user')
  assert.equal(note.info.synthetic, true)
  assert.equal(note.parts[0].synthetic, true)
  assert.deepEqual(toV1Session({ id: 'ses_1', location: { directory: '/w' }, time: { created: 1, updated: 2 } }).directory, '/w')
})

// ---------------------------------------------------------------- turns

test('one turn: the prompt, its steps and the idle message; switched and system messages belong to no turn', () => {
  const u = msgId('u'), a1 = msgId('a'), a2 = msgId('a'), end = msgId('i')
  const { turns } = project([
    agentSwitched(msgId('sw'), 900, 'build'), modelSwitched(msgId('sw'), 901, { id: 'claude-x', providerID: 'anthropic' }),
    user(u, 1000, 'list files'),
    assistant(a1, 1001, [tool('t1', 'shell', { command: 'ls' }, { output: 'a', metadata: { exit: 0 }, at: 1001 })], { finish: 'tool-calls' }),
    system(msgId('sys'), 1015, 'The date changed.'),
    assistant(a2, 1020, [text('Two files.')]),
    idle(end, 1040),
  ])
  assert.equal(turns.length, 1)
  assert.equal(turns[0].id, u)
  assert.deepEqual(itemTypes(turns[0]), ['userMessage', 'commandExecution', 'agentMessage'])
  assert.equal(turns[0].status, 'completed')
  assert.equal(turns[0].items[0].id, `${u}-user`)
  assert.equal(turns[0].items[2].id, `${a2}:text:0`)
  assert.equal(turns[0].durationMs, 40, 'the idle message is where the turn ended')
  assert.deepEqual(turns[0].assistant.map((entry) => entry.info.id), [a1, a2])
})

test('a recorded steer joins the running turn; another prompt delivered in the same run (no idle between) starts its own', () => {
  const u = msgId('u'), steer = msgId('u'), queued = msgId('u')
  const { turns } = project([
    user(u, 1000, 'first'), assistant(msgId('a'), 1001, [text('working')], { finish: 'tool-calls' }),
    user(steer, 1010, 'also this'), assistant(msgId('a'), 1011, [text('ok, both')]),
    user(queued, 1020, 'next thing'), assistant(msgId('a'), 1021, [text('done')]),
    idle(msgId('i'), 1030),
  ], { meta: { steers: [steer], inputs: { [steer]: [{ type: 'text', text: 'also this (as typed)', text_elements: [] }] } } })
  assert.deepEqual(turns.map((turn) => turn.id), [u, queued])
  assert.deepEqual(itemTypes(turns[0]), ['userMessage', 'agentMessage', 'userMessage', 'agentMessage'])
  assert.equal(turns[0].items[2].content[0].text, 'also this (as typed)', 'the input the bridge remembered')
  assert.equal(turns[0].status, 'completed', 'ended by the next prompt, its steps complete')
  assert.equal(turns[1].status, 'completed')
})

test('a run no prompt started (a background sub-agent finished) is a turn of its own under the waking message\'s id; Plan reminders start nothing', () => {
  const u = msgId('u'), reminder = msgId('s'), u2 = msgId('u'), wake = msgId('s'), step = msgId('a')
  const { turns } = project([
    user(u, 1000, 'start a background agent'), assistant(msgId('a'), 1001, [tool('t1', 'subagent', { agent: 'explore', description: 'Scan', prompt: 'scan', background: true }, { output: 'started', metadata: { sessionID: 'ses_child', status: 'running' }, at: 1001 })]),
    idle(msgId('i'), 1010),
    agentSwitched(msgId('sw'), 1100, 'plan', 'build'), synthetic(reminder, 1101, '<system-reminder>\nYou are in Plan mode…'),
    user(u2, 1102, 'plan it'), assistant(msgId('a'), 1103, [text('the plan')]), idle(msgId('i'), 1110),
    synthetic(wake, 1200, '<subagent sessionID="ses_child" state="completed" description="Scan">\nfound it\n</subagent>', { description: 'Scan', metadata: { source: 'subagent', childID: 'ses_child', agent: 'explore', state: 'completed' } }),
    assistant(step, 1201, [text('The scan found it.')]), idle(msgId('i'), 1210),
  ])
  assert.deepEqual(turns.map((turn) => turn.id), [u, u2, wake])
  assert.deepEqual(itemTypes(turns[1]), ['userMessage', 'agentMessage'], 'the reminder shows nothing')
  assert.deepEqual(itemTypes(turns[2]), ['agentMessage'], 'no user message: the agent spoke on its own')
  assert.equal(turns[2].kind, 'synthetic')
  assert.equal(turns[2].status, 'completed')
  const spawn = turns[0].items[1]
  assert.equal(spawn.type, 'collabAgentToolCall')
  assert.deepEqual(spawn.receiverThreadIds, ['ses_child'])
  assert.deepEqual(spawn.agentsStates.ses_child, { status: 'completed', message: 'found it' }, 'a background sub-agent settles at its completion message')
  assert.equal(spawn.agentRole, 'explore')
  // Before its completion message it still runs after its call completed.
  const before = project([
    user(msgId('u'), 1000, 'go'), assistant(msgId('a'), 1001, [tool('t1', 'subagent', { agent: 'explore', description: 'Scan', prompt: 'scan', background: true }, { output: 'started', metadata: { sessionID: 'ses_child', status: 'running' }, at: 1001 })]),
    idle(msgId('i'), 1010),
  ]).turns
  assert.deepEqual(before[0].items[1].agentsStates.ses_child, { status: 'running', message: null })
})

test('a background sub-agent\'s state comes from the first completion message after its call: errored, cancelled, a follow-up call waits for the next one', () => {
  const spawn = (id, at, child) => assistant(id, at, [tool(`t_${id}`, 'subagent', { agent: 'general', description: 'Job', prompt: 'do it', background: true }, { output: 'started', metadata: { sessionID: child, status: 'running' }, at })])
  const ended = (id, at, child, state, body) => synthetic(id, at, `<subagent sessionID="${child}" state="${state}" description="Job">\n${body}\n</subagent>`, { description: 'Job', metadata: { source: 'subagent', childID: child, agent: 'general', state } })
  const { turns } = project([
    user(msgId('u'), 1000, 'three jobs'), spawn(msgId('a'), 1001, 'ses_a'), spawn(msgId('a'), 1002, 'ses_b'), idle(msgId('i'), 1003),
    ended(msgId('s'), 1100, 'ses_a', 'error', 'Subagent failed'), ended(msgId('s'), 1101, 'ses_b', 'cancelled', 'Subagent cancelled'),
    assistant(msgId('a'), 1102, [text('One failed, one was cancelled.')]), idle(msgId('i'), 1103),
    user(msgId('u'), 1200, 'try a again'), spawn(msgId('a'), 1201, 'ses_a'), idle(msgId('i'), 1202),
  ])
  const states = turns.flatMap((turn) => turn.items).filter((item) => item.type === 'collabAgentToolCall').map((item) => Object.values(item.agentsStates)[0])
  assert.deepEqual(states, [
    { status: 'errored', message: 'Subagent failed' },
    { status: 'interrupted', message: 'Subagent cancelled' },
    { status: 'running', message: null },
  ])
})

test('outcomes: the idle message decides (failed with its error type, interrupted); without one an aborted step is an interruption', () => {
  const { turns } = project([
    user(msgId('u'), 1000, 'a'), assistant(msgId('a'), 1001, [], { error: { type: 'provider.rate-limit', message: 'Slow down', status: 429 }, completed: 1002 }), idle(msgId('i'), 1003, 'failed', { type: 'provider.rate-limit', message: 'Slow down', status: 429 }),
    user(msgId('u'), 1100, 'b'), assistant(msgId('a'), 1101, [text('partial')], { error: { type: 'aborted', message: 'Interrupted' }, completed: 1102 }), idle(msgId('i'), 1103, 'interrupted'),
    user(msgId('u'), 1200, 'c'), assistant(msgId('a'), 1201, [text('partial')], { error: { type: 'aborted', message: 'Interrupted' }, completed: 1202 }),
    user(msgId('u'), 1300, 'd'), assistant(msgId('a'), 1301, [], { error: { type: 'provider.quota', message: 'Quota used up' }, completed: 1302 }), idle(msgId('i'), 1303, 'failed'),
  ])
  assert.deepEqual(turns.map((turn) => turn.status), ['failed', 'interrupted', 'interrupted', 'failed'])
  assert.equal(turns[0].error.codexErrorInfo, 'rateLimitExceeded')
  assert.equal(turns[0].error.additionalDetails, 'provider.rate-limit')
  assert.equal(turns[1].error, null)
  assert.equal(turns[3].error.codexErrorInfo, 'usageLimitExceeded', 'an idle with no error of its own takes the step\'s')
})

test('a step cut off by a shutdown (no completion, no idle) ends its turn interrupted; while the session runs the last turn is in progress', () => {
  const messages = [user(msgId('u'), 1000, 'go'), assistant(msgId('a'), 1001, [tool('t1', 'shell', { command: 'sleep 9' }, { status: 'running', at: 1001 })], { completed: null })]
  const stopped = project(messages).turns
  assert.equal(stopped[0].status, 'interrupted')
  assert.equal(stopped[0].items[1].status, 'failed', 'its open call closes with it')
  const running = project(messages, { busy: true }).turns
  assert.equal(running[0].status, 'inProgress')
  assert.equal(running[0].items[1].status, 'inProgress')
  // Running again, but the last run already ended (the new one has written nothing yet): that turn stays as it ended.
  const ended = project([user(msgId('u'), 1000, 'go'), assistant(msgId('a'), 1001, [text('done')]), idle(msgId('i'), 1002)], { busy: true }).turns
  assert.equal(ended[0].status, 'completed')
})

test('compaction: asked for between turns it is a turn of its own with the summary; an automatic one joins the running turn', () => {
  const manual = msgId('c'), u = msgId('u')
  const { turns } = project([
    compaction(manual, 1000, { reason: 'manual', summary: 'We fixed the parser.' }), idle(msgId('i'), 1005),
    user(u, 1100, 'continue'), compaction(msgId('c'), 1101, { reason: 'auto', summary: 'Earlier: the parser.' }), assistant(msgId('a'), 1102, [text('continuing')]), idle(msgId('i'), 1110),
  ])
  assert.deepEqual(turns.map((turn) => turn.id), [manual, u])
  assert.deepEqual(turns[0].items, [{ type: 'contextCompaction', id: `${manual}:compaction`, codeDesktop: { summary: 'We fixed the parser.' } }])
  assert.equal(turns[0].status, 'completed')
  assert.deepEqual(itemTypes(turns[1]), ['userMessage', 'contextCompaction', 'agentMessage'])
})

test('the user\'s own shell command is a command row; a staged revert hides its message and everything after it, by position', () => {
  const sh = msgId('sh'), u = msgId('u'), later = msgId('u')
  const messages = [
    shell(sh, 1000, 'git status', { output: 'clean', exit: 1 }),
    user(u, 1100, 'keep'), assistant(msgId('a'), 1101, [text('kept')]), idle(msgId('i'), 1102),
    // A bridge-made id that sorts before the earlier ones: position decides, never the id.
    user(later, 1200, 'undo me'), assistant('msg_0000early', 1201, [text('gone')]), idle(msgId('i'), 1202),
  ]
  const all = project(messages).turns
  assert.deepEqual(all.map((turn) => turn.id), [sh, u, later])
  const command = all[0].items[0]
  assert.equal(command.type, 'commandExecution')
  assert.equal(command.command, 'git status')
  assert.equal(command.exitCode, 1)
  assert.equal(command.status, 'failed')
  const reverted = project(messages, { revert: { messageID: later } }).turns
  assert.deepEqual(reverted.map((turn) => turn.id), [sh, u])
  assert.equal(beforeRevert(toV1Messages(messages), { messageID: 'msg_missing' }).length, messages.length, 'an unknown boundary hides nothing')
})

test('the user\'s own shell command runs in no execution: with no turn open it is a turn that ends with it, so a later wake is a turn of its own', () => {
  const u = msgId('u'), sh = msgId('sh'), wake = msgId('s'), done = msgId('s')
  const { turns } = project([
    user(u, 1000, 'scan in the background'), assistant(msgId('a'), 1001, [tool('t1', 'subagent', { agent: 'explore', description: 'Scan', prompt: 'scan', background: true }, { output: 'started', metadata: { sessionID: 'ses_c', status: 'running' }, at: 1001 })]),
    idle(msgId('i'), 1010),
    shell(sh, 1100, 'ls', { output: 'a b' }),
    synthetic(done, 1106, '<shell id="shl_x" state="completed" command="ls">\na b\n</shell>', { metadata: { source: 'shell', shellID: `shl_${sh}`, state: 'completed' } }),
    synthetic(wake, 1200, '<subagent sessionID="ses_c" state="completed" description="Scan">\nthe agent finished\n</subagent>', { metadata: { source: 'subagent', childID: 'ses_c', agent: 'explore', state: 'completed' } }),
    assistant(msgId('a'), 1201, [text('The scan is done.')]), idle(msgId('i'), 1210),
  ], { busy: true })
  assert.deepEqual(turns.map((turn) => [turn.id, turn.kind, itemTypes(turn)]), [
    [u, 'user', ['userMessage', 'collabAgentToolCall']],
    [sh, 'shell', ['commandExecution']],
    [wake, 'synthetic', ['agentMessage']],
  ])
  assert.deepEqual(turns.map((turn) => turn.status), ['completed', 'completed', 'completed'])
  assert.deepEqual(turns[0].items[1].agentsStates.ses_c, { status: 'completed', message: 'the agent finished' })
  const entries = toV1Messages([shell('msg_sh', 1, 'ls'), synthetic('msg_n', 2, 'note'), synthetic('msg_w', 3, 'wake'), assistant('msg_a', 4, [text('x')]), idle('msg_i', 5),
    user('msg_u', 6, 'go'), shell('msg_sh2', 7, 'pwd'), assistant('msg_a2', 8, [text('y')]), idle('msg_i2', 9),
    synthetic('msg_d', 10, 'done', { metadata: { source: 'shell', shellID: 'shl_msg_sh2', state: 'completed' } })])
  assert.deepEqual(attributeTurns(entries).map((turn) => ({ id: turn.id, roles: turn.members.map((member) => member.role), closed: turn.closed })), [
    { id: 'msg_sh', roles: ['shell'], closed: true },
    { id: 'msg_w', roles: ['context', 'step'], closed: false },
    // A command run while a turn is open belongs to it; its completion joins it even after the idle.
    { id: 'msg_u', roles: ['prompt', 'shell', 'step', 'context'], closed: false },
  ])
})

test('a command still running: its turn is in progress while it is the last one, else it stays completed with the command running', () => {
  const sh = msgId('sh')
  const running = shell(sh, 1000, 'npm test', { status: 'running', exit: undefined, completed: null })
  const alone = project([running]).turns
  assert.equal(alone[0].status, 'inProgress')
  assert.equal(alone[0].items[0].status, 'inProgress')
  const u = msgId('u')
  const later = project([running, user(u, 1010, 'meanwhile'), assistant(msgId('a'), 1011, [text('ok')]), idle(msgId('i'), 1012)], { busy: true }).turns
  assert.deepEqual(later.map((turn) => turn.status), ['completed', 'completed'])
  assert.equal(later[0].items[0].status, 'inProgress')
  // busy is about an execution, never the command's turn.
  const idleShell = project([shell(msgId('sh'), 1000, 'ls')], { busy: true }).turns
  assert.equal(idleShell[0].status, 'completed')
})

test('attributeTurns alone: members and roles', () => {
  const entries = toV1Messages([user('msg_1', 1, 'a'), synthetic('msg_2', 2, 'note'), assistant('msg_3', 3, [text('x')]), idle('msg_4', 4), system('msg_5', 5, 's'), synthetic('msg_6', 6, 'wake'), assistant('msg_7', 7, [text('y')])])
  const turns = attributeTurns(entries)
  assert.deepEqual(turns.map((turn) => ({ id: turn.id, kind: turn.kind, roles: turn.members.map((member) => member.role), idle: turn.idle?.info.id ?? null })), [
    { id: 'msg_1', kind: 'user', roles: ['prompt', 'context', 'step'], idle: 'msg_4' },
    { id: 'msg_6', kind: 'synthetic', roles: ['context', 'step'], idle: null },
  ])
})

test('usage: the last step\'s tokens under the turn it was grouped into', () => {
  const u = msgId('u')
  const { projector } = project([user(u, 1, 'a'), assistant(msgId('a'), 2, [text('x')]), idle(msgId('i'), 3)])
  const usage = projector.usage()
  assert.equal(usage.lastTurnId, u)
  assert.equal(usage.model, 'anthropic/claude-x')
  assert.deepEqual(usage.last, { totalTokens: 175, inputTokens: 150, cachedInputTokens: 50, cacheWriteInputTokens: 0, outputTokens: 25, reasoningOutputTokens: 5 })
})

// ---------------------------------------------------------------- tools and errors

test('v2 tool branches: edit and patch FileDiffs, write without metadata, declines by errorType', () => {
  const ctx = { threadId: SES, cwd: '/w', api: 'v2' }
  const edit = toolItem(toolPart('msg_e', SES, tool('e1', 'edit', { path: 'src/a.ts', oldString: 'a', newString: 'b' }, { metadata: { files: [{ file: 'src/a.ts', patch: '@@ -1 +1 @@\n-a\n+b\n', additions: 1, deletions: 1, status: 'modified' }] } })), ctx)
  assert.deepEqual(edit.changes, [{ path: '/w/src/a.ts', kind: { type: 'update', move_path: null }, diff: '@@ -1 +1 @@\n-a\n+b\n' }])
  const patch = toolItem(toolPart('msg_e', SES, tool('p1', 'patch', { patchText: '*** Begin Patch' }, { metadata: { files: [{ file: 'new.ts', patch: '+x', additions: 1, deletions: 0, status: 'added' }, { file: '/elsewhere/old.ts', patch: '-y', additions: 0, deletions: 1, status: 'deleted' }] } })), ctx)
  assert.deepEqual(patch.changes.map((change) => [change.path, change.kind.type]), [['/w/new.ts', 'add'], ['/elsewhere/old.ts', 'delete']])
  const write = toolItem(toolPart('msg_e', SES, tool('w1', 'write', { path: 'n.txt', content: 'hi\n' })), ctx)
  assert.equal(write.changes[0].path, '/w/n.txt')
  assert.match(write.changes[0].diff, /\+hi/)
  const declinedByUser = toolItem(toolPart('msg_e', SES, tool('e2', 'edit', { path: 'a' }, { status: 'error', error: { type: 'aborted', message: 'The user declined this tool call' } })), ctx)
  assert.equal(declinedByUser.status, 'declined')
  const feedback = toolItem(toolPart('msg_e', SES, tool('e3', 'shell', { command: 'rm -rf x' }, { status: 'error', error: { type: 'permission.rejected', message: 'Use the trash instead' } })), ctx)
  assert.equal(feedback.status, 'declined', 'feedback text with none of 1.x\'s words is still a decline')
  const broke = toolItem(toolPart('msg_e', SES, tool('e4', 'shell', { command: 'x' }, { status: 'error', error: { type: 'tool.execution', message: 'permission denied by the user filesystem' } })), ctx)
  assert.equal(broke.status, 'failed', 'a tool failure is never read as a decline by its words')
})

test('the v2 tool names are v2\'s only: on the 1.x path `subagent` stays a plain tool row and FileDiff keys are not read', () => {
  const part = { id: 'p', type: 'tool', tool: 'subagent', callID: 'c', state: { status: 'completed', input: { agent: 'explore', prompt: 'x' }, output: 'ok', metadata: { sessionID: 'ses_c' } } }
  assert.equal(toolItem(part, { threadId: SES, cwd: '/w' }).type, 'dynamicToolCall')
  assert.equal(toolItem(part, { threadId: SES, cwd: '/w', api: 'v2' }).type, 'collabAgentToolCall')
  const edit = { id: 'p2', type: 'tool', tool: 'edit', callID: 'c2', state: { status: 'completed', input: { filePath: '/w/a' }, metadata: { files: [{ file: 'a', patch: 'x', status: 'added' }] } } }
  assert.notEqual(toolItem(edit, { threadId: SES, cwd: '/w' }).changes[0].kind.type, 'add')
})

test('errorInfoOfV2 reads the error type first', () => {
  const info = (type, extra = {}) => errorInfoOfV2({ type, message: 'm', ...extra })?.codexErrorInfo ?? null
  assert.equal(info('provider.auth'), 'unauthorized')
  assert.equal(info('provider.chatgpt-limit'), 'usageLimitExceeded')
  assert.equal(info('provider.free-limit'), 'usageLimitExceeded')
  assert.equal(info('provider.rate-limit'), 'rateLimitExceeded')
  assert.equal(info('provider.internal', { status: 529 }), 'serverOverloaded')
  assert.equal(info('provider.internal'), 'internalServerError')
  assert.deepEqual(info('provider.timeout'), { httpConnectionFailed: { httpStatusCode: 408 } })
  assert.deepEqual(info('provider.transport'), { httpConnectionFailed: { httpStatusCode: null } })
  assert.equal(info('provider.no-route'), 'badRequest')
  assert.equal(info('provider.content-filter'), 'other')
  assert.equal(errorInfoOfV2({ type: 'unknown', message: 'Payment required', status: 402 }).additionalDetails, 'BILLING')
  assert.equal(errorInfoOfV2({ type: 'aborted', message: 'x' }), null)
  assert.equal(errorInfoOfV2({ type: 'compaction.interrupted', message: 'x' }), null)
  assert.equal(info('provider.invalid-request', { message: 'prompt is too long: 300000 tokens' }), 'contextWindowExceeded')
  // The 1.x reader is unchanged.
  assert.equal(errorInfoOf({ name: 'ProviderAuthError', data: { message: 'bad key' } }).codexErrorInfo, 'unauthorized')
})
