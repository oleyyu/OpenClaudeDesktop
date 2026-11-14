// OpenCode / MiMo bridge: the paged global session list (thread/list, search, usage), images the agent viewed
// (imageView), and MiMo's task list as the plan after a resume.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { taskPlanOf, toolItem } from '../packages/opencode-bridge/src/projection.js'
import { Bridge, LiveThread } from '../packages/opencode-bridge/src/index.js'

const made = []
const tmp = () => { const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-paging-'))); made.push(dir); return dir }
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

function bridgeFor(flavor = 'opencode', api = async () => { throw new Error('no server') }) {
  const home = tmp()
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const notes = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const calls = []
  bridge.api = async (method, route, options = {}) => { calls.push({ method, route, ...options }); return api(method, route, options) }
  return { bridge, notes, calls }
}

/** OpenCode's GET /experimental/session (handlers/experimental.ts + Session.listGlobal), with its x-next-cursor header. */
function experimentalSession(all, query) {
  const limit = Number(query.limit ?? 100)
  const rows = all
    .filter((info) => !query.roots || !info.parentID)
    .filter((info) => !query.cursor || info.time.updated < Number(query.cursor))
    .filter((info) => !query.search || info.title.toLowerCase().includes(String(query.search).toLowerCase()))
    .filter((info) => query.archived || !info.time.archived)
    .sort((a, b) => b.time.updated - a.time.updated || (a.id < b.id ? 1 : -1))
    .slice(0, limit + 1)
  const list = rows.length > limit ? rows.slice(0, limit) : rows
  const headers = new Headers(rows.length > limit && list.length ? { 'x-next-cursor': String(list.at(-1).time.updated) } : {})
  return { body: list, headers }
}

// 1,500 root sessions (the oldest archived), each with a sub-agent task session: 3,000 in all.
function heavyUser() {
  const sessions = []
  for (let i = 0; i < 1500; i++) {
    const updated = 1_000_000 + i * 10
    sessions.push({ id: `ses_r${String(i).padStart(4, '0')}`, title: `Root ${i}`, directory: '/w', time: { created: updated - 5, updated, ...(i < 20 ? { archived: updated } : {}) } })
    sessions.push({ id: `ses_c${String(i).padStart(4, '0')}`, title: `Child ${i}`, parentID: `ses_r${String(i).padStart(4, '0')}`, directory: '/w', time: { created: updated - 4, updated: updated + 1 } })
  }
  return sessions
}

test('thread/list pages through OpenCode\'s cursor: every root session is reachable, sub-agent sessions are left out on the server', async () => {
  const sessions = heavyUser()
  const { bridge, calls } = bridgeFor('opencode', async (method, route, options) => {
    if (method === 'GET' && route === '/experimental/session') return experimentalSession(sessions, options.query)
    throw new Error(`unexpected ${method} ${route}`)
  })
  const seen = []
  let cursor = null
  let pages = 0
  do {
    const page = await bridge.listThreads({ limit: 50, ...(cursor ? { cursor } : {}) })
    assert.ok(page.data.length <= 50)
    seen.push(...page.data.map((thread) => thread.id))
    cursor = page.nextCursor
    pages++
  } while (cursor && pages < 100)
  assert.equal(new Set(seen).size, seen.length, 'no session is listed twice')
  assert.equal(seen.length, 1480, 'every active root session, the oldest included')
  assert.ok(seen.includes('ses_r0020'))
  assert.ok(calls.every((call) => call.query.roots === 'true' && call.query.archived === 'true'))

  const archived = await bridge.listThreads({ archived: true, limit: 100 })
  assert.equal(archived.data.length, 20, 'archived sessions beyond the newest 1,000 reach Archived')
  assert.equal(archived.nextCursor, null)

  const found = await bridge.listThreads({ searchTerm: 'root 25', limit: 50 })
  assert.deepEqual(found.data.map((thread) => thread.name).sort(), ['Root 25', ...Array.from({ length: 10 }, (_, i) => `Root 25${i}`)].sort())

  const children = await bridge.listThreads({ sourceKinds: ['subAgentThreadSpawn'], limit: 2000 })
  assert.equal(children.data.length, 1500)
  assert.ok(children.data.every((thread) => thread.parentThreadId))
})

test('a page that stops part-way keeps the sessions sharing its last update time together', async () => {
  const sessions = [5, 4, 4, 4, 3, 2].map((updated, i) => ({ id: `ses_${i}`, title: `S${i}`, directory: '/w', time: { created: 1, updated } }))
  const { bridge } = bridgeFor('opencode', async (method, route, options) => experimentalSession(sessions, options.query))
  const first = await bridge.listThreads({ limit: 2 })
  assert.deepEqual(first.data.map((thread) => thread.id).sort(), ['ses_0', 'ses_1', 'ses_2', 'ses_3'])
  const second = await bridge.listThreads({ limit: 2, cursor: first.nextCursor })
  assert.deepEqual(second.data.map((thread) => thread.id), ['ses_4', 'ses_5'])
  assert.equal(second.nextCursor, null)
})

test('oldest-first and created-at listings read the whole list and page by offset', async () => {
  const sessions = heavyUser()
  const { bridge } = bridgeFor('opencode', async (method, route, options) => experimentalSession(sessions, options.query))
  const first = await bridge.listThreads({ limit: 10, sortDirection: 'asc' })
  assert.equal(first.data[0].name, 'Root 20')
  assert.equal(first.nextCursor, '10')
  const second = await bridge.listThreads({ limit: 10, sortDirection: 'asc', cursor: first.nextCursor })
  assert.equal(second.data[0].name, 'Root 30')
  const created = await bridge.listThreads({ limit: 5, sortKey: 'created_at' })
  assert.equal(created.data[0].name, 'Root 1499')
})

test('a core whose answers carry no cursor header still lists, and usage folds every session of every page', async () => {
  const sessions = heavyUser()
  const { bridge, calls } = bridgeFor('opencode', async (method, route, options) => {
    if (route === '/experimental/session') return experimentalSession(sessions, options.query)
    if (route.endsWith('/message')) return []
    throw new Error(`unexpected ${route}`)
  })
  const folds = await bridge.usageFolds()
  assert.equal(folds.length, 3000)
  const before = calls.filter((call) => call.route.endsWith('/message')).length
  await bridge.usageFolds()
  assert.equal(calls.filter((call) => call.route.endsWith('/message')).length, before, 'unchanged sessions come from the fold cache')

  const plain = bridgeFor('opencode', async () => [{ id: 'ses_only', title: 'Only', directory: '/w', time: { created: 1, updated: 2 } }])
  assert.deepEqual((await plain.bridge.listThreads({})).data.map((thread) => thread.name), ['Only'])
})

// ------------------------------------------------------------------ images

test('an image the agent viewed is an imageView once it completed; PDFs, text and running reads stay read rows', () => {
  const context = { threadId: 'ses_i', cwd: '/w' }
  const part = (tool, state) => ({ id: 'prt_1', callID: 'call_1', tool, type: 'tool', state })
  const png = [{ type: 'file', mime: 'image/png', url: 'data:image/png;base64,AAAA' }]
  assert.deepEqual(toolItem(part('view_image', { status: 'completed', input: { path: 'shot.png' }, output: 'Image viewed successfully (high detail)', attachments: png }), context), { type: 'imageView', id: 'prt_1', path: '/w/shot.png', status: 'completed' })
  assert.equal(toolItem(part('read', { status: 'completed', input: { filePath: '/w/mock.jpg' }, output: 'Image read successfully', attachments: [{ ...png[0], mime: 'image/jpeg' }] }), context).type, 'imageView')
  // Attachments left out of the history: the success line on an image file.
  assert.equal(toolItem(part('read', { status: 'completed', input: { filePath: '/w/mock.webp' }, output: 'Image read successfully' }), context).type, 'imageView')
  const pdf = toolItem(part('read', { status: 'completed', input: { filePath: '/w/spec.pdf' }, output: 'PDF read successfully', attachments: [{ type: 'file', mime: 'application/pdf', url: 'data:application/pdf;base64,AAAA' }] }), context)
  assert.equal(pdf.type, 'commandExecution')
  assert.equal(pdf.commandActions[0].name, 'spec.pdf')
  assert.equal(toolItem(part('view_image', { status: 'running', input: { path: '/w/shot.png' } }), context).type, 'commandExecution', 'running: a read row an approval can point at')
  assert.equal(toolItem(part('view_image', { status: 'error', input: { path: '/w/missing.png' }, error: 'unable to locate image' }), context).type, 'commandExecution')
  assert.equal(toolItem(part('read', { status: 'completed', input: { filePath: '/w/a.txt' }, output: '1: hi' }), context).type, 'commandExecution')
})

test('live: a view_image call starts as a read row and completes as the Viewed image card', async () => {
  const { bridge, notes } = bridgeFor('mimo')
  const thread = new LiveThread(bridge, { info: { id: 'ses_live', directory: '/w' } })
  thread.emit = (method, params) => notes.push({ method, params })
  thread.emitItem('turn_1', toolItem({ id: 'prt_v', tool: 'view_image', type: 'tool', state: { status: 'running', input: { path: '/w/a.png' } } }, { threadId: 'ses_live', cwd: '/w' }), { done: false })
  thread.emitItem('turn_1', toolItem({ id: 'prt_v', tool: 'view_image', type: 'tool', state: { status: 'completed', input: { path: '/w/a.png' }, output: 'Image viewed successfully (high detail)', attachments: [{ mime: 'image/png', url: 'data:image/png;base64,AA' }] } }, { threadId: 'ses_live', cwd: '/w' }), { done: true })
  assert.deepEqual(notes.map((note) => [note.method, note.params.item.type]), [['item/started', 'commandExecution'], ['item/completed', 'imageView']])
  assert.equal(notes[1].params.item.status, 'completed')
})

// ------------------------------------------------------------------ MiMo tasks

test('MiMo tasks: abandoned ones say so, blocked ones stay pending and say so', () => {
  assert.deepEqual(taskPlanOf([
    { id: 'T1', status: 'done', summary: 'Read the code' },
    { id: 'T2', status: 'in_progress', summary: 'Fix the bug' },
    { id: 'T2.1', status: 'blocked', summary: 'Wait for CI' },
    { id: 'T3', status: 'abandoned', summary: 'Rewrite it' },
    { id: 'T4', status: 'open', summary: 'Ship' },
    { id: 'T5', status: 'open' },
  ]), [
    { step: 'T1 Read the code', status: 'completed' },
    { step: 'T2 Fix the bug', status: 'inProgress' },
    { step: 'T2.1 Wait for CI', status: 'pending', codeDesktop: { state: 'blocked' } },
    { step: 'T3 Rewrite it', status: 'completed', codeDesktop: { state: 'abandoned' } },
    { step: 'T4 Ship', status: 'pending' },
  ])
})

test('MiMo: a resumed session asks MiMo for its task list and replays it as the plan', async () => {
  const tasks = [{ id: 'T1', status: 'done', summary: 'Plan' }, { id: 'T2', status: 'in_progress', summary: 'Build' }]
  const { bridge, calls } = bridgeFor('mimo', async (method, route) => (route === '/session/ses_m/task' ? tasks : []))
  const thread = new LiveThread(bridge, { info: { id: 'ses_m', directory: '/w' } })
  thread.projector.load([])
  const notes = []
  thread.emit = (method, params) => notes.push({ method, params })
  thread.replay()
  await new Promise((resolve) => setImmediate(resolve))
  assert.ok(calls.some((call) => call.route === '/session/ses_m/task'))
  assert.deepEqual(notes.find((note) => note.method === 'turn/plan/updated')?.params.plan, [{ step: 'T1 Plan', status: 'completed' }, { step: 'T2 Build', status: 'inProgress' }])

  // OpenCode keeps its plan in todowrite parts: no task request.
  const open = bridgeFor('opencode', async () => [])
  const other = new LiveThread(open.bridge, { info: { id: 'ses_o', directory: '/w' } })
  other.projector.load([])
  other.emit = () => {}
  other.replay()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(open.calls.length, 0)
})

test('OpenCode share link: POST / DELETE /session/:id/share, the link on the thread; MiMo has none', async () => {
  const { bridge, calls } = bridgeFor('opencode', async (method, route) => (method === 'POST'
    ? { id: 'ses_1', share: { url: 'https://opncd.ai/s/abc' }, time: { created: 1 } }
    : { id: 'ses_1', time: { created: 1 } }))
  assert.deepEqual(await bridge.shareThread({ threadId: 'ses_1', enabled: true }), { threadId: 'ses_1', shareUrl: 'https://opncd.ai/s/abc' })
  assert.deepEqual(await bridge.shareThread({ threadId: 'ses_1', enabled: false }), { threadId: 'ses_1', shareUrl: null })
  assert.deepEqual(calls.map((call) => [call.method, call.route]), [['POST', '/session/ses_1/share'], ['DELETE', '/session/ses_1/share']])
  const cold = bridge.coldThread({ id: 'ses_1', share: { url: 'https://opncd.ai/s/abc' }, time: { created: 1 }, title: 'x' })
  assert.equal(cold.codeDesktop.shareUrl, 'https://opncd.ai/s/abc')
  const mimo = bridgeFor('mimo').bridge
  await assert.rejects(mimo.shareThread({ threadId: 'ses_1', enabled: true }), /no share links/)
})
