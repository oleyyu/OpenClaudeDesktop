import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { referenceSnapshot } from '../scripts/official-3.6556.2.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

// R3-terminal FT-15 (terminal-10): the shared view-tab strip's overflow menu row is the original cfe7c4b3b row
// (generated/code-current/terminal-tab-overflow.mjs; 3.6556.2 se since cc-rest-terminal-b, 2.42304.0 ce), rendered by
// source-preview-tab-overflow.jsx for both the Preview and the terminal strips. Server render for the markup (Vite SSR, as the pane render tests), and the row's own handlers
// driven with controlled events through a test hook dispatcher (D21).
// w10-trans-tab-overflow (L125): the row's `_` is view-tabs CdsDropdown (shared-frame Jo, as in 3.6556.2 cfe7c4b3b se) and
// the menu is ae's CDS dropdown Root/Popup, not the host SourceMenu. A Base UI popup portals only once mounted, so the
// server render draws the rows inside an open CdsDropdown.Root (as tests/sidebar-group-menus-current.test.mjs does)
// and the menu's own element tree is read through the dispatcher.
const app = path.resolve(import.meta.dirname, '..');
const v3 = path.join(app, '..', 'reference', referenceSnapshot, 'ion-dist/assets/v1');
let server, O, V, Row;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    // ws: false as the other SSR tests: no HMR WebSocket on 24678, which a parallel Vite may hold (E40).
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Row = await server.ssrLoadModule('/src/generated/code-current/terminal-tab-overflow.mjs');
  O = await server.ssrLoadModule('/src/source-preview-tab-overflow.jsx');
  V = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(async () => { await server?.close(); });
const h = React.createElement;
const LABELS = { moreTabs: 'More terminals', closeTab: 'Close terminal', closeTabHint: 'press right arrow to close', closeTabHintRtl: 'press left arrow to close',
  closeTabDeleteHint: 'Press Delete or Backspace to close the terminal' };
// The menu called as a function (useContext reads the default, useId counts, useRef is a box, the effect is not run).
let ids = 0;
function menuTree(props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache({ useContext: (context) => context._currentValue, useId: () => `:m${ids++}:`, useRef: (value) => ({ current: value }), useEffect() {} });
  try { return O.SourcePreviewTabOverflow({ anchor: null, onActivate() {}, onCloseTab() {}, onClose() {}, ...props }); }
  finally { internal.H = old; }
}
// The popup's rows and the Root's hint spans, server-rendered inside an open CdsDropdown.Root (the popup portal itself
// renders nothing on the server).
function render(props) {
  const [popup, ...rest] = [menuTree(props).props.children].flat();
  return renderToStaticMarkup(h(V.CdsDropdown.Root, { open: true }, popup.props.children, ...rest));
}
const menu = (props) => render({ labels: LABELS, ...props });
const ROW = 'class="cds-reset flex w-full items-center compact:px-2 comfortable:px-2.5 ';

test('the row markup is the original se: CDS dropdown gap-sm item, overflow-tooltip label, caption, CDS X close box', () => {
  const html = menu({ tabs: [{ id: 'a', label: 'Terminal 1', detail: 'npm run dev' }, { id: 'b', label: 'Terminal 2' }] });
  const close = html.match(/<span id="([^"]+)" class="sr-only">press right arrow to close<\/span>/)?.[1];
  const remove = html.match(/<span id="([^"]+)" class="sr-only">Press Delete or Backspace to close the terminal<\/span>/)?.[1];
  assert.ok(close && remove);
  // se: _.Item (view-tabs CdsDropdown.Item, shared-frame dT) with className gap-sm, described by both hints while closable.
  const described = new RegExp(`<div role="menuitem" id="base-ui-[^"]*" tabindex="-1" aria-describedby="${close} ${remove}" ${ROW}[^"]* gap-sm">`, 'g');
  assert.equal((html.match(described) || []).length, 2);
  // The leading/trailing slots are the CDS item's own (label in min-w-0 flex-1 truncate, trailing ms-md flex …).
  assert.match(html, /<span class="min-w-0 flex-1 truncate"><span class="flex min-w-0 flex-col">/);
  assert.match(html, /<span class="ms-md flex shrink-0 items-center gap-xs"><span aria-hidden="true" title="Close terminal"/);
  assert.doesNotMatch(html, /smenu-item|source-sr-only/, 'no host SourceMenu markup');
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
  assert.equal((html.match(/role="menuitem"[^>]*aria-describedby="[^"]+"/g) || []).length, 1, 'only the closable row is described');
  assert.equal((html.match(/role="menuitem"/g) || []).length, 2);
  html = menu({ tabs: [{ id: 'a', label: 'Loading', closable: false }] });
  assert.doesNotMatch(html, /press right arrow to close/, 'ae: `ee && te && g` — no closable row, no close hint');
  // The Preview default copy (no labels) is the strip's own; the popup is named by it (the host trigger's label).
  html = render({ tabs: [{ id: 'a', label: 'Docs', detail: 'https://example.com/' }] });
  assert.match(html, /title="Close tab"/);
  const [popup] = menuTree({ tabs: [{ id: 'a', label: 'Docs' }] }).props.children;
  assert.equal(popup.props['aria-label'], 'More tabs');
});

test('L125: the menu is ae\'s CDS dropdown — Root (open, onOpenChange) around Popup (bottom/end, I, ne) and the hints', () => {
  const closed = [], tabs = [{ id: 'a', label: 'Terminal 1' }, { id: 'b', label: 'Terminal 2' }];
  const anchor = { nodeType: 1 };
  const root = menuTree({ labels: LABELS, tabs, anchor, className: 'spv-overflow-menu stp-overflow-menu', onClose: () => closed.push('close') });
  assert.equal(root.type, V.CdsDropdown.Root, 'ae `_.Root` (view-tabs CdsDropdown, shared-frame GT)');
  assert.equal(root.props.open, true, 'mounted only while the strip shows the menu');
  const [popup, hint, remove] = root.props.children;
  assert.equal(popup.type, V.CdsDropdown.Popup);
  assert.deepEqual([popup.props.side, popup.props.align, popup.props.anchor, popup.props.className], ['bottom', 'end', anchor, 'spv-overflow-menu stp-overflow-menu']);
  const context = { prevented: false, preventDefault() { this.prevented = true; } };
  popup.props.onContextMenu(context);
  assert.equal(context.prevented, true, 'ae I: e.preventDefault()');
  assert.equal(typeof popup.props.onKeyDownCapture, 'function', 'ae ne on the popup');
  // C: the rows sit in the CDS tooltip provider at 700ms; each row is se (TabOverflowItem) with ae's props.
  const provider = popup.props.children;
  assert.deepEqual([provider.type, provider.props.delay], [V.CdsTooltipProvider, 700]);
  const rows = provider.props.children;
  assert.deepEqual(rows.map((row) => [row.type, row.key, row.props.arrowCloses, row.props.closeLabel, row.props.sizes]),
    tabs.map((tab) => [Row.TabOverflowItem, tab.id, true, 'Close terminal', Row.tabOverflowSizes]));
  assert.equal(rows[0].props.hintIds, `${hint.props.id} ${remove.props.id}`, 'ae: hintIds g ? `${b} ${c}` : c');
  // j and the delete hint are the Root's own children (siblings of the popup), sr-only.
  assert.deepEqual([hint.type, hint.props.className, remove.props.className], ['span', 'sr-only', 'sr-only']);
  // T: a close of the Root reports onClose; an open does not.
  root.props.onOpenChange(true);
  assert.deepEqual(closed, []);
  root.props.onOpenChange(false);
  assert.deepEqual(closed, ['close']);
  // The official ae, as shipped (3.6556.2 cfe7c4b3b), and the CDS dropdown parts it uses (shared-frame GT).
  const official = readFileSync(path.join(v3, 'cfe7c4b3b-BF79K6ux.js'), 'utf8');
  for (const text of ['n(_.Popup,{side:"bottom",align:"end",onContextMenu:I,onKeyDownCapture:ne,children:re})', 'a(_.Root,{onOpenChange:T,children:[O,A,j]})',
    'function I(e){e.preventDefault()}', 'ee&&te&&g&&n("span",{id:b,className:"sr-only"', 'n(C,{delay:700,children:k})'])
    assert.ok(official.includes(text), text);
  assert.ok(readFileSync(path.join(v3, 'shared-frame-6jtSkIit.js'), 'utf8').includes('Popup:cT,Item:dT'));
  // The Base UI menu popup restores focus when the focused row goes (restoreFocus), so the host keeps no restore of its own.
  assert.ok(readFileSync(path.join(v3, 'vendor-frame-CnSY1sxv.js'), 'utf8').includes('initialFocus:_.type!=="menu",restoreFocus:!0'));
  const host = readFileSync(path.join(app, 'src/source-preview-tab-overflow.jsx'), 'utf8');
  const code = host.split('\n').filter((line) => !line.trimStart().startsWith('//')).join('\n');
  assert.doesNotMatch(code, /SourceMenu|source-menu\.jsx|contextMenuGuard|pendingFocus/);
  assert.match(host, /import \{ CdsDropdown, CdsTooltipProvider, DirectionContext \} from '\.\/generated\/view-tabs\/index\.js';/, 'R6: the facade');
});

test('L125: the generated row renders the CDS dropdown item (view-tabs CdsDropdown = shared-frame Jo)', () => {
  // w12-viewtabs (D1): the row is view-tabs' ViewTabOverflowItem (cfe7c4b3b se) re-exported, whose `_` is shared-frame Jo.
  const generated = readFileSync(path.join(app, 'src/generated/code-current/terminal-tab-overflow.mjs'), 'utf8');
  assert.match(generated, /ViewTabOverflowItem as TabOverflowItem,[\s\S]*\} from "\.\.\/view-tabs\/cfe7c4b3b-BF79K6ux\.js";/);
  assert.doesNotMatch(generated, /source-terminal-adapters|TerminalMenu/);
  const viewTabsRow = readFileSync(path.join(app, 'src/generated/view-tabs/cfe7c4b3b-BF79K6ux.js'), 'utf8');
  assert.match(viewTabsRow, /^import \{GT as _\} from "\.\/shared-frame-6jtSkIit\.js";$/m);
  assert.match(viewTabsRow, /n\(_\.Item,\{/);
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8'));
  assert.deepEqual(manifest.publicNames.CdsDropdown, { file: 'shared-frame-6jtSkIit.js', local: 'GT', export: 'Jo' });
  assert.deepEqual(manifest.publicNames.ViewTabOverflowItem, { file: 'cfe7c4b3b-BF79K6ux.js', local: 'se' });
  assert.ok(readFileSync(path.join(v3, 'shared-frame-6jtSkIit.js'), 'utf8').includes('GT as Jo'));
  // The row element's type is the CDS item.
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache({ useCallback: (fn) => fn, useContext: (context) => context._currentValue });
  let element;
  try { element = Row.TabOverflowItem({ tab: { id: 'a', label: 'A' }, hintIds: 'h d', arrowCloses: true, closeLabel: 'Close', sizes: Row.tabOverflowSizes, onActivate() {}, onClose() {} }); }
  finally { internal.H = old; }
  assert.equal(element.type, V.CdsDropdown.Item);
});

// A hook dispatcher for calling the row as a function (useCallback returns the callback), and a window stand-in that
// keeps listeners by (type, capture) as a browser does.
function rowProps(props) {
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  internal.H = withMemoCache({ useCallback: (fn) => fn, useContext: (context) => context._currentValue });
  // The menu (ae) always passes arrowCloses (default true); the row itself closes on ArrowRight only with it.
  try { return Row.TabOverflowItem({ hintIds: 'h d', arrowCloses: true, closeLabel: 'Close terminal', sizes: Row.tabOverflowSizes, onActivate() {}, ...props }); }
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
  assert.equal(element.type, V.CdsDropdown.Item, 'se _.Item is the CDS dropdown item');
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
  internal.H = withMemoCache({ useContext: (context) => context._currentValue, useId: () => `:r${id++}:`, useRef: (value) => ({ current: value }), useEffect() {} });
  let tree;
  try { tree = O.SourcePreviewTabOverflow({ anchor: null, labels: LABELS, tabs: [{ id: 'a', label: 'A' }], onActivate() {}, onCloseTab() {}, onClose() {} }); }
  finally { internal.H = old; }
  const [popup] = tree.props.children;
  const capture = popup.props.onKeyDownCapture;
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

test('cc-rest-terminal-b (3.6556.2 se/ae): without arrowCloses ArrowRight neither closes nor is hinted; Delete still closes', () => {
  const closed = [];
  const { onKeyDown } = rowProps({ tab: { id: 'q', label: 'Q' }, arrowCloses: false, onClose: (id) => closed.push(id) }).props;
  const right = keyEvent('ArrowRight');
  onKeyDown(right);
  assert.deepEqual([right.prevented, closed.length], [false, 0], 'se: (o && t === "ArrowRight")');
  onKeyDown(keyEvent('Delete'));
  onKeyDown(keyEvent('Backspace'));
  assert.deepEqual(closed, ['q', 'q']);
  // The menu: the arrow hint is gone and each closable row is described by the delete hint alone (ae: hintIds
  // g ? `${b} ${c}` : c, `te && g`); by default both strips keep arrowCloses on.
  const html = menu({ arrowCloses: false, tabs: [{ id: 'a', label: 'Terminal 1' }, { id: 'b', label: 'Terminal 2' }] });
  assert.doesNotMatch(html, /press right arrow to close/);
  const remove = html.match(/<span id="([^"]+)" class="sr-only">Press Delete or Backspace to close the terminal<\/span>/)?.[1];
  assert.equal((html.match(new RegExp(`role="menuitem" id="base-ui-[^"]*" tabindex="-1" aria-describedby="${remove}" `, 'g')) || []).length, 2);
  assert.match(menu({ tabs: [{ id: 'a', label: 'Terminal 1' }] }), /press right arrow to close/);
  // The size table is view-tabs' viewTabSizes (cfe7c4b3b le), now with basisChromePx.
  assert.equal(Row.tabOverflowSizes.basisChromePx, 52);
  assert.equal(Row.tabOverflowSizes.tabIconShed, 'min-w-0 ps-[2px]');
  // Typeahead: ArrowRight resets it only while arrows close (ae: `ie.has(t) && (g || t !== "ArrowRight")`).
  const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
  let id = 0;
  internal.H = withMemoCache({ useContext: (context) => context._currentValue, useId: () => `:q${id++}:`, useRef: (value) => ({ current: value }), useEffect() {} });
  let tree;
  try { tree = O.SourcePreviewTabOverflow({ anchor: null, labels: LABELS, arrowCloses: false, tabs: [{ id: 'a', label: 'A' }], onActivate() {}, onCloseTab() {}, onClose() {} }); }
  finally { internal.H = old; }
  const capture = tree.props.children[0].props.onKeyDownCapture;
  capture(keyEvent('a'));
  capture(keyEvent('ArrowRight'));
  const backspace = keyEvent('Backspace');
  capture(backspace);
  assert.equal(backspace.prevented, true, 'ArrowRight left the typeahead in place');
});
