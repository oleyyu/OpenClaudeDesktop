// Codex credits on the Usage page and in the composer usage popover (the user's "Codex Usage Credit" report): the
// balance group with its monthly credit limit meter, earned resets with an inline confirmation, the limit notice with
// its remedies, and the popover's plan section ('Plan usage limits · Plus', windows, Usage credits).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { usagePresentation, planUsageSummary } from '../src/usage-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
let server, React, render, Usage, Composer;
before(async () => {
  React = (await import('react')).default;
  ({ renderToStaticMarkup: render } = await import('react-dom/server'));
  const { createServer } = await import('vite'), react = (await import('@vitejs/plugin-react')).default;
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Usage = await server.ssrLoadModule('/src/source-usage.jsx');
  Composer = await server.ssrLoadModule('/src/source-composer.jsx');
});
after(() => server?.close());

const window = (usedPercent, windowDurationMins = 300) => ({ usedPercent, windowDurationMins, resetsAt: 1790035200 });
const limits = { ordinaryUsageAllowed: false, rateLimitsByLimitId: { codex: { planType: 'plus', primary: window(100), secondary: window(62, 10080),
  credits: { hasCredits: true, unlimited: false, balance: '1250' }, individualLimit: { limit: '500', used: '125', remainingPercent: 75, resetsAt: 1790035200 }, rateLimitReachedType: 'rate_limit_reached' } },
  rateLimitResetCredits: { availableCount: 2, credits: [
    { id: 'a', resetType: 'codexRateLimits', status: 'available', grantedAt: 1, expiresAt: 1790035200, title: 'Weekly bonus', description: 'Clears your current limits.' },
    { id: 'b', resetType: 'codexRateLimits', status: 'available', grantedAt: 1, expiresAt: null, title: null, description: null }] } };
const el = (Component, props) => render(React.createElement(Component, props));

test('credits group: balance with Current balance, then the monthly credit limit meter', () => {
  const p = usagePresentation({ limits }, { locale: 'en-US' });
  const html = el(Usage.CreditsSection, { entry: { key: 'codex', credit: p.credits[0], spend: p.spending[0] } });
  assert.match(html, /aria-label="Usage credits"/); assert.match(html, /<strong data-state="balance">1,250 credits<\/strong>/); assert.match(html, /Current balance/);
  assert.match(html, /role="meter"/); assert.match(html, /aria-valuenow="25"/); assert.match(html, /Monthly credit limit/); assert.match(html, /125 of 500 credits used/);
  const none = el(Usage.CreditsSection, { entry: { key: 'codex', credit: { key: 'codex', name: null, balance: 'No credits', state: 'none' }, spend: null } });
  assert.match(none, /data-state="none">No credits/); assert.match(none, /No credits are available for this account\./); assert.doesNotMatch(none, /role="meter"/);
  const unlimited = el(Usage.CreditsSection, { entry: { key: 'm', credit: { key: 'm', name: 'Fast', balance: 'Unlimited', state: 'unlimited' }, spend: null } });
  assert.match(unlimited, /aria-label="Fast usage credits"/); assert.match(unlimited, /Your plan includes unlimited credits\./);
});

test('earned resets: count and a start button; the inline confirmation lists the choices with Cancel first', () => {
  const summary = usagePresentation({ limits }, { locale: 'en-US' }).resetCredits;
  const closed = el(Usage.ResetCreditsSection, { summary, eligible: true, open: false, onOpen() {}, onClose() {}, onConsume: async () => ({}), onConsumed() {} });
  assert.match(closed, /aria-label="Usage limit resets"/); assert.match(closed, /You have 2 usage limit resets available\./); assert.match(closed, />Use a reset…<\/span><\/button>/);
  assert.doesNotMatch(closed, /<button[^>]*disabled=""/);
  const ineligible = el(Usage.ResetCreditsSection, { summary, eligible: false, open: false, onOpen() {}, onClose() {}, onConsume: async () => ({}), onConsumed() {} });
  assert.match(ineligible, /<button[^>]*disabled=""/); assert.match(ineligible, /Sign in with ChatGPT to use a reset\./);
  const open = el(Usage.ResetCreditsSection, { summary, eligible: true, open: true, onOpen() {}, onClose() {}, onConsume: async () => ({}), onConsumed() {} });
  assert.match(open, /role="group"/); assert.match(open, /Use this reset\?/); assert.match(open, /role="radiogroup" aria-label="Available resets"/);
  assert.deepEqual([...open.matchAll(/su-reset-option-title">([^<]*)</g)].map(m => m[1]), ['Weekly bonus', 'Full reset'], 'soonest-expiring first');
  assert.match(open, /This uses one earned reset and can’t be undone\./);
  assert.ok(open.indexOf('>Cancel<') < open.indexOf('>Use reset<'), 'Cancel before Use reset');
  const empty = el(Usage.ResetCreditsSection, { summary: { available: 0, options: [] }, eligible: true, open: false, onOpen() {}, onClose() {}, onConsume: async () => ({}), onConsumed() {} });
  assert.match(empty, /No usage limit resets available\./); assert.match(empty, /<button[^>]*disabled=""/);
});

test('limit notice: reached state with the reset remedy, and a workspace member nudge', () => {
  const notice = usagePresentation({ limits }).notice;
  const html = el(Usage.UsageNotice, { notice, canReset: true, onReset() {}, onNudge: async () => ({}) });
  assert.match(html, /class="su-notice" role="status" data-tone="danger" data-kind="rate_limit_reached"/); assert.match(html, /Usage limit reached/); assert.match(html, />Use a reset…</);
  assert.doesNotMatch(html, /Notify owner|Request increase/);
  const member = usagePresentation({ limits: { rateLimits: { rateLimitReachedType: 'workspace_member_credits_depleted' } } }).notice;
  const nudge = el(Usage.UsageNotice, { notice: member, canReset: false, onReset() {}, onNudge: async () => ({}) });
  assert.match(nudge, />Notify owner</); assert.match(nudge, /Ask your workspace owner to add more\./);
});

test('composer usage popover: Plan usage limits header, windows with countdowns, credits line and View usage link', () => {
  const plan = planUsageSummary(limits, { locale: 'en-US' });
  const html = el(Composer.SourceUsagePanel, { usage: { last: { totalTokens: 64000 }, modelContextWindow: 128000 }, plan, onViewUsage() {}, onSeeDetails() {} });
  // W14-code r6 复核修复: c1564829c g's header span is [sU, ' · ', aU] (three text children) and its rows' labels are
  // y / v's 'text-footnote text-primary truncate'; the link is c0d8a9968 f's CDS ghost xxs UsageGaugeMiddle button.
  assert.match(html, /<span class="text-footnote text-muted-as-secondary">Plan usage limits(?:<!-- -->)? · (?:<!-- -->)?Plus<\/span>/); assert.match(html, /aria-label="View usage in Settings"/);
  assert.deepEqual([...html.matchAll(/text-footnote text-primary truncate">([^<]*)</g)].map(m => m[1]), ['Current session', 'This week', 'Usage credits']);
  assert.match(html, /<span>100%<\/span>/); assert.match(html, /125 of 500 credits used/); assert.match(html, /1,250 credits/);
  assert.equal((html.match(/role="progressbar"/g) || []).length, 4, 'context bar, two windows, the credit limit');
  assert.ok(html.indexOf('Context window') < html.indexOf('Plan usage limits') && html.indexOf('Plan usage limits') < html.indexOf('See detailed breakdown'));
  const bare = el(Composer.SourceUsagePanel, { usage: { last: { totalTokens: 64000 }, modelContextWindow: 128000 }, plan: planUsageSummary({}), onSeeDetails() {} });
  assert.doesNotMatch(bare, /Plan usage limits/, 'a core without plan limits keeps the context-only popover');
});
