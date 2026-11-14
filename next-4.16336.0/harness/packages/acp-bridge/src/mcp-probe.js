/**
 * A minimal MCP client for Customize › Connectors: connect to one configured
 * server (stdio, streamable HTTP with SSE responses accepted, or the older
 * HTTP+SSE transport: GET the event stream, POST to the endpoint it
 * announces; `auto` tries streamable HTTP first, as Gemini CLI does), run
 * initialize + tools/list, and report {runtimeStatus, tools, serverInfo,
 * authStatus}. ACP agents do not report their MCP servers' state, so the
 * bridge checks each server the way the agent would start it. Results are
 * cached briefly; config/mcpServer/reload clears the cache.
 */

import { spawn } from 'node:child_process'
import readline from 'node:readline'

const PROTOCOL = '2025-06-18'
const TIMEOUT_MS = 15000
const CACHE_MS = 60000
const cache = new Map()

export function clearMcpCache() {
  cache.clear()
}

const clientInfo = { name: 'code-desktop', version: '0.1.0' }

/** The requests a session runs after initialize: tools/list, then any others (a `when` that refuses the server's capabilities skips one). */
const TOOLS_LIST = { method: 'tools/list', params: {} }
const wanted = (request, capabilities) => (typeof request.when === 'function' ? request.when(capabilities ?? {}) : true)
/** {runtimeStatus: 'connected', serverInfo, tools, results} from the answers to `requests` (tools/list first). */
const connected = (serverInfo, capabilities, results) => ({ runtimeStatus: 'connected', serverInfo, capabilities: capabilities ?? null, tools: results[0]?.tools ?? [], results })

function probeStdio(server, timeoutMs, requests = [TOOLS_LIST]) {
  return new Promise((resolve) => {
    let child
    let settled = false
    const done = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { child?.kill('SIGTERM') } catch {}
      resolve(result)
    }
    const timer = setTimeout(() => done({ runtimeStatus: 'failed', error: 'The server did not answer in time.' }), timeoutMs)
    try {
      child = spawn(server.command, server.args ?? [], { cwd: server.cwd || process.cwd(), env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('CODE_DESKTOP_') && key !== 'ELECTRON_RUN_AS_NODE')), ...(server.env ?? {}) }, stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (error) {
      done({ runtimeStatus: 'failed', error: error?.message ?? String(error) })
      return
    }
    child.on('error', (error) => done({ runtimeStatus: 'failed', error: error?.message ?? String(error) }))
    child.on('exit', (code) => done({ runtimeStatus: 'failed', error: `The server exited (${code}).` }))
    child.stdin.on('error', () => {})
    let serverInfo = null
    let capabilities = null
    const results = []
    const send = (message) => { try { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n') } catch {} }
    // One request at a time (ids 2, 3, …), each answered before the next.
    const next = () => {
      while (results.length < requests.length && !wanted(requests[results.length], capabilities)) results.push(null)
      if (results.length >= requests.length) return done(connected(serverInfo, capabilities, results))
      const request = requests[results.length]
      send({ id: results.length + 2, method: request.method, params: request.params ?? {} })
    }
    readline.createInterface({ input: child.stdout }).on('line', (line) => {
      let message
      try { message = JSON.parse(line) } catch { return }
      if (message.id === 1) {
        if (message.error) return done({ runtimeStatus: 'failed', error: message.error.message })
        serverInfo = message.result?.serverInfo ?? null
        capabilities = message.result?.capabilities ?? null
        send({ method: 'notifications/initialized' })
        next()
      } else if (message.id === results.length + 2) {
        results.push(message.error ? { error: message.error } : message.result ?? null)
        next()
      }
    })
    send({ id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo } })
  })
}

async function httpCall(url, headers, body, session, signal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(session ? { 'mcp-session-id': session } : {}), ...headers },
    body: JSON.stringify(body),
    signal,
  })
  const sessionId = response.headers.get('mcp-session-id') ?? session
  if (response.status === 401 || response.status === 403) return { status: response.status, sessionId, auth: response.headers.get('www-authenticate') }
  if (!response.ok) return { status: response.status, sessionId }
  if (body.id === undefined) return { status: response.status, sessionId }
  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  if (type.includes('text/event-stream')) {
    for (const block of text.split(/\n\n/)) {
      const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
      if (!data) continue
      try {
        const message = JSON.parse(data)
        if (message.id === body.id) return { status: response.status, sessionId, message }
      } catch {}
    }
    return { status: response.status, sessionId }
  }
  try { return { status: response.status, sessionId, message: JSON.parse(text) } } catch { return { status: response.status, sessionId } }
}

async function probeHttp(server, timeoutMs, requests = [TOOLS_LIST]) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const headers = { ...(server.headers ?? {}) }
    const init = await httpCall(server.url, headers, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo } }, null, controller.signal)
    if (init.status === 401 || init.status === 403) return { runtimeStatus: 'failed', authStatus: 'notLoggedIn', httpStatus: init.status, error: 'The server needs you to sign in.' }
    if (!init.message?.result) return { runtimeStatus: 'failed', httpStatus: init.status, error: `The server answered ${init.status}.` }
    await httpCall(server.url, headers, { jsonrpc: '2.0', method: 'notifications/initialized' }, init.sessionId, controller.signal).catch(() => undefined)
    const capabilities = init.message.result.capabilities ?? null
    const results = []
    for (const [index, request] of requests.entries()) {
      if (!wanted(request, capabilities)) { results.push(null); continue }
      const answer = await httpCall(server.url, headers, { jsonrpc: '2.0', id: index + 2, method: request.method, params: request.params ?? {} }, init.sessionId, controller.signal)
      results.push(answer.message?.error ? { error: answer.message.error } : answer.message?.result ?? null)
    }
    return connected(init.message.result.serverInfo ?? null, capabilities, results)
  } catch (error) {
    return { runtimeStatus: 'failed', error: controller.signal.aborted ? 'The server did not answer in time.' : error?.message ?? String(error) }
  } finally {
    clearTimeout(timer)
  }
}

/** Server-sent events of a fetch response: {event, data} as they arrive. */
async function* sseEvents(response) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n')
    let end
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      let event = 'message'
      const data = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
      }
      if (data.length) yield { event, data: data.join('\n') }
    }
  }
}

/** The HTTP+SSE transport (MCP 2024-11-05): the stream announces the endpoint; answers come back on the stream. */
async function probeSse(server, timeoutMs, requests = [TOOLS_LIST]) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const headers = { ...(server.headers ?? {}) }
    const response = await fetch(server.url, { headers: { accept: 'text/event-stream', ...headers }, signal: controller.signal })
    if (response.status === 401 || response.status === 403) return { runtimeStatus: 'failed', authStatus: 'notLoggedIn', httpStatus: response.status, error: 'The server needs you to sign in.' }
    if (!response.ok || !String(response.headers.get('content-type') ?? '').includes('text/event-stream')) return { runtimeStatus: 'failed', httpStatus: response.status, error: `The server answered ${response.status} without an event stream.` }
    const events = sseEvents(response)
    const next = async (want) => {
      for (;;) {
        const { value, done } = await events.next()
        if (done) throw new Error('The server closed its event stream.')
        const found = want(value)
        if (found !== undefined) return found
      }
    }
    const endpoint = await next((event) => (event.event === 'endpoint' ? new URL(event.data.trim(), server.url).href : undefined))
    const post = (body) => fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal })
    const answer = (id) => next((event) => {
      if (event.event !== 'message') return undefined
      try { const message = JSON.parse(event.data); return message?.id === id ? message : undefined } catch { return undefined }
    })
    const sent = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo } })
    if (sent.status === 401 || sent.status === 403) return { runtimeStatus: 'failed', authStatus: 'notLoggedIn', httpStatus: sent.status, error: 'The server needs you to sign in.' }
    const init = await answer(1)
    if (init.error) return { runtimeStatus: 'failed', error: init.error.message }
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' }).catch(() => undefined)
    const capabilities = init.result?.capabilities ?? null
    const results = []
    for (const [index, request] of requests.entries()) {
      if (!wanted(request, capabilities)) { results.push(null); continue }
      await post({ jsonrpc: '2.0', id: index + 2, method: request.method, params: request.params ?? {} })
      const reply = await answer(index + 2)
      results.push(reply.error ? { error: reply.error } : reply.result ?? null)
    }
    return connected(init.result?.serverInfo ?? null, capabilities, results)
  } catch (error) {
    return { runtimeStatus: 'failed', error: controller.signal.aborted ? 'The server did not answer in time.' : error?.message ?? String(error) }
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}

/** Streamable HTTP, then (a server that does not take it: 400, 404, 405) the HTTP+SSE transport. */
async function probeAuto(server, timeoutMs, requests) {
  const http = await probeHttp(server, timeoutMs, requests)
  if (http.runtimeStatus === 'connected' || http.authStatus || ![400, 404, 405, 406].includes(http.httpStatus)) return http
  const sse = await probeSse(server, timeoutMs, requests)
  return sse.runtimeStatus === 'connected' || sse.authStatus ? sse : http
}

/**
 * @param {{ name: string, command?: string, args?: string[], env?: object, cwd?: string, url?: string, transport?: 'stdio' | 'http' | 'sse' | 'auto', headers?: object, disabled?: boolean }} server
 */
export async function probeMcpServer(server, { timeoutMs = TIMEOUT_MS, fresh = false, prompts = false } = {}) {
  if (server.disabled) return { runtimeStatus: 'disabled', tools: [] }
  const transport = server.url ? server.transport ?? 'http' : 'stdio'
  const key = JSON.stringify([server.command, server.args, server.url, transport, server.cwd, Object.keys(server.env ?? {}), Object.entries(server.headers ?? {}).map(([name, value]) => (name.toLowerCase() === 'authorization' ? `${name}:${String(value).slice(-12)}` : name)), prompts])
  const hit = cache.get(key)
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value
  // prompts: the server's prompts too (prompts/list, when it offers them), for an agent that runs them as slash commands.
  const requests = prompts ? [TOOLS_LIST, { method: 'prompts/list', params: {}, when: (capabilities) => Boolean(capabilities.prompts) }] : [TOOLS_LIST]
  const value = await runSession(server, transport, timeoutMs, requests)
  if (prompts && value.runtimeStatus === 'connected') value.prompts = Array.isArray(value.results?.[1]?.prompts) ? value.results[1].prompts.filter((prompt) => typeof prompt?.name === 'string' && prompt.name) : []
  cache.set(key, { at: Date.now(), value })
  return value
}

function runSession(server, transport, timeoutMs, requests) {
  const probe = { http: probeHttp, sse: probeSse, auto: probeAuto }[transport]
  return server.url ? (probe ?? probeHttp)(server, timeoutMs, requests) : server.command ? probeStdio(server, timeoutMs, requests) : Promise.resolve({ runtimeStatus: 'failed', error: 'No command or URL.' })
}

/**
 * One MCP prompt, expanded by its server (prompts/get {name, arguments}): {messages} as the server answered, or an
 * Error with the server's reason.
 */
export async function getMcpPrompt(server, name, args = {}, { timeoutMs = 30000 } = {}) {
  if (server.disabled) throw new Error(`${server.name} is turned off.`)
  const transport = server.url ? server.transport ?? 'http' : 'stdio'
  const value = await runSession(server, transport, timeoutMs, [{ method: 'prompts/get', params: { name, arguments: args } }])
  if (value.runtimeStatus !== 'connected') throw new Error(value.error ?? `${server.name} did not answer.`)
  const answer = value.results?.[0]
  if (!answer || answer.error) throw new Error(answer?.error?.message ?? `${server.name} did not return the prompt.`)
  return answer
}

/** Codex McpServerStatus for one server and its probe. */
export function mcpServerStatus(server, probe) {
  const tools = {}
  for (const tool of probe?.tools ?? []) {
    if (typeof tool?.name !== 'string') continue
    tools[tool.name] = { name: tool.name, ...(tool.description ? { description: tool.description } : {}), inputSchema: tool.inputSchema ?? { type: 'object' } }
  }
  return {
    name: server.name,
    runtimeStatus: probe?.runtimeStatus ?? null,
    pluginId: server.extension ?? null,
    serverInfo: probe?.serverInfo ?? null,
    tools,
    resources: [],
    resourceTemplates: [],
    authStatus: probe?.authStatus ?? (server.oauthToken ? 'oAuth' : 'unsupported'),
    ...(probe?.error ? { error: probe.error } : {}),
    // Bridge fields: where the server is configured.
    source: server.source ?? null,
    transport: server.url ? (server.transport === 'sse' ? 'sse' : 'http') : 'stdio',
  }
}

/**
 * A prompt's arguments from what follows its slash command, as Gemini CLI reads them (cli McpPromptLoader parseArgs):
 * --name="value" or --name=value by name, the rest by position for the required ones still missing (all of it for a
 * single one). An Error names the required arguments still missing.
 */
export function parsePromptArgs(userArgs, promptArgs) {
  const text = String(userArgs ?? '')
  const named = {}
  const positionalParts = []
  const namedArg = /--([^=]+)=(?:"((?:\\.|[^"\\])*)"|([^ ]+))/g
  let match
  let lastIndex = 0
  while ((match = namedArg.exec(text)) !== null) {
    named[match[1]] = (match[2] ?? match[3]).replace(/\\(.)/g, '$1')
    if (match.index > lastIndex) positionalParts.push(text.slice(lastIndex, match.index))
    lastIndex = namedArg.lastIndex
  }
  if (lastIndex < text.length) positionalParts.push(text.slice(lastIndex))
  const positional = []
  const positionalArg = /(?:"((?:\\.|[^"\\])*)"|([^ ]+))/g
  const rest = positionalParts.join('').trim()
  while ((match = positionalArg.exec(rest)) !== null) positional.push((match[1] ?? match[2]).replace(/\\(.)/g, '$1'))
  const out = {}
  const list = Array.isArray(promptArgs) ? promptArgs.filter((arg) => typeof arg?.name === 'string' && arg.name) : []
  if (!list.length) return out
  for (const arg of list) if (named[arg.name]) out[arg.name] = named[arg.name]
  const unfilled = list.filter((arg) => arg.required && !out[arg.name])
  if (unfilled.length === 1) out[unfilled[0].name] = positional.join(' ')
  else {
    const missing = []
    unfilled.forEach((arg, index) => { if (positional.length > index) out[arg.name] = positional[index]; else missing.push(arg.name) })
    if (missing.length) return new Error(`Missing required argument(s): ${missing.map((name) => `--${name}`).join(', ')}`)
  }
  return out
}

/** The text of a prompts/get answer (its messages' text parts), as the turn's prompt. */
export function promptText(answer) {
  const parts = []
  for (const message of Array.isArray(answer?.messages) ? answer.messages : []) {
    const content = message?.content
    for (const block of Array.isArray(content) ? content : [content]) {
      if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) parts.push(block.text)
      else if (block?.type === 'resource' && typeof block.resource?.text === 'string' && block.resource.text.trim()) parts.push(block.resource.text)
    }
  }
  return parts.join('\n\n')
}
