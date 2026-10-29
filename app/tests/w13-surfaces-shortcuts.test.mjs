// V3-w13-surfaces-shortcuts (surf-22, surf-23): the Keyboard shortcuts dialog off the Code route is 3.6556.2 c518a31cc
// Ne (General, "In chats", "In tasks"), and the command palette's placeholder is c2771e1f6 yr's chat copy off Code.
// Source only: the official chunks are read as text (never executed); the host renders through react-dom/server.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { shortcutsDialogSections } from '../src/shortcuts-dialog-model.mjs';
import { palettePlaceholder } from '../src/sidebar-palette-model.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(file, 'utf8');
const official = (name) => read(path.join(ionSource, name));
const dialogChunk = official('c518a31cc-Vw6f4MYp.js');
const paletteChunk = official('c2771e1f6-C1UCZLNP.js');
const sharedName = (prefix) => fs.readdirSync(ionSource).find((file) => file.startsWith(prefix) && file.endsWith('.js'));
const shared78 = official(sharedName('shared-78-'));
const readable = path.resolve(app, '../analysis/claude-3.6556.2-migrate-20261025/readable/3.6556.2/c518a31cc-Vw6f4MYp.js');
const count = (text, needle) => text.split(needle).length - 1;

let server, SourceSidebarPalette;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebarPalette } = await server.ssrLoadModule('/src/source-sidebar-palette.jsx'));
});
after(async () => { await server?.close(); });

test('official text: Ne\'s mode sections and the palette\'s chat placeholders are in 3.6556.2', () => {
  // Ne (Me: `t(n ? He : Ne, {})`, n = isEpitaxyRoute) and its route-kind gates.
  assert.equal(count(dialogChunk, 't(n?He:Ne,{})'), 1);
  assert.ok(dialogChunk.includes('(b==="chat"||b==="cowork")&&'), 'K: Reuse an earlier message on a chat or task route');
  assert.ok(dialogChunk.includes('_&&b==="cowork"&&'), 'we: In tasks');
  assert.ok(dialogChunk.includes('_&&b==="chat"&&'), 'be: the chat action rows');
  assert.ok(dialogChunk.includes('defaultMessage:"In tasks",id:"NLUBa7lPRR"'));
  if (fs.existsSync(readable)) {
    const text = read(readable);
    assert.ok(text.includes('defaultMessage: "In tasks", id: "NLUBa7lPRR"'));
    assert.ok(text.includes('b === "cowork" &&'));
  }
  for (const [message, id] of [['Quick chat or search', 'IxQhmzBY5m'], ['Search', 'xmcVZ0BU63'], ['Toggle sidebar', 'The8hwLUFg'], ['Keyboard shortcuts', 'vzYPVXl4by'],
    ['Settings', 'jqhhMImrPt'], ['General', 'f0sgug52cn'], ['Send message', 'Xx0WZVz8QS'], ['New line in message', 'vcm6Lz9BeA'], ['Add files or photos', 'vVSGqeakjA'],
    ['Reuse an earlier message', 'QaQnrC1Fvj'], ['Pin / unpin task', 'MjWIdJK5/O'], ['Rename task', 'OiHSf+qb5m'], ['Mark task as read/unread', 'PNERRYnCGV'],
    ['Archive task', 'JUSaQ490KD']])
    assert.ok(dialogChunk.includes(`defaultMessage:"${message}",id:"${id}"`) || (message === 'Add files or photos' && official(sharedName('shared-1-')).includes(`defaultMessage:"${message}",id:"${id}"`)), message);
  assert.ok(dialogChunk.includes('defaultMessage:"Stop Claude\\u2019s response",id:"5cJRkpfW2y"'), 'shown as the local agent: Stop DeepSeek’s response');
  // shared-78 bv, the chat table Sv returns with cp() off (e = C() in Ne).
  for (const [key, message, id] of [['shortcutsInConversations', 'In chats', 'HxL2Lhj5hv'], ['newConversation', 'New chat', 'bvVb6lsJ6+'], ['shortcutClose', 'Close chat', '4wyRCGROHi'],
    ['shortcutNext', 'Next chat', 'hHKbubxoRh'], ['shortcutPrevious', 'Previous chat', 'uLaTVlnbrG'], ['shortcutJumpTo', 'Jump to chat', 'CZl4OMbKOI'],
    ['renameConversation', 'Rename chat', 'mM9tQaQhmB'], ['shortcutMarkReadUnread', 'Mark chat as read/unread', 'BWLaNgAMKx'], ['shortcutPinUnpin', 'Pin / unpin chat', 'vRN6+mh7Xv']])
    assert.ok(shared78.includes(`${key}:{defaultMessage:"${message}",id:"${id}"}`), key);
  assert.ok(shared78.includes('function Sv(){return cp()?xv:bv}'));
  // c2771e1f6 yr.
  assert.ok(paletteChunk.includes('"Search or start a chat",id:"aCvzSmFoSP"'));
  assert.ok(paletteChunk.includes('K==="search"&&!dn?P?N.formatMessage({defaultMessage:"Search sessions and projects",id:"j4Q+hNGGdD"}):N.formatMessage({defaultMessage:"Search chats and projects",id:"XF3P/8YpTI"})'));
  assert.ok(paletteChunk.includes('Xn||P?N.formatMessage({defaultMessage:"Search or start a session",id:"bVyjM1r2f9"}):N.formatMessage({defaultMessage:"Search or start a chat",id:"aCvzSmFoSP"})'));
});

test('every label of the chat/cowork dialog and palette is official copy (or the local agent\'s Stop) with zh-CN', () => {
  const labels = new Set();
  for (const surface of ['chat', 'cowork'])
    for (const section of shortcutsDialogSections({ surface, route: surface, sidebarChord: true })) { labels.add(section.title); for (const row of section.rows) labels.add(row.label); }
  for (const surface of ['chat', 'cowork']) for (const mode of ['default', 'search']) labels.add(palettePlaceholder(mode, { surface }));
  for (const label of labels) {
    assert.ok(typeof zh[label] === 'string' && zh[label].trim(), `zh-CN: ${label}`);
    if (label === 'Stop DeepSeek’s response') continue;
    assert.ok([dialogChunk, shared78, paletteChunk, official(sharedName('shared-1-'))].some((text) => text.includes(`defaultMessage:"${label}"`)), `official: ${label}`);
  }
});

// The dialog itself portals to document.body (source-dialog.jsx createPortal), which react-dom/server cannot render, so its
// body is checked through the model it maps (one .shortcuts-section per section, one data-command row per row).
test('dialog body: Ne\'s sections by surface and route; Code keeps Ce', () => {
  const titles = (props) => shortcutsDialogSections(props).map((section) => section.title);
  const commands = (props) => shortcutsDialogSections(props).flatMap((section) => section.rows.map((row) => row.command));
  assert.deepEqual(titles({ surface: 'chat', route: 'chat' }), ['General', 'In chats']);
  assert.ok(!commands({ surface: 'chat', route: 'chat' }).some((command) => ['split-open', 'changes', 'terminal', 'open-session-pr', 'fork-session'].includes(command)), 'no Code rows');
  assert.deepEqual(titles({ surface: 'cowork', route: 'cowork' }), ['General', 'In chats', 'In tasks']);
  assert.deepEqual(titles({ surface: 'cowork', route: 'chat' }), ['General', 'In chats'], 'route kind decides the task rows');
  assert.deepEqual(titles({ surface: 'code', route: 'code' }), ['General', 'Panes', 'Composer']);
  const keys = Object.fromEntries(shortcutsDialogSections({ surface: 'cowork', route: 'cowork' }).at(-1).rows.map((row) => [row.label, row.keys]));
  assert.deepEqual(keys, { 'Pin / unpin task': ['cmd+alt+p'], 'Rename task': ['cmd+alt+r'], 'Mark task as read/unread': ['cmd+alt+u'], 'Archive task': ['cmd+alt+a'] });
  const reuse = shortcutsDialogSections({ surface: 'chat', route: 'chat' })[1].rows.find((row) => row.command === 'reuse-message');
  assert.deepEqual(reuse.keys, ['up', 'down'], 'De = ["up", "down"]');
});

test('SSR: the palette placeholder follows the sidebar surface', () => {
  const html = (props) => renderToStaticMarkup(React.createElement(SourceSidebarPalette, { open: true, inline: true, setQuery() {}, onClose() {}, ...props }));
  assert.match(html({ surface: 'chat' }), /placeholder="Search or start a chat"/);
  assert.match(html({ surface: 'cowork', entry: 'search' }), /placeholder="Search chats and projects"/);
  assert.match(html({}), /placeholder="Search or start a session"/);
  assert.match(html({ surface: 'code', entry: 'search' }), /placeholder="Search sessions and projects"/);
});

test('host wiring: main.jsx passes surface/route to the dialog, the sidebar passes its mode to the palette', () => {
  const main = read(path.join(app, 'src/main.jsx'));
  const start = main.indexOf('<KeyboardShortcutsDialog key={`action-');
  const dialog = main.slice(start, main.indexOf('/>}', start));
  // w13-close-main-jsx-tests (surfaces-shortcuts-01): the route is the open session's kind (shared-52 Mv), not the sidebar
  // mode; rewind reads the session metadata (codeRewindServed: a core Cowork session has no Esc Esc).
  assert.equal(count(dialog, 'surface={mode} route={current && section === "new" ? sessionSurface(current, sessionMetadata) : null}'), 1);
  assert.equal(count(dialog, 'rewind={codeRewindServed(current, boot?.core?.capabilities, sessionMetadata)}'), 1);
  assert.equal(count(dialog, 'sidebarChord={!NO_SIDEBAR}'), 1);
  const sidebar = read(path.join(app, 'src/source-sidebar.jsx'));
  const palette = sidebar.slice(sidebar.indexOf('<SourceSidebarPalette '), sidebar.indexOf('/>}', sidebar.indexOf('<SourceSidebarPalette ')));
  assert.equal(count(palette, 'surface={mode}'), 1);
  assert.match(read(path.join(app, 'src/source-sidebar-palette.jsx')), /const placeholder = palettePlaceholder\(mode, \{ surface \}\);/);
  assert.match(read(path.join(app, 'src/source-session-actions.jsx')), /shortcutsDialogSections\(\{ fastMode, sideChat, rewind, surface, route, sidebarChord, rtl \}\)/);
});

// w13-close-main-jsx-tests (surfaces-shortcuts-02): c518a31cc Te follows "Jump to session" (He) and "Jump to chat" (Ne).
test('Te: Next / Previous sidebar tab after Jump to, swapped under RTL, listed while the sidebar chord is mounted', () => {
  const te = dialogChunk.slice(dialogChunk.indexOf('function Te('), dialogChunk.indexOf('function Ee('));
  for (const needle of ['e=n()==="rtl"', 'a=e?"cmd+alt+left":"cmd+alt+right"', 'defaultMessage:"Next sidebar tab",id:"nqrh9gXo0z"',
    'c=e?"cmd+alt+right":"cmd+alt+left"', 'defaultMessage:"Previous sidebar tab",id:"ObojkXu2Us"'])
    assert.equal(count(te, needle), 1, needle);
  assert.ok(count(dialogChunk, 't(Te,{})') >= 2, 'He and Ne both list Te');
  const general = (props) => shortcutsDialogSections(props)[0].rows.map((row) => [row.command, row.keys.join(' ')]);
  for (const surface of ['code', 'chat', 'cowork']) {
    const rows = general({ surface, route: surface, sidebarChord: true });
    const jump = rows.findIndex(([command]) => command === 'jump-session');
    assert.deepEqual(rows.slice(jump + 1, jump + 3), [['next-sidebar-tab', 'cmd+alt+right'], ['previous-sidebar-tab', 'cmd+alt+left']], surface);
    assert.deepEqual(general({ surface, route: surface, sidebarChord: true, rtl: true }).slice(jump + 1, jump + 3),
      [['next-sidebar-tab', 'cmd+alt+left'], ['previous-sidebar-tab', 'cmd+alt+right']], `${surface} rtl`);
    assert.ok(!general({ surface, route: surface }).some(([command]) => /sidebar-tab/.test(command)), `${surface}: no chord, no rows`);
  }
  // Te's chord is the app switch's (AM, source-app-switch.jsx), mounted in the sidebar on the titlebar and the peek.
  assert.match(read(path.join(app, 'src/source-sidebar.jsx')), /<SourceAppSwitch mode=\{mode\} homeMode=\{homeMode\} onMode=\{onMode\} chord \/>/);
});
