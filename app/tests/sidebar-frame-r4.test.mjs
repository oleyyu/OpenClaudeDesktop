// W14-code r4 frame-sidebar: the session menu's Archive / Delete on a running session (fr4-01), the session menu's
// accessible name (fr4-03), the nested delete's follow-up confirm (fr4-05), the delete confirm copy (fr4-12b), the
// footer avatar (gates-r4-06), the hover card / Routines section mounts (fr4-07 / fr4-06), the "New session in" names.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { singleDeleteStep } from '../src/sidebar-bulk-model.mjs';

const app = path.resolve(import.meta.dirname, '..');
const local = (file) => readFileSync(path.join(app, file), 'utf8');
const official = (name) => readFileSync(path.join(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1', name), 'utf8');
let server, Sidebar, Layout;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, appType: 'custom', logLevel: 'error' });
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  Layout = await server.ssrLoadModule('/src/sidebar-sections-layout.mjs');
});
after(async () => { await server?.close(); });

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const menu = (props) => renderToStaticMarkup(React.createElement(Sidebar.SourceSidebarSessionMenu, { session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, onFork() {}, onDelete() {}, ...props }));
const item = (html, label) => html.match(new RegExp(`<div role="menuitem"[^>]*data-label="${label}"[^>]*>`))?.[0];

test('fr4-01: a running session keeps Archive and Delete enabled (ce4f4374c $e has no disabled state)', () => {
  const running = menu({ state: { active: { s1: 'turn-1' } } });
  for (const label of ['Archive', 'Delete']) {
    const row = item(running, label);
    assert.ok(row, label);
    assert.doesNotMatch(row, /aria-disabled|data-disabled/, `${label} is not disabled while running`);
  }
  assert.doesNotMatch(running, /Stop the running task before deleting it\./);
  // W14-code fr6-03: Fork has no running reason either — cd54a5401 `forkDisabledReason:Qt`, Qt = `N===void 0?void 0:mt(u,N)`
  // (caec4a2d4 kn: unsupported / requires_server / background_unavailable / host_offline only).
  assert.doesNotMatch(running, /Stop the running task before forking it\./);
  const fork = item(running, 'Fork');
  assert.ok(fork, 'Fork');
  assert.doesNotMatch(fork, /aria-disabled|data-disabled/, 'Fork is not disabled while running');
  assert.ok(official('cd54a5401-wFztHb-d.js').includes('N===void 0?void 0:mt(u,N)'));
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /Stop the running task before forking it/);
  const source = local('src/source-sidebar.jsx');
  assert.doesNotMatch(source, /canArchive/);
  const o = official('ce4f4374c-BhSG0KEl.js');
  assert.ok(o.includes('e(R,{shortcut:"a",onClick:l("archive",o),children:e(w,{defaultMessage:"Archive",id:"NOMnBofwOT"})})'));
  // The ⌘K Actions keep Archive / Delete for a running session too (cf74bc599 WN `S = !g && !b`).
  assert.match(local('src/main.jsx'), /canArchive: true, canDelete: true, canRename: true,/);
  assert.ok(official('cf74bc599-CRYqipWN.js').includes('S=!g&&!b'));
});

test('fr4-03 / sidebar names: the session menu popup carries no host aria-label; "New session in" uses the official placeholders', () => {
  const main = local('src/main.jsx');
  assert.doesNotMatch(main, /t\("Session menu"\)/);
  assert.doesNotMatch(local('electron/i18n/zh-CN/app.mjs'), /'Session menu'/);
  const source = local('src/source-sidebar.jsx');
  assert.equal((source.match(/t\("New session in \{group\}", \{ group: group\.label \}\)/g) || []).length, 2);
  assert.match(source, /t\("New session in \{folder\}", \{ folder: target \}\)/);
  assert.match(source, /t\("New session in \{folder\}, added to \{group\}", \{ folder: target, group: name \}\)/);
  assert.doesNotMatch(source, /New session in \{name\}/);
  const s21 = official('shared-21-R7LldJ05.js');
  for (const feature of ['newSessionIn:{defaultMessage:"New session in {group}"', 'inFolder:{defaultMessage:"New session in {folder}"', 'inFolderAddedTo:{defaultMessage:"New session in {folder}, added to {group}"'])
    assert.ok(s21.includes(feature), feature);
  const zh = local('electron/i18n/zh-CN/sidebar.mjs');
  for (const key of ['New session in {group}', 'New session in {folder}', 'New session in {folder}, added to {group}']) assert.ok(zh.includes(`'${key}'`), key);
});

test('fr4-05: after the nested question a single delete skips "Delete session?"; only a dirty / unreadable worktree asks', () => {
  assert.equal(singleDeleteStep(null), 'cancel');
  assert.equal(singleDeleteStep(undefined), 'confirm');
  assert.equal(singleDeleteStep('all'), 'delete');
  assert.equal(singleDeleteStep('only'), 'delete');
  const main = local('src/main.jsx');
  const request = main.slice(main.indexOf('async function requestSessionDelete(target) {'), main.indexOf('sessionActionRef.current = sessionAction;'));
  assert.match(request, /step = singleDeleteStep\(answer\)/);
  assert.match(request, /await sessionAction\("delete", target, \{ nestedAnswer: answer, \.\.\.\(probed \? \{ probed \} : \{\}\) \}\)\.catch\(actionFailed\("delete"\)\);/);
  assert.ok(request.indexOf('if (step === "delete")') < request.indexOf('setConfirmDelete(target);'));
  const o = official('c48ea26ad-DhTxpIFD.js');
  assert.ok(o.includes('if(!c||!c.asked&&!s&&!await m({sessionTitle:o||void 0,ownerWindow:e,worktreeSessionId:n.type==="local"?n.id:void 0}))return!1'));
  assert.ok(official('shared-46-BIbZBGFq.js').includes('ask:n.recheck?"never":"dirty"'));
});

test('gates-r4-06: the footer avatar slot is the static Spark (496524976 is not in Uon)', () => {
  const html = renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'], displayName: 'Fixture Person', avatarName: 'Fixture Person' }));
  const button = html.match(/<button type="button" data-testid="user-menu-button"[^>]*>(.*?)<\/button>/s)?.[1] ?? '';
  assert.match(button, /^<span class="df-on-rail relative flex w-\[var\(--df-leading-slot\)\] shrink-0 items-center justify-center"><(?:svg|span)[^>]*data-cds="Spark"/);
  assert.doesNotMatch(button, /data-cds="Avatar"/);
});

test('fr4-07 / fr4-06 mounts: the Code rows go through the hover card and the sections layout keeps the routines slot', () => {
  const source = local('src/source-sidebar.jsx');
  assert.match(source, /return <SidebarSessionHoverCard key=\{session\.id\} row=\{rowElement\} title=\{shownName\(session\)\} data=\{hoverData\}\s+awaiting=\{hoverState\.awaiting\} disabled=\{hoverState\.disabled\} \/>;/);
  assert.match(source, /sidebarHoverCardState\(hoverData, \{ suspended: selection\.selectedKeys\.size > 1 \}\)/);
  assert.match(source, /<SidebarHoverCardHost requestsFor=\{hoverCardRequestsFor\} runtime=\{approvalRuntime\} respond=\{onRespondApproval\}>/);
  assert.match(source, /routinesSection: mode === "code" \? <SidebarRoutinesSection \/> : null,/);
  assert.match(local('src/source-sidebar-sections.jsx'), /if \(entry\.kind === 'routines'\) return host\.routinesSection \?/);
  assert.ok(official('shared-22-Bwn3sJTG.js').includes('o(Wu,{row:Z,title:S,data:ce,awaiting:Q,summaryText:de,disabled:he})'));
  // The layout keeps the section list's routines entry (sections-model lm) in its place, between Pinned and Sessions.
  const sections = [{ id: 'pinned', kind: 'pinned', order: 0 }, { id: 'routines', kind: 'routines', order: 1, shown: false }, { id: 'sessions', kind: 'sessions', order: 2, show: { metadata: true } }];
  const model = Layout.buildSidebarSections({ sections, sessions: [thread('a')], preferences: {}, metadata: {} });
  assert.deepEqual(model.layout.map((entry) => entry.kind), ['pinned', 'routines', 'sessions']);
  // SSR: a Code row with a pending approval renders through the hover card trigger and keeps its row element.
  const html = renderToStaticMarkup(React.createElement(Sidebar.SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'],
    state: { approvals: [{ id: 7, method: 'item/commandExecution/requestApproval', params: { threadId: 's1', itemId: 'i', command: 'npm test' } }] } }));
  // QO clones the row as the CDS PreviewCard trigger (Base UI gives the trigger its id); the row's own attributes stay.
  assert.match(html, /<div class="source-session-row source-current-session-host df-drag-shiftable" data-source-session-id="s1" data-iconless="true" data-status-mark="awaiting" data-row-key="s1" data-jump-hint-row="" data-drag-key="s1" id="base-ui-[^"]+">/);
});

test('fr4-16: the test-only sidebar exports are gone', () => {
  assert.doesNotMatch(local('src/source-sidebar.jsx'), /SourceSidebarRenameRow|SourceSidebar as Sidebar/);
  assert.doesNotMatch(local('src/sidebar-bulk-model.mjs'), /nestedFamilyProvider/);
});

// W14-code fr6-07: bulk Archive / Delete toasts come from the official tables (c39a247c4 `zt = {archive: {success:
// R.bulkArchived, failure: R.bulkArchiveFailed}, …, delete: {success: R.bulkDeleted, failure: R.bulkDeleteFailed}}`; the
// Older bucket's shared-22 CT olderBulkArchived / olderBulkDeleted), not host-composed English.
test('fr6-07: bulk Archive / Delete toasts format the sliced hv / CT messages (English and zh-CN)', async () => {
  const { sidebarListMessages } = await server.ssrLoadModule('/src/generated/sessions-page/pure-shared-78.mjs');
  const { sidebarOlderMessages } = await server.ssrLoadModule('/src/generated/sessions-page/pure-shared-22.mjs');
  const { createStartIntl } = await server.ssrLoadModule('/src/source-code-start-adapters.jsx');
  const s22 = official('shared-22-Bwn3sJTG.js');
  assert.ok(s22.includes('olderBulkArchived:{defaultMessage:"Archived {count, plural, one {# older session} other {# older sessions}}",id:"mQXVaIKxH7"}'));
  assert.ok(s22.includes('olderBulkDeleted:{defaultMessage:"Deleted {count, plural, one {# older session} other {# older sessions}}",id:"Jnh2eh8Aex"}'));
  assert.ok(official('c39a247c4--WbIrj9D.js').includes('zt={archive:{success:R.bulkArchived,failure:R.bulkArchiveFailed},unarchive:{success:R.bulkRestored,failure:R.bulkRestoreFailed},delete:{success:R.bulkDeleted,failure:R.bulkDeleteFailed}}'));
  const intl = createStartIntl('en-US');
  assert.equal(intl.formatMessage(sidebarListMessages.bulkArchived, { count: 3 }), 'Archived 3 sessions');
  assert.equal(intl.formatMessage(sidebarListMessages.bulkDeleteFailed, { count: 1 }), '1 session couldn’t be deleted. Try again.');
  assert.equal(intl.formatMessage(sidebarOlderMessages.olderBulkArchived, { count: 1 }), 'Archived 1 older session');
  assert.equal(intl.formatMessage(sidebarOlderMessages.olderBulkDeleted, { count: 2 }), 'Deleted 2 older sessions');
  const source = local('src/source-sidebar.jsx');
  assert.match(source, /archive: \{ success: sidebarListMessages\.bulkArchived, older: sidebarOlderMessages\.olderBulkArchived, failure: sidebarListMessages\.bulkArchiveFailed \}/);
  assert.match(source, /delete: \{ success: sidebarListMessages\.bulkDeleted, older: sidebarOlderMessages\.olderBulkDeleted, failure: sidebarListMessages\.bulkDeleteFailed \}/);
  assert.doesNotMatch(source, /bulkDoneMessage|bulkFailedMessage|Some sessions could not be updated/);
  const zh = (await import('../electron/i18n/zh-CN/index.mjs')).default;
  assert.equal(zh[sidebarOlderMessages.olderBulkArchived.defaultMessage], '已归档 {count, plural, one {# 个较早的会话} other {# 个较早的会话}}');
});
