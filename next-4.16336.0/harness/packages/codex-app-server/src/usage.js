/**
 * account/usage/read on the DeepSeek core: the Codex GetAccountTokenUsageResponse
 * folded from Harness session logs (every session under DSH_HOME, so DeepSeek
 * Harness App sessions count too).
 *
 *   tokens   usage.inputTokens + usage.outputTokens of each buffered message
 *            or streamed response's complete assistant/attempt,
 *            bucketed by the event's local day. Harness TokenUsage is
 *            disjoint (inputTokens is uncached input only), so prefix-cache
 *            reads and writes are never added: the original's input + output.
 *   turns    turn/start → turn/end wall time, for longestRunningTurnSec.
 *   forks    a fork's log starts with a copy of its parent's history; only
 *            events after its last `session/end-seed {inherited:true}` count.
 *
 * codeDesktop/stats/read (the home stats card) is the original getCodeStats
 * shape (cc43287c9-BMbiZYzF.js:3987-4004 $O; code-home.js:13711-13751 Iw reads
 * it) folded from the same logs by foldSessionStats/codeStats.
 *
 * The response's extra `deepseek` field (bridge extension; Codex readers ignore
 * it) is the Usage page's estimated cost: foldSessionBilling keeps each
 * response's tokens by local day, model, price tier and category, and
 * deepseekUsage prices them with pricing.js.
 *
 * Folds are cached per session by the persistence revision, in memory and in
 * `<stateDir>/usage-cache.json`, so a refresh re-reads only changed logs.
 */
import { AssistantUsageFold } from './assistant-response.js'

import fs from 'node:fs'
import path from 'node:path'
import { DEEPSEEK_PRICES, PRICING_URL, costCny, modelDisplayName, priceTable, pricedModel, pricingTier } from './pricing.js'

const MAX = Number.MAX_SAFE_INTEGER
const count = (value) => (Number.isSafeInteger(value) && value > 0 ? value : 0)
const add = (left, right) => Math.min(MAX, left + right)

/** YYYY-MM-DD of an epoch-ms time in the local time zone. */
export function localDayKey(time) {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * One session's usage.
 * @param {readonly object[]} events - the session's raw event log
 * @returns {{days: Record<string, number>, longestTurnSec: number}}
 */
export function foldSessionUsage(events) {
  const responses = new AssistantUsageFold()
  let days = {}
  let starts = new Map()
  let longestTurnSec = 0
  for (const event of events ?? []) {
    if (!event || typeof event !== 'object') continue
    const response = responses.push(event)
    const time = event.time
    const usage = response?.usage
    if (usage && Number.isFinite(time)) {
      const tokens = add(count(usage.inputTokens), count(usage.outputTokens))
      if (tokens > 0) {
        const key = localDayKey(time)
        days[key] = add(days[key] ?? 0, tokens)
      }
    }
    switch (event.type) {
      case 'session/end-seed':
        // Everything before the fork cut is the parent's (already counted there).
        if (event.data?.inherited === true) {
          days = {}
          starts = new Map()
          longestTurnSec = 0
        }
        break
      case 'turn/start':
        if (Number.isFinite(time)) starts.set(event.data?.turn, time)
        break
      case 'turn/end': {
        const start = starts.get(event.data?.turn)
        starts.delete(event.data?.turn)
        if (Number.isFinite(start) && Number.isFinite(time) && time >= start) longestTurnSec = Math.max(longestTurnSec, Math.min(MAX, Math.floor((time - start) / 1000)))
        break
      }
    }
  }
  return { days, longestTurnSec }
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/
// A model id is an object key below; a prototype key is never a model.
const modelKey = (model) => (typeof model === 'string' && model && model !== '__proto__' ? model : null)
const emptyModelUsage = () => ({ inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 })
// A human prompt (the projection's userMessage rule): runtime notices and injected context are not messages.
const humanPrompt = (event) => event.data?.source?.kind === 'user'

/**
 * One session's home-card stats, per local day, after the same fork cut as
 * foldSessionUsage. A day records
 *   sessions   1 on the day of the session's first human prompt (codeStats
 *              ignores it for a sub-agent child, whose delegated prompt has
 *              the same source.kind 'user')
 *   messages   human prompts + assistant responses (segments count once)
 *   toolCalls  tool/call events
 *   hours      messages by local hour of day
 *   models     uncached input + output tokens by the response's source model
 * and `models` sums each model's input / output / cache-read / cache-write usage.
 * @param {readonly object[]} events - the session's raw event log
 * @returns {{days: Record<string, {sessions: number, messages: number, toolCalls: number, hours: Record<string, number>, models: Record<string, number>}>, models: Record<string, {inputTokens: number, outputTokens: number, cacheReadInputTokens: number, cacheCreationInputTokens: number}>}}
 */
export function foldSessionStats(events) {
  const responses = new AssistantUsageFold()
  let days = {}
  let models = {}
  let started = false
  const day = (time) => (days[localDayKey(time)] ??= { sessions: 0, messages: 0, toolCalls: 0, hours: {}, models: {} })
  const message = (time) => {
    const entry = day(time)
    const hour = new Date(time).getHours()
    entry.messages = add(entry.messages, 1)
    entry.hours[hour] = add(entry.hours[hour] ?? 0, 1)
    return entry
  }
  for (const event of events ?? []) {
    if (!event || typeof event !== 'object') continue
    const response = responses.push(event)
    const time = event.time
    if (response && Number.isFinite(time) && (response.message || response.usage)) {
      const entry = response.message ? message(time) : day(time)
      const usage = response.usage
      const model = modelKey(response.model)
      if (usage && model) {
        const input = count(usage.inputTokens), output = count(usage.outputTokens)
        const tokens = add(input, output)
        if (tokens > 0) entry.models[model] = add(entry.models[model] ?? 0, tokens)
        const record = (models[model] ??= emptyModelUsage())
        record.inputTokens = add(record.inputTokens, input)
        record.outputTokens = add(record.outputTokens, output)
        record.cacheReadInputTokens = add(record.cacheReadInputTokens, count(usage.cacheReadTokens))
        record.cacheCreationInputTokens = add(record.cacheCreationInputTokens, count(usage.cacheWriteTokens))
      }
    }
    switch (event.type) {
      case 'session/end-seed':
        // Everything before the fork cut is the parent's (already counted there).
        if (event.data?.inherited === true) {
          days = {}
          models = {}
          started = false
        }
        break
      case 'user/message': {
        if (!humanPrompt(event) || !Number.isFinite(time)) break
        const entry = message(time)
        if (!started) entry.sessions = add(entry.sessions, 1)
        started = true
        break
      }
      case 'tool/call': {
        if (!Number.isFinite(time)) break
        const entry = day(time)
        entry.toolCalls = add(entry.toolCalls, 1)
        break
      }
    }
  }
  return { days, models }
}

/**
 * codeDesktop/stats/read: the original stats object over every session's
 * foldSessionStats. dailyActivity lists only days with activity (Iw counts its
 * entries as active days), both lists ascend by date, modelUsage is all-time
 * and peakActivityHour is the busiest local hour of all time (null when idle;
 * the earliest hour wins a tie). Every number is a safe integer.
 *
 * A sub-agent child (`subagent: true`, header.origin 'subagent', flagged by
 * sessionUsageSummaries) adds its messages, tool calls and tokens but no
 * session: the Harness driver hands it the delegated prompt as a
 * `source.kind: 'user'` message, and the app's session list (thread/list)
 * excludes children.
 * @param {{stats?: ReturnType<typeof foldSessionStats>, subagent?: boolean}[]} summaries
 */
export function codeStats(summaries) {
  const activity = new Map()
  const tokens = new Map()
  const modelUsage = new Map()
  const hours = Array.from({ length: 24 }, () => 0)
  for (const summary of summaries ?? []) {
    const stats = summary?.stats
    const subagent = summary?.subagent === true
    for (const [date, entry] of Object.entries(stats?.days ?? {})) {
      if (!DAY_KEY.test(date) || !entry || typeof entry !== 'object') continue
      const day = activity.get(date) ?? { date, messageCount: 0, sessionCount: 0, toolCallCount: 0 }
      day.messageCount = add(day.messageCount, count(entry.messages))
      if (!subagent) day.sessionCount = add(day.sessionCount, count(entry.sessions))
      day.toolCallCount = add(day.toolCallCount, count(entry.toolCalls))
      activity.set(date, day)
      for (const [hour, value] of Object.entries(entry.hours ?? {})) {
        const index = Number(hour)
        if (Number.isInteger(index) && index >= 0 && index < 24) hours[index] = add(hours[index], count(value))
      }
      for (const [name, value] of Object.entries(entry.models ?? {})) {
        const model = modelKey(name)
        if (!model || count(value) === 0) continue
        const byModel = tokens.get(date) ?? new Map()
        byModel.set(model, add(byModel.get(model) ?? 0, count(value)))
        tokens.set(date, byModel)
      }
    }
    for (const [name, record] of Object.entries(stats?.models ?? {})) {
      const model = modelKey(name)
      if (!model || !record || typeof record !== 'object') continue
      const total = modelUsage.get(model) ?? emptyModelUsage()
      for (const field of Object.keys(total)) total[field] = add(total[field], count(record[field]))
      modelUsage.set(model, total)
    }
  }
  let peakActivityHour = null, peak = 0
  hours.forEach((value, hour) => {
    if (value > peak) {
      peak = value
      peakActivityHour = hour
    }
  })
  const byDate = (left, right) => (left < right ? -1 : left > right ? 1 : 0)
  return {
    dailyActivity: [...activity.keys()].sort(byDate).map((date) => activity.get(date))
      .filter((day) => day.messageCount > 0 || day.sessionCount > 0 || day.toolCallCount > 0),
    dailyModelTokens: [...tokens.keys()].sort(byDate).map((date) => ({ date, tokensByModel: Object.fromEntries(tokens.get(date)) })),
    modelUsage: Object.fromEntries(modelUsage),
    peakActivityHour,
  }
}

// A billing cell: [inputTokens (cache miss), cacheReadTokens, cacheWriteTokens, outputTokens].
const CATEGORIES = ['inputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'outputTokens']
const TIERS = ['offPeak', 'peak']
// assistant/message without a source model: counted, never priced.
export const UNKNOWN_MODEL = 'unknown'

/**
 * One session's billable tokens, after the same fork cut as foldSessionUsage:
 * {[local day]: {[source model]: {offPeak?: cell, peak?: cell}}}, where the
 * tier is the message time's DeepSeek price window (pricing.js) and a cell is
 * [inputTokens, cacheReadTokens, cacheWriteTokens, outputTokens] (Harness
 * TokenUsage is disjoint: inputTokens is the cache-miss input; reasoning is
 * part of outputTokens). Counts only, so a price change needs no refold.
 * @param {readonly object[]} events - the session's raw event log
 * @returns {Record<string, Record<string, Partial<Record<'offPeak' | 'peak', number[]>>>>}
 */
export function foldSessionBilling(events) {
  const responses = new AssistantUsageFold()
  let days = {}
  for (const event of events ?? []) {
    if (!event || typeof event !== 'object') continue
    const response = responses.push(event)
    if (event.type === 'session/end-seed' && event.data?.inherited === true) days = {}
    const usage = response?.usage
    const time = event.time
    if (!usage || !Number.isFinite(time)) continue
    const counts = CATEGORIES.map((field) => count(usage[field]))
    if (counts.every((value) => value === 0)) continue
    const model = modelKey(response?.model) ?? UNKNOWN_MODEL
    const day = (days[localDayKey(time)] ??= {})
    const byTier = (day[model] ??= {})
    const cell = (byTier[pricingTier(time)] ??= [0, 0, 0, 0])
    counts.forEach((value, index) => { cell[index] = add(cell[index], value) })
  }
  return days
}

/** foldSessionUsage + foldSessionStats + foldSessionBilling: the per-session summary the cache keeps. */
export function foldSession(events) {
  return { ...foldSessionUsage(events), stats: foldSessionStats(events), billing: foldSessionBilling(events) }
}

const round6 = (value) => Math.round(value * 1e6) / 1e6
const emptyTally = () => ({ inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, peakTokens: 0, unpricedTokens: 0, input: 0, cacheRead: 0, output: 0 })
function tallyCell(tally, model, tier, cell, table = DEEPSEEK_PRICES) {
  CATEGORIES.forEach((field, index) => { tally[field] = add(tally[field], cell[index]) })
  const tokens = cell.reduce(add, 0)
  if (tier === 'peak') tally.peakTokens = add(tally.peakTokens, tokens)
  const cost = costCny(model, tier, Object.fromEntries(CATEGORIES.map((field, index) => [field, cell[index]])), table)
  if (!cost) {
    tally.unpricedTokens = add(tally.unpricedTokens, tokens)
    return
  }
  tally.input += cost.input
  tally.cacheRead += cost.cacheRead
  tally.output += cost.output
}
/**
 * A tally as the response's totals. tokens = every billed token (miss + hit +
 * write + output). Costs are CNY rounded to 6 decimals; null when every token
 * is from an unpriced model (unknown, not free). unpricedTokens > 0 with a
 * number means the cost covers the priced part only.
 */
function totalsOf(tally) {
  const tokens = CATEGORIES.reduce((sum, field) => add(sum, tally[field]), 0)
  const unknown = tokens > 0 && tally.unpricedTokens === tokens
  const money = (value) => (unknown ? null : round6(value))
  return {
    tokens,
    inputTokens: tally.inputTokens,
    cacheReadTokens: tally.cacheReadTokens,
    cacheWriteTokens: tally.cacheWriteTokens,
    outputTokens: tally.outputTokens,
    peakTokens: tally.peakTokens,
    unpricedTokens: tally.unpricedTokens,
    costCny: money(tally.input + tally.cacheRead + tally.output),
    inputCostCny: money(tally.input),
    cacheReadCostCny: money(tally.cacheRead),
    outputCostCny: money(tally.output),
  }
}

const validCell = (cell) => Array.isArray(cell) && cell.length === CATEGORIES.length && cell.every((value) => Number.isSafeInteger(value) && value >= 0)
const tallyFor = (map, key) => map.get(key) ?? map.set(key, emptyTally()).get(key)

/**
 * The `deepseek` extension of account/usage/read: estimated CNY at DeepSeek's
 * official prices (pricing.js) over every session's billing fold.
 *   allTime / last30Days / today   totals (last 30 days = today and the 29 local days before)
 *   models   all-time totals per priced model (old Flash ids merge into
 *            deepseek-flash) or raw model id, most tokens first, with displayName
 *   daily    totals per local day with tokens, ascending
 * customPrices is true when the table is not the official one (Settings →
 * Models → Pricing overrides).
 * @param {{billing?: ReturnType<typeof foldSessionBilling>}[]} summaries
 * @param {string} todayKey - local YYYY-MM-DD
 * @param {Record<string, object>} [table] - pricing.js priceTable(overrides)
 */
export function deepseekUsage(summaries, todayKey, table = DEEPSEEK_PRICES) {
  const today = typeof todayKey === 'string' && DAY_KEY.test(todayKey) ? todayKey : null
  const cutoff = today ? dayOffset(today, -29) : null
  const all = emptyTally(), recent = emptyTally(), current = emptyTally()
  const days = new Map(), models = new Map()
  for (const summary of summaries ?? []) {
    const billing = summary?.billing
    if (!isRecord(billing)) continue
    for (const [date, byModel] of Object.entries(billing)) {
      if (!DAY_KEY.test(date) || !isRecord(byModel)) continue
      for (const [name, byTier] of Object.entries(byModel)) {
        const model = modelKey(name)
        if (!model || !isRecord(byTier)) continue
        const group = pricedModel(model, table) ?? model
        for (const tier of TIERS) {
          const cell = byTier[tier]
          if (!validCell(cell)) continue
          const targets = [all, tallyFor(models, group), tallyFor(days, date)]
          if (cutoff && date >= cutoff && date <= today) targets.push(recent)
          if (date === today) targets.push(current)
          for (const tally of targets) tallyCell(tally, model, tier, cell, table)
        }
      }
    }
  }
  return {
    currency: 'CNY',
    pricingUrl: PRICING_URL,
    customPrices: table !== DEEPSEEK_PRICES,
    allTime: totalsOf(all),
    last30Days: totalsOf(recent),
    today: totalsOf(current),
    models: [...models].map(([model, tally]) => ({ model, displayName: modelDisplayName(model, table), ...totalsOf(tally) }))
      .filter((entry) => entry.tokens > 0)
      .sort((left, right) => right.tokens - left.tokens || (left.model < right.model ? -1 : 1)),
    daily: [...days.keys()].sort().map((date) => ({ date, ...totalsOf(days.get(date)) })).filter((day) => day.tokens > 0),
  }
}

const parseDay = (key) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
// Calendar days between two keys; rounding absorbs a DST hour.
const daysBetween = (left, right) => Math.round((parseDay(right).getTime() - parseDay(left).getTime()) / 864e5)
const dayOffset = (key, offset) => {
  const date = parseDay(key)
  date.setDate(date.getDate() + offset)
  return localDayKey(date.getTime())
}

/**
 * The Codex GetAccountTokenUsageResponse over every session's fold. Streaks
 * follow the original heavy-work worker: the current streak counts active days
 * back from today (0 when today has none), the longest is the longest run of
 * consecutive active days. Every Codex number is a safe integer; the extra
 * `deepseek` field (deepseekUsage) carries the estimated cost.
 * @param {{days?: Record<string, number>, longestTurnSec?: number, billing?: object}[]} summaries
 * @param {string} todayKey - local YYYY-MM-DD
 * @param {object | null} [prices] - the app's price overrides (params.codeDesktop.prices), merged over the official table
 */
export function accountTokenUsage(summaries, todayKey, prices) {
  const daily = new Map()
  let longestRunningTurnSec = 0
  for (const summary of summaries ?? []) {
    for (const [key, tokens] of Object.entries(summary?.days ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || count(tokens) === 0) continue
      daily.set(key, add(daily.get(key) ?? 0, count(tokens)))
    }
    longestRunningTurnSec = Math.max(longestRunningTurnSec, count(summary?.longestTurnSec))
  }
  const keys = [...daily.keys()].sort()
  let lifetimeTokens = 0, peakDailyTokens = 0
  for (const key of keys) {
    lifetimeTokens = add(lifetimeTokens, daily.get(key))
    peakDailyTokens = Math.max(peakDailyTokens, daily.get(key))
  }
  let longestStreakDays = 0, run = 0
  keys.forEach((key, index) => {
    run = index > 0 && daysBetween(keys[index - 1], key) === 1 ? run + 1 : 1
    longestStreakDays = Math.max(longestStreakDays, run)
  })
  let currentStreakDays = 0
  if (typeof todayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayKey)) {
    const cursor = parseDay(todayKey)
    while (daily.has(localDayKey(cursor.getTime()))) {
      currentStreakDays++
      cursor.setDate(cursor.getDate() - 1)
    }
  }
  return {
    summary: { lifetimeTokens, peakDailyTokens, longestRunningTurnSec, currentStreakDays, longestStreakDays },
    dailyUsageBuckets: keys.map((startDate) => ({ startDate, tokens: daily.get(startDate) })),
    threadUsage: null,
    deepseek: deepseekUsage(summaries, todayKey, priceTable(prices)),
  }
}

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const safeCount = (value) => Number.isSafeInteger(value) && value >= 0
const countsOf = (value) => isRecord(value) && Object.values(value).every(safeCount)
const validStats = (stats) =>
  isRecord(stats) && isRecord(stats.days) && isRecord(stats.models)
  && Object.values(stats.days).every((day) => isRecord(day) && safeCount(day.sessions) && safeCount(day.messages) && safeCount(day.toolCalls) && countsOf(day.hours) && countsOf(day.models))
  && Object.values(stats.models).every((usage) => isRecord(usage) && Object.keys(emptyModelUsage()).every((field) => safeCount(usage[field])))
const validSummary = (summary) =>
  !!summary && typeof summary === 'object' && !!summary.days && typeof summary.days === 'object' && !Array.isArray(summary.days)
  && Object.values(summary.days).every((tokens) => Number.isSafeInteger(tokens) && tokens >= 0)
  && Number.isSafeInteger(summary.longestTurnSec) && summary.longestTurnSec >= 0
  && validStats(summary.stats)
  && isRecord(summary.billing)
  && Object.values(summary.billing).every((day) => isRecord(day) && Object.values(day).every((byTier) =>
    isRecord(byTier) && Object.entries(byTier).every(([tier, cell]) => TIERS.includes(tier) && validCell(cell))))

// Version 4 joins streamed response segments and bills full attempts.
// Version 2 added the per-session `stats` fold, version 3 the `billing` fold
// (foldSession); an older file is refolded once.
const CACHE_VERSION = 4

/**
 * Per-session folds keyed by persistence revision, persisted as
 * {version:4, timeZone, sessions:{id:{revision, summary}}}. Day keys are
 * local, so a file written in another time zone is dropped.
 */
export class UsageCache {
  constructor(dir, { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone } = {}) {
    this.file = dir ? path.join(dir, 'usage-cache.json') : null
    this.timeZone = timeZone
    this.sessions = new Map()
    // Unreadable logs by revision, this process only: retried once they change.
    this.failures = new Map()
    this.dirty = false
    if (!this.file) return
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      if (parsed?.version !== CACHE_VERSION || parsed.timeZone !== timeZone || !parsed.sessions || typeof parsed.sessions !== 'object') return
      for (const [id, entry] of Object.entries(parsed.sessions)) {
        if (typeof entry?.revision === 'string' && validSummary(entry.summary)) this.sessions.set(id, { revision: entry.revision, summary: entry.summary })
      }
    } catch {}
  }

  get(id, revision) {
    const entry = this.sessions.get(id)
    return entry && entry.revision === revision ? entry.summary : undefined
  }

  set(id, revision, summary) {
    this.sessions.set(id, { revision, summary })
    this.failures.delete(id)
    this.dirty = true
  }

  failed(id, revision) {
    return this.failures.get(id) === revision
  }

  markFailed(id, revision) {
    this.failures.set(id, revision)
  }

  /** Forget sessions no longer listed (deleted, or removed from DSH_HOME). */
  retain(ids) {
    for (const id of [...this.sessions.keys()]) {
      if (ids.has(id)) continue
      this.sessions.delete(id)
      this.dirty = true
    }
    for (const id of [...this.failures.keys()]) if (!ids.has(id)) this.failures.delete(id)
  }

  flush() {
    if (!this.dirty || !this.file) return
    this.dirty = false
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      const temp = `${this.file}.${process.pid}.tmp`
      fs.writeFileSync(temp, JSON.stringify({ version: CACHE_VERSION, timeZone: this.timeZone, sessions: Object.fromEntries(this.sessions) }))
      fs.renameSync(temp, this.file)
    } catch (error) {
      process.stderr.write(`codex-app-server: could not save ${this.file}: ${error.message}\n`)
    }
  }
}

/**
 * Fold every listed session: live ones from memory, unchanged ones from the
 * cache, the rest read (at most `concurrency` at a time) and cached by
 * revision. A session without a revision, or live in another owner, is
 * folded but not cached. A failed read skips that session; an unreadable
 * revision is not read (or reported) again until it changes. A session listed
 * with `subagent: true` comes back as a copy of its fold flagged `subagent`
 * (for codeStats); the cache keeps the plain fold, so the flag never affects
 * revision reuse.
 * @param {{
 *   sessions: {id: string, revision?: string, live?: boolean, subagent?: boolean}[],
 *   cache: UsageCache,
 *   liveEvents: (id: string) => readonly object[] | undefined,
 *   readEvents: (id: string) => Promise<readonly object[]>,
 *   concurrency?: number,
 *   onError?: (id: string, error: unknown) => void,
 * }} input
 */
export async function sessionUsageSummaries({ sessions, cache, liveEvents, readEvents, concurrency = 4, onError }) {
  const summaries = []
  const stale = []
  const keep = (session, summary) => summaries.push(session.subagent === true ? { ...summary, subagent: true } : summary)
  for (const session of sessions) {
    const events = liveEvents(session.id)
    if (events) {
      keep(session, foldSession(events))
      continue
    }
    const cacheable = typeof session.revision === 'string' && !session.live
    if (cacheable && cache.failed(session.id, session.revision)) continue
    const hit = cacheable ? cache.get(session.id, session.revision) : undefined
    if (hit) keep(session, hit)
    else stale.push({ ...session, cacheable })
  }
  let next = 0
  const worker = async () => {
    while (next < stale.length) {
      const session = stale[next++]
      let events
      try {
        events = await readEvents(session.id)
      } catch (error) {
        if (session.cacheable) cache.markFailed(session.id, session.revision)
        onError?.(session.id, error)
        continue
      }
      const summary = foldSession(events)
      keep(session, summary)
      if (session.cacheable) cache.set(session.id, session.revision, summary)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, stale.length)) }, worker))
  cache.retain(new Set(sessions.map((session) => session.id)))
  cache.flush()
  return summaries
}
