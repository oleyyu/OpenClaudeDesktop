// ACP bridge shutdown: no agent process outlives its bridge. A thread/start still preparing its agent when the bridge
// shuts down (MiniMax's first-run npm install of its SQLite module, here a slow fake npm) used to spawn the agent once
// the install finished, after the bridge had closed: nothing ever stopped that process, and whatever held the bridge
// (a test file, the app's core) waited on it forever. Runs against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { AgentHost } from '../packages/acp-bridge/src/agent-host.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(check, label, ms = 20000) {
  const end = Date.now() + ms
  for (;;) {
    if (check()) return
    if (Date.now() > end) throw new Error(`timed out waiting for ${label}`)
    await sleep(20)
  }
}

test('AgentHost: a host stopped before it started never spawns its process', async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-stop-')))
  try {
    const marker = path.join(home, 'spawned')
    const host = new AgentHost({ command: process.execPath, args: ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '')`], env: process.env, cwd: home })
    await host.stop()
    await assert.rejects(host.start(), /stopped before it started/)
    assert.equal(host.child, null)
    await sleep(300)
    assert.equal(fs.existsSync(marker), false)
  } finally { fs.rmSync(home, { recursive: true, force: true }) }
})

test('a thread/start still preparing its agent when the bridge shuts down never starts that agent', async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-late-')))
  const bin = path.join(home, 'bin')
  fs.mkdirSync(bin)
  // MiniMax installs its SQLite module with the npm next to the Node that runs it: a slow stand-in that says when it ran.
  fs.symlinkSync(process.execPath, path.join(bin, 'node'))
  const started = path.join(home, 'npm-started'), finished = path.join(home, 'npm-finished')
  fs.writeFileSync(path.join(bin, 'npm'), [
    '#!/bin/sh',
    `: > '${started}'`,
    'sleep 1',
    'mkdir -p node_modules/better-sqlite3',
    `echo '{"name":"better-sqlite3","main":"index.js"}' > node_modules/better-sqlite3/package.json`,
    `echo 'module.exports = {}' > node_modules/better-sqlite3/index.js`,
    `: > '${finished}'`,
  ].join('\n') + '\n', { mode: 0o755 })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough(), toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter: adapterById('minimax'), log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: path.join(bin, 'node'),
      CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      FAKE_ACP_LOG: logFile, MAVIS_SQLITE3_MODULE_PATH: path.join(home, 'native'),
    },
  })
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({}), onNotification: () => {}, log: () => {} })
  client.start()
  try {
    await client.call('initialize', {}, 30000)
    void client.call('thread/start', { cwd: home }, 30000).catch(() => {})
    await until(() => fs.existsSync(started), 'the SQLite module install to begin')
    await server.shutdown()
    await until(() => fs.existsSync(finished), 'the SQLite module install to finish')
    // The agent, were it started, would answer initialize right away.
    await sleep(1500)
    assert.equal(fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '', '', 'no agent process started after the bridge shut down')
  } finally {
    client.close()
    await server.shutdown()
    fs.rmSync(home, { recursive: true, force: true })
  }
})
