/**
 * OpenCode 2.x's approvals, questions and the plan card, as LiveThread methods (installed on its prototype by index.js;
 * every name ends in V2 and runs only where `bridge.v2` is set). v2 keeps permission requests and forms in memory and
 * never replays them: a resync lists them again (turns.js reloadedV2), so every ask is taken once per request id.
 *
 *   permission.asked   {id, sessionID, action, resources, save?, metadata?, source?:{messageID, id}}: decided from the root
 *                      thread's current mode (policy.js decide, over 1.x's names: decideV2); allow → `once`, else a
 *                      Codex approval card on the root thread, answered at
 *                      POST /api/session/<request.sessionID>/permission/<id>/reply {decision, message?}
 *     policy denials   in-process, by the plugin's permission.evaluate (v2/plugin.js, from the runtime file's `policy`):
 *                      v2's reject fails every other open ask of the session with it. The bridge's own reject is the
 *                      fallback for a plugin that did not load
 *     Deny + feedback  reject with the message: the model reads it and goes on (and v2 rejects the session's other open
 *                      asks with it: their permission.replied withdraws those cards)
 *     plain Deny       never a reject without a message (v2 ends the execution as a shutdown: no idle, the claim kept):
 *                      the session is interrupted instead, and the call shown declined (its part id in the thread's
 *                      `declined`, read by projection.js). An interrupt that failed: a reject with DECLINED_V2
 *     this session     "Allow for this session" is kept by the bridge (sessionGrantV2, v2's names) and written to the
 *                      runtime policy, so the plugin allows the next such call in-process; the agent only hears `once`
 *                      (v2's saved `always` is per project and outranks every session ruleset)
 *   form.created       a question (metadata.kind 'question', fields q0…) → item/tool/requestUserInput; the answer is
 *                      {q<i>: label or text} (single choice a string), {q<i>: [labels]} for several. Dismissed, unattended
 *                      or any other kind of form: DELETE …/form/:id?message= (a message always: without one the
 *                      question tool ends the execution like a plain Deny)
 *   withdrawn          permission.replied / form.replied / form.cancelled settle a card; an execution's end or its
 *                      interrupt settles its session's cards (v2 publishes nothing for the asks an interrupt drops),
 *                      never another session's (a background sub-agent's). A failed interrupt cancels them with a message
 *   plan card          no plan_exit in 2.x: a root turn the plan agent ran in Plan mode that succeeded shows its plan (a
 *                      plan file it wrote this turn, else its last answer) as a plan item, then the card, after
 *                      turn/completed. Approve: the mode after the plan (writeRuntime: the plugin's policy), the
 *                      ruleset if it changed, POST …/agent {primary}, then the execution prompt (delivery 'queue');
 *                      Keep planning with feedback queues the feedback. A new turn withdraws the card
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterPlanState, allowedExternalDirs, decide, isReadOnlyMode, isSessionDecision, neverAsks, replyFor, sessionGrant, withinRoots } from '../policy.js'
import { appToolsPrefix } from '../app-tools.js'
import { toolPartId } from './history.js'
import { newMessageId } from './live.js'
import { READ_TOOLS_V2 } from './rules.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const strings = (list) => (Array.isArray(list) ? list.filter((value) => typeof value === 'string' && value) : [])
const sessionRoute = (sessionID, tail = '') => `/api/session/${encodeURIComponent(sessionID)}${tail}`
const SETTLED_MAX = 500
const DECLINED_MAX = 200

export const UNATTENDED_V2 = 'No one can answer this: the agent runs unattended. Decide yourself and continue.'
export const DISMISSED_V2 = 'The user dismissed this question.'
export const OTHER_FORM_V2 = 'OpenClaude Desktop can’t show this form. Continue without it.'
export const CANCELLED_V2 = 'The approval was cancelled.'
export const DECLINED_V2 = 'The user declined this tool call.'
export const PLAN_APPROVED_V2 = 'The plan is approved. Implement it now.'

// policy.js decides over 1.x's names: v2's shell is bash, subagent is task (patch is apply_patch, an edit either way).
const V1_ACTION = { shell: 'bash', subagent: 'task' }
const V1_TOOL = { shell: 'bash', subagent: 'task', patch: 'apply_patch' }
const READ_TOOLS_AS_V1 = Object.freeze(READ_TOOLS_V2.map((tool) => V1_ACTION[tool] ?? tool))

/** A v2 permission request as policy.js reads one (1.x's {permission, patterns, always}). */
export function v1Request(request) {
  // External folders are the resources (`<dir>/*`); patch's metadata.filepath joins several paths with ', '.
  return { permission: V1_ACTION[request?.action] ?? String(request?.action ?? ''), patterns: strings(request?.resources), always: strings(request?.save), metadata: {} }
}

/**
 * How the bridge answers one v2 permission.asked under the root thread's mode (policy.js decide). `tool` is the asking
 * call's v2 tool (its part); grants are sessionGrantV2's. In a read-only mode an external folder the read tools may not
 * use is answered `once`: the edit asked next is refused in-process by the plugin (a reject here would also reject the
 * session's other open asks).
 */
export function decideV2(permission, request, { tool, cwd, grants = [], planDirs = [], agentDirs = [], readOnlyTool = false, noUser = false }) {
  const v1Grants = grants.map((grant) => ({ ...grant, permission: V1_ACTION[grant?.permission] ?? grant?.permission }))
  const decision = decide(permission, v1Request(request), { tool: V1_TOOL[tool] ?? tool, readTools: READ_TOOLS_AS_V1, cwd, grants: v1Grants, planDirs, agentDirs, readOnlyTool, noUser })
  if (decision.action === 'reject' && request?.action === 'external_directory' && isReadOnlyMode(permission?.mode) && !neverAsks(permission) && !noUser) return { action: 'allow' }
  return decision
}

/** The grant "Allow for this session" records, in v2's names (the plugin matches it against event.action / resources). */
export const sessionGrantV2 = (request) => sessionGrant({ permission: request?.action, always: request?.save, patterns: request?.resources })

/** A question form's fields as Codex questions (question.ts: key q<i>, title = header, description = question). */
export function questionsOfFormV2(fields) {
  return fields.map((field) => ({
    id: field.key, header: typeof field.title === 'string' ? field.title : '', question: typeof field.description === 'string' ? field.description : '',
    isOther: field.custom !== false, isSecret: false, multiSelect: field.type === 'multiselect',
    options: (Array.isArray(field.options) ? field.options : []).map((option) => ({ label: String(option?.label ?? option?.value ?? ''), description: typeof option?.description === 'string' ? option.description : '' })),
  }))
}

/**
 * Codex answers → v2's Form.Answer: a single choice is a string (a list fails FormInvalidAnswerError), several a list;
 * a chosen option's value (its label, for the question tool), typed text as it is; an unanswered field is left out.
 */
export function formAnswerV2(fields, answers) {
  const answer = {}
  for (const field of fields) {
    const options = Array.isArray(field.options) ? field.options : []
    const valueOf = (text) => { const option = options.find((candidate) => String(candidate?.label ?? candidate?.value) === text); return option && option.value !== undefined ? String(option.value) : text }
    const given = (Array.isArray(answers?.[field.key]?.answers) ? answers[field.key].answers : []).map(String).filter((text) => text !== '')
    if (!given.length) continue
    answer[field.key] = field.type === 'multiselect' ? given.map(valueOf) : valueOf(given[0])
  }
  return answer
}

export const ASKS_V2 = {
  /** permission.* / form.* of this session (handleEventV2; reloadedV2 hands the open ones in again). */
  onAskV2(event) {
    const data = event.data ?? {}
    const root = this.rootThread
    switch (event.type) {
      case 'permission.asked': return void this.askOnceV2(data.id, () => this.permissionV2(data))
      case 'form.created': return void this.askOnceV2(data.form?.id, () => this.formV2(data.form))
      case 'permission.replied': return void root.settleAskV2(data.requestID, 'Answered.')
      case 'form.replied':
      case 'form.cancelled': return void root.settleAskV2(data.id, 'Answered.')
      default:
    }
  },

  /** One ask, taken once: not while it is being answered, nor once settled (a resync's list may predate the answer). */
  askOnceV2(id, run) {
    if (typeof id !== 'string' || !id) return
    const root = this.rootThread
    root.asksV2 ??= new Map()
    if (root.asksV2.has(id) || root.settledV2?.has(id)) return
    root.asksV2.set(id, this.sessionID)
    void run().catch((error) => this.bridge.log(`ask ${id}: ${error?.stack || error}`)).finally(() => {
      root.asksV2.delete(id)
      root.noteSettledV2(id)
    })
  },

  noteSettledV2(id) {
    this.settledV2 ??= new Set()
    this.settledV2.add(id)
    if (this.settledV2.size > SETTLED_MAX) this.settledV2.delete(this.settledV2.values().next().value)
  },

  /** (root) An ask v2 settled or dropped: its card is withdrawn and nothing is replied to it. */
  settleAskV2(id, why) {
    if (typeof id !== 'string' || !id) return
    this.noteSettledV2(id)
    this.pendingFor(id)?.abort(why)
  },

  /** (root) The open asks of one session settle (its execution ended or was interrupted); `keep`: still open in v2. */
  withdrawAsksV2(sessionID, why, keep = null) {
    for (const [id, owner] of [...(this.asksV2 ?? [])]) if (owner === sessionID && !keep?.has(id)) this.settleAskV2(id, why)
  },

  /**
   * (root) The open asks of one session, cancelled here though still open in v2 (its interrupt failed): their cards are
   * withdrawn and answered with a message. Still taken (askOnceV2), but no longer the session's: its end, which follows,
   * does not settle them unanswered.
   */
  cancelAsksV2(sessionID, why) {
    for (const [id, owner] of [...(this.asksV2 ?? [])]) {
      if (owner !== sessionID) continue
      this.asksV2.set(id, null)
      this.pendingFor(id)?.abort(why)
    }
  },

  /** The tool part a request names (source {messageID, id}: the synthetic id v2/history.js gives it). */
  toolPartForV2(source) {
    if (!isRecord(source) || typeof source.id !== 'string' || !source.id) return null
    const id = toolPartId(source.messageID, source.id)
    return this.projector.messages.get(source.messageID)?.parts.find((part) => part.id === id) ?? this.toolPartFor(source.id)
  },

  /** (root) The folders the thread's agent allows outside the workspace (its external_directory allow rules), for decide. */
  async agentDirsOfV2() {
    const agents = await this.bridge.agentList(this.cwd).catch(() => [])
    const rules = (agents.find((agent) => agent?.id === this.agentName())?.permissions ?? []).map((rule) => ({ permission: rule?.action, pattern: rule?.resource, action: rule?.effect }))
    this.agentDirsV2 = allowedExternalDirs(rules)
    return this.agentDirsV2
  },

  /** The root thread and its sub-agents rewrite their runtime files (the plugin reads mode and grants from them). */
  writeRuntimeTreeV2() {
    const root = this.rootThread
    root.writeRuntime()
    for (const child of this.bridge.children.values()) if (child.root === root) { child.permission = root.permission; child.writeRuntime() }
  },

  async permissionV2(request) {
    const root = this.rootThread
    const api = await this.bridge.v2Api()
    const reply = (decision, message) => api.post(sessionRoute(request.sessionID ?? this.sessionID, `/permission/${encodeURIComponent(request.id)}/reply`), { decision, ...(message ? { message } : {}) })
      .catch((error) => { if (error?.status !== 404) this.bridge.log(`permission reply ${request.id}: ${error?.message}`) })
    const action = typeof request.action === 'string' ? request.action : ''
    // OpenClaude Desktop's own tools need no card here: the app asks the user itself where it matters (as for Codex).
    if (this.bridge.appTools && action.startsWith(appToolsPrefix(this.bridge.appTools))) return reply('once')
    const part = this.toolPartForV2(request.source)
    const tool = part?.tool
    const files = Array.isArray(request.metadata?.files) ? request.metadata.files.filter((file) => typeof file?.file === 'string') : []
    // write's success carries no diff (write.ts): the one it asked with stands in.
    if (part && tool === 'write' && files.length === 1 && typeof files[0].patch === 'string') this.askDiffs.set(part.callID, files[0].patch)
    const agentDirs = action === 'external_directory' ? await root.agentDirsOfV2() : []
    // A connector tool its server marks read-only needs no card (as for Codex).
    const readOnlyTool = await this.bridge.readOnlyMcpTool(this.cwd, action).catch(() => false)
    const context = () => ({ tool, cwd: root.cwd, grants: root.sessionGrants, planDirs: this.bridge.planDirs(root.cwd), agentDirs, readOnlyTool, noUser: root.noUser() })
    const decision = decideV2(root.permission, request, context())
    if (decision.action === 'allow') return reply('once')
    if (decision.action === 'reject') {
      this.bridge.log(`permission ${request.id}: ${action} refused by the bridge (the plugin did not)`)
      return reply('reject', decision.reason)
    }
    if (root.settledV2?.has(request.id)) return
    const message = part ? this.projector.messages.get(part.messageID) : null
    const item = part && message ? this.projector.itemOf(part, message) : null
    const turnId = root.activeTurn?.id ?? this.turnOf.get(part?.messageID) ?? ''
    const itemId = part?.id ?? request.source?.id ?? request.id
    // No standing grant in Plan / chat / review: the card offers none (and decide never honours one there).
    const grantable = !isReadOnlyMode(root.permission.mode)
    const save = strings(request.save)
    let method, params
    if (item?.type === 'fileChange' || action === 'edit') {
      const changes = files.length ? changesOfFilesV2(files, this.cwd) : item?.changes ?? []
      method = 'item/fileChange/requestApproval'
      params = { threadId: root.id, turnId, itemId, startedAtMs: Date.now(), reason: decision.reason ?? null, grantRoot: null, changes, sessionGrantable: grantable, codeDesktop: { declineFeedback: true } }
    } else {
      const resources = strings(request.resources)
      const input = part?.state?.input
      // v2 asks after the call's input is out (session.tool.called comes first): the command is the call's.
      const command = (tool === 'shell' && typeof input?.command === 'string' && input.command) || (item?.type === 'commandExecution' && item.command)
        || (action === 'shell' && resources.length ? resources.join(' | ') : `${tool ?? action} ${JSON.stringify(input && Object.keys(input).length ? input : resources)}`)
      method = 'item/commandExecution/requestApproval'
      params = {
        kind: 'command', threadId: root.id, turnId, itemId, startedAtMs: Date.now(), approvalId: request.id, environmentId: null, reason: decision.reason ?? null,
        command, cwd: item?.cwd ?? this.cwd, commandActions: item?.commandActions ?? [{ type: 'unknown', command }], sessionGrantable: grantable && save.length > 0,
        ...(this.root ? { childThreadId: this.id } : {}),
        codeDesktop: { declineFeedback: true },
      }
    }
    // A card another card's "Allow for this session" covers is settled by that grant (resolveCoveredApprovals).
    let granted = false
    const epoch = root.grantEpoch
    const covered = () => decideV2(root.permission, request, context()).action === 'allow'
    const result = await root.clientRequest(method, params, 'waitingOnApproval', request.id, { covered, granted: () => { granted = true } })
    if (granted) return reply('once')
    // Withdrawn: settled in v2 (answered elsewhere, rejected with another card's feedback, its execution over), or
    // cancelled here (the turn interrupted, the thread closed), answered with a message so nothing ends as a shutdown.
    if (result === undefined) return root.settledV2?.has(request.id) ? undefined : reply('reject', CANCELLED_V2)
    const value = result?.decision
    if (isSessionDecision(value) && params.sessionGrantable && root.grantEpoch === epoch && !isReadOnlyMode(root.permission.mode)) {
      root.sessionGrants.push(sessionGrantV2(request))
      this.writeRuntimeTreeV2()
      root.resolveCoveredApprovals()
    }
    if (replyFor(value) === 'once') return reply('once')
    const feedback = value === 'decline' && typeof result?.codeDesktop?.feedback === 'string' ? result.codeDesktop.feedback.trim().slice(0, 4000) : ''
    if (feedback) return reply('reject', feedback)
    // A plain Deny (or Cancel) stops the turn, as on 1.x: an interrupt, which drops the session's open asks (this one
    // included: settled by it), and the call shows declined. An interrupt that failed left the ask open: rejected with
    // a message instead (v2 gives it to the session's other asks too), so the execution does not wait on it.
    this.markDeclinedV2(part)
    await this.interruptV2({ failed: () => reply('reject', DECLINED_V2) })
  },

  /** A call the user turned down with nothing to say: interrupted in v2, shown declined (projection.js reads `declined`). */
  markDeclinedV2(part) {
    if (!part?.id) return
    const declined = [...(this.store.get(this.id).declined ?? []).filter((id) => id !== part.id), part.id].slice(-DECLINED_MAX)
    this.store.update(this.id, { declined })
    this.projector.meta = this.store.get(this.id)
  },

  async formV2(form) {
    if (!isRecord(form) || typeof form.id !== 'string') return
    const root = this.rootThread
    const api = await this.bridge.v2Api()
    const base = sessionRoute(form.sessionID ?? this.sessionID, `/form/${encodeURIComponent(form.id)}`)
    const cancel = (message) => api.delete(base, { query: { message } }).catch((error) => { if (error?.status !== 404) this.bridge.log(`form ${form.id}: ${error?.message}`) })
    // Only the question tool's forms have a card (MCP elicitations, a web search provider's set-up have none yet).
    if (form.metadata?.kind !== 'question') return cancel(OTHER_FORM_V2)
    if (root.noUser()) return cancel(UNATTENDED_V2)
    const fields = (Array.isArray(form.fields) ? form.fields : []).filter((field) => isRecord(field) && typeof field.key === 'string' && field.hidden !== true)
    const tool = isRecord(form.metadata.tool) ? form.metadata.tool : null
    const part = this.toolPartForV2(tool)
    const turnId = root.activeTurn?.id ?? this.turnOf.get(part?.messageID) ?? ''
    const itemId = part?.id ?? tool?.id ?? form.id
    if (root.settledV2?.has(form.id)) return
    const response = await root.clientRequest('item/tool/requestUserInput', {
      threadId: root.id, turnId, itemId, questions: questionsOfFormV2(fields), isBlocking: true, autoResolutionMs: null,
    }, 'waitingOnUserInput', form.id)
    if (!response?.answers) return root.settledV2?.has(form.id) ? undefined : cancel(DISMISSED_V2)
    await api.post(`${base}/reply`, { answer: formAnswerV2(fields, response.answers) }).catch((error) => {
      this.bridge.log(`form reply ${form.id}: ${error?.message}`)
      return cancel(DISMISSED_V2)
    })
  },

  // ---------------------------------------------------------------- plan card

  /**
   * The plan a root turn ended with (executionEndedV2, before turn/completed): a turn the plan agent ran in Plan mode
   * that succeeded, with somebody to ask. Its text: the plan file it wrote this turn, else its last answer.
   */
  planOfTurnV2(event) {
    const active = this.activeTurn
    if (this.root || this.actor || !active || event.type !== 'session.execution.succeeded' || this.interrupted || this.turnError) return null
    if (!['turn', 'external', 'command'].includes(active.kind) || this.info.agent !== 'plan' || this.permission?.mode !== 'plan' || this.noUser()) return null
    const items = this.turns().find((turn) => turn.id === active.id)?.items ?? []
    const dirs = this.bridge.planDirs(this.cwd)
    let text = ''
    for (const item of [...items].reverse()) {
      if (text || item.type !== 'fileChange' || item.status !== 'completed') continue
      for (const change of item.changes ?? []) {
        if (!withinRoots(change.path, dirs)) continue
        try { text = fs.readFileSync(change.path, 'utf8') } catch {}
        if (text) break
      }
    }
    if (!text.trim()) text = [...items].reverse().find((item) => item.type === 'agentMessage' && item.text?.trim())?.text ?? ''
    return text.trim() ? { turnId: active.id, itemId: `${active.id}-plan`, text } : null
  },

  /** The plan card, after the turn completed (it does not hold the turn): Approve, or Keep planning (feedback queued). */
  async planReviewV2({ turnId, itemId }) {
    this.planCardV2?.abort('Replaced.')
    const request = this.clientRequest('item/tool/requestUserInput', {
      threadId: this.id, turnId, itemId,
      questions: [{ id: 'plan-review', header: 'Plan', question: 'Implement this plan?', isOther: true, isSecret: false, multiSelect: false, options: [{ label: 'Approve', description: 'Leave Plan mode and implement the plan' }, { label: 'Keep planning', description: 'Stay in Plan mode' }] }],
      isBlocking: true, autoResolutionMs: null,
    }, 'waitingOnUserInput', `plan:${turnId}`)
    const card = this.pendingFor(`plan:${turnId}`)
    this.planCardV2 = card
    const response = await request
    if (this.planCardV2 === card) this.planCardV2 = null
    if (!response || this.closed) return
    const answers = response.answers?.['plan-review']?.answers ?? []
    if (answers.length === 1 && answers[0] === 'Approve') return this.planApprovedV2(response.codeDesktop?.afterPlan)
    const feedback = answers.filter((answer) => answer !== 'Keep planning').join('\n').trim().slice(0, 8000)
    if (!feedback) return
    this.queue.unshift({ id: randomUUID(), input: [{ type: 'text', text: feedback, text_elements: [] }], clientUserMessageId: null })
    this.queueChanged()
    this.startNext()
  },

  /**
   * Approve: the mode after the plan (the plugin's policy and the sandbox follow the runtime file), the ruleset if it
   * changed (it does not depend on the mode in 2.x), the primary agent (POST …/agent), then the execution prompt.
   */
  async planApprovedV2(afterPlan) {
    this.setPermission(afterPlanState(this.permission, afterPlan))
    this.store.update(this.id, { permission: this.permission })
    this.writeRuntimeTreeV2()
    await this.refreshRules()
    const input = [{ type: 'text', text: PLAN_APPROVED_V2, text_elements: [] }]
    if (this.busy || this.activeTurn || this.startingTurn) {
      this.queue.unshift({ id: randomUUID(), input, clientUserMessageId: null })
      this.queueChanged()
      return
    }
    this.startingTurn = true
    try {
      this.primaryAgent = await this.bridge.primaryAgent(this.cwd, this.agentChoice).catch(() => 'build')
      // The plan agent's own model (agentRun) is not the execution's: resolved again for the primary agent.
      await this.resolveAgentModelV2().catch((error) => this.bridge.log(`agent model ${this.id}: ${error?.message}`))
      await this.selectV2()
      await this.postTurnV2(newMessageId(), 'turn', input, { text: PLAN_APPROVED_V2 }, { delivery: 'queue' })
    } catch (error) { this.bridge.log(`plan approved ${this.id}: ${error?.message ?? error}`) } finally { this.startingTurn = false }
  },
}

/** An ask's metadata.files (FileDiff: file relative to the location or absolute) as Codex file changes. */
function changesOfFilesV2(files, cwd) {
  return files.map((file) => ({
    path: path.isAbsolute(file.file) || !cwd ? file.file : path.resolve(cwd, file.file),
    kind: file.status === 'added' ? { type: 'add' } : file.status === 'deleted' ? { type: 'delete' } : { type: 'update', move_path: null },
    diff: typeof file.patch === 'string' ? file.patch : '',
  }))
}

/**
 * (Bridge) An ask of no session: a form v2 could not attribute ("global": an MCP elicitation) has no card yet and is
 * cancelled with a message, in the location it came from.
 */
export async function globalAskV2(bridge, event) {
  if (event.type !== 'form.created') return
  const form = event.data?.form
  if (!isRecord(form) || typeof form.id !== 'string') return
  const api = await bridge.v2Api()
  await api.delete(sessionRoute('global', `/form/${encodeURIComponent(form.id)}`), { query: { message: OTHER_FORM_V2 }, ...(event.directory ? { location: event.directory } : {}) })
    .catch((error) => { if (error?.status !== 404) bridge.log(`form ${form.id}: ${error?.message}`) })
}
