/**
 * Kimi Code (github.com/MoonshotAI/kimi-code, `kimi acp`, the official single-binary release).
 *
 *   home             $KIMI_CODE_HOME or ~/.kimi-code: config.toml (providers, models), mcp.json,
 *                    credentials/, sessions/, skills/, plugins/
 *   system prompt    $KIMI_CODE_HOME/SYSTEM.md (a template: ${base_prompt} is the built-in prompt);
 *   tools            config.toml [tools] disabled = [...] ("mcp__<server>__*" for a server) — both
 *                    home files, so a thread with its own settings runs on an overlay home (overlay.js)
 *   model params     KIMI_MODEL_TEMPERATURE / KIMI_MODEL_MAX_COMPLETION_TOKENS
 *   modes            default (manual approvals) and plan; the bridge answers permissions itself and sends the thread's
 *                    mode on every open (Kimi's engine starts in config.toml's default_permission_mode / default_plan_mode)
 *   sub-agents       Agent / AgentSwarm: ACP streams only the main agent, so each sub-agent's own log
 *                    (sessions/<wd>/<session>/agents/agent-N/wire.jsonl) is followed into a child thread (childLogUpdates)
 *   sessions         ACP list / resume / fork / delete / close; rewind through Kimi's own undo (its local server)
 *   files, commands  fs/read_text_file, fs/write_text_file and terminal/* (Bash runs in the bridge,
 *                    streamed to the command card, sandboxed per mode)
 *   usage            usage_update {used, size} for the context fill; the turn's tokens from the session's
 *                    event logs (sessions/<wd>/<session>/agents/<agent>/wire.jsonl `usage.record` lines,
 *                    which is what Kimi's own /usage adds up), read after each turn
 *   models           config.toml [models.<alias>]: each model's thinking efforts (support_efforts,
 *                    capabilities thinking / always_thinking), context size and image input
 *   questions        AskUserQuestion as an elicitation/create form (every question, multi-select)
 *   compaction       /compact runs in the background: its acknowledgement and later result arrive as
 *                    plain message chunks (filterUpdate turns them into compaction events)
 *   plugins, hooks   plugins/installed.json (+ each plugin's kimi.plugin.json); config.toml [[hooks]]
 *   sign-in          device code (`kimi login`), the account's profile from <base>/me, rate limits
 *                    from the coding plan's /usages
 */

import { execFileSync, spawn } from 'node:child_process'
import crypto, { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { readJsonFile, normalizeMcpServer, scanSkills, writeJsonFile, pluginSummary, projectDirs } from '../catalog.js'
import { createOverlay, settleOverlay, tomlWithDisabledTools, tomlToolsLists, tomlWithToolsList } from '../overlay.js'
import { appToolsServer } from '../app-tools.js'
import { realPath as realPathOf } from '../permissions.js'
import { withoutBrowser } from '../no-browser.js'

export const BUILTIN_TOOLS = [
  ['Read', 'Reads a file.'], ['Write', 'Writes a file.'], ['Edit', 'Edits a file.'], ['Grep', 'Searches file contents.'], ['Glob', 'Finds files by pattern.'],
  ['ReadMediaFile', 'Reads an image or media file.'], ['Bash', 'Runs a shell command.'], ['WebSearch', 'Searches the web.'], ['FetchURL', 'Fetches a web page.'],
  ['TodoList', 'Keeps a todo list.'], ['Agent', 'Runs a sub-agent.'], ['AgentSwarm', 'Runs several sub-agents.'], ['AskUserQuestion', 'Asks the user a question.'],
  ['Skill', 'Runs a skill.'], ['EnterPlanMode', 'Enters plan mode.'], ['ExitPlanMode', 'Leaves plan mode with a plan.'], ['TaskList', 'Lists background tasks.'],
  ['TaskOutput', 'Reads background task output.'], ['TaskStop', 'Stops a background task.'], ['WaitFor', 'Waits for a background task.'],
  ['CronCreate', 'Schedules a task.'], ['CronList', 'Lists scheduled tasks.'], ['CronDelete', 'Deletes a scheduled task.'],
  ['CreateGoal', 'Sets a goal.'], ['GetGoal', 'Reads the goal.'], ['UpdateGoal', 'Updates the goal.'], ['SetGoalBudget', 'Sets the goal budget.'],
]

const homeOf = (env) => env.KIMI_CODE_HOME || path.join(env.HOME || os.homedir(), '.kimi-code')
/** Whether the user's config.toml sets [mcp] tool_timeout_ms (Kimi's global MCP tool-call timeout). */
export function kimiHasToolTimeout(env) {
  let text = ''
  try { text = fs.readFileSync(path.join(homeOf(env), 'config.toml'), 'utf8') } catch { return false }
  let section = ''
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const header = /^\[\s*([^\]]+?)\s*\]$/.exec(line)
    if (header) { section = header[1]; continue }
    if (section === 'mcp' && /^tool_timeout_ms\s*=/.test(line)) return true
    if (!section && /^mcp\.tool_timeout_ms\s*=/.test(line)) return true
  }
  return false
}

/** Kimi's MCP name part (agent-core-v2 mcpCore/tool-naming.ts sanitizeMcpNamePart): other characters → '_', runs of '_' collapsed. */
export const kimiMcpNamePart = (part) => String(part).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')

const MCP_QUALIFIED_MAX = 64
// A qualified name over 64 characters keeps its head and gets '_<hash>' (tool-naming.ts qualifyMcpToolName): the hash
// is a signed 32-bit number in hex, 8 or 9 characters, so the head keeps at least 54.
const MCP_QUALIFIED_HEAD = MCP_QUALIFIED_MAX - 10

/**
 * The [tools] disabled patterns that turn off every tool of an MCP server, as Kimi matches them (picomatch against its
 * qualified names mcp__<server>__<tool>, both parts sanitized): `mcp__<sanitized>__*`, and, for a server name so long
 * that its qualified names are cut and hashed before the tool part, the cut prefix itself.
 */
export function kimiServerDisablePatterns(server) {
  const prefix = `mcp__${kimiMcpNamePart(server)}__`
  const patterns = [`${prefix}*`]
  if (prefix.length > MCP_QUALIFIED_HEAD) patterns.push(`${prefix.slice(0, MCP_QUALIFIED_HEAD)}*`)
  return patterns
}

/** The user's own SYSTEM.md (a template over ${base_prompt}), or null when there is none or it is empty. */
export function userSystemPrompt(home) {
  try {
    const text = fs.readFileSync(path.join(home, 'SYSTEM.md'), 'utf8').replace(/\s+$/, '')
    return text.trim() ? text : null
  } catch { return null }
}

/** A TOML table header's dotted key, split outside quotes ([models."gpt-4.1".overrides] → models, gpt-4.1, overrides). */
export function tomlKeyParts(header) {
  const parts = []
  let current = ''
  let quote = null
  for (const ch of String(header)) {
    if (quote) { if (ch === quote) quote = null; else current += ch; continue }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '.') { parts.push(current.trim()); current = ''; continue }
    current += ch
  }
  parts.push(current.trim())
  return parts
}

/**
 * Minimal TOML facts: top-level default_model, the [providers.*] / [models.*] tables' scalar and array keys (quoted
 * aliases may hold dots), each model's [models.<alias>.overrides], the [thinking] defaults and the [[hooks]] array of tables.
 */
export function readKimiConfig(file) {
  let text = ''
  const out = { providers: {}, models: {}, defaultModel: null, extraSkillDirs: [], thinking: {}, hooks: [], services: {}, permission: { rules: [] }, tools: { enabled: null, disabled: null } }
  try { text = fs.readFileSync(file, 'utf8') } catch { return out }
  // [tools] enabled (an allowlist when not empty) / disabled, wherever the file keeps them (overlay.js tomlToolsLists).
  out.tools = tomlToolsLists(text) ?? { enabled: null, disabled: null, unreadable: true }
  let table = null
  let hook = null
  const lines = text.split('\n')
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index].replace(/\s+#.*$/, '').trim()
    if (!line || line.startsWith('#')) continue
    const array = /^\[\[([^\]]+)\]\]$/.exec(line)
    if (array) {
      table = null
      hook = null
      if (array[1].trim() === 'hooks') { hook = {}; out.hooks.push(hook) }
      // [[permission.rules]] (and the [[permission.allow|ask|deny]] shorthands, whose decision is the table's name).
      const rule = /^permission\.(rules|allow|ask|deny)$/.exec(array[1].trim().replace(/\s+/g, ''))
      if (rule) { hook = rule[1] === 'rules' ? {} : { decision: rule[1] }; out.permission.rules.push(hook) }
      continue
    }
    const header = /^\[(.+)\]$/.exec(line)
    if (header) {
      hook = null
      const parts = tomlKeyParts(header[1])
      table = parts
      if ((parts[0] === 'providers' || parts[0] === 'models') && parts.length >= 2) out[parts[0]][parts[1]] ??= {}
      // [services.moonshot_search] / [services.moonshot_fetch]: Kimi's web search and fetch services.
      if (parts[0] === 'services' && parts.length >= 2) out.services[parts[1]] ??= {}
      if (parts[0] === 'models' && parts.length === 3 && parts[2] === 'overrides') out.models[parts[1]].overrides ??= {}
      continue
    }
    const pair = /^([A-Za-z0-9_"-]+)\s*=\s*(.+)$/.exec(line)
    if (!pair) continue
    const key = pair[1].replace(/"/g, '')
    let raw = pair[2]
    // A multi-line array: read on to its closing bracket.
    while (raw.startsWith('[') && !balanced(raw) && index + 1 < lines.length) raw += ` ${lines[++index].replace(/\s+#.*$/, '').trim()}`
    let value = raw
    try { value = JSON.parse(raw.replace(/'/g, '"').replace(/,\s*\]/g, ']')) } catch {}
    if (hook) hook[key] = value
    else if (!table && key === 'default_model') out.defaultModel = value
    else if (!table && key === 'extra_skill_dirs') out.extraSkillDirs = Array.isArray(value) ? value.filter((entry) => typeof entry === 'string' && entry) : []
    else if (table && table.length === 1 && table[0] === 'thinking') out.thinking[key] = value
    else if (table && table.length === 1 && table[0] === 'permission' && key !== 'rules') out.permission[key] = value
    else if (table && (table[0] === 'providers' || table[0] === 'models') && table.length === 2) out[table[0]][table[1]][key] = value
    else if (table && table[0] === 'models' && table.length === 3 && table[2] === 'overrides') out.models[table[1]].overrides[key] = value
    else if (table && table[0] === 'services' && table.length === 2) out.services[table[1]][key] = value
    // [providers."managed:kimi-code".oauth] key = "oauth/…": where the sign-in's token is stored.
    else if (table && table[0] === 'providers' && table.length === 3) { const provider = (out.providers[table[1]] ??= {}); (provider[table[2]] = isPlainObject(provider[table[2]]) ? provider[table[2]] : {})[key] = value }
  }
  return out
}

function balanced(text) {
  let depth = 0
  for (const ch of text) { if (ch === '[') depth++; else if (ch === ']') depth-- }
  return depth <= 0
}

/**
 * Kimi's thinking switch for a model (acp-server model-catalog.ts): its efforts, default and modalities. The effective
 * fields are [models.<alias>.overrides] over the model's own (what Kimi's runtime reads); a new session starts on
 * [thinking] effort when the model takes it (else the model's default_effort), and off when [thinking] enabled = false.
 */
export function kimiModelInfo(alias, raw = {}, thinkingDefaults = {}) {
  const model = { ...raw, ...(isPlainObject(raw.overrides) ? raw.overrides : {}) }
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities.map(String) : []
  const levels = Array.isArray(model.support_efforts) ? model.support_efforts.map(String).filter(Boolean) : []
  const always = capabilities.includes('always_thinking')
  const thinking = capabilities.includes('thinking') || always || /thinking|reason/i.test(alias) || ['kimi-for-coding', 'kimi-code'].includes(alias)
  const values = !thinking ? [] : (levels.length ? ['off', ...levels] : ['off', 'on']).filter((value) => !(always && value === 'off'))
  const named = (value) => `Thinking ${value.charAt(0).toUpperCase()}${value.slice(1)}`
  const preferred = typeof thinkingDefaults?.effort === 'string' && levels.includes(thinkingDefaults.effort) ? thinkingDefaults.effort : null
  const modelDefault = levels.length ? (typeof model.default_effort === 'string' && levels.includes(model.default_effort) ? model.default_effort : levels[Math.floor(levels.length / 2)]) : 'on'
  const defaultEffort = !thinking ? null : thinkingDefaults?.enabled === false && !always ? 'off' : preferred ?? modelDefault
  return {
    id: alias,
    name: String(model.display_name ?? model.model ?? alias),
    contextWindow: Number(model.max_context_size) || Number(model.max_input_size) || null,
    efforts: values.map((value) => ({ id: value, name: named(value) })),
    defaultEffort,
    inputModalities: capabilities.includes('image_in') ? ['text', 'image'] : ['text'],
  }
}

/** Kimi hook events (PreToolUse …) as Codex HookEventName (preToolUse …). */
const hookEventName = (event) => (typeof event === 'string' && event ? `${event.charAt(0).toLowerCase()}${event.slice(1)}` : 'unknown')

/** One configured hook as Codex HookMetadata. */
function hookMetadata(hook, { key, source, sourcePath, pluginId = null, order }) {
  return {
    key, eventName: hookEventName(hook.event), matcher: typeof hook.matcher === 'string' && hook.matcher ? hook.matcher : null,
    timeoutSec: Number.isInteger(hook.timeout) ? hook.timeout : 30, statusMessage: null, additionalContextLimit: null,
    sourcePath, source, pluginId, displayOrder: order, enabled: true, isManaged: false, currentHash: '', trustStatus: 'trusted',
    handlerType: 'command', command: String(hook.command ?? ''), async: false,
  }
}

/** The slash-menu path of the bridge's own /init (no file of its own). */
const KIMI_INIT_COMMAND = 'kimi-builtin:init'
/**
 * /init's turn: what Kimi's own /init asks of the model (agent-core-v2 features/sessionInit, profile/init.md), in Code
 * Desktop's words. Kimi's ACP mode doesn't offer /init (acp-server slash.ts answers 'Unknown ACP command').
 */
const KIMI_INIT_PROMPT = `Explore the project in the current directory to understand its architecture and the details that matter for working on it, then write what you found to AGENTS.md at the project root.

Find out:
1. The project structure and its key configuration files (package.json, pyproject.toml, Cargo.toml and the like).
2. The technology stack, how it is built and how it runs.
3. How the code is organized and what the main modules are.
4. The project's own conventions for development, testing and deployment.

AGENTS.md is read by AI coding agents that know nothing about the project. If it already exists, read it first and keep whatever is still accurate: the result is one coherent, up-to-date file, not an addition. Write only what the project shows, without assumptions, in the natural language its comments and documentation mainly use. Useful sections are a project overview, build and test commands, code style, testing instructions and security considerations.`

/**
 * Kimi's workspace trust records (agent-core-v2 workspace/workspaceTrust/trustRecord.ts): <home>/workspace-trust/<key>,
 * JSON {root, trustedAt}, key = wd_<slug of the folder name>_<sha256(root) first 12 hex> of the canonical root.
 */
export function kimiWorkDirKey(root) {
  const normalized = String(root).replace(/\\/g, '/').replace(/\/+$/, '')
  const base = normalized.split('/').pop() ?? normalized
  let slug = base.toLowerCase().replaceAll(/[^a-z0-9._-]+/g, '-').replaceAll(/^-+|-+$/g, '').slice(0, 40).replaceAll(/^-+|-+$/g, '')
  if (slug === '' || slug === '.' || slug === '..') slug = 'workspace'
  return `wd_${slug}_${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12)}`
}
function trustRoots(cwd) {
  const roots = new Set([path.resolve(cwd)])
  try { roots.add(fs.realpathSync(cwd)) } catch {}
  return [...roots]
}
export function kimiWorkspaceTrusted(env, cwd) {
  if (typeof cwd !== 'string' || !cwd) return false
  const dir = path.join(homeOf(env), 'workspace-trust')
  return trustRoots(cwd).some((root) => fs.existsSync(path.join(dir, kimiWorkDirKey(root))))
}
export function writeKimiWorkspaceTrust(env, cwd) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) throw new Error('Choose a folder to trust.')
  const root = path.resolve(cwd)
  const dir = path.join(homeOf(env), 'workspace-trust')
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 })
  const file = path.join(dir, kimiWorkDirKey(root))
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify({ root, trustedAt: Date.now() }), { mode: 0o600 })
  fs.renameSync(temp, file)
  return true
}

/** The plugin records of plugins/installed.json ({version: 1, plugins: [{id, root, enabled, …}]}). */
function installedPlugins(env) {
  const file = path.join(homeOf(env), 'plugins', 'installed.json')
  const installed = readJsonFile(file, null)
  return { file, installed, records: Array.isArray(installed?.plugins) ? installed.plugins : Array.isArray(installed) ? installed : [] }
}

/**
 * The MCP servers enabled plugins declare, as Kimi runs them (agent-core-v2 app/plugin/manager.ts enabledMcpServers /
 * mcpServerEntries): named `plugin-<id>:<server>`, a ./ command and cwd resolved inside the plugin, the plugin root as the
 * default cwd, KIMI_CODE_HOME / KIMI_PLUGIN_ROOT in its env; off when installed.json capabilities.mcpServers[server]
 * .enabled says so (else the manifest's own `enabled`). A disabled plugin's servers are listed off too, so its detail
 * can name them.
 */
export function kimiPluginMcpServers(env) {
  const out = []
  for (const record of installedPlugins(env).records) {
    if (!record || (record.state && record.state !== 'ok')) continue
    const root = record.root ?? record.path
    const manifest = pluginManifest(root)
    if (!manifest || typeof root !== 'string' || !manifest.mcpServers || typeof manifest.mcpServers !== 'object') continue
    const id = String(record.id ?? record.name)
    const base = path.resolve(root)
    const inside = (value) => { const resolved = path.resolve(base, value); return resolved === base || resolved.startsWith(base + path.sep) ? resolved : null }
    for (const [server, config] of Object.entries(manifest.mcpServers)) {
      if (!config || typeof config !== 'object' || !server.trim()) continue
      const remote = config.transport === 'http' || config.transport === 'sse' || typeof config.url === 'string'
      let command = typeof config.command === 'string' ? config.command : null
      if (!remote) {
        if (!command) continue
        if (command.startsWith('./')) { command = inside(command); if (!command) continue }
        else if (command.includes('/')) continue
      }
      const cwd = !remote && typeof config.cwd === 'string' ? (config.cwd.startsWith('./') ? inside(config.cwd) : null) : null
      const own = record.capabilities?.mcpServers?.[server]?.enabled
      const enabled = record.enabled !== false && (typeof own === 'boolean' ? own : config.enabled !== false)
      const value = remote ? { ...config } : { ...config, command, cwd: cwd ?? base, env: { ...(config.env ?? {}), KIMI_CODE_HOME: homeOf(env), KIMI_PLUGIN_ROOT: base } }
      const normalized = normalizeMcpServer(`plugin-${id}:${server}`, value, 'plugin', { pluginId: id, pluginServer: server })
      if (normalized) out.push({ ...normalized, disabled: !enabled, pluginEnabled: record.enabled !== false })
    }
  }
  return out
}

/** The slash commands enabled plugins declare (manifest `commands`: .md files or folders), as `/<plugin>:<name>`. */
export function kimiPluginCommands(env) {
  const out = []
  for (const record of installedPlugins(env).records) {
    if (!record || record.enabled === false || (record.state && record.state !== 'ok')) continue
    const root = record.root ?? record.path
    const manifest = pluginManifest(root)
    if (!manifest || typeof root !== 'string' || manifest.commands === undefined) continue
    const id = String(record.id ?? record.name)
    const base = path.resolve(root)
    const entries = (Array.isArray(manifest.commands) ? manifest.commands : [manifest.commands]).filter((entry) => typeof entry === 'string' && entry.startsWith('./'))
    const files = []
    const walk = (dir, top, depth = 0) => {
      if (depth > 6) return
      let list = []
      try { list = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const entry of list) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full, top, depth + 1)
        else if (entry.isFile() && entry.name.endsWith('.md')) files.push({ file: full, name: path.relative(top, full).replace(/\.md$/i, '').split(path.sep).join('/') })
      }
    }
    for (const entry of entries) {
      const resolved = path.resolve(base, entry)
      if (resolved !== base && !resolved.startsWith(base + path.sep)) continue
      let stat = null
      try { stat = fs.statSync(resolved) } catch { continue }
      if (stat.isDirectory()) walk(resolved, resolved)
      else if (stat.isFile() && resolved.endsWith('.md')) files.push({ file: resolved, name: path.basename(resolved).replace(/\.md$/i, '') })
    }
    for (const { file, name: fallback } of files) {
      let text = ''
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
      const field = (key) => (front ? new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm').exec(front[1])?.[1]?.trim().replace(/^['"]|['"]$/g, '') : null) || null
      const body = (front ? text.slice(front[0].length) : text).trim()
      const name = field('name') ?? fallback
      const description = field('description') ?? (body.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 240) ?? '')
      out.push({ name: `${id}:${name}`, description, file, prompt: body, builtin: null, scope: 'user', extension: id, usesArgs: body.includes('$ARGUMENTS'), pluginCommand: true })
    }
  }
  return out
}

/** Kimi's $ARGUMENTS substitution for a plugin command (agent-core-v2 app/plugin/commands.ts expandCommandArguments). */
export function kimiExpandArguments(body, args) {
  const text = String(body ?? ''), value = String(args ?? '')
  const replaced = text.replaceAll('$ARGUMENTS', value)
  return !text.includes('$ARGUMENTS') && value.length > 0 ? `${replaced}\n\nARGUMENTS: ${value}` : replaced
}

/** A plugin's manifest: <root>/kimi.plugin.json, else <root>/.kimi-plugin/plugin.json. */
function pluginManifest(root) {
  if (typeof root !== 'string' || !root) return null
  return readJsonFile(path.join(root, 'kimi.plugin.json'), null) ?? readJsonFile(path.join(root, '.kimi-plugin', 'plugin.json'), null)
}

/**
 * A plugin's skill roots (agent-core-v2 app/plugin/manifest.ts): its manifest's `skills` (one or more ./ paths inside
 * the plugin), else its root SKILL.md as the only skill. Disabled plugins have none unless asked (plugin/read).
 */
function pluginSkillRootsOf(record, { includeDisabled = false } = {}) {
  if (!record || (!includeDisabled && record.enabled === false)) return []
  const root = record.root ?? record.path
  const manifest = pluginManifest(root)
  if (!manifest || typeof root !== 'string') return []
  const id = String(record.id ?? record.name)
  const base = path.resolve(root)
  const inside = (dir) => { const resolved = path.resolve(base, dir); return resolved === base || resolved.startsWith(base + path.sep) ? resolved : null }
  const listed = manifest.skills === undefined ? null : (Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills]).filter((dir) => typeof dir === 'string' && dir)
  if (listed) return listed.map(inside).filter(Boolean).map((dir) => ({ path: dir, scope: 'user', pluginId: id, pluginRoot: true }))
  return fs.existsSync(path.join(base, 'SKILL.md')) ? [{ path: base, scope: 'user', pluginId: id, rootOnly: true }] : []
}
const kimiPluginSkillRoots = (env) => installedPlugins(env).records.flatMap((record) => pluginSkillRootsOf(record))

/** The managed Kimi Code endpoint (the provider's base_url after sign-in, else KIMI_CODE_BASE_URL, else Kimi's default). */
function managedBase(env) {
  const config = readKimiConfig(path.join(homeOf(env), 'config.toml'))
  const managed = Object.entries(config.providers).find(([name]) => name.startsWith('managed:kimi-code'))?.[1]
  const base = (typeof managed?.base_url === 'string' && /^https:\/\//.test(managed.base_url) ? managed.base_url : null) || env.KIMI_CODE_BASE_URL || 'https://api.kimi.com/coding/v1'
  return base.replace(/\/+$/, '')
}

/** The session's event logs (one per agent: main and its sub-agents) under any workspace folder. */
function wireFiles(env, sessionId) {
  const root = path.join(homeOf(env), 'sessions')
  let workspaces = []
  try { workspaces = fs.readdirSync(root) } catch { return [] }
  for (const workspace of workspaces) {
    const agents = path.join(root, workspace, sessionId, 'agents')
    let names = []
    try { names = fs.readdirSync(agents) } catch { continue }
    return names.map((name) => path.join(agents, name, 'wire.jsonl')).filter((file) => fs.existsSync(file))
  }
  return []
}

const sizeOf = (file) => { try { return fs.statSync(file).size } catch { return 0 } }

/** The session's agents/ folder (one sub-folder per agent: main, agent-0 …), or null before Kimi wrote it. */
function agentsDir(env, sessionId) {
  const root = path.join(homeOf(env), 'sessions')
  let workspaces = []
  try { workspaces = fs.readdirSync(root) } catch { return null }
  for (const workspace of workspaces) {
    const dir = path.join(root, workspace, sessionId, 'agents')
    if (fs.existsSync(dir)) return dir
  }
  return null
}

/** The whole JSON lines appended to a log since state.offset (advanced past them; a line still being written waits). */
export function readWireRecords(file, state) {
  const end = sizeOf(file)
  if (end < state.offset) state.offset = 0
  if (end <= state.offset) return []
  let text = ''
  try {
    const fd = fs.openSync(file, 'r')
    try { const buffer = Buffer.alloc(end - state.offset); fs.readSync(fd, buffer, 0, buffer.length, state.offset); text = buffer.toString('utf8') } finally { fs.closeSync(fd) }
  } catch { return [] }
  const last = text.lastIndexOf('\n')
  if (last < 0) return []
  state.offset += Buffer.byteLength(text.slice(0, last + 1), 'utf8')
  const out = []
  for (const line of text.slice(0, last).split('\n')) {
    if (!line) continue
    try { out.push(JSON.parse(line)) } catch {}
  }
  return out
}

/** Kimi's tool kinds (acp-server events-map.ts inferToolKind), for the tool calls of a sub-agent's log. */
const TOOL_KINDS = { Read: 'read', Glob: 'read', Grep: 'read', Write: 'edit', Edit: 'edit', Bash: 'execute', Terminal: 'execute', WebFetch: 'fetch', WebSearch: 'fetch', FetchURL: 'fetch', Think: 'think' }

/**
 * One record of a sub-agent's wire.jsonl as the ACP session updates kimi-acp would have sent had it streamed that agent
 * (it streams only the main one): text and thinking parts, tool calls (a diff display as diff content) and their results.
 * {updates, ended} — ended when the agent's turn is over.
 */
export function kimiWireUpdates(record, agentId) {
  if (record?.type === 'turn.ended' && (!record.agentId || record.agentId === agentId)) return { updates: [], ended: true, failed: record.reason && !['completed', 'done'].includes(record.reason) }
  if (record?.type !== 'context.append_loop_event' || !isPlainObject(record.event)) return { updates: [], ended: false }
  const event = record.event
  const id = (callId) => `${agentId}:${callId}`
  if (event.type === 'content.part' && isPlainObject(event.part)) {
    if (event.part.type === 'text' && typeof event.part.text === 'string' && event.part.text) return { updates: [{ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: event.part.text } }], ended: false }
    if (event.part.type === 'think' && typeof event.part.think === 'string' && event.part.think && event.part.hidden !== true) return { updates: [{ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: event.part.think } }], ended: false }
    return { updates: [], ended: false }
  }
  if (event.type === 'tool.call' && typeof event.toolCallId === 'string') {
    const name = String(event.name ?? 'tool')
    const args = isPlainObject(event.args) ? event.args : {}
    const display = isPlainObject(event.display) ? event.display : null
    const content = display && (display.kind === 'diff' || (display.kind === 'file_io' && display.before !== undefined && display.after !== undefined)) && typeof display.path === 'string'
      ? [{ type: 'diff', path: display.path, oldText: display.before ?? null, newText: display.after ?? '' }]
      : []
    const file = typeof args.path === 'string' && path.isAbsolute(args.path) ? args.path : typeof args.file_path === 'string' && path.isAbsolute(args.file_path) ? args.file_path : null
    return { updates: [{ sessionUpdate: 'tool_call', toolCallId: id(event.toolCallId), title: name, kind: TOOL_KINDS[name] ?? 'other', status: 'in_progress', rawInput: args, ...(file && ['Read', 'Write', 'Edit', 'Glob', 'Grep'].includes(name) ? { locations: [{ path: file }] } : {}), content }], ended: false }
  }
  if (event.type === 'tool.result' && typeof event.toolCallId === 'string') {
    const result = isPlainObject(event.result) ? event.result : {}
    const output = result.output
    const text = typeof output === 'string' ? output : output === undefined || output === null ? '' : (() => { try { return JSON.stringify(output) } catch { return '' } })()
    return { updates: [{ sessionUpdate: 'tool_call_update', toolCallId: id(event.toolCallId), status: result.isError === true ? 'failed' : 'completed', content: text ? [{ type: 'content', content: { type: 'text', text } }] : [] }], ended: false }
  }
  return { updates: [], ended: false }
}

/** A sub-agent's first prompt in its log (turn.prompt input text), or null while it is not written yet. */
function agentPrompt(records) {
  const prompt = records.find((record) => record?.type === 'turn.prompt')
  if (!prompt) return null
  return (Array.isArray(prompt.input) ? prompt.input : []).map((block) => (typeof block?.text === 'string' ? block.text : '')).join('').trim()
}

/** Kimi's sub-agent launches (Agent: "Launching [background ]<profile> agent: <description>", AgentSwarm: "Launching agent swarm: …"). */
export function kimiSubagentCall(call) {
  const title = String(call?.title ?? '')
  const input = isPlainObject(call?.rawInput) ? call.rawInput : {}
  if (title === 'AgentSwarm' || /^Launching agent swarm: /.test(title) || (Array.isArray(input.items) && typeof input.description === 'string' && !('prompt' in input))) {
    return { swarm: true, background: false, profile: 'swarm', label: typeof input.description === 'string' && input.description ? input.description : title.replace(/^Launching agent swarm: /, '') || 'Agent swarm', prompt: typeof input.description === 'string' ? input.description : null }
  }
  const launch = /^Launching (background )?(.+?) agent: ([\s\S]*)$/.exec(title)
  if (title === 'Agent' || launch || (typeof input.prompt === 'string' && typeof input.description === 'string' && !('url' in input) && !('query' in input))) {
    return {
      swarm: false, background: Boolean(launch?.[1]) || input.run_in_background === true, profile: launch?.[2] ?? (typeof input.subagent_type === 'string' && input.subagent_type ? input.subagent_type : null),
      label: typeof input.description === 'string' && input.description ? input.description : launch?.[3] || 'Sub-agent', prompt: typeof input.prompt === 'string' ? input.prompt : null, resume: typeof input.resume === 'string' && input.resume ? input.resume : null,
    }
  }
  return null
}

/**
 * The sub-agent a launch's result names (Kimi's Agent tool answers 'agent_id: agent-0', a background launch at once,
 * before that agent's log exists), else null.
 */
export function kimiLaunchAgentId(call) {
  const texts = [blockTextOf(call?.content) ?? '']
  const raw = call?.rawOutput
  if (typeof raw === 'string') texts.push(raw)
  else if (raw && typeof raw === 'object') { try { texts.push(JSON.stringify(raw)) } catch {} }
  for (const text of texts) {
    const hit = /\bagent_id:\s*([A-Za-z0-9_-]{1,64})/.exec(text) ?? /"agent_id"\s*:\s*"([A-Za-z0-9_-]{1,64})"/.exec(text)
    if (hit && hit[1] !== 'main') return hit[1]
  }
  return null
}

/** How long a background launch whose agent has not shown up yet stays a candidate for the next new agent log. */
const KIMI_BACKGROUND_BIND_MS = 10 * 60 * 1000

/**
 * Binds sub-agent `name` (whose log exists: it just asked for approval) to the latest background launch still waiting
 * for its agent (childLogUpdates' state.waiting) whose result names no other agent. true when it did.
 */
function bindWaitingLaunch(ctx, thread, name) {
  const state = thread.kimiChildren
  const dir = agentsDir(ctx.env, thread.id)
  if (!state?.waiting?.size || !dir || state.bound.has(name)) return false
  const found = [...state.waiting.entries()].findLast(([, entry]) => { const id = kimiLaunchAgentId(entry.call); return !id || id === name })
  if (!found) return false
  const [callId, { call }] = found
  const launch = kimiSubagentCall(call) ?? {}
  const before = thread.kimiAgentSizes ?? {}
  state.waiting.delete(callId)
  if (!state.byCall.has(callId)) state.byCall.set(callId, new Set())
  state.byCall.get(callId).add(name)
  state.bound.set(name, { file: path.join(dir, name, 'wire.jsonl'), offset: Object.hasOwn(before, name) ? before[name] : 0, callId, done: false, background: true, prompt: launch.prompt ?? null, label: launch.profile ?? launch.label ?? name })
  return true
}

/**
 * A sub-agent's approval request (its wire.jsonl `interaction.request` record, kind approval: toolName, action, display)
 * as the ACP tool call kimi-acp would have streamed for it. Kimi's ACP sends a sub-agent's permission with only the
 * tool's name and 'Requesting approval to <action>' (no rawInput), and the call itself reaches the sub-agent's log only
 * once it was answered, so its arguments come from the request's display. {toolCallId, title, kind, rawInput, content,
 * locations}; agentId names the sub-agent ('agent-0').
 */
export function kimiApprovalCall(request, agentId) {
  const display = isPlainObject(request?.display) ? request.display : {}
  const name = String(request?.toolName ?? 'tool')
  const action = typeof request?.action === 'string' ? request.action : ''
  let rawInput = {}
  const filePath = typeof display.path === 'string' && display.path ? display.path : null
  if (display.kind === 'command' && typeof display.command === 'string') rawInput = { command: display.command, ...(typeof display.description === 'string' && display.description ? { description: display.description } : {}) }
  else if (display.kind === 'file_io' && filePath) rawInput = { path: filePath, ...(typeof display.content === 'string' ? { content: display.content } : typeof display.after === 'string' && display.before === undefined ? { content: display.after } : {}), ...(display.operation === 'grep' || display.operation === 'glob' ? (typeof display.detail === 'string' ? { pattern: display.detail } : {}) : {}) }
  else if (display.kind === 'diff' && filePath) rawInput = { path: filePath }
  else if (display.kind === 'url_fetch' && typeof display.url === 'string') rawInput = { url: display.url }
  else if (display.kind === 'search' && typeof display.query === 'string') rawInput = { query: display.query }
  else if (display.kind === 'agent_call') rawInput = { description: String(display.agent_name ?? ''), prompt: String(display.prompt ?? ''), ...(display.background === true ? { run_in_background: true } : {}) }
  else if (display.kind === 'skill_call') rawInput = { skill: String(display.skill_name ?? ''), ...(typeof display.args === 'string' ? { args: display.args } : {}) }
  else if (display.kind === 'task_stop') rawInput = { task_id: String(display.task_id ?? '') }
  else if (display.kind === 'generic' && isPlainObject(display.detail)) rawInput = { ...display.detail }
  else {
    const fromAction = kimiActionInput(name, action)
    if (fromAction) rawInput = fromAction
  }
  const diff = filePath && (display.kind === 'diff' || (display.kind === 'file_io' && display.before !== undefined && display.after !== undefined))
    ? [{ type: 'diff', path: filePath, oldText: display.before ?? null, newText: display.after ?? '' }]
    : []
  const kind = TOOL_KINDS[name]
    ?? (display.kind === 'command' ? 'execute' : display.kind === 'diff' ? 'edit' : display.kind === 'file_io' ? (display.operation === 'write' || display.operation === 'edit' ? 'edit' : display.operation === 'read' ? 'read' : 'search') : display.kind === 'url_fetch' || display.kind === 'search' ? 'fetch' : 'other')
  const callId = String(request?.toolCallId ?? name)
  return {
    toolCallId: `${agentId}:${callId}`, title: name, kind, rawInput, content: diff,
    ...(filePath && path.isAbsolute(filePath) ? { locations: [{ path: filePath }] } : {}),
    action,
  }
}

/** A tool's arguments from Kimi's approval wording alone ('Running: <cmd>', 'Writing <path>', 'Editing <path>'), or null. */
export function kimiActionInput(name, action) {
  const text = String(action ?? '').replace(/^Requesting approval to\s+/, '')
  const command = /^Running:\s*([\s\S]+)$/.exec(text)?.[1]
  if (command && (name === 'Bash' || name === 'Terminal' || !name)) return { command }
  const file = /^(?:Writing|Editing|Reading)\s+(.+)$/.exec(text)?.[1]
  if (file && ['Write', 'Edit', 'Read'].includes(name)) return { path: file.trim() }
  return null
}

/**
 * The approval requests the session's sub-agents wrote (agents/agent-N/wire.jsonl interaction.request, kind approval),
 * read on from where the last look stopped: {agentId, request} for the raw call id, or null while it is not written.
 */
export function kimiSubagentApprovalRecord(env, thread, callId) {
  const state = (thread.kimiApprovalLog ??= { cursors: new Map(), byCall: new Map() })
  if (state.byCall.has(callId)) return state.byCall.get(callId)
  const dir = agentsDir(env, thread.id)
  if (!dir) return null
  let names = []
  try { names = fs.readdirSync(dir).filter((name) => name !== 'main') } catch { return null }
  for (const name of names) {
    const file = path.join(dir, name, 'wire.jsonl')
    if (!state.cursors.has(file)) state.cursors.set(file, { offset: 0 })
    for (const record of readWireRecords(file, state.cursors.get(file))) {
      if (record?.type !== 'interaction.request' || record.kind !== 'approval' || !isPlainObject(record.request)) continue
      const id = typeof record.request.toolCallId === 'string' ? record.request.toolCallId : typeof record.toolCallId === 'string' ? record.toolCallId : null
      if (id) state.byCall.set(id, { agentId: typeof record.agentId === 'string' && record.agentId ? record.agentId : name, request: record.request })
    }
  }
  return state.byCall.get(callId) ?? null
}

/** Whether a session log recorded a turn's end after `offset` (turn.ended / prompt.completed). */
function turnEndedSince(file, offset) {
  const end = sizeOf(file)
  if (end <= offset) return false
  try {
    const fd = fs.openSync(file, 'r')
    try {
      const buffer = Buffer.alloc(end - offset)
      fs.readSync(fd, buffer, 0, buffer.length, offset)
      return /"type":"(turn\.ended|prompt\.completed)"/.test(buffer.toString('utf8'))
    } finally { fs.closeSync(fd) }
  } catch { return false }
}

/**
 * The session's goal from its main wire.jsonl (agent-core-v2 features/goal goalOps.ts durable records): goal.create
 * {goalId, objective, time}, goal.update {status, turnsUsed, tokensUsed, wallClockMs, time}, goal.clear. Folded in order;
 * null when there is none. Codex's ThreadGoal shape (status active | paused | blocked | complete).
 */
export function readKimiGoal(file, state = { offset: 0, goal: null }) {
  // Only the bytes appended since the last read (state {offset, goal} lives on the thread): a long session's log is
  // never re-read whole each turn. A shorter file (rewritten) starts over.
  const end = sizeOf(file)
  if (end < state.offset) { state.offset = 0; state.goal = null }
  if (end > state.offset) {
    let text = ''
    try {
      const fd = fs.openSync(file, 'r')
      try { const buffer = Buffer.alloc(end - state.offset); fs.readSync(fd, buffer, 0, buffer.length, state.offset); text = buffer.toString('utf8') } finally { fs.closeSync(fd) }
    } catch { return projectKimiGoal(state.goal) }
    const complete = text.lastIndexOf('\n')
    if (complete >= 0) {
      for (const line of text.slice(0, complete).split('\n')) {
        if (!line.includes('"goal.')) continue
        let record
        try { record = JSON.parse(line) } catch { continue }
        const at = Number.isFinite(record.time) ? Math.floor(record.time / 1000) : null
        if (record.type === 'goal.create' && typeof record.objective === 'string') state.goal = { goalId: record.goalId ?? null, objective: record.objective, status: 'active', turnsUsed: 0, tokensUsed: 0, wallClockMs: 0, createdAt: at, updatedAt: at }
        else if (record.type === 'goal.update' && state.goal) {
          for (const key of ['status', 'turnsUsed', 'tokensUsed', 'wallClockMs']) if (record[key] !== undefined && record[key] !== null) state.goal[key] = record[key]
          state.goal.updatedAt = at ?? state.goal.updatedAt
        } else if (record.type === 'goal.clear') state.goal = null
      }
      state.offset += Buffer.byteLength(text.slice(0, complete + 1), 'utf8')
    }
  }
  return projectKimiGoal(state.goal)
}
function projectKimiGoal(goal) {
  if (!goal) return null
  const count = (value) => (Number.isFinite(value) && value >= 0 ? value : 0)
  const now = Math.floor(Date.now() / 1000)
  return {
    objective: goal.objective, status: ['active', 'paused', 'blocked', 'complete'].includes(goal.status) ? goal.status : 'active',
    tokenBudget: null, tokensUsed: count(goal.tokensUsed), timeUsedSeconds: Math.floor(count(goal.wallClockMs) / 1000),
    createdAt: goal.createdAt ?? now, updatedAt: goal.updatedAt ?? now, codeDesktop: { goalId: goal.goalId, rounds: count(goal.turnsUsed) },
  }
}

/** The usage.record lines appended to the session's logs since `cursor` (file → byte offset); advances it. */
export function readUsageSince(files, cursor) {
  const total = { inputOther: 0, output: 0, inputCacheRead: 0, inputCacheCreation: 0 }
  let model = null
  let found = false
  for (const file of files) {
    const start = cursor[file] ?? 0
    const end = sizeOf(file)
    if (end <= start) { cursor[file] = Math.min(start, end); continue }
    let text = ''
    try {
      const fd = fs.openSync(file, 'r')
      try {
        const buffer = Buffer.alloc(end - start)
        fs.readSync(fd, buffer, 0, buffer.length, start)
        text = buffer.toString('utf8')
      } finally { fs.closeSync(fd) }
    } catch { continue }
    // Only whole lines: a record still being written is read next time.
    const last = text.lastIndexOf('\n')
    if (last < 0) continue
    cursor[file] = start + Buffer.byteLength(text.slice(0, last + 1))
    for (const line of text.slice(0, last).split('\n')) {
      if (!line.includes('"usage.record"')) continue
      let record
      try { record = JSON.parse(line) } catch { continue }
      if (record?.type !== 'usage.record' || !record.usage) continue
      found = true
      for (const key of Object.keys(total)) total[key] += Number.isFinite(record.usage[key]) ? record.usage[key] : 0
      if (typeof record.model === 'string' && record.model) model = record.model
    }
  }
  if (!found) return null
  return { usage: { inputTokens: total.inputOther + total.inputCacheRead + total.inputCacheCreation, cachedInputTokens: total.inputCacheRead, outputTokens: total.output }, model }
}

/**
 * Kimi's provider error (agent-core-v2 KimiErrorPayload {code, name, message, details}: llm-adapter/contract/errors.ts
 * codes, kosong error class names) as Codex's CodexErrorInfo, or null when no Codex identity fits.
 */
export function kimiErrorInfo(error) {
  const name = String(error?.name ?? '')
  const code = String(error?.code ?? '')
  const status = Number(error?.details?.statusCode ?? error?.statusCode)
  if (name === 'APIProviderQuotaExhaustedError') return 'usageLimitExceeded'
  if (code === 'provider.auth_error' || code.startsWith('auth.') || status === 401 || status === 403) return 'unauthorized'
  if (name === 'APIContextOverflowError' || code === 'context.overflow') return 'contextWindowExceeded'
  if (name === 'APIProviderRateLimitError' || code === 'provider.rate_limit') return 'rateLimitExceeded'
  if (name === 'APIProviderOverloadedError' || code === 'provider.overloaded' || status === 529) return 'serverOverloaded'
  if (name === 'APIConnectionError' || code === 'provider.connection_error') return { httpConnectionFailed: { httpStatusCode: null } }
  if (status >= 500 && status < 600) return 'internalServerError'
  return null
}

/** A failed turn's error (turn.ended reason 'failed') as {message, codexErrorInfo, additionalDetails}. */
export function kimiTurnError(error) {
  const message = typeof error?.message === 'string' && error.message.trim() ? error.message.trim() : 'The model request failed.'
  const codexErrorInfo = kimiErrorInfo(error)
  // A quota that is an account balance (a Moonshot API key's 'check your account balance'), not a plan window: billing.
  const billing = codexErrorInfo === 'usageLimitExceeded' && /\bbalance\b|recharge|top[ -]?up|insufficient (?:funds|credit)/i.test(message)
  return { message, codexErrorInfo, additionalDetails: billing ? 'BILLING' : null }
}

/**
 * A prompt the user's own hook blocked (prompt.completed {reason: 'blocked'} in the main log), as the note the turn ends
 * with: the hook's message from its <hook_result> record, else a plain notice. null when no prompt was blocked.
 */
export function kimiBlockedPrompt(records) {
  const index = records.findLastIndex((record) => record?.type === 'prompt.completed' && record.reason === 'blocked')
  if (index < 0) return null
  const hook = records.slice(0, index).findLast((record) => record?.type === 'context.append_message' && record.message?.origin?.kind === 'hook_result' && record.message.origin.blocked === true)
  const event = typeof hook?.message?.origin?.event === 'string' && hook.message.origin.event ? hook.message.origin.event : 'UserPromptSubmit'
  const text = (Array.isArray(hook?.message?.content) ? hook.message.content : []).map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : '')).join('\n')
  const reason = text.replace(/^\s*<hook_result\b[^>]*>\s*/, '').replace(/\s*<\/hook_result>\s*$/, '').replace(/\s+/g, ' ').trim().slice(0, 1000)
  // The note is shown in italics: the hook's own wording keeps its characters, not markdown's.
  const escaped = reason.replace(/[\\`*_[\]<>]/g, '\\$&')
  return escaped ? `Your ${event} hook blocked this message: ${escaped}` : `Your ${event} hook blocked this message.`
}

// ------------------------------------------------------------ turns Kimi starts on its own
//
// Kimi starts turns by itself when a background task it started finishes (a synthetic <notification> prompt, origin
// 'task'), when one of its cron jobs fires (<cron-fire>, origin 'cron_job'), for missed cron runs, and for its goal
// and stop-hook continuations ('system_trigger'). Its ACP server streams only the turn its in-flight session/prompt
// launched (acp-server session.ts driverFor), so these show only in the session's main log (agents/main/wire.jsonl).

/** Prompt origins of turns Kimi starts by itself (agent-core-v2 contextMemory/types.ts PromptOrigin). */
const SELF_ORIGINS = new Set(['task', 'cron_job', 'cron_missed', 'system_trigger'])

/** Kimi's cron expression in words, for the cron rows and run notices (the common shapes; else the expression). */
export function kimiCronSchedule(cron, recurring = true) {
  const text = String(cron ?? '').trim()
  const parts = text.split(/\s+/)
  let words = null
  if (parts.length === 5) {
    const [minute, hour, day, month, weekday] = parts
    const rest = day === '*' && month === '*' && weekday === '*'
    const two = (value) => String(value).padStart(2, '0')
    if (rest && minute === '*' && hour === '*') words = 'every minute'
    else if (rest && /^\*\/\d+$/.test(minute) && hour === '*') words = `every ${minute.slice(2)} minutes`
    else if (rest && /^\d+$/.test(minute) && hour === '*') words = minute === '0' ? 'every hour' : `every hour at :${two(minute)}`
    else if (rest && /^\d+$/.test(minute) && /^\*\/\d+$/.test(hour)) words = `every ${hour.slice(2)} hours`
    else if (rest && /^\d+$/.test(minute) && /^\d+$/.test(hour)) words = `every day at ${two(hour)}:${two(minute)}`
    else if (day === '*' && month === '*' && weekday === '1-5' && /^\d+$/.test(minute) && /^\d+$/.test(hour)) words = `weekdays at ${two(hour)}:${two(minute)}`
  }
  const shown = words ?? (text ? `cron ${text}` : 'on a schedule')
  return recurring === false ? `once, ${shown}` : shown
}

/** A readable title for Kimi's schedule tools (CronCreate / CronList / CronDelete), or null for any other call. */
export function kimiCronTitle(name, input) {
  const args = isPlainObject(input) ? input : {}
  if (name === 'CronCreate') {
    if (typeof args.cron !== 'string') return null
    const prompt = typeof args.prompt === 'string' ? args.prompt.replace(/\s+/g, ' ').trim() : ''
    const short = prompt.length > 80 ? `${prompt.slice(0, 79)}…` : prompt
    return `Schedule ${short ? `“${short}” ` : 'a task '}${kimiCronSchedule(args.cron, args.recurring)}`
  }
  if (name === 'CronDelete') return `Cancel scheduled task${typeof args.id === 'string' && args.id ? ` ${args.id}` : Array.isArray(args.ids) ? `s ${args.ids.join(', ')}` : ''}`
  if (name === 'CronList') return 'List scheduled tasks'
  return null
}

/** Which of Kimi's schedule tools a call is (its name, or the activity title Kimi's ACP gives it), else null. */
export function kimiCronTool(call) {
  if (/^Cron(Create|List|Delete)$/.test(String(call?._meta?.kimiTool ?? ''))) return call._meta.kimiTool
  const title = String(call?.title ?? '')
  if (/^Cron(Create|List|Delete)$/.test(title)) return title
  if (/^Scheduling (cron|one-shot) /.test(title)) return 'CronCreate'
  if (/^Deleting cron /.test(title)) return 'CronDelete'
  if (title === 'Listing scheduled cron jobs') return 'CronList'
  return null
}

/** The user-message line of a turn Kimi started itself: the cron job's prompt, or the background task's notice. */
export function kimiSelfTurnText(record) {
  const origin = record?.origin ?? {}
  const text = (Array.isArray(record?.input) ? record.input : []).map((part) => (typeof part?.text === 'string' ? part.text : '')).join('\n')
  if (origin.kind === 'cron_job') {
    const prompt = /<prompt>\s*([\s\S]*?)\s*<\/prompt>/.exec(text)?.[1]?.trim()
    return `Scheduled task (${kimiCronSchedule(origin.cron, origin.recurring)}): ${prompt || 'run'}`
  }
  if (origin.kind === 'cron_missed') return 'Scheduled tasks that were missed while Kimi Code was closed'
  if (origin.kind === 'task') {
    const body = /<notification\b[^>]*>([\s\S]*?)(?:<output-file\b|<\/notification>)/.exec(text)?.[1] ?? ''
    const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
    const title = lines.find((line) => line.startsWith('Title:'))?.slice(6).trim() || 'Background task finished'
    const summary = lines.find((line) => !/^(Title|Severity|Wall time):/.test(line))
    return summary ? `${title}: ${summary}` : title
  }
  return null
}

/** turn.ended as an agent turn's end: Kimi's reasons completed | cancelled | failed (with the model error). */
function selfTurnEnd(record) {
  if (record.reason === 'failed') return { status: 'failed', error: kimiTurnError(record.error) }
  if (record.reason === 'cancelled') return { status: 'interrupted', error: null }
  return { status: 'completed', error: null }
}

/**
 * The main log since the last read, as agent-turn events for server.js (adapter.agentTurnLog): {start: {text}} when
 * Kimi begins a turn of its own, {update} for its text, thinking and tool calls (tool call ids as Kimi's ACP names
 * them, `<turn>:<call>`, so an approval it asks for lands on the same row), {usage} for its model calls, {end}. Turns
 * the bridge prompted over ACP are passed over. Its cron jobs (cron.add / cron.delete, kept for the whole session) and
 * background commands (task.started / task.terminated) are followed on the way. `reset` (a process just opened the
 * session) reads the jobs from the whole log and starts after it.
 */
export function kimiAgentTurnEvents(file, state, { reset = false } = {}) {
  const events = []
  if (!file) return events
  if (state.file !== file) Object.assign(state, { file, offset: 0, mode: 'idle', turnId: null })
  state.jobs ??= new Map()
  state.tasks ??= new Map()
  if (reset) {
    state.jobs.clear()
    let text = ''
    try { text = fs.readFileSync(file, 'utf8') } catch {}
    const complete = text.lastIndexOf('\n')
    state.offset = complete < 0 ? 0 : Buffer.byteLength(text.slice(0, complete + 1), 'utf8')
    for (const line of (complete < 0 ? '' : text.slice(0, complete)).split('\n')) {
      if (!line.includes('"cron.')) continue
      try { foldSchedule(JSON.parse(line), state) } catch {}
    }
    state.mode = 'idle'
    state.turnId = null
    // Background commands (and questions) of an earlier process ended with it.
    state.tasks.clear()
    state.questions?.clear()
    return events
  }
  for (const record of readWireRecords(file, state)) {
    foldSchedule(record, state)
    if (record?.agentId && record.agentId !== 'main') continue
    const type = record?.type
    if (type === 'turn.prompt') {
      const origin = record.origin?.kind ?? 'user'
      state.turnId = record.turnId ?? null
      if (SELF_ORIGINS.has(origin)) {
        state.mode = 'self'
        if (origin === 'cron_job' && record.origin.recurring === false && typeof record.origin.jobId === 'string') state.jobs.delete(record.origin.jobId)
        events.push({ start: { text: kimiSelfTurnText(record), origin } })
      } else state.mode = 'skip'
      continue
    }
    if (state.mode !== 'self') {
      if (type === 'turn.ended') { state.mode = 'idle'; state.turnId = null }
      continue
    }
    if (type === 'turn.ended') {
      if (state.turnId !== null && record.turnId !== undefined && record.turnId !== state.turnId) continue
      events.push({ end: selfTurnEnd(record) })
      state.mode = 'idle'
      state.turnId = null
    } else if (type === 'usage.record' && isPlainObject(record.usage)) {
      const usage = record.usage
      const cached = Number(usage.inputCacheRead) || 0
      events.push({ usage: { inputTokens: (Number(usage.inputOther) || 0) + cached + (Number(usage.inputCacheCreation) || 0), cachedInputTokens: cached, outputTokens: Number(usage.output) || 0 } })
    } else if (type === 'context.append_loop_event') {
      for (const update of kimiWireUpdates(record, String(record.event?.turnId ?? state.turnId ?? '0')).updates) events.push({ update })
    }
  }
  return events
}

/** Cron jobs and background commands from one log record (state.jobs / state.tasks). */
function foldSchedule(record, state) {
  const type = record?.type
  if (type === 'cron.add' && isPlainObject(record.task) && typeof record.task.id === 'string') state.jobs.set(record.task.id, record.task)
  else if (type === 'cron.delete' && Array.isArray(record.ids)) for (const id of record.ids) state.jobs.delete(id)
  else if (type === 'task.started' && isPlainObject(record.info) && record.info.kind === 'process' && typeof record.info.taskId === 'string' && record.info.status === 'running') state.tasks.set(record.info.taskId, record.info)
  // Background questions (AskUserQuestion background: true): open until answered, dismissed or stopped (TaskStop).
  else if (type === 'task.started' && isPlainObject(record.info) && record.info.kind === 'question' && typeof record.info.taskId === 'string' && record.info.status === 'running') (state.questions ??= new Map()).set(record.info.taskId, record.info)
  else if (type === 'task.terminated' && isPlainObject(record.info) && typeof record.info.taskId === 'string') {
    state.tasks.delete(record.info.taskId)
    if (record.info.kind === 'question' && state.questions?.delete(record.info.taskId) && typeof record.info.toolCallId === 'string') (state.questionsEnded ??= new Set()).add(record.info.toolCallId)
  }
}

/** The main agent's log records appended since `state.offset` (advanced), the log found anew when it appears later. */
function mainRecords(env, sessionId, state) {
  if (!state.file) {
    state.file = wireFiles(env, sessionId).find((file) => path.basename(path.dirname(file)) === 'main') ?? null
    if (!state.file) return []
  }
  return readWireRecords(state.file, state)
}

// ------------------------------------------------------------ Kimi's own "ask" verdicts
//
// The bridge runs Kimi in its 'default' (Always Ask) mode and answers every request itself, so Kimi's special asks
// look like routine ones (the ACP request carries no reason). OpenClaude Desktop's Auto and Accept Edits would then approve
// what Kimi's own 'Ask When Needed' mode still asks about (agent-core-v2 permissionPolicyService order): a user rule
// with decision 'ask', the dangerous-command guard, sensitive files and the project's .git folder. kimiMustAsk
// restores those asks on the bridge side.

/** picomatch-style glob → RegExp (`*` and `?` stop at '/', `**` crosses it, `[…]`, `{a,b}`, `\` escapes). */
export function globRegExp(glob, { nocase = false } = {}) {
  let out = ''
  let braces = 0
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]
    if (ch === '\\' && i + 1 < glob.length) { out += glob[++i].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'); continue }
    if (ch === '*') {
      if (glob[i + 1] === '*') { out += '.*'; i++; if (glob[i + 1] === '/') i++ } else out += '[^/]*'
      continue
    }
    if (ch === '?') { out += '[^/]'; continue }
    if (ch === '[') {
      const end = glob.indexOf(']', i + 2)
      if (end > i) { const body = glob.slice(i + 1, end); out += `[${body.startsWith('!') ? `^${body.slice(1)}` : body.replace(/\\/g, '\\\\')}]`; i = end; continue }
    }
    if (ch === '{') { braces++; out += '(?:'; continue }
    if (ch === '}' && braces > 0) { braces--; out += ')'; continue }
    if (ch === ',' && braces > 0) { out += '|'; continue }
    out += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  }
  while (braces-- > 0) out += ')'
  try { return new RegExp(`^${out}$`, nocase ? 'i' : '') } catch { return null }
}
const globMatch = (value, glob, options) => {
  if (globRegExp(glob, options)?.test(value)) return true
  const strip = (text) => (text.startsWith('./') ? text.slice(2) : text)
  return (strip(value) !== value || strip(glob) !== glob) && Boolean(globRegExp(strip(glob), options)?.test(strip(value)))
}

/** A rule pattern 'ToolName' or 'ToolName(arg-pattern)' (agent-core-v2 permissionRules/matchesRule.ts parsePattern). */
function parseRulePattern(pattern) {
  const text = String(pattern ?? '').trim()
  if (!text) return null
  const open = text.indexOf('(')
  if (open < 0) return { tool: text, arg: null }
  if (!text.endsWith(')') || open === 0) return null
  const arg = text.slice(open + 1, -1)
  return { tool: text.slice(0, open), arg: arg || null }
}

/** What a tool's rule argument is matched against (each tool's matchesRule subject), or undefined (name-only tools). */
function ruleSubject(tool, args) {
  if (['Bash'].includes(tool)) return { value: args.command, path: false }
  if (['Read', 'Write', 'Edit', 'ReadMediaFile'].includes(tool)) return { value: args.path ?? args.file_path, path: true }
  if (['Glob', 'Grep'].includes(tool)) return { value: args.pattern, path: false }
  if (tool === 'FetchURL') return { value: args.url, path: false }
  if (tool === 'WebSearch') return { value: args.query, path: false }
  if (tool === 'Skill') return { value: args.skill, path: false }
  if (['TaskOutput', 'TaskStop'].includes(tool)) return { value: args.task_id, path: false }
  return undefined
}

/** The first user rule with decision 'ask' that matches the call (user-configured-rule.ts: first match among that decision's rules). */
export function kimiAskRule(rules, tool, args, { cwd = null, home = null } = {}) {
  for (const rule of Array.isArray(rules) ? rules : []) {
    if (rule?.decision !== 'ask') continue
    if (rule.scope !== undefined && !['user', 'project', 'turn-override'].includes(rule.scope)) continue
    const pattern = typeof rule.pattern === 'string' ? rule.pattern : typeof rule.tool === 'string' ? (typeof (rule.match ?? rule.pattern) === 'string' ? `${rule.tool}(${rule.match})` : rule.tool) : null
    const parsed = parseRulePattern(pattern)
    if (!parsed) continue
    if (parsed.tool !== '*' && !globMatch(tool, parsed.tool)) continue
    if (parsed.arg === null) return rule
    const subject = ruleSubject(tool, args)
    if (!subject || typeof subject.value !== 'string') continue
    const negated = parsed.arg.startsWith('!')
    const glob = negated ? parsed.arg.slice(1) : parsed.arg
    let hit = globMatch(subject.value, glob, { nocase: subject.path })
    if (!hit && subject.path) {
      const expand = (value) => (home && (value === '~' || value.startsWith('~/')) ? path.join(home, value.slice(1)) : value)
      const absolute = (value) => (path.isAbsolute(expand(value)) ? path.normalize(expand(value)) : cwd ? path.resolve(cwd, expand(value)) : value)
      hit = globMatch(absolute(subject.value), absolute(glob), { nocase: true })
    }
    if (negated ? !hit : hit) return rule
  }
  return null
}

const SIMPLE_DANGEROUS = new Set(['shutdown', 'halt', 'poweroff', 'reboot', 'bcdedit', 'diskpart', 'format', 'restart-computer', 'stop-computer', 'mkfs', 'wipefs'])
const PRIVILEGE_WRAPPERS = new Set(['sudo', 'doas'])
const PRIVILEGE_VALUE_OPTIONS = new Set(['-u', '--user', '-g', '--group', '-h', '--host', '-p', '--prompt', '-C', '--close-from', '-T', '--command-timeout', '-U', '--other-user', '-r', '--role', '-t', '--type'])
const NESTED_SHELLS = new Set(['sh', 'bash', 'dash', 'zsh', 'ksh', 'ash'])
const LAUNCH_WRAPPERS = new Set(['env', 'command', 'exec', 'nohup', 'builtin', 'nice'])
const WRAPPER_VALUE_OPTIONS = new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string', '-a', '-n', '--adjustment'])
const DD_SAFE = new Set(['/dev/null', '/dev/zero', '/dev/full', '/dev/random', '/dev/urandom', '/dev/stdin', '/dev/stdout', '/dev/stderr'])
const UNSAFE_OPERAND = /[$`*?[\]~]/

/**
 * Simple commands of a shell source: [{words: [{text, literal}]}], split at ; & | && || newlines and ( ), with each
 * $( … ) / ` … ` body analysed as a source of its own. A word with expansions or globs is not literal (as Kimi's
 * literalText drops it). Approximates the tree-sitter walk of policies/dangerous-command-ask.ts.
 */
function shellCommands(source, depth = 0) {
  const commands = []
  let words = []
  let word = null
  const flush = () => { if (word) { words.push(word); word = null } }
  const end = () => { flush(); if (words.length) commands.push({ words }); words = [] }
  const text = String(source ?? '')
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '\\' && i + 1 < text.length) { word ??= { text: '', literal: true }; word.text += text[++i]; continue }
    if (ch === "'") {
      const close = text.indexOf("'", i + 1)
      word ??= { text: '', literal: true }
      word.text += close < 0 ? text.slice(i + 1) : text.slice(i + 1, close)
      i = close < 0 ? text.length : close
      continue
    }
    if (ch === '"') {
      let j = i + 1
      let body = ''
      while (j < text.length && text[j] !== '"') { if (text[j] === '\\' && j + 1 < text.length) { body += text[j + 1]; j += 2; continue } body += text[j++] }
      word ??= { text: '', literal: true }
      word.text += body
      if (/\$|`/.test(body)) {
        word.literal = false
        for (const inner of body.matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)) if (depth < 4) commands.push(...shellCommands(inner[1] ?? inner[2], depth + 1))
      }
      i = j
      continue
    }
    if (ch === '$' && text[i + 1] === '(') {
      let level = 0
      let j = i + 1
      for (; j < text.length; j++) { if (text[j] === '(') level++; else if (text[j] === ')' && --level === 0) break }
      if (depth < 4) commands.push(...shellCommands(text.slice(i + 2, j), depth + 1))
      word ??= { text: '', literal: false }
      word.literal = false
      i = j
      continue
    }
    if (ch === '`') {
      const close = text.indexOf('`', i + 1)
      if (depth < 4) commands.push(...shellCommands(close < 0 ? text.slice(i + 1) : text.slice(i + 1, close), depth + 1))
      word ??= { text: '', literal: false }
      word.literal = false
      i = close < 0 ? text.length : close
      continue
    }
    if (/[\s]/.test(ch)) { if (ch === '\n') end(); else flush(); continue }
    if (';&|()'.includes(ch)) { end(); continue }
    if ((ch === '>' || ch === '<') && !word) {
      // A redirection and its target are not arguments.
      let j = i + 1
      while (text[j] === '>' || text[j] === '&') j++
      while (text[j] === ' ') j++
      while (j < text.length && !/[\s;&|()]/.test(text[j])) j++
      i = j - 1
      continue
    }
    word ??= { text: '', literal: true }
    word.text += ch
    if (UNSAFE_OPERAND.test(ch)) word.literal = false
  }
  end()
  return commands
}

const commandName = (raw) => {
  let name = String(raw).split(/[\\/]/).pop().toLowerCase()
  if (name.endsWith('.exe')) name = name.slice(0, -4)
  return name
}
function dropOptions(args, valueOptions) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--') return args.slice(i + 1)
    if (arg === '-' || !arg.startsWith('-')) return args.slice(i)
    if (!arg.includes('=') && valueOptions.has(arg)) i++
  }
  return []
}

function dangerousInvocation(name, args, depth) {
  if (PRIVILEGE_WRAPPERS.has(name)) {
    const rest = dropOptions(args, PRIVILEGE_VALUE_OPTIONS)
    return rest.length ? dangerousInvocation(commandName(rest[0]), rest.slice(1), depth) : null
  }
  if (LAUNCH_WRAPPERS.has(name)) {
    if (name === 'command' && args.some((arg) => /^-[a-zA-Z]*[vV]/.test(arg))) return null
    let rest = dropOptions(args, WRAPPER_VALUE_OPTIONS)
    if (name === 'env') { let i = rest[0] === '-' ? 1 : 0; while (i < rest.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(rest[i])) i++; rest = rest.slice(i) }
    return rest.length ? dangerousInvocation(commandName(rest[0]), rest.slice(1), depth) : null
  }
  if (NESTED_SHELLS.has(name)) {
    let payload = -1
    for (let i = 0; i < args.length; i++) { if (args[i] === '--' || !/^-[a-zA-Z]+$/.test(args[i])) break; if (args[i].includes('c')) payload = i + 1 }
    return payload >= 0 && args[payload] !== undefined && depth < 4 ? kimiDangerousCommand(args[payload], depth + 1) : null
  }
  if (name === 'eval') return args.length && depth < 4 ? kimiDangerousCommand(args.join(' '), depth + 1) : null
  if (name === 'busybox') return args.length && !args[0].startsWith('-') ? dangerousInvocation(commandName(args[0]), args.slice(1), depth) : null
  if (SIMPLE_DANGEROUS.has(name) || name.startsWith('mkfs.')) return name
  if ((name === 'init' || name === 'telinit') && args.some((arg) => arg === '0' || arg === '6')) return name
  if (name === 'systemctl') {
    const sub = dropOptions(args, new Set(['-H', '--host', '-M', '--machine']))[0]
    return ['poweroff', 'reboot', 'halt', 'kexec'].includes(sub) ? `systemctl ${sub}` : null
  }
  if (name === 'dd') return args.some((arg) => arg.startsWith('of=') && arg.slice(3).startsWith('/dev/') && !DD_SAFE.has(arg.slice(3))) ? 'dd' : null
  if (name === 'rm') {
    let recursive = false
    let force = false
    let ended = false
    const operands = []
    for (const arg of args) {
      if (!ended && arg === '--') { ended = true; continue }
      if (ended) { operands.push(arg); continue }
      if (arg === '--recursive') recursive = true
      else if (arg === '--force') force = true
      else if (/^-[a-zA-Z]+$/.test(arg)) { if (/[rR]/.test(arg)) recursive = true; if (arg.includes('f')) force = true }
      else operands.push(arg)
    }
    if (!recursive || !force) return null
    const safeTemp = (operand) => !operand.split('/').includes('..') && ['/tmp', '/temp'].some((root) => operand === root || operand.startsWith(`${root}/`))
    return operands.length && !operands.some((operand) => operand === null) && operands.every(safeTemp) ? null : 'rm -rf'
  }
  return null
}

/**
 * The dangerous command a Bash command line runs (Kimi's built-in guard, policies/dangerous-command-ask.ts: shutdown /
 * reboot / halt / poweroff, mkfs / wipefs / diskpart / format, dd of=/dev/…, rm -r -f outside /tmp, through sudo /
 * doas / env / nested shells / eval), or null.
 */
export function kimiDangerousCommand(command, depth = 0) {
  for (const { words } of shellCommands(command, depth)) {
    let index = 0
    while (index < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[index].text)) index++
    const head = words[index]
    if (!head || !head.literal || !head.text) continue
    const args = words.slice(index + 1).map((word) => (word.literal ? word.text : null))
    // An argument Kimi cannot read literally (an expansion or glob) still counts for rm -rf (its operands are then unsafe).
    const found = dangerousInvocation(commandName(head.text), args.map((arg) => arg ?? '\u0000'), depth)
    if (found) return found
  }
  return null
}

const SENSITIVE_BASENAMES = new Set(['.env', 'id_rsa', 'id_ed25519', 'id_ecdsa', 'credentials'])
const SENSITIVE_VARIANTS = ['.bak', '.backup', '.copy', '.disabled', '.key', '.old', '.orig', '.pem', '.save', '.tmp']
/** A file Kimi asks about whatever the mode (tool/path-access.ts isSensitiveFile): .env*, private SSH keys, cloud credentials. */
export function kimiSensitiveFile(file) {
  const parts = path.resolve(String(file)).split(path.sep).map((part) => part.toLowerCase())
  const base = parts.at(-1) ?? ''
  if (['id_rsa.pub', 'id_ed25519.pub', 'id_ecdsa.pub'].includes(base)) return false
  if (['.env.example', '.env.sample', '.env.template'].includes(base)) return false
  if (SENSITIVE_BASENAMES.has(base) || base.startsWith('.env.')) return true
  if (['id_rsa', 'id_ed25519', 'id_ecdsa', 'credentials'].some((prefix) => base.startsWith(`${prefix}.`) && SENSITIVE_VARIANTS.includes(base.slice(prefix.length)))) return true
  return parts.length >= 2 && ['.aws', '.gcp'].includes(parts.at(-2)) && base === 'credentials'
}

/** A path with a .git component below the session folder (git-control-path-access-ask.ts hasGitPathComponent). */
export function kimiGitPath(file, cwd) {
  const relative = path.relative(cwd ? path.resolve(cwd) : '/', path.resolve(String(file)))
  return relative.split(path.sep).some((part) => part.toLowerCase() === '.git')
}

/**
 * Why Kimi itself would ask about this call in its 'Ask When Needed' mode, or null: {reason, always} — always for the
 * dangerous-command guard, which Kimi asks about even after "approve for this session" (it runs before session approvals).
 */
export function kimiMustAsk({ tool, args, paths = [], cwd = null, env = process.env, config = null }) {
  const settings = config ?? readKimiConfig(path.join(homeOf(env), 'config.toml'))
  const home = env.HOME || os.homedir()
  const guardEnv = env.KIMI_CODE_DANGEROUS_COMMAND_GUARD
  const guard = guardEnv === 'false' ? false : guardEnv === 'true' ? true : settings.permission?.dangerous_command_guard !== false
  if (guard && tool === 'Bash' && typeof args?.command === 'string') {
    const dangerous = kimiDangerousCommand(args.command)
    if (dangerous) return { reason: 'Kimi Code’s dangerous-command guard asks before this command.', always: true, dangerous }
  }
  if (kimiAskRule(settings.permission?.rules, tool, args ?? {}, { cwd, home })) return { reason: 'A permission rule in your Kimi Code settings asks before this.', always: false }
  if (paths.some((file) => kimiSensitiveFile(file))) return { reason: 'This touches a sensitive file (keys, credentials or .env).', always: false }
  if (cwd && paths.some((file) => kimiGitPath(file, cwd))) return { reason: 'This touches the project’s .git folder.', always: false }
  return null
}

/** Kimi's compaction notices (acp-server builtin-commands.ts / session.ts), recognised whole. */
export function compactionNotice(text) {
  const value = String(text ?? '').trim()
  if (/^Context compaction started\b/.test(value)) return { phase: 'started' }
  if (/^A context compaction is already running\.?$/.test(value)) return { phase: 'running' }
  if (/^Compacting conversation context(\u2026|\.\.\.| with instruction:)/.test(value)) return { phase: 'autoStarted' }
  if (/^Compaction completed\./.test(value)) {
    const after = /Tokens after:\s*([\d,]+)/.exec(value)?.[1]
    return { phase: 'completed', message: value, tokensAfter: after ? Number(after.replace(/,/g, '')) : null }
  }
  if (/^Compaction cancelled\.?$/.test(value)) return { phase: 'cancelled', message: value }
  if (/^Compaction is blocked by the current turn/.test(value)) return { phase: 'failed', message: value }
  if (/^\/compact failed: /.test(value)) return { phase: 'failed', message: value.replace(/^\/compact failed:\s*/, 'Compaction failed: ') }
  return null
}

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
/**
 * The sign-in's token file. A mainland login is credentials/kimi-code.json; a global (kimi.ai) one is stored under the
 * managed provider's oauth key ('oauth/kimi-code-env-<hash>' → credentials/kimi-code-env-<hash>.json, oauth toolkit.ts
 * resolveKimiTokenStorageName), which config.toml names.
 */
/** The managed provider's own token file (credentials/<oauth key>.json), or null when config.toml names none. */
function managedCredentialsFile(env) {
  const managed = Object.entries(readKimiConfig(path.join(homeOf(env), 'config.toml')).providers).find(([name]) => name.startsWith('managed:kimi-code'))?.[1]
  const oauth = managed?.oauth
  const key = isPlainObject(oauth) ? oauth.key : typeof oauth === 'string' ? /key\s*=\s*"([^"]+)"/.exec(oauth)?.[1] : null
  const name = typeof key === 'string' && /^oauth\/[A-Za-z0-9._-]+$/.test(key) ? key.slice('oauth/'.length) : null
  return name ? path.join(homeOf(env), 'credentials', `${name}.json`) : null
}
function credentials(env) {
  const file = managedCredentialsFile(env)
  return (file ? readJsonFile(file, null) : null)
    ?? readJsonFile(path.join(homeOf(env), 'credentials', 'kimi-code.json'), null)
}
/**
 * Kimi Platform (pay-as-you-go API keys, oauth open-platform.ts OPEN_PLATFORMS): the provider id the TUI's /login
 * writes, its endpoint and the model ids it offers (allowedPrefixes 'kimi-k').
 */
export const KIMI_PLATFORMS = Object.freeze({
  'moonshot-cn': Object.freeze({ id: 'moonshot-cn', baseUrl: 'https://api.moonshot.cn/v1', prefixes: ['kimi-k'] }),
  'moonshot-ai': Object.freeze({ id: 'moonshot-ai', baseUrl: 'https://api.moonshot.ai/v1', prefixes: ['kimi-k'] }),
})

/** The platform's /models answer as Kimi model aliases (open-platform.ts toModelInfo / capabilitiesForModel). */
export function kimiPlatformModels(payload, platform) {
  const list = Array.isArray(payload?.data) ? payload.data : []
  const out = []
  for (const item of list) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || !item.id || !platform.prefixes.some((prefix) => item.id.startsWith(prefix))) continue
    const context = Number(item.context_length)
    if (!Number.isInteger(context) || context <= 0) continue
    const caps = new Set()
    const thinking = item.supports_thinking_type
    if (thinking === 'only') { caps.add('thinking'); caps.add('always_thinking') } else if (thinking === 'both') caps.add('thinking')
    else if (thinking === undefined && item.supports_reasoning) caps.add('thinking')
    if (item.supports_image_in) caps.add('image_in')
    if (item.supports_video_in) caps.add('video_in')
    if (!Object.hasOwn(item, 'supports_tool_use') || item.supports_tool_use) caps.add('tool_use')
    const efforts = isPlainObject(item.think_efforts) && Array.isArray(item.think_efforts.valid_efforts) ? item.think_efforts.valid_efforts.filter((value) => typeof value === 'string' && value) : []
    const defaultEffort = isPlainObject(item.think_efforts) && typeof item.think_efforts.default_effort === 'string' ? item.think_efforts.default_effort : null
    out.push({ id: item.id, contextLength: context, capabilities: [...caps], displayName: typeof item.display_name === 'string' && item.display_name ? item.display_name : null, efforts, defaultEffort })
  }
  return out
}

const tomlString = (value) => JSON.stringify(String(value))
/**
 * config.toml with the platform's provider and model tables replaced (as the TUI's applyOpenPlatformConfig does: other
 * providers' tables untouched, this provider's old models dropped) and default_model on one of its models. Line-based,
 * so the user's comments and other tables stay as written. defaultModel: the alias to make the default.
 */
export function kimiTomlWithPlatform(text, { platform, apiKey, models, defaultModel }) {
  const lines = String(text ?? '').split('\n')
  const kept = []
  let dropping = false
  let firstHeader = -1
  for (const line of lines) {
    const header = /^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/.exec(line)
    if (header) {
      const parts = tomlKeyParts(header[1])
      dropping = (parts[0] === 'providers' && parts[1] === platform.id) || (parts[0] === 'models' && typeof parts[1] === 'string' && parts[1].startsWith(`${platform.id}/`))
      if (!dropping && firstHeader < 0) firstHeader = kept.length
    }
    if (!dropping) kept.push(line)
  }
  const top = firstHeader < 0 ? kept.length : firstHeader
  const defaultLine = `default_model = ${tomlString(defaultModel)}`
  const at = kept.slice(0, top).findIndex((line) => /^\s*default_model\s*=/.test(line))
  if (at >= 0) kept[at] = defaultLine
  else kept.splice(0, 0, defaultLine)
  while (kept.length && !kept.at(-1).trim()) kept.pop()
  const blocks = [`[providers.${tomlString(platform.id)}]`, 'type = "kimi"', `base_url = ${tomlString(platform.baseUrl)}`, `api_key = ${tomlString(apiKey)}`]
  for (const model of models) {
    blocks.push('', `[models.${tomlString(`${platform.id}/${model.id}`)}]`, `provider = ${tomlString(platform.id)}`, `model = ${tomlString(model.id)}`, `max_context_size = ${model.contextLength}`)
    if (model.capabilities.length) blocks.push(`capabilities = [ ${model.capabilities.map(tomlString).join(', ')} ]`)
    if (model.displayName) blocks.push(`display_name = ${tomlString(model.displayName)}`)
    if (model.efforts.length) blocks.push(`support_efforts = [ ${model.efforts.map(tomlString).join(', ')} ]`)
    if (model.defaultEffort) blocks.push(`default_effort = ${tomlString(model.defaultEffort)}`)
  }
  return `${kept.length ? `${kept.join('\n')}\n\n` : ''}${blocks.join('\n')}\n`
}

/**
 * What `kimi doctor config` reports wrong with a config.toml (exit 1, an "ERROR config.toml" block): its validation
 * issues joined, or the TOML parse message without the file path; null when the output names no issue.
 */
export function kimiDoctorIssue(output) {
  const lines = String(output ?? '').split('\n').map((line) => line.trim())
  const start = lines.findIndex((line) => /^ERROR\s+config\.toml\b/.test(line))
  if (start < 0) return null
  const block = []
  for (const line of lines.slice(start + 1)) { if (!line || /^(ERROR|WARN)\s/.test(line)) break; block.push(line) }
  const issues = block.indexOf('Validation issues:')
  if (issues >= 0 && block.length > issues + 1) return block.slice(issues + 1).slice(0, 3).join('; ')
  const parse = block.find((line) => /^Invalid TOML in /.test(line))
  if (parse) return parse.replace(/^Invalid TOML in .*?config\.toml:\s*/, '')
  return block[0] ?? null
}

/** `kimi login --region` for a device-code option (cores/kimi.mjs login.deviceCode provider): kimi.com or kimi.ai. */
export function kimiLoginRegion(provider) {
  return provider === 'kimi-global' ? 'global' : provider === 'kimi-cn' ? 'mainland-cn' : null
}
/** Whether a stored token has expired (expires_at in seconds or milliseconds); unknown is not expired. */
function tokenExpired(creds, now = Date.now()) {
  const at = Number(creds?.expires_at)
  if (!Number.isFinite(at) || at <= 0) return false
  return (at < 1e12 ? at * 1000 : at) <= now
}

/**
 * Kimi's GET <base>/usages payload (oauth managed-usage.ts) as Codex rate limits: the 5-hour and weekly windows of the
 * plan, the monthly limit as its own bucket (extra), and the Booster wallet's balance as credits in its currency.
 */
export function kimiUsageSnapshot(body) {
  const ratio = (value) => { const number = typeof value === 'string' ? Number(value) : value; return Number.isFinite(number) ? number : null }
  const window = (entry, minutes) => {
    const used = ratio(entry?.used_ratio)
    return used === null ? null : { usedPercent: Math.round(used * 1000) / 10, windowDurationMins: minutes, resetsAt: entry.reset_time ? Math.floor(Date.parse(entry.reset_time) / 1000) || null : null }
  }
  const usages = isPlainObject(body?.usages) ? body.usages : {}
  // boosterWallet.balance {type:'BOOSTER', amount, amountLeft} in millionths of a cent (fixed point).
  const wallet = isPlainObject(body?.boosterWallet) ? body.boosterWallet : null
  const balance = isPlainObject(wallet?.balance) && wallet.balance.type === 'BOOSTER' ? wallet.balance : null
  const cents = (value) => { const number = Number(value); return Number.isFinite(number) ? Math.round(number / 1e6) : null }
  const total = balance ? cents(balance.amount) : null
  const left = balance ? cents(balance.amountLeft) ?? 0 : null
  const currency = [wallet?.monthlyChargeLimit?.currency, wallet?.monthlyUsed?.currency].find((value) => typeof value === 'string' && /^[A-Z]{3}$/.test(value)) ?? 'USD'
  const credits = total && total > 0 ? { hasCredits: left > 0, unlimited: false, balance: (left / 100).toFixed(2), currency } : null
  const month = window(usages.limit_month_total, 43200)
  return {
    limitId: 'kimi-code', limitName: 'Kimi Code plan', primary: window(usages.limit_5h, 300), secondary: window(usages.limit_7d, 10080), planType: null, credits,
    ...(month ? { extra: [{ limitId: 'kimi-code-month', limitName: 'Kimi Code monthly limit', primary: month, secondary: null }] } : {}),
  }
}

/**
 * Runs `fn(call)` against Kimi's local server (`kimi web --no-open`, loopback, a token of its own) started on a
 * throwaway overlay of the session's home, whose sessions/ are the real ones; `call(method, path, body)` answers
 * {ok, status, body}. The server is gone before this returns (its shutdown writes session state).
 */
function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)) })
  })
}

async function withKimiServer(ctx, { launch = null, cwd = null, ensureDirs = [] } = {}, fn) {
  const home = launch?.env?.KIMI_CODE_HOME || homeOf(ctx.env)
  const dir = fs.mkdtempSync(path.join(ctx.stateDir, 'kimi-server-'))
  const token = randomBytes(32).toString('base64url')
  let child = null
  try {
    // Its own server.token (0600, as kap-server requires) and server/instances registry: nothing of the user's changes.
    // ensureDirs: real-home folders the call writes into (plugins/), linked so the change outlives the overlay.
    createOverlay(home, path.join(dir, 'home'), { files: { 'server/instances/.code-desktop': '' }, ensureDirs })
    fs.rmSync(path.join(dir, 'home', 'server.token'), { force: true })
    fs.writeFileSync(path.join(dir, 'home', 'server.token'), token, { mode: 0o600 })
    // A port the OS reports free on loopback (a random pick in 41000-61000 overlaps macOS's ephemeral range and
    // collided with outgoing connections: EADDRINUSE).
    const port = await freeLoopbackPort()
    const { command, args } = ctx.commandLine(['web', '--no-open', '--port', String(port)])
    child = spawn(command, args, { env: withoutBrowser({ ...ctx.env, ...(launch?.env ?? {}), KIMI_CODE_HOME: path.join(dir, 'home'), NO_COLOR: '1' }), cwd: cwd || os.homedir(), stdio: ['ignore', 'pipe', 'pipe'] })
    const base = await new Promise((resolve, reject) => {
      let text = ''
      const timer = setTimeout(() => reject(new Error(`Kimi Code's local server did not start.${text ? ` ${text.trim().slice(-300)}` : ''}`)), 30000)
      const scan = (chunk) => {
        text += String(chunk)
        const url = /(http:\/\/127\.0\.0\.1:\d+)/.exec(text)?.[1]
        if (url) { clearTimeout(timer); resolve(url) }
      }
      child.stdout.on('data', scan)
      child.stderr.on('data', scan)
      child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Kimi Code's local server stopped (${code}).${text ? ` ${text.trim().slice(-300)}` : ''}`)) })
    })
    const call = async (method, route, body) => {
      const response = await fetch(`${base}${route}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) })
      let parsed = null
      try { parsed = await response.json() } catch {}
      return { ok: response.ok, status: response.status, body: parsed }
    }
    return await fn(call)
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve))
      child.kill('SIGTERM')
      const hard = setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 5000)
      await exited
      clearTimeout(hard)
    }
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * The legacy kimi-cli data Kimi Code would offer to bring over on its first run (apps/kimi-code/src/migration
 * detect-pending.ts: ~/.kimi or KIMI_SHARE_DIR, unless .migrated-to-kimi-code names this home or the home has
 * .skip-migration-from-kimi-cli): config, MCP servers, history, skills and how many chat sessions. null: nothing to offer.
 * OAuth credentials are never migrated, so a source with only those offers nothing.
 */
export function kimiLegacyMigration(env) {
  const user = env.HOME || os.homedir()
  const share = typeof env.KIMI_SHARE_DIR === 'string' && env.KIMI_SHARE_DIR.trim() ? path.resolve(user, env.KIMI_SHARE_DIR) : null
  const source = share ?? path.join(user, '.kimi')
  const target = homeOf(env)
  if (!fs.existsSync(source) || path.resolve(source) === path.resolve(target)) return null
  if (fs.existsSync(path.join(target, '.skip-migration-from-kimi-cli'))) return null
  if (fs.existsSync(path.join(source, '.migrated-to-kimi-code'))) {
    // marker.ts shouldSuppressMigration: a marker naming other homes still offers it here; an unreadable one doesn't.
    const marker = readJsonFile(path.join(source, '.migrated-to-kimi-code'), null)
    const targets = [marker?.target_path, ...(Array.isArray(marker?.target_paths) ? marker.target_paths : [])].filter((entry) => typeof entry === 'string')
    if (!marker || !targets.length || targets.some((entry) => path.resolve(entry) === path.resolve(target))) return null
  }
  const has = (name) => fs.existsSync(path.join(source, name))
  let sessions = 0
  try {
    for (const workspace of fs.readdirSync(path.join(source, 'sessions'), { withFileTypes: true })) {
      if (!workspace.isDirectory()) continue
      try { sessions += fs.readdirSync(path.join(source, 'sessions', workspace.name), { withFileTypes: true }).filter((entry) => entry.isDirectory()).length } catch {}
    }
  } catch {}
  const config = has('config.toml') || has('config.json'), mcp = has('mcp.json'), history = has('user-history'), skills = has('skills') || fs.existsSync(path.join(user, '.kimi', 'skills'))
  if (!sessions && !config && !mcp && !history && !skills) return null
  return { source: 'kimi-cli', path: source, sessions, config, mcp, history, skills }
}

/** A Kimi server answer's data (its {code: 0, data} envelope), or throws with what it said. */
function kimiData(result, what) {
  if (result.ok && result.body?.code === 0) return result.body.data
  throw new Error(`Kimi Code couldn’t ${what}: ${result.body?.msg ?? `HTTP ${result.status}`}`)
}

/**
 * Kimi's plugin marketplace (GET /api/v1/plugins/marketplace: Official, Curated and third-party entries merged with what
 * is installed), as the plugin rows Customize › Plugins › Available lists. An entry Kimi wires as one of its own
 * capabilities (source capability:…) is set up in Kimi Code itself and isn't offered here.
 */
export function kimiMarketplacePlugins(entries, home) {
  return (Array.isArray(entries) ? entries : []).filter((entry) => entry && typeof entry.id === 'string' && typeof entry.source === 'string' && !entry.installed && !entry.source.startsWith('capability:'))
    .map((entry) => {
      const summary = pluginSummary({ id: entry.id, name: entry.id, version: typeof entry.version === 'string' ? entry.version : null, description: typeof entry.description === 'string' ? entry.description : '', enabled: false, path: path.join(home, 'plugins'),
        extra: { kind: 'kimi-marketplace', tier: ['official', 'curated', 'third-party'].includes(entry.tier) ? entry.tier : 'third-party', installName: entry.source, homepage: typeof entry.homepage === 'string' ? entry.homepage : null } })
      if (typeof entry.displayName === 'string' && entry.displayName) summary.interface.displayName = entry.displayName
      if (typeof entry.homepage === 'string' && /^https:\/\//.test(entry.homepage)) summary.interface.websiteUrl = entry.homepage
      return summary
    })
}

export default {
  id: 'kimi',
  name: 'Kimi Code',
  engine: 'kimi',
  packageNames: ['@moonshot-ai/kimi-code'],
  binaryNames: ['kimi'],
  helpPattern: /kimi-code|Kimi Code|Next-Gen Agents/i,
  acpArgs: ['acp'],
  // elicitation.form: AskUserQuestion arrives whole (every question, multi-select) instead of one permission card.
  clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: true, elicitation: { form: {} } },
  home: homeOf,
  agentPaths: (env) => [homeOf(env), path.join(env.HOME || os.homedir(), '.agents')],
  modeIds: { plan: 'plan', default: 'default' },
  // Kimi reports currentModeId 'default' on every session/new, load, resume and fork, but its engine starts in config.toml's
  // default_permission_mode ('auto' / 'yolo': no approvals) and default_plan_mode, or a resumed session's last mode:
  // session/set_mode always runs on open (server.js afterSession), so manual approvals and plan state are the bridge's.
  syncModeOnOpen: true,
  compactCommand: '/compact',
  // Kimi's builtin compact takes custom summarization instructions (acp-server builtin-commands.ts: compact input.hint,
  // agent.compact({instruction: args})): '/compact <instructions>'.
  compactInstructions: true,
  silentFailures: true,
  // Kimi reads its own plan files through ACP fs and fails the whole turn on a not-found error:
  // a missing file in its own home reads as empty.
  missingFileReadsEmpty: (file, ctx) => realPathOf(file).startsWith(realPathOf(homeOf(ctx.env)) + path.sep) || realPathOf(file).includes(`${path.sep}kimi-home${path.sep}`),
  // revert: Kimi's own undo (the `kimi web` server's POST /sessions/{id}:undo, what /undo runs in its TUI), with the
  // session's process stopped meanwhile (revertSession).
  // profileOffline: renameSession / archiveSession run while no Kimi process holds the session (server.js).
  sessionFeatures: { fork: 'acp', revert: 'file', deleteHistory: true, profileOffline: true },
  configFile: (env) => path.join(homeOf(env), 'config.toml'),
  // Kimi reads its models from config.toml at launch only (its config watcher is off by default since 2.1.0): a model
  // added later shows from the config, and sessions started before the edit relaunch at their next turn (server.js).
  configModels: true,
  // Kimi keeps its MCP servers in their own file (writeMcpServer), not in config.toml.
  mcpConfigFile: (env) => path.join(homeOf(env), 'mcp.json'),
  // Kimi's MCP client never reads a server's initialize instructions: OpenClaude Desktop's (the preview verification workflow,
  // "these act on this session only") join the session's appended prompt (server.js launchConfig → SYSTEM.md overlay).
  appToolsInstructions: true,
  // A workflow agent (the runner's bridge) runs without Kimi's own sub-agents (Agent, AgentSwarm: Claude's workflow
  // subagent drops Agent, and they would run outside the run's concurrency cap, agent count and budget), and without
  // the tools nobody answers or that outlive the runner's Kimi process (questions, plan mode, cron jobs, goals).
  workflowAgentDisabledTools: ['Agent', 'AgentSwarm', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', 'CronCreate', 'CronList', 'CronDelete', 'CreateGoal', 'UpdateGoal', 'SetGoalBudget'],
  // Claude tool names a workflow script's disallowedTools can remove here, through codeDesktop.tools.disabled
  // (launch: config.toml [tools] disabled).
  workflowToolSwitches: { WebFetch: ['FetchURL'], WebSearch: ['WebSearch'], Agent: ['Agent', 'AgentSwarm'], Task: ['Agent', 'AgentSwarm'] },

  launch(ctx, config) {
    const env = { KIMI_CODE_NO_AUTO_UPDATE: '1' }
    // ACP session mcpServers carry no per-server timeout, so OpenClaude Desktop's own tools (an approval the user is reading,
    // a dev server's first compile) would fail at Kimi's 60 s default while the app goes on: 10 minutes, as Codex gets,
    // unless the user set a global MCP tool timeout themselves (config.toml [mcp] tool_timeout_ms, or the variable).
    if (!ctx.env.KIMI_MCP_TOOL_TIMEOUT_MS && !kimiHasToolTimeout(ctx.env)) env.KIMI_MCP_TOOL_TIMEOUT_MS = '600000'
    const params = config.model ? config.modelParams?.[config.model] : null
    if (Number.isFinite(params?.temperature)) env.KIMI_MODEL_TEMPERATURE = String(params.temperature)
    if (Number.isFinite(params?.maxTokens)) env.KIMI_MODEL_MAX_COMPLETION_TOKENS = String(params.maxTokens)
    // A server's tools go by Kimi's sanitized name ('docs.internal' → mcp__docs_internal__…), as its patterns are matched.
    // A single connector tool (mcp__<configured server>__<tool>) likewise goes by its qualified name.
    const servers = (config.disabledTools ?? []).some((name) => name.startsWith('mcp__')) ? kimiServerNames(ctx.env).sort((x, y) => y.length - x.length) : []
    const toolName = (name) => {
      const server = name.startsWith('mcp__') ? servers.find((entry) => name.startsWith(`mcp__${entry}__`)) : null
      return server ? kimiQualifiedToolName(server, name.slice(`mcp__${server}__`.length)) : name
    }
    const disabled = [...new Set([...(config.disabledTools ?? []).map(toolName), ...(config.disabledServers ?? []).flatMap(kimiServerDisablePatterns)])]
    // OpenClaude Desktop's own tools (preview, terminal, Workflow…) come as an ACP session server, so Kimi's [tools] policy
    // applies to them: an `enabled` allowlist or a disabled 'mcp__*' would silently drop every one. The thread then
    // runs on an overlay whose config.toml lets them through (kimiAppToolsConfig); the user's own file is never written.
    let appToolsText = null
    const appTools = appToolsServer(ctx.env)
    if (appTools) {
      let text = ''
      try { text = fs.readFileSync(path.join(homeOf(ctx.env), 'config.toml'), 'utf8') } catch {}
      appToolsText = kimiAppToolsConfig(text, appTools.name, () => kimiServerNames(ctx.env))
      if (appToolsText !== null) ctx.log?.('kimi: config.toml [tools] would block OpenClaude Desktop’s tools; this session lets them through')
    }
    if (!config.systemPrompt && !config.appendPrompt && !disabled.length && appToolsText === null) return { args: ['acp'], env }
    const real = homeOf(ctx.env)
    const files = {}
    if (config.systemPrompt) files['SYSTEM.md'] = [config.systemPrompt, config.appendPrompt].filter(Boolean).join('\n\n')
    // Appending keeps the user's own SYSTEM.md (which may itself hold ${base_prompt}); only without one does the
    // built-in prompt come first. A full replacement (customization.systemPrompt) is the only thing that drops it.
    else if (config.appendPrompt) files['SYSTEM.md'] = `${userSystemPrompt(real) ?? '${base_prompt}'}\n\n${config.appendPrompt}`
    if (appToolsText !== null) files['config.toml'] = appToolsText
    if (disabled.length) {
      let text = appToolsText ?? ''
      if (appToolsText === null) { try { text = fs.readFileSync(path.join(real, 'config.toml'), 'utf8') } catch {} }
      const merged = tomlWithDisabledTools(text, disabled)
      // A config.toml the bridge cannot edit for certain stays the user's own: a broken copy would make Kimi ignore the
      // whole file (no provider, so "Authentication required"), which is worse than the tools staying on.
      if (merged === null) ctx.log?.(`kimi: config.toml could not be read for certain; this session's tool switches are not applied (${disabled.length} turned off)`)
      else files['config.toml'] = merged
    }
    if (!Object.keys(files).length) return { args: ['acp'], env }
    // logs/ and cache/ are linked from the start (a first run would create them in the overlay); what Kimi writes at the
    // top level besides (its workspaces.json catalog, rewritten atomically) reaches the real home when the process
    // stops (settleOverlay; createOverlay settles a previous overlay too, for a process that died).
    // Throwaway processes (the utility, a /btw side question) settle nothing: their folders are no workspace of the user's.
    const settle = !config.utility && !config.ephemeral && !config.sideQuestion
    const overlay = createOverlay(real, path.join(config.threadDir, 'kimi-home'), { files, ensureDirs: ['sessions', 'credentials', 'logs', 'cache'], ensureFiles: ['session_index.jsonl'], settle })
    env.KIMI_CODE_HOME = overlay
    return { args: ['acp'], env, ...(settle ? { onExit: () => settleOverlay(real, overlay) } : {}) }
  },

  /**
   * Rewind: Kimi's undo (agent-core-v2 undoService: the conversation, todo list and plan state go back `count` prompts;
   * files are not restored). ACP has no undo (/undo is an unknown ACP command), so the bridge starts Kimi's local server
   * (`kimi web --no-open`, loopback, a token of its own) on a throwaway overlay of the thread's home, whose sessions/
   * are the real ones, and calls POST /api/v1/sessions/{id}:undo. The thread's process is stopped meanwhile.
   */
  async revertSession(ctx, sessionId, keepTurns, host, turnText, extra = {}) {
    const count = Number(extra.dropped)
    if (!Number.isInteger(count) || count <= 0) return true
    const launch = typeof extra.launch === 'function' ? extra.launch() : null
    return withKimiServer(ctx, { launch, cwd: extra.cwd }, async (call) => {
      const { ok, body, status } = await call('POST', `/api/v1/sessions/${encodeURIComponent(sessionId)}:undo`, { count, page_size: 1 })
      if (ok && body?.code === 0) return true
      if (body?.code === 40911) {
        const undoable = Number(body?.data?.undoableCount)
        throw new Error(Number.isInteger(undoable) && undoable > 0
          ? `Kimi Code can only rewind the last ${undoable} message${undoable === 1 ? '' : 's'} here: earlier ones were compacted or have no checkpoint.`
          : 'Kimi Code cannot rewind this far: the conversation was compacted since then, or its checkpoints are gone.')
      }
      if (body?.code === 40901) throw new Error('Kimi Code is still busy with this session (a turn or a compaction). Try again in a moment.')
      throw new Error(`Kimi Code could not rewind: ${body?.msg ?? `HTTP ${status}`}`)
    })
  },

  /**
   * Renaming and archiving reach Kimi itself (its `kimi --session` picker, `kimi session list` and web UI show them):
   * the session's profile title (POST /api/v1/sessions/{id}/profile) and its archive flag (POST
   * /api/v2/sessions:archive | :restore), through Kimi's local server as a rewind does. Kimi's process for the session
   * must not hold it meanwhile (it would write its own copy back): server.js runs these with the thread's process
   * stopped (sessionFeatures.profileOffline), or once it has stopped.
   */
  async renameSession(ctx, sessionId, title, host, extra = {}) {
    const launch = typeof extra.launch === 'function' ? extra.launch() : null
    await withKimiServer(ctx, { launch, cwd: extra.cwd }, async (call) => {
      const { ok, body, status } = await call('POST', `/api/v1/sessions/${encodeURIComponent(sessionId)}/profile`, { title })
      if (!ok || body?.code !== 0) throw new Error(`Kimi Code could not rename the session: ${body?.msg ?? `HTTP ${status}`}`)
    })
  },
  async archiveSession(ctx, sessionId, archived, extra = {}) {
    const launch = typeof extra.launch === 'function' ? extra.launch() : null
    await withKimiServer(ctx, { launch, cwd: extra.cwd }, async (call) => {
      const { ok, body, status } = await call('POST', `/api/v2/sessions:${archived ? 'archive' : 'restore'}`, { ids: [sessionId] })
      const item = Array.isArray(body?.data?.results) ? body.data.results.find((entry) => entry?.id === sessionId) : null
      if (!ok || body?.code !== 0 || (item && item.ok === false)) throw new Error(`Kimi Code could not ${archived ? 'archive' : 'restore'} the session: ${item?.error?.message ?? body?.msg ?? `HTTP ${status}`}`)
    })
  },

  /** Kimi's own title and archive state of each session (sessions/<wd>/<session>/state.json), for thread/list. */
  sessionStates(ctx) {
    const root = path.join(homeOf(ctx.env), 'sessions')
    const out = new Map()
    let workspaces = []
    try { workspaces = fs.readdirSync(root) } catch { return out }
    for (const workspace of workspaces) {
      let sessions = []
      try { sessions = fs.readdirSync(path.join(root, workspace)) } catch { continue }
      for (const id of sessions) {
        const state = readJsonFile(path.join(root, workspace, id, 'state.json'), null)
        if (!isPlainObject(state) || (state.id && state.id !== id)) continue
        out.set(id, { archived: state.archived === true, archivedAt: Number.isFinite(state.archivedAt) ? state.archivedAt : null, updatedAt: Number.isFinite(state.updatedAt) ? state.updatedAt : null, title: typeof state.title === 'string' ? state.title : null, customTitle: state.isCustomTitle === true })
      }
    }
    return out
  },

  /** What a rewind leaves alone (OpenClaude Desktop says so once it is done). */
  revertNotice: 'Kimi Code rewound the conversation, its todo list and plan. Files it changed are not restored.',

  /**
   * Kimi titles a call with the tool's own description (acp-server events-map.ts: event.description ?? event.name), so
   * the tool is told by that wording or its arguments: "Launching coder agent: …", "Fetching: <url>", "Searching: <query>"
   * (web), "Searching for '<pattern>' in …" (Grep), "Searching <pattern>" (Glob). A sub-agent's own log names tools plainly.
   */
  classify(call, ctx) {
    const title = String(call.title ?? '')
    const input = isPlainObject(call.rawInput) ? call.rawInput : {}
    const mcp = /^mcp__(.+?)__(.+)$/.exec(title)
    // Kimi names the server by its sanitized form: the card and approval show the connector's configured name.
    if (mcp) return { type: 'mcp', server: (ctx ? kimiServerNames(ctx.env) : []).find((name) => kimiMcpNamePart(name) === mcp[1]) ?? mcp[1], tool: mcp[2] }
    const cron = kimiCronTool(call)
    if (cron) return { type: 'other', tool: cron }
    const agent = kimiSubagentCall(call)
    if (agent) return { type: 'subagent', label: agent.label, prompt: agent.prompt }
    if (title === 'WebSearch' || /^Searching: /.test(title)) return { type: 'webSearch' }
    if (title === 'FetchURL' || /^Fetching: /.test(title) || (typeof input.url === 'string' && Object.keys(input).length <= 2 && call.kind !== 'execute')) return { type: 'fetch' }
    // ReadMediaFile ("Reading media: <path>"): a read whose result carries the image (projection.js expandToolParts).
    if (title === 'ReadMediaFile' || /^Reading media: /.test(title)) return { type: 'read' }
    if (call.kind === 'execute') return { type: 'execute', command: input.command ?? title.replace(/^Running:\s*/, '') }
    if (title === 'Grep' || /^Searching for '/.test(title)) return { type: 'search', tool: 'grep' }
    if (title === 'Glob' || (/^Searching /.test(title) && typeof input.pattern === 'string')) return { type: 'search', tool: 'glob' }
    return null
  },

  /**
   * Sub-agents (Agent, AgentSwarm): kimi-acp streams only the main agent, while each sub-agent writes its own log
   * (sessions/<wd>/<session>/agents/agent-N/wire.jsonl). A new agent folder is bound to the launching call whose prompt
   * it was given (else the latest swarm, else the latest unbound launch; Agent(resume=<id>) to that agent), then its
   * records become the child thread's updates. {events: [{parentToolCallId, key, label, background, update} |
   * {parentToolCallId, key, done, failed}], pending}: pending while a launch runs or a bound agent has not ended.
   */
  childLogUpdates(ctx, thread, { closing = null } = {}) {
    const state = (thread.kimiChildren ??= { bound: new Map(), byCall: new Map() })
    state.waiting ??= new Map()
    const dir = agentsDir(ctx.env, thread.id)
    const calls = [...thread.projector.calls.values()].filter((entry) => entry.item?.type === 'collabAgentToolCall')
    // A launch that just finished (closing) still binds its agent: a quick sub-agent can end between two polls.
    const open = calls.filter((entry) => entry.item.status === 'inProgress' || entry.call.toolCallId === closing)
    // A background launch returns at once ('agent_id: agent-0, status: running') and its agent's log appears only
    // afterwards, often once the launch (or the whole turn, which clears the projector's calls) has ended: it stays a
    // candidate (state.waiting, the projector's own call object, which later updates fill in) until its agent is bound.
    const now = Date.now()
    for (const entry of calls) {
      const id = entry.call.toolCallId
      if (state.byCall.has(id) || state.waiting.has(id) || kimiSubagentCall(entry.call)?.background !== true) continue
      state.waiting.set(id, { call: entry.call, since: now })
    }
    for (const [id, entry] of state.waiting) if (state.byCall.has(id) || now - entry.since > KIMI_BACKGROUND_BIND_MS) state.waiting.delete(id)
    const openIds = new Set(open.map((entry) => entry.call.toolCallId))
    const candidates = [...open, ...[...state.waiting.entries()].filter(([id]) => !openIds.has(id)).map(([, entry]) => ({ call: entry.call, waiting: true }))]
    const events = []
    if (dir) {
      let names = []
      try { names = fs.readdirSync(dir).filter((name) => name !== 'main') } catch {}
      // Agents already there when the turn started (thread.kimiAgentSizes, beforeTurn) are not new: only a resume binds them.
      const before = thread.kimiAgentSizes ?? {}
      for (const name of names) {
        if (state.bound.has(name)) continue
        const file = path.join(dir, name, 'wire.jsonl')
        const existed = Object.hasOwn(before, name)
        // The launch whose result names this agent (agent_id) is its launch, whatever its log holds yet.
        const named = candidates.find((entry) => !state.byCall.get(entry.call.toolCallId)?.has(name) && kimiLaunchAgentId(entry.call) === name)
        const resumed = named ?? candidates.find((entry) => !state.byCall.get(entry.call.toolCallId)?.has(name) && kimiSubagentCall(entry.call)?.resume === name)
        if (existed && !resumed) continue
        const offset = existed ? before[name] : 0
        let target = resumed
        let prompt = resumed ? kimiSubagentCall(resumed.call)?.prompt ?? null : null
        if (!target) {
          prompt = agentPrompt(readWireRecords(file, { offset }))
          if (prompt === null) continue
          // A waiting background launch binds by its prompt only (never as "the latest unbound"), and not once its result
          // names another agent.
          const unbound = candidates.filter((entry) => (!state.byCall.has(entry.call.toolCallId) || kimiSubagentCall(entry.call)?.swarm) && !(entry.waiting && kimiLaunchAgentId(entry.call)))
          target = unbound.find((entry) => { const text = kimiSubagentCall(entry.call)?.prompt; return text && text.trim() === prompt })
            ?? unbound.findLast((entry) => !entry.waiting && kimiSubagentCall(entry.call)?.swarm)
            ?? unbound.findLast((entry) => !entry.waiting && !state.byCall.has(entry.call.toolCallId))
        }
        if (!target) continue
        const launch = kimiSubagentCall(target.call) ?? {}
        const callId = target.call.toolCallId
        if (!state.byCall.has(callId)) state.byCall.set(callId, new Set())
        state.byCall.get(callId).add(name)
        state.waiting.delete(callId)
        state.bound.set(name, { file, offset, callId, done: false, background: launch.background === true, prompt, label: launch.swarm ? `${name}` : (launch.profile ?? launch.label ?? name) })
      }
    }
    for (const [name, child] of state.bound) {
      if (child.done) continue
      const cursor = { offset: child.offset }
      for (const record of readWireRecords(child.file, cursor)) {
        const { updates, ended, failed } = kimiWireUpdates(record, name)
        for (const update of updates) events.push({ parentToolCallId: child.callId, key: `${child.callId}#${name}`, label: child.label, background: child.background, prompt: child.prompt, update })
        if (ended) { child.done = true; events.push({ parentToolCallId: child.callId, key: `${child.callId}#${name}`, done: true, failed: Boolean(failed) }); break }
      }
      child.offset = cursor.offset
    }
    const pending = open.some((entry) => entry.item.status === 'inProgress') || state.waiting.size > 0 || [...state.bound.values()].some((child) => !child.done)
    return { events, pending }
  },

  /**
   * Turns Kimi starts on its own (kimiAgentTurnEvents over the main log). The self-started turn's usage is counted
   * here, so the next prompt's usage read (settleUsage) starts after it.
   */
  agentTurnLog(ctx, thread, { reset = false } = {}) {
    const state = (thread.kimiSelfLog ??= { file: null, offset: 0, mode: 'idle', turnId: null })
    const file = state.file ?? wireFiles(ctx.env, thread.id).find((entry) => path.basename(path.dirname(entry)) === 'main') ?? null
    const events = kimiAgentTurnEvents(file, state, { reset })
    if (file && thread.kimiUsageCursor && events.some((event) => event.end)) thread.kimiUsageCursor[file] = Math.max(thread.kimiUsageCursor[file] ?? 0, state.offset)
    return events
  },

  /** Kimi's cron jobs live in the session's process (they fire only while it runs), as do its background commands and questions. */
  keepLoaded(thread) {
    return (thread.kimiSelfLog?.jobs?.size ?? 0) > 0 || (thread.kimiSelfLog?.tasks?.size ?? 0) > 0 || (thread.kimiSelfLog?.questions?.size ?? 0) > 0
      || [...thread.pending?.values?.() ?? []].some((entry) => entry.flag === 'waitingOnUserInput' && this.backgroundQuestion(thread.projector?.calls?.get(entry.toolCallId)?.call ?? {}))
  },

  /**
   * AskUserQuestion with background: true (agent-core-v2 ask-user-question.ts): the tool returns at once ('task_id:
   * question-…'), the turn goes on and ends, and the answer reaches Kimi later as a task notification (its own turn). Its
   * card stays open past the turn's end (server.js abortTurnRequests). Told by the call's arguments, the title Kimi gives
   * it ('Starting background question: …') or its result.
   */
  backgroundQuestion(call) {
    if (!call) return false
    if (isPlainObject(call.rawInput) && call.rawInput.background === true && Array.isArray(call.rawInput.questions)) return true
    if (/^Starting background question\b/.test(String(call.title ?? ''))) return true
    return /^task_id:\s*question-/m.test(blockTextOf(call.content) ?? '')
  },

  /** false once Kimi's log records the end of the background question a card belongs to (answered elsewhere, stopped). */
  backgroundQuestionOpen(thread, toolCallId) {
    const raw = /^[^:]*:(.+)$/.exec(String(toolCallId ?? ''))?.[1] ?? String(toolCallId ?? '')
    return !(thread.kimiSelfLog?.questionsEnded?.has(raw))
  },

  /** Background sub-agents still running (Agent with run_in_background): Background tasks, and the session stays loaded. */
  backgroundProcesses(thread) {
    const out = []
    // Background commands (Bash run_in_background): Kimi runs them itself and stops them with its TaskStop tool only.
    if (thread.host && !thread.host.exited) for (const [taskId, info] of thread.kimiSelfLog?.tasks ?? []) {
      out.push({ itemId: typeof info.parentToolCallId === 'string' ? info.parentToolCallId : taskId, processId: `kimi-task:${taskId}`, command: typeof info.command === 'string' && info.command ? info.command : String(info.description ?? taskId), cwd: thread.cwd, stoppable: false })
    }
    // Background questions waiting for the user's answer: the card is the way to answer; Kimi's TaskStop closes them.
    if (thread.host && !thread.host.exited) for (const [taskId, info] of thread.kimiSelfLog?.questions ?? []) {
      const raw = typeof info.toolCallId === 'string' ? info.toolCallId : null
      const itemId = raw ? [...thread.projector?.calls?.keys?.() ?? []].find((id) => id === raw || id.endsWith(`:${raw}`)) ?? raw : taskId
      out.push({ itemId, processId: `kimi-question:${taskId}`, command: `Question: ${String(info.description ?? '').trim() || taskId}`, cwd: thread.cwd, stoppable: false })
    }
    for (const [name, child] of thread.kimiChildren?.bound ?? []) {
      if (child.done || !child.background) continue
      // Not stoppable from here: Kimi stops them with its own TaskStop tool or on session close, and ACP has no stop
      // method (its /tasks only lists), so Background tasks hides Stop and says how instead.
      out.push({ itemId: child.callId, processId: `kimi-agent:${name}`, command: `${child.label} agent (${name})`, cwd: thread.cwd, stoppable: false })
    }
    return out
  },

  /**
   * Compaction notices (plain message chunks, also outside any turn) become compaction events; Kimi's
   * permission-surface fallback for AskUserQuestion stays in questions().
   */
  filterUpdate(update) {
    if (update?.sessionUpdate === 'agent_message_chunk' && update.content?.type === 'text') {
      const notice = compactionNotice(update.content.text)
      if (notice) return { drop: true, compaction: notice }
    }
    // Kimi's schedule tools read as what they schedule ('Schedule “check the deploy” every 10 minutes'): by name (its
    // sub-agent and main logs) or by the activity Kimi's ACP titles them with (cron tools' 'Scheduling cron <expr>',
    // 'Scheduling one-shot <expr>', 'Deleting cron <id>', 'Listing scheduled cron jobs').
    if (update?.sessionUpdate === 'tool_call' || update?.sessionUpdate === 'tool_call_update') {
      const name = kimiCronTool(update)
      if (name) return { update: { ...update, ...(kimiCronTitle(name, update.rawInput) ? { title: kimiCronTitle(name, update.rawInput) } : {}), _meta: { ...update._meta, kimiTool: name } } }
    }
    return { update }
  },

  /** The session's log offsets when a turn starts (kept across turns: a background compaction's usage counts next). */
  beforeTurn(ctx, thread) {
    // The sub-agents already there (with their log sizes): a launch in this turn binds only a new one, or the one it resumes.
    const dir = agentsDir(ctx.env, thread.id)
    thread.kimiAgentSizes = {}
    if (dir) { try { for (const name of fs.readdirSync(dir)) if (name !== 'main' && !thread.kimiChildren?.bound?.has(name)) thread.kimiAgentSizes[name] = sizeOf(path.join(dir, name, 'wire.jsonl')) } catch {} }
    // Where this turn's records start in the main log: its retries (turnEvents) and its failure (turnFailure) are read from here.
    const main = wireFiles(ctx.env, thread.id).find((file) => path.basename(path.dirname(file)) === 'main') ?? null
    thread.kimiTurnLog = { file: main, offset: main ? sizeOf(main) : 0 }
    thread.kimiRetryLog = { ...thread.kimiTurnLog }
    if (thread.kimiUsageCursor) return
    thread.kimiUsageCursor = {}
    for (const file of wireFiles(ctx.env, thread.id)) thread.kimiUsageCursor[file] = sizeOf(file)
  },

  /**
   * A running turn's tokens so far: the usage.record lines its calls appended since the turn began, read on from where
   * the last look left off (its own cursor: settleUsage's moves only when the turn ends).
   */
  liveTurnUsage(ctx, thread, { since } = {}) {
    if (!thread?.id || !thread.kimiUsageCursor) return null
    if (thread.kimiLiveUsage?.since !== since) thread.kimiLiveUsage = { since, cursor: { ...thread.kimiUsageCursor }, usage: null }
    const live = thread.kimiLiveUsage
    const added = readUsageSince(wireFiles(ctx.env, thread.id), live.cursor)?.usage
    if (added) live.usage = Object.fromEntries(['inputTokens', 'cachedInputTokens', 'outputTokens'].map((key) => [key, (live.usage?.[key] ?? 0) + (added[key] ?? 0)]))
    return live.usage ? { usage: live.usage } : null
  },

  /**
   * A turn's tokens: the usage.record lines its LLM calls appended to the session's logs. Kimi persists them a
   * moment after the prompt returns: read once the main log records the turn's end (or after a short wait).
   */
  async settleUsage(ctx, thread) {
    if (!thread?.id) return null
    thread.kimiUsageCursor ??= {}
    const deadline = Date.now() + 2500
    for (;;) {
      const main = wireFiles(ctx.env, thread.id).find((file) => path.basename(path.dirname(file)) === 'main')
      if (main && turnEndedSince(main, thread.kimiUsageCursor[main] ?? 0)) break
      if (Date.now() > deadline) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return readUsageSince(wireFiles(ctx.env, thread.id), thread.kimiUsageCursor)
  },

  /**
   * Why a turn that ACP ended as a plain end_turn failed: Kimi records the model error only in its main log
   * (turn.ended {reason: 'failed', error: {code, name, message}}), also after the turn already ran tools. Read once the
   * log records the turn's end (or after a short wait); null when the turn did not fail.
   */
  async turnFailure(ctx, thread) {
    if (!thread?.id) return null
    const state = { file: thread.kimiTurnLog?.file ?? null, offset: thread.kimiTurnLog?.offset ?? 0 }
    const deadline = Date.now() + 2500
    for (;;) {
      if (!state.file) state.file = wireFiles(ctx.env, thread.id).find((file) => path.basename(path.dirname(file)) === 'main') ?? null
      if (state.file && turnEndedSince(state.file, state.offset)) break
      if (Date.now() > deadline) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const records = mainRecords(ctx.env, thread.id, state).filter((record) => !record?.agentId || record.agentId === 'main')
    // A UserPromptSubmit hook that blocked the prompt: no model call, no turn.ended, only its message in the log
    // (agentExternalHooksService runPromptSubmitHook) and prompt.completed {reason: 'blocked'}. Kimi's TUI shows that message.
    const blocked = kimiBlockedPrompt(records)
    if (blocked) return { notice: blocked }
    const ended = records.filter((record) => record?.type === 'turn.ended').at(-1)
    return ended?.reason === 'failed' ? kimiTurnError(ended.error) : null
  },

  /**
   * While a turn runs: Kimi's own retries of a failed model request (turn.step.retrying, which its TUI shows as
   * 'Retrying…'), as Codex retry notices. ACP never sends them, so a long 429 / 5xx retry loop would read as a hang.
   */
  turnEvents(ctx, thread) {
    if (!thread?.id || !thread.kimiRetryLog) return []
    return mainRecords(ctx.env, thread.id, thread.kimiRetryLog)
      .filter((record) => record?.type === 'turn.step.retrying' && (!record.agentId || record.agentId === 'main'))
      .map((record) => {
        const next = Number(record.nextAttempt)
        const max = Number(record.maxAttempts)
        return {
          retry: { attempt: Number.isInteger(next) && next > 1 ? next - 1 : null, maxRetries: Number.isInteger(max) && max > 1 ? max - 1 : null, delayMs: Number.isFinite(record.delayMs) ? record.delayMs : null },
          error: { message: typeof record.errorMessage === 'string' && record.errorMessage ? record.errorMessage : 'The model request failed.', codexErrorInfo: kimiErrorInfo({ name: record.errorName, statusCode: record.statusCode }) },
        }
      })
  },

  /** The session's goal (readKimiGoal), read after each turn: the app's goal strip shows it (read-only here). */
  readGoal(ctx, thread) {
    const main = wireFiles(ctx.env, thread.id).find((file) => path.basename(path.dirname(file)) === 'main')
    if (!main) return null
    if (thread.kimiGoalState?.file !== main) thread.kimiGoalState = { file: main, offset: 0, goal: null }
    return readKimiGoal(main, thread.kimiGoalState)
  },

  /** Each configured model's own thinking efforts, context size and image input (config.toml). */
  modelCatalog(ctx) {
    const config = readKimiConfig(path.join(homeOf(ctx.env), 'config.toml'))
    return Object.entries(config.models).map(([alias, model]) => kimiModelInfo(alias, model, config.thinking))
  },

  /**
   * ExitPlanMode's review text (acp-server convert.ts composePlanContent + buildPermissionToolCallUpdate): the plan
   * without its "Plan saved to: <file>" header and the "Requesting approval to …" line Kimi appends to every request.
   */
  planText(text) {
    return String(text ?? '')
      .replace(/^\s*Plan saved to: [^\n]*\n+/, '')
      .replace(/\n*Requesting approval to [^\n]*\s*$/, '')
      .replace(/^\s*Requesting approval to [^\n]*\s*$/, '')
      .trim()
  },

  /**
   * A permission request for a call the main agent's stream never showed: a sub-agent's (kimi-acp streams only the main
   * agent; the request's id is '<the sub-agent's turn>:<call id>' and it names only the tool). The call comes from the
   * sub-agent's approval record (written just before the request, so a moment is waited for it), else from the
   * request's 'Requesting approval to <action>' text. {call, action, child} — child: the child thread it belongs to
   * (childLogUpdates' binding, `drain` polling the logs once more to bind it), when known — or null (not a sub-agent's).
   */
  async subagentApproval(ctx, thread, toolCall, { drain = null } = {}) {
    const id = String(toolCall?.toolCallId ?? '')
    const callId = /^[^:]*:(.+)$/.exec(id)?.[1] ?? id
    if (!callId) return null
    const deadline = Date.now() + 1500
    let hit = kimiSubagentApprovalRecord(ctx.env, thread, callId)
    while (!hit && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      hit = kimiSubagentApprovalRecord(ctx.env, thread, callId)
    }
    const text = blockTextOf(toolCall?.content) ?? ''
    const action = /Requesting approval to\s+([\s\S]+)$/.exec(text)?.[1]?.trim() ?? ''
    if (!hit) {
      const rawInput = kimiActionInput(String(toolCall?.title ?? ''), action)
      if (!rawInput) return null
      const name = String(toolCall?.title ?? 'tool')
      return { call: { title: name, kind: TOOL_KINDS[name] ?? 'other', rawInput }, action, child: null }
    }
    const call = kimiApprovalCall(hit.request, hit.agentId)
    // The sub-agent may not be bound to its launch yet (its log was still empty at the last poll): one more poll binds it.
    if (!thread.kimiChildren?.bound?.has(hit.agentId)) drain?.()
    // Still unbound: a background launch waiting for its agent (whose result names no other agent) is the one that
    // asks, so the card and its row belong to that child, never to the parent's turn (which would settle it unanswered).
    if (!thread.kimiChildren?.bound?.has(hit.agentId) && bindWaitingLaunch(ctx, thread, hit.agentId)) drain?.()
    const bound = thread.kimiChildren?.bound?.get(hit.agentId)
    const child = bound ? { parentToolCallId: bound.callId, key: `${bound.callId}#${hit.agentId}`, label: bound.label, background: bound.background, prompt: bound.prompt } : null
    const { action: shown, ...rest } = call
    // The diff kimi-acp put in the request (a sub-agent's Edit) is kept when the record has none.
    if (!rest.content.length && Array.isArray(toolCall?.content)) rest.content = toolCall.content.filter((block) => block?.type === 'diff')
    return { call: child ? rest : { ...rest, toolCallId: id }, action: shown || action, child }
  },

  /**
   * Kimi's own asks the bridge must keep (kimiMustAsk): its permission request names the tool (title = tool name) but
   * not why it asks. {reason, always} or null; server.js onPermission turns an 'allow' into a card for it.
   */
  mustAsk(ctx, { call, tool, title, paths, cwd }) {
    const args = isPlainObject(call?.rawInput) ? { ...call.rawInput } : {}
    if (tool === 'Bash' && typeof args.command !== 'string') {
      const shown = /^Running:\s*([\s\S]+)$/.exec(String(title ?? ''))?.[1]
      if (shown) args.command = shown
    }
    return kimiMustAsk({ tool, args, paths, cwd, env: ctx.env })
  },

  /** AskUserQuestion without elicitation: one question as permission options q0_opt_<i> (+ q0_skip). */
  questions(params) {
    const options = (params?.options ?? []).filter((option) => /^q0_opt_\d+$/.test(option.optionId))
    if (!options.length) return null
    const call = params.toolCall ?? {}
    const question = call.rawInput?.questions?.[0]?.question ?? blockTextOf(call.content) ?? call.title ?? 'Question'
    return {
      questions: [{ id: 'q0', header: String(call.rawInput?.questions?.[0]?.header ?? ''), question: String(question), options: options.map((option) => ({ label: option.name, description: '' })), multiSelect: false, isOther: false }],
      answer: (questions, response) => {
        const value = response?.answers?.q0?.answers?.[0]
        const picked = options.find((option) => option.name === value)
        const skip = (params.options ?? []).find((option) => option.optionId === 'q0_skip')
        return { outcome: { outcome: 'selected', optionId: (picked ?? skip ?? options[0]).optionId } }
      },
    }
  },

  account(ctx) {
    const env = ctx.env
    const creds = credentials(env)
    const config = readKimiConfig(path.join(homeOf(env), 'config.toml'))
    const managed = Object.keys(config.providers).find((name) => name.startsWith('managed:kimi-code'))
    if (managed && typeof creds?.access_token === 'string' && creds.access_token) return { kind: 'oauth', label: 'Kimi account', email: null, method: 'login', perToken: false, plan: null }
    const keyed = Object.entries(config.providers).find(([, provider]) => (typeof provider.api_key === 'string' && provider.api_key) || (typeof provider.api_key_env === 'string' && env[provider.api_key_env]))
    if (keyed || env.KIMI_MODEL_API_KEY) return { kind: 'apiKey', label: keyed ? `${keyed[0]} API key` : 'Kimi API key', detail: keyed ? `Provider ${keyed[0]} in config.toml` : 'From KIMI_MODEL_API_KEY', method: 'api-key', perToken: true }
    return { kind: null, label: 'Kimi account', method: null, perToken: false, hint: 'Sign in with your Kimi account, or add a Kimi Platform API key.' }
  },

  /** The signed-in account (GET <base>/me, as Kimi's /status): nickname or email, membership tier, region. */
  async accountProfile(ctx) {
    const creds = credentials(ctx.env)
    if (!creds?.access_token) return null
    const response = await fetch(`${managedBase(ctx.env)}/me`, { headers: { authorization: `Bearer ${creds.access_token}` }, signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null
    const body = await response.json()
    const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)
    const region = text(body?.region)?.replace(/^REGION_/, '') ?? null
    return { email: text(body?.email) ?? text(body?.nickname), plan: text(body?.user_level_name), detail: region && region !== 'UNSPECIFIED' ? `Region: ${region}` : null }
  },

  /**
   * /feedback (Kimi Code's own: POST <managed base>/feedback with the signed-in token, packages/oauth managed-feedback.ts).
   * Text only: Kimi's optional diagnostic-log upload isn't sent from here.
   */
  async feedback(ctx, { classification, reason, threadId, model }) {
    const creds = credentials(ctx.env)
    if (!creds?.access_token) throw new Error('Feedback goes to Kimi with your Kimi Code account. Sign in with Kimi Code first.')
    const content = [classification && classification !== 'other' ? `[${classification}]` : null, typeof reason === 'string' ? reason.trim() : null].filter(Boolean).join(' ')
    const response = await fetch(`${managedBase(ctx.env)}/feedback`, {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { authorization: `Bearer ${creds.access_token}`, accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: threadId ?? '', content: content || '(no description)', version: `kimi-code-${ctx.env.CODE_DESKTOP_AGENT_VERSION || 'code-desktop'}`, os: `${process.platform} ${os.release()}`, model: model ?? null, info: { client: 'code-desktop' } }),
    })
    if (!response.ok) throw new Error(`Kimi didn’t take the feedback (HTTP ${response.status}).`)
    const body = await response.json().catch(() => null)
    const id = body?.feedback_id ?? body?.feedbackId ?? body?.data?.feedback_id ?? null
    return { threadId: threadId ?? null, ...(id !== null ? { feedbackId: String(id) } : {}) }
  },

  login: { type: 'chatgptDeviceCode' },

  /**
   * /export's ZIP (codeDesktop/sessionLog/export): Kimi's own session archive, as `kimi export <id>` (and the TUI's
   * /export-debug-zip) write it: the session with its sub-agent sessions and Kimi's diagnostic log. Run on the real
   * home, where a thread's sessions, logs and catalog live (its overlay links them, and settles the rest on exit).
   */
  async sessionLogExport(ctx, sessionId, file, { cwd = null } = {}) {
    if (typeof sessionId !== 'string' || !/^[A-Za-z0-9._:-]{1,200}$/.test(sessionId)) throw new Error('Unknown session.')
    const { command, args } = ctx.commandLine(['export', sessionId, '--output', file, '--yes'])
    const where = typeof cwd === 'string' && path.isAbsolute(cwd) && fs.existsSync(cwd) ? cwd : os.homedir()
    await new Promise((resolve, reject) => {
      let text = ''
      const child = spawn(command, args, { env: withoutBrowser({ ...ctx.env, NO_COLOR: '1' }), cwd: where, stdio: ['ignore', 'pipe', 'pipe'] })
      const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Kimi Code took too long to export the session.')) }, 5 * 60000)
      child.stdout.on('data', (chunk) => { text += String(chunk) })
      child.stderr.on('data', (chunk) => { text += String(chunk) })
      child.on('error', (error) => { clearTimeout(timer); reject(error) })
      child.on('exit', (code) => {
        clearTimeout(timer)
        if (code === 0 && fs.existsSync(file)) resolve()
        else reject(new Error(`Kimi Code could not export the session${text.trim() ? `: ${text.trim().split('\n').pop().slice(0, 300)}` : '.'}`))
      })
    })
    return { path: file }
  },

  /**
   * Kimi's ACP turns any failed readiness check into "Authentication required" (acp-server ensureAuthed), a broken
   * config.toml included. When an account or key is set up, `kimi doctor config` says what's actually wrong, and the
   * error names that instead of asking for a sign-in that changes nothing.
   */
  authHint(ctx, message) {
    if (!/auth/i.test(String(message ?? ''))) return null
    let signedIn = false
    try { signedIn = Boolean(this.account(ctx)?.kind) } catch {}
    if (!signedIn) return null
    const file = path.join(homeOf(ctx.env), 'config.toml')
    let output = ''
    try {
      const { command, args } = ctx.commandLine(['doctor', 'config', file])
      output = execFileSync(command, args, { env: withoutBrowser({ ...ctx.env, NO_COLOR: '1' }), timeout: 10000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) { output = `${error?.stdout ?? ''}\n${error?.stderr ?? ''}` }
    const issue = kimiDoctorIssue(output)
    if (!issue) return null
    return { message: `Kimi Code’s config.toml has a problem, so it can’t start: ${issue.replace(/[.\s]+$/, '')}. Fix ~/.kimi-code/config.toml (Settings › Code › Edit config), then try again.`, codexErrorInfo: 'badRequest' }
  },

  /**
   * A Kimi Platform API key (cores/kimi.mjs login.apiKey template moonshot-cn / moonshot-ai), as the TUI's /login
   * 'Kimi Platform' option: the key's model list (GET <base>/models), then the provider and its models in config.toml
   * with default_model on one of them. A key the platform refuses changes nothing.
   */
  async connectProvider(ctx, { template, apiKey }) {
    const platform = KIMI_PLATFORMS[template]
    if (!platform) throw new Error('Choose which Kimi Platform the key is for.')
    const fetchImpl = ctx.fetch ?? fetch
    let response
    try { response = await fetchImpl(`${platform.baseUrl}/models`, { headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) }) }
    catch (error) { throw new Error(`Couldn’t reach the Kimi Platform: ${error?.message ?? error}`) }
    if (response.status === 401 || response.status === 403) throw new Error('The Kimi Platform rejected this API key.')
    if (!response.ok) throw new Error(`The Kimi Platform didn’t list models (HTTP ${response.status}).`)
    const models = kimiPlatformModels(await response.json().catch(() => null), platform)
    if (!models.length) throw new Error('This Kimi Platform key has no Kimi models available.')
    const file = path.join(homeOf(ctx.env), 'config.toml')
    let text = ''
    try { text = fs.readFileSync(file, 'utf8') } catch {}
    const current = readKimiConfig(file).defaultModel
    const ordered = [...models].sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }))
    const defaultModel = typeof current === 'string' && models.some((model) => current === `${platform.id}/${model.id}`) ? current : `${platform.id}/${ordered[0].id}`
    const next = kimiTomlWithPlatform(text, { platform, apiKey, models, defaultModel })
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    fs.writeFileSync(temp, next, { mode: 0o600 })
    fs.renameSync(temp, file)
    return { defaultModel }
  },

  /** `kimi login`: the device-code flow prints its URL and code on stderr; exit 0 is success. */
  // codeDesktop.provider 'kimi-cn' / 'kimi-global': which Kimi platform (kimi.com or kimi.ai) the device code is for, as
  // the TUI's /login platform picker asks; without it Kimi picks from its install channel (mainland-cn by default).
  startLogin(ctx, { onDone, codeDesktop } = {}) {
    return new Promise((resolve, reject) => {
      const region = kimiLoginRegion(codeDesktop?.provider)
      const { command, args } = ctx.commandLine(region ? ['login', '--region', region] : ['login'])
      // `kimi login` opens the device page itself (utils/open-url.ts runs `open <url>`), and OpenClaude Desktop opens the
      // verificationUrl it returns: a no-op `open` first on PATH keeps the app the only opener (one tab, not two).
      const env = withoutBrowser({ ...ctx.env, NO_COLOR: '1' })
      const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
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
        if (!answered) { answered = true; reject(new Error(`kimi login stopped: ${text.trim().slice(-400)}`)); return }
        onDone(code === 0, code === 0 ? null : 'Sign-in did not complete.')
      })
      setTimeout(() => { if (!answered) { answered = true; child.kill('SIGTERM'); reject(new Error('kimi login did not show a device code.')) } }, 30000).unref?.()
    })
  },

  async logout(ctx) {
    const host = await ctx.utility()
    // Fallback: remove the token file the managed provider names (a kimi.ai login's kimi-code-env-<hash>.json) too.
    try { await host.call('logout', {}, 15000) } catch {
      const managed = managedCredentialsFile(ctx.env)
      for (const file of [managed, path.join(homeOf(ctx.env), 'credentials', 'kimi-code.json')]) if (file) fs.rmSync(file, { force: true })
    }
  },

  /** The coding plan's 5-hour and weekly windows (GET <base>/usages with the sign-in token). */
  async rateLimits(ctx) {
    const creds = credentials(ctx.env)
    // An expired token (Kimi refreshes it only while it runs) would be refused: no limits until Kimi signs in again.
    if (!creds?.access_token || tokenExpired(creds)) return null
    const response = await fetch(`${managedBase(ctx.env)}/usages`, { headers: { authorization: `Bearer ${creds.access_token}` }, signal: AbortSignal.timeout(10000) })
    if (!response.ok) return null
    return kimiUsageSnapshot(await response.json())
  },

  /**
   * The user's ~/.kimi-code/mcp.json servers, then the project's <cwd>/.kimi-code/mcp.json ones. Kimi loads a project's
   * servers only in a trusted workspace (agent-core-v2 workspaceMcpConfigService: includeProject = trust.isTrusted()):
   * an untrusted folder's servers are marked trustRequired, so the bridge neither probes (runs) them nor shows them as
   * connected. A project server runs in the project folder.
   */
  mcpServers(ctx, cwd) {
    const servers = new Map()
    const add = (record, source, extra = {}) => {
      for (const [name, value] of Object.entries(record?.mcpServers ?? {})) {
        const server = normalizeMcpServer(name, value, source, extra)
        if (server) servers.set(name, server.cwd || source !== 'project' ? server : { ...server, cwd })
      }
    }
    add(readJsonFile(path.join(homeOf(ctx.env), 'mcp.json'), {}), 'user')
    if (cwd) add(readJsonFile(path.join(cwd, '.kimi-code', 'mcp.json'), {}), 'project', kimiWorkspaceTrusted(ctx.env, cwd) ? {} : { trustRequired: true })
    // Enabled plugins' servers under Kimi's runtime names (kimiPluginMcpServers); a disabled plugin's are left out here.
    for (const server of kimiPluginMcpServers(ctx.env)) if (server.pluginEnabled && !servers.has(server.name)) servers.set(server.name, server)
    return [...servers.values()]
  },

  /** The bridge's own /init (Kimi's /init is TUI-only): a turn that writes AGENTS.md, as Kimi's own does. */
  commands(ctx) {
    // Enabled plugins' commands (`/<plugin>:<name>`, as Kimi's TUI names them): not advertised over ACP, so the bridge
    // lists and expands them (kimiPluginCommands, kimiExpandArguments).
    let plugins = []
    try { plugins = ctx ? kimiPluginCommands(ctx.env) : [] } catch {}
    return [{ name: 'init', description: 'Analyze the codebase and write AGENTS.md for coding agents.', file: KIMI_INIT_COMMAND, prompt: null, builtin: 'init', scope: 'system', extension: null, usesArgs: false }, ...plugins]
  },
  async expandCommand(ctx, command, { args }) {
    if (command.pluginCommand) return kimiExpandArguments(command.prompt, args)
    if (command.builtin !== 'init') return null
    return `${KIMI_INIT_PROMPT}${args ? `\n\nAlso take this into account: ${args}` : ''}`
  },

  /** Trust a folder as Kimi's trust prompt does (agent-core-v2 writeWorkspaceTrust): its project connectors load next start. */
  trustWorkspace(ctx, cwd) {
    return writeKimiWorkspaceTrust(ctx.env, cwd)
  },

  writeMcpServer(ctx, name, value) {
    const file = path.join(homeOf(ctx.env), 'mcp.json')
    const config = readJsonFile(file, {}) ?? {}
    config.mcpServers = { ...config.mcpServers }
    if (value === null) delete config.mcpServers[name]
    else config.mcpServers[name] = value.url ? { url: value.url, ...(value.http_headers ? { headers: value.http_headers } : {}) } : { command: value.command, ...(value.args ? { args: value.args } : {}), ...(value.env ? { env: value.env } : {}) }
    writeJsonFile(file, config)
  },

  /**
   * Project, then user, then config.toml extra_skill_dirs (~ is the OS home, a relative one is under the project root:
   * agent-core-v2 skillRoots.ts configuredRoots), each in the directory form and Kimi's flat <name>.md form.
   */
  skills(ctx, cwd) {
    const roots = []
    const projects = cwd ? projectDirs(cwd) : []
    for (const dir of projects) roots.push({ path: path.join(dir, '.kimi-code', 'skills'), scope: 'repo' }, { path: path.join(dir, '.agents', 'skills'), scope: 'repo' })
    const osHome = ctx.env.HOME || os.homedir()
    roots.push({ path: path.join(homeOf(ctx.env), 'skills'), scope: 'user' }, { path: path.join(osHome, '.agents', 'skills'), scope: 'user' })
    const projectRoot = projects.find((dir) => fs.existsSync(path.join(dir, '.git'))) ?? cwd ?? null
    for (const dir of readKimiConfig(path.join(homeOf(ctx.env), 'config.toml')).extraSkillDirs) {
      const resolved = dir === '~' ? osHome : dir.startsWith('~/') ? path.join(osHome, dir.slice(2)) : path.isAbsolute(dir) ? dir : projectRoot ? path.join(projectRoot, dir) : null
      if (resolved) roots.push({ path: resolved, scope: 'user' })
    }
    roots.push(...kimiPluginSkillRoots(ctx.env))
    return scanSkills(roots, { flat: true, recursive: true })
  },

  skillPrompt: (skill) => `/skill:${skill.name}`,
  // Kimi advertises every skill as an ACP command named skill:<name>: the slash menu lists the skill once.
  skillCommandPrefix: 'skill:',

  /** plugins/installed.json records, named and described by each plugin's own manifest (at record.root). */
  plugins(ctx) {
    return installedPlugins(ctx.env).records.filter((record) => record && (record.id || record.name)).map((record) => {
      const root = record.root ?? record.path ?? null
      const manifest = pluginManifest(root)
      const id = String(record.id ?? record.name)
      return pluginSummary({
        id, name: String(manifest?.name ?? record.name ?? id), version: manifest?.version ?? record.version ?? null, description: manifest?.description ?? record.description ?? '',
        enabled: record.enabled !== false, path: root ?? path.join(homeOf(ctx.env), 'plugins'), removable: true,
        extra: { kind: 'kimi-plugin', mcpServers: Object.keys(manifest?.mcpServers ?? {}), installHint: 'Install plugins with /plugins in Kimi Code CLI.' },
      })
    })
  },

  /** plugin/read: the hooks and MCP servers a plugin's manifest declares. */
  pluginDetail(ctx, plugin) {
    const record = installedPlugins(ctx.env).records.find((entry) => String(entry?.id ?? entry?.name) === plugin.id)
    const manifest = pluginManifest(record?.root ?? record?.path)
    const hooks = Array.isArray(manifest?.hooks) ? manifest.hooks : []
    const skills = record ? scanSkills(pluginSkillRootsOf(record, { includeDisabled: true }), { recursive: true }) : []
    // Each declared server with its runtime name and whether it runs (installed.json capabilities), for its switch.
    const servers = kimiPluginMcpServers(ctx.env).filter((server) => server.pluginId === plugin.id)
    return {
      hooks: hooks.map((hook, index) => ({ key: `${plugin.id}:${index}`, eventName: hookEventName(hook?.event) })), mcpServers: Object.keys(manifest?.mcpServers ?? {}),
      mcpServerStates: servers.map((server) => ({ name: server.pluginServer, runtimeName: server.name, enabled: !server.disabled || (record?.enabled === false && record?.capabilities?.mcpServers?.[server.pluginServer]?.enabled !== false) })),
      skills: skills.map((skill) => ({ name: skill.name, description: skill.description, shortDescription: null, interface: null, path: skill.path, enabled: record.enabled !== false && skill.enabled })),
    }
  },

  // Kimi installs plugins only from its CLI (/plugins); turning one on or off and removing it rewrite installed.json.
  // codeDesktop/plugin/update: reinstalled from its marketplace source (or the one it was installed from).
  pluginUpdate: true,

  /** Legacy kimi-cli data Kimi Code would offer to bring over (codeDesktop/migration/read), or null. */
  migration: (ctx) => kimiLegacyMigration(ctx.env),

  /** `kimi migrate --run [--config-only]` (codeDesktop/migration/run): Kimi's own non-interactive migration. */
  async runMigration(ctx, { configOnly = false } = {}) {
    const { command, args } = ctx.commandLine(['migrate', '--run', ...(configOnly ? ['--config-only'] : [])])
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { env: withoutBrowser({ ...ctx.env, NO_COLOR: '1' }), cwd: ctx.env.HOME || os.homedir(), stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''
      const keep = (chunk) => { output = (output + String(chunk)).slice(-20000) }
      child.stdout.on('data', keep)
      child.stderr.on('data', keep)
      const timer = setTimeout(() => { try { child.kill('SIGTERM') } catch {} }, 10 * 60 * 1000)
      child.on('error', (error) => { clearTimeout(timer); reject(error) })
      child.on('exit', (code) => {
        clearTimeout(timer)
        const last = output.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').filter(Boolean).slice(-3).join(' ')
        // kimi migrate exits 0 (done), 1 (incomplete: some items skipped, see migration-report.json) or 2 (error).
        if (code === 0) resolve({ complete: true, log: last })
        else if (code === 1) resolve({ complete: false, log: last })
        else reject(new Error(`Kimi Code couldn’t bring over your kimi-cli setup${last ? `: ${last}` : '.'}`))
      })
    })
  },

  /** Customize › Plugins › Available: Kimi's own marketplace, read through its local server (kimiMarketplacePlugins). */
  async availablePlugins(ctx) {
    const entries = await withKimiServer(ctx, { ensureDirs: ['plugins'] }, async (call) => kimiData(await call('GET', '/api/v1/plugins/marketplace'), 'read its plugin marketplace')?.entries)
    return kimiMarketplacePlugins(entries, homeOf(ctx.env))
  },
  // Each plugin MCP server has its own switch (installed.json capabilities.mcpServers: pluginCommand mcp-enable|-disable).
  pluginServerToggle: true,

  /** enable / disable / remove: installed.json rewritten in place, atomically (Kimi's writeInstalled). */
  async pluginCommand(ctx, op, value, options = {}) {
    // Install (a marketplace entry's source, a local folder, a zip URL or a GitHub repo) and update go through Kimi's own
    // plugin service (POST /api/v1/plugins), as /plugins does; Kimi applies them in new sessions.
    if (op === 'install' || op === 'update') {
      return withKimiServer(ctx, { ensureDirs: ['plugins'] }, async (call) => {
        let source = value
        if (op === 'update') {
          const record = installedPlugins(ctx.env).records.find((entry) => String(entry?.id ?? entry?.name) === value)
          if (!record) throw new Error(`Kimi Code has no plugin named ${value}.`)
          let entries = []
          try { entries = kimiData(await call('GET', '/api/v1/plugins/marketplace'), 'read its plugin marketplace')?.entries ?? [] } catch {}
          source = entries.find((entry) => entry?.id === value && typeof entry.source === 'string' && !entry.source.startsWith('capability:'))?.source
            ?? (typeof record.source === 'string' ? record.source : typeof record.installSource === 'string' ? record.installSource : null)
            // A plugin installed from GitHub keeps its repository (manager.ts record.github {owner, repo}).
            ?? (typeof record.github?.owner === 'string' && typeof record.github?.repo === 'string' ? `https://github.com/${record.github.owner}/${record.github.repo}` : null)
          if (!source) throw new Error(`Kimi Code doesn’t know where ${value} came from, so it can’t update it here. Reinstall it from Kimi Code’s /plugins.`)
        }
        const plugin = kimiData(await call('POST', '/api/v1/plugins', { source }), op === 'update' ? `update ${value}` : 'install the plugin')
        return { stdout: `${op === 'update' ? 'Updated' : 'Installed'} ${plugin?.id ?? plugin?.name ?? value}${plugin?.version ? ` ${plugin.version}` : ''}.` }
      })
    }
    const { file, installed, records } = installedPlugins(ctx.env)
    // One of a plugin's MCP servers on or off (Kimi's setMcpServerEnabled, /plugins mcp enable|disable <id> <server>).
    if (op === 'mcp-enable' || op === 'mcp-disable') {
      const index = records.findIndex((record) => String(record?.id ?? record?.name) === value)
      if (index < 0) throw new Error(`Kimi Code has no plugin named ${value}.`)
      const server = typeof options.server === 'string' ? options.server : ''
      if (!pluginManifest(records[index].root ?? records[index].path)?.mcpServers?.[server]) throw new Error(`Plugin ${value} declares no MCP server named ${server}.`)
      const record = records[index]
      const next = records.map((entry, at) => (at === index ? { ...record, capabilities: { ...record.capabilities, mcpServers: { ...record.capabilities?.mcpServers, [server]: { enabled: op === 'mcp-enable' } } }, updatedAt: new Date().toISOString() } : entry))
      const data = Array.isArray(installed) ? next : { ...(installed ?? {}), version: installed?.version ?? 1, plugins: next }
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 2), 'utf8')
      fs.renameSync(`${file}.tmp`, file)
      return { stdout: `${op === 'mcp-enable' ? 'Enabled' : 'Disabled'} ${server} of ${value}.` }
    }
    const index = records.findIndex((record) => String(record?.id ?? record?.name) === value)
    if (index < 0) throw new Error(`Kimi Code has no plugin named ${value}.`)
    const now = new Date().toISOString()
    const next = op === 'remove' ? records.filter((_, at) => at !== index) : records.map((record, at) => (at === index ? { ...record, enabled: op === 'enable', updatedAt: now } : record))
    const data = Array.isArray(installed) ? next : { ...(installed ?? {}), version: installed?.version ?? 1, plugins: next }
    const temp = `${file}.tmp`
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8')
    fs.renameSync(temp, file)
    return { stdout: `${op === 'remove' ? 'Removed' : op === 'enable' ? 'Enabled' : 'Disabled'} ${value}.` }
  },

  /** config.toml [[hooks]] and the hooks enabled plugins declare, as Codex hooks/list entries. */
  hooks(ctx) {
    const configFile = path.join(homeOf(ctx.env), 'config.toml')
    const out = []
    readKimiConfig(configFile).hooks.forEach((hook, index) => {
      if (hook?.event && hook?.command) out.push(hookMetadata(hook, { key: `config:${index}`, source: 'user', sourcePath: configFile, order: out.length }))
    })
    for (const record of installedPlugins(ctx.env).records) {
      if (!record || record.enabled === false) continue
      const root = record.root ?? record.path
      const manifest = pluginManifest(root)
      const id = String(record.id ?? record.name)
      ;(Array.isArray(manifest?.hooks) ? manifest.hooks : []).forEach((hook, index) => {
        if (hook?.event && hook?.command) out.push(hookMetadata(hook, { key: `${id}:${index}`, source: 'plugin', sourcePath: fs.existsSync(path.join(root, 'kimi.plugin.json')) ? path.join(root, 'kimi.plugin.json') : path.join(root, '.kimi-plugin', 'plugin.json'), pluginId: id, order: out.length }))
      })
    }
    return out
  },

  // WebSearch exists only with Kimi's search service configured ([services.moonshot_search], which `kimi login` sets up):
  // an API-key provider without it has no such tool, so no switch is offered for it.
  builtinTools: (ctx) => {
    const config = ctx ? readKimiConfig(path.join(homeOf(ctx.env), 'config.toml')) : null
    const services = config?.services ?? null
    return BUILTIN_TOOLS.filter(([name]) => name !== 'WebSearch' || !services || services.moonshot_search).map(([name, description]) => {
      const disabledReason = config ? kimiToolOffReason(config.tools, name) : null
      return disabledReason ? { name, description, disabledReason } : { name, description }
    })
  },
  /** Why Kimi's own config.toml keeps a tool off ([tools] enabled / disabled), or null: the tool lists show it as off. */
  toolOffReason(ctx, name, mcp = null) {
    const tools = readKimiConfig(path.join(homeOf(ctx.env), 'config.toml')).tools
    return kimiToolOffReason(tools, mcp ? kimiQualifiedToolName(mcp.server, mcp.tool) : name, mcp ? 'mcp' : 'builtin')
  },
  fallbackModels: (ctx) => {
    const config = readKimiConfig(path.join(homeOf(ctx.env), 'config.toml'))
    return Object.entries(config.models).map(([alias, model]) => ({ ...kimiModelInfo(alias, model, config.thinking), isDefault: alias === config.defaultModel }))
  },
}

/** Kimi's qualified MCP tool name (tool-naming.ts qualifyMcpToolName), hashed past 64 characters. */
export function kimiQualifiedToolName(server, tool) {
  const full = `mcp__${kimiMcpNamePart(server)}__${kimiMcpNamePart(tool)}`
  if (full.length <= MCP_QUALIFIED_MAX) return full
  let hash = 0x811c9dc5
  for (let i = 0; i < full.length; i++) { hash ^= full.codePointAt(i); hash = Math.trunc(Math.imul(hash, 0x01000193)) }
  const hex = hash.toString(16).padStart(8, '0')
  return `${full.slice(0, MCP_QUALIFIED_MAX - hex.length - 1)}_${hex}`
}

/**
 * Why Kimi's global tool policy keeps a tool off (agent/toolPolicy/evaluate.ts isToolActive): a builtin by exact name,
 * an MCP tool by its mcp__ patterns; a non-empty `enabled` is an allowlist. null when the tool is on.
 */
export function kimiToolOffReason(tools, name, source = 'builtin') {
  if (!tools) return null
  const matches = (list) => (source === 'mcp'
    ? list.filter((pattern) => pattern.startsWith('mcp__')).some((pattern) => Boolean(globRegExp(pattern)?.test(name)))
    : list.includes(name))
  if (Array.isArray(tools.enabled) && tools.enabled.length && !matches(tools.enabled)) return 'Kimi Code’s config.toml leaves this tool out of [tools] enabled.'
  if (Array.isArray(tools.disabled) && matches(tools.disabled)) return 'Kimi Code’s config.toml turns this tool off ([tools] disabled).'
  return null
}

/**
 * A config.toml text whose [tools] policy lets OpenClaude Desktop's tools server (`server`) through, or null when the policy
 * already does (or the file can't be read for certain). A non-empty `enabled` gets `mcp__<server>__*`; a `disabled`
 * pattern matching the server's tools is dropped, and a broader one (e.g. 'mcp__*') is narrowed to the user's own
 * servers (`ownServers()`), so their switches still hold.
 */
export function kimiAppToolsConfig(text, server, ownServers = () => []) {
  const lists = tomlToolsLists(text)
  if (!lists) return null
  const probe = kimiQualifiedToolName(server, 'tool')
  if (!kimiToolOffReason(lists, probe, 'mcp')) return null
  const prefix = `mcp__${kimiMcpNamePart(server)}__`
  const blocks = (pattern) => pattern.startsWith('mcp__') && Boolean(globRegExp(pattern)?.test(probe))
  let next = String(text ?? '')
  if (Array.isArray(lists.enabled) && lists.enabled.length && !lists.enabled.filter((pattern) => pattern.startsWith('mcp__')).some(blocks)) {
    next = tomlWithToolsList(next, 'enabled', [...lists.enabled, `${prefix}*`])
    if (next === null) return null
  }
  if (Array.isArray(lists.disabled) && lists.disabled.some(blocks)) {
    const own = [...new Set((ownServers() ?? []).filter((name) => typeof name === 'string' && name && name !== server))]
    const kept = []
    for (const pattern of lists.disabled) {
      if (!blocks(pattern)) { kept.push(pattern); continue }
      // Only the app's own server: dropped. Broader: each of the user's servers it covered, by their own prefix.
      if (pattern.startsWith(prefix)) continue
      for (const name of own) {
        const theirs = kimiQualifiedToolName(name, 'tool')
        if (globRegExp(pattern)?.test(theirs)) kept.push(`mcp__${kimiMcpNamePart(name)}__*`)
      }
    }
    next = tomlWithToolsList(next, 'disabled', kept)
    if (next === null) return null
  }
  return next
}

/** The connector names Kimi knows (mcp.json and enabled plugins' servers), to map a sanitized name back. */
function kimiServerNames(env) {
  const names = Object.keys(readJsonFile(path.join(homeOf(env), 'mcp.json'), {})?.mcpServers ?? {})
  for (const record of installedPlugins(env).records) {
    if (!record || record.enabled === false) continue
    names.push(...Object.keys(pluginManifest(record.root ?? record.path)?.mcpServers ?? {}))
  }
  return names
}

function blockTextOf(content) {
  const text = (Array.isArray(content) ? content : []).map((block) => block?.content?.text ?? block?.text ?? '').filter(Boolean).join('\n')
  return text || null
}
