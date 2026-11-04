/**
 * One OpenCode 2.x `serve --stdio` per bridge process (../server.js drives OpenCode 1.x and MiMo):
 *
 *   start      `serve --stdio --port 0 --hostname 127.0.0.1`; the first stdout line is JSON {"url"} and means ready
 *              (v2 boots before it prints, cli/src/server-process.ts); stdout keeps being drained afterwards
 *   lease      stdin stays open for the server's whole life: EOF (also when this process dies, even by SIGKILL) makes
 *              it shut down, so no port probing and no /bin/sh watchdog
 *   auth       HTTP Basic with v2's fixed user `opencode` and a fresh password in OPENCODE_PASSWORD and
 *              OPENCODE_SERVER_PASSWORD (the first wins over a value the user exported; stdio mode scrubs both)
 *   database   OPENCODE_DB's folder is created first (mode 700): serve opens the file but not its parent, and a missing
 *              folder fails the start with ENOENT (any caller, not only the bridge's db.js, can name a new path)
 *   version    GET /api/info, once after the url line
 *   events     GET /api/event: data-only frames, the first one server.connected (only then is the stream open),
 *              `: heartbeat` comments every 15 s (a 45 s silence counts as a dead stream), no replay
 *   stop       interrupt the sessions running here (releases their claims) → stdin.end() → 5 s → SIGTERM → 3 s → SIGKILL
 *
 * Never `--service`, and never a bare `opencode` / `run`: those start or adopt the user's background service.
 * `fetch` and `spawn` are injectable (tests run without listen() or child processes).
 */
import { spawn as spawnProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { AgentHttpError } from '../server.js'

export const USERNAME = 'opencode'
export const SERVE_ARGS = Object.freeze(['serve', '--stdio', '--port', '0', '--hostname', '127.0.0.1'])
const READY_TIMEOUT_MS = 60000
const MAX_RESTARTS = 5
const STOP_GRACE_MS = 5000
const KILL_AFTER_MS = 3000
const EVENT_IDLE_MS = 45000
const RECONNECT_MS = 250
const RECONNECT_MAX_MS = 3000
// Never handed to serve: v2 ignores the username, and the sandbox markers would make the shell wrapper run commands
// as already confined (plan §2.9).
const SCRUBBED_ENV = ['OPENCODE_SERVER_USERNAME', 'CODE_DESKTOP_SANDBOX', 'CODE_DESKTOP_SANDBOX_PROFILE']
const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const wait = (ms) => new Promise((resolve) => { const timer = setTimeout(resolve, ms); timer.unref?.() })

/**
 * The serve process's environment: the process's own, the bridge's additions, then what v2 needs. OPENCODE_CLIENT is
 * v2's app name, sent in every model request's User-Agent and x-opencode-client headers: it stays 'cli', as on 1.x.
 * Auto-update is off (OPENCODE_DISABLE_AUTOUPDATE is the only switch v2 reads outside its global config).
 */
export function serverEnvV2({ base = process.env, extra = {}, password, db } = {}) {
  const env = { ...base, ...extra }
  for (const key of SCRUBBED_ENV) delete env[key]
  return {
    ...env,
    OPENCODE_PASSWORD: password,
    OPENCODE_SERVER_PASSWORD: password,
    OPENCODE_DISABLE_AUTOUPDATE: '1',
    OPENCODE_CLIENT: 'cli',
    ...(db ? { OPENCODE_DB: db } : {}),
  }
}

/** The url of serve's `--stdio` ready line ({"url":"http://127.0.0.1:<port>"}), or null for any other line. */
export function readyUrl(line) {
  let value
  try { value = JSON.parse(line) } catch { return null }
  return isRecord(value) && typeof value.url === 'string' && /^https?:\/\//.test(value.url) ? value.url.replace(/\/+$/, '') : null
}

/**
 * Split an SSE buffer into complete frames. v2 sends one `data:` line per event and `: heartbeat` comments; a frame
 * without data (a comment) only counts as traffic.
 * @returns {{ events: any[], comments: number, rest: string }}
 */
export function parseSse(buffer) {
  const text = buffer.replace(/\r\n/g, '\n')
  const events = []
  let comments = 0
  let start = 0
  let index
  while ((index = text.indexOf('\n\n', start)) >= 0) {
    const block = text.slice(start, index)
    start = index + 2
    const lines = block.split('\n')
    const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
    if (!data) { if (lines.some((line) => line.startsWith(':'))) comments++; continue }
    try { events.push(JSON.parse(data)) } catch {}
  }
  return { events, comments, rest: text.slice(start) }
}

/**
 * A query string the way v2 decodes it: arrays repeat the key, objects are deepObject (`location[directory]=`), null
 * is the literal 'null' (`parentID=null`: root sessions), undefined is left out.
 */
export function encodeQuery(params, search = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined) continue
    if (value === null) search.append(key, 'null')
    else if (Array.isArray(value)) for (const item of value) search.append(key, String(item))
    else if (isRecord(value)) { for (const [sub, inner] of Object.entries(value)) if (inner !== undefined && inner !== null) search.append(`${key}[${sub}]`, String(inner)) }
    else search.append(key, String(value))
  }
  return search
}

/**
 * Create the folder of an absolute OPENCODE_DB. A relative one resolves under v2's own data folder (cli/src/
 * database-path.ts), which serve creates itself; ':memory:' has no file. Failures are only logged: serve then reports
 * the real error.
 * @returns {string | null} the folder made sure of
 */
export function ensureDbDir(db, log = () => {}) {
  if (typeof db !== 'string' || !path.isAbsolute(db)) return null
  const dir = path.dirname(db)
  try { fs.mkdirSync(dir, { recursive: true, mode: 0o700 }) } catch (error) { log(`OPENCODE_DB folder ${dir}: ${error?.message || error}`); return null }
  return dir
}

export class AgentServerV2 {
  /**
   * @param {{ flavor: any, binary: string, runner?: string, nodeBinary?: string, env?: Record<string, string>, db?: string, log?: (line: string) => void, onExit?: (info: object) => void, fetch?: typeof fetch, spawn?: typeof spawnProcess, timing?: object }} options
   */
  constructor({ flavor, binary, runner = '', nodeBinary = process.execPath, env = {}, db, log = () => {}, onExit = () => {}, fetch = globalThis.fetch, spawn = spawnProcess, timing = {} }) {
    this.flavor = flavor
    this.binary = binary
    this.runner = runner
    this.nodeBinary = nodeBinary
    this.extraEnv = env
    this.db = db
    this.log = log
    this.onExit = onExit
    this.fetch = fetch
    this.spawnProcess = spawn
    this.timing = { ready: READY_TIMEOUT_MS, stopGrace: STOP_GRACE_MS, killAfter: KILL_AFTER_MS, eventIdle: EVENT_IDLE_MS, reconnect: RECONNECT_MS, ...timing }
    this.username = USERNAME
    this.password = randomBytes(32).toString('base64url')
    this.child = null
    this.url = null
    this.version = null
    this.info = null
    this.starting = null
    this.started = false
    this.restarts = 0
    this.stopped = false
    this.stderr = []
  }

  get auth() {
    return 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64')
  }

  /** Start once; concurrent callers share the start. */
  start() {
    if (this.stopped) return Promise.reject(new Error(`${this.flavor.name} stopped.`))
    if (this.child && this.url) return Promise.resolve(this)
    this.starting ??= this.spawn().finally(() => { this.starting = null })
    return this.starting
  }

  keep(text) {
    this.stderr.push(text)
    if (this.stderr.length > 200) this.stderr.splice(0, this.stderr.length - 200)
    for (const line of String(text).split('\n')) if (line.trim()) this.log(`[${this.flavor.id}] ${line.trim().slice(0, 500)}`)
  }

  async spawn() {
    const env = serverEnvV2({ base: process.env, extra: this.extraEnv, password: this.password, db: this.db })
    ensureDbDir(env.OPENCODE_DB, this.log)
    const command = this.runner === 'node' ? this.nodeBinary : this.binary
    const argv = this.runner === 'node' ? [this.binary, ...SERVE_ARGS] : [...SERVE_ARGS]
    // The cwd is only the default location: every location-scoped request names its own.
    const child = this.spawnProcess(command, argv, { env, stdio: ['pipe', 'pipe', 'pipe'], cwd: env.HOME || process.cwd() })
    this.child = child
    this.url = null
    // The lease pipe: writes after the server is gone fail with EPIPE, which is not this process's error.
    child.stdin?.on?.('error', () => {})
    let announce
    const announced = new Promise((resolve) => { announce = resolve })
    let pending = ''
    let ready = false
    child.stdout?.on('data', (chunk) => {
      pending += String(chunk)
      let index
      while ((index = pending.indexOf('\n')) >= 0) {
        const line = pending.slice(0, index).trim()
        pending = pending.slice(index + 1)
        if (!line) continue
        const url = ready ? null : readyUrl(line)
        if (url) { ready = true; announce(url); continue }
        this.keep(line)
      }
    })
    child.stderr?.on('data', (chunk) => this.keep(String(chunk)))
    const exited = new Promise((resolve) => {
      child.once('exit', (code, signal) => resolve({ code, signal }))
      // A binary that can't be spawned (missing, not executable) emits 'error' and never 'exit'.
      child.once('error', (error) => { this.keep(`spawn error: ${error.message}`); if (child.pid === undefined) resolve({ code: error.code ?? -1, signal: null }) })
    })
    exited.then((info) => {
      if (this.child === child) { this.child = null; this.url = null }
      if (!this.stopped) this.onExit(info)
    })
    let timer
    const outcome = await Promise.race([
      announced.then((url) => ({ url })),
      exited.then((info) => ({ exited: info })),
      new Promise((resolve) => { timer = setTimeout(() => resolve({ timeout: true }), this.timing.ready); timer.unref?.() }),
    ])
    clearTimeout(timer)
    const fail = (detail) => {
      try { child.stdin?.end() } catch {}
      try { child.kill('SIGKILL') } catch {}
      return new Error(`${this.flavor.name} did not start: ${detail || this.stderr.join('').slice(-800) || 'no output'}`)
    }
    if (!outcome.url) throw fail(outcome.timeout ? `no ready line in ${Math.round(this.timing.ready / 1000)} s. ${this.stderr.join('').slice(-800)}` : '')
    this.url = outcome.url
    try {
      const info = await this.send('GET', '/api/info', { timeout: 10000 })
      this.info = isRecord(info) ? info : null
      this.version = typeof info?.version === 'string' ? info.version : null
    } catch (error) {
      this.url = null
      throw fail(`GET /api/info: ${error?.message || error}`)
    }
    this.started = true
    return this
  }

  /** Ensure a running server, restarting a dead one a bounded number of times. */
  async ready() {
    if (this.child && this.url) return this
    if (this.restarts >= MAX_RESTARTS && !this.starting) throw new Error(`${this.flavor.name} keeps exiting: ${this.stderr.join('').slice(-500)}`)
    if (!this.starting && this.started) this.restarts++
    return this.start()
  }

  /**
   * One JSON request (src/v2/api.js adds locations, unwrapping and retries). `directory` is the location header, for
   * callers written against the 1.x server's request().
   * @returns {Promise<any>} the parsed body (null for 204); with `withHeaders`, {body, headers}
   */
  async request(method, path, options = {}) {
    await this.ready()
    return this.send(method, path, options)
  }

  async send(method, path, { directory, query, headers = {}, body, signal, timeout = 120000, withHeaders = false } = {}) {
    if (!this.url) throw new Error(`${this.flavor.name} is not running.`)
    const url = new URL(this.url + path)
    encodeQuery(query, url.searchParams)
    const signals = [AbortSignal.timeout(timeout), signal].filter(Boolean)
    const response = await this.fetch(url, {
      method,
      headers: {
        authorization: this.auth, accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(directory ? { 'x-opencode-directory': encodeURIComponent(directory) } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
    })
    const text = await response.text()
    let parsed = null
    if (text) { try { parsed = JSON.parse(text) } catch { parsed = text } }
    if (!response.ok) {
      const message = parsed?.message ?? parsed?.data?.message ?? (typeof parsed === 'string' ? parsed : null) ?? `HTTP ${response.status}`
      this.log(`${method} ${path} → ${response.status}: ${typeof text === 'string' ? text.slice(0, 1000) : ''}`)
      const error = new AgentHttpError(response.status, `${this.flavor.name}: ${String(message).slice(0, 500)}`, parsed)
      // v2 errors are {_tag, message, …}: InvalidRequestError, SessionNotFoundError, ServiceUnavailableError …
      error._tag = typeof parsed?._tag === 'string' ? parsed._tag : null
      throw error
    }
    return withHeaders ? { body: parsed, headers: response.headers } : parsed
  }

  /**
   * The global event stream. `onOpen` runs once per connection, when its first frame (server.connected) arrives: the
   * caller rebuilds its state then, since v2 replays nothing. `onDrop` runs when an open stream ends (EOF, error, or
   * 45 s without a byte: the heartbeat is every 15 s). Reconnects after 250 ms until the returned stop() or stop().
   */
  events(onEvent, { onOpen = () => {}, onDrop = () => {} } = {}) {
    let controller = null
    let closed = false
    const loop = async () => {
      let delay = this.timing.reconnect
      while (!closed && !this.stopped) {
        let opened = false
        let idle = null
        try {
          await this.ready()
          controller = new AbortController()
          const current = controller
          const arm = () => {
            clearTimeout(idle)
            idle = setTimeout(() => { this.log(`event stream: nothing for ${Math.round(this.timing.eventIdle / 1000)} s, reconnecting`); current.abort() }, this.timing.eventIdle)
            idle.unref?.()
          }
          arm()
          // identity: a compressing middleware must not hold frames back.
          const response = await this.fetch(`${this.url}/api/event`, { headers: { authorization: this.auth, accept: 'text/event-stream', 'accept-encoding': 'identity' }, signal: current.signal })
          if (!response.ok || !response.body) throw new Error(`events answered ${response.status}`)
          const decoder = new TextDecoder()
          let buffer = ''
          for await (const chunk of response.body) {
            arm()
            const parsed = parseSse(buffer + decoder.decode(chunk, { stream: true }))
            buffer = parsed.rest
            for (const event of parsed.events) {
              if (!opened) {
                if (event?.type !== 'server.connected') { this.log(`event stream: ${event?.type} before server.connected, dropped`); continue }
                opened = true
                delay = this.timing.reconnect
                try { onOpen() } catch (error) { this.log(`event open handler failed: ${error?.stack || error}`) }
                continue
              }
              try { onEvent(event) } catch (error) { this.log(`event handler failed: ${error?.stack || error}`) }
            }
            if (closed || this.stopped) break
          }
        } catch (error) {
          if (closed || this.stopped) return
          this.log(`event stream: ${error?.message || error}`)
        } finally {
          clearTimeout(idle)
        }
        if (closed || this.stopped) return
        if (opened) { try { onDrop() } catch (error) { this.log(`event drop handler failed: ${error?.stack || error}`) } }
        await wait(delay)
        delay = opened ? this.timing.reconnect : Math.min(delay * 2, RECONNECT_MAX_MS)
      }
    }
    void loop()
    return () => { closed = true; controller?.abort() }
  }

  /** Interrupt every session this server is running: a session stopped by shutdown keeps its claim (plan §1.3). */
  async interruptActive() {
    const active = await this.send('GET', '/api/session/active', { timeout: 2000 })
    const ids = Object.keys(isRecord(active?.data) ? active.data : {})
    await Promise.all(ids.map((id) => this.send('POST', `/api/session/${encodeURIComponent(id)}/interrupt`, { query: { resume: 'false' }, timeout: 2000 })
      .catch((error) => this.log(`interrupt ${id} on stop: ${error?.message || error}`))))
    return ids
  }

  async stop() {
    this.stopped = true
    const child = this.child
    if (!child) return
    if (this.url) await this.interruptActive().catch((error) => this.log(`active sessions on stop: ${error?.message || error}`))
    await new Promise((resolve) => {
      let term = null
      let kill = null
      const finish = () => { clearTimeout(term); clearTimeout(kill); resolve() }
      if (child.exitCode !== null && child.exitCode !== undefined) return finish()
      child.once('exit', finish)
      term = setTimeout(() => { try { child.kill('SIGTERM') } catch {} }, this.timing.stopGrace)
      kill = setTimeout(() => { try { child.kill('SIGKILL') } catch {} finish() }, this.timing.stopGrace + this.timing.killAfter)
      // The lease: EOF on stdin is serve's own orderly shutdown.
      try { child.stdin?.end() } catch {}
    })
  }
}
