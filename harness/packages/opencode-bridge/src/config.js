/**
 * The bridge's generated config folder, passed as OPENCODE_CONFIG_DIR
 * (MIMOCODE_CONFIG_DIR). The agent layers it over the user's own global and
 * project config, so the user's providers, keys, agents and MCP servers keep
 * working; the folder adds only what OpenClaude Desktop owns:
 *
 *   <config>/<opencode.json|mimocode.json>
 *     provider   Settings › Models custom providers (CODE_DESKTOP_PROVIDERS_FILE, keys from
 *                CODE_DESKTOP_PROVIDER_KEY_<ROUTE> by {env:…} reference, never written here)
 *     mcp        MCP servers added in Customize › Connectors (<state>/mcp.json), and
 *                {enabled:false} for the user's own servers turned off there; OpenClaude Desktop's own
 *                code_desktop server (app-tools.js) when the app provides one
 *     autoupdate false (OpenClaude Desktop pins the release)
 *     + CODE_DESKTOP_OPENCODE_CONFIG_EXTRA (JSON) merged last
 *   <config>/plugin/code-desktop.js   the per-session plugin (plugin.js)
 *   <runtime>/shell/<name>            the sandbox shell wrapper (sandbox.js), named after and exec'ing the
 *                                     user's own shell (agentShell below)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pluginSource, PLUGIN_FILE } from './plugin.js'
import { shellWrapper } from './sandbox.js'
import { coreSettingsConfig } from './core-settings.js'
import { appToolsServer, opencodeAppToolsEntry } from './app-tools.js'

const ROUTE = /^[a-z0-9][a-z0-9-]{0,31}$/
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

export function writeAtomic(file, data, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  fs.writeFileSync(temp, data, mode ? { mode } : undefined)
  fs.renameSync(temp, file)
}

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

/** The env var a custom provider's key is read from (prefs/model-settings.mjs providerKeyEnv). */
export const providerKeyEnv = (route) => `CODE_DESKTOP_PROVIDER_KEY_${String(route).toUpperCase().replace(/-/g, '_')}`

/** A base URL with the version segment the AI SDK clients expect (they append /messages or /chat/completions). */
function sdkBaseURL(api, baseURL) {
  const url = String(baseURL).replace(/\/+$/, '')
  if (api === 'anthropic-messages') return /\/v\d+$/.test(url) ? url : `${url}/v1`
  return url
}

/** Settings › Models custom providers → OpenCode `provider` entries. */
export function providerOverlay(providers, env = process.env) {
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
      models[id] = { name: meta.name ?? id, tool_call: true, temperature: true, ...(meta.reasoning ? { reasoning: true } : {}), ...(meta.attachment ? { attachment: true, modalities: { input: ['text', 'image'], output: ['text'] } } : {}), ...(meta.limit ? { limit: meta.limit } : {}) }
    }
    out[provider.route] = {
      npm,
      name: provider.displayName || provider.route,
      options: { baseURL: sdkBaseURL(api, provider.baseURL), ...(env[keyEnv] ? { apiKey: `{env:${keyEnv}}` } : {}) },
      models,
    }
  }
  return out
}

/** A Codex-style oauth table ({client_id, client_secret?, scope?}, or camelCase) → OpenCode's, or null without a client id. */
function oauthOf(value) {
  const clientId = String(value.client_id ?? value.clientId ?? '').trim()
  if (!clientId) return null
  const secret = String(value.client_secret ?? value.clientSecret ?? '').trim()
  const scope = String(value.scope ?? value.scopes ?? '').trim()
  return { clientId, ...(secret ? { clientSecret: secret } : {}), ...(scope ? { scope } : {}) }
}

/** Codex config mcp_servers entry → OpenCode mcp entry. */
export function toOpencodeMcp(value) {
  if (!isRecord(value)) return null
  if (typeof value.url === 'string' && value.url) {
    const headers = isRecord(value.http_headers) ? value.http_headers : isRecord(value.headers) ? value.headers : undefined
    // A pre-registered OAuth client (a server without dynamic client registration): OpenCode's mcp oauth
    // {clientId, clientSecret?, scope?}; `false` turns its OAuth off.
    const oauth = value.oauth === false ? false : isRecord(value.oauth) ? oauthOf(value.oauth) : undefined
    return { type: 'remote', url: value.url, enabled: value.enabled !== false, ...(headers ? { headers } : {}), ...(oauth !== undefined && oauth !== null ? { oauth } : {}) }
  }
  if (typeof value.command === 'string' && value.command) {
    const args = Array.isArray(value.args) ? value.args.map(String) : []
    const environment = isRecord(value.env) ? Object.fromEntries(Object.entries(value.env).map(([k, v]) => [k, String(v)])) : undefined
    return { type: 'local', command: [value.command, ...args], enabled: value.enabled !== false, ...(environment ? { environment } : {}), ...(typeof value.cwd === 'string' ? { cwd: value.cwd } : {}) }
  }
  return null
}

/** OpenCode mcp entry → Codex config mcp_servers entry. */
export function toCodexMcp(value) {
  if (!isRecord(value)) return null
  // The client secret never leaves the config file (the app lists connectors, it doesn't need it).
  if (value.type === 'remote') return { url: value.url, enabled: value.enabled !== false, ...(isRecord(value.headers) ? { http_headers: value.headers } : {}),
    ...(isRecord(value.oauth) && typeof value.oauth.clientId === 'string' ? { oauth: { client_id: value.oauth.clientId, ...(typeof value.oauth.scope === 'string' ? { scope: value.oauth.scope } : {}) } } : {}) }
  if (Array.isArray(value.command) && value.command.length) {
    return { command: value.command[0], args: value.command.slice(1), enabled: value.enabled !== false, ...(isRecord(value.environment) ? { env: value.environment } : {}) }
  }
  if (Object.keys(value).length === 1 && value.enabled === false) return { enabled: false }
  return null
}

/**
 * JSONC (OpenCode's config format: comments and trailing commas) → value; null when it does not parse.
 * Strings are kept as they are, comments outside them dropped.
 */
export function parseJsonc(text) {
  if (typeof text !== 'string') return null
  // Each pass copies strings whole, so a "//" or ", }" inside one is left alone.
  const pass = (source, other) => {
    let out = ''
    for (let i = 0; i < source.length; i++) {
      if (source[i] === '"') {
        let end = i + 1
        while (end < source.length && source[end] !== '"') end += source[end] === '\\' ? 2 : 1
        out += source.slice(i, end + 1)
        i = end
      } else {
        const step = other(source, i)
        out += step.text
        i = step.next
      }
    }
    return out
  }
  const uncommented = pass(text, (source, i) => {
    if (source[i] === '/' && source[i + 1] === '/') { const end = source.indexOf('\n', i); return { text: '\n', next: end < 0 ? source.length : end } }
    if (source[i] === '/' && source[i + 1] === '*') { const end = source.indexOf('*/', i + 2); return { text: ' ', next: end < 0 ? source.length : end + 1 } }
    return { text: source[i], next: i }
  })
  const closes = /\s*[}\]]/y
  const strict = pass(uncommented, (source, i) => {
    closes.lastIndex = i + 1
    return { text: source[i] === ',' && closes.test(source) ? '' : source[i], next: i }
  })
  try { return JSON.parse(strict) } catch { return null }
}

/** Shells the agents never run their shell tool in (OpenCode's Shell META `deny`, MiMo's BLACKLIST): they fall back. */
const TERMINAL_ONLY_SHELLS = new Set(['fish', 'nu'])
/** The agents' fallback shell on macOS (Shell fallback()). Only the macOS wrapper uses it: Windows gets no wrapper. */
export const FALLBACK_SHELL = '/bin/zsh'

/** An executable file, by absolute path or on PATH (Shell resolve()). */
function executable(file, pathList) {
  const usable = (candidate) => { try { return fs.statSync(candidate).isFile() && (fs.accessSync(candidate, fs.constants.X_OK), true) } catch { return false } }
  if (path.isAbsolute(file)) return usable(file) ? file : null
  if (file.includes('/')) return null
  for (const dir of String(pathList ?? '').split(path.delimiter)) if (dir && path.isAbsolute(dir) && usable(path.join(dir, file))) return path.join(dir, file)
  return null
}

/**
 * The shell the agent itself would run its shell tool in, as Shell.acceptable(cfg.shell) picks it
 * (opencode/packages/core/src/shell.ts; MiMo's shell/shell.ts reads only $SHELL): the configured shell, else $SHELL,
 * unless it is a terminal-only shell (fish, nu) or not an executable file — then /bin/zsh.
 * @param {{ configShell?: unknown, envShell?: unknown, pathList?: string, exclude?: string }} options
 *   exclude: a folder whose files never count (the bridge's own wrapper folder)
 */
export function agentShell({ configShell, envShell, pathList, exclude } = {}) {
  for (const candidate of [configShell, envShell]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    const file = candidate.trim()
    const name = path.basename(file).toLowerCase()
    // The agent falls back from a configured terminal-only shell without trying $SHELL (select()).
    if (TERMINAL_ONLY_SHELLS.has(name)) return FALLBACK_SHELL
    const resolved = executable(file, pathList)
    if (resolved && !(exclude && resolved.startsWith(exclude + path.sep)) && !['', '.', '..'].includes(path.basename(resolved))) return resolved
    // OpenCode: a configured shell that does not resolve falls back (it does not try $SHELL either).
    return FALLBACK_SHELL
  }
  return FALLBACK_SHELL
}

/** `{env:NAME}` substitution in a config string (OpenCode's ConfigVariable), unknown names → ''. */
const substituteEnv = (value, env) => (typeof value === 'string' ? value.replace(/\{env:([^}]+)\}/g, (_, name) => env[name] ?? '') : value)

function merge(target, source) {
  if (!isRecord(target) || !isRecord(source)) return source
  const out = { ...target }
  for (const [key, value] of Object.entries(source)) out[key] = isRecord(value) && isRecord(out[key]) ? merge(out[key], value) : value
  return out
}

export class BridgeConfig {
  /** @param {{ flavor: any, stateDir: string, env?: Record<string, string | undefined> }} options */
  constructor({ flavor, stateDir, env = process.env, platform = process.platform }) {
    this.flavor = flavor
    // Windows has no Seatbelt: no shell wrapper there (sandbox.js), the agent runs its own shell as it would anyway.
    this.platform = platform
    this.stateDir = stateDir
    this.env = env
    // The workflow runner's own bridge (CODE_DESKTOP_WORKFLOW_RUNNER=1, app/electron/workflow-service.cjs) shares this
    // state folder: it writes its generated config (without the code_desktop tools server, which workflow agents never
    // get) to a folder of its own, so the app bridge's overlay — read again by every new folder's instance — keeps it.
    this.runnerDir = env?.CODE_DESKTOP_WORKFLOW_RUNNER === '1' ? path.join(stateDir, 'workflow-runs', String(process.pid)) : null
    this.configDir = this.runnerDir ? path.join(this.runnerDir, 'config') : path.join(stateDir, 'config')
    this.runtimeDir = path.join(stateDir, 'runtime')
    this.mcpFile = path.join(stateDir, 'mcp.json')
  }

  get configPath() { return path.join(this.configDir, this.flavor.configFile) }
  /** The wrapper, named like the user's shell: the agent picks that shell's arguments (rc files) by the name. */
  get shellPath() { return this.platform === 'win32' ? null : path.join(this.runtimeDir, 'shell', path.basename(this.userShell())) }

  homeDir() { return this.env.HOME || os.homedir() }

  /**
   * The `shell` of the user's own OpenCode config, without the bridge's overlay, in the agent's merge order: the global
   * config folder (config.json, opencode.json, opencode.jsonc), OPENCODE_CONFIG, ~/.opencode. A project's own
   * opencode.json is per folder while the agent server (and its overlay) is shared, so it is not read here.
   */
  configuredShell() {
    if (this.flavor.id !== 'opencode') return undefined // MiMo's schema has no `shell` key: $SHELL only.
    const home = this.homeDir()
    const globalDir = path.join(this.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode')
    const files = [...['config.json', 'opencode.json', 'opencode.jsonc'].map((name) => path.join(globalDir, name)),
      ...(this.env.OPENCODE_CONFIG ? [this.env.OPENCODE_CONFIG] : []), ...['opencode.json', 'opencode.jsonc'].map((name) => path.join(home, '.opencode', name))]
    let shell
    for (const file of files) {
      let text
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const value = parseJsonc(text)
      if (isRecord(value) && typeof value.shell === 'string' && value.shell.trim()) shell = substituteEnv(value.shell, this.env)
    }
    return shell
  }

  /**
   * The `references` of the user's own global OpenCode config, in the agent's merge order. With OPENCODE_CONFIG_DIR set
   * (the bridge's overlay) OpenCode's reference service reads none of the user's files (verified on 1.18.34: GET
   * /api/reference answers [] until the overlay names them), so the overlay carries them. A relative local path stays
   * relative to the file that named it.
   */
  userReferences() {
    if (this.flavor.id !== 'opencode') return {}
    const home = this.homeDir()
    const globalDir = path.join(this.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode')
    const files = [...['config.json', 'opencode.json', 'opencode.jsonc'].map((name) => path.join(globalDir, name)),
      ...(this.env.OPENCODE_CONFIG ? [this.env.OPENCODE_CONFIG] : []), ...['opencode.json', 'opencode.jsonc'].map((name) => path.join(home, '.opencode', name))]
    const out = {}
    const anchored = (value, dir) => (typeof value === 'string' && /^\.\.?(?:\/|$)/.test(value) ? path.resolve(dir, value) : value)
    for (const file of files) {
      let text
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const value = parseJsonc(text)
      if (!isRecord(value) || !isRecord(value.references)) continue
      for (const [name, entry] of Object.entries(value.references)) {
        if (typeof entry === 'string') out[name] = anchored(entry, path.dirname(file))
        else if (isRecord(entry)) out[name] = typeof entry.path === 'string' ? { ...entry, path: anchored(entry.path, path.dirname(file)) } : { ...entry }
      }
    }
    return out
  }

  /** The real shell the wrapper execs: what the agent would use without OpenClaude Desktop (agentShell). */
  userShell() {
    return agentShell({ configShell: this.configuredShell(), envShell: this.env.SHELL, pathList: this.env.PATH ?? process.env.PATH, exclude: path.join(this.runtimeDir, 'shell') })
  }

  /** Write the sandbox wrapper for the user's shell; returns its path. */
  writeShell() {
    // Windows: no sandbox-exec to wrap the shell in, and a `#!/bin/sh` file is no program there.
    if (this.platform === 'win32') return null
    const shell = this.userShell()
    const file = path.join(this.runtimeDir, 'shell', path.basename(shell))
    writeAtomic(file, shellWrapper({ shell }), 0o755)
    fs.chmodSync(file, 0o755)
    return file
  }

  /**
   * {servers: {[name]: opencodeEntry}, disabled: string[], sampling: {[name]: 'ask'|'allow'|'deny'}} — the Connectors this
   * app manages, and MiMo's per-connector sampling policy (mcp.<name>.sampling) for any connector, the user's included.
   */
  readMcp() {
    const value = readJson(this.mcpFile, {})
    const sampling = isRecord(value.sampling) ? Object.fromEntries(Object.entries(value.sampling).filter(([, policy]) => ['ask', 'allow', 'deny'].includes(policy))) : {}
    return { servers: isRecord(value.servers) ? value.servers : {}, disabled: Array.isArray(value.disabled) ? value.disabled.filter((name) => typeof name === 'string') : [], sampling }
  }

  writeMcp(value) {
    writeAtomic(this.mcpFile, JSON.stringify(value, null, 2) + '\n', 0o600)
  }

  providers() {
    const file = this.env.CODE_DESKTOP_PROVIDERS_FILE
    if (!file) return []
    const value = readJson(file, null)
    return Array.isArray(value?.providers) ? value.providers : Array.isArray(value) ? value : []
  }

  overlay() {
    const mcp = this.readMcp()
    const servers = { ...mcp.servers }
    for (const name of mcp.disabled) if (!servers[name]) servers[name] = { enabled: false }
    // OpenClaude Desktop's own tools (app-tools.js): one server for every session, each call naming its app thread.
    const appTools = appToolsServer(this.env)
    if (appTools && !mcp.disabled.includes(appTools.name)) servers[appTools.name] = opencodeAppToolsEntry(appTools)
    // MiMo's mcp.<name>.sampling, merged over the connector's own entry (the overlay is the highest config layer).
    if (this.flavor.id === 'mimo') for (const [name, policy] of Object.entries(mcp.sampling ?? {})) servers[name] = { ...(servers[name] ?? {}), sampling: policy }
    // OpenCode reads `shell` from config before $SHELL (a user's own `shell` would bypass the
    // sandbox wrapper), so the overlay points it at the wrapper, which execs that same shell (userShell);
    // MiMo's schema has no `shell` key and uses $SHELL.
    // share 'manual': a user's `share: "auto"` (or legacy autoshare) would publish every session the bridge creates to a
    // public share page and keep it in sync (share/session.ts create); 'manual' stops that and still lets the session
    // menu's Share link (codeDesktop/thread/share → POST /session/:id/share) publish one session on request. The overlay
    // is the highest-precedence config layer, so it wins over the user's files.
    // Windows: no wrapper, so no `shell` override either (the user's own config, else OpenCode's Windows default).
    let config = { autoupdate: false, share: 'manual', ...(this.flavor.id === 'opencode' && this.platform !== 'win32' ? { shell: this.shellPath } : {}) }
    const provider = providerOverlay(this.providers(), this.env)
    if (Object.keys(provider).length) config.provider = provider
    if (Object.keys(servers).length) config.mcp = servers
    const references = this.userReferences()
    if (Object.keys(references).length) config.references = references
    // Customize › Skills switches and Plugins added in OpenClaude Desktop (<state>/settings.json).
    const settings = readJson(path.join(this.stateDir, 'settings.json'), {})
    const disabledSkills = Array.isArray(settings.disabledSkills) ? settings.disabledSkills.filter((name) => typeof name === 'string') : []
    if (disabledSkills.length) config.permission = { skill: Object.fromEntries(disabledSkills.map((name) => [name, 'deny'])) }
    const plugins = Array.isArray(settings.plugins?.installed) ? settings.plugins.installed.filter((spec) => typeof spec === 'string' && !(settings.plugins.disabled ?? []).includes(spec)) : []
    if (plugins.length) config.plugin = plugins
    // Settings › Code › '{core} settings' (core-settings.js): MiMo's compaction, memory and dream/distill switches.
    const own = coreSettingsConfig(settings, this.flavor)
    if (Object.keys(own).length) config = merge(config, own)
    if (this.env.CODE_DESKTOP_OPENCODE_CONFIG_EXTRA) {
      try { const extra = JSON.parse(this.env.CODE_DESKTOP_OPENCODE_CONFIG_EXTRA); if (isRecord(extra)) config = merge(config, extra) } catch {}
    }
    return config
  }

  /** Write every generated file; returns the env the agent server needs. */
  write() {
    fs.mkdirSync(path.join(this.configDir, 'plugin'), { recursive: true })
    for (const kind of ['sessions', 'prompts', 'shell']) fs.mkdirSync(path.join(this.runtimeDir, kind), { recursive: true })
    writeAtomic(this.configPath, JSON.stringify(this.overlay(), null, 2) + '\n', 0o600)
    // MiMo runs a tool with the args tool.execute.before leaves in its output (session/prompt.ts); OpenCode with the
    // object it passed (session/tools.ts).
    writeAtomic(path.join(this.configDir, 'plugin', PLUGIN_FILE), pluginSource({ replaceArgs: this.flavor.id === 'mimo' }))
    const shell = this.writeShell()
    // The {env:…} references of OpenClaude Desktop's tools server (app-tools.js) resolve in the agent server's environment.
    const appTools = appToolsServer(this.env) ? { CODE_DESKTOP_AGENT_TOOLS_SOCKET: this.env.CODE_DESKTOP_AGENT_TOOLS_SOCKET, CODE_DESKTOP_AGENT_TOOLS_TOKEN: this.env.CODE_DESKTOP_AGENT_TOOLS_TOKEN } : {}
    return {
      [`${this.flavor.envPrefix}_CONFIG_DIR`]: this.configDir,
      CODE_DESKTOP_OPENCODE_STATE: this.stateDir,
      ...(shell ? { SHELL: shell } : {}),
      ...appTools,
    }
  }

  /** Rewrite only the config file (MCP or provider change), with the wrapper it names. */
  rewriteConfig() {
    this.writeShell()
    writeAtomic(this.configPath, JSON.stringify(this.overlay(), null, 2) + '\n', 0o600)
  }
}
