// W14-code 第六轮 transcript 线复核修复（reports/W14-code/r6-transcript.review.md 问题 1、2）。
//   【补做】R6T-01 = gates-r6-01：Code 转写改在 Aat 的滚动器 ooe 里滚动（c4a9ee384 Hp → useFeedScroller，跟随引擎
//     c7f8992b4 x，Fe.Provider 把 api 交给列表 ba；keepsFollow = i7 / a7，classifyKeyScroll = c227f4d5e S2，
//     resnapBeforeInput = c4a9ee384 Wp）。回退开关 local_feed_ooe_scroller（挂在 __gb__4175257006 之下，默认开）；
//     Chat / Cowork 与开关关闭时仍是宿主滚动器。
//   【补做】R6T-REG-01 余项：拆开的长回复，非首段带上它自己画的宿主行 id（itemIds），章节 reveal 落到该段而非回复开头。
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

let server, C, Transcript, Feed, GB, List;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Transcript = await server.ssrLoadModule('/src/source-transcript.jsx');
  Feed = await server.ssrLoadModule('/src/source-code-feed.jsx');
  GB = await server.ssrLoadModule('/src/host-growthbook.mjs');
  List = await server.ssrLoadModule('/src/generated/code-transcript/c4a9ee384-RLCjceOL.mjs');
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, addEventListener() {}, remove() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], getElementsByTagName: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, style: {}, getAttribute: () => null, hasAttribute: () => false }, cookie: '' };
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
const frame = (props, children) => renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:r6r', ready: true, statusRows: true, ...props }, children));

// ---------------------------------------------------------------------------------------------------------------- R6T-01

test('R6T-01 official: Aat scrolls the feed in ooe (Hp) with keepsFollow i7 / a7, classifyKeyScroll yv, Jd, and hands the list Je.api', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('className:`h-full overflow-y-auto overflow-x-hidden [contain:strict] [scrollbar-gutter:stable_both-edges] ${J?iC:""} ${g??""}`,innerClassName:"flex min-h-full flex-col"'));
  assert.ok(c96.includes('classifyKeyScroll:yv,shouldRepinOnContainerResize:Ie,keepsFollow:qe,onFollowCompensation:Bn,resnapBeforeInput:Ge,hidden:Ke'));
  assert.ok(c96.includes('qe=C(e=>i7(e,x)?!0:(a7(e,ze.current,Me.current),!1),[x,ze,Me])'));
  assert.ok(c96.includes('scrollerApi:Je.api'));
  assert.ok(c96.includes('f("div",{className:"grow",children:qt.element})'));
  const c4a = official('c4a9ee384-');
  assert.ok(c4a.includes('"data-autoscroll-container":!0'));
  assert.ok(official('c0fbbe82d-').includes('pi="epitaxy-virtual-transcript"'));
  // The generator slices them (manifest), and the generated module exports the scroller.
  const manifest = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  const byTarget = (target) => manifest.modules.find((m) => m.target === target);
  assert.equal(byTarget('c4a9ee384-RLCjceOL.mjs').exports.Hp, 'useFeedScroller');
  assert.equal(byTarget('c4a9ee384-RLCjceOL.mjs').exports.Wp, 'useResnapBeforeInput');
  assert.equal(byTarget('c227f4d5e-B-FYKrwT.mjs').exports.S2, 'classifyFeedKeyScroll');
  assert.equal(byTarget('code-transcript.mjs').exports.i7, 'feedPressKeepsFollow');
  assert.equal(byTarget('code-transcript.mjs').exports.a7, 'feedRepinAfterClick');
  assert.equal(typeof List.useFeedScroller, 'function');
  assert.ok(read('src/generated/code-transcript/c7f8992b4-DUZwS58e.mjs').includes('settledBottom: Wt,'));
});

test('R6T-01: the rollback switch is on under the feed list; main.jsx gives a Code session with the renderer the official scroller', () => {
  assert.equal(GB.hostGrowthBookFlag('local_feed_ooe_scroller'), true);
  assert.equal(Feed.officialFeedScrollerOn(), true);
  const main = read('src/main.jsx');
  // W14-code r7 R7DC-07: main.jsx calls the one switch the feed exports (no second inline copy of the condition).
  assert.ok(main.includes('import { officialFeedScrollerOn } from "./source-code-feed.jsx";'));
  assert.ok(main.includes('officialScroller={mode === "code" && !!current && codeTranscriptRendererOn(current) && officialFeedScrollerOn()}'));
  assert.equal(main.includes('hostGrowthBookFlag("local_feed_ooe_scroller")'), false);
});

test('R6T-01 (SSR): officialScroller renders ooe\'s container (Aat\'s classes, testid, the conversation region) around the column', () => {
  const html = frame({ officialScroller: true }, React.createElement('div', { 'data-transcript-item-id': 'x' }, 'row text'));
  const container = html.match(/<div[^>]*data-autoscroll-container="true"[^>]*>/)?.[0];
  assert.ok(container, html.slice(0, 400));
  assert.match(container, /class="transcript h-full overflow-y-auto overflow-x-hidden \[contain:strict\] \[scrollbar-gutter:stable_both-edges\] supports-\[animation-timeline:scroll\(\)\]:\[--epitaxy-top-fade-height:32px\]"/);
  assert.match(container, /data-testid="epitaxy-virtual-transcript"/);
  assert.match(container, /data-focus-region="conversation"/);
  assert.match(container, /style="overflow-anchor:none"/);
  assert.match(html, /data-autoscroll-container="true"[^>]*><div class="flex min-h-full flex-col">/);
  assert.match(html, /class="source-transcript-content grow" data-testid="transcript-sizer"/);
  // What the host column keeps: the fades, the end sentinel, the jump chip, the row.
  for (const id of ['transcript-fade-top', 'transcript-fade-bottom', 'transcript-end-sentinel', 'jump-to-latest']) assert.ok(html.includes(`data-testid="${id}"`), id);
  assert.ok(html.includes('row text'));
});

test('R6T-01 (SSR): Chat / Cowork, the draft and the rollback keep the host scroller (no ooe container)', () => {
  for (const props of [{}, { officialScroller: false }, { officialScroller: true, sessionKey: null }]) {
    const html = frame(props, React.createElement('div', null, 'row'));
    assert.doesNotMatch(html, /data-autoscroll-container/);
    assert.match(html, /<div class="transcript supports-\[animation-timeline:scroll\(\)\]:\[--epitaxy-top-fade-height:32px\]" data-focus-region="conversation"/);
    assert.match(html, /class="source-transcript-content" data-testid="transcript-sizer"/);
  }
});

test('R6T-01 (SSR): a long Code reply draws through the feed list inside ooe (the list takes the scroller api; parts still name rows)', () => {
  const html = frame({ officialScroller: true }, React.createElement(C.SourceCodeTranscript, { sessionId: 'r6r', items: LONG }));
  assert.match(html, /data-autoscroll-container="true"/);
  assert.match(html, /data-code-feed=""/);
  assert.match(html, /data-testid="transcript-rows"/);
  const parts = [...html.matchAll(/<div data-row-gap="(own|none)"[^>]*>/g)].map((m) => m[0]);
  assert.ok(parts.length >= 2, `parts: ${parts.length}`);
  for (const part of parts) assert.match(part, /data-transcript-item-id="[^"]+"/);
  // The list opens at its tail (Aat initialViewport following): the reply's end is drawn.
  assert.ok(html.includes('Final answer'));
});

test('R6T-01: the host handle over ooe\'s follow keeps the controller\'s api; the list gets scrollerApi and Cat its follow', () => {
  const feed = read('src/source-code-feed.jsx');
  const hook = feed.slice(feed.indexOf('export function useOfficialFeedScroll'));
  for (const name of ['capture:', 'getIdentity:', 'jumpToLatest:', 'forwardWheel:', 'release,', 'isPinned:', 'reveal:', 'getContent:', 'getViewport:', 'keyScroll:', 'cancelKeyScroll:'])
    assert.ok(hook.includes(name), name);
  assert.ok(hook.includes('classifyKeyScroll: classifyFeedKeyScroll, keepsFollow, resnapBeforeInput, hidden: false'));
  assert.ok(hook.includes('feedPressKeepsFollow(event, undefined) ? true'));
  assert.ok(hook.includes('follow.scrollToBottom(jumpBehavior(expected.behavior, prefersReducedMotion(view)) === "smooth" ? "smooth" : undefined)'));
  assert.ok(hook.includes('attachTabFocusRelease(viewport,'));
  assert.ok(feed.includes('...(scrollerApi ? { scrollerApi } : null)'));
  assert.ok(feed.includes('current: scrollerApi ? scrollerApi.follow : feedFollow(host?.api ?? null)'));
  const transcript = read('src/source-transcript.jsx');
  assert.ok(transcript.includes('const hostScroll = useTranscriptScroll({ sessionKey: official ? null : sessionKey, ready });'));
  assert.ok(transcript.includes('get scrollerApi() { return ooeApi.current ?? undefined; },'));
});

test('R6T-01: a fold-pending reply row carries its turn key (Aat It holds it at its measured height once released)', () => {
  const host = [{ id: 'a', kind: 'assistant', article: true, entryIndex: 0, itemIds: ['a'], render: () => 'a', renderPart: () => 'p' }];
  const rows = Feed.feedEntryRows(host, { rows: [{ kind: 'assistant', id: 'a', builtEntryIdx: 0, entry: {}, rendererFoldPending: true, rendererTurnKey: 'k' }] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].foldPending, true);
  assert.equal(rows[0].rendererTurnKey, 'k');
  // A drawn reply is no fold-pending row.
  const drawn = Feed.feedEntryRows(host, { rows: [{ kind: 'assistant', id: 'a', builtEntryIdx: 0, entry: {}, rendererTurnKey: 'k' }] });
  assert.equal(drawn[0].foldPending, undefined);
  const feed = read('src/source-code-feed.jsx');
  assert.ok(feed.includes('fragments?.released?.(row.rendererTurnKey) === true ? sizesRef.current(row.id) : undefined'));
  assert.ok(official('c96d752d0-').includes('f("div",{className:"flow-root",style:{height:r??be(e,t)},children:n})'));
});

// ------------------------------------------------------------------------------------------------ R6T-REG-01 余项（itemIds）

test('R6T-REG-01 remainder: later parts take the host rows they draw; the first keeps the rest (a chapter reveals its own part)', () => {
  const hostRows = [{ id: 'a', kind: 'assistant', article: true, entryIndex: 0, itemIds: ['e', 'r0', 'r1', 'r2'], render: () => 'a',
    renderPart: (part) => part.itemKey, partItemIds: (part) => ({ k2: ['r1'], k3: ['r2', 'r1'] })[part.itemKey] ?? [] }];
  const part = (itemKey, isFirst, isLast) => ({ kind: 'rendererItem', id: `a›${itemKey}`, turnKey: 'a:t', itemKey, builtEntryIdx: 0, entry: {}, isFirst, isLast });
  const rows = Feed.feedEntryRows(hostRows, { rows: [part('k1', true, false), part('k2', false, false), part('k3', false, true)] });
  assert.deepEqual(rows.map((row) => row.itemIds), [['e', 'r0'], ['r1'], ['r2', 'r1']]);
  // The list's reveal (CodeTranscriptFeed) finds the first row naming the id: r2's chapter lands on the last part.
  const reveal = (id) => rows.findIndex((row) => row.id === id || row.itemIds?.includes(id));
  assert.equal(reveal('r2'), 2);
  assert.equal(reveal('r1'), 1);
  assert.equal(reveal('r0'), 0);
  // No partItemIds (a host row from elsewhere): the first part keeps them all, as before.
  const plain = Feed.feedEntryRows([{ ...hostRows[0], partItemIds: undefined }], { rows: [part('k1', true, false), part('k2', false, true)] });
  assert.deepEqual(plain.map((row) => row.itemIds), [['e', 'r0', 'r1', 'r2'], []]);
});

test('R6T-REG-01 remainder: partRowIds maps a part\'s item (every call of a tool group) to its engine rows', () => {
  const entry = { items: [
    { kind: 'text', id: 'a1', text: 'x' },
    { kind: 'tools', id: 'g2', tools: [{ id: 'g2', name: 'Read' }, { id: 'g3', name: 'Read' }] },
    { kind: 'tools', id: 'b1', tools: [{ id: 'b1#1', name: 'Bash' }] },
  ], rows: [{ id: 'a1' }, { id: 'b1' }, { id: 'group', toolGroup: [{ id: 'g2' }] }, { id: 'g3' }] };
  assert.deepEqual(C.partRowIds({ isFirst: false, turnKey: 'k', itemKey: 'k:grp:g2' }, entry), ['group', 'g3']);
  assert.deepEqual(C.partRowIds({ isFirst: false, turnKey: 'k', itemKey: 'k:b1#1' }, entry), ['b1']);
  assert.deepEqual(C.partRowIds({ isFirst: true, turnKey: 'k', itemKey: 'k:t0' }, entry), []);
  assert.deepEqual(C.partRowIds({ isFirst: false, turnKey: 'k', itemKey: 'k:nope' }, entry), []);
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:grp:g2' }, entry, 'first'), 'group');
  const src = read('src/source-code-transcript.jsx');
  assert.ok(src.includes('partItemIds: (part) => partRowIds(part, entry).filter((id) => id !== itemId && id !== entry.id),'));
});

test('R6T-REG-01 remainder (SSR): a split reply\'s later parts carry their own rows to the list (the reveal reaches them)', () => {
  const html = frame({ officialScroller: true }, React.createElement(C.SourceCodeTranscript, { sessionId: 'r6r2', items: LONG }));
  const later = [...html.matchAll(/<div data-row-gap="own"[^>]*data-transcript-item-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(later.length > 0);
  assert.ok(later.some((id) => id !== 'm0'), later.join(','));
});
