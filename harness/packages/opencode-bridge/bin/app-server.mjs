#!/usr/bin/env node
// OpenClaude Desktop core bridge for OpenCode and MiMo Code: `app-server --stdio`.
//
// Environment (app/electron/codex.cjs resolveCore):
//   CODE_DESKTOP_AGENT_BINARY   the agent program (empty → `opencode` / `mimo` on PATH)
//   CODE_DESKTOP_AGENT_RUNNER   "node" when the entry runs under Node
//   CODE_DESKTOP_AGENT_VERSION  the installed release
//   CODE_DESKTOP_NODE_BINARY    the Node to use for a node runner
//   CODE_DESKTOP_BRIDGE_STATE   this bridge's own data folder
//   CODE_DESKTOP_CORE_ID / CODE_DESKTOP_OPENCODE_FLAVOR  "opencode" | "mimo" (otherwise detected, flavor.js)
//   CODE_DESKTOP_OPENCODE_API   "v1" | "v2": the OpenCode HTTP API generation (otherwise `--version`, flavor.js detectApi)
//   CODE_DESKTOP_PROVIDERS_FILE   Settings › Models custom providers (optional)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { detectApi, detectFlavor, FLAVORS, withApi } from '../src/flavor.js'
import { Bridge } from '../src/index.js'

const args = process.argv.slice(2)
if (args[0] !== 'app-server') {
  process.stderr.write('usage: app-server.mjs app-server --stdio\n')
  process.exit(2)
}

function onPath(name) {
  for (const dir of String(process.env.PATH ?? '').split(path.delimiter)) {
    if (!dir) continue
    const file = path.join(dir, name)
    try { fs.accessSync(file, fs.constants.X_OK); if (fs.statSync(file).isFile()) return file } catch {}
  }
  return null
}

const env = process.env
let binary = env.CODE_DESKTOP_AGENT_BINARY || ''
let flavor = await detectFlavor({ env, binary: binary || undefined })
if (!binary) binary = onPath(flavor.binary) ?? (flavor === FLAVORS.mimo ? onPath('mimocode') : null) ?? ''
const stateDir = env.CODE_DESKTOP_BRIDGE_STATE || path.join(os.homedir(), 'Library', 'Application Support', 'OpenClaude Desktop', 'cores', flavor.id, 'state')
const logFile = path.join(stateDir, 'bridge.log')
fs.mkdirSync(stateDir, { recursive: true })
const logStream = fs.createWriteStream(logFile, { flags: 'a' })
const log = (line) => { try { logStream.write(`${new Date().toISOString()} ${line}\n`) } catch {} if (env.CODE_DESKTOP_BRIDGE_DEBUG) process.stderr.write(`${line}\n`) }
// Before anything is spawned: OpenCode 2.x takes other `serve` flags (src/v2/server.js).
const runner = env.CODE_DESKTOP_AGENT_RUNNER || ''
const nodeBinary = env.CODE_DESKTOP_NODE_BINARY || process.execPath
const detected = await detectApi(flavor, binary, { env, runner, nodeBinary, log })
flavor = withApi(flavor, detected.api)

const bridge = new Bridge({
  flavor, binary, runner, nodeBinary,
  version: env.CODE_DESKTOP_AGENT_VERSION || '', detectedVersion: detected.version, stateDir, env, log,
})
const stop = async () => { await bridge.shutdown().catch(() => {}); process.exit(0) }
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
process.stdin.on('end', stop)
bridge.start()
