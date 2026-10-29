// w13-chatui-sidebar-star (chatui-S1 / S2 / S4): the Chat session row menu and its starred state. Each check pins the
// official 3.6556.2 raw text (shared-16 fm / hm / mm, shared-22's sidebar row props, shared-78 gK, c71dee58b Zl,
// shared-9 OT, shared-18 GU, shared-2 YG) and the model or markup the host produces. Source only: nothing official runs.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { CHAT_DELETE_MESSAGES, CHAT_ROW_MENU_MESSAGES, DESKTOP_FRAME, STARRED_SECTION_MESSAGES, chatDeleteConfirmCopy, chatRowHotkeys,
  chatRowMenuEntries, chatSessionStarred, splitStarredRows, starredSectionMessage } from '../src/chat-starred-model.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const root = new URL('..', import.meta.url).pathname;
const read = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const shared16 = read('shared-16-ByfgAyLr.js'), shared22 = read('shared-22-Bwn3sJTG.js'), shared78 = read('shared-78-D5Fw2h0a.js'),
  zl = read('c71dee58b-CFm4FCDB.js'), shared9 = read('shared-9-CM21XrJw.js'), shared18 = read('shared-18-D3y8YMFN.js'), shared2 = read('shared-2-TF8v67kg.js');
const enUS = JSON.parse(fs.readFileSync(path.join(ionSource, '../../i18n/en-US.json'), 'utf8'));
const count = (text, needle) => text.split(needle).length - 1;
const src = (name) => fs.readFileSync(path.join(root, name), 'utf8');

let server, Menu;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Menu = (await server.ssrLoadModule('/src/source-chat-row-menu.jsx')).SourceChatRowMenu;
});
after(() => server?.close());

test('official: a sessionType "chat" sidebar row has no Archive, stars through pin / unpin, and deletes as a chat', () => {
  assert.equal(count(shared22, 'Y=n.sessionType==="chat"'), 1);
  assert.equal(count(shared22, 'onArchive:Y||X?void 0:J,onUnarchive:X&&!Y?le:void 0,onDelete:ue,isChatSession:Y'), 1);
  assert.equal(count(shared22, 'onStarred:e=>{ee(e),yy(e?"pin":"unpin",D)}'), 1);
  // organizeItems (G) only off a Cowork list: H = R === "cowork" && …
  assert.equal(count(shared22, 'H=J2($,14,R,t)?K2($,14,R,t,R==="cowork"&&!Op(t))'), 1);
  assert.equal(count(shared16, 'kind:f?"chat":"task"'), 1);
  assert.equal(count(shared16, 'chat:dr({title:{defaultMessage:"Delete chat",id:"ngIzbjIFxF"},description:{defaultMessage:"Are you sure you want to delete this chat?",id:"eoF+zSJr4t"}})'), 1);
  assert.equal(count(shared16, 'K&&!_e&&e.set("p",ot),j&&e.set("u",st),!_e&&!L&&se&&e.set("r",z),W&&!ge&&e.set("a",ht),ue&&!ge&&e.set("d",B)'), 1);
  assert.equal(count(shared16, '"data-testid":"delete-session-trigger",onClick:t,icon:"Trash",shortcut:"d"'), 1);
  assert.ok(shared16.includes('"data-testid":"rename-session-trigger",onClick:z,icon:"Edit",shortcut:"r"'));
  assert.ok(shared16.includes('"data-testid":"toggle-session-read-trigger",onClick:st,icon:j.isUnread?"Eye":"EyeSlash",shortcut:"u"'));
  // shared-2 YG: no read state while the session runs.
  assert.equal(count(shared2, 'function YG(e,t){if(t.isRunning)return;'), 1);
  // shared-18 GU: Move up / Move down with ArrowUp / ArrowDown (showIcon defaults on).
  assert.ok(shared18.includes('icon:a?"ArrowUp":void 0,children:m(Q,{defaultMessage:"Move up",id:"wmFdwsKtFc"})'));
  assert.ok(shared18.includes('icon:a?"ArrowDown":void 0,children:m(Q,{defaultMessage:"Move down",id:"H/r5m64n8M"})'));
});

test('official: the desktop frame (shared-78 gK) turns Star / Unstar / Starred into Pin / Unpin / Pinned', () => {
  // fm: K && (we ? Pin : Star), we = Yt() = shared-78 fs = gK.
  assert.equal(count(shared16, 'K&&(we?a(O.Item,{onClick:ot,icon:D?"PinSlash":"Pin",shortcut:"p",disabled:_e,description:ve,children:D?a(Z,{defaultMessage:"Unpin",id:"nR6dLhVwqy"}):a(Z,{defaultMessage:"Pin",id:"AJ2W7itqO2"})}):a(O.Item,{onClick:ot,icon:D?"StarFilled":"Star",shortcut:"p",disabled:_e,description:ve,children:D?a(Z,{defaultMessage:"Unstar",id:"Y5zRLWgCMP"}):a(Z,{defaultMessage:"Star",id:"VwapsmdMes"})}))'), 1);
  assert.ok(shared16.includes('we=Yt()'));
  assert.ok(/fs as Yt[,}][^;]*from"\.\/shared-78-D5Fw2h0a\.js"/.test(shared16));
  assert.equal(count(shared78, 'gK as fs'), 1);
  assert.equal(count(shared78, 'function gK(){let $=J9(5),e=A(),t=iK(),n=hK(),r=Ki(),i=J4($,0,r,t,e,n)?K4($,0,r,t,e,n,e=>!0):$[4];return it(i)}'), 1);
  // c71dee58b Zl's heading: b = Ct() (shared-78 fs) → Pi.pinned (shared-9 OT pinned) else "Starred".
  assert.equal(count(zl, 'b?l(Z,{...Pi.pinned}):l(Z,{defaultMessage:"Starred",id:"V7cUPvWFo3"})'), 1);
  assert.ok(/fs as Ct[,}][^;]*from"\.\/shared-78-D5Fw2h0a\.js"/.test(zl));
  assert.ok(/at as Pi[,}][^;]*from"\.\/shared-9-CM21XrJw\.js"/.test(zl));
  assert.equal(count(shared9, 'OT as at'), 1);
  assert.ok(shared9.includes('pinned:{defaultMessage:"Pinned",id:"A8GDlh2QW4"}'));
  // The sidebar's pinned list (shared-22 aM) is headed "Pinned" too.
  assert.equal(count(shared22, 'W.formatMessage(rM.pinned)'), 1);
  assert.ok(shared22.includes('rM=Qs({pinned:{defaultMessage:"Pinned",id:"A8GDlh2QW4"}'));
  // Host: the desktop frame is on (the same answer the Cowork adapters give).
  assert.equal(DESKTOP_FRAME, true);
  assert.match(src('src/source-cowork-progress-v3-adapters.jsx'), /export const useDesktopFrame = \(\) => true;/);
});

test('every message the model uses is the official en-US text for its id, and has zh-CN', () => {
  const all = [...Object.values(CHAT_ROW_MENU_MESSAGES), ...Object.values(CHAT_DELETE_MESSAGES), ...Object.values(STARRED_SECTION_MESSAGES)];
  for (const { id, defaultMessage } of all) {
    assert.equal(enUS[id], defaultMessage, id);
    assert.ok(typeof zh[defaultMessage] === 'string' && zh[defaultMessage].trim(), `zh-CN: ${defaultMessage}`);
  }
});

test('model: fm entries for a Chat row, in order, with the desktop Pin branch', () => {
  const shape = (entries) => entries.map((entry) => entry.kind === 'separator' ? '—' : `${entry.message.defaultMessage}|${entry.icon}|${entry.shortcut ?? ''}|${entry.testId ?? ''}|${entry.action}`);
  assert.deepEqual(shape(chatRowMenuEntries({})), [
    'Mark as unread|EyeSlash|u|toggle-session-read-trigger|mark-unread', '—',
    'Pin|Pin|p||pin', 'Rename|Edit|r|rename-session-trigger|rename', '—',
    'Delete|Trash|d|delete-session-trigger|delete',
  ]);
  // Unread + starred in the middle of the pinned list: Mark as read, Unpin, the reorder items after a separator.
  assert.deepEqual(shape(chatRowMenuEntries({ unread: true, starred: true, pinnedIndex: 1, pinnedCount: 3 })), [
    'Mark as read|Eye|u|toggle-session-read-trigger|mark-read', '—',
    'Unpin|PinSlash|p||unpin', 'Rename|Edit|r|rename-session-trigger|rename', '—',
    'Move up|ArrowUp|||move-up', 'Move down|ArrowDown|||move-down', '—',
    'Delete|Trash|d|delete-session-trigger|delete',
  ]);
  // First / last pinned row: only the move that exists.
  assert.deepEqual(chatRowMenuEntries({ starred: true, pinnedIndex: 0, pinnedCount: 2 }).filter((e) => e.key?.startsWith('move')).map((e) => e.key), ['move-down']);
  assert.deepEqual(chatRowMenuEntries({ starred: true, pinnedIndex: 1, pinnedCount: 2 }).filter((e) => e.key?.startsWith('move')).map((e) => e.key), ['move-up']);
  assert.equal(chatRowMenuEntries({ starred: true, pinnedIndex: 0, pinnedCount: 1 }).some((e) => e.key?.startsWith('move')), false);
  // Running: YG gives no read state, so the read toggle and its separator are gone.
  assert.deepEqual(shape(chatRowMenuEntries({ running: true })).slice(0, 2), ['Pin|Pin|p||pin', 'Rename|Edit|r|rename-session-trigger|rename']);
  // Never an Archive / Unarchive item for a chat (shared-22 onArchive / onUnarchive undefined when Y).
  assert.equal(chatRowMenuEntries({ unread: true, starred: true }).some((e) => /archive/i.test(e.action ?? '')), false);
  // The web branch (we false) is the Star / Unstar copy with the star icons.
  assert.deepEqual(shape(chatRowMenuEntries({ desktopFrame: false, starred: false })).find((s) => s.includes('|p|')), 'Star|Star|p||pin');
  assert.deepEqual(shape(chatRowMenuEntries({ desktopFrame: false, starred: true })).find((s) => s.includes('|p|')), 'Unstar|StarFilled|p||unpin');
});

test('model: hotkeys, starred flag, delete copy, section heading and the Zl split', () => {
  assert.deepEqual([...chatRowHotkeys(chatRowMenuEntries({ unread: true }))], [['u', 'mark-read'], ['p', 'pin'], ['r', 'rename'], ['d', 'delete']]);
  assert.deepEqual([...chatRowHotkeys(chatRowMenuEntries({ running: true, starred: true }))], [['p', 'unpin'], ['r', 'rename'], ['d', 'delete']]);
  assert.equal(chatSessionStarred({ pinned: true }), true);
  assert.equal(chatSessionStarred({}), false);
  assert.equal(chatSessionStarred(undefined), false);
  assert.deepEqual(chatDeleteConfirmCopy(), { title: 'Delete chat', body: 'Are you sure you want to delete this chat?', confirmLabel: 'Delete', danger: true });
  assert.equal(starredSectionMessage().defaultMessage, 'Pinned');
  assert.equal(starredSectionMessage(false).defaultMessage, 'Starred');
  const rows = [{ id: 'a' }, { id: 'b', s: true }, { id: 'c' }, { id: 'd', s: true }];
  assert.deepEqual(splitStarredRows(rows, (row) => !!row.s), { starredRows: [rows[1], rows[3]], recentRows: [rows[0], rows[2]] });
});

test('SSR: the Chat row menu renders fm items with the official testids, icons and shortcuts, and no Code-only items', () => {
  const session = { id: 's1', name: 'Trip planning' };
  const html = renderToStaticMarkup(React.createElement(Menu, { session, metadata: { unread: true }, state: {}, pinnedSiblings: [],
    onAction() {}, onRename() {}, onDelete() {}, onClose() {} }));
  assert.match(html, /data-chat-row-menu=""/);
  const labels = [...html.matchAll(/data-label="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(labels, ['Mark as read', 'Pin', 'Rename', 'Delete']);
  for (const testId of ['toggle-session-read-trigger', 'rename-session-trigger', 'delete-session-trigger']) assert.equal(count(html, `data-testid="${testId}"`), 1, testId);
  assert.equal(count(html, 'aria-keyshortcuts='), 4);
  assert.equal(count(html, 'data-cds-icon-row=""'), 4);
  assert.equal(count(html, 'data-variant="danger"'), 1);
  assert.equal(count(html, 'role="separator"'), 2);
  for (const codeOnly of ['Archive', 'Fork', 'Export', 'Open in', 'Keep computer awake', 'Move to group', 'Share']) assert.ok(!labels.includes(codeOnly), codeOnly);
  // Starred (pinned) second of three, while running: Unpin, Rename, Move up, Move down, Delete — no read toggle.
  const pinned = renderToStaticMarkup(React.createElement(Menu, { session, metadata: { pinned: true }, state: { active: { s1: true } },
    pinnedSiblings: ['x', 's1', 'y'], onAction() {}, onRename() {}, onDelete() {}, onClose() {} }));
  assert.deepEqual([...pinned.matchAll(/data-label="([^"]*)"/g)].map((m) => m[1]), ['Unpin', 'Rename', 'Move up', 'Move down', 'Delete']);
});

test('host wiring: the sidebar picks the Chat row menu for a single Chat row and confirms with hm copy', () => {
  const sidebar = src('src/source-sidebar.jsx');
  assert.equal(count(sidebar, 'import { SourceChatRowMenu } from "./source-chat-row-menu.jsx";'), 1);
  assert.equal(count(sidebar, '{menu.kind === "session" && mode === "chat" && !menu.multi && <SourceChatRowMenu '), 1);
  // w13-close-cowork-sidebar: a Chat / Cowork multi-selection takes the hub bulk menu (source-hub-sidebar.jsx).
  assert.equal(count(sidebar, '{menu.kind === "session" && !(mode === "chat" && !menu.multi) && !(mode !== "code" && menu.multi) && <SourceSidebarSessionMenu '), 1);
  assert.equal(count(sidebar, '{menu.kind === "session" && mode !== "code" && menu.multi && (() => {'), 1);
  assert.equal(count(sidebar, 'setConfirm({ title: t(copy.title), body: t(copy.body), confirmLabel: t(copy.confirmLabel), danger: true, onConfirm: () => onSessionAction("delete", target) });'), 1);
  // pin / unpin / pinned-order / mark-read run through main.jsx's sessionAction (metadata pinned is the starred flag).
  const main = src('src/main.jsx');
  assert.ok(main.includes('case "pin": return updateSessionMetadata(target.id, { pinned: true });'));
  assert.ok(main.includes('case "unpin": return updateSessionMetadata(target.id, { pinned: false });'));
});
