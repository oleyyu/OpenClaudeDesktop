/**
 * One ACP agent process and its connection (JSON-RPC 2.0 over the agent's
 * stdio). The bridge runs one host per loaded thread (a thread's system
 * prompt, tool selection and sandbox are process-level settings on every ACP
 * agent it drives), plus short-lived utility hosts (listing, side questions).
 *
 * Agent → client requests are answered by `handlers`:
 *   session/request_permission  handlers.permission(params)
 *   fs/read_text_file            handlers.readTextFile(params)
 *   fs/write_text_file           handlers.writeTextFile(params)
 *   terminal/*                   handlers.terminal(method, params)
 * session/update notifications go to the listener registered for their sessionId.
 */

import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import { LineTransport, RpcError, METHOD_NOT_FOUND } from './transport.js'

export const ACP_PROTOCOL_VERSION = 1
const STDERR_KEEP = 16 * 1024

export class AgentHost extends EventEmitter {
  /**
   * @param {{ command: string, args: string[], env: Record<string, string>, cwd: string, handlers?: object, clientCapabilities?: object, log?: (line: string) => void, label?: string, initializeTimeoutMs?: number }} options
   */
  constructor(options) {
    super()
    this.options = options
    this.handlers = options.handlers ?? {}
    this.log = options.log ?? (() => {})
    this.label = options.label ?? 'agent'
    this.sessions = new Map() // sessionId → listener(update, params)
    this.init = null
    this.child = null
    this.transport = null
    this.stderr = ''
    this.exited = false
    this.exit = new Promise((resolve) => { this.resolveExit = resolve })
    this.ready = null
  }

  start() {
    if (this.ready) return this.ready
    this.ready = (async () => {
      const { command, args, env, cwd } = this.options
      // Its own process group: a stop reaches what the agent started (Gemini's relaunched child, MCP servers).
      const child = spawn(command, args, { env, cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: true })
      this.child = child
      child.on('error', (error) => {
        this.stderr += `\n${error?.message ?? error}`
        this.onExit(null, null, error)
      })
      child.on('exit', (code, signal) => this.onExit(code, signal))
      child.stderr.on('data', (chunk) => {
        this.stderr = (this.stderr + String(chunk)).slice(-STDERR_KEEP)
      })
      child.stdin.on('error', () => {})
      // CODE_DESKTOP_ACP_TRACE=<file>: every ACP line both ways, for diagnosing an agent.
      const trace = process.env.CODE_DESKTOP_ACP_TRACE
      if (trace) {
        const write = child.stdin.write.bind(child.stdin)
        child.stdin.write = (chunk, ...rest) => { try { fs.appendFileSync(trace, `[${this.label}] >> ${String(chunk).trim()}\n`) } catch {} return write(chunk, ...rest) }
        child.stdout.on('data', (chunk) => { try { fs.appendFileSync(trace, String(chunk).split('\n').filter(Boolean).map((line) => `[${this.label}] << ${line}\n`).join('')) } catch {} })
      }
      this.transport = new LineTransport(child.stdout, child.stdin, {
        jsonrpc: true,
        name: this.label,
        log: (line) => this.log(line),
        onNotification: (method, params) => this.onNotification(method, params),
        onRequest: (method, params) => this.onRequest(method, params),
      })
      this.transport.start()
      const init = await Promise.race([
        this.transport.call('initialize', {
          protocolVersion: ACP_PROTOCOL_VERSION,
          clientCapabilities: this.options.clientCapabilities ?? {},
          clientInfo: { name: 'code-desktop', title: 'OpenClaude Desktop', version: '0.1.0' },
        }, this.options.initializeTimeoutMs ?? 90000),
        this.exit.then(() => { throw new Error(`${this.label} exited before it answered initialize.${this.stderrTail()}`) }),
      ])
      this.init = init ?? {}
      return this.init
    })()
    return this.ready
  }

  stderrTail(max = 1500) {
    const text = this.stderr.trim()
    return text ? `\n${text.slice(-max)}` : ''
  }

  onExit(code, signal, error) {
    if (this.exited) return
    this.exited = true
    this.exitInfo = { code, signal, error }
    this.transport?.close()
    this.resolveExit(this.exitInfo)
    this.emit('exit', this.exitInfo)
  }

  get capabilities() {
    return this.init?.agentCapabilities ?? {}
  }

  /** Whether the agent advertised a session capability (list, resume, fork, close, delete). */
  can(capability) {
    if (capability === 'load') return this.capabilities.loadSession === true
    return Boolean(this.capabilities.sessionCapabilities?.[capability])
  }

  call(method, params, timeoutMs = 0) {
    if (!this.transport || this.exited) return Promise.reject(new Error(`${this.label} is not running.${this.stderrTail()}`))
    return this.transport.call(method, params, timeoutMs)
  }

  notify(method, params) {
    this.transport?.notify(method, params)
  }

  /** Route session/update notifications of one session to `listener`. */
  attach(sessionId, listener) {
    this.sessions.set(sessionId, listener)
    return () => { if (this.sessions.get(sessionId) === listener) this.sessions.delete(sessionId) }
  }

  onNotification(method, params) {
    if (method === 'session/update') {
      const listener = this.sessions.get(params?.sessionId)
      if (listener) listener(params.update ?? {}, params)
      else this.emit('orphan-update', params)
      return
    }
    this.emit('notification', method, params)
  }

  async onRequest(method, params) {
    const handlers = this.handlers
    switch (method) {
      case 'session/request_permission':
        if (!handlers.permission) return { outcome: { outcome: 'cancelled' } }
        return handlers.permission(params)
      case 'fs/read_text_file':
        if (!handlers.readTextFile) throw new RpcError(METHOD_NOT_FOUND, 'fs is not offered.')
        return handlers.readTextFile(params)
      case 'fs/write_text_file':
        if (!handlers.writeTextFile) throw new RpcError(METHOD_NOT_FOUND, 'fs is not offered.')
        return handlers.writeTextFile(params)
      case 'elicitation/create':
        if (!handlers.elicitation) return { action: 'decline' }
        return handlers.elicitation(params)
      default:
        if (method.startsWith('terminal/') && handlers.terminal) return handlers.terminal(method, params)
        if (handlers.extension) return handlers.extension(method, params)
        throw new RpcError(METHOD_NOT_FOUND, `${method} is not supported by OpenClaude Desktop.`)
    }
  }

  /**
   * Stop: the agent's stop signal (SIGTERM, then SIGKILL after a grace period). Gemini CLI uses
   * SIGKILL: its shutdown path (end of input or SIGTERM) rewrites the session file from a stale
   * copy and empties the saved conversation; its records are appended synchronously, so a kill
   * loses nothing.
   */
  async stop(graceMs = 3000) {
    if (!this.child || this.exited) return
    const signal = (name) => { try { process.kill(-this.child.pid, name) } catch { try { this.child.kill(name) } catch {} } }
    signal(this.options.stopSignal ?? 'SIGTERM')
    const hard = setTimeout(() => signal('SIGKILL'), graceMs)
    await this.exit
    clearTimeout(hard)
    // Anything left in the group (children that outlived the agent) goes too.
    setTimeout(() => { try { process.kill(-this.child.pid, 'SIGKILL') } catch {} }, 500).unref?.()
  }
}
