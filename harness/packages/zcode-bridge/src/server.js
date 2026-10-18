/**
 * Codex app-server protocol (v0.155.1, JSON-RPC lines on stdio) served by the official ZCode agent.
 *
 * OpenClaude Desktop spawns `node bin/app-server.mjs app-server --stdio`; this bridge starts `zcode app-server --stdio`
 * (the agent process the ZCode desktop app drives, speaking the ZCode Protocol) and acts as its host.
 *
 *   thread                ZCode session (sess_…); Thread.cliVersion "zcode <version>"
 *   turn                  ZCode turn (turn_…), items from the live stream (live.js) / session/messages (history.js)
 *   approvals, questions  interaction/requestPermission | requestUserInput → item/*\/requestApproval |
 *                         item/tool/requestUserInput (permissions.js); ExitPlanMode → the plan card
 *   permission modes      ZCode build / edit / plan / yolo (permissions.js)
 *   customization         system prompt / instructions / model params per thread through the provider proxy
 *                         (provider-proxy.js); codeDesktop/systemPrompt/preview is the prompt ZCode really sent
 *   tool selection        ZCode's per-turn toolDenylist (+ per-session mcpServers without disabled servers)
 *   scheduled tasks       not served: Cron* / OffPeak* are always denied; automation/* answers "none" or "unavailable"
 *   accounts              API-key providers / Coding Plan sign-in (`zcode login`) + quota (accounts.js)
 *   catalog               skills, MCP servers, plugins, hooks (catalog.js); usage (usage.js)
 *   fork / compact        session/fork (at a turn) / session/compact; rename / delete via ZCode's V4 commands
 *   rewind                thread/revert → `/rewind conversation <messageId>` as a silent control turn; history
 *                         applies ZCode's branch cut (session.revert)
 *   slash commands        ZCode's `/` catalog (workspace/readPresentation) as skills/list command rows; `/goal`
 *                         through session/goal
 *   instructions          without the provider proxy, developerInstructions inlined into the prompt (instructions.js)
 *   steer                 V4 sendText with requestedDelivery "guide" (ZCode's mid-turn guidance)
 *   side question         workspace/generateText over the thread's transcript (never enters the thread)
 *   dynamic workflows     ZCode's own engine (CreateWorkflow …) per session (session/create|resume
 *                         dynamicWorkflowEnabled); runs as item.workflowRun from the run journal (workflows.js),
 *                         stopped one by one (session/cancelBackgroundTask); in every permission mode. ZCode runs a
 *                         workflow's agents without approvals, so outside Bypass each run asks once (one card)
 */

import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LineTransport, RpcError, METHOD_NOT_FOUND, INVALID_PARAMS } from './transport.js'
import { ZCodeConnection } from './zcode.js'
import { locateAgent, zcodePaths } from './locate.js'
import { ThreadStore } from './store.js'
import { LiveProjector, turnError } from './live.js'
import { activeMessages, turnsFromMessages, previewOf } from './history.js'
import { WORKFLOW_RUN_APPROVAL_REASON, WORKFLOW_RUN_TOOLS, WORKFLOW_SESSION_GRANT_TOOLS, applyWorkflowEvents, applyWorkflowInterrupted, applyWorkflowSummary, bindWorkflowRun, workflowApprovalSummary, workflowReplacement, workflowState } from './workflows.js'
import { goalObjective, instructionsBlock, instructionsKey, placeInstructions, stripInstructions } from './instructions.js'
import { MCP_TOOL, isRecord } from './items.js'
import { appToolsServer, sessionIdentityOf, zcodeAppToolsServer } from './app-tools.js'
import { approvalRequest, codexPolicy, isPlanApproval, isReadOnlyMode, noApprovalAnswer, permissionAnswer, permissionOf, questionAnswer, questionRequest, sessionGrant, zcodeMode } from './permissions.js'
import { ProviderConfigMirror, ProviderProxy } from './provider-proxy.js'
import { contextUsageCounts } from './context-usage.js'
import { InteractionRegistry } from './interactions.js'
import { RateLimitWatch } from './rate-limit-watch.js'
import * as accounts from './accounts.js'
import * as catalog from './catalog.js'
import { accountUsage, codeStats, databaseActivity, deleteSessionRows, sessionRevert, storedMessages } from './usage.js'

const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BRIDGE_VERSION = JSON.parse(fs.readFileSync(path.join(PACKAGE_DIR, 'package.json'), 'utf8')).version
const ENGINE = 'zcode'
const seconds = (ms) => Math.floor((Number.isFinite(ms) ? ms : Date.now()) / 1000)
const TURN_START_TIMEOUT_MS = 20000
// session/list: how many sessions to ask ZCode for (it pages nothing itself; the bridge pages, sorts and searches).
const SESSION_LIST_CAP = 5000
// ZCode polls the provider config file about once a second (personal-provider-config-repository.ts pollingIntervalMs).
const PROVIDER_POLL_SETTLE_MS = 2000
const MODEL_CACHE_MS = 30000
// A live dynamic workflow's journal is read this often (ZCode's session stream carries none of its progress).
const WORKFLOW_POLL_MS = 1500
// A deliverable's bytes read for the app (codeDesktop/workflow/artifact), and a board's item pages (500 each).
const ARTIFACT_READ_LIMIT = 4 * 1024 * 1024
const ARTIFACT_DATA_PAGES = 8

// What the UI may offer (initialize.capabilities); see the README for the reasons behind each.
export const BASE_CAPABILITIES = {
  customization: true, permissionHints: true, systemPromptPreview: true, livePermissions: true, toolSelection: true,
  deleteHistory: true, unloadOnNavigate: true, codeStats: true, skillToggle: true, mcpConfigWrite: true,
  pluginManage: true, structuredOutput: false, harnessProfile: false, providerSettings: false,
  sideQuestion: true, unsupportedMethods: ['thread/rollback'],
  // ZCode titles its sessions (session.titleUpdated → thread/name/updated).
  generatesTitles: true,
  // thread/compact/start codeDesktop.instructions reach session/compact (`/compact [instructions]`).
  compactInstructions: true,
  // thread/revert codeDesktop.restoreFiles: ZCode's `/rewind both` puts back the files it checkpointed before each edit.
  rewindFiles: true,
  // hooks/list: ZCode's hooks from its config (catalog.hooksList), for the app's Customize › Hooks.
  hooksList: true,
  // Text is forwarded unchanged, so ZCode resolves a '[#title](#<sessionId>)' session mention itself (ReadSessionContext).
  sessionMentions: true,
  // ZCode's /goal (session/goal) as Codex goals: thread/goal/get|set|clear and thread/goal/updated|cleared (goalOf).
  goals: true,
  // Settings › Code › ZCode settings (Workspace Memory, enhanced Find and Grep: zcodeCoreSettingDefs), kept in the
  // bridge's state rather than ZCode's config.json (coreSettingsInConfig false).
  coreSettings: true, coreSettingsInConfig: false,
  // codeDesktop/agents/list: ZCode's built-in, user and project sub-agents for Customize (catalog.zcodeAgents).
  agentsList: true,
  // codeDesktop/workflow/artifact: a run's published deliverables (artifact.markdown / file / chart / table / metrics /
  // board), listed on the run as workflowRun.artifacts and read from ZCode's store on demand.
  workflowArtifacts: true,
  // codeDesktop/workflow/settings: a running run's sub-agent model and agent limit (the run card's Configure).
  workflowRunSettings: true,
  // codeDesktop/workflows/list|get|delete|runs: ZCode's saved workflows (.zcode/workflows, ~/.zcode/workflows).
  savedWorkflows: true,
  // codeDesktop/plugin/update: a marketplace plugin updated through ZCode's plugins/update.
  pluginUpdate: true,
  // ZCode's own dynamic workflows (CreateWorkflow / AmendWorkflow / ResumeWorkflowRun): each run is item.workflowRun on
  // its tool item (workflows.js) and stops through codeDesktop/workflow/stop. Offered in every permission mode: ZCode
  // runs a workflow's agents without asking, so outside Bypass the bridge asks once per run (askPermission).
  modelWorkflows: true,
}

/**
 * Settings › Code › 'ZCode settings' (codeDesktop/coreSettings/read|write): the ZCode app's own desktop settings the agent
 * asks its host for (session/requestRuntimePreferences). Their defaults are the ZCode app's choices in
 * ~/.zcode/v2/setting.json (services/src/node.ts: memoryEnabled true only when switched on there, search enhancements
 * on unless switched off), so a user who turned Workspace Memory on in the ZCode app keeps it here; a value set in Code
 * Desktop (kept in the bridge's state) wins. Read when a session's runtime starts, so new sessions pick a change up.
 */
export function zcodeCoreSettingDefs(desktopSettings = {}) {
  return [
    { key: 'memoryEnabled', type: 'boolean', default: desktopSettings?.memoryEnabled === true },
    { key: 'nativeSearchEnhancementsEnabled', type: 'boolean', default: desktopSettings?.nativeSearchEnhancementsEnabled !== false },
  ]
}

/** The runtime preferences a session gets: each setting's stored value, else its default. */
export function zcodeRuntimePreferences(defs, stored = {}) {
  return Object.fromEntries(defs.map((def) => [def.key, typeof stored?.[def.key] === 'boolean' ? stored[def.key] : def.default]))
}

/**
 * ZCode's session goal (projection.target: zcode-protocol-legacy-types.ts zcodeSessionGoalSchema) as Codex's ThreadGoal
 * {threadId, objective, status active|paused|budgetLimited|complete, tokenBudget, tokensUsed, timeUsedSeconds}; null
 * when there is none.
 */
export function goalOf(target, threadId) {
  if (!target || typeof target !== 'object' || typeof target.objective !== 'string' || !target.objective) return null
  const status = { active: 'active', paused: 'paused', budget_limited: 'budgetLimited', complete: 'complete' }[target.status] ?? 'active'
  const count = (value) => (Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0)
  return {
    threadId, objective: target.objective, status,
    tokenBudget: Number.isFinite(target.tokenBudget) && target.tokenBudget > 0 ? Math.floor(target.tokenBudget) : null,
    tokensUsed: count(target.tokensUsed), timeUsedSeconds: count(target.timeUsedSeconds),
    createdAt: Number.isFinite(target.createdAt) ? Math.floor(target.createdAt / 1000) : null,
    updatedAt: Number.isFinite(target.updatedAt) ? Math.floor(target.updatedAt / 1000) : null,
    ...(typeof target.summaryTitle === 'string' && target.summaryTitle ? { codeDesktop: { summaryTitle: target.summaryTitle } } : {}),
  }
}
// ZCode slash commands the bridge serves through Codex methods instead (thread/compact/start, the permission modes).
const SERVED_COMMANDS = new Set(['compact', 'plan'])
const COMMAND_PATH = 'command:'
// ZCode tools whose host side OpenClaude Desktop doesn't provide: scheduled tasks (Cron*, the agent → host automation/*
// requests) and off-peak tasks (OffPeak*, offPeak/*). They are kept off every session and turn, so GLM never offers to
// schedule something that would never run; the automation/* answers below are only the fallback for a path that
// still reaches them.
export const UNAVAILABLE_TOOLS = Object.freeze(['CronCreate', 'CronDelete', 'CronList', 'CronUpdate', 'OffPeakCreate', 'OffPeakList'])
const UNAVAILABLE_TOOL_SET = new Set(UNAVAILABLE_TOOLS)
// ZCode's dynamic-workflow tool family (core/src/tool/handlers/index.ts DYNAMIC_WORKFLOW_TOOL_NAMES): withheld while
// OpenClaude Desktop's Dynamic workflows setting is off (codeDesktop.dynamicWorkflows on thread/start, thread/resume, turn/start).
export const WORKFLOW_TOOLS = Object.freeze(['CreateWorkflow', 'AmendWorkflow', 'SaveWorkflow', 'ListSavedWorkflows', 'ListModels', 'EvalWorkflowSnippet', 'ListWorkflowRuns', 'GetWorkflowRun', 'ResumeWorkflowRun', 'ResolveWorkflowQuestion'])
// ZCode's official Browser Use and Computer Use plugins, and the node_repl tool both drive (bootstrap
// official-plugin-definitions.ts, built-in-node-repl.ts).
const BROWSER_USE_PLUGIN = 'browser-use@zcode-plugins-official'
const COMPUTER_USE_PLUGIN = 'computer-use@zcode-plugins-official'
export const NODE_REPL_TOOL = 'mcp__node_repl__js'
// What GLM is told while Browser Use is on (its skills stay listed: ZCode has no per-session skill switch), so it
// checks web pages with the tools that work here instead of loading a skill that can only fail.
export const NO_BROWSER_NOTE = 'Browser Use is not available here: ZCode\'s browser-use skills (control-browser, web-gui-tester) need a ZCode browser, and OpenClaude Desktop provides none. Do not load those skills or call node_repl.'
export const PREVIEW_INSTEAD = 'To open, check, click through or screenshot a web page or a local dev server, use OpenClaude Desktop\'s preview tools (preview_start, navigate, read_page, screenshot and the rest) instead.'
export const NO_PREVIEW_INSTEAD = 'To check a web page or a local dev server, use Bash (curl, the project\'s own tests), and tell the user that you can\'t view it in a browser here.'
// The attachment kinds ZCode's protocol takes by file type (bootstrap server-operations.ts mapProtocolPromptAttachment:
// 'pdf' or an application/pdf mimeType, 'video', 'image'; anything else is a plain file, which the core hands the model
// as a path only unless it is text). ZCode itself falls back to that path for a model without PDF, video or image input.
const IMAGE_MIME = Object.freeze({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' })
// core/src/runtime/helpers/attachment-video.ts VIDEO_INPUT_MIME_BY_EXTENSION.
const VIDEO_MIME = Object.freeze({ '.mp4': 'video/mp4', '.m4v': 'video/x-m4v', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo' })
const TEXT_MIME = Object.freeze({ '.txt': 'text/plain', '.md': 'text/markdown', '.csv': 'text/csv', '.json': 'application/json', '.html': 'text/html', '.xml': 'application/xml', '.yaml': 'application/yaml', '.yml': 'application/yaml' })

/** A file the user attached (a mention of an existing file) as ZCode's prompt attachment, by its type. */
export function fileAttachment(localPath, filename = path.basename(localPath)) {
  const extension = path.extname(localPath).toLowerCase()
  if (extension === '.pdf') return { kind: 'pdf', localPath, filename, mimeType: 'application/pdf' }
  if (VIDEO_MIME[extension]) return { kind: 'video', localPath, filename, mimeType: VIDEO_MIME[extension] }
  if (IMAGE_MIME[extension]) return { kind: 'image', localPath, filename, mimeType: IMAGE_MIME[extension] }
  return { kind: 'file', localPath, filename, ...(TEXT_MIME[extension] ? { mimeType: TEXT_MIME[extension] } : {}) }
}

export const SCHEDULING_UNAVAILABLE = 'Scheduled tasks aren’t available for ZCode in OpenClaude Desktop, so nothing was scheduled. Tell the user it can’t be scheduled here; it can be run now instead.'

export async function main() {
  const env = { ...process.env }
  const home = os.homedir()
  const paths = zcodePaths(env, home)
  // A data folder moved in the ZCode app: the agent, its sign-in and sign-out read it only from ZCODE_DATA_BASE_DIR, as the
  // ZCode app passes it (desktopRuntimeEnv.ts), so every process the bridge starts gets it too.
  if (paths.dataBaseDir && !env.ZCODE_DATA_BASE_DIR?.trim()) env.ZCODE_DATA_BASE_DIR = paths.dataBaseDir
  const stateDir = env.CODE_DESKTOP_BRIDGE_STATE?.trim() || path.join(paths.root, 'code-desktop-bridge')
  // The workflow runner's own bridge (CODE_DESKTOP_WORKFLOW_RUNNER=1, app/electron/workflow-service.cjs) shares this
  // state folder (core settings) with the app's bridge but keeps its threads and provider mirror in workflow-runs/<pid>:
  // two processes never rewrite one threads.json, and the app bridge leaves those sessions out of thread/list and,
  // once their runner is gone, deletes them from ZCode's store with their folder.
  const runnerRole = env.CODE_DESKTOP_WORKFLOW_RUNNER === '1'
  const runsDir = path.join(stateDir, 'workflow-runs')
  const store = new ThreadStore(runnerRole ? path.join(runsDir, String(process.pid)) : stateDir)
  const runnerFolders = () => {
    let names = []
    try { names = fs.readdirSync(runsDir) } catch { return [] }
    return names.filter((name) => /^\d+$/.test(name)).map((name) => {
      const dir = path.join(runsDir, name)
      let threads = {}
      try { threads = JSON.parse(fs.readFileSync(path.join(dir, 'threads.json'), 'utf8'))?.threads ?? {} } catch {}
      return { pid: Number(name), dir, ids: Object.keys(threads && typeof threads === 'object' ? threads : {}) }
    })
  }
  const processAlive = (pid) => { try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' } }
  let lastSweep = 0
  async function sweepRunnerFolders() {
    if (runnerRole || Date.now() - lastSweep < 60000) return
    lastSweep = Date.now()
    for (const folder of runnerFolders()) {
      if (folder.pid === process.pid || processAlive(folder.pid)) continue
      for (const id of folder.ids) await deleteSessionRows(paths.sessionDb, id).catch(() => {})
      try { fs.rmSync(folder.dir, { recursive: true, force: true }) } catch {}
    }
  }
  // OpenClaude Desktop's own tools (app-tools.js): a code_desktop server in each app session's mcpServers.
  const appTools = appToolsServer(env)
  // How often a session waiting for its background work to settle is checked (whenSettled).
  const settlePollMs = Number(env.ZCODE_BRIDGE_SETTLE_POLL_MS) > 0 ? Number(env.ZCODE_BRIDGE_SETTLE_POLL_MS) : 2500
  // OpenClaude Desktop's ZCode settings (zcodeCoreSettingDefs), kept beside the bridge's thread state.
  const coreSettingsFile = path.join(stateDir, 'core-settings.json')
  const readCoreSettings = () => { try { const value = JSON.parse(fs.readFileSync(coreSettingsFile, 'utf8')); return value && typeof value === 'object' ? value : {} } catch { return {} } }
  const coreSettingDefs = () => { let desktop = {}; try { desktop = JSON.parse(fs.readFileSync(path.join(home, '.zcode', 'v2', 'setting.json'), 'utf8')) ?? {} } catch {} return zcodeCoreSettingDefs(desktop) }
  const coreSettingsView = () => coreSettingDefs().map((def) => ({ key: def.key, type: def.type, value: typeof readCoreSettings()[def.key] === 'boolean' ? readCoreSettings()[def.key] : null, default: def.default }))
  const log = (message) => { try { process.stderr.write(`${message}\n`) } catch {} }
  const threads = new Map()
  const children = new Map()
  const sideQuestions = new Map()
  const logins = new Map()
  let agent = null
  let starting = null
  let version = ''
  let located = null
  let proxy = null
  let mirror = null
  let modelCache = null
  let closed = false
  const mcpToolCache = new Map()
  const dryRuns = new Set()
  // One card per ZCode interaction: ZCode re-sends an unanswered request under a new wire id (interactions.js).
  const interactions = new InteractionRegistry()

  const transport = new LineTransport(process.stdin, process.stdout, {
    onRequest: (method, params) => handle(method, params ?? {}),
    onClose: () => { void shutdown() },
    log,
  })
  const notify = (method, params) => {
    // Another account's quota is a new baseline: the client clears its plan limits on account/updated too.
    if (method === 'account/updated') quotaWatch.reset()
    transport.notify(method, params)
  }
  // account/rateLimits/updated after turns (Codex sends one per turn), so the usage ring and notice stay current.
  const quotaWatch = new RateLimitWatch({ read: () => rateLimits({ details: false }), notify, log })

  // ---------------------------------------------------------------- agent process

  async function ensureAgent() {
    if (agent && !agent.closed) return agent
    if (starting) return starting
    starting = (async () => {
      located = locateAgent(env, home)
      if (!located.binary) throw new RpcError(-32000, 'ZCode isn’t installed. Download it in Settings › Cores, install the ZCode app, or put `zcode` on PATH.')
      version = await agentVersion(located).catch(() => '') || located.version || 'unknown'
      const childEnv = { ...env }
      for (const key of Object.keys(childEnv)) if (key.startsWith('CODE_DESKTOP_')) delete childEnv[key]
      if (located.builtinConfig) {
        proxy = new ProviderProxy({ customizationFor, env, log, dryRun: (sessionId) => dryRuns.has(sessionId) })
        const origin = await proxy.start()
        // The runner's bridge keeps its own mirror (its proxy port is its own and closes with it) and never writes
        // the user's provider file; the app's bridge alone carries ZCode's changes back.
        mirror = new ProviderConfigMirror({ builtinSource: located.builtinConfig, personalSource: paths.personalProviders,
          dir: runnerRole ? path.join(runsDir, String(process.pid), 'provider') : path.join(stateDir, 'provider'), origin, log, carryBack: !runnerRole })
        mirror.sync()
        mirror.watch()
        childEnv.ZCODE_BUILTIN_PROVIDER_CONFIG_FILE = mirror.builtinPath
        childEnv.ZCODE_PERSONAL_PROVIDER_CONFIG_FILE = mirror.personalPath
      }
      const connection = new ZCodeConnection({ command: located.command, args: [...located.prefix, 'app-server', '--stdio'], env: childEnv, cwd: home, log,
        runtimePreferences: () => zcodeRuntimePreferences(coreSettingDefs(), readCoreSettings()) })
      connection.handle('interaction/requestPermission', (params, id) => onPermission(params, id))
      connection.handle('interaction/requestUserInput', (params, id) => onUserInput(params, id))
      connection.handle('interaction/requestProviderRuntimeHeaders', (params) => onRuntimeHeaders(params))
      connection.handle('interaction/requestOfficialMcpAuthHeaders', (params) => onOfficialMcpAuthHeaders(params))
      connection.handle('interaction/browserList', () => ({ backends: [] }))
      for (const [method, handler] of Object.entries(schedulingHandlers())) connection.handle(method, handler)
      connection.on('notification', onAgentNotification)
      connection.on('exit', (error) => onAgentExit(connection, error))
      connection.start()
      agent = connection
      await pushAccountOverlay().catch((error) => log(`zcode-bridge: account overlay: ${error?.message || error}`))
      // ZCode's dynamic workflows are a host-decided gate its protocol server keeps closed by default (fail-closed:
      // appRuntimePreferences.dynamicWorkflowEnabled false). The bridge never opens it for the process
      // (workspace/updateDynamicWorkflowPolicy): each session it creates or resumes says dynamicWorkflowEnabled itself,
      // from OpenClaude Desktop's Dynamic workflows setting (sessionWorkflowGate).
      return connection
    })()
    try { return await starting } finally { starting = null }
  }

  function agentVersion(target) {
    return new Promise((resolve, reject) => {
      execFile(target.command, [...target.prefix, '--version'], { timeout: 15000, env: { ...env, HOME: home } }, (error, stdout) => {
        if (error) reject(error)
        else resolve(String(stdout).trim().split('\n')[0].replace(/^zcode\s+/, ''))
      })
    })
  }

  async function request(method, params, options) {
    const connection = await ensureAgent()
    return connection.request(method, params, options)
  }

  function onAgentExit(connection, error) {
    if (agent !== connection) return
    agent = null
    modelCache = null
    interactions.clear()
    log(`zcode-bridge: ${error?.message || 'ZCode stopped.'}`)
    // Running turns end cleanly; sessions reload from ZCode's store on the next use.
    for (const thread of threads.values()) {
      thread.loaded = false
      thread.subscribed = false
      // A live workflow run was a task of that process: it ended with it.
      thread.projector.workflowsInterrupted()
      clearInterval(thread.workflowTimer)
      thread.workflowTimer = null
      failPending(thread, 'ZCode stopped.')
      if (thread.projector.turn) thread.projector.finishTurn('failed', turnError(error?.message || 'ZCode stopped.'))
      notify('thread/status/changed', { threadId: thread.id, status: { type: 'notLoaded' } })
    }
  }

  async function shutdown() {
    if (closed) return
    closed = true
    quotaWatch.stop()
    store.flush()
    mirror?.stop()
    for (const login of logins.values()) try { login.child.kill() } catch {}
    await Promise.race([agent?.stop(), new Promise((resolve) => setTimeout(resolve, 4000))])
    await proxy?.stop().catch(() => {})
    process.exit(0)
  }

  // ---------------------------------------------------------------- threads

  const workspaceOf = (cwd) => ({ workspacePath: cwd, workspaceKey: cwd })

  function newThread(id, init = {}) {
    const meta = store.get(id) ?? {}
    const thread = {
      id, cwd: init.cwd ?? meta.cwd ?? home, loaded: false, subscribed: false,
      permission: init.permission ?? meta.permission ?? { mode: 'auto', afterPlan: 'auto' },
      appliedMode: null, model: init.model ?? meta.model ?? null, effort: init.effort ?? meta.effort ?? null, appliedModel: null,
      tools: meta.tools ?? null, customization: meta.customization ?? null, developerInstructions: meta.developerInstructions ?? null, dynamicWorkflows: meta.dynamicWorkflows === true,
      pendingInputs: [], steers: [], steerClientIds: new Map(), grants: new Set(), pending: new Map(), queue: meta.queue ?? [], title: meta.title ?? null, titleSource: null,
      createdAt: meta.createdAt ?? Date.now(), updatedAt: meta.updatedAt ?? Date.now(), parentId: meta.forkedFromId ?? null,
      turnWaiters: [], history: null, review: null, lastStatus: null, contextWindow: null,
      // A bridge-driven control turn (the `/rewind` behind thread/revert): its stream never reaches the client.
      control: null, instructionsSent: meta.instructionsSent ?? null,
      // An approved plan's after-plan mode waiting for ZCode to leave plan mode (askUserInput → modeChanged).
      leavingPlan: null,
    }
    thread.projector = new LiveProjector({
      threadId: id, cwd: () => thread.cwd,
      emit: (method, params) => {
        if (thread.control && (!params?.threadId || params.threadId === id)) return
        if (params?.threadId && params.threadId !== id) recordChild(method, params)
        // A compaction summarizes away the turn that carried inlined instructions: send them again.
        if (method === 'item/completed' && params?.item?.type === 'contextCompaction' && params.threadId === id) forgetInstructions(thread)
        notify(method, params)
      },
      takeInput: (messageId, payload = {}) => {
        // A steer ZCode delivered as a turn of its own (its guidance fell back to the queue) carries the steer's ids.
        const steered = takeSteer(thread, { pendingInputId: payload.intent?.queueItemId, commandId: payload.intent?.sourceCommandId ?? payload.inputId })
        const input = steered?.input ?? thread.pendingInputs.shift() ?? null
        if (input && messageId) store.recordInput(id, messageId, input)
        rememberSteerClientId(thread, messageId, steered)
        return input
      },
      // Guidance ZCode put into the running turn (turn.steerDrained): the input the steer sent, by its ids.
      takeSteer: (drained) => {
        const steered = takeSteer(thread, { pendingInputId: drained.pendingInputId, commandId: drained.intent?.sourceCommandId, text: drained.text })
        const input = steered?.input ?? null
        if (input && drained.messageId) store.recordInput(id, drained.messageId, input)
        rememberSteerClientId(thread, drained.messageId, steered)
        return input
      },
      // The client's clientUserMessageId of a steer, on the userMessage item it became (the app clears its pending steer).
      clientIdFor: (messageId) => (messageId && thread.steerClientIds.get(messageId)) || null,
      onChild: (child) => registerChild(thread, child),
      onTurnStarted: (turnId) => {
        thread.history = null
        if (thread.control) { thread.control.turnId = turnId; return }
        for (const waiter of thread.turnWaiters.splice(0)) waiter(turnId)
        if (thread.review) {
          thread.review.turnId = turnId
          const item = { type: 'enteredReviewMode', id: `review-${turnId}`, review: thread.review.label }
          notify('item/started', { item, threadId: id, turnId, startedAtMs: Date.now() })
          notify('item/completed', { item, threadId: id, turnId, completedAtMs: Date.now() })
        }
        emitStatus(thread)
      },
      beforeTurnCompleted: (turnId) => {
        if (!thread.review || thread.review.turnId !== turnId) return
        const item = { type: 'exitedReviewMode', id: `review-exit-${turnId}`, review: thread.review.label }
        notify('item/started', { item, threadId: id, turnId, startedAtMs: Date.now() })
        notify('item/completed', { item, threadId: id, turnId, completedAtMs: Date.now() })
      },
      onTurnCompleted: (turn) => onTurnCompleted(thread, turn),
      // Dynamic workflow runs (workflows.js): a named live run is polled; an updated run's item replaces the cached one.
      onWorkflow: () => watchWorkflows(thread),
      onWorkflowItem: (item, turnId) => {
        const turn = thread.history?.turns?.find((entry) => entry.id === turnId)
        const index = turn ? turn.items.findIndex((entry) => entry.id === item.id) : -1
        if (index >= 0) turn.items[index] = item
      },
      contextWindow: () => thread.contextWindow,
      // A sub-agent's text and thinking: only in its child session's record (read-only, in step with the stream).
      childMessages: (childId, fromSequence) => storedMessages(paths.sessionDb, childId, { fromSequence }),
    })
    threads.set(id, thread)
    return thread
  }

  function registerChild(parent, child) {
    const meta = { ...child, parentId: parent.id, cwd: parent.cwd, startedAt: Date.now() }
    children.set(child.id, meta)
    store.update(child.id, { child: meta, childTurn: { id: `turn-${child.agentId}`, items: [], itemsView: 'full', status: 'inProgress', error: null, startedAt: seconds(meta.startedAt), completedAt: null, durationMs: null } })
    notify('thread/started', { thread: childThreadObject(child.id) })
  }

  /** A sub-agent's transcript is kept by the bridge (ZCode serves child sessions only to its desktop host). */
  function recordChild(method, params) {
    const entry = store.get(params.threadId)
    if (!entry?.child || !entry.childTurn) return
    const turn = entry.childTurn
    if (method === 'item/completed' || method === 'item/started') {
      const index = turn.items.findIndex((item) => item.id === params.item.id)
      if (index >= 0) turn.items[index] = params.item
      else turn.items.push(params.item)
    } else if (method === 'turn/completed') Object.assign(turn, { ...params.turn, items: turn.items, itemsView: 'full' })
    else return
    store.update(params.threadId, { childTurn: turn })
  }

  const childMeta = (id) => children.get(id) ?? store.get(id)?.child ?? null
  const isChild = (id) => !!childMeta(id)

  function childThreadObject(id) {
    const child = childMeta(id)
    const parent = threads.get(child.parentId)
    return {
      ...threadObject(parent ?? { id: child.parentId, cwd: child.cwd, createdAt: child.startedAt, updatedAt: Date.now(), permission: { mode: 'auto' } }, {}),
      id, sessionId: id, parentThreadId: child.parentId, forkedFromId: null, preview: child.description || child.prompt || 'Sub-agent', name: child.description || null,
      source: { subAgent: { thread_spawn: { parent_thread_id: child.parentId, depth: 1, agent_path: null, agent_nickname: child.description || null, agent_role: child.agentType || null } } },
      agentNickname: child.description || null, agentRole: child.agentType || null, status: { type: 'idle' }, createdAt: seconds(child.startedAt), updatedAt: seconds(Date.now()), recencyAt: seconds(Date.now()),
    }
  }

  function threadStatus(thread) {
    if (thread.pending.size) return { type: 'active', activeFlags: [...new Set([...thread.pending.values()].map((entry) => entry.flag))] }
    if (thread.projector.turn) return { type: 'active', activeFlags: [] }
    return thread.loaded ? { type: 'idle' } : { type: 'notLoaded' }
  }

  function emitStatus(thread) {
    const status = threadStatus(thread)
    const key = JSON.stringify(status)
    if (key === thread.lastStatus) return
    thread.lastStatus = key
    notify('thread/status/changed', { threadId: thread.id, status })
  }

  function modelKey(selection) {
    return selection?.providerId && selection?.modelId ? `${selection.providerId}/${selection.modelId}` : null
  }

  function threadObject(thread, info = {}) {
    const meta = store.get(thread.id) ?? {}
    const title = info.title ?? thread.title ?? meta.title ?? null
    const preview = meta.preview || (info.titleSource === 'first_input' || thread.titleSource === 'first_input' ? title : null) || title || ''
    const named = meta.name ?? ((info.titleSource ?? thread.titleSource) === 'custom' || (info.titleSource ?? thread.titleSource) === 'generated' ? title : null)
    const selection = thread.model ?? info.model ?? null
    return {
      id: thread.id, sessionId: thread.id, forkedFromId: meta.forkedFromId ?? info.parentSessionId ?? null, parentThreadId: null,
      preview: String(preview ?? '').slice(0, 200), ephemeral: false, section: null, sectionEnteredAt: null, projectId: null, historyMode: 'paginated',
      modelProvider: selection?.providerId ?? 'zcode', model: modelKey(selection), reasoningEffort: thread.effort ?? null,
      createdAt: seconds(info.createdAt ?? thread.createdAt), updatedAt: seconds(info.updatedAt ?? thread.updatedAt), recencyAt: seconds(info.updatedAt ?? thread.updatedAt),
      status: threads.has(thread.id) ? threadStatus(threads.get(thread.id)) : { type: 'notLoaded' },
      path: null, cwd: thread.cwd ?? info.workspace?.workspacePath ?? home, cliVersion: `zcode ${version || located?.version || 'unknown'}`, source: 'appServer', threadSource: null,
      agentNickname: null, agentRole: null, gitInfo: null, name: named || null, turns: [],
    }
  }

  function sessionResponse(thread, extra = {}) {
    const policy = codexPolicy(thread.permission.mode, thread.cwd)
    return {
      thread: threadObject(thread), model: modelKey(thread.model), modelProvider: thread.model?.providerId ?? 'zcode', serviceTier: null, cwd: thread.cwd,
      instructionSources: [], approvalPolicy: policy.approvalPolicy, approvalsReviewer: 'user', sandbox: policy.sandbox, reasoningEffort: thread.effort ?? null, ...extra,
    }
  }

  function requireThreadId(params) {
    if (typeof params.threadId !== 'string' || !params.threadId) throw new RpcError(INVALID_PARAMS, 'threadId is required')
    return params.threadId
  }

  const notFound = (threadId) => new RpcError(INVALID_PARAMS, 'This session is not available in ZCode.', { codexErrorInfo: 'threadNotFound', threadId })

  /** A thread's selection, mode and tool params from a thread/turn request. */
  /**
   * A thread's new permission. "Allow for this session" belongs to the mode it was given in: any mode change
   * (stricter or not, from the client, a plan approval or a review) drops the bridge's session grants.
   */
  function setPermission(thread, permission) {
    const before = thread.permission
    thread.permission = permission
    if (before && !samePermission(before, permission)) thread.grants.clear()
  }
  const samePermission = (a, b) => a.mode === b.mode && (a.approvals !== false) === (b.approvals !== false)

  function applyRequestParams(thread, params, { customization = true } = {}) {
    setPermission(thread, permissionOf(params, thread.permission))
    const selection = selectionFor(params.model) ?? thread.model
    if (selection) thread.model = selection
    const effort = params.effort ?? params.config?.model_reasoning_effort
    if (typeof effort === 'string' && effort) thread.effort = effort
    else if (selection && !thread.effort) thread.effort = defaultEffort(thread.model)
    if (thread.effort && thread.model) {
      const info = modelCache?.settings?.model?.available?.find((entry) => entry.ref?.providerId === thread.model.providerId && entry.ref?.modelId === thread.model.modelId)
      const levels = info?.reasoning?.levels?.map((level) => level.value) ?? []
      if (levels.length && !levels.includes(thread.effort)) thread.effort = defaultEffort(thread.model)
    }
    if (params.codeDesktop && Object.hasOwn(params.codeDesktop, 'tools')) thread.tools = normalizeTools(params.codeDesktop.tools)
    if (typeof params.codeDesktop?.dynamicWorkflows === 'boolean') thread.dynamicWorkflows = params.codeDesktop.dynamicWorkflows
    if (customization && isRecord(params.codeDesktop?.customization)) {
      const custom = params.codeDesktop.customization
      const next = { ...(thread.customization ?? {}) }
      for (const key of ['systemPrompt', 'instructions', 'modelParams']) if (Object.hasOwn(custom, key)) next[key] = custom[key] ?? null
      thread.customization = next
    }
    if (typeof params.developerInstructions === 'string') thread.developerInstructions = params.developerInstructions || null
    if (typeof params.cwd === 'string' && path.isAbsolute(params.cwd)) { try { thread.cwd = fs.realpathSync(params.cwd) } catch {} }
    store.update(thread.id, { cwd: thread.cwd, permission: thread.permission, model: thread.model ?? undefined, effort: thread.effort ?? undefined, tools: thread.tools ?? undefined, customization: thread.customization ?? undefined, developerInstructions: thread.developerInstructions ?? undefined, dynamicWorkflows: thread.dynamicWorkflows ?? undefined })
  }

  function normalizeTools(tools) {
    if (!tools || typeof tools !== 'object') return null
    const clean = (list) => [...new Set((Array.isArray(list) ? list : []).map((name) => String(name).trim()).filter(Boolean))].slice(0, 512)
    return { disabled: clean(tools.disabled).filter((name) => name !== 'run_code'), disabledServers: clean(tools.disabledServers) }
  }

  /**
   * The tools a session or turn must not offer. session: the list a session is created or resumed with (ZCode never
   * registers those for the session's runtime, and a workflow's agents inherit it); a turn's list is the same, from the
   * thread's current settings. The workflow run tools are offered in every mode (each run asks once: askPermission).
   */
  function toolDenylist(thread) {
    const names = new Set(UNAVAILABLE_TOOLS)
    if (thread.dynamicWorkflows !== true) for (const name of WORKFLOW_TOOLS) names.add(name)
    // node_repl's `js` drives the browser ZCode's host provides (Browser Use) or the computer (Computer Use, which shares
    // it). OpenClaude Desktop provides no browser (interaction/browserList: no backends), so it stays only for Computer Use.
    if (!officialPluginOn(COMPUTER_USE_PLUGIN, false)) names.add(NODE_REPL_TOOL)
    if (!thread.tools) return [...names]
    for (const name of thread.tools.disabled) names.add(name)
    for (const server of thread.tools.disabledServers) for (const tool of knownServerTools(server)) names.add(`mcp__${server}__${tool.name}`)
    return [...names]
  }

  /** Whether one of ZCode's official plugins is on in its config (plugins.enabledPlugins; `fallback` when unset). */
  function officialPluginOn(id, fallback) {
    const value = catalog.readConfig(paths.cliConfig)?.plugins?.enabledPlugins?.[id]
    return typeof value === 'boolean' ? value : fallback
  }

  function knownServerTools(server) {
    const seen = new Map()
    for (const record of proxy?.seen.values() ?? []) for (const tool of record.toolDefs ?? []) {
      const match = MCP_TOOL.exec(tool.name)
      if (match && match[1] === server) seen.set(match[2], { name: match[2], description: tool.description ?? '', inputSchema: tool.inputSchema })
    }
    for (const tool of mcpToolCache.get(server)?.tools ?? []) if (!seen.has(tool.name)) seen.set(tool.name, tool)
    return [...seen.values()]
  }

  /**
   * A session's mcpServers: ZCode takes the list as the session's complete set of configured servers (it replaces the
   * user + project config ZCode would merge itself), so it is sent only when it differs from ZCode's own (disabled
   * servers, or OpenClaude Desktop's code_desktop server named for `session`: the thread id, or the app's start token on
   * thread/start), and then rebuilt the way ZCode builds it for the session folder: the project's own .zcode/config.json
   * and zcode.json servers from the worktree root down, shadowed by the user's (catalog.effectiveMcpServers), each with
   * its timeout, OAuth client and protocol version. undefined otherwise.
   */
  function sessionMcpServers(thread, session = thread.id) {
    const disabled = new Set(thread.tools?.disabledServers ?? [])
    const own = appTools && !disabled.has(appTools.name) ? zcodeAppToolsServer(appTools, session) : null
    if (!disabled.size && !own) return undefined
    const config = catalog.readConfig(paths.cliConfig)
    const cwd = thread.cwd ?? home
    // With MCP off in ZCode's config (features.mcp false) only OpenClaude Desktop's own server runs.
    const configured = config?.features?.mcp === false && own ? [] : catalog.protocolMcpServers({ mcp: { servers: catalog.effectiveMcpServers(config, cwd) } }, { cwd }).filter((server) => !disabled.has(server.name) && server.name !== own?.name)
    return own ? [...configured, own] : configured
  }

  async function syncSessionSettings(thread) {
    const mode = zcodeMode(thread.permission.mode)
    if (thread.appliedMode !== mode) {
      await request('session/setMode', { sessionId: thread.id, mode })
      thread.appliedMode = mode
    }
    const selection = thread.model ? { ...thread.model, ...(thread.effort ? { options: { reasoningLevel: thread.effort } } : {}) } : null
    const key = JSON.stringify(selection)
    if (selection && thread.appliedModel !== key) {
      await request('session/setModel', { sessionId: thread.id, model: selection, persistAsWorkspaceLastUsed: false }).catch((error) => log(`zcode-bridge: setModel: ${error.message}`))
      if (thread.effort) await request('session/setThoughtLevel', { sessionId: thread.id, thoughtLevel: thread.effort, persistAsWorkspaceLastUsed: false }).catch(() => {})
      thread.appliedModel = key
    }
  }

  /**
   * A session's goal as ZCode reported it (session/resume and session/goal projections, session.updated events): the
   * client hears thread/goal/updated when it changed, thread/goal/cleared once it is gone. undefined: not reported.
   */
  function adoptGoal(thread, target) {
    if (target === undefined) return
    const goal = goalOf(target, thread.id)
    const before = thread.goal ?? null
    thread.goal = goal
    if (!goal) { if (before) notify('thread/goal/cleared', { threadId: thread.id }); return }
    if (JSON.stringify(goal) !== JSON.stringify(before)) notify('thread/goal/updated', { threadId: thread.id, turnId: thread.projector?.turnId ?? null, goal })
  }

  function adoptSessionResult(thread, result) {
    if (result?.projection && Object.hasOwn(result.projection, 'target')) adoptGoal(thread, result.projection.target ?? null)
    const session = result?.session
    if (session) {
      thread.title = session.title || thread.title
      thread.titleSource = session.titleSource ?? thread.titleSource
      if (session.workspace?.workspacePath) thread.cwd = session.workspace.workspacePath
      if (!thread.model && session.model) thread.model = { providerId: session.model.providerId, modelId: session.model.modelId }
      thread.createdAt = session.createdAt ?? thread.createdAt
      thread.updatedAt = session.updatedAt ?? thread.updatedAt
    }
    const settings = result?.settings
    const current = settings?.model?.current
    if (!thread.model && current) thread.model = { providerId: current.providerId, modelId: current.modelId }
    if (!thread.effort && (current?.options?.reasoningLevel || settings?.thoughtLevel?.current)) thread.effort = current?.options?.reasoningLevel ?? settings.thoughtLevel.current
    const info = settings?.model?.available?.find((entry) => entry.ref?.providerId === thread.model?.providerId && entry.ref?.modelId === thread.model?.modelId)
    if (info?.contextWindow) thread.contextWindow = info.contextWindow
    if (result?.projection?.contextWindow) thread.contextWindow = thread.contextWindow ?? result.projection.contextWindow
  }

  async function subscribe(thread) {
    if (thread.subscribed) return
    await request('session/subscribe', { sessionId: thread.id, deliveryKind: 'desktop-continuous', includeSnapshot: false })
    thread.subscribed = true
  }

  async function startThread(params) {
    const cwd = typeof params.cwd === 'string' && params.cwd ? params.cwd : home
    if (!path.isAbsolute(cwd)) throw new RpcError(INVALID_PARAMS, `cwd must be absolute: ${cwd}`)
    let real = cwd
    try { real = fs.realpathSync(cwd) } catch { throw new RpcError(INVALID_PARAMS, `The folder ${cwd} doesn’t exist.`) }
    const permission = permissionOf(params)
    const selection = selectionFor(params.model)
    const draft = { id: null, cwd: real, permission, tools: params.codeDesktop && Object.hasOwn(params.codeDesktop, 'tools') ? normalizeTools(params.codeDesktop.tools) : null, dynamicWorkflows: params.codeDesktop?.dynamicWorkflows === true }
    if (!modelCache) await settingsCatalog().catch(() => null)
    const effort = params.effort ?? params.config?.model_reasoning_effort ?? defaultEffort(selection ?? modelCache?.settings?.model?.current)
    const mcpServers = sessionMcpServers(draft, sessionIdentityOf(params))
    const result = await request('session/create', {
      workspace: workspaceOf(real), mode: zcodeMode(permission.mode), persistence: 'deferred',
      ...(selection ? { model: { ...selection, ...(effort ? { options: { reasoningLevel: effort } } : {}) } } : {}),
      ...(effort ? { thoughtLevel: effort } : {}),
      toolDenylist: toolDenylist(draft), dynamicWorkflowEnabled: draft.dynamicWorkflows,
      ...(mcpServers ? { mcpServers } : {}),
      // A workflow agent (the runner's own bridge) is never a session anyone reads by title: no extra title model call.
      ...(runnerRole ? { titleGenerationEnabled: false } : {}),
    })
    const id = result?.session?.sessionId
    if (!id) throw new RpcError(-32000, 'ZCode did not create a session.')
    const thread = newThread(id, { cwd: real, permission, model: selection, effort })
    thread.loaded = true
    thread.workflowRuntime = draft.dynamicWorkflows
    thread.appliedMode = zcodeMode(permission.mode)
    adoptSessionResult(thread, result)
    thread.appliedModel = JSON.stringify(thread.model ? { ...thread.model, ...(thread.effort ? { options: { reasoningLevel: thread.effort } } : {}) } : null)
    applyRequestParams(thread, params)
    store.update(id, { createdAt: thread.createdAt })
    await subscribe(thread)
    notify('thread/started', { thread: threadObject(thread) })
    return sessionResponse(thread)
  }

  /** Load a thread's session in ZCode (resume) if needed. */
  async function loadThread(threadId, params = {}) {
    if (store.isDeleted(threadId)) throw notFound(threadId)
    let thread = threads.get(threadId)
    if (thread?.loaded && agent && !agent.closed) return thread
    const meta = store.get(threadId)
    thread ??= newThread(threadId, {})
    // The Dynamic workflows setting this request carries decides the runtime ZCode builds now (sessionWorkflowGate).
    if (typeof params?.codeDesktop?.dynamicWorkflows === 'boolean') thread.dynamicWorkflows = params.codeDesktop.dynamicWorkflows
    const workspace = meta?.cwd ? workspaceOf(meta.cwd) : undefined
    let result
    const mcpServers = sessionMcpServers(thread, threadId)
    const dynamicWorkflowEnabled = thread.dynamicWorkflows === true
    try {
      result = await request('session/resume', {
        sessionId: threadId, ...(workspace ? { workspace } : {}), ...(thread.effort ? { thoughtLevel: thread.effort } : {}),
        toolDenylist: toolDenylist(thread), dynamicWorkflowEnabled, ...(mcpServers ? { mcpServers } : {}),
      })
    } catch (error) {
      if (!threads.get(threadId)?.loaded) threads.delete(threadId)
      if (/not found|unknown session|not exist|No session/i.test(error?.message ?? '')) throw notFound(threadId)
      throw error
    }
    thread.loaded = true
    thread.subscribed = false
    thread.workflowRuntime = dynamicWorkflowEnabled
    thread.appliedMode = result?.settings?.mode?.current ?? result?.session?.mode ?? null
    adoptSessionResult(thread, result)
    if (params && Object.keys(params).length) applyRequestParams(thread, params)
    await subscribe(thread)
    return thread
  }

  async function messagesOf(threadId) {
    const result = await request('session/messages', { sessionId: threadId })
    return result?.messages ?? []
  }

  async function historyOf(thread) {
    if (thread.history && !thread.projector.turn) return thread.history
    // session/messages lists every branch: a rewind (here or in the ZCode app) only records a branch cut in the
    // session row (session.revert), which ZCode's own views apply. Apply it the same way.
    const [stored, revert] = await Promise.all([messagesOf(thread.id), sessionRevert(paths.sessionDb, thread.id).catch(() => null)])
    const messages = activeMessages(stored, revert)
    const meta = store.get(thread.id) ?? {}
    const built = turnsFromMessages(messages, { threadId: thread.id, cwd: thread.cwd, running: !!thread.projector.turn, activeTurnId: thread.projector.turnId, inputs: meta.inputs })
    if (!meta.preview) {
      const preview = previewOf(messages)
      if (preview) store.update(thread.id, { preview })
    }
    if (built.lastUsage && !thread.projector.last) {
      const breakdown = (t) => {
        const input = (t.input ?? 0) + (t.cache?.read ?? 0) + (t.cache?.write ?? 0)
        return { totalTokens: input + (t.output ?? 0), inputTokens: input, cachedInputTokens: t.cache?.read ?? 0, cacheWriteInputTokens: t.cache?.write ?? 0, outputTokens: t.output ?? 0, reasoningOutputTokens: t.reasoning ?? 0 }
      }
      // The total too: a reopened thread's running total, not zero under a non-zero last request.
      thread.projector.seedUsage({ last: breakdown(built.lastUsage), ...(built.totalUsage ? { total: breakdown(built.totalUsage) } : {}), contextWindow: thread.contextWindow })
    }
    if (built.plan) thread.projector.plan = built.plan
    await workflowHistory(thread, built.turns).catch((error) => log(`zcode-bridge: workflow history: ${error?.message ?? error}`))
    thread.history = built
    watchWorkflows(thread)
    return built
  }

  // ---------------------------------------------------------------- dynamic workflows (workflows.js)

  /**
   * sessionWorkflowGate: whether a request's Dynamic workflows setting needs the session's runtime rebuilt. ZCode
   * registers its workflow tools when a session's runtime is built (dynamicWorkflowEnabled, plus the session's tool
   * denylist), so turning the setting on reopens the session before its next turn; turning it off applies at once
   * through the turn's denylist.
   */
  function sessionWorkflowGate(thread, params) {
    if (typeof params?.codeDesktop?.dynamicWorkflows !== 'boolean') return
    thread.dynamicWorkflows = params.codeDesktop.dynamicWorkflows
    if (thread.loaded && thread.dynamicWorkflows && thread.workflowRuntime === false) thread.mcpStale = true
  }

  /** Every journal event of a run after a sequence (v4/conversation/workflowRunEvents pages). */
  async function workflowEventsOf(threadId, runId, afterSequence = 0) {
    const events = []
    let after = afterSequence
    for (let page = 0; page < 400; page++) {
      const result = await request('v4/conversation/workflowRunEvents', { sessionId: threadId, runId, ...(after > 0 ? { afterSequence: after } : {}), limit: 500 }, { timeoutMs: 30000 })
      const batch = Array.isArray(result?.events) ? result.events : []
      events.push(...batch)
      if (!result?.hasMore || !batch.length) break
      after = batch.at(-1).sequence
    }
    return events
  }

  async function workflowSummaries(threadId) {
    const result = await request('v4/conversation/workflowRuns', { sessionId: threadId, limit: 64 }, { timeoutMs: 30000 })
    return Array.isArray(result?.runs) ? result.runs : []
  }

  /**
   * A history's workflow runs from their journals (history.js gave each dispatch item the run its tool part names):
   * the run summaries name the run of each call, each run's journal rebuilds its phases and agents, and a run still
   * live is watched from here on. A run resumed by a later call shows, on the earlier item, how it was before.
   */
  async function workflowHistory(thread, turns) {
    const found = []
    for (const turn of turns) for (const item of turn.items) if (item?.workflowRun && item.type === 'dynamicToolCall') found.push({ turn, item })
    if (!found.length) return
    const summaries = await workflowSummaries(thread.id).catch((error) => { log(`zcode-bridge: workflow runs: ${error?.message ?? error}`); return [] })
    const byCall = new Map(summaries.filter((summary) => summary.toolCallId).map((summary) => [summary.toolCallId, summary]))
    const byRun = new Map(summaries.map((summary) => [summary.runId, summary]))
    const runs = new Map()
    for (const entry of found) {
      const watched = thread.projector.workflowEntry(entry.item.id)
      if (watched) { entry.item.workflowRun = watched.state.run; continue }
      entry.state = workflowState(entry.item.workflowRun)
      bindWorkflowRun(entry.state, byCall.get(entry.item.id)?.runId)
      const runId = entry.state.run.runId
      if (runId) runs.set(runId, [...(runs.get(runId) ?? []), entry])
    }
    const followed = []
    for (const [runId, entries] of runs) {
      const events = await workflowEventsOf(thread.id, runId).catch((error) => { log(`zcode-bridge: workflow ${runId}: ${error?.message ?? error}`); return [] })
      const summary = byRun.get(runId)
      const time = Number.isFinite(summary?.updatedAt) ? summary.updatedAt : Date.now()
      entries.forEach((entry, index) => {
        const last = index === entries.length - 1
        applyWorkflowEvents(entry.state, events, { time, stopAtStart: last ? Infinity : index + 2 })
        if (last && summary) applyWorkflowSummary(entry.state, summary, time)
        if (!last) applyWorkflowInterrupted(entry.state, time, 'Interrupted; resumed later')
        if (last) followed.push(entry)
        entry.item.workflowRun = entry.state.run
        if (last) thread.projector.adoptWorkflow({ callId: entry.item.id, item: entry.item, turnId: entry.turn.id, state: entry.state })
      })
    }
    // A run the card's Configure replaced (superseded by a run of a settings turn, toolCallId settings-…, which has no
    // tool call of its own): the card follows the revised run, as it did live.
    for (const entry of followed) {
      for (let hop = 0; hop < 8 && entry.state.supersededBy; hop++) {
        const next = byRun.get(entry.state.supersededBy)
        if (!next || (next.toolCallId && !String(next.toolCallId).startsWith('settings-'))) break
        const events = await workflowEventsOf(thread.id, next.runId).catch(() => [])
        const time = Number.isFinite(next.updatedAt) ? next.updatedAt : Date.now()
        const state = workflowReplacement(entry.state, next.runId, time)
        applyWorkflowEvents(state, events, { time })
        applyWorkflowSummary(state, next, time)
        entry.state = state
        entry.item.workflowRun = state.run
        const watched = thread.projector.workflowEntry(entry.item.id)
        if (watched) watched.state = state
      }
    }
  }

  /** Poll the thread's live runs while there are any (and ZCode runs). */
  function watchWorkflows(thread) {
    if (thread.workflowTimer || !thread.projector.liveWorkflows().length || !agent || agent.closed) return
    thread.workflowTimer = setInterval(() => void pollWorkflows(thread), WORKFLOW_POLL_MS)
    thread.workflowTimer.unref?.()
    setTimeout(() => void pollWorkflows(thread), 0)
  }

  async function pollWorkflows(thread) {
    if (thread.workflowPolling) return
    const live = thread.projector.liveWorkflows()
    if (!live.length || !agent || agent.closed) {
      clearInterval(thread.workflowTimer)
      thread.workflowTimer = null
      return
    }
    thread.workflowPolling = true
    try {
      for (const entry of live) {
        thread.projector.workflowEvents(entry.callId, await workflowEventsOf(thread.id, entry.runId, entry.cursor))
        // The run's task ended and its journal has not settled it: its summary (else the task's status) does.
        const current = thread.projector.workflowEntry(entry.callId)
        if (current?.state.taskEnded && current.state.run.status === 'running') {
          const summary = (await workflowSummaries(thread.id).catch(() => [])).find((candidate) => candidate.runId === entry.runId)
          thread.projector.workflowSettle(entry.callId, summary ?? null)
        }
      }
    } catch (error) {
      log(`zcode-bridge: workflow progress: ${error?.message ?? error}`)
    } finally {
      thread.workflowPolling = false
    }
  }

  /**
   * codeDesktop/workflow/stop: ZCode cancels that run's background task (taskId ≡ runId; the run service aborts the
   * run, settles it stopped and keeps its finished work for a resume). The turn and other runs go on. A run ZCode has
   * not named yet (its approval or compile is still in the turn, run.stopScope 'turn') stops with that turn.
   */
  /**
   * codeDesktop/workflow/resume: a stopped or interrupted run ZCode marks resumable (run.resumable, its own resume gate)
   * goes on from its journal (v4/command resumeWorkflowRun {workId: runId}, ZCode's Resume), with no model turn. The
   * run's agents run without asking, as when it started, so a read-only mode never resumes one.
   */
  async function resumeWorkflow(thread, runId) {
    if (typeof runId !== 'string' || !runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
    let entry = thread.projector.workflowFor(runId)
    if (!entry) { await historyOf(thread).catch(() => null); entry = thread.projector.workflowFor(runId) }
    if (!entry) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
    const run = entry.state.run
    if (run.status === 'running') return { status: 'alreadyRunning' }
    if (!run.runId || run.resumable !== true) throw new RpcError(-32000, 'ZCode can’t resume this workflow run.')
    if (isReadOnlyMode(thread.permission.mode)) throw new RpcError(-32000, `This session is in a read-only mode (${thread.permission.mode}), and a workflow’s agents can change files and run commands. Switch to another mode to resume it.`)
    try {
      await v4Command(thread.id, 'resumeWorkflowRun', { workId: run.runId, ...(run.name && run.name !== 'workflow' ? { name: run.name } : {}) })
    } catch (error) {
      const reason = /workflowRunResumeRejected\.([a-z_]+)/.exec(String(error?.message ?? ''))?.[1]
      const why = { not_found: 'ZCode no longer has this run.', not_resumable: 'ZCode says this run can’t be resumed.', superseded: 'A revised run replaced this one.', already_running: 'It is already running.', script_missing: 'Its script is gone.', script_mismatch: 'Its script changed since it ran.', compile_failed: 'Its script no longer compiles.' }[reason]
      throw new RpcError(-32000, `ZCode couldn’t resume this workflow${why ? `: ${why}` : `: ${error?.message ?? error}`}`)
    }
    thread.projector.workflowResumed(entry.callId)
    watchWorkflows(thread)
    return { status: 'resuming' }
  }

  /**
   * ZCode's saved workflows (SaveWorkflow: <cwd>/.zcode/workflows/<name>.dwf.ts, the global ones in ~/.zcode/workflows),
   * for the app's '/' menu and Settings › Dynamic workflows: workflows/list of both scopes, and workflows/get | delete |
   * runs of one by name and scope. A folder the app names (cwd) only, absolute.
   */
  function savedWorkflowParams(params, { nameRequired = true } = {}) {
    const cwd = typeof params?.cwd === 'string' && path.isAbsolute(params.cwd) && !params.cwd.includes('\0') ? params.cwd : null
    if (!cwd) throw new RpcError(INVALID_PARAMS, 'cwd must be an absolute folder')
    const scope = params?.scope === 'global' ? 'global' : params?.scope === 'project' || params?.scope === undefined ? (params?.scope ?? null) : undefined
    if (scope === undefined) throw new RpcError(INVALID_PARAMS, 'scope must be project or global')
    const name = typeof params?.name === 'string' && params.name.trim() && params.name.length <= 128 ? params.name.trim() : null
    if (nameRequired && !name) throw new RpcError(INVALID_PARAMS, 'name is required')
    return { cwd, scope, name }
  }
  async function savedWorkflowsList(params) {
    const { cwd } = savedWorkflowParams(params, { nameRequired: false })
    const [project, global] = await Promise.all(['project', 'global'].map((scope) => request('workflows/list', { workspace: workspaceOf(cwd), scope }, { timeoutMs: 30000 }).catch((error) => {
      log(`zcode-bridge: saved workflows (${scope}): ${error?.message ?? error}`)
      return null
    })))
    const workflows = [], invalid = []
    const seen = new Set()
    for (const result of [project, global]) {
      for (const entry of Array.isArray(result?.workflows) ? result.workflows : []) {
        if (typeof entry?.name !== 'string' || !entry.name) continue
        // The project's own wins over a global one of the same name (ZCode resolves a name project first).
        const key = entry.name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        workflows.push({ name: entry.name, description: typeof entry.description === 'string' ? entry.description : '', ...(typeof entry.whenToUse === 'string' && entry.whenToUse ? { whenToUse: entry.whenToUse } : {}),
          ...(entry.args && typeof entry.args === 'object' ? { args: entry.args } : {}), scope: entry.scope === 'global' ? 'global' : 'project', path: typeof entry.path === 'string' ? entry.path : null })
      }
      for (const entry of Array.isArray(result?.invalid) ? result.invalid : []) if (typeof entry?.path === 'string') invalid.push({ path: entry.path, reason: typeof entry.reason === 'string' ? entry.reason : 'invalid' })
    }
    return { workflows, invalid, dirs: [project?.dir, global?.dir].filter((dir) => typeof dir === 'string') }
  }
  async function savedWorkflowCall(method, params) {
    const { cwd, scope, name } = savedWorkflowParams(params)
    const result = await request(method, { workspace: workspaceOf(cwd), name, ...(scope ? { scope } : {}) }, { timeoutMs: 30000 })
    if (result?.ok === false) {
      const why = { invalid_name: 'That isn’t a valid workflow name.', not_found: 'ZCode can’t find this saved workflow.', parse_error: 'This saved workflow’s header can’t be read.', read_error: 'This saved workflow can’t be read.' }[result.reason]
      throw new RpcError(-32000, why ?? `ZCode refused: ${result.reason ?? 'unknown'}`)
    }
    return result
  }

  /**
   * codeDesktop/workflow/settings: a running run's sub-agent model and agent limit (ZCode's run card Configure, v4
   * amendWorkflowRunSettings): omitted = unchanged, null = back to the default (the session's model, this computer's
   * limit). A new limit applies in place; a new model goes on as a revised run that reuses the finished agents, which
   * the same card follows from then on. No model turn is needed for either (ZCode tells GLM in a settings turn).
   */
  async function workflowSettings(thread, { runId, subagentModel, maxConcurrency } = {}) {
    if (typeof runId !== 'string' || !runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
    if (subagentModel !== undefined && subagentModel !== null && (typeof subagentModel !== 'string' || !subagentModel || subagentModel.length > 256)) throw new RpcError(INVALID_PARAMS, 'subagentModel must be a model id or null')
    if (maxConcurrency !== undefined && maxConcurrency !== null && !(Number.isInteger(maxConcurrency) && maxConcurrency >= 1 && maxConcurrency <= 1024)) throw new RpcError(INVALID_PARAMS, 'maxConcurrency must be a whole number from 1, or null')
    if (subagentModel === undefined && maxConcurrency === undefined) throw new RpcError(INVALID_PARAMS, 'Nothing to change.')
    let entry = thread.projector.workflowFor(runId)
    if (!entry) { await historyOf(thread).catch(() => null); entry = thread.projector.workflowFor(runId) }
    if (!entry) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
    const run = entry.state.run
    if (run.status !== 'running' || !run.runId) throw new RpcError(-32000, 'ZCode can only change a running workflow’s settings.')
    const payload = { workId: run.runId, ...(subagentModel !== undefined ? { subagentModel } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) }
    const ack = await request('v4/command', { commandId: randomUUID(), clientId: 'code-desktop', sessionId: thread.id, type: 'amendWorkflowRunSettings', payload, issuedAt: Date.now() })
    if (ack?.status !== 'accepted') {
      const reason = /workflowRunSettingsRejected\.([a-z_]+)/.exec(`${ack?.reasonCode ?? ''} ${ack?.message ?? ''}`)?.[1]
      const why = { not_found: 'ZCode no longer has this run.', not_configurable: 'This run’s settings can’t be changed.', unchanged: 'Nothing changed.', script_missing: 'Its script is gone.', model_unavailable: 'That model isn’t available.', compile_failed: 'Its script no longer compiles.' }[reason]
      throw new RpcError(-32000, `ZCode couldn’t change this workflow’s settings${why ? `: ${why}` : ack?.message ? `: ${ack.message}` : '.'}`)
    }
    const next = typeof ack.result?.runId === 'string' && ack.result.runId ? ack.result.runId : run.runId
    if (next !== run.runId) thread.projector.workflowReplaced(entry.callId, next)
    watchWorkflows(thread)
    return { status: 'accepted', runId: next, replaced: next !== run.runId }
  }

  /**
   * codeDesktop/workflow/artifact: one deliverable a run published (run.artifacts, from its journal's artifact-published
   * events), read from ZCode's store: a markdown or file member's bytes (v4/conversation/workflowRunArtifactRead, in
   * chunks, up to ARTIFACT_READ_LIMIT; text as text, a small image as base64), a board member's reported items
   * (workflowRunArtifactData pages) with its spec. Only an id ZCode lists for that run of this session.
   */
  async function workflowArtifact(thread, { runId, artifactId, version } = {}) {
    if (typeof runId !== 'string' || !runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
    if (typeof artifactId !== 'string' || !artifactId || artifactId.length > 64) throw new RpcError(INVALID_PARAMS, 'artifactId is required')
    let entry = thread.projector.workflowFor(runId)
    if (!entry) { await historyOf(thread).catch(() => null); entry = thread.projector.workflowFor(runId) }
    const zcodeRun = entry?.state.run.runId
    if (!zcodeRun) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
    const listed = await request('v4/conversation/workflowRunArtifacts', { sessionId: thread.id, runId: zcodeRun }, { timeoutMs: 30000 })
    const artifact = (Array.isArray(listed?.artifacts) ? listed.artifacts : []).find((candidate) => candidate?.id === artifactId)
    if (!artifact) throw new RpcError(-32000, 'ZCode no longer has this deliverable.')
    const base = { id: artifact.id, kind: artifact.kind, version: artifact.version, ...(artifact.title ? { title: artifact.title } : {}), ...(artifact.description ? { description: artifact.description } : {}),
      ...(artifact.contentType ? { contentType: artifact.contentType } : {}), ...(artifact.sourcePath ? { sourcePath: artifact.sourcePath } : {}), ...(artifact.primary ? { primary: true } : {}) }
    if (artifact.kind === 'markdown' || artifact.kind === 'file') {
      const wanted = Number.isInteger(version) && (artifact.versions ?? []).some((entry) => entry?.version === version) ? version : artifact.version
      const chunks = []
      let offset = 0, total = 0, mediaType = artifact.contentType ?? 'application/octet-stream', totalBytes = 0
      while (offset !== null && total < ARTIFACT_READ_LIMIT) {
        const part = await request('v4/conversation/workflowRunArtifactRead', { sessionId: thread.id, runId: zcodeRun, artifactId, version: wanted, offset, limit: 512 * 1024 }, { timeoutMs: 30000 })
        const bytes = Buffer.from(String(part?.dataBase64 ?? ''), 'base64')
        chunks.push(bytes)
        total += bytes.length
        if (typeof part?.mediaType === 'string') mediaType = part.mediaType
        if (Number.isInteger(part?.totalBytes)) totalBytes = part.totalBytes
        offset = Number.isInteger(part?.nextOffset) && part.nextOffset > offset ? part.nextOffset : null
      }
      const data = Buffer.concat(chunks)
      const textual = artifact.kind === 'markdown' || /^text\/|[+/](json|xml|yaml|markdown|csv|javascript|typescript)\b/i.test(mediaType)
      const image = /^image\/(png|jpe?g|gif|webp|svg\+xml)$/i.test(mediaType) && offset === null
      return { ...base, version: wanted, mediaType, totalBytes: totalBytes || data.length, truncated: offset !== null,
        ...(textual ? { text: data.toString('utf8') } : image ? { dataBase64: data.toString('base64') } : {}) }
    }
    const items = []
    let after
    for (let page = 0; page < ARTIFACT_DATA_PAGES; page++) {
      const result = await request('v4/conversation/workflowRunArtifactData', { sessionId: thread.id, runId: zcodeRun, artifactId, ...(after !== undefined ? { afterSequence: after } : {}), limit: 500 }, { timeoutMs: 30000 })
      const rows = Array.isArray(result?.items) ? result.items : []
      for (const row of rows) items.push(row?.item ?? null)
      after = rows.at(-1)?.sequence
      if (!result?.hasMore || !Number.isInteger(after)) break
    }
    return { ...base, spec: artifact.spec ?? null, items }
  }

  async function stopWorkflow(thread, runId) {
    if (typeof runId !== 'string' || !runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
    let entry = thread.projector.workflowFor(runId)
    if (!entry) { await historyOf(thread).catch(() => null); entry = thread.projector.workflowFor(runId) }
    if (!entry) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
    if (entry.state.run.status !== 'running') return { status: 'alreadyFinished' }
    const id = entry.state.run.runId
    if (!id) {
      if (thread.projector.turn && entry.turnId === thread.projector.turnId) {
        await request('session/stop', { sessionId: thread.id }).catch(() => {})
        return { status: 'stopping' }
      }
      thread.projector.workflowStopped(entry.callId)
      return { status: 'alreadyFinished' }
    }
    let result
    try {
      result = await request('session/cancelBackgroundTask', { sessionId: thread.id, taskId: id })
    } catch (error) {
      throw new RpcError(-32000, `ZCode couldn’t stop this workflow: ${error?.message ?? error}`)
    }
    if (result?.cancelled === true) { watchWorkflows(thread); return { status: 'stopping' } }
    if (result?.reason === 'background_task_not_running' || result?.reason === 'background_task_not_found') {
      // Already over (or a run ZCode no longer has as a task): its journal and summary say how it ended.
      thread.projector.workflowEvents(entry.callId, await workflowEventsOf(thread.id, id, entry.state.cursor).catch(() => []))
      const summary = (await workflowSummaries(thread.id).catch(() => [])).find((candidate) => candidate.runId === id)
      thread.projector.workflowSettle(entry.callId, summary ?? null)
      if (entry.state.run.status !== 'running') return { status: 'alreadyFinished' }
      throw new RpcError(-32000, 'ZCode no longer has this workflow run as a task, so it couldn’t be stopped.')
    }
    throw new RpcError(-32000, `ZCode didn’t stop this workflow${result?.reason ? ` (${result.reason})` : ''}.`)
  }

  async function sessionInfo(threadId) {
    const listed = await request('session/list', { sessionIds: [threadId] }).catch(() => null)
    return listed?.sessions?.find((session) => session.sessionId === threadId) ?? null
  }

  // ---------------------------------------------------------------- turns

  function inputToZCode(input) {
    const texts = []
    const attachments = []
    let skill = null
    let command = null
    for (const part of Array.isArray(input) ? input : []) {
      if (part?.type === 'text' && typeof part.text === 'string') texts.push(part.text)
      else if (part?.type === 'localImage' && typeof part.path === 'string') attachments.push({ kind: 'image', localPath: part.path, filename: path.basename(part.path), mimeType: mimeOf(part.path) })
      else if (part?.type === 'image' && typeof part.url === 'string') {
        const data = /^data:([^;]+);base64,(.*)$/.exec(part.url)
        if (data) attachments.push({ kind: 'image', dataBase64: data[2], mimeType: data[1], filename: 'image' })
        else texts.push(`[Attached image URL: ${part.url}]`)
      } else if (part?.type === 'mention' && typeof part.path === 'string') {
        let isFile = false
        try { isFile = fs.statSync(part.path).isFile() } catch {}
        if (isFile) attachments.push(fileAttachment(part.path, part.name ?? path.basename(part.path)))
        else texts.push(`@${part.path}`)
      } else if (part?.type === 'skill' && typeof part.name === 'string') {
        // A ZCode slash command listed among the skills (skills/list, path "command:<name>") runs as `/<name> args`.
        if (typeof part.path === 'string' && part.path.startsWith(COMMAND_PATH)) command = part.path.slice(COMMAND_PATH.length) || part.name
        else skill = part.name
      }
    }
    let content = texts.join('\n')
    if (command) content = `/${command}${content ? ` ${content}` : ''}`
    else if (skill && !content.trimStart().startsWith('/')) content = `/skill ${skill}${content ? ` ${content}` : ''}`
    if (!content.trim() && !attachments.length) throw new RpcError(INVALID_PARAMS, 'input must not be empty')
    return { content, attachments, command }
  }

  const mimeOf = (file) => IMAGE_MIME[path.extname(file).toLowerCase()] ?? 'image/png'

  /** Resolves with the id of the next turn the thread starts (null on timeout); `.cancel()` stops waiting. */
  function waitForTurn(thread, timeoutMs = TURN_START_TIMEOUT_MS) {
    let done
    const promise = new Promise((resolve) => {
      const timer = setTimeout(() => { thread.turnWaiters = thread.turnWaiters.filter((entry) => entry !== done); resolve(null) }, timeoutMs)
      done = (turnId) => { clearTimeout(timer); resolve(turnId) }
      thread.turnWaiters.push(done)
    })
    promise.cancel = () => { thread.turnWaiters = thread.turnWaiters.filter((entry) => entry !== done); done(null) }
    return promise
  }

  const pendingTurn = (turnId) => ({ id: turnId ?? `turn-pending-${randomUUID()}`, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(Date.now()), completedAt: null, durationMs: null })

  /** A new turn from Codex input: a prompt (session/send), or `/goal`, which ZCode runs through session/goal. */
  async function submitTurn(thread, input) {
    const parsed = inputToZCode(input)
    if (parsed.command === 'goal') return goalTurn(thread, input, parsed)
    return sendTurn(thread, input, { parsed })
  }

  /** Inlined instructions when no provider proxy can carry them (see instructions.js): once, until they change. */
  function inlineInstructions(thread, content) {
    if (proxy) return { content, key: null }
    // What the proxy would have appended to the system prompt (a replaced system prompt has no equivalent here).
    const project = typeof thread.customization?.instructions === 'string' && thread.customization.instructions.trim() ? `# Project instructions\n\n${thread.customization.instructions.trim()}` : ''
    const text = [project, typeof thread.developerInstructions === 'string' ? thread.developerInstructions.trim() : '', appToolsInstructions(thread), browserNote(thread)].filter(Boolean).join('\n\n')
    const key = instructionsKey(text)
    if (!key || key === thread.instructionsSent) return { content, key: null }
    // A slash command must stay at the start of the prompt: the block goes into the arguments of a command that hands
    // them to the model (`/skill name …`, `/init …`); any other command leaves it for the next prompt that can carry it.
    const placed = placeInstructions(content, instructionsBlock(text))
    return placed === null ? { content, key: null } : { content: placed, key }
  }

  function forgetInstructions(thread) {
    if (!thread.instructionsSent) return
    thread.instructionsSent = null
    store.update(thread.id, { instructionsSent: undefined })
  }

  async function sendTurn(thread, input, { codexInput = input, parsed = null } = {}) {
    const { content: typed, attachments } = parsed ?? inputToZCode(input)
    if (!store.get(thread.id)?.preview && typed.trim()) store.update(thread.id, { preview: typed.trim().slice(0, 200) })
    await syncSessionSettings(thread)
    const { content, key: instructions } = inlineInstructions(thread, typed)
    thread.pendingInputs.push(codexInput)
    const turnPromise = waitForTurn(thread)
    const selection = thread.model ? { ...thread.model, ...(thread.effort ? { options: { reasoningLevel: thread.effort } } : {}) } : undefined
    try {
      await request('session/send', {
        sessionId: thread.id, content, inputId: `cd-${randomUUID()}`, ...(attachments.length ? { attachments } : {}),
        ...(selection ? { modelSelection: selection } : {}), toolDenylist: toolDenylist(thread),
      })
    } catch (error) {
      thread.pendingInputs.pop()
      turnPromise.cancel()
      if (/already running|busy/i.test(error?.message ?? '')) throw new RpcError(-32600, 'A turn is already running in this session.', { codexErrorInfo: 'activeTurnNotSteerable' })
      throw error
    }
    if (instructions) {
      thread.instructionsSent = instructions
      store.update(thread.id, { instructionsSent: instructions })
    }
    const turnId = await turnPromise
    store.update(thread.id, { updatedAt: Date.now() })
    return pendingTurn(turnId)
  }

  /** ZCode's `/goal [pause|resume|clear|replace <objective>|<objective>]` (session/goal, as the ZCode app sends it). */
  function goalAction(content) {
    const args = content.replace(/^\s*\/goal\b/i, '').trim()
    const [first = '', ...rest] = args.split(/\s+/)
    const word = first.toLowerCase()
    if (!args) return { action: 'show' }
    if (['show', 'pause', 'resume', 'clear'].includes(word) && !rest.length) return { action: word }
    if (word === 'replace') return { action: 'replace', objective: rest.join(' ') }
    return { action: 'set', objective: args }
  }

  async function goalTurn(thread, input, { content }) {
    const { action, objective: typed } = goalAction(content)
    await syncSessionSettings(thread)
    // A goal's turns are ZCode's own (no session/send per round), so pending instructions ride in the objective,
    // which ZCode repeats in every round it drives.
    const pending = typed ? inlineInstructions(thread, '') : { key: null }
    const objective = pending.key ? goalObjective(typed, pending.content) : typed
    thread.pendingInputs.push(input)
    const turnPromise = waitForTurn(thread)
    const inputId = `cd-${randomUUID()}`
    let result
    try {
      result = await request('session/goal', { sessionId: thread.id, inputId, action, ...(objective ? { objective } : {}) }, { timeoutMs: 120000 })
    } catch (error) {
      thread.pendingInputs.pop()
      turnPromise.cancel()
      throw error
    }
    adoptGoal(thread, result?.snapshot?.projection ? result.snapshot.projection.target ?? null : undefined)
    store.update(thread.id, { updatedAt: Date.now() })
    if (result?.startedTurn && pending.key) {
      thread.instructionsSent = pending.key
      store.update(thread.id, { instructionsSent: pending.key })
    }
    if (result?.startedTurn) return pendingTurn(await turnPromise)
    // No turn (show, pause, a usage hint): ZCode's reply is the answer. It is shown as a turn of its own, which
    // ZCode does not keep in the session's history.
    turnPromise.cancel()
    const index = thread.pendingInputs.lastIndexOf(input)
    if (index >= 0) thread.pendingInputs.splice(index, 1)
    const turnId = `turn-goal-${randomUUID()}`
    const now = Date.now()
    const turn = { id: turnId, items: [], itemsView: 'full', status: 'completed', error: null, startedAt: seconds(now), completedAt: seconds(now), durationMs: 0 }
    const items = [
      { type: 'userMessage', id: `${turnId}-input`, clientId: null, content: input },
      { type: 'agentMessage', id: `${turnId}#t0`, text: stripInstructions(String(result?.response ?? '')), phase: null, memoryCitation: null, delivery: null, questions: null },
    ]
    notify('turn/started', { threadId: thread.id, turn: { ...turn, status: 'inProgress', completedAt: null, durationMs: null } })
    for (const item of items) {
      notify('item/started', { item, threadId: thread.id, turnId, startedAtMs: now })
      notify('item/completed', { item, threadId: thread.id, turnId, completedAtMs: now })
    }
    notify('turn/completed', { threadId: thread.id, turn: { ...turn, itemsView: 'notLoaded' } })
    return { ...turn, items }
  }

  /**
   * A turn the bridge runs for itself (a ZCode slash command such as `/rewind`): nothing of its stream reaches the
   * client. Resolves with the finished turn and ZCode's reply text.
   */
  function controlTurn(thread, content, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
      const control = { turnId: null, response: '' }
      const timer = setTimeout(() => {
        if (thread.control !== control) return
        thread.control = null
        emitStatus(thread)
        reject(new RpcError(-32000, 'ZCode did not finish in time.'))
      }, timeoutMs)
      control.done = (turn) => { clearTimeout(timer); resolve({ turn, response: control.response }) }
      thread.control = control
      request('session/send', { sessionId: thread.id, content, inputId: `cd-control-${randomUUID()}` }).catch((error) => {
        clearTimeout(timer)
        if (thread.control === control) thread.control = null
        reject(error)
      })
    })
  }

  /**
   * thread/revert: ZCode's own conversation rewind (`/rewind conversation <messageId>`, the branch cut the ZCode app
   * uses to edit or retry a prompt) to before the turn's first prompt. History only, as in Codex: files stay, unless
   * codeDesktop.restoreFiles asks for ZCode's `/rewind both`: it first puts back the files it checkpointed before each
   * edit since that prompt (rewind-message.ts rewindToMessage, RewindScope.Both), then cuts the conversation. When ZCode
   * can't restore the files safely (a strategy other than ActiveChain) it leaves both alone and says why; that reply
   * is the error.
   */
  async function revertThread(params) {
    const threadId = requireThreadId(params)
    if (typeof params.beforeTurnId !== 'string' || !params.beforeTurnId) throw new RpcError(INVALID_PARAMS, 'beforeTurnId is required')
    const thread = await loadThread(threadId)
    if (thread.projector.turn || thread.control) throw new RpcError(-32600, 'Wait for the current turn to finish before rewinding.', { codexErrorInfo: 'activeTurnNotSteerable' })
    thread.history = null
    const built = await historyOf(thread)
    if (!built.turns.some((turn) => turn.id === params.beforeTurnId)) throw new RpcError(INVALID_PARAMS, 'That turn is not in this session.')
    const anchor = built.anchors[params.beforeTurnId]
    if (!anchor) throw new RpcError(-32000, 'ZCode can’t rewind to this turn: it doesn’t start with a prompt.')
    const scope = params.codeDesktop?.restoreFiles === true ? 'both' : 'conversation'
    const outcome = await controlTurn(thread, `/rewind ${scope} ${anchor}`)
    thread.history = null
    const after = await historyOf(thread)
    if (after.turns.some((turn) => turn.id === params.beforeTurnId)) throw new RpcError(-32000, outcome.response.trim() || 'ZCode could not rewind this session.')
    forgetInstructions(thread)
    thread.updatedAt = Date.now()
    store.update(threadId, { updatedAt: thread.updatedAt })
    notify('thread/reverted', { threadId })
    return { thread: threadObject(thread), turnsBackwardsCursor: null, itemsBackwardsCursor: null }
  }

  function onTurnCompleted(thread, turn) {
    thread.history = null
    if (thread.control) {
      const control = thread.control
      thread.control = null
      control.done(turn)
      emitStatus(thread)
      return
    }
    thread.updatedAt = Date.now()
    store.update(thread.id, { updatedAt: thread.updatedAt })
    failPending(thread, 'The turn ended.')
    if (thread.review && thread.review.turnId === turn.id) {
      const review = thread.review
      thread.review = null
      setPermission(thread, review.previousPermission)
      void syncSessionSettings(thread).catch(() => {})
    }
    emitStatus(thread)
    quotaWatch.turnCompleted(turn)
    const queued = turn.status !== 'interrupted' && thread.queue.length
    // MCP servers changed during the turn: reopen before the next one (a queued prompt waits for it).
    if (thread.mcpStale) setTimeout(() => { void reopenForMcp(thread).catch((error) => log(`zcode-bridge: MCP refresh: ${error.message}`)).finally(() => { if (queued) void drainQueue(thread) }) }, 0)
    else if (queued) setTimeout(() => { void drainQueue(thread) }, 0)
  }

  async function drainQueue(thread) {
    if (thread.projector.turn || !thread.queue.length) return
    const next = thread.queue.shift()
    store.update(thread.id, { queue: thread.queue })
    notify('thread/queue/changed', { threadId: thread.id })
    try { await submitTurn(thread.loaded ? thread : await loadThread(thread.id), next.input) } catch (error) { log(`zcode-bridge: queued turn failed: ${error.message}`) }
  }

  /**
   * Mid-turn guidance. ZCode reports it as turn.steerDrained once the guidance enters the running turn (or as a new
   * turn.started when it falls back to the queue); the transcript's userMessage for it comes from there, with the
   * input recorded here (takeSteer), so mentions and skills look as typed.
   */
  function rememberSteerClientId(thread, messageId, steered) {
    if (!messageId || typeof steered?.clientUserMessageId !== 'string' || !steered.clientUserMessageId) return
    thread.steerClientIds.set(messageId, steered.clientUserMessageId.slice(0, 200))
    while (thread.steerClientIds.size > 64) thread.steerClientIds.delete(thread.steerClientIds.keys().next().value)
  }

  async function steer(thread, input, clientUserMessageId = null) {
    const { content, attachments } = inputToZCode(input)
    // ZCode's guidance (V4 sendText) carries text only: images and attached files would be dropped while the transcript
    // shows them sent. Not steerable, so the client queues the message and it goes, attachments and all, as the next turn.
    if (attachments.length) throw new RpcError(-32600, 'Images and attached files can’t join a running ZCode turn; the message is sent when the turn ends.', { codexErrorInfo: 'activeTurnNotSteerable' })
    const commandId = randomUUID()
    // ZCode's queue item for a V4 command is `queue_<commandId>` (command-inbox.ts queueItemIdForCommand).
    const entry = { commandId, pendingInputId: `queue_${commandId}`, text: content, input, at: Date.now(), clientUserMessageId: typeof clientUserMessageId === 'string' && clientUserMessageId ? clientUserMessageId : null }
    thread.steers.push(entry)
    if (thread.steers.length > 32) thread.steers.splice(0, thread.steers.length - 32)
    const drop = () => { const index = thread.steers.indexOf(entry); if (index >= 0) thread.steers.splice(index, 1) }
    let result
    try {
      result = await request('v4/command', { commandId, clientId: 'code-desktop', sessionId: thread.id, type: 'sendText', payload: { text: content, requestedDelivery: 'guide', toolDisallowlist: toolDenylist(thread) }, issuedAt: Date.now() })
    } catch (error) { drop(); throw error }
    if (result?.status && result.status !== 'accepted') { drop(); throw new RpcError(-32600, result.message ?? 'ZCode did not accept the steer.', { codexErrorInfo: 'activeTurnNotSteerable' }) }
  }

  /** The Codex input of a steer ZCode delivered: by its queue item or command id, else by its text. */
  function takeSteer(thread, { pendingInputId, commandId, text } = {}) {
    let index = thread.steers.findIndex((entry) => (pendingInputId && entry.pendingInputId === pendingInputId) || (commandId && entry.commandId === commandId))
    if (index < 0 && typeof text === 'string') index = thread.steers.findIndex((entry) => entry.text === text)
    if (index < 0) return null
    return thread.steers.splice(index, 1)[0]
  }

  async function v4Command(threadId, type, payload = {}) {
    const result = await request('v4/command', { commandId: randomUUID(), clientId: 'code-desktop', sessionId: threadId, type, payload, issuedAt: Date.now() })
    if (result?.status && result.status !== 'accepted') throw new RpcError(-32000, result.message ?? `ZCode refused ${type}.`)
    return result
  }

  /**
   * Stop one sub-agent (turn/interrupt on its child thread; the Stop button in Background tasks). A background
   * sub-agent (Agent run_in_background) is a task of the parent session: only it is cancelled
   * (session/cancelBackgroundTask), the parent's turn and any other sub-agent keep going. A foreground sub-agent runs
   * inside the parent's turn, so stopping it stops that turn (session/stop), as Esc does in ZCode.
   */
  async function stopSubagent(childId) {
    const meta = children.get(childId)
    const parent = threads.get(meta?.parentId)
    if (!parent) return
    const live = parent.projector.children.get(childId)
    if (live && live.status !== 'running') return
    // With the parent's turn over, a sub-agent still running can only be a background one (task id = its agentId).
    const task = parent.projector.subagentTaskFor(childId) ?? (!parent.projector.turn && (live?.agentId ?? meta.agentId) ? { taskId: live?.agentId ?? meta.agentId } : null)
    if (!task) {
      if (parent.projector.turn) await request('session/stop', { sessionId: parent.id }).catch(() => {})
      return
    }
    let result
    try {
      result = await request('session/cancelBackgroundTask', { sessionId: parent.id, taskId: String(task.taskId) })
    } catch (error) {
      throw new RpcError(-32000, `ZCode couldn’t stop this sub-agent: ${error?.message ?? error}`)
    }
    if (result?.cancelled === true || result?.reason === 'background_task_not_running') return
    throw new RpcError(-32000, subagentStopFailure(result?.reason))
  }

  function subagentStopFailure(reason) {
    if (reason === 'background_task_not_found') return 'ZCode no longer knows this sub-agent’s task, so it couldn’t be stopped. It may have already finished.'
    if (reason === 'background_task_cancel_not_supported') return 'ZCode can’t stop this sub-agent on its own. Stop the whole turn instead.'
    return `ZCode didn’t stop this sub-agent${reason ? ` (${reason})` : ''}.`
  }

  // ---------------------------------------------------------------- approvals & questions

  function threadForRequest(params) {
    const direct = threads.get(params.sessionId)
    if (direct) return { thread: direct, childId: null }
    const parentId = params.origin?.parentSessionId ?? children.get(params.sessionId)?.parentId
    const parent = parentId ? threads.get(parentId) : null
    return { thread: parent, childId: params.sessionId }
  }

  function clientRequest(thread, method, params, flag, interaction = null) {
    const { id, promise } = transport.request(method, params)
    thread.pending.set(id, { flag, method })
    if (interaction) { interaction.clientId = id; interaction.threadId = thread.id }
    emitStatus(thread)
    return promise.finally(() => { thread.pending.delete(id); emitStatus(thread) })
  }

  function failPending(thread, reason) {
    for (const id of [...thread.pending.keys()]) {
      if (transport.abandon(id, reason)) notify('serverRequest/resolved', { threadId: thread.id, requestId: id })
      thread.pending.delete(id)
    }
    emitStatus(thread)
  }

  /**
   * ZCode settled an interaction without this bridge's answer (answered elsewhere, auto-resolved, the turn moved on):
   * its card closes (serverRequest/resolved), so no stale card asks for an answer nobody reads.
   */
  function interactionResolved(requestId) {
    const entry = interactions.open(requestId)
    if (!entry || entry.clientId === null) return
    if (transport.abandon(entry.clientId, 'ZCode resolved this request.')) notify('serverRequest/resolved', { threadId: entry.threadId, requestId: entry.clientId })
  }

  // A re-sent request (same requestId, new wire id) joins the card already open: one card, one answer for every id.
  const onPermission = (params) => interactions.run(params, (interaction) => askPermission(params, interaction))
  const onUserInput = (params) => interactions.run(params, (interaction) => askUserInput(params, interaction))

  async function askPermission(params, interaction) {
    const { thread } = threadForRequest(params)
    if (!thread) return permissionAnswer(params, 'decline').response
    // OpenClaude Desktop's own tools need no card here: the app asks the user itself where it matters (as for Codex).
    if (appTools && typeof params.toolName === 'string' && params.toolName.startsWith(`mcp__${appTools.name}__`)) return permissionAnswer(params, 'accept').response
    if (WORKFLOW_RUN_TOOLS.includes(params.toolName)) return askWorkflowRun(params, thread, interaction)
    // The client never answers approvals (approvalPolicy "never", e.g. the workflow runner): refuse now, with a reason.
    if (thread.permission.approvals === false) return noApprovalAnswer(params)
    const { key, grantable: grantableCall } = sessionGrant(params.toolName, params.input, { cwd: thread.cwd })
    if (key && thread.grants.has(key) && !isReadOnlyMode(thread.permission.mode)) return permissionAnswer(params, 'accept').response
    // A read-only mode (Plan, Chat, review) can't hold a standing grant: it would take effect once the mode is left.
    const askedIn = thread.permission
    const grantable = grantableCall && !isReadOnlyMode(askedIn.mode)
    const call = thread.projector.callFor(params.toolCallId)
    const item = call ? thread.projector.itemFor(call, 'inProgress') : null
    const { method, params: requestParams } = approvalRequest(params, { threadId: thread.id, turnId: thread.projector.turnId ?? call?.turnId ?? null, cwd: thread.cwd, item, grantable })
    let decision = 'cancel'
    try {
      const result = await clientRequest(thread, method, requestParams, 'waitingOnApproval', interaction)
      decision = result?.decision ?? 'decline'
    } catch {
      decision = 'decline'
    }
    // Answered after a mode change (a card left open across a switch): the grant would belong to the old mode.
    const answer = permissionAnswer(params, decision, { grantable: grantable && samePermission(thread.permission, askedIn) })
    if (answer.grant && key) thread.grants.add(key)
    if (answer.cancel) setTimeout(() => { void request('session/stop', { sessionId: thread.id }).catch(() => {}) }, 0)
    return answer.response
  }

  /**
   * A workflow run (CreateWorkflow / AmendWorkflow / ResumeWorkflowRun). ZCode asks before every run in every mode (its
   * permission is alwaysAsk) and then runs the workflow's agents without asking, so the user consents once, to the
   * whole run, on one card naming the script (no project grant; CreateWorkflow and AmendWorkflow offer ZCode's 'Allow for
   * this session', outside read-only modes, until the mode changes). Declined, ZCode
   * starts nothing (the projection settles the run as never started). Bypass permissions asks nothing.
   */
  async function askWorkflowRun(params, thread, interaction) {
    // Dynamic workflows off (or OpenClaude Desktop's engine chosen): the tools are withheld; a stray request starts nothing.
    if (thread.dynamicWorkflows !== true) return { ...permissionAnswer(params, 'decline').response, reason: 'Dynamic workflows are off for this session. Nothing was started.' }
    // A read-only mode (Plan, Chat, review) never runs one: ZCode runs a workflow's agents unconfined once the run is
    // allowed, so one click would let them change the project while the mode still says read-only.
    if (isReadOnlyMode(thread.permission.mode)) return { ...permissionAnswer(params, 'decline').response, reason: `This session is in a read-only mode (${thread.permission.mode}), and a workflow's agents can change files and run commands. Nothing was started. Ask the user to switch to another mode to run a workflow.` }
    if (thread.permission.mode === 'bypass') return permissionAnswer(params, 'accept').response
    // The client never answers approvals (approvalPolicy "never", e.g. the workflow runner): refuse now, with a reason.
    if (thread.permission.approvals === false) return noApprovalAnswer(params)
    // 'Allow for this session' (CreateWorkflow, AmendWorkflow: ZCode's own session option) covers later calls of that
    // tool. It is the bridge's grant, not ZCode's: ZCode's session rule ignores the mode, so a run would then start in
    // Plan without asking; this one is checked after the read-only refusal above and dropped on any mode change.
    const grantKey = WORKFLOW_SESSION_GRANT_TOOLS.includes(params.toolName) ? `workflow\u0000${params.toolName}` : null
    if (grantKey && thread.grants.has(grantKey)) return permissionAnswer(params, 'accept').response
    const askedIn = thread.permission
    const call = thread.projector.callFor(params.toolCallId)
    const { method, params: card } = approvalRequest({ ...params, options: [] }, { threadId: thread.id, turnId: thread.projector.turnId ?? call?.turnId ?? null, cwd: thread.cwd, item: null, grantable: !!grantKey })
    const command = workflowApprovalSummary(params.toolName, params.input)
    let decision = 'decline'
    try {
      const result = await clientRequest(thread, method, { ...card, reason: WORKFLOW_RUN_APPROVAL_REASON, command, commandActions: [{ type: 'unknown', command }], sessionGrantable: !!grantKey }, 'waitingOnApproval', interaction)
      decision = result?.decision ?? 'decline'
    } catch {
      decision = 'decline'
    }
    const accepted = decision === 'accept' || decision === 'acceptForSession'
    // Answered after a mode change (a card left open across a switch): no grant, it would belong to the old mode.
    const answer = permissionAnswer(params, accepted ? decision : decision === 'cancel' ? 'cancel' : 'decline', { grantable: !!grantKey && samePermission(thread.permission, askedIn) && !isReadOnlyMode(thread.permission.mode) })
    if (answer.grant) thread.grants.add(grantKey)
    if (answer.cancel) setTimeout(() => { void request('session/stop', { sessionId: thread.id }).catch(() => {}) }, 0)
    return answer.response
  }

  async function askUserInput(params, interaction) {
    const { thread } = threadForRequest(params)
    if (!thread) return { action: 'cancel' }
    const plan = isPlanApproval(params)
    const requestParams = questionRequest(params, { threadId: thread.id, turnId: thread.projector.turnId })
    let result
    try {
      result = await clientRequest(thread, 'item/tool/requestUserInput', requestParams, 'waitingOnUserInput', interaction)
    } catch {
      return { action: 'cancel' }
    }
    const answer = questionAnswer(params, result)
    // The thread is in Plan whether the user picked it or GLM entered it (EnterPlanMode → modeChanged).
    if (plan && answer.approvedPlan && thread.permission.mode === 'plan') {
      // Bypass only as the plan card's explicit choice (the app validated it); a remembered Bypass becomes Auto.
      const target = answer.afterPlan ?? thread.permission.afterPlan
      const mode = answer.afterPlan === 'bypass' ? 'bypass' : target === 'ask' || target === 'acceptEdits' ? target : 'auto'
      setPermission(thread, { ...thread.permission, mode })
      store.update(thread.id, { permission: thread.permission })
      // Applied when ZCode reports plan mode off (modeChanged); a ZCode that doesn't report it gets it shortly after.
      clearTimeout(thread.leavingPlan)
      thread.leavingPlan = setTimeout(() => leavePlan(thread), 3000)
    }
    return answer.response
  }

  function readAccounts() {
    const builtin = located?.builtinConfig ? accounts.readJson(located.builtinConfig) : null
    const credentials = accounts.readCredentials(paths.credentials, env)
    return { builtin, credentials, signedIn: accounts.signedInAccounts(builtin, credentials), personal: accounts.readJson(paths.personalProviders) }
  }

  async function onRuntimeHeaders(params) {
    const { signedIn } = readAccounts()
    const account = signedIn[params.providerId]
    if (!account) return { headersApplied: false, errorMessage: 'Sign in to your Coding Plan in OpenClaude Desktop (Settings › Account) first.' }
    return { headersApplied: true, requestAuth: { apiKey: account.apiKey } }
  }

  /** Identity headers for an official Z.ai MCP service (a plugin's zcode_official server), from the browser sign-in. */
  function onOfficialMcpAuthHeaders(params) {
    const { credentials, signedIn } = readAccounts()
    const answer = accounts.officialMcpAuthHeaders({ origin: params.targetOrigin, credentials, signedIn, env })
    if (!answer.ok) log(`zcode-bridge: official MCP sign-in for ${params.pluginId ?? '?'}/${params.mcpKey ?? '?'}: ${answer.reason}`)
    return answer
  }

  async function pushAccountOverlay() {
    if (!agent || !mirror) return
    const { builtin, signedIn } = readAccounts()
    if (!builtin) return
    const overlay = accounts.accountOverlay(builtin, signedIn, accounts.builtinRevision(builtin, mirror.builtinPath))
    await agent.request('provider/updateAccountConfig', overlay, { timeoutMs: 30000 })
    modelCache = null
  }

  // ---------------------------------------------------------------- notifications from ZCode

  function onAgentNotification(method, params) {
    if (env.ZCODE_BRIDGE_DEBUG === '1') log(`zcode-bridge: <- ${method} ${JSON.stringify(params).slice(0, Number(env.ZCODE_BRIDGE_DEBUG_CHARS) || 600)}`)
    if (method === 'session/event') {
      if ((params.type === 'permission.resolved' || params.type === 'userInput.resolved') && params.payload?.requestId) interactionResolved(params.payload.requestId)
      const thread = threads.get(params.sessionId)
      if (!thread) return
      if (thread.control && params.type === 'turn.completed') thread.control.response = String(params.payload?.response ?? '')
      thread.projector.event(params.type, params.payload ?? {}, { turnId: params.turnId, timestamp: params.timestamp })
      if (params.type === 'session.titleUpdated' && params.payload?.title) {
        thread.title = params.payload.title
        thread.titleSource = params.payload.source ?? thread.titleSource
        store.update(thread.id, { title: thread.title })
      }
      if (params.type === 'session.updated' && Number.isFinite(params.payload?.contextWindow)) thread.contextWindow = params.payload.contextWindow
      // A goal set, changed or cleared (zcodeTaskServiceAdapter: target with action/source), or the projection's target.
      if (params.type === 'session.updated' && params.payload && typeof params.payload === 'object') {
        if (Object.hasOwn(params.payload, 'target') && (Object.hasOwn(params.payload, 'action') || Object.hasOwn(params.payload, 'source'))) adoptGoal(thread, params.payload.action === 'cleared' ? null : params.payload.target ?? null)
        else if (params.payload.projection && typeof params.payload.projection === 'object' && Object.hasOwn(params.payload.projection, 'target')) adoptGoal(thread, params.payload.projection.target ?? null)
      }
      if (params.type === 'session.updated' && isModeChange(params.payload)) modeChanged(thread, params.payload)
    }
  }

  // ZCode's SessionModeChanged ({mode, planEnabled, previousMode, previousPlanEnabled, source}), as session.updated.
  const isModeChange = (payload) => typeof payload?.planEnabled === 'boolean' && typeof payload.previousPlanEnabled === 'boolean' && typeof payload.mode === 'string'

  /**
   * ZCode's execution state changed: from session/setMode (source 'command') or from GLM's own EnterPlanMode /
   * ExitPlanMode (source 'tool'). appliedMode follows ZCode's real state, so the next Mode pick is sent even when it
   * maps to the mode ZCode kept under its plan flag. GLM entering Plan by itself (EnterPlanMode needs no approval) puts
   * the thread in Plan, the mode it was in becoming the after-plan mode, and tells the app (codeDesktop/thread/mode,
   * as the ACP bridge does) so the picker shows Plan and the plan card's choice applies when GLM leaves it.
   */
  function modeChanged(thread, payload) {
    thread.appliedMode = payload.planEnabled ? 'plan' : payload.mode
    if (payload.source === 'tool' && payload.planEnabled && !payload.previousPlanEnabled && !isReadOnlyMode(thread.permission.mode)) {
      const previous = thread.permission.mode
      setPermission(thread, { ...thread.permission, mode: 'plan', afterPlan: ['auto', 'ask', 'acceptEdits', 'bypass'].includes(previous) ? previous : thread.permission.afterPlan ?? 'auto' })
      store.update(thread.id, { permission: thread.permission })
      notify('codeDesktop/thread/mode', { threadId: thread.id, permission: 'plan', afterPlan: thread.permission.afterPlan })
    }
    // An approved plan: ZCode has left plan mode (ExitPlanMode), now the mode the plan card chose applies.
    if (!payload.planEnabled && thread.leavingPlan) leavePlan(thread)
  }

  /** Send the after-plan mode once ZCode's ExitPlanMode has run (earlier, it would find plan mode already off). */
  function leavePlan(thread) {
    if (!thread.leavingPlan) return
    clearTimeout(thread.leavingPlan)
    thread.leavingPlan = null
    void syncSessionSettings(thread).catch((error) => log(`zcode-bridge: after plan: ${error.message}`))
  }

  // ---------------------------------------------------------------- customization

  /** OpenClaude Desktop's tools server's instructions when this thread's sessions get that server ('' otherwise). */
  function appToolsInstructions(thread) {
    if (!appTools?.instructions || !thread) return ''
    if ((thread.tools?.disabledServers ?? []).includes(appTools.name)) return ''
    return appTools.instructions
  }

  /**
   * While ZCode's Browser Use is on (its default), what GLM is told about browsing: its skills say to open web pages
   * and localhost through a ZCode browser, which OpenClaude Desktop doesn't provide (its node_repl tool is withheld:
   * toolDenylist), so GLM is pointed at the preview tools, or at Bash when this session has none.
   */
  function browserNote(thread) {
    if (!thread || !officialPluginOn(BROWSER_USE_PLUGIN, true)) return ''
    const preview = appTools && !(thread.tools?.disabledServers ?? []).includes(appTools.name)
    return `${NO_BROWSER_NOTE} ${preview ? PREVIEW_INSTEAD : NO_PREVIEW_INSTEAD}`
  }

  function customizationFor(sessionId, model) {
    const thread = threads.get(sessionId)
    if (!thread) return null
    const custom = thread.customization ?? {}
    const systemPrompt = typeof custom.systemPrompt === 'string' && custom.systemPrompt.trim() ? fillVariables(custom.systemPrompt, thread, model) : null
    const sections = []
    // With the user's own system prompt nothing the system wrote goes with it: their project instructions (bare) and
    // a workflow agent's role only, no heading, tool guidance or browser note.
    if (typeof custom.instructions === 'string' && custom.instructions.trim()) sections.push(systemPrompt ? custom.instructions.trim() : `# Project instructions\n\n${custom.instructions.trim()}`)
    if (typeof thread.developerInstructions === 'string' && thread.developerInstructions.trim()) sections.push(thread.developerInstructions.trim())
    if (!systemPrompt) {
      // ZCode never shows the model an MCP server's initialize instructions, so OpenClaude Desktop's (the preview
      // auto-verify workflow) ride along with the system prompt the proxy already customizes.
      const tools = appToolsInstructions(thread)
      if (tools) sections.push(tools)
      const browser = browserNote(thread)
      if (browser) sections.push(browser)
    }
    const params = modelParamsFor(custom.modelParams, thread.model, model)
    if (!systemPrompt && !sections.length && !params) return null
    return { systemPrompt, appendSections: sections, maxTokens: params?.maxTokens ?? null, temperature: params?.temperature ?? null }
  }

  function modelParamsFor(modelParams, selection, wireModel) {
    if (!isRecord(modelParams)) return null
    const candidates = [modelKey(selection), selection?.modelId, wireModel].filter(Boolean)
    for (const candidate of candidates) {
      const hit = Object.entries(modelParams).find(([key]) => key === candidate || key.toLowerCase() === String(candidate).toLowerCase())
      if (hit && isRecord(hit[1])) {
        const maxTokens = Number(hit[1].maxTokens)
        const temperature = Number(hit[1].temperature)
        return { maxTokens: Number.isFinite(maxTokens) && maxTokens > 0 ? Math.floor(maxTokens) : null, temperature: Number.isFinite(temperature) ? temperature : null }
      }
    }
    return null
  }

  function fillVariables(text, thread, model) {
    return text.replaceAll('{{model}}', modelKey(thread?.model) ?? model ?? '').replaceAll('{{provider}}', thread?.model?.providerId ?? '').replaceAll('{{cwd}}', thread?.cwd ?? '')
  }

  /** Capture the prompt ZCode sends for a cwd/model without spending tokens: a dry-run session the proxy answers itself. */
  async function dryRunPrompt(cwd, model) {
    const result = await request('session/create', { workspace: workspaceOf(cwd), mode: 'plan', persistence: 'deferred', titleGenerationEnabled: false, ...(model ? { model } : {}) })
    const id = result?.session?.sessionId
    if (!id) return null
    dryRuns.add(id)
    try {
      await request('session/subscribe', { sessionId: id, deliveryKind: 'desktop-continuous', includeSnapshot: false }).catch(() => {})
      await request('session/send', { sessionId: id, content: 'OpenClaude Desktop prompt preview', inputId: `cd-preview-${randomUUID()}` })
      const deadline = Date.now() + 15000
      while (!proxy.seen.has(id) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100))
      await new Promise((resolve) => setTimeout(resolve, 300))
      return proxy.seen.get(id) ?? null
    } finally {
      await request('session/stop', { sessionId: id }).catch(() => {})
      await request('session/close', { sessionId: id }).catch(() => {})
      await deleteSessionRows(paths.sessionDb, id).catch(() => {})
      setTimeout(() => dryRuns.delete(id), 5000)
    }
  }

  async function systemPromptPreview(params) {
    const cwd = typeof params.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : home
    const thread = typeof params.threadId === 'string' ? threads.get(params.threadId) : null
    let record = thread ? proxy?.seen.get(thread.id) : null
    const exact = !!record
    if (!record && proxy) record = await dryRunPrompt(cwd, selectionFor(params.model) ?? thread?.model ?? undefined).catch((error) => { log(`zcode-bridge: preview: ${error.message}`); return null })
    record ??= proxy?.lastDefault ?? null
    const custom = isRecord(params.codeDesktop?.customization) ? params.codeDesktop.customization : thread?.customization ?? {}
    const fake = { ...(thread ?? { cwd, model: selectionFor(params.model) }), customization: custom, developerInstructions: thread?.developerInstructions ?? null }
    const defaultText = record?.defaultSystem ?? ''
    const sections = []
    if (typeof custom.instructions === 'string' && custom.instructions.trim()) sections.push(`# Project instructions\n\n${custom.instructions.trim()}`)
    if (fake.developerInstructions) sections.push(fake.developerInstructions)
    const base = typeof custom.systemPrompt === 'string' && custom.systemPrompt.trim() ? fillVariables(custom.systemPrompt, fake, record?.model) : defaultText
    const text = [base, ...sections].filter((part) => part && part.trim()).join('\n\n')
    return {
      text, defaultText, defaultTemplate: defaultText, custom: !!(custom.systemPrompt && String(custom.systemPrompt).trim()),
      sections: [{ name: custom.systemPrompt ? 'code-desktop:system-prompt' : 'zcode:system-prompt', chars: base.length }, ...sections.map((section, index) => ({ name: index === 0 && custom.instructions ? 'code-desktop:instructions' : 'code-desktop:developer-instructions', chars: section.length }))],
      tools: record?.tools ?? [], variables: { provider: fake.model?.providerId ?? null, model: modelKey(fake.model) ?? record?.model ?? null, cwd }, exact, cwd, threadId: thread?.id ?? null,
    }
  }

  // ---------------------------------------------------------------- models

  async function settingsCatalog(force = false) {
    if (!force && modelCache && Date.now() - modelCache.at < MODEL_CACHE_MS) return modelCache.settings
    const result = await request('session/create', { workspace: workspaceOf(home), mode: 'plan', persistence: 'deferred', titleGenerationEnabled: false })
    const id = result?.session?.sessionId
    if (id) await request('session/close', { sessionId: id }).catch(() => {})
    modelCache = { at: Date.now(), settings: result?.settings ?? {} }
    return modelCache.settings
  }

  /** The reasoning level ZCode requires for a model when the client sent none (the model's default). */
  function defaultEffort(selection) {
    if (!selection) return null
    const info = modelCache?.settings?.model?.available?.find((entry) => entry.ref?.providerId === selection.providerId && entry.ref?.modelId === selection.modelId)
    const current = modelCache?.settings?.model?.current
    if (current && current.providerId === selection.providerId && current.modelId === selection.modelId && current.options?.reasoningLevel) return current.options.reasoningLevel
    return info?.reasoning?.defaultLevel ?? info?.reasoning?.levels?.[0]?.value ?? null
  }

  function selectionFor(model) {
    if (typeof model !== 'string' || !model) return null
    const slash = model.indexOf('/')
    if (slash > 0) return { providerId: model.slice(0, slash), modelId: model.slice(slash + 1) }
    const available = modelCache?.settings?.model?.available ?? []
    const hit = available.find((entry) => entry.ref?.modelId === model || entry.ref?.modelId?.toLowerCase() === model.toLowerCase())
    return hit ? { providerId: hit.ref.providerId, modelId: hit.ref.modelId } : null
  }

  async function modelList() {
    const settings = await settingsCatalog()
    const available = settings?.model?.available ?? []
    const current = settings?.model?.current
    const labels = new Map()
    for (const entry of available) labels.set(entry.label, (labels.get(entry.label) ?? 0) + 1)
    const data = available.map((entry) => {
      const key = modelKey(entry.ref)
      const levels = entry.reasoning?.levels ?? []
      const isDefault = current ? entry.ref.providerId === current.providerId && entry.ref.modelId === current.modelId : false
      return {
        id: key, model: key, upgrade: null, upgradeInfo: null, availabilityNux: null,
        displayName: labels.get(entry.label) > 1 ? `${entry.label} (${entry.providerLabel})` : entry.label, description: entry.providerLabel ?? '', modelSpecialty: null, hidden: false,
        supportedReasoningEfforts: levels.map((level) => ({ reasoningEffort: level.value, description: level.label ?? level.value })),
        defaultReasoningEffort: (isDefault ? current?.options?.reasoningLevel : null) ?? entry.reasoning?.defaultLevel ?? levels[0]?.value ?? null,
        inputModalities: entry.properties?.inputFormat?.supportsImage ? ['text', 'image'] : ['text'], supportsPersonality: false, multiAgentVersion: null,
        additionalSpeedTiers: [], serviceTiers: [], defaultServiceTier: null, isDefault,
        provider: entry.ref.providerId, contextWindow: entry.contextWindow ?? null, maxOutputTokens: entry.maxOutputTokens ?? null,
      }
    })
    if (data.length && !data.some((entry) => entry.isDefault)) { data[0].isDefault = true }
    return { data, nextCursor: null }
  }

  // ---------------------------------------------------------------- accounts

  async function accountRead() {
    const { signedIn, credentials, personal } = readAccounts()
    const user = accounts.loginUser(credentials)
    const keyed = accounts.apiKeyProviders(personal).filter((provider) => provider.keyed && provider.enabled)
    const plan = Object.values(signedIn)[0]
    const account = plan
      ? { type: 'chatgpt', email: user?.email ?? user?.name ?? plan.identity, planType: plan.family === 'bigmodel' ? 'BigModel Coding Plan' : 'Z.ai Coding Plan' }
      : keyed.length ? { type: 'apiKey' } : null
    return {
      // ZCode answers only with a Coding Plan sign-in or a saved API-key provider: signed out, it needs a sign-in.
      account, requiresOpenaiAuth: !account,
      zcode: {
        codingPlan: Object.values(signedIn).map((entry) => ({ providerId: entry.providerId, family: entry.family, name: entry.name })),
        user, apiKeyProviders: keyed.map(({ apiKey, ...rest }) => rest),
        links: { apiKeys: 'https://z.ai/manage-apikey/apikey-list', usageUrl: 'https://z.ai/manage-apikey/subscription' },
      },
    }
  }

  // The earned resets of the browser sign-in's Coding Plan (ZCode's coding-plan/reset/status), cached a minute: the
  // turn-end refreshes read the quota often, the resets rarely change.
  let resetCache = null
  async function resetCredits(windows, { force = false } = {}) {
    const { credentials, signedIn } = readAccounts()
    const headers = accounts.codingPlanResetHeaders({ credentials, signedIn })
    const origin = accounts.zcodeApiOrigin(env)
    if (!headers || !origin) return null
    if (!force && resetCache && Date.now() - resetCache.at < 60_000) return accounts.resetCreditsFromStatus(resetCache.data, windows)
    try {
      const data = await accounts.codingPlanResetRequest(origin, 'status', headers)
      resetCache = { at: Date.now(), data }
      return accounts.resetCreditsFromStatus(data, windows)
    } catch (error) {
      log(`zcode-bridge: reset status: ${error.message}`)
      return null
    }
  }

  /** account/rateLimitResetCredit/consume: redeem one earned reset (POST coding-plan/reset/use), then the new quota. */
  async function consumeResetCredit(params) {
    const { credentials, signedIn } = readAccounts()
    const headers = accounts.codingPlanResetHeaders({ credentials, signedIn })
    const origin = accounts.zcodeApiOrigin(env)
    if (!headers || !origin) throw new RpcError(-32600, 'Sign in to your Coding Plan in the browser (Settings › Account) to use an earned reset.')
    let type = accounts.resetTypeOf(params?.creditId)
    if (!type) {
      // No credit picked: the first available one, the 5-hour reset before the weekly one (Codex: the backend picks).
      const current = await rateLimits({ details: true, force: true })
      type = accounts.resetTypeOf(current.rateLimitResetCredits?.credits?.[0]?.id)
      if (!type) return { outcome: 'noCredit' }
    }
    try {
      await accounts.codingPlanResetRequest(origin, 'use', headers, { method: 'POST', body: { idempotency_key: accounts.resetIdempotencyKey(params?.idempotencyKey), reset_type: type } })
    } catch (error) {
      log(`zcode-bridge: reset use: ${error.message}`)
      throw new RpcError(-32000, `Couldn’t use the reset: ${error.message}`)
    }
    resetCache = null
    // The windows changed: the client's usage ring and notice get the new quota.
    void quotaWatch.refresh().catch(() => {})
    return { outcome: 'reset' }
  }

  async function rateLimits({ details = true, force = false } = {}) {
    const { signedIn, personal } = readAccounts()
    const plan = Object.values(signedIn)[0]
    const keyed = accounts.apiKeyProviders(personal).find((provider) => provider.keyed && provider.enabled && accounts.quotaUrl(provider.baseUrl) && /coding-plan|zai-api|bigmodel-api/.test(`${provider.templateId}`))
      ?? accounts.apiKeyProviders(personal).find((provider) => provider.keyed && provider.enabled && accounts.quotaUrl(provider.baseUrl))
    // CODE_DESKTOP_ZCODE_QUOTA_ORIGIN: where the quota endpoint lives instead (tests: a loopback stand-in, never api.z.ai).
    const quotaAt = (baseUrl) => accounts.quotaUrl(env.CODE_DESKTOP_ZCODE_QUOTA_ORIGIN?.trim() || baseUrl)
    const source = plan ? { url: quotaAt(plan.baseUrl), apiKey: plan.apiKey } : keyed ? { url: quotaAt(keyed.baseUrl), apiKey: keyed.apiKey } : null
    const empty = { rateLimits: { limitId: null, limitName: null, primary: null, secondary: null, credits: null, individualLimit: null, spendControlReached: null, planType: null, rateLimitReachedType: null }, rateLimitsByLimitId: null, rateLimitResetCredits: null, accountId: null, rateLimitUpsell: null }
    if (!source?.url) return empty
    try {
      const parsed = accounts.rateLimitsFromQuota(await accounts.fetchQuota(source.url, source.apiKey))
      if (!parsed) return empty
      // Earned resets: with the details (the Usage page) or when a window is used up (the usage-limit notice offers one).
      const reached = parsed.rateLimits.rateLimitReachedType === 'rate_limit_reached'
      const credits = details || reached ? await resetCredits({ fiveHour: parsed.rateLimits.primary, week: parsed.rateLimits.secondary }, { force }) : null
      return { ...empty, ...parsed, rateLimitResetCredits: credits ? (details ? credits : { availableCount: credits.availableCount, credits: null }) : null }
    } catch (error) {
      log(`zcode-bridge: quota: ${error.message}`)
      return empty
    }
  }

  async function loginStart(params) {
    if (params.type === 'apiKey') {
      const apiKey = String(params.apiKey ?? '').trim()
      if (!apiKey) throw new RpcError(INVALID_PARAMS, 'An API key is required.')
      const { builtin } = readAccounts()
      const builtinSource = builtin ?? (located?.builtinConfig ? accounts.readJson(located.builtinConfig) : null)
      const options = isRecord(params.codeDesktop) ? params.codeDesktop : {}
      const previous = accounts.readPersonalText(paths.personalProviders)
      const { providerId } = accounts.saveApiKeyProvider({ personalFile: paths.personalProviders, builtin: builtinSource, apiKey, templateId: options.template ?? 'zai-api', baseUrl: options.baseUrl ?? null, models: options.models ?? null })
      mirror?.syncPersonal()
      await waitForProvider(providerId)
      const rejected = await testApiKey(providerId)
      if (rejected) {
        // The key doesn't work: put back what was there (an earlier working key stays signed in). ZCode notices a
        // provider file change by polling its content (about once a second); putting the old content back before a
        // poll saw the rejected one would look like no change at all, and its sessions would keep the rejected key.
        await new Promise((resolve) => setTimeout(resolve, PROVIDER_POLL_SETTLE_MS))
        accounts.restorePersonalText(paths.personalProviders, previous)
        mirror?.syncPersonal()
        modelCache = null
        // …and the next prompt only goes out once ZCode has the earlier key back.
        await new Promise((resolve) => setTimeout(resolve, PROVIDER_POLL_SETTLE_MS))
        throw new RpcError(-32000, `This API key was rejected: ${rejected}`, { codexErrorInfo: 'unauthorized' })
      }
      notify('account/updated', { authMode: 'apikey' })
      return { type: 'apiKey' }
    }
    if (params.type === 'chatgpt') {
      await ensureAgent()
      const family = params.codeDesktop?.provider === 'bigmodel' ? 'bigmodel' : 'zai'
      const loginId = randomUUID()
      const { spawn } = await import('node:child_process')
      const loginEnv = { ...env }
      for (const key of Object.keys(loginEnv)) if (key.startsWith('CODE_DESKTOP_')) delete loginEnv[key]
      if (located?.builtinConfig) { loginEnv.ZCODE_BUILTIN_PROVIDER_CONFIG_FILE = located.builtinConfig; loginEnv.ZCODE_PERSONAL_PROVIDER_CONFIG_FILE = paths.personalProviders }
      // Test hook: a local stand-in for the ZCode platform (OAuth endpoints), never set in normal use.
      if (env.CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN) loginEnv.ZCODE_BASE_URL = env.CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN
      const child = spawn(located.command, [...located.prefix, 'login', family, '--no-browser', '--json'], { env: loginEnv, cwd: home, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      let errors = ''
      const authUrl = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new RpcError(-32000, 'ZCode did not start the sign-in in time.')), 30000)
        // `zcode login --no-browser` prints the authorize URL (on stderr with --json); the rest is its result.
        const look = () => {
          const match = /(https:\/\/\S+)/.exec(`${output}\n${errors}`)
          if (match) { clearTimeout(timer); resolve(match[1].replace(/["',}]+$/, '')) }
        }
        child.stdout.on('data', (chunk) => { output += chunk; look() })
        child.stderr.on('data', (chunk) => { errors += chunk; look() })
        child.on('exit', (code) => { clearTimeout(timer); if (!/(https:\/\/\S+)/.test(`${output}\n${errors}`)) reject(new RpcError(-32000, (errors.trim().split('\n').pop() || `ZCode sign-in exited (${code}).`).replace(/^Error:\s*/, ''))) })
      })
      logins.set(loginId, { child })
      child.on('exit', (code) => {
        logins.delete(loginId)
        const success = code === 0
        notify('account/login/completed', { loginId, success, error: success ? null : (errors.trim().split('\n').pop() || 'Sign-in failed.').replace(/^Error:\s*/, '') })
        if (success) {
          mirror?.syncPersonal()
          void pushAccountOverlay().catch(() => {})
          notify('account/updated', { authMode: 'chatgpt' })
        }
      })
      return { type: 'chatgpt', loginId, authUrl }
    }
    throw new RpcError(INVALID_PARAMS, `ZCode signs in with an API key or the Coding Plan browser sign-in (type "apiKey" or "chatgpt"), not ${params.type}.`)
  }

  /**
   * ZCode's own key check (provider/testModelConnectivity: a one-token request, as its provider settings send it).
   * Resolves with the provider's message when the key is refused (401/403, invalid key); any other failure (offline,
   * rate limited, slow) keeps the key: it says nothing about the key itself.
   */
  async function testApiKey(providerId) {
    const settings = await settingsCatalog(true).catch(() => null)
    const model = (settings?.model?.available ?? []).find((entry) => entry.ref?.providerId === providerId)
    if (!model) return null
    try {
      await request('provider/testModelConnectivity', { workspace: workspaceOf(home), selection: { providerId, modelId: model.ref.modelId } }, { timeoutMs: 45000 })
      return null
    } catch (error) {
      const message = String(error?.message ?? error)
      if (turnError({ code: error?.data?.status ?? null, message }).codexErrorInfo === 'unauthorized') return message
      log(`zcode-bridge: API key check inconclusive: ${message}`)
      return null
    }
  }

  /** ZCode re-reads provider configs on its own (about once a second): wait until a provider's models show up. */
  async function waitForProvider(providerId, present = true) {
    const deadline = Date.now() + 8000
    while (Date.now() < deadline) {
      const settings = await settingsCatalog(true).catch(() => null)
      const has = (settings?.model?.available ?? []).some((entry) => entry.ref?.providerId === providerId)
      if (has === present) return true
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
    return false
  }

  async function logout() {
    accounts.removeApiKeyProviders(paths.personalProviders)
    mirror?.syncPersonal()
    if (located?.command) await new Promise((resolve) => execFile(located.command, [...located.prefix, 'logout'], { env: { ...env }, timeout: 15000 }, () => resolve()))
    await pushAccountOverlay().catch(() => {})
    modelCache = null
    notify('account/updated', { authMode: null })
    return {}
  }

  // ---------------------------------------------------------------- plugins

  async function findPlugin(name) {
    const list = await request('plugins/list', { workspace: workspaceOf(home) })
    const plugin = (list?.plugins ?? []).find((entry) => entry.id === name || entry.name === name)
    if (!plugin) throw new RpcError(INVALID_PARAMS, `Unknown plugin: ${name}`)
    return plugin
  }

  /** A ZCode plugin spec: a local plugin folder (with .zcode-plugin/plugin.json) or `name@marketplace`. */
  function parsePluginSpec(spec) {
    const text = String(spec ?? '').trim()
    if (!text) throw new RpcError(INVALID_PARAMS, 'Name a plugin: a local folder or name@marketplace.')
    if (path.isAbsolute(text) || text.startsWith('~/')) {
      const dir = text.startsWith('~/') ? path.join(home, text.slice(2)) : text
      const manifest = accounts.readJson(path.join(dir, '.zcode-plugin', 'plugin.json')) ?? accounts.readJson(path.join(dir, '.claude-plugin', 'plugin.json'))
      return { kind: 'local', dir, manifest }
    }
    const at = text.lastIndexOf('@')
    return at > 0 ? { kind: 'marketplace', name: text.slice(0, at), marketplace: text.slice(at + 1) } : { kind: 'marketplace', name: text, marketplace: 'zcode-plugins-official' }
  }

  async function inspectPlugin(params) {
    const spec = parsePluginSpec(params.spec)
    if (spec.kind === 'local') {
      if (!spec.manifest?.name) return { status: 'refused', reason: 'That folder has no .zcode-plugin/plugin.json.', name: null, version: null, description: null, bundle: null }
      return { status: 'accepted', reason: null, name: spec.manifest.name, version: spec.manifest.version ?? null, description: spec.manifest.description ?? null, bundle: spec.manifest.name }
    }
    const overview = await request('plugins/overview', { workspace: workspaceOf(home) })
    const hit = (overview?.availablePlugins ?? []).find((plugin) => plugin.name === spec.name && plugin.marketplace === spec.marketplace)
    if (!hit) return { status: 'refused', reason: `${spec.name} isn’t in the ${spec.marketplace} marketplace.`, name: spec.name, version: null, description: null, bundle: null }
    return { status: 'accepted', reason: null, name: hit.name, version: hit.version ?? null, description: hit.description ?? null, bundle: hit.name }
  }

  async function installPlugin(params) {
    const requestId = typeof params.requestId === 'string' && params.requestId ? params.requestId : randomUUID()
    const spec = parsePluginSpec(params.spec)
    notify('codeDesktop/plugin/installProgress', { requestId, phase: 'resolve', attempt: null })
    if (spec.kind === 'local') {
      if (!spec.manifest?.name) return { requestId, changed: false, application: 'failed', stage: 'resolve', error: { code: 'invalid', diagnostic: 'That folder has no .zcode-plugin/plugin.json.' } }
      // ZCode's own local-plugin mechanism: `plugins.dirs` in ~/.zcode/cli/config.json (enabled for that config).
      const config = catalog.readConfig(paths.cliConfig)
      config.plugins = config.plugins && typeof config.plugins === 'object' ? config.plugins : {}
      config.plugins.enabled = config.plugins.enabled !== false
      config.plugins.dirs = [...new Set([...(config.plugins.dirs ?? []), spec.dir])]
      catalog.writeConfig(paths.cliConfig, config)
    } else {
      const progress = (method, update) => { if (method === 'plugins/operationProgress' && update?.operationId === requestId) notify('codeDesktop/plugin/installProgress', { requestId, phase: update.phase ?? update.stage ?? 'install', attempt: null }) }
      agent?.on('notification', progress)
      try {
        await request('plugins/install', { workspace: workspaceOf(home), pluginName: spec.name, marketplace: spec.marketplace, operationId: requestId }, { timeoutMs: 900000 })
      } catch (error) {
        return { requestId, changed: false, application: 'failed', stage: 'install', error: { code: 'install', diagnostic: error.message } }
      } finally {
        agent?.off('notification', progress)
      }
    }
    notify('codeDesktop/plugin/installProgress', { requestId, phase: 'done', attempt: null })
    notify('codeDesktop/plugin/changed', { reason: 'install' })
    notify('skills/changed', {})
    return { requestId, changed: true, application: 'applied', bundle: spec.manifest?.name ?? spec.name }
  }

  async function removePlugin(params) {
    const plugin = await findPlugin(params.pluginName)
    if (plugin.source === 'official') throw new RpcError(-32000, `${plugin.name} is built into ZCode: turn it off instead.`)
    const config = catalog.readConfig(paths.cliConfig)
    const dirs = config.plugins?.dirs ?? []
    const local = dirs.find((dir) => plugin.rootPath && path.resolve(dir) === path.resolve(plugin.rootPath))
    if (local) {
      config.plugins.dirs = dirs.filter((dir) => dir !== local)
      if (config.plugins.enabledPlugins) delete config.plugins.enabledPlugins[plugin.id]
      catalog.writeConfig(paths.cliConfig, config)
    } else {
      await request('plugins/uninstall', { workspace: workspaceOf(home), pluginId: plugin.id })
    }
    notify('codeDesktop/plugin/changed', { reason: 'remove' })
    notify('skills/changed', {})
    return { changed: true, application: 'applied', bundle: plugin.name }
  }

  // ---------------------------------------------------------------- side questions

  async function sideQuestion(params) {
    const threadId = requireThreadId(params)
    const question = String(params.question ?? '').trim()
    if (!question) throw new RpcError(INVALID_PARAMS, 'question is required')
    const requestId = typeof params.requestId === 'string' && params.requestId ? params.requestId : randomUUID()
    const thread = threads.get(threadId) ?? await loadThread(threadId)
    const { turns } = await historyOf(thread)
    const lines = []
    for (const turn of turns) for (const item of turn.items) {
      if (item.type === 'userMessage') lines.push(`User: ${item.content.filter((part) => part.type === 'text').map((part) => part.text).join(' ')}`)
      else if (item.type === 'agentMessage') lines.push(`Assistant: ${item.text}`)
      else if (item.type === 'commandExecution') lines.push(`[ran ${item.command}]`)
      else if (item.type === 'fileChange') lines.push(`[changed ${item.changes.map((change) => change.path).join(', ')}]`)
    }
    let transcript = lines.join('\n')
    const truncated = transcript.length > 120000
    if (truncated) transcript = transcript.slice(-120000)
    const history = (Array.isArray(params.history) ? params.history : []).slice(-20)
    const messages = [
      { role: 'system', content: 'You answer a quick side question about an ongoing coding session. You cannot run tools. The session transcript follows; answer briefly and do not continue the session’s task.' },
      { role: 'user', content: `<session-transcript>\n${transcript}\n</session-transcript>` },
      { role: 'assistant', content: 'Understood. What is your question?' },
      ...history.flatMap((entry) => [{ role: 'user', content: String(entry.question ?? '') }, { role: 'assistant', content: String(entry.answer ?? '') }]),
      { role: 'user', content: question },
    ]
    const settings = await settingsCatalog().catch(() => null)
    const model = thread.model ?? (settings?.model?.current ? { providerId: settings.model.current.providerId, modelId: settings.model.current.modelId } : null)
    if (!model) throw new RpcError(-32000, 'No ZCode model is available.')
    const info = settings?.model?.available?.find((entry) => entry.ref?.providerId === model.providerId && entry.ref?.modelId === model.modelId)
    const level = thread.effort ?? info?.reasoning?.defaultLevel ?? info?.reasoning?.levels?.[0]?.value
    sideQuestions.set(requestId, { cancelled: false })
    try {
      const result = await request('workspace/generateText', { workspace: workspaceOf(thread.cwd), selection: { ...model, ...(level ? { options: { reasoningLevel: level } } : {}) }, messages, querySource: 'code_desktop_side_question', operationId: requestId, maxOutputTokens: 4096 }, { timeoutMs: 300000 })
      if (sideQuestions.get(requestId)?.cancelled) return { requestId, text: '', finish: 'cancelled', model: modelKey(model), contextMessages: messages.length, truncated }
      const text = String(result?.text ?? '')
      if (text) notify('codeDesktop/sideQuestion/delta', { threadId, requestId, text })
      return { requestId, text, finish: result?.finishReason ?? null, model: modelKey(result?.selection ?? model), contextMessages: messages.length, truncated }
    } catch (error) {
      if (sideQuestions.get(requestId)?.cancelled) return { requestId, text: '', finish: 'cancelled', model: modelKey(model), contextMessages: messages.length, truncated }
      throw new RpcError(-32000, error?.message || 'The side question failed.')
    } finally {
      sideQuestions.delete(requestId)
    }
  }

  // ---------------------------------------------------------------- list

  async function threadList(params) {
    // ZCode lists the 50 most recently updated sessions unless asked for more, and has no cursor: ask for every
    // session (up to a high cap) and page, sort and search here.
    const offset = Number.parseInt(params.cursor ?? '0', 10) || 0
    const pageSize = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 50
    const listed = await request('session/list', { includeArchived: true, limit: Math.max(SESSION_LIST_CAP, offset + pageSize + 1) })
    const archivedOnly = params.archived === true
    const wantChildren = (params.sourceKinds ?? []).some((kind) => String(kind).startsWith('subAgent'))
    const cwds = params.cwd == null ? null : new Set([].concat(params.cwd))
    const search = typeof params.searchTerm === 'string' ? params.searchTerm.trim().toLowerCase() : ''
    // Workflow agents' sessions (a runner's folder, live or not yet swept) are never the user's.
    const workflowAgents = new Set(runnerRole ? [] : runnerFolders().flatMap((folder) => folder.ids))
    void sweepRunnerFolders().catch(() => {})
    let rows = []
    for (const session of listed?.sessions ?? []) {
      if (store.isDeleted(session.sessionId) || workflowAgents.has(session.sessionId)) continue
      const child = /subagent|workflow/.test(session.sessionKind ?? '')
      if (child !== wantChildren) continue
      if (session.sessionKind === 'selection_side_chat') continue
      const meta = store.get(session.sessionId) ?? {}
      // Archived here, or (when OpenClaude Desktop never set it) archived in the ZCode app.
      if ((meta.archived ?? !!session.archivedAt) !== archivedOnly) continue
      const cwd = session.workspace?.workspacePath ?? meta.cwd ?? home
      if (cwds && !cwds.has(cwd)) continue
      const thread = threads.get(session.sessionId) ?? { id: session.sessionId, cwd, permission: meta.permission ?? { mode: 'auto' }, model: meta.model ?? session.model ?? null, effort: meta.effort ?? null, createdAt: session.createdAt, updatedAt: session.updatedAt }
      const row = threadObject(thread, { ...session, title: session.title, titleSource: session.titleSource })
      if (child) {
        row.parentThreadId = session.parentSessionId ?? null
        row.source = { subAgent: { thread_spawn: { parent_thread_id: session.parentSessionId ?? null, depth: 1, agent_path: null, agent_nickname: session.title || null, agent_role: null } } }
      }
      if (!row.preview && !row.name) continue
      if (search && ![row.name, row.preview, row.cwd].some((value) => String(value ?? '').toLowerCase().includes(search))) continue
      rows.push(row)
    }
    if (wantChildren) {
      const listedIds = new Set(rows.map((row) => row.id))
      for (const [id, entry] of Object.entries(store.all())) {
        if (!entry.child || listedIds.has(id) || store.isDeleted(entry.child.parentId)) continue
        const row = childThreadObject(id)
        if (cwds && !cwds.has(row.cwd)) continue
        if (search && ![row.name, row.preview].some((value) => String(value ?? '').toLowerCase().includes(search))) continue
        rows.push(row)
      }
    }
    const byCreated = params.sortKey === 'created_at' || params.sortKey === 'createdAt'
    rows.sort((a, b) => (byCreated ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt))
    if (params.sortDirection === 'asc') rows.reverse()
    const page = rows.slice(offset, offset + pageSize)
    return { data: page, nextCursor: offset + pageSize < rows.length ? String(offset + pageSize) : null, backwardsCursor: null }
  }

  // ---------------------------------------------------------------- tools list

  const BUILTIN_TOOLS = ['Agent', 'AskUserQuestion', 'Bash', 'Edit', 'EnterPlanMode', 'ExitPlanMode', 'Read', 'ReadSessionContext', 'SendMessage', 'Skill', 'TaskOutput', 'TaskStop', 'TodoRead', 'TodoWrite', 'WebFetch', 'WebSearch', 'Write']

  async function toolsList() {
    const builtin = new Map(BUILTIN_TOOLS.map((name) => [name, '']))
    for (const record of proxy?.seen.values() ?? []) for (const tool of record.toolDefs ?? []) if (!MCP_TOOL.test(tool.name) && !UNAVAILABLE_TOOL_SET.has(tool.name)) builtin.set(tool.name, String(tool.description ?? '').split('\n')[0].slice(0, 200))
    const config = catalog.readConfig(paths.cliConfig)
    const serverNames = new Set(Object.keys(config?.mcp?.servers ?? {}))
    for (const record of proxy?.seen.values() ?? []) for (const tool of record.toolDefs ?? []) { const match = MCP_TOOL.exec(tool.name); if (match) serverNames.add(match[1]) }
    await refreshMcpTools(config).catch(() => {})
    const servers = [...serverNames].sort().map((name) => ({ name, tools: knownServerTools(name).map((tool) => ({ name: `mcp__${name}__${tool.name}`, tool: tool.name, description: String(tool.description ?? '').split('\n')[0].slice(0, 200) })).sort((a, b) => a.name.localeCompare(b.name)) }))
    return { tools: [...builtin.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, description]) => ({ name, kind: 'builtin', description })), servers }
  }

  async function refreshMcpTools(config, force = false) {
    const servers = config?.mcp?.servers ?? {}
    await Promise.all(Object.entries(servers).map(async ([name, server]) => {
      if (!server || server.enabled === false) return
      const cached = mcpToolCache.get(name)
      const signature = JSON.stringify(server)
      if (!force && cached && cached.signature === signature && Date.now() - cached.at < 300000) return
      try {
        const tools = await catalog.listMcpTools(server, { cwd: home })
        mcpToolCache.set(name, { signature, at: Date.now(), tools: tools.map((tool) => ({ name: tool.name, description: tool.description ?? '', inputSchema: tool.inputSchema })) })
      } catch (error) {
        mcpToolCache.set(name, { signature, at: Date.now(), tools: cached?.tools ?? [], error: error.message })
      }
    }))
  }

  // ---------------------------------------------------------------- dispatch

  async function handle(method, params) {
    switch (method) {
      case 'initialize': {
        await ensureAgent()
        const { signedIn, personal } = readAccounts()
        const codingPlan = Object.keys(signedIn).length > 0 || accounts.apiKeyProviders(personal).some((provider) => provider.keyed && /zai-api|bigmodel-api/.test(String(provider.templateId)))
        return {
          userAgent: `code-desktop-zcode-bridge/${BRIDGE_VERSION} (zcode ${version}; ${process.platform})`, codexHome: paths.root,
          platformFamily: process.platform === 'win32' ? 'windows' : 'unix', platformOs: process.platform === 'darwin' ? 'macos' : process.platform,
          engine: ENGINE, engineVersion: version,
          capabilities: { ...BASE_CAPABILITIES, customization: !!proxy, modelParams: !!proxy, systemPromptPreview: !!proxy, contextUsage: !!proxy, perTokenBilling: !codingPlan },
          configPath: paths.cliConfig,
        }
      }
      case 'model/list': return modelList()
      case 'account/read': return accountRead()
      case 'account/rateLimits/read': return quotaWatch.observe(await rateLimits({ details: params?.excludeResetCreditDetails !== true }))
      case 'account/rateLimitResetCredit/consume': return consumeResetCredit(params)
      case 'account/login/start': return loginStart(params)
      case 'account/login/cancel': {
        const login = logins.get(params.loginId)
        if (!login) return { status: 'notFound' }
        login.child.kill()
        return { status: 'canceled' }
      }
      case 'account/logout': return logout()
      case 'account/usage/read': return accountUsage(await request('usage/stats', { range: 'all', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
      // OpenClaude Desktop's tools changed (a Settings switch turned Dynamic workflows or the preview on or off): ZCode keeps
      // the MCP tool list it read when the session opened, so every loaded session reopens with the new list.
      case 'codeDesktop/appTools/changed': {
        if (appTools) void refreshMcpSessions().catch((error) => log(`zcode-bridge: tools refresh: ${error.message}`))
        return {}
      }
      case 'codeDesktop/stats/read': return codeStats(await request('usage/stats', { range: 'all', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }), await databaseActivity(paths.sessionDb))
      case 'codeDesktop/systemPrompt/preview': {
        if (!proxy) throw new RpcError(METHOD_NOT_FOUND, 'This ZCode install has no provider catalog the bridge can route, so the prompt can’t be previewed.')
        return systemPromptPreview(params)
      }
      case 'codeDesktop/contextUsage/read': {
        // The session rail Context card's categories (context-usage.js) from the last request the proxy saw for the thread.
        if (!proxy) throw new RpcError(METHOD_NOT_FOUND, 'This ZCode install has no provider catalog the bridge can route, so its requests can’t be measured.')
        const thread = typeof params?.threadId === 'string' ? threads.get(params.threadId) : null
        const instructions = thread ? appToolsInstructions(thread) : ''
        return contextUsageCounts(thread ? proxy.seen.get(thread.id) : null, instructions ? [{ name: appTools.name, text: instructions }] : [])
      }
      case 'codeDesktop/sideQuestion': return sideQuestion(params)
      case 'codeDesktop/sideQuestion/cancel': {
        const entry = sideQuestions.get(params.requestId)
        if (!entry) return { cancelled: false }
        entry.cancelled = true
        await request('workspace/cancelGenerateText', { operationId: params.requestId }).catch(() => {})
        return { cancelled: true }
      }
      case 'codeDesktop/tools/list': return toolsList()
      case 'configRequirements/read': return { requirements: null }
      case 'config/read': {
        const config = catalog.readConfig(paths.cliConfig)
        const thread = [...threads.values()].filter((entry) => !params.cwd || entry.cwd === params.cwd).sort((a, b) => b.updatedAt - a.updatedAt)[0]
        const policy = codexPolicy(thread?.permission.mode ?? 'auto', params.cwd ?? home)
        return { config: { sandbox_mode: policy.sandbox.type === 'readOnly' ? 'read-only' : policy.sandbox.type === 'dangerFullAccess' ? 'danger-full-access' : 'workspace-write', approval_policy: policy.approvalPolicy, mcp_servers: catalog.codexMcpServers(config) }, origins: {}, layers: null }
      }
      case 'config/batchWrite': {
        const changed = catalog.applyConfigEdits(paths.cliConfig, params.edits)
        for (const name of changed) mcpToolCache.delete(name)
        // Only mcp_servers.* is stored here: every edit changes the MCP servers sessions get.
        if (changed.length) await refreshMcpSessions()
        return { status: 'ok', version: String(Date.now()), filePath: paths.cliConfig, overriddenMetadata: null }
      }
      case 'config/value/write': return handle('config/batchWrite', { edits: [{ keyPath: params.keyPath, value: params.value, mergeStrategy: params.mergeStrategy }] })
      case 'config/mcpServer/reload': {
        await request('mcp/list', { workspace: workspaceOf(params.cwd ?? home), mode: 'connect' }, { timeoutMs: 60000 }).catch((error) => log(`zcode-bridge: mcp reload: ${error.message}`))
        await refreshMcpSessions()
        return {}
      }
      case 'mcpServerStatus/list': {
        const config = catalog.readConfig(paths.cliConfig)
        const thread = typeof params.threadId === 'string' ? threads.get(params.threadId) : null
        const listed = await request('mcp/list', { workspace: workspaceOf(thread?.cwd ?? home), mode: 'connect' }, { timeoutMs: 60000 }).catch(() => null)
        await refreshMcpTools(config).catch(() => {})
        const toolsByServer = {}
        for (const name of new Set([...Object.keys(config?.mcp?.servers ?? {}), ...Object.keys(listed?.statuses ?? {})])) toolsByServer[name] = knownServerTools(name)
        return { data: catalog.mcpStatusRows(config, listed?.statuses ?? {}, toolsByServer), nextCursor: null }
      }
      case 'mcpServer/oauth/login': {
        const name = String(params.name ?? '')
        const listed = await request('mcp/list', { workspace: workspaceOf(home), mode: 'connect' }, { timeoutMs: 60000 })
        const url = listed?.statuses?.[name]?.authorization?.authorizationUrl
        if (!url) throw new RpcError(-32000, listed?.statuses?.[name] ? `${name} doesn’t need a sign-in (or its server didn’t offer OAuth).` : `Unknown MCP server: ${name}`)
        void (async () => {
          for (let attempt = 0; attempt < 120; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 2500))
            const status = await request('mcp/list', { workspace: workspaceOf(home), mode: 'status' }).catch(() => null)
            const entry = status?.statuses?.[name]
            if (entry && !entry.authorization) { notify('mcpServer/oauthLogin/completed', { name, success: entry.status === 'connected', error: entry.error ?? null }); return }
          }
          notify('mcpServer/oauthLogin/completed', { name, success: false, error: 'Sign-in timed out.' })
        })()
        return { authorizationUrl: url }
      }
      case 'skills/list': {
        const cwds = Array.isArray(params.cwds) && params.cwds.length ? params.cwds : [home]
        const config = catalog.readConfig(paths.cliConfig)
        const data = []
        for (const cwd of cwds) {
          const [result, presentation] = await Promise.all([
            request('skills/referenceCatalog', { workspace: workspaceOf(cwd) }).catch((error) => ({ error })),
            // ZCode's `/` catalog for the workspace (what the ZCode app's composer offers).
            request('workspace/readPresentation', { workspace: workspaceOf(cwd) }).catch((error) => { log(`zcode-bridge: slash commands: ${error.message}`); return null }),
          ])
          const entry = result?.error ? { cwd, skills: [], errors: [{ path: cwd, message: result.error.message }] } : catalog.skillsListEntry(cwd, result, config)
          entry.skills.push(...catalog.commandRows(presentation?.slashCommands, { known: new Set(entry.skills.map((skill) => skill.name)), served: SERVED_COMMANDS, files: catalog.customCommandFiles(cwd, home), config }))
          data.push(entry)
        }
        return { data }
      }
      case 'skills/config/write': {
        if (typeof params.path !== 'string' || !params.path) throw new RpcError(INVALID_PARAMS, 'path is required')
        if (params.path.startsWith(COMMAND_PATH)) {
          // A custom command file (ZCode's command[<path>].enable): found by its name in the session folder's roots or
          // the home ones; ZCode's built-in commands have no file and stay on.
          const name = params.path.slice(COMMAND_PATH.length).toLowerCase()
          const cwds = [...new Set([...[...threads.values()].map((thread) => thread.cwd), home].filter(Boolean))]
          const file = cwds.map((cwd) => catalog.customCommandFiles(cwd, home).find((entry) => entry.name === name)).find(Boolean)
          if (!file) throw new RpcError(INVALID_PARAMS, 'Only custom ZCode commands (a .md file in a commands folder) can be turned off.')
          catalog.setCommandEnabled(paths.cliConfig, file.path, params.enabled !== false)
          notify('skills/changed', {})
          return { effectiveEnabled: params.enabled !== false }
        }
        catalog.setSkillEnabled(paths.cliConfig, params.path, params.enabled !== false)
        notify('skills/changed', {})
        return { effectiveEnabled: params.enabled !== false }
      }
      case 'plugin/installed': return catalog.pluginsInstalledResponse(await request('plugins/list', { workspace: workspaceOf(home) }))
      case 'plugin/read': {
        const list = await request('plugins/list', { workspace: workspaceOf(home) })
        const plugin = (list?.plugins ?? []).find((entry) => entry.id === params.pluginName || entry.name === params.pluginName)
        if (!plugin) throw new RpcError(INVALID_PARAMS, `Unknown plugin: ${params.pluginName}`)
        return catalog.pluginReadResponse(plugin)
      }
      case 'codeDesktop/plugin/registries': {
        const overview = await request('plugins/overview', { workspace: workspaceOf(home) })
        return { registries: (overview?.marketplaces ?? []).map((market) => ({ name: market.name, url: market.source?.url ?? market.source?.path ?? null, official: market.isOfficial === true, plugins: market.pluginCount ?? null })) }
      }
      case 'codeDesktop/plugin/inspect': return inspectPlugin(params)
      case 'codeDesktop/plugin/install': return installPlugin(params)
      case 'codeDesktop/plugin/cancelInstall': {
        const result = await request('plugins/cancelOperation', { operationId: String(params.requestId ?? '') }).catch(() => null)
        return { cancelled: result?.cancelled === true }
      }
      case 'codeDesktop/plugin/setEnabled': {
        const plugin = await findPlugin(params.pluginName)
        await request('plugins/setEnabled', { workspace: workspaceOf(home), pluginId: plugin.id, enabled: params.enabled !== false })
        notify('codeDesktop/plugin/changed', { reason: 'setEnabled' })
        notify('skills/changed', {})
        return { changed: true, application: 'applied', bundle: plugin.name }
      }
      case 'codeDesktop/plugin/remove': return removePlugin(params)
      // An installed marketplace plugin brought to its marketplace's newest version (plugins/update, the ZCode app's Update).
      case 'codeDesktop/plugin/update': {
        const plugin = await findPlugin(params.pluginName)
        if (plugin.source === 'official') throw new RpcError(-32000, `${plugin.name} is built into ZCode and updates with it.`)
        const local = (catalog.readConfig(paths.cliConfig).plugins?.dirs ?? []).some((dir) => plugin.rootPath && path.resolve(dir) === path.resolve(plugin.rootPath))
        if (local) throw new RpcError(-32000, `${plugin.name} is loaded from a folder on this Mac: update the folder itself.`)
        await request('plugins/update', { workspace: workspaceOf(home), pluginId: plugin.id, ...(plugin.marketplace ? { marketplace: plugin.marketplace } : {}) }, { timeoutMs: 900000 })
        notify('codeDesktop/plugin/changed', { reason: 'update' })
        notify('skills/changed', {})
        return { changed: true, application: 'applied', bundle: plugin.name }
      }
      case 'hooks/list': return catalog.hooksList(catalog.readConfig(paths.cliConfig), { cwds: params?.cwds, sourcePath: paths.cliConfig, fallbackCwd: os.homedir(), root: paths.root })

      case 'thread/start': return startThread(params)
      case 'thread/resume': {
        const threadId = requireThreadId(params)
        const thread = await loadThread(threadId, params)
        // Opened again: a release waiting for background work (thread/unsubscribe) is off.
        thread.releaseWhenIdle = false
        applyRequestParams(thread, params)
        const response = sessionResponse(thread)
        notify('thread/status/changed', { threadId, status: threadStatus(thread) })
        if (params.excludeTurns !== true || params.initialTurnsPage) {
          const { turns } = await historyOf(thread)
          if (params.excludeTurns !== true) response.thread.turns = turns
          if (params.initialTurnsPage) response.initialTurnsPage = turnsPage(turns, params.initialTurnsPage)
          response.turnsBackwardsCursor = null
          response.itemsBackwardsCursor = null
        }
        setTimeout(() => {
          const usage = thread.projector.tokenUsage()
          if (usage) notify('thread/tokenUsage/updated', { threadId, turnId: thread.projector.turnId, tokenUsage: usage })
          if (thread.projector.plan?.length) notify('turn/plan/updated', { threadId, turnId: thread.projector.turnId, explanation: null, plan: thread.projector.plan })
        }, 0)
        return response
      }
      case 'codeDesktop/agents/list': {
        const cwd = typeof params?.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : null
        return { agents: catalog.zcodeAgents({ root: paths.root, home, cwd, config: catalog.readConfig(paths.cliConfig) }) }
      }
      case 'codeDesktop/coreSettings/read':
        return { file: coreSettingsFile, settings: coreSettingsView() }
      case 'codeDesktop/coreSettings/write': {
        const def = coreSettingDefs().find((entry) => entry.key === params?.key)
        if (!def) throw new RpcError(INVALID_PARAMS, 'Unknown setting.')
        if (params.value !== null && typeof params.value !== 'boolean') throw new RpcError(INVALID_PARAMS, `Invalid value for ${def.key}.`)
        const next = { ...readCoreSettings() }
        if (params.value === null) delete next[def.key]
        else next[def.key] = params.value
        fs.mkdirSync(path.dirname(coreSettingsFile), { recursive: true })
        fs.writeFileSync(`${coreSettingsFile}.tmp`, JSON.stringify(next, null, 2))
        fs.renameSync(`${coreSettingsFile}.tmp`, coreSettingsFile)
        return { file: coreSettingsFile, settings: coreSettingsView() }
      }
      case 'thread/goal/get': {
        const thread = await loadThread(requireThreadId(params))
        return { goal: thread.goal ?? null }
      }
      case 'thread/goal/set':
      case 'thread/goal/clear': {
        // /goal and the goal strip: an objective runs as ZCode's `/goal <objective>` (a turn of its own, as typed);
        // Pause / Resume / Clear are session/goal pause|resume|clear, quietly (no transcript turn).
        const thread = await loadThread(requireThreadId(params))
        const objective = method === 'thread/goal/set' && typeof params.objective === 'string' ? params.objective.trim() : ''
        if (objective) {
          await submitTurn(thread, [{ type: 'text', text: `/goal ${objective}`, text_elements: [] }])
          return { goal: thread.goal ?? null }
        }
        const action = method === 'thread/goal/clear' ? 'clear' : params.status === 'paused' ? 'pause' : params.status === 'active' ? 'resume' : null
        if (!action) throw new RpcError(INVALID_PARAMS, 'Give an objective or a status (paused or active).')
        const result = await request('session/goal', { sessionId: thread.id, inputId: `cd-${randomUUID()}`, action }, { timeoutMs: 120000 })
        adoptGoal(thread, result?.snapshot?.projection ? result.snapshot.projection.target ?? null : action === 'clear' ? null : undefined)
        return method === 'thread/goal/clear' ? {} : { goal: thread.goal ?? null }
      }
      case 'thread/read': {
        const threadId = requireThreadId(params)
        if (isChild(threadId)) return { thread: { ...childThreadObject(threadId), turns: params.includeTurns === true ? await childTurns(threadId) : [] } }
        if (store.isDeleted(threadId)) throw notFound(threadId)
        let thread = threads.get(threadId)
        const info = await sessionInfo(threadId)
        if (!thread && !info) throw notFound(threadId)
        if (!thread) {
          const meta = store.get(threadId) ?? {}
          thread = { id: threadId, cwd: info.workspace?.workspacePath ?? meta.cwd ?? home, permission: meta.permission ?? { mode: 'auto' }, model: meta.model ?? info.model ?? null, effort: meta.effort ?? null, createdAt: info.createdAt, updatedAt: info.updatedAt }
        }
        const object = threadObject(thread, info ? { ...info } : {})
        if (params.includeTurns === true) {
          const live = threads.get(threadId)
          object.turns = (await historyOf(live ?? await loadThread(threadId))).turns
        }
        return { thread: object }
      }
      case 'thread/turns/list': {
        const threadId = requireThreadId(params)
        const turns = isChild(threadId) ? await childTurns(threadId) : (await historyOf(await loadThread(threadId))).turns
        return turnsPage(turns, params)
      }
      case 'thread/items/list': {
        const threadId = requireThreadId(params)
        const turns = isChild(threadId) ? await childTurns(threadId) : (await historyOf(await loadThread(threadId))).turns
        let items = turns.filter((turn) => !params.turnId || turn.id === params.turnId).flatMap((turn) => turn.items.map((item) => ({ turnId: turn.id, item })))
        if (params.sortDirection === 'desc') items = items.reverse()
        const offset = Number.parseInt(params.cursor ?? '0', 10) || 0
        const limit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 200
        return { data: items.slice(offset, offset + limit), nextCursor: offset + limit < items.length ? String(offset + limit) : null, backwardsCursor: null }
      }
      case 'thread/list': return threadList(params)
      case 'thread/name/set': {
        const threadId = requireThreadId(params)
        const name = String(params.name ?? '').trim()
        const thread = await loadThread(threadId)
        if (name) await v4Command(threadId, 'renameSession', { title: name })
        thread.title = name || thread.title
        thread.titleSource = name ? 'custom' : thread.titleSource
        store.update(threadId, { name: name || undefined, title: name || thread.title })
        notify('thread/name/updated', { threadId, ...(name ? { threadName: name } : {}) })
        return {}
      }
      case 'thread/archive': {
        const threadId = requireThreadId(params)
        store.update(threadId, { archived: true })
        const thread = threads.get(threadId)
        if (thread && !thread.projector.turn && !thread.pending.size) await unload(thread)
        notify('thread/archived', { threadId })
        return {}
      }
      case 'thread/unarchive': {
        const threadId = requireThreadId(params)
        if (store.isDeleted(threadId)) throw notFound(threadId)
        // false, not unset: a session archived in the ZCode app stays out of the archive once unarchived here.
        store.update(threadId, { archived: false })
        notify('thread/unarchived', { threadId })
        const read = await handle('thread/read', { threadId, includeTurns: false }).catch(() => null)
        return read ?? {}
      }
      case 'thread/delete': {
        const threadId = requireThreadId(params)
        const thread = threads.get(threadId)
        if (thread) {
          failPending(thread, 'The session was deleted.')
          if (thread.projector.turn) await request('session/stop', { sessionId: threadId }).catch(() => {})
          await v4Command(threadId, 'deleteSession').catch(() => request('session/close', { sessionId: threadId }).catch(() => {}))
          threads.delete(threadId)
        }
        await deleteSessionRows(paths.sessionDb, threadId).catch((error) => log(`zcode-bridge: delete history: ${error.message}`))
        store.markDeleted(threadId)
        notify('thread/deleted', { threadId })
        return {}
      }
      case 'thread/unsubscribe':
      case 'thread/close': {
        const threadId = requireThreadId(params)
        const thread = threads.get(threadId)
        if (!thread?.loaded) return method === 'thread/close' ? {} : { status: 'notLoaded' }
        if (thread.projector.turn || thread.pending.size || thread.queue.length) return method === 'thread/close' ? {} : { status: 'unsubscribed' }
        // Background commands, background sub-agents and workflow runs are tasks of the session: closing it would end
        // them (and ZCode would never wake GLM with their results). It is released once they settle.
        if (thread.projector.hasBackgroundWork()) {
          thread.releaseWhenIdle = true
          whenSettled(thread)
          return method === 'thread/close' ? {} : { status: 'unsubscribed' }
        }
        await unload(thread)
        return method === 'thread/close' ? {} : { status: 'unsubscribed' }
      }
      case 'thread/fork': {
        const threadId = requireThreadId(params)
        const source = await loadThread(threadId)
        const { turns } = await historyOf(source)
        const index = params.lastTurnId ? turns.findIndex((turn) => turn.id === params.lastTurnId) : turns.length - 1
        if (index < 0) throw new RpcError(INVALID_PARAMS, 'There is nothing to fork yet.')
        const forked = await request('session/fork', { sessionId: threadId, target: { kind: 'turn', turnIndex: index } })
        const id = forked?.forkedSessionId
        if (!id) throw new RpcError(-32000, 'ZCode did not fork the session.')
        // ZCode opens the fork with its parent's runtime, MCP servers included: OpenClaude Desktop's code_desktop server would
        // still name the parent. Reopened (it is persisted), the fork gets one named for itself.
        if (appTools) await request('session/close', { sessionId: id }).catch(() => {})
        store.update(id, { forkedFromId: threadId, cwd: source.cwd, permission: source.permission, model: source.model ?? undefined, effort: source.effort ?? undefined, tools: source.tools ?? undefined, customization: source.customization ?? undefined, developerInstructions: source.developerInstructions ?? undefined })
        const thread = await loadThread(id)
        applyRequestParams(thread, params)
        notify('thread/started', { thread: threadObject(thread) })
        const response = sessionResponse(thread)
        if (params.excludeTurns !== true) response.thread.turns = (await historyOf(thread)).turns
        return response
      }
      case 'turn/start': {
        const threadId = requireThreadId(params)
        if (!Array.isArray(params.input) || !params.input.length) throw new RpcError(INVALID_PARAMS, 'input must not be empty')
        // capabilities.structuredOutput is false: ZCode has no output-schema turn (the word "outputSchema" also tells
        // the workflow runner not to retry).
        if (params.outputSchema !== undefined && params.outputSchema !== null) throw new RpcError(METHOD_NOT_FOUND, 'ZCode has no structured-output turns (outputSchema is not supported by the ZCode core).')
        let thread = await loadThread(threadId, params)
        thread.releaseWhenIdle = false
        sessionWorkflowGate(thread, params)
        if (thread.mcpStale) { await reopenForMcp(thread); thread = await loadThread(threadId) }
        applyRequestParams(thread, params)
        return { turn: await submitTurn(thread, params.input) }
      }
      case 'turn/steer': {
        const threadId = requireThreadId(params)
        const thread = threads.get(threadId)
        if (!thread?.projector.turn || (params.expectedTurnId && params.expectedTurnId !== thread.projector.turnId)) throw new RpcError(-32600, 'No active turn to steer.', { codexErrorInfo: 'activeTurnNotSteerable' })
        await steer(thread, params.input, params.clientUserMessageId)
        return { turnId: thread.projector.turnId }
      }
      case 'turn/interrupt': {
        const threadId = requireThreadId(params)
        if (children.has(threadId)) {
          await stopSubagent(threadId)
          return {}
        }
        const thread = threads.get(threadId)
        if (!thread) return {}
        failPending(thread, 'The turn was interrupted.')
        await request('session/stop', { sessionId: threadId }).catch(() => {})
        return {}
      }
      case 'thread/revert': return revertThread(params)
      case 'thread/compact/start': {
        const threadId = requireThreadId(params)
        const thread = await loadThread(threadId)
        if (thread.projector.turn) throw new RpcError(-32600, 'Wait for the current turn to finish before compacting.', { codexErrorInfo: 'activeTurnNotSteerable' })
        // codeDesktop.instructions: /compact's summary instructions (ZCode's session/compact `instructions`).
        const instructions = typeof params?.codeDesktop?.instructions === 'string' ? params.codeDesktop.instructions.trim().slice(0, 4000) : ''
        setTimeout(() => { void compact(thread, instructions) }, 0)
        return {}
      }
      case 'review/start': {
        const threadId = requireThreadId(params)
        const thread = await loadThread(threadId)
        if (thread.projector.turn) throw new RpcError(-32600, 'Wait for the current turn to finish before starting a review.')
        const { label, prompt } = reviewPrompt(params.target ?? { type: 'uncommittedChanges' })
        thread.review = { label, previousPermission: thread.permission }
        setPermission(thread, { ...thread.permission, mode: 'review' })
        try {
          const turn = await sendTurn(thread, [{ type: 'text', text: prompt, text_elements: [] }])
          return { turn, reviewThreadId: threadId }
        } catch (error) {
          setPermission(thread, thread.review.previousPermission)
          thread.review = null
          throw error
        }
      }
      case 'thread/queue/add': {
        const threadId = requireThreadId(params)
        const thread = await loadThread(threadId)
        inputToZCode(params.input)
        const entry = { id: `queued-${randomUUID()}`, input: params.input, clientUserMessageId: params.clientUserMessageId ?? null }
        thread.queue.push(entry)
        store.update(threadId, { queue: thread.queue })
        notify('thread/queue/changed', { threadId })
        if (!thread.projector.turn) setTimeout(() => { void drainQueue(thread) }, 0)
        return { queuedSubmission: entry }
      }
      case 'thread/queue/list': {
        const thread = threads.get(requireThreadId(params))
        return { data: thread?.queue ?? store.get(params.threadId)?.queue ?? [], nextCursor: null }
      }
      case 'thread/queue/delete': {
        const thread = threads.get(requireThreadId(params))
        const index = thread?.queue.findIndex((entry) => entry.id === params.queuedSubmissionId) ?? -1
        if (index < 0) throw new RpcError(INVALID_PARAMS, 'That queued message already started.')
        thread.queue.splice(index, 1)
        store.update(thread.id, { queue: thread.queue })
        notify('thread/queue/changed', { threadId: thread.id })
        return {}
      }
      case 'thread/queue/update': {
        const thread = threads.get(requireThreadId(params))
        const entry = thread?.queue.find((candidate) => candidate.id === params.queuedSubmissionId)
        if (!entry) throw new RpcError(INVALID_PARAMS, 'That queued message already started.')
        inputToZCode(params.input)
        entry.input = params.input
        entry.id = `queued-${randomUUID()}`
        store.update(thread.id, { queue: thread.queue })
        notify('thread/queue/changed', { threadId: thread.id })
        return { queuedSubmission: entry }
      }
      case 'thread/queue/reorder': {
        const thread = threads.get(requireThreadId(params))
        const ids = Array.isArray(params.queuedSubmissionIds) ? params.queuedSubmissionIds : []
        if (!thread || ids.length !== thread.queue.length || !ids.every((id) => thread.queue.some((entry) => entry.id === id))) throw new RpcError(INVALID_PARAMS, 'List every queued message exactly once.')
        thread.queue = ids.map((id) => thread.queue.find((entry) => entry.id === id))
        store.update(thread.id, { queue: thread.queue })
        notify('thread/queue/changed', { threadId: thread.id })
        return {}
      }
      case 'thread/queue/start': {
        const thread = threads.get(requireThreadId(params))
        if (!thread?.queue.length) throw new RpcError(-32600, 'There is nothing queued.')
        const index = params.queuedSubmissionId ? thread.queue.findIndex((entry) => entry.id === params.queuedSubmissionId) : 0
        if (index < 0) throw new RpcError(-32600, 'That queued message already started.')
        const [entry] = thread.queue.splice(index, 1)
        store.update(thread.id, { queue: thread.queue })
        notify('thread/queue/changed', { threadId: thread.id })
        if (thread.projector.turn) await steer(thread, entry.input, entry.clientUserMessageId)
        else await submitTurn(thread, entry.input)
        return {}
      }
      case 'codeDesktop/workflow/stop': {
        const threadId = requireThreadId(params)
        return stopWorkflow(threads.get(threadId)?.loaded ? threads.get(threadId) : await loadThread(threadId), params.runId)
      }
      case 'codeDesktop/workflow/resume': {
        const threadId = requireThreadId(params)
        return resumeWorkflow(threads.get(threadId)?.loaded ? threads.get(threadId) : await loadThread(threadId), params.runId)
      }
      case 'codeDesktop/workflows/list': return savedWorkflowsList(params)
      case 'codeDesktop/workflows/get': return savedWorkflowCall('workflows/get', params)
      case 'codeDesktop/workflows/delete': return savedWorkflowCall('workflows/delete', params)
      case 'codeDesktop/workflows/runs': {
        const { cwd, scope, name } = savedWorkflowParams(params, { nameRequired: false })
        const limit = Number.isInteger(params?.limit) ? Math.min(50, Math.max(1, params.limit)) : 20
        const result = await request('workflows/runs', { workspace: workspaceOf(cwd), limit, ...(name ? { name } : {}), ...(scope ? { scope } : {}) }, { timeoutMs: 30000 })
        return { runs: Array.isArray(result?.runs) ? result.runs : [], ...(result?.truncated ? { truncated: true } : {}) }
      }
      case 'codeDesktop/workflow/settings': {
        const threadId = requireThreadId(params)
        return workflowSettings(threads.get(threadId)?.loaded ? threads.get(threadId) : await loadThread(threadId), params)
      }
      case 'codeDesktop/workflow/artifact': {
        const threadId = requireThreadId(params)
        return workflowArtifact(threads.get(threadId)?.loaded ? threads.get(threadId) : await loadThread(threadId), params)
      }
      case 'thread/backgroundTerminals/list': {
        const thread = threads.get(requireThreadId(params))
        return { data: thread?.projector.backgroundTerminals() ?? [], nextCursor: null }
      }
      case 'thread/backgroundTerminals/terminate': {
        const threadId = requireThreadId(params)
        const result = await request('session/cancelBackgroundTask', { sessionId: threadId, taskId: String(params.processId ?? '') })
        return { terminated: result?.cancelled === true }
      }
      case 'codeDesktop/thread/permissions': {
        const thread = threads.get(requireThreadId(params))
        if (!thread?.loaded) return { applied: false }
        applyRequestParams(thread, params, { customization: false })
        await syncSessionSettings(thread)
        return { applied: true }
      }
      default:
        throw new RpcError(METHOD_NOT_FOUND, `${method} is not supported by the ZCode core.`)
    }
  }

  function turnsPage(turns, params = {}) {
    let list = turns.map((turn) => (params.itemsView === 'notLoaded' ? { ...turn, items: [], itemsView: 'notLoaded' } : turn))
    if (params.sortDirection !== 'asc') list = list.slice().reverse()
    const offset = Number.parseInt(params.cursor ?? '0', 10) || 0
    const limit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 25
    return { data: list.slice(offset, offset + limit), nextCursor: offset + limit < list.length ? String(offset + limit) : null, backwardsCursor: null }
  }

  /**
   * A sub-agent's turns. ZCode's own record of the child session is complete (prompt, thinking, text, tools); the
   * bridge's copy from the live stream is the fallback while the sub-agent runs or when ZCode has no record. ZCode
   * serves session/messages only for an open session, so the record is read from its database.
   */
  async function childTurns(childId) {
    const meta = childMeta(childId)
    const saved = store.get(childId)?.childTurn
    const live = threads.get(meta?.parentId)?.projector.children.get(childId)
    const running = live?.status === 'running'
    if (!running) {
      const messages = storedMessages(paths.sessionDb, childId) ?? await messagesOf(childId).catch(() => null)
      const turns = messages?.length ? childHistory(childId, meta, messages) : []
      if (turns.length) return turns
    }
    if (saved) return [{ ...saved, status: saved.status === 'inProgress' && !live ? 'interrupted' : saved.status }]
    return []
  }

  /**
   * A child session's record as turns with the live stream's ids: its tools carry the parent's mirrored call ids
   * (tool_subagent_<agentId>_<callId>), its first run is the live turn `turn-<agentId>` opened by the prompt item.
   */
  function childHistory(childId, meta, messages) {
    const agentId = meta?.agentId ?? (childId.startsWith('sess_subagent_') ? childId.slice('sess_subagent_'.length) : null)
    const { turns } = turnsFromMessages(messages, { threadId: childId, cwd: meta?.cwd ?? home, ...(agentId ? { callIdPrefix: `tool_subagent_${agentId}_` } : {}) })
    if (!agentId || !turns.length) return turns
    const first = turns[0]
    const liveTurnId = `turn-${agentId}`
    first.id = liveTurnId
    const prompt = first.items.find((item) => item.type === 'userMessage')
    if (prompt) prompt.id = `${liveTurnId}-prompt`
    return turns
  }

  /**
   * The MCP servers changed (a connector added, edited, removed, switched on or off). ZCode gives a session its MCP
   * servers when it opens it (session/create, session/resume), so an open session keeps the old set and GLM gets
   * "Tool not found" for a new connector. Every loaded session reopens (Codex refreshes each loaded thread too,
   * mcp_refresh.rs): an idle one now, a busy one when its turn ends or before its next turn starts.
   */
  async function refreshMcpSessions() {
    const stale = [...threads.values()].filter((thread) => thread.loaded)
    for (const thread of stale) thread.mcpStale = true
    await Promise.all(stale.map((thread) => reopenForMcp(thread).catch((error) => log(`zcode-bridge: MCP refresh of ${thread.id}: ${error.message}`))))
  }

  /**
   * Reopen a session whose MCP servers changed, once nothing is running in it: a background command, background
   * sub-agent or workflow run would stop with it, so the reopen waits for them (whenSettled).
   */
  async function reopenForMcp(thread) {
    if (!thread.mcpStale || !thread.loaded || !agent || agent.closed) return
    if (thread.projector.turn || thread.control || thread.pending.size) return
    if (thread.projector.hasBackgroundWork()) { whenSettled(thread); return }
    thread.mcpStale = false
    await request('session/close', { sessionId: thread.id }).catch(() => {})
    thread.projector.abandonBackground()
    thread.loaded = false
    thread.subscribed = false
    thread.appliedMode = null
    thread.appliedModel = null
    // Resumed at once, so the session stays open (no notLoaded flicker) with the new servers.
    await loadThread(thread.id)
  }

  /**
   * Once a session's background work (hasBackgroundWork) and turns have settled: release it (releaseWhenIdle, a
   * thread/unsubscribe that had to wait) or reopen it with its changed MCP servers (mcpStale). Settled means idle on two
   * polls in a row, so the turn ZCode starts to hand GLM a finished task's result (task-notification) is not cut off.
   */
  function whenSettled(thread) {
    if (thread.settleTimer) return
    let idle = 0
    const stop = () => { clearInterval(thread.settleTimer); thread.settleTimer = null }
    thread.settleTimer = setInterval(() => {
      if (threads.get(thread.id) !== thread || !thread.loaded || !agent || agent.closed || (!thread.releaseWhenIdle && !thread.mcpStale)) { stop(); return }
      if (thread.projector.turn || thread.control || thread.pending.size || thread.queue.length || thread.projector.hasBackgroundWork()) { idle = 0; return }
      if (++idle < 2) return
      stop()
      if (thread.releaseWhenIdle) { thread.releaseWhenIdle = false; thread.mcpStale = false; void unload(thread).catch((error) => log(`zcode-bridge: release: ${error.message}`)) }
      else void reopenForMcp(thread).catch((error) => log(`zcode-bridge: MCP refresh of ${thread.id}: ${error.message}`))
    }, settlePollMs)
    thread.settleTimer.unref?.()
  }

  async function unload(thread) {
    thread.releaseWhenIdle = false
    await request('session/close', { sessionId: thread.id }).catch(() => {})
    // Anything still live stopped with the session: no sub-agent or command keeps showing as running.
    thread.projector.abandonBackground()
    thread.loaded = false
    thread.subscribed = false
    thread.appliedMode = null
    thread.appliedModel = null
    emitStatus(thread)
  }

  async function compact(thread, instructions = '') {
    // ZCode runs compaction as its own turn (turn.started "/compact" … compaction operation … turn.completed);
    // the live projector turns it into a Codex turn with a contextCompaction item.
    try {
      await request('session/compact', { sessionId: thread.id, ...(instructions ? { instructions } : {}) }, { timeoutMs: 600000 })
    } catch (failure) {
      if (thread.projector.turn) thread.projector.finishTurn('failed', turnError(failure?.message ?? 'Compaction failed.'))
      else notify('error', { threadId: thread.id, turnId: null, willRetry: false, error: turnError(failure?.message ?? 'Compaction failed.') })
    }
    thread.history = null
  }

  function reviewPrompt(target) {
    switch (target?.type) {
      case 'baseBranch': return { label: `changes against ${target.branch}`, prompt: `Review the code changes on this branch against the base branch "${target.branch}" (use git diff ${target.branch}...HEAD). Report concrete bugs, risks and missing tests, most important first, with file:line references. Do not change any files.` }
      case 'commit': return { label: `commit ${String(target.sha).slice(0, 12)}`, prompt: `Review commit ${target.sha} (git show ${target.sha}). Report concrete bugs, risks and missing tests, most important first, with file:line references. Do not change any files.` }
      case 'custom': return { label: 'custom review', prompt: `${String(target.instructions ?? '').trim()}\n\nDo not change any files.` }
      default: return { label: 'uncommitted changes', prompt: 'Review the uncommitted changes in this repository (git status, git diff, and git diff --staged). Report concrete bugs, risks and missing tests, most important first, with file:line references. Do not change any files.' }
    }
  }

  transport.start()
}

/**
 * The host's answers to ZCode's scheduled-task requests (automation-port.ts). OpenClaude Desktop keeps no automations, so
 * the binding check and the list are truthfully empty, and a create, update or delete fails with a reason the model
 * can pass on (instead of ZCode's "Try again later", which an unanswered binding check turns into).
 */
export function schedulingHandlers() {
  const unavailable = () => { throw Object.assign(new Error(SCHEDULING_UNAVAILABLE), { code: -32000 }) }
  return {
    'automation/checkTaskBinding': () => ({ bound: false }),
    'automation/list': () => ({ automations: [] }),
    'automation/create': unavailable,
    'automation/update': unavailable,
    'automation/delete': unavailable,
    'offPeak/create': unavailable,
    'offPeak/list': () => ({ tasks: [] }),
  }
}
