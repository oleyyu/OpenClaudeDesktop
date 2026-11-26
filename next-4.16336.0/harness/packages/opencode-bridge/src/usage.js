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
    const day = days[localDayKey(created)] ??= { tokens: 0, messages: 0, sessions: 0, toolCalls: 0, hours: {}, models: {}, modelUsage: {}, modelCostUsd: {}, costUsd: 0 }
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
    const cost = Number.isFinite(info.cost) ? info.cost : 0
    day.costUsd += cost
    const model = info.modelID ? `${info.providerID}/${info.modelID}` : 'unknown'
    day.modelCostUsd[model] = (day.modelCostUsd[model] ?? 0) + cost
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

/**
 * account/usage/read, with `breakdown` (the core-neutral extension acp-bridge usage.js also sends): tokens by
 * category, model and day, and OpenCode's USD cost; Settings › Usage draws it as tiles, panels and per-day bars.
 * OpenCode prices every step (models.dev); a history whose steps all cost 0 (free models) is tokens only.
 */
export function accountUsage(folds, todayKey = localDayKey(Date.now())) {
  const daily = new Map(), parts = new Map(), models = new Map()
  let longest = 0, costUsd = 0
  for (const fold of folds) {
    for (const [key, day] of Object.entries(fold.days)) {
      if (day.tokens) daily.set(key, (daily.get(key) ?? 0) + day.tokens)
      costUsd += day.costUsd
      const part = parts.get(key) ?? { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, costUsd: 0 }
      part.costUsd += day.costUsd ?? 0
      for (const [model, usage] of Object.entries(day.modelUsage ?? {})) {
        part.input += usage.inputTokens; part.cacheRead += usage.cacheReadInputTokens; part.cacheWrite += usage.cacheCreationInputTokens; part.output += usage.outputTokens
        const entry = models.get(model) ?? { tokens: 0, costUsd: 0 }
        entry.tokens += usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens + usage.outputTokens
        entry.costUsd += day.modelCostUsd?.[model] ?? 0
        models.set(model, entry)
      }
      parts.set(key, part)
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
  const priced = costUsd > 0
  const money = (value) => Math.round(value * 1e6) / 1e6
  const cost = (value) => (priced ? { costUsd: money(value ?? 0) } : { costCny: null })
  const sum = (filter) => {
    const out = { tokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, unpricedTokens: 0 }
    let spent = 0
    for (const key of keys.filter(filter)) {
      const part = parts.get(key)
      out.tokens += daily.get(key)
      out.inputTokens += part.input; out.cacheReadTokens += part.cacheRead; out.cacheWriteTokens += part.cacheWrite; out.outputTokens += part.output
      spent += part.costUsd
    }
    return { ...out, ...cost(spent) }
  }
  const cutoff = (() => { const date = parseDay(todayKey); date.setDate(date.getDate() - 29); return localDayKey(date.getTime()) })()
  return {
    summary: { lifetimeTokens, peakDailyTokens, longestRunningTurnSec: longest, currentStreakDays, longestStreakDays },
    dailyUsageBuckets: keys.map((startDate) => ({ startDate, tokens: daily.get(startDate) })),
    threadUsage: null,
    opencode: { costUsd: Math.round(costUsd * 10000) / 10000 },
    breakdown: {
      allTime: sum(() => true),
      last30Days: sum((key) => key >= cutoff && key <= todayKey),
      today: sum((key) => key === todayKey),
      // "provider/model": the model's own id names the row (the full key stays the row's key and tooltip).
      models: [...models].filter(([, entry]) => entry.tokens > 0)
        .map(([model, entry]) => ({ model, displayName: model.includes('/') ? model.slice(model.indexOf('/') + 1) : model, tokens: entry.tokens, ...cost(entry.costUsd) })),
      daily: keys.map((date) => ({ date, tokens: daily.get(date), ...cost(parts.get(date).costUsd) })),
      priced,
    },
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
