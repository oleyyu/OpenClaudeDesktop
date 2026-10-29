import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// w13-close-rail-regen (cwui-46; closeout surfaces-nav-01): the Pinned section's one-time drag-pin coachmark of Claude
// Desktop 3.6556.2 (shared-22 aM), drawn by src/source-drag-pin-hint.jsx over the generated CdsCoachmark (shared-frame Sj)
// and pinnedSectionMessages (shared-22 rM) of scripts/extract-session-rail.mjs, which pins aM's call on the original bytes.
// Source only: the official chunk text, the generated modules, the store and the element the component returns (the
// coachmark itself opens after its 0.3 s intro, so SSR markup is empty by design). The official chunks are read, never
// executed.
const app = path.resolve(import.meta.dirname, '..');
const snapshot = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(snapshot, name), 'utf8');
const local = rel => fs.readFileSync(path.join(app, rel), 'utf8');
const h = React.createElement;

const storage = new Map();
globalThis.localStorage = { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };

let server, hint, coachmark, messages, viewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  const i18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  i18n.setLocale('en-US');
  hint = await server.ssrLoadModule('/src/source-drag-pin-hint.jsx');
  coachmark = await server.ssrLoadModule('/src/generated/session-rail/coachmark.mjs');
  messages = await server.ssrLoadModule('/src/generated/session-rail/pinned-section-messages.mjs');
  viewTabs = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(() => server?.close());

test('the official coachmark call, its state and its triggers (3.6556.2 text)', () => {
  const s22 = official('shared-22-Bwn3sJTG.js');
  assert.ok(s22.includes('Ae&&t===je&&!Ne&&o(j,{open:!0,onOpenChange:(e,t)=>!e&&t?.reason!=="outside-press"&&ke(),anchor:ze,side:gd("inline-end",oe),introDelay:.3,"aria-label":Me,showClose:!0,children:f("div",{className:"flex flex-row items-start gap-sm min-w-[13rem]",children:[o(L,{name:"Hand",size:"md",className:"shrink-0"}),o("p",{children:Me})]})})'));
  assert.ok(s22.includes('W.formatMessage(rM.dragPinHint,{kind:G&&t==="chat"?"code":t})'));
  assert.ok(official('shared-11-_AVGLHEz.js').includes('t||J.getState().maybeShowDragPinHint()'), 'a menu pin asks for the hint');
  assert.ok(official('shared-21-R7LldJ05.js').includes('t.type==="pin"&&o?.()'), 'a drag pin calls onFirstPin (markDragPinHintSeen)');
  assert.ok(official('shared-52-uHFNjl7C.js').includes('maybeShowDragPinHint:()=>e(e=>e.seenDragPinHint||e.collapsed||Hg(e)||e.isRouteDrilldown?e:{showDragPinHint:!0})'));
  // The generator pins the same call sites (one copy of each original; --check is verify-gen-session-rail's).
  const manifest = JSON.parse(local('src/generated/session-rail/manifest.json'));
  assert.deepEqual(manifest.publicNames.CdsCoachmark, { file: 'shared-frame-6jtSkIit.js', local: 'Sj', target: 'coachmark.mjs' });
  assert.deepEqual(manifest.publicNames.pinnedSectionMessages, { file: 'shared-22-Bwn3sJTG.js', local: 'rM', target: 'pinned-section-messages.mjs' });
  assert.match(local('src/generated/session-rail/coachmark.mjs'), /import \{ Sj \} from "\.\.\/cowork-scheduled\/shared-frame-6jtSkIit\.mjs";/);
  assert.ok(manifest.callSites.some(c => c.raw && c.source === 'shared-22-Bwn3sJTG.js' && c.features.some(f => f.includes('introDelay:.3'))));
});

test('pinnedSectionMessages is rM verbatim; zh-CN has the hint', async () => {
  assert.deepEqual(messages.pinnedSectionMessages.dragPinHint, {
    defaultMessage: 'Tip: you can drag {kind, select, code {sessions} cowork {tasks} other {chats}} here to pin them', id: '3R0FD3r1RO' });
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.match(zh['Tip: you can drag {kind, select, code {sessions} cowork {tasks} other {chats}} here to pin them'], /^提示：.*\{kind, select, code \{会话\} cowork \{任务\} other \{聊天\}\}/);
});

test('store: shows once after a menu pin, not while collapsed, never again once seen (persisted)', () => {
  const store = hint.dragPinHintStore;
  storage.clear(); store.reset();
  store.maybeShowDragPinHint({ collapsed: true });
  assert.equal(store.getState().showDragPinHint, false, 'collapsed: unchanged');
  store.maybeShowDragPinHint();
  assert.equal(store.getState().showDragPinHint, true);
  store.markDragPinHintSeen();
  assert.deepEqual(store.getState(), { seenDragPinHint: true, showDragPinHint: false });
  assert.equal(storage.get(hint.SEEN_DRAG_PIN_HINT_KEY), 'true');
  store.reset();
  store.maybeShowDragPinHint();
  assert.equal(store.getState().showDragPinHint, false, 'seen (read back from localStorage): no hint');
  storage.clear(); store.reset();
});

test('DragPinHintCoachmark returns aM\'s coachmark element (Sj, Hand icon, the hint for the sidebar kind)', () => {
  const store = hint.dragPinHintStore;
  storage.clear(); store.reset();
  const anchor = { current: null };
  let element;
  const Probe = props => { element = hint.DragPinHintCoachmark(props); return null; };
  renderToStaticMarkup(h(Probe, { kind: 'cowork', anchor }));
  assert.equal(element, null, 'nothing until a menu pin asks');
  store.maybeShowDragPinHint();
  for (const [kind, noun] of [['cowork', 'tasks'], ['chat', 'chats'], ['code', 'sessions']]) {
    renderToStaticMarkup(h(Probe, { kind, anchor }));
    const label = `Tip: you can drag ${noun} here to pin them`;
    assert.equal(element.type, coachmark.CdsCoachmark);
    const { open, anchor: a, side, introDelay, showClose, children } = element.props;
    assert.deepEqual({ open, side, introDelay, showClose, label: element.props['aria-label'] }, { open: true, side: 'right', introDelay: 0.3, showClose: true, label });
    assert.equal(a, anchor);
    assert.equal(children.type, 'div');
    assert.equal(children.props.className, 'flex flex-row items-start gap-sm min-w-[13rem]');
    const [icon, p] = children.props.children;
    assert.equal(icon.type, viewTabs.CdsIcon);
    assert.deepEqual(icon.props, { name: 'Hand', size: 'md', className: 'shrink-0' });
    assert.equal(p.type, 'p');
    assert.equal(p.props.children, label);
  }
  renderToStaticMarkup(h(Probe, { kind: 'cowork', anchor, hidden: true }));
  assert.equal(element, null, 'the sidebar is hidden (shared-52 u_)');
  // onOpenChange: an outside press keeps it (showClose), its close marks it seen.
  renderToStaticMarkup(h(Probe, { kind: 'cowork', anchor }));
  element.props.onOpenChange(false, { reason: 'outside-press' });
  assert.equal(store.getState().showDragPinHint, true);
  element.props.onOpenChange(false, { reason: 'close-press' });
  assert.deepEqual(store.getState(), { seenDragPinHint: true, showDragPinHint: false });
  storage.clear(); store.reset();
});

test('the sidebar wires it: menu pin asks, drag pin marks seen, coachmark under the Pinned heading', () => {
  const sidebar = local('src/source-sidebar.jsx');
  // w13-close-cowork-sidebar: both layouts ask (the sections layout's Pinned bucket draws it too).
  assert.match(sidebar, /if \(args\[0\] === "pin"\) dragPinHintStore\.maybeShowDragPinHint\(\{ collapsed: !!collapsed \}\);/);
  assert.match(sidebar, /if \(outcome\.type === "pin"\) dragPinHintStore\.markDragPinHintSeen\(\);/);
  assert.match(sidebar, /ref=\{group\.kind === "pinned" \? pinnedHeadingRef : undefined/);
  assert.match(sidebar, /\{group\.kind === "pinned" && <DragPinHintCoachmark kind=\{mode\} anchor=\{pinnedHeadingRef\} hidden=\{!!collapsed\} \/>\}/);
});
