// layout-01 (R3-toolcards TT-12): the split view separators of source-split-view.jsx against 2.42304.0
// shared-23-Bu_lvvVo.js j2 (columns), N2 (rows) and P2 (corner) — Home / End, the pointer-drag registry D2 / O2
// (generated split-drag-registry.mjs), the RTL mirror of column drags and the row's aria range (b2). Pure functions,
// SSR markup and a controlled fake DOM (tests/fixtures/split-tiles-fake-dom.mjs); nothing opens a window.
// TF-C3 (3.6556.2 shared-23-BZ6ZY5fu.js zO / AO / kO): the column separator's no-drag child and its aria range.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { React, event, find, mount, reactProps, withEnvironment } from './fixtures/split-tiles-fake-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const reference = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1/shared-23-Bu_lvvVo.js');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
let server, Split, Keys, Registry, Model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Split = await server.ssrLoadModule('/src/source-split-view.jsx');
  Keys = await server.ssrLoadModule('/src/split-resizer-keys.mjs');
  // The same module instance the separators use (the registry is module state).
  Registry = await server.ssrLoadModule('/src/generated/code-current/split-drag-registry.mjs');
  Model = await server.ssrLoadModule('/src/split-view-model.mjs');
});
after(() => server?.close());

const key = (name, fields = {}) => ({ key: name, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...fields });

// ---------------------------------------------------------------- official source
test('the official separators carry the Home / End, registry, RTL and aria-range code this port follows', () => {
  const source = readFileSync(reference, 'utf8');
  for (const feature of [
    'if(e.metaKey||e.ctrlKey||e.altKey||!t)return;let r=e.key==="Home"?-1:+(e.key==="End");r===0||(D2.get(t)?.size??0)>0||(e.preventDefault(),_(),b(r*t.getBoundingClientRect().width),S(!0))',
    'if(t.metaKey||t.ctrlKey||t.altKey||!o||!n)return;let r=t.key==="Home"?-1:+(t.key==="End");r===0||(D2.get(n)?.size??0)>0||(t.preventDefault(),_(),b(r*n.getBoundingClientRect().height),x(!0))',
    'O2(e,m,!0)', 'O2(t,m,!0)', 'O2(l,o,!0)', 'x=k(t=>{O2(e.current,m,!1)',
    'p.current=e.ownerDocument.documentElement.dir==="rtl"', 'x=k(e=>b(p.current?-e:e),[b])',
    'x=l.ownerDocument.documentElement.dir==="rtl"?-1:1', 'let n=(t.clientX-y)*x',
    't&&r===i?{min:r-1,max:i+1}:{min:r,max:i}', '"aria-valuemin":s?.min',
  ]) assert.ok(source.includes(feature), feature);
});

test('TF-C3: the 3.6556.2 column separator (zO) has an aria-hidden no-drag child and kO\'s aria range; the loaded CSS drags only around it', () => {
  const s23 = readFileSync(path.join(v3, 'shared-23-BZ6ZY5fu.js'), 'utf8');
  for (const feature of [
    'N=J0($,29)?K0($,29,c("div",{className:"dframe-pane-resize-col-no-drag","aria-hidden":!0})):$[29]',
    'f("div",{ref:v,className:"dframe-pane-resize-col",children:[N,c(Zh,{orientation:"vertical"',
    '"aria-valuenow":j,"aria-valuemin":F,"aria-valuemax":I,"aria-disabled":L},b)]',
    'M=AO(r,n,t)', 'F=M?.min,I=M?.max,L=M?.canMove===!1||void 0',
    'function kO(e,t,n){if(n===0)return;let r=e.reduce((e,t)=>e+t,0),i=OO(n,r),a=e[t]+e[t+1],o=gO(e,t,-r,i)[t],s=gO(e,t,r,i)[t],c=o<s;return{...TO(Math.round(100*o/a),Math.round(100*s/a),c),canMove:c}}',
    'function TO(e,t,n){return n&&e===t?{min:e-1,max:t+1}:{min:e,max:t}}',
    'function OO(e,t){return x_.MIN_PX/e*t}',
    'function gO(e,t,n,r){let i=e[t]+e[t+1],a=Math.min(r,i/2),o=Math.min(i-a,Math.max(a,e[t]+n)),s=e.slice();return(o-e[t])*n<=0?s:(s[t]=o,s[t+1]=i-o,s)}',
    '(o?.min!==s?.min||o?.max!==s?.max)&&(a.current=e,i(e))',
  ]) assert.ok(s23.includes(feature), feature);
  assert.ok(readFileSync(path.join(v3, 'shared-16-ByfgAyLr.js'), 'utf8').includes('Ba={MIN:.15,MAX:.85,DEFAULT:.5,MIN_PX:320}'));
  assert.ok(!readFileSync(reference, 'utf8').includes('dframe-pane-resize-col-no-drag'), '2.42304.0 j2 had no such child');
  // The loaded design layer is 3.6556.2: the column area is clipped and only its child (and the row / corner) is no-drag.
  const sheet = readFileSync(path.join(app, 'public/assets/v1/shared-styles-D_GJawPO.css'), 'utf8');
  for (const rule of ['.dframe-pane-resize-col-no-drag,.dframe-pane-resize-row,.dframe-pane-resize-corner{-webkit-app-region:no-drag}',
    '.dframe-pane-resize-col{clip-path:inset(0 0 0 37.5%)}', '.dframe-pane-resize-col:has(:focus-visible){clip-path:none}',
    '.dframe-pane-resize-col-no-drag{width:calc(62.5% - 1px);top:0;bottom:0;right:0}',
    '.dframe-pane-resize-col:has(:focus-visible)>.dframe-pane-resize-col-no-drag{width:100%}']) assert.ok(sheet.includes(rule), rule);
  assert.doesNotMatch(sheet, /\.dframe-pane-resize-col\{[^}]*app-region/);
  for (const local of ['src/source-split-view.css', 'src/style.css'])
    assert.doesNotMatch(readFileSync(path.join(app, local), 'utf8'), /\.dframe-pane-resize-col[^{]*\{[^}]*app-region/, local);
});

test('columnValueRange is kO: percent bounds of the 320px floor, widened by one when they meet on a movable boundary, none unmeasured', () => {
  assert.equal(Split.columnValueRange([1, 1], 0, 0), undefined);
  assert.deepEqual(Split.columnValueRange([1, 1], 0, 1000), { min: 32, max: 68, canMove: true });
  assert.deepEqual(Split.columnValueRange([2, 1], 0, 1000), { min: 32, max: 68, canMove: true });
  assert.deepEqual(Split.columnValueRange([1, 1, 1], 1, 1500), { min: 32, max: 68, canMove: true });
  assert.deepEqual(Split.columnValueRange([1, 1], 0, 645), { min: 49, max: 51, canMove: true }, 'bounds that round together widen by one');
  assert.deepEqual(Split.columnValueRange([1, 1], 0, 640), { min: 50, max: 50, canMove: false }, 'two 320px columns cannot move');
  assert.deepEqual(Split.columnValueRange([1, 1], 0, 600), { min: 50, max: 50, canMove: false });
});

test('source-split-view.jsx wires the separators to the generated registry and the key helper', () => {
  const source = readFileSync(path.join(app, 'src/source-split-view.jsx'), 'utf8');
  assert.match(source, /import \{ markSplitPointerDrag \} from "\.\/generated\/code-current\/split-drag-registry\.mjs";/);
  assert.match(source, /onResize=\{handleResize\} onResizeEnd=\{finish\}\n\s+onDoubleClick=\{\(\) => store\.setColWeights\(weights\.map\(\(\) => 1\)\)\} onKeyDown=\{keyDown\}/);
  assert.match(source, /onDoubleClick=\{\(\) => \{ hostRef\.current\?\.style\.setProperty\("--df-pane-row", String\(SPLIT_ROW\.DEFAULT\)\); store\.setRowSplit\(SPLIT_ROW\.DEFAULT\); \}\} onKeyDown=\{keyDown\}/);
  assert.equal(source.match(/markSplitPointerDrag\(/g).length, 6, 'start / end of the column, row and corner drags');
});

// ---------------------------------------------------------------- pure helpers
test('splitKeyDelta: Home -1, End +1; modifiers, other keys, no host or a pointer drag on the host give 0', () => {
  const host = {}, other = {}, drag = {};
  assert.equal(Keys.splitKeyDelta(key('Home'), host), -1);
  assert.equal(Keys.splitKeyDelta(key('End'), host), 1);
  assert.equal(Keys.splitKeyDelta(key('End', { shiftKey: true }), host), 1, 'Shift is not a guard');
  for (const name of ['ArrowLeft', 'PageDown', 'Enter', ' ', 'h']) assert.equal(Keys.splitKeyDelta(key(name), host), 0, name);
  for (const modifier of ['metaKey', 'ctrlKey', 'altKey']) assert.equal(Keys.splitKeyDelta(key('End', { [modifier]: true }), host), 0, modifier);
  assert.equal(Keys.splitKeyDelta(key('End'), null), 0);
  Registry.markSplitPointerDrag(host, drag, true);
  assert.equal(Keys.splitKeyDelta(key('End'), host), 0, 'a pointer drag runs on this host');
  assert.equal(Keys.splitKeyDelta(key('Home'), other), -1, 'another host is free');
  Registry.markSplitPointerDrag(host, drag, false);
  assert.equal(Keys.splitKeyDelta(key('End'), host), 1);
});

test('splitDragRtl reads the host document direction; rowValueRange is b2', () => {
  assert.equal(Keys.splitDragRtl({ ownerDocument: { documentElement: { dir: 'rtl' } } }), true);
  assert.equal(Keys.splitDragRtl({ ownerDocument: { documentElement: { dir: '' } } }), false);
  assert.equal(Keys.splitDragRtl(null), false);
  assert.deepEqual(Keys.rowValueRange(1000, true), { min: 32, max: 68 });
  assert.deepEqual(Keys.rowValueRange(3000, true), { min: 15, max: 85 });
  assert.deepEqual(Keys.rowValueRange(640, false), { min: 50, max: 50 });
  assert.deepEqual(Keys.rowValueRange(645, true), { min: 49, max: 51 }, 'bounds that round together widen by one while movable');
  assert.deepEqual(Keys.rowValueRange(645, false), { min: 50, max: 50 });
});

test('SSR: the row separator states its aria range once the host has a height (none before it is measured)', () => {
  const store = { setRowSplit() {}, setColWeights() {} }, hostRef = { current: null };
  const row = (height) => renderToStaticMarkup(React.createElement(Split.SplitRowResizer, { hostRef, store, rowSplit: 0.5, height }));
  assert.match(row(1000), /aria-label="Resize pane rows" aria-valuenow="50" aria-valuemin="32" aria-valuemax="68" data-cds="ResizeHandle"/);
  assert.match(row(645), /aria-valuenow="50" aria-valuemin="49" aria-valuemax="51" data-cds="ResizeHandle"/);
  assert.match(row(640), /^<div class="dframe-pane-resize-row" style="pointer-events:none"><div aria-label="Resize pane rows" aria-valuenow="50" aria-valuemin="50" aria-valuemax="50" aria-disabled="true"/);
  assert.doesNotMatch(row(0), /aria-valuemin|aria-valuemax/);
  const column = renderToStaticMarkup(React.createElement(Split.SplitColumnResizer, { colIndex: 0, weights: [2, 1], hostRef, store, tracks: '2fr 1fr' }));
  assert.match(column, /^<div class="dframe-pane-resize-col"><div class="dframe-pane-resize-col-no-drag" aria-hidden="true"><\/div><div aria-label="Resize pane columns" aria-valuenow="67" data-cds="ResizeHandle" role="separator" aria-orientation="vertical" tabindex="0"/);
  assert.doesNotMatch(column, /aria-valuemin|aria-valuemax|aria-disabled/, 'zO knows no range before AO measures the host');
});

// ---------------------------------------------------------------- controlled mounts
function separators(env, { weights = [1, 1], rowSplit = 0.5, height = 1000, corner = false } = {}) {
  const host = env.document.body.appendChild(new env.Element('div'));
  host.setAttribute('class', 'dframe-pane-host');
  const calls = { cols: [], rows: [] };
  const store = { setColWeights: (value) => calls.cols.push(value), setRowSplit: (value) => calls.rows.push(value) };
  const hostRef = { current: host }, tracks = Model.columnTracks(weights);
  const tree = React.createElement(React.Fragment, null,
    React.createElement(Split.SplitColumnResizer, { colIndex: 0, weights, hostRef, store, tracks }),
    React.createElement(Split.SplitRowResizer, { hostRef, store, rowSplit, height }),
    corner ? React.createElement(Split.SplitCornerResizer, { colIndex: 0, weights, hostRef, store, tracks }) : null);
  return { host, calls, tree };
}
// The separator inside a wrapper (zO puts the aria-hidden no-drag child before the column's).
const handleIn = (env, wrapperClass) => find(env.container, (node) => node.className === wrapperClass)?.childNodes.find((node) => node.getAttribute?.('role') === 'separator');
const rect = (box) => (element) => (element.className === 'dframe-pane-host' ? box : null);
// What j2's drag computes for a pointer delta (m2 over f2 with the 320px floor), as the model the separators use.
const dragged = (weights, deltaPx, width) => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  return Model.dragColumns({ alt: false, baseWeights: weights, baseDelta: 0, lastDelta: 0, live: weights.slice() }, 0, deltaPx, total / width, Model.minWeight(width, total));
};

test('column separator: End / Home move the boundary by the host width (start → resize → end(true)); ⌘ ⌃ ⌥ do nothing', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    let pressed = event('keydown', { key: 'End' });
    await view.run(() => reactProps(column()).onKeyDown({ ...pressed, currentTarget: column(), target: column() }));
    assert.deepEqual(calls.cols, [dragged([1, 1], 1000, 1000)]);
    assert.deepEqual(calls.cols[0].map((value) => Math.round(value * 100) / 100), [1.36, 0.64], 'the right column keeps its 320px');
    pressed = event('keydown', { key: 'Home' });
    const home = { ...pressed, currentTarget: column(), target: column() };
    await view.run(() => reactProps(column()).onKeyDown(home));
    assert.equal(home.defaultPrevented, true);
    assert.deepEqual(calls.cols[1], dragged([1, 1], -1000, 1000));
    for (const modifier of ['metaKey', 'ctrlKey', 'altKey']) {
      const ignored = event('keydown', { key: 'End', [modifier]: true });
      await view.run(() => reactProps(column()).onKeyDown({ ...ignored, currentTarget: column(), target: column() }));
    }
    assert.equal(calls.cols.length, 2);
    assert.equal(Registry.splitPointerDrags.get(host)?.size ?? 0, 0, 'a key press leaves nothing registered');
    assert.equal(env.document.listenerCount('keydown'), 0, 'the drag listeners of the key press are gone');
    await view.unmount();
  }));

test('column separator (AO): the measured host width gives the aria range, re-measured by its ResizeObserver; two 320px columns are disabled', () => {
  let box = { width: 1000, height: 1000 };
  return withEnvironment({ rect: (element) => (element.className === 'dframe-pane-host' ? box : null) }, async (env) => {
    const { tree } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    const wrapper = find(env.container, (node) => node.className === 'dframe-pane-resize-col');
    assert.equal(wrapper.childNodes[0].className, 'dframe-pane-resize-col-no-drag');
    assert.equal(wrapper.childNodes[0].getAttribute('aria-hidden'), 'true');
    assert.deepEqual(['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-disabled'].map((name) => column().getAttribute(name)), ['50', '32', '68', null]);
    const observer = env.observers.find((entry) => entry.callback);
    assert.ok(observer, 'the host is observed');
    box = { width: 640, height: 1000 };
    await view.run(() => observer.callback([]));
    assert.deepEqual(['aria-valuemin', 'aria-valuemax', 'aria-disabled'].map((name) => column().getAttribute(name)), ['50', '50', 'true']);
    box = { width: 645, height: 1000 };
    await view.run(() => observer.callback([]));
    assert.deepEqual(['aria-valuemin', 'aria-valuemax', 'aria-disabled'].map((name) => column().getAttribute(name)), ['49', '51', null]);
    await view.unmount();
  });
});

test('row separator: End / Home move a movable boundary by the host height; an unmovable one ignores them', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { calls, tree } = separators(env);
    const view = await mount(env, tree);
    const row = () => handleIn(env, 'dframe-pane-resize-row');
    await view.run(() => reactProps(row()).onKeyDown(event('keydown', { key: 'End', currentTarget: row(), target: row() })));
    await view.run(() => reactProps(row()).onKeyDown(event('keydown', { key: 'Home', currentTarget: row(), target: row() })));
    assert.deepEqual(calls.rows, [Model.rowBounds(1000).max, Model.rowBounds(1000).min]);
    await view.unmount();
  }).then(() => withEnvironment({ rect: rect({ width: 1000, height: 640 }) }, async (env) => {
    const { calls, tree } = separators(env, { height: 640 });
    const view = await mount(env, tree);
    const row = () => handleIn(env, 'dframe-pane-resize-row');
    const pressed = event('keydown', { key: 'End', currentTarget: row(), target: row() });
    await view.run(() => reactProps(row()).onKeyDown(pressed));
    assert.equal(pressed.defaultPrevented, false);
    assert.deepEqual(calls.rows, []);
    await view.unmount();
  })));

test('a pointer drag registers with the host from its start to its end; Home / End on any separator of that host wait for it', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col'), row = () => handleIn(env, 'dframe-pane-resize-row');
    await view.run(() => reactProps(column()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: column(), target: column() })));
    assert.equal(Registry.splitPointerDrags.get(host).size, 1, 'the column drag is registered');
    const onRow = event('keydown', { key: 'End', currentTarget: row(), target: row() });
    const onColumn = event('keydown', { key: 'End', currentTarget: column(), target: column() });
    await view.run(() => { reactProps(row()).onKeyDown(onRow); reactProps(column()).onKeyDown(onColumn); });
    assert.equal(onRow.defaultPrevented, false);
    assert.equal(onColumn.defaultPrevented, false);
    assert.deepEqual([calls.cols, calls.rows], [[], []]);
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 400, clientY: 500 })));
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols, [dragged([1, 1], -100, 1000)]);
    assert.equal(Registry.splitPointerDrags.get(host).size, 0, 'released at the end');
    await view.run(() => reactProps(row()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: row(), target: row() })));
    assert.equal(Registry.splitPointerDrags.get(host).size, 1, 'the row drag is registered');
    await view.run(() => reactProps(column()).onKeyDown(event('keydown', { key: 'Home', currentTarget: column(), target: column() })));
    assert.equal(calls.cols.length, 1);
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.equal(Registry.splitPointerDrags.get(host).size, 0);
    await view.run(() => reactProps(column()).onKeyDown(event('keydown', { key: 'Home', currentTarget: column(), target: column() })));
    assert.deepEqual(calls.cols[1], dragged([1, 1], -1000, 1000));
    await view.unmount();
  }));

test('the corner drag registers too (P2 O2(l, o, …)), and keys wait for it', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree } = separators(env, { corner: true });
    const view = await mount(env, tree);
    const corner = () => find(env.container, (node) => node.className === 'dframe-pane-resize-corner');
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    await view.run(() => reactProps(corner()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: corner(), target: corner() })));
    assert.equal(Registry.splitPointerDrags.get(host).size, 1);
    await view.run(() => reactProps(column()).onKeyDown(event('keydown', { key: 'End', currentTarget: column(), target: column() })));
    assert.deepEqual(calls.cols, []);
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 560, clientY: 500 })));
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols, [dragged([1, 1], 60, 1000)]);
    assert.equal(Registry.splitPointerDrags.get(host).size, 0);
    await view.unmount();
  }));

test('RTL: column and corner pointer drags (and arrow steps) are mirrored; Home / End are not', () =>
  withEnvironment({ dir: 'rtl', rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree } = separators(env, { corner: true });
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    const corner = () => find(env.container, (node) => node.className === 'dframe-pane-resize-corner');
    await view.run(() => reactProps(column()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: column(), target: column() })));
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 600, clientY: 500 })));
    assert.equal(host.style.getPropertyValue('--df-col-tracks'), Model.columnTracks(dragged([1, 1], -100, 1000)), 'live tracks follow the mirrored delta');
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols[0], dragged([1, 1], -100, 1000));
    await view.run(() => reactProps(column()).onKeyDown(event('keydown', { key: 'ArrowRight', currentTarget: column(), target: column() })));
    assert.deepEqual(calls.cols[1], dragged([1, 1], -8, 1000), 'the handle reports +8, the column mirrors it');
    await view.run(() => reactProps(column()).onKeyDown(event('keydown', { key: 'End', currentTarget: column(), target: column() })));
    assert.deepEqual(calls.cols[2], dragged([1, 1], 1000, 1000), 'End is not mirrored (j2 calls b, not x)');
    await view.run(() => reactProps(corner()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: corner(), target: corner() })));
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 560, clientY: 500 })));
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols[3], dragged([1, 1], -60, 1000));
    await view.unmount();
  }));

test('LTR keeps the pointer delta as it is', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { calls, tree } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    await view.run(() => reactProps(column()).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: column(), target: column() })));
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 600, clientY: 500 })));
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols, [dragged([1, 1], 100, 1000)]);
    await view.unmount();
  }));
