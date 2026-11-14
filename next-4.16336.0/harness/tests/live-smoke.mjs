// Live end-to-end smoke: OpenClaude Desktop's own CodexClient → DeepSeek core.
// Usage: node tests/live-smoke.mjs   (needs a DeepSeek key in ~/.dsh)
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const { CodexClient } = require('../../app/electron/codex.cjs')
const workspace = path.resolve(root, '../workspace')
// An "Add folder" directory outside the workspace (writableRoots beyond cwd).
const extraRoot = path.resolve(root, '../workspace-extra')
await fs.mkdir(workspace, { recursive: true })
await fs.rm(extraRoot, { recursive: true, force: true })
await fs.mkdir(extraRoot, { recursive: true })
await fs.writeFile(path.join(workspace, 'ui-smoke.txt'), 'CODE_DESKTOP_SMOKE_OK\n')
await fs.rm(path.join(workspace, 'deepseek-hello.txt'), { force: true })
await fs.rm(path.join(workspace, 'plan-smoke.txt'), { force: true })
await fs.rm(path.join(workspace, 'sub-smoke.txt'), { force: true })
await fs.rm(path.join(workspace, 'input-smoke.png'), { force: true })

const client = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
const events = []
const counts = {}
let waiters = []
// Question cards: approve a plan review, prefer a "blue" option, else the first option.
const answerQuestions = (params) => ({ answers: Object.fromEntries(params.questions.map((q) => [q.id, {
  answers: [q.id === 'plan-review' ? 'Approve' : q.options?.find((o) => /blue/i.test(o.label))?.label ?? q.options?.[0]?.label ?? 'blue'],
}])) })
client.on('event', (e) => {
  events.push(e)
  const key = e.kind === 'request' ? `request:${e.method}` : e.method
  counts[key] = (counts[key] || 0) + 1
  if (e.kind === 'request') {
    console.log('APPROVAL', e.method, JSON.stringify(e.params).slice(0, 400))
    client.respond(e.id, e.method === 'item/tool/requestUserInput' ? answerQuestions(e.params) : { decision: 'accept' }, e.bridgeApproval)
  }
  for (const w of waiters) w(e)
})
let smokeThreadId
// A solid-color RGB PNG (input step).
function solidPng(width, height, [r, g, b]) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0)
    return Buffer.concat([length, body, crc])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => [r, g, b]).flat())])
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))])
}
const waitFor = (pred, ms = 180000) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('timeout')), ms)
  const w = (e) => { if (pred(e)) { clearTimeout(t); waiters = waiters.filter((x) => x !== w); resolve(e) } }
  waiters.push(w)
})
// Like waitFor, but also matches events already received since `from`.
const waitSince = (from, pred, ms) => {
  const seen = events.slice(from).find(pred)
  return seen ? Promise.resolve(seen) : waitFor(pred, ms)
}
try {
  const init = await client.start()
  console.log('INIT', JSON.stringify(init))
  // A remembered Codex rollout id: threadNotFound, with no stderr stack.
  const stderr = []
  client.child?.stderr?.on('data', (chunk) => stderr.push(String(chunk)))
  const codexId = '01a0d269-0000-7000-8000-00000000c0de'
  for (const [method, params] of [['thread/read', { threadId: codexId, includeTurns: false }], ['thread/resume', { threadId: codexId }]]) {
    const outcome = await client.request(method, params).then(() => 'resolved', (error) => `${error.code} ${JSON.stringify(error.data)} ${error.message}`)
    console.log('NOT FOUND', method, outcome)
  }
  await new Promise((resolve) => setTimeout(resolve, 200))
  console.log('NOT FOUND stderr', JSON.stringify(stderr.join('').split('\n').filter((line) => line.includes(codexId)).slice(0, 3)))
  const models = await client.request('model/list', { limit: 100 })
  console.log('MODELS', models.data.map((m) => `${m.id}${m.isDefault ? '*' : ''} [${m.supportedReasoningEfforts.map((e) => e.reasoningEffort)}] default=${m.defaultReasoningEffort}`).join(' | '))
  console.log('ACCOUNT', JSON.stringify(await client.request('account/read', { refreshToken: false })))
  const t = await client.request('thread/start', { cwd: workspace, model: 'deepseek-v4-flash', sandbox: 'workspace-write', approvalPolicy: 'on-request', approvalsReviewer: 'user' })
  const threadId = t.thread.id
  smokeThreadId = threadId
  console.log('THREAD', threadId, t.model, t.cwd, JSON.stringify(t.sandbox))
  await client.request('thread/name/set', { threadId, name: 'DeepSeek core smoke' })
  const turn = await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'Read ui-smoke.txt in the current directory with a tool and reply with only its contents.', text_elements: [] }], effort: 'low' })
  console.log('TURN START', turn.turn.id)
  const done = await waitFor((e) => e.method === 'turn/completed')
  console.log('TURN DONE', JSON.stringify(done.params.turn))
  const agentText = events.filter((e) => e.method === 'item/completed' && e.params.item.type === 'agentMessage').map((e) => e.params.item.text)
  console.log('AGENT TEXT', JSON.stringify(agentText))
  const deltas = events.filter((e) => e.method === 'item/agentMessage/delta').map((e) => e.params.delta).join('')
  console.log('DELTA TEXT', JSON.stringify(deltas))
  const tools = events.filter((e) => e.method === 'item/completed' && !['agentMessage', 'reasoning', 'userMessage'].includes(e.params.item.type)).map((e) => ({ type: e.params.item.type, command: e.params.item.command, status: e.params.item.status, out: String(e.params.item.aggregatedOutput ?? '').slice(0, 80), actions: e.params.item.commandActions }))
  console.log('TOOLS', JSON.stringify(tools))

  // Second turn in Ask mode: a write must raise a fileChange approval.
  const turn2 = await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'Create a file named deepseek-hello.txt containing exactly: hello from deepseek', text_elements: [] }], approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false } })
  console.log('TURN2 START', turn2.turn.id)
  const done2 = await waitFor((e) => e.method === 'turn/completed' && e.params.turn.id !== turn.turn.id)
  console.log('TURN2 DONE', done2.params.turn.status)
  const changes = events.filter((e) => e.method === 'item/completed' && e.params.item.type === 'fileChange').map((e) => e.params.item)
  console.log('FILECHANGES', JSON.stringify(changes).slice(0, 600))
  console.log('FILE', JSON.stringify(await fs.readFile(path.join(workspace, 'deepseek-hello.txt'), 'utf8').catch((e) => e.code)))

  // Queue: a prompt queued while a turn runs becomes the next turn.
  const queueFrom = events.length
  const turn3 = await client.request('turn/start', { threadId, input: [{ type: 'text', text: 'Reply with only the word ALPHA.', text_elements: [] }], effort: 'low', approvalPolicy: 'on-request' })
  const queued = await client.request('thread/queue/add', { threadId, input: [{ type: 'text', text: 'Reply with only the word BRAVO.', text_elements: [] }], clientUserMessageId: 'smoke-queued-1' })
  console.log('QUEUE ADD', JSON.stringify(queued))
  console.log('QUEUE LIST', JSON.stringify(await client.request('thread/queue/list', { threadId })))
  const queuedTurnId = `turn-${queued.queuedSubmission.id}`
  await waitSince(queueFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === turn3.turn.id)
  const done4 = await waitSince(queueFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === queuedTurnId)
  const queuedText = events.slice(queueFrom).filter((e) => e.method === 'item/completed' && e.params.turnId === queuedTurnId && e.params.item.type === 'agentMessage').map((e) => e.params.item.text).at(-1)
  console.log('QUEUE RUN', JSON.stringify({ started: events.slice(queueFrom).filter((e) => e.method === 'turn/started').map((e) => e.params.turn.id), queuedTurn: done4.params.turn.status, text: queuedText, changed: events.slice(queueFrom).filter((e) => e.method === 'thread/queue/changed').length }))
  console.log('QUEUE AFTER', JSON.stringify(await client.request('thread/queue/list', { threadId })))

  // Compact: a manual compaction runs as its own turn and ends idle.
  const compactFrom = events.length
  console.log('COMPACT ACK', JSON.stringify(await client.request('thread/compact/start', { threadId })))
  const compacted = await waitSince(compactFrom, (e) => e.method === 'turn/completed' && /^turn-c/.test(e.params.turn.id), 300000)
  await new Promise((resolve) => setTimeout(resolve, 200))
  const compactWire = events.slice(compactFrom).filter((e) => e.method).map((e) => e.method === 'thread/status/changed' ? `status:${e.params.status.type}` : e.method.startsWith('item/') ? `${e.method}:${e.params.item?.type}` : e.method)
  console.log('COMPACT', JSON.stringify({ turn: compacted.params.turn, wire: compactWire }))

  const read = await client.request('thread/read', { threadId, includeTurns: true })
  console.log('READ turns', read.thread.turns.length, read.thread.turns.map((x) => `${x.id}:${x.status}:${x.items.map((i) => i.type).join(',')}`).join(' | '), 'name=', read.thread.name)
  const list = await client.request('thread/list', { limit: 5 })
  console.log('LIST', list.data.map((x) => `${x.id.slice(0, 8)} ${x.name} ${x.cwd}`).join(' | '))
  const usage = events.filter((e) => e.method === 'thread/tokenUsage/updated').at(-1)
  console.log('USAGE', JSON.stringify(usage?.params.tokenUsage))

  // Write lock: a second core cannot open the session while this one has it
  // loaded (sessionBusyElsewhere); thread/unsubscribe releases it. The second
  // core keeps its own bridge store, so its cold row comes from the cache.
  const otherState = await fs.mkdtemp(path.join(os.tmpdir(), 'code-desktop-smoke-core-'))
  const other = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000, env: { CODE_DESKTOP_CORE_STATE: otherState } })
  try {
    await other.start()
    const tryResume = () => other.request('thread/resume', { threadId }).then(() => 'resolved', (error) => `${error.code} ${error.data?.codexErrorInfo ?? error.message}`)
    const busy = await tryResume()
    const cold = (await other.request('thread/read', { threadId, includeTurns: false })).thread
    const unsubscribed = await client.request('thread/unsubscribe', { threadId })
    let reopened = busy
    for (let attempt = 0; attempt < 20 && reopened !== 'resolved'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      reopened = await tryResume()
    }
    const search = await client.request('thread/list', { searchTerm: 'CORE SMOKE', limit: 20 })
    console.log('UNLOAD', JSON.stringify({ busy, cold: { name: cold.name, preview: cold.preview, updatedAt: cold.updatedAt, createdAt: cold.createdAt, status: cold.status.type }, unsubscribed, reopened, search: search.data.map((x) => x.name) }))
  } catch (error) {
    console.log('UNLOAD ERROR', error.stack || error.message)
  } finally {
    await other.stopAndWait()
    await fs.rm(otherState, { recursive: true, force: true })
  }

  // Plan mode (app hint): no edit approval, exit_plan_mode → plan item + plan
  // review card; Approve implements the plan in the same turn.
  const planHint = { codeDesktop: { permissionMode: 'plan', afterPlan: 'auto' } }
  const pt = await client.request('thread/start', { cwd: workspace, model: 'deepseek-v4-flash', sandbox: 'read-only', approvalPolicy: 'on-request', approvalsReviewer: 'user', ...planHint })
  const planThread = pt.thread.id
  await client.request('thread/name/set', { threadId: planThread, name: 'DeepSeek core plan smoke' })
  const planFrom = events.length
  const planTurn = await client.request('turn/start', { threadId: planThread, input: [{ type: 'text', text: 'Create a file named plan-smoke.txt in the current directory containing exactly: PLAN_OK', text_elements: [] }], effort: 'low', approvalPolicy: 'on-request', sandboxPolicy: { type: 'readOnly', networkAccess: false }, ...planHint })
  const planDone = await waitSince(planFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === planTurn.turn.id, 300000)
  const planEvents = events.slice(planFrom).filter((e) => e.params?.threadId === planThread)
  console.log('PLAN', JSON.stringify({
    status: planDone.params.turn.status,
    planItem: planEvents.find((e) => e.method === 'item/completed' && e.params.item.type === 'plan')?.params.item.text.slice(0, 160) ?? null,
    requests: planEvents.filter((e) => e.kind === 'request').map((e) => `${e.method}:${e.params.itemId}:${e.params.questions?.map((q) => `${q.id}/${q.header}/${q.options?.map((o) => o.label).join('|')}`).join(',') ?? ''}`),
    flags: [...new Set(planEvents.filter((e) => e.method === 'thread/status/changed').flatMap((e) => e.params.status.activeFlags ?? []))],
    items: planEvents.filter((e) => e.method === 'item/completed' && !['agentMessage', 'reasoning', 'userMessage'].includes(e.params.item.type)).map((e) => `${e.params.item.type}:${e.params.item.tool ?? e.params.item.command ?? e.params.item.changes?.map((c) => c.path.split('/').pop()).join(',') ?? e.params.item.id}:${e.params.item.status ?? ''}`),
    file: await fs.readFile(path.join(workspace, 'plan-smoke.txt'), 'utf8').catch((error) => error.code),
  }))

  // ask_user_question (legacy tool) → the question card; the answer comes back.
  const askFrom = events.length
  const askTurn = await client.request('turn/start', { threadId: planThread, input: [{ type: 'text', text: 'Use the ask_user_question tool once to ask me whether I prefer red or blue (two options). Then reply with only the color I chose.', text_elements: [] }], effort: 'low', approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false }, codeDesktop: { permissionMode: 'auto', afterPlan: 'auto' } })
  await waitSince(askFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === askTurn.turn.id, 300000)
  const askEvents = events.slice(askFrom).filter((e) => e.params?.threadId === planThread)
  console.log('ASK', JSON.stringify({
    requests: askEvents.filter((e) => e.kind === 'request').map((e) => ({ itemId: e.params.itemId, turnId: e.params.turnId, isBlocking: e.params.isBlocking, questions: e.params.questions })),
    tool: askEvents.filter((e) => e.method === 'item/completed' && e.params.item.type === 'dynamicToolCall').map((e) => `${e.params.item.id}:${e.params.item.tool}:${e.params.item.status}:${JSON.stringify(e.params.item.contentItems ?? []).slice(0, 200)}`),
    reply: askEvents.filter((e) => e.method === 'item/completed' && e.params.item.type === 'agentMessage').map((e) => e.params.item.text).at(-1),
  }))

  // Extra writable root (Auto): Harness only knows cwd, so the write is denied,
  // retried as an escalation and allowed by the bridge without a card; a bash
  // escalation into the same folder still asks (English reason, grantable).
  const extraFrom = events.length
  const extraTurn = await client.request('turn/start', { threadId: planThread, input: [{ type: 'text', text: `Do these two steps in order. 1) Use the write tool to create ${extraRoot}/extra-root.txt containing exactly: EXTRA_ROOT_OK 2) Use the bash tool to run: touch ${extraRoot}/bash-touch.txt If the sandbox denies either call, retry that exact call once with sandbox_permissions set to danger-full-access and a one-sentence justification. Then reply with only DONE.`, text_elements: [] }], effort: 'low', approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace, extraRoot], networkAccess: false }, codeDesktop: { permissionMode: 'auto', afterPlan: 'auto' } })
  await waitSince(extraFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === extraTurn.turn.id, 300000)
  const extraEvents = events.slice(extraFrom).filter((e) => e.params?.threadId === planThread)
  console.log('EXTRA ROOT', JSON.stringify({
    requests: extraEvents.filter((e) => e.kind === 'request').map((e) => ({ method: e.method, itemId: e.params.itemId, reason: e.params.reason, sessionGrantable: e.params.sessionGrantable, command: e.params.command })),
    items: extraEvents.filter((e) => e.method === 'item/completed' && ['fileChange', 'commandExecution'].includes(e.params.item.type)).map((e) => `${e.params.item.type}:${e.params.item.command ?? e.params.item.changes?.map((c) => c.path.split('/').pop()).join(',')}:${e.params.item.status}`),
    file: await fs.readFile(path.join(extraRoot, 'extra-root.txt'), 'utf8').catch((error) => error.code),
    touched: await fs.stat(path.join(extraRoot, 'bash-touch.txt')).then(() => true, () => false),
  }))

  // Sub-agents: a continuable child in Ask mode. Its write asks on the root
  // thread's card; it is a spawned thread with its own turns; its settled
  // notice completes the parent's agent row without a user bubble.
  const st = await client.request('thread/start', { cwd: workspace, model: 'deepseek-v4-flash', sandbox: 'workspace-write', approvalPolicy: 'untrusted', approvalsReviewer: 'user' })
  const subThread = st.thread.id
  await client.request('thread/name/set', { threadId: subThread, name: 'DeepSeek core sub-agent smoke' })
  const subFrom = events.length
  const isCollab = (e) => e.params?.threadId === subThread && e.params.item?.type === 'collabAgentToolCall'
  const settledRow = (e) => e.method === 'item/completed' && isCollab(e) && Object.values(e.params.item.agentsStates ?? {}).some((state) => ['completed', 'errored', 'interrupted'].includes(state.status))
  const subTurn = await client.request('turn/start', { threadId: subThread, input: [{ type: 'text', text: 'Use the subagent tool exactly once, with description "Write sub marker" and this prompt: "Use the write tool to create sub-smoke.txt in the current directory containing exactly SUB_OK, then reply with only DONE." Do not create the file yourself. After the subagent tool returns, reply with only STARTED.', text_elements: [] }], effort: 'low', approvalPolicy: 'untrusted', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false } })
  await waitSince(subFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === subTurn.turn.id, 300000)
  const settled = await waitSince(subFrom, settledRow, 300000).catch(() => null)
  // The notice wakes the parent: wait for that turn too.
  await waitSince(subFrom, (e) => e.method === 'turn/completed' && e.params.threadId === subThread && e.params.turn.id !== subTurn.turn.id, 300000).catch(() => null)
  const subEvents = events.slice(subFrom)
  const childStarted = subEvents.find((e) => e.method === 'thread/started' && e.params.thread.parentThreadId === subThread)?.params.thread
  const childId = childStarted?.id
  const listed = await client.request('thread/list', { sourceKinds: ['subAgentThreadSpawn'], limit: 100 })
  const childRead = childId ? await client.request('thread/read', { threadId: childId, includeTurns: true }).catch((error) => ({ error: error.message })) : null
  const parentRead = await client.request('thread/read', { threadId: subThread, includeTurns: true })
  console.log('SUBAGENT', JSON.stringify({
    child: childStarted ? { id: childId, parentThreadId: childStarted.parentThreadId, source: childStarted.source, agentNickname: childStarted.agentNickname, status: childStarted.status } : null,
    childStatus: subEvents.filter((e) => e.method === 'thread/status/changed' && e.params.threadId === childId).map((e) => e.params.status.type),
    childTurns: subEvents.filter((e) => e.params?.threadId === childId && e.method?.startsWith('turn/')).map((e) => `${e.method}:${e.params.turn.id}:${e.params.turn.status}`),
    childItems: subEvents.filter((e) => e.params?.threadId === childId && e.method === 'item/completed').map((e) => `${e.params.item.type}:${e.params.item.status ?? ''}`),
    requests: subEvents.filter((e) => e.kind === 'request').map((e) => ({ method: e.method, threadId: e.params.threadId === subThread ? 'root' : e.params.threadId, itemId: e.params.itemId, reason: e.params.reason, command: e.params.command?.slice(0, 120), changes: e.params.changes?.map((c) => c.path.split('/').pop()), sessionGrantable: e.params.sessionGrantable })),
    rows: subEvents.filter(isCollab).map((e) => `${e.method}:${e.params.turnId}:${e.params.item.tool}:${e.params.item.status}:${JSON.stringify(e.params.item.receiverThreadIds)}:${JSON.stringify(e.params.item.agentsStates)}`),
    settled: settled?.params.item.agentsStates ?? null,
    activity: subEvents.filter((e) => e.params?.threadId === subThread && e.params.item?.type === 'subAgentActivity' && e.method === 'item/completed').map((e) => `${e.params.item.kind}:${e.params.item.agentThreadId === childId}`),
    parentUserMessages: parentRead.thread.turns.flatMap((turn) => turn.items.filter((item) => item.type === 'userMessage').map((item) => item.content.map((c) => c.text).join(' ').slice(0, 40))),
    parentTurns: parentRead.thread.turns.map((turn) => `${turn.id}:${turn.status}:${turn.items.map((item) => item.type).join(',')}`),
    listed: listed.data.filter((thread) => thread.parentThreadId === subThread).map((thread) => `${thread.id === childId}:${thread.agentNickname}:${thread.status.type}:${thread.source?.subAgent?.thread_spawn?.parent_thread_id === subThread}`),
    childRead: childRead?.thread ? { agentNickname: childRead.thread.agentNickname, parentThreadId: childRead.thread.parentThreadId, turns: childRead.thread.turns.map((turn) => `${turn.id}:${turn.status}:${turn.items.map((item) => item.type).join(',')}`) } : childRead,
    file: await fs.readFile(path.join(workspace, 'sub-smoke.txt'), 'utf8').catch((error) => error.code),
  }))

  // Stop reaches a child: Auto mode, a child that sleeps; turn/interrupt on
  // the child id once its turn is announced; its notice reads as stopped.
  const stopFrom = events.length
  const stopTurn = await client.request('turn/start', { threadId: subThread, input: [{ type: 'text', text: 'Use the subagent tool exactly once, with description "Sleep task" and this prompt: "Run the bash command sleep 90, then reply with only DONE." After the subagent tool returns, reply with only STARTED.', text_elements: [] }], effort: 'low', approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false } })
  const sleepStart = await waitSince(stopFrom, (e) => e.method === 'thread/started' && e.params.thread.parentThreadId === subThread && e.params.thread.agentNickname === 'Sleep task', 300000).catch(() => null)
  const sleeperId = sleepStart?.params.thread.id
  const sleeperBash = sleeperId ? await waitSince(stopFrom, (e) => e.method === 'item/started' && e.params.threadId === sleeperId && e.params.item.type === 'commandExecution', 300000).catch(() => null) : null
  const sleeperTurn = events.slice(stopFrom).filter((e) => e.method === 'turn/started' && e.params.threadId === sleeperId).at(-1)?.params.turn.id
  const stopAck = sleeperId ? await client.request('turn/interrupt', { threadId: sleeperId, turnId: sleeperTurn ?? 'none' }).then(() => 'ok', (error) => error.message) : 'no child'
  const stopped = await waitSince(stopFrom, (e) => settledRow(e) && e.params.item.receiverThreadIds.includes(sleeperId), 120000).catch(() => null)
  await waitSince(stopFrom, (e) => e.method === 'turn/completed' && e.params.threadId === subThread && e.params.turn.id !== stopTurn.turn.id, 300000).catch(() => null)
  console.log('SUBAGENT STOP', JSON.stringify({
    child: sleeperId ?? null, bashStarted: Boolean(sleeperBash), childTurn: sleeperTurn ?? null, ack: stopAck,
    childTurns: events.slice(stopFrom).filter((e) => e.params?.threadId === sleeperId && e.method === 'turn/completed').map((e) => `${e.params.turn.id}:${e.params.turn.status}`),
    childBash: events.slice(stopFrom).filter((e) => e.params?.threadId === sleeperId && e.method === 'item/completed' && e.params.item.type === 'commandExecution').map((e) => e.params.item.status),
    settled: stopped?.params.item.agentsStates?.[sleeperId] ?? null,
  }))

  // User input: a localImage goes to the attachment store and reaches the
  // vision model as an image block; the bubble gets Codex parts back (a
  // mention card, an image tile at the stored copy); a text-only model refuses.
  const imagePath = path.join(workspace, 'input-smoke.png')
  await fs.writeFile(imagePath, solidPng(16, 16, [220, 20, 20]))
  const it = await client.request('thread/start', { cwd: workspace, model: 'deepseek-flash', sandbox: 'workspace-write', approvalPolicy: 'on-request', approvalsReviewer: 'user' })
  const inputThread = it.thread.id
  await client.request('thread/name/set', { threadId: inputThread, name: 'DeepSeek core input smoke' })
  const inputFrom = events.length
  const inputTurn = await client.request('turn/start', { threadId: inputThread, input: [{ type: 'text', text: 'What is the dominant color of the attached image? Do not use any tool. Reply with only the color name in English.', text_elements: [] }, { type: 'mention', name: 'ui-smoke.txt', path: path.join(workspace, 'ui-smoke.txt') }, { type: 'localImage', path: imagePath }], effort: 'low' })
  await waitSince(inputFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === inputTurn.turn.id, 300000)
  const inputEvents = events.slice(inputFrom).filter((e) => e.params?.threadId === inputThread)
  const inputRead = await client.request('thread/read', { threadId: inputThread, includeTurns: true })
  const pro = await client.request('thread/start', { cwd: workspace, model: 'deepseek-v4-pro', sandbox: 'workspace-write', approvalPolicy: 'on-request', approvalsReviewer: 'user' })
  const parts = (content) => content?.map((part) => part.type === 'text' ? `text:${part.text.slice(0, 24)}` : part.type === 'localImage' ? `localImage:${part.path.includes('/attachments/') ? 'store' : part.path}` : `${part.type}:${part.name}`)
  console.log('INPUT', JSON.stringify({
    model: it.model,
    live: parts(inputEvents.find((e) => e.method === 'item/started' && e.params.item.type === 'userMessage')?.params.item.content),
    replay: parts(inputRead.thread.turns[0]?.items.find((item) => item.type === 'userMessage')?.content),
    preview: inputRead.thread.preview,
    tools: inputEvents.filter((e) => e.method === 'item/completed' && !['agentMessage', 'reasoning', 'userMessage'].includes(e.params.item.type)).map((e) => e.params.item.type),
    reply: inputEvents.filter((e) => e.method === 'item/completed' && e.params.item.type === 'agentMessage').map((e) => e.params.item.text).at(-1),
    status: inputRead.thread.turns[0]?.status,
    textOnly: await client.request('turn/start', { threadId: pro.thread.id, input: [{ type: 'text', text: 'x', text_elements: [] }, { type: 'localImage', path: imagePath }] }).then(() => 'resolved', (error) => `${error.code} ${error.message}`),
  }))
  // Live Mode change (codeDesktop/thread/permissions, capabilities.livePermissions; OpenClaude Desktop F05): a turn started
  // in Auto runs a bash sleep; while it runs the app switches to Manual (approvalPolicy untrusted + permissionMode
  // 'ask'), so the write after it asks for approval (auto-accepted here). An unknown thread answers applied:false.
  await fs.rm(path.join(workspace, 'live-mode.txt'), { force: true })
  const auto = { approvalPolicy: 'on-request', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [workspace], networkAccess: false }, codeDesktop: { permissionMode: 'auto', afterPlan: 'auto' } }
  const lm = await client.request('thread/start', { cwd: workspace, model: 'deepseek-v4-flash', sandbox: 'workspace-write', approvalPolicy: 'on-request', approvalsReviewer: 'user', codeDesktop: auto.codeDesktop })
  const liveThread = lm.thread.id
  await client.request('thread/name/set', { threadId: liveThread, name: 'DeepSeek core live mode smoke' })
  const liveFrom = events.length
  const liveTurn = await client.request('turn/start', { threadId: liveThread, input: [{ type: 'text', text: 'Do these two steps in order. 1) Use the bash tool to run: sleep 8 2) Then use the write tool to create live-mode.txt in the current directory containing exactly: LIVE_OK. Then reply with only DONE.', text_elements: [] }], effort: 'low', ...auto })
  const sleeping = await waitSince(liveFrom, (e) => e.method === 'item/started' && e.params.threadId === liveThread && e.params.item.type === 'commandExecution', 300000).catch(() => null)
  const applied = await client.request('codeDesktop/thread/permissions', { threadId: liveThread, approvalsReviewer: 'user', approvalPolicy: 'untrusted',
    sandboxPolicy: auto.sandboxPolicy, codeDesktop: { permissionMode: 'ask', afterPlan: 'auto' } }).catch((error) => `${error.code} ${error.message}`)
  const liveDone = await waitSince(liveFrom, (e) => e.method === 'turn/completed' && e.params.turn.id === liveTurn.turn.id, 300000).catch(() => null)
  const liveEvents = events.slice(liveFrom)
  console.log('LIVE MODE', JSON.stringify({
    sleeping: sleeping?.params.item.command ?? null,
    applied,
    unknown: await client.request('codeDesktop/thread/permissions', { threadId: 'live-mode-unknown-thread', approvalPolicy: 'untrusted' }).catch((error) => `${error.code} ${error.message}`),
    approvalsAfter: liveEvents.filter((e) => e.kind === 'request' && e.params?.threadId === liveThread).map((e) => e.method),
    file: await fs.readFile(path.join(workspace, 'live-mode.txt'), 'utf8').catch((error) => error.code),
    status: liveDone?.params.turn.status ?? 'timeout',
  }))
  console.log('COUNTS', JSON.stringify(counts))
} catch (error) {
  console.log('ERROR', error.stack || error.message)
} finally {
  await client.stopAndWait()
}

// Cold resume in a fresh core: usage (and a plan, when the session has one)
// is replayed as notifications after the thread/resume response line.
if (smokeThreadId) {
  const resumed = new CodexClient({ binary: path.join(root, 'bin/codex-app-server.mjs'), initializeTimeout: 60000 })
  const wire = []
  const receive = resumed.receive.bind(resumed)
  resumed.receive = (message, connection) => {
    wire.push(message.method ?? (message.result?.thread ? 'response:thread/resume' : `response:${message.id}`))
    return receive(message, connection)
  }
  try {
    await resumed.start()
    // Not loaded in this core: the row comes from the header and the projection cache.
    const cold = (await resumed.request('thread/read', { threadId: smokeThreadId, includeTurns: false })).thread
    console.log('COLD READ', JSON.stringify({ name: cold.name, preview: cold.preview, updatedAt: cold.updatedAt, status: cold.status.type }))
    const usageEvent = new Promise((resolve) => resumed.on('event', (e) => { if (e.method === 'thread/tokenUsage/updated') resolve(e) }))
    const response = await resumed.request('thread/resume', { threadId: smokeThreadId })
    const usage = await Promise.race([usageEvent, new Promise((resolve) => setTimeout(() => resolve(null), 15000))])
    const lastTurn = response.thread.turns.at(-1)?.id
    console.log('RESUME USAGE', JSON.stringify({ turnId: usage?.params.turnId, lastTurn, context: usage?.params.tokenUsage.last.totalTokens, window: usage?.params.tokenUsage.modelContextWindow }))
    const after = wire.indexOf('thread/tokenUsage/updated') > wire.indexOf('response:thread/resume')
    console.log('RESUME ORDER', usage ? (after ? 'usage after response' : 'usage BEFORE response') : 'no usage replayed', JSON.stringify(wire.slice(-6)))
  } catch (error) {
    console.log('RESUME ERROR', error.stack || error.message)
  } finally {
    await resumed.stopAndWait()
  }
}
