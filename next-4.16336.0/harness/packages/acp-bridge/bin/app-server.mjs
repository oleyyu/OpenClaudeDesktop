#!/usr/bin/env node
// OpenClaude Desktop core entry for the ACP agents: `node bin/app-server.mjs app-server --stdio`.
// Which agent runs comes from CODE_DESKTOP_AGENT_BINARY (or CODE_DESKTOP_ACP_AGENT); see src/agents/index.js.
import fs from 'node:fs'
import { detectAdapter } from '../src/agents/index.js'
import { serve } from '../src/server.js'

// An Extension Pack names its agent in bridge/pack.json ({"agent": "gemini"}): the explicit id wins
// over detection from the agent program.
try {
  const pack = JSON.parse(fs.readFileSync(new URL('../pack.json', import.meta.url), 'utf8'))
  if (typeof pack?.agent === 'string' && !process.env.CODE_DESKTOP_ACP_AGENT) process.env.CODE_DESKTOP_ACP_AGENT = pack.agent
} catch {}

const args = process.argv.slice(2)
if (args[0] === '--version') {
  const { BRIDGE_VERSION } = await import('../src/server.js')
  process.stdout.write(`code-desktop-acp-bridge ${BRIDGE_VERSION}\n`)
  process.exit(0)
}
if (args[0] !== 'app-server' || !args.includes('--stdio')) {
  process.stderr.write('usage: app-server.mjs app-server --stdio\n')
  process.exit(2)
}
// stdout carries protocol lines only.
console.log = (...values) => process.stderr.write(`${values.join(' ')}\n`)
const adapter = detectAdapter(process.env)
const server = serve({ input: process.stdin, output: process.stdout, env: process.env, adapter })
const stop = () => server.shutdown().finally(() => process.exit(0))
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdin.on('end', stop)
