/**
 * OpenCode 2.x's turn lifecycle, as LiveThread methods (installed on its prototype by index.js; every name ends in V2
 * and runs only where `bridge.v2` is set). session.status / session.idle are never published in 2.x: its executions
 * are the busy periods.
 *
 *   turn/start     POST /api/session/:id/agent and /model only when they differ from the session's (both are session
 *                  state in 2.x, each call a transcript message), then POST …/prompt {id, delivery:'steer'} with an id
 *                  the bridge chose: the turn is that id, announced at once (its events may come before the answer)
 *   /command       POST …/command answers 204 with no id: the turn is claimed by the first user item enqueued in the
 *                  session after it (session.inbox.enqueued is published before the answer). A sub-agent command (or one
 *                  that sends nothing) enqueues nothing here: its turn is the bridge's own and ends at once (the child
 *                  session is a sub-agent thread; its end wakes this session later, an external turn)
 *   review/start   2.2.5's review prompt (v2/review.js) sent as a prompt with its id, under the read-only review mode;
 *                  the agent is not switched (Plan would add switches and reminders, and restart claude-agent)
 *   steer          a prompt {delivery:'steer'} into the running execution; its item waits for session.inbox.delivered
 *                  (v2 hands it in at the next step boundary). Delivered after the turn ended, it starts a turn of its own
 *   interrupt      POST …/interrupt?resume=false; the bridge's undelivered inputs are deleted from the inbox (an
 *                  interrupt keeps them, and the next wake would deliver them); false (nothing ran) ends the turn here
 *   compact        POST …/compact {id}: the compaction message has that id, the turn too
 *   execution.*    started → busy; succeeded / failed / interrupted (a shutdown included) → finishTurn, after the idle
 *                  message the adapter appends (the turn's outcome, as on a reload)
 *
 * Turns not started here (Q6: shown as external turns), by v2/history.js attributeTurns' rules so a reload agrees: a
 * user message the bridge did not send starts one (closing the one open: a queued prompt delivered in the same
 * execution is a turn of its own); a step or compaction with no turn open starts one, named after the synthetic or skill
 * message that woke it (a background sub-agent or shell finished) or else itself; the user's own command (shell.started
 * with no turn open) is a turn that ends with it.
 *
 * turn/start, a steer, review and compact first check that the bridge's plugin is active in the folder
 * (bridgePluginGuardV2, v2/extensions.js): refused with the reason otherwise, never run without it.
 *
 * Approvals, questions and the plan card (permission.* / form.*, a Plan turn's end) are v2/asks.js's.
 *
 * Events change the Projector through LiveAdapterV2 (v2/live.js); each changed part becomes its items here. While a
 * live thread reloads (Bridge.resync, thread/resume…), or openThread loads one, its events wait (resyncBufferV2) and
 * are applied over the reloaded state.
 */
import { RpcError, invalidParams } from '../transport.js'
import { errorInfoOfV2, isDefaultTitle, planOf, tokenBreakdown, addBreakdown } from '../projection.js'
import { isReadOnlyMode } from '../policy.js'
import { splitModel } from '../models.js'
import { LiveAdapterV2, messageIdOfEvent, newMessageId, promptBodyV2, promptInputV2, retryNoticeV2 } from './live.js'
import { compactionMessageId } from './history.js'
import { reviewPromptV2 } from './review.js'
import { childRulesV2 } from './rules.js'

const seconds = (ms) => Math.floor(ms / 1000)
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const route = (thread, tail = '') => `/api/session/${encodeURIComponent(thread.sessionID)}${tail}`

export const THREAD_V2 = {
  liveV2() {
    this.ownInboxV2 ??= new Set()
    this.pendingSteersV2 ??= new Map()
    return (this.adapterV2 ??= new LiveAdapterV2(this.projector, { sessionID: this.sessionID }))
  },

  // ---------------------------------------------------------------- params

  /** The session's agent and model as this turn runs them: POSTed only when they differ (each is a transcript message). */
  async selectV2() {
    const api = await this.bridge.v2Api()
    const agent = this.agentName()
    if (agent && this.info.agent !== agent) {
      await api.post(route(this, '/agent'), { agent })
      this.info = { ...this.info, agent }
    }
    const model = splitModel(this.turnModel() ?? '')
    if (!model) return
    const variant = this.variant()
    const ref = { id: model.modelID, providerID: model.providerID, ...(variant ? { variant } : {}) }
    const current = this.info.model
    if (current?.id === ref.id && current?.providerID === ref.providerID && (current?.variant ?? 'default') === (ref.variant ?? 'default')) return
    await api.post(route(this, '/model'), { model: ref })
    this.info = { ...this.info, model: ref }
  },

  /**
   * resolveAgentModel for 2.x: the agent's configured model is its Agent.Info.model (GET /api/agent). A session's model
   * always outranks its agent's in 2.x (runner/model.ts), so the bridge picks and POSTs it itself (selectV2).
   */
  async resolveAgentModelV2() {
    const agent = this.agentName()
    const state = (this.agentModels ??= { lastRequested: null, picks: {} })
    const requested = this.model
    if (state.lastRequested !== null && requested && requested !== state.lastRequested) state.picks[agent] = requested
    state.lastRequested = requested
    this.agentRun = null
    if (state.picks[agent]) return
    const entry = (await this.bridge.agentList(this.cwd)).find((candidate) => candidate?.id === agent)
    const own = isRecord(entry?.model) && entry.model.providerID && entry.model.id ? entry.model : null
    const configured = own ? `${own.providerID}/${own.id}` : null
    const variant = typeof own?.variant === 'string' && own.variant ? own.variant : null
    if (!configured || configured === requested) {
      if (configured && variant) this.agentRun = { model: configured, variant }
      return
    }
    this.agentRun = { model: configured, variant }
  },

  /** The session's ruleset (v2/rules.js), PATCHed when it changed; a sub-agent's adds its agent's own limits. */
  async applyRulesV2() {
    if (this.actor) return
    const root = this.rootThread
    let rules = await this.bridge.rulesV2({ permission: root.permission, tools: root.tools, cwd: root.cwd, workflowAgent: this.store.get(root.id).workflowAgent === true })
    if (this.root) {
      const agents = this.info.agent ? await this.bridge.agentList(this.cwd).catch(() => []) : []
      rules = childRulesV2(rules, agents.find((agent) => agent?.id === this.info.agent)?.permissions ?? [])
    }
    const key = JSON.stringify(rules)
    if (key === this.appliedRules) return
    await (await this.bridge.v2Api()).patch(route(this), { permissions: rules })
    this.appliedRules = key
  },

  // ---------------------------------------------------------------- input

  async beginTurnV2(params) {
    if (isRecord(params.outputSchema)) throw invalidParams(`${this.flavor.name} 2.x has no structured output for a turn.`)
    await this.applyParams(params)
    // Fail closed: no turn where the bridge's plugin (sandbox profile, prompt, edit guard, policy) isn't active.
    await this.bridge.bridgePluginGuardV2(this.cwd)
    await this.applyRules().catch((error) => this.bridge.log(`rules ${this.id}: ${error?.message}`))
    await this.bridge.catalog.load().catch(() => {})
    const prompt = promptInputV2(params.input)
    this.primaryAgent = await this.bridge.primaryAgent(this.cwd, this.agentChoice).catch(() => 'build')
    await this.resolveAgentModelV2().catch((error) => this.bridge.log(`agent model ${this.id}: ${error?.message}`))
    await this.selectV2()
    const firstText = (Array.isArray(params.input) ? params.input : []).find((item) => item?.type === 'text' && typeof item.text === 'string')?.text ?? ''
    if (!this.store.get(this.id).preview && firstText) this.store.update(this.id, { preview: firstText.slice(0, 200) })
    if (prompt.command) return this.commandV2(params, prompt, firstText)
    return this.postTurnV2(newMessageId(), 'turn', params.input, promptBodyV2(prompt))
  },

  /**
   * Open the bridge's own turn `id` (announced now, sent with the turn/start answer), then POST its prompt. A refused
   * prompt takes the turn back with nothing sent to the client.
   */
  async postTurnV2(id, kind, input, body, { extraItems = [], delivery = 'steer' } = {}) {
    const api = await this.bridge.v2Api()
    this.liveV2()
    this.held = true
    if (input) this.store.rememberInput(this.id, id, input)
    this.projector.meta = this.store.get(this.id)
    const startedMs = Date.now()
    this.expectV2 ??= new Map()
    this.expectV2.set(id, { kind })
    this.ownInboxV2.add(id)
    this.openOwnTurnV2(id, kind, startedMs, extraItems)
    try {
      await api.post(route(this, '/prompt'), { id, ...body, delivery })
    } catch (error) {
      this.dropOwnTurnV2(id)
      throw error
    }
    this.lastActivity = Date.now()
    this.store.update(this.id, { lastActivity: this.lastActivity })
    setImmediate(() => {
      // The agent's configured model ran instead of the composer's: said once per change (model/rerouted).
      if (this.agentRun && this.agentRun.model !== this.model) {
        const key = `${this.agentName()}:${this.model}:${this.agentRun.model}`
        if (this.reroutedKey !== key) { this.reroutedKey = key; this.emit('model/rerouted', { threadId: this.id, turnId: id, fromModel: this.model ?? '', toModel: this.agentRun.model, reason: 'agentConfig' }) }
      }
      this.release()
    })
    return { turn: { id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(startedMs), completedAt: null, durationMs: null } }
  },

  /** The bridge's own turn starts: turn/started and its userMessage item (from the remembered input), held for the answer. */
  openOwnTurnV2(id, kind, startedMs, extraItems = []) {
    this.planCardV2?.abort('A new turn started.')
    this.activeTurn = { id, startedMs, kind }
    this.turnOf.set(id, id)
    this.turnError = null
    this.interrupted = false
    this.forceStatus = null
    this.wakingV2 = null
    if (kind === 'compaction') {
      this.emit('turn/started', { threadId: this.id, turn: { id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(startedMs), completedAt: null, durationMs: null } })
      this.publishStatus()
    } else this.announceTurn({ id, time: { created: startedMs } }, extraItems)
  },

  /** A prompt v2 refused: the turn it opened is gone, and so is everything held for it. */
  dropOwnTurnV2(id) {
    this.expectV2?.delete(id)
    this.ownInboxV2?.delete(id)
    if (this.activeTurn?.id === id) this.activeTurn = null
    this.turnOf.delete(id)
    this.items.clear()
    this.buffer.splice(0)
    this.held = false
  },

  /**
   * A slash command: POST …/command, the turn claimed from the session's next user item enqueued (not the bridge's
   * own). None within claimMs of the answer: the command ran outside this session (a sub-agent command: its child is
   * a sub-agent thread) or sent nothing, and its turn, the bridge's own, ends at once.
   */
  async commandV2(params, prompt, firstText) {
    const api = await this.bridge.v2Api()
    this.liveV2()
    const name = prompt.command
    const args = firstText.replace(new RegExp(`^\\s*/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*`), '')
    this.held = true
    let claimedId = null
    const claimed = new Promise((resolve) => {
      this.commandClaimV2 = (id) => {
        this.commandClaimV2 = null
        claimedId = id
        // The bridge's from here on: its delivery is this turn's prompt, an interrupt deletes it while undelivered.
        this.expectV2 ??= new Map()
        this.expectV2.set(id, { kind: 'command' })
        this.ownInboxV2.add(id)
        this.store.rememberInput(this.id, id, params.input)
        this.projector.meta = this.store.get(this.id)
        this.openOwnTurnV2(id, 'command', Date.now())
        resolve(id)
      }
    })
    try {
      await api.post(route(this, '/command'), { name, text: args, ...(prompt.files.length ? { files: prompt.files } : {}), ...(prompt.skills.length ? { skills: prompt.skills } : {}), delivery: 'steer' })
    } catch (error) {
      this.commandClaimV2 = null
      if (claimedId) this.dropOwnTurnV2(claimedId)
      else { this.buffer.splice(0); this.held = false }
      throw error
    }
    let timer
    const id = await Promise.race([claimed, new Promise((resolve) => { timer = setTimeout(() => resolve(null), this.bridge.v2.claimMs ?? 3000); timer.unref?.() })])
    clearTimeout(timer)
    this.commandClaimV2 = null
    const turnId = id ?? newMessageId()
    if (!id) {
      this.store.rememberInput(this.id, turnId, params.input)
      this.projector.meta = this.store.get(this.id)
      this.openOwnTurnV2(turnId, 'command', Date.now())
      this.finishTurn({ continuing: this.busy })
    }
    this.lastActivity = Date.now()
    this.store.update(this.id, { lastActivity: this.lastActivity })
    setImmediate(() => this.release())
    const started = this.activeTurn?.id === turnId ? this.activeTurn.startedMs : Date.now()
    return { turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(started), completedAt: null, durationMs: null } }
  },

  async steerV2(params) {
    const active = this.activeTurn
    if (!active || (params.expectedTurnId && params.expectedTurnId !== active.id) || active.kind === 'compaction')
      throw new RpcError(-32600, 'No active turn to steer.', { codexErrorInfo: { activeTurnNotSteerable: { turnKind: active?.kind === 'compaction' ? 'compact' : 'regular' } } })
    const prompt = promptInputV2(params.input)
    if (!prompt.text && !prompt.files.length && !prompt.skills.length) throw invalidParams('The message is empty.')
    // A steer delivered after the turn ended starts one of its own: the same check as turn/start.
    await this.bridge.bridgePluginGuardV2(this.cwd)
    const api = await this.bridge.v2Api()
    this.liveV2()
    const id = newMessageId()
    this.store.rememberInput(this.id, id, params.input)
    this.store.addTo(this.id, 'steers', id)
    this.projector.meta = this.store.get(this.id)
    this.pendingSteersV2.set(id, { clientId: typeof params.clientUserMessageId === 'string' && params.clientUserMessageId ? params.clientUserMessageId.slice(0, 200) : null })
    this.ownInboxV2.add(id)
    try {
      await api.post(route(this, '/prompt'), { id, ...promptBodyV2(prompt), delivery: 'steer' })
    } catch (error) {
      this.inboxGoneV2(id)
      throw error
    }
    return { turnId: active.id }
  },

  async reviewV2(params, { args, label }) {
    if (this.busy || this.activeTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before starting a review.')
    await this.applyParams(params)
    await this.bridge.bridgePluginGuardV2(this.cwd)
    await this.bridge.catalog.load().catch(() => {})
    // Read-only whatever the session's mode (capabilities.reviewReadOnly): the bridge's 'review' mode until it ends.
    const restore = isReadOnlyMode(this.permission.mode) ? null : this.permission
    if (restore) {
      this.setPermission({ ...restore, mode: 'review', sandbox: 'read-only' })
      this.reviewRestore = { review: this.permission, previous: restore }
      this.writeRuntime()
      await this.refreshRules()
    }
    const id = newMessageId()
    try {
      this.primaryAgent = await this.bridge.primaryAgent(this.cwd, this.agentChoice).catch(() => 'build')
      await this.selectV2()
      this.store.update(this.id, { reviews: { ...(this.store.get(this.id).reviews ?? {}), [id]: { label } } })
      const { turn } = await this.postTurnV2(id, 'review', null, { text: reviewPromptV2(args, this.cwd) }, { extraItems: [{ type: 'enteredReviewMode', id: `${id}-review`, review: label }] })
      return { turn, reviewThreadId: this.id }
    } catch (error) { await this.endReview(); throw error }
  },

  /** thread/compact/start: v2 compacts with the session's model; the compaction message (and the turn) is `id`. */
  async compactV2() {
    if (this.busy || this.activeTurn || this.startingTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before compacting.', { codexErrorInfo: 'activeTurnNotSteerable' })
    // The turn is taken before anything is awaited: a second compact (or turn) meanwhile is refused.
    this.liveV2()
    const id = newMessageId()
    this.held = true
    this.expectV2 ??= new Map()
    this.expectV2.set(id, { kind: 'compaction' })
    this.ownInboxV2.add(id)
    this.openOwnTurnV2(id, 'compaction', Date.now())
    try {
      await this.bridge.bridgePluginGuardV2(this.cwd)
      await (await this.bridge.v2Api()).post(route(this, '/compact'), { id, delivery: 'steer' })
    } catch (error) { this.dropOwnTurnV2(id); throw error }
    setImmediate(() => this.release())
    return {}
  },

  /**
   * Interrupt the session's execution; false when the interrupt itself failed (its asks are still open in v2).
   * @param {{ failed?: () => Promise<unknown> }} [options] - failed: run first when it failed (a plain Deny's own reply)
   */
  async interruptV2({ failed: onFailed = null } = {}) {
    this.interrupted = true
    const turnId = this.activeTurn?.id
    let interrupted = false
    let failed = false
    try { interrupted = await (await this.bridge.v2Api()).interrupt(this.sessionID) } catch (error) { failed = true; this.bridge.log(`interrupt ${this.id}: ${error?.message}`) }
    // The session's open asks go with the interrupt (v2 publishes nothing for them): withdrawn, never answered. A failed
    // interrupt leaves them open in v2: cancelled with a message, so no execution waits on an ask nobody sees. Other
    // sessions' cards (a background sub-agent's) stay, as at a turn's end; the root's plan card goes.
    if (failed) {
      await onFailed?.()
      this.rootThread.cancelAsksV2?.(this.sessionID, 'Turn interrupted.')
    } else this.rootThread.withdrawAsksV2?.(this.sessionID, 'Turn interrupted.')
    this.planCardV2?.abort('Turn interrupted.')
    await this.dropInboxV2()
    // Nothing was running (a prompt not yet delivered, a turn whose end was missed): it ends here.
    if (!interrupted && turnId && this.activeTurn?.id === turnId) this.finishTurn()
    return !failed
  },

  /** The bridge's own inputs still in the session's inbox (an interrupt keeps them): deleted, as if never sent. */
  async dropInboxV2() {
    const own = [...(this.ownInboxV2 ?? [])]
    if (!own.length) return
    const api = await this.bridge.v2Api()
    let ids = own
    try {
      const pending = await api.get(route(this, '/inbox'))
      if (Array.isArray(pending)) ids = own.filter((id) => pending.some((item) => item?.id === id))
    } catch (error) { this.bridge.log(`inbox ${this.id}: ${error?.message}`) }
    for (const id of ids) {
      try { await api.delete(route(this, `/inbox/${encodeURIComponent(id)}`)) } catch (error) { if (error?.status !== 404) this.bridge.log(`inbox ${id}: ${error?.message}`) }
      this.inboxGoneV2(id)
    }
  },

  /** An input of the bridge's that will never be delivered (deleted, cancelled, refused). */
  inboxGoneV2(id) {
    this.ownInboxV2?.delete(id)
    this.expectV2?.delete(id)
    if (this.pendingSteersV2?.delete(id)) {
      const steers = (this.store.get(this.id).steers ?? []).filter((steer) => steer !== id)
      this.store.update(this.id, { steers: steers.length ? steers : undefined })
      this.projector.meta = this.store.get(this.id)
    }
  },

  // ---------------------------------------------------------------- events

  /** One normalized event of this session (Bridge.onEventV2); held while a resync reloads the thread. */
  onEventV2(event) {
    if (this.closed) return
    if (this.resyncBufferV2) { this.resyncBufferV2.push(event); return }
    try { this.handleEventV2(event) } catch (error) { this.bridge.log(`event ${event?.type} ${this.id}: ${error?.stack || error}`) }
  },

  handleEventV2(event) {
    const data = event.data ?? {}
    const live = this.liveV2()
    switch (event.type) {
      case 'session.inbox.enqueued':
        live.apply(event)
        // A command's prompt: the first user item enqueued after it that the bridge did not send.
        if (data.item?.type === 'user' && this.commandClaimV2 && !this.ownInboxV2.has(data.inboxID)) this.commandClaimV2(data.inboxID)
        return
      case 'session.inbox.delivered': {
        live.apply(event)
        this.ownInboxV2.delete(data.inboxID)
        const entry = this.projector.messages.get(data.inboxID)
        if (entry?.info.type === 'user') this.userDeliveredV2(entry)
        else if (entry?.info.type === 'synthetic') this.contextMessageV2(entry)
        return
      }
      case 'session.inbox.cancelled':
        live.apply(event)
        this.inboxGoneV2(data.inboxID)
        return
      case 'session.execution.started':
        if (!this.busy) { this.busy = true; this.publishStatus() }
        return
      case 'session.execution.succeeded':
      case 'session.execution.failed':
      case 'session.execution.interrupted': return this.executionEndedV2(event)
      case 'session.step.started': {
        if (!this.activeTurn) this.openExternalTurnV2(this.wakingV2?.id ?? data.assistantMessageID)
        this.turnOf.set(data.assistantMessageID, this.activeTurn.id)
        if (!this.busy) { this.busy = true; this.publishStatus() }
        return this.emitChangesV2(live.apply(event))
      }
      case 'session.compaction.started': {
        if (!this.activeTurn) this.openExternalTurnV2(this.wakingV2?.id ?? compactionMessageId(data.inputID, event.id))
        this.expectV2?.delete(data.inputID)
        this.ownInboxV2.delete(data.inputID)
        return this.emitChangesV2(live.apply(event))
      }
      case 'session.shell.started': {
        // The user's own command (from another client) with no turn open: a turn of its own, ended with it.
        if (!this.activeTurn) this.openExternalTurnV2(messageIdOfEvent(event.id), null, 'shell')
        return this.emitChangesV2(live.apply(event))
      }
      case 'session.shell.ended': {
        const changes = live.apply(event)
        this.emitChangesV2(changes)
        const id = changes[0]?.messageID
        if (id && this.activeTurn?.kind === 'shell' && this.activeTurn.id === id) this.finishTurn({ continuing: this.busy })
        return
      }
      case 'session.synthetic':
      case 'session.skill.activated': {
        const id = live.apply(event)[0]?.messageID
        const entry = id ? this.projector.messages.get(id) : null
        if (entry) this.contextMessageV2(entry)
        return
      }
      case 'session.retry.scheduled':
        live.apply(event)
        this.busy = true
        this.emit('error', retryNoticeV2(data, { threadId: this.id, turnId: this.activeTurn?.id ?? '' }))
        return
      case 'session.revert.staged': this.projector.revert = isRecord(data.revert) ? data.revert : null; return
      case 'session.revert.cleared': this.projector.revert = null; return
      case 'session.revert.committed': live.apply(event); this.projector.revert = null; return
      case 'session.renamed': {
        const previous = this.info.title
        this.info = { ...this.info, title: data.title }
        const meta = this.store.get(this.id)
        if (data.title !== previous && !isDefaultTitle(data.title) && !(meta.workflowAgent === true && data.title === 'Workflow agent') && !meta.name) this.emit('thread/name/updated', { threadId: this.id, threadName: data.title })
        return
      }
      case 'session.agent.selected': this.info = { ...this.info, agent: data.agent }; live.apply(event); return
      case 'session.model.selected': this.info = { ...this.info, model: data.model }; live.apply(event); return
      case 'session.moved': this.info = { ...this.info, location: data.location, directory: data.location?.directory ?? this.info.directory }; live.apply(event); return
      case 'session.permissions': this.info = { ...this.info, permissions: data.permissions }; return
      case 'session.metadata.updated': this.info = { ...this.info, metadata: data.metadata }; return
      case 'session.instructions.updated': live.apply(event); return
      case 'session.archived':
        this.info = { ...this.info, time: { ...this.info.time, archived: event.created ?? Date.now() } }
        if (!this.root) this.bridge.archivedElsewhere(this.info)
        return
      case 'session.unarchived': { const { archived: _archived, ...time } = this.info.time ?? {}; this.info = { ...this.info, time }; return }
      // Nothing to show: session totals (the steps carry theirs), a fork's own record, the watermark, the stream end.
      case 'session.usage.updated':
      case 'session.forked':
      case 'session.viewed':
      case 'session.step.streamed':
      case 'session.created':
      case 'session.deleted':
        return
      default:
        // Approvals and forms (v2/asks.js).
        if (event.kind === 'ask') return void this.onAskV2?.(event)
        return this.emitChangesV2(live.apply(event))
    }
  },

  /** A turn this bridge did not start (Q6): turn/started, with the user's message when one started it. */
  openExternalTurnV2(id, entry = null, kind = 'external') {
    this.planCardV2?.abort('A new turn started.')
    this.activeTurn = { id, startedMs: entry?.info.time?.created ?? Date.now(), kind }
    this.turnOf.set(id, id)
    this.turnError = null
    this.interrupted = false
    this.forceStatus = null
    this.wakingV2 = null
    this.emit('turn/started', { threadId: this.id, turn: { id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(this.activeTurn.startedMs), completedAt: null, durationMs: null } })
    if (entry) this.emitUserItemV2(entry, id)
    this.publishStatus()
  },

  emitUserItemV2(entry, turnId, clientId = null) {
    this.projector.meta = this.store.get(this.id)
    const item = { ...this.projector.userItem(entry), ...(clientId ? { clientId } : {}) }
    this.items.set(item.id, { started: true, completed: true })
    this.emit('item/started', { item, threadId: this.id, turnId, startedAtMs: Date.now() })
    this.emit('item/completed', { item, threadId: this.id, turnId, completedAtMs: Date.now() })
  },

  /** A user message entered the transcript: the bridge's turn prompt, a steer, or someone else's prompt. */
  userDeliveredV2(entry) {
    const id = entry.info.id
    const steer = this.pendingSteersV2.get(id)
    const steered = steer || (this.store.get(this.id).steers ?? []).includes(id)
    if (steered) {
      this.pendingSteersV2.delete(id)
      if (this.activeTurn) {
        this.turnOf.set(id, this.activeTurn.id)
        this.emitUserItemV2(entry, this.activeTurn.id, steer?.clientId ?? null)
        return
      }
      // Delivered after its turn ended (into the next execution): the start of a turn of its own, as a reload groups it.
      const steers = (this.store.get(this.id).steers ?? []).filter((other) => other !== id)
      this.store.update(this.id, { steers: steers.length ? steers : undefined })
      this.openExternalTurnV2(id, entry, 'turn')
      return
    }
    if (this.expectV2?.has(id)) { this.expectV2.delete(id); this.turnOf.set(id, this.activeTurn?.id ?? id); return }
    // Someone else's prompt (another client, a queued one delivered in the same execution): a turn of its own.
    if (this.activeTurn) this.finishTurn({ continuing: true })
    this.openExternalTurnV2(id, entry)
  },

  /**
   * A synthetic or skill message: part of the open turn (no item), else what names the turn it wakes. A background
   * sub-agent's end (metadata.source 'subagent') updates the card of the call that started it.
   */
  contextMessageV2(entry) {
    const metadata = entry.info.metadata ?? {}
    const shell = metadata.source === 'shell' && [...this.projector.messages.values()].some((candidate) => candidate.info.type === 'shell' && candidate.info.shellID === metadata.shellID)
    if (!this.activeTurn && !shell) this.wakingV2 = { id: entry.info.id, kind: entry.info.type }
    if (metadata.source === 'subagent' && typeof metadata.childID === 'string') this.subagentSettledV2(metadata.childID)
  },

  /** The spawn card of a background sub-agent that ended: re-announced with how it ended. */
  subagentSettledV2(childID) {
    for (const entry of [...this.projector.messages.values()].reverse()) {
      const part = entry.parts.find((candidate) => candidate.type === 'tool' && candidate.tool === 'subagent' && candidate.state?.metadata?.sessionID === childID)
      if (!part) continue
      const item = this.projector.itemOf(part, entry)
      const turnId = this.turnOf.get(entry.info.id) ?? this.turns().find((turn) => turn.items.some((candidate) => candidate.id === part.id))?.id
      if (item && turnId) this.emit('item/completed', { item, threadId: this.id, turnId, completedAtMs: Date.now() })
      return
    }
  },

  executionEndedV2(event) {
    this.liveV2().apply(event)
    this.wakingV2 = null
    if (event.type === 'session.execution.failed') {
      const error = errorInfoOfV2(event.data?.error)
      if (error) {
        if (this.activeTurn) this.turnError = error
        this.emit('error', { error, willRetry: false, threadId: this.id, turnId: this.activeTurn?.id ?? '' })
      }
    }
    if (event.type === 'session.execution.interrupted' && this.activeTurn) this.interrupted = true
    // Plan mode's plan (v2/asks.js): its item in the turn, its card after turn/completed (the card does not hold the turn).
    const plan = this.planOfTurnV2?.(event) ?? null
    if (plan) this.emitItem(plan.turnId, { type: 'plan', id: plan.itemId, text: plan.text }, { done: true })
    this.finishTurn()
    if (plan) void this.planReviewV2(plan).catch((error) => this.bridge.log(`plan card ${this.id}: ${error?.message ?? error}`))
  },

  /** Changed parts → their items, in the turn their message belongs to. */
  emitChangesV2(changes) {
    for (const { messageID, partID, done: ended } of changes) {
      const entry = this.projector.messages.get(messageID)
      if (!entry) continue
      const turnId = this.turnOf.get(messageID) ?? this.activeTurn?.id
      if (!partID) { if (entry.info.role === 'assistant') this.stepUsageV2(entry, turnId); continue }
      const part = entry.parts.find((candidate) => candidate.id === partID)
      if (!part || !turnId) continue
      const items = this.projector.itemsOf(part, entry)
      const done = part.type === 'tool' ? ['completed', 'error'].includes(part.state?.status)
        : part.type === 'compaction' ? part.status !== 'running'
          : ended === true || Boolean(part.time?.end)
      if (part.type === 'compaction' && items[0] && part.summary && part.status === 'completed') items[0] = { ...items[0], codeDesktop: { summary: part.summary } }
      for (const item of items) this.emitItem(turnId, item, { done })
      if (part.type === 'tool' && part.tool === 'todowrite' && part.state?.status === 'completed') {
        const todos = part.state.metadata?.todos ?? part.state.input?.todos
        if (Array.isArray(todos)) this.emit('turn/plan/updated', { threadId: this.id, turnId, explanation: null, plan: planOf(todos) })
      }
    }
  },

  /** A step that ended: its tokens, once (thread/tokenUsage/updated). */
  stepUsageV2(entry, turnId) {
    const info = entry.info
    if (!info.time?.completed || !info.tokens || this.usageSeen?.has(info.id)) return
    const breakdown = tokenBreakdown(info.tokens)
    if (!breakdown.totalTokens) return
    this.usageSeen ??= new Set()
    this.usageSeen.add(info.id)
    addBreakdown(this.totals, breakdown)
    this.emit('thread/tokenUsage/updated', { threadId: this.id, turnId: turnId ?? '', tokenUsage: this.tokenUsage(breakdown) })
  },

  /**
   * After a reconnection (no replay in 2.x): the session reloaded from REST while its events wait, then those events
   * applied over it. Some of them may be in what the reload read already; each is idempotent on the reloaded state:
   * messages by id, an item already there is not started again (v2/live.js), a delta's text replaced by .ended.
   */
  async resyncV2() {
    if (this.resyncBufferV2) return
    this.holdV2()
    try { await this.reload() } finally { this.releaseV2() }
  },

  /**
   * This session's events wait (resyncBufferV2) until releaseV2: while a live thread reloads (reloadV2, resyncV2) and
   * while openThread loads it.
   */
  holdV2() { this.resyncBufferV2 ??= [] },

  releaseV2() {
    const buffered = this.resyncBufferV2 ?? []
    this.resyncBufferV2 = null
    for (const event of buffered) this.onEventV2(event)
  },

  /**
   * reloadV2's live half (a live thread only: not a history read once, Bridge.historyOf): the adapter starts from the
   * reloaded messages and the inbox still pending; approvals and forms still open (in memory in 2.x: never replayed) go
   * to the thread again as events (held with the others while it loads; onAskV2 takes each request once), and a card
   * whose ask is no longer open is withdrawn. A list that could not be read leaves the cards as they are.
   */
  async reloadedV2(messages) {
    const api = await this.bridge.v2Api()
    const list = (tail) => api.get(route(this, tail)).then((value) => (Array.isArray(value) ? value : []), () => null)
    const [inbox, permissions, forms] = await Promise.all([list('/inbox'), list('/permission'), list('/form')])
    this.liveV2().reset(messages, inbox ?? [])
    if (permissions && forms) this.rootThread.withdrawAsksV2?.(this.sessionID, 'Answered.', new Set([...permissions, ...forms].map((entry) => entry?.id)))
    for (const request of permissions ?? []) if (request?.id) this.onEventV2({ kind: 'ask', type: 'permission.asked', sessionID: this.sessionID, data: request, durable: null })
    for (const form of forms ?? []) if (form?.id) this.onEventV2({ kind: 'ask', type: 'form.created', sessionID: this.sessionID, data: { form }, durable: null })
  },
}
