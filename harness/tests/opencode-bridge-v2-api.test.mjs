// OpenCode 2.x bridge, phase 1: V2Api (src/v2/api.js) — unwrapping v2's bodies, locations (header / deepObject
// query), the plugin 503 retry, _tag errors, cursor paging that ends at a short page, and the route contract
// (fixtures/v2/openapi-routes.json); plus the v2 fake's session list semantics the later phases rely on.
import test from 'node:test'
import assert from 'node:assert/strict'
import { FLAVORS, withApi } from '../packages/opencode-bridge/src/flavor.js'
import { AgentServerV2 } from '../packages/opencode-bridge/src/v2/server.js'
import { V2Api, pluginUnavailable, unwrap } from '../packages/opencode-bridge/src/v2/api.js'
import { createV2Fake } from './fixtures/v2-fake.mjs'
import { contractViolations, matchRoute } from './fixtures/v2-contract.mjs'

/** A V2Api on a started-looking server whose fetch is the fake (no process). */
function apiWith(fake = createV2Fake(), options = {}) {
  const server = new AgentServerV2({ flavor: withApi(FLAVORS.opencode, 'v2'), binary: '/opt/opencode', fetch: fake.fetch })
  server.url = 'http://127.0.0.1:4096'
  server.child = { exitCode: null }
  fake.state.password = server.password
  const sleeps = []
  const api = new V2Api(server, { sleep: async (ms) => { sleeps.push(ms) }, ...options })
  return { api, fake, server, sleeps }
}

test('unwrap: {data}, {data, cursor}, {location, data}, bare objects and arrays, 204', () => {
  assert.deepEqual(unwrap({ data: { id: 'ses_1' } }), { id: 'ses_1' })
  assert.deepEqual(unwrap({ data: [1, 2], cursor: { next: 'x' } }), [1, 2])
  assert.deepEqual(unwrap({ location: { directory: '/a' }, data: [{ id: 'build' }] }), [{ id: 'build' }])
  assert.deepEqual(unwrap({ version: '2.2.5', pid: 1, urls: [], paths: { tmp: '/t' } }), { version: '2.2.5', pid: 1, urls: [], paths: { tmp: '/t' } })
  assert.deepEqual(unwrap({ interrupted: true }), { interrupted: true })
  assert.deepEqual(unwrap([{ path: 'a' }]), [{ path: 'a' }])
  assert.equal(unwrap(null), null)
  // An object that merely has a data key among others is a payload, not an envelope.
  assert.deepEqual(unwrap({ data: 1, other: 2 }), { data: 1, other: 2 })
})

test('location routes: x-opencode-directory (encodeURIComponent) or ?location[directory]=, and the {location, data} body unwrapped', async () => {
  const { api, fake } = apiWith()
  assert.deepEqual(await api.get('/api/agent', { location: '/Users/me/a b' }), [{ id: 'build', name: 'Build', mode: 'primary' }])
  assert.equal(fake.state.requests.at(-1).headers['x-opencode-directory'], encodeURIComponent('/Users/me/a b'))
  const raw = await api.get('/api/agent', { location: '/Users/me/ü', locationIn: 'query', raw: true })
  assert.equal(raw.location.directory, '/Users/me/ü')
  assert.equal(new URL(fake.state.requests.at(-1).url).searchParams.get('location[directory]'), '/Users/me/ü')
  assert.equal(fake.state.requests.at(-1).headers['x-opencode-directory'], undefined)
  assert.deepEqual(fake.state.violations, [])
})

test('503 ServiceUnavailableError{service:"plugin"} is retried after 250 ms, 500 ms, 1 s, 2 s; other errors are not', async () => {
  const { api, fake, sleeps } = apiWith()
  fake.state.pluginFailures = 2
  assert.equal((await api.get('/api/agent', { location: '/a' }))[0].id, 'build')
  assert.deepEqual(sleeps, [250, 500])
  fake.state.pluginFailures = 9
  const error = await api.get('/api/agent', { location: '/a' }).catch((failure) => failure)
  assert.equal(error.status, 503)
  assert.equal(error._tag, 'ServiceUnavailableError')
  assert.ok(pluginUnavailable(error))
  assert.deepEqual(sleeps, [250, 500, 250, 500, 1000, 2000])
  const missing = await api.session('ses_nope').catch((failure) => failure)
  assert.equal(missing._tag, 'SessionNotFoundError')
  assert.equal(sleeps.length, 6, 'a 404 is not retried')
  assert.equal(pluginUnavailable({ status: 503, _tag: 'ServiceUnavailableError', body: { service: 'location' } }), false)
})

test('paging: the first page carries the filters, later ones only cursor + limit; the end is a page shorter than the limit', async () => {
  const { api, fake } = apiWith()
  for (let index = 0; index < 5; index++) fake.makeSession({ title: `root ${index}`, location: { directory: '/p' } })
  const parent = fake.makeSession({ title: 'parent', location: { directory: '/p' } })
  fake.makeSession({ parentID: parent.id, title: 'child' })
  fake.makeSession({ title: 'old', location: { directory: '/p' }, archived: true })
  const roots = await api.sessions({ parentID: null, limit: 2 })
  assert.deepEqual(roots.map((info) => info.title), ['old', 'parent', 'root 4', 'root 3', 'root 2', 'root 1', 'root 0'], 'newest first, archived included, no children')
  const lists = fake.state.requests.filter((entry) => entry.path === '/api/session')
  assert.equal(lists.length, 4, '2 + 2 + 2 + 1: the short page ends it')
  const first = new URL(lists[0].url).searchParams
  assert.equal(first.get('parentID'), 'null')
  assert.equal(first.get('limit'), '2')
  assert.equal(first.has('archived'), false, 'archived is three-state: left out to get both')
  for (const later of lists.slice(1)) assert.deepEqual([...new URL(later.url).searchParams.keys()].sort(), ['cursor', 'limit'])
  // Exactly a multiple of the limit: one more (empty) page.
  fake.state.requests.length = 0
  assert.equal((await api.sessions({ directory: '/p', parentID: null, limit: 7 })).length, 7)
  assert.equal(fake.state.requests.filter((entry) => entry.path === '/api/session').length, 2)
  assert.equal((await api.sessions({ parentID: parent.id })).map((info) => info.title).join(), 'child')
  assert.deepEqual(fake.state.violations, [])
})

test('the fake lists sessions like v2: archived three-state, a cursor keeps its filters, cursor.next on every non-empty page', async () => {
  const { api, fake } = apiWith()
  fake.makeSession({ title: 'a' })
  fake.makeSession({ title: 'b', archived: true })
  assert.deepEqual((await api.sessions({ archived: true })).map((info) => info.title), ['b'])
  assert.deepEqual((await api.sessions({ archived: false })).map((info) => info.title), ['a'])
  const page = await api.request('GET', '/api/session', { query: { limit: 1, archived: 'false' }, raw: true })
  assert.ok(page.cursor.next)
  // Filters sent with a cursor are ignored: the cursor's own (archived=false) apply.
  const next = await api.request('GET', '/api/session', { query: { cursor: page.cursor.next, limit: 1, archived: 'true' }, raw: true })
  assert.deepEqual(next.data, [])
  assert.deepEqual(next.cursor, {}, 'an empty page has no cursor')
})

test('the fake searches titles like v2’s SQL LIKE: case-insensitive for ASCII only, % and _ as wildcards', async () => {
  const { api, fake } = apiWith()
  for (const title of ['Fix the Parser', 'ÄRGER', 'a_b', 'axb']) fake.makeSession({ title })
  const search = async (term) => (await api.request('GET', '/api/session', { query: { search: term } })).map((info) => info.title).sort()
  assert.deepEqual(await search('PARSER'), ['Fix the Parser'])
  assert.deepEqual(await search('ärger'), [], 'non-ASCII letters keep their case')
  assert.deepEqual(await search('a_b'), ['a_b', 'axb'])
  assert.deepEqual(fake.state.violations, [])
})

test('create, active, interrupt and credentials speak the contract', async () => {
  const { api, fake } = apiWith()
  const info = await api.createSession({ directory: '/Users/me/p', title: 'T', agent: 'build', permissions: [{ action: '*', resource: '*', effect: 'ask' }] })
  assert.equal(info.location.directory, '/Users/me/p')
  assert.deepEqual(fake.state.requests.at(-1).body, { title: 'T', agent: 'build', permissions: [{ action: '*', resource: '*', effect: 'ask' }], location: { directory: '/Users/me/p' } })
  fake.state.active.add(info.id)
  assert.deepEqual(await api.active(), { [info.id]: { type: 'running' } })
  assert.equal(await api.interrupt(info.id), true)
  assert.equal(new URL(fake.state.requests.at(-1).url).search, '?resume=false')
  assert.equal(await api.interrupt(info.id), false)
  const entry = await api.createCredential({ integrationID: 'anthropic', label: 'API key', value: { type: 'key', key: 'sk-1' } })
  assert.equal(entry.active, true)
  assert.deepEqual((await api.credentials()).map((item) => item.integrationID), ['anthropic'])
  assert.deepEqual(fake.state.violations, [])
  // The fake refuses what the contract does not have, as v2's schema decoding does.
  const bad = await api.post('/api/session', { location: { directory: '/a' }, parts: [] }).catch((failure) => failure)
  assert.equal(bad.status, 400)
  assert.equal(bad._tag, 'InvalidRequestError')
  assert.match(fake.state.violations.join(), /body key parts is not in the schema/)
})

test('the contract helper: routes, path parameters, literal segments first, body keys, ?types=', () => {
  assert.deepEqual(matchRoute('GET', '/api/session/active'), { key: 'GET /api/session/active', params: {} })
  assert.deepEqual(matchRoute('GET', '/api/session/ses_1'), { key: 'GET /api/session/{sessionID}', params: { sessionID: 'ses_1' } })
  assert.equal(matchRoute('GET', '/session/ses_1'), null, 'no 1.x route exists in v2')
  assert.equal(matchRoute('GET', '/global/health'), null)
  assert.deepEqual(contractViolations('GET', 'http://x/api/event?types=session.created', undefined), ['GET /api/event: never send ?types='])
  assert.deepEqual(contractViolations('POST', 'http://x/api/credential', { value: {} }), ['POST /api/credential: body key integrationID is required'])
  assert.deepEqual(contractViolations('POST', 'http://x/api/session/ses_1/permission/per_1/reply', { reply: 'once' }), [
    'POST /api/session/{sessionID}/permission/{requestID}/reply: body key reply is not in the schema',
    'POST /api/session/{sessionID}/permission/{requestID}/reply: body key decision is required',
  ])
  assert.deepEqual(contractViolations('GET', 'http://x/api/agent?location[directory]=/a', undefined), [])
})
