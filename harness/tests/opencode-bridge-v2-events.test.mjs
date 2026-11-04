// OpenCode 2.x bridge, phase 1: the /api/event envelope normalizer (src/v2/events.js) — routing by data.sessionID
// (session events may come without a location), forms' own session id ("global" is none), event kinds, and the
// durable-seq filter used when buffered events are replayed over a resync.
import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOG_EVENTS, SeqFilter, eventSessionID, normalizeEvent } from '../packages/opencode-bridge/src/v2/events.js'

test('a session event is routed by data.sessionID, with or without a location', () => {
  const event = normalizeEvent({ id: 'evt_1', created: 5, type: 'session.text.delta', data: { sessionID: 'ses_1', assistantMessageID: 'msg_1', ordinal: 0, delta: 'hi' } })
  assert.deepEqual(event, { id: 'evt_1', type: 'session.text.delta', created: 5, sessionID: 'ses_1', directory: null, durable: null, data: { sessionID: 'ses_1', assistantMessageID: 'msg_1', ordinal: 0, delta: 'hi' }, kind: 'session' })
  const durable = normalizeEvent({ id: 'evt_2', type: 'session.execution.started', location: { directory: '/p' }, durable: { aggregateID: 'ses_1', seq: 7, version: 1 }, data: { sessionID: 'ses_1' } })
  assert.deepEqual(durable.durable, { aggregateID: 'ses_1', seq: 7, version: 1 })
  assert.equal(durable.directory, '/p')
  // The envelope's metadata goes along (v2 stores it on the messages it projects); none, no key.
  assert.deepEqual(normalizeEvent({ type: 'session.compaction.ended', metadata: { keep: 'msg_9' }, data: { sessionID: 'ses_1' } }).metadata, { keep: 'msg_9' })
  assert.equal(Object.hasOwn(durable, 'metadata'), false)
  // session.created names its folder in data.location.
  assert.equal(normalizeEvent({ type: 'session.created', data: { sessionID: 'ses_2', parentID: 'ses_1', location: { directory: '/q' } } }).directory, '/q')
})

test('asks: permission.* and form.* (a form’s session id is in data.form; "global" is none)', () => {
  assert.equal(normalizeEvent({ type: 'permission.asked', data: { id: 'per_1', sessionID: 'ses_1', action: 'shell', resources: ['ls'] } }).kind, 'ask')
  assert.equal(normalizeEvent({ type: 'permission.replied', data: { sessionID: 'ses_1', requestID: 'per_1', reply: 'reject' } }).sessionID, 'ses_1')
  const form = normalizeEvent({ type: 'form.created', data: { form: { id: 'frm_1', sessionID: 'ses_9', title: 'Q', fields: [] } } })
  assert.equal(form.kind, 'ask')
  assert.equal(form.sessionID, 'ses_9')
  assert.equal(normalizeEvent({ type: 'form.created', data: { form: { id: 'frm_2', sessionID: 'global', fields: [] } } }).sessionID, null)
  assert.equal(eventSessionID('form.cancelled', { id: 'frm_1', sessionID: 'ses_9' }), 'ses_9')
})

test('kinds: connected, catalog (refetch a list), ignored (TUI, terminals, never-published session.status / idle)', () => {
  assert.equal(normalizeEvent({ type: 'server.connected', data: {} }).kind, 'connected')
  for (const type of Object.keys(CATALOG_EVENTS)) assert.equal(normalizeEvent({ type, data: {} }).kind, 'catalog', type)
  assert.equal(CATALOG_EVENTS['credential.switched'], 'account')
  assert.equal(CATALOG_EVENTS['mcp.status.changed'], 'mcp')
  for (const type of ['tui.toast.show', 'installation.updated', 'rpc.x.y', 'pty.created', 'shell.exited', 'filesystem.changed', 'vcs.branch.updated', 'session.status', 'session.idle']) {
    assert.equal(normalizeEvent({ type, data: { sessionID: 'ses_1' } }).kind, 'ignored', type)
  }
  // A session event without a session cannot be routed.
  assert.equal(normalizeEvent({ type: 'session.execution.started', data: {} }).kind, 'ignored')
  assert.equal(normalizeEvent(null), null)
  assert.equal(normalizeEvent({ data: {} }), null)
  assert.deepEqual(normalizeEvent({ type: 'session.deleted', data: null }).data, {})
})

test('SeqFilter: durable events at or below the last seq of their aggregate are dropped; ephemeral ones always pass', () => {
  const filter = new SeqFilter()
  const at = (seq, aggregateID = 'ses_1') => normalizeEvent({ type: 'session.step.started', durable: { aggregateID, seq, version: 1 }, data: { sessionID: aggregateID } })
  assert.equal(filter.accept(at(1)), true)
  assert.equal(filter.accept(at(2)), true)
  assert.equal(filter.accept(at(2)), false)
  assert.equal(filter.accept(at(1, 'ses_2')), true, 'per aggregate')
  filter.advance('ses_1', 10)
  assert.equal(filter.accept(at(9)), false, 'a resync loaded up to 10')
  assert.equal(filter.accept(at(11)), true)
  assert.equal(filter.accept(normalizeEvent({ type: 'session.text.delta', data: { sessionID: 'ses_1' } })), true)
  filter.forget('ses_1')
  assert.equal(filter.accept(at(3)), true)
})
