// Codex 0.155.1 account/rateLimits/read: absent values are unavailable, never zero.
import { coreName, coreSupports } from './core-registry.mjs';
import { t, tn } from './i18n/index.mjs';
// Labels are display text, translated here (main's tray and the renderer's Usage page both read them).
const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const clamp = value => Math.max(0, Math.min(100, value));
export function usageVariant(used) { return used >= 90 ? 'danger' : used >= 75 ? 'warning' : 'accent'; }
export function usageWindowLabel(minutes, slot) {
 if (minutes === 300) return t('Current session');
 if (minutes === 10080) return t('This week');
 // A monthly quota (ZCode's MCP and web tool calls: 30 days, reset at its nextResetTime).
 if (minutes === 43200) return t('This month');
 if (finite(minutes) && minutes > 0) {
  if (minutes % 1440 === 0) return t('{count}-day limit', {count: minutes / 1440});
  if (minutes % 60 === 0) return t('{count}-hour limit', {count: minutes / 60});
  return t('{count}-minute limit', {count: minutes});
 }
 return slot === 'primary' ? t('Primary limit') : t('Secondary limit');
}
// Reset copy, from Claude 3.6556.2's own formatters (shared-156-BLTosN8U qH/cU/fU/lU, the plan usage meters, and
// c227f4d5e-B-FYKrwT VI, the Code usage-limit band). qH: the reset rounded to the minute and the whole minutes
// left; null once it has passed (or for a missing/out-of-range date).
const formatDate = (date, locale, options) => new Intl.DateTimeFormat(locale, options).format(date);
function resetLeft(seconds, now) {
 if (!finite(seconds)) return null;
 const at = seconds * 1000;
 if (!Number.isFinite(new Date(at).getTime()) || at <= now) return null;
 const reset = new Date(Math.round(at / 6e4) * 6e4);
 return {reset, totalMinutes: Math.floor(Math.max(0, reset.getTime() - now) / 6e4)};
}
// cU: 'Resets {time}', a date a week or more out, else the weekday.
function resetsOn(reset, totalMinutes, locale, weekday = 'short') {
 return t('Resets {time}', {time: formatDate(reset, locale, totalMinutes >= 10080
  ? {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'} : {weekday,hour:'numeric',minute:'2-digit'})});
}
// fU: 'Resets at {time}' on the same calendar day, else cU. The window length (minutes) no longer picks the copy;
// it stays in the signature for the Usage page's callers.
export function usageResetLabel(seconds, minutes, locale, now = Date.now()) {
 const left = resetLeft(seconds, now);
 if (!left) return null;
 const day = date => formatDate(date, locale, {year:'numeric',month:'numeric',day:'numeric'});
 return day(left.reset) === day(new Date(now))
  ? t('Resets at {time}', {time: formatDate(left.reset, locale, {hour:'numeric',minute:'2-digit'})})
  : resetsOn(left.reset, left.totalMinutes, locale);
}
// VI (todayIso is the local YYYY-MM-DD, shared-78 FD): 'Resets at {time}' today, else 'Resets {time}' with the
// weekday and date. No passed-reset check, like VI.
const localDay = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function bandResetLabel(seconds, {now = Date.now(), locale} = {}) {
 if (!finite(seconds)) return null;
 const date = new Date(seconds * 1000);
 if (!Number.isFinite(date.getTime())) return null;
 return localDay(date) === localDay(new Date(now))
  ? t('Resets at {time}', {time: formatDate(date, locale, {hour:'numeric',minute:'numeric'})})
  : t('Resets {time}', {time: formatDate(date, locale, {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})});
}
// The empty limits copy, translated. A core with capabilities.perTokenBilling (DeepSeek Harness, OpenCode, MiMo, a
// ZCode API key; core is boot.core — whose reported capabilities win — a core id or an engine name) is billed per
// token by its provider: there is no plan limit to meter, not an outage. The copy names the core, never DeepSeek.
export function usageEmptyText(core) {
 return coreSupports(core, 'perTokenBilling')
  ? t('Usage on {core} is billed per token by your provider; there are no plan usage limits.', {core: coreName(core)})
  : t('Usage limits are unavailable for this account or connection.');
}
// The daily token table: the harness buckets (accountTokenUsage, ascending local YYYY-MM-DD keys) newest
// first, at most USAGE_DAILY_DAYS rows. Given todayKey it keeps the calendar days ending today, like the
// home card's 30d range (code-home.js Pw / home-model.mjs rangeCutoff), so 'Last 30 days' stays true.
export const USAGE_DAILY_DAYS = 30;
export const USAGE_DAILY_LABEL = 'Last 30 days';
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
function dayCutoff(todayKey, days) {
 if (typeof todayKey !== 'string' || !DAY_KEY.test(todayKey)) return null;
 const [year, month, day] = todayKey.split('-').map(Number), date = new Date(year, month - 1, day - (days - 1));
 return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
// Codex's own credit formatting (codex-rs tui status/rate_limits.rs format_credit_balance / format_credit_amount):
// a positive whole or decimal balance rounds to a whole count; zero, negative or non-numeric text is not a count.
export function creditCount(raw) {
 const value = typeof raw === 'string' ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN;
 if (typeof raw === 'string' && !raw.trim()) return null;
 return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}
// format_credit_amount: a non-negative amount (a spend limit's used/limit), rounded and grouped; else null.
export function creditAmount(raw, locale) {
 const value = typeof raw === 'string' && raw.trim() ? Number(raw.trim()) : typeof raw === 'number' ? raw : NaN;
 return Number.isFinite(value) && value >= 0 ? new Intl.NumberFormat(locale).format(Math.round(value)) : null;
}
// A CreditsSnapshot as Codex's /status shows it (credit_status_row): Unlimited, '{n} credits', 'Available' when the
// balance isn't a count, and here also 'No credits' (Codex hides the row; the Usage page says so instead). A legacy
// snapshot without hasCredits keeps its balance text as data. null when the snapshot carries nothing to show.
export function creditDisplay(credit, locale) {
 if (!credit || typeof credit !== 'object') return null;
 if (credit.unlimited === true) return {value: t('Unlimited'), state: 'unlimited', count: null};
 // A bridge's money balance (credits.currency: Kimi's Booster wallet, 'CNY' / 'USD'): shown as an amount, never rounded
 // to whole credits.
 const currency = text(credit.currency), amount = typeof credit.balance === 'string' && credit.balance.trim() ? Number(credit.balance) : typeof credit.balance === 'number' ? credit.balance : NaN;
 if (currency && /^[A-Z]{3}$/.test(currency) && Number.isFinite(amount)) {
  let value;
  try { value = new Intl.NumberFormat(locale, {style: 'currency', currency}).format(amount); } catch { value = `${amount.toFixed(2)} ${currency}`; }
  return {value, state: amount > 0 ? 'balance' : 'none', count: null};
 }
 const count = creditCount(credit.balance);
 const counted = count === null ? null : {value: tn(count, '{count} credit', '{count} credits', {count: new Intl.NumberFormat(locale).format(count)}), state: 'balance', count};
 if (credit.hasCredits === true) return counted ?? {value: t('Available'), state: 'available', count: null};
 if (credit.hasCredits === false) return {value: t('No credits'), state: 'none', count: 0};
 const balance = text(credit.balance);
 return counted ?? (balance === null ? null : {value: balance, state: 'balance', count: null});
}
const usableCredits = credit => !!credit && (credit.unlimited === true || credit.hasCredits === true);
// The limit snapshots in Codex's order (status compose_rate_limit_data_many: the `codex` bucket first), from
// rateLimitsByLimitId, else the single historical rateLimits view.
export function limitEntries(limits) {
 const map = limits?.rateLimitsByLimitId;
 const entries = map && typeof map === 'object' && !Array.isArray(map) && Object.keys(map).length
  ? Object.entries(map) : limits?.rateLimits && typeof limits.rateLimits === 'object' ? [['codex', limits.rateLimits]] : [];
 // A bridge with no `codex` bucket (Kimi's 'kimi-code') reports its main plan first: that one is the base, so its
 // windows read as the plan's own and reach the composer ring, never as a 'separate usage limit'.
 const base = entries.find(([id, value]) => id === 'codex' || value?.limitId === 'codex') ?? (map && entries.length ? entries[0] : undefined);
 return {entries: base ? [base, ...entries.filter(entry => entry !== base)] : entries, base};
}
// Earned usage-limit resets (account/rateLimits/read rateLimitResetCredits; codex-rs tui chatwidget/reset_credits.rs
// reset_credit_options): the available credits soonest-expiring first, at most availableCount of them, each with the
// backend's title and description or Codex's defaults; one generic 'Full reset' (the backend picks) when the count is
// known without details. null when the core reports no reset summary.
// ZCode's reset titles and descriptions (zcode-bridge accounts.js RESET_TYPES), sent in English and translated here.
const BRIDGE_RESET_TEXT = new Set(['5-hour reset', 'Weekly reset', 'Resets your 5-hour usage window now.', 'Resets your weekly usage window now.']);
export function resetCreditsPresentation(summary, locale) {
 if (!summary || typeof summary !== 'object' || !finite(Number(summary.availableCount))) return null;
 const available = Math.max(0, Math.trunc(Number(summary.availableCount)));
 const listed = Array.isArray(summary.credits) ? summary.credits.filter(credit => credit && credit.status === 'available' && text(credit.id)) : [];
 listed.sort((a, b) => (finite(a.expiresAt) ? a.expiresAt : Infinity) - (finite(b.expiresAt) ? b.expiresAt : Infinity));
 const options = listed.slice(0, available).map(credit => {
  let detail = t('Does not expire');
  if (finite(credit.expiresAt)) {
   const date = new Date(credit.expiresAt * 1000);
   detail = Number.isFinite(date.getTime()) ? t('Expires {date}', {date: date.toLocaleString(locale, {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'})}) : t('Expiration unavailable');
  }
  // A bridge's English title and description (ZCode's '5-hour reset') go through t(); Codex's backend text shows as sent.
  const own = (value) => (BRIDGE_RESET_TEXT.has(text(value)) ? t(text(value)) : text(value));
  return {creditId: credit.id, title: own(credit.title) || t('Full reset'), detail, description: own(credit.description) || t('Reset your current usage limits.')};
 });
 if (available > 0 && !options.length) options.push({creditId: null, title: t('Full reset'), detail: null, description: t('Reset your current usage limits.')});
 return {available, options};
}
// The account's limit state, as Codex tells the user (tui chatwidget/turn_runtime.rs on_rate_limit_error,
// chatwidget/rate_limits.rs workspace credits, backend_banners.rs ordinaryUsageAllowed): the base bucket's
// rateLimitReachedType and spendControlReached, else ordinaryUsageAllowed false. nudge: the
// account/sendAddCreditsNudgeEmail creditType a workspace member can send to the owner. reset: an earned reset helps.
export function usageLimitNotice(limits, core = 'Codex') {
 const {base} = limitEntries(limits), snapshot = base?.[1] ?? null, type = snapshot?.rateLimitReachedType;
 const resets = resetCreditsPresentation(limits?.rateLimitResetCredits)?.available ?? 0;
 switch (type) {
  case 'workspace_owner_credits_depleted': return {kind: type, tone: 'danger', title: t('You’re out of credits'), body: t('Your workspace is out of credits. Add credits to continue using {core}.', {core}), nudge: null, reset: false};
  case 'workspace_member_credits_depleted': return {kind: type, tone: 'danger', title: t('You’ve reached your workspace credit limit'), body: t('Your workspace is out of credits. Ask your workspace owner to add more.'), nudge: 'credits', reset: false};
  case 'workspace_owner_usage_limit_reached': return {kind: type, tone: 'danger', title: t('Usage limit reached'), body: t('You’ve reached your usage limit. Increase your limits to continue using {core}.', {core}), nudge: null, reset: false};
  case 'workspace_member_usage_limit_reached': return {kind: type, tone: 'danger', title: t('Usage limit reached'), body: t('Request a limit increase from your workspace owner to continue using {core}.', {core}), nudge: 'usage_limit', reset: false};
  case 'rate_limit_reached': return {kind: type, tone: 'danger', title: t('Usage limit reached'), body: resets > 0 ? t('You’ve reached your usage limit. Use an earned reset, or try again after your limit resets.') : t('You’ve reached your usage limit. Try again after your limit resets.'), nudge: null, reset: resets > 0};
 }
 if (snapshot?.spendControlReached === true) return {kind: 'spend_control_reached', tone: 'danger', title: t('Monthly credit limit reached'), body: t('You’ve used the credits your workspace allows each month. Ask your workspace owner to raise the limit.'), nudge: null, reset: false};
 if (limits?.ordinaryUsageAllowed === false) return usableCredits(snapshot?.credits)
  ? {kind: 'credits_in_use', tone: 'info', title: t('Using credits'), body: t('Your plan’s included usage is used up. New messages use your credits.'), nudge: null, reset: resets > 0}
  : {kind: 'ordinary_usage_blocked', tone: 'danger', title: t('Usage limit reached'), body: resets > 0 ? t('You’ve reached your usage limit. Use an earned reset, or try again after your limit resets.') : t('You’ve reached your usage limit. Try again after your limit resets.'), nudge: null, reset: resets > 0};
 return null;
}
// The backend-owned banner from the same usage read (GetAccountRateLimitsResponse.rateLimitUpsell; codex-rs tui
// backend_banners.rs BackendBanner::parse and actions.rs resolve_action). The backend owns the copy, the actions and
// the ordered fallback models; this keeps Codex's bounds and maps each CTA to what the app can do: open a ChatGPT
// page, ask the workspace owner (account/sendAddCreditsNudgeEmail), or the earned-reset picker on the Usage page.
// A CTA Codex has no client action for (desktop-only dialogs) is left out. null when the payload isn't valid.
const WORKSPACE_PLANS = new Set(['team', 'business', 'self_serve_business_prolite', 'self_serve_business_usage_based', 'enterprise', 'ent26', 'enterprise_cbp_automation', 'enterprise_cbp_usage_based', 'edu', 'edu_plus', 'edu_pro']);
const CODEX_USAGE_URL = 'https://chatgpt.com/codex/settings/usage', CODEX_WORKSPACE_USAGE_URL = 'https://chatgpt.com/admin/usage-limits/workspace';
const validSlug = slug => typeof slug === 'string' && !!slug.trim() && slug.length <= 256 && !/[\u0000-\u001f\u007f]/.test(slug);
const lineCount = value => value.split(/\r\n|\r|\n/).length;
function bannerAction(action, {requestUrl, accountId, planType}) {
 if (action === 'notify_owner' || action === 'contact_owner') return {kind: 'nudge', creditType: 'credits'};
 if (action === 'request_increase') {
  if (typeof requestUrl !== 'string' || !requestUrl) return {kind: 'nudge', creditType: 'usage_limit'};
  try {
   const url = new URL(requestUrl);
   if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
   return {kind: 'url', url: url.toString()};
  } catch { return null; }
 }
 if (action === 'reset_usage') return {kind: 'reset'};
 const workspace = WORKSPACE_PLANS.has(planType);
 let destination;
 switch (action) {
  case 'add_credits': case 'buy_credits': destination = workspace ? 'https://chatgpt.com/admin/billing?codex_credit_action=add_credits' : `${CODEX_USAGE_URL}?credits_modal=true`; break;
  case 'buy_reset': destination = 'https://chatgpt.com/codex/purchase/reset'; break;
  case 'view_usage': case 'request_increase_usage_settings': destination = CODEX_USAGE_URL; break;
  case 'view_workspace_usage': case 'increase_spend_cap': destination = CODEX_WORKSPACE_USAGE_URL; break;
  case 'open_plus_pricing_web': destination = 'https://chatgpt.com/explore/plus'; break;
  case 'open_pro_pricing_web': destination = 'https://chatgpt.com/explore/pro'; break;
  case 'open_pricing_dialog': {
   const url = new URL('https://chatgpt.com/');
   url.searchParams.set('cta_tab', 'personal');
   url.searchParams.set('highlight_plan', planType === 'plus' || planType === 'prolite' ? 'pro' : 'plus');
   if (planType === 'prolite') url.searchParams.set('pro_variant', '2x');
   url.hash = 'pricing';
   destination = url.toString(); break;
  }
  default: return null;
 }
 const url = new URL(destination);
 if (url.pathname.startsWith('/admin/')) {
  if (!accountId) return null;
  url.searchParams.set('account_id', accountId);
 }
 return {kind: 'url', url: url.toString()};
}
export function backendBanner(raw, {accountId = null, planType = null} = {}) {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
 const {banner_type: type, title, description, ctas, reset_at: resetAt, model_slug: modelSlug, blocked_model_slug: blocked, fallback_model_slugs: fallbacks = [], presentation = 'inline', request_url: requestUrl} = raw;
 if (typeof type !== 'string' || typeof title !== 'string' || typeof description !== 'string' || !Array.isArray(ctas)) return null;
 if (!title.trim() || title.length > 1024 || description.length > 4096 || ctas.length > 8 || lineCount(title) > 3 || lineCount(description) > 12) return null;
 if (blocked != null && !validSlug(blocked)) return null;
 if (!Array.isArray(fallbacks) || fallbacks.length > 16 || !fallbacks.every(validSlug)) return null;
 if (!['inline', 'dismissible'].includes(presentation)) return null;
 const plan = text(planType);
 const actions = ctas.flatMap(cta => {
  if (!cta || typeof cta.action !== 'string' || typeof cta.label !== 'string' || !cta.label.trim()) return [];
  const action = bannerAction(cta.action, {requestUrl, accountId: text(accountId), planType: plan});
  return action ? [{...action, label: cta.label.trim(), action: cta.action}] : [];
 });
 return {type, title: title.trim(), description: description.trim(), actions, resetAt: finite(resetAt) ? resetAt : null,
  modelSlug: validSlug(modelSlug) ? modelSlug : null, blockedModel: blocked ?? null, fallbackModels: [...fallbacks], dismissible: presentation === 'dismissible'};
}
// Codex's fallback for a blocked model (chatwidget/backend_banners.rs): when the banner blocks the session's model, the
// first fallback slug model/list lists (and not hidden from the picker) that isn't the current model. null otherwise.
export function bannerFallbackModel(banner, currentModel, models = []) {
 if (!banner || !currentModel || banner.blockedModel !== currentModel) return null;
 for (const slug of banner.fallbackModels) {
  const found = (Array.isArray(models) ? models : []).find(model => model && model.model === slug && model.hidden !== true && model.model !== currentModel);
  if (found) return found;
 }
 return null;
}
const BRIDGE_LIMIT_NAMES = new Set(['MCP & web tools']);
export function usagePresentation(data, {todayKey, locale, core} = {}) {
 const limits = data?.limits;
 const {entries, base} = limitEntries(limits);
 const rows = [], credits = [], spending = [];
 for (const [id, value] of entries) {
  if (!value || typeof value !== 'object') continue;
  const isBase = id === base?.[0];
  // A bucket name a bridge sends in English (ZCode's 'MCP & web tools') goes through t(); a backend's shows as sent.
  const name = (BRIDGE_LIMIT_NAMES.has(text(value.limitName)) ? t(text(value.limitName)) : text(value.limitName)) || text(value.normalModelSlug) || id;
  for (const slot of ['primary', 'secondary']) {
   const window = value[slot];
   if (!finite(window?.usedPercent)) continue;
   const used = clamp(window.usedPercent), label = usageWindowLabel(window.windowDurationMins, slot);
   rows.push({key:`${id}:${slot}`, label:isBase ? label : `${name} · ${label}`, used,
    minutes:window.windowDurationMins, resetsAt:window.resetsAt, variant:usageVariant(used),
    description:isBase ? null : t('Separate usage limit for {name}', {name})});
  }
  const credit = creditDisplay(value.credits, locale);
  if (credit) credits.push({key:id, name:isBase ? null : name, balance:credit.value, state:credit.state, count:credit.count});
  // SpendControlLimitSnapshot: Codex's 'Monthly credit limit' row (used = 100 - remainingPercent, '{used} of {limit}
  // credits used'); amounts that aren't numbers keep their text.
  const spend = value.individualLimit;
  if (spend && text(String(spend.limit ?? '')) && text(String(spend.used ?? ''))) {
   const usedText = creditAmount(spend.used, locale) ?? String(spend.used).trim(), limitText = creditAmount(spend.limit, locale) ?? String(spend.limit).trim();
   const percent = finite(spend.remainingPercent) ? clamp(100 - clamp(spend.remainingPercent)) : null;
   spending.push({key:id, name:isBase ? null : name, limit:spend.limit, used:spend.used, usedText, limitText, percent, variant:percent === null ? 'accent' : usageVariant(percent),
    detail:t('{used} of {limit} credits used', {used:usedText, limit:limitText}), resetsAt:spend.resetsAt, reached:value.spendControlReached === true});
  }
 }
 const resetCredits = resetCreditsPresentation(limits?.rateLimitResetCredits, locale);
 const notice = usageLimitNotice(limits, core || 'Codex');
 const rawPlan = text(data?.account?.account?.planType) || text(base?.[1]?.planType);
 const plan = planLabel(rawPlan);
 const buckets = Array.isArray(data?.tokenUsage?.dailyUsageBuckets) ? data.tokenUsage.dailyUsageBuckets : [];
 const cutoff = dayCutoff(todayKey, USAGE_DAILY_DAYS);
 const daily = buckets.filter(b => text(b?.startDate) && finite(b.tokens) && b.tokens >= 0 && (cutoff === null || (DAY_KEY.test(b.startDate) && b.startDate >= cutoff)))
  .sort((a, b) => a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0).slice(0, USAGE_DAILY_DAYS);
 const lifetime = data?.tokenUsage?.summary?.lifetimeTokens;
 const lifetimeTokens = finite(lifetime) && lifetime >= 0 ? lifetime : null;
 return {rows,credits,spending,resetCredits,notice,plan,daily,dailyLabel:USAGE_DAILY_LABEL,lifetimeTokens};
}

/**
 * The tokens OpenClaude Desktop counted itself (the Home stats card's object: main.cjs readCodeStats — the core's
 * codeDesktop/stats/read or this app's own ledger), for a Usage page whose core reports no daily buckets (a Codex API key
 * or custom endpoint): per day over the last 30 days, newest first, per model, and the total. Null when there is nothing.
 * @param {object | null | undefined} stats - {dailyModelTokens: [{date, tokensByModel}], modelUsage: {model: {inputTokens,…}}}
 */
export function localUsagePresentation(stats, {todayKey} = {}) {
 const days = Array.isArray(stats?.dailyModelTokens) ? stats.dailyModelTokens : [];
 const cutoff = dayCutoff(todayKey, USAGE_DAILY_DAYS);
 const byDay = new Map(), byModel = new Map();
 for (const day of days) {
  if (!DAY_KEY.test(text(day?.date)) || !day.tokensByModel || typeof day.tokensByModel !== 'object') continue;
  for (const [model, value] of Object.entries(day.tokensByModel)) {
   if (!finite(value) || value <= 0) continue;
   byModel.set(model, (byModel.get(model) ?? 0) + value);
   if (cutoff === null || day.date >= cutoff) byDay.set(day.date, (byDay.get(day.date) ?? 0) + value);
  }
 }
 const total = [...byModel.values()].reduce((sum, value) => sum + value, 0);
 if (!total) return null;
 const daily = [...byDay.entries()].map(([startDate, tokens]) => ({startDate, tokens})).sort((a, b) => a.startDate < b.startDate ? 1 : -1).slice(0, USAGE_DAILY_DAYS);
 const models = [...byModel.entries()].map(([model, tokens]) => ({model, tokens, share: tokens / total})).sort((a, b) => b.tokens - a.tokens);
 return {daily, models, total, dailyLabel: USAGE_DAILY_LABEL};
}
// Codex 0.155.1 PlanType names (product names, not translated); an unknown value keeps its text.
const PLAN_LABELS = {free:'Free',go:'Go',plus:'Plus',pro:'Pro',prolite:'Pro Lite',team:'Team',self_serve_business_prolite:'Business',self_serve_business_usage_based:'Business',business:'Business',ent26:'Enterprise',enterprise_cbp_automation:'Enterprise',enterprise_cbp_usage_based:'Enterprise',enterprise:'Enterprise',edu:'Edu',edu_plus:'Edu Plus',edu_pro:'Edu Pro'};
export function planLabel(raw) {
 const value = text(raw);
 return value && value !== 'unknown' ? PLAN_LABELS[value] || value.replaceAll('_',' ') : null;
}
// Whether a planType is a Codex PlanType id (pro, plus, business_plus…), so '{plan} plan' reads right. The bridges
// put their own sign-in names there ('Z.ai Coding Plan', 'ChatGPT Pro/Plus', OpenCode's 'OpenAI, GitHub Copilot'),
// which are shown as they are.
export function isPlanId(raw) {
 const value = text(raw);
 return !!value && value !== 'unknown' && (Object.hasOwn(PLAN_LABELS, value) || /^[a-z0-9_]+$/.test(value));
}
// Composer usage popover (c2d611398 A/N/M) and the context ring tooltip (c360a9e1c hd fe/T): the base bucket's windows
// as plan-usage rows, the credit balance, and the window to name on the ring (the fullest one, hd md planWindow).
export function planUsageSummary(limits, {locale, core, account} = {}) {
 const {rows, credits, spending, resetCredits, notice, plan} = usagePresentation({limits, account}, {locale, core});
 const top = rows.filter(row => !row.description).reduce((best, row) => best === null || row.used > best.used ? row : best, null);
 return {windows: rows, credit: credits.find(entry => entry.name === null) ?? credits[0] ?? null, spend: spending.find(entry => entry.name === null) ?? null, resetCredits, notice, top, plan};
}
// hd fe: '{pct}% of 5-hour limit' for the session window, else '{limit}: {pct}%'.
export function planWindowSummary(row) {
 if (!row) return null;
 const percent = Math.round(row.used);
 return row.minutes === 300 ? t('{percent}% of 5-hour limit', {percent}) : t('{limit}: {percent}%', {limit: row.label, percent});
}
// shared-156 lU (2.42304.0 shared-5 sA): 'Resets in {minutes} min' within the hour, 'Resets in {hours} hr {minutes} min'
// within the day, else cU; null once the reset has passed (3.6556.2 has no 'Resets soon').
export function usageResetCountdown(seconds, minutes, {now = Date.now(), locale} = {}) {
 const left = resetLeft(seconds, now);
 if (!left) return null;
 const total = left.totalMinutes;
 if (total < 60) return t('Resets in {minutes} min', {minutes: total});
 if (total < 1440) return t('Resets in {hours} hr {minutes} min', {hours: Math.floor(total / 60), minutes: total % 60});
 return resetsOn(left.reset, total, locale);
}
// account/rateLimits/updated is a sparse rolling update (AccountRateLimitsUpdatedNotification): its snapshot merges
// into the last read, keyed by limitId (codex when absent); a null field never clears a value seen before.
export function mergeRateLimits(previous, snapshot) {
 if (!snapshot || typeof snapshot !== 'object') return previous ?? null;
 const id = text(snapshot.limitId) || 'codex', prior = previous && typeof previous === 'object' ? previous : {};
 const merge = old => {const next = {...(old && typeof old === 'object' ? old : {})};for (const [key, value] of Object.entries(snapshot)) if (value !== null && value !== undefined) next[key] = value;return next;};
 const map = prior.rateLimitsByLimitId && typeof prior.rateLimitsByLimitId === 'object' && !Array.isArray(prior.rateLimitsByLimitId) ? prior.rateLimitsByLimitId : null;
 const legacyId = text(prior.rateLimits?.limitId) || 'codex';
 return {...prior,
  rateLimits: id === legacyId || !prior.rateLimits ? merge(prior.rateLimits) : prior.rateLimits,
  rateLimitsByLimitId: map ? {...map, [id]: merge(map[id])} : prior.rateLimitsByLimitId ?? null};
}
// The notice above the composer, in the copy of Claude 3.6556.2's Code usage-limit band (c227f4d5e-B-FYKrwT $I/tL:
// 'Approaching session usage limit' / 'Approaching weekly usage limit' / 'Approaching usage limit' while approaching,
// zs (shared-3 t4) 'Session limit reached' / 'Weekly limit reached' / 'Usage limit reached' once reached, the reset
// from VI; Codex's TUI warns from 50/75/90/95%): a limit state from usageLimitNotice first, else the base bucket's
// fullest window once it passes 80%. 3.6556.2 dropped the old shared-4 '{pct} of your session limit' and the five
// 'Reached your … limit' strings. The shared-3 dE rewrite 'Resets at {time} · Session limit reached' / 'Resets {day}
// at {time} · Weekly limit reached' is GrowthBook experiment __gb__1608543032 arm "a" on the chat surface only
// ($T: Lp()==="chat"; UT: en locales), so it never shows here (E13/E49). dismissKey stays the same while the window
// and its reset do, so a dismissed notice comes back only for the next window (or a reached limit). null below it.
export const COMPOSER_USAGE_THRESHOLD = 80;
export function composerUsageNotice(limits, {core = 'Codex', locale, now = Date.now()} = {}) {
 if (!limits) return null;
 const {base} = limitEntries(limits), snapshot = base?.[1] ?? null;
 const windows = ['primary', 'secondary'].map(slot => ({slot, window: snapshot?.[slot]})).filter(entry => finite(entry.window?.usedPercent));
 const fullest = windows.reduce((best, entry) => !best || entry.window.usedPercent > best.window.usedPercent ? entry : best, null);
 const reset = fullest ? bandResetLabel(fullest.window.resetsAt, {now, locale}) : null;
 const minutes = fullest?.window.windowDurationMins;
 const limit = usageLimitNotice(limits, core);
 if (limit) {
  // zs.session / zs.weekly for the plan window that is full (Ue = W.kind), else the notice's own title.
  const planLimit = (limit.kind === 'rate_limit_reached' || limit.kind === 'ordinary_usage_blocked') && fullest?.window.usedPercent >= 100;
  const summary = planLimit && minutes === 300 ? t('Session limit reached') : planLimit && minutes === 10080 ? t('Weekly limit reached') : limit.title;
  const shown = limit.kind === 'credits_in_use' ? null : reset;
  // W12b: the band's reached detail is the reset alone (tL `J === "exceeded" && !Qe ? HI($e, et)`); remedies are its CTA
  // group (NI). A plan limit with no remedy here (no earned reset: Codex's 'Try again after your limit resets.') has no
  // CTA there either (NI variant "none"), so its body goes; a body naming a remedy (an earned reset, the workspace
  // owner, credits) stays until the host wires that remedy as a CTA (W12b report: main.jsx owns the notice actions).
  // w12c-wiring: a workspace member's request to the owner (Codex account/sendAddCreditsNudgeEmail, `nudge`) is now the
  // band's CTA (NI case "request-extra-usage": "Request usage credits", then "Request sent to admin"; main.jsx), so its
  // body goes too. An earned reset, an owner's own credits / limit and spend control have no NI counterpart; they stay.
  const lead = (limit.kind === 'rate_limit_reached' || limit.kind === 'ordinary_usage_blocked') && limit.reset !== true || limit.nudge ? null : limit.body || null;
  // A reached limit's reset is the band's live countdown (c227f4d5e tL `et = y(QF, {resetsAtSeconds: _e, absolute:
  // VI(_e, u)})`, rendered by source-session-notices.jsx through generated/usage-countdown): `lead` is the text before
  // it, `absolute` the VI text it falls back to (an hour or more out, before the first tick). `details` keeps the
  // plain-text form.
  return {kind: 'usage', level: limit.tone === 'info' ? 'info' : 'danger', summary, details: [lead, shown].filter(Boolean).join(' '),
   ...(shown ? {countdown: {resetsAtSeconds: fullest.window.resetsAt, absolute: shown, lead}} : {}),
   dismissKey: `usage:${limit.kind}:${fullest?.window.resetsAt ?? ''}`, reset: limit.reset === true, nudge: limit.nudge ?? null};
 }
 if (!fullest || fullest.window.usedPercent < COMPOSER_USAGE_THRESHOLD) return null;
 const percent = Math.min(100, Math.round(fullest.window.usedPercent));
 const summary = minutes === 300 ? t('Approaching session usage limit')
  : minutes === 10080 ? t('Approaching weekly usage limit')
  : t('Approaching usage limit');
 return {kind: 'usage', level: percent >= 90 ? 'danger' : 'warning', summary, details: reset, dismissKey: `usage:${fullest.slot}:${fullest.window.resetsAt ?? ''}`, reset: false};
}
// A failed turn's usage-limit card (turn-error-model rate_limit): when the plan limit resets, from the base bucket's
// full window (or the one Codex says it reached), and whether it is still in force (then 'Try again' can't help).
export function usageLimitReset(limits, {now = Date.now(), locale} = {}) {
 const {base} = limitEntries(limits), snapshot = base?.[1] ?? null;
 if (!snapshot) return null;
 const windows = ['primary', 'secondary'].map(slot => snapshot[slot]).filter(window => finite(window?.usedPercent));
 const full = windows.filter(window => window.usedPercent >= 100);
 const reached = !!snapshot.rateLimitReachedType || limits?.ordinaryUsageAllowed === false;
 const pick = (full.length ? full : reached ? windows : []).reduce((best, window) => !best || (finite(window.resetsAt) && (!finite(best.resetsAt) || window.resetsAt > best.resetsAt)) ? window : best, null);
 if (!pick) return null;
 const future = finite(pick.resetsAt) && pick.resetsAt * 1000 > now;
 return {label: future ? usageResetCountdown(pick.resetsAt, pick.windowDurationMins, {now, locale}) : null, active: future || (reached && !finite(pick.resetsAt)),
  // When it resets (ms), for the card's 'Auto-continue when limits reset'.
  resetsAtMs: future ? pick.resetsAt * 1000 : null};
}
