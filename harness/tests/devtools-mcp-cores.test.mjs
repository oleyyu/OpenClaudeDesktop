// The chrome-devtools MCP server (app/electron/devtools-mcp/: Google's chrome-devtools-mcp on the app's preview tabs) next
// to OpenClaude Desktop's own code_desktop server on every core that gets that one. The app hands the definition over in
// CODE_DESKTOP_DEVTOOLS_MCP_SERVER ({name, command, args, env}); here a tiny stdio MCP server stands in for it (it records
// what it is asked), so no browser is involved. Codex gets `-c mcp_servers.chrome_devtools.*` (app/tests covers that).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { serve } from '../packages/acp-bridge/src/server.js'
import { adapterById } from '../packages/acp-bridge/src/agents/index.js'
import { SESSION_CONFIG_KEY } from '../packages/acp-bridge/src/app-tools.js'
import { devtoolsServer as acpDevtools, acpDevtoolsServer } from '../packages/acp-bridge/src/app-tools.js'
import { devtoolsServer as deepseekDevtools, sessionToken } from '../packages/codex-app-server/src/app-tools.js'
import { zcodeDevtoolsServer } from '../packages/zcode-bridge/src/app-tools.js'
import { devtoolsServer as opencodeDevtools, opencodeDevtoolsEntry, DEVTOOLS_WS_ENV } from '../packages/opencode-bridge/src/app-tools.js'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { BridgeConfig } from '../packages/opencode-bridge/src/config.js'
import { BridgeConfigV2 } from '../packages/opencode-bridge/src/v2/config.js'

const root = path.resolve(import.meta.dirname, '..')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const made = []
const tmp = (prefix = 'cdt-devtools-') => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const WS = `ws://127.0.0.1:61234/devtools/browser/${'ab'.repeat(32)}`
const definition = (command = '/Apps/OpenClaude Desktop', script = '/Apps/harness/node_modules/chrome-devtools-mcp/out/Default/gen/src/bin/chrome-devtools-mcp.js') => ({
  name: 'chrome-devtools', command, args: [script, '--wsEndpoint', WS, '--no-usage-statistics', '--no-performance-crux'],
  env: { ELECTRON_RUN_AS_NODE: '1', CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: '1', CHROME_DEVTOOLS_MCP_NO_CONFIG_DISCOVERY: '1', CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS: '1' },
})
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-x/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok',
}
const DEVTOOLS = { CODE_DESKTOP_DEVTOOLS_MCP_SERVER: JSON.stringify(definition()) }

test('every core parses the same definition; a broken one gives nothing', () => {
  for (const parse of [acpDevtools, deepseekDevtools]) {
    assert.deepEqual(parse(DEVTOOLS), definition())
    assert.equal(parse({}), null)
    assert.equal(parse({ CODE_DESKTOP_DEVTOOLS_MCP_SERVER: '{' }), null)
    assert.equal(parse({ CODE_DESKTOP_DEVTOOLS_MCP_SERVER: JSON.stringify({ command: 'x', args: [1] }) }), null)
  }
  const acp = acpDevtoolsServer(acpDevtools(DEVTOOLS))
  assert.deepEqual(acp.env, Object.entries(definition().env).map(([name, value]) => ({ name, value })))
  // Gemini drops ELECTRON_RUN_AS_NODE from a server's env: it rides in the command then.
  const gemini = acpDevtoolsServer(acpDevtools(DEVTOOLS), { runAsNodeInCommand: true })
  assert.equal(gemini.command, '/usr/bin/env')
  assert.deepEqual(gemini.args.slice(0, 2), ['ELECTRON_RUN_AS_NODE=1', '/Apps/OpenClaude Desktop'])
  const zcode = zcodeDevtoolsServer(DEVTOOLS)
  assert.equal(zcode.isolation, 'session')
  assert.equal(zcode.timeoutMs, 600000)
  assert.deepEqual(zcode.args, definition().args)
  // OpenCode: the endpoint (its token) leaves the config file for an {env:} reference.
  const opencode = opencodeDevtools(DEVTOOLS)
  assert.equal(opencode.wsEndpoint, WS)
  assert.deepEqual(opencodeDevtoolsEntry(opencode).command, ['/Apps/OpenClaude Desktop', definition().args[0], '--wsEndpoint', `{env:${DEVTOOLS_WS_ENV}}`, '--no-usage-statistics', '--no-performance-crux'])
  assert.equal(opencodeDevtools({ CODE_DESKTOP_DEVTOOLS_MCP_SERVER: JSON.stringify({ ...definition(), args: ['x', '--wsEndpoint', 'ws://evil.example/'] }) }), null)
})

function acpBridge(env) {
  const home = tmp('cdt-devtools-acp-')
  const kimiHome = path.join(home, '.kimi-code')
  fs.mkdirSync(kimiHome, { recursive: true })
  const logFile = path.join(home, 'agent.log')
  const toServer = new PassThrough(), toClient = new PassThrough()
  const server = serve({
    input: toServer, output: toClient, adapter: adapterById('kimi'), log: () => {},
    env: {
      PATH: process.env.PATH, HOME: home, KIMI_CODE_HOME: kimiHome, CODE_DESKTOP_AGENT_BINARY: path.join(root, 'packages/acp-bridge/testing/fake-acp-agent.mjs'), CODE_DESKTOP_AGENT_RUNNER: 'node',
      CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_AGENT_VERSION: '1.0.0', CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), CODE_DESKTOP_ACP_NO_SANDBOX: '1',
      FAKE_ACP_LOG: logFile, FAKE_ACP_WIRE: path.join(kimiHome, 'sessions', 'wd_test'), ...env,
    },
  })
  const client = new LineTransport(toClient, toServer, { onRequest: async () => ({ decision: 'accept' }), onNotification: () => {}, log: () => {} })
  client.start()
  const sessions = (method) => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []).filter((entry) => entry.method === method)
  return { home, call: (method, params) => client.call(method, params, 30000), sessions, close: () => server.shutdown() }
}

test('ACP (Kimi): a session that gets code_desktop gets chrome-devtools beside it; without code_desktop, neither', async () => {
  const b = acpBridge({ ...TOOLS, ...DEVTOOLS })
  try {
    await b.call('initialize', {})
    await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-0000000000d1' } })
    const servers = b.sessions('session/new')[0].params.mcpServers
    assert.deepEqual(servers.map((server) => server.name), ['code_desktop', 'chrome-devtools'])
    assert.deepEqual(servers[1].args, definition().args)
    assert.deepEqual(Object.fromEntries(servers[1].env.map((item) => [item.name, item.value])), definition().env)
    // A thread start without the app's identity (no code_desktop): no chrome-devtools either.
    await b.call('thread/start', { cwd: b.home })
    assert.deepEqual(b.sessions('session/new')[1].params.mcpServers, [])
  } finally { b.close() }
  const plain = acpBridge({ ...DEVTOOLS })
  try {
    await plain.call('initialize', {})
    await plain.call('thread/start', { cwd: plain.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-0000000000d2' } })
    assert.deepEqual(plain.sessions('session/new')[0].params.mcpServers, [])
  } finally { plain.close() }
})

test('ZCode: session/create carries chrome-devtools after the config servers and code_desktop', { timeout: 60000 }, async () => {
  const home = tmp('cdt-devtools-zc-')
  const logFile = path.join(home, 'zcode.log')
  fs.mkdirSync(path.join(home, '.zcode', 'cli'), { recursive: true })
  fs.writeFileSync(path.join(home, '.zcode', 'cli', 'config.json'), JSON.stringify({ mcp: { servers: { files: { command: 'files-mcp', args: ['--root', '/'], env: {} } } } }))
  const child = spawn(process.execPath, [path.join(root, 'packages/zcode-bridge/bin/app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home, stdio: ['pipe', 'pipe', 'pipe'],
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), CODE_DESKTOP_AGENT_BINARY: path.join(root, 'packages/zcode-bridge/test-support/fake-zcode.mjs'), CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), FAKE_ZCODE_LOG: logFile, ...TOOLS, ...DEVTOOLS },
  })
  const client = new LineTransport(child.stdout, child.stdin, { onRequest: async () => ({ decision: 'accept' }), onNotification: () => {}, log: () => {} })
  client.start()
  try {
    await client.call('initialize', { clientInfo: { name: 'test', version: '0' } }, 30000)
    await client.call('thread/start', { cwd: home, config: { 'mcp_servers.code_desktop.env.CODE_DESKTOP_AGENT_SESSION': 'start-00000000-0000-4000-8000-0000000000d3' } }, 30000)
    const creates = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line)).filter((entry) => entry.method === 'session/create' && entry.params.mcpServers)
    assert.deepEqual(creates[0].params.mcpServers.map((server) => server.name), ['files', 'code_desktop', 'chrome-devtools'])
    assert.equal(creates[0].params.mcpServers[2].isolation, 'session')
  } finally { child.kill('SIGTERM'); await sleep(200) }
})

test('OpenCode / MiMo (1.x) and OpenCode 2.x: the config layer registers chrome-devtools; its token only in the agent server\'s environment', () => {
  for (const flavor of ['opencode', 'mimo']) {
    const home = tmp('cdt-devtools-oc-')
    const config = new BridgeConfig({ flavor: FLAVORS[flavor], stateDir: path.join(home, 'state'), env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh', ...TOOLS, ...DEVTOOLS } })
    const env = config.write()
    const written = fs.readFileSync(config.configPath, 'utf8')
    assert.doesNotMatch(written, /abababab/, `${flavor}: the token never reaches the config file`)
    const entry = JSON.parse(written).mcp['chrome-devtools']
    assert.deepEqual(entry, opencodeDevtoolsEntry(opencodeDevtools(DEVTOOLS)))
    assert.equal(env[DEVTOOLS_WS_ENV], WS)
    const without = new BridgeConfig({ flavor: FLAVORS[flavor], stateDir: path.join(home, 'state2'), env: { HOME: home, PATH: process.env.PATH, SHELL: '/bin/sh', ...DEVTOOLS } })
    without.write()
    assert.equal(JSON.parse(fs.readFileSync(without.configPath, 'utf8')).mcp?.['chrome-devtools'], undefined, 'no code_desktop, no chrome-devtools')
  }
  const home = tmp('cdt-devtools-oc2-')
  const v2 = new BridgeConfigV2({ flavor: withApi(FLAVORS.opencode, 'v2'), stateDir: path.join(home, 'state'), env: { HOME: home, XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin', ...TOOLS, ...DEVTOOLS } })
  const env = v2.write()
  const written = fs.readFileSync(env.OPENCODE_CONFIG, 'utf8')
  assert.doesNotMatch(written, /abababab/)
  const entry = JSON.parse(written).mcp.servers['chrome-devtools']
  assert.equal(entry.type, 'local')
  assert.ok(entry.command.includes(`{env:${DEVTOOLS_WS_ENV}}`))
  assert.equal(env[DEVTOOLS_WS_ENV], WS)
})

// ---------------------------------------------------------------- the DeepSeek core, for real
const FAKE_MCP = `
const fs = require('node:fs'); const readline = require('node:readline');
const log = (entry) => fs.appendFileSync(process.env.FAKE_DEVTOOLS_LOG, JSON.stringify(entry) + '\\n');
log({ started: true, argv: process.argv.slice(2), env: { ELECTRON_RUN_AS_NODE: process.env.ELECTRON_RUN_AS_NODE ?? null, NO_UPDATE: process.env.CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS ?? null } });
const write = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line); log({ method: message.method, params: message.params });
  if (message.method === 'initialize') write({ jsonrpc: '2.0', id: message.id, result: { protocolVersion: message.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'chrome_devtools', version: '1.13.0' } } });
  else if (message.method === 'tools/list') write({ jsonrpc: '2.0', id: message.id, result: { tools: [{ name: 'list_pages', description: 'Lists pages.', inputSchema: { type: 'object', properties: {} } }] } });
  else if (message.method === 'tools/call') write({ jsonrpc: '2.0', id: message.id, result: { content: [{ type: 'text', text: '## Pages\\n1: Fixture (http://127.0.0.1:3000/) [selected]' }] } });
  else if (message.id !== undefined) write({ jsonrpc: '2.0', id: message.id, result: {} });
});
`

test('DeepSeek core: a thread runs chrome-devtools beside code_desktop; the model sees mcp__chrome-devtools__list_pages and its call reaches the server', { timeout: 180000 }, async () => {
  const home = tmp('cdt-devtools-ds-')
  const workspace = path.join(home, 'w')
  fs.mkdirSync(workspace)
  const fakeServer = path.join(home, 'fake-devtools.cjs')
  fs.writeFileSync(fakeServer, FAKE_MCP)
  const devtoolsLog = path.join(home, 'devtools.log')
  // The app's channel, enough for code_desktop to come up (hello / welcome / an empty list).
  const token = 'secret-token'
  const socketPath = path.join(home, 's')
  const channel = net.createServer((socket) => {
    let buffer = '', hello = false
    socket.setEncoding('utf8')
    socket.on('data', (chunk) => {
      buffer += chunk
      let newline
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const message = JSON.parse(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1)
        if (!hello) { if (message.token !== sessionToken(token, message.session)) { socket.destroy(); return } hello = true; socket.write(JSON.stringify({ type: 'welcome' }) + '\n'); continue }
        if (message.method === 'list') socket.write(JSON.stringify({ id: message.id, result: { tools: [] } }) + '\n')
      }
    })
    socket.on('error', () => {})
  })
  await new Promise((resolve) => channel.listen(socketPath, resolve))
  // A scripted Anthropic Messages model: calls mcp__chrome-devtools__list_pages once, then answers.
  const requests = []
  const model = http.createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    if (req.method !== 'POST' || !req.url.endsWith('/v1/messages')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"type":"error","error":{"type":"not_found_error","message":"x"}}'); return }
    const body = JSON.parse(raw)
    requests.push(body)
    const last = body.messages.at(-1)
    const answered = Array.isArray(last?.content) && last.content.some((block) => block.type === 'tool_result')
    const wants = !answered && (body.tools ?? []).some((tool) => tool.name === 'mcp__chrome-devtools__list_pages') && JSON.stringify(last?.content ?? '').includes('LIST_PAGES')
    const block = wants ? { type: 'tool_use', id: `toolu_${requests.length}`, name: 'mcp__chrome-devtools__list_pages', input: {} } : { type: 'text', text: answered ? 'listed' : 'hello' }
    const usage = { input_tokens: 10, output_tokens: 5 }
    const events = [['message_start', { type: 'message_start', message: { id: `msg_${requests.length}`, type: 'message', role: 'assistant', model: body.model, content: [], stop_reason: null, stop_sequence: null, usage } }],
      ['content_block_start', { type: 'content_block_start', index: 0, content_block: block.type === 'tool_use' ? { ...block, input: {} } : { type: 'text', text: '' } }],
      ['content_block_delta', { type: 'content_block_delta', index: 0, delta: block.type === 'tool_use' ? { type: 'input_json_delta', partial_json: '{}' } : { type: 'text_delta', text: block.text } }],
      ['content_block_stop', { type: 'content_block_stop', index: 0 }],
      ['message_delta', { type: 'message_delta', delta: { stop_reason: block.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 5 } }],
      ['message_stop', { type: 'message_stop' }]]
    if (body.stream === false) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: body.model, content: [block], stop_reason: block.type === 'tool_use' ? 'tool_use' : 'end_turn', stop_sequence: null, usage })); return }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
    for (const [event, data] of events) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    res.end()
  })
  await new Promise((resolve) => model.listen(0, '127.0.0.1', resolve))
  const stderr = []
  const child = spawn(process.execPath, [path.join(root, 'bin/codex-app-server.mjs'), 'app-server', '--stdio'], {
    cwd: home, stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), DSH_HOME: path.join(home, 'dsh'), CODE_DESKTOP_CORE_STATE: path.join(home, 'state'),
      XDG_CONFIG_HOME: path.join(home, '.config'), XDG_DATA_HOME: path.join(home, '.local/share'), XDG_STATE_HOME: path.join(home, '.local/state'), XDG_CACHE_HOME: path.join(home, '.cache'),
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${model.address().port}`, DEEPSEEK_API_KEY: 'sk-fake-devtools', FAKE_DEVTOOLS_LOG: devtoolsLog,
      CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: process.execPath, args: [path.resolve(root, '../app/electron/agent-tools-server.mjs')], env: {} }),
      CODE_DESKTOP_AGENT_TOOLS_SOCKET: socketPath, CODE_DESKTOP_AGENT_TOOLS_TOKEN: token,
      CODE_DESKTOP_DEVTOOLS_MCP_SERVER: JSON.stringify({ ...definition(process.execPath, fakeServer), env: { ...definition().env, ELECTRON_RUN_AS_NODE: '1' } }),
    },
  })
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const notes = []
  const client = new LineTransport(child.stdout, child.stdin, { onRequest: async () => ({ decision: 'accept' }), onNotification: (method, params) => notes.push({ method, params }), log: () => {} })
  client.start()
  const until = async (check, label, ms = 60000) => { const end = Date.now() + ms; for (;;) { const value = check(); if (value) return value; if (Date.now() > end) throw new Error(`timed out waiting for ${label}`); await sleep(50) } }
  const devtoolsEntries = () => (fs.existsSync(devtoolsLog) ? fs.readFileSync(devtoolsLog, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  try {
    await client.call('initialize', { clientInfo: { name: 'code_desktop_test', title: 'test', version: '0.0.0' }, capabilities: { experimentalApi: true } }, 120000)
    client.notify('initialized', {})
    const models = await client.call('model/list', {}, 60000)
    const modelId = models.data.find((entry) => entry.isDefault)?.id ?? models.data[0]?.id
    const { thread } = await client.call('thread/start', { cwd: workspace, model: modelId, approvalPolicy: 'never', sandbox: 'workspace-write' }, 60000)
    await until(() => devtoolsEntries().some((entry) => entry.method === 'tools/list'), 'the chrome-devtools tool list')
    const started = devtoolsEntries().find((entry) => entry.started)
    assert.deepEqual(started.argv, ['--wsEndpoint', WS, '--no-usage-statistics', '--no-performance-crux'])
    assert.deepEqual(started.env, { ELECTRON_RUN_AS_NODE: '1', NO_UPDATE: '1' })
    const { turn } = await client.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'LIST_PAGES', text_elements: [] }] }, 60000)
    await until(() => notes.some((note) => note.method === 'turn/completed' && note.params.turn.id === turn.id), 'turn/completed', 90000)
    assert.ok(requests.some((body) => (body.tools ?? []).some((tool) => tool.name === 'mcp__chrome-devtools__list_pages')), 'the model saw the chrome-devtools tool')
    assert.ok(devtoolsEntries().some((entry) => entry.method === 'tools/call' && entry.params?.name === 'list_pages'), 'the call reached the server')
    const item = notes.find((note) => note.method === 'item/completed' && note.params.item?.type === 'mcpToolCall')?.params.item
    assert.equal(item?.server, 'chrome-devtools')
    assert.equal(item?.tool, 'list_pages')
  } catch (error) {
    error.message += `\n--- core stderr ---\n${stderr.join('').slice(-3000)}`
    throw error
  } finally {
    client.close?.()
    child.kill('SIGTERM')
    await sleep(300)
    channel.close()
    model.close()
  }
})
