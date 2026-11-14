import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { recordActivity } = createRequire(import.meta.url)("../electron/activity.cjs");
test("activity uses observed dates, deduplicates items, and never rebuckets historical tokens", () => {
  const config = { threadIds: ["t"], stats: { t: { tokens: 120, messages: 3, ids: ["old"], model: "real" } } };
  const now = new Date(2026, 8, 20, 4);
  const usage = (n) => ({ method: "thread/tokenUsage/updated", params: { threadId: "t", tokenUsage: { total: { totalTokens: n } } } });
  recordActivity(config, usage(140), now);
  recordActivity(config, usage(140), now);
  assert.equal(config.activity.days["2026-09-20"].tokens, 20);
  const message = { method: "item/completed", params: { threadId: "t", item: { id: "new", type: "agentMessage" } } };
  recordActivity(config, message, now); recordActivity(config, message, now);
  assert.equal(config.activity.days["2026-09-20"].messages, 1);
  assert.equal(config.stats.t.messages, 4);
  recordActivity(config, usage(130), now);
  recordActivity(config, usage(140), now);
  assert.equal(config.activity.days["2026-09-20"].tokens, 20);
  assert.equal(recordActivity(config, { ...message, params: { ...message.params, threadId: "unowned" } }, now), false);
});
test("first observed usage for an existing thread creates a baseline; new threads explicitly start at zero", () => {
  const config = { threadIds: ["old", "new"], stats: { new: { messages: 0, tokens: 0, observedTokens: 0, ids: [] } } };
  const usage = (threadId, totalTokens) => ({ method: "thread/tokenUsage/updated", params: { threadId, tokenUsage: { total: { totalTokens } } } });
  const now = new Date(2026, 8, 20, 4);
  recordActivity(config, usage("old", 50000), now);
  assert.deepEqual(config.activity.days, {});
  recordActivity(config, usage("old", 50100), now);
  recordActivity(config, usage("new", 200), now);
  assert.equal(config.activity.days["2026-09-20"].tokens, 300);
});
test("per-day sessions count a thread's first observed user message once; prior-history threads are never re-counted", () => {
  const config = { threadIds: ["fresh", "old"], stats: { fresh: { messages: 0, tokens: 0, observedTokens: 0, ids: [] }, old: { messages: 2, ids: ["a", "b"] } } };
  const now = new Date(2026, 8, 20, 4);
  const user = (threadId, id) => ({ method: "item/completed", params: { threadId, item: { id, type: "userMessage" } } });
  recordActivity(config, user("fresh", "u1"), now);
  recordActivity(config, user("fresh", "u2"), now);
  recordActivity(config, user("old", "u3"), now);
  assert.equal(config.activity.days["2026-09-20"].sessions, 1);
  assert.deepEqual(config.activity.days["2026-09-20"].sessionIds, ["fresh"]);
  assert.equal(config.activity.days["2026-09-20"].messages, 3);
  assert.equal(config.stats.fresh.sessionDay, "2026-09-20");
  assert.equal(config.stats.old.sessionDay, undefined);
});
test("per-model input/output/cached deltas follow the same baseline rule as the total; tokens are uncached input + output", () => {
  const config = { threadIds: ["t", "legacy"], stats: { t: { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0 }, ids: [], model: "m" }, legacy: { tokens: 100, model: "m" } } };
  const now = new Date(2026, 8, 20, 4);
  const usage = (threadId, total, input, output, cached) => ({ method: "thread/tokenUsage/updated", params: { threadId, tokenUsage: { total: { totalTokens: total, inputTokens: input, outputTokens: output, cachedInputTokens: cached } } } });
  recordActivity(config, usage("t", 300, 200, 100, 50), now);
  recordActivity(config, usage("t", 300, 200, 100, 50), now);
  recordActivity(config, usage("t", 450, 300, 150, 80), now);
  assert.deepEqual(config.activity.days["2026-09-20"].modelUsage.m, { input: 220, output: 150, cached: 80 }, "modelUsage.input is uncached input");
  assert.equal(config.activity.days["2026-09-20"].models.m, 370);
  assert.equal(config.activity.days["2026-09-20"].tokens, 370);
  assert.equal(config.activity.days["2026-09-20"].v, 2);
  recordActivity(config, usage("legacy", 500, 400, 100, 0), now);
  assert.deepEqual(config.stats.legacy.observedUsage, { input: 400, output: 100, cached: 0 }, "first observation is a baseline");
  assert.deepEqual(config.activity.days["2026-09-20"].modelUsage.m, { input: 220, output: 150, cached: 80 });
  recordActivity(config, usage("legacy", 560, 440, 120, 0), now);
  assert.deepEqual(config.activity.days["2026-09-20"].modelUsage.m, { input: 260, output: 170, cached: 80 });
  assert.equal(config.activity.days["2026-09-20"].models.m, 430);
  recordActivity(config, usage("t", 400, 250, 150, 80), now);
  assert.deepEqual(config.activity.days["2026-09-20"].modelUsage.m, { input: 260, output: 170, cached: 80 }, "a lower total never subtracts");
});
test("DeepSeek prefix-cache hits are never charged: day.models is Δ(input − cached − cache writes) + Δoutput", () => {
  const config = { threadIds: ["t"], stats: { t: { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0, cacheWrite: 0 }, ids: [], model: "deepseek-v4-flash" } } };
  const now = new Date(2026, 9, 1, 10);
  const usage = (total) => ({ method: "thread/tokenUsage/updated", params: { threadId: "t", tokenUsage: { total } } });
  recordActivity(config, usage({ totalTokens: 8896, inputTokens: 8836, cachedInputTokens: 0, outputTokens: 60 }), now);
  recordActivity(config, usage({ totalTokens: 17871, inputTokens: 17800, cachedInputTokens: 8704, outputTokens: 71 }), now);
  const day = config.activity.days["2026-10-01"];
  assert.equal(day.models["deepseek-v4-flash"], 8836 + 60 + (260 + 11));
  assert.equal(day.tokens, 8836 + 60 + (260 + 11));
  assert.deepEqual(day.modelUsage["deepseek-v4-flash"], { input: 8836 + 260, output: 71, cached: 8704 }, "modelUsage.input excludes the 8704 cached tokens");
  assert.equal(day.v, 2);
  // Cache writes are input the provider already counted separately, too.
  recordActivity(config, usage({ totalTokens: 18000, inputTokens: 17900, cachedInputTokens: 8704, cacheWriteInputTokens: 40, outputTokens: 100 }), now);
  assert.equal(day.models["deepseek-v4-flash"], 9167 + 60 + 29);
});
test("the first v2 write converts a legacy day; message-only events never touch its tokens", () => {
  const legacy = { messages: 2, tokens: 9500, hours: {}, models: { m: 9000, other: 500 }, modelUsage: { m: { input: 8900, output: 100, cached: 8000 } } };
  const config = { threadIds: ["t"], stats: { t: { messages: 0, tokens: 0, observedTokens: 0, observedUsage: { input: 0, output: 0, cached: 0, cacheWrite: 0 }, ids: [], model: "m" } }, activity: { days: { "2026-09-30": legacy } } };
  const now = new Date(2026, 8, 30, 15);
  recordActivity(config, { method: "item/completed", params: { threadId: "t", item: { id: "a", type: "agentMessage" } } }, now);
  assert.equal(legacy.v, undefined);
  assert.deepEqual(legacy.models, { m: 9000, other: 500 });
  recordActivity(config, { method: "thread/tokenUsage/updated", params: { threadId: "t", tokenUsage: { total: { totalTokens: 1200, inputTokens: 1100, cachedInputTokens: 1000, outputTokens: 20 } } } }, now);
  assert.equal(legacy.v, 2);
  assert.deepEqual(legacy.models, { m: 900 + 100 + 100 + 20, other: 500 }, "m from its modelUsage, other kept (no usage record)");
  assert.deepEqual(legacy.modelUsage.m, { input: 900 + 100, output: 120, cached: 9000 });
  assert.equal(legacy.tokens, 9500 - 9000 + 1000 + 120);
  assert.equal(legacy.messages, 3);
  recordActivity(config, { method: "item/completed", params: { threadId: "t", item: { id: "b", type: "userMessage" } } }, new Date(2026, 9, 1, 9));
  assert.equal(config.activity.days["2026-10-01"].v, 2, "days created by this ledger are v2");
});
test("a corrupt ledger is left untouched and reported unreadable", () => {
  const { readableLedger } = createRequire(import.meta.url)("../electron/activity.cjs");
  const config = { threadIds: ["t"], stats: {}, activity: "corrupt" };
  assert.equal(recordActivity(config, { method: "item/completed", params: { threadId: "t", item: { id: "x", type: "userMessage" } } }, new Date()), false);
  assert.equal(config.activity, "corrupt");
  assert.equal(readableLedger(config.activity), false);
  assert.equal(readableLedger({ days: [] }), false);
  assert.equal(readableLedger({ days: {} }), true);
});
// F09: on a core without codeDesktop/stats/read (Codex) the home card reads this ledger in the
// original getCodeStats shape (cc43287c9-BMbiZYzF.js:3987-4004; code-home.js Iw reads it).
test("a legacy day (no v) derives per-model tokens from modelUsage: input − cached + output; v2 days are read as recorded", () => {
  const { dayModelUsage, ledgerStats } = createRequire(import.meta.url)("../electron/activity.cjs");
  // Pre-v2 ledgers charged Codex totalTokens deltas, so DeepSeek prefix-cache reads inflated models.
  const legacy = { messages: 3, tokens: 45618, models: { "deepseek-v4-flash": 45618, old: 700 },
    modelUsage: { "deepseek-v4-flash": { input: 45000, output: 618, cached: 35712 } } };
  const current = { v: 2, messages: 1, tokens: 271, models: { "deepseek-v4-flash": 271 },
    modelUsage: { "deepseek-v4-flash": { input: 260, output: 11, cached: 8704 } } };
  assert.deepEqual(dayModelUsage(legacy), {
    tokens: { "deepseek-v4-flash": 45000 - 35712 + 618, old: 700 },
    usage: { "deepseek-v4-flash": { input: 45000 - 35712, output: 618, cached: 35712 } },
  }, "a model without a usage record keeps its legacy value");
  assert.deepEqual(dayModelUsage(current), { tokens: { "deepseek-v4-flash": 271 }, usage: { "deepseek-v4-flash": { input: 260, output: 11, cached: 8704 } } });
  assert.equal(dayModelUsage({ models: {}, modelUsage: { m: { input: 5, output: 1, cached: 9 } } }).tokens.m, 1, "never negative input");
  const stats = ledgerStats({ days: { "2026-10-01": current, "2026-09-30": legacy } });
  assert.deepEqual(stats.dailyModelTokens, [{ date: "2026-09-30", tokensByModel: { "deepseek-v4-flash": 9906, old: 700 } }, { date: "2026-10-01", tokensByModel: { "deepseek-v4-flash": 271 } }]);
  assert.deepEqual(stats.modelUsage, { "deepseek-v4-flash": { inputTokens: 9288 + 260, outputTokens: 629, cacheReadInputTokens: 35712 + 8704, cacheCreationInputTokens: 0 } });
});
test("ledgerStats: every readable day is an activity day in date order, hours are all-time, the earliest busiest hour wins", () => {
  const { ledgerStats, statsShape } = createRequire(import.meta.url)("../electron/activity.cjs");
  const stats = ledgerStats({ startedAt: "x", days: {
    "2026-09-21": { v: 2, messages: 2, sessions: 1, tokens: 0, hours: { 14: 2 }, models: {} },
    "2026-09-20": { v: 2, messages: 3, tokens: 9, hours: { 9: 2, 14: 1, 30: 50 }, models: { m: 9, zero: 0 } },
    "not-a-day": { messages: 99 }, "2026-09-19": "corrupt",
  } });
  assert.deepEqual(stats, {
    dailyActivity: [
      { date: "2026-09-20", messageCount: 3, sessionCount: 0, toolCallCount: 0 },
      { date: "2026-09-21", messageCount: 2, sessionCount: 1, toolCallCount: 0 },
    ],
    dailyModelTokens: [{ date: "2026-09-20", tokensByModel: { m: 9 } }],
    modelUsage: {},
    peakActivityHour: 14,
  });
  assert.equal(statsShape(stats), true);
  assert.deepEqual(ledgerStats("corrupt"), { dailyActivity: [], dailyModelTokens: [], modelUsage: {}, peakActivityHour: null });
  assert.equal(ledgerStats({ days: { "2026-09-20": { messages: 1, hours: { 9: 1, 3: 1 } } } }).peakActivityHour, 3, "a tie goes to the earlier hour");
  for (const bad of [null, {}, { dailyActivity: [], dailyModelTokens: [], modelUsage: {}, peakActivityHour: 24 }, { dailyActivity: [{}], dailyModelTokens: [], modelUsage: {}, peakActivityHour: null }, { dailyActivity: [], dailyModelTokens: [{ date: "d" }], modelUsage: {}, peakActivityHour: null }])
    assert.equal(statsShape(bad), false, JSON.stringify(bad));
});
// main.cjs 'stats': the core RPC when the core lists capabilities.codeStats (kept in config for
// the next launch), the ledger otherwise; the 'stats' push event carries the same object.
test("main.cjs serves the home stats from codeDesktop/stats/read, keeps the last result, and falls back to the ledger", async () => {
  const fs = await import("node:fs/promises");
  const main = await fs.readFile(new URL("../electron/main.cjs", import.meta.url), "utf8");
  assert.match(main, /core\?\.capabilities\?\.codeStats === true\) \{\n\s+const stats = await owner\.request\("codeDesktop\/stats\/read", \{\}\);/);
  assert.match(main, /config\.codeStats = stats; config\.codeStatsCore = coreKey; save\(\);/);
  assert.match(main, /const coreKey = statsCoreKey\(resolveCore\(\)\);/);
  assert.match(main, /return ledgerStats\(config\.activity\);/);
  assert.match(main, /e\.method === "turn\/completed"\) pushCodeStats\(\);/);
  assert.match(main, /emit\(\{ kind: "stats", stats \}\)/);
  assert.doesNotMatch(main, /emit\(\{ kind: "stats", stats: config\.stats, activity: config\.activity \}\)/);
  const statsCase = main.slice(main.indexOf('case "stats": {'), main.indexOf('case "session-ack"'));
  assert.match(statsCase, /const kept = keptCodeStats\(config, statsCoreKey\(resolveCore\(\)\), initial\?\.core\);\n\s+if \(!kept\) return readCodeStats\(\);\n\s+pushCodeStats\(\);\n\s+return kept;/);
});
// F09 review: a kept DeepSeek fold paints first only for the core that produced it.
test("keptCodeStats: only the producing core's kept result paints first", () => {
  const { statsCoreKey, keptCodeStats } = createRequire(import.meta.url)("../electron/activity.cjs");
  const stats = { dailyActivity: [{ date: "2026-09-30", messageCount: 1, sessionCount: 1, toolCallCount: 0 }], dailyModelTokens: [], modelUsage: {}, peakActivityHour: 9 };
  const bridge = statsCoreKey({ kind: "deepseek", command: "/usr/bin/node", prefix: ["/Apps/OpenClaude Desktop/core.js"] });
  const codexOverride = statsCoreKey({ kind: "override", command: "/opt/codex/codex", prefix: [] });
  const fixture = statsCoreKey({ kind: "override", command: "/tmp/codex-server.cjs", prefix: [] });
  assert.equal(bridge, "deepseek", "the default bridge is one core whatever its script path");
  assert.equal(codexOverride, "override:/opt/codex/codex");
  assert.equal(statsCoreKey({ kind: "codex", command: "codex", prefix: [] }), "codex");
  assert.equal(statsCoreKey(undefined), null);
  // A result kept before the key existed came from the default bridge.
  assert.equal(keptCodeStats({ codeStats: stats }, bridge, undefined), stats);
  assert.equal(keptCodeStats({ codeStats: stats }, codexOverride, undefined), null, "CODEX_BINARY → Codex: no DeepSeek fold before its ledger");
  assert.equal(keptCodeStats({ codeStats: stats }, "codex", undefined), null);
  // Tagged: only the same core.
  assert.equal(keptCodeStats({ codeStats: stats, codeStatsCore: fixture }, fixture, undefined), stats, "the same override binary relaunches with its kept result");
  assert.equal(keptCodeStats({ codeStats: stats, codeStatsCore: fixture }, codexOverride, undefined), null);
  assert.equal(keptCodeStats({ codeStats: stats, codeStatsCore: fixture }, bridge, undefined), null);
  assert.equal(keptCodeStats({ codeStats: stats, codeStatsCore: "deepseek" }, bridge, { capabilities: { codeStats: true } }), stats);
  // Once connected, a core without capabilities.codeStats never gets the kept result.
  assert.equal(keptCodeStats({ codeStats: stats, codeStatsCore: fixture }, fixture, { capabilities: {} }), null);
  assert.equal(keptCodeStats({ codeStats: { dailyActivity: "x" }, codeStatsCore: "deepseek" }, bridge, undefined), null);
  assert.equal(keptCodeStats(undefined, bridge, undefined), null);
  assert.equal(keptCodeStats({ codeStats: stats }, null, undefined), null);
});
