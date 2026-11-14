// w10-shell-usage-copy (CI-23): electron/usage-model.mjs reset and usage-limit copy against Claude 3.6556.2's own
// formatters, read as text (never executed): shared-156-BLTosN8U qH/cU/fU/lU (plan usage meters),
// c227f4d5e-B-FYKrwT VI and the Code usage-limit band ($I/tL titles, shared-3 t4 = zs), and the shared-3 dE
// experiment rewrite that stays off on Code (GrowthBook __gb__1608543032, chat surface only; E13/E49).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ionSource, i18nSource, previousI18nSource } from '../scripts/official-3.6556.2.mjs';
import { usageResetLabel, usageResetCountdown, composerUsageNotice } from '../electron/usage-model.mjs';
import { setLocale, DEFAULT_LOCALE } from '../electron/i18n/index.mjs';

const chunk = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const shared156 = chunk('shared-156-BLTosN8U.js'), band = chunk('c227f4d5e-B-FYKrwT.js'), shared3 = chunk('shared-3-BCEbd8Fv.js');
const modelSource = fs.readFileSync(new URL('../electron/usage-model.mjs', import.meta.url), 'utf8');
const enUS = JSON.parse(fs.readFileSync(path.join(i18nSource, 'en-US.json'), 'utf8'));
const enUSOld = JSON.parse(fs.readFileSync(path.join(previousI18nSource, 'en-US.json'), 'utf8'));
// Every t('…') literal the model can show.
const literals = new Set([...modelSource.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)].map(match => match[1]));

test('official formatter source: qH rounding, cU/fU/lU branches and VI formats are the 3.6556.2 originals', () => {
  for (const feature of [
    'function qH(e,t){if(!e)return null;let n=Date.parse(e);if(!Number.isFinite(n)||n<=t)return null;let r=new Date(Math.round(n/6e4)*6e4),i=Math.max(0,r.getTime()-t);return{reset:r,totalMinutes:Math.floor(i/6e4)}}',
    'function cU(e,t,n,r="short"){let i=n.formatDate(e,t>=10080?{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}:{weekday:r,hour:"numeric",minute:"2-digit"});return n.formatMessage({id:"FFu9/eVhGP",defaultMessage:"Resets {time}"},{time:i})}',
    'return a<60?t.formatMessage({id:"xRhNrRpvbJ",defaultMessage:"Resets in {minutes} min"},{minutes:a}):a<1440?t.formatMessage({id:"UQqHrnCotN",defaultMessage:"Resets in {hours} hr {minutes} min"},{hours:Math.floor(a/60),minutes:a%60}):cU(i,a,t)}',
    's=e=>t.formatDate(e,{year:"numeric",month:"numeric",day:"numeric"});return s(a)===s(n)?t.formatMessage({id:"C33sdRxDco",defaultMessage:"Resets at {time}"},{time:t.formatTime(a,{hour:"numeric",minute:"2-digit"})}):cU(a,o,t,r.weekday)}',
  ]) assert.ok(shared156.includes(feature), feature.slice(0, 80));
  assert.ok(band.includes('a=i?y(qo,{value:r,hour:"numeric",minute:"numeric"}):y(Yo,{value:r,weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})'));
  assert.ok(band.includes('i?y(Q,{defaultMessage:"Resets at {time}",id:"C33sdRxDco",values:{time:a}}):y(Q,{defaultMessage:"Resets {time}",id:"FFu9/eVhGP",values:{time:a}})'));
});

// The official formatters transcribed one to one (intl = react-intl's formatDate/formatTime/formatMessage).
const intl = { formatDate: (d, o) => new Intl.DateTimeFormat('en-US', o).format(d), formatTime: (d, o) => new Intl.DateTimeFormat('en-US', o).format(d),
  formatMessage: (m, v = {}) => m.defaultMessage.replace(/\{(\w+)\}/g, (_, k) => String(v[k])) };
function qH(e, t) { if (!e) return null; const n = Date.parse(e); if (!Number.isFinite(n) || n <= t) return null; const r = new Date(Math.round(n / 6e4) * 6e4), i = Math.max(0, r.getTime() - t); return { reset: r, totalMinutes: Math.floor(i / 6e4) }; }
function cU(e, t, n, r = 'short') { const i = n.formatDate(e, t >= 10080 ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { weekday: r, hour: 'numeric', minute: '2-digit' }); return n.formatMessage({ defaultMessage: 'Resets {time}' }, { time: i }); }
function lU(e, t, n) { const r = qH(e, n); if (!r) return null; const { reset: i, totalMinutes: a } = r; return a < 60 ? t.formatMessage({ defaultMessage: 'Resets in {minutes} min' }, { minutes: a }) : a < 1440 ? t.formatMessage({ defaultMessage: 'Resets in {hours} hr {minutes} min' }, { hours: Math.floor(a / 60), minutes: a % 60 }) : cU(i, a, t); }
function fU(e, t, n, r = {}) { const i = qH(e, n); if (!i) return null; const { reset: a, totalMinutes: o } = i, s = d => t.formatDate(d, { year: 'numeric', month: 'numeric', day: 'numeric' }); return s(a) === s(n) ? t.formatMessage({ defaultMessage: 'Resets at {time}' }, { time: t.formatTime(a, { hour: 'numeric', minute: '2-digit' }) }) : cU(a, o, t, r.weekday); }
const FD = e => { const t = v => String(v).padStart(2, '0'); return `${e.getFullYear()}-${t(e.getMonth() + 1)}-${t(e.getDate())}`; };
function VI(e, t) { if (!e) return; const r = new Date(e), i = FD(r) === t; const a = i ? intl.formatTime(r, { hour: 'numeric', minute: 'numeric' }) : intl.formatDate(r, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); return i ? `Resets at ${a}` : `Resets ${a}`; }

test('the model’s reset labels equal the transcribed official formatters over minutes, hours, days and weeks', () => {
  const now = new Date(2026, 9, 5, 9, 17, 41).getTime();
  const offsets = [-120, -1, 1, 29, 59, 61, 90, 400, 899, 1439, 1441, 2000, 4320, 10079, 10081, 14000, 20160].map(minutes => minutes * 60 + 7);
  for (const offset of offsets) {
    const seconds = now / 1000 + offset, iso = new Date(seconds * 1000).toISOString();
    assert.equal(usageResetLabel(seconds, 300, 'en-US', now), fU(iso, intl, now), `fU ${offset}s`);
    assert.equal(usageResetCountdown(seconds, 300, { now, locale: 'en-US' }), lU(iso, intl, now), `lU ${offset}s`);
    const notice = composerUsageNotice({ rateLimitsByLimitId: { codex: { primary: { usedPercent: 85, windowDurationMins: 300, resetsAt: seconds } } } }, { now, locale: 'en-US' });
    assert.equal(notice.details, VI(iso, FD(new Date(now))), `VI ${offset}s`);
  }
});

test('usage copy is 3.6556.2 text verbatim: every string the model shows is in en-US.json under its official id', () => {
  const official = {
    'FFu9/eVhGP': 'Resets {time}', C33sdRxDco: 'Resets at {time}', xRhNrRpvbJ: 'Resets in {minutes} min', UQqHrnCotN: 'Resets in {hours} hr {minutes} min',
    TVLQSOK0oC: 'Approaching session usage limit', sax3sR1uez: 'Approaching weekly usage limit', '/yqEJpDlex': 'Approaching usage limit',
    '7w3FHlVG2e': 'Usage limit reached', ygKhCZxVtn: 'Session limit reached', jMXIdrdJgI: 'Weekly limit reached',
  };
  for (const [id, text] of Object.entries(official)) {
    assert.equal(enUS[id], text, id);
    assert.ok(literals.has(text), `usage-model shows ${text}`);
  }
  assert.ok(band.includes('k==="5h"?y(Q,{defaultMessage:"Approaching session usage limit",id:"TVLQSOK0oC"}):k==="7d"?y(Q,{defaultMessage:"Approaching weekly usage limit",id:"sax3sR1uez"})'));
  assert.ok(band.includes('Ue==="session"?We("hit_session")??y(Q,{...zs.session}):Ue==="weekly"?We("hit_weekly")??y(Q,{...zs.weekly}):Ge'));
  assert.ok(shared3.includes('var t4=zd({generic:{defaultMessage:"Usage limit reached",id:"7w3FHlVG2e"},session:{defaultMessage:"Session limit reached",id:"ygKhCZxVtn"},weekly:{defaultMessage:"Weekly limit reached",id:"jMXIdrdJgI"}'));
});

test('copy 3.6556.2 deleted, or never had, is gone from the model', () => {
  const deleted = ['tOqpYuLSqO', '1Fu/DJVLB7', 'C0tS351hMY', 'ajwKvdq+2j', 'bZ92DVKeBJ', 'TeaCd+n3q1', '08CclcuGcX'];
  for (const id of deleted) {
    assert.ok(enUSOld[id], `2.42304.0 had ${id}`); assert.equal(enUS[id], undefined, `3.6556.2 deleted ${id}`);
    assert.ok(!literals.has(enUSOld[id]), enUSOld[id]);
  }
  assert.deepEqual(deleted.slice(0, 5).map(id => enUSOld[id]), ['Reached your session limit', 'Reached your weekly limit', 'Reached your usage limit', 'Reached your {model} limit', 'Reached your weekly Cowork limit']);
  const values = new Set(Object.values(enUS));
  for (const local of ['Resets soon', 'Resets {day} {time}', 'You’ve used {percent}% of your session limit', 'You’ve used {percent}% of your weekly limit']) {
    assert.ok(!values.has(local), `${local} is not official copy`); assert.ok(!literals.has(local), local);
  }
});

test('the "Resets … · Session/Weekly limit reached" rewrite is a chat-surface GrowthBook experiment, never shown here', () => {
  assert.equal(enUS.ELu22pXUQ4, 'Resets at {time} · Session limit reached'); assert.equal(enUS.GSWhE7HUPO, 'Resets {day} at {time} · Weekly limit reached');
  assert.ok(shared3.includes('o===void 0?p(X,{defaultMessage:"Resets at {time} \\u00B7 Session limit reached",id:"ELu22pXUQ4",values:{time:a}}):p(X,{defaultMessage:"Resets {day} at {time} \\u00B7 Weekly limit reached",id:"GSWhE7HUPO",values:{day:o,time:a}})'));
  // dE returns its children unless the experiment arm is "a"; the arms come from __gb__1608543032 (RT: "off" without
  // GrowthBook), and $T only enrolls the chat surface.
  assert.ok(shared3.includes('let B=uE(S(Ld));return!(n?N==="a":M)||!d||B!=="a"||typeof a!="string"||o!==void 0&&typeof o!="string"?t:'));
  assert.ok(shared3.includes('var zT="__gb__1608543032"'));
  assert.ok(shared3.includes('return e==="chat"&&!a&&n&&t!==void 0&&r&&!i}'));
  for (const text of [enUS.ELu22pXUQ4, enUS.GSWhE7HUPO]) assert.ok(!literals.has(text), text);
  const host = fs.readFileSync(new URL('../src/host-growthbook.mjs', import.meta.url), 'utf8');
  assert.ok(!host.includes('1608543032'), 'the host never turns the experiment on');
  const now = new Date(2026, 9, 5, 9, 0).getTime(), resetsAt = now / 1000 + 90 * 60;
  for (const [primary, secondary] of [[{ usedPercent: 100, windowDurationMins: 300, resetsAt }, null], [{ usedPercent: 10, windowDurationMins: 300, resetsAt }, { usedPercent: 100, windowDurationMins: 10080, resetsAt }]]) {
    const notice = composerUsageNotice({ rateLimitsByLimitId: { codex: { primary, secondary, rateLimitReachedType: 'rate_limit_reached' } } }, { now, locale: 'en-US' });
    assert.match(notice.summary, /^(Session|Weekly) limit reached$/); assert.doesNotMatch(`${notice.summary} ${notice.details}`, /·/);
  }
});

test('zh-CN: the new usage copy is translated', (context) => {
  context.after(() => setLocale(DEFAULT_LOCALE));
  setLocale('zh-CN');
  const now = new Date(2026, 9, 5, 9, 0).getTime(), at = minutes => now / 1000 + minutes * 60;
  const notice = (window, extra = {}) => composerUsageNotice({ rateLimitsByLimitId: { codex: { primary: window, ...extra } } }, { now, locale: 'zh-CN' });
  assert.equal(notice({ usedPercent: 85, windowDurationMins: 300, resetsAt: at(90) }).summary, '即将达到会话用量上限');
  assert.equal(notice({ usedPercent: 85, windowDurationMins: 10080, resetsAt: at(90) }).summary, '即将达到每周用量上限');
  assert.equal(notice({ usedPercent: 85, windowDurationMins: 1440, resetsAt: at(90) }).summary, '即将达到用量上限');
  assert.equal(notice({ usedPercent: 100, windowDurationMins: 300, resetsAt: at(90) }, { rateLimitReachedType: 'rate_limit_reached' }).summary, '已达到会话用量上限');
  assert.match(usageResetCountdown(at(3 * 1440), 10080, { now, locale: 'zh-CN' }), /^.+ 重置$/);
  assert.match(usageResetLabel(at(30), 300, 'zh-CN', now), /^.+ 重置$/);
});
