/**
 * The Codex app-server (protocol v0.155.1, JSON-RPC lines on stdio) Code
 * Desktop speaks, served from an ACP agent (Agent Client Protocol over the
 * agent's stdio): Gemini CLI, Qwen Code, Kimi Code or MiniMax Code
 * (agents/*.js hold what differs between them).
 *
 * Mapping summary
 *   thread              an ACP session; thread id = ACP sessionId. Each loaded
 *                       thread has its own agent process (agent-host.js): the
 *                       thread's system prompt, tool selection, model params
 *                       and sandbox are process settings on these agents. A
 *                       settings change relaunches the process between turns
 *                       and reopens the session (session/resume or session/load).
 *   history             the bridge's own projection (store.js threads/<id>.json);
 *                       sessions the bridge never saw are replayed from session/load
 *   turn                one session/prompt; turn/completed when it returns
 *   items               session/update → Codex items (projection.js)
 *   approvals           session/request_permission → the bridge's policy for the
 *                       thread's mode (permissions.js), else a Codex approval card
 *                       (item/commandExecution|fileChange/requestApproval) or, for
 *                       questions and plan reviews, item/tool/requestUserInput
 *   sandbox             the agent process runs in macOS Seatbelt per mode (sandbox.js);
 *                       fs/terminal requests are checked against the writable roots
 *   queue / steer       the bridge's queue (runs after the turn); MiniMax steers natively
 *   catalog             skills/list (skill folders + ACP commands), MCP config + a probe
 *                       for status and tools (mcp-probe.js), plugins = agent extensions
 *   usage               usage.js ledger from the agent's usage reports
 */

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LineTransport, RpcError, METHOD_NOT_FOUND, INVALID_PARAMS, INVALID_REQUEST, SERVER_ERROR, invalidParams } from './transport.js'
import { AgentHost } from './agent-host.js'
import { ThreadProjector, blockText, planSteps } from './projection.js'
import { ThreadStore } from './store.js'
import { settleOverlaysIn } from './overlay.js'
import { UsageLedger, addUsage, normalizeUsage, threadTokenUsage, localDayKey } from './usage.js'
import { toAcpPrompt, restrictBlocks, inputText } from './input.js'
import { permissionOf, sandboxFor, decide, realPath, pathsOf, outcomeForDecision, optionFor, selected, afterPlanPermission, planTargetOf, sandboxPolicyOf, SessionGrants, isReadOnlyMode, usesAgentPlanMode, insideRoots } from './permissions.js'
import { wrapLaunch, sandboxAvailable } from './sandbox.js'
import { ClientServices } from './client-services.js'
import { commandSkills, mcpTable, coreSettingsView, coreSettingValue, withSetting, settingAt, readJsonFile, writeJsonFile } from './catalog.js'
import { probeMcpServer, mcpServerStatus, clearMcpCache, getMcpPrompt, parsePromptArgs, promptText } from './mcp-probe.js'
import { RateLimitWatch } from './rate-limit-watch.js'
import { agentProgram, commandLine, agentVersion } from './agents/index.js'
import { sessionTranscript, sideQuestionPrompt, SIDE_QUESTION_SYSTEM } from './side-question.js'
import { appToolsServer, acpAppToolsServer, appToolsLaunchEntry, sessionIdentityOf } from './app-tools.js'

export const BRIDGE_VERSION = '0.1.0'
const UTILITY_IDLE_MS = 60000
const CANCEL_GRACE_MS = 10000
const PLAN_REVIEW = 'plan-review'
const COMPACTION_WAIT_MS = 15 * 60000
// How long a session/load replay that goes on after the answer (adapter.replaysAfterLoad) may stay quiet, and run.
const REPLAY_QUIET_MS = 400
const REPLAY_WAIT_MS = 30000
// An agent-started turn with no end signal closes this long after its last model round went quiet.
const AGENT_TURN_QUIET_MS = 2500
const AGENT_TURN_STALL_MS = 90000
const AGENT_WORK_UPDATES = new Set(['agent_message_chunk', 'agent_thought_chunk', 'tool_call', 'tool_call_update'])
/** How often a running turn's usage is read for an agent that reports it only at the turn's end (adapter.liveUsageMs: its own). */
const LIVE_USAGE_MS = 2000

const seconds = (ms) => Math.floor((ms ?? Date.now()) / 1000)
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * The session's added folders (/add-dir, OpenClaude Desktop's writable roots) as ACP additionalDirectories, for an agent that
 * declares sessionCapabilities.additionalDirectories (Kimi: they join its workspace, its prompt's Additional
 * Directories section and its AGENTS.md / skills discovery). Kimi honors them on session/new.
 */
export function additionalDirectoriesFor(host, target) {
  if (!isRecord(host?.init?.agentCapabilities?.sessionCapabilities?.additionalDirectories)) return {}
  const dirs = (Array.isArray(target?.permission?.writableRoots) ? target.permission.writableRoots : [])
    .filter((dir) => typeof dir === 'string' && path.isAbsolute(dir) && !dir.includes('\0') && dir !== target.cwd)
  return dirs.length ? { additionalDirectories: [...new Set(dirs)].slice(0, 64) } : {}
}

/** codeDesktop.tools → {disabled, disabledServers} | null (undefined: leave alone). */
function toolSelectionOf(params) {
  const hint = params?.codeDesktop
  if (!isRecord(hint) || !Object.hasOwn(hint, 'tools')) return undefined
  const value = hint.tools
  if (!isRecord(value)) return null
  const names = (list) => (Array.isArray(list) ? [...new Set(list.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))].slice(0, 512) : [])
  const disabled = names(value.disabled)
  const disabledServers = names(value.disabledServers)
  return disabled.length || disabledServers.length ? { disabled, disabledServers } : null
}

const cleanText = (value) => (typeof value === 'string' ? value.replace(/\0/g, '').replace(/\r\n?/g, '\n').trim() || null : null)

/** codeDesktop.customization → {systemPrompt, instructions, modelParams} (undefined fields: leave alone). */
function customizationOf(params) {
  const custom = params?.codeDesktop?.customization
  if (!isRecord(custom)) return undefined
  const out = {}
  if (Object.hasOwn(custom, 'systemPrompt')) out.systemPrompt = cleanText(custom.systemPrompt)
  if (Object.hasOwn(custom, 'instructions')) out.instructions = cleanText(custom.instructions)
  if (Object.hasOwn(custom, 'modelParams')) out.modelParams = isRecord(custom.modelParams) ? custom.modelParams : null
  if (Object.hasOwn(custom, 'persona')) out.persona = cleanText(typeof custom.persona === 'string' ? custom.persona : custom.persona?.prompt ?? custom.persona?.text)
  return out
}

/** {{model}}, {{cwd}}, {{provider}} in the user's prompt; anything else stays literal. */
function interpolate(text, variables) {
  return text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (match, name) => (typeof variables[name] === 'string' ? variables[name] : match))
}

/**
 * Serve the Codex app-server protocol on the given streams.
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream, env?: Record<string, string>, adapter: object | null, log?: (line: string) => void }} options
 */
export function serve({ input, output, env = process.env, adapter, log = (line) => process.stderr.write(`${line}\n`) }) {
  const program = agentProgram(env, adapter)
  // The agent's own environment: the user's, without OpenClaude Desktop's launch variables.
  const agentEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('CODE_DESKTOP_') && key !== 'ELECTRON_RUN_AS_NODE'))
  const stateDir = env.CODE_DESKTOP_BRIDGE_STATE || path.join(os.homedir(), '.code-desktop', 'acp-bridge', adapter?.id ?? 'unknown')
  fs.mkdirSync(stateDir, { recursive: true })
  // OpenClaude Desktop's own tools (app-tools.js): one code_desktop server per app session, never in throwaway sessions.
  const appTools = appToolsServer(env)
  const sessionMcpServers = (thread, session) => {
    // An agent that got the server in its launch config (adapter.appToolsInLaunch: MiniMax's mcp.json) gets none here.
    if (thread?.appToolsInLaunch) return []
    const entry = (thread?.tools?.disabledServers ?? []).includes(appTools?.name) ? null : acpAppToolsServer(appTools, session, { runAsNodeInCommand: adapter?.mcpDropsRunAsNode === true })
    return entry ? [entry] : []
  }
  // The server as the agent's own config declares it, for an adapter that takes it at launch (appToolsInLaunch): named
  // by the app's start token for a new session, else by the thread id; none while the user switched it off.
  const launchAppTools = (thread) => {
    if (!adapter?.appToolsInLaunch || !appTools || (thread?.tools?.disabledServers ?? []).includes(appTools.name)) return null
    const identity = thread.appToolsSession ?? (typeof thread.id === 'string' && thread.id && !thread.id.startsWith('pending-') ? thread.id : null)
    return appToolsLaunchEntry(appTools, identity)
  }
  // OpenClaude Desktop's tools server's instructions (the preview verification workflow, "these act on this session only"),
  // for an agent that never shows the model an MCP server's initialize instructions (adapter.appToolsInstructions: Kimi,
  // MiniMax, Qwen): only while the thread's sessions get that server (named as sessionMcpServers / launchAppTools name it),
  // and never once the user switched it off. '' otherwise.
  const appToolsInstructions = (thread) => {
    if (!adapter?.appToolsInstructions || !appTools?.instructions || !thread) return ''
    if ((thread.tools?.disabledServers ?? []).includes(appTools.name)) return ''
    const identity = thread.appToolsSession ?? (typeof thread.id === 'string' && thread.id && !thread.id.startsWith('pending-') ? thread.id : null)
    if (!identity) return ''
    // An adapter can add what its agent needs besides (Qwen: which of the server's tools sit behind tool_search).
    if (typeof adapter.appToolsInstructions === 'function') {
      try { return adapter.appToolsInstructions(appTools.instructions, appTools.name) || appTools.instructions } catch { return appTools.instructions }
    }
    return appTools.instructions
  }
  // The workflow runner's own bridge (CODE_DESKTOP_WORKFLOW_RUNNER=1, app/electron/workflow-service.cjs) shares this
  // core's state folder (keys, settings) with the app's bridge, but keeps its threads in workflow-runs/<pid> and hands
  // its turns' usage to the app bridge's ledger through usage-inbox: two processes never rewrite one index.json or
  // usage.json, and workflow agents never become the user's sessions. The app bridge leaves those threads out of
  // thread/list and, once their runner is gone, deletes them (the agent's own copy too) with their folder.
  const runnerRole = env.CODE_DESKTOP_WORKFLOW_RUNNER === '1'
  const runsDir = path.join(stateDir, 'workflow-runs')
  const usageInbox = path.join(stateDir, 'usage-inbox')
  const ownDir = runnerRole ? path.join(runsDir, String(process.pid)) : stateDir
  const store = new ThreadStore(ownDir)
  const ledger = new UsageLedger(ownDir, runnerRole ? { outbox: usageInbox } : { inbox: usageInbox })
  let version = program.version || ''
  let closed = false
  // Turns whose usage is still being read after they ended (finishTurn's refreshContext): a shutdown waits for them.
  const usageSettles = new Set()
  let clientReady = false
  let initError = null
  const threads = new Map()
  const opening = new Map()
  const sideQuestions = new Map()
  const logins = new Map()
  let accountProfile = null

  const transport = new LineTransport(input, output, {
    onRequest: (method, params) => handle(method, params ?? {}),
    onNotification: () => {},
    onClose: () => void shutdown(),
    log,
  })
  const notify = (method, params) => transport.notify(method, params)
  const emit = (notes) => { for (const note of notes ?? []) notify(note.method, note.params) }

  // ------------------------------------------------------------- agent ctx

  const ctx = {
    env: agentEnv,
    // The workflow runner's own bridge (its threads are workflow agents, never the user's sessions).
    runnerRole,
    program,
    stateDir,
    log,
    commandLine: (args) => commandLine(program, args),
    utility: () => utilityHost(),
    // OpenClaude Desktop's code_desktop server too, so its calls read as that server's (Gemini names tools mcp_<server>_<tool>).
    mcpServerNames: () => { let names = []; try { names = adapter.mcpServers(ctx, null).map((server) => server.name) } catch {} return appTools ? [...names, appTools.name] : names },
  }

  // One-time agent preparation (MiniMax: its native SQLite module) before the first process starts.
  let prepared = null
  function prepare() {
    requireAgent()
    prepared ??= (async () => { if (adapter.ensureNativeDeps) ctx.nativeEnv = await adapter.ensureNativeDeps(ctx) })().catch((error) => { prepared = null; throw new RpcError(SERVER_ERROR, `${adapter.name} could not be prepared: ${error?.message ?? error}`) })
    return prepared
  }

  /** An agent whose plugin commands run its own CLI (MiniMax: native modules first); a listing falls back without them. */
  async function pluginsReady() {
    if (!adapter?.ensureNativeDeps) return
    try { await prepare() } catch (error) { log(`plugins: ${error?.message ?? error}`) }
  }

  function requireAgent() {
    if (initError) throw new RpcError(SERVER_ERROR, initError)
    if (!adapter) throw new RpcError(SERVER_ERROR, 'OpenClaude Desktop could not tell which ACP agent to run (set CODE_DESKTOP_ACP_AGENT to gemini, qwen, kimi or minimax).')
    if (!program.binary) throw new RpcError(SERVER_ERROR, `${adapter.name} is not installed. Install it in Settings › Cores, or put \`${adapter.binaryNames[0]}\` on your PATH.`)
  }

  /** The adapter's own sandbox additions for its processes (MiniMax: ~/.Trash in workspace-write, shell rc files never written). */
  const sandboxExtras = () => { try { return adapter?.sandboxExtras?.(ctx) ?? {} } catch { return {} } }

  // Utility process: session listing and deletion, model discovery. Stops when idle.
  let utility = null
  let utilityTimer = null
  async function utilityHost() {
    requireAgent()
    clearTimeout(utilityTimer)
    utilityTimer = setTimeout(() => { const host = utility; utility = null; host?.then((value) => value.stop()).catch(() => {}) }, UTILITY_IDLE_MS)
    utilityTimer.unref?.()
    if (!utility) {
      utility = (async () => {
        await prepare()
        const dir = path.join(stateDir, 'utility')
        fs.mkdirSync(dir, { recursive: true })
        const launch = adapter.launch(ctx, { threadDir: dir, utility: true })
        // Unsandboxed (it lists and deletes the agent's own sessions), but never past the files no agent process may write.
        const line = wrapLaunch(commandLine(program, launch.args), { profile: 'none', writable: [], agentPaths: [], profileFile: path.join(dir, 'utility.sb'), ...sandboxExtras() })
        const host = new AgentHost({ stopSignal: adapter?.stopSignal, command: line.command, args: line.args, env: { ...agentEnv, ...launch.env }, cwd: dir, clientCapabilities: {}, log, label: `${adapter.id}-utility` })
        host.on('exit', () => { if (utility && utility === current) utility = null })
        const current = utility
        await host.start()
        return host
      })()
      utility.catch(() => { utility = null })
    }
    return utility
  }

  // ---------------------------------------------------------------- threads

  class Thread {
    constructor(id, meta) {
      this.id = id
      this.meta = meta
      this.cwd = meta.cwd
      // The folder the agent keeps the session under, when the session moved to another one since (/cd: Qwen's
      // session/cd relocates the live session, while its storage stays where it began): loads use it, then move again.
      this.agentCwd = meta.agentCwd ?? null
      const history = store.readHistory(id)
      this.projector = new ThreadProjector({ threadId: id, cwd: this.cwd, turns: history?.turns ?? [], plan: history?.plan ?? null, classify: (call) => adapter.classify?.(call, ctx) ?? null, commandResult: adapter.commandResult })
      this.hasHistory = Boolean(history)
      this.permission = meta.permission ?? { mode: 'auto', afterPlan: 'auto', approvalPolicy: 'on-request', sandbox: 'workspace-write', writableRoots: [] }
      this.tools = meta.tools ?? null
      this.custom = meta.custom ?? { systemPrompt: null, instructions: null, modelParams: null, persona: null }
      this.developerInstructions = meta.developerInstructions ?? null
      this.model = meta.model ?? null
      this.effort = meta.effort ?? null
      // The thread's launch folder and (MiniMax) its own agent home, kept across restarts.
      this.launchDir = meta.launchDir ?? null
      this.agentHome = meta.agentHome ?? (meta.source === 'agent' ? 'real' : null)
      this.host = null
      this.hostKey = null
      this.sandboxed = false
      this.sessionReady = false
      this.pending = new Map()
      this.queue = []
      this.prompt = null
      this.grants = new SessionGrants()
      this.grantEpoch = 0
      this.approvedPaths = new Set()
      this.usage = { total: meta.usageTotal ?? null, last: meta.lastUsage ?? null, contextUsed: meta.contextUsed ?? null, contextWindow: meta.contextWindow ?? null, turn: null }
      this.commands = []
      this.acp = { modes: null, models: null, configOptions: null, mode: null }
      this.children = new Map()
      this.terminalCalls = new Map()
      this.suppress = false
      this.closing = null
      this.services = new ClientServices({
        thread: () => this,
        profileFile: path.join(store.threadDir(id), 'terminal.sb'),
        missingAsEmpty: typeof adapter.missingFileReadsEmpty === 'function' ? (file) => adapter.missingFileReadsEmpty(file, ctx) : adapter.missingFileReadsEmpty === true,
        agentPaths: [...adapter.agentPaths(agentEnv), path.join(stateDir, 'threads')],
        // Folders the agent writes as its own in any mode (Gemini's custom plans folder, which Plan mode writes to).
        ownPaths: () => { try { return adapter.ownWritePaths?.(ctx, this) ?? [] } catch { return [] } },
        onOutput: (terminalId, chunk) => {
          const callId = this.terminalCalls.get(terminalId)
          if (callId) emit(this.projector.commandOutput(callId, chunk, terminalId))
        },
      })
    }

    /** A turn the client started, or one the agent started on its own (Qwen's goal rounds, cron and background runs). */
    get running() {
      return Boolean(this.prompt || this.agentTurn)
    }

    status() {
      // A detached card (a background question past its turn) waits without the session being busy.
      const waiting = [...this.pending.values()].filter((entry) => !entry.detached)
      if (waiting.length) return { type: 'active', activeFlags: [...new Set(waiting.map((entry) => entry.flag))] }
      return this.prompt || this.agentTurn || this.projector.activeTurn ? { type: 'active', activeFlags: [] } : { type: 'idle' }
    }

    publishStatus() {
      notify('thread/status/changed', { threadId: this.id, status: this.status() })
    }

    save() {
      store.writeHistory(this.id, { turns: this.projector.persist(), plan: this.projector.plan })
      this.hasHistory = true
    }

    remember(patch = {}) {
      this.meta = store.update(this.id, {
        cwd: this.cwd, permission: this.permission, tools: this.tools, custom: this.custom, model: this.model, effort: this.effort,
        developerInstructions: this.developerInstructions, usageTotal: this.usage.total, lastUsage: this.usage.last,
        contextUsed: this.usage.contextUsed, contextWindow: this.usage.contextWindow,
        ...(this.launchDir ? { launchDir: this.launchDir } : {}), ...(this.agentHome ? { agentHome: this.agentHome } : {}), ...(this.agentCwd ? { agentCwd: this.agentCwd } : {}), ...patch,
      })
    }

    tokenUsage() {
      return threadTokenUsage({ total: this.usage.total, last: this.usage.last, contextUsed: this.usage.contextUsed, contextWindow: this.usage.contextWindow ?? adapter.contextWindow?.(this.model) ?? null })
    }

    publishUsage(turnId) {
      notify('thread/tokenUsage/updated', { threadId: this.id, turnId: turnId ?? this.projector.turns.at(-1)?.id ?? '', tokenUsage: this.tokenUsage() })
    }
  }

  /** The launch settings of a thread: their key decides whether a running process still fits. */
  function launchConfig(thread) {
    const variables = { model: thread.model ?? '', cwd: thread.cwd, provider: adapter.name }
    const systemPrompt = thread.custom.systemPrompt ? interpolate(thread.custom.systemPrompt, variables) : null
    // With the user's own system prompt nothing the system wrote goes with it: no persona, no app-tools guidance; only
    // the user's project instructions and a workflow agent's role (developerInstructions) follow it.
    const appendParts = (systemPrompt ? [thread.custom.instructions, thread.developerInstructions]
      : [thread.custom.persona, thread.custom.instructions, thread.developerInstructions, appToolsInstructions(thread)]).filter(Boolean)
    return {
      threadDir: thread.launchDir ?? store.threadDir(thread.id),
      agentHome: thread.agentHome ?? undefined,
      systemPrompt,
      appendPrompt: appendParts.length ? appendParts.join('\n\n') : null,
      // A workflow agent (runner role) also goes without the adapter's delegation tools (adapter.workflowAgentDisabledTools).
      disabledTools: runnerRole && adapter?.workflowAgentDisabledTools?.length ? [...new Set([...(thread.tools?.disabled ?? []), ...adapter.workflowAgentDisabledTools])] : thread.tools?.disabled ?? [],
      disabledServers: thread.tools?.disabledServers ?? [],
      modelParams: thread.custom.modelParams ?? null,
      model: thread.model,
      sandbox: sandboxFor(thread.permission.mode),
      // 'ask' | 'acceptEdits' (truthy) when the mode needs the agent to ask, else false; an adapter with askAllInLaunch
      // relaunches when it changes (keyOf), so the two modes get their own rules.
      askAll: thread.permission.mode === 'ask' || thread.permission.mode === 'acceptEdits' ? thread.permission.mode : false,
      writable: [thread.cwd, ...(thread.permission.writableRoots ?? [])],
      cwd: thread.cwd,
      dynamicWorkflows: thread.dynamicWorkflows === true,
      // An agent that takes the reasoning effort only at launch (adapter.effortInLaunch: Gemini's thinking config).
      effort: thread.effort ?? null,
      // OpenClaude Desktop's tools server name, when sessions get one (Gemini lets it past a user's mcp.allowed list).
      appTools: appTools?.name ?? null,
      // The whole server for an agent that declares it in its launch config (adapter.appToolsInLaunch), else null.
      appToolsEntry: launchAppTools(thread),
    }
  }

  // OpenClaude Desktop's tools changed (codeDesktop/appTools/changed: a Settings switch turned Dynamic workflows or the
  // preview on or off). The ACP agents keep the MCP tool list they read when the session opened (Kimi, Qwen and
  // MiniMax ignore tools/list_changed), so the change is part of the launch key: an idle session relaunches before
  // its next turn and session/load lists the tools again; a busy one once its work ends (deferRestart).
  let appToolsRevision = 0
  const keyOf = (config) => JSON.stringify([appTools ? appToolsRevision : null, config.systemPrompt, config.appendPrompt, config.disabledTools, config.disabledServers, config.modelParams, config.sandbox, config.writable, adapter.askAllInLaunch ? config.askAll : null, adapter.modelInLaunch ? config.model : null, adapter.workflowsInLaunch ? config.dynamicWorkflows : null, adapter.effortInLaunch ? config.effort : null])

  function hostHandlers(thread) {
    return {
      permission: (params) => onPermission(thread, params),
      readTextFile: (params) => thread.services.readTextFile(params),
      writeTextFile: (params) => thread.services.writeTextFile(params),
      terminal: (method, params) => thread.services.terminal(method, params),
      elicitation: (params) => onElicitation(thread, params),
      extension: async (method, params) => {
        const answer = adapter.onExtension?.(method, params, agentTurnApi(thread))
        if (answer === undefined) throw new RpcError(METHOD_NOT_FOUND, `${method} is not supported by OpenClaude Desktop.`)
        return answer
      },
    }
  }

  /**
   * Turns the agent starts on its own (Qwen's goal rounds and background-task notices via _qwencode/start_turn,
   * its cron and /loop runs): projected like any turn. While one runs the thread counts as running, so a message
   * the user sends waits in the queue and leaving the session does not stop the agent.
   */
  function agentTurnApi(thread) {
    return {
      startAgentTurn: (options = {}) => startAgentTurn(thread, isRecord(options) ? options : {}),
      endAgentTurn: (options = {}) => endAgentTurn(thread, isRecord(options) ? options : {}),
      // A follow-up the agent suggests for the empty composer (Qwen). Bridge notification; Codex readers ignore it.
      promptSuggestion: (suggestion) => notify('codeDesktop/promptSuggestion', { threadId: thread.id, turnId: thread.projector.turns.at(-1)?.id ?? null, suggestion }),
      // Messages steered into the running turn that the agent pulls between tool batches (adapter.steerDrain: Qwen's
      // craft/drainMidTurnQueue): their texts, each shown in the turn as its user message as it is taken.
      drainSteer: () => drainSteer(thread),
      // A pull request the agent opened for this session (Qwen's qwen/notify/session/pr-binding after `gh pr create`):
      // kept with the thread, sent as codeDesktop/thread/pr and on thread/list|read (codeDesktop.pr).
      prBinding: (pr) => bindPullRequest(thread.id, pr),
      // A notice for the session's warning strip (Qwen's recording-degraded), sent once per thread and text.
      warn: (message) => {
        if (typeof message !== 'string' || !message) return
        thread.warned ??= new Set()
        if (thread.warned.has(message)) return
        thread.warned.add(message)
        notify('warning', { threadId: thread.id, message })
      },
    }
  }

  function bindPullRequest(threadId, pr) {
    const number = Number.isSafeInteger(pr?.number) && pr.number > 0 ? pr.number : null
    const url = typeof pr?.url === 'string' && /^https:\/\//.test(pr.url) ? pr.url.slice(0, 500) : null
    if (!number && !url) return
    const value = { number, url }
    store.update(threadId, { pr: value })
    notify('codeDesktop/thread/pr', { threadId, pr: value })
  }

  function drainSteer(thread) {
    const taken = (thread.steerBuffer ?? []).splice(0)
    const active = thread.projector.activeTurn
    if (taken.length && active) {
      const notes = []
      for (const entry of taken) thread.projector.pushItem(notes, active, { type: 'userMessage', id: thread.projector.nextId('user'), clientId: entry.clientId, content: entry.input }, Date.now())
      emit(notes)
    }
    return taken.map((entry) => entry.text).filter((text) => typeof text === 'string' && text.trim())
  }

  /**
   * A question the agent asked in the background (Kimi's AskUserQuestion with background: true, adapter.backgroundQuestion):
   * it stays open past the end of its turn, its answer reaching the agent later (Kimi's task notification turn).
   */
  function backgroundQuestion(thread, entry) {
    if (!adapter.backgroundQuestion || entry.flag !== 'waitingOnUserInput' || typeof entry.toolCallId !== 'string') return false
    const known = thread.projector.calls.get(entry.toolCallId)
    try { return adapter.backgroundQuestion(known?.call ?? { toolCallId: entry.toolCallId }, { ctx, thread, item: known?.item ?? null }) === true } catch { return false }
  }

  /**
   * The cards a turn's end closes: all but the background questions, which leave the turn (detach) and close with their
   * task, an interrupt of their turn or the session.
   */
  function abortTurnRequests(thread, why) {
    for (const entry of [...thread.pending.values()]) {
      if (!backgroundQuestion(thread, entry)) entry.abort(why)
      else entry.detach?.()
    }
  }

  /** Opens an agent-started turn; `text` is the prompt the agent ran (a cron run's echo), shown as its user message. */
  function startAgentTurn(thread, { text = null, idleClose = false } = {}) {
    if (thread.prompt || thread.projector.activeTurn) return false
    thread.agentTurn = { startedAtMs: Date.now(), idleClose: Boolean(idleClose), timer: null }
    thread.usage.turn = null
    const notes = []
    const input = typeof text === 'string' && text.trim() ? [{ type: 'text', text, text_elements: [] }] : null
    thread.projector.startTurn({ input }, notes)
    emit(notes)
    thread.publishStatus()
    return true
  }

  /** Closes an agent-started turn: its usage counts like a prompt's, and queued messages run next. */
  function endAgentTurn(thread, { status = 'completed', error = null } = {}) {
    const state = thread.agentTurn
    if (!state || thread.prompt) return
    clearTimeout(state.timer)
    thread.agentTurn = null
    clearTimeout(thread.liveUsage?.timer)
    thread.liveUsage = null
    thread.agentTurnUntil = state.idleClose && status === 'completed' ? Date.now() + 60000 : 0
    abortTurnRequests(thread, 'Turn ended.')
    const turn = thread.projector.activeTurn
    const toolCalls = turn ? turn.items.filter((item) => !['userMessage', 'agentMessage', 'reasoning', 'plan', 'contextCompaction'].includes(item.type)).length : 0
    const failure = status === 'failed' && error ? { message: namedMessage(error.message ?? 'The model request failed.'), codexErrorInfo: error.codexErrorInfo ?? null, additionalDetails: error.additionalDetails ?? null } : null
    if (failure) notify('error', { error: failure, willRetry: false, threadId: thread.id, turnId: turn?.id ?? '' })
    emit(thread.projector.completeTurn({ status, ...(failure ? { error: failure } : {}) }))
    const turnUsage = thread.usage.turn
    thread.usage.turn = null
    if (turnUsage) {
      thread.usage.total = addUsage(thread.usage.total, turnUsage)
      thread.usage.last = { ...addUsage(null, turnUsage) }
      ledger.record({ threadId: thread.id, model: thread.model ?? currentModelOf(thread), usage: turnUsage, toolCalls, startedAtMs: state.startedAtMs, completedAtMs: Date.now() })
      thread.publishUsage(turn?.id)
    }
    thread.save()
    thread.remember({ updatedAt: Date.now() })
    thread.publishStatus()
    void refreshBackground(thread)
    setImmediate(() => drainQueue(thread))
  }

  /**
   * An agent turn with no end signal (Qwen's cron runs): closed once the agent has gone quiet after a model round's
   * usage report, with no tool still running and no question or approval waiting; without a usage report (a failed
   * model call) after a longer quiet spell.
   */
  function armAgentTurnClose(thread, afterUsage) {
    const state = thread.agentTurn
    if (!state?.idleClose) return
    clearTimeout(state.timer)
    state.usageSeen = Boolean(afterUsage)
    const wait = () => {
      state.timer = setTimeout(() => {
        if (thread.agentTurn !== state) return
        const busy = thread.pending.size || (thread.projector.activeTurn?.items ?? []).some((item) => item.status === 'inProgress')
        if (busy) return wait()
        endAgentTurn(thread)
      }, state.usageSeen ? AGENT_TURN_QUIET_MS : AGENT_TURN_STALL_MS)
      state.timer.unref?.()
    }
    wait()
  }

  /**
   * Turns the agent starts on its own that only its session log records (adapter.agentTurnLog: Kimi's turns for a
   * finished background task and its cron runs, which its ACP server never streams). Followed while the session's
   * process runs and no client turn is in flight: {start: {text}} opens an agent turn (the thread counts as running, so
   * a message the user sends waits in the queue instead of reaching a busy agent), {update} items are projected like
   * streamed ones, {usage} adds up, and {end: {status, error}} closes it.
   */
  function watchAgentTurns(thread) {
    if (!adapter.agentTurnLog || thread.agentLogTimer) return
    try { adapter.agentTurnLog(ctx, thread, { reset: true }) } catch (error) { log(`agent turns: ${error?.message ?? error}`) }
    thread.agentLogTimer = setInterval(() => pollAgentTurns(thread), 400)
    thread.agentLogTimer.unref?.()
  }

  /**
   * A call from the agent's log that its approval request already showed under the request's own id (MiniMax asks as
   * perm_<id>, and a turn it runs on its own streams nothing else): the log's record updates that row instead of adding
   * a second one. Matched by tool and arguments, once.
   */
  function loggedCall(thread, update) {
    if (update?.sessionUpdate !== 'tool_call' || !update.toolCallId || thread.projector.calls.has(update.toolCallId) || update.rawInput === undefined) return update
    const name = update.name ?? update.title
    const args = JSON.stringify(update.rawInput)
    thread.loggedCalls ??= new Set()
    const turnItems = new Set((thread.projector.activeTurn?.items ?? []).map((item) => item.id))
    const same = [...thread.projector.calls.values()].find((entry) => turnItems.has(entry.item.id) && !thread.loggedCalls.has(entry.call.toolCallId) && (entry.call.name ?? entry.call.title) === name && JSON.stringify(entry.call.rawInput) === args)
    if (!same) return update
    thread.loggedCalls.add(same.call.toolCallId)
    return { ...update, toolCallId: same.call.toolCallId }
  }

  function pollAgentTurns(thread) {
    if (!adapter.agentTurnLog) return
    if (thread.closing || threads.get(thread.id) !== thread) { clearInterval(thread.agentLogTimer); thread.agentLogTimer = null; return }
    // A client turn's own records are read (and passed over) once it has ended.
    if (thread.prompt || thread.suppress || !thread.host || thread.host.exited) return
    if (thread.projector.activeTurn && !thread.agentTurn?.fromLog && !thread.agentTurn?.adopt) return
    let events = []
    try { events = adapter.agentTurnLog(ctx, thread) ?? [] } catch (error) { log(`agent turns: ${error?.message ?? error}`) }
    for (const event of events) {
      if (event?.start) {
        // The turn a request outside any turn opened (onPermission) is this one: the log takes it over.
        if (thread.agentTurn?.adopt) {
          Object.assign(thread.agentTurn, { adopt: false, fromLog: true, idleClose: false })
          clearTimeout(thread.agentTurn.timer)
          continue
        }
        if (thread.agentTurn?.fromLog) endAgentTurn(thread)
        if (!thread.prompt && !thread.projector.activeTurn && startAgentTurn(thread, { text: event.start.text ?? null })) thread.agentTurn.fromLog = true
      } else if (event?.update) {
        if (thread.agentTurn?.fromLog) onUpdate(thread, loggedCall(thread, event.update))
      } else if (event?.usage) {
        if (thread.agentTurn?.fromLog) thread.usage.turn = addUsage(thread.usage.turn, normalizeUsage(event.usage))
      } else if (event?.end) {
        if (thread.agentTurn?.fromLog) endAgentTurn(thread, { status: thread.agentTurn.cancelRequested ? 'interrupted' : event.end.status ?? 'completed', error: thread.agentTurn.cancelRequested ? null : event.end.error ?? null })
      }
    }
    // A background question whose task ended without this card's answer (the agent stopped it): its card closes.
    if (adapter.backgroundQuestionOpen) {
      for (const entry of thread.pending.values()) {
        if (!backgroundQuestion(thread, entry)) continue
        let open = true
        try { open = adapter.backgroundQuestionOpen(thread, entry.toolCallId) !== false } catch {}
        if (!open) entry.abort('The question was closed.')
      }
    }
  }

  /** False when the agent says it saved nothing of the thread's session yet (adapter.hasSavedSession); true otherwise. */
  function savedSession(thread) {
    try { return adapter.hasSavedSession(ctx, thread.id) !== false } catch { return true }
  }

  /** Starts (or restarts) the thread's agent process for its current settings (one start at a time per thread). */
  async function ensureHost(thread, options = {}) {
    while (thread.ensuring) { try { await thread.ensuring } catch {} }
    thread.ensuring = startHost(thread, options)
    try { return await thread.ensuring } finally { thread.ensuring = null }
  }

  async function startHost(thread, { create = false, keepRunning = false, restarted = false } = {}) {
    await prepare()
    const config = launchConfig(thread)
    const key = keyOf(config)
    if (thread.host && !thread.host.exited && thread.sessionReady && (thread.hostKey === key || keepRunning)) return thread.host
    // An agent that keeps nothing of a session until its first prompt (adapter.hasSavedSession: Gemini) can't reopen it in a
    // new process (session/load: "Invalid session identifier"): such a session keeps its process, and the new settings
    // apply from the next turn, once there is something to reopen.
    if (thread.host && !thread.host.exited && thread.sessionReady && adapter?.hasSavedSession && !savedSession(thread)) return thread.host
    if (thread.host && !thread.host.exited && thread.sessionReady && await deferRestart(thread, config, key)) return thread.host
    if (thread.host && !thread.host.exited && thread.hostKey !== key) await stopHost(thread)
    if (thread.host?.exited) thread.host = null
    if (!thread.host) await flushProfileOps(thread)
    const launch = adapter.launch(ctx, config)
    thread.appToolsInLaunch = launch.appToolsInLaunch === true
    if (launch.agentHome && !thread.agentHome) { thread.agentHome = launch.agentHome; thread.remember() }
    const line = commandLine(program, launch.args)
    const wrapped = wrapLaunch(line, { profile: config.sandbox, writable: config.writable, agentPaths: [...adapter.agentPaths(agentEnv), stateDir, config.threadDir], profileFile: path.join(config.threadDir, 'agent.sb'), ...sandboxExtras() })
    const host = new AgentHost({ stopSignal: adapter?.stopSignal,
      command: wrapped.command, args: wrapped.args, env: { ...agentEnv, ...launch.env }, cwd: thread.cwd,
      clientCapabilities: adapter.clientCapabilities, handlers: hostHandlers(thread), log, label: `${adapter.id}:${thread.id.slice(0, 8)}`,
    })
    thread.host = host
    thread.hostKey = key
    thread.hostConfig = config
    thread.deferredKey = null
    thread.sandboxed = wrapped.sandboxed
    thread.sessionReady = false
    settleOnExit(host, launch)
    host.on('exit', (info) => onHostExit(thread, host, info))
    host.on('notification', (method, params) => onAgentNotification(thread, method, params))
    try {
      await host.start()
      // State the agent creates on its first start (MiniMax's database) that the adapter fills in: one restart reads it.
      let again = false
      if (!restarted && adapter.afterStart) { try { again = adapter.afterStart(ctx, launch) === true } catch (error) { log(`after start: ${error?.message ?? error}`) } }
      if (again) {
        thread.host = null
        thread.hostKey = null
        await host.stop()
        return startHost(thread, { create, keepRunning, restarted: true })
      }
      if (create) {
        const result = await host.call('session/new', { cwd: thread.cwd, mcpServers: sessionMcpServers(thread, thread.id), ...additionalDirectoriesFor(host, thread) }, 120000)
        return { host, created: result }
      }
      await openSession(thread, host)
      return host
    } catch (error) {
      if (thread.host === host) { thread.host = null; thread.hostKey = null }
      void host.stop()
      throw agentError(error, host)
    }
  }

  /**
   * A settings change that needs a new agent process (the launch key changed: a connector or tool switch, an added
   * folder, a mode) while the session's process still runs background work (its background shells, monitors or
   * sub-agents, or jobs it scheduled): a restart would kill that work without notice. The process keeps running with
   * its current settings, the user is told once, and the change applies at the first turn after the work has ended.
   * A change that tightens what the process may do (a stricter sandbox, or an agent that must ask again: askAllInLaunch)
   * restarts anyway, saying what stopped.
   */
  async function deferRestart(thread, config, key) {
    if (!thread.hostConfig) return false
    await refreshBackground(thread)
    let scheduled = false
    try { scheduled = Boolean(adapter.keepLoaded?.(thread)) } catch {}
    const work = backgroundWorkNames(thread)
    if (!work.length && !scheduled) return false
    const rank = { none: 0, 'workspace-write': 1, 'read-only': 2 }
    const before = thread.hostConfig
    const askRank = (value) => (value === 'ask' ? 2 : value ? 1 : 0)
    const tighter = (rank[config.sandbox] ?? 1) > (rank[before.sandbox] ?? 1) || (adapter.askAllInLaunch && askRank(config.askAll) > askRank(before.askAll))
    const listed = work.length ? work.slice(0, 3).join(', ') + (work.length > 3 ? ', …' : '') : 'scheduled tasks'
    if (tighter) {
      notify('warning', { threadId: thread.id, message: `${adapter.name} restarted to apply the stricter permission mode, which stopped its background work (${listed}).` })
      return false
    }
    if (thread.deferredKey !== key) {
      thread.deferredKey = key
      notify('warning', { threadId: thread.id, message: `${adapter.name} keeps its current settings while its background work runs (${listed}). Your change applies once that work has ended.` })
    }
    return true
  }

  /** What runs in the background of a loaded session, for notices: its background commands and the agent's own tasks. */
  function backgroundWorkNames(thread) {
    const names = thread.services.running().map((term) => term.command).filter(Boolean)
    try { for (const entry of adapter.backgroundProcesses?.(thread) ?? []) if (entry?.command) names.push(entry.command) } catch {}
    return names.map((name) => String(name).replace(/\s+/g, ' ').slice(0, 60))
  }

  /** The agent's own background work, read again (adapter.refreshBackground: Qwen's task registry). */
  async function refreshBackground(thread) {
    if (!adapter.refreshBackground) return
    const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : null
    try { await adapter.refreshBackground(ctx, thread, host) } catch (error) { log(`background tasks: ${error?.message ?? error}`) }
  }

  /** A message behind the agent's name, once (agentError's words already carry it: no "Gemini CLI: Gemini CLI: …"). */
  function namedMessage(text) {
    const value = String(text ?? '')
    return value.startsWith(`${adapter.name}: `) || value.startsWith(`${adapter.name} stopped: `) || value.startsWith(`${adapter.name} failed: `) ? value : `${adapter.name}: ${value}`
  }

  function agentError(error, host) {
    // Missing credentials the agent words its own way (Gemini: 'Gemini API key is missing or not configured.'):
    // Codex's unauthorized error, with what the selected sign-in method needs (adapter.authHint).
    // A hint object ({message, codexErrorInfo}) replaces the agent's words: its "auth required" had another cause (Kimi:
    // a broken config.toml, adapter.authHint runs its doctor), so neither the sign-in remedy nor 'unauthorized' fits.
    let hint = null
    if (error instanceof RpcError && adapter?.authHint) { try { hint = adapter.authHint(ctx, error.message) ?? null } catch {} }
    if (hint && typeof hint === 'object' && typeof hint.message === 'string') return new RpcError(SERVER_ERROR, `${adapter.name}: ${hint.message}`, { codexErrorInfo: hint.codexErrorInfo ?? 'other' })
    const sentence = (text) => { const value = String(text ?? '').trim(); return /[.!?。！？]$/.test(value) ? value : `${value}.` }
    if (hint) return new RpcError(SERVER_ERROR, `${adapter.name}: ${sentence(error.message)} ${hint}`, { codexErrorInfo: 'unauthorized' })
    if (error instanceof RpcError && /auth/i.test(error.message)) return new RpcError(SERVER_ERROR, `${adapter.name}: ${sentence(error.message)} Sign in from the account menu, or configure ${adapter.name} in its own settings.`, { codexErrorInfo: 'unauthorized' })
    const gone = host?.exited || host?.transport?.closed
    if (error instanceof RpcError && !gone) return error
    return new RpcError(SERVER_ERROR, `${adapter.name} ${gone ? 'stopped' : 'failed'}: ${error?.message ?? error}${host?.stderrTail?.(800) ?? ''}`)
  }

  /** Reopens a thread's session in a fresh process: resume (no replay) when offered, else load (replay ignored). */
  async function openSession(thread, host) {
    const listener = (update) => onUpdate(thread, update)
    host.attach(thread.id, listener)
    let result
    const storedIn = thread.agentCwd ?? thread.cwd
    if (host.can('resume')) {
      result = await host.call('session/resume', { sessionId: thread.id, cwd: storedIn, mcpServers: sessionMcpServers(thread, thread.id), ...additionalDirectoriesFor(host, thread) }, 120000)
    } else {
      thread.suppress = true
      // The agent's own copy may be gone (Gemini's session retention): the adapter can write it back from the history.
      const restored = adapter.beforeLoad?.(ctx, thread.id, { cwd: thread.cwd, turns: thread.projector.turns }) === true
      if (restored) thread.pendingNote = `${adapter.name} had deleted its copy of this conversation (its session retention period ended). OpenClaude Desktop restored the messages from its own history; earlier tool results are not included.`
      result = await host.call('session/load', { sessionId: thread.id, cwd: storedIn, mcpServers: sessionMcpServers(thread, thread.id), ...additionalDirectoriesFor(host, thread) }, 180000)
      try { adapter.afterLoad?.(ctx, thread.id) } catch {}
      // An agent that replays the conversation after session/load answers (adapter.replaysAfterLoad: Gemini): the
      // replay stays suppressed until the stream has gone quiet, so it never lands in the next turn.
      if (adapter.replaysAfterLoad) await replayQuiet(thread, host)
    }
    // A session that moved (/cd) moves again in every new process: the agent restores it where it was stored.
    if (thread.agentCwd && thread.agentCwd !== thread.cwd && adapter.changeDirectory) {
      try { await adapter.changeDirectory(ctx, host, thread.id, thread.cwd) } catch (error) { notify('warning', { threadId: thread.id, message: `${adapter.name} could not continue in ${thread.cwd}: ${error?.message ?? error}` }) }
    }
    thread.sessionReady = true
    thread.toolsReady = awaitSessionTools(thread, host)
    await afterSession(thread, host, result)
  }

  /** Resolves once `thread` got no agent update for REPLAY_QUIET_MS (at most REPLAY_WAIT_MS after the load answered). */
  async function replayQuiet(thread, host) {
    const answered = Date.now()
    while (!host.exited && Date.now() - answered < REPLAY_WAIT_MS && Date.now() - Math.max(answered, thread.lastUpdateAt ?? 0) < REPLAY_QUIET_MS) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * An agent that declares a session's MCP tools only once its servers have connected (adapter.awaitSessionTools: Qwen
   * discovers them in the background, and after session/resume the first prompt went out with none of OpenClaude Desktop's
   * tools): the thread's next prompt waits for them (runTurnBody), as long as the adapter allows. null when no wait.
   */
  function awaitSessionTools(thread, host) {
    if (!adapter.awaitSessionTools || !appTools || thread.appToolsInLaunch || (thread.tools?.disabledServers ?? []).includes(appTools.name)) return null
    return Promise.resolve().then(() => adapter.awaitSessionTools(ctx, host, thread.id, appTools.name)).catch(() => false)
  }

  /** Applies the thread's mode, model and effort to a new or reopened session. */
  async function afterSession(thread, host, result) {
    thread.sessionOpenedAt = Date.now()
    thread.acp.modes = result?.modes ?? thread.acp.modes
    thread.acp.models = result?.models ?? thread.acp.models
    thread.acp.configOptions = result?.configOptions ?? thread.acp.configOptions
    // An agent whose reported mode is not what its engine starts in (Kimi always says 'default', while its config's
    // default_permission_mode / default_plan_mode, or a resumed session's last mode, decide the engine's) gets the
    // thread's mode sent on every open, so the bridge's approvals and plan state are the ones in force.
    thread.acp.mode = adapter.syncModeOnOpen ? null : result?.modes?.currentModeId ?? thread.acp.mode
    rememberModels(thread)
    await applyAgentMode(thread)
    await applyModel(thread)
    // A new process: the agent's log is followed from here (its earlier records are history).
    if (adapter.agentTurnLog) { clearInterval(thread.agentLogTimer); thread.agentLogTimer = null; watchAgentTurns(thread) }
    // A run still going when the session reopens (a background workflow): followed again.
    if (adapter.workflowTasks && workflowItems(thread).some((entry) => entry.item.workflowRun.status === 'running')) watchWorkflows(thread)
  }

  function rememberModels(thread) {
    rememberModelEfforts(thread)
    const models = modelsFromSession(thread)
    if (models.length) store.setCache('modelRows', models)
    if (!thread.model) thread.model = currentModelOf(thread)
  }

  function currentModelOf(thread) {
    if (thread.acp.models?.currentModelId) return thread.acp.models.currentModelId
    return modelOption(thread)?.currentValue ?? null
  }

  const modelOption = (thread) => (thread.acp.configOptions ?? []).find((entry) => entry.category === 'model' || entry.id === 'model')

  function effortOption(thread) {
    return (thread.acp.configOptions ?? []).find((entry) => entry.category === 'thought_level')
  }

  /** The thread's reasoning effort: the one it asked for, else the session's current thought level. */
  const effortOf = (thread) => thread.effort ?? effortOption(thread)?.currentValue ?? null

  /** A config option's choices (grouped options flattened). */
  const choicesOf = (option) => (option?.options ?? []).flatMap((entry) => (Array.isArray(entry.options) ? entry.options : [entry]))

  /** {efforts, defaultEffort} of a session's thought_level option (the efforts of the session's current model only). */
  function thoughtEfforts(configOptions) {
    const option = (configOptions ?? []).find((entry) => entry.category === 'thought_level')
    if (!option) return { efforts: [], defaultEffort: null }
    return { efforts: choicesOf(option).map((choice) => ({ id: choice.value, name: choice.name ?? choice.value })), defaultEffort: option.currentValue ?? null }
  }

  /** The adapter's own per-model facts (Kimi: config.toml), by model id. */
  function modelCatalog() {
    try { return new Map((adapter?.modelCatalog?.(ctx) ?? []).map((model) => [model.id, model])) } catch (error) { log(`model catalog: ${error?.message ?? error}`); return new Map() }
  }

  /**
   * A session's thought_level option belongs to its current model only: it is recorded under that model
   * (store cache modelEfforts), so model/list gives every model its own efforts, never the current one's.
   */
  function rememberModelEfforts(thread, { probe = false } = {}) {
    const id = currentModelOf(thread)
    if (!id || !thread.acp.configOptions) return
    const known = { ...(store.cache.modelEfforts ?? {}) }
    const live = thoughtEfforts(thread.acp.configOptions)
    // The default is what a fresh session starts on (a probe); a live session's level is the thread's own choice.
    known[id] = { efforts: live.efforts, defaultEffort: probe ? live.defaultEffort : known[id]?.defaultEffort ?? live.defaultEffort }
    if (JSON.stringify(known[id]) !== JSON.stringify(store.cache.modelEfforts?.[id])) store.setCache('modelEfforts', known)
  }

  /** Per-model facts for a model/list row: the live session for its current model, else the catalog, else what was recorded. */
  function modelInfo(thread, id, catalog = modelCatalog()) {
    // An agent with no thought_level option may still know a model's efforts (Gemini: its thinking level or budget).
    let own = null
    if (!catalog.has(id) && adapter?.modelEfforts) { try { own = adapter.modelEfforts(id) ?? null } catch {} }
    const listed = catalog.get(id) ?? own ?? {}
    const known = store.cache.modelEfforts?.[id]
    if (thread && id === currentModelOf(thread) && thread.acp.configOptions) {
      const live = thoughtEfforts(thread.acp.configOptions)
      return { ...listed, efforts: live.efforts, defaultEffort: listed.defaultEffort ?? known?.defaultEffort ?? live.defaultEffort }
    }
    if (Array.isArray(listed.efforts)) return listed
    if (known) return { ...listed, efforts: known.efforts, defaultEffort: known.defaultEffort }
    return { ...listed, efforts: [], defaultEffort: null }
  }

  /** model/list rows from a session's ACP models or model config option, each with its own efforts. */
  function modelsFromSession(thread) {
    const catalog = modelCatalog()
    const row = (id, name, description, contextWindow, isDefault) => {
      const info = modelInfo(thread, id, catalog)
      return { id, name: name ?? info.name ?? id, description: description || info.description || '', contextWindow: contextWindow ?? info.contextWindow ?? null, efforts: info.efforts ?? [], defaultEffort: info.defaultEffort ?? null, inputModalities: info.inputModalities ?? null, isDefault }
    }
    if (thread.acp.models?.availableModels?.length) {
      return thread.acp.models.availableModels.map((model) => row(model.modelId, model.name, model.description, model._meta?.contextLimit ?? null, model.modelId === thread.acp.models.currentModelId))
    }
    const option = modelOption(thread)
    return choicesOf(option).map((entry) => row(entry.value, entry.name, entry.description, null, entry.value === option.currentValue))
  }

  /**
   * Model discovery: each model's own thought_level option, read by switching the throwaway session through
   * the models (session/set_config_option answers with the new model's options). Skipped when the adapter
   * knows every model's efforts itself.
   */
  async function probeModelEfforts(host, sessionId, probe) {
    const option = modelOption(probe)
    if (!option || !Array.isArray(probe.acp.configOptions)) return
    rememberModelEfforts(probe, { probe: true })
    const catalog = modelCatalog()
    const pending = choicesOf(option).map((choice) => choice.value).filter((value) => value !== option.currentValue && !Array.isArray(catalog.get(value)?.efforts)).slice(0, 40)
    const deadline = Date.now() + 25000
    for (const value of pending) {
      if (Date.now() > deadline || host.exited) break
      try {
        const result = await host.call('session/set_config_option', { sessionId, configId: option.id, value }, 10000)
        if (!Array.isArray(result?.configOptions)) break
        rememberModelEfforts({ acp: { models: null, configOptions: result.configOptions } }, { probe: true })
      } catch (error) {
        log(`model discovery ${value}: ${error?.message ?? error}`)
      }
    }
  }

  /**
   * The ACP mode for the thread's OpenClaude Desktop mode: plan for the read-only modes a user is in (Plan, chat, review), the
   * agent's asking mode otherwise. readOnly (a /workflow agent nobody answers) stays in the asking mode: the agent's plan
   * mode would have it write a plan and end on a plan review or question (Kimi), or take its shell away and wait for
   * the user (Gemini); decide() refuses its edits and the read-only sandbox holds.
   */
  async function applyAgentMode(thread) {
    const host = thread.host
    if (!host || host.exited || !thread.sessionReady) return
    const wanted = usesAgentPlanMode(thread.permission.mode) ? adapter.modeIds.plan : adapter.modeIds.default
    const available = new Set([...(thread.acp.modes?.availableModes ?? []).map((mode) => mode.id), ...((thread.acp.configOptions ?? []).find((entry) => entry.category === 'mode')?.options ?? []).map((option) => option.value)])
    if (!wanted || !available.has(wanted) || thread.acp.mode === wanted) return
    try {
      if (thread.acp.modes) await host.call('session/set_mode', { sessionId: thread.id, modeId: wanted }, 30000)
      else await host.call('session/set_config_option', { sessionId: thread.id, configId: 'mode', value: wanted }, 30000)
      thread.acp.mode = wanted
    } catch (error) {
      log(`set mode ${wanted} for ${thread.id}: ${error?.message ?? error}`)
    }
  }

  /**
   * Applies the thread's model, then its effort against the new model's own options. The model goes through
   * session/set_config_option when the agent offers a model option: it answers with the new model's options
   * (efforts included) and, on Qwen, changes this session only (session/set_model would also rewrite Qwen's
   * global default model). Runs at every session (re)open and before every prompt, so a model or effort picked
   * in an open session applies from the next turn.
   */
  async function applyModel(thread) {
    const host = thread.host
    if (!host || host.exited || !thread.sessionReady) return
    const current = currentModelOf(thread)
    if (thread.model && thread.model !== current) {
      try {
        const option = modelOption(thread)
        if (option) {
          const result = await host.call('session/set_config_option', { sessionId: thread.id, configId: option.id, value: thread.model }, 30000)
          thread.acp.configOptions = Array.isArray(result?.configOptions) ? result.configOptions : thread.acp.configOptions.map((entry) => (entry === option ? { ...entry, currentValue: thread.model } : entry))
        } else if (thread.acp.models) {
          await host.call('session/set_model', { sessionId: thread.id, modelId: thread.model, _meta: { 'qwen.session.modelPersistDefault': false } }, 30000)
        }
        if (thread.acp.models) thread.acp.models = { ...thread.acp.models, currentModelId: thread.model }
        rememberModelEfforts(thread)
      } catch (error) {
        log(`set model ${thread.model}: ${error?.message ?? error}`)
      }
    }
    const effort = effortOption(thread)
    if (thread.effort && effort && effort.currentValue !== thread.effort && choicesOf(effort).some((option) => option.value === thread.effort)) {
      try {
        const result = await host.call('session/set_config_option', { sessionId: thread.id, configId: effort.id, value: thread.effort }, 30000)
        if (Array.isArray(result?.configOptions)) thread.acp.configOptions = result.configOptions
        else thread.acp.configOptions = thread.acp.configOptions.map((entry) => (entry === effort ? { ...entry, currentValue: thread.effort } : entry))
      } catch (error) {
        log(`set effort ${thread.effort}: ${error?.message ?? error}`)
      }
    }
  }

  /**
   * The turn's model must be the session's: a model its process doesn't know (one added to the agent's config after it
   * started) gets one fresh process, which reads the config again; still unknown, the turn fails saying so instead of
   * running on the previous model.
   */
  async function ensureModelApplied(thread) {
    if (!thread.model || currentModelOf(thread) === thread.model) return
    const known = () => modelsFromSession(thread).map((row) => row.id)
    if (!known().length || known().includes(thread.model)) return
    if (!hasBackgroundWork(thread)) {
      await stopHost(thread)
      await ensureHost(thread)
      if (currentModelOf(thread) === thread.model) return
    }
    throw new RpcError(INVALID_PARAMS, `${adapter.name} doesn’t offer the model “${thread.model}” in this session. Pick another model, or check ${adapter.name}’s model settings.`)
  }

  async function stopHost(thread) {
    const host = thread.host
    thread.host = null
    thread.hostKey = null
    thread.sessionReady = false
    if (!host) return
    try { if (host.can('close') && !host.exited) await host.call('session/close', { sessionId: thread.id }, 5000) } catch {}
    await host.stop()
  }

  function onHostExit(thread, host, info) {
    if (thread.host !== host) return
    thread.host = null
    thread.hostKey = null
    thread.sessionReady = false
    for (const entry of thread.pending.values()) entry.abort('The agent stopped.')
    if (thread.agentTurn) endAgentTurn(thread, { status: 'interrupted' })
    if (thread.prompt) {
      const message = `${adapter.name} stopped unexpectedly (${info?.signal ?? info?.code ?? 'exit'}).${host.stderrTail(600)}`
      finishTurn(thread, { status: 'failed', error: { message, codexErrorInfo: null, additionalDetails: null } })
    }
  }

  function onAgentNotification(thread, method, params) {
    if (adapter.onExtension && params?.sessionId === thread.id) adapter.onExtension(method, params, agentTurnApi(thread))
    // MiniMax queue updates and similar extension notifications only refresh the client's queue view.
    if (method === 'mcode/session/queue_update' && params?.sessionId === thread.id) notify('thread/queue/changed', { threadId: thread.id })
    if (method === 'mcode/session/delegation_update' && params?.sessionId === thread.id) onDelegation(thread, params.snapshot)
  }

  // Sub-agents MiniMax reports by snapshot (mcode/session/delegation_update): each member is a child thread.

  const DELEGATE_STATUS = { running: 'running', queued: 'pendingInit', pending: 'pendingInit', starting: 'pendingInit', completed: 'completed', succeeded: 'completed', failed: 'errored', error: 'errored', errored: 'errored', cancelled: 'interrupted', canceled: 'interrupted', stopped: 'interrupted', interrupted: 'interrupted' }

  /** A delegation snapshot: new members become child threads, linked to the call that spawned them. */
  function onDelegation(thread, snapshot) {
    const members = Array.isArray(snapshot?.members) ? snapshot.members : []
    thread.delegates ??= new Map()
    for (const member of members) {
      if (typeof member?.sessionId !== 'string' || !member.sessionId || member.sessionId === thread.id) continue
      const id = member.sessionId
      const status = DELEGATE_STATUS[String(member.status ?? '').toLowerCase()] ?? 'running'
      let delegate = thread.delegates.get(id)
      if (!delegate) {
        delegate = { id, status: null, callId: null }
        thread.delegates.set(id, delegate)
        const known = store.has(id) ? store.get(id) : null
        store.update(id, { cwd: thread.cwd, parentThreadId: member.parentSessionId ?? thread.id, rootThreadId: thread.id, agentLabel: member.agentName ?? null, createdAt: known?.createdAt ?? member.createdAtMs ?? Date.now(), updatedAt: member.updatedAtMs ?? Date.now(), subagent: true, delegate: true, preview: known?.preview || String(member.task ?? '').slice(0, 200) })
        notify('thread/started', { thread: threadObject(id) })
      }
      // The snapshot can come before the call that spawned it: linked as soon as that call is there.
      delegate.member = member
      if (!delegate.callId) delegate.callId = linkDelegate(thread, member)
      if (delegate.status === status) continue
      delegate.status = status
      store.update(id, { updatedAt: member.updatedAtMs ?? Date.now(), delegateStatus: status, ...(typeof member.errorMessage === 'string' && member.errorMessage ? { delegateError: member.errorMessage } : {}) })
      notify('thread/status/changed', { threadId: id, status: status === 'running' || status === 'pendingInit' ? { type: 'active', activeFlags: [] } : { type: 'idle' } })
      if (delegate.callId) updateDelegateCall(thread, delegate.callId, id, status)
    }
  }

  /** The spawning call of a delegate: the one naming its task, else the latest that names no child yet. */
  function linkDelegate(thread, member) {
    const linked = new Set([...(thread.delegates?.values() ?? [])].map((entry) => entry.callId).filter(Boolean))
    const calls = [...thread.projector.calls.values()].filter((entry) => entry.item?.type === 'collabAgentToolCall' && !linked.has(entry.call.toolCallId) && !(entry.item.receiverThreadIds ?? []).length)
    const task = String(member.task ?? '').trim()
    const named = task ? calls.find((entry) => [entry.item.description, entry.item.prompt].some((text) => typeof text === 'string' && text && (text.includes(task) || task.includes(text)))) : null
    const entry = named ?? calls.at(-1)
    if (!entry) return null
    updateDelegateCall(thread, entry.call.toolCallId, member.sessionId, DELEGATE_STATUS[String(member.status ?? '').toLowerCase()] ?? 'running')
    return entry.call.toolCallId
  }

  function updateDelegateCall(thread, callId, childId, status) {
    const entry = thread.projector.calls.get(callId)
    if (!entry) return
    // The call's result text (what the delegate answered) stays with its state.
    const states = entry.item.agentsStates ?? {}
    const raw = states[childId]?.message ?? Object.values(states).find((state) => state?.message)?.message ?? null
    const message = (adapter.delegateText ? adapter.delegateText(raw) : raw) ?? raw
    entry.item = { ...entry.item, receiverThreadIds: [childId], agentsStates: { [childId]: { status, message } } }
    // What the child was asked and answered: its conversation when the agent cannot replay it.
    store.update(childId, { delegatePrompt: entry.item.prompt ?? null, delegateResult: message ?? null })
    const turn = thread.projector.turns.find((candidate) => candidate.items.some((item) => item.id === entry.item.id))
    if (!turn) return
    thread.projector.replaceItem(turn, entry.item)
    notify(entry.item.status === 'inProgress' ? 'item/started' : 'item/completed', { item: entry.item, threadId: thread.id, turnId: turn.id, ...(entry.item.status === 'inProgress' ? { startedAtMs: Date.now() } : { completedAtMs: Date.now() }) })
    if (!thread.prompt) thread.save()
  }

  /**
   * A delegate's conversation, replayed from the agent (session/load on its root thread's process) once it
   * has finished; kept as the child's history.
   */
  async function delegateTurns(id, meta) {
    if (meta.delegateStatus === 'running' || meta.delegateStatus === 'pendingInit') return []
    // MiniMax keeps sub-agent sessions internal (session/load refuses them): the task and its answer.
    if (adapter.loadDelegates === false) {
      const projector = new ThreadProjector({ threadId: id, cwd: meta.cwd })
      const prompt = typeof meta.delegatePrompt === 'string' && meta.delegatePrompt ? meta.delegatePrompt : meta.preview || ''
      const answer = adapter.delegateText?.(meta.delegateResult) ?? meta.delegateResult
      const started = meta.createdAt ?? Date.now()
      const turn = projector.startTurn({ input: prompt ? [{ type: 'text', text: prompt, text_elements: [] }] : null, time: started })
      if (typeof answer === 'string' && answer.trim()) projector.pushItem([], turn, { type: 'agentMessage', id: projector.nextId('agent'), text: answer.trim(), phase: null, memoryCitation: null, delivery: null, questions: null }, meta.updatedAt ?? started)
      projector.completeTurn({ status: meta.delegateStatus === 'errored' ? 'failed' : meta.delegateStatus === 'interrupted' ? 'interrupted' : 'completed', time: meta.updatedAt ?? started })
      const turns = projector.persist()
      if (meta.delegateResult) store.writeHistory(id, { turns })
      return turns
    }
    const root = threads.get(meta.rootThreadId) ?? await openThread(meta.rootThreadId, { load: false })
    const host = root.host && !root.host.exited && root.sessionReady ? root.host : await ensureHost(root)
    if (!host.can('load')) return []
    const projector = new ThreadProjector({ threadId: id, cwd: meta.cwd ?? root.cwd, classify: (call) => adapter.classify?.(call, ctx) ?? null, commandResult: adapter.commandResult })
    let last = Date.now()
    const detach = host.attach(id, (update) => {
      last = Date.now()
      const filtered = adapter.filterUpdate ? adapter.filterUpdate(update, undefined, { replay: true }) : { update }
      if (filtered.drop || filtered.child) return
      try { projector.apply(filtered.update, { replay: true }) } catch {}
    })
    try {
      await host.call('session/load', { sessionId: id, cwd: meta.cwd ?? root.cwd, mcpServers: [] }, 120000)
      while (Date.now() - last < 400) await new Promise((resolve) => setTimeout(resolve, 150))
    } catch (error) {
      // The child stays listed with its call's result; its own conversation is just not available.
      log(`delegate ${id}: ${error?.message ?? error}`)
      return []
    } finally {
      detach()
      if (host.can('close')) host.call('session/close', { sessionId: id }, 5000).catch(() => {})
    }
    projector.completeTurn({})
    const turns = projector.turns.map((turn) => ({ ...turn, status: turn.status === 'inProgress' ? 'completed' : turn.status }))
    store.writeHistory(id, { turns })
    return turns
  }

  // ------------------------------------------------------------ updates

  /** Whether a tool call id is an item of one of the thread's earlier turns (not the one in progress). */
  function earlierCall(thread, id) {
    const active = thread.projector.activeTurn
    return thread.projector.turns.some((turn) => turn !== active && turn.id !== active?.id && (turn.items ?? []).some((item) => item?.id === id))
  }

  /**
   * A running turn's tokens so far, for an agent that reports a turn's usage only once it ends: what it recorded so far
   * (adapter.liveTurnUsage: Gemini's session file, Kimi's logs, MiniMax's usage table; sync or async), else the usage
   * frames the turn added up (Qwen). Read at most every LIVE_USAGE_MS while the agent works and published as provisional
   * totals (what the thread had plus the turn so far), so a workflow card counts while its agents run. thread.usage is
   * left alone: the turn's own totals replace these when it ends.
   */
  function scheduleLiveUsage(thread) {
    // A prompted turn, or one the agent started itself (Qwen's cron and /loop runs, Kimi's task turns).
    const running = () => thread.prompt ?? thread.agentTurn ?? null
    const turn = running()
    if (!turn || thread.liveUsage?.timer) return
    const live = thread.liveUsage ??= { tokens: 0, timer: null }
    live.timer = setTimeout(async () => {
      let reported = null
      try { reported = adapter.liveTurnUsage ? await adapter.liveTurnUsage(ctx, thread, { since: turn.startedAtMs }) : thread.usage.turn ? { usage: thread.usage.turn } : null } catch (error) { log(`live usage: ${error?.message ?? error}`) }
      live.timer = null
      if (running() !== turn) return
      const usage = normalizeUsage(reported?.usage)
      if (!usage || usage.totalTokens <= live.tokens) return
      live.tokens = usage.totalTokens
      const tokenUsage = threadTokenUsage({ total: addUsage(thread.usage.total, usage), last: usage, contextUsed: reported.contextUsed ?? thread.usage.contextUsed ?? null, contextWindow: thread.usage.contextWindow ?? adapter.contextWindow?.(thread.model) ?? null })
      notify('thread/tokenUsage/updated', { threadId: thread.id, turnId: thread.projector.activeTurn?.id ?? '', tokenUsage })
    }, adapter.liveUsageMs ?? LIVE_USAGE_MS)
    live.timer.unref?.()
  }

  function onUpdate(thread, rawUpdate) {
    thread.lastUpdateAt = Date.now()
    const filtered = adapter.filterUpdate ? adapter.filterUpdate(rawUpdate, thread) : { update: rawUpdate }
    // A run the agent starts by itself (Qwen's cron and /loop runs echo their prompt first): its own turn.
    if (filtered.agentTurn && !thread.suppress) {
      if (!thread.prompt && !thread.projector.activeTurn && startAgentTurn(thread, filtered.agentTurn)) armAgentTurnClose(thread, false)
      return
    }
    // A run with no end signal that went on after it was closed (a slow tool start): it reopens.
    if (!filtered.drop && !thread.suppress && !thread.prompt && !thread.projector.activeTurn && thread.agentTurnUntil > Date.now() && AGENT_WORK_UPDATES.has(rawUpdate?.sessionUpdate)) startAgentTurn(thread, { idleClose: true })
    if (thread.agentTurn?.idleClose) armAgentTurnClose(thread, Boolean(filtered.usage))
    if (filtered.usage) thread.usage.turn = addUsage(thread.usage.turn, normalizeUsage(filtered.usage))
    if (!thread.suppress && AGENT_WORK_UPDATES.has(rawUpdate?.sessionUpdate)) scheduleLiveUsage(thread)
    if (filtered.mode) { if (filtered.mode === adapter.modeIds?.plan && thread.acp.mode !== filtered.mode && !isReadOnlyMode(thread.permission.mode)) agentEnteredPlan(thread); thread.acp.mode = filtered.mode }
    if (filtered.compaction && !thread.suppress) onCompaction(thread, filtered.compaction)
    if (filtered.goal !== undefined && !thread.suppress) applyGoal(thread, filtered.goal)
    if (filtered.title && !thread.suppress) agentTitle(thread, filtered.title)
    if (filtered.drop) return
    const update = filtered.update
    const kind = update?.sessionUpdate
    switch (kind) {
      case 'available_commands_update':
        thread.commands = Array.isArray(update.availableCommands) ? update.availableCommands : []
        store.setCache('commands', thread.commands)
        notify('skills/changed', {})
        return
      case 'current_mode_update':
        if (update.currentModeId && update.currentModeId === adapter.modeIds?.plan && thread.acp.mode !== update.currentModeId && !isReadOnlyMode(thread.permission.mode)) agentEnteredPlan(thread)
        thread.acp.mode = update.currentModeId ?? thread.acp.mode
        return
      case 'config_option_update':
        if (Array.isArray(update.configOptions)) {
          thread.acp.configOptions = update.configOptions
          rememberModelEfforts(thread)
        }
        return
      case 'plan_update': {
        // MiniMax's plan for review (markdown): the plan item now, the card when its questionnaire arrives.
        const text = update.plan?.content
        if (typeof text !== 'string' || !text) return
        const turn = thread.projector.activeTurn ?? thread.projector.turns.at(-1) ?? thread.projector.ensureTurn([], Date.now())
        const itemId = `plan-${update.plan.planId ?? randomUUID()}`
        const notes = []
        thread.projector.pushItem(notes, turn, { type: 'plan', id: itemId, text }, Date.now())
        emit(notes)
        thread.pendingPlan = { itemId, planId: update.plan.planId }
        return
      }
      case 'plan_removed':
        if (thread.pendingPlan?.planId === update.planId) thread.pendingPlan = null
        return
      case 'usage_update':
        if (Number.isFinite(update.used)) thread.usage.contextUsed = update.used
        if (Number.isFinite(update.size)) thread.usage.contextWindow = update.size
        thread.publishUsage(thread.projector.activeTurn?.id)
        return
      case 'session_info_update':
        if (typeof update.title === 'string' && update.title && !thread.meta.name) {
          thread.remember({ agentTitle: update.title })
          notify('thread/name/updated', { threadId: thread.id, threadName: update.title })
        }
        return
      default:
        break
    }
    if (thread.suppress) return
    // A late replayed call of an earlier turn (adapter.replaysAfterLoad) never joins the live one.
    if (adapter.replaysAfterLoad && kind === 'tool_call' && update.toolCallId && earlierCall(thread, update.toolCallId)) return
    if (filtered.child) return childUpdate(thread, filtered.child, update)
    if (!thread.prompt && !thread.projector.activeTurn) return // Nothing the client asked for (stray replay).
    if (thread.compaction && (kind === 'agent_message_chunk' || kind === 'agent_thought_chunk')) {
      thread.compaction.text += blockText(update.content)
      return
    }
    // A launch ending: its sub-agents' last log lines first, so the settled card names every child it started.
    const settling = (kind === 'tool_call' || kind === 'tool_call_update') && (update.status === 'completed' || update.status === 'failed')
    if (settling && adapter.childLogUpdates && thread.projector.calls.get(update.toolCallId)?.item?.type === 'collabAgentToolCall') drainChildLogs(thread, update.toolCallId)
    let notes
    try { notes = thread.projector.apply(update) } catch (error) { log(`projection failed for ${kind}: ${error?.stack ?? error}`); return }
    if (kind === 'tool_call' || kind === 'tool_call_update') {
      for (const block of update.content ?? []) if (block?.type === 'terminal' && typeof block.terminalId === 'string') {
        thread.terminalCalls.set(block.terminalId, update.toolCallId)
        const term = thread.services.terminals.get(block.terminalId)
        if (term?.output) emit(thread.projector.commandOutput(update.toolCallId, term.output, block.terminalId))
      }
      // Sub-agents the agent records only in its own logs (Kimi): followed from the launch on.
      if (kind === 'tool_call' && adapter.childLogUpdates && thread.projector.calls.get(update.toolCallId)?.item?.type === 'collabAgentToolCall') watchChildLogs(thread)
      // A sub-agent's collab item names its child thread once one exists; a background one runs on after its call.
      if (settling) {
        // A child followed through the agent's logs ends with its own log (written a moment after the call returns).
        for (const child of thread.children.values()) if (child.parentToolCallId === update.toolCallId && child.fromLog) child.parentDoneAt ??= Date.now()
        finishChild(thread, update.toolCallId, update.status === 'failed', { foregroundOnly: true })
      }
      if (kind === 'tool_call_update' && update.status === 'completed' && adapter.toolPlan) toolPlan(thread, update)
      // After this update's own notifications (below): the filled item is announced last.
      if (kind === 'tool_call_update' && (update.status === 'completed' || update.status === 'failed') && adapter.toolArguments) setImmediate(() => fillToolArguments(thread, update.toolCallId))
    }
    emit(notes)
    // An agent's own dynamic workflow (Qwen's workflow tool): the call's updates move its run (item.workflowRun).
    if ((kind === 'tool_call' || kind === 'tool_call_update') && adapter.workflowRun) updateWorkflow(thread, update.toolCallId)
    // A delegate reported before its call: linked once the call arrives.
    if (kind === 'tool_call' && thread.delegates?.size) {
      for (const delegate of thread.delegates.values()) if (!delegate.callId && delegate.member) delegate.callId = linkDelegate(thread, delegate.member)
    }
    // A background delegate outlives its call: the call keeps showing the delegate's own state.
    if (kind === 'tool_call_update' && thread.delegates?.size && (update.status === 'completed' || update.status === 'failed')) {
      for (const delegate of thread.delegates.values()) if (delegate.callId === update.toolCallId) updateDelegateCall(thread, delegate.callId, delegate.id, delegate.status ?? 'completed')
    }
  }

  // ------------------------------------------------------------ agent-run dynamic workflows

  /** Every tool item of the thread that carries a workflow run: {turn, index, item}. */
  function workflowItems(thread) {
    const out = []
    const turns = [...thread.projector.turns]
    if (thread.projector.current && !turns.includes(thread.projector.current)) turns.push(thread.projector.current)
    for (const turn of turns) turn.items.forEach((item, index) => { if (item?.workflowRun) out.push({ turn, index, item }) })
    return out
  }

  /** A run's new state on its item, re-announced (item/started while the call runs, else item/completed). */
  function setWorkflowRun(thread, itemId, run) {
    const found = workflowItems(thread).find((entry) => entry.item.id === itemId)
      ?? (() => { const entry = thread.projector.calls.get(itemId); const turn = thread.projector.current; const index = turn ? turn.items.findIndex((item) => item.id === itemId) : -1; return entry && index >= 0 ? { turn, index, item: turn.items[index] } : null })()
    if (!found || found.item.workflowRun === run) return
    const item = { ...found.item, workflowRun: run }
    found.turn.items[found.index] = item
    const call = thread.projector.calls.get(itemId)
    if (call && call.item.id === itemId) call.item = item
    notify(item.status === 'inProgress' ? 'item/started' : 'item/completed', { item, threadId: thread.id, turnId: found.turn.id })
    if (!thread.prompt) thread.save()
  }

  function updateWorkflow(thread, toolCallId) {
    const entry = thread.projector.calls.get(toolCallId)
    if (!entry) return
    const settled = entry.item.status !== 'inProgress'
    // The call settled while its run still looks live: the agent's run registry is read once more first, so the run's
    // last agents and tokens are in before it settles (Qwen ends a call with a text summary only, and the registry is
    // otherwise polled every 1.5 s, longer than a run's last agent takes to finish). The turn waits for that read.
    const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : null
    if (settled && !entry.workflowFinalRead && host && adapter.workflowTasks && adapter.workflowFromTask) {
      const live = applyWorkflowUpdate(thread, entry, { done: false })
      if (live?.status === 'running' && !live.background) {
        entry.workflowFinalRead = true
        const read = (async () => {
          try {
            const tasks = await adapter.workflowTasks(ctx, host, thread.id)
            const current = workflowItems(thread).find((candidate) => candidate.item.id === entry.item.id)?.item.workflowRun ?? entry.item.workflowRun
            const next = current ? adapter.workflowFromTask(current, tasks, { time: Date.now() }) : undefined
            if (next && next !== current) setWorkflowRun(thread, entry.item.id, next)
          } catch (error) { log(`workflow status: ${error?.message ?? error}`) }
          applyWorkflowUpdate(thread, entry, { done: true })
        })()
        const reads = (thread.workflowReads ??= new Set())
        reads.add(read)
        void read.finally(() => reads.delete(read))
        return
      }
    }
    applyWorkflowUpdate(thread, entry, { done: settled })
  }

  /** The call's latest update folded into its run (adapter.workflowRun); `done` settles a run the call ended. */
  function applyWorkflowUpdate(thread, entry, { done }) {
    let run
    try {
      run = adapter.workflowRun(ctx, entry.call, entry.item.workflowRun ?? null, { time: Date.now(), done, failed: done && entry.item.status === 'failed', output: blockText(entry.call.content) || (typeof entry.call.rawOutput === 'string' ? entry.call.rawOutput : '') })
    } catch (error) { log(`workflow: ${error?.message ?? error}`); return entry.item.workflowRun ?? null }
    if (!run || run === entry.item.workflowRun) return entry.item.workflowRun ?? run ?? null
    setWorkflowRun(thread, entry.item.id, run)
    if (run.status === 'running') watchWorkflows(thread)
    return run
  }

  /** While a run is active, the agent's run registry (adapter.workflowTasks) gives its phases and agents. */
  function watchWorkflows(thread) {
    if (!adapter.workflowTasks || thread.workflowTimer) return
    thread.workflowTimer = setInterval(() => void pollWorkflows(thread), 1500)
    thread.workflowTimer.unref?.()
  }

  async function pollWorkflows(thread) {
    if (thread.workflowPolling) return
    const running = workflowItems(thread).filter((entry) => entry.item.workflowRun.status === 'running')
    const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : null
    if (!running.length || !host || thread.closing) {
      clearInterval(thread.workflowTimer)
      thread.workflowTimer = null
      // The process is gone: a run it was running ended with it.
      if (running.length && (!thread.host || thread.host.exited)) for (const entry of running) setWorkflowRun(thread, entry.item.id, adapter.workflowInterrupted?.(entry.item.workflowRun, Date.now()) ?? entry.item.workflowRun)
      return
    }
    thread.workflowPolling = true
    try {
      const tasks = await adapter.workflowTasks(ctx, host, thread.id)
      for (const entry of running) {
        const current = workflowItems(thread).find((candidate) => candidate.item.id === entry.item.id)?.item.workflowRun ?? entry.item.workflowRun
        let next = adapter.workflowFromTask?.(current, tasks, { time: Date.now() })
        // A settled call whose run the registry no longer has, a background run included: the registry keeps every
        // live run and the session's finished ones (Qwen: its terminal entries plus the persisted run history, where a
        // restart files an interrupted run as failed), so one it has dropped is over and its result unknown. Settled,
        // the run leaves `running` and the poll stops with the last live run.
        if (next === undefined && entry.item.status !== 'inProgress') next = (adapter.workflowLost ?? adapter.workflowInterrupted)?.(current, Date.now())
        if (next && next !== current) setWorkflowRun(thread, entry.item.id, next)
      }
    } catch (error) {
      log(`workflow status: ${error?.message ?? error}`)
    } finally {
      thread.workflowPolling = false
    }
  }

  /** codeDesktop/workflow/stop for an agent-run workflow: the agent cancels it by id, else the turn running it stops. */
  async function stopWorkflow(thread, runId) {
    if (typeof runId !== 'string' || !runId) throw invalidParams('runId is required')
    const entry = workflowItems(thread).find((candidate) => candidate.item.workflowRun.id === runId || candidate.item.workflowRun.runId === runId)
    if (!entry) throw invalidParams('Unknown workflow run.')
    const run = entry.item.workflowRun
    if (run.status !== 'running') return { status: 'alreadyFinished' }
    const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : null
    if (host && adapter.stopWorkflow && await adapter.stopWorkflow(ctx, host, thread.id, run)) { watchWorkflows(thread); return { status: 'stopping' } }
    // No run id to cancel by yet (the agent has not named the run): only the turn running it can stop (run.stopScope).
    if (entry.item.status === 'inProgress' && thread.prompt) { await interrupt(thread); return { status: 'stopping', scope: 'turn' } }
    setWorkflowRun(thread, entry.item.id, adapter.workflowInterrupted?.(run, Date.now()) ?? run)
    return { status: 'alreadyFinished' }
  }

  /**
   * codeDesktop/workflow/pause {runId, paused} for an agent-run workflow whose agent pauses runs cooperatively
   * (adapter.pauseWorkflow, Qwen): no new agent starts while paused; the run says so (run.paused) until resumed.
   */
  async function pauseWorkflow(thread, runId, paused) {
    if (typeof runId !== 'string' || !runId) throw invalidParams('runId is required')
    if (typeof paused !== 'boolean') throw invalidParams('paused must be true or false')
    const entry = workflowItems(thread).find((candidate) => candidate.item.workflowRun.id === runId || candidate.item.workflowRun.runId === runId)
    if (!entry) throw invalidParams('Unknown workflow run.')
    const run = entry.item.workflowRun
    if (run.status !== 'running') return { status: 'alreadyFinished' }
    if (!run.runId || run.pauseControls !== true) throw new RpcError(-32000, `${adapter.name} can’t pause this workflow run.`)
    const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : null
    if (!host) throw new RpcError(-32000, `${adapter.name} isn’t running this session right now.`)
    const result = await adapter.pauseWorkflow(ctx, host, thread.id, run, paused)
    const already = paused ? ['paused', 'pausing'].includes(result?.status) : result?.status === 'running'
    if (!result?.changed && !already) throw new RpcError(-32000, paused ? `${adapter.name} didn’t pause this workflow.` : `${adapter.name} didn’t resume this workflow.`)
    const next = { ...run, sequence: (run.sequence ?? 0) + 1 }
    if (paused) next.paused = true
    else delete next.paused
    setWorkflowRun(thread, entry.item.id, next)
    watchWorkflows(thread)
    return { paused }
  }

  /**
   * The arguments of a call the agent streamed without them (adapter.toolArguments: Gemini, read from its session file
   * once it recorded the call; a few short retries, then once more at the turn's end): set on the call and its item
   * (an MCP call's arguments are what its row, a review's findings, a sent file or a chapter is read from), announced
   * again and kept with the thread.
   */
  function fillToolArguments(thread, toolCallId, attempt = 0) {
    const entry = thread.projector.calls.get(toolCallId)
    if (!entry || entry.argumentsFilled || !entry.item || !('arguments' in entry.item)) return
    let args
    try { args = adapter.toolArguments(ctx, thread.id, entry.call) } catch (error) { log(`tool arguments: ${error?.message ?? error}`); return }
    if (args === undefined) return
    if (!args) {
      if (attempt < 5) setTimeout(() => fillToolArguments(thread, toolCallId, attempt + 1), 150 * (attempt + 1)).unref?.()
      return
    }
    entry.argumentsFilled = true
    entry.call = { ...entry.call, rawInput: args }
    const item = { ...entry.item, arguments: args }
    entry.item = item
    const turns = [...thread.projector.turns]
    if (thread.projector.current && !turns.includes(thread.projector.current)) turns.push(thread.projector.current)
    for (const turn of turns) {
      const index = turn.items.findIndex((candidate) => candidate?.id === item.id)
      if (index < 0) continue
      turn.items[index] = item
      notify(item.status === 'inProgress' ? 'item/started' : 'item/completed', { item, threadId: thread.id, turnId: turn.id, ...(item.status === 'inProgress' ? {} : { completedAtMs: Date.now() }) })
      break
    }
    if (!thread.prompt) thread.save()
  }

  /** At a turn's end: every call of the turn still without its arguments is read once more. */
  function fillTurnArguments(thread) {
    if (!adapter.toolArguments) return
    for (const item of thread.projector.activeTurn?.items ?? []) if (item && 'arguments' in item && !Object.keys(item.arguments ?? {}).length) fillToolArguments(thread, item.id, 4)
  }

  /**
   * A todo tool the agent reports no plan for (Gemini's write_todos): its list, read once the agent has
   * recorded the call (a few short retries), fills the plan panel.
   */
  function toolPlan(thread, update) {
    const call = { ...thread.projector.calls.get(update.toolCallId)?.call, ...update }
    let attempt = 0
    const read = () => {
      let entries
      try { entries = adapter.toolPlan(ctx, thread.id, call) } catch (error) { log(`todo list: ${error?.message ?? error}`); return }
      if (entries === undefined) return
      if (!Array.isArray(entries)) {
        if (++attempt < 6) setTimeout(read, 200 * attempt).unref?.()
        return
      }
      thread.projector.plan = planSteps(entries)
      notify('turn/plan/updated', { threadId: thread.id, turnId: thread.projector.activeTurn?.id ?? thread.projector.turns.at(-1)?.id ?? '', explanation: null, plan: thread.projector.plan })
      if (!thread.prompt) thread.save()
    }
    setTimeout(read, 60).unref?.()
  }

  /**
   * The agent's compaction notices (agents/*.js filterUpdate → {phase}): a /compact the agent runs in the
   * background keeps its turn open until the result; an automatic one becomes a contextCompaction item in
   * the reply instead of a stray sentence. A result reports the context left (tokensAfter).
   */
  function onCompaction(thread, event) {
    const job = thread.compaction
    if (event.phase === 'started' || event.phase === 'running') {
      if (job) job.background = true
      return
    }
    if (event.phase === 'autoStarted') {
      if (job) { job.background = true; return }
      const turn = thread.projector.activeTurn
      if (!turn || thread.autoCompaction) return
      const notes = []
      thread.projector.closeOpen(notes)
      const item = { type: 'contextCompaction', id: `compaction-${randomUUID()}` }
      thread.projector.pushItem(notes, turn, item, Date.now(), false)
      emit(notes)
      thread.autoCompaction = { item, turnId: turn.id }
      return
    }
    if (Number.isFinite(event.tokensAfter) && event.tokensAfter >= 0) {
      thread.usage.contextUsed = event.tokensAfter
      thread.publishUsage(job ? thread.projector.activeTurn?.id : undefined)
      thread.remember()
    }
    if (job && (job.background || thread.prompt)) {
      job.result = event
      job.resolve?.()
      return
    }
    if (thread.autoCompaction) {
      const { item, turnId } = thread.autoCompaction
      thread.autoCompaction = null
      notify('item/completed', { item, threadId: thread.id, turnId, completedAtMs: Date.now() })
    }
  }

  /** A title the agent gives the conversation (Gemini's topic): the thread's name unless the user named it. */
  function agentTitle(thread, title) {
    const text = String(title).trim().slice(0, 200)
    if (!text || thread.meta.name || thread.meta.agentTitle === text) return
    thread.remember({ agentTitle: text })
    notify('thread/name/updated', { threadId: thread.id, threadName: text })
  }

  // Sub-agents (Qwen, Kimi): child updates carry their parent tool call; each becomes a spawned thread. A call that
  // launches several (Kimi's AgentSwarm) gives each its own key and names every one as a receiver.
  function childUpdate(thread, { parentToolCallId, label, key = parentToolCallId, background = false, prompt = null }, update) {
    let child = thread.children.get(key)
    if (!child) {
      const id = `${thread.id}~${key.replace(/[^A-Za-z0-9._-]/g, '_')}`
      child = { id, projector: new ThreadProjector({ threadId: id, cwd: thread.cwd, classify: (call) => adapter.classify?.(call, ctx) ?? null, commandResult: adapter.commandResult }), label, parentToolCallId, background, createdAt: Date.now() }
      thread.children.set(key, child)
      store.update(id, { cwd: thread.cwd, parentThreadId: thread.id, agentLabel: label, createdAt: child.createdAt, subagent: true })
      notify('thread/started', { thread: threadObject(id, { child, parent: thread }) })
      const opened = []
      child.projector.startTurn({ time: Date.now(), input: typeof prompt === 'string' && prompt ? [{ type: 'text', text: prompt, text_elements: [] }] : null }, opened)
      emit(opened)
      // The parent's collab item now names its receiver (in whichever turn holds it: a background one outlives its turn,
      // and its agent may start only after that turn ended, when the projector no longer holds the call).
      let entry = thread.projector.calls.get(parentToolCallId)
      let turn = entry?.item.type === 'collabAgentToolCall' ? thread.projector.turns.find((candidate) => candidate.items.some((item) => item.id === entry.item.id)) ?? thread.projector.current : null
      if (!entry) {
        turn = thread.projector.turns.findLast((candidate) => candidate.items.some((item) => item.id === parentToolCallId && item.type === 'collabAgentToolCall')) ?? null
        const item = turn?.items.find((candidate) => candidate.id === parentToolCallId)
        entry = item ? { item } : null
      }
      if (turn) {
        const receivers = [...new Set([...(entry.item.receiverThreadIds ?? []), id])]
        entry.item = { ...entry.item, receiverThreadIds: receivers, agentsStates: { ...entry.item.agentsStates, [id]: { status: 'running', message: null } } }
        thread.projector.replaceItem(turn, entry.item)
        const started = entry.item.status === 'inProgress'
        notify(started ? 'item/started' : 'item/completed', { item: entry.item, threadId: thread.id, turnId: turn.id, ...(started ? { startedAtMs: Date.now() } : { completedAtMs: Date.now() }) })
        // A turn already saved keeps the child it now names when the session is reopened.
        if (turn.status !== 'inProgress') { try { thread.save() } catch (error) { log(`history: ${error?.message ?? error}`) } }
      }
    }
    emit(child.projector.apply(update))
  }

  /** Ends the child threads of a launching call (or one of them, by key); foregroundOnly leaves background ones running. */
  function finishChild(thread, parentToolCallId, failed, { key = null, foregroundOnly = false } = {}) {
    for (const [childKey, child] of thread.children) {
      if (key ? childKey !== key : child.parentToolCallId !== parentToolCallId) continue
      if (!child.projector.activeTurn || (foregroundOnly && (child.background || child.fromLog))) continue
      emit(child.projector.completeTurn({ status: failed ? 'failed' : 'completed' }))
      notify('thread/status/changed', { threadId: child.id, status: { type: 'idle' } })
      store.writeHistory(child.id, { turns: child.projector.persist() })
    }
  }

  /** Polls the agent's sub-agent logs (adapter.childLogUpdates) while a launch runs or a sub-agent has not ended. */
  function watchChildLogs(thread) {
    if (!adapter.childLogUpdates || thread.childLogTimer) return
    thread.childLogTimer = setInterval(() => drainChildLogs(thread), 300)
    thread.childLogTimer.unref?.()
  }

  function drainChildLogs(thread, closing = null) {
    let result = null
    try { result = adapter.childLogUpdates(ctx, thread, { closing }) } catch (error) { log(`sub-agent logs: ${error?.message ?? error}`) }
    const now = Date.now()
    if (result?.events?.length || thread.childLogActiveAt === undefined) thread.childLogActiveAt = now
    for (const event of result?.events ?? []) {
      if (event.update) {
        childUpdate(thread, event, event.update)
        const child = thread.children.get(event.key ?? event.parentToolCallId)
        if (child) child.fromLog = true
      } else if (event.done) finishChild(thread, event.parentToolCallId, event.failed === true, { key: event.key })
    }
    // A foreground child whose log never records its end (15 s after its call returned) ends with the call.
    for (const [key, child] of thread.children) if (child.fromLog && !child.background && child.parentDoneAt && now - child.parentDoneAt > 15000) finishChild(thread, child.parentToolCallId, false, { key })
    // Nothing left to follow, the logs silent for 10 minutes, or the process (and its sub-agents) gone: the rest ends here.
    const gone = !thread.host || thread.host.exited
    if (result?.pending && !gone && now - thread.childLogActiveAt < 600000) return
    if (thread.childLogTimer) { clearInterval(thread.childLogTimer); thread.childLogTimer = null }
    thread.childLogActiveAt = undefined
    for (const [key, child] of thread.children) if (child.fromLog && child.projector.activeTurn && (gone || result?.pending)) finishChild(thread, child.parentToolCallId, false, { key })
  }

  // ------------------------------------------------------------ approvals

  /**
   * One server → client request owned by a thread (holds its waiting status; dropped on abort). detach() moves it out of
   * its turn: the same card asked again under no turn (the client expires a turn's requests when the turn completes),
   * the old request resolved, the waiter answered by the new one; a detached card no longer makes the thread active.
   */
  async function clientRequest(thread, method, params, flag, toolCallId) {
    let request = transport.request(method, params)
    let settled = false
    let wake = null
    const entry = {
      flag, toolCallId, turnId: typeof params?.turnId === 'string' ? params.turnId : null, detached: false,
      abort: (why = 'cancelled') => {
        if (settled) return
        settled = true
        transport.abandon(request.id, why)
        notify('serverRequest/resolved', { threadId: thread.id, requestId: request.id })
      },
      detach: () => {
        if (settled || entry.detached) return
        const old = request
        entry.detached = true
        thread.pending.delete(old.id)
        request = transport.request(method, { ...params, turnId: '' })
        thread.pending.set(request.id, entry)
        transport.abandon(old.id, 'moved')
        notify('serverRequest/resolved', { threadId: thread.id, requestId: old.id })
        wake?.()
      },
    }
    thread.pending.set(request.id, entry)
    thread.publishStatus()
    try {
      for (;;) {
        const current = request
        const moved = new Promise((resolve) => { wake = () => resolve(null) })
        const outcome = await Promise.race([current.promise.then((value) => ({ value }), (error) => ({ error })), moved])
        if (current !== request) continue
        if (outcome?.error) throw outcome.error
        settled = true
        return outcome?.value
      }
    } finally {
      thread.pending.delete(request.id)
      thread.publishStatus()
    }
  }

  async function onPermission(thread, params) {
    // An approval for a turn the agent started on its own: that turn is opened first (its log already has it).
    if (adapter.agentTurnLog && !thread.prompt && !thread.agentTurn) pollAgentTurns(thread)
    let toolCall = params?.toolCall ?? {}
    const options = params?.options ?? []
    const notes = []
    // MiniMax asks under its own request id: the running call with the same tool and arguments is the one.
    if (toolCall.toolCallId && !thread.projector.calls.has(toolCall.toolCallId) && toolCall.rawInput) {
      const same = [...thread.projector.calls.values()].reverse().find((entry) => entry.item.status === 'inProgress' && (entry.call.name ?? entry.call.title) === (toolCall.name ?? toolCall.title) && JSON.stringify(entry.call.rawInput) === JSON.stringify(toolCall.rawInput))
      if (same) toolCall = { ...toolCall, toolCallId: same.call.toolCallId }
    }
    // A sub-agent's call the main stream never showed (Kimi: only the tool's name, no arguments): its call, from the
    // sub-agent's own records, is what the card shows, the agent's guard checks and the mode decides on, and the card
    // belongs to the child thread's item (not a bare row in the parent). Unknown arguments are never approved silently.
    let child = null
    let subagentAction = null
    let unresolved = false
    if (adapter.subagentApproval && toolCall.toolCallId && !thread.projector.calls.has(toolCall.toolCallId) && !toolCall.rawInput) {
      if (adapter.childLogUpdates) drainChildLogs(thread)
      let found = null
      try { found = await adapter.subagentApproval(ctx, thread, toolCall, { drain: adapter.childLogUpdates ? () => drainChildLogs(thread) : null }) } catch (error) { log(`sub-agent approval: ${error?.message ?? error}`) }
      if (found?.call) {
        subagentAction = found.action || null
        if (found.child) {
          childUpdate(thread, found.child, { sessionUpdate: 'tool_call', ...found.call, status: 'pending' })
          child = thread.children.get(found.child.key) ?? null
          if (child) child.fromLog = true
        }
        toolCall = child ? { ...found.call, ...(toolCall._meta ? { _meta: toolCall._meta } : {}) } : { ...toolCall, ...found.call }
      } else unresolved = true
    }
    const projector = child?.projector ?? thread.projector
    const known = projector.calls.get(toolCall.toolCallId)
    // The title the call showed before the request (Kimi titles a call by what it does; its request names the tool).
    const shownTitle = subagentAction ?? known?.call?.title ?? null
    const call = { ...known?.call, ...Object.fromEntries(Object.entries(toolCall).filter(([, value]) => value !== undefined && value !== null)) }
    // Kimi streams the arguments as JSON text before it sends rawInput (after the permission answer).
    if (!call.rawInput) {
      for (const source of [known?.call?.content, toolCall.content]) {
        try {
          const parsed = JSON.parse(blockText(source))
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) { call.rawInput = parsed; break }
        } catch {}
      }
    }
    const kind = call.kind ?? 'other'
    // Questions and plan reviews reach the user whatever the mode.
    const questions = adapter.questions?.(params)
    if (questions) return askQuestions(thread, params, questions)
    const plan = adapter.planExit?.(params, { ctx, thread }) ?? genericPlanExit(params, call)
    if (plan) return reviewPlan(thread, params, plan, call)
    // The agent switching itself into plan mode (Kimi's EnterPlanMode, Gemini's enter_plan_mode): read-only, so it is
    // allowed, but the session follows it into Plan (agentEnteredPlan) so the app's picker shows it and leaving it later
    // goes through the plan card, instead of the agent staying in plan mode behind an 'Auto' picker.
    if (entersPlanMode(call)) {
      // readOnly: nobody could review the plan it would end with, so it keeps working in the mode it has.
      if (thread.permission.mode === 'readOnly') {
        emit(projector.declineCall(call.toolCallId))
        return selected(optionFor(options, 'reject_once', 'reject_always'))
      }
      if (!isReadOnlyMode(thread.permission.mode)) agentEnteredPlan(thread)
      return selected(optionFor(options, 'allow_once', 'allow_always'))
    }
    // An agent inside a running workflow asks (Qwen: _meta.workflowApproval, toolCallId workflow:<session>:<run>:<id>):
    // its card shows the call, but no row joins the parent turn (the run's agents are in its workflow card).
    const fromWorkflow = toolCall?._meta?.workflowApproval === true || /^workflow:/.test(String(toolCall?.toolCallId ?? ''))
    const detached = fromWorkflow && !projector.calls.has(call.toolCallId)
    // A request outside any turn (the agent working on its own: MiniMax's background-task follow-up) opens an agent turn
    // that closes once the agent goes quiet, or that the agent's log adopts (agentTurnLog): never a turn left open.
    if (!detached && !child && !thread.prompt && !thread.agentTurn && !thread.projector.activeTurn && startAgentTurn(thread, { idleClose: true })) {
      thread.agentTurn.adopt = Boolean(adapter.agentTurnLog)
      armAgentTurnClose(thread, false)
    }
    const item = detached ? projector.detachedItem(call) : projector.itemForPermission(call, notes)
    emit(notes)
    // OpenClaude Desktop's own tools need no card here: the app asks the user itself where it matters (as for Codex).
    if (appTools && item?.type === 'mcpToolCall' && item.server === appTools.name) return selected(optionFor(options, 'allow_once', 'allow_always'))
    const paths = pathsOf(call, thread.cwd)
    const roots = [thread.cwd, ...(thread.permission.writableRoots ?? [])]
    // No standing grant is offered or honoured in a read-only mode (decide ignores one there too).
    // No standing grant where the agent's policy removes 'always allow' (Gemini's disableAlwaysAllow / secure mode).
    let noGrants = false
    try { noGrants = adapter.policy?.(ctx)?.disableAlwaysAllow === true } catch {}
    // What the agent itself would still ask about in its own closest mode (Kimi's user 'ask' rules, dangerous-command
    // guard, sensitive files, .git): never approved silently outside Bypass. `always` (the dangerous-command guard)
    // also ignores and offers no session grant, as the agent asks about it every time.
    let mustAsk = null
    // adapter.mustAskInBypass: an agent rule that asks even in the agent's own YOLO (Gemini's user / admin ask_user policies)
    // is asked about in Bypass too.
    if (adapter.mustAsk && (thread.permission.mode !== 'bypass' || adapter.mustAskInBypass)) {
      try { mustAsk = adapter.mustAsk(ctx, { call, tool: String(toolCall.title ?? call.title ?? ''), title: shownTitle, paths, cwd: thread.cwd, mode: thread.permission.mode }) ?? null } catch (error) { log(`must ask: ${error?.message ?? error}`) }
    }
    const offer = isReadOnlyMode(thread.permission.mode) || noGrants || mustAsk?.always ? { key: null, grantable: false } : thread.grants.offer(call, { cwd: thread.cwd, roots })
    const granted = offer.key !== null && thread.grants.keys.has(offer.key)
    let verdict = decide({ mode: thread.permission.mode, kind, paths, roots, sandboxed: thread.sandboxed, granted })
    if (verdict === 'allow' && mustAsk && !granted) verdict = 'ask'
    // A sub-agent's call whose arguments could not be told: asked about outside Bypass, never run blind.
    if (verdict === 'allow' && unresolved && thread.permission.mode !== 'bypass') verdict = 'ask'
    // readOnly: nobody can answer a card (the agent's own asks included), so it is refused.
    if (verdict === 'ask' && thread.permission.mode === 'readOnly') verdict = 'deny'
    if (verdict === 'allow') {
      if (kind === 'edit' || kind === 'delete' || kind === 'move') for (const file of paths) thread.approvedPaths.add(realPath(file))
      return selected(optionFor(options, 'allow_once', 'allow_always'))
    }
    if (verdict === 'deny') {
      emit(projector.declineCall(call.toolCallId))
      return selected(optionFor(options, 'reject_once', 'reject_always'))
    }
    const owner = child ?? thread
    const turnId = projector.activeTurn?.id ?? thread.projector.activeTurn?.id ?? ''
    const reason = mustAsk?.reason ? mustAsk.reason : fromWorkflow ? 'An agent in a running workflow asks to run this.' : thread.permission.mode === 'ask' ? 'Ask permissions mode is on.' : paths.length && !insideRoots(paths, roots) ? 'This changes files outside the session folders.' : `${adapter.name} asks to run this.`
    let method, request
    if (item?.type === 'fileChange') {
      method = 'item/fileChange/requestApproval'
      request = { threadId: owner.id, turnId, itemId: item.id, startedAtMs: Date.now(), reason, grantRoot: null, sessionGrantable: offer.grantable, ...(detached ? { changes: item.changes } : {}) }
    } else {
      // adapter.approvalTool: a call the app has its own card for (Qwen's workflow: "Run a dynamic workflow?" with its
      // name, description and phases), read from codeDesktop.agentTool instead of a raw command line.
      let agentTool = null
      try { agentTool = adapter.approvalTool?.(call) ?? null } catch (error) { log(`approval card: ${error?.message ?? error}`) }
      const command = item?.type === 'commandExecution' ? item.command : agentTool ? String(call.title ?? agentTool.name ?? 'workflow') : `${call.title ?? item?.tool ?? 'tool'}${call.rawInput ? ` ${JSON.stringify(call.rawInput).slice(0, 400)}` : ''}`
      method = 'item/commandExecution/requestApproval'
      request = { kind: 'command', threadId: owner.id, turnId, itemId: item?.id ?? call.toolCallId, startedAtMs: Date.now(), approvalId: null, environmentId: null, reason, command, cwd: item?.cwd ?? thread.cwd, commandActions: item?.commandActions ?? [{ type: 'unknown', command }], sessionGrantable: offer.grantable,
        ...(agentTool ? { codeDesktop: { agentTool } } : {}) }
    }
    const epoch = thread.grantEpoch
    let result
    try {
      result = await clientRequest(thread, method, request, 'waitingOnApproval', call.toolCallId)
    } catch {
      return { outcome: { outcome: 'cancelled' } }
    }
    const answer = outcomeForDecision(result?.decision, options)
    // A grant counts only where the card offered one, and only if the mode did not change while it was open.
    if (answer.grant && offer.grantable && offer.key !== null && thread.grantEpoch === epoch && !isReadOnlyMode(thread.permission.mode)) thread.grants.keys.add(offer.key)
    if (answer.allowed && (kind === 'edit' || kind === 'delete' || kind === 'move')) for (const file of paths) thread.approvedPaths.add(realPath(file))
    if (!answer.allowed) emit(projector.declineCall(call.toolCallId))
    if (answer.interrupt) queueMicrotask(() => interrupt(thread))
    return answer.outcome
  }

  /**
   * ACP elicitation/create (form mode: MiniMax's questionnaires, its plan review included) → Codex
   * item/tool/requestUserInput. A pending plan (plan_update) turns it into the plan card.
   */
  async function onElicitation(thread, params) {
    if (adapter.agentTurnLog && !thread.prompt && !thread.agentTurn) pollAgentTurns(thread)
    const schema = params?.requestedSchema ?? {}
    const properties = Object.entries(schema.properties ?? {})
    const otherFor = new Map()
    for (const [key, prop] of properties) if (/ — Other$/.test(prop?.title ?? '')) otherFor.set(prop.title.replace(/ — Other$/, ''), key)
    const fields = properties.filter(([key]) => ![...otherFor.values()].includes(key))
    const optionsOf = (prop) => (prop?.oneOf ?? prop?.items?.anyOf ?? prop?.items?.oneOf ?? (Array.isArray(prop?.items?.enum) ? prop.items.enum.map((value) => ({ const: value, title: String(value) })) : null) ?? (Array.isArray(prop?.enum) ? prop.enum.map((value) => ({ const: value, title: String(value) })) : []))
      .map((option) => ({ value: option.const ?? option.title, label: String(option.title ?? option.const), description: typeof option.description === 'string' ? option.description : '' }))
    // MiniMax asks after its turn ended: the card belongs to the last turn (no new turn is opened).
    const turn = thread.projector.activeTurn ?? thread.projector.turns.at(-1) ?? thread.projector.ensureTurn([], Date.now())
    const plan = thread.pendingPlan
    if (plan && fields.length === 1) {
      const [key, prop] = fields[0]
      const options = optionsOf(prop)
      const approve = options.find((option) => /approve|accept|yes|implement|proceed|execute|start/i.test(option.label)) ?? options[0]
      const keep = options.find((option) => option !== approve && /revise|keep|no|continue planning|reject|change/i.test(option.label))
      let response
      try {
        response = await clientRequest(thread, 'item/tool/requestUserInput', {
          threadId: thread.id, turnId: turn.id, itemId: plan.itemId, isBlocking: true, autoResolutionMs: null,
          questions: [{ id: PLAN_REVIEW, header: 'Plan', question: 'Approve this plan?', isOther: true, isSecret: false, options: [{ label: 'Approve', description: approve?.label ?? '' }, { label: 'Keep planning', description: keep?.label ?? '' }], multiSelect: false }],
        }, 'waitingOnUserInput', plan.itemId)
      } catch {
        return { action: 'cancel' }
      }
      thread.pendingPlan = null
      const values = response?.answers?.[PLAN_REVIEW]?.answers ?? []
      if (values.length === 1 && values[0] === 'Approve' && approve) {
        leavePlanMode(thread, response)
        return { action: 'accept', content: { [key]: prop?.type === 'array' ? [approve.value] : approve.value } }
      }
      const feedback = values.filter((value) => value !== 'Keep planning').join('\n').trim()
      if (keep) return { action: 'accept', content: { [key]: prop?.type === 'array' ? [keep.value] : keep.value, ...(feedback && otherFor.get(prop?.title) ? { [otherFor.get(prop.title)]: feedback } : {}) } }
      return { action: 'decline' }
    }
    // A questionnaire (Kimi's AskUserQuestion, MiniMax's ask_user): every field is one question. Kimi titles a
    // field by its header and puts the question texts, one per line, in the message.
    const lines = String(params?.message ?? '').split('\n').map((line) => line.trim()).filter(Boolean)
    // MiniMax's ask_user (mcode tui/acp/interactions.ts questionnaireElicitation): each field's title is the whole
    // question, its description supporting text, and the message only the questionnaire's title (or the fixed 'MiniMax
    // Code needs your input'). Told by the adapter, or by every option field having its '<question> — Other' partner.
    const optionFields = fields.filter(([, prop]) => optionsOf(prop).length)
    const titled = adapter.elicitationTitles === true || (optionFields.length > 0 && optionFields.every(([, prop]) => otherFor.has(prop?.title)))
    const formTitle = titled && lines.length && !/^MiniMax Code needs your input$/i.test(lines.join(' ')) ? lines.join(' ') : ''
    const perLine = !titled && lines.length === fields.length && fields.length > 1
    const questions = fields.map(([key, prop], index) => {
      const title = String(prop?.title ?? '').trim()
      const description = String(prop?.description ?? '').trim()
      const text = titled
        ? [title || description || key, title && description && description !== title ? description : ''].filter(Boolean).join('\n\n')
        : (perLine ? lines[index] : fields.length === 1 && lines.length ? lines.join('\n') : '') || description || title || key
      const options = optionsOf(prop)
      // The header is a short label: the questionnaire's title on its first question (never the question cut short).
      const header = titled ? (index === 0 && formTitle && formTitle !== title ? formTitle.slice(0, 60) : '') : title && title !== text ? title.slice(0, 60) : ''
      return {
        id: key, header, question: text,
        // Free text only where the form takes it: a text field, or an option field with its own "Other" field.
        isOther: prop?.type !== 'boolean' && (!options.length || otherFor.has(prop?.title)), isSecret: false,
        options: options.map((option) => ({ label: option.label, description: option.description })), multiSelect: prop?.type === 'array',
      }
    })
    // The card belongs to the tool call that asked (Kimi names it), else a fresh item.
    const askedBy = typeof params?.toolCallId === 'string' ? thread.projector.calls.get(params.toolCallId)?.item?.id : null
    let response
    try {
      response = await clientRequest(thread, 'item/tool/requestUserInput', {
        threadId: thread.id, turnId: turn.id, itemId: askedBy ?? `elicitation-${randomUUID()}`, isBlocking: true, autoResolutionMs: null,
        questions: questions.map((question) => ({ ...question, options: question.options.length ? question.options : null })),
      }, 'waitingOnUserInput', params?.toolCallId ?? null)
    } catch {
      return { action: 'cancel' }
    }
    const content = {}
    for (const [key, prop] of fields) {
      const values = (response?.answers?.[key]?.answers ?? []).filter((value) => typeof value === 'string')
      const options = optionsOf(prop)
      const picked = values.map((value) => options.find((option) => option.label === value)?.value).filter((value) => value !== undefined)
      const other = values.filter((value) => !options.some((option) => option.label === value)).join('\n').trim()
      if (prop?.type === 'array') { if (picked.length) content[key] = picked }
      else if (picked.length) content[key] = picked[0]
      else if (other && !options.length) content[key] = other
      if (other && options.length && otherFor.get(prop?.title)) content[otherFor.get(prop.title)] = other
    }
    return Object.keys(content).length ? { action: 'accept', content } : { action: 'decline' }
  }

  /**
   * An exit-plan-mode permission request. Kimi offers one allow option per approach its plan names
   * (plan_opt_<i>, ExitPlanMode's `options` with their descriptions in rawInput) plus plan_revise and
   * plan_reject_and_exit: every approach is kept, so the user picks the one to implement.
   */
  function genericPlanExit(params, merged = null) {
    // The arguments may only be known from the call's streamed JSON (Kimi sends rawInput after the answer): `merged`.
    const call = { ...params?.toolCall, ...(merged?.rawInput ? { rawInput: merged.rawInput } : {}) }
    const options = params?.options ?? []
    const ids = options.map((option) => option.optionId)
    const name = String(call._meta?.toolName ?? call.name ?? call.title ?? '')
    if (call.kind === 'switch_mode' || /exit_?plan_?mode|ExitPlanMode/i.test(name) || ids.includes('plan_approve') || ids.some((id) => /^plan_opt_/.test(id))) {
      const described = Array.isArray(call.rawInput?.options) ? call.rawInput.options : []
      const approaches = options.flatMap((option) => {
        const index = /^plan_opt_(\d+)$/.exec(String(option.optionId ?? ''))?.[1]
        if (index === undefined) return []
        const source = described[Number(index)]
        const label = String(option.name ?? source?.label ?? `Approach ${Number(index) + 1}`).trim()
        const description = typeof source?.description === 'string' ? source.description.trim() : ''
        return label ? [{ optionId: option.optionId, label, description }] : []
      })
      const approve = ids.includes('plan_approve') ? 'plan_approve' : approaches[0]?.optionId ?? optionFor(options, 'allow_once', 'allow_always')?.optionId
      const reject = ids.includes('plan_revise') ? 'plan_revise' : optionFor(options, 'reject_once', 'reject_always')?.optionId
      return {
        plan: typeof call.rawInput?.plan === 'string' ? call.rawInput.plan : null, approveOption: approve, rejectOption: reject,
        exitOption: ids.includes('plan_reject_and_exit') ? 'plan_reject_and_exit' : null,
        approaches: approaches.length >= 2 ? approaches : [],
      }
    }
    return null
  }

  /** The agent's goal (adapter filterUpdate goal): Codex's thread/goal/updated, or thread/goal/cleared for none. */
  function applyGoal(thread, goal) {
    const had = Boolean(thread.goal)
    thread.goal = goal ? { ...goal, threadId: thread.id } : null
    if (thread.goal) notify('thread/goal/updated', { threadId: thread.id, turnId: thread.projector.activeTurn?.id ?? null, goal: thread.goal })
    else if (had) notify('thread/goal/cleared', { threadId: thread.id })
  }

  /** A tool call that puts the agent into its plan mode. */
  function entersPlanMode(call) {
    if (!adapter.modeIds?.plan) return false
    return [call?.name, call?.title, call?._meta?.toolName, String(call?.toolCallId ?? '').split(/__|-|:/)[0]]
      .some((value) => typeof value === 'string' && /^(?:EnterPlanMode|enter_plan_mode)$/i.test(value.trim()))
  }
  /**
   * The agent entered plan mode by itself while the session was not read-only: the session goes to Plan (read-only,
   * the mode it was in becomes the after-plan mode) and the app is told (codeDesktop/thread/mode), so its picker shows
   * Plan, the next turn is sent as Plan, and the plan card's approval later leaves it.
   */
  function agentEnteredPlan(thread) {
    const previous = thread.permission.mode
    setPermission(thread, { ...thread.permission, mode: 'plan', afterPlan: ['auto', 'ask', 'acceptEdits', 'bypass'].includes(previous) ? previous : thread.permission.afterPlan ?? 'auto', sandbox: 'read-only' })
    thread.acp.mode = adapter.modeIds.plan
    thread.remember()
    notify('codeDesktop/thread/mode', { threadId: thread.id, permission: 'plan', afterPlan: thread.permission.afterPlan })
  }

  /** The plan's own text: the agent's framing (Kimi's "Plan saved to: …" and "Requesting approval to …") removed. */
  function planTextOf(plan, call) {
    const text = plan.plan ?? blockText(call.content) ?? ''
    return (adapter.planText ? adapter.planText(text) : text) ?? text
  }

  /**
   * The thread leaves Plan mode for the mode the plan card chose (or the thread's after-plan mode). A thread that
   * was not in Plan (the agent planned on its own, e.g. Gemini's enter_plan_mode in Auto or Bypass) keeps its mode,
   * as the app's picker does (main.jsx respondApproval changes it only from Plan): Bypass stays Bypass.
   */
  function leavePlanMode(thread, response) {
    const chosen = response?.codeDesktop?.afterPlan
    if (thread.permission.mode === 'plan') setPermission(thread, afterPlanPermission(planTargetOf(chosen, thread.permission.afterPlan), thread.permission))
    thread.remember()
    // The plan runs in the agent's asking mode; the process sandbox follows at the next turn.
    thread.acp.mode = null
    queueMicrotask(() => void applyAgentMode(thread))
  }

  const PLAN_APPROACH = 'plan-approach'
  const PLAN_LEAVE = 'Leave Plan mode without implementing'

  /** A plan review: the plan item, then OpenClaude Desktop's plan card (question id 'plan-review'). */
  async function reviewPlan(thread, params, plan, call) {
    const turn = thread.projector.activeTurn ?? thread.projector.ensureTurn([], Date.now())
    const text = planTextOf(plan, call)
    const itemId = `plan-${call.toolCallId ?? randomUUID()}`
    if (text) {
      const notes = []
      thread.projector.pushItem(notes, turn, { type: 'plan', id: itemId, text }, Date.now())
      emit(notes)
    }
    const approaches = plan.approaches ?? []
    let response
    try {
      response = await clientRequest(thread, 'item/tool/requestUserInput', {
        threadId: thread.id, turnId: turn.id, itemId, isBlocking: true, autoResolutionMs: null,
        questions: [{ id: PLAN_REVIEW, header: 'Plan', question: 'Approve this plan?', isOther: true, isSecret: false, options: [{ label: 'Approve', description: approaches.length ? `Choose which of the ${approaches.length} approaches to implement next.` : 'Start implementing the plan.' }, { label: 'Keep planning', description: 'Stay in Plan mode.' }], multiSelect: false }],
      }, 'waitingOnUserInput', call.toolCallId)
    } catch {
      return { outcome: { outcome: 'cancelled' } }
    }
    const values = response?.answers?.[PLAN_REVIEW]?.answers ?? []
    if (values.length === 1 && values[0] === 'Approve') {
      let optionId = plan.approveOption
      // Several approaches: the plan card approves leaving Plan mode, then the user picks the approach to implement.
      if (approaches.length) {
        let picked
        try {
          picked = await clientRequest(thread, 'item/tool/requestUserInput', {
            threadId: thread.id, turnId: turn.id, itemId, isBlocking: true, autoResolutionMs: null,
            questions: [{
              id: PLAN_APPROACH, header: 'Approach', question: `Which approach should ${adapter.name} implement?`, isOther: false, isSecret: false, multiSelect: false,
              options: [...approaches.map((approach) => ({ label: approach.label, description: approach.description })), ...(plan.exitOption ? [{ label: PLAN_LEAVE, description: `${adapter.name} leaves Plan mode and implements nothing.` }] : [])],
            }],
          }, 'waitingOnUserInput', call.toolCallId)
        } catch {
          return { outcome: { outcome: 'cancelled' } }
        }
        const label = picked?.answers?.[PLAN_APPROACH]?.answers?.[0]
        if (label === PLAN_LEAVE && plan.exitOption) {
          leavePlanMode(thread, response)
          return { outcome: { outcome: 'selected', optionId: plan.exitOption } }
        }
        const approach = approaches.find((entry) => entry.label === label)
        if (!approach) return plan.rejectOption ? { outcome: { outcome: 'selected', optionId: plan.rejectOption } } : { outcome: { outcome: 'cancelled' } }
        optionId = approach.optionId
      }
      leavePlanMode(thread, response)
      return { outcome: { outcome: 'selected', optionId } }
    }
    const feedback = values.filter((value) => value !== 'Keep planning').join('\n').trim()
    if (feedback) thread.queue.push({ id: randomUUID(), input: [{ type: 'text', text: feedback, text_elements: [] }], clientUserMessageId: null })
    return plan.rejectOption ? { outcome: { outcome: 'selected', optionId: plan.rejectOption } } : { outcome: { outcome: 'cancelled' } }
  }

  async function askQuestions(thread, params, { questions, answer }) {
    const notes = []
    const item = thread.projector.itemForPermission(params.toolCall ?? {}, notes)
    emit(notes)
    let response
    try {
      response = await clientRequest(thread, 'item/tool/requestUserInput', {
        threadId: thread.id, turnId: thread.projector.activeTurn?.id ?? '', itemId: item?.id ?? params.toolCall?.toolCallId ?? '', isBlocking: true, autoResolutionMs: null,
        questions: questions.map((question) => ({ id: question.id, header: question.header ?? '', question: question.question, isOther: question.isOther !== false, isSecret: false, options: question.options ?? null, multiSelect: question.multiSelect === true })),
      }, 'waitingOnUserInput', params.toolCall?.toolCallId)
    } catch {
      return { outcome: { outcome: 'cancelled' } }
    }
    return answer(questions, response)
  }

  // ------------------------------------------------------------ turns

  /**
   * A review the agent runs as a command of its own (adapter.reviewRun → {args}): in the thread's home and environment,
   * inside the read-only sandbox, stopped with the turn. adapter.reviewOutput turns its output into the reply.
   */
  function agentReview(thread, own, state) {
    const config = launchConfig(thread)
    const launch = adapter.launch(ctx, config)
    const wrapped = wrapLaunch(commandLine(program, own.args), { profile: sandboxFor('plan'), writable: config.writable, agentPaths: [...adapter.agentPaths(agentEnv), stateDir, config.threadDir], profileFile: path.join(config.threadDir, 'review.sb'), ...sandboxExtras() })
    return new Promise((resolve, reject) => {
      const child = spawn(wrapped.command, wrapped.args, { env: { ...agentEnv, ...launch.env }, cwd: thread.cwd, stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', (chunk) => { stdout += chunk })
      child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8000) })
      const timer = setInterval(() => { if (state.cancelled && child.exitCode === null) child.kill('SIGTERM') }, 250)
      child.on('error', (error) => { clearInterval(timer); reject(error) })
      child.on('exit', (code) => {
        clearInterval(timer)
        if (state.cancelled) { resolve(''); return }
        try { resolve(adapter.reviewOutput(stdout, stderr, code)) } catch (error) { reject(error) }
      })
    })
  }

  /**
   * A review turn runs read-only whatever the session's mode (the app's Review dialog says so: capabilities.reviewReadOnly):
   * the bridge's 'review' mode (the agent's plan mode, edits refused, a read-only sandbox) for the turn, then the
   * session's own permission again, unless it changed meanwhile. An agent's own review run (local) has its own sandbox.
   */
  /** The adapter's out-of-band turn events (turnEvents): each model retry as Codex's error notice with willRetry. */
  function publishTurnEvents(thread, state) {
    if (thread.prompt !== state || state.cancelled) return
    let events = []
    try { events = adapter.turnEvents(ctx, thread) ?? [] } catch (error) { log(`turn events: ${error?.message ?? error}`) }
    for (const event of events) {
      if (!event?.retry) continue
      notify('error', { error: { message: `${adapter.name}: ${event.error?.message ?? 'The model request failed.'}`, codexErrorInfo: event.error?.codexErrorInfo ?? null, additionalDetails: null }, willRetry: true, threadId: thread.id, turnId: state.turnId, retry: event.retry })
    }
  }

  async function runTurn(thread, options) {
    const previous = options.review && !options.local && !isReadOnlyMode(thread.permission.mode) ? thread.permission : null
    if (!previous) return runTurnBody(thread, options)
    setPermission(thread, { ...previous, mode: 'review', sandbox: 'read-only' })
    const review = thread.permission
    try {
      return await runTurnBody(thread, options)
    } finally {
      if (thread.permission === review) setPermission(thread, previous)
    }
  }

  async function runTurnBody(thread, { input, turnId, clientId = null, compaction = false, review = false, prompt: promptOverride, local = null, continuation = false }) {
    void review
    // continuation: the agent's own resume of the last turn (adapter.continueMeta on an empty prompt), no user message.
    const turn = thread.projector.startTurn({ id: turnId, input: compaction || continuation ? null : input, clientId, synthetic: compaction || continuation })
    const notes0 = []
    // The startTurn notes are emitted by the caller ordering below.
    notify('turn/started', { threadId: thread.id, turn: thread.projector.snapshot(turn) })
    const user = turn.items.find((item) => item.type === 'userMessage')
    if (user) {
      notify('item/started', { item: user, threadId: thread.id, turnId: turn.id, startedAtMs: turn.startedAtMs })
      notify('item/completed', { item: user, threadId: thread.id, turnId: turn.id, completedAtMs: turn.startedAtMs })
    }
    void notes0
    thread.usage.turn = null
    thread.compaction = compaction ? { text: '', itemId: `compaction-${randomUUID()}` } : null
    if (compaction) {
      const item = { type: 'contextCompaction', id: thread.compaction.itemId }
      turn.items.push(item)
      notify('item/started', { item, threadId: thread.id, turnId: turn.id, startedAtMs: Date.now() })
    }
    const state = { turnId: turn.id, cancelled: false, startedAtMs: turn.startedAtMs }
    thread.prompt = state
    thread.publishStatus()
    thread.remember({ lastPromptAt: Date.now(), preview: thread.meta.preview || inputText(input).slice(0, 200) })
    let result, failure
    let localReply = null
    let retries = null
    try {
      let host = await ensureHost(thread)
      thread.suppress = false
      // OpenClaude Desktop's tools, where the agent declares them only once their server has connected (awaitSessionTools).
      if (thread.toolsReady) { const ready = thread.toolsReady; thread.toolsReady = null; await ready }
      // A model or effort picked since the session opened (the process stays up across turns).
      await applyModel(thread)
      await ensureModelApplied(thread)
      host = thread.host ?? host
      try { adapter.beforeTurn?.(ctx, thread) } catch (error) { log(`before turn: ${error?.message ?? error}`) }
      const capabilities = host.capabilities?.promptCapabilities ?? {}
      const expanded = local ? { reply: await local(state) } : promptOverride || continuation ? null : await expandCommand(thread, input)
      // A command the bridge answers itself (Gemini's /init when the project already has its GEMINI.md): no prompt.
      if (expanded && !Array.isArray(expanded) && typeof expanded.reply === 'string') localReply = expanded.reply
      const blocks = localReply !== null || continuation ? [] : promptOverride ? [{ type: 'text', text: promptOverride }]
        : restrictBlocks(await toAcpPrompt(expanded ?? input, { prompt: capabilities, skillPrompt: adapter.skillPrompt, imageLinks: adapter.images === 'path' ? { dir: path.join(store.threadDir(thread.id), 'images') } : null }), { image: capabilities.image === true, embeddedContext: capabilities.embeddedContext === true, resourceLink: adapter.resourceLinks !== false })
      // An agent that records its own model retries out of band (Kimi's turn.step.retrying): Codex retry notices
      // ('Retrying…' in the composer) while the prompt runs.
      if (adapter.turnEvents && localReply === null) retries = setInterval(() => publishTurnEvents(thread, state), 500)
      // An agent still winding down a stopped turn refuses a new prompt for a moment (MiniMax, Kimi): retry.
      for (let attempt = 0; localReply === null; attempt++) {
        try {
          result = await host.call('session/prompt', { sessionId: thread.id, prompt: blocks, ...(continuation && adapter.continueMeta ? { _meta: { ...adapter.continueMeta } } : {}) }, 0)
          break
        } catch (error) {
          if (attempt >= 30 || state.cancelled || !/active turn|agent_busy|already has an active|is busy|turn in progress/i.test(`${error?.message} ${JSON.stringify(error?.data ?? '')}`)) throw error
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      failure = error
    } finally {
      if (retries) { clearInterval(retries); retries = null }
    }
    // A compaction the agent runs in the background (Kimi's /compact answers at once): the turn, and its
    // compaction item, stay open until the agent reports the result (or the user stops it).
    const job = thread.compaction
    if (job?.background && !job.result && !failure && !state.cancelled && thread.prompt === state) {
      await new Promise((resolve) => {
        job.resolve = resolve
        setTimeout(resolve, COMPACTION_WAIT_MS).unref?.()
      })
    }
    if (thread.prompt !== state) return
    // A /compact the agent answers in its reply (adapter.compactionResult: MiniMax's 'Compaction completed. Messages:
    // X → Y Tokens: A → B' or 'No compaction is needed…'): what it saved goes on the compaction item, the context left
    // to the usage meter; nothing compacted ends the turn with a note instead of a compaction marker.
    if (job && !job.result && !failure && !state.cancelled && adapter.compactionResult) {
      let outcome = null
      try { outcome = adapter.compactionResult(job.text) ?? null } catch (error) { log(`compaction result: ${error?.message ?? error}`) }
      if (outcome) {
        job.outcome = outcome
        if (Number.isFinite(outcome.tokensAfter) && outcome.tokensAfter >= 0) {
          thread.usage.contextUsed = outcome.tokensAfter
          thread.publishUsage(thread.projector.activeTurn?.id)
          thread.remember()
        }
      }
    }
    const stop = result?.stopReason
    // A workflow run's last registry read (updateWorkflow) lands before the turn completes (3 s at most).
    if (thread.workflowReads?.size) {
      await Promise.race([Promise.allSettled([...thread.workflowReads]), new Promise((resolve) => { const timer = setTimeout(resolve, 3000); timer.unref?.() })])
      if (thread.prompt !== state) return
    }
    // An agent that ends a failed turn as a plain end_turn (Kimi Code: the model error stays in its own session log),
    // also after the turn already ran tools: the adapter reads why (turnFailure), else an empty turn is reported failed.
    let silent = null
    if (!failure && localReply === null && !state.cancelled && adapter.silentFailures && stop === 'end_turn' && !promptOverride) {
      try { silent = (await adapter.turnFailure?.(ctx, thread)) ?? null } catch (error) { log(`turn failure: ${error?.message ?? error}`) }
      if (thread.prompt !== state) return
      // turnFailure may answer {notice} instead: the turn ended on purpose (a hook blocked it) and completes with that note.
    // silentFailures {message, quiet, afterTools}: the agent's own explanation (Gemini folds safety blocks, malformed
      // tool calls and empty replies into end_turn); quiet item types count as no reply (Gemini's thinking-only
      // response); afterTools is the note for a turn that ran tools but ended with no reply.
      const own = typeof adapter.silentFailures === 'object' ? adapter.silentFailures : {}
      const quiet = new Set(['userMessage', ...(own.quiet ?? [])])
      const items = thread.projector.activeTurn?.items ?? []
      if (!silent && !items.some((item) => !quiet.has(item.type))) {
        silent = own.message
          ? { message: own.message, codexErrorInfo: null, additionalDetails: null, bare: true }
          : { message: 'ended the turn without a reply: the model request most likely failed. Its session log has the details.', codexErrorInfo: null, additionalDetails: null, bare: true }
      } else if (!silent && own.afterTools && !items.some((item) => item.type === 'agentMessage' && typeof item.text === 'string' && item.text.trim())) {
        thread.pendingNote = own.afterTools
      }
    }
    if (!failure && localReply !== null) {
      const turn = thread.projector.activeTurn
      if (turn) {
        const notes = []
        thread.projector.pushItem(notes, turn, { type: 'agentMessage', id: thread.projector.nextId('msg'), text: localReply, phase: null, memoryCitation: null, delivery: null, questions: null })
        emit(notes)
      }
      finishTurn(thread, { status: state.cancelled ? 'interrupted' : 'completed', error: null, result: null })
    } else if (!failure && !state.cancelled && job?.result?.phase === 'failed') {
      finishTurn(thread, { status: 'failed', error: { message: `${adapter.name}: ${job.result.message || 'The compaction failed.'}`, codexErrorInfo: null, additionalDetails: null }, result })
    } else if (!failure && job?.result?.phase === 'cancelled') {
      finishTurn(thread, { status: 'interrupted', error: null, result })
    } else if (failure) {
      const message = failure instanceof RpcError ? failure.message : String(failure?.message ?? failure)
      const auth = /auth/i.test(message)
      // A plan quota that ran out (Gemini's RESOURCE_EXHAUSTED / TerminalQuotaError, any 'quota exceeded'): Codex's
      // usage-limit error, so the card says so and offers the Usage page instead of a generic failure.
      const quota = !auth && /RESOURCE_EXHAUSTED|TerminalQuotaError|quota (?:exceeded|exhausted)|exceeded your (?:current )?(?:token )?quota|insufficient (?:account )?balance/i.test(message)
      // The agent's own wording first (adapter.errorInfo: Gemini rewrites its quota and 429 errors). An adapter may
      // answer {codexErrorInfo, message, additionalDetails}: MiniMax names its usage-limit and balance codes, and drops
      // its internal 'Runtime failed: BYOK provider …' wrapping from the message.
      const own = auth ? null : adapter.errorInfo?.(message, failure) ?? null
      const named = own && typeof own === 'object' ? own.codexErrorInfo ?? null : own
      const shown = own && typeof own === 'object' && typeof own.message === 'string' && own.message ? own.message : message
      const details = own && typeof own === 'object' && typeof own.additionalDetails === 'string' ? own.additionalDetails : failure?.data ? JSON.stringify(failure.data).slice(0, 500) : null
      finishTurn(thread, { status: state.cancelled ? 'interrupted' : 'failed', error: state.cancelled ? null : { message: namedMessage(shown), codexErrorInfo: auth ? 'unauthorized' : named ?? (quota ? 'usageLimitExceeded' : null), additionalDetails: details }, result })
    } else if (stop === 'cancelled' || state.cancelled) {
      finishTurn(thread, { status: 'interrupted', error: null, result })
    } else if (stop === 'refusal') {
      finishTurn(thread, { status: 'failed', error: { message: `${adapter.name} refused to continue this turn.`, codexErrorInfo: null, additionalDetails: null }, result })
    } else if (silent?.notice) {
      // Not a failure: the agent declined the message on purpose (Kimi: the user's own UserPromptSubmit hook blocked it).
      finishTurn(thread, { status: 'completed', error: null, result, note: silent.notice })
    } else if (silent) {
      finishTurn(thread, { status: 'failed', error: { message: `${adapter.name}${silent.bare ? ' ' : ': '}${silent.message}`, codexErrorInfo: silent.codexErrorInfo ?? null, additionalDetails: silent.additionalDetails ?? null }, result })
    } else if (adapter.stopReasons?.[stop]?.status === 'failed') {
      // The agent's own meaning for a stop reason (Gemini: max_tokens is a full context window, not a long reply).
      finishTurn(thread, { status: 'failed', error: { ...adapter.stopReasons[stop].error }, result })
    } else {
      const own = adapter.stopReasons?.[stop]?.note
      finishTurn(thread, { status: 'completed', error: null, result, note: own ?? (stop === 'max_tokens' ? 'The reply hit the output token limit.' : stop === 'max_turn_requests' ? 'The turn hit the agent\'s step limit.' : null) })
    }
  }

  /**
   * A custom command the agent's ACP mode does not run itself (Gemini's TOML commands): picked from the slash
   * menu (a skill part naming its file) or typed as "/name args", it becomes its expanded prompt. Other input
   * (files, images) stays.
   */
  async function expandCommand(thread, input) {
    if (!Array.isArray(input) || !input.length || !((adapter.commands && adapter.expandCommand) || adapter.mcpPrompts)) return null
    let commands = []
    if (adapter.commands && adapter.expandCommand) { try { commands = adapter.commands(ctx, thread.cwd) ?? [] } catch (error) { log(`commands: ${error?.message ?? error}`) } }
    // MCP prompt commands (adapter.mcpPrompts), read now when the typed name may be one of them.
    if (adapter.mcpPrompts && input.some((part) => (part?.type === 'text' && /^\s*\//.test(part.text ?? '')) || (part?.type === 'skill' && String(part.path ?? '').startsWith('mcp-prompt:')))) {
      commands = [...commands, ...(promptCommandCache.get(thread.cwd ?? '')?.commands?.length ? promptCommandsCached(thread.cwd) : await refreshPromptCommands(thread.cwd))]
    }
    if (!commands.length) return null
    let command = null
    let args = ''
    let rest = input
    const picked = input.find((part) => part?.type === 'skill' && typeof part.path === 'string' && commands.some((entry) => entry.file === part.path))
    if (picked) {
      command = commands.find((entry) => entry.file === picked.path)
      args = input.filter((part) => part?.type === 'text').map((part) => part.text).join(' ').trim()
      rest = input.filter((part) => part !== picked && part?.type !== 'text')
    } else {
      const first = input.find((part) => part?.type === 'text' && typeof part.text === 'string')
      const typed = first && !input.some((part) => part?.type === 'skill') ? /^\/(\S+)(?:\s+([\s\S]*))?$/.exec(first.text.trim()) : null
      command = typed ? commands.find((entry) => entry.name === typed[1]) ?? null : null
      if (command) {
        args = (typed[2] ?? '').trim()
        rest = input.filter((part) => part !== first)
      }
    }
    if (!command) return null
    const text = command.mcpPrompt ? await expandPromptCommand(thread, command, args) : await adapter.expandCommand(ctx, command, { args, cwd: thread.cwd, runShell: (line) => commandShell(thread, command, line) })
    // {reply}: the command needs no prompt (the bridge answers it).
    if (text && typeof text === 'object' && typeof text.reply === 'string') return text
    return [{ type: 'text', text, text_elements: [] }, ...rest]
  }

  /**
   * A shell step of a custom command (!{...}): shown as a command item, asked like any command in the thread's
   * mode, and run in the thread's sandbox. Its output joins the prompt.
   */
  async function commandShell(thread, command, line) {
    const turn = thread.projector.activeTurn
    const item = { type: 'commandExecution', id: `command-${randomUUID()}`, pluginId: null, scriptPath: null, command: line, cwd: thread.cwd, processId: null, source: 'agent', status: 'inProgress', commandActions: [{ type: 'unknown', command: line }], aggregatedOutput: null, exitCode: null, durationMs: null, shell: 'bash', description: `/${command.name}` }
    const settle = (patch) => {
      Object.assign(item, patch)
      if (turn) thread.projector.replaceItem(turn, { ...item })
      notify('item/completed', { item: { ...item }, threadId: thread.id, turnId: turn?.id ?? '', completedAtMs: Date.now() })
    }
    if (turn) {
      const notes = []
      thread.projector.pushItem(notes, turn, { ...item }, Date.now(), false)
      emit(notes)
    }
    const roots = [thread.cwd, ...(thread.permission.writableRoots ?? [])]
    const profile = sandboxFor(thread.permission.mode)
    const sandboxed = profile !== 'none' && sandboxAvailable()
    const verdict = decide({ mode: thread.permission.mode, kind: 'execute', paths: [], roots, sandboxed })
    if (verdict !== 'allow') {
      let answer = { allowed: false }
      if (verdict === 'ask') {
        try {
          const result = await clientRequest(thread, 'item/commandExecution/requestApproval', { kind: 'command', threadId: thread.id, turnId: turn?.id ?? '', itemId: item.id, startedAtMs: Date.now(), approvalId: null, environmentId: null, reason: `/${command.name} runs this command to write its prompt.`, command: line, cwd: thread.cwd, commandActions: item.commandActions, sessionGrantable: false }, 'waitingOnApproval', item.id)
          answer = outcomeForDecision(result?.decision, [])
        } catch {}
      }
      if (!answer.allowed) {
        settle({ status: 'declined' })
        throw new RpcError(INVALID_REQUEST, `/${command.name} was not run: its shell command was declined.`)
      }
    }
    const started = Date.now()
    const wrapped = wrapLaunch({ command: '/bin/sh', args: ['-c', line] }, { profile, writable: roots, agentPaths: [], profileFile: path.join(store.threadDir(thread.id), 'command.sb') })
    const result = await new Promise((resolve) => {
      let output = ''
      let child
      try { child = spawn(wrapped.command, wrapped.args, { cwd: thread.cwd, env: agentEnv, stdio: ['ignore', 'pipe', 'pipe'] }) } catch (error) { resolve({ output: String(error?.message ?? error), exitCode: 127 }); return }
      const take = (chunk) => { if (output.length < 256 * 1024) output += String(chunk) }
      child.stdout.on('data', take)
      child.stderr.on('data', take)
      const timer = setTimeout(() => child.kill('SIGTERM'), 120000)
      child.on('error', (error) => { clearTimeout(timer); resolve({ output: output + String(error?.message ?? error), exitCode: 127 }) })
      child.on('close', (code) => { clearTimeout(timer); resolve({ output, exitCode: code }) })
    })
    settle({ status: result.exitCode === 0 ? 'completed' : 'failed', aggregatedOutput: result.output, exitCode: result.exitCode, durationMs: Date.now() - started })
    return result
  }

  function finishTurn(thread, { status, error, result, note: turnNote }) {
    // An agent whose goal lives in its own session log (adapter.readGoal: Kimi's goal.* records): refreshed per turn.
    if (adapter.readGoal) {
      try {
        const goal = adapter.readGoal(ctx, thread)
        if (JSON.stringify(goal) !== JSON.stringify(thread.goal ? { ...thread.goal, threadId: undefined } : null) && (goal || thread.goal)) applyGoal(thread, goal)
      } catch (error) { log(`goal: ${error?.message ?? error}`) }
    }
    let note = turnNote
    const state = thread.prompt
    thread.prompt = null
    clearTimeout(thread.liveUsage?.timer)
    thread.liveUsage = null
    abortTurnRequests(thread, 'Turn ended.')
    fillTurnArguments(thread)
    const turn = thread.projector.activeTurn
    const turnId = turn?.id ?? state?.turnId
    if (thread.compaction) {
      const outcome = thread.compaction.outcome
      if (outcome?.phase === 'skipped' && turn && status === 'completed') {
        // Nothing was compacted: no compaction marker (the turn is read again when it completes), the agent's words instead.
        turn.items = turn.items.filter((entry) => entry.id !== thread.compaction.itemId)
        note ??= outcome.message || null
      } else {
        const item = { type: 'contextCompaction', id: thread.compaction.itemId, ...(outcome?.codeDesktop ? { codeDesktop: outcome.codeDesktop } : {}) }
        if (turn) thread.projector.replaceItem(turn, item)
        notify('item/completed', { item, threadId: thread.id, turnId, completedAtMs: Date.now() })
      }
      thread.compaction = null
    }
    // A one-time notice about the session (a restored conversation) rides on the next completed turn.
    if (!note && thread.pendingNote && turn && status === 'completed') { note = thread.pendingNote; thread.pendingNote = null }
    if (note && turn && status === 'completed') {
      const notes = []
      thread.projector.pushItem(notes, turn, { type: 'agentMessage', id: thread.projector.nextId('note'), text: `_${note}_`, phase: 'commentary', memoryCitation: null, delivery: null, questions: null })
      emit(notes)
    }
    if (error) notify('error', { error, willRetry: false, threadId: thread.id, turnId })
    // The workflow runner reads an agent's tokens the moment its turn completes (budget.spent(), the run's totals, the
    // task notification), from thread/tokenUsage/updated: there turn/completed waits until that went out, for an agent
    // whose usage is settled after the prompt returns (adapter.settleUsage: MiniMax, Kimi) and for one that reports it
    // with the prompt's answer (Gemini, Qwen) alike.
    const completion = thread.projector.completeTurn({ status, error })
    const holdCompletion = runnerRole
    if (!holdCompletion) emit(completion)
    // An agent with plan limits (Kimi, Gemini, MiniMax): the windows are read again after the turn (at once after a
    // limit error) and account/rateLimits/updated sent when they changed, as Codex does after every turn.
    if (adapter?.rateLimits) quotaWatch.turnCompleted({ error })
    // Steered messages the agent never pulled: a stopped turn discards them (the app hands them back to the composer);
    // otherwise they run next, ahead of the queue, as Codex runs its pending input.
    const unsent = (thread.steerBuffer ?? []).splice(0)
    if (unsent.length && status !== 'interrupted') {
      thread.queue.unshift(...unsent.map((entry) => ({ id: randomUUID(), input: entry.input, clientUserMessageId: entry.clientId })))
      notify('thread/queue/changed', { threadId: thread.id })
    }
    // Usage: the agent's turn totals (or what usage frames added up to) and its context fill.
    // Usage: the agent's turn totals (or what usage frames added up to) and its context fill. An agent that
    // writes its totals to its session log a moment after the prompt returns (Kimi) reports them via settleUsage.
    const toolCalls = turn ? turn.items.filter((item) => !['userMessage', 'agentMessage', 'reasoning', 'plan', 'contextCompaction'].includes(item.type)).length : 0
    const completedAtMs = Date.now()
    const recordUsage = (reported) => {
      const turnUsage = normalizeUsage(reported?.usage) ?? thread.usage.turn
      if (turnUsage) {
        thread.usage.total = addUsage(thread.usage.total, turnUsage)
        thread.usage.last = { ...addUsage(null, turnUsage) }
      }
      const model = reported?.model ?? thread.model ?? currentModelOf(thread)
      if (state) ledger.record({ threadId: thread.id, model, usage: turnUsage, toolCalls, startedAtMs: state.startedAtMs, completedAtMs, costUsd: reported?.costUsd ?? null })
    }
    if (!adapter.settleUsage) {
      let reported = null
      try { reported = adapter.turnUsage?.(result, { ctx, thread, since: state?.startedAtMs }) ?? null } catch (error) { log(`turn usage: ${error?.message ?? error}`) }
      recordUsage(reported)
      if (holdCompletion) {
        if (thread.usage.last) thread.publishUsage(turnId)
        emit(completion)
      }
    }
    thread.save()
    thread.remember({ updatedAt: Date.now() })
    const refreshContext = async () => {
      if (adapter.settleUsage) {
        let reported = null
        try { reported = await adapter.settleUsage(ctx, thread) } catch (error) { log(`turn usage: ${error?.message ?? error}`) }
        recordUsage(reported)
        if (holdCompletion) {
          if (thread.usage.last) thread.publishUsage(turnId)
          emit(completion)
        }
      }
      try {
        const fill = await adapter.contextUsage?.(ctx, thread.id, thread.host)
        if (fill?.used) {
          thread.usage.contextUsed = fill.used
          if (fill.size) thread.usage.contextWindow = fill.size
        }
      } catch {}
      if (thread.usage.last || thread.usage.contextUsed) thread.publishUsage(turnId)
      thread.remember()
      await refreshBackground(thread)
    }
    const settling = refreshContext().finally(() => {
      thread.publishStatus()
      // Queued messages run next, in order (Codex runs its queue after a turn, also a stopped one).
      setImmediate(() => drainQueue(thread))
    })
    // A shutdown waits for the turn's usage (the runner's bridge exits right after its last agent's turn).
    usageSettles.add(settling)
    void settling.finally(() => usageSettles.delete(settling))
  }

  function drainQueue(thread) {
    if (adapter.agentTurnLog && !thread.prompt && !thread.agentTurn && thread.queue.length) pollAgentTurns(thread)
    if (thread.prompt || thread.agentTurn || thread.closing || !thread.queue.length) return
    const next = thread.queue.shift()
    notify('thread/queue/changed', { threadId: thread.id })
    void runTurn(thread, { input: next.input, clientId: next.clientUserMessageId, turnId: next.turnId })
  }

  async function interrupt(thread, { force = false } = {}) {
    const state = thread.prompt
    // A background question from an earlier turn stays open (stopping this turn does not stop the agent's tasks).
    const current = thread.projector.activeTurn?.id ?? state?.turnId ?? null
    for (const entry of thread.pending.values()) if (force || !backgroundQuestion(thread, entry) || (current && entry.turnId === current)) entry.abort('Turn interrupted.')
    if (!state) {
      // A turn the agent started itself (a goal round, a cron run): cancelled in the agent and closed here.
      if (thread.agentTurn) {
        try { thread.host?.notify('session/cancel', { sessionId: thread.id }) } catch {}
        // An agent whose own turns ignore session/cancel (no prompt is running: MiniMax) stops them its own way.
        if (adapter.cancelAgentTurn && thread.host && !thread.host.exited) void Promise.resolve().then(() => adapter.cancelAgentTurn(ctx, thread.host, thread.id)).catch((error) => log(`cancel agent turn: ${error?.message ?? error}`))
        // A turn followed through the agent's log ends when the log records its end (the agent is busy until then),
        // or after the cancel grace period at the latest.
        const state = thread.agentTurn
        if (state.fromLog && !force && !thread.closing) {
          state.cancelRequested = true
          setTimeout(() => { if (thread.agentTurn === state) endAgentTurn(thread, { status: 'interrupted' }) }, CANCEL_GRACE_MS).unref?.()
        } else endAgentTurn(thread, { status: 'interrupted' })
      }
      return
    }
    state.cancelled = true
    thread.compaction?.resolve?.()
    if (process.env.CODE_DESKTOP_ACP_TRACE) fs.appendFileSync(process.env.CODE_DESKTOP_ACP_TRACE, `interrupt ${thread.id} turn ${state.turnId}\n${new Error().stack}\n`)
    try { thread.host?.notify('session/cancel', { sessionId: thread.id }) } catch {}
    // An agent that does not answer the cancel in time is restarted; the turn ends interrupted.
    setTimeout(() => {
      if (thread.prompt !== state) return
      finishTurn(thread, { status: 'interrupted', error: null })
      void stopHost(thread)
    }, CANCEL_GRACE_MS).unref?.()
  }

  // ------------------------------------------------------------ opening

  function permissionFrom(thread, params) {
    let next = permissionOf(params, thread.permission)
    if (!next) return false
    // Defense in depth: a Bypass the agent's policy forbids (main refuses it first) runs as Auto.
    if (next.mode === 'bypass') { let policy = null; try { policy = adapter.policy?.(ctx) } catch {} if (policy?.disableYolo) next = { ...next, mode: 'auto', approvalPolicy: 'on-request', sandbox: 'workspace-write' } }
    const changed = JSON.stringify(next) !== JSON.stringify(thread.permission)
    setPermission(thread, next)
    return changed
  }

  /**
   * Every permission change goes through here: a change of mode, approval policy, sandbox or roots drops the
   * session grants ("Allow for this session" given in one mode never carries into another), and a card still open
   * across the change records none (grantEpoch).
   */
  function setPermission(thread, next) {
    const previous = thread.permission ?? {}
    const scope = (permission) => JSON.stringify([permission.mode, permission.approvalPolicy, permission.sandbox, permission.writableRoots ?? []])
    thread.permission = next
    if (scope(previous) === scope(next)) return
    thread.grants?.clear()
    thread.grantEpoch = (thread.grantEpoch ?? 0) + 1
  }

  function applySettings(thread, params) {
    const tools = toolSelectionOf(params)
    if (tools !== undefined) thread.tools = tools
    const custom = customizationOf(params)
    if (custom) thread.custom = { ...thread.custom, ...custom }
    // Settings › Code › Dynamic workflows (main.cjs stamps it on every thread/turn request): an agent with its own
    // workflow engine (Qwen) turns it on for the thread's launch (adapter.workflowsInLaunch).
    if (typeof params?.codeDesktop?.dynamicWorkflows === 'boolean') thread.dynamicWorkflows = params.codeDesktop.dynamicWorkflows
    if (typeof params?.developerInstructions === 'string') thread.developerInstructions = cleanText(params.developerInstructions)
    if (typeof params?.model === 'string' && params.model) thread.model = params.model
    const effort = params?.effort ?? params?.config?.model_reasoning_effort
    if (typeof effort === 'string' && effort) thread.effort = effort
    permissionFrom(thread, params)
    warnPermission(thread)
    thread.remember()
  }

  /** A mode the agent cannot fully honour is said once per thread and mode (never silently weaker). */
  function warnPermission(thread) {
    // appTools: the session gets OpenClaude Desktop's tools server (not switched off). An adapter may answer several messages.
    const appToolsOn = Boolean(appTools) && !(thread.tools?.disabledServers ?? []).includes(appTools.name)
    const answer = adapter.permissionWarning?.(thread.permission.mode, { agentHome: thread.agentHome, tools: thread.tools, custom: thread.custom, developerInstructions: thread.developerInstructions, appTools: appToolsOn })
    const messages = (Array.isArray(answer) ? answer : [answer]).filter((message) => typeof message === 'string' && message)
    if (!messages.length) return
    thread.warned ??= new Set()
    if (thread.warned.has(thread.permission.mode)) return
    thread.warned.add(thread.permission.mode)
    for (const message of messages) notify('warning', { threadId: thread.id, message })
  }

  // The folder of the session last started or opened here: account/read's project for an agent with a project .env.
  let lastCwd = null

  async function normalizeCwd(cwd) {
    const value = typeof cwd === 'string' && cwd ? cwd : os.homedir()
    if (!path.isAbsolute(value)) throw invalidParams(`cwd must be absolute: ${value}`)
    try { return await fs.promises.realpath(value) } catch { return value }
  }

  function requireId(value) {
    if (typeof value !== 'string' || !value) throw new RpcError(INVALID_PARAMS, 'threadId is required')
    return value
  }

  const threadNotFound = (id) => new RpcError(INVALID_PARAMS, `This session is not available in ${adapter?.name ?? 'this core'}.`, { codexErrorInfo: 'threadNotFound', threadId: id })

  async function createThread(params) {
    requireAgent()
    const cwd = await normalizeCwd(params.cwd)
    lastCwd = cwd
    // Read before the agent starts: Gemini marks a project's hooks trusted as it loads them.
    const folderMessages = folderNotices(cwd)
    const draft = new Thread('pending', { cwd })
    applySettingsDraft(draft, params)
    // The session id comes with the agent's answer: its code_desktop server is named by the app's start token.
    draft.appToolsSession = sessionIdentityOf(params)
    const { host, created } = await ensureHostForNew(draft)
    const id = created.sessionId
    const meta = store.update(id, { cwd, createdAt: Date.now(), updatedAt: Date.now(), source: 'bridge' })
    const thread = new Thread(id, meta)
    Object.assign(thread, { permission: draft.permission, tools: draft.tools, custom: draft.custom, developerInstructions: draft.developerInstructions, model: draft.model, effort: draft.effort, agentHome: draft.agentHome, appToolsInLaunch: draft.appToolsInLaunch })
    thread.host = host
    thread.hostKey = draft.hostKey
    thread.sandboxed = draft.sandboxed
    thread.sessionReady = true
    host.handlers = hostHandlers(thread)
    host.removeAllListeners('exit')
    host.removeAllListeners('notification')
    host.on('exit', (info) => onHostExit(thread, host, info))
    host.on('notification', (method, params2) => onAgentNotification(thread, method, params2))
    // The running process keeps reading its launch files from the draft folder.
    thread.launchDir = launchConfig(draft).threadDir
    threads.set(id, thread)
    host.attach(id, (update) => onUpdate(thread, update))
    thread.toolsReady = awaitSessionTools(thread, host)
    await afterSession(thread, host, created)
    thread.hostConfig = launchConfig(thread)
    thread.hostKey = keyOf(thread.hostConfig)
    thread.remember()
    thread.save()
    setImmediate(() => { warnPermission(thread); warnFolder(thread, folderMessages) })
    return thread
  }

  /** What the agent says about a session's folder before it starts there (adapter.folderNotice: a string or a list). */
  function folderNotices(cwd) {
    let value = null
    try { value = adapter?.folderNotice?.(ctx, cwd) ?? null } catch {}
    return (Array.isArray(value) ? value : [value]).filter((message) => typeof message === 'string' && message)
  }

  /** The folder notices (what the agent ignores until the folder is trusted, project hooks it will run), once per thread. */
  function warnFolder(thread, messages) {
    if (!messages.length || thread.folderWarned) return
    thread.folderWarned = true
    for (const message of messages) notify('warning', { threadId: thread.id, message })
  }

  function applySettingsDraft(draft, params) {
    draft.draftId = randomUUID()
    draft.id = `pending-${draft.draftId}`
    const tools = toolSelectionOf(params)
    if (tools !== undefined) draft.tools = tools
    const custom = customizationOf(params)
    if (custom) draft.custom = { ...draft.custom, ...custom }
    if (typeof params?.codeDesktop?.dynamicWorkflows === 'boolean') draft.dynamicWorkflows = params.codeDesktop.dynamicWorkflows
    if (typeof params?.developerInstructions === 'string') draft.developerInstructions = cleanText(params.developerInstructions)
    if (typeof params?.model === 'string' && params.model) draft.model = params.model
    const effort = params?.effort ?? params?.config?.model_reasoning_effort
    if (typeof effort === 'string' && effort) draft.effort = effort
    permissionFrom(draft, params)
  }

  /** What a launch leaves to do once its process is gone (launch.onExit: Kimi's home overlay settles into the real home). */
  function settleOnExit(host, launch) {
    if (typeof launch?.onExit !== 'function') return
    // The exit promise, not the event: a new session's host has its exit listeners replaced once it becomes the thread's.
    void host.exit.then(() => { try { launch.onExit() } catch (error) { log(`after exit: ${error?.message ?? error}`) } })
  }

  async function ensureHostForNew(draft, restarted = false) {
    await prepare()
    const config = launchConfig(draft)
    const launch = adapter.launch(ctx, config)
    draft.agentHome = launch.agentHome ?? null
    draft.appToolsInLaunch = launch.appToolsInLaunch === true
    const line = commandLine(program, launch.args)
    const wrapped = wrapLaunch(line, { profile: config.sandbox, writable: config.writable, agentPaths: [...adapter.agentPaths(agentEnv), stateDir, config.threadDir], profileFile: path.join(config.threadDir, 'agent.sb'), ...sandboxExtras() })
    const host = new AgentHost({ stopSignal: adapter?.stopSignal, command: wrapped.command, args: wrapped.args, env: { ...agentEnv, ...launch.env }, cwd: draft.cwd, clientCapabilities: adapter.clientCapabilities, handlers: hostHandlers(draft), log, label: `${adapter.id}:new` })
    settleOnExit(host, launch)
    draft.hostKey = keyOf(config)
    draft.sandboxed = wrapped.sandboxed
    try {
      await host.start()
      // As startHost: state filled in after the agent's first start (MiniMax's database) is read by one restart.
      let again = false
      if (!restarted && adapter.afterStart) { try { again = adapter.afterStart(ctx, launch) === true } catch (error) { log(`after start: ${error?.message ?? error}`) } }
      if (again) {
        await host.stop()
        return ensureHostForNew(draft, true)
      }
      const created = await host.call('session/new', { cwd: draft.cwd, mcpServers: sessionMcpServers(draft, draft.appToolsSession), ...additionalDirectoriesFor(host, draft) }, 120000)
      if (!created?.sessionId) throw new Error('The agent did not return a session id.')
      return { host, created }
    } catch (error) {
      void host.stop()
      throw agentError(error, host)
    }
  }

  /** A known thread (loaded, in the index, or in the agent's own history). */
  async function openThread(id, { load = true } = {}) {
    const live = threads.get(id)
    // Used again: a release that waited for background work no longer applies.
    if (live && !live.closing) { live.releaseWhenIdle = false; return live }
    if (opening.has(id)) return opening.get(id)
    const promise = (async () => {
      let meta = store.get(id)
      if (!store.has(id) || meta.deleted) {
        const found = (await listAgentSessions().catch(() => [])).find((session) => session.sessionId === id)
        if (!found || meta.deleted) throw threadNotFound(id)
        meta = store.update(id, { cwd: found.cwd ?? os.homedir(), createdAt: found.createdAt ?? found.updatedAt ?? Date.now(), updatedAt: found.updatedAt ?? Date.now(), agentTitle: found.title ?? null, preview: found.preview ?? null, source: 'agent' })
      }
      if (meta.subagent) throw threadNotFound(id)
      const thread = new Thread(id, meta)
      threads.set(id, thread)
      if (load && !thread.hasHistory) await replayHistory(thread)
      // A goal kept in the agent's own log (adapter.readGoal) shows once the session is open (after this request).
      if (adapter.readGoal) setTimeout(() => { try { const goal = adapter.readGoal(ctx, thread); if (goal) applyGoal(thread, goal) } catch {} }, 0)
      return thread
    })().finally(() => opening.delete(id))
    opening.set(id, promise)
    return promise
  }

  /** A session the bridge never projected: session/load replays it into Codex turns (then the process keeps it open). */
  async function replayHistory(thread) {
    await prepare()
    const config = launchConfig(thread)
    const launch = adapter.launch(ctx, config)
    thread.appToolsInLaunch = launch.appToolsInLaunch === true
    const line = commandLine(program, launch.args)
    const wrapped = wrapLaunch(line, { profile: config.sandbox, writable: config.writable, agentPaths: [...adapter.agentPaths(agentEnv), stateDir, config.threadDir], profileFile: path.join(config.threadDir, 'agent.sb'), ...sandboxExtras() })
    const host = new AgentHost({ stopSignal: adapter?.stopSignal, command: wrapped.command, args: wrapped.args, env: { ...agentEnv, ...launch.env }, cwd: thread.cwd, clientCapabilities: adapter.clientCapabilities, handlers: hostHandlers(thread), log, label: `${adapter.id}:${thread.id.slice(0, 8)}` })
    settleOnExit(host, launch)
    const projector = new ThreadProjector({ threadId: thread.id, cwd: thread.cwd, classify: (call) => adapter.classify?.(call, ctx) ?? null, commandResult: adapter.commandResult })
    let last = Date.now()
    host.attach(thread.id, (update) => {
      last = Date.now()
      const filtered = adapter.filterUpdate ? adapter.filterUpdate(update, thread, { replay: true }) : { update }
      if (filtered.drop || filtered.child) return
      try { projector.apply(filtered.update, { replay: true }) } catch {}
    })
    try {
      await host.start()
      adapter.beforeLoad?.(ctx, thread.id)
      const result = await host.call('session/load', { sessionId: thread.id, cwd: thread.cwd, mcpServers: sessionMcpServers(thread, thread.id), ...additionalDirectoriesFor(host, thread) }, 180000)
      try { adapter.afterLoad?.(ctx, thread.id) } catch {}
      // Gemini replays after answering: wait for the stream to go quiet.
      while (Date.now() - last < 400) await new Promise((resolve) => setTimeout(resolve, 150))
      projector.completeTurn({})
      thread.projector.turns = projector.turns.map((turn) => ({ ...turn, status: turn.status === 'inProgress' ? 'completed' : turn.status }))
      thread.projector.current = null
      thread.host = host
      thread.hostKey = keyOf(config)
      thread.hostConfig = config
      thread.sandboxed = wrapped.sandboxed
      thread.sessionReady = true
      host.on('exit', (info) => onHostExit(thread, host, info))
      host.attach(thread.id, (update) => onUpdate(thread, update))
      await afterSession(thread, host, result)
      thread.save()
    } catch (error) {
      void host.stop()
      throw agentError(error, host)
    }
  }

  /** Running background commands of a loaded session (thread/backgroundTerminals/list's sources). */
  function hasBackgroundWork(thread) {
    if (thread.services.running().length) return true
    try { return Boolean(adapter.backgroundProcesses?.(thread)?.length) } catch { return false }
  }
  /** Close an unsubscribed session once its background work, turn and queue have settled (unless it is used again). */
  function releaseWhenSettled(thread) {
    if (thread.releaseWhenIdle) return
    thread.releaseWhenIdle = true
    const timer = setInterval(async () => {
      if (!thread.releaseWhenIdle || thread.closing || threads.get(thread.id) !== thread) { clearInterval(timer); return }
      await refreshBackground(thread)
      if (!thread.releaseWhenIdle || thread.closing || threads.get(thread.id) !== thread) return
      let scheduled = false
      try { scheduled = Boolean(adapter.keepLoaded?.(thread)) } catch {}
      if (thread.running || thread.pending.size || thread.queue.length || scheduled || hasBackgroundWork(thread)) return
      clearInterval(timer)
      threads.delete(thread.id)
      void closeThread(thread)
    }, 5000)
    timer.unref?.()
  }

  /**
   * A change to the agent's own record of a session that its process must not hold meanwhile (sessionFeatures
   * profileOffline: Kimi's title and archive flag, written through its local server). An idle session's process is
   * stopped first (the next turn starts a new one); a session that is busy (a turn, background work, scheduled jobs)
   * gets it once its process has stopped, the latest change of each kind winning.
   */
  async function profileOp(id, run, kind) {
    const live = threads.get(id)
    const meta = store.has(id) ? store.get(id) : null
    const extra = { cwd: live?.cwd ?? meta?.cwd ?? null, launch: () => (live ? adapter.launch(ctx, launchConfig(live)) : null) }
    if (live && live.host && !live.host.exited && !live.closing) {
      let scheduled = false
      try { scheduled = Boolean(adapter.keepLoaded?.(live)) } catch {}
      if (live.running || live.pending.size || live.queue.length || scheduled || hasBackgroundWork(live) || live.ensuring) {
        (live.profileOps ??= new Map()).set(kind, run)
        return
      }
      await stopHost(live)
    }
    try { await run(extra) } catch (error) { log(`${kind}: ${error?.message ?? error}`) }
  }

  /** Session changes held back while the agent's process ran (profileOp), now that it has stopped. */
  async function flushProfileOps(thread) {
    const ops = thread.profileOps
    if (!ops?.size || (thread.host && !thread.host.exited)) return
    thread.profileOps = null
    const extra = { cwd: thread.cwd, launch: () => adapter.launch(ctx, launchConfig(thread)) }
    for (const [kind, run] of ops) { try { await run(extra) } catch (error) { log(`${kind}: ${error?.message ?? error}`) } }
  }

  /** Archive or restore the session in the agent itself (adapter.archiveSession: Kimi). */
  function agentArchive(id, archived) {
    if (!adapter?.archiveSession) return Promise.resolve()
    const run = async (extra) => { await adapter.archiveSession(ctx, id, archived, extra); if (store.has(id)) store.update(id, { agentArchived: archived }) }
    if (adapter.sessionFeatures?.profileOffline) return profileOp(id, run, 'archive')
    return run({}).catch((error) => log(`archive: ${error?.message ?? error}`))
  }

  async function closeThread(thread, reason = 'Session closed.') {
    if (thread.closing) return thread.closing
    clearInterval(thread.agentLogTimer)
    thread.agentLogTimer = null
    thread.closing = (async () => {
      for (const entry of thread.pending.values()) entry.abort(reason)
      if (thread.prompt || thread.agentTurn) await interrupt(thread, { force: true })
      thread.services.killAll()
      try { adapter.stopAllBackground?.(thread) } catch (error) { log(`stop background: ${error?.message ?? error}`) }
      await stopHost(thread)
      await flushProfileOps(thread)
    })()
    return thread.closing
  }

  // ------------------------------------------------------------ listing

  /** The agent's own sessions: ACP session/list when offered, else the adapter's reader. */
  async function listAgentSessions() {
    requireAgent()
    if (adapter.listSessions) return adapter.listSessions(ctx)
    const host = await utilityHost()
    if (!host.can('list')) return []
    const rows = []
    let cursor
    for (let page = 0; page < 20; page++) {
      const result = await host.call('session/list', cursor ? { cursor } : {}, 30000)
      for (const session of result?.sessions ?? []) rows.push({ sessionId: session.sessionId, cwd: session.cwd, title: session.title ?? null, preview: session._meta?.preview ?? null, createdAt: Date.parse(session._meta?.createdAt) || null, updatedAt: Date.parse(session.updatedAt) || null })
      cursor = result?.nextCursor
      if (!cursor) break
    }
    return rows
  }

  function threadObject(id, { child = null, parent = null, includeTurns = false } = {}) {
    const meta = store.get(id)
    const live = threads.get(id)
    const projector = child?.projector ?? live?.projector ?? null
    const turns = projector?.turns ?? (includeTurns ? store.readHistory(id)?.turns ?? [] : [])
    const createdMs = meta.createdAt ?? Date.now()
    const activity = Math.max(projector?.lastActivityMs ?? 0, meta.lastPromptAt ?? 0, meta.updatedAt ?? 0)
    const updatedMs = Math.max(createdMs, activity || createdMs)
    const parentThreadId = meta.parentThreadId ?? parent?.id ?? null
    const delegateActive = meta.delegateStatus === 'running' || meta.delegateStatus === 'pendingInit'
    const status = live && !live.closing ? live.status() : child ? (child.projector.activeTurn ? { type: 'active', activeFlags: [] } : { type: 'idle' }) : meta.subagent ? (delegateActive ? { type: 'active', activeFlags: [] } : { type: 'idle' }) : { type: 'notLoaded' }
    const preview = projector?.preview || meta.preview || meta.name || meta.agentTitle || ''
    return {
      id, sessionId: id,
      forkedFromId: meta.forkedFromId ?? null,
      parentThreadId,
      preview,
      ephemeral: false, section: null, sectionEnteredAt: null, projectId: null,
      historyMode: 'paginated',
      modelProvider: adapter?.id ?? 'acp',
      model: live?.model ?? meta.model ?? null,
      reasoningEffort: (live ? effortOf(live) : null) ?? meta.effort ?? null,
      createdAt: seconds(createdMs),
      updatedAt: seconds(updatedMs),
      recencyAt: seconds(updatedMs),
      status,
      path: null,
      cwd: meta.cwd ?? live?.cwd ?? '',
      cliVersion: `${adapter?.id ?? 'acp'} ${version}`,
      source: parentThreadId ? { subAgent: { thread_spawn: { parent_thread_id: parentThreadId, depth: 1, agent_nickname: meta.agentLabel ?? null, agent_role: null } } } : 'appServer',
      threadSource: null,
      agentNickname: parentThreadId ? meta.agentLabel ?? null : null,
      agentRole: null,
      gitInfo: null,
      name: meta.name ?? meta.agentTitle ?? null,
      turns: includeTurns ? turns.map((turn) => (projector ?? new ThreadProjector({ threadId: id })).snapshot(turn)) : [],
      // The pull request the agent opened for this session (bindPullRequest).
      ...(meta.pr && (meta.pr.number || meta.pr.url) ? { codeDesktop: { pr: meta.pr } } : {}),
    }
  }

  function sessionResponse(thread, { includeTurns = false } = {}) {
    return {
      thread: threadObject(thread.id, { includeTurns }),
      model: thread.model ?? currentModelOf(thread) ?? '',
      modelProvider: adapter.id,
      serviceTier: null,
      cwd: thread.cwd,
      instructionSources: [],
      approvalPolicy: thread.permission.approvalPolicy,
      approvalsReviewer: 'user',
      sandbox: sandboxPolicyOf(thread.permission, thread.cwd),
      reasoningEffort: effortOf(thread),
    }
  }

  function pageTurns(turns, { limit, sortDirection, cursor, itemsView = 'full' } = {}, projector) {
    const view = projector ?? new ThreadProjector({ threadId: '' })
    const ordered = turns.map((turn) => view.snapshot(turn, itemsView === 'notLoaded' ? 'notLoaded' : 'full'))
    if (sortDirection !== 'asc') ordered.reverse()
    const start = cursor ? Number.parseInt(String(cursor), 10) || 0 : 0
    const size = Number.isInteger(limit) && limit > 0 ? limit : 25
    return { data: ordered.slice(start, start + size), nextCursor: start + size < ordered.length ? String(start + size) : null, backwardsCursor: null }
  }

  /** Turns of a thread without loading its agent: live projection, stored history, or a replay. */
  async function turnsOf(id) {
    const live = threads.get(id)
    if (live) return live.projector.turns
    for (const thread of threads.values()) for (const child of thread.children.values()) if (child.id === id) return child.projector.turns
    const history = store.readHistory(id)
    if (history) return history.turns ?? []
    const meta = store.has(id) ? store.get(id) : null
    if (meta?.delegate && meta.rootThreadId) return delegateTurns(id, meta)
    const thread = await openThread(id)
    return thread.projector.turns
  }

  /** Workflow runners' folders: {pid, dir, threads: index.json's threads}. */
  function runnerFolders() {
    let names = []
    try { names = fs.readdirSync(runsDir) } catch { return [] }
    return names.filter((name) => /^\d+$/.test(name)).map((name) => {
      const dir = path.join(runsDir, name)
      let threads = {}
      try { threads = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))?.threads ?? {} } catch {}
      return { pid: Number(name), dir, threads: threads && typeof threads === 'object' ? threads : {} }
    })
  }
  const processAlive = (pid) => { try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' } }
  let lastSweep = 0
  /** Deletes the threads of workflow runners that are gone (their agent sessions too) and their folders. */
  async function sweepRunnerFolders() {
    if (runnerRole || Date.now() - lastSweep < 60000) return
    lastSweep = Date.now()
    for (const folder of runnerFolders()) {
      if (folder.pid === process.pid || processAlive(folder.pid)) continue
      for (const [id, meta] of Object.entries(folder.threads)) {
        if (!meta || meta.deleted || meta.source === 'agent') continue
        try { await removeAgentSession(id, meta.agentCwd ?? meta.cwd ?? os.homedir()) } catch (error) { log(`workflow agent ${id}: ${error?.message ?? error}`) }
      }
      try { fs.rmSync(folder.dir, { recursive: true, force: true }) } catch {}
    }
  }

  async function listThreads(params) {
    const cwdFilter = params.cwd === undefined || params.cwd === null ? null : new Set([params.cwd].flat())
    // Workflow agents' sessions (a runner's folder, live or not yet swept) are never the user's.
    const workflowAgents = new Set(runnerRole ? [] : runnerFolders().flatMap((folder) => Object.keys(folder.threads)))
    void sweepRunnerFolders().catch(() => {})
    const wantArchived = params.archived === true
    const kinds = Array.isArray(params.sourceKinds) ? params.sourceKinds : null
    const wantSub = kinds?.some((kind) => String(kind).startsWith('subAgent'))
    const wantMain = !kinds || kinds.some((kind) => !String(kind).startsWith('subAgent'))
    // The agent's own sessions join the index (sessions started in its CLI show up too).
    if (wantMain) {
      try {
        for (const session of await listAgentSessions()) {
          if (!session?.sessionId || store.has(session.sessionId) || workflowAgents.has(session.sessionId)) continue
          store.update(session.sessionId, { cwd: session.cwd ?? os.homedir(), createdAt: session.createdAt ?? session.updatedAt ?? Date.now(), updatedAt: session.updatedAt ?? Date.now(), agentTitle: session.title ?? null, preview: session.preview ?? null, source: 'agent' })
        }
      } catch (error) {
        log(`session list: ${error?.message ?? error}`)
      }
    }
    // The agent's own archive flag (adapter.sessionStates: Kimi's web UI and CLI archive sessions too): the more recent
    // change wins, here or there.
    if (wantMain && adapter?.sessionStates) {
      let states = null
      try { states = adapter.sessionStates(ctx) } catch (error) { log(`session states: ${error?.message ?? error}`) }
      for (const [id, state] of states ?? []) {
        if (!store.has(id)) continue
        const meta = store.get(id)
        if (meta.deleted || meta.subagent) continue
        // meta.agentArchived: the agent's flag when last seen (or last set from here). A change on its side since then is
        // taken over; on first sight only an archive made there after the last change here is.
        const seen = meta.agentArchived
        if (seen === state.archived) continue
        const pending = threads.get(id)?.profileOps?.has('archive')
        const adopt = !pending && state.archived !== Boolean(meta.archived) && (seen !== undefined || (state.archived && (state.archivedAt ?? 0) > (meta.archiveChangedAt ?? 0)))
        store.update(id, { agentArchived: state.archived, ...(adopt ? { archived: state.archived, archiveChangedAt: Date.now() } : {}) })
        if (adopt) notify(state.archived ? 'thread/archived' : 'thread/unarchived', { threadId: id })
      }
    }
    let rows = store.ids().map((id) => [id, store.get(id)]).filter(([, meta]) => !meta.deleted && Boolean(meta.archived) === wantArchived)
    rows = rows.filter(([, meta]) => (meta.subagent ? wantSub : wantMain))
    if (cwdFilter) rows = rows.filter(([, meta]) => cwdFilter.has(meta.cwd))
    let data = rows.map(([id]) => threadObject(id)).filter((thread) => thread.preview || thread.name || threads.get(thread.id)?.projector.turns.length)
    const term = typeof params.searchTerm === 'string' ? params.searchTerm.trim().toLowerCase() : ''
    if (term) data = data.filter((thread) => `${thread.name ?? ''} ${thread.preview ?? ''}`.toLowerCase().includes(term))
    const key = params.sortKey === 'created_at' || params.sortKey === 'createdAt' ? 'createdAt' : 'updatedAt'
    data.sort((a, b) => b[key] - a[key] || b.createdAt - a.createdAt)
    if (params.sortDirection === 'asc') data.reverse()
    const start = params.cursor ? Number.parseInt(String(params.cursor), 10) || 0 : 0
    const size = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 50
    return { data: data.slice(start, start + size), nextCursor: start + size < data.length ? String(start + size) : null, backwardsCursor: null }
  }

  // ------------------------------------------------------------ catalog

  /** When the agent's config file last changed (adapter.configModels: Kimi reads its models from it only at launch). */
  function modelConfigChangedAt() {
    if (!adapter?.configModels || !adapter.configFile) return 0
    try { return fs.statSync(adapter.configFile(agentEnv)).mtimeMs } catch { return 0 }
  }

  /**
   * model/list rows from every open session, the newest first (its default and rows win): an older session's process
   * may not know a model added since it started. A config change after the newest session opened (adapter.configModels)
   * adds the config's own models, and the idle sessions that predate it start a fresh process at their next turn.
   */
  function liveModels() {
    const live = [...threads.values()].filter((thread) => !thread.closing && (thread.acp.models || thread.acp.configOptions)).sort((a, b) => (b.sessionOpenedAt ?? 0) - (a.sessionOpenedAt ?? 0))
    if (!live.length) return null
    const rows = new Map()
    for (const [index, thread] of live.entries()) for (const row of modelsFromSession(thread)) if (!rows.has(row.id)) rows.set(row.id, { ...row, isDefault: index === 0 ? row.isDefault : false })
    const changed = modelConfigChangedAt()
    if (changed && changed > (live[0].sessionOpenedAt ?? 0)) {
      try { for (const model of adapter.modelCatalog?.(ctx) ?? []) if (model?.id && !rows.has(model.id)) rows.set(model.id, { ...model, isDefault: false }) } catch (error) { log(`model catalog: ${error?.message ?? error}`) }
      for (const thread of live) if (!thread.running && (thread.sessionOpenedAt ?? 0) < changed) thread.hostKey = 'stale'
    }
    return [...rows.values()]
  }

  async function modelList() {
    // 'modelRows': rows whose efforts are per model (an older 'models' cache copied one model's efforts to all).
    let models = store.cache.modelRows
    // A config edited since the cached discovery (adapter.configModels) is discovered again.
    const changed = modelConfigChangedAt()
    if (changed && store.cache.modelRowsConfigAt !== changed) models = null
    const fromLive = liveModels()
    const live = Boolean(fromLive?.length)
    if (live) models = fromLive
    if (!Array.isArray(models) || !models.length) {
      // Discover once: a throwaway session in the bridge's own folder, removed again (or, for an agent
      // that cannot delete sessions, kept out of its history by an ephemeral launch).
      let ephemeral = null
      try {
        let host
        if (adapter.sessionFeatures?.ownHome || adapter.sessionFeatures?.deleteHistory === false) {
          await prepare()
          const dir = path.join(stateDir, 'discover')
          fs.rmSync(dir, { recursive: true, force: true })
          fs.mkdirSync(dir, { recursive: true })
          const launch = adapter.launch(ctx, { threadDir: dir, ephemeral: true, sandbox: 'read-only' })
          // Read-only, as a side question runs: a throwaway home may write only itself (never the user's dotfiles).
          const line = wrapLaunch(commandLine(program, launch.args), { profile: 'read-only', writable: [], agentPaths: [...adapter.agentPaths(agentEnv), stateDir, dir], profileFile: path.join(stateDir, 'discover.sb'), ...sandboxExtras() })
          ephemeral = host = new AgentHost({ stopSignal: adapter?.stopSignal, command: line.command, args: line.args, env: { ...agentEnv, ...launch.env }, cwd: dir, clientCapabilities: {}, log, label: `${adapter.id}-discover` })
          await host.start()
        } else host = await utilityHost()
        const cwd = ephemeral ? path.join(stateDir, 'discover') : path.join(stateDir, 'utility')
        const created = await host.call('session/new', { cwd, mcpServers: [] }, 60000)
        const probe = { acp: { models: created.models ?? null, configOptions: created.configOptions ?? null } }
        await probeModelEfforts(host, created.sessionId, probe)
        models = modelsFromSession(probe)
        if (models.length) { store.setCache('modelRows', models); if (changed) store.setCache('modelRowsConfigAt', changed) }
        if (!ephemeral) void removeAgentSession(created.sessionId, cwd).catch(() => {})
      } catch (error) {
        log(`model discovery: ${error?.message ?? error}`)
      } finally {
        if (ephemeral) void ephemeral.stop().finally(() => fs.rmSync(path.join(stateDir, 'discover'), { recursive: true, force: true }))
      }
    }
    const catalog = modelCatalog()
    if (!Array.isArray(models) || !models.length) {
      // No session could be opened: the adapter's configured models (Kimi's config.toml gives their efforts too).
      const fallback = adapter.fallbackModels?.(ctx) ?? []
      models = (fallback.length ? fallback : [...catalog.values()]).map((model, index) => ({ ...model, isDefault: model.isDefault ?? index === 0 }))
    }
    const anyDefault = models.some((model) => model.isDefault)
    const rows = models.map((model, index) => {
      const isDefault = model.isDefault || (!anyDefault && index === 0)
      // Each row's own efforts (what a session on that model offers), recorded or from the adapter's catalog.
      const info = live ? model : { ...model, ...modelInfo(null, model.id, catalog) }
      const efforts = Array.isArray(info.efforts) ? info.efforts : []
      const listed = catalog.get(model.id) ?? {}
      let own = null
      try { own = adapter.inputModalities?.(ctx, model.id) ?? null } catch {}
      const modalities = Array.isArray(info.inputModalities) ? info.inputModalities : Array.isArray(listed.inputModalities) ? listed.inputModalities : Array.isArray(own) ? own : ['text', ...(adapter.images !== false ? ['image'] : [])]
      return {
        id: model.id, model: model.id, upgrade: null, upgradeInfo: null, availabilityNux: null,
        displayName: model.name ?? listed.name ?? model.id, description: model.description || listed.description || '', modelSpecialty: null, hidden: false,
        supportedReasoningEfforts: efforts.map((effort) => ({ reasoningEffort: effort.id, description: effort.name ?? effort.id })),
        defaultReasoningEffort: efforts.length ? (efforts.some((effort) => effort.id === info.defaultEffort) ? info.defaultEffort : efforts[0].id) : null,
        inputModalities: modalities,
        supportsPersonality: false, multiAgentVersion: null, additionalSpeedTiers: [], serviceTiers: [], defaultServiceTier: null,
        isDefault,
        provider: adapter.id, contextWindow: model.contextWindow ?? listed.contextWindow ?? adapter.contextWindow?.(model.id) ?? null,
      }
    })
    // The agent's own presentation of its menu (adapter.presentModels: Gemini's names, order and main/overflow sections).
    if (adapter.presentModels) { try { return adapter.presentModels(rows) } catch (error) { log(`present models: ${error?.message ?? error}`) } }
    return rows
  }

  async function removeAgentSession(sessionId, cwd) {
    if (adapter.deleteSession) return adapter.deleteSession(ctx, sessionId, cwd)
    const host = await utilityHost()
    if (host.can('delete')) { await host.call('session/delete', { sessionId }, 30000); return true }
    return false
  }

  /** The agent's own usage records (sessions run outside OpenClaude Desktop) folded into the ledger; OpenClaude Desktop's threads count once. */
  function mergeAgentUsage() {
    if (!adapter?.usageRecords) return
    // The workflow runner's sessions reach the ledger through its usage inbox: never counted again from the agent's records.
    ledger.absorbInbox()
    const workflowAgents = new Set(runnerFolders().flatMap((folder) => Object.keys(folder.threads)))
    ledger.mergeExternal((cursor) => adapter.usageRecords(ctx, cursor), (sessionId) => store.has(sessionId) || threads.has(sessionId) || workflowAgents.has(sessionId))
  }

  function skillsList(params) {
    const cwds = Array.isArray(params.cwds) && params.cwds.length ? params.cwds : [os.homedir()]
    const commands = [...threads.values()].find((thread) => thread.commands.length)?.commands ?? store.cache.commands ?? []
    return {
      data: cwds.map((cwd) => {
        let skills = []
        const errors = []
        try { skills = adapter.skills?.(ctx, cwd) ?? [] } catch (error) { errors.push({ path: cwd, message: error?.message ?? String(error) }) }
        const known = new Set(skills.map((skill) => skill.name))
        // An agent that also lists each skill as a command of its own (Kimi's skill:<name>): one row per skill.
        if (adapter.skillCommandPrefix) for (const skill of skills) known.add(`${adapter.skillCommandPrefix}${skill.name}`)
        // …or under a name of its own (Qwen's extension skills, '<extension>:<skill>').
        if (adapter.skillCommandName) for (const skill of skills) { try { const name = adapter.skillCommandName(skill); if (name) known.add(name) } catch {} }
        // The agent's custom commands (Gemini's TOML files): slash-menu rows the bridge expands at turn/start.
        let custom = []
        try { custom = adapter.commands?.(ctx, cwd) ?? [] } catch (error) { errors.push({ path: cwd, message: error?.message ?? String(error) }) }
        // MCP prompts the agent runs as slash commands (adapter.mcpPrompts), after its own commands.
        custom = [...custom, ...promptCommandsCached(cwd)]
        const customRows = custom.filter((command) => !known.has(command.name)).map((command) => {
          known.add(command.name)
          return { name: command.name, description: command.description ?? '', path: command.file, scope: command.scope ?? 'user', enabled: false, userInvocable: true, modelInvocable: false, pluginId: command.extension ?? null, command: true, argumentHint: command.argumentHint ?? null }
        })
        return { cwd, skills: [...skills, ...customRows, ...commandSkills(commands, known)], errors }
      }),
    }
  }

  /**
   * MCP prompts as slash commands (adapter.mcpPrompts: Gemini CLI's TUI offers every connected server's prompts,
   * which its ACP mode does not): each enabled server's prompts/list, named as Gemini names them (spaces → '-'; a
   * name another command already has gets '<server>.' before it). Read in the background and kept a minute per folder;
   * the slash menu refreshes (skills/changed) when they change.
   */
  const promptCommandCache = new Map()
  function promptCommandsCached(cwd) {
    if (!adapter?.mcpPrompts) return []
    const key = cwd ?? ''
    const hit = promptCommandCache.get(key)
    if (!hit || (Date.now() - hit.at > 60000 && !hit.pending)) void refreshPromptCommands(cwd)
    return hit?.commands ?? []
  }
  function refreshPromptCommands(cwd) {
    if (!adapter?.mcpPrompts) return Promise.resolve([])
    const key = cwd ?? ''
    const hit = promptCommandCache.get(key)
    if (hit?.pending) return hit.pending
    const pending = (async () => {
      const servers = mcpServersFor(cwd).filter((server) => !server.disabled && !server.trustRequired && !server.disabledReason).map(withAgentAuth)
      const found = await Promise.all(servers.map(async (server) => ((await probeMcpServer(server, { prompts: true }).catch(() => null))?.prompts ?? []).map((prompt) => ({ server, prompt }))))
      let taken = new Set()
      try { taken = new Set((adapter.commands?.(ctx, cwd) ?? []).map((command) => command.name)) } catch {}
      const commands = []
      for (const { server, prompt } of found.flat()) {
        let name = String(prompt.name).trim().replace(/\s+/g, '-')
        if (taken.has(name)) name = `${server.name}.${name}`
        if (!name || taken.has(name)) continue
        taken.add(name)
        commands.push({
          name, description: `${String(prompt.description || `Invoke prompt ${prompt.name}`).replace(/\s+/g, ' ').slice(0, 100)} (${server.name})`, file: `mcp-prompt:${server.name}/${prompt.name}`, scope: 'user', extension: server.extension ?? null,
          argumentHint: Array.isArray(prompt.arguments) && prompt.arguments.length ? prompt.arguments.map((arg) => `--${arg.name}=…`).join(' ') : null,
          mcpPrompt: { server: server.name, name: prompt.name, arguments: Array.isArray(prompt.arguments) ? prompt.arguments : [] },
        })
      }
      const changed = JSON.stringify(commands.map((command) => [command.name, command.description])) !== JSON.stringify((hit?.commands ?? []).map((command) => [command.name, command.description]))
      promptCommandCache.set(key, { at: Date.now(), commands })
      if (changed) notify('skills/changed', {})
      return commands
    })().catch((error) => {
      log(`MCP prompts: ${error?.message ?? error}`)
      promptCommandCache.set(key, { at: Date.now(), commands: hit?.commands ?? [] })
      return hit?.commands ?? []
    })
    promptCommandCache.set(key, { at: hit?.at ?? 0, commands: hit?.commands ?? [], pending })
    return pending
  }

  /** An MCP prompt command's turn: the server expands it (prompts/get) with the arguments typed after it. */
  async function expandPromptCommand(thread, command, args) {
    const parsed = parsePromptArgs(args, command.mcpPrompt.arguments)
    if (parsed instanceof Error) return { reply: `/${command.name}: ${parsed.message}` }
    const server = mcpServersFor(thread.cwd).find((entry) => entry.name === command.mcpPrompt.server)
    if (!server) return { reply: `/${command.name}: the connector ${command.mcpPrompt.server} is no longer configured.` }
    const answer = await getMcpPrompt(withAgentAuth(server), command.mcpPrompt.name, parsed)
    const text = promptText(answer)
    if (!text) return { reply: `/${command.name}: ${server.name} returned an empty prompt.` }
    return text
  }

  function mcpServersFor(cwd) {
    try { return adapter.mcpServers?.(ctx, cwd) ?? [] } catch (error) { log(`MCP config: ${error?.message ?? error}`); return [] }
  }

  /** A remote server with the agent's stored sign-in (Gemini's MCP OAuth tokens): probed as the agent connects. */
  function withAgentAuth(server) {
    if (!server.url) return server
    let auth = null
    try { auth = adapter.mcpAuth?.(ctx, server) ?? null } catch (error) { log(`MCP auth ${server.name}: ${error?.message ?? error}`) }
    return auth?.headers ? { ...server, headers: { ...server.headers, ...auth.headers }, oauthToken: true } : server
  }

  /**
   * mcpServer/oauth/login on an agent that signs in on request: the page it answers, then a watch of its sign-in
   * (adapter.mcpLoginStatus, every 2 s for 10 minutes) that ends in Codex's mcpServer/oauthLogin/completed. Idle
   * threads relaunch so the new tokens reach them.
   */
  const mcpLogins = new Map()
  async function mcpLogin(server) {
    const result = await adapter.mcpLogin(ctx, server)
    const watch = Symbol(server.name)
    mcpLogins.set(server.name, watch)
    void (async () => {
      const deadline = Date.now() + 10 * 60000
      let outcome = null
      while (Date.now() < deadline && mcpLogins.get(server.name) === watch) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        try { outcome = await adapter.mcpLoginStatus?.(ctx, server) } catch (error) { log(`MCP sign-in ${server.name}: ${error?.message ?? error}`) }
        if (outcome?.state === 'succeeded' || outcome?.state === 'failed') break
      }
      if (mcpLogins.get(server.name) !== watch) return
      mcpLogins.delete(server.name)
      const success = outcome?.state === 'succeeded'
      if (success) for (const thread of threads.values()) if (!thread.running) { thread.hostKey = 'stale' }
      notify('mcpServer/oauthLogin/completed', { name: server.name, threadId: null, success, ...(success ? {} : { error: outcome?.error || `${adapter.name} didn’t finish signing in to ${server.name}.` }) })
    })()
    return { authorizationUrl: result.authorizationUrl }
  }

  async function mcpStatusList(params) {
    const cwd = params.threadId ? threads.get(params.threadId)?.cwd ?? store.get(params.threadId)?.cwd : null
    const servers = mcpServersFor(cwd).map(withAgentAuth)
    const statuses = await Promise.all(servers.map(async (server) => {
      // A project server of an untrusted folder (Kimi): the agent won't load it, so it is never run here either; the
      // row says what it would launch and that the folder needs trusting (codeDesktop/workspace/trust).
      if (server.trustRequired) return { ...mcpServerStatus(server, { runtimeStatus: 'disabled' }), authStatus: 'unsupported',
        error: `${adapter.name} loads this folder’s connectors only after you trust the folder.`,
        codeDesktop: { trustRequired: true, cwd, launch: server.url ? server.url : [server.command, ...(server.args ?? [])].join(' ') } }
      // A server the agent will not load (Gemini: blocked by mcp.allowed / mcp.excluded or the organization): off, with why.
      if (server.disabledReason) return { ...mcpServerStatus(server, { runtimeStatus: 'disabled' }), error: server.disabledReason, codeDesktop: { blocked: server.blocked ?? 'settings', launch: server.url ? server.url : [server.command, ...(server.args ?? [])].join(' ') } }
      const status = mcpServerStatus(server, await probeMcpServer(server).catch((error) => ({ runtimeStatus: 'failed', error: error?.message })))
      // The agent signs in to MCP servers itself: no Sign in here (it would only fail), but how to do it.
      // An agent that runs the sign-in on request (adapter.mcpLogin: Qwen) keeps Sign in.
      if (status.authStatus === 'notLoggedIn' && !adapter.mcpLogin) return { ...status, authStatus: 'unsupported', error: adapter.mcpSignInHint?.(server) ?? `${adapter.name} signs in to ${server.name} itself the first time it uses it.` }
      return status
    }))
    return { data: statuses.sort((a, b) => a.name.localeCompare(b.name)), nextCursor: null }
  }

  async function toolsList(params) {
    const cwd = params?.threadId ? threads.get(params.threadId)?.cwd : params?.cwd
    const servers = mcpServersFor(cwd ?? null).filter((server) => !server.trustRequired).map(withAgentAuth)
    const probes = await Promise.all(servers.map((server) => probeMcpServer(server).catch(() => null)))
    const summary = (text) => (typeof text === 'string' ? text.trim().split('\n')[0].slice(0, 200) : '')
    // A tool the agent's own settings keep off (Kimi's [tools] enabled / disabled): disabledReason says so, and the
    // session's switch cannot turn it on.
    const offReason = (name, mcp = null) => { try { return adapter.toolOffReason?.(ctx, name, mcp) ?? null } catch (error) { log(`tool policy: ${error?.message ?? error}`); return null } }
    const withReason = (row, reason) => (reason ? { ...row, disabledReason: reason } : row)
    return {
      tools: (adapter.builtinTools?.(ctx) ?? []).map((tool) => withReason({ name: tool.name, kind: tool.name === 'skill' || tool.name === 'Skill' || tool.name === 'activate_skill' ? 'skill' : 'builtin', description: summary(tool.description) }, tool.disabledReason ?? null)).sort((a, b) => a.name.localeCompare(b.name)),
      servers: servers.map((server, index) => ({ name: server.name, tools: (probes[index]?.tools ?? []).map((tool) => withReason({ name: `mcp__${server.name}__${tool.name}`, tool: tool.name, description: summary(tool.description) }, offReason(`mcp__${server.name}__${tool.name}`, { server: server.name, tool: tool.name }))).sort((a, b) => a.tool.localeCompare(b.tool)) })).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }

  /** The signed-in account's profile from the agent's service (Kimi: name, membership, region), cached a while. */
  async function profileOf(info) {
    if (!adapter.accountProfile || info.kind !== 'oauth') return null
    const fresh = accountProfile && Date.now() - accountProfile.at < (accountProfile.value ? 600000 : 60000)
    if (!fresh) {
      let value = null
      try { value = await adapter.accountProfile(ctx, info) } catch (error) { log(`account profile: ${error?.message ?? error}`) }
      accountProfile = { at: Date.now(), value }
    }
    return accountProfile.value
  }

  async function accountRead() {
    if (!adapter) return { account: null, requiresOpenaiAuth: false }
    let info
    // lastCwd: the folder of the session last started or opened (an agent that reads a project .env, Gemini, counts it).
    try { info = adapter.account(ctx, { cwd: lastCwd }) } catch (error) { info = { kind: null, label: adapter.name, hint: error?.message } }
    const profile = await profileOf(info)
    if (profile) info = { ...info, ...Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== null && value !== undefined && value !== '')) }
    // An account sign-in is Codex's 'chatgpt' account shape; its plan only when the agent names one (no 'unknown' row).
    const plan = typeof info.plan === 'string' && info.plan && info.plan !== 'unknown' ? info.plan : null
    const account = info.kind === 'oauth' ? { type: 'chatgpt', email: info.email ?? null, planType: plan } : info.kind === 'apiKey' ? { type: 'apiKey' } : null
    return {
      account,
      // The agent answers only with a sign-in or a key it can find: without one, it needs a sign-in (Codex's field).
      requiresOpenaiAuth: !account,
      // Bridge extension: the agent's own account facts for the account menu (Codex readers ignore it).
      codeDesktop: {
        core: adapter.id, coreName: adapter.name, label: info.label ?? adapter.name, kind: info.kind ?? null, email: info.email ?? null,
        detail: info.detail ?? null, method: info.method ?? null, hint: info.hint ?? null,
        canSignIn: Boolean(adapter.login || adapter.connectProvider), canSignOut: Boolean(adapter.logout) && info.kind === 'oauth', signInType: adapter.login?.type ?? null,
      },
    }
  }

  // account/rateLimits/updated after turns (rate-limit-watch.js, shared with the ZCode bridge).
  const quotaWatch = new RateLimitWatch({ read: () => rateLimits(), notify, log })

  async function rateLimits() {
    const empty = { limitId: null, limitName: null, normalModelSlug: null, primary: null, secondary: null, credits: null, individualLimit: null, spendControlReached: null, planType: null, rateLimitReachedType: null }
    let snapshot = null
    try { snapshot = (await adapter?.rateLimits?.(ctx)) ?? null } catch (error) { log(`rate limits: ${error?.message ?? error}`) }
    // The plan the account's profile names (Kimi's membership) when the limits carry none.
    if (snapshot && !snapshot.planType && accountProfile?.value?.plan) snapshot = { ...snapshot, planType: accountProfile.value.plan }
    // snapshot.extra: further buckets of the same account (Kimi's monthly limit), keyed by their own limitId.
    const extra = Array.isArray(snapshot?.extra) ? snapshot.extra.filter((entry) => entry && typeof entry.limitId === 'string') : []
    if (snapshot) { snapshot = { ...snapshot }; delete snapshot.extra }
    const rateLimits = snapshot ? { ...empty, ...snapshot } : empty
    const byId = snapshot ? { [snapshot.limitId ?? adapter.id]: rateLimits, ...Object.fromEntries(extra.map((entry) => [entry.limitId, { ...empty, ...entry }])) } : null
    return { ordinaryUsageAllowed: null, rateLimits, rateLimitsByLimitId: byId, rateLimitResetCredits: null, accountId: null, rateLimitUpsell: null }
  }

  // ------------------------------------------------------------ login

  /** A sign-in or sign-out: the models (and their efforts) the account offers are discovered again. */
  function accountChanged() {
    store.setCache('modelRows', null)
    store.setCache('modelEfforts', null)
    accountProfile = null
    notify('account/updated', { authMode: null })
  }

  async function loginStart(params) {
    requireAgent()
    // An API key for an agent that sets providers up itself (Qwen Code: qwen/providers/connect). The key goes to the
    // agent's own config; idle threads restart on it and account/updated follows.
    if (params?.type === 'apiKey') {
      if (!adapter.connectProvider) throw new RpcError(INVALID_PARAMS, `${adapter.name} takes its API keys in its own settings.`)
      const apiKey = typeof params.apiKey === 'string' ? params.apiKey.trim() : ''
      if (!apiKey || apiKey.length > 4096 || /[\x00-\x1f\x7f]/.test(apiKey)) throw new RpcError(INVALID_PARAMS, 'Enter a valid API key.')
      try { await adapter.connectProvider(ctx, { template: params?.codeDesktop?.template, apiKey }) }
      catch (error) { throw new RpcError(INVALID_PARAMS, error?.message ?? String(error)) }
      for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
      accountChanged()
      return { type: 'apiKey' }
    }
    const spec = adapter.login
    if (!spec) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} signs in with an API key in its own settings.`)
    const type = params?.type
    if (type !== spec.type && !(spec.type === 'chatgptDeviceCode' && type === 'chatgpt')) throw new RpcError(INVALID_PARAMS, `${adapter.name} signs in with ${spec.type === 'chatgpt' ? 'a browser page' : 'a device code'}.`)
    const loginId = randomUUID()
    const result = await adapter.startLogin(ctx, { loginId, codeDesktop: params?.codeDesktop && typeof params.codeDesktop === 'object' ? params.codeDesktop : null, onDone: (success, error) => {
      logins.delete(loginId)
      notify('account/login/completed', { loginId, success, error: error ?? null })
      if (success) accountChanged()
    } })
    logins.set(loginId, result)
    if (spec.type === 'chatgpt') return { type: 'chatgpt', loginId, authUrl: result.url }
    return { type: 'chatgptDeviceCode', loginId, verificationUrl: result.url, userCode: result.code }
  }

  // ------------------------------------------------------------ preview

  async function systemPromptPreview(params) {
    await prepare()
    const cwd = await normalizeCwd(params?.cwd)
    const byId = typeof params?.threadId === 'string' ? threads.get(params.threadId) : null
    const custom = customizationOf(params) ?? {}
    const draft = { cwd, model: byId?.model ?? params?.model ?? null, custom: { ...(byId?.custom ?? {}), ...custom }, developerInstructions: byId?.developerInstructions ?? null, tools: byId?.tools ?? null, permission: byId?.permission ?? { mode: 'auto', writableRoots: [] }, id: byId?.id ?? 'preview' }
    const render = async (customization) => {
      if (!adapter.previewEnv) return null
      const dir = path.join(stateDir, 'preview', randomUUID())
      fs.mkdirSync(dir, { recursive: true })
      const file = path.join(dir, 'assembled.md')
      const config = { ...launchConfig({ ...draft, custom: customization }), threadDir: dir, sandbox: 'none', appToolsEntry: null }
      const launch = adapter.launch(ctx, config)
      const line = commandLine(program, launch.args)
      const host = new AgentHost({ stopSignal: adapter?.stopSignal, ...line, env: { ...agentEnv, ...launch.env, ...adapter.previewEnv(file) }, cwd, clientCapabilities: adapter.clientCapabilities, log, label: `${adapter.id}-preview` })
      try {
        await host.start()
        const created = await host.call('session/new', { cwd, mcpServers: [] }, 60000)
        for (let wait = 0; wait < 40 && !fs.existsSync(file); wait++) await new Promise((resolve) => setTimeout(resolve, 100))
        const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
        void (async () => { try { await host.stop(); await removeAgentSession(created.sessionId, cwd) } catch {} fs.rmSync(dir, { recursive: true, force: true }) })()
        return text
      } catch (error) {
        void host.stop()
        fs.rmSync(dir, { recursive: true, force: true })
        throw agentError(error, host)
      }
    }
    const config = launchConfig(draft)
    let text = null, defaultText = null, exact = false
    if (adapter.previewEnv) {
      ;[text, defaultText] = await Promise.all([render(draft.custom), render({ systemPrompt: null, instructions: null, persona: null, modelParams: null })])
      exact = text !== null
    }
    if (text === null) text = [config.systemPrompt ?? '(the agent\'s built-in system prompt)', config.appendPrompt].filter(Boolean).join('\n\n')
    return {
      text, defaultText: defaultText ?? '', defaultTemplate: defaultText ?? '', custom: Boolean(config.systemPrompt), exact,
      sections: [...(config.systemPrompt ? [{ name: 'code-desktop:system-prompt', chars: config.systemPrompt.length }] : []), ...(config.appendPrompt ? [{ name: 'code-desktop:custom-instructions', chars: config.appendPrompt.length }] : [])],
      tools: (adapter.builtinTools?.() ?? []).map((tool) => tool.name).filter((name) => !(draft.tools?.disabled ?? []).includes(name)),
      variables: { provider: adapter.name, model: draft.model, cwd }, cwd, threadId: byId?.id ?? null,
    }
  }

  // ------------------------------------------------------------ side question

  async function sideQuestion(params) {
    await prepare()
    const id = requireId(params.threadId)
    const question = typeof params.question === 'string' ? params.question.trim() : ''
    if (!question) throw invalidParams('question is required')
    const requestId = typeof params.requestId === 'string' && params.requestId ? params.requestId : randomUUID()
    const turns = await turnsOf(id)
    const transcript = sessionTranscript(turns)
    const live = threads.get(id)
    const model = live?.model ?? store.get(id).model ?? null
    const controller = { cancelled: false, host: null }
    sideQuestions.get(requestId)?.cancel?.()
    sideQuestions.set(requestId, { cancel: () => { controller.cancelled = true; void controller.host?.stop() } })
    try {
      // Qwen answers side questions itself over the loaded session (qwen/control/session/btw).
      if (adapter.sideQuestion && live?.host && live.sessionReady && !live.running) {
        const text = await adapter.sideQuestion(ctx, id, question, live.host)
        if (text) notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text })
        return { requestId, text, finish: 'stop', model, contextMessages: transcript.messages, truncated: transcript.truncated }
      }
      // Otherwise: a throwaway session with no tools whose only input is the transcript.
      const dir = path.join(stateDir, 'side', randomUUID())
      fs.mkdirSync(dir, { recursive: true })
      // The user's own system prompt, when set, replaces ours here too.
      const custom = live?.custom?.systemPrompt ? interpolate(live.custom.systemPrompt, { model: model ?? '', cwd: live.cwd, provider: adapter.name }) : null
      const config = { threadDir: dir, systemPrompt: custom ?? SIDE_QUESTION_SYSTEM, appendPrompt: null, disabledTools: (adapter.builtinTools?.() ?? []).map((tool) => tool.name), disabledServers: mcpServersFor(null).map((server) => server.name), modelParams: null, model, sandbox: 'read-only', writable: [], cwd: dir, sideQuestion: true, ephemeral: true }
      const launch = adapter.launch(ctx, config)
      const line = commandLine(program, launch.args)
      const wrapped = wrapLaunch(line, { profile: 'read-only', writable: [], agentPaths: [...adapter.agentPaths(agentEnv), stateDir, dir], profileFile: path.join(dir, 'agent.sb'), ...sandboxExtras() })
      let text = ''
      const host = new AgentHost({ stopSignal: adapter?.stopSignal, command: wrapped.command, args: wrapped.args, env: { ...agentEnv, ...launch.env, ...(launch.sideEnv ?? {}) }, cwd: dir, clientCapabilities: {}, handlers: { permission: async (request) => selected(optionFor(request.options, 'reject_once', 'reject_always')) }, log, label: `${adapter.id}-btw` })
      controller.host = host
      let sessionId = null
      try {
        await host.start()
        const created = await host.call('session/new', { cwd: dir, mcpServers: [] }, 60000)
        sessionId = created.sessionId
        // A session nobody lists (adapter.hiddenSession: MiniMax titles it, so its title model is never called for it).
        try { adapter.hiddenSession?.(ctx, { launch, sessionId }) } catch (error) { log(`side question session: ${error?.message ?? error}`) }
        if (model) {
          try {
            // The model option changes this session only (Qwen's session/set_model also rewrites its global default).
            const option = modelOption({ acp: { configOptions: created.configOptions ?? null } })
            if (option) { if (option.currentValue !== model) await host.call('session/set_config_option', { sessionId, configId: option.id, value: model }, 20000) }
            else if (created.models && created.models.currentModelId !== model) await host.call('session/set_model', { sessionId, modelId: model, _meta: { 'qwen.session.modelPersistDefault': false } }, 20000)
          } catch {}
        }
        host.attach(sessionId, (update) => {
          const filtered = adapter.filterUpdate ? adapter.filterUpdate(update) : { update }
          if (filtered.drop || filtered.update?.sessionUpdate !== 'agent_message_chunk') return
          const delta = blockText(filtered.update.content)
          if (!delta) return
          text += delta
          notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text: delta })
        })
        const prompt = sideQuestionPrompt({ transcript: transcript.text, history: Array.isArray(params.history) ? params.history.slice(-20) : [], question })
        await host.call('session/prompt', { sessionId, prompt: [{ type: 'text', text: prompt }] }, 0)
        return { requestId, text, finish: 'stop', model, contextMessages: transcript.messages, truncated: transcript.truncated }
      } catch (error) {
        if (controller.cancelled) return { requestId, text, finish: 'cancelled', model, contextMessages: transcript.messages, truncated: transcript.truncated }
        throw agentError(error, host)
      } finally {
        void (async () => {
          await host.stop().catch(() => {})
          if (sessionId && adapter.sessionFeatures?.deleteHistory !== false) await removeAgentSession(sessionId, dir).catch(() => {})
          fs.rmSync(dir, { recursive: true, force: true })
        })()
      }
    } finally {
      sideQuestions.delete(requestId)
    }
  }

  // ------------------------------------------------------------ dispatcher

  function capabilities() {
    const can = adapter?.sessionFeatures ?? {}
    const unsupported = []
    if (!can.fork) unsupported.push('thread/fork')
    if (!can.revert) unsupported.push('thread/revert')
    if (!adapter?.compactCommand) unsupported.push('thread/compact/start')
    let perToken = false
    try { perToken = adapter?.account(ctx)?.perToken === true } catch {}
    return {
      unsupportedMethods: unsupported,
      customization: true,
      // An adapter that reads no config.modelParams says so (MiniMax): Max output tokens and Temperature then hide.
      modelParams: adapter ? adapter.modelParams !== false : false,
      permissionHints: true,
      systemPromptPreview: true,
      livePermissions: true,
      toolSelection: true,
      // Claude tool names → this agent's tool ids that codeDesktop.tools.disabled turns off (the workflow runner's
      // disallowedTools on a bridge core, toolNarrowing.js).
      ...(adapter?.workflowToolSwitches ? { workflowToolSwitches: adapter.workflowToolSwitches } : {}),
      codeStats: true,
      structuredOutput: false,
      // The agent's own dynamic workflows (Qwen's workflow tool) as item.workflowRun, stopped by codeDesktop/workflow/stop.
      modelWorkflows: Boolean(adapter?.workflowRun),
      // codeDesktop/promptSuggestion: an adapter whose agent suggests a next prompt (Qwen's follow-up suggestions).
      ...(adapter?.promptSuggestions ? { promptSuggestion: true } : {}),
      skillToggle: Boolean(adapter?.setSkillEnabled),
      mcpConfigWrite: Boolean(adapter?.writeMcpServer),
      pluginManage: Boolean(adapter?.pluginCommand),
      // Plugins can be turned on/off and removed, but installed only in the agent's own CLI (Kimi: /plugins).
      pluginInstall: Boolean(adapter?.pluginCommand) && adapter?.pluginInstall !== false,
      // codeDesktop/plugin/update: the agent updates an installed extension (Qwen's `extensions update`).
      pluginUpdate: Boolean(adapter?.pluginCommand && adapter?.pluginUpdate),
      hooksList: Boolean(adapter?.hooks),
      // codeDesktop/hooks/setEnabled switches one listed hook in the agent's own settings (Gemini: hooksConfig.disabled).
      hooksToggle: Boolean(adapter?.setHookEnabled),
      // codeDesktop/migration/read|run: the agent's own import of an older install (Kimi Code: `kimi migrate`).
      legacyMigration: Boolean(adapter?.migration && adapter?.runMigration),
      // codeDesktop/turn/continue: Try again resumes the failed turn the agent's own way (Qwen's session continue).
      continueTurn: Boolean(adapter?.continueCheck),
      // plugin/list: the agent's own plugin catalog (MiniMax), installed by name through codeDesktop/plugin/install.
      pluginCatalog: Boolean(adapter?.availablePlugins),
      // review/start runs read-only (runTurn's 'review' mode), whatever the session's mode.
      reviewReadOnly: 'noEdits',
      // codeDesktop/agents/list: the agent's own sub-agents (Qwen).
      agentsList: Boolean(adapter?.agents),
      // codeDesktop/workspace/trust: the agent loads a folder's own connectors only once it is trusted (Kimi).
      workspaceTrust: Boolean(adapter?.trustWorkspace),
      // /compact [instructions] reaches the agent's compact command (Kimi).
      compactInstructions: Boolean(adapter?.compactCommand && adapter?.compactInstructions),
      deleteHistory: can.deleteHistory !== false,
      // thread/fork honours lastTurnId ('Fork from here' on an earlier message): the fork is rewound with the agent's
      // own rewind, so an agent without one forks only whole conversations.
      forkAtTurn: Boolean(can.fork && can.revert && adapter?.revertSession),
      // thread/fork honours cwd (/cd): the agent can move a live session to another folder (Qwen's session/cd).
      forkCwd: Boolean(can.fork && adapter?.changeDirectory),
      unloadOnNavigate: true,
      perTokenBilling: perToken,
      providerSettings: false,
      harnessProfile: false,
      sideQuestion: true,
      // Rewind can also put the agent's file edits back (adapter.revertFiles: Gemini's /rewind 'revert file changes').
      // sessionFeatures.revertFiles 'live': the agent's own rewind restores its checkpoints too (Qwen's file history).
      rewindFiles: (Boolean(adapter?.revertFiles) || can.revertFiles === 'live') && Boolean(can.revert),
      // The agent's own goals (Qwen /goal): the app's goal strip and /goal (thread/goal/get|set|clear).
      goals: Boolean(adapter?.goalSet),
      // A connector sign-out the agent runs (codeDesktop/mcpServer/logout: Qwen's clear-auth).
      mcpLogout: Boolean(adapter?.mcpLogout),
      // codeDesktop/skills/install|delete: the agent's own managed skills (Qwen's qwen/skills/*).
      skillInstall: Boolean(adapter?.installSkill && adapter?.deleteSkill),
      // feedback/upload reaches the agent's own feedback (adapter.feedback: Kimi Code's managed /feedback, Gemini CLI's
      // bug report URL, which the app opens).
      feedbackUpload: Boolean(adapter?.feedback),
      // hooks/list answers the agent's own hooks (adapter.hooks: Kimi's and Qwen's), shown in Customize › Hooks.
      hooksList: Boolean(adapter?.hooks),
      // codeDesktop/hooks/setEnabled switches one listed hook in the agent's own settings (Gemini: hooksConfig.disabled).
      hooksToggle: Boolean(adapter?.setHookEnabled),
      // codeDesktop/migration/read|run: the agent's own import of an older install (Kimi Code: `kimi migrate`).
      legacyMigration: Boolean(adapter?.migration && adapter?.runMigration),
      // codeDesktop/turn/continue: Try again resumes the failed turn the agent's own way (Qwen's session continue).
      continueTurn: Boolean(adapter?.continueCheck),
      // codeDesktop/sessionLog/export: /export also saves the agent's own session archive (Kimi's `kimi export` ZIP).
      sessionLogExport: Boolean(adapter?.sessionLogExport),
      // codeDesktop/mentions/list: what the agent's `@` names besides files (Qwen's @mcp: / @ext:), for the app's @ menu.
      mentionTargets: Boolean(adapter?.mentionTargets),
      // codeDesktop/plugin/mcpServer/setEnabled: a plugin's MCP servers switched one by one (Kimi).
      pluginServerToggle: Boolean(adapter?.pluginServerToggle),
      // Settings › Code › '{core} settings' (codeDesktop/coreSettings/read|write).
      coreSettings: Boolean(adapter?.coreSettings),
      // An agent title (session_info_update) names the thread unless the user named it.
      generatesTitles: true,
      backgroundTerminals: adapter?.clientCapabilities?.terminal === true || Boolean(adapter?.backgroundProcesses),
      sandbox: sandboxAvailable() ? 'seatbelt' : 'none',
      // The Seatbelt profile confines writes only; network stays allowed (sandbox.js).
      sandboxNetwork: 'always',
    }
  }

  // The stored core settings: the adapter's own reader (MiniMax's config.yaml), else its JSON settings file.
  const readCoreSettings = () => (adapter.coreSettings.read ? adapter.coreSettings.read(agentEnv) : readJsonFile(adapter.coreSettings.file(agentEnv), {})) ?? {}
  function writeCoreSetting(key, value) {
    if (adapter.coreSettings.write) return adapter.coreSettings.write(agentEnv, key, value)
    const file = adapter.coreSettings.file(agentEnv)
    writeJsonFile(file, withSetting(readJsonFile(file, {}) ?? {}, key, value))
  }

  /** The adapter's core settings, a select whose options are 'models' filled with the agent's model ids (no "(auth)" suffix). */
  async function coreSettingDefs() {
    const defs = adapter.coreSettings.defs
    if (!defs.some((def) => def.options === 'models')) return defs
    let ids = []
    try { ids = [...new Set(((await modelList())?.data ?? []).map((entry) => String(entry.id ?? entry.model ?? '').replace(/\(.*\)$/, '').trim()).filter(Boolean))] } catch (error) { log(`core settings models: ${error?.message ?? error}`) }
    // A model already chosen stays listed even when the running list doesn't offer it (another auth type, a removed provider).
    const stored = readCoreSettings()
    return defs.map((def) => {
      if (def.options !== 'models') return def
      const current = settingAt(stored, def.key)
      return { ...def, options: typeof current === 'string' && current && !ids.includes(current) ? [...ids, current] : ids }
    })
  }

  async function handle(method, params) {
    if (closed) throw new RpcError(SERVER_ERROR, 'OpenClaude Desktop core is shutting down.')
    switch (method) {
      case 'initialize': {
        clientReady = true
        if (adapter && program.binary && !version) version = agentVersion(program, agentEnv)
        if (adapter && !program.binary) initError = null
        return {
          userAgent: `code-desktop-acp-bridge/${BRIDGE_VERSION} (${adapter?.id ?? 'unknown'} ${version}; ${process.platform})`,
          codexHome: adapter ? adapter.home(agentEnv) : stateDir,
          platformFamily: process.platform === 'win32' ? 'windows' : 'unix',
          platformOs: process.platform === 'darwin' ? 'macos' : process.platform,
          engine: adapter?.engine ?? 'acp',
          engineVersion: version || null,
          capabilities: capabilities(),
          configPath: adapter?.configFile?.(agentEnv) ?? null,
          // Where its MCP servers live when that isn't the main config (Kimi: mcp.json).
          ...(adapter?.mcpConfigFile ? { mcpConfigPath: adapter.mcpConfigFile(agentEnv) } : {}),
          ...(adapter && !program.binary ? { warning: `${adapter.name} is not installed.` } : {}),
        }
      }
      case 'model/list':
        requireAgent()
        return { data: await modelList(), nextCursor: null }
      case 'account/read':
        return await accountRead()
      case 'account/rateLimits/read':
        return quotaWatch.observe(await rateLimits())
      case 'account/usage/read':
        mergeAgentUsage()
        return ledger.accountUsage(localDayKey())
      case 'codeDesktop/appTools/changed': {
        if (appTools) appToolsRevision += 1
        return {}
      }
      case 'codeDesktop/stats/read':
        mergeAgentUsage()
        return ledger.codeStats()
      case 'account/login/start':
        return loginStart(params)
      case 'account/login/cancel': {
        const login = logins.get(params?.loginId)
        if (!login) return { status: 'notFound' }
        login.cancel?.()
        logins.delete(params.loginId)
        return { status: 'canceled' }
      }
      case 'codeDesktop/skills/install':
      case 'codeDesktop/skills/delete': {
        requireAgent()
        if (!adapter.installSkill || !adapter.deleteSkill) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can’t add or delete skills from here.`)
        const slug = String(params?.slug ?? '').trim()
        if (!/^[A-Za-z0-9._-]{1,64}$/.test(slug) || slug === '.' || slug === '..') throw invalidParams('Use letters, digits, dots, dashes or underscores for the skill name.')
        if (method.endsWith('install')) {
          const url = String(params?.url ?? '').trim()
          if (!/^https:\/\/\S+$/.test(url)) throw invalidParams('Enter the https:// address of a SKILL.md file.')
          await adapter.installSkill(ctx, { url, slug })
        } else await adapter.deleteSkill(ctx, { slug })
        notify('skills/changed', {})
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        return { slug }
      }
      case 'feedback/upload': {
        requireAgent()
        if (!adapter.feedback) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no feedback channel here.`)
        const thread = typeof params?.threadId === 'string' ? threads.get(params.threadId) : null
        return adapter.feedback(ctx, { classification: params?.classification ?? 'other', reason: params?.reason ?? null, threadId: params?.threadId ?? null, model: thread?.model ?? null, includeLogs: params?.includeLogs === true })
      }
      case 'account/logout':
        requireAgent()
        if (!adapter.logout) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no sign-out; remove the API key from its settings.`)
        await adapter.logout(ctx)
        accountChanged()
        return {}
      case 'configRequirements/read': {
        // An agent policy that forbids its YOLO mode (Gemini's disableYoloMode / secure mode): Codex's requirements
        // shape without 'never', so the app shows Bypass as disabled by the organization and refuses it in main.
        let policy = null
        try { policy = adapter?.policy?.(ctx) ?? null } catch {}
        return { requirements: policy?.disableYolo ? { allowedApprovalPolicies: ['untrusted', 'on-failure', 'on-request'], allowedSandboxModes: ['read-only', 'workspace-write'] } : null }
      }
      case 'config/read': {
        const cwd = typeof params.cwd === 'string' ? params.cwd : null
        const latest = [...threads.values()].filter((thread) => !cwd || thread.cwd === cwd).at(-1)
        const servers = {}
        for (const server of mcpServersFor(cwd)) servers[server.name] = mcpTable(server)
        return { config: { sandbox_mode: latest?.permission.sandbox ?? 'workspace-write', approval_policy: latest?.permission.approvalPolicy ?? 'on-request', mcp_servers: servers }, origins: {}, layers: null }
      }
      case 'config/batchWrite': {
        requireAgent()
        if (!adapter.writeMcpServer) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} connectors are edited in its own config.`)
        for (const edit of Array.isArray(params.edits) ? params.edits : []) {
          const match = /^mcp_servers\.(.+)$/.exec(String(edit?.keyPath ?? ''))
          if (!match) throw invalidParams(`Only mcp_servers.<name> can be written on ${adapter.name}.`)
          adapter.writeMcpServer(ctx, match[1], edit.value ?? null)
        }
        clearMcpCache(); promptCommandCache.clear()
        return { status: 'ok', version: String(Date.now()), filePath: (adapter.mcpConfigFile ?? adapter.configFile)?.(agentEnv) ?? null, overriddenMetadata: null }
      }
      case 'config/mcpServer/reload':
        clearMcpCache(); promptCommandCache.clear()
        // Idle loaded threads pick the new servers up with a fresh process.
        for (const thread of threads.values()) if (!thread.running) { thread.hostKey = 'stale' }
        return {}
      case 'mcpServerStatus/list':
        requireAgent()
        return mcpStatusList(params)
      case 'mcpServer/oauth/login': {
        const server = typeof params?.name === 'string' ? mcpServersFor(null).find((entry) => entry.name === params.name) : null
        if (server && adapter?.mcpLogin) return mcpLogin(server)
        throw new RpcError(METHOD_NOT_FOUND, (server && adapter?.mcpSignInHint?.(server)) || `${adapter?.name ?? 'This core'} signs in to MCP servers itself the first time it uses them.`)
      }
      // Sign out of a connector the agent signed in to (adapter.mcpLogout: Qwen's clear-auth).
      case 'codeDesktop/mcpServer/logout': {
        requireAgent()
        const server = typeof params?.name === 'string' ? mcpServersFor(null).find((entry) => entry.name === params.name) : null
        if (!server) throw invalidParams(`There is no connector named ${params?.name ?? ''}.`)
        if (!adapter.mcpLogout) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no connector sign-out.`)
        await adapter.mcpLogout(ctx, server)
        for (const thread of threads.values()) if (!thread.running) { thread.hostKey = 'stale' }
        return {}
      }
      case 'skills/list':
        requireAgent()
        return skillsList(params)
      case 'skills/config/write': {
        requireAgent()
        if (!adapter.setSkillEnabled) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no per-skill switch.`)
        const skill = (adapter.skills?.(ctx, params.cwd ?? null) ?? []).find((entry) => entry.path === params.path)
        if (!skill) throw invalidParams('Unknown skill.')
        await prepare()
        await adapter.setSkillEnabled(ctx, skill.name, params.enabled === true, { ...skill, cwd: params.cwd ?? null })
        // Idle loaded threads read their skills again with a fresh process.
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        notify('skills/changed', {})
        return { effectiveEnabled: params.enabled === true }
      }
      case 'plugin/installed':
        requireAgent()
        await pluginsReady()
        return { marketplaces: [{ name: `${adapter.id}-extensions`, path: adapter.home(agentEnv), interface: { displayName: `${adapter.name} extensions` }, plugins: (await adapter.plugins?.(ctx, Array.isArray(params?.cwds) && typeof params.cwds[0] === 'string' ? params.cwds[0] : null)) ?? [] }], marketplaceLoadErrors: [] }
      case 'plugin/read': {
        requireAgent()
        await pluginsReady()
        const plugin = ((await adapter.plugins?.(ctx)) ?? []).find((entry) => entry.name === params.pluginName || entry.id === params.pluginName)
        if (!plugin) throw invalidParams(`Unknown plugin: ${params.pluginName}`)
        let detail = null
        try { detail = adapter.pluginDetail?.(ctx, plugin) ?? null } catch (error) { log(`plugin detail: ${error?.message ?? error}`) }
        return { plugin: { marketplaceName: `${adapter.id}-extensions`, marketplacePath: adapter.home(agentEnv), summary: plugin, shareUrl: null, description: plugin.interface.shortDescription || null, skills: detail?.skills ?? [], hooks: detail?.hooks ?? [], apps: [], appTemplates: [], mcpServers: detail?.mcpServers ?? plugin.codeDesktop?.mcpServers ?? [], scheduledTasks: null } }
      }
      case 'plugin/list': {
        // An agent with its own plugin catalog (MiniMax: `mcode plugin list --available`): installed and available together,
        // as Codex's plugin/list answers, for Customize › Plugins' Available section.
        requireAgent()
        if (!adapter.availablePlugins) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no plugin catalog.`)
        await pluginsReady()
        const installed = ((await adapter.plugins?.(ctx)) ?? []).map((plugin) => ({ ...plugin, installed: true }))
        let available = [], errors = []
        try { available = (await adapter.availablePlugins(ctx)).map((plugin) => ({ ...plugin, installed: false })) }
        catch (error) { errors = [{ marketplacePath: adapter.home(agentEnv), message: String(error?.stderr || error?.message || error).trim().slice(-500) }] }
        return { marketplaces: [{ name: `${adapter.id}-catalog`, path: adapter.home(agentEnv), interface: { displayName: `${adapter.name} plugins` }, plugins: [...installed, ...available] }], marketplaceLoadErrors: errors, featuredPluginIds: [] }
      }
      case 'codeDesktop/plugin/inspect': {
        requireAgent()
        const problem = adapter.pluginSpecProblem?.(params.spec) ?? null
        return { spec: params.spec, kind: adapter.id, installable: Boolean(adapter.pluginCommand) && adapter.pluginInstall !== false && !problem, ...(problem ? { reason: problem } : {}), name: String(params.spec ?? '').split('/').pop()?.replace(/\.git$/, '') ?? null }
      }
      case 'codeDesktop/plugin/registries':
        return { registry: null, fallbackRegistries: [], resolved: null }
      case 'codeDesktop/plugin/install':
      case 'codeDesktop/plugin/setEnabled':
      case 'codeDesktop/plugin/update':
      case 'codeDesktop/plugin/remove': {
        requireAgent()
        if (!adapter.pluginCommand) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no extension manager.`)
        // MiniMax's plugin commands run mcode itself, which needs its native modules (prepare) even before any session.
        if (adapter.ensureNativeDeps) await prepare()
        if (method.endsWith('update') && !adapter.pluginUpdate) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can’t update extensions from here.`)
        const op = method.endsWith('install') ? 'install' : method.endsWith('remove') ? 'remove' : method.endsWith('update') ? 'update' : params.enabled ? 'enable' : 'disable'
        const value = op === 'install' ? String(params.spec ?? '').trim() : String(params.pluginName ?? '')
        if (!value || value.startsWith('-')) throw invalidParams('A plugin name or source is required.')
        const problem = op === 'install' ? adapter.pluginSpecProblem?.(value) ?? null : null
        if (problem) throw invalidParams(problem)
        const requestId = typeof params.requestId === 'string' ? params.requestId : randomUUID()
        try {
          // scope 'workspace' + cwd: the agent's per-project switch (Gemini's extension enablement), else everywhere.
          const output = await adapter.pluginCommand(ctx, op, value, { scope: params.scope === 'workspace' || params.scope === 'user' ? params.scope : null, cwd: typeof params.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : null })
          if (output?.stdout) notify('codeDesktop/plugin/installLog', { requestId, stream: 'stdout', text: String(output.stdout).slice(-16384) })
        } catch (error) {
          throw new RpcError(SERVER_ERROR, `${adapter.name}: ${String(error?.stderr || error?.message || error).trim().slice(-2000)}`)
        }
        notify('codeDesktop/plugin/changed', { reason: op })
        notify('skills/changed', {})
        clearMcpCache(); promptCommandCache.clear()
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        return { status: 'ok', application: 'applied', requestId, name: value }
      }
      // One MCP server of an installed plugin on or off (adapter.pluginServerToggle: Kimi's setMcpServerEnabled).
      case 'codeDesktop/plugin/mcpServer/setEnabled': {
        requireAgent()
        if (!adapter.pluginServerToggle || !adapter.pluginCommand) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can't switch a plugin's connectors one by one.`)
        const name = typeof params.pluginName === 'string' ? params.pluginName : ''
        const server = typeof params.server === 'string' ? params.server : ''
        if (!name || !server || typeof params.enabled !== 'boolean') throw invalidParams('pluginName, server and enabled are required.')
        try { await adapter.pluginCommand(ctx, params.enabled ? 'mcp-enable' : 'mcp-disable', name, { server }) }
        catch (error) { throw new RpcError(SERVER_ERROR, `${adapter.name}: ${String(error?.message || error).trim().slice(-2000)}`) }
        clearMcpCache(); promptCommandCache.clear()
        notify('codeDesktop/plugin/changed', { reason: 'mcpServer' })
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        return { status: 'ok', name, server, enabled: params.enabled }
      }
      case 'codeDesktop/plugin/cancelInstall':
        return { status: 'notFound' }
      case 'codeDesktop/agents/list': {
        // The agent's own sub-agents (Qwen: built-in ones and .qwen/agents files) for Customize.
        requireAgent()
        if (!adapter.agents) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no sub-agent list.`)
        const cwd = typeof params.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : null
        return { agents: adapter.agents(ctx, cwd) ?? [] }
      }
      case 'codeDesktop/workspace/trust': {
        // Trust a folder as the agent's own trust prompt does (Kimi: workspace-trust record); its project connectors
        // load when its sessions next start, so idle ones restart now.
        if (!adapter?.trustWorkspace) throw new RpcError(METHOD_NOT_FOUND, `${adapter?.name ?? 'This agent'} has no folder trust.`)
        const cwd = await normalizeCwd(params.cwd)
        adapter.trustWorkspace(ctx, cwd)
        clearMcpCache(); promptCommandCache.clear()
        for (const thread of threads.values()) if (thread.cwd === cwd && !thread.running && thread.host && !thread.host.exited) void stopHost(thread).catch(() => {})
        return { trusted: true, cwd }
      }
      case 'codeDesktop/mentions/list': {
        // What the agent's own `@` can name besides files (adapter.mentionTargets: Qwen's @mcp:<server> / @ext:<name>),
        // for the app's @ menu; the app inserts each target's text as typed.
        requireAgent()
        if (!adapter.mentionTargets) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no @ targets besides files.`)
        const cwd = typeof params.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : null
        const data = (adapter.mentionTargets(ctx, cwd) ?? []).filter((entry) => entry && typeof entry.name === 'string' && typeof entry.text === 'string').slice(0, 200)
          .map((entry) => ({ kind: entry.kind === 'extension' ? 'extension' : 'mcp', name: entry.name.slice(0, 120), text: entry.text.slice(0, 160), description: typeof entry.description === 'string' ? entry.description.slice(0, 200) : '' }))
        return { data }
      }
      case 'codeDesktop/migration/read': {
        requireAgent()
        if (!adapter.migration) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has nothing to bring over.`)
        return { migration: adapter.migration(ctx) ?? null }
      }
      case 'codeDesktop/migration/run': {
        requireAgent()
        if (!adapter.runMigration) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has nothing to bring over.`)
        if (!adapter.migration?.(ctx)) throw invalidParams('There is nothing left to bring over.')
        const result = await adapter.runMigration(ctx, { configOnly: params?.configOnly === true })
        // Moved config, connectors and sessions: idle sessions restart, caches and the session list are read again.
        clearMcpCache(); promptCommandCache.clear()
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        return { complete: result?.complete !== false, log: typeof result?.log === 'string' ? result.log.slice(0, 2000) : null }
      }
      case 'codeDesktop/hooks/setEnabled': {
        requireAgent()
        if (!adapter.setHookEnabled) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} hooks can’t be switched from here.`)
        if (typeof params.key !== 'string' || !params.key || typeof params.enabled !== 'boolean') throw invalidParams('key and enabled are required')
        const cwd = typeof params.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : null
        adapter.setHookEnabled(ctx, cwd, params.key, params.enabled)
        // A running agent read its hooks when it started: idle sessions restart with the change.
        for (const thread of threads.values()) if (!thread.running && thread.host && !thread.host.exited) void stopHost(thread).catch(() => {})
        return { key: params.key, enabled: params.enabled }
      }
      case 'hooks/list':
        // The agent's own hooks (Kimi: config.toml [[hooks]] and plugin hooks) as Codex HookMetadata.
        return { data: (Array.isArray(params.cwds) && params.cwds.length ? params.cwds : [os.homedir()]).map((cwd) => {
          try { return { cwd, hooks: adapter?.hooks?.(ctx, cwd) ?? [], warnings: [], errors: [] } } catch (error) { return { cwd, hooks: [], warnings: [], errors: [{ path: cwd, message: error?.message ?? String(error) }] } }
        }) }
      case 'codeDesktop/tools/list':
        requireAgent()
        return toolsList(params)
      case 'codeDesktop/systemPrompt/preview':
        return systemPromptPreview(params)
      case 'codeDesktop/sideQuestion':
        return sideQuestion(params)
      case 'codeDesktop/sideQuestion/cancel': {
        const entry = sideQuestions.get(params?.requestId)
        entry?.cancel?.()
        return { cancelled: Boolean(entry) }
      }
      case 'thread/start': {
        const thread = await createThread(params)
        const response = sessionResponse(thread)
        notify('thread/started', { thread: response.thread })
        return response
      }
      case 'thread/resume': {
        const thread = await openThread(requireId(params.threadId))
        if (typeof thread.cwd === 'string') lastCwd = thread.cwd
        const folderMessages = thread.host && !thread.host.exited ? [] : folderNotices(thread.cwd)
        applySettings(thread, params)
        const response = sessionResponse(thread, { includeTurns: params.excludeTurns !== true })
        setImmediate(() => warnFolder(thread, folderMessages))
        if (params.initialTurnsPage) response.initialTurnsPage = pageTurns(thread.projector.turns, params.initialTurnsPage, thread.projector)
        response.turnsBackwardsCursor = null
        response.itemsBackwardsCursor = null
        thread.publishStatus()
        setImmediate(() => {
          if (thread.usage.last || thread.usage.contextUsed) thread.publishUsage()
          if (thread.projector.plan?.length) notify('turn/plan/updated', { threadId: thread.id, turnId: thread.projector.turns.at(-1)?.id ?? '', explanation: null, plan: thread.projector.plan })
        })
        // The agent process starts in the background, so the first turn is quick.
        void ensureHost(thread).then(async () => { await applyAgentMode(thread); await applyModel(thread) }).catch((error) => log(`resume ${thread.id}: ${error?.message ?? error}`))
        return response
      }
      case 'thread/read': {
        const id = requireId(params.threadId)
        if (!store.has(id) && !threads.has(id)) {
          const found = (await listAgentSessions().catch(() => [])).find((session) => session.sessionId === id)
          if (!found) throw threadNotFound(id)
          store.update(id, { cwd: found.cwd ?? os.homedir(), createdAt: found.createdAt ?? Date.now(), updatedAt: found.updatedAt ?? Date.now(), agentTitle: found.title ?? null, preview: found.preview ?? null, source: 'agent' })
        }
        if (store.get(id).deleted) throw threadNotFound(id)
        if (params.includeTurns === true) await turnsOf(id)
        const child = [...threads.values()].flatMap((thread) => [...thread.children.values()]).find((entry) => entry.id === id)
        return { thread: threadObject(id, { includeTurns: params.includeTurns === true, child }) }
      }
      case 'thread/turns/list': {
        const id = requireId(params.threadId)
        if (store.get(id).deleted) throw threadNotFound(id)
        return pageTurns(await turnsOf(id), params, threads.get(id)?.projector)
      }
      case 'thread/items/list': {
        const id = requireId(params.threadId)
        let entries = (await turnsOf(id)).flatMap((turn) => turn.items.map((item) => ({ turnId: turn.id, item })))
        if (params.turnId) entries = entries.filter((entry) => entry.turnId === params.turnId)
        if (params.sortDirection === 'desc') entries.reverse()
        const start = params.cursor ? Number.parseInt(String(params.cursor), 10) || 0 : 0
        const size = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 200
        return { data: entries.slice(start, start + size), nextCursor: start + size < entries.length ? String(start + size) : null, backwardsCursor: null }
      }
      case 'thread/list':
        return listThreads(params)
      case 'thread/name/set': {
        const id = requireId(params.threadId)
        const name = typeof params.name === 'string' ? params.name.trim() : ''
        store.update(id, { name: name || null })
        if (name && adapter?.renameSession) {
          const live = threads.get(id)
          if (adapter.sessionFeatures?.profileOffline) void profileOp(id, (extra) => adapter.renameSession(ctx, id, name, null, extra), 'rename')
          else void adapter.renameSession(ctx, id, name, live?.sessionReady ? live.host : null).catch(() => {})
        }
        notify('thread/name/updated', { threadId: id, ...(name ? { threadName: name } : {}) })
        return {}
      }
      case 'thread/archive': {
        const id = requireId(params.threadId)
        store.update(id, { archived: true, archiveChangedAt: Date.now() })
        const live = threads.get(id)
        if (live && !live.running) { threads.delete(id); void closeThread(live).then(() => agentArchive(id, true)) }
        else void agentArchive(id, true)
        notify('thread/archived', { threadId: id })
        return {}
      }
      case 'thread/unarchive': {
        const id = requireId(params.threadId)
        if (!store.has(id) || store.get(id).deleted) throw threadNotFound(id)
        store.update(id, { archived: false, archiveChangedAt: Date.now() })
        void agentArchive(id, false)
        notify('thread/unarchived', { threadId: id })
        return { thread: threadObject(id) }
      }
      case 'thread/delete': {
        const id = requireId(params.threadId)
        await discardThread(id)
        notify('thread/deleted', { threadId: id })
        return {}
      }
      case 'thread/unsubscribe':
      case 'thread/close': {
        const id = requireId(params.threadId)
        const live = threads.get(id)
        const loaded = Boolean(live && !live.closing)
        if (loaded && method === 'thread/unsubscribe') await refreshBackground(live)
        // A session with work scheduled in its agent process (Qwen's cron jobs and /loop) stays loaded: closing it would
        // stop that work silently.
        let scheduled = false
        try { scheduled = method === 'thread/unsubscribe' && Boolean(live && adapter.keepLoaded?.(live)) } catch {}
        // Background commands (the agent's run_in_background shells in this bridge's terminals, or in processes of the
        // agent's own) die with the session's process: an unsubscribe while they run releases the session only once
        // they have finished, instead of killing a build or dev server the user started and walked away from.
        const background = method === 'thread/unsubscribe' && loaded && hasBackgroundWork(live)
        if (background) releaseWhenSettled(live)
        else if (loaded && !live.running && !live.pending.size && !live.queue.length && !scheduled) { threads.delete(id); void closeThread(live) }
        return method === 'thread/unsubscribe' ? { status: loaded ? 'unsubscribed' : 'notLoaded' } : {}
      }
      case 'turn/start': {
        if (params.outputSchema) throw new RpcError(INVALID_PARAMS, `${adapter?.name ?? 'This core'} cannot enforce an output schema.`)
        const thread = await openThread(requireId(params.threadId))
        applySettings(thread, params)
        const turnId = `turn-${randomUUID()}`
        const input = Array.isArray(params.input) ? params.input : []
        // A turn the agent just began on its own (adapter.agentTurnLog) makes this message wait for it.
        if (adapter.agentTurnLog && !thread.running) pollAgentTurns(thread)
        if (thread.running) {
          thread.queue.push({ id: randomUUID(), input, clientUserMessageId: params.clientUserMessageId ?? null, turnId })
          notify('thread/queue/changed', { threadId: thread.id })
        } else {
          void runTurn(thread, { input, turnId, clientId: params.clientUserMessageId ?? null })
        }
        return { turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: null, completedAt: null, durationMs: null } }
      }
      case 'codeDesktop/sessionLog/export': {
        // /export's ZIP: the agent's own archive of the session (adapter.sessionLogExport: Kimi's `kimi export`).
        requireAgent()
        if (!adapter.sessionLogExport) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can’t export session logs.`)
        const id = requireId(params.threadId)
        const target = typeof params.path === 'string' ? params.path : ''
        if (!path.isAbsolute(target) || !/\.zip$/i.test(target) || target.includes('\0')) throw invalidParams('Choose where to save the .zip file.')
        const live = threads.get(id)
        if (!live && (!store.has(id) || store.get(id).deleted)) throw threadNotFound(id)
        const meta = live?.meta ?? store.get(id)
        await adapter.sessionLogExport(ctx, id, target, { cwd: live?.agentCwd ?? meta.agentCwd ?? live?.cwd ?? meta.cwd ?? null })
        return { path: target }
      }
      case 'codeDesktop/turn/continue': {
        // Try again by the agent's own recovery (adapter.continueCheck: Qwen's qwen/control/session/continue) instead of
        // sending the failed prompt again. accepted false: nothing to resume, so the app sends the message again.
        requireAgent()
        if (!adapter.continueCheck) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can’t resume a turn.`)
        const thread = await openThread(requireId(params.threadId))
        if (thread.running) return { accepted: false }
        const host = await ensureHost(thread)
        let accepted = false
        try { accepted = await adapter.continueCheck(ctx, host, thread.id) } catch (error) { log(`continue check: ${error?.message ?? error}`) }
        if (!accepted) return { accepted: false }
        const turnId = `turn-${randomUUID()}`
        void runTurn(thread, { input: [], turnId, continuation: true })
        return { accepted: true, turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: null, completedAt: null, durationMs: null } }
      }
      case 'turn/steer': {
        const thread = await openThread(requireId(params.threadId))
        const active = thread.projector.activeTurn
        if (!thread.running || !active || (params.expectedTurnId && active.id !== params.expectedTurnId) || thread.compaction)
          throw new RpcError(INVALID_REQUEST, 'No active turn to steer.', { codexErrorInfo: 'activeTurnNotSteerable' })
        // An agent that pulls steered messages itself (adapter.steerDrain): they wait in the thread until it asks
        // between tool batches (drainSteer), as Codex's pending input does; the app shows them as pending meanwhile.
        if (adapter.steerDrain) {
          thread.steerBuffer ??= []
          thread.steerBuffer.push({ input: params.input, text: inputText(params.input), clientId: params.clientUserMessageId ?? null })
          return { turnId: active.id }
        }
        if (!adapter.steer) throw new RpcError(INVALID_REQUEST, `${adapter.name} cannot take input during a turn; it was queued instead.`, { codexErrorInfo: 'activeTurnNotSteerable' })
        await adapter.steer(ctx, thread.host, thread.id, inputText(params.input))
        const notes = []
        thread.projector.pushItem(notes, active, { type: 'userMessage', id: thread.projector.nextId('user'), clientId: params.clientUserMessageId ?? null, content: params.input }, Date.now())
        emit(notes)
        return { turnId: active.id }
      }
      case 'turn/interrupt': {
        const id = requireId(params.threadId)
        const thread = threads.get(id)
        if (thread) await interrupt(thread)
        // A MiniMax delegate: its root thread stops its delegations (mcode/session/delegation/stop).
        const meta = !thread && store.has(id) ? store.get(id) : null
        if (meta?.delegate && meta.rootThreadId && adapter.stopDelegation) {
          const root = threads.get(meta.rootThreadId)
          if (root?.host && !root.host.exited && root.sessionReady) await adapter.stopDelegation(ctx, root.host, root.id).catch((error) => log(`stop delegation: ${error?.message ?? error}`))
        }
        return {}
      }
      case 'thread/compact/start': {
        const thread = await openThread(requireId(params.threadId))
        if (!adapter.compactCommand) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} compacts its context on its own.`)
        if (thread.running) throw new RpcError(INVALID_REQUEST, 'Wait for the current turn to finish before compacting.', { codexErrorInfo: 'activeTurnNotSteerable' })
        // codeDesktop.instructions: /compact's own instructions, for an agent whose command takes them (Kimi's
        // `/compact [<instruction>]`, adapter.compactInstructions); one line, so the command stays a command.
        const instructions = adapter.compactInstructions && typeof params.codeDesktop?.instructions === 'string' ? params.codeDesktop.instructions.replace(/\s+/g, ' ').trim().slice(0, 4000) : ''
        const prompt = instructions ? `${adapter.compactCommand} ${instructions}` : adapter.compactCommand
        setImmediate(() => void runTurn(thread, { input: [], compaction: true, prompt }))
        return {}
      }
      case 'review/start': {
        const thread = await openThread(requireId(params.threadId))
        if (thread.running) throw new RpcError(INVALID_REQUEST, 'Wait for the current turn to finish before starting a review.')
        // The agent's own review command when it has one (adapter.reviewCommand: Qwen's /review skill), else the generic prompt.
        const turnId = `turn-${randomUUID()}`
        // An agent with a dedicated review run (adapter.reviewRun: MiniMax's `mcode exec review`) for this target: its
        // structured result becomes the turn's reply.
        const own = adapter.reviewRun?.(ctx, params.target ?? null, thread) ?? null
        if (own) {
          void runTurn(thread, { input: [{ type: 'text', text: own.label, text_elements: [] }], turnId, review: true, local: (state) => agentReview(thread, own, state) })
          return { turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: null, completedAt: null, durationMs: null }, reviewThreadId: thread.id }
        }
        const prompt = adapter.reviewCommand?.(params.target) ?? reviewPrompt(params.target)
        void runTurn(thread, { input: [{ type: 'text', text: prompt, text_elements: [] }], turnId, review: true })
        return { turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: null, completedAt: null, durationMs: null }, reviewThreadId: thread.id }
      }
      case 'thread/fork': {
        const source = await openThread(requireId(params.threadId))
        if (source.running) throw new RpcError(INVALID_REQUEST, 'Wait for the current turn to finish before forking.')
        // 'Fork from here': lastTurnId is the last turn the fork keeps. The agent forks the whole session, then the fork
        // is rewound to that turn with the agent's own rewind (its history, and what the model sees next, end there).
        const turns = source.projector.turns
        const named = typeof params.lastTurnId === 'string' && params.lastTurnId ? turns.findIndex((turn) => turn.id === params.lastTurnId) : -1
        if (named < 0 && typeof params.lastTurnId === 'string' && params.lastTurnId && turns.length) throw invalidParams('Unknown turn.')
        const keep = named >= 0 ? named + 1 : turns.length
        const partial = keep < turns.length
        if (partial && !(adapter.sessionFeatures?.revert && adapter.revertSession)) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} can fork only the whole conversation, not from an earlier message.`)
        // /cd: the fork continues in another folder when the agent can move a session (adapter.changeDirectory: Qwen).
        const target = typeof params.cwd === 'string' && params.cwd ? await normalizeCwd(params.cwd) : null
        const newId = await forkThread(source)
        // A fork with a home of its own (adapter.forkHome: MiniMax, whose home holds the mode's rules): never its source's.
        let ownHome = null
        if (adapter.forkHome) {
          try { ownHome = adapter.forkHome(ctx, { source, threadDir: store.threadDir(newId) }) ?? null } catch (error) {
            await discardThread(newId).catch(() => {})
            throw new RpcError(SERVER_ERROR, error?.message ?? String(error))
          }
        }
        const home = ownHome ? { agentHome: ownHome } : { ...(source.agentHome ? { agentHome: source.agentHome } : {}), ...(source.launchDir && source.agentHome && source.agentHome !== 'real' ? { launchDir: source.launchDir } : {}) }
        const meta = store.update(newId, { cwd: source.cwd, createdAt: Date.now(), updatedAt: Date.now(), forkedFromId: source.id, source: 'bridge', preview: source.projector.preview, model: source.model, effort: source.effort, custom: source.custom, tools: source.tools, developerInstructions: source.developerInstructions, ...home, ...(source.agentCwd ? { agentCwd: source.agentCwd } : {}) })
        store.writeHistory(newId, { turns: source.projector.persist(), plan: source.projector.plan })
        const fork = new Thread(newId, meta)
        applySettings(fork, params)
        threads.set(newId, fork)
        if (partial) {
          try {
            await revertThread(fork, keep, { quiet: true })
            fork.projector.turns = fork.projector.turns.slice(0, keep)
            fork.save()
          } catch (error) {
            // No half-made fork is left behind: the agent's copy goes too.
            await discardThread(newId).catch(() => {})
            throw error instanceof RpcError ? error : new RpcError(SERVER_ERROR, `${adapter.name} could not fork from that message: ${error?.message ?? error}`)
          }
        }
        if (target && target !== fork.cwd && adapter.changeDirectory) {
          try { await moveThread(fork, target) } catch (error) { log(`fork cwd: ${error?.message ?? error}`) }
        }
        const response = sessionResponse(fork, { includeTurns: params.excludeTurns !== true })
        notify('thread/started', { thread: response.thread })
        return response
      }
      case 'thread/revert':
      case 'thread/rollback': {
        const thread = await openThread(requireId(params.threadId))
        if (thread.running) throw new RpcError(INVALID_REQUEST, 'Wait for the current turn to finish before rewinding.')
        const index = thread.projector.turns.findIndex((turn) => turn.id === params.beforeTurnId)
        if (index < 0) throw invalidParams('Unknown turn.')
        // codeDesktop.restoreFiles (capabilities.rewindFiles): the agent's own file edits after that turn go back first.
        const restoreLive = params.codeDesktop?.restoreFiles === true && adapter.sessionFeatures?.revertFiles === 'live'
        if (params.codeDesktop?.restoreFiles === true && adapter.revertFiles && !restoreLive) {
          const keep = thread.projector.turns.slice(0, index).filter((turn) => !turn.synthetic).length
          const turnText = inputText(thread.projector.turns[index]?.items.find((item) => item.type === 'userMessage')?.content ?? []) || null
          const files = adapter.revertFiles(ctx, thread.id, keep, turnText)
          if (files.skipped.length) notify('warning', { threadId: thread.id, message: `Some files changed after ${adapter.name} edited them, so they were left as they are: ${files.skipped.join(', ')}.` })
        }
        // An agent that restores its own checkpoints in the same rewind (sessionFeatures.revertFiles 'live': Qwen's
        // file history) does both at once and says which files came back.
        const files = await revertThread(thread, index, { restoreFiles: restoreLive })
        thread.projector.turns = thread.projector.turns.slice(0, index)
        thread.save()
        notify('thread/reverted', { threadId: thread.id })
        const restored = restoreLive && files && typeof files === 'object' ? { filesRestored: Array.isArray(files.filesChanged) ? files.filesChanged : [], filesFailed: Array.isArray(files.filesFailed) ? files.filesFailed : [] } : null
        if (restored?.filesFailed.length) notify('warning', { threadId: thread.id, message: `${adapter.name} could not restore some files: ${restored.filesFailed.slice(0, 10).join(', ')}${restored.filesFailed.length > 10 ? ', …' : ''}` })
        return { thread: threadObject(thread.id), turnsBackwardsCursor: null, itemsBackwardsCursor: null, ...(restored ? { codeDesktop: restored } : {}) }
      }
      case 'thread/queue/add': {
        const thread = await openThread(requireId(params.threadId))
        const entry = { id: randomUUID(), input: Array.isArray(params.input) ? params.input : [], clientUserMessageId: typeof params.clientUserMessageId === 'string' ? params.clientUserMessageId : null }
        thread.queue.push(entry)
        notify('thread/queue/changed', { threadId: thread.id })
        setImmediate(() => drainQueue(thread))
        return { queuedSubmission: entry }
      }
      case 'thread/queue/list': {
        const live = threads.get(requireId(params.threadId))
        return { data: live ? live.queue.map(({ id, input, clientUserMessageId }) => ({ id, input, clientUserMessageId })) : [], nextCursor: null }
      }
      case 'thread/queue/delete': {
        const thread = await openThread(requireId(params.threadId))
        const index = thread.queue.findIndex((entry) => entry.id === params.queuedSubmissionId)
        if (index < 0) throw invalidParams('That queued message already started.')
        thread.queue.splice(index, 1)
        notify('thread/queue/changed', { threadId: thread.id })
        return {}
      }
      case 'thread/queue/update': {
        const thread = await openThread(requireId(params.threadId))
        const entry = thread.queue.find((candidate) => candidate.id === params.queuedSubmissionId)
        if (!entry) throw invalidParams('That queued message already started.')
        entry.input = Array.isArray(params.input) ? params.input : entry.input
        notify('thread/queue/changed', { threadId: thread.id })
        return { queuedSubmission: { id: entry.id, input: entry.input, clientUserMessageId: entry.clientUserMessageId } }
      }
      case 'thread/queue/reorder': {
        const thread = await openThread(requireId(params.threadId))
        const ids = Array.isArray(params.queuedSubmissionIds) ? params.queuedSubmissionIds : []
        if (ids.length !== thread.queue.length || new Set(ids).size !== ids.length || ids.some((id) => !thread.queue.some((entry) => entry.id === id))) throw invalidParams('queuedSubmissionIds must list every queued message exactly once.')
        thread.queue = ids.map((id) => thread.queue.find((entry) => entry.id === id))
        notify('thread/queue/changed', { threadId: thread.id })
        return {}
      }
      case 'thread/queue/start': {
        const thread = await openThread(requireId(params.threadId))
        const index = params.queuedSubmissionId ? thread.queue.findIndex((entry) => entry.id === params.queuedSubmissionId) : 0
        if (index < 0 || !thread.queue.length) throw new RpcError(INVALID_REQUEST, thread.queue.length ? 'That queued message already started.' : 'The queue is empty.')
        const [entry] = thread.queue.splice(index, 1)
        if (thread.running && adapter.steer) {
          await adapter.steer(ctx, thread.host, thread.id, inputText(entry.input))
        } else thread.queue.unshift(entry)
        notify('thread/queue/changed', { threadId: thread.id })
        setImmediate(() => drainQueue(thread))
        return {}
      }
      // The agent's own settings OpenClaude Desktop can change (adapter.coreSettings: Gemini's and Qwen's settings.json keys).
      case 'codeDesktop/coreSettings/read': {
        requireAgent()
        if (!adapter.coreSettings) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no settings here.`)
        const file = adapter.coreSettings.file(agentEnv)
        return { file, settings: coreSettingsView(await coreSettingDefs(), readCoreSettings()) }
      }
      case 'codeDesktop/coreSettings/write': {
        requireAgent()
        if (!adapter.coreSettings) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} has no settings here.`)
        const defs = await coreSettingDefs()
        const def = defs.find((entry) => entry.key === params?.key)
        if (!def) throw invalidParams('Unknown setting.')
        let value
        try { value = coreSettingValue(def, params.value ?? null) } catch (error) { throw invalidParams(error.message) }
        const file = adapter.coreSettings.file(agentEnv)
        try { writeCoreSetting(def.key, value) } catch (error) { throw invalidParams(error?.message ?? String(error)) }
        // Idle loaded threads pick the change up with a fresh process; a running one at its next launch.
        for (const thread of threads.values()) if (!thread.running) thread.hostKey = 'stale'
        return { file, settings: coreSettingsView(defs, readCoreSettings()) }
      }
      case 'thread/goal/get': {
        const thread = await openThread(requireId(params.threadId))
        if (adapter.readGoal && thread.goal === undefined) { try { applyGoal(thread, adapter.readGoal(ctx, thread)) } catch {} }
        return { goal: thread.goal ?? null }
      }
      case 'thread/goal/set':
      case 'thread/goal/clear': {
        if (!adapter?.goalSet) throw new RpcError(METHOD_NOT_FOUND, `${adapter?.name ?? 'This core'} has no goals.`)
        const thread = await openThread(requireId(params.threadId))
        const host = await ensureHost(thread, { keepRunning: true })
        if (method === 'thread/goal/clear') await adapter.goalClear(thread, host)
        else await adapter.goalSet(thread, host, { objective: params.objective, status: params.status })
        return method === 'thread/goal/clear' ? {} : { goal: thread.goal ?? null }
      }
      case 'thread/backgroundTerminals/list': {
        const live = threads.get(requireId(params.threadId))
        if (live) await refreshBackground(live)
        const data = live ? live.services.running().map((term) => ({ itemId: live.terminalCalls.get(term.id) ?? term.id, processId: term.id, command: term.command, cwd: term.cwd, osPid: term.pid ?? null, cpuPercent: null, rssKb: null })) : []
        // Commands the agent backgrounded in processes of its own (Gemini's is_background shell commands).
        if (live && adapter.backgroundProcesses) {
          // stoppable: false (Kimi's background sub-agents: ACP has no way to stop one): the app offers no Stop for it.
          try { for (const entry of adapter.backgroundProcesses(live)) data.push({ itemId: entry.itemId, processId: entry.processId, command: entry.command, cwd: entry.cwd ?? live.cwd, osPid: entry.osPid ?? null, cpuPercent: null, rssKb: null, ...(entry.stoppable === false ? { codeDesktop: { stoppable: false } } : {}) }) } catch (error) { log(`background processes: ${error?.message ?? error}`) }
        }
        return { data, nextCursor: null }
      }
      case 'thread/backgroundTerminals/terminate': {
        const live = threads.get(requireId(params.threadId))
        const term = live?.services.terminals.get(params.processId)
        if (!term && live && adapter.stopBackground) {
          let terminated = false
          try { terminated = (await adapter.stopBackground(live, String(params.processId ?? ''))) === true } catch (error) { log(`stop background: ${error?.message ?? error}`) }
          return { terminated }
        }
        if (!term || term.exit) return { terminated: false }
        live.services.kill(term)
        return { terminated: true }
      }
      case 'codeDesktop/workflow/stop': {
        if (!adapter?.workflowRun) throw new RpcError(METHOD_NOT_FOUND, `${adapter?.name ?? 'This core'} runs no workflows of its own.`)
        const thread = await openThread(requireId(params.threadId))
        return stopWorkflow(thread, params.runId)
      }
      case 'codeDesktop/workflow/pause': {
        if (!adapter?.workflowRun || !adapter.pauseWorkflow) throw new RpcError(METHOD_NOT_FOUND, `${adapter?.name ?? 'This core'} can’t pause its workflows.`)
        const thread = await openThread(requireId(params.threadId))
        return pauseWorkflow(thread, params.runId, params.paused)
      }
      case 'thread/backgroundTerminals/clean': {
        const live = threads.get(requireId(params.threadId))
        if (live) for (const [id, term] of live.services.terminals) if (term.exit) live.services.terminals.delete(id)
        return {}
      }
      case 'codeDesktop/thread/permissions': {
        // A Mode change during a turn: the bridge's approval policy changes at once, the agent's plan mode
        // follows now (session/set_mode), the process sandbox at the next turn (never weaker meanwhile:
        // a stricter sandbox stays until then).
        const live = threads.get(requireId(params.threadId))
        if (!live) return { applied: false }
        applySettings(live, params)
        await applyAgentMode(live)
        return { applied: true }
      }
      case 'codeDesktop/diagnostics':
        return { agent: adapter?.id ?? null, binary: program.binary, runner: program.runner, version, stateDir, liveThreads: threads.size, sandbox: sandboxAvailable(), threads: [...threads.values()].map((thread) => ({ id: thread.id, sandboxed: thread.sandboxed, mode: thread.permission.mode, acpMode: thread.acp.mode, running: thread.running, pid: thread.host?.child?.pid ?? null })) }
      default:
        throw new RpcError(METHOD_NOT_FOUND, `${method} is not supported by the ${adapter?.name ?? 'ACP'} core.`)
    }
  }

  /** Removes a thread and the agent's own copy of its session (thread/delete; a fork that could not be finished). */
  async function discardThread(id) {
    const live = threads.get(id)
    const cwd = live?.agentCwd ?? store.get(id).agentCwd ?? live?.cwd ?? store.get(id).cwd
    if (live) { threads.delete(id); await closeThread(live, 'Session deleted.') }
    let removed = false
    try { removed = await removeAgentSession(id, cwd) } catch (error) { log(`delete ${id}: ${error?.message ?? error}`) }
    // A thread that owns its agent home (MiniMax) takes it along, unless a fork still uses it.
    const home = store.get(id).agentHome
    if (adapter?.sessionFeatures?.ownHome && home && home !== 'real' && home.startsWith(stateDir) && !store.ids().some((other) => other !== id && !store.get(other).deleted && store.get(other).agentHome === home)) {
      try { fs.rmSync(home, { recursive: true, force: true }); removed = true } catch {}
    }
    // The folder its first process launched from (a new session's pending-<uuid>: Kimi's home overlay, Qwen's system
    // settings) goes too, unless a fork still runs from it. Only ever a folder of this store's threads.
    const launchDir = store.get(id).launchDir
    const threadsRoot = path.dirname(store.threadDir(id))
    if (typeof launchDir === 'string' && path.dirname(path.resolve(launchDir)) === threadsRoot && path.resolve(launchDir) !== path.resolve(store.threadDir(id)) && !store.ids().some((other) => other !== id && !store.get(other).deleted && store.get(other).launchDir === launchDir)) {
      settleOverlaysIn(launchDir)
      try { fs.rmSync(launchDir, { recursive: true, force: true }) } catch {}
    }
    store.remove(id)
    store.update(id, { deleted: true, agentHistoryRemoved: removed })
  }

  async function forkThread(source) {
    if (adapter.sessionFeatures?.fork === 'acp') {
      const host = source.host && !source.host.exited && source.sessionReady ? source.host : await ensureHost(source)
      const result = await host.call('session/fork', { sessionId: source.id, cwd: source.cwd, mcpServers: [] }, 60000)
      if (!result?.sessionId) throw new RpcError(SERVER_ERROR, `${adapter.name} did not return the fork.`)
      return result.sessionId
    }
    if (!adapter.forkSession) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} cannot fork sessions.`)
    const host = adapter.sessionFeatures?.fork === 'live' ? (source.host && !source.host.exited && source.sessionReady ? source.host : await ensureHost(source)) : null
    const id = await adapter.forkSession(ctx, source.id, host)
    if (!id) throw new RpcError(SERVER_ERROR, `${adapter.name} did not return the fork.`)
    return id
  }

  async function revertThread(thread, keepTurns, { quiet = false, restoreFiles = false } = {}) {
    if (!adapter.revertSession) throw new RpcError(METHOD_NOT_FOUND, `${adapter.name} cannot rewind a session.`)
    // Agent turns counted as real user prompts (compaction and review turns are prompts too).
    const keep = thread.projector.turns.slice(0, keepTurns).filter((turn) => !turn.synthetic).length
    const dropped = thread.projector.turns[keepTurns]
    const turnText = inputText(dropped?.items.find((item) => item.type === 'userMessage')?.content ?? []) || null
    let answer = null
    if (adapter.sessionFeatures?.revert === 'live') {
      const host = thread.host && !thread.host.exited && thread.sessionReady ? thread.host : await ensureHost(thread)
      // restoreFiles only on a rewind the user asked to restore files for (a fork never touches files).
      answer = await adapter.revertSession(ctx, thread.id, keep, host, turnText, { restoreFiles: restoreFiles === true })
    } else {
      // A file edit (or the agent's own tool on the stored session): the process holding the session restarts afterwards.
      await stopHost(thread)
      const dropped = thread.projector.turns.slice(keepTurns).filter((turn) => !turn.synthetic).length
      await adapter.revertSession(ctx, thread.id, keep, null, turnText, { dropped, cwd: thread.cwd, launch: () => adapter.launch(ctx, launchConfig(thread)) })
    }
    if (adapter.revertNotice && !quiet) notify('warning', { threadId: thread.id, message: adapter.revertNotice })
    return answer
  }

  /**
   * /cd: the session continues in another folder (adapter.changeDirectory moves the live session; its storage stays
   * where it began, so thread.agentCwd keeps that folder for later loads). The process restarts on the next turn with
   * the new folder's sandbox roots.
   */
  async function moveThread(thread, cwd) {
    const host = await ensureHost(thread)
    const storedIn = thread.agentCwd ?? thread.cwd
    const moved = await adapter.changeDirectory(ctx, host, thread.id, cwd)
    const next = typeof moved?.cwd === 'string' && path.isAbsolute(moved.cwd) ? moved.cwd : cwd
    thread.agentCwd = next === storedIn ? null : storedIn
    thread.cwd = next
    thread.projector.cwd = next
    thread.remember({ cwd: next, agentCwd: thread.agentCwd ?? undefined })
    for (const warning of moved?.warnings ?? []) if (typeof warning === 'string' && warning) notify('warning', { threadId: thread.id, message: `${adapter.name}: ${warning}` })
  }

  function reviewPrompt(target) {
    const type = target?.type
    if (type === 'uncommittedChanges') return 'Review my uncommitted changes (staged, unstaged and untracked files; use git status and git diff). Report concrete bugs, risks and suggestions with file and line references, most important first. Do not change any files.'
    if (type === 'baseBranch') return `Review the changes on this branch against ${target.branch} (use git diff ${target.branch}...HEAD). Report concrete bugs, risks and suggestions with file and line references, most important first. Do not change any files.`
    if (type === 'commit') return `Review commit ${target.sha}${target.title ? ` ("${target.title}")` : ''} (use git show ${target.sha}). Report concrete bugs, risks and suggestions with file and line references, most important first. Do not change any files.`
    if (type === 'custom' && typeof target.instructions === 'string') return target.instructions
    return 'Review the current changes in this repository. Report concrete bugs and risks with file and line references. Do not change any files.'
  }

  // ------------------------------------------------------------ lifecycle

  let shuttingDown = null
  function shutdown() {
    if (shuttingDown) return shuttingDown
    closed = true
    quotaWatch.stop()
    const live = [...threads.values()]
    // The workflow runner's bridge exits right after its last agent's turn: turns whose usage is still being read
    // (settleUsage) are counted first, in the ledger (the runner's outbox), 5 s at most. The app's bridge stops at once.
    const settled = runnerRole && usageSettles.size ? Promise.race([Promise.allSettled([...usageSettles]), new Promise((resolve) => { const timer = setTimeout(resolve, 5000); timer.unref?.() })]) : Promise.resolve()
    shuttingDown = settled.then(() => {
      transport.close()
      threads.clear()
      store.flush()
      return Promise.allSettled([...live.map((thread) => closeThread(thread, 'OpenClaude Desktop core stopped.')), utility?.then((host) => host.stop())])
    }).then(() => undefined)
    return shuttingDown
  }

  transport.start()
  return { shutdown, handle }
}
