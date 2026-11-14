#!/usr/bin/env node
// A stand-in for `zcode app-server --stdio` (tests only): answers the requests the bridge makes around sessions with
// minimal results and appends every request to FAKE_ZCODE_LOG ({method, params} per line). `--version` prints one.
import fs from 'node:fs'
import readline from 'node:readline'

if (process.argv.includes('--version')) {
  process.stdout.write('zcode 9.9.9\n')
  process.exit(0)
}
let counter = 0
const log = (method, params) => { if (process.env.FAKE_ZCODE_LOG) fs.appendFileSync(process.env.FAKE_ZCODE_LOG, `${JSON.stringify({ method, params })}\n`) }
const now = Date.now()
const session = (sessionId, workspace) => ({ sessionId, title: 'fake', createdAt: now, updatedAt: now, ...(workspace ? { workspace } : {}) })
const reply = (id, result) => process.stdout.write(`${JSON.stringify({ id, result })}\n`)
const notify = (method, params) => process.stdout.write(`${JSON.stringify({ method, params })}\n`)

// FAKE_ZCODE_WORKFLOW (a JSON state file): sessions named sess_wf_* hold one dynamic workflow run, dwfrun-a, started by
// the CreateWorkflow call toolu_wf of their only turn; its journal (v4/conversation/workflowRunEvents) is scripted below
// and kept in the file, so a second fake process (a restarted bridge) reads the same run. session/cancelBackgroundTask
// of dwfrun-a stops it as ZCode's run service does: the live agent is cancelled, the run settles stopped (user).
const WORKFLOW_EVENTS = [
  ['run-started', { runId: 'dwfrun-a', caps: { maxConcurrency: 4 } }],
  ['run-launched', { inputId: 'in_1', toolCallId: 'toolu_wf', phaseNames: ['Scan', 'Fix'], subagentModel: 'zai/glm-5' }],
  ['phase-entered', { name: 'Scan', ordinal: 1 }],
  ['actor-created', { actor: { siteId: 'actor#1', ordinal: 0 }, name: 'scanner', phaseName: 'Scan' }],
  ['node-queued', { instance: { siteId: 'ask#1', ordinal: 0 }, kind: 'ask', actor: { siteId: 'actor#1', ordinal: 0 }, phaseName: 'Scan', instructionsHead: 'Scan the repo for TODOs' }],
  ['node-dispatched', { instance: { siteId: 'ask#1', ordinal: 0 }, kind: 'ask', actor: { siteId: 'actor#1', ordinal: 0 }, actorName: 'scanner', actorPhaseName: 'Scan' }],
  ['node-executing', { instance: { siteId: 'ask#1', ordinal: 0 } }],
  ['node-settled', { instance: { siteId: 'ask#1', ordinal: 0 }, outcome: 'ok' }],
  ['node-queued', { instance: { siteId: 'world-read#1', ordinal: 0 }, kind: 'world-read', phaseName: 'Scan' }],
  ['node-settled', { instance: { siteId: 'world-read#1', ordinal: 0 }, outcome: 'ok' }],
  ['phase-entered', { name: 'Fix', ordinal: 1 }],
  ['actor-created', { actor: { siteId: 'actor#2', ordinal: 0 }, name: 'fixer', phaseName: 'Fix' }],
  ['node-queued', { instance: { siteId: 'ask#2', ordinal: 0 }, kind: 'ask', actor: { siteId: 'actor#2', ordinal: 0 }, phaseName: 'Fix', instructionsHead: 'Fix each TODO' }],
  ['node-executing', { instance: { siteId: 'ask#2', ordinal: 0 } }],
  ['usage-updated', { spentTokens: 1234 }],
]
// FAKE_ZCODE_ARTIFACTS=1: dwfrun-a also publishes a primary markdown report and a table fed by two reports
// (artifact-published / report journal events), served by workflowRunArtifacts / ArtifactRead / ArtifactData.
const ARTIFACT_REPORT = '# Review\n\nAll TODOs are fixed.\n'
if (process.env.FAKE_ZCODE_ARTIFACTS === '1') WORKFLOW_EVENTS.push(
  ['artifact-published', { instance: { siteId: 'artifact#1', ordinal: 0 }, artifact: { id: 'todos', kind: 'table', version: 1, title: 'TODOs', spec: { columns: [{ field: 'file' }, { field: 'line' }] }, publishedAt: 4000 } }],
  ['report', { instance: { siteId: 'report#1', ordinal: 0 }, item: { file: 'a.js', line: 3 }, artifactId: 'todos' }],
  ['report', { instance: { siteId: 'report#1', ordinal: 1 }, item: { file: 'b.js', line: 9 }, artifactId: 'todos' }],
  ['artifact-published', { instance: { siteId: 'artifact#2', ordinal: 0 }, artifact: { id: 'report', kind: 'markdown', version: 1, title: 'Review', contentType: 'text/markdown', bytes: ARTIFACT_REPORT.length, uri: 'zcode-artifact://r', primary: true, publishedAt: 4100 } }],
)
const workflowFile = process.env.FAKE_ZCODE_WORKFLOW || null
function workflow() {
  if (!workflowFile) return null
  try { return JSON.parse(fs.readFileSync(workflowFile, 'utf8')) } catch {}
  const fresh = { status: 'running', events: WORKFLOW_EVENTS.map(([type, payload], index) => ({ sequence: index + 1, type, payload })) }
  fs.writeFileSync(workflowFile, JSON.stringify(fresh))
  return fresh
}
const isWorkflowSession = (sessionId) => !!workflowFile && String(sessionId).startsWith('sess_wf')
const workflowMessages = () => [
  { info: { role: 'user', id: 'msg_u1', time: { created: 1000 }, anchor: { turnId: 'turn_1' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'audit the TODOs' }] },
  { info: { role: 'assistant', id: 'msg_a1', time: { created: 1100, completed: 1300 }, anchor: { turnId: 'turn_1' } }, parts: [
    { type: 'tool', tool: 'CreateWorkflow', callID: 'toolu_wf', state: { status: 'completed', input: { name: 'todo-audit', script: 'phase("Scan")' }, output: 'The workflow script compiled cleanly and the run started in the background with ID: dwfrun-a. It is still running — you will be notified with the final output when it completes.', time: { start: 1150, end: 1200 } } },
    { type: 'text', text: 'Started the audit.' },
  ] },
]

function answer(method, params) {
  switch (method) {
    case 'session/create': return { session: session(`sess_fake_${process.pid}_${++counter}`, params.workspace), settings: {} }
    case 'session/resume': return { session: session(params.sessionId, params.workspace), settings: {} }
    case 'session/fork': return { forkedSessionId: `sess_fork_${process.pid}_${++counter}`, parentSessionId: params.sessionId }
    // One finished turn, so a session can be forked.
    case 'session/messages': return isWorkflowSession(params.sessionId) ? { messages: workflowMessages() } : { messages: [
      { info: { role: 'user', id: 'msg_u1', time: { created: 1000 }, anchor: { turnId: 'turn_1' }, semantics: { origin: 'real_user', kind: 'user_prompt', uiVisibility: 'visible' } }, parts: [{ type: 'text', text: 'hello' }] },
      { info: { role: 'assistant', id: 'msg_a1', time: { created: 1100, completed: 1200 }, anchor: { turnId: 'turn_1' } }, parts: [{ type: 'text', text: 'hi' }] },
    ] }
    case 'session/list': return { sessions: [] }
    case 'v4/conversation/workflowRuns': {
      const run = isWorkflowSession(params.sessionId) ? workflow() : null
      return { runs: run ? [{ runId: 'dwfrun-a', toolCallId: 'toolu_wf', label: 'todo-audit', updatedAt: 5000, status: run.status, ...(run.status === 'stopped' ? { stopReason: run.b ? 'superseded' : 'user' } : {}), resumable: run.status === 'stopped' && !run.b },
        ...(run.b ? [{ runId: 'dwfrun-b', toolCallId: 'settings-2', label: 'todo-audit', updatedAt: 6000, status: 'running' }] : [])] : [] }
    }
    case 'v4/conversation/workflowRunEvents': {
      const own = isWorkflowSession(params.sessionId) ? workflow() : null
      const run = own && params.runId === 'dwfrun-a' ? own : own && params.runId === 'dwfrun-b' && own.b ? { events: own.b } : null
      const events = (run?.events ?? []).filter((event) => event.sequence > (params.afterSequence ?? 0))
      const page = events.slice(0, params.limit ?? 500)
      return { events: page, hasMore: events.length > page.length }
    }
    // Saved workflows (SaveWorkflow's library): "pr-review" in the project, "nightly" global (and a broken file).
    case 'workflows/list': return params.scope === 'global'
      ? { workflows: [{ name: 'nightly', description: 'Nightly checks', scope: 'global', path: '/home/.zcode/workflows/nightly.dwf.ts' }, { name: 'pr-review', description: 'Shadowed', scope: 'global', path: '/home/.zcode/workflows/pr-review.dwf.ts' }], invalid: [], dir: '/home/.zcode/workflows' }
      : { workflows: [{ name: 'pr-review', description: 'Review a PR', whenToUse: 'When asked to review', args: { pr: { type: 'string', required: true, description: 'PR number' } }, scope: 'project', path: `${params.workspace.workspacePath}/.zcode/workflows/pr-review.dwf.ts` }], invalid: [{ path: `${params.workspace.workspacePath}/.zcode/workflows/bad.dwf.ts`, reason: 'parse_error' }], dir: `${params.workspace.workspacePath}/.zcode/workflows` }
    case 'workflows/get': return params.name === 'pr-review' ? { ok: true, name: 'pr-review', path: '/p/.zcode/workflows/pr-review.dwf.ts', scope: 'project', meta: { description: 'Review a PR', args: { pr: { type: 'string', required: true } } }, script: 'phase("Review")' } : { ok: false, reason: 'not_found' }
    case 'workflows/delete': return params.name === 'pr-review' ? { ok: true, path: '/p/.zcode/workflows/pr-review.dwf.ts' } : { ok: false, reason: 'not_found' }
    case 'workflows/runs': return { runs: [{ runId: 'dwfrun-old', name: params.name, status: 'completed', createdAt: 1000, updatedAt: 2000, spentTokens: 321, args: { pr: '12' } }] }
    case 'v4/conversation/workflowRunArtifacts': {
      if (!isWorkflowSession(params.sessionId) || params.runId !== 'dwfrun-a' || process.env.FAKE_ZCODE_ARTIFACTS !== '1') return { artifacts: [] }
      return { artifacts: [
        { id: 'report', kind: 'markdown', title: 'Review', contentType: 'text/markdown', version: 1, versions: [{ version: 1, title: 'Review', contentType: 'text/markdown', bytes: ARTIFACT_REPORT.length, uri: 'zcode-artifact://r', publishedAt: 4100, primary: true }], itemCount: 0, primary: true },
        { id: 'todos', kind: 'table', title: 'TODOs', spec: { columns: [{ field: 'file' }, { field: 'line' }] }, version: 1, versions: [{ version: 1, publishedAt: 4000 }], itemCount: 2 },
      ] }
    }
    case 'v4/conversation/workflowRunArtifactRead': {
      if (params.artifactId !== 'report') return { dataBase64: '', mediaType: 'application/octet-stream', totalBytes: 0, nextOffset: null }
      const bytes = Buffer.from(ARTIFACT_REPORT)
      const chunk = bytes.subarray(params.offset, params.offset + Math.min(params.limit, 10))
      const next = params.offset + chunk.length
      return { dataBase64: chunk.toString('base64'), mediaType: 'text/markdown', totalBytes: bytes.length, nextOffset: next < bytes.length ? next : null }
    }
    case 'v4/conversation/workflowRunArtifactData': {
      const items = [{ sequence: 17, siteId: 'report#1', ordinal: 0, item: { file: 'a.js', line: 3 } }, { sequence: 18, siteId: 'report#1', ordinal: 1, item: { file: 'b.js', line: 9 } }].filter((row) => row.sequence > (params.afterSequence ?? 0))
      return { items: items.slice(0, 1), hasMore: items.length > 1 }
    }
    case 'session/cancelBackgroundTask': {
      const run = isWorkflowSession(params.sessionId) && params.taskId === 'dwfrun-a' ? workflow() : null
      if (!run) return { cancelled: false, reason: 'background_task_not_found' }
      if (run.status !== 'running') return { cancelled: false, reason: 'background_task_not_running' }
      const next = run.events.length + 1
      run.events.push({ sequence: next, type: 'node-settled', payload: { instance: { siteId: 'ask#2', ordinal: 0 }, outcome: 'cancelled' } }, { sequence: next + 1, type: 'run-settled', payload: { status: 'stopped', stopReason: 'user', resumable: true } })
      run.status = 'stopped'
      fs.writeFileSync(workflowFile, JSON.stringify(run))
      setTimeout(() => notify('session/event', { sessionId: params.sessionId, type: 'session.updated', payload: { taskId: 'dwfrun-a', toolCallId: 'toolu_wf', taskKind: 'workflow', status: 'cancelled' } }), 20)
      return { cancelled: true }
    }
    // v4/command resumeWorkflowRun of a stopped dwfrun-a (ZCode's Resume): the run goes on from its journal; a run that
    // isn't resumable is refused with ZCode's fault code.
    case 'v4/command': {
      // amendWorkflowRunSettings of a running dwfrun-a (the run card's Configure): a new limit applies in place; a new
      // sub-agent model supersedes it with dwfrun-b, which reuses the finished scanner from cache.
      if (params.type === 'amendWorkflowRunSettings') {
        const run = isWorkflowSession(params.sessionId) && params.payload?.workId === 'dwfrun-a' ? workflow() : null
        if (!run) return { status: 'rejected', reasonCode: 'fault.command.workflowRunSettingsRejected.not_found', revisionAtDecision: 0, commandId: params.commandId }
        if (params.payload.subagentModel === undefined) return { status: 'accepted', commandId: params.commandId, revisionAtDecision: 0, result: { type: 'amendWorkflowRunSettings', runId: 'dwfrun-a', toolCallId: 'settings-1' } }
        const next = run.events.length + 1
        run.events.push({ sequence: next, type: 'run-settled', payload: { status: 'stopped', stopReason: 'superseded', supersededBy: 'dwfrun-b' } })
        run.status = 'stopped'
        run.b = [['run-started', { runId: 'dwfrun-b', resumedFrom: 'dwfrun-a', caps: { maxConcurrency: 2 } }], ['run-launched', { subagentModel: params.payload.subagentModel }],
          ['actor-created', { actor: { siteId: 'actor#1', ordinal: 0 }, name: 'scanner', phaseName: 'Scan' }],
          ['node-settled', { instance: { siteId: 'ask#1', ordinal: 0 }, kind: 'ask', actor: { siteId: 'actor#1', ordinal: 0 }, phaseName: 'Scan', outcome: 'ok', cached: true }],
          ['node-queued', { instance: { siteId: 'ask#2', ordinal: 0 }, kind: 'ask', actor: { siteId: 'actor#2', ordinal: 0 }, phaseName: 'Fix' }]].map(([type, payload], index) => ({ sequence: index + 1, type, payload }))
        fs.writeFileSync(workflowFile, JSON.stringify(run))
        return { status: 'accepted', commandId: params.commandId, revisionAtDecision: 0, result: { type: 'amendWorkflowRunSettings', runId: 'dwfrun-b', toolCallId: 'settings-2', supersededRunId: 'dwfrun-a' } }
      }
      if (params.type !== 'resumeWorkflowRun') return {}
      const run = isWorkflowSession(params.sessionId) && params.payload?.workId === 'dwfrun-a' ? workflow() : null
      if (!run) return { status: 'rejected', message: 'fault.command.workflowRunResumeRejected.not_found' }
      if (run.status !== 'stopped') return { status: 'rejected', message: `fault.command.workflowRunResumeRejected.${run.status === 'running' ? 'already_running' : 'not_resumable'}` }
      const next = run.events.length + 1
      run.events.push({ sequence: next, type: 'run-started', payload: { runId: 'dwfrun-a', resumedFrom: 'dwfrun-a' } }, { sequence: next + 1, type: 'node-queued', payload: { instance: { siteId: 'ask#2', ordinal: 1 }, kind: 'ask', actor: { siteId: 'actor#2', ordinal: 0 }, phaseName: 'Fix', instructionsHead: 'Fix each TODO' } }, { sequence: next + 2, type: 'node-executing', payload: { instance: { siteId: 'ask#2', ordinal: 1 } } })
      run.status = 'running'
      fs.writeFileSync(workflowFile, JSON.stringify(run))
      return { status: 'accepted' }
    }
    default: return {}
  }
}

// FAKE_ZCODE_ASK_TOOLS (comma-separated tool names): once a session is subscribed, ZCode asks permission for each
// (interaction/requestPermission); the host's answers are logged as {method: 'answer', params: {toolName, result}}.
// FAKE_ZCODE_ASK_INPUT (JSON {toolName: input}): the tool input each request carries (else {}).
const askInput = (() => { try { return JSON.parse(process.env.FAKE_ZCODE_ASK_INPUT || '{}') } catch { return {} } })()
const asked = new Map()
let asks = 0
readline.createInterface({ input: process.stdin, crlfDelay: Infinity }).on('line', (line) => {
  let message
  try { message = JSON.parse(line) } catch { return }
  if (message?.method === undefined && asked.has(String(message?.id))) {
    log('answer', { toolName: asked.get(String(message.id)), result: message.result ?? null, error: message.error ?? null })
    if (serial.length) askNext()
    return
  }
  if (typeof message?.method !== 'string' || message.id === undefined) return
  log(message.method, message.params ?? {})
  reply(message.id, answer(message.method, message.params ?? {}))
  // A prompt starts a turn that ends at once (turn/start resolves with its id).
  if (message.method === 'session/send') {
    const turnId = `turn_fake_${++counter}`
    setTimeout(() => {
      notify('session/event', { sessionId: message.params.sessionId, type: 'turn.started', turnId, payload: {} })
      notify('session/event', { sessionId: message.params.sessionId, type: 'turn.completed', turnId, payload: { resultType: 'success' } })
    }, 10)
  }
  if (message.method === 'session/subscribe' && process.env.FAKE_ZCODE_ASK_TOOLS) {
    const tools = process.env.FAKE_ZCODE_ASK_TOOLS.split(',')
    // FAKE_ZCODE_ASK_SERIAL=1: each request only once the previous one is answered (as calls of one turn arrive).
    if (process.env.FAKE_ZCODE_ASK_SERIAL === '1') {
      serial.push(...tools.map((toolName) => ({ sessionId: message.params.sessionId, toolName })))
      askNext()
    } else for (const toolName of tools) askOne(message.params.sessionId, toolName)
  }
})
const serial = []
function askOne(sessionId, toolName) {
  const id = `ask-${++asks}`
  asked.set(id, toolName)
  process.stdout.write(`${JSON.stringify({ id, method: 'interaction/requestPermission', params: { sessionId, toolName, toolCallId: `call-${asks}`, input: askInput[toolName] ?? {} } })}\n`)
}
function askNext() {
  const next = serial.shift()
  if (next) askOne(next.sessionId, next.toolName)
}
