// A scripted Anthropic-Messages server standing in for GLM in tests: every request is recorded, and the reply
// is chosen by a script function (body → {text}|{tool}|{tools}|{thinking,text}|{error}|{hang}). Streams SSE like
// api.z.ai/api/anthropic. Also answers the Coding Plan quota endpoint (/api/monitor/usage/quota/limit) and stands in
// for an official Z.ai MCP service (/api/v1/mcp/server/<name>, streamable HTTP with JSON replies): it answers only
// requests that carry an Authorization header, and records every request's headers in `mcpRequests`.
import http from 'node:http'

export const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
export const systemOf = (body) => textOf(Array.isArray(body.system) ? body.system : body.system ?? '')
export const lastUser = (body) => [...(body.messages ?? [])].reverse().find((message) => message.role === 'user')
/** The text the user typed in the request's latest real user turn (system reminders stripped). */
export const userText = (body) => {
  const message = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user' && (typeof m.content === 'string' || m.content.some((b) => b.type === 'text' && !b.text.startsWith('<system-reminder>'))))
  if (!message) return ''
  return typeof message.content === 'string' ? message.content : message.content.filter((b) => b.type === 'text' && !b.text.startsWith('<system-reminder>')).map((b) => b.text).join('\n')
}
const isTypedUser = (m) => m.role === 'user' && (typeof m.content === 'string' || m.content.some((b) => b.type === 'text' && !b.text.startsWith('<system-reminder>')))
/** Whether the current turn (after the latest typed user message) already carries a tool_result for `name`. */
export const toolResultFor = (body, name) => {
  const messages = body.messages ?? []
  let start = 0
  for (let index = messages.length - 1; index >= 0; index--) if (isTypedUser(messages[index]) && !(Array.isArray(messages[index].content) && messages[index].content.some((b) => b.type === 'tool_result'))) { start = index; break }
  const turn = messages.slice(start)
  const ids = new Set()
  for (const m of turn) if (m.role === 'assistant' && Array.isArray(m.content)) for (const b of m.content) if (b.type === 'tool_use' && (!name || b.name === name)) ids.add(b.id)
  for (const m of turn) if (m.role === 'user' && Array.isArray(m.content)) for (const b of m.content) if (b.type === 'tool_result' && ids.has(b.tool_use_id)) return b
  return null
}

export async function startFakeAnthropic(script, { quota } = {}) {
  const requests = []
  const mcpRequests = []
  const resetRequests = []
  let resetUsed = false
  let counter = 0
  const sse = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.url.includes('/api/monitor/usage/quota/limit')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(quota ? quota(req) : { success: true, code: 200, data: { level: 'pro', limits: [] } }))
      return
    }
    // ZCode's earned Coding Plan resets (coding-plan/reset/status and /use): one 5-hour reset until it is used.
    if (req.url.startsWith('/api/v1/coding-plan/reset/')) {
      resetRequests.push({ url: req.url, method: req.method, headers: req.headers, body: raw })
      res.writeHead(200, { 'content-type': 'application/json' })
      if (req.url.endsWith('/status')) res.end(JSON.stringify({ code: 0, data: { available_five_hour_resets: resetUsed ? [] : [{ expire_at: Date.now() + 3600e3 }], available_week_resets: [], latest_five_hour_reset_history: null, latest_week_reset_history: null, has_unread_history: false } }))
      else if (req.url.endsWith('/use') && req.method === 'POST') { resetUsed = true; res.end(JSON.stringify({ code: 0, data: { used: true } })) }
      else res.end(JSON.stringify({ code: 404, msg: 'unknown' }))
      return
    }
    if (req.url.startsWith('/api/v1/mcp/server/')) {
      mcpRequests.push({ url: req.url, method: req.method, headers: req.headers })
      if (req.method !== 'POST') { res.writeHead(405); res.end(); return }
      if (!req.headers.authorization) { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'unauthorized' })); return }
      let message = null
      try { message = JSON.parse(raw) } catch {}
      if (!message || message.id === undefined) { res.writeHead(202); res.end(); return }
      const results = {
        initialize: { protocolVersion: message.params?.protocolVersion ?? '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'fake-official', version: '1.0.0' } },
        'tools/list': { tools: [{ name: 'company_lookup', description: 'Look up a company.', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } }] },
        'tools/call': { content: [{ type: 'text', text: `company: ${message.params?.arguments?.name ?? '?'}` }] },
        ping: {},
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(Object.hasOwn(results, message.method) ? { jsonrpc: '2.0', id: message.id, result: results[message.method] } : { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unknown method ${message.method}` } }))
      return
    }
    if (req.url.startsWith('/api/v1/oauth/cli/init')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 0, data: { authorize_url: 'https://z.ai/oauth/authorize?flow=fake-flow', expires_at: Math.floor(Date.now() / 1000) + 600, flow_id: 'fake-flow', poll_interval_sec: 1 } }))
      return
    }
    if (req.url.startsWith('/api/v1/oauth/cli/poll/')) {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 0, data: { status: 'pending' } }))
      return
    }
    if (!req.url.includes('/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}'); return }
    const body = raw ? JSON.parse(raw) : {}
    requests.push({ url: req.url, headers: req.headers, body })
    let reply
    try { reply = await script(body, req) } catch (error) { reply = { error: String(error?.message ?? error) } }
    reply ??= { text: 'ok' }
    if (reply.hang) { req.on('close', () => res.destroy()); return }
    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs))
    if (reply.error) {
      res.writeHead(reply.status ?? 400, { 'content-type': 'application/json' })
      // errorBody: the provider's own error shape (GLM answers {error: {code: '1308', message}} for a used-up plan).
      res.end(JSON.stringify(reply.errorBody ?? { type: 'error', error: { type: 'invalid_request_error', message: reply.error } }))
      return
    }
    const id = `msg_fake_${++counter}`
    if (body.stream !== true) {
      const content = []
      if (reply.thinking) content.push({ type: 'thinking', thinking: [].concat(reply.thinking).join(''), signature: 'sig' })
      if (reply.text) content.push({ type: 'text', text: [].concat(reply.text).join('') })
      for (const tool of reply.tools ?? (reply.tool ? [reply.tool] : [])) content.push({ type: 'tool_use', id: tool.id ?? `toolu_${counter}`, name: tool.name, input: tool.input ?? {} })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content, stop_reason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn', stop_sequence: null, usage: { input_tokens: reply.inputTokens ?? 120, output_tokens: reply.outputTokens ?? 30 } }))
      return
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    const usage = { input_tokens: reply.inputTokens ?? 120, output_tokens: 0, cache_read_input_tokens: reply.cacheRead ?? 0, cache_creation_input_tokens: 0 }
    sse(res, 'message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, usage } })
    let index = 0
    if (reply.thinking) {
      sse(res, 'content_block_start', { type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '', signature: '' } })
      for (const piece of [].concat(reply.thinking)) sse(res, 'content_block_delta', { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: piece } })
      sse(res, 'content_block_delta', { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'sig' } })
      sse(res, 'content_block_stop', { type: 'content_block_stop', index })
      index++
    }
    if (reply.text) {
      sse(res, 'content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      for (const piece of [].concat(reply.text)) sse(res, 'content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } })
      sse(res, 'content_block_stop', { type: 'content_block_stop', index })
      index++
    }
    const tools = reply.tools ?? (reply.tool ? [reply.tool] : [])
    for (const tool of tools) {
      const toolId = tool.id ?? `toolu_${counter}_${index}`
      sse(res, 'content_block_start', { type: 'content_block_start', index, content_block: { type: 'tool_use', id: toolId, name: tool.name, input: {} } })
      sse(res, 'content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(tool.input ?? {}) } })
      sse(res, 'content_block_stop', { type: 'content_block_stop', index })
      index++
    }
    sse(res, 'message_delta', { type: 'message_delta', delta: { stop_reason: tools.length ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: reply.outputTokens ?? 30 } })
    sse(res, 'message_stop', { type: 'message_stop' })
    res.end()
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  return { url, requests, mcpRequests, resetRequests, close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve) }) }
}
