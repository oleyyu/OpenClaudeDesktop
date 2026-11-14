// OpenCode 2.x bridge, phase 8: usage (src/v2/usage.js) — every session's v2 messages folded (user and assistant only,
// a fork's copied messages left out, a turn from its prompt to its idle message), checked against GET
// /api/experimental/session/stats, which the fake computes as core/src/session/stats.ts does.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { foldSessionV2, tokenTotal } from '../packages/opencode-bridge/src/v2/usage.js'
import { localDayKey } from '../packages/opencode-bridge/src/usage.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'
import { assistant, idle, synthetic, text, tool, user } from './fixtures/v2-history.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-usage-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })
const OC2 = withApi(FLAVORS.opencode, 'v2')
const DAY = 86400000
const T0 = new Date(2026, 9, 20, 10, 0, 0).getTime()

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

function v2Bridge(fetch) {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { fetch.fake.serve(options.env); return fakeChild() }
  const logs = []
  bridge.log = (line) => logs.push(line)
  bridge.notify = () => {}
  return { bridge, logs }
}

/** A root session (two days of turns), its fork (copied messages before its creation, then one turn), a sub-agent's session. */
function seed(fake) {
  const root = fake.makeSession({ title: 'Root', location: { directory: '/w' } })
  root.time.created = T0 - 1000
  fake.addMessages(root.id, [
    user('msg_u1', T0, 'one'),
    assistant('msg_a1', T0 + 1000, [text('a'), tool('call_1', 'shell', { command: 'ls' })], { completed: T0 + 5000 }),
    assistant('msg_a2', T0 + 6000, [text('b')], { completed: T0 + 9000, tokens: { input: 10, output: 1, reasoning: 0, cache: { read: 0, write: 3 } }, cost: 0.5, model: { id: 'gpt-5', providerID: 'openai' } }),
    idle('msg_i1', T0 + 70000),
    synthetic('msg_s1', T0 + DAY, 'reminder'),
    user('msg_u2', T0 + DAY + 1000, 'two'),
    assistant('msg_a3', T0 + DAY + 2000, [text('c')]),
    idle('msg_i2', T0 + DAY + 3000),
  ])
  const fork = fake.makeSession({ title: 'Fork', location: { directory: '/w' } })
  fork.time.created = T0 + 2 * DAY
  fork.fork = { sessionID: root.id, boundary: { type: 'through', messageID: 'msg_i1' } }
  fake.addMessages(fork.id, [
    { ...user('msg_fork0', T0, 'one') }, { ...assistant('msg_fork1', T0 + 1000, [text('a')]) }, idle('msg_fork2', T0 + 70000),
    user('msg_u3', T0 + 2 * DAY + 10, 'three'), assistant('msg_a4', T0 + 2 * DAY + 20, [text('d')]), idle('msg_i4', T0 + 2 * DAY + 30),
  ])
  const child = fake.makeSession({ parentID: root.id, title: 'Sub' })
  child.time.created = T0 + 2000
  fake.addMessages(child.id, [synthetic('msg_cs', T0 + 2000, 'task'), assistant('msg_ca', T0 + 3000, [text('sub')])])
  return { root, fork, child }
}

test('foldSessionV2: user and assistant messages only, a fork\'s copies left out, a turn from its prompt to its idle', () => {
  const fake = createV2Fake()
  const { root, fork, child } = seed(fake)
  const rootFold = foldSessionV2(fake.state.messages.get(root.id), root)
  const day1 = rootFold.days[localDayKey(T0)]
  assert.deepEqual([day1.messages, day1.toolCalls, day1.sessions, day1.tokens], [3, 1, 1, 175 + 14])
  assert.deepEqual(day1.models, { 'anthropic/claude-x': 175, 'openai/gpt-5': 14 })
  assert.equal(day1.costUsd, 0.501)
  assert.equal(rootFold.days[localDayKey(T0 + DAY)].messages, 2, 'the synthetic reminder is not counted')
  assert.equal(rootFold.longestTurnSec, 70, 'prompt → idle')
  assert.equal(rootFold.tokens, 175 + 14 + 175)
  const forkFold = foldSessionV2(fake.state.messages.get(fork.id), fork)
  assert.deepEqual(Object.keys(forkFold.days), [localDayKey(T0 + 2 * DAY)])
  assert.equal(forkFold.tokens, 175)
  const childFold = foldSessionV2(fake.state.messages.get(child.id), child)
  assert.equal(childFold.subagent, true)
  assert.equal(childFold.days[localDayKey(T0)].sessions, 0)
  assert.equal(tokenTotal({ input: 1, output: 2, reasoning: 3, cache: { read: 4, write: 5 } }), 15)
})

test('account/usage/read and codeDesktop/stats/read on 2.x: the folded total is the server\'s own stats total', async () => {
  const fake = createV2Fake()
  const fetch = (input, init) => fake.fetch(input, init)
  fetch.fake = fake
  const { bridge, logs } = v2Bridge(fetch)
  seed(fake)
  try {
    const usage = await bridge.handle('account/usage/read', {})
    // root 175 + 14 + 175, fork 175 (its copy of the root's first turn left out), sub-agent 175.
    assert.equal(usage.summary.lifetimeTokens, 714)
    assert.equal(usage.summary.longestRunningTurnSec, 70)
    assert.deepEqual(bridge.v2.usageCheck, { folded: 714, server: 714, matches: true })
    assert.ok(!logs.some((line) => /^usage:/.test(line)))
    const stats = await bridge.handle('codeDesktop/stats/read', {})
    assert.equal(stats.dailyActivity.find((day) => day.date === localDayKey(T0)).sessionCount, 1)
    assert.equal(stats.dailyActivity.reduce((sum, day) => sum + day.sessionCount, 0), 2, 'the root and the fork; not the sub-agent')
    const sessions = fake.state.requests.filter((request) => request.path === '/api/session').map((request) => new URL(request.url).searchParams)
    assert.ok(sessions.every((query) => !query.has('archived') && !query.has('parentID')), 'every session: archived and sub-agent ones too')
    const asked = fake.state.requests.filter((request) => request.path === '/api/experimental/session/stats')
    assert.equal(new URL(asked[0].url).searchParams.get('tools'), 'none')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('usage on 2.x: a fold that disagrees with the server\'s stats is logged (and not when a session is left out)', async () => {
  const fake = createV2Fake()
  const fetch = async (input, init) => {
    const response = await fake.fetch(input, init)
    if (!String(input).includes('/session/stats')) return response
    const body = await response.json()
    body.data.tokens.input += 1000
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  fetch.fake = fake
  const { bridge, logs } = v2Bridge(fetch)
  const { child } = seed(fake)
  try {
    await bridge.handle('account/usage/read', {})
    assert.deepEqual(bridge.v2.usageCheck, { folded: 714, server: 1714, matches: false })
    assert.ok(logs.includes('usage: 714 tokens folded, OpenCode counts 1714'))
    // A session the bridge hides (a workflow agent's) is not folded: no comparison then.
    bridge.store.update(child.id, { hidden: true })
    bridge.v2.usageCheck = null
    const usage = await bridge.handle('account/usage/read', {})
    assert.equal(usage.summary.lifetimeTokens, 539)
    assert.equal(bridge.v2.usageCheck, null)
  } finally { await bridge.stop() }
})
