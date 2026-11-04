/**
 * Usage on OpenCode 2.x (account/usage/read, codeDesktop/stats/read): still folded from the sessions' own messages,
 * into usage.js's per-session folds, since GET /api/experimental/session/stats has no tokens per day, no hours and no
 * longest turn. As stats.ts counts (core/src/session/stats.ts):
 *
 *   - only user and assistant messages (one assistant message is one step: its tokens, cost, model, tool contents);
 *   - a fork's copied messages (time.created before the fork's own creation) are left out, or the source's usage
 *     would count twice;
 *   - a turn lasts from its user message to the idle message that ends it (v2 has no assistant parentID);
 *   - every session, archived and sub-agent ones included (GET /api/session with neither filter).
 *
 * The folded total is checked against the stats' tokens once per read (v2.usageCheck; a mismatch is logged).
 */
import { localDayKey } from '../usage.js'
import { readMessages } from './history.js'

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const num = (value) => (Number.isFinite(value) ? value : 0)

/** A TokenUsage.Info's total, as stats.ts adds it up (input + output + reasoning + cache read + write). */
export const tokenTotal = (tokens) => (isRecord(tokens) ? num(tokens.input) + num(tokens.output) + num(tokens.reasoning) + num(tokens.cache?.read) + num(tokens.cache?.write) : 0)

/**
 * One v2 session's messages (oldest first) → usage.js's fold {days, longestTurnSec, subagent, tokens}.
 * @param {any[]} messages - GET /api/session/:id/message, as v2 lists them
 * @param {{ time?: {created?: number}, fork?: object, parentID?: string }} info - the session
 */
export function foldSessionV2(messages, info = {}) {
  const days = {}
  const since = info?.fork && Number.isFinite(info.time?.created) ? info.time.created : -Infinity
  const subagent = typeof info?.parentID === 'string' && Boolean(info.parentID)
  let longestTurnMs = 0
  let turnStart = null
  let tokensTotal = 0
  let first = null
  for (const message of Array.isArray(messages) ? messages : []) {
    const created = message?.time?.created
    if (!Number.isFinite(created) || created < since) continue
    if (message.type === 'idle') {
      if (turnStart !== null) longestTurnMs = Math.max(longestTurnMs, created - turnStart)
      turnStart = null
      continue
    }
    if (message.type !== 'user' && message.type !== 'assistant') continue
    first ??= created
    const day = days[localDayKey(created)] ??= { tokens: 0, messages: 0, sessions: 0, toolCalls: 0, hours: {}, models: {}, modelUsage: {}, costUsd: 0 }
    day.messages++
    const hour = new Date(created).getHours()
    day.hours[hour] = (day.hours[hour] ?? 0) + 1
    if (message.type === 'user') { turnStart ??= created; continue }
    for (const item of Array.isArray(message.content) ? message.content : []) if (item?.type === 'tool') day.toolCalls++
    if (turnStart !== null && Number.isFinite(message.time?.completed)) longestTurnMs = Math.max(longestTurnMs, message.time.completed - turnStart)
    const tokens = message.tokens
    if (!isRecord(tokens)) continue
    const input = num(tokens.input), output = num(tokens.output) + num(tokens.reasoning), read = num(tokens.cache?.read), write = num(tokens.cache?.write)
    const total = input + output + read + write
    tokensTotal += total
    day.tokens += total
    day.costUsd += num(message.cost)
    const model = typeof message.model?.id === 'string' ? `${message.model.providerID}/${message.model.id}` : 'unknown'
    day.models[model] = (day.models[model] ?? 0) + total
    const usage = day.modelUsage[model] ??= { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 }
    usage.inputTokens += input
    usage.outputTokens += output
    usage.cacheReadInputTokens += read
    usage.cacheCreationInputTokens += write
  }
  if (first !== null && !subagent) days[localDayKey(first)].sessions = 1
  return { days, longestTurnSec: Math.floor(longestTurnMs / 1000), subagent, tokens: tokensTotal }
}

export const USAGE_V2 = {
  /** Every session's fold (cached by time.updated), the bridge's hidden ones left out; then the stats check. */
  async usageFoldsV2() {
    const api = await this.v2Api()
    const sessions = await this.listSessions({})
    const ids = new Set()
    const folds = []
    let complete = true
    for (const info of sessions) {
      if (!info?.id) continue
      if (this.store.get(info.id).hidden) { complete = false; continue }
      ids.add(info.id)
      const updated = info.time?.updated ?? 0
      let fold = this.usageCache.get(info.id, updated)
      if (!fold) {
        try {
          fold = foldSessionV2(await readMessages(api, info.id), info)
          this.usageCache.set(info.id, updated, fold)
        } catch (error) { this.log(`usage ${info.id}: ${error?.message ?? error}`); complete = false; continue }
      }
      folds.push(fold)
    }
    this.usageCache.prune(ids)
    if (complete) await this.usageCheckV2(folds.reduce((sum, fold) => sum + num(fold.tokens), 0))
    return folds
  },

  /**
   * The folded total against v2's own count (GET /api/experimental/session/stats, no tool rows): equal unless a fold
   * went wrong (a fork counted twice, a message type miscounted). Kept as v2.usageCheck; a difference is logged.
   */
  async usageCheckV2(folded) {
    let stats = null
    try { stats = await (await this.v2Api()).get('/api/experimental/session/stats', { query: { tools: 'none' } }) } catch (error) { this.log(`usage stats: ${error?.message ?? error}`); return null }
    const server = tokenTotal(stats?.tokens)
    const check = { folded, server, matches: Math.abs(folded - server) <= Math.max(1, server * 0.001) }
    this.v2.usageCheck = check
    if (!check.matches) this.log(`usage: ${folded} tokens folded, ${this.flavor.name} counts ${server}`)
    return check
  },
}
