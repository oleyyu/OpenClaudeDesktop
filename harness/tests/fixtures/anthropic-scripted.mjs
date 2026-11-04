// A local scripted Anthropic-Messages model server for the real-binary scripts (opencode-bridge-v2-smoke.mjs,
// opencode-v2-live-probe.mjs): POST …/messages answers what `reply(body)` decides, streamed as Anthropic SSE.
// reply → { text, think, tool: {name, input}, tools: [{name, input}…], status (an error), hang (never ends), delay }.
// It listens on a loopback port: run these scripts in a normal terminal, not in a sandbox that refuses listen().
import http from 'node:http'

export const textOf = (content) => (typeof content === 'string' ? content : (content ?? []).map((block) => block.text ?? (block.type === 'tool_result' ? textOf(block.content) : '')).join('\n'))
export const systemOf = (body) => textOf(Array.isArray(body.system) ? body.system : body.system ?? '')
export const toolNames = (body) => (body.tools ?? []).map((tool) => tool.name)
const reminder = (text) => /^<system-reminder>/.test(text ?? '')
/** The user's own prompts (not tool results, not the agent's system reminders). */
export const userTexts = (body) => body.messages.filter((message) => message.role === 'user')
  .map((message) => (typeof message.content === 'string' ? message.content : message.content.filter((block) => block.type === 'text' && !reminder(block.text)).map((block) => block.text).join('\n')))
  .filter((text) => text.trim())
/** Tool results since the newest prompt of the user's own. */
export const resultsSinceLastPrompt = (body) => {
  let count = 0
  for (const message of [...body.messages].reverse()) {
    if (message.role !== 'user') continue
    const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text', text: message.content }]
    const tools = blocks.filter((block) => block.type === 'tool_result').length
    if (tools === 0 && blocks.some((block) => block.type === 'text' && block.text && !reminder(block.text))) break
    count += tools
  }
  return count
}
/** The newest user text block (several prompts that arrived together: the newest is last). */
export const newestPrompt = (body) => {
  const last = [...body.messages].reverse().find((message) => message.role === 'user' && (typeof message.content === 'string' || message.content.some((block) => block.type === 'text' && block.text?.trim() && !reminder(block.text))))
  if (!last) return ''
  return typeof last.content === 'string' ? last.content : last.content.filter((block) => block.type === 'text' && block.text?.trim() && !reminder(block.text)).at(-1)?.text ?? ''
}

export function createAnthropicServer(reply) {
  const requests = []
  const hangers = []
  const server = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.split('?')[0].endsWith('/messages')) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end('{"type":"error","error":{"type":"not_found_error","message":"nope"}}')
      return
    }
    const body = JSON.parse(raw)
    requests.push({ ...body, receivedAt: Date.now(), headers: req.headers })
    let answer
    try { answer = (await reply(body)) ?? { text: 'ok' } } catch (error) { answer = { text: `script error: ${error?.message}` } }
    if (answer.status) {
      res.writeHead(answer.status, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ type: 'error', error: { type: answer.status === 400 ? 'invalid_request_error' : 'api_error', message: `scripted failure ${answer.status}` } }))
      return
    }
    if (answer.hang) {
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.write('event: ping\ndata: {"type":"ping"}\n\n')
      hangers.push(res)
      req.on('close', () => res.end())
      return
    }
    if (answer.delay) await new Promise((resolve) => setTimeout(resolve, answer.delay))
    const id = `msg_${requests.length}`
    const events = [['message_start', { type: 'message_start', message: { id, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, usage: { input_tokens: 120, output_tokens: 1, cache_read_input_tokens: 30 } } }]]
    let index = 0
    if (answer.think) {
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'thinking', thinking: '' } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'thinking_delta', thinking: answer.think } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'signature_delta', signature: 'sig' } }], ['content_block_stop', { type: 'content_block_stop', index }])
      index++
    }
    const tools = answer.tools ?? (answer.tool ? [answer.tool] : null)
    if (tools) {
      // Several tool calls in one step (the agent runs them in parallel).
      tools.forEach((tool, n) => {
        if (n) { events.push(['content_block_stop', { type: 'content_block_stop', index }]); index++ }
        events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'tool_use', id: `toolu_${requests.length}_${n}`, name: tool.name, input: {} } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(tool.input) } }])
      })
    } else {
      const text = answer.text ?? ''
      events.push(['content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: text.slice(0, 6) } }], ['content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: text.slice(6) } }])
    }
    events.push(['content_block_stop', { type: 'content_block_stop', index }], ['message_delta', { type: 'message_delta', delta: { stop_reason: tools ? 'tool_use' : 'end_turn' }, usage: { output_tokens: 9 } }], ['message_stop', { type: 'message_stop' }])
    res.writeHead(200, { 'content-type': 'text/event-stream' })
    for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  return {
    server,
    requests,
    /** Listens on a loopback port: its base URL. */
    listen: () => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))),
    releaseHangers: () => { for (const res of hangers.splice(0)) try { res.end() } catch {} },
    close: () => { for (const res of hangers.splice(0)) try { res.end() } catch {} server.close(); server.closeAllConnections?.() },
  }
}

/** Settings › Models' custom provider file for the scripted server (route `fake`, models fake-model and fake-plan). */
export function fakeProviders(baseURL) {
  const info = (name) => ({ name, reasoning: true, attachment: true, limit: { context: 200000, output: 8000 } })
  return { providers: [{ route: 'fake', displayName: 'Fake Lab', api: 'anthropic-messages', baseURL, models: ['fake-model', 'fake-plan'], modelInfo: { 'fake-model': info('Fake Model'), 'fake-plan': info('Fake Plan Model') } }] }
}
