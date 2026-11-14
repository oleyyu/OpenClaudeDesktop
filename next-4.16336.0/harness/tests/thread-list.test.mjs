import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CacheRevisions, LIST_PROJECTION_KEYS, applySessionListMetadata, cachedValues, coldRow, descendantIds, matchesSearch, mustStayLoaded,
  ownsRunningJob, readColdThread, registerListProjection, seedable, sessionListMetadataProjection, titleOf,
} from '../packages/codex-app-server/src/list.js'
import { isThreadNotFound } from '../packages/codex-app-server/src/errors.js'

const header = { id: 's1', createdAt: 1000, cwd: '/w' }

test('titleOf reads SessionTitleSnapshot.title from a fulfilled observation only', () => {
  assert.equal(titleOf({ status: 'fulfilled', value: { title: { title: 'Fix request' } } }), 'Fix request')
  assert.equal(titleOf({ sessionId: 's', status: 'fulfilled', value: { session: header } }), undefined)
  assert.equal(titleOf({ sessionId: 's', status: 'rejected', reason: new Error('x') }), undefined)
  assert.equal(titleOf(undefined), undefined)
})

test('coldRow: recency is max(createdAt, cached or stored lastPromptAt); names prefer the store, then the cache', () => {
  const cached = coldRow(header, { cacheValues: { title: 'Fix request', sessionListMetadata: { blank: false, lastPromptAt: 5000 } } })
  assert.equal(cached.updatedAtMs, 5000)
  assert.equal(cached.name, 'Fix request')
  assert.equal(cached.preview, 'Fix request')
  assert.equal(cached.blank, false)
  assert.equal(cached.titleKnown, true)
  assert.equal(cached.recencyKnown, true)
  // No prompt yet, a prompt before creation (a fork's copied history), the store's turn/start record.
  assert.equal(coldRow(header, { cacheValues: { sessionListMetadata: { blank: false, lastPromptAt: null } } }).updatedAtMs, 1000)
  assert.equal(coldRow(header, { cacheValues: { sessionListMetadata: { blank: false, lastPromptAt: 400 } } }).updatedAtMs, 1000)
  const stored = coldRow(header, { meta: { lastPromptAt: 7000 }, cacheValues: { title: null, sessionListMetadata: { blank: false, lastPromptAt: 5000 } } })
  assert.equal(stored.updatedAtMs, 7000)
  assert.equal(stored.name, null)
  assert.equal(stored.preview, '')
  assert.equal(stored.titleKnown, true)
  assert.equal(coldRow(header, { meta: { name: 'Mine' }, cacheValues: { title: 'Cached' } }).name, 'Mine')
  assert.equal(coldRow(header, { title: 'Snapshot' }).name, 'Snapshot')
  // A miss: nothing known, recency falls back to creation.
  const miss = coldRow(header)
  assert.deepEqual([miss.name, miss.updatedAtMs, miss.blank, miss.titleKnown, miss.recencyKnown], [null, 1000, false, false, false])
})

test('a blank cache row is flagged unless the store names it', () => {
  const values = { title: null, sessionListMetadata: { blank: true, lastPromptAt: null } }
  assert.equal(coldRow(header, { cacheValues: values }).blank, true)
  assert.equal(coldRow(header, { meta: { name: 'Kept' }, cacheValues: values }).blank, false)
  assert.equal(coldRow(header, { cacheValues: { title: 'T' } }).blank, false)
})

test('matchesSearch is a case-insensitive substring of name, preview and cwd', () => {
  const row = { name: 'Remove device restrictions', preview: 'first prompt', cwd: '/Users/me/WaygroundEscaper' }
  assert.equal(matchesSearch(row, 'DEVICE'), true)
  assert.equal(matchesSearch(row, 'waygroundescaper'), true)
  assert.equal(matchesSearch(row, 'First'), true)
  assert.equal(matchesSearch(row, 'missing'), false)
  assert.equal(matchesSearch({ name: null, preview: '', cwd: '/w' }, 'x'), false)
  for (const term of [undefined, null, '', '   ']) assert.equal(matchesSearch(row, term), true)
  assert.equal(matchesSearch({ name: '取消WGE Admin Panel登录IP限制', cwd: '/w' }, 'admin panel'), true)
})

test('the sessionListMetadata unit folds like upstream and keeps references for other events', () => {
  const def = sessionListMetadataProjection
  assert.equal(def.key, 'sessionListMetadata')
  assert.equal(def.stateVersion, 1)
  const initial = def.init(header, 0)
  assert.deepEqual(initial, { blank: true, lastPromptAt: null })
  assert.equal(applySessionListMetadata(initial, { type: 'permission/preset', time: 5, data: {} }), initial)
  assert.equal(applySessionListMetadata(initial, { type: 'user/message', time: 6, data: { source: { kind: 'time-context' } } }), initial)
  const started = applySessionListMetadata(initial, { type: 'turn/start', time: 7, data: { turn: 1 } })
  assert.deepEqual(started, { blank: false, lastPromptAt: null })
  const prompted = applySessionListMetadata(started, { type: 'user/message', time: 8, data: { source: { kind: 'user' } } })
  assert.deepEqual(prompted, { blank: false, lastPromptAt: 8 })
  assert.equal(applySessionListMetadata(prompted, { type: 'assistant/message', time: 9, data: {} }), prompted)
  assert.deepEqual(def.stateSchema.parse(prompted), prompted)
  assert.equal(def.wire.view(prompted), prompted)
  assert.throws(() => def.stateSchema.parse({ blank: 'no', lastPromptAt: null }))
})

test('registerListProjection registers once, reports a refused registration and tolerates no registry', () => {
  const seen = []
  const dispose = registerListProjection({ register: (definition) => { seen.push(definition); return () => {} } })
  assert.equal(typeof dispose, 'function')
  assert.equal(seen[0], sessionListMetadataProjection)
  const warnings = []
  const refused = registerListProjection({ register: () => { throw new Error('already registered at stateVersion 2') } }, (error) => warnings.push(error.message))
  assert.equal(refused, undefined)
  assert.deepEqual(warnings, ['already registered at stateVersion 2'])
  assert.equal(registerListProjection(undefined), undefined)
})

test('cachedValues asks for the list keys, falls back to a predecessor title, and treats failures as a miss', () => {
  const calls = []
  const cache = {
    cachedSnapshot: (meta, keys) => { calls.push([meta.id, keys]); return { asOfSeq: 9, values: { title: 'T' } } },
  }
  assert.deepEqual(cachedValues(cache, header), { title: 'T' })
  assert.deepEqual(calls, [['s1', LIST_PROJECTION_KEYS]])
  assert.deepEqual(cachedValues({ cachedSnapshot: () => undefined, cachedPredecessorTitle: () => ({ asOfSeq: 3, values: { title: 'Old' } }) }, header), { title: 'Old' })
  assert.equal(cachedValues({ cachedSnapshot: () => { throw new Error('table not open') } }, header), undefined)
  assert.equal(cachedValues(undefined, header), undefined)
})

test('readColdThread serves name and recency from the cache with one stat and no log read', async () => {
  const stats = []
  const cache = { cachedSnapshot: () => ({ asOfSeq: 12, values: { title: 'T', sessionListMetadata: { lastPromptAt: 5000, blank: false } } }) }
  const read = await readColdThread('s1', { stat: async (id) => { stats.push(id); return { header, revision: 'r' } }, cache, meta: {} })
  assert.deepEqual(stats, ['s1'])
  assert.equal(read.header, header)
  assert.equal(read.revision, 'r')
  assert.equal(read.cold.name, 'T')
  assert.equal(Math.floor(read.cold.updatedAtMs / 1000), 5)
  // The store's own record is enough when the cache lags.
  const stored = await readColdThread('s1', { stat: async () => ({ header }), cache: { cachedSnapshot: () => undefined }, meta: { name: 'Named', lastPromptAt: 9000 } })
  assert.deepEqual([stored.cold.name, stored.cold.updatedAtMs], ['Named', 9000])
})

test('readColdThread replays a log that moved since the cache table last reflected it', async () => {
  const cache = { cachedSnapshot: () => ({ asOfSeq: 12, values: { title: 'Old title', sessionListMetadata: { lastPromptAt: 5000, blank: false } } }) }
  const revisions = new CacheRevisions()
  // The listing taken when the cache started: r1 is what the table reflects.
  revisions.start([{ header: { id: 's1' }, revision: 'r1' }, { header: { id: 's2' } }, null])
  const at = (revision) => readColdThread('s1', { stat: async () => ({ header, revision }), cache, revisions })
  assert.equal((await at('r1')).cold.name, 'Old title')
  // The DeepSeek app appended since: the row may be stale, so no cold row; the revision comes back for the seed.
  const moved = await at('r2')
  assert.deepEqual([moved.cold, moved.revision, moved.header], [undefined, 'r2', header])
  revisions.record('s1', 'r2')
  assert.ok((await at('r2')).cold)
  // A later start listing never overrides a recorded revision; an unknown id or revision is not current.
  revisions.start([{ header: { id: 's1' }, revision: 'r0' }])
  assert.equal(revisions.current('s1', 'r2'), true)
  assert.equal(revisions.current('s2', undefined), false)
  assert.equal(revisions.current('s3', 'r1'), false)
  revisions.record('s1', undefined)
  assert.equal(revisions.current('s1', 'r2'), false)
})

test('seedable refuses a log a cold read closed in memory', () => {
  const turn = [{ type: 'turn/start', seq: 1, data: { turn: 1 } }, { type: 'user/message', seq: 2, data: { source: { kind: 'user' } } }]
  assert.equal(seedable([...turn, { type: 'turn/end', seq: 3, data: { turn: 1, reason: { kind: 'completed' } } }]), true)
  assert.equal(seedable([...turn, { type: 'turn/end', seq: 3, data: { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } } }]), true)
  // readSession's interruptedTurnClosers for a turn still running in another process.
  assert.equal(seedable([...turn, { type: 'turn/end', seq: 3, data: { turn: 1, reason: { kind: 'interrupted' } } }]), false)
  // A raw log (no query service) ending mid-turn holds only durable events.
  assert.equal(seedable(turn), true)
  assert.equal(seedable([]), true)
})

test('readColdThread: a missing session is threadNotFound; an unknown name, recency or sub-agent label means a replay', async () => {
  await assert.rejects(readColdThread('gone', { stat: async () => undefined }), (error) => isThreadNotFound(error) && error.data.threadId === 'gone')
  const titleOnly = { cachedSnapshot: () => ({ asOfSeq: 1, values: { title: 'Old session' } }) }
  const replay = await readColdThread('s1', { stat: async () => ({ header, revision: 'r' }), cache: titleOnly })
  assert.deepEqual(replay, { header, revision: 'r', cold: undefined })
  const recencyOnly = { cachedSnapshot: () => ({ asOfSeq: 1, values: { sessionListMetadata: { blank: false, lastPromptAt: 5 } } }) }
  assert.equal((await readColdThread('s1', { stat: async () => ({ header }), cache: recencyOnly })).cold, undefined)
  const full = { cachedSnapshot: () => ({ asOfSeq: 1, values: { title: null, sessionListMetadata: { blank: false, lastPromptAt: 5 } } }) }
  const child = { ...header, origin: 'subagent', parentSession: 'p' }
  assert.equal((await readColdThread('s1', { stat: async () => ({ header: child }), cache: full })).cold, undefined)
  assert.ok((await readColdThread('s1', { stat: async () => ({ header: child }), cache: full, meta: { agentLabel: 'Say hello' } })).cold)
})

test('mustStayLoaded keeps any thread with work in flight', () => {
  assert.equal(mustStayLoaded({}), false)
  for (const busy of [{ running: true }, { activeTurn: true }, { pendingRequests: 1 }, { queued: 2 }, { compacting: true }, { runningChildren: true }, { jobsRunning: true }])
    assert.equal(mustStayLoaded(busy), true, JSON.stringify(busy))
})

test('ownsRunningJob: a running or stopping job of one of the owners; unowned, settled and foreign jobs do not count', () => {
  const jobs = (views) => ({ list: (caller) => views.filter((job) => job.owner === caller || job.owner === undefined) })
  assert.equal(ownsRunningJob(jobs([{ id: 'bash-1', owner: 'root', status: 'running' }]), ['root']), true)
  assert.equal(ownsRunningJob(jobs([{ id: 'bash-1', owner: 'child', status: 'stopping' }]), ['root', 'child']), true)
  for (const status of ['completed', 'killed', 'failed']) assert.equal(ownsRunningJob(jobs([{ id: 'bash-1', owner: 'root', status }]), ['root']), false, status)
  // An unowned job is listed for every caller but belongs to nobody.
  assert.equal(ownsRunningJob(jobs([{ id: 'bash-2', status: 'running' }]), ['root']), false)
  assert.equal(ownsRunningJob(jobs([{ id: 'bash-3', owner: 'other', status: 'running' }]), ['root']), false)
  assert.equal(ownsRunningJob({ list: () => { throw new Error('foreign') } }, ['root']), false)
  assert.equal(ownsRunningJob(undefined, ['root']), false)
})

test('descendantIds follows sub-agent lineage at any depth and skips forks and loops', () => {
  const agent = (id, header = {}) => ({ session: { id, header } })
  const agents = [
    agent('root'),
    agent('child', { origin: 'subagent', parentSession: 'root' }),
    agent('grandchild', { origin: 'subagent', parentSession: 'child' }),
    agent('fork', { parentSession: 'root' }),
    agent('other', { origin: 'subagent', parentSession: 'elsewhere' }),
    agent('loop-a', { origin: 'subagent', parentSession: 'loop-b' }),
    agent('loop-b', { origin: 'subagent', parentSession: 'loop-a' }),
  ]
  assert.deepEqual(descendantIds(agents, 'root'), ['child', 'grandchild'])
  assert.deepEqual(descendantIds(agents, 'loop-a'), ['loop-b'])
  assert.deepEqual(descendantIds(undefined, 'root'), [])
})
