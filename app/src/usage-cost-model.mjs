// The Usage page's token and cost view, from the extension fields a core sends beside the Codex fields of
// account/usage/read (read generically, never by which core runs):
//   tokenUsage.deepseek   DeepSeek Harness (harness usage.js deepseekUsage): estimated CNY at DeepSeek's official
//                         peak/off-peak prices (or the custom prices from Settings › Models), plus a Platform link.
//   tokenUsage.breakdown  the core-neutral form of the same shape (acp-bridge usage.js): totals for all time, the
//                         last 30 days and today, models and days; `priced: false` when the agent reports no prices.
//   Costs per source: `costCny` (CNY) or `costUsd` (USD), or `cost` with a `currency` code.
// usageCostPresentation turns one of those into tiles, a breakdown, models and days; absent or malformed (the Codex
// core, fixtures) -> null, and SourceUsage keeps the limits layout. usageSpendPresentation reads a bare all-time
// spend some cores report instead (opencode-bridge usage.js `opencode: {costUsd}`; any `tokenUsage.<key>` record
// with a top-level cost), shown in the limits layout.
import { compactTokens, formatDayKey } from "./home-model.mjs";
import { t } from "../electron/i18n/index.mjs";

export const COST_DAILY_DAYS = 30;
// c71860c77-29nOu6oI B: the Usage page's Time range (7d / 30d / 90d) over the per-day history the core reports.
export const USAGE_RANGE_DAYS = Object.freeze([7, 30, 90]);
// English sources, rendered through t() (zh-CN keeps the original Chinese copy).
export const COST_FOOTNOTE = "Estimated at DeepSeek’s official peak and off-peak prices; your DeepSeek Platform bill is authoritative.";
// account/usage/read deepseek.customPrices: the estimate used the prices from Settings › Models.
export const CUSTOM_COST_FOOTNOTE = "Estimated at the prices you set in Settings › Models; your DeepSeek Platform bill is authoritative.";
export const DEEPSEEK_USAGE_URL = "https://platform.deepseek.com/usage";
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const count = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
const money = (value) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null);
const isRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);

const CURRENCY_SYMBOLS = Object.freeze({ CNY: "¥", USD: "$" });
/** An amount in its source's currency: 2 decimals, 4 below 0.01 (never a misleading 0.00 for real spend); null -> "—". */
export function formatMoney(value, currency = "CNY", locale) {
  const amount = money(value);
  if (amount === null) return "—";
  const digits = amount > 0 && amount < 0.01 ? 4 : 2;
  const number = amount.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const code = typeof currency === "string" && /^[A-Z]{3}$/.test(currency) ? currency : "CNY";
  return CURRENCY_SYMBOLS[code] ? `${CURRENCY_SYMBOLS[code]}${number}` : `${number} ${code}`;
}
/** Exact count for titles/tooltips. */
export const formatTokenCount = (value, locale) => new Intl.NumberFormat(locale).format(count(value));

// A record's currency: an explicit `currency` code, else the suffix of the cost fields it carries.
function currencyOf(value) {
  if (!isRecord(value)) return null;
  if (typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency)) return value.currency;
  for (const [key, amount] of Object.entries(value)) {
    const match = /(?:^c|C)ost(Cny|Usd)$/.exec(key);
    if (match && money(amount) !== null) return match[1].toUpperCase();
  }
  return null;
}
// One cost field of a record in its currency (`<prefix>CostCny`, `<prefix>CostUsd` or `<prefix>Cost`).
function costField(value, prefix, currency) {
  const base = prefix ? `${prefix}Cost` : "cost";
  const suffix = currency === "USD" ? "Usd" : currency === "CNY" ? "Cny" : "";
  return money(value?.[base + suffix]) ?? money(value?.[base]);
}
function totals(value, currency) {
  if (!isRecord(value)) return null;
  const inputTokens = count(value.inputTokens), cacheReadTokens = count(value.cacheReadTokens),
    cacheWriteTokens = count(value.cacheWriteTokens), outputTokens = count(value.outputTokens);
  return {
    tokens: count(value.tokens), inputTokens, cacheReadTokens, cacheWriteTokens, outputTokens,
    unpricedTokens: count(value.unpricedTokens), cost: costField(value, "", currency),
    inputCost: costField(value, "input", currency), cacheReadCost: costField(value, "cacheRead", currency), outputCost: costField(value, "output", currency),
  };
}
function dayCutoff(todayKey, days) {
  if (typeof todayKey !== "string" || !DAY_KEY.test(todayKey)) return null;
  const [year, month, day] = todayKey.split("-").map(Number), date = new Date(year, month - 1, day - (days - 1));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const share = (part, whole) => (whole > 0 ? Math.max(0, Math.min(1, part / whole)) : 0);

/**
 * @returns {null | {
 *   source: 'deepseek' | 'breakdown', currency: string, priced: boolean,
 *   tiles: {key: string, label: string, tokens: number, cost: number | null, partial: boolean}[],
 *   categories: {key: string, label: string, tokens: number, cost: number | null, share: number}[],
 *   categoryBasis: 'cost' | 'tokens',
 *   models: {key: string, name: string, tokens: number, cost: number | null, share: number}[],
 *   daily: {date: string, label: string, tokens: number, cost: number | null, share: number, costShare: number}[],
 *   range: 7 | 30 | 90, dailyPriced: boolean,
 *   partial: boolean, customPrices: boolean, usageUrl: string | null,
 * }}
 *   priced: the source carries costs (false: tokens only, the page hides the cost columns).
 *   usageUrl: the DeepSeek Platform usage page for the `deepseek` source, else null.
 */
export function usageCostPresentation(data, { todayKey, locale, days: rangeDays = COST_DAILY_DAYS } = {}) {
  const range = USAGE_RANGE_DAYS.includes(rangeDays) ? rangeDays : COST_DAILY_DAYS;
  const usage = data?.tokenUsage;
  const kind = isRecord(usage?.deepseek) ? "deepseek" : isRecord(usage?.breakdown) ? "breakdown" : null;
  if (!kind) return null;
  const source = usage[kind];
  const currency = currencyOf(source) ?? [source.allTime, source.last30Days, source.today].map(currencyOf).find(Boolean) ?? (kind === "deepseek" ? "CNY" : "USD");
  const all = totals(source.allTime, currency), recent = totals(source.last30Days, currency), today = totals(source.today, currency);
  if (!all || !recent || !today) return null;
  const priced = source.priced !== false && [all, recent, today].some((value) => value.cost !== null);
  const tile = (key, label, value) => ({ key, label, tokens: value.tokens, cost: value.cost, partial: value.unpricedTokens > 0 && value.cost !== null });
  const tiles = [tile("all", t("Total tokens"), all), tile("30d", t("Last 30 days"), recent), tile("today", t("Today"), today)];
  // Where the cost goes (all time): cache writes are billed as cache-miss input, so they join Input.
  const pricedTotal = all.cost ?? 0;
  const categoryBasis = pricedTotal > 0 ? "cost" : "tokens";
  const categories = [
    { key: "input", label: t("Input"), tokens: all.inputTokens + all.cacheWriteTokens, cost: all.inputCost },
    { key: "cached", label: t("Cached input"), tokens: all.cacheReadTokens, cost: all.cacheReadCost },
    { key: "output", label: t("Output"), tokens: all.outputTokens, cost: all.outputCost },
  ].map((entry) => ({ ...entry, share: categoryBasis === "cost" ? share(entry.cost ?? 0, pricedTotal) : share(entry.tokens, all.tokens) }));
  const models = (Array.isArray(source.models) ? source.models : [])
    .filter((entry) => isRecord(entry) && typeof entry.model === "string" && count(entry.tokens) > 0)
    .map((entry) => ({ key: entry.model, name: typeof entry.displayName === "string" && entry.displayName.trim() ? entry.displayName.trim() : entry.model,
      tokens: count(entry.tokens), cost: costField(entry, "", currency) }))
    .sort((left, right) => right.tokens - left.tokens);
  const modelMax = models.reduce((max, entry) => Math.max(max, entry.tokens), 0);
  const cutoff = dayCutoff(todayKey, range);
  const days = (Array.isArray(source.daily) ? source.daily : [])
    .filter((entry) => isRecord(entry) && typeof entry.date === "string" && DAY_KEY.test(entry.date) && count(entry.tokens) > 0
      && (cutoff === null || (entry.date >= cutoff && entry.date <= todayKey)))
    .sort((left, right) => (left.date < right.date ? 1 : left.date > right.date ? -1 : 0))
    .slice(0, range);
  const dayMax = days.reduce((max, entry) => Math.max(max, count(entry.tokens)), 0);
  const dayCostMax = days.reduce((max, entry) => Math.max(max, costField(entry, "", currency) ?? 0), 0);
  const usageUrl = kind !== "deepseek" ? null
    : typeof data?.account?.deepseek?.links?.usageUrl === "string" && /^https:\/\/platform\.deepseek\.com\//.test(data.account.deepseek.links.usageUrl)
      ? data.account.deepseek.links.usageUrl : DEEPSEEK_USAGE_URL;
  return {
    source: kind,
    currency,
    priced,
    tiles,
    categories,
    categoryBasis,
    models: models.map((entry) => ({ ...entry, share: share(entry.tokens, modelMax) })),
    daily: days.map((entry) => ({ date: entry.date, label: formatDayKey(entry.date, locale), tokens: count(entry.tokens), cost: costField(entry, "", currency),
      share: share(count(entry.tokens), dayMax), costShare: share(costField(entry, "", currency) ?? 0, dayCostMax) })),
    // The time range shown, and whether any day in it carries a cost (W v: else the Cost metric is disabled).
    range,
    dailyPriced: priced && days.some((entry) => costField(entry, "", currency) !== null),
    partial: priced && all.unpricedTokens > 0,
    customPrices: source.customPrices === true,
    usageUrl,
  };
}

/**
 * A bare all-time spend a core reports beside the Codex fields (opencode-bridge `opencode: {costUsd}`): the first
 * `tokenUsage.<key>` record, other than the full breakdowns above, with a top-level cost. null when there is none.
 * @returns {null | {key: string, currency: string, allTime: number}}
 */
export function usageSpendPresentation(data) {
  const usage = data?.tokenUsage;
  if (!isRecord(usage)) return null;
  for (const [key, value] of Object.entries(usage)) {
    if (key === "deepseek" || key === "breakdown" || key === "summary" || !isRecord(value)) continue;
    const currency = currencyOf(value);
    const amount = currency ? costField(value, "", currency) : null;
    if (amount !== null) return { key, currency, allTime: amount };
  }
  return null;
}

export { compactTokens };
