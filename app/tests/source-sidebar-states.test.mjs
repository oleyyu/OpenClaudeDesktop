import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Node-only SSR of the real SourceSidebar (no browser, Electron or Codex):
// sidebar-groups.js zP New row selection, OO empty variants and AO skeleton.
let server, SourceSidebar, SourceSidebarEmpty, SourceSidebarSessionMenu, deleteConfirmCopy, olderConfirmCopy, splitStore;
before(async () => {
  server = await createServer({ configFile: false, root: path.resolve(import.meta.dirname, '..'), plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar, SourceSidebarEmpty, SourceSidebarSessionMenu, deleteConfirmCopy, olderConfirmCopy } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
  ({ splitStore } = await server.ssrLoadModule('/src/source-split-view.jsx'));
});
after(async () => { await server?.close(); });

const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const render = (props) => renderToStaticMarkup(React.createElement(SourceSidebar, { sessions: [thread('s1')], knownFolders: ['/fixture/work'], ...props }));
// Nav rows carry shared-21 ND's "group" (:7590-7597) since 0.2.121 so mD's group-* utilities resolve.
const newRow = (html) => html.match(/<button[^>]*class="source-sidebar-nav-row group"[^>]*>(?:(?!<\/button>).)*New<\/span>/s)?.[0].match(/^<button[^>]*>/)[0];

test('folded family summary has disjoint status counts, full accessible name and current error decoration', () => {
  const sessions = [thread('parent'), ...['failed', 'unread', 'working'].map(id => thread(id, { forkedFromId: 'parent' }))];
  const html = render({ sessions, sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] },
    sessionMetadata: { failed: { unread: true }, unread: { unread: true } },
    state: { errors: { failed: 'error' }, active: { failed: 'turn', unread: 'turn', working: 'turn' } },
  });
  assert.match(html, /aria-label="Show 3 nested sessions, 1 failed, 1 new, 1 working"/);
  assert.match(html, /data-drag-key="label:stub:parent"/, 'drag metrics must keep the summary out of session ordering');
  assert.match(html, /df-fade-truncate flex items-center whitespace-nowrap/);
  assert.match(html, /aria-hidden="true" data-row-decoration=""/);
  assert.match(html, /class="text-warning" style="font-size:calc\(1rem/);
  assert.doesNotMatch(html, /df-family-handle|source-nested-stub-text|source-nested-stub-meta/);
  assert.doesNotMatch(html, /data-source-session-id="(?:failed|unread|working)"/);
});

test('folded family keeps the primary session and another split pane listed', () => {
  const sessions = [thread('parent'), ...['main-child', 'split-child', 'hidden-child'].map(id => thread(id, { forkedFromId: 'parent' }))];
  splitStore.reportSide(0, { current: 'main-child' }); splitStore.open('split-child');
  try {
    const html = render({ sessions, current: 'main-child', sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] } });
    assert.match(html, /data-source-session-id="main-child"/);
    assert.match(html, /data-source-session-id="split-child"/);
    assert.doesNotMatch(html, /data-source-session-id="hidden-child"/);
    assert.match(html, /aria-label="Show 1 more nested session"/);
  } finally { splitStore.close(1); splitStore.reportSide(0, { current: null }); }
});

test('New is selected only on the new route with no open session (zP y = _ && !v) and always carries aria-keyshortcuts', () => {
  const open = newRow(render({ current: 's1', section: 'new' }));
  assert.ok(open, 'New row renders');
  assert.doesNotMatch(open, /data-selected/); assert.doesNotMatch(open, /aria-current/);
  assert.match(open, /aria-keyshortcuts="Meta\+n"/);
  const openHtml = render({ current: 's1', section: 'new' });
  assert.equal(openHtml.match(/data-source-session-id="[^"]+" data-selected="focused"/g).length, 1, 'only the open session row is selected');
  assert.match(openHtml, /data-source-session-id="s1" data-selected="focused"/);
  const fresh = newRow(render({ current: null, section: 'new' }));
  assert.match(fresh, /data-selected="focused"/); assert.match(fresh, /aria-current="page"/); assert.match(fresh, /aria-keyshortcuts="Meta\+n"/);
  assert.match(render({ current: null, section: 'new' }), /<kbd aria-hidden="true">⌘ N<\/kbd>/);
  const customize = render({ current: null, section: 'customize' });
  assert.doesNotMatch(newRow(customize), /data-selected|aria-current/);
  assert.match(customize, /data-selected="focused"[^>]*>(?:(?!<\/button>).)*Customize/s);
});

test('filtered empty variant: OO copy and Show all sessions button', () => {
  const html = render({ sessions: [thread('s1', { archived: true })], sidebarPreferences: { status: 'active' } });
  assert.match(html, /data-empty-variant="filtered"/);
  assert.match(html, /<p class="source-sidebar-empty-text">No sessions match the current filters<\/p>/);
  assert.match(html, /<button type="button" class="source-sidebar-show-all hide-focus-ring">Show all sessions<\/button>/);
  assert.doesNotMatch(html, /No archived sessions|No sessions match these filters|Open a folder/);
  const archivedFilter = render({ sessions: [], sidebarPreferences: { status: 'archived' } });
  assert.match(archivedFilter, /data-empty-variant="no-sessions"/);
  // fO (sidebar-groups.js:7600-7609): status all with no sessions is no-sessions, not filtered.
  assert.match(render({ sessions: [], sidebarPreferences: { status: 'all' } }), /data-empty-variant="no-sessions"/);
  assert.match(render({ sessions: [], sidebarPreferences: { groupBy: 'state', stateActivityDays: 3 } }), /data-empty-variant="no-sessions"/);
  assert.match(render({ sessions: [], sidebarPreferences: { groupBy: 'state', stateActivityDays: 30 } }), /data-empty-variant="no-sessions"/);
});

test('no-sessions empty variant: OO copy and the xO pictogram at scale .55', () => {
  const html = render({ sessions: [] });
  assert.match(html, /data-empty-variant="no-sessions"/);
  assert.match(html, /Sessions you start will show up here/);
  assert.match(html, /<div aria-hidden="true"><svg width="82.5" height="77" viewBox="0 0 150 140" fill="none"/);
  const d = html.match(/<path d="([^"]+)" fill="hsl\(var\(--pictogram-200\)\)"/)[1];
  assert.equal(d.length, 29168, 'length of the reference bO() string (checked equal once against sidebar-groups.js:7645-7686)');
  assert.ok(d.startsWith('M90 0h20v20h-20zM90 40h20v20h-20zM70 20h20v20h-20zM110 20h20v20h-20zM20 40h1v1h-1z'));
  // gO: seven 20x20 and four 10x20 rects, half the cells kept; _O: every other row and column.
  const cells = d.match(/h1v1h-1z/g).length;
  assert.equal(cells, (7 * 400 + 4 * 200) / 2 + (400 + 200 + 200) / 4);
  assert.doesNotMatch(html, /Start a session to see it here|Open a folder/);
  const direct = renderToStaticMarkup(React.createElement(SourceSidebarEmpty, { variant: 'filtered' }));
  assert.doesNotMatch(direct, /Show all sessions/, 'no button without a handler');
});

test('the ⌘K palette query never filters the list; loading shows the AO skeleton instead of an empty state', () => {
  const search = render({ search: 'zzz' });
  assert.match(search, /Session s1/); assert.doesNotMatch(search, /No matching sessions|data-empty-variant/);
  const loading = render({ sessions: [], loading: true });
  assert.doesNotMatch(loading, /data-empty-variant/);
  assert.match(loading, /<div class="df-placeholder-rows source-sidebar-skeleton" data-testid="sidebar-rows-skeleton" role="status" aria-label="Loading sessions">/);
  const rows = [...loading.matchAll(/<div data-row="" class="source-sidebar-skeleton-row">(.*?)<\/div>/g)].map((match) => match[1]);
  assert.equal(rows.length, 3);
  rows.forEach((row, index) => {
    assert.match(row, /<span class="source-leading-slot"><span data-cds="Skeleton" class="smenu-skeleton source-skeleton-dot" style="width:6px;height:6px"><\/span><\/span>/);
    assert.ok(row.includes(`style="width:${['68%', '54%', '44%'][index]};height:var(--df-row-font, 13px)"`), row);
  });
  assert.doesNotMatch(loading, /source-sidebar-loading/);
  // AO rows carry Wn = TD (sidebar-rows.js:7177) pl-[calc(var(--df-row-px)+var(--df-row-indent,0px))].
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  const rule = css.match(/\.source-sidebar-skeleton-row \{([^}]*)\}/)[1];
  assert.match(rule, /padding-right: var\(--df-row-px\);/);
  assert.match(rule, /padding-left: calc\(var\(--df-row-px\) \+ var\(--df-row-indent, 0px\)\);/);
});

// sidebar-rows.js qD / JD / $D, sidebar-main.js lI, sidebar-groups.js cI / Vz and
// the SR mode segments: CDS tooltips (portals, absent in SSR) or none, never a
// native title anywhere in the sidebar. JD also takes the More button out of the
// tab order and marks it data-row-action for eO's ArrowLeft/Right.
test('no native titles in the sidebar; the row More button is tabindex -1 with data-row-action', () => {
  const html = render({ current: 's1', onSessionAction() {}, onProject() {}, setShowSearch() {}, showSearch: true, onMenu() {},
    sessions: [thread('s1', { name: 'A long session name that would be truncated in the row' })] });
  assert.doesNotMatch(html, /\stitle="/, 'no element in the sidebar carries a title attribute');
  const tag = (pattern) => html.match(pattern)?.[0];
  for (const [name, pattern] of [['row main button', /<button[^>]*data-row-main-button=""[^>]*>/], ['group toggle', /<button[^>]*data-group-toggle=""[^>]*>/],
    ['Filter', /<button[^>]*aria-label="Group and sort"[^>]*>/], ['New session in', /<button[^>]*aria-label="New session in work"[^>]*>/],
    ['row More', /<button[^>]*class="[^"]*source-current-session-more[^"]*"[^>]*>/], ['mode radio', /<span[^>]*role="radio"[^>]*aria-label="Code"[^>]*>/]]) {
    assert.ok(tag(pattern), name + ' renders');
    assert.doesNotMatch(tag(pattern), /title=/, name);
  }
  const more = tag(/<button[^>]*class="[^"]*source-current-session-more[^"]*"[^>]*>/);
  assert.match(more, /tabindex="-1"/); assert.match(more, /data-row-action=""/);
  assert.match(more, /aria-label="More options for A long session name that would be truncated in the row"/);
  assert.match(tag(/<button[^>]*data-row-main-button=""[^>]*>/), /data-roving-item=""/);
  assert.match(render({ sidebarPreferences: { status: 'archived' }, onSessionAction() {} }), /aria-label="Group and sort"/);
  // Current iI is named by its visible Search label and opens the command palette.
  const search = tag(/<button[^>]*class="df-search-field [^"]*"[^>]*>/);
  assert.ok(search, 'Search button renders'); assert.doesNotMatch(search, /title=/);
  // The ⌘K palette replaced the inline field: no search input or 'Close search' in the sidebar, and no pressed state.
  assert.doesNotMatch(html, /Search sessions|Close search|session-search-wrap/);
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  assert.match(source, /className="df-search-field surface-sidebar-search"/);
  assert.match(source, /<SourceSidebarPalette open=\{!!showSearch\} entry=\{showSearch === "search" \? "search" : "default"\}/);
});

test('eO scroller inset: 4px start/top inset with matching negative margins and pb-2', () => {
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  const rule = css.match(/\.source-session-list \{([^}]*)\}/)[1];
  for (const decl of ['padding-top: 4px;', 'padding-left: 4px;', 'margin-top: -4px;', 'margin-left: -4px;', 'padding-bottom: 8px;', 'margin-right: -8px;']) assert.ok(rule.includes(decl), decl);
});

// sidebar-groups.js:12828-12842 / :7062-7073 mD: only New's df-leading-slot holds the
// df-new-circle around Icon Add "sm" (16) with the group colour utilities.
test('New leading slot holds the df-new-circle Add glyph; no other nav row has it', () => {
  const html = render({ current: null, section: 'new' });
  const rows = [...html.matchAll(/<button[^>]*class="source-sidebar-nav-row group"[^>]*>(?:(?!<\/button>).)*<\/button>/gs)].map((match) => match[0]);
  assert.deepEqual(rows.map((row) => row.match(/<span>([^<]+)<\/span>/)[1]), ['New', 'Projects', 'Artifacts', 'Routines', 'Customize']);
  assert.match(rows[0], /<span class="source-leading-slot df-leading-slot"><span class="df-new-circle flex shrink-0 items-center justify-center rounded-full"><span aria-hidden="true" data-cds="Icon" class="text-secondary group-hover:text-primary group-data-\[selected=focused\]:text-primary" style="font-size:16px;font-weight:533.3">[^<]+<\/span><\/span><\/span><span class="flex min-w-0 flex-1 items-center"><span>New<\/span>/);
  for (const row of rows.slice(1)) {
    assert.doesNotMatch(row, /df-new-circle/);
    assert.match(row, /^<button[^>]*><span class="source-leading-slot"><span aria-hidden="true" data-cds="Icon" class="" style="font-size:16px/);
  }
  assert.equal(html.match(/df-new-circle/g).length, 1);
});

// sidebar-groups.js:5225-5310 pw inside sidebar-main.js:14187-14202 hL / :14970 df-bottom-tray.
test('account footer is the pw df-user-menu-btn: df-on-rail CDS Avatar, name, muted dot + suffix, xs caret', () => {
  const html = render({ displayName: 'Fixture', avatarName: 'Fixture Person', accountLabel: 'Plus', connectionIssue: true });
  const tray = html.match(/<div class="df-bottom-tray shrink-0"><div class="df-footer-row account-footer shrink-0 flex items-center gap-\[var\(--df-footer-gap\)\]"><div class="min-w-0 flex-1">(<button[^>]*>)(.*?)<\/button><\/div><div class="df-footer-aux ml-auto flex shrink-0 items-center"><button[^>]*aria-label="Connection settings"/s);
  assert.ok(tray, 'tray > footer row > min-w-0 flex-1 button, then the aux holding the local Connection settings control while the core is down');
  // hL aux (sidebar-main.js:14185-14235) is empty in code mode: a healthy core shows no footer control.
  assert.match(render({ displayName: 'Fixture Person' }), /<div class="df-footer-aux ml-auto flex shrink-0 items-center"><\/div>/);
  assert.doesNotMatch(readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8'), /icon="Ant"/, 'no Anthropic-internal Ant glyph');
  const [, open, body] = tray;
  assert.match(open, /class="df-user-menu-btn account-button cds-reset flex h-\[max\(28px,var\(--df-footer-btn-size\)\)\] max-w-full items-center gap-\[var\(--df-row-gap\)\] rounded-\[var\(--df-radius-pill\)\] ps-\[var\(--df-row-px\)\] pe-2 text-start outline-none hover:bg-\[var\(--df-hover\)\] focus-visible:shadow-focus"/);
  assert.match(open, /type="button"/); assert.match(open, /data-testid="user-menu-button"/); assert.match(open, /aria-label="Account menu"/); assert.match(open, /aria-haspopup="menu"/);
  // shared-19 E0 with __gb__496524976 on (host-growthbook, user ruling 2026-10-18): C0, the CDS Avatar (shared-frame si)
  // at "sm", aria-hidden, no image source, so the full name's initials.
  assert.match(body, /^<span class="df-on-rail relative flex w-\[var\(--df-leading-slot\)\] shrink-0 items-center justify-center"><span data-cds="Avatar" aria-hidden="true" class="inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full [^"]*size-\[var\(--cds-avatar-sm\)\][^"]*" role="img" aria-label="Fixture Person">FP<\/span><\/span>/);
  assert.doesNotMatch(body, /data-cds="Spark"/);
  assert.match(render({ displayName: 'Solo' }), /aria-label="Solo">S<\/span>/, 'without avatarName the shown name is the avatar name');
  assert.match(body, /<span class="flex min-w-0 gap-1 overflow-hidden text-\[length:var\(--df-row-font\)\] df-footer-suffix items-baseline"><span class="whitespace-nowrap text-secondary max-w-full shrink-0 truncate">Fixture<\/span><span aria-hidden="true" class="df-footer-suffix-text text-muted">·<\/span><span class="df-footer-suffix-text min-w-0 whitespace-nowrap text-muted">Plus<\/span><\/span><span aria-hidden="true" data-cds="Icon" class="shrink-0 text-muted" style="font-size:12px;font-weight:[\d.]+">[^<]+<\/span>$/);
  assert.doesNotMatch(html, /<small|class="avatar"|class="account-name"/);
  const bare = render({ displayName: 'Fixture', accountLabel: '' });
  // The shown name is what main.jsx passes (accountFooter's first name), CSS-truncated.
  assert.match(bare, /<span class="whitespace-nowrap text-secondary max-w-full shrink-0 truncate">Fixture<\/span><\/span><span aria-hidden="true" data-cds="Icon" class="shrink-0 text-muted"/, 'no dot or suffix without a label');
});

// sidebar-session.js:13916/13924 and sidebar-groups.js:18641-18669 promise a
// permanent delete, which is true for Codex. A core whose thread/delete also
// removes its own history (capabilities.deleteHistory, implied or reported)
// names that core, and the folder when it is known.
test('delete confirm copy: Codex keeps the source strings; a core that deletes its own history names it', () => {
  const one = [thread('s1', { name: 'Middle task' })], two = [thread('s1'), thread('s2')];
  assert.deepEqual(deleteConfirmCopy(one), { title: 'Delete session?', body: '“Middle task” will be permanently deleted. This can’t be undone.', confirmLabel: 'Delete', danger: true });
  assert.deepEqual(deleteConfirmCopy(one, { engine: 'codex' }), deleteConfirmCopy(one));
  assert.equal(deleteConfirmCopy(two).body, 'These 2 sessions will be permanently deleted. This can’t be undone.');
  // A core whose delete also removes its own history (capabilities.deleteHistory) says so and names
  // that core — the boot.core object (main.jsx) or the core id (sidebar) — never another product.
  // The DeepSeek core keeps telling users where its history lives (the Harness sessions folder).
  const harness = 'DeepSeek Harness (~/.dsh/sessions)';
  for (const [engine, core] of [['deepseek', harness], ['deepseek-harness', harness], [{ engine: 'deepseek-harness', capabilities: {} }, harness],
    ['zcode', 'ZCode (~/.zcode/cli/db)'], [{ engine: 'zcode', capabilities: { deleteHistory: true } }, 'ZCode (~/.zcode/cli/db)'],
    ['opencode', 'OpenCode (~/.local/share/opencode)'], ['mimo', 'MiMo Code (~/.local/share/mimocode)'],
    // Reported capabilities count (boot.core): MiniMax doesn't imply deleteHistory, but its bridge reports it.
    [{ engine: 'minimax', capabilities: { deleteHistory: true } }, 'MiniMax Code'],
    // A folder the core reports itself is named too.
    [{ engine: 'kimi', capabilities: { deleteHistory: true, historyLocation: '~/.kimi/sessions' } }, 'Kimi Code (~/.kimi/sessions)']]) {
    const single = deleteConfirmCopy(one, { engine }), plural = deleteConfirmCopy(two, { engine });
    assert.deepEqual(single, { title: 'Delete session?', body: `“Middle task” and its history in ${core} will be permanently deleted. This can’t be undone.`, confirmLabel: 'Delete', danger: true });
    assert.deepEqual(plural, { title: 'Delete 2 sessions?', body: `These 2 sessions and their history in ${core} will be permanently deleted. This can’t be undone.`, confirmLabel: 'Delete', danger: true });
    assert.equal(olderConfirmCopy('delete', 1, { engine }).body, `This will permanently delete 1 session older than a week, including its history in ${core}. Pinned sessions aren’t affected. This can’t be undone.`);
    assert.equal(olderConfirmCopy('delete', 2, { engine }).body, `This will permanently delete 2 sessions older than a week, including their history in ${core}. Pinned sessions aren’t affected. This can’t be undone.`);
  }
  // A core that does not report deleteHistory keeps the plain copy (what it reports wins over what it implies).
  assert.deepEqual(deleteConfirmCopy(one, { engine: { engine: 'opencode', capabilities: { deleteHistory: false } } }), deleteConfirmCopy(one));
  assert.deepEqual(olderConfirmCopy('delete', 3), { title: 'Delete older sessions?', body: 'This will permanently delete 3 sessions older than a week. Pinned sessions aren’t affected. This can’t be undone.', confirmLabel: 'Delete all', danger: true });
  assert.deepEqual(olderConfirmCopy('archive', 2, { engine: 'deepseek' }), olderConfirmCopy('archive', 2));
});

test('a nested sub-agent row names the running assistant, never a fixed one', () => {
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  assert.doesNotMatch(source, /Started by Claude/);
  assert.match(source, /t\("Started by \{assistant\} from \{name\}", \{ assistant: getAssistantName\(\)/);
});

test('hidden sessions: only load failures get a notice; other-core sessions stay silent', () => {
  const html = render({ engine: 'deepseek', hiddenSessions: { otherEngine: 10, missing: 1, missingIds: ['gone'] } });
  assert.match(html, /data-sidebar-notice="hidden-sessions"><p>1 session could not be loaded\. Its files were deleted or can’t be read by DeepSeek Harness\.<\/p><\/div>/);
  // With a connected core the notice offers Try again and Remove from sidebar (main.cjs forget-sessions).
  const actionable = render({ engine: 'deepseek', hiddenSessions: { otherEngine: 0, missing: 2, missingIds: ['a', 'b'] }, onRetryHidden() {}, onForgetHidden() {} });
  assert.match(actionable, /2 sessions could not be loaded\. Their files were deleted/);
  assert.match(actionable, /<button type="button" class="source-sidebar-hidden-action">Try again<\/button><button type="button" class="source-sidebar-hidden-action">Remove from sidebar<\/button>/);
  assert.doesNotMatch(html, /Codex session/);
  for (const props of [{}, { hiddenSessions: null }, { engine: 'deepseek', hiddenSessions: { otherEngine: 10, missing: 0 } }]) assert.doesNotMatch(render(props), /data-sidebar-notice/);
});

test('row menu Fork: the core reason disables it before the running/archived reasons', () => {
  const menu = (props) => renderToStaticMarkup(React.createElement(SourceSidebarSessionMenu, { session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, onFork() {}, onDelete() {}, ...props }));
  const fork = (html) => html.match(/<div role="none" class="smenu-reason"><div role="menuitem"[^>]*data-label="Fork"[^>]*>.*?<span id="[^"]+" hidden="" data-cds-disabled-reason="">([^<]+)<\/span><\/div>/)?.[1];
  assert.equal(fork(menu({ forkUnavailable: 'Not available with Codex yet' })), 'Not available with Codex yet');
  assert.equal(fork(menu({ forkUnavailable: 'Not available with Codex yet', session: thread('s1', { archived: true }) })), 'Not available with Codex yet');
  assert.equal(fork(menu({ session: thread('s1', { archived: true }) })), 'Restore this session before forking it.');
  const enabled = menu({});
  assert.equal(fork(enabled), undefined);
  assert.match(enabled, /<div role="menuitem" tabindex="-1" aria-keyshortcuts="f" data-label="Fork" class="smenu-item">/);
});

// sidebar-main.js:14874-14892 pp + shared-frame-C_2npUJq.js:1196-1208 Li: the
// sidebar is its own CDS root (compact on desktop, data-platform, data-font).
test('the sidebar aside is a CDS root carrying data-density, data-platform and data-font', () => {
  const aside = (html) => html.match(/<aside[^>]*>/)[0];
  for (const [props, font] of [[{}, 'sans'], [{ cdsFont: 'system' }, 'system']]) {
    const tag = aside(render(props));
    assert.match(tag, /class="app-sidebar dframe-sidebar source-sidebar cds-root"/);
    assert.match(tag, /data-density="compact"/);
    assert.match(tag, /data-platform="desktop"/);
    assert.match(tag, new RegExp(`data-font="${font}"`));
  }
});

// shared-frame-C_2npUJq.js:2722 primary Button text-on-primary, :2748-2749
// bg-fill-primary (hover bg-fill-primary-hover). Fidelity F02: the group and
// confirm dialogs sit on the shared Dialog (source-dialog.jsx) with CDS Buttons
// (SourceSettingsButton) instead of hand-rolled sidebar dialog rules.
test('group and confirm dialogs use the shared Dialog with the CDS primary/danger Button', () => {
  const read = (file) => readFileSync(path.resolve(import.meta.dirname, '../src/' + file), 'utf8');
  const css = read('source-sidebar.css'), jsx = read('source-sidebar.jsx'), button = read('source-settings-button.css');
  const official = readFileSync(path.resolve(import.meta.dirname, '../public/assets/v1/c6a992d55-sXiDGMFQ.css'), 'utf8');
  assert.doesNotMatch(css, /\.source-group-dialog(-backdrop)?\s*\{/);
  assert.doesNotMatch(css, /--cds-text-on-primary/);
  assert.match(jsx, /<SourceDialog open=\{open\} onExited=\{onExited\} size="sm" showClose=\{false\}/);
  assert.match(jsx, /<SourceSettingsButton type="submit" variant="primary" busy=\{pending\}/);
  assert.match(jsx, /<SourceConfirmationDialog [^>]*confirmVariant=\{danger \? "danger" : "primary"\}/s);
  assert.match(button, /\.source-settings-button\[data-variant=primary\] \{ color:var\(--cds-on-primary\);/);
  assert.match(button, /\.source-settings-button\[data-variant=primary\] \.ssb-paint \{ background:var\(--cds-fill-primary\); \}/);
  assert.match(button, /\.source-settings-button\[data-variant=primary\]:is\(:hover,\[aria-haspopup\]\[aria-expanded=true\]\) \.ssb-paint \{ background:var\(--cds-fill-primary-hover\); \}/);
  for (const token of ['--cds-on-primary', '--cds-fill-primary', '--cds-fill-primary-hover', '--cds-on-danger', '--cds-fill-danger']) assert.match(official, new RegExp(token + ':'));
});

// 2.37337.1 shared-21 cq: Code rows use a trailing decoration and one live
// announcement in their label. Idle/archived rows have no activity glyph.
test('Code status glyphs are trailing; idle/archived stay iconless and live copy is announced once', async () => {
  const idle = render({});
  assert.doesNotMatch(idle, /aria-label="Idle"|source-session-dot|data-cds="Pulse"/);
  assert.match(idle, /data-row-label="iconless"/);
  const unread = render({ sessionMetadata: { s1: { unread: true } } });
  assert.match(unread, /<span role="status"[^>]*data-find-omitted=""> Unread response<\/span>/);
  assert.match(unread, /data-row-decoration=""[^>]*group-hover:opacity-0/);
  assert.match(unread, /data-cds="Pulse"[^>]*style="background:var\(--cds-fill-accent\)/);
  const working = render({ state: { active: { s1: 'turn-1' } } });
  assert.match(working, /data-find-omitted=""> Running<\/span>/);
  assert.match(working, /data-cds="Pulse"[^>]*df-tab-dot-running/);
  const archived = render({ sessions: [thread('s1', { archived: true })], sidebarPreferences: { status: 'archived' } });
  assert.doesNotMatch(archived, /data-source-session-id="s1"/);
  assert.match(archived, /data-empty-variant="filtered"/);
  assert.doesNotMatch(archived, /class="source-status-archived"|data-cds="Pulse"/);
  const failed = render({ state: { turnErrors: { s1: { t1: { message: 'boom', codexErrorInfo: 'internalServerError' } } }, items: { s1: [{ id: 'i1', turnId: 't1' }] } } });
  assert.match(failed, /data-find-omitted=""> Server error<\/span>/);
  assert.match(failed, /<span aria-hidden="true" data-cds="Icon" class="text-danger"/);
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  assert.match(css, /\.source-session-row:not\(\.source-current-session-host\)\[data-archived\] \{ color: var\(--cds-text-muted\); opacity: 0\.5; \}/);
  assert.doesNotMatch(css, /\[data-unread\] \.source-session-name/, 'no local unread title colour');
  assert.match(css, /\.source-status-glyph \{ display: flex; min-width: 14px; min-height: 14px;/);
});

test('rows carry the jump-hint attributes; the body is the peek card target', () => {
  const html = render({});
  assert.match(html, /data-source-session-id="s1"[^>]*data-row-key="s1" data-jump-hint-row=""/);
  // ca1d33d05 jt / kt: the F6 "navigation" stop is the aside, or while collapsed the peek card.
  assert.match(html, /<aside [^>]*data-focus-region="navigation" data-focus-region-holds="contains">/);
  assert.match(html, /<div class="dframe-sidebar-body" data-testid="sidebar" id="frame-peek-popover">/);
  const collapsed = render({ collapsed: true });
  assert.doesNotMatch(collapsed, /<aside [^>]*data-focus-region=/);
  assert.match(collapsed, /<div class="dframe-peek-bridge" aria-hidden="true"><\/div>/);
  assert.match(collapsed, /<div class="dframe-sidebar-body" data-testid="sidebar" id="frame-peek-popover" data-focus-region="navigation" data-focus-region-holds="contains" inert="">/);
  assert.match(render({ collapsed: true, peekOpen: true }), /<div class="dframe-sidebar-body" data-testid="sidebar" id="frame-peek-popover" data-focus-region="navigation" data-focus-region-holds="contains">/);
});

test('custom group headers: no DotsVertical trigger, the empty copy invites a drop, Other has no "+"', () => {
  const html = render({ sessions: [thread('s1')], customGroups: [{ id: 'g1', name: 'Research' }], sidebarPreferences: { groupBy: 'custom', showEmptyGroups: true },
    onSessionAction() {}, onGroupAction() {}, onProject() {} });
  assert.doesNotMatch(html, /More options for group/);
  // shared-22 bC (R3-sections layout): the empty manual section's hint is a shiftable row (_Y shiftKey label:hint:{key})
  // while a drag opens a gap above it; the legacy Show empty groups seeded Sessions' show.emptyGroups, so it is listed.
  assert.match(html, /<div class="df-drag-shiftable" data-drag-key="label:hint:custom-g1"><p data-empty-group-hint="" class="df-label-inset [^"]*">Drag or move sessions here<\/p><\/div>/);
  const other = render({ sessions: [thread('s1', { cwd: '/tmp/plain' })], repoIdentities: { '/tmp/plain': { isRepo: false } }, onProject() {}, onSessionAction() {} });
  assert.match(other, /data-group-key="project:__no_project__"><div class="df-drag-shiftable" data-drag-key="label:project:__no_project__"><div data-sidebar-group-label="" data-kind="group"[^>]*><button[^>]*data-group-toggle=""[^>]*><span data-group-name=""[^>]*><span[^>]*>(?:<[^>]+>)*Other</);
  assert.doesNotMatch(other, /New session in Other/);
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  for (const copy of ['>Move up<', '>Move down<', '>Sort A to Z<', '>Rename group<', '>Delete group<', 'label="Rename group"', 'Create and group by custom', '"Create group"', 'The list will switch to Custom groups to show it.'])
    assert.ok(source.includes(copy), copy);
  assert.doesNotMatch(source, />Remove group</);
});

// R01: sidebar-groups.js:17392-17410 / :18560-18590 cI on custom headers with the Dz target (the folder the
// group's sessions share, else none), the 'Added to {group}' tooltip detail and the hover-reveal span.
test('custom group headers get the "+" labelled with the target and the group; Ungrouped and Other get none', () => {
  const html = render({ sessions: [thread('s1'), thread('s2')], sessionMetadata: { s1: { customGroupId: 'g1' } },
    customGroups: [{ id: 'g1', name: 'Research' }, { id: 'g2', name: 'Empty' }], sidebarPreferences: { groupBy: 'custom', showEmptyGroups: true },
    onSessionAction() {}, onGroupAction() {}, onProject() {} });
  assert.match(html, /<span class="source-group-reveal"><button type="button" class="code-icon-button" aria-label="New session in work, added to Research">/);
  assert.match(html, /aria-label="New session with no folder picked, added to Empty"/);
  assert.equal((html.match(/class="source-group-reveal"/g) || []).length, 2, 'one per custom group, none for Ungrouped');
  assert.doesNotMatch(html, /New session in Ungrouped|added to Ungrouped/);
  const plus = html.match(/aria-label="New session in work, added to Research">(.*?)<\/button>/s)[1];
  assert.match(plus, /data-cds="Icon"/);
  // Without a group handler (no Mz 'New session') there is no '+'.
  assert.doesNotMatch(render({ sessions: [thread('s1')], sessionMetadata: { s1: { customGroupId: 'g1' } }, customGroups: [{ id: 'g1', name: 'Research' }],
    sidebarPreferences: { groupBy: 'custom' }, onSessionAction() {} }), /added to Research/);
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  assert.match(css, /\.source-group-reveal \{[^}]*opacity: 0;/);
  assert.match(css, /\.source-session-group:hover \.source-group-reveal,\s*\.source-session-group:focus-within \.source-group-reveal \{ opacity: 1; \}/);
  assert.match(css, /@media \(hover: none\) \{ \.source-group-reveal \{ opacity: 1; \} \}/);
});

test('inline rename keeps the row glyph and selected background; the field is labelled Rename', async () => {
  const { SourceSidebarRenameRow, deleteGroupCopy } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const html = renderToStaticMarkup(React.createElement(SourceSidebarRenameRow, { label: 'Session s1', selected: true,
    glyph: React.createElement('span', { className: 'glyph-probe' }), onCommit() {}, onClose() {} }));
  assert.match(html, /^<div class="source-session-row source-session-rename" data-row="" data-selected="focused"><span class="source-leading-slot"><span class="glyph-probe"><\/span><\/span><input type="text" maxLength="200" aria-label="Rename" class="hide-focus-ring source-session-rename-input" value="Session s1"\/><\/div>$/);
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.css'), 'utf8');
  assert.doesNotMatch(css, /\.source-session-rename \{ box-shadow/);
  assert.deepEqual(deleteGroupCopy('Research', 0), { title: 'Delete group?', body: '“Research” will be removed. Nothing is in it.', confirmLabel: 'Delete', danger: true });
  assert.equal(deleteGroupCopy('Research', 1).body, '“Research” will be removed. The 1 item in it will no longer be grouped.');
  assert.equal(deleteGroupCopy('Research', 3).body, '“Research” will be removed. The 3 items in it will no longer be grouped.');
});

test('row results are toasts, not inline status/error rows', () => {
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  assert.doesNotMatch(source, /className="source-sidebar-(?:status|error)"|data-sidebar-status/);
  assert.match(source, /older \? "older session" : "session"/);
  assert.match(source, /key: older \? `\$\{action\}-older-bulk` : `group-bulk-\$\{action\}`, timeout: 3000/);
});

// B04: shared-21 HQ/YQ load-failed, VQ sticky failure, lK boundary, H0 Show less, tK hover reveal, ce4f4374c ke/Ae.
test('load-failed variant (HQ/YQ): an alert with a small Try again instead of the no-sessions copy; skeleton while loading', () => {
  const failed = render({ sessions: [], loadFailed: true, onRetryLoad() {} });
  assert.match(failed, /<div class="source-sidebar-empty" data-empty-variant="load-failed"><p role="alert" class="source-sidebar-empty-text">Couldn’t load your sessions<\/p><button[^>]*data-cds="Button" data-variant="secondary"[^>]*data-size="sm"[^>]*>.*Try again/s);
  assert.doesNotMatch(failed, /Sessions you start will show up here|sidebar-rows-skeleton/);
  // VQ's state starts {failed: false}: a sidebar that mounts while a load is pending shows the skeleton; the held
  // failure during a Try again on a mounted sidebar is stickyListFailure (tests/sidebar-model.test.mjs).
  const mountedLoading = render({ sessions: [], loadFailed: true, loading: true, onRetryLoad() {} });
  assert.match(mountedLoading, /data-testid="sidebar-rows-skeleton"/);
  assert.doesNotMatch(mountedLoading, /data-empty-variant/);
  // Startup (not settled, not failed): skeleton only; aria-busy on the nav.
  const startup = render({ sessions: [], loading: true });
  assert.match(startup, /data-testid="sidebar-rows-skeleton"/);
  assert.match(startup, /aria-busy="true"/);
  assert.doesNotMatch(startup, /data-empty-variant/);
  // Sessions behind the filters stay "filtered" even when a reload failed (HQ t > 0).
  assert.match(render({ sessions: [thread('s1', { archived: true })], loadFailed: true }), /data-empty-variant="filtered"/);
  // Rows shown: no empty state at all.
  assert.doesNotMatch(render({ loadFailed: true }), /data-empty-variant/);
});

test('sidebar error boundary (lK): "Sidebar failed to load." with a secondary Try again', async () => {
  const { SourceSidebarBoundary } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const boundary = new SourceSidebarBoundary({});
  boundary.state = SourceSidebarBoundary.getDerivedStateFromError(new Error('bad metadata'));
  const html = renderToStaticMarkup(boundary.render());
  assert.match(html, /<aside class="app-sidebar dframe-sidebar source-sidebar cds-root" aria-label="Sidebar"/);
  assert.match(html, /<div class="dframe-sidebar-body source-sidebar-failed" data-testid="sidebar"><p class="source-sidebar-failed-text">Sidebar failed to load\.<\/p><button type="button" data-cds="Button" data-variant="secondary"/);
  assert.match(html, /Try again<\/span>/);
  const ok = renderToStaticMarkup(React.createElement(SourceSidebarBoundary, null, React.createElement('span', null, 'list')));
  assert.equal(ok, '<span>list</span>');
});

test('persisted group collapse (shared-50 collapsedGroups): a folded key hides its rows and reports aria-expanded false', async () => {
  const html = render({ sidebarPreferences: { groupBy: 'project', collapsedGroups: ['project:/fixture/work'] } });
  assert.match(html, /data-group-toggle="" aria-expanded="false"/);
  // R4i-sidebar SI1 (Y1-R3-sidebar2-2): shared-22 bC keeps a folded bucket's rows in its `hidden` container (the session
  // cycle's tm still lists them) instead of the open rows container.
  assert.match(html, /<div class="hidden"><div [^>]*data-source-session-id="s1"/);
  const open = render({ sidebarPreferences: { groupBy: 'project' } });
  assert.match(open, /data-group-toggle="" aria-expanded="true"/);
  assert.match(open, /data-source-session-id="s1"/);
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  // R3-sections: a bucket that is not a section folds in collapsedGroups; a section by its collapsed flag (sidebar-sections-layout test).
  assert.match(source, /else updatePreferences\(toggleCollapsedGroup\(preferencesLive\.current, key\)\);/);
  // R2-sections (D10) moved delete-group out of electron/main.cjs into electron/sidebar-sections-store.mjs: main.cjs
  // delegates the group operations, and the store drops the deleted group's fold key in both forms -- the official
  // um(id) `custom-<id>` (shared-52 deleteCustomGroup `collapsedGroups.filter((e) => e !== um(t))`) and the host's
  // legacy `custom:<id>` -- while every other fold key stays and still folds its group.
  const main = readFileSync(path.resolve(import.meta.dirname, '../electron/main.cjs'), 'utf8');
  assert.match(main, /sidebarSectionsStore\.applySidebarSectionOperation\(config, p, \{/);
  assert.doesNotMatch(main, /p\.operation === "delete-group"/);
  const Store = await import('../electron/sidebar-sections-store.mjs');
  const config = { customGroups: [{ id: 'g1', name: 'Research' }, { id: 'g2', name: 'Platform' }], sessionMetadata: { s1: { customGroupId: 'g1' } },
    threadIds: ['s1'], archivedThreadIds: [], sidebarPreferences: { groupBy: 'project', collapsedGroups: ['custom:g1', 'custom-g1', 'project:/fixture/work', 'custom:g2'] } };
  const mirrored = [];
  const deps = { knownSessionIds: () => new Set(['s1']), mirror: (task) => mirrored.push(task), codexSections: {} };
  assert.equal(Store.applySidebarSectionOperation(config, { operation: 'delete-group', id: 'g1' }, deps), true);
  assert.deepEqual(config.sidebarPreferences.collapsedGroups, ['project:/fixture/work', 'custom:g2']);
  assert.equal(config.sessionMetadata.s1.customGroupId, null);
  assert.equal(mirrored.length, 1, 'the Codex threadSection delete is still mirrored');
  const kept = render({ sidebarPreferences: config.sidebarPreferences });
  assert.match(kept, /data-group-toggle="" aria-expanded="false"/);
  assert.match(kept, /<div class="hidden"><div [^>]*data-source-session-id="s1"/, 'still folded: the row is in the bC hidden container (R4i SI1)');
});

test('Show more / Show less (H0): labels, held state and the status live region', async () => {
  const { SourceShowMoreButton } = await server.ssrLoadModule('/src/source-sidebar.jsx');
  const button = (props) => renderToStaticMarkup(React.createElement(SourceShowMoreButton, { bucketLabel: 'Today', count: 5, onShowMore() {}, onShowLess() {}, ...props }));
  const more = button({});
  assert.match(more, /<button type="button" class="source-show-more" data-row="" data-roving-item="" aria-label="Show 5 more in Today">/);
  // H0 always renders the tooltip wrapper's hidden description (empty unless held) and the S0 status span.
  assert.match(more, /Show 5 more<\/button><span id="[^"]+" hidden=""><\/span><span class="source-sr-only" role="status"><\/span>/);
  const less = button({ fewer: 'collapse' });
  assert.match(less, /aria-label="Show less in Today"/);
  assert.match(less, />Show less<\/button>/);
  assert.doesNotMatch(less, /aria-disabled|data-held/);
  const held = button({ fewer: 'held' });
  assert.match(held, /aria-disabled="true" aria-describedby="([^"]+)" data-held="" aria-label="Show less in Today"/);
  const id = held.match(/aria-describedby="([^"]+)"/)[1];
  assert.ok(held.includes(`<span id="${id}" hidden="">You have something open near the end of this list.</span>`));
  // A whole bucket under the cut renders no button; 22 rows (two past the cut) get Show 2 more.
  const now22 = Array.from({ length: 22 }, (_, index) => thread('r' + index, { updatedAt: now - index }));
  const html = render({ sessions: now22, sidebarPreferences: { groupBy: 'none' } });
  assert.match(html, /aria-label="Show 2 more in Sessions"/);
  assert.equal((render({ sessions: now22.slice(0, 21), sidebarPreferences: { groupBy: 'none' } }).match(/source-show-more/g) || []).length, 0);
});

test('Hide sidebar sits in df-sidebar-hover-reveal (tK); the row menu separates Keep computer awake and shows Unarchiving…', () => {
  const html = render({});
  assert.match(html, /<div class="df-sidebar-hover-reveal flex"><button[^>]*aria-label="Hide sidebar"/);
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/style.css'), 'utf8');
  assert.match(css, /\.sidebar-toolbar > \.df-sidebar-hover-reveal > \.code-icon-button,/);
  const menu = (props) => renderToStaticMarkup(React.createElement(SourceSidebarSessionMenu, { session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, onDelete() {}, ...props }));
  const plain = menu({});
  assert.match(plain, /data-label="Export"[^]*?<\/div><div role="separator" class="smenu-separator"><\/div><div role="group"><div aria-checked="false" data-keep-awake="" role="menuitemcheckbox"/);
  const grouped = menu({ customGroups: [{ id: 'g', name: 'Research' }] });
  assert.match(grouped, /Move to group[^]*<div role="separator" class="smenu-separator"><\/div><div role="group"><div aria-checked="false" data-keep-awake="" role="menuitemcheckbox"/);
  const archived = menu({ session: thread('s1', { archived: true }) });
  assert.match(archived, /data-label="Unarchive"/);
  const pending = menu({ session: thread('s1', { archived: true }), unarchiving: true });
  assert.match(pending, /<div role="menuitem"[^>]*aria-disabled="true"[^>]*data-label="Unarchiving…"/);
  assert.doesNotMatch(pending, /data-label="Unarchive"/);
});

// B04 review: shared-21 Bz/Hz (Show less swallows the rest of a multi-click on the list for 500ms) and shared-22 yS
// (the open session landing in a folded bucket unfolds it through expandGroup).
test('Show less multi-click guard (Bz/Vz) and folded-bucket expand for the open session (yS)', () => {
  const source = readFileSync(path.resolve(import.meta.dirname, '../src/source-sidebar.jsx'), 'utf8');
  assert.match(source, /if \(event\.detail > 0\) guardMultiClick\(500\);/);
  assert.match(source, /onPointerDownCapture=\{swallowGuardedMultiClick\} onMouseDownCapture=\{swallowGuardedMultiClick\}\s+onClickCapture=\{swallowGuardedMultiClick\} onDoubleClickCapture=\{swallowGuardedMultiClick\}/);
  assert.match(source, /event\.nativeEvent\.detail > 1\) \{ event\.stopPropagation\(\); event\.preventDefault\(\); \}/);
  assert.match(source, /previous === undefined \|\| \(openGroupBy === "project" && !group\.customGroupId\)/);
  // R3-sections: a folded section opens by its collapsed flag, a folded bucket in collapsedGroups.
  assert.match(source, /if \(section\?\.collapsed\) useSidebarSectionsStore\.getState\(\)\.setSectionView\(section\.id, \{ collapsed: false \}\);/);
  assert.match(source, /updatePreferences\(expandCollapsedGroup\(preferencesLive\.current, group\.key\)\)/);
});

// B09 (c593f7513 wm Rt → Om k; ce4f4374c De): the title bar's header session menu has no Pin/Move/read state, Move to
// group, nested toggle or Keep computer awake (canPin false, no readState, hideMoveToGroup, keepAwake dropped); the
// settings section (Transcript view) sits between the actions and Archive/Delete, each behind a separator.
test('header session menu (title bar CaretDown) keeps lifecycle items and drops row-only ones', () => {
  const menu = (props) => renderToStaticMarkup(React.createElement(SourceSidebarSessionMenu, { session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, onFork() {}, onDelete() {},
    customGroups: [{ id: 'g', name: 'Research' }], metadata: { pinned: true }, pinnedSiblings: ['s0', 's1', 's2'], nested: { childCount: 2, collapsed: false, onToggle() {} }, ...props }));
  const labels = (html) => [...html.matchAll(/data-label="([^"]+)"/g)].map((match) => match[1]);
  const row = menu({});
  for (const label of ['Move up', 'Move down', 'Unpin', 'Mark as unread', 'Hide nested sessions']) assert.ok(labels(row).includes(label), `row menu has ${label}`);
  assert.match(row, /Move to group/); assert.match(row, /data-keep-awake=""/);
  const header = menu({ header: true, settingsItems: React.createElement('div', { 'data-settings-slot': '' }) });
  assert.deepEqual(labels(header), ['Open in', 'Rename', 'Fork', 'Export', 'Archive', 'Delete']);
  assert.doesNotMatch(header, /Move to group|data-keep-awake|aria-keyshortcuts="p"|aria-keyshortcuts="u"/);
  assert.match(header, /data-label="Fork"[^]*?<div role="separator" class="smenu-separator"><\/div><div role="group"><div data-settings-slot=""><\/div><\/div><div role="separator" class="smenu-separator"><\/div>[^]*data-label="Archive"/);
  // No settings section: one separator above Archive.
  assert.match(menu({ header: true }), /data-label="Fork"[^]*?<\/div><div role="separator" class="smenu-separator"><\/div><div role="group"><div role="menuitem"[^>]*data-label="Archive"/);
});

test('current row menu separates editing, sharing, organization, settings and removal in source order', () => {
  const html = renderToStaticMarkup(React.createElement(SourceSidebarSessionMenu, {
    session: thread('s1'), onAction() {}, onClose() {}, onRename() {}, onFork() {}, onDelete() {},
    metadata: { pinned: true }, pinnedSiblings: ['s0', 's1', 's2'], customGroups: [{ id: 'g', name: 'Research' }],
    shareable: true, nested: { childCount: 1, collapsed: false, onToggle() {} },
  }));
  const sections = html.split('<div role="separator" class="smenu-separator"></div>')
    .map(section => [...section.matchAll(/data-label="([^"]+)"/g)].map(match => match[1]));
  assert.deepEqual(sections, [['Open in'], ['Unpin', 'Mark as unread', 'Rename', 'Fork', 'Hide nested sessions'], ['Share', 'Export'], ['Move up', 'Move down', 'Move to group'], ['Keep computer awake'], ['Archive', 'Delete']]);
});

// B10: ce4f4374c Me (multi menu over c39a247c4 ve) and shared-22 ZO/XO + SS (drag targets in the list).
test('multi menu: Pin / Unpin {count} when some row would change, Set model for {count} with a catalog, p pins first', () => {
  const sessions = [thread('a'), thread('b'), thread('c')];
  const menu = (multi) => renderToStaticMarkup(React.createElement(SourceSidebarSessionMenu, { session: sessions[0], onAction() {}, onClose() {}, onRename() {},
    customGroups: [{ id: 'g', name: 'Research' }], onCreateGroup() {}, multi: { count: 3, sessions, onBulk() {}, ...multi } }));
  const labels = (html) => [...html.matchAll(/data-label="([^"]+)"/g)].map((match) => match[1]);
  const both = menu({ pin: { count: 2, sessions: sessions.slice(1) }, unpin: { count: 1, sessions: sessions.slice(0, 1) }, models: [{ id: 'm1', name: 'Model One' }] });
  assert.deepEqual(labels(both), ['Pin 2', 'Unpin 1', 'Mark 3 as unread', 'Move 3 to group', 'Set model for 3', 'Archive 3', 'Delete 3']);
  assert.match(both, /aria-keyshortcuts="p" data-label="Pin 2"/);
  assert.doesNotMatch(both, /aria-keyshortcuts="p" data-label="Unpin 1"/, 'Unpin keeps no p while Pin has it');
  const unpinOnly = menu({ unpin: { count: 3, sessions }, models: [] });
  assert.deepEqual(labels(unpinOnly), ['Unpin 3', 'Mark 3 as unread', 'Move 3 to group', 'Archive 3', 'Delete 3'], 'no Set model without a catalog (Ne f.length === 0)');
  assert.match(unpinOnly, /aria-keyshortcuts="p" data-label="Unpin 3"/);
});

test('drag targets: an empty Pinned stub, custom sections as group drop zones, shiftable rows', () => {
  const html = render({ onSessionAction() {}, sidebarPreferences: { groupBy: 'custom' }, customGroups: [{ id: 'g1', name: 'Research' }],
    sessions: [thread('s1'), thread('s2')], sessionMetadata: { s2: { customGroupId: 'g1' } } });
  assert.match(html, /<section class="source-pinned-drop df-pin-section-reveal" data-pinned-list="" data-stub="" inert="">/);
  assert.match(html, /data-pinned-drop-row=""[^]*?Drag to pin/);
  // R3-sections: a manual section is a group list (bC groupListId); the sections layout has no Ungrouped drop zone
  // (oO passes its id, Sessions none: research/sidebar-sections.md §1.4).
  assert.match(html, /data-group-key="custom-g1" data-group-list="g1" data-group-label="Research"/);
  assert.doesNotMatch(html, /data-group-list=""|Ungrouped/);
  assert.match(html, /class="source-group-drop-band pointer-events-none absolute inset-x-0 rounded-lg/);
  assert.match(html, /data-source-session-id="s1"[^>]*data-drag-key="s1"/);
  assert.doesNotMatch(html, /draggable="true"/, 'rows are pointer drags, never native drags');
  const pinned = render({ onSessionAction() {}, sessions: [thread('s1')], sessionMetadata: { s1: { pinned: true } } });
  assert.doesNotMatch(pinned, /source-pinned-drop/, 'no stub once something is pinned');
  assert.match(pinned, /data-group-key="pinned" data-pinned-list=""/);
  assert.match(pinned, /data-group-rows="" data-pinned-rows=""/);
  assert.doesNotMatch(render({ sessions: [thread('s1')] }), /source-pinned-drop/, 'no drop targets without session actions');
});
