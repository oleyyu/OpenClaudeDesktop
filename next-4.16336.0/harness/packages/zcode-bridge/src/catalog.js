/**
 * Skills, MCP servers, plugins and hooks: ZCode's own configuration, shown and edited in OpenClaude Desktop's shapes.
 *
 *   skills/list            skills/referenceCatalog (user ~/.zcode/skills, ~/.agents/skills, project .zcode/skills,
 *                          .agents/skills, plugin skills); enabled per ~/.zcode/cli/config.json `skills[<path>]`
 *   skills/config/write    `skills[<SKILL.md path>] = {enable}` in that config (ZCode's own per-skill switch)
 *   config/read            `mcp.servers` of ~/.zcode/cli/config.json as Codex `mcp_servers`
 *   config/batchWrite      `mcp_servers.<name>` upserts/removals → `mcp.servers` (stdio and http)
 *   mcpServerStatus/list   mcp/list statuses (connected / failed / OAuth pending) + each server's tools
 *   plugin/installed, read plugins/list
 *   hooks/list             `hooks.events` of the config, as Codex HooksListResponse
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export function readConfig(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) ?? {} } catch { return {} }
}

export function writeConfig(file, config) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(config, null, 2))
  fs.renameSync(temp, file)
}

// ------------------------------------------------------------------ skills

export function skillsListEntry(cwd, catalog, config) {
  const overrides = config?.skills && typeof config.skills === 'object' ? config.skills : {}
  const skills = (catalog?.skills ?? []).map((skill) => {
    const override = overrides[skill.path]
    const enabled = override && typeof override.enable === 'boolean' ? override.enable : skill.enabled !== false
    return {
      name: skill.pluginName ? `${skill.pluginName}:${skill.name}` : skill.name, description: skill.description ?? '', shortDescription: skill.description ?? '', path: skill.path,
      scope: skill.scope === 'workspace' || skill.scope === 'project' ? 'repo' : skill.scope === 'plugin' || skill.scope === 'builtin' ? 'system' : 'user',
      enabled, userInvocable: true, modelInvocable: true, pluginId: skill.pluginName ?? null,
    }
  })
  // ZCode leaves switched-off skills out of its catalog; keep them listed (off) so they can be switched back on.
  const listed = new Set(skills.map((skill) => skill.path))
  for (const [file, override] of Object.entries(overrides)) {
    if (override?.enable !== false || listed.has(file) || !fs.existsSync(file)) continue
    const meta = frontmatter(file)
    skills.push({ name: meta.name ?? path.basename(path.dirname(file)), description: meta.description ?? '', shortDescription: meta.description ?? '', path: file, scope: file.startsWith(cwd) ? 'repo' : 'user', enabled: false, userInvocable: true, modelInvocable: true, pluginId: null })
  }
  return { cwd, skills, errors: [] }
}

/**
 * ZCode's custom command files (adapters/src/commands/roots.ts): <home>/.zcode/commands and <home>/.agents/commands,
 * then the same two in every folder from the session folder up to its git root; a file's name is its path under the
 * root without .md, with ':' between folders. The first file of a name wins. [{name, path, scope}].
 */
export function customCommandFiles(cwd, home) {
  const bases = [[home, 'user']]
  if (typeof cwd === 'string' && path.isAbsolute(cwd)) {
    const dirs = []
    let root = null
    for (let dir = cwd; ; dir = path.dirname(dir)) { if (fs.existsSync(path.join(dir, '.git'))) { root = dir; break } if (path.dirname(dir) === dir) break }
    for (let dir = cwd; ; dir = path.dirname(dir)) { dirs.push(dir); if (!root || dir === root || path.dirname(dir) === dir) break }
    for (const dir of dirs) bases.push([dir, 'project'])
  }
  const out = new Map()
  const walk = (root, dir, scope, depth = 0) => {
    let entries = []
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory() && depth < 4) walk(root, full, scope, depth + 1)
      else if (entry.isFile() && entry.name.endsWith('.md')) {
        const name = path.relative(root, full).replace(/\.md$/, '').split(path.sep).join(':').toLowerCase()
        if (name && !out.has(name)) out.set(name, { name, path: full, scope })
      }
    }
  }
  for (const [base, scope] of bases) for (const folder of ['.zcode', '.agents']) { const root = path.join(base, folder, 'commands'); walk(root, root, scope) }
  return [...out.values()]
}

/** Turn a custom command file on or off as ZCode does: its config's command[<absolute path>].enable. */
export function setCommandEnabled(file, commandPath, enabled) {
  const config = readConfig(file)
  config.command = config.command && typeof config.command === 'object' ? config.command : {}
  config.command[commandPath] = { ...(config.command[commandPath] ?? {}), enable: enabled }
  writeConfig(file, config)
}

/**
 * ZCode's own slash commands (the `/` catalog its protocol reports: /init, /goal, /workflow, custom commands …) as
 * skills/list rows, the way the app lists a core's commands: path "command:<name>", slash-invocable only. Sending one
 * runs `/<name> args` in ZCode. A custom command backed by a file (`files`, customCommandFiles) can be switched off
 * (ZCode's command[<path>].enable), and one already off is listed off (ZCode leaves it out of its catalog). Names a
 * skill already uses, and the ones the bridge serves through Codex methods (`served`), are left out.
 */
export function commandRows(commands, { known = new Set(), served = new Set(), files = [], config = {} } = {}) {
  const rows = []
  for (const command of Array.isArray(commands) ? commands : []) {
    const name = typeof command?.name === 'string' ? command.name.trim().replace(/^\/+/, '') : ''
    if (!name || /\s/.test(name) || known.has(name) || served.has(name.toLowerCase())) continue
    known.add(name)
    const description = typeof command.description === 'string' ? command.description : ''
    const hint = typeof command.inputHint === 'string' ? command.inputHint.replace(new RegExp(`^/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`), '').trim() : ''
    const file = command.source === 'custom' ? files.find((entry) => entry.name === name.toLowerCase()) ?? null : null
    rows.push({
      name, description, shortDescription: description.split('\n')[0].slice(0, 160), interface: { displayName: name, shortDescription: description.split('\n')[0].slice(0, 160) },
      path: `command:${name}`, scope: file?.scope === 'project' ? 'repo' : command.source === 'custom' ? 'user' : 'system', enabled: true, toggleable: !!file,
      userInvocable: true, modelInvocable: false, pluginId: null, argumentHint: hint || null, ...(file ? { sourcePath: file.path } : {}),
    })
  }
  // Custom commands turned off in ZCode's config: not in its catalog, listed off so they can be turned back on.
  const overrides = config?.command && typeof config.command === 'object' ? config.command : {}
  for (const file of files) {
    if (overrides[file.path]?.enable !== false || known.has(file.name) || served.has(file.name)) continue
    known.add(file.name)
    const meta = frontmatter(file.path)
    const description = typeof meta.description === 'string' ? meta.description : ''
    rows.push({
      name: file.name, description, shortDescription: description.slice(0, 160), interface: { displayName: file.name, shortDescription: description.slice(0, 160) },
      path: `command:${file.name}`, scope: file.scope === 'project' ? 'repo' : 'user', enabled: false, toggleable: true,
      userInvocable: true, modelInvocable: false, pluginId: null, argumentHint: null, sourcePath: file.path,
    })
  }
  return rows
}

// ZCode's built-in sub-agents (services/src/subagents/subagentsService.ts), listed before the user's own.
const ZCODE_BUILTIN_AGENTS = [
  ['general-purpose', 'General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks.', null],
  ['Explore', 'Read-only search agent for broad fan-out searches.', ['Bash', 'Glob', 'Grep', 'Read', 'WebFetch', 'WebSearch', 'TodoWrite']],
]

/**
 * ZCode's sub-agents for Customize (codeDesktop/agents/list): the built-ins with the model the ZCode app set for them
 * (v2/agents-state.json builtInModelSelectionOverrides), then the user's (<storage>/agents/*.md, storage.dir of the CLI
 * config or the ZCode folder) and the project's (<cwd>/.zcode/agents/*.md) agents, a project agent winning over a user
 * one of the same name; a user agent switched off in the ZCode app (disabledAgentIds) is listed off.
 * root: the ZCode folder (zcodePaths().root). [{name, description, scope, path, tools, model, enabled}].
 */
export function zcodeAgents({ root, home = os.homedir(), cwd = null, config = {} } = {}) {
  const state = (() => { try { return JSON.parse(fs.readFileSync(path.join(root, 'v2', 'agents-state.json'), 'utf8')) ?? {} } catch { return {} } })()
  const modelOf = (selection) => (selection && typeof selection === 'object' && typeof selection.modelId === 'string' ? (selection.providerId ? `${selection.providerId}/${selection.modelId}` : selection.modelId) : null)
  const out = new Map(ZCODE_BUILTIN_AGENTS.map(([name, description, tools]) => [name, { name, description, scope: 'builtin', path: null, tools, model: modelOf(state.builtInModelSelectionOverrides?.[name]), enabled: true }]))
  const disabled = new Set(Array.isArray(state.disabledAgentIds) ? state.disabledAgentIds.filter((id) => typeof id === 'string') : [])
  const storage = typeof config?.storage?.dir === 'string' && config.storage.dir.trim() ? config.storage.dir.trim() : null
  const storageRoot = storage ? (storage.startsWith('~/') ? path.join(home, storage.slice(2)) : path.resolve(storage)) : root
  const read = (dir, scope) => {
    let files = []
    try { files = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort() } catch { return }
    for (const file of files) {
      const meta = frontmatter(path.join(dir, file))
      const name = meta.name?.trim()
      if (!name || !meta.description?.trim() || ZCODE_BUILTIN_AGENTS.some(([builtin]) => builtin === name)) continue
      if (scope === 'user' && out.get(name)?.scope === 'project') continue
      const tools = meta.tools ? meta.tools.replace(/^\[|\]$/g, '').split(',').map((tool) => tool.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : null
      out.set(name, { name, description: meta.description.trim().replace(/\\n/g, '\n').slice(0, 400), scope, path: path.join(dir, file), tools, model: meta.model?.trim() || null,
        enabled: scope === 'user' ? ![...disabled].some((id) => id.includes(name)) : true })
    }
  }
  if (typeof cwd === 'string' && cwd) read(path.join(cwd, '.zcode', 'agents'), 'project')
  read(path.join(storageRoot, 'agents'), 'user')
  return [...out.values()]
}

function frontmatter(file) {
  try {
    const text = fs.readFileSync(file, 'utf8')
    const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? ''
    return Object.fromEntries(block.split('\n').map((line) => /^([A-Za-z_-]+):\s*(.*)$/.exec(line)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
  } catch { return {} }
}

export function setSkillEnabled(file, skillPath, enabled) {
  const config = readConfig(file)
  config.skills = config.skills && typeof config.skills === 'object' ? config.skills : {}
  config.skills[skillPath] = { ...(config.skills[skillPath] ?? {}), enable: enabled }
  writeConfig(file, config)
}

// ------------------------------------------------------------------ MCP

/** Codex `mcp_servers` from ZCode's `mcp.servers` (values of env / headers are not sent, only names). */
export function codexMcpServers(config) {
  const servers = config?.mcp?.servers ?? {}
  const out = {}
  for (const [name, server] of Object.entries(servers)) {
    if (!server || typeof server !== 'object') continue
    out[name] = {
      ...(server.command ? { command: server.command } : {}), ...(Array.isArray(server.args) ? { args: server.args } : {}),
      ...(server.url ? { url: server.url } : {}), ...(server.cwd ? { cwd: server.cwd } : {}),
      ...(server.env ? { env: Object.fromEntries(Object.keys(server.env).map((key) => [key, ''])) } : {}),
      ...(server.headers ? { http_headers: Object.fromEntries(Object.keys(server.headers).map((key) => [key, ''])) } : {}),
      enabled: server.enabled !== false, transport: server.type ?? (server.url ? 'http' : 'stdio'),
    }
  }
  return out
}

/** A ZCode `mcp.servers` entry from a Codex mcp_servers value. */
export function zcodeMcpServer(value) {
  if (!value || typeof value !== 'object') throw new Error('An MCP server needs a command or a URL.')
  if (typeof value.url === 'string' && value.url.trim()) {
    const headers = { ...(value.http_headers ?? value.headers ?? {}) }
    if (typeof value.bearer_token === 'string' && value.bearer_token) headers.Authorization = `Bearer ${value.bearer_token}`
    return { type: value.transport === 'sse' || value.type === 'sse' ? 'sse' : 'http', url: value.url.trim(), ...(Object.keys(headers).length ? { headers } : {}), ...(value.enabled === false ? { enabled: false } : {}) }
  }
  if (typeof value.command === 'string' && value.command.trim()) {
    return {
      type: 'stdio', command: value.command.trim(), ...(Array.isArray(value.args) ? { args: value.args.map(String) } : {}),
      ...(value.env && typeof value.env === 'object' ? { env: Object.fromEntries(Object.entries(value.env).map(([key, item]) => [key, String(item)])) } : {}),
      ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}), ...(value.enabled === false ? { enabled: false } : {}),
    }
  }
  throw new Error('An MCP server needs a command or a URL.')
}

/**
 * Apply config/batchWrite edits ({keyPath, value, mergeStrategy}) to ZCode's config.
 * Supported key paths: `mcp_servers.<name>` (upsert / null = remove) and `mcp_servers.<name>.enabled`.
 */
export function applyConfigEdits(file, edits) {
  const config = readConfig(file)
  config.mcp = config.mcp && typeof config.mcp === 'object' ? config.mcp : {}
  config.mcp.servers = config.mcp.servers && typeof config.mcp.servers === 'object' ? config.mcp.servers : {}
  const changed = []
  for (const edit of edits ?? []) {
    const match = /^mcp_servers\.([^.]+)(?:\.(enabled))?$/.exec(String(edit?.keyPath ?? ''))
    if (!match) throw Object.assign(new Error(`ZCode can't store ${edit?.keyPath} here; only mcp_servers.<name> is supported.`), { code: -32602 })
    const [, name, field] = match
    if (field === 'enabled') {
      if (!config.mcp.servers[name]) throw Object.assign(new Error(`Unknown MCP server: ${name}`), { code: -32602 })
      config.mcp.servers[name].enabled = edit.value !== false
    } else if (edit.value === null || edit.value === undefined) delete config.mcp.servers[name]
    else config.mcp.servers[name] = edit.mergeStrategy === 'upsert' && config.mcp.servers[name] ? { ...config.mcp.servers[name], ...zcodeMcpServer(edit.value) } : zcodeMcpServer(edit.value)
    changed.push(name)
  }
  writeConfig(file, config)
  return changed
}

const RUNTIME_STATUS = { connected: 'connected', connecting: 'starting', disabled: 'disabled', disconnected: 'failed', failed: 'failed', untrusted: 'failed' }

// An official Z.ai MCP service (a plugin's `auth: zcode_official` server) that couldn't get the user's identity:
// ZCode reports the enumerated reason; the connector row says what to do about it.
const OFFICIAL_AUTH_HINTS = [
  [/official_auth_plan_required/, 'This Z.ai service needs an active GLM Coding Plan on the signed-in account.'],
  [/official_auth_(unavailable|rejected|forbidden)/, 'This Z.ai service needs the GLM Coding Plan browser sign-in (Settings › General › Account › Sign in).'],
]
export function officialAuthHint(status) {
  const text = `${status?.failureKind ?? ''} ${status?.error ?? ''}`
  const hit = OFFICIAL_AUTH_HINTS.find(([pattern]) => pattern.test(text))
  return hit ? hit[1] : null
}

/** mcpServerStatus/list rows from ZCode statuses and known tools ({server → [{name, description, inputSchema}]}). */
export function mcpStatusRows(config, statuses = {}, toolsByServer = {}) {
  const names = new Set([...Object.keys(config?.mcp?.servers ?? {}), ...Object.keys(statuses)])
  return [...names].sort().map((name) => {
    const status = statuses[name]
    const server = config?.mcp?.servers?.[name]
    const tools = {}
    for (const tool of toolsByServer[name] ?? []) tools[tool.name] = { name: tool.name, description: tool.description ?? '', inputSchema: tool.inputSchema ?? { type: 'object' } }
    const authPending = !!status?.authorization || status?.failureKind === 'not_authenticated' || status?.failureKind === 'oauth_authorization_failed'
    return {
      name, runtimeStatus: server?.enabled === false ? 'disabled' : authPending ? 'authenticationRequired' : RUNTIME_STATUS[status?.status] ?? null, pluginId: null,
      serverInfo: null, tools, toolCount: status?.toolCount ?? Object.keys(tools).length, resources: [], resourceTemplates: [],
      authStatus: authPending ? 'notLoggedIn' : status?.transport === 'stdio' || server?.type === 'stdio' || server?.command ? 'unsupported' : 'loggedIn',
      ...(status?.error || officialAuthHint(status) ? { toolsError: officialAuthHint(status) ?? status.error } : {}), ...(status?.authorization?.authorizationUrl ? { authorizationUrl: status.authorization.authorizationUrl } : {}),
    }
  })
}

/**
 * One `mcp.servers` entry as ZCode's config schema reads it (adapters/src/config/schema.ts normalizeMcpServerConfigInput):
 * legacy `environment`, `enable` and `http_headers` keys, type `remote` (http), and the type inferred from command / url.
 * null: an entry ZCode drops (neither a command nor a url).
 */
export function normalizeMcpServer(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const server = { ...value }
  if (!('env' in server) && 'environment' in server) server.env = server.environment
  delete server.environment
  if (typeof server.enable === 'boolean' || typeof server.enabled === 'boolean') server.enabled = server.enable === false ? false : (server.enabled ?? true)
  delete server.enable
  if (server.type === 'remote') server.type = 'http'
  else if (typeof server.type !== 'string') server.type = typeof server.command === 'string' && server.command.trim() ? 'stdio' : typeof server.url === 'string' && server.url.trim() ? 'http' : undefined
  if ((server.type === 'http' || server.type === 'sse') && server.headers === undefined && server.http_headers !== undefined) server.headers = server.http_headers
  delete server.http_headers
  if (server.type === 'stdio' ? !(typeof server.command === 'string' && server.command) : !(server.type === 'http' || server.type === 'sse') || !(typeof server.url === 'string' && server.url)) return null
  return server
}

/**
 * The project config files ZCode reads for a session folder, lowest priority first (shared/src/workspace-hook-config.ts
 * discoverWorkspaceHookConfigPaths): from the worktree root (the nearest folder up with a `.git`) down to the folder,
 * `zcode.json` then `.zcode/config.json` in each; only the folder itself when it is in no worktree.
 */
export function projectConfigPaths(cwd) {
  if (typeof cwd !== 'string' || !cwd) return []
  const start = path.resolve(cwd)
  const directories = []
  let current = start
  let rooted = false
  for (;;) {
    directories.push(current)
    if (fs.existsSync(path.join(current, '.git'))) { rooted = true; break }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  const ordered = rooted ? directories.reverse() : [start]
  return ordered.flatMap((directory) => [path.join(directory, 'zcode.json'), path.join(directory, '.zcode', 'config.json')]).filter((file) => fs.existsSync(file))
}

/**
 * The MCP servers ZCode itself configures for a session in `cwd` (adapters/src/config/config-factory.ts
 * resolveEffectiveMcpServers): every project config file's servers (a later file's entry replaces an earlier one; a
 * project stdio server runs in its config's folder by default), then the user config's, which shadow project ones.
 * Disabled entries are kept (enabled false), as in ZCode's merged config.
 */
export function effectiveMcpServers(userConfig, cwd) {
  const servers = {}
  for (const file of projectConfigPaths(cwd)) {
    const config = readConfig(file)
    const raw = config?.mcp?.servers
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const folder = path.basename(path.dirname(file)) === '.zcode' ? path.dirname(path.dirname(file)) : path.dirname(file)
    for (const [name, value] of Object.entries(raw)) {
      const server = normalizeMcpServer(value)
      if (!server) continue
      if (server.type === 'stdio') server.cwd = path.resolve(folder, typeof server.cwd === 'string' && server.cwd ? server.cwd : '.')
      servers[name] = server
    }
  }
  for (const [name, value] of Object.entries(userConfig?.mcp?.servers ?? {})) {
    const server = normalizeMcpServer(value)
    if (server) servers[name] = server
  }
  return servers
}

const MCP_PROTOCOL_VERSIONS = new Set(['legacy', 'auto', '2026-07-28'])
const validOAuth = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const optional = (key) => value[key] === undefined || typeof value[key] === 'string'
  if (value.type === 'client_credentials') return typeof value.clientId === 'string' && !!value.clientId.trim() && typeof value.clientSecret === 'string' && !!value.clientSecret.trim() && optional('clientName') && optional('scope')
  if (value.type === 'authorization_code') return ['clientId', 'clientSecret', 'clientName', 'redirectPath', 'scope'].every(optional)
  return false
}

/**
 * The per-server settings ZCode's protocol carries beside the transport (shared/src/mcp.ts convertToZCodeAgentMcpServer):
 * a positive integer timeoutMs, the isolation, the MCP protocol version, and (http / sse) a well-formed OAuth client.
 */
function protocolExtras(server, remote) {
  return {
    ...(remote && validOAuth(server.oauth) ? { oauth: server.oauth } : {}),
    ...(Number.isInteger(server.timeoutMs) && server.timeoutMs > 0 ? { timeoutMs: server.timeoutMs } : {}),
    ...(server.isolation === 'session' || server.isolation === 'workspace' ? { isolation: server.isolation } : {}),
    ...(MCP_PROTOCOL_VERSIONS.has(server.protocolVersion) ? { protocolVersion: server.protocolVersion } : {}),
  }
}

/**
 * ZCode's `mcpServers` param shape for session/create and mcp/list ({name, command, args, env:[{name,value}]} |
 * {name, type, url, headers}, plus timeoutMs / isolation / protocolVersion / oauth). The protocol has no stdio cwd: ZCode
 * starts such a server in the session folder (`cwd`), so one configured to run elsewhere (a project server of a parent
 * folder, a `cwd` key) is started through `/bin/sh -c 'cd … && exec …'` there.
 */
export function protocolMcpServers(config, { cwd } = {}) {
  return Object.entries(config?.mcp?.servers ?? {}).map(([name, value]) => [name, normalizeMcpServer(value)]).filter(([, server]) => server && server.enabled !== false).map(([name, server]) => {
    if (server.type !== 'stdio') return { name, type: server.type === 'sse' ? 'sse' : 'http', url: server.url, headers: Object.entries(server.headers ?? {}).map(([key, value]) => ({ name: key, value: String(value) })), ...protocolExtras(server, true) }
    const entry = { name, command: server.command, args: (server.args ?? []).map(String), env: Object.entries(server.env ?? {}).map(([key, value]) => ({ name: key, value: String(value) })), ...protocolExtras(server, false) }
    const folder = typeof server.cwd === 'string' && server.cwd ? path.resolve(cwd ?? process.cwd(), server.cwd) : null
    if (!folder || (cwd && folder === path.resolve(cwd)) || process.platform === 'win32') return entry
    return { ...entry, command: '/bin/sh', args: ['-c', 'cd "$0" && exec "$@"', folder, entry.command, ...entry.args] }
  })
}

/**
 * List one MCP server's tools with a short-lived MCP client (initialize → tools/list), for Customize › Connectors
 * and tool selection; ZCode reports only a tool count. stdio and streamable HTTP.
 */
export async function listMcpTools(server, { cwd, timeoutMs = 8000 } = {}) {
  const request = (id, method, params) => ({ jsonrpc: '2.0', id, method, params })
  const initialize = request(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'code-desktop-zcode-bridge', version: '0.1.0' } })
  if (server.url) {
    const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(server.headers ?? {}) }
    const post = async (body, session) => {
      const response = await fetch(server.url, { method: 'POST', headers: { ...headers, ...(session ? { 'mcp-session-id': session } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) })
      const text = await response.text()
      const json = /^\s*[{[]/.test(text) ? JSON.parse(text) : JSON.parse(text.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5)).pop() ?? 'null')
      return { json, session: response.headers.get('mcp-session-id') ?? session }
    }
    const first = await post(initialize)
    await fetch(server.url, { method: 'POST', headers: { ...headers, ...(first.session ? { 'mcp-session-id': first.session } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }), signal: AbortSignal.timeout(timeoutMs) }).catch(() => {})
    const listed = await post(request(2, 'tools/list', {}), first.session)
    return listed.json?.result?.tools ?? []
  }
  return await new Promise((resolve, reject) => {
    const child = spawn(server.command, server.args ?? [], { cwd: server.cwd ? path.resolve(cwd ?? process.cwd(), server.cwd) : cwd, env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CODE_DESKTOP_') && key !== 'ELECTRON_RUN_AS_NODE')), ...(server.env ?? {}) }, stdio: ['pipe', 'pipe', 'ignore'] })
    const timer = setTimeout(() => { child.kill(); reject(new Error('The MCP server did not list its tools in time.')) }, timeoutMs)
    let buffer = ''
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.stdout.on('data', (chunk) => {
      buffer += chunk
      let index
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index)
        buffer = buffer.slice(index + 1)
        let message
        try { message = JSON.parse(line) } catch { continue }
        if (message.id === 1) {
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
          child.stdin.write(JSON.stringify(request(2, 'tools/list', {})) + '\n')
        } else if (message.id === 2) {
          clearTimeout(timer)
          child.kill()
          resolve(message.result?.tools ?? [])
        }
      }
    })
    child.stdin.write(JSON.stringify(initialize) + '\n')
  })
}

// ------------------------------------------------------------------ plugins

const isBrowserUse = (plugin) => [plugin?.id, plugin?.name].some((value) => typeof value === 'string' && /(^|[/@:])browser-use($|@)/.test(value))

export function pluginSummary(plugin) {
  return {
    id: plugin.id, remotePluginId: null, version: plugin.version ?? null, localVersion: plugin.version ?? null, name: plugin.name, shareContext: null,
    source: { type: plugin.source === 'official' || plugin.source === 'marketplace' ? 'marketplace' : 'local', path: plugin.rootPath ?? null }, installed: true, installedAt: null, enabled: plugin.enabled !== false,
    installPolicy: plugin.source === 'official' ? 'INSTALLED_BY_DEFAULT' : 'AVAILABLE', installPolicySource: null, mustShowInstallationInterstitial: null,
    authPolicy: 'ON_USE', availability: 'AVAILABLE', disabledReason: null, eligiblePlanTypes: null,
    interface: { displayName: plugin.name, shortDescription: plugin.description ?? '', longDescription: null, developerName: plugin.author ?? null, logo: null, screenshots: [], screenshotUrls: [] },
    keywords: [],
    codeDesktop: {
      removable: plugin.source !== 'official', optional: true, held: false, experimental: false, title: plugin.name, description: plugin.description ?? '', icon: null,
      components: (plugin.components ?? []).map((component) => component.kind), readOnlyReason: plugin.source === 'official' ? 'Built into ZCode: turn it off instead.' : null, loadError: null,
      // Browser Use drives a browser the host provides (interaction/browserList|browserExecute); the bridge reports
      // none (server.js), so the app says the plugin can't work here instead of showing it as simply on.
      ...(isBrowserUse(plugin) ? { unavailable: 'noBrowser' } : {}),
    },
  }
}

export function pluginsInstalledResponse(list) {
  const groups = new Map()
  for (const plugin of list?.plugins ?? []) {
    const marketplace = plugin.marketplace ?? 'local'
    if (!groups.has(marketplace)) groups.set(marketplace, { name: marketplace, path: null, interface: { displayName: marketplace === 'zcode-plugins-official' ? 'ZCode official plugins' : marketplace }, plugins: [] })
    groups.get(marketplace).plugins.push(pluginSummary(plugin))
  }
  return { marketplaces: [...groups.values()], marketplaceLoadErrors: (list?.diagnostics ?? []).map((item) => ({ marketplacePath: null, message: String(item?.message ?? item) })) }
}

export function pluginReadResponse(plugin) {
  const skills = (plugin.components ?? []).filter((component) => component.kind === 'skill').flatMap((component) => component.items ?? []).map((item) => ({ name: item.name, description: item.description ?? '', path: null, enabled: plugin.enabled !== false }))
  return {
    plugin: {
      marketplaceName: plugin.marketplace ?? 'local', marketplacePath: null, summary: pluginSummary(plugin), shareUrl: null, description: plugin.description ?? null, skills,
      hooks: (plugin.hookDetails ?? []).map((hook) => ({ key: hook.key ?? hook.event ?? 'hook', eventName: hook.event ?? hook.eventName ?? '' })), apps: [], appTemplates: [],
      mcpServers: [...(plugin.mcpServerNames ?? []), ...(plugin.hostMcpServerNames ?? [])], scheduledTasks: null,
    },
  }
}

// ------------------------------------------------------------------ hooks

// ZCode's events (shared/src/hooks.ts HookEvent) as Codex HookEventName; PostToolUseFailure has no Codex event and
// lands under the app's 'Other' group with its own name.
const HOOK_EVENTS = {
  SessionStart: 'sessionStart', UserPromptSubmit: 'userPromptSubmit', PreToolUse: 'preToolUse', PermissionRequest: 'permissionRequest',
  PostToolUse: 'postToolUse', PostToolUseFailure: 'postToolUseFailure', Stop: 'stop',
}

// The user's hooks (config `hooks.events`) as Codex HookMetadata. A hook runs when the root `hooks.enabled` is on and
// the hook itself isn't turned off (services workspaceHookSettingsModel configuredEnabled).
export function hookEntries(config, sourcePath = null) {
  const root = config?.hooks ?? {}
  const events = root.events ?? {}
  const hooks = []
  for (const [eventName, groups] of Object.entries(events)) {
    for (const [groupIndex, group] of (Array.isArray(groups) ? groups : []).entries()) {
      for (const [hookIndex, hook] of (Array.isArray(group?.hooks) ? group.hooks : []).entries()) {
        if (!hook || typeof hook.command !== 'string' || !hook.command) continue
        hooks.push({
          key: `${eventName}:${groupIndex}:${hookIndex}`, eventName: HOOK_EVENTS[eventName] ?? eventName,
          matcher: typeof group.matcher === 'string' && group.matcher ? group.matcher : null, handlerType: 'command',
          command: [hook.command, ...(Array.isArray(hook.args) ? hook.args : [])].filter(Boolean).join(' '),
          async: hook.async === true, timeoutSec: Number.isFinite(hook.timeout) ? hook.timeout : Number.isFinite(hook.timeoutMs) ? Math.round(hook.timeoutMs / 1000) : null,
          statusMessage: typeof hook.statusMessage === 'string' && hook.statusMessage ? hook.statusMessage : null,
          enabled: root.enabled === true && hook.enabled !== false, isManaged: false, source: 'user', sourcePath, displayOrder: hooks.length,
        })
      }
    }
  }
  return hooks
}

// hooks/list answers Codex HooksListResponse: one entry per requested folder ({cwd, hooks, warnings, errors}). The
// user's hooks apply in every folder.
/**
 * A folder's project hook files (shared/src/workspace-hook-config.ts: zcode.json and .zcode/config.json, from the
 * folder up to its git root), each with the hooks ZCode reads from it. ZCode blocks them until the workspace is
 * trusted in the ZCode app (workspace/hooks/trustGrant with its digests); a hook the trust store
 * (<root>/security/workspace-hook-trust-v1.json) recorded at that file, event and command reads as trusted.
 */
export function projectHookEntries(cwd, { root = null, config = {} } = {}) {
  if (typeof cwd !== 'string' || !cwd) return { hooks: [], pending: 0 }
  const dirs = []
  let dir = path.resolve(cwd)
  for (let level = 0; level < 8; level++) {
    dirs.push(dir)
    if (fs.existsSync(path.join(dir, '.git'))) break
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  let records = []
  try { records = JSON.parse(fs.readFileSync(path.join(root ?? '', 'security', 'workspace-hook-trust-v1.json'), 'utf8'))?.records ?? [] } catch {}
  // hookEntries keys are `<Event>:<group>:<hook>`: the ZCode event and the declared command come from them.
  const trusted = (file, declared, entry) => {
    const [event, group, index] = entry.key.split(':')
    const command = declared.hooks?.events?.[event]?.[Number(group)]?.hooks?.[Number(index)]?.command
    return typeof command === 'string' && records.some((record) => record?.decision === 'trusted' && record.eventAtGrant === event
      && (record.sourcePathAtGrant === file || path.resolve(String(record.sourcePathAtGrant ?? '')) === file)
      && typeof record.displayCommandAtGrant === 'string' && record.displayCommandAtGrant.includes(command))
  }
  const hooks = []
  let pending = 0
  for (const folder of dirs) for (const name of ['zcode.json', path.join('.zcode', 'config.json')]) {
    const file = path.join(folder, name)
    const declared = readConfig(file)
    if (!declared?.hooks || typeof declared.hooks !== 'object') continue
    // The project file's own hooks root turns them on, as the CLI config's does (resolveWorkspaceHookRuntimeRoot).
    const on = declared.hooks.enabled === true || config?.hooks?.enabled === true
    for (const entry of hookEntries({ hooks: { ...declared.hooks, enabled: true } }, file)) {
      const ok = trusted(file, declared, entry)
      if (!ok) pending++
      hooks.push({ ...entry, key: `project:${file}:${entry.key}`, source: 'project', enabled: on && ok && entry.enabled, trustStatus: ok ? 'trusted' : 'untrusted' })
    }
  }
  return { hooks, pending }
}

export function hooksList(config, { cwds = [], sourcePath = null, fallbackCwd = null, root = null } = {}) {
  const folders = Array.isArray(cwds) && cwds.length ? cwds.filter((cwd) => typeof cwd === 'string' && cwd) : [fallbackCwd ?? '']
  const hooks = hookEntries(config, sourcePath)
  return { data: folders.map((cwd) => {
    const project = cwds.length ? projectHookEntries(cwd, { root, config }) : { hooks: [], pending: 0 }
    return { cwd, hooks: [...hooks, ...project.hooks.map((hook) => ({ ...hook, displayOrder: hooks.length + hook.displayOrder }))],
      warnings: project.pending ? ['This project’s hooks are waiting for review. Open the folder in the ZCode app and trust them there; until then ZCode doesn’t run them.'] : [], errors: [] }
  }) }
}
