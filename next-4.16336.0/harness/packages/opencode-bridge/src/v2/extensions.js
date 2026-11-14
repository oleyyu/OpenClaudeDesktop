/**
 * OpenCode 2.x's extensions, as Bridge methods (installed on its prototype by index.js; every name ends in V2 and runs
 * only where `this.v2` is set). The 1.x routes they replace are gone (GET /config, /mcp, /skill, /command,
 * /experimental/tool, /instance/dispose):
 *
 *   config           GET /api/config is the documents (Config.Entry[], lowest first), never one merged config:
 *                    mergedConfigV2 folds them (config.js mergeConfigEntries) into what the 1.x code reads — model
 *                    "provider/id", mcp.<name> in 1.x's shape (`disabled` → enabled:false), agent, command, plugin
 *   connectors       their config from it plus mcp.json (the app's own, and its off switches, which the plugin's
 *                    mcp.transform applies: v2 drops an {enabled:false} entry); their state from GET /api/mcp
 *                    (connected | pending | disabled | failed | needs_auth: no needs_client_registration, so a refused
 *                    client registration is told from the error text); reload is POST /api/experimental/mcp/:n/connect
 *                    (stop + start); tools still from mcp-tools.js, dropped on mcp.status.changed. Sign-in is the
 *                    connector's integration (mcp_<sha1>: GET /api/mcp names it) with its one OAuth method of the same
 *                    id, an attempt polled like an account's: OpenCode listens for the redirect itself, so nothing here
 *                    holds 1.x's port 19876 (oauth-callback.js is MiMo's and 1.x's). Sign-out deletes its credentials
 *   skills           GET /api/skill {id, name, path, autoinvoke}: a switch stays by name in settings.json (1.x reads it
 *                    too) and the ids each name had are kept (skillIdsV2), since v2 checks `skill` by id (a built-in's
 *                    is not its name: OpenCode / opencode). A turned-off skill is still listed (its deny is a session
 *                    rule). forceReload: DELETE /api/debug/location of an idle folder, then wait for the new location's
 *                    plugins: GET /api/skill and /api/command don't (server/src/handlers/skill.ts, command.ts), so right
 *                    after an eviction both answer [] until the skill and command plugins have run
 *   commands         GET /api/command {name, description}: an MCP prompt is <server>:<prompt> (both sanitized); a
 *                    command's file, template and options come from the config documents and the `{command,commands}`
 *                    folders of the directory entries (the same places v2 reads), its hint from the template's
 *                    placeholders. `goal` is left out: its loop runs up to 50 turns nobody here started
 *   plugins          GET /api/plugin {id?, source, state} per folder (built-ins and the bridge's own left out), where
 *                    each comes from by the config entries; a failed one carries its error, and one written for 1.x
 *                    (hooks returned from a named export: v2 needs `export default {id, setup}`) is marked incompatible.
 *                    plugin.updated rereads the list: a new failure is a notice and codeDesktop/plugin/changed. An
 *                    install's verdict is the plugin's state once it is listed (npm installs take a while). The
 *                    bridge's own: no turn runs in a folder where it isn't active (bridgePluginGuardV2, fail closed)
 *   agents           files in v2's own frontmatter (`permissions:` rules under v2's tool names, the prompt as the body);
 *                    v2 watches the folders, so a change is waited for in GET /api/agent instead of a dispose
 *   tools            no tool list route: a fixed list of 2.2.5's built-ins (no list, lsp, codesearch, todoread), MCP
 *                    tools from mcp-tools.js, skills from GET /api/skill
 */
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { RpcError, INVALID_PARAMS, invalidParams } from '../transport.js'
import { toolsListResponse, sanitizeMcp } from '../tools.js'
import { mergeConfigEntries, pluginIdOf } from './config.js'
import { PLUGIN_ID } from './plugin.js'
import { realClock, watchLogin } from './account.js'
import { commandFileV2 } from './live.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const integrationRoute = (id, tail = '') => `/api/integration/${encodeURIComponent(id)}${tail}`

/** 2.2.5's embedded skills (plugin/skill.ts): ids opencode and report, at /builtin/<id>.md. */
export const BUILTIN_SKILLS_V2 = new Set(['opencode', 'report'])
/** 2.2.5's own commands (plugin/command.ts, plugin/goal.ts). */
const BUILTIN_COMMANDS_V2 = new Set(['init', 'review'])
/** Commands not offered: /goal keeps prompting the session by itself (up to 50 runs) as turns nobody here started. */
export const HIDDEN_COMMANDS_V2 = new Set(['goal'])
/** A refused dynamic client registration, as v2 words it (it has no needs_client_registration status). */
const CLIENT_REGISTRATION = /client registration|registration endpoint|registration_endpoint|does not support (?:dynamic )?registration|invalid_client/i
const AGENT_WAIT_MS = 3000
const PLUGIN_VERDICT_MS = 30000
const POLL_MS = 200

/**
 * 2.2.5's built-in tools as the tool switches list them (tool/plugin/*.ts; codesearch, list, lsp and todoread are gone):
 * edit, write and patch ask `edit` and go together (tools.js); execute is Code Mode, off in the bridge's sessions.
 */
export const BUILTIN_TOOLS_V2 = Object.freeze([
  { id: 'read', description: 'Read a file, or list a folder.' },
  { id: 'glob', description: 'Find files by name pattern.' },
  { id: 'grep', description: 'Search file contents with a regular expression.' },
  { id: 'edit', description: 'Replace text in a file.' },
  { id: 'write', description: 'Write a file.' },
  { id: 'patch', description: 'Apply a patch (GPT models).' },
  { id: 'shell', description: 'Run a shell command.' },
  { id: 'subagent', description: 'Hand a task to a sub-agent, in the foreground or the background.' },
  { id: 'skill', description: 'Load a skill.' },
  { id: 'todowrite', description: 'Keep a to-do list for the task.' },
  { id: 'webfetch', description: 'Fetch a web page.' },
  { id: 'websearch', description: 'Search the web.' },
  { id: 'question', description: 'Ask the user a question.' },
  // tool/plugin/image-generate.ts: a direct tool while an image-capable model is available; asks its own name.
  { id: 'experimental_image_generate', description: 'Generate an image (when an image model is available).' },
])

/** A v2 model selection ("p/m#variant" or {providerID, model, variant}) as 1.x's "provider/model", or null. */
export function modelIdOf(value) {
  if (typeof value === 'string' && value.includes('/')) return value.replace(/#.*$/, '')
  if (isRecord(value) && typeof value.providerID === 'string' && typeof value.model === 'string') return `${value.providerID}/${value.model}`
  return null
}

/** A v2 `mcp.servers.<name>` → 1.x's `mcp.<name>` shape (what mcp-tools.js, toCodexMcp and the 1.x code read), or null. */
export function fromV2Mcp(server) {
  if (!isRecord(server)) return null
  const enabled = server.disabled === true ? { enabled: false } : {}
  if (server.type === 'remote' && typeof server.url === 'string' && server.url) {
    const oauth = server.oauth === false ? { oauth: false }
      : isRecord(server.oauth) ? { oauth: { ...(typeof server.oauth.client_id === 'string' ? { clientId: server.oauth.client_id } : {}), ...(typeof server.oauth.scope === 'string' ? { scope: server.oauth.scope } : {}) } } : {}
    return { type: 'remote', url: server.url, ...(isRecord(server.headers) ? { headers: server.headers } : {}), ...oauth, ...enabled }
  }
  if (Array.isArray(server.command) && server.command.length) {
    return { type: 'local', command: server.command.map(String), ...(isRecord(server.environment) ? { environment: server.environment } : {}), ...(typeof server.cwd === 'string' ? { cwd: server.cwd } : {}), ...enabled }
  }
  return null
}

/**
 * One GET /api/mcp status (Mcp.Server.status) as mcpServerStatus/list's (a connector turned off here is disabled
 * whatever v2 says yet): runtimeStatus, the error, and whether the
 * failure is a refused client registration (oauthClientRequired: Sign in can't work until the connector names a client).
 */
export function mcpStatusV2(status, config = {}) {
  const kind = status?.status
  const error = typeof status?.error === 'string' && status.error ? status.error : null
  const clientRequired = (kind === 'failed' || kind === 'needs_auth') && Boolean(error && CLIENT_REGISTRATION.test(error))
  // Turned off here: the plugin's mcp.transform disables it (v2 may not have rerun it yet).
  const runtimeStatus = config.enabled === false ? 'disabled' : clientRequired ? 'failed'
    : kind === 'connected' ? 'connected' : kind === 'pending' ? 'starting' : kind === 'disabled' ? 'disabled'
      : kind === 'failed' ? 'failed' : kind === 'needs_auth' ? 'authenticationRequired'
        : config.enabled === false ? 'disabled' : null
  return { runtimeStatus, error, clientRequired }
}

/** A markdown file's simple frontmatter (`key: value` lines) and body. */
export function markdownParts(text) {
  const source = String(text ?? '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source)
  const data = {}
  if (match) {
    for (const line of match[1].split(/\r?\n/)) {
      const field = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
      if (!field) continue
      let value = field[2].trim()
      if (/^"(?:[^"\\]|\\.)*"$/.test(value)) { try { value = JSON.parse(value) } catch {} }
      else if (/^'.*'$/.test(value)) value = value.slice(1, -1).replace(/''/g, "'")
      data[field[1]] = value === 'true' ? true : value === 'false' ? false : value
    }
  }
  return { data, body: (match ? source.slice(match[0].length) : source).trim() }
}

/** A command template's argument hint: '$ARGUMENTS' → '[arguments]', '$1 $2' → '[arg1] [arg2]', '' without any. */
export function templateHint(template) {
  const text = typeof template === 'string' ? template : ''
  if (/\$ARGUMENTS\b/.test(text)) return '[arguments]'
  const numbered = [...new Set([...text.matchAll(/\$(\d+)\b/g)].map((match) => Number(match[1])).filter((n) => n > 0))].sort((a, b) => a - b)
  return numbered.slice(0, 6).map((n) => `[arg${n}]`).join(' ')
}

// v2's plugin API domains (packages/plugin/src/promise/*): ctx.<domain>.hook("<name>", …) and ctx.<domain>.transform(…).
const PLUGIN_DOMAINS = 'agent|aisdk|artifact|command|event|integration|mcp|model|permission|provider|reference|session|shell|skill|storage|tool|vcs|websearch|worktree'
// 1.x hooks are returned as quoted dotted keys (or event / config / auth functions) from a named export.
const V1_HOOK = /(['"`])(?:chat\.(?:message|params|headers)|tool\.execute\.(?:before|after)|tool\.definition|permission\.ask|shell\.env|command\.execute\.before|session\.(?:pre|post|llm\.request)|experimental\.[\w.]+)\1\s*[:(]/

/**
 * What a v2 plugin's source registers, read without running it: hooks (`session.context`, `mcp.transform`, `rpc` …),
 * the tools a tool.transform adds by name, and its shape: 'v2' (a default {id, setup|effect} definition, or v2 hook
 * calls), 'v1' (1.x's returned hooks: 2.x fails to load it), else 'unknown'. Comments are dropped first.
 * @returns {{ hooks: string[], tools: string[], shape: 'v1' | 'v2' | 'unknown' }}
 */
export function pluginContentsV2(source) {
  const text = String(source ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  if (!text.trim()) return { hooks: [], tools: [], shape: 'unknown' }
  const hooks = []
  const add = (name) => { if (!hooks.includes(name)) hooks.push(name) }
  for (const match of text.matchAll(new RegExp(`\\.(${PLUGIN_DOMAINS})\\.(hook|transform)\\(\\s*(?:(["'\`])([\\w.]+)\\3)?`, 'g'))) add(match[2] === 'hook' && match[4] ? `${match[1]}.${match[4]}` : `${match[1]}.transform`)
  if (/\.rpc\.register\(/.test(text)) add('rpc')
  const tools = []
  const starts = [...text.matchAll(/\.tool\.transform\(/g)].map((match) => match.index)
  starts.forEach((start, index) => {
    const chunk = text.slice(start, starts[index + 1] ?? text.length)
    for (const match of chunk.matchAll(/\.add\(\s*\{([\s\S]{0,400}?)\}/g)) {
      const name = /\b(?:name|id)\s*:\s*(["'`])([\w.-]{1,80})\1/.exec(match[1])?.[2]
      if (name && !tools.includes(name)) tools.push(name)
    }
  })
  const definition = /\bexport\s+default\b|module\.exports\s*=|\bexports\.default\s*=/.test(text) && /\bid\s*:/.test(text) && /\b(?:setup|effect)\s*[:(,}]/.test(text)
  const shape = definition || hooks.length ? 'v2' : V1_HOOK.test(text) || /(?:^|[{,\s])event\s*:\s*async\b/.test(text) ? 'v1' : 'unknown'
  return { hooks, tools, shape }
}

/** A 2.x plugin load failure that means the module isn't a v2 definition (plugin/module.ts). */
const V1_FAILURE = /must export a default definition|default definition with an id/i
export const INCOMPATIBLE_PLUGIN = 'Written for OpenCode 1.x: OpenCode 2.x can’t load it. Look for a version of this plugin made for OpenCode 2.'

/** The spec a listed plugin is configured as: a package's target, a local plugin's path; null for built-ins and SDK ones. */
export function pluginSpecV2(plugin) {
  const source = plugin?.source
  if (source?.type === 'package' && typeof source.target === 'string') return source.target
  if (source?.type === 'local' && typeof source.path === 'string') return source.path
  return null
}

/**
 * A v2 agent file (config/plugin/agent.ts reads native frontmatter as soon as it has `permissions`, else any file of only
 * native keys): description, mode, model, a deny rule per permission left out, the prompt as the body (`system`).
 */
export function agentMarkdownV2({ description, mode, model, prompt, deny = [] }) {
  return ['---', `description: ${JSON.stringify(description)}`, `mode: ${mode}`, ...(model ? [`model: ${JSON.stringify(model)}`] : []),
    ...(deny.length ? ['permissions:', ...deny.flatMap((action) => [`  - action: ${action}`, '    resource: "*"', '    effect: deny'])] : []), '---', '', prompt, ''].join('\n')
}

// The agent permissions Customize offers (index.js AGENT_PERMISSIONS: 1.x names) under v2's tool names; lsp is gone.
const AGENT_ACTIONS_V2 = { bash: 'shell', task: 'subagent', lsp: null, shell: 'shell', subagent: 'subagent', read: 'read', edit: 'edit', glob: 'glob', grep: 'grep', webfetch: 'webfetch', todowrite: 'todowrite', websearch: 'websearch', skill: 'skill', question: 'question' }
/** codeDesktop/agents/write's deny list as v2 actions (unknown and gone ones dropped). */
export function agentDenyV2(keys) {
  return [...new Set((Array.isArray(keys) ? keys : []).map((key) => AGENT_ACTIONS_V2[key]).filter(Boolean))]
}

/**
 * The server entry file of a plugin folder or package, in plugin/src/host.ts's order: its `server` subpath first
 * (exports['./server'], or server.* / server/index.* when it has no exports map), then the package itself
 * (exports['.'] / module / main, else index.*).
 */
function entryOf(dir) {
  const pkg = readJsonSafe(path.join(dir, 'package.json'))
  const exported = isRecord(pkg?.exports) ? pkg.exports['.'] ?? pkg.exports : pkg?.exports
  const pick = (value) => (typeof value === 'string' ? value : isRecord(value) ? pick(value.import ?? value.default ?? value.node ?? value.require) : null)
  // With an exports map only the subpaths it names resolve.
  const server = pkg?.exports !== undefined ? [pick(isRecord(pkg.exports) ? pkg.exports['./server'] : null)]
    : ['server.js', 'server.mjs', 'server.ts', 'server/index.js', 'server/index.mjs', 'server/index.ts']
  for (const candidate of [...server, pick(exported), pkg?.module, pkg?.main, 'index.js', 'index.mjs', 'index.ts', 'src/index.ts', 'dist/index.js'].filter((value) => typeof value === 'string')) {
    const file = path.resolve(dir, candidate)
    try { if (fs.statSync(file).isFile()) return file } catch {}
  }
  return null
}
const readJsonSafe = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null } }
const readSource = (file) => {
  if (!file) return ''
  try { const stat = fs.statSync(file); return stat.isFile() && stat.size <= 2_000_000 ? fs.readFileSync(file, 'utf8') : '' } catch { return '' }
}
const within = (dir, file) => file === dir || file.startsWith(dir.endsWith(path.sep) ? dir : dir + path.sep)
const realpath = (dir) => { try { return fs.realpathSync(dir) } catch { return path.resolve(dir) } }
/** Two folder names for one folder (v2 may name a location by its real path: /private/tmp for /tmp). */
const sameDirectory = (a, b) => typeof a === 'string' && typeof b === 'string' && (path.resolve(a) === path.resolve(b) || realpath(a) === realpath(b))

/** The built-ins no `plugins` remove operation turns off (core/src/plugin/internal.ts `guarded`): listed after every activation. */
export const GUARDED_PLUGINS_V2 = new Set(['opencode.provider.opencode', 'opencode.config.policy'])

/** The turn refusal of a folder where the bridge's plugin isn't active (bridgePluginGuardV2). */
export function bridgePluginRefusalV2(name, directory, reason) {
  return `OpenClaude Desktop's ${name} plugin is not active in ${directory}: ${reason}. Without it this folder would run without the sandbox profile, the custom system prompt, the edit guard and the policy denials, so no turn runs there. Fix the folder's config (or Customize › Plugins), then send again.`
}

export const EXTENSIONS_V2 = {
  // ---------------------------------------------------------------- config

  /** A folder's config documents (GET /api/config), [] when unread. */
  async configEntriesV2(directory) {
    try {
      const entries = await (await this.v2Api()).get('/api/config', { location: directory })
      return Array.isArray(entries) ? entries : []
    } catch (error) { this.log(`config ${directory}: ${error?.message ?? error}`); return [] }
  },

  /** What 1.x's merged GET /config gave, from the documents: {model, mcp (1.x shape), agent, command, plugin, entries}. */
  async mergedConfigV2(directory) {
    const entries = await this.configEntriesV2(directory)
    const { config, plugins } = mergeConfigEntries(entries)
    const mcp = {}
    for (const [name, server] of Object.entries(isRecord(config.mcp?.servers) ? config.mcp.servers : {})) {
      const value = fromV2Mcp(server)
      if (value) mcp[name] = value
    }
    return { model: modelIdOf(config.model), mcp, agent: isRecord(config.agents) ? config.agents : {}, command: isRecord(config.commands) ? config.commands : {}, plugin: plugins.map((plugin) => plugin.target), entries }
  },

  /** The global config folders (v2's, and ~/.opencode, read for every folder under the home folder). */
  globalDirsV2() {
    const home = this.homeDir()
    return [this.config.globalDir(), path.join(home, '.opencode')]
  },

  /** Folders whose config is the user's, not a project's (the global ones, ~/.claude, ~/.agents). */
  userRootsV2() {
    const home = this.homeDir()
    return [...this.globalDirsV2(), path.join(home, '.claude'), path.join(home, '.agents')]
  },

  /** Whether a config document is the user's own (global folder, their OPENCODE_CONFIG / _CONTENT) or a project's. */
  userDocumentV2(file) {
    if (!file) return true
    if (file === this.config.userConfigFile?.()) return true
    return this.userRootsV2().some((root) => within(root, path.dirname(file)))
  },

  // ---------------------------------------------------------------- connectors

  /** A folder's MCP servers as [[name, 1.x-shaped config]]: its documents, then the app's own (mcp.json) over them. */
  async mcpServersV2(directory) {
    const config = await this.mergedConfigV2(directory)
    const servers = { ...config.mcp }
    const own = this.config.readMcp()
    // The bridge's file is reloaded a moment after it is written: mcp.json is what it now says.
    for (const [name, value] of Object.entries(own.servers)) servers[name] = value
    // The plugin disables the user's own servers turned off here (mcp.transform): v2's config still lists them on.
    for (const name of own.disabled) if (servers[name]) servers[name] = { ...servers[name], enabled: false }
    for (const name of Object.keys(servers)) if (!own.servers[name] && !own.disabled.includes(name) && this.removedMcp?.has(name) && config.mcp[name]) delete servers[name]
    return Object.entries(servers).filter(([, value]) => isRecord(value) && (value.type || value.command || value.url))
  },

  /** GET /api/mcp for a folder: [{name, status, title?, integrationID?}]. */
  async mcpListV2(directory) {
    const list = await (await this.v2Api()).get('/api/mcp', { location: directory, timeout: 30000 })
    return Array.isArray(list) ? list.filter((entry) => typeof entry?.name === 'string') : []
  },

  async mcpStatusListV2(params) {
    const directory = this.directoryFor(params)
    const [servers, listed] = await Promise.all([this.mcpServers(directory), this.mcpListV2(directory).catch((error) => { this.log(`mcp status: ${error?.message ?? error}`); return [] })])
    this.rememberMcpNames(directory, servers.map(([name]) => name))
    const byName = new Map(listed.map((entry) => [entry.name, entry]))
    const integrationOf = (id) => this.v2Api().then((api) => api.get(integrationRoute(id), { location: directory })).catch(() => null)
    const data = await Promise.all(servers.map(async ([name, config]) => {
      const live = byName.get(name)
      const { runtimeStatus, error, clientRequired } = mcpStatusV2(live?.status, config)
      const tools = params.detail === 'statusOnly' || runtimeStatus === 'disabled' ? [] : await this.mcpTools.tools(name, config)
      const kind = live?.status?.status
      // Every remote server has an integration (mcp/index.ts), an anonymous one too: signed in only with a credential.
      const signedIn = config.type === 'remote' && !config.headers && kind === 'connected' && live?.integrationID
        ? this.credentialIdsV2(await integrationOf(live.integrationID)).length > 0 : false
      return {
        name, runtimeStatus, pluginId: null, serverInfo: null,
        tools: Object.fromEntries(tools.map((tool) => [tool.name, { name: tool.name, description: tool.description, inputSchema: { type: 'object' } }])),
        toolsError: error, resources: [], resourceTemplates: [],
        authStatus: config.type === 'remote' ? (kind === 'needs_auth' ? 'notLoggedIn' : config.headers ? 'bearerToken' : signedIn ? 'oAuth' : 'unknown') : 'unsupported',
        ...(clientRequired ? { codeDesktop: { oauthClientRequired: true } } : {}),
      }
    }))
    return { data, nextCursor: null }
  },

  /** config/mcpServer/reload: every server of every loaded folder restarted (connect is stop + start on 2.x). */
  async mcpReloadV2() {
    this.mcpTools.invalidate()
    const api = await this.v2Api()
    for (const directory of this.loadedDirectories()) {
      for (const [name, value] of await this.mcpServers(directory)) {
        if (value.enabled === false) continue
        try { await api.post(`/api/experimental/mcp/${encodeURIComponent(name)}/connect`, undefined, { location: directory, timeout: 60000 }) }
        catch (error) { this.log(`mcp reload ${name}: ${error?.status ?? ''} ${error?._tag ?? error?.message ?? error}`) }
      }
    }
    await this.refreshMcpNames()
    return {}
  },

  /** A connector's integration in a folder: {server (GET /api/mcp's entry), integration (or null)}. */
  async mcpIntegrationV2(api, directory, name) {
    const server = (await this.mcpListV2(directory)).find((entry) => entry.name === name) ?? null
    if (!server?.integrationID) return { server, integration: null }
    let integration = null
    try { integration = await api.get(integrationRoute(server.integrationID), { location: directory }) } catch (error) { if (error?.status !== 404) throw error }
    return { server, integration }
  },

  /**
   * mcpServer/oauth/login on 2.x: the connector's own OAuth method (POST …/connect/oauth {methodID: its integration id});
   * OpenCode takes the browser's redirect itself. The attempt is polled; mcpServer/oauthLogin/completed tells the outcome.
   */
  async mcpLoginV2(params) {
    const directory = this.directoryFor(params)
    const name = String(params.name ?? '')
    const config = new Map(await this.mcpServers(directory)).get(name)
    if (!config) throw new RpcError(INVALID_PARAMS, `There is no connector named ${name}.`)
    const api = await this.v2Api()
    const { server, integration } = await this.mcpIntegrationV2(api, directory, name)
    if (!server?.integrationID || !integration) throw new RpcError(-32000, `${name} did not offer an OAuth sign-in.`)
    const iid = server.integrationID
    const before = this.credentialIdsV2(integration)
    if (server.status?.status === 'connected' && before.length) {
      // The stored sign-in still works.
      this.mcpTools.invalidate(name)
      this.notify('mcpServer/oauthLogin/completed', { name, success: true, error: null })
      throw new RpcError(-32000, `${name} is already signed in.`)
    }
    // A second Sign in replaces the first one's attempt.
    for (const [id, entry] of this.logins) if (entry.mcp === name) { entry.controller.abort(); this.logins.delete(id) }
    const method = (Array.isArray(integration.methods) ? integration.methods : []).find((entry) => entry?.type === 'oauth') ?? { id: iid }
    let attempt
    try { attempt = await api.post(integrationRoute(iid, '/connect/oauth'), { methodID: method.id }, { location: directory, timeout: 60000 }) } catch (error) {
      throw new RpcError(-32000, `Couldn't start ${name}'s sign-in: ${error?.message || error}`)
    }
    const cancel = () => api.delete(integrationRoute(iid, `/connect/oauth/${encodeURIComponent(attempt?.attemptID ?? '')}`), { location: directory }).catch(() => {})
    const url = attempt?.url
    if (typeof attempt?.attemptID !== 'string' || typeof url !== 'string' || !/^https?:/.test(url)) {
      if (attempt?.attemptID) await cancel()
      throw new RpcError(-32000, `${name} did not offer an OAuth sign-in.`)
    }
    const loginId = randomUUID()
    const controller = new AbortController()
    const entry = { controller, mcp: name, done: false }
    this.logins.set(loginId, entry)
    const known = new Set(before)
    const timing = this.accountTimingV2()
    const expires = Number.isFinite(attempt.time?.expires) && Number.isFinite(attempt.time?.created) ? attempt.time.expires - attempt.time.created : 10 * 60000
    void (async () => {
      const result = await watchLogin({
        signal: controller.signal, pollMs: timing.pollMs, timeoutMs: expires + timing.oauthGraceMs, clock: this.v2.clock ?? realClock,
        check: async () => {
          let status
          try { status = await api.get(integrationRoute(iid, `/connect/oauth/${encodeURIComponent(attempt.attemptID)}`), { location: directory }) } catch (error) {
            if (error?.status !== 404) throw error
            const now = await api.get(integrationRoute(iid), { location: directory }).catch(() => null)
            const added = this.credentialIdsV2(now).some((id) => !known.has(id))
            return { done: true, success: added, error: added ? null : 'The sign-in ended before it finished. Try again.' }
          }
          if (status?.status === 'complete') return { done: true, success: true }
          if (status?.status === 'failed') return { done: true, success: false, error: status.message || 'Sign-in failed.' }
          if (status?.status === 'expired') return { done: true, success: false, error: 'Sign-in timed out.' }
          return { done: false }
        },
      })
      if (result.cancelled) { await cancel(); return }
      if (entry.done) return
      entry.done = true
      this.logins.delete(loginId)
      // As 1.x's sign-in replaced the connector's token: the older credentials go.
      if (result.success) await this.deleteCredentialsV2(api, before)
      this.mcpTools.invalidate(name)
      this.notify('mcpServer/oauthLogin/completed', { name, success: result.success, error: result.success ? null : result.error ?? 'Sign-in timed out.' })
    })()
    return { authorizationUrl: url }
  },

  /** codeDesktop/mcpServer/logout on 2.x: the connector's credentials deleted (v2 reconnects it: needs_auth). */
  async mcpLogoutV2(params) {
    const directory = this.directoryFor(params)
    const name = String(params.name ?? '')
    if (!name) throw invalidParams('name is required')
    const api = await this.v2Api()
    const { integration } = await this.mcpIntegrationV2(api, directory, name)
    await this.deleteCredentialsV2(api, this.credentialIdsV2(integration))
    this.mcpTools.invalidate(name)
    await this.refreshMcpNames().catch(() => {})
    return {}
  },

  // ---------------------------------------------------------------- skills / commands

  /**
   * One folder's location reloaded (new skills, commands, config) when nothing runs there: DELETE /api/debug/location,
   * then the reloaded location's plugins waited for (locationActivatedV2).
   */
  async reloadDirectoryV2(directory) {
    const busy = [...this.threads.values(), ...this.children.values()].some((thread) => thread.cwd === directory && (thread.busy || thread.activeTurn))
    if (busy) return false
    const api = await this.v2Api()
    try { await api.delete('/api/debug/location', { location: directory }) } catch (error) { this.log(`location reload ${directory}: ${error?.message ?? error}`); return true }
    this.pluginGuardResetV2()
    if (!await this.locationActivatedV2(api, directory)) this.log(`location reload ${directory}: no skills listed after the reload`)
    return true
  },

  /**
   * Wait until a freshly loaded location has run its plugins: GET /api/skill and GET /api/command don't (server/src/
   * handlers/skill.ts, command.ts), GET /api/agent does (awaitPlugins, its 503 retried by V2Api). The latch is closed
   * while the location's layer is built (plugin/supervisor.ts holds it before the first activation is forked), so that
   * one request covers the whole first activation. One GET /api/skill after it, for the log only: 2.2.5's own skill
   * plugin always adds opencode and report (a location with every skill plugin removed lists none at all).
   * @returns {Promise<boolean>} whether skills were listed
   */
  async locationActivatedV2(api, directory) {
    try { await api.get('/api/agent', { location: directory, timeout: 10000 }) } catch (error) { this.log(`location ${directory}: ${error?.message ?? error}`); return false }
    try { const skills = await api.get('/api/skill', { location: directory }); return Array.isArray(skills) && skills.length > 0 } catch { return false }
  },

  /** name → ids of the skills listed (kept in settings.json: the overlay and the rules deny a turned-off skill by id too). */
  rememberSkillIdsV2(skills) {
    const stored = this.settings().skillIdsV2
    const ids = isRecord(stored) ? { ...stored } : {}
    let changed = false
    for (const skill of skills) {
      if (typeof skill?.name !== 'string' || typeof skill.id !== 'string' || skill.id === skill.name) continue
      const list = Array.isArray(ids[skill.name]) ? ids[skill.name] : []
      if (!list.includes(skill.id)) { ids[skill.name] = [...list, skill.id].slice(-8); changed = true }
    }
    if (!changed) return false
    this.saveSettings({ skillIdsV2: ids })
    return true
  },

  /** A newly learned id of a turned-off skill: the overlay and the live sessions' rules deny it too. */
  async skillIdsLearnedV2(skills) {
    if (!this.rememberSkillIdsV2(skills)) return
    const disabled = new Set(this.disabledSkills())
    if (!skills.some((skill) => disabled.has(skill?.name))) return
    this.config.rewriteConfig()
    for (const thread of [...this.threads.values(), ...this.children.values()]) await thread.applyRules().catch(() => {})
  },

  async skillsListV2(params) {
    const cwds = Array.isArray(params.cwds) && params.cwds.length ? params.cwds : [this.directoryFor(params)]
    if (params.forceReload === true) for (const cwd of cwds) await this.reloadDirectoryV2(cwd)
    const api = await this.v2Api()
    const disabled = new Set(this.disabledSkills())
    const data = []
    for (const cwd of cwds) {
      const skills = []
      const errors = []
      let listed = []
      try { listed = await api.get('/api/skill', { location: cwd }); listed = Array.isArray(listed) ? listed : [] } catch (error) { errors.push({ path: cwd, message: error?.message || String(error) }) }
      await this.skillIdsLearnedV2(listed).catch((error) => this.log(`skill ids: ${error?.message ?? error}`))
      // v2 names files under the folder it resolved (fs.resolve: /var → /private/var on macOS).
      let real = cwd
      try { real = fs.realpathSync(cwd) } catch {}
      const inRepo = (file) => file.startsWith(cwd + path.sep) || file.startsWith(real + path.sep)
      for (const skill of listed) {
        if (typeof skill?.name !== 'string' || !skill.name) continue
        const id = typeof skill.id === 'string' && skill.id ? skill.id : skill.name
        const builtIn = BUILTIN_SKILLS_V2.has(id) && String(skill.path ?? '').startsWith('/builtin/')
        const file = !builtIn && typeof skill.path === 'string' && path.isAbsolute(skill.path) ? skill.path : `builtin:${id}`
        const description = typeof skill.description === 'string' ? skill.description : ''
        const short = description.split('\n')[0].slice(0, 160)
        skills.push({
          name: skill.name, description, shortDescription: short, interface: { displayName: skill.name, shortDescription: short },
          path: file, scope: builtIn ? 'system' : inRepo(file) ? 'repo' : 'user', enabled: !disabled.has(skill.name) && !disabled.has(id), pluginId: null,
          // autoinvoke false: only the user's /name loads it.
          ...(skill.autoinvoke === false ? { modelInvocable: false } : {}),
          codeDesktop: { id },
        })
      }
      for (const row of await this.commandsV2(api, cwd, skills).catch((error) => { this.log(`commands ${cwd}: ${error?.message ?? error}`); return [] })) skills.push(row)
      data.push({ cwd, skills, errors })
    }
    return { data }
  },

  /** A folder's slash commands (GET /api/command) as skills/list rows; `skills` are the folder's skill rows. */
  async commandsV2(api, cwd, skills) {
    const [commands, entries, servers] = await Promise.all([
      api.get('/api/command', { location: cwd }),
      this.configEntriesV2(cwd),
      this.mcpListV2(cwd).catch(() => []),
    ])
    const mcpNames = new Map(servers.map((server) => [sanitizeMcp(server.name), server.name]))
    const rows = []
    for (const command of Array.isArray(commands) ? commands : []) {
      if (typeof command?.name !== 'string' || !command.name || HIDDEN_COMMANDS_V2.has(command.name)) continue
      const description = typeof command.description === 'string' ? command.description : ''
      const shadowed = skills.find((skill) => skill.name === command.name && skill.userInvocable !== false)
      if (shadowed) Object.assign(shadowed, { userInvocable: false, modelInvocable: shadowed.enabled })
      const prefix = command.name.includes(':') ? command.name.slice(0, command.name.indexOf(':')) : null
      const origin = prefix && mcpNames.has(prefix)
        ? { path: `command:${command.name}`, scope: 'user', codeDesktop: { server: mcpNames.get(prefix), kind: 'mcpPrompt' } }
        : this.commandOriginV2(command.name, entries)
      const hint = templateHint(origin.codeDesktop.template)
      rows.push({
        name: command.name, description, shortDescription: description.slice(0, 160), interface: { displayName: command.name, shortDescription: description.slice(0, 160) },
        path: origin.path, scope: origin.scope, enabled: true, pluginId: null, userInvocable: true, modelInvocable: false, toggleable: false,
        codeDesktop: origin.codeDesktop, ...(hint ? { argumentHint: hint } : {}),
      })
    }
    return rows
  },

  /**
   * Where a command comes from, as v2 loads them (config/plugin/command.ts): each entry in order, a document's
   * `commands.<name>` or a directory's `{command,commands}/<name>.md`, the last one winning; else one of v2's own
   * (init, review) or a plugin's. {path, scope, codeDesktop: {kind, template?, agent?, model?, subtask?}}.
   */
  commandOriginV2(name, entries) {
    const options = (info) => {
      const model = modelIdOf(info.model)
      return {
        ...(typeof info.template === 'string' ? { template: info.template.slice(0, 65536) } : {}),
        ...(typeof info.agent === 'string' && info.agent ? { agent: info.agent } : {}), ...(model ? { model } : {}),
        ...(info.subagent === true || info.subtask === true ? { subtask: true } : {}),
      }
    }
    for (const entry of [...(Array.isArray(entries) ? entries : [])].reverse()) {
      if (entry?.type === 'document' && isRecord(entry.info?.commands?.[name])) {
        if (entry.path === this.config.configPath) continue
        return { path: `command:${name}`, scope: this.userDocumentV2(entry.path) ? 'user' : 'repo', codeDesktop: { kind: 'config', ...options(entry.info.commands[name]) } }
      }
      if (entry?.type !== 'directory' || typeof entry.path !== 'string') continue
      for (const folder of ['command', 'commands']) {
        const file = path.join(entry.path, folder, `${name}.md`)
        let text
        try { if (!fs.statSync(file).isFile()) continue; text = fs.readFileSync(file, 'utf8') } catch { continue }
        const { data, body } = markdownParts(text)
        return { path: file, scope: this.userRootsV2().some((root) => within(root, entry.path)) ? 'user' : 'repo', codeDesktop: { kind: 'command', ...options({ ...data, template: body }) } }
      }
    }
    if (BUILTIN_COMMANDS_V2.has(name)) return { path: `command:${name}`, scope: 'system', codeDesktop: { kind: 'builtin' } }
    return { path: `command:${name}`, scope: 'user', codeDesktop: { kind: 'config' } }
  },

  /**
   * skills/config/write on 2.x: the switch kept by name, the skill's ids learned (v2 denies by id). A skill is a
   * folder's SKILL.md or a .md file right in a skills root (config/plugin/skill-scan.ts, id: its file name); a command
   * row (command:<name>, {command,commands}/<name>.md) has no switch.
   */
  async skillsWriteV2(params) {
    const file = String(params.path ?? '')
    const standalone = file.endsWith('.md') && !file.endsWith('SKILL.md')
    if (file.startsWith('command:') || (standalone && commandFileV2(file))) throw invalidParams('Commands cannot be turned off.')
    let listed = []
    try { listed = await (await this.v2Api()).get('/api/skill', { location: this.directoryFor(params) }); listed = Array.isArray(listed) ? listed : [] } catch {}
    const id = file.startsWith('builtin:') ? file.slice(8) : null
    const skill = listed.find((entry) => (id ? entry?.id === id : entry?.path === file))
    if (!skill && !id && standalone && !/^skills?$/.test(path.basename(path.dirname(file)))) throw invalidParams('Commands cannot be turned off.')
    const name = skill?.name ?? (id || (standalone ? path.basename(file, '.md') : path.basename(path.dirname(file))))
    if (!name) throw invalidParams('Unknown skill.')
    this.rememberSkillIdsV2(skill ? [skill] : [])
    const disabled = new Set(this.disabledSkills())
    if (params.enabled === false) disabled.add(name)
    else { disabled.delete(name); if (skill?.id) disabled.delete(skill.id) }
    this.saveSettings({ disabledSkills: [...disabled] })
    for (const thread of [...this.threads.values(), ...this.children.values()]) await thread.applyRules().catch(() => {})
    await this.reloadConfig()
    this.notify('skills/changed', {})
    return { effectiveEnabled: !disabled.has(name) }
  },

  // ---------------------------------------------------------------- plugins

  /** Whether a listed plugin is the bridge's own (its plugin folder, the app's or a workflow runner's). */
  bridgePluginV2(plugin) {
    if (plugin?.source?.type !== 'local' || typeof plugin.source.path !== 'string') return plugin?.id === PLUGIN_ID
    const file = path.resolve(plugin.source.path)
    return within(path.join(this.stateDir, 'opencode-plugin'), file) || (within(path.join(this.stateDir, 'workflow-runs'), file) && file.includes(`${path.sep}opencode-plugin${path.sep}`))
  },

  /** Where a listed plugin comes from by the folder's config entries: {kind, file?, folder?, options?}. */
  pluginOriginV2(spec, plugin, entries) {
    if (plugin?.source?.type === 'local') {
      const parent = path.dirname(spec)
      if (/^plugins?$/.test(path.basename(parent))) {
        const folder = path.dirname(parent)
        return { kind: this.userRootsV2().some((root) => within(root, folder)) ? 'globalFolder' : 'projectFolder', folder: parent, file: spec }
      }
    }
    for (const entry of [...(Array.isArray(entries) ? entries : [])].reverse()) {
      if (entry?.type !== 'document' || !Array.isArray(entry.info?.plugins)) continue
      for (const op of entry.info.plugins) {
        const target = typeof op === 'string' ? op : isRecord(op) && typeof op.package === 'string' ? op.package : null
        if (!target || target.startsWith('-')) continue
        const resolved = /^\.\.?\//.test(target) && entry.path ? path.resolve(path.dirname(entry.path), target) : target
        if (resolved !== spec) continue
        const options = isRecord(op) && isRecord(op.options) && Object.keys(op.options).length ? op.options : null
        if (entry.path === this.config.configPath) return { kind: 'codeDesktop', options }
        return { kind: this.userDocumentV2(entry.path) ? 'globalConfig' : 'projectConfig', file: entry.path ?? null, options }
      }
    }
    return { kind: 'globalConfig', file: null, options: null }
  },

  /** The file a plugin loads from, for reading its source: a local folder's entry, or the npm package in v2's cache. */
  pluginSourceFileV2(spec) {
    if (typeof spec !== 'string' || !spec) return null
    if (path.isAbsolute(spec)) {
      try { return fs.statSync(spec).isDirectory() ? entryOf(spec) : spec } catch { return null }
    }
    // util/src/npm.ts: <cache>/opencode/npm/<name>@<spec|latest>/<generation>/node_modules/<name>, newest generation.
    const name = pluginIdOf(spec)
    if (!name || !/^(@[\w.-]+\/)?[\w.-]+$/.test(name)) return null
    const version = spec.length > name.length + 1 && spec[name.length] === '@' ? spec.slice(name.length + 1) : 'latest'
    const root = path.join(this.env.XDG_CACHE_HOME || path.join(this.homeDir(), '.cache'), 'opencode', 'npm', `${name}@${version}`)
    let generations = []
    try { generations = fs.readdirSync(root).filter((entry) => /^\d+$/.test(entry)).sort((a, b) => Number(b) - Number(a)) } catch { return null }
    for (const generation of generations) {
      const dir = path.join(root, generation, 'node_modules', name)
      const file = entryOf(dir)
      if (file) return file
      try { return createRequire(path.join(root, generation, 'index.js')).resolve(name) } catch {}
    }
    return null
  },

  /**
   * plugin/installed on 2.x: GET /api/plugin of the home folder and the project folders (built-ins, SDK ones and the
   * bridge's own left out), plus the plugins added here (settings.json), each with where it comes from and its state.
   */
  async pluginsInstalledV2(params = {}) {
    const own = this.pluginSettings()
    const home = this.homeDir()
    const api = await this.v2Api()
    const folders = [home, ...this.pluginProjects(params).filter((cwd) => cwd !== home)]
    const lists = await Promise.all(folders.map(async (folder) => {
      const [plugins, entries] = await Promise.all([
        api.get('/api/plugin', { location: folder }).then((list) => (Array.isArray(list) ? list : []), (error) => { this.log(`plugins ${folder}: ${error?.message ?? error}`); return [] }),
        this.configEntriesV2(folder),
      ])
      return { plugins, entries }
    }))
    const found = new Map()
    folders.forEach((folder, index) => {
      for (const plugin of lists[index].plugins) {
        const spec = pluginSpecV2(plugin)
        if (!spec || this.bridgePluginV2(plugin) || found.has(spec)) continue
        found.set(spec, { plugin, project: folder === home ? null : folder, origin: this.pluginOriginV2(spec, plugin, lists[index].entries) })
      }
    })
    const plugins = []
    for (const spec of [...new Set([...found.keys(), ...own.installed, ...own.disabled])]) {
      const mine = own.installed.includes(spec) || own.disabled.includes(spec)
      const listed = found.get(spec) ?? { plugin: null, project: null, origin: { kind: 'globalConfig', file: null, options: null } }
      const origin = mine ? { kind: 'codeDesktop' } : listed.origin
      const name = pluginNameV2(spec)
      const about = this.pluginOriginText(origin, spec, listed.origin.options ?? null)
      const state = listed.plugin?.state
      const failed = state?.status === 'failed' ? String(state.error ?? 'Failed to load.') : null
      // 1.x plugins fail to load (no default {id, setup}); one not loaded yet is told by its source.
      const shape = own.disabled.includes(spec) ? 'unknown' : pluginContentsV2(readSource(this.pluginSourceFileV2(spec))).shape
      const incompatible = (failed !== null && V1_FAILURE.test(failed)) || (state?.status !== 'active' && shape === 'v1')
      const loadError = own.disabled.includes(spec) ? null : incompatible ? `${INCOMPATIBLE_PLUGIN}${failed ? ` (${failed})` : ''}` : failed
      plugins.push({
        id: spec, name, installed: true, enabled: !own.disabled.includes(spec), version: listed.plugin?.source?.version ?? /@([^@/]+)$/.exec(spec)?.[1] ?? null,
        source: { type: path.isAbsolute(spec) ? 'local' : 'npm' },
        interface: { displayName: name, shortDescription: about.en, developerName: null },
        codeDesktop: {
          title: name, description: about, removable: mine, readOnlyReason: mine ? null : about.readOnly,
          loadError, ...(incompatible ? { incompatible: true } : {}), optional: false, held: false, experimental: false, icon: null, components: [],
          origin: origin.kind, ...(origin.folder ? { originPath: origin.folder } : {}), ...(listed.project ? { project: listed.project } : {}), ...(listed.origin.options ? { options: listed.origin.options } : {}),
          ...(listed.plugin?.id ? { pluginId: listed.plugin.id } : {}), ...(listed.plugin?.source?.outdated ? { outdated: true } : {}),
        },
      })
    }
    return { marketplaces: [{ name: `${this.flavor.name} plugins`, path: this.config.configPath, interface: { displayName: `${this.flavor.name} plugins` }, plugins }] }
  },

  /** plugin/read on 2.x: the hooks and tools its source registers (v2 has no tool list to check them against). */
  async pluginReadV2(params) {
    const list = (await this.pluginsInstalledV2(params)).marketplaces[0].plugins
    const plugin = list.find((candidate) => candidate.id === params.pluginName) ?? list.find((candidate) => candidate.name === params.pluginName)
    if (!plugin) throw invalidParams(`Unknown plugin: ${params.pluginName}`)
    const found = pluginContentsV2(readSource(this.pluginSourceFileV2(plugin.id)))
    const description = plugin.codeDesktop.description?.en ?? plugin.id
    return { plugin: { ...plugin, description, skills: [], mcpServers: [], hooks: found.hooks.map((name) => ({ key: name, eventName: '' })), tools: found.tools.map((name) => ({ name, description: '' })) } }
  },

  /**
   * An install's verdict on 2.x: the plugin's state once GET /api/plugin lists it (the overlay's reload installs it
   * first: npm can take a while), its error when it failed, null when it loaded or isn't listed in time.
   */
  async pluginVerdictV2(spec) {
    const api = await this.v2Api()
    const waitMs = this.v2.pluginVerdictMs ?? PLUGIN_VERDICT_MS
    const until = Date.now() + waitMs
    const id = pluginIdOf(spec)
    for (;;) {
      let list = []
      try { list = await api.get('/api/plugin', { location: this.homeDir() }) } catch {}
      const plugin = (Array.isArray(list) ? list : []).find((entry) => {
        const target = pluginSpecV2(entry)
        return target === spec || (id && entry?.source?.type === 'package' && pluginIdOf(target) === id)
      })
      if (plugin?.state?.status === 'failed') return V1_FAILURE.test(String(plugin.state.error ?? '')) ? `${INCOMPATIBLE_PLUGIN} (${plugin.state.error})` : String(plugin.state.error ?? 'Failed to load.')
      if (plugin?.state?.status === 'active' || Date.now() >= until) return null
      await new Promise((resolve) => setTimeout(resolve, Math.min(this.v2.pluginPollMs ?? 500, Math.max(1, until - Date.now()))))
    }
  },

  /**
   * plugin.updated (a plugin added, loaded, failed; each location publishes its own): every folder that changed during
   * a burst has its list read again; new failures reported.
   */
  pluginsUpdatedV2(event) {
    // At once, not after the burst: a turn started meanwhile checks its folder again (bridgePluginGuardV2).
    this.pluginGuardResetV2()
    const pending = (this.v2.pluginDirs ??= new Set())
    pending.add(event?.directory ?? this.homeDir())
    clearTimeout(this.v2.pluginTimer)
    this.v2.pluginTimer = setTimeout(() => {
      this.v2.pluginTimer = null
      const directories = [...pending]
      pending.clear()
      if (this.closed) return
      for (const directory of directories) void this.pluginFailuresV2(directory).catch((error) => this.log(`plugins ${directory}: ${error?.message ?? error}`))
    }, this.v2.pluginDebounceMs ?? 250)
    this.v2.pluginTimer.unref?.()
  },

  /**
   * A folder's plugin failures (the bridge's own too: without it there is no sandbox, prompt or approval policy): each
   * new one is a notice; a change in them is codeDesktop/plugin/changed {reason:'loadError'} for Customize › Plugins.
   */
  async pluginFailuresV2(directory) {
    const list = await (await this.v2Api()).get('/api/plugin', { location: directory })
    const failures = new Map()
    for (const plugin of Array.isArray(list) ? list : []) {
      if (plugin?.state?.status !== 'failed' || plugin.source?.type === 'builtin') continue
      failures.set(this.bridgePluginV2(plugin) ? PLUGIN_ID : pluginSpecV2(plugin) ?? plugin.id ?? '?', String(plugin.state.error ?? 'Failed to load.'))
    }
    const known = (this.v2.pluginFailures ??= new Map())
    const before = known.get(directory) ?? new Map()
    let changed = before.size !== failures.size
    for (const [spec, error] of failures) {
      if (before.get(spec) === error) continue
      changed = true
      if (spec === PLUGIN_ID) this.log(`OpenClaude Desktop's plugin failed to load in ${directory}: ${error}`)
      const incompatible = V1_FAILURE.test(error)
      this.globalNotice('configWarning', { summary: spec === PLUGIN_ID ? `OpenClaude Desktop's ${this.flavor.name} plugin failed to load: ${error}` : `Plugin ${spec} failed to load${incompatible ? ' (written for OpenCode 1.x)' : ''}: ${error}`, details: null })
    }
    known.set(directory, failures)
    if (changed) this.notify('codeDesktop/plugin/changed', { reason: 'loadError' })
    this.pluginGuardListedV2(directory, list)
    return failures
  },

  // ---------------------------------------------------------------- the bridge plugin's guard

  /**
   * Whether the bridge's own plugin is listed active in one folder's GET /api/plugin (bridgePluginGuardV2's verdict):
   * {ok, activated, reason}. Only the bridge's own folder counts (a local plugin at this.config.pluginDir): a project
   * plugin that claims the id `code-desktop` loads first and is not it. `activated`: the list is a finished activation's,
   * which always holds the plugins no `"-…"` can remove (GUARDED_PLUGINS_V2); a location's first list before that is [].
   */
  bridgePluginStatusV2(list) {
    const plugins = Array.isArray(list) ? list : []
    const activated = plugins.some((plugin) => GUARDED_PLUGINS_V2.has(plugin?.id))
    const own = plugins.find((plugin) => this.ownPluginV2(plugin))
    if (own?.state?.status === 'active') return { ok: true, activated, reason: null }
    if (!activated) return { ok: false, activated, reason: 'its plugins have not finished loading' }
    if (own?.state?.status === 'failed') {
      const error = String(own.state.error ?? 'Failed to load.')
      if (/^Duplicate plugin ID/i.test(error)) return { ok: false, activated, reason: `another plugin there uses its id \`${PLUGIN_ID}\` and loads first (a plugins folder of the project or of your config)` }
      return { ok: false, activated, reason: `it failed to load: ${error}` }
    }
    if (own) return { ok: false, activated, reason: `it is ${own.state?.status ?? 'not active'}` }
    return { ok: false, activated, reason: 'it is not loaded there (only a managed config, /Library/Application Support/opencode or an MDM profile, loads after the bridge’s and can remove it with its "plugins" list)' }
  },

  /** A listed plugin that is the bridge's own folder (this bridge's: not a workflow runner's or another state's). */
  ownPluginV2(plugin) {
    if (plugin?.source?.type !== 'local' || typeof plugin.source.path !== 'string') return false
    return within(path.resolve(this.config.pluginDir), path.resolve(plugin.source.path))
  },

  /**
   * Fail closed (live round 2, probe item 7): no turn runs in a folder where the bridge's plugin isn't active. Without it
   * that folder has no sandbox profile selection (sub-agents), custom system prompt, edit guard or policy denials. The
   * prevention is the load order (core/src/config.ts load: managed policies, integrations, well-known, the global folder,
   * OPENCODE_CONFIG, the project's opencode.json(c) files, its .opencode folders, OPENCODE_CONFIG_CONTENT, managed
   * settings last) with plugin/supervisor.ts folding every document's `plugins` operations in that order (folder-found
   * plugins first): the bridge's entry in OPENCODE_CONFIG_CONTENT loads it again after any user or project `"-*"` /
   * `"-code-desktop"`. What that can't cover: a managed config (it loads later), a plugin claiming the same id (the first
   * in boot order wins; the bridge's is listed failed "Duplicate plugin ID"), a failed load. So each folder is checked
   * before its first turn (GET /api/agent first: GET /api/plugin doesn't await the location's activation,
   * server/src/handlers/plugin.ts, and a location loaded just now lists [] — the probe's "GONE []"), and again after a
   * plugin.updated or location.shutdown (pluginsUpdatedV2: every verdict dropped, the folder's list reread, its turns
   * interrupted when the plugin is gone). Only an active verdict is kept; a refusal is checked again at the next try.
   * @throws {RpcError} the folder's refusal, or a failed check
   */
  async bridgePluginGuardV2(directory) {
    const dir = directory || this.homeDir()
    const guard = (this.v2.pluginGuard ??= new Map())
    let entry = guard.get(dir)
    if (!entry) {
      entry = { status: null, promise: null }
      entry.promise = this.checkBridgePluginV2(dir).then((status) => {
        if (guard.get(dir) === entry) { if (status.ok) entry.status = status; else guard.delete(dir) }
        return status
      }, (error) => {
        if (guard.get(dir) === entry) guard.delete(dir)
        throw error
      })
      guard.set(dir, entry)
    }
    let status = entry.status
    if (!status) {
      try { status = await entry.promise } catch (error) {
        throw new RpcError(-32000, `Couldn't check that OpenClaude Desktop's ${this.flavor.name} plugin runs in ${dir}: ${error?.message ?? error}. Without it there is no sandbox, custom prompt or edit guard, so no turn runs there.`)
      }
    }
    if (!status.ok) throw new RpcError(-32000, bridgePluginRefusalV2(this.flavor.name, dir, status.reason))
  },

  /** One folder's verdict, after its location's plugins have run (GET /api/agent awaits them; V2Api retries their 503). */
  async checkBridgePluginV2(directory) {
    const api = await this.v2Api()
    await api.get('/api/agent', { location: directory, timeout: 10000 })
    const status = this.bridgePluginStatusV2(await api.get('/api/plugin', { location: directory }))
    if (!status.ok) this.log(`OpenClaude Desktop's plugin is not active in ${directory}: ${status.reason}`)
    return status
  },

  /**
   * A folder's plugin list read after plugin.updated (pluginFailuresV2): an active plugin is the folder's verdict again;
   * a finished list without it interrupts the turns running there (a refusal for the next one comes from the check).
   */
  pluginGuardListedV2(directory, list) {
    const status = this.bridgePluginStatusV2(list)
    const guard = (this.v2.pluginGuard ??= new Map())
    if (status.ok) {
      if (!guard.has(directory)) guard.set(directory, { status, promise: Promise.resolve(status) })
      return
    }
    guard.delete(directory)
    if (!status.activated) return
    const running = [...this.threads.values(), ...this.children.values()].filter((thread) => (thread.busy || thread.activeTurn) && sameDirectory(thread.cwd, directory))
    if (!running.length) return
    const message = bridgePluginRefusalV2(this.flavor.name, directory, status.reason)
    this.log(`plugin guard ${directory}: interrupting ${running.length} turn(s): ${status.reason}`)
    this.globalNotice('configWarning', { summary: message, details: null })
    // An interrupted turn carries no error (finishTurn): the notice says why.
    for (const thread of running) void thread.interruptV2().catch((error) => this.log(`interrupt ${thread.id}: ${error?.message ?? error}`))
  },

  /** Every folder's verdict dropped (plugin.updated, location.shutdown): v2's folder names may not be the threads' cwd. */
  pluginGuardResetV2() {
    this.v2.pluginGuard?.clear()
  },

  // ---------------------------------------------------------------- agents

  /**
   * After an agent file was written or removed: v2 reloads its agents itself (the folders are watched); the list is
   * read until it has (or no longer has) the agent, for a few seconds at most.
   */
  async agentChangedV2(directory, name, present) {
    this.agentListCache?.clear()
    this.agentDirCache?.clear()
    const api = await this.v2Api()
    const until = Date.now() + (this.v2.agentWaitMs ?? AGENT_WAIT_MS)
    for (;;) {
      let agents = []
      try { agents = await api.get('/api/agent', { location: directory, timeout: 10000 }) } catch {}
      if ((Array.isArray(agents) && agents.some((agent) => agent?.id === name)) === present || Date.now() >= until) break
      await new Promise((resolve) => setTimeout(resolve, POLL_MS))
    }
    this.agentListCache?.clear()
  },

  // ---------------------------------------------------------------- tools

  /** codeDesktop/tools/list on 2.x: its built-ins (fixed list), the folder's MCP tools and skills. */
  async toolsListV2(params) {
    const directory = this.directoryFor(params)
    const servers = []
    for (const [name, config] of await this.mcpServers(directory)) servers.push({ name, tools: config.enabled === false ? [] : await this.mcpTools.tools(name, config) })
    let skills = []
    try { skills = await (await this.v2Api()).get('/api/skill', { location: directory }) } catch {}
    return toolsListResponse(BUILTIN_TOOLS_V2, servers, Array.isArray(skills) ? skills : [], this.flavor)
  },
}

/** A plugin's display name: a package's name without its version, a local plugin's folder or file name. */
export function pluginNameV2(spec) {
  const value = String(spec)
  if (path.isAbsolute(value)) return path.basename(value.replace(/\/+$/, '')).replace(/\.(m?js|ts)$/, '')
  return pluginIdOf(value) ?? value
}
