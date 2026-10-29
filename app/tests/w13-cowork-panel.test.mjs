import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-coworkui-panel (research/w13-coworkui.md §1.2, cwui-10 / cwui-12 / cwui-25): the host Cowork activity panel
// (src/source-surfaces.jsx SourceCoworkProgress) follows the 3.6556.2 shell c21f11e6d AT — its aria-label, section order
// and conditions, the section-header toggle mode `wi`, the section heights `gt()` and the docked (not header-hosted)
// arm — over the sections the W13 lanes generated; the title-row toggle follows shared-16 Oc. Source only: the official
// chunk text (read, never executed) and SSR in local states. No browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const c21 = official('c21f11e6d-Cyd8_HO8.js');

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

// The official app is client-rendered: some stores call useSyncExternalStore without getServerSnapshot (c21f11e6d $y in
// the Claude in Chrome section). SSR takes the client snapshot as the server one (as tests/cowork-live-generated.test.mjs).
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(h(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, surfaces, i18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  surfaces = await server.ssrLoadModule('/src/source-surfaces.jsx');
});
after(() => server?.close());

const cwd = '/Users/me/Receipts';
const plan = [{ step: 'Read the receipts', status: 'completed' }, { step: 'Total them', status: 'inProgress' }];
const fileItem = { id: 'f1', type: 'fileChange', status: 'completed', changes: [{ path: `${cwd}/total.csv`, kind: { type: 'add' } }] };
const chromeItem = { id: 'c1', type: 'mcpToolCall', server: 'code_desktop', tool: 'chrome_read_page', arguments: {}, status: 'inProgress' };
const cuItem = { id: 'u1', type: 'mcpToolCall', server: 'code_desktop', tool: 'app_click', arguments: { app: 'Finder', element_index: 3 }, status: 'inProgress' };
const render = props => renderToStaticMarkup(h(surfaces.SourceCoworkProgress, { sessionId: 's1', running: true, cwd, scheduledTasks: [],
  onOpenFile() {}, ...props }));
// The section headers in order: each Section header is a [data-section-header] element; its first text is the title.
const headers = html => [...html.matchAll(/data-section-header=""[^>]*>([\s\S]*?)<\/(?:button|div)>/g)].map(m => text(m[1]).split(' ')[0]);
const sectionTitles = html => [...html.matchAll(/<span class="font-medium text-primary[^"]*">([^<]*)<\/span>/g)].map(m => m[1]);

test('official shell text: the aria-label, section order and conditions, wi, gt, the docked arm', () => {
  assert.ok(c21.includes('"aria-label":he.formatMessage({defaultMessage:"Session activity panel",id:"Rv63mdeh9J"})'));
  assert.ok(c21.includes('wi=o?xi<=1?"none":"hover":"always"'));
  assert.ok(c21.includes('gt=(e,t="24rem")=>ht?{shrinkTo:e>0?cT[Math.min(e,cT.length)-1]:void 0}:{maxContentHeight:t}'));
  assert.ok(c21.includes('...gt(e.length,e.length>0?"24rem":"12rem")'));
  assert.ok(c21.includes('aT="20rem"'));
  assert.ok(c21.includes('Gh.Provider,{value:o?ng:Yh'));
  assert.ok(c21.includes('vt=ht?void 0:o?Uh:Se?Qp:Qh'));
  // headerHosted `o` = CM(…): every input that turns it on is a gate that is off here (R15 / E12).
  assert.ok(c21.includes('function CM({hasHeader:e,custom3pBuild:t,eligible:n,treated:r,rowsRuled:i,keptDocked:a}){let o=e&&(n||r),s=e&&i&&!t&&!a;return{headerHosted:o||s,'));
  assert.ok(c21.includes('rP="__gb__615224538"'));
  // The section order inside the Panel ($h).
  const order = ['de&&p(Ew,{scheduledTaskId:de,currentSessionId:J,', 'p(eT,{triggers:U,', 'hi&&p(vT,{todos:e,', 'Bn&&p(ST,{', '!Bn&&gi&&p(xT,{',
    'cr&&o&&p(kb,{', 'cr&&!o&&p(Ab,{', 'p(hb,{hasBrowserActivity:Rr,', 'Vn&&p(bb,{hasComputerUseActivity:Br,', '_i&&p(TT,{', 'iT,yi&&bi&&p(yi,{'];
  const at = order.map(s => c21.indexOf(s));
  assert.ok(at.every(i => i > 0), JSON.stringify(at));
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'AT section order');
  for (const s of ['hi=!m&&(!u||fi||pi)', 'gi=!u||di', '_i=!u||oi', 'Si=u&&xi===0']) assert.ok(c21.includes(s), s);
  // The desktop-frame chrome Qp is shared-16 Nc.
  assert.ok(official('shared-16-ByfgAyLr.js').includes('Nc="dframe-card rounded-lg bg-[var(--df-sidebar-bg,var(--cds-surface-1))] [box-shadow:var(--df-shadow-card,none)]"'));
  // The host copies these choices.
  const host = local('src/source-surfaces.jsx');
  assert.match(host, /const headerHosted = false;/);
  assert.match(host, /const sectionToggles = headerHosted \? 'hover' : 'always'; \/\/ wi/);
  assert.match(host, /aria-label=\{t\('Session activity panel'\)\}/);
  assert.doesNotMatch(host, /Task details|export function coworkOutputs/);
});

test('SSR, an ordinary session: Progress, Outputs (the working folder), Context — card layout, docked chrome', () => {
  const html = render({ plan, items: [fileItem] });
  assert.match(html, /^<aside data-activity-peek-zone="" class="cds-root h-full flex-shrink-0 relative z-20" data-density="comfortable" style="width:20rem" aria-label="Session activity panel">/);
  assert.ok(html.includes('<div class="flex flex-col pe-[var(--df-pane-trailing-gutter,8px)] h-full ps-2 pt-0 pb-2" style="width:20rem">'));
  assert.ok(html.includes('class="overflow-y-auto flex-1 min-h-0 -ms-8 -me-2 ps-8 pe-2 pointer-events-none"'));
  assert.ok(html.includes('class="flex flex-col gap-3 pt-2 pb-4 pointer-events-auto"'));
  // $h with chrome Qp, not shrinking (ht false), the card layout's dividers.
  assert.ok(html.includes('divide-y divide-alpha-1 overflow-hidden shrink-0 dframe-card rounded-lg bg-[var(--df-sidebar-bg,var(--cds-surface-1))] [box-shadow:var(--df-shadow-card,none)]'), html.slice(0, 900));
  assert.deepEqual(sectionTitles(html), ['Progress', 'Receipts', 'Context']);
  // The card layout (cc5a62f6f S, flat false): "p-3" headers with "text-sm" titles, not the flat "px-4 pt-4 pb-3".
  assert.ok(html.includes('font-medium text-primary text-sm'));
  assert.ok(!html.includes('px-4 pt-4 pb-3'));
  // gt(e.length, e.length > 0 ? "24rem" : "12rem") for Progress, gt(ki) = 24rem for Outputs.
  assert.deepEqual([...html.matchAll(/max-height:(\d+rem)/g)].map(m => m[1]), ['24rem', '24rem']);
  assert.ok(!html.includes('Runs') && !html.includes('Upcoming') && !html.includes('Claude in Chrome') && !html.includes('Computer use'));
  assert.ok(text(html).includes('Track tools and referenced files used in this task.'), 'TT empty state');
  // wi "always": the caret is not hover-only.
  assert.ok(!html.includes('group-hover/section-header:opacity-100'));
});

test('SSR, no todos and no outputs: Progress takes gt(0, "12rem"), Outputs shows bT in the folder', () => {
  const html = render({ plan: [], items: [] });
  assert.deepEqual(sectionTitles(html), ['Progress', 'Receipts', 'Context']);
  assert.deepEqual([...html.matchAll(/max-height:(\d+rem)/g)].map(m => m[1]), ['12rem', '24rem']);
  // AT's expansion state: Progress (sn) starts closed until todos arrive, Outputs (mn) until the session has outputs
  // (one folder), Context (gn = !collapseEmptyContext) open.
  assert.deepEqual([...html.matchAll(/aria-expanded="(true|false)"/g)].map(m => m[1]), ['false', 'false', 'true']);
  const none = render({ plan: [], items: [], cwd: undefined });
  assert.deepEqual(sectionTitles(none), ['Progress', 'Working folder', 'Context']);
});

test('SSR, a scheduled-task run: Runs comes first', () => {
  const task = { id: 'task-1', name: 'Morning digest', kind: 'cowork', runs: [
    { id: 'r1', threadId: 's1', status: 'completed', trigger: 'scheduled', startedAt: '2026-10-28T08:00:00Z', finishedAt: '2026-10-28T08:05:00Z' },
    { id: 'r2', threadId: 's0', status: 'completed', trigger: 'manual', startedAt: '2026-10-27T08:00:00Z', finishedAt: '2026-10-27T08:05:00Z' }] };
  const html = render({ plan, items: [fileItem], scheduledTasks: [task] });
  // jw (the Runs section) titles itself with the task name and links the task; it comes before Progress.
  const runs = html.indexOf('<span class="truncate">Morning digest</span>');
  assert.ok(runs > 0 && runs < html.indexOf('>Progress</span>'), html.slice(0, 1600));
  assert.deepEqual(sectionTitles(html), ['Progress', 'Receipts', 'Context']);
  assert.ok(html.includes('aria-label="Open scheduled task"') && html.includes('href="/cowork/s1"'), 'jw task link and run row');
  // An ordinary session in the same task list has no Runs.
  assert.ok(!render({ plan, items: [], sessionId: 'other', scheduledTasks: [task] }).includes('Morning digest'));
});

test('SSR, browser activity: Claude in Chrome sits between Outputs and Context; computer use waits for its gate', () => {
  const html = render({ plan, items: [fileItem, chromeItem, cuItem] });
  const words = text(html);
  assert.deepEqual(sectionTitles(html).filter(s => s !== 'Claude in Chrome'), ['Progress', 'Receipts', 'Context']);
  const chrome = words.indexOf('Claude in Chrome'), outputs = words.indexOf('Receipts'), context = words.lastIndexOf('Context');
  assert.ok(outputs >= 0 && chrome > outputs && context > chrome, words);
  // hb with a Chrome call in flight: its latest action (this host's row title) in place of the working copy.
  assert.ok(words.indexOf('Reading page') > chrome && words.indexOf('Reading page') < context, words);
  const idle = text(render({ plan, items: [fileItem] }));
  assert.ok(!idle.includes('Claude in Chrome'), 'hb renders nothing without browser activity');
  // Vn (shared-78 bR, GrowthBook cowork_computer_use_side_panel_card) is off by default: no Computer use section.
  assert.ok(!words.includes('Computer use'), words);
  const gated = text(render({ plan, items: [fileItem, chromeItem, cuItem], gates: { cowork_computer_use_side_panel_card: true } }));
  const cu = gated.indexOf('Computer use');
  assert.ok(cu > gated.indexOf('Claude in Chrome') && gated.lastIndexOf('Context') > cu, gated);
});

test('zh-CN: the panel label and the title-row toggle are translated', async () => {
  i18n.setLocale('zh-CN');
  try {
    assert.equal(i18n.t('Session activity panel'), '会话活动面板');
    assert.equal(i18n.t('Activity panel'), '活动面板');
    assert.ok(render({ plan, items: [] }).includes('aria-label="会话活动面板"'));
  } finally { i18n.setLocale('en-US'); }
});

test('title-row toggle: shared-16 Oc as KM mounts it (Activity panel, pressed, SidebarRight, "Sidebar" tooltip)', () => {
  const s16 = official('shared-16-ByfgAyLr.js');
  assert.ok(s16.includes('f?m.formatMessage({defaultMessage:"Activity panel",id:"STsdS5DBIF"}):x'));
  assert.ok(s16.includes('m.formatMessage({defaultMessage:"Sidebar",id:"JZy6joR+Wk"})'));
  assert.ok(s16.includes('E=C?"cmd+shift+s":void 0'), 'the shortcut shows only while it is bound');
  assert.ok(official('shared-1-BJhqMmkf.js').includes('function TV(e){let t=p()!=="rtl";return e==="start"===t?"Sidebar":"SidebarRight"}'));
  assert.ok(c21.includes('p($p,{conversationUuid:n,sessionId:t,showActiveState:!0,inTitleRow:!0})'), 'KM');
  const bar = local('src/source-titlebar.jsx');
  // w12c-wiring (coworkui-panel-05): TV("end") follows the document direction, Sidebar under RTL.
  assert.match(bar, /<ToolButton label=\{t\("Activity panel"\)\} icon=\{globalThis\.document\?\.documentElement\?\.dir === "rtl" \? "Sidebar" : "SidebarRight"\}\n\s+className=\{titlebarControlClass\(activityOpen\)\} active=\{activityOpen\} aria-pressed=\{activityOpen\}\n\s+tooltip=\{\{content:t\("Sidebar"\), shortcut:activityShortcut \? "cmd\+shift\+s" : undefined, side:"bottom", automatic:false, open:menuKind \? false : undefined\}\} onClick=\{onToggleActivity\} \/>/);
  assert.doesNotMatch(bar, /label=\{t\("Activity panel"\)\} icon="File"/);
  // w13-close-main-jsx-tests (coworkui-panel-03): main.jsx binds cN's KeyS (shared-6 Sb) and reports it to the titlebar.
  const sb = official('shared-6-sd9jbJqs.js');
  assert.ok(c21.includes('{enabled:h,code:"KeyS",boundStore:um,toggle:m}'), 'cN');
  assert.ok(sb.includes('e.code!==n||!e.shiftKey||e.altKey||(Oo()?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey)&&(e.preventDefault(),e.stopPropagation()'), 'Sb');
  const main = local('src/main.jsx');
  assert.ok(main.includes('const activityKeyBound = mode !== "code" && !!current && section === "new";'));
  assert.ok(main.includes('if (event.repeat || event.defaultPrevented || event.code !== "KeyS" || !event.shiftKey || event.altKey) return;'));
  assert.ok(main.includes('if (!(mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) || !splitActiveRef.current) return;'));
  assert.ok(main.includes('document.addEventListener("keydown", activityKey, true);'));
  assert.ok(main.includes('activityShortcut={activityKeyBound}'));
});
