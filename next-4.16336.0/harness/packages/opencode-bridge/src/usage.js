/**
 * Real token usage from the agent's own history: every session's assistant
 * messages carry OpenCode's per-step token counts (input, output, reasoning,
 * cache read/write), model and time. One fold per session, cached by the
 * session's `time.updated`, serves:
 *   account/usage/read     dailyUsageBuckets + summary (Settings › Usage)
 *   codeDesktop/stats/read dailyActivity, dailyModelTokens, modelUsage, peakActivityHour (home card)
 * Cost: OpenCode prices each step in USD (models.dev); it is reported as
 * `opencode.costUsd` beside the Codex fields.
 */

const pad = (value) => String(value).padStart(2, '0')
export const localDayKey = (ms) => { const date = new Date(ms); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
const parseDay = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d) }
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000)

/**
 * Fold one session's messages.
 * @param {Array<{info: any, parts: any[]}>} messages
 * @param {{ subagent?: boolean }} [options]
 */
export function foldSession(messages, { subagent = false } = {}) {
  const days = {}
  let longestTurnMs = 0
  const turnStart = new Map()
  for (const { info, parts } of messages ?? []) {
    const created = info?.time?.created
    if (!Number.isFinite(created)) continue
    const day = days[localDayKey(created)] ??= { tokens: 0, messages: 0, sessions: 0, toolCalls: 0, hours: {}, models: {}, modelUsage: {}, costUsd: 0 }
    day.messages++
    const hour = new Date(created).getHours()
    day.hours[hour] = (day.hours[hour] ?? 0) + 1
    if (info.role === 'user') { turnStart.set(info.id, created); continue }
    for (const part of parts ?? []) if (part.type === 'tool') day.toolCalls++
    const tokens = info.tokens
    if (!tokens) continue
    const input = (tokens.input ?? 0), output = (tokens.output ?? 0) + (tokens.reasoning ?? 0), read = tokens.cache?.read ?? 0, write = tokens.cache?.write ?? 0
    const total = input + output + read + write
    day.tokens += total
    day.costUsd += Number.isFinite(info.cost) ? info.cost : 0
    const model = info.modelID ? `${info.providerID}/${info.modelID}` : 'unknown'
    day.models[model] = (day.models[model] ?? 0) + total
    const usage = day.modelUsage[model] ??= { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 }
    usage.inputTokens += input
    usage.outputTokens += output
    usage.cacheReadInputTokens += read
    usage.cacheCreationInputTokens += write
    const started = turnStart.get(info.parentID)
    if (Number.isFinite(started) && Number.isFinite(info.time?.completed)) longestTurnMs = Math.max(longestTurnMs, info.time.completed - started)
  }
  const first = messages?.find((message) => Number.isFinite(message?.info?.time?.created))
  if (first && !subagent) days[localDayKey(first.info.time.created)].sessions = 1
  return { days, longestTurnSec: Math.floor(longestTurnMs / 1000), subagent }
}

/** account/usage/read. */
export function accountUsage(folds, todayKey = localDayKey(Date.now())) {
  const daily = new Map()
  let longest = 0, costUsd = 0
  for (const fold of folds) {
    for (const [key, day] of Object.entries(fold.days)) {
      if (day.tokens) daily.set(key, (daily.get(key) ?? 0) + day.tokens)
      costUsd += day.costUsd
    }
    longest = Math.max(longest, fold.longestTurnSec)
  }
  const keys = [...daily.keys()].sort()
  let lifetimeTokens = 0, peakDailyTokens = 0, longestStreakDays = 0, run = 0
  keys.forEach((key, index) => {
    lifetimeTokens += daily.get(key)
    peakDailyTokens = Math.max(peakDailyTokens, daily.get(key))
    run = index > 0 && daysBetween(keys[index - 1], key) === 1 ? run + 1 : 1
    longestStreakDays = Math.max(longestStreakDays, run)
  })
  let currentStreakDays = 0
  const cursor = parseDay(todayKey)
  while (daily.has(localDayKey(cursor.getTime()))) { currentStreakDays++; cursor.setDate(cursor.getDate() - 1) }
  return {
    summary: { lifetimeTokens, peakDailyTokens, longestRunningTurnSec: longest, currentStreakDays, longestStreakDays },
    dailyUsageBuckets: keys.map((startDate) => ({ startDate, tokens: daily.get(startDate) })),
    threadUsage: null,
    opencode: { costUsd: Math.round(costUsd * 10000) / 10000 },
  }
}

/** codeDesktop/stats/read. */
export function codeStats(folds) {
  const activity = new Map(), tokens = new Map(), modelUsage = {}
  const hours = Array.from({ length: 24 }, () => 0)
  for (const fold of folds) {
    for (const [date, day] of Object.entries(fold.days)) {
      const entry = activity.get(date) ?? { date, messageCount: 0, sessionCount: 0, toolCallCount: 0 }
      entry.messageCount += day.messages
      entry.sessionCount += fold.subagent ? 0 : day.sessions
      entry.toolCallCount += day.toolCalls
      activity.set(date, entry)
      for (const [hour, value] of Object.entries(day.hours)) hours[Number(hour)] += value
      for (const [model, value] of Object.entries(day.models)) {
        const byModel = tokens.get(date) ?? {}
        byModel[model] = (byModel[model] ?? 0) + value
        tokens.set(date, byModel)
      }
      for (const [model, usage] of Object.entries(day.modelUsage)) {
        const total = modelUsage[model] ??= { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 }
        for (const key of Object.keys(total)) total[key] += usage[key]
      }
    }
  }
  let peakActivityHour = null, peak = 0
  hours.forEach((value, hour) => { if (value > peak) { peak = value; peakActivityHour = hour } })
  const dates = [...activity.keys()].sort()
  return {
    dailyActivity: dates.map((date) => activity.get(date)).filter((day) => day.messageCount || day.sessionCount || day.toolCallCount),
    dailyModelTokens: [...tokens.keys()].sort().map((date) => ({ date, tokensByModel: tokens.get(date) })),
    modelUsage,
    peakActivityHour,
  }
}

/** Per-session folds cached by updated time. */
export class UsageCache {
  constructor() { this.folds = new Map() }
  get(id, updated) { const hit = this.folds.get(id); return hit && hit.updated === updated ? hit.fold : null }
  set(id, updated, fold) { this.folds.set(id, { updated, fold }) }
  prune(ids) { for (const id of this.folds.keys()) if (!ids.has(id)) this.folds.delete(id) }
}
