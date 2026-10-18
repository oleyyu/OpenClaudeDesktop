import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  EMPTY_PALETTE_FILTERS, filterPaletteActions, matchRanges, movePaletteSelection, paletteActionGroups, paletteActions, paletteDateFloor, paletteMode,
  palettePlaceholder, paletteProjects, paletteRelativeTime, paletteSessions, sessionCommandLabels, sessionPullRequestUrl, stepPaletteType,
} from '../src/sidebar-palette-model.mjs';
import { dictionary } from '../electron/i18n/index.mjs';

// ⌘K / ⇧⌘K command palette (2.2553.1 c2771e1f6-v15xXKAc.js vm in shared-22 XP), source-sidebar-palette.jsx.
let server, SourceSidebarPalette, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebarPalette } = await server.ssrLoadModule('/src/source-sidebar-palette.jsx'));
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(async () => { await server?.close(); });

const NOW = Date.UTC(2026, 9, 7, 12);
const nowSec = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: nowSec, updatedAt: nowSec, ...fields });
const palette = (props) => renderToStaticMarkup(React.createElement(SourceSidebarPalette, {
  open: true, inline: true, sessions: [thread('a', { name: 'Fix login bug' }), thread('b', { name: 'Write docs', cwd: '/fixture/docs' })],
  folders: ['/fixture/work', '/fixture/docs'], actions: paletteActions({ onNew() {}, setSection() {}, onToggleSidebar() {}, onOpenSettings() {} }),
  setQuery() {}, onClose() {}, ...props,
}));

test('vm placeholders per mode and the mode parser', () => {
  assert.equal(palettePlaceholder('default'), 'Search or start a session');
  assert.equal(palettePlaceholder('search'), 'Search sessions and projects');
  assert.equal(palettePlaceholder('actions'), 'Search actions');
  assert.equal(paletteMode('search'), 'search');
  assert.equal(paletteMode('bogus'), 'default');
});

test('Xu relative times and the date filter floors', () => {
  assert.equal(paletteRelativeTime(NOW - 60e3, NOW), 'Just now');
  assert.equal(paletteRelativeTime(NOW - 30 * 60e3, NOW), 'Past hour');
  assert.equal(paletteRelativeTime(NOW - 3 * 864e5, NOW), 'Past week');
  assert.equal(paletteRelativeTime(NOW - 20 * 864e5, NOW), 'Past month');
  assert.equal(paletteRelativeTime(NOW - 400 * 864e5, NOW), null);
  assert.equal(paletteDateFloor('week', NOW), NOW - 7 * 864e5);
  assert.equal(paletteDateFloor(null, NOW), null);
});

test('session and project results: title match, content match, archived only in search, date filter', () => {
  const sessions = [thread('a', { name: 'Fix login bug' }), thread('b', { name: 'Docs', archived: true }), thread('c', { name: 'Other', updatedAt: nowSec - 40 * 86400 })];
  assert.deepEqual(paletteSessions({ sessions, query: 'login' }).map((s) => s.id), ['a']);
  assert.deepEqual(paletteSessions({ sessions, query: 'zzz', contentMatches: new Set(['c']) }).map((s) => s.id), ['c']);
  assert.deepEqual(paletteSessions({ sessions }).map((s) => s.id), ['a', 'c'], 'the default view leaves archived sessions out');
  assert.ok(paletteSessions({ sessions, includeArchived: true }).some((s) => s.id === 'b'));
  assert.deepEqual(paletteSessions({ sessions, filters: { ...EMPTY_PALETTE_FILTERS, date: 'month' } }).map((s) => s.id), ['a']);
  assert.deepEqual(paletteProjects({ folders: ['/x/alpha', '/x/beta'], query: 'alp' }).map((p) => p.name), ['alpha']);
  assert.deepEqual(matchRanges('Fix login Login', 'login'), [[4, 9], [10, 15]]);
});

test('Actions mode rows: Settings → / Customize → sections and app commands', () => {
  const opened = [];
  const actions = paletteActions({ onNew() {}, setSection() {}, onToggleSidebar() {}, onOpenSettings: (id) => opened.push(id) });
  const labels = actions.map((a) => a.label);
  for (const label of ['New session', 'Toggle sidebar', 'Settings', 'Settings → Theme', 'Customize → Skills', 'Customize → Connectors']) assert.ok(labels.includes(label), label);
  actions.find((a) => a.label === 'Customize → Skills').run();
  assert.deepEqual(opened, ['customize-skills']);
  assert.deepEqual(filterPaletteActions(actions, 'theme').map((a) => a.label), ['Settings → Theme']);
  assert.equal(movePaletteSelection(-1, 3, 'ArrowDown'), 0);
  assert.equal(movePaletteSelection(0, 3, 'ArrowUp'), 2);
  assert.equal(stepPaletteType(null, 1), 'session');
  assert.equal(stepPaletteType(null, -1), 'project');
});

// B25 M1: 2.31226 shared-1 _R (:14360-15260) commands registered per session by cf74bc599 wO (:15226-15409) and per pane
// by c11959232 Ud (:2340-2390); Actions mode groups them (c2771e1f6 :3557-3598).
const sessionCommands = (overrides = {}) => {
  const ran = [];
  const actions = paletteActions({
    onNew() {}, setSection() {}, onToggleSidebar() {}, onOpenSettings() {}, onShortcuts: () => ran.push('shortcuts'), onFileUpload: () => ran.push('upload'),
    session: { archived: false, pinned: false, canArchive: true, canDelete: true, canFork: true, onAction: (command) => ran.push(command), ...overrides.session },
    panes: { terminal: { enabled: true, shown: false }, changes: { enabled: true, shown: true }, preview: { enabled: false, shown: false }, files: { enabled: true, shown: false },
      sideChat: null, ...overrides.panes },
    onTogglePane: (kind) => ran.push(`pane:${kind}`), onClosePane: overrides.onClosePane === null ? undefined : () => ran.push('close-pane'),
    prompts: { available: true, onJump: (direction) => ran.push(`prompt:${direction}`), ...overrides.prompts },
  });
  return { actions, ran };
};

test('Actions catalog: the open session and pane commands with registry labels, chords and gates', () => {
  const { actions, ran } = sessionCommands();
  const byId = Object.fromEntries(actions.map((action) => [action.id, action]));
  assert.deepEqual(actions.filter((action) => action.group === 'session').map((action) => [action.label, action.shortcut ?? null]), [
    ['Archive session', null], ['Delete session', null], ['Rename session', '⌥⌘R'], ['Pin session', '⌥⌘P'], ['Fork session', '⌥⌘O'],
    ['New session with current settings', '⇧⌘N'], ['Show terminal', '⌘J'], ['Hide changes', '⇧⌘D'], ['Show files', '⇧⌘F'], ['Close pane', '⌘\\'],
    ['Jump to previous prompt', '⌥⌘↑'], ['Jump to next prompt', '⌥⌘↓'],
  ]);
  assert.equal(byId.file_upload.label, 'Add files or photos');
  assert.equal(byId.file_upload.group, 'chat');
  assert.equal(byId.shortcuts_modal.shortcut, '⌘/');
  for (const id of ['archive_code_session', 'rename_code_session', 'pin_code_session', 'fork_code_session', 'new_code_session_from_current', 'delete_code_session']) byId[id].run();
  byId.toggle_terminal_pane.run(); byId.close_side_pane.run(); byId.jump_prev_prompt.run(); byId.shortcuts_modal.run(); byId.file_upload.run();
  assert.deepEqual(ran, ['archive', 'rename', 'pin', 'fork', 'new-from-current', 'delete', 'pane:terminal', 'close-pane', 'prompt:-1', 'shortcuts', 'upload']);
  // B(id, … ? fn : undefined): an archived session offers Unarchive, a pinned one Unpin; a busy one neither archive nor delete;
  // no fork where it cannot fork; no prompt jumps without a prompt; Close pane only with a pane open.
  const archived = sessionCommands({ session: { archived: true, pinned: true, canFork: false }, prompts: { available: false }, onClosePane: null }).actions.map((action) => action.id);
  assert.ok(archived.includes('unarchive_code_session') && archived.includes('unpin_code_session'));
  for (const id of ['archive_code_session', 'pin_code_session', 'fork_code_session', 'jump_prev_prompt', 'close_side_pane']) assert.ok(!archived.includes(id), id);
  const busy = sessionCommands({ session: { canArchive: false, canDelete: false } }).actions.map((action) => action.id);
  assert.ok(!busy.includes('archive_code_session') && !busy.includes('delete_code_session'));
  // No open session: none of the session rows.
  assert.ok(!paletteActions({ onNew() {} }).some((action) => action.group === 'session'));
  // searchHints: 'shell' finds Show terminal, 'clone' Fork session, 'trash' Delete session.
  assert.deepEqual(filterPaletteActions(actions, 'shell').map((action) => action.id), ['toggle_terminal_pane']);
  assert.deepEqual(filterPaletteActions(actions, 'clone').map((action) => action.id), ['fork_code_session']);
  assert.deepEqual(filterPaletteActions(actions, 'trash').map((action) => action.id), ['delete_code_session']);
  assert.ok(filterPaletteActions(actions, 'terminal').some((action) => action.id === 'toggle_terminal_pane'));
  assert.ok(filterPaletteActions(actions, 'shortcuts').some((action) => action.id === 'shortcuts_modal'));
  // Actions mode: Navigation, Chat, Session, Settings, General, in that order.
  assert.deepEqual(paletteActionGroups(actions).map((group) => group.title), ['Navigation', 'Chat', 'Session', 'Settings', 'General']);
});

test('Actions catalog: hide_all_nested_sessions / show_all_nested_sessions (shared-20 _S, moved out of Group and sort in 2.42304.0)', async () => {
  const PaletteCopy = await import('../src/generated/code-current/nested-session-palette-copy.mjs');
  const ran = [];
  const nested = { anyShown: true, anyHidden: true, onHideAll: () => ran.push('hide'), onShowAll: () => ran.push('show') };
  const actions = paletteActions({ session: { canArchive: true, canDelete: true, canFork: true, onAction() {} }, nested });
  const session = actions.filter((action) => action.group === 'session').map((action) => action.id);
  // shared-1 registry order: … fork_code_session, hide/show_all_nested_sessions, … new_code_session_from_current.
  assert.deepEqual(session.slice(session.indexOf('fork_code_session'), session.indexOf('new_code_session_from_current') + 1),
    ['fork_code_session', 'hide_all_nested_sessions', 'show_all_nested_sessions', 'new_code_session_from_current']);
  const byId = Object.fromEntries(actions.map((action) => [action.id, action]));
  assert.deepEqual([byId.hide_all_nested_sessions.label, byId.hide_all_nested_sessions.icon, byId.hide_all_nested_sessions.hints],
    [PaletteCopy.hideAllNestedSessionsCopy.description.defaultMessage, 'Collapse', ['Collapse', 'Fold sessions']]);
  assert.deepEqual([byId.show_all_nested_sessions.label, byId.show_all_nested_sessions.icon, byId.show_all_nested_sessions.hints],
    [PaletteCopy.showAllNestedSessionsCopy.description.defaultMessage, 'Expand', ['Expand', 'Unfold sessions']]);
  byId.hide_all_nested_sessions.run(); byId.show_all_nested_sessions.run();
  assert.deepEqual(ran, ['hide', 'show']);
  // `_t(id, t.anyShown ? n : void 0)`: each is registered only while it applies, with or without an open session.
  const only = (value) => paletteActions({ nested: { onHideAll() {}, onShowAll() {}, ...value } }).map((action) => action.id);
  assert.deepEqual(only({ anyShown: true, anyHidden: false }), ['hide_all_nested_sessions']);
  assert.deepEqual(only({ anyShown: false, anyHidden: true }), ['show_all_nested_sessions']);
  assert.deepEqual(only({ anyShown: false, anyHidden: false }), []);
  assert.deepEqual(filterPaletteActions(actions, 'fold').map((action) => action.id), ['hide_all_nested_sessions', 'show_all_nested_sessions']);
});

test('Actions catalog: a titled session names itself (cfb613cf0 t), cut at 40 characters; Unarchive waits for one in flight', () => {
  const titled = sessionCommands({ session: { title: 'Fix login' } }).actions;
  assert.deepEqual(titled.filter((action) => /_code_session$/.test(action.id)).map((action) => action.label),
    ['Archive “Fix login”', 'Delete “Fix login”', 'Rename “Fix login”', 'Pin “Fix login”', 'Fork “Fix login”']);
  assert.equal(titled.find((action) => action.id === 'new_code_session_from_current').label, 'New session with current settings');
  const long = 'x'.repeat(41);
  assert.equal(sessionCommandLabels(long).archive, `Archive “${'x'.repeat(39)}…”`);
  assert.equal(sessionCommandLabels('x'.repeat(40)).pin, `Pin “${'x'.repeat(40)}”`);
  assert.deepEqual(sessionCommandLabels('  '), {});
  const archived = sessionCommands({ session: { archived: true, title: 'Old' } }).actions;
  assert.equal(archived.find((action) => action.id === 'unarchive_code_session').label, 'Unarchive “Old”');
  assert.ok(!sessionCommands({ session: { archived: true, unarchiving: true } }).actions.some((action) => action.id === 'unarchive_code_session'));
});

test('sessionPullRequestUrl: the session PR link, else the band lookup; https only', () => {
  assert.equal(sessionPullRequestUrl({ prInfo: { url: 'https://github.com/o/r/pull/1' } }), 'https://github.com/o/r/pull/1');
  assert.equal(sessionPullRequestUrl({ codeDesktop: { pr: { url: 'https://github.com/o/r/pull/2' } } }), 'https://github.com/o/r/pull/2');
  assert.equal(sessionPullRequestUrl({}, { url: 'https://github.com/o/r/pull/3' }), 'https://github.com/o/r/pull/3');
  assert.equal(sessionPullRequestUrl({ prLink: 'javascript:alert(1)' }), null);
  assert.equal(sessionPullRequestUrl(null), null);
});

test('Actions mode renders the registry groups with titles; a typed default view finds the commands', () => {
  const { actions } = sessionCommands();
  const html = palette({ entry: 'actions', actions });
  const groups = [...html.matchAll(/role="group" aria-label="([^"]+)" class="spal-group"><div class="spal-group-title"><span>([^<]+)<\/span>/g)].map((match) => match[1]);
  assert.deepEqual(groups, ['Navigation', 'Chat', 'Session', 'Settings', 'General']);
  assert.match(html, /Rename session<\/span><\/span><span class="spal-trailing"><span class="spal-keys" aria-hidden="true"><kbd>⌥⌘R<\/kbd>/);
  assert.doesNotMatch(palette({ actions }), /aria-label="Session"/, 'the default view has no Session group');
  assert.match(palette({ query: 'terminal', actions }), /Show <strong class="spal-match">terminal<\/strong>/);
});

test('default mode: a modal dialog with the combobox, Quick actions and Recents, footer key hints', () => {
  const html = palette({});
  assert.match(html, /role="dialog" aria-modal="true" aria-label="Command palette"/);
  assert.match(html, /role="combobox"[^>]*placeholder="Search or start a session"/);
  assert.match(html, /aria-label="Quick actions"/);
  assert.match(html, /aria-label="Recents"/);
  assert.match(html, /Fix login bug/);
  assert.match(html, /<span>Select<\/span>/);
  assert.match(html, /<span>Actions<\/span><span class="spal-keys" aria-hidden="true"><kbd>Tab<\/kbd>/);
  assert.doesNotMatch(html, /cursor:\s*pointer/);
});

test('typed default mode adds the quoted New session send row, matches and the Send hint', () => {
  const html = palette({ query: 'login' });
  assert.match(html, /New session<span class="spal-send-text"><span class="spal-quote">“<\/span>login<span class="spal-quote">”<\/span>/);
  assert.match(html, /<strong class="spal-match">login<\/strong>/);
  assert.match(html, /<span>Send<\/span>/);
  assert.match(html, /1 result available/);
});

test('search mode: type tabs, date filter and the empty state', () => {
  const html = palette({ entry: 'search' });
  assert.match(html, /placeholder="Search sessions and projects"/);
  for (const label of ['All', 'Sessions', 'Projects', 'Today', 'Past week', 'Past month']) assert.match(html, new RegExp(`>${label}</button>`), label);
  assert.match(html, /aria-label="Search mode"/);
  const empty = palette({ entry: 'search', query: 'nothing-matches-this' });
  assert.match(empty, /No results found/);
});

test('every palette string has a zh-CN entry', () => {
  const zh = dictionary('zh-CN');
  for (const s of ['Search or start a session', 'Search sessions and projects', 'Search actions', 'Quick actions', 'Recents', 'Actions', 'Projects',
    'Command palette', 'Command palette options', 'Search results', 'Search mode', 'Actions mode', 'Searching deeper...', 'Filters', 'No results found',
    'Select', '{count} result available', '{count} results available', 'Past hour', 'Past week', 'Past month', 'Past year', 'Settings → {section}',
    'Customize → {section}', 'Show PR status', 'Navigation', 'Chat', 'Session', 'Archive session', 'Delete session', 'Unarchive session', 'Rename session',
    'Pin session', 'Unpin session', 'Fork session', 'New session with current settings', 'Show terminal', 'Hide terminal', 'Show changes', 'Hide changes',
    'Show preview', 'Hide preview', 'Show files', 'Hide files', 'Show side chat', 'Hide side chat', 'Close pane', 'Jump to previous prompt',
    'Jump to next prompt', 'Keyboard shortcuts', 'Add files or photos', 'upload', 'hide', 'remove', 'trash', 'restore', 'star', 'favorite',
    'duplicate', 'clone', 'same settings', 'carry over', 'shell', 'console', 'diff', 'preview', 'web', 'tree', 'explorer', 'btw', 'question', 'panel',
    'scroll back message history', 'Archive “{name}”', 'Delete “{name}”', 'Unarchive “{name}”', 'Rename “{name}”', 'Pin “{name}”', 'Unpin “{name}”',
    'Fork “{name}”', 'Hide all nested sessions', 'Show all nested sessions', 'Collapse', 'Expand', 'Fold sessions', 'Unfold sessions']) assert.ok(zh[s], s);
});

test('the sidebar has no standalone Routines label; Routines is only the nav row', () => {
  const html = renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'] }));
  assert.doesNotMatch(html, /source-routines-label/);
  assert.equal(html.match(/>Routines</g).length, 1);
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  assert.doesNotMatch(css, /source-routines-label|source-search-start/);
});

test('pointer-opened menus highlight nothing; the account menu has no invented appearance item', () => {
  const sidebar = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  assert.match(sidebar, /initialHighlight=\{menu\.entry \?\? "popup"\}/);
  assert.match(sidebar, /onClick=\{\(event\) => onAccount\?\.\(event, keyboardEntry\(event\)\)\}/);
  const main = readFileSync(path.resolve(import.meta.dirname, '../src/main.jsx'), 'utf8');
  // A click (detail > 0) passes no entry, so SourceMenu's focusItemOnOpen "auto" leaves every row unhighlighted.
  assert.match(sidebar, /onMenu\?\.\("connection", event\.currentTarget, undefined, keyboardEntry\(event\)\)/);
  assert.doesNotMatch(main, /t\("Dark appearance"\)|t\("Light appearance"\)/);
});
