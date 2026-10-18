// R2-btw NBS-5: a /btw child the session tile shows is marked read and kept out of the automatic unread mark.
// 2.42304.0 cccc2cf0a KO calls shared-11 v_(child, true); the turn-result path (ce401cf8e) calls x_, which skips a
// session in the window's pane set (h_) or the shown list (__). Both originals are generated
// (src/generated/btw-pane/shown-session.mjs) over the local host adapter (src/btw-read-state.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { useShownSession, markUnreadUnlessShown } from '../src/generated/btw-pane/shown-session.mjs';
import { useBtwReadStateHost, bindBtwReadState, unreadStore, paneSessions, useReportShownSession, shownSideSessions } from '../src/btw-read-state.mjs';
import { unreadOnTurnCompleted } from '../src/sidebar-model.js';

const app = path.resolve(import.meta.dirname, '..');

// D21: deterministic hook cells; effects run on flush, in declaration order, cleanups before re-runs.
function hookFixture(body, props) {
  const cells = [], effects = []; let cursor = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const dispatcher = {
    useState(initial) { const i = cursor++; cells[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [cells[i].value, next => { cells[i].value = typeof next === 'function' ? next(cells[i].value) : next; }]; },
    useRef(initial) { return dispatcher.useState(() => ({ current: initial }))[0]; },
    useEffect(fn, deps) { const i = cursor++; if (!cells[i] || !same(cells[i].deps, deps)) { const old = cells[i]; cells[i] = { deps }; effects.push(() => { old?.cleanup?.(); cells[i].cleanup = fn(); }); } },
  };
  const render = next => {
    if (next) props = next;
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, old = internals.H;
    internals.H = dispatcher;
    try { body(props); } finally { internals.H = old; }
    while (effects.length) effects.shift()();
  };
  render();
  return { render, close: () => cells.forEach(cell => cell?.cleanup?.()) };
}

// main.jsx App: side 0 binds the host, then the session tile's shown child registers (KO order).
function appSide(props) {
  useBtwReadStateHost(props.side === 0, { metadata: props.metadata, update: props.update, onReadError: props.onReadError, paneShows: props.paneShows });
  useShownSession(props.shown, true);
}
function host(metadata = {}) {
  const calls = [], errors = [];
  const props = { side: 0, metadata, shown: undefined, paneShows: () => false, onReadError: error => errors.push(error),
    update: (id, patch, options) => { calls.push(options ? [id, patch, options] : [id, patch]); return Promise.resolve(); } };
  return { calls, errors, props };
}

test('the shown-session registry is the generated 2.42304.0 shared-11 v_/x_ over the host unread store', async () => {
  const { extractBtwPane } = await import('../scripts/extract-btw-pane.mjs');
  const manifest = await extractBtwPane({ check: true });
  const shown = manifest.modules.find(module => module.target === 'shown-session.mjs');
  assert.equal(shown.source, 'shared-11-BuQ3CK5I.js');
  assert.deepEqual(shown.bindings.map(binding => binding.name), ['__', 'v_', 'x_']);
  assert.deepEqual(shown.exports, { v_: 'useShownSession', x_: 'markUnreadUnlessShown' });
  assert.deepEqual(shown.imports.map(entry => [entry.local, entry.kind, entry.from, entry.name, entry.via]), [
    ['S', 'react', 'react', 'useEffect', 'vendor-frame-DfPJ1QmD.js:mo'],
    ['y_', 'host', '../../btw-read-state.mjs', 'unreadStore', 'shared-11-BuQ3CK5I.js:y_'],
    ['h_', 'host', '../../btw-read-state.mjs', 'paneSessions', 'shared-11-BuQ3CK5I.js:h_'],
  ]);
  assert.ok(shown.imports.filter(entry => entry.kind === 'host').every(entry => /^[0-9a-f]{64}$/.test(entry.replacedSha256)));
  const text = readFileSync(path.join(app, 'src/generated/btw-pane/shown-session.mjs'), 'utf8');
  assert.match(text, /t && y_\.getState\(\)\.unreadIds\.includes\(e\) && y_\.getState\(\)\.markRead\(e\)/);
  assert.match(text, /h_\.has\(e\) \|\| __\.includes\(e\) \|\| y_\.getState\(\)\.markUnread\(e\)/);
});

test('showing an unread /btw child marks it read once; a read child or no child writes nothing', () => {
  const h = host({ child: { unread: true }, other: { unread: true } });
  const side = hookFixture(appSide, h.props);
  assert.deepEqual(h.calls, [], 'no child shown');
  side.render({ ...h.props, shown: 'child' });
  assert.deepEqual(h.calls, [['child', { unread: false }]]);
  // The same child on the next render (metadata still stale, or Mark as unread while shown): v_ deps [id, true].
  side.render({ ...h.props, shown: 'child' });
  assert.equal(h.calls.length, 1);
  side.render({ ...h.props, metadata: { child: { unread: false } }, shown: 'read-child' });
  assert.equal(h.calls.length, 1, 'a child that is not unread is not written');
  side.close();
});

test('while a /btw child is shown, a finished turn in it is not marked unread; once hidden it is', () => {
  const h = host({ parent: {}, child: {} });
  const side = hookFixture(appSide, { ...h.props, shown: 'child' });
  const finished = id => { if (unreadOnTurnCompleted({ threadId: id, currentId: 'parent', knownIds: new Set(['parent', 'child', 'other']) })) markUnreadUnlessShown(id); };
  // The local predicate alone would mark it: a /btw fork is its own sidebar row (no threadParents link).
  assert.equal(unreadOnTurnCompleted({ threadId: 'child', currentId: 'parent', knownIds: ['parent', 'child'] }), true);
  finished('child');
  assert.deepEqual(h.calls, []);
  finished('other');
  assert.deepEqual(h.calls, [['other', { unread: true }, { automatic: true }]]);
  side.render({ ...h.props, shown: undefined });
  finished('child');
  assert.deepEqual(h.calls.at(-1), ['child', { unread: true }, { automatic: true }]);
  side.close();
});

test('the pane set (h_) and every live registration of the same child keep it shown', () => {
  const h = host({});
  const primary = hookFixture(appSide, { ...h.props, shown: 'child', paneShows: id => id === 'split-session' });
  const split = hookFixture(props => useShownSession(props.shown, true), { shown: 'child' });
  markUnreadUnlessShown('split-session');
  assert.deepEqual(h.calls, [], 'h_: a session a split side shows');
  assert.equal(paneSessions.has('split-session'), true);
  split.close();
  markUnreadUnlessShown('child');
  assert.deepEqual(h.calls, [], 'still registered by the primary side');
  primary.render({ ...h.props, shown: undefined, paneShows: () => false });
  markUnreadUnlessShown('child');
  assert.deepEqual(h.calls, [['child', { unread: true }, { automatic: true }]]);
  primary.close();
});

test('the host binding follows side 0 only, reads current metadata, and unbinds with it', async () => {
  const h = host({ a: { unread: true }, b: { unread: false } });
  const secondary = hookFixture(appSide, { ...h.props, side: 1 });
  assert.deepEqual(unreadStore.getState().unreadIds, [], 'a split side binds nothing');
  markUnreadUnlessShown('a');
  assert.deepEqual(h.calls, [], 'no host: nothing is written');
  const primary = hookFixture(appSide, h.props);
  assert.deepEqual(unreadStore.getState().unreadIds, ['a']);
  primary.render({ ...h.props, metadata: { a: { unread: false }, c: { unread: true } } });
  assert.deepEqual(unreadStore.getState().unreadIds, ['c'], 'the latest render, not the binding render');
  const failure = Error('offline');
  primary.render({ ...h.props, metadata: { c: { unread: true } }, update: () => Promise.reject(failure), shown: 'c' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.errors, [failure], 'a failed read reports through mark-read');
  primary.close(); secondary.close();
  assert.deepEqual(unreadStore.getState().unreadIds, []);
  const unbind = bindBtwReadState({ metadata: () => ({ z: { unread: true } }), markRead() {}, markUnread() {}, paneShows: () => true });
  assert.deepEqual(unreadStore.getState().unreadIds, ['z']);
  unbind(); unbind();
  assert.equal(paneSessions.has('z'), false);
});

test('main.jsx wires KO and x_: side 0 binds the host, the session tile registers its child, the turn path uses x_', () => {
  const source = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.match(source, /import \{ useShownSession, markUnreadUnlessShown \} from "\.\/generated\/btw-pane\/shown-session\.mjs";/);
  assert.match(source, /import \{ useBtwReadStateHost, useReportShownSession \} from "\.\/btw-read-state\.mjs";/);
  const bind = source.indexOf('useBtwReadStateHost(side === 0, { metadata: sessionMetadata, update: updateSessionMetadata, onReadError: actionFailed("mark-read"),');
  const child = source.indexOf('const shownBtwChild = (PANE_WINDOW?.pane !== "side-chat" && current && openPanes.has("session") && btwSessionId) || undefined;');
  const shown = source.indexOf('useShownSession(shownBtwChild, true);');
  assert.ok(child > 0 && shown > child);
  assert.ok(bind > 0 && shown > bind, 'the host binds before the shown child registers (effects run in order)');
  assert.ok(source.indexOf('const btwSessionId = tileEntry?.btwSessionId;') < bind);
  assert.match(source, /paneShows: id => id === currentRef\.current \|\| splitStore\.isShown\(id\)/);
  const turn = source.slice(source.indexOf('if (side === 0 && e.method === "turn/completed" && !splitStore.isShown('));
  assert.match(turn.slice(0, 600), /\)\)\s+markUnreadUnlessShown\(e\.params\.threadId\);/);
  assert.doesNotMatch(source, /updateSessionMetadata\(e\.params\.threadId, \{ unread: true \}, \{ automatic: true \}\)/);
});

// R4g-btw BT1 (X7-15): the official y_ hydrates from localStorage (shared-52 $p) while it is created, so v_'s mount
// check always reads stored state; the local metadata arrives later, and the check is kept until the child's record does.
test('the official unread store hydrates synchronously, and its rehydrate hook re-marks only the open session', () => {
  const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const count = (text, needle) => text.split(needle).length - 1;
  const shared11 = readFileSync(path.join(v1, 'shared-11-BuQ3CK5I.js'), 'utf8');
  assert.equal(count(shared11, '{name:p_,storage:Bi(()=>mr),onRehydrateStorage:()=>()=>{m_&&y_.getState().markRead(m_)}}'), 1);
  assert.equal(count(shared11, 'up as mr'), 1);
  assert.equal(count(shared11, 'function E_(e){let t=y_(e=>e.markRead);S(()=>(m_=e,'), 1, 'm_ is the open session (E_), not a /btw child');
  const shared52 = readFileSync(path.join(v1, 'shared-52-DGviI8xb.js'), 'utf8');
  assert.equal(count(shared52, 'var $p=Qp(()=>On("localStorage"),"local_storage",Zp)'), 1);
  assert.equal(count(shared52, '$p as up'), 1);
});

test('a /btw child shown before its record arrives is marked read once the record arrives unread', () => {
  const h = host({ parent: {} });
  const side = hookFixture(appSide, { ...h.props, shown: 'child' });
  assert.deepEqual(h.calls, [], 'no record yet: nothing to read');
  side.render({ ...h.props, metadata: { parent: {}, child: { unread: true } }, shown: 'child' });
  assert.deepEqual(h.calls, [['child', { unread: false }]]);
  // Once per mount, as v_: a later Mark as unread while shown (a new snapshot) is left alone.
  side.render({ ...h.props, metadata: { parent: {}, child: { unread: true, marked: 1 } }, shown: 'child' });
  assert.equal(h.calls.length, 1);
  side.close();
});

test('a record arriving read, or after the child is hidden, writes nothing; the kept check is dropped', () => {
  const h = host({});
  const side = hookFixture(appSide, { ...h.props, shown: 'child' });
  side.render({ ...h.props, metadata: { child: { unread: false } }, shown: 'child' });
  side.render({ ...h.props, metadata: { child: { unread: true } }, shown: 'child' });
  assert.deepEqual(h.calls, [], 'it arrived read; the later unread is not a mount');
  side.render({ ...h.props, metadata: { child: { unread: true } }, shown: 'other' });
  side.render({ ...h.props, metadata: { child: { unread: true } }, shown: undefined });
  side.render({ ...h.props, metadata: { child: { unread: true }, other: { unread: true } }, shown: undefined });
  assert.deepEqual(h.calls, [], 'other was hidden before its record arrived');
  // The settle asks x_ with the write held back: nothing is marked unread on the way.
  markUnreadUnlessShown('child');
  assert.deepEqual(h.calls, [['child', { unread: true }, { automatic: true }]], 'x_ itself still writes');
  side.close();
});

test('a check kept while records are missing survives other snapshots, and the pane set does not count as shown', () => {
  const h = host({});
  const side = hookFixture(appSide, { ...h.props, shown: 'child', paneShows: id => id === 'child' });
  side.render({ ...h.props, metadata: { unrelated: {} }, shown: 'child', paneShows: id => id === 'child' });
  assert.deepEqual(h.calls, []);
  side.render({ ...h.props, metadata: { unrelated: {}, child: { unread: true } }, shown: 'child', paneShows: id => id === 'child' });
  assert.deepEqual(h.calls, [['child', { unread: false }]], 'still registered in __');
  assert.equal(paneSessions.has('child'), true, 'the probe never leaks into h_');
  side.close();
  const later = host({});
  const gone = hookFixture(appSide, { ...later.props, shown: 'c2', paneShows: () => true });
  gone.render({ ...later.props, shown: undefined, paneShows: () => true });
  gone.render({ ...later.props, metadata: { c2: { unread: true } }, shown: undefined, paneShows: () => true });
  assert.deepEqual(later.calls, [], 'unregistered: only __ says shown, never h_');
  gone.close();
});

// R4g-btw BT3 (X7-14): x_ skips a child in __, and the official popouts are window.open children of one renderer
// (cd377abb5), so __ spans every window there. Locally each window reports its list for main.cjs's unread decision.
function reportingSide(props) {
  useBtwReadStateHost(props.side === 0, { metadata: props.metadata, update: props.update, paneShows: () => false, reportShown: props.reportShown });
  useShownSession(props.shown, true);
  useReportShownSession(props.shown);
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('the official shown list spans every window because popouts share the renderer', () => {
  const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
  const count = (text, needle) => text.split(needle).length - 1;
  const shared11 = readFileSync(path.join(v1, 'shared-11-BuQ3CK5I.js'), 'utf8');
  assert.equal(count(shared11, 'function x_(e){h_.has(e)||__.includes(e)||y_.getState().markUnread(e)}'), 1);
  const popouts = readFileSync(path.join(v1, 'cd377abb5-D8AWfngM.js'), 'utf8');
  assert.equal(count(popouts, 'window.open("about:blank",j,"")'), 1, 'a popout is a child window of the main renderer');
  assert.equal(count(popouts, 's.type==="epitaxy-side-pane"?r?p(Li,{id:e,entry:s,closePopout:c},e):null'), 1);
});

test('every split side reports the /btw child it shows; the bound host sends the deduplicated list once per change', async () => {
  const sends = [];
  const base = { metadata: {}, update: () => Promise.resolve(), reportShown: ids => { sends.push(ids); return Promise.resolve(); } };
  const primary = hookFixture(reportingSide, { ...base, side: 0, shown: undefined });
  await tick();
  assert.deepEqual(sends, [[]], 'a freshly bound host reports its (empty) list');
  const secondary = hookFixture(reportingSide, { ...base, side: 1, shown: 'c1' });
  primary.render({ ...base, side: 0, shown: 'c2' });
  await tick();
  assert.deepEqual(sends.at(-1), ['c1', 'c2'], 'one report for both sides, batched');
  assert.equal(sends.length, 2);
  primary.render({ ...base, side: 0, shown: 'c1' });
  await tick();
  assert.deepEqual(sends.at(-1), ['c1'], 'the same child on both sides reports once');
  primary.render({ ...base, side: 0, shown: 'c1' });
  await tick();
  assert.equal(sends.length, 3, 'no change, no report');
  secondary.close();
  await tick();
  assert.equal(sends.length, 3, 'c1 is still shown by side 0');
  assert.deepEqual(shownSideSessions(), ['c1']);
  primary.render({ ...base, side: 0, shown: undefined });
  await tick();
  assert.deepEqual(sends.at(-1), []);
  primary.close();
  await tick();
  assert.deepEqual(shownSideSessions(), []);
});

test('a failing report is swallowed, and a host without reportShown sends nothing', async () => {
  const failing = hookFixture(reportingSide, { side: 0, metadata: {}, update: () => Promise.resolve(), shown: 'c3', reportShown: () => Promise.reject(new Error('gone')) });
  await tick(); await tick();
  failing.close();
  const throwing = hookFixture(reportingSide, { side: 0, metadata: {}, update: () => Promise.resolve(), shown: 'c4', reportShown: () => { throw new Error('no api'); } });
  await tick();
  throwing.close();
  const silent = hookFixture(reportingSide, { side: 0, metadata: {}, update: () => Promise.resolve(), shown: 'c5' });
  await tick();
  silent.close();
  await tick();
  assert.deepEqual(shownSideSessions(), []);
});

test('main.jsx reports the shown child beside v_ through window-side-sessions', () => {
  const source = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  const bind = source.indexOf('useBtwReadStateHost(side === 0, { metadata: sessionMetadata, update: updateSessionMetadata, onReadError: actionFailed("mark-read"),');
  assert.ok(source.indexOf('reportShown: ids => call("window-side-sessions", { sessions: ids }) });') > bind);
  const shown = source.indexOf('useShownSession(shownBtwChild, true);');
  assert.ok(source.indexOf('useReportShownSession(shownBtwChild);') > shown);
});
