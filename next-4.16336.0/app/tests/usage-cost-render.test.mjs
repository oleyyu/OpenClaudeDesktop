// Settings › Usage cost view on every core (audit 42/51): DeepSeek's CNY estimate with its Platform link, a priced
// USD breakdown with a neutral footnote, a tokens-only breakdown without cost columns, and a bare spend section.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { usageCostPresentation, usageSpendPresentation } from '../src/usage-cost-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
let server, React, render, CostUsage, SpendSection, usageCore, usageModelNames;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ CostUsage, SpendSection, usageCore, usageModelNames } = await server.ssrLoadModule('/src/source-usage.jsx'));
});
after(() => server?.close());

const day = '2026-09-30';
const totals = (tokens, cost, key) => ({ tokens, inputTokens: tokens, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0, unpricedTokens: cost === null ? tokens : 0,
  ...(key ? { [key]: cost, [`input${key[0].toUpperCase()}${key.slice(1)}`]: cost } : {}) });
const breakdown = (key, cost, extra = {}) => ({ allTime: totals(100, cost, key), last30Days: totals(100, cost, key), today: totals(100, cost, key),
  models: [{ model: 'm1', tokens: 100, ...(key ? { [key]: cost } : {}) }], daily: [{ date: day, tokens: 100, ...(key ? { [key]: cost } : {}) }], ...extra });
const html = (tokenUsage) => render(React.createElement(CostUsage, { cost: usageCostPresentation({ tokenUsage }, { todayKey: day, locale: 'en-US' }), onOpenLink() {} }));

test('DeepSeek source: CNY estimates, DeepSeek footnote and Platform link', () => {
  const out = html({ deepseek: breakdown('costCny', 1.5) });
  assert.match(out, /≈ ¥1\.50/); assert.match(out, /Tokens · est\. cost/); assert.match(out, /DeepSeek Platform usage/); assert.match(out, /Estimated cost/);
});
test('a priced breakdown from another core: USD, neutral footnote, no DeepSeek anywhere', () => {
  const out = html({ breakdown: breakdown('costUsd', 0.25) });
  assert.match(out, /≈ \$0\.25/); assert.match(out, /Where the cost goes/); assert.match(out, /your provider’s bill is authoritative/);
  assert.doesNotMatch(out, /DeepSeek|¥/);
});
test('a tokens-only breakdown (ACP agents): no cost columns, tiles or footnote', () => {
  const out = html({ breakdown: breakdown('costCny', null, { priced: false }) });
  assert.doesNotMatch(out, /su-tile-cost|su-day-cost|su-legend-cost|Estimated cost|est\. cost|su-footnote|DeepSeek|—/);
  assert.match(out, /Where the tokens go/); assert.match(out, /<th scope="col">Tokens<\/th><\/tr>/);
  const empty = html({ breakdown: { ...breakdown('costCny', null, { priced: false }), daily: [] } });
  assert.match(empty, /No usage in the last 30 days\./); assert.doesNotMatch(empty, /DeepSeek/);
});
test('a bare all-time spend (OpenCode / MiMo) names the core and keeps USD', () => {
  const spend = usageSpendPresentation({ tokenUsage: { opencode: { costUsd: 1.2345 } } });
  for (const [engine, name] of [['opencode', 'OpenCode'], ['mimo', 'MiMo Code'], [{ engine: 'opencode' }, 'OpenCode']]) {
    const out = render(React.createElement(SpendSection, { spend, engine }));
    assert.match(out, /Estimated spend/); assert.match(out, /≈ \$1\.23/); assert.match(out, new RegExp(`prices ${name} records`)); assert.doesNotMatch(out, /DeepSeek/);
  }
});

// main marks a per-token account's refused limits with codeDesktop.perTokenBilling; the page reads it from the answer
// itself (boot.core learns it a render later), so the empty-limits copy explains per-token billing right away.
test('the Usage page honors codeDesktop.perTokenBilling from the answer it got', async () => {
  const { usageEmptyText } = await import('../src/usage-model.mjs');
  const marked = { limits: { rateLimits: null, codeDesktop: { perTokenBilling: true } } };
  for (const [engine, name] of [['codex', 'Codex'], [{ id: 'codex', engine: 'codex', capabilities: {} }, 'Codex'], [undefined, 'Codex'], [{ engine: 'kimi', capabilities: { deleteHistory: true } }, 'Kimi Code']])
    assert.equal(usageEmptyText(usageCore(engine, marked)), `Usage on ${name} is billed per token by your provider; there are no plan usage limits.`, JSON.stringify(engine));
  assert.equal(usageEmptyText(usageCore('codex', { tokenUsage: { codeDesktop: { perTokenBilling: true } } })), 'Usage on Codex is billed per token by your provider; there are no plan usage limits.');
  // Reported capabilities are kept; an unmarked answer leaves the core as it is.
  assert.deepEqual(usageCore({ engine: 'kimi', capabilities: { deleteHistory: true } }, marked).capabilities, { deleteHistory: true, perTokenBilling: true });
  const core = { engine: 'codex', capabilities: {} };
  for (const data of [null, {}, { limits: { codeDesktop: { perTokenBilling: false } } }]) assert.equal(usageCore(core, data), core);
  assert.equal(usageEmptyText(usageCore('codex', {})), 'Usage limits are unavailable for this account or connection.');
});

test('local usage rows use the model menu names, keeping the id for the tooltip', () => {
  const names = usageModelNames([{ id: 'fixture', model: 'fixture', displayName: 'Test model' }, { model: 'anthropic/claude', displayName: ' ' }, null]);
  assert.equal(names.get('fixture'), 'Test model');
  assert.equal(names.has('anthropic/claude'), false);
  assert.equal(usageModelNames(undefined).size, 0);
});

// B36 (c71860c77-29nOu6oI W): with the page's handlers, the per-day section carries the Chart metric (priced sources
// only; Cost disabled when no day has an estimate) and the Time range; the Cost metric measures the bars by cost.
test('time range and chart metric controls over the per-day rows', () => {
 const props = (tokenUsage, extra = {}) => ({ cost: usageCostPresentation({ tokenUsage }, { todayKey: day, locale: 'en-US', days: extra.days ?? 30 }), onOpenLink() {}, onRange() {}, onMetric() {}, ...extra });
 const priced = render(React.createElement(CostUsage, props({ breakdown: breakdown('costUsd', 0.25) })));
 assert.match(priced, /role="radiogroup" aria-label="Chart metric"/); assert.match(priced, /role="radiogroup" aria-label="Time range"/);
 assert.deepEqual([...priced.matchAll(/aria-label="(\d+d)"/g)].map(match => match[1]), ['7d', '30d', '90d']);
 assert.match(priced, /data-metric="tokens"/);
 const byCost = render(React.createElement(CostUsage, props({ breakdown: breakdown('costUsd', 0.25) }, { metric: 'cost' })));
 assert.match(byCost, /data-metric="cost"/);
 const tokensOnly = render(React.createElement(CostUsage, props({ breakdown: breakdown('costCny', null, { priced: false }) })));
 assert.doesNotMatch(tokensOnly, /Chart metric/); assert.match(tokensOnly, /aria-label="Time range"/);
 const week = render(React.createElement(CostUsage, props({ breakdown: { ...breakdown('costUsd', 0.25), daily: [] } }, { days: 7 })));
 assert.match(week, /Last 7 days/); assert.match(week, /No usage in the last 7 days\./);
 const plain = render(React.createElement(CostUsage, { cost: usageCostPresentation({ tokenUsage: { breakdown: breakdown('costUsd', 0.25) } }, { todayKey: day }), onOpenLink() {} }));
 assert.doesNotMatch(plain, /radiogroup/, 'without the page handlers, the table alone');
});
