/**
 * MCP tool names for Customize › Connectors and Settings › Profiles.
 * OpenCode's HTTP API reports each MCP server's status but not its tools, so
 * the bridge asks a server itself (initialize → tools/list) and caches the
 * answer per server config until a reload: a short-lived stdio child, or
 * streamable-HTTP POSTs for a remote server. Failures leave the list empty.
 */
import { spawn } from 'node:child_process'
import { killTree, platformSpawn } from './win-process.js'
import { createHash } from 'node:crypto'

const TIMEOUT_MS = 15000
const PROTOCOL = '2025-06-18'
const CLIENT = { name: 'code-desktop-opencode-bridge', version: '0.1.0' }

const key = (config) => createHash('sha256').update(JSON.stringify(config ?? null)).digest('hex')

async function listStdio(config, signal) {
  const [command, ...args] = config.command
  // Windows: npx / uvx-style .cmd shims run through cmd.exe, without a console window (win-process.js).
  const launch = platformSpawn(command, args, { cwd: config.cwd, env: { ...process.env, ...(config.environment ?? {}) }, stdio: ['pipe', 'pipe', 'ignore'] })
  const child = spawn(launch.command, launch.args, launch.options)
  // Windows: the server under cmd.exe goes with it (the tree), not just cmd.exe.
  const end = (signal) => { if (process.platform === 'win32' && child.pid) killTree(child.pid); else try { child.kill(signal) } catch {} }
  const pending = new Map()
  let buffer = ''
  let seq = 0
  child.stdout.on('data', (chunk) => {
    buffer += String(chunk)
    let index
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim()
      buffer = buffer.slice(index + 1)
      if (!line) continue
      try {
        const message = JSON.parse(line)
        const waiter = pending.get(String(message.id))
        if (waiter) { pending.delete(String(message.id)); message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result) }
      } catch {}
    }
  })
  const exited = new Promise((_, reject) => child.once('exit', () => reject(new Error('MCP server exited'))))
  child.once('error', () => {})
  exited.catch(() => {})
  const request = (method, params) => {
    const id = ++seq
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n')
    return Promise.race([new Promise((resolve, reject) => pending.set(String(id), { resolve, reject })), exited])
  }
  const onAbort = () => end('SIGKILL')
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    await request('initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: CLIENT })
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
    const tools = []
    let cursor
    for (let page = 0; page < 20; page++) {
      const result = await request('tools/list', cursor ? { cursor } : {})
      tools.push(...(result?.tools ?? []))
      cursor = result?.nextCursor
      if (!cursor) break
    }
    return tools
  } finally {
    signal.removeEventListener('abort', onAbort)
    try { child.stdin.end() } catch {}
    end('SIGTERM')
  }
}

async function listRemote(config, signal) {
  let session = null
  let seq = 0
  const post = async (method, params, notification = false) => {
    const response = await fetch(config.url, {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}), ...(config.headers ?? {}) },
      body: JSON.stringify(notification ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id: ++seq, method, params }),
    })
    session = response.headers.get('mcp-session-id') ?? session
    if (notification) return null
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const text = await response.text()
    const type = response.headers.get('content-type') ?? ''
    const messages = type.includes('text/event-stream')
      ? text.split('\n').filter((line) => line.startsWith('data:')).map((line) => { try { return JSON.parse(line.slice(5)) } catch { return null } }).filter(Boolean)
      : [JSON.parse(text)]
    const reply = messages.find((message) => message.id === seq)
    if (reply?.error) throw new Error(reply.error.message)
    return reply?.result
  }
  await post('initialize', { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: CLIENT })
  await post('notifications/initialized', {}, true)
  const tools = []
  let cursor
  for (let page = 0; page < 20; page++) {
    const result = await post('tools/list', cursor ? { cursor } : {})
    tools.push(...(result?.tools ?? []))
    cursor = result?.nextCursor
    if (!cursor) break
  }
  return tools
}

export class McpToolCache {
  constructor({ log = () => {} } = {}) {
    this.cache = new Map()
    this.log = log
  }

  /** The tools of one server config: [{name, description, readOnly}] (empty on failure). */
  async tools(name, config) {
    if (!config || config.enabled === false) return []
    const id = key(config)
    const hit = this.cache.get(name)
    if (hit?.key === id) return hit.promise
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const promise = (async () => {
      try {
        const tools = config.type === 'remote' ? await listRemote(config, controller.signal) : Array.isArray(config.command) ? await listStdio(config, controller.signal) : []
        // readOnly: the server marks the tool read-only and not destructive (MCP ToolAnnotations), so it needs no card.
        return tools.filter((tool) => typeof tool?.name === 'string').map((tool) => ({
          name: tool.name, description: typeof tool.description === 'string' ? tool.description : '',
          readOnly: tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint !== true,
        }))
      } catch (error) {
        this.log(`MCP ${name} tools/list failed: ${error?.message || error}`)
        this.cache.delete(name)
        return []
      } finally {
        clearTimeout(timer)
      }
    })()
    this.cache.set(name, { key: id, promise })
    return promise
  }

  invalidate(name) {
    if (name) this.cache.delete(name)
    else this.cache.clear()
  }
}
