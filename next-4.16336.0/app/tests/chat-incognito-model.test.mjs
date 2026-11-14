import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import * as model from '../src/chat-incognito-model.mjs';
import * as electronModel from '../electron/chat-incognito-model.mjs';
import { surfaceSessions } from '../electron/surface-policy.mjs';
import { paletteActions } from '../src/sidebar-palette-model.mjs';
import zhSidebar from '../electron/i18n/zh-CN/sidebar.mjs';

// w13-chatfn-history (research/w13-chatfn.md H7, chatfn-48): incognito chats on the local core. Official chunks are read as
// text only; no browser, Electron or core.
const app = path.resolve(import.meta.dirname, '..');
const chunk = prefix => fs.readFileSync(path.join(ionSource, fs.readdirSync(ionSource).find(name => name.startsWith(prefix) && name.endsWith('.js'))), 'utf8');
const local = file => fs.readFileSync(path.join(app, file), 'utf8');

test('the official incognito command and notices (shared-1 $P, shared-0 BR, shared-78), word for word', () => {
  const shared1 = chunk('shared-1-');
  assert.ok(shared1.includes('$P=q({description:{defaultMessage:"Incognito chat",id:"MZWV60Fq3N"},description_session:{defaultMessage:"Incognito",id:"DrsxJsu9e7"}})'));
  assert.ok(shared1.includes('incognito:{description:$P.description,sessionDescription:$P.description_session,group:"chat",shortcut:{bindings:[{key:"i",modifiers:["cmd","shift"],platform:"mac"},{key:"i",modifiers:["ctrl","shift"],platform:"non-mac"}]},icon:Q("Ghost"),href:"/new?incognito=true"}'));
  const C = model.INCOGNITO_COMMAND;
  assert.deepEqual([C.id, C.description, C.sessionDescription, C.group, C.icon, C.href], ['incognito', 'Incognito chat', 'Incognito', 'chat', 'Ghost', '/new?incognito=true']);
  assert.deepEqual(C.shortcut, { key: 'i', modifiers: ['cmd', 'shift'] });
  assert.ok(chunk('shared-0-').includes('BR="incognito"'));
  assert.equal(model.INCOGNITO_SEARCH_PARAM, 'incognito');
  assert.ok(chunk('shared-78-').includes('"Incognito chats stay out of your history, memory, and search, and aren\\u2019t used to train Claude."'));
  assert.equal(zhSidebar['Incognito chat'], '无痕聊天');
  // src re-exports the electron model (the main process may not import src/).
  assert.deepEqual(Object.keys(model).sort(), Object.keys(electronModel).sort());
  assert.equal(local('src/chat-incognito-model.mjs').split('\n').filter(line => line && !line.startsWith('//')).join('\n'), "export * from '../electron/chat-incognito-model.mjs';");
});

test('model: only a Chat starts incognito; leaving it marks it for deletion; leftovers are the ones no window has open', () => {
  const metadata = { a: { surface: 'chat', incognito: true }, b: { surface: 'chat' }, c: { surface: 'cowork', incognito: true } };
  assert.equal(model.isIncognitoSession('a', metadata), true);
  assert.equal(model.isIncognitoSession('b', metadata), false);
  assert.equal(model.isIncognitoSession(null, metadata), false);
  assert.equal(model.incognitoStart({ incognito: true }, 'chat'), true);
  assert.equal(model.incognitoStart({ incognito: true }, 'cowork'), false);
  assert.equal(model.incognitoStart({}, 'chat'), false);
  assert.deepEqual(model.withIncognito({ surface: 'chat', projectId: 'p' }, { surface: 'chat', incognito: true }), { surface: 'chat', projectId: 'p', incognito: true });
  assert.deepEqual(model.withIncognito({ surface: 'code', incognito: true }, { surface: 'code', incognito: true }), { surface: 'code' });
  assert.deepEqual(model.withIncognito({ surface: 'chat' }, { surface: 'chat', incognito: false }), { surface: 'chat' });
  assert.equal(model.incognitoLeft('a', 'b', metadata), 'a');
  assert.equal(model.incognitoLeft('a', null, metadata), 'a');
  assert.equal(model.incognitoLeft('a', 'a', metadata), null);
  assert.equal(model.incognitoLeft('b', null, metadata), null);
  assert.equal(model.incognitoLeft(null, 'a', metadata), null);
  const config = { threadIds: ['a', 'b', 'x'], archivedThreadIds: ['c'], sessionMetadata: { ...metadata, x: { surface: 'chat', incognito: true } } };
  assert.deepEqual(model.incognitoLeftovers(config), ['a', 'x', 'c']);
  assert.deepEqual(model.incognitoLeftovers(config, new Set(['x'])), ['a', 'c']);
});

test('an incognito chat is in no session list (sidebar, Chats page); Code lists are untouched', () => {
  const sessions = [{ id: 'a' }, { id: 'b' }, { id: 'k' }];
  const metadata = { a: { surface: 'chat', incognito: true }, b: { surface: 'chat' } };
  assert.deepEqual(surfaceSessions(sessions, 'chat', metadata).map(session => session.id), ['b']);
  assert.deepEqual(surfaceSessions(sessions, 'code', metadata).map(session => session.id), ['k']);
});

test('⌘K has no incognito row (c2771e1f6 filters it out); ⇧⌘I is the entry in Chat, Code keeps it for the model menu', () => {
  // c2771e1f6: the palette lists the shared-1 commands except `t==="incognito"`; c518a31cc Ne: the incognito row is gated
  // off (me = !1). shared-21 oO: the shortcut is a document capture listener, off on Code routes (sO), that toggles
  // incognito on the New chat page or in an incognito chat and otherwise opens /new?incognito.
  assert.ok(chunk('c2771e1f6-').includes('!(n.hiddenFromCommandPalette||!a.isAvailable&&Ls.has(t)||t==="incognito"||!s&&t==="new_task_nav")'));
  const dialog = chunk('c518a31cc-');
  assert.ok(dialog.includes('me=!1;') && dialog.includes('ae=J1($,4,e.incognito)?I1($,4,me,e.incognito):$[5]'));
  assert.ok(dialog.includes('t(Q,{shortcut:"cmd+shift+i",children:t(A,{defaultMessage:"Open model menu",id:"n/dLiefiKh"})})'));
  const shared21 = chunk('shared-21-');
  assert.ok(shared21.includes('function sO(e){return e.startsWith("/epitaxy")||e.startsWith("/code")}'));
  assert.ok(shared21.includes('r=n==="/"||ji(n),o=new URLSearchParams(window.location.search).has("incognito");r||o?e&&e():(a(null),Dd(),Cd(i,"/new?incognito",t))'));
  assert.ok(shared21.includes('return e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation(),$n(e,"claim")&&l(et("shortcut",e)),!1};return document.addEventListener("keydown",e,!0)'));
  assert.equal(paletteActions({ onIncognito: () => {} }).some(action => action.id === 'incognito'), false);
  const main = local('src/main.jsx');
  assert.doesNotMatch(main, /onIncognito/);
  assert.match(main, /if \(command === "model" && mode === "chat"\) return; \/\/ w13-chatfn-history/);
  assert.match(main, /incognitoKey\.current = \(\) => \{ if \(!current\) setIncognitoArm\(incognitoDraft \? null : \{ at: historyAt \}\); else if \(isIncognitoSession\(current, sessionMetadata\)\) navigate\(null\); else startIncognito\(\); \};/);
  assert.match(main, /if \(mode !== "chat"\) return undefined;\n    const onKey = \(e\) => \{\n      if \(e\.defaultPrevented \|\| e\.isComposing \|\| !e\.metaKey \|\| !e\.shiftKey \|\| e\.altKey \|\| e\.ctrlKey \|\| e\.code !== "KeyI" \|\| !splitActiveRef\.current \|\| settings\) return;\n      e\.preventDefault\(\); e\.stopImmediatePropagation\(\);\n      if \(!e\.repeat\) incognitoKey\.current\?\.\(\);/);
  assert.match(main, /document\.addEventListener\("keydown", onKey, true\);/);
});

test('host wiring: main.jsx arms the New chat page, starts with codeDesktop.incognito and deletes the chat it leaves', () => {
  const main = local('src/main.jsx');
  assert.match(main, /import \{ incognitoLeft, isIncognitoSession, withIncognito \} from '\.\/chat-incognito-model\.mjs';/);
  assert.match(main, /const incognitoDraft = mode === "chat" && !current && incognitoArm\?\.at === historyAt;/);
  assert.match(main, /const startIncognito = \(\) => \{ if \(mode !== "chat"\) return; if \(current\) \{ navigate\(null\); setIncognitoArm\(\{ at: historyAt \+ 1 \}\); \} else setIncognitoArm\(\{ at: historyAt \}\); \};/);
  assert.match(main, /useEffect\(\(\) => \{ if \(incognitoArm && \(historyAt !== incognitoArm\.at \|\| mode !== "chat"\)\) setIncognitoArm\(null\); \}, \[historyAt, mode, incognitoArm\]\);/);
  assert.match(main, /codeDesktop: withIncognito\(\{ surface: mode, [^\n]*\}, \{ surface: mode, incognito: incognitoDraft \}\), \/\/ w13-chatfn-history/);
  assert.match(main, /\.\.\.\(startParams\.codeDesktop\?\.incognito \? \{ incognito: true \} : \{\}\)/);
  // w13-close-main-process: another split side still showing the chat keeps it (that side deletes it when it leaves).
  assert.match(main, /if \(state\.active\?\.\[id\]\) continue;\n      incognitoLeaving\.current\.delete\(id\);\n(?:\s*\/\/[^\n]*\n)?      if \(splitStore\.getState\(\)\.sides\?\.some\(\(other, index\) => index !== side && other\?\.current === id\)\) continue;\n      void sessionAction\("delete", sessions\.find\(\(thread\) => thread\.id === id\) \?\? \{ id \}\)\.catch\(\(\) => \{\}\);/);
  assert.match(main, /<SourceChatGreeting incognito=\{incognitoDraft \|\| undefined\} \/>/);
});

test('host wiring: main.cjs marks the chat, keeps the mark from the core and out of other windows, and sweeps leftovers', () => {
  const main = local('electron/main.cjs');
  assert.match(main, /const startIncognito = p\.method === "thread\/start" && \(await import\('\.\/chat-incognito-model\.mjs'\)\)\.incognitoStart\(params\.codeDesktop, requestedSurface\); if \(params\.codeDesktop && Object\.hasOwn\(params\.codeDesktop, "incognito"\)\) \{ delete params\.codeDesktop\.incognito;/);
  // The mark is read after applyChatContext (the memory contributor skips an incognito chat) and before the core request.
  assert.ok(main.indexOf('const startIncognito = p.method') > main.indexOf("applyChatContext(config, p.method, params, requestedSurface"));
  assert.match(main, /surface: requestedSurface, \.\.\.\(project \? \{ projectId: project\.id \} : \{\}\), \.\.\.\(startIncognito \? \{ incognito: true \} : \{\}\), \/\/ w13-chatfn-history/);
  assert.match(main, /if \(p\.method === "thread\/start" && result\?\.thread\?\.id && startIncognito\) chatHistory\.noteLive\(result\.thread\.id, windowRegistry\.windowForSender\(sender\)\);[^\n]*\n        else if \(p\.method === "thread\/start" && result\?\.thread\?\.id\) emitSessionList\("added", result\.thread\);/);
  assert.match(main, /chatHistory\.startSweep\(\);/);
  assert.match(main, /windowRegistry\.onWindowClosed\(\(window\) => \{ void chatHistory\.windowClosed\(window, \(id\) => windowRegistry\.windowsShowing\(id, \{ panes: true \}\)\.length > 0\); \}\);/);
});

test('a closed window: its incognito chats that no open window shows are deleted; one another open window started is kept', async () => {
  const { createChatHistory } = await import('../electron/chat-history.mjs');
  const config = { threadIds: ['a', 'b', 'c', 'd', 'p'], archivedThreadIds: [], sessionMetadata: {
    a: { surface: 'chat', incognito: true }, b: { surface: 'chat', incognito: true }, c: { surface: 'chat', incognito: true }, d: { surface: 'chat', incognito: true }, p: { surface: 'chat' } } };
  const deleted = [];
  const history = createChatHistory({ getConfig: () => config, deleteThread: async (id) => { if (id === 'd') throw new Error('core down'); deleted.push(id); await history.cascade(id); } });
  const closed = { isDestroyed: () => true }, open = { isDestroyed: () => false }, gone = { isDestroyed: () => true };
  history.noteLive('a', closed);   // the closed window's chat, shown nowhere else → deleted
  history.noteLive('b', closed);   // also shown in another window → kept
  history.noteLive('c', open);     // started by a window that is still open (its layout may not list it yet) → kept
  history.noteLive('d', gone);     // an earlier window's; the delete fails → left to the next launch's sweep
  history.noteLive('p', closed);   // not incognito (any more) → never deleted here
  const result = await history.windowClosed(closed, (id) => id === 'b');
  assert.deepEqual(result, { deleted: ['a'], failed: ['d'] });
  assert.deepEqual(deleted, ['a']);
  assert.deepEqual([...history.live].sort(), ['b', 'c', 'p']);
  // The window that showed b closes later: b (its owner gone) goes now.
  assert.deepEqual(await history.windowClosed(open, () => false), { deleted: ['b', 'c'], failed: [] });
  // The sweep at the next launch still sees d (no longer live).
  assert.deepEqual(model.incognitoLeftovers(config, history.live), ['a', 'b', 'c', 'd']);
  assert.deepEqual(await createChatHistory({ getConfig: () => config }).windowClosed(closed), { deleted: [], failed: [] }, 'no delete without the app\'s thread/delete');
});
