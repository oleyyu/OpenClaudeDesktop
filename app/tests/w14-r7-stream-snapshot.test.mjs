// W14-code r7 复核 R7T-06 = gates-r7-02 (E95, GUI acceptance): the Code transcript's live message stream. The host feeds
// the streaming agentMessage's text to c06cf64bb W (code-stream-feed.mjs streamFeedStep), cd4f82e77 zt reads the snapshot
// (cf74bc599 dw `He = fd(t, r, i ?? !0, Ve, je)`), the feed's entries take `Os(a, He, Ue)` (c96d752d0 fO) and the renderer
// folds the raw entries (`rendererBaseEntries: ft`) with the snapshot as its live tick (`liveSnapshot: ct`). Official
// chunks are only read as text; the generated slices run under vite SSR.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chaptersWithStreamAlias, engineItemIdOf, streamFeedStep, streamingAgentMessage, withoutSnapshotSuffix, withStreamTail } from '../src/code-stream-feed.mjs';
import { hostGrowthBookFlag } from '../src/host-growthbook.mjs';

const app = path.resolve(import.meta.dirname, '..');
const snapshotDir = path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = (file) => fs.readFileSync(path.join(snapshotDir, file), 'utf8');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');

{
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  let dispatcher;
  renderToStaticMarkup(React.createElement(function Capture() { dispatcher = internals.H; return null; }));
  const useStore = dispatcher.useSyncExternalStore;
  dispatcher.useSyncExternalStore = (subscribe, getSnapshot, getServerSnapshot) => useStore(subscribe, getSnapshot, getServerSnapshot ?? getSnapshot);
}

let server, C, G, W;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  G = await server.ssrLoadModule('/src/generated/code-transcript/code-transcript.mjs');
  W = (await server.ssrLoadModule('/src/generated/code-transcript/c06cf64bb-CdJdJuVd.mjs')).transcriptStreamStore;
  globalThis.document ??= { body: { nodeType: 1 }, head: { appendChild() {}, querySelector: () => null }, createElement: () => ({ relList: { supports: () => false }, setAttribute() {}, style: {} }),
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, removeEventListener() {}, documentElement: { dataset: {}, getAttribute: () => null }, cookie: '' };
  globalThis.window ??= { document: globalThis.document, navigator: { userAgent: 'Mozilla/5.0 (Macintosh)' }, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }), location: { href: 'file:///', pathname: '/', search: '' } };
});
after(() => server?.close());

const feed_ = (session, ops) => feed(session, ops);
const feed = (session, ops) => { for (const op of ops) op.clear ? W.clear(session) : W.feed(session, op.event, null); };

test('streamFeedStep: one message per agentMessage, its text as one text block growing by deltas, stopped and cleared at the end', () => {
  const first = streamFeedStep(null, { id: 'm1', text: 'Hel' });
  assert.deepEqual(first.ops.map((op) => op.event?.type ?? 'clear'), ['message_start', 'content_block_start', 'content_block_delta']);
  assert.equal(first.ops[0].event.message.id, 'm1');
  assert.deepEqual(first.ops[1].event.content_block, { type: 'text', text: '' });
  assert.deepEqual(first.ops[2].event.delta, { type: 'text_delta', text: 'Hel' });
  const grow = streamFeedStep(first.fed, { id: 'm1', text: 'Hello' });
  assert.deepEqual(grow.ops, [{ event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'lo' } } }]);
  assert.deepEqual(streamFeedStep(grow.fed, { id: 'm1', text: 'Hello' }).ops, [], 'nothing new, nothing fed');
  const end = streamFeedStep(grow.fed, null);
  assert.deepEqual(end.ops.map((op) => op.event?.type ?? 'clear'), ['content_block_stop', 'message_stop', 'clear']);
  assert.equal(end.fed, null);
  const next = streamFeedStep(grow.fed, { id: 'm2', text: 'A' });
  assert.deepEqual(next.ops.map((op) => op.event?.type ?? 'clear'), ['content_block_stop', 'message_stop', 'clear', 'message_start', 'content_block_start', 'content_block_delta']);
  const replaced = streamFeedStep(grow.fed, { id: 'm1', text: 'Bye' });
  assert.ok(replaced.ops.some((op) => op.clear) && replaced.ops.at(-1).event.delta.text === 'Bye', 'a replaced text restarts the message');
});

test('withStreamTail: the streaming text leaves its provisional entry, which names the message (c06cf64bb `ue`)', () => {
  const entries = [{ id: 'u', author: 'user', items: [{ kind: 'text', id: 'u:text', text: 'q' }] },
    { id: 'e1', author: 'assistant', provisionalMessageId: 'e1', items: [{ kind: 'tools', id: 'c1', tools: [] }, { kind: 'text', id: 'm1', text: 'Hi' }] }];
  const tailed = withStreamTail(entries, 'm1');
  assert.deepEqual(tailed[1].items.map((item) => item.id), ['c1']);
  assert.equal(tailed[1].provisionalMessageId, 'm1');
  assert.equal(tailed[1].provisionalAfterItemId, 'c1');
  assert.equal(tailed[0], entries[0]);
  assert.equal(withStreamTail(entries, 'other'), entries, 'not the tail: unchanged');
  const lone = withStreamTail([{ id: 'e2', author: 'assistant', provisionalMessageId: 'e2', items: [{ kind: 'text', id: 'm2', text: 'x' }] }], 'm2');
  assert.equal(lone[0].provisionalAfterItemId, null);
  assert.equal(streamingAgentMessage([{ id: 'a', type: 'agentMessage' }, { id: 'b', type: 'agentMessage' }, { id: 'c', type: 'commandExecution' }], (row) => row.id !== 'b')?.id, 'a');
});

test('W takes the fed stream: its snapshot is the message\'s text block; fO lays it over the tail once (`${messageId}-t0`)', () => {
  const session = 'stream-probe';
  feed(session, streamFeedStep(null, { id: 'm1', text: 'Hello world' }).ops);
  const snap = W.getSnapshot(session);
  assert.equal(snap.messageId, 'm1');
  assert.deepEqual(snap.blocks, [{ kind: 'text', text: 'Hello world' }]);
  const entries = [{ id: 'e1', author: 'assistant', provisionalMessageId: 'e1', items: [{ kind: 'text', id: 'm0', text: 'Before.' }, { kind: 'text', id: 'm1', text: 'Hello world' }] }];
  const base = withStreamTail(entries, 'm1');
  const shown = G.applyStreamSnapshot(base, snap, true);
  assert.deepEqual(shown[0].items.map((item) => [item.id, item.text]), [['m0', 'Before.'], ['m1-t0', 'Hello world']]);
  // The renderer's own splice (C4: `fO(e.entries, n.snapshot, …, !1)`) runs over the raw entries: one copy.
  assert.deepEqual(G.applyStreamSnapshot(base, snap, true, false)[0].items.map((item) => item.id), ['m0', 'm1-t0']);
  feed(session, streamFeedStep({ id: 'm1', text: 'Hello world' }, null).ops);
  assert.equal(W.getSnapshot(session), null, 'cleared when the message ends');
});

const ITEMS = [
  { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'Say hello' }] },
  { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Streamed so far and more from the engine' },
];
// The text only: a streaming reply's words come in alluvium's word spans (`data-wf`, the reveal's fade-in).
const render = (props) => renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'stream-ssr', items: ITEMS, responding: true, activeTurnId: 't1', ...props }))
  .replace(/<[^>]+>/g, '');

test('SSR: while the message streams, the reply is the stream\'s snapshot (zt); without a stream id the engine\'s text', () => {
  assert.equal(hostGrowthBookFlag('__gb__2714218019'), true);
  assert.equal(hostGrowthBookFlag('local_code_stream_snapshot'), true);
  feed('stream-ssr', streamFeedStep(null, { id: 'm1', text: 'Streamed so far' }).ops);
  try {
    const live = render({ streamingItemId: 'm1' });
    assert.match(live, /Streamed so far/);
    assert.doesNotMatch(live, /and more from the engine/, 'the snapshot, not the engine item, draws the streaming text');
    assert.equal((live.match(/Streamed so far/g) ?? []).length, 1, 'drawn once');
    // No stream id: the provisional entry keeps the engine's text (the renderer's streaming prose reveals it word by
    // word, so SSR's first frame draws a prefix of it — past the snapshot's end).
    assert.match(render({}), /Streamed so far and/, 'no stream id: the entry keeps its own text');
    // The turn over: no stream, the whole engine text.
    assert.match(render({ responding: false, streamingItemId: 'm1' }), /Streamed so far and more from the engine/);
  } finally {
    W.clear('stream-ssr');
  }
  assert.match(render({ streamingItemId: 'm1' }), /Streamed so far and/, 'no snapshot yet: the engine text');
});

test('the wiring follows dw / bat (source), and the slices are the originals', () => {
  const dw = official('cf74bc599-CRYqipWN.js');
  for (const text of ['He=fd(t,r,i??!0,Ve,je)', 'let e=Os(a,He,Ue)', 'ct=Xe?He:void 0', 'rendererBaseEntries:ft', 'liveSnapshot:ct'])
    assert.ok(dw.includes(text), text);
  const c96 = official('c96d752d0-CWv_7-n9.js');
  assert.ok(c96.includes('C4=(e,t,n)=>{let r=fO(e.entries,n.snapshot,e.ctx.sessionType==="local",!1)'));
  const source = read('src/source-code-transcript.jsx');
  assert.match(source, /useLiveTexts\(streamed, liveTextOn\)/);
  assert.match(source, /liveSnapshot=\{liveTextOn && streamingBase \? liveSnapshot : undefined\}/);
  assert.match(source, /streaming=\{streamingBase \? liveSnapshot : null\}/);
  assert.match(source, /share\(entriesThroughProvisional\(streamingBase \?\? entries\)\)/);
  assert.match(read('src/main.jsx'), /streamingItemId=\{streamingAgentMessage\(rows, \(row\) => isItemStreaming\(state, current, row\)\)\?\.id \?\? null/);
  const zt = read('src/generated/code-transcript/cd4f82e77-CAMIsQ30.mjs');
  assert.match(zt, /export \{ zt as useStreamSnapshot/);
  assert.ok(zt.includes('{ wantsThinking: l },'));
  assert.match(read('src/generated/code-transcript/c06cf64bb-CdJdJuVd.mjs'), /W as transcriptStreamStore,/);
});

// W14-code 第八轮（data/w14code/round8/lanes/transcript.json）R8T-REG-01 / gates-r8-01.
test('R8T-REG-01: a pin made while the reply streams is kept under the engine item (Lg), and read under the snapshot id', async () => {
  // c06cf64bb: Lg strips the snapshot suffix; Fg names the snapshot's text items `${messageId}-t${n}`.
  const c06 = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(c06.includes('function Lg(e){return e.replace(/-t\\d+$/,"")}'));
  assert.ok(c06.includes('id:`${e.messageId}-t${a}`'));
  assert.equal(withoutSnapshotSuffix('m1-t0'), 'm1');
  assert.equal(withoutSnapshotSuffix('m1'), 'm1');
  const known = (id) => ['m1', 'u1:text', 'item-t3'].includes(id);
  assert.equal(engineItemIdOf('m1-t0', known), 'm1', 'the snapshot item is the engine item');
  assert.equal(engineItemIdOf('m1', known), 'm1');
  assert.equal(engineItemIdOf('item-t3', known), 'item-t3', 'an engine id that only looks suffixed stays');
  assert.equal(engineItemIdOf('x-t0', known), 'x-t0', 'nothing known: unchanged');
  const chapter = { id: 'uch-1', afterId: 'm1', title: 'Pinned' };
  const byAfter = new Map([['m1', [chapter]]]);
  const aliased = chaptersWithStreamAlias(byAfter, 'm1');
  assert.equal(aliased.get('m1-t0'), byAfter.get('m1'));
  assert.equal(aliased.get('m1'), byAfter.get('m1'));
  assert.equal(chaptersWithStreamAlias(byAfter, 'other'), byAfter);
  assert.equal(chaptersWithStreamAlias(undefined, 'm1'), undefined);
  // The action host keeps the chapter under the engine id (the host's entries keep `m1` once the stream ends).
  const added = [];
  const store = await server.ssrLoadModule('/src/session-chapters-model.mjs');
  const real = store.chapterStore();
  const original = real.addUserChapter;
  real.addUserChapter = (...args) => { added.push(args); };
  try {
    const all = [{ id: 'm1:reply', author: 'assistant', turnId: 't1', items: [{ kind: 'text', id: 'm1', text: 'Hi' }] }];
    const host = C.codeTranscriptActionHost('pin-s', all, all, null, { pins: true });
    host.onPinChapter('m1-t0', 'Hi');
    host.onPinChapter('m1', 'Hi');
    assert.deepEqual(added.map(([session, anchor]) => [session, anchor]), [['pin-s', 'm1'], ['pin-s', 'm1']]);
  } finally {
    real.addUserChapter = original;
  }
  const source = read('src/source-code-transcript.jsx');
  assert.ok(source.includes('chaptersWithStreamAlias(chaptersByAnchor(sessionChapters.userChapters), streamAliasId)'));
  assert.ok(source.includes('const id = hostRowOf(entry, own) ?? hostRowOf(entry, withoutSnapshotSuffix(own));'), 'a streaming text part names the engine row');
  assert.ok(source.includes('return at < 0 ? undefined : engineItemIdOf(own?.pinAnchorIds?.[at]?.[0], (id) => actionItemIds(all).has(id));'));
});

test('gates-r8-01: the stream reads isPanelActive and the feed list\'s isPinned (dw `fd(t, r, i ?? !0, Ve, je)`), not undefined', () => {
  const dw = official('cf74bc599-CRYqipWN.js');
  assert.ok(dw.includes('He=fd(t,r,i??!0,Ve,je)'));
  assert.ok(dw.includes('b.current?.isPinned()??!0'));
  const c06 = official('c06cf64bb-CdJdJuVd.js');
  assert.ok(c06.includes('e.cachedVisibility?33:(e.reveal.panelInactiveAny=!0,lx)'));
  const zt = read('src/generated/code-transcript/cd4f82e77-CAMIsQ30.mjs');
  assert.ok(zt.includes('c = n === void 0 || n,'), 'zt: the third argument is the panel\'s activity');
  assert.ok(zt.includes('K1($, 4, r, () => r?.() ?? !0)'), 'zt: the fourth is the pinned probe');
  const source = read('src/source-code-transcript.jsx');
  assert.ok(source.includes('const isPinnedNow = React.useCallback(() => messagesRef.current?.isPinned() ?? true, []);'));
  assert.ok(source.includes('useStreamSnapshot(sessionId ?? null, streamOn, isPanelActive, isPinnedNow, showThinking)'));
  assert.ok(!source.includes('useStreamSnapshot(sessionId ?? null, streamOn, undefined, undefined, showThinking)'));
  assert.ok(source.includes('messagesRef={messagesRef} />'));
  const feed = read('src/source-code-feed.jsx');
  assert.ok(feed.includes('const handle = { isPinned };') && feed.includes('messagesRef.current = handle;'));
  assert.match(read('src/main.jsx'), /isPanelActive=\{splitActive \/\* W14-code r8 gates-r8-01/);
  // SSR still draws the stream's snapshot with the panel inactive (only W's pace changes).
  feed_('stream-panel', streamFeedStep(null, { id: 'm1', text: 'Streamed so far' }).ops);
  try {
    const html = renderToStaticMarkup(React.createElement(C.SourceCodeTranscript, { sessionId: 'stream-panel', items: ITEMS, responding: true, activeTurnId: 't1',
      streamingItemId: 'm1', isPanelActive: false })).replace(/<[^>]+>/g, '');
    assert.match(html, /Streamed so far/);
    assert.doesNotMatch(html, /and more from the engine/);
  } finally {
    W.clear('stream-panel');
  }
});
