// W12b w12b-usage-notices: the 3.6556.2 usage band's live reset countdown (c227f4d5e QF / $F, sliced by
// scripts/extract-usage-countdown.mjs into src/generated/usage-countdown), the reached notice's detail (usage-model.mjs
// composerUsageNotice countdown / lead), and the Usage page's reset captions on shared-156 lU over the minute clock.
// Source only: the official chunks are read as text (never run); the generated slice renders with Vite SSR and, for the
// ticking branches, with React's client renderer in the R3b fake DOM under mocked Date / setTimeout. No window, no GUI.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import React, { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { composerUsageNotice } from '../electron/usage-model.mjs';
import zhApp from '../electron/i18n/zh-CN/app.mjs';
import { withPreviewDom } from './fixtures/preview-r3b-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist');
const chunk = (name) => fs.readFileSync(path.join(v1, 'assets/v1', name), 'utf8');
const local = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;

let server, Countdown, Notices, Usage, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Countdown = await server.ssrLoadModule('/src/generated/usage-countdown/usage-countdown.mjs');
  Notices = await server.ssrLoadModule('/src/source-session-notices.jsx');
  Usage = await server.ssrLoadModule('/src/source-usage.jsx');
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18n.setLocale('en-US');
});
after(async () => { I18n?.setLocale('en-US'); await server?.close(); });

test('original text: QF / $F, the card context, the band call site, the seconds store and lU on the usage meters (pinned once each)', () => {
  const band = chunk('c227f4d5e-B-FYKrwT.js');
  for (const needle of [
    'var YF=36e5,XF=600,ZF=H(!1);function QF(e){let $=J9(9);if(!I(ZF))return J1($,0,e)?K1($,0,e,y($F,{...e})):$[1];',
    'y("span",{"aria-hidden":"true",children:y($F,{...e,inNoticeCard:!0})})',
    'y("span",{className:"sr-only",children:e.absolute})',
    'o=t*1e3,s=o-cl(),c=s>0&&s<YF,l=Yp(c?o:null),u=c?l:0;if(s>=YF||u===null)return J1($,0,n)?K1($,0,n,y(O,{children:n})):$[1];let d=i?void 0:"off"',
    'u===0?y(Q,{defaultMessage:"Resetting\\u2026",id:"26SvXGZRRO"}):u<XF?y(Q,{defaultMessage:"Resets in {minutes}:{seconds}",id:"LE8RI8JdZv",values:{minutes:a.formatNumber(Math.floor(u/60)),seconds:a.formatNumber(u%60,{minimumIntegerDigits:2})}})',
    'y(Q,{defaultMessage:"Resets in {duration}",id:"3UVgP+t08Q",values:{duration:a.formatNumber(Math.floor(u/60),{style:"unit",unit:"minute",unitDisplay:"short"})}})',
    'y("span",{"aria-live":d,className:"tabular-nums",children:f})',
    'E(ZF.Provider,{value:!0,children:[T,D]})',
    '_e?y(QF,{resetsAtSeconds:_e,absolute:VI(_e,u)}):void 0',
    'J==="exceeded"&&!Qe?HI($e,et)',
    'import{n as Yp}from"./c93058e68-CMBi_EBm.js"',
    'eI as qs',
  ]) assert.equal(count(band, needle), 1, needle);
  // The Code session turns the card look on (tI): the band renders as the notice card aL, inside ZF.
  const session = chunk('cc43287c9-Me-M2ucD.js');
  assert.equal(count(session, 'qs as ete'), 1);
  assert.equal(count(session, 'p(ete.Provider,{value:!0,children:p(ID,{session:t,children:n})})'), 1);
  const seconds = chunk('c93058e68-CMBi_EBm.js');
  for (const needle of ['function r(e,n){return Math.max(0,Math.ceil((n-e)/t))}', 'function f(e){return u(e??null,r)}', 'export{f as n,d as t}'])
    assert.equal(count(seconds, needle), 1, needle);
  const shared156 = chunk('shared-156-BLTosN8U.js');
  assert.equal(count(shared156, 'function lU(e,t,n){let r=qH(e,n);if(!r)return null;let{reset:i,totalMinutes:a}=r;return a<60?t.formatMessage({id:"xRhNrRpvbJ",defaultMessage:"Resets in {minutes} min"},{minutes:a}):a<1440?'), 1);
  for (const needle of ['lU as Bi', 'fK as Rr', 'fU as zi']) assert.equal(count(shared156, needle), 1, needle);
  // The plan usage meter (c51de9054 A): lU unless specCopy; the desktop's own Usage page token limit card (c71860c77 J): lU.
  const meter = chunk('c51de9054-BPI5tIfM.js');
  for (const needle of ['import{Bi as _,Ka as v,Rr as y,Zi as b,zi as x}from"./shared-156-BLTosN8U.js"', 'r?x(n.claim.resets_at,c,l):_(n.claim.resets_at,c,l)'])
    assert.equal(count(meter, needle), 1, needle);
  const usagePage = chunk('c71860c77-C-Aidqqd.js');
  for (const needle of ['import{Bi as me,Lr as he,Rr as N}from"./shared-156-BLTosN8U.js"', 'r=N(),', 'me(e.resetsAtMs===void 0?null:new Date(e.resetsAtMs).toISOString(),t,r)'])
    assert.equal(count(usagePage, needle), 1, needle);
  const en = JSON.parse(fs.readFileSync(path.join(v1, 'i18n/en-US.json'), 'utf8'));
  assert.deepEqual([en['26SvXGZRRO'], en['LE8RI8JdZv'], en['3UVgP+t08Q']], ['Resetting…', 'Resets in {minutes}:{seconds}', 'Resets in {duration}']);
});

test('generator: --check passes; the slice is the original QF / $F / ZF and c93058e68 f, fK linked from session-rail-sections', () => {
  const run = spawnSync(process.execPath, ['scripts/verify-gen-usage-countdown.mjs'], { cwd: app, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const manifest = JSON.parse(local('src/generated/usage-countdown/manifest.json'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const band = manifest.modules.find((m) => m.target === 'usage-countdown.mjs');
  assert.deepEqual(band.exports, { QF: 'UsageResetCountdown', ZF: 'UsageNoticeCardContext' });
  assert.deepEqual(band.bindings.map((b) => b.name).sort(), ['$F', 'QF', 'XF', 'YF', 'ZF']);
  const imported = Object.fromEntries(band.imports.map((i) => [i.local, i]));
  assert.deepEqual([imported.cl.from, imported.cl.name, imported.cl.kind], ['../session-rail-sections/minute-clock.mjs', 'useMinuteNow', 'linked']);
  assert.deepEqual([imported.Jo.name, imported.Q.name], ['useIntl', 'FormattedMessage']);
  assert.deepEqual(manifest.modules.find((m) => m.target === 'seconds-until.mjs').sharedExports, ['f']);
  const text = local('src/generated/usage-countdown/usage-countdown.mjs');
  assert.ok(text.includes('defaultMessage: "Resets in {minutes}:{seconds}"') && text.includes('export { QF as UsageResetCountdown, ZF as UsageNoticeCardContext };'));
});

test('composerUsageNotice: a reached limit carries the countdown; no-remedy bodies go, remedy bodies stay; approaching keeps VI text', () => {
  const now = new Date(2026, 9, 28, 9, 0).getTime(), soon = now / 1000 + 25 * 60;
  const limits = (primary, extra = {}, top = {}) => ({ ...top, rateLimitsByLimitId: { codex: { primary, ...extra } } });
  const plain = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, { rateLimitReachedType: 'rate_limit_reached' }), { now, locale: 'en-US' });
  assert.equal(plain.summary, 'Session limit reached');
  assert.match(plain.details, /^Resets at /);
  assert.deepEqual(plain.countdown, { resetsAtSeconds: soon, absolute: plain.details, lead: null });
  const withReset = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, { rateLimitReachedType: 'rate_limit_reached' },
    { rateLimitResetCredits: { availableCount: 1, credits: [{ id: 'a', status: 'available' }] } }), { now, locale: 'en-US' });
  assert.equal(withReset.countdown.lead, 'You’ve reached your usage limit. Use an earned reset, or try again after your limit resets.');
  assert.ok(withReset.details.startsWith(`${withReset.countdown.lead} Resets at `));
  const member = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, { rateLimitReachedType: 'workspace_member_usage_limit_reached' }), { now, locale: 'en-US' });
  // w12c-wiring: the member's request to the owner is the band's CTA now (NI "request-extra-usage"), so its body goes.
  assert.deepEqual([member.countdown.lead, member.nudge], [null, 'usage_limit']);
  assert.equal(plain.nudge, null);
  const blocked = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, {}, { ordinaryUsageAllowed: false }), { now, locale: 'en-US' });
  assert.equal(blocked.countdown.lead, null);
  const credits = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300, resetsAt: soon }, { credits: { hasCredits: true, unlimited: false, balance: '10' } }, { ordinaryUsageAllowed: false }), { now, locale: 'en-US' });
  assert.equal(credits.countdown, undefined);
  assert.equal(credits.details, 'Your plan’s included usage is used up. New messages use your credits.');
  const approaching = composerUsageNotice(limits({ usedPercent: 85, windowDurationMins: 300, resetsAt: soon }), { now, locale: 'en-US' });
  assert.equal(approaching.countdown, undefined);
  assert.match(approaching.details, /^Resets at /);
  const noReset = composerUsageNotice(limits({ usedPercent: 100, windowDurationMins: 300 }, { rateLimitReachedType: 'rate_limit_reached' }), { now, locale: 'en-US' });
  assert.deepEqual([noReset.details, noReset.countdown], ['', undefined], 'no reset time: the reached detail is empty, like et without _e');
});

test('SSR: the notice card renders QF inside ZF (aria-hidden text, sr-only absolute); passed resets read Resetting…', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const notice = (resetsAtSeconds, lead = null) => ({ kind: 'usage', level: 'danger', summary: 'Session limit reached', details: 'Resets at 10:30 AM', dismissKey: `k${resetsAtSeconds}`,
    countdown: { resetsAtSeconds, absolute: 'Resets at 10:30 AM', lead } });
  const html = (n) => renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [n] }));
  // Within the hour, before the first client tick (server snapshot null): the absolute text.
  assert.ok(html(notice(nowSeconds + 1800)).includes('<p class="ssn-details"><bdi><span aria-hidden="true">Resets at 10:30 AM</span><span class="sr-only">Resets at 10:30 AM</span></bdi></p>'));
  // Over an hour out: the absolute text as well.
  assert.ok(html(notice(nowSeconds + 3 * 3600)).includes('<span aria-hidden="true">Resets at 10:30 AM</span><span class="sr-only">Resets at 10:30 AM</span>'));
  // Passed: Resetting…, no aria-live inside a card.
  assert.ok(html(notice(nowSeconds - 120)).includes('<span aria-hidden="true"><span class="tabular-nums">Resetting…</span></span><span class="sr-only">Resets at 10:30 AM</span>'));
  // A remedy body leads the countdown.
  assert.ok(html(notice(nowSeconds + 1800, 'Use an earned reset.')).includes('<bdi>Use an earned reset. <span aria-hidden="true">'));
  // Outside a card (ZF false): $F alone, aria-live off.
  assert.equal(renderToStaticMarkup(h(Countdown.UsageResetCountdown, { resetsAtSeconds: nowSeconds - 120, absolute: 'x' })), '<span aria-live="off" class="tabular-nums">Resetting…</span>');
  // Other notices keep their plain details.
  assert.ok(renderToStaticMarkup(h(Notices.SourceSessionNotices, { notices: [{ kind: 'warning', summary: 'S', details: 'D' }] })).includes('<p class="ssn-details"><bdi>D</bdi></p>'));
});

test('client: the countdown ticks every second within the hour — {duration}, then minutes:seconds under ten minutes, then Resetting…', async (t) => {
  const start = new Date(2026, 9, 28, 10, 0, 0).getTime();
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: start });
  await withPreviewDom(async (dom) => {
    const container = dom.document.body.appendChild(dom.document.createElement('div'));
    const root = createRoot(container);
    const target = start / 1000 + 30 * 60;
    const show = (inCard) => act(async () => {
      const node = h(Countdown.UsageResetCountdown, { resetsAtSeconds: target, absolute: 'Resets at 10:30 AM' });
      root.render(inCard ? h(Countdown.UsageNoticeCardContext.Provider, { value: true }, node) : node);
    });
    const tick = (ms) => act(async () => { t.mock.timers.tick(ms); });
    const live = () => container.childNodes[0];
    try {
      await show(false);
      assert.equal(container.textContent, 'Resets in 30 min');
      assert.equal(live().getAttribute('aria-live'), 'off');
      assert.equal(live().getAttribute('class'), 'tabular-nums');
      await tick(20 * 60 * 1000 + 1000);
      assert.equal(container.textContent, 'Resets in 9:59');
      await tick(9 * 60 * 1000 + 58 * 1000);
      assert.equal(container.textContent, 'Resets in 0:01');
      await tick(1000);
      assert.equal(container.textContent, 'Resetting…');
      await show(true);
      assert.equal(container.childNodes[0].getAttribute('aria-hidden'), 'true');
      assert.equal(container.childNodes[1].getAttribute('class'), 'sr-only');
      assert.equal(container.textContent, 'Resetting…Resets at 10:30 AM');
      I18n.setLocale('zh-CN');
      await act(async () => root.render(h(Countdown.UsageResetCountdown, { resetsAtSeconds: Date.now() / 1000 + 45 * 60, absolute: 'x' })));
      assert.equal(container.textContent, '45分钟后重置');
      await act(async () => root.render(h(Countdown.UsageResetCountdown, { resetsAtSeconds: Date.now() / 1000 + 5 * 60 + 7, absolute: 'x' })));
      assert.equal(container.textContent, '5:07 后重置');
    } finally {
      I18n.setLocale('en-US');
      await act(async () => root.unmount());
    }
  });
});

test('Usage page: reset captions are lU over the minute clock (Resets in … hr … min within the day)', () => {
  const source = local('src/source-usage.jsx');
  assert.ok(!source.includes('usageResetLabel'), 'fU (usageResetLabel) is the plan popover specCopy, not the Usage page');
  assert.ok(source.includes("import {useMinuteNow} from './generated/session-rail-sections/minute-clock.mjs';"));
  assert.ok(source.includes('const reset=usageResetCountdown(row.resetsAt,row.minutes,{now,locale:getLocale()});'));
  const resetsAt = Math.floor(Date.now() / 1000) + 3 * 3600 + 30 * 60;
  const meter = renderToStaticMarkup(h(Usage.CreditsSection, { entry: { credit: null, spend: { key: 'spend', percent: 40, resetsAt, variant: 'accent', detail: '$4 of $10' } } }));
  assert.match(meter, /\$4 of \$10 · Resets in 3 hr 3[01] min/);
  const text = renderToStaticMarkup(h(Usage.CreditsSection, { entry: { credit: null, spend: { key: 'spend', percent: null, resetsAt: Math.floor(Date.now() / 1000) + 20 * 60, detail: '$4 spent' } } }));
  assert.match(text, /Monthly credit limit: \$4 spent · Resets in (19|20|21) min/);
});

test('zh-CN: the countdown copy is translated', () => {
  assert.equal(zhApp['Resets in {duration}'], '{duration}后重置');
  assert.equal(zhApp['Resets in {minutes}:{seconds}'], '{minutes}:{seconds} 后重置');
  assert.equal(zhApp['Resetting…'], '正在重置…');
});
