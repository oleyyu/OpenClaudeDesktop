import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

// W14-code r7 r7c-01: the bar is the original cf74bc599 VE (generated/queued-bar): WE's single row is Send now (UE, the
// ArrowReturn ghost with its hidden note), Edit in composer, Remove from queue; the host's restatement is gone.
test('a running turn offers Send now first, then Edit in composer and Remove from queue (WE order)', () => {
  const html = render({ onSteer: noop });
  assert.deepEqual(labels(html), ['Send now', 'Edit in composer', 'Remove from queue']);
  const describedBy = /aria-label="Send now"[^>]*aria-describedby="([^"]+)"/.exec(html)?.[1];
  assert.ok(describedBy, 'the button is described by its note');
  // UE's note in the persona (E83): the English key names DeepSeek, which electron/i18n swaps for the running core.
  assert.match(html, new RegExp(`<span id="${describedBy.replace(/[:]/g, '\\$&')}" hidden="">DeepSeek reads this message at its next step.</span>`));
});

test('no Send now while idle or when sendNow refuses every entry', () => {
  assert.deepEqual(labels(render({})), ['Edit in composer', 'Remove from queue']);
  assert.deepEqual(labels(render({ onSteer: noop, sendNow: () => false })), ['Edit in composer', 'Remove from queue']);
});

test('the entry being sent shows Send now busy (c6b8adeaf vi); another operation in flight shows Remove busy (Ti)', () => {
  const html = render({ onSteer: noop, lockedIds: ['q1'], steeringId: 'q1' });
  // WE: `g = vg(t.id) || (r !== void 0 && a)` busies Send now. W14-code r7 复核: a locked lone entry keeps only that
  // busy control (the host's single row: Edit and the X withheld while it is sent).
  assert.match(html, /<button type="button" data-cds="Button" data-cds-icon-only="" data-cds-ghost=""[^>]* aria-busy="true"[^>]* aria-label="Send now"/);
  assert.deepEqual(labels(html), ['Send now']);
  const removing = render({ onSteer: noop, lockedIds: ['q1'] });
  // WE's X busy (`busy: h`, h = Cg); the lone entry is not VE-locked, or VE's single branch would drop the X.
  assert.match(removing, /aria-busy="true"[^>]* aria-label="Remove from queue"/);
  assert.deepEqual(labels(removing), ['Remove from queue'], 'no Edit / Send now on an entry with an operation in flight');
});

// W14-code r7 复核 (r7c-01): cc43287c9 passes VE `lockedIds:yn` (a Set); GE's `N = t.map(e => n?.has(e.id) === !0)`
// withholds a locked row's X / Edit / Send now / drag and Clear all skips it. The host hands VE its locked entries but
// the one being sent (whose Send now shows busy). GE opens collapsed, so the props VE receives are checked through a stub.
test('the locked entries but the one being sent reach VE as lockedIds (a Set)', async () => {
  const seen = [];
  globalThis.__queuedBarProps = seen;
  const stub = { name: 'queued-bar-stub', enforce: 'pre',
    resolveId(id, importer) { return id.endsWith('/generated/queued-bar/queued-bar.mjs') && importer?.endsWith('source-queued-messages.jsx') ? '\0queued-bar-stub' : null; },
    load(id) { return id === '\0queued-bar-stub' ? 'export function QueuedMessageBar(props) { globalThis.__queuedBarProps.push(props); return null; }' : null; } };
  const stubServer = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [stub, react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  try {
    const S = await stubServer.ssrLoadModule('/src/source-queued-messages.jsx');
    const entries = [entry, { id: 'q2', preview: 'lint', input: [] }, { id: 'q3', preview: 'ship', input: [] }];
    renderToStaticMarkup(React.createElement(S.SourceQueuedMessages, { entries, onCancel: noop, onEdit: noop, onSteer: noop, onReorder: noop, lockedIds: ['q1', 'q3'], steeringId: 'q1' }));
    const props = seen.at(-1);
    assert.ok(props.lockedIds instanceof Set);
    assert.deepEqual([...props.lockedIds], ['q3']);
    assert.equal(props.onEdit, noop);
    assert.equal(props.onSteer, noop);
    renderToStaticMarkup(React.createElement(S.SourceQueuedMessages, { entries, onCancel: noop, onEdit: noop, lockedIds: [] }));
    assert.equal(seen.at(-1).lockedIds, undefined);
  } finally {
    await stubServer.close();
    delete globalThis.__queuedBarProps;
  }
});

test('GE withholds a locked row\'s controls and Clear all skips it (the generated original)', () => {
  const generated = fs.readFileSync(new URL('../src/generated/queued-bar/queued-bar.mjs', import.meta.url), 'utf8');
  for (const text of ['(e) => n?.has(e.id) === !0', 'let e = t.filter((e) => !n?.has(e.id)).map(KE);', 'onCancel: N[t] ? void 0 : r,',
    'onEdit: A[t] || N[t] ? void 0 : c,', 'sortable: !!l && j[t] && !N[t],']) assert.ok(generated.includes(text), text);
});

test('the row menu is the original BE\'s (Edit in composer, Send now, then the separated danger Remove from queue)', () => {
  const generated = fs.readFileSync(new URL('../src/generated/queued-bar/queued-bar.mjs', import.meta.url), 'utf8');
  const order = ['defaultMessage: "Edit in composer"', 'defaultMessage: "Send now"', 'defaultMessage: "Remove from queue"'].map(text => generated.indexOf(text));
  assert.ok(order.every(index => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), 'menu order');
  assert.ok(generated.includes('defaultMessage: "Queued message actions"'));
});
