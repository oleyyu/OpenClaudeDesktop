import test from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { SessionQueryError } from '@deepseek-ai/dsh-session-query'
import { SessionAlreadyOwnedError, SessionPersistenceNotFoundError } from '@deepseek-ai/dsh-session-persistence'
import { threadNotFound, isThreadNotFound, isSessionNotFound, inCauseChain, requireSession, sessionBusyElsewhere, isSessionOwnedElsewhere } from '../packages/codex-app-server/src/errors.js'
import { LineTransport, RpcError, INVALID_PARAMS } from '../packages/codex-app-server/src/transport.js'

const notFoundCode = { code: 'SESSION_QUERY_SESSION_NOT_FOUND' }

test('isSessionNotFound: the session-query code, a cause chain, and the persistence error', () => {
  assert.equal(isSessionNotFound(notFoundCode), true)
  assert.equal(isSessionNotFound(new Error('wrapped', { cause: new Error('middle', { cause: notFoundCode }) })), true)
  // The installed classes (dsh-session-query :311/:524/:904, jsonl open/findLog).
  assert.equal(isSessionNotFound(new SessionQueryError('session "x" not found', 'SESSION_QUERY_SESSION_NOT_FOUND')), true)
  assert.equal(isSessionNotFound(new SessionPersistenceNotFoundError('x')), true)
  assert.equal(isSessionNotFound(new SessionQueryError('failed', 'SESSION_QUERY_PERSISTENCE_FAILED', { cause: new SessionPersistenceNotFoundError('x') })), true)
  for (const other of [undefined, null, 'SESSION_QUERY_SESSION_NOT_FOUND', new Error('boom'), new SessionQueryError('corrupt', 'SESSION_QUERY_CORRUPT_SESSION'), { code: 'SESSION_QUERY_ABORTED' }])
    assert.equal(isSessionNotFound(other), false)
})

test('inCauseChain stops on a cyclic cause', () => {
  const a = new Error('a'), b = new Error('b', { cause: a })
  a.cause = b
  assert.equal(inCauseChain(a, (entry) => entry.message === 'c'), false)
  assert.equal(inCauseChain(a, (entry) => entry.message === 'b'), true)
})

test('threadNotFound is INVALID_PARAMS (-32602) with codexErrorInfo threadNotFound', () => {
  const error = threadNotFound('x')
  assert.ok(error instanceof RpcError)
  assert.equal(error.code, -32602)
  assert.equal(error.code, INVALID_PARAMS)
  assert.deepEqual(error.data, { codexErrorInfo: 'threadNotFound', threadId: 'x' })
  assert.equal(error.message, 'This session is not available in DeepSeek Harness.')
  assert.equal(isThreadNotFound(error), true)
  assert.equal(isThreadNotFound(new RpcError(INVALID_PARAMS, 'other')), false)
  assert.equal(isThreadNotFound(new Error('plain')), false)
})

test('requireSession maps not-found failures and empty results; other failures pass through', async () => {
  assert.equal(await requireSession('s', async () => 'header'), 'header')
  for (const read of [async () => undefined, async () => null, async () => { throw new SessionQueryError('session "s" not found', 'SESSION_QUERY_SESSION_NOT_FOUND') }])
    await assert.rejects(requireSession('s', read), (error) => isThreadNotFound(error) && error.data.threadId === 's')
  const corrupt = new SessionQueryError('corrupt', 'SESSION_QUERY_CORRUPT_SESSION')
  await assert.rejects(requireSession('s', async () => { throw corrupt }), (error) => error === corrupt)
})

test('the transport answers threadNotFound with code and data and logs no stack', async () => {
  const input = new PassThrough(), output = new PassThrough()
  const logs = []
  const transport = new LineTransport(input, output, {
    onRequest: async (method, params) => requireSession(params.threadId, async () => { throw new SessionQueryError(`session "${params.threadId}" not found`, 'SESSION_QUERY_SESSION_NOT_FOUND') }),
    log: (message) => logs.push(message),
  })
  transport.start()
  const line = new Promise((resolve) => output.once('data', (chunk) => resolve(JSON.parse(String(chunk)))))
  input.write(JSON.stringify({ id: 7, method: 'thread/read', params: { threadId: '01a0d269-codex' } }) + '\n')
  assert.deepEqual(await line, { id: 7, error: { code: -32602, message: 'This session is not available in DeepSeek Harness.', data: { codexErrorInfo: 'threadNotFound', threadId: '01a0d269-codex' } } })
  assert.deepEqual(logs, [])
  transport.close()
})

test('a session owned by another process maps to -32000 sessionBusyElsewhere, also from a cause', async () => {
  const owned = new SessionAlreadyOwnedError('s')
  assert.equal(owned.name, 'SessionAlreadyOwnedError')
  const wrapped = new Error('resume failed', { cause: owned })
  assert.equal(isSessionOwnedElsewhere(owned), true)
  assert.equal(isSessionOwnedElsewhere(wrapped), true)
  assert.equal(isSessionOwnedElsewhere(Object.assign(new Error('x'), { cause: { name: 'SessionAlreadyOwnedError' } })), true)
  for (const other of [undefined, new Error('boom'), new SessionPersistenceNotFoundError('s'), threadNotFound('s')]) assert.equal(isSessionOwnedElsewhere(other), false)
  const busy = sessionBusyElsewhere('s')
  assert.ok(busy instanceof RpcError)
  assert.equal(busy.code, -32000)
  assert.equal(busy.message, 'This session is open in another DeepSeek app. Close it there, then try again.')
  assert.deepEqual(busy.data, { codexErrorInfo: 'sessionBusyElsewhere', threadId: 's' })
  assert.deepEqual(sessionBusyElsewhere().data, { codexErrorInfo: 'sessionBusyElsewhere' })
  // openThread's composition: the resume failure is mapped, requireSession passes it through.
  const resume = async () => { throw wrapped }
  const open = () => requireSession('s', () => resume().catch((error) => { throw isSessionOwnedElsewhere(error) ? sessionBusyElsewhere('s') : error }))
  await assert.rejects(open(), (error) => error.code === -32000 && error.data.codexErrorInfo === 'sessionBusyElsewhere')
})
