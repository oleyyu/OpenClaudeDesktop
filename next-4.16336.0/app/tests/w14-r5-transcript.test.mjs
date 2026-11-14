// W14-code 第五轮 transcript 线（plan-w14-code.md §5，E94 回退先修，E95 需用户定的 UI 一律照官方）：
//   R5T-REG-01  官方 feed 列表（c4a9ee384 ba）收到 onEscape（Aat `onEscape: o`）：消息上按 Esc 把焦点交回输入框
//   R5T-REG-02  录屏演示是 watchRecord 用户 item（c96d752d0 DI → JF「Recorded demonstration」），不再是普通气泡
//   R5T-REG-04  「Open plan」打开 Plan 侧窗格（cc43287c9 `Bg = () => Yh("plan")`、`_O = $h ? Bg : void 0`）
//   R5T-REG-03  find bar 关闭、⌘⌥↑/↓ 落位后 holdAll 复位（列表恢复窗口化）
//   R5T-01      Session info：当前会话记录带 sdkMcpServers；shared-25 Ki（DesktopInfo）由宿主 desktopInfo 作答
//   R5T-02      turn_error item 带 apiErrorStatus（c06cf64bb `...(Xn(r) !== void 0 && { apiErrorStatus: Xn(r) })`）
//   R5T-05      En 卡：「{position} of {count}」「Question {n} is unanswered」，主按钮 disabled / 快捷键照官方
//   R5T-03      fork 两行套 e9（TranscriptInsetRow，`data-code-own-row`）
//   gates-r5-05 Code 骨架：导航到别的会话后是 "delayed" hold（cacf551c6 m），之前是 "handoff"
//   R5DC-09     code-transcript 从 working-line 引 x6（S6 读到 Provider 设的那一份）
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { codeTranscriptEntries, rendererDrawsRow, userEntryItems } from '../src/code-transcript-entries.mjs';
import { officialSessionRecords, sessionSdkMcpServers } from '../src/code-transcript-sessions.mjs';
import { desktopSystemInfo } from '../src/code-session-info-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807');
const assets = path.join(snapshot, 'ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const text = (html) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, I18N, Q, States, Adapters;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  States = await server.ssrLoadModule('/src/source-transcript-states.jsx');
  Adapters = await server.ssrLoadModule('/src/source-code-transcript-adapters.jsx');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'r5t', ...props }));
const USER = { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'hi' }] };
const REPLY = { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Done here' };

test('R5T-REG-01: the feed list gets onEscape through the host context (Aat `onEscape: o`; ba Fi calls it on Escape)', () => {
  assert.ok(official('c96d752d0-').includes('onEscape:o,scrollerApi:'));
  const ba = read('src/generated/code-transcript/c4a9ee384-RLCjceOL.mjs');
  assert.ok(ba.includes('t && (a?.shouldEscape?.(e) ?? !0) && o?.(e.nativeEvent);'));
  const feed = read('src/source-code-feed.jsx');
  assert.match(feed, /onEscape: host\?\.onEscape \/\* W14-code r5 R5T-REG-01/);
  const host = read('src/source-transcript.jsx');
  // feedHost is made once: the current onFeedEscape is read through a ref.
  assert.ok(host.includes('feedEscapeRef.current = onFeedEscape;'));
  assert.ok(host.includes('onEscape: () => feedEscapeRef.current?.(),'));
  // main.jsx's onFeedEscape focuses the composer.
  assert.ok(read('src/main.jsx').includes('onFeedEscape={() => textarea.current?.focus()}'));
});

const DEMO = { id: 'd1', type: 'userMessage', turnId: 't3', content: [{ type: 'text',
  text: '<watch-record-demonstration durationMs="1200" steps="2" images="0">\n[0.5s] Clicked "Save" in "Notes"\n[0.9s] Typed "x"\n</watch-record-demonstration>' }] };

test('R5T-REG-02: a recorded demonstration is the desktop\'s watchRecord user item, drawn by DI → JF', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('if(ii==="watchRecord"){'));
  assert.ok(c96.includes('"Recorded demonstration"'));
  assert.ok(official('c4d199b75-').includes('case"watchRecord":return"watchRecord"'));
  const items = userEntryItems(DEMO);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { kind: 'watchRecord', id: 'd1:watchRecord', durationMs: 1200, steps: 2, imageCount: 0,
    blocks: [{ type: 'text', text: '[0.5s] Clicked "Save" in "Notes"' }, { type: 'text', text: '[0.9s] Typed "x"' }] });
  assert.equal(rendererDrawsRow(DEMO), true);
  const entries = codeTranscriptEntries([DEMO]);
  assert.equal(entries[0].author, 'user');
  // A plain message keeps its text item.
  assert.deepEqual(userEntryItems(USER), [{ kind: 'text', id: 'u1:text', text: 'hi' }]);
  const shown = text(render({ items: [DEMO] }));
  assert.match(shown, /Recorded demonstration · 2 steps · 1\.2s · 0 images/);
  assert.doesNotMatch(shown, /watch-record-demonstration/);
});

test('R5T-REG-04: Open plan opens the Plan side pane (cc43287c9 Bg / _O → handleOpenPlan), not a transcript scroll', () => {
  const cc4 = official('cc43287c9-');
  assert.ok(cc4.includes('()=>Yh("plan")'));
  assert.ok(cc4.includes('handleOpenPlan:_O'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('const openPlanPane = PANE_WINDOW ? undefined : () => openPaneTile("plan");'));
  assert.equal((main.match(/onOpenPlan=\{openPlanPane\}/g) ?? []).length, 2);
  assert.doesNotMatch(main, /openPlanItem|planItemFor/);
});

test('R5T-REG-03: the row hold ends once the find bar closes and once a prompt jump lands', () => {
  const host = read('src/source-transcript.jsx');
  assert.ok(host.includes('releaseRows: () => { feedHost.current.holdAll.set(false); },'));
  const main = read('src/main.jsx');
  assert.ok(main.includes('getScope={() => { if (findBarOpen()) transcriptRef.current?.holdAllRows?.(); else transcriptRef.current?.releaseRows?.();'));
  assert.ok(main.includes('const findBarOpen = () => !!document.querySelector(\'[role="search"][data-find-provider-scope]\');'));
  // The find bar's root while open (source-find-bar.jsx): role="search" with data-find-provider-scope.
  assert.match(read('src/source-find-bar.jsx'), /role="search" tabIndex=\{-1\} data-find-provider-scope=""/);
  assert.ok(main.includes('if (reduced) requestAnimationFrame(releaseRows);'));
});

test('R5T-01: the open session\'s record carries sdkMcpServers; DesktopInfo is the host\'s', async () => {
  assert.ok(official('c96d752d0-').includes('.sdkMcpServers'));
  const mcp = { threadId: 's1', status: 'ready', rows: [{ name: 'files', kind: 'connected' }, { name: 'plugin:x:y', kind: 'signIn', pluginId: 'x' }, { name: '' }] };
  const servers = [{ name: 'files', status: 'connected', scope: 'user' }, { name: 'plugin:x:y', status: 'needs-auth', scope: 'plugin', pluginId: 'x' }];
  assert.deepEqual(sessionSdkMcpServers(mcp), servers);
  assert.equal(sessionSdkMcpServers({ ...mcp, status: 'loading' }), null);
  const records = officialSessionRecords([{ id: 's1', name: 'One' }, { id: 's2', name: 'Two' }], {}, mcp);
  assert.deepEqual(records[0].sdkMcpServers, servers);
  assert.equal(records[1].sdkMcpServers, undefined);
  assert.equal(officialSessionRecords([{ id: 's1' }], {})[0].sdkMcpServers, undefined);
  // shared-25 Ki → the adapter, read by shared-26 LD (getSystemInfo).
  assert.ok(official('shared-25-').includes('globalThis["claude.settings"]?.DesktopInfo'));
  assert.match(read('src/generated/code-transcript/shared-26-CGuBxVt9.mjs'), /desktopInfo as fe,/);
  assert.doesNotMatch(read('src/generated/code-transcript/shared-25-DOWZRSlq.mjs'), /DesktopInfo/);
  assert.equal(desktopSystemInfo({ platform: 'darwin' }, '0.2.186'), null);
  const info = desktopSystemInfo({ home: '/h', platform: 'darwin', osVersion: '27.2', arch: 'arm64' }, '0.2.186');
  assert.deepEqual(info, { app_version: '0.2.186', os_version: '27.2', os_pretty_name: null, platform: 'darwin', arch: 'arm64' });
  const pending = Adapters.desktopInfo.getSystemInfo();
  Adapters.setDesktopSystemInfo(info);
  assert.deepEqual(await pending, info);
  assert.deepEqual(await Adapters.desktopInfo.getSystemInfo(), info);
  // The boot's host facts (main process init) and main.jsx's feed.
  assert.ok(read('electron/main.cjs').includes('osVersion: process.getSystemVersion?.() ?? os.release(), arch: process.arch'));
  assert.ok(read('src/main.jsx').includes('setDesktopSystemInfo(desktopSystemInfo(boot?.host, clientVersion));'));
  assert.ok(read('src/main.jsx').includes('mcp: boot?.connected ? customizeSnapshot.mcp : null'));
});

test('R5T-02: a turn_error item carries apiErrorStatus when the status is known', () => {
  assert.ok(official('c06cf64bb-').includes('apiErrorStatus:'));
  const items = [USER, REPLY];
  const entries = codeTranscriptEntries(items, { turnErrors: { t1: { message: 'API Error (400): bad', status: 400 } } });
  const error = entries.flatMap((entry) => entry.items).find((item) => item.kind === 'turn_error');
  assert.equal(error.apiErrorStatus, 400);
  const plain = codeTranscriptEntries(items, { turnErrors: { t1: { message: 'boom' } } }).flatMap((entry) => entry.items).find((item) => item.kind === 'turn_error');
  assert.equal('apiErrorStatus' in plain, false);
});

test('R5T-05: the En card speaks the desktop\'s keys; Submit is disabled only while not ready, ⌘⏎ while active', () => {
  const c2f = official('c2f6611a3-');
  assert.ok(c2f.includes('defaultMessage:"{position} of {count}",id:"GW+MSxzG18"'));
  assert.ok(c2f.includes('defaultMessage:"Question {n} is unanswered",id:"FUhtZuza1v"'));
  const card = read('src/source-question-card.jsx');
  assert.ok(card.includes('t("Question {n} is unanswered", { n: firstOpen + 1 })'));
  assert.ok(card.includes('t("{position} of {count}", { position: page + 1, count })'));
  assert.ok(card.includes('disabled={!sending && !ready}'));
  assert.ok(card.includes('shortcut={isActive ? "cmd+enter" : undefined}'));
  assert.doesNotMatch(card, /Question \{number\} is unanswered|"\{current\} of \{total\}"/);
  assert.ok(read('src/source-async-questions.jsx').includes('t("{position} of {count}", { position: at + 1, count: questions.length })'));
  I18N.setLocale?.('zh-CN');
  try {
    assert.equal(I18N.t('Question {n} is unanswered', { n: 2 }), '问题 2 尚未回答');
    assert.equal(I18N.t('{position} of {count}', { position: 1, count: 3 }), '第 1 条，共 3 条');
  } finally { I18N.setLocale?.('en-US'); }
});

test('R5T-03: the fork rows sit in the renderer\'s inset row (i9 `t9(Et, …)` → e9)', () => {
  assert.ok(official('c96d752d0-').includes('function t9(e,t,n){return e?f(e9,{hug:n,children:t}):t}'));
  const src = read('src/source-code-transcript.jsx');
  assert.ok(src.includes('<TranscriptInsetRow><ForkMarkerRow childIds={forkMarkers.get(index)} linked={linked} /></TranscriptInsetRow>'));
  assert.ok(src.includes('<TranscriptInsetRow key="forked-from"><ForkedFromRow sessionId={sessionId} parentSessionId={lineage.forkedFrom} linked={linked} /></TranscriptInsetRow>'));
  const html = render({ items: [USER, REPLY], host: { lineage: { sessions: [{ id: 'r5t', name: 'Child' }, { id: 'p1', name: 'Parent' }], metadata: {}, forkedFrom: 'p1' } } });
  // e9: AssistantMessage (t0) with data-code-own-row, then the inset div and the select-none row around Cet.
  const own = html.indexOf('data-code-own-row'), row = html.indexOf('Forked from');
  assert.ok(own >= 0 && row > own, 'the forked-from row is inside the inset row');
  assert.ok(html.slice(own, row).includes('<div class="ps-[var(--cds-assistant-message-text-inset,0px)]">'));
});

test('gates-r5-05: a Code session opened after a navigation holds its skeleton "delayed" (cacf551c6 m)', () => {
  const cf7 = official('cf74bc599-');
  assert.ok(cf7.includes('()=>r||pa(u)||!nu()'));
  const cac = official('cacf551c6-');
  assert.ok(cac.includes('function m({continuesShown:e,servedFromNetwork:t}){if(e)return f;'));
  const delayed = renderToStaticMarkup(React.createElement(States.SourceTranscriptSkeleton, { holdReason: 'delayed' }));
  assert.match(delayed, /data-cds="SkeletonGroup" data-motion="wave" data-hold="delayed" role="status"/);
  assert.doesNotMatch(delayed, /data-hold-reason|data-shown/);
  assert.match(delayed, /<span class="sr-only" data-skeleton-label="true"><\/span>/);
  const handoff = renderToStaticMarkup(React.createElement(States.SourceTranscriptSkeleton));
  assert.match(handoff, /data-hold="none" data-hold-reason="handoff" data-shown=""/);
  const main = read('src/main.jsx');
  assert.ok(main.includes('<SourceTranscriptSkeleton holdReason={mode === "code" && sessionNavigation.current.navigated ? "delayed" : "handoff"} />'));
  // The reveal: the design system's cds-placeholder-reveal on [data-hold=delayed].
  const css = fs.readdirSync(path.join(app, 'public/assets/v1')).filter((file) => file.startsWith('c6a992d55') && file.endsWith('.css'))
    .map((file) => fs.readFileSync(path.join(app, 'public/assets/v1', file), 'utf8')).join('');
  assert.match(css, /cds-placeholder-reveal \.15s ease-out calc\(var\(--placeholder-reveal-delay,\.5s\)/);
});

test('R5DC-09: the code transcript links working-line\'s x6, so S6 reads the context its Provider sets (one copy, D1)', () => {
  const shared2 = read('src/generated/code-transcript/shared-2-TF8v67kg.mjs');
  assert.match(shared2, /import \{ R6, S3, x6 \} from "\.\.\/working-line\/shared-2\.mjs";/);
  assert.doesNotMatch(shared2, /var x6 = /);
  assert.ok(shared2.includes('u(x6.Provider, { value: !0, children: yt })'));
  assert.match(read('src/generated/working-line/shared-2.mjs'), /var x6 = O\(!1\);[^]*export \{ R6, S3, x6 \};/);
});
