import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import registryModule from '../electron/window-registry.cjs';
import popoutRestore from '../electron/popout-restore.cjs';
import { createTileLayoutStore } from '../src/tile-layout-store.mjs';
import {
  BTW_POPOUT_PANE, BTW_VIEW_TITLE_MAX, BTW_DRAFT_PREFIX, btwDraftParent, btwSessionView, btwPopoutView, btwPopoutRequest,
  btwPopoutHolds, btwDockTarget, seedBtwPaneWindow,
} from '../src/popout-restore-btw.mjs';

// R4i-transcript TR3 (layout-08): the /btw side pane popped out into a window of its own (2.42304.0 epitaxy-side-pane,
// paneTileId "session" with sessionView), docked back, closed with its child and restored at relaunch. Controlled
// events, an injected window registry and fake windows only: no window opens.
const { WINDOW_KINDS, createWindowRegistry, sidePanePopoutsForSession } = registryModule;
const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');
const v1 = '/Users/oleyyu/claude-ui-lab/reference/installed-2.42304.0-20261017/ion-dist/assets/v1';
const official = (name) => fs.readFileSync(path.join(v1, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;

let nextId = 500;
class FakeContents extends EventEmitter {
  constructor() { super(); this.sent = []; this.mainFrame = { id: 'frame' }; }
  send(channel, event) { this.sent.push([channel, event]); }
  isDestroyed() { return false; }
}
class FakeWindow extends EventEmitter {
  constructor() { super(); this.id = nextId++; this.webContents = new FakeContents(); this.destroyed = false; }
  isDestroyed() { return this.destroyed; }
}
const quietTimers = { setTimeout: () => 0, clearTimeout: () => {} };

test('TR3 official: the /btw tile pops out with its sessionView, never as a draft, and comes back at relaunch with it', () => {
  const pane = official('cccc2cf0a-B0D--VZp.js');
  assert.equal(count(pane, 'a({type:"epitaxy-side-pane",sessionId:e.id,sessionType:e.type,paneTileId:t,title:n,...i,...r})'), 1);
  assert.equal(count(pane, 'o.getState().requestPopOut(t,n)&&(s(n),r(t))'), 1, 'XO closes the side pane (r = closeSidePane), not the tile');
  assert.equal(count(pane, 'Pe=XO({owner:P&&W===void 0?u:null,tileId:t,title:n??Pg(D,t),closeSidePane:le})'), 1);
  assert.equal(count(pane, 'P=(Xu(e)||b)&&!v'), 1, 'not inside a popout host');
  assert.equal(count(pane, 'W=sh(H?.sessionId)'), 1);
  assert.equal(count(official('cc43287c9-DAfOi8yP.js'), 'a==="session"&&EN(o.sessionView?.sessionId)!==void 0)return!1'), 1);
  const ids = official('c73f45bc3-CFrHin0p.js');
  assert.equal(count(ids, 'var tu="btw-draft:"'), 1);
  assert.equal(count(ids, 'function ru(e){return e?.startsWith(tu)?e.slice(10):void 0}'), 1);
  assert.equal(count(official('c03935b01-CyJKQj4N.js'), 'pa=new Set(["diff","file","artifact","terminal","plan","tasks","subagent","session","runs","pr","cr","framebuffer"])'), 1);
  assert.equal(count(official('shared-11-BuQ3CK5I.js'), 'if(r.type==="epitaxy-side-pane"&&o.type==="epitaxy-side-pane"){let n={...o,...r,title:r.title??o.title}'), 1);
  const manager = official('cd377abb5-D8AWfngM.js');
  assert.equal(count(manager, 'sessionView:n({sessionId:c,title:t().max(gr),btwSince:o().optional().catch(void 0)}).optional()'), 1);
  assert.equal(count(manager, ',gr=512'), 1);
  assert.equal(count(manager, 'vr=new Set(["subagent","session","cr"])'), 1);
  assert.equal(count(manager, 'function Sr(e,t){return!vr.has(e)||Object.keys(t).length>0}'), 1);
  assert.equal(count(manager, 'case"session":return i.sessionView?{sessionView:i.sessionView}:{}'), 1);
  assert.equal(count(manager, 'else if(t==="session"&&e.sessionView){let{sessionId:t,title:r,btwSince:i}=e.sessionView;n.sessionView={sessionId:t,title:r.slice(0,gr),btwSince:i}}'), 1);
  const window = official('c5638815a-D1NXo6h5.js');
  assert.equal(count(window, 'v&&e.setSessionView(v)'), 1);
  assert.equal(count(window, 'U=s(()=>{M&&Fe(M.getState(),l,F)==="parked"&&B.push(O.type==="landing"?H:V(t)),K.getState().closePopout(R),D()}'), 1);
});

test('TR3 model: sessionView follows _r; drafts never pop out; requests, holders and dock targets', () => {
  assert.equal(BTW_POPOUT_PANE, 'session');
  assert.equal(BTW_VIEW_TITLE_MAX, 512);
  assert.equal(btwDraftParent(`${BTW_DRAFT_PREFIX}parent`), 'parent');
  assert.equal(btwDraftParent('child'), undefined);
  assert.deepEqual(btwSessionView({ sessionId: 'c', title: 'x'.repeat(600), btwSince: 5 }), { sessionId: 'c', title: 'x'.repeat(512), btwSince: 5 });
  assert.deepEqual(btwSessionView({ sessionId: 'c', title: '', btwSince: 'no' }), { sessionId: 'c', title: 'c' }, 'btwSince .optional().catch(void 0)');
  for (const bad of [null, {}, { sessionId: '' }, { sessionId: 'btw-draft:p' }, { sessionId: 'a\u0001' }, { sessionId: 'x'.repeat(201) }]) assert.equal(btwSessionView(bad), null);
  assert.deepEqual(btwPopoutView({ childId: 'c', title: 'Why?', meta: { btw: { createdAt: 42 } } }), { sessionId: 'c', title: 'Why?', btwSince: 42 });
  assert.equal(btwPopoutView({ childId: 'btw-draft:p', title: 'Draft' }), null, 'cc43287c9 / cccc2cf0a W: a draft stays');
  assert.equal(btwPopoutView({}), null);
  assert.deepEqual(btwPopoutRequest({ parentId: 'p', view: { sessionId: 'c', title: 'T' }, position: { x: 10, y: 20 } }),
    { sessionId: 'p', pane: 'session', sessionView: { sessionId: 'c', title: 'T' }, position: { x: 10, y: 20 } });
  assert.deepEqual(btwPopoutRequest({ parentId: 'p', view: { sessionId: 'c', title: 'T' }, position: { x: NaN, y: 1 } }), { sessionId: 'p', pane: 'session', sessionView: { sessionId: 'c', title: 'T' } });
  assert.equal(btwPopoutRequest({ parentId: 'p', view: null }), null);
  const popouts = [{ sessionId: 'p', pane: 'session', sessionView: { sessionId: 'c' } }, { sessionId: 'q', pane: 'terminal' }];
  assert.equal(btwPopoutHolds(popouts, 'c'), true);
  assert.equal(btwPopoutHolds(popouts, 'q'), true, 'its own pane windows');
  assert.equal(btwPopoutHolds(popouts, 'other'), false);
  assert.equal(btwPopoutHolds(popouts, 'c', { self: { sessionId: 'p', pane: 'session' } }), false, 'a pane window is not elsewhere for itself');
  const docked = { kind: 'popout-docked', sessionId: 'p', pane: 'session', sessionView: { sessionId: 'c', title: 'T' } };
  assert.deepEqual(btwDockTarget({ ...docked, entryPoint: 'dock' }), { parentId: 'p', childId: 'c' });
  assert.deepEqual(btwDockTarget({ ...docked, entryPoint: 'window-close' }), { parentId: 'p', childId: 'c' });
  assert.equal(btwDockTarget({ ...docked, entryPoint: 'session-removed' }), null, 'closeSidePanePopoutsForSession drops it');
  assert.equal(btwDockTarget({ ...docked, entryPoint: 'close' }), null, 'its last tab closed with the window');
  assert.equal(btwDockTarget({ ...docked, pane: 'terminal', entryPoint: 'dock' }), null);
  assert.equal(btwDockTarget({ ...docked, sessionView: undefined, entryPoint: 'dock' }), null);
});

test('TR3 controlled events: the pane window seeds its tile from popout-state, follows popout-session-view, and the owner docks it back', () => {
  // The pane window's own tile store (main.jsx PANE_WINDOW "session").
  const paneTiles = createTileLayoutStore();
  assert.equal(seedBtwPaneWindow(paneTiles, 'p', { sessionId: 'c1', title: 'One' }), 'c1');
  assert.equal(paneTiles.getSession('p').btwSessionId, 'c1');
  let writes = 0; const off = paneTiles.subscribe(() => { writes += 1; });
  seedBtwPaneWindow(paneTiles, 'p', { sessionId: 'c1', title: 'One' });
  assert.equal(writes, 0, 'the same child is not written again');
  seedBtwPaneWindow(paneTiles, 'p', { sessionId: 'c2', title: 'Two' });
  assert.equal(paneTiles.getSession('p').btwSessionId, 'c2', 'shared-11 openPopout merged a new view');
  assert.equal(seedBtwPaneWindow(paneTiles, 'p', { sessionId: 'btw-draft:p' }), null);
  assert.equal(paneTiles.getSession('p').btwSessionId, 'c2');
  off();
  // The owner window: the docked popout's child shows again in the parent's tile.
  const ownerTiles = createTileLayoutStore();
  ownerTiles.setSession('p', { btwSessionId: 'old' });
  const target = btwDockTarget({ kind: 'popout-docked', sessionId: 'p', pane: 'session', entryPoint: 'dock', sessionView: { sessionId: 'c2', title: 'Two' } });
  ownerTiles.setSession(target.parentId, { btwSessionId: target.childId });
  assert.equal(ownerTiles.getSession('p').btwSessionId, 'c2');
});

test('TR3 injected registry: the /btw pane window holds its child, reports it for unread, and closes when the child is removed', () => {
  const registry = createWindowRegistry({ timers: quietTimers });
  const main = new FakeWindow(), pane = new FakeWindow();
  registry.register(main, { key: 'main', layout: { current: 'p' } });
  registry.register(pane, { key: 'w-btw', layout: { current: 'p' }, kind: WINDOW_KINDS.PANE });
  registry.setSideSessions(pane, ['c']);
  assert.deepEqual(registry.windowsShowing('c', { side: true }), [pane], 'BT3 window-side-sessions: no automatic unread for it');
  assert.deepEqual(registry.windowsShowing('c', { panes: true, side: true }), [pane], 'archive keeps the popout that holds it');
  assert.deepEqual(registry.windowsShowing('c'), [], 'routing still goes to a full window');
  const entry = { sessionId: 'p', pane: 'session', sessionView: { sessionId: 'c', title: 'T' }, window: pane };
  assert.deepEqual(sidePanePopoutsForSession([entry, { sessionId: 'p', pane: 'terminal' }], 'c'), [entry]);
  assert.deepEqual(sidePanePopoutsForSession([entry], 'p'), [entry], 'the parent removed takes its /btw popout too');
  // main.cjs closeSidePanePopoutsForSession over that entry.
  const source = read('electron/main.cjs');
  const start = source.indexOf('function closeSidePanePopoutsForSession(sessionId) {');
  const body = source.slice(start, source.indexOf('\n}\n', start) + 2);
  let closed = 0; pane.close = () => { closed += 1; };
  const run = new Function('popouts', 'sidePanePopoutsForSession', `${body}; return closeSidePanePopoutsForSession;`)(new Map([['k', entry]]), sidePanePopoutsForSession);
  run('c');
  assert.equal(closed, 1);
  assert.equal(entry.removed, true, 'entryPoint "session-removed": not docked back');
});

// main.cjs helpers, run with an injected config, app and fs over a temp folder.
function mainHelpers(config, dir) {
  const source = read('electron/main.cjs');
  const start = source.indexOf('function btwPopoutView(parentId, value) {');
  const end = source.indexOf('// Create (or focus) the pane window.', start);
  assert.ok(start > 0 && end > start);
  const fakeApp = { getPath: () => dir };
  return new Function('config', 'app', 'path', 'fs', 'popoutRestore', `${source.slice(start, end)}; return { btwPopoutView, saveBtwPopouts, takeBtwPopouts, BTW_POPOUTS_FILE };`)(config, fakeApp, path, fs, popoutRestore);
}

test('TR3 main.cjs: a /btw view is a known child of that parent; quit saves it apart and launch takes it once', () => {
  const config = { threadIds: ['p', 'c', 'x'], archivedThreadIds: ['old'], threadMetadata: {},
    sessionMetadata: { c: { spawnedFrom: { btw: true, sideSession: true, userFork: true, sessionId: 'p' } }, old: { spawnedFrom: { btw: true, sessionId: 'p' } }, x: { spawnedFrom: { sessionId: 'p' } } } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'btw-popouts-'));
  const helpers = mainHelpers(config, dir);
  assert.deepEqual(helpers.btwPopoutView('p', { sessionId: 'c', title: 'T', btwSince: 9 }), { sessionId: 'c', title: 'T', btwSince: 9 });
  assert.deepEqual(helpers.btwPopoutView('p', { sessionId: 'old' }), { sessionId: 'old', title: 'old' }, 'an archived child still shows');
  assert.equal(helpers.btwPopoutView('q', { sessionId: 'c' }), null, 'another parent');
  assert.equal(helpers.btwPopoutView('p', { sessionId: 'x' }), null, 'not a /btw child');
  assert.equal(helpers.btwPopoutView('p', { sessionId: 'nope' }), null);
  assert.equal(helpers.btwPopoutView('p', { sessionId: 'btw-draft:p' }), null);
  const bounds = { x: 10, y: 20, width: 500, height: 400 };
  helpers.saveBtwPopouts([
    { sessionId: 'p', pane: 'session', alwaysOnTop: true, bounds, ownerKey: 'main', view: { sessionId: 'c', title: 'T', btwSince: 9 } },
    { sessionId: 'q', pane: 'session', bounds },
  ]);
  const file = path.join(dir, helpers.BTW_POPOUTS_FILE);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.popouts.map((item) => [item.sessionId, item.view?.sessionId]), [['p', 'c']], 'cd377abb5 Sr: no view, not saved');
  const list = helpers.takeBtwPopouts((id) => id === 'p');
  assert.deepEqual(list, [{ sessionId: 'p', pane: 'session', alwaysOnTop: true, bounds, ownerKey: 'main', view: { sessionId: 'c', title: 'T', btwSince: 9 } }]);
  assert.equal(fs.existsSync(file), false, 'taken once');
  assert.deepEqual(helpers.takeBtwPopouts(() => true), []);
  // A child gone since the quit is not restored.
  helpers.saveBtwPopouts([{ sessionId: 'p', pane: 'session', bounds, view: { sessionId: 'c', title: 'T' } }]);
  config.threadIds = ['p'];
  assert.deepEqual(helpers.takeBtwPopouts(() => true), []);
  helpers.saveBtwPopouts([]);
  assert.equal(fs.existsSync(file), false, 'nothing to save leaves no file');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('TR3 main.cjs wiring: popout-open carries the view, merges it into an open popout, and every exit keeps it', () => {
  const main = read('electron/main.cjs');
  assert.match(main, /const POPOUT_KINDS = new Set\(\["files", "changes", "plan", "tasks", "terminal", "side-chat", "session"\]\);/);
  assert.match(main, /const APP_POPOUT_KINDS = new Set\(\["tasks", "terminal", "side-chat", "session"\]\);/);
  const open = main.slice(main.indexOf('async function openPopout('), main.indexOf('function savePopoutsForRelaunch'));
  assert.match(open, /const view = pane === "session" \? btwPopoutView\(sessionId, sessionView\) : null;\n\s+if \(pane === "session" && !view\) throw new Error\("Unknown session\."\);/);
  assert.match(open, /existing\.sessionView = view;\n\s+existing\.window\.webContents\.send\("desktop:event", \{ kind: "popout-session-view", sessionView: view \}\);/);
  assert.match(open, /const entry = \{ window, sessionId, pane, \.\.\.\(view \? \{ sessionView: view \} : \{\}\), docked: false/);
  assert.match(open, /\.\.\.\(entry\.handback \? \{ data: entry\.handback \} : \{\}\), \.\.\.\(entry\.sessionView \? \{ sessionView: entry\.sessionView \} : \{\}\)/);
  assert.match(main, /alwaysOnTop: entry\.alwaysOnTop === true, \.\.\.\(entry\.sessionView \? \{ sessionView: entry\.sessionView \} : \{\}\) \}\)\);/, 'popoutList');
  assert.match(main, /config: sharedConfig\(\), \.\.\.\(entry\.seed \? \{ seed: entry\.seed \} : \{\}\), \.\.\.\(entry\.sessionView \? \{ sessionView: entry\.sessionView \} : \{\}\) \};/, 'popout-state');
  const update = main.slice(main.indexOf('case "popout-session-view": {'), main.indexOf('case "popout-session-view": {') + 500);
  assert.match(update, /if \(!entry \|\| entry\.window\.isDestroyed\(\) \|\| entry\.pane !== "session"\) throw new Error\("Unknown pane window\."\);/);
  assert.match(update, /const view = btwPopoutView\(entry\.sessionId, p\?\.sessionView\);/);
  assert.match(main, /\(entry\.pane === "session" \? btwEntries : entries\)\.push\(/);
  assert.match(main, /saveBtwPopouts\(btwEntries\);/);
  assert.match(main, /\{ kinds: RESTORABLE_POPOUT_KINDS, exists \}\), \.\.\.takeBtwPopouts\(exists\)\];/);
  assert.match(main, /await openPopout\(\{ sessionId: item\.sessionId, pane: item\.pane, \.\.\.\(item\.view \? \{ sessionView: item\.view \} : \{\}\) \}, owner,/);
});

test('TR3 renderer wiring: Pop out, tear-off, the pane window and the dock back', () => {
  const split = read('src/source-split-view.jsx');
  assert.match(split, /export const APP_PANE_WINDOW_KINDS = Object\.freeze\(\["tasks", "terminal", "side-chat", "session"\]\);/);
  const jsx = read('src/main.jsx');
  assert.match(jsx, /import \{ btwPopoutView, btwPopoutRequest, btwPopoutHolds, btwDockTarget, seedBtwPaneWindow \} from "\.\/popout-restore-btw\.mjs";/);
  assert.match(jsx, /if \(PANE_WINDOW\.pane === "session"\) seedBtwPaneWindow\(tileStore, PANE_WINDOW\.sessionId, value\?\.sessionView\);/);
  assert.match(jsx, /if \(kind === "session" && !poppedOut\) void btwControllerRef\.current\?\.onPaneClosed\(sessionId, entry\.btwSessionId\);/, 'XO closeSidePane: the child is not closed by a pop out');
  assert.match(jsx, /await call\("popout-open", btw \?\? \{ sessionId: id, pane: kind, position \}\);\n\s+closePaneTile\(kind, id, \{ poppedOut: true \}\);/);
  assert.match(jsx, /const btw = kind === "session" \? btwPopoutRequest\(\{ parentId: id, view: btwViewRef\.current, position \}\) : null;/);
  assert.match(jsx, /if \(!PANE_KINDS\.includes\(tileId\) \|\| tileId === "preview" \|\| !api \|\| !currentRef\.current\) return false;\n(?:\s+\/\/.*\n)*\s+if \(tileId === "session" && !btwViewRef\.current\) return false;/);
  assert.match(jsx, /const isBtwOpenElsewhere = id => splitStore\.sideShowing\(id\) !== null \|\| btwPopoutHolds\(popouts, id, \{ self: PANE_WINDOW \}\);/);
  assert.match(jsx, /call\("popout-session-view", \{ sessionView: btwViewRef\.current \}\)/);
  assert.match(jsx, /const btwDock = side === 0 \? btwDockTarget\(e\) : null;\n\s+if \(btwDock\) tileStore\.setSession\(btwDock\.parentId, \{ btwSessionId: btwDock\.childId \}\);/);
  assert.match(jsx, /if \(PANE_WINDOW\?\.pane === "session" && side === 0 && e\.kind === "popout-session-view"\) seedBtwPaneWindow\(tileStore, PANE_WINDOW\.sessionId, e\.sessionView\);/);
  assert.match(jsx, /e\.entryPoint !== "session-removed" && !\(e\.pane === "session" && e\.entryPoint === "close"\)\) openPaneTile\(e\.pane, e\.sessionId\);/);
  assert.match(jsx, /controls=\{PANE_WINDOW \? <SourcePopoutControls paneName=\{PANE_NAMES\.session\} onDock=\{\(\) => dockPaneWindow\(\)\} alwaysOnTop=\{popoutPinned\} onToggleAlwaysOnTop=\{togglePaneWindowPin\} \/>/);
  assert.match(jsx, /onPopOut=\{api && current && btwView \? \(\) => popoutTile\("session"\) : undefined\} onClose=\{\(\) => closePaneTile\('session'\)\}\/>\} \/>/);
  assert.match(jsx, /if \(kind === "session"\) void btwControllerRef\.current\?\.onPaneClosed\(sessionId, tileStore\.getSession\(sessionId\)\?\.btwSessionId\);\n\s+dockPaneWindow\(\{ close: kind === "session" \}\);/);
  // The pane window reports the child it shows (R4g-btw BT3), as the session tile in a main window does.
  assert.match(jsx, /const shownBtwChild = \(PANE_WINDOW\?\.pane !== "side-chat" && current && openPanes\.has\("session"\) && btwSessionId\) \|\| undefined;/);
});
