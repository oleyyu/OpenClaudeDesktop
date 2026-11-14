/**
 * The official ZCode agent, driven over its own stdio protocol: `zcode app-server --stdio` speaks the
 * ZCode Protocol (packages/shared/src/zcode-protocol in github.com/zai-org/ZCode) — newline-delimited JSON
 * without a `jsonrpc` field; requests `{id, method, params}`, responses `{id, result|error}`, notifications
 * `{method, params}`, and the agent sends its own requests back (`interaction/requestPermission`,
 * `interaction/requestUserInput`, `interaction/requestProviderRuntimeHeaders`,
 * `session/requestRuntimePreferences`, …), answered here through registered handlers.
 *
 * The ZCode desktop app is the usual host of this process; here the bridge is the host.
 */

import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import readline from 'node:readline'

export class ZCodeError extends Error {
  constructor(code, message, data) {
    super(message)
    this.code = code
    this.data = data
  }
}

// Agent → host notifications that only feed the ZCode desktop's own diagnostics.
const NOISE = new Set(['startup/storageState', 'process/mcpTelemetry', 'process/mcpResourceSamples', 'process/toolExecResource', 'process/resourceSample', 'v4/telemetry/event', 'computer-use/operation-event'])

// session/requestRuntimePreferences: the desktop settings the agent asks its host for before a session's
// runtime materializes. OpenClaude Desktop has no such settings; these are ZCode's own defaults for a host without
// them, except askUserQuestionAutoResolution, which stays off so a question always waits for the user.
export const RUNTIME_PREFERENCES = Object.freeze({
  nativeSearchEnhancementsEnabled: true,
  memoryEnabled: false,
  askUserQuestionAutoResolutionEnabled: false,
  modelContextBudgetStrategy: 'preflight-v1',
})

export class ZCodeConnection extends EventEmitter {
  /**
   * @param {{ command: string, args: string[], env: Record<string,string>, cwd: string, log?: (m: string) => void }} options
   */
  constructor(options) {
    super()
    this.options = options
    this.seq = 0
    this.pending = new Map()
    this.handlers = new Map()
    this.child = null
    this.closed = false
    this.stderr = []
    this.exitInfo = null
  }

  start() {
    const { command, args, env, cwd } = this.options
    const child = spawn(command, args, { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    this.child = child
    child.on('error', (error) => this.fail(error))
    child.on('exit', (code, signal) => {
      this.exitInfo = { code, signal }
      this.fail(new Error(`ZCode exited (${signal || code})${this.stderrTail() ? `: ${this.stderrTail()}` : ''}`))
    })
    child.stdin.on('error', () => {})
    child.stderr.on('data', (chunk) => {
      this.stderr.push(String(chunk))
      if (this.stderr.length > 200) this.stderr.splice(0, this.stderr.length - 200)
      this.options.log?.(`zcode: ${String(chunk).trimEnd()}`)
    })
    readline.createInterface({ input: child.stdout, crlfDelay: Infinity }).on('line', (line) => this.receive(line))
    return this
  }

  stderrTail() {
    return this.stderr.join('').trim().split('\n').slice(-3).join(' ').slice(0, 600)
  }

  receive(line) {
    if (!line.trim()) return
    let message
    try { message = JSON.parse(line) } catch { this.options.log?.(`zcode: non-JSON line (${line.length} bytes)`); return }
    if (!message || typeof message !== 'object') return
    if (typeof message.method === 'string' && message.id !== undefined) { void this.answer(message); return }
    if (typeof message.method === 'string') {
      if (NOISE.has(message.method)) return
      this.emit('notification', message.method, message.params ?? {})
      return
    }
    if (message.id !== undefined) {
      const pending = this.pending.get(String(message.id))
      if (!pending) return
      this.pending.delete(String(message.id))
      clearTimeout(pending.timer)
      if (message.error) pending.reject(new ZCodeError(message.error.code ?? -32603, message.error.message ?? 'ZCode request failed.', message.error.data))
      else pending.resolve(message.result)
    }
  }

  /** An agent → host request: the registered handler answers it (or the request fails as unsupported). */
  async answer(message) {
    // The host's answer: OpenClaude Desktop's ZCode settings over ZCode's own defaults (options.runtimePreferences).
    if (message.method === 'session/requestRuntimePreferences') {
      let result = RUNTIME_PREFERENCES
      try { result = { ...RUNTIME_PREFERENCES, ...(this.options.runtimePreferences?.() ?? {}) } } catch {}
      this.write({ id: message.id, result })
      return
    }
    const handler = this.handlers.get(message.method)
    if (!handler) {
      this.write({ id: message.id, error: { code: -32601, message: `${message.method} is not available in OpenClaude Desktop.` } })
      return
    }
    try {
      const result = await handler(message.params ?? {}, message.id)
      this.write({ id: message.id, result: result ?? {} })
    } catch (error) {
      this.write({ id: message.id, error: { code: typeof error?.code === 'number' ? error.code : -32603, message: error?.message || String(error) } })
    }
  }

  /** Register the host's answer to one agent → host request method. */
  handle(method, handler) {
    this.handlers.set(method, handler)
  }

  write(message) {
    if (this.closed || !this.child?.stdin.writable) return
    this.child.stdin.write(JSON.stringify(message) + '\n')
  }

  request(method, params = {}, { timeoutMs = 120000 } = {}) {
    if (this.closed) return Promise.reject(new ZCodeError(-32000, 'ZCode is not running.'))
    const id = `cd-${++this.seq}`
    return new Promise((resolve, reject) => {
      const timer = timeoutMs > 0 ? setTimeout(() => {
        this.pending.delete(id)
        reject(new ZCodeError(-32001, `ZCode did not answer ${method} in time.`))
      }, timeoutMs) : null
      timer?.unref?.()
      this.pending.set(id, { resolve, reject, timer, method })
      this.write({ id, method, params })
    })
  }

  notify(method, params = {}) {
    this.write({ method, params })
  }

  fail(error) {
    if (this.closed) return
    this.closed = true
    for (const [id, pending] of this.pending) {
      this.pending.delete(id)
      clearTimeout(pending.timer)
      pending.reject(new ZCodeError(-32000, error?.message || 'ZCode stopped.'))
    }
    this.emit('exit', error)
  }

  async stop() {
    if (!this.child) return
    const child = this.child
    if (this.exitInfo) return
    const exited = new Promise((resolve) => child.once('exit', resolve))
    try { child.stdin.end() } catch {}
    child.kill('SIGTERM')
    const timer = setTimeout(() => { try { child.kill('SIGKILL') } catch {} }, 3000)
    await exited
    clearTimeout(timer)
  }
}
