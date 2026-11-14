/**
 * A scripted model server for the ACP bridge's smoke and probes: one local
 * HTTP server answering the three wire protocols the ACP agents speak
 * (OpenAI Chat Completions, Anthropic Messages, Gemini generateContent), so the
 * real agent binaries run end to end with no key or network.
 *
 * Every request is normalized ({protocol, model, system, messages, tools,
 * lastUser, firstUser, toolResults}) and recorded in `requests`; `reply(request)`
 * decides the answer: {text, thinking, tool: {name, input}, tools: [...],
 * hang, error: {status, message}}.
 */
import http from 'node:http'

const textOfParts = (parts) => (parts ?? []).map((part) => (typeof part === 'string' ? part : part?.text ?? '')).filter(Boolean).join('\n')

function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((block) => {
    if (typeof block === 'string') return block
    if (block?.type === 'text' || block?.type === 'input_text' || block?.type === 'output_text') return block.text ?? ''
    if (block?.type === 'tool_result') return contentText(block.content)
    return ''
  }).filter(Boolean).join('\n')
}

/** OpenAI chat body → normalized request. */
function fromOpenAI(body) {
  const system = []
  const messages = []
  for (const message of body.messages ?? []) {
    if (message.role === 'system' || message.role === 'developer') { system.push(contentText(message.content)); continue }
    if (message.role === 'tool') {
      messages.push({ role: 'tool', text: contentText(message.content), toolResults: [{ id: message.tool_call_id, text: contentText(message.content) }], toolCalls: [] })
      continue
    }
    messages.push({
      role: message.role,
      text: contentText(message.content),
      images: Array.isArray(message.content) ? message.content.filter((part) => part?.type === 'image_url').length : 0,
      toolCalls: (message.tool_calls ?? []).map((call) => ({ id: call.id, name: call.function?.name, args: call.function?.arguments })),
      toolResults: [],
    })
  }
  const tools = (body.tools ?? []).map((tool) => tool.function?.name ?? tool.name).filter(Boolean)
  const toolSchemas = Object.fromEntries((body.tools ?? []).map((tool) => [tool.function?.name ?? tool.name, tool.function?.parameters ?? tool.parameters ?? {}]))
  return { protocol: 'openai', toolSchemas, model: body.model, system: system.join('\n\n'), messages, tools, stream: body.stream === true, params: { maxTokens: body.max_tokens ?? body.max_completion_tokens, temperature: body.temperature } }
}

/** Anthropic messages body → normalized request. */
function fromAnthropic(body) {
  const system = typeof body.system === 'string' ? body.system : contentText(body.system)
  const messages = (body.messages ?? []).map((message) => {
    const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }]
    return {
      role: message.role,
      text: blocks.filter((block) => block.type === 'text').map((block) => block.text).join('\n'),
      images: blocks.filter((block) => block.type === 'image').length,
      toolCalls: blocks.filter((block) => block.type === 'tool_use').map((block) => ({ id: block.id, name: block.name, args: block.input })),
      toolResults: blocks.filter((block) => block.type === 'tool_result').map((block) => ({ id: block.tool_use_id, text: contentText(block.content) })),
    }
  })
  const toolSchemas = Object.fromEntries((body.tools ?? []).map((tool) => [tool.name, tool.input_schema ?? {}]))
  return { protocol: 'anthropic', toolSchemas, model: body.model, system, messages, tools: (body.tools ?? []).map((tool) => tool.name), stream: body.stream === true, params: { maxTokens: body.max_tokens, temperature: body.temperature } }
}

/** Gemini generateContent body → normalized request. */
function fromGemini(body, model) {
  const system = textOfParts(body.systemInstruction?.parts ?? body.system_instruction?.parts)
  const messages = (body.contents ?? []).map((content) => {
    const parts = content.parts ?? []
    return {
      role: content.role === 'model' ? 'assistant' : 'user',
      text: parts.filter((part) => typeof part.text === 'string' && !part.thought).map((part) => part.text).join('\n'),
      images: parts.filter((part) => part.inlineData).length,
      toolCalls: parts.filter((part) => part.functionCall).map((part) => ({ id: part.functionCall.id, name: part.functionCall.name, args: part.functionCall.args })),
      toolResults: parts.filter((part) => part.functionResponse).map((part) => ({ id: part.functionResponse.id, name: part.functionResponse.name, text: JSON.stringify(part.functionResponse.response ?? {}) })),
    }
  })
  const decls = (body.tools ?? []).flatMap((tool) => tool.functionDeclarations ?? tool.function_declarations ?? [])
  const tools = decls.map((decl) => decl.name)
  const toolSchemas = Object.fromEntries(decls.map((decl) => [decl.name, decl.parametersJsonSchema ?? decl.parameters ?? {}]))
  const config = body.generationConfig ?? {}
  return { protocol: 'gemini', toolSchemas, model, system, messages, tools, stream: true, params: { maxTokens: config.maxOutputTokens, temperature: config.temperature } }
}

/** Fills lastUser/firstUser (the last/first user text that is not only tool results) and toolResults. */
function finish(request, raw, url) {
  const users = request.messages.filter((message) => message.role === 'user' && message.text && message.toolResults.length === 0)
  // The current prompt: every user message after the last assistant one (agents add reminders as extra user messages).
  const lastAssistant = request.messages.map((message) => message.role).lastIndexOf('assistant')
  const current = request.messages.slice(lastAssistant + 1).filter((message) => message.role === 'user' && message.text && message.toolResults.length === 0)
  // lastUser: the latest real prompt (agents append reminders as extra user messages); currentUser: all of this turn's.
  const prompts = users.filter((message) => !/^\s*<system-reminder>[\s\S]*<\/system-reminder>\s*$/.test(message.text))
  request.lastUser = (prompts.at(-1) ?? users.at(-1))?.text ?? ''
  request.currentUser = (current.length ? current : users.slice(-1)).map((message) => message.text).join('\n')
  request.firstUser = users[0]?.text ?? ''
  const last = request.messages.at(-1)
  request.afterToolResult = Boolean(last && (last.role === 'tool' || last.toolResults.length > 0))
  request.toolCalls = request.messages.flatMap((message) => message.toolCalls)
  // The raw body stays out of the log (agents send ~100 KB system prompts each step).
  request.url = url
  return request
}

const USAGE = { input: 120, output: 30, cached: 20, reasoning: 8 }

function openAIStream(res, answer, model) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const id = `chatcmpl-${Date.now()}`
  const chunk = (delta, finish = null, extra = {}) => res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta, finish_reason: finish }], ...extra })}\n\n`)
  chunk({ role: 'assistant', content: '' })
  if (answer.thinking) chunk({ reasoning_content: answer.thinking })
  if (answer.text) for (const piece of splitText(answer.text)) chunk({ content: piece })
  const calls = answer.tools ?? (answer.tool ? [answer.tool] : [])
  calls.forEach((call, index) => {
    chunk({ tool_calls: [{ index, id: `call_${index}_${Date.now()}`, type: 'function', function: { name: call.name, arguments: '' } }] })
    chunk({ tool_calls: [{ index, function: { arguments: JSON.stringify(call.input ?? {}) } }] })
  })
  chunk({}, calls.length ? 'tool_calls' : 'stop')
  res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [], usage: { prompt_tokens: USAGE.input, completion_tokens: USAGE.output, total_tokens: USAGE.input + USAGE.output, prompt_tokens_details: { cached_tokens: USAGE.cached }, completion_tokens_details: { reasoning_tokens: USAGE.reasoning } } })}\n\n`)
  res.write('data: [DONE]\n\n')
  res.end()
}

function openAIJson(res, answer, model) {
  const calls = answer.tools ?? (answer.tool ? [answer.tool] : [])
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({
    id: `chatcmpl-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
    choices: [{ index: 0, finish_reason: calls.length ? 'tool_calls' : 'stop', message: { role: 'assistant', content: answer.text ?? '', ...(answer.thinking ? { reasoning_content: answer.thinking } : {}), ...(calls.length ? { tool_calls: calls.map((call, index) => ({ id: `call_${index}_${Date.now()}`, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.input ?? {}) } })) } : {}) } }],
    usage: { prompt_tokens: USAGE.input, completion_tokens: USAGE.output, total_tokens: USAGE.input + USAGE.output },
  }))
}

function anthropicAnswer(res, answer, body) {
  const calls = answer.tools ?? (answer.tool ? [answer.tool] : [])
  const id = `msg_${Date.now()}`
  const usage = { input_tokens: USAGE.input, output_tokens: USAGE.output, cache_read_input_tokens: USAGE.cached }
  const blocks = []
  if (answer.thinking) blocks.push({ type: 'thinking', thinking: answer.thinking, signature: 'sig' })
  if (answer.text) blocks.push({ type: 'text', text: answer.text })
  calls.forEach((call, index) => blocks.push({ type: 'tool_use', id: `toolu_${index}_${Date.now()}`, name: call.name, input: call.input ?? {} }))
  const stop = calls.length ? 'tool_use' : 'end_turn'
  if (body.stream !== true) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ id, type: 'message', role: 'assistant', model: body.model, content: blocks, stop_reason: stop, stop_sequence: null, usage }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  send('message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { ...usage, output_tokens: 1 } } })
  blocks.forEach((block, index) => {
    if (block.type === 'thinking') {
      send('content_block_start', { type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '', signature: '' } })
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: block.thinking } })
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'sig' } })
    } else if (block.type === 'text') {
      send('content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } })
      for (const piece of splitText(block.text)) send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: piece } })
    } else {
      send('content_block_start', { type: 'content_block_start', index, content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} } })
      send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) } })
    }
    send('content_block_stop', { type: 'content_block_stop', index })
  })
  send('message_delta', { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: USAGE.output } })
  send('message_stop', { type: 'message_stop' })
  res.end()
}

function geminiCandidate(answer) {
  const calls = answer.tools ?? (answer.tool ? [answer.tool] : [])
  const parts = []
  if (answer.thinking) parts.push({ text: answer.thinking, thought: true })
  if (answer.text) parts.push({ text: answer.text })
  for (const call of calls) parts.push({ functionCall: { name: call.name, args: call.input ?? {} } })
  return { content: { role: 'model', parts }, finishReason: 'STOP', index: 0 }
}
const geminiUsage = () => ({ promptTokenCount: USAGE.input, candidatesTokenCount: USAGE.output, cachedContentTokenCount: USAGE.cached, thoughtsTokenCount: USAGE.reasoning, totalTokenCount: USAGE.input + USAGE.output + USAGE.reasoning })

function geminiAnswer(res, answer, model, stream) {
  if (!stream) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ candidates: [geminiCandidate(answer)], usageMetadata: geminiUsage(), modelVersion: model }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
  if (answer.thinking) res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: answer.thinking, thought: true }] }, index: 0 }], modelVersion: model })}\n\n`)
  const pieces = answer.text ? splitText(answer.text) : []
  for (const piece of pieces.slice(0, -1)) res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: piece }] }, index: 0 }], modelVersion: model })}\n\n`)
  const last = { ...answer, thinking: undefined, text: pieces.at(-1) }
  res.write(`data: ${JSON.stringify({ candidates: [geminiCandidate(last)], usageMetadata: geminiUsage(), modelVersion: model })}\n\n`)
  res.end()
}

// Two pieces, so clients see real deltas.
function splitText(text) {
  if (text.length < 8) return [text]
  const middle = Math.floor(text.length / 2)
  return [text.slice(0, middle), text.slice(middle)]
}

/**
 * @param {{ reply: (request: object) => object, log?: (line: string) => void }} options
 */
export function createFakeModel({ reply, log = () => {} }) {
  const requests = []
  const hanging = new Set()
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const url = new URL(req.url, 'http://localhost')
    log(`${req.method} ${url.pathname}`)
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch {}
    try {
      if (req.method === 'GET' && /\/models\/?$/.test(url.pathname)) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake-model', object: 'model', owned_by: 'fake' }], models: [] }))
        return
      }
      let request, kind, model = body.model
      const gemini = /\/models\/([^/:]+):(streamGenerateContent|generateContent|countTokens)/.exec(url.pathname)
      if (gemini) {
        model = decodeURIComponent(gemini[1])
        if (gemini[2] === 'countTokens') {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ totalTokens: 42 }))
          return
        }
        kind = gemini[2] === 'streamGenerateContent' ? 'gemini-stream' : 'gemini'
        request = fromGemini(body, model)
        request.stream = kind === 'gemini-stream'
      } else if (url.pathname.endsWith('/chat/completions')) {
        kind = 'openai'
        request = fromOpenAI(body)
      } else if (url.pathname.endsWith('/messages') && !url.pathname.endsWith('/count_tokens')) {
        kind = 'anthropic'
        request = fromAnthropic(body)
      } else if (url.pathname.endsWith('/count_tokens')) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ input_tokens: 42 }))
        return
      } else {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: `not found: ${req.method} ${url.pathname}` } }))
        return
      }
      finish(request, body, url.pathname + url.search)
      requests.push(request)
      const answer = (await reply(request)) ?? { text: 'ok' }
      if (answer.hang) {
        // A reply that takes long: held until the client aborts it, or (like a real API, which keeps
        // streaming after a client stops listening) answered after hangMs.
        hanging.add(res)
        res.writeHead(200, { 'content-type': 'text/event-stream' })
        res.write(kind === 'anthropic' ? 'event: ping\ndata: {"type":"ping"}\n\n' : ': keep-alive\n\n')
        const timer = setTimeout(() => {
          hanging.delete(res)
          try {
            res.removeHeader?.('content-type')
            if (kind === 'openai') {
              res.write(`data: ${JSON.stringify({ id: 'late', object: 'chat.completion.chunk', created: 0, model, choices: [{ index: 0, delta: { content: 'late reply' }, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`)
            } else if (kind === 'anthropic') {
              res.write(`event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { id: 'late', type: 'message', role: 'assistant', model, content: [], usage: { input_tokens: 1, output_tokens: 1 } } })}\n\nevent: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } })}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`)
            } else {
              res.write(`data: ${JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: 'late reply' }] }, finishReason: 'STOP', index: 0 }] })}\n\n`)
            }
          } catch {}
          res.end()
        }, answer.hangMs ?? 15000)
        res.on('close', () => { clearTimeout(timer); hanging.delete(res) })
        return
      }
      if (answer.error) {
        res.writeHead(answer.error.status ?? 500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: { message: answer.error.message ?? 'scripted failure', type: 'server_error', code: answer.error.status ?? 500 } }))
        return
      }
      if (answer.delayMs) await new Promise((resolve) => setTimeout(resolve, answer.delayMs))
      if (kind === 'openai') return request.stream ? openAIStream(res, answer, model) : openAIJson(res, answer, model)
      if (kind === 'anthropic') return anthropicAnswer(res, answer, body)
      return geminiAnswer(res, answer, model, kind === 'gemini-stream')
    } catch (error) {
      log(`fake model error: ${error?.stack || error}`)
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: String(error?.message || error) } }))
    }
  })
  return {
    requests,
    server,
    async start() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      return `http://127.0.0.1:${server.address().port}`
    },
    async close() {
      for (const res of hanging) try { res.end() } catch {}
      server.closeAllConnections?.()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}
