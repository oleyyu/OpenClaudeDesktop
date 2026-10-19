// Diagnostic only: with OPENCLAUDE_SSE_TRACE=<file>, every streamed Messages API response is recorded as its event
// skeleton (type, index, block type, tool name, delta type) — no text, arguments or headers — one JSON line per
// response. Used to see what a relay actually streams when a tool call loses its name. Imported first by
// bin/codex-app-server.mjs so it wraps fetch before any client captures it; without the variable it does nothing.
import fs from 'node:fs'

export function installSseTrace(file = process.env.OPENCLAUDE_SSE_TRACE) {
  if (!file || globalThis.fetch?.__sseTrace) return
  const original = globalThis.fetch
  const traced = async (input, init) => {
    const response = await original(input, init)
    const url = String(input?.url ?? input)
    if (!/\/messages(\?|$)/.test(url) || !response.body || init?.headers?.accept === 'application/json') return response
    const decoder = new TextDecoder(), events = []
    let buffer = '', written = false
    const write = (end) => {
      if (written) return
      written = true
      fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), host: new URL(url).host, end, events }) + '\n')
    }
    const scan = (text) => {
      buffer += text
      let at
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1)
        if (!line.startsWith('data:')) continue
        try {
          const e = JSON.parse(line.slice(5))
          if (e.type === 'ping') continue
          events.push([e.type, e.index, e.content_block?.type, e.content_block?.name, e.delta?.type].filter((v) => v !== undefined))
          if (e.type === 'message_stop') write('message_stop')
        } catch { events.push(['unparsed', line.slice(0, 40)]) }
      }
    }
    // Inspect the chunks as the client reads them: a tee'd copy would lose its queued chunks when the client aborts
    // the request after the last event.
    const body = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) { try { scan(decoder.decode(chunk, { stream: true })) } catch {} controller.enqueue(chunk) },
      flush() { try { write('eof') } catch {} },
    }))
    init?.signal?.addEventListener?.('abort', () => { try { write('aborted') } catch {} }, { once: true })
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
  }
  traced.__sseTrace = true
  globalThis.fetch = traced
}

installSseTrace()
