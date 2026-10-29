// w11-e31-terminal-cont: the terminal find bar (src/source-terminal-find.jsx) against 3.6556.2 c6bf19e8f rn.
//   - the root is the CDS Surface (shared-frame cg, exported Dl; view-tabs CdsSurface) with rn's props: elevation
//     "panel", role search, data-terminal-find, rn's className and the layer-aware z-index 13, plus `{[N]: ""}` with N =
//     shared-156 Ln = "data-escape-owner";
//   - the Surface's sg style variables and its panel class reach the markup (they were missing while cg was not
//     published);
//   - the step buttons show cmd+g / cmd+shift+g only on macOS in the main window (rn k), Close always shows esc;
//   - the bar's context menu stays out of the terminal's (rn en, the desktop branch of de).
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { withMemoCache } from './support/react-memo-cache.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL_V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(OFFICIAL_V3, name), 'utf8');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const h = React.createElement;
let server, Find, ViewTabs;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceTerminalFind: Find } = await server.ssrLoadModule('/src/source-terminal-find.jsx'));
  ViewTabs = await server.ssrLoadModule('/src/generated/view-tabs/index.js');
});
after(async () => { await server?.close(); });

const props = { view: { current: null }, selectionSuppressed: { current: false }, onClose() {} };
const render = (extra = {}) => renderToStaticMarkup(h(Find, { ...props, ...extra }));
const onMac = fn => {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'window'), previous = globalThis.window;
  globalThis.window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } };
  try { return fn(); } finally { if (had) globalThis.window = previous; else delete globalThis.window; }
};
// The bar's own tree (forwardRef render) with a minimal dispatcher, to reach the root element's handlers.
function tree(extra = {}) {
  const cells = []; let cursor = 0;
  const dispatcher = withMemoCache({
    useContext: context => context._currentValue,
    useState(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: typeof value === 'function' ? value() : value }; return [cells[index].value, () => {}]; },
    useRef(value) { const index = cursor++; if (!cells[index]) cells[index] = { value: { current: value } }; return cells[index].value; },
    useMemo(fn) { cursor++; return fn(); }, useCallback(fn) { cursor++; return fn; },
    useId() { return `id-${cursor++}`; },
    useEffect() { cursor++; }, useLayoutEffect() { cursor++; }, useInsertionEffect() { cursor++; }, useImperativeHandle() { cursor++; },
    useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  });
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, previous = internals.H;
  internals.H = dispatcher;
  try { return Find.render({ ...props, ...extra }, null); } finally { internals.H = previous; }
}

test('official 3.6556.2: rn renders the Surface (shared-frame Dl = cg) with data-escape-owner (shared-156 Ln) and steps by menu only on macOS in the main window', () => {
  const rn = official('c6bf19e8f-CgQ1_Jhf.js');
  assert.ok(rn.includes('n(u,{elevation:"panel",role:"search","data-terminal-find":"",className:"absolute top-2 right-5 flex items-center gap-xs p-xs",style:h,onKeyDown:A,onContextMenu:de,...fe,children:Se})'));
  assert.ok(rn.includes('de=p?en:$t,fe=J0($,27)?K0($,27,{[N]:""}):$[27]'));
  assert.ok(rn.includes('let k=ie?.onFindStepRequested!==void 0&&!w&&ce()?Qt:void 0'));
  for (const name of ['Dl as u', 'Ln as N', 'zd as ee', 'mE as ce', 'vh as x']) assert.ok(rn.includes(name), name);
  const frame = official('shared-frame-6jtSkIit.js');
  assert.ok(frame.includes('cg as Dl') && frame.includes('co as zd'));
  assert.ok(frame.includes('function co(){let e=so();return e!==void 0&&e!==globalThis.window}'));
  const shared156 = official('shared-156-BLTosN8U.js');
  assert.ok(shared156.includes('iq="data-escape-owner"') && shared156.includes('iq as Ln'));
  // view-tabs publishes cg as CdsSurface (and so as useCdsOwnerWindow, the reader of co); proposal-group's slice of
  // shared-156 exports iq under the official alias Ln.
  const manifest = JSON.parse(read('src/generated/view-tabs/manifest.json'));
  assert.deepEqual(manifest.publicNames.CdsSurface, { file: 'shared-frame-6jtSkIit.js', local: 'cg', export: 'Dl' });
  assert.equal(manifest.publicNames.useCdsOwnerWindow.local, 'so');
  assert.match(read('src/generated/proposal-group/shared-156-BLTosN8U.js'), /var iq = "data-escape-owner";[\s\S]*export \{[^}]*\biq as Ln\b/);
});

test('host: the bar imports CdsSurface through the view-tabs facade and restates neither the Surface nor its context', () => {
  const host = read('src/source-terminal-find.jsx');
  assert.match(host, /import \{[^}]*\bCdsSurface\b[^}]*\} from '\.\/generated\/view-tabs\/index\.js'/);
  assert.match(host, /import \{Ln as escapeOwnerAttribute\} from '\.\/generated\/proposal-group\/shared-156-BLTosN8U\.js'/);
  const code = host.replace(/^\s*\/\/.*$/gm, '');
  for (const gone of ['data-cds="Surface"', 'data-surface=', 'cdsSurfaceClass', 'CdsSurfaceContext', 'stp-find']) assert.ok(!code.includes(gone), gone);
  assert.ok(!read('src/source-terminal-pane.css').includes('.stp-find'));
});

test('SSR: the root is the panel Surface with rn\'s props, the sg variables and z-index 13; the field and three buttons sit inside it', () => {
  const html = render();
  const root = /^<div [^>]*>/.exec(html)?.[0];
  assert.ok(root, html);
  for (const attr of ['data-cds="Surface"', 'data-surface="panel"', 'role="search"', 'data-terminal-find=""', 'data-escape-owner=""']) assert.ok(root.includes(attr), attr);
  const classes = /class="([^"]*)"/.exec(root)[1].split(/\s+/);
  // ig("panel") then rn's className.
  assert.deepEqual(classes, ['rounded-card', 'bg-surface-2', 'shadow-panel-sm', 'forced-colors:border', 'forced-colors:border-solid',
    'forced-colors:border-[color:CanvasText]', 'absolute', 'top-2', 'right-5', 'flex', 'items-center', 'gap-xs', 'p-xs']);
  const style = /style="([^"]*)"/.exec(root)[1];
  assert.match(style, /--cds-page-bg:var\(--cds-surface-2\)/);
  assert.match(style, /--cds-focus-shadow:inset 0 0 0 1px var\(--cds-page-bg\), 0 0 0 1px var\(--cds-fill-accent\)/);
  assert.match(style, /--cds-focus-shadow-danger:/);
  assert.match(style, /z-index:13$/);
  assert.match(html, /<div data-cds="TextInput"[^>]*\bw-48"/);
  assert.equal((html.match(/<button /g) ?? []).length, 3);
  for (const label of ['Previous match', 'Next match', 'Close find bar']) assert.ok(html.includes(`aria-label="${label}"`), label);
});

test('SSR: Previous/Next show their step shortcuts only on macOS (rn k); Close always shows esc', () => {
  const plain = render();
  assert.deepEqual(plain.match(/aria-keyshortcuts="[^"]*"/g), ['aria-keyshortcuts="Escape"']);
  const mac = onMac(() => render());
  assert.equal((mac.match(/aria-keyshortcuts="[^"]*"/g) ?? []).length, 3);
  const buttons = onMac(() => tree()).props.children.props.children.filter(node => node?.type === ViewTabs.CdsButton);
  assert.deepEqual(buttons.map(node => node.props.shortcut), ['cmd+shift+g', 'cmd+g', 'esc']);
  assert.deepEqual(tree().props.children.props.children.filter(node => node?.type === ViewTabs.CdsButton).map(node => node.props.shortcut), [undefined, undefined, 'esc']);
});

test('the root element is view-tabs CdsSurface; its key and context-menu handlers follow rn A / en', () => {
  let closed = 0;
  const root = tree({ onClose: () => { closed += 1; } });
  assert.equal(root.type, ViewTabs.CdsSurface);
  assert.equal(root.props.elevation, 'panel');
  assert.equal(root.props['data-escape-owner'], '');
  assert.deepEqual(root.props.style, { zIndex: 13 });
  // Escape closes; Enter on the root is the field's (rn M).
  const key = (keyName, extra = {}) => {
    const event = { key: keyName, defaultPrevented: false, stopped: false, currentTarget: null, nativeEvent: { key: keyName, isComposing: false, keyCode: 0, ...extra },
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
    root.props.onKeyDown(event);
    return event;
  };
  const enter = key('Enter');
  assert.equal(enter.defaultPrevented || enter.stopped, false);
  const escape = key('Escape');
  assert.ok(escape.defaultPrevented && escape.stopped);
  assert.equal(closed, 1);
  // rn A: an IME Escape (keyCode 229) is still taken but does not close; a composing Escape is left alone.
  const official229 = official('c6bf19e8f-CgQ1_Jhf.js');
  assert.ok(official229.includes('e.key==="Escape"&&!e.nativeEvent.isComposing?(e.preventDefault(),e.stopPropagation(),tn("Escape",e.currentTarget),e.keyCode!==229&&c())'));
  const ime = (() => { const event = { key: 'Escape', keyCode: 229, defaultPrevented: false, stopped: false, currentTarget: null, nativeEvent: { key: 'Escape', isComposing: false, keyCode: 229 },
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } }; root.props.onKeyDown(event); return event; })();
  assert.ok(ime.defaultPrevented && ime.stopped);
  assert.equal(closed, 1);
  const composing = key('Escape', { isComposing: true });
  assert.equal(composing.defaultPrevented || composing.stopped, false);
  assert.equal(closed, 1);
  // en: a press on the bar (outside the field) with a collapsed selection drops the native menu; inside the field
  // with nothing selected around it, the native menu (Cut/Copy/Paste) stays. Both stop at the bar.
  const menu = target => {
    const doc = { getSelection: () => ({ rangeCount: 1, toString: () => '', getRangeAt: () => ({ collapsed: true, intersectsNode: () => false }) }) };
    const bar = { ownerDocument: doc, contains: node => node === target, nodeType: 1, matches: () => false };
    const event = { target, currentTarget: bar, defaultPrevented: false, stopped: false,
      nativeEvent: { composedPath: () => [target, bar] },
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
    root.props.onContextMenu(event);
    return event;
  };
  const onBar = menu({ nodeType: 1, closest: () => null, matches: () => false });
  assert.ok(onBar.stopped && onBar.defaultPrevented);
  const field = { nodeType: 1, closest: selector => (selector === 'input' ? field : null), matches: selector => selector.includes('input') };
  const inField = menu(field);
  assert.ok(inField.stopped);
  assert.equal(inField.defaultPrevented, false);
});
