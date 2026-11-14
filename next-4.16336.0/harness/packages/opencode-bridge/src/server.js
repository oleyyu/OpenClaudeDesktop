/**
 * One `opencode serve` (or `mimo serve`) per bridge process: a loopback port
 * picked here, HTTP basic auth with a fresh random password, the bridge's
 * generated config folder layered over the user's own config (config.js),
 * and the bridge's shell wrapper as $SHELL (sandbox.js). The HTTP client
 * (request) and the global SSE stream (events) talk to it.
 *
 * A server that exits is restarted on the next request (bounded), and the
 * SSE reader reconnects; `onRestart` lets the bridge resync live threads.
 */
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import { envName } from './flavor.js'

const HEALTH_TIMEOUT_MS = 60000
const MAX_RESTARTS = 5

export class AgentHttpError extends Error {
  constructor(status, message, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

/** A free loopback TCP port. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

export class AgentServer {
  /**
   * @param {{ flavor: any, binary: string, runner?: string, nodeBinary?: string, env?: Record<string, string>, log?: (line: string) => void, onExit?: (info: object) => void }} options
   */
  constructor({ flavor, binary, runner = '', nodeBinary = process.execPath, env = {}, log = () => {}, onExit = () => {} }) {
    this.flavor = flavor
    this.binary = binary
    this.runner = runner
    this.nodeBinary = nodeBinary
    this.extraEnv = env
    this.log = log
    this.onExit = onExit
    this.username = 'code-desktop'
    this.password = randomBytes(24).toString('hex')
    this.child = null
    this.url = null
    this.version = null
    this.starting = null
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

  async spawn() {
    const port = await freePort()
    const env = {
      ...process.env,
      ...this.extraEnv,
      [envName(this.flavor, 'SERVER_PASSWORD')]: this.password,
      [envName(this.flavor, 'SERVER_USERNAME')]: this.username,
      [envName(this.flavor, 'DISABLE_AUTOUPDATE')]: '1',
    }
    const args = ['serve', '--port', String(port), '--hostname', '127.0.0.1']
    const command = this.runner === 'node' ? this.nodeBinary : this.binary
    const argv = this.runner === 'node' ? [this.binary, ...args] : args
    const child = spawn(command, argv, { env, stdio: ['ignore', 'pipe', 'pipe'], cwd: env.HOME || process.cwd() })
    this.child = child
    this.url = null
    const keep = (chunk) => {
      const text = String(chunk)
      this.stderr.push(text)
      if (this.stderr.length > 200) this.stderr.splice(0, this.stderr.length - 200)
      for (const line of text.split('\n')) if (line.trim()) this.log(`[${this.flavor.id}] ${line.trim().slice(0, 500)}`)
    }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    const sentinel = this.watchParent(child)
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => { try { sentinel?.kill('SIGKILL') } catch {} resolve({ code, signal }) }))
    child.once('error', (error) => keep(`spawn error: ${error.message}`))
    exited.then((info) => {
      if (this.child === child) { this.child = null; this.url = null }
      if (!this.stopped) this.onExit(info)
    })
    const url = `http://127.0.0.1:${port}`
    const deadline = Date.now() + HEALTH_TIMEOUT_MS
    let done = false
    exited.then(() => { done = true })
    while (!done && Date.now() < deadline) {
      try {
        const response = await fetch(`${url}/global/health`, { headers: { authorization: this.auth }, signal: AbortSignal.timeout(2000) })
        if (response.ok) {
          const health = await response.json().catch(() => ({}))
          this.version = typeof health?.version === 'string' ? health.version : null
          this.url = url
          return this
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
    try { child.kill('SIGKILL') } catch {}
    throw new Error(`${this.flavor.name} did not start: ${this.stderr.join('').slice(-800) || 'no output'}`)
  }

  /**
   * A tiny `sh` that outlives this process only to stop the server: it blocks reading a pipe from us, and when we die
   * (even by SIGKILL, which runs no exit handler: a workflow runner's 1 s budget) the pipe closes and it sends the
   * server SIGTERM, then SIGKILL. Without it a killed bridge leaves `opencode serve` running for good. Killed with the
   * server when that exits on its own. None on Windows.
   */
  watchParent(child) {
    if (process.platform === 'win32' || !child?.pid) return null
    try {
      const script = 'read _ ; kill -TERM "$1" 2>/dev/null ; sleep 2 ; kill -KILL "$1" 2>/dev/null'
      const sentinel = spawn('/bin/sh', ['-c', script, 'code-desktop-watch', String(child.pid)], { stdio: ['pipe', 'ignore', 'ignore'] })
      sentinel.on('error', () => {})
      sentinel.stdin.on('error', () => {})
      sentinel.unref()
      sentinel.stdin.unref?.()
      return sentinel
    } catch { return null }
  }

  /** Ensure a running server, restarting a dead one a bounded number of times. */
  async ready() {
    if (this.child && this.url) return this
    if (this.restarts >= MAX_RESTARTS && !this.starting) throw new Error(`${this.flavor.name} keeps exiting: ${this.stderr.join('').slice(-500)}`)
    if (!this.starting && this.version !== null) this.restarts++
    return this.start()
  }

  /**
   * One JSON request. `directory` scopes it to a project instance (the thread's cwd).
   * @returns {Promise<any>} the parsed body (null for 204); with `withHeaders`, {body, headers}
   */
  async request(method, path, { directory, query, body, signal, timeout = 120000, withHeaders = false } = {}) {
    await this.ready()
    const url = new URL(this.url + path)
    if (directory) url.searchParams.set('directory', directory)
    for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    const signals = [AbortSignal.timeout(timeout), signal].filter(Boolean)
    const response = await fetch(url, {
      method,
      headers: { authorization: this.auth, 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
    })
    const text = await response.text()
    let parsed = null
    if (text) { try { parsed = JSON.parse(text) } catch { parsed = text } }
    if (!response.ok) {
      const message = parsed?.data?.message ?? parsed?.message ?? parsed?.error?.message ?? (typeof parsed === 'string' ? parsed : null) ?? `HTTP ${response.status}`
      this.log(`${method} ${path} → ${response.status}: ${typeof text === 'string' ? text.slice(0, 1000) : ''}`)
      throw new AgentHttpError(response.status, `${this.flavor.name}: ${String(message).slice(0, 500)}`, parsed)
    }
    return withHeaders ? { body: parsed, headers: response.headers } : parsed
  }

  /**
   * The global SSE stream (/global/event: every directory's events as {directory, payload}).
   * Reconnects until stop(); `onOpen` runs on each (re)connection.
   */
  events(onEvent, { onOpen = () => {} } = {}) {
    let controller = null
    let closed = false
    const loop = async () => {
      let delay = 200
      while (!closed && !this.stopped) {
        try {
          await this.ready()
          controller = new AbortController()
          const response = await fetch(`${this.url}/global/event`, { headers: { authorization: this.auth, accept: 'text/event-stream' }, signal: controller.signal })
          if (!response.ok || !response.body) throw new Error(`events answered ${response.status}`)
          delay = 200
          onOpen()
          const decoder = new TextDecoder()
          let buffer = ''
          for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true })
            let index
            while ((index = buffer.indexOf('\n\n')) >= 0) {
              const block = buffer.slice(0, index)
              buffer = buffer.slice(index + 2)
              const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n')
              if (!data) continue
              let event
              try { event = JSON.parse(data) } catch { continue }
              try { onEvent(event) } catch (error) { this.log(`event handler failed: ${error?.stack || error}`) }
            }
          }
        } catch (error) {
          if (closed || this.stopped) return
          this.log(`event stream: ${error?.message || error}`)
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * 2, 3000)
      }
    }
    void loop()
    return () => { closed = true; controller?.abort() }
  }

  async stop() {
    this.stopped = true
    const child = this.child
    if (!child) return
    await new Promise((resolve) => {
      const timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {} resolve() }, 2000)
      child.once('exit', () => { clearTimeout(timer); resolve() })
      try { child.kill('SIGTERM') } catch { clearTimeout(timer); resolve() }
    })
  }
}
