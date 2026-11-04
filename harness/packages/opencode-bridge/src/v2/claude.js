/**
 * Claude Code for OpenCode 2.x's built-in claude-agent provider (core/src/plugin/provider/claude-agent): v2 runs the
 * user's own `claude` through the Agent SDK, found as process.env.OPENCODE_CLAUDE_PATH || which('claude') in the serve
 * process (claude/io.ts). An app started from the Dock has a minimal PATH, so the bridge finds `claude` itself and
 * hands serve its path and folder:
 *
 *   locate     first match: the user's choice (a settings hook), an OPENCODE_CLAUDE_PATH the user exported,
 *              `$SHELL -lc 'command -v claude'` (5 s; the last absolute line), then the installers' usual places
 *   serve env  OPENCODE_CLAUDE_PATH and its folder first on PATH; an npm install (a `#!/usr/bin/env node` script) also
 *              needs `node` on PATH. HOME, XDG_CONFIG_HOME and CLAUDE_CONFIG_DIR are never touched: the sign-in lives in
 *              the Keychain and ~/.claude*, read by claude as the user's
 *   version    `claude --version` ('2.1.311 (Claude Code)'), cached per path and mtime: chats need 2.1.248 or later
 *              (claude/probe.ts MINIMUM_VERSION), older ones fail every chat
 *   sign-in    `claude auth status --json` ({loggedIn, authMethod, apiProvider, email, orgName, subscriptionType, …},
 *              Claude Code 2.1.311): whether a sign-in can work before v2's own check (a 30–60 s probe) says so
 *   ANTHROPIC_*  claude inherits serve's environment (claude/query-options.ts clears only three variables): with
 *              ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_BASE_URL set, Claude Code bills that key or gateway,
 *              not the subscription. Reported, never removed (removing them would also sign `anthropic` out)
 *
 * Every process call is injectable (`exec`, execFile-shaped); nothing here runs at import.
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseVersion } from '../flavor.js'

export const CLAUDE_MIN_VERSION = '2.1.248'
export const CLAUDE_SETUP_URL = 'https://code.claude.com/docs/en/setup'
export const ANTHROPIC_ENV = Object.freeze(['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'])
const SHELL_TIMEOUT_MS = 5000
const VERSION_TIMEOUT_MS = 10000
const STATUS_TIMEOUT_MS = 10000
const STATUS_TTL_MS = 60000
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)

/** Where Claude Code's installers put `claude` (native installer, its old local install, Homebrew, bun, npm -g prefix). */
export function knownClaudePaths(home) {
  return [
    path.join(home, '.local', 'bin', 'claude'), path.join(home, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude', '/usr/local/bin/claude',
    path.join(home, '.bun', 'bin', 'claude'), path.join(home, '.npm-global', 'bin', 'claude'),
  ]
}

/** Whether a path is an executable file (symlinks followed). */
export function isExecutable(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) return false
  try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile() } catch { return false }
}

/** Whether `version` ('2.1.311', '2.1.300-beta.1') is at least `minimum`; a pre-release or build suffix is ignored. */
export function versionAtLeast(version, minimum = CLAUDE_MIN_VERSION) {
  const parse = (value) => String(value).split(/[-+]/)[0].split('.').map(Number)
  const current = parse(version)
  const required = parse(minimum)
  if (current.some((part) => !Number.isFinite(part))) return false
  const index = required.findIndex((part, position) => (current[position] ?? 0) !== part)
  return index === -1 || (current[index] ?? 0) > required[index]
}

/** `claude auth status --json` output → {loggedIn: true | false | null, …} (null: it said nothing usable). */
export function parseAuthStatus(text) {
  let value = null
  try { value = JSON.parse(String(text ?? '').trim()) } catch {}
  if (!isRecord(value)) return { loggedIn: null }
  const pick = (key) => (typeof value[key] === 'string' && value[key] ? value[key] : null)
  return {
    loggedIn: typeof value.loggedIn === 'boolean' ? value.loggedIn : null,
    authMethod: pick('authMethod'), apiProvider: pick('apiProvider'),
    email: pick('email'), orgName: pick('orgName'), subscriptionType: pick('subscriptionType'),
  }
}

/** The ANTHROPIC_* variables set in an environment that make Claude Code bill a key or a gateway. */
export const anthropicEnvIn = (env) => ANTHROPIC_ENV.filter((name) => typeof env?.[name] === 'string' && env[name].trim())

/** The absolute paths a login shell printed (`command -v` of a function or alias prints its name: skipped). */
const absoluteLines = (text) => String(text ?? '').split('\n').map((line) => line.trim()).filter((line) => path.isAbsolute(line))

export class ClaudeCode {
  /**
   * @param {{ env?: Record<string, string | undefined>, configured?: () => string | null, exec?: typeof execFile, executable?: (file: string) => boolean, readHead?: (file: string) => string, log?: (line: string) => void, now?: () => number }} [options]
   */
  constructor({ env = process.env, configured = () => null, exec = execFile, executable = isExecutable, readHead = readScriptHead, log = () => {}, now = Date.now } = {}) {
    this.env = env
    this.configured = configured
    this.exec = exec
    this.executable = executable
    this.readHead = readHead
    this.log = log
    this.now = now
    /** The last lookup: {path, node, source} or null (not found), undefined before the first. */
    this.found = undefined
    this.versions = new Map()
    this.status = null
  }

  home() { return this.env.HOME || process.env.HOME || '' }

  run(command, args, { timeout, env } = {}) {
    return new Promise((resolve) => {
      try {
        this.exec(command, args, { timeout, env: env ?? this.env, maxBuffer: 1 << 20 }, (error, stdout, stderr) => resolve({ error, stdout: String(stdout ?? ''), stderr: String(stderr ?? '') }))
      } catch (error) { resolve({ error, stdout: '', stderr: '' }) }
    })
  }

  /**
   * Find `claude` (see the header for the order). `fresh` looks again (account/login/start: it may have been installed
   * since serve started); otherwise the last answer is reused.
   * @returns {Promise<{ path: string, node: string | null, source: string } | null>}
   */
  async locate({ fresh = false } = {}) {
    if (!fresh && this.found !== undefined) return this.found
    const chosen = [[this.configured?.(), 'setting'], [this.env.OPENCODE_CLAUDE_PATH, 'env']].find(([file]) => this.executable(file))
    let found = chosen ? { path: chosen[0], source: chosen[1] } : null
    let shellNode = null
    const shell = this.env.SHELL
    // One login shell for both (the user's PATH as a terminal has it: nvm, asdf, Homebrew's shellenv), unless a chosen
    // native claude needs neither.
    if ((!found || this.isNodeScript(found.path)) && typeof shell === 'string' && path.isAbsolute(shell)) {
      const answer = await this.run(shell, ['-lc', 'command -v claude; command -v node'], { timeout: SHELL_TIMEOUT_MS })
      const lines = absoluteLines(answer.stdout)
      const claude = lines.filter((line) => path.basename(line) === 'claude' && this.executable(line)).at(-1)
      shellNode = lines.filter((line) => path.basename(line) === 'node' && this.executable(line)).at(-1) ?? null
      if (!found && claude) found = { path: claude, source: 'shell' }
      if (answer.error && !lines.length) this.log(`claude lookup in ${shell}: ${answer.error.code ?? answer.error.message}`)
    }
    if (!found) {
      const known = knownClaudePaths(this.home()).find((file) => this.executable(file))
      if (known) found = { path: known, source: 'known' }
    }
    if (found) found.node = this.nodeFor(found.path, shellNode)
    if (JSON.stringify(found) !== JSON.stringify(this.found ?? null)) this.log(found ? `claude: ${found.path} (${found.source}${found.node ? `, node ${found.node}` : ''})` : 'claude: not found')
    this.found = found
    return found
  }

  isNodeScript(file) {
    let head = ''
    try { head = this.readHead(file) } catch {}
    return /^#!.*\bnode\b/.test(head.split('\n')[0] ?? '')
  }

  /** The node an npm-installed `claude` script runs with: beside it, the login shell's, then Homebrew's; null for a native binary. */
  nodeFor(file, shellNode) {
    if (!this.isNodeScript(file)) return null
    const beside = path.join(path.dirname(file), 'node')
    return [beside, shellNode, '/opt/homebrew/bin/node', '/usr/local/bin/node'].find((candidate) => candidate && this.executable(candidate)) ?? null
  }

  /**
   * What serve's environment gets for a found claude: OPENCODE_CLAUDE_PATH and its (and node's) folder first on PATH.
   * Nothing when it was not found: v2 then reports "Claude Code is not installed".
   */
  serveEnv(found = this.found, basePath = this.env.PATH ?? process.env.PATH ?? '') {
    if (!found?.path) return {}
    const dirs = [path.dirname(found.path), found.node ? path.dirname(found.node) : null].filter(Boolean)
    const rest = String(basePath).split(path.delimiter).filter((dir) => dir && !dirs.includes(dir))
    return { OPENCODE_CLAUDE_PATH: found.path, PATH: [...new Set(dirs)].concat(rest).join(path.delimiter) }
  }

  /** The env a `claude` command of the bridge's own runs with: the same PATH serve gets. */
  commandEnv(found = this.found) {
    return { ...this.env, ...this.serveEnv(found) }
  }

  /**
   * `claude --version`, cached per path and mtime.
   * @returns {Promise<{ version: string | null, tooOld: boolean }>}
   */
  async version(found = this.found) {
    if (!found?.path) return { version: null, tooOld: false }
    let mtime = null
    try { mtime = fs.statSync(found.path).mtimeMs } catch {}
    const cached = this.versions.get(found.path)
    if (cached && cached.mtime === mtime) return cached.value
    const answer = await this.run(found.path, ['--version'], { timeout: VERSION_TIMEOUT_MS, env: this.commandEnv(found) })
    const parsed = parseVersion(answer.stdout)
    // An answer without a version is not "too old": v2's own check says what is wrong when a chat starts.
    const value = { version: parsed?.text ?? null, tooOld: parsed ? !versionAtLeast(parsed.text) : false }
    if (!parsed) this.log(`claude --version gave no version (${answer.error?.message ?? (answer.stdout.trim().slice(0, 120) || 'no output')})`)
    if (mtime !== null) this.versions.set(found.path, { mtime, value })
    return value
  }

  /**
   * `claude auth status --json`, cached a minute (`fresh` asks again). {loggedIn: null} when it can't tell.
   * @returns {Promise<{ loggedIn: boolean | null, authMethod?: string | null, apiProvider?: string | null, email?: string | null, orgName?: string | null, subscriptionType?: string | null }>}
   */
  async authStatus({ fresh = false, found = this.found } = {}) {
    if (!found?.path) return { loggedIn: null }
    if (!fresh && this.status?.path === found.path && this.now() - this.status.at < STATUS_TTL_MS) return this.status.value
    // A signed-out Claude Code may exit non-zero with the same JSON on stdout.
    const answer = await this.run(found.path, ['auth', 'status', '--json'], { timeout: STATUS_TIMEOUT_MS, env: this.commandEnv(found) })
    const value = parseAuthStatus(answer.stdout)
    if (value.loggedIn === null) this.log(`claude auth status said nothing usable (${answer.error?.code ?? answer.error?.message ?? 'no JSON'})`)
    this.status = { path: found.path, at: this.now(), value }
    return value
  }

  /** The ANTHROPIC_* variables serve (so claude) inherits. */
  anthropicEnv() { return anthropicEnvIn(this.env) }
}

/** The first line of a file (its shebang), read without loading a whole binary. */
function readScriptHead(file) {
  const fd = fs.openSync(file, 'r')
  try {
    const buffer = Buffer.alloc(128)
    const read = fs.readSync(fd, buffer, 0, buffer.length, 0)
    return buffer.subarray(0, read).toString('latin1')
  } finally { fs.closeSync(fd) }
}
