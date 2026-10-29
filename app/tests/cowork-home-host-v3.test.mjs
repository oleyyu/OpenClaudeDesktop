import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w10-curchat-home-host (CC-02 / CC-03 / CC-05 / CC-06 / CC-07 host parts): the host home, home column, greeting and
// Cowork progress panel render the 3.6556.2 slices (src/generated/cowork-home, src/generated/cowork-progress) instead of
// the 2.31226.0 current-chat slice. Source only: file text and SSR in local states; no browser, no network.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(v1, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const hostFiles = ['src/source-cowork-home.jsx', 'src/source-surfaces.jsx', 'src/source-surfaces.css'];

globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {} }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
  querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null, hasAttribute: () => false } };
globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), localStorage: { getItem: () => null, setItem() {} },
  location: { pathname: '/', search: '', hash: '', href: 'app://local/' }, history: { state: null, replaceState() {} } };

// The activity panel's Claude in Chrome section (c21f11e6d $y) reads a store through useSyncExternalStore without
// getServerSnapshot (the official app is client-rendered); SSR takes the client snapshot as the server one.
{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, home, surfaces, v3;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  home = await server.ssrLoadModule('/src/source-cowork-home.jsx');
  surfaces = await server.ssrLoadModule('/src/source-surfaces.jsx');
  v3 = await server.ssrLoadModule('/src/source-cowork-home-v3-adapters.jsx');
  // The lazy Ideas split (shared-23 jS): once loaded the official entry renders synchronously.
  await v3.preloadHomeIdeas();
});
after(() => server?.close());

const call = async () => [];
const renderHome = (sessions = [], metadata = {}, state = {}) => renderToStaticMarkup(h(home.SourceCoworkHome, {
  call, sessions, metadata, state, ready: true, onOpen() {}, onOpenRoutine() {}, onClearActive: async () => {},
  onPrompt() {}, onPreviewPrompt() {}, onFocusInput() {} }));

test('the host files no longer import the 2.31226.0 current-chat slice', () => {
  for (const file of hostFiles) assert.doesNotMatch(local(file), /generated\/current-chat\//, file);
  assert.match(local('src/source-cowork-home.jsx'), /from '\.\/generated\/cowork-home\/index\.mjs'/);
  assert.match(local('src/source-surfaces.jsx'), /from '\.\/generated\/cowork-progress\/index\.mjs'/);
  // w10-cleanup-final: the 2.31226.0 home / Ideas adapters (source-home-adapters.jsx, source-ideas-adapters.jsx) had no
  // source importer after w10-curchat-retire and were deleted, with their status-glyph and catalog-loader tests.
  for (const file of ['src/source-home-adapters.jsx', 'src/source-ideas-adapters.jsx']) assert.equal(fs.existsSync(path.join(app, file)), false, file);
});

test('no Cowork sessions: the 3.6556.2 FS home shows the standalone Ideas (control arm) in the below-composer slot', () => {
  const html = renderHome();
  assert.match(html, /^<div class="surface-cowork-home mx-auto w-full max-w-2xl dock:order-2 dock:flex dock:flex-col" role="region" aria-label="Cowork tasks" aria-busy="false">/);
  // shared-19 Ne (voyage_composer_marlin off: max-w-2xl) and shared-5 oC("top") = QS, the official slot classes; the home
  // composer card (Ti = p("isolate", Ne, …)) takes the same width.
  assert.ok(official('shared-19-DIKJVT7c.js').includes('Ne=z??(ke?"mx-auto w-full max-w-[40rem]":"mx-auto w-full max-w-2xl")'));
  assert.ok(official('shared-19-DIKJVT7c.js').includes('p("isolate",Ne,W,wi)'));
  assert.match(local('src/source-surfaces.css'), /:not\(\[data-surface="code"\]\) \.composer-zone \{\n  width: 100%; max-width: 42rem;/);
  assert.ok(official('shared-5-Bg6ZMqvt.js').includes('function oC(e){return e==="center"?"":QS}'));
  assert.ok(official('shared-5-Bg6ZMqvt.js').includes('QS="dock:order-2 dock:flex dock:flex-col"'));
  assert.match(text(html), /Ideas for you/);
  assert.match(text(html), /Send me a daily briefing/);
  assert.match(text(html), /Organize my inbox/);
  assert.match(text(html), /Customize Cowork for me/);
  assert.match(html, /py-2 ps-5 pe-2/);
  // The 2.31226.0 host shortlist (localIdeaIds over the old catalog) is gone from the home.
  assert.doesNotMatch(text(html), /Find themes in my messy files|Active|Clear active/);
  // 2.31226.0 GF / xI class strings the 3.6556.2 home no longer has (research §0.1).
  assert.doesNotMatch(html, /group relative flex w-full items-center gap-4 rounded-lg text-left/);
});

test('local Cowork sessions: the 3.6556.2 task list rows, Clear active and session routes', () => {
  const now = Math.floor(Date.now() / 1000);
  const sessions = [{ id: 'task-1', name: 'Sort the receipts', updatedAt: now - 120 }, { id: 'task 2', name: 'Draft the memo', updatedAt: now - 600 },
    { id: 'code-1', name: 'Code thread', updatedAt: now }];
  const metadata = { 'task-1': { surface: 'cowork' }, 'task 2': { surface: 'cowork', unread: true } };
  const html = renderHome(sessions, metadata, { active: { 'task-1': 'turn' } });
  assert.match(html, /w-full max-w-2xl mt-4 space-y-8/);
  // FS: no "max-w-none px-2" with shared-78 Fy (voyage_composer_marlin) off.
  assert.doesNotMatch(html, /max-w-none px-2/);
  assert.match(text(html), /Active/);
  assert.match(text(html), /Clear active/);
  assert.match(text(html), /Sort the receipts/);
  assert.match(text(html), /Draft the memo/);
  assert.doesNotMatch(text(html), /Code thread|Ideas for you/);
  assert.match(html, /href="\/cowork\/task-1"/);
  // shared-46 Jb links `/cowork/${id}` without encoding (official); the host route reads it back either way.
  assert.match(html, /href="\/cowork\/task 2"/);
  assert.doesNotMatch(html, /text-xs text-muted hover:text-secondary transition-colors|invisible text-muted group-hover:visible/);
});

test('a collapsed sidebar adds the pinned tasks (shared-23 SS u = !Mo() || ea(), shared-52 l_)', () => {
  // W10 review fix: main.jsx passes the frame's collapsed state (shared-52 l_: collapsed || isCuDocked ||
  // isNarrowViewport; a popout has no sidebar) so SS lists starred rows only while the sidebar is not showing them.
  const now = Math.floor(Date.now() / 1000);
  const sessions = [{ id: 'pinned-1', name: 'Pinned quarterly plan', updatedAt: now - 86400 * 30 }];
  const metadata = { 'pinned-1': { surface: 'cowork', pinned: true } };
  const render = sidebarCollapsed => text(renderToStaticMarkup(h(home.SourceCoworkHome, { call, sessions, metadata, state: {}, ready: true,
    sidebarCollapsed, onOpen() {}, onOpenRoutine() {}, onClearActive: async () => {}, onPrompt() {}, onPreviewPrompt() {}, onFocusInput() {} })));
  assert.doesNotMatch(render(false), /Pinned quarterly plan/);
  assert.match(render(true), /Pinned quarterly plan/);
  assert.match(local('src/main.jsx'), /<SourceCoworkHome call=\{call\}[^>]*?\n\s*sidebarCollapsed=\{NO_SIDEBAR \|\| collapsed \|\| narrowViewport\}/);
});

test('generated RouterLink targets reach the host: sessions open, scheduled tasks open their routine', () => {
  const opened = [], routines = [];
  const host = { onOpen: id => opened.push(id), onOpenRoutine: id => routines.push(id) };
  home.coworkHomeRoute('/cowork/task 2', host);
  home.coworkHomeRoute('/cowork/100%', host);
  home.coworkHomeRoute('/scheduled-task/review%20%2F%20%E6%AF%8F%E5%91%A8', host);
  home.coworkHomeRoute('/elsewhere', host);
  assert.deepEqual(opened, ['task 2', '100%']);
  assert.deepEqual(routines, ['review / 每周']);
  // Clear active (SS -> clearHomeActive) dispatches the event the host listens for.
  assert.equal(v3.HOME_V3_CLEAR_EVENT, 'local-cowork:clear-active');
  assert.match(local('src/source-cowork-home.jsx'), /window\.addEventListener\(HOME_V3_CLEAR_EVENT, clear\)/);
});

test('home column and greeting take the 3.6556.2 new-page classes', () => {
  const column = renderToStaticMarkup(h(surfaces.SourceSurfaceHome, { active: true }, h('i')));
  assert.match(column, /^<(main|div) class="mx-auto mt-4 w-full flex-1 px-md md:px-8 lg:mt-6 max-w-7xl surface-home-column relative flex flex-col items-center gap-6 max-sm:!px-1 md:px-14 /);
  // nS.classic column offset (Px), the official default layout (w11-sweep-curchat; "home" is the new_page_home gate arm).
  assert.match(column, /pt-\[calc\(var\(--prerender-activation-viewport-height,100vh\)\*0\.1\)\] md:pt-\[calc\(var\(--prerender-activation-viewport-height,100vh\)\*0\.25\)\]/);
  assert.doesNotMatch(column, /0\.28\+0\.56875rem/);
  const s2 = official('shared-2-TF8v67kg.js');
  assert.ok(s2.includes('var j1=["classic","home"],M1="classic",N1="new-page-layout-latch"') && s2.includes('M1 as nr'));
  assert.ok(official('shared-23-BZ6ZY5fu.js').includes('nr as zl,') && official('shared-23-BZ6ZY5fu.js').includes('r=n===void 0?zl:n'));
  assert.ok(official('shared-3-BCEbd8Fv.js').includes('{flag:"__gb__1085985672",label:"new_page_home"'));
  assert.match(local('src/source-surfaces.jsx'), /const homeVariant = homeLayout\('classic'\);/);
  assert.match(column, /!mt-\[calc\(-1\*min\(var\(--organization-banner-column-height/);
  assert.match(column, /dock:h-auto dock:min-h-\[calc\(100%\+min/);
  assert.equal(surfaces.homeScrollClass, 'min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]');
  assert.ok(official('shared-23-BZ6ZY5fu.js').includes('className:"min-h-0 flex-1 overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable_both-edges]"'));
  assert.equal(renderToStaticMarkup(h(surfaces.SourceSurfaceHome, { active: false }, h('i'))), '<i></i>');
  const greeting = renderToStaticMarkup(h(surfaces.SourceSurfaceGreeting, { name: 'Ada' }));
  // nS.classic: greetingSlotClass "my-3 w-full", seat "center" (shared-5 aC → iC), lockup "inline".
  assert.match(greeting, /^<header class="surface-greeting my-3 w-full dock:mt-0 dock:mb-0 dock:pt-\[max\(0px,calc\(var\(--app-visual-viewport-height,100dvh\)\*0\.5_-_/);
  assert.match(greeting, /data-new-page-greeting-spark=""/);
  assert.match(greeting, /data-new-page-greeting-text=""/);
  // The inline lockup (shared-19 eS("inline") / tS): the display face, not the compact serif.
  // SSR has no clock yet (Dy `l === null`): the empty text keeps the lockup invisible, as the Chat greeting does.
  assert.match(greeting, /class="text-primary text-balance text-center font-display max-sm:px-\[0\.96em\] invisible"/);
  assert.doesNotMatch(greeting, /font-ui-serif font-\[360\]/);
  // w13-close-cowork-ui (chatui-home-01): the Cowork greeting is shared-23 Fy → Dy, the one new-page greeting call site
  // for both tabs, whose table lookup is the "chat" surface only; 3.6556.2 has no `{name} returns!`.
  assert.doesNotMatch(text(greeting), /returns!|Ada/);
  const s23 = official('shared-23-BZ6ZY5fu.js');
  assert.equal(s23.split('c(Fy,{incognitoModeEnabled:u,planBadge:null,layout:e.greetingLockup})').length, 2);
  assert.ok(s23.includes('coworkTabLoadReportedRef:g}=e'));
  assert.equal((s23.match(/dy\([^)]*,"cowork"/g) ?? []).length, 0);
  assert.match(s23, /dy\(i\.personalized_greeting,"chat",l\)/);
  assert.match(local('src/source-surfaces.jsx'), /export function SourceSurfaceGreeting\(\) \{\n  return <SourceChatGreeting \/>;\n\}/);
  assert.doesNotMatch(local('src/source-surfaces.jsx'), /t\('\{name\} returns!'/);
});

const plan = [{ step: 'Read the receipts', status: 'completed' }, { step: 'Total them', status: 'inProgress' }];
const renderProgress = props => renderToStaticMarkup(h(surfaces.SourceCoworkProgress, { sessionId: 's1', running: true, scheduledTasks: [],
  onOpenFile() {}, ...props }));

// w13-coworkui-panel (cwui-10 / cwui-12): the panel is the 3.6556.2 shell c21f11e6d AT in its docked arm — aria-label
// "Session activity panel" (Rv63mdeh9J), the card layout (cc5a62f6f S) merged into one dframe-card Panel, sections in
// AT order. tests/w13-cowork-panel.test.mjs covers the order, conditions and official text.
test('progress panel: 3.6556.2 Progress, Outputs and Context sections in the docked card panel, official row classes', () => {
  const html = renderProgress({ plan, items: [{ type: 'fileChange', status: 'completed', changes: [{ path: '/w/out/total.csv', kind: { type: 'add' } }] }], cwd: '/w/out' });
  assert.match(html, /^<aside data-activity-peek-zone="" class="cds-root h-full flex-shrink-0 relative z-20" data-density="comfortable" style="width:20rem" aria-label="Session activity panel">/);
  assert.doesNotMatch(html, /aria-label="Task details"/);
  assert.match(text(html), /Progress/);
  assert.match(text(html), /Read the receipts/);
  // xT titles a single selected folder with its name (AT si = Tn(oe[0])); then TT "Context".
  assert.match(text(html), /\bout\b/);
  assert.match(text(html), /Context/);
  assert.equal((html.match(/data-section-header/g) ?? []).length, 3);
  // Card layout headers (cc5a62f6f L: flat false → "p-3"), not the flat "px-4 pt-4 pb-3".
  assert.match(html, /data-section-header="" class="group\/section-header can-focus w-full flex items-center justify-between text-start select-none draggable-none p-3"/);
  assert.doesNotMatch(html, /px-4 pt-4 pb-3/);
  assert.doesNotMatch(html, /aria-label="Comment on this item"/);
});

test('progress panel without todos or outputs: the 3.6556.2 empty states and illustrations', () => {
  // No working folder: xT shows yT (with the session-artifacts art) under the "Working folder" title; TT its empty copy.
  const html = renderProgress({ plan: [], items: [] });
  assert.match(text(html), /Working folder/);
  assert.match(text(html), /Track tools and referenced files used in this task\./);
  assert.match(html, /url\(\.\/images\/illustrations\/session-context/);
  assert.match(html, /text-muted-as-secondary font-small/);
});

test('the generated Ideas catalog is the 3.6556.2 one', async () => {
  const { o: catalog } = await server.ssrLoadModule('/src/generated/cowork-home/c2bf50d9e-TDPQZp_M.mjs');
  assert.ok(Array.isArray(catalog.pool) && catalog.pool.length > 0);
  assert.ok(official('c2bf50d9e-TDPQZp_M.js').includes('export{o as COWORK_HOME_IDEAS_CATALOG}'));
  // 2.31226.0 prompt the 3.6556.2 catalog rewrote (research CC-03).
  assert.doesNotMatch(local('src/generated/cowork-home/c2bf50d9e-TDPQZp_M.mjs'), /Look through a folder I point you to — notes, transcripts, journal ent/);
});

// w13-close-cowork-ui (coworkui-panel-04 / -06): AT's onRevealStep / canRevealStep come from main.jsx, over the
// transcript rows' data-transcript-item-id; the Progress todos memo keeps one empty list for a plan without steps.
test('panel: Context rows reveal their step in the transcript (AT onRevealStep / canRevealStep from the host)', () => {
  globalThis.CSS ??= { escape: value => String(value).replace(/["\\]/g, '\\$&') };
  const at = official('c21f11e6d-Cyd8_HO8.js');
  assert.ok(at.includes('onRevealStep:F,canRevealStep:I,'));
  assert.ok(at.includes('Bt=A(()=>F&&(e=>{F(e),Rt()}),[F,Rt])'));
  const rows = new Map();
  const row = id => ({ id, scrolled: null, focused: null, attrs: {}, hasAttribute(name) { return name in this.attrs; },
    setAttribute(name, value) { this.attrs[name] = value; }, scrollIntoView(options) { this.scrolled = options; }, focus(options) { this.focused = options; } });
  rows.set('item-1', row('item-1'));
  rows.set('a:b', row('a:b'));
  const root = { querySelector: selector => rows.get(/data-transcript-item-id="([^"]*)"/.exec(selector)?.[1]) ?? null };
  assert.equal(surfaces.coworkStepRow(root, 'item-1').id, 'item-1');
  // A memory file row's step is `<item id>:<path>` (cowork-context-model.mjs).
  assert.equal(surfaces.coworkStepRow(root, 'item-1:/Users/x/memory/notes.md').id, 'item-1');
  assert.equal(surfaces.coworkStepRow(root, 'a:b').id, 'a:b');
  assert.equal(surfaces.coworkStepRow(root, 'missing'), null);
  assert.equal(surfaces.coworkStepRow(null, 'item-1'), null);
  assert.equal(surfaces.revealCoworkStep(root, 'missing'), false);
  assert.equal(surfaces.revealCoworkStep(root, 'item-1'), true);
  assert.deepEqual(rows.get('item-1').scrolled, { block: 'start' });
  assert.deepEqual(rows.get('item-1').focused, { preventScroll: true });
  assert.equal(rows.get('item-1').attrs.tabindex, '-1');
  const main = local('src/main.jsx');
  assert.match(main, /<SourceCoworkProgress key=\{current\}[\s\S]{0,600}canRevealStep=\{id => !!coworkStepRow\(scope\(\), id\)\} onRevealStep=\{id => \{ transcriptRef\.current\?\.release\?\.\(\); revealCoworkStep\(scope\(\), id\); \}\}/);
  // panel-06: one stable empty list for a plan that is neither an array nor { plan: [...] }.
  assert.match(local('src/source-surfaces.jsx'), /const steps = Array\.isArray\(plan\) \? plan : plan\?\.plan \?\? NO_STEPS;/);
});
