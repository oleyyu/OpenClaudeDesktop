// OpenCode / MiMo bridge: archive sync, plugin failures, command variants, MiMo exec scripts and working windows.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Projector, execSubParts, isExecScript, toolItem, turnDiff } from '../packages/opencode-bridge/src/projection.js'
import { ModelCatalog, parseQuantity, wildcardValue, workingWindow } from '../packages/opencode-bridge/src/models.js'
import { Bridge, LiveThread, pluginFailure, sessionArchived } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-sync-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

function bridgeFor(flavor = 'opencode', api = async () => { throw new Error('no server') }) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const calls = []
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route, ...options }); return api(method, route, options) }
  return { bridge, notes, calls, home }
}

// ------------------------------------------------------------------ archive

test('archived: a flag set here, or OpenCode\'s time.archived after the last restore here', () => {
  assert.equal(sessionArchived({ time: {} }, {}), false)
  assert.equal(sessionArchived({ time: {} }, { archived: true }), true)
  assert.equal(sessionArchived({ time: { archived: 100 } }, {}), true)
  assert.equal(sessionArchived({ time: { archived: 100 } }, { unarchivedAt: 150 }), false, 'restored here after OpenCode archived it')
  assert.equal(sessionArchived({ time: { archived: 200 } }, { unarchivedAt: 150 }), true, 'archived in OpenCode again later')
})

test('thread/list asks OpenCode for archived sessions too and files them under Archived; archive and restore reach OpenCode', async () => {
  const sessions = [
    { id: 'ses_a', title: 'Archived in OpenCode', directory: '/w', time: { created: 1, updated: 2, archived: 3 } },
    { id: 'ses_b', title: 'Active', directory: '/w', time: { created: 1, updated: 2 } },
  ]
  const { bridge, notes, calls } = bridgeFor('opencode', async (method, route) => {
    if (method === 'GET' && route === '/experimental/session') return sessions
    if (method === 'GET' && route.startsWith('/session/')) return sessions.find((info) => route.endsWith(info.id)) ?? null
    if (method === 'GET' && route.endsWith('/message')) return []
    return {}
  })
  const names = (result) => result.data.map((thread) => thread.name)
  assert.deepEqual(names(await bridge.listThreads({})), ['Active'])
  assert.equal(calls[0].query.archived, 'true')
  assert.deepEqual(names(await bridge.listThreads({ archived: true })), ['Archived in OpenCode'])

  await bridge.handle('thread/archive', { threadId: 'ses_b' })
  const patch = calls.find((call) => call.method === 'PATCH' && call.route === '/session/ses_b')
  assert.ok(Number.isFinite(patch?.body?.time?.archived), 'OpenCode records the archive')
  assert.equal(bridge.store.get('ses_b').archived, true, 'kept here as the fallback')
  assert.deepEqual(names(await bridge.listThreads({ archived: true })).sort(), ['Active', 'Archived in OpenCode'])

  await bridge.handle('thread/unarchive', { threadId: 'ses_a' })
  assert.ok(bridge.store.get('ses_a').unarchivedAt >= 3)
  assert.deepEqual(names(await bridge.listThreads({})), ['Archived in OpenCode'])
  assert.deepEqual(notes.map((note) => note.method), ['thread/archived', 'thread/unarchived'])
})

test('a session archived in OpenCode\'s own app while listed moves to Archived once', () => {
  const { bridge, notes } = bridgeFor()
  bridge.store.update('ses_x', { cwd: '/w' })
  const info = { id: 'ses_x', directory: '/w', time: { created: 1, updated: 5, archived: 5 } }
  bridge.onEvent({ type: 'session.updated', properties: { sessionID: 'ses_x', info } })
  bridge.onEvent({ type: 'session.updated', properties: { sessionID: 'ses_x', info } })
  assert.deepEqual(notes, [{ method: 'thread/archived', params: { threadId: 'ses_x' } }])
  // Archived here: OpenCode's echo of the archive says nothing new.
  bridge.store.update('ses_y', { cwd: '/w', archived: true })
  bridge.onEvent({ type: 'session.updated', properties: { info: { id: 'ses_y', time: { archived: 9 } } } })
  // Unknown sessions (never listed here) are left alone.
  bridge.onEvent({ type: 'session.updated', properties: { info: { id: 'ses_z', time: { archived: 9 } } } })
  assert.equal(notes.length, 1)
})

// ------------------------------------------------------------------ plugin failures

test('plugin failures OpenCode reports without a session become the plugin\'s loadError and a notice', async () => {
  assert.deepEqual(pluginFailure('Failed to load plugin file:///p/bad.js: plugin boom'), { target: 'file:///p/bad.js', message: 'Failed to load plugin file:///p/bad.js: plugin boom' })
  assert.equal(pluginFailure('Failed to install plugin left-pad@latest: 404').target, 'left-pad@latest')
  assert.equal(pluginFailure('Plugin @scope/x@1.0.0 skipped: needs opencode >= 2').target, '@scope/x@1.0.0')
  assert.equal(pluginFailure('Something else'), null)

  const { bridge, notes } = bridgeFor('opencode', async (method, route) => (route === '/config' ? { plugin: ['left-pad', 'file:///p/bad.js', 'fine-plugin'] } : {}))
  const error = (message) => bridge.onEvent({ type: 'session.error', properties: { error: { name: 'UnknownError', data: { message } } } })
  error('Failed to load plugin file:///p/bad.js: plugin boom')
  error('Failed to load plugin file:///p/bad.js: plugin boom')
  error('Failed to install plugin left-pad@latest: registry unreachable')
  error('Failed to parse skill /w/.opencode/skills/broken/SKILL.md')
  const rows = (await bridge.pluginsInstalled()).marketplaces[0].plugins
  const loadError = Object.fromEntries(rows.map((row) => [row.id, row.codeDesktop.loadError]))
  assert.equal(loadError['file:///p/bad.js'], 'Failed to load plugin file:///p/bad.js: plugin boom')
  assert.equal(loadError['left-pad'], 'Failed to install plugin left-pad@latest: registry unreachable')
  assert.equal(loadError['fine-plugin'], null)
  assert.equal(notes.filter((note) => note.method === 'codeDesktop/plugin/changed').length, 2)
  assert.deepEqual(notes.filter((note) => note.method === 'configWarning').map((note) => note.params.summary), [
    'Failed to load plugin file:///p/bad.js: plugin boom',
    'Failed to install plugin left-pad@latest: registry unreachable',
    'Failed to parse skill /w/.opencode/skills/broken/SKILL.md',
  ])
  // Plugin toasts: warnings and errors are notices, info is not.
  bridge.onEvent({ type: 'tui.toast.show', properties: { title: 'Linter', message: 'eslint missing', variant: 'warning' } })
  bridge.onEvent({ type: 'tui.toast.show', properties: { message: 'Indexed', variant: 'info' } })
  assert.deepEqual(notes.filter((note) => note.method === 'warning').map((note) => note.params), [{ threadId: null, message: 'Linter: eslint missing' }])
  // A config reload reports afresh.
  bridge.configReloaded()
  assert.equal((await bridge.pluginsInstalled()).marketplaces[0].plugins.find((row) => row.id === 'file:///p/bad.js').codeDesktop.loadError, null)
})

test('a plugin that fails to load is reported as a failed install and not kept', async () => {
  const { bridge } = bridgeFor('opencode', async (method, route) => {
    if (method === 'GET' && route === '/config') {
      setTimeout(() => bridge.onEvent({ type: 'session.error', properties: { error: { data: { message: `Failed to load plugin ${spec}: boom` } } } }), 20)
      return {}
    }
    return {}
  })
  const spec = 'file:///p/bad.js'
  bridge.reloadConfig = async () => true
  const result = await bridge.pluginOp('codeDesktop/plugin/install', { spec })
  assert.equal(result.application, 'failed')
  assert.equal(result.error.diagnostic, `Failed to load plugin ${spec}: boom`)
  assert.deepEqual(bridge.pluginSettings().installed, [])
})

// ------------------------------------------------------------------ variants on commands

test('slash commands and /review send the selected effort as the OpenCode variant', async () => {
  const { bridge } = bridgeFor()
  const entry = { id: 'p/m', provider: { id: 'p' }, model: { id: 'm', variants: { high: {}, max: {} } } }
  bridge.catalog.cached = { entries: [entry] }
  bridge.catalog.load = async () => bridge.catalog.cached
  const thread = new LiveThread(bridge, { info: { id: 'ses_v', directory: '/w' } })
  thread.applyParams = async () => {}
  thread.applyRules = async () => {}
  thread.model = 'p/m'
  thread.effort = 'high'
  const bodies = []
  thread.post = async (kind, input, route, body) => { bodies.push({ kind, body }); throw new Error('stop') }
  await assert.rejects(thread.startTurn({ input: [{ type: 'text', text: '/init now', text_elements: [] }, { type: 'skill', name: 'init', path: 'command:init' }] }), /stop/)
  await assert.rejects(thread.review({ target: { type: 'uncommittedChanges' } }), /stop/)
  assert.deepEqual(bodies.map(({ kind, body }) => [kind, body.command, body.variant]), [['command', 'init', 'high'], ['review', 'review', 'high']])
  thread.effort = 'default'
  await assert.rejects(thread.review({}), /stop/)
  assert.equal('variant' in bodies.at(-1).body, false, 'the provider default sends no variant')
})

// ------------------------------------------------------------------ MiMo exec scripts

const execPart = (status, subs, extra = {}) => ({
  id: 'prt_exec', type: 'tool', tool: 'exec', callID: 'call_1', sessionID: 'ses_m', messageID: 'msg_a',
  state: { status, input: { code: 'await tools.apply_patch({...})' }, title: status === 'running' ? undefined : `${subs.length} tool calls`, output: status === 'completed' ? '<exec status="completed">…</exec>' : undefined, metadata: { exec_schema: 1, status: status === 'running' ? undefined : 'completed', sub_parts: subs, ...extra }, time: { start: 1, ...(status === 'running' ? {} : { end: 5 }) } },
})
const patchSub = { seq: 1, type: 'tool', callID: 'call_1:1', tool: 'apply_patch', state: { status: 'completed', input: { patch_text: '*** Begin Patch' }, metadata: { files: [{ filePath: '/w/a.txt', type: 'add', patch: '--- /dev/null\n+++ /w/a.txt\n@@ -0,0 +1 @@\n+hi\n' }] }, output: 'ok', time: { start: 2, end: 3 } } }
const bashSub = { seq: 2, type: 'tool', callID: 'call_1:2', tool: 'exec_command', state: { status: 'running', input: { cmd: 'echo nested' }, metadata: { output: 'nes' }, time: { start: 3 } } }

test('MiMo exec: the script is one row and every tool it called is an item of its own', () => {
  const part = execPart('running', [patchSub, bashSub])
  assert.equal(isExecScript(part), true)
  assert.equal(isExecScript({ type: 'tool', tool: 'exec', state: { input: { command: 'ls' } } }), false, 'another agent\'s shell tool named exec stays a command')
  const nested = execSubParts(part)
  assert.deepEqual(nested.map((sub) => [sub.id, sub.tool, sub.callID]), [['prt_exec:1', 'apply_patch', 'call_1:1'], ['prt_exec:2', 'bash', 'call_1:2']])
  const script = toolItem(part, { threadId: 'ses_m', cwd: '/w' })
  assert.deepEqual([script.type, script.tool, script.status, script.arguments.code.startsWith('await')], ['dynamicToolCall', 'exec', 'inProgress', true])

  const projector = new Projector({ threadId: 'ses_m', cwd: '/w' })
  projector.load([
    { info: { id: 'msg_u', role: 'user', time: { created: 1 } }, parts: [{ id: 'p0', type: 'text', text: 'go' }] },
    { info: { id: 'msg_a', role: 'assistant', parentID: 'msg_u', time: { created: 2, completed: 6 } }, parts: [execPart('completed', [patchSub, { ...bashSub, state: { ...bashSub.state, status: 'completed', metadata: { output: 'nested\n', exit: 0 }, time: { start: 3, end: 4 } } }])] },
  ])
  const [turn] = projector.turns()
  assert.deepEqual(turn.items.map((item) => `${item.type}:${item.id}:${item.status ?? ''}`), ['userMessage:msg_u-user:', 'dynamicToolCall:prt_exec:completed', 'fileChange:prt_exec:1:completed', 'commandExecution:prt_exec:2:completed'])
  assert.equal(turn.items[3].command, 'echo nested')
  assert.match(turnDiff(turn), /\+hi/)
  // A script that hit a code error fails its row.
  const failed = toolItem(execPart('completed', [], { status: 'code_error' }), { threadId: 'ses_m', cwd: '/w' })
  assert.equal(failed.status, 'failed')
  assert.equal(failed.success, false)
})

test('MiMo exec live: nested calls start and complete on their own, the turn diff follows the nested edit, approvals find the nested call', async () => {
  const { bridge } = bridgeFor('mimo')
  const thread = new LiveThread(bridge, { info: { id: 'ses_m', directory: '/w' } })
  const events = []
  thread.emit = (method, params) => events.push({ method, params })
  thread.projector.load([{ info: { id: 'msg_u', role: 'user', time: { created: 1 } }, parts: [] }, { info: { id: 'msg_a', role: 'assistant', parentID: 'msg_u', time: { created: 2 } }, parts: [] }])
  thread.turnOf.set('msg_a', 'msg_u')
  thread.activeTurn = { id: 'msg_u', startedMs: 1 }
  thread.onPart(execPart('running', [patchSub, bashSub]))
  assert.equal(thread.toolPartFor('call_1:2')?.id, 'prt_exec:2', 'a nested call\'s approval finds its own item')
  thread.onPart(execPart('error', [patchSub]))
  const lifecycle = events.filter((event) => event.method === 'item/started' || event.method === 'item/completed').map((event) => `${event.method.slice(5)} ${event.params.item.id} ${event.params.item.status ?? ''}`)
  assert.deepEqual(lifecycle, [
    'started prt_exec inProgress',
    'started prt_exec:1 inProgress',
    'completed prt_exec:1 completed',
    'started prt_exec:2 inProgress',
    'completed prt_exec:2 failed',
    'completed prt_exec failed',
  ])
  assert.ok(events.some((event) => event.method === 'turn/diff/updated' && /\+hi/.test(event.params.diff)))
})

// ------------------------------------------------------------------ MiMo working window

test('MiMo working window: limit.input, compaction.max_context (wildcards, K/M/%), clamped to the provider cap', async () => {
  assert.equal(parseQuantity('300K'), 300000)
  assert.equal(parseQuantity('1.5M'), 1500000)
  assert.equal(parseQuantity('25%', 1000000), 250000)
  assert.equal(parseQuantity('abc'), undefined)
  assert.equal(wildcardValue('openai/gpt-5.6', { '*': 1, 'openai/*': 2, 'openai/gpt-5*': 3 }), 3)
  const entry = (limit, id = 'dummy/m') => ({ id, provider: { id: id.split('/')[0] }, model: { id: id.split('/')[1], limit } })
  assert.equal(workingWindow(entry({ context: 1000000, output: 8000 })), 1000000)
  assert.equal(workingWindow(entry({ context: 400000, input: 272000, output: 128000 })), 272000, 'limit.input is the cap when published')
  assert.equal(workingWindow(entry({ context: 1000000, output: 8000 }), { maxContext: { 'dummy/*': '200K' } }), 200000)
  assert.equal(workingWindow(entry({ context: 1000000, output: 8000 }), { maxContext: '2M' }), 1000000, 'a budget never raises the window')
  assert.equal(workingWindow(entry({ context: 1000000, output: 8000 }), { maxContext: 0 }), 1000000, '0 restores the model window')
  assert.equal(workingWindow(entry({ context: 1000000, output: 8000 }), { maxContext: '10K' }), 1000000, 'a budget under the reserve is ignored')
  assert.equal(workingWindow(entry({ context: 1000000 }), { maxContext: { 'other/*': '200K' } }), 1000000)
  assert.equal(workingWindow(entry({ context: 0 })), null)

  const mimo = bridgeFor('mimo', async (method, route) => (route === '/config' ? { compaction: { max_context: { 'dummy/*': '200K' } } } : {}))
  const providers = { providers: [{ id: 'dummy', name: 'Dummy', models: { m: { id: 'm', name: 'M', limit: { context: 1000000, output: 8000 } } } }], default: { dummy: 'm' } }
  mimo.bridge.catalog = new ModelCatalog(async () => providers)
  const listed = (await mimo.bridge.handle('model/list', {})).data
  assert.equal(listed[0].contextWindow, 200000)
  await mimo.bridge.loadCompaction('/w')
  await mimo.bridge.catalog.load()
  const thread = new LiveThread(mimo.bridge, { info: { id: 'ses_w', directory: '/w' } })
  thread.model = 'dummy/m'
  assert.equal(thread.tokenUsage().modelContextWindow, 200000)

  // OpenCode keeps limit.context (what its own TUI counts against).
  const opencode = bridgeFor('opencode', async (method, route) => (route === '/config' ? { compaction: { max_context: '200K' } } : {}))
  opencode.bridge.catalog = new ModelCatalog(async () => providers)
  assert.equal((await opencode.bridge.handle('model/list', {})).data[0].contextWindow, 1000000)
})
