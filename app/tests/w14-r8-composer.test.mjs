// W14-code r8 composer lane: r8c-01 (credits in use is tL's dismissible active overage), r8c-02 (the approaching band's
// dismissal persists per window and threshold), r8c-03 ("{pct}% of session limit"), r8c-04 = sh8-02 (the named workflow
// size band and its View workflow), r8c-05 (no notices in the archived Code zone), css8-composer-leftover-handcopies.
// Nothing of the official chunk is executed; the generated slices and host modules are rendered with react-dom/server.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const snapshot = path.join(root, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(snapshot, file), 'utf8');

const { createServer } = await import('vite');
const { default: react } = await import('@vitejs/plugin-react');
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
test.after(() => server.close());
const load = (file) => server.ssrLoadModule(file);
const h = React.createElement;
const Usage = await import('../electron/usage-model.mjs');
const Size = await import('../src/workflow-size-band-model.mjs');

// A Storage stand-in (the host reads localStorage / sessionStorage through globalThis).
function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), clear: () => map.clear(), map };
}

test('r8c-01 / r8c-02: official evidence (tL, c2ad44bb9, shared-3 m_)', () => {
  const tl = official('c227f4d5e-B-FYKrwT.js');
  assert.ok(tl.includes('"epitaxy-usage-limit-active-overage-dismissed"'));
  assert.ok(tl.includes('defaultMessage:"Now using usage credits",id:"UCevJHq7kc"'));
  assert.ok(tl.includes('onDismiss:J==="approaching"?U:void 0'));
  assert.ok(official('c2ad44bb9-BI4IErXE.js').includes('`epitaxy-usage-limit-approaching-dismissed-v3:${e??""}`'));
  assert.ok(official('shared-3-BCEbd8Fv.js').includes('function m_(e,t,n){return e!==void 0&&t<=e.threshold&&n<=e.validUntil}'));
  assert.equal(Usage.USAGE_APPROACHING_DISMISSED_KEY(undefined), 'epitaxy-usage-limit-approaching-dismissed-v3:');
  assert.equal(Usage.USAGE_ACTIVE_OVERAGE_DISMISSED_KEY, 'epitaxy-usage-limit-active-overage-dismissed');
  // m_: holds while neither the threshold nor the window's reset passed the dismissed ones.
  assert.equal(Usage.usageDismissalHolds(undefined, 80, 100), false);
  assert.equal(Usage.usageDismissalHolds({ threshold: 80, validUntil: 100 }, 80, 100), true);
  assert.equal(Usage.usageDismissalHolds({ threshold: 80, validUntil: 100 }, 90, 100), false, 'a higher threshold shows it again');
  assert.equal(Usage.usageDismissalHolds({ threshold: 80, validUntil: 100 }, 80, 200), false, 'the next window shows it again');
});

test('r8c-01: credits in use is an approaching band, "Now using usage credits", dismissible and persisted in sessionStorage', async () => {
  const limits = { rateLimits: { limitId: 'codex', primary: { usedPercent: 100, windowDurationMins: 300, resetsAt: 2000000000 }, credits: { hasCredits: true, unlimited: false, balance: '5' } }, ordinaryUsageAllowed: false };
  const notice = Usage.composerUsageNotice(limits, { now: 1000 });
  assert.equal(notice.activeOverage, true, 'composerUsageNotice marks credits_in_use');
  const Notices = await load('/src/source-session-notices.jsx');
  assert.equal(Notices.inlineUsageKind(notice), 'approaching');
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = memoryStorage();
  try {
    const html = renderToStaticMarkup(h(Notices.SourceInlineUsageBand, { notice, actions: [] }));
    assert.match(html, /class="min-w-0 text-primary">Now using usage credits</);
    assert.doesNotMatch(html, /Your plan’s included usage is used up/, 'tL passes no detail for the active overage');
    assert.match(html, /aria-label="Dismiss"|>Dismiss</, 'dismissible');
    // The middle gauge oL draws for "approaching".
    const { InlineBand } = await load('/src/generated/session-rail/inline-band.mjs');
    assert.ok(html.includes(renderToStaticMarkup(h(InlineBand, { kind: 'approaching', message: 'x' })).match(/<span data-cds="Icon"[^>]*>/)[0]));
  } finally { globalThis.sessionStorage = previous; }
  // zh-CN already has the key (common.mjs).
  const { default: zhCommon } = await import('../electron/i18n/zh-CN/common.mjs');
  assert.equal(zhCommon['Now using usage credits'], '现在使用用量额度');
});

test('r8c-02: an approaching notice carries its window, threshold and reset; the band reads the persisted map', async () => {
  const limits = (used, resetsAt) => ({ rateLimits: { limitId: 'codex', primary: { usedPercent: used, windowDurationMins: 300, resetsAt } } });
  const at85 = Usage.composerUsageNotice(limits(85, 2000000000), { now: 1000 });
  assert.deepEqual([at85.window, at85.threshold, at85.validUntil], ['5h', 80, 2000000000]);
  const at92 = Usage.composerUsageNotice(limits(92, 2000000000), { now: 1000 });
  assert.equal(at92.threshold, 90);
  const weekly = Usage.composerUsageNotice({ rateLimits: { limitId: 'codex', secondary: { usedPercent: 85, windowDurationMins: 10080, resetsAt: 5 } } }, { now: 1000 });
  assert.equal(weekly.window, '7d');
  const Notices = await load('/src/source-session-notices.jsx');
  const store = await load('/src/generated/r3b-settings/persisted-store.mjs');
  const previousLocal = globalThis.localStorage;
  globalThis.localStorage = memoryStorage();
  try {
    const band = (notice) => renderToStaticMarkup(h(Notices.SourceInlineUsageBand, { notice, actions: [{ label: 'View usage', run() {} }] }));
    assert.match(band(at85), /Approaching session usage limit/);
    // What tL's dismiss writes: LSS-<key> = {value: {[window]: {validUntil, threshold}}, …}.
    store.writePersisted(Usage.USAGE_APPROACHING_DISMISSED_KEY(undefined), { '5h': { validUntil: 2000000000, threshold: 80 } });
    assert.ok(globalThis.localStorage.map.has('LSS-epitaxy-usage-limit-approaching-dismissed-v3:'));
    // SSR reads the server snapshot (null): render through the client snapshot path by calling the hook's reader instead.
    const raw = JSON.parse(globalThis.localStorage.getItem('LSS-epitaxy-usage-limit-approaching-dismissed-v3:')).value;
    assert.equal(Usage.usageDismissalHolds(raw[at85.window], at85.threshold, at85.validUntil), true, 'dismissed at 80%');
    assert.equal(Usage.usageDismissalHolds(raw[at92.window], at92.threshold, at92.validUntil), false, 'back at 90%');
  } finally { globalThis.localStorage = previousLocal; }
  // The band no longer keeps the dismissal in component state only.
  const source = read('src/source-session-notices.jsx');
  assert.ok(!source.includes('const [dismissed, setDismissed] = useState(null);'));
  assert.ok(source.includes('usageDismissalHolds(dismissals.approaching[notice.window ?? ""], threshold, validUntil)'));
});

test('r8c-03: the ring names the session window "{pct}% of session limit" (c227f4d5e F3)', async () => {
  assert.ok(official('c227f4d5e-B-FYKrwT.js').includes('defaultMessage:"{pct}% of session limit",id:"R/GumoF8us"'));
  assert.ok(!fs.readFileSync(path.join(snapshot, '../../i18n/en-US.json'), 'utf8').includes('of 5-hour limit'));
  assert.equal(Usage.planWindowSummary({ used: 45, minutes: 300, label: 'x' }), '45% of session limit');
  const { default: zhApp } = await import('../electron/i18n/zh-CN/app.mjs');
  assert.ok(zhApp['{percent}% of session limit']);
  assert.equal(zhApp['{percent}% of 5-hour limit'], undefined);
});

test('r8c-04 / sh8-02: a named workflow band — bdi.font-medium title, o6 named detail, View workflow before Stop', async () => {
  const cc = official('cc43287c9-Me-M2ucD.js');
  assert.ok(cc.includes('defaultMessage:"{name} is larger than most workflows.",id:"BlmlO/YC5d",values:{name:p("bdi",{className:"font-medium",children:t})}'));
  assert.ok(cc.includes('id:"1UIDTGel6A"') && cc.includes('defaultMessage:"As many as {tokens} tokens projected.",id:"gkJGMhm9Rl"'));
  assert.ok(cc.includes('u=r.onView===null?void 0:i.viewWorkflow'));
  const warning = { axis: 'agents', scheduledAgents: 12, projectedTokens: 900000 };
  assert.equal(Size.workflowSizeDetail(warning, 'en-US', true), 'Up to 12 agents scheduled.');
  assert.equal(Size.workflowSizeDetail({ ...warning, axis: 'tokens', projectedTokens: 2400000 }, 'en-US', true), 'As many as 2.4M tokens projected.');
  assert.equal(Size.workflowSizeDetail(warning, 'en-US'), 'Up to 12 agents scheduled, more than most workflows use.');
  assert.equal(Size.workflowSizeDetail({ ...warning, axis: 'both' }, 'en-US', true), Size.workflowSizeDetail({ ...warning, axis: 'both' }, 'en-US'));
  const Notices = await load('/src/source-session-notices.jsx');
  assert.equal(Notices.workflowSizeName({ description: 'deploy.workflow.js', run: { title: 'Deploy check' } }), 'Deploy check');
  assert.equal(Notices.workflowSizeName({ description: 'deploy.workflow.js', run: {} }), 'deploy.workflow.js');
  assert.equal(Notices.workflowSizeName({ run: {} }), null);
  assert.equal(Notices.workflowSizeName({ run: { title: 'x'.repeat(80) } }), `${'x'.repeat(64)}…`, 'shared-156 KX caps at 64');
  let viewed = 0;
  const notice = { kind: 'workflowSize', summary: Notices.workflowSizeTitle('Deploy check'), details: 'Up to 12 agents scheduled.', onDismiss() {},
    stop: { label: 'Stop workflow', busy: false, run() {} }, view: { label: 'View workflow', run() { viewed += 1; } } };
  const html = renderToStaticMarkup(h(Notices.SourceInlineWorkflowBand, { notice }));
  assert.match(html, /class="min-w-0 text-warning"><bdi class="font-medium">Deploy check<\/bdi> is larger than most workflows\.<\/span>/);
  assert.ok(html.indexOf('>View workflow<') > 0 && html.indexOf('>View workflow<') < html.indexOf('>Stop workflow<'), 'secondaryCtaBoxed: View before Stop');
  assert.equal(renderToStaticMarkup(h(React.Fragment, null, Notices.workflowSizeTitle(null))), 'This workflow is larger than most.');
  // main.jsx: the notice's name, onView = openWorkflow(workflowKey(task.run)), and the slot path's two actions.
  const main = read('src/main.jsx');
  assert.ok(main.includes('const workflowSizeView = workflowSizePick && { label: t("View workflow"), run: () => openWorkflow(workflowKey(workflowSizePick.task.run)) };'));
  assert.ok(main.includes('summary: workflowSizeTitle(workflowSizeName), details: workflowSizeDetail(workflowSizePick.warning, undefined, workflowSizeName !== null),'));
  assert.ok(main.includes('stop: workflowSizeStop, view: workflowSizeView, actions: [workflowSizeView, workflowSizeStop] } : null;'));
  const { default: zh } = await import('../electron/i18n/zh-CN/workflows.mjs');
  for (const key of ['{name} is larger than most workflows.', 'Up to {count} agent scheduled.', 'Up to {count} agents scheduled.', 'As many as {tokens} tokens projected.']) assert.ok(zh[key], key);
});

test('r8c-05: the archived Code zone draws the archived banner alone (cc43287c9 Mu, no vie)', () => {
  assert.ok(official('cc43287c9-Me-M2ucD.js').includes(':p(Mu,{sessionRef:Hn},`${t}:archived`)'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('data-epitaxy-chat-column data-toast-safe-region="near-bottom"><SourceArchivedBanner key={`${current}:archived`}'));
  assert.ok(!main.includes('{renderSessionNotices(true)}<SourceArchivedBanner'));
});

test('css8-composer-leftover-handcopies: git-required, the spend row and the emoji glyph use the official class strings', async () => {
  assert.ok(official('cc43287c9-Me-M2ucD.js').includes('p("div",{className:"text-footnote text-danger select-text",children:Il})'));
  assert.ok(official('ceb864fac-DgT5XhCV.js').includes('t("span",{className:"flex size-[14px] shrink-0 items-center justify-center leading-none",style:u,children:r.char})'));
  const C = await load('/src/source-composer.jsx');
  const noop = () => {};
  const html = renderToStaticMarkup(h(C.SourceComposer, { draft: '', setDraft: noop, onSubmit: noop, onMenu: noop, onStop: noop, running: false, sending: false,
    permission: 'ask', model: { model: 'fixture', displayName: 'Fixture' }, workdir: '/tmp/p', gitRequired: 'Git is required for worktrees.' }));
  assert.match(html, /<div class="text-footnote text-danger select-text" role="status" data-git-required="">Git is required for worktrees\.<\/div>/);
  const panel = renderToStaticMarkup(h(C.SourceUsagePanel, { usage: { last: { totalTokens: 100 }, modelContextWindow: 128000, codeDesktop: { costUsd: 0.5 } } }));
  assert.match(panel, /<div class="flex items-center px-lg py-xs min-h-\[20px\] text-footnote text-muted-as-secondary" data-session-cost=""><span>Spent this session<\/span><span class="tabular-nums ms-auto">\$0\.50*<\/span><\/div>/);
  const css = read('src/source-composer.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /\.sc-git-required|\.sc-usage-row|\.sc-usage-muted|\.sc-usage-summary|\.sed-char/);
  assert.doesNotMatch(read('src/style.css'), /\.sc-usage-row/);
  assert.ok(read('src/source-emoji-dropdown.jsx').includes('<span className="flex size-[14px] shrink-0 items-center justify-center leading-none" style={EMOJI_GLYPH_STYLE}>{option.char}</span>'));
});
