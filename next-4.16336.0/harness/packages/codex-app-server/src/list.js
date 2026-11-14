/**
 * Session list rows without replaying logs, the way the DeepSeek app lists
 * them (vendor api/session-controller list.ts summarizeCold): a header plus
 * the persisted projection cache (`ctx.sessionProjectionCache`, shared with
 * the official app under ~/.dsh/storages/session_projcache).
 *
 *   name       bridge store name, else the cached `title` projection, else
 *              a dsh-session-query title snapshot (cache misses, page only)
 *   recency    max(createdAt, lastPromptAt): the cached
 *              `sessionListMetadata.lastPromptAt` (human prompts only) or
 *              the store's lastPromptAt (recorded at turn/start)
 *   blank      the cache says the log has no turn yet: not listed
 *
 * The bridge registers the upstream `sessionListMetadata` projection unit so
 * the checkpoints this process writes keep that row for both apps. The cache
 * table is read from disk once per process, so thread/read checks the log's
 * revision before serving a row ({@link CacheRevisions}).
 */
import { z } from 'zod'
import { requireSession } from './errors.js'

/** Projection keys a cold row reads from the cache. */
export const LIST_PROJECTION_KEYS = ['title', 'sessionListMetadata']

const sessionListMetadataSchema = z.object({
  blank: z.boolean(),
  lastPromptAt: z.number().nullable(),
})

/**
 * Upstream applySessionListMetadata (list.ts:45-56): `blank` until the first
 * turn/start, `lastPromptAt` from human-authored user/message events. Returns
 * the same reference for any other event (no downstream work).
 */
export function applySessionListMetadata(state, event) {
  const blank = state.blank && event.type !== 'turn/start'
  const lastPromptAt = event.type === 'user/message' && event.data?.source?.kind === 'user'
    ? event.time
    : state.lastPromptAt
  return blank === state.blank && lastPromptAt === state.lastPromptAt ? state : { blank, lastPromptAt }
}

/**
 * The upstream projection unit, verbatim in shape (key, schema, fold, view
 * and stateVersion 1), so cache rows written by either app read alike.
 */
export const sessionListMetadataProjection = {
  key: 'sessionListMetadata',
  stateSchema: sessionListMetadataSchema,
  init: () => ({ blank: true, lastPromptAt: null }),
  apply: applySessionListMetadata,
  wire: { viewSchema: sessionListMetadataSchema, view: (state) => state },
  stateVersion: 1,
}

/**
 * Register the unit on `ctx.sessionProjections`. A key already registered at
 * the same stateVersion is shared (the registry counts registrants and keeps
 * the first definition); a different version throws, which is reported, not
 * fatal.
 * @returns the disposer, or undefined when nothing was registered.
 */
export function registerListProjection(registry, warn = () => {}) {
  if (typeof registry?.register !== 'function') return undefined
  try {
    return registry.register(sessionListMetadataProjection)
  } catch (error) {
    warn(error)
    return undefined
  }
}

/**
 * dsh-session-query readTitleSnapshots entry → title text
 * (SessionTitleObservationResult → SessionTitleSnapshot.title).
 */
export function titleOf(result) {
  return result?.status === 'fulfilled' ? result.value?.title?.title : undefined
}

// The `title` projection view is a plain string (dsh-session-title types).
const textOf = (value) => (typeof value === 'string' && value ? value : typeof value?.title === 'string' && value.title ? value.title : null)
const timeOf = (value) => (Number.isFinite(value) ? value : 0)

/**
 * The zero-I/O cache read for one header: the current lifecycle's record,
 * else a predecessor record's title (upstream projectionsFor). Any failure
 * is a miss.
 * @returns {Record<string, unknown> | undefined} projection values by key
 */
export function cachedValues(cache, header) {
  if (!cache || !header) return undefined
  try {
    return (cache.cachedSnapshot?.(header, LIST_PROJECTION_KEYS) ?? cache.cachedPredecessorTitle?.(header))?.values
  } catch {
    return undefined
  }
}

/**
 * One cold list row.
 * @param {{createdAt?: number}} header
 * @param {{meta?: {name?: string, lastPromptAt?: number}, cacheValues?: Record<string, any>, title?: string}} sources
 *   meta: the bridge store entry; cacheValues: {@link cachedValues};
 *   title: a title snapshot read for this row.
 * @returns {{name: string | null, preview: string, updatedAtMs: number, blank: boolean, titleKnown: boolean, recencyKnown: boolean}}
 *   titleKnown: the store or the cache answered the name (null included);
 *   recencyKnown: a prompt time came from the cache unit or the store.
 */
export function coldRow(header, { meta = {}, cacheValues, title } = {}) {
  const values = cacheValues ?? {}
  const listMeta = values.sessionListMetadata
  const name = (typeof meta.name === 'string' && meta.name) || textOf(values.title) || textOf(title) || null
  const updatedAtMs = Math.max(timeOf(header?.createdAt), timeOf(listMeta?.lastPromptAt), timeOf(meta.lastPromptAt))
  return {
    name,
    preview: name ?? '',
    updatedAtMs,
    blank: listMeta?.blank === true && !meta.name,
    titleKnown: Boolean(meta.name) || Object.hasOwn(values, 'title'),
    recencyKnown: listMeta !== undefined || Number.isFinite(meta.lastPromptAt),
  }
}

/**
 * The log revision each session's row in this process's cache table is known
 * to reflect. The storage domain loads the table from disk once per process
 * (single-process change visibility), so checkpoints another process (the
 * DeepSeek app) writes afterwards never reach it: a log whose revision moved
 * past the recorded one may be served a stale title and lastPromptAt.
 * Recorded from the persistence listing taken once the table loaded, after a
 * replay seeded a row, and after this process disposed its own agent (the
 * disposal checkpoints). An unrecorded id is not current.
 */
export class CacheRevisions {
  #known = new Map()

  /** The listing taken when the cache started; ids recorded since keep theirs. */
  start(snapshots) {
    for (const snapshot of snapshots ?? []) {
      const id = snapshot?.header?.id
      if (id && snapshot.revision !== undefined && !this.#known.has(id)) this.#known.set(id, snapshot.revision)
    }
  }

  record(id, revision) {
    if (revision === undefined) this.#known.delete(id)
    else this.#known.set(id, revision)
  }

  /** Whether the cached row may serve a read of the log at `revision`. */
  current(id, revision) {
    return revision !== undefined && this.#known.get(id) === revision
  }
}

/**
 * thread/read without turns of a thread not loaded here: the header (one
 * stat, no log read) and its cold row. `cold` is undefined when the log
 * moved since the cache table last reflected it (`revisions`), when the cache
 * and the store cannot say the name and the recency (a session last written
 * before the bridge registered sessionListMetadata), or when a sub-agent's
 * nickname is only in its log: the caller replays the log instead, and
 * records `revision` once the replay seeded the cache.
 * @param {string} threadId
 * @param {{stat: (id: string) => Promise<{header?: object, revision?: unknown} | undefined>, cache?: object, meta?: object, revisions?: CacheRevisions}} sources
 * @returns {Promise<{header: object, revision: unknown, cold: ReturnType<typeof coldRow> | undefined}>}
 * @throws threadNotFound (errors.js) when stat finds no session.
 */
export async function readColdThread(threadId, { stat, cache, meta = {}, revisions }) {
  let snapshot
  const header = await requireSession(threadId, async () => (snapshot = await stat(threadId))?.header)
  const read = { header, revision: snapshot.revision, cold: undefined }
  if (revisions && !revisions.current(threadId, snapshot.revision)) return read
  const cold = coldRow(header, { meta, cacheValues: cachedValues(cache, header) })
  if (!cold.titleKnown || !cold.recencyKnown) return read
  if (header.origin === 'subagent' && !meta.agentLabel) return read
  return { ...read, cold }
}

/**
 * Whether a replayed log may seed the cache. A cold read (dsh-session-query
 * readSession) closes a turn still open in storage, such as one running in
 * another process, with in-memory `interrupted` closers; a checkpoint folded
 * over them would claim a turn/end the log does not hold. A durable crash
 * closer looks the same and is skipped too (the next read replays again).
 */
export function seedable(events) {
  const last = Array.isArray(events) ? events.at(-1) : undefined
  return !(last?.type === 'turn/end' && last.data?.reason?.kind === 'interrupted')
}

/** thread/list searchTerm: a case-insensitive substring of name, preview or cwd. */
export function matchesSearch(row, term) {
  if (typeof term !== 'string' || !term.trim()) return true
  const needle = term.trim().toLowerCase()
  return [row?.name, row?.preview, row?.cwd].some((value) => typeof value === 'string' && value.toLowerCase().includes(needle))
}

/**
 * Ids of the live sub-agent descendants of one session, at any depth, by
 * durable lineage (header origin 'subagent' + parentSession), as upstream's
 * subagent archive admission walks them. A fork is not a descendant.
 * @param {Array<{session?: {id?: string, header?: {origin?: string, parentSession?: string}}}>} agents ctx.agents.list()
 */
export function descendantIds(agents, rootId) {
  const childrenOf = new Map()
  for (const agent of agents ?? []) {
    const header = agent?.session?.header
    const id = agent?.session?.id
    if (!id || header?.origin !== 'subagent' || !header.parentSession) continue
    childrenOf.set(header.parentSession, [...(childrenOf.get(header.parentSession) ?? []), id])
  }
  const found = []
  const visited = new Set([rootId])
  const pending = [rootId]
  while (pending.length > 0) {
    for (const id of childrenOf.get(pending.shift()) ?? []) {
      if (visited.has(id)) continue
      visited.add(id)
      found.push(id)
      pending.push(id)
    }
  }
  return found
}

/**
 * Whether any of `owners` owns a background job that has not settled
 * (dsh-jobs JobRegistry.list; upstream's job archive admission asks the
 * same). A registry that throws counts as none.
 */
export function ownsRunningJob(jobs, owners) {
  if (typeof jobs?.list !== 'function') return false
  return owners.some((owner) => {
    try {
      return jobs.list(owner).some((job) => job.owner === owner && (job.status === 'running' || job.status === 'stopping'))
    } catch {
      return false
    }
  })
}

/**
 * Whether a loaded thread must stay loaded when the client unsubscribes:
 * closing cancels the agent, drains its continuable sub-agents and, with
 * them, cancels every background job they own (dsh-jobs owner cleanup), so
 * any work in flight (a turn, a card, queued input, a compaction, a running
 * child, a running job) keeps the write lock until it ends.
 */
export function mustStayLoaded({ running = false, activeTurn = false, pendingRequests = 0, queued = 0, compacting = false, runningChildren = false, jobsRunning = false } = {}) {
  return running || activeTurn || pendingRequests > 0 || queued > 0 || compacting || runningChildren || jobsRunning
}
