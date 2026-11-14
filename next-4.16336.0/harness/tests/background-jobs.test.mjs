import test from 'node:test'
import assert from 'node:assert/strict'
import { ThreadProjector } from '../packages/codex-app-server/src/projection.js'
import { backgroundJobOf, backgroundTerminal, chunkText, jobReadOutput, jobStatusOf, killJobOf, noticeJobOf, pageOf, settledAgentJobItem, settledJobItem, subagentJobOf } from '../packages/codex-app-server/src/jobs.js'

let seq = -1
const ev = (type, data, extra = {}) => ({ type, data, seq: ++seq, time: 1_000_000 + seq * 10, ...extra })
const text = (value) => [{ type: 'text', text: value }]

// dsh-tool-bash / dsh-tool-jobs texts, verbatim shapes.
const PROMOTED = 'npm run dev\nready on :3000\n[still running after 120000ms; moved to background job bash-2]\nThe command keeps running in the background. You will be notified when it finishes; read newer output with job_output, stop it with job_kill.'

test('shell results that hand a command to the background name its job', () => {
  assert.deepEqual(backgroundJobOf('started background job bash-1', { command: 'x', run_in_background: true }), { jobId: 'bash-1', output: '' })
  assert.deepEqual(backgroundJobOf(PROMOTED), { jobId: 'bash-2', output: 'npm run dev\nready on :3000' })
  assert.deepEqual(backgroundJobOf(PROMOTED.slice('npm run dev\nready on :3000\n'.length)), { jobId: 'bash-2', output: '' })
  // A foreground command whose output only quotes the texts (cat of a test file, a log grep) is no job.
  assert.equal(backgroundJobOf('started background job bash-1', { command: 'echo started background job bash-1' }), null)
  assert.equal(backgroundJobOf('started background job bash-1'), null)
  assert.equal(backgroundJobOf(`const PROMOTED = '${PROMOTED}'\nmore lines\n[exit code: 0]`), null)
  assert.equal(backgroundJobOf('log\n[still running after 5ms; moved to background job bash-7]\nlater line'), null)
  assert.equal(backgroundJobOf('hello\n[exit code: 0]'), null)
  assert.equal(backgroundJobOf(undefined), null)
})

test('job reads, notices and kills report how a job ended', () => {
  assert.deepEqual(jobStatusOf('line\n[status: completed, exit code: 3]'), { status: 'completed', detail: 'exit code: 3' })
  assert.deepEqual(jobStatusOf('(no new output)\n[status: running]'), { status: 'running', detail: null })
  assert.equal(jobReadOutput('a\nb\n[status: running]'), 'a\nb')
  assert.equal(jobReadOutput('(no new output)\n[status: running]'), '')
  assert.deepEqual(noticeJobOf('background job bash-1 (bash: sleep 1; echo [x]) finished [status: completed, exit code: 0]. Read its output with job_output.'),
    { jobId: 'bash-1', status: 'completed', detail: 'exit code: 0' })
  assert.deepEqual(noticeJobOf('background job bash-4 (bash: yes) finished [status: killed, signal: SIGTERM; Stopped from OpenClaude Desktop]. Read its output with job_output.'),
    { jobId: 'bash-4', status: 'killed', detail: 'signal: SIGTERM; Stopped from OpenClaude Desktop' })
  assert.deepEqual(noticeJobOf('background job bash-9\n[notice truncated]\nDone; job_output.'), { jobId: 'bash-9', status: 'completed', detail: null })
  assert.equal(noticeJobOf('something else'), null)
  assert.deepEqual(killJobOf('requested cancellation of job bash-3'), { jobId: 'bash-3', status: 'killed', detail: null })
  assert.deepEqual(killJobOf('job bash-3 had already finished [status: completed, exit code: 1]'), { jobId: 'bash-3', status: 'completed', detail: 'exit code: 1' })
})

test('a settled job maps to the Codex command outcome', () => {
  const item = { type: 'commandExecution', id: 'c', status: 'inProgress', processId: 'bash-1' }
  assert.deepEqual(settledJobItem(item, { status: 'completed', detail: 'exit code: 0' }, 5), { ...item, status: 'completed', exitCode: 0, durationMs: 5 })
  assert.equal(settledJobItem(item, { status: 'completed', detail: 'exit code: 2' }, 5).status, 'failed')
  assert.equal(settledJobItem(item, { status: 'killed', detail: 'signal: SIGTERM' }, 5).status, 'interrupted')
  assert.equal(settledJobItem(item, { status: 'failed', detail: 'spawn failed' }, 5).status, 'failed')
  assert.equal(chunkText([{ at: 0, text: 'a', channel: 'stdout' }, { at: 1, text: 'phase', channel: 'log' }, { at: 6, text: 'b', channel: 'stderr' }]), 'ab')
  assert.deepEqual(backgroundTerminal({ id: 'c', command: 'npm run dev', cwd: '/w' }, 'bash-1'), { itemId: 'c', processId: 'bash-1', command: 'npm run dev', cwd: '/w', osPid: null, cpuPercent: null, rssKb: null })
  assert.deepEqual(pageOf([1, 2, 3], { limit: 2 }), { data: [1, 2], nextCursor: '2' })
  assert.deepEqual(pageOf([1, 2, 3], { cursor: '2', limit: 2 }), { data: [3], nextCursor: null })
})

/** One turn whose bash call returned `result`. */
function backgroundTurn(p, { turn = 1, callId = 'call-1', result = 'started background job bash-1', command = 'npm run dev', background = true } = {}) {
  const notes = []
  notes.push(...p.apply(ev('turn/start', { turn })))
  notes.push(...p.apply(ev('user/message', { id: `u${turn}`, content: text('start the server'), source: { kind: 'user' } })))
  notes.push(...p.apply(ev('tool/call', { turn, step: 1, callId, name: 'bash', arguments: JSON.stringify(background ? { command, run_in_background: true } : { command }) })))
  notes.push(...p.apply(ev('tool/result', { turn, step: 1, message: { toolCallId: callId, content: text(result), isError: false } })))
  return notes
}

test('a backgrounded command keeps running past its turn, with the job as its processId', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  const started = backgroundTurn(p)
  const announced = started.filter((note) => note.params?.item?.id === 'call-1').at(-1)
  assert.equal(announced.method, 'item/started')
  assert.equal(announced.params.item.status, 'inProgress')
  assert.equal(announced.params.item.processId, 'bash-1')
  const end = p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  // The client settles open items at turn/completed: the running command is announced again after it.
  assert.deepEqual(end.map((note) => note.method), ['turn/completed', 'item/started'])
  assert.equal(end[1].params.item.status, 'inProgress')
  assert.equal(p.turns[0].items.find((item) => item.id === 'call-1').status, 'inProgress')
  assert.deepEqual(p.runningJobs().map(({ jobId, item }) => [jobId, item.id]), [['bash-1', 'call-1']])
  // Its completion notice ends it.
  const done = p.apply(ev('user/message', { id: 'n1', content: text('background job bash-1 (bash: npm run dev) finished [status: completed, exit code: 0]. Read its output with job_output.'), source: { kind: 'tool-jobs', form: 'notice' } }))
  assert.equal(done.at(-1).method, 'item/completed')
  assert.equal(done.at(-1).params.item.status, 'completed')
  assert.equal(done.at(-1).params.item.exitCode, 0)
  assert.deepEqual(p.runningJobs(), [])
})

test('live output streams as outputDelta; job_output reads do not double it once fed live', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(p, { result: PROMOTED })
  assert.equal(p.jobItem('bash-2').aggregatedOutput, 'npm run dev\nready on :3000')
  // The first live read replaces the text with the ring's retained output.
  const first = p.jobOutput('bash-2', 'npm run dev\nready on :3000\nGET /', { replace: true })
  assert.deepEqual(first.map((note) => [note.method, note.params.delta]), [['item/commandExecution/outputDelta', '\nGET /']])
  const next = p.jobOutput('bash-2', ' 200\n')
  assert.equal(next[0].params.delta, ' 200\n')
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 'read-1', name: 'job_output', arguments: JSON.stringify({ job_id: 'bash-2' }) }))
  p.apply(ev('tool/result', { turn: 1, step: 2, message: { toolCallId: 'read-1', content: text('GET / 200\n[status: running]'), isError: false } }))
  assert.equal(p.jobItem('bash-2').aggregatedOutput, 'npm run dev\nready on :3000\nGET / 200\n')
})

test('history: job_output reads add output; a terminal read or a kill ends the job', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(p)
  p.apply(ev('tool/call', { turn: 1, step: 2, callId: 'read-1', name: 'job_output', arguments: JSON.stringify({ job_id: 'bash-1', wait: true }) }))
  const read = p.apply(ev('tool/result', { turn: 1, step: 2, message: { toolCallId: 'read-1', content: text('built\n[status: completed, exit code: 1]'), isError: false } }))
  const settled = read.find((note) => note.params?.item?.id === 'call-1')
  assert.equal(settled.params.item.status, 'failed')
  assert.equal(settled.params.item.exitCode, 1)
  assert.equal(settled.params.item.aggregatedOutput, 'built')

  const q = new ThreadProjector({ threadId: 'q', cwd: '/w' })
  backgroundTurn(q)
  q.apply(ev('tool/call', { turn: 1, step: 2, callId: 'kill-1', name: 'job_kill', arguments: JSON.stringify({ job_id: 'bash-1' }) }))
  q.apply(ev('tool/result', { turn: 1, step: 2, message: { toolCallId: 'kill-1', content: text('requested cancellation of job bash-1'), isError: false } }))
  assert.equal(q.turns[0].items.find((item) => item.id === 'call-1').status, 'interrupted')
})

test('jobs do not outlive their agent: a resume, a reused id or a stored read ends them', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(p)
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  p.apply(ev('request/header', { header: {}, reason: 'resume' }))
  assert.equal(p.turns[0].items.find((item) => item.id === 'call-1').status, 'interrupted')

  // Ids restart with each process: a new bash-1 ends an older unsettled one.
  const q = new ThreadProjector({ threadId: 'q', cwd: '/w' })
  backgroundTurn(q, { turn: 1, callId: 'old' })
  q.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  backgroundTurn(q, { turn: 2, callId: 'new' })
  assert.equal(q.turns[0].items.find((item) => item.id === 'old').status, 'interrupted')
  assert.equal(q.jobItem('bash-1').id, 'new')
  assert.deepEqual(q.settleJobs().map((note) => note.params.item.id), ['new'])
  assert.deepEqual(q.runningJobs(), [])
})

test('a user fork shows the copied rows but not the parent\'s jobs', () => {
  const p = new ThreadProjector({ threadId: 'fork', cwd: '/w' })
  backgroundTurn(p)
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  p.apply(ev('session/end-seed', { inherited: true }))
  const row = p.turns[0].items.find((item) => item.id === 'call-1')
  assert.equal(row.status, 'completed')
  assert.equal(row.processId, null)
  assert.deepEqual(p.runningJobs(), [])
})

test('an errored or foreground shell result is an ordinary command row', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(p, { result: 'hello\n[exit code: 0]' })
  const row = p.turns[0].items.find((item) => item.id === 'call-1')
  assert.equal(row.status, 'completed')
  assert.equal(row.processId, null)
  assert.deepEqual(p.runningJobs(), [])
})

test('a foreground result that quotes the job markers stays a completed row with its full output', () => {
  const quoted = `line 1\n${PROMOTED}\nline 12\n[exit code: 0]`
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(p, { result: quoted, command: 'cat tests/background-jobs.test.mjs', background: false })
  const row = p.turns[0].items.find((item) => item.id === 'call-1')
  assert.equal(row.status, 'completed')
  assert.equal(row.processId, null)
  assert.match(row.aggregatedOutput, /line 12/)
  const q = new ThreadProjector({ threadId: 't', cwd: '/w' })
  backgroundTurn(q, { result: 'started background job bash-1', command: 'echo started background job bash-1', background: false })
  const echoed = q.turns[0].items.find((item) => item.id === 'call-1')
  assert.equal(echoed.status, 'completed')
  assert.equal(echoed.processId, null)
  assert.deepEqual([...p.runningJobs(), ...q.runningJobs()], [])
})

test('turns record the log position they ended at', () => {
  const p = new ThreadProjector({ threadId: 't', cwd: '/w' })
  p.apply(ev('turn/start', { turn: 1 }))
  p.apply(ev('user/message', { id: 'u1', content: text('a'), source: { kind: 'user' } }))
  const end = ev('turn/end', { turn: 1, reason: { kind: 'completed' } })
  p.apply(end)
  assert.equal(p.turns[0].endSeq, end.seq)
  p.apply(ev('compaction/start', { compactionId: 'c1', turn: null }))
  const compacted = ev('compaction/end', { compactionId: 'c1' })
  p.apply(compacted)
  assert.equal(p.turns[1].id, 'turn-cc1')
  assert.equal(p.turns[1].endSeq, compacted.seq)
})

/** One turn whose delegation went to the background as `jobId`; `catalog` says when the parent's catalog names the child. */
function delegationTurn(p, { turn = 1, callId = 'spawn-1', jobId = 'subagent-1', childId = 'child-1', name = 'subagent_fork', catalog = 'after' } = {}) {
  const notes = []
  const catalogEvent = () => notes.push(...p.apply(ev('subagent/catalog', { version: 0, childId, childCreatedAt: 1, mode: 'one-shot', label: 'bg child' })))
  notes.push(...p.apply(ev('turn/start', { turn })))
  notes.push(...p.apply(ev('user/message', { id: `u${turn}`, content: text('check it in the background'), source: { kind: 'user' } })))
  notes.push(...p.apply(ev('tool/call', { turn, step: 1, callId, name, arguments: JSON.stringify({ description: 'bg child', prompt: 'CHILD-TASK do it', run_in_background: true }) })))
  if (catalog === 'before') catalogEvent()
  notes.push(...p.apply(ev('tool/result', { turn, step: 1, message: { toolCallId: callId, content: text(`started background subagent job ${jobId}`), isError: false } })))
  if (catalog === 'after') catalogEvent()
  return notes
}

test('subagentJobOf reads only the background delegation result', () => {
  assert.equal(subagentJobOf('started background subagent job subagent-3'), 'subagent-3')
  assert.equal(subagentJobOf('started subagent child-1'), null)
  assert.equal(subagentJobOf('the child said: started background subagent job x\nmore'), null)
  assert.equal(subagentJobOf(undefined), null)
})

test('a background delegation keeps its row running, linked to the child, until its job settles', () => {
  for (const catalog of ['after', 'before']) {
    const p = new ThreadProjector({ threadId: 'parent', cwd: '/w' })
    const started = delegationTurn(p, { catalog })
    const last = started.filter((note) => note.params?.item?.id === 'spawn-1').at(-1)
    assert.equal(last.method, 'item/started', catalog)
    assert.equal(last.params.item.status, 'inProgress')
    assert.deepEqual(last.params.item.receiverThreadIds, ['child-1'])
    assert.deepEqual(last.params.item.agentsStates, { 'child-1': { status: 'running', message: null } })
    assert.equal(p.childLabel('child-1'), 'bg child')
    // Not a background terminal: the child is listed and stopped as a sub-agent thread.
    assert.deepEqual(p.runningJobs(), [])
    assert.deepEqual(p.trackedJobIds(), ['subagent-1'])
    const end = p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
    assert.deepEqual(end.map((note) => note.method), ['turn/completed', 'item/started'])
    assert.equal(end[1].params.item.status, 'inProgress')
    const done = p.apply(ev('user/message', { id: 'n1', content: text('background job subagent-1 (subagent: bg child) finished [status: completed]. Read its output with job_output.'), source: { kind: 'tool-jobs', form: 'notice' } }))
    const settled = done.find((note) => note.params?.item?.id === 'spawn-1')
    assert.equal(settled.method, 'item/completed')
    assert.equal(settled.params.item.status, 'completed')
    assert.deepEqual(settled.params.item.agentsStates, { 'child-1': { status: 'completed', message: null } })
    assert.deepEqual(p.trackedJobIds(), [])
  }
})

test('the catalog links a background child that starts after the parent turn ended', () => {
  const p = new ThreadProjector({ threadId: 'parent', cwd: '/w' })
  delegationTurn(p, { catalog: 'never' })
  p.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  const linked = p.apply(ev('subagent/catalog', { version: 0, childId: 'child-9', childCreatedAt: 1, mode: 'one-shot', label: 'bg child' }))
  assert.equal(linked.at(-1).method, 'item/started')
  assert.deepEqual(linked.at(-1).params.item.receiverThreadIds, ['child-9'])
  assert.equal(p.childTurnId('child-9'), p.turns[0].id)
})

test('a background delegation ends with a terminal read, a kill, a failure or its agent', () => {
  const read = new ThreadProjector({ threadId: 'p1', cwd: '/w' })
  delegationTurn(read)
  read.apply(ev('tool/call', { turn: 1, step: 2, callId: 'read-1', name: 'job_output', arguments: JSON.stringify({ job_id: 'subagent-1', wait: true }) }))
  const notes = read.apply(ev('tool/result', { turn: 1, step: 2, message: { toolCallId: 'read-1', content: text('All checks pass.\n[status: completed]'), isError: false } }))
  const row = notes.find((note) => note.params?.item?.id === 'spawn-1').params.item
  assert.deepEqual([row.status, row.agentsStates['child-1']], ['completed', { status: 'completed', message: 'All checks pass.' }])

  const kill = new ThreadProjector({ threadId: 'p2', cwd: '/w' })
  delegationTurn(kill)
  kill.apply(ev('tool/call', { turn: 1, step: 2, callId: 'kill-1', name: 'job_kill', arguments: JSON.stringify({ job_id: 'subagent-1' }) }))
  kill.apply(ev('tool/result', { turn: 1, step: 2, message: { toolCallId: 'kill-1', content: text('requested cancellation of job subagent-1'), isError: false } }))
  const stopped = kill.turns[0].items.find((item) => item.id === 'spawn-1')
  assert.deepEqual([stopped.status, stopped.agentsStates['child-1'].status], ['interrupted', 'interrupted'])

  const failed = new ThreadProjector({ threadId: 'p3', cwd: '/w' })
  delegationTurn(failed)
  failed.settleJob([], 'subagent-1', { status: 'failed', detail: 'Error: provider unavailable' })
  const errored = failed.turns[0].items.find((item) => item.id === 'spawn-1')
  assert.deepEqual([errored.status, errored.agentsStates['child-1']], ['failed', { status: 'errored', message: 'Error: provider unavailable' }])

  const resumed = new ThreadProjector({ threadId: 'p4', cwd: '/w' })
  delegationTurn(resumed)
  resumed.apply(ev('turn/end', { turn: 1, reason: { kind: 'completed' } }))
  resumed.apply(ev('request/header', { header: {}, reason: 'resume' }))
  assert.equal(resumed.turns[0].items.find((item) => item.id === 'spawn-1').status, 'interrupted')

  // A stopped parent turn does not stop the job; a user fork does not own it.
  const forked = new ThreadProjector({ threadId: 'p5', cwd: '/w' })
  delegationTurn(forked)
  forked.apply(ev('turn/end', { turn: 1, reason: { kind: 'aborted' } }))
  assert.equal(forked.turns[0].items.find((item) => item.id === 'spawn-1').status, 'inProgress')
  forked.apply(ev('session/end-seed', { inherited: true }))
  assert.equal(forked.turns[0].items.find((item) => item.id === 'spawn-1').status, 'completed')
  assert.deepEqual(forked.trackedJobIds(), [])
})

test('settledAgentJobItem keeps a child outcome another record already gave', () => {
  const item = { type: 'collabAgentToolCall', id: 's', tool: 'spawnAgent', status: 'inProgress', receiverThreadIds: ['c'], agentsStates: { c: { status: 'errored', message: null } } }
  assert.deepEqual(settledAgentJobItem(item, { status: 'completed' }, 'out').agentsStates, { c: { status: 'errored', message: 'out' } })
  assert.deepEqual(settledAgentJobItem({ ...item, receiverThreadIds: [], agentsStates: {} }, { status: 'completed' }).agentsStates, {})
})
