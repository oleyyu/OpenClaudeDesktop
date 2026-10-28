/**
 * Codex app-server (protocol 0.155.1, JSON-RPC lines on stdio) served from an
 * official OpenCode or MiMo Code binary through its `serve` HTTP API + SSE.
 *
 *   thread               OpenCode session (projection.js); sub-agent sessions are spawned threads
 *   turn/start, steer    POST /session/:id/prompt_async (a prompt while busy joins the running loop)
 *   turn/interrupt       POST /session/:id/abort
 *   approvals            permission.asked → decided by the thread's mode (policy.js) or a Codex card
 *   questions            question.asked → item/tool/requestUserInput; plan_exit → the plan card
 *   customization        the generated plugin (plugin.js) reads per-session runtime files
 *   tools                session permission deny rules (tools.js)
 *   MCP / skills / plugins  the generated config folder (config.js) + live /mcp calls
 *   usage                folded from the sessions' own token counts (usage.js)
 *   side question        a temporary fork with every tool denied, deleted afterwards
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { LineTransport, RpcError, METHOD_NOT_FOUND, INVALID_PARAMS, invalidParams } from './transport.js'
import { coreSettingDefs, coreSettingValue, coreSettingsEnv, coreSettingsView, storedCoreSettings } from './core-settings.js'
import { AgentServer } from './server.js'
import { BridgeConfig, readJson, toCodexMcp, toOpencodeMcp, writeAtomic } from './config.js'
import { appToolsServer, appToolsPrefix, SESSION_ARG } from './app-tools.js'
import { ThreadStore } from './store.js'
import { ModelCatalog, splitModel, variantOf, workingWindow } from './models.js'
import { authFile, credentialOf, providerRank, storedCredentials } from './credentials.js'
import { freeTierActive } from './flavor.js'
import { MIMO_TOP_RUN, Projector, actorErrorLine, actorThreadId, errorInfoOf, execSubParts, isDefaultTitle, isExecScript, mcpServerOf, messageSliceQuery, parseActorThreadId, planOf, taskPlanOf, tokenBreakdown, addBreakdown, emptyBreakdown, toolItem, turnDiff } from './projection.js'
import { afterPlanState, agentFor, allowedExternalDirs, applyPermissionParams, configRules, decide, defaultPermission, grantScopeChanged, isReadOnlyMode, isSessionDecision, neverAsks, replyFor, sandboxPolicy, sessionGrant, sessionRules, wildcardMatch } from './policy.js'
import { denyRules, mcpConfigSelection, mcpToolName, mergeToolSelections, toolSelectionOf, toolsListResponse } from './tools.js'
import { McpToolCache } from './mcp-tools.js'
import { PLUGIN_FILE } from './plugin.js'
import { OAuthCallbacks, callbackOf } from './oauth-callback.js'
import { UsageCache, accountUsage, codeStats, foldSession, localDayKey } from './usage.js'

export const BRIDGE_VERSION = '0.1.0'
// MiMo's built-in slash commands whose descriptions it translates itself (cli/cmd/tui/i18n/slash-command.ts).
const MIMO_BUILTIN_COMMANDS = new Set(['init', 'review', 'dream', 'distill', 'goal', 'deep-research'])
const seconds = (ms) => Math.floor(ms / 1000)
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const USER_MESSAGE_TIMEOUT_MS = 20000
// OpenCode's global session list (/experimental/session) is paged: x-next-cursor holds the last
// session's time.updated, and ?cursor= asks for the sessions updated before it.
const SESSION_PAGE = 1000
const SESSION_PAGE_MIN = 100
const SESSION_PAGES_MAX = 1000
// thread/list cursors that carry OpenCode's own cursor (other cursors are offsets into a full listing).
const SESSION_CURSOR = 'oc:'
/** The OpenClaude Desktop workflow runner's clientInfo.name (app/electron/workflow-child.mjs), and its agents' session title. */
const WORKFLOW_CLIENT = 'code-desktop-workflows'
/** Removes workflow-runs/<pid> folders (a runner bridge's generated config) whose process is gone. */
function sweepRunnerFolders(stateDir) {
  const dir = path.join(stateDir, 'workflow-runs')
  let names = []
  try { names = fs.readdirSync(dir) } catch { return }
  for (const name of names) {
    if (!/^\d+$/.test(name) || Number(name) === process.pid) continue
    try { process.kill(Number(name), 0); continue } catch (error) { if (error?.code === 'EPERM') continue }
    try { fs.rmSync(path.join(dir, name), { recursive: true, force: true }) } catch {}
  }
}
const WORKFLOW_TITLE = 'Workflow agent'
/** The entries of `extra` whose message id `list` does not have. */
const withoutIds = (extra, list) => {
  const seen = new Set((Array.isArray(list) ? list : []).map((entry) => entry?.info?.id))
  return (Array.isArray(extra) ? extra : []).filter((entry) => !seen.has(entry?.info?.id))
}
/** Permission asks of the agent's own tools, never an MCP tool's name. */
const BUILTIN_ASKS = new Set(['bash', 'edit', 'read', 'external_directory', 'doom_loop', 'bash_delete', 'mcp_sampling', 'question', 'task', 'webfetch', 'websearch', 'skill', 'workflow'])
/** A title that names nothing: OpenCode's default, or the placeholder a workflow agent's session was created with. */
const placeholderTitle = (title, meta) => isDefaultTitle(title) || (meta?.workflowAgent === true && title === WORKFLOW_TITLE)

/**
 * What initialize reports (the app keeps it as boot.core.capabilities).
 * unsupportedMethods: thread/rollback (the app uses thread/revert), background terminals
 * (OpenCode has no background shell).
 */
/**
 * A slash command's argument hint from the agent's own `hints` (command/index.ts: the template's placeholders):
 * '$ARGUMENTS' → '[arguments]', '$1 $2' → '[arg1] [arg2]'; '' without any.
 */
export function commandHint(hints) {
  const list = (Array.isArray(hints) ? hints : []).filter((hint) => typeof hint === 'string')
  if (!list.length) return ''
  if (list.includes('$ARGUMENTS')) return '[arguments]'
  const numbered = list.map((hint) => /^\$(\d+)$/.exec(hint)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b)
  return numbered.length ? [...new Set(numbered)].slice(0, 6).map((n) => `[arg${n}]`).join(' ') : ''
}

/** account/login/start codeDesktop.inputs: answers to an OAuth method's prompts, short strings keyed by prompt key. */
export function loginInputs(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out = {}
  for (const [key, answer] of Object.entries(value)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || typeof answer !== 'string' || !answer.trim() || answer.length > 512 || /[\u0000-\u001f]/.test(answer)) continue
    out[key] = answer.trim()
  }
  return out
}

// An agent file's name (its id: <name>.md) and the permissions `opencode agent create` offers (cli/cmd/agent.ts).
const AGENT_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
const AGENT_PERMISSIONS = ['bash', 'read', 'edit', 'glob', 'grep', 'webfetch', 'task', 'todowrite', 'websearch', 'lsp', 'skill']

export function capabilitiesFor(flavor) {
  return {
    customization: true,
    permissionHints: true,
    systemPromptPreview: true,
    livePermissions: true,
    toolSelection: true,
    codeStats: true,
    structuredOutput: true,
    sideQuestion: true,
    // The agent titles its sessions (session.updated title → thread/name/updated) unless the user named one.
    generatesTitles: true,
    deleteHistory: true,
    unloadOnNavigate: true,
    perTokenBilling: true,
    skillToggle: true,
    mcpConfigWrite: true,
    // config/batchWrite mcp_servers.<name>.enabled turns a connector off or back on (the app's Connectors switches).
    mcpEnable: true,
    pluginManage: true,
    modelParams: true,
    // The Seatbelt profile (sandbox.js) denies network unless the turn's sandboxPolicy.networkAccess allows it.
    sandboxNetwork: 'policy',
    // MiMo's workflow tool (deep-research, fact-check, compose, custom .mimocode/workflows): its runs project as
    // item.workflowRun (projection.js mimoWorkflowRun), stop with codeDesktop/workflow/stop and resume with
    // codeDesktop/workflow/resume (run.resumable).
    modelWorkflows: flavor.id === 'mimo',
    // /cd moves the session to another folder of its project (OpenCode's /move: codeDesktop/thread/move); MiMo has no
    // move-session route.
    moveCwd: flavor.id === 'opencode',
    harnessProfile: false,
    providerSettings: false,
    // Settings › Models › Custom providers (CODE_DESKTOP_PROVIDERS_FILE, config.js providerOverlay): the endpoints the
    // app saves join OpenCode's model list; the DeepSeek-only API connection and official prices stay hidden.
    customProviders: true,
    computerUse: false,
    backgroundTerminals: false,
    // review/start runs read-only (OpenCode's plan agent under the bridge's 'review' mode), whatever the session's mode.
    reviewReadOnly: 'noEdits',
    // The review command also takes a pull request (number or URL: command/template/review.txt runs `gh pr view|diff`).
    reviewTargets: ['uncommittedChanges', 'baseBranch', 'commit', 'pullRequest', 'custom'],
    // A model without image input still takes images as files: MiMo's read tool hands them to a vision sub-agent
    // (tool/read.ts, session/system.ts vision-capability), so the app sends them as file mentions.
    ...(flavor.id === 'mimo' ? { imageFallback: 'path' } : {}),
    // A remote connector may name a pre-registered OAuth client (config/batchWrite mcp_servers.<name>.oauth).
    mcpOAuthClient: true,
    // MiMo's per-connector model requests (MCP sampling: mcp.<name>.sampling ask / allow / deny), written with
    // config/batchWrite mcp_servers.<name>.sampling and listed as mcpServerStatus codeDesktop.sampling.
    ...(flavor.id === 'mimo' ? { mcpSampling: true } : {}),
    // codeDesktop/references/list: OpenCode's `references` (named repos and folders), offered in the app's @ menu.
    references: flavor.id === 'opencode',
    // OpenClaude Desktop keeps its config changes in its own overlay (OPENCODE_CONFIG_DIR), never in the user's file.
    configOverlay: true,
    // codeDesktop/history/import: MiMo imports other tools' sessions on request (Settings › Code).
    ...(flavor.id === 'mimo' ? { historyImport: ['cc', 'codex', 'opencode'] } : {}),
    // codeDesktop/promptSuggestion: MiMo's next-prompt prediction after each turn (predictNext); the app's
    // Settings › Code › Sessions › Prompt suggestions switch is listed for it.
    ...(flavor.id === 'mimo' ? { promptSuggestion: true } : {}),
    // Rewind can also put the files back (thread/revert codeDesktop.restoreFiles → OpenCode's own /undo, session/revert.ts).
    rewindFiles: true,
    // /cd would fork into a session that stays in the old folder: OpenCode routes a session by its own directory.
    forkCwd: false,
    // codeDesktop/mcpServer/logout: drop a connector's stored sign-in (DELETE /mcp/:name/auth).
    mcpLogout: true,
    // codeDesktop/thread/share: OpenCode's /share and /unshare (POST / DELETE /session/:id/share); the link rides on the
    // thread as codeDesktop.shareUrl.
    ...(flavor.id === 'opencode' ? { threadShare: true } : {}),
    // codeDesktop/agents/list: the agent's own agents (GET /agent) for Customize; primaryAgents: a session can run as
    // one of its primary agents (codeDesktop.agent on thread/start and turn/start; default_agent otherwise).
    agentsList: true,
    primaryAgents: true,
    // codeDesktop/agents/write|remove: an agent of the user's own as a markdown file in the project's or the global
    // agents folder (as `opencode agent create` writes it), for Customize › Agents' Create agent.
    agentsWrite: true,
    // Settings › Code › '{core} settings' (codeDesktop/coreSettings/read|write, core-settings.js).
    coreSettings: true,
    // Dynamic workflows on OpenClaude Desktop's engine: an agent() opts.disallowedTools entry turns these tools off for that
    // agent through thread/start codeDesktop.tools.disabled (Claude tool name → this agent's own tool ids): web fetch,
    // web and code search, and sub-agents (OpenCode's `task`; MiMo's `actor`, since its `task` is the work-item list).
    workflowToolSwitches: flavor.id === 'mimo'
      ? { WebFetch: ['webfetch'], WebSearch: ['websearch', 'codesearch'], Agent: ['actor'], Task: ['actor'] }
      : { WebFetch: ['webfetch'], WebSearch: ['websearch', 'codesearch'], Agent: ['task'], Task: ['task'] },
    // ...and an `mcp__<server>[__<tool>]` entry through thread/start config mcp_servers.<name>.enabled false /
    // .disabled_tools (as on Codex; tools.js mcpConfigSelection), against the servers config/read lists.
    workflowMcpSwitches: true,
    // The agent sends every MCP tool definition with each model request and reads the list again on tools/list_changed:
    // OpenClaude Desktop's long, rarely used tool groups wait behind its load_tools tool (core-registry.mjs deferAppTools).
    deferAppTools: true,
    unsupportedMethods: ['thread/rollback', 'thread/backgroundTerminals/terminate'],
    agent: flavor.id,
  }
}

/**
 * The review command's $ARGUMENTS for a review/start target (command/template/review.txt: none for uncommitted changes,
 * a branch, a commit, a pull request number or URL — reviewed with `gh pr view|diff` — or free instructions).
 */
export function reviewArguments(target = {}) {
  if (target.type === 'baseBranch') return String(target.branch ?? '')
  if (target.type === 'commit') return String(target.sha ?? '')
  if (target.type === 'pullRequest') return String(target.pullRequest ?? '').trim()
  if (target.type === 'custom') return String(target.instructions ?? '')
  return ''
}

/** The review's title in the transcript ('Pull request #42'). */
export function reviewLabel(target = {}) {
  if (target.type === 'baseBranch') return `Changes against ${target.branch}`
  if (target.type === 'commit') return `Commit ${String(target.sha ?? '').slice(0, 12)}`
  if (target.type === 'pullRequest') {
    const value = String(target.pullRequest ?? '').trim()
    const number = /^#?(\d+)$/.exec(value)?.[1] ?? /\/pull\/(\d+)(?:[/?#]|$)/.exec(value)?.[1]
    return number ? `Pull request #${number}` : `Pull request ${value}`
  }
  if (target.type === 'custom') return 'Custom review'
  return 'Uncommitted changes'
}

/**
 * MiMo's sampling ask metadata (mcp/sampling.ts: server, model, requestedModel, contentTypes, audio [{mimeType, bytes}],
 * systemPrompt / textPrompt previews, maxTokens) as the approval card's codeDesktop.sampling, bounded.
 */
export function samplingSummary(metadata = {}, patterns = []) {
  const text = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null)
  const server = text(metadata?.server, 120) ?? text(Array.isArray(patterns) ? patterns[0] : null, 120) ?? 'a connector'
  const audio = (Array.isArray(metadata?.audio) ? metadata.audio : []).filter((entry) => entry && Number.isFinite(entry.bytes))
  return {
    server,
    model: text(metadata?.model, 200),
    contentTypes: (Array.isArray(metadata?.contentTypes) ? metadata.contentTypes : []).filter((type) => typeof type === 'string').slice(0, 8),
    audioBytes: audio.reduce((total, entry) => total + entry.bytes, 0),
    audioClips: audio.length,
    systemPrompt: text(metadata?.systemPrompt, 600),
    textPrompt: text(metadata?.textPrompt, 600),
    maxTokens: Number.isSafeInteger(metadata?.maxTokens) && metadata.maxTokens > 0 ? metadata.maxTokens : null,
  }
}

/** Why account/logout can't remove a credential, and where the user removes it instead. */
export function signOutElsewhere(flavor, providers) {
  const where = (provider) => ({
    env: `${provider.name} reads its key from an environment variable; unset it and restart OpenClaude Desktop`,
    settings: `${provider.name} is a provider in Settings › Models; remove it there`,
    config: `${provider.name}'s key is in your ${flavor.name} config file; remove it there`,
    none: `${provider.name} needs no sign-in`,
  })[provider.auth] ?? `${provider.name} isn't signed in through ${flavor.name}`
  return `Nothing to sign out of in ${flavor.name}: ${providers.map(where).join('; ')}.`
}

const SIDE_PROMPT = 'You answer a side question about the conversation above. The user asked it in a side panel; it does not enter the main conversation. Answer directly and concisely from the conversation so far. You have no tools.'

export class Bridge {
  /**
   * @param {{ flavor: any, binary: string, runner?: string, nodeBinary?: string, version?: string, stateDir: string, env?: object, input?: any, output?: any, log?: (line: string) => void }} options
   */
  constructor({ flavor, binary, runner = '', nodeBinary, version = '', stateDir, env = process.env, input = process.stdin, output = process.stdout, log = () => {} }) {
    this.flavor = flavor
    this.binary = binary
    this.runner = runner
    this.nodeBinary = nodeBinary ?? process.execPath
    this.reportedVersion = version
    this.stateDir = stateDir
    this.env = env
    this.log = log
    fs.mkdirSync(stateDir, { recursive: true })
    this.config = new BridgeConfig({ flavor, stateDir, env })
    // Generated-config folders of workflow runners that are gone (config.js runnerDir).
    if (!this.config.runnerDir) sweepRunnerFolders(stateDir)
    // OpenClaude Desktop's own tools server (app-tools.js; registered by the config overlay), or null.
    this.appTools = appToolsServer(env)
    this.store = new ThreadStore(stateDir)
    this.settingsFile = path.join(stateDir, 'settings.json')
    this.catalog = new ModelCatalog(() => this.api('GET', '/config/providers', { directory: this.homeDir() }), { rank: (provider) => providerRank(provider, this.credentialContext()) })
    this.mcpTools = new McpToolCache({ log })
    this.usageCache = new UsageCache()
    /** @type {Map<string, LiveThread>} root threads loaded here */
    this.threads = new Map()
    /** @type {Map<string, LiveThread>} sub-agent sessions of loaded threads */
    this.children = new Map()
    this.opening = new Map()
    this.sideQuestions = new Map()
    this.sideSessions = new Map()
    // MiMo side questions waiting on POST /session/:id/ask: session id → handlers that adopt the 'ask: …' child session.
    this.sideAsks = new Map()
    /** MiMo workflow runs this MiMo runs now (workflow.started/phase/log seen, no workflow.finished since; per server). */
    this.liveWorkflows = new Set()
    this.logins = new Map()
    /** The pending re-check after account/read found the provider list unavailable (unknownAccount). */
    this.accountRetry = null
    this.oauthCallbacks = new OAuthCallbacks({ log })
    this.server = null
    this.closed = false
    // $TMPDIR (canonical); /tmp is added by sandboxPolicy unless the client excludes it.
    this.tmpRoots = [...new Set([env.TMPDIR, os.tmpdir()].filter(Boolean).map((dir) => { try { return fs.realpathSync(dir) } catch { return null } }).filter(Boolean))]
    this.transport = new LineTransport(input, output, {
      onRequest: (method, params) => this.handle(method, params),
      onClose: () => void this.shutdown(),
      log,
    })
  }

  notify(method, params) { this.transport.notify(method, params) }
  homeDir() { return this.env.HOME || os.homedir() }
  /** What credentials.js needs to tell a signed-in provider from a free or keyless one. */
  credentialContext() {
    return {
      stored: storedCredentials(authFile(this.flavor, this.env)),
      free: this.flavor.freeProviders ?? [],
      ended: freeTierActive(this.flavor) ? [] : this.flavor.freeProviders ?? [],
      settings: this.config.providers().map((provider) => provider?.route).filter((route) => typeof route === 'string'),
    }
  }
  settings() { return readJson(this.settingsFile, {}) }
  saveSettings(patch) { writeAtomic(this.settingsFile, JSON.stringify({ ...this.settings(), ...patch }, null, 2) + '\n', 0o600) }

  start() { this.transport.start() }

  // ------------------------------------------------------------------ agent server

  async ensureServer() {
    if (this.server) return this.server.ready()
    if (!this.binary) throw new RpcError(-32000, `${this.flavor.name} is not installed. Download it in Settings › Cores or install \`${this.flavor.binary}\`.`)
    const env = this.config.write()
    const server = this.server = new AgentServer({
      flavor: this.flavor, binary: this.binary, runner: this.runner, nodeBinary: this.nodeBinary, log: this.log,
      // The bridge's own environment (HOME, XDG_*, …) over the process's: a bridge given a separate home keeps its agent there.
      env: { ...(this.env === process.env ? {} : this.env), ...env, ...this.serverEnv() },
      onExit: (info) => this.serverExited(info),
    })
    // A failed first start is dropped: ready() on it would start the server again without ever subscribing its events.
    try { await server.start() } catch (error) { if (this.server === server) this.server = null; throw error }
    this.stopEvents = this.server.events((event) => this.onEvent(event), { onOpen: () => this.resync() })
    // The app's own bridge: sessions of workflow agents whose runner was stopped before it could delete them.
    if (!this.config.runnerDir && !this.sweptWorkflowSessions) {
      this.sweptWorkflowSessions = true
      setTimeout(() => { if (!this.closed && this.clientName !== WORKFLOW_CLIENT) void this.removeWorkflowSessions({ timeoutMs: 60000 }).catch((error) => this.log(`workflow sessions: ${error?.message}`)) }, 0).unref?.()
    }
    return this.server
  }

  serverEnv() {
    const p = this.flavor.envPrefix
    return {
      [`${p}_ENABLE_QUESTION_TOOL`]: '1',
      // OPENCODE_AUTO_SHARE / MIMOCODE_AUTO_SHARE would share every new session publicly (see config.js overlay share).
      [`${p}_AUTO_SHARE`]: 'false',
      ...(this.flavor.id === 'opencode' ? { OPENCODE_EXPERIMENTAL_PLAN_MODE: '1', OPENCODE_CLIENT: 'cli' } : {}),
      // MiMo copies every Claude Code session (~/.claude/projects) into its own history on each start unless told not to
      // (src/index.ts ClaudeImport.run): the user never chose that here. Settings › Code imports on request instead
      // (codeDesktop/history/import → POST /global/import).
      ...(this.flavor.id === 'mimo' ? { MIMOCODE_DISABLE_CLAUDE_IMPORT: '1' } : {}),
      // MiMo registers its `workflow` tool (and its deep-research command) only behind this opt-in flag
      // (flag/flag.ts, tool/registry.ts); the bridge reports modelWorkflows for MiMo and gates the tool per thread
      // (the deny rule unless codeDesktop.dynamicWorkflows), so the tool must exist for Dynamic workflows to work.
      ...(this.flavor.id === 'mimo' ? { MIMOCODE_EXPERIMENTAL_WORKFLOW_TOOL: 'true' } : {}),
      // Settings › Code › '{core} settings' env switches (core-settings.js): MiMo's usage analysis opt-out, OpenCode's
      // Exa web search.
      ...coreSettingsEnv(this.settings(), this.flavor),
    }
  }

  /** codeDesktop/coreSettings/read: the flavor's settings and where OpenClaude Desktop keeps them. */
  coreSettingsRead() {
    return { file: this.settingsFile, settings: coreSettingsView(coreSettingDefs(this.flavor), storedCoreSettings(this.settings(), this.flavor)) }
  }

  /**
   * codeDesktop/coreSettings/write {key, value}: saved in the bridge's settings.json; a config key rewrites the overlay
   * and reloads idle instances, an env switch restarts the agent server once nothing runs.
   */
  async coreSettingsWrite(params = {}) {
    const def = coreSettingDefs(this.flavor).find((entry) => entry.key === params.key)
    if (!def) throw invalidParams('Unknown setting.')
    let value
    try { value = coreSettingValue(def, params.value ?? null) } catch (error) { throw invalidParams(error.message) }
    const current = this.settings().coreSettings
    const next = { ...(current && typeof current === 'object' && !Array.isArray(current) ? current : {}) }
    if (value === null) delete next[def.key]
    else next[def.key] = value
    this.saveSettings({ coreSettings: next })
    if (def.kind === 'env') {
      const restarted = await this.restartServer().catch((error) => { this.log(`restart for ${def.key}: ${error?.message}`); return false })
      if (!restarted || this.pendingReload) this.pendingRestart = true
    } else await this.reloadConfig()
    return this.coreSettingsRead()
  }

  /**
   * codeDesktop/history/import {sources: ['cc'|'codex'|'opencode']}: MiMo's own import of other tools' sessions
   * (POST /global/import, idempotent), answered with its per-source counts {scanned, imported, resynced, skipped, errors}.
   */
  async importHistory(params) {
    if (this.flavor.id !== 'mimo') throw new RpcError(METHOD_NOT_FOUND, `${this.flavor.name} can’t import sessions from other tools.`)
    const sources = (Array.isArray(params?.sources) ? params.sources : []).filter((source) => ['cc', 'codex', 'opencode'].includes(source))
    if (!sources.length) throw invalidParams('Choose what to import: cc, codex or opencode.')
    await this.ensureServer()
    const result = await this.api('POST', '/global/import', { body: { sources: [...new Set(sources)] }, timeout: 600000 })
    this.importedSources = null
    return isRecord(result) ? result : {}
  }

  /**
   * Sessions MiMo imported from another tool (its external_import table, read-only): id → 'cc' | 'codex' | 'opencode'.
   * Re-read when the database changes.
   */
  importedFrom() {
    if (this.flavor.id !== 'mimo') return null
    const file = path.join(this.dataDir(), 'mimocode.db')
    let mtime = 0
    try { mtime = fs.statSync(file).mtimeMs } catch { return null }
    if (this.importedSources?.mtime === mtime) return this.importedSources.map
    const map = new Map()
    try {
      const { DatabaseSync } = this.sqlite ?? {}
      if (DatabaseSync) {
        const db = new DatabaseSync(file, { readOnly: true })
        try { for (const row of db.prepare('select session_id, source from external_import').all()) map.set(row.session_id, row.source) } finally { db.close() }
      }
    } catch {}
    this.importedSources = { mtime, map }
    return map
  }

  async api(method, route, options = {}) {
    const server = await this.ensureServer()
    return server.request(method, route, options)
  }

  serverExited(info) {
    this.log(`${this.flavor.name} exited (${info.signal ?? info.code})`)
    // Its workflow runs ended with it (MiMo's list keeps them running: projected as interrupted, resumable).
    this.liveWorkflows.clear()
    for (const thread of [...this.threads.values(), ...this.children.values()]) thread.workflowHeld?.clear()
    for (const thread of [...this.threads.values(), ...this.children.values()]) {
      if (!thread.activeTurn && !thread.busy) continue
      thread.turnError = { message: `${this.flavor.name} stopped while this turn was running.`, codexErrorInfo: 'other', additionalDetails: null, misalignment: null }
      thread.forceStatus = 'interrupted'
      thread.finishTurn()
    }
  }

  // After an SSE (re)connection: reload every live thread's history so nothing is missed.
  resync() {
    for (const thread of [...this.threads.values(), ...this.children.values()]) {
      void thread.reload().catch((error) => this.log(`resync ${thread.id}: ${error?.message || error}`))
    }
  }

  // ------------------------------------------------------------------ events

  onEvent(event) {
    const payload = event?.payload ?? event
    const type = payload?.type
    const props = payload?.properties ?? {}
    if (typeof type !== 'string' || type === 'sync' || type === 'server.heartbeat') return
    const sessionID = props.sessionID ?? props.info?.sessionID ?? props.part?.sessionID ?? (type.startsWith('session.') ? props.info?.id : undefined)
    if (sessionID && this.sideSessions.has(sessionID)) return this.sideSessions.get(sessionID)(type, props)
    // The session MiMo answers a side question in (askSideQuestion) is never a sub-agent of the thread.
    if (type === 'session.created' && props.info?.parentID && this.sideAsks.has(props.info.parentID) && /^ask: /.test(props.info.title ?? '')) {
      for (const adopt of this.sideAsks.get(props.info.parentID)) { adopt(props.info); break }
      return
    }
    if (type === 'session.created' && props.info?.parentID) return void this.childCreated(props.info)
    if (type === 'mcp.tools.changed') { this.mcpTools.invalidate(props.server); return }
    if (type.startsWith('workflow.') && typeof props.runID === 'string') {
      if (type === 'workflow.finished') this.liveWorkflows.delete(props.runID)
      else if (type === 'workflow.started' || type === 'workflow.phase' || type === 'workflow.log') this.liveWorkflows.add(props.runID)
    }
    if (type === 'bash.interactive.asked') return void this.onInteractiveBash(props, event?.directory).catch((error) => this.log(`interactive bash ${props.id}: ${error?.message || error}`))
    if (type === 'session.updated' && props.info?.id && !props.info.parentID) this.archivedElsewhere(props.info)
    if (!sessionID) return this.onGlobalEvent(type, props)
    const thread = this.threads.get(sessionID) ?? this.children.get(sessionID)
    if (!thread) {
      // A request for a session this bridge has not loaded (unsubscribed while running): load it.
      if (type === 'permission.asked' || type === 'question.asked') void this.openAny(sessionID).then((loaded) => loaded?.onEvent(type, props)).catch(() => {})
      return
    }
    thread.onEvent(type, props)
  }

  /**
   * MiMo's bash {interactive:true} (tool/bash-interactive.ts) waits, with no timeout, for a client to run the command
   * in a terminal and POST /bash-interactive/:id/reply. OpenClaude Desktop has no terminal for it, so the bridge answers at
   * once with a failure the model can act on (rerun it non-interactively, or ask the user to run it), instead of the
   * turn hanging on '(waiting for user interaction...)' until it is stopped.
   */
  async onInteractiveBash(props, directory) {
    if (typeof props?.id !== 'string' || !props.id) return
    const cwd = typeof props.cwd === 'string' ? props.cwd : null
    const owners = [...this.threads.values()].map((thread) => this.store.get(thread.id)?.cwd).filter((root) => typeof root === 'string' && cwd && (cwd === root || cwd.startsWith(root.endsWith('/') ? root : `${root}/`)))
    const instance = typeof directory === 'string' && directory ? directory : owners.sort((a, b) => b.length - a.length)[0] ?? cwd ?? this.homeDir()
    const command = typeof props.command === 'string' ? props.command : ''
    // With OpenClaude Desktop's tools the session has the app's Terminal panel: the command can run there, where the user
    // types the answers (a password, a y/N prompt) and the model reads the result back.
    const prefix = this.appTools ? appToolsPrefix(this.appTools) : null
    const output = prefix
      ? `\`${command}\` needs someone at a terminal, so it was not run here. Run it in the Terminal panel beside this conversation instead: call ${prefix}run_in_terminal with this command (the user approves it, then answers its prompts there), tell the user what to type, and check the result with ${prefix}read_terminal. If it can run non-interactively (for example with --yes / -y or input piped in), rerun it that way instead.`
      : `OpenClaude Desktop can't run interactive commands, so \`${command}\` was not run. Rerun it non-interactively (for example with --yes / -y, a non-interactive flag, or input piped in), or ask the user to run it in their own terminal and tell you the result.`
    await this.api('POST', `/bash-interactive/${encodeURIComponent(props.id)}/reply`, { directory: instance, body: { output, exitCode: 1 } })
  }

  /**
   * An event for no session. OpenCode reports plugins that failed to install or load, and skills with broken
   * frontmatter, as a session.error without a session (plugin/index.ts, skill/index.ts); plugins also show toasts.
   * A plugin failure becomes that plugin's loadError (Customize › Plugins); every failure is a notice.
   */
  onGlobalEvent(type, props) {
    if (type === 'session.error') {
      const message = normalizeText(props.error?.data?.message ?? props.error?.message)
      if (!message) return
      const failure = pluginFailure(message)
      if (failure) {
        this.pluginErrors ??= new Map()
        if (this.pluginErrors.get(failure.target) !== message) {
          this.pluginErrors.set(failure.target, message)
          this.notify('codeDesktop/plugin/changed', { reason: 'loadError' })
        }
      }
      return this.globalNotice('configWarning', { summary: message, details: null })
    }
    if (type === 'tui.toast.show' && (props.variant === 'warning' || props.variant === 'error')) {
      const message = normalizeText(props.message)
      if (!message) return
      const title = normalizeText(props.title)
      return this.globalNotice('warning', { threadId: null, message: title && !message.startsWith(title) ? `${title}: ${message}` : message })
    }
  }

  /** One connection-wide notice, once per text until the agent reloads its config. */
  globalNotice(method, params) {
    this.noticesSent ??= new Set()
    const key = `${method}:${params.summary ?? params.message}`
    if (this.noticesSent.has(key)) return
    if (this.noticesSent.size > 200) this.noticesSent.clear()
    this.noticesSent.add(key)
    this.notify(method, params)
  }

  /** The failure OpenCode reported for a configured plugin spec since its config last loaded, or null. */
  pluginLoadError(spec) {
    if (!this.pluginErrors?.size) return null
    if (this.pluginErrors.has(spec)) return this.pluginErrors.get(spec)
    const name = pluginName(spec)
    for (const [target, message] of this.pluginErrors) if (pluginName(target) === name) return message
    return null
  }

  /** A session archived in OpenCode's own apps while the app lists it: it moves to Archived. */
  archivedElsewhere(info) {
    const meta = this.store.get(info.id)
    if (meta.archived || meta.deleted || meta.hidden || !sessionArchived(info, meta)) return
    if (!meta.cwd && !this.threads.has(info.id)) return
    this.archivedNoticed ??= new Set()
    const key = `${info.id}:${info.time.archived}`
    if (this.archivedNoticed.has(key)) return
    this.archivedNoticed.add(key)
    this.notify('thread/archived', { threadId: info.id })
  }

  async openAny(id) {
    const root = await this.rootOf(id)
    if (root !== id) { await this.openThread(root); return this.children.get(id) ?? null }
    return this.openThread(id)
  }

  async rootOf(id) {
    let current = id
    for (let depth = 0; depth < 8; depth++) {
      const info = await this.sessionInfo(current)
      if (!info?.parentID) return current
      current = info.parentID
    }
    return current
  }

  async sessionInfo(id, directory) {
    try { return await this.api('GET', `/session/${encodeURIComponent(id)}`, { directory: directory ?? this.store.get(id).cwd }) } catch (error) {
      if (error?.status === 404 || error?.status === 400) return null
      throw error
    }
  }

  /** A child session of a loaded thread (any depth) became a spawned thread. */
  async childCreated(info) {
    const parent = this.threads.get(info.parentID) ?? this.children.get(info.parentID)
    if (!parent || this.children.has(info.id)) return
    const root = parent.root ?? parent
    const child = new LiveThread(this, { info, root, parent })
    this.children.set(info.id, child)
    this.store.update(info.id, { cwd: info.directory, parent: info.parentID, root: root.id })
    // The child gets the root's mode, tool selection and customization before its first step
    // (the plugin's chat.message hook waits for the runtime file written here).
    try { await child.applyRules(info.permission ?? []) } catch (error) { this.log(`child rules ${info.id}: ${error?.message || error}`) }
    child.writeRuntime()
    parent.linkChild(info)
    this.notify('thread/started', { thread: child.threadObject() })
    child.publishStatus({ type: 'active', activeFlags: [] })
  }

  // ------------------------------------------------------------------ threads

  async normalizeCwd(cwd) {
    const value = typeof cwd === 'string' && cwd ? cwd : this.homeDir()
    if (!path.isAbsolute(value)) throw invalidParams(`cwd must be absolute: ${value}`)
    try { return fs.realpathSync(value) } catch { return value }
  }

  async openThread(id) {
    if (typeof id !== 'string' || !id) throw new RpcError(INVALID_PARAMS, 'threadId is required')
    const live = this.threads.get(id)
    if (live) return live
    if (this.children.has(id)) return this.children.get(id)
    const actor = parseActorThreadId(id)
    if (actor) { await this.openThread(actor.sessionID); return this.children.get(id) ?? this.historyOf(id) }
    if (this.opening.has(id)) return this.opening.get(id)
    const promise = (async () => {
      const info = await this.sessionInfo(id)
      if (!info || this.store.get(id).deleted) throw new RpcError(INVALID_PARAMS, `This session is not available in ${this.flavor.name}.`, { codexErrorInfo: 'threadNotFound', threadId: id })
      const thread = new LiveThread(this, { info })
      await Promise.all([thread.reload(), this.loadCompaction(thread.cwd).catch(() => {})])
      this.threads.set(id, thread)
      thread.permission = applyPermissionParams(this.store.get(id).permission ?? defaultPermission(), {})
      thread.tools = this.store.get(id).tools ?? null
      thread.dynamicWorkflows = this.store.get(id).dynamicWorkflows === true
      thread.custom = this.store.get(id).custom ?? {}
      thread.writeRuntime()
      return thread
    })().finally(() => this.opening.delete(id))
    this.opening.set(id, promise)
    return promise
  }

  async createThread(params) {
    const cwd = await this.normalizeCwd(params.cwd)
    // A workflow agent's session (the OpenClaude Desktop workflow runner's own connection, workflow-child.mjs) is named up
    // front: nobody sees its title, and OpenCode and MiMo would spend a model request generating one per agent
    // (SessionPrompt.ensureTitle skips a session created with a title).
    const workflowAgent = this.clientName === WORKFLOW_CLIENT
    const body = workflowAgent ? { title: WORKFLOW_TITLE } : {}
    const [info] = await Promise.all([
      this.api('POST', '/session', { directory: cwd, body }),
      // The folder's MCP servers before the first call (their tools are mcpToolCall rows), once per folder.
      this.mcpNamesByDir?.has(cwd) ? null : this.refreshMcpNames(cwd),
    ])
    // runnerPid: the runner bridge that owns the session; it deletes it when it stops, and the app's bridge deletes one a
    // runner left behind (removeWorkflowSessions): a workflow agent's session never lands in the user's own history.
    this.store.update(info.id, { cwd: info.directory ?? cwd, createdBy: 'code-desktop', ...(workflowAgent ? { workflowAgent: true, runnerPid: process.pid } : {}) })
    const thread = new LiveThread(this, { info })
    thread.projector.load([])
    this.threads.set(info.id, thread)
    if (typeof params.developerInstructions === 'string' && params.developerInstructions.trim()) thread.custom.developer = params.developerInstructions.trim()
    await thread.applyParams(params, { initial: true })
    return thread
  }

  /** Codex Thread for a session not loaded here. */
  coldThread(info) {
    const meta = this.store.get(info.id)
    const created = info.time?.created ?? Date.now()
    const updated = Math.max(created, meta.lastActivity ?? info.time?.updated ?? created)
    const name = meta.name ?? (placeholderTitle(info.title, meta) ? null : info.title)
    const parent = info.parentID ?? null
    return {
      id: info.id, sessionId: info.id, forkedFromId: meta.forkedFrom ?? null, parentThreadId: parent,
      preview: meta.preview || name || '', ephemeral: false, section: null, sectionEnteredAt: null, projectId: info.projectID ?? null,
      historyMode: 'paginated', modelProvider: info.model?.providerID ?? meta.model?.split('/')[0] ?? this.flavor.id,
      model: info.model ? `${info.model.providerID}/${info.model.id}` : meta.model ?? null, reasoningEffort: meta.effort ?? null,
      createdAt: seconds(created), updatedAt: seconds(updated), recencyAt: seconds(updated),
      status: { type: 'notLoaded' }, path: null, cwd: info.directory ?? meta.cwd ?? '',
      cliVersion: `${this.flavor.id} ${this.agentVersion()}`, originator: null,
      source: parent ? { subAgent: { thread_spawn: { parent_thread_id: parent, depth: 1, agent_path: null, agent_nickname: meta.agentLabel ?? null, agent_role: null } } } : 'appServer',
      threadSource: null, agentNickname: parent ? meta.agentLabel ?? null : null, agentRole: null, gitInfo: null, name, turns: [],
      // A session MiMo imported from Claude Code, Codex or OpenCode (OpenClaude Desktop extension: the app labels it).
      ...(this.importedFrom()?.get(info.id) || typeof info.share?.url === 'string' ? { codeDesktop: {
        ...(this.importedFrom()?.get(info.id) ? { importedFrom: this.importedFrom().get(info.id) } : {}),
        ...(typeof info.share?.url === 'string' ? { shareUrl: info.share.url } : {}),
      } } : {}),
    }
  }

  agentVersion() { return this.server?.version ?? (this.reportedVersion || 'unknown') }

  /**
   * One page of OpenCode's global session list, newest update first. `next` is OpenCode's cursor
   * (x-next-cursor: the last session's time.updated) for the older rest, null at the end.
   * OpenCode hides archived sessions (time.archived, set by its own apps) unless asked: every page
   * holds both kinds and sessionArchived() tells them apart, so Archived shows both.
   * `roots` leaves sub-agent (task) sessions out on the server.
   */
  async sessionPage({ roots = false, cursor, limit = SESSION_PAGE } = {}) {
    const query = { limit, archived: 'true', ...(roots ? { roots: 'true' } : {}), ...(cursor ? { cursor } : {}) }
    const result = await this.api('GET', '/experimental/session', { query, withHeaders: true })
    const plain = Array.isArray(result) || !isRecord(result) || !('headers' in result)
    const body = plain ? result : result.body
    const sessions = Array.isArray(body) ? body : []
    const next = plain ? null : result.headers?.get?.('x-next-cursor') ?? null
    return { sessions, next: next && sessions.length && String(next) !== String(cursor ?? '') ? String(next) : null }
  }

  /** Every session OpenCode has (paged to the end); folder by folder when the global list is missing. */
  async listSessions({ roots = false } = {}) {
    const sessions = []
    let cursor
    for (let page = 0; page < SESSION_PAGES_MAX; page++) {
      let result
      try { result = await this.sessionPage({ roots, cursor }) } catch (error) {
        if (page > 0) { this.log(`session list page ${page + 1} failed (${error?.message}); keeping the first ${sessions.length}`); break }
        this.log(`global session list failed (${error?.message}); listing known folders`)
        return this.listSessionsByFolder({ roots })
      }
      sessions.push(...result.sessions)
      if (!result.next) break
      cursor = result.next
    }
    return sessions
  }

  async listSessionsByFolder({ roots = false } = {}) {
    const query = { limit: SESSION_PAGE, archived: 'true', ...(roots ? { roots: 'true' } : {}) }
    const sessions = []
    const cwds = new Set([...this.store.ids().map((id) => this.store.get(id).cwd).filter(Boolean)])
    for (const cwd of cwds) { try { const list = await this.api('GET', '/session', { directory: cwd, query }); if (Array.isArray(list)) sessions.push(...list) } catch {} }
    return sessions
  }

  async listThreads(params = {}) {
    // importedFrom() reads MiMo's database synchronously while rows are built.
    if (this.flavor.id === 'mimo' && !this.sqlite) this.sqlite = await import('node:sqlite').catch(() => ({}))
    const cwdFilter = params.cwd === undefined || params.cwd === null ? null : new Set([params.cwd].flat())
    const kinds = Array.isArray(params.sourceKinds) && params.sourceKinds.length ? params.sourceKinds.map(String) : null
    const wantChildren = kinds?.some((kind) => kind.startsWith('subAgent')) ?? false
    const wantRoots = kinds === null || kinds.some((kind) => !kind.startsWith('subAgent'))
    const wantArchived = params.archived === true
    const term = params.searchTerm ? String(params.searchTerm).toLowerCase() : ''
    const key = params.sortKey === 'created_at' || params.sortKey === 'createdAt' ? 'createdAt' : 'updatedAt'
    const size = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 50
    const seen = new Set()
    /** The Codex thread for one listed session, or null when this listing leaves it out. */
    const accept = (info) => {
      if (!info?.id || seen.has(info.id)) return null
      seen.add(info.id)
      const meta = this.store.get(info.id)
      // A workflow agent's session (the runner's bridge started it) is never one of the user's.
      if (meta.deleted || meta.hidden || meta.workflowAgent === true) return null
      if (info.parentID ? !wantChildren : !wantRoots) return null
      if (sessionArchived(info, meta) !== wantArchived) return null
      if (cwdFilter && !cwdFilter.has(info.directory)) return null
      const live = this.threads.get(info.id) ?? this.children.get(info.id)
      const thread = live ? live.threadObject() : this.coldThread(info)
      // Matched here, not with OpenCode's `search` (title only): the first message and names set here count too.
      if (term && !`${thread.name ?? ''} ${thread.preview}`.toLowerCase().includes(term)) return null
      // A session nobody sent a message to yet stays out of the list.
      if (!info.parentID && !live && !meta.lastActivity && placeholderTitle(info.title, meta) && !meta.name) return null
      return thread
    }
    // MiMo actors live inside their parent session: the loaded ones are listed as sub-agent threads.
    const actors = () => (wantChildren ? [...this.children.values()].filter((child) => child.actor && !seen.has(child.id) && (!cwdFilter || cwdFilter.has(child.cwd))).map((child) => child.threadObject()) : [])
    const order = (items) => {
      items.sort((a, b) => b[key] - a[key] || b.createdAt - a.createdAt)
      if (params.sortDirection === 'asc') items.reverse()
      return items
    }
    const cursor = params.cursor ? String(params.cursor) : ''
    // Newest-updated first is OpenCode's own order: page on its cursor, so every session is reachable
    // and each page reads only as much of the list as it needs.
    if (key === 'updatedAt' && params.sortDirection !== 'asc' && (!cursor || cursor.startsWith(SESSION_CURSOR))) {
      const paged = await this.listThreadsPaged({ cursor: cursor ? cursor.slice(SESSION_CURSOR.length) : undefined, roots: !wantChildren, size, accept, pageSize: term || wantArchived ? SESSION_PAGE : Math.max(SESSION_PAGE_MIN, size * 2) }).catch((error) => { this.log(`paged session list failed (${error?.message}); listing every session`); return null })
      if (paged) return { data: order([...paged.items, ...(cursor ? [] : actors())]), nextCursor: paged.next ? SESSION_CURSOR + paged.next : null, backwardsCursor: null }
      seen.clear()
    }
    const items = []
    for (const info of await this.listSessions({ roots: !wantChildren })) { const thread = accept(info); if (thread) items.push(thread) }
    items.push(...actors())
    order(items)
    const start = /^\d+$/.test(cursor) ? Number.parseInt(cursor, 10) : 0
    return { data: items.slice(start, start + size), nextCursor: start + size < items.length ? String(start + size) : null, backwardsCursor: null }
  }

  /**
   * Threads from OpenCode's pages, from `cursor` on, until `size` are accepted. A page that stops
   * part-way stops after every session sharing the last one's time.updated (OpenCode's cursor is
   * "updated before"), so the next page starts exactly where this one ended. Sparse listings (a search,
   * Archived) read larger pages.
   */
  async listThreadsPaged({ cursor, roots, size, accept, pageSize = SESSION_PAGE }) {
    const items = []
    for (let page = 0; page < SESSION_PAGES_MAX; page++) {
      const result = await this.sessionPage({ roots, cursor, limit: pageSize })
      const { sessions } = result
      for (let index = 0; index < sessions.length; index++) {
        const thread = accept(sessions[index])
        if (thread) items.push(thread)
        if (items.length < size) continue
        const updated = sessions[index]?.time?.updated
        while (index + 1 < sessions.length && sessions[index + 1]?.time?.updated === updated) { const more = accept(sessions[++index]); if (more) items.push(more) }
        const more = index + 1 < sessions.length || Boolean(result.next)
        return { items, next: more && Number.isFinite(updated) ? String(updated) : null }
      }
      if (!result.next) return { items, next: null }
      cursor = result.next
    }
    return { items, next: cursor ?? null }
  }

  /** A thread's history (loaded here, or read once). */
  async historyOf(id) {
    const live = this.threads.get(id) ?? this.children.get(id)
    if (live) return live
    const actor = parseActorThreadId(id)
    const info = actor ? await this.sessionInfo(actor.sessionID) : await this.sessionInfo(id)
    if (!info || this.store.get(id).deleted) throw new RpcError(INVALID_PARAMS, `This session is not available in ${this.flavor.name}.`, { codexErrorInfo: 'threadNotFound', threadId: id })
    const thread = actor
      ? new LiveThread(this, { info: { ...info, id, parentID: actor.sessionID, title: this.store.get(id).agentLabel ?? actor.actorID }, actor: actor.actorID })
      : new LiveThread(this, { info })
    await thread.reload()
    return thread
  }

  // ------------------------------------------------------------------ catalog helpers

  /** The folder MCP / skills / tools questions are asked in. */
  directoryFor(params = {}) {
    const byThread = typeof params.threadId === 'string' ? (this.threads.get(params.threadId) ?? this.children.get(params.threadId)) : null
    if (byThread) return byThread.cwd
    if (typeof params.cwd === 'string' && path.isAbsolute(params.cwd)) return params.cwd
    if (Array.isArray(params.cwds) && typeof params.cwds[0] === 'string') return params.cwds[0]
    const latest = [...this.threads.values()].sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))[0]
    return latest?.cwd ?? this.homeDir()
  }

  loadedDirectories() {
    return [...new Set([this.homeDir(), ...[...this.threads.values()].map((thread) => thread.cwd)])]
  }

  async mergedConfig(directory) {
    try { return await this.api('GET', '/config', { directory }) } catch { return {} }
  }

  /** The MCP servers a folder runs: the agent's merged config, updated by this app's own edits (mcp.json). */
  async mcpServers(directory) {
    const config = await this.mergedConfig(directory)
    const servers = { ...(isRecord(config.mcp) ? config.mcp : {}) }
    const own = this.config.readMcp()
    for (const [name, value] of Object.entries(own.servers)) servers[name] = value
    for (const name of own.disabled) if (servers[name]) servers[name] = { ...servers[name], enabled: false }
    for (const name of Object.keys(servers)) if (isRecord(config.mcp) && config.mcp[name] && !own.servers[name] && !own.disabled.includes(name) && this.removedMcp?.has(name)) delete servers[name]
    return Object.entries(servers).filter(([, value]) => isRecord(value) && (value.type || value.command || value.url))
  }

  /**
   * Server names for mcpToolCall attribution: a folder's own list once read (refreshMcpNames), else the last one read
   * anywhere. OpenClaude Desktop's own server (app-tools.js) is always one, cache or not.
   */
  knownMcpNames(directory) {
    const names = (directory && this.mcpNamesByDir?.get(directory)) || this.cachedMcpNames || []
    return this.appTools && !names.includes(this.appTools.name) ? [this.appTools.name, ...names] : names
  }

  /**
   * Whether a permission ask names a connector tool its server annotates read-only (tools/list annotations, cached per
   * server config): such a tool needs no card in any mode, as for Codex. OpenClaude Desktop's own server is answered elsewhere.
   */
  async readOnlyMcpTool(directory, permission) {
    if (typeof permission !== 'string' || !permission || BUILTIN_ASKS.has(permission)) return false
    const match = mcpServerOf(permission, this.knownMcpNames(directory))
    if (!match || (this.appTools && match.server === this.appTools.name)) return false
    const config = (await this.mcpServers(directory)).find(([name]) => name === match.server)?.[1]
    if (!config) return false
    const tools = await this.mcpTools.tools(match.server, config)
    return tools.some((tool) => tool.readOnly === true && mcpToolName(match.server, tool.name) === permission)
  }

  /** Reads a folder's MCP servers into the cache; without a folder every loaded one (after an MCP edit). */
  async refreshMcpNames(directory) {
    const folders = directory ? [directory] : this.loadedDirectories()
    if (!directory) this.mcpNamesByDir?.clear()
    for (const folder of folders) {
      try { this.rememberMcpNames(folder, (await this.mcpServers(folder)).map(([name]) => name)) } catch {}
    }
    return this.knownMcpNames(directory ?? this.homeDir())
  }

  rememberMcpNames(directory, names) {
    this.cachedMcpNames = names
    ;(this.mcpNamesByDir ??= new Map()).set(directory, names)
  }

  disabledSkills() { return this.settings().disabledSkills ?? [] }

  readTools() { return this.flavor.readTools }

  /** The agent's data folder (<XDG_DATA_HOME>/<dataDir>, OpenCode's Global.Path.data). */
  dataDir() { return path.join(this.env.XDG_DATA_HOME || path.join(this.homeDir(), '.local', 'share'), this.flavor.dataDir) }

  planPaths(cwd) {
    const data = path.join(this.dataDir(), 'plans')
    return [path.join(data, '*'), path.join(`.${this.flavor.dataDir}`, 'plans', '*.md'), `.${this.flavor.dataDir}/plans/*.md`, path.join(cwd ?? '', `.${this.flavor.dataDir}`, 'plans', '*')]
  }

  /**
   * The folders the agent's own ruleset allows outside the workspace for a folder (allowedExternalDirs of the agent the
   * thread runs), cached for a minute and dropped on a config reload. [] when the agent can't say.
   */
  async agentDirs(directory, agentName = 'build') {
    const key = `${directory}\u0000${agentName}`
    const cached = this.agentDirCache?.get(key)
    if (cached && Date.now() - cached.at < 60000) return cached.value
    let value = []
    try {
      const agents = await this.api('GET', '/agent', { directory, timeout: 10000 })
      value = allowedExternalDirs((Array.isArray(agents) ? agents : []).find((agent) => agent?.name === agentName)?.permission)
    } catch (error) { this.log(`agent rules: ${error?.message ?? error}`) }
    // The references' folders too: OpenCode allows them for its agents (agent.ts), but its agent list can predate the
    // references' first load.
    try { value = [...new Set([...value, ...(await this.references(directory)).map((entry) => entry.path)])] } catch {}
    this.agentDirCache ??= new Map()
    this.agentDirCache.set(key, { value, at: Date.now() })
    return value
  }

  /** The agents a folder has (GET /agent, default_agent first then by name, as OpenCode sorts them), cached for a minute. */
  async agentList(directory) {
    const key = directory ?? ''
    const cached = this.agentListCache?.get(key)
    if (cached && Date.now() - cached.at < 60000) return cached.value
    const agents = await this.api('GET', '/agent', { directory, timeout: 10000 })
    const value = Array.isArray(agents) ? agents.filter((agent) => agent && typeof agent.name === 'string') : []
    this.agentListCache ??= new Map()
    this.agentListCache.set(key, { value, at: Date.now() })
    return value
  }

  /**
   * The primary agent a non-Plan turn runs (agent/agent.ts defaultInfo): the thread's chosen primary agent when the
   * folder still has it, else the first visible primary agent of OpenCode's list, which puts default_agent (or 'build')
   * first. 'build' when the list can't be read. A user who disabled 'build' or set default_agent gets theirs.
   */
  async primaryAgent(directory, choice = null) {
    let agents
    try { agents = await this.agentList(directory) } catch (error) { this.log(`agents: ${error?.message ?? error}`); return typeof choice === 'string' && choice ? choice : 'build' }
    const visible = agents.filter((agent) => agent.mode !== 'subagent' && agent.hidden !== true && agent.name !== 'plan')
    if (typeof choice === 'string' && visible.some((agent) => agent.name === choice)) return choice
    return visible[0]?.name ?? 'build'
  }

  /**
   * codeDesktop/agents/list: the folder's agents for Customize › Agents and the composer's agent choice. Hidden ones
   * are left out; primary: whether a turn can run as it (mode primary or all).
   */
  async agentsList(params = {}) {
    const directory = this.directoryFor(params)
    const agents = await this.agentList(directory)
    const config = await this.mergedConfig(directory).catch(() => ({}))
    const own = isRecord(config?.agent) ? config.agent : {}
    const fallback = await this.primaryAgent(directory)
    const dirs = this.agentFileDirs(directory)
    // An agent defined by a markdown file of its own (the project's or the global agents folder): where it lives, so
    // Customize can show it in Finder and remove it.
    const fileOf = (name) => {
      for (const [scope, list] of [['project', dirs.project], ['user', dirs.global]]) {
        for (const dir of list) {
          const file = path.join(dir, `${name}.md`)
          try { if (fs.statSync(file).isFile()) return { scope, path: file } } catch {}
        }
      }
      return null
    }
    return {
      agents: agents.filter((agent) => agent.hidden !== true).map((agent) => {
        const file = typeof agent.name === 'string' && AGENT_NAME.test(agent.name) ? fileOf(agent.name) : null
        return {
          name: agent.name,
          description: typeof agent.description === 'string' ? agent.description : '',
          mode: agent.mode,
          primary: agent.mode !== 'subagent',
          model: agent.model?.providerID && agent.model?.modelID ? `${agent.model.providerID}/${agent.model.modelID}` : null,
          scope: file?.scope ?? (agent.native === true && !Object.hasOwn(own, agent.name) ? 'builtin' : 'user'),
          ...(file ? { path: file.path, removable: true } : {}),
          default: agent.name === fallback,
        }
      }),
      defaultAgent: fallback,
    }
  }

  /** The agents folders a folder's agent reads: the project's (.opencode/agents, .opencode/agent) and the global ones. */
  agentFileDirs(directory) {
    const project = path.join(directory, this.flavor.id === 'mimo' ? '.mimocode' : '.opencode')
    const global = this.pluginGlobalDirs()[0]
    return { project: [path.join(project, 'agents'), path.join(project, 'agent')], global: [path.join(global, 'agents'), path.join(global, 'agent')] }
  }

  /**
   * codeDesktop/agents/write {cwd, scope: 'project'|'user', name, description, mode, model?, prompt, deny?: [permission]}:
   * a new agent file in `opencode agent create`'s format (YAML frontmatter description / mode / model / permission:
   * <key>: deny for each permission left out, then the prompt). Never over an existing file. The folder's instance is
   * reloaded so the agent list has it.
   */
  async agentWrite(params = {}) {
    if (params.scope !== 'user' && !(typeof params.cwd === 'string' && path.isAbsolute(params.cwd))) throw new RpcError(INVALID_PARAMS, 'Open a project first to add an agent to it.')
    const directory = this.directoryFor(params)
    const name = typeof params.name === 'string' ? params.name.trim() : ''
    if (!AGENT_NAME.test(name)) throw new RpcError(INVALID_PARAMS, 'Use lowercase letters, digits and dashes for the agent name.')
    const description = typeof params.description === 'string' ? params.description.trim().replace(/\s+/g, ' ') : ''
    if (!description || description.length > 1000) throw new RpcError(INVALID_PARAMS, 'Describe when to use this agent.')
    const mode = ['subagent', 'primary', 'all'].includes(params.mode) ? params.mode : 'subagent'
    const model = typeof params.model === 'string' && params.model.trim() ? params.model.trim() : null
    if (model && !/^[^\s/]+\/\S+$/.test(model)) throw new RpcError(INVALID_PARAMS, 'Write the model as provider/model.')
    const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : ''
    if (!prompt || prompt.length > 100000) throw new RpcError(INVALID_PARAMS, 'Write the agent’s instructions.')
    const deny = (Array.isArray(params.deny) ? params.deny : []).filter((key) => AGENT_PERMISSIONS.includes(key))
    const dir = this.agentFileDirs(directory)[params.scope === 'user' ? 'global' : 'project'][0]
    const file = path.join(dir, `${name}.md`)
    const lines = ['---', `description: ${JSON.stringify(description)}`, `mode: ${mode}`, ...(model ? [`model: ${JSON.stringify(model)}`] : []),
      ...(deny.length ? ['permission:', ...deny.map((key) => `  ${key}: deny`)] : []), '---', '', prompt, '']
    fs.mkdirSync(dir, { recursive: true })
    try { fs.writeFileSync(file, lines.join('\n'), { flag: 'wx' }) }
    catch (error) { if (error?.code === 'EEXIST') throw new RpcError(-32000, `An agent named ${name} already exists there.`); throw error }
    await this.reloadAgents(directory, params.scope === 'user')
    return { path: file }
  }

  /** codeDesktop/agents/remove {cwd, name}: an agent's own file (the one agentsList names), then the agent list reloads. */
  async agentRemove(params = {}) {
    const directory = this.directoryFor(params)
    const name = typeof params.name === 'string' ? params.name.trim() : ''
    if (!AGENT_NAME.test(name)) throw new RpcError(INVALID_PARAMS, 'Unknown agent.')
    const dirs = this.agentFileDirs(directory)
    for (const [global, list] of [[false, dirs.project], [true, dirs.global]]) {
      for (const dir of list) {
        const file = path.join(dir, `${name}.md`)
        try { if (!fs.statSync(file).isFile()) continue } catch { continue }
        fs.unlinkSync(file)
        await this.reloadAgents(directory, global)
        return { path: file }
      }
    }
    throw new RpcError(-32000, 'This agent has no file of its own to remove.')
  }

  /** The agent list after an agent file changed: the folder's instance, or every instance for a global one. */
  async reloadAgents(directory, global) {
    if (!global) { await this.reloadDirectory(directory); return }
    const folders = new Set([directory, ...[...this.threads.values()].map((thread) => thread.cwd).filter(Boolean)])
    for (const folder of folders) await this.reloadDirectory(folder)
  }

  /** OpenCode's `references` for a folder (GET /api/reference), hidden ones left out: [{name, path, description, source}]. */
  async references(directory) {
    if (this.flavor.id !== 'opencode') return []
    // OpenCode loads a location's references on its first request (a local folder resolves, a git one is fetched):
    // that first answer can be empty, so a new folder is asked again a few times before it counts as having none.
    let list = []
    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await this.api('GET', '/api/reference', { directory, query: { 'location[directory]': directory }, timeout: 15000 })
      list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
      if (list.length || this.referencesAsked?.has(directory)) break
      await sleep(300)
    }
    this.referencesAsked ??= new Set()
    this.referencesAsked.add(directory)
    return list.filter((entry) => entry && entry.hidden !== true && typeof entry.name === 'string' && typeof entry.path === 'string' && path.isAbsolute(entry.path))
      .map((entry) => ({ name: entry.name, path: entry.path, description: typeof entry.description === 'string' ? entry.description : null,
        source: entry.source?.type === 'git' ? { type: 'git', repository: typeof entry.source.repository === 'string' ? entry.source.repository : null } : { type: 'local' } }))
  }

  /** The folders the agent writes plan files in: the data folder's plans (a folder without git) and the project's. */
  planDirs(cwd) {
    return [path.join(this.dataDir(), 'plans'), ...(cwd ? [path.join(cwd, `.${this.flavor.dataDir}`, 'plans')] : [])]
  }

  /** Whether the thread's agents never see a skill (MiMo's compose-only skills). */
  hiddenSkill(name, location = '') {
    if ((this.flavor.hiddenSkills ?? []).some((pattern) => wildcardMatch(name, pattern))) return true
    const dir = this.flavor.hiddenSkillDir
    return Boolean(dir && location && path.isAbsolute(location) && location.startsWith(path.join(this.dataDir(), dir) + path.sep))
  }

  /** The user's own permission rules for a folder (global + project config, merged by the agent). */
  async userRules(directory) {
    const config = await this.mergedConfig(directory)
    return configRules(config?.permission, { home: this.homeDir() })
  }

  /** Rewrite the overlay and reload idle agent instances so config-level changes apply. */
  async reloadConfig() {
    this.config.rewriteConfig()
    this.catalog.invalidate()
    const busy = [...this.threads.values(), ...this.children.values()].some((thread) => thread.busy || thread.activeTurn)
    if (busy) { this.pendingReload = true; return false }
    this.pendingReload = false
    try { await this.api('POST', '/global/dispose', {}) } catch (error) { this.log(`dispose failed: ${error?.message}`) }
    this.configReloaded()
    return true
  }

  /** Restart the agent server when nothing runs (threads reload their history on the new stream). */
  async restartServer() {
    const busy = [...this.threads.values(), ...this.children.values()].some((thread) => thread.busy || thread.activeTurn || thread.pending.size)
    if (busy || !this.server) return this.reloadConfig()
    const old = this.server
    this.stopEvents?.()
    this.server = null
    await old.stop()
    this.configReloaded()
    await this.ensureServer()
    this.catalog.invalidate()
    return true
  }

  /**
   * The compaction settings MiMo sizes its working window with (compaction.max_context / reserved), from a folder's
   * merged config; cached per folder for a short while (MiMo's /context-limit edits the config file).
   */
  compactionOf(directory, config) {
    const compaction = isRecord(config?.compaction) ? config.compaction : {}
    const outputMax = Number.parseInt(this.env[`${this.flavor.envPrefix}_EXPERIMENTAL_OUTPUT_TOKEN_MAX`] ?? '', 10)
    const value = {
      maxContext: compaction.max_context ?? this.env[`${this.flavor.envPrefix}_COMPACTION_MAX_CONTEXT`],
      reserved: Number.isFinite(compaction.reserved) ? compaction.reserved : undefined,
      ...(outputMax > 0 ? { outputMax } : {}),
    }
    this.compaction ??= new Map()
    this.compaction.set(directory, { value, at: Date.now() })
    return value
  }

  async loadCompaction(directory) {
    if (!this.flavor.workingWindow) return null
    const cached = this.compaction?.get(directory)
    if (cached && Date.now() - cached.at < 30000) return cached.value
    return this.compactionOf(directory, await this.mergedConfig(directory))
  }

  /** A model's context window as the ring shows it: MiMo's working window (where it compacts), else limit.context. */
  windowFor(entry, directory, compaction = directory ? this.compaction?.get(directory)?.value ?? this.compaction?.get(this.homeDir())?.value : undefined) {
    if (!entry) return null
    if (!this.flavor.workingWindow) return entry.model?.limit?.context ?? null
    return workingWindow(entry, compaction ?? {})
  }

  /** The agent loads its config again: plugin failures and notices are reported afresh. */
  configReloaded() {
    this.pluginErrors?.clear()
    this.noticesSent?.clear()
    this.compaction?.clear()
    this.agentDirCache?.clear()
    this.agentListCache?.clear()
  }

  maybePendingReload() {
    // An env setting changed while a turn ran: the server restarts with it now that nothing runs.
    if (this.pendingRestart) { this.pendingRestart = false; void this.restartServer().then((done) => { if (!done) this.pendingRestart = true }).catch(() => {}); return }
    if (this.pendingReload) void this.reloadConfig()
  }

  // ------------------------------------------------------------------ dispatcher

  async handle(method, params = {}) {
    if (this.closed) throw new RpcError(-32000, 'OpenClaude Desktop core is shutting down.')
    params = params ?? {}
    switch (method) {
      case 'initialize': {
        let version = this.reportedVersion
        let error = null
        try { await this.ensureServer(); version = this.server.version ?? version } catch (failure) { error = failure }
        if (error) throw error instanceof RpcError ? error : new RpcError(-32000, error?.message || String(error))
        this.clientReady = true
        this.clientName = typeof params.clientInfo?.name === 'string' ? params.clientInfo.name : null
        return {
          userAgent: `code-desktop-${this.flavor.id}-core/${BRIDGE_VERSION} (${this.flavor.id} ${version}; ${process.platform})`,
          codexHome: this.stateDir,
          platformFamily: process.platform === 'win32' ? 'windows' : 'unix',
          platformOs: process.platform === 'darwin' ? 'macos' : process.platform,
          engine: this.flavor.engine,
          engineVersion: version,
          capabilities: capabilitiesFor(this.flavor),
          configPath: this.config.configPath,
        }
      }
      case 'initialized': return {}
      case 'model/list': {
        const config = await this.mergedConfig(this.homeDir())
        const compaction = this.compactionOf(this.homeDir(), config)
        return { data: await this.catalog.codexModels(config.model, { windowOf: (entry) => this.windowFor(entry, null, compaction) }), nextCursor: null }
      }
      case 'account/read': return this.readAccount()
      case 'account/login/start': return this.loginStart(params)
      case 'codeDesktop/login/code': return this.loginCode(params)
      case 'account/login/cancel': {
        const login = this.logins.get(params.loginId)
        if (!login) return { status: 'notFound' }
        login.controller.abort()
        this.logins.delete(params.loginId)
        return { status: 'canceled' }
      }
      case 'account/logout': {
        // One provider when the client names it; otherwise every credential in the agent's own auth
        // store (what account/read reports as the account: browser sign-ins and saved API keys).
        // Keys from environment variables or config files stay; account/read still lists them.
        const named = typeof params.codeDesktop?.provider === 'string' && params.codeDesktop.provider ? [params.codeDesktop.provider] : null
        const providers = named ?? Object.keys(this.credentialContext().stored)
        if (!providers.length) {
          // Nothing here to remove: say where the credential lives instead of answering as if it were gone.
          const read = await this.readAccount()
          const kept = (read[this.flavor.id]?.providers ?? []).filter((provider) => !provider.removable)
          if (kept.length) throw new RpcError(-32000, signOutElsewhere(this.flavor, kept))
          return {}
        }
        for (const provider of providers) {
          try { await this.api('DELETE', `/auth/${encodeURIComponent(provider)}`, {}) } catch (error) { this.log(`sign out ${provider}: ${error?.message}`) }
        }
        // Provider state is cached per instance: idle instances reload without the credential
        // (MiMo keeps its provider list for the life of the server: it restarts when idle).
        if (this.flavor.id === 'mimo') await this.restartServer()
        else await this.reloadConfig()
        this.notify('account/updated', { authMode: null })
        return {}
      }
      case 'account/rateLimits/read': {
        const empty = { limitId: null, limitName: null, primary: null, secondary: null, credits: null, individualLimit: null, spendControlReached: null, planType: null, rateLimitReachedType: null }
        return { rateLimits: empty, rateLimitsByLimitId: null, rateLimitResetCredits: null, accountId: null, rateLimitUpsell: null }
      }
      case 'account/usage/read': return accountUsage(await this.usageFolds(), localDayKey(Date.now()))
      case 'codeDesktop/stats/read': return codeStats(await this.usageFolds())
      case 'codeDesktop/history/import': return this.importHistory(params)
      case 'configRequirements/read': return { requirements: null }
      case 'config/read': return this.configRead(params)
      case 'config/batchWrite': return this.configBatchWrite(params)
      case 'config/value/write': return this.configBatchWrite({ edits: [{ keyPath: params.keyPath, value: params.value, mergeStrategy: params.mergeStrategy ?? 'replace' }] })
      case 'config/mcpServer/reload': return this.mcpReload()
      case 'mcpServerStatus/list': return this.mcpStatusList(params)
      case 'mcpServer/oauth/login': return this.mcpLogin(params)
      case 'codeDesktop/mcpServer/logout': return this.mcpLogout(params)
      case 'codeDesktop/thread/share': return this.shareThread(params)
      // /cd on OpenCode: its /move (TUI prompt/move.tsx), the same session continued in another folder of its project.
      case 'codeDesktop/thread/move': return this.moveThread(params)
      case 'skills/list': return this.skillsList(params)
      // The @ menu's references (OpenCode `references` config): named repos and folders the agent may use.
      case 'codeDesktop/references/list': {
        const cwd = typeof params?.cwd === 'string' && path.isAbsolute(params.cwd) ? params.cwd : this.directoryFor(params ?? {})
        return { data: await this.references(cwd) }
      }
      case 'skills/config/write': return this.skillsWrite(params)
      case 'plugin/installed': return this.pluginsInstalled(params)
      case 'plugin/read': return this.pluginRead(params)
      case 'codeDesktop/plugin/inspect':
      case 'codeDesktop/plugin/install':
      case 'codeDesktop/plugin/cancelInstall':
      case 'codeDesktop/plugin/setEnabled':
      case 'codeDesktop/plugin/remove':
      case 'codeDesktop/plugin/registries':
        return this.pluginOp(method, params)
      case 'hooks/list': return { data: [] }
      case 'codeDesktop/agents/list': return this.agentsList(params)
      case 'codeDesktop/agents/write': return this.agentWrite(params)
      case 'codeDesktop/agents/remove': return this.agentRemove(params)
      case 'codeDesktop/coreSettings/read': return this.coreSettingsRead()
      case 'codeDesktop/coreSettings/write': return this.coreSettingsWrite(params)
      case 'codeDesktop/tools/list': return this.toolsList(params)
      case 'codeDesktop/systemPrompt/preview': return this.preview(params)
      case 'codeDesktop/sideQuestion': return this.sideQuestion(params)
      case 'codeDesktop/sideQuestion/cancel': {
        const entry = typeof params.requestId === 'string' ? this.sideQuestions.get(params.requestId) : undefined
        entry?.cancel()
        return { cancelled: Boolean(entry) }
      }
      case 'thread/start': {
        const thread = await this.createThread(params)
        const response = thread.sessionResponse()
        this.notify('thread/started', { thread: response.thread })
        return response
      }
      case 'thread/resume': {
        const thread = await this.openThread(params.threadId)
        // A runner resuming a workflow agent's session (warm context) owns it now.
        if (this.clientName === WORKFLOW_CLIENT && this.store.get(thread.id).workflowAgent === true) this.store.update(thread.id, { runnerPid: process.pid })
        await thread.reload()
        await thread.applyParams(params)
        const response = thread.sessionResponse({ includeTurns: params.excludeTurns !== true })
        if (params.initialTurnsPage) response.initialTurnsPage = thread.pageTurns(params.initialTurnsPage)
        response.turnsBackwardsCursor = null
        response.itemsBackwardsCursor = null
        setImmediate(() => { thread.publishStatus(); thread.replay() })
        return response
      }
      case 'thread/read': {
        const thread = await this.historyOf(this.requireId(params.threadId))
        return { thread: thread.threadObject({ includeTurns: params.includeTurns === true }) }
      }
      case 'thread/turns/list': return (await this.historyOf(this.requireId(params.threadId))).pageTurns(params)
      case 'thread/items/list': {
        const thread = await this.historyOf(this.requireId(params.threadId))
        let entries = thread.turns().flatMap((turn) => turn.items.map((item) => ({ turnId: turn.id, item })))
        if (params.turnId) entries = entries.filter((entry) => entry.turnId === params.turnId)
        if (params.sortDirection === 'desc') entries.reverse()
        const start = params.cursor ? Number.parseInt(String(params.cursor), 10) || 0 : 0
        const size = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 200
        return { data: entries.slice(start, start + size), nextCursor: start + size < entries.length ? String(start + size) : null, backwardsCursor: null }
      }
      case 'thread/list': return this.listThreads(params)
      case 'thread/name/set': {
        const id = this.requireId(params.threadId)
        const name = typeof params.name === 'string' ? params.name.trim() : ''
        this.store.update(id, { name: name || undefined })
        if (name && !parseActorThreadId(id)) {
          try {
            // MiMo guards renames with the title revision it last reported.
            const info = this.flavor.id === 'mimo' ? await this.sessionInfo(id) : null
            await this.api('PATCH', `/session/${encodeURIComponent(id)}`, { directory: this.store.get(id).cwd, body: { title: name, ...(Number.isInteger(info?.titleRevision) ? { expectedRevision: info.titleRevision } : {}) } })
          } catch (error) { this.log(`rename ${id}: ${error?.message}`) }
        }
        this.notify('thread/name/updated', { threadId: id, ...(name ? { threadName: name } : {}) })
        return {}
      }
      case 'thread/archive': {
        const id = this.requireId(params.threadId)
        this.store.update(id, { archived: true, unarchivedAt: undefined })
        // Archived in OpenCode too (its own apps hide the session); the local flag stays the fallback.
        if (!parseActorThreadId(id)) {
          try { await this.api('PATCH', `/session/${encodeURIComponent(id)}`, { directory: this.store.get(id).cwd, body: { time: { archived: Date.now() } } }) } catch (error) { this.log(`archive ${id}: ${error?.message}`) }
        }
        const live = this.threads.get(id)
        if (live && !live.mustStayLoaded()) this.unload(id)
        this.notify('thread/archived', { threadId: id })
        return {}
      }
      case 'thread/unarchive': {
        const id = this.requireId(params.threadId)
        const thread = await this.historyOf(id)
        // OpenCode's API can set time.archived but never clear it: the restore is remembered here and
        // outranks every archive OpenCode recorded before it (a later archive in OpenCode wins again).
        this.store.update(id, { archived: undefined, unarchivedAt: Date.now() })
        this.notify('thread/unarchived', { threadId: id })
        return { thread: thread.threadObject() }
      }
      case 'thread/delete': {
        const id = this.requireId(params.threadId)
        const live = this.threads.get(id)
        if (live) { await live.interrupt().catch(() => {}); live.close('Session deleted.'); this.threads.delete(id) }
        const directory = this.store.get(id).cwd
        try { await this.api('DELETE', `/session/${encodeURIComponent(id)}`, { directory }) } catch (error) { if (error?.status !== 404) this.log(`delete ${id}: ${error?.message}`) }
        this.store.update(id, { deleted: true, inputs: undefined, steers: undefined, queue: undefined })
        this.notify('thread/deleted', { threadId: id })
        return {}
      }
      case 'thread/unsubscribe':
      case 'thread/close': {
        const id = this.requireId(params.threadId)
        const live = this.threads.get(id)
        const loaded = Boolean(live)
        if (live && !live.mustStayLoaded()) this.unload(id)
        return method === 'thread/unsubscribe' ? { status: loaded ? 'unsubscribed' : 'notLoaded' } : {}
      }
      case 'thread/fork': return this.fork(params)
      case 'thread/revert': return this.revert(params)
      case 'thread/rollback': throw new RpcError(METHOD_NOT_FOUND, 'Use thread/revert (rewind) on this core.')
      case 'thread/compact/start': {
        const thread = await this.openThread(params.threadId)
        if (thread.busy || thread.activeTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before compacting.', { codexErrorInfo: 'activeTurnNotSteerable' })
        const model = splitModel(thread.model ?? await this.catalog.defaultId())
        if (!model) throw new RpcError(-32000, 'No model is available to compact with.')
        thread.expect.push({ kind: 'compaction' })
        void this.api('POST', `/session/${encodeURIComponent(thread.id)}/summarize`, { directory: thread.cwd, body: { providerID: model.providerID, modelID: model.modelID, auto: false }, timeout: 15 * 60000 })
          .catch((error) => thread.failExpectation('compaction', error))
        return {}
      }
      case 'turn/start': return (await this.openThread(params.threadId)).startTurn(params)
      case 'turn/steer': return (await this.openThread(params.threadId)).steer(params)
      // A model-started workflow's Stop (MiMo). MiMo cancels one run only from its own workflow tool (operation
      // 'cancel'; no HTTP route): a foreground run blocks its turn, and stopping the turn aborts the run's agents
      // (session abort cancels every actor of the session). So the whole turn stops (run.stopScope 'turn'). A run that
      // goes on after its call (async, resumed: stopScope 'run') is cancelled by the model's own tool call.
      case 'codeDesktop/workflow/stop': {
        const id = this.requireId(params.threadId)
        if (typeof params.runId !== 'string' || !params.runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
        const thread = this.threads.get(id) ?? this.children.get(id)
        if (!thread) return { status: 'alreadyFinished' }
        const run = thread.workflowRunOf(params.runId)
        if (!run) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
        if (run.status !== 'running') return { status: 'alreadyFinished' }
        if (run.stopScope === 'run' && run.runId) return thread.cancelWorkflowRun(run)
        if (!(thread.busy || thread.activeTurn)) return { status: 'alreadyFinished' }
        await thread.interrupt()
        return { status: 'stopping', scope: 'turn' }
      }
      // A failed or stopped MiMo run goes on from its journal (run.resumable; LiveThread.resumeWorkflow).
      case 'codeDesktop/workflow/resume': {
        const id = this.requireId(params.threadId)
        const thread = this.threads.get(id) ?? this.children.get(id) ?? await this.openThread(id)
        if (typeof thread?.resumeWorkflow !== 'function') throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
        return thread.resumeWorkflow(params.runId)
      }
      case 'turn/interrupt': {
        const id = this.requireId(params.threadId)
        const thread = this.threads.get(id) ?? this.children.get(id)
        // A MiMo actor can't be stopped on its own: aborting its session would stop every sub-agent and the main turn
        // while the app showed only this one stopped. Stopping the main turn stops them all.
        if (thread?.actor || (!thread && parseActorThreadId(id))) throw new RpcError(-32600, 'MiMo can’t stop one sub-agent on its own. Stop the main turn to stop all of its sub-agents.')
        if (thread) await thread.interrupt()
        else await this.api('POST', `/session/${encodeURIComponent(id)}/abort`, { directory: this.store.get(id).cwd }).catch(() => {})
        return {}
      }
      case 'review/start': return (await this.openThread(params.threadId)).review(params)
      case 'thread/queue/add': return (await this.openThread(params.threadId)).queueAdd(params)
      case 'thread/queue/list': {
        const live = this.threads.get(this.requireId(params.threadId))
        return live ? live.queueList() : { data: (this.store.get(params.threadId).queue ?? []).map(({ id, input, clientUserMessageId }) => ({ id, input, clientUserMessageId: clientUserMessageId ?? null })), nextCursor: null }
      }
      case 'thread/queue/delete': return (await this.openThread(params.threadId)).queueDelete(params.queuedSubmissionId)
      case 'thread/queue/update': return (await this.openThread(params.threadId)).queueUpdate(params.queuedSubmissionId, params.input)
      case 'thread/queue/reorder': return (await this.openThread(params.threadId)).queueReorder(params.queuedSubmissionIds)
      case 'thread/queue/start': return (await this.openThread(params.threadId)).queueStart(params.queuedSubmissionId)
      case 'thread/backgroundTerminals/list': return { data: [], nextCursor: null }
      case 'codeDesktop/thread/permissions': {
        const live = this.threads.get(this.requireId(params.threadId))
        if (!live) return { applied: false }
        await live.applyParams(params)
        return { applied: true, mode: live.permission.mode }
      }
      case 'codeDesktop/diagnostics': return {
        flavor: this.flavor.id, binary: this.binary, version: this.agentVersion(), server: this.server?.url ?? null,
        liveThreads: this.threads.size, children: this.children.size, configDir: this.config.configDir, stateDir: this.stateDir, pendingReload: Boolean(this.pendingReload),
        busy: [...this.threads.values(), ...this.children.values()].filter((thread) => thread.busy || thread.activeTurn).map((thread) => ({ id: thread.id, busy: thread.busy, turn: thread.activeTurn?.id ?? null })),
      }
      default:
        throw new RpcError(METHOD_NOT_FOUND, `${method} is not supported by the ${this.flavor.name} core.`)
    }
  }

  requireId(value) {
    if (typeof value !== 'string' || !value) throw new RpcError(INVALID_PARAMS, 'threadId is required')
    return value
  }

  unload(id) {
    const live = this.threads.get(id)
    if (!live) return
    this.threads.delete(id)
    for (const [childId, child] of this.children) if (child.root === live) this.children.delete(childId)
    live.close('Session closed.')
  }

  // ------------------------------------------------------------------ account

  async readAccount() {
    let providers = null
    // A failed GET /provider (the server still starting, a config error) says nothing about the sign-in: the
    // answer then rests on the auth store alone and marks the rest unknown, rather than reporting signed out.
    for (let attempt = 0; attempt < 2 && !providers; attempt++) {
      if (attempt) await sleep(500)
      try { providers = await this.api('GET', '/provider', { directory: this.homeDir() }) } catch (error) { if (attempt) this.log(`account: provider list failed: ${error?.message || error}`) }
    }
    const context = this.credentialContext()
    const login = this.flavor.login
    if (!providers || typeof providers !== 'object') return this.unknownAccount(context)
    this.accountRetry = null
    const connected = Array.isArray(providers.connected) ? providers.connected : []
    const all = Array.isArray(providers.all) ? providers.all : []
    const live = all.filter((provider) => connected.includes(provider.id))
    // Only a provider holding a credential is an account. A free tier (OpenCode Zen, MiMo Auto)
    // and a provider the agent's config lists without a key are not: account stays null, so
    // Settings and setup offer the sign-in, while the free models still work.
    const signed = live.map((provider) => ({ provider, auth: credentialOf(provider, context) })).filter((entry) => entry.auth)
    const free = live.find((provider) => context.free.includes(provider.id) && !context.ended.includes(provider.id) && !credentialOf(provider, context)) ?? null
    const signedIn = signed.some((entry) => entry.provider.id === login.provider)
    const listed = signed.map(({ provider, auth }) => ({ id: provider.id, name: provider.name ?? provider.id, auth, removable: Object.hasOwn(context.stored, provider.id) }))
    return {
      account: this.accountOf(listed),
      requiresOpenaiAuth: !signed.length && !free,
      [this.flavor.id]: {
        // auth: oauth | api | wellknown (the agent's auth store; account/logout removes these), env, settings, config, none.
        providers: listed,
        // Whether account/logout can remove anything: env, Settings › Models, config and keyless providers stay.
        canSignOut: listed.some((provider) => provider.removable),
        login: { provider: login.provider, label: login.label, signedIn },
        freeTier: free ? { provider: free.id, name: free.name ?? free.id } : null,
        unknown: false,
      },
    }
  }

  /**
   * The Codex account for the providers holding a credential. A browser (OAuth) sign-in reads as signed in
   * ('chatgpt', Codex's browser account) and names what it signed in to in planType: the flavor's own sign-in
   * by its label (ChatGPT Pro/Plus, Xiaomi MiMo), any other by the provider (GitHub Copilot …), so no reader
   * mistakes another vendor's sign-in for ChatGPT. Everything else holds a key.
   */
  accountOf(listed) {
    if (!listed.length) return null
    const oauth = listed.filter((provider) => provider.auth === 'oauth')
    if (!oauth.length) return { type: 'apiKey' }
    const names = [...new Set(oauth.map((provider) => (provider.id === this.flavor.login.provider ? this.flavor.login.label : provider.name)))]
    return { type: 'chatgpt', email: null, planType: names.join(', ') }
  }

  /**
   * account/read while GET /provider fails: what the auth store holds is still known (it is the agent's own file),
   * the rest is not, so requiresOpenaiAuth stays false. account/updated follows once the provider list answers.
   */
  unknownAccount(context) {
    const login = this.flavor.login
    const listed = Object.entries(context.stored).map(([id, auth]) => ({ id, name: id === login.provider ? login.label : id, auth, removable: true }))
    if (!this.accountRetry) {
      const retry = this.accountRetry = {}
      void (async () => {
        for (let attempt = 0; attempt < 10 && !this.closed && this.accountRetry === retry; attempt++) {
          // Unref'd: a pending re-check never keeps the bridge process alive.
          await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 15000)).unref?.())
          if (this.closed || this.accountRetry !== retry) return
          try {
            await this.api('GET', '/provider', { directory: this.homeDir() })
            if (this.accountRetry === retry) { this.accountRetry = null; this.notify('account/updated', { authMode: null }) }
            return
          } catch {}
        }
        if (this.accountRetry === retry) this.accountRetry = null
      })()
    }
    return {
      account: this.accountOf(listed),
      requiresOpenaiAuth: false,
      [this.flavor.id]: {
        providers: listed,
        canSignOut: listed.length > 0,
        login: { provider: login.provider, label: login.label, signedIn: Object.hasOwn(context.stored, login.provider) },
        freeTier: null,
        unknown: true,
      },
    }
  }

  async loginStart(params) {
    // An API key for one of the agent's providers (core descriptor login.apiKey: template = provider id).
    if (params.type === 'apiKey') {
      const provider = typeof params.codeDesktop?.template === 'string' && params.codeDesktop.template ? params.codeDesktop.template : null
      const key = typeof params.apiKey === 'string' ? params.apiKey.trim() : ''
      if (!provider || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(provider)) throw new RpcError(INVALID_PARAMS, 'Choose which provider the key is for.')
      if (!key) throw new RpcError(INVALID_PARAMS, 'Enter a valid API key.')
      await this.api('PUT', `/auth/${encodeURIComponent(provider)}`, { directory: this.homeDir(), body: { type: 'api', key } })
      await this.reloadConfig()
      this.notify('account/updated', { authMode: null })
      return { type: 'apiKey' }
    }
    if (params.type !== 'chatgpt' && params.type !== 'chatgptDeviceCode') throw new RpcError(INVALID_PARAMS, `${this.flavor.name} signs in with a provider's browser sign-in or an API key.`)
    const headless = params.type === 'chatgptDeviceCode'
    const providerId = typeof params.codeDesktop?.provider === 'string' && params.codeDesktop.provider ? params.codeDesktop.provider : this.flavor.login.provider
    // The provider's OAuth methods (GET /provider/auth): a browser one, or a headless (device) one.
    let methods = []
    try { methods = (await this.api('GET', '/provider/auth', { directory: this.homeDir() }))?.[providerId] ?? [] } catch {}
    // codeDesktop.inputs: answers to the method's prompts (POST …/oauth/authorize `inputs`, provider/auth.ts), e.g.
    // GitHub Copilot's deploymentType / enterpriseUrl. A select the user didn't answer keeps the method's own default
    // (Copilot: github.com); a method with an unanswered unconditional text prompt can't start here.
    const inputs = loginInputs(params.codeDesktop?.inputs)
    const answerable = (prompt) => prompt.when || prompt.type === 'select' || Object.hasOwn(inputs, prompt.key)
    const indexed = methods.map((entry, index) => ({ ...entry, index })).filter((entry) => entry.type === 'oauth' && (entry.prompts ?? []).every(answerable))
    // A headless sign-in: the method named so, else the provider's only OAuth method when that one is a device-code flow
    // (GitHub Copilot, OpenCode's SuperGrok: its page waits for a code the app shows).
    const chosen = indexed.find((entry) => headless === /headless|device/i.test(entry.label ?? '')) ?? (headless ? (indexed.length === 1 ? indexed[0] : null) : indexed[0])
    if (!chosen) throw new RpcError(INVALID_PARAMS, headless ? `${providerId} has no device-code sign-in; use the browser sign-in.` : `${providerId} has no browser sign-in in ${this.flavor.name}.`)
    const method = chosen.index
    const login = { provider: providerId, label: chosen.label }
    const auth = await this.api('POST', `/provider/${encodeURIComponent(login.provider)}/oauth/authorize`, { directory: this.homeDir(), body: { method, ...(Object.keys(inputs).length ? { inputs } : {}) } })
    const url = auth?.url
    if (typeof url !== 'string' || !/^https:/.test(url)) throw new RpcError(-32000, `${login.label} sign-in did not return a sign-in page.`)
    if (headless && !/code[:\s]+([A-Z0-9-]{4,})/i.test(auth.instructions ?? '')) throw new RpcError(-32000, `${login.label} didn’t return a sign-in code.`)
    const loginId = randomUUID()
    const controller = new AbortController()
    // MiMo's own sign-in (plugin/mimo.ts authorize) opens its localhost-callback page itself and returns the manual
    // page, which ends on a one-time code to paste back (its callback(code)). The app then opens no second tab and
    // offers a code field (codeDesktop/login/code), which completes the same pending sign-in.
    const agentOpens = this.flavor.id === 'mimo' && login.provider === 'xiaomi'
    const entry = { controller, provider: login.provider, method, done: false }
    this.logins.set(loginId, entry)
    void (async () => {
      let success = false, error = null
      try {
        const body = { method, ...(auth.method === 'code' ? {} : {}) }
        const result = await this.api('POST', `/provider/${encodeURIComponent(login.provider)}/oauth/callback`, { directory: this.homeDir(), body, signal: controller.signal, timeout: 15 * 60000 })
        success = result !== false
      } catch (failure) { error = controller.signal.aborted ? 'Sign-in cancelled.' : failure?.message || String(failure) }
      // A pasted code already finished it (codeDesktop/login/code): this wait ends on its own later.
      if (entry.done) return
      entry.done = true
      this.logins.delete(loginId)
      this.catalog.invalidate()
      this.notify('account/login/completed', { loginId, success, error })
      if (success) this.notify('account/updated', { authMode: null })
    })()
    if (headless) {
      const code = /code[:\s]+([A-Z0-9-]{4,})/i.exec(auth.instructions ?? '')?.[1] ?? null
      return { type: 'chatgptDeviceCode', loginId, verificationUrl: url, userCode: code }
    }
    return { type: 'chatgpt', loginId, authUrl: url, ...(agentOpens ? { codeDesktop: { openedByAgent: true, acceptsCode: true } } : {}) }
  }

  /**
   * codeDesktop/login/code {loginId, code}: the one-time code the provider's page shows (MiMo's manual sign-in), sent
   * to the pending sign-in's callback. Success completes the sign-in; a rejected code leaves it waiting.
   */
  async loginCode(params) {
    const entry = this.logins.get(params?.loginId)
    if (!entry || entry.done) throw new RpcError(INVALID_PARAMS, 'This sign-in has already finished. Start it again.')
    const code = typeof params.code === 'string' ? params.code.trim() : ''
    if (!code || code.length > 8192 || /\s/.test(code)) throw new RpcError(INVALID_PARAMS, 'Paste the whole code from the browser.')
    try {
      await this.api('POST', `/provider/${encodeURIComponent(entry.provider)}/oauth/callback`, { directory: this.homeDir(), body: { method: entry.method, code }, timeout: 60000 })
    } catch (failure) {
      throw new RpcError(-32000, 'That code didn’t work. Copy it again from the browser page and paste it here.', { codexErrorInfo: 'loginCodeRejected', detail: String(failure?.message ?? failure).slice(0, 300) })
    }
    if (entry.done) return { status: 'completed' }
    entry.done = true
    entry.controller.abort()
    this.logins.delete(params.loginId)
    this.catalog.invalidate()
    this.notify('account/login/completed', { loginId: params.loginId, success: true, error: null })
    this.notify('account/updated', { authMode: null })
    return { status: 'completed' }
  }

  // ------------------------------------------------------------------ usage

  /**
   * MiMo: the messages of a session's other slices (its actors': agent_id other than main), from GET
   * /session/:id/message?agent_id=* ([] when none, or when this MiMo can't list them).
   */
  async otherSlices(sessionID, directory) {
    const query = messageSliceQuery(this.flavor)
    if (!query) return []
    try {
      const all = await this.api('GET', `/session/${encodeURIComponent(sessionID)}/message`, { directory, query })
      return (Array.isArray(all) ? all : []).filter((entry) => entry?.info?.id && typeof entry.info.agentID === 'string' && entry.info.agentID && entry.info.agentID !== 'main')
    } catch { return [] }
  }

  async usageFolds() {
    const sessions = await this.listSessions({})
    const ids = new Set()
    const folds = []
    for (const info of sessions) {
      if (!info?.id || this.store.get(info.id).hidden) continue
      ids.add(info.id)
      const updated = info.time?.updated ?? 0
      let fold = this.usageCache.get(info.id, updated)
      if (!fold) {
        try {
          // MiMo: every slice of the session, since its actors (background sub-agents, its own workflow engine's agents)
          // spend inside the parent session and the default listing is the main agent's alone.
          const [messages, slices] = await Promise.all([
            this.api('GET', `/session/${encodeURIComponent(info.id)}/message`, { directory: info.directory }),
            this.flavor.id === 'mimo' ? this.otherSlices(info.id, info.directory) : [],
          ])
          fold = foldSession([...(messages ?? []), ...withoutIds(slices, messages)], { subagent: Boolean(info.parentID) })
          this.usageCache.set(info.id, updated, fold)
        } catch { continue }
      }
      folds.push(fold)
    }
    this.usageCache.prune(ids)
    return folds
  }

  // ------------------------------------------------------------------ config / MCP

  async configRead(params) {
    const directory = this.directoryFor(params)
    const merged = await this.mergedConfig(directory)
    const mcp = {}
    const own = this.config.readMcp()
    for (const [name, value] of await this.mcpServers(directory)) {
      if (value.enabled === false && own.disabled.includes(name)) continue
      const entry = toCodexMcp(value)
      if (entry) mcp[name] = { ...entry, ...(own.servers[name] ? {} : { source: this.flavor.id }) }
    }
    const thread = [...this.threads.values()].filter((candidate) => candidate.cwd === directory).sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))[0]
    const permission = thread?.permission ?? defaultPermission()
    return {
      config: { model: merged.model ?? null, sandbox_mode: permission.sandbox, approval_policy: permission.approvalPolicy, mcp_servers: mcp },
      origins: Object.fromEntries(Object.keys(mcp).map((name) => [`mcp_servers.${name}`, { name: own.servers[name] ? { type: 'user', file: this.config.configPath } : { type: 'user', file: null }, version: '1' }])),
      layers: null,
    }
  }

  async configBatchWrite(params) {
    const edits = Array.isArray(params.edits) ? params.edits : []
    const mcp = this.config.readMcp()
    const touched = []
    let toggled = null
    for (const edit of edits) {
      // mcp_servers.<name>.enabled: a connector turned off or back on (Customize › Connectors and the composer's
      // switches), the app's own or one from the user's OpenCode config (its disabled list keeps the config untouched).
      // mcp_servers.<name>.sampling (MiMo): whether a connector may ask MiMo to run model calls (ask / allow / deny), kept
      // in the overlay for any connector; null goes back to MiMo's default (ask).
      const sampling = /^mcp_servers\.(?:"((?:[^"\\]|\\.)+)"|([^.]+))\.sampling$/.exec(String(edit?.keyPath ?? ''))
      if (sampling) {
        if (this.flavor.id !== 'mimo') throw invalidParams(`${this.flavor.name} has no connector model requests.`)
        const name = (sampling[1] ?? sampling[2]).replace(/\\(.)/g, '$1')
        if (edit.value !== null && !['ask', 'allow', 'deny'].includes(edit.value)) throw invalidParams('Choose ask, allow or deny.')
        mcp.sampling = { ...(mcp.sampling ?? {}) }
        if (edit.value === null) delete mcp.sampling[name]; else mcp.sampling[name] = edit.value
        touched.push(name)
        continue
      }
      const toggle = /^mcp_servers\.(?:"((?:[^"\\]|\\.)+)"|([^.]+))\.enabled$/.exec(String(edit?.keyPath ?? ''))
      if (toggle) {
        const name = (toggle[1] ?? toggle[2]).replace(/\\(.)/g, '$1')
        const on = edit.value !== false
        mcp.disabled = on ? mcp.disabled.filter((other) => other !== name) : [...new Set([...mcp.disabled, name])]
        if (mcp.servers[name]) mcp.servers[name] = { ...mcp.servers[name], enabled: on }
        ;(toggled ??= new Map()).set(name, on)
        continue
      }
      const match = /^mcp_servers\.(.+)$/.exec(String(edit?.keyPath ?? ''))
      if (!match) throw invalidParams(`Only mcp_servers.<name> can be written on the ${this.flavor.name} core.`)
      const name = match[1]
      if (edit.value === null) {
        if (mcp.servers[name]) { delete mcp.servers[name]; (this.removedMcp ??= new Set()).add(name) }
        else if (!mcp.disabled.includes(name)) mcp.disabled.push(name)
      } else {
        const base = edit.mergeStrategy === 'upsert' && mcp.servers[name] ? toCodexMcp(mcp.servers[name]) : {}
        const entry = toOpencodeMcp({ ...base, ...edit.value })
        if (!entry) throw invalidParams(`mcp_servers.${name} needs a command or a url.`)
        mcp.servers[name] = entry
        this.removedMcp?.delete(name)
        mcp.disabled = mcp.disabled.filter((other) => other !== name)
      }
      touched.push(name)
    }
    this.config.writeMcp(mcp)
    this.config.rewriteConfig()
    // Live: every loaded folder's instance adds or drops the servers now (OpenCode's /mcp), and idle
    // instances reload the config (MiMo only reports servers from its config).
    for (const name of touched) {
      this.mcpTools.invalidate(name)
      if (this.flavor.id === 'mimo') continue
      for (const directory of this.loadedDirectories()) {
        try {
          if (mcp.servers[name]) await this.api('POST', '/mcp', { directory, body: { name, config: mcp.servers[name] }, timeout: 60000 })
          else await this.api('POST', `/mcp/${encodeURIComponent(name)}/disconnect`, { directory })
        } catch (error) { this.log(`mcp ${name} in ${directory}: ${error?.message}`) }
      }
    }
    // A connector turned on or off: connected or disconnected now in every loaded folder (OpenCode's /mcp/:name/*).
    for (const [name, on] of toggled ?? []) {
      this.mcpTools.invalidate(name)
      if (this.flavor.id === 'mimo') continue
      for (const directory of this.loadedDirectories()) {
        try { await this.api('POST', `/mcp/${encodeURIComponent(name)}/${on ? 'connect' : 'disconnect'}`, { directory, timeout: 60000 }) }
        catch (error) { this.log(`mcp ${name} ${on ? 'connect' : 'disconnect'} in ${directory}: ${error?.message}`) }
      }
    }
    await this.reloadConfig()
    await this.refreshMcpNames()
    return { status: 'ok', version: String(Date.now()), filePath: this.config.configPath, overriddenMetadata: null }
  }

  async mcpReload() {
    this.mcpTools.invalidate()
    for (const directory of this.loadedDirectories()) {
      for (const [name, value] of await this.mcpServers(directory)) {
        if (value.enabled === false) continue
        try {
          await this.api('POST', `/mcp/${encodeURIComponent(name)}/disconnect`, { directory }).catch(() => {})
          await this.api('POST', `/mcp/${encodeURIComponent(name)}/connect`, { directory, timeout: 60000 })
        } catch (error) { this.log(`mcp reload ${name}: ${error?.message}`) }
      }
    }
    await this.refreshMcpNames()
    return {}
  }

  async mcpStatusList(params) {
    const directory = this.directoryFor(params)
    const [servers, statuses] = await Promise.all([this.mcpServers(directory), this.api('GET', '/mcp', { directory }).catch(() => ({}))])
    this.rememberMcpNames(directory, servers.map(([name]) => name))
    const data = await Promise.all(servers.map(async ([name, config]) => {
      const status = statuses?.[name]?.status ?? (config.enabled === false ? 'disabled' : null)
      // needs_client_registration: the server refuses dynamic client registration, so Sign in can't work until the
      // connector names a pre-registered OAuth client (mcp oauth.clientId): a failure of its own, not a sign-in.
      const clientRequired = status === 'needs_client_registration'
      const runtimeStatus = status === 'connected' ? 'connected' : status === 'failed' || clientRequired ? 'failed' : status === 'disabled' ? 'disabled' : status === 'needs_auth' ? 'authenticationRequired' : status ? 'starting' : null
      const tools = params.detail === 'statusOnly' ? [] : await this.mcpTools.tools(name, config)
      return {
        name, runtimeStatus, pluginId: null, serverInfo: null,
        tools: Object.fromEntries(tools.map((tool) => [tool.name, { name: tool.name, description: tool.description, inputSchema: { type: 'object' } }])),
        toolsError: statuses?.[name]?.error ?? null, resources: [], resourceTemplates: [],
        authStatus: config.type === 'remote' ? (status === 'needs_auth' ? 'notLoggedIn' : config.headers ? 'bearerToken' : status === 'connected' ? 'oAuth' : 'unknown') : 'unsupported',
        // MiMo: whether this connector may ask for model calls (mcp.<name>.sampling; MiMo's default is ask).
        ...(clientRequired || this.flavor.id === 'mimo' ? { codeDesktop: { ...(clientRequired ? { oauthClientRequired: true } : {}),
          ...(this.flavor.id === 'mimo' ? { sampling: ['ask', 'allow', 'deny'].includes(config.sampling) ? config.sampling : 'ask' } : {}) } } : {}),
      }
    }))
    return { data, nextCursor: null }
  }

  /**
   * An MCP server's OAuth sign-in (oauth-callback.js): the bridge takes the browser redirect on the
   * agent's callback address, then completes it with POST /mcp/:name/auth/callback.
   */
  // Sign out of a connector: OpenCode drops its stored sign-in (DELETE /mcp/:name/auth, the backend of
  // `opencode mcp logout`), and every loaded folder disconnects the server so the old token stops being used.
  /**
   * codeDesktop/thread/share {threadId, enabled}: publish the session to OpenCode's share page, as its /share does, or
   * take it down (/unshare). Returns the link (null once unshared).
   */
  async shareThread(params) {
    if (this.flavor.id !== 'opencode') throw new RpcError(METHOD_NOT_FOUND, `${this.flavor.name} has no share links.`)
    const id = typeof params?.threadId === 'string' ? params.threadId : ''
    if (!id) throw invalidParams('threadId is required')
    const live = this.threads.get(id) ?? this.children.get(id)
    const directory = live?.cwd ?? this.store.get(id)?.cwd ?? this.homeDir()
    const info = await this.api(params.enabled === false ? 'DELETE' : 'POST', `/session/${encodeURIComponent(id)}/share`, { directory })
    if (live && info && typeof info === 'object' && info.id === id) live.info = info
    const shareUrl = params.enabled === false ? null : (typeof info?.share?.url === 'string' ? info.share.url : null)
    if (params.enabled !== false && !shareUrl) throw new RpcError(-32000, 'OpenCode didn’t return a share link. Try again.')
    return { threadId: id, shareUrl }
  }

  /**
   * OpenCode's "Move session" (/move): the session continues in another folder of the same project (a worktree, another
   * checkout), POST /experimental/control-plane/move-session, with the user's uncommitted changes carried along when
   * moveChanges is true. check: true only reports how many files have changes there ({changes}), for the app's choice.
   * Afterwards the model is told the folder changed, as the TUI does (a noReply synthetic reminder).
   */
  async moveThread(params) {
    if (this.flavor.id !== 'opencode') throw new RpcError(METHOD_NOT_FOUND, `${this.flavor.name} can’t move a session to another folder.`)
    const id = this.requireId(params?.threadId)
    if (parseActorThreadId(id) || this.children.has(id)) throw invalidParams('A sub-agent’s session can’t be moved.')
    const live = this.threads.get(id)
    const from = live?.cwd ?? this.store.get(id)?.cwd
    if (typeof from !== 'string' || !from) throw invalidParams('Unknown session.')
    if (params?.check === true) {
      let status = []
      try { status = await this.api('GET', '/vcs/status', { directory: from }) } catch { status = [] }
      return { changes: Array.isArray(status) ? status.length : 0 }
    }
    // /cd <path>: absolute, ~/…, or relative to the session's folder.
    const asked = typeof params?.cwd === 'string' ? params.cwd.trim() : ''
    if (!asked || asked.includes('\0')) throw invalidParams('Name a folder.')
    const wanted = asked === '~' ? os.homedir() : asked.startsWith('~/') ? path.join(os.homedir(), asked.slice(2)) : path.resolve(from, asked)
    let destination
    try { destination = fs.realpathSync(wanted) } catch { throw invalidParams(`${asked} doesn’t exist.`) }
    if (!fs.statSync(destination).isDirectory()) throw invalidParams(`${asked} isn’t a folder.`)
    let current = from
    try { current = fs.realpathSync(from) } catch {}
    if (destination === current) return { thread: (live ?? await this.openThread(id)).threadObject(), moved: false }
    if (live && (live.activeTurn || live.busy)) throw new RpcError(-32600, 'Wait for the current turn to finish before moving the session.')
    try {
      await this.api('POST', '/experimental/control-plane/move-session', { directory: from, body: { sessionID: id, destination: { directory: destination }, moveChanges: params.moveChanges === true } })
    } catch (error) {
      const text = String(error?.message ?? error)
      if (/another project/i.test(text)) throw new RpcError(-32600, 'That folder belongs to another project. OpenCode can move a session only to another folder of the same project, such as a worktree.')
      if (/apply your changes/i.test(text)) throw new RpcError(-32600, 'OpenCode couldn’t apply your changes in that folder: they may conflict with changes already there. Move without them, or clean up that folder first.')
      throw error
    }
    await this.api('POST', `/session/${encodeURIComponent(id)}/prompt_async`, { directory: destination, body: { noReply: true, parts: [{ type: 'text', synthetic: true, text: `<system-reminder>The user has changed the current working directory to "${destination}". This is still the same project but at a possibly new location; take this into account when working with any files from now on.</system-reminder>` }] } })
      .catch((error) => this.log(`move reminder ${id}: ${error?.message}`))
    this.store.update(id, { cwd: destination })
    // The live session reopens in its new folder (its events, tools and permissions follow the directory).
    if (live) this.unload(id)
    const thread = await this.openThread(id)
    return { thread: thread.threadObject(), moved: true }
  }

  async mcpLogout(params) {
    const directory = this.directoryFor(params)
    const name = String(params.name ?? '')
    if (!name) throw invalidParams('name is required')
    await this.api('DELETE', `/mcp/${encodeURIComponent(name)}/auth`, { directory })
    for (const folder of this.loadedDirectories())
      await this.api('POST', `/mcp/${encodeURIComponent(name)}/disconnect`, { directory: folder }).catch((error) => this.log(`mcp logout ${name} in ${folder}: ${error?.message}`))
    this.mcpTools.invalidate(name)
    await this.refreshMcpNames().catch(() => {})
    return {}
  }

  async mcpLogin(params) {
    const directory = this.directoryFor(params)
    const name = String(params.name ?? '')
    const config = new Map(await this.mcpServers(directory)).get(name)
    if (!config) throw new RpcError(INVALID_PARAMS, `There is no connector named ${name}.`)
    const callback = callbackOf(config)
    try { await this.oauthCallbacks.listen(callback) } catch (error) {
      if (error?.code === 'EADDRINUSE') throw new RpcError(-32000, `Another program is using port ${callback.port}, where ${name}'s sign-in returns. Close it (for example another ${this.flavor.name} window) and try again.`)
      throw new RpcError(-32000, `Couldn't wait for ${name}'s sign-in: ${error?.message || error}`)
    }
    let result
    try { result = await this.api('POST', `/mcp/${encodeURIComponent(name)}/auth`, { directory, body: {} }) } catch (error) {
      this.oauthCallbacks.release(callback.port)
      throw error
    }
    const url = result?.authorizationUrl ?? result?.url
    if (url === '') {
      // The stored token still works: the agent connected without a sign-in page.
      this.oauthCallbacks.release(callback.port)
      this.mcpTools.invalidate(name)
      this.notify('mcpServer/oauthLogin/completed', { name, success: true, error: null })
      throw new RpcError(-32000, `${name} is already signed in.`)
    }
    if (typeof url !== 'string' || !/^https?:/.test(url)) {
      this.oauthCallbacks.release(callback.port)
      throw new RpcError(-32000, `${name} did not offer an OAuth sign-in.`)
    }
    this.oauthCallbacks.expect({
      port: callback.port, path: callback.path, name,
      state: typeof result.oauthState === 'string' && result.oauthState ? result.oauthState : null,
      complete: async (code) => {
        const status = await this.api('POST', `/mcp/${encodeURIComponent(name)}/auth/callback`, { directory, body: { code }, timeout: 120000 })
        return status?.status === 'connected' ? { success: true } : { success: false, error: status?.error || `${name} did not connect after the sign-in (${status?.status ?? 'no status'}).` }
      },
      done: ({ success, error }) => {
        if (success) this.mcpTools.invalidate(name)
        this.notify('mcpServer/oauthLogin/completed', { name, success, error })
      },
    })
    return { authorizationUrl: url }
  }

  // ------------------------------------------------------------------ skills / commands

  /** Reload one folder's agent instance (new skills, commands, config) when nothing runs there. */
  async reloadDirectory(directory) {
    const busy = [...this.threads.values(), ...this.children.values()].some((thread) => thread.cwd === directory && (thread.busy || thread.activeTurn))
    if (busy) return false
    try { await this.api('POST', '/instance/dispose', { directory }) } catch (error) { this.log(`instance dispose ${directory}: ${error?.message}`) }
    return true
  }

  async skillsList(params) {
    const cwds = Array.isArray(params.cwds) && params.cwds.length ? params.cwds : [this.directoryFor(params)]
    if (params.forceReload === true) for (const cwd of cwds) await this.reloadDirectory(cwd)
    const disabled = new Set(this.disabledSkills())
    const data = []
    for (const cwd of cwds) {
      const skills = []
      const errors = []
      try {
        for (const skill of await this.api('GET', '/skill', { directory: cwd })) {
          const location = typeof skill.location === 'string' ? skill.location : ''
          // Compose-only skills: the thread's agents cannot load them, so they are not offered (nor the user's own).
          if (this.hiddenSkill(String(skill.name ?? ''), location)) continue
          const builtIn = !path.isAbsolute(location) || location.includes(`${path.sep}builtin_skills${path.sep}`)
          const file = path.isAbsolute(location) ? location : `builtin:${skill.name}`
          skills.push({
            name: skill.name, description: skill.description ?? '', shortDescription: (skill.description ?? '').split('\n')[0].slice(0, 160),
            interface: { displayName: skill.name, shortDescription: (skill.description ?? '').split('\n')[0].slice(0, 160) },
            path: file, scope: builtIn ? 'system' : location.startsWith(cwd + path.sep) ? 'repo' : 'user', enabled: !disabled.has(skill.name), pluginId: null,
          })
        }
      } catch (error) { errors.push({ path: cwd, message: error?.message || String(error) }) }
      // The agent's own slash commands (init, review, custom commands, MCP prompts): /name runs them. A command the
      // user wrote (a command/<name>.md in a config folder, or opencode.json `command.<name>`) is theirs or the
      // repository's, with its file as the path; an MCP prompt is credited to its connector; only the agent's own
      // built-ins are the core's. Each row carries the prompt template, which the detail shows (customize skill-file).
      try {
        for (const command of await this.api('GET', '/command', { directory: cwd })) {
          // A skill's own command row (source 'skill': /name loads the skill) is the skill row above, or a hidden skill.
          if (!command?.name || command.source === 'skill') continue
          const shadowed = skills.find((skill) => skill.name === command.name && skill.userInvocable !== false)
          // An older agent names no source: the skill row stands for the command of its name.
          if (shadowed && command.source === undefined) continue
          // A real command wins over a skill of its name, as the agent's own /name does (command/index.ts lists skills
          // only under names no command took: MiMo's deep-research command, not its deep-research skill). The skill
          // stays in Customize, for the model to load (its Trigger reads "Auto"), out of the slash list.
          if (shadowed) Object.assign(shadowed, { userInvocable: false, modelInvocable: shadowed.enabled })
          const origin = this.commandOrigin(command, cwd)
          skills.push({
            name: command.name, description: command.description ?? '', shortDescription: (command.description ?? '').slice(0, 160),
            interface: { displayName: command.name, shortDescription: (command.description ?? '').slice(0, 160) },
            path: origin.path, scope: origin.scope, enabled: true, pluginId: null, userInvocable: true, modelInvocable: false, toggleable: false,
            ...(origin.codeDesktop ? { codeDesktop: origin.codeDesktop } : {}),
            ...(commandHint(command.hints) ? { argumentHint: commandHint(command.hints) } : {}),
            // MiMo localizes its built-in commands' descriptions on the client (tui/i18n/slash-command.ts BUILTIN), so the
            // app shows its own translation for this key and falls back to the agent's English text.
            ...(this.flavor.id === 'mimo' && MIMO_BUILTIN_COMMANDS.has(command.name) && command.source !== 'mcp' ? { localizationKey: `mimo.slash.${command.name}` } : {}),
            // A command that runs MiMo's workflow tool (its deep-research command: workflow({operation: 'run', …})) needs
            // the tool, which a thread offers only with Dynamic workflows on MiMo's own engine (rules()).
            ...(this.commandNeedsWorkflowTool(command) ? { requiresWorkflowTool: true } : {}),
          })
        }
      } catch {}
      data.push({ cwd, skills, errors })
    }
    return { data }
  }

  /** Whether a GET /command entry's template calls MiMo's `workflow` tool (MiMo only: OpenCode has no such tool). */
  commandNeedsWorkflowTool(command) {
    return this.flavor.id === 'mimo' && command?.source !== 'mcp' && typeof command?.template === 'string' && /\bworkflow\(\s*\{/.test(command.template)
  }

  async skillsWrite(params) {
    const file = String(params.path ?? '')
    if (file.startsWith('command:') || (file.endsWith('.md') && !file.endsWith('SKILL.md'))) throw invalidParams('Commands cannot be turned off.')
    let name = file.startsWith('builtin:') ? file.slice(8) : path.basename(path.dirname(file))
    try {
      for (const skill of await this.api('GET', '/skill', { directory: this.directoryFor(params) })) if (skill.location === file) name = skill.name
    } catch {}
    if (!name) throw invalidParams('Unknown skill.')
    const disabled = new Set(this.disabledSkills())
    if (params.enabled === false) disabled.add(name)
    else disabled.delete(name)
    this.saveSettings({ disabledSkills: [...disabled] })
    for (const thread of [...this.threads.values(), ...this.children.values()]) await thread.applyRules().catch(() => {})
    await this.reloadConfig()
    this.notify('skills/changed', {})
    return { effectiveEnabled: !disabled.has(name) }
  }

  // ------------------------------------------------------------------ plugins (OpenCode plugin modules)

  pluginSettings() { const value = this.settings().plugins; return { installed: Array.isArray(value?.installed) ? value.installed : [], disabled: Array.isArray(value?.disabled) ? value.disabled : [] } }

  /**
   * The project folders a plugin list covers: the folders asked for (Customize passes its project), else the ones the
   * last list covered (plugin/read names no folder), else the latest session's. The home folder is always read too:
   * it gives the user's global plugins.
   */
  pluginProjects(params = {}) {
    const asked = [...(Array.isArray(params.cwds) ? params.cwds : []), params.cwd].filter((cwd) => typeof cwd === 'string' && path.isAbsolute(cwd))
    if (asked.length) this.pluginCwds = [...new Set(asked)]
    else if (typeof params.threadId === 'string') return [this.directoryFor(params)]
    return this.pluginCwds ?? [this.directoryFor(params)]
  }

  /**
   * Where a GET /command entry comes from (config/command.ts: `{command,commands}/**\/*.md` of every config folder, and
   * the config file's `command` table): {path, scope, codeDesktop}. A project's .opencode (.mimocode) folders win over the
   * global one, as OpenCode merges them; MiMo also reads Claude Code's command folders. The template (bounded) is kept
   * for the detail, with the command's agent / model / subtask options.
   */
  commandOrigin(command, cwd) {
    const name = String(command.name)
    const template = typeof command.template === 'string' ? command.template.slice(0, 65536) : null
    const options = { ...(typeof command.agent === 'string' && command.agent ? { agent: command.agent } : {}), ...(typeof command.model === 'string' && command.model ? { model: command.model } : {}), ...(command.subtask === true ? { subtask: true } : {}) }
    if (command.source === 'mcp') {
      const server = name.includes(':') ? name.slice(0, name.indexOf(':')) : null
      return { path: `command:${name}`, scope: 'user', codeDesktop: { ...(server ? { server } : {}), kind: 'mcpPrompt' } }
    }
    const project = this.flavor.id === 'mimo' ? '.mimocode' : '.opencode'
    const home = this.homeDir()
    const local = []
    let dir = path.resolve(cwd)
    for (let level = 0; level < 12; level++) {
      // The home folder's own config folders are the user's (pluginGlobalDirs), never a project's.
      if (dir === home) break
      local.push(path.join(dir, project))
      if (this.flavor.id === 'mimo') local.push(path.join(dir, '.claude'))
      if (fs.existsSync(path.join(dir, '.git'))) break
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    const global = [...this.pluginGlobalDirs(), ...(this.flavor.id === 'mimo' ? [path.join(home, '.claude')] : [])]
    for (const [dirs, scope] of [[local, 'repo'], [global, 'user']]) for (const base of dirs) for (const folder of ['command', 'commands']) {
      const file = path.join(base, folder, `${name}.md`)
      try { if (fs.statSync(file).isFile()) return { path: file, scope, codeDesktop: { kind: 'command', ...options, ...(template !== null ? { template } : {}) } } } catch {}
    }
    // The agent's own (init, review; MiMo's dream, distill, goal, deep-research) unless the user's config redefines it.
    const builtIn = name === 'init' || name === 'review' || (this.flavor.id === 'mimo' && MIMO_BUILTIN_COMMANDS.has(name))
    if (builtIn && !options.agent && !options.model) return { path: `command:${name}`, scope: 'system', codeDesktop: { kind: 'builtin', ...options, ...(template !== null ? { template } : {}) } }
    return { path: `command:${name}`, scope: 'user', codeDesktop: { kind: 'config', ...options, ...(template !== null ? { template } : {}) } }
  }

  /** The agent's global config folders (Global.Path.config and ~/.<agent>): a plugins folder there is the user's own. */
  pluginGlobalDirs() {
    const home = this.homeDir()
    return [path.join(this.env.XDG_CONFIG_HOME || path.join(home, '.config'), this.flavor.dataDir), path.join(home, `.${this.flavor.dataDir}`)]
  }

  /**
   * Every plugin the agent loads for the home folder and the project folders, tagged with where it comes from.
   * OpenCode merges `plugin` from the global config, each project's config file, and the `{plugin,plugins}/*.{ts,js}`
   * files of every config folder (config/plugin.ts, config.ts), deduped by package name or file URL; GET /config
   * answers that merged list per folder, without its origins, so they are told apart here: a file in a plugins folder
   * is auto-loaded (global or project by its folder), any other entry is listed in a config file (global when the
   * home folder has it too). An entry written as [spec, options] keeps its options (shown, never edited here).
   */
  async pluginsInstalled(params = {}) {
    const own = this.pluginSettings()
    const home = this.homeDir()
    const homeSpecs = new Set()
    const entries = new Map()
    const globalDirs = this.pluginGlobalDirs()
    const folders = [home, ...this.pluginProjects(params).filter((cwd) => cwd !== home)]
    const lists = await Promise.all(folders.map((folder) => this.mergedConfig(folder).then((config) => (Array.isArray(config.plugin) ? config.plugin : []))))
    folders.forEach((folder, index) => {
      for (const entry of lists[index]) {
        const spec = Array.isArray(entry) ? entry[0] : entry
        if (typeof spec !== 'string' || !spec || spec.endsWith(`/${PLUGIN_FILE}`)) continue
        const options = Array.isArray(entry) && isRecord(entry[1]) && Object.keys(entry[1]).length ? entry[1] : null
        if (folder === home) homeSpecs.add(spec)
        if (!entries.has(spec)) entries.set(spec, { spec, options, project: folder === home ? null : folder })
      }
    })
    const plugins = []
    for (const spec of [...new Set([...entries.keys(), ...own.installed, ...own.disabled])]) {
      const mine = own.installed.includes(spec) || own.disabled.includes(spec)
      const entry = entries.get(spec) ?? { spec, options: null, project: null }
      const origin = mine ? { kind: 'codeDesktop' } : this.pluginOrigin(spec, { global: homeSpecs.has(spec), project: entry.project, globalDirs })
      if (origin.kind === 'bridge') continue
      const name = pluginName(spec)
      const about = this.pluginOriginText(origin, spec, entry.options)
      plugins.push({
        id: spec, name, installed: true, enabled: !own.disabled.includes(spec), version: /@([^@/]+)$/.exec(spec)?.[1] ?? null,
        source: { type: spec.startsWith('file:') || spec.startsWith('/') ? 'local' : 'npm' },
        interface: { displayName: name, shortDescription: about.en, developerName: null },
        codeDesktop: {
          title: name, description: about, removable: mine, readOnlyReason: mine ? null : about.readOnly,
          loadError: own.disabled.includes(spec) ? null : this.pluginLoadError(spec), optional: false, held: false, experimental: false, icon: null, components: [],
          origin: origin.kind, ...(origin.folder ? { originPath: origin.folder } : {}), ...(entry.project ? { project: entry.project } : {}), ...(entry.options ? { options: entry.options } : {}),
        },
      })
    }
    return { marketplaces: [{ name: `${this.flavor.name} plugins`, path: this.config.configPath, interface: { displayName: `${this.flavor.name} plugins` }, plugins }] }
  }

  /** Where one merged `plugin` entry comes from: globalConfig | globalFolder | projectConfig | projectFolder | bridge. */
  pluginOrigin(spec, { global, project, globalDirs }) {
    let file = null
    try { file = spec.startsWith('file:') ? fileURLToPath(spec) : path.isAbsolute(spec) ? spec : null } catch {}
    const parent = file ? path.dirname(file) : ''
    // The bridge's own overlay folder: its session plugin, and paths an OpenClaude Desktop entry resolved to (that row is listed
    // from the bridge's settings instead).
    if (file && file.startsWith(`${this.config.configDir}${path.sep}`)) return { kind: 'bridge' }
    if (file && /\.(ts|js)$/.test(file) && /^plugins?$/.test(path.basename(parent))) {
      const folder = path.dirname(parent)
      return { kind: globalDirs.includes(folder) ? 'globalFolder' : 'projectFolder', folder: parent, file }
    }
    return { kind: global || !project ? 'globalConfig' : 'projectConfig', file }
  }

  /** The row's description ({en, zh-CN}, Customize localizes it) and the reason it is managed elsewhere. */
  pluginOriginText(origin, spec, options) {
    const home = this.homeDir()
    const tilde = (value) => (value === home || value.startsWith(`${home}/`) ? `~${value.slice(home.length)}` : value)
    const agent = this.flavor.name
    const shown = origin.file ? tilde(origin.file) : spec
    const [globalDir] = this.pluginGlobalDirs()
    let en
    let zh
    let readOnly
    switch (origin.kind) {
      case 'codeDesktop':
        en = `Added in OpenClaude Desktop: ${spec}`; zh = `在 OpenClaude Desktop 中添加：${spec}`; readOnly = null
        break
      case 'globalFolder':
        en = `Loaded automatically from your ${agent} plugins folder: ${shown}`; zh = `从你的 ${agent} 插件文件夹自动加载：${shown}`
        readOnly = `A file in your ${agent} plugins folder (${tilde(origin.folder)}). Move or delete the file to stop loading it.`
        break
      case 'projectFolder':
        en = `Loaded automatically from this project’s plugins folder: ${shown}`; zh = `从此项目的插件文件夹自动加载：${shown}`
        readOnly = `A file in this project’s plugins folder (${tilde(origin.folder)}). Move or delete the file to stop loading it.`
        break
      case 'projectConfig':
        en = `Listed in this project’s ${agent} config: ${shown}`; zh = `在此项目的 ${agent} 配置中列出：${shown}`
        readOnly = `Listed in this project’s ${this.flavor.configFile}. Edit that file to change it.`
        break
      default:
        en = `Listed in your global ${agent} config (${tilde(globalDir)}): ${shown}`; zh = `在你的全局 ${agent} 配置（${tilde(globalDir)}）中列出：${shown}`
        readOnly = `Listed in your own ${tilde(path.join(globalDir, this.flavor.configFile))}. Edit that file to change it.`
    }
    if (options) {
      const json = JSON.stringify(options)
      const value = json.length > 400 ? `${json.slice(0, 399)}…` : json
      en += `. Options: ${value}`
      zh += `。选项：${value}`
    }
    return { en, 'zh-CN': zh, readOnly }
  }

  /** The failure OpenCode reports for a plugin once a folder loads it (null when none came in time). */
  async pluginVerdict(spec, waitMs = PLUGIN_VERDICT_MS) {
    try { await this.api('GET', '/config', { directory: this.homeDir() }) } catch { return null }
    const until = Date.now() + waitMs
    while (Date.now() < until) {
      const failure = this.pluginLoadError(spec)
      if (failure) return failure
      await sleep(50)
    }
    return this.pluginLoadError(spec)
  }

  /**
   * One plugin's page: the hooks and tools it registers. The agent's API names neither per plugin, so they are read from
   * the plugin's own source (a local file, or the entry file of the package the agent installed in its cache), never
   * run here. A tool is kept when the agent lists it for the folder (GET /experimental/tool), with the agent's
   * description; while that list is unavailable every tool the source defines is shown.
   */
  async pluginRead(params) {
    const list = (await this.pluginsInstalled(params)).marketplaces[0].plugins
    const plugin = list.find((candidate) => candidate.id === params.pluginName) ?? list.find((candidate) => candidate.name === params.pluginName)
    if (!plugin) throw invalidParams(`Unknown plugin: ${params.pluginName}`)
    const found = pluginContents(readPluginSource(this.pluginSourceFile(plugin.id)))
    let tools = found.tools.map((name) => ({ name, description: '' }))
    if (tools.length) {
      const directory = plugin.codeDesktop.project ?? this.pluginProjects(params)[0] ?? this.homeDir()
      let live = null
      try { live = await this.api('GET', '/experimental/tool', { directory, query: this.toolQuery() }) } catch {
        // Without a model to ask for (no session yet), the ids alone still tell which tools are live.
        try { live = (await this.api('GET', '/experimental/tool/ids', { directory })).map((id) => ({ id, description: '' })) } catch {}
      }
      if (Array.isArray(live) && live.length) {
        const byId = new Map(live.filter((tool) => typeof tool?.id === 'string').map((tool) => [tool.id, tool]))
        tools = tools.filter((tool) => byId.has(tool.name)).map((tool) => ({ name: tool.name, description: String(byId.get(tool.name)?.description ?? '').trim().split('\n')[0].trim().slice(0, 300) }))
      }
    }
    const description = plugin.codeDesktop.description?.en ?? plugin.id
    return { plugin: { ...plugin, description, skills: [], mcpServers: [], hooks: found.hooks.map((name) => ({ key: name, eventName: '' })), tools } }
  }

  /** The file a plugin spec loads: a local path, or the entry of the npm package in the agent's package cache. */
  pluginSourceFile(spec) {
    try {
      if (spec.startsWith('file:')) return fileURLToPath(spec)
      if (path.isAbsolute(spec)) return spec
    } catch { return null }
    const name = pluginName(spec)
    if (!/^(@[\w.-]+\/)?[\w.-]+$/.test(name)) return null
    const root = path.join(this.env.XDG_CACHE_HOME || path.join(this.homeDir(), '.cache'), this.flavor.dataDir, 'packages')
    const [scope, base] = name.startsWith('@') ? name.split('/') : [null, name]
    const parent = scope ? path.join(root, scope) : root
    let candidates = []
    try { candidates = fs.readdirSync(parent).filter((entry) => entry === base || entry.startsWith(`${base}@`)) } catch { return null }
    const wanted = scope ? spec.slice(scope.length + 1) : spec
    candidates.sort((a, b) => (b === wanted) - (a === wanted))
    for (const entry of candidates) {
      const dir = path.join(parent, entry)
      try { return createRequire(path.join(dir, 'package.json')).resolve(name) } catch {}
    }
    return null
  }

  async pluginOp(method, params) {
    const own = this.pluginSettings()
    const save = async () => {
      this.saveSettings({ plugins: own })
      await this.reloadConfig()
      this.notify('codeDesktop/plugin/changed', { reason: method })
    }
    switch (method) {
      case 'codeDesktop/plugin/registries': return { registries: [{ name: 'npm', url: 'https://registry.npmjs.org' }] }
      case 'codeDesktop/plugin/inspect': {
        const spec = String(params.spec ?? '').trim()
        if (!spec) throw invalidParams('spec is required')
        return { status: 'accepted', reason: null, name: pluginName(spec), version: /@([^@/]+)$/.exec(spec)?.[1] ?? null, description: `${this.flavor.name} plugin ${spec}`, bundle: { name: pluginName(spec) } }
      }
      case 'codeDesktop/plugin/install': {
        const spec = String(params.spec ?? '').trim()
        if (!spec) throw invalidParams('spec is required')
        const previous = { installed: [...own.installed], disabled: [...own.disabled] }
        if (!own.installed.includes(spec)) own.installed.push(spec)
        own.disabled = own.disabled.filter((other) => other !== spec)
        if (typeof params.requestId === 'string') this.notify('codeDesktop/plugin/installProgress', { requestId: params.requestId, phase: 'install', attempt: null })
        await save()
        // OpenCode installs and loads plugins when a folder's instance starts: start one and wait briefly for its verdict.
        const failure = await this.pluginVerdict(spec)
        if (failure) {
          // A plugin that never loaded is not kept (a later install retries it).
          if (!previous.installed.includes(spec)) { own.installed = previous.installed; own.disabled = previous.disabled; await save() }
          return { application: 'failed', changed: false, stage: 'install', error: { code: 'load-failed', diagnostic: failure }, packageResult: { kind: 'deferred', output: failure }, pendingBuilds: [], bundle: { name: pluginName(spec) }, target: this.config.configPath }
        }
        return { application: 'applied', changed: true, stage: 'done', error: null, packageResult: { kind: 'deferred', output: `${this.flavor.name} installs ${spec} when it loads its config.` }, pendingBuilds: [], bundle: { name: pluginName(spec) }, target: this.config.configPath }
      }
      case 'codeDesktop/plugin/cancelInstall': return { cancelled: false }
      case 'codeDesktop/plugin/setEnabled': {
        const spec = own.installed.find((candidate) => candidate === params.pluginName || pluginName(candidate) === params.pluginName)
        if (!spec) throw invalidParams('Only plugins added in OpenClaude Desktop can be switched here.')
        own.disabled = params.enabled === false ? [...new Set([...own.disabled, spec])] : own.disabled.filter((other) => other !== spec)
        await save()
        return { enabled: params.enabled !== false }
      }
      case 'codeDesktop/plugin/remove': {
        const spec = own.installed.find((candidate) => candidate === params.pluginName || pluginName(candidate) === params.pluginName)
        if (!spec) throw invalidParams('Only plugins added in OpenClaude Desktop can be removed here.')
        own.installed = own.installed.filter((other) => other !== spec)
        own.disabled = own.disabled.filter((other) => other !== spec)
        await save()
        return { removed: true }
      }
      default: throw new RpcError(METHOD_NOT_FOUND, method)
    }
  }

  // ------------------------------------------------------------------ tools / preview

  async toolsList(params) {
    const directory = this.directoryFor(params)
    let builtin = []
    try { builtin = await this.api('GET', '/experimental/tool', { directory, query: this.toolQuery() }) } catch {
      try { builtin = (await this.api('GET', '/experimental/tool/ids', { directory })).map((id) => ({ id, description: '' })) } catch {}
    }
    const servers = []
    for (const [name, config] of await this.mcpServers(directory)) servers.push({ name, tools: config.enabled === false ? [] : await this.mcpTools.tools(name, config) })
    let skills = []
    try { skills = await this.api('GET', '/skill', { directory }) } catch {}
    return toolsListResponse(builtin, servers, skills, this.flavor)
  }

  toolQuery() {
    const model = splitModel(this.lastModel ?? '')
    return model ? { provider: model.providerID, model: model.modelID } : {}
  }

  async preview(params) {
    const cwd = await this.normalizeCwd(params.cwd ?? this.directoryFor(params))
    const custom = params.codeDesktop?.customization ?? {}
    const systemPrompt = normalizeText(custom.systemPrompt)
    const instructions = normalizeText(custom.instructions)
    const byId = typeof params.threadId === 'string' ? (this.threads.get(params.threadId) ?? this.children.get(params.threadId)) : null
    const thread = byId ?? [...this.threads.values()].find((candidate) => candidate.cwd === cwd) ?? null
    // The last prompt the agent assembled for this thread (or any session in this folder).
    let captured = thread ? readJson(path.join(this.config.runtimeDir, 'prompts', `${safeId(thread.id)}.json`), null) : null
    if (!captured?.default) {
      for (const id of this.store.ids()) {
        if (this.store.get(id).cwd !== cwd) continue
        const value = readJson(path.join(this.config.runtimeDir, 'prompts', `${safeId(id)}.json`), null)
        if (value?.default && (!captured?.at || value.at > captured.at)) captured = value
      }
    }
    const model = thread?.model ?? params.model ?? captured?.model ?? await this.catalog.defaultId().catch(() => null)
    const parsed = splitModel(model ?? '') ?? { providerID: '', modelID: '' }
    const fill = (text) => text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (match, name) => ({ model: parsed.modelID, provider: parsed.providerID, cwd })[name] ?? match)
    const defaultText = captured?.default ? captured.default.join('\n') : ''
    // MiMo appends its skill catalog and instruction files after the plugin transform.
    const sentText = Array.isArray(captured?.sent) ? captured.sent.join('\n\n') : null
    const transformed = Array.isArray(captured?.final) ? captured.final.join('\n\n') : null
    const tail = sentText && transformed && sentText.startsWith(transformed) ? sentText.slice(transformed.length) : ''
    const parts = [systemPrompt ? fill(systemPrompt) : defaultText, instructions, thread?.custom?.developer].filter(Boolean)
    const text = parts.join('\n') + tail
    const template = defaultText.split(cwd).join('{{cwd}}').split(parsed.modelID || '\u0000').join('{{model}}')
    let tools = []
    try { tools = (await this.api('GET', '/experimental/tool/ids', { directory: cwd })).filter((id) => id !== 'invalid') } catch {}
    return {
      text: text || `${this.flavor.name} assembles its built-in system prompt for the model on the first request in this folder.`,
      defaultText, defaultTemplate: template, custom: Boolean(systemPrompt),
      sections: [{ name: systemPrompt ? 'code-desktop:system-prompt' : `${this.flavor.id}:built-in`, chars: (systemPrompt ? fill(systemPrompt) : defaultText).length }, ...(instructions ? [{ name: 'code-desktop:custom-instructions', chars: instructions.length }] : []), ...(tail ? [{ name: `${this.flavor.id}:skills-and-instruction-files`, chars: tail.length }] : [])],
      tools, variables: { provider: parsed.providerID || null, model: parsed.modelID || null, cwd },
      exact: Boolean(captured?.default), cwd, threadId: thread?.id ?? null,
    }
  }

  // ------------------------------------------------------------------ session actions

  async fork(params) {
    const source = await this.historyOf(this.requireId(params.threadId))
    let messageID
    if (params.lastTurnId) {
      const turns = source.turns()
      const index = turns.findIndex((turn) => turn.id === params.lastTurnId)
      if (index < 0) throw invalidParams('Unknown lastTurnId.')
      if (turns[index].status === 'inProgress') throw invalidParams('The turn to fork through is still running.')
      messageID = turns[index + 1]?.id
    }
    const info = await this.api('POST', `/session/${encodeURIComponent(source.id)}/fork`, { directory: source.cwd, body: messageID ? { messageID } : {} })
    const meta = this.store.get(source.id)
    this.store.update(info.id, { cwd: info.directory ?? source.cwd, forkedFrom: source.id, lastActivity: Date.now(), preview: meta.preview, permission: meta.permission, tools: meta.tools, custom: meta.custom })
    const thread = await this.openThread(info.id)
    await thread.applyParams(params)
    const response = thread.sessionResponse({ includeTurns: params.excludeTurns !== true })
    this.notify('thread/started', { thread: response.thread })
    return response
  }

  async revert(params) {
    const thread = await this.openThread(this.requireId(params.threadId))
    if (thread.busy || thread.activeTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before rewinding.')
    const turns = thread.turns()
    const index = turns.findIndex((turn) => turn.id === params.beforeTurnId)
    if (index < 0) throw invalidParams('Unknown beforeTurnId.')
    const cut = turns[index].startedMs ?? 0
    const later = thread.projector.ordered().filter((entry) => (entry.info.time?.created ?? 0) >= cut)
    // codeDesktop.restoreFiles (capabilities.rewindFiles): OpenCode's own undo (POST /session/:id/revert, session/
    // revert.ts) puts back every file the later turns patched from its snapshots and hides those messages; OpenCode
    // removes them at the next prompt (cleanup), and until then its /redo (unrevert) can bring both back.
    if (params.codeDesktop?.restoreFiles === true && later.length) {
      const info = await this.api('POST', `/session/${encodeURIComponent(thread.id)}/revert`, { directory: thread.cwd, body: { messageID: later[0].info.id } })
      if (info && typeof info === 'object') { thread.info = info; thread.projector.revert = info.revert ?? null }
      await thread.reload()
      return { thread: thread.threadObject(), turnsBackwardsCursor: null, itemsBackwardsCursor: null }
    }
    // History only (Codex semantics; the app says "Local file changes remain"): delete the messages.
    const doomed = later.map((entry) => entry.info.id).reverse()
    for (const id of doomed) {
      await this.api('DELETE', `/session/${encodeURIComponent(thread.id)}/message/${encodeURIComponent(id)}`, { directory: thread.cwd })
      thread.projector.removeMessage(id)
    }
    await thread.reload()
    return { thread: thread.threadObject(), turnsBackwardsCursor: null, itemsBackwardsCursor: null }
  }

  async sideQuestion(params) {
    const id = this.requireId(params.threadId)
    const question = typeof params.question === 'string' ? params.question.trim() : ''
    if (!question) throw invalidParams('question is required')
    const requestId = typeof params.requestId === 'string' && params.requestId ? params.requestId : randomUUID()
    const source = await this.historyOf(id)
    const model = splitModel(source.model ?? await this.catalog.defaultId())
    if (!model) throw new RpcError(-32000, 'No model is available for a side question.')
    const history = Array.isArray(params.history) ? params.history.slice(-20) : []
    const promptText = [...history.map((entry) => `Earlier side question: ${entry.question}\nAnswer: ${entry.answer}`), question].join('\n\n')
    // MiMo's own side question (its /btw): POST /session/:id/ask answers over a frozen snapshot of the session with the
    // session's own system prompt, tools and messages, so the provider's prompt cache covers all but the question, and
    // nothing is copied or added to the session. An older MiMo without it, and OpenCode, answer in a forked copy.
    if (this.flavor.id === 'mimo' && !source.actor) {
      const answered = await this.askSideQuestion({ id, source, model, promptText, requestId })
      if (answered) return answered
    }
    const fork = await this.api('POST', `/session/${encodeURIComponent(id)}/fork`, { directory: source.cwd, body: {} })
    this.store.update(fork.id, { hidden: true, cwd: source.cwd })
    // The thread's own primary agent answers, so a user without 'build' (or with default_agent) still gets an answer.
    const sideAgent = await this.primaryAgent(source.cwd, this.store.get(id).agent ?? null)
    let text = ''
    let done
    const finished = new Promise((resolve) => { done = resolve })
    // Only the answer's text: assistant messages created after the side prompt.
    const copied = new Set()
    let prompted = false
    const answers = new Set()
    const textParts = new Set()
    this.sideSessions.set(fork.id, (type, props) => {
      if (type === 'message.updated' && props.info) {
        if (props.info.role === 'user' && !copied.has(props.info.id) && prompted) answers.add(`user:${props.info.id}`)
        if (props.info.role === 'assistant' && prompted && !copied.has(props.info.id)) answers.add(props.info.id)
      }
      if (type === 'message.part.updated' && props.part?.type === 'text' && answers.has(props.part.messageID)) {
        textParts.add(props.part.id)
        if (props.part.time?.end && (props.part.text ?? '').length > text.length && props.part.text.startsWith(text)) {
          const rest = props.part.text.slice(text.length)
          text = props.part.text
          this.notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text: rest })
        }
      }
      if (type === 'message.part.delta' && props.field === 'text' && textParts.has(props.partID)) {
        text += props.delta ?? ''
        this.notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text: props.delta ?? '' })
      }
      if (prompted && ((type === 'session.status' && props.status?.type === 'idle') || type === 'session.idle') && answers.size) done('stop')
      if (type === 'session.error') done('error')
    })
    try { for (const entry of await this.api('GET', `/session/${encodeURIComponent(fork.id)}/message`, { directory: source.cwd })) copied.add(entry.info.id) } catch {}
    const runtime = { root: fork.id, cwd: source.cwd, systemPrompt: source.custom?.systemPrompt || SIDE_PROMPT, instructions: null, modelParams: source.custom?.modelParams ?? null, sandbox: { mode: 'read-only', roots: [], network: false } }
    writeAtomic(path.join(this.config.runtimeDir, 'sessions', `${safeId(fork.id)}.json`), JSON.stringify(runtime))
    let cancelled = false
    const cleanup = async () => {
      this.sideSessions.delete(fork.id)
      this.sideQuestions.delete(requestId)
      try { await this.api('DELETE', `/session/${encodeURIComponent(fork.id)}`, { directory: source.cwd }) } catch {}
      try { fs.rmSync(path.join(this.config.runtimeDir, 'sessions', `${safeId(fork.id)}.json`), { force: true }) } catch {}
    }
    this.sideQuestions.get(requestId)?.cancel()
    this.sideQuestions.set(requestId, { cancel: () => { cancelled = true; done('cancelled'); void this.api('POST', `/session/${encodeURIComponent(fork.id)}/abort`, { directory: source.cwd }).catch(() => {}) } })
    try {
      await this.api('PATCH', `/session/${encodeURIComponent(fork.id)}`, { directory: source.cwd, body: { permission: [{ permission: '*', pattern: '*', action: 'deny' }] } })
      prompted = true
      const route = `/session/${encodeURIComponent(fork.id)}/${this.flavor.promptRoute === 'message' ? 'message' : 'prompt_async'}`
      void this.api('POST', route, { directory: source.cwd, timeout: 12 * 3600000, body: { parts: [{ type: 'text', text: promptText }], model: { providerID: model.providerID, modelID: model.modelID }, agent: sideAgent } }).catch((error) => { this.log(`side question prompt: ${error?.message}`); done('error') })
      const timer = setTimeout(() => done('timeout'), 10 * 60000)
      const finish = await finished
      clearTimeout(timer)
      if (!text) {
        const messages = await this.api('GET', `/session/${encodeURIComponent(fork.id)}/message`, { directory: source.cwd }).catch(() => [])
        const last = [...(messages ?? [])].reverse().find((entry) => entry.info.role === 'assistant')
        text = last?.parts?.filter((part) => part.type === 'text').map((part) => part.text).join('') ?? ''
        if (finish === 'error' && !text) throw new RpcError(-32000, last?.info?.error?.data?.message ?? 'The side question failed.')
      }
      const transcript = source.projector.ordered().length
      return { requestId, text: cancelled ? '' : text, finish: cancelled ? 'cancelled' : finish, model: model.modelID, contextMessages: transcript, truncated: false }
    } finally {
      await cleanup()
    }
  }

  /**
   * MiMo's side question (POST /session/:id/ask {question, providerID, modelID} → {answer}). MiMo answers it with an
   * ephemeral read-only actor (read, grep, glob) in a child session titled 'ask: …' that it keeps: the bridge keeps that
   * session out of the app (no sub-agent thread, hidden from lists), turns down any card it would raise, and deletes it
   * once answered. Returns null when this MiMo has no such route (the caller forks instead).
   */
  async askSideQuestion({ id, source, model, promptText, requestId }) {
    const directory = source.cwd
    const started = Date.now()
    const children = new Set()
    const controller = new AbortController()
    let cancelled = false
    const turnDown = (type, props) => {
      if (type === 'permission.asked' && props?.id) void this.api('POST', `/permission/${encodeURIComponent(props.id)}/reply`, { directory, body: { reply: 'reject', message: 'A side question only reads.' } }).catch(() => {})
      if (type === 'question.asked' && props?.id) void this.api('POST', `/question/${encodeURIComponent(props.id)}/reject`, { directory, body: {} }).catch(() => {})
    }
    const adopt = (info) => {
      if (!info?.id || children.has(info.id)) return
      children.add(info.id)
      this.sideSessions.set(info.id, turnDown)
      this.store.update(info.id, { hidden: true, cwd: directory })
      // The plugin's chat.message hook waits for a session's runtime file: this one only reads, with no prompt of its own.
      writeAtomic(path.join(this.config.runtimeDir, 'sessions', `${safeId(info.id)}.json`), JSON.stringify({ root: info.id, cwd: directory, systemPrompt: null, instructions: null, modelParams: null, sandbox: { mode: 'read-only', roots: [], network: false } }))
    }
    const asks = this.sideAsks.get(id) ?? new Set()
    asks.add(adopt)
    this.sideAsks.set(id, asks)
    this.sideQuestions.get(requestId)?.cancel()
    this.sideQuestions.set(requestId, { cancel: () => {
      cancelled = true
      controller.abort()
      for (const child of children) void this.api('POST', `/session/${encodeURIComponent(child)}/abort`, { directory }).catch(() => {})
    } })
    try {
      let answer
      try {
        const result = await this.api('POST', `/session/${encodeURIComponent(id)}/ask`, { directory, signal: controller.signal, timeout: 10 * 60000, body: { question: promptText, providerID: model.providerID, modelID: model.modelID } })
        answer = typeof result?.answer === 'string' ? result.answer : ''
      } catch (error) {
        if (cancelled) return { requestId, text: '', finish: 'cancelled', model: model.modelID, contextMessages: source.projector.ordered().length, truncated: false }
        if (error?.status === 404 && !/session/i.test(error?.message ?? '')) return null
        if (error?.name === 'TimeoutError') return { requestId, text: '', finish: 'timeout', model: model.modelID, contextMessages: source.projector.ordered().length, truncated: false }
        throw new RpcError(-32000, String(error?.message ?? 'The side question failed.').replace(/^MiMo Code: /, '').slice(0, 500) || 'The side question failed.')
      }
      // forkQuery answers its own failures as text.
      if (/^\(fork-query unavailable/.test(answer)) return null
      const failed = /^\(fork-query failed: ([\s\S]*)\)$/.exec(answer.trim())
      if (failed) throw new RpcError(-32000, actorErrorLine(failed[1]) ?? 'The side question failed.', { detail: failed[1].trim().slice(0, 2000) })
      if (cancelled) answer = ''
      if (answer) this.notify('codeDesktop/sideQuestion/delta', { threadId: id, requestId, text: answer })
      return { requestId, text: answer, finish: cancelled ? 'cancelled' : 'stop', model: model.modelID, contextMessages: source.projector.ordered().length, truncated: false }
    } finally {
      asks.delete(adopt)
      if (!asks.size) this.sideAsks.delete(id)
      this.sideQuestions.delete(requestId)
      // The answer's session, also when its session.created never reached this bridge.
      try {
        const listed = await this.api('GET', `/session/${encodeURIComponent(id)}/children`, { directory, timeout: 15000 })
        for (const info of Array.isArray(listed) ? listed : []) {
          if (info?.id && !this.children.has(info.id) && /^ask: /.test(info.title ?? '') && (info.time?.created ?? 0) >= started - 1000) adopt(info)
        }
      } catch {}
      for (const child of children) {
        try { await this.api('DELETE', `/session/${encodeURIComponent(child)}`, { directory, timeout: 15000 }) } catch {}
        this.sideSessions.delete(child)
        try { fs.rmSync(path.join(this.config.runtimeDir, 'sessions', `${safeId(child)}.json`), { force: true }) } catch {}
      }
    }
  }

  /** Stops the bridge once; every caller (stdin end, SIGTERM, SIGINT, a closed transport) waits for the same stop. */
  shutdown() {
    this.stopping ??= this.stop()
    return this.stopping
  }

  async stop() {
    this.closed = true
    this.oauthCallbacks.close()
    this.stopEvents?.()
    for (const thread of this.threads.values()) thread.close('OpenClaude Desktop core stopped.')
    // A workflow runner's bridge takes its agents' sessions with it (the runner never deletes them itself).
    // (Only while the agent server still runs: a dead one is not restarted for it; the app's next sweep gets them.)
    if (this.server?.child && this.server.url && (this.config.runnerDir || this.clientName === WORKFLOW_CLIENT)) await this.removeWorkflowSessions({ own: true, timeoutMs: 800 }).catch(() => {})
    this.store.flush()
    await this.server?.stop()
  }

  /**
   * Deletes workflow agents' sessions from the agent's history (DELETE /session/:id also removes their sub-agents):
   * own, the ones this runner bridge created or resumed; otherwise (the app's bridge, once per start) the ones a runner
   * that is gone left behind (it was killed before it could). A failure leaves the session for the next sweep.
   */
  async removeWorkflowSessions({ own = false, limit = 500, timeoutMs = 8000, concurrency = 6 } = {}) {
    const alive = (pid) => {
      if (!Number.isInteger(pid) || pid <= 0) return false
      if (pid === process.pid) return true
      try { process.kill(pid, 0); return true } catch (error) { return error?.code === 'EPERM' }
    }
    const ids = this.store.ids().filter((id) => {
      const meta = this.store.get(id)
      if (meta.workflowAgent !== true || meta.deleted || parseActorThreadId(id)) return false
      return own ? meta.runnerPid === process.pid || this.threads.has(id) : !alive(meta.runnerPid)
    }).slice(0, limit)
    const deadline = Date.now() + timeoutMs
    // A few at a time: a runner's bridge has about a second after SIGTERM (appServerClient.js shutdown) for a whole run's agents.
    const queue = [...ids]
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        if (Date.now() > deadline) return
        try {
          await this.api('DELETE', `/session/${encodeURIComponent(id)}`, { directory: this.store.get(id).cwd, timeout: Math.max(300, deadline - Date.now()) })
        } catch (error) {
          if (error?.status !== 404) { this.log(`workflow session ${id}: ${error?.message}`); continue }
        }
        this.store.delete(id)
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  }
}

/** The runtime catalogs a custom system prompt keeps (plugin.js): MCP instructions, available skills. */
export function keptCatalogs(text) {
  const kept = []
  const mcp = /<mcp_instructions>[\s\S]*?<\/mcp_instructions>/.exec(text ?? '')
  if (mcp) kept.push(mcp[0])
  const skills = (text ?? '').indexOf('Skills provide specialized instructions')
  if (skills >= 0) kept.push(text.slice(skills).split('\n<mcp_instructions>')[0].trim())
  return kept
}
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_')
const normalizeText = (value) => {
  if (typeof value !== 'string') return null
  const text = value.replace(/\0/g, '').replace(/\r\n?/g, '\n').trim()
  return text || null
}
/**
 * Whether a session is archived: archived here (thread/archive), or in OpenCode's own apps
 * (time.archived) after the last restore here (thread/unarchive's unarchivedAt).
 */
export function sessionArchived(info, meta = {}) {
  if (meta.archived === true) return true
  const native = info?.time?.archived
  if (typeof native !== 'number' || !Number.isFinite(native)) return false
  return !(Number.isFinite(meta.unarchivedAt) && meta.unarchivedAt >= native)
}

// How long a plugin install waits for OpenCode's load failure after the folder's instance started.
const PLUGIN_VERDICT_MS = 600

/** OpenCode's plugin failure text (plugin/index.ts) → the spec it names, or null. */
export function pluginFailure(message) {
  const match = /^Failed to (?:install|load) plugin (\S+): /.exec(message) ?? /^Plugin (\S+) skipped: /.exec(message)
  return match ? { target: match[1], message } : null
}

const pluginName = (spec) => {
  const value = String(spec)
  if (value.startsWith('file:') || value.startsWith('/')) return path.basename(value).replace(/\.(m?js|ts)$/, '')
  return value.replace(/^(@[^/]+\/[^@]+|[^@]+)@.*$/, '$1')
}

/** A plugin's source text (≤ 2 MB), or '' when it can't be read. */
export function readPluginSource(file) {
  if (!file) return ''
  try {
    const stat = fs.statSync(file)
    return stat.isFile() && stat.size <= 2_000_000 ? fs.readFileSync(file, 'utf8') : ''
  } catch { return '' }
}

// The hooks an OpenCode / MiMo plugin can return (@opencode-ai/plugin Hooks): the dotted ones are always quoted keys.
const PLUGIN_DOTTED_HOOKS = ['chat.message', 'chat.params', 'chat.headers', 'permission.ask', 'command.execute.before', 'tool.execute.before', 'tool.execute.after', 'tool.definition', 'shell.env',
  'session.pre', 'session.post', 'session.llm.request', 'experimental.chat.messages.transform', 'experimental.chat.system.transform', 'experimental.session.compacting', 'experimental.compaction.autocontinue', 'experimental.text.complete']
const PLUGIN_PLAIN_HOOKS = ['event', 'config', 'auth', 'provider']
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * What a plugin's source registers, read without running it: the hooks it returns and the tools it defines with
 * `tool({...})` (named by their key). Comments are dropped first so a mention in one is never counted.
 */
export function pluginContents(source) {
  const text = String(source ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  if (!text.trim()) return { hooks: [], tools: [] }
  const hooks = []
  for (const name of PLUGIN_DOTTED_HOOKS) if (new RegExp(`(['"\`])${escapeRegExp(name)}\\1\\s*[:(]`).test(text)) hooks.push(name)
  for (const name of PLUGIN_PLAIN_HOOKS) {
    const value = name === 'auth' || name === 'provider' ? '(?:\\{|[A-Za-z_$][\\w$]*\\s*[,}])' : '(?:async\\b|function\\b|\\([^)]*\\)\\s*=>|[A-Za-z_$][\\w$]*\\s*=>)'
    if (new RegExp(`(?:^|[{,\\s])${name}\\s*:\\s*${value}|\\basync\\s+${name}\\s*\\(`).test(text)) hooks.push(name)
  }
  const tools = []
  for (const match of text.matchAll(/(?:^|[{,\s])(?:([A-Za-z_$][\w$]*)|"([^"\n]{1,80})"|'([^'\n]{1,80})')\s*:\s*(?:[\w$]+\.)?tool\s*\(/g)) {
    const name = match[1] ?? match[2] ?? match[3]
    if (name && !tools.includes(name)) tools.push(name)
  }
  if (tools.length && !hooks.includes('tool')) hooks.push('tool')
  return { hooks, tools }
}

/**
 * One OpenCode session loaded here: a root thread, or a sub-agent session
 * (`root` set) projected under its own id.
 */
export class LiveThread {
  constructor(bridge, { info, root = null, parent = null, actor = null }) {
    this.bridge = bridge
    this.info = info
    // MiMo actor (sub-agent inside the parent session): its own thread id over the same session.
    this.actor = actor
    this.sessionID = actor ? parseActorThreadId(info.id).sessionID : info.id
    this.messageAgents = new Map()
    this.id = info.id
    this.root = root
    this.parent = parent
    this.cwd = info.directory ?? bridge.store.get(info.id).cwd ?? bridge.homeDir()
    const meta = bridge.store.get(info.id)
    this.askDiffs = new Map()
    /** "Allow for this session" answers given on this (root) thread's cards (policy.js sessionGrant); dropped on a mode change. */
    this.sessionGrants = []
    /** Bumped whenever the grants are dropped: a card still open across a mode change records no grant. */
    this.grantEpoch = 0
    this.projector = new Projector({ threadId: info.id, cwd: this.cwd, meta, mcpServers: () => bridge.knownMcpNames(this.cwd), askDiffs: this.askDiffs, actor })
    // MiMo workflow runs whose structure this MiMo held, or no longer held, when last read: its list keeps a run it quit
    // with as running, and only the runtime knows (a run just started has no structure yet, but its workflow.started).
    this.workflowHeld = new Set()
    this.workflowGone = new Set()
    this.projector.workflowLive = (runID) => (bridge.liveWorkflows.has(runID) || this.workflowHeld.has(runID) ? true : this.workflowGone.has(runID) ? false : undefined)
    this.permission = root ? root.permission : applyPermissionParams(meta.permission ?? defaultPermission(), {})
    this.tools = root ? root.tools : meta.tools ?? null
    this.dynamicWorkflows = root ? root.dynamicWorkflows : meta.dynamicWorkflows === true
    this.custom = root ? root.custom : meta.custom ?? {}
    // The primary agent the user chose for this session (codeDesktop.agent), else null for the folder's default.
    this.agentChoice = root ? null : typeof meta.agent === 'string' && meta.agent ? meta.agent : null
    this.primaryAgent = null
    this.model = meta.model ?? (info.model ? `${info.model.providerID}/${info.model.id}` : null)
    this.effort = meta.effort ?? null
    this.busy = false
    this.activeTurn = null
    this.turnOf = new Map()
    this.items = new Map()
    this.expect = []
    this.pending = new Map()
    this.held = false
    this.buffer = []
    this.queue = (meta.queue ?? []).map((entry) => ({ ...entry }))
    this.totals = emptyBreakdown()
    this.lastActivity = meta.lastActivity ?? null
    this.closed = false
    this.appliedRules = null
    this.nickname = root ? (info.title ?? '').replace(/\s*\(@[^)]*\)\s*$/, '') || null : null
  }

  get store() { return this.bridge.store }
  get flavor() { return this.bridge.flavor }
  get rootThread() { return this.root ?? this }

  emit(method, params) {
    if (this.closed) return
    if (this.held) this.buffer.push([method, params])
    else this.bridge.notify(method, params)
  }

  release() {
    this.held = false
    const buffered = this.buffer.splice(0)
    for (const [method, params] of buffered) this.bridge.notify(method, params)
  }

  /**
   * GET the session's messages. OpenCode 1.18 cannot serialize a stored user message that carries an
   * output `format` (structured output), which breaks the listing and fork of that session; such
   * messages are rewritten without it (repairStructured) and the listing retried.
   */
  async messages() {
    const route = `/session/${encodeURIComponent(this.sessionID)}/message`
    // MiMo keeps its actors (background sub-agents, its workflow engine's agents) in the parent session as their own
    // message slices, and lists only the main agent's unless asked (GET /session/:id/message agent_id): an actor's
    // thread reads its own slice (the main thread adds the others' in reload, otherSlices).
    const query = this.actor ? messageSliceQuery(this.flavor, this.actor) : null
    const options = { directory: this.cwd, ...(query ? { query } : {}) }
    try { return await this.bridge.api('GET', route, options) } catch (error) {
      if (!/OutputFormat/.test(error?.message ?? '')) throw error
      for (const id of this.store.get(this.sessionID).structured ?? []) await this.repairStructured(id).catch(() => {})
      return this.bridge.api('GET', route, options)
    }
  }

  /** Re-create a structured turn's user message (same id, same parts) without its `format`. */
  async repairStructured(messageID) {
    const base = `/session/${encodeURIComponent(this.sessionID)}/message/${encodeURIComponent(messageID)}`
    let entry = this.projector.messages.get(messageID)
    if (!entry) { try { entry = await this.bridge.api('GET', base, { directory: this.cwd }) } catch {} }
    const input = this.store.get(this.sessionID).inputs?.[messageID]
    const parts = (entry?.parts ?? []).filter((part) => part.type === 'text' || part.type === 'file').map((part) => (part.type === 'text' ? { type: 'text', text: part.text, ...(part.synthetic ? { synthetic: true } : {}) } : { type: 'file', mime: part.mime, url: part.url, ...(part.filename ? { filename: part.filename } : {}) }))
    const fallback = (Array.isArray(input) ? input : []).filter((item) => item?.type === 'text').map((item) => ({ type: 'text', text: item.text }))
    const info = entry?.info ?? {}
    // The re-created message comes back over the event stream as a new user message: it is the old turn's, never a new
    // turn someone else started (onMessage skips it).
    ;(this.repairing ??= new Set()).add(messageID)
    try {
      await this.bridge.api('DELETE', base, { directory: this.cwd })
      await this.bridge.api('POST', `/session/${encodeURIComponent(this.sessionID)}/message`, {
        directory: this.cwd,
        body: { messageID, noReply: true, parts: parts.length ? parts : fallback.length ? fallback : [{ type: 'text', text: '(structured request)' }], ...(info.agent ? { agent: info.agent } : {}), ...(info.model ? { model: { providerID: info.model.providerID, modelID: info.model.modelID } } : {}) },
      })
    } finally { setTimeout(() => this.repairing?.delete(messageID), 5000).unref?.() }
    const structured = (this.store.get(this.sessionID).structured ?? []).filter((id) => id !== messageID)
    this.store.update(this.sessionID, { structured: structured.length ? structured : undefined })
  }

  async reload() {
    // The folder's MCP servers before the history is projected: their tools are mcpToolCall rows.
    const [info, messages, actors, slices] = await Promise.all([
      this.actor ? Promise.resolve(null) : this.bridge.sessionInfo(this.id, this.cwd),
      this.messages(),
      // MiMo's record of the session's actors (how each background sub-agent ended), for their spawn cards, and their
      // slices (tokens, last message).
      this.flavor.id === 'mimo' && !this.actor ? this.bridge.api('GET', `/session/${encodeURIComponent(this.sessionID)}/actors`, { directory: this.cwd }).catch(() => null) : null,
      this.flavor.id === 'mimo' && !this.actor ? this.bridge.otherSlices(this.sessionID, this.cwd) : [],
      this.bridge.refreshMcpNames(this.cwd),
    ])
    if (info) { this.info = info; this.projector.revert = info.revert ?? null }
    this.projector.meta = this.store.get(this.id)
    this.projector.load([...(messages ?? []), ...withoutIds(slices, messages)])
    if (Array.isArray(actors)) {
      for (const entry of actors) {
        if (typeof entry?.actorID === 'string' && typeof entry.executionState === 'string') this.projector.actorStates.set(entry.actorID, { state: entry.executionState, error: actorErrorLine(entry.lastError) })
      }
    }
    // MiMo's own run list before the history is projected: a background or resumed run's card shows how it is doing.
    const workflows = this.bridge.flavor.id === 'mimo' ? this.projector.workflowStarters() : new Map()
    if (workflows.size) await this.refreshWorkflowRuns()
    let status = null
    if (!this.actor) { try { status = (await this.bridge.api('GET', '/session/status', { directory: this.cwd }))?.[this.id] } catch {} }
    const busy = this.actor ? this.busy : status?.type === 'busy' || status?.type === 'retry'
    if (!busy && (this.busy || this.activeTurn)) this.finishTurn()
    this.busy = busy
    if (busy && !this.activeTurn) {
      const last = this.projector.turns({ busy: true }).at(-1)
      if (last) {
        this.activeTurn = { id: last.id, startedMs: last.startedMs ?? Date.now() }
        for (const item of last.items) this.items.set(item.id, { started: true, completed: item.status && item.status !== 'inProgress', len: item.text?.length ?? item.aggregatedOutput?.length ?? 0 })
      }
    }
    this.mapTurns()
    const usage = this.projector.usage()
    this.totals = usage.total
    // A run still going (one that outlived its call included) is followed again.
    for (const runID of workflows.keys()) {
      const found = this.workflowPartOf(runID)
      const run = found && this.projector.itemOf(found.part, found.message)?.workflowRun
      if (run?.runId && run.status === 'running') this.watchWorkflow(runID, found.part, run)
    }
  }

  mapTurns() {
    for (const turn of this.projector.turns({ busy: this.busy })) {
      for (const message of turn.assistant) this.turnOf.set(message.info.id, turn.id)
      this.turnOf.set(turn.id, turn.id)
    }
    for (const steer of this.store.get(this.id).steers ?? []) if (!this.turnOf.has(steer)) this.turnOf.set(steer, this.activeTurn?.id ?? steer)
  }

  turns() { return this.projector.turns({ busy: this.busy || Boolean(this.activeTurn) }) }

  status() {
    if (this.pending.size) return { type: 'active', activeFlags: [...new Set([...this.pending.values()].map((entry) => entry.flag))] }
    return this.busy || this.activeTurn ? { type: 'active', activeFlags: [] } : { type: 'idle' }
  }

  publishStatus(status = this.status()) { this.emit('thread/status/changed', { threadId: this.id, status }) }

  contextWindow() {
    const entry = this.bridge.catalog.cached?.entries?.find((candidate) => candidate.id === this.model)
    return this.bridge.windowFor(entry, this.cwd)
  }

  tokenUsage(last) {
    // codeDesktop.costUsd: this session's spend, the sum of its assistant messages' recorded cost (the TUI's
    // '{money} spent'), for per-token users; null when OpenCode recorded no price.
    let cost = 0, priced = false
    for (const entry of this.projector.messages.values()) if (entry?.info?.role === 'assistant' && Number.isFinite(entry.info.cost)) { cost += entry.info.cost; priced ||= entry.info.cost > 0 }
    return { total: { ...this.totals }, last: last ?? emptyBreakdown(), modelContextWindow: this.contextWindow(), codeDesktop: { costUsd: priced ? Math.round(cost * 1e6) / 1e6 : null } }
  }

  threadObject({ includeTurns = false } = {}) {
    const bridge = this.bridge
    const meta = this.store.get(this.id)
    const created = this.info.time?.created ?? Date.now()
    const activity = this.lastActivity ?? this.projector.lastActivityMs() ?? this.info.time?.updated ?? created
    const updated = Math.max(created, activity)
    const name = meta.name ?? (placeholderTitle(this.info.title, meta) ? null : this.info.title)
    const parentId = this.info.parentID ?? null
    const model = splitModel(this.model ?? '')
    return {
      id: this.id, sessionId: this.id, forkedFromId: meta.forkedFrom ?? null, parentThreadId: parentId,
      preview: this.projector.preview() || meta.preview || name || '', ephemeral: false, section: null, sectionEnteredAt: null, projectId: this.info.projectID ?? null,
      historyMode: 'paginated', modelProvider: model?.providerID ?? bridge.flavor.id, model: this.model, reasoningEffort: this.effort,
      createdAt: seconds(created), updatedAt: seconds(updated), recencyAt: seconds(updated),
      status: this.status(), path: null, cwd: this.cwd, cliVersion: `${bridge.flavor.id} ${bridge.agentVersion()}`, originator: null,
      source: parentId ? { subAgent: { thread_spawn: { parent_thread_id: parentId, depth: this.depth(), agent_path: null, agent_nickname: this.nickname, agent_role: null } } } : 'appServer',
      threadSource: null, agentNickname: parentId ? this.nickname : null, agentRole: null, gitInfo: null, name,
      turns: includeTurns ? this.turns().map((turn) => this.projector.snapshot(turn)) : [],
      // The session's public share link (OpenCode /share), for the session menu's Copy share link / Stop sharing.
      // stoppable false: a MiMo actor shares its parent's session, and MiMo can only abort the whole session (every
      // actor and the main turn), so the app offers no Stop for one sub-agent (turn/interrupt refuses it too).
      ...(typeof this.info.share?.url === 'string' || this.actor ? { codeDesktop: { ...(typeof this.info.share?.url === 'string' ? { shareUrl: this.info.share.url } : {}), ...(this.actor ? { stoppable: false } : {}) } } : {}),
      ...(parentId ? { canAcceptDirectInput: false } : {}),
    }
  }

  depth() { let depth = 0; for (let node = this; node?.parent; node = node.parent) depth++; return Math.max(1, depth) }

  sessionResponse({ includeTurns = false } = {}) {
    const model = splitModel(this.model ?? '')
    const permission = this.permission
    return {
      thread: this.threadObject({ includeTurns }),
      model: this.model ?? '', modelProvider: model?.providerID ?? this.flavor.id, serviceTier: null, cwd: this.cwd,
      instructionSources: [], approvalPolicy: permission.approvalPolicy, approvalsReviewer: 'user',
      sandbox: permission.sandbox === 'danger-full-access' ? { type: 'dangerFullAccess' } : permission.sandbox === 'read-only' ? { type: 'readOnly', networkAccess: false }
        : { type: 'workspaceWrite', writableRoots: [this.cwd, ...permission.extraRoots], networkAccess: permission.network, excludeTmpdirEnvVar: false, excludeSlashTmp: false },
      reasoningEffort: this.effort,
    }
  }

  pageTurns({ limit, sortDirection, cursor, itemsView = 'full' } = {}) {
    const ordered = this.turns().map((turn) => this.projector.snapshot(turn, itemsView === 'notLoaded' ? 'notLoaded' : 'full'))
    if (sortDirection !== 'asc') ordered.reverse()
    const start = cursor ? Number.parseInt(String(cursor), 10) || 0 : 0
    const size = Number.isInteger(limit) && limit > 0 ? limit : 25
    return { data: ordered.slice(start, start + size), nextCursor: start + size < ordered.length ? String(start + size) : null, backwardsCursor: null }
  }

  /** Replay what only live notifications carry (context usage, the plan) after a resume. */
  replay() {
    const usage = this.projector.usage()
    const turns = this.turns()
    const lastTurn = turns.at(-1)?.id ?? ''
    if (usage.last) this.emit('thread/tokenUsage/updated', { threadId: this.id, turnId: usage.lastTurnId ?? lastTurn, tokenUsage: this.tokenUsage(usage.last) })
    const plan = this.projector.plan()
    const send = () => { if (plan?.length) this.emit('turn/plan/updated', { threadId: this.id, turnId: lastTurn, explanation: null, plan }) }
    // MiMo keeps its work items in its task table (the `task` tool), not in todowrite parts: ask it again.
    if (this.flavor.id === 'mimo') void this.mimoTasks(lastTurn).then((sent) => { if (!sent) send() })
    else send()
  }

  // ---------------------------------------------------------------- params

  async applyParams(params = {}, { initial = false } = {}) {
    if (this.root) return
    let rulesChanged = initial
    const nextPermission = applyPermissionParams(this.permission, params)
    if (JSON.stringify(nextPermission) !== JSON.stringify(this.permission)) { this.setPermission(nextPermission); rulesChanged = true }
    let tools = toolSelectionOf(params)
    // Codex's per-thread connector overrides (config mcp_servers.<name>.enabled / disabled_tools) join the selection.
    const configTools = mcpConfigSelection(params.config)
    if (configTools) tools = mergeToolSelections(tools === undefined ? this.tools : tools, configTools)
    if (tools !== undefined && JSON.stringify(tools) !== JSON.stringify(this.tools)) { this.tools = tools; rulesChanged = true }
    // codeDesktop.dynamicWorkflows: whether MiMo's own `workflow` tool is offered (absent keeps the last value; never set = off).
    const workflows = params.codeDesktop?.dynamicWorkflows
    if (typeof workflows === 'boolean' && workflows !== this.dynamicWorkflows) { this.dynamicWorkflows = workflows; rulesChanged = true }
    const custom = params.codeDesktop?.customization
    if (isRecord(custom)) {
      const next = { ...this.custom }
      if (Object.hasOwn(custom, 'systemPrompt')) next.systemPrompt = normalizeText(custom.systemPrompt)
      if (Object.hasOwn(custom, 'instructions')) next.instructions = normalizeText(custom.instructions)
      if (Object.hasOwn(custom, 'modelParams')) next.modelParams = isRecord(custom.modelParams) ? custom.modelParams : null
      this.custom = next
    }
    if (typeof params.developerInstructions === 'string' && params.developerInstructions.trim()) this.custom = { ...this.custom, developer: params.developerInstructions.trim() }
    // codeDesktop.agent: the primary agent non-Plan turns run (null goes back to the folder's default).
    if (params.codeDesktop && Object.hasOwn(params.codeDesktop, 'agent')) {
      const agent = params.codeDesktop.agent
      this.agentChoice = typeof agent === 'string' && agent.trim() ? agent.trim() : null
      this.store.update(this.id, { agent: this.agentChoice ?? undefined })
    }
    if (typeof params.model === 'string' && params.model) this.model = params.model
    else if (!this.model) this.model = await this.bridge.catalog.defaultId((await this.bridge.mergedConfig(this.cwd)).model).catch(() => null)
    const effort = params.effort ?? params.config?.model_reasoning_effort
    if (typeof effort === 'string') this.effort = effort
    this.bridge.lastModel = this.model
    this.store.update(this.id, { permission: this.permission, tools: this.tools, custom: this.custom, model: this.model, effort: this.effort ?? undefined, cwd: this.cwd, dynamicWorkflows: this.dynamicWorkflows })
    this.writeRuntime()
    for (const child of this.bridge.children.values()) if (child.root === this) { child.permission = this.permission; child.tools = this.tools; child.custom = this.custom; child.dynamicWorkflows = this.dynamicWorkflows; child.writeRuntime() }
    if (rulesChanged) {
      await this.applyRules()
      for (const child of this.bridge.children.values()) if (child.root === this) await child.applyRules().catch(() => {})
    }
  }

  /** Every change of a root thread's permission goes through here (session grants never outlive the mode they were given in). */
  setPermission(next) {
    const changed = grantScopeChanged(this.permission, next)
    this.permission = next
    if (!changed) return
    this.sessionGrants = []
    this.grantEpoch += 1
  }

  /**
   * The session's ruleset: the bridge's (policy.js sessionRules), the user's own config denies after it,
   * then a child's inherited denies, tool selection and turned-off skills.
   */
  rules(extra = [], userRules = []) {
    const root = this.rootThread
    const deny = [...denyRules(root.tools, this.bridge.flavor), ...this.bridge.disabledSkills().map((name) => ({ permission: 'skill', pattern: name, action: 'deny' }))]
    const flavor = this.bridge.flavor
    // MiMo's own `workflow` tool only when Dynamic workflows run on its engine (Permission.disabled drops a `*` deny).
    if (flavor.id === 'mimo' && root.dynamicWorkflows !== true) deny.push({ permission: 'workflow', pattern: '*', action: 'deny' })
    // Nobody answers a question in a session that never asks (approvalPolicy "never": the workflow runner's agents, which
    // turn every request down): the `question` tool is not offered there, as Claude Code's workflow agents have no
    // AskUserQuestion. A rejected question would end the agent's turn with no answer.
    if (root.noUser()) deny.push({ permission: 'question', pattern: '*', action: 'deny' })
    // A workflow runner's agent starts no sub-agents of its own (Claude Code's workflow agents have no Agent tool):
    // OpenCode's `task` and MiMo's `actor` would run full model loops outside the run's agent count, cap and budget.
    if (this.bridge.store.get(root.id).workflowAgent === true) {
      deny.push({ permission: 'task', pattern: '*', action: 'deny' })
      if (flavor.id === 'mimo') deny.push({ permission: 'actor', pattern: '*', action: 'deny' })
    }
    const options = {
      readTools: this.bridge.readTools(), planPaths: this.bridge.planPaths(this.cwd), planDirs: this.bridge.planDirs(root.cwd), deny: [],
      modeRules: flavor.modeRules === true, roots: root.permission.extraRoots ?? [], grants: root.sessionGrants ?? [], hiddenSkills: flavor.hiddenSkills ?? [], userRules,
      ...(this.bridge.appTools ? { appToolsPrefix: appToolsPrefix(this.bridge.appTools) } : {}),
    }
    return [...sessionRules(root.permission, options), ...extra, ...deny]
  }

  /** Whether no person answers this (root) thread's cards and questions: approvalPolicy "never", or a workflow runner's agent. */
  noUser() {
    const root = this.rootThread
    return neverAsks(root.permission) || this.bridge.store.get(root.id).workflowAgent === true
  }

  /** PATCH the session's ruleset (a child keeps its own deny rules from OpenCode). */
  async applyRules(inherited) {
    if (this.actor) return
    if (Array.isArray(inherited)) this.inheritedRules = inherited.filter((rule) => rule.action === 'deny' && rule.permission !== 'todowrite' && rule.permission !== 'task')
    const rules = this.rules(this.inheritedRules ?? [], await this.bridge.userRules(this.cwd).catch(() => []))
    const key = JSON.stringify(rules)
    if (key === this.appliedRules) return
    await this.bridge.api('PATCH', `/session/${encodeURIComponent(this.sessionID)}`, { directory: this.cwd, body: { permission: rules } })
    this.appliedRules = key
  }

  /** The root thread and its sub-agents re-PATCH their rulesets (a mode change, a new session grant). */
  async refreshRules() {
    const root = this.rootThread
    await root.applyRules().catch((error) => this.bridge.log(`rules ${root.id}: ${error?.message}`))
    for (const child of this.bridge.children.values()) if (child.root === root) await child.applyRules().catch(() => {})
  }

  writeRuntime() {
    if (this.actor) return
    const root = this.rootThread
    // MiMo's MCP client never hands a server's instructions to the model: OpenClaude Desktop's (the preview auto-verify
    // workflow) go with the session's own.
    // With the user's own system prompt nothing the system wrote goes with it (root.custom.systemPrompt).
    const appToolsText = this.bridge.flavor.id === 'mimo' && !root.custom?.systemPrompt ? this.bridge.appTools?.instructions ?? null : null
    const instructions = [root.custom?.instructions, root.custom?.developer, appToolsText].filter(Boolean).join('\n\n') || null
    // An agent whose ruleset grants the mode (flavor.modeRules) keeps the rules of the mode a prompt loop
    // started in: in a read-only mode the plugin cancels file edits outside the plan folders at once.
    const editGuard = this.bridge.flavor.modeRules && isReadOnlyMode(root.permission.mode)
      ? { cwd: root.cwd, planDirs: this.bridge.planDirs(root.cwd), planSegment: `${path.sep}.${this.bridge.flavor.dataDir}${path.sep}plans${path.sep}` }
      : null
    const runtime = {
      // A sub-agent gets the root's custom prompt too, so no built-in prose reaches it either.
      root: root.id, cwd: this.cwd, systemPrompt: root.custom?.systemPrompt ?? null, instructions: this.root ? null : instructions,
      modelParams: root.custom?.modelParams ?? null, sandbox: sandboxPolicy(root.permission, { cwd: root.cwd, tmp: this.bridge.tmpRoots }), editGuard,
      // OpenClaude Desktop's tools: the plugin names the app thread (the root, for a sub-agent) on each call of one of them.
      ...(this.bridge.appTools ? { appTools: { prefix: appToolsPrefix(this.bridge.appTools), session: root.id } } : {}),
    }
    writeAtomic(path.join(this.bridge.config.runtimeDir, 'sessions', `${safeId(this.id)}.json`), JSON.stringify(runtime))
  }

  mustStayLoaded() {
    return this.busy || Boolean(this.activeTurn) || this.pending.size > 0 || this.queue.length > 0 || [...this.bridge.children.values()].some((child) => child.root === this && (child.busy || child.activeTurn))
  }

  // ---------------------------------------------------------------- input

  async parts(input) {
    const parts = []
    let command = null
    for (const item of Array.isArray(input) ? input : []) {
      if (item?.type === 'text' && typeof item.text === 'string') parts.push({ type: 'text', text: item.text })
      else if (item?.type === 'localImage' && typeof item.path === 'string') parts.push({ type: 'file', mime: mimeOf(item.path, 'image/png'), filename: path.basename(item.path), url: pathUrl(item.path) })
      else if (item?.type === 'image' && typeof item.url === 'string') parts.push({ type: 'file', mime: /^data:([^;]+);/.exec(item.url)?.[1] ?? 'image/png', filename: 'image', url: item.url })
      else if (item?.type === 'mention' && typeof item.path === 'string') {
        let directory = false
        try { directory = fs.statSync(item.path).isDirectory() } catch {}
        parts.push({ type: 'file', mime: directory ? 'application/x-directory' : mimeOf(item.path, 'text/plain'), filename: item.name || path.basename(item.path), url: pathUrl(item.path) })
      } else if (item?.type === 'skill' && typeof item.name === 'string') {
        // A slash command: the agent's own or an MCP prompt (command:<name>), or one the user wrote, listed with its file.
        const file = String(item.path ?? '')
        if (file.startsWith('command:')) command = file.slice(8)
        else if (file.endsWith('.md') && !file.endsWith('SKILL.md')) command = item.name
        else parts.push({ type: 'text', text: `Use the "${item.name}" skill for this request: load it with the skill tool first.`, synthetic: true })
      }
    }
    if (!parts.some((part) => part.type === 'text' || part.type === 'file') && !command) throw invalidParams('The message is empty.')
    return { parts, command }
  }

  /** The OpenCode variant of the selected effort for the thread's model (undefined: the provider default). */
  variant() {
    if (this.agentRun?.variant) return this.agentRun.variant
    const entry = this.bridge.catalog.cached?.entries?.find((candidate) => candidate.id === this.turnModel())
    return variantOf(this.effort, entry)
  }

  /** The model a turn runs on: the agent's own (agentModel), else the thread's. */
  /** The OpenCode agent this thread's turns run (a sub-agent thread follows its root). */
  agentName() {
    const owner = this.root ?? this
    return agentFor(owner.permission, owner.primaryAgent ?? owner.agentChoice ?? 'build')
  }

  turnModel() { return this.agentRun?.model ?? this.model }

  /**
   * OpenCode picks a model per agent (tui context/local.tsx): the user's pick for that agent, else the agent's
   * configured model (agent.<name>.model, with its variant), else the default. The bridge sends the thread's model
   * on every prompt, which would always win (prompt.ts: input.model ?? agent.model), so it resolves the same order:
   * a model chosen in the composer since the last turn is the user's pick for the agent that runs; otherwise the
   * agent's configured model runs and the turn says so (model/rerouted).
   */
  async resolveAgentModel() {
    const agent = this.agentName()
    const state = (this.agentModels ??= { lastRequested: null, picks: {} })
    const requested = this.model
    if (state.lastRequested !== null && requested && requested !== state.lastRequested) state.picks[agent] = requested
    state.lastRequested = requested
    this.agentRun = null
    if (state.picks[agent]) return
    const config = await this.bridge.mergedConfig(this.cwd)
    const entry = isRecord(config?.agent?.[agent]) ? config.agent[agent] : null
    const configured = typeof entry?.model === 'string' && splitModel(entry.model) ? entry.model : null
    if (!configured || configured === requested) {
      if (configured && typeof entry.variant === 'string' && entry.variant) this.agentRun = { model: configured, variant: entry.variant }
      return
    }
    this.agentRun = { model: configured, variant: typeof entry.variant === 'string' && entry.variant ? entry.variant : null }
  }

  promptBody(parts, { format } = {}) {
    const model = splitModel(this.turnModel() ?? '')
    const variant = this.variant()
    return { parts, ...(model ? { model: { providerID: model.providerID, modelID: model.modelID } } : {}), agent: this.agentName(), ...(variant ? { variant } : {}), ...(format ? { format } : {}) }
  }

  /** A steer always uses prompt_async (it joins the running loop); a new turn the flavor's route. */
  promptRoute(kind = 'turn') { return `/session/${encodeURIComponent(this.sessionID)}/${kind !== 'steer' && this.flavor.promptRoute === 'message' ? 'message' : 'prompt_async'}` }

  /** Post one prompt and wait for the user message it created (its id is the turn id). */
  async post(kind, input, route, body, extra = {}) {
    const expectation = { kind, ...extra }
    const created = new Promise((resolve, reject) => { expectation.resolve = resolve; expectation.reject = reject })
    this.expect.push(expectation)
    // A synchronous route (command, MiMo's /message) stays open until the loop ends.
    const long = kind === 'command' || kind === 'review' || route.endsWith('/message')
    const posting = this.bridge.api('POST', route, { directory: this.cwd, body, timeout: long ? 12 * 3600000 : 60000 })
    posting.catch((error) => this.failExpectation(kind, error, expectation))
    // Taken off the queue too: left at its head, it would claim the next turn's user message.
    const timer = setTimeout(() => {
      const index = this.expect.indexOf(expectation)
      if (index >= 0) this.expect.splice(index, 1)
      expectation.reject?.(new RpcError(-32000, `${this.flavor.name} did not accept the message.`))
    }, USER_MESSAGE_TIMEOUT_MS)
    try {
      const info = await created
      if (input) this.store.rememberInput(this.id, info.id, input)
      this.projector.meta = this.store.get(this.id)
      return info
    } finally { clearTimeout(timer) }
  }

  failExpectation(kind, error, expectation) {
    const index = expectation ? this.expect.indexOf(expectation) : this.expect.findIndex((entry) => entry.kind === kind)
    if (index >= 0) {
      const [entry] = this.expect.splice(index, 1)
      entry.reject?.(error instanceof RpcError ? error : new RpcError(-32000, error?.message || String(error)))
      return
    }
    // The request failed after its turn started (a command or summarize): the turn shows it.
    if (this.activeTurn) {
      this.turnError = { message: error?.message || String(error), codexErrorInfo: 'other', additionalDetails: null, misalignment: null }
      if (!this.busy) this.finishTurn()
    }
  }

  async startTurn(params) {
    if (this.busy || this.activeTurn || this.startingTurn) throw new RpcError(-32600, 'A turn is already running. Steer it or queue the message.', { codexErrorInfo: { activeTurnNotSteerable: { turnKind: 'regular' } } })
    // Claimed until its user message arrives (onMessage sets activeTurn): another start meanwhile would post a prompt too.
    this.startingTurn = true
    try { return await this.beginTurn(params) } finally { this.startingTurn = false }
  }

  async beginTurn(params) {
    await this.applyParams(params)
    // Picks up edits of the user's own permission config since the last turn (PATCHed only when the rules changed).
    await this.applyRules().catch((error) => this.bridge.log(`rules ${this.id}: ${error?.message}`))
    await this.bridge.catalog.load().catch(() => {})
    await this.bridge.loadCompaction(this.cwd).catch(() => {})
    const { parts, command } = await this.parts(params.input)
    // A command that runs MiMo's workflow tool (deep-research) while the thread withholds the tool (Dynamic workflows off,
    // or OpenClaude Desktop's engine chosen): refused before the model starts a turn it cannot finish.
    if (command && this.bridge.flavor.id === 'mimo' && this.rootThread.dynamicWorkflows !== true) {
      const entry = await this.bridge.api('GET', '/command', { directory: this.cwd }).then((list) => (Array.isArray(list) ? list : []).find((candidate) => candidate?.name === command), () => null)
      if (this.bridge.commandNeedsWorkflowTool(entry)) throw new RpcError(INVALID_PARAMS, `/${command} runs a MiMo workflow. Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo's own workflow engine, to use it.`)
    }
    this.primaryAgent = await this.bridge.primaryAgent(this.cwd, this.agentChoice).catch(() => 'build')
    await this.resolveAgentModel().catch((error) => this.bridge.log(`agent model ${this.id}: ${error?.message}`))
    const format = isRecord(params.outputSchema) ? { type: 'json_schema', schema: params.outputSchema } : undefined
    const firstText = parts.find((part) => part.type === 'text' && !part.synthetic)?.text ?? ''
    if (!this.store.get(this.id).preview && firstText) this.store.update(this.id, { preview: firstText.slice(0, 200) })
    this.held = true
    let info
    try {
      if (command) {
        const args = firstText.replace(new RegExp(`^\\s*/${command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\s*`), '')
        const model = this.turnModel() ?? ''
        const variant = this.variant()
        info = await this.post('command', params.input, `/session/${encodeURIComponent(this.sessionID)}/command`, { command, arguments: args, agent: this.agentName(), ...(model ? { model } : {}), ...(variant ? { variant } : {}), parts: parts.filter((part) => part.type === 'file') })
      } else info = await this.post('turn', params.input, this.promptRoute(), this.promptBody(parts, { format }))
      if (format && this.bridge.flavor.repairStructured !== false) this.store.addTo(this.sessionID, 'structured', info.id)
    } catch (error) {
      this.release()
      throw error
    }
    this.lastActivity = Date.now()
    this.store.update(this.id, { lastActivity: this.lastActivity })
    const turn = { id: info.id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(info.time?.created ?? Date.now()), completedAt: null, durationMs: null }
    setImmediate(() => {
      this.announceTurn(info)
      // The agent's configured model ran instead of the composer's: said once per change (model/rerouted).
      if (this.agentRun && this.agentRun.model !== this.model) {
        const key = `${this.agentName()}:${this.model}:${this.agentRun.model}`
        if (this.reroutedKey !== key) { this.reroutedKey = key; this.emit('model/rerouted', { threadId: this.id, turnId: info.id, fromModel: this.model ?? '', toModel: this.agentRun.model, reason: 'agentConfig' }) }
      }
      this.release()
    })
    return { turn }
  }

  /** turn/started + the userMessage item, after the turn/start response line. */
  announceTurn(info, extraItems = []) {
    const turnId = info.id
    this.emit('turn/started', { threadId: this.id, turn: { id: turnId, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(info.time?.created ?? Date.now()), completedAt: null, durationMs: null } })
    // The remembered Codex input (post → rememberInput) is read from the store itself: a reload running meanwhile may
    // have left the projector an older copy, and the item would lose an attached image.
    this.projector.meta = this.store.get(this.id)
    const entry = this.projector.messages.get(info.id) ?? { info, parts: [] }
    const items = [this.projector.userItem(entry), ...extraItems]
    for (const item of items) {
      this.items.set(item.id, { started: true, completed: true })
      this.emit('item/started', { item, threadId: this.id, turnId, startedAtMs: Date.now() })
      this.emit('item/completed', { item, threadId: this.id, turnId, completedAtMs: Date.now() })
    }
    this.publishStatus()
  }

  async steer(params) {
    const active = this.activeTurn
    if (!active || (params.expectedTurnId && params.expectedTurnId !== active.id) || active.kind === 'compaction')
      throw new RpcError(-32600, 'No active turn to steer.', { codexErrorInfo: { activeTurnNotSteerable: { turnKind: active?.kind === 'compaction' ? 'compact' : 'regular' } } })
    const { parts } = await this.parts(params.input)
    this.held = true
    let info
    try { info = await this.post('steer', params.input, this.promptRoute('steer'), this.promptBody(parts)) } catch (error) { this.release(); throw error }
    this.store.addTo(this.id, 'steers', info.id)
    this.projector.meta = this.store.get(this.id)
    setImmediate(() => {
      const entry = this.projector.messages.get(info.id) ?? { info, parts: [] }
      // The client's clientUserMessageId on the steered message: the app clears its "sending after the next step" entry.
      const item = { ...this.projector.userItem(entry), ...(typeof params.clientUserMessageId === 'string' && params.clientUserMessageId ? { clientId: params.clientUserMessageId.slice(0, 200) } : {}) }
      this.items.set(item.id, { started: true, completed: true })
      this.emit('item/started', { item, threadId: this.id, turnId: active.id, startedAtMs: Date.now() })
      this.emit('item/completed', { item, threadId: this.id, turnId: active.id, completedAtMs: Date.now() })
      this.release()
    })
    return { turnId: active.id }
  }

  async review(params) {
    if (this.busy || this.activeTurn) throw new RpcError(-32600, 'Wait for the current turn to finish before starting a review.')
    await this.applyParams(params)
    const target = params.target ?? { type: 'uncommittedChanges' }
    const args = reviewArguments(target)
    const label = reviewLabel(target)
    await this.bridge.catalog.load().catch(() => {})
    await this.bridge.loadCompaction(this.cwd).catch(() => {})
    const variant = this.variant()
    this.held = true
    // A review is read-only whatever the session's mode (the app's Review dialog says so: capabilities.reviewReadOnly):
    // the turn runs as OpenCode's plan agent under the bridge's 'review' mode (read-only rules and sandbox), and the
    // session's own permission comes back when the turn ends (finishTurn).
    const restore = isReadOnlyMode(this.permission.mode) ? null : this.permission
    if (restore) {
      this.setPermission({ ...restore, mode: 'review', sandbox: 'read-only' })
      this.reviewRestore = { review: this.permission, previous: restore }
      this.writeRuntime()
      await this.refreshRules()
    }
    let info
    try {
      info = await this.post('review', null, `/session/${encodeURIComponent(this.sessionID)}/command`, { command: 'review', arguments: args, agent: 'plan', ...(this.model ? { model: this.model } : {}), ...(variant ? { variant } : {}) })
    } catch (error) { await this.endReview(); this.release(); throw error }
    const reviews = { ...(this.store.get(this.id).reviews ?? {}), [info.id]: { label } }
    this.store.update(this.id, { reviews })
    this.projector.meta = this.store.get(this.id)
    const turn = { id: info.id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(info.time?.created ?? Date.now()), completedAt: null, durationMs: null }
    setImmediate(() => { this.announceTurn(info, [{ type: 'enteredReviewMode', id: `${info.id}-review`, review: label }]); this.release() })
    return { turn, reviewThreadId: this.id }
  }

  async interrupt() {
    for (const entry of [...this.pending.values()]) entry.abort('Turn interrupted.')
    this.interrupted = true
    await this.bridge.api('POST', `/session/${encodeURIComponent(this.sessionID)}/abort`, { directory: this.cwd }).catch((error) => this.bridge.log(`abort ${this.id}: ${error?.message}`))
    // A turn whose session is already idle (aborted before it started) closes here.
    const turnId = this.activeTurn?.id
    setTimeout(() => { if (turnId && this.activeTurn?.id === turnId && !this.busy) this.finishTurn() }, 1500)
  }

  // ---------------------------------------------------------------- queue

  queueChanged() {
    this.store.update(this.id, { queue: this.queue.length ? this.queue : undefined })
    this.emit('thread/queue/changed', { threadId: this.id })
  }

  queueEntry(entry) { return { id: entry.id, input: entry.input, clientUserMessageId: entry.clientUserMessageId ?? null } }

  queueAdd(params) {
    const entry = { id: randomUUID(), input: params.input, clientUserMessageId: typeof params.clientUserMessageId === 'string' ? params.clientUserMessageId : null }
    this.queue.push(entry)
    this.queueChanged()
    if (!this.busy && !this.activeTurn && !this.startingTurn) setImmediate(() => this.startNext())
    return { queuedSubmission: this.queueEntry(entry) }
  }

  queueList() { return { data: this.queue.map((entry) => this.queueEntry(entry)), nextCursor: null } }

  queueDelete(id) {
    const index = this.queue.findIndex((entry) => entry.id === id)
    if (index < 0) throw invalidParams('That queued message already started.')
    this.queue.splice(index, 1)
    this.queueChanged()
    return {}
  }

  queueUpdate(id, input) {
    const entry = this.queue.find((candidate) => candidate.id === id)
    if (!entry) throw invalidParams('That queued message already started.')
    entry.input = input
    this.queueChanged()
    return { queuedSubmission: this.queueEntry(entry) }
  }

  queueReorder(ids) {
    const byId = new Map(this.queue.map((entry) => [entry.id, entry]))
    if (!Array.isArray(ids) || ids.length !== byId.size || !ids.every((id) => byId.has(id)) || new Set(ids).size !== ids.length) throw invalidParams('queuedSubmissionIds must list every queued message exactly once.')
    this.queue = ids.map((id) => byId.get(id))
    this.queueChanged()
    return {}
  }

  async queueStart(id) {
    const index = id ? this.queue.findIndex((entry) => entry.id === id) : 0
    const entry = this.queue[index]
    if (!entry) throw new RpcError(-32600, this.queue.length ? 'That queued message already started.' : 'The queue is empty.')
    this.queue.splice(index, 1)
    this.queueChanged()
    if (this.activeTurn) await this.steer({ input: entry.input, expectedTurnId: this.activeTurn.id, clientUserMessageId: entry.clientUserMessageId })
    else await this.startTurn({ input: entry.input })
    return {}
  }

  startNext() {
    if (this.closed || this.busy || this.activeTurn || this.startingTurn || !this.queue.length || this.pausedQueue) return
    const entry = this.queue.shift()
    this.queueChanged()
    void this.startTurn({ input: entry.input }).catch((error) => {
      this.bridge.log(`queued turn ${this.id}: ${error?.message}`)
      this.queue.unshift(entry)
      this.queueChanged()
    })
  }

  // ---------------------------------------------------------------- live events

  /** MiMo: a sub-agent actor's events share the session; they go to the actor's thread. */
  actorFor(type, props) {
    if (this.root || this.flavor.id !== 'mimo') return null
    let agent = null
    if (type === 'actor.registered' || type === 'actor.status') agent = props.actorID
    else if (type === 'message.updated') { agent = props.info?.agentID ?? null; if (props.info?.id && agent) this.messageAgents.set(props.info.id, agent) }
    else if (type === 'message.part.updated') agent = this.messageAgents.get(props.part?.messageID) ?? null
    else if (type === 'message.part.delta') agent = this.messageAgents.get(props.messageID) ?? null
    else if (type === 'permission.asked' || type === 'question.asked') agent = this.messageAgents.get(props.tool?.messageID) ?? null
    if (!agent || agent === 'main') return null
    // The main thread keeps what it needs of its actors: their messages' tokens and how each one stands.
    if (type === 'message.updated') this.projector.noteSlice(props.info)
    else if (type === 'message.part.updated' && props.part?.type === 'text') this.projector.noteSlice(null, props.part)
    else if (type === 'actor.status') {
      const state = props.status === 'running' || props.status === 'pending' ? 'running'
        : props.lastOutcome === 'success' ? 'completed' : props.lastOutcome === 'failure' ? 'failed' : props.lastOutcome === 'cancelled' ? 'cancelled' : null
      if (state) this.projector.actorStates.set(agent, { state, error: actorErrorLine(props.error) })
    }
    const id = actorThreadId(this.id, agent)
    let child = this.bridge.children.get(id)
    if (!child) {
      const registered = type === 'actor.registered' ? props : null
      const info = { id, parentID: this.id, directory: this.cwd, title: registered?.description ? `${registered.description} (@${registered.agent ?? agent})` : agent, time: { created: Date.now(), updated: Date.now() } }
      child = new LiveThread(this.bridge, { info, root: this.rootThread, parent: this, actor: agent })
      child.projector.load([])
      this.bridge.children.set(id, child)
      this.store.update(id, { cwd: this.cwd, parent: this.id, root: this.rootThread.id, agentLabel: child.nickname })
      this.linkActor(agent, id)
      this.bridge.notify('thread/started', { thread: child.threadObject() })
      child.publishStatus({ type: 'active', activeFlags: [] })
    }
    return child
  }

  linkActor(agent, childId) {
    for (const message of [...this.projector.messages.values()].reverse()) {
      for (const part of message.parts) {
        if (part.type === 'tool' && part.tool === 'actor' && (part.state?.metadata?.actorId === agent || !part.state?.metadata?.actorId) && part.state?.status !== 'completed') {
          this.projector.children.set(part.id, childId)
          this.onPart(part)
          return
        }
      }
    }
  }

  onEvent(type, props) {
    const actor = this.actorFor(type, props)
    if (actor) {
      if (type === 'actor.status') return actor.onStatus({ type: props.status === 'running' || props.status === 'pending' ? 'busy' : 'idle' })
      if (type === 'actor.registered') return
      return actor.onEvent(type, props)
    }
    switch (type) {
      case 'message.updated': return this.onMessage(props.info)
      case 'message.part.updated': return this.onPart(props.part)
      case 'message.part.delta': {
        const part = this.projector.appendDelta(props.messageID, props.partID, props.field, props.delta ?? '')
        if (part) this.onPart(part, { delta: props.delta })
        return
      }
      case 'message.removed': this.projector.removeMessage(props.messageID); return
      case 'session.status': return this.onStatus(props.status)
      case 'session.idle': return this.onStatus({ type: 'idle' })
      case 'session.error': {
        const error = props.error
        if (!error || error.name === 'MessageAbortedError') return
        this.turnError = errorInfoOf(error)
        this.emit('error', { error: this.turnError, willRetry: false, threadId: this.id, turnId: this.activeTurn?.id ?? '' })
        return
      }
      case 'session.updated': {
        const previous = this.info.title
        this.info = props.info
        this.projector.revert = props.info.revert ?? null
        if (props.info.title !== previous && !placeholderTitle(props.info.title, this.store.get(this.id)) && !this.store.get(this.id).name) this.emit('thread/name/updated', { threadId: this.id, threadName: props.info.title })
        return
      }
      case 'session.deleted': return
      case 'permission.asked': return void this.onPermission(props).catch((error) => this.bridge.log(`permission ${props.id}: ${error?.stack || error}`))
      case 'permission.replied': this.pendingFor(props.requestID)?.abort('Answered.'); return
      case 'question.asked': return void this.onQuestion(props).catch((error) => this.bridge.log(`question ${props.id}: ${error?.stack || error}`))
      case 'question.replied':
      case 'question.rejected': this.pendingFor(props.requestID)?.abort('Answered.'); return
      case 'workflow.started':
      case 'workflow.phase':
      case 'workflow.finished': return this.onWorkflowEvent(type, props)
      case 'todo.updated': {
        const turnId = this.activeTurn?.id ?? this.turns().at(-1)?.id ?? ''
        this.emit('turn/plan/updated', { threadId: this.id, turnId, explanation: null, plan: planOf(props.todos) })
        return
      }
      default:
    }
  }

  pendingFor(requestID) {
    for (const entry of this.pending.values()) if (entry.agentRequest === requestID) return entry
    return null
  }

  onMessage(info) {
    if (!info?.id) return
    const known = this.projector.messages.has(info.id)
    this.projector.upsertMessage(info)
    if (info.role === 'user') {
      if (known || this.repairing?.has(info.id)) return
      const expectation = this.expect.shift()
      if (expectation) {
        if (expectation.kind === 'steer') this.turnOf.set(info.id, this.activeTurn?.id ?? info.id)
        else {
          this.turnOf.set(info.id, info.id)
          this.activeTurn = { id: info.id, startedMs: info.time?.created ?? Date.now(), kind: expectation.kind }
          this.turnError = null
          this.interrupted = false
          this.forceStatus = null
          if (expectation.kind === 'compaction') {
            setImmediate(() => {
              this.emit('turn/started', { threadId: this.id, turn: { id: info.id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(info.time?.created ?? Date.now()), completedAt: null, durationMs: null } })
              this.publishStatus()
            })
          }
        }
        expectation.resolve?.(info)
        return
      }
      if (this.activeTurn) { this.turnOf.set(info.id, this.activeTurn.id); return }
      // A turn nobody here started (a sub-agent's prompt, another client): announce it.
      this.turnOf.set(info.id, info.id)
      this.activeTurn = { id: info.id, startedMs: info.time?.created ?? Date.now(), kind: 'external', announcedUser: false }
      this.turnError = null
      this.emit('turn/started', { threadId: this.id, turn: { id: info.id, items: [], itemsView: 'notLoaded', status: 'inProgress', error: null, startedAt: seconds(info.time?.created ?? Date.now()), completedAt: null, durationMs: null } })
      this.publishStatus()
      return
    }
    const turnId = this.turnOf.get(info.parentID) ?? this.activeTurn?.id
    if (turnId) this.turnOf.set(info.id, turnId)
    if (info.structured !== undefined && info.time?.completed) {
      const item = { type: 'agentMessage', id: `${info.id}-structured`, text: JSON.stringify(info.structured), phase: null, memoryCitation: null, delivery: null, questions: null }
      this.emitItem(turnId, item, { done: true })
    }
    if (info.time?.completed && info.tokens && !this.usageSeen?.has(info.id)) {
      const breakdown = tokenBreakdown(info.tokens)
      if (breakdown.totalTokens) {
        this.usageSeen ??= new Set()
        this.usageSeen.add(info.id)
        addBreakdown(this.totals, breakdown)
        this.emit('thread/tokenUsage/updated', { threadId: this.id, turnId: turnId ?? '', tokenUsage: this.tokenUsage(breakdown) })
      }
    }
  }

  onPart(part) {
    if (!part?.messageID) return
    this.scrubSessionArg(part)
    const message = this.projector.upsertPart(part)
    if (message.info.role === 'user') {
      // The prompt of a turn another client started.
      const turn = this.activeTurn
      if (turn?.kind === 'external' && !turn.announcedUser && turn.id === message.info.id && part.type === 'text' && (!part.synthetic || part.metadata?.origin?.kind === 'cron')) {
        turn.announcedUser = true
        const item = this.projector.userItem(message)
        this.items.set(item.id, { started: true, completed: true })
        this.emit('item/started', { item, threadId: this.id, turnId: turn.id, startedAtMs: Date.now() })
        this.emit('item/completed', { item, threadId: this.id, turnId: turn.id, completedAtMs: Date.now() })
      }
      if (part.type === 'compaction') {
        const turnId = this.turnOf.get(message.info.id) ?? this.activeTurn?.id
        this.emitItem(turnId, { type: 'contextCompaction', id: part.id }, { done: false })
      }
      return
    }
    const turnId = this.turnOf.get(message.info.id) ?? this.turnOf.get(message.info.parentID) ?? this.activeTurn?.id
    if (!turnId) return
    if (part.type === 'tool' && part.tool === 'StructuredOutput') return
    const items = this.projector.itemsOf(part, message)
    if (!items.length) return
    const done = part.type === 'tool' ? ['completed', 'error'].includes(part.state?.status) : Boolean(part.time?.end)
    if (items.length > 1 || isExecScript(part)) this.emitExec(turnId, part, items, done)
    else this.emitItem(turnId, items[0], { done })
    if (part.type === 'tool' && part.tool === 'task' && this.flavor.id === 'mimo' && done) void this.mimoTasks(turnId)
    if (items[0]?.workflowRun?.runId) this.watchWorkflow(items[0].workflowRun.runId, part, items[0].workflowRun)
    // The model resumed a run an earlier call of this thread started (its resume call is a tool row): that card follows it.
    if (part.type === 'tool' && part.tool === 'workflow' && this.flavor.id === 'mimo' && part.state?.input?.operation === 'resume' && part.state.status === 'completed'
      && typeof part.state.input.run_id === 'string' && /"resumed"\s*:\s*true/.test(String(part.state.output ?? '')) && !this.projector.workflowResumed.has(part.state.input.run_id)) {
      this.projector.workflowResumed.add(part.state.input.run_id)
      this.trackWorkflow(part.state.input.run_id)
    }
  }

  /**
   * A MiMo workflow run (its tool part, once metadata.runID names it): while it runs its structure tree (GET
   * /workflows/:runID/structure: phases, each agent under the phase it started in, model, duration) is fetched every
   * second, and once more when it settles; the run's item is re-announced with it (projection.js mimoWorkflowRun). A run
   * that goes on after its call ended (async, resumed: run.background) also reads MiMo's run list and its transcript,
   * until the list says it ended.
   */
  watchWorkflow(runID, part, run) {
    this.workflowParts ??= new Map()
    const known = this.workflowParts.get(runID)
    const done = run.status !== 'running'
    this.workflowParts.set(runID, { messageID: part.messageID, partID: part.id, done, follow: run.background === true })
    if (done) {
      if (!known?.done) void this.fetchWorkflows([runID]).finally(() => { if (this.workflowParts?.get(runID)?.done) this.workflowParts.delete(runID) })
      return
    }
    this.ensureWorkflowTimer()
  }

  ensureWorkflowTimer() {
    if (this.workflowTimer || this.closed) return
    this.workflowTimer = setInterval(() => {
      const live = [...(this.workflowParts?.entries() ?? [])].filter(([, entry]) => !entry.done).map(([id]) => id)
      if (!live.length || this.closed) { clearInterval(this.workflowTimer); this.workflowTimer = null; return }
      if (this.workflowPolling) return
      this.workflowPolling = true
      void this.fetchWorkflows(live).finally(() => { this.workflowPolling = false })
    }, 1000)
    this.workflowTimer.unref?.()
  }

  async fetchWorkflows(runIDs) {
    // MiMo's run list once for every followed run (status, counters, phase), before their structures.
    if (runIDs.some((runID) => this.workflowParts?.get(runID)?.follow)) await this.refreshWorkflowRuns()
    for (const runID of runIDs) {
      const followed = this.workflowParts?.get(runID)?.follow === true
      let nodes
      try {
        nodes = (await this.bridge.api('GET', `/workflows/${encodeURIComponent(runID)}/structure`, { directory: this.cwd }))?.nodes
      } catch (error) { this.bridge.log(`workflow structure ${runID}: ${error?.message ?? error}`); if (!followed) continue }
      if (this.closed) return
      // Empty: the runtime no longer holds the run (MiMo restarted); the part's own counters stand.
      if (Array.isArray(nodes) && nodes.length) {
        this.projector.workflowStructures.set(runID, nodes)
        this.workflowHeld.add(runID)
        this.workflowGone.delete(runID)
      } else if (Array.isArray(nodes)) { this.workflowHeld.delete(runID); this.workflowGone.add(runID) }
      if (!(Array.isArray(nodes) && nodes.length) && !followed) continue
      if (followed) {
        try {
          const transcript = (await this.bridge.api('GET', `/workflows/${encodeURIComponent(runID)}/transcript`, { directory: this.cwd }))?.transcript
          if (Array.isArray(transcript) && transcript.length) this.projector.workflowTranscripts.set(runID, transcript)
        } catch (error) { this.bridge.log(`workflow transcript ${runID}: ${error?.message ?? error}`) }
      }
      this.announceWorkflow(runID)
    }
  }

  /** Re-announce a watched run's item as projected now; a run that went live again is polled again. */
  announceWorkflow(runID) {
    const entry = this.workflowParts?.get(runID)
    const message = entry && this.projector.messages.get(entry.messageID)
    const part = message?.parts.find((candidate) => candidate.id === entry.partID)
    if (!part) return
    const item = this.projector.itemOf(part, message)
    const turnId = this.turnOf.get(message.info.id) ?? this.turnOf.get(message.info.parentID) ?? this.turns().find((turn) => turn.items.some((candidate) => candidate.id === part.id))?.id
    if (!item?.workflowRun) return
    entry.done = item.workflowRun.status !== 'running'
    entry.follow = item.workflowRun.background === true
    if (!entry.done) this.ensureWorkflowTimer()
    if (turnId) this.emitItem(turnId, item, { done: ['completed', 'error'].includes(part.state?.status) })
  }

  /** MiMo's run list for this session (GET /workflows?sessionID=; top-level runs: the nested ones are their agents). */
  async refreshWorkflowRuns() {
    if (this.bridge.flavor.id !== 'mimo') return
    let rows
    try { rows = await this.bridge.api('GET', '/workflows', { directory: this.cwd, query: { sessionID: this.sessionID } }) } catch (error) { this.bridge.log(`workflow list ${this.sessionID}: ${error?.message ?? error}`); return }
    if (!Array.isArray(rows)) return
    for (const row of rows) if (row && typeof row.runID === 'string' && MIMO_TOP_RUN.test(row.runID)) this.projector.workflowRuns.set(row.runID, row)
  }

  /** The tool part whose item is a run's card (projection.js workflowStarters), or null. */
  workflowPartOf(runID) {
    const id = this.projector.workflowStarters().get(runID)
    if (!id) return null
    for (const message of this.projector.messages.values()) {
      const part = message.parts.find((candidate) => candidate.id === id)
      if (part) return { part, message }
    }
    return null
  }

  /** Follow a run of this thread from its card's part (a resumed run, one MiMo's events name). */
  trackWorkflow(runID) {
    const found = this.workflowPartOf(runID)
    if (!found) return
    const item = this.projector.itemOf(found.part, found.message)
    if (!item?.workflowRun?.runId) return
    const known = this.workflowParts?.get(runID)
    this.watchWorkflow(runID, found.part, item.workflowRun)
    // Already watched as settled (a resumed run): its new state now.
    if (known?.done || item.workflowRun.status === 'running') void this.fetchWorkflows([runID])
  }

  /**
   * MiMo's workflow events (workflow/events.ts) for this session's top-level runs. A run that starts again after the call
   * that started it ended was resumed (OpenClaude Desktop's Resume, the model's resume call, another client): its card follows
   * it. A phase or the run's end re-reads it at once.
   */
  onWorkflowEvent(type, props) {
    const runID = props?.runID
    if (this.bridge.flavor.id !== 'mimo' || typeof runID !== 'string' || !MIMO_TOP_RUN.test(runID)) return
    const found = this.workflowPartOf(runID)
    if (!found) return
    if (type === 'workflow.started' && ['completed', 'error'].includes(found.part.state?.status) && (found.part.state?.input?.operation ?? 'run') === 'run' && found.part.state?.input?.async !== true) {
      this.projector.workflowResumed.add(runID)
    }
    const entry = this.workflowParts?.get(runID)
    if (entry?.follow || type === 'workflow.started') this.trackWorkflow(runID)
  }

  /**
   * codeDesktop/workflow/resume: a failed or stopped top-level run (run.resumable) goes on from MiMo's journal (POST
   * /workflows/:runID/resume, MiMo's own Resume), with no model turn; its card follows it until it ends again. Only while
   * the thread offers MiMo's workflow tool (Dynamic workflows on MiMo's engine), and never in a read-only mode: the run's
   * agents can change files and run commands.
   */
  async resumeWorkflow(runId) {
    if (this.bridge.flavor.id !== 'mimo') throw new RpcError(METHOD_NOT_FOUND, `${this.bridge.flavor.name} has no workflow runs to resume.`)
    if (typeof runId !== 'string' || !runId) throw new RpcError(INVALID_PARAMS, 'runId is required')
    if (!this.workflowRunOf(runId)) await this.refreshWorkflowRuns()
    const run = this.workflowRunOf(runId)
    if (!run) throw new RpcError(INVALID_PARAMS, 'Unknown workflow run.')
    if (run.status === 'running') return { status: 'alreadyRunning' }
    if (run.resumable !== true || !run.runId) throw new RpcError(-32000, 'MiMo can’t resume this workflow run.')
    const root = this.rootThread
    if (root.dynamicWorkflows !== true) throw new RpcError(-32000, 'Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to resume this workflow.')
    if (isReadOnlyMode(root.permission.mode)) throw new RpcError(-32000, `This session is in a read-only mode (${root.permission.mode}), and a workflow’s agents can change files and run commands. Switch to another mode to resume it.`)
    let result
    try {
      result = await this.bridge.api('POST', `/workflows/${encodeURIComponent(run.runId)}/resume`, { directory: this.cwd, body: {} })
    } catch (error) { throw new RpcError(-32000, `MiMo couldn’t resume this workflow: ${error?.message ?? error}`) }
    if (result?.resumed !== true) throw new RpcError(-32000, 'MiMo couldn’t resume this workflow: it is still running, or MiMo no longer has its script.')
    this.projector.workflowResumed.add(run.runId)
    this.bridge.liveWorkflows.add(run.runId)
    this.workflowGone.delete(run.runId)
    const row = this.projector.workflowRuns.get(run.runId)
    this.projector.workflowRuns.set(run.runId, { ...(row ?? { runID: run.runId, name: run.name, running: 0, succeeded: 0, failed: 0 }), status: 'running', updatedAt: Date.now() })
    this.projector.workflowTranscripts.delete(run.runId)
    this.trackWorkflow(run.runId)
    return { status: 'resuming' }
  }

  /**
   * Stop for a run that goes on after its call (run.stopScope 'run'): MiMo cancels a run only from its own workflow tool
   * (operation 'cancel'), so the session's model is asked to call it: a turn of its own, or a steer of the running one.
   */
  async cancelWorkflowRun(run) {
    const root = this.rootThread
    if (root.dynamicWorkflows !== true) throw new RpcError(-32000, 'Turn on Dynamic workflows in Settings › Dynamic workflows, with MiMo’s own workflow engine, to stop this workflow.')
    const text = `Stop the background workflow run ${run.runId} now: call your workflow tool with {"operation": "cancel", "run_id": "${run.runId}"}, then say in one line that it was stopped. Do nothing else.`
    const input = [{ type: 'text', text, text_elements: [] }]
    if (root.busy || root.activeTurn) await root.steer({ threadId: root.id, input })
    else await root.startTurn({ threadId: root.id, input })
    return { status: 'stopping', scope: 'run' }
  }

  /** A workflow run of this thread's tool parts by its run (or call-…) id, as projected now; null if none. */
  workflowRunOf(runId) {
    const context = this.projector.context()
    for (const { parts } of this.projector.messages.values()) {
      for (const part of parts) {
        if (part.type !== 'tool' || part.tool !== 'workflow') continue
        const run = toolItem(part, context).workflowRun
        if (run && (run.id === runId || run.runId === runId)) return run
      }
    }
    return null
  }

  /**
   * MiMo's exec script and the tools it called: the script row starts first, each nested call completes on its own,
   * and the script completes last. A nested call missing from the final state (the script failed) ends as failed.
   */
  emitExec(turnId, part, items, done) {
    const [script, ...nested] = items
    this.emitItem(turnId, script, { done: false })
    for (const item of nested) this.emitItem(turnId, item, { done: done || (item.status !== undefined && item.status !== 'inProgress') })
    if (!done) return
    const prefix = `${part.id}:`
    for (const [id, state] of this.items) {
      if (!id.startsWith(prefix) || state.completed || !state.item) continue
      this.emitItem(turnId, { ...state.item, status: 'failed', ...(state.item.type === 'dynamicToolCall' ? { success: false } : {}) }, { done: true })
    }
    this.emitItem(turnId, script, { done: true })
  }

  emitItem(turnId, item, { done }) {
    if (!turnId) return
    const state = this.items.get(item.id) ?? { started: false, completed: false, len: 0, changes: null }
    this.items.set(item.id, state)
    // A workflow run's item moves with its run (item.workflowRun, a newer sequence): re-announced while it runs, and
    // after it completed when its final structure arrives later.
    const runMoved = Boolean(item.workflowRun) && item.workflowRun.sequence !== state.item?.workflowRun?.sequence
    if (state.completed) {
      if (runMoved && item.workflowRun.sequence > (state.item?.workflowRun?.sequence ?? -1)) { state.item = item; this.emit('item/completed', { item, threadId: this.id, turnId, completedAtMs: Date.now() }) }
      return
    }
    state.item = item
    const now = Date.now()
    if (!state.started) {
      state.started = true
      const initial = item.type === 'agentMessage' ? { ...item, text: '' } : item.type === 'reasoning' ? { ...item, summary: [] } : item.type === 'commandExecution' ? { ...item, aggregatedOutput: null, status: 'inProgress' } : { ...item, ...(item.status ? { status: 'inProgress' } : {}) }
      this.emit('item/started', { item: initial, threadId: this.id, turnId, startedAtMs: now })
    } else if (runMoved && !done) {
      this.emit('item/started', { item: { ...item, status: 'inProgress' }, threadId: this.id, turnId, startedAtMs: now })
    }
    if (item.type === 'agentMessage' || item.type === 'reasoning') {
      const text = item.type === 'agentMessage' ? item.text : item.summary.join('')
      if (text.length > state.len) {
        const delta = text.slice(state.len)
        state.len = text.length
        if (item.type === 'agentMessage') this.emit('item/agentMessage/delta', { threadId: this.id, turnId, itemId: item.id, delta })
        else this.emit('item/reasoning/summaryTextDelta', { threadId: this.id, turnId, itemId: item.id, delta, summaryIndex: 0 })
      }
    } else if (item.type === 'commandExecution' && item.commandActions?.[0]?.type === 'unknown') {
      const output = item.aggregatedOutput ?? ''
      if (output.length > state.len && output.startsWith(output.slice(0, state.len))) {
        this.emit('item/commandExecution/outputDelta', { threadId: this.id, turnId, itemId: item.id, delta: output.slice(state.len) })
        state.len = output.length
      }
    } else if (item.type === 'fileChange' && !done) {
      const key = JSON.stringify(item.changes)
      if (key !== state.changes && item.changes.length) { state.changes = key; this.emit('item/fileChange/patchUpdated', { threadId: this.id, turnId, itemId: item.id, changes: item.changes }) }
    }
    if (done) {
      state.completed = true
      this.emit('item/completed', { item, threadId: this.id, turnId, completedAtMs: now })
      if (item.type === 'fileChange') {
        const turn = this.turns().find((candidate) => candidate.id === turnId)
        if (turn) this.emit('turn/diff/updated', { threadId: this.id, turnId, diff: turnDiff(turn) })
      }
    }
  }

  /** MiMo's task list as the plan; true when one was sent. */
  async mimoTasks(turnId) {
    try {
      const tasks = await this.bridge.api('GET', `/session/${encodeURIComponent(this.sessionID)}/task`, { directory: this.cwd })
      const plan = taskPlanOf(Array.isArray(tasks) ? tasks : Array.isArray(tasks?.tasks) ? tasks.tasks : [])
      if (!plan.length) return false
      this.emit('turn/plan/updated', { threadId: this.id, turnId, explanation: null, plan })
      return true
    } catch { return false }
  }

  onStatus(status) {
    if (status?.type === 'busy') {
      if (!this.busy) { this.busy = true; this.publishStatus() }
      return
    }
    if (status?.type === 'retry') {
      this.busy = true
      this.emit('error', retryNotice(status, { threadId: this.id, turnId: this.activeTurn?.id ?? '' }))
      return
    }
    if (status?.type === 'idle') {
      const wasBusy = this.busy || this.activeTurn
      this.busy = false
      if (this.activeTurn) this.finishTurn()
      else if (wasBusy) this.publishStatus()
    }
  }

  /** The session's own permission after a read-only review turn (unless the user changed it meanwhile). */
  async endReview() {
    const pending = this.reviewRestore
    if (!pending) return
    this.reviewRestore = null
    if (this.permission !== pending.review) return
    this.setPermission(pending.previous)
    this.writeRuntime()
    await this.refreshRules()
  }

  /** Close the active turn: open items complete from the final history, then turn/completed. */
  finishTurn() {
    const active = this.activeTurn
    if (this.reviewRestore) void this.endReview().catch((error) => this.bridge.log(`end review ${this.id}: ${error?.message ?? error}`))
    this.busy = false
    if (!active) { this.publishStatus(); return }
    for (const entry of [...this.pending.values()]) entry.abort('Turn finished.')
    const turn = this.projector.turns({ busy: false }).find((candidate) => candidate.id === active.id)
    let status = turn?.status ?? 'completed'
    let error = turn?.error ?? null
    if (this.forceStatus) { status = this.forceStatus; error = this.turnError ?? null }
    else if (this.interrupted) { status = 'interrupted'; error = null }
    else if (this.turnError) { status = 'failed'; error = this.turnError }
    else if (status === 'interrupted') error = null
    for (const item of turn?.items ?? []) {
      const state = this.items.get(item.id)
      if (state?.completed || item.type === 'userMessage' || item.type === 'enteredReviewMode') continue
      if (item.type === 'exitedReviewMode' || item.type === 'contextCompaction' || state?.started) this.emitItem(active.id, item, { done: true })
    }
    this.activeTurn = null
    this.interrupted = false
    this.forceStatus = null
    this.turnError = null
    const completed = Date.now()
    this.lastActivity = completed
    this.store.update(this.id, { lastActivity: completed })
    this.emit('turn/completed', { threadId: this.id, turn: { id: active.id, items: [], itemsView: 'notLoaded', status, error, startedAt: seconds(active.startedMs), completedAt: seconds(completed), durationMs: Math.max(0, completed - active.startedMs) } })
    this.publishStatus()
    this.items.clear()
    if (this.root) this.publishStatus({ type: 'idle' })
    this.bridge.maybePendingReload()
    // MiMo's next-prompt prediction (experimental.predict_next_prompt, on by default; the TUI's ghost text after each
    // turn): POST /session/:id/predict, sent to the app as codeDesktop/promptSuggestion. Root sessions only, and not a
    // workflow agent's (the runner shows no composer: a model request nobody would see).
    if (this.flavor.id === 'mimo' && !this.root && !this.actor && status === 'completed' && this.bridge.clientName !== WORKFLOW_CLIENT) void this.predictNext(active.id)
    const repairs = this.actor ? [] : this.store.get(this.sessionID).structured ?? []
    const next = () => { if (status !== 'interrupted' || this.queue.length) this.startNext() }
    if (repairs.length) void Promise.all(repairs.map((id) => this.repairStructured(id).catch((error) => this.bridge.log(`structured repair ${id}: ${error?.message}`)))).finally(next)
    else setImmediate(next)
  }

  async predictNext(turnId) {
    try {
      const result = await this.bridge.api('POST', `/session/${encodeURIComponent(this.sessionID)}/predict`, { directory: this.cwd, body: {} })
      const suggestion = typeof result?.prediction === 'string' ? result.prediction.trim() : ''
      if (suggestion && !this.activeTurn) this.emit('codeDesktop/promptSuggestion', { threadId: this.id, turnId, suggestion: suggestion.slice(0, 400) })
    } catch (error) { this.bridge.log(`predict ${this.id}: ${error?.message ?? error}`) }
  }

  /**
   * OpenCode saves a call's input while the call runs (session/processor.ts, a copy taken before the plugin's
   * tool.execute.before added the session argument, or after), so a finished call of OpenClaude Desktop's own tools can keep
   * the argument in its stored part. The model never sees it (the plugin's experimental.chat.messages.transform drops
   * it from every step's history); the stored part is saved back without it once the call ended (PATCH part.update),
   * for exports, shares and other clients. MiMo runs the hook's copy and stores none.
   */
  scrubSessionArg(part) {
    const input = part.state?.input
    if (this.flavor.id !== 'opencode' || !this.bridge.appTools || part.type !== 'tool' || !['completed', 'error'].includes(part.state?.status)) return
    if (!input || typeof input !== 'object' || !(SESSION_ARG in input) || typeof part.tool !== 'string' || !part.tool.startsWith(appToolsPrefix(this.bridge.appTools))) return
    this.scrubbed ??= new Set()
    if (this.scrubbed.has(part.id)) return
    this.scrubbed.add(part.id)
    const clean = Object.fromEntries(Object.entries(input).filter(([key]) => key !== SESSION_ARG))
    const route = `/session/${encodeURIComponent(part.sessionID ?? this.sessionID)}/message/${encodeURIComponent(part.messageID)}/part/${encodeURIComponent(part.id)}`
    void this.bridge.api('PATCH', route, { directory: this.cwd, body: { ...part, state: { ...part.state, input: clean } } })
      .catch((error) => this.bridge.log(`session argument ${part.id}: ${error?.message ?? error}`))
  }

  /** A sub-agent session appeared: link it to the running task/actor item. */
  linkChild(info) {
    for (const message of [...this.projector.messages.values()].reverse()) {
      for (const part of [...message.parts].reverse()) {
        if (part.type !== 'tool' || !['task', 'actor'].includes(part.tool) || this.projector.children.has(part.id)) continue
        if (part.state?.metadata?.sessionId && part.state.metadata.sessionId !== info.id) continue
        if (part.state?.status === 'completed' || part.state?.status === 'error') continue
        this.projector.children.set(part.id, info.id)
        this.onPart(part)
        return
      }
    }
  }

  // ---------------------------------------------------------------- approvals

  /** The tool part of a call id; a call MiMo's exec script made (`<exec call id>:<seq>`) is its nested part. */
  toolPartFor(callID) {
    if (!callID) return null
    for (const message of [...this.projector.messages.values()].reverse()) {
      for (const part of message.parts) {
        if (part.type !== 'tool') continue
        if (part.callID === callID) return part
        if (isExecScript(part) && typeof part.callID === 'string' && callID.startsWith(`${part.callID}:`)) {
          const nested = execSubParts(part).find((candidate) => candidate.callID === callID)
          if (nested) return nested
        }
      }
    }
    return null
  }

  async onPermission(request) {
    const root = this.rootThread
    // MiMo asks before it publishes the call's input: wait briefly for the running state.
    const hasInput = (candidate) => candidate && Object.keys(candidate.state?.input ?? {}).length > 0
    let part = this.toolPartFor(request.tool?.callID)
    for (let attempt = 0; !hasInput(part) && request.tool?.callID && attempt < 40; attempt++) { await sleep(25); part = this.toolPartFor(request.tool.callID) }
    const tool = part?.tool
    if (typeof request.metadata?.diff === 'string' && request.tool?.callID) this.askDiffs.set(request.tool.callID, request.metadata.diff)
    const agentDirs = request.permission === 'external_directory' ? await this.bridge.agentDirs(root.cwd, root.agentName()) : []
    // A connector tool its server marks read-only needs no card (as for Codex).
    const readOnlyTool = await this.bridge.readOnlyMcpTool(this.cwd, request.permission).catch(() => false)
    const decision = decide(root.permission, request, { tool, readTools: this.bridge.readTools(), cwd: root.cwd, grants: root.sessionGrants, planDirs: this.bridge.planDirs(root.cwd), agentDirs, readOnlyTool, noUser: root.noUser() })
    const reply = (value, message) => this.bridge.api('POST', `/permission/${encodeURIComponent(request.id)}/reply`, { directory: this.cwd, body: { reply: value, ...(message ? { message } : {}) } })
      .catch((error) => this.bridge.log(`permission reply ${request.id}: ${error?.message}`))
    // OpenClaude Desktop's own tools need no card here: the app asks the user itself where it matters (as for Codex).
    if (this.bridge.appTools && typeof request.permission === 'string' && request.permission.startsWith(appToolsPrefix(this.bridge.appTools))) return reply('once')
    if (decision.action === 'allow') return reply('once')
    if (decision.action === 'reject') return reply('reject', decision.reason)
    const message = part ? this.projector.messages.get(part.messageID) : null
    const item = part && message ? this.projector.itemOf(part, message) : null
    const turnId = root.activeTurn?.id ?? this.turnOf.get(part?.messageID) ?? ''
    const itemId = part?.id ?? request.tool?.callID ?? request.id
    const isFile = item?.type === 'fileChange' || request.permission === 'edit'
    // No standing grant in Plan / chat / review: the card offers none (and decide never honours one there). Nor for a
    // repeated-call (doom loop) warning, which decide always asks again, or MiMo's forced delete confirmation: the card
    // offers only Allow once / Deny there, so "Allow for this session" never promises what the next ask would break.
    const readOnly = isReadOnlyMode(root.permission.mode)
    const grantable = !readOnly && request.permission !== 'doom_loop' && request.permission !== 'bash_delete'
    let method, params
    if (isFile) {
      method = 'item/fileChange/requestApproval'
      params = { threadId: root.id, turnId, itemId, startedAtMs: Date.now(), reason: decision.reason ?? null, grantRoot: null, changes: item?.changes ?? [], sessionGrantable: grantable, codeDesktop: { declineFeedback: true } }
    } else if (request.permission === 'mcp_sampling') {
      // A connector's model request (MiMo MCP sampling): a readable card from MiMo's own summary (which server, the model
      // that will run, what it sends, short prompt previews) instead of a shell-styled `mcp_sampling ["server"]`.
      const sampling = samplingSummary(request.metadata, request.patterns)
      method = 'item/commandExecution/requestApproval'
      params = {
        kind: 'command', threadId: root.id, turnId, itemId, startedAtMs: Date.now(), approvalId: request.id, environmentId: null, reason: decision.reason ?? null,
        command: `Model request for ${sampling.server}`, cwd: this.cwd, commandActions: [{ type: 'unknown', command: `Model request for ${sampling.server}` }],
        // 'Allow for this session' covers this connector's requests only (MiMo's always: [server]).
        sessionGrantable: grantable && Array.isArray(request.always) && request.always.length > 0,
        ...(this.root ? { childThreadId: this.id } : {}),
        codeDesktop: { declineFeedback: true, sampling },
      }
    } else {
      const command = (typeof request.metadata?.command === 'string' && request.metadata.command) || (item?.type === 'commandExecution' && item.command)
        || (request.permission === 'bash' && Array.isArray(request.patterns) && request.patterns.length ? request.patterns.join(' | ') : `${tool ?? request.permission} ${JSON.stringify(part?.state?.input ?? request.patterns ?? [])}`)
      method = 'item/commandExecution/requestApproval'
      params = {
        kind: 'command', threadId: root.id, turnId, itemId, startedAtMs: Date.now(), approvalId: request.id, environmentId: null, reason: decision.reason ?? null,
        command, cwd: item?.cwd ?? this.cwd, commandActions: item?.commandActions ?? [{ type: 'unknown', command }], sessionGrantable: grantable && Array.isArray(request.always) && request.always.length > 0,
        ...(this.root ? { childThreadId: this.id } : {}),
        // Deny may carry what to do instead (the card's optional note): OpenCode's reject with a message.
        codeDesktop: { declineFeedback: true },
      }
    }
    // A card another card's "Allow for this session" covers is settled by that grant (resolveCoveredApprovals).
    let granted = false
    const epoch = root.grantEpoch
    const covered = () => decide(root.permission, request, { tool, readTools: this.bridge.readTools(), cwd: root.cwd, grants: root.sessionGrants, planDirs: this.bridge.planDirs(root.cwd), agentDirs, readOnlyTool, noUser: root.noUser() }).action === 'allow'
    const result = await root.clientRequest(method, params, 'waitingOnApproval', request.id, { covered, granted: () => { granted = true } })
    if (granted) return reply('once')
    if (result === undefined) return reply('reject', 'The approval was cancelled.')
    const decisionValue = result?.decision
    // Kept by the bridge for this root thread; the agent only hears `once` (see policy.js).
    // A grant counts only where the card offered one and the mode did not change while it was open.
    if (isSessionDecision(decisionValue) && params.sessionGrantable && root.grantEpoch === epoch && !isReadOnlyMode(root.permission.mode)) {
      root.sessionGrants.push(sessionGrant(request))
      root.resolveCoveredApprovals()
      // MiMo's background actors read the grant from the ruleset (they never ask).
      if (this.bridge.flavor.modeRules) await root.refreshRules()
    }
    // OpenCode's own meaning (permission/index.ts reply; session/processor.ts): a reject with no message is a
    // RejectedError, which stops the loop unless experimental.continue_loop_on_deny; a reject with a message is a
    // CorrectedError, which the agent reads and continues from. A plain Deny stops; Deny with feedback corrects.
    const feedback = decisionValue === 'decline' && typeof result?.codeDesktop?.feedback === 'string' ? result.codeDesktop.feedback.trim().slice(0, 4000) : ''
    await reply(replyFor(decisionValue), feedback || undefined)
    if (decisionValue === 'cancel') void this.interrupt()
  }

  /**
   * The open approval cards of this root thread and its sub-agents that its session grants now cover: OpenCode runs a
   * step's tool calls in parallel, so several asks can be open when the user picks "Allow for this session" on one.
   * Each is withdrawn from the client and its ask answered `once`, as OpenCode's own `always` reply would have done.
   */
  resolveCoveredApprovals() {
    for (const entry of [...this.pending.values()]) {
      if (!entry.approval) continue
      let allowed = false
      try { allowed = entry.approval.covered() } catch {}
      if (!allowed) continue
      entry.approval.granted()
      entry.abort('Allowed for this session.')
    }
  }

  /**
   * One server→client request owned by this (root) thread; undefined when it was cancelled.
   * @param {{ covered: () => boolean, granted: () => void }} [approval] - for a permission card: whether the session
   *   grants now cover its ask, and what to do when they settle it instead of the user
   */
  async clientRequest(method, params, flag, agentRequest, approval = null) {
    const { id, promise } = this.bridge.transport.request(method, params)
    let settled = false
    const entry = {
      flag, agentRequest, approval,
      abort: (why = 'cancelled') => {
        if (settled) return
        settled = true
        this.bridge.transport.abandon(id, why)
        this.emit('serverRequest/resolved', { threadId: this.id, requestId: id })
      },
    }
    this.pending.set(id, entry)
    this.publishStatus()
    try {
      const result = await promise
      settled = true
      return result
    } catch {
      return undefined
    } finally {
      this.pending.delete(id)
      if (!this.closed) this.publishStatus()
    }
  }

  async onQuestion(request) {
    const root = this.rootThread
    let part = this.toolPartFor(request.tool?.callID)
    for (let attempt = 0; !part && request.tool?.callID && attempt < 20; attempt++) { await sleep(25); part = this.toolPartFor(request.tool.callID) }
    const turnId = root.activeTurn?.id ?? this.turnOf.get(part?.messageID) ?? ''
    const itemId = part?.id ?? request.tool?.callID ?? request.id
    const questions = Array.isArray(request.questions) ? request.questions : []
    const planReview = part?.tool === 'plan_exit' || (questions.length === 1 && (questions[0]?.header === 'Build Agent' || questions[0]?.key === 'plan_exit'))
    const reply = (answers) => this.bridge.api('POST', `/question/${encodeURIComponent(request.id)}/reply`, { directory: this.cwd, body: { answers } })
    const reject = () => this.bridge.api('POST', `/question/${encodeURIComponent(request.id)}/reject`, { directory: this.cwd, body: {} }).catch(() => {})
    if (root.noUser()) return this.answerUnattended(request)
    if (planReview) {
      const text = this.planText(questions[0]?.question)
      this.emitItem(turnId, { type: 'plan', id: `${itemId}-plan`, text }, { done: true })
      const response = await root.clientRequest('item/tool/requestUserInput', {
        threadId: root.id, turnId, itemId,
        questions: [{ id: 'plan-review', header: 'Plan', question: 'Implement this plan?', isOther: true, isSecret: false, multiSelect: false, options: [{ label: 'Approve', description: 'Leave Plan mode and implement the plan' }, { label: 'Keep planning', description: 'Stay in Plan mode' }] }],
        isBlocking: true, autoResolutionMs: null,
      }, 'waitingOnUserInput', request.id)
      const answers = response?.answers?.['plan-review']?.answers ?? []
      if (answers.length === 1 && answers[0] === 'Approve') {
        root.setPermission(afterPlanState(root.permission, response?.codeDesktop?.afterPlan))
        this.store.update(root.id, { permission: root.permission })
        root.writeRuntime()
        await root.applyRules().catch((error) => this.bridge.log(`rules after plan: ${error?.message}`))
        for (const child of this.bridge.children.values()) if (child.root === root) { child.permission = root.permission; child.writeRuntime(); await child.applyRules().catch(() => {}) }
        await reply([['Yes']])
        return
      }
      const feedback = answers.filter((answer) => answer !== 'Keep planning').join('\n').trim().slice(0, 8000)
      // MiMo's plan_exit (tool/plan.ts) keeps the turn going on anything but Yes: 'No' tells the model to ask what to
      // refine, and any other answer reaches it as the user's feedback. So typed feedback is the answer itself, and the
      // model refines the plan in the same turn. OpenCode's 'No' ends the turn (RejectedError), so the feedback runs as
      // the next message instead. (A bare "Keep planning" is 'No' on both.)
      // (A reply that fails falls back to the queue, so the feedback is never lost.)
      if (feedback && this.bridge.flavor.id === 'mimo' && !/^(yes|no)$/i.test(feedback)) {
        if (await reply([[feedback]]).then(() => true, () => false)) return
        await reject()
      } else await reply([['No']]).catch(reject)
      if (feedback) { root.queue.unshift({ id: randomUUID(), input: [{ type: 'text', text: feedback, text_elements: [] }], clientUserMessageId: null }); root.queueChanged() }
      return
    }
    const response = await root.clientRequest('item/tool/requestUserInput', {
      threadId: root.id, turnId, itemId,
      questions: questions.map((question, index) => ({
        id: `q${index}`, header: question.header ?? '', question: question.question ?? '', isOther: question.custom !== false, isSecret: false,
        multiSelect: question.multiple === true, options: (question.options ?? []).map((option) => ({ label: option.label, description: option.description ?? '' })),
      })),
      isBlocking: true, autoResolutionMs: null,
    }, 'waitingOnUserInput', request.id)
    if (!response?.answers) return reject()
    await reply(questions.map((_, index) => (response.answers[`q${index}`]?.answers ?? []).map(String))).catch(reject)
  }

  /** Answers a question no person can see (noUser): the agent hears that and carries on (a rejected question ends its turn). */
  async answerUnattended(request) {
    const questions = Array.isArray(request.questions) && request.questions.length ? request.questions : [{}]
    const answer = 'No one can answer this: the agent runs unattended. Decide yourself and continue.'
    await this.bridge.api('POST', `/question/${encodeURIComponent(request.id)}/reply`, { directory: this.cwd, body: { answers: questions.map(() => [answer]) } })
      .catch(() => this.bridge.api('POST', `/question/${encodeURIComponent(request.id)}/reject`, { directory: this.cwd, body: {} }).catch(() => {}))
  }

  /** The plan file plan_exit names (relative to the worktree), else the turn's last answer. */
  planText(question) {
    const relative = /Plan at (.+?) is complete/.exec(question ?? '')?.[1]
    if (relative) {
      for (const base of [this.cwd, '/', this.bridge.homeDir()]) {
        try { return fs.readFileSync(path.resolve(base, relative), 'utf8') } catch {}
      }
    }
    const turn = this.turns().find((candidate) => candidate.id === this.rootThread.activeTurn?.id)
    return [...(turn?.items ?? [])].reverse().find((item) => item.type === 'agentMessage')?.text ?? ''
  }

  close(reason) {
    if (this.closed) return
    clearInterval(this.workflowTimer)
    this.workflowTimer = null
    for (const entry of [...this.pending.values()]) entry.abort(reason)
    for (const expectation of this.expect.splice(0)) expectation.reject?.(new RpcError(-32000, reason))
    this.release()
    this.closed = true
  }
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf', '.svg': 'image/svg+xml' }
const mimeOf = (file, fallback) => MIME[path.extname(file).toLowerCase()] ?? fallback
const pathUrl = (file) => 'file://' + encodeURI(file).replace(/#/g, '%23').replace(/\?/g, '%3F')

/**
 * OpenCode's session.status {type:'retry', attempt, message, action?, next} (session/retry.ts, processor.ts): the
 * error notification the app shows as 'Retrying'. A usage limit (action.reason free_tier_limit / account_rate_limit,
 * which can wait for hours until retry-after) is Codex's usageLimitExceeded and a 429 its rateLimitExceeded, so the row
 * names the cause; RETRY_MAX_RETRIES is 5. codeDesktop carries what the TUI shows: when the next attempt is (next, ms)
 * and the remedy (action {title, message, label, link}).
 */
export function retryNotice(status, { threadId, turnId }) {
  const message = typeof status?.message === 'string' && status.message ? status.message : 'Retrying…'
  const reason = status?.action?.reason
  const codexErrorInfo = reason === 'free_tier_limit' || reason === 'account_rate_limit' ? 'usageLimitExceeded'
    : /\b429\b|too many requests|rate.?limit/i.test(message) ? 'rateLimitExceeded' : 'other'
  const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
  const link = text(status?.action?.link)
  const action = status?.action && typeof status.action === 'object'
    ? { title: text(status.action.title), message: text(status.action.message), label: text(status.action.label), link: link && /^https?:\/\//i.test(link) ? link : null }
    : null
  return {
    error: { message, codexErrorInfo, additionalDetails: null, misalignment: null }, willRetry: true, threadId, turnId,
    retry: { attempt: Number.isInteger(status?.attempt) && status.attempt > 0 ? status.attempt : 1, maxRetries: 5 },
    codeDesktop: { nextAt: Number.isFinite(status?.next) ? status.next : null, action },
  }
}
