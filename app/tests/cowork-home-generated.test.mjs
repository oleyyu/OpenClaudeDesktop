import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { extractCoworkHome } from '../scripts/extract-cowork-home.mjs';
import { looseFeature } from '../scripts/official-3.6556.2.mjs';

// w10-curchat-home-gen: the 3.6556.2 Cowork / Chat home pieces (scripts/extract-cowork-home.mjs: shared-23 FS / xS / SS /
// My / rS / _b, ce266b9be Re, c2bf50d9e o, shared-19 / shared-5 layout) over src/source-cowork-home-v3-adapters.jsx.
// Source only: generator check, official text features, SSR of the generated home in local states.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

let server, gen, adapters, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  gen = await server.ssrLoadModule('/src/generated/cowork-home/index.mjs');
  adapters = await server.ssrLoadModule('/src/source-cowork-home-v3-adapters.jsx');
  // The lazy Ideas split (shared-23 jS): preload the generated ce266b9be module, so the entry renders it synchronously
  // (as the official entry does once loaded).
  await adapters.preloadHomeIdeas();
});
after(() => server?.close());

const home = (value, element) => h(adapters.CoworkHomeV3Context.Provider, { value: { surface: 'cowork', rows: [], readState: { initializedAt: 0, sessions: {} },
  ready: true, attentionIds: new Set(), permissions: new Map(), scheduledTasks: [], sidebarCollapsed: false, ideas: null, ...value } }, element);
const now = Date.now();
const session = (patch = {}) => ({ sessionId: 's1', title: 'Sort the receipts', isRunning: true, isStarred: false, lastActivityAt: now - 120000, createdAt: now - 600000, ...patch });

test('generator output matches the 3.6556.2 slice (check mode) and records the snapshot', async () => {
  const manifest = await extractCoworkHome({ check: true });
  assert.equal(manifest.referenceVersion, '3.6556.2');
  assert.equal(manifest.referenceSnapshot, 'snapshots/claude-3.6556.2-20261025-192807');
  const onDisk = JSON.parse(local('src/generated/cowork-home/manifest.json'));
  assert.deepEqual(onDisk.publicNames, manifest.publicNames);
  for (const mod of onDisk.modules) {
    assert.equal(mod.referenceVersion, '3.6556.2');
    assert.match(mod.sourceSha256, /^[0-9a-f]{64}$/);
    assert.match(mod.sha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(manifest.publicNames.CoworkHome.local, 'FS');
  assert.equal(manifest.publicNames.ChorusCoworkSuggestions.file, 'ce266b9be-B5g-KDni.js');
  assert.equal(manifest.publicNames.HomeColumn.linked, 'cowork-scheduled/shared-18-D3y8YMFN.mjs');
});

test('no binding a linked graph holds is re-sliced: one router store (code-routines shared-25 G / Ku)', () => {
  const held = dir => new Set(JSON.parse(local(`src/generated/${dir}/manifest.json`)).modules.flatMap(m => m.bindings.map(b => `${m.source}#${b.name}`)));
  const own = held('cowork-home');
  // w11-sweep-curchat: mcp-app-card too (shared-78 Cv, imported under its export name zS).
  for (const dir of ['routines-shared', 'cowork-scheduled', 'code-routines', 'mcp-app-card']) {
    const twice = [...held(dir)].filter(key => own.has(key));
    assert.deepEqual(twice, [], `cowork-home re-slices bindings ${dir} holds`);
  }
  const s25 = local('src/generated/cowork-home/shared-25-DOWZRSlq.mjs');
  assert.ok(s25.includes('import { G } from "../code-routines/shared-25-DOWZRSlq.mjs";'));
  assert.ok(!/^var Ku\b/m.test(s25) && !/^var G\b/m.test(s25));
  assert.ok(local('src/generated/cowork-home/shared-182-BI1KJccu.mjs').includes('import { tJ as ta } from "../code-routines/shared-52-uHFNjl7C.mjs";'));
  const s78 = local('src/generated/cowork-home/shared-78-D5Fw2h0a.mjs');
  assert.ok(s78.includes('import { zS as Cv } from "../mcp-app-card/shared-78.mjs";') && !/^function Cv\b/m.test(s78));
  assert.match(local('src/generated/mcp-app-card/shared-78.mjs'), /\bCv as zS\b/);
});

test('official 3.6556.2 roots carry the features the slice follows', () => {
  const s23 = official('shared-23-BZ6ZY5fu.js');
  assert.ok(s23.includes('id:"chorus_cowork_suggestions"'));
  assert.ok(s23.includes('pick:e=>e.ChorusCoworkSuggestions'));
  assert.ok(s23.includes('defaultMessage:"{date} at {time}"'));
  assert.match(s23, looseFeature('e==="cowork"?{setupCard:"task_new",taskList:!0}'));
  assert.match(official('ce266b9be-B5g-KDni.js'), /export\{Re as ChorusCoworkSuggestions\}/);
  assert.match(official('c2bf50d9e-TDPQZp_M.js'), /export\{o as COWORK_HOME_IDEAS_CATALOG\}/);
  // The generated home follows them.
  const out = local('src/generated/cowork-home/shared-23-BZ6ZY5fu.mjs');
  assert.ok(out.includes('setupCard: "task_new", taskList: !0'));
  assert.ok(out.includes('"{date} at {time}"'));
  assert.ok(out.includes('ChorusCoworkSuggestionsEntry as jS'));
  assert.ok(!/generated\/current-chat\//.test(out));
});

test('layout table, banner offset, dock height and greeting seat are the 3.6556.2 values', () => {
  assert.equal(gen.homeLayout('home').greetingLockup, 'compact');
  assert.equal(gen.homeLayout('home').greetingPhoneSeat, 'top');
  assert.equal(gen.homeLayout('classic').greetingPhoneSeat, 'center');
  assert.match(gen.homeLayout('home').columnTopOffsetClass, /md:pt-\[max\(var\(--prerender-activation-viewport-height,100vh\)\*0\.28\+0\.56875rem,12rem\)\]/);
  assert.equal(gen.homeLayout('home').greetingSlotClass, 'mt-3 w-full');
  assert.match(gen.homeBannerOffsetClass, /^!mt-\[calc\(-1\*min\(var\(--organization-banner-column-height/);
  assert.match(gen.homeDockHeightClass, /^dock:h-auto dock:min-h-\[calc\(100%\+min/);
  assert.match(gen.homeGreetingSeatClass('center'), /^dock:mt-0 dock:mb-0 dock:pt-\[max\(0px/);
  assert.equal(gen.homeGreetingSeatClass('top'), '');
  assert.equal(gen.homeColumnClass, 'relative flex flex-col items-center gap-6 max-sm:!px-1 md:px-14');
  assert.equal(gen.homeScrollClass, 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]');
  assert.deepEqual(gen.homeSurfaceSlots('cowork'), { setupCard: 'task_new', taskList: true });
});

test('greeting renders the 3.6556.2 lockup with the spark seat and text', () => {
  const html = renderToStaticMarkup(h(gen.HomeGreeting, { text: 'You’re here!', layout: 'compact' }));
  assert.match(html, /data-new-page-greeting-spark=""/);
  assert.match(html, /data-new-page-greeting-text=""/);
  assert.match(html, /font-ui-serif font-\[360\]/);
  assert.match(text(html), /You’re here!/);
});

// w12 viewtabs-cont (D1): the greeting's spark is shared-frame ZO itself (the stateful CDS Spark: Jg when idle, YO with
// the sprite strips of cf2613ee5 loaded through qO otherwise). working-line already holds ZO / YO / qO and emits
// cf2613ee5 under its own name, so cowork-home imports ZO from there; the host stand-in (HomeGreetingSpark over
// SourceSpark) is gone.
test('greeting spark: My renders the official stateful ZO from working-line (idle Jg, animated YO strips)', async () => {
  const frame = official('shared-frame-6jtSkIit.js');
  const color = frame.match(/(?<![\w$])Kg="([^"]+)"/)[1], d = frame.match(/(?<![\w$])Gg="([^"]+)"/)[1];
  assert.ok(frame.includes('typeof r.size=="string"?t:Q("shrink-0",t)'), 'ZO keeps the caller class for a string size');
  assert.ok(frame.includes('i===void 0||i==="idle"?'), 'ZO renders Jg when idle');
  assert.ok(frame.includes('GO??=Br("cds_spark_sprites",()=>n(()=>import("./cf2613ee5-Btwr9m9F.js"),[])).then(e=>(WO=e?.animations,WO))'), 'qO lazy-loads the sprite chunk');
  assert.ok(frame.includes('"data-cds-spark-strip":""'), 'YO renders the sprite strip');
  const shared23 = local('src/generated/cowork-home/shared-23-BZ6ZY5fu.mjs');
  assert.match(shared23, /^import \{ ZO as W \} from "\.\.\/working-line\/shared-frame\.mjs";$/m);
  assert.ok(!shared23.includes('HomeGreetingSpark'));
  const manifest = JSON.parse(local('src/generated/cowork-home/manifest.json'));
  assert.ok(!manifest.adapters.some(a => a.original === 'shared-frame-6jtSkIit.js#ZO'), 'ZO is no host adapter');
  const host = local('src/source-cowork-home-v3-adapters.jsx');
  assert.ok(!/HomeGreetingSpark|SourceSpark/.test(host), 'no host spark stand-in');
  assert.equal(adapters.HomeGreetingSpark, undefined);
  const wl = await server.ssrLoadModule('/src/generated/working-line/shared-frame.mjs');
  const vt = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
  const html = renderToStaticMarkup(h(wl.ZO, { size: '100%', className: 'block' }));
  assert.equal(html, `<svg data-cds="Spark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" class="block" fill="${color}" aria-hidden="true"><path d="${d}"></path></svg>`);
  assert.equal(html, renderToStaticMarkup(h(vt.CdsSpark, { size: '100%', className: 'block' })));
  const sized = renderToStaticMarkup(h(wl.ZO, { size: 24, className: 'block' }));
  assert.match(sized, /class="h-\[var\(--cds-spark-size\)\] w-\[var\(--cds-spark-size\)\] shrink-0 block"/);
  // Before the sprites load, YO draws the idle Jg; once qO resolved, it draws the official strip span.
  assert.equal(renderToStaticMarkup(h(wl.ZO, { size: 24, state: 'thinking', className: 'block' })), sized);
  const sprites = await server.ssrLoadModule('/src/generated/working-line/cf2613ee5-Btwr9m9F.js');
  // qO is module-private; ZO's loader is reached through YO's effect in the app. Here the strip table is the generated
  // official one, and YO reads it by state name.
  assert.ok(sprites.animations.thinking.svg.startsWith('<svg viewBox="0 0 100 900">'));
  assert.equal(typeof sprites.animations.thinking.frameCount, 'number');
});

test('no sessions, no scheduled tasks: the home shows the standalone Ideas (emptyFallback) with the control ideas', () => {
  const html = renderToStaticMarkup(home({}, h(gen.CoworkHome)));
  assert.match(text(html), /Ideas for you/);
  assert.match(text(html), /Send me a daily briefing/);
  assert.match(text(html), /Organize my inbox/);
  assert.match(text(html), /Customize Cowork for me/);
  assert.match(html, /py-2 ps-5 pe-2/);
  assert.doesNotMatch(text(html), /Active tasks|Pinned or active|Scheduled/);
});

test('local sessions: the task list renders the 3.6556.2 rows and headings instead of the Ideas', () => {
  const html = renderToStaticMarkup(home({ rows: [session(), session({ sessionId: 's2', title: 'Draft the memo', isRunning: false, isStarred: true })],
    scheduledTasks: [{ id: 'r1', displayName: 'Morning digest', enabled: true, cronExpression: '0 9 * * *', nextRunAt: new Date(now + 36e5).toISOString() }] },
  h(gen.CoworkHome)));
  assert.match(html, /w-full max-w-2xl mt-4 space-y-8/);
  assert.match(text(html), /Active/);
  assert.match(text(html), /Sort the receipts/);
  assert.match(text(html), /Draft the memo/);
  // shared-16 vs (the unified routine copy, held by routines-shared) is off here: the official short heading.
  assert.match(text(html), /Clear active/);
  assert.match(text(html), /Scheduled\W+Morning digest\W+Today at /);
  assert.match(text(html), /Morning digest/);
  assert.match(html, /href="\/cowork\/s1"/);
  assert.match(html, /href="\/scheduled-task\/r1"/);
  assert.doesNotMatch(text(html), /Ideas for you/);
});

test('the setup card has no due card locally and renders nothing visible', () => {
  assert.equal(renderToStaticMarkup(home({}, h(gen.HomeSetupCard, {}))), '');
});
