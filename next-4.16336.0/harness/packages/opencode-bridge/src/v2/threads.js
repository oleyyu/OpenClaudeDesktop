/**
 * threads.json under two engines. OpenCode 2.x runs on a database of its own (db.js), so a thread belongs to the
 * engine that made it: entries written under v2 carry engine:'v2'. Under v2 the unmarked (1.x) threads are hidden,
 * under 1.x the marked ones: neither is ever deleted for belonging to the other, since switching back shows them again
 * (their sessions still exist, in the other database).
 */

export const ENGINE_V2 = 'v2'

/** Whether a threads.json entry was made or opened under OpenCode 2.x. */
export const isV2Thread = (meta) => meta?.engine === ENGINE_V2

/** Whether a threads.json entry belongs to the engine `api` ('v1' | 'v2') runs. */
export function threadOwnedBy(api, meta) {
  return api === 'v2' ? isV2Thread(meta) : !isV2Thread(meta)
}

/**
 * Whether the engine `api` hides a thread: under v2 an existing entry without the marker (a 1.x thread), under 1.x a
 * marked one. An id with no entry yet is nobody's (a session the running engine made that was never recorded here).
 */
export function hiddenUnder(api, meta) {
  if (api !== 'v2') return isV2Thread(meta)
  return !!meta && Object.keys(meta).length > 0 && !isV2Thread(meta)
}

/** Write a thread's entry under v2 (with the engine marker). */
export function updateV2(store, id, patch = {}) {
  return store.update(id, { ...patch, engine: ENGINE_V2 })
}

/**
 * Under v2, every threads.json write marks its entry (a new one, or one already v2's), so a thread created or opened
 * there is v2's wherever it was written; a 1.x entry is written as it is, never moved to the other engine.
 */
export function markV2Writes(store) {
  const update = store.update.bind(store)
  store.update = (id, patch) => hiddenUnder('v2', store.get(id)) ? update(id, patch) : updateV2({ update }, id, patch)
  return store
}
