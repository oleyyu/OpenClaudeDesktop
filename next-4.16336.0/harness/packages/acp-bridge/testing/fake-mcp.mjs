#!/usr/bin/env node
// A stdio MCP server for the smoke: one tool, `echo`, answering "MCP_ECHO:<text>", and one prompt, `pr-review`
// ({pr} required, {focus} optional), whose prompts/get answers "Review PR <pr>…".
import readline from 'node:readline'

const send = (message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n')
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  let message
  try { message = JSON.parse(line) } catch { return }
  if (message.id === undefined) return
  switch (message.method) {
    case 'initialize':
      send({ id: message.id, result: { protocolVersion: message.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {}, prompts: {} }, serverInfo: { name: 'fake-mcp', version: '1.0.0' } } })
      break
    case 'tools/list':
      send({ id: message.id, result: { tools: [{ name: 'echo', description: 'Echoes its text back.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] } })
      break
    case 'tools/call':
      send({ id: message.id, result: { content: [{ type: 'text', text: `MCP_ECHO:${message.params?.arguments?.text ?? ''}` }] } })
      break
    case 'prompts/list':
      send({ id: message.id, result: { prompts: [{ name: 'pr-review', description: 'Review a pull request.', arguments: [{ name: 'pr', required: true }, { name: 'focus', required: false }] }] } })
      break
    case 'prompts/get': {
      const args = message.params?.arguments ?? {}
      if (message.params?.name !== 'pr-review') { send({ id: message.id, error: { code: -32602, message: 'unknown prompt' } }); break }
      send({ id: message.id, result: { messages: [{ role: 'user', content: { type: 'text', text: `Review PR ${args.pr}${args.focus ? ` focusing on ${args.focus}` : ''}.` } }] } })
      break
    }
    case 'ping':
      send({ id: message.id, result: {} })
      break
    default:
      send({ id: message.id, error: { code: -32601, message: `no ${message.method}` } })
  }
})
