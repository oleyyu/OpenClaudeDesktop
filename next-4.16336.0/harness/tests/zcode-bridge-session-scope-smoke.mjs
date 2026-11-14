// Smoke of what a ZCode session keeps once OpenClaude Desktop's own tools (the code_desktop agent-tools server) join it,
// against the real ZCode agent behind harness/packages/zcode-bridge with a local scripted model standing in for GLM:
//   - the project's own MCP servers (.zcode/config.json of the folder, zcode.json at the worktree root, run in its
//     own folder) are still offered beside code_desktop's tools;
//   - a background command keeps running after the session is left (thread/unsubscribe), GLM hears it finished
//     (task-notification), and the session is released afterwards;
//   - a background sub-agent survives an OpenClaude Desktop tools refresh (codeDesktop/appTools/changed) and reports back.
// Isolated: temp HOME (set TMPDIR to a short folder: ZCode puts sockets there), loopback model, no network.
//
// Usage: node tests/zcode-bridge-session-scope-smoke.mjs   (ZCODE_BINARY=/path/to/zcode.cjs to use another ZCode)
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { startFakeAnthropic, userText, toolResultFor, textOf } from '../packages/zcode-bridge/test-support/fake-anthropic.mjs'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..', '..')
const { CodexClient } = require(path.join(root, 'app/electron/codex.cjs'))
const { createAgentToolsHost } = require(path.join(root, 'app/electron/agent-tools-host.cjs'))
const AGENT = process.env.ZCODE_BINARY || path.join(root, 'work/agents/zcode-bridge/zcode-3.14.3/glm/zcode.cjs')
const FAKE_MCP = path.join(root, 'harness/packages/zcode-bridge/test-support/fake-mcp.mjs')
if (!fs.existsSync(AGENT)) { console.error(`ZCode runtime not found at ${AGENT} (set ZCODE_BINARY).`); process.exit(2) }

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'zss-'))
const home = path.join(base, 'h')
const repo = path.join(home, 'repo')
const ws = path.join(repo, 'pkg')
fs.mkdirSync(path.join(ws, '.zcode'), { recursive: true })
fs.mkdirSync(path.join(repo, 'mcp'), { recursive: true })
execFileSync('git', ['init', '-q'], { cwd: repo })
fs.copyFileSync(FAKE_MCP, path.join(repo, 'mcp', 'fake-mcp.mjs'))
// The folder's own server, and one at the worktree root whose relative path only resolves in the root folder.
fs.writeFileSync(path.join(ws, '.zcode', 'config.json'), JSON.stringify({ mcp: { servers: { projmcp: { type: 'stdio', command: process.execPath, args: [FAKE_MCP] } } } }))
fs.writeFileSync(path.join(repo, 'zcode.json'), JSON.stringify({ mcp: { servers: { rootmcp: { command: process.execPath, args: ['mcp/fake-mcp.mjs'] } } } }))
const marker = path.join(ws, 'marker.txt')

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`) }

const host = createAgentToolsHost({
  modules: [{ file: 'smoke.mjs', module: { group: 'smoke', tools: [{ name: 'smoke_echo', description: 'Echo.', inputSchema: { type: 'object', properties: { text: { type: 'string' } } }, annotations: { readOnlyHint: true }, handler: async (args) => `echo:${args.text}` }] } }],
  resolveSession: (named) => (named ? { id: named, cwd: ws } : null),
  runAsNode: false, command: process.execPath, tmpRoot: base,
  logger: { log() {}, warn() {} },
})
await host.start()

const fake = await startFakeAnthropic(async (body) => {
  const typed = userText(body)
  if (/BGCHILD/.test(textOf(body.messages?.[0]?.content))) return { delayMs: 6000, text: 'child finished' }
  if (/BG_AGENT/.test(typed) && !toolResultFor(body, 'Agent')) return { tool: { name: 'Agent', input: { description: 'Background child', prompt: 'BGCHILD keep going', subagent_type: 'general-purpose', run_in_background: true } } }
  if (/BG_LONG/.test(typed) && !toolResultFor(body, 'Bash')) return { tool: { name: 'Bash', input: { command: `sleep 6; echo done > ${marker}`, description: 'long background job', run_in_background: true } } }
  if (/<task-notification>/.test(typed)) return { text: 'Background work finished.' }
  return { text: 'ok' }
})
const env = {
  HOME: home, TMPDIR: base, XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
  ZCODE_CREDENTIAL_SECRET: 'smoke', CODE_DESKTOP_ZCODE_PLATFORM_ORIGIN: fake.url, CODE_DESKTOP_ZCODE_QUOTA_ORIGIN: fake.url, CODE_DESKTOP_AGENT_BINARY: AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
  CODE_DESKTOP_AGENT_VERSION: '3.14.3', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'bridge-state'), CODE_DESKTOP_NODE_BINARY: process.execPath, NO_PROXY: '*', PATH: process.env.PATH,
  ZCODE_BRIDGE_SETTLE_POLL_MS: '700', ...host.launchEnv(),
}
const events = []
const client = new CodexClient({ binary: path.join(root, 'harness/packages/zcode-bridge/bin/app-server.mjs'), initializeTimeout: 120000, env })
client.on('event', (event) => events.push(event))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const until = async (predicate, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (predicate()) return true; await sleep(100) } return predicate() }
const policy = { approvalsReviewer: 'user', approvalPolicy: 'never', codeDesktop: { permissionMode: 'bypass', afterPlan: 'auto' } }
const KEY = 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION'

async function start() {
  const identity = host.sessionIdentity(null)
  const { thread } = await client.request('thread/start', { cwd: ws, sandbox: 'danger-full-access', ...policy, config: { [KEY]: identity } })
  host.bindThread(identity, thread.id)
  return thread.id
}
async function turn(threadId, text) {
  const from = events.length
  const requestsFrom = fake.requests.length
  await client.request('turn/start', { threadId, input: [{ type: 'text', text, text_elements: [] }], cwd: ws, sandboxPolicy: { type: 'dangerFullAccess' }, ...policy })
  await until(() => events.slice(from).some((event) => event.method === 'turn/completed' && event.params.threadId === threadId), 60000)
  const requests = fake.requests.slice(requestsFrom).filter((request) => request.headers['x-zcode-session-type'] !== 'other')
  return { tools: [...new Set(requests.flatMap((request) => (request.body.tools ?? []).map((tool) => tool.name)))] }
}
const notifications = () => fake.requests.filter((request) => JSON.stringify(request.body.messages ?? []).includes('task-notification')).length

try {
  const init = await client.start()
  console.log(`ZCode ${init.engineVersion}`)
  await client.request('account/login/start', { type: 'apiKey', apiKey: 'sk-smoke', codeDesktop: { template: 'zai-api', baseUrl: fake.url } })
  await sleep(2000)

  // 1. The project's MCP servers beside OpenClaude Desktop's tools.
  const first = await start()
  const { tools } = await turn(first, 'hello')
  check('OpenClaude Desktop tools are offered', tools.includes('mcp__code_desktop__smoke_echo'), tools.join(','))
  check('the folder’s own .zcode/config.json MCP server is still offered', tools.includes('mcp__projmcp__echo'), tools.filter((name) => name.startsWith('mcp__')).join(','))
  check('the worktree root’s zcode.json MCP server runs in its folder and is offered', tools.includes('mcp__rootmcp__echo'), tools.filter((name) => name.startsWith('mcp__')).join(','))

  // 2. A background command outlives leaving the session.
  const second = await start()
  await turn(second, 'BG_LONG')
  const notifiedBefore = notifications()
  const left = await client.request('thread/unsubscribe', { threadId: second })
  check('thread/unsubscribe with a background command answers unsubscribed', left?.status === 'unsubscribed', JSON.stringify(left))
  await until(() => fs.existsSync(marker), 20000)
  check('the background command still finishes after the session was left', fs.existsSync(marker))
  await until(() => notifications() > notifiedBefore, 15000)
  check('GLM is told the background command finished (task-notification)', notifications() > notifiedBefore)
  const released = await until(() => events.some((event) => event.method === 'thread/status/changed' && event.params.threadId === second && event.params.status?.type === 'notLoaded'), 15000)
  check('the session is released once its background work settled', released)

  // 3. A background sub-agent survives an OpenClaude Desktop tools refresh.
  const third = await start()
  await turn(third, 'BG_AGENT')
  await sleep(1000)
  const notifiedBeforeChild = notifications()
  const from = events.length
  await client.request('codeDesktop/appTools/changed', { revision: 1 })
  const childDone = await until(() => events.slice(from).some((event) => event.method === 'turn/completed' && event.params.threadId !== third && event.params.turn?.status === 'completed'), 30000)
  check('a background sub-agent completes although OpenClaude Desktop’s tools changed meanwhile', childDone, events.slice(from).map((event) => event.method).join(','))
  await until(() => notifications() > notifiedBeforeChild, 15000)
  check('GLM is told the background sub-agent finished', notifications() > notifiedBeforeChild)
} catch (error) {
  check('smoke ran', false, error?.stack ?? String(error))
} finally {
  try { await client.stop?.() } catch {}
  try { host.stop() } catch {}
  try { await fake.close() } catch {}
  // ZCode's own processes may still be writing for a moment after the client stopped.
  try { fs.rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch {}
}
const failed = results.filter((result) => !result.ok)
console.log(`${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
