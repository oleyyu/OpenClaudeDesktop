// OpenClaude Desktop's own tools server ("code_desktop") on the ZCode bridge (packages/zcode-bridge/src/app-tools.js): the
// bridge (bin/app-server.mjs, a temp HOME) drives test-support/fake-zcode.mjs. session/create carries the stdio entry
// named by the app's start token, beside the servers of ZCode's own config (the list is the session's complete set);
// session/resume names the thread id; a fork is reopened so its server names the fork; throwaway sessions (the
// settings probe) get none; without the variables mcpServers stays as before. Its calls need no card.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { LineTransport } from '../packages/acp-bridge/src/transport.js'
import { appToolsServer, zcodeAppToolsServer, sessionToken, SESSION_CONFIG_KEY } from '../packages/zcode-bridge/src/app-tools.js'

const root = path.resolve(import.meta.dirname, '..')
const BIN = path.join(root, 'packages/zcode-bridge/bin/app-server.mjs')
const FAKE = path.join(root, 'packages/zcode-bridge/test-support/fake-zcode.mjs')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const TOOLS = {
  CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'], env: { ELECTRON_RUN_AS_NODE: '1' } }),
  CODE_DESKTOP_AGENT_TOOLS_SOCKET: '/tmp/cd-tools-x/s',
  CODE_DESKTOP_AGENT_TOOLS_TOKEN: 'tok',
}

function bridge(env = {}) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cdt-zc-')))
  const logFile = path.join(home, 'zcode.log')
  // ZCode's own config: one stdio server of the user's.
  fs.mkdirSync(path.join(home, '.zcode', 'cli'), { recursive: true })
  fs.writeFileSync(path.join(home, '.zcode', 'cli', 'config.json'), JSON.stringify({ mcp: { servers: { files: { command: 'files-mcp', args: ['--root', '/'], env: {} } } } }))
  const child = spawn(process.execPath, [BIN, 'app-server', '--stdio'], {
    cwd: home,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), CODE_DESKTOP_AGENT_BINARY: FAKE, CODE_DESKTOP_AGENT_RUNNER: 'node', CODE_DESKTOP_NODE_BINARY: process.execPath, CODE_DESKTOP_BRIDGE_STATE: path.join(home, 'state'), FAKE_ZCODE_LOG: logFile, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stderr = []
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)))
  const requests = []
  const client = new LineTransport(child.stdout, child.stdin, { onRequest: async (method, params) => { requests.push({ method, params }); return { decision: 'accept' } }, onNotification: () => {}, log: () => {} })
  client.start()
  const log = () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : [])
  return {
    home, requests, log, stderr,
    call: (method, params) => client.call(method, params, 30000),
    close: async () => { child.kill('SIGTERM'); await sleep(200) },
  }
}

const sessionOf = (mcpServers) => mcpServers?.find((server) => server.name === 'code_desktop')?.env.find((item) => item.name === 'CODE_DESKTOP_AGENT_SESSION')?.value ?? null

test('app-tools.js: the ZCode entry has its own process per session and a long tool timeout', () => {
  assert.deepEqual(zcodeAppToolsServer(appToolsServer(TOOLS), 'sess_1'), {
    name: 'code_desktop', command: '/Apps/OpenClaude Desktop', args: ['/Apps/agent-tools-server.mjs'],
    env: [{ name: 'ELECTRON_RUN_AS_NODE', value: '1' }, { name: 'CODE_DESKTOP_AGENT_TOOLS_SOCKET', value: '/tmp/cd-tools-x/s' }, { name: 'CODE_DESKTOP_AGENT_TOOLS_TOKEN', value: sessionToken('tok', 'sess_1') }, { name: 'CODE_DESKTOP_AGENT_SESSION', value: 'sess_1' }],
    isolation: 'session', timeoutMs: 600000,
  })
  assert.equal(zcodeAppToolsServer(appToolsServer(TOOLS), null), null)
  assert.equal(appToolsServer({ ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SOCKET: '' }), null)
})

test('ZCode: create names the start token beside the config servers, resume and fork name the thread; probes get none', { timeout: 60000 }, async () => {
  const token = 'start-00000000-0000-4000-8000-000000000003'
  const b = bridge(TOOLS)
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: token } })
    const creates = b.log().filter((entry) => entry.method === 'session/create')
    const own = creates.filter((entry) => entry.params.mcpServers)
    assert.equal(own.length, 1, 'only the thread’s own session/create carries mcpServers')
    assert.deepEqual(own[0].params.mcpServers.map((server) => server.name), ['files', 'code_desktop'])
    assert.equal(sessionOf(own[0].params.mcpServers), token)
    // The settings probe (a throwaway session) has none.
    assert.ok(creates.some((entry) => entry.params.titleGenerationEnabled === false && !entry.params.mcpServers))
    // Fork: ZCode opens the fork on its parent's runtime, so the bridge closes it and resumes it named for itself.
    const { thread: fork } = await b.call('thread/fork', { threadId: thread.id })
    const log = b.log()
    const closeAt = log.findIndex((entry) => entry.method === 'session/close' && entry.params.sessionId === fork.id)
    const resumeAt = log.findIndex((entry) => entry.method === 'session/resume' && entry.params.sessionId === fork.id)
    assert.ok(closeAt >= 0 && resumeAt > closeAt, 'the fork was closed, then resumed')
    assert.equal(sessionOf(log[resumeAt].params.mcpServers), fork.id)
    assert.deepEqual(log[resumeAt].params.mcpServers.map((server) => server.name), ['files', 'code_desktop'])
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})

test('ZCode: the tools server\'s instructions (preview auto-verify) reach GLM with the prompt; a session without the server gets none', { timeout: 60000 }, async () => {
  const instructions = 'Tools provided by OpenClaude Desktop. Verifying changes in the preview: …'
  assert.equal(appToolsServer({ ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ ...JSON.parse(TOOLS.CODE_DESKTOP_AGENT_TOOLS_SERVER), instructions }) }).instructions, instructions)
  assert.equal(appToolsServer(TOOLS).instructions, null)
  const b = bridge({ ...TOOLS, CODE_DESKTOP_AGENT_TOOLS_SERVER: JSON.stringify({ ...JSON.parse(TOOLS.CODE_DESKTOP_AGENT_TOOLS_SERVER), instructions }) })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-000000000009' } })
    await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'fix the header' }] })
    const sends = b.log().filter((entry) => entry.method === 'session/send')
    assert.ok(sends.length, 'the prompt was sent')
    assert.match(JSON.stringify(sends[0].params), /Verifying changes in the preview/)
    // With the server turned off for the thread (Settings › Tools), its instructions go too.
    const { thread: other } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-00000000000a' }, codeDesktop: { tools: { disabled: [], disabledServers: ['code_desktop'] } } })
    await b.call('turn/start', { threadId: other.id, input: [{ type: 'text', text: 'hello' }] })
    const last = b.log().filter((entry) => entry.method === 'session/send' && entry.params.sessionId === other.id).at(-1)
    assert.ok(last && !/Verifying changes in the preview/.test(JSON.stringify(last.params)))
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})

test('ZCode: a thread reopened in a new bridge resumes naming its id', { timeout: 60000 }, async () => {
  const b = bridge(TOOLS)
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await b.call('thread/resume', { threadId: 'sess_known_1' })
    const resumed = b.log().filter((entry) => entry.method === 'session/resume' && entry.params.sessionId === 'sess_known_1')
    assert.equal(resumed.length, 1)
    assert.equal(sessionOf(resumed[0].params.mcpServers), 'sess_known_1')
  } finally { await b.close() }
})

test('ZCode: without the launch variables, sessions keep ZCode’s own servers (no mcpServers sent)', { timeout: 60000 }, async () => {
  const b = bridge()
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-000000000004' } })
    const { thread: fork } = await b.call('thread/fork', { threadId: thread.id })
    for (const entry of b.log().filter((item) => item.method === 'session/create' || item.method === 'session/resume')) assert.equal(entry.params.mcpServers, undefined)
    // The fork stays open on the runtime ZCode gave it.
    assert.equal(b.log().some((entry) => entry.method === 'session/close' && entry.params.sessionId === fork.id), false)
  } finally { await b.close() }
})

test('ZCode: a code_desktop call needs no card; another server’s still goes to the client', { timeout: 60000 }, async () => {
  const b = bridge({ ...TOOLS, FAKE_ZCODE_ASK_TOOLS: 'mcp__code_desktop__ping,mcp__files__read' })
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    await b.call('thread/start', { cwd: b.home, approvalPolicy: 'untrusted', sandbox: 'workspace-write' })
    const end = Date.now() + 10000
    while (b.log().filter((entry) => entry.method === 'answer').length < 2 && Date.now() < end) await sleep(50)
    const answers = Object.fromEntries(b.log().filter((entry) => entry.method === 'answer').map((entry) => [entry.params.toolName, entry.params.result]))
    assert.equal(answers.mcp__code_desktop__ping?.decision, 'allow')
    assert.equal(answers.mcp__files__read?.decision, 'allow')
    // Only the other server's call reached the client as an approval card.
    assert.equal(b.requests.length, 1)
    assert.match(JSON.stringify(b.requests[0].params), /files/)
  } finally { await b.close() }
})

test('ZCode: no browser here, so node_repl\'s js is withheld and GLM is pointed at the preview tools (Bash without them)', { timeout: 60000 }, async () => {
  const { NODE_REPL_TOOL, NO_BROWSER_NOTE, PREVIEW_INSTEAD, NO_PREVIEW_INSTEAD } = await import('../packages/zcode-bridge/src/server.js')
  const config = path.join('.zcode', 'cli', 'config.json')
  const setPlugins = (home, enabledPlugins) => fs.writeFileSync(path.join(home, config), JSON.stringify({ plugins: { enabledPlugins } }))
  const b = bridge(TOOLS)
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const { thread } = await b.call('thread/start', { cwd: b.home, config: { [SESSION_CONFIG_KEY]: 'start-00000000-0000-4000-8000-00000000000b' } })
    const created = b.log().find((entry) => entry.method === 'session/create' && entry.params.toolDenylist)
    assert.ok(created.params.toolDenylist.includes(NODE_REPL_TOOL), 'Browser Use on by default: no browser backend, no js tool')
    await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'check the page' }] })
    let send = b.log().findLast((entry) => entry.method === 'session/send')
    assert.ok(send.params.toolDenylist.includes(NODE_REPL_TOOL))
    assert.ok(send.params.content.includes(`${NO_BROWSER_NOTE} ${PREVIEW_INSTEAD}`), 'the preview tools instead')
    // Without the preview tools (the tools server off for the thread): Bash, and say so.
    const { thread: bare } = await b.call('thread/start', { cwd: b.home, codeDesktop: { tools: { disabled: [], disabledServers: ['code_desktop'] } } })
    await b.call('turn/start', { threadId: bare.id, input: [{ type: 'text', text: 'check the page' }] })
    send = b.log().findLast((entry) => entry.method === 'session/send')
    assert.ok(send.params.content.includes(`${NO_BROWSER_NOTE} ${NO_PREVIEW_INSTEAD}`))
    // Computer Use on (it shares node_repl): the tool stays. Browser Use off: no note.
    setPlugins(b.home, { 'computer-use@zcode-plugins-official': true, 'browser-use@zcode-plugins-official': false })
    const { thread: cua } = await b.call('thread/start', { cwd: b.home })
    assert.ok(!b.log().findLast((entry) => entry.method === 'session/create' && entry.params.toolDenylist).params.toolDenylist.includes(NODE_REPL_TOOL))
    await b.call('turn/start', { threadId: cua.id, input: [{ type: 'text', text: 'hello' }] })
    send = b.log().findLast((entry) => entry.method === 'session/send')
    assert.ok(!send.params.content.includes(NO_BROWSER_NOTE))
    assert.ok(!send.params.toolDenylist.includes(NODE_REPL_TOOL))
  } catch (error) {
    error.message += `\n${b.stderr.join('').slice(-3000)}`
    throw error
  } finally { await b.close() }
})

test('ZCode: an attached PDF, video or image goes as its own kind with its MIME type; other files stay files', { timeout: 60000 }, async () => {
  const { fileAttachment } = await import('../packages/zcode-bridge/src/server.js')
  assert.deepEqual(fileAttachment('/w/spec.PDF'), { kind: 'pdf', localPath: '/w/spec.PDF', filename: 'spec.PDF', mimeType: 'application/pdf' })
  assert.deepEqual(fileAttachment('/w/demo.mov', 'Demo'), { kind: 'video', localPath: '/w/demo.mov', filename: 'Demo', mimeType: 'video/quicktime' })
  assert.deepEqual(fileAttachment('/w/shot.webp'), { kind: 'image', localPath: '/w/shot.webp', filename: 'shot.webp', mimeType: 'image/webp' })
  assert.deepEqual(fileAttachment('/w/notes.md'), { kind: 'file', localPath: '/w/notes.md', filename: 'notes.md', mimeType: 'text/markdown' })
  assert.deepEqual(fileAttachment('/w/blob.bin'), { kind: 'file', localPath: '/w/blob.bin', filename: 'blob.bin' })
  const b = bridge()
  try {
    await b.call('initialize', { clientInfo: { name: 'test', version: '0' } })
    const pdf = path.join(b.home, 'spec.pdf')
    fs.writeFileSync(pdf, '%PDF-1.4\n')
    const { thread } = await b.call('thread/start', { cwd: b.home })
    await b.call('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'summarize', text_elements: [] }, { type: 'mention', name: 'spec.pdf', path: pdf }] })
    const send = b.log().findLast((entry) => entry.method === 'session/send')
    assert.deepEqual(send.params.attachments, [{ kind: 'pdf', localPath: pdf, filename: 'spec.pdf', mimeType: 'application/pdf' }])
  } finally { await b.close() }
})
