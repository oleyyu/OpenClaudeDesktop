/**
 * Token usage from ZCode's own ledger: `usage/stats` (the agent's aggregation of its session database — the data
 * behind ZCode's usage page) for daily tokens, streaks and per-model totals, plus a read-only look at the session
 * database for per-day session counts and the busiest hour.
 */

import fs from 'node:fs'

/** Every heatmap day ({date, totalTokens, turnCount, toolCallCount}) of a usage/stats snapshot. */
export function heatmapDays(snapshot) {
  return (snapshot?.heatmap?.weeks ?? []).flatMap((week) => week.days ?? []).filter((day) => day && typeof day.date === 'string')
}

/** account/usage/read */
export function accountUsage(snapshot, todayKey = localDay(Date.now())) {
  const days = heatmapDays(snapshot)
  const summary = snapshot?.summary ?? {}
  const count = (value) => (Number.isFinite(value) && value > 0 ? value : 0)
  // The core-neutral breakdown the Usage page reads (app usage-cost-model.mjs, as acp-bridge usage.js emits it): ZCode's
  // inputTokens are the whole input, its cache fields a breakdown of it (usage-stats-builder.ts), so uncached input is
  // what is left. The daily heatmap has totals only, so the 30-day and today tiles carry tokens alone.
  const cacheRead = count(summary.cacheReadTokens), cacheWrite = count(summary.cacheCreationTokens)
  const cutoff = (() => { const [year, month, day] = todayKey.split('-').map(Number); return localDay(new Date(year, month - 1, day - 29).getTime()) })()
  const daySum = (filter) => ({ tokens: days.filter((day) => filter(day.date)).reduce((total, day) => total + count(day.totalTokens), 0), inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, unpricedTokens: 0, costCny: null })
  const breakdown = {
    allTime: { tokens: count(summary.totalTokens), inputTokens: Math.max(0, count(summary.inputTokens) - cacheRead - cacheWrite), cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, outputTokens: count(summary.outputTokens), unpricedTokens: 0, costCny: null },
    last30Days: daySum((date) => date >= cutoff && date <= todayKey),
    today: daySum((date) => date === todayKey),
    models: (snapshot?.models ?? []).filter((model) => count(model.totalTokens) > 0).map((model) => ({ model: model.modelId ?? 'unknown', displayName: model.modelId ?? 'unknown', tokens: count(model.totalTokens), inputTokens: count(model.inputTokens), outputTokens: count(model.outputTokens), costCny: null })),
    daily: days.filter((day) => count(day.totalTokens) > 0).map((day) => ({ date: day.date, tokens: count(day.totalTokens), costCny: null })),
    priced: false,
  }
  return {
    summary: {
      lifetimeTokens: summary.totalTokens ?? 0, peakDailyTokens: summary.peakDayTokens ?? 0,
      longestRunningTurnSec: Math.round((summary.longestSessionMs ?? 0) / 1000), currentStreakDays: summary.currentStreakDays ?? 0, longestStreakDays: summary.longestStreakDays ?? 0,
    },
    dailyUsageBuckets: days.filter((day) => day.totalTokens > 0).map((day) => ({ startDate: day.date, tokens: day.totalTokens })),
    threadUsage: null,
    breakdown,
    zcode: {
      totals: { tokens: summary.totalTokens ?? 0, inputTokens: summary.inputTokens ?? 0, outputTokens: summary.outputTokens ?? 0, reasoningTokens: summary.reasoningTokens ?? 0, cacheReadTokens: summary.cacheReadTokens ?? 0, cacheWriteTokens: summary.cacheCreationTokens ?? 0 },
      models: (snapshot?.models ?? []).map((model) => ({ model: model.modelId, tokens: model.totalTokens, inputTokens: model.inputTokens, outputTokens: model.outputTokens, requests: model.requestCount })),
      sessions: summary.totalSessions ?? 0, turns: summary.totalTurns ?? 0, toolCalls: summary.toolCallCount ?? 0, timeZone: snapshot?.timeZone ?? null,
    },
  }
}

/** Per-day session counts and the busiest local hour from the session database (read-only). */
export async function databaseActivity(dbPath) {
  if (!dbPath || !fs.existsSync(dbPath)) return { sessionsByDay: {}, peakHour: null }
  let db
  try {
    const { DatabaseSync } = await import('node:sqlite')
    db = new DatabaseSync(dbPath, { readOnly: true })
    const sessionsByDay = {}
    for (const row of db.prepare('select time_created from session where parent_id is null').all()) {
      const day = localDay(row.time_created)
      sessionsByDay[day] = (sessionsByDay[day] ?? 0) + 1
    }
    const hours = new Array(24).fill(0)
    for (const row of db.prepare('select started_at from turn_usage').all()) if (Number.isFinite(row.started_at)) hours[new Date(row.started_at).getHours()]++
    const max = Math.max(...hours)
    return { sessionsByDay, peakHour: max > 0 ? hours.indexOf(max) : null }
  } catch {
    return { sessionsByDay: {}, peakHour: null }
  } finally {
    try { db?.close() } catch {}
  }
}

export const localDay = (ms) => {
  const date = new Date(ms)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** codeDesktop/stats/read (the home stats card). */
export function codeStats(snapshot, activity = { sessionsByDay: {}, peakHour: null }) {
  const days = heatmapDays(snapshot)
  const dailyActivity = days.filter((day) => day.turnCount > 0 || day.toolCallCount > 0 || activity.sessionsByDay[day.date]).map((day) => ({
    date: day.date, messageCount: day.turnCount ?? 0, sessionCount: activity.sessionsByDay[day.date] ?? 0, toolCallCount: day.toolCallCount ?? 0,
  }))
  const dailyModelTokens = (snapshot?.dailyModelUsage ?? []).map((entry) => ({ date: entry.date, tokensByModel: Object.fromEntries((entry.models ?? []).map((model) => [model.modelId ?? 'unknown', model.totalTokens ?? 0])) }))
  const modelUsage = Object.fromEntries((snapshot?.models ?? []).map((model) => [model.modelId ?? 'unknown', { inputTokens: model.inputTokens ?? 0, outputTokens: model.outputTokens ?? 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 }]))
  return { dailyActivity, dailyModelTokens, modelUsage, peakActivityHour: activity.peakHour }
}

/** Remove a session (and its forks' parent links) from ZCode's own database: the agent's history. */
export async function deleteSessionRows(dbPath, sessionId) {
  if (!dbPath || !fs.existsSync(dbPath)) return false
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(dbPath)
  try {
    db.exec('PRAGMA busy_timeout = 5000')
    db.exec('PRAGMA foreign_keys = ON')
    const columns = new Set(db.prepare('PRAGMA table_info(session)').all().map((row) => row.name))
    if (!columns.has('id')) return false
    const result = db.prepare('delete from session where id = ?').run(sessionId)
    // Prompt history rows name the session without a foreign key.
    const tables = new Set(db.prepare("select name from sqlite_master where type = 'table'").all().map((row) => row.name))
    if (tables.has('input_history')) db.prepare('delete from input_history where session_id = ?').run(sessionId)
    return result.changes > 0
  } finally {
    db.close()
  }
}

/**
 * A session's rewind state (ZCode's `session.revert`: keptMessageIDs, branchCutAfterMessageID, targetMessageID, …)
 * from its database row, read-only. The protocol's session/messages does not apply it, so the bridge does.
 */
export async function sessionRevert(dbPath, sessionId) {
  if (!dbPath || !sessionId || !fs.existsSync(dbPath)) return null
  let db
  try {
    const { DatabaseSync } = await import('node:sqlite')
    db = new DatabaseSync(dbPath, { readOnly: true })
    const columns = new Set(db.prepare('PRAGMA table_info(session)').all().map((row) => row.name))
    if (!columns.has('revert')) return null
    const row = db.prepare('select revert from session where id = ?').get(sessionId)
    if (!row?.revert) return null
    const value = typeof row.revert === 'string' ? JSON.parse(row.revert) : row.revert
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  } finally {
    try { db?.close() } catch {}
  }
}

// node:sqlite, loaded once (storedMessages reads synchronously, in step with the live stream).
let sqlite = null
const sqliteReady = import('node:sqlite').then((module) => { sqlite = module }).catch(() => {})
export const loadSqlite = () => sqliteReady

/**
 * A session's messages as session/messages lists them ({info: {…, id, sessionID}, parts: [{…, id, sessionID, messageID}]}),
 * read-only from ZCode's database, synchronously. ZCode serves session/messages only for a session it has open, and a
 * sub-agent's child session never is: its text and thinking are only here (the live stream mirrors its tools alone).
 * fromSequence: only messages at or after this per-session sequence. null when the database can't be read.
 */
export function storedMessages(dbPath, sessionId, { fromSequence = null } = {}) {
  if (!sqlite || !dbPath || !sessionId || !fs.existsSync(dbPath)) return null
  let db
  try {
    db = new sqlite.DatabaseSync(dbPath, { readOnly: true })
    db.exec('PRAGMA busy_timeout = 2000')
    const columns = new Set(db.prepare('PRAGMA table_info(message)').all().map((row) => row.name))
    if (!columns.has('data') || !columns.has('session_id')) return null
    const ordered = columns.has('sequence')
    const rows = ordered && Number.isInteger(fromSequence)
      ? db.prepare('select id, data, sequence from message where session_id = ? and sequence >= ? order by sequence, time_created, id').all(sessionId, fromSequence)
      : db.prepare(`select id, data${ordered ? ', sequence' : ''} from message where session_id = ? order by ${ordered ? 'sequence, ' : ''}time_created, id`).all(sessionId)
    const parts = db.prepare('select id, data from part where message_id = ? order by sequence, time_created, id')
    return rows.map((row) => ({
      info: { ...JSON.parse(row.data), id: row.id, sessionID: sessionId },
      parts: parts.all(row.id).map((part) => ({ ...JSON.parse(part.data), id: part.id, sessionID: sessionId, messageID: row.id })),
      sequence: Number.isInteger(row.sequence) ? row.sequence : null,
    }))
  } catch {
    return null
  } finally {
    try { db?.close() } catch {}
  }
}
