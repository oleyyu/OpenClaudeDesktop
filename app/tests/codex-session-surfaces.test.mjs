import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaItemRow, generatedImageSource, localImageSource, isMediaItem } from '../src/media-item-model.mjs';
import { composerUsageNotice, usageLimitReset, limitEntries, usagePresentation } from '../electron/usage-model.mjs';
import { goalCommandRequest, goalCommandResult, goalUsage, goalStatusLabel, goalNeedsReplaceConfirmation } from '../src/goal-model.mjs';
import { reasoningText } from '../src/transcript-item-visibility.mjs';
import { setLocale, DEFAULT_LOCALE, t } from '../electron/i18n/index.mjs';

// Codex 0.155.1 imageGeneration / imageView / sleep / hookPrompt items were rendered as nothing (SourceMessage
// fell through to null); they are steps now, with the image shown from savedPath (or the base64 result).
test('image generation, image view, sleep and hook-context rows', () => {
  const png = 'iVBORw0KGgo' + 'A'.repeat(80);
  const busy = mediaItemRow({ type: 'imageGeneration', id: 'g', status: 'in_progress', revisedPrompt: null, result: '', failure: null });
  assert.deepEqual([busy.state, busy.label, busy.image], ['busy', 'Generating image', null]);
  const done = mediaItemRow({ type: 'imageGeneration', id: 'g', status: 'completed', revisedPrompt: 'A blue app icon', result: png, savedPath: '/Users/me/.codex/generated/icon one.png', failure: null });
  assert.deepEqual([done.state, done.label, done.meta, done.caption], ['done', 'Generated image', 'icon one.png', 'A blue app icon']);
  assert.equal(done.image, 'file:///Users/me/.codex/generated/icon%20one.png', 'savedPath wins over the inline result');
  assert.equal(generatedImageSource({ result: png }), `data:image/png;base64,${png}`);
  assert.equal(generatedImageSource({ result: 'not an image' }), null);
  const failed = mediaItemRow({ type: 'imageGeneration', id: 'g', status: 'failed', result: '', failure: { type: 'usageLimitExceeded', limitId: 'images', resetsAt: null } });
  assert.deepEqual([failed.state, failed.label, failed.image, failed.error], ['failed', 'Couldn’t generate image', null, 'You’ve reached your image generation limit.']);
  const view = mediaItemRow({ type: 'imageView', id: 'v', path: '/w/shot.png' });
  assert.deepEqual([view.label, view.meta, view.image], ['Viewed image', 'shot.png', 'file:///w/shot.png']);
  assert.equal(localImageSource('relative.png'), null);
  assert.equal(localImageSource('https://x.test/a.png'), null);
  assert.equal(mediaItemRow({ type: 'sleep', id: 's', durationMs: 4600 }).label, 'Waited 5s');
  assert.equal(mediaItemRow({ type: 'hookPrompt', id: 'h', fragments: [{ text: 'Run the linter first.', hookRunId: 'r' }] }).caption, 'Run the linter first.');
  assert.equal(isMediaItem({ type: 'agentMessage' }), false);
});

test('raw reasoning shows when the model sends no summary', () => {
  assert.equal(reasoningText({ type: 'reasoning', summary: [], content: ['thinking hard'] }), 'thinking hard');
  assert.equal(reasoningText({ type: 'reasoning', summary: ['short'], content: ['long raw'] }), 'short');
  // Each summary part is its own section: a blank line keeps a bold heading off the previous paragraph.
  assert.equal(reasoningText({ type: 'reasoning', summary: ['**Reading**\nchecked the tests.', '**Planning the fix**\nI will update it.'] }), '**Reading**\nchecked the tests.\n\n**Planning the fix**\nI will update it.');
  assert.equal(reasoningText({ type: 'reasoning', summary: [{ text: 'one' }, '', { text: 'two' }] }), 'one\n\ntwo');
  assert.equal(reasoningText({ type: 'reasoning', rawReasoningText: 'live raw' }), 'live raw');
});

const limits = (primary, secondary = null, extra = {}) => ({ rateLimits: null, rateLimitsByLimitId: { codex: { limitId: 'codex', primary, secondary, credits: null, ...extra } } });
test('composer usage notice: nothing below 80%, the fullest base window above it, limit states first', () => {
  const now = Date.UTC(2026, 9, 5, 10, 0, 0), soon = now / 1000 + 90 * 60;
  assert.equal(composerUsageNotice(limits({ usedPercent: 60, windowDurationMins: 300, resetsAt: soon }), { now }), null);
  const session = composerUsageNotice(limits({ usedPercent: 84.4, windowDurationMins: 300, resetsAt: soon }, { usedPercent: 40, windowDurationMins: 10080, resetsAt: soon + 86400 }), { now });
  // c227f4d5e band copy; the reset is VI: same local day 'Resets at {time}'.
  const at = new Date(soon * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  assert.deepEqual([session.level, session.summary, session.details], ['warning', 'Approaching session usage limit', `Resets at ${at}`]);
  const week = composerUsageNotice(limits({ usedPercent: 20, windowDurationMins: 300, resetsAt: soon }, { usedPercent: 93, windowDurationMins: 10080, resetsAt: soon }), { now });
  assert.deepEqual([week.level, week.summary], ['danger', 'Approaching weekly usage limit']);
  const other = composerUsageNotice(limits({ usedPercent: 85, windowDurationMins: 1440, resetsAt: soon }), { now });
  assert.equal(other.summary, 'Approaching usage limit');
  assert.equal(week.dismissKey, `usage:secondary:${soon}`, 'the dismissal holds for this window');
  const reached = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, null, { rateLimitReachedType: 'rate_limit_reached' }), { now });
  assert.deepEqual([reached.level, reached.summary], ['danger', 'Session limit reached'], 'zs.session for the full 5-hour window');
  // W12b: with no remedy (no earned reset) the band's reached detail is the reset alone (c227f4d5e tL HI($e, et)).
  assert.match(reached.details, /^Resets at /);
  assert.deepEqual([reached.countdown.resetsAtSeconds, reached.countdown.lead], [soon, null]);
  const weekly = composerUsageNotice(limits({ usedPercent: 40, windowDurationMins: 300, resetsAt: soon }, { usedPercent: 100, windowDurationMins: 10080, resetsAt: soon }, { rateLimitReachedType: 'rate_limit_reached' }), { now });
  assert.equal(weekly.summary, 'Weekly limit reached');
  const generic = composerUsageNotice(limits({ usedPercent: 70, windowDurationMins: 300, resetsAt: soon }, null, { rateLimitReachedType: 'rate_limit_reached' }), { now });
  assert.equal(generic.summary, 'Usage limit reached', 'no full window: zs.generic');
  assert.equal(composerUsageNotice(null), null);
});

test('usage-limit card reset: the full window’s reset, and whether the limit still holds', () => {
  const now = Date.UTC(2026, 9, 5, 10, 0, 0), later = now / 1000 + 30 * 60;
  assert.deepEqual(usageLimitReset(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: later }), { now }), { label: 'Resets in 30 min', active: true, resetsAtMs: later * 1000 });
  assert.deepEqual(usageLimitReset(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: now / 1000 - 60 }), { now }), { label: null, active: false, resetsAtMs: null });
  assert.equal(usageLimitReset(limits({ usedPercent: 50, windowDurationMins: 300, resetsAt: later }), { now }), null);
});

test('a bridge whose only bucket is not "codex" (Kimi) has it as the base: its windows are the plan’s own', () => {
  const kimi = { rateLimits: null, rateLimitsByLimitId: { 'kimi-code': { limitId: 'kimi-code', limitName: 'Kimi Code plan', primary: { usedPercent: 30, windowDurationMins: 300, resetsAt: null }, secondary: null } } };
  assert.equal(limitEntries(kimi).base[0], 'kimi-code');
  const { rows } = usagePresentation({ limits: kimi });
  assert.deepEqual(rows.map(row => [row.label, row.description]), [['Current session', null]]);
});

test('/goal on Codex: show, set, pause, resume and clear map to thread/goal/*', () => {
  assert.deepEqual(goalCommandRequest('', 't'), { method: 'thread/goal/get', params: { threadId: 't' } });
  assert.deepEqual(goalCommandRequest(' migrate tests to vitest ', 't'), { method: 'thread/goal/set', params: { threadId: 't', objective: 'migrate tests to vitest', status: 'active' } });
  assert.deepEqual(goalCommandRequest('Pause', 't'), { method: 'thread/goal/set', params: { threadId: 't', status: 'paused' } });
  assert.deepEqual(goalCommandRequest('resume', 't'), { method: 'thread/goal/set', params: { threadId: 't', status: 'active' } });
  assert.deepEqual(goalCommandRequest('clear', 't'), { method: 'thread/goal/clear', params: { threadId: 't' } });
  const goal = { objective: 'ship', status: 'budgetLimited', tokensUsed: 12000, tokenBudget: 50000, timeUsedSeconds: 3725 };
  assert.equal(goalStatusLabel('budgetLimited'), 'Token budget reached');
  assert.equal(goalUsage(goal, 'en-US'), '1h 2m · 12K of 50K tokens');
  assert.equal(goalCommandResult(goalCommandRequest('', 't'), { goal: null }), 'No goal is set for this session.');
  assert.equal(goalCommandResult(goalCommandRequest('', 't'), { goal }), 'Goal: ship (Token budget reached)');
  assert.equal(goalCommandResult(goalCommandRequest('clear', 't'), {}), 'Goal cleared');
});

test('/goal edit changes the objective in place with the goal\u2019s own status; too long or empty is refused in words; an unfinished goal asks before Replace', () => {
  assert.deepEqual(goalCommandRequest('edit make all tests pass', 't', { objective: 'x', status: 'paused' }),
    { method: 'thread/goal/set', params: { threadId: 't', objective: 'make all tests pass', status: 'paused', codeDesktop: { edit: true } }, edit: true });
  assert.deepEqual(goalCommandRequest('Edit   fix it', 't', { objective: 'x', status: 'blocked' }).params, { threadId: 't', objective: 'fix it', codeDesktop: { edit: true } });
  assert.match(goalCommandRequest('edit', 't').error, /after \/goal edit/);
  assert.equal(goalCommandRequest('editorial cleanup', 't').params.objective, 'editorial cleanup', 'only the word edit is the subcommand');
  assert.match(goalCommandRequest('x'.repeat(4001), 't').error, /at most 4,000 characters/);
  assert.equal(goalCommandRequest('x'.repeat(4000), 't').params.objective.length, 4000);
  assert.equal(goalCommandResult(goalCommandRequest('edit y', 't', { status: 'active' }), { goal: { objective: 'y', status: 'active' } }), 'Goal updated');
  for (const status of ['active', 'paused', 'blocked', 'usageLimited', 'budgetLimited']) assert.equal(goalNeedsReplaceConfirmation({ objective: 'a', status }), true, status);
  assert.equal(goalNeedsReplaceConfirmation({ objective: 'a', status: 'complete' }), false);
  assert.equal(goalNeedsReplaceConfirmation(null), false);
});

test('every new notice, goal and media string has a zh-CN entry', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  for (const key of ['Generating image', 'Generated image', 'Viewed image', 'Waited {seconds}s', 'Hook added context', 'Approaching session usage limit',
    'Approaching weekly usage limit', 'Approaching usage limit', 'Resets {time}', 'Session limit reached', 'Weekly limit reached', 'Token budget reached', 'Goal cleared', 'Trust this folder', 'Dismiss notice', 'Auto-review approved', 'Used memory'])
    assert.notEqual(t(key), key, key);
});

test('a bridge money balance (Kimi Booster) shows as an amount, not whole credits', async () => {
  const { creditDisplay } = await import('../electron/usage-model.mjs');
  assert.deepEqual(creditDisplay({ hasCredits: true, unlimited: false, balance: '100.00', currency: 'CNY' }, 'en-US'), { value: 'CN¥100.00', state: 'balance', count: null });
  assert.equal(creditDisplay({ hasCredits: false, unlimited: false, balance: '0.00', currency: 'USD' }, 'en-US').state, 'none');
  assert.equal(creditDisplay({ hasCredits: true, balance: '12.4' }, 'en-US').value, '12 credits', 'Codex credits stay counts');
});
