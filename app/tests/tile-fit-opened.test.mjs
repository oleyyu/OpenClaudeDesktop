// layout-06 (R3-toolcards TT-14): opening a pane re-flexes the layout through the mounted tile host, as 2.42304.0 does —
// cc43287c9 registers `{ fitOpenedLayout: Ne }` (Rre / B9 over cf53e1812, generated tile-fit-opened.mjs) with its panes
// store, and c03935b01 Ei returns `i?.fitOpenedLayout(c, c === o) ?? c` for a pane the layout did not have. Covered here:
// the store's per-owner host registry, SourceTileLayout's registration under a controlled fake DOM
// (tests/fixtures/split-tiles-fake-dom.mjs), the measured width / config the host passes, and main.jsx's call site.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { React, mount, withEnvironment } from './fixtures/split-tiles-fake-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
let server, Tiles, Store, Model, Fit, Glue;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Tiles = await server.ssrLoadModule('/src/source-tile-layout.jsx');
  Store = await server.ssrLoadModule('/src/tile-layout-store.mjs');
  Model = await server.ssrLoadModule('/src/tile-layout-model.mjs');
  Fit = await server.ssrLoadModule('/src/generated/code-current/tile-fit-opened.mjs');
  Glue = await server.ssrLoadModule('/src/r4h-glue-decisions.mjs');
});
after(() => server?.close());

function memoryStorage() {
  const map = new Map(), writes = [];
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => { writes.push(key); map.set(key, String(value)); }, removeItem: (key) => map.delete(key), writes };
}
const tiles = () => [{ id: 'chat', name: 'Chat', overflowMin: { width: 320, anchor: 'left' } }, ...Model.PANE_KINDS.map((id) => ({ id, name: id }))];
const tileById = (id) => tiles().find((tile) => tile.id === id) ?? null;
// Pixel width of every node at a content width, as SourceTileLayout resolves it.
function widths(layout, width) {
  const out = {};
  Model.resolveLayout(layout.root, { width, height: 600 }, tileById, Model.TILE_CONFIG, (_stack, child, _index, _flex, box) => { out[Model.nodeKey(child)] = box.width; });
  return out;
}

// ---------------------------------------------------------------- official source
test('the official host registration, store slot and opening call this port follows', () => {
  const host = readFileSync(path.join(v1, 'cc43287c9-DAfOi8yP.js'), 'utf8');
  for (const feature of [
    'Ne=Lt((e,t)=>{let n=fe.current;return n===null?e:Rre({layout:e,containerWidth:n.getBoundingClientRect().width,splitConfig:Me,tileById:G9,rootRowOnly:t})})',
    'let e={fitOpenedLayout:Ne};return V.getState().setTileHost(e),()=>{V.getState().tileHost===e&&V.getState().setTileHost(null)}',
    'paddingEnd:K.padding+Oe', 'Gre={id:"chat",overflowMin:{width:320,anchor:"left"}}',
  ]) assert.ok(host.includes(feature), feature);
  const store = readFileSync(path.join(v1, 'c03935b01-CyJKQj4N.js'), 'utf8');
  for (const feature of ['return i?.fitOpenedLayout(c,c===o)??c', 'setTileHost:e=>i({tileHost:e})', '...o?U(n):W(n,e,void 0)',
    'i?x(r,e):Ei(r,e,t.lastPaneFlexByKind,Ya(t,e),t.tileHost)', 'a=Ei(po(e),t,e.lastPaneFlexByKind,r?void 0:Ya(e,t),e.tileHost)'])
    assert.ok(store.includes(feature), feature);
  // shared-18 Tb is the local TILE_CONFIG; the official contentBox subtracts a 1px border by default.
  assert.ok(readFileSync(path.join(v1, 'shared-18-D4XxL6Tg.js'), 'utf8').includes('Tb={gap:12,padding:8,minTileBasePx:100,minTileWidthPx:280,dragLift:24}'));
  assert.deepEqual({ ...Model.TILE_CONFIG }, { gap: 12, padding: 8, minTileBasePx: 100, minTileWidthPx: 280, dragLift: 24 });
});

test('openSessionPaneTile: fits a newly opened pane through the owner host, skips fitting when already in the base layout, and saves as opened without a host', () => {
  const store = Store.createTileLayoutStore({ storage: memoryStorage() });
  const fitCalls = [];
  store.setTileHost('A', {
    fitOpenedLayout: (layout, rootRowOnly) => {
      fitCalls.push({ layout, rootRowOnly });
      return { ...layout, root: { ...layout.root, fittedByHost: true } };
    },
  });

  // (a) A pane not yet in the base layout goes through the owner's fitOpenedLayout and clears baseLayout / expandedTile.
  const first = Glue.openSessionPaneTile(store, 'A', 'files');
  assert.equal(fitCalls.length, 1, 'newly opened pane is fitted once');
  assert.equal(first.root.fittedByHost, true);
  assert.equal(store.getSession('A').tileLayout, first);
  assert.equal(store.getSession('A').baseLayout, null);
  assert.equal(store.getSession('A').expandedTile, null);

  // (b) A pane already in the base layout (including when another tile is expanded over baseLayout) skips fitOpenedLayout (official o ? U(n) : W(n, e)).
  fitCalls.length = 0;
  const alreadyOpen = Glue.openSessionPaneTile(store, 'A', 'files');
  assert.equal(fitCalls.length, 0, 'pane already in tileLayout does not re-fit');
  assert.ok(Model.tileIds(alreadyOpen).has('files'));

  store.setSession('A', {
    tileLayout: Model.fromSpec({ direction: 'row', children: ['terminal'] }),
    baseLayout: Model.openPane(Model.chatOnlyLayout(), 'files', {}),
    expandedTile: 'terminal',
  });
  Glue.openSessionPaneTile(store, 'A', 'files');
  assert.equal(fitCalls.length, 0, 'pane already in baseLayout while expanded does not re-fit');
  assert.equal(store.getSession('A').expandedTile, null, 'opening collapses expandedTile back to the updated base layout');

  // (c) A background session without a mounted host keeps the opened layout as-is without calling A's host.
  const bg = Glue.openSessionPaneTile(store, 'B', 'preview');
  assert.equal(fitCalls.length, 0, 'background owner B does not call owner A host');
  assert.ok(Model.tileIds(bg).has('preview'));
  assert.equal(store.getSession('B').tileLayout, bg);

  // Guards: paneWindow, missing sessionId, or unknown pane kind is a no-op.
  assert.equal(Glue.openSessionPaneTile(store, 'A', 'terminal', { paneWindow: true }), null);
  assert.equal(Glue.openSessionPaneTile(store, '', 'terminal'), null);
  assert.equal(Glue.openSessionPaneTile(store, 'A', 'not-a-pane'), null);

  // Wiring: main.jsx delegates openPaneTile to openSessionPaneTile and passes tileHosts={tileStore} to SourceTileLayout.
  const source = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(source, /import \{[^}]*\bopenSessionPaneTile\b[^}]*\} from "\.\/r4h-glue-decisions\.mjs";/);
  assert.match(source, /openSessionPaneTile\(tileStore, sessionId, kind, \{ paneWindow: PANE_WINDOW \}\);/);
  assert.match(source, /<SourceTileLayout layout=\{displayLayout\}[^\n]*restoreKey=\{tileOwner\} onRestoreLayout=\{restoreTileLayout\} tileHosts=\{tileStore\}/);
});

// ---------------------------------------------------------------- store
test('the store keeps one tile host per owner, outside the persisted state and without notifying', () => {
  const storage = memoryStorage(), store = Store.createTileLayoutStore({ storage });
  let notified = 0;
  store.subscribe(() => { notified += 1; });
  const before = store.getState(), writes = storage.writes.length;
  const layout = Model.initialLayout('files');
  assert.equal(store.tileHost('A'), null);
  assert.equal(store.fitOpenedLayout('A', layout), layout, 'no host: the layout as opened');
  const calls = [];
  const host = { fitOpenedLayout: (next, rootRowOnly) => { calls.push(rootRowOnly); return { root: { ...next.root, fitted: true } }; } };
  store.setTileHost('A', host);
  assert.equal(store.tileHost('A'), host);
  assert.equal(store.fitOpenedLayout('A', layout).root.fitted, true);
  assert.equal(store.fitOpenedLayout('A', layout, true).root.fitted, true);
  assert.deepEqual(calls, [false, true], 'rootRowOnly defaults to false (no remembered closed-pane slot locally)');
  assert.equal(store.fitOpenedLayout('B', layout), layout, 'another owner has no host');
  store.setTileHost('A', { fitOpenedLayout: () => null });
  assert.equal(store.fitOpenedLayout('A', layout), layout, 'a host that returns nothing keeps the layout (Ei `?? c`)');
  store.setTileHost('A', null);
  assert.equal(store.tileHost('A'), null);
  assert.equal(store.getState(), before, 'the snapshot never changes');
  assert.equal(notified, 0);
  assert.equal(storage.writes.length, writes, 'nothing is written');
  assert.doesNotMatch(JSON.stringify(Store.partialize(store.getState())), /tileHost/);
});

// ---------------------------------------------------------------- SourceTileLayout's host
const containerRect = (box) => (element) => (element.className === 'tiles-container' ? box : null);
const containerStyle = (element) => {
  const padding = element.style.padding || '0px';
  return { paddingLeft: padding, paddingRight: padding, paddingTop: padding, paddingBottom: padding };
};
const tileLayout = (props) => React.createElement(Tiles.SourceTileLayout, {
  layout: Model.chatOnlyLayout(), onLayoutChange() {}, tiles: tiles(), renderTile: (id) => React.createElement('div', { 'data-tile': id }),
  hasPane: false, restoreKey: 'A', ...props,
});

test('mounted, the tile layout registers under its owner; a new owner moves it; unmounting removes only its own host', () => {
  const box = { width: 700, height: 600 };
  return withEnvironment({ rect: containerRect(box), styleOf: containerStyle }, async (env) => {
    const store = Store.createTileLayoutStore({ storage: memoryStorage() });
    const view = await mount(env, tileLayout({ tileHosts: store }));
    const host = store.tileHost('A');
    assert.equal(typeof host?.fitOpenedLayout, 'function');
    await view.render(tileLayout({ tileHosts: store, restoreKey: 'B' }));
    assert.equal(store.tileHost('A'), null, 'the old owner is released');
    assert.equal(store.tileHost('B'), host, 'the same host object (stable, like Lt)');
    const other = { fitOpenedLayout: (layout) => layout };
    store.setTileHost('B', other);
    await view.unmount();
    assert.equal(store.tileHost('B'), other, 'a host registered after it stays (`tileHost === e &&`)');
  });
});

test('fitOpenedLayout measures the container when called: chat gets its 320px when the row has room, at a 0px border', () => {
  const box = { width: 700, height: 600 };
  return withEnvironment({ rect: containerRect(box), styleOf: containerStyle }, async (env) => {
    const store = Store.createTileLayoutStore({ storage: memoryStorage() });
    const view = await mount(env, tileLayout({ tileHosts: store }));
    const opened = Model.openPane(Model.chatOnlyLayout(), 'files', {});
    // 700px wide, 8px padding each side once a pane shows: the default chat 2 : files 3 leaves the chat 269px.
    assert.equal(Math.round(widths(opened, 684).chat), 269);
    const fitted = store.fitOpenedLayout('A', opened);
    assert.notEqual(fitted, opened);
    assert.deepEqual(fitted, Fit.fitOpenedLayout({ layout: opened, containerWidth: 700, splitConfig: { ...Model.TILE_CONFIG, borderPx: 0 }, tileById, rootRowOnly: false }));
    assert.equal(Math.round(widths(fitted, 684).chat), 320);
    assert.equal(Math.round(widths(fitted, 684).files), 352);
    const bordered = Fit.fitOpenedLayout({ layout: opened, containerWidth: 700, splitConfig: Model.TILE_CONFIG, tileById, rootRowOnly: false });
    assert.notDeepEqual(fitted, bordered, 'the official 1px container border would leave 2px less; the local container has none');
    // Measured when called (Lt): a wider window already has room, so the layout comes back as opened.
    box.width = 1200;
    assert.equal(store.fitOpenedLayout('A', opened), opened);
    await view.unmount();
    assert.equal(store.tileHost('A'), null);
    assert.equal(store.fitOpenedLayout('A', opened), opened);
  });
});

test('the host recurses into nested stacks unless rootRowOnly', () => {
  const box = { width: 1416, height: 600 };
  return withEnvironment({ rect: containerRect(box), styleOf: containerStyle }, async (env) => {
    const store = Store.createTileLayoutStore({ storage: memoryStorage() });
    const view = await mount(env, tileLayout({ tileHosts: store }));
    const nested = Model.fromSpec({ direction: 'row', children: [['files', 1], { direction: 'column', children: [{ direction: 'row', children: [['chat', 1], ['plan', 3]] }, 'terminal'] }] });
    assert.ok(widths(nested, 1400).chat < 320, `the nested chat starts narrow (${widths(nested, 1400).chat})`);
    const fitted = store.fitOpenedLayout('A', nested);
    assert.ok(widths(fitted, 1400).chat >= 319.5, `the nested row gives the chat its minimum (${widths(fitted, 1400).chat})`);
    assert.equal(fitted.root.children[0], nested.root.children[0], 'the root row already fits');
    const rootOnly = store.tileHost('A').fitOpenedLayout(nested, true);
    assert.equal(rootOnly, nested, 'rootRowOnly fits the root row alone');
    await view.unmount();
  });
});

test('without tileHosts the layout mounts as before and registers nothing', () => {
  return withEnvironment({ rect: containerRect({ width: 700, height: 600 }), styleOf: containerStyle }, async (env) => {
    const view = await mount(env, tileLayout({}));
    assert.ok(env.container.childNodes.length > 0);
    await view.unmount();
  });
});
