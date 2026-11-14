// OpenClaude Desktop's own tools server ("code_desktop") on the OpenCode / MiMo bridge (packages/opencode-bridge/src/
// app-tools.js): OpenCode runs one MCP server per folder for every session, so the server is registered once in the
// bridge's generated config layer (socket and token as {env:…} references, never written; the user's config is never
// touched), each session's runtime file names its app thread (a sub-agent: its root), and the generated plugin adds
// __code_desktop_session to every call of a code_desktop_* tool. Side-question sessions name none. Calls need no card;
// the tool card never shows the added argument. Without the variables nothing changes.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { BridgeConfig } from '../packages/opencode-bridge/src/config.js'
import { pluginSource } from '../packages/opencode-bridge/src/plugin.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'
import { appToolsServer, opencodeAppToolsEntry, appToolsPrefix, SESSION_ARG } from '../packages/opencode-bridge/src/app-tools.js'

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-oc-')))
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-x/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'secret-tok',
}

test('app-tools.js: one local entry, the secret only as an {env:} reference; nothing without the variables', () => {
  const server = appToolsServer(TOOLS)
  assert.deepEqual(opencodeAppToolsEntry(server), {
    type: 'local', command: ['/Apps/OpenClaude Desktop', '/Apps/agent-tools-server.mjs'], timeout: 600000,
    environment: { ELECTRON_RUN_AS_NODE: '1', CODE_DESKTOP_AGENT_TOOLS_SOCKET: '{env:CODE_DESKTOP_AGENT_TOOLS_SOCKET}', CODE_DESKTOP_AGENT_TOOLS_TOKEN: '{env:CODE_DESKTOP_AGENT_TOOLS_TOKEN}' },
  })
  assert.equal(appToolsPrefix(server), 'code_desktop_')
  assert.equal(SESSION_ARG, '__code_desktop_session')
  assert.equal(appToolsServer({}), null)
  assert.equal(appToolsServer({ ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SERVER: '[' }), null)
})

for (const flavor of ['opencode', 'mimo']) {
  test(`${flavor}: the generated config layer registers code_desktop (unless turned off); the agent server gets the socket and token`, () => {
    const home = tmp()
    const state = path.join(home, 'state')
    const config = new BridgeConfig({ flavor: FLAVORS[flavor], stateDir: state, env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh', ...TOOLS } })
    const env = config.write()
    const written = fs.readFileSync(config.configPath, 'utf8')
    assert.doesNotMatch(written, /secret-tok/, 'the token never reaches the config file')
    const overlay = JSON.parse(written)
    assert.deepEqual(overlay.mcp.code_desktop, opencodeAppToolsEntry(appToolsServer(TOOLS)))
    assert.equal(env.CODE_DESKTOP_AGENT_TOOLS_SOCKET, '/tmp/cd-tools-x/s')
    assert.equal(env.CODE_DESKTOP_AGENT_TOOLS_TOKEN, 'secret-tok')
    // Turned off in Customize › Connectors: left off.
    config.writeMcp({ servers: {}, disabled: ['code_desktop'] })
    assert.deepEqual(config.overlay().mcp.code_desktop, { enabled: false })
    // Without the variables: no entry, no extra environment.
    const plain = new BridgeConfig({ flavor: FLAVORS[flavor], stateDir: path.join(home, 'plain'), env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh' } })
    assert.equal(plain.overlay().mcp?.code_desktop, undefined)
    assert.equal(plain.write().CODE_DESKTOP_AGENT_TOOLS_TOKEN, undefined)
  })
}

function liveThread(env) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS.opencode, binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, ...env }, input: new PassThrough(), output: new PassThrough() })
  const replies = []
  bridge.notify = () => {}
  bridge.api = async (method, route, options) => {
    if (method === 'POST' && /\/permission\/.+\/reply$/.test(route)) replies.push({ route, body: options.body })
    if (method === 'GET' && route === '/config') return {}
    return {}
  }
  const thread = new LiveThread(bridge, { info: { id: 'ses_root', directory: path.join(home, 'w') } })
  thread.emit = () => {}
  const asked = []
  thread.clientRequest = async (...args) => { asked.push(args); return { decision: 'accept' } }
  bridge.threads.set(thread.id, thread)
  return { home, bridge, thread, replies, asked }
}

test('runtime files name the app thread (a sub-agent its root); the plugin adds it to code_desktop calls only', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  thread.writeRuntime()
  const child = new LiveThread(bridge, { info: { id: 'ses_child', parentID: 'ses_root', directory: thread.cwd }, root: thread, parent: thread })
  child.writeRuntime()
  const runtime = (id) => JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', `${id}.json`), 'utf8'))
  assert.deepEqual(runtime('ses_root').appTools, { prefix: 'code_desktop_', session: 'ses_root' })
  assert.deepEqual(runtime('ses_child').appTools, { prefix: 'code_desktop_', session: 'ses_root' })
  // A side question's throwaway session (index.js sideQuestion) has a runtime file without appTools.
  fs.writeFileSync(path.join(bridge.config.runtimeDir, 'sessions', 'ses_side.json'), JSON.stringify({ root: 'ses_side', cwd: thread.cwd, systemPrompt: 'x', sandbox: { mode: 'read-only' } }))
  const file = path.join(bridge.stateDir, 'plugin.mjs')
  fs.writeFileSync(file, pluginSource())
  process.env.CODE_DESKTOP_OPENCODE_STATE = bridge.stateDir
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  const run = async (tool, sessionID) => { const output = { args: { url: 'http://localhost:3000' } }; await hooks['tool.execute.before']({ tool, sessionID, callID: 'c' }, output); return output.args }
  assert.deepEqual(await run('code_desktop_preview_open', 'ses_root'), { url: 'http://localhost:3000', __code_desktop_session: 'ses_root' })
  assert.deepEqual(await run('code_desktop_preview_open', 'ses_child'), { url: 'http://localhost:3000', __code_desktop_session: 'ses_root' })
  assert.deepEqual(await run('code_desktop_preview_open', 'ses_side'), { url: 'http://localhost:3000' })
  assert.deepEqual(await run('github_create_issue', 'ses_root'), { url: 'http://localhost:3000' })
})

test('without the variables the runtime file has no appTools', () => {
  const { bridge, thread } = liveThread({})
  thread.writeRuntime()
  assert.equal(JSON.parse(fs.readFileSync(path.join(bridge.config.runtimeDir, 'sessions', 'ses_root.json'), 'utf8')).appTools, undefined)
})

test('a code_desktop call is allowed without a card, even in Ask mode; the card never shows the session argument', async () => {
  const { thread, replies, asked } = liveThread(TOOLS)
  thread.permission.mode = 'ask'
  await thread.onPermission({ id: 'per_1', sessionID: 'ses_root', permission: 'code_desktop_preview_click', patterns: ['*'], always: ['*'], metadata: {} })
  assert.deepEqual(replies.map((reply) => reply.body.reply), ['once'])
  assert.equal(asked.length, 0)
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const item = toolItem({ id: 'p1', callID: 'c1', tool: 'code_desktop_preview_click', state: { status: 'completed', input: { x: 1, __code_desktop_session: 'ses_root' }, output: 'ok' } }, { mcpServers: ['code_desktop'], threadId: 'ses_root', cwd: '/w' })
  assert.equal(item.type, 'mcpToolCall')
  assert.equal(item.server, 'code_desktop')
  assert.deepEqual(item.arguments, { x: 1 })
})

test('a new session attributes code_desktop calls before any MCP list: no session argument, the screenshot kept', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  // Nothing read the folder's MCP servers yet (no mcpServerStatus/list, no reload): the app's own server is known.
  assert.equal(bridge.cachedMcpNames, undefined)
  assert.deepEqual(bridge.knownMcpNames(thread.cwd), ['code_desktop'])
  assert.deepEqual(liveThread({}).bridge.knownMcpNames('/w'), [])
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const shot = { type: 'file', mime: 'image/png', url: 'data:image/png;base64,iVBORw0KGgo=' }
  const part = { id: 'p2', callID: 'c2', tool: 'code_desktop_preview_screenshot', state: { status: 'completed', input: { full: true, [SESSION_ARG]: 'ses_root' }, output: 'Captured page', attachments: [shot] } }
  const item = toolItem(part, { mcpServers: bridge.knownMcpNames(thread.cwd), threadId: 'ses_root', cwd: thread.cwd })
  assert.equal(item.type, 'mcpToolCall')
  assert.deepEqual(item.arguments, { full: true })
  assert.deepEqual(item.result.content, [{ type: 'text', text: 'Captured page' }, { type: 'image', data: 'iVBORw0KGgo=', mimeType: 'image/png' }])
  // The folder's own list, once read, adds the user's servers; the app's own stays.
  bridge.mergedConfig = async () => ({ mcp: { github: { type: 'remote', url: 'https://example.invalid/mcp' } } })
  await bridge.refreshMcpNames(thread.cwd)
  assert.deepEqual(bridge.knownMcpNames(thread.cwd), ['code_desktop', 'github'])
})

test('a dynamic tool row never shows the session argument and keeps the images the tool returned', async () => {
  const { toolItem } = await import('../packages/opencode-bridge/src/projection.js')
  const shot = { type: 'file', mime: 'image/png', url: 'data:image/png;base64,iVBORw0KGgo=' }
  const item = toolItem({ id: 'p3', callID: 'c3', tool: 'code_desktop_preview_screenshot', state: { status: 'completed', input: { x: 'hi', [SESSION_ARG]: 'ses_root' }, output: 'shot', attachments: [shot, { type: 'file', mime: 'application/pdf', url: 'data:application/pdf;base64,JVBERg==' }] } }, { mcpServers: [], threadId: 'ses_root', cwd: '/w' })
  assert.equal(item.type, 'dynamicToolCall')
  assert.deepEqual(item.arguments, { x: 'hi' })
  assert.deepEqual(item.contentItems, [{ type: 'inputText', text: 'shot' }, { type: 'inputImage', imageUrl: 'data:image/png;base64,iVBORw0KGgo=' }])
})

test('the plugin drops the session argument from the stored call once the server has it (code_desktop tools only)', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  thread.writeRuntime()
  const file = path.join(bridge.stateDir, 'plugin-after.mjs')
  fs.writeFileSync(file, pluginSource())
  process.env.CODE_DESKTOP_OPENCODE_STATE = bridge.stateDir
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  const args = { url: 'http://localhost:3000' }
  await hooks['tool.execute.before']({ tool: 'code_desktop_preview_open', sessionID: 'ses_root', callID: 'c' }, { args })
  assert.equal(args[SESSION_ARG], 'ses_root', 'the server gets it')
  await hooks['tool.execute.after']({ tool: 'code_desktop_preview_open', sessionID: 'ses_root', callID: 'c', args }, { title: '', output: 'ok', metadata: {} })
  assert.deepEqual(args, { url: 'http://localhost:3000' })
  const other = { [SESSION_ARG]: 'mine' }
  await hooks['tool.execute.after']({ tool: 'github_create_issue', sessionID: 'ses_root', callID: 'c', args: other }, {})
  assert.deepEqual(other, { [SESSION_ARG]: 'mine' }, 'another server\'s argument of that name stays')
  await hooks['tool.execute.after']({ tool: 'code_desktop_preview_open', sessionID: 'ses_root', callID: 'c' }, {})
})

test('every step\'s history drops the session argument from code_desktop calls (the stored copy OpenCode re-reads keeps it)', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  thread.writeRuntime()
  const file = path.join(bridge.stateDir, 'plugin-transform.mjs')
  fs.writeFileSync(file, pluginSource())
  process.env.CODE_DESKTOP_OPENCODE_STATE = bridge.stateDir
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  // The running/completed copy OpenCode saved while the call ran (session/processor.ts), as the next step reads it.
  const stored = { url: 'http://localhost:3000', [SESSION_ARG]: 'ses_root' }
  const call = { id: 'prt_1', sessionID: 'ses_root', messageID: 'msg_1', type: 'tool', callID: 'c1', tool: 'code_desktop_preview_open', state: { status: 'completed', input: stored, output: 'ok' } }
  const other = { id: 'prt_2', sessionID: 'ses_root', messageID: 'msg_1', type: 'tool', callID: 'c2', tool: 'github_create_issue', state: { status: 'completed', input: { [SESSION_ARG]: 'mine' }, output: 'ok' } }
  const unknown = { id: 'prt_3', sessionID: 'ses_side', messageID: 'msg_2', type: 'tool', callID: 'c3', tool: 'code_desktop_preview_open', state: { status: 'completed', input: { [SESSION_ARG]: 'x' }, output: 'ok' } }
  const text = { id: 'prt_4', sessionID: 'ses_root', messageID: 'msg_1', type: 'text', text: 'hi' }
  const output = { messages: [{ info: { id: 'msg_1', sessionID: 'ses_root', role: 'assistant' }, parts: [text, call, other] }, { info: { id: 'msg_2', sessionID: 'ses_side', role: 'assistant' }, parts: [unknown] }] }
  await hooks['experimental.chat.messages.transform']({}, output)
  const [first, second] = output.messages
  assert.deepEqual(first.parts[1].state.input, { url: 'http://localhost:3000' }, 'the model never sees it')
  assert.equal(first.parts[1].state.output, 'ok')
  assert.deepEqual(stored, { url: 'http://localhost:3000', [SESSION_ARG]: 'ses_root' }, 'a new part: what OpenCode read is untouched')
  assert.equal(first.parts[0], text)
  assert.deepEqual(first.parts[2].state.input, { [SESSION_ARG]: 'mine' }, 'another server\'s argument of that name stays')
  assert.deepEqual(second.parts[0].state.input, { [SESSION_ARG]: 'x' }, 'a session without OpenClaude Desktop\'s tools is left alone')
  // Nothing to do (a compaction's history, an empty step): no failure.
  await hooks['experimental.chat.messages.transform']({}, { messages: [] })
  await hooks['experimental.chat.messages.transform']({}, {})
})

test('mimo runs the hook\'s args: the session argument goes on a copy, so the stored input never has it', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  thread.writeRuntime()
  const file = path.join(bridge.stateDir, 'plugin-mimo.mjs')
  fs.writeFileSync(file, pluginSource({ replaceArgs: true }))
  process.env.CODE_DESKTOP_OPENCODE_STATE = bridge.stateDir
  const { CodeDesktop } = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  const hooks = await CodeDesktop({})
  const args = { url: 'http://localhost:3000' }
  const output = { args }
  await hooks['tool.execute.before']({ tool: 'code_desktop_preview_open', sessionID: 'ses_root', callID: 'c' }, output)
  assert.deepEqual(output.args, { url: 'http://localhost:3000', [SESSION_ARG]: 'ses_root' })
  assert.deepEqual(args, { url: 'http://localhost:3000' }, 'the object MiMo stores is untouched')
  const other = { args: { q: 1 } }
  await hooks['tool.execute.before']({ tool: 'github_search', sessionID: 'ses_root', callID: 'c' }, other)
  assert.deepEqual(other.args, { q: 1 })
  // The generated plugin file: MiMo's replaces the args, OpenCode's adds to them.
  for (const [flavor, replace] of [['mimo', true], ['opencode', false]]) {
    const config = new BridgeConfig({ flavor: FLAVORS[flavor], stateDir: path.join(tmp(), 'state'), env: { HOME: tmp(), PATH: process.env.PATH, SHELL: '/bin/sh', ...TOOLS } })
    config.write()
    assert.match(fs.readFileSync(path.join(config.configDir, 'plugin', 'code-desktop.js'), 'utf8'), new RegExp(`const REPLACE_ARGS = ${replace}\\n`), flavor)
  }
})

test('opencode: a finished code_desktop call is saved back without the session argument, once', async () => {
  const { bridge, thread } = liveThread(TOOLS)
  const patches = []
  const api = bridge.api
  bridge.api = async (method, route, options) => { if (method === 'PATCH') patches.push({ route, body: options.body }); return api(method, route, options) }
  const part = (tool, status, input) => ({ id: 'prt_1', sessionID: 'ses_root', messageID: 'msg_1', type: 'tool', callID: 'c1', tool, state: { status, input, output: 'ok', title: '', metadata: {}, time: { start: 1, end: 2 } } })
  thread.scrubSessionArg(part('code_desktop_preview_open', 'running', { url: 'u', [SESSION_ARG]: 'ses_root' }))
  thread.scrubSessionArg(part('github_create_issue', 'completed', { [SESSION_ARG]: 'x' }))
  thread.scrubSessionArg(part('code_desktop_preview_open', 'completed', { url: 'u' }))
  assert.equal(patches.length, 0)
  thread.scrubSessionArg(part('code_desktop_preview_open', 'completed', { url: 'u', [SESSION_ARG]: 'ses_root' }))
  thread.scrubSessionArg(part('code_desktop_preview_open', 'completed', { url: 'u', [SESSION_ARG]: 'ses_root' }))
  assert.deepEqual(patches.map((patch) => patch.route), ['/session/ses_root/message/msg_1/part/prt_1'])
  assert.deepEqual(patches[0].body.state, { status: 'completed', input: { url: 'u' }, output: 'ok', title: '', metadata: {}, time: { start: 1, end: 2 } })
})
