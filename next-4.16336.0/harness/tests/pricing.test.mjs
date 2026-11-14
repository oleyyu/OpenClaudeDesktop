import test from 'node:test'
import assert from 'node:assert/strict'
import { ALIASES, DEEPSEEK_PRICES, costCny, modelDisplayName, normalizePrices, priceTable, pricedModel } from '../packages/codex-app-server/src/pricing.js'
import { accountTokenUsage, deepseekUsage } from '../packages/codex-app-server/src/usage.js'

const tier = (cacheHit, cacheMiss, output) => ({ cacheHit, cacheMiss, output })

test('normalizePrices keeps valid entries only (the app prefs rules)', () => {
  assert.deepEqual(normalizePrices(null), {})
  assert.deepEqual(normalizePrices({
    'deepseek-flash': { offPeak: tier(0.1, 2, 5), peak: tier(0.2, 4, 10) },
    'my-model': { displayName: ' Mine ', offPeak: tier(0, 0, 0), peak: tier(1, 1, 1) },
    'negative': { offPeak: tier(-1, 1, 1), peak: tier(1, 1, 1) },
    'too-much': { offPeak: tier(1, 1, 10001), peak: tier(1, 1, 1) },
    'no-peak': { offPeak: tier(1, 1, 1) },
    'bad id': { offPeak: tier(1, 1, 1), peak: tier(1, 1, 1) },
    'nan': { offPeak: tier(NaN, 1, 1), peak: tier(1, 1, 1) },
  }), {
    'deepseek-flash': { displayName: '4.1 Flash', offPeak: tier(0.1, 2, 5), peak: tier(0.2, 4, 10) },
    'my-model': { displayName: 'Mine', offPeak: tier(0, 0, 0), peak: tier(1, 1, 1) },
  })
})

test('priceTable merges overrides over the official prices; defaults keep the official behaviour', () => {
  assert.equal(priceTable(null), DEEPSEEK_PRICES)
  assert.equal(priceTable({ bad: 1 }), DEEPSEEK_PRICES)
  const table = priceTable({ 'deepseek-flash': { offPeak: tier(0.1, 2, 5), peak: tier(0.2, 4, 10) }, 'my-model': { offPeak: tier(1, 1, 1), peak: tier(2, 2, 2) } })
  assert.deepEqual(table['deepseek-v4-pro'], DEEPSEEK_PRICES['deepseek-v4-pro'])
  const million = { inputTokens: 1e6, cacheReadTokens: 1e6, outputTokens: 1e6 }
  assert.deepEqual(costCny('deepseek-flash', 'offPeak', million, table), { input: 2, cacheRead: 0.1, output: 5, total: 7.1 })
  assert.deepEqual(costCny('deepseek-flash', 'offPeak', million), { input: 1, cacheRead: 0.02, output: 4, total: 5.02 })
  assert.equal(costCny('my-model', 'peak', million, table).total, 6)
  assert.equal(costCny('my-model', 'peak', million), null)
  assert.equal(modelDisplayName('my-model', table), 'my-model', 'no display name: the id')
  assert.equal(modelDisplayName('deepseek-flash', table), '4.1 Flash')
})

test('aliases bill as deepseek-flash only when the table has no exact entry', () => {
  assert.deepEqual(ALIASES['deepseek-v4-flash'], 'deepseek-flash')
  assert.equal(pricedModel('deepseek-v4-flash'), 'deepseek-flash')
  assert.equal(pricedModel('DeepSeek-V4-Flash'), 'deepseek-flash')
  const table = priceTable({ 'deepseek-v4-flash': { displayName: 'Old Flash', offPeak: tier(1, 1, 1), peak: tier(1, 1, 1) } })
  assert.equal(pricedModel('deepseek-v4-flash', table), 'deepseek-v4-flash')
  assert.equal(pricedModel('deepseek-v4-flash-vision-exp', table), 'deepseek-flash')
  assert.equal(modelDisplayName('deepseek-v4-flash', table), 'Old Flash')
  assert.equal(pricedModel('unknown', table), null)
})

test('accountTokenUsage prices the deepseek extension with the app overrides', () => {
  const summaries = [{ days: { '2026-09-30': 2e6 }, longestTurnSec: 0, billing: { '2026-09-30': { 'deepseek-flash': { offPeak: [1e6, 0, 0, 1e6] }, 'my-model': { peak: [1e6, 0, 0, 0] } } } }]
  const official = accountTokenUsage(summaries, '2026-09-30')
  assert.equal(official.deepseek.customPrices, false)
  assert.equal(official.deepseek.today.costCny, 5)
  assert.equal(official.deepseek.today.unpricedTokens, 1e6)
  const custom = accountTokenUsage(summaries, '2026-09-30', { 'deepseek-flash': { offPeak: tier(0, 2, 6), peak: tier(0, 2, 6) }, 'my-model': { displayName: 'Mine', offPeak: tier(0, 1, 1), peak: tier(0, 3, 3) } })
  assert.equal(custom.deepseek.customPrices, true)
  assert.equal(custom.deepseek.today.costCny, 11)
  assert.equal(custom.deepseek.today.unpricedTokens, 0)
  assert.deepEqual(custom.deepseek.models.map((entry) => [entry.model, entry.displayName, entry.costCny]), [['deepseek-flash', '4.1 Flash', 8], ['my-model', 'Mine', 3]])
  // Counts are unchanged by prices.
  assert.deepEqual(custom.summary, official.summary)
  assert.deepEqual(deepseekUsage(summaries, '2026-09-30'), official.deepseek)
})
