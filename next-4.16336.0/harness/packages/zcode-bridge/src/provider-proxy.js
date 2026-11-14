/**
 * Per-thread system prompt, instructions and model parameters for ZCode.
 *
 * ZCode assembles the main agent's system prompt itself and offers no protocol field, config key or env var to
 * replace it for a session (core/src/context/builder.ts takes a custom prompt only for sub-agents and workflow
 * actors). The one place the whole prompt is visible is the model request. So the bridge hosts a loopback
 * pass-through in front of every provider endpoint: the provider configs ZCode reads
 * (ZCODE_BUILTIN_PROVIDER_CONFIG_FILE / ZCODE_PERSONAL_PROVIDER_CONFIG_FILE) are copies whose `api.baseUrl`s
 * point at `http://127.0.0.1:<port>/u/<original base URL>`, and each request is forwarded to the original URL
 * byte for byte, except for main-agent requests of a thread with OpenClaude Desktop customization (identified by
 * ZCode's own `x-session-id` header), whose system prompt, max tokens and temperature are rewritten.
 *
 * Faithfulness:
 *  - provider-site model rules keep matching: their `baseUrlMatch` patterns are prefixed with the proxy origin;
 *  - the official Coding Plan endpoints still go through the ZCode platform gateway, exactly as ZCode's own
 *    adapters/src/model/official-coding-plan-gateway.ts routes them (same table, same ZCODE_BASE_URL origin);
 *  - headers, auth and streaming responses pass through unchanged.
 * The last system prompt and tool list each session sent are kept for codeDesktop/systemPrompt/preview.
 */

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const PREFIX = '/u/'
const HOP_HEADERS = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'keep-alive', 'upgrade', 'proxy-connection', 'accept-encoding'])

// adapters/src/model/official-coding-plan-gateway.ts (ZCode 0.16.9): official Coding Plan endpoints are sent
// to the ZCode platform gateway, which checks plan entitlement and forwards to the model service.
export const OFFICIAL_CODING_PLAN_GATEWAY_ROUTES = Object.freeze([
  { providerEndpoint: 'https://open.bigmodel.cn/api/anthropic/v1/messages', gatewayPath: '/api/v1/ultra/anthropic/v1/messages' },
  { providerEndpoint: 'https://api.z.ai/api/anthropic/v1/messages', gatewayPath: '/api/v1/ultra-zai/anthropic/v1/messages' },
])
const DEFAULT_ZCODE_ORIGIN = 'https://zcode.z.ai'

const endpointKey = (url) => `${url.protocol}//${url.hostname.toLowerCase()}:${url.port || '443'}${url.pathname.replace(/\/+$/, '') || '/'}`
const GATEWAY_PATHS = new Map(OFFICIAL_CODING_PLAN_GATEWAY_ROUTES.map((route) => [endpointKey(new URL(route.providerEndpoint)), route.gatewayPath]))

/** Where a request for `target` really goes: the ZCode gateway for official Coding Plan endpoints, else itself. */
export function upstreamUrl(target, env = process.env) {
  let url
  try { url = new URL(target) } catch { return target }
  if (url.protocol !== 'https:') return target
  const gatewayPath = GATEWAY_PATHS.get(endpointKey(url))
  if (!gatewayPath) return target
  const origin = (env.CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN || env.ZCODE_BASE_URL || env.ZCODE_ENDPOINT_ORIGIN || DEFAULT_ZCODE_ORIGIN).trim().replace(/\/+$/, '')
  const gateway = new URL(gatewayPath, origin)
  gateway.search = url.search
  return gateway.href
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A base URL already routed through some bridge's loopback proxy (this one's, another bridge process's or an
// earlier launch's, whose port is gone): every such prefix is removed, so a file that was carried back with a
// proxy URL in it repairs itself instead of being proxied twice.
const LOOPBACK_PROXY_PREFIX = /^http:\/\/(?:127\.0\.0\.1|localhost|\[::1\]):\d+\/u\/(?=https?:\/\/)/i
export function unproxiedBaseUrl(base) {
  let value = base
  while (typeof value === 'string' && LOOPBACK_PROXY_PREFIX.test(value)) value = value.replace(LOOPBACK_PROXY_PREFIX, '')
  return value
}

/** A provider config with every API base URL routed through the proxy at `origin`. */
export function rewriteProviderConfig(document, origin) {
  const prefix = `${origin}${PREFIX}`
  const copy = structuredClone(document)
  const rewriteApi = (config) => {
    const base = unproxiedBaseUrl(config?.api?.baseUrl)
    if (typeof base === 'string' && /^https?:\/\//.test(base)) config.api.baseUrl = prefix + base
  }
  const providerRules = copy?.config?.providerConfigRules
  for (const rule of providerRules?.providerRules ?? []) rewriteApi(rule.config)
  for (const rule of providerRules?.templateRules ?? []) rewriteApi(rule.config)
  for (const rule of copy?.config?.modelConfigRules?.providerSiteRules ?? []) {
    if (typeof rule.baseUrlMatch === 'string') rule.baseUrlMatch = `${escapeRegExp(prefix)}(?:${rule.baseUrlMatch})`
  }
  return copy
}

/** The provider config the user's ZCode keeps, from a proxied copy ZCode itself rewrote. */
export function restoreProviderConfig(document, origin) {
  const prefix = `${origin}${PREFIX}`
  const copy = structuredClone(document)
  for (const rule of [...(copy?.config?.providerConfigRules?.providerRules ?? []), ...(copy?.config?.providerConfigRules?.templateRules ?? [])]) {
    const base = rule?.config?.api?.baseUrl
    if (typeof base !== 'string') continue
    // This proxy's own prefix, then any other loopback proxy prefix (never a real provider's URL).
    rule.config.api.baseUrl = unproxiedBaseUrl(base.startsWith(prefix) ? base.slice(prefix.length) : base)
  }
  return copy
}

const textOfBlocks = (system) => (typeof system === 'string' ? system : Array.isArray(system) ? system.map((block) => (typeof block === 'string' ? block : block?.text ?? '')).join('') : '')

/** The system prompt a model request carries (Anthropic Messages, OpenAI Chat Completions or Responses). */
export function systemPromptOf(body) {
  if (!body || typeof body !== 'object') return null
  if (body.system !== undefined) return textOfBlocks(body.system)
  if (Array.isArray(body.messages)) {
    const system = body.messages.filter((message) => message?.role === 'system' || message?.role === 'developer')
    if (system.length) return system.map((message) => textOfBlocks(message.content)).join('\n\n')
  }
  if (typeof body.instructions === 'string') return body.instructions
  return null
}

export function toolDefsOf(body) {
  return (body?.tools ?? []).map((tool) => ({ name: tool?.name ?? tool?.function?.name, description: tool?.description ?? tool?.function?.description ?? '', inputSchema: tool?.input_schema ?? tool?.function?.parameters ?? tool?.parameters ?? null })).filter((tool) => typeof tool.name === 'string')
}

/** A tiny streamed answer for a dry-run request (the prompt preview): nothing leaves the machine. */
function cannedReply(res, url) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  if (/chat\/completions/.test(url)) {
    res.write(`data: ${JSON.stringify({ id: 'preview', object: 'chat.completion.chunk', choices: [{ index: 0, delta: { role: 'assistant', content: 'ok' }, finish_reason: null }] })}\n\n`)
    res.write(`data: ${JSON.stringify({ id: 'preview', object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } })}\n\ndata: [DONE]\n\n`)
    res.end()
    return
  }
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  send('message_start', { type: 'message_start', message: { id: 'msg_preview', type: 'message', role: 'assistant', model: 'preview', content: [], stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } } })
  send('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })
  send('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ok' } })
  send('content_block_stop', { type: 'content_block_stop', index: 0 })
  send('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 0 } })
  send('message_stop', { type: 'message_stop' })
  res.end()
}

export function toolNamesOf(body) {
  return (body?.tools ?? []).map((tool) => tool?.name ?? tool?.function?.name).filter((name) => typeof name === 'string')
}

/**
 * Apply one thread's customization to a model request body (mutates and returns it).
 * @param {object} body
 * @param {{ systemPrompt?: string|null, appendSections?: string[], maxTokens?: number|null, temperature?: number|null }} custom
 */
export function applyToRequest(body, custom) {
  if (!body || typeof body !== 'object' || !custom) return body
  const extra = (custom.appendSections ?? []).filter((section) => typeof section === 'string' && section.trim())
  const replace = typeof custom.systemPrompt === 'string' && custom.systemPrompt.trim() ? custom.systemPrompt : null
  if (replace !== null || extra.length) {
    const join = (base) => [base, ...extra].filter((part) => part && part.trim()).join('\n\n')
    if (body.system !== undefined || (!Array.isArray(body.messages) && body.instructions === undefined)) {
      if (replace !== null) body.system = join(replace)
      else if (Array.isArray(body.system)) body.system = [...body.system, ...extra.map((text) => ({ type: 'text', text: `\n\n${text}` }))]
      else body.system = join(typeof body.system === 'string' ? body.system : '')
    } else if (Array.isArray(body.messages)) {
      const others = body.messages.filter((message) => message?.role !== 'system' && message?.role !== 'developer')
      const current = systemPromptOf(body) ?? ''
      body.messages = [{ role: 'system', content: join(replace ?? current) }, ...others]
    } else if (typeof body.instructions === 'string') {
      body.instructions = join(replace ?? body.instructions)
    }
  }
  if (Number.isFinite(custom.maxTokens) && custom.maxTokens > 0) {
    if ('max_output_tokens' in body) body.max_output_tokens = custom.maxTokens
    else if ('max_completion_tokens' in body) body.max_completion_tokens = custom.maxTokens
    else body.max_tokens = custom.maxTokens
  }
  if (Number.isFinite(custom.temperature)) body.temperature = custom.temperature
  return body
}

export class ProviderProxy {
  /**
   * @param {{ customizationFor: (sessionId: string, model: string|null) => object|null, env?: Record<string,string>, log?: (m: string) => void, fetchImpl?: typeof fetch }} options
   */
  constructor(options) {
    this.options = options
    this.server = null
    this.origin = null
    /** session id → { system, tools, model, at } for the prompt preview. */
    this.seen = new Map()
    this.lastDefault = null
  }

  async start() {
    this.server = http.createServer((req, res) => { void this.forward(req, res) })
    await new Promise((resolve, reject) => {
      this.server.once('error', reject)
      this.server.listen(0, '127.0.0.1', resolve)
    })
    this.server.unref?.()
    this.origin = `http://127.0.0.1:${this.server.address().port}`
    return this.origin
  }

  async forward(req, res) {
    const raw = req.url ?? ''
    if (!raw.startsWith(PREFIX)) { res.writeHead(404); res.end(); return }
    const target = raw.slice(PREFIX.length)
    if (!/^https?:\/\//.test(target)) { res.writeHead(400); res.end(); return }
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    let payload = Buffer.concat(chunks)
    const sessionHeader = String(req.headers['x-session-id'] ?? '')
    const sessionId = sessionHeader ? (sessionHeader.startsWith('sess_') ? sessionHeader : `sess_${sessionHeader}`) : ''
    const main = String(req.headers['x-zcode-session-type'] ?? 'main') === 'main'
    if (req.method === 'POST' && payload.length && /json/.test(String(req.headers['content-type'] ?? ''))) {
      try {
        const body = JSON.parse(payload.toString('utf8'))
        const custom = main && sessionId ? this.options.customizationFor(sessionId, typeof body.model === 'string' ? body.model : null) : null
        if (main && sessionId && systemPromptOf(body) !== null) {
          const record = { defaultSystem: systemPromptOf(body), tools: toolNamesOf(body), toolDefs: toolDefsOf(body), model: body.model ?? null, at: Date.now() }
          if (custom) applyToRequest(body, custom)
          record.system = systemPromptOf(body)
          this.seen.set(sessionId, record)
          this.lastDefault = record
          if (custom) payload = Buffer.from(JSON.stringify(body))
        }
      } catch (error) {
        this.options.log?.(`zcode-bridge: proxy left a request unchanged: ${error?.message || error}`)
      }
    }
    if (sessionId && this.options.dryRun?.(sessionId)) { cannedReply(res, raw); return }
    const headers = {}
    for (const [name, value] of Object.entries(req.headers)) if (!HOP_HEADERS.has(name.toLowerCase())) headers[name] = value
    const controller = new AbortController()
    res.on('close', () => { if (!res.writableFinished) controller.abort() })
    let response
    try {
      response = await (this.options.fetchImpl ?? fetch)(upstreamUrl(target, this.options.env), {
        method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : payload, signal: controller.signal, redirect: 'manual',
      })
    } catch (error) {
      if (!res.headersSent) { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { type: 'proxy_error', message: `Couldn’t reach ${new URL(target).host}: ${error?.cause?.message || error?.message || error}` } })) }
      return
    }
    const out = {}
    response.headers.forEach((value, name) => { if (!HOP_HEADERS.has(name) && name !== 'content-encoding') out[name] = value })
    res.writeHead(response.status, out)
    if (!response.body) { res.end(); return }
    try {
      for await (const chunk of response.body) { if (!res.write(chunk)) await new Promise((resolve) => res.once('drain', resolve)) }
    } catch {}
    res.end()
  }

  async stop() {
    if (!this.server) return
    this.server.closeAllConnections?.()
    await new Promise((resolve) => this.server.close(() => resolve()))
  }
}

/**
 * Keep the proxied provider configs in step with the user's: `builtin` is ZCode's shipped catalog, `personal`
 * the user's own file (~/.zcode/v2/provider_config.json). Both copies live in `dir`. A change to the user's
 * file is copied in; a change ZCode makes to the copy is written back with the original URLs.
 */
export class ProviderConfigMirror {
  // carryBack false (the workflow runner's bridge): the user's file is only read, never written. A runner's copy
  // names its own short-lived proxy port, so carrying it back would point the user's ZCode at a port that closes.
  constructor({ builtinSource, personalSource, dir, origin, log, carryBack = true }) {
    Object.assign(this, { builtinSource, personalSource, dir, origin, log, carryBack: carryBack !== false })
    this.builtinPath = path.join(dir, 'zcode-builtin.json')
    this.personalPath = path.join(dir, 'provider_config.json')
    this.lastPersonalSource = null
    this.lastPersonalCopy = null
    this.timer = null
  }

  sync() {
    fs.mkdirSync(this.dir, { recursive: true })
    const builtin = JSON.parse(fs.readFileSync(this.builtinSource, 'utf8'))
    writeIfChanged(this.builtinPath, JSON.stringify(rewriteProviderConfig(builtin, this.origin), null, 2))
    this.syncPersonal()
  }

  syncPersonal() {
    const source = readText(this.personalSource)
    const copy = readText(this.personalPath)
    // ZCode rewrote its copy (a model default, a provider edit): carry it back to the user's file first.
    if (this.carryBack && copy !== null && this.lastPersonalCopy !== null && copy !== this.lastPersonalCopy && source === this.lastPersonalSource) {
      try {
        const restored = JSON.stringify(restoreProviderConfig(JSON.parse(copy), this.origin), null, 2)
        fs.mkdirSync(path.dirname(this.personalSource), { recursive: true })
        fs.writeFileSync(this.personalSource, restored, { mode: 0o600 })
        this.lastPersonalSource = restored
        this.lastPersonalCopy = copy
        return
      } catch (error) { this.log?.(`zcode-bridge: couldn’t carry back provider config: ${error?.message || error}`) }
    }
    if (source === this.lastPersonalSource && copy !== null) return
    let next
    if (source === null) next = null
    else {
      try { next = JSON.stringify(rewriteProviderConfig(JSON.parse(source), this.origin), null, 2) } catch { next = source }
    }
    if (next === null) { try { fs.rmSync(this.personalPath, { force: true }) } catch {} }
    else writeIfChanged(this.personalPath, next, 0o600)
    this.lastPersonalSource = source
    this.lastPersonalCopy = next === null ? null : readText(this.personalPath)
  }

  watch(intervalMs = 1000) {
    this.timer = setInterval(() => { try { this.syncPersonal() } catch (error) { this.log?.(`zcode-bridge: provider config sync failed: ${error?.message || error}`) } }, intervalMs)
    this.timer.unref?.()
  }

  stop() { clearInterval(this.timer) }
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf8') } catch { return null }
}

function writeIfChanged(file, text, mode) {
  if (readText(file) === text) return
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, text, mode ? { mode } : undefined)
  fs.renameSync(temp, file)
}
