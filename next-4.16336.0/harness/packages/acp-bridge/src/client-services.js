/**
 * The ACP client capabilities the bridge offers an agent: fs/read_text_file,
 * fs/write_text_file and terminal/*. Agents that use them (Gemini CLI and Qwen
 * Code write files through fs; Kimi Code reads/writes through fs and runs Bash
 * through terminal) get OpenClaude Desktop's rules applied here, at the boundary:
 *
 *   fs/write_text_file   only inside the thread's writable roots unless the mode
 *                        is Bypass (a read-only mode refuses every write); the
 *                        previous text is kept for the turn diff
 *   terminal/create      the command runs in the thread's sandbox profile
 *                        (sandbox.js), its output streams to the command card
 *                        (item/commandExecution/outputDelta) and the background
 *                        terminals list (thread/backgroundTerminals/*)
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { RpcError, INVALID_PARAMS } from './transport.js'
import { insideRoots, isReadOnlyMode, realPath } from './permissions.js'
import { SANDBOX_EXEC, sandboxAvailable, seatbeltProfile } from './sandbox.js'

const OUTPUT_LIMIT = 1024 * 1024

/** ENOENT as the agents expect it (ACP resource-not-found, -32002). */
const notFound = (file) => new RpcError(-32002, `Resource not found: ${file}`, { uri: file, code: 'ENOENT' })

export class ClientServices {
  /**
   * @param {{ thread: () => { cwd: string, permission: object } | null, onOutput?: (terminalId: string, chunk: string) => void, onTerminal?: () => void, profileFile: string, agentPaths?: string[] }} options
   */
  constructor(options) {
    this.options = options
    this.terminals = new Map()
    this.seq = 0
  }

  roots() {
    const thread = this.options.thread()
    return [thread?.cwd, ...(thread?.permission?.writableRoots ?? [])].filter(Boolean)
  }

  async readTextFile({ path: file, line, limit }) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) throw new RpcError(INVALID_PARAMS, 'path must be absolute')
    let text
    try { text = await fs.promises.readFile(file, 'utf8') } catch (error) {
      // Gemini CLI cannot read an ACP error object (its normalizer expects an Error): a missing
      // file reads as empty there, which its write_file treats as a new file.
      if (error?.code === 'ENOENT' && (this.options.missingAsEmpty === true || (typeof this.options.missingAsEmpty === 'function' && this.options.missingAsEmpty(file)))) return { content: '' }
      if (error?.code === 'ENOENT') throw notFound(file)
      throw new RpcError(-32603, error?.message ?? String(error))
    }
    if (Number.isInteger(line) || Number.isInteger(limit)) {
      const lines = text.split('\n')
      const start = Math.max(0, (Number.isInteger(line) ? line : 1) - 1)
      text = lines.slice(start, Number.isInteger(limit) ? start + limit : undefined).join('\n')
    }
    return { content: text }
  }

  async writeTextFile({ path: file, content }) {
    if (typeof file !== 'string' || !path.isAbsolute(file)) throw new RpcError(INVALID_PARAMS, 'path must be absolute')
    const thread = this.options.thread()
    const mode = thread?.permission?.mode ?? 'auto'
    // The agent's own files (its plan files, notes) are always its to write, as its sandbox allows.
    const own = insideRoots([file], [...(this.options.agentPaths ?? []), ...(this.options.ownPaths?.() ?? [])])
    if (isReadOnlyMode(mode) && !own) throw new RpcError(-32603, `Writing ${file} is not allowed in ${mode === 'plan' ? 'Plan' : 'read-only'} mode.`)
    if (mode !== 'bypass' && !own && !insideRoots([file], this.roots()) && !thread?.approvedPaths?.has(realPath(file))) {
      throw new RpcError(-32603, `OpenClaude Desktop only allows writes inside the session's folders (${this.roots().join(', ')}).`)
    }
    await fs.promises.mkdir(path.dirname(file), { recursive: true })
    await fs.promises.writeFile(file, String(content ?? ''))
    return null
  }

  async terminal(method, params) {
    switch (method) {
      case 'terminal/create': return this.create(params)
      case 'terminal/output': {
        const term = this.get(params.terminalId)
        return { output: term.output, truncated: term.truncated, ...(term.exit ? { exitStatus: term.exit } : {}) }
      }
      case 'terminal/wait_for_exit': {
        const term = this.get(params.terminalId)
        return term.exit ?? (await term.done)
      }
      case 'terminal/kill': {
        const term = this.get(params.terminalId)
        this.kill(term)
        return null
      }
      case 'terminal/release': {
        const term = this.terminals.get(params.terminalId)
        if (term) {
          if (!term.exit) this.kill(term)
          this.terminals.delete(params.terminalId)
          this.options.onTerminal?.()
        }
        return null
      }
      default:
        throw new RpcError(-32601, `${method} is not supported.`)
    }
  }

  get(id) {
    const term = this.terminals.get(id)
    if (!term) throw new RpcError(INVALID_PARAMS, `Unknown terminal ${id}`)
    return term
  }

  create({ command, args = [], env = [], cwd, outputByteLimit }) {
    if (typeof command !== 'string' || !command) throw new RpcError(INVALID_PARAMS, 'command is required')
    const thread = this.options.thread()
    const workdir = typeof cwd === 'string' && cwd ? cwd : thread?.cwd ?? process.cwd()
    const extraEnv = Object.fromEntries((Array.isArray(env) ? env : []).filter((entry) => entry?.name).map((entry) => [entry.name, String(entry.value ?? '')]))
    // A bare command line (no args) runs through the shell, as agents send it.
    let file = args.length ? command : '/bin/bash'
    let argv = args.length ? args : ['-lc', command]
    const mode = thread?.permission?.mode ?? 'auto'
    const profile = mode === 'bypass' ? 'none' : isReadOnlyMode(mode) ? 'read-only' : 'workspace-write'
    if (profile !== 'none' && sandboxAvailable()) {
      fs.mkdirSync(path.dirname(this.options.profileFile), { recursive: true })
      fs.writeFileSync(this.options.profileFile, seatbeltProfile({ profile, writable: this.roots(), agentPaths: this.options.agentPaths ?? [] }))
      argv = ['-f', this.options.profileFile, file, ...argv]
      file = SANDBOX_EXEC
    }
    const id = `term-${process.pid}-${++this.seq}`
    // OpenClaude Desktop's launch variables (its tools channel secret among them) never reach the agent's commands.
    const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CODE_DESKTOP_') && key !== 'ELECTRON_RUN_AS_NODE'))
    const child = spawn(file, argv, { cwd: workdir, env: { ...baseEnv, ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
    const limit = Number.isInteger(outputByteLimit) && outputByteLimit > 0 ? outputByteLimit : OUTPUT_LIMIT
    const term = { id, command: args.length ? [command, ...args].join(' ') : command, cwd: workdir, child, output: '', truncated: false, exit: null, startedAtMs: Date.now(), pid: child.pid }
    term.done = new Promise((resolve) => {
      const finish = (code, signal) => {
        if (term.exit) return
        term.exit = { exitCode: Number.isInteger(code) ? code : null, signal: signal ?? null }
        resolve(term.exit)
        this.options.onTerminal?.()
      }
      child.on('exit', finish)
      child.on('error', (error) => { term.output += `\n${error.message}`; finish(127, null) })
    })
    const onData = (chunk) => {
      const text = String(chunk)
      term.output += text
      if (Buffer.byteLength(term.output) > limit) {
        term.output = term.output.slice(-limit)
        term.truncated = true
      }
      this.options.onOutput?.(id, text)
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    this.terminals.set(id, term)
    this.options.onTerminal?.()
    return { terminalId: id }
  }

  kill(term) {
    if (term.exit) return
    try { process.kill(-term.child.pid, 'SIGTERM') } catch { try { term.child.kill('SIGTERM') } catch {} }
    setTimeout(() => { if (!term.exit) try { process.kill(-term.child.pid, 'SIGKILL') } catch {} }, 2000).unref?.()
  }

  /** Running terminals, for thread/backgroundTerminals/list. */
  running() {
    return [...this.terminals.values()].filter((term) => !term.exit)
  }

  killAll() {
    for (const term of this.terminals.values()) this.kill(term)
  }
}
