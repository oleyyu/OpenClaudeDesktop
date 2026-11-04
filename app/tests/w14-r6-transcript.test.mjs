// W14-code 第六轮 transcript 线（plan-w14-code.md E81–E95；数据 data/w14code/round6/lanes/transcript.json）。
//   R6T-REG-01：拆开的长回复每一部分都写 data-transcript-item-id（非首段：TM 找到的条目项对应的宿主行，查不到用回合首行），
//               并照 c96d752d0 i9 `case "rendererItem"` 用 M7 + j7 的行距 div 包住 e7e。
//   R6T-REG-02：⌘⌥↑/↓ 跳转带代次，新跳转取消上一次的 scrollend / 1s 兜底，只有最新一次落位才放开行。
//   R6T-02：shared-10 jT 是官方懒加载句柄（MT = jT.Component 不再是 undefined），cb1b78cfa 图片预览切片；c856385e2
//           xt = bt.Provider 导出为 ImageLoaderProvider，宿主按 cc43287c9 LV loadImage 的形状挂上会话图片加载器。
//   顺带：c96d752d0 UQ 导出为 TaskStopButton（panes 组 r6pa-03 用）。
// 第七轮 scroll-fix（data/w14code/round7/lanes/scroll-fix.json）：
//   R7T-REG-01：⌘⌥↑/↓ 用句柄的 getViewport 当视口（ooe 下 content 的父节点是随滚动移动的内列），scrollend 也挂在它上面。
//   R7T-04：渲染器下 settledTurnBox 行套 c96d752d0 n9 的 e9 card（TranscriptInsetRow card）。
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

let server, C, Transcript, Root, Shared10, C856;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const I18N = await server.ssrLoadModule('/electron/i18n/index.mjs');
  I18N.setLocale?.('en-US');
  C = await server.ssrLoadModule('/src/source-code-transcript.jsx');
  Transcript = await server.ssrLoadModule('/src/source-transcript.jsx');
  Root = await server.ssrLoadModule('/src/generated/code-transcript/code-transcript.mjs');
  Shared10 = await server.ssrLoadModule('/src/generated/code-transcript/shared-10-D6FXWZph.mjs');
  C856 = await server.ssrLoadModule('/src/generated/code-transcript/c856385e2-aEyDzrcK.mjs');
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
const inFrame = (items, props = {}) => renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:r6', ready: true, statusRows: true },
  React.createElement(C.SourceCodeTranscript, { sessionId: 'r6', items, ...props })));

test('R6T-REG-01 official: i9 wraps a rendererItem row in M7 with j7\'s row-gap div; M7 resolves the item by TM; Aat vr reads pinAnchorIds by EM', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('f(M7,{entry:e,turnKey:n,userChaptersByAfterId:k,onPinChapter:G,onUnpinChapter:K,rendererPinAnchorOf:q,onForkAfterTurn:Rt,onForkAtMessage:void 0,onRewindToMessage:void 0,onAttachAsContext:H,viewerAccountId:ie,children:a})'));
  assert.ok(c96.includes('f(e7e,{turnKey:t.turnKey,itemKey:t.itemKey,opensTranscript:Tt})'));
  assert.ok(c96.includes('function O9e(e,t=""){return{"data-row-gap":e,className:`${D9e[e]} ${t}`.trim()||void 0}}'));
  assert.ok(c96.includes('D9e={own:"",none:"[&>[data-transcript-row]]:!mt-0",item:mse}'));
  assert.ok(c96.includes('rendererRowGap:C?.sharedRow??(pN(t)&&!t.isFirst?"own":"none")'));
  assert.ok(c96.includes('m=TM(n,p,t.items)'));
  assert.ok(c96.includes('r=n?.itemKeys.indexOf(EM(e,t))??-1;return r<0?void 0:n?.pinAnchorIds?.[r]?.[0]'));
  const manifest = JSON.parse(read('src/generated/code-transcript/manifest.json'));
  const root = manifest.modules.find((m) => m.target === 'code-transcript.mjs');
  assert.equal(root.exports.M7, 'RendererRowActions');
  assert.equal(root.exports.TM, 'rendererItemOfKey');
  assert.equal(root.exports.EM, 'rendererPinItemKey');
  assert.equal(typeof Root.RendererRowActions, 'function');
});

test('R6T-REG-01 (SSR): every mounted part of a split reply names a host row; later parts name the item\'s own engine row', () => {
  const html = inFrame(LONG);
  const parts = [...html.matchAll(/<div data-row-gap="(own|none)"[^>]*>/g)].map((m) => m[0]);
  assert.ok(parts.length >= 2, `parts: ${parts.length}`);
  for (const part of parts) assert.match(part, /data-transcript-item-id="[^"]+"/, part);
  // The first part: the turn's first row (a chapter's reveal lands on the reply's start), with D9e.none.
  assert.ok(parts.some((part) => /data-row-gap="none"/.test(part) && /class="\[&amp;&gt;\[data-transcript-row\]\]:!mt-0"/.test(part) && /data-transcript-item-id="m0"/.test(part)));
  // A later part: its own engine row (a reply prose item or a command), never left without an id.
  const later = parts.filter((part) => /data-row-gap="own"/.test(part)).map((part) => part.match(/data-transcript-item-id="([^"]+)"/)[1]);
  assert.ok(later.length > 0);
  assert.ok(later.every((id) => /^(?:m\d+|mz|c\d+)$/.test(id)), later.join(','));
  assert.ok(later.some((id) => id !== 'm0'), later.join(','));
  // The tail part's chrome (the reply's own text is still drawn).
  assert.ok(html.includes('Final answer'));
});

test('R6T-REG-01: partRowId — first part, item rows, tool calls, group members, unknown keys fall back', () => {
  const entry = { items: [
    { kind: 'text', id: 'a1', text: 'x' },
    { kind: 'tools', id: 'b1', tools: [{ id: 'b1#1', name: 'Bash' }] },
    { kind: 'tools', id: 'g2', tools: [{ id: 'g2', name: 'Read' }] },
  ], rows: [{ id: 'a1' }, { id: 'b1' }, { id: 'group', toolGroup: [{ id: 'g2' }] }] };
  assert.equal(C.partRowId({ isFirst: true, turnKey: 'k', itemKey: 'k:t0' }, entry, 'first'), 'first');
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:b1#1' }, entry, 'first'), 'b1');
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:grp:g2' }, entry, 'first'), 'group');
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'k', itemKey: 'k:nope' }, entry, 'first'), 'first');
  assert.equal(C.partRowId({ isFirst: false, turnKey: 'other', itemKey: 'k:b1#1' }, entry, 'first'), 'first');
  assert.equal(C.partRowId(null, entry, 'first'), 'first');
});

test('R6T-REG-02: each prompt jump is a generation; a new one cancels the last landing; only the latest releases the rows', () => {
  const main = read('src/main.jsx');
  assert.ok(main.includes('const promptJump = useRef({ generation: 0, cancel: null });'));
  assert.ok(main.includes('promptJump.current.cancel?.();\n    promptJump.current.cancel = null;\n    jumpToPromptAt(direction, ++promptJump.current.generation);'));
  assert.ok(main.includes('if (generation !== promptJump.current.generation) return;'));
  assert.ok(main.includes('const releaseRows = () => { if (generation === promptJump.current.generation && !findBarOpen()) transcriptRef.current?.releaseRows?.(); };'));
  assert.ok(main.includes('const cancel = () => { clearTimeout(timer); viewport.removeEventListener("scrollend", landed); };'));
  assert.ok(main.includes('promptJump.current.cancel = cancel;'));
  // The callers keep the one-argument form (⌘⌥↑/↓ menu command, the shortcuts' onJump).
  assert.ok(main.includes('jumpToPrompt(command === "jump-prev-prompt" ? -1 : 1);'));
});

test('R6T-02 official: jT is the lazy image preview handle; c5259f582 provides the image loader; ub previews through it', () => {
  const s10 = official('shared-10-');
  assert.ok(s10.includes('id:"image_preview_modal"'));
  assert.ok(s10.includes('pick:e=>e.ImagePreviewModal'));
  assert.ok(/MT=jT\.Component/.test(s10));
  assert.ok(official('c856385e2-').includes('xt=bt.Provider'));
  assert.ok(official('c5259f582-').includes('value:n.imageLoader'));
  assert.ok(official('cb1b78cfa-').includes('export{g as ImagePreviewModal}'));
});

test('R6T-02: MT is the handle\'s component (no more undefined), ImageLoaderProvider is exported, the stand-in is gone', () => {
  assert.ok(Shared10.MT, 'MT');
  assert.ok(typeof Shared10.MT === 'function' || typeof Shared10.MT === 'object');
  assert.equal(typeof C856.ImageLoaderProvider, 'object');
  assert.doesNotMatch(read('src/source-code-transcript-adapters.jsx'), /export function ImagePreviewModal/);
  const s10 = read('src/generated/code-transcript/shared-10-D6FXWZph.mjs');
  assert.ok(s10.includes('i(() => import("./cb1b78cfa-VqsYNxqp.js"), __vite__mapDeps([0, 2]))'));
  assert.ok(fs.existsSync(path.join(app, 'src/generated/code-transcript/cb1b78cfa-VqsYNxqp.js')));
  // The dialog's focus return is view-tabs' one copy (useCdsDialogFocusReturn), not a second registry.
  assert.match(read('src/generated/code-transcript/cb1b78cfa-VqsYNxqp.js'), /useCdsDialogFocusReturn as u,/);
  const host = read('src/source-code-transcript.jsx');
  assert.ok(host.includes('<ImageLoaderProvider value={sessionImageLoader}>'));
});

test('R6T-02: loadSessionImage refuses schemes and traversals, resolves a relative path in the session folder, answers null when unreadable', async () => {
  assert.equal(await C.loadSessionImage('', '/w'), null);
  assert.equal(await C.loadSessionImage('https://x/a.png', '/w', null), null);
  assert.equal(await C.loadSessionImage('../secret.png', '/w', null), null);
  assert.equal(await C.loadSessionImage('/a/../b.png', '/w', null), null);
  assert.equal(await C.loadSessionImage('out/shot.png', '/w', null), 'file:///w/out/shot.png');
  assert.equal(await C.loadSessionImage('/abs/My Shot.png', null, null), 'file:///abs/My%20Shot.png');
  assert.equal(await C.loadSessionImage('rel.png', null, null), null);
  class Loads { set src(value) { this.onload?.(); } }
  class Fails { set src(value) { this.onerror?.(); } }
  assert.equal(await C.loadSessionImage('/x.png', null, Loads), 'file:///x.png');
  assert.equal(await C.loadSessionImage('/x.png', null, Fails), null);
});

test('R6T-02 (SSR): a reply linking an image file renders with the image loader on (the zoomable preview no longer throws)', () => {
  const items = [
    { id: 'u1', type: 'userMessage', turnId: 't1', content: [{ type: 'text', text: 'show me' }] },
    { id: 'm1', type: 'agentMessage', turnId: 't1', text: 'Saved the chart to [chart.png](out/chart.png) and ![inline](https://example.com/x.png).' },
  ];
  const html = inFrame(items, { host: { cwd: '/w' } });
  assert.ok(html.includes('chart.png'));
});

test('UQ is exported as TaskStopButton for the Background tasks pane (r6pa-03)', () => {
  assert.ok(official('c96d752d0-').includes('className:"epitaxy-task-row-secondary shrink-0"'));
  const html = renderToStaticMarkup(React.createElement(Root.TaskStopButton, { onClick() {}, ariaLabel: 'Stop task', busy: false, busyLabel: 'Stopping…', quiet: true }));
  assert.match(html, /epitaxy-task-row-secondary shrink-0/);
  assert.match(html, /aria-label="Stop task"/);
});

// ---------------------------------------------------------------------------------------------- W14-code r7 scroll-fix

test('R7T-REG-01 official: ooe (c4a9ee384 Hp) puts the content in an inner column div inside the scroller', () => {
  assert.ok(official('c4a9ee384-').includes('a("div",{className:n,style:t,"data-autoscroll-container":!0,...R,ref:N,children:a("div",{className:l,ref:P,children:e})})'));
});

test('R7T-REG-01 (SSR): under ooe the content\'s parent is the inner column, not the scroller', () => {
  const official = renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:r7', ready: true, statusRows: true, officialScroller: true },
    React.createElement('div', null, 'row')));
  // The scroller's only child is ooe's inner column (FEED_SCROLLER_INNER_CLASS), which holds the transcript-sizer content.
  assert.match(official, /<div[^>]*data-autoscroll-container="true"[^>]*><div class="flex min-h-full flex-col">/);
  const column = official.indexOf('<div class="flex min-h-full flex-col">'), sizer = official.indexOf('data-testid="transcript-sizer"');
  assert.ok(column > 0 && sizer > column, 'the content sits in the inner column');
  // The host scroller keeps the content one level under the scroller (its parentElement was the viewport there).
  const host = renderToStaticMarkup(React.createElement(Transcript.SourceTranscript, { sessionKey: 'code:r7', ready: true, statusRows: true },
    React.createElement('div', null, 'row')));
  assert.equal(host.includes('data-autoscroll-container'), false);
  assert.equal(host.includes('<div class="flex min-h-full flex-col">'), false);
});

test('R7T-REG-01: ⌘⌥↑/↓ measure and listen for scrollend on the handle\'s viewport (both scrollers expose getViewport)', () => {
  const main = read('src/main.jsx');
  assert.ok(main.includes('const content = transcriptRef.current?.getContent?.(), viewport = transcriptRef.current?.getViewport?.() ?? content?.parentElement;'));
  assert.equal(main.includes('viewport = content?.parentElement;'), false);
  assert.ok(main.includes('const top = viewport.getBoundingClientRect().top;'));
  assert.ok(main.includes('viewport.addEventListener("scrollend", landed);'));
  assert.ok(main.includes('const cancel = () => { clearTimeout(timer); viewport.removeEventListener("scrollend", landed); };'));
  // The handle spreads the active scroller's api; both apis give getViewport.
  assert.ok(read('src/source-transcript.jsx').includes('useImperativeHandle(ref, () => ({ ...scroll.api,'));
  assert.ok(read('src/source-code-feed.jsx').includes('getViewport: () => viewportRef.current,'));
  assert.ok(read('src/use-transcript-scroll.js').includes('getViewport: () => viewportRef.current,'));
});

test('R7T-04 official: i9 case settledTurnBox returns n9(Et, n), n9 wraps in e9 card', () => {
  const c96 = official('c96d752d0-');
  assert.ok(c96.includes('function n9(e,t){return e?f(e9,{card:!0,children:t}):t}'));
  assert.ok(c96.includes('f(Ytt,{wrapUp:t.wrapUp,prompt:t.prompt,unanswered:e}),t.prompt),t.wrapUp,e):$[274];return J2($,275,Et,n)?K2($,275,Et,n,n9(Et,n)):$[277]}'));
});

test('R7T-04: under the renderer main.jsx sits the settled receipt in TranscriptInsetRow card (SSR: e9 default card, data-code-own-row)', async () => {
  const main = read('src/main.jsx');
  assert.ok(main.includes('import { TranscriptInsetRow } from "./generated/code-transcript/code-transcript.mjs";'));
  assert.ok(main.includes('if(item.settledTurnBox){const box=<SourceSettledTurnBox {...item.settledTurnBox}/>;return <SourceTranscriptRowBoundary key={item.id} sessionId={current} item={item} kind="row">{codeRendererOn ? <TranscriptInsetRow card>{box}</TranscriptInsetRow> : box}</SourceTranscriptRowBoundary>;}'));
  assert.equal(read('src/source-settled-turn-box.jsx').includes('Host difference'), false);
  const S = await server.ssrLoadModule('/src/source-settled-turn-box.jsx');
  const wrapUp = { recap: 'Fixed the parser.', blocked: false, next: { ask: 'Commit the fix?', actions: [{ kind: 'send', label: 'Yes, commit', message: 'Commit the fix now' }] } };
  const box = React.createElement(S.SourceSettledTurnBox, { wrapUp, promptRow: null, unanswered: true });
  const bare = renderToStaticMarkup(box);
  const carded = renderToStaticMarkup(React.createElement(Root.TranscriptInsetRow, { card: true }, box));
  assert.ok(bare.includes('Fixed the parser.'));
  assert.equal(bare.includes('data-code-own-row'), false);
  assert.match(carded, /data-code-own-row=""/);
  assert.ok(carded.includes(bare), 'the receipt itself is unchanged inside the card');
});
