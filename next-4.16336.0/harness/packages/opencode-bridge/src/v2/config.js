/**
 * The bridge's generated config under OpenCode 2.x (../config.js is 1.x's and MiMo's). v2 reads OPENCODE_CONFIG_DIR as
 * a *replacement* for the user's global config folder (util/src/global.ts), which would hide their opencode.json,
 * AGENTS.md, plugins, skills and commands, so it is never set. Instead (core/src/config.ts load order):
 *
 *   OPENCODE_CONFIG=<state>/config-v2/opencode.json        above the user's global config, below a project's
 *     providers   Settings › Models custom providers, v2's own keys (`aisdk:` packages, settings.baseURL, keys only
 *                 as {env:CODE_DESKTOP_PROVIDER_KEY_<ROUTE>} references, never written here)
 *     mcp.servers Connectors added in Customize › Connectors (<state>/mcp.json) and OpenClaude Desktop's own
 *                 code_desktop server with codemode:false (its tools stay direct tools, not behind Code Mode's
 *                 `execute`); the user's own servers turned off there are disabled by the plugin (plugin.js), since v2
 *                 drops an {enabled:false} entry; this file doesn't change then, so the plugin itself reloads MCP when
 *                 mcp.json's `disabled` list does
 *     permissions Customize › Skills switches ({action:'skill', resource, effect:'deny'}, by name and by every id
 *                 GET /api/skill gave that name: settings.json skillIdsV2)
 *     plugins     Plugins added in OpenClaude Desktop
 *     websearch   false when '{core} settings' › web search is off (on or unset: OpenCode's own selection, so the
 *                 provider a user's own config chose stands)
 *     share       'manual'
 *     + the file the user's own OPENCODE_CONFIG named (merged under the bridge's keys, its relative paths anchored: a
 *       copy, so a key written literally in it is copied too; it is re-read at the bridge's next rewrite only)
 *     + CODE_DESKTOP_OPENCODE_CONFIG_EXTRA (JSON) merged last
 *   OPENCODE_CONFIG_CONTENT                                 above every project config (fixed at serve's start)
 *     shell        the sandbox wrapper: a repository's `"shell": "/bin/bash"` must not bypass the sandbox
 *     plugins      the bridge's plugin directory: a project's `"plugins": ["-*"]` must not remove it (plugin/supervisor.ts
 *                  folds every document's operations in load order, so this later add loads it again; only managed
 *                  settings load after this, and a project plugin claiming its id loads first: turns are refused
 *                  where it isn't active, v2/extensions.js bridgePluginGuardV2)
 *     experimental the user's own (Config.latest takes the whole object from the last document) + todo:true
 *     (over the user's own OPENCODE_CONFIG_CONTENT, which this one replaces in serve's environment)
 *   <state>/opencode-plugin/code-desktop/index.js           the plugin (plugin.js; v2 takes a configured local plugin
 *                                                           only as a directory)
 *   <runtime>/shell-v2/<name>                               the sandbox wrapper (sandbox.js)
 *
 * A workflow runner's bridge (CODE_DESKTOP_WORKFLOW_RUNNER=1) writes its config and plugin under
 * <state>/workflow-runs/<pid>/ (no code_desktop server there); the v2 config folder is not 1.x's (<state>/config), so
 * neither generation overwrites the other's when they share a state folder.
 *
 * mergeConfigEntries reads GET /api/config (Config.Entry[], lowest first) back as one config, the way v2 combines it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { BridgeConfig, ROUTE, agentShell, parseJsonc, providerKeyEnv, readJson, sdkBaseURL, writeAtomic } from '../config.js'
import { storedCoreSettings } from '../core-settings.js'
import { appToolsServer } from '../app-tools.js'
import { PLUGIN_ENTRY, PLUGIN_ID, pluginSourceV2 } from './plugin.js'
import { shellWrapperV2 } from './sandbox.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
/** Keys whose values v2 concatenates across documents instead of taking the last one. */
const LISTS = new Set(['permissions', 'instructions', 'skills', 'policies'])
/** Keys whose records v2 merges entry by entry (a later entry replaces an earlier one of the same name). */
const RECORDS = new Set(['commands', 'agents', 'references', 'providers'])
/** The app-tools channel's variables, filled in from serve's environment (never written to a file). */
const APP_TOOLS_ENV = ['CODE_DESKTOP_AGENT_TOOLS_SOCKET', 'CODE_DESKTOP_AGENT_TOOLS_TOKEN']
const APP_TOOLS_TIMEOUT = Object.freeze({ execution: 600000 })
/** The code_desktop server's pointer to the bridge's runtime folder (sessions/<id>.json, sandbox/<id>.root). */
export const RUNTIME_ENV = 'CODE_DESKTOP_OPENCODE_RUNTIME'

const ints = (value) => (isRecord(value) ? Object.fromEntries(['context', 'input', 'output'].filter((key) => Number.isFinite(value[key])).map((key) => [key, Math.trunc(value[key])])) : null)

/**
 * The `skill` resources a turned-off skill is denied by: its name, and every id the bridge has seen it under (v2 checks a
 * skill by id, which a built-in's or a renamed folder's name isn't). `ids`: name → id or [ids].
 */
export function skillResourcesV2(names, ids = {}) {
  const out = []
  for (const name of Array.isArray(names) ? names : []) {
    if (typeof name !== 'string' || !name) continue
    const known = ids?.[name]
    out.push(name, ...(Array.isArray(known) ? known : [known]).filter((id) => typeof id === 'string' && id))
  }
  return [...new Set(out)]
}

/**
 * Settings › Models custom providers → v2 `providers` entries (config/provider.ts). Reasoning efforts are the model's
 * variants, which v2 builds from `capabilities.reasoning` (config/plugin/provider.ts, variant.ts): left out, a custom
 * model gets its package's default efforts (anthropic: low … max); `{supported:false}` gets none; `{supported:true}`
 * without a control (toggle / effort / budget) gets none either. So a reasoning model leaves it out and any other says
 * `supported:false` (1.x's `reasoning` flag: no flag, no variants).
 */
export function providerOverlayV2(providers, env = process.env) {
  const out = {}
  for (const provider of Array.isArray(providers) ? providers : []) {
    if (!isRecord(provider) || !ROUTE.test(String(provider.route ?? '')) || typeof provider.baseURL !== 'string') continue
    const api = provider.api ?? 'openai-completions'
    const npm = api === 'anthropic-messages' ? '@ai-sdk/anthropic' : api === 'openai-responses' ? '@ai-sdk/openai' : '@ai-sdk/openai-compatible'
    const keyEnv = providerKeyEnv(provider.route)
    const models = {}
    for (const id of Array.isArray(provider.models) ? provider.models : []) {
      if (typeof id !== 'string' || !id) continue
      const meta = isRecord(provider.modelInfo?.[id]) ? provider.modelInfo[id] : {}
      const limit = ints(meta.limit)
      // Unset capabilities fall back to v2's defaults, which take images: a model without attachments says text only.
      models[id] = {
        name: meta.name ?? id,
        capabilities: { tools: true, temperature: true, input: meta.attachment ? ['text', 'image'] : ['text'], output: ['text'], ...(meta.reasoning ? {} : { reasoning: { supported: false } }) },
        ...(limit && Object.keys(limit).length ? { limit } : {}),
      }
    }
    out[provider.route] = {
      name: provider.displayName || provider.route,
      package: `aisdk:${npm}`,
      settings: { baseURL: sdkBaseURL(api, provider.baseURL), ...(env[keyEnv] ? { apiKey: `{env:${keyEnv}}` } : {}) },
      models,
    }
  }
  return out
}

/** An mcp.json connector (1.x's `mcp.<name>` shape, config.js toOpencodeMcp) → v2's `mcp.servers.<name>`. */
export function toV2Mcp(value) {
  if (!isRecord(value)) return null
  const disabled = value.disabled === true || value.enabled === false ? { disabled: true } : {}
  const timeout = Number.isInteger(value.timeout) && value.timeout > 0 ? { timeout: { startup: value.timeout, catalog: value.timeout, execution: value.timeout } } : isRecord(value.timeout) ? { timeout: value.timeout } : {}
  const codemode = typeof value.codemode === 'boolean' ? { codemode: value.codemode } : {}
  if (value.type === 'remote' || (typeof value.url === 'string' && value.url && value.type === undefined)) {
    let oauth = {}
    if (value.oauth === false) oauth = { oauth: false }
    else if (isRecord(value.oauth)) {
      const id = value.oauth.client_id ?? value.oauth.clientId
      const secret = value.oauth.client_secret ?? value.oauth.clientSecret
      const entry = { ...(typeof id === 'string' && id ? { client_id: id } : {}), ...(typeof secret === 'string' && secret ? { client_secret: secret } : {}), ...(typeof value.oauth.scope === 'string' && value.oauth.scope ? { scope: value.oauth.scope } : {}) }
      if (Object.keys(entry).length) oauth = { oauth: entry }
    }
    return { type: 'remote', url: value.url, ...(isRecord(value.headers) ? { headers: value.headers } : {}), ...oauth, ...disabled, ...codemode, ...timeout }
  }
  if (Array.isArray(value.command) && value.command.length) {
    return { type: 'local', command: value.command.map(String), ...(isRecord(value.environment) ? { environment: value.environment } : {}), ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}), ...disabled, ...codemode, ...timeout }
  }
  return null
}

/**
 * OpenClaude Desktop's own server as v2's `mcp.servers` entry: Code Mode off, tool calls up to 10 minutes. `runtimeDir`
 * (CODE_DESKTOP_OPENCODE_RUNTIME): v2 drops an argument a tool's schema doesn't list before the call reaches the server,
 * so the server names the calling session from the call's `_meta` and the bridge's runtime files there
 * (app/electron/agent-tools-opencode.mjs), not from 1.x's SESSION_ARG.
 */
export function appToolsEntryV2(server, runtimeDir) {
  return {
    type: 'local',
    command: [server.command, ...server.args],
    environment: { ...server.env, ...(runtimeDir ? { [RUNTIME_ENV]: runtimeDir } : {}), ...Object.fromEntries(APP_TOOLS_ENV.map((name) => [name, `{env:${name}}`])) },
    codemode: false,
    timeout: { ...APP_TOOLS_TIMEOUT },
  }
}

/** Deep merge of plain objects (a provider's overlays, v2 Provider.mergeOverlay; keys of one document). */
function deepMerge(target, source) {
  if (!isRecord(target) || !isRecord(source)) return source
  const out = { ...target }
  for (const [key, value] of Object.entries(source)) if (value !== undefined) out[key] = deepMerge(out[key], value)
  return out
}

/**
 * Merge config documents as v2 combines them: lists concatenated, named records entry by entry (a provider's entries
 * merged deep), mcp.servers by name. Any other object: `whole` replaces it as Config.latest does (documents read back
 * from GET /api/config); otherwise it is merged deep (two files folded into one document).
 */
export function mergeV2(target, source, { whole = false } = {}) {
  if (!isRecord(target) || !isRecord(source)) return source
  const out = { ...target }
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    if ((LISTS.has(key) || key === 'plugins') && Array.isArray(value)) out[key] = [...(Array.isArray(out[key]) ? out[key] : []), ...value]
    else if (key === 'mcp' && isRecord(value)) out.mcp = { ...(isRecord(out.mcp) ? out.mcp : {}), ...value, ...(isRecord(value.timeout) ? { timeout: { ...out.mcp?.timeout, ...value.timeout } } : {}), ...(isRecord(value.servers) ? { servers: { ...out.mcp?.servers, ...value.servers } } : {}) }
    else if (key === 'providers' && isRecord(value) && isRecord(out[key])) out[key] = Object.fromEntries([...new Set([...Object.keys(out[key]), ...Object.keys(value)])].map((id) => [id, value[id] === undefined ? out[key][id] : deepMerge(out[key][id], value[id])]))
    else if (RECORDS.has(key) && isRecord(value) && isRecord(out[key])) out[key] = { ...out[key], ...value }
    else if (!whole && isRecord(value) && isRecord(out[key])) out[key] = deepMerge(out[key], value)
    else out[key] = value
  }
  return out
}

/**
 * A user config file's relative paths made absolute, for a copy elsewhere: plugins (and 1.x's `plugin` list, which v2
 * still reads: config/normalize.ts, its string and [spec, options] entries), instructions, skills, and every {file:…}
 * that is neither absolute nor ~/ (config/variable.ts resolves the rest against the file's folder, so `{file:key.txt}`
 * would read an empty key next to the copy).
 */
export function anchorConfig(config, dir) {
  if (!isRecord(config)) return {}
  const relative = (value) => typeof value === 'string' && /^\.\.?(?:\/|$)/.test(value)
  const anchor = (value) => (relative(value) ? path.resolve(dir, value) : value)
  const files = (value) => {
    if (typeof value === 'string') return value.replace(/\{file:([^}]+)\}/g, (token, file) => (file.startsWith('~/') || path.isAbsolute(file) ? token : `{file:${path.resolve(dir, file)}}`))
    if (Array.isArray(value)) return value.map(files)
    if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, files(item)]))
    return value
  }
  const out = files(config)
  const plugin = (item) => {
    if (typeof item === 'string') return item.startsWith('-') ? item : anchor(item)
    if (Array.isArray(item) && typeof item[0] === 'string') return [anchor(item[0]), ...item.slice(1)]
    return isRecord(item) ? { ...item, package: anchor(item.package) } : item
  }
  for (const key of ['plugins', 'plugin']) if (Array.isArray(out[key])) out[key] = out[key].map(plugin)
  for (const key of ['instructions', 'skills']) if (Array.isArray(out[key])) out[key] = out[key].map(anchor)
  return out
}

/** Whether a plugin selector (`*`, `x.*`, an id) covers a plugin id (plugin/supervisor.ts matches). */
const selects = (selector, id) => selector === '*' || (selector.endsWith('.*') ? id.startsWith(selector.slice(0, -1)) : selector === id)

/**
 * The id a plugin target loads as, where the bridge can tell without loading it: its own plugin folder is
 * `code-desktop`; an npm spec is taken to be its package name (`@scope/name@1.2` → `@scope/name`); a path: unknown (null).
 */
export function pluginIdOf(target) {
  if (typeof target !== 'string' || !target) return null
  if (path.isAbsolute(target) || target.startsWith('file:')) return path.basename(target.replace(/\/+$/, '')) === PLUGIN_ID ? PLUGIN_ID : null
  if (/^(?:\.|~)/.test(target)) return null
  return /^(@[^/@]+\/[^@]+|[^@]+)/.exec(target)?.[1] ?? null
}

/**
 * GET /api/config's entries (lowest first) as one config, the way v2 reads them: a scalar or object from the last
 * document that sets it (Config.latest), mcp.servers replaced whole by name (mcp.timeout merged), permissions,
 * instructions, skills and policies concatenated, commands / agents / references / providers merged by name, plugins
 * as the add/remove operations applied in order the way plugin/supervisor.ts resolves them: by the plugin's *id*, not
 * its target (`-code-desktop` turns off the bridge's folder, `-pkg` an npm `pkg@1.2`; `*` / `x.*` every match), an add
 * whose target is a known id turns that plugin back on. A path plugin's id is unknown here (pluginIdOf): its target stands in.
 * `exclude` drops documents by path (the bridge's own OPENCODE_CONFIG file, for the user's own rules); `content:false`
 * drops the documents without a path (OPENCODE_CONFIG_CONTENT, the bridge's again).
 * @returns {{ config: object, plugins: Array<{target: string, id: string | null, options: object}>, documents: number }}
 */
export function mergeConfigEntries(entries, { exclude = [], content = true } = {}) {
  const skip = new Set(exclude.filter(Boolean))
  const documents = (Array.isArray(entries) ? entries : []).filter((entry) => entry?.type === 'document' && isRecord(entry.info)
    && !(entry.path && skip.has(entry.path)) && (content || entry.path))
  let config = {}
  const plugins = []
  const key = (plugin) => plugin.id ?? plugin.target
  for (const entry of documents) {
    const { plugins: ops, ...info } = entry.info
    config = mergeV2(config, info, { whole: true })
    for (const op of Array.isArray(ops) ? ops : []) {
      if (typeof op === 'string' && op.startsWith('-') && op.length > 1) {
        for (const plugin of plugins) if (selects(op.slice(1), key(plugin))) plugin.enabled = false
        continue
      }
      const target = typeof op === 'string' ? op : isRecord(op) && typeof op.package === 'string' ? op.package : ''
      if (!target) continue
      const matched = plugins.filter((plugin) => selects(target, key(plugin)))
      if (matched.length || target === '*' || target.endsWith('.*') || target.startsWith('opencode.')) { for (const plugin of matched) plugin.enabled = true; continue }
      plugins.push({ target, id: pluginIdOf(target), options: isRecord(op) && isRecord(op.options) ? op.options : {}, enabled: true })
    }
  }
  return { config, plugins: plugins.filter((plugin) => plugin.enabled).map(({ enabled, ...plugin }) => plugin), documents: documents.length }
}

export class BridgeConfigV2 extends BridgeConfig {
  /** @param {{ flavor: any, stateDir: string, env?: Record<string, string | undefined> }} options */
  constructor(options) {
    super(options)
    this.configDir = path.join(this.runnerDir ?? this.stateDir, 'config-v2')
    this.pluginDir = path.join(this.runnerDir ?? this.stateDir, 'opencode-plugin', PLUGIN_ID)
    this.sandboxDir = path.join(this.runtimeDir, 'sandbox')
    /** Skill name → id(s) learned at run time, over settings.json `skillIdsV2` (skillIdMap): v2 checks a skill by id. */
    this.skillIds = null
  }

  get configPath() { return path.join(this.configDir, 'opencode.json') }

  /** Skill name → its ids (GET /api/skill, kept in settings.json by v2/extensions.js), with skillIds over them. */
  skillIdMap(settings = readJson(path.join(this.stateDir, 'settings.json'), {})) {
    const stored = isRecord(settings?.skillIdsV2) ? settings.skillIdsV2 : {}
    const out = { ...stored }
    for (const [name, value] of Object.entries(isRecord(this.skillIds) ? this.skillIds : {})) out[name] = [...new Set([...(Array.isArray(out[name]) ? out[name] : []), ...(Array.isArray(value) ? value : [value])])]
    return out
  }
  get shellPath() { return path.join(this.runtimeDir, 'shell-v2', path.basename(this.userShell())) }

  /** v2's global config folder: the user's own OPENCODE_CONFIG_DIR (serve inherits it; util/src/global.ts), else XDG's. */
  globalDir() { return this.env.OPENCODE_CONFIG_DIR || path.join(this.env.XDG_CONFIG_HOME || path.join(this.homeDir(), '.config'), 'opencode') }

  /** The file the user's own OPENCODE_CONFIG names (null when unset, or when it is the bridge's own). */
  userConfigFile() {
    const file = this.env.OPENCODE_CONFIG
    if (typeof file !== 'string' || !file.trim()) return null
    const resolved = path.resolve(file)
    return resolved === this.configPath ? null : resolved
  }

  /** The user's own OPENCODE_CONFIG_CONTENT (the bridge's replaces it in serve's environment), parsed. */
  userContent() {
    const value = parseJsonc(this.env.OPENCODE_CONFIG_CONTENT)
    return isRecord(value) ? value : {}
  }

  /**
   * The user's own config documents serve reads at every location, lowest first: the global folder's opencode.json and
   * opencode.jsonc (v2 no longer reads config.json, config/discovery.ts), OPENCODE_CONFIG, OPENCODE_CONFIG_CONTENT.
   * A project's own config is per folder while serve (and the CONTENT) is shared, so it is not read here.
   */
  userDocuments() {
    const docs = []
    for (const file of [path.join(this.globalDir(), 'opencode.json'), path.join(this.globalDir(), 'opencode.jsonc'), this.userConfigFile()]) {
      if (!file) continue
      let text
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const value = parseJsonc(text)
      if (isRecord(value)) docs.push({ file, info: value })
    }
    const content = this.userContent()
    if (Object.keys(content).length) docs.push({ file: null, info: content })
    return docs
  }

  /** The user's own `shell`, as the last of their documents sets it ({env:…} filled in). */
  configuredShell() {
    let shell
    for (const { info } of this.userDocuments()) if (typeof info.shell === 'string' && info.shell.trim()) shell = info.shell.replace(/\{env:([^}]+)\}/g, (_, name) => this.env[name] ?? '')
    return shell
  }

  /** The real shell the wrapper execs (config.js agentShell), never a wrapper of either generation. */
  userShell() {
    const pathList = this.env.PATH ?? process.env.PATH
    const shell = agentShell({ configShell: this.configuredShell(), envShell: this.env.SHELL, pathList, exclude: path.join(this.runtimeDir, 'shell-v2') })
    return shell.startsWith(path.join(this.runtimeDir, 'shell') + path.sep) ? agentShell({ envShell: undefined, pathList }) : shell
  }

  writeShell() {
    const shell = this.userShell()
    const file = path.join(this.runtimeDir, 'shell-v2', path.basename(shell))
    writeAtomic(file, shellWrapperV2({ shell, sandboxDir: this.sandboxDir }), 0o755)
    fs.chmodSync(file, 0o755)
    return file
  }

  /** The OPENCODE_CONFIG file's config. */
  overlay() {
    const settings = readJson(path.join(this.stateDir, 'settings.json'), {})
    const mcp = this.readMcp()
    const servers = {}
    for (const [name, entry] of Object.entries(mcp.servers)) {
      const server = toV2Mcp(entry)
      if (server) servers[name] = mcp.disabled.includes(name) ? { ...server, disabled: true } : server
    }
    // OpenClaude Desktop's own tools (app-tools.js): never in a workflow runner's config.
    const appTools = this.runnerDir ? null : appToolsServer(this.env)
    if (appTools && !mcp.disabled.includes(appTools.name)) servers[appTools.name] = appToolsEntryV2(appTools, this.runtimeDir)
    // share 'manual': a user's `share: "auto"` would publish every session the bridge creates.
    let config = { share: 'manual' }
    const providers = providerOverlayV2(this.providers(), this.env)
    if (Object.keys(providers).length) config.providers = providers
    if (Object.keys(servers).length) config.mcp = { servers }
    const disabledSkills = Array.isArray(settings.disabledSkills) ? settings.disabledSkills.filter((name) => typeof name === 'string' && name) : []
    // By name and, once the bridge knows it (skillIdMap), by id: a skill whose id isn't its name is checked by the id.
    const skillRules = skillResourcesV2(disabledSkills, this.skillIdMap(settings))
    if (skillRules.length) config.permissions = skillRules.map((resource) => ({ action: 'skill', resource, effect: 'deny' }))
    const plugins = Array.isArray(settings.plugins?.installed) ? settings.plugins.installed.filter((spec) => typeof spec === 'string' && !(settings.plugins.disabled ?? []).includes(spec)) : []
    if (plugins.length) config.plugins = plugins
    // '{core} settings' › web search (core-settings.js): off is `websearch: false`; on is OpenCode's own selection (a
    // provider written here would come after the user's documents and override the one they chose).
    if (storedCoreSettings(settings, this.flavor)['websearch.enabled'] === false) config.websearch = false
    const user = this.userConfigFile()
    if (user) {
      let value = null
      try { value = parseJsonc(fs.readFileSync(user, 'utf8')) } catch {}
      // A copy (0600) of their file, keys they wrote in it literally included; v2 watches only the bridge's file, so
      // an edit of theirs applies at the bridge's next rewrite (README).
      if (isRecord(value)) config = mergeV2(anchorConfig(value, path.dirname(user)), config)
    }
    if (this.env.CODE_DESKTOP_OPENCODE_CONFIG_EXTRA) {
      try { const extra = JSON.parse(this.env.CODE_DESKTOP_OPENCODE_CONFIG_EXTRA); if (isRecord(extra)) config = mergeV2(config, extra) } catch {}
    }
    return config
  }

  /** The bridge plugin's options (plugin.js): the state folder, the wrapper, OpenClaude Desktop's own server. */
  pluginOptions() {
    const appTools = this.runnerDir ? null : appToolsServer(this.env)
    return {
      state: this.stateDir,
      wrapper: this.shellPath,
      appTools: appTools ? { name: appTools.name, command: [appTools.command, ...appTools.args], environment: { ...appTools.env, [RUNTIME_ENV]: this.runtimeDir }, env: [...APP_TOOLS_ENV], timeout: { ...APP_TOOLS_TIMEOUT } } : null,
    }
  }

  /** OPENCODE_CONFIG_CONTENT: what must outrank every project's config. */
  content() {
    const user = this.userContent()
    // Config.latest: `experimental` comes whole from the last document that has one, this one included.
    let experimental = {}
    for (const { info } of this.userDocuments()) if (isRecord(info.experimental)) experimental = info.experimental
    return {
      ...user,
      shell: this.shellPath,
      plugins: [...(Array.isArray(user.plugins) ? user.plugins : []), { package: this.pluginDir, options: this.pluginOptions() }],
      experimental: { ...experimental, todo: true },
    }
  }

  /** The plugin's index.js, rewritten only when it changed (v2 reloads a local plugin when its file changes). */
  writePlugin() {
    const file = path.join(this.pluginDir, PLUGIN_ENTRY)
    const source = pluginSourceV2()
    let current = null
    try { current = fs.readFileSync(file, 'utf8') } catch {}
    if (current !== source) writeAtomic(file, source)
    return file
  }

  /** Write every generated file; returns the env serve needs (no OPENCODE_CONFIG_DIR). */
  write() {
    for (const kind of ['sessions', 'prompts', 'sandbox', 'shell-v2']) fs.mkdirSync(path.join(this.runtimeDir, kind), { recursive: true })
    const shell = this.writeShell()
    writeAtomic(this.configPath, JSON.stringify(this.overlay(), null, 2) + '\n', 0o600)
    this.writePlugin()
    // The {env:…} references of OpenClaude Desktop's tools server (app-tools.js) resolve in serve's environment.
    const appTools = appToolsServer(this.env) ? { CODE_DESKTOP_AGENT_TOOLS_SOCKET: this.env.CODE_DESKTOP_AGENT_TOOLS_SOCKET, CODE_DESKTOP_AGENT_TOOLS_TOKEN: this.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN } : {}
    return {
      OPENCODE_CONFIG: this.configPath,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(this.content()),
      CODE_DESKTOP_OPENCODE_STATE: this.stateDir,
      SHELL: shell,
      ...appTools,
    }
  }

  /** Rewrite only the config file (MCP, provider or settings change): v2 watches it and reloads. */
  rewriteConfig() {
    this.writeShell()
    writeAtomic(this.configPath, JSON.stringify(this.overlay(), null, 2) + '\n', 0o600)
  }
}
