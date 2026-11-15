// codeDesktop/thread/import on the OpenCode / MiMo bridge (packages/opencode-bridge/src/thread-import.js, index.js
// importThread) against a fake server that keeps the agent's sync rules (MiMo packages/cli/src/sync/index.ts replay /
// replayAll: skip seqs it has, refuse a gap with "expected N"; session/projectors.ts message.updated / part.updated),
// and the OpenCode 2.x import payload (protocol/src/groups/session.ts session.import, core/src/session/transfer.ts).
// No listen, no spawn.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { FLAVORS } from '../packages/opencode-bridge/src/flavor.js'
import { Bridge, capabilitiesFor } from '../packages/opencode-bridge/src/index.js'
import { AgentHttpError } from '../packages/opencode-bridge/src/server.js'
import { IMPORT_OPENING, REPLAY_PROBE_SEQ, expectedSeq, importMessages, importedFromOf, lowId, replayEvents, replayHistory, v2Identifier, v2ImportPayload, importSessionV2 } from '../packages/opencode-bridge/src/thread-import.js'
import { METHOD_NOT_FOUND, INVALID_PARAMS } from '../packages/opencode-bridge/src/transport.js'

const made = []
test.after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

const CONVERSATION = [
  { role: 'user', text: 'Why does the build fail?', ts: Date.UTC(2026, 9, 1, 10, 0) },
  { role: 'assistant', text: 'The lockfile is stale.\n\n[tool bash: npm ci → exit 1]', ts: Date.UTC(2026, 9, 1, 10, 1) },
  { role: 'user', text: 'Fix it', ts: Date.UTC(2026, 9, 1, 10, 2) },
  { role: 'assistant', text: 'Done: regenerated the lockfile.', ts: Date.UTC(2026, 9, 1, 10, 3) },
]

/**
 * A bridge over a fake agent server. `replay`: 'checked' (gap check, as MiMo / OpenCode 1.x), 'unchecked' (takes any
 * seq), 'missing' (404: no route), 'empty' (answers 200 and stores nothing), 'probe-then-fail' (takes any seq, then
 * refuses the second request). `seq`: the session's sequence row before the import (undefined: none, as without the
 * experimental workspaces flag). `model`: the catalog's default (null: none resolves). `prompt: 'fail'`: the transcript
 * POST is refused. `preexisting`: messages the new session already holds.
 */
function fake(flavor, { replay = 'checked', seq, model = 'xiaomi/mimo-v2', prompt = 'ok', preexisting = [] } = {}) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ocb-import-')))
  made.push(home)
  const cwd = path.join(home, 'w')
  fs.mkdirSync(cwd)
  const bridge = new Bridge({ flavor: FLAVORS[flavor], binary: '', stateDir: path.join(home, 'state'), env: { HOME: home, XDG_DATA_HOME: path.join(home, 'data') }, input: new PassThrough(), output: new PassThrough() })
  const notes = [], calls = []
  bridge.notify = (method, params) => notes.push({ method, params })
  const server = { sessions: new Map(), messages: new Map(), sequence: new Map(), replayed: [] }
  const name = FLAVORS[flavor].name
  bridge.api = async (method, route, options = {}) => {
    calls.push({ method, route, ...options })
    if (method === 'POST' && route === '/session') {
      const id = 'ses_fff0001'
      server.sessions.set(id, { id, directory: cwd, title: 'New session - 2026-11-02T00:00:00.000Z', titleRevision: 0, time: { created: Date.now(), updated: Date.now() } })
      server.messages.set(id, preexisting.map((entry) => structuredClone(entry)))
      if (seq !== undefined) server.sequence.set(id, seq)
      return server.sessions.get(id)
    }
    if (method === 'POST' && route === '/sync/replay') {
      if (replay === 'missing') throw new AgentHttpError(404, `${name}: Not Found`, 'Not Found')
      const events = options.body.events
      assert.equal(options.body.directory, cwd)
      assert.equal(options.directory, cwd)
      // replayAll: one aggregate, contiguous seqs (index.ts:202-221).
      events.forEach((event, index) => assert.equal(event.seq, events[0].seq + index))
      if (replay === 'empty') return { sessionID: events[0].aggregateID }
      if (replay === 'probe-then-fail' && server.replayed.length) throw new AgentHttpError(500, `${name}: database is locked`)
      for (const event of events) {
        const latest = server.sequence.get(event.aggregateID) ?? -1
        if (replay === 'checked') {
          if (event.seq <= latest) continue
          if (event.seq !== latest + 1) throw new AgentHttpError(400, `${name}: Sequence mismatch for aggregate "${event.aggregateID}": expected ${latest + 1}, got ${event.seq}`, { name: 'ReplayValidationError' })
        }
        server.sequence.set(event.aggregateID, event.seq)
        server.replayed.push(event)
        const list = server.messages.get(event.data.sessionID)
        if (event.type === 'message.updated.1') list.push({ info: event.data.info, parts: [] })
        else if (event.type === 'message.part.updated.1') list.find((entry) => entry.info.id === event.data.part.messageID).parts.push(event.data.part)
        else throw new AgentHttpError(400, `${name}: Unknown event type: ${event.type}`)
      }
      return { sessionID: events[0].aggregateID }
    }
    const session = /^\/session\/([^/]+)(\/.*)?$/.exec(route)
    if (session) {
      const [, id, rest = ''] = session
      if (method === 'GET' && rest === '') return server.sessions.get(id) ?? null
      if (method === 'GET' && rest === '/message') return (server.messages.get(id) ?? []).toSorted((a, b) => a.info.time.created - b.info.time.created || (a.info.id < b.info.id ? -1 : 1))
      if (method === 'PATCH' && rest === '') { Object.assign(server.sessions.get(id), { title: options.body.title }); return server.sessions.get(id) }
      if (method === 'DELETE' && rest === '') { server.sessions.delete(id); server.messages.delete(id); server.deleted = [...(server.deleted ?? []), id]; return true }
      const message = /^\/message\/([^/]+)$/.exec(rest)
      if (method === 'DELETE' && message) { server.messages.set(id, server.messages.get(id).filter((entry) => entry.info.id !== message[1])); return true }
      if (method === 'POST' && (rest === '/prompt_async' || rest === '/message')) {
        assert.equal(options.body.noReply, true, 'an import never asks for a reply')
        if (prompt === 'fail') throw new AgentHttpError(500, `${name}: prompt refused`)
        const created = Date.now()
        server.messages.get(id).push({ info: { id: options.body.messageID ?? lowId('msg', 999), sessionID: id, role: 'user', time: { created } }, parts: options.body.parts.map((part, index) => ({ id: lowId('prt', 900 + index), ...part })) })
        return rest === '/message' ? null : undefined
      }
      if (method === 'GET' && rest === '/actors') return []
    }
    if (method === 'GET' && route === '/session/status') return {}
    return {}
  }
  bridge.catalog.defaultId = async () => model
  return { bridge, notes, calls, server, cwd }
}

const turnTexts = (response) => response.thread.turns.flatMap((turn) => turn.items).filter((item) => item.type === 'userMessage' || item.type === 'agentMessage')
  .map((item) => (item.type === 'userMessage' ? `U:${item.content.map((part) => part.text).join('')}` : `A:${item.text}`))

test('initialize advertises threadImport on both flavors', () => {
  for (const flavor of ['opencode', 'mimo']) assert.equal(capabilitiesFor(FLAVORS[flavor]).threadImport, true)
})

for (const flavor of ['mimo', 'opencode']) {
  test(`${flavor}: the conversation is replayed into thread/start's session as real user and assistant messages`, async () => {
    const { bridge, notes, calls, server, cwd } = fake(flavor)
    const response = await bridge.handle('codeDesktop/thread/import', {
      cwd, title: 'Build failure', messages: CONVERSATION, model: 'xiaomi/mimo-v2',
      importedFrom: { source: 'claude-code', sourceId: 'abc', title: 'Build failure', sourcePath: '/x/abc.jsonl', extra: 'dropped' },
    })
    assert.deepEqual(response.import, { mode: 'history', messages: 4 })
    assert.equal(response.thread.id, 'ses_fff0001')
    assert.deepEqual(turnTexts(response), ['U:Why does the build fail?', 'A:The lockfile is stale.\n\n[tool bash: npm ci → exit 1]', 'U:Fix it', 'A:Done: regenerated the lockfile.'])
    // The probe first (refused with the seq the server expects), then the history from that seq, no prompt posted.
    const replays = calls.filter((call) => call.route === '/sync/replay')
    assert.equal(replays.length, 2)
    assert.equal(replays[0].body.events[0].seq, REPLAY_PROBE_SEQ)
    assert.deepEqual(server.replayed.map((event) => event.seq), [0, 1, 2, 3, 4, 5, 6, 7])
    assert.ok(!calls.some((call) => /prompt_async|\/message$/.test(call.route) && call.method === 'POST'))
    // Infos the projector's zod schemas take (MessageV2 User / Assistant).
    const infos = server.replayed.filter((event) => event.type === 'message.updated.1').map((event) => event.data.info)
    assert.deepEqual(infos[0].model, { providerID: 'xiaomi', modelID: 'mimo-v2' })
    assert.equal(typeof infos[0].agent, 'string')
    assert.equal(infos[1].parentID, infos[0].id)
    assert.equal(infos[3].parentID, infos[2].id)
    assert.deepEqual([infos[1].finish, infos[1].time.completed, infos[1].path.cwd, infos[1].tokens.cache.read], ['stop', CONVERSATION[1].ts, cwd, 0])
    // Ids ascend and sort before both id schemes' later ids (v1 after the 2026-08-14 wrap, v2 'g…').
    const ids = infos.map((info) => info.id)
    assert.deepEqual(ids.toSorted(), ids)
    for (const id of ids) { assert.match(id, /^msg_000000[0-9a-f]{6}[0-9A-Za-z]{14}$/); assert.ok(id < 'msg_0019a2b3c4d5e' && id < 'msg_g0000') }
    // Name, provenance, announcement.
    assert.equal(server.sessions.get('ses_fff0001').title, 'Build failure')
    if (flavor === 'mimo') assert.equal(calls.find((call) => call.method === 'PATCH' && call.body?.title).body.expectedRevision, 0)
    assert.deepEqual(bridge.store.get('ses_fff0001').importedFrom, { source: 'claude-code', sourceId: 'abc', title: 'Build failure', sourcePath: '/x/abc.jsonl', importedAt: bridge.store.get('ses_fff0001').importedFrom.importedAt })
    assert.equal(bridge.store.get('ses_fff0001').name, 'Build failure')
    const started = notes.find((note) => note.method === 'thread/started')
    assert.deepEqual([started.params.thread.id, started.params.thread.turns], ['ses_fff0001', []])
  })
}

test('a session whose events were already logged (workspaces flag): the history continues its sequence', async () => {
  const { bridge, server, cwd } = fake('opencode', { seq: 2 })
  const response = await bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION })
  assert.equal(response.import.mode, 'history')
  assert.deepEqual(server.replayed.map((event) => event.seq), [3, 4, 5, 6, 7, 8, 9, 10])
  assert.equal(turnTexts(response).length, 4)
})

test('a server that takes the probe as is keeps it as the first event; the rest follow it', async () => {
  const { bridge, server, cwd } = fake('mimo', { replay: 'unchecked' })
  const response = await bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION })
  assert.equal(response.import.mode, 'history')
  assert.deepEqual(server.replayed.map((event) => event.seq - REPLAY_PROBE_SEQ), [0, 1, 2, 3, 4, 5, 6, 7])
  assert.equal(turnTexts(response).length, 4)
})

for (const [flavor, route] of [['opencode', '/prompt_async'], ['mimo', '/message']]) {
  test(`${flavor}: no /sync/replay → the transcript as one noReply synthetic context message (mode transcript)`, async () => {
    const { bridge, calls, server, cwd } = fake(flavor, { replay: 'missing' })
    const response = await bridge.handle('codeDesktop/thread/import', { cwd, title: 'T', messages: CONVERSATION, importedFrom: { source: 'codex' } })
    assert.deepEqual(response.import, { mode: 'transcript', messages: 4 })
    const post = calls.find((call) => call.method === 'POST' && call.route === `/session/ses_fff0001${route}`)
    assert.ok(post, `posted through ${route}`)
    assert.equal(post.body.noReply, true)
    assert.equal(post.body.parts.length, 1)
    assert.equal(post.body.parts[0].synthetic, true)
    assert.match(post.body.parts[0].text, /imported from codex \(“T”\)[\s\S]*<imported_conversation>\nUser:\nWhy does the build fail\?[\s\S]*Assistant:\nDone: regenerated the lockfile\.\n<\/imported_conversation>$/)
    assert.deepEqual(turnTexts(response), [], 'the transcript shows nothing of it: the app keeps the display')
    assert.equal(server.messages.get('ses_fff0001').length, 1)
    assert.equal(server.messages.get('ses_fff0001')[0].info.id, post.body.messageID)
    assert.equal(bridge.store.get('ses_fff0001').importTranscript, post.body.messageID)
    assert.ok(post.body.messageID < 'msg_0000000000010', 'it sorts before everything else in the session')
  })
}

test('a replay that answers but stores nothing falls back to the transcript too', async () => {
  const { bridge, calls, cwd } = fake('opencode', { replay: 'empty' })
  const response = await bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION })
  assert.equal(response.import.mode, 'transcript')
  assert.ok(calls.some((call) => call.route.endsWith('/prompt_async')))
})

test('requests: messages normalized as the Harness bridge does; bad ones refused before any session is made', async () => {
  const normalized = importMessages([{ role: 'assistant', text: ' hi ' }, { role: 'system', text: 'x' }, { role: 'assistant', text: 'again' }, { role: 'user', text: '' }, { role: 'user', text: 'q', ts: 5 }])
  assert.deepEqual(normalized, [{ role: 'user', text: IMPORT_OPENING }, { role: 'assistant', text: 'hi\n\nagain' }, { role: 'user', text: 'q', ts: 5 }])
  assert.equal(importedFromOf({ title: 'no source' }), null)
  const { bridge, calls, cwd } = fake('mimo')
  for (const messages of [undefined, [], [{ role: 'user', text: '  ' }], Array.from({ length: 5001 }, () => ({ role: 'user', text: 'x' }))]) {
    await assert.rejects(bridge.handle('codeDesktop/thread/import', { cwd, messages }), (error) => error.code === INVALID_PARAMS)
  }
  assert.equal(calls.length, 0)
  assert.equal(expectedSeq(new AgentHttpError(400, 'MiMo Code: Sequence mismatch for aggregate "ses_x": expected 12, got 99')), 12)
  assert.equal(expectedSeq(new Error('Unknown event type: message.updated.1')), null)
})

test('replay events: one message.updated.1 and one message.part.updated.1 per message, times monotonic and never past now', () => {
  const now = Date.UTC(2026, 10, 2)
  const events = replayEvents({ sessionID: 'ses_a', cwd: '/w', agent: 'build', model: { providerID: 'p', modelID: 'm' }, now,
    messages: [{ role: 'user', text: 'a', ts: now + 1000 }, { role: 'assistant', text: 'b', ts: 5 }, { role: 'user', text: 'c' }] })
  assert.deepEqual(events.map((event) => event.type), ['message.updated.1', 'message.part.updated.1', 'message.updated.1', 'message.part.updated.1', 'message.updated.1', 'message.part.updated.1'])
  assert.ok(events.every((event) => event.aggregateID === 'ses_a' && event.data.sessionID === 'ses_a' && !('seq' in event)))
  // Strictly increasing (a time ahead of now, one going backwards, a missing one), the last at now at the latest: no two
  // messages share a time, so a rewind by time (index.js revert) cuts between them.
  assert.deepEqual(events.filter((event, index) => index % 2 === 0).map((event) => event.data.info.time.created), [now - 3, now - 2, now - 1])
  const part = events[1].data.part
  assert.deepEqual([part.type, part.text, part.messageID, events[1].data.time], ['text', 'a', events[0].data.info.id, now - 3])
  // The source's own times stay as they are when they already move forward.
  const timed = replayEvents({ sessionID: 'ses_b', cwd: '/w', agent: 'build', model: { providerID: 'p', modelID: 'm' }, now,
    messages: CONVERSATION })
  assert.deepEqual(timed.filter((event, index) => index % 2 === 0).map((event) => event.data.info.time.created), CONVERSATION.map((message) => message.ts))
  assert.equal(new Set(events.map((event) => event.id)).size, events.length)
})

test('OpenCode 2.x: not wired yet (TODO v2 merge) → no threadImport capability and METHOD_NOT_FOUND (the app hands off)', async () => {
  const { bridge, calls, cwd } = fake('opencode')
  const init = async () => (await bridge.handle('initialize', { clientInfo: { name: 'test' } })).capabilities.threadImport
  bridge.ensureServer = async () => { bridge.server = { version: '1.18.34' } }
  assert.equal(await init(), true, '1.x advertises it')
  bridge.v2 = true
  assert.equal(await init(), undefined, '2.x does not, until its import path sets v2ThreadImport')
  const before = calls.length
  await assert.rejects(bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION }), (error) => error.code === METHOD_NOT_FOUND)
  assert.ok(!calls.slice(before).some((call) => call.method === 'POST'), 'no session is made')
  bridge.v2ThreadImport = true
  assert.equal(await init(), true)
  assert.equal(capabilitiesFor(FLAVORS.opencode, { threadImport: false }).threadImport, undefined)
})

test('model: the thread\'s own model names the imported messages; else the catalog default; never a made-up one', async () => {
  const named = fake('mimo', { model: 'xiaomi/default' })
  await named.bridge.handle('codeDesktop/thread/import', { cwd: named.cwd, messages: CONVERSATION, model: 'anthropic/claude-x' })
  const infos = (server) => server.replayed.filter((event) => event.type === 'message.updated.1').map((event) => event.data.info)
  assert.deepEqual(infos(named.server)[0].model, { providerID: 'anthropic', modelID: 'claude-x' })
  assert.deepEqual([infos(named.server)[1].providerID, infos(named.server)[1].modelID], ['anthropic', 'claude-x'])
  const fallback = fake('mimo', { model: 'xiaomi/default' })
  await fallback.bridge.handle('codeDesktop/thread/import', { cwd: fallback.cwd, messages: CONVERSATION })
  assert.deepEqual(infos(fallback.server)[0].model, { providerID: 'xiaomi', modelID: 'default' })
  assert.ok(![...named.server.replayed, ...fallback.server.replayed].some((event) => JSON.stringify(event).includes('imported')))
})

for (const flavor of ['mimo', 'opencode']) {
  test(`${flavor}: no model resolves → no replay (MiMo would take the newest user message's model); the transcript without a model`, async () => {
    const { bridge, calls, server, cwd } = fake(flavor, { model: null })
    const response = await bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION })
    assert.equal(response.import.mode, 'transcript')
    assert.ok(!calls.some((call) => call.route === '/sync/replay'))
    const post = calls.find((call) => call.method === 'POST' && /\/(prompt_async|message)$/.test(call.route))
    assert.ok(!('model' in post.body), 'the server gives the prompt its own default')
    assert.equal(server.messages.get('ses_fff0001').length, 1)
  })
}

test('the probe lands only in the new session: foreign events are refused before any request', async () => {
  const sent = []
  const api = async (...args) => { sent.push(args) }
  const events = replayEvents({ sessionID: 'ses_new', cwd: '/w', agent: 'build', model: { providerID: 'p', modelID: 'm' }, messages: importMessages(CONVERSATION) })
  await assert.rejects(replayHistory(api, { cwd: '/w', sessionID: 'ses_old', events }), /new session/)
  await assert.rejects(replayHistory(api, { cwd: '/w', events }), /new session/)
  const mixed = events.map((event, index) => (index === 3 ? { ...event, aggregateID: 'ses_old', data: { ...event.data, sessionID: 'ses_old' } } : event))
  await assert.rejects(replayHistory(api, { cwd: '/w', sessionID: 'ses_new', events: mixed }), /new session/)
  assert.equal(sent.length, 0)
  const answer = await replayHistory(api, { cwd: '/w', sessionID: 'ses_new', events })
  assert.deepEqual(answer, { start: REPLAY_PROBE_SEQ + 1, events: events.length, probeLanded: true })
  assert.deepEqual([sent[0][2].timeout, sent[1][2].timeout], [60000, 300000])
})

test('a new session that already holds messages is never replayed into: the import fails and the session is deleted', async () => {
  const stray = { info: { id: 'msg_zzz', sessionID: 'ses_fff0001', role: 'user', time: { created: 1 } }, parts: [] }
  const { bridge, calls, server, cwd } = fake('mimo', { preexisting: [stray] })
  await assert.rejects(bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION }), /isn’t empty/)
  assert.ok(!calls.some((call) => call.route === '/sync/replay'))
  assert.deepEqual(server.deleted, ['ses_fff0001'])
  assert.equal(bridge.store.get('ses_fff0001').deleted, true)
  assert.equal(bridge.threads.has('ses_fff0001'), false)
})

test('a probe kept by a server without the gap check, then a refused history: the probe is deleted before the transcript', async () => {
  const { bridge, calls, server, cwd } = fake('opencode', { replay: 'probe-then-fail' })
  const response = await bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION })
  assert.equal(response.import.mode, 'transcript')
  const probe = server.replayed[0].data.info.id
  assert.ok(calls.some((call) => call.method === 'DELETE' && call.route === `/session/ses_fff0001/message/${probe}`))
  const left = server.messages.get('ses_fff0001')
  assert.deepEqual(left.map((entry) => entry.info.id), [bridge.store.get('ses_fff0001').importTranscript], 'only the transcript message stays')
})

test('any failure after the session exists deletes it (the transcript refused): no orphan, the error reaches the app', async () => {
  const { bridge, notes, server, cwd } = fake('mimo', { replay: 'missing', prompt: 'fail' })
  await assert.rejects(bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION }), /prompt refused/)
  assert.deepEqual(server.deleted, ['ses_fff0001'])
  assert.equal(bridge.store.get('ses_fff0001').deleted, true)
  assert.equal(bridge.threads.has('ses_fff0001'), false)
  assert.ok(!notes.some((note) => note.method === 'thread/started'), 'never announced')
})

test('OpenCode 2.x payload: thread/start\'s session body plus settled messages, posted to the experimental import route', async () => {
  const now = Date.UTC(2026, 10, 2, 12)
  const body = { id: 'ses_ffe1', directory: '/w', agent: 'build', model: { id: 'gpt-5', providerID: 'openai', variant: 'high' }, permissions: [{ permission: 'bash', pattern: '*', action: 'ask' }], metadata: { codeDesktop: { root: 'ses_ffe1' } }, title: 'Two' }
  const payload = v2ImportPayload(body, importMessages(CONVERSATION), { now })
  assert.deepEqual(payload.location, { directory: '/w' })
  assert.deepEqual(payload.info, {
    id: 'ses_ffe1', projectID: 'global', cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: CONVERSATION[0].ts, updated: now }, location: { directory: '/w' }, title: 'Two', agent: 'build',
    model: body.model, metadata: body.metadata, permissions: body.permissions,
  })
  assert.deepEqual(payload.messages.map((message) => message.type), ['user', 'assistant', 'user', 'assistant'])
  assert.deepEqual(payload.messages[0], { id: payload.messages[0].id, type: 'user', text: 'Why does the build fail?', time: { created: CONVERSATION[0].ts } })
  // transfer.ts isSettled keeps an assistant only with time.completed; Model.Ref {id, providerID}.
  for (const message of payload.messages.filter((entry) => entry.type === 'assistant')) {
    assert.ok(Number.isFinite(message.time.completed))
    assert.deepEqual(message.model, { id: 'gpt-5', providerID: 'openai' })
    assert.deepEqual(message.content.map((part) => part.type), ['text'])
  }
  const ids = payload.messages.map((message) => message.id)
  assert.ok(ids.every((id) => /^msg_[0-9a-f]{12}[0-9A-Za-z]{14}$/.test(id)))
  assert.deepEqual(ids.toSorted(), ids)
  assert.ok(v2Identifier(false, now + 1) > ids.at(-1).slice(4), 'later server ids sort after the imported ones')
  assert.throws(() => v2ImportPayload({ directory: '/w' }, []), /session id/)
  assert.throws(() => v2ImportPayload({ ...body, model: undefined }, importMessages(CONVERSATION), { now }), /session model/, 'no made-up model')
  const posted = []
  const answer = await importSessionV2({ post: async (route, value) => { posted.push({ route, value }); return { id: 'ses_ffe1' } } }, body, importMessages(CONVERSATION), { now })
  assert.deepEqual(answer, { id: 'ses_ffe1' })
  assert.equal(posted[0].route, '/api/experimental/session/import')
  assert.equal(posted[0].value.messages.length, 4)
})

test('a failure inside thread/start\'s own steps, once the agent made the session, deletes it too', async () => {
  const { bridge, server, cwd } = fake('opencode')
  bridge.mergedConfig = async () => { throw new Error('opencode.json is broken') }
  await assert.rejects(bridge.handle('codeDesktop/thread/import', { cwd, messages: CONVERSATION }), /opencode\.json is broken/)
  assert.deepEqual(server.deleted, ['ses_fff0001'])
  assert.equal(bridge.store.get('ses_fff0001').deleted, true)
  assert.equal(bridge.threads.has('ses_fff0001'), false)
})

// ---- how an imported reply shows (import-display.js): the agent keeps the text, the history shows tool rows ----------
const { importDisplayIndex, importedBlocks, importedItems, importedToolItem, importReplyBlocks, blockSpans } = await import('../packages/opencode-bridge/src/import-display.js')
const { Projector } = await import('../packages/opencode-bridge/src/projection.js')

// As chat-import convert.mjs toolBlock writes them; the first one's output ends with a line break, as command output does.
const SHELL = '[Tool: shell]\nnpm ci\n[Result (exit 1)]\nnpm error\n\ncode ELOCK\n'
const READ = '[Tool: Read]\n/w/package.json\n[Result]\n{}'
const withParts = (...parts) => ({ role: 'assistant', text: parts.map((part) => part.text).join('\n\n'), parts })
const TOOL_CONVERSATION = [
  { role: 'user', text: 'Why does the build fail?' },
  withParts({ text: 'Looking.' }, { text: SHELL, tool: true }, { text: READ, tool: true }, { text: 'The lockfile is stale.' }),
  { role: 'user', text: 'Fix it' },
  { role: 'assistant', text: 'Done: regenerated the lockfile.' },
]
const shapeOf = (turns) => turns.map((turn) => turn.items.map((item) => (item.type === 'dynamicToolCall' ? `${item.tool}:${item.status}` : item.type === 'agentMessage' ? item.text : item.type)))
const SHOWN = [['userMessage', 'Looking.', 'shell:failed', 'Read:completed', 'The lockfile is stale.'], ['userMessage', 'Done: regenerated the lockfile.']]
const idsOf = (turns) => turns.flatMap((turn) => turn.items.map((item) => item.id))

for (const flavor of ['mimo', 'opencode']) {
  test(`${flavor}: an imported reply shows its tool calls as tool rows; the agent's message keeps the text`, async () => {
    const { bridge, server, cwd } = fake(flavor)
    const response = await bridge.handle('codeDesktop/thread/import', { cwd, title: 'Build failure', messages: TOOL_CONVERSATION, model: 'xiaomi/mimo-v2' })
    assert.deepEqual(response.import, { mode: 'history', messages: 4 })
    assert.deepEqual(shapeOf(response.thread.turns), SHOWN)
    const shell = response.thread.turns[0].items[2]
    assert.deepEqual([shell.arguments, shell.success, shell.contentItems], [{ input: 'npm ci' }, false, [{ type: 'inputText', text: 'npm error\n\ncode ELOCK' }]])
    const ids = idsOf(response.thread.turns)
    assert.equal(new Set(ids).size, ids.length, 'every item has an id of its own')
    // Read again: the same rows under the same ids.
    const read = await bridge.handle('thread/read', { threadId: response.thread.id, includeTurns: true })
    assert.deepEqual(shapeOf(read.thread.turns), SHOWN)
    assert.deepEqual(idsOf(read.thread.turns), ids)
    // What the agent holds (and replays to the model) is one text part per message, as before.
    const parts = server.replayed.filter((event) => event.type === 'message.part.updated.1').map((event) => event.data.part)
    assert.deepEqual(parts.map((part) => part.type), ['text', 'text', 'text', 'text'])
    assert.equal(parts[1].text, TOOL_CONVERSATION[1].text.trim())
    // The index kept with the thread: one reply, offsets only.
    const index = bridge.store.get(response.thread.id).importBlocks
    assert.equal(Object.keys(index).length, 1)
    assert.ok(!/npm|Looking|lockfile/.test(JSON.stringify(index)), 'no conversation text in threads.json')
  })
}

test('a conversation taken only as the transcript, or one without tool calls, keeps no display index', async () => {
  const missing = fake('opencode', { replay: 'missing' })
  const transcript = await missing.bridge.handle('codeDesktop/thread/import', { cwd: missing.cwd, messages: TOOL_CONVERSATION })
  assert.equal(transcript.import.mode, 'transcript')
  assert.equal(missing.bridge.store.get(transcript.thread.id).importBlocks, undefined)
  const plain = fake('mimo')
  const response = await plain.bridge.handle('codeDesktop/thread/import', { cwd: plain.cwd, messages: CONVERSATION, model: 'xiaomi/mimo-v2' })
  assert.equal(plain.bridge.store.get(response.thread.id).importBlocks, undefined)
  assert.deepEqual(turnTexts(response), ['U:Why does the build fail?', 'A:The lockfile is stale.\n\n[tool bash: npm ci → exit 1]', 'U:Fix it', 'A:Done: regenerated the lockfile.'])
})

test('the index finds a reply by its text: a fork (the same texts under new ids) shows the rows, a changed text shows as it is', () => {
  const reply = TOOL_CONVERSATION[1].text.trim()
  const index = importDisplayIndex(TOOL_CONVERSATION, [reply, 'Done: regenerated the lockfile.'])
  const messagesOf = (text) => [
    { info: { id: 'msg_a', sessionID: 'ses_fork', role: 'user', time: { created: 1 } }, parts: [{ id: 'prt_a', sessionID: 'ses_fork', messageID: 'msg_a', type: 'text', text: 'q' }] },
    { info: { id: 'msg_b', sessionID: 'ses_fork', role: 'assistant', parentID: 'msg_a', time: { created: 2, completed: 3 } }, parts: [{ id: 'prt_b', sessionID: 'ses_fork', messageID: 'msg_b', type: 'text', text }] },
  ]
  const view = (text, meta) => { const projector = new Projector({ threadId: 'ses_fork', cwd: '/w', meta }); projector.load(messagesOf(text)); return projector.turns() }
  const forked = view(reply, { importBlocks: index })
  assert.deepEqual(shapeOf(forked), [SHOWN[0]])
  assert.deepEqual(idsOf(forked).slice(1), ['prt_b', 'prt_b-import-1', 'prt_b-import-2', 'prt_b-import-3'])
  assert.deepEqual(shapeOf(view(`${reply} (edited)`, { importBlocks: index })), [['userMessage', `${reply} (edited)`]])
  assert.deepEqual(shapeOf(view(reply, {})), [['userMessage', reply]], 'a thread without the index is untouched')
  // The live path never takes an imported part for several items (itemsOf feeds the stream).
  const projector = new Projector({ threadId: 'ses_fork', cwd: '/w', meta: { importBlocks: index } })
  projector.load(messagesOf(reply))
  const [, message] = messagesOf(reply)
  assert.equal(projector.itemsOf(message.parts[0], message).length, 1)
})

test('import-display: blocks, spans and the index', () => {
  const [blocks] = importReplyBlocks(TOOL_CONVERSATION)
  assert.deepEqual(blocks.map((block) => block.tool), [false, true, true, false])
  const reply = TOOL_CONVERSATION[1].text.trim()
  const spans = blockSpans(reply, blocks)
  assert.deepEqual(spans.map(([start, end]) => reply.slice(start, end)), blocks.map((block) => block.text))
  assert.deepEqual(spans.map((span) => span[2]), [0, 1, 1, 0])
  assert.equal(blockSpans(`A note.\n\n${reply}`, blocks), null, 'text before the blocks: not this reply')
  assert.equal(blockSpans(reply.replace('Looking.\n\n', 'Looking. '), blocks), null, 'a block has to start a line')
  assert.equal(importDisplayIndex(CONVERSATION, CONVERSATION.filter((message) => message.role === 'assistant').map((message) => message.text)), null, 'no tool call marked: nothing to keep')
  assert.equal(importDisplayIndex(TOOL_CONVERSATION, ['Another text.']), null)
  const index = importDisplayIndex(TOOL_CONVERSATION, [reply])
  assert.deepEqual(importedBlocks(`\n${reply}\n`, index), blocks)
  assert.equal(importedBlocks('Another text.', index), null)
  assert.equal(importedBlocks(reply, null), null)
  // A damaged index (spans out of order or out of range) cuts nothing.
  const [key] = Object.keys(index)
  assert.equal(importedBlocks(reply, { [key]: [[5, 2, 0]] }), null)
  assert.equal(importedBlocks(reply, { [key]: [[0, reply.length + 1, 0]] }), null)
  assert.equal(importedBlocks(reply, { [key]: 'x' }), null)
  const items = importedItems('p', reply, index, (id, text) => ({ type: 'agentMessage', id, text }))
  assert.deepEqual(items.map((item) => [item.type, item.id]), [['agentMessage', 'p'], ['dynamicToolCall', 'p-import-1'], ['dynamicToolCall', 'p-import-2'], ['agentMessage', 'p-import-3']])
  assert.equal(importedToolItem('x', 'Prose that mentions [Tool: shell]\nls\n[Result]\nok'), null)
  assert.equal(importedToolItem('x', '[Tool: a]\n\n[Result]').tool, 'a')
})

// The same conversation with each tool block's call (chat-import convert.mjs toolCallDisplay): the rows a native call shows.
const SHELL_CALL = { type: 'commandExecution', command: 'npm ci', cwd: '/w' }
const READ_CALL = { type: 'commandExecution', command: 'Read /w/package.json', cwd: '', commandActions: [{ type: 'read', command: 'Read /w/package.json', name: 'package.json', path: '/w/package.json' }] }
const CALL_CONVERSATION = [
  TOOL_CONVERSATION[0],
  withParts({ text: 'Looking.' }, { text: SHELL, tool: true, call: SHELL_CALL }, { text: READ, tool: true, call: READ_CALL }, { text: 'The lockfile is stale.' }),
  ...TOOL_CONVERSATION.slice(2),
]
const rowsOf = (turns) => turns[0].items.slice(1).map((item) => [item.type, item.command ?? item.text, item.status ?? null])

for (const flavor of ['mimo', 'opencode']) {
  test(`${flavor}: with the blocks' calls the rows are the command and the read a native call shows, on every read`, async () => {
    const { bridge, cwd } = fake(flavor)
    const response = await bridge.handle('codeDesktop/thread/import', { cwd, title: 'Build failure', messages: CALL_CONVERSATION, model: 'xiaomi/mimo-v2' })
    const shown = [['agentMessage', 'Looking.', null], ['commandExecution', 'npm ci', 'failed'], ['commandExecution', 'Read /w/package.json', 'completed'], ['agentMessage', 'The lockfile is stale.', null]]
    assert.deepEqual(rowsOf(response.thread.turns), shown)
    const [, , shell, read] = response.thread.turns[0].items
    assert.deepEqual([shell.cwd, shell.exitCode, shell.aggregatedOutput, shell.commandActions], ['/w', 1, 'npm error\n\ncode ELOCK', [{ type: 'unknown', command: 'npm ci' }]])
    assert.deepEqual([read.commandActions, read.aggregatedOutput], [READ_CALL.commandActions, '{}'])
    const again = await bridge.handle('thread/read', { threadId: response.thread.id, includeTurns: true })
    assert.deepEqual(rowsOf(again.thread.turns), shown)
    assert.deepEqual(idsOf(again.thread.turns), idsOf(response.thread.turns))
    // The index keeps only what the text does not say: the shell's cwd, the read's action.
    const [spans] = Object.values(bridge.store.get(response.thread.id).importBlocks)
    assert.deepEqual(spans.map((span) => span[3] ?? null), [null, { type: 'commandExecution', cwd: '/w' }, { type: 'commandExecution', command: 'Read /w/package.json', commandActions: READ_CALL.commandActions }, null])
  })
}

test('import-display: slimCall keeps the rest of a call; the index bounds each call and all of them, the newest replies first', async () => {
  const { slimCall, CALL_INDEX_CHARS, INDEX_CALLS_CHARS } = await import('../packages/opencode-bridge/src/import-display.js')
  assert.deepEqual(slimCall(SHELL_CALL, SHELL.trim()), { type: 'commandExecution', cwd: '/w' })
  assert.deepEqual(slimCall({ type: 'webSearch', query: 'q', action: { type: 'search', query: 'q', queries: null } }, '[Tool: web]\nq\n[Result]\nr'), { type: 'webSearch' })
  assert.deepEqual(slimCall({ type: 'mcpToolCall', server: 'docs', tool: 'search', arguments: { q: 'x' } }, '[Tool: search]\n{"q":"x"}\n[Result]\nok'), { type: 'mcpToolCall', server: 'docs' })
  assert.equal(slimCall(SHELL_CALL, 'prose'), null)
  assert.equal(slimCall({ type: 'nope' }, SHELL.trim()), null)
  // A call past CALL_INDEX_CHARS is not kept: its row shows from its text.
  const big = { type: 'fileChange', changes: [{ path: '/w/a.js', kind: { type: 'update', move_path: null }, diff: `@@ -1,1 +1,1 @@\n-${'a'.repeat(CALL_INDEX_CHARS)}\n+b\n` }] }
  const edit = '[Tool: Edit]\nupdate /w/a.js\n[Result]\nok'
  const messages = [{ role: 'user', text: 'q' }, withParts({ text: edit, tool: true, call: big })]
  const index = importDisplayIndex(messages, [edit])
  assert.deepEqual(Object.values(index)[0], [[0, edit.length, 1]])
  assert.equal(importedItems('p', edit, index, () => null)[0].type, 'dynamicToolCall')
  // All of them: past INDEX_CALLS_CHARS the oldest replies' calls are left out.
  const each = { type: 'fileChange', changes: [{ path: '/w/a.js', kind: { type: 'update', move_path: null }, diff: `@@ -1,1 +1,1 @@\n-${'a'.repeat(15000)}\n+b\n` }] }
  const many = Array.from({ length: 30 }, (_, n) => `[Tool: Edit]\nupdate /w/${n}.js\n[Result]\nok`)
  const conversation = many.flatMap((text) => [{ role: 'user', text: 'q' }, withParts({ text, tool: true, call: each })])
  const kept = Object.entries(importDisplayIndex(conversation, many))
  const withCall = many.filter((text) => kept.find(([, spans]) => spans[0][1] === text.length && importedItems('p', text, Object.fromEntries(kept), () => null)[0].type === 'fileChange'))
  assert.ok(withCall.length > 0 && withCall.length < many.length)
  assert.ok(withCall.includes(many.at(-1)) && !withCall.includes(many[0]), 'the newest keep theirs')
  assert.ok(withCall.length * JSON.stringify(slimCall(each, many[0])).length <= INDEX_CALLS_CHARS)
})

test('the OpenCode and ZCode bridges carry the same import-display.js', () => {
  const read = (name) => fs.readFileSync(path.resolve(import.meta.dirname, `../packages/${name}/src/import-display.js`), 'utf8')
  assert.equal(read('zcode-bridge'), read('opencode-bridge'))
})
