/**
 * Rolling plan-limit updates (Codex account/rateLimits/updated).
 *
 * Codex sends the notification after every turn, so the client's usage ring and composer notice stay current; ZCode's
 * own desktop polls the Coding Plan quota the same way (usageStatsService). The bridge refetches the quota after a
 * turn ends, at most once per `minIntervalMs` (a later turn inside the window schedules one trailing refetch), and
 * at once after a turn that failed on the plan limit. A bucket is announced only when it changed from the last one
 * the client saw (from account/rateLimits/read or an earlier update); an empty or failed read announces nothing.
 */

const URGENT = new Set(['usageLimitExceeded', 'rateLimitExceeded'])

const bucketsOf = (result) => {
  const byId = result?.rateLimitsByLimitId && typeof result.rateLimitsByLimitId === 'object' ? result.rateLimitsByLimitId : null
  const base = result?.rateLimits ?? null
  const buckets = new Map()
  if (base && (base.primary || base.secondary)) buckets.set(base.limitId || 'codex', base)
  if (byId) for (const [id, snapshot] of Object.entries(byId)) if (snapshot && (snapshot.primary || snapshot.secondary) && !buckets.has(id)) buckets.set(id, { ...snapshot, limitId: snapshot.limitId || id })
  return buckets
}

export class RateLimitWatch {
  /**
   * @param {{ read: () => Promise<object>, notify: (method: string, params: object) => void, minIntervalMs?: number,
   *   now?: () => number, setTimer?: typeof setTimeout, clearTimer?: typeof clearTimeout, log?: (line: string) => void }} options
   */
  constructor({ read, notify, minIntervalMs = 30_000, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, log = () => {} }) {
    Object.assign(this, { read, notify, minIntervalMs, now, setTimer, clearTimer, log })
    this.seen = new Map()
    this.lastFetchAt = null
    this.timer = null
    this.inFlight = null
    this.again = false
    this.stopped = false
  }

  /** A quota read the client received (account/rateLimits/read): the baseline later updates are compared with. */
  observe(result) {
    this.lastFetchAt = this.now()
    for (const [id, snapshot] of bucketsOf(result)) this.seen.set(id, JSON.stringify(snapshot))
    return result
  }

  /** A turn ended: refetch now when it hit the plan limit or the last fetch is old enough, else once the window ends. */
  turnCompleted(turn) {
    if (this.stopped) return
    const info = turn?.error?.codexErrorInfo
    const urgent = typeof info === 'string' && URGENT.has(info)
    const wait = urgent || this.lastFetchAt === null ? 0 : Math.max(0, this.lastFetchAt + this.minIntervalMs - this.now())
    if (wait === 0) {
      this.cancel()
      void this.refresh()
      return
    }
    if (this.timer) return
    this.timer = this.setTimer(() => { this.timer = null; void this.refresh() }, wait)
    this.timer?.unref?.()
  }

  async refresh() {
    if (this.stopped) return
    if (this.inFlight) { this.again = true; return this.inFlight }
    this.inFlight = (async () => {
      try {
        this.lastFetchAt = this.now()
        const result = await this.read()
        if (this.stopped) return
        for (const [id, snapshot] of bucketsOf(result)) {
          const key = JSON.stringify(snapshot)
          if (this.seen.get(id) === key) continue
          this.seen.set(id, key)
          this.notify('account/rateLimits/updated', { rateLimits: snapshot })
        }
      } catch (error) {
        this.log(`zcode-bridge: quota refresh: ${error?.message || error}`)
      } finally {
        this.inFlight = null
      }
    })()
    await this.inFlight
    if (this.again && !this.stopped) { this.again = false; await this.refresh() }
  }

  /** The account changed: the next read is a new baseline, and nothing pending refers to the old account. */
  reset() {
    this.cancel()
    this.seen.clear()
    this.lastFetchAt = null
  }

  cancel() {
    if (this.timer) this.clearTimer(this.timer)
    this.timer = null
  }

  stop() {
    this.stopped = true
    this.cancel()
  }
}
