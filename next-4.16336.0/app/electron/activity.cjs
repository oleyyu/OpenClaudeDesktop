// Exact activity observed by this client. Never infer event dates from thread.updatedAt.
// Forward-only: per-day session counts and per-model input/output/cached deltas are
// recorded from the moment this ledger version runs; older days are never backfilled.
// Ledger v2 (days marked `v: 2`): tokens are uncached input + output, like the original's
// heavy-work worker (cache reads and writes are separate buckets there, never summed into
// tokens), and modelUsage.input is uncached input. Earlier days charged the cumulative
// totalTokens delta and kept cache-inclusive input; ledgerStats reads them through
// their modelUsage, and the first v2 write to such a day converts it.
// Since F09 the ledger only backs the home stats card on a core without
// codeDesktop/stats/read (Codex); the DeepSeek core folds the full session history.
const USAGE_FIELDS = { input: "inputTokens", output: "outputTokens", cached: "cachedInputTokens", cacheWrite: "cacheWriteInputTokens" };
const LEDGER_VERSION = 2;
const count = (value) => (Number.isFinite(value) ? value : 0);
function upgradeDay(entry) {
  if (entry.v === LEDGER_VERSION) return;
  entry.models ??= {};
  for (const [model, usage] of Object.entries(entry.modelUsage || {})) {
    if (!usage || typeof usage !== "object") continue;
    const input = Math.max(0, count(usage.input) - count(usage.cached));
    const tokens = input + count(usage.output);
    entry.tokens = Math.max(0, count(entry.tokens) - count(entry.models[model]) + tokens);
    entry.models[model] = tokens;
    usage.input = input;
  }
  entry.v = LEDGER_VERSION;
}
function readableLedger(ledger) {
  return !!ledger && typeof ledger === "object" && !Array.isArray(ledger)
    && !!ledger.days && typeof ledger.days === "object" && !Array.isArray(ledger.days);
}
function recordActivity(config, event, now = new Date()) {
  const p = event.params || {};
  if (!p.threadId || !config.threadIds.includes(p.threadId)) return false;
  const stats = (config.stats[p.threadId] ??= { messages: 0, ids: [] });
  stats.ids ??= [];
  config.activity ??= { startedAt: now.toISOString(), days: {} };
  // A corrupt ledger is reported by the stats IPC; it is never overwritten here.
  if (!readableLedger(config.activity)) return false;
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const day = () => (config.activity.days[date] ??= { v: LEDGER_VERSION, messages: 0, tokens: 0, hours: {}, models: {} });
  if (event.method === "item/completed" && ["userMessage", "agentMessage"].includes(p.item?.type) && !stats.ids.includes(p.item.id)) {
    // The thread's first observed user message starts a session on that day.
    // Threads that already carried recorded messages are never re-counted.
    const firstObserved = p.item.type === "userMessage" && stats.ids.length === 0 && !stats.sessionDay;
    stats.ids.push(p.item.id);
    stats.messages++;
    const entry = day();
    entry.messages++;
    entry.hours[now.getHours()] = (entry.hours[now.getHours()] || 0) + 1;
    if (firstObserved) {
      stats.sessionDay = date;
      entry.sessions = (entry.sessions || 0) + 1;
      (entry.sessionIds ??= []).push(p.threadId);
    }
    return true;
  }
  if (event.method === "thread/tokenUsage/updated") {
    const totals = p.tokenUsage?.total;
    const total = totals?.totalTokens;
    if (!Number.isFinite(total)) return false;
    // A pre-ledger/resumed thread's cumulative total is a baseline, not today's spend.
    const baseline = stats.observedTokens ?? stats.tokens ?? total;
    const totalDelta = Math.max(0, total - baseline);
    stats.tokens = Math.max(stats.tokens || 0, total);
    stats.observedTokens = Math.max(baseline, total);
    const charge = (tokens, usage) => {
      if (!tokens && !usage) return;
      const entry = day();
      upgradeDay(entry);
      entry.tokens += tokens;
      if (!stats.model) return;
      if (tokens) entry.models[stats.model] = (entry.models[stats.model] || 0) + tokens;
      if (usage) {
        const record = ((entry.modelUsage ??= {})[stats.model] ??= { input: 0, output: 0, cached: 0 });
        for (const [key, value] of Object.entries(usage)) record[key] = (record[key] || 0) + value;
      }
    };
    // Input/output/cached/cache-write follow the same baseline rule per field; the first
    // observation of a thread without an observedUsage record only sets it.
    const usage = {};
    for (const [key, field] of Object.entries(USAGE_FIELDS)) {
      const value = totals[field];
      if (Number.isFinite(value)) usage[key] = value;
    }
    // Without the input/output breakdown there is no cache to exclude: the total is the spend.
    if (!Number.isFinite(usage.input) || !Number.isFinite(usage.output)) {
      charge(totalDelta, null);
      return true;
    }
    const observed = stats.observedUsage;
    if (!observed || typeof observed !== "object") {
      stats.observedUsage = { ...usage };
      return true;
    }
    const deltas = {};
    for (const [key, value] of Object.entries(usage)) {
      const previous = Number.isFinite(observed[key]) ? observed[key] : value;
      deltas[key] = Math.max(0, value - previous);
      observed[key] = Math.max(previous, value);
    }
    // Δ(input − cached − cache writes) + Δoutput: prefix-cache hits are not new tokens.
    const input = Math.max(0, deltas.input - (deltas.cached || 0) - (deltas.cacheWrite || 0));
    if (input || deltas.output || deltas.cached) charge(input + deltas.output, { input, output: deltas.output, cached: deltas.cached || 0 });
    return true;
  }
  return false;
}
const tally = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
// One ledger day's per-model tokens and usage. v2 days are read as recorded; a legacy day
// charged cache-inclusive totals, so a model with a modelUsage record reads
// max(0, input − cached) + output (and its input becomes uncached), otherwise its value stays.
function dayModelUsage(day) {
  const current = day?.v === LEDGER_VERSION;
  const tokens = {}, usage = {};
  for (const [model, entry] of Object.entries(record(day?.models) ? day.models : {}))
    tokens[model] = tally(record(entry) ? entry.tokens : entry);
  for (const [model, entry] of Object.entries(record(day?.modelUsage) ? day.modelUsage : {})) {
    if (!record(entry)) continue;
    const input = current ? tally(entry.input) : Math.max(0, tally(entry.input) - tally(entry.cached));
    usage[model] = { input, output: tally(entry.output), cached: tally(entry.cached) };
    if (!current) tokens[model] = input + usage[model].output;
  }
  return { tokens, usage };
}
/**
 * The Codex core's home stats (it has no codeDesktop/stats/read): this ledger in the
 * original getCodeStats shape (cc43287c9-BMbiZYzF.js:3987-4004 $O; code-home.js:13711-13751
 * Iw reads it). Every ledger day is an activity day (the ledger records no tool calls),
 * modelUsage and the busiest hour (earliest on a tie) are all-time, and a model's usage is
 * its recorded input / output / cached sums. An unreadable ledger is the caller's error.
 */
function ledgerStats(ledger) {
  const dailyActivity = [], dailyModelTokens = [], modelUsage = {};
  const hours = Array.from({ length: 24 }, () => 0);
  const days = Object.entries(readableLedger(ledger) ? ledger.days : {})
    .filter(([date, day]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && record(day))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [date, day] of days) {
    dailyActivity.push({ date, messageCount: tally(day.messages), sessionCount: tally(day.sessions), toolCallCount: 0 });
    for (const [hour, value] of Object.entries(record(day.hours) ? day.hours : {})) {
      const index = Number(hour);
      if (Number.isInteger(index) && index >= 0 && index < 24) hours[index] += tally(value);
    }
    const perModel = dayModelUsage(day);
    const tokensByModel = {};
    for (const [model, value] of Object.entries(perModel.tokens)) if (value > 0) tokensByModel[model] = value;
    if (Object.keys(tokensByModel).length) dailyModelTokens.push({ date, tokensByModel });
    for (const [model, entry] of Object.entries(perModel.usage)) {
      const total = (modelUsage[model] ??= { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 });
      total.inputTokens += entry.input;
      total.outputTokens += entry.output;
      total.cacheReadInputTokens += entry.cached;
    }
  }
  let peakActivityHour = null, peak = 0;
  hours.forEach((value, hour) => { if (value > peak) { peak = value; peakActivityHour = hour; } });
  return { dailyActivity, dailyModelTokens, modelUsage, peakActivityHour };
}
// The stats object the home card renders: what the core returned or the ledger produced.
function statsShape(stats) {
  return record(stats) && Array.isArray(stats.dailyActivity) && Array.isArray(stats.dailyModelTokens) && record(stats.modelUsage)
    && (stats.peakActivityHour === null || (Number.isInteger(stats.peakActivityHour) && stats.peakActivityHour >= 0 && stats.peakActivityHour < 24))
    && stats.dailyActivity.every((day) => record(day) && typeof day.date === "string")
    && stats.dailyModelTokens.every((day) => record(day) && typeof day.date === "string" && record(day.tokensByModel));
}
// Which core a kept config.codeStats came from (codex.cjs resolveCore): the default bridge is
// one core whatever its script path; an override (CODEX_BINARY) is its binary.
function statsCoreKey(core) {
  return core?.kind === "override" ? `override:${core.command}` : core?.kind ?? null;
}
// The kept result the 'stats' IPC paints before the fresh read: only for the core that produced
// it (config.codeStatsCore; a result kept before the key came from the default bridge), and not
// once the connected core is known to lack capabilities.codeStats. Otherwise a DeepSeek fold
// would paint first and the other core's ledger fallback would replace it.
function keptCodeStats(config, coreKey, connectedCore) {
  if (!statsShape(config?.codeStats)) return null;
  if (connectedCore && connectedCore.capabilities?.codeStats !== true) return null;
  return coreKey !== null && (config.codeStatsCore ?? "deepseek") === coreKey ? config.codeStats : null;
}
module.exports = { recordActivity, readableLedger, dayModelUsage, ledgerStats, statsShape, statsCoreKey, keptCodeStats };
