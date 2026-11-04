import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// W14-code round 6, lane composer (only source evidence, E61): r6-composer-01 (Fast mode failure toast),
// r6-composer-02 = css6-effort-slider = gates-r6-09 (the effort popover is the sliced c8e04f916 EffortControl),
// r6-composer-06 (side question stop failure and status sentences).
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (prefix) => fs.readFileSync(path.join(v1, fs.readdirSync(v1).find((name) => name.startsWith(prefix))), 'utf8');
const h = React.createElement;
let server, E, S, L, C, P;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  E = await server.ssrLoadModule('/src/generated/effort-control/effort-control.mjs');
  S = await server.ssrLoadModule('/src/generated/effort-control/slider.mjs');
  L = await server.ssrLoadModule('/src/generated/effort-control/lit-overlay.mjs');
  C = await server.ssrLoadModule('/src/source-composer.jsx');
  P = await server.ssrLoadModule('/src/generated/code-composer/chat-composer-presence.mjs');
});
after(() => server?.close());

test('r6-composer-01: a failed Fast mode / speed change in Code is the Pf1IIDTPMM danger toast, the reason only logged', () => {
  assert.ok(official('c3efc6f9e-').includes('fastModeApplyFailed:{defaultMessage:"Fast mode couldn\\u2019t be applied. You can try again.",id:"Pf1IIDTPMM"}'));
  assert.ok(official('c9543da06-').includes('h(m.formatMessage(va.fastModeApplyFailed),{error:n,errorContext:{tags:{source:"epitaxy_set_fast_mode"'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('const fastModeFailed = (e) => { if (mode === "code" && toasts) { console.warn("epitaxy_set_fast_mode failed", e); codeDanger(t("Fast mode couldn’t be applied. You can try again.")); } else setError(e?.message); };'));
  // ⌘⌥F, the model menu's Speed rows and Fast toggle, and /fast (Code: the toast; other modes keep their warning notice).
  assert.ok(main.includes('if (!e.repeat) changeSpeed(nextSpeed()).catch(fastModeFailed);'));
  assert.ok(main.includes('onSpeedChange={value=>changeSpeed(value).catch(fastModeFailed)}'));
  assert.ok(main.includes('onFastModeChange={value=>changeFastMode(value).catch(fastModeFailed)}'));
  assert.equal(main.split('.catch(e=>{if(mode==="code"&&toasts)fastModeFailed(e);else throw e;})').length - 1, 2);
  assert.doesNotMatch(main, /changeSpeed\([^)]*\)\.catch\(e(rror)? ?=> ?setError/);
  assert.match(read('electron/i18n/zh-CN/session.mjs'), /"Fast mode couldn’t be applied\. You can try again\.": "无法切换快速模式。你可以重试。"/);
});

test('r6-composer-02: the effort popover is the sliced c8e04f916 EffortControl with its own popup, labels and slider', () => {
  const generated = read('src/generated/effort-control/effort-control.mjs');
  for (const feature of ['"data-cds": "ModelSelectorEffort"', 's("isolate flex w-[220px] select-none flex-col gap-lg", O)',
    't(d.Title, { className: "shrink-0 text-muted", children: w })', 'o("aboutEffort", "About effort")', 'o("faster", "Faster")', 'o("smarter", "Smarter")',
    'showStops: !0,', 'overlay: je,', 'delay: 200,', '"pointer-coarse:block text-pretty text-footnote text-muted hidden break-words"',
    'import { presenceMotion as ae } from "../code-composer/chat-composer-presence.mjs";',
    'import { CdsPreviewCard as p } from "../view-tabs/shared-156-BLTosN8U.js";', 'import { y as oe } from "./slider.mjs";'])
    assert.ok(generated.includes(feature), feature);
  // vendor-frame's own React reads are the app's React (no second React copied out of vendor-frame).
  for (const file of fs.readdirSync(path.join(app, 'src/generated/effort-control')).filter((name) => name.endsWith('.mjs')))
    assert.doesNotMatch(read(`src/generated/effort-control/${file}`), /react\.transitional\.element|__CLIENT_INTERNALS/, file);
  // S's own trigger (jw passes renderTrigger): the host's stand-in box over the element it opened from, named
  // effortSelectorTrigger 'Effort: {name}', no tooltip of its own.
  const html = renderToStaticMarkup(h(C.SourceEffortPopover, { anchor: null, levels: ['low', { reasoningEffort: 'high', badge: { message: 'Default', variant: 'neutral' } }, 'ultracode'], value: 'high', onChange: () => {}, onClose: () => {} }));
  assert.match(html, /^<span aria-hidden="true" data-effort-anchor="" style="position:fixed;pointer-events:none;visibility:hidden;left:0;top:0;width:0;height:0"[^>]* aria-haspopup="dialog"[^>]* data-cds="ModelSelectorEffort" aria-label="Effort: High"/);
  assert.doesNotMatch(html, /data-base-ui-tooltip-trigger/);
  const direct = renderToStaticMarkup(h(E.EffortControl, { options: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], activeEffortId: 'low', effortLabel: 'Effort', onPickEffort: async () => true }));
  assert.match(direct, /^<button type="button" data-cds="ModelSelectorEffort" data-cds-ghost=""/, 'without renderTrigger: the ghost CdsButton trigger');
  assert.match(direct, /aria-label="Effort: Low"/);
});

test('r6-composer-02: options as jw builds them; R$ passes P$ only when the last option is ultracode', () => {
  const r$ = official('c227f4d5e-');
  assert.ok(r$.includes('J=Dd(re?.thinking?.effort_options?.at(-1)?.id)?P$:void 0'));
  assert.ok(official('shared-28-').includes('function Sg(e){return e===xg}'));
  assert.deepEqual(C.effortControlOptions(['low', { reasoningEffort: 'high', description: 'Deep', badge: { message: 'Default', variant: 'neutral' } }, { id: 'max', name: 'Max', tooltip: { content: 'x' } }]), [
    { id: 'low', name: 'Low', description: undefined },
    { id: 'high', name: 'High', description: 'Deep', badge: { message: 'Default', variant: 'neutral' } },
    { id: 'max', name: 'Max', description: undefined, tooltip: { content: 'x' } },
  ]);
  assert.equal(C.effortSliderOverlay([{ id: 'low' }, { id: 'ultracode' }]), L.EffortSliderOverlay);
  for (const last of ['ultra', 'max', 'xhigh']) assert.equal(C.effortSliderOverlay([{ id: 'low' }, { id: last }]), undefined, last);
});

test('r6-composer-02: the CDS Slider carries the overlay inside its fill; the lit bed is v$ over the webgl2 field', () => {
  const lit = (atMax) => renderToStaticMarkup(h(L.EffortSliderOverlay, { atMax }));
  assert.match(lit(false), /^<span class="epitaxy-root text-body text-primary break-words contents"><span class="absolute inset-0 bg-surface-3 opacity-0"[^>]*><span class="absolute inset-0 bg-alpha-2"><\/span><\/span>/);
  assert.match(lit(true), /class="absolute inset-0 bg-surface-3 opacity-100"/);
  assert.match(lit(true), /\[mask-image:linear-gradient\(to_right,transparent_0%,black_45%\)\]/);
  const slider = renderToStaticMarkup(h(S.y, { value: 2, min: 0, max: 2, step: 1, showStops: true, mark: { value: 1, label: 'Default' },
    overlay: h(L.EffortSliderOverlay, { atMax: true }), 'aria-label': 'Effort', getAriaValueText: (index) => ['Low', 'High (Default)', 'Ultracode'][index] }));
  assert.match(slider, /data-cds="Slider"/);
  assert.match(slider, /data-slider-overlay=""/);
  assert.match(slider, /bg-surface-3 opacity-100/);
  assert.match(slider, />Default</);
  assert.match(slider, /aria-valuetext="Ultracode"/);
});

test('r6-composer-02: the lazy presence motion loads (shared-5 Od) and the shell reads the one getter', async () => {
  const shared5 = official('shared-5-');
  assert.ok(shared5.includes('function Od(){return xd??=Je("cds_lazy_presence_motion",Dd).then('));
  assert.ok(official('shared-50-').includes('function tD(){return gf().then('));
  const presence = read('src/generated/code-composer/chat-composer-presence.mjs');
  assert.ok(presence.includes('import { loadPresenceMotionChunk as Dd } from "../../source-composer-current-adapters.jsx";'));
  assert.doesNotMatch(read('src/generated/code-composer/chat-composer-shell.mjs'), /var kd = /);
  assert.equal(await P.loadPresenceMotion(), true);
  const motion = P.presenceMotion();
  for (const name of ['AnimatePresence', 'HidingPresenceElement', 'LazyMotion', 'PresenceContext', 'PresenceElement', 'domMax', 'm']) assert.ok(motion[name], name);
  assert.equal(typeof motion.m.span, 'object');
  assert.equal(P.lazyPresenceMotion, motion);
});

test('r6-composer-02 (E95): the host effort control, its value swap, help bubble, slider, lit port and rules are gone', () => {
  assert.equal(fs.existsSync(path.join(app, 'src/source-effort-lit.jsx')), false);
  const composer = read('src/source-composer.jsx');
  assert.doesNotMatch(composer, /export function EffortControl|function EffortValueSwap|EffortLitOverlay|EFFORT_HELP_|sc-effort-control|sc-slider/);
  assert.doesNotMatch(read('src/source-composer.css').replace(/\/\*[\s\S]*?\*\//g, ''), /\.sc-effort-(?!trigger)|\.sc-slider|sc-effort-lit/);
  assert.equal(C.EffortControl, undefined);
});

test('r6-composer-06: Stop has no failure branch; status sentences are vF', () => {
  const side = official('cccc2cf0a-');
  assert.ok(side.includes('e.setInterrupting(m,!0),p==="remote"?wF(d,m):Uc.interrupt(m)'));
  const controls = read('src/side-chat-controls.mjs');
  assert.doesNotMatch(controls, /interruptFailed|Something went wrong/);
  assert.match(controls, /sideChatStore\.finish\(threadId, requestId, \{ retryable: false \}\);/);
  assert.doesNotMatch(read('src/side-chat-store.mjs'), /interruptFailed/);
  const zh = read('electron/i18n/zh-CN/session.mjs');
  assert.ok(zh.includes('"No answer yet. Send a message in the main chat first, then ask again."'));
  assert.ok(zh.includes('"Couldn’t connect to this session’s environment. Try again in a moment."'));
  assert.doesNotMatch(zh, /The connection closed before the side question was answered/);
});

test('css6-usage-panel-body (复核修复): the plan section is c1564829c g / y / v with c0d8a9968 f as its link', () => {
  const g = official('c1564829c-'), link = official('c0d8a9968-'), s8 = official('shared-8-');
  for (const s of ['"flex items-center justify-between gap-2 px-lg py-xs min-h-[20px]"', 'className:"text-footnote text-muted-as-secondary",children:[', '" \\u00B7 "',
    '"flex flex-col gap-sm px-lg pb-xs"', '"flex flex-col gap-xs"', '"flex items-baseline justify-between gap-2"', '"text-footnote text-primary truncate"',
    '"flex items-baseline gap-1.5 text-footnote text-muted-as-secondary tabular-nums shrink-0"', '"text-footnote text-muted-as-secondary tabular-nums shrink-0"',
    '"mt-pad-xs h-[4px] rounded-[3px] overflow-hidden bg-alpha-1"', '"data-usage-bar-fill":""', 'transition-[width]'])
    assert.ok(g.includes(s), `official c1564829c has ${s}`);
  assert.ok(link.includes('variant:"ghost",size:"xxs",icon:"UsageGaugeMiddle",iconOnly:!0,flush:"end"'));
  assert.ok(s8.includes('{normal:"bg-fill-accent",warning:"bg-fill-warning",critical:"bg-fill-danger"}'));
  const plan = { plan: 'Pro', windows: [
    { key: 'a', label: 'Current session', used: 92, minutes: 300, resetsAt: null, variant: 'danger' },
    { key: 'b', label: 'This week', used: 40, minutes: 10080, resetsAt: null, variant: 'accent' }],
    credit: { balance: '1,250 credits' }, spend: { detail: '125 of 500 credits used', percent: 80, variant: 'warning' } };
  const html = renderToStaticMarkup(h(C.SourceUsagePanel, { usage: null, plan, onViewUsage() {} }));
  assert.match(html, /^<div class="flex flex-col gap-xs"><div class="flex items-center justify-between gap-2 px-lg py-xs min-h-\[20px\]"><span class="text-footnote text-muted-as-secondary">Plan usage limits(<!-- -->)? · (<!-- -->)?Pro<\/span>/);
  assert.match(html, /<button[^>]*aria-label="View usage in Settings"/);
  assert.doesNotMatch(html, /href=/, 'no web-router href in the host');
  assert.match(html, /<div class="flex flex-col gap-sm px-lg pb-xs">/);
  assert.deepEqual([...html.matchAll(/text-footnote text-primary truncate">([^<]*)</g)].map((m) => m[1]), ['Current session', 'This week', 'Usage credits']);
  assert.deepEqual([...html.matchAll(/data-usage-bar-fill="" class="h-full (bg-fill-\w+) transition-\[width\]"/g)].map((m) => m[1]), ['bg-fill-danger', 'bg-fill-accent', 'bg-fill-warning']);
  assert.equal((html.match(/class="mt-pad-xs h-\[4px\] rounded-\[3px\] overflow-hidden bg-alpha-1" role="progressbar"/g) || []).length, 3);
  assert.match(html, /<span>92%<\/span>/); assert.match(html, /125 of 500 credits used/); assert.match(html, /1,250 credits/);
  assert.doesNotMatch(html, /sc-usage-plan/);
  assert.doesNotMatch(read('src/source-composer.css'), /\.sc-usage-plan/);
  const none = renderToStaticMarkup(h(C.SourceUsagePanel, { usage: null, plan: { plan: null, windows: plan.windows, credit: null, spend: null } }));
  assert.match(none, /<span class="text-footnote text-muted-as-secondary">Plan usage limits<\/span>/, 'no dangling separator without a plan name');
  assert.doesNotMatch(none, /View usage in Settings|data-credits/);
});
