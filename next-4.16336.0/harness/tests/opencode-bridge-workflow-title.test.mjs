// A workflow agent's session on the OpenCode / MiMo bridge (packages/opencode-bridge/src/index.js createThread): the
// OpenClaude Desktop workflow runner (clientInfo.name code-desktop-workflows, app/electron/workflow-child.mjs) gets its
// sessions created with a title, so OpenCode's and MiMo's SessionPrompt.ensureTitle spend no model request naming
// each agent; the placeholder never becomes the thread's name. Every new session reads its folder's MCP servers once,
// so tool calls are attributed from the first turn.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'

function stub(flavor, clientName) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-ocwt-')))
  const cwd = path.join(home, 'w')
  fs.mkdirSync(cwd)
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home }, input: new PassThrough(), output: new PassThrough() })
  const calls = []
  let next = 0
  bridge.notify = () => {}
  bridge.clientName = clientName
  bridge.api = async (method, route, options) => {
    calls.push({ method, route, body: options?.body, directory: options?.directory })
    if (method === 'POST' && route === '/session') return { id: `ses_${++next}`, directory: cwd, title: options.body.title ?? 'New session - 2026-10-07T00:00:00.000Z' }
    if (method === 'GET' && route === '/config') return { mcp: { github: { type: 'remote', url: 'https://example.invalid/mcp' } } }
    return {}
  }
  return { bridge, calls, cwd }
}

for (const flavor of ['opencode', 'mimo']) {
  test(`${flavor}: a workflow agent's session is created named; the name stays the app's to give`, async () => {
    const { bridge, calls, cwd } = stub(flavor, 'code-desktop-workflows')
    const thread = await bridge.createThread({ cwd })
    assert.deepEqual(calls.find((call) => call.route === '/session').body, { title: 'Workflow agent' })
    assert.equal(bridge.store.get(thread.id).workflowAgent, true)
    assert.equal(thread.threadObject().name, null, 'the placeholder is no name')
    assert.equal(bridge.coldThread({ id: thread.id, directory: cwd, title: 'Workflow agent', time: { created: 1, updated: 1 } }).name, null)
    // The user's own sessions: OpenCode names them as before.
    const plain = stub(flavor, 'code-desktop')
    await plain.bridge.createThread({ cwd: plain.cwd })
    assert.deepEqual(plain.calls.find((call) => call.route === '/session').body, {})
    assert.equal(plain.bridge.coldThread({ id: 'ses_x', directory: plain.cwd, title: 'Workflow agent', time: { created: 1, updated: 1 } }).name, 'Workflow agent', 'a session the user named so keeps it')
  })
}

test('thread/start reads the folder\'s MCP servers once, so a new session\'s connector calls are mcpToolCall rows', async () => {
  const { bridge, cwd } = stub('opencode', 'code-desktop')
  assert.deepEqual(bridge.knownMcpNames(cwd), [])
  await bridge.createThread({ cwd })
  assert.deepEqual(bridge.knownMcpNames(cwd), ['github'])
  const refresh = bridge.refreshMcpNames.bind(bridge)
  let refreshed = 0
  bridge.refreshMcpNames = (...args) => { refreshed++; return refresh(...args) }
  await bridge.createThread({ cwd })
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const item = toolItem({ id: 'p', callID: 'c', tool: 'github_create_issue', state: { status: 'completed', input: { title: 'x' }, output: 'ok' } }, { mcpServers: bridge.knownMcpNames(cwd), threadId: 'ses_1', cwd })
  assert.deepEqual([item.type, item.server, item.tool], ['mcpToolCall', 'github', 'create_issue'])
  assert.equal(refreshed, 0, 'once per folder')
})

test('mimo: no next-prompt prediction after a workflow agent\'s turn (the app\'s own sessions keep it)', async () => {
  for (const [clientName, expected] of [['code-desktop-workflows', 0], ['code-desktop', 1]]) {
    const { bridge, calls, cwd } = stub('mimo', clientName)
    const thread = await bridge.createThread({ cwd })
    thread.emit = () => {}
    thread.startNext = () => {}
    thread.activeTurn = { id: 'msg_turn', startedMs: Date.now() }
    thread.finishTurn()
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(calls.filter((call) => call.method === 'POST' && /\/predict$/.test(call.route)).length, expected, clientName)
  }
})
