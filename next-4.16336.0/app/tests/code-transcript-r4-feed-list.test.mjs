// W14-code 第四轮 ct-feed 复核修复【补做】R4T-09（plan-w14-code.md §5 E95：E90 的整块替换照做，标 GUI 验收，保留开关回退）：
//   Code 转写的行经桌面版 Code feed 的列表（c96d752d0 Aat → c4a9ee384 ba = loe：虚拟列表、hold place、feed / article、
//   "Message {position}"、Cat 键盘行导航与 "Load the rest of this message"），在宿主滚动容器里；
//   transcript_hold_place（__gb__4175257006）关 → 回到宿主原样逐行绘制（回退）。
// SSR 用 vite middleware 模式；官方 chunk 只当文本读。
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const app = path.resolve(import.meta.dirname, '..');
const assets = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (prefix) => fs.readFileSync(path.join(assets, fs.readdirSync(assets).find((file) => file.startsWith(prefix) && file.endsWith('.js'))), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, Feed, FeedAdapters, Transcript, Growth;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Feed = await server.ssrLoadModule('/src/source-code-feed.jsx');
  FeedAdapters = await server.ssrLoadModule('/src/source-code-feed-adapters.jsx');
  Transcript = await server.ssrLoadModule('/src/source-transcript.jsx');
  Growth = await server.ssrLoadModule('/src/host-growthbook.mjs');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
  globalThis.window.innerHeight ??= 800;
});
after(() => server?.close());

const ITEMS = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'first question' }] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'First answer' },
  { id: 'u2', type: 'userMessage', turnId: 't2', content: [{ type: 'text', text: 'second question' }] },
  { id: 'm2', type: 'agentMessage', turnId: 't2', text: 'Second answer' },
];
const inFrame = (props = {}) => renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:feed', ready: true, statusRows: true },
  React.createElement(C.SourceCodeTranscript, { sessionId: 'feed', items: ITEMS, ...props })));
const alone = (props = {}) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'feed', items: ITEMS, ...props }));

test('official: Code feed = the shared list Aat, drawn through c4a9ee384 ba (loe) with the hold place rf (Zp → cb264bc23) and Cat', () => {
  const c96 = official('c96d752d0-'), c4a = official('c4a9ee384-'), cf7 = official('cf74bc599-');
  // cf74bc599 uw: the shared list is wanted with the renderer offered and the live text held (c96d752d0 bRe / PH).
  assert.ok(cf7.includes('{offered:T,liveTextHeld:w}'));
  assert.ok(c96.includes('var vRe="code_shared_list",jH="claudeai.codeSharedTranscriptList.off.v1"'));
  // bat: the shared list draws Fat, Fat = M(Aat).
  assert.ok(c96.includes('Fat=M(Aat)'));
  // Aat → loe with the hold place, Cat's keymap / policy and c9 windowing.
  assert.match(c96, /Gt=rf\(\),Kt=_6\(\),qt=loe\(\{items:Z,getKey:l7,renderRow:It,holdPlaceOnWidthChange:Gt,/);
  assert.match(c96, /navigation:zt\.keymap,navigationPolicy:zt\.policy,onFindScroll:zt\.releaseFollow,/);
  assert.match(c96, /windowing:H\?Pat:c9,/);
  // Aat's labels and Cat's load button.
  assert.ok(c96.includes('{defaultMessage:"Message {position}",id:"I6ViGOLib6"}'));
  assert.ok(c96.includes('{defaultMessage:"Load the rest of this message",id:"46PUAXRGs2"}'));
  // Qp: transcript_hold_place, lazily loading cb264bc23 (wild_spring).
  assert.ok(c4a.includes('qp="__gb__4175257006"'));
  assert.ok(c4a.includes('import("./cb264bc23-DxMA33A4.js")'));
  assert.ok(c4a.includes('{defaultMessage:"Message {position} of {count}",id:"aX54Ax1k5D"}'));
});

test('generator: ba / Zp / Cat / c9 / Nat are exported; cb264bc23 and c9f414608 are emitted under their own names', () => {
  const manifest = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  const c4a = manifest.modules.find((m) => m.target === 'c4a9ee384-RLCjceOL.mjs');
  assert.equal(c4a.exports.ba, 'useTranscriptList');
  assert.equal(c4a.exports.Zp, 'useHoldPlaceOnWidthChange');
  const root = manifest.modules.find((m) => m.target === 'code-transcript.mjs');
  assert.equal(root.exports.Cat, 'useFeedKeyboard');
  assert.equal(root.exports.c9, 'FEED_WINDOWING');
  assert.equal(root.exports.Nat, 'feedViewportEstimate');
  for (const name of ['cb264bc23-DxMA33A4.js', 'c9f414608-BplIKcn2.js']) assert.ok(fs.existsSync(path.join(app, 'src/generated/code-transcript', name)), name);
  const text = read('src/generated/code-transcript/c4a9ee384-RLCjceOL.mjs');
  assert.ok(text.includes('import("./cb264bc23-DxMA33A4.js")'));
  assert.ok(text.includes('var qp = "__gb__4175257006";'));
  assert.equal(Growth.hostGrowthBookFlag('__gb__4175257006'), true);
});

test('feed list (SSR): in the host frame the rows are the official feed — role feed, articles "Message N", rows, sizer, spacers', () => {
  const html = inFrame();
  assert.match(html, /data-code-feed=""/);
  assert.match(html, /role="feed"[^>]*aria-label="Chat messages"/);
  assert.match(html, /data-testid="transcript-rows"/);
  assert.match(html, /data-rocksteady-sizer=""/);
  const articles = [...html.matchAll(/role="article"[^>]*>/g)].map((m) => m[0]);
  assert.equal(articles.length, 4, html.slice(0, 2000));
  assert.match(articles[0], /aria-setsize="4"/);
  assert.match(articles[0], /aria-posinset="1"/);
  assert.match(articles[0], /aria-label="Message 1"/);
  assert.match(articles[3], /aria-label="Message 4"/);
  // Cat's keymap is on: the instructions paragraph and the feed's aria-describedby.
  assert.match(html, /Use the up and down arrow keys to move between messages\./);
  // The renderer still draws the turns (the rows' content is unchanged).
  for (const text of ['first question', 'First answer', 'second question', 'Second answer']) assert.ok(html.includes(text), text);
  assert.match(html, /data-transcript-item-id="u1"/);
  assert.match(html, /data-rs-index="0"/);
  assert.equal((html.match(/data-testid="transcript-row"/g) ?? []).length, 4);
});

test('rollback: outside the host frame (no feed host) / not owned / flag off the rows draw in place as before', () => {
  const plain = alone();
  assert.doesNotMatch(plain, /data-code-feed/);
  assert.doesNotMatch(plain, /role="article"/);
  for (const text of ['first question', 'First answer', 'second question', 'Second answer']) assert.ok(plain.includes(text), text);
  const child = inFrame({ ownedSession: false });
  assert.doesNotMatch(child, /data-code-feed/);
  // The same row content in both drawings.
  const rowsOf = (html) => [...html.matchAll(/data-transcript-item-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(rowsOf(inFrame()), rowsOf(plain));
  const src = read('src/source-code-transcript.jsx');
  assert.ok(src.includes('const feedOn = feedHost !== null && ownedSession && hostGrowthBookFlag("__gb__4175257006");'));
});

test('feed rows: lead / failed sends / notices are rows; articles are the entries\' rows; labels follow Aat', () => {
  const html = inFrame({ host: { truncated: true, transcriptNotices: React.createElement('div', { 'data-notice-probe': '' }, 'Sleeping') } });
  assert.match(html, /data-transcript-truncated=""/);
  assert.match(html, /data-notice-probe=""/);
  assert.equal([...html.matchAll(/role="article"/g)].length, 4);
  assert.equal((html.match(/data-testid="transcript-row"/g) ?? []).length, 6);
  const rows = [{ id: 'a', kind: 'user', article: true }, { id: 'h', kind: 'other', article: false }, { id: 'b', kind: 'assistant', article: true }];
  const articles = Feed.feedArticles(rows);
  assert.equal(articles.count, 2);
  assert.deepEqual(articles.of(rows[2]), { key: 'b', part: 'only', posInSet: 2 });
  assert.equal(articles.of(rows[1]), null);
  const labels = Feed.feedLabels({ formatMessage: (message, values) => message.defaultMessage.replace('{position}', values?.position) });
  assert.equal(labels.row(3), 'Message 3');
  assert.equal(labels.feed, 'Chat messages');
  assert.equal(labels.streamingRow, 'Currently streaming message');
});

test('host frame: the list claims the feed rows (host feed nav off), holdAllRows / reveal, feedFollow over the scroller handle', () => {
  const src = read('src/source-transcript.jsx');
  assert.ok(src.includes('enabled: feedClaims === 0,'));
  assert.ok(src.includes('holdAllRows: () => feedClaimsRef.current === 0 || !feedHost.current.holdAll.set(true),'));
  assert.ok(src.includes('if (!target) { feedHost.current.reveal.get()?.(chapter.entryId); return; }'));
  const store = FeedAdapters.createFeedStore(false);
  let seen = 0;
  store.subscribe(() => { seen += 1; });
  assert.equal(store.set(true), true);
  assert.equal(store.set(true), false);
  assert.equal(seen, 1);
  const calls = [];
  const follow = FeedAdapters.feedFollow({ isPinned: () => false, jumpToLatest: () => calls.push('jump'), release: () => calls.push('release') });
  assert.equal(follow.isPinned(), false);
  follow.setPinned(false); follow.setPinned(true); follow.scrollToBottom();
  assert.deepEqual(calls, ['release', 'jump', 'jump']);
  const main = read('src/main.jsx');
  // W14-code r5 R5T-REG-03: the find bar holds every row only while it is open (closed, the hold ends: releaseRows), and a
  // prompt jump releases the hold once it lands (c96d752d0 Aat windows with c9, keeping only held rows).
  assert.ok(main.includes('getScope={() => { if (findBarOpen()) transcriptRef.current?.holdAllRows?.(); else transcriptRef.current?.releaseRows?.();'));
  assert.ok(main.includes('viewport.addEventListener("scrollend", landed);'));
  assert.ok(src.includes('releaseRows: () => { feedHost.current.holdAll.set(false); },'));
  // W14-code r6 R6T-REG-02: the retry keeps its jump's generation (jumpToPromptAt), so a newer jump supersedes it.
  assert.ok(main.includes('if (transcriptRef.current?.holdAllRows?.() === false) { requestAnimationFrame(() => requestAnimationFrame(() => jumpToPromptAt(direction, generation))); return; }'));
});
