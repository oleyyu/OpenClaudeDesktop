/**
 * Qwen Code (github.com/QwenLM/qwen-code, `qwen --acp`).
 *
 *   home             $QWEN_HOME or ~/.qwen (settings, skills, extensions, auth); sessions under
 *                    $QWEN_RUNTIME_DIR|$QWEN_HOME/projects/<cwd>/chats/<id>.jsonl
 *   system prompt    QWEN_SYSTEM_MD=<thread>/system.md replaces the base prompt;
 *                    --append-system-prompt adds the project instructions
 *   per-thread       QWEN_CODE_SYSTEM_SETTINGS_PATH: the system settings plus tools.disabled,
 *   settings         mcp.excluded and model.generationConfig.samplingParams
 *   modes            default / plan (the bridge answers permissions itself)
 *   sessions         ACP session/list + session/resume; deleteSession, renameSession,
 *                    qwen/control/session/branch (fork), /rewind (revert), /btw (side question)
 *   usage            `_meta.usage` on empty agent_message_chunk frames + usage_update {used, size}
 *   models           session/set_config_option {configId: 'model'} (this session only; session/set_model
 *                    would also rewrite the global default in settings.json)
 *   skills           the per-skill switch is SKILL.md's `disable-model-invocation: true` line (as Qwen's
 *                    own qwen/skills/setEnabled writes it)
 *   suggestions      follow-up prompt suggestions (an extra model call after a turn) only when the user
 *                    turned them on in settings.json; then forwarded as codeDesktop/promptSuggestion
 *   sub-agents       child updates carry _meta.parentToolCallId (spawned threads)
 *   files            fs/read_text_file + fs/write_text_file
 */

import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readJsonFile, normalizeMcpServer, scanSkills, writeJsonFile, pluginSummary, projectDirs } from '../catalog.js'
import { pathsOf } from '../permissions.js'
import { APP_TOOL_NAMES } from '../app-tools.js'
import { isQwenWorkflowCall, qwenWorkflowRun, workflowFromCall, applyWorkflowTask, workflowInterrupted, workflowLost, workflowApprovalTool } from './qwen-workflow.js'

const DEFAULT_SYSTEM_SETTINGS = '/Library/Application Support/QwenCode/settings.json'

export const QWEN_RECORDING_DEGRADED = 'Qwen Code can’t save this session anymore (check your free disk space). New messages won’t come back after a restart: start a new session to keep your work.'
const todoWriteOn = (...scopes) => !scopes.some((settings) => settings?.tools?.todoWrite?.enabled === false)
// Qwen 0.24.7's opt-in tools (config.ts: TodoWriteTool with tools.todoWrite.enabled, LspTool with lsp.enabled, the agent
// team tools with experimental.agentTeam or QWEN_CODE_ENABLE_AGENT_TEAM=1).
export const QWEN_TEAM_TOOLS = Object.freeze(['team_create', 'team_delete', 'team_plan_approval', 'request_shutdown', 'task_create', 'task_update', 'task_list'])
/** Why Qwen leaves a tool out with these user settings, or null (the todo list is on in OpenClaude Desktop unless turned off). */
export function qwenOptInReason(name, user = {}, env = {}) {
  if (name === 'todo_write' && !todoWriteOn(user)) return 'Off in Qwen’s settings (tools.todoWrite.enabled).'
  if (name === 'lsp' && user?.lsp?.enabled !== true) return 'Qwen turns this on only with lsp.enabled in its settings.'
  if (QWEN_TEAM_TOOLS.includes(name) && user?.experimental?.agentTeam !== true && env?.QWEN_CODE_ENABLE_AGENT_TEAM !== '1') return 'Qwen turns this on only with experimental.agentTeam in its settings.'
  return null
}

export const BUILTIN_TOOLS = [
  ['read_file', 'Reads a file.'], ['write_file', 'Writes a file.'], ['edit', 'Edits a file.'], ['notebook_edit', 'Edits a notebook.'],
  ['run_shell_command', 'Runs a shell command.'], ['grep_search', 'Searches file contents.'], ['glob', 'Finds files by pattern.'],
  ['list_directory', 'Lists a directory.'], ['web_fetch', 'Fetches a web page.'], ['web_search', 'Searches the web.'],
  ['todo_write', 'Keeps a todo list.'], ['ask_user_question', 'Asks the user a question.'], ['save_memory', 'Saves a memory.'],
  ['agent', 'Runs a sub-agent.'], ['skill', 'Runs a skill.'], ['exit_plan_mode', 'Leaves plan mode with a plan.'],
  ['enter_plan_mode', 'Enters plan mode.'], ['lsp', 'Language server queries.'], ['monitor', 'Watches a command.'],
  // Qwen Code 0.24.7's other user-facing tools (core/src/tools/tool-names.ts); all switchable through tools.disabled.
  // Internal ones (tool_call, tool_search, structured_output, record_source, the omni_* media policy tools) stay out.
  ['zoom_image', 'Zooms into an image.'], ['display_image', 'Shows an image.'], ['image_gen', 'Generates images.'],
  ['manage_memory', 'Edits saved memories.'], ['search_memory', 'Searches saved memories.'], ['read_mcp_resource', 'Reads an MCP resource.'],
  ['cron_create', 'Schedules a recurring task.'], ['cron_list', 'Lists scheduled tasks.'], ['cron_delete', 'Deletes a scheduled task.'], ['loop_wakeup', 'Schedules the next loop run.'],
  ['task_create', 'Creates a task.'], ['task_update', 'Updates a task.'], ['task_list', 'Lists tasks.'], ['task_stop', 'Stops a background task.'],
  ['team_create', 'Creates an agent team.'], ['team_delete', 'Deletes an agent team.'], ['team_plan_approval', 'Approves a teammate\'s plan.'], ['send_message', 'Messages a teammate.'], ['request_shutdown', 'Asks a teammate to stop.'],
  ['create_sub_session', 'Starts a sub-session.'], ['list_agents', 'Lists the available agents.'], ['advisor', 'Asks an advisor model.'],
  ['enter_worktree', 'Moves into a git worktree.'], ['exit_worktree', 'Leaves the git worktree.'], ['workflow', 'Runs a workflow.'],
  ['artifact', 'Creates an artifact.'], ['record_artifact', 'Records an artifact.'], ['report_findings', 'Reports review findings.'],
  ['get_goal', 'Reads the goal.'], ['update_goal', 'Updates the goal.'], ['propose_goal', 'Proposes a goal.'],
]

/** OpenClaude Desktop's UI locale as a Qwen Code language code (cli/src/i18n/languages.ts SUPPORTED_LANGUAGES: zh, en …), else null. */
export function qwenLanguage(locale) {
  if (typeof locale !== 'string') return null
  if (/^zh(?:-(?:CN|Hans))?$/i.test(locale)) return 'zh'
  if (/^en(?:-|$)/i.test(locale)) return 'en'
  return null
}
/** Where the bridge remembers the provider keys it saved for Qwen (its state folder, never Qwen's own files). */
const qwenKeysFile = (env) => path.join(env.CODE_DESKTOP_BRIDGE_STATE || path.join(env.HOME || os.homedir(), '.code-desktop-acp'), 'qwen-provider-keys.json')
const homeOf = (env) => env.QWEN_HOME || path.join(env.HOME || os.homedir(), '.qwen')
const userSettingsFile = (env) => path.join(homeOf(env), 'settings.json')
const mergeUnique = (a, b) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])]

// ------------------------------------------------------------ Qwen's skill settings

/** Qwen's bundled skills (<package>/bundled/<name>/SKILL.md: review, simplify, browser-use …) next to its binary, or null. */
export function qwenBundledSkillsDir(program) {
  const binary = program?.binary
  if (typeof binary !== 'string' || !binary) return null
  let real = binary
  try { real = fs.realpathSync(binary) } catch {}
  const dir = path.dirname(real)
  for (const candidate of [path.join(dir, 'bundled'), path.join(dir, '..', 'bundled'), path.join(dir, 'package', 'bundled'), path.join(dir, '..', 'lib', 'node_modules', '@qwen-code', 'qwen-code', 'bundled')]) {
    try { if (fs.statSync(candidate).isDirectory()) return path.resolve(candidate) } catch {}
  }
  return null
}

/** A skill's registered name: an extension skill is '<extension>:<skill>' (core skills/types.ts qualifySkillName). */
export const qwenRegisteredSkillName = (skill) => (skill.pluginId && !String(skill.name).startsWith(`${skill.pluginId}:`) ? `${skill.pluginId}:${skill.name}` : String(skill.name))

/**
 * The extension a skill file belongs to (…/extensions/<dir>/skills/…/SKILL.md): its manifest's name, else the folder's,
 * or null for a skill outside an extension. A slash-menu pick carries only the skill's name and path.
 */
export function qwenSkillExtension(file) {
  const match = typeof file === 'string' ? /^(.*[\\/]extensions[\\/]([^\\/]+))[\\/]skills[\\/]/.exec(file) : null
  if (!match) return null
  const manifest = readJsonFile(path.join(match[1], 'qwen-extension.json'), null) ?? readJsonFile(path.join(match[1], 'gemini-extension.json'), null)
  return typeof manifest?.name === 'string' && manifest.name ? manifest.name : match[2]
}

/**
 * What a slash-menu pick of a skill runs: Qwen registers an extension's skill only under '<extension>:<skill>'
 * (SkillCommandLoader, no alias), so '/pdf' would reach the model as text.
 */
export const qwenSkillCommand = (skill) => qwenRegisteredSkillName({ name: skill.name, pluginId: skill.pluginId ?? qwenSkillExtension(skill.path) })

/** Every spelling a skills.disabled entry may use for a skill, lower-cased (skillRestrictionNames: registered, then authored). */
export const qwenSkillSpellings = (skill) => [...new Set([qwenRegisteredSkillName(skill), String(skill.name)].map((name) => name.trim().toLowerCase()))]

/** The level a skill is discovered at (settings skills.disabledLevels). */
const qwenSkillLevel = (skill) => (skill.pluginId ? 'extension' : skill.scope === 'repo' ? 'project' : skill.scope === 'system' ? 'bundled' : 'user')

/**
 * Qwen's skill settings across its scopes (UNION-merged, settingsSchema.ts skills): {sources: [{label, file, disabled,
 * defaultDisabled, enabled, levels}]} for the system settings, the user's settings.json and the project's
 * .qwen/settings.json. `withoutUser`: the user file left out (what would still hide a skill after its own entry goes).
 */
export function qwenSkillPolicy(env, cwd, { withoutUser = false } = {}) {
  const files = [
    { label: 'system', file: env.QWEN_CODE_SYSTEM_SETTINGS_PATH || DEFAULT_SYSTEM_SETTINGS },
    ...(withoutUser ? [] : [{ label: 'user', file: userSettingsFile(env) }]),
    ...(cwd ? [{ label: 'project', file: path.join(cwd, '.qwen', 'settings.json') }] : []),
  ]
  const names = (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry === 'string').map((entry) => entry.trim().toLowerCase()).filter(Boolean) : [])
  return {
    sources: files.map(({ label, file }) => {
      const skills = readJsonFile(file, {})?.skills ?? {}
      return { label, file, disabled: names(skills.disabled), defaultDisabled: names(skills.defaultDisabled), enabled: names(skills.enabled), levels: names(skills.disabledLevels) }
    }),
  }
}

/** Why Qwen hides a skill (a sentence naming the setting), or null when it is shown. */
export function qwenSkillHidden(policy, skill) {
  const spellings = qwenSkillSpellings(skill)
  const level = qwenSkillLevel(skill)
  const where = (label) => (label === 'user' ? 'your Qwen Code settings' : label === 'project' ? 'this project’s Qwen Code settings' : 'the Qwen Code system settings')
  for (const source of policy.sources) if (source.levels.includes(level)) return `Hidden by skills.disabledLevels in ${where(source.label)}.`
  for (const source of policy.sources) if (spellings.some((name) => source.disabled.includes(name))) return `Turned off by skills.disabled in ${where(source.label)}.`
  // defaultDisabled holds unless skills.enabled spells the registered name (or the identical spelling) anywhere.
  const enabled = new Set(policy.sources.flatMap((source) => source.enabled))
  for (const source of policy.sources) {
    const hit = spellings.find((name) => source.defaultDisabled.includes(name))
    if (hit && !enabled.has(qwenRegisteredSkillName(skill).toLowerCase()) && !enabled.has(hit)) return `Off by default (skills.defaultDisabled in ${where(source.label)}).`
  }
  return null
}

// ------------------------------------------------------------ Qwen's own Auto-mode checks
//
// The bridge runs Qwen in its 'default' mode and answers every request itself, so in OpenClaude Desktop's Auto a request
// would be approved by kind alone. Qwen's own Auto mode (core/src/permissions/autoMode.ts, destructive-commands.ts)
// still stops destructive git / infrastructure commands, writes to paths that change later runs (git hooks, npm
// scripts, CI, Qwen's settings, rules, hooks and instructions) and sends connector tools to its classifier:
// qwenMustAsk keeps those asks (server.js onPermission turns an 'allow' into a card).

// destructive-commands.ts DESTRUCTIVE_GIT_PATTERNS / IAC_DESTROY_PATTERNS / GIT_AMEND_PATTERN.
const QWEN_DESTRUCTIVE_GIT = [/\bgit\s+reset\s+--hard\b/, /\bgit\s+checkout\s+--\s+\./, /\bgit\s+clean\s+-[a-zA-Z]*f/, /\bgit\s+stash\s+drop\b/]
const QWEN_IAC_DESTROY = [/\bterraform\s+destroy\b/, /\bpulumi\s+destroy\b/, /\bcdk\s+destroy\b/]
const QWEN_GIT_AMEND = /\bgit\s+commit\s+--amend\b/
// autoMode.ts PERSISTENCE_PATH_PATTERNS + SELF_MODIFICATION_PATH_PATTERNS (matched on the lower-cased path).
const QWEN_PROTECTED_PATHS = [
  /(^|\/)\.git(?:\/|$)/, /(^|\/)\.husky\//, /(^|\/)package\.json$/, /(^|\/)\.npmrc$/, /(^|\/)(makefile|gnumakefile)$/, /(^|\/)\.?justfile$/,
  /(^|\/)taskfile\.ya?ml$/, /(^|\/)\.github\/workflows\//,
  /(^|\/)\.qwen\/settings(?:\.[^/]*)?\.json$/, /(^|\/)(qwen|agents)\.md$/, /(^|\/)\.qwen\/qwen\.local\.md$/, /(^|\/)\.qwen\/(rules|commands|agents|skills|hooks|fork-profiles)(?:\/|$)/,
  /(^|\/)\.mcp\.json$/,
]

/** A shell command with one layer of `bash -c "…"` unwrapped as well (destructive-commands.ts stripShellQuotes). */
const qwenExpandedCommand = (command) => `${command} ${command.replace(/(?:^|\s)(?:bash|sh|zsh|fish|dash|ksh)\s+-[a-zA-Z]*c\s+(?:"([^"]*)"|'([^']*)')/g, (_match, dq, sq) => ` ${dq ?? sq ?? ''}`)}`

/** Why Qwen's Auto mode would stop a shell command, or null: {reason, always}. */
export function qwenDestructiveCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return null
  const expanded = qwenExpandedCommand(command)
  if (QWEN_DESTRUCTIVE_GIT.some((pattern) => pattern.test(expanded))) return { reason: 'This git command discards local work.', always: true }
  if (QWEN_IAC_DESTROY.some((pattern) => pattern.test(expanded))) return { reason: 'This command destroys infrastructure.', always: true }
  if (QWEN_GIT_AMEND.test(expanded)) return { reason: 'This rewrites the last commit.', always: false }
  return null
}

/** Whether a write to `file` is one Qwen's Auto mode always reviews (autoMode.ts isAutoModeProtectedWritePath). */
export function qwenProtectedPath(file, env = process.env) {
  if (typeof file !== 'string' || !file) return false
  const candidates = new Set([file])
  try { candidates.add(fs.realpathSync.native(file)) } catch { try { candidates.add(path.join(fs.realpathSync.native(path.dirname(file)), path.basename(file))) } catch {} }
  const home = homeOf(env)
  const homes = new Set([path.resolve(home)])
  try { homes.add(fs.realpathSync.native(home)) } catch {}
  // context.fileName: the user's own instruction file names (QWEN.md / AGENTS.md by default).
  const named = readJsonFile(userSettingsFile(env), {})?.context?.fileName
  const contextNames = (Array.isArray(named) ? named : typeof named === 'string' ? [named] : []).filter((name) => typeof name === 'string' && name).map((name) => name.replace(/\\/g, '/').toLowerCase().replace(/^\/+|\/+$/g, ''))
  for (const candidate of candidates) {
    const normalized = candidate.replace(/\\/g, '/').toLowerCase()
    if (QWEN_PROTECTED_PATHS.some((pattern) => pattern.test(normalized))) return true
    if (contextNames.some((name) => normalized === name || normalized.endsWith(`/${name}`))) return true
    for (const root of homes) {
      const prefix = `${root.replace(/\\/g, '/').toLowerCase().replace(/\/+$/, '')}/`
      if (!normalized.startsWith(prefix)) continue
      const rest = normalized.slice(prefix.length)
      if (/^settings(?:\.[^/]*)?\.json$/.test(rest) || /^qwen\.local\.md$/.test(rest) || /^\.mcp\.json$/.test(rest) || /^(rules|commands|agents|skills|hooks|fork-profiles)(?:\/|$)/.test(rest)) return true
    }
  }
  return false
}

/**
 * Why Qwen's own Auto mode would not approve this call by itself, or null: {reason, always} (always: asked every time,
 * no session grant, as Qwen blocks those commands until the user takes them on).
 */
export function qwenMustAsk({ call, kind, paths = [], env = process.env, mcp = false }) {
  const input = call?.rawInput && typeof call.rawInput === 'object' ? call.rawInput : {}
  if (kind === 'execute') {
    const command = typeof input.command === 'string' ? input.command : typeof call?.title === 'string' ? call.title : ''
    const destructive = qwenDestructiveCommand(command)
    if (destructive) return destructive
  }
  if ((kind === 'edit' || kind === 'delete' || kind === 'move') && paths.some((file) => qwenProtectedPath(file, env))) {
    return { reason: 'This changes a file that affects later runs (git hooks, scripts, CI, or Qwen Code’s settings and instructions).', always: false }
  }
  if (mcp) return { reason: 'Qwen Code checks connector tools with you in Auto mode.', always: false }
  return null
}

/**
 * Qwen's hooks as Codex HookMetadata: the Claude Code style `hooks` object ({Event: [{matcher, hooks: [{type, command |
 * url | prompt, timeout}]}]}) of the system settings, the user's ~/.qwen/settings.json, the project's
 * <cwd>/.qwen/settings.json and each extension's qwen-extension.json (settingsSchema.ts hooks, hooks/types.ts). The
 * `disableAllHooks` setting (Settings › Code › Qwen Code settings) turns every one off.
 */
export function qwenHooks(env, cwd) {
  const user = userSettingsFile(env)
  const system = env.QWEN_CODE_SYSTEM_SETTINGS_PATH || DEFAULT_SYSTEM_SETTINGS
  const project = cwd ? path.join(cwd, '.qwen', 'settings.json') : null
  const read = (file) => (file ? readJsonFile(file, null) : null)
  const settings = [[system, 'system', read(system)], [user, 'user', read(user)], ...(project && project !== user ? [[project, 'project', read(project)]] : [])]
  const disabled = settings.some(([, , value]) => value?.disableAllHooks === true)
  const out = []
  const add = (hooks, { sourcePath, source, pluginId = null }) => {
    if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) return
    for (const [event, definitions] of Object.entries(hooks)) {
      if (!Array.isArray(definitions)) continue
      definitions.forEach((definition, index) => {
        ;(Array.isArray(definition?.hooks) ? definition.hooks : []).forEach((hook, position) => {
          if (!hook || typeof hook !== 'object') return
          const text = hook.type === 'http' ? hook.url : hook.type === 'prompt' ? hook.prompt : hook.command
          if (typeof text !== 'string' || !text.trim()) return
          out.push({
            key: `${source}:${pluginId ?? ''}:${event}:${index}:${position}`,
            eventName: `${event.charAt(0).toLowerCase()}${event.slice(1)}`,
            matcher: typeof definition.matcher === 'string' && definition.matcher ? definition.matcher : null,
            timeoutSec: Number.isFinite(hook.timeout) && hook.timeout > 0 ? Math.round(hook.timeout) : 60,
            statusMessage: typeof hook.statusMessage === 'string' ? hook.statusMessage : null, additionalContextLimit: null,
            sourcePath, source, pluginId, displayOrder: out.length, enabled: !disabled, isManaged: source === 'system', currentHash: '', trustStatus: 'trusted',
            ...(hook.type === 'prompt' ? { handlerType: 'prompt' } : { handlerType: 'command', command: hook.type === 'http' ? `POST ${text}` : text, async: hook.async === true }),
          })
        })
      })
    }
  }
  for (const [file, source, value] of settings) add(value?.hooks, { sourcePath: file, source })
  const extensions = path.join(homeOf(env), 'extensions')
  let names = []
  try { names = fs.readdirSync(extensions, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name) } catch {}
  for (const name of names) {
    const file = path.join(extensions, name, 'qwen-extension.json')
    const manifest = readJsonFile(file, null)
    if (manifest && typeof manifest.hooks === 'object') add(manifest.hooks, { sourcePath: file, source: 'plugin', pluginId: String(manifest.name ?? name) })
  }
  return out
}

// Qwen Code's built-in sub-agents (core/src/subagents/builtin-agents.ts), listed before the user's own.
const QWEN_BUILTIN_AGENTS = [
  ['Explore', 'Fast read-only agent for exploring the codebase: finds files, searches code and answers questions about it.'],
  ['statusline-setup', 'Configures Qwen Code’s status line setting.'],
  ['claude-code', 'Delegates a task to Claude Code through its ACP adapter, with its own sign-in and model settings.'],
  ['codex', 'Delegates one self-contained task to the Codex CLI, with its own sign-in and model settings.'],
]

/**
 * Qwen's sub-agents (core/src/subagents/subagent-manager.ts): the built-in ones, then the Markdown files with YAML
 * frontmatter (name, description, tools, model) in <project>/.qwen/agents and ~/.qwen/agents; a project agent wins over
 * a user agent of the same name. Its own /agents manage and create are TUI-only. [{name, description, scope, path, tools, model}].
 */
export function qwenAgents(env, cwd) {
  const out = new Map(QWEN_BUILTIN_AGENTS.map(([name, description]) => [name, { name, description, scope: 'builtin', path: null, tools: null, model: null }]))
  const read = (dir, scope) => {
    let files = []
    try { files = fs.readdirSync(dir).filter((name) => name.endsWith('.md')) } catch { return }
    for (const file of files) {
      let text = ''
      try { text = fs.readFileSync(path.join(dir, file), 'utf8') } catch { continue }
      const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
      if (!block) continue
      const field = (key) => /^(["']?)(.*)\1$/.exec((new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(block)?.[1] ?? '').trim())?.[2]?.trim() ?? ''
      const name = field('name') || file.replace(/\.md$/, '')
      if (scope === 'user' && out.has(name) && out.get(name).scope === 'project') continue
      const tools = field('tools')
      out.set(name, { name, description: field('description').slice(0, 400), scope, path: path.join(dir, file), tools: tools ? tools.replace(/^\[|\]$/g, '').split(',').map((tool) => tool.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : null, model: field('model') || null })
    }
  }
  if (typeof cwd === 'string' && cwd) read(path.join(cwd, '.qwen', 'agents'), 'project')
  read(path.join(homeOf(env), 'agents'), 'user')
  return [...out.values()]
}

/**
 * The project folders Qwen keeps sessions for: <QWEN_RUNTIME_DIR or home>/projects/<sanitized cwd>/chats/*.jsonl, each
 * folder's cwd read from the first record of one of its session files (chatRecordingService: every record has `cwd`).
 * Qwen's session/list is scoped to one project (acpAgent.ts: `params.cwd || process.cwd()`), so listing every session
 * means one call per folder.
 */
export function qwenProjectCwds(env) {
  const root = path.join(env.QWEN_RUNTIME_DIR || homeOf(env), 'projects')
  let projects = []
  try { projects = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()) } catch { return [] }
  const cwds = new Set()
  for (const project of projects.slice(0, 500)) {
    const chats = path.join(root, project.name, 'chats')
    let files = []
    try { files = fs.readdirSync(chats).filter((name) => name.endsWith('.jsonl')) } catch { continue }
    for (const name of files.slice(0, 3)) {
      const cwd = firstRecordCwd(path.join(chats, name))
      if (cwd) { cwds.add(cwd); break }
    }
  }
  return [...cwds]
}

function firstRecordCwd(file) {
  let text = ''
  try {
    const fd = fs.openSync(file, 'r')
    try { const buffer = Buffer.alloc(65536); const read = fs.readSync(fd, buffer, 0, buffer.length, 0); text = buffer.subarray(0, read).toString('utf8') } finally { fs.closeSync(fd) }
  } catch { return null }
  for (const line of text.split('\n').slice(0, 20)) {
    try {
      const record = JSON.parse(line)
      if (typeof record?.cwd === 'string' && path.isAbsolute(record.cwd)) return record.cwd
    } catch {}
  }
  return null
}

/** SKILL.md text with its `disable-model-invocation:` frontmatter line removed (enabled) or set to true. */
export function skillFrontmatterEnabled(text, enabled) {
  const match = /^(---\r?\n)([\s\S]*?)(\r?\n---)/.exec(text)
  if (!match) return enabled ? text : `---\ndisable-model-invocation: true\n---\n${text}`
  const lines = match[2].split(/\r?\n/)
  const at = lines.findIndex((line) => /^disable-model-invocation\s*:/.test(line))
  if (enabled) { if (at >= 0) lines.splice(at, 1) }
  else if (at >= 0) lines[at] = 'disable-model-invocation: true'
  else {
    let insert = lines.length
    while (insert > 0 && lines[insert - 1].trim() === '') insert--
    lines.splice(insert, 0, 'disable-model-invocation: true')
  }
  return `${match[1]}${lines.join('\n')}${match[3]}${text.slice(match[0].length)}`
}

/** The thread's scheduled jobs, as cron_create / cron_delete reported them (session-only jobs die with the process). */
function cronState(thread) {
  thread.qwenCron ??= { calls: new Map(), jobs: new Map() }
  return thread.qwenCron
}

function trackCronCall(thread, update) {
  const state = cronState(thread)
  const id = update.toolCallId
  if (!id) return
  // A deferred tool runs through the tool_call meta-tool (rawInput.name); the title reads "CronCreate: …".
  const meta = update._meta?.toolName === 'tool_call' && typeof update.rawInput?.name === 'string' ? update.rawInput.name : update._meta?.toolName
  const titled = /^Cron(Create|Delete)\b/.exec(String(update.title ?? ''))?.[1]
  const name = (meta === 'cron_create' || meta === 'cron_delete' ? meta : titled ? `cron_${titled.toLowerCase()}` : null) ?? state.calls.get(id)
  if (name === 'cron_create' || name === 'cron_delete') state.calls.set(id, name)
  if (!name || (name !== 'cron_create' && name !== 'cron_delete') || update.status !== 'completed') return
  state.calls.delete(id)
  const text = (Array.isArray(update.content) ? update.content : []).map((block) => block?.content?.text ?? block?.text ?? '').join('\n')
  if (name === 'cron_create') {
    const job = /Scheduled (?:recurring job |one-shot task )?(\S+?)\s*\(/.exec(text)?.[1]
    if (job) state.jobs.set(job, { recurring: !/one-shot/i.test(text) && update.rawInput?.recurring !== false, createdAt: Date.now() })
  } else {
    const job = /Cancelled (?:job )?(\S+?)\.?(?:\s|$)/.exec(text)?.[1]
    if (job) state.jobs.delete(job)
  }
}

/** A run started: a one-shot job (the oldest) has fired and deleted itself. */
function trackCronRun(thread) {
  const state = cronState(thread)
  const once = [...state.jobs.entries()].find(([, job]) => !job.recurring)
  if (once) state.jobs.delete(once[0])
}

/**
 * Qwen's goal record (goalState.goal {goalId, revision, objective, status: active|paused|blocked|usage_limited|complete,
 * turnCount, activeTimeMs, tokensUsed, tokenBudget, createdAt, updatedAt (ms)}) as Codex's ThreadGoal; null clears it.
 */
export function goalOf(goal) {
  if (!goal || typeof goal !== 'object' || typeof goal.objective !== 'string') return null
  const status = { active: 'active', paused: 'paused', blocked: 'blocked', usage_limited: 'usageLimited', complete: 'complete' }[goal.status] ?? 'active'
  const count = (value) => (Number.isFinite(value) && value >= 0 ? value : 0)
  const seconds = (value) => (Number.isFinite(value) ? Math.floor(value / 1000) : Math.floor(Date.now() / 1000))
  return {
    objective: goal.objective, status, tokenBudget: Number.isFinite(goal.tokenBudget) && goal.tokenBudget > 0 ? goal.tokenBudget : null,
    tokensUsed: count(goal.tokensUsed), timeUsedSeconds: Math.floor(count(goal.activeTimeMs) / 1000), createdAt: seconds(goal.createdAt), updatedAt: seconds(goal.updatedAt),
    codeDesktop: { goalId: typeof goal.goalId === 'string' ? goal.goalId : null, revision: Number.isInteger(goal.revision) ? goal.revision : null, rounds: count(goal.turnCount) },
  }
}

function run(file, args, options) {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { timeout: 180000, maxBuffer: 4 << 20, ...options }, (error, stdout, stderr) => (error ? reject(Object.assign(error, { stdout, stderr })) : resolve({ stdout, stderr })))
    // Nobody can answer a prompt here: an extension that asks for a setting on install (extensionSettings.ts
    // promptForSetting, which --consent doesn't skip) gets end of input at once instead of waiting out the timeout.
    child.stdin?.end()
  })
}

/**
 * Qwen's own usage history (<home>/usage_record.jsonl, core usageHistoryService.ts: one summary line per finished session,
 * what /stats and /insight read) from `cursor` on: [{key, sessionId, startedAtMs, completedAtMs, toolCalls, models:
 * {name: {inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens, requests}}}]. A shorter file
 * (Qwen rebuilt it) is read again from the start; the ledger keeps each record once by its key.
 */
export function readQwenUsageRecords(file, cursor = null) {
  let size = 0
  try { size = fs.statSync(file).size } catch { return { records: [], cursor } }
  const start = cursor && cursor.file === file && Number.isFinite(cursor.offset) && cursor.offset <= size ? cursor.offset : 0
  if (size <= start) return { records: [], cursor: { file, offset: start } }
  let text = ''
  try {
    const fd = fs.openSync(file, 'r')
    try { const buffer = Buffer.alloc(size - start); fs.readSync(fd, buffer, 0, buffer.length, start); text = buffer.toString('utf8') } finally { fs.closeSync(fd) }
  } catch { return { records: [], cursor } }
  const last = text.lastIndexOf('\n')
  if (last < 0) return { records: [], cursor: { file, offset: start } }
  const records = []
  const count = (value) => (Number.isFinite(value) && value > 0 ? value : 0)
  for (const line of text.slice(0, last).split('\n')) {
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (typeof record?.sessionId !== 'string' || !record.sessionId || !record.models || typeof record.models !== 'object') continue
    const models = {}
    for (const [name, entry] of Object.entries(record.models)) {
      if (!entry || typeof entry !== 'object') continue
      const input = count(entry.inputTokens)
      const output = count(entry.outputTokens)
      if (!input && !output && !count(entry.totalTokens)) continue
      models[name] = { inputTokens: input, cachedInputTokens: Math.min(count(entry.cachedTokens), input), outputTokens: output, reasoningOutputTokens: count(entry.thoughtsTokens), totalTokens: count(entry.totalTokens) || input + output, requests: count(entry.requests) }
    }
    // A session that never called the model (OpenClaude Desktop's model discovery opens some) is no activity.
    if (!Object.keys(models).length) continue
    const completedAtMs = Number.isFinite(record.timestamp) ? record.timestamp : Number.isFinite(record.startTime) ? record.startTime + count(record.durationMs) : Date.now()
    records.push({ key: `${record.sessionId}:${completedAtMs}`, sessionId: record.sessionId, startedAtMs: Number.isFinite(record.startTime) ? record.startTime : completedAtMs, completedAtMs, toolCalls: count(record.tools?.totalCalls), models })
  }
  return { records, cursor: { file, offset: start + Buffer.byteLength(text.slice(0, last + 1), 'utf8') } }
}

/**
 * Qwen's own background work in a session (qwen/status/session/tasks, without workflows: those have their own row):
 * run_shell_command's is_background shells and Monitor watchers still running, and background sub-agents running or
 * paused. Each as a Background tasks row; stopped with qwen/control/session/task/cancel {taskId, taskKind}.
 */
export function qwenBackgroundTasks(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter((task) => task && typeof task.id === 'string' && task.id && (
    ((task.kind === 'shell' || task.kind === 'monitor') && task.status === 'running')
    || (task.kind === 'agent' && task.isBackgrounded === true && (task.status === 'running' || task.status === 'paused'))))
}

/** A background task as a thread/backgroundTerminals/list row (processId 'qwen-task:<kind>:<id>'). */
export function qwenBackgroundRow(task, cwd) {
  const label = typeof task.label === 'string' && task.label.trim() ? task.label.trim() : typeof task.description === 'string' && task.description.trim() ? task.description.trim() : task.id
  const command = task.kind === 'agent' ? `${task.subagentType || label} agent${task.subagentType && label !== task.subagentType ? `: ${label}` : ''}`
    : task.kind === 'monitor' ? `Monitor: ${typeof task.command === 'string' && task.command ? task.command : label}`
    : typeof task.command === 'string' && task.command ? task.command : label
  return { itemId: typeof task.toolUseId === 'string' && task.toolUseId ? task.toolUseId : task.id, processId: `qwen-task:${task.kind}:${task.id}`, command, cwd: typeof task.cwd === 'string' && task.cwd ? task.cwd : cwd, osPid: Number.isInteger(task.pid) && task.pid > 0 ? task.pid : null }
}

/**
 * Whether an extension is on for a folder, as Qwen decides (core extension/extensionManager.ts isEnabled with
 * override.ts Override.fromFileRule): each rule of extension-enablement.json ('!' disables; a trailing '*' takes the
 * sub-folders too, else only that folder) is tried in order against the folder with leading and trailing slashes, as
 * written and with its real path; the last match wins, and no match is on. Qwen writes '!/*' for a global disable,
 * '!<home>/*' for a user-scope one and '[!]/path/proj/' for a workspace override.
 */
export function qwenExtensionEnabledAt(overrides, dir) {
  const slashed = (value) => { let out = String(value).replace(/\\/g, '/'); if (!out.startsWith('/')) out = `/${out}`; if (!out.endsWith('/')) out += '/'; return out }
  const lexical = slashed(dir)
  let canonical = lexical
  try { canonical = slashed(fs.realpathSync.native(path.resolve(dir))) } catch {}
  let enabled = true
  for (const rule of Array.isArray(overrides) ? overrides : []) {
    if (typeof rule !== 'string' || !rule) continue
    const disable = rule.startsWith('!')
    let base = disable ? rule.slice(1) : rule
    const subdirs = base.endsWith('*')
    if (subdirs) base = base.slice(0, -1)
    let pattern = null
    try { pattern = new RegExp(`^${`${base}${subdirs ? '*' : ''}`.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/(\/?)\*/g, '($1.*)?')}$`) } catch {}
    if (pattern && (pattern.test(lexical) || pattern.test(canonical))) enabled = !disable
  }
  return enabled
}

// OpenClaude Desktop's tools Qwen lists up front (tools.visible) instead of behind tool_search: Qwen defers every MCP tool, and
// its deferred-tools reminder names no session server's tools, so without them it would never learn the Preview, the
// Terminal pane or the Workflow tool exist (and run dev servers in its own shell). The other code_desktop tools stay
// one tool_search away (their names share these tools' words).
// update_plan / wrap_up: the official ccd_turn tools are alwaysLoad (never behind tool search), so they are declared up front too.
export const QWEN_VISIBLE_APP_TOOLS = Object.freeze(['preview_start', 'preview_list', 'screenshot', 'read_page', 'list_terminal_tabs', 'read_terminal', 'run_in_terminal', 'Workflow', 'update_plan', 'wrap_up'])

/**
 * OpenClaude Desktop's tools server instructions as Qwen's model gets them (adapter.appToolsInstructions: Qwen never shows
 * an MCP server's initialize instructions), with where its tools are: the up-front ones (QWEN_VISIBLE_APP_TOOLS) and
 * the rest behind tool_search, which a reopened session may need for all of them until the server has connected.
 */
export function qwenAppToolsInstructions(instructions, name) {
  const prefix = `mcp__${name}__`
  const visible = QWEN_VISIBLE_APP_TOOLS.map((tool) => `${prefix}${tool}`)
  const deferred = APP_TOOL_NAMES.filter((tool) => !QWEN_VISIBLE_APP_TOOLS.includes(tool)).map((tool) => `${prefix}${tool}`)
  return [
    instructions,
    `These tools come from the ${name} MCP server. Declared up front: ${visible.join(', ')}. The others are deferred: look one up with tool_search (for example "select:${prefix}navigate,${prefix}read_console_messages"), then run it through tool_call with its exact name: ${deferred.join(', ')}. If one of the up-front tools is not declared yet, reach it the same way.`,
  ].join('\n\n')
}

export const QWEN_TOOLS_WAIT_MS = 5000

/** See the adapter's awaitSessionTools. true once ready; false when the wait ran out or the status can't tell. */
export async function qwenAwaitSessionTools(host, sessionId, server, { timeout = QWEN_TOOLS_WAIT_MS, interval = 150, settle = 250 } = {}) {
  const deadline = Date.now() + timeout
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  while (Date.now() < deadline && !host.exited) {
    const status = await host.call('qwen/status/session/resources', { sessionId }, Math.max(1000, deadline - Date.now())).catch(() => null)
    const servers = Array.isArray(status?.mcp?.servers) ? status.mcp.servers : null
    // An older Qwen without the status, or a session without the server (switched off): nothing to wait for.
    if (!servers) return false
    const own = servers.find((entry) => entry?.name === server)
    if (!own || own.disabled) return false
    if (own.mcpStatus === 'connected' && !servers.some((entry) => !entry?.disabled && entry?.mcpStatus === 'connecting')) {
      // The tools are declared right after discovery settles (setTools follows the discovery promise).
      await sleep(settle)
      return true
    }
    await sleep(interval)
  }
  return false
}

/**
 * The system-scope settings that give a session OpenClaude Desktop's tools server (`name`) on Qwen, merged into `overlay`
 * (the thread's system settings, which already hold the admin's): `layers` are the other settings files' contents
 * (system defaults, user, project).
 *   permissions.allow  mcp__<name>: Qwen's Plan mode refuses every tool that still needs confirmation, and session MCP
 *                      servers are never trusted, so even list_terminal_tabs failed in Plan. The bridge already lets
 *                      these calls through (the app asks the user itself where it matters); user ask / deny rules
 *                      still win (deny > ask > allow). The list is a union across scopes.
 *   mcp.allowed        a user's or project's allowed list drops every server not on it, session servers included:
 *                      the name joins it (the lists concatenate across scopes). No list anywhere: none is added,
 *                      as one would block every other server.
 *   tools.visible      QWEN_VISIBLE_APP_TOOLS (a union across scopes).
 */
export function qwenAppToolsSettings(overlay, name, layers = []) {
  const out = {}
  const prefix = `mcp__${name}`
  out.permissions = { ...overlay.permissions, allow: mergeUnique(overlay.permissions?.allow, [prefix]) }
  out.tools = { ...overlay.tools, visible: mergeUnique(overlay.tools?.visible, QWEN_VISIBLE_APP_TOOLS.map((tool) => `${prefix}__${tool}`)) }
  const lists = [overlay, ...layers].map((layer) => layer?.mcp?.allowed).filter(Array.isArray)
  if (lists.length && !lists.flat().includes(name)) out.mcp = { ...overlay.mcp, allowed: mergeUnique(overlay.mcp?.allowed, [name]) }
  return out
}

export default {
  id: 'qwen',
  name: 'Qwen Code',
  engine: 'qwen',
  packageNames: ['@qwen-code/qwen-code'],
  binaryNames: ['qwen'],
  helpPattern: /qwen/i,
  acpArgs: ['--acp'],
  clientCapabilities: { fs: { readTextFile: true, writeTextFile: true }, terminal: false },
  home: homeOf,
  agentPaths: (env) => [homeOf(env), env.QWEN_RUNTIME_DIR].filter(Boolean),
  modeIds: { plan: 'plan', default: 'default' },
  compactCommand: '/compress',
  // turn/steer: Qwen takes mid-turn messages through craft/drainMidTurnQueue (onExtension below).
  steerDrain: true,
  // Follow-up suggestions arrive as codeDesktop/promptSuggestion (capabilities.promptSuggestion: the app lists its
  // Prompt suggestions switch).
  promptSuggestions: true,
  // revertFiles 'live': Qwen checkpoints every edit (file checkpointing is forced on over ACP) and its own rewind puts
  // the files back with the conversation (revertSession restoreFiles).
  sessionFeatures: { fork: 'live', revert: 'live', revertFiles: 'live', deleteHistory: true },
  configFile: (env) => userSettingsFile(env),
  /** Customize › Skills › Agents: Qwen's sub-agents (qwenAgents). */
  agents: (ctx, cwd) => qwenAgents(ctx.env, cwd),
  /**
   * Try again after a failed or stopped turn (codeDesktop/turn/continue): Qwen's own recovery, qwen/control/session/
   * continue, which accepts when the last prompt got no answer or left tool calls dangling (Session.ts
   * continueLastTurn); the bridge then sends an empty prompt carrying continueMeta, so Qwen resumes without a
   * second copy of the user's message.
   */
  async continueCheck(ctx, host, sessionId) {
    const result = await host.call('qwen/control/session/continue', { sessionId }, 30000)
    return result?.accepted === true
  },
  continueMeta: Object.freeze({ 'qwen.daemon.continueLastTurn': true }),

  /** Customize › Hooks: Qwen's settings and extension hooks (qwenHooks). */
  hooks: (ctx, cwd) => qwenHooks(ctx.env, cwd),
  /** Settings › Code › Qwen Code settings (QWEN_CORE_SETTING_DEFINITIONS): written to its user settings.json. */
  coreSettings: {
    file: (env) => userSettingsFile(env),
    defs: [
      { key: 'general.outputLanguage', type: 'string', default: null },
      { key: 'general.gitCoAuthor.commit', type: 'boolean', default: true },
      { key: 'general.gitCoAuthor.pr', type: 'boolean', default: true },
      { key: 'context.fileFiltering.respectGitIgnore', type: 'boolean', default: true },
      { key: 'context.fileFiltering.respectQwenIgnore', type: 'boolean', default: true },
      { key: 'disableAllHooks', type: 'boolean', default: false },
      // Qwen's usage statistics (settingsSchema.ts privacy.usageStatisticsEnabled, on by default, shown in its /settings):
      // when on, qwen-logger posts usage events to Alibaba Cloud's RUM endpoint. Read at launch, so a change restarts Qwen.
      { key: 'privacy.usageStatisticsEnabled', type: 'boolean', default: true },
      // Qwen's managed auto-memory (settingsSchema.ts memory.*, both on by default, active over ACP: client.ts
      // runManagedAutoMemoryBackgroundTasks): background agents extract memories after turns and consolidate them, billed
      // to the user's key, and recall injects them into later prompts. Read at launch.
      { key: 'memory.enableManagedAutoMemory', type: 'boolean', default: true },
      { key: 'memory.enableManagedAutoDream', type: 'boolean', default: true },
      // Follow-up prompt suggestions (ui.enableFollowupSuggestions): Qwen's default is on, but each one costs a model call
      // after a turn, so the launch keeps them off unless the user's settings say true (launch below); off is the default here.
      { key: 'ui.enableFollowupSuggestions', type: 'boolean', default: false },
      // Qwen's todo list (tools.todoWrite.enabled, opt-in in Qwen: settingsSchema.ts, config.ts isTodoWriteEnabled): the
      // only tool behind its live plan (turn/plan/updated). On in OpenClaude Desktop unless the user's settings say false
      // (launch below). Read at launch.
      { key: 'tools.todoWrite.enabled', type: 'boolean', default: true },
      // Qwen's output styles (cli /output-style, general.outputStyle; its built-in ones, core/core/output-styles.ts):
      // 'default' is no style. Qwen's own setting, so it applies in its terminal too.
      { key: 'general.outputStyle', type: 'select', options: ['default', 'Concise', 'Proactive', 'Explanatory', 'Learning'], default: 'default' },
      // Qwen's secondary models (settingsSchema.ts; its TUI sets them with /model --fast|--compaction|--vision|--image|
      // --voice and /advisor, which OpenClaude Desktop's own /model shadows): picked from the running model list.
      { key: 'fastModel', type: 'select', options: 'models', default: null },
      { key: 'compactionModel', type: 'select', options: 'models', default: null },
      { key: 'visionModel', type: 'select', options: 'models', default: null },
      { key: 'imageModel', type: 'select', options: 'models', default: null },
      { key: 'voiceModel', type: 'select', options: 'models', default: null },
      { key: 'advisorModel', type: 'select', options: 'models', default: null },
    ],
  },

  // Dynamic workflows is part of the launch (tools.workflowsEnabled): a change restarts Qwen for the thread.
  workflowsInLaunch: true,
  // Qwen never shows the model an MCP server's initialize instructions: OpenClaude Desktop's join --append-system-prompt.
  appToolsInstructions: (instructions, name) => qwenAppToolsInstructions(instructions, name),
  /**
   * Qwen connects a session's MCP servers in the background and declares their tools to the model once every server
   * has settled (config.ts startMcpDiscoveryInBackground → setTools); over ACP nothing waits for that, and a reopened
   * session's first prompt (session/resume answers at once) went out without OpenClaude Desktop's tools. The bridge waits,
   * up to QWEN_TOOLS_WAIT_MS, until the session's own status (qwen/status/session/resources) shows `server` connected
   * and no server still connecting.
   */
  async awaitSessionTools(ctx, host, sessionId, server) {
    return qwenAwaitSessionTools(host, sessionId, server)
  },

  launch(ctx, config) {
    const env = {}
    const args = ['--acp']
    const dir = config.threadDir
    fs.mkdirSync(dir, { recursive: true })
    if (config.systemPrompt) {
      fs.writeFileSync(path.join(dir, 'system.md'), config.systemPrompt)
      env.QWEN_SYSTEM_MD = path.join(dir, 'system.md')
    }
    if (config.appendPrompt) args.push('--append-system-prompt', config.appendPrompt)
    // Folders added to the session join Qwen's workspace (its searches, reads without a prompt, the model's directory
    // context): --include-directories, as /directory add would. The launch key holds them, so a change restarts Qwen.
    for (const dir of (config.writable ?? []).slice(1)) if (typeof dir === 'string' && dir && !dir.includes(',')) args.push('--include-directories', dir)
    const systemFile = ctx.env.QWEN_CODE_SYSTEM_SETTINGS_PATH || DEFAULT_SYSTEM_SETTINGS
    const overlay = readJsonFile(systemFile, {}) ?? {}
    if (config.disabledTools?.length) overlay.tools = { ...overlay.tools, disabled: mergeUnique(overlay.tools?.disabled, config.disabledTools) }
    if (config.disabledServers?.length) overlay.mcp = { ...overlay.mcp, excluded: mergeUnique(overlay.mcp?.excluded, config.disabledServers) }
    const params = config.model ? config.modelParams?.[config.model] ?? config.modelParams?.[String(config.model).replace(/\(.*\)$/, '')] : null
    if (params && (Number.isFinite(params.temperature) || Number.isFinite(params.maxTokens))) {
      overlay.model = { ...overlay.model, generationConfig: { ...overlay.model?.generationConfig, samplingParams: { ...overlay.model?.generationConfig?.samplingParams, ...(Number.isFinite(params.temperature) ? { temperature: params.temperature } : {}), ...(Number.isFinite(params.maxTokens) ? { max_tokens: params.maxTokens } : {}) } } }
    }
    // Follow-up suggestions cost a model call after every turn: off unless the user turned them on explicitly.
    const user = readJsonFile(userSettingsFile(ctx.env), {}) ?? {}
    // Qwen reads its system defaults next to the system settings file unless told where (getSystemDefaultsPath): the
    // admin's file stays the one in force while the system settings path points into the thread folder.
    if (!ctx.env.QWEN_CODE_SYSTEM_DEFAULTS_PATH) env.QWEN_CODE_SYSTEM_DEFAULTS_PATH = path.join(path.dirname(systemFile), 'system-defaults.json')
    if (config.appTools && !(config.disabledServers ?? []).includes(config.appTools)) Object.assign(overlay, qwenAppToolsSettings(overlay, config.appTools, [env.QWEN_CODE_SYSTEM_DEFAULTS_PATH ?? ctx.env.QWEN_CODE_SYSTEM_DEFAULTS_PATH, userSettingsFile(ctx.env), config.cwd ? path.join(config.cwd, '.qwen', 'settings.json') : null].filter(Boolean).map((file) => readJsonFile(file, {}) ?? {})))
    if (user?.ui?.enableFollowupSuggestions !== true && overlay?.ui?.enableFollowupSuggestions === undefined) overlay.ui = { ...overlay.ui, enableFollowupSuggestions: false }
    // The todo list (OpenClaude Desktop's task checklist) is on unless the user's or the project's settings turn it off.
    const project = config.cwd ? readJsonFile(path.join(config.cwd, '.qwen', 'settings.json'), {}) ?? {} : {}
    if (todoWriteOn(user, project) && overlay?.tools?.todoWrite?.enabled === undefined) overlay.tools = { ...overlay.tools, todoWrite: { ...overlay.tools?.todoWrite, enabled: true } }
    // Qwen's own sandbox (tools.sandbox / QWEN_SANDBOX / --sandbox) would relaunch it under its sandbox-exec profile, which
    // allows writes only in the launch folder: Bypass would lose its full access, and added folders and MCP servers would
    // stay confined. OpenClaude Desktop's own Seatbelt profile and permission modes decide instead (the system scope wins over
    // the user's settings, and QWEN_SANDBOX wins over both: sandboxConfig.ts getSandboxCommand).
    overlay.tools = { ...overlay.tools, sandbox: false }
    env.QWEN_SANDBOX = 'false'
    // Dynamic workflows (Settings › Code): Qwen's own Workflow tool registers only with tools.workflowsEnabled, which it
    // honours at system scope (config.ts isWorkflowsEnabled; a workspace value is ignored). Never against the user's own
    // QWEN_CODE_DISABLE_WORKFLOWS. Off (or OpenClaude Desktop's engine chosen) is forced at system scope, over a user's own
    // settings.json (and /review's on-demand workflow, enableReviewWorkflow), and over QWEN_CODE_ENABLE_WORKFLOWS.
    if (config.dynamicWorkflows === true && ctx.env.QWEN_CODE_DISABLE_WORKFLOWS !== '1') overlay.tools = { ...overlay.tools, workflowsEnabled: true }
    else {
      overlay.tools = { ...overlay.tools, workflowsEnabled: false }
      if (ctx.env.QWEN_CODE_ENABLE_WORKFLOWS === '1') env.QWEN_CODE_DISABLE_WORKFLOWS = '1'
    }
    // Qwen's replies, command descriptions and errors follow OpenClaude Desktop's UI language (cli/src/i18n/index.ts reads
    // QWEN_CODE_LANG before LANG and the macOS locale), unless the user chose one (QWEN_CODE_LANG, general.language).
    const lang = qwenLanguage(ctx.env.CODE_DESKTOP_LOCALE)
    if (lang && !ctx.env.QWEN_CODE_LANG && !user?.general?.language) env.QWEN_CODE_LANG = lang
    const settingsPath = path.join(dir, 'qwen-system-settings.json')
    writeJsonFile(settingsPath, overlay)
    env.QWEN_CODE_SYSTEM_SETTINGS_PATH = settingsPath
    return { args, env }
  },

  /** Qwen's own Auto-mode asks the bridge keeps (qwenMustAsk); server.js onPermission asks instead of allowing. */
  mustAsk(ctx, { call, paths, cwd }) {
    // A workflow starts many agents on its own: asked about in every mode but Bypass, as OpenClaude Desktop's engine asks
    // ("Run a dynamic workflow?"), with no standing grant.
    if (isQwenWorkflowCall(call)) return { reason: 'A dynamic workflow runs many agents at once and can use a lot of your usage limit.', always: true }
    const hint = this.classify(call)
    return qwenMustAsk({ call, kind: call?.kind ?? 'other', paths: paths ?? pathsOf(call, cwd ?? null), env: ctx.env, mcp: hint?.type === 'mcp' })
  },

  /** The approval card a call gets in place of the generic command card (a workflow: OpenClaude Desktop's workflow card). */
  approvalTool(call) { return isQwenWorkflowCall(call) ? workflowApprovalTool(call) : null },

  classify(call) {
    let name = call?._meta?.toolName ?? ''
    // A deferred tool run through the tool_call meta-tool is that tool.
    if (name === 'tool_call' && typeof call.rawInput?.name === 'string') name = call.rawInput.name
    const provenance = call?._meta?.provenance
    if (provenance === 'mcp' || name.startsWith('mcp__')) {
      if (call._meta?.toolName === 'tool_call') {
        const match = /^mcp__(.+?)__(.+)$/.exec(name)
        return { type: 'mcp', server: match?.[1] ?? 'mcp', tool: match?.[2] ?? name, arguments: call.rawInput?.arguments ?? {} }
      }
      const match = /^mcp__(.+?)__(.+)$/.exec(name)
      return { type: 'mcp', server: call._meta?.serverId ?? match?.[1] ?? 'mcp', tool: match?.[2] ?? name }
    }
    if (name === 'agent') return { type: 'subagent', label: call.rawInput?.description ?? call.title, prompt: call.rawInput?.prompt }
    if (name === 'web_search') return { type: 'webSearch' }
    if (name === 'list_directory') return { type: 'read' }
    if (name === 'ask_user_question' || name === 'todo_write' || name === 'exit_plan_mode' || name === 'enter_plan_mode') return { type: 'other', tool: name }
    // Qwen's own dynamic workflow: the tool item carries its run (workflowRun), the app's workflow row and card.
    if (name === 'workflow') return { type: 'other', tool: 'workflow' }
    // report_findings (its /review skill): typed findings 'so clients can render a per-finding list' (report-findings.ts).
    if (name === 'report_findings') return { type: 'reviewFindings' }
    return null
  },

  /**
   * Qwen's own dynamic workflows (qwen-workflow.js): Qwen runs them, OpenClaude Desktop shows them. workflowRun folds each
   * update of a `workflow` call into its run (undefined for other tools); workflowTasks / workflowFromTask poll the
   * session's run registry while a run is active; stopWorkflow cancels a run by its id.
   */
  workflowRun(ctx, call, run, { time = Date.now(), done = false, failed = false, output = '' } = {}) {
    if (!isQwenWorkflowCall(call)) return undefined
    return workflowFromCall(run ?? qwenWorkflowRun(call, time), call, { time, done, failed, output })
  },
  async workflowTasks(ctx, host, sessionId) {
    const status = await host.call('qwen/status/session/tasks', { sessionId, includeWorkflows: true }, 10000)
    return (Array.isArray(status?.tasks) ? status.tasks : []).filter((task) => task?.kind === 'workflow')
  },
  workflowFromTask(run, tasks, { time = Date.now() } = {}) {
    const task = tasks.find((entry) => (run.runId && entry.id === run.runId) || (run.callId && entry.toolUseId === run.callId))
    return task ? applyWorkflowTask(run, task, time) : undefined
  },
  workflowInterrupted: (run, time) => workflowInterrupted(run, time),
  workflowLost: (run, time) => workflowLost(run, time),
  async stopWorkflow(ctx, host, sessionId, run) {
    if (!run.runId) return false
    await host.call('qwen/control/session/task/cancel', { sessionId, taskId: run.runId, taskKind: 'workflow' }, 30000)
    return true
  },
  /** Pause (no new agent starts) or resume a live run: Qwen's workflow-action. {changed, status} as Qwen answers. */
  async pauseWorkflow(ctx, host, sessionId, run, paused) {
    if (!run.runId) return { changed: false }
    const result = await host.call('qwen/control/session/task/workflow-action', { sessionId, taskId: run.runId, action: paused ? 'pause' : 'resume' }, 30000)
    return { changed: result?.changed === true, status: typeof result?.status === 'string' ? result.status : null }
  },

  /**
   * Qwen starts turns of its own (a background agent's completion notice): `_qwencode/start_turn`
   * and `_qwencode/end_turn` open and close them on the thread like any turn.
   */
  onExtension(method, params, api) {
    // Between tool batches Qwen pulls the messages the user sent while it works (Session.ts #drainMidTurnInput):
    // always answered, an empty list included, so Qwen keeps asking (an error marks the drain unavailable for good).
    if (method.replace(/^_/, '') === 'craft/drainMidTurnQueue') return { messages: api.drainSteer?.() ?? [] }
    if (method === '_qwencode/start_turn') { api.startAgentTurn(params?.sessionId); return null }
    if (method === '_qwencode/end_turn') { api.endAgentTurn(params?.sessionId); return null }
    // A pull request Qwen opened for this session (Session.ts: after its shell runs `gh pr create`), for the PR badge.
    if (method.replace(/^_/, '') === 'qwen/notify/session/pr-binding') {
      if (params?.pr && typeof params.pr === 'object') api.prBinding?.({ number: Number(params.pr.number), url: params.pr.url })
      return null
    }
    // Qwen stopped writing the session's chat record after a write failure (Session.ts recording-degraded, reason
    // write_failed; its TUI says so too): later messages won't come back on resume, fork or rewind.
    if (method.replace(/^_/, '') === 'qwen/notify/session/recording-degraded') {
      api.warn?.(QWEN_RECORDING_DEGRADED)
      return null
    }
    // A follow-up prompt suggestion (only generated when the user turned them on).
    if (method.replace(/^_/, '') === 'qwen/notify/session/prompt-suggestion') {
      if (typeof params?.suggestion === 'string' && params.suggestion.trim()) api.promptSuggestion?.(params.suggestion.trim())
      return null
    }
    return undefined
  },

  /** run_shell_command reports "Command: … Output: … Error: … Exit Code: n": the card shows the output and code. */
  commandResult(call) {
    const text = (Array.isArray(call?.content) ? call.content : []).map((block) => block?.content?.text ?? block?.text ?? '').join('\n')
    const match = /Output:\s?([\s\S]*?)\nError:\s?([\s\S]*?)\nExit Code:\s*(-?\d+|\(none\))/.exec(text)
    if (!match) return null
    const error = match[2].trim() === '(none)' ? '' : match[2]
    const output = match[1].trim() === '(empty)' ? '' : match[1]
    return { output: `${output}${error ? `${output ? '\n' : ''}${error}` : ''}`, exitCode: /^-?\d+$/.test(match[3]) ? Number(match[3]) : null }
  },

  /**
   * Usage frames (empty text + _meta.usage) feed the ledger, never the transcript; sub-agent updates go to their child.
   * A cron or /loop run (Session.ts #executeCronPrompt) starts with its prompt echoed as a user_message_chunk
   * (_meta.source 'cron' | 'loop') and sends no start/end notice: it opens an agent turn the bridge closes once Qwen
   * goes quiet. The jobs cron_create schedules are tracked on the thread (keepLoaded).
   */
  filterUpdate(update, thread) {
    const meta = update?._meta ?? {}
    // /goal: every goal change is an empty agent_message_chunk carrying _meta.goalState {goal, activity} (and
    // goalStatus for a verdict; MessageEmitter.ts). It becomes Codex's thread/goal/updated|cleared (server.js).
    if (update?.sessionUpdate === 'agent_message_chunk' && !update.content?.text && meta.goalState && typeof meta.goalState === 'object') {
      return { drop: true, goal: goalOf(meta.goalState.goal) }
    }
    if (update?.sessionUpdate === 'user_message_chunk' && (meta.source === 'cron' || meta.source === 'loop')) {
      const text = typeof update.content?.text === 'string' ? update.content.text : ''
      if (thread) trackCronRun(thread)
      return { drop: true, agentTurn: { text, idleClose: true } }
    }
    if (thread && (update?.sessionUpdate === 'tool_call' || update?.sessionUpdate === 'tool_call_update')) trackCronCall(thread, update)
    if (update.sessionUpdate === 'agent_message_chunk' && meta.usage && !update.content?.text) {
      return { drop: true, usage: { inputTokens: meta.usage.inputTokens, outputTokens: meta.usage.outputTokens, totalTokens: meta.usage.totalTokens, reasoningOutputTokens: meta.usage.thoughtTokens, cachedInputTokens: meta.usage.cachedReadTokens } }
    }
    if (meta.parentToolCallId && meta.subagentProgress !== true && update.sessionUpdate !== 'tool_call_update' || (meta.parentToolCallId && update.sessionUpdate === 'tool_call_update' && update.toolCallId !== meta.parentToolCallId)) {
      return { update, child: { parentToolCallId: meta.parentToolCallId, label: meta.subagentType ?? null } }
    }
    if (meta.subagentProgress === true) return { drop: true }
    return { update }
  },

  /**
   * The goal strip's Pause / Resume / Clear and /goal from the app (Codex thread/goal/set|clear): Qwen's
   * qwen/control/session/goal/control {request: {action, expectedGoalId, expectedRevision}} and …/goal/clear, which
   * guard against a goal that changed meanwhile with the id and revision from the last goalState.
   */
  async goalSet(thread, host, { objective, status }) {
    const goal = thread.goal?.codeDesktop
    let request
    if (typeof objective === 'string' && objective.trim()) request = goal ? { action: 'replace', objective: objective.trim(), expectedGoalId: goal.goalId, expectedRevision: goal.revision } : { action: 'create', objective: objective.trim() }
    else if (status === 'paused' || status === 'active') {
      if (!goal) throw new Error('There is no goal to change.')
      request = { action: status === 'paused' ? 'pause' : 'resume', expectedGoalId: goal.goalId, expectedRevision: goal.revision }
    } else throw new Error('Unsupported goal change.')
    return host.call('qwen/control/session/goal/control', { sessionId: thread.id, request }, 30000)
  },
  /**
   * OpenClaude Desktop's /review on Qwen runs Qwen's own bundled review skill (its multi-agent pipeline) instead of a generic
   * prompt: '/review' for the uncommitted changes, '/review <instructions>' for custom ones. A branch or commit target
   * keeps the generic prompt (null).
   */
  reviewCommand(target) {
    if (target?.type === 'uncommittedChanges') return '/review'
    if (target?.type === 'custom' && typeof target.instructions === 'string' && target.instructions.trim()) return `/review ${target.instructions.trim()}`
    return null
  },
  async goalClear(thread, host) {
    return host.call('qwen/control/session/goal/clear', { sessionId: thread.id }, 30000)
  },

  /** ask_user_question: questions in toolCall._meta.qwenQuestions; answers ride as `answers` on the response. */
  questions(params) {
    const list = params?.toolCall?._meta?.qwenQuestions
    if (!Array.isArray(list) || !list.length) return null
    return {
      questions: list.map((question, index) => ({
        id: String(question.id ?? question.header ?? `q${index}`),
        header: String(question.header ?? ''),
        question: String(question.question ?? question.text ?? ''),
        options: Array.isArray(question.options) ? question.options.map((option) => ({ label: String(option.label ?? option), description: String(option.description ?? '') })) : null,
        multiSelect: question.multiSelect === true,
      })),
      answer: (questions, response) => {
        const answers = {}
        for (const question of questions) {
          const values = response?.answers?.[question.id]?.answers
          if (Array.isArray(values) && values.length) answers[question.header || question.question || question.id] = values.join(', ')
        }
        const submit = params.options.find((option) => option.optionId === 'proceed_once') ?? params.options.find((option) => option.kind === 'allow_once')
        return { outcome: { outcome: 'selected', optionId: submit?.optionId ?? 'proceed_once' }, answers }
      },
    }
  },

  /**
   * A remote server Qwen signed in to (`/mcp auth <name>`): its stored OAuth token from <home>/mcp-oauth-tokens.json
   * (core oauth-token-storage.ts, the same list Gemini CLI keeps). An expired one is left to Qwen to refresh; tokens in
   * Qwen's encrypted store are not readable here and probe as signed out.
   */
  mcpAuth(ctx, server) {
    const list = readJsonFile(path.join(homeOf(ctx.env), 'mcp-oauth-tokens.json'), null)
    const entry = Array.isArray(list) ? list.find((candidate) => candidate?.serverName === server.name) : null
    const token = entry?.token
    if (typeof token?.accessToken !== 'string' || !token.accessToken) return null
    if (Number.isFinite(token.expiresAt) && token.expiresAt < Date.now()) return null
    return { headers: { Authorization: `${!token.tokenType || /^bearer$/i.test(token.tokenType) ? 'Bearer' : token.tokenType} ${token.accessToken}` } }
  },

  /** How to sign in to a remote server that asks for it: Qwen's own /mcp auth. */
  mcpSignInHint: (server) => `Sign in to ${server.name} in Qwen Code: run /mcp auth ${server.name} in a qwen terminal, then check again.`,

  /**
   * A remote connector's OAuth sign-in, run by Qwen itself on the utility host (acpAgent.ts workspaceMcpManage
   * 'authenticate': its MCPOAuthProvider with its own callback; the tokens land in its token storage, which mcpAuth
   * reads). Answers the page to open; mcpLoginStatus follows it (qwen/status/workspace/mcp authenticationState).
   */
  async mcpLogin(ctx, server) {
    const host = await ctx.utility()
    const result = await host.call('qwen/control/workspace/mcp/manage', { serverName: server.name, action: 'authenticate' }, 90000)
    if (typeof result?.authUrl !== 'string' || !/^https?:\/\//.test(result.authUrl)) throw new Error(`Qwen Code didn’t return a sign-in page for ${server.name}.`)
    return { authorizationUrl: result.authUrl }
  },
  async mcpLoginStatus(ctx, server) {
    const host = await ctx.utility()
    const status = await host.call('qwen/status/workspace/mcp', {}, 30000)
    const list = Array.isArray(status?.servers) ? status.servers : status?.servers && typeof status.servers === 'object' ? Object.values(status.servers) : []
    const entry = list.find((item) => item?.name === server.name)
    if (entry?.authenticationState) return { state: entry.authenticationState, error: entry.authenticationError ?? null }
    return this.mcpAuth(ctx, server) ? { state: 'succeeded', error: null } : null
  },
  /** Sign out of a connector: Qwen deletes its stored tokens and disconnects it ('clear-auth'). */
  async mcpLogout(ctx, server) {
    const host = await ctx.utility()
    await host.call('qwen/control/workspace/mcp/manage', { serverName: server.name, action: 'clear-auth' }, 30000)
  },

  /**
   * Jobs scheduled in this session's process (cron_create, /loop) and its background work (background sub-agents, which
   * Qwen's own daemon also keeps a session for): leaving the session must not stop them.
   */
  keepLoaded(thread) {
    return (thread.qwenCron?.jobs.size ?? 0) > 0 || this.backgroundProcesses(thread).length > 0
  },

  /** The session's background tasks, read again (server.js refreshBackground: after a turn, on list, before a restart). */
  async refreshBackground(ctx, thread, host) {
    if (!host) { thread.qwenTasks = []; return }
    const status = await host.call('qwen/status/session/tasks', { sessionId: thread.id }, 10000)
    // A task just stopped stays 'running' until its process has exited: not listed again meanwhile (15 s at most).
    const stopped = thread.qwenStopped ?? new Map()
    for (const [id, at] of stopped) if (Date.now() - at > 15000) stopped.delete(id)
    thread.qwenTasks = qwenBackgroundTasks(status?.tasks).filter((task) => !stopped.has(task.id))
  },

  /** Background tasks: Qwen's running background shells, monitors and sub-agents (they live in the session's process). */
  backgroundProcesses(thread) {
    if (!thread?.host || thread.host.exited) return []
    return (thread.qwenTasks ?? []).map((task) => qwenBackgroundRow(task, thread.cwd))
  },

  /** Stop one: qwen/control/session/task/cancel {sessionId, taskId, taskKind}. */
  async stopBackground(thread, processId) {
    const match = /^qwen-task:(shell|monitor|agent):(.+)$/.exec(String(processId ?? ''))
    if (!match || !thread?.host || thread.host.exited) return false
    const result = await thread.host.call('qwen/control/session/task/cancel', { sessionId: thread.id, taskId: match[2], taskKind: match[1] }, 30000)
    if (result?.cancelled === true) {
      thread.qwenTasks = (thread.qwenTasks ?? []).filter((task) => task.id !== match[2])
      ;(thread.qwenStopped ??= new Map()).set(match[2], Date.now())
    }
    return result?.cancelled === true
  },

  /** exit_plan_mode's review: approve continues in default (OpenClaude Desktop applies its own after-plan mode). */
  planExit(params) {
    const call = params?.toolCall ?? {}
    if (call._meta?.toolName !== 'exit_plan_mode' && call.kind !== 'switch_mode') return null
    const plan = typeof call.rawInput?.plan === 'string' ? call.rawInput.plan : null
    return { plan, approveOption: 'proceed_once', rejectOption: 'cancel' }
  },

  /**
   * Every Qwen session on this Mac, wherever it was started (the Qwen CLI in any folder, or OpenClaude Desktop): Qwen's
   * session/list answers for one project folder at a time, so the bridge asks once per folder found on disk
   * (qwenProjectCwds), then once for the utility folder itself.
   */
  async listSessions(ctx) {
    const host = await ctx.utility()
    const rows = []
    const seen = new Set()
    const scopes = [...qwenProjectCwds(ctx.env), null]
    for (const cwd of scopes) {
      let cursor
      for (let page = 0; page < (cwd ? 5 : 20); page++) {
        let result
        try {
          result = await host.call('session/list', { ...(cwd ? { cwd } : {}), ...(cursor ? { cursor } : {}), _meta: { size: 200 } }, 30000)
        } catch (error) {
          if (!cwd) throw error
          break
        }
        for (const session of result?.sessions ?? []) {
          if (!session?.sessionId || seen.has(session.sessionId)) continue
          seen.add(session.sessionId)
          rows.push({ sessionId: session.sessionId, cwd: session.cwd ?? cwd, title: session.title ?? null, preview: session._meta?.preview ?? null, createdAt: Date.parse(session._meta?.createdAt ?? session._meta?.startTime) || null, updatedAt: Date.parse(session.updatedAt) || null })
        }
        cursor = result?.nextCursor
        if (!cursor) break
      }
    }
    return rows
  },

  async deleteSession(ctx, sessionId, cwd) {
    const host = await ctx.utility()
    const result = await host.call('deleteSession', { sessionId, cwd }, 30000)
    return result?.success !== false
  },

  async renameSession(ctx, sessionId, title, host) {
    await (host ?? await ctx.utility()).call('renameSession', { sessionId, title }, 30000)
  },

  /** qwen/control/session/branch on the thread's own process (the source must be loaded there). */
  async forkSession(ctx, sessionId, host) {
    const result = await host.call('qwen/control/session/branch', { sessionId }, 60000)
    return result?.newSessionId
  },

  /**
   * /cd: qwen/control/session/cd {sessionId, path} moves the live session to another folder (its working directory,
   * memory and connectors; the session file stays in the folder it began in, so later loads name that one and move
   * again). Answers {previousCwd, newCwd, warnings}.
   */
  async changeDirectory(ctx, host, sessionId, cwd) {
    const result = await host.call('qwen/control/session/cd', { sessionId, path: cwd }, 60000)
    return { cwd: typeof result?.newCwd === 'string' && result.newCwd ? result.newCwd : cwd, warnings: Array.isArray(result?.warnings) ? result.warnings : [] }
  },

  /**
   * Rewind (qwen/control/session/rewind): the conversation goes back to `keepTurns` user turns. With restoreFiles the
   * files go back too: the checkpoint taken when that turn began (qwen/status/session/rewind_snapshots, by turnIndex)
   * names the promptId Qwen's file history rewinds to, and Qwen answers which files changed or failed. Without one (no
   * edit since, or a compacted turn) only the conversation rewinds. A fork's rewind never touches files.
   */
  async revertSession(ctx, sessionId, keepTurns, host, turnText, { restoreFiles = false } = {}) {
    let promptId = null
    if (restoreFiles) {
      const status = await host.call('qwen/status/session/rewind_snapshots', { sessionId }, 30000).catch(() => null)
      const snapshot = (Array.isArray(status?.snapshots) ? status.snapshots : []).find((entry) => entry?.turnIndex === keepTurns && typeof entry.promptId === 'string')
      promptId = snapshot?.promptId ?? null
    }
    const result = await host.call('qwen/control/session/rewind', { sessionId, targetTurnIndex: keepTurns, rewindFiles: Boolean(promptId), ...(promptId ? { promptId } : {}) }, 60000)
    if (!restoreFiles) return true
    const list = (value) => (Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : [])
    return { filesChanged: list(result?.filesChanged), filesFailed: list(result?.filesFailed) }
  },

  /** qwen/control/session/btw: Qwen's own side question over the session's context. */
  async sideQuestion(ctx, sessionId, question, host) {
    const result = await host.call('qwen/control/session/btw', { sessionId, question }, 180000)
    return typeof result?.answer === 'string' ? result.answer : ''
  },

  async contextUsage(ctx, sessionId, host) {
    if (!host) return null
    const result = await host.call('qwen/status/session/context_usage', { sessionId }, 15000).catch(() => null)
    const usage = result?.usage
    return usage ? { used: usage.totalTokens, size: usage.contextWindowSize } : null
  },

  /**
   * Settings › Account's API key for Qwen Code: Qwen's own provider setup (ACP qwen/providers/connect, what its /auth
   * runs), which writes the provider, key env and model into ~/.qwen/settings.json. template is '<providerId>' or
   * '<providerId>:<region id>' (a provider whose baseUrl is a list of regions: Coding Plan aliyun/alibabacloud, …);
   * the provider's default models are used. The custom provider needs a base URL and model ids, so it isn't offered.
   */
  async connectProvider(ctx, { template, apiKey }) {
    const [providerId, regionId] = String(template ?? '').split(':')
    if (!providerId || providerId === 'custom-openai-compatible') throw new Error('Choose a Qwen Code provider.')
    const host = await ctx.utility()
    const list = await host.call('qwen/providers/list', {}, 30000)
    const provider = (Array.isArray(list?.providers) ? list.providers : []).find((entry) => entry?.id === providerId)
    if (!provider) throw new Error(`Qwen Code has no provider named ${providerId}.`)
    const options = Array.isArray(provider.baseUrl) ? provider.baseUrl : null
    const baseUrl = options ? (options.find((option) => option?.id === regionId) ?? options[0])?.url : typeof provider.baseUrl === 'string' ? provider.baseUrl : undefined
    const before = readJsonFile(userSettingsFile(ctx.env), {}) ?? {}
    const result = await host.call('qwen/providers/connect', { providerId, apiKey, ...(baseUrl ? { baseUrl } : {}), scope: 'user' }, 60000)
    if (result?.success === false) throw new Error(`Qwen Code couldn’t set up ${provider.label ?? providerId}.`)
    // Which env keys this connect wrote into settings.json (applyProviderInstallPlan: env.<KEY>, plus the provider's
    // models naming that envKey): sign-out removes exactly these, never keys the user set up themselves.
    const after = readJsonFile(userSettingsFile(ctx.env), {}) ?? {}
    const written = Object.keys(after.env ?? {}).filter((key) => after.env[key] !== (before.env ?? {})[key])
    if (written.length) {
      const file = qwenKeysFile(ctx.env)
      const known = readJsonFile(file, {}) ?? {}
      writeJsonFile(file, { envKeys: [...new Set([...(Array.isArray(known.envKeys) ? known.envKeys : []), ...written])] })
    }
    return result
  },

  account(ctx) {
    const env = ctx.env
    const settings = readJsonFile(userSettingsFile(env), {}) ?? {}
    const selected = settings?.security?.auth?.selectedType ?? null
    const oauth = fs.existsSync(path.join(homeOf(env), 'oauth_creds.json'))
    // Qwen OAuth's free tier ended on 2026-04-15 (Qwen Code refuses the method): a provider must be chosen.
    if (selected === 'qwen-oauth') return { kind: null, label: 'Qwen account', method: null, perToken: true, hint: oauth ? 'The Qwen OAuth free tier has ended. Choose Coding Plan, OpenRouter or another provider with /auth in Qwen Code, or set OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL.' : 'Choose a provider with /auth in Qwen Code, or set OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL.' }
    const keyed = { openai: 'OPENAI_API_KEY', 'openai-responses': 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', 'vertex-ai': 'GOOGLE_API_KEY' }
    const providers = settings?.modelProviders && typeof settings.modelProviders === 'object' ? Object.keys(settings.modelProviders) : []
    const envKey = Object.values(keyed).find((name) => env[name])
    if (selected || envKey || providers.length) {
      const label = selected === 'anthropic' ? 'Anthropic-compatible API' : selected === 'gemini' ? 'Gemini API' : 'OpenAI-compatible API'
      return { kind: 'apiKey', label, detail: envKey ? `From ${envKey}` : 'Configured in Qwen Code settings', method: selected ?? 'openai', perToken: true }
    }
    return { kind: null, label: 'API key', method: null, perToken: true, hint: 'Choose a provider and enter its API key below, or set OPENAI_API_KEY, OPENAI_BASE_URL and OPENAI_MODEL.' }
  },

  login: null,
  /**
   * Sign out: the API keys OpenClaude Desktop saved through qwen/providers/connect (qwenKeysFile) leave settings.json, with
   * the provider models that read them; keys and providers the user configured themselves stay.
   */
  logout(ctx) {
    const file = qwenKeysFile(ctx.env)
    const keys = new Set(Array.isArray(readJsonFile(file, {})?.envKeys) ? readJsonFile(file, {}).envKeys : [])
    if (!keys.size) throw new Error('OpenClaude Desktop saved no Qwen Code key to remove. Keys set up in Qwen Code itself are removed with /auth there.')
    const settingsFile = userSettingsFile(ctx.env)
    const settings = readJsonFile(settingsFile, {}) ?? {}
    if (settings.env && typeof settings.env === 'object') for (const key of keys) delete settings.env[key]
    if (settings.modelProviders && typeof settings.modelProviders === 'object') {
      for (const [type, list] of Object.entries(settings.modelProviders)) {
        if (!Array.isArray(list)) continue
        const kept = list.filter((model) => !keys.has(model?.envKey))
        if (kept.length) settings.modelProviders[type] = kept
        else delete settings.modelProviders[type]
      }
    }
    writeJsonFile(settingsFile, settings)
    try { fs.rmSync(file, { force: true }) } catch {}
  },

  mcpServers(ctx, cwd) {
    const servers = new Map()
    const add = (record, source, extra) => {
      for (const [name, value] of Object.entries(record?.mcpServers ?? {})) {
        // Qwen (like the Gemini CLI it forks) reads `url` as an SSE endpoint, `httpUrl` as streamable HTTP.
        const server = normalizeMcpServer(name, value, source, extra, { urlTransport: 'sse' })
        if (server) servers.set(name, server)
      }
    }
    add(readJsonFile(userSettingsFile(ctx.env), {}), 'user')
    if (cwd) add(readJsonFile(path.join(cwd, '.qwen', 'settings.json'), {}), 'project')
    for (const extension of this.extensions(ctx, cwd)) if (extension.enabled) add(extension.manifest, 'extension', { extension: extension.name })
    const excluded = new Set(readJsonFile(userSettingsFile(ctx.env), {})?.mcp?.excluded ?? [])
    for (const server of servers.values()) if (excluded.has(server.name)) server.disabled = true
    return [...servers.values()]
  },

  writeMcpServer(ctx, name, value) {
    const file = userSettingsFile(ctx.env)
    const settings = readJsonFile(file, {}) ?? {}
    settings.mcpServers = { ...settings.mcpServers }
    if (value === null) delete settings.mcpServers[name]
    else settings.mcpServers[name] = value.url ? { httpUrl: value.url, ...(value.http_headers ? { headers: value.http_headers } : {}) } : { command: value.command, ...(value.args ? { args: value.args } : {}), ...(value.env ? { env: value.env } : {}) }
    writeJsonFile(file, settings)
  },

  /**
   * Project, user and extension skills, and the ones Qwen ships (<package>/bundled, scope 'system'). A skill Qwen hides
   * (settings skills.disabled / defaultDisabled / disabledLevels, qwenSkillPolicy) is off; SKILL.md's
   * disable-model-invocation only says whether the model may run it.
   */
  skills(ctx, cwd) {
    const home = homeOf(ctx.env)
    const roots = []
    for (const dir of cwd ? projectDirs(cwd) : []) roots.push({ path: path.join(dir, '.qwen', 'skills'), scope: 'repo' }, { path: path.join(dir, '.agents', 'skills'), scope: 'repo' })
    roots.push({ path: path.join(home, 'skills'), scope: 'user' }, { path: path.join(ctx.env.HOME || os.homedir(), '.agents', 'skills'), scope: 'user' })
    for (const extension of this.extensions(ctx, cwd)) if (extension.enabled) roots.push({ path: path.join(extension.dir, 'skills'), scope: 'user', pluginId: extension.name })
    const bundled = qwenBundledSkillsDir(ctx.program)
    if (bundled) roots.push({ path: bundled, scope: 'system' })
    const policy = qwenSkillPolicy(ctx.env, cwd)
    return scanSkills(roots).map((skill) => {
      const hidden = qwenSkillHidden(policy, skill)
      return hidden
        ? { ...skill, enabled: false, userInvocable: false, modelInvocable: false, disabledReason: hidden }
        : { ...skill, enabled: true }
    })
  },

  skillPrompt: (skill) => `/${qwenSkillCommand(skill)}`,
  // The command each skill is also listed as (an extension's '<extension>:<skill>'): one slash-menu row per skill.
  skillCommandName: (skill) => qwenSkillCommand(skill),

  /**
   * skills/config/write: Qwen's own switch, the user settings' skills.disabled (what its /skills picker and the
   * `skills.disabled` docs use): an extension skill as '<extension>:<skill>', others by name. SKILL.md is left alone.
   * A skill another settings file hides (system, the project's, a hidden level) cannot be turned on from here.
   */
  setSkillEnabled(ctx, name, enabled, skill) {
    if (!skill?.path || path.basename(skill.path) !== 'SKILL.md') throw new Error('Unknown skill.')
    const file = userSettingsFile(ctx.env)
    const settings = readJsonFile(file, {}) ?? {}
    const spellings = qwenSkillSpellings(skill)
    const own = Array.isArray(settings.skills?.disabled) ? settings.skills.disabled.filter((entry) => typeof entry === 'string') : []
    const kept = own.filter((entry) => !spellings.includes(entry.trim().toLowerCase()))
    if (enabled) {
      const policy = qwenSkillPolicy(ctx.env, skill.cwd ?? null, { withoutUser: true })
      const still = qwenSkillHidden(policy, skill)
      if (still) throw new Error(still)
    }
    const next = enabled ? kept : [...kept, qwenRegisteredSkillName(skill)]
    if (JSON.stringify(next) === JSON.stringify(own)) return
    settings.skills = { ...settings.skills, disabled: next }
    if (!next.length) delete settings.skills.disabled
    writeJsonFile(file, settings)
  },

  /**
   * What `@` can name besides files (cli/src/utils/extension-mention.ts `@ext:<name>`, mcp-server-mention.ts
   * `@mcp:<server>`): Qwen's prompt path injects that extension's context or that connector's tools summary into the turn
   * (acp Session #resolveExtensionMentionParts / #resolveMcpServerMentionParts). Enabled ones only.
   */
  mentionTargets(ctx, cwd) {
    const servers = this.mcpServers(ctx, cwd).filter((server) => !server.disabled).map((server) => ({ kind: 'mcp', name: server.name, text: `@mcp:${server.name}`, description: server.extension ? `${server.extension}` : '' }))
    const extensions = this.extensions(ctx, cwd).filter((extension) => extension.enabled).map((extension) => ({ kind: 'extension', name: extension.name, text: `@ext:${extension.name}`, description: extension.description ?? '' }))
    return [...servers, ...extensions]
  },

  /** Installed extensions, each on or off for `cwd` (else for the home folder, what a user-scope switch decides). */
  extensions(ctx, cwd = null) {
    const root = path.join(homeOf(ctx.env), 'extensions')
    const enablement = readJsonFile(path.join(root, 'extension-enablement.json'), {}) ?? {}
    const where = cwd || ctx.env.HOME || os.homedir()
    let entries = []
    try { entries = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()) } catch { return [] }
    return entries.map((entry) => {
      const dir = path.join(root, entry.name)
      const manifest = readJsonFile(path.join(dir, 'qwen-extension.json'), null) ?? readJsonFile(path.join(dir, 'gemini-extension.json'), null)
      if (!manifest) return null
      const enabled = qwenExtensionEnabledAt(enablement?.[manifest.name ?? entry.name]?.overrides, where)
      return { name: manifest.name ?? entry.name, version: manifest.version ?? null, description: manifest.description ?? '', dir, manifest, enabled }
    }).filter(Boolean)
  },

  plugins(ctx, cwd = null) {
    return this.extensions(ctx, cwd).map((extension) => pluginSummary({ id: extension.name, name: extension.name, version: extension.version, description: extension.description, enabled: extension.enabled, path: extension.dir, extra: { kind: 'qwen-extension', mcpServers: Object.keys(extension.manifest?.mcpServers ?? {}) } }))
  },

  // codeDesktop/plugin/update: `qwen extensions update <name>` (cli/src/commands/extensions/update.ts).
  pluginUpdate: true,

  /**
   * Customize › Skills › Add from URL / Delete: Qwen's own managed skills (acpAgent.ts qwen/skills/install downloads a
   * SKILL.md into ~/.qwen/skills/<slug>; qwen/skills/delete removes one), then a skill refresh.
   */
  async installSkill(ctx, { url, slug }) {
    const host = await ctx.utility()
    const result = await host.call('qwen/skills/install', { skill: { slug, sourceUrl: url, scope: 'global' } }, 60000)
    try { await host.call('qwen/control/workspace/skills/refresh', {}, 15000) } catch {}
    return result
  },
  async deleteSkill(ctx, { slug }) {
    const host = await ctx.utility()
    const result = await host.call('qwen/skills/delete', { skill: { slug, scope: 'global' } }, 30000)
    try { await host.call('qwen/control/workspace/skills/refresh', {}, 15000) } catch {}
    return result
  },
  async pluginCommand(ctx, op, value) {
    const args = op === 'install' ? ['extensions', 'install', value, '--consent'] : op === 'remove' ? ['extensions', 'uninstall', value] : op === 'update' ? ['extensions', 'update', value] : ['extensions', op === 'enable' ? 'enable' : 'disable', value]
    const { command, args: argv } = ctx.commandLine(args)
    // The prompt an install stopped on ('? Probe API key'), without the terminal escape codes. With input closed Qwen
    // exits 0 having installed nothing (probe in a temp HOME), so a prompt in the output is a failure either way.
    const prompted = (result) => {
      if (op !== 'install') return null
      const output = `${result?.stdout ?? ''}\n${result?.stderr ?? ''}`.replace(/\x1b(?:\[[0-9;?]*[A-Za-z]|[78])/g, '')
      const asked = /^\s*\?\s+([^\n›]+)/m.exec(output)?.[1]?.trim()
      return asked ? Object.assign(new Error(`This extension asks for "${asked}" while it installs, which OpenClaude Desktop can’t answer yet. Install it once in a terminal with: qwen extensions install ${value}`), { stdout: '', stderr: '' }) : null
    }
    let result
    try {
      result = await run(command, argv, { env: ctx.env, cwd: ctx.env.HOME || os.homedir() })
    } catch (error) {
      throw prompted(error) ?? error
    }
    const failed = prompted(result)
    if (failed) throw failed
    return result
  },

  /** Sessions run in Qwen's own terminal UI (and every one before OpenClaude Desktop) for the Usage page: readQwenUsageRecords. */
  usageRecords: (ctx, cursor) => readQwenUsageRecords(path.join(homeOf(ctx.env), 'usage_record.jsonl'), cursor),

  // Qwen registers some tools only when a setting opts in (config.ts): each says which, so the Tools menu shows it as off.
  builtinTools: (ctx) => {
    const user = ctx ? readJsonFile(userSettingsFile(ctx.env), {}) ?? {} : null
    return BUILTIN_TOOLS.map(([name, description]) => {
      const disabledReason = user ? qwenOptInReason(name, user, ctx.env) : null
      return disabledReason ? { name, description, disabledReason } : { name, description }
    })
  },
  fallbackModels: (ctx) => {
    const settings = readJsonFile(userSettingsFile(ctx.env), {}) ?? {}
    const models = []
    for (const [authType, list] of Object.entries(settings?.modelProviders ?? {})) for (const entry of Array.isArray(list) ? list : []) if (entry?.id) models.push({ id: `${entry.id}(${authType})`, name: entry.name ?? entry.id })
    const envModel = ctx.env.OPENAI_MODEL || ctx.env.QWEN_MODEL
    if (envModel) models.push({ id: `${envModel}(openai)`, name: envModel })
    if (settings?.model?.name && !models.length) models.push({ id: settings.model.name, name: settings.model.name })
    return models
  },
  previewEnv: (file) => ({ QWEN_WRITE_SYSTEM_MD: file }),
}
