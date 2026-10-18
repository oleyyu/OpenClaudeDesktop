/**
 * MiniMax Code (github.com/MiniMax-AI/minimax-code, `mcode acp`).
 *
 *   home             $MINIMAX_DATA_DIR (or $MAVIS_DATA_DIR) or ~/.minimax: config.yaml (custom
 *                    providers, default model), mcp.json, auth/, plugins/, the v2/ session database
 *   SQLite           mcode needs the native better-sqlite3 module; the GitHub release ships without
 *                    it (npm installs it), so the bridge installs the pinned version once into its
 *                    state folder and points MAVIS_SQLITE3_MODULE_PATH at it (ensureNativeDeps)
 *   system prompt    not replaceable for the primary agent: the thread's prompt and instructions go
 *                    to the global instructions file (<home>/AGENTS.md) of the thread's own home
 *   tools            config.yaml agents.default.tools (allow list) on the overlay
 *   modes            default and plan; the bridge answers permissions itself
 *   sessions         ACP list / resume / fork / close (no delete: the session stays in mcode's history)
 *   steer / queue    mcode/session/steer during a turn
 *   sub-agents       mcode/session/delegation_update snapshots: each member is a child thread (its
 *                    transcript replayed with session/load once it finished); a delegate is stopped
 *                    with mcode/session/delegation/stop on its root session
 *   models, effort   each model's thinking efforts are read at discovery (the model option switched
 *                    through on a throwaway session); a model or effort picked mid-session applies at
 *                    the next prompt (session/set_config_option)
 *   usage            usage_update {used, size} for the context fill; a turn's tokens and spend from the thread
 *                    database's local_runtime_token_usage rows (settleUsage, minimax-state.cjs)
 *   background       local_runtime_background_tasks rows still running: Background tasks, and the session stays
 *                    loaded while they run (backgroundProcesses / stopBackground)
 *   images           by path: a resource_link to the file, which mcode's read tool attaches (M3 models, image custom models)
 *   review           uncommitted changes through `mcode exec review` (its verdict and prioritised findings)
 *   sign-in          device flow (`mcode login --no-browser`); signed in = a credential file auth/<env>/<region>/<client>/auth.json
 *   per-thread files config.yaml (permissionMode default, mcode's sandbox off inside the bridge's Seatbelt, tool
 *                    switches), permission.json (Ask / Accept edits), AGENTS.md and mcp.json (minimax-config.js).
 *                    A session begun in the mcode terminal (agentHome 'real') runs in the user's home as it is: none of
 *                    these apply there, and permissionWarning says so
 */

import { execFile, execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { readJsonFile, normalizeMcpServer, scanSkills, writeJsonFile, pluginSummary, projectDirs, frontmatter } from '../catalog.js'
import { createOverlay } from '../overlay.js'
import { withoutBrowser } from '../no-browser.js'
import { threadConfigYaml, threadPermissionFile, AGENT_TOOL_IDS, topLevelBlocks, parseYamlBlock, withTopLevel, writeYamlBlock } from './minimax-config.js'
import { settingAt, withSetting } from '../catalog.js'
import { pathToFileURL } from 'node:url'

export const SQLITE_VERSION = '12.11.1'
export const RIPGREP_VERSION = '1.18.0'

/** The built-in tools config.yaml agents.default.tools can select. */
export const CONFIGURABLE_TOOLS = AGENT_TOOL_IDS

/** What a thread's MiniMax home keeps as its own (never linked to the user's home). */
const OWN_ENTRIES = ['v2', 'background-tasks', /\.sqlite(-wal|-shm)?$/, /^\.?local-runtime(?!\.auth)/]

/**
 * The switches OpenClaude Desktop's tools menu offers: only ones mcode honours (minimax-config.js threadConfigYaml):
 * agents.default.tools, the sub-agent tool and web search (features.delegation / webSearch) and the media tools
 * (agents.default.builtinTools, MiniMax's paid generation and understanding tools).
 */
export const BUILTIN_TOOLS = [
  ['read', 'Reads a file.'], ['write', 'Writes a file.'], ['edit', 'Edits a file.'], ['bash', 'Runs a shell command.'], ['grep', 'Searches file contents.'],
  ['glob', 'Finds files by pattern.'], ['todowrite', 'Keeps a todo list.'], ['web_fetch', 'Fetches a web page.'], ['web_search', 'Searches the web.'],
  ['website_deploy', 'Deploys a website to MiniMax hosting.'], ['task', 'Runs sub-agents (delegation).'], ['task_query', 'Checks on a sub-agent task.'],
  ['task_output', 'Reads a sub-agent task output.'], ['task_stop', 'Stops a sub-agent task.'],
  ['images_understand', 'MiniMax media: describes images.'], ['image_synthesize', 'MiniMax media: generates images.'],
  ['images_search_and_download', 'MiniMax media: searches and downloads images.'], ['image_reverse_search', 'MiniMax media: reverse image search.'],
  ['submit_video_generation', 'MiniMax media: starts a video generation.'], ['query_video_generation', 'MiniMax media: checks a video generation.'],
  ['gen_videos', 'MiniMax media: generates videos.'], ['batch_text_to_video', 'MiniMax media: text to video in batches.'],
  ['batch_image_to_video', 'MiniMax media: image to video in batches.'], ['get_voice_list', 'MiniMax media: lists voices.'],
  ['batch_text_to_audio', 'MiniMax media: text to audio in batches.'], ['batch_text_to_music', 'MiniMax media: text to music in batches.'],
  ['synthesize_speech', 'MiniMax media: text to speech.'], ['batch_synthesize_speech', 'MiniMax media: text to speech in batches.'],
  ['audios_understand', 'MiniMax media: describes audio.'], ['videos_understand', 'MiniMax media: describes videos.'],
  ['transcribe_audio', 'MiniMax media: transcribes audio.'],
]
const homeOf = (env) => env.MINIMAX_DATA_DIR || env.MAVIS_DATA_DIR || path.join(env.HOME || os.homedir(), '.minimax')

/**
 * The few config.yaml facts the bridge reads: defaultModel, the model source (minimaxModelSource: token_plan |
 * minimax_api_key) and whether a MiniMax API key is saved (minimax_api.apiKey), custom_provider names and their models,
 * and the configured providers (provider.<id>: an apiKey / baseURL / authMode of their own).
 */
/** mcode reads its global AGENTS.md only up to this size; a larger file is ignored whole (global-instructions.ts:48-52). */
export const MINIMAX_GLOBAL_MAX_BYTES = 32 * 1024
// OpenClaude Desktop's tools may wait on the user (an approval sheet) or a dev server's first compile: the app's own relay
// allows 10 minutes (agent-tools-server.mjs), as Codex's tool_timeout_sec=600.
const APP_TOOLS_TIMEOUT_MS = 600000
const TRUNCATED_NOTE = '[OpenClaude Desktop instructions truncated to fit MiniMax Code’s 32 KiB limit for global instructions.]'

/**
 * The thread's global AGENTS.md: the user's own file, then OpenClaude Desktop's prompt and instructions, kept within mcode's
 * 32 KiB so neither is dropped. Past it, the user's file stays whole and OpenClaude Desktop's part is cut with a note; a
 * user file over the limit by itself (mcode ignores it anyway) gives way to OpenClaude Desktop's part.
 * @returns {{text: string, truncated: boolean, ownDropped: boolean}}
 */
export function minimaxGlobalInstructions(own, prompt, max = MINIMAX_GLOBAL_MAX_BYTES) {
  const mine = String(own ?? '').trim(), ours = String(prompt ?? '')
  const join = (parts) => parts.filter(Boolean).join('\n\n')
  const bytes = (text) => Buffer.byteLength(text, 'utf8')
  const whole = join([mine, ours])
  if (bytes(whole) <= max) return { text: whole, truncated: false, ownDropped: false }
  const ownDropped = bytes(mine) + bytes(TRUNCATED_NOTE) + 4 > max
  if (ownDropped && bytes(ours) <= max) return { text: ours, truncated: false, ownDropped }
  const keep = ownDropped ? '' : mine
  const room = max - bytes(join([keep, TRUNCATED_NOTE])) - 2
  // Cut on a character boundary: a partial UTF-8 sequence decodes to U+FFFD, which is dropped.
  const cut = room > 0 ? Buffer.from(ours, 'utf8').subarray(0, room).toString('utf8').replace(/\uFFFD+$/, '').trimEnd() : ''
  return { text: join([keep, cut, TRUNCATED_NOTE]), truncated: true, ownDropped }
}

export function readMinimaxConfig(file) {
  let text = ''
  const empty = { text: '', defaultModel: null, modelSource: null, minimaxApiKey: false, providers: {}, configured: {}, keys: new Set() }
  try { text = fs.readFileSync(file, 'utf8') } catch { return empty }
  const keys = new Set()
  let defaultModel = null
  let modelSource = null
  let minimaxApiKey = false
  const providers = {}
  const configured = {}
  const lines = text.split('\n')
  let section = null, provider = null, inModels = false, model = null, modelIndent = 0, listKey = null
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    // A block list item under a custom model (modalities: input: [- text, - image]).
    const item = /^\s*-\s*["']?([A-Za-z_]+)["']?\s*$/.exec(raw)
    if (item) { if (section === 'custom_provider' && provider && model && listKey === 'input' && item[1] === 'image') providers[provider].imageModels.push(model); continue }
    const pair = /^(\s*)([A-Za-z0-9_.\-/"']+):\s*(.*)$/.exec(raw)
    if (!pair) continue
    const key = pair[2].replace(/^["']|["']$/g, '')
    const value = pair[3].replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '')
    if (indent === 0) {
      keys.add(key)
      section = key
      provider = null
      inModels = false
      if (key === 'defaultModel') defaultModel = value || null
      if (key === 'minimaxModelSource') modelSource = value || null
      continue
    }
    if (section === 'minimax_api') { if (key === 'apiKey' && value) minimaxApiKey = true; continue }
    if (section === 'provider') {
      if (indent === 2) { provider = key; configured[provider] = { apiKey: false, baseURL: false, authMode: null }; continue }
      if (!provider) continue
      if (key === 'apiKey' && value) configured[provider].apiKey = true
      if (key === 'baseURL' && value) configured[provider].baseURL = true
      if (key === 'authMode' && value) configured[provider].authMode = value
      continue
    }
    if (section !== 'custom_provider') continue
    if (indent === 2) { provider = key; providers[provider] = { models: [], imageModels: [], api: null, apiKey: false }; inModels = false; model = null; continue }
    if (!provider) continue
    if (key === 'api') providers[provider].api = value
    if (key === 'apiKey' && value) providers[provider].apiKey = true
    if (key === 'models' && indent <= 6) { inModels = true; model = null; continue }
    if (inModels && indent >= 6 && !value && (!model || indent <= modelIndent) && !['limit', 'thinking', 'capabilities', 'modalities'].includes(key)) { providers[provider].models.push(key); model = key; modelIndent = indent; listKey = null; continue }
    // A model's image input: modalities.input naming image (flow or block list), attachment / supportImage true.
    if (model && indent > modelIndent) {
      listKey = key
      if ((key === 'input' && /\bimage\b/.test(value)) || ((key === 'attachment' || key === 'supportImage' || key === 'support_image') && value === 'true')) providers[provider].imageModels.push(model)
    }
  }
  return { text, defaultModel, modelSource, minimaxApiKey, providers, configured, keys }
}

/**
 * How mcode calls models with this config (config model-availability.ts resolveModelCallRoute, for the default model's
 * provider): 'custom_provider', 'minimax_api_key' (MiniMax's API with the user's own key), 'configured_provider' (a
 * provider.<id> of the user's) or 'managed_token_plan' (the signed-in MiniMax account). {route, provider}.
 */
export function minimaxModelRoute(config) {
  const provider = /^([^/]+)\//.exec(String(config.defaultModel ?? ''))?.[1] ?? 'minimax'
  if (provider.startsWith('custom_provider:')) return { route: 'custom_provider', provider: provider.slice('custom_provider:'.length) }
  if (provider === 'minimax_api') return { route: 'minimax_api_key', provider }
  if (provider !== 'minimax') return { route: 'configured_provider', provider }
  if (config.modelSource === 'minimax_api_key') return { route: 'minimax_api_key', provider }
  const own = config.configured?.minimax
  // provider.minimax with an endpoint or key of its own and no managed-login auth mode is a provider of the user's.
  if (own && own.authMode !== 'managed-login' && (own.baseURL || own.apiKey || (own.authMode && own.authMode !== 'managed-login'))) return { route: 'configured_provider', provider }
  return { route: 'managed_token_plan', provider }
}

/** The user's MCP servers (mcp.json, else mcp/mcp.json) and the project's .mcp.json. */
function mcpServersOf(ctx, cwd) {
  const servers = new Map()
  const add = (record, source) => {
    for (const [name, value] of Object.entries(record?.mcpServers ?? {})) {
      const server = normalizeMcpServer(name, value, source)
      if (server) servers.set(name, server)
    }
  }
  const home = homeOf(ctx.env)
  add(readJsonFile(path.join(home, 'mcp.json'), null) ?? readJsonFile(path.join(home, 'mcp', 'mcp.json'), {}), 'user')
  if (cwd) add(readJsonFile(path.join(cwd, '.mcp.json'), {}), 'project')
  return [...servers.values()]
}

/**
 * MiniMax's sign-in: a credential file auth/<buildEnv>/<region>/<client>/auth.json (oauth-core namespace.ts; the only
 * credential store is that file), or the legacy auth/credentials.enc / local-runtime.auth.json. mcode creates empty auth.lock files on every start,
 * signed in or not, so a non-empty auth folder proves nothing. Returns {region} or null.
 */
/**
 * mcode's plugin error codes (local-runtime-v2 plugin/runtime/desktop-facade.ts PluginDesktopFacadeError), which it prints
 * bare on stderr, as a sentence the user can act on; any other failure is kept as it is.
 */
export function minimaxPluginError(error) {
  const text = `${error?.stderr ?? ''}\n${error?.stdout ?? ''}\n${error?.message ?? ''}`
  if (/\bPLUGIN_AUTH_REQUIRED\b/.test(text)) return Object.assign(new Error('Sign in with your MiniMax account (Settings › Account) to install or change MiniMax’s official plugins.'), { code: 'PLUGIN_AUTH_REQUIRED' })
  if (/\bPLUGIN_AUTH_SYNC_TIMEOUT\b/.test(text)) return Object.assign(new Error('MiniMax Code couldn’t confirm your MiniMax sign-in in time. Try again in a moment.'), { code: 'PLUGIN_AUTH_SYNC_TIMEOUT' })
  return error
}

export function minimaxLogin(home) {
  const auth = path.join(home, 'auth')
  const dirs = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) } catch { return [] } }
  const nonEmpty = (file) => { try { return fs.statSync(file).size > 2 } catch { return false } }
  const found = []
  for (const env of dirs(auth)) for (const region of dirs(path.join(auth, env))) for (const client of dirs(path.join(auth, env, region))) {
    if (nonEmpty(path.join(auth, env, region, client, 'auth.json'))) found.push({ env, region })
  }
  const pick = found.find((entry) => entry.env === 'prod') ?? found[0]
  if (pick) return { region: pick.region }
  if (nonEmpty(path.join(auth, 'credentials.enc')) || nonEmpty(path.join(home, 'local-runtime.auth.json'))) return { region: null }
  return null
}

const STATE_SCRIPT = path.join(path.dirname(new URL(import.meta.url).pathname), 'minimax-state.cjs')
const stateDb = (home) => path.join(home, 'v2', 'sqlite', 'runtime-state.sqlite')

/** The better-sqlite3 build mcode runs with (the bridge's native copy, else the one an npm install of mcode has). */
function sqliteModule(ctx) {
  const dir = ctx.nativeEnv?.MAVIS_SQLITE3_MODULE_PATH || ctx.env.MAVIS_SQLITE3_MODULE_PATH
  for (const from of [dir ? path.join(dir, 'package.json') : null, (() => { try { return fs.realpathSync(ctx.program.binary) } catch { return null } })()]) {
    if (!from) continue
    try { return createRequire(from).resolve('better-sqlite3') } catch {}
  }
  return null
}

/**
 * minimax-state.cjs with mcode's own Node (the native module's ABI is that Node's): reads or writes the skill and plugin
 * on/off state in mcode's databases. Null when it cannot run (no SQLite module yet).
 */
export function minimaxState(ctx, request) {
  const module = sqliteModule(ctx)
  if (!module || !ctx.program?.node) return null
  const env = { ...ctx.env }
  delete env.NODE_OPTIONS
  const out = execFileSync(ctx.program.node, [STATE_SCRIPT, module, JSON.stringify(request)], { env, timeout: 15000, maxBuffer: 4 << 20, encoding: 'utf8' })
  return JSON.parse(out)
}

/**
 * A model id as mcode's ACP lists it (m:<provider, URL-encoded>:<model>:<variant>…, e.g. m:minimax:MiniMax-M3:u or
 * m:custom_provider%3Alocal:qwen:v:thinking) or as config.yaml writes it (<provider>/<model>): {provider, model}.
 */
export function minimaxModelId(id) {
  const text = String(id ?? '')
  const acp = /^m:([^:]+):([^:]+)(?::|$)/.exec(text)
  if (acp) { try { return { provider: decodeURIComponent(acp[1]), model: decodeURIComponent(acp[2]) } } catch { return null } }
  const plain = /^([^/]+)\/(.+)$/.exec(text)
  return plain ? { provider: plain[1], model: plain[2] } : null
}

/**
 * mcode's ReviewResultV1 (review/result.ts: verdict pass | needs_changes, summary, findings with P0–P3 priority, path,
 * side and line range) as the review reply's Markdown: the verdict, the summary, then each finding by priority.
 */
export function reviewResultMarkdown(output) {
  if (typeof output === 'string') return output.trim() || 'The review finished without a summary.'
  if (!output || output.type !== 'review.result') return 'The review finished without a result.'
  const findings = (Array.isArray(output.findings) ? output.findings : []).filter((finding) => finding && typeof finding.title === 'string')
  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 }
  findings.sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))
  const where = (finding) => {
    if (finding.targetType === 'file' || !Number.isInteger(finding.startLine)) return finding.path
    const range = finding.endLine && finding.endLine !== finding.startLine ? `${finding.startLine}-${finding.endLine}` : `${finding.startLine}`
    return `${finding.path}:${range}${finding.side === 'old' ? ' (before the change)' : ''}`
  }
  const head = output.verdict === 'pass' ? '**Code review: no changes needed.**' : `**Code review: ${findings.length} finding${findings.length === 1 ? '' : 's'}.**`
  const summary = typeof output.summary === 'string' && output.summary.trim() ? output.summary.trim() : null
  const items = findings.map((finding) => `- **${finding.priority ?? 'P3'}** \`${where(finding)}\` ${finding.title.trim()}${typeof finding.content === 'string' && finding.content.trim() ? `\n\n  ${finding.content.trim().replace(/\n/g, '\n  ')}` : ''}`)
  return [head, summary, items.length ? items.join('\n') : null].filter(Boolean).join('\n\n')
}

/** minimaxState without blocking the bridge (after a turn, background refreshes); null when it cannot run. */
export function minimaxStateAsync(ctx, request) {
  const module = sqliteModule(ctx)
  if (!module || !ctx.program?.node) return Promise.resolve(null)
  const env = { ...ctx.env }
  delete env.NODE_OPTIONS
  return new Promise((resolve, reject) => execFile(ctx.program.node, [STATE_SCRIPT, module, JSON.stringify(request)], { env, timeout: 15000, maxBuffer: 4 << 20, encoding: 'utf8' }, (error, stdout) => {
    if (error) { reject(error); return }
    try { resolve(JSON.parse(stdout)) } catch (parseError) { reject(parseError) }
  }))
}

/** The database a thread's sessions live in: its own home's, or the user's for a session begun in the mcode terminal. */
function threadDb(ctx, thread) {
  if (thread?.agentHome === 'real') return stateDb(homeOf(ctx.env))
  return typeof thread?.agentHome === 'string' && thread.agentHome ? stateDb(thread.agentHome) : null
}

/**
 * A title for a session nobody sees, before its first prompt: mcode generates a title (a model call of its own, sent the
 * prompt) only for an untitled session (session-title DI.readEligibleSession), and has no switch for it.
 */
function seedTitle(ctx, db, sessionId, title) {
  if (!db || !fs.existsSync(db)) return
  try { minimaxState(ctx, { op: 'seedTitle', db, session: sessionId, title }) } catch (error) { ctx.log?.(`minimax title: ${String(error?.stderr || error?.message || error).slice(0, 300)}`) }
}

/** The sessions whose model calls a thread pays for: its own and its delegates'. */
const threadSessions = (thread) => [thread.id, ...(thread.delegates?.keys() ?? [])]

/** The running background tasks of a thread's sessions (cached on the thread: hasBackgroundWork reads it synchronously). */
async function refreshBackground(ctx, thread) {
  const db = threadDb(ctx, thread)
  if (!db || !fs.existsSync(db)) return
  const status = (thread.minimaxStatus ??= { rows: [], at: 0, refreshing: null })
  status.ctx = ctx
  if (status.refreshing) return status.refreshing
  status.refreshing = minimaxStateAsync(ctx, { op: 'status', db, sessions: threadSessions(thread), afterUsageId: Number.MAX_SAFE_INTEGER })
    .then((result) => { if (result) { status.rows = Array.isArray(result.background) ? result.background : []; status.at = Date.now() } })
    .catch((error) => ctx.log?.(`minimax background tasks: ${String(error?.message ?? error).slice(0, 300)}`))
    .finally(() => { status.refreshing = null })
  return status.refreshing
}

// ------------------------------------------------------------ turns mcode starts on its own
//
// When a background task ends (a run_in_background command, a background sub-agent), mcode wakes the session itself
// (local-runtime background-task/conversation-delivery.ts: a hidden '<background-task-finished>' turn) and the model
// reads the result, may edit files, and answers. Its ACP server streams content only inside a prompt (tui acp/agent.ts),
// so the bridge reads those turns from the thread's database (minimax-state.cjs 'turns': local_runtime_turn_ingress for
// the turns, local_runtime_message_rows for what they did) and projects them as agent turns (server.js agentTurnLog).

/** mcode's own ACP kind for a tool name (tui acp/updates.ts tuiAcpToolKind). */
export function minimaxToolKind(name) {
  const value = String(name ?? '').toLowerCase()
  if (value.includes('read') || value.includes('view')) return 'read'
  if (value.includes('edit') || value.includes('write') || value.includes('patch')) return 'edit'
  if (value.includes('delete') || value.includes('remove')) return 'delete'
  if (value.includes('move') || value.includes('rename')) return 'move'
  if (value.includes('search') || value.includes('find') || value.includes('grep')) return 'search'
  if (value.includes('fetch') || value.includes('http') || value.includes('web')) return 'fetch'
  if (value.includes('think') || value.includes('plan')) return 'think'
  if (['shell', 'bash', 'terminal', 'exec', 'command'].some((word) => value.includes(word))) return 'execute'
  return 'other'
}

const parseJsonValue = (value) => {
  if (typeof value !== 'string') return value ?? undefined
  try { return JSON.parse(value) } catch { return value }
}

/** One stored message row (local_runtime_message_rows data_json) as the ACP updates mcode streams for it live. */
export function minimaxRowUpdates(row) {
  const data = row?.data
  if (!data || typeof data !== 'object' || (row.role ?? data.role) !== 'assistant') return []
  const out = []
  const text = (value) => (typeof value === 'string' ? value : '')
  const thinking = text(data.thinking_content ?? data.thinkingContent ?? data.thinking)
  if (thinking.trim()) out.push({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: thinking } })
  const content = text(data.msg_content ?? data.msgContent ?? data.content)
  if (content.trim()) out.push({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: content } })
  const calls = Array.isArray(data.tool_calls) ? data.tool_calls : Array.isArray(data.toolCalls) ? data.toolCalls : []
  calls.forEach((call, index) => {
    const name = call?.tool_name ?? call?.toolName ?? call?.name
    if (typeof name !== 'string' || !name) return
    const status = String(call.tool_call_status ?? call.status ?? '').toLowerCase()
    const failed = status === '3' || status === 'failed' || status === 'error'
    const running = status === '1' || status === 'running' || status === 'started' || status === 'in_progress'
    const rawInput = parseJsonValue(call.tool_call_args ?? call.toolCallArgs ?? call.args ?? call.input)
    const error = call.tool_call_error ?? call.toolCallError ?? call.error
    const rawOutput = parseJsonValue(call.tool_call_result_data ?? call.toolCallResultData ?? call.result ?? call.output) ?? (error !== undefined && error !== null ? { error } : undefined)
    const paths = rawInput && typeof rawInput === 'object' ? ['path', 'filePath', 'file_path'].map((key) => rawInput[key]).filter((value) => typeof value === 'string' && path.isAbsolute(value)) : []
    out.push(Object.fromEntries(Object.entries({
      sessionUpdate: 'tool_call', toolCallId: String(call.tool_call_id ?? call.toolCallId ?? `minimax-row-${row.id}-${index}`), title: name, name, kind: minimaxToolKind(name),
      status: failed ? 'failed' : running ? 'in_progress' : 'completed', rawInput, rawOutput, locations: paths.length ? paths.map((file) => ({ path: file })) : undefined,
    }).filter(([, value]) => value !== undefined)))
  })
  return out
}


/**
 * The agent-turn events (server.js pollAgentTurns: {start}, {update}, {usage}, {end}) one 'turns' read gives, with the
 * reader's state ({open, done, rowId}) moved on. Turns a client prompt ran are passed over (their rows are its own).
 */
export function minimaxTurnEvents(state, result) {
  const events = []
  const turns = Array.isArray(result?.turns) ? result.turns : []
  const rows = Array.isArray(result?.rows) ? result.rows : []
  state.done ??= new Set()
  state.usageCounted = false
  for (const turn of turns) {
    if (state.done.has(turn.turnId)) continue
    // A client's turn (a prompt, its continuations, a queued message: mcode's foreground admission) is the prompt's own.
    if (turn.foreground) { state.done.add(turn.turnId); continue }
    if (state.open && state.open !== turn.turnId) {
      // The open one ended unseen (its row was rewritten): it closes before the next starts.
      events.push({ end: { status: 'completed' } })
      state.done.add(state.open)
      state.open = null
    }
    if (!state.open) { events.push({ start: { text: null, turnId: turn.turnId } }); state.open = turn.turnId }
    for (const row of rows) {
      if (row.turnId !== turn.turnId || row.id <= (state.rowId ?? 0)) continue
      state.rowId = Math.max(state.rowId ?? 0, row.id)
      for (const update of minimaxRowUpdates(row)) events.push({ update })
    }
    if (turn.status === 'accepted') break
    // Its model calls (local_runtime_token_usage since the thread's cursor), counted once: the cursor moves on.
    if (result?.usage?.calls && !state.usageCounted) {
      events.push({ usage: { inputTokens: result.usage.inputTokens + result.usage.cacheReadTokens + result.usage.cacheWriteTokens, cachedInputTokens: result.usage.cacheReadTokens, outputTokens: result.usage.outputTokens, reasoningOutputTokens: result.usage.reasoningTokens } })
      state.usageLastId = result.usage.lastId
      state.usageCounted = true
    }
    events.push({ end: { status: turn.status === 'failed' ? 'failed' : turn.status === 'aborted' ? 'interrupted' : 'completed', ...(turn.status === 'failed' ? { error: { message: 'MiniMax Code’s follow-up turn failed.' } } : {}) } })
    state.done.add(turn.turnId)
    state.open = null
  }
  return events
}

/** Reads the thread's turns in the background; the events wait in state.events for the next agentTurnLog call. */
function readAgentTurns(ctx, thread, state) {
  const db = threadDb(ctx, thread)
  if (!db || !fs.existsSync(db) || state.reading) return
  state.lastRead = Date.now()
  state.wake = false
  const generation = state.generation
  const request = { op: 'turns', db, session: thread.id, since: state.since, afterRowId: state.rowId ?? 0, ...(thread.minimaxUsageId !== undefined ? { sessions: threadSessions(thread), afterUsageId: thread.minimaxUsageId } : {}) }
  state.reading = minimaxStateAsync(ctx, request)
    .then((result) => {
      // A client prompt began meanwhile (its turn is not one of these) or the process restarted: read again later.
      if (!result || state.generation !== generation || thread.prompt) return
      const events = minimaxTurnEvents(state, result)
      if (state.usageLastId !== undefined) { thread.minimaxUsageId = Math.max(thread.minimaxUsageId ?? 0, state.usageLastId); state.usageLastId = undefined }
      state.events.push(...events)
    })
    .catch((error) => ctx.log?.(`minimax agent turns: ${String(error?.message ?? error).slice(0, 300)}`))
    .finally(() => { state.reading = null })
}

/** Process ids under a process (ps): [{pid, pgid, command}]. */
function descendants(root) {
  let text = ''
  try { text = execFileSync('/bin/ps', ['-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8', timeout: 5000, maxBuffer: 16 << 20 }) } catch { return [] }
  const rows = text.split('\n').map((line) => /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line)).filter(Boolean).map((match) => ({ pid: Number(match[1]), ppid: Number(match[2]), pgid: Number(match[3]), command: match[4] }))
  const out = []
  const queue = [root]
  while (queue.length) {
    const parent = queue.shift()
    for (const row of rows) if (row.ppid === parent && !out.includes(row)) { out.push(row); queue.push(row.pid) }
  }
  return out
}

/** The user's skill and plugin state copied into a thread home's database (when it exists); true when it changed. */
function syncState(ctx, real, home) {
  if (!fs.existsSync(stateDb(real)) || !fs.existsSync(stateDb(home))) return false
  try {
    const result = minimaxState(ctx, { op: 'sync', from: stateDb(real), to: [stateDb(home)], realHome: real, homes: [home] })
    return Boolean(result?.changed?.length)
  } catch (error) {
    ctx.log?.(`minimax state sync: ${String(error?.stderr || error?.message || error).slice(0, 400)}`)
    return false
  }
}

let disabledSkillsCache = null
/** The skill locations the user turned off in mcode (files://<real SKILL.md path>), cached by the database's change time. */
function disabledSkillUris(ctx) {
  const db = stateDb(homeOf(ctx.env))
  const stamp = ['', '-wal'].map((suffix) => { try { return fs.statSync(db + suffix).mtimeMs } catch { return 0 } }).join(':')
  if (disabledSkillsCache?.db === db && disabledSkillsCache.stamp === stamp) return disabledSkillsCache.uris
  if (!fs.existsSync(db)) return new Set()
  let result = null
  try { result = minimaxState(ctx, { op: 'read', db }) } catch (error) { ctx.log?.(`minimax skills state: ${String(error?.message ?? error).slice(0, 300)}`) }
  const uris = new Set(result?.skills ?? [])
  // Not cached when the state could not be read (the SQLite module is installed with the first session).
  if (result) disabledSkillsCache = { db, stamp, uris }
  return uris
}

/** mcode's id for a skill: files:// and the real path of its SKILL.md (agent-modules skills registry.ts). */
export function skillLocationUri(file) {
  let real = file
  try { real = fs.realpathSync(file) } catch {}
  return pathToFileURL(real).href.replace(/^file:/, 'files:')
}

let pluginListCache = null

/** Plugin folders with a manifest (<home>/plugins/*): what is there when mcode cannot list its plugins. */
function folderPlugins(ctx) {
  const root = path.join(homeOf(ctx.env), 'plugins')
  let entries = []
  try { entries = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()) } catch { return [] }
  return entries.map((entry) => {
    const dir = path.join(root, entry.name)
    const manifest = ['plugin.json', '.minimax-plugin/plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json'].map((file) => readJsonFile(path.join(dir, file), null)).find(Boolean)
    if (!manifest) return null
    return withDisplayName(pluginSummary({ id: manifest.name ?? entry.name, name: manifest.name ?? entry.name, version: manifest.version ?? null, description: manifest.description ?? '', enabled: manifest.enabled !== false, path: dir, extra: { kind: 'mcode-plugin', packageName: manifest.name ?? entry.name } }), manifest.displayName)
  }).filter(Boolean)
}

/** A plugin row whose shown name is the plugin's display name (the row's name stays mcode's package name). */
function withDisplayName(row, displayName) {
  if (typeof displayName === 'string' && displayName.trim()) row.interface.displayName = displayName.trim()
  return row
}

const PLUGIN_MANIFESTS = ['.minimax-plugin/plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json', 'plugin.json']

/** A plugin package's manifest: {file, manifest} or null. */
function pluginManifestOf(dir) {
  for (const file of PLUGIN_MANIFESTS) {
    const manifest = readJsonFile(path.join(dir, file), null)
    if (manifest && typeof manifest === 'object') return { file, manifest }
  }
  return null
}

/**
 * An installed plugin's package (a local one under <home>/plugins, an official one in <home>/v2/plugin-cache/official,
 * the newest copy of the wanted version first): {dir, skills: [{name, description, path}], mcpServers: [name]}, or null.
 * Skills: the manifest's skills (MiniMax: skills/<x>/SKILL.md paths; compatible: folders) and a skills/ folder; MCP
 * servers: the manifest's mcpServers (MiniMax: *.mcp.json files; compatible: an object or paths) and .mcp.json.
 */
export function minimaxPluginPackage(env, name, version = null) {
  const home = homeOf(env)
  const candidates = []
  for (const root of [path.join(home, 'plugins'), path.join(home, 'v2', 'plugin-cache', 'official')]) {
    let entries = []
    try { entries = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')) } catch { continue }
    for (const entry of entries) {
      const dir = path.join(root, entry.name)
      const found = pluginManifestOf(dir)
      if (!found || String(found.manifest.name ?? entry.name) !== String(name).replace(/@[^@]+$/, '')) continue
      let mtime = 0
      try { mtime = fs.statSync(dir).mtimeMs } catch {}
      candidates.push({ dir, ...found, rank: (version && found.manifest.version === version ? 2 : 0) + (root.endsWith('plugins') ? 1 : 0), mtime })
    }
  }
  const best = candidates.sort((a, b) => b.rank - a.rank || b.mtime - a.mtime)[0]
  if (!best) return null
  const { dir, manifest } = best
  const list = (value) => (Array.isArray(value) ? value : typeof value === 'string' ? [value] : []).filter((entry) => typeof entry === 'string' && entry && !entry.includes('..'))
  const skillFiles = new Set()
  const addSkillDir = (relative) => {
    const folder = path.join(dir, relative)
    if (fs.existsSync(path.join(folder, 'SKILL.md'))) { skillFiles.add(path.join(folder, 'SKILL.md')); return }
    let children = []
    try { children = fs.readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isDirectory() || entry.isSymbolicLink()) } catch { return }
    for (const child of children) if (fs.existsSync(path.join(folder, child.name, 'SKILL.md'))) skillFiles.add(path.join(folder, child.name, 'SKILL.md'))
  }
  addSkillDir('skills')
  for (const entry of list(manifest.skills)) {
    if (/SKILL\.md$/.test(entry)) { if (fs.existsSync(path.join(dir, entry))) skillFiles.add(path.join(dir, entry)) } else addSkillDir(entry)
  }
  const skills = [...skillFiles].map((file) => {
    let meta = {}
    try { meta = frontmatter(fs.readFileSync(file, 'utf8')) } catch {}
    return { name: typeof meta.name === 'string' && meta.name ? meta.name : path.basename(path.dirname(file)), description: typeof meta.description === 'string' ? meta.description : '', path: file }
  })
  const servers = new Set()
  const addServers = (record) => { for (const key of Object.keys((record && typeof record === 'object' && (record.mcpServers && typeof record.mcpServers === 'object' ? record.mcpServers : record)) || {})) if (!['$schema', 'schemaVersion'].includes(key)) servers.add(key) }
  if (fs.existsSync(path.join(dir, '.mcp.json'))) addServers(readJsonFile(path.join(dir, '.mcp.json'), {}))
  if (manifest.mcpServers && typeof manifest.mcpServers === 'object' && !Array.isArray(manifest.mcpServers)) addServers(manifest.mcpServers)
  else for (const entry of list(manifest.mcpServers)) addServers(readJsonFile(path.join(dir, entry), {}))
  return { dir, skills, mcpServers: [...servers] }
}

/**
 * mcode's sub-agents (config agentsDir <home>/agents: <name>/agent.md with front matter name, description, tools,
 * x-mavis.displayName), the ones it ships in agents/.builtin (explore, verifier, worker; mavis is the main agent itself)
 * and the user's own, as Customize's agent rows {name, description, scope, path, tools, model}.
 */
export function minimaxAgents(env) {
  const root = path.join(homeOf(env), 'agents')
  const out = new Map()
  const read = (dir, scope) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => (entry.isDirectory() || entry.isSymbolicLink()) && !entry.name.startsWith('.')) } catch { return }
    for (const entry of entries) {
      const file = path.join(dir, entry.name, 'agent.md')
      let text = ''
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const meta = frontmatter(text)
      const name = typeof meta.name === 'string' && meta.name ? meta.name : entry.name
      if (scope === 'builtin' && name === 'mavis') continue
      const shown = /^x-mavis:\s*$[\s\S]*?^\s+displayName:\s*(.+)$/m.exec(/^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '')?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2')
      out.set(name, { name, displayName: shown || null, description: typeof meta.description === 'string' ? meta.description.slice(0, 400) : '', scope, path: file, tools: Array.isArray(meta.tools) && meta.tools.length ? meta.tools : null, model: typeof meta.model === 'string' && meta.model ? meta.model : null })
    }
  }
  read(path.join(root, '.builtin'), 'builtin')
  read(root, 'user')
  return [...out.values()]
}

/**
 * mcode's /compact answer (tui acp/commands.ts): 'Compaction completed.\nMessages: X → Y\nTokens: A → B' or 'No
 * compaction is needed for this conversation yet.' → {phase: 'completed', tokensBefore, tokensAfter, codeDesktop} |
 * {phase: 'skipped', message} | null.
 */
export function minimaxCompactionResult(text) {
  const value = String(text ?? '').trim()
  if (/No compaction is needed/i.test(value)) return { phase: 'skipped', message: value }
  if (!/Compaction completed/i.test(value)) return null
  const pair = (label) => {
    const match = new RegExp(`${label}:\\s*([\\d,]+)\\s*(?:→|->)\\s*([\\d,]+)`, 'i').exec(value)
    return match ? [Number(match[1].replace(/,/g, '')), Number(match[2].replace(/,/g, ''))] : null
  }
  const messages = pair('Messages')
  const tokens = pair('Tokens')
  const shadowedItems = messages && messages[0] > messages[1] ? messages[0] - messages[1] : null
  const shadowedTokens = tokens && tokens[0] > tokens[1] ? tokens[0] - tokens[1] : null
  return {
    phase: 'completed', message: value, tokensBefore: tokens?.[0] ?? null, tokensAfter: tokens?.[1] ?? null,
    codeDesktop: shadowedItems ? { shadowedItems, ...(shadowedTokens ? { shadowedTokens } : {}) } : null,
  }
}

// ------------------------------------------------------------ MiniMax Code's own asks
//
// mcode's ACP gives each permission request a kind from its tool name alone (tui acp/updates.ts tuiAcpToolKind: any name
// holding 'web' is 'fetch', so website_deploy arrives as a fetch), and the bridge allows reads and fetches in every mode.
// mcode's own permission facade still asks about these in its default and auto modes (local-runtime permissions
// checkers.ts evaluateLocalPermissionCheck, facade.ts: a policy deny is demoted to an ask): minimaxMustAsk restores
// those asks on the bridge side, outside Bypass.

/** checkers.ts containsSensitiveLocalPath: credential and secret paths (~/.ssh, ~/.aws, .env*, *.pem …) in a value. */
export function minimaxSensitivePath(value) {
  const variants = new Set()
  for (const candidate of [String(value ?? ''), String(value ?? '').replace(/\\(.)/g, '$1')]) variants.add(candidate.replaceAll('\\', '/').replace(/['"]/g, '').toLowerCase())
  const lead = String.raw`(^|[/\s"'=:$])(?:~\/|\$home\/|\$\{home\}\/)?`
  const end = String.raw`(?=$|[\s"';&|)])`
  const patterns = [
    new RegExp(`${lead}\\.ssh(\\/|$|[\\s"';&|)])`, 'i'), new RegExp(`${lead}\\.aws(\\/|$|[\\s"';&|)])`, 'i'), new RegExp(`${lead}\\.config\\/gcloud(\\/|$|[\\s"';&|)])`, 'i'),
    new RegExp(`${lead}\\.kube\\/config${end}`, 'i'), new RegExp(`${lead}\\.docker\\/config\\.json${end}`, 'i'), new RegExp(`${lead}\\.gnupg(\\/|$|[\\s"';&|)])`, 'i'),
    new RegExp(`${lead}\\.npmrc${end}`, 'i'), new RegExp(`${lead}\\.netrc${end}`, 'i'), new RegExp(`${lead}\\.git-credentials${end}`, 'i'), new RegExp(`${lead}\\.env(\\.|$|[\\s"';&|)])`, 'i'),
    new RegExp(String.raw`(^|[/\s"'=:$])(?:id_(?:rsa|dsa|ecdsa|ed25519)|[^/\s"';&|)]+\.(?:key|pem|p12|pfx))(?=$|[\s"';&|)])`, 'i'),
  ]
  return [...variants].some((text) => patterns.some((pattern) => pattern.test(text)))
}

const splitShell = (command) => command.split(/&&|\|\||[;\n\r]/).map((part) => part.trim()).filter(Boolean)
const shellTokens = (command) => (command.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((token) => token.replace(/^['"]|['"]$/g, ''))
const baseName = (token) => token.replaceAll('\\', '/').split('/').pop() || token
function unwrapShell(tokens) {
  let at = 0
  while (at < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[at] ?? '')) at++
  while (at < tokens.length && ['sudo', 'env', 'command', 'exec'].includes(baseName(tokens[at] ?? ''))) at++
  return tokens.slice(at)
}
const HUGE_SCAN_ROOTS = new Set(['/', '/Users', '/home', '/System', '/Library', '/Applications', '/usr', '/var', '/opt', '/private'])
const hugeScanRoot = (value) => { const normalized = value.replaceAll('\\', '/').replace(/\/+$/, '') || '/'; return HUGE_SCAN_ROOTS.has(normalized) || normalized === '~' || normalized === '$HOME' || normalized === '${HOME}' || /^[A-Za-z]:$/.test(normalized) }

/** checkers.ts evaluateLocalBashCommand: why mcode asks before a bash command, or null. */
export function minimaxCommandAsk(command) {
  const text = String(command ?? '').trim()
  if (!text) return null
  if (/\b(?:curl|wget)\b[\s\S]*\|[\s\S]*(?:^|[\s;&|])(?:sudo\s+)?(?:bash|sh|zsh|fish|dash|ksh)\b/i.test(text) || /\b(?:bash|sh|zsh|fish|dash|ksh)\b[\s\S]*<\s*<\s*\(?\s*(?:curl|wget)\b/i.test(text)) return 'curlPipeShell'
  if (/`[^`]*`|\$\(|<\(|>\(/.test(text)) return 'substitution'
  const scan = splitShell(text).some((part) => {
    const tokens = unwrapShell(shellTokens(part))
    const name = baseName(tokens[0] ?? '')
    const args = tokens.slice(1)
    if (name === 'find') {
      let i = 0
      while (i < args.length && ['-H', '-L', '-P'].includes(args[i])) i++
      const roots = []
      for (; i < args.length && !/^[-(!)]/.test(args[i]); i++) roots.push(args[i])
      return roots.some(hugeScanRoot) && !args.includes('-maxdepth')
    }
    if (name === 'rg' || name === 'grep') {
      if (args.some((arg) => arg === '--max-depth' || arg.startsWith('--max-depth='))) return false
      let pattern = false
      const paths = []
      for (let i = 0; i < args.length; i++) {
        if (['-e', '-f', '--regexp', '--file'].includes(args[i])) { i++; pattern = true; continue }
        if (args[i].startsWith('-')) continue
        if (!pattern) { pattern = true; continue }
        paths.push(args[i])
      }
      return paths.some(hugeScanRoot)
    }
    if (name === 'tree') return !args.some((arg) => arg === '-L' || /^-L\d+$/.test(arg) || arg.startsWith('--level')) && args.some(hugeScanRoot)
    return false
  })
  if (scan) return 'wholeTreeScan'
  if (splitShell(text).some((part) => { const tokens = unwrapShell(shellTokens(part)); return baseName(tokens[0] ?? '') === 'rm' && tokens.slice(1).some((token) => token.startsWith('-') && /r/i.test(token)) })) return 'recursiveRm'
  return null
}

const MINIMAX_ASK_REASONS = {
  deploy: 'MiniMax Code always asks before website_deploy: it publishes files to a public web address.',
  fetch: 'MiniMax Code asks before fetching a web page from this device’s network.',
  sensitive: 'This touches a sensitive file (keys, credentials or .env).',
  curlPipeShell: 'MiniMax Code asks before running a script downloaded from the internet.',
  substitution: 'MiniMax Code asks before commands with shell substitution.',
  wholeTreeScan: 'MiniMax Code asks before a slow scan of the whole disk or home folder.',
  recursiveRm: 'MiniMax Code asks before a recursive delete (rm -r).',
}

/**
 * What MiniMax Code would still ask about in its own closest mode (never asked in Bypass: server.js skips mustAsk there).
 * website_deploy always ({always}: no session grant covers it), any credential or secret path in a tool's path or
 * command, a web_fetch in Ask and Accept edits, and the risky bash shapes (curl | sh, recursive rm, unbounded scans; shell
 * substitution in Ask and Accept edits only, where every command asks anyway). {reason, always} or null.
 */
export function minimaxMustAsk({ name, input, mode }) {
  const tool = String(name ?? '')
  const args = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  if (tool === 'website_deploy') return { reason: MINIMAX_ASK_REASONS.deploy, always: true }
  const asking = mode === 'ask' || mode === 'acceptEdits'
  const command = tool === 'bash' ? (typeof args.command === 'string' ? args.command : typeof args.cmd === 'string' ? args.cmd : '') : ''
  const values = [args.path, args.filePath, args.file_path, tool === 'grep' ? undefined : args.pattern, command].filter((value) => typeof value === 'string' && value.trim())
  if (values.some(minimaxSensitivePath)) return { reason: MINIMAX_ASK_REASONS.sensitive, always: false }
  if (tool === 'web_fetch' && asking) return { reason: MINIMAX_ASK_REASONS.fetch, always: false }
  const risky = command ? minimaxCommandAsk(command) : null
  if (risky && (risky !== 'substitution' || asking)) return { reason: MINIMAX_ASK_REASONS[risky], always: false }
  return null
}

/**
 * MiniMax Code's public issue form (its feedback channel besides /feedback, which needs its own signed-in client):
 * the bug form for bugs and bad results, the question form for anything else, prefilled with what OpenClaude Desktop knows.
 */
export const MINIMAX_ISSUES_URL = 'https://github.com/MiniMax-AI/minimax-code/issues/new'
export function minimaxFeedbackUrl({ classification = 'bug', reason = null, version = null, model = null, platform = process.platform, osVersion = os.release(), arch = process.arch } = {}) {
  const note = typeof reason === 'string' ? reason.trim() : ''
  const bug = classification === 'bug' || classification === 'bad_result' || classification === 'safety_check'
  const firstLine = note.split(/\r?\n/)[0]?.trim().slice(0, 100) ?? ''
  const osName = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux'
  const params = new URLSearchParams()
  params.set('template', bug ? '01-bug-report.yml' : '03-question.yml')
  params.set('title', `${bug ? '[Bug]: ' : '[Question]: '}${firstLine}`)
  params.set('product', 'CLI - ACP')
  params.set('platform', osName)
  const context = `Sent from OpenClaude Desktop (MiniMax Code over ACP).${model ? ` Model: ${model}.` : ''}`
  if (bug) {
    params.set('version', version ? `mcode ${version}` : '')
    params.set('os-version', `${osName} ${osVersion} ${arch}`)
    params.set('issue-area', classification === 'bad_result' ? 'Model output quality' : classification === 'safety_check' ? 'Tool call / permission / sandbox' : 'Other')
    params.set('steps', [note, context].filter(Boolean).join('\n\n'))
  } else {
    params.set('question', [note, context].filter(Boolean).join('\n\n'))
  }
  return `${MINIMAX_ISSUES_URL}?${params.toString()}`
}

function run(file, args, options) {
  return new Promise((resolve, reject) => execFile(file, args, { timeout: 300000, maxBuffer: 8 << 20, ...options }, (error, stdout, stderr) => (error ? reject(Object.assign(error, { stdout, stderr })) : resolve({ stdout, stderr }))))
}

/** better-sqlite3 resolvable from a file (Node's own resolution: an npm install has it). */
function resolvesFrom(file, name = 'better-sqlite3') {
  try { createRequire(file).resolve(name); return true } catch { return false }
}
const sqliteFrom = (dir) => resolvesFrom(path.join(dir, 'package.json'))
const HOOK = path.join(path.dirname(new URL(import.meta.url).pathname), 'minimax-native-hook.mjs')

// ------------------------------------------------------------------ config.yaml settings and skill sources

/** A top-level config.yaml block parsed ({} when missing); throws when the bridge can't read it, so it isn't rewritten wrongly. */
function yamlBlock(text, key) {
  const { lines, blocks } = topLevelBlocks(text)
  const found = blocks.find((entry) => entry.key === key)
  if (!found) return {}
  const parsed = parseYamlBlock(lines, found.start, found.end)
  const value = parsed[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

// mcode's external skill sources (packages/config/src/skills-config.ts DEFAULT_SKILLS_CONFIG): higher priority wins a name.
const MINIMAX_SKILL_SOURCES = Object.freeze({
  'workspace-minimax': 65, 'workspace-cc': 60, 'workspace-agents': 55, 'user-cc': 40, 'user-codex': 35, 'user-agents': 30,
})
// skills-config.ts LEGACY_SOURCE_KEY_BY_KIND: older names mcode still reads.
const MINIMAX_SKILL_SOURCE_ALIASES = { 'user-cc': 'user-claude', 'workspace-cc': 'workspace-claude' }

/** config.yaml skills.external as mcode reads it: the master switch, walkUp, and each source's {enabled, priority}. */
export function minimaxSkillSources(text) {
  let external = {}
  try { external = yamlBlock(text, 'skills')?.external ?? {} } catch { external = {} }
  if (!external || typeof external !== 'object') external = {}
  const sources = {}
  for (const [kind, priority] of Object.entries(MINIMAX_SKILL_SOURCES)) {
    const raw = external.sources?.[kind] ?? external.sources?.[MINIMAX_SKILL_SOURCE_ALIASES[kind]]
    sources[kind] = {
      enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : true,
      priority: typeof raw?.priority === 'number' && Number.isFinite(raw.priority) ? raw.priority : priority,
    }
  }
  return { enabled: external.enabled !== false, walkUp: external.walkUp !== false, sources }
}

/**
 * The skill folders mcode scans for a folder, in the order a name is decided: the enabled external sources by priority
 * (project folders nearest first, up to the git root unless walkUp is off), then mcode's own skills and its built-ins.
 */
export function minimaxSkillRoots(env, cwd, configText = '') {
  const home = homeOf(env)
  const user = env.HOME || os.homedir()
  const config = minimaxSkillSources(configText)
  const projects = cwd ? (config.walkUp ? projectDirs(cwd) : [path.resolve(cwd)]) : []
  const folders = {
    'workspace-minimax': projects.map((dir) => path.join(dir, '.minimax', 'skills')),
    'workspace-cc': projects.map((dir) => path.join(dir, '.claude', 'skills')),
    'workspace-agents': projects.map((dir) => path.join(dir, '.agents', 'skills')),
    'user-cc': [path.join(user, '.claude', 'skills')], 'user-codex': [path.join(user, '.codex', 'skills')], 'user-agents': [path.join(user, '.agents', 'skills')],
  }
  const roots = []
  if (config.enabled) {
    const kinds = Object.keys(MINIMAX_SKILL_SOURCES).filter((kind) => config.sources[kind].enabled)
      .sort((a, b) => config.sources[b].priority - config.sources[a].priority)
    for (const kind of kinds) for (const dir of folders[kind]) roots.push({ path: dir, scope: kind.startsWith('workspace-') ? 'repo' : 'user' })
  }
  roots.push({ path: path.join(home, 'skills'), scope: 'user' }, { path: path.join(home, '.builtin-skills'), scope: 'system' })
  return roots
}

// Settings › Code › 'MiniMax Code settings' (codeDesktop/coreSettings/read|write): config.yaml keys mcode reads
// (packages/config/src/config.ts DEFAULTS, review-config.ts, skills-config.ts). Every thread's config.yaml is copied from
// the user's at launch (threadConfigYaml), so a change reaches new sessions; the keys the bridge sets per thread
// (permissionMode, sandbox) and telemetry (the bridge starts mcode with MCODE_DISABLE_TELEMETRY=1) are left out.
const MINIMAX_SETTING_BLOCKS = new Set(['memory', 'review', 'beta', 'skills'])
export const MINIMAX_CORE_SETTINGS = Object.freeze([
  { key: 'memory.enabled', type: 'boolean', default: true },
  { key: 'memory.proactive', type: 'boolean', default: false },
  { key: 'review.mode', type: 'select', options: ['subagent', 'inline'], default: 'subagent' },
  { key: 'beta.autoMemory', type: 'boolean', default: false },
  { key: 'skills.external.enabled', type: 'boolean', default: true },
  ...Object.keys(MINIMAX_SKILL_SOURCES).map((kind) => ({ key: `skills.external.sources.${kind}.enabled`, type: 'boolean', default: true })),
])

/** The settings above as stored ({memory: {...}, review: {...}, …}) from config.yaml; a block the bridge can't read is left out. */
export function readMinimaxSettings(file) {
  let text = ''
  try { text = fs.readFileSync(file, 'utf8') } catch { return {} }
  const out = {}
  for (const key of MINIMAX_SETTING_BLOCKS) { try { const block = yamlBlock(text, key); if (Object.keys(block).length) out[key] = block } catch {} }
  return out
}

/** One setting written into the user's config.yaml (its top-level block rewritten; null removes the key). */
export function writeMinimaxSetting(file, key, value) {
  const top = String(key).split('.')[0]
  if (!MINIMAX_SETTING_BLOCKS.has(top)) throw new Error('Unknown setting.')
  let text = ''
  try { text = fs.readFileSync(file, 'utf8') } catch {}
  let block
  try { block = yamlBlock(text, top) } catch { throw new Error(`MiniMax Code’s config.yaml has a ${top} section OpenClaude Desktop can’t edit. Change it in config.yaml.`) }
  const next = withSetting({ [top]: block }, key, value)[top] ?? {}
  const lines = next && Object.keys(next).length ? writeYamlBlock({ [top]: next }) : null
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, withTopLevel(text, top, lines))
}

export default {
  id: 'minimax',
  name: 'MiniMax Code',
  engine: 'minimax',
  packageNames: ['@minimax-ai/code'],
  binaryNames: ['mcode'],
  helpPattern: /Minimax Code|MiniMax Code|mcode/i,
  acpArgs: ['acp'],
  // mcode takes no per-model max tokens or temperature (nothing reads config.modelParams here).
  modelParams: false,
  // A workflow agent (the runner's bridge) runs without mcode's own sub-agents (`task`, features.delegation): Claude's
  // workflow subagent drops Agent, and sub-agents would run outside the run's concurrency cap, agent count and budget.
  workflowAgentDisabledTools: ['task'],
  // Claude tool names a workflow script's disallowedTools can remove here, through codeDesktop.tools.disabled.
  workflowToolSwitches: { WebFetch: ['web_fetch'], WebSearch: ['web_search'], Agent: ['task'], Task: ['task'] },
  // mcode runs its tools itself (no client fs/terminal); the extension notifications report its queue.
  // elicitation.form: its questionnaires (plan review included) as OpenClaude Desktop question cards; plan: plan_update.
  clientCapabilities: { elicitation: { form: {} }, plan: {}, _meta: { 'minimax-code/extensions': { version: 1, notifications: true } } },
  // mcode's ACP prompt takes no image blocks (acp/agent.ts image: false) but its read tool attaches image files to the
  // model: an image goes as a resource_link to its file (a pasted one saved first), for the models that see images.
  images: 'path',
  home: homeOf,
  agentPaths: (env) => [homeOf(env), path.join(env.HOME || os.homedir(), '.mavis'), path.join(env.HOME || os.homedir(), '.claude'), path.join(env.HOME || os.homedir(), '.agents')],
  modeIds: { plan: 'plan', default: 'default' },
  compactCommand: '/compact',
  // mcode's /compact takes instructions (tui acp/commands.ts: input hint '[instructions]', requestCompaction(input)).
  compactInstructions: true,
  /** mcode's /compact answer (compactionResult): what it saved, or that nothing needed compacting. */
  compactionResult: (text) => minimaxCompactionResult(text),
  /** Customize › Agents: mcode's sub-agents (<home>/agents/.builtin and <home>/agents), what its task tool may run. */
  agents: (ctx) => minimaxAgents(ctx.env),

  /** Settings › Code › MiniMax Code settings: config.yaml keys (MINIMAX_CORE_SETTINGS), read and written as YAML. */
  coreSettings: {
    file: (env) => path.join(homeOf(env), 'config.yaml'),
    defs: MINIMAX_CORE_SETTINGS,
    read: (env) => readMinimaxSettings(path.join(homeOf(env), 'config.yaml')),
    write: (env, key, value) => writeMinimaxSetting(path.join(homeOf(env), 'config.yaml'), key, value),
  },
  // Sessions live in the thread's own home (deleted with the thread); a fork gets a home of its own (forkHome).
  sessionFeatures: { fork: 'acp', revert: false, deleteHistory: true, ownHome: true },

  /**
   * A fork's own home (server.js thread/fork, after mcode forked the session in its source's home): a thread's home
   * holds its mode's files (permission.json for Ask / Accept edits, config.yaml, mcp.json), which every launch rebuilds
   * and mcode reads on every tool check, so two live threads on one home would rewrite each other's rules. The fork
   * starts from a copy of the source home's sessions (v2: its database copied consistently, its session folders) and
   * is rebuilt as an overlay of the user's home at its first launch. null: the fork stays on its source's home (a
   * session begun in the mcode terminal runs in the user's own home, whose files no launch rebuilds). Throws when the
   * copy fails.
   */
  forkHome(ctx, { source, threadDir }) {
    const from = source?.agentHome
    if (typeof from !== 'string' || !from || from === 'real' || !threadDir) return null
    if (!fs.existsSync(stateDb(from))) return null
    const home = path.join(threadDir, 'minimax-home')
    fs.rmSync(home, { recursive: true, force: true })
    fs.mkdirSync(path.join(home, 'v2', 'sqlite'), { recursive: true })
    try {
      const result = minimaxState(ctx, { op: 'copy', from: stateDb(from), to: stateDb(home) })
      if (!result?.changed?.length) throw new Error('the session database was not copied')
      // The source's session folders and state (not its process's leases, logs, migration backups or running tasks).
      const skip = new Set(['runtime-owner-leases', 'observability', 'sqlite'])
      for (const name of fs.readdirSync(path.join(from, 'v2'))) {
        if (skip.has(name)) continue
        fs.cpSync(path.join(from, 'v2', name), path.join(home, 'v2', name), { recursive: true, dereference: false, errorOnExist: false })
      }
    } catch (error) {
      // Never a shared home instead: the fork is not made.
      fs.rmSync(home, { recursive: true, force: true })
      throw new Error(`MiniMax Code’s session could not be copied for the fork: ${String(error?.stderr || error?.message || error).trim().slice(0, 300)}`)
    }
    return home
  },
  configFile: (env) => path.join(homeOf(env), 'config.yaml'),

  /**
   * The native modules the GitHub release leaves to npm: better-sqlite3 (required) and
   * @vscode/ripgrep. Installed once with the npm next to the Node that runs mcode, from the
   * official npm registry, into <state>/native.
   */
  async ensureNativeDeps(ctx) {
    const entry = ctx.program.binary
    let real = entry
    try { real = fs.realpathSync(entry) } catch {}
    if (real && resolvesFrom(real)) return {}
    const dir = ctx.env.MAVIS_SQLITE3_MODULE_PATH || path.join(ctx.stateDir, 'native')
    if (!sqliteFrom(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      if (!fs.existsSync(path.join(dir, 'package.json'))) fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'code-desktop-mcode-native', private: true }) + '\n')
      const node = ctx.program.node
      const npm = [path.join(path.dirname(node), 'npm'), '/opt/homebrew/bin/npm', '/usr/local/bin/npm'].find((file) => fs.existsSync(file))
      if (!npm) throw new Error('MiniMax Code needs its SQLite module; npm was not found to install it.')
      await run(npm, ['install', `better-sqlite3@${SQLITE_VERSION}`, `@vscode/ripgrep@${RIPGREP_VERSION}`, '--ignore-scripts=false', '--no-audit', '--no-fund', '--registry', 'https://registry.npmjs.org/'], { cwd: dir, env: { ...ctx.env, PATH: `${path.dirname(node)}:${ctx.env.PATH ?? ''}` } })
    }
    // The release imports better-sqlite3 statically (ESM ignores NODE_PATH): a resolve hook maps it to this copy.
    const options = [ctx.env.NODE_OPTIONS, `--import="${pathToFileURL(HOOK).href}"`].filter(Boolean).join(' ')
    return { MAVIS_SQLITE3_MODULE_PATH: dir, CODE_DESKTOP_MCODE_NATIVE: dir, NODE_OPTIONS: options }
  },

  /**
   * mcode's runtime appends `export PATH="<data dir>/bin:$PATH"` to ~/.zshrc and ~/.bashrc on every start
   * (local-runtime infra/ensure-path-integration.ts), and the bridge points its data dir at a thread's or a throwaway
   * home: no process the bridge starts may write those files, Bypass included (wrapLaunch denyWrite). Its recoverable
   * `rm` moves files to ~/.Trash itself inside the sandbox (MAVIS_TRASH_FORCE_MV, launch), so ~/.Trash is writable where
   * the project is (workspace-write); read-only modes and deletes outside the roots fail with mcode's own message.
   */
  sandboxExtras(ctx) {
    const home = ctx.env.HOME || os.homedir()
    return { denyWrite: [path.join(home, '.zshrc'), path.join(home, '.bashrc')], extraWritable: [path.join(home, '.Trash')] }
  },

  launch(ctx, config) {
    const env = { MCODE_DISABLE_TELEMETRY: '1', ...(ctx.nativeEnv ?? {}) }
    // Inside the bridge's sandbox mcode's rm shim must not ask Finder to delete (Finder is not sandboxed, so the delete
    // would escape Auto's roots and Plan's read-only): it moves the file to ~/.Trash itself, which the sandbox checks.
    if (config.sandbox && config.sandbox !== 'none') env.MAVIS_TRASH_FORCE_MV = '1'
    const real = homeOf(ctx.env)
    const files = {}
    // MiniMax renders its primary agent's prompt from bundled layers only (the agents/<name> prompt override
    // applies to custom agents, which ACP cannot select): the thread's prompt and instructions join the
    // global instructions file (<home>/AGENTS.md), after the user's own.
    const prompt = [config.systemPrompt, config.appendPrompt].filter(Boolean).join('\n\n')
    if (prompt) {
      let own = ''
      try { own = fs.readFileSync(path.join(real, 'AGENTS.md'), 'utf8') } catch {}
      const global = minimaxGlobalInstructions(own, prompt)
      if (global.truncated || global.ownDropped) ctx.log?.(`minimax: the global instructions passed ${MINIMAX_GLOBAL_MAX_BYTES} bytes;${global.truncated ? ' OpenClaude Desktop\'s part was shortened' : ''}${global.ownDropped ? ' the user\'s own AGENTS.md (over the limit by itself, so mcode ignores it) was left out' : ''}`)
      files['AGENTS.md'] = global.text
    }
    // The thread's own config.yaml (never a link to the user's: mcode writes its model and permission choices there):
    // permissionMode `default` so OpenClaude Desktop's mode decides, mcode's own sandbox off inside the bridge's Seatbelt
    // profile, and the thread's tool switches in agents.default. Read again at every launch.
    let userConfig = ''
    try { userConfig = fs.readFileSync(path.join(real, 'config.yaml'), 'utf8') } catch {}
    const threadConfig = threadConfigYaml(userConfig, { disabled: config.disabledTools ?? [], nestedSandbox: Boolean(config.sandbox) && config.sandbox !== 'none' })
    for (const warning of threadConfig.warnings) ctx.log?.(`minimax: ${warning}`)
    files['config.yaml'] = threadConfig.text
    // OpenClaude Desktop's tools server (config.appToolsEntry, adapter.appToolsInLaunch): declared in the thread's own mcp.json
    // rather than as an ACP session server, because only mcode's config carries a tool-call timeout (ACP has no field,
    // so a session server gets MCP_DEFAULTS.timeout, 2 minutes: an approval sheet left open longer, or a dev server's
    // first compile, would fail the call while the app still acts on it). Its env holds this session's own credential.
    const appToolsEntry = config.appToolsEntry && typeof config.appToolsEntry === 'object' && config.agentHome !== 'real' && !config.utility ? config.appToolsEntry : null
    if (config.disabledServers?.length || appToolsEntry) {
      // The servers the user configured, switched off for this thread (mcp.json `enabled: false`).
      const file = fs.existsSync(path.join(real, 'mcp.json')) || !fs.existsSync(path.join(real, 'mcp', 'mcp.json')) ? 'mcp.json' : 'mcp/mcp.json'
      const current = readJsonFile(path.join(real, file), {}) ?? {}
      const servers = { ...current.mcpServers }
      for (const name of config.disabledServers ?? []) if (servers[name]) servers[name] = { ...servers[name], enabled: false }
      if (appToolsEntry) servers[appToolsEntry.name] = { command: appToolsEntry.command, args: [...appToolsEntry.args], env: { ...appToolsEntry.env }, timeout: APP_TOOLS_TIMEOUT_MS }
      files[file] = JSON.stringify({ ...current, mcpServers: servers }, null, 2)
    }
    // Ask / Accept edits (config.askAll, askAllInLaunch): mcode's default mode asks only outside the session folders or
    // for actions it rates risky, so the thread's own permission.json (mcode's v2 rule store) makes it ask. Ask: every
    // write, edit, command, fetch, deploy and MCP call; Accept edits: the same without writes and edits. The user's deny
    // and ask rules stay (v1 strings converted); their allow rules ('Always allow' in mcode) don't apply here.
    // A project server (<cwd>/.mcp.json) switched off for the thread: mcode loads project servers with no switch and
    // over the user's own, so mcp.json `enabled: false` cannot stop it; the thread's permission.json denies its calls.
    let known = []
    try { known = mcpServersOf(ctx, config.cwd ?? null) } catch {}
    const projectOff = known.filter((server) => server.source === 'project' && (config.disabledServers ?? []).includes(server.name)).map((server) => server.name)
    if (config.askAll === 'ask' || config.askAll === 'acceptEdits' || projectOff.length) {
      const own = readJsonFile(path.join(real, 'permission.json'), {}) ?? {}
      const servers = known.filter((server) => !(config.disabledServers ?? []).includes(server.name)).map((server) => server.name)
      files['permission.json'] = JSON.stringify(threadPermissionFile(own, config.askAll || null, servers, projectOff), null, 2)
    }
    // A session the user's own mcode made lives in the real home's database: it runs there, as it is.
    if (config.agentHome === 'real' || config.utility) return { args: ['acp'], env }
    // Every other thread has a home of its own: mcode refuses a linked session database (v2/), so the
    // thread's sessions live in its home's own v2/, next to links to the user's auth, plugins and
    // skills and the thread's own prompt, config.yaml and mcp.json. A throwaway session (side
    // question, model discovery) gets a fresh one that is removed afterwards.
    const home = config.agentHome ?? path.join(config.threadDir, 'minimax-home')
    createOverlay(real, home, { files, ensureDirs: ['auth', 'plugins', 'agents'], keep: OWN_ENTRIES })
    env.MINIMAX_DATA_DIR = home
    env.MAVIS_DATA_DIR = home
    // Skills and plugins the user turned off in mcode stay off here: their state lives in each home's own database.
    // A first launch has no database yet: afterStart copies it once mcode created one (and restarts when it changed).
    const synced = fs.existsSync(stateDb(home)) ? (syncState(ctx, real, home), true) : false
    return { args: ['acp'], env, agentHome: config.ephemeral ? undefined : home, stateHome: { real, home, synced }, ...(appToolsEntry ? { appToolsInLaunch: true } : {}) }
  },

  /**
   * A failed prompt's identity (mcode packages/shared/src/llm-error-classifier.ts): MiniMax's upstream codes 2056 / 2067
   * (a Token Plan's 5-hour or weekly limit) and 1008 (no balance left) are its usage limit and its balance, which over
   * ACP arrive only as -32603 'Internal error: MiniMax Code Runtime failed: BYOK provider … upstream error: …'.
   */
  errorInfo(message) {
    const text = String(message ?? '')
    const clean = text.replace(/^Internal error:\s*/i, '').replace(/^MiniMax Code Runtime failed:\s*/i, '').replace(/^BYOK provider \S+ upstream error:\s*/i, '').trim() || text
    if (/\b1008\b|insufficient (?:account )?balance|credits? (?:exhausted|depleted)|balance (?:is )?(?:insufficient|exhausted)/i.test(text)) return { codexErrorInfo: 'usageLimitExceeded', message: clean, additionalDetails: 'BILLING' }
    if (/\b(?:2056|2067)\b|usage limit (?:exceeded|reached)|LLM usage limit reached/i.test(text)) return { codexErrorInfo: 'usageLimitExceeded', message: clean }
    if (/rate limit|too many requests|\b429\b/i.test(text)) return { codexErrorInfo: 'rateLimitExceeded', message: clean }
    return clean !== text ? { codexErrorInfo: null, message: clean } : null
  },

  /** After the process started: a new home's database now exists; the user's state copied in restarts it once. */
  afterStart(ctx, launch) {
    const state = launch?.stateHome
    if (!state || state.synced) return false
    return syncState(ctx, state.real, state.home)
  },

  classify(call) {
    const name = String(call.name ?? call.title ?? '')
    const mcp = /^mcp__(.+?)__(.+)$/.exec(name)
    if (mcp) return { type: 'mcp', server: mcp[1], tool: mcp[2] }
    if (name === 'task') return { type: 'subagent', label: call.rawInput?.description ?? name, prompt: call.rawInput?.prompt }
    if (name === 'web_fetch') return { type: 'fetch' }
    // website_deploy (ACP kind 'fetch' only because its name holds 'web'): a tool row, never a web page fetch.
    if (name === 'website_deploy') return { type: 'other', tool: 'website_deploy' }
    // mcode's built-in Matrix web search (native-tool-projection.ts): the app's web-search row with its query.
    if (name === 'web_search') return { type: 'webSearch' }
    if (name === 'bash') return { type: 'execute', command: call.rawInput?.command }
    if (name === 'grep' || name === 'glob') return { type: 'search', tool: name }
    if (name === 'read') return { type: 'read' }
    if (name === 'write' || name === 'edit') return { type: 'edit' }
    // todowrite (ACP kind 'edit' only because its name holds 'write'): the todo row (the app's todo_write checklist),
    // never an empty file change; its list fills the plan panel (toolPlan).
    if (name === 'todowrite') return { type: 'other', tool: 'todo_write' }
    return null
  },

  /**
   * mcode sends no ACP plan for todowrite: its list (rawInput.todos, else rawOutput.details.todos: {content, status,
   * priority}) is the turn's plan. undefined for every other tool.
   */
  toolPlan(ctx, sessionId, call) {
    if (String(call?.name ?? call?.title ?? '') !== 'todowrite') return undefined
    const todos = Array.isArray(call?.rawInput?.todos) ? call.rawInput.todos : Array.isArray(call?.rawOutput?.details?.todos) ? call.rawOutput.details.todos : null
    if (!todos) return null
    const status = { pending: 'pending', in_progress: 'in_progress', completed: 'completed', cancelled: 'completed' }
    return todos.filter((todo) => todo && typeof todo.content === 'string' && todo.content.trim()).map((todo) => ({ content: todo.status === 'cancelled' ? `~~${todo.content}~~` : todo.content, status: status[todo.status] ?? 'pending', priority: todo.priority ?? 'medium' }))
  },

  /**
   * Ask and Accept edits get a permission.json of their own (launch), so every mode is honoured in the threads Code
   * Desktop starts. A conversation begun in the mcode terminal runs in the user's own MiniMax home as it is (its
   * session lives in that home's database, which a thread home cannot share): none of the thread's files apply there.
   */
  permissionWarning(mode, thread = {}) {
    if (thread.agentHome !== 'real') return null
    const strict = mode === 'ask' || mode === 'acceptEdits'
    const custom = Boolean(thread.tools?.disabled?.length || thread.tools?.disabledServers?.length || thread.custom?.systemPrompt || thread.custom?.instructions || thread.custom?.persona || thread.developerInstructions)
    const out = []
    if (strict || custom) out.push(`This conversation was started in MiniMax Code's terminal, so it runs in your own MiniMax home as it is: ${strict ? `${mode === 'ask' ? 'Ask' : 'Accept edits'} cannot stop edits inside the project, and ` : ''}OpenClaude Desktop's tool switches and instructions don't apply. Start a new session in OpenClaude Desktop to use them.`)
    // OpenClaude Desktop's tools reach such a session only as an ACP session server, which mcode gives its 2-minute default
    // tool timeout (the 10 minutes of a thread's own mcp.json need a thread home): said, so a card left open longer, or
    // a slow dev server start, is not a silent failure while the app still acts on it.
    if (thread.appTools) out.push(`This conversation was started in MiniMax Code's terminal, so MiniMax Code stops waiting for OpenClaude Desktop's own tools (terminal, preview, Workflow) after 2 minutes. Answer their approval cards within that time, or start a new session in OpenClaude Desktop.`)
    return out.length > 1 ? out : out[0] ?? null
  },
  // The thread's permission.json depends on the mode: a mode change relaunches the agent (server.js keyOf).
  askAllInLaunch: true,
  // OpenClaude Desktop's tools server goes in the thread's own mcp.json (launch config.appToolsEntry), with a 10-minute tool
  // timeout; an ACP session server would time out after mcode's 2-minute default.
  appToolsInLaunch: true,
  // mcode never shows the model an MCP server's initialize instructions: OpenClaude Desktop's (the preview verification
  // workflow, "these act on this session only") join the thread's prompt (server.js launchConfig → its AGENTS.md).
  appToolsInstructions: true,

  /**
   * Turns mcode starts on its own (a finished background task's delivery turn): read from the thread's database in the
   * background (readAgentTurns), when mcode reports session activity (session_info_update, filterUpdate), while one is
   * open or a card waits, and for a while after background tasks were running. server.js projects them as agent turns.
   */
  agentTurnLog(ctx, thread, { reset = false } = {}) {
    const state = (thread.minimaxTurns ??= { events: [], since: Date.now(), rowId: 0, open: null, done: new Set(), reading: null, lastRead: 0, wake: false, generation: 0, backgroundUntil: 0 })
    if (reset) {
      // A new process: only the turns it runs from now on (earlier ones are history).
      Object.assign(state, { events: [], since: Date.now() - 1000, rowId: 0, open: null, done: new Set(), generation: state.generation + 1 })
      return []
    }
    const now = Date.now()
    if ((thread.minimaxStatus?.rows?.length ?? 0) > 0) state.backgroundUntil = now + 30000
    const since = now - state.lastRead
    const due = state.wake ? since > 250 : state.open || thread.agentTurn || thread.pending?.size ? since > 1000 : state.backgroundUntil > now ? since > 2000 : false
    if (due) readAgentTurns(ctx, thread, state)
    return state.events.splice(0)
  },

  /** Session activity (mcode's session_info_update, also outside a prompt) wakes the agent-turn reader. */
  filterUpdate(update, thread) {
    if (thread && update?.sessionUpdate === 'session_info_update' && !thread.prompt) (thread.minimaxTurns ??= { events: [], since: Date.now(), rowId: 0, open: null, done: new Set(), reading: null, lastRead: 0, wake: false, generation: 0, backgroundUntil: 0 }).wake = true
    return { update }
  },

  /** Stop on a turn mcode started itself: its own abort of the root session's turn (and its delegations). */
  async cancelAgentTurn(ctx, host, sessionId) {
    await host.call('mcode/session/delegation/stop', { sessionId }, 30000)
  },

  /** MiniMax Code's own asks (minimaxMustAsk); server.js onPermission shows the card instead of allowing. */
  mustAsk(ctx, { call, mode }) {
    return minimaxMustAsk({ name: call?.name ?? call?.title, input: call?.rawInput, mode })
  },

  /**
   * Send feedback: mcode's /feedback is a ticket its own signed-in client files (tui runtime/feedback), with no
   * headless entry. Its public issue form is the channel the app opens instead (the dialog says to finish it there).
   */
  feedback(ctx, { classification, reason, threadId, model }) {
    return { threadId: threadId ?? null, url: minimaxFeedbackUrl({ classification, reason, version: ctx.env.CODE_DESKTOP_AGENT_VERSION || null, model }) }
  },
  // ask_user's elicitation/create: each field's title is the full question, the message only the form's title.
  elicitationTitles: true,

  async steer(ctx, host, sessionId, text) {
    await host.call('mcode/session/steer', { sessionId, text }, 30000)
  },

  // mcode keeps sub-agent sessions internal ("cannot be opened" over ACP): a delegate shows its task and answer.
  loadDelegates: false,

  /** A task result's answer (<task_result> … final_text: … error_message: …). */
  delegateText(text) {
    if (typeof text !== 'string') return null
    const final = /(?:^|\n)final_text:\n?([\s\S]*?)(?:\nerror_message:|\n<\/task_result>|$)/.exec(text)?.[1]
    return (final ?? text).trim() || null
  },

  /** A throwaway session (a /btw side question): titled before its prompt, so mcode's title model is not called for it. */
  hiddenSession(ctx, { launch, sessionId }) {
    const home = launch?.stateHome?.home
    if (home && sessionId) seedTitle(ctx, stateDb(home), sessionId, 'Side question')
  },

  /** The thread's token usage row cursor when its first turn here starts (mcode's database keeps every earlier call). */
  beforeTurn(ctx, thread) {
    if (thread.minimaxUsageId !== undefined) return
    const db = threadDb(ctx, thread)
    thread.minimaxUsageId = 0
    if (!db || !fs.existsSync(db)) return
    // A workflow agent's session is never listed: titled up front, so mcode makes no title model call for it (an extra
    // billed request, one or two per agent, that would also be sent the agent's prompt).
    if (ctx.runnerRole) seedTitle(ctx, db, thread.id, 'Workflow agent')
    try { thread.minimaxUsageId = minimaxState(ctx, { op: 'status', db, sessions: threadSessions(thread), afterUsageId: 0 })?.usage?.lastId ?? 0 } catch (error) { ctx.log?.(`minimax usage: ${String(error?.message ?? error).slice(0, 300)}`) }
  },

  /** Each live read queries the state database in a node process of its own: less often than the default. */
  liveUsageMs: 5000,
  /** A running turn's tokens so far: mcode's per-call records since the last turn (settleUsage's query, nothing moved). */
  async liveTurnUsage(ctx, thread) {
    const db = threadDb(ctx, thread)
    if (!db || !fs.existsSync(db)) return null
    const usage = (await minimaxStateAsync(ctx, { op: 'status', db, sessions: threadSessions(thread), afterUsageId: thread.minimaxUsageId ?? 0 }))?.usage
    if (!usage?.calls) return null
    return { usage: { inputTokens: usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens, cachedInputTokens: usage.cacheReadTokens, outputTokens: usage.outputTokens, reasoningOutputTokens: usage.reasoningTokens } }
  },

  /**
   * A turn's tokens and spend: mcode's own per-call records (local_runtime_token_usage: input, output, reasoning, cache
   * reads and writes, cost_usd; what its /usage adds up) since the last turn, for the thread's session and its delegates.
   * ACP reports only the context fill. Also refreshes the background tasks the turn left running.
   */
  async settleUsage(ctx, thread) {
    const db = threadDb(ctx, thread)
    if (!db || !fs.existsSync(db)) return null
    let usage = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await minimaxStateAsync(ctx, { op: 'status', db, sessions: threadSessions(thread), afterUsageId: thread.minimaxUsageId ?? 0 })
      if (!result) return null
      const status = (thread.minimaxStatus ??= { rows: [], at: 0, refreshing: null })
      status.ctx = ctx
      status.rows = Array.isArray(result.background) ? result.background : []
      status.at = Date.now()
      usage = result.usage
      if (usage?.calls) break
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    if (!usage?.calls) return null
    thread.minimaxUsageId = usage.lastId
    return {
      usage: { inputTokens: usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens, cachedInputTokens: usage.cacheReadTokens, outputTokens: usage.outputTokens, reasoningOutputTokens: usage.reasoningTokens },
      model: usage.model || null,
      costUsd: usage.costUsd > 0 ? usage.costUsd : null,
    }
  },

  /**
   * mcode's background tasks still running (local_runtime_background_tasks: a run_in_background command, or a foreground
   * one mcode moved to the background after 60 s): Background tasks, and the session stays loaded while they run (mcode
   * stops them all when its process ends). Read from the cache, refreshed in the background.
   */
  backgroundProcesses(thread) {
    const status = thread.minimaxStatus
    if (!status || !thread.host || thread.host.exited) return []
    if (status.ctx && Date.now() - status.at > 2000) void refreshBackground(status.ctx, thread)
    // Only a command can be stopped from here (stopBackground ends its process): a background sub-agent or workflow has
    // no stop of its own over ACP (mcode's delegation stop ends the whole turn), so it shows without a Stop button.
    return status.rows.map((row) => ({ itemId: row.toolCallId ?? row.taskId, processId: row.taskId, command: row.command ?? row.description ?? row.kind, cwd: row.cwd ?? thread.cwd, ...(row.command && (row.kind ?? 'bash') === 'bash' ? {} : { stoppable: false }) }))
  },

  /** Stops one: its process (under mcode's, matched by command line), as mcode's own task_stop ends it; mcode records the end. */
  stopBackground(thread, processId) {
    const row = thread.minimaxStatus?.rows?.find((entry) => entry.taskId === processId)
    const root = thread.host?.child?.pid
    if (!row?.command || (row.kind ?? 'bash') !== 'bash' || !root) return false
    const command = row.command.trim()
    // The shell runs a lone command by exec'ing it (so `sleep 300 # note` is a process `sleep 300`): its line without
    // a trailing comment matches too.
    const bare = command.replace(/\s+#[^'"\n]*$/, '').trim()
    const matches = descendants(root).filter((entry) => entry.command.includes(command) || (bare.length >= 3 && entry.command.includes(bare)))
    if (!matches.length) return false
    // The outermost match (the shell mcode started), with its process group when it leads one.
    const target = matches.find((entry) => !matches.some((other) => other.pid === entry.ppid)) ?? matches[0]
    let stopped = false
    try { process.kill(target.pgid === target.pid ? -target.pid : target.pid, 'SIGTERM'); stopped = true } catch {}
    thread.minimaxStatus.rows = thread.minimaxStatus.rows.filter((entry) => entry !== row)
    if (thread.minimaxStatus.ctx) setTimeout(() => void refreshBackground(thread.minimaxStatus.ctx, thread), 500).unref?.()
    return stopped
  },

  /**
   * Review of uncommitted changes: mcode's own reviewer (`mcode exec review`, staged, unstaged and untracked changes) with
   * its verdict and prioritised, file- and line-anchored findings. Other targets (a base branch, a commit, custom
   * instructions) are not what it reviews: they keep the generic review prompt.
   */
  reviewRun(ctx, target, thread) {
    if (target?.type !== 'uncommittedChanges') return null
    const args = ['exec', 'review', '--cwd', thread.cwd, '--output-format', 'json']
    const model = minimaxModelId(thread.model)
    if (model) args.push('--model', `${model.provider}/${model.model}`)
    return { args, label: 'Review my uncommitted changes.' }
  },

  /** `mcode exec review --output-format json`'s ExecResult as the review's reply (reviewResultMarkdown). */
  reviewOutput(stdout, stderr, code) {
    const line = String(stdout).trim().split('\n').reverse().find((entry) => entry.trim().startsWith('{'))
    let result = null
    try { result = line ? JSON.parse(line) : null } catch {}
    if (result?.status === 'succeeded') return reviewResultMarkdown(result.output)
    const message = result?.error?.message ?? (typeof result?.output === 'string' ? result.output : null) ?? String(stderr).trim().split('\n').slice(-3).join(' ')
    throw new Error(`MiniMax Code's review did not finish${message ? `: ${message}` : code ? ` (exit ${code})` : '.'}`)
  },

  /** Stops the root session's running delegations (mcode resolves the root itself). */
  async stopDelegation(ctx, host, sessionId) {
    await host.call('mcode/session/delegation/stop', { sessionId }, 30000)
  },

  /**
   * Who pays for the model calls, by mcode's own route (minimaxModelRoute): a custom or configured provider and MiniMax's
   * API with the user's key (`mcode provider set-minimax-key` / `provider use api-key`) bill per token; only the token
   * plan needs the device sign-in.
   */
  account(ctx) {
    const env = ctx.env
    const home = homeOf(env)
    const config = readMinimaxConfig(path.join(home, 'config.yaml'))
    const { route, provider } = minimaxModelRoute(config)
    if (route === 'custom_provider') return { kind: 'apiKey', label: `${provider} API key`, detail: `Custom provider ${provider} in config.yaml`, method: 'api-key', perToken: true }
    if (route === 'minimax_api_key') return { kind: 'apiKey', label: 'MiniMax API key', detail: config.minimaxApiKey ? 'MiniMax API key in config.yaml' : 'MiniMax API key (mcode provider set-minimax-key)', method: 'api-key', perToken: true }
    if (route === 'configured_provider') return { kind: 'apiKey', label: `${provider} provider`, detail: `Provider ${provider} in config.yaml`, method: 'api-key', perToken: true }
    const login = minimaxLogin(home)
    if (login) return { kind: 'oauth', label: 'MiniMax account', email: null, method: 'minimax-code-login', perToken: false, plan: null, ...(login.region ? { detail: `Region: ${login.region === 'cn' ? 'Mainland China (minimaxi.com)' : login.region === 'global' ? 'Global (minimax.io)' : login.region}` } : {}) }
    return { kind: null, label: 'MiniMax account', method: null, perToken: false, hint: 'Sign in with your MiniMax account, or paste a MiniMax API key in Settings › Account.' }
  },

  /**
   * A MiniMax API key (Settings › Account › MiniMax API key): saved and selected by mcode itself (`mcode provider
   * set-minimax-key`, which reads the key from an environment variable, never argv), so config.yaml stays mcode's.
   */
  async connectProvider(ctx, { template, apiKey }) {
    if (template && template !== 'minimax-api-key') throw new Error('Choose MiniMax API key.')
    const { command, args } = ctx.commandLine(['provider', 'set-minimax-key', '--api-key-env', 'CODE_DESKTOP_MINIMAX_API_KEY'])
    try {
      await run(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}), NO_COLOR: '1', CODE_DESKTOP_MINIMAX_API_KEY: apiKey }, cwd: ctx.env.HOME || os.homedir(), timeout: 60000 })
    } catch (error) {
      const detail = String(error?.stderr || error?.stdout || error?.message || error).replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').filter(Boolean).at(-1)
      throw new Error(detail ? `MiniMax Code couldn’t save the key: ${detail}` : 'MiniMax Code couldn’t save the key.')
    }
  },

  login: { type: 'chatgptDeviceCode' },

  startLogin(ctx, { onDone }) {
    return new Promise((resolve, reject) => {
      const { command, args } = ctx.commandLine(['login', '--no-browser'])
      const child = spawn(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}), NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
      let text = ''
      let answered = false
      const scan = (chunk) => {
        text += String(chunk)
        const url = /(https:\/\/\S+)/.exec(text)?.[1]
        const code = /(?:code|Code|CODE)[^A-Z0-9]*([A-Z0-9]{4,}(?:-[A-Z0-9]{4,})?)/.exec(text)?.[1]
        if (!answered && url && code) {
          answered = true
          resolve({ url: url.replace(/[).,]+$/, ''), code, cancel: () => child.kill('SIGTERM') })
        }
      }
      child.stdout.on('data', scan)
      child.stderr.on('data', scan)
      child.on('exit', (code) => {
        if (!answered) { answered = true; reject(new Error(`mcode login stopped: ${text.trim().slice(-400)}`)); return }
        onDone(code === 0, code === 0 ? null : 'Sign-in did not complete.')
      })
      setTimeout(() => { if (!answered) { answered = true; child.kill('SIGTERM'); reject(new Error('mcode login did not show a device code.')) } }, 30000).unref?.()
    })
  },

  async logout(ctx) {
    const { command, args } = ctx.commandLine(['logout'])
    // `mcode logout` opens MiniMax's sign-out page in the default browser (auth-command.ts runTuiLogout, no
    // --no-browser option): a no-op opener keeps that surprise window from appearing.
    await run(command, args, { env: withoutBrowser({ ...ctx.env, ...(ctx.nativeEnv ?? {}) }) })
  },

  mcpServers: (ctx, cwd) => mcpServersOf(ctx, cwd),

  writeMcpServer(ctx, name, value) {
    const home = homeOf(ctx.env)
    const file = fs.existsSync(path.join(home, 'mcp', 'mcp.json')) && !fs.existsSync(path.join(home, 'mcp.json')) ? path.join(home, 'mcp', 'mcp.json') : path.join(home, 'mcp.json')
    const config = readJsonFile(file, {}) ?? {}
    config.mcpServers = { ...config.mcpServers }
    if (value === null) delete config.mcpServers[name]
    else config.mcpServers[name] = value.url ? { url: value.url, type: 'http', ...(value.http_headers ? { headers: value.http_headers } : {}) } : { command: value.command, ...(value.args ? { args: value.args } : {}), ...(value.env ? { env: value.env } : {}) }
    writeJsonFile(file, config)
  },

  /**
   * Project and user skill folders, then MiniMax's built-in skills (<home>/.builtin-skills). A skill the user turned off
   * in mcode (its database's standalone-skill-disabled-state, by SKILL.md location) shows as off.
   */
  skills(ctx, cwd) {
    // config.yaml skills.external decides which external folders mcode reads and which wins a name (minimaxSkillRoots).
    let configText = ''
    try { configText = fs.readFileSync(path.join(homeOf(ctx.env), 'config.yaml'), 'utf8') } catch {}
    const skills = scanSkills(minimaxSkillRoots(ctx.env, cwd, configText))
    const off = disabledSkillUris(ctx)
    if (!off.size) return skills
    return skills.map((skill) => (off.has(skillLocationUri(skill.path)) ? { ...skill, enabled: false, userInvocable: false, modelInvocable: false } : skill))
  },

  /**
   * Customize › Skills switch: written to the user's mcode database as mcode's own switch does (so mcode itself agrees);
   * thread homes copy it at their next launch.
   */
  async setSkillEnabled(ctx, name, enabled, skill) {
    const db = stateDb(homeOf(ctx.env))
    // A home mcode never ran in has no database yet: mcode creates it (and its tables) on any start.
    if (!fs.existsSync(db)) {
      try {
        const { command, args } = ctx.commandLine(['plugin', 'list', '--json'])
        await run(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}), NO_COLOR: '1' }, cwd: ctx.env.HOME || os.homedir(), timeout: 60000 })
      } catch (error) { ctx.log?.(`mcode plugin list: ${String(error?.stderr || error?.message || error).trim().slice(-300)}`) }
    }
    if (!fs.existsSync(db)) throw new Error('MiniMax Code could not open its database: start a MiniMax session once, then try again.')
    const result = minimaxState(ctx, { op: 'setSkill', dbs: [db], uri: skillLocationUri(skill?.path ?? ''), enabled })
    if (!result) throw new Error('MiniMax Code\'s SQLite module is not installed yet: start a MiniMax session once, then try again.')
    disabledSkillsCache = null
  },

  skillPrompt: (skill) => `/${skill.name}`,

  /**
   * Installed plugins as mcode itself reports them (`mcode plugin list --json`: official and local, each with its own
   * on/off state), cached briefly; the plugin folders' manifests only when mcode cannot answer.
   */
  async plugins(ctx) {
    const now = Date.now()
    if (pluginListCache && now - pluginListCache.at < 15000) return pluginListCache.rows
    let rows = null
    try {
      const { command, args } = ctx.commandLine(['plugin', 'list', '--json'])
      const { stdout } = await run(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}), NO_COLOR: '1' }, cwd: ctx.env.HOME || os.homedir(), timeout: 60000 })
      const list = JSON.parse(String(stdout).slice(String(stdout).indexOf('{')))
      if (Array.isArray(list?.installed)) {
        const installed = list.installed.filter((plugin) => plugin && (plugin.pluginId || plugin.name))
        const packageName = (plugin) => String(plugin.name ?? plugin.pluginId)
        rows = installed.map((plugin) => {
          // The row's name is mcode's package name (what `mcode plugin enable|disable|remove` selects); the display name
          // is only shown. A name in both the official and the local marketplace goes as <name>@<marketplace>.
          const name = packageName(plugin)
          const selector = plugin.marketplaceName ? `${name}@${plugin.marketplaceName}` : name
          const shared = installed.filter((other) => packageName(other) === name).length > 1
          return withDisplayName(pluginSummary({
            id: shared ? selector : name, name: shared ? selector : name, version: plugin.version ?? null, description: plugin.description ?? '',
            enabled: plugin.enabled !== false, path: path.join(homeOf(ctx.env), 'plugins'),
            extra: { kind: 'mcode-plugin', marketplace: plugin.marketplaceName ?? null, pluginId: plugin.pluginId ?? null, capabilities: plugin.capabilities ?? null, installName: selector, packageName: name },
          }), plugin.displayName)
        })
      }
    } catch (error) {
      ctx.log?.(`mcode plugin list: ${String(error?.stderr || error?.message || error).trim().slice(-300)}`)
    }
    rows ??= folderPlugins(ctx)
    pluginListCache = { at: now, rows }
    return rows
  },

  /**
   * The official catalog's plugins not installed yet (`mcode plugin list --available --json`), for Customize › Plugins'
   * Available section; `mcode plugin add <name>@official` installs one. Capabilities are counts (appCount,
   * mcpServerCount, skillCount: plugin/contract.ts), shown in the description.
   */
  async availablePlugins(ctx) {
    // Installing an official plugin needs the MiniMax account sign-in (local-runtime-v2 desktop-facade.ts mutateOfficial:
    // PLUGIN_AUTH_REQUIRED), whatever pays for the model: without it each row says so instead of offering an install
    // that can only fail (codeDesktop.signInRequired).
    const signInRequired = !minimaxLogin(homeOf(ctx.env))
    const { command, args } = ctx.commandLine(['plugin', 'list', '--available', '--json'])
    const { stdout } = await run(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}), NO_COLOR: '1' }, cwd: ctx.env.HOME || os.homedir(), timeout: 90000 })
    const list = JSON.parse(String(stdout).slice(String(stdout).indexOf('{')))
    return (Array.isArray(list?.available) ? list.available : []).filter((plugin) => plugin && plugin.name && !plugin.installed).map((plugin) => withDisplayName(pluginSummary({
      id: `${plugin.name}@${plugin.marketplaceName ?? 'official'}`, name: `${plugin.name}@${plugin.marketplaceName ?? 'official'}`, version: plugin.version ?? null,
      description: plugin.description ?? '', enabled: false, path: path.join(homeOf(ctx.env), 'plugins'),
      extra: { kind: 'mcode-plugin', marketplace: plugin.marketplaceName ?? 'official', pluginId: plugin.pluginId ?? null, capabilities: plugin.capabilities ?? null, installName: `${plugin.name}@${plugin.marketplaceName ?? 'official'}`, packageName: String(plugin.name), ...(signInRequired ? { signInRequired: true } : {}) },
    }), plugin.displayName))
  },

  /**
   * plugin/read: what an installed plugin brings (its package under <home>/plugins or the official cache
   * v2/plugin-cache/official, read as mcode's minimax-reader / compatibility-reader do): skills, MCP servers, hooks.
   */
  pluginDetail(ctx, plugin) {
    const pkg = minimaxPluginPackage(ctx.env, plugin.codeDesktop?.packageName ?? plugin.name, plugin.version)
    if (!pkg) return null
    return {
      skills: pkg.skills.map((skill) => ({ name: skill.name, description: skill.description, shortDescription: null, interface: null, path: skill.path, enabled: plugin.enabled !== false })),
      mcpServers: pkg.mcpServers,
      hooks: [],
    }
  },

  /** mcode installs only a catalog entry by name (plugin-command.ts selectPlugin): a path or URL can't be installed. */
  pluginSpecProblem(spec) {
    return /[\\/:]/.test(String(spec ?? '')) ? 'MiniMax Code installs plugins from its official catalog by name. Pick one under Available.' : null
  },

  /** `mcode plugin add|remove|enable|disable` (the user's own home; thread homes copy the state at their next launch). */
  async pluginCommand(ctx, op, value) {
    const verb = op === 'install' ? 'add' : op === 'remove' ? 'remove' : op === 'enable' ? 'enable' : 'disable'
    // An installed plugin goes by its <name>@<marketplace> selector, whatever the app sent (its row name, id, display
    // name or mcode's pluginId): mcode matches the package name only.
    let target = String(value)
    if (op !== 'install') {
      const rows = await this.plugins(ctx)
      const row = rows.find((entry) => entry.name === target || entry.id === target) ?? rows.find((entry) => entry.codeDesktop?.installName === target || entry.codeDesktop?.pluginId === target || entry.interface?.displayName === target)
      if (row?.codeDesktop?.installName) target = row.codeDesktop.installName
    }
    const { command, args } = ctx.commandLine(['plugin', verb, target])
    pluginListCache = null
    try { return await run(command, args, { env: { ...ctx.env, ...(ctx.nativeEnv ?? {}) }, cwd: ctx.env.HOME || os.homedir() }) }
    catch (error) { throw minimaxPluginError(error) }
    finally { pluginListCache = null }
  },

  /**
   * Which models see images (config minimax-model-catalog.ts modalities.input: the M3 family does, M2.7 does not; a
   * custom provider's model when its config.yaml says so). The rest stay text-only, so the composer refuses images there.
   */
  inputModalities(ctx, id) {
    const parsed = minimaxModelId(id)
    if (!parsed) return null
    const { provider, model } = parsed
    if (provider === 'minimax' || provider === 'minimax_api') return /^MiniMax-M3/i.test(model) ? ['text', 'image'] : ['text']
    const custom = /^custom_provider:(.+)$/.exec(provider)?.[1]
    if (!custom) return ['text']
    const entry = readMinimaxConfig(path.join(homeOf(ctx.env), 'config.yaml')).providers[custom]
    return entry?.imageModels.includes(model) ? ['text', 'image'] : ['text']
  },

  builtinTools: () => BUILTIN_TOOLS.map(([name, description]) => ({ name, description })),
  fallbackModels: (ctx) => {
    const config = readMinimaxConfig(path.join(homeOf(ctx.env), 'config.yaml'))
    const custom = Object.entries(config.providers).flatMap(([provider, entry]) => entry.models.map((model) => ({ id: `custom_provider:${provider}/${model}`, name: model })))
    return [...custom, { id: 'minimax/MiniMax-M3', name: 'MiniMax-M3' }, { id: 'minimax/MiniMax-M3.1-Flash-Preview', name: 'MiniMax-M3.1 Flash Preview' }, { id: 'minimax/MiniMax-M2.7', name: 'MiniMax-M2.7' }]
  },
}
