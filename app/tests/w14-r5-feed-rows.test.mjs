// W14-code 第五轮 transcript 复核修复【补做】R5T-04 / gates-r5-04（plan-w14-code.md §5 E95：E90 的整块替换照做，标 GUI
// 验收，保留开关回退）第一步：Aat 的行模型 R7 → d7 → lP。长回复（hit：16 项或 2000px）在渲染器片段就绪后拆成每个渲染项一行
// （GN 的 rendererItem 行，i9 用 e7e 画），Aat 的 article 按 pN 给出 first / middle / last，同一回合共用一个位置，Cat 的
// "Load the rest of this message" 才有行可指。宿主自己的行（lead、host 行、失败发送、尾部通知）照旧作为不透明行。
// transcript_hold_place（__gb__4175257006）关 → 回到宿主原样逐回合绘制（回退）。ooe 滚动器未切（见 r5-transcript.md）。
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


const LONG = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'first question' }] },
  ...Array.from({ length: 20 }, (_, i) => [
    { id: `m${i}`, type: 'agentMessage', turnId: 't1', text: `Step ${i} reply text` },
    { id: `c${i}`, type: 'commandExecution', turnId: 't1', command: `/bin/zsh -lc 'echo ${i}'`, status: 'completed', aggregatedOutput: `out ${i}` },
  ]).flat(),
  { id: 'mz', type: 'agentMessage', turnId: 't1', text: 'Final answer' },
];
const SHORT = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'first question' }] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'First answer' },
];
const inFrame = (items, props = {}) => renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:feed', ready: true, statusRows: true },
  React.createElement(C.SourceCodeTranscript, { sessionId: 'feed', items, ...props })));
const indexes = (html) => [...html.matchAll(/data-rs-index="(\d+)"/g)].map((m) => Number(m[1]));

test('official: d7 builds the rows with lP and the renderer options; GN splits a long reply; i9 draws a part with e7e; Aat names parts', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('rendererFragmentsOf:Ne,rendererFragmentsVersion:Me,rendererPending:M?.pending,rendererEntryCount:N'));
  assert.ok(c96.includes('shouldSplitEntry:hit'));
  assert.ok(c96.includes('Me=w4e(M)'));
  assert.ok(c96.includes('function hit(e){return e.items.length>=G5.items'));
  assert.ok(c96.includes('kind:"rendererItem",id:`${r}\\u203A${l}`'));
  assert.ok(c96.includes('f(e7e,{turnKey:t.turnKey,itemKey:t.itemKey,opensTranscript:Tt})'));
  assert.ok(c96.includes('r=pN(e)?e.isFirst?e.isLast?"only":"first":e.isLast?"last":"middle":"only";return{key:pN(e)?e.turnKey:e.id,part:r,posInSet:n}'));
  assert.ok(c96.includes('function o9(e){return"builtEntryIdx"in e}'));
  assert.ok(c96.includes('{defaultMessage:"Load the rest of this message",id:"46PUAXRGs2"}'));
});

test('generator: lP / hit / w4e / pN / VN are exported from the code transcript root', () => {
  const manifest = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  const root = manifest.modules.find((m) => m.target === 'code-transcript.mjs');
  assert.equal(root.exports.lP, 'buildFeedRows');
  assert.equal(root.exports.hit, 'splitsRendererEntry');
  assert.equal(root.exports.w4e, 'useRendererFragmentsVersion');
  assert.equal(root.exports.pN, 'isEntryPartRow');
  assert.equal(root.exports.VN, 'isArticlelessRow');
});

test('feed (SSR): a long reply is one row per renderer item — one message, parts under it, "Load the rest of this message"', () => {
  const html = inFrame(LONG);
  const articles = [...html.matchAll(/role="article"[^>]*>/g)].map((m) => m[0]);
  // Two messages (the prompt and the reply): the reply's parts share its place.
  for (const article of articles) assert.match(article, /aria-setsize="2"/);
  assert.ok(articles.some((article) => /aria-label="Message 2"/.test(article)));
  assert.doesNotMatch(html, /aria-label="Message 3"/);
  // The rows run well past the two entries (prompt + 41 parts; windowed, so the tail and the reply's first part are mounted).
  assert.ok(Math.max(...indexes(html)) >= 40, indexes(html).join(','));
  assert.match(html, /data-transcript-item-id="m0"/);
  for (const text of ['Step 0 reply text', 'Final answer']) assert.ok(html.includes(text), text);
  assert.ok(html.includes('Load the rest of this message'));
});

test('feed (SSR): a short reply stays one row (no split, no "Load the rest")', () => {
  const html = inFrame(SHORT);
  assert.deepEqual(indexes(html), [0, 1]);
  assert.equal([...html.matchAll(/role="article"/g)].length, 2);
  assert.ok(!html.includes('Load the rest of this message'));
});

test('rollback: outside the feed (flag off / no feed host) the long reply is the whole turn, as before', () => {
  const plain = renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'feed', items: LONG }));
  assert.doesNotMatch(plain, /data-code-feed/);
  assert.doesNotMatch(plain, /data-rs-index/);
  for (const text of ['first question', 'Step 0 reply text', 'Step 19 reply text', 'Final answer']) assert.ok(plain.includes(text), text);
  const src = read('src/source-code-transcript.jsx');
  assert.ok(src.includes('const feedOn = feedHost !== null && ownedSession && hostGrowthBookFlag("__gb__4175257006");'));
  assert.ok(src.includes('entries={entries} rendererEntryCount={baseEntries.length}'));
});

test('feedEntryRows: parts take the turn key and parts, host rows stay opaque, articleless rows and rows without renderPart', () => {
  const drawn = [];
  const hostRows = [
    { id: 'lead', kind: 'other', article: false, itemIds: [], render: () => 'lead' },
    { id: 'u', kind: 'user', article: true, entryIndex: 0, itemIds: ['u'], render: () => 'u' },
    { id: 'host:x', kind: 'other', article: false, itemIds: ['x'], render: () => 'x' },
    { id: 'a', kind: 'assistant', article: true, entryIndex: 1, itemIds: ['a', 'a-row'], render: () => 'a', renderPart: (part) => { drawn.push(part.itemKey); return part.itemKey; } },
    { id: 'n', kind: 'assistant', article: true, entryIndex: 2, itemIds: ['n'], render: () => 'n' },
  ];
  const part = (itemKey, isFirst, isLast) => ({ kind: 'rendererItem', id: `a\u203A${itemKey}`, turnKey: 'a:t', itemKey, builtEntryIdx: 1, entry: {}, isFirst, isLast });
  const built = { rows: [
    { kind: 'truncated', id: 'truncated' },
    { kind: 'user', id: 'u', builtEntryIdx: 0, entry: {} },
    part('k1', true, false), part('k2', false, false), part('k3', false, true),
    { kind: 'assistant', id: 'n', builtEntryIdx: 2, entry: {}, rendererDrawsNothing: true },
  ] };
  const rows = Feed.feedEntryRows(hostRows, built);
  assert.deepEqual(rows.map((row) => row.id), ['lead', 'u', 'host:x', 'a\u203Ak1', 'a\u203Ak2', 'a\u203Ak3', 'n']);
  assert.equal(rows[0], hostRows[0]);
  assert.equal(rows[2], hostRows[2]);
  assert.deepEqual(rows[3].itemIds, ['a', 'a-row']);
  assert.deepEqual(rows[4].itemIds, []);
  assert.equal(rows[5].render(), 'k3');
  assert.deepEqual(drawn, ['k3']);
  // VN: a reply the renderer draws nothing for is no article (still an entry row: kat says it does not trail).
  assert.equal(rows[6].article, false);
  assert.equal(rows[6].entry, true);
  const articles = Feed.feedArticles(rows);
  assert.equal(articles.count, 2);
  assert.deepEqual(articles.of(rows[1]), { key: 'u', part: 'only', posInSet: 1 });
  assert.deepEqual(articles.of(rows[3]), { key: 'a:t', part: 'first', posInSet: 2 });
  assert.deepEqual(articles.of(rows[4]), { key: 'a:t', part: 'middle', posInSet: 2 });
  assert.deepEqual(articles.of(rows[5]), { key: 'a:t', part: 'last', posInSet: 2 });
  assert.equal(articles.of(rows[6]), null);
  // No row model (entries not given) or no renderPart: the host's rows as given.
  assert.equal(Feed.feedEntryRows(hostRows, null).length, hostRows.length);
  const noPart = Feed.feedEntryRows([{ ...hostRows[3], renderPart: undefined }], built);
  assert.equal(noPart.length, 1);
  assert.equal(noPart[0].id, 'a');
});
