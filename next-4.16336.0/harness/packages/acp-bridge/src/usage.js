/**
 * Token and activity ledger for account/usage/read, codeDesktop/stats/read and
 * thread/tokenUsage/updated. ACP agents report usage in different places
 * (agents/*.js normalize it): a turn's totals (Gemini PromptResponse
 * `_meta.quota`, Qwen `_meta.usage` chunks) and/or the context fill
 * (`usage_update {used, size}`). Each finished turn is folded here by local
 * day and model; the ledger lives in <state>/usage.json.
 *
 *   account/usage/read   Codex GetAccountTokenUsageResponse: summary, dailyUsageBuckets
 *                        (+ `breakdown`, a bridge extension: tokens by category, model and day)
 *   codeDesktop/stats/read  the home stats card (dailyActivity, dailyModelTokens, modelUsage, peakActivityHour)
 */

import fs from 'node:fs'
import path from 'node:path'
import { writeJson } from './store.js'

const count = (value) => (Number.isFinite(value) && value > 0 ? Math.round(value) : 0)

export function localDayKey(time = Date.now()) {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const parseDay = (key) => {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}
const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 86400000)

/** A normalized usage record: {inputTokens (incl. cached), cachedInputTokens, outputTokens, reasoningOutputTokens, totalTokens}. */
export function normalizeUsage(value) {
  if (!value || typeof value !== 'object') return null
  const input = count(value.inputTokens ?? value.input_tokens ?? value.promptTokens)
  const cached = count(value.cachedInputTokens ?? value.cachedReadTokens ?? value.cached_tokens ?? value.cacheReadTokens)
  const output = count(value.outputTokens ?? value.output_tokens ?? value.completionTokens)
  const reasoning = count(value.reasoningOutputTokens ?? value.thoughtTokens ?? value.reasoningTokens)
  const total = count(value.totalTokens ?? value.total_tokens) || input + output
  if (!input && !output && !total) return null
  return { inputTokens: input, cachedInputTokens: Math.min(cached, input || cached), outputTokens: output, reasoningOutputTokens: reasoning, totalTokens: total }
}

export function addUsage(a, b) {
  const out = { totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, ...a }
  if (!b) return out
  for (const key of ['totalTokens', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens']) out[key] += count(b[key])
  return out
}

/** Codex ThreadTokenUsage for the client. */
export function threadTokenUsage({ total, last, contextUsed, contextWindow }) {
  const lastBreakdown = { totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, ...(last ?? {}) }
  // The context ring reads last.totalTokens against modelContextWindow: the context fill when the agent reports it.
  if (Number.isFinite(contextUsed) && contextUsed > 0) lastBreakdown.totalTokens = Math.round(contextUsed)
  return {
    total: { totalTokens: 0, inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0, ...(total ?? {}) },
    last: lastBreakdown,
    modelContextWindow: Number.isFinite(contextWindow) && contextWindow > 0 ? Math.round(contextWindow) : null,
  }
}

/**
 * options.outbox: a folder this ledger also appends each finished turn to (one JSON line per turn, a file per
 * process): the workflow runner's own bridge, whose state folder isn't the app bridge's ledger. options.inbox: the
 * folder the app bridge's ledger takes those turns in from (each file claimed by a rename, folded in, removed), so
 * workflow agents' tokens reach Usage without two processes rewriting one usage.json.
 */
export class UsageLedger {
  constructor(dir, { inbox = null, outbox = null } = {}) {
    this.inbox = inbox
    this.outbox = outbox ? path.join(outbox, `${process.pid}.jsonl`) : null
    this.file = path.join(dir, 'usage.json')
    let data = null
    try { data = JSON.parse(fs.readFileSync(this.file, 'utf8')) } catch {}
    this.data = data && typeof data === 'object' ? data : {}
    this.data.days ??= {}
    this.data.models ??= {}
    this.data.longestTurnSec ??= 0
    this.data.sessions ??= {}
  }

  /**
   * One finished turn.
   * @param {{ threadId: string, model?: string | null, usage?: object | null, toolCalls?: number, startedAtMs?: number, completedAtMs?: number, subagent?: boolean }} turn
   */
  record({ threadId, model, usage, toolCalls = 0, startedAtMs, completedAtMs = Date.now(), subagent = false, messages = null, persist = true, costUsd = null }) {
    if (this.outbox && persist) {
      try {
        fs.mkdirSync(path.dirname(this.outbox), { recursive: true })
        fs.appendFileSync(this.outbox, JSON.stringify({ threadId, model, usage, toolCalls, startedAtMs, completedAtMs, subagent, messages, costUsd }) + '\n')
      } catch {}
    }
    if (persist) this.absorbInbox(false)
    const key = localDayKey(startedAtMs ?? completedAtMs)
    const day = (this.data.days[key] ??= { tokens: 0, messages: 0, sessions: 0, toolCalls: 0, hours: {}, models: {}, input: 0, cached: 0, output: 0 })
    const normalized = normalizeUsage(usage)
    const tokens = normalized ? normalized.inputTokens + normalized.outputTokens : 0
    const name = typeof model === 'string' && model ? model : 'unknown'
    day.tokens += tokens
    day.input += normalized ? normalized.inputTokens - normalized.cachedInputTokens : 0
    day.cached += normalized?.cachedInputTokens ?? 0
    day.output += normalized?.outputTokens ?? 0
    day.messages += subagent ? 0 : Number.isFinite(messages) ? count(messages) : 1
    day.toolCalls += count(toolCalls)
    const hour = new Date(startedAtMs ?? completedAtMs).getHours()
    day.hours[hour] = (day.hours[hour] ?? 0) + 1
    if (tokens) day.models[name] = (day.models[name] ?? 0) + tokens
    // Spend the agent metered itself (MiniMax's cost_usd per model call), in US dollars; tokens without it stay unpriced.
    if (Number.isFinite(costUsd) && costUsd > 0) {
      day.costUsd = (day.costUsd ?? 0) + costUsd
      day.pricedTokens = (day.pricedTokens ?? 0) + tokens
      day.modelCostUsd ??= {}
      day.modelCostUsd[name] = (day.modelCostUsd[name] ?? 0) + costUsd
    }
    const seen = (this.data.sessions[key] ??= [])
    if (!subagent && !seen.includes(threadId)) {
      seen.push(threadId)
      day.sessions += 1
    }
    if (normalized) {
      const record = (this.data.models[name] ??= { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 })
      record.inputTokens += normalized.inputTokens - normalized.cachedInputTokens
      record.outputTokens += normalized.outputTokens
      record.cacheReadInputTokens += normalized.cachedInputTokens
    }
    if (startedAtMs && completedAtMs > startedAtMs) this.data.longestTurnSec = Math.max(this.data.longestTurnSec, Math.round((completedAtMs - startedAtMs) / 1000))
    // Session ids per day are only needed for today's dedupe.
    for (const old of Object.keys(this.data.sessions)) if (old !== key && old !== localDayKey()) delete this.data.sessions[old]
    if (persist) this.save()
  }

  /**
   * Sessions the agent ran outside OpenClaude Desktop, from its own usage records (adapter.usageRecords: Qwen's
   * usage_record.jsonl): each record once (by key), unless `ownSession(sessionId)` says OpenClaude Desktop ran it and counted
   * its turns already. Returns the cursor to read on from next time (kept in the ledger).
   */
  mergeExternal(read, ownSession = () => false) {
    const state = (this.data.external ??= { cursor: null, seen: {} })
    let result = null
    try { result = read(state.cursor) } catch { return }
    if (!result) return
    let changed = JSON.stringify(result.cursor ?? null) !== JSON.stringify(state.cursor)
    state.cursor = result.cursor ?? null
    for (const record of result.records ?? []) {
      if (!record?.key || state.seen[record.key] || ownSession(record.sessionId) || this.data.inboxSessions?.[record.sessionId]) continue
      state.seen[record.key] = 1
      changed = true
      const models = Object.entries(record.models ?? {})
      models.forEach(([model, usage], index) => this.record({
        threadId: record.sessionId, model, usage, toolCalls: index === 0 ? record.toolCalls ?? 0 : 0, startedAtMs: record.startedAtMs, completedAtMs: record.completedAtMs, messages: usage?.requests ?? 0, persist: false,
      }))
    }
    if (changed) this.save()
  }

  save() {
    try { writeJson(this.file, this.data) } catch {}
  }

  /** Folds in the turns other processes (the workflow runner's bridge) left in the inbox; saves unless told not to. */
  absorbInbox(save = true) {
    if (!this.inbox) return
    let files = []
    try { files = fs.readdirSync(this.inbox).filter((name) => name.endsWith('.jsonl')) } catch { return }
    let changed = false
    for (const name of files) {
      // Claimed by a rename first: a writer still appending creates a new file, read next time.
      const claimed = path.join(this.inbox, `${name}.${process.pid}.claimed`)
      try { fs.renameSync(path.join(this.inbox, name), claimed) } catch { continue }
      let text = ''
      try { text = fs.readFileSync(claimed, 'utf8') } catch {}
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        let turn
        try { turn = JSON.parse(line) } catch { continue }
        if (!turn || typeof turn !== 'object' || typeof turn.threadId !== 'string') continue
        this.record({ ...turn, persist: false })
        // Counted here: the agent's own usage records of that session (mergeExternal) never count it again.
        ;(this.data.inboxSessions ??= {})[turn.threadId] = 1
        changed = true
      }
      try { fs.rmSync(claimed, { force: true }) } catch {}
    }
    if (changed && save) this.save()
  }

  /** Codex GetAccountTokenUsageResponse (+ `breakdown`). */
  accountUsage(todayKey = localDayKey()) {
    this.absorbInbox()
    const keys = Object.keys(this.data.days).filter((key) => this.data.days[key].tokens > 0).sort()
    let lifetimeTokens = 0, peakDailyTokens = 0
    for (const key of keys) {
      lifetimeTokens += this.data.days[key].tokens
      peakDailyTokens = Math.max(peakDailyTokens, this.data.days[key].tokens)
    }
    let longestStreakDays = 0, run = 0
    keys.forEach((key, index) => {
      run = index > 0 && daysBetween(keys[index - 1], key) === 1 ? run + 1 : 1
      longestStreakDays = Math.max(longestStreakDays, run)
    })
    let currentStreakDays = 0
    const cursor = parseDay(todayKey)
    while (this.data.days[localDayKey(cursor.getTime())]?.tokens > 0) {
      currentStreakDays++
      cursor.setDate(cursor.getDate() - 1)
    }
    const priced = keys.some((key) => this.data.days[key].costUsd > 0)
    const money = (value) => Math.round(value * 1e6) / 1e6
    const sum = (filter) => {
      const out = { tokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, unpricedTokens: 0, ...(priced ? { costUsd: 0 } : { costCny: null }) }
      let pricedTokens = 0
      for (const key of keys.filter(filter)) {
        const day = this.data.days[key]
        out.tokens += day.tokens
        out.inputTokens += day.input
        out.cacheReadTokens += day.cached
        out.outputTokens += day.output
        if (priced) out.costUsd += day.costUsd ?? 0
        pricedTokens += day.pricedTokens ?? 0
      }
      out.unpricedTokens = Math.max(0, out.tokens - pricedTokens)
      if (priced) out.costUsd = money(out.costUsd)
      return out
    }
    const cutoff = (() => { const date = parseDay(todayKey); date.setDate(date.getDate() - 29); return localDayKey(date.getTime()) })()
    const models = new Map()
    const modelCost = new Map()
    for (const key of keys) for (const [model, tokens] of Object.entries(this.data.days[key].models)) models.set(model, (models.get(model) ?? 0) + tokens)
    for (const key of keys) for (const [model, cost] of Object.entries(this.data.days[key].modelCostUsd ?? {})) modelCost.set(model, (modelCost.get(model) ?? 0) + cost)
    const cost = (value) => (priced ? { costUsd: money(value ?? 0) } : { costCny: null })
    return {
      summary: { lifetimeTokens, peakDailyTokens, longestRunningTurnSec: this.data.longestTurnSec, currentStreakDays, longestStreakDays },
      dailyUsageBuckets: keys.map((startDate) => ({ startDate, tokens: this.data.days[startDate].tokens })),
      threadUsage: null,
      breakdown: {
        allTime: sum(() => true),
        last30Days: sum((key) => key >= cutoff && key <= todayKey),
        today: sum((key) => key === todayKey),
        models: [...models].map(([model, tokens]) => ({ model, displayName: model, tokens, ...cost(modelCost.get(model)) })),
        daily: keys.map((date) => ({ date, tokens: this.data.days[date].tokens, ...cost(this.data.days[date].costUsd) })),
        priced,
      },
    }
  }

  /** The home stats card (the original getCodeStats shape). */
  codeStats() {
    this.absorbInbox()
    const keys = Object.keys(this.data.days).sort()
    const hours = Array.from({ length: 24 }, () => 0)
    for (const key of keys) for (const [hour, value] of Object.entries(this.data.days[key].hours ?? {})) hours[Number(hour)] += value
    let peakActivityHour = null, peak = 0
    hours.forEach((value, hour) => { if (value > peak) { peak = value; peakActivityHour = hour } })
    return {
      dailyActivity: keys.map((date) => ({ date, messageCount: this.data.days[date].messages, sessionCount: this.data.days[date].sessions, toolCallCount: this.data.days[date].toolCalls }))
        .filter((day) => day.messageCount || day.sessionCount || day.toolCallCount),
      dailyModelTokens: keys.filter((date) => Object.keys(this.data.days[date].models).length).map((date) => ({ date, tokensByModel: { ...this.data.days[date].models } })),
      modelUsage: JSON.parse(JSON.stringify(this.data.models)),
      peakActivityHour,
    }
  }
}
