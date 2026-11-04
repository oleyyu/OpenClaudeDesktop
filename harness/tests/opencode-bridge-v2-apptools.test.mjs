// OpenCode 2.x bridge: which app thread a code_desktop tools/call is for. 2.x decodes a call's arguments against the
// MCP tool's input schema before the call reaches the server (core/src/tool/runtime.ts) and drops what the schema
// doesn't list when it says additionalProperties:false (most of the app's tools), so 1.x's hidden __code_desktop_session
// argument can't carry the thread. 2.x names the calling session in `_meta["ai.opencode/sessionID"]` on every call
// (core/src/mcp/client.ts); the server (app/electron/agent-tools-server.mjs) maps it to the thread with the bridge's
// runtime files (app/electron/agent-tools-opencode.mjs): a session's own file, else a sub-agent's pointer to its root.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'
import { BridgeConfigV2 } from '../packages/opencode-bridge/src/v2/config.js'
import { OPENCODE_RUNTIME_ENV, OPENCODE_SESSION_META, opencodeThread } from '../../app/electron/agent-tools-opencode.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-apptools-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const APP_TOOLS = { CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/app/node', args: ['/app/tools.mjs'] }), CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/sock', CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'secret-token' }
const meta = (id) => ({ [OPENCODE_SESSION_META]: id })

test('the app tools server under 2.x is told the runtime folder; 1.x\'s config never is', () => {
  const home = tmp()
  const v2 = new BridgeConfigV2({ flavor: OC2, stateDir: path.join(home, 'state'), env: { HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...APP_TOOLS } })
  const env = v2.write()
  assert.equal(JSON.parse(fs.readFileSync(env.OPENCODE_CONFIG, 'utf8')).mcp.servers.code_desktop.environment[OPENCODE_RUNTIME_ENV], v2.runtimeDir)
  assert.equal(JSON.parse(env.OPENCODE_CONFIG_CONTENT).plugins.at(-1).options.appTools.environment[OPENCODE_RUNTIME_ENV], v2.runtimeDir)
  assert.ok(!fs.readFileSync(path.join(v2.pluginDir, 'index.js'), 'utf8').includes('__code_desktop_session'), 'the v2 plugin adds no hidden argument')
})

test('a 2.x call\'s _meta session maps to its app thread: own file, a sub-agent\'s file or pointer → the root; else nothing', () => {
  const runtime = tmp()
  const env = { [OPENCODE_RUNTIME_ENV]: runtime }
  fs.mkdirSync(path.join(runtime, 'sessions'), { recursive: true })
  fs.mkdirSync(path.join(runtime, 'sandbox'), { recursive: true })
  const write = (id, value) => fs.writeFileSync(path.join(runtime, 'sessions', `${id}.json`), JSON.stringify(value))
  write('ses_root', { root: 'ses_root', appTools: { prefix: 'code_desktop_', session: 'ses_root' } })
  write('ses_known', { root: 'ses_root', appTools: { prefix: 'code_desktop_', session: 'ses_root' } })
  fs.writeFileSync(path.join(runtime, 'sandbox', 'ses_new.root'), 'ses_root')
  fs.writeFileSync(path.join(runtime, 'sandbox', 'ses_stray.root'), '../../etc/passwd')
  write('ses_plain', { root: 'ses_plain' })

  assert.equal(opencodeThread(meta('ses_root'), env), 'ses_root')
  assert.equal(opencodeThread(meta('ses_known'), env), 'ses_root', 'a registered sub-agent: its file names the root')
  assert.equal(opencodeThread(meta('ses_new'), env), 'ses_root', 'a sub-agent the bridge has no file for: the plugin\'s pointer')
  assert.equal(opencodeThread(meta('ses_stray'), env), null, 'a pointer is an id, never a path')
  assert.equal(opencodeThread(meta('ses_plain'), env), null, 'no appTools: no thread')
  assert.equal(opencodeThread(meta('ses_unknown'), env), null)
  assert.equal(opencodeThread(meta('../sessions/ses_root'), env), null, 'the id is made file-safe')
  assert.equal(opencodeThread({}, env), null)
  assert.equal(opencodeThread(meta('ses_root'), {}), null, '1.x / MiMo: no runtime folder, the hidden argument names it')
  assert.equal(opencodeThread(meta('ses_root'), { [OPENCODE_RUNTIME_ENV]: 'relative/dir' }), null)
})

test('end to end: the files a v2 Bridge writes for a thread and its sub-agent name the root thread', () => {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, stateDir: path.join(home, 'state'), env: { HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...APP_TOOLS }, input: new PassThrough(), output: new PassThrough() })
  const env = { [OPENCODE_RUNTIME_ENV]: bridge.config.runtimeDir }
  const root = new LiveThread(bridge, { info: { id: 'ses_root', directory: path.join(home, 'w') } })
  root.writeRuntime()
  const child = new LiveThread(bridge, { info: { id: 'ses_child', parentID: 'ses_root', directory: root.cwd }, root, parent: root })
  child.writeRuntime()
  assert.equal(opencodeThread(meta('ses_root'), env), 'ses_root')
  assert.equal(opencodeThread(meta('ses_child'), env), 'ses_root')
})
