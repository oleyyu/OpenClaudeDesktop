// Cross-cutting fixes, round 4: Qwen's MCP Apps (interactive connector views) keep their text result and say a view exists.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { completeToolItem } from '../packages/acp-bridge/src/projection.js'

const mcpItem = { type: 'mcpToolCall', id: 'm1', server: 'chart', tool: 'show_chart', status: 'inProgress', arguments: {}, result: null, error: null }

test('an mcp_app result keeps the fallback text, drops the HTML and marks the row', () => {
  const raw = { type: 'mcp_app', serverName: 'chart', resourceUri: 'ui://chart/app.html', html: '<html>…</html>', toolResult: { content: [] }, fallbackText: 'Chart of sales by month' }
  const done = completeToolItem(mcpItem, { content: [], rawOutput: raw }, { failed: false, cwd: '/w', durationMs: 5 })
  assert.deepEqual(done.result.content, [{ type: 'text', text: 'Chart of sales by month' }])
  assert.deepEqual(done.codeDesktop.mcpApp, { serverName: 'chart', resourceUri: 'ui://chart/app.html' })
  assert.equal(JSON.stringify(done).includes('<html>'), false)
  const own = completeToolItem(mcpItem, { content: [], rawOutput: { ...raw, toolResult: { content: [{ type: 'text', text: 'RESULT of show_chart' }] } } }, { failed: false, cwd: '/w' })
  assert.deepEqual(own.result.content, [{ type: 'text', text: 'RESULT of show_chart' }])
})
