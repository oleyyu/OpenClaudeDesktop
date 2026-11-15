/**
 * ZCode history (session/messages: messages with parts) as Codex turns.
 *
 * A turn is ZCode's own turn (`info.anchor.turnId`, the id the live stream uses), so live and replayed turns
 * share ids. Item ids: the user message id, `<assistantMessageId>#t<n>` / `#r<n>` for the n-th text / reasoning
 * part of an assistant message (the live stream counts segments the same way), and the toolCallId for tools.
 *
 * A dynamic workflow's dispatch (CreateWorkflow / AmendWorkflow / ResumeWorkflowRun) carries its run from the tool part
 * alone (workflows.js: the run its result names, or why none started); the server then folds the run's journal into it.
 */

import { childSessionIdOf, isRecord, planItem, todoPlan, toolItem } from './items.js'
import { stripInstructions } from './instructions.js'
import { importedItems } from './import-display.js'
import { applyWorkflowToolResult, isWorkflowRunTool, workflowNoticeItems, workflowRunOf, workflowState, workflowSettingsNotice } from './workflows.js'

const seconds = (ms) => (Number.isFinite(ms) ? Math.floor(ms / 1000) : null)
const count = (value) => (Number.isFinite(value) ? value : 0)
/** Two step-finish token records added up ({input, output, reasoning, cache: {read, write}}). */
const addTokens = (a, b) => ({
  input: count(a?.input) + count(b?.input), output: count(a?.output) + count(b?.output), reasoning: count(a?.reasoning) + count(b?.reasoning),
  cache: { read: count(a?.cache?.read) + count(b?.cache?.read), write: count(a?.cache?.write) + count(b?.cache?.write) },
})
const DENIED = /doesn't want to proceed|was rejected|denied by|declined/i

const httpStatus = (value) => (Number.isInteger(value) && value >= 100 && value < 600 ? value : typeof value === 'string' && /^[1-5]\d\d$/.test(value) ? Number(value) : null)
const QUOTA = /quota|insufficient balance|余额|usage limit|套餐|limit will reset|额度|用量/

/**
 * A ZCode failure's Codex identity (CodexErrorInfo), status first: a turn.failed payload's ErrorPayload carries the
 * provider's HTTP status in attribution.statusCode with ZCode's own code and reason (failure-classifier.ts: 401/403 →
 * provider_not_configured / auth_failed, 429 → model_rate_limited / rate_limited, 529 → provider_overloaded, 5xx →
 * server_error, 400/422 → invalid_model_request or model_context_exceeded), a stored reply's error
 * (AssistantErrorInfo {name: 'APIError', data: {message, statusCode, isRetryable}}) has it in data.statusCode, and a
 * retry notice in its errorStatus ({code}). The message only decides what none of them names (a bare string, a
 * provider's own wording in any language).
 */
export function zcodeErrorInfo(error) {
  const value = isRecord(error) ? error : {}
  const message = typeof error === 'string' ? error : String(value.message ?? value.data?.message ?? '')
  const status = httpStatus(value.attribution?.statusCode) ?? httpStatus(value.statusCode) ?? httpStatus(value.data?.statusCode) ?? httpStatus(value.status) ?? httpStatus(value.code)
  const code = typeof value.code === 'string' ? value.code : ''
  const reason = typeof value.attribution?.reason === 'string' ? value.attribution.reason : typeof value.reason === 'string' ? value.reason : ''
  const lower = `${code || value.name || ''} ${message}`.toLowerCase()
  if (status === 401 || status === 403 || code === 'provider_not_configured' || reason === 'auth_failed') return 'unauthorized'
  if (code === 'model_context_exceeded' || reason === 'context_exceeded') return 'contextWindowExceeded'
  if (status === 429 || status === 402 || code === 'model_rate_limited' || reason === 'rate_limited') return QUOTA.test(lower) || status === 402 ? 'usageLimitExceeded' : 'rateLimitExceeded'
  if (status === 529 || status === 503 || reason === 'provider_overloaded') return 'serverOverloaded'
  if ((status !== null && status >= 500) || reason === 'server_error') return 'internalServerError'
  if (code === 'model_request_timeout' || /^(?:timeout|stream_idle_timeout|network_error|tls_error|proxy_error)$/.test(reason)) return { responseStreamConnectionFailed: { httpStatusCode: status } }
  if (status === 400 || status === 404 || status === 422 || code === 'invalid_model_request' || code === 'model_not_found' || reason === 'invalid_request') return 'badRequest'
  if (/401|403|unauthori[sz]ed|invalid api key|authentication|鉴权|未登录|credential/.test(lower)) return 'unauthorized'
  if (/429|rate.?limit|too many requests|频率/.test(lower)) return QUOTA.test(lower) ? 'usageLimitExceeded' : 'rateLimitExceeded'
  if (QUOTA.test(lower)) return 'usageLimitExceeded'
  if (/context.?(window|length)|too long|maximum context/.test(lower)) return 'contextWindowExceeded'
  if (/503|529|overload/.test(lower)) return 'serverOverloaded'
  if (/500|502|internal server/.test(lower)) return 'internalServerError'
  if (/econnrefused|enotfound|fetch failed|network|timed? ?out|socket/.test(lower)) return { responseStreamConnectionFailed: { httpStatusCode: null } }
  if (/400|invalid request|bad request/.test(lower)) return 'badRequest'
  return null
}

/** Codex user-input parts for a ZCode user message (the original parts when the bridge recorded them). */
export function userContent(message, recorded) {
  if (Array.isArray(recorded) && recorded.length) return recorded
  const content = []
  for (const part of message.parts ?? []) {
    if (part.type === 'text' && !part.synthetic && !part.ignored) content.push({ type: 'text', text: stripInstructions(part.text ?? ''), text_elements: [] })
    else if (part.type === 'file') {
      const url = String(part.url ?? '')
      const local = url.startsWith('file://') ? decodeURIComponent(url.slice(7)) : url.startsWith('/') ? url : null
      if (String(part.mime ?? '').startsWith('image/')) content.push(local ? { type: 'localImage', path: local } : { type: 'image', url })
      else if (local) content.push({ type: 'mention', name: part.filename ?? local.split('/').pop(), path: local })
    }
  }
  return content.length ? content : [{ type: 'text', text: '', text_elements: [] }]
}

/**
 * The messages of a session's active branch. ZCode never deletes on a rewind: it records a branch cut in the session
 * row (`session.revert`) and keeps the old branch in its append-only store. This mirrors ZCode's own
 * selectActiveConversationBranch (contracts/src/rewind): the kept prefix, then whatever was appended after the cut.
 * The `/rewind` command's acknowledgement ("Rewound conversation to before message …") is a control reply, never
 * shown, as in ZCode's protocol projection.
 */
export function activeMessages(messages, revert) {
  const list = Array.isArray(messages) ? messages : []
  const idOf = (message) => message?.info?.id ?? message?.info?.messageId
  let active = list
  const target = revert?.targetMessageID
  if (target) {
    const byId = new Map(list.map((message) => [idOf(message), message]))
    const targetIndex = list.findIndex((message) => idOf(message) === target)
    const keptIds = Array.isArray(revert.keptMessageIDs) ? revert.keptMessageIDs : null
    const kept = keptIds ? keptIds.map((id) => byId.get(id)).filter(Boolean) : targetIndex >= 0 ? list.slice(0, targetIndex) : list
    const indexOf = (id) => (id ? list.findIndex((message) => idOf(message) === id) : -1)
    if (revert.branchCutAfterMessageID) {
      const cut = indexOf(revert.branchCutAfterMessageID)
      active = cut >= 0 ? [...kept, ...list.slice(cut + 1)] : kept
    } else if (keptIds || targetIndex >= 0) {
      const created = indexOf(revert.createdMessageID)
      active = created >= 0 ? [...kept, ...list.slice(created)] : kept
    }
  }
  return active.filter((message) => !isRewindAck(message))
}

const REWIND_ACK = /(?:^|\n)Rewound conversation to before message \S+\.$/

function isRewindAck(message) {
  if (message?.info?.role !== 'assistant') return false
  const parts = message.parts ?? []
  if (parts.some((part) => part.type === 'tool')) return false
  const text = parts.filter((part) => part.type === 'text').map((part) => part.text ?? '').join('').trim()
  return !!text && REWIND_ACK.test(text)
}

const visible = (info) => (info?.semantics?.uiVisibility ?? 'visible') === 'visible'
const isBackgroundNotification = (info) => info?.semantics?.kind === 'background_notification' || info?.metadata?.source === 'background_task' || info?.source === 'background_task'
const realUser = (info) => info?.role === 'user' && (info?.semantics ? info.semantics.origin === 'real_user' || info.semantics.kind === 'user_prompt' || info.semantics.kind === 'slash_command' : !info.synthetic)

function toolStatus(state, running) {
  switch (state?.status) {
    case 'completed': return 'completed'
    case 'error': return DENIED.test(String(state.error ?? '')) ? 'declined' : 'failed'
    default: return running ? 'inProgress' : 'interrupted'
  }
}

function agentChildOf(state) {
  const meta = state?.metadata ?? {}
  if (typeof meta.childSessionId === 'string') return meta.childSessionId
  if (typeof meta.agentId === 'string') return childSessionIdOf(meta.agentId)
  const match = /agentId: (agent_[\w-]+)/.exec(String(state?.output ?? ''))
  return match ? childSessionIdOf(match[1]) : null
}

/**
 * @param {Array<{info: object, parts: object[]}>} messages
 * @param {{ threadId: string, cwd: string, running?: boolean, activeTurnId?: string|null, inputs?: Record<string, object[]>, callIdPrefix?: string, importBlocks?: object }} context
 *   callIdPrefix: put before every tool call id (a sub-agent's calls carry `tool_subagent_<agentId>_` on the live stream)
 *   importBlocks: an imported thread's display index (import-display.js importDisplayIndex)
 * @returns {{ turns: object[], plan: object[]|null, lastUsage: object|null, totalUsage: object|null, anchors: Record<string, string> }}
 *   anchors: per turn, the id of its first prompt message (what ZCode's `/rewind conversation <id>` cuts before)
 */
export function turnsFromMessages(messages, context) {
  const turns = []
  const anchors = {}
  const byId = new Map()
  let current = null
  let plan = null
  let lastUsage = null
  // Every step's tokens: the thread's running total once it is reopened (the live total starts at zero).
  let totalUsage = null
  const callIdOf = (callId) => (context.callIdPrefix && callId && !String(callId).startsWith(context.callIdPrefix) ? `${context.callIdPrefix}${callId}` : callId)
  const openTurn = (id, startedMs, lazy = false) => {
    if (byId.has(id)) return byId.get(id)
    const turn = { id, items: [], itemsView: 'full', status: 'completed', error: null, startedAt: seconds(startedMs), completedAt: null, durationMs: null, _start: startedMs, _end: null, _lazy: lazy }
    byId.set(id, turn)
    turns.push(turn)
    return turn
  }
  // A finished workflow's notification (a hidden background-task message) belongs to the turn GLM answers it in, which
  // ZCode records only on that answer (the notification's own anchor names the turn that started the run): its notice
  // items wait for the next assistant message.
  let notices = []
  for (const message of messages ?? []) {
    const info = message.info ?? {}
    const messageId = info.id ?? info.messageId
    const anchorTurn = info.anchor?.turnId
    if (info.role === 'user' && isBackgroundNotification(info)) {
      const input = (message.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text ?? '').join('\n')
      notices.push(...workflowNoticeItems(messageId, input, info.metadata?.originMeta))
      continue
    }
    // A workflow's settings turn (its run card's Configure): a notice, never the user's prompt.
    if (info.role === 'user' && workflowSettingsNotice((message.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text ?? '').join('\n'))) {
      notices.push(...workflowNoticeItems(messageId, (message.parts ?? []).filter((part) => part.type === 'text').map((part) => part.text ?? '').join('\n')))
      continue
    }
    if (info.role === 'user') {
      if (anchorTurn || realUser(info) || !current) current = openTurn(anchorTurn ?? `turn-${messageId}`, info.time?.created)
      // ZCode rewinds to a user prompt; a compaction summary (info.summary) is not one.
      if (messageId && !info.summary && !anchors[current.id]) anchors[current.id] = messageId
      if (realUser(info) && visible(info)) current.items.push({ type: 'userMessage', id: messageId, clientId: null, content: userContent(message, context.inputs?.[messageId]) })
      continue
    }
    if (info.role !== 'assistant') continue
    if (anchorTurn && (!current || current.id !== anchorTurn)) current = openTurn(anchorTurn, info.time?.created)
    // An assistant message before any prompt (a child session's opening timeline event): a turn only if it shows something.
    if (!current) current = openTurn(`turn-${messageId}`, info.time?.created, true)
    const turn = current
    if (notices.length) {
      turn.items.push(...notices)
      turn._lazy = false
      notices = []
    }
    const running = !!context.running && context.activeTurnId === turn.id && !info.time?.completed
    let texts = 0
    let reasonings = 0
    for (const part of message.parts ?? []) {
      if (part.type === 'text') {
        const index = texts++
        if (part.synthetic || part.ignored || !visible(info)) continue
        const prose = (id, text) => ({ type: 'agentMessage', id, text, phase: null, memoryCitation: null, delivery: null, questions: null })
        // An imported reply (thread-import.js) shows block by block: prose, and each tool call as a settled tool row.
        turn.items.push(...(importedItems(`${messageId}#t${index}`, part.text, context.importBlocks, prose) ?? [prose(`${messageId}#t${index}`, part.text ?? '')]))
      } else if (part.type === 'reasoning') {
        const index = reasonings++
        if (!(part.text ?? '').trim()) continue
        turn.items.push({ type: 'reasoning', id: `${messageId}#r${index}`, summary: [part.text], content: [] })
      } else if (part.type === 'tool') {
        const state = part.state ?? {}
        const tool = part.tool
        const input = isRecord(state.input) ? state.input : {}
        if (tool === 'TodoWrite') { plan = todoPlan(input); continue }
        const status = toolStatus(state, running)
        const callId = callIdOf(part.callID ?? part.callId)
        if (tool === 'ExitPlanMode') turn.items.push(planItem(callId, input))
        const started = state.time?.start ?? state.startedAt
        const ended = state.time?.end ?? state.completedAt
        let workflowRun = null
        if (isWorkflowRunTool(tool) && !context.callIdPrefix) {
          const run = workflowState(workflowRunOf({ callId, tool, input, time: Number.isFinite(started) ? started : info.time?.created ?? null }))
          if (status !== 'inProgress') applyWorkflowToolResult(run, { status, content: state.status === 'completed' ? state.output : null, error: state.status === 'error' ? state.error : null }, Number.isFinite(ended) ? ended : Date.now())
          workflowRun = run.run
        }
        const item = toolItem({
          callId, tool, input, status, cwd: context.cwd, threadId: context.threadId,
          result: state.status === 'completed' ? { success: true, content: state.output, display: state.metadata?.display ?? state.display } : null,
          error: state.status === 'error' ? state.error : null,
          durationMs: Number.isFinite(started) && Number.isFinite(ended) ? ended - started : null,
          childThreadId: tool === 'Agent' || tool === 'Task' ? agentChildOf(state) : null,
        })
        turn.items.push(workflowRun ? { ...item, workflowRun } : item)
      } else if (part.type === 'compaction' || (part.type === 'timeline' && part.timelineType === 'context_compaction')) {
        if (!turn.items.some((item) => item.id === `compaction-${part.partId ?? part.id}`)) turn.items.push({ type: 'contextCompaction', id: `compaction-${part.partId ?? part.id}` })
      } else if (part.type === 'step-finish' && part.tokens) {
        lastUsage = part.tokens
        totalUsage = addTokens(totalUsage, part.tokens)
      }
    }
    if (info.error && !running) {
      turn.status = /abort|cancel/i.test(String(info.error.name ?? info.error.message ?? '')) ? 'interrupted' : 'failed'
      if (turn.status === 'failed') turn.error = { message: String(info.error.message ?? info.error.data?.message ?? 'The turn failed.'), codexErrorInfo: zcodeErrorInfo(info.error), additionalDetails: info.error.name ?? null, misalignment: null }
    }
    if (info.finish === 'cancelled' || info.finish === 'aborted') turn.status = 'interrupted'
    if (running) turn.status = 'inProgress'
    if (info.time?.completed) turn._end = Math.max(turn._end ?? 0, info.time.completed)
    else if (!running && turn.status === 'completed' && info.time?.created) turn.status = 'interrupted'
  }
  // A turn opened only for a message that shows nothing (no prompt, no reply) is not a turn of the transcript.
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index]
    if (turn._lazy && !turn.items.length && !turn.error && turn.status !== 'inProgress') {
      turns.splice(index, 1)
      delete anchors[turn.id]
    }
  }
  for (const turn of turns) {
    delete turn._lazy
    if (turn.status !== 'inProgress') {
      turn.completedAt = seconds(turn._end ?? turn._start)
      turn.durationMs = Number.isFinite(turn._end) && Number.isFinite(turn._start) ? turn._end - turn._start : null
    }
    delete turn._start
    delete turn._end
  }
  return { turns, plan, lastUsage, totalUsage, anchors }
}

/** The first thing the user typed (the thread preview). */
export function previewOf(messages) {
  for (const message of messages ?? []) {
    if (!realUser(message.info) || !visible(message.info)) continue
    const typed = (message.parts ?? []).filter((part) => part.type === 'text' && !part.synthetic).map((part) => stripInstructions(part.text ?? '')).join(' ').trim()
    if (typed) return typed.slice(0, 200)
  }
  return ''
}
