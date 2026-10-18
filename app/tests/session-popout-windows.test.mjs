import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import registryModule from '../electron/window-registry.cjs';
import popoutRestore from '../electron/popout-restore.cjs';
import { createSplitViewStore } from '../src/split-view-store.mjs';
import { createSideChatStore } from '../src/side-chat-store.mjs';
import { promptAdditions } from '../src/inline-comments.mjs';

// B27 session popout windows: a session (or a new-session draft) in a sidebar-less popout (cd377abb5 xi/Q, shared-11 Zo
// "code-session" / "code-draft"), the Tasks / Terminal / Side chat panes in windows of their own (c03935b01 $a,
// cd377abb5 Ci/_i), and the relaunch list (cd377abb5 wr).
const { WINDOW_KINDS, MAX_SESSION_POPOUTS, launchLayout, routeEvent, createWindowRegistry } = registryModule;
const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(app, file), 'utf8');

let nextId = 100;
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
const sentKinds = (window) => window.webContents.sent.map(([, event]) => event.kind ?? event.method);

test('a session popout shows one session, never splits, and is neither a full window nor written to open-windows.json', () => {
  assert.deepEqual(launchLayout('w-abc', { current: 'a', split: { sessionId: 'b' } }, WINDOW_KINDS.SESSION), { current: 'a', split: null });
  assert.deepEqual(launchLayout('w-abc', { current: null }, WINDOW_KINDS.SESSION), { current: null, split: null }, 'a draft popout');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b27-registry-'));
  const file = path.join(dir, 'open-windows.json');
  const registry = createWindowRegistry({ file, timers: quietTimers });
  const main = new FakeWindow(), popout = new FakeWindow(), draft = new FakeWindow();
  registry.register(main, { key: 'main', layout: { current: 'x' } });
  registry.register(popout, { key: 'w-popout', layout: { current: 'a', split: { panes: [{ sessionId: 'b', col: 1, row: 0 }] } }, kind: WINDOW_KINDS.SESSION });
  registry.register(draft, { key: 'w-draft', layout: { current: null }, kind: WINDOW_KINDS.SESSION });
  assert.deepEqual(registry.layoutOf(popout), { current: 'a', split: null });
  assert.equal(registry.kindOf(popout), 'session');
  assert.equal(registry.isSessionPopout(popout), true);
  assert.equal(registry.isSessionPopout(main), false);
  assert.deepEqual(registry.fullWindows(), [main]);
  assert.deepEqual(registry.mainWindows(), [main, popout, draft], 'popouts get the main windows’ IPC and events');
  assert.equal(registry.popoutFor('a'), popout, 'shared-11 Xo: a code-session popout is keyed by its session');
  assert.equal(registry.popoutFor('x'), null, 'a full window showing a session is no popout of it');
  assert.deepEqual(registry.sessionPopouts().map((entry) => entry.sessionId), ['a', null]);
  // The draft becomes its session's popout on its first send (startSessionInDraftPopout).
  registry.setLayout(draft, { current: 'c', split: { panes: [{ sessionId: 'd', col: 1, row: 0 }] } });
  assert.deepEqual(registry.layoutOf(draft), { current: 'c', split: null });
  assert.equal(registry.popoutFor('c'), draft);
  registry.noteFocus(popout);
  assert.equal(registry.lastFocused(), popout);
  assert.equal(registry.lastFocusedFull(), main, 'the main window is never a popout');
  registry.flush();
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.windows.map((entry) => entry.key), ['main']);
  assert.equal(saved.focused, 'main');
  assert.equal(MAX_SESSION_POPOUTS, 16);
});

test('pane windows hold their session for the connection but never count as showing it for routing', () => {
  const registry = createWindowRegistry({ timers: quietTimers });
  const main = new FakeWindow(), pane = new FakeWindow(), popout = new FakeWindow();
  registry.register(main, { key: 'main', layout: { current: 'x' } });
  registry.register(pane, { key: 'w-pane', layout: { current: 's' }, kind: WINDOW_KINDS.PANE });
  assert.equal(registry.isPaneWindow(pane), true);
  assert.deepEqual(registry.windowsShowing('s'), []);
  assert.deepEqual(registry.windowsHolding('s'), [pane], 'thread/unsubscribe keeps the session for the pane window');
  registry.noteFocus(pane);
  // A notification click for that session goes to a full window (which opens it), not the focused pane window.
  assert.deepEqual(registry.dispatch({ kind: 'desktop-navigate', threadId: 's' }), [main]);
  // A session no window shows opens in a full window even while a popout is focused.
  registry.register(popout, { key: 'w-pop', layout: { current: 'p' }, kind: WINDOW_KINDS.SESSION });
  registry.noteFocus(popout);
  assert.deepEqual(registry.dispatch({ kind: 'desktop-navigate', threadId: 'z' }), [main]);
  assert.deepEqual(registry.dispatch({ kind: 'desktop-navigate', threadId: 'p' }), [popout], 'the popout showing it');
  // File references from a popped-out pane: the window showing the session, else the owner.
  assert.deepEqual(routeEvent({ kind: 'open-file-ref', sessionId: 's', ref: { path: '/a' }, windowId: 4 }), { target: 'session', sessionId: 's', windowId: 4 });
  assert.deepEqual(registry.dispatch({ kind: 'open-file-ref', sessionId: 's', ref: { path: '/a' }, windowId: main.id }), [main]);
  assert.ok(sentKinds(main).includes('open-file-ref'));
  assert.ok(!sentKinds(pane).includes('open-file-ref'));
  assert.deepEqual(registry.fullWindows(), [main]);
  assert.equal(registry.popoutFor('s'), null);
});

test('relaunch: session popouts are saved beside the pane popouts with their own cap; the side chat window is transient', () => {
  const bounds = { x: 10, y: 20, width: 900, height: 700 };
  const kinds = new Set(['files', 'changes', 'plan', 'tasks', 'terminal', 'session']);
  const sessions = Array.from({ length: 20 }, (_, index) => ({ sessionId: `s${index}`, pane: 'session', bounds, alwaysOnTop: index === 0 }));
  const panes = Array.from({ length: 14 }, (_, index) => ({ sessionId: `p${index}`, pane: 'tasks', bounds }));
  const list = popoutRestore.popoutSnapshot([...sessions, ...panes, { sessionId: 'c', pane: 'side-chat', bounds }], { kinds });
  assert.equal(list.filter((entry) => entry.pane === 'session').length, popoutRestore.MAX_SESSION_POPOUTS);
  assert.equal(list.filter((entry) => entry.pane === 'tasks').length, popoutRestore.MAX_POPOUTS);
  assert.equal(list.some((entry) => entry.pane === 'side-chat'), false);
  assert.equal(list[0].alwaysOnTop, true);
  const main = read('electron/main.cjs');
  assert.match(main, /const RESTORABLE_POPOUT_KINDS = new Set\(\[\.\.\.\[\.\.\.POPOUT_KINDS\]\.filter\(\(kind\) => kind !== "side-chat"\), "session"\]\);/);
  assert.match(main, /for \(const \{ window, sessionId \} of windowRegistry\.sessionPopouts\(\)\) \{\n\s+if \(!sessionId \|\| !liveContents\(window\)\) continue;/, 'a draft popout is not restored');
  // R4i-transcript TR3: a /btw popout (pane "session" with a view, open-btw-popouts.json) is a pane window, not a session popout.
  assert.match(main, /if \(item\.pane === popoutRestore\.SESSION_PANE && !item\.view\) \{\n\s+await openSessionPopout\(\{ sessionId: item\.sessionId, restore:/);
});

test('a window without split view keeps only its primary pane (c2189a16b popout_has_no_panes)', () => {
  const reports = [];
  const store = createSplitViewStore({ allowSplit: false, report: (value) => reports.push(value), timers: quietTimers });
  store.reportSide(0, { current: 'a', title: 'A' });
  assert.equal(store.open('b').open, false);
  assert.equal(store.openLeft('b'), false);
  assert.equal(store.command('new-right'), false);
  assert.equal(store.restore({ panes: [{ sessionId: 'b', col: 1, row: 0 }] }).open, false);
  assert.equal(store.splitAllowed(), false);
  assert.equal(store.getState().panes.length, 0);
  const full = createSplitViewStore({ timers: quietTimers });
  full.reportSide(0, { current: 'a', title: 'A' });
  assert.equal(full.open('b').open, true, 'a full window still splits');
});

test('side chat window: the settled conversation moves in and back out; a streaming one stays put', () => {
  const store = createSideChatStore({ now: () => 1 });
  store.ask('t', 'question', 'r1');
  assert.equal(store.exportThread('t'), null, 'an answer still streaming stays with the window that asked');
  store.delta('t', 'r1', 'answer');
  store.finish('t', 'r1', {});
  store.setDraft('t', 'draft');
  store.stageContext('t', 'selected');
  const data = store.exportThread('t');
  assert.deepEqual(data.messages, [{ role: 'user', text: 'question' }, { role: 'assistant', text: 'answer' }]);
  assert.equal(data.draft, 'draft');
  assert.equal(data.stagedContext, 'selected');
  const other = createSideChatStore();
  assert.equal(other.importThread('t', JSON.parse(JSON.stringify(data))), true);
  assert.deepEqual(other.get('t').messages, data.messages);
  assert.equal(other.get('t').status, 'idle');
  assert.equal(other.get('t').draft, 'draft');
  assert.deepEqual(other.history('t'), [{ question: 'question', answer: 'answer' }]);
  assert.equal(other.importThread('t', null), false);
  assert.equal(other.importThread('t', { messages: [{ role: 'system', text: 'x' }, { role: 'user', text: 7 }] }), true);
  assert.deepEqual(other.get('t').messages, [{ role: 'user', text: '' }]);
});

test('a terminal selection relayed from a popped-out Terminal keeps its tab label', () => {
  assert.equal(promptAdditions.queue('b27', 'ls output', { label: 'Terminal 2', terminalTabId: 'tab-2', other: 1 }), true);
  assert.equal(promptAdditions.queue('b27', 'plain'), true);
  assert.deepEqual(promptAdditions.takeEntries('b27'), [{ text: 'ls output', meta: { label: 'Terminal 2', terminalTabId: 'tab-2' } }, { text: 'plain' }]);
  assert.equal(promptAdditions.has('b27'), false);
});

test('main.cjs: Open in new window, ⌘-click, tear-off and File › New Window open session popouts; the popout header docks and pins', () => {
  const main = read('electron/main.cjs');
  const open = main.slice(main.indexOf('async function openSessionPopout('), main.indexOf('async function dockTargetWindow('));
  assert.match(open, /const existing = windowRegistry\.popoutFor\(sessionId\);/);
  assert.match(open, /windowRegistry\.sessionPopouts\(\)\.length >= MAX_SESSION_POPOUTS/);
  assert.match(open, /\{ \.\.\.POPOUT_DEFAULT_SIZE \}/);
  assert.match(open, /minWidth: POPOUT_MIN_SIZE\.width,\s*minHeight: POPOUT_MIN_SIZE\.height/);
  assert.match(open, /kind: WINDOW_KINDS\.SESSION \}\);/);
  assert.match(open, /const query = \{ window: "session" \};/);
  assert.match(open, /if \(restore \|\| inactive\) window\.showInactive\(\); else window\.show\(\);/, 'Q showInactive for a relaunch or an agent (c2189a16b I)');
  assert.match(main, /return openSessionPopout\(\{ sessionId, from: windowRegistry\.windowForSender\(e\.sender\) \?\? win, position \}\);/);
  assert.match(main, /if \(e\?\.kind === "new-window"\) return void openSessionPopout\(/);
  assert.match(main, /newWindow: windowRegistry\.sessionPopouts\(\)\.length < MAX_SESSION_POPOUTS/);
  const dock = main.slice(main.indexOf('case "session-popout-dock":'), main.indexOf('case "session-popout-dock":') + 900);
  assert.match(dock, /windowRegistry\.send\(target, \{ kind: "desktop-navigate", threadId: sessionId \?\? null \}\)/);
  assert.match(dock, /window\.close\(\)/);
  assert.match(main, /case "session-popout-pin": \{[\s\S]{0,300}window\.setAlwaysOnTop\(value\);/);
  assert.match(main, /const next = splitMenuState\(windowRegistry\.isSessionPopout\(window\) \? null : payload\);/);
  assert.doesNotMatch(main, /async function openWindow\(/, 'no full window for a single session any more');
  // Pane windows for Tasks, Terminal, Side chat and (R4i-transcript TR3) the /btw side pane run the session's App.
  assert.match(main, /const POPOUT_KINDS = new Set\(\["files", "changes", "plan", "tasks", "terminal", "side-chat", "session"\]\);/);
  assert.match(main, /const APP_POPOUT_KINDS = new Set\(\["tasks", "terminal", "side-chat", "session"\]\);/);
  assert.match(main, /if \(appPane\) windowRegistry\.register\(window, \{ key: newWindowKey\(\), layout: \{ current: sessionId, split: null \}, kind: WINDOW_KINDS\.PANE \}\);/);
  assert.match(main, /const query = appPane \? \{ window: "pane", popout: sessionId, pane, cwd \} : \{ popout: sessionId, pane, cwd \};/);
});

test('main.jsx: the popout renders without sidebar or split, ends its titlebar with Open in main window and the pin, and pops panes out', () => {
  const jsx = read('src/main.jsx');
  assert.match(jsx, /const NO_SIDEBAR = SESSION_POPOUT \|\| !!PANE_WINDOW;/);
  assert.match(jsx, /\{side === 0 && !NO_SIDEBAR && <SourceSidebarBoundary>/);
  assert.match(jsx, /popoutWindow=\{SESSION_POPOUT \? \{ alwaysOnTop: popoutPinned, onDock: dockSessionPopout, onTogglePin: toggleSessionPopoutPin \} : null\}/);
  assert.match(jsx, /if \(SESSION_POPOUT\) \{ window\.close\(\); return; \}/, '⌘W closes the popout once no pane is left');
  assert.match(jsx, /storage: \(SESSION_POPOUT_WINDOW \|\| PANE_WINDOW\) && tileStorage\n\s+\? \{ getItem: \(name\) => tileStorage\.getItem\(name\), setItem: \(\) => \{\}, removeItem: \(\) => \{\} \}/);
  assert.match(jsx, /if \(!PANE_KINDS\.includes\(tileId\) \|\| tileId === "preview" \|\| !api \|\| !currentRef\.current\) return false;/);
  assert.match(jsx, /onPopOut=\{api && current && !popoutKeys\.has\(`\$\{current\}:terminal`\) \? \(\) => popoutTile\("terminal"\) : undefined\}/);
  assert.match(jsx, /onPopOut=\{api && current && !popoutKeys\.has\(`\$\{current\}:tasks`\) \? \(\) => popoutTile\("tasks"\) : undefined\}/);
  // B27 review: cccc2cf0a AT w = pe() && !xn() — no side chat window from a window other than the main one.
  assert.match(jsx, /onPopOut=\{api && boot\?\.connected && !SESSION_POPOUT \? popOutSideChat : null\}/);
  // B27 review: the palette lives in the sidebar; ⌘K in a sidebar-less window opens nothing.
  assert.match(jsx, /function searchShortcut\(toggle\) \{\n(?:\s+\/\/.*\n)*\s+if \(NO_SIDEBAR\) return;/);
  // B27 review: Back/Forward count toward the split tip (Td/xd follow the pathname).
  assert.match(jsx, /openSession\(history\[at\]\);\n(?:\s+\/\/.*\n)*\s+noteSessionSwitch\(history\[at\]\);/);
  assert.match(jsx, /<SourceSideChat windowed threadId=\{PANE_WINDOW\.sessionId\}/);
  assert.match(jsx, /\{popoutSession && !PANE_WINDOW && PANE_KINDS\.includes\(popoutQuery\.get\("pane"\)\)/);
  const titlebar = read('src/source-titlebar.jsx');
  assert.match(titlebar, /label=\{t\("Open in main window"\)\}\n\s+icon="ArrowInSquare"/);
  assert.match(titlebar, /icon=\{popoutWindow\.alwaysOnTop \? "PinFilled" : "Pin"\}/);
  const sideChat = read('src/source-side-chat.jsx');
  assert.match(sideChat, /icon="WindowNew" iconSize=\{16\} iconOnly aria-label=\{t\('Open in new window'\)\}/);
  assert.match(sideChat, /icon="ArrowInSquare" iconSize=\{16\} iconOnly aria-label=\{t\('Open in main window'\)\}/);
});

// R4g-btw BT3 (X7-14): the windows' reported /btw children suppress automatic unread marks in other windows, and an
// archived or deleted session's pane windows close without docking back (shared-11 closeSidePanePopoutsForSession,
// called by c03935b01 evictEpitaxySession).
test('main.cjs takes each window\'s shown /btw children and closes a removed session\'s pane windows', () => {
  const main = read('electron/main.cjs');
  assert.match(main, /case "window-side-sessions": return windowRegistry\.setSideSessions\(windowRegistry\.windowForSender\(e\.sender\), p\?\.sessions\);/);
  const automatic = main.slice(main.indexOf('if (p.automatic === true && p.patch?.unread === true) {'));
  assert.match(automatic.slice(0, 500), /if \(windowRegistry\.windowsShowing\(p\.id, \{ side: true \}\)\.length\) return sidebarSnapshot\(\);/);
  assert.doesNotMatch(main, /if \(windowRegistry\.windowsShowing\(p\.id\)\.length\) return sidebarSnapshot\(\);/);
  const archive = main.slice(main.indexOf('if (p.method === "thread/archive") {\n          agentTools.cancelSession'));
  assert.match(archive.slice(0, 1400), /if \(!windowRegistry\.windowsShowing\(params\.threadId, \{ panes: true, side: true \}\)\.length\) closeSidePanePopoutsForSession\(params\.threadId\);/);
  assert.doesNotMatch(main, /if \(!windowRegistry\.windowsShowing\((params\.threadId|thread\.id)\)\.length\) closeSidePanePopoutsForSession/);
  const remove = main.slice(main.indexOf('if (p.method === "thread/delete") {\n          const id = params.threadId;'));
  assert.match(remove.slice(0, 1200), /closeSidePanePopoutsForSession\(id\);/);
  const changed = main.slice(main.indexOf('onChanged: (op, thread) => {'));
  assert.match(changed.slice(0, 600), /if \(!windowRegistry\.windowsShowing\(thread\.id, \{ panes: true, side: true \}\)\.length\) closeSidePanePopoutsForSession\(thread\.id\);/);
  assert.match(main, /entryPoint: entry\.removed \? "session-removed" : entry\.closed \? "close" : entry\.docked \? "dock" : "window-close"/);
  // The function itself, run over fake pane windows.
  const start = main.indexOf('function closeSidePanePopoutsForSession(sessionId) {');
  const body = main.slice(start, main.indexOf('\n}\n', start) + 2);
  const closed = [];
  const fake = (sessionId, pane, destroyed = false) => ({ sessionId, pane, window: { isDestroyed: () => destroyed, close() { closed.push(`${sessionId}:${pane}`); } } });
  const popouts = new Map([['a', fake('s', 'terminal')], ['b', fake('s', 'files', true)], ['c', fake('t', 'tasks')]]);
  const run = new Function('popouts', 'sidePanePopoutsForSession', `${body}; return closeSidePanePopoutsForSession;`)(popouts, registryModule.sidePanePopoutsForSession);
  run('s');
  assert.deepEqual(closed, ['s:terminal'], 'a destroyed window is skipped; other sessions keep theirs');
  assert.equal(popouts.get('a').removed, true);
  assert.equal(popouts.get('c').removed, undefined);
});

// R4g fix (review of BT3): the official archive path evicts only at `refCount===0`, checked once on idle (c6b8adeaf Ti →
// shared-25 Wc requestIdleCallback), and a side-pane popout holds its own session (c5638815a PopoutEpitaxyPaneContent
// `ve(k)` = c5da7eb42 lF → openSession, refCount+1). releaseSession only drops the bucket; nothing closes popouts later.
// So an archived session's pane windows stay while anything — they themselves included — holds it.
test('archive keeps pane windows that hold the session, as the official refCount does', () => {
  const ref = '/Users/oleyyu/claude-ui-lab/reference/installed-2.42304.0-20261017/ion-dist/assets/v1';
  const count = (name, needle) => fs.readFileSync(path.join(ref, name), 'utf8').split(needle).length - 1;
  assert.equal(count('c5638815a-D1NXo6h5.js', 'it as ve'), 1);
  assert.equal(count('c5638815a-D1NXo6h5.js', 've(k);let{isFocused:j}=Q();ke({sessionRef:k,placement:f.Popout,paneFocused:j,viewOnly:!0})'), 1);
  assert.equal(count('c5da7eb42-B8cTG8SI.js', 'lF as it'), 1);
  assert.equal(count('c5da7eb42-B8cTG8SI.js', 'if(e)return i(p,e,_(p,m)),yu({id:p,type:m},e),()=>o(p)'), 1);
  assert.equal(count('c06cf64bb-BE5q2vSr.js', 'releaseSession(e){let t=q(e);if(!t)return;let n=Math.max(0,t.refCount-1);'), 1);
  assert.equal(count('c06cf64bb-BE5q2vSr.js', 'closeSidePanePopoutsForSession'), 0, 'the bucket release path never closes popouts');
  assert.equal(count('c03935b01-CyJKQj4N.js', 'closeSidePanePopoutsForSession'), 1, 'only evictEpitaxySession (and jT onSessionRemoved) close them');
  const registry = createWindowRegistry({ timers: quietTimers });
  const main = new FakeWindow(), pane = new FakeWindow();
  registry.register(main, { key: 'main', layout: { current: 'x' } });
  registry.register(pane, { key: 'w-pane', layout: { current: 's' }, kind: WINDOW_KINDS.PANE });
  registry.setSideSessions(main, ['child']);
  const holders = (id) => registry.windowsShowing(id, { panes: true, side: true });
  assert.deepEqual(holders('s'), [pane], 'the pane window holds its archived session: not closed');
  assert.deepEqual(holders('child'), [main], 'a /btw child shown in a pane is held');
  assert.deepEqual(holders('x'), [main]);
  assert.deepEqual(holders('gone'), [], 'nothing holds it: its popouts close');
  pane.destroyed = true;
  assert.deepEqual(holders('s'), []);
});

test('main.jsx does not dock back a pane window closed for a removed session', () => {
  const source = read('src/main.jsx');
  // R4i-transcript TR3: nor a /btw popout whose last tab closed with it (entryPoint "close").
  assert.match(source, /else if \(e\.kind === "popout-docked" && typeof e\.sessionId === "string" && side === 0 && e\.entryPoint !== "session-removed" && !\(e\.pane === "session" && e\.entryPoint === "close"\)\) openPaneTile\(e\.pane, e\.sessionId\);/);
  assert.doesNotMatch(source, /else if \(e\.kind === "popout-docked" && typeof e\.sessionId === "string" && side === 0\) openPaneTile/);
});
