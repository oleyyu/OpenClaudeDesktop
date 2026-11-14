/**
 * Codex-shaped JSON-RPC errors for Harness failures the client routes on.
 * Each helper returns an RpcError, so the transport answers it without a
 * stderr stack (transport.js dispatch logs only non-RpcError failures).
 */

import { RpcError, INVALID_PARAMS, METHOD_NOT_FOUND } from './transport.js'

const SESSION_NOT_FOUND = 'SESSION_QUERY_SESSION_NOT_FOUND'

/**
 * Codex app-server answers an unknown thread id with INVALID_PARAMS. The
 * `threadNotFound` info is this bridge's tag for it: the id is not a Harness
 * session (typically a Codex rollout remembered by OpenClaude Desktop).
 * @param {string} id - the requested thread id.
 */
export function threadNotFound(id) {
  return new RpcError(INVALID_PARAMS, 'This session is not available in DeepSeek Harness.', { codexErrorInfo: 'threadNotFound', threadId: id })
}

/** True for an RpcError built by {@link threadNotFound}. */
export function isThreadNotFound(error) {
  return error instanceof RpcError && error.data?.codexErrorInfo === 'threadNotFound'
}

/**
 * Whether `predicate` holds for the error or anything in its `cause` chain
 * (cycle-safe). Harness wraps persistence failures, so routing must look past
 * the outer error.
 */
export function inCauseChain(error, predicate) {
  const seen = new Set()
  for (let current = error; current && typeof current === 'object' && !seen.has(current); current = current.cause) {
    seen.add(current)
    if (predicate(current)) return true
  }
  return false
}

/**
 * A missing session: dsh-session-query's SESSION_QUERY_SESSION_NOT_FOUND
 * (readSession, readTitleSnapshot, event reads), or the persistence seam's
 * SessionPersistenceNotFoundError when no query service is mounted.
 */
export function isSessionNotFound(error) {
  return inCauseChain(error, (entry) => entry.code === SESSION_NOT_FOUND || entry.name === 'SessionPersistenceNotFoundError')
}

/**
 * Run one session read, turning "no such session" into threadNotFound(id):
 * a not-found failure anywhere in the cause chain, or an empty result.
 * Every other failure propagates unchanged.
 * @template T
 * @param {string} id - the requested thread id.
 * @param {() => Promise<T | null | undefined>} read
 * @returns {Promise<T>}
 */
export async function requireSession(id, read) {
  let value
  try {
    value = await read()
  } catch (error) {
    throw isSessionNotFound(error) ? threadNotFound(id) : error
  }
  if (value === undefined || value === null) throw threadNotFound(id)
  return value
}

/**
 * The session's write lock is held by another process (the jsonl backend's
 * session.lock flock): the DeepSeek app, or a second OpenClaude Desktop core, has
 * it open. Opening fails until that app closes it.
 * @param {string} [id] - the requested thread id.
 */
export function sessionBusyElsewhere(id) {
  return new RpcError(-32000, 'This session is open in another DeepSeek app. Close it there, then try again.', { codexErrorInfo: 'sessionBusyElsewhere', ...(id ? { threadId: id } : {}) })
}

/**
 * dsh-session-persistence SessionAlreadyOwnedError (lock contention, or an
 * active write handle) anywhere in the cause chain: agents.resume wraps it.
 */
export function isSessionOwnedElsewhere(error) {
  return inCauseChain(error, (entry) => entry.name === 'SessionAlreadyOwnedError')
}

/**
 * skills/config/write: Harness has no per-skill switch (the app hides its
 * Enabled control through capabilities.skillToggle). The SKILL.md
 * frontmatter key is the only way to keep the model from using a skill.
 */
export function skillToggleUnsupported() {
  return new RpcError(METHOD_NOT_FOUND, 'DeepSeek Harness has no per-skill switch. Add `disable-model-invocation: true` to the skill’s SKILL.md frontmatter to hide it from the model.')
}
