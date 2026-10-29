// w11-e31-terminal-cont: the terminal pane pieces that were host stand-ins until this lane, against 3.6556.2.
//   - the selection action strip: c6bf19e8f Si around ceb49ada3 u (generated/code-current/terminal-action-bar.mjs);
//   - the body context menu: cccc2cf0a iS kf = c0cdf4a08 g (session-rail-changes' RowContextMenu, D1) with cS's items
//     as view-tabs CdsContextMenu items;
//   - the close confirmation: cccc2cf0a Zx Ie, CdsRoot density comfortable around CdsConfirmationDialog.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const ROOT = path.resolve(import.meta.dirname, '..');
const OFFICIAL_V3 = path.join(ROOT, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const official = name => fs.readFileSync(path.join(OFFICIAL_V3, name), 'utf8');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const h = React.createElement;
let server, Selection, Bar, Marker;
before(async () => {
  server = await createServer({ configFile: false, root: ROOT, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Selection = await server.ssrLoadModule('/src/source-terminal-selection.jsx');
  Bar = await server.ssrLoadModule('/src/generated/code-current/terminal-action-bar.mjs');
  Marker = await server.ssrLoadModule('/src/generated/session-rail-changes/context-menu-marker.mjs');
});
after(async () => { await server?.close(); });

test('official 3.6556.2: Si wraps ceb49ada3 u (B) with one Attach as context action at the layer-aware z-index 12', () => {
  const terminal = official('c6bf19e8f-CgQ1_Jhf.js');
  for (const text of ['import{t as B}from"./ceb49ada3-COmVjFwx.js"', 'p=J1($,4,i)?K1($,4,i,[{key:"attach",label:f,shortcut:"cmd+shift+l",onSelect:i}]):$[5]',
    'n(B,{actions:p})', 'n("div",{ref:o,className:"absolute -translate-x-1/2 -translate-y-full",style:m,children:h})', 'mi=12', 's=g(mi)'])
    assert.equal(count(terminal, text), 1, text);
  const bar = official('ceb49ada3-COmVjFwx.js');
  assert.match(bar, /export\{u as t\};\s*$/);
  assert.ok(bar.includes('import{n as s}from"./cd59309dc-BZMawR8Y.js"'));
});

test('generated: the action bar is ceb49ada3 u with view-tabs parts and the one context-menu-open store', () => {
  const text = read('src/generated/code-current/terminal-action-bar.mjs');
  assert.match(text, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  assert.match(text, /cdsSurfaceClass as r,\s+CdsButton as i,\s+ariaKeyShortcuts as a,\s+useIsMacPlatform as o,\s+\} from "\.\.\/view-tabs\/shared-frame-6jtSkIit\.js";/);
  assert.match(text, /import \{ useContextMenuOpenInWindow as s \} from "\.\.\/session-rail-changes\/context-menu-marker\.mjs";/);
  assert.match(text, /export \{ u as SelectionActionBar \};$/m);
  // The body menu (RowContextMenu) renders the marker from that same module, so opening it hides the bar.
  assert.match(read('src/generated/session-rail-changes/row-context-menu.mjs'), /import \{ ContextMenuOpenMarker as d \} from "\.\/context-menu-marker\.mjs";/);
  const manifest = JSON.parse(read('src/generated/code-current/manifest.json'));
  const entry = manifest.modules.find(module => module.target === 'terminal-action-bar.mjs');
  assert.deepEqual([entry.referenceVersion, path.basename(entry.source), entry.bindings], ['3.6556.2', 'ceb49ada3-COmVjFwx.js', ['c', 'l', 'u', 'd']]);
});

test('SSR: TerminalSelectionAction is Si: the anchored wrapper at z-index 12 around the popover split strip with Attach as context', () => {
  const html = renderToStaticMarkup(h(Selection.TerminalSelectionAction, { anchor: { x: 10, y: 10, sel: null }, onAttach() {} }));
  assert.match(html, /^<div class="absolute -translate-x-1\/2 -translate-y-full" style="z-index:12"><div class="rounded-card bg-surface-3 shadow-panel !rounded group\/split flex ">/);
  assert.match(html, /<button [^>]*data-cds="Button"[^>]*data-cds-ghost=""[^>]*aria-keyshortcuts="Control\+Shift\+l"[^>]*>[\s\S]*Attach as context[\s\S]*<\/button><\/div><\/div>$/);
  assert.doesNotMatch(html, /stp-selection-action|visibility:hidden|w-px my-\[7px\]/);
  const host = read('src/source-terminal-selection.jsx');
  for (const gone of ['SourceSettingsButton', 'SourceTooltip', 'stp-selection-action', 'ResizeObserver']) assert.ok(!host.includes(gone), gone);
  assert.ok(!read('src/source-terminal-pane.css').includes('stp-selection-action'));
});

test('SSR: the bar hides while a context menu is open in the window, a hairline separates actions, toggles pad the row', () => {
  const actions = [{ key: 'a', label: 'One', onSelect() {} }, { key: 'b', icon: 'Pin', ariaLabel: 'Pin', pressed: true, onSelect() {} }];
  assert.equal(renderToStaticMarkup(h(Bar.SelectionActionBar, { actions: [] })), '');
  const html = renderToStaticMarkup(h(Bar.SelectionActionBar, { actions }));
  assert.match(html, /^<div class="rounded-card bg-surface-3 shadow-panel !rounded group\/split flex p-xs">/);
  assert.match(html, /<span aria-hidden="true" class="w-px my-\[7px\] bg-alpha-2 shrink-0 transition-opacity motion-reduce:transition-none group-hover\/split:opacity-0 group-focus-within\/split:opacity-0"><\/span>/);
  assert.match(html, /aria-label="Pin"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Pin"/);
  // cd59309dc: an open context menu counts in its window's entry; the bar reads it and turns invisible.
  const store = Marker.useContextMenuOpenInWindow;
  assert.equal(typeof store, 'function');
  const text = read('src/generated/session-rail-changes/context-menu-marker.mjs');
  assert.match(text, /\(t\) => t\.byWindow\.has\(e\)/);
  assert.match(read('src/generated/code-current/terminal-action-bar.mjs'), /var l = \{ visibility: "hidden" \};[\s\S]*_ = m \? l : void 0/);
});

test('body menu: cccc2cf0a iS kf (c0cdf4a08 g) around the terminal; Le needs a live terminal; cS items are CdsContextMenu items', () => {
  const pane = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of ['import{n as Of,t as kf}from"./c0cdf4a08-C69Ng1c8.js"', 'u(kf,{onContextMenu:Le,onOpenChange:we,trigger:Je,children:Xe})',
    'Le=J1($,107,b)?K1($,107,b,e=>{if(!od(b)){e.preventDefault();return}Ne(wd(b))})'])
    assert.equal(count(pane, text), 1, text);
  assert.match(read('src/generated/session-rail-changes/row-context-menu.mjs'), /^\/\/ Original Claude Desktop 3\.6556\.2 bindings from c0cdf4a08-C69Ng1c8\.js/);
  assert.match(read('src/generated/session-rail-changes/row-context-menu.mjs'), /export \{ g as RowContextMenu \};$/m);
  const host = read('src/source-terminal-pane.jsx');
  assert.match(host, /import \{ RowContextMenu \} from "\.\/generated\/session-rail-changes\/row-context-menu\.mjs";/);
  assert.match(host, /import \{ CdsConfirmationDialog, CdsContextMenu, CdsRoot \} from "\.\/generated\/view-tabs\/index\.js";/);
  assert.match(host, /<RowContextMenu\n\s+onContextMenu=\{\(event\) => \{\n\s+const term = viewRef\.current\?\.term;\n\s+if \(!term\) \{ event\.preventDefault\(\); return; \}\n\s+setBodySelection\(term\.getSelection\(\) \|\| ""\);/);
  assert.match(host, /trigger=\{<div ref=\{host\} className="stp-host"/);
  assert.match(host, /if \(term && terminalOwnsContextMenu\(term, event\.nativeEvent\)\) event\.preventDefault\(\);/);
  // cS order: (Attach + separator), Copy, Paste, separator, Select all, separator, Clear terminal.
  const menu = host.slice(host.indexOf('<RowContextMenu'), host.indexOf('</RowContextMenu>'));
  const items = [...menu.matchAll(/<CdsContextMenu\.Separator \/>|\{t\(["']([^"']+)["']\)\}<\/CdsContextMenu\.Item>/g)].map(match => match[1] ?? '-');
  assert.deepEqual(items, ['Attach selection as context', '-', 'Copy', 'Paste', '-', 'Select all', '-', 'Clear terminal']);
  const cS = pane.slice(pane.indexOf('function cS('), pane.indexOf('function lS('));
  for (const text of ['p=l||d?"cmd+c":"ctrl+shift+c"', 'y=l||d?"cmd+v":"ctrl+shift+v"', 'C=l?"cmd+a":void 0', 'u(me.Item,{shortcut:p,disabled:m,onClick:i,children:_})'])
    assert.ok(cS.includes(text), text);
  assert.doesNotMatch(host, /SourceMenu|bodyMenu|contextMenuGuard/);
});

test('body menu focus hand-back: cccc2cf0a $x/eS/tS/nS, we arms on close, Ee refocuses on the trigger\'s mouseup; Attach reads X("attachTerminalOutput")', async () => {
  const pane = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of [
    'var $x=null;function eS(){let e=$x;$x=null,e?.forget()}function tS(e){eS(),e.addEventListener("pointerdown",eS,!0),$x={doc:e,forget:()=>e.removeEventListener("pointerdown",eS,!0)}}function nS(e){let t=$x?.doc===e;return eS(),t}',
    'e?eS():tS(ke(me.current))', 'nS(e)&&(e.activeElement===null||e.activeElement===e.body)&&Ra(b)', 'onMouseUp:Ee',
    'function wS(){return eS}', 'C(wS,Te)', 'shortcut:X("attachTerminalOutput",c)', 'vh as Ie', 'g as X', '$ as Ra'])
    assert.equal(count(pane, text), 1, text);
  assert.ok(official('shared-7-DBAgAi5H.js').includes('function RB(e){window.dispatchEvent(new CustomEvent(FB,{detail:{ptyKey:e}}))}'));
  assert.ok(official('shared-46-BIbZBGFq.js').includes('iR as g,'));
  const host = read('src/source-terminal-pane.jsx');
  assert.match(host, /onOpenChange=\{\(open\) => \{ if \(open\) disarmMenuFocusReturn\(\); else if \(host\.current\) armMenuFocusReturn\(host\.current\.ownerDocument\); \}\}/);
  assert.match(host, /if \(takeMenuFocusReturn\(doc\) && \(doc\.activeElement === null \|\| doc\.activeElement === doc\.body\)\) focusTerminal\(\);/);
  assert.match(host, /useEffect\(\(\) => disarmMenuFocusReturn, \[\]\);/);
  assert.match(host, /<CdsContextMenu\.Item shortcut=\{commandShortcut\("attachTerminalOutput", true\)\}/);
  // The port behaves as eS/tS/nS: armed until the document's next captured pointerdown, taken once.
  const start = host.indexOf('let menuFocusReturnArm = null;'), end = host.indexOf('\n}\n', host.indexOf('function takeMenuFocusReturn')) + 2;
  const port = new Function(`${host.slice(start, end)}; return { disarmMenuFocusReturn, armMenuFocusReturn, takeMenuFocusReturn };`)();
  const doc = () => { const listeners = new Set(); return { listeners,
    addEventListener(type, fn, capture) { if (type === 'pointerdown' && capture === true) listeners.add(fn); },
    removeEventListener(type, fn, capture) { if (type === 'pointerdown' && capture === true) listeners.delete(fn); },
    pointerdown() { for (const fn of [...listeners]) fn(); } }; };
  const a = doc(), b = doc();
  port.armMenuFocusReturn(a);
  assert.equal(port.takeMenuFocusReturn(b), false);
  assert.equal(a.listeners.size, 0);
  port.armMenuFocusReturn(a);
  assert.equal(port.takeMenuFocusReturn(a), true);
  assert.equal(port.takeMenuFocusReturn(a), false);
  port.armMenuFocusReturn(a); a.pointerdown();
  assert.equal(port.takeMenuFocusReturn(a), false);
  port.armMenuFocusReturn(a); port.disarmMenuFocusReturn();
  assert.equal(port.takeMenuFocusReturn(a), false);
  assert.equal(a.listeners.size, 0);
  // X = shared-46 iR (commandShortcut): attachTerminalOutput has no `when`/`mac` filter, so cmd+shift+l on every platform.
  const { commandShortcut } = await import('../src/generated/session-rail-changes/command-shortcut.mjs');
  assert.equal(commandShortcut('attachTerminalOutput', true), 'cmd+shift+l');
});

test('close confirmation: cccc2cf0a Zx Ie is CdsRoot density comfortable around CdsConfirmationDialog (epitaxy-root, danger)', () => {
  const pane = official('cccc2cf0a-DhZC33Gc.js');
  for (const text of ['Xc as ne', 'yd as be',
    'u(be,{density:"comfortable",className:"contents",children:u(ne,{className:"epitaxy-root break-words",open:!0,onOpenChange:ge,onConfirm:he,confirmVariant:"danger"'])
    assert.ok(pane.includes(text), text);
  const names = JSON.parse(read('src/generated/view-tabs/manifest.json')).publicNames;
  assert.deepEqual([names.CdsRoot.export, names.CdsConfirmationDialog.export], ['yd', 'Xc']);
  const host = read('src/source-terminal-pane.jsx');
  assert.match(host, /<CdsRoot density="comfortable" className="contents">\n\s+<CdsConfirmationDialog className="epitaxy-root break-words" open\n\s+onOpenChange=\{\(open\) => \{ if \(!open\) setConfirm\(null\); \}\} onConfirm=\{confirmed\} confirmVariant="danger"/);
  assert.doesNotMatch(host, /SourceConfirmationDialog/);
});
