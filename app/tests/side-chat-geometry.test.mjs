import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import postcss from 'postcss';
import { sideChatRect, sideChatResizeHandles, sideChatResizeCursor, moveSideChat, resizeSideChat } from '../src/side-chat-geometry.mjs';
import { designSnapshot, designStylesheets } from '../scripts/current-design-assets.mjs';
import { selectorClasses } from '../scripts/prepare-style-compatibility.mjs';

const latest = new URL(`../../reference/${designSnapshot}/ion-dist/assets/v1/`, import.meta.url);
// The side-chat module is the 3.6556.2 slice (w10-editor-side-chat): cd97b284f e and cccc2cf0a EF/DF.
const sliced = new URL('../../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1/', import.meta.url);
let server, S;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  S = await server.ssrLoadModule('/src/source-side-chat.jsx');
});
after(() => server?.close());

const viewport = { width: 1280, height: 820 };
test('original default and anchor placement use 320px width and 340px capped height', () => {
  assert.deepEqual(sideChatRect({ viewport }), { width: 320, height: 340, left: 936, top: 392 });
  assert.deepEqual(sideChatRect({ viewport, topInset: 45, endInset: 12, anchor: { right: 1000, bottom: 700, height: 216 } }),
    { width: 320, height: 200, left: 668, top: 492 });
});
test('saved panels retain the nearer edge on viewport changes and enforce minimum dimensions', () => {
  const saved = { width: 420, height: 400, left: 820, top: 360, viewport };
  assert.deepEqual(sideChatRect({ saved, viewport: { width: 1000, height: 700 }, topInset: 45 }),
    { width: 420, height: 400, left: 540, top: 240 });
  const tiny = sideChatRect({ saved, viewport: { width: 300, height: 220 }, topInset: 45 });
  assert.deepEqual(tiny, { width: 280, height: 160, left: 0, top: 45 });
});
test('all eight handles use original resize cursor directions', () => {
  assert.equal(sideChatResizeHandles.length, 8);
  assert.deepEqual(sideChatResizeHandles.map(({ edges }) => sideChatResizeCursor(edges)),
    ['ns-resize', 'ns-resize', 'ew-resize', 'ew-resize', 'nwse-resize', 'nesw-resize', 'nesw-resize', 'nwse-resize']);
});
test('west/north resizing stops at minimum and preserves opposite edges', () => {
  const rect = { left: 500, top: 300, width: 320, height: 340 };
  assert.deepEqual(resizeSideChat(rect, { w: true, n: true }, { x: 900, y: 900 }, viewport, 45),
    { left: 540, top: 480, width: 280, height: 160 });
  assert.deepEqual(resizeSideChat(rect, { w: true, n: true }, { x: -900, y: -900 }, viewport, 45),
    { left: 16, top: 61, width: 804, height: 579 });
});
test('east/south resizing observes 16px margin while dragging reaches the viewport edges', () => {
  const rect = { left: 500, top: 300, width: 320, height: 340 };
  assert.deepEqual(resizeSideChat(rect, { e: true, s: true }, { x: 900, y: 900 }, viewport, 45),
    { left: 500, top: 300, width: 764, height: 504 });
  assert.deepEqual(moveSideChat(rect, { x: -900, y: -900 }, viewport, 45), { ...rect, left: 0, top: 45 });
  assert.deepEqual(moveSideChat(rect, { x: 900, y: 900 }, viewport, 45), { ...rect, left: 960, top: 480 });
});

test('3.6556.2 handles: DF geometry classes verbatim (n/s use inset-x-[8px]), all in the loaded stylesheets', async () => {
  const source = await fs.readFile(new URL('cccc2cf0a-DhZC33Gc.js', sliced), 'utf8');
  const handles = Function(`return ${source.match(/var DF=(\[\{edges:[\s\S]*?\}\]),OF=/)[1]}`)();
  assert.deepEqual(sideChatResizeHandles, handles);
  assert.equal(sideChatResizeHandles[0].className, '-top-[3px] inset-x-[8px] h-[6px]');
  assert.equal(sideChatResizeHandles[1].className, '-bottom-[3px] inset-x-[8px] h-[6px]');
  assert.ok(sideChatResizeHandles.every(({ className }) => !/(?:^|\s)(?:left|right)-\[8px\]/.test(className)));
  const loaded = new Set();
  for (const name of designStylesheets) postcss.parse(await fs.readFile(new URL(name, latest), 'utf8')).walkRules(rule => selectorClasses(rule.selector).forEach(c => loaded.add(c)));
  for (const token of ['draggable-none', 'absolute', 'z-[1]', ...sideChatResizeHandles.flatMap(({ className }) => className.split(/\s+/))])
    assert.ok(loaded.has(token), `${token} is in the current design stylesheets`);
});

test('3.6556.2 rect: rtl defaults off (LTR placement unchanged) and mirrors the default/anchored start edge', () => {
  assert.deepEqual(sideChatRect({ viewport, rtl: false }), sideChatRect({ viewport }));
  assert.deepEqual(sideChatRect({ viewport, rtl: true }), { width: 320, height: 340, left: 24, top: 392 });
  assert.deepEqual(sideChatRect({ viewport, rtl: true, endInset: 12, anchor: { left: 200, right: 1000, bottom: 700, height: 216 } }),
    { width: 320, height: 200, left: 212, top: 492 });
});

test('SourceSideChat renders each handle as the original DF.map element: draggable-none absolute z-[1] + DF class, touch-action none', () => {
  const html = renderToStaticMarkup(React.createElement(S.SourceSideChat, { threadId: 'geometry', open: true, onClose() {}, rpc: async () => ({}) }));
  const handles = [...html.matchAll(/<div aria-hidden="true" class="([^"]*)" data-edge="([nswe]+)" style="([^"]*)"><\/div>/g)];
  assert.equal(handles.length, 8);
  handles.forEach(([, className, edge, style], index) => {
    const handle = sideChatResizeHandles[index];
    assert.equal(className, `ssc-resize draggable-none absolute z-[1] ${handle.className}`);
    assert.equal(edge, ['n', 's', 'w', 'e'].filter(key => handle.edges[key]).join(''));
    assert.equal(style, `touch-action:none;cursor:${sideChatResizeCursor(handle.edges)}`);
  });
  const windowed = renderToStaticMarkup(React.createElement(S.SourceSideChat, { threadId: 'geometry-window', open: true, windowed: true, onClose() {}, rpc: async () => ({}) }));
  assert.doesNotMatch(windowed, /data-edge=/);
});

// w10-editor-side-chat: the compiled 3.6556.2 hooks (c96d752d0 V6 over working-line EE, c80ec48f8 mn) run under the
// host React with the view-tabs compiler helpers (SSR through Vite, the way the app loads them).
test('3.6556.2 compiled status hook V6 holds the waiting label on first render', async () => {
  const { SourceSideChatStatus } = await server.ssrLoadModule('/src/source-side-chat-status.jsx');
  const status = await fs.readFile(new URL('../src/generated/code-editor/side-chat-status.mjs', import.meta.url), 'utf8');
  assert.match(status, /import \{ EE \} from "\.\.\/working-line\/working-line\.mjs";/);
  assert.match(status, /reactMemoCache as J9/);
  const props = { status: 'thinking', thinkingSince: Date.now(), progress: { stage: 'waiting' }, awaitingAnswer: true, assistantName: 'DeepSeek' };
  const html = renderToStaticMarkup(React.createElement(SourceSideChatStatus, props));
  assert.match(html, /data-side-status="running"/);
  assert.match(html, /class="source-shimmer sts-activity">[^<]*DeepSeek[^<]*<\/span>/);
  const idle = renderToStaticMarkup(React.createElement(SourceSideChatStatus, { ...props, status: 'idle' }));
  assert.match(idle, /data-side-status="idle"/);
  assert.doesNotMatch(idle, /sts-activity/);
});
test('3.6556.2 compiled selection hook mn renders no toolbar without a range', async () => {
  const { SourceTranscriptSelection } = await server.ssrLoadModule('/src/source-transcript-selection.jsx');
  const html = renderToStaticMarkup(React.createElement(SourceTranscriptSelection, { containerRef: { current: null }, actions: { threadId: 'sel', onAttachText() {} } }));
  assert.equal(html, '');
});
