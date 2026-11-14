// W14-code r4 e90-gui: the E90 / E95 whole-block replacements that need the user's GUI check (r4pa-c03 pane windows
// without the inset, traffic lights in the header row) and the small items of this lane (fr4-13 gutter bleed and the
// chat-only start padding, fr4-11 What's new). Source-only checks (E61): official strings, SSR and the host source.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.join(app, '..', 'reference/snapshots/claude-3.6556.2-20261025-192807');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const official = (file) => fs.readFileSync(path.join(v3, 'ion-dist/assets/v1', file), 'utf8');

let server, Pane, Tiles, Model, GB;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  createRequire(path.join(app, 'package.json'))('react-dom').createPortal = (children) => children;
  Pane = await server.ssrLoadModule('/src/pane-window-header.jsx');
  Tiles = await server.ssrLoadModule('/src/source-tile-layout.jsx');
  Model = await server.ssrLoadModule('/src/tile-layout-model.mjs');
  GB = await server.ssrLoadModule('/src/host-growthbook.mjs');
});
after(async () => { await server?.close(); });

test('r4pa-c03 official: the pane window frame, its pane root, the header clearance and the lights row', () => {
  const frame = official('c3af3d0ed-DbJlbzjk.js');
  assert.ok(frame.includes('className:"dframe-root",...E,children:[D,O,k]'));
  assert.ok(frame.includes('className:"dframe-content","data-sim-native-ground":""'));
  const chrome = official('cd377abb5-CVY99d5c.js');
  assert.ok(chrome.includes('{"--df-popout-zoom-out":b,...x,isolation:"isolate"}'));
  assert.ok(chrome.includes('{containerProps:{"data-popout":y,style:S}}'));
  assert.ok(chrome.includes('Nr=12,Pr={x:14,y:8+Math.round((32-Nr)/2)};function Fr(e){return{x:Pr.x,y:Math.round(e-Nr/2)}}'));
  const pane = official('c5638815a-C5PjpJjD.js');
  assert.ok(pane.includes('"epitaxy-root text-body text-primary break-words epitaxy-pane-window flex h-full w-full select-none flex-col bg-surface-1"'));
  assert.ok(pane.includes('isTopLeft:!0,dragHandle:null'));
  const styles = official('shared-styles-D_GJawPO.css');
  assert.ok(styles.includes('.dframe-root[data-popout=traffic-lights]{--df-popout-lights-room:calc(68px / var(--df-popout-zoom-out,1))}'));
  assert.ok(styles.includes('.dframe-root[data-popout=traffic-lights] .epitaxy-pane-window [data-top-left]{margin-left:calc(var(--df-popout-lights-room) + 8px);--top-left-clearance:calc(var(--df-popout-lights-room) + 8px)}'));
  assert.ok(official('c6a992d55-Che1orl5.css').includes(':where(a,button,input,label,select,textarea,summary,[contenteditable],[role=button],[role=checkbox],[role=radio],[role=switch],[role=tab]),.draggable-none{app-region:no-drag}'));
});

test('r4pa-c03 host: the popout props, the switch and the pane window header pieces', () => {
  assert.equal(GB.hostGrowthBookFlag('local_popout_traffic_lights'), true, 'the switch is open');
  assert.deepEqual(Pane.popoutFrameProps({ zoomFactor: 1.25 }), { 'data-popout': 'traffic-lights', style: { '--df-popout-zoom-out': 1, isolation: 'isolate' } });
  assert.deepEqual(Pane.popoutFrameProps({ zoomFactor: 0.8 }).style['--df-popout-zoom-out'], 0.8);
  assert.equal(Pane.popoutFrameProps({ trafficLights: false }), null, 'full screen / not macOS');
  assert.equal(Pane.popoutFrameProps({ enabled: false }), null, 'the rollback switch closed');
  assert.deepEqual({ ...Pane.PANE_WINDOW_TILE_CONFIG }, { ...Model.TILE_CONFIG, padding: 0 });
  function Header() { return React.createElement('header', { className: 'source-pane-header', ...Pane.usePaneWindowHeaderProps() }, React.createElement(Pane.PaneWindowDragStrip), 'Tasks'); }
  assert.equal(renderToStaticMarkup(React.createElement(Header)), '<header class="source-pane-header">Tasks</header>', 'a tile header is unchanged');
  assert.equal(renderToStaticMarkup(React.createElement(Pane.PaneWindowContext.Provider, { value: true }, React.createElement(Header))),
    '<header class="source-pane-header" data-top-left=""><div class="draggable absolute inset-0 -z-[1]" aria-hidden="true"></div>Tasks</header>');
  // Every pane a window can show asks for both pieces: Files / Changes / Plan, Terminal and the /btw pane; Tasks is the official
  // pane frame since the session-page relink (SP-2), which takes them as Tn's own leadingClearance (`"data-top-left": ce ||
  // void 0`) and window-drag strip (`!V && t("div", {className: "draggable absolute inset-0 -z-[1]", "aria-hidden": !0})`).
  {
    const agent = read('src/source-agent.jsx');
    assert.match(agent, /const leadingClearance=usePaneWindowHeaderProps\(\)!==null;/);
    assert.match(agent, /<PaneFrame style=\{PANE_FRAME_STYLE\} leadingClearance=\{leadingClearance\}/);
    assert.doesNotMatch(agent, /noWindowDrag/);
    const c4d = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '../../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1'), 'c4db265df-CHyZjtsm.js'), 'utf8');
    assert.ok(c4d.includes('"data-top-left":le,'));
    assert.ok(c4d.includes('className:"draggable absolute inset-0 -z-[1]","aria-hidden":!0'));
  }
  for (const [file, open] of [['src/source-session.jsx', 'data-pane-header={tab} {...paneWindowHeader}>'],
    ['src/source-terminal-pane.jsx', 'data-pane-header="terminal" {...paneWindowHeader}>'], ['src/source-btw-pane.jsx', 'data-pane-header="session" {...paneWindowHeader}>']]) {
    const source = read(file), at = source.indexOf(open);
    assert.ok(at > 0, file);
    assert.match(source.slice(at, at + 120), /<PaneWindowDragStrip ?\/>/, file);
    assert.match(source, /const paneWindowHeader ?= ?usePaneWindowHeaderProps\(\);/, file);
  }
});

test('r4pa-c03 host: main.jsx wires both window kinds; the old band and inset are the rollback layout only', () => {
  const main = read('src/main.jsx');
  assert.ok(main.includes('const paneWindowPopout = PANE_WINDOW ? popoutFrameProps({ zoomFactor, trafficLights: isMacPlatform() && !fullScreen }) : null;'));
  // frame-sidebar 4.16336.0: a pane window keeps the legacy root, now HostFrameRoot's `legacy` props.
  assert.ok(main.includes('"data-popout": paneWindowPopout?.["data-popout"],'));
  assert.ok(main.includes('"--df-drag-ghost-z": 9001, ...paneWindowPopout?.style },'));
  assert.ok(main.includes('className={"workspace epitaxy-root cds-root" + (paneWindowPopout ? " epitaxy-pane-window" : "")}'));
  assert.ok(main.includes('<PaneWindowContext.Provider value={!!paneWindowPopout}>'));
  assert.ok(main.includes('const popoutFrame = popoutFrameProps({ trafficLights: isMacPlatform() });'));
  assert.ok(main.includes('<div className={"popout-root" + (popoutFrame ? " dframe-root" : "")}'));
  assert.ok(main.includes('<PaneWindowContext.Provider value={!!popoutFrame}>'));
  const session = read('src/source-session.css');
  assert.match(session, /\.popout-workspace \{\n  display: flex;\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  flex-direction: column;\n\}/);
  assert.match(session, /\.popout-root:not\(\[data-popout\]\) > \.popout-workspace \{\n  padding: 8px;\n  padding-top: 36px;\n  -webkit-app-region: drag;\n\}/);
  assert.match(session, /\.dframe-root\[data-pane-window\]:not\(\[data-pane-window="side-chat"\]\):not\(\[data-popout\]\) \.workspace \{\n  padding: 36px 8px 8px;/);
  assert.match(session, /\.source-file-panel > \.source-pane-header\[data-top-left\] \{\n  position: relative;\n\}/);
  const side = read('src/source-side-chat.css');
  assert.ok(side.includes('.dframe-root:not([data-popout]) .ssc-root[data-windowed] .ssc-header { height:40px;padding-left:76px; }'));
  assert.doesNotMatch(side, /^\.ssc-root\[data-windowed\] \.ssc-header/m);
  assert.ok(read('electron/main.cjs').includes('const POPOUT_TRAFFIC_LIGHTS = Object.freeze({ x: 14, y: 10 });'), 'Fr(16): the lights in the 32px header row');
});

test('fr4-13: the chat tile writes bleed / shave; in 4.16336.0 line mode the container pads nothing, chat-only or split', () => {
  const tiles = [{ id: 'chat', name: 'Chat' }, { id: 'files', name: 'Files' }];
  const render = (layout, hasPane) => renderToStaticMarkup(React.createElement(Tiles.SourceTileLayout, {
    layout, onLayoutChange() {}, tiles: tiles.filter((tile) => Model.tileIds(layout).has(tile.id)), hasPane, restoreKey: 'A',
    renderTile: (id) => React.createElement('div', { 'data-tile': id }),
  }));
  let only, right, left;
  const hadDocument = 'document' in globalThis;
  // round3 integrate-gates: SourceTileLayout reads document.documentElement.dir (RTL tiles); a DOM document always has
  // documentElement, so the stub carries one (ltr).
  if (!hadDocument) globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, remove() {} }), body: {}, documentElement: { dir: 'ltr' } };
  try {
    only = render(Model.chatOnlyLayout(), false);
    right = render(Model.fromSpec({ direction: 'row', children: ['files', 'chat'] }), true);
    left = render(Model.fromSpec({ direction: 'row', children: ['chat', 'files'] }), true);
  } catch (error) {
    if (!hadDocument) delete globalThis.document;
    throw error;
  }
  if (!hadDocument) delete globalThis.document;
  // round3 rl-session-page step 4 (4.16336.0 line mode): cc43287c9 Eje always runs shared-20 f_(!0), the line config
  // (gap 1, padding 0, borderPx 0, divider "line"), with `$t = {...Rt, paddingTop: 0, paddingEnd: Qt}`; so the container
  // pads 0 on every side (2.42304.0's 8px / 12px chat-only and split geometry is gone), with or without a pane. The chat
  // tile's gutter sides (cc43287c9 Ne / Pe) are unchanged. Both pinned in the 4.16336.0 text.
  const v4 = path.resolve(app, '../reference/snapshots/claude-4.16336.0-20261104/ion-dist/assets/v1');
  const occurrences = (text, needle) => text.split(needle).length - 1;
  assert.equal(occurrences(fs.readFileSync(path.join(v4, 'shared-20-DUEo90UF.js'), 'utf8'), 'function f_(e){return e?u_??={...c_,gap:1,padding:0,borderPx:0,divider:"line"}:c_}'), 1);
  assert.equal(occurrences(fs.readFileSync(path.join(v4, 'cc43287c9-dzfX-J5i.js'), 'utf8'), '$t=J1($,172,Qt)?K1($,172,Qt,{...Rt,paddingTop:0,paddingEnd:Qt}):$[173]'), 1);
  const lineContainer = 'class="tiles-container" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;--tiles-gap:1px;--tiles-padding:0px"';
  for (const html of [only, right, left]) { assert.ok(html.includes(lineContainer), html.slice(0, 400)); assert.match(html, /data-tiles-line=""/); }
  assert.match(only, /data-chat-gutter-end="bleed"/);
  assert.doesNotMatch(only, /data-chat-gutter-start=/);
  assert.match(right, /data-chat-gutter-start="shave"/);
  assert.match(right, /data-chat-gutter-end="bleed"/);
  assert.doesNotMatch(left, /data-chat-gutter-start=/);
  assert.match(left, /data-chat-gutter-end="shave"/);
});
