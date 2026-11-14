// The Harness's fetch comes from the same undici as the global dispatcher dsh-http-proxy installs: with Node's
// built-in fetch on a different undici, responses lost their headers (no content-encoding), so a compressed Messages
// stream reached the parser undecoded and tool calls came back as `unknown`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import zlib from 'node:zlib'

test('fetch keeps headers and decodes a compressed event stream after undici loads', async () => {
  await import('../packages/codex-app-server/src/fetch-undici.js')
  const undici = await import('undici')
  assert.equal(globalThis.fetch, undici.fetch)
  const events = 'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","name":"bash"}}\n\n'.repeat(3)
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'content-encoding': 'gzip' })
    res.end(zlib.gzipSync(events))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    undici.setGlobalDispatcher(new undici.Agent())
    const response = await fetch(`http://127.0.0.1:${server.address().port}/v1/messages`)
    assert.equal(response.headers.get('content-type'), 'text/event-stream')
    assert.equal(await response.text(), events)
  } finally { server.close() }
})
