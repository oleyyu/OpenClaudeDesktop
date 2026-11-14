// W10 (w10-chat-tests): the date input and month grid are the 3.6556.2 cff2bf6cb-PfnEo01t.js slice that
// cowork-scheduled publishes (the routine form c97b955f1 imports its `nu`, official export `t`). 3.6556.2 merged the
// 2.2553.1 month grid module c8ff922bb into cff2bf6cb: `wo` is the Calendar (data-cds "Calendar"), `lu` the DateInput
// that `nu` wraps in the react-aria locale provider (`sn`, locale from CDS useCdsLocale = CdsRoot `locale`), `$a` the
// ISO date parser (react-aria `gt` under try/catch) and `Q` its toString.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = 'cff2bf6cb-PfnEo01t.js';
const TARGET = 'src/generated/cowork-scheduled/cff2bf6cb-PfnEo01t.mjs';
const OFFICIAL = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
let server, calendar, CdsRoot;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  calendar = await server.ssrLoadModule(`/${TARGET}`);
  ({ CdsRoot } = await server.ssrLoadModule('/src/generated/view-tabs/index.js'));
});
after(async () => { await server?.close(); });
const h = React.createElement;
const render = (component, props, locale) => renderToStaticMarkup(locale ? h(CdsRoot, { locale }, h(component, props)) : h(component, props));

// The react-aria string dictionaries: 3.6556.2 declares each empty and fills it in a following statement
// (`var tr={};tr={"ar-AE":xn,…,"en-US":Dn,…}`, likewise _s / vc / Cl over the per-locale objects). The date input and
// the month grid read them while rendering (`_r(vr(tr),"@react-aria/calendar")` → format("selectedDateDescription")).
test('the calendar, date-field and date-picker string dictionaries are filled as in the official module', () => {
  const original = fs.readFileSync(path.join(OFFICIAL, SOURCE), 'utf8');
  for (const name of ['tr', '_s', 'vc', 'Cl']) {
    assert.ok(original.includes(`var ${name}={};${name}={"ar-AE":`), `official ${name}`);
    assert.ok(Object.hasOwn(calendar[name], 'en-US') && Object.hasOwn(calendar[name], 'zh-CN'), `${name} holds the locales`);
  }
});

test('date input renders editable date segments and the original calendar trigger', () => {
  const html = render(calendar.nu, { value: '2026-10-15', onValueCommitted() {}, 'aria-label': 'Start date', name: 'start-date' }, 'en-US');
  assert.match(html, /data-cds="DateInput"/);
  assert.equal((html.match(/role="spinbutton"/g) ?? []).length, 3);
  assert.match(html, /aria-label="month[^"]*"/);
  assert.match(html, /aria-label="day[^"]*"/);
  assert.match(html, /aria-label="year[^"]*"/);
  assert.match(html, /type="hidden"[^>]*value="2026-10-15"|value="2026-10-15"[^>]*type="hidden"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /type="date"/);
});

test('date parsing rejects invalid days and preserves leap-day and month arithmetic', () => {
  for (const invalid of ['2026-02-29', '2026-13-01', '2026-04-31', 'not-a-date', '', undefined]) assert.equal(calendar.$a(invalid), undefined, String(invalid));
  const leap = calendar.$a('2028-02-29');
  assert.equal(calendar.Q(leap), '2028-02-29');
  assert.equal(calendar.Q(leap.add({ years: 1 })), '2029-02-28');
  assert.equal(calendar.Q(calendar.$a('2026-12-31').add({ days: 1 })), '2027-01-01');
});

test('month grid retains selected dates, disabled days and accessible month navigation', () => {
  const html = render(calendar.wo, { value: '2026-10-15', minDate: '2026-10-10', maxDate: '2026-10-20',
    isDateUnavailable: date => date === '2026-10-16', 'aria-label': 'Choose start date' }, 'en-US');
  assert.match(html, /data-cds="Calendar"/);
  assert.match(html, /October 2026/);
  assert.equal((html.match(/role="columnheader"/g) ?? []).length, 7);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /aria-label="Previous month"[^>]*disabled=""|disabled=""[^>]*aria-label="Previous month"/);
  assert.match(html, /aria-label="Next month"[^>]*disabled=""|disabled=""[^>]*aria-label="Next month"/);
  const unavailable = html.match(/<[a-z]+\b[^>]*aria-label="[^"]*October 16[^"]*"[^>]*>/)?.[0];
  assert.ok(unavailable, html);
  assert.match(unavailable, /aria-disabled="true"/);
});

// The CDS locale reaches react-aria through the two official wrappers `nu` (over `lu`) and `Co` (over `wo`,
// `Co.Range=xo`): each reads `ee()` (shared-frame `kd`) and renders the react-aria locale provider `sn`. The date
// input's popover renders `Co` (`r(Co,{autoFocus:!0,"aria-label":sn,…})`), so the month grid is checked through `Co`;
// `wo` alone, outside a provider, follows react-aria's default locale exactly as in the official module.
test('the CDS locale reaches the date segments and month labels (zh-CN)', () => {
  const original = fs.readFileSync(path.join(OFFICIAL, SOURCE), 'utf8');
  for (const feature of ['function Co(e){let $=J9(5),t=ee(),n=J1($,0,e)?K1($,0,e,r(wo,{...e})):$[1];return J2($,2,t,n)?K2($,2,t,n,r(sn,{locale:t,children:n})):$[4]}Co.Range=xo;',
    'r(Co,{autoFocus:!0,"aria-label":sn,'])
    assert.equal(original.split(feature).length - 1, 1, feature);
  const input = render(calendar.nu, { value: '2026-10-15', 'aria-label': '开始日期' }, 'zh-CN');
  assert.match(input, /aria-label="年[^"]*"/);
  assert.match(input, /aria-label="月[^"]*"/);
  const month = render(calendar.Co, { value: '2026-10-15', 'aria-label': '开始日期' }, 'zh-CN');
  assert.match(month, /2026年10月/);
  assert.match(month, /已选|选定/);
});

test('manifest: the calendar module is the 3.6556.2 slice, and the official chunk carries the roots the tests use', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/generated/cowork-scheduled/manifest.json'), 'utf8'));
  assert.equal(manifest.referenceVersion, '3.6556.2');
  const entry = manifest.modules.find(module => module.target === path.basename(TARGET));
  assert.equal(entry.source, SOURCE);
  assert.equal(entry.referenceVersion, '3.6556.2');
  const original = fs.readFileSync(path.join(OFFICIAL, SOURCE), 'utf8');
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'), entry.sourceSha256);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, TARGET))).digest('hex'), entry.sha256);
  for (const name of ['wo', 'lu', 'nu', '$a', 'Q']) assert.ok(entry.bindings.some(binding => binding.name === name), name);
  for (const feature of ['export{nu as t}', '"data-cds":"Calendar"', '"data-cds":"DateInput"', 'C("previousMonth","Previous month")',
    'C("nextMonth","Next month")', 'role:"columnheader"', 'function $a(e){if(e)try{return gt(e)}catch{return}}', 'function Q(e){return e.toString()}'])
    assert.ok(original.includes(feature), feature);
  // c8ff922bb (the 2.2553.1 month grid module) is gone from 3.6556.2.
  assert.equal(fs.readdirSync(OFFICIAL).some(name => name.startsWith('c8ff922bb-')), false);
});
