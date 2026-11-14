/**
 * ZCode's live session stream (`session/event` after session/subscribe, delivery "desktop-continuous") as
 * Codex notifications, for one thread.
 *
 *   turn.started                 turn/started (+ userMessage item for a typed prompt, or the notice of a finished
 *                                workflow whose result ZCode hands GLM in a turn of its own: workflows.js workflowNotices)
 *   turn.steerDrained            userMessage item in the running turn for guidance sent with turn/steer
 *   model.streaming text/reason  item/started → item/agentMessage/delta | item/reasoning/summaryTextDelta → item/completed
 *   model.streaming tool_call    item/started (tool item, inProgress); TodoWrite → turn/plan/updated;
 *                                ExitPlanMode → the plan item
 *   tool.updated progress        item/commandExecution/outputDelta (Bash)
 *   tool.updated result/error    item/completed
 *   tool.updated (sub-agent)     the same, on the child thread (sess_subagent_<agentId>)
 *   sub-agent text and thinking  not on the stream (ZCode mirrors only a sub-agent's tools onto the parent session):
 *                                read from the child session's stored messages before each of its tool calls and
 *                                before it ends (options.childMessages), as agentMessage / reasoning items
 *   session.updated usage        thread/tokenUsage/updated (last request + running total, modelContextWindow)
 *   session.updated sub-agent    thread/started (child) / turn/started / turn/completed / thread/status/changed
 *   session.updated task         background terminal registry; the launch item completes when the task ends.
 *                                A background sub-agent's task (taskKind 'subagent'): its taskId, so Stop on that
 *                                sub-agent cancels only it (session/cancelBackgroundTask, subagentTaskFor)
 *   session.updated task         (taskKind 'workflow') a dynamic workflow's run: taskId ≡ runId names the run and its
 *                                end; the run itself (item.workflowRun on the CreateWorkflow / AmendWorkflow /
 *                                ResumeWorkflowRun item) comes from the run's journal, which the server polls into
 *                                workflowEvents (workflows.js)
 *   session.titleUpdated        thread/name/updated
 *   session.updated apiRetry,    error willRetry:true + retry {attempt, maxRetries} while ZCode backs off and retries
 *   streamRecovery.updated       a model request (429, overload, dropped stream): the "Retrying…" status row
 *   turn.completed / turn.failed turn/completed (completed | interrupted | failed with a TurnError)
 */

import fs from 'node:fs'
import path from 'node:path'
import { backgroundTaskIdOf, childSessionIdOf, isRecord, planItem, todoPlan, toolItem } from './items.js'
import { turnsFromMessages } from './history.js'
import { applyWorkflowEvents, applyWorkflowInterrupted, applyWorkflowResumed, applyWorkflowSummary, applyWorkflowTaskEnd, applyWorkflowToolResult, bindWorkflowRun, isWorkflowRunTool, workflowNoticeItems, workflowRunOf, workflowState, workflowSettingsNotice, workflowReplacement } from './workflows.js'

const seconds = (ms) => Math.floor(ms / 1000)
// A background sub-agent task's statuses while it still runs (BackgroundTask* events).
const LIVE_TASK = new Set(['running', 'pending', 'queued', 'starting'])

/** Codex TurnError from a ZCode failure ({code, message} or an error string). */
export function turnError(error) {
  const message = typeof error === 'string' ? error : String(error?.message ?? 'The turn failed.')
  const code = typeof error === 'object' ? error?.code ?? error?.name ?? null : null
  const lower = `${code ?? ''} ${message}`.toLowerCase()
  let info = null
  if (/401|403|unauthori[sz]ed|invalid api key|authentication|鉴权|未登录|credential/.test(lower)) info = 'unauthorized'
  else if (/429|rate.?limit|too many requests|频率/.test(lower)) info = 'rateLimitExceeded'
  else if (/quota|insufficient balance|余额|usage limit|套餐/.test(lower)) info = 'usageLimitExceeded'
  else if (/context.?(window|length)|too long|maximum context/.test(lower)) info = 'contextWindowExceeded'
  else if (/503|529|overload/.test(lower)) info = 'serverOverloaded'
  else if (/500|502|internal server/.test(lower)) info = 'internalServerError'
  else if (/econnrefused|enotfound|fetch failed|network|timed? ?out|socket/.test(lower)) info = { responseStreamConnectionFailed: { httpStatusCode: null } }
  else if (/400|invalid request|bad request/.test(lower)) info = 'badRequest'
  return { message, codexErrorInfo: info, additionalDetails: code === null ? null : String(code), misalignment: null }
}

export class LiveProjector {
  /**
   * @param {{ threadId: string, cwd: () => string, emit: (method: string, params: object) => void,
   *   onChild: (child: {id: string, agentId: string, description: string, prompt: string, agentType: string, parentToolCallId: string|null}) => void,
   *   onTurnStarted?: (turnId: string) => void, onTurnCompleted?: (turn: object) => void, takeInput: (messageId: string|null) => object[]|null,
   *   contextWindow?: () => number|null,
   *   childMessages?: (childSessionId: string, fromSequence: number|null) => Array<{info: object, parts: object[], sequence?: number|null}>|null }} options
   */
  constructor(options) {
    this.options = options
    this.threadId = options.threadId
    this.turn = null
    this.segments = new Map()
    this.calls = new Map()
    this.items = new Map()
    this.children = new Map()
    this.background = new Map()
    // Background sub-agents' tasks, by ZCode taskId (its agentId): { taskId, childId, status }.
    this.subagentTasks = new Map()
    // Dynamic workflow runs by their dispatch call id: { callId, state (workflows.js workflowState), turnId, threadId, item }.
    this.workflows = new Map()
    this.total = { totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 }
    this.last = null
    this.contextWindow = null
    this.plan = null
    this.retrying = null
  }

  emit(method, params) { this.options.emit(method, params) }

  get turnId() { return this.turn?.id ?? null }

  event(type, payload = {}, envelope = {}) {
    switch (type) {
      case 'turn.started': return this.turnStarted(payload, envelope)
      case 'turn.steerDrained': return this.steerDrained(payload, envelope)
      case 'streamRecovery.updated': return this.retryUpdated(payload?._meta?.zcode?.apiRetry)
      case 'model.streaming': return this.streaming(payload, envelope)
      case 'tool.updated': return this.toolUpdated(payload, envelope)
      case 'permission.resolved': return this.permissionResolved(payload)
      case 'session.updated': return this.sessionUpdated(payload, envelope)
      case 'session.titleUpdated':
        if (typeof payload.title === 'string' && payload.title.trim()) this.emit('thread/name/updated', { threadId: this.threadId, threadName: payload.title })
        return
      case 'turn.completed': return this.turnCompleted(payload, envelope)
      case 'turn.failed': return this.turnFailed(payload, envelope)
      default: return
    }
  }

  // ---------------------------------------------------------------- turns

  ensureTurn(turnId, startedMs = Date.now()) {
    if (this.turn && (!turnId || this.turn.id === turnId)) return this.turn
    if (this.turn) this.finishTurn('completed', null, startedMs)
    this.turn = { id: turnId ?? `turn-${Date.now()}`, startedMs, items: new Set(), diffs: new Map() }
    this.segments.clear()
    this.emit('turn/started', { threadId: this.threadId, turn: { id: this.turn.id, items: [], itemsView: 'full', status: 'inProgress', error: null, startedAt: seconds(startedMs), completedAt: null, durationMs: null } })
    this.options.onTurnStarted?.(this.turn.id)
    return this.turn
  }

  turnStarted(payload, envelope) {
    const turn = this.ensureTurn(envelope.turnId, envelope.timestamp ?? Date.now())
    // A turn ZCode started to hand GLM a finished workflow's result: its notice (the 'Background workflow …' row), so
    // the reply below it doesn't come out of nowhere. Other background results show nothing of their input.
    if (payload.inputSource === 'background_task') {
      for (const item of workflowNoticeItems(payload.messageId, payload.input, payload.originMeta)) {
        this.itemStarted(item, turn.id)
        this.itemCompleted(item, turn.id)
      }
      return
    }
    // A workflow's settings turn (its run card's Configure) is a notice, not the user's words.
    if (payload.messageId && workflowSettingsNotice(payload.input)) {
      for (const item of workflowNoticeItems(payload.messageId, payload.input)) {
        this.itemStarted(item, turn.id)
        this.itemCompleted(item, turn.id)
      }
      return
    }
    if (payload.messageId && payload.inputVisibility !== 'model-only') {
      const content = this.options.takeInput(payload.messageId, payload) ?? [{ type: 'text', text: String(payload.input ?? ''), text_elements: [] }]
      const item = { type: 'userMessage', id: payload.messageId, clientId: this.options.clientIdFor?.(payload.messageId) ?? null, content }
      this.itemStarted(item, turn.id)
      this.itemCompleted(item, turn.id)
    }
  }

  /** Guidance ZCode put into the running turn as user messages (one per drained input; the steer's own input). */
  steerDrained(payload, envelope) {
    const drained = Array.isArray(payload.drainedInputs) ? payload.drainedInputs : (payload.injectedMessageIds ?? []).map((messageId) => ({ messageId, text: '' }))
    if (!drained.length) return
    const turn = this.ensureTurn(this.turn?.id ?? payload.targetTurnId ?? envelope.turnId, envelope.timestamp ?? Date.now())
    for (const entry of drained) {
      if (!entry?.messageId || this.items.has(entry.messageId)) continue
      // The text so far belongs before the guidance: close open segments so the reply continues below it.
      this.closeSegments()
      const content = this.options.takeSteer?.(entry) ?? [{ type: 'text', text: String(entry.text ?? ''), text_elements: [] }]
      const item = { type: 'userMessage', id: entry.messageId, clientId: this.options.clientIdFor?.(entry.messageId) ?? null, content }
      this.itemStarted(item, turn.id)
      this.itemCompleted(item, turn.id)
    }
  }

  /**
   * ZCode's model retry state (zcode-api-retry-status.ts): an object while a retry is scheduled or a dropped stream
   * is being recovered, null once a request succeeds. Each new attempt is one ErrorNotification willRetry:true (the
   * "Retrying (n/max)…" status row, which the next item or turn event ends).
   */
  retryUpdated(retry) {
    if (retry === undefined) return
    if (retry === null || typeof retry !== 'object') { this.retrying = null; return }
    // Only a running turn waits on it (a title or side request retrying after the turn has no status row to show).
    if (!this.turn) return
    const attempt = Number.isInteger(retry.attempt) && retry.attempt > 0 ? retry.attempt : null
    const maxRetries = Number.isInteger(retry.maxRetries) && retry.maxRetries > 0 ? retry.maxRetries : null
    const message = String(retry.error ?? 'Retrying the model request.')
    const key = `${this.turnId}|${attempt}|${maxRetries}|${message}`
    if (key === this.retrying) return
    this.retrying = key
    const error = turnError({ code: Number.isInteger(retry.errorStatus) ? retry.errorStatus : null, message })
    this.emit('error', { threadId: this.threadId, turnId: this.turnId, willRetry: true, error, retry: { attempt, maxRetries, delayMs: Number.isFinite(retry.retryDelayMs) ? retry.retryDelayMs : null } })
  }

  finishTurn(status, error, endedMs = Date.now()) {
    const turn = this.turn
    if (!turn) return null
    this.closeSegments()
    for (const id of turn.items) {
      const item = this.items.get(id)
      if (!item || !isOpen(item)) continue
      if (item.type === 'commandExecution' && item.processId && this.background.has(item.processId)) continue
      // A workflow call that ended with the turn and no result: no run started (one already named keeps running).
      const workflow = this.workflows.get(id)
      if (workflow) applyWorkflowToolResult(workflow.state, { status: status === 'failed' ? 'failed' : 'interrupted' })
      this.itemCompleted({ ...item, status: status === 'interrupted' ? 'interrupted' : status === 'failed' ? 'failed' : 'completed', ...(workflow ? { workflowRun: workflow.state.run } : {}) }, turn.id)
    }
    this.options.beforeTurnCompleted?.(turn.id, status)
    this.turn = null
    this.retrying = null
    const done = { id: turn.id, items: [], itemsView: 'notLoaded', status, error, startedAt: seconds(turn.startedMs), completedAt: seconds(endedMs), durationMs: Math.max(0, endedMs - turn.startedMs) }
    this.emit('turn/completed', { threadId: this.threadId, turn: done })
    this.options.onTurnCompleted?.(done)
    return done
  }

  turnCompleted(payload, envelope) {
    if (!this.turn && envelope.turnId) this.ensureTurn(envelope.turnId, envelope.timestamp)
    if (payload.usage) this.addTurnUsage(payload.usage)
    const result = String(payload.resultType ?? 'success')
    const status = /cancel|abort|interrupt/.test(result) ? 'interrupted' : /error|fail/.test(result) ? 'failed' : 'completed'
    this.finishTurn(status, status === 'failed' ? turnError(payload.error ?? payload.response ?? 'The turn failed.') : null, envelope.timestamp ?? Date.now())
  }

  turnFailed(payload, envelope) {
    if (!this.turn && envelope.turnId) this.ensureTurn(envelope.turnId, envelope.timestamp)
    const error = turnError(payload.error ?? payload.message ?? 'The turn failed.')
    this.emit('error', { threadId: this.threadId, turnId: this.turnId, willRetry: false, error })
    this.finishTurn('failed', error, envelope.timestamp ?? Date.now())
  }

  // ---------------------------------------------------------------- items

  itemStarted(item, turnId = this.turnId, threadId = this.threadId) {
    this.items.set(item.id, item)
    if (threadId === this.threadId) this.turn?.items.add(item.id)
    this.emit('item/started', { item, threadId, turnId, startedAtMs: Date.now() })
  }

  itemCompleted(item, turnId = this.turnId, threadId = this.threadId) {
    this.items.set(item.id, item)
    this.emit('item/completed', { item, threadId, turnId, completedAtMs: Date.now() })
    if (item.type === 'fileChange' && item.status === 'completed' && threadId === this.threadId && this.turn) {
      for (const change of item.changes ?? []) this.turn.diffs.set(change.path, change)
      this.emit('turn/diff/updated', { threadId, turnId, diff: unifiedDiff([...this.turn.diffs.values()], this.options.cwd()) })
    }
  }

  segment(messageId, kind) {
    let state = this.segments.get(messageId)
    if (!state) { state = { texts: 0, reasonings: 0, current: null }; this.segments.set(messageId, state) }
    if (state.current?.kind === kind) return state.current
    this.closeSegment(state)
    const index = kind === 'text' ? state.texts++ : state.reasonings++
    const id = `${messageId}#${kind === 'text' ? 't' : 'r'}${index}`
    const item = kind === 'text'
      ? { type: 'agentMessage', id, text: '', phase: null, memoryCitation: null, delivery: null, questions: null }
      : { type: 'reasoning', id, summary: [], content: [], reasoningText: '' }
    state.current = { kind, item, text: '' }
    this.itemStarted(item)
    return state.current
  }

  closeSegment(state) {
    const current = state?.current
    if (!current) return
    state.current = null
    const item = current.kind === 'text' ? { ...current.item, text: current.text } : { type: 'reasoning', id: current.item.id, summary: [current.text], content: [] }
    this.itemCompleted(item)
  }

  closeSegments() {
    for (const state of this.segments.values()) this.closeSegment(state)
  }

  streaming(payload, envelope) {
    const turn = this.ensureTurn(envelope.turnId, envelope.timestamp)
    const messageId = payload.assistantMessageId ?? `msg-${turn.id}`
    switch (payload.kind) {
      case 'text_delta': {
        if (!payload.delta) return
        const current = this.segment(messageId, 'text')
        current.text += payload.delta
        this.emit('item/agentMessage/delta', { threadId: this.threadId, turnId: turn.id, itemId: current.item.id, delta: payload.delta })
        return
      }
      case 'reasoning_delta': {
        if (!payload.delta) return
        const current = this.segment(messageId, 'reasoning')
        current.text += payload.delta
        this.emit('item/reasoning/summaryTextDelta', { threadId: this.threadId, turnId: turn.id, itemId: current.item.id, delta: payload.delta, summaryIndex: 0 })
        return
      }
      case 'tool_input_start':
      case 'tool_input_delta':
      case 'tool_input_end':
        this.closeSegment(this.segments.get(messageId))
        return
      case 'tool_call':
        this.closeSegment(this.segments.get(messageId))
        this.toolCall(payload.toolCallId, payload.toolName, payload.input, turn.id)
        return
      default:
        return
    }
  }

  toolCall(callId, tool, input, turnId, threadId = this.threadId) {
    if (!callId || this.calls.has(callId)) return
    const args = isRecord(input) ? input : {}
    const call = { callId, tool, input: args, threadId, turnId, startedMs: Date.now(), existed: null }
    if ((tool === 'Write' || tool === 'Edit') && typeof args.file_path === 'string') {
      try { call.existed = fs.existsSync(path.resolve(this.options.cwd(), args.file_path)) } catch { call.existed = null }
    }
    this.calls.set(callId, call)
    // A dynamic workflow's dispatch: the item carries its run from the start (workflows.js).
    if (isWorkflowRunTool(tool) && threadId === this.threadId && !this.workflows.has(callId)) {
      this.workflows.set(callId, { callId, state: workflowState(workflowRunOf({ callId, tool, input: args, time: call.startedMs })), turnId, threadId, item: null })
    }
    if (tool === 'TodoWrite') {
      this.plan = todoPlan(args)
      if (threadId === this.threadId) this.emit('turn/plan/updated', { threadId, turnId, explanation: null, plan: this.plan })
      return
    }
    if (tool === 'ExitPlanMode') {
      const plan = planItem(callId, args)
      this.itemStarted(plan, turnId, threadId)
      this.itemCompleted(plan, turnId, threadId)
    }
    this.itemStarted(this.itemFor(call, 'inProgress'), turnId, threadId)
  }

  itemFor(call, status, extra = {}) {
    const item = toolItem({
      callId: call.callId, tool: call.tool, input: call.input, status, cwd: this.options.cwd(), threadId: call.threadId, existed: call.existed,
      childThreadId: call.childThreadId ?? null, agentState: call.agentState ?? null, ...extra,
    })
    const workflow = this.workflows.get(call.callId)
    return workflow ? { ...item, workflowRun: workflow.state.run } : item
  }

  toolUpdated(payload, envelope) {
    const callId = payload.toolCallId
    const child = payload.childSessionId ?? (payload.agentId ? childSessionIdOf(payload.agentId) : null)
    if (payload.kind === 'batch') return this.batchDone(payload)
    if (!callId) return
    let call = this.calls.get(callId)
    if (!call && child && isRecord(payload.input)) {
      // A sub-agent's tool: it streams on the parent session; it belongs to the child thread.
      this.ensureChild({ childSessionId: child, agentId: payload.agentId, description: payload.description, prompt: '', agentType: payload.agentType, parentToolCallId: payload.parentToolCallId })
      // What the sub-agent wrote and thought before this call goes above it.
      this.syncChild(child)
      this.toolCall(callId, payload.toolName, payload.input, this.children.get(child)?.turnId, child)
      call = this.calls.get(callId)
    }
    if (!call) {
      if (payload.kind !== 'scheduled' || !payload.toolName) return
      this.toolCall(callId, payload.toolName, payload.input ?? {}, this.ensureTurn(envelope.turnId, envelope.timestamp).id)
      call = this.calls.get(callId)
      if (!call) return
    }
    const durationMs = Number.isFinite(payload.duration) ? payload.duration : Date.now() - call.startedMs
    if (payload.kind === 'progress') {
      const tail = String(payload.stdoutTail ?? payload.outputTail ?? '')
      if (call.tool === 'Bash' && tail) {
        const previous = call.tail ?? ''
        const delta = tail.startsWith(previous) ? tail.slice(previous.length) : tail
        call.tail = tail
        if (delta) this.emit('item/commandExecution/outputDelta', { threadId: call.threadId, turnId: call.turnId, itemId: callId, delta })
      }
      return
    }
    if (payload.kind === 'result') {
      const result = payload.result ?? {}
      if (call.tool === 'TodoWrite') return
      const status = result.success === false ? (/doesn't want to proceed|rejected/i.test(String(result.content ?? '')) ? 'declined' : 'failed') : 'completed'
      if (call.tool === 'Bash' && call.input.run_in_background === true && status === 'completed') {
        const taskId = backgroundTaskIdOf(result.content)
        if (taskId) {
          // The command keeps running: the launch item stays open until the task reports its end.
          call.taskId = taskId
          call.launchResult = result
          const item = this.itemFor(call, 'inProgress', { result })
          this.items.set(callId, item)
          if (!this.background.has(taskId)) this.background.set(taskId, { itemId: callId, processId: taskId, command: String(call.input.command ?? ''), threadId: call.threadId, turnId: call.turnId, startedMs: call.startedMs })
          this.emit('item/started', { item, threadId: call.threadId, turnId: call.turnId, startedAtMs: call.startedMs })
          return
        }
      }
      if (call.tool === 'Agent' || call.tool === 'Task') call.agentState = { status: status === 'completed' ? 'completed' : 'errored', message: String(result.content ?? '').split('\nagentId:')[0] || null }
      this.workflowResult(callId, { status, content: result.content ?? null })
      this.itemCompleted(this.itemFor(call, status, { result, durationMs }), call.turnId, call.threadId)
      return
    }
    if (payload.kind === 'error') {
      const message = String(payload.error?.message ?? payload.error ?? 'Tool failed.')
      const status = /doesn't want to proceed|rejected|denied/i.test(message) ? 'declined' : 'failed'
      this.workflowResult(callId, { status, error: message })
      this.itemCompleted(this.itemFor(call, status, { error: message, durationMs }), call.turnId, call.threadId)
    }
  }

  /** A denied permission ends the call: ZCode sends no tool result for it. */
  permissionResolved(payload) {
    if (payload.decision !== 'deny') return
    const call = this.calls.get(payload.toolCallId)
    if (!call || call.tool === 'TodoWrite') return
    const item = this.items.get(call.callId)
    if (item && !isOpen(item)) return
    call.denied = true
    this.workflowResult(call.callId, { status: 'declined', error: payload.reason ?? null })
    this.itemCompleted(this.itemFor(call, 'declined', { error: payload.reason ?? 'Declined.' }), call.turnId, call.threadId)
  }

  /** The end of a parallel group: any call of it still open failed without a result (validation, policy). */
  batchDone(payload) {
    for (const callId of payload.toolCallIds ?? []) {
      const call = this.calls.get(callId)
      if (!call || call.tool === 'TodoWrite' || call.taskId) continue
      const item = this.items.get(callId)
      if (!item || !isOpen(item)) continue
      this.workflowResult(callId, { status: 'failed' })
      this.itemCompleted(this.itemFor(call, payload.errorCount > 0 ? 'failed' : 'completed'), call.turnId, call.threadId)
    }
  }

  // ---------------------------------------------------------------- session updates

  sessionUpdated(payload, envelope) {
    if (payload.childSessionId && payload.agentId) return this.childUpdated(payload, envelope)
    if (payload._meta?.zcode && Object.hasOwn(payload._meta.zcode, 'apiRetry')) this.retryUpdated(payload._meta.zcode.apiRetry)
    if (payload.operationId && payload.partId && (payload.status === 'started' || payload.status === 'completed' || payload.status === 'failed')) return this.compactionUpdated(payload, envelope)
    if (Number.isFinite(payload.postCompactTokenCount) && payload.boundaryId) {
      const used = payload.postCompactTokenCount
      this.last = { totalTokens: used, inputTokens: used, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 }
      this.emitUsage()
      return
    }
    if (payload.taskId && payload.status) return this.taskUpdated(payload)
    if (payload.usage && payload.querySource === 'main_turn' && payload.baseURL === undefined) {
      if (Number.isFinite(payload.contextWindow)) this.contextWindow = payload.contextWindow
      const usage = payload.usage
      const input = usage.inputTokens ?? 0
      this.last = { totalTokens: input + (usage.outputTokens ?? 0), inputTokens: input, cachedInputTokens: usage.cacheReadTokens ?? 0, cacheWriteInputTokens: usage.cacheWriteTokens ?? 0, outputTokens: usage.outputTokens ?? 0, reasoningOutputTokens: usage.reasoningTokens ?? 0 }
      this.total = {
        totalTokens: this.total.totalTokens + this.last.totalTokens, inputTokens: this.total.inputTokens + input,
        cachedInputTokens: this.total.cachedInputTokens + this.last.cachedInputTokens, cacheWriteInputTokens: this.total.cacheWriteInputTokens + this.last.cacheWriteInputTokens,
        outputTokens: this.total.outputTokens + this.last.outputTokens, reasoningOutputTokens: this.total.reasoningOutputTokens + this.last.reasoningOutputTokens,
      }
      this.emitUsage()
    }
  }

  addTurnUsage() { /* the per-request session.updated events already counted this turn */ }

  /** ZCode's compaction operation (session/compact, or automatic): a contextCompaction item in the open turn. */
  compactionUpdated(payload, envelope) {
    const turn = this.ensureTurn(envelope.turnId, envelope.timestamp)
    const item = { type: 'contextCompaction', id: `compaction-${payload.partId}` }
    if (payload.status === 'started') this.itemStarted(item, turn.id)
    else this.itemCompleted({ ...item, ...(payload.status === 'failed' ? { status: 'failed' } : {}) }, turn.id)
  }

  tokenUsage() {
    if (!this.last) return null
    return { total: { ...this.total }, last: { ...this.last }, modelContextWindow: this.contextWindow ?? this.options.contextWindow?.() ?? null }
  }

  emitUsage() {
    const tokenUsage = this.tokenUsage()
    if (tokenUsage) this.emit('thread/tokenUsage/updated', { threadId: this.threadId, turnId: this.turnId, tokenUsage })
  }

  /** Seed the counters from history (resume), without emitting. */
  seedUsage({ total, last, contextWindow }) {
    if (total) this.total = { ...this.total, ...total }
    if (last) this.last = last
    if (Number.isFinite(contextWindow)) this.contextWindow = contextWindow
  }

  ensureChild(info) {
    const id = info.childSessionId
    let child = this.children.get(id)
    if (child) return child
    child = { id, agentId: info.agentId, description: info.description ?? '', turnId: `turn-${info.agentId}`, startedMs: Date.now(), parentToolCallId: info.parentToolCallId ?? null, status: 'running', background: info.background === true }
    this.children.set(id, child)
    this.options.onChild({ id, agentId: info.agentId, description: info.description ?? '', prompt: info.prompt ?? '', agentType: info.agentType ?? 'general-purpose', parentToolCallId: info.parentToolCallId ?? null })
    this.emit('thread/status/changed', { threadId: id, status: { type: 'active', activeFlags: [] } })
    this.emit('turn/started', { threadId: id, turn: { id: child.turnId, items: [], itemsView: 'full', status: 'inProgress', error: null, startedAt: seconds(child.startedMs), completedAt: null, durationMs: null } })
    if (info.prompt) {
      const item = { type: 'userMessage', id: `${child.turnId}-prompt`, clientId: null, content: [{ type: 'text', text: info.prompt, text_elements: [] }] }
      this.itemStarted(item, child.turnId, id)
      this.itemCompleted(item, child.turnId, id)
    }
    const parentCall = info.parentToolCallId ? this.calls.get(info.parentToolCallId) : null
    if (parentCall) {
      parentCall.childThreadId = id
      parentCall.agentState = { status: 'running', message: null }
      this.emit('item/started', { item: this.itemFor(parentCall, 'inProgress'), threadId: parentCall.threadId, turnId: parentCall.turnId, startedAtMs: parentCall.startedMs })
    }
    return child
  }

  /**
   * The sub-agent's text and thinking so far, from its child session's stored messages (ZCode streams none of it):
   * each agentMessage / reasoning item not shown yet (or grown since), with the ids history gives them.
   */
  syncChild(childId) {
    const child = this.children.get(childId)
    if (!child || !this.options.childMessages) return
    let messages = null
    try { messages = this.options.childMessages(childId, child.syncFrom ?? null) } catch { messages = null }
    if (!Array.isArray(messages) || !messages.length) return
    const { turns } = turnsFromMessages(messages, { threadId: childId, cwd: this.options.cwd() })
    for (const item of turns.flatMap((turn) => turn.items)) {
      if (item.type !== 'agentMessage' && item.type !== 'reasoning') continue
      const known = this.items.get(item.id)
      if (known && textOf(known) === textOf(item)) continue
      if (!known) this.itemStarted(item, child.turnId, childId)
      this.itemCompleted(item, child.turnId, childId)
    }
    // The last message may still grow: the next read starts at it.
    const last = messages.at(-1)?.sequence
    if (Number.isInteger(last)) child.syncFrom = last
  }

  childUpdated(payload) {
    const child = this.ensureChild(payload)
    // SubagentSpawned says background: true for Agent run_in_background (it outlives the parent's turn).
    if (payload.background === true) child.background = true
    if (payload.status === 'running' || child.status !== 'running') return
    // The sub-agent's last words (its answer) before its turn ends.
    this.syncChild(child.id)
    child.status = payload.status
    const endedMs = Date.now()
    // A stopped sub-agent (Stop in Background tasks: ZCode's status 'stopped') was interrupted, not failed.
    const status = payload.status === 'completed' ? 'completed' : /cancel|interrupt|stop|kill|abort/.test(payload.status) ? 'interrupted' : 'failed'
    for (const call of this.calls.values()) {
      if (call.threadId !== child.id) continue
      const item = this.items.get(call.callId)
      if (item && isOpen(item)) this.itemCompleted({ ...item, status: status === 'completed' ? 'completed' : 'interrupted' }, child.turnId, child.id)
    }
    this.emit('turn/completed', { threadId: child.id, turn: { id: child.turnId, items: [], itemsView: 'notLoaded', status, error: status === 'failed' ? turnError(payload.error ?? 'The sub-agent failed.') : null, startedAt: seconds(child.startedMs), completedAt: seconds(endedMs), durationMs: payload.totalDurationMs ?? endedMs - child.startedMs } })
    this.emit('thread/status/changed', { threadId: child.id, status: { type: 'idle' } })
  }

  taskUpdated(payload) {
    if (payload.taskKind === 'subagent') return this.subagentTaskUpdated(payload)
    if (payload.taskKind === 'workflow') return this.workflowTaskUpdated(payload)
    if (payload.taskKind && payload.taskKind !== 'bash') return
    const callId = payload.toolCallId
    const entry = this.background.get(payload.taskId) ?? (callId ? { itemId: callId, processId: payload.taskId, command: String(payload.command ?? ''), threadId: this.threadId, turnId: this.calls.get(callId)?.turnId ?? this.turnId, startedMs: Date.now() } : null)
    if (!entry) return
    if (payload.status === 'running') { this.background.set(payload.taskId, { ...entry, pid: payload.pid ?? entry.pid }); return }
    this.background.delete(payload.taskId)
    const call = this.calls.get(entry.itemId)
    const exitCode = payload.status === 'completed' ? 0 : 1
    const base = call ? this.itemFor(call, payload.status === 'completed' ? 'completed' : payload.status === 'cancelled' ? 'interrupted' : 'failed') : { type: 'commandExecution', id: entry.itemId, command: entry.command, cwd: this.options.cwd(), commandActions: [{ type: 'unknown', command: entry.command }], source: 'agent' }
    this.itemCompleted({ ...base, processId: payload.taskId, status: payload.status === 'completed' ? 'completed' : payload.status === 'cancelled' ? 'interrupted' : 'failed', aggregatedOutput: payload.outputTail ?? payload.stdoutTail ?? base.aggregatedOutput ?? null, exitCode, durationMs: Date.now() - entry.startedMs }, entry.turnId, entry.threadId)
  }

  /**
   * A background sub-agent's task (BackgroundTask* with taskKind 'subagent'): its taskId is what
   * session/cancelBackgroundTask stops. The child comes from the payload, else from the Agent call that launched it.
   */
  subagentTaskUpdated(payload) {
    if (!payload.taskId) return
    const known = this.subagentTasks.get(payload.taskId)
    const childId = payload.childSessionId ?? known?.childId ?? (payload.toolCallId ? this.calls.get(payload.toolCallId)?.childThreadId : null) ?? null
    this.subagentTasks.set(payload.taskId, { taskId: payload.taskId, childId, status: payload.status ?? known?.status ?? 'running' })
    const child = childId ? this.children.get(childId) : null
    if (child) child.background = true
  }

  /**
   * How to stop one sub-agent on its own: its background task ({taskId, childId, status}), or null for a foreground
   * sub-agent, which runs inside the parent's turn (stopping it means stopping that turn).
   */
  subagentTaskFor(childId) {
    const child = this.children.get(childId)
    for (const task of this.subagentTasks.values()) if (task.childId === childId || (child?.agentId && task.taskId === child.agentId)) return task
    // ZCode's background task id is the sub-agent's agentId (runner.ts createRuntimeTaskSnapshot).
    if (child?.background && child.agentId) return { taskId: child.agentId, childId, status: child.status }
    return null
  }

  // ---------------------------------------------------------------- dynamic workflows (workflows.js)

  /** The dispatch tool's result folded into its run (emitted with the item that follows). */
  workflowResult(callId, result) {
    const entry = this.workflows.get(callId)
    if (!entry) return
    applyWorkflowToolResult(entry.state, result)
    this.options.onWorkflow?.()
  }

  /** BackgroundTask* for a workflow run (taskKind 'workflow'): taskId ≡ runId; a status other than running is its end. */
  workflowTaskUpdated(payload) {
    if (!payload.taskId) return
    const entry = (payload.toolCallId ? this.workflows.get(payload.toolCallId) : null) ?? this.workflowFor(payload.taskId)
    if (!entry) return
    const changed = bindWorkflowRun(entry.state, String(payload.taskId))
    if (payload.status && payload.status !== 'running') entry.state.taskEnded = payload.status
    if (changed) this.emitWorkflow(entry.callId)
    this.options.onWorkflow?.()
  }

  /** The latest run entry for a run id (or the call-… id a run has until ZCode names it). */
  workflowFor(runId) {
    let found = null
    for (const entry of this.workflows.values()) if (entry.state.run.runId === runId || entry.state.run.id === runId) found = entry
    return found
  }

  workflowEntry(callId) { return this.workflows.get(callId) ?? null }

  /** Runs ZCode has named that are still live: what the server polls (one entry per run id, the latest). */
  liveWorkflows() {
    const byRun = new Map()
    for (const entry of this.workflows.values()) if (entry.state.run.status === 'running' && entry.state.run.runId) byRun.set(entry.state.run.runId, entry)
    return [...byRun.values()].map((entry) => ({ callId: entry.callId, runId: entry.state.run.runId, cursor: entry.state.cursor, taskEnded: entry.state.taskEnded }))
  }

  /** Whether any run of this thread is still live (closing the session would end it). */
  hasLiveWorkflows() {
    for (const entry of this.workflows.values()) if (entry.state.run.status === 'running' && entry.state.run.runId) return true
    return false
  }

  /**
   * Whether the session still runs something that outlives a turn and would stop with it (session/close): a
   * background command (Bash run_in_background), a background sub-agent (Agent run_in_background) or a workflow run.
   */
  hasBackgroundWork() {
    if (this.background.size || this.hasLiveWorkflows()) return true
    for (const child of this.children.values()) if (child.background && child.status === 'running') return true
    for (const task of this.subagentTasks.values()) {
      if (!LIVE_TASK.has(task.status)) continue
      // The child's own end (childUpdated) settles a task whose BackgroundTask end was not heard.
      // ZCode's background task id is the sub-agent's agentId.
      const child = task.childId ? this.children.get(task.childId) : [...this.children.values()].find((entry) => entry.agentId === task.taskId)
      if (!child || child.status === 'running') return true
    }
    return false
  }

  /**
   * The session was closed with work still live (it stopped with it): every running sub-agent's turn and every
   * background command ends as interrupted, so no thread or Background tasks row keeps showing it as running.
   */
  abandonBackground() {
    for (const child of this.children.values()) {
      if (child.status !== 'running') continue
      child.status = 'interrupted'
      const endedMs = Date.now()
      for (const call of this.calls.values()) {
        if (call.threadId !== child.id) continue
        const item = this.items.get(call.callId)
        if (item && isOpen(item)) this.itemCompleted({ ...item, status: 'interrupted' }, child.turnId, child.id)
      }
      this.emit('turn/completed', { threadId: child.id, turn: { id: child.turnId, items: [], itemsView: 'notLoaded', status: 'interrupted', error: null, startedAt: seconds(child.startedMs), completedAt: seconds(endedMs), durationMs: endedMs - child.startedMs } })
      this.emit('thread/status/changed', { threadId: child.id, status: { type: 'idle' } })
    }
    for (const task of this.subagentTasks.values()) if (LIVE_TASK.has(task.status)) task.status = 'cancelled'
    for (const [taskId, entry] of [...this.background]) {
      this.background.delete(taskId)
      const call = this.calls.get(entry.itemId)
      const base = call ? this.itemFor(call, 'interrupted') : { type: 'commandExecution', id: entry.itemId, command: entry.command, cwd: this.options.cwd(), commandActions: [{ type: 'unknown', command: entry.command }], source: 'agent' }
      this.itemCompleted({ ...base, processId: taskId, status: 'interrupted', exitCode: null, durationMs: Date.now() - entry.startedMs }, entry.turnId, entry.threadId)
    }
  }

  /** A run from history (server enrichment) that the projector keeps watching. A live entry for the call wins. */
  adoptWorkflow({ callId, item, turnId, state }) {
    if (this.workflows.has(callId)) return this.workflows.get(callId)
    const entry = { callId, state, turnId, threadId: this.threadId, item }
    this.workflows.set(callId, entry)
    return entry
  }

  /** Journal events polled for a run (v4/conversation/workflowRunEvents). */
  workflowEvents(callId, events, time = Date.now()) {
    const entry = this.workflows.get(callId)
    if (!entry || !applyWorkflowEvents(entry.state, events, { time, live: true })) return false
    this.emitWorkflow(callId)
    return true
  }

  /** The run's summary (v4/conversation/workflowRuns), then its task's end if the journal still has it running. */
  workflowSettle(callId, summary, time = Date.now()) {
    const entry = this.workflows.get(callId)
    if (!entry) return false
    const summarized = applyWorkflowSummary(entry.state, summary, time)
    const ended = entry.state.taskEnded ? applyWorkflowTaskEnd(entry.state, entry.state.taskEnded, time) : false
    if (summarized || ended) this.emitWorkflow(callId)
    return summarized || ended
  }

  /** A run that will not start or go on: its call ended (result applied) or the turn running it was stopped. */
  workflowStopped(callId, result = { status: 'interrupted' }) {
    const entry = this.workflows.get(callId)
    if (entry && applyWorkflowToolResult(entry.state, result)) this.emitWorkflow(callId)
  }

  /** The card's run was replaced by a revised one (Configure): the card follows the new run from here on. */
  workflowReplaced(callId, runId, time = Date.now()) {
    const entry = this.workflows.get(callId)
    if (!entry || typeof runId !== 'string' || !runId || entry.state.run.runId === runId) return false
    entry.state = workflowReplacement(entry.state, runId, time)
    this.emitWorkflow(callId)
    return true
  }

  /** A settled run ZCode resumed (codeDesktop/workflow/resume): live again, polled until its new end. */
  workflowResumed(callId) {
    const entry = this.workflows.get(callId)
    if (!entry || !applyWorkflowResumed(entry.state)) return false
    this.emitWorkflow(callId)
    return true
  }

  /** ZCode stopped: every live run ended with it. */
  workflowsInterrupted(time = Date.now()) {
    for (const entry of this.workflows.values()) if (applyWorkflowInterrupted(entry.state, time)) this.emitWorkflow(entry.callId)
  }

  /** Re-announce a run's item with its new run (item/started while its call runs, else item/completed). */
  emitWorkflow(callId) {
    const entry = this.workflows.get(callId)
    const base = this.items.get(callId) ?? entry?.item
    if (!entry || !base) return
    const item = { ...base, workflowRun: entry.state.run }
    this.items.set(callId, item)
    entry.item = item
    const open = isOpen(item)
    this.emit(open ? 'item/started' : 'item/completed', { item, threadId: entry.threadId, turnId: entry.turnId, ...(open ? { startedAtMs: Date.now() } : { completedAtMs: Date.now() }) })
    this.options.onWorkflowItem?.(item, entry.turnId)
  }

  backgroundTerminals() {
    return [...this.background.values()].map((entry) => ({ itemId: entry.itemId, processId: entry.processId, command: entry.command }))
  }

  /** Pending tool item for an approval card (the request's toolCallId). */
  callFor(callId) { return this.calls.get(callId) ?? null }
}

const isOpen = (item) => item.status === 'inProgress'
const textOf = (item) => (item.type === 'reasoning' ? (item.summary ?? []).join('') : String(item.text ?? ''))

/** A git-style unified diff of a turn's file changes (the changes pane). */
export function unifiedDiff(changes, cwd) {
  return changes.map((change) => {
    const roots = cwd ? [cwd, cwd.replace(/^\/private\//, '/')] : []
    const root = roots.find((candidate) => change.path.startsWith(`${candidate}/`))
    const rel = root ? change.path.slice(root.length + 1) : change.path.replace(/^\//, '')
    if (change.kind?.type === 'add') {
      const lines = String(change.diff ?? '').replace(/\n$/, '').split('\n')
      return `diff --git a/${rel} b/${rel}\nnew file mode 100644\n--- /dev/null\n+++ b/${rel}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => `+${line}`).join('\n')}\n`
    }
    return `diff --git a/${rel} b/${rel}\n--- a/${rel}\n+++ b/${rel}\n${change.diff ?? ''}`
  }).join('')
}
