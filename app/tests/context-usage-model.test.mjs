import test from 'node:test';
import assert from 'node:assert/strict';
import {compactTokens,contextThreshold,contextRingStroke,contextSummary,usageTriggerCopy} from '../src/context-usage-model.mjs';
test('compactTokens follows shared-14 oT/sT (trailing .0 dropped, k→M→B rollover)',()=>{
 assert.equal(compactTokens(45200),'45.2k');assert.equal(compactTokens(258000),'258k');assert.equal(compactTokens(128000),'128k');
 assert.equal(compactTokens(1000),'1k');assert.equal(compactTokens(999),'999');assert.equal(compactTokens(100),'100');assert.equal(compactTokens(0),'0');
 assert.equal(compactTokens(1250000),'1.3M');
 // 999950/1e3 → Number('1000.0') ≥ 1e3 → (999950/1e6).toFixed(1)='1.0' → '1M'.
 assert.equal(compactTokens(999950),'1M');
 assert.equal(compactTokens(999960000),'1B');assert.equal(compactTokens(2e9),'2B');assert.equal(compactTokens(1.55e9),'1.6B');
});
test('contextSummary is shared-14 ST: over-window or unknown max drops the pct',()=>{
 assert.deepEqual(contextSummary(45200,258000),{summary:'45.2k / 258k (18%)',contextPct:18});
 assert.deepEqual(contextSummary(300000,258000),{summary:'300k',contextPct:null});
 assert.deepEqual(contextSummary(300000,258000,true),{summary:'300k / 258k (100%)',contextPct:100});
 assert.deepEqual(contextSummary(5,null),{summary:'5',contextPct:null});
 assert.deepEqual(contextSummary(100,128000),{summary:'100 / 128k (0%)',contextPct:0});
});
test('thresholds are dT (75 warning / 90 critical) on the pT fill variables',()=>{
 assert.equal(contextThreshold(0),'accent');assert.equal(contextThreshold(74),'accent');assert.equal(contextThreshold(75),'warning');
 assert.equal(contextThreshold(89),'warning');assert.equal(contextThreshold(90),'danger');assert.equal(contextThreshold(100),'danger');
 assert.equal(contextRingStroke(18),'var(--cds-fill-accent)');assert.equal(contextRingStroke(80),'var(--cds-fill-warning)');assert.equal(contextRingStroke(95),'var(--cds-fill-danger)');
});
test('usageTriggerCopy mirrors c360a9e1c hd ge/Se/le',()=>{
 assert.deepEqual(usageTriggerCopy(null),{tooltip:'Usage',ariaLabel:'Usage',ringPct:0,contextPct:null,detail:null});
 assert.deepEqual(usageTriggerCopy(undefined),usageTriggerCopy(null));
 const turn=usageTriggerCopy({last:{totalTokens:100},modelContextWindow:128000});
 assert.equal(turn.tooltip,'Context 100 / 128k (0%)');assert.equal(turn.ariaLabel,'Usage: Context 100 / 128k (0%)');assert.equal(turn.ringPct,0);assert.equal(turn.detail,null);
 const warm=usageTriggerCopy({last:{totalTokens:200000},modelContextWindow:258000});
 assert.equal(warm.tooltip,'Context 200k / 258k (78%)');assert.equal(warm.ringPct,78);
 // ST drops the pct past the window; le = contextPct ?? 0.
 const over=usageTriggerCopy({last:{totalTokens:300000},modelContextWindow:258000});
 assert.deepEqual([over.tooltip,over.ariaLabel,over.ringPct],['Context 300k','Usage: Context 300k',0]);
 assert.equal(usageTriggerCopy({last:{totalTokens:5},modelContextWindow:null}).tooltip,'Context 5');
 // hd Y: no session yet → ie is true with K=0, G=null.
 assert.deepEqual(usageTriggerCopy(null,{fresh:true}),{tooltip:'Context 0',ariaLabel:'Usage: Context 0',ringPct:0,contextPct:null,detail:null});
 assert.equal(usageTriggerCopy({last:{totalTokens:100},modelContextWindow:128000},{fresh:true}).tooltip,'Context 100 / 128k (0%)');
});

// Fidelity F03: the usage popover panel (c2d611398 I/V over c360a9e1c hd): the context section shows for a
// report or the no-session draft; an open session without a report has none.
test('usagePanelCopy: context section for a report or the draft, none otherwise', async () => {
  const { usagePanelCopy } = await import('../src/context-usage-model.mjs');
  assert.deepEqual(usagePanelCopy({ last: { totalTokens: 100 }, modelContextWindow: 128000 }), { contextMode: true, summary: '100 / 128k (0%)', contextPct: 0 });
  assert.deepEqual(usagePanelCopy({ last: { totalTokens: 120000 }, modelContextWindow: 128000 }), { contextMode: true, summary: '120k / 128k (94%)', contextPct: 94 });
  assert.deepEqual(usagePanelCopy({ last: { totalTokens: 5000 } }), { contextMode: true, summary: '5k', contextPct: null });
  assert.deepEqual(usagePanelCopy(undefined, { fresh: true }), { contextMode: true, summary: '0', contextPct: null });
  assert.deepEqual(usagePanelCopy(undefined), { contextMode: false, summary: null, contextPct: null });
});

// R05: the compact action row (cf6ae6197 Tw minPct 50 → bw/xw hidden|disabled|enabled, Ow reasons).
test('compactAction: hidden below 50% or while compacting, disabled while replying or detached, else enabled', async () => {
  const { compactAction, COMPACT_MIN_PCT } = await import('../src/context-usage-model.mjs');
  assert.equal(COMPACT_MIN_PCT, 50);
  assert.deepEqual(compactAction({ contextPct: 49 }), { kind: 'hidden' });
  assert.deepEqual(compactAction({ contextPct: null }), { kind: 'hidden' }, 'no pct (unknown window) hides the row');
  assert.deepEqual(compactAction({ contextPct: 50 }), { kind: 'enabled' });
  assert.deepEqual(compactAction({ contextPct: 94, running: true }), { kind: 'disabled', reason: 'Available when DeepSeek finishes this turn' });
  assert.deepEqual(compactAction({ contextPct: 94, connected: false }), { kind: 'disabled', reason: 'Available when reconnected' });
  assert.deepEqual(compactAction({ contextPct: 94, connected: false, running: true }), { kind: 'disabled', reason: 'Available when reconnected' }, 'xw: detached wins over replying');
  assert.deepEqual(compactAction({ contextPct: 94, compacting: true }), { kind: 'hidden' });
  assert.deepEqual(compactAction({ contextPct: 60, minPct: 70 }), { kind: 'hidden' });
});

// hd fe/T with a plan-limit window (usage-model planUsageSummary top): the tooltip detail joins the plan summary and
// its reset; without context the ring shows the plan percent and the label is the plain list (no 'Usage:' prefix).
test("usage trigger names the plan window in its detail, and the ring shows plan usage without context", async () => {
  const { usageTriggerCopy } = await import("../src/context-usage-model.mjs");
  const plan = { summary: "45% of session limit", resets: "Resets in 2 hr 3 min", percent: 45 };
  assert.deepEqual(usageTriggerCopy({ last: { totalTokens: 64000 }, modelContextWindow: 128000 }, { plan }),
    { tooltip: "Context 64k / 128k (50%)", ariaLabel: "Usage: Context 64k / 128k (50%), 45% of session limit, Resets in 2 hr 3 min", ringPct: 50, contextPct: 50, detail: "45% of session limit · Resets in 2 hr 3 min" });
  assert.deepEqual(usageTriggerCopy(null, { plan }),
    { tooltip: "Usage", ariaLabel: "Usage, 45% of session limit, Resets in 2 hr 3 min", ringPct: 45, contextPct: null, detail: "45% of session limit · Resets in 2 hr 3 min" });
  assert.deepEqual(usageTriggerCopy(null), { tooltip: "Usage", ariaLabel: "Usage", ringPct: 0, contextPct: null, detail: null }, "no plan: unchanged");
  assert.equal(usageTriggerCopy(null, { plan: { summary: "This week: 80%", resets: null, percent: 80 } }).detail, "This week: 80%");
});

test('compactAction names the running core, not DeepSeek', async (context) => {
  const i18n = await import('../electron/i18n/index.mjs');
  const { compactAction } = await import('../src/context-usage-model.mjs');
  const before = i18n.getAssistantName();
  context.after(() => { i18n.setAssistantName(before); i18n.setLocale('en-US'); });
  i18n.setAssistantName('OpenCode');
  assert.equal(compactAction({ contextPct: 94, running: true }).reason, 'Available when OpenCode finishes this turn');
  i18n.setLocale('zh-CN');
  assert.equal(compactAction({ contextPct: 94, running: true }).reason, 'OpenCode 完成本轮后可用');
});

// B30 ca80fca8d aH/oH/iH/nH (:21786-21842): the compact row's hint is the tokens left before auto-compact.
test('autoCompactHint: limit − used, two significant digits, "soon" under 30k, none without a limit', async () => {
  const { autoCompactHint, autoCompactHintText, autoCompactLimit, roundAutoCompactTokens } = await import('../src/context-usage-model.mjs');
  assert.deepEqual([123456, 98765, 30000, 1234567].map(roundAutoCompactTokens), [120000, 98000, 30000, 1200000]);
  const usage = (used, extra = {}) => ({ last: { totalTokens: used }, modelContextWindow: 200000, ...extra });
  assert.equal(autoCompactLimit({ engine: 'codex' }, usage(0)), 180000, "Codex compacts at 90% of the window");
  assert.equal(autoCompactLimit({ engine: 'opencode' }, usage(0, { codeDesktop: { autoCompactTokens: 150000 } })), 150000);
  assert.equal(autoCompactLimit({ engine: 'opencode' }, usage(0, { codeDesktop: { autoCompactTokens: 250000 } })), null, 'a limit past the window is no limit (nH)');
  assert.equal(autoCompactLimit({ engine: 'kimi' }, usage(0)), null);
  assert.deepEqual(autoCompactHint({ engine: 'codex' }, usage(56789)), { kind: 'left', tokens: 120000 });
  assert.equal(autoCompactHintText(autoCompactHint({ engine: 'codex' }, usage(56789))), '120k until auto-compact');
  assert.deepEqual(autoCompactHint({ engine: 'codex' }, usage(160000)), { kind: 'soon' });
  assert.equal(autoCompactHintText({ kind: 'soon' }), 'Auto-compacts soon');
  assert.deepEqual(autoCompactHint({ engine: 'codex' }, usage(190000)), { kind: 'soon' }, 'past the limit still reads soon');
  assert.deepEqual(autoCompactHint({ engine: 'kimi' }, usage(10)), { kind: 'none' });
  assert.deepEqual(autoCompactHint({ engine: 'codex' }, { modelContextWindow: 200000 }), { kind: 'none' }, 'no usage yet');
  assert.equal(autoCompactHintText({ kind: 'none' }), undefined);
});
