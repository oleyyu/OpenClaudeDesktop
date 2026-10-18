import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';

// R3-terminal FT-15 (terminal-10): the shared view-tab strip's overflow menu row is the original 2.42304.0 cfe7c4b3b ce
// (generated/code-current/terminal-tab-overflow.mjs), rendered by source-preview-tab-overflow.jsx for both the Preview
// and the terminal strips. Server render for the markup (Vite SSR, as the pane render tests), and the row's own handlers
// driven with controlled events through a test hook dispatcher (D21).
const app = path.resolve(import.meta.dirname, '..');
let server, O, M, Row;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Row = await server.ssrLoadModule('/src/generated/code-current/terminal-tab-overflow.mjs');
  O = await server.ssrLoadModule('/src/source-preview-tab-overflow.jsx');
  M = await server.ssrLoadModule('/src/source-menu.jsx');
});
after(async () => { await server?.close(); });
const h = React.createElement;
const LABELS = { moreTabs: 'More terminals', closeTab: 'Close terminal', closeTabHint: 'press right arrow to close', closeTabHintRtl: 'press left arrow to close',
  closeTabDeleteHint: 'Press Delete or Backspace to close the terminal' };
// SourceMenu.Popup portals into document.body (createPortal is the identity here); a body stand-in is enough on the server.
function withDocument(run) {
  const had = 'document' in globalThis;
  if (!had) globalThis.document = { body: { nodeType: 1 }, documentElement: null };
  try { return run(); } finally { if (!had) delete globalThis.document; }
}
const render = (props) => withDocument(() => renderToStaticMarkup(h(O.SourcePreviewTabOverflow, { anchor: null, onActivate() {}, onCloseTab() {}, onClose() {}, ...props })));
const menu = (props) => render({ labels: LABELS, ...props });

test('the row markup is the original ce: gap-sm item, overflow-tooltip label, caption, CDS X close box', () => {
  const html = menu({ tabs: [{ id: 'a', label: 'Terminal 1', detail: 'npm run dev' }, { id: 'b', label: 'Terminal 2' }] });
  const close = html.match(/<span id="([^"]+)" class="source-sr-only">press right arrow to close<\/span>/)?.[1];
  const remove = html.match(/<span id="([^"]+)" class="source-sr-only">Press Delete or Backspace to close the terminal<\/span>/)?.[1];
  assert.ok(close && remove);
  // ce: O.Item (the host SourceMenu.Item) with className gap-sm, described by both hints while closable.
  assert.equal((html.match(new RegExp(`aria-describedby="${close} ${remove}" role="menuitem" tabindex="-1" class="smenu-item gap-sm"`, 'g')) || []).length, 2);
  assert.match(html, /class="smenu-item gap-sm"/);
  // The label is CdsOverflowTooltip (shared-frame gm) in text-body; the running command is the text-caption muted caption.
  assert.match(html, /<span class="flex min-w-0 flex-col"><span class="text-body"><span data-cds="OverflowTooltip" class="block min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap"[^>]*>Terminal 1<\/span><\/span><span class="text-caption text-muted-as-secondary"><span data-cds="OverflowTooltip"[^>]*>npm run dev<\/span><\/span><\/span>/);
  // The trailing close box: pointer-only (aria-hidden, title), the 2.42304.0 text-muted-as-secondary class and R's
  // closeBox, the CDS X glyph at closeGlyph "xs".
  assert.match(html, /<span aria-hidden="true" title="Close terminal" class="grid shrink-0 cursor-interactive place-items-center rounded-sm text-muted-as-secondary hover:bg-fill-ghost-hover hover:text-primary size-\[calc\(1\.25rem\*var\(--cds-rem-scale,1\)\)\]"><span data-cds="Icon" style="font-size:calc\(0\.75rem \* var\(--cds-rem-scale, 1\)\);[^"]*" aria-hidden="true">\uE10F<\/span><\/span>/);
  assert.doesNotMatch(html, /text-muted hover|pl-\[2px\]/);
});

test('a row that cannot close has no hint and no X; the close hint goes when no row can close', () => {
  let html = menu({ tabs: [{ id: 'a', label: 'Loading', closable: false }, { id: 'b', label: 'Page' }] });
  assert.match(html, /press right arrow to close/);
  assert.equal((html.match(/title="Close terminal"/g) || []).length, 1);
  assert.equal((html.match(/aria-describedby="[^"]+" role="menuitem"/g) || []).length, 1, 'only the closable row is described');
  assert.equal((html.match(/role="menuitem"/g) || []).length, 2);
  html = menu({ tabs: [{ id: 'a', label: 'Loading', closable: false }] });
  assert.doesNotMatch(html, /press right arrow to close/, 'se: `g && _` — no closable row, no close hint');
  // The Preview default copy (no labels) is the strip's own.
  html = render({ tabs: [{ id: 'a', label: 'Docs', detail: 'https://example.com/' }] });
  assert.match(html, /aria-label="More tabs"/);
  assert.match(html, /title="Close tab"/);
});

// A hook dispatcher for calling the row as a function (useCallback returns the callback), and a window stand-in that
// keeps listeners by (type, capture) as a browser does.
function rowProps(props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = { useCallback: (fn) => fn, useContext: (context) => context._currentValue };
  try { return Row.TabOverflowItem({ hintIds: 'h d', closeLabel: 'Close terminal', sizes: Row.tabOverflowSizes, onActivate() {}, ...props }); }
  finally { internal.H = old; }
}
function windowStandIn() {
  const listeners = new Set(), capture = (options) => (typeof options === 'boolean' ? options : !!options?.capture);
  return {
    listeners,
    addEventListener: (type, fn, options) => { listeners.add({ type, fn, capture: capture(options) }); },
    removeEventListener: (type, fn, options) => { for (const entry of listeners) if (entry.fn === fn && entry.type === type && entry.capture === capture(options)) listeners.delete(entry); },
    dispatchEvent: (event) => { for (const entry of [...listeners]) if (entry.type === event.type) entry.fn(event); },
  };
}
const keyEvent = (key, extra = {}, view = windowStandIn()) => {
  const event = { key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, prevented: false, stopped: false,
    currentTarget: { nodeType: 1, ownerDocument: { defaultView: view } }, ...extra };
  event.preventDefault = () => { event.prevented = true; };
  event.stopPropagation = () => { event.stopped = true; };
  return event;
};

test('terminal-10: a close key with Control, Meta or Alt is left alone; plain ArrowRight/Delete/Backspace close once', () => {
  const closed = [];
  const element = rowProps({ tab: { id: 't2', label: 'Terminal 2' }, onClose: (id) => closed.push(id) });
  assert.equal(element.type, M.SourceMenu.Item, 'O.Item is the host menu item');
  const { onKeyDown } = element.props;
  for (const [key, modifier] of [['Backspace', 'metaKey'], ['ArrowRight', 'altKey'], ['Delete', 'ctrlKey'], ['ArrowRight', 'metaKey']]) {
    const event = keyEvent(key, { [modifier]: true });
    onKeyDown(event);
    assert.deepEqual([event.prevented, event.stopped, closed.length], [false, false, 0], `${modifier}+${key}`);
  }
  for (const key of ['ArrowRight', 'Delete', 'Backspace']) {
    const event = keyEvent(key);
    onKeyDown(event);
    assert.deepEqual([event.prevented, event.stopped], [true, true], key);
  }
  assert.deepEqual(closed, ['t2', 't2', 't2']);
  // Other keys pass through to the menu (navigation, Enter activates).
  const down = keyEvent('ArrowDown');
  onKeyDown(down);
  assert.equal(down.prevented, false);
  // Shift is not a blocking modifier in ce.
  const shifted = keyEvent('Delete', { shiftKey: true });
  onKeyDown(shifted);
  assert.equal(closed.length, 4);
});

test('a held close key closes one row: repeats only preventDefault, and the window swallows them after the close (dZ)', () => {
  const closed = [], view = windowStandIn();
  const { onKeyDown } = rowProps({ tab: { id: 't1', label: 'Terminal 1' }, onClose: (id) => closed.push(id) }).props;
  const repeat = keyEvent('Delete', { repeat: true }, view);
  onKeyDown(repeat);
  assert.deepEqual([repeat.prevented, closed.length, view.listeners.size], [true, 0, 0], 'e.repeat returns before closing');
  onKeyDown(keyEvent('Delete', {}, view));
  assert.deepEqual(closed, ['t1']);
  assert.deepEqual([...view.listeners].map((entry) => [entry.type, entry.capture]).sort(), [['keydown', true], ['keyup', true]], 'shared-19 dZ on the row window');
  // The next row takes focus; the held key's repeats never reach it.
  const held = { type: 'keydown', key: 'Delete', repeat: true, prevented: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
  view.dispatchEvent(held);
  assert.deepEqual([held.prevented, held.stopped], [true, true]);
  view.dispatchEvent({ type: 'keyup', key: 'Delete' });
  assert.equal(view.listeners.size, 0, 'released: the guard is gone');
});

test('RTL flips the close arrow (I); a row that cannot close ignores every key; a middle click closes', () => {
  const closed = [];
  let { onKeyDown } = rowProps({ tab: { id: 'r', label: 'R' }, rtl: true, onClose: (id) => closed.push(id) }).props;
  onKeyDown(keyEvent('ArrowRight'));
  assert.equal(closed.length, 0);
  onKeyDown(keyEvent('ArrowLeft'));
  assert.deepEqual(closed, ['r']);
  const fixed = rowProps({ tab: { id: 'p', label: 'Placeholder', closable: false }, onClose: (id) => closed.push(id) }).props;
  const event = keyEvent('Delete');
  fixed.onKeyDown(event);
  assert.deepEqual([event.prevented, closed.length, fixed.trailing, fixed['aria-describedby']], [false, 1, undefined, undefined]);
  const props = rowProps({ tab: { id: 'm', label: 'Middle' }, onClose: (id) => closed.push(id) }).props;
  const down = { button: 1, prevented: false, preventDefault() { this.prevented = true; } };
  props.onMouseDown(down);
  assert.equal(down.prevented, true, 'no autoscroll on a middle press');
  props.onAuxClick({ button: 1, preventDefault() {} });
  props.onAuxClick({ button: 2, preventDefault() {} });
  assert.deepEqual(closed, ['r', 'm']);
});

test('the menu restates se: typeahead Backspace, the L reset keys (through I in RTL)', () => {
  assert.deepEqual([...Row.tabOverflowTypeaheadResetKeys], ['ArrowUp', 'ArrowDown', 'Home', 'End', 'ArrowRight', 'Delete']);
  assert.equal(Row.tabOverflowRtlKey('ArrowLeft'), 'ArrowRight');
  assert.equal(Row.tabOverflowRtlKey('ArrowRight'), 'ArrowLeft');
  assert.equal(Row.tabOverflowRtlKey('Home'), 'Home');
  // The capture handler of the rows container, called with controlled events.
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = { useContext: (context) => context._currentValue, useId: () => `:r${id++}:`, useRef: (value) => ({ current: value }), useLayoutEffect() {} };
  let tree;
  try { tree = O.SourcePreviewTabOverflow({ anchor: null, labels: LABELS, tabs: [{ id: 'a', label: 'A' }], onActivate() {}, onCloseTab() {}, onClose() {} }); }
  finally { internal.H = old; }
  const rows = tree.props.children;
  const capture = rows.props.onKeyDownCapture;
  const key = (k, extra = {}) => keyEvent(k, extra);
  capture(key('a'));
  const backspace = key('Backspace');
  capture(backspace);
  assert.deepEqual([backspace.prevented, backspace.stopped], [true, true], 'the first Backspace after typing clears the typeahead');
  const second = key('Backspace');
  capture(second);
  assert.equal(second.prevented, false, 'a fresh Backspace reaches the row and closes it');
  capture(key('a'));
  capture(key('ArrowDown'));
  const after = key('Backspace');
  capture(after);
  assert.equal(after.prevented, false, 'navigation reset the typeahead');
});
