// w10-shell-split-appswitch (notdone 10): Escape during a split separator drag remounts the handle and hands focus back
// to the new separator, as 3.6556.2 shared-23-BZ6ZY5fu.js xO does for the column (zO `[b, x] = xO(v)`) and row
// (VO `[x, S] = xO(b)`) separators. Official source pins, then the host separators (source-split-view.jsx) mounted
// with react-dom/client over the controlled fake DOM of tests/fixtures/split-tiles-fake-dom.mjs; nothing opens a window.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { React, event, find, mount, reactProps, withEnvironment } from './fixtures/split-tiles-fake-dom.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
let server, Split, Registry, Model;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Split = await server.ssrLoadModule('/src/source-split-view.jsx');
  Registry = await server.ssrLoadModule('/src/generated/code-current/split-drag-registry.mjs');
  Model = await server.ssrLoadModule('/src/split-view-model.mjs');
});
after(() => server?.close());

test('3.6556.2 xO: a key counter, focus remembered at cancel, restored on the remounted [role="separator"]; both separators use it on Escape', () => {
  const s23 = readFileSync(path.join(v3, 'shared-23-BZ6ZY5fu.js'), 'utf8');
  for (const feature of [
    'function xO(e){let $=J9(10),[t,n]=C(0),r=s(!1)',
    '()=>{let t=e.current;r.current=t?.contains(t.ownerDocument.activeElement)??!1,n(SO)}',
    `()=>{r.current&&(r.current=!1,e.current?.querySelector('[role="separator"]')?.focus())}`,
    'K2($,4,t,e,[t,e]):$[6];return y(a,o)',
    'function SO(e){return e+1}',
    // zO (columns): the wrapper ref feeds xO, Escape restores the tracks then cancels, the handle is keyed by the count.
    'v=s(null),[b,x]=xO(v)',
    'h.current=df(()=>{g.current=!0,e.style.setProperty("--df-col-tracks",pO(n)),x()})',
    '"aria-disabled":L},b)]',
    // VO (rows): the same over its wrapper `b`.
    'b=s(null),[x,S]=xO(b)',
    '_.current=df(()=>{v.current=!0,e.style.setProperty("--df-pane-row",String(f.current)),S()})',
    '"aria-disabled":F},x)):$[42]',
    'c("div",{ref:b,className:"dframe-pane-resize-row",style:A,children:I})',
  ]) assert.ok(s23.includes(feature), feature);
  // xO's effect is useEffect (`ho as y`), its counter useState (`wo as C`), its flag useRef (`Co as s`).
  assert.match(s23, /\bho as y,/);
  assert.match(s23, /\bwo as C,/);
  assert.match(s23, /\bCo as s,/);
});

test('source-split-view.jsx: useHandleRemount is xO, both Escape branches call it and both handles carry its key', () => {
  const source = readFileSync(path.join(app, 'src/source-split-view.jsx'), 'utf8');
  assert.match(source, /export function useHandleRemount\(wrapperRef\) \{/);
  assert.match(source, /refocus\.current = wrapper\?\.contains\(wrapper\.ownerDocument\.activeElement\) \?\? false;\n\s+setKey\(\(value\) => value \+ 1\);/);
  assert.match(source, /wrapperRef\.current\?\.querySelector\('\[role="separator"\]'\)\?\.focus\(\)/);
  assert.match(source, /useEffect\(restore, \[key, wrapperRef\]\);/);
  assert.equal(source.match(/const \[handleKey, remount\] = useHandleRemount\(wrapper\);/g).length, 2, 'column and row separators');
  assert.equal(source.match(/<SourceResizeHandle key=\{handleKey\} orientation=/g).length, 2);
  assert.match(source, /host\.style\.setProperty\("--df-col-tracks", tracks\); remount\(\); \} \}, signal\);/);
  assert.match(source, /host\.style\.setProperty\("--df-pane-row", String\(from\)\); remount\(\); \} \}, abort\.signal\);/);
});

// The fixture's matches() knows class selectors only; xO queries `[role="separator"]`, so attribute selectors are added here.
function withAttributeSelectors(env) {
  const proto = env.Element.prototype, classes = proto.matches;
  if (proto.matches.attributeAware) return;
  proto.matches = function matches(selector) {
    const attribute = /^\[([\w-]+)="([^"]*)"\]$/.exec(selector);
    return attribute ? this.getAttribute(attribute[1]) === attribute[2] : classes.call(this, selector);
  };
  proto.matches.attributeAware = true;
}
function separators(env, { weights = [1, 1], rowSplit = 0.5, height = 1000 } = {}) {
  withAttributeSelectors(env);
  const host = env.document.body.appendChild(new env.Element('div'));
  host.setAttribute('class', 'dframe-pane-host');
  const calls = { cols: [], rows: [] };
  const store = { setColWeights: (value) => calls.cols.push(value), setRowSplit: (value) => calls.rows.push(value) };
  const hostRef = { current: host }, tracks = Model.columnTracks(weights);
  const tree = React.createElement(React.Fragment, null,
    React.createElement(Split.SplitColumnResizer, { colIndex: 0, weights, hostRef, store, tracks }),
    React.createElement(Split.SplitRowResizer, { hostRef, store, rowSplit, height }));
  return { host, calls, tree, tracks };
}
const handleIn = (env, wrapperClass) => find(env.container, (node) => node.className === wrapperClass)?.childNodes.find((node) => node.getAttribute?.('role') === 'separator');
const rect = (box) => (element) => (element.className === 'dframe-pane-host' ? box : null);
const press = (node) => reactProps(node).onMouseDown(event('mousedown', { button: 0, clientX: 500, clientY: 500, currentTarget: node, target: node }));

test('column separator: Escape mid-drag restores the tracks, remounts the handle (its drag ends, nothing commits) and refocuses the new separator', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree, tracks } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    const before = column();
    before.focus();
    await view.run(() => press(before));
    assert.equal(before.getAttribute('data-dragging'), '', 'the handle is dragging');
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 400, clientY: 500 })));
    assert.notEqual(host.style.getPropertyValue('--df-col-tracks'), tracks, 'the drag moved the boundary');
    const escape = event('keydown', { key: 'Escape' });
    await view.run(() => env.document.dispatchEvent(escape));
    assert.equal(escape.defaultPrevented, true);
    const after = column();
    assert.ok(after && after !== before, 'a new separator element (the key changed)');
    assert.equal(after.getAttribute('data-dragging'), null, 'the remounted handle is not dragging');
    assert.ok(env.document.activeElement === after, 'focus is back on the new [role="separator"]');
    assert.equal(host.style.getPropertyValue('--df-col-tracks'), tracks);
    assert.deepEqual(calls.cols, [], 'a cancelled drag commits nothing');
    assert.equal(Registry.splitPointerDrags.get(host)?.size ?? 0, 0, 'the pointer drag is released');
    assert.equal(env.document.listenerCount('mousemove'), 0, 'the old handle stopped tracking the mouse');
    assert.equal(env.document.listenerCount('keydown'), 0, 'the Escape listener is gone');
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.cols, []);
    await view.unmount();
  }));

test('column separator: Escape with focus outside the wrapper remounts without moving focus', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { tree } = separators(env);
    const view = await mount(env, tree);
    const column = () => handleIn(env, 'dframe-pane-resize-col');
    const elsewhere = env.document.body.appendChild(new env.Element('button'));
    elsewhere.focus();
    const before = column();
    await view.run(() => press(before));
    await view.run(() => env.document.dispatchEvent(event('keydown', { key: 'Escape' })));
    assert.ok(column() !== before, 'remounted');
    assert.ok(env.document.activeElement === elsewhere, 'r.current was false: no focus call');
    await view.unmount();
  }));

test('row separator: Escape mid-drag restores the row, remounts the handle and refocuses it; a later drag still commits', () =>
  withEnvironment({ rect: rect({ width: 1000, height: 1000 }) }, async (env) => {
    const { host, calls, tree } = separators(env);
    host.style.setProperty('--df-pane-row', '0.5');
    const view = await mount(env, tree);
    const row = () => handleIn(env, 'dframe-pane-resize-row');
    const before = row();
    before.focus();
    await view.run(() => press(before));
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 500, clientY: 600 })));
    assert.equal(host.style.getPropertyValue('--df-pane-row'), '0.6');
    await view.run(() => env.document.dispatchEvent(event('keydown', { key: 'Escape' })));
    const after = row();
    assert.ok(after && after !== before, 'a new separator element');
    assert.ok(env.document.activeElement === after, 'focus is back on the new row separator');
    assert.equal(host.style.getPropertyValue('--df-pane-row'), '0.5');
    assert.deepEqual(calls.rows, []);
    assert.equal(env.document.listenerCount('mousemove'), 0);
    // The remounted handle works as before.
    await view.run(() => press(after));
    await view.run(() => env.document.dispatchEvent(event('mousemove', { clientX: 500, clientY: 600 })));
    await view.run(() => env.document.dispatchEvent(event('mouseup', { button: 0 })));
    assert.deepEqual(calls.rows, [0.6]);
    assert.ok(row() === after, 'a completed drag does not remount');
    await view.unmount();
  }));
