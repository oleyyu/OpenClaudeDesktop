// OpenCode 2.x bridge, live round 2 (probe item 7): the bridge's own plugin and a folder's `"plugins": ["-*"]`.
// core/src/config.ts loads OPENCODE_CONFIG_CONTENT after every user and project document (only managed settings come
// later) and plugin/supervisor.ts folds the `plugins` operations in that order, so the bridge's entry in CONTENT loads its
// plugin again after a project's "-*". The fake ports that resolution (resolvePluginsV2); GET /api/plugin, like v2's,
// doesn't await a location's activation (a location loaded just now lists [], which is what the probe saw). What the
// order can't cover — a managed config, a project plugin claiming the id `code-desktop`, a failed load — is refused:
// no turn runs in a folder where the bridge's plugin isn't active (bridgePluginGuardV2), checked before the folder's
// first turn and again after plugin.updated, which also interrupts the turns running there.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { mergeConfigEntries } from '../packages/opencode-bridge/src/v2/config.js'
import { GUARDED_PLUGINS_V2 } from '../packages/opencode-bridge/src/v2/extensions.js'
import { createV2Fake, noClaude, resolvePluginsV2, GUARDED_V2 } from './fixtures/v2-fake.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-guard-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const BRIDGE_DIR = '/state/opencode-plugin/code-desktop'
const doc = (info, file) => ({ type: 'document', ...(file ? { path: file } : {}), info })
const active = (list) => list.filter((plugin) => plugin.state.status === 'active').map((plugin) => plugin.id)

function fakeChild() {
  const child = new EventEmitter()
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.pid = 4321
  child.exitCode = null
  child.kill = (signal) => { setImmediate(() => { if (child.exitCode === null) { child.exitCode = -1; child.emit('exit', null, signal) } }); return true }
  child.stdin.on('finish', () => setImmediate(() => { if (child.exitCode === null) { child.exitCode = 0; child.emit('exit', 0, null) } }))
  setImmediate(() => child.stdout.write(JSON.stringify({ url: 'http://127.0.0.1:4096' }) + '\n'))
  return child
}

const until = async (condition, what = 'condition', ms = 3000) => {
  const end = Date.now() + ms
  while (!condition()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
    await new Promise((resolve) => setTimeout(resolve, 2))
  }
}

async function v2Bridge() {
  const fake = createV2Fake({ cwd: '/home' })
  fake.state.models = [{ id: 'claude-x', providerID: 'anthropic', name: 'Claude X', capabilities: { tools: true, input: ['text'], output: ['text'] }, variants: [], cost: [{ input: 3, output: 15 }], limit: { context: 200000, output: 32000 }, enabled: true }]
  fake.state.providers = [{ id: 'anthropic', name: 'Anthropic', activation: 'enabled', package: 'aisdk:@ai-sdk/anthropic' }]
  fake.state.defaultModel = fake.state.models[0]
  fake.state.agents = [{ id: 'build', name: 'Build', mode: 'primary', permissions: [] }]
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  // Every spawn is a new serve: its OPENCODE_CONFIG_CONTENT, and no location has run its plugins yet (fake.restart).
  const children = []
  bridge.v2.spawn = (command, args, options) => { fake.serve(options.env); fake.restart(); const child = fakeChild(); children.push(child); return child }
  bridge.v2.claimMs = 60
  bridge.v2.resyncMs = 1
  bridge.v2.pluginDebounceMs = 1
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  await bridge.ensureServer()
  await until(() => fake.openStreams > 0, 'the event stream')
  await new Promise((resolve) => setTimeout(resolve, 10))
  return { bridge, fake, home, notes, logs, children }
}

const requests = (fake, method, pathname, from = 0) => fake.state.requests.slice(from).filter((request) => request.method === method && request.path === pathname)
const startThread = async (bridge, cwd = '/w') => bridge.threads.get((await bridge.handle('thread/start', { cwd, model: 'anthropic/claude-x' })).thread.id)
const turn = (bridge, threadId, text = 'hi') => bridge.handle('turn/start', { threadId, input: [{ type: 'text', text }] })

// ---------------------------------------------------------------- v2's resolution (the fake's port)

test('resolution: a project "-*" before OPENCODE_CONFIG_CONTENT leaves the bridge plugin on; the guarded built-ins stay; the rest go', () => {
  const entries = [
    doc({ plugins: ['user-plugin'] }, '/home/.config/opencode/opencode.json'),
    doc({ plugins: ['-*'] }, '/w/opencode.json'),
    doc({ plugins: ['-*'] }, '/w/.opencode/opencode.json'),
    doc({ plugins: [{ package: BRIDGE_DIR, options: { state: '/state' } }] }),
  ]
  const list = resolvePluginsV2(entries)
  assert.deepEqual(active(list).sort(), [...GUARDED_V2, 'code-desktop'].sort())
  assert.equal(list.find((plugin) => plugin.id === 'code-desktop').source.path, BRIDGE_DIR)
  // The bridge's own reading of the same documents agrees (mergeConfigEntries folds the operations the same way).
  assert.deepEqual(mergeConfigEntries(entries).plugins.map((plugin) => plugin.target), [BRIDGE_DIR])
  // The bridge's guard knows the two built-ins every finished activation lists.
  assert.deepEqual([...GUARDED_PLUGINS_V2].sort(), [...GUARDED_V2].sort())
})

test('resolution: "-code-desktop" or "-*" in a later managed document removes it; a project plugin with its id wins the id', () => {
  const content = doc({ plugins: [{ package: BRIDGE_DIR, options: {} }] })
  for (const op of ['-*', '-code-desktop', '-code.*']) {
    const list = resolvePluginsV2([doc({ plugins: ['-*'] }, '/w/opencode.json'), content, doc({ plugins: [op] }, '/Library/Application Support/opencode/opencode.json')])
    if (op === '-code.*') { assert.ok(active(list).includes('code-desktop'), '`code.*` selects ids starting "code.", not this one'); continue }
    assert.ok(!list.some((plugin) => plugin.id === 'code-desktop'), op)
    for (const id of GUARDED_V2) assert.ok(active(list).includes(id), `${op} keeps ${id}`)
  }
  // A project's plugins folder is discovered before any document: its `code-desktop` loads first, the bridge's fails.
  const list = resolvePluginsV2([{ type: 'directory', path: '/w/.opencode' }, content], { folders: { '/w/.opencode': [{ target: '/w/.opencode/plugins/evil.js', id: 'code-desktop' }] } })
  const mine = list.find((plugin) => plugin.source.path === BRIDGE_DIR)
  assert.deepEqual(mine.state, { status: 'failed', error: 'Duplicate plugin ID: code-desktop' })
  assert.equal(list.find((plugin) => plugin.source.path === '/w/.opencode/plugins/evil.js').state.status, 'active')
  // A project listing the bridge's folder with its own options: CONTENT's later add replaces it.
  const again = resolvePluginsV2([doc({ plugins: [{ package: BRIDGE_DIR, options: { state: '/evil' } }] }, '/w/opencode.json'), content])
  assert.equal(again.filter((plugin) => plugin.id === 'code-desktop').length, 1)
})

// ---------------------------------------------------------------- the bridge's guard

test('guard: the first turn in a folder waits for its activation (GET /api/agent) before GET /api/plugin; a cold location passes; later turns reuse the verdict', async () => {
  const { bridge, fake } = await v2Bridge()
  fake.state.configEntries = [doc({ plugins: ['-*'] }, '/w/.opencode/opencode.json')]
  try {
    // The probe's case: a location used for the first time lists [] until its plugins have run (no coldLocations needed).
    assert.deepEqual(await bridge.v2.api.get('/api/plugin', { location: '/w' }), [])
    const live = await startThread(bridge)
    // thread/start's model reads activated /w: as if that activation were still running, the turn has to wait for it.
    fake.state.activated.delete('/w')
    const from = fake.state.requests.length
    const { turn: first } = await turn(bridge, live.id)
    const order = fake.state.requests.slice(from).map((request) => `${request.method} ${request.path}`)
    assert.ok(order.indexOf('GET /api/agent') < order.indexOf('GET /api/plugin'), order.join(', '))
    assert.equal(requests(fake, 'POST', `/api/session/${live.id}/prompt`, from)[0].body.id, first.id)
    fake.emit('session.execution.succeeded', { sessionID: live.id })
    await until(() => !live.activeTurn, 'the turn ended')
    const again = fake.state.requests.length
    await turn(bridge, live.id, 'again')
    assert.equal(requests(fake, 'GET', '/api/plugin', again).length, 0, 'the active verdict is kept')
  } finally { await bridge.stop() }
})

test('guard: a managed "-*" (after OPENCODE_CONFIG_CONTENT) refuses turn/start with the reason; nothing is posted or announced', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  fake.state.managedEntries = [doc({ plugins: ['-*'] }, '/Library/Application Support/opencode/opencode.json')]
  try {
    const live = await startThread(bridge)
    const from = fake.state.requests.length
    const seen = notes.length
    await assert.rejects(turn(bridge, live.id), (error) => {
      assert.match(error.message, /plugin is not active in \/w/)
      assert.match(error.message, /managed config/)
      assert.match(error.message, /sandbox/)
      return true
    })
    assert.equal(requests(fake, 'POST', `/api/session/${live.id}/prompt`, from).length, 0)
    assert.equal(notes.slice(seen).filter((note) => note.method === 'turn/started').length, 0)
    assert.equal(live.activeTurn, null)
    // Not kept: once the managed file is fixed, the next try checks again and runs.
    fake.state.managedEntries = []
    await turn(bridge, live.id)
    assert.equal(requests(fake, 'POST', `/api/session/${live.id}/prompt`, from).length, 1)
  } finally { await bridge.stop() }
})

test('guard: a project plugin claiming the id, a failed load, and a failed check are refused; compact, steer and review too', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    fake.state.configEntries = (directory) => [{ type: 'directory', path: `${directory}/.opencode` }]
    fake.state.pluginFolders = { '/w/.opencode': [{ target: '/w/.opencode/plugins/x.js', id: 'code-desktop' }] }
    const live = await startThread(bridge)
    await assert.rejects(turn(bridge, live.id), /uses its id `code-desktop`/)
    await assert.rejects(bridge.handle('thread/compact/start', { threadId: live.id }), /uses its id/)
    assert.equal(live.activeTurn, null, 'the compaction turn was taken back')
    await assert.rejects(bridge.handle('review/start', { threadId: live.id, target: { type: 'uncommittedChanges' } }), /uses its id/)
    fake.state.pluginFolders = {}
    fake.state.pluginModules = { [bridge.config.pluginDir]: { error: 'SyntaxError: boom' } }
    await assert.rejects(turn(bridge, live.id), /failed to load: SyntaxError: boom/)
    fake.state.pluginModules = {}
    fake.state.plugins = () => { throw new Error('socket hang up') }
    await assert.rejects(turn(bridge, live.id), /Couldn't check/)
    fake.state.plugins = null
    const { turn: running } = await turn(bridge, live.id)
    assert.ok(running.id)
    // A steer delivered after the end starts a turn of its own: checked like one (here the verdict is still kept).
    fake.state.managedEntries = [doc({ plugins: ['-code-desktop'] }, '/Library/Application Support/opencode/opencode.json')]
    bridge.pluginGuardResetV2()
    await assert.rejects(bridge.handle('turn/steer', { threadId: live.id, expectedTurnId: running.id, input: [{ type: 'text', text: 'more' }] }), /not active/)
  } finally { await bridge.stop() }
})

test('guard: plugin.updated drops every verdict; a folder whose finished list lost the plugin has its running turns interrupted', async () => {
  const { bridge, fake, notes } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    const other = await startThread(bridge, '/elsewhere')
    await turn(bridge, live.id)
    await turn(bridge, other.id)
    assert.ok(bridge.v2.pluginGuard.has('/w') && bridge.v2.pluginGuard.has('/elsewhere'))
    // An admin's managed config now removes the plugin; v2 reloads and publishes plugin.updated for each location.
    fake.state.managedEntries = [doc({ plugins: ['-*'] }, '/Library/Application Support/opencode/opencode.json')]
    const from = fake.state.requests.length
    fake.emit('plugin.updated', {}, { location: { directory: '/w' } })
    await until(() => requests(fake, 'POST', `/api/session/${live.id}/interrupt`, from).length === 1, 'the interrupt')
    assert.equal(bridge.v2.pluginGuard.has('/elsewhere'), false, 'every verdict dropped at once')
    assert.equal(requests(fake, 'POST', `/api/session/${other.id}/interrupt`, from).length, 0, 'only the folder that was read')
    assert.ok(notes.some((note) => note.method === 'configWarning' && /not active in \/w/.test(note.params.summary)))
    await until(() => !live.activeTurn, 'the interrupted turn ended')
    const ended = notes.find((note) => note.method === 'turn/completed' && note.params.threadId === live.id)
    assert.equal(ended?.params.turn.status, 'interrupted', 'the reason is the notice above')
    // A list read before the location's activation finished ([]) only drops the verdict: no interrupt.
    fake.state.managedEntries = []
    fake.state.coldLocations.add('/elsewhere')
    const later = fake.state.requests.length
    fake.emit('plugin.updated', {}, { location: { directory: '/elsewhere' } })
    await until(() => requests(fake, 'GET', '/api/plugin', later).length === 1, 'the list read again')
    await new Promise((resolve) => setTimeout(resolve, 20))
    assert.equal(requests(fake, 'POST', `/api/session/${other.id}/interrupt`, later).length, 0)
  } finally { await bridge.stop() }
})

test('guard: location.shutdown drops the verdicts (a location built again runs its plugins again)', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    await turn(bridge, live.id)
    assert.ok(bridge.v2.pluginGuard.has('/w'))
    fake.emit('location.shutdown', {}, { location: { directory: '/w' } })
    await until(() => !bridge.v2.pluginGuard.has('/w'), 'the verdict dropped')
  } finally { await bridge.stop() }
})

test('guard: a new serve (restartServer, a crash and the next start) drops every verdict; its first turn is checked again', async () => {
  const { bridge, fake, children } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    await turn(bridge, live.id)
    fake.emit('session.execution.succeeded', { sessionID: live.id })
    await until(() => !live.activeTurn, 'the turn ended')
    assert.ok(bridge.v2.pluginGuard.has('/w'))
    // The new serve process loads a managed "-*" the old one didn't have: its locations activate anew.
    fake.state.managedEntries = [doc({ plugins: ['-*'] }, '/Library/Application Support/opencode/opencode.json')]
    assert.equal(await bridge.restartServer(), true)
    assert.equal(children.length, 2, 'a second serve was spawned')
    assert.equal(bridge.v2.pluginGuard.has('/w'), false)
    let from = fake.state.requests.length
    await assert.rejects(turn(bridge, live.id), /plugin is not active in \/w/)
    assert.equal(requests(fake, 'GET', '/api/agent', from).length, 1, 'the activation awaited again')
    assert.equal(requests(fake, 'GET', '/api/plugin', from).length, 1, 'the list read again')
    assert.equal(requests(fake, 'POST', `/api/session/${live.id}/prompt`, from).length, 0)
    // The same after the serve exits on its own: the next start's locations are checked again.
    fake.state.managedEntries = []
    await turn(bridge, live.id)
    fake.emit('session.execution.succeeded', { sessionID: live.id })
    await until(() => !live.activeTurn, 'the turn ended')
    assert.ok(bridge.v2.pluginGuard.has('/w'))
    const child = children.at(-1)
    child.exitCode = 1
    child.emit('exit', 1, null)
    await until(() => !bridge.v2.pluginGuard.has('/w'), 'the verdict dropped on exit')
    fake.state.managedEntries = [doc({ plugins: ['-code-desktop'] }, '/Library/Application Support/opencode/opencode.json')]
    from = fake.state.requests.length
    await assert.rejects(turn(bridge, live.id), /not active/)
    assert.equal(requests(fake, 'POST', `/api/session/${live.id}/prompt`, from).length, 0)
  } finally { await bridge.stop() }
})

test('guard: an event stream reconnection drops every verdict (a plugin.updated may have been missed meanwhile)', async () => {
  const { bridge, fake } = await v2Bridge()
  try {
    const live = await startThread(bridge)
    await turn(bridge, live.id)
    fake.emit('session.execution.succeeded', { sessionID: live.id })
    await until(() => !live.activeTurn, 'the turn ended')
    assert.ok(bridge.v2.pluginGuard.has('/w'))
    fake.drop()
    await until(() => fake.openStreams > 0, 'the stream reconnected', 5000)
    await until(() => !bridge.v2.pluginGuard.has('/w'), 'the verdict dropped')
    fake.state.managedEntries = [doc({ plugins: ['-*'] }, '/Library/Application Support/opencode/opencode.json')]
    await assert.rejects(turn(bridge, live.id), /not active/)
  } finally { await bridge.stop() }
})
