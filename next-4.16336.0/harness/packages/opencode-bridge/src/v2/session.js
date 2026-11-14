/**
 * OpenCode 2.x's session operations, as Bridge methods (installed on its prototype by index.js; every name ends in V2
 * and runs only where `this.v2` is set):
 *
 *   thread/start     one POST /api/session {id, location, agent, model, permissions, metadata}: the session starts
 *                    with the thread's ruleset (v2/rules.js), agent and model, and metadata.codeDesktop.root (its
 *                    sub-agents inherit it: the plugin finds their root by it)
 *   thread/fork      POST …/fork {before: the next turn's first message}; a session with nothing to copy (v2 answers
 *                    400) forks as a new empty session in its folder
 *   thread/revert    POST …/revert/stage {messageID, files} then …/revert/commit at once: a staged files:true revert
 *                    would be undone by the next stage (revert.ts), and Codex has no unrevert. A busy session is 409
 *   side question    POST …/generate {prompt}: one answer from the session's context, no tools run, nothing stored,
 *                    one delta (v2 doesn't stream it)
 *   thread/move      POST …/move {directory}: v2 moves the session itself (an idle one at once, session.moved) and
 *                    leaves uncommitted changes where they are (G13: the check reports none, so the app never offers
 *                    to bring them); the live thread reopens in the new folder once v2 has it there
 *   history          its own database under the bridge's folder (v2/db.js), reported in initialize over the
 *                    descriptor's 1.x answers (historyLocation for the delete confirms, sessionStore for Storage)
 *   session events   a sub-agent's session.created, session.deleted, an ask for a session not loaded here
 *   rules            the user's own config rules (GET /api/config entries, the bridge's documents left out) and the
 *                    skill and reference folders (GET /api/skill, /api/reference), cached a minute per folder
 */
import fs from 'node:fs'
import path from 'node:path'
import { RpcError, invalidParams } from '../transport.js'
import { agentFor, applyPermissionParams, defaultPermission, neverAsks } from '../policy.js'
import { mcpConfigSelection, mergeToolSelections, toolSelectionOf } from '../tools.js'
import { splitModel, variantOf } from '../models.js'
import { appToolsPrefix } from '../app-tools.js'
import { mergeConfigEntries, skillResourcesV2 } from './config.js'
import { v2Paths } from './db.js'
import { toV1Session } from './history.js'
import { newSessionId } from './live.js'
import { sessionRulesV2 } from './rules.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const DIRS_TTL_MS = 60000
// How long thread/move waits for v2 to report the session in its new folder (an idle session moves at once).
const MOVE_WAIT_MS = 15000
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const realpath = (value) => { try { return fs.realpathSync(value) } catch { return value } }

export const BRIDGE_V2 = {
  /**
   * The ruleset of a thread's session (v2/rules.js) for its permission state and tool selection: the user's own config
   * rules and the folders v2 doesn't allow by itself are read for `cwd`.
   */
  async rulesV2({ permission, tools = null, cwd, workflowAgent = false }) {
    const [userRules, externalDirs] = await Promise.all([this.userRulesV2(cwd), this.externalDirsV2(cwd)])
    const skills = skillResourcesV2(this.disabledSkills(), this.config.skillIdMap())
    return sessionRulesV2({
      home: this.homeDir(), dataDir: this.dataDir(), externalDirs, appToolsPrefix: this.appTools ? appToolsPrefix(this.appTools) : '',
      tools, flavor: this.flavor, skills, userRules, noUser: neverAsks(permission) || workflowAgent, workflowAgent,
    })
  },

  /** The permissions of the user's own config documents for a folder (GET /api/config, lowest first; [] when unread). */
  async userRulesV2(cwd) {
    try {
      const entries = await (await this.v2Api()).get('/api/config', { location: cwd })
      const { config } = mergeConfigEntries(entries, { exclude: [this.config.configPath], content: false })
      return Array.isArray(config.permissions) ? config.permissions : []
    } catch (error) { this.log(`config rules: ${error?.message ?? error}`); return [] }
  },

  /** Skill and reference folders of a folder (v2 asks external_directory for them), cached a minute. */
  async externalDirsV2(cwd) {
    const cached = this.externalDirCacheV2?.get(cwd)
    if (cached && Date.now() - cached.at < DIRS_TTL_MS) return cached.value
    const api = await this.v2Api()
    const read = (pathname) => api.get(pathname, { location: cwd }).then((list) => (Array.isArray(list) ? list : []), () => [])
    const [skills, references] = await Promise.all([read('/api/skill'), read('/api/reference')])
    const dirs = [
      // Not the embedded ones (/builtin/<id>.md: no such folder).
      ...skills.map((skill) => (typeof skill?.path === 'string' && !skill.path.startsWith('/builtin/') ? (skill.path.endsWith('.md') ? path.dirname(skill.path) : skill.path) : null)),
      ...references.map((reference) => (typeof reference?.path === 'string' ? reference.path : null)),
    ].filter((dir) => typeof dir === 'string' && path.isAbsolute(dir) && dir !== path.parse(dir).root)
    const value = [...new Set(dirs)]
    ;(this.externalDirCacheV2 ??= new Map()).set(cwd, { value, at: Date.now() })
    return value
  },

  /** thread/start's session, created with everything at once; {info (1.x-shaped), rules}. */
  async createSessionV2(params, cwd, { workflowAgent = false, title } = {}) {
    const api = await this.v2Api()
    const permission = applyPermissionParams(defaultPermission(), params)
    let tools = toolSelectionOf(params) ?? null
    const configTools = mcpConfigSelection(params.config)
    if (configTools) tools = mergeToolSelections(tools, configTools)
    const choice = typeof params.codeDesktop?.agent === 'string' && params.codeDesktop.agent.trim() ? params.codeDesktop.agent.trim() : null
    const agent = agentFor(permission, await this.primaryAgent(cwd, choice).catch(() => 'build'))
    await this.catalog.load().catch(() => {})
    const modelId = typeof params.model === 'string' && params.model ? params.model : await this.catalog.defaultId().catch(() => null)
    const model = splitModel(modelId ?? '')
    const effort = params.effort ?? params.config?.model_reasoning_effort
    const variant = model ? variantOf(effort, this.catalog.cached?.entries?.find((entry) => entry.id === modelId)) : undefined
    const rules = await this.rulesV2({ permission, tools, cwd, workflowAgent })
    const id = newSessionId()
    const info = await api.createSession({
      id, directory: cwd, agent, permissions: rules, metadata: { codeDesktop: { root: id } },
      ...(model ? { model: { id: model.modelID, providerID: model.providerID, ...(variant ? { variant } : {}) } } : {}),
      ...(title ? { title } : {}),
    })
    return { info: toV1Session(info), rules }
  },

  /** The first real message of a turn (its id, unless the bridge named a turn with no message of its own). */
  turnMessageV2(thread, turn) {
    if (!turn) return null
    if (thread.projector.messages.has(turn.id)) return turn.id
    return turn.assistant?.[0]?.info?.id ?? null
  },

  async forkV2(params) {
    const source = await this.historyOf(this.requireId(params.threadId))
    let before = null
    const turns = source.turns()
    if (params.lastTurnId) {
      const index = turns.findIndex((turn) => turn.id === params.lastTurnId)
      if (index < 0) throw invalidParams('Unknown lastTurnId.')
      if (turns[index].status === 'inProgress') throw invalidParams('The turn to fork through is still running.')
      before = this.turnMessageV2(source, turns[index + 1])
    }
    const api = await this.v2Api()
    const info = source.projector.messages.size
      ? toV1Session(await api.post(`/api/session/${encodeURIComponent(source.id)}/fork`, before ? { before } : {}))
      : (await this.createSessionV2(params, source.cwd)).info
    // Its own root for its sub-agents (a fork may copy the source's metadata).
    await api.patch(`/api/session/${encodeURIComponent(info.id)}`, { metadata: { ...(isRecord(info.metadata) ? info.metadata : {}), codeDesktop: { root: info.id } } }).catch((error) => this.log(`fork metadata ${info.id}: ${error?.message}`))
    const meta = this.store.get(source.id)
    this.store.update(info.id, { cwd: info.directory ?? source.cwd, forkedFrom: source.id, lastActivity: Date.now(), preview: meta.preview, permission: meta.permission, tools: meta.tools, custom: meta.custom })
    const thread = await this.openThread(info.id)
    await thread.applyParams(params)
    const response = thread.sessionResponse({ includeTurns: params.excludeTurns !== true })
    this.notify('thread/started', { thread: response.thread })
    return response
  },

  async revertV2(params) {
    const thread = await this.openThread(this.requireId(params.threadId))
    if (thread.busy || thread.activeTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before rewinding.')
    const turns = thread.turns()
    const index = turns.findIndex((turn) => turn.id === params.beforeTurnId)
    if (index < 0) throw invalidParams('Unknown beforeTurnId.')
    const messageID = this.turnMessageV2(thread, turns[index])
    if (!messageID) throw invalidParams('That turn has nothing to rewind to.')
    const api = await this.v2Api()
    const base = `/api/session/${encodeURIComponent(thread.sessionID)}`
    try {
      // codeDesktop.restoreFiles (capabilities.rewindFiles): v2 puts back the files the later turns changed from its
      // snapshots too; otherwise only the conversation goes (the app says "Local file changes remain").
      await api.post(`${base}/revert/stage`, { messageID, files: params.codeDesktop?.restoreFiles === true })
      await api.post(`${base}/revert/commit`)
    } catch (error) {
      if (error?.status === 409) throw new RpcError(-32600, 'Wait for the current turn to finish before rewinding.')
      throw error
    }
    await thread.reload()
    return { thread: thread.threadObject(), turnsBackwardsCursor: null, itemsBackwardsCursor: null }
  },

  /**
   * codeDesktop/thread/move on 2.x ({threadId, cwd} or {threadId, check}): POST /api/session/:id/move. v2 checks the
   * folder itself (400 InvalidRequestError: missing, not a folder, unavailable) and puts the session in its project.
   */
  async moveThreadV2(params) {
    const id = this.requireId(params?.threadId)
    if (this.children.has(id)) throw invalidParams('A sub-agent’s session can’t be moved.')
    const live = this.threads.get(id)
    const from = live?.cwd ?? this.store.get(id)?.cwd
    if (typeof from !== 'string' || !from) throw invalidParams('Unknown session.')
    // Nothing to bring along: 2.x moves the session only, so the app moves without asking.
    if (params?.check === true) return { changes: 0 }
    const asked = typeof params?.cwd === 'string' ? params.cwd.trim() : ''
    if (!asked || asked.includes('\0')) throw invalidParams('Name a folder.')
    const home = this.homeDir()
    const wanted = asked === '~' ? home : asked.startsWith('~/') ? path.join(home, asked.slice(2)) : path.resolve(from, asked)
    let destination
    try { destination = fs.realpathSync(wanted) } catch { throw invalidParams(`${asked} doesn’t exist.`) }
    if (!fs.statSync(destination).isDirectory()) throw invalidParams(`${asked} isn’t a folder.`)
    if (destination === realpath(from)) return { thread: (live ?? await this.openThread(id)).threadObject(), moved: false }
    if (live && (live.activeTurn || live.busy)) throw new RpcError(-32600, 'Wait for the current turn to finish before moving the session.')
    const api = await this.v2Api()
    const route = `/api/session/${encodeURIComponent(id)}`
    try {
      await api.post(`${route}/move`, { directory: destination })
    } catch (error) {
      if (error?.status === 400) throw new RpcError(-32600, `OpenCode couldn’t move the session there: ${String(error.message ?? '').replace(/^OpenCode: /, '').slice(0, 300)}`)
      throw error
    }
    // v2 hands the move in through the session's inbox: wait until the session is there.
    const deadline = Date.now() + (this.v2.moveWaitMs ?? MOVE_WAIT_MS)
    for (;;) {
      if (await this.movedV2(api, route, destination)) break
      if (Date.now() < deadline) { await wait(250); continue }
      // Not delivered in time (v2 hands a move over at a step boundary: the session running elsewhere, a sub-agent
      // woken): take it back out of the inbox, or it lands later with the thread's cwd, sandbox and folder rules left
      // in the old folder. A cancel after delivery is a no-op (204), so the session is looked at once more.
      const cancelled = await this.cancelMovesV2(api, route)
      if (await this.movedV2(api, route, destination)) break
      throw new RpcError(-32000, cancelled
        ? 'OpenCode is busy with this session and hasn’t moved it; the move was cancelled. Try again once it’s idle.'
        : 'OpenCode hasn’t moved the session yet, and the move couldn’t be cancelled: it may still happen later.')
    }
    this.store.update(id, { cwd: destination })
    // The live session reopens in its new folder (its sandbox and folder rules follow the thread's cwd).
    if (live) this.unload(id)
    const thread = await this.openThread(id)
    return { thread: thread.threadObject(), moved: true }
  },

  /** Whether v2 has the session in `destination` now. */
  async movedV2(api, route, destination) {
    const info = toV1Session(await api.get(route))
    return typeof info.directory === 'string' && realpath(info.directory) === destination
  },

  /** DELETE every move still waiting in the session's inbox (GET …/inbox, type 'move'); false when that failed. */
  async cancelMovesV2(api, route) {
    try {
      const pending = await api.get(`${route}/inbox`)
      for (const item of Array.isArray(pending) ? pending : []) {
        if (item?.type === 'move' && typeof item.id === 'string') await api.delete(`${route}/inbox/${encodeURIComponent(item.id)}`)
      }
      return true
    } catch (error) {
      this.log(`move: cancel ${route}: ${error?.message ?? error}`)
      return false
    }
  },

  /** initialize capabilities on 2.x: the history this core keeps, in the bridge's folder rather than OpenCode's. */
  historyStoreV2() {
    const { dir } = v2Paths(this.stateDir)
    const home = this.homeDir()
    const shown = dir === home || dir.startsWith(`${home}/`) ? `~${dir.slice(home.length)}` : dir
    return { historyLocation: shown, sessionStore: { database: path.relative(this.stateDir, dir) } }
  },

  /** codeDesktop/sideQuestion on 2.x: POST …/generate, its whole answer as one delta. */
  async sideQuestionV2({ id, source, model, promptText, requestId, instructions }) {
    const api = await this.v2Api()
    const controller = new AbortController()
    let cancelled = false
    this.sideQuestions.get(requestId)?.cancel()
    this.sideQuestions.set(requestId, { cancel: () => { cancelled = true; controller.abort() } })
    const result = (text, finish) => ({ requestId, text, finish, model: model.modelID, contextMessages: source.projector.ordered().length, truncated: false })
    try {
      let text = ''
      try {
        const data = await api.post(`/api/session/${encodeURIComponent(source.sessionID)}/generate`, { prompt: `${instructions}\n\n${promptText}` }, { signal: controller.signal, timeout: 10 * 60000 })
        text = typeof data?.text === 'string' ? data.text : ''
      } catch (error) {
        if (cancelled) return result('', 'cancelled')
        if (error?.name === 'TimeoutError') return result('', 'timeout')
        throw new RpcError(-32000, String(error?.message ?? 'The side question failed.').replace(/^OpenCode: /, '').slice(0, 500) || 'The side question failed.')
      }
      if (cancelled) return result('', 'cancelled')
      if (text) this.notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text })
      return result(text, 'stop')
    } finally { this.sideQuestions.delete(requestId) }
  },

  /**
   * Session events the bridge takes before (or instead of) the live thread (onEventV2): true when it took it.
   * A sub-agent's session.created makes its thread; session.deleted closes a thread deleted elsewhere; an ask for a
   * session not loaded here loads it first.
   */
  onSessionEventV2(event, thread) {
    const data = event.data ?? {}
    if (event.type === 'session.created' && typeof data.parentID === 'string') {
      const now = event.created ?? Date.now()
      const info = { id: event.sessionID, parentID: data.parentID, projectID: data.projectID, location: data.location, directory: data.location?.directory, title: data.title, agent: data.agent, model: data.model, permissions: data.permissions, metadata: data.metadata, time: { created: now, updated: now } }
      void this.childCreated(info).catch((error) => this.log(`child ${event.sessionID}: ${error?.message || error}`))
      return true
    }
    if (event.type === 'session.deleted') {
      const id = event.sessionID
      const meta = this.store.get(id)
      if (thread) {
        thread.close('Session deleted.')
        this.threads.delete(id)
        this.children.delete(id)
        for (const [childId, child] of this.children) if (child.root === thread) { this.children.delete(childId); child.close('Session deleted.') }
      }
      // Deleted elsewhere (OpenCode's own apps): gone here too. The bridge's own thread/delete marked it first.
      if (!meta.deleted && !meta.parent && (thread || meta.cwd)) {
        this.store.update(id, { deleted: true, inputs: undefined, steers: undefined, queue: undefined })
        this.notify('thread/deleted', { threadId: id })
      }
      return true
    }
    if (!thread && event.kind === 'ask' && (event.type === 'permission.asked' || event.type === 'form.created')) {
      void this.openAny(event.sessionID).then((loaded) => loaded?.onEventV2(event)).catch(() => {})
      return true
    }
    return false
  },

  /** After a reconnection: each live thread reloads with its events held (LiveThread.resyncV2). */
  resyncThreadsV2() {
    for (const thread of [...this.threads.values(), ...this.children.values()]) {
      void thread.resyncV2().catch((error) => this.log(`resync ${thread.id}: ${error?.message || error}`))
    }
  },
}
