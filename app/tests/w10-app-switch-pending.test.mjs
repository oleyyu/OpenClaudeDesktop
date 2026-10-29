// w10-shell-split-appswitch (notdone 11): the Chat/Code switch press follows 3.6556.2 shared-6-sd9jbJqs.js uM — the
// pressed mode under flushSync, then at the 0ms timeout `pendingMode` (the later pressed value when superseded) that
// shared-78 $Y / KY read after the pressed one until the route reaches it (pM). Official source pins, the press model
// (src/app-switch-model.mjs) and the host container (src/source-app-switch.jsx) through a hook-level fixture.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { appSwitchProps, createAppSwitchPress } from '../src/app-switch-model.mjs';
import { withMemoCache } from './support/react-memo-cache.mjs';

const app = path.resolve(import.meta.dirname, '..');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const raw = file => fs.readFileSync(path.join(v3, file), 'utf8');

let server, Host, CdsDensityContext;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/source-app-switch.jsx');
  ({ CdsDensityContext } = await server.ssrLoadModule('/src/generated/view-tabs/index.js'));
});
after(async () => { await server?.close(); });

test('3.6556.2 uM / pM / $Y: flushSync press, pendingMode at the timeout (superseded hands over the later press), cleared when the route shows it', () => {
  const s6 = raw('shared-6-sd9jbJqs.js');
  for (const feature of [
    '_j(),x(()=>Xo.setState(e=>({pressedMode:t,pressId:e.pressId+1})));let{pressId:r}=Xo.getState();',
    'setTimeout(()=>{let i=Xo.getState().pressId!==r;xi.setState({pendingMode:i?Xo.getState().pressedMode:t}),i||Xo.setState({pressedMode:null}),e(Qa[t],n)},0)',
    'xi.setState(t=>({pendingMode:n(t.pendingMode)?null:t.pendingMode,...e!==null&&{lastKnownMode:e}}))',
  ]) assert.ok(s6.includes(feature), feature);
  // `x` is react-dom flushSync in shared-6 (vendor-frame `Sa`).
  assert.match(s6, /\bSa as x,/);
  const s78 = raw('shared-78-D5Fw2h0a.js');
  for (const feature of [
    'let{pendingMode:t,lastKnownMode:n}=Fi.getState()',
    'return t??r??n}',
    'tX(ZY.getState().pressedMode??KY(t),e)',
    'ZY=F(()=>({pressedMode:null,pressId:0}))',
  ]) assert.ok(s78.includes(feature), feature);
});

test('createAppSwitchPress (uM): flushSync press, pending at the timeout, pressed cleared, pending dropped when the host call settles', async () => {
  const queue = [], log = [];
  let pressed = null, pending = null, inFlush = false;
  const press = createAppSwitchPress({
    setPressed: value => { log.push(['pressed', value, inFlush]); pressed = value; },
    setPending: value => { log.push(['pending', value]); pending = value; },
    flushSync: run => { inFlush = true; try { return run(); } finally { inFlush = false; } },
    schedule: run => queue.push(run),
  });
  let finish;
  const onMode = next => new Promise(resolve => { finish = () => resolve(next); });
  const result = press('cowork', onMode);
  assert.deepEqual(log, [['pressed', 'cowork', true]], 'the pressed value is set inside flushSync');
  assert.equal(appSwitchProps({ mode: 'code', pressed, pending, homeMode: 'cowork', homeName: 'Claude' }).selected, 'cowork');
  queue.shift()();
  assert.deepEqual([pressed, pending], [null, 'cowork'], 'the timeout moves the press to pendingMode');
  assert.equal(appSwitchProps({ mode: 'code', pressed, pending, homeMode: 'cowork', homeName: 'Claude' }).selected, 'cowork', 'pending bridges until the route renders');
  await Promise.resolve();
  finish();
  assert.equal(await result, true);
  assert.equal(pending, null, 'the host call settled');
});

test('a superseded press hands the later pressed value to pendingMode and stays pressed; only the latest navigates and clears', async () => {
  const queue = [], calls = [];
  let pressed = null, pending = null;
  const press = createAppSwitchPress({ setPressed: value => { pressed = value; }, setPending: value => { pending = value; },
    flushSync: run => run(), schedule: run => queue.push(run) });
  const onMode = async next => { calls.push(next); };
  const a = press('code', onMode), b = press('cowork', onMode);
  assert.equal(pressed, 'cowork');
  queue.shift()();
  assert.equal(await a, false);
  assert.deepEqual([pressed, pending, calls], ['cowork', 'cowork', []], 'pendingMode: i ? Xo.getState().pressedMode : t; i || clear');
  queue.shift()();
  assert.deepEqual([pressed, pending], [null, 'cowork']);
  assert.equal(await b, true);
  assert.deepEqual([calls, pending], [['cowork'], null]);
});

test('appSwitchProps reads pressed ?? pending ?? mode ($Y over KY)', () => {
  const selected = fields => appSwitchProps({ mode: 'code', homeMode: 'cowork', homeName: 'Claude', ...fields }).selected;
  assert.equal(selected({}), 'code');
  assert.equal(selected({ pending: 'cowork' }), 'cowork');
  assert.equal(selected({ pending: 'cowork', pressed: 'code' }), 'code', 'a newer press wins over the pending one');
  assert.equal(selected({ pending: null, pressed: null }), 'code');
});

test('the default flushSync is react-dom\'s and the model no longer records a missing pendingMode', async () => {
  const source = fs.readFileSync(path.join(app, 'src/app-switch-model.mjs'), 'utf8');
  assert.match(source, /import \{ flushSync as reactFlushSync \} from 'react-dom';/);
  assert.match(source, /export function createAppSwitchPress\(\{ setPressed, setPending = \(\) => \{\}, flushSync = reactFlushSync, schedule = run => setTimeout\(run, 0\) \}\)/);
  assert.doesNotMatch(source, /host has no `pendingMode`|the host has no such store/);
  let pressed = null;
  const queue = [];
  const press = createAppSwitchPress({ setPressed: value => { pressed = value; }, schedule: run => queue.push(run) });
  const done = press('code', async () => {});
  assert.equal(pressed, 'code', 'react-dom flushSync runs the update synchronously');
  queue.shift()();
  assert.equal(await done, true);
  assert.equal(pressed, null);
  const host = fs.readFileSync(path.join(app, 'src/source-app-switch.jsx'), 'utf8');
  assert.match(host, /const press = useMemo\(\(\) => createAppSwitchPress\(\{ setPressed, setPending \}\), \[\]\);/);
  assert.match(host, /useEffect\(\(\) => \{ if \(pending !== null && pending === mode\) setPending\(null\); \}, \[pending, mode\]\);/);
  assert.match(host, /current: pressed \?\? pending \?\? mode/);
});

// A hook dispatcher over one component call (as tests/app-switch-current.test.mjs).
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function fixture(component, props = {}, contexts = new Map()) {
  let cursor = 0, tree;
  const cells = [], effects = [], same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useContext: c => contexts.has(c) ? contexts.get(c) : c._currentValue,
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, value => { cells[i].value = typeof value === 'function' ? value(cells[i].value) : value; }]; },
    useRef(initial) { const i = cursor++; cells[i] ??= { value: { current: initial } }; return cells[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) cells[i] = { value: fn(), deps }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const previous = cells[i]; cells[i] = { deps }; effects.push(() => { previous?.cleanup?.(); cells[i].cleanup = fn(); }); } },
    useSyncExternalStore(subscribe, snapshot, server) { return (server ?? snapshot)(); },
  };
  hooks.useLayoutEffect = hooks.useEffect;
  const render = () => {
    cursor = 0;
    const internal = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internal.H;
    internal.H = withMemoCache(hooks);
    try { return tree = component(props); } finally { internal.H = old; }
  };
  render();
  return { get tree() { return tree; }, props, render, flush() { while (effects.length) effects.shift()(); }, close() { cells.forEach(c => c?.cleanup?.()); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

test('host container: after the timeout the pending mode holds the thumb while switchMode runs; the route reaching it clears it (pM)', async () => {
  const outer = fixture(Host.SourceAppSwitch, { mode: 'code', homeMode: 'cowork', onMode() {} });
  const element = nodes(outer.tree, n => typeof n.type === 'function' && n.props?.homeMode === 'cowork' && 'chord' in n.props)[0];
  assert.ok(element, 'container element');
  let finish;
  const containerProps = { ...element.props, onMode: next => new Promise(resolve => { finish = () => { containerProps.mode = next; resolve(); }; }) };
  const container = fixture(element.type, containerProps, new Map([[CdsDensityContext, 'compact']]));
  const selected = () => container.tree.props.selected;
  assert.equal(selected(), 'code');
  container.tree.props.onChange('cowork');
  container.render();
  assert.equal(selected(), 'cowork', 'pressed');
  await tick();
  container.render();
  assert.equal(selected(), 'cowork', 'pressed is cleared at the timeout; pendingMode keeps the thumb while the route has not switched');
  // The route renders the new mode before the host call settles: pM drops the pending value.
  containerProps.mode = 'cowork';
  container.render();
  container.flush();
  container.render();
  assert.equal(selected(), 'cowork');
  // Cleared, not merely hidden: a route change elsewhere before the host call settles shows at once.
  containerProps.mode = 'code';
  container.render();
  assert.equal(selected(), 'code', 'no stale pendingMode');
  containerProps.mode = 'cowork';
  container.render();
  finish();
  await tick();
  container.render();
  assert.equal(selected(), 'cowork');
  // A refused switch (the host returns without switching): pending is dropped on settle and the real mode shows again.
  containerProps.onMode = async () => {};
  container.render();
  container.tree.props.onChange('code');
  container.render();
  assert.equal(selected(), 'code');
  await tick();
  container.render();
  assert.equal(selected(), 'cowork', 'springs back to the real mode');
  outer.close(); container.close();
});
