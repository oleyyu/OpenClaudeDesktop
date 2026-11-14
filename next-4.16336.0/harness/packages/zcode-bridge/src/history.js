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
import { applyWorkflowToolResult, isWorkflowRunTool, workflowNoticeItems, workflowRunOf, workflowState, workflowSettingsNotice } from './workflows.js'

const seconds = (ms) => (Number.isFinite(ms) ? Math.floor(ms / 1000) : null)
const count = (value) => (Number.isFinite(value) ? value : 0)
/** Two step-finish token records added up ({input, output, reasoning, cache: {read, write}}). */
const addTokens = (a, b) => ({
  input: count(a?.input) + count(b?.input), output: count(a?.output) + count(b?.output), reasoning: count(a?.reasoning) + count(b?.reasoning),
  cache: { read: count(a?.cache?.read) + count(b?.cache?.read), write: count(a?.cache?.write) + count(b?.cache?.write) },
})
const DENIED = /doesn't want to proceed|was rejected|denied by|declined/i

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
 * @param {{ threadId: string, cwd: string, running?: boolean, activeTurnId?: string|null, inputs?: Record<string, object[]>, callIdPrefix?: string }} context
 *   callIdPrefix: put before every tool call id (a sub-agent's calls carry `tool_subagent_<agentId>_` on the live stream)
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
        turn.items.push({ type: 'agentMessage', id: `${messageId}#t${index}`, text: part.text ?? '', phase: null, memoryCitation: null, delivery: null, questions: null })
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
      if (turn.status === 'failed') turn.error = { message: String(info.error.message ?? info.error.data?.message ?? 'The turn failed.'), codexErrorInfo: null, additionalDetails: info.error.name ?? null, misalignment: null }
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
