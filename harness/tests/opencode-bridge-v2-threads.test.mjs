// OpenCode 2.x bridge, phase 4: reading threads through the in-process v2 fake — thread/list on GET /api/session (its
// own cursor behind 'oc2:', parentID=null, never `archived`, the `directory` filter, 1.x threads hidden), thread/read
// and thread/resume on paged GET /api/session/:id/message, GET /api/session/active for the running state, model/list
// from /api/model + /api/model/default + /api/provider (src/v2/catalog.js), and agents by id.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge } from '../packages/opencode-bridge/src/index.js'
import { ENGINE_V2 } from '../packages/opencode-bridge/src/v2/threads.js'
import { CatalogV2, v1Providers } from '../packages/opencode-bridge/src/v2/catalog.js'
import { createV2Fake, noClaude } from './fixtures/v2-fake.mjs'
import { assistant, idle, text, tool, user } from './fixtures/v2-history.mjs'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-v2-threads-'))); made.push(dir); return dir }
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

/** A v2 Bridge on a fake child process + the in-process fake; its notifications and log collected. */
function v2Bridge({ fake = createV2Fake({ cwd: '/home' }) } = {}) {
  const home = tmp()
  const bridge = new Bridge({ flavor: OC2, binary: '/opt/opencode', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data'), XDG_CONFIG_HOME: path.join(home, 'xdg'), SHELL: '/bin/zsh', PATH: '/usr/bin:/bin' }, input: new PassThrough(), output: new PassThrough() })
  bridge.v2.fetch = fake.fetch
  bridge.v2.claude = noClaude()
  bridge.v2.spawn = (command, args, options) => { fake.serve(options.env); return fakeChild() }
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const logs = []
  bridge.log = (line) => logs.push(line)
  return { bridge, fake, home, notes, logs }
}

const sessionRequests = (fake, pathname) => fake.state.requests.filter((request) => request.method === 'GET' && request.path === pathname).map((request) => new URL(request.url).searchParams)

/** A root session with one exchange (so it is listed). */
function exchange(fake, { title, directory = '/w', at = 1 } = {}) {
  const info = fake.makeSession({ title, location: { directory } })
  fake.addMessages(info.id, [user(`msg_u${info.id}`, at, `hello ${title}`), assistant(`msg_a${info.id}`, at + 1, [text(`hi ${title}`)]), idle(`msg_i${info.id}`, at + 2)])
  info.time.busy = at
  info.time.idle = at + 2
  return info
}

test('thread/list pages on OpenCode 2.x\'s own cursor: every root session once, parentID=null on the first page, never `archived`, pages no larger than asked', async () => {
  const { bridge, fake } = v2Bridge()
  const roots = []
  for (let i = 0; i < 57; i++) {
    const info = exchange(fake, { title: `Root ${i}` })
    roots.push(info.id)
    fake.makeSession({ parentID: info.id, title: `Child ${i}` })
  }
  try {
    const seen = []
    let cursor = null
    let pages = 0
    do {
      const page = await bridge.listThreads({ limit: 10, ...(cursor ? { cursor } : {}) })
      assert.ok(page.data.length <= 10)
      seen.push(...page.data.map((thread) => thread.id))
      cursor = page.nextCursor
      if (cursor) assert.match(cursor, /^oc2:/)
      pages++
    } while (cursor && pages < 20)
    assert.equal(new Set(seen).size, seen.length, 'no session twice')
    assert.deepEqual([...seen].sort(), [...roots].sort(), 'every root session, no sub-agent session')
    const requests = sessionRequests(fake, '/api/session')
    assert.ok(requests.length >= 6)
    for (const query of requests) {
      assert.equal(query.has('archived'), false, 'archived is three-state in 2.x: never sent')
      if (query.has('cursor')) assert.deepEqual([...query.keys()].sort(), ['cursor', 'limit'], 'a later page sends only its cursor')
      else assert.equal(query.get('parentID'), 'null')
    }
    assert.deepEqual(fake.state.violations, [])
    // The cursor handed out is OpenCode's own, behind the prefix.
    const first = await bridge.listThreads({ limit: 10 })
    const sent = sessionRequests(fake, '/api/session').length
    await bridge.listThreads({ limit: 10, cursor: first.nextCursor })
    assert.equal(sessionRequests(fake, '/api/session')[sent].get('cursor'), first.nextCursor.slice(4))
  } finally { await bridge.stop() }
})

test('thread/list reads full pages past sessions it leaves out, and a page cut part-way is asked for again up to the cut for an exact cursor', async () => {
  const { bridge, fake } = v2Bridge()
  const oldest = exchange(fake, { title: 'Oldest' })
  for (let i = 0; i < 300; i++) fake.makeSession({ location: { directory: '/w' } })
  const newer = []
  for (let i = 0; i < 49; i++) newer.push(exchange(fake, { title: `New ${i}` }).id)
  try {
    const all = await bridge.listThreads({ limit: 50 })
    assert.equal(all.data.length, 50)
    assert.deepEqual(all.data.map((thread) => thread.id).sort(), [...newer, oldest.id].sort())
    assert.equal(all.nextCursor, null, 'the list ended on the page that filled it')
    const reads = sessionRequests(fake, '/api/session')
    assert.ok(reads.length <= 4, `${reads.length} session list requests for 350 sessions, not one per left-out session`)
    // Filled part-way through a page: the same page again, cut after the 20th thread; its cursor resumes right there.
    const sent = sessionRequests(fake, '/api/session').length
    const first = await bridge.listThreads({ limit: 20 })
    const asked = sessionRequests(fake, '/api/session').slice(sent)
    assert.deepEqual(asked.map((query) => query.get('limit')), ['100', '20'])
    assert.equal(asked[1].get('parentID'), 'null', 'the cut page is the same first page')
    const rest = await bridge.listThreads({ limit: 50, cursor: first.nextCursor })
    const ids = [...first.data, ...rest.data].map((thread) => thread.id)
    assert.equal(new Set(ids).size, ids.length, 'no thread twice')
    assert.deepEqual([...ids].sort(), [...newer, oldest.id].sort())
    assert.equal(rest.nextCursor, null)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('thread/list: archived and sub-agent listings, one folder as the server\'s directory filter, 1.x threads hidden, never-run sessions left out', async () => {
  const { bridge, fake } = v2Bridge()
  const kept = exchange(fake, { title: 'Kept', directory: '/w' })
  const other = exchange(fake, { title: 'Elsewhere', directory: '/other' })
  const archived = exchange(fake, { title: 'Old' })
  archived.time.archived = archived.time.updated
  const untouched = fake.makeSession({ location: { directory: '/w' } })
  const child = fake.makeSession({ parentID: kept.id, title: 'Scan the repo' })
  // A threads.json entry of the 1.x engine for an id 2.x happens to list: kept for 1.x, never shown here.
  const legacy = exchange(fake, { title: 'Legacy' })
  fs.writeFileSync(path.join(bridge.stateDir, 'threads.json'), JSON.stringify({ [legacy.id]: { cwd: '/w', lastActivity: 5 } }))
  bridge.store.refresh(true)
  try {
    const all = await bridge.listThreads({ limit: 50 })
    assert.deepEqual(all.data.map((thread) => thread.id).sort(), [kept.id, other.id].sort())
    assert.equal(all.data.find((thread) => thread.id === kept.id).cwd, '/w', 'cwd from location.directory')
    assert.equal(all.data.find((thread) => thread.id === kept.id).cliVersion, 'opencode 2.2.5')
    assert.ok(!all.data.some((thread) => thread.id === untouched.id), 'a session that never ran')
    const inFolder = await bridge.listThreads({ limit: 50, cwd: '/w' })
    assert.deepEqual(inFolder.data.map((thread) => thread.id), [kept.id])
    assert.equal(sessionRequests(fake, '/api/session').at(-1).get('directory'), '/w')
    const archive = await bridge.listThreads({ limit: 50, archived: true })
    assert.deepEqual(archive.data.map((thread) => thread.id), [archived.id])
    const children = await bridge.listThreads({ limit: 50, sourceKinds: ['subAgentThreadSpawn'] })
    assert.deepEqual(children.data.map((thread) => thread.id), [child.id])
    assert.equal(children.data[0].parentThreadId, kept.id)
    // Sorted by creation: every session read, sorted here.
    const byCreation = await bridge.listThreads({ limit: 1, sortKey: 'created_at' })
    assert.equal(byCreation.data.length, 1)
    assert.equal(byCreation.nextCursor, '1')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('thread/read pages every message (200 a page, then only the cursor) and projects its turns', async () => {
  const { bridge, fake } = v2Bridge()
  const info = fake.makeSession({ title: 'Long', location: { directory: '/w' } })
  const messages = []
  for (let i = 0; i < 150; i++) messages.push(user(`msg_u${i}`, 1000 + i * 10, `q${i}`), assistant(`msg_a${i}`, 1001 + i * 10, [text(`a${i}`)]), idle(`msg_i${i}`, 1002 + i * 10))
  fake.addMessages(info.id, messages)
  try {
    const { thread } = await bridge.handle('thread/read', { threadId: info.id, includeTurns: true })
    assert.equal(thread.turns.length, 150)
    assert.equal(thread.turns[149].id, 'msg_u149')
    assert.deepEqual(thread.turns[149].items.map((item) => item.type), ['userMessage', 'agentMessage'])
    assert.equal(thread.turns[0].status, 'completed')
    assert.equal(thread.cwd, '/w')
    assert.equal(thread.preview, 'q0')
    const pages = sessionRequests(fake, `/api/session/${info.id}/message`)
    assert.equal(pages.length, 3)
    assert.deepEqual(Object.fromEntries(pages[0]), { order: 'asc', limit: '200' })
    for (const query of pages.slice(1)) assert.deepEqual([...query.keys()].sort(), ['cursor', 'limit'])
    const items = await bridge.handle('thread/items/list', { threadId: info.id, turnId: 'msg_u3' })
    assert.deepEqual(items.data.map((entry) => entry.item.id), ['msg_u3-user', 'msg_a3:text:0'])
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('thread/resume: the session as this server runs it (GET /api/session/active), marked as v2\'s; an unknown id is threadNotFound', async () => {
  const { bridge, fake, logs } = v2Bridge()
  const info = fake.makeSession({ title: 'Busy one', location: { directory: '/w' }, model: { id: 'claude-x', providerID: 'anthropic' } })
  fake.addMessages(info.id, [
    user('msg_u1', 1000, 'first'), assistant('msg_a1', 1001, [text('done')]), idle('msg_i1', 1002),
    user('msg_u2', 2000, 'second'), assistant('msg_a2', 2001, [tool('call_9', 'shell', { command: 'npm test' }, { status: 'running', at: 2001 })], { completed: null }),
  ])
  fake.state.active.add(info.id)
  try {
    const response = await bridge.handle('thread/resume', { threadId: info.id })
    assert.equal(response.thread.status.type, 'active')
    assert.deepEqual(response.thread.turns.map((turn) => [turn.id, turn.status]), [['msg_u1', 'completed'], ['msg_u2', 'inProgress']])
    assert.equal(response.thread.turns[1].items[1].status, 'inProgress')
    assert.equal(response.model, 'anthropic/claude-x')
    const live = bridge.threads.get(info.id)
    assert.equal(live.activeTurn.id, 'msg_u2')
    assert.equal(live.turnOf.get('msg_a2'), 'msg_u2')
    assert.equal(bridge.store.get(info.id).engine, ENGINE_V2)
    assert.ok(!logs.some((line) => /does not support this yet/.test(line)), 'no 1.x route was tried')
    assert.ok(!fake.state.requests.some((request) => !request.path.startsWith('/api/')))
    await assert.rejects(bridge.handle('thread/read', { threadId: 'ses_missing' }), (error) => error.data?.codexErrorInfo === 'threadNotFound')
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('model/list from /api/model: efforts from the variants, OpenCode\'s default, a signed-out OpenCode Zen under More models', async () => {
  const { bridge, fake } = v2Bridge()
  const model = (providerID, id, extra = {}) => ({ id, modelID: id, providerID, name: extra.name ?? id, capabilities: { tools: true, input: ['text', 'image'], output: ['text'] }, variants: [], time: { released: 1 }, cost: [{ input: 3, output: 15, cache: { read: 0.3, write: 3.75 } }], status: 'active', enabled: true, limit: { context: 200000, output: 32000 }, ...extra })
  fake.state.providers = [{ id: 'anthropic', name: 'Anthropic', activation: 'enabled', package: 'aisdk:@ai-sdk/anthropic' }, { id: 'opencode', name: 'OpenCode Zen', activation: 'enabled', package: 'aisdk:x', settings: { apiKey: 'public' } }]
  fake.state.models = [
    model('anthropic', 'claude-x', { name: 'Claude X', variants: [{ id: 'high' }, { id: 'max' }] }),
    model('anthropic', 'claude-y', { capabilities: { tools: true, input: ['text', 'pdf'], output: ['text'] } }),
    model('opencode', 'big-pickle', { cost: [] }),
    model('anthropic', 'old', { enabled: false }),
  ]
  fake.state.defaultModel = fake.state.models[1]
  try {
    const { data } = await bridge.handle('model/list', {})
    assert.deepEqual(data.map((entry) => entry.id), ['anthropic/claude-x', 'anthropic/claude-y', 'opencode/big-pickle'])
    const x = data[0]
    assert.equal(x.displayName, 'Claude X')
    assert.deepEqual(x.supportedReasoningEfforts.map((entry) => entry.reasoningEffort), ['default', 'high', 'max'])
    assert.deepEqual(x.inputModalities, ['text', 'image'])
    assert.equal(x.contextWindow, 200000)
    assert.deepEqual(data[1].inputModalities, ['text', 'pdf'])
    assert.deepEqual(data.filter((entry) => entry.isDefault).map((entry) => entry.id), ['anthropic/claude-y'], 'GET /api/model/default')
    assert.equal(data[2].section, 'overflow')
    const asked = fake.state.requests.find((request) => request.path === '/api/model')
    assert.equal(decodeURIComponent(asked.headers['x-opencode-directory']), bridge.homeDir())
    assert.ok(!new URL(asked.url).searchParams.has('types'), 'never ?types=')
    // No default model (the body has no data): the configured one when listed, else the bridge's own ranking.
    fake.state.defaultModel = null
    bridge.catalog.invalidate()
    assert.equal(await bridge.catalog.defaultId(), 'anthropic/claude-x')
    assert.equal(await bridge.catalog.defaultId('opencode/big-pickle'), 'opencode/big-pickle')
    // A catalog event drops the cache.
    await bridge.catalog.load()
    bridge.onEventV2({ type: 'model.updated', data: {} })
    assert.equal(bridge.catalog.cached, null)
    assert.deepEqual(fake.state.violations, [])
  } finally { await bridge.stop() }
})

test('v1Providers / CatalogV2 alone: models grouped by provider, providers missing from /api/provider named by id', async () => {
  const shaped = v1Providers([{ id: 'm', providerID: 'p', name: 'M', capabilities: { input: ['text'] }, variants: [{ id: 'low' }], cost: [], status: 'beta', enabled: true, limit: { context: 1000, output: 10 } }], [])
  assert.deepEqual(shaped, { providers: [{ id: 'p', name: 'p', models: { m: { id: 'm', name: 'M', status: 'beta', variants: { low: {} }, capabilities: { input: { text: true, image: false, pdf: false } }, limit: { context: 1000, output: 10 }, cost: { input: 0 } } } }], default: {} })
  const catalog = new CatalogV2(async () => ({ get: async (route) => (route === '/api/model' ? [] : null) }), { location: () => '/h' })
  assert.deepEqual(await catalog.codexModels(), [])
  assert.equal(await catalog.defaultId(), null)
})

test('agents by id: the primary agent a turn runs, Customize\'s agent list keyed by id', async () => {
  const { bridge, fake } = v2Bridge()
  fake.state.agents = [
    { id: 'reviewer', name: 'Reviewer', mode: 'primary', hidden: false, permissions: [], model: { id: 'claude-x', providerID: 'anthropic' } },
    { id: 'build', name: 'Build', mode: 'primary', hidden: false, permissions: [] },
    { id: 'plan', name: 'Plan', mode: 'primary', hidden: false, permissions: [] },
    { id: 'explore', name: 'Explore', mode: 'subagent', hidden: false, permissions: [] },
    { id: 'title', name: 'Title', mode: 'primary', hidden: true, permissions: [] },
  ]
  try {
    assert.equal(await bridge.primaryAgent('/w'), 'reviewer', 'OpenCode lists its default first')
    assert.equal(await bridge.primaryAgent('/w', 'build'), 'build')
    assert.equal(await bridge.primaryAgent('/w', 'Build'), 'reviewer', 'a display name is not an agent id')
    assert.equal(await bridge.primaryAgent('/w', 'plan'), 'reviewer')
    const listed = await bridge.agentsList({ cwd: '/w' })
    assert.deepEqual(listed.agents.map((agent) => [agent.name, agent.scope, agent.primary, agent.default]), [
      ['reviewer', 'user', true, true], ['build', 'builtin', true, false], ['plan', 'builtin', true, false], ['explore', 'builtin', false, false],
    ])
    assert.equal(listed.agents[0].model, 'anthropic/claude-x')
    assert.equal(listed.defaultAgent, 'reviewer')
    const asked = fake.state.requests.find((request) => request.path === '/api/agent')
    assert.equal(decodeURIComponent(asked.headers['x-opencode-directory']), '/w')
  } finally { await bridge.stop() }
})
