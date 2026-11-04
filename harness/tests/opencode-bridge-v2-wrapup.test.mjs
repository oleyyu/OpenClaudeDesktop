// OpenCode 2.x bridge, phase 9 (wrap-up): what initialize reports per generation and how it agrees with the core
// descriptor (app/electron/cores/opencode.mjs, pinned to 2.2.5), share links refused, structured output refused, /cd on
// POST /api/session/:id/move, and the history location 2.x reports (its own database under the bridge's folder).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'
import { METHOD_NOT_FOUND } from '../packages/opencode-bridge/src/transport.js'
import { coreById, coreCapabilities } from '../../app/electron/core-registry.mjs'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'
import { assistant, idle, text, user } from './fixtures/v2-history.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-wrapup-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')

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

/** A v2 Bridge on a fake child process + the in-process fake; its notifications collected. */
function v2Bridge({ fake = createV2Fake({ cwd: '/home' }) } = {}) {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { fake.serve(options.env); return fakeChild() }
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  bridge.log = () => {}
  return { bridge, fake, home, notes }
}

/** A root session with one exchange in `directory`. */
function exchange(fake, directory) {
  const info = fake.makeSession({ title: 'Movable', location: { directory } })
  fake.addMessages(info.id, [user(`msg_u${info.id}`, 1, 'hello'), assistant(`msg_a${info.id}`, 2, [text('hi')]), idle(`msg_i${info.id}`, 3)])
  return info
}

const routesOf = (fake, method, pattern) => fake.state.requests.filter((request) => request.method === method && pattern.test(request.path))

test('capabilitiesFor: 2.x reports no share links and no structured output; 1.x and MiMo keep both', () => {
  const v1 = capabilitiesFor(FLAVORS.opencode)
  const v2 = capabilitiesFor(OC2)
  assert.equal(v1.structuredOutput, true)
  assert.equal(v1.threadShare, true)
  assert.equal(v2.structuredOutput, false)
  // Reported false, not left out: the app lays what a core reports over what its descriptor implies.
  assert.equal(v2.threadShare, false)
  assert.deepEqual(capabilitiesFor(FLAVORS.opencode, 'v2'), v2, 'the generation can be named outright')
  assert.deepEqual(capabilitiesFor(OC2, 'v1'), v1)
  const mimo = capabilitiesFor(FLAVORS.mimo)
  assert.equal(mimo.structuredOutput, true)
  assert.equal(mimo.threadShare, undefined)
  // Everything else is the same capability set (the workflow tool switches name 2.x's tools).
  const rest = (caps) => { const { structuredOutput: _s, threadShare: _t, workflowToolSwitches: _w, ...others } = caps; return others }
  assert.deepEqual(rest(v2), rest(v1))
})

test('the OpenCode descriptor agrees with what either generation reports, and pins the 2.2.5 release', () => {
  const descriptor = coreById('opencode')
  for (const [api, reported] of [['v1', capabilitiesFor(FLAVORS.opencode)], ['v2', capabilitiesFor(OC2)]]) {
    for (const [key, value] of Object.entries(descriptor.implies)) if (key in reported) assert.deepEqual(value, reported[key], `${api}: ${key}`)
    // After initialize: the reported generation decides (core-registry.mjs coreCapabilities).
    const effective = coreCapabilities({ engine: 'opencode', capabilities: reported })
    assert.equal(effective.threadShare, api === 'v1', `${api} threadShare`)
    assert.equal(effective.structuredOutput, api === 'v1', `${api} structuredOutput`)
  }
  assert.equal('threadShare' in descriptor.implies, false)
  assert.equal('structuredOutput' in descriptor.implies, false)
  const release = descriptor.agent.release
  assert.equal(release.version, '2.2.5')
  assert.equal(release.tag, 'v2.2.5')
  assert.deepEqual(release.assets.arm64, { name: 'opencode-darwin-arm64.zip', size: 105851917, sha256: '25ba9908979fa7d764792c82589b4b5768ab1511154e0317d98aa77d216ce767' })
  assert.deepEqual(release.assets.x64, { name: 'opencode-darwin-x64.zip', size: 111093657, sha256: '4d4419022e6ffbd48afc97c5101bdf001d38b0499f516169b9a80a87a340fd56' })
  // 2.x loads a local plugin from a folder only.
  assert.match(descriptor.plugins.placeholder, /plugin-folder/)
})

test('initialize on 2.x reports its own history: the bridge folder\'s database for the delete confirms and Storage', async () => {
  const { bridge, home } = v2Bridge()
  try {
    const init = await bridge.handle('initialize', { clientInfo: { name: 'test' } })
    assert.equal(init.capabilities.structuredOutput, false)
    assert.equal(init.capabilities.threadShare, false)
    assert.equal(init.capabilities.historyLocation, '~/state/opencode-v2')
    assert.deepEqual(init.capabilities.sessionStore, { database: 'opencode-v2' })
    assert.equal(path.join(init.codexHome, init.capabilities.sessionStore.database), path.join(home, 'state', 'opencode-v2'))
  } finally { await bridge.stop() }
})

test('initialize on 1.x reports neither (the descriptor\'s ~/.local/share/opencode stays)', () => {
  const caps = capabilitiesFor(FLAVORS.opencode)
  assert.equal(caps.historyLocation, undefined)
  assert.equal(caps.sessionStore, undefined)
})

test('codeDesktop/thread/share on 2.x is METHOD_NOT_FOUND, with nothing sent', async () => {
  const { bridge, fake } = v2Bridge()
  try {
    const info = exchange(fake, '/w')
    await bridge.handle('initialize', {})
    const before = fake.state.requests.length
    await assert.rejects(bridge.handle('codeDesktop/thread/share', { threadId: info.id, enabled: true }), (error) => error.code === METHOD_NOT_FOUND && /no share links/.test(error.message))
    assert.equal(fake.state.requests.length, before)
  } finally { await bridge.stop() }
})

test('turn/start with an outputSchema on 2.x is refused before anything is sent', async () => {
  const { bridge, fake } = v2Bridge()
  try {
    const info = exchange(fake, '/w')
    await bridge.openThread(info.id)
    await assert.rejects(bridge.handle('turn/start', { threadId: info.id, input: [{ type: 'text', text: 'hi', text_elements: [] }], outputSchema: { type: 'object' } }), /structured output/)
    assert.equal(routesOf(fake, 'POST', /\/prompt$/).length, 0)
  } finally { await bridge.stop() }
})

test('/cd on 2.x: POST …/move {directory}, the thread reopens in the new folder; the check reports no changes to bring', async () => {
  const { bridge, fake } = v2Bridge()
  const from = tmp()
  const to = tmp()
  try {
    const info = exchange(fake, from)
    const live = await bridge.openThread(info.id)
    assert.equal(live.cwd, from)
    // The app asks first whether to bring uncommitted changes: 2.x never does, so there is nothing to offer.
    assert.deepEqual(await bridge.handle('codeDesktop/thread/move', { threadId: info.id, check: true }), { changes: 0 })
    assert.equal(fake.state.moves.length, 0)
    const moved = await bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: to, moveChanges: true })
    assert.equal(moved.moved, true)
    assert.equal(moved.thread.cwd, to)
    // moveChanges is not 2.x's: only the folder goes (openapi's body is {directory, delivery?}).
    assert.deepEqual(fake.state.moves, [{ sessionID: info.id, directory: to }])
    assert.deepEqual(fake.state.violations, [])
    assert.equal(bridge.store.get(info.id).cwd, to)
    const reopened = bridge.threads.get(info.id)
    assert.notEqual(reopened, live, 'the live thread reopened')
    assert.equal(reopened.cwd, to)
    // 1.x's reminder prompt is not sent: v2 tells the model itself (its location-switched message).
    assert.equal(routesOf(fake, 'POST', /\/prompt$/).length, 0)
    // The same folder again: nothing to do.
    const again = await bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: to })
    assert.equal(again.moved, false)
    assert.equal(fake.state.moves.length, 1)
  } finally { await bridge.stop() }
})

test('/cd on 2.x: a missing folder is refused here; a move v2 has not done in time is cancelled, the thread left where it was', async () => {
  const { bridge, fake } = v2Bridge()
  const from = tmp()
  const to = tmp()
  try {
    const info = exchange(fake, from)
    await bridge.openThread(info.id)
    await assert.rejects(bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: path.join(to, 'nope') }), /doesn’t exist/)
    fs.writeFileSync(path.join(to, 'file.txt'), 'x')
    await assert.rejects(bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: path.join(to, 'file.txt') }), /isn’t a folder/)
    assert.equal(fake.state.moves.length, 0)
    fake.state.moveLater = true
    bridge.v2.moveWaitMs = 300
    const before = fake.state.requests.length
    await assert.rejects(bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: to }), /the move was cancelled/)
    // The waiting move is taken back out of v2's inbox: nothing left to land later behind the thread's back.
    const after = fake.state.requests.slice(before).filter((request) => /\/inbox/.test(request.path)).map((request) => request.method)
    assert.deepEqual(after.slice(-2), ['GET', 'DELETE'])
    assert.deepEqual(fake.state.inbox.get(info.id) ?? [], [])
    assert.equal(fake.state.sessions.find((entry) => entry.id === info.id).location.directory, from)
    assert.equal(bridge.store.get(info.id).cwd ?? from, from)
    assert.equal(bridge.threads.get(info.id).cwd, from)
  } finally { await bridge.stop() }
})

test('/cd on 2.x: a move v2 delivers just as the wait runs out is kept, the thread reopened in the new folder', async () => {
  const { bridge, fake } = v2Bridge()
  const from = tmp()
  const to = tmp()
  try {
    const info = exchange(fake, from)
    // The step boundary comes between the last look and the cancel: DELETE then finds nothing (204).
    let armed = false
    bridge.v2.fetch = async (input, init) => {
      if (armed && new URL(String(input)).pathname.endsWith('/inbox') && (init?.method ?? 'GET') === 'GET') for (const item of [...(fake.state.inbox.get(info.id) ?? [])]) fake.deliver(info.id, item.id)
      return fake.fetch(input, init)
    }
    const live = await bridge.openThread(info.id)
    fake.state.moveLater = true
    bridge.v2.moveWaitMs = 0
    armed = true
    const moved = await bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: to })
    assert.equal(moved.moved, true)
    assert.equal(moved.thread.cwd, to)
    assert.equal(bridge.store.get(info.id).cwd, to)
    const reopened = bridge.threads.get(info.id)
    assert.notEqual(reopened, live)
    assert.equal(reopened.cwd, to)
  } finally { await bridge.stop() }
})

test('/cd on 2.x waits for a running turn, as on 1.x', async () => {
  const { bridge, fake } = v2Bridge()
  const from = tmp()
  const to = tmp()
  try {
    const info = exchange(fake, from)
    const live = await bridge.openThread(info.id)
    live.busy = true
    await assert.rejects(bridge.handle('codeDesktop/thread/move', { threadId: info.id, cwd: to }), /Wait for the current turn/)
    assert.equal(fake.state.moves.length, 0)
    live.busy = false
  } finally { await bridge.stop() }
})
