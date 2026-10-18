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

test('2.42304.0 handles: ck geometry classes verbatim (n/s use inset-x-[8px]), all in the loaded stylesheets', async () => {
  const source = await fs.readFile(new URL('cccc2cf0a-B0D--VZp.js', latest), 'utf8');
  const ck = Function(`return ${source.match(/var ck=(\[\{edges:[\s\S]*?\}\]),lk=/)[1]}`)();
  assert.deepEqual(sideChatResizeHandles, ck);
  assert.equal(sideChatResizeHandles[0].className, '-top-[3px] inset-x-[8px] h-[6px]');
  assert.equal(sideChatResizeHandles[1].className, '-bottom-[3px] inset-x-[8px] h-[6px]');
  assert.ok(sideChatResizeHandles.every(({ className }) => !/(?:^|\s)(?:left|right)-\[8px\]/.test(className)));
  const loaded = new Set();
  for (const name of designStylesheets) postcss.parse(await fs.readFile(new URL(name, latest), 'utf8')).walkRules(rule => selectorClasses(rule.selector).forEach(c => loaded.add(c)));
  for (const token of ['draggable-none', 'absolute', 'z-[1]', ...sideChatResizeHandles.flatMap(({ className }) => className.split(/\s+/))])
    assert.ok(loaded.has(token), `${token} is in the current design stylesheets`);
});

test('2.42304.0 rect: rtl defaults off (LTR placement unchanged) and mirrors the default/anchored start edge', () => {
  assert.deepEqual(sideChatRect({ viewport, rtl: false }), sideChatRect({ viewport }));
  assert.deepEqual(sideChatRect({ viewport, rtl: true }), { width: 320, height: 340, left: 24, top: 392 });
  assert.deepEqual(sideChatRect({ viewport, rtl: true, endInset: 12, anchor: { left: 200, right: 1000, bottom: 700, height: 216 } }),
    { width: 320, height: 200, left: 212, top: 492 });
});

test('SourceSideChat renders each handle as the original ck.map element: draggable-none absolute z-[1] + ck class, touch-action none', () => {
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
