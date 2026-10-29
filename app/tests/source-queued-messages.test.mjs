import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// B05 C3: the queue bar's 'Send now' (2.31226.0 cf74bc599 :6926-7262 oS single row, aS ArrowReturn button with its
// hidden description, nS row menu). SSR of the single-entry bar; the row menu is covered by its source order.
let server, Q;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Q = await server.ssrLoadModule('/src/source-queued-messages.jsx');
});
after(() => server?.close());
const noop = () => {};
const entry = { id: 'q1', preview: 'run the tests', input: [] };
const render = props => renderToStaticMarkup(React.createElement(Q.SourceQueuedMessages, { entries: [entry], onCancel: noop, onEdit: noop, ...props }));
const labels = html => [...html.matchAll(/<button[^>]*aria-label="([^"]+)"/g)].map(match => match[1]);

test('a running turn offers Send now first, then Edit in composer and Remove from queue (oS order)', () => {
  const html = render({ onSteer: noop, coreName: 'DeepSeek' });
  assert.deepEqual(labels(html), ['Send now', 'Edit in composer', 'Remove from queue']);
  const describedBy = /aria-label="Send now"[^>]*aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert.ok(describedBy, 'the button is described by its note');
  assert.match(html, new RegExp(`<span id="${describedBy.replace(/[:]/g, '\\$&')}" hidden="">DeepSeek reads this message at its next step.</span>`));
});

test('no Send now while idle or when sendNow refuses the entry', () => {
  assert.deepEqual(labels(render({})), ['Edit in composer', 'Remove from queue']);
  assert.deepEqual(labels(render({ onSteer: noop, sendNow: () => false })), ['Edit in composer', 'Remove from queue']);
});

test('while the entry is being sent only the busy Send now remains, with the Sending… label', () => {
  const html = render({ onSteer: noop, lockedIds: ['q1'], steeringId: 'q1' });
  assert.deepEqual(labels(html), ['Send now']);
  assert.match(html, /aria-label="Send now" aria-busy="true"/);
  assert.match(html, /Sending…/);
  assert.doesNotMatch(html, /Removing…/);
  // A plain in-flight removal still shows the busy X.
  const removing = render({ onSteer: noop, lockedIds: ['q1'] });
  assert.deepEqual(labels(removing), ['Remove from queue']);
  assert.match(removing, /Removing…/);
});

test('the row menu lists Edit in composer, Send now, then the separated Remove from queue (nS items)', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(path.resolve(import.meta.dirname, '../src/source-queued-messages.jsx'), 'utf8');
  // w12b-composer: the ⋮ menu and the row's context menu share QueuedMenuItems (3.6556.2 cf74bc599 BE `R`).
  const menu = source.slice(source.indexOf('function QueuedMenuItems'), source.indexOf('function RowMenu'));
  const order = ['t("Edit in composer")', 't("Send now")', '<Menu.Separator />', 't("Remove from queue")'].map(text => menu.indexOf(text));
  assert.ok(order.every(index => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), 'menu order');
  assert.match(menu, /disabled=\{locked \|\| steerBusy\}/, 'one promotion at a time');
});
