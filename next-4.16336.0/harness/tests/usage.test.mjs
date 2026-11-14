import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { UsageCache, accountTokenUsage, codeStats, deepseekUsage, foldSession, foldSessionBilling, foldSessionStats, foldSessionUsage, localDayKey, sessionUsageSummaries } from '../packages/codex-app-server/src/usage.js'
import { DEEPSEEK_PRICES, costCny, isPeakTime, modelDisplayName, pricedModel, pricingTier } from '../packages/codex-app-server/src/pricing.js'

// Local wall-clock times: day keys are local, like the app's ledger.
const at = (day, hour, minute = 0, second = 0) => new Date(2026, 8, day, hour, minute, second).getTime()
const usage = { inputTokens: 260, outputTokens: 11, cacheReadTokens: 8704, totalTokens: 8975 }
let seq = 0
const event = (type, time, data) => ({ type, seq: seq++, time, data })
const turn = (n, start, end, messages = 1) => [
  event('turn/start', start, { turn: n }),
  event('user/message', start, { turn: n, step: 0, message: { role: 'user', content: 'hi' } }),
  ...Array.from({ length: messages }, (_, step) => event('assistant/message', start + 1000 * (step + 1), { turn: n, step, message: { role: 'assistant', content: 'ok' }, stream: [], usage })),
  event('turn/end', end, { turn: n, reason: { kind: 'completed' } }),
]
const deepKeys = (value, keys = new Set()) => {
  if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) { keys.add(key); deepKeys(inner, keys) }
  return keys
}
const numbers = (value, out = []) => {
  if (typeof value === 'number') out.push(value)
  else if (value && typeof value === 'object') for (const inner of Object.values(value)) numbers(inner, out)
  return out
}

test('a session folds input + output per local day (cache reads excluded) and its longest turn', () => {
  const events = [...turn(1, at(29, 23, 59, 0), at(29, 23, 59, 30)), ...turn(2, at(30, 9), at(30, 9, 0, 12), 2)]
  const summary = foldSessionUsage(events)
  assert.deepEqual(summary.days, { '2026-09-29': 271, '2026-09-30': 542 })
  assert.equal(summary.longestTurnSec, 30)
})

test('account/usage/read has the Codex GetAccountTokenUsageResponse shape with safe integers only', () => {
  const summaries = [foldSessionUsage([...turn(1, at(29, 10), at(29, 10, 0, 30))]), foldSessionUsage([...turn(1, at(30, 8), at(30, 8, 0, 5))])]
  const { deepseek, ...response } = accountTokenUsage(summaries, '2026-09-30')
  assert.equal(deepseek.currency, 'CNY', 'the cost estimate rides beside the Codex shape')
  assert.deepEqual(response, {
    summary: { lifetimeTokens: 542, peakDailyTokens: 271, longestRunningTurnSec: 30, currentStreakDays: 2, longestStreakDays: 2 },
    dailyUsageBuckets: [{ startDate: '2026-09-29', tokens: 271 }, { startDate: '2026-09-30', tokens: 271 }],
    threadUsage: null,
  })
  assert.equal(deepKeys(response).has('daily'), false, 'no legacy daily key')
  assert.ok(numbers(response).every(Number.isSafeInteger))
  // No sessions: known zeros, not unknowns.
  assert.deepEqual(accountTokenUsage([], '2026-09-30').summary, { lifetimeTokens: 0, peakDailyTokens: 0, longestRunningTurnSec: 0, currentStreakDays: 0, longestStreakDays: 0 })
  assert.deepEqual(accountTokenUsage([], '2026-09-30').dailyUsageBuckets, [])
})

test('streaks: current counts back from today (0 when today is idle), longest is the longest consecutive run', () => {
  const days = { '2026-09-01': 5, '2026-09-02': 5, '2026-09-03': 5, '2026-09-10': 1, '2026-09-29': 2, '2026-09-30': 2 }
  const response = accountTokenUsage([{ days, longestTurnSec: 4 }, { days: { '2026-09-30': 3, bad: 9, '2026-09-11': -1 }, longestTurnSec: 7 }], '2026-09-30')
  assert.equal(response.summary.longestStreakDays, 3)
  assert.equal(response.summary.currentStreakDays, 2)
  assert.equal(response.summary.peakDailyTokens, 5)
  assert.equal(response.summary.lifetimeTokens, 23)
  assert.deepEqual(response.dailyUsageBuckets.at(-1), { startDate: '2026-09-30', tokens: 5 }, 'sessions sum per day')
  assert.equal(response.summary.longestRunningTurnSec, 7)
  assert.deepEqual(response.dailyUsageBuckets.map((bucket) => bucket.startDate), ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-29', '2026-09-30'])
  assert.equal(accountTokenUsage([{ days, longestTurnSec: 0 }], '2026-10-01').summary.currentStreakDays, 0)
  // Month boundary and an unsafe sum stays capped at a safe integer.
  assert.equal(accountTokenUsage([{ days: { '2026-08-31': 1, '2026-09-01': 1 } }], '2026-09-01').summary.currentStreakDays, 2)
  const huge = accountTokenUsage([{ days: { '2026-09-30': Number.MAX_SAFE_INTEGER } }, { days: { '2026-09-30': 5 } }], '2026-09-30')
  assert.ok(numbers(huge).every(Number.isSafeInteger))
})

test('a fork counts only what follows its inherited cut; unmatched turns and usage-less messages add nothing', () => {
  const parent = turn(1, at(28, 10), at(28, 10, 5))
  const events = [...parent, event('session/end-seed', at(30, 11), { inherited: true }), ...turn(2, at(30, 11), at(30, 11, 0, 3))]
  assert.deepEqual(foldSessionUsage(events), { days: { '2026-09-30': 271 }, longestTurnSec: 3 })
  // An untagged (restore) marker is not a fork cut.
  assert.deepEqual(foldSessionUsage([...parent, event('session/end-seed', at(30, 11), {})]).days, { '2026-09-28': 271 })
  const loose = [
    event('turn/start', at(30, 1), { turn: 5 }),
    event('assistant/message', at(30, 1, 0, 1), { turn: 5, step: 0, message: {}, stream: [], interrupted: true }),
    event('assistant/message', at(30, 1, 0, 2), { turn: 5, step: 1, message: {}, stream: [], usage: { inputTokens: -4, outputTokens: 1.5 } }),
    event('turn/end', at(30, 2), { turn: 6, reason: { kind: 'completed' } }),
  ]
  assert.deepEqual(foldSessionUsage(loose), { days: {}, longestTurnSec: 0 })
  assert.deepEqual(foldSessionUsage(undefined), { days: {}, longestTurnSec: 0 })
  assert.equal(localDayKey(at(30, 23, 59)), '2026-09-30')
})

test('sessionUsageSummaries: live from memory, cache by revision, at most 4 reads at once, failures skipped once per revision', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-cache-'))
  try {
    const logs = new Map(Array.from({ length: 9 }, (_, index) => [`s${index}`, turn(1, at(30, 10), at(30, 10, 0, index))]))
    const sessions = [...logs.keys()].map((id) => ({ id, revision: 'r1' }))
    let inFlight = 0, peak = 0
    const reads = []
    const readEvents = async (id) => {
      reads.push(id)
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      if (id === 'broken') throw new Error('unreadable')
      return logs.get(id)
    }
    const live = turn(1, at(30, 12), at(30, 12, 1, 0))
    const errors = []
    const input = (list) => ({ sessions: list, cache, liveEvents: (id) => (id === 'live' ? live : undefined), readEvents, onError: (id) => errors.push(id) })
    let cache = new UsageCache(dir, { timeZone: 'Test/Zone' })
    logs.set('other-owner', turn(1, at(30, 13), at(30, 13, 0, 1)))
    const first = await sessionUsageSummaries(input([...sessions, { id: 'live', revision: 'r1' }, { id: 'broken', revision: 'r1' }, { id: 'other-owner', revision: 'r1', live: true }]))
    assert.equal(peak, 4)
    assert.equal(first.length, 11, '10 read + live; the broken one is skipped')
    assert.deepEqual(errors, ['broken'])
    assert.equal(accountTokenUsage(first, '2026-09-30').summary.longestRunningTurnSec, 60, 'the live fold')

    // A second process: unchanged revisions come from the file; changed ones are re-read.
    reads.length = 0
    cache = new UsageCache(dir, { timeZone: 'Test/Zone' })
    const second = await sessionUsageSummaries(input([...sessions.map((session) => (session.id === 's3' ? { ...session, revision: 'r2' } : session)), { id: 'broken', revision: 'r1' }, { id: 'other-owner', revision: 'r1', live: true }]))
    assert.deepEqual(reads.sort(), ['broken', 'other-owner', 's3'], 'a sibling owner’s live log is never cached')
    assert.equal(second.length, 10, '9 + the other owner’s')
    // Same process: the unreadable revision is not retried; dropped sessions leave the file.
    reads.length = 0
    errors.length = 0
    await sessionUsageSummaries(input([{ id: 's0', revision: 'r1' }, { id: 'broken', revision: 'r1' }]))
    assert.deepEqual(reads, [])
    assert.deepEqual(errors, [])
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'usage-cache.json'), 'utf8'))
    assert.equal(stored.version, 4)
    assert.equal(stored.timeZone, 'Test/Zone')
    assert.deepEqual(Object.keys(stored.sessions), ['s0'])
    assert.deepEqual(stored.sessions.s0, { revision: 'r1', summary: { days: { '2026-09-30': 271 }, longestTurnSec: 0, stats: foldSessionStats(logs.get('s0')), billing: foldSessionBilling(logs.get('s0')) } })
    // Another time zone's day keys are not reused.
    assert.equal(new UsageCache(dir, { timeZone: 'Other/Zone' }).get('s0', 'r1'), undefined)
    assert.ok(new UsageCache(dir, { timeZone: 'Test/Zone' }).get('s0', 'r1'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// codeDesktop/stats/read (F09): the original getCodeStats shape from the same logs.
const prompt = (time, turnNo) => event('user/message', time, { turn: turnNo, step: 0, role: 'user', content: 'hi', source: { kind: 'user' } })
const reply = (time, turnNo, model, step = 0, extra = {}) => event('assistant/message', time, { turn: turnNo, step, message: { role: 'assistant', content: 'ok', source: { provider: 'deepseek-official', model } }, stream: [], usage, ...extra })
const toolCall = (time, turnNo) => event('tool/call', time, { turn: turnNo, step: 0, callId: `c${seq}`, name: 'read', arguments: '{}' })
const emptyUsage = { inputTokens: 0, outputTokens: 0, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 }

test('stats: the session counts on its first human prompt’s day; messages, tool calls and hours per local day', () => {
  const events = [
    // A runtime notice before the first prompt is neither a message nor the session start.
    event('user/message', at(28, 8), { turn: 0, step: 0, role: 'user', content: 'notice', source: { kind: 'subagent-settled' } }),
    event('turn/start', at(29, 23, 59), { turn: 1 }),
    prompt(at(29, 23, 59), 1),
    toolCall(at(29, 23, 59, 30), 1),
    reply(at(29, 23, 59, 40), 1, 'deepseek-v4-flash'),
    event('turn/end', at(29, 23, 59, 50), { turn: 1, reason: { kind: 'completed' } }),
    prompt(at(30, 9, 5), 2),
    reply(at(30, 9, 6), 2, 'deepseek-v4-flash'),
    toolCall(at(30, 10, 1), 2),
    toolCall(at(30, 10, 2), 2),
    reply(at(30, 10, 3), 2, 'deepseek-v4-pro', 1, { usage: { inputTokens: 1000, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 64 } }),
  ]
  const stats = foldSessionStats(events)
  assert.deepEqual(stats.days, {
    '2026-09-29': { sessions: 1, messages: 2, toolCalls: 1, hours: { 23: 2 }, models: { 'deepseek-v4-flash': 271 } },
    '2026-09-30': { sessions: 0, messages: 3, toolCalls: 2, hours: { 9: 2, 10: 1 }, models: { 'deepseek-v4-flash': 271, 'deepseek-v4-pro': 1050 } },
  }, 'a multi-model day keeps each model; uncached input + output like the token buckets')
  assert.deepEqual(stats.models, {
    'deepseek-v4-flash': { inputTokens: 520, outputTokens: 22, cacheReadInputTokens: 17408, cacheCreationInputTokens: 0 },
    'deepseek-v4-pro': { inputTokens: 1000, outputTokens: 50, cacheReadInputTokens: 0, cacheCreationInputTokens: 64 },
  })
  assert.deepEqual(foldSession(events).stats, stats, 'the cached summary carries the stats fold')
  assert.deepEqual(foldSession(events).days, foldSessionUsage(events).days)
  // A reply without usage or model still counts as a message; nothing else does.
  const bare = foldSessionStats([event('assistant/message', at(30, 1), { turn: 1, step: 0, message: {}, stream: [], interrupted: true }), event('turn/start', at(30, 1), { turn: 1 })])
  assert.deepEqual(bare, { days: { '2026-09-30': { sessions: 0, messages: 1, toolCalls: 0, hours: { 1: 1 }, models: {} } }, models: {} })
  assert.deepEqual(foldSessionStats(undefined), { days: {}, models: {} })
})

test('stats: a fork counts only what follows its inherited cut, and its own first prompt starts a session', () => {
  const parent = [prompt(at(27, 10), 1), reply(at(27, 10, 1), 1, 'deepseek-v4-flash'), toolCall(at(27, 10, 2), 1)]
  const fork = [...parent, event('session/end-seed', at(30, 11), { inherited: true }), reply(at(30, 11, 1), 2, 'deepseek-v4-pro'), prompt(at(30, 12), 3)]
  assert.deepEqual(foldSessionStats(fork), {
    days: { '2026-09-30': { sessions: 1, messages: 2, toolCalls: 0, hours: { 11: 1, 12: 1 }, models: { 'deepseek-v4-pro': 271 } } },
    models: { 'deepseek-v4-pro': { inputTokens: 260, outputTokens: 11, cacheReadInputTokens: 8704, cacheCreationInputTokens: 0 } },
  })
  // A fork with no human prompt after its cut is no session (sub-agent children: see the origin test below); an untagged (restore) marker is not a cut.
  assert.equal(foldSessionStats([event('session/end-seed', at(30, 11), { inherited: true }), reply(at(30, 11, 1), 1, 'm')]).days['2026-09-30'].sessions, 0)
  const restored = foldSessionStats([...parent, event('session/end-seed', at(30, 11), {}), prompt(at(30, 12), 2)])
  assert.deepEqual(Object.keys(restored.days), ['2026-09-27', '2026-09-30'])
  assert.equal(restored.days['2026-09-30'].sessions, 0, 'one session, counted on its first prompt’s day')
})

test('codeStats: the original shape, ascending days, summed models, all-time peak hour (earliest on a tie)', () => {
  const a = foldSession([prompt(at(29, 9), 1), reply(at(29, 9, 1), 1, 'deepseek-v4-flash'), toolCall(at(29, 9, 2), 1)])
  const b = foldSession([prompt(at(30, 14), 1), reply(at(30, 14, 1), 1, 'deepseek-v4-pro'), prompt(at(30, 15), 2), reply(at(30, 15, 1), 2, 'deepseek-v4-flash'), reply(at(30, 15, 2), 2, 'deepseek-v4-flash', 1)])
  const c = foldSession([prompt(at(29, 9, 30), 1)])
  const stats = codeStats([b, a, c])
  assert.deepEqual(stats, {
    dailyActivity: [
      { date: '2026-09-29', messageCount: 3, sessionCount: 2, toolCallCount: 1 },
      { date: '2026-09-30', messageCount: 5, sessionCount: 1, toolCallCount: 0 },
    ],
    dailyModelTokens: [
      { date: '2026-09-29', tokensByModel: { 'deepseek-v4-flash': 271 } },
      { date: '2026-09-30', tokensByModel: { 'deepseek-v4-pro': 271, 'deepseek-v4-flash': 542 } },
    ],
    modelUsage: {
      'deepseek-v4-pro': { inputTokens: 260, outputTokens: 11, cacheReadInputTokens: 8704, cacheCreationInputTokens: 0 },
      'deepseek-v4-flash': { inputTokens: 780, outputTokens: 33, cacheReadInputTokens: 26112, cacheCreationInputTokens: 0 },
    },
    peakActivityHour: 9,
  })
  assert.equal(codeStats([foldSession([prompt(at(30, 15), 1), prompt(at(30, 8), 2)])]).peakActivityHour, 8, 'a tie goes to the earlier hour')
  assert.deepEqual(codeStats([]), { dailyActivity: [], dailyModelTokens: [], modelUsage: {}, peakActivityHour: null })
  // Garbage from a hand-edited cache never leaks: bad keys, negatives, prototype names.
  const junk = codeStats([{ stats: { days: { bad: { messages: 5 }, '2026-09-30': { sessions: -1, messages: 1.5, toolCalls: 2, hours: { 25: 4, 3: 1 }, models: { __proto__: 9, m: -3 } } }, models: { m: { inputTokens: 'x' } } } }])
  assert.deepEqual(junk, { dailyActivity: [{ date: '2026-09-30', messageCount: 0, sessionCount: 0, toolCallCount: 2 }], dailyModelTokens: [], modelUsage: { m: emptyUsage }, peakActivityHour: 3 })
  const huge = codeStats([{ stats: { days: { '2026-09-30': { messages: Number.MAX_SAFE_INTEGER, sessions: 1, toolCalls: 0, hours: {}, models: { m: Number.MAX_SAFE_INTEGER } } }, models: {} } }, b])
  assert.ok(numbers(huge).every(Number.isSafeInteger))
})

test('the version-1 and version-2 usage caches are refolded once: its summaries carry no stats', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-cache-v1-'))
  try {
    const log = [prompt(at(30, 10), 1), reply(at(30, 10, 1), 1, 'deepseek-v4-flash')]
    fs.writeFileSync(path.join(dir, 'usage-cache.json'), JSON.stringify({ version: 1, timeZone: 'Test/Zone', sessions: { s0: { revision: 'r1', summary: { days: { '2026-09-30': 271 }, longestTurnSec: 0 } } } }))
    const cache = new UsageCache(dir, { timeZone: 'Test/Zone' })
    assert.equal(cache.get('s0', 'r1'), undefined)
    const reads = []
    const summaries = await sessionUsageSummaries({ sessions: [{ id: 's0', revision: 'r1' }], cache, liveEvents: () => undefined, readEvents: async (id) => { reads.push(id); return log } })
    assert.deepEqual(reads, ['s0'])
    assert.equal(codeStats(summaries).dailyActivity[0].sessionCount, 1)
    assert.equal(accountTokenUsage(summaries, '2026-09-30').summary.lifetimeTokens, 271, 'account usage reads the same fold')
    // A version-2 entry with a malformed stats fold is dropped too.
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'usage-cache.json'), 'utf8'))
    assert.equal(stored.version, 4)
    // A version-2 file (no billing fold) is refolded too.
    fs.writeFileSync(path.join(dir, 'usage-cache.json'), JSON.stringify({ ...stored, version: 2 }))
    assert.equal(new UsageCache(dir, { timeZone: 'Test/Zone' }).get('s0', 'r1'), undefined)
    fs.writeFileSync(path.join(dir, 'usage-cache.json'), JSON.stringify({ ...stored, version: 3 }))
    assert.equal(new UsageCache(dir, { timeZone: 'Test/Zone' }).get('s0', 'r1'), undefined, 'version 3 cannot account for streamed responses')
    const { billing, ...noBilling } = stored.sessions.s0.summary
    fs.writeFileSync(path.join(dir, 'usage-cache.json'), JSON.stringify({ ...stored, sessions: { s0: { revision: 'r1', summary: noBilling } } }))
    assert.equal(new UsageCache(dir, { timeZone: 'Test/Zone' }).get('s0', 'r1'), undefined, 'a current entry without billing is dropped')
    assert.ok(billing['2026-09-30'])
    stored.sessions.s0.summary.stats.days['2026-09-30'].messages = -1
    fs.writeFileSync(path.join(dir, 'usage-cache.json'), JSON.stringify(stored))
    assert.equal(new UsageCache(dir, { timeZone: 'Test/Zone' }).get('s0', 'r1'), undefined)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('stats: a sub-agent child (header.origin subagent) adds messages, tool calls and tokens but no session, cached or not', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-cache-subagent-'))
  try {
    const parent = [event('turn/start', at(30, 9), { turn: 1 }), prompt(at(30, 9), 1), toolCall(at(30, 9, 1), 1), reply(at(30, 9, 2), 1, 'deepseek-v4-pro'), event('turn/end', at(30, 9, 3), { turn: 1, reason: { kind: 'completed' } })]
    // The real child log: dsh-subagent-in-process-driver drivePublishedRun sends the delegated
    // prompt as createUserMessage({content, source: {kind: 'user'}}) and the descriptor follows
    // inside that first turn (attachDescriptorAppend on agent/pre-step).
    const child = (hour) => [
      event('turn/start', at(30, hour), { turn: 1 }),
      prompt(at(30, hour), 1),
      event('subagent/descriptor', at(30, hour, 0, 1), { kind: 'one-shot' }),
      toolCall(at(30, hour, 0, 2), 1),
      reply(at(30, hour, 0, 3), 1, 'deepseek-v4-flash'),
      event('turn/end', at(30, hour, 0, 4), { turn: 1, reason: { kind: 'completed' } }),
    ]
    assert.equal(foldSessionStats(child(10)).days['2026-09-30'].sessions, 1, 'the fold alone cannot tell the delegated prompt from a human one')
    const logs = new Map([['parent', parent], ['child', child(10)]])
    const live = child(11)
    const reads = []
    const input = (cache) => ({
      sessions: [{ id: 'parent', revision: 'r1' }, { id: 'child', revision: 'r1', subagent: true }, { id: 'live-child', revision: 'r1', subagent: true }],
      cache,
      liveEvents: (id) => (id === 'live-child' ? live : undefined),
      readEvents: async (id) => { reads.push(id); return logs.get(id) },
    })
    const expected = {
      dailyActivity: [{ date: '2026-09-30', messageCount: 6, sessionCount: 1, toolCallCount: 3 }],
      dailyModelTokens: [{ date: '2026-09-30', tokensByModel: { 'deepseek-v4-pro': 271, 'deepseek-v4-flash': 542 } }],
      modelUsage: {
        'deepseek-v4-pro': { inputTokens: 260, outputTokens: 11, cacheReadInputTokens: 8704, cacheCreationInputTokens: 0 },
        'deepseek-v4-flash': { inputTokens: 520, outputTokens: 22, cacheReadInputTokens: 17408, cacheCreationInputTokens: 0 },
      },
      peakActivityHour: 9,
    }
    const first = await sessionUsageSummaries(input(new UsageCache(dir, { timeZone: 'Test/Zone' })))
    assert.deepEqual(reads.sort(), ['child', 'parent'])
    assert.deepEqual(codeStats(first), expected, 'one session (the parent); both children add messages, tool calls and tokens')
    assert.equal(accountTokenUsage(first, '2026-09-30').summary.lifetimeTokens, 813, 'account usage still counts the children')
    // The cache keeps the plain fold: the flag rides beside it and comes back on a cache hit.
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'usage-cache.json'), 'utf8'))
    assert.equal('subagent' in stored.sessions.child.summary, false)
    assert.deepEqual(stored.sessions.child.summary, foldSession(logs.get('child')))
    reads.length = 0
    const second = await sessionUsageSummaries(input(new UsageCache(dir, { timeZone: 'Test/Zone' })))
    assert.deepEqual(reads, [], 'served from the cache')
    assert.deepEqual(codeStats(second), expected)
    // Without the flag the same child would be a second and third session.
    assert.equal(codeStats([foldSession(parent), foldSession(logs.get('child')), foldSession(live)]).dailyActivity[0].sessionCount, 3)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// Estimated cost (account/usage/read `deepseek`): pricing.js + foldSessionBilling + deepseekUsage.
// Beijing wall-clock times: peak is Beijing (UTC+8) Mon–Fri 09–12 and 14–18 whatever the local zone.
const beijing = (month, day, hour, minute = 0) => Date.UTC(2026, month - 1, day, hour - 8, minute)

test('pricing: peak is Beijing Mon–Fri 09:00–12:00 and 14:00–18:00, everything else off-peak', () => {
  // 2026-09-30 is a Wednesday; 10-03 a Saturday, 10-04 a Sunday, 10-05 a Monday.
  const cases = [
    [beijing(9, 30, 8, 59), false], [beijing(9, 30, 9, 0), true], [beijing(9, 30, 11, 59), true], [beijing(9, 30, 12, 0), false],
    [beijing(9, 30, 13, 59), false], [beijing(9, 30, 14, 0), true], [beijing(9, 30, 17, 59), true], [beijing(9, 30, 18, 0), false],
    [beijing(9, 30, 23, 30), false], [beijing(10, 3, 10), false], [beijing(10, 4, 15), false], [beijing(10, 5, 9, 30), true],
    // 01:30 UTC Monday is 09:30 Beijing Monday; 17:00 UTC Friday is Saturday 01:00 in Beijing.
    [Date.UTC(2026, 9, 5, 1, 30), true], [Date.UTC(2026, 9, 2, 17, 0), false],
  ]
  for (const [time, peak] of cases) {
    assert.equal(isPeakTime(time), peak, new Date(time).toISOString())
    assert.equal(pricingTier(time), peak ? 'peak' : 'offPeak')
  }
  assert.equal(isPeakTime(NaN), false)
})

test('pricing: official CNY per 1M tokens by model and tier; old Flash ids bill as Flash; unknown models have no price', () => {
  const million = { inputTokens: 1e6, cacheReadTokens: 1e6, cacheWriteTokens: 0, outputTokens: 1e6 }
  assert.deepEqual(costCny('deepseek-flash', 'offPeak', million), { input: 1, cacheRead: 0.02, output: 4, total: 5.02 })
  assert.deepEqual(costCny('deepseek-flash', 'peak', million), { input: 2, cacheRead: 0.04, output: 8, total: 10.04 })
  assert.deepEqual(costCny('deepseek-v4-pro', 'offPeak', million), { input: 4.5, cacheRead: 0.15, output: 13.5, total: 18.15 })
  assert.deepEqual(costCny('deepseek-v4-pro', 'peak', million), { input: 9, cacheRead: 0.3, output: 27, total: 36.3 })
  // Cache writes are billed as cache-miss input.
  assert.equal(costCny('deepseek-v4-pro', 'offPeak', { cacheWriteTokens: 2e6 }).input, 9)
  for (const id of ['deepseek-v4-flash', 'deepseek-v4-flash-vision-exp', 'deepseek-flash']) {
    assert.equal(pricedModel(id), 'deepseek-flash')
    assert.equal(modelDisplayName(id), '4.1 Flash')
  }
  assert.equal(modelDisplayName('deepseek-v4-pro'), '4 Pro')
  for (const id of ['gpt-5', 'deepseek-chat', '', null, '__proto__', 'constructor']) assert.equal(costCny(id, 'peak', million), null, String(id))
  assert.equal(modelDisplayName('gpt-5'), 'gpt-5')
  assert.equal(Object.keys(DEEPSEEK_PRICES).length, 2)
})

const priced = (time, model, usage) => event('assistant/message', time, { turn: 1, step: 0, message: { role: 'assistant', content: 'ok', source: { provider: 'deepseek-official', model } }, stream: [], usage })

test('billing fold: tokens by local day, model, price tier and category, after the fork cut', () => {
  const events = [
    priced(beijing(9, 28, 10), 'deepseek-v4-pro', { inputTokens: 999, outputTokens: 1 }),
    event('session/end-seed', beijing(9, 30, 9), { inherited: true }),
    priced(beijing(9, 30, 10), 'deepseek-v4-flash', { inputTokens: 100, outputTokens: 20, cacheReadTokens: 1000, reasoningTokens: 15 }),
    priced(beijing(9, 30, 10, 30), 'deepseek-v4-flash', { inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4 }),
    priced(beijing(9, 30, 12, 30), 'deepseek-v4-flash', { inputTokens: 5, outputTokens: 5 }),
    priced(beijing(9, 30, 15), undefined, { inputTokens: 7, outputTokens: 0 }),
    priced(beijing(9, 30, 16), 'deepseek-v4-pro', { inputTokens: 0, outputTokens: 0 }),
    event('assistant/message', beijing(9, 30, 16), { turn: 1, step: 1, message: {}, stream: [], interrupted: true }),
  ]
  const billing = foldSessionBilling(events)
  const day = (time) => localDayKey(time)
  // Every time is on 09-30 in Beijing; the local day key may differ, so key by the event's local day.
  const expected = {}
  const put = (time, model, tier, cell) => {
    const slot = ((expected[day(time)] ??= {})[model] ??= {})
    slot[tier] = (slot[tier] ?? [0, 0, 0, 0]).map((value, index) => value + cell[index])
  }
  put(beijing(9, 30, 10), 'deepseek-v4-flash', 'peak', [100, 1000, 0, 20])
  put(beijing(9, 30, 10, 30), 'deepseek-v4-flash', 'peak', [1, 3, 4, 2])
  put(beijing(9, 30, 12, 30), 'deepseek-v4-flash', 'offPeak', [5, 0, 0, 5])
  put(beijing(9, 30, 15), 'unknown', 'peak', [7, 0, 0, 0])
  assert.deepEqual(billing, expected, 'reasoning is inside output; zero-usage and usage-less messages add nothing; the parent part is cut')
  assert.deepEqual(foldSession(events).billing, billing)
  assert.deepEqual(foldSessionBilling(undefined), {})
})

test('deepseekUsage: all-time, last-30-days and today totals, per-model and per-day costs in CNY', () => {
  // Local wall-clock times keep the day keys deterministic; the price tier is the same instant's Beijing time.
  const t1 = at(30, 10), t2 = at(30, 22), t3 = at(15, 9), t4 = at(1, 9, 0) - 40 * 864e5
  const sessionA = foldSession([
    priced(t1, 'deepseek-v4-flash', { inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 1e6 }),
    priced(t2, 'deepseek-v4-pro', { inputTokens: 2e6, outputTokens: 0, cacheWriteTokens: 1e6 }),
  ])
  const sessionB = foldSession([
    priced(t3, 'deepseek-flash', { inputTokens: 0, outputTokens: 500000 }),
    priced(t4, 'mystery-model', { inputTokens: 300, outputTokens: 200 }),
  ])
  const usage = deepseekUsage([sessionA, sessionB], '2026-09-30')
  const cost = (time, model, tokens) => costCny(model, pricingTier(time), tokens)
  const c1 = cost(t1, 'deepseek-v4-flash', { inputTokens: 1e6, outputTokens: 1e6, cacheReadTokens: 1e6 })
  const c2 = cost(t2, 'deepseek-v4-pro', { inputTokens: 2e6, cacheWriteTokens: 1e6 })
  const c3 = cost(t3, 'deepseek-flash', { outputTokens: 500000 })
  const round = (value) => Math.round(value * 1e6) / 1e6
  assert.equal(usage.currency, 'CNY')
  assert.equal(usage.today.tokens, 6e6)
  assert.equal(usage.today.costCny, round(c1.total + c2.total))
  assert.equal(usage.today.inputCostCny, round(c1.input + c2.input))
  assert.equal(usage.today.cacheReadCostCny, round(c1.cacheRead))
  assert.equal(usage.today.outputCostCny, round(c1.output))
  assert.deepEqual([usage.today.inputTokens, usage.today.cacheReadTokens, usage.today.cacheWriteTokens, usage.today.outputTokens], [3e6, 1e6, 1e6, 1e6])
  assert.equal(usage.last30Days.tokens, 6.5e6)
  assert.equal(usage.last30Days.costCny, round(c1.total + c2.total + c3.total))
  assert.equal(usage.last30Days.unpricedTokens, 0)
  // All time adds the unpriced 40-days-old model: counted, not priced.
  assert.equal(usage.allTime.tokens, 6.5e6 + 500)
  assert.equal(usage.allTime.unpricedTokens, 500)
  assert.equal(usage.allTime.costCny, usage.last30Days.costCny)
  assert.deepEqual(usage.models.map((entry) => [entry.model, entry.displayName, entry.tokens, entry.costCny]), [
    ['deepseek-flash', '4.1 Flash', 3.5e6, round(c1.total + c3.total)],
    ['deepseek-v4-pro', '4 Pro', 3e6, round(c2.total)],
    ['mystery-model', 'mystery-model', 500, null],
  ], 'old Flash ids merge into 4.1 Flash; an unknown model has tokens and no cost')
  assert.deepEqual(usage.daily.map((entry) => entry.date), [localDayKey(t4), '2026-09-15', '2026-09-30'])
  assert.equal(usage.daily[0].costCny, null)
  assert.equal(usage.daily[2].costCny, usage.today.costCny)
  // The Codex response carries it beside the unchanged buckets.
  const response = accountTokenUsage([sessionA, sessionB], '2026-09-30')
  assert.deepEqual(response.deepseek, usage)
  assert.equal(response.summary.lifetimeTokens, 1e6 + 1e6 + 2e6 + 500000 + 500, 'lifetimeTokens keeps the original uncached input + output')
  // Nothing used: zeros (known), not nulls.
  const empty = deepseekUsage([], '2026-09-30')
  assert.deepEqual(empty.allTime, { tokens: 0, inputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, peakTokens: 0, unpricedTokens: 0, costCny: 0, inputCostCny: 0, cacheReadCostCny: 0, outputCostCny: 0 })
  assert.deepEqual([empty.models, empty.daily], [[], []])
  // Hand-edited garbage never leaks.
  const junk = deepseekUsage([{ billing: { bad: {}, '2026-09-30': { __proto__: { peak: [1, 1, 1, 1] }, m: { peak: [1, -1, 0, 0], offPeak: [1, 2], other: [5, 5, 5, 5] } } } }], '2026-09-30')
  assert.equal(junk.allTime.tokens, 0)
})

test('deepseekUsage: peak and off-peak use different prices; the last-30-days window ends today', () => {
  // A Wednesday 10:00 Beijing (peak) and 20:00 Beijing (off-peak), same tokens.
  const peak = foldSession([priced(beijing(9, 30, 10), 'deepseek-v4-pro', { inputTokens: 1e6, outputTokens: 0 })])
  const offPeak = foldSession([priced(beijing(9, 30, 20), 'deepseek-v4-pro', { inputTokens: 1e6, outputTokens: 0 })])
  assert.equal(deepseekUsage([peak], '2026-10-30').allTime.costCny, 9)
  assert.equal(deepseekUsage([peak], '2026-10-30').allTime.peakTokens, 1e6)
  assert.equal(deepseekUsage([offPeak], '2026-10-30').allTime.costCny, 4.5)
  assert.equal(deepseekUsage([offPeak], '2026-10-30').allTime.peakTokens, 0)
  const day = localDayKey(beijing(9, 30, 10))
  const [year, month, date] = day.split('-').map(Number)
  const shifted = (offset) => localDayKey(new Date(year, month - 1, date + offset, 12).getTime())
  assert.equal(deepseekUsage([peak], shifted(29)).last30Days.tokens, 1e6, 'day 30 of the window')
  assert.equal(deepseekUsage([peak], shifted(30)).last30Days.tokens, 0, 'outside the window')
  assert.equal(deepseekUsage([peak], shifted(-1)).last30Days.tokens, 0, 'a future day is not in the window')
  assert.equal(deepseekUsage([peak], day).today.tokens, 1e6)
})
