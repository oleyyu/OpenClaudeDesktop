// w13-close-chat-surface (plan-w13-closeout §0c): E73 the Chat chin has no "Project or folder" picker, E74 /chats is one
// Tasks list of Chat and Cowork sessions while Cowork is available, E75 a local chat in the multi-selection is a
// cowork-source session with sessionType "chat", E77 the stale image-limit comment. Every check pins the official
// 3.6556.2 raw text (parsed as text, never executed) next to the host model, markup or source it constrains.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { chatsPageRows, chatsSelectionTargets, TASKS_PAGE_MESSAGES, runTasksBulk, tasksBulkToasts, tasksMoveToast,
  tasksSearchAnnouncement, TASKS_SEARCH_ANNOUNCE_DELAY_MS } from '../src/chats-page-model.mjs';
import { hubBulkRow, hubBulkActions, hubBulkMenuEntries } from '../src/hub-sidebar-model.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';

const app = path.resolve(import.meta.dirname, '..');
const read = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const src = name => fs.readFileSync(path.join(app, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const enUS = JSON.parse(fs.readFileSync(path.join(ionSource, '../../i18n/en-US.json'), 'utf8'));
const shared8 = read('shared-8-Db1QN4mf.js'), shared78 = read('shared-78-D5Fw2h0a.js'), shared18 = read('shared-18-D3y8YMFN.js'),
  shared52 = read('shared-52-uHFNjl7C.js'), shared11 = read('shared-11-_AVGLHEz.js'), shared21 = read('shared-21-R7LldJ05.js'),
  page = read('c623cddd3-C9tp6cLn.js'), bulk = read('c44373cde-CAOQ4vZq.js');

let server, Composer, Page, intl, Shell, I18n;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()],
    server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Shell = await server.ssrLoadModule('/src/source-incognito-shell.jsx'); // E77 incognito shell (复核修复)
  I18n = await server.ssrLoadModule('/electron/i18n/index.mjs');
  Composer = await server.ssrLoadModule('/src/source-chat-composer.jsx');
  Page = await server.ssrLoadModule('/src/source-chats-page.jsx');
  intl = (await server.ssrLoadModule('/src/source-code-start-adapters.jsx')).createStartIntl('en-US');
});
after(() => server?.close());

// ---------------------------------------------------------------- E73

const noop = () => {};
const Input = ({ inputRef, ...rest }) => React.createElement('div', rest);
const renderComposer = props => renderToStaticMarkup(React.createElement(Composer.SourceChatComposer, {
  editorNode: React.createElement(Input, { className: 'sc-input', contentEditable: true, placeholder: 'How can I help you today?' }),
  draft: '', scope: 'chat:fixture', mode: 'chat', onMenu: noop, onStop: noop, onFolder: noop,
  disabled: false, busy: false, sending: false, canSend: false, showStop: false,
  model: { model: 'fixture', displayName: 'Fixture' }, permission: 'ask', workdir: '/tmp/fixture', folderLabel: 'Research notebook', ...props }));
const chinLabels = html => [...html.slice(html.indexOf('data-cds="ChatComposerChin"')).matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map(m => m[1]);

test('E73 official: shared-8 yP is "disabled" without unifiedComposerDesign; jZ\'s chin lead needs a local session', () => {
  // yP: `s = e !== null && a` (a = unifiedComposerDesign), `v = s && (…)`; the "projects" / "enabled" answers sit under v.
  assert.equal(count(shared8, 's=e!==null&&a,c=Pp()'), 1);
  assert.equal(count(shared8, 'v=s&&(!t||g||l),y=hP(v)'), 1);
  // shared-23 WC's chorusUnifiedComposerDesign reads GrowthBook voyage_composer_marlin, off by D29 / R15.
  assert.equal(count(shared78, 'bp="voyage_composer_marlin"'), 1);
  // jZ's leading F is the session picker only on a local agent route with a session id.
  assert.equal(count(shared8, 'M=p&&!!m&&!x&&!l'), 1);
});

test('E73: the Chat chin leads with nothing on a new chat; Cowork keeps "Project or folder"; replies keep Add', () => {
  const chat = renderComposer({});
  assert.deepEqual(chinLabels(chat), ['Model: Fixture']);
  assert.doesNotMatch(chat, /surface-folder-trigger|Research notebook/);
  assert.deepEqual(chinLabels(renderComposer({ mode: 'cowork' })), ['Project or folder', 'Model: Fixture', 'Permission mode']);
  assert.match(renderComposer({ mode: 'cowork' }), /Research notebook/);
  assert.deepEqual(chinLabels(renderComposer({ current: 'thread-1' })), ['Add files, connectors, and more', 'Model: Fixture']);
  const host = src('src/source-chat-composer.jsx');
  assert.equal(count(host, "const leading = mode === 'cowork' && <Button"), 1);
});

test('E73: a Chat session\'s folder still comes from the surface default and a project chat\'s from its project', () => {
  const main = src('electron/main.cjs');
  // surface-workspace: the saved surface folder, else userData/workspaces/<surface> (the default the chin no longer picks).
  // W13 closeout (E73): the window grew by the chat-ignores-saved-folder comment and condition.
  assert.match(main, /case "surface-workspace": \{[\s\S]{0,700}path\.join\(app\.getPath\('userData'\), 'workspaces', p\.surface\)/);
  // A project chat's thread/start takes the project's folder in the main process.
  assert.match(src('electron/local-projects.mjs'), /if \(method === 'thread\/start' && surface === 'chat' && typeof project\.cwd === 'string' && path\.isAbsolute\(project\.cwd\)\) params\.cwd = project\.cwd;/);
  // The renderer seeds a Chat draft from that default (switchMode / openLocalProject / setProjectComposerMode).
  assert.ok(count(src('src/main.jsx'), "(await call('surface-workspace', { surface: 'chat' })).cwd") >= 1);
});

// ---------------------------------------------------------------- E74

const metadata = { a: { surface: 'chat' }, b: { surface: 'cowork' }, c: { surface: 'cowork', scheduledTaskId: 'routine-1' },
  d: { surface: 'code' }, e: { surface: 'cowork' } };
const sessions = [
  { id: 'a', name: 'Trip chat', updatedAt: 300 },
  { id: 'b', name: 'Trip task', updatedAt: 200 },
  { id: 'c', name: 'Scheduled run', updatedAt: 400 },
  { id: 'd', name: 'Code session', updatedAt: 500 },
  { id: 'e', name: 'Old task', updatedAt: 100, archived: true },
];

test('E74 official: Cowork folds the chat surface into cowork, /chats is H, H lists every cowork-source session', () => {
  // shared-78 mY (desktop): with Cowork available the "chat" surface becomes part of "cowork".
  assert.equal(count(shared78, 'u.includes("chat")&&(a||!s||c||l||f||p||h)){_=i(["cowork",...u.filter(hY)]);'), 1);
  assert.equal(count(shared78, 'function hY(e){return e!=="chat"&&e!=="cowork"}'), 1);
  // shared-18 aR renders iR (ChatsPageClient) whenever `as()`; as = shared-78 gK, whose selector answers true.
  assert.equal(count(shared18, 'iR=bh(Sh,e=>Dh(e,"ChatsPageClient"),xh,{revealWhenInputsFinal:!0})'), 1);
  assert.equal(count(shared18, 'function aR(){let $=J9(2);return as()?J0($,0)?K0($,0,m(iR,{})):$[0]'), 1);
  assert.equal(count(shared78, 'function gK(){let $=J9(5),e=A(),t=iK(),n=hK(),r=Ki(),i=J4($,0,r,t,e,n)?K4($,0,r,t,e,n,e=>!0):$[4];return it(i)}'), 1);
  // H's list: every cowork-source session (chats kept), minus scheduled runs and dispatch children.
  assert.equal(count(page, 'includeArchivedCowork:!0,keepSessionsOpenedAsChats:!0'), 1);
  assert.equal(count(page, 'function Te(e){return e.ref.kind==="cowork"&&!N(e)}'), 1);
  assert.equal(count(shared11, 'function hw(e){return e.source.kind==="cowork"&&ht(e.source.data)}'), 1);
  assert.equal(count(shared52, 'function $O(e){return!!e.scheduledTaskId||ZO(e)}'), 1);
  // No server condition: gv's "in one list" tour copy is defined and never read.
  assert.equal(count(shared78, 'tourOneListTitle:'), 2);
  for (const file of fs.readdirSync(ionSource).filter(name => name.endsWith('.js'))) assert.equal(count(read(file), '.tourOneListTitle'), 0, file);
});

test('E74 model: merged rows are Chat and Cowork sessions (no scheduled runs, no Code), chats not archivable', () => {
  const merged = chatsPageRows(sessions, { metadata, merged: true });
  assert.deepEqual(merged.map(row => [row.ref.id, row.ref.kind, row.sessionType]), [['a', 'cowork', 'chat'], ['b', 'cowork', 'cowork'], ['e', 'cowork', 'cowork']]);
  assert.deepEqual(chatsPageRows(sessions, { metadata }).map(row => row.ref.id), ['a'], 'Cowork off: the chat list');
  const byId = new Map(merged.map(row => [row.ref.id, row]));
  // H `Y`: cowork-source, not archived, sessionType !== "chat".
  assert.equal(count(page, 't?.source.kind==="cowork"&&!M(t)&&t.source.data.sessionType!=="chat"'), 1);
  assert.deepEqual(chatsSelectionTargets(['a', 'b', 'e'], byId), { archivable: ['b'], movable: ['b'] });
});

test('E74 copy: every task string is H\'s en-US text with its id, and zh-CN has each', () => {
  for (const [key, message] of Object.entries(TASKS_PAGE_MESSAGES)) {
    assert.equal(enUS[message.id], message.defaultMessage, key);
    assert.ok(zh[message.defaultMessage], `zh-CN ${key}`);
  }
  for (const needle of ['defaultMessage:"Tasks",id:"yhU1etXT1A"', 'defaultMessage:"Search tasks...",id:"w0NtlmPvm/"', 'defaultMessage:"Select tasks",id:"J1sUqyavtv"',
    'href:"/task/new",className:"df-link-card"', 'defaultMessage:"Archive selected tasks?",id:"eu9uwxVr58"', 'defaultMessage:"Delete selected tasks?",id:"zJ+lw+0q5+"',
    'defaultMessage:"No projects yet.",id:"TqmgGJ+28h"'])
    assert.ok(count(page, needle) >= 1, needle);
});

test('E74 bulk: H Ke counts fulfilled runs, explained ones neither way, and exits when nothing is left', async () => {
  const byId = new Map(['b', 'e', 'x'].map(id => [id, { hostSession: { id } }]));
  const outcome = await runTasksBulk(['b', 'e', 'x'], session => (session.id === 'e' ? false : session.id === 'x' ? Promise.reject(new Error('busy')) : true), byId);
  assert.deepEqual(outcome, { done: ['b'], notDone: ['e', 'x'], explained: ['e'], exit: false });
  assert.deepEqual(tasksBulkToasts(outcome, 'archive', intl), [{ message: '1 task archived', variant: 'neutral' }, { message: '1 task could not be archived.', variant: 'danger' }]);
  assert.equal((await runTasksBulk(['b'], () => true, byId)).exit, true);
  assert.deepEqual(tasksMoveToast({ moved: 2, skipped: 0, targetName: 'Lab' }, intl), { message: 'Moved 2 to Lab', variant: 'neutral' });
  assert.equal(tasksMoveToast({ moved: 0, skipped: 1, targetName: 'Lab' }, intl).variant, 'danger');
  assert.equal(tasksSearchAnnouncement(2, 'trip', intl), '2 tasks matching “trip”');
  assert.equal(tasksSearchAnnouncement(0, 'trip', intl), 'No tasks match “trip”');
  assert.equal(TASKS_SEARCH_ANNOUNCE_DELAY_MS, 500);
});

// The table reads its row selection with useSyncExternalStore and no server snapshot (as tests/w13-chats-page.test.mjs).
const renderPage = props => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, sv) => d.useSyncExternalStore(s, g, sv ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderToStaticMarkup(React.createElement(Page.SourceChatsPage, props)); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};

test('E74 page: merged is H with the task copy over Chat and Cowork rows; Cowork off keeps the Chats page', () => {
  const html = renderPage({ sessions, metadata, merged: true, onDelete: noop, onArchive: noop, onMoveToProject: noop, projects: [], pendingPermissionsOf: id => (id === 'b' ? 2 : 0) });
  for (const text of ['Tasks', 'Select tasks', 'New task', 'Trip chat', 'Trip task', '2 permissions']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Scheduled run|Code session|Old task/, 'scheduled runs, Code and (Active filter) archived rows stay out');
  assert.match(html, /data-surface="cowork"/);
  const chats = renderPage({ sessions, metadata, onDelete: noop });
  assert.ok(chats.includes('Chats') && chats.includes('New chat') && !chats.includes('Trip task'));
  const empty = renderPage({ sessions: [], metadata, merged: true });
  assert.ok(empty.includes('No active tasks.'));
});

test('E74 main.jsx: the Cowork rail views all, the sessions page serves both surfaces and merges while Cowork is listed', () => {
  const main = src('src/main.jsx');
  assert.equal(count(main, 'onViewAllSessions={mode === "code" || mode === "chat" || mode === "cowork" ? showSessionsPage : undefined'), 1);
  assert.equal(count(main, "section === 'sessions' && (mode === 'chat' || mode === 'cowork') ? <SourceChatsPage "), 1);
  assert.equal(count(main, 'merged={coworkSurfaceListed()} projects={boot?.config?.localProjects ?? []}'), 1);
  assert.equal(count(main, 'onArchive={session => sessionAction("archive", session)}'), 1);
  assert.equal(count(main, 'onMoveToProject={(id, projectId) => sessionAction("move-to-project", { id }, { projectId })}'), 1);
});

// ---------------------------------------------------------------- E75

test('E75: a local chat is c44373cde Fe\'s cowork branch with sessionType "chat" (no Archive, the tasks delete)', () => {
  assert.equal(count(bulk, 'else if(r.kind==="cowork"){let{sessionType:e,isArchived:t}=r.data;s=!0,c=e!=="chat"&&!t}'), 1);
  const rows = [hubBulkRow({ id: 'a', sessionType: 'chat' }), hubBulkRow({ id: 'b', sessionType: 'cowork' })];
  const actions = hubBulkActions(rows);
  assert.deepEqual(actions.archive, [], 'a chat in the selection: no Archive for the selection');
  const entries = hubBulkMenuEntries(actions);
  assert.equal(entries.find(entry => entry.action === 'delete').testId, 'bulk-delete-tasks-trigger');
  assert.equal(hubBulkMenuEntries(hubBulkActions([rows[1]])).find(entry => entry.action === 'archive').count, 1);
  // The type comes from the session, not from the rail (the merged Cowork rail lists chats too).
  const sidebar = src('src/source-sidebar.jsx');
  assert.equal(count(sidebar, 'sessionType: sessionMetadata[session.id]?.surface === "chat" ? "chat" : "cowork" }) }));'), 1);
  assert.equal(count(sidebar, 'sessionType: mode === "chat" ? "chat" : "cowork"'), 0);
});

test('E75 reference: 3.6556.2 keeps local rows out of multi-selection (shared-21 m7 = !1), recorded for the ruling', () => {
  // Le only takes a cowork-source row when Se() (shared-21 x7 → m7) is true; m7 is the constant false and is never set,
  // and the row-key reader answers null for cowork keys (S7). The host keeps its Chat / Cowork multi-select (E75 picks the
  // cowork branch); this pins the evidence the report hands back to the main agent.
  assert.equal(count(bulk, 'Te(e,{markedTemporary:O(e.ref.id)})&&(o||e.source.kind==="chat")'), 1);
  assert.equal(count(bulk, 'onCoworkRail:x()==="cowork",serverChatMarkRead:_e()},o=Se()'), 1);
  assert.equal(count(shared21, 'var m7=!1,h7="data-multiselect-row"'), 1);
  assert.equal(count(shared21, 'm7='), 1);
  assert.equal(count(shared21, 'function x7(){return m7}'), 1);
  assert.equal(count(shared21, 'case"cowork":return S7()?"cowork":null'), 1);
});

// ---------------------------------------------------------------- E77

test('E77: the image-limit comment names the composer band, not a toast', () => {
  const main = src('src/main.jsx');
  assert.equal(count(main, 'the official composer card is a toast here'), 0);
  assert.equal(count(main, "says so once per conversation and state (shared-7 Cv; the composer band below, ChatImageLimitNotice)."), 1);
});

// ---------------------------------------------------------------- E77 incognito shell (复核修复)

const shared20 = read('shared-20-mUr7IqZY.js'), shared23 = read('shared-23-BZ6ZY5fu.js');

test('E77 official: vK unmounts the frame shell while incognito; VA adds a 48px Fy row; LA pads with vA(); Jy frames', () => {
  for (const [text, needle] of [
    [shared78, 'function vK(e){let{isIncognito:t,isInIframe:n}=e,r=gK(),i=dK(yK);return r&&!t&&!n&&!i}'],
    [shared78, 'K4($,0,r,t,e,n,e=>!0)'],
    [shared78, 'incognito:{defaultMessage:"Incognito chat",id:"MZWV60Fq3N"}'],
    [shared23, 'function vA(){return`calc(${gc()?50:48}px - var(--desktop-top-bar-row-height, 0px)) 8px 8px`}'],
    [shared23, 'function yA(e){return e&&gc()?"overflow-y-auto":"overflow-y-auto [scrollbar-gutter:stable]"}'],
    [shared23, 'n?vA():0'],
    [shared23, 'E=n&&!l&&(!d||r),D=d&&!m,O=D?48:45'],
    [shared23, 'M=E?`${O}px 1fr`:"0px 1fr",N=E?`${O}px`:"0px"'],
    [shared23, 'gridTemplateRows:M,"--desktop-top-bar-row-height":N'],
    [shared20, '"data-testid":"incognito-frame",className:"animate-incognito-frame-in pointer-events-none fixed inset-[50px_8px_8px_8px] rounded-2xl shadow-[0_0_0_100px_var(--cds-text-primary)]",style:{top:`calc(50px + ${qy})`,clipPath:"inset(-50px -100px -100px)",zIndex:m,...au}'],
    [shared20, 'qy="var(--app-top-offset, 0px)"'],
    [shared20, 'E=V(T?30:20)'],
    [shared20, '!T&&c(l,{children:[i(D,'],
    [shared20, 'n("flex items-center draggable","px-2",j,M)'],
    [shared20, 'k&&!A&&i("div",{className:"w-[69px] shrink-0"})'],
    [shared20, 'className:"flex items-center gap-2 text-bg-000",children:[i(Ud,{today:i(xy,{})}),i("span",{className:"text-sm select-none",children:i(X,{...u.incognito})})]'],
    [shared20, 'b=t?d:u'],
    [shared20, 'i(ne,{mode:b,className:"contents",children:x})'],
  ]) assert.equal(count(text, needle), 1, needle);
  // Every class the shell draws is in the loaded official sheet.
  const css = fs.readFileSync(path.join(ionSource, 'c6a992d55-Che1orl5.css'), 'utf8');
  for (const selector of ['.animate-incognito-frame-in{', '.inset-\\[50px_8px_8px_8px\\]{', '.shadow-\\[0_0_0_100px_var\\(--cds-text-primary\\)\\]{',
    '.text-bg-000{', '.w-\\[69px\\]{', '.\\[scrollbar-gutter\\:stable\\]{', '.overflow-x-clip{', '.draggable{', '.rounded-2xl{'])
    assert.ok(css.includes(selector), selector);
});

test('E77 shell: inactive it is display: contents only; active it is VA\'s grid, Fy\'s row, LA\'s padding and Jy\'s frame', () => {
  const h = React.createElement;
  const off = renderToStaticMarkup(h(Shell.SourceIncognitoShell, { active: false, onExit: noop }, h('main', { className: 'workspace' })));
  assert.equal(off, '<div class="contents"><div class="contents"><div class="contents"><main class="workspace"></main></div></div></div>');
  const on = renderToStaticMarkup(h(Shell.SourceIncognitoShell, { active: true, onExit: noop, trafficLights: true }, h('main', { className: 'workspace' })));
  assert.ok(on.startsWith('<div class="grid w-full overflow-hidden" style="height:100%;grid-template-rows:48px 1fr;--desktop-top-bar-row-height:48px">'));
  assert.match(on, /<div class="flex items-center draggable px-2" style="z-index:30"[^>]*><div class="flex-1 flex items-center gap-1"><div class="w-\[69px\] shrink-0"><\/div><\/div>/);
  assert.match(on, /<div class="flex items-center gap-2 text-bg-000"><div class="group"[^>]*><svg[^>]*viewBox="0 0 20 20"[^>]*>.*?<\/svg><\/div><span class="text-sm select-none">Incognito chat<\/span><\/div>/);
  assert.match(on, /<div class="flex-1 flex items-center justify-end"><div class="cds-root text-primary contents"[^>]*data-mode="dark"[^>]*>.*?aria-label="Exit incognito"/);
  assert.match(on, /<div class="flex min-h-0 min-w-0 w-full overflow-x-clip relative overflow-y-auto \[scrollbar-gutter:stable\] print:!overflow-visible"><div class="w-full relative min-w-0 h-full print:!h-auto" style="padding:calc\(48px - var\(--desktop-top-bar-row-height, 0px\)\) 8px 8px"><main class="workspace"><\/main><\/div><div data-testid="incognito-frame"/);
  assert.match(on, /data-testid="incognito-frame" class="animate-incognito-frame-in pointer-events-none fixed inset-\[50px_8px_8px_8px\] rounded-2xl shadow-\[0_0_0_100px_var\(--cds-text-primary\)\]" style="top:calc\(50px \+ var\(--app-top-offset, 0px\)\);clip-path:inset\(-50px -100px -100px\);z-index:20;opacity:1"/);
  assert.doesNotMatch(renderToStaticMarkup(h(Shell.SourceIncognitoShell, { active: true, onExit: noop, trafficLights: false }, null)), /w-\[69px\]/);
});

test('E77 Qg: the Exit X sits in a CdsRoot of the opposite mode, ghost iconOnly, group draggable-none; zh label', () => {
  const h = React.createElement;
  assert.equal(Shell.incognitoToggleMode(true, 'light'), 'dark');
  assert.equal(Shell.incognitoToggleMode(true, 'dark'), 'light');
  assert.equal(Shell.incognitoToggleMode(false, 'dark'), 'dark');
  const dark = renderToStaticMarkup(h(Shell.SourceExitIncognito, { onToggle: noop, className: 'draggable-none', mode: 'dark' }));
  assert.match(dark, /^<div class="cds-root text-primary contents"[^>]*data-mode="light"/);
  const button = dark.match(/<button[^>]*aria-label="Exit incognito"[^>]*>/)?.[0];
  assert.ok(button);
  assert.match(button, /class="[^"]*\bgroup draggable-none\b/);
  assert.equal(Shell.frameShellMounted({ isIncognito: true }), false);
  assert.equal(Shell.frameShellMounted({ isIncognito: false }), true);
  I18n.setLocale('zh-CN');
  try {
    const zhBar = renderToStaticMarkup(h(Shell.SourceIncognitoTopBar, { onExit: noop, mode: 'light' }));
    assert.match(zhBar, /aria-label="退出无痕模式"/);
    assert.match(zhBar, /<span class="text-sm select-none">无痕聊天<\/span>/);
  } finally { I18n.setLocale('en-US'); }
});

test('E77 main.jsx: the shell wraps the workspace, unmounts the sidebar and the collapsed frame, and takes the Exit X', () => {
  const main = src('src/main.jsx');
  assert.equal(count(main, 'import { SourceIncognitoShell, frameShellMounted } from "./source-incognito-shell.jsx";'), 1);
  assert.equal(count(main, 'const incognitoShell = incognitoActive && side === 0 && !NO_SIDEBAR;'), 1);
  assert.equal(count(main, '{side === 0 && !NO_SIDEBAR && frameShellMounted({ isIncognito: incognitoShell }) && <SourceSidebarBoundary>'), 1);
  assert.equal(count(main, 'data-collapsed={effectiveCollapsed && !NO_SIDEBAR && frameShellMounted({ isIncognito: incognitoShell }) || undefined}'), 1);
  const open = main.indexOf('<SourceIncognitoShell active={incognitoShell} onExit={() => incognitoKey.current?.()} trafficLights={isMacPlatform() && !fullScreen}>');
  assert.ok(open > 0);
  assert.ok(open < main.indexOf('<SourceSplitHost side={side}>') && main.indexOf('</SourceSplitHost>\n      </SourceIncognitoShell>') > open);
  assert.equal(count(main, 'onExitIncognito={incognitoActive && !incognitoShell ? () => incognitoKey.current?.() : undefined'), 1);
});
