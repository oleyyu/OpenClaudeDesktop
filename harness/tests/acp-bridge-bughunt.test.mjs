// ACP bridge bug hunt: regressions found by reproducing them against testing/fake-acp-agent.mjs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { serve } from '../packages/acp-bridge/src/server.js'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'

const FAKE_AGENT = path.resolve(import.meta.dirname, '../packages/acp-bridge/testing/fake-acp-agent.mjs')
const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'acp-bughunt-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function bridge({ adapter = adapterById('kimi'), env = {}, home = tmp(), onRequest = async () => ({ decision: 'accept' }) } = {}) {
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough()
  const toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter, log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: FAKE_AGENT, CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), ...env,
    },
  })
  const notes = []
  const requests = []
  const client = new LineTransport(toClient, toServer, { onRequest: async (method, params) => { requests.push({ method, params }); return onRequest(method, params) }, onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const waitFor = async (match, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs
    for (;;) {
      const found = notes.find((note) => match(note.method, note.params))
      if (found) return found.params
      if (Date.now() > end) throw new Error('timed out waiting for a notification')
      await sleep(20)
    }
  }
  const call = (method, params) => client.call(method, params, 30000)
  const agentLog = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return { home, notes, requests, call, waitFor, agentLog, close: () => server.shutdown() }
}
const mode = (permissionMode) => ({ codeDesktop: { permissionMode } })

test('a turn stopped before its prompt reached the agent never sends that prompt', async () => {
  const b = bridge()
  try {
    const { thread } = await b.call('thread/start', { cwd: b.home, ...mode('auto') })
    // A new mode changes the launch key: the agent restarts before the prompt goes out, and Stop lands meanwhile.
    const { turn } = await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'never-run', text_elements: [] }], ...mode('bypass'), approvalPolicy: 'never', sandbox: 'danger-full-access' })
    await b.call('turn/interrupt', { threadId: thread.id, turnId: turn.id })
    const done = await b.waitFor((method, params) => method === 'turn/completed' && params.turn.id === turn.id)
    assert.equal(done.turn.status, 'interrupted')
    await sleep(300)
    const prompts = b.agentLog().filter((entry) => entry.method === 'session/prompt')
    assert.deepEqual(prompts.map((entry) => entry.params.prompt?.[0]?.text), [], 'the stopped prompt never reached the agent')
  } finally {
    await b.close()
  }
})

test('terminal output keeps a multi-byte character that arrives split across two reads', async () => {
  const { ClientServices } = await import('../packages/acp-bridge/src/client-services.js')
  const dir = tmp()
  const deltas = []
  const services = new ClientServices({ thread: () => ({ cwd: dir, permission: { mode: 'bypass' } }), profileFile: path.join(dir, 'terminal.sb'), onOutput: (id, chunk) => deltas.push(chunk) })
  // '中' is E4 B8 AD: its first two bytes and its last one reach the pipe 150 ms apart (two reads).
  const script = "process.stdout.write(Buffer.from([0xe4, 0xb8])); setTimeout(() => process.stdout.write(Buffer.from([0xad, 0x0a])), 150)"
  const { terminalId } = services.create({ command: process.execPath, args: ['-e', script], cwd: dir })
  await services.terminal('terminal/wait_for_exit', { terminalId })
  await sleep(50)
  const { output } = await services.terminal('terminal/output', { terminalId })
  assert.equal(output, '中\n')
  assert.equal(deltas.join(''), '中\n')
})
