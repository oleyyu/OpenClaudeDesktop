#!/usr/bin/env node
// A minimal MCP stdio server for tests: one `echo` tool that returns its text argument.
import readline from 'node:readline'
const send = (message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  let message
  try { message = JSON.parse(line) } catch { return }
  if (message.method === 'initialize') send({ id: message.id, result: { protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake-mcp', version: '1.0.0' } } })
  else if (message.method === 'tools/list') send({ id: message.id, result: { tools: [{ name: 'echo', description: 'Echo the text back', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] } })
  else if (message.method === 'tools/call') send({ id: message.id, result: { content: [{ type: 'text', text: `echo: ${message.params?.arguments?.text ?? ''}` }] } })
  else if (message.id !== undefined && message.method) send({ id: message.id, result: {} })
})
