// w13-chatui-chats-page (chatui-S3 / S5 / S6): the Chat mode Chats page. Each check pins the official 3.6556.2 raw
// text (c623cddd3 H = ChatsPageClient, cbd6c85c8 Hf's chat strings, shared-11 OE / EE, shared-78 gv) and the model or
// markup the host produces.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup as renderServerMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import { chatsPageRows, filterChatsPageRows, searchChatsPageRows, chatsSelectionTargets, chatDeleteDialogCopy, deleteChats,
  chatDeleteOutcomeToasts, selectionAfterRemoval, chatsPageHref, chatIdFromPageHref, CHATS_PAGE_FILTERS, CHATS_PAGE_DEFAULT_FILTER,
  CHATS_SEARCH_OPTIONS, CHATS_SEARCH_KEYS } from '../src/chats-page-model.mjs';

const root = new URL('..', import.meta.url).pathname;
const read = name => fs.readFileSync(path.join(ionSource, name), 'utf8');
const page = read('c623cddd3-C9tp6cLn.js'), hf = read('cbd6c85c8-D1xuycDy.js'), shared11 = read('shared-11-_AVGLHEz.js'),
  shared78 = read('shared-78-D5Fw2h0a.js'), fuzzy = read('c2b74c150-BZSQ8_Os.js'), palette = read('c2771e1f6-C1UCZLNP.js'), shared21 = read('shared-21-R7LldJ05.js');
const enUS = JSON.parse(fs.readFileSync(path.join(ionSource, '../../i18n/en-US.json'), 'utf8'));
const count = (text, needle) => text.split(needle).length - 1;
const src = name => fs.readFileSync(path.join(root, name), 'utf8');

const now = Date.UTC(2026, 9, 28, 12);
const metadata = { a: { surface: 'chat' }, b: { surface: 'chat' }, c: { surface: 'cowork' }, z: { surface: 'chat' } };
const sessions = [
  { id: 'a', name: 'Trip planning', preview: 'hotels in Kyoto', updatedAt: now / 1000 - 60 },
  { id: 'b', name: 'Recipe ideas', preview: 'a pasta for a trip', updatedAt: now / 1000 - 120, archived: true },
  { id: 'c', name: 'Trip cowork task', updatedAt: now / 1000 },
  { id: 'd', name: 'Trip code session', updatedAt: now / 1000 },
  { id: 'a', name: 'duplicate', updatedAt: 1 },
];
let intl, messages;

let server, Host, Sidebar;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  Host = await server.ssrLoadModule('/src/source-chats-page.jsx');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  intl = (await server.ssrLoadModule('/src/source-code-start-adapters.jsx')).createStartIntl('en-US');
  // shared-78 Sv is a hook (useHubLook reads a context): read gv the way the page does, inside a render.
  const { sidebarMessages } = await server.ssrLoadModule('/src/generated/sessions-page/pure-shared-78.mjs');
  renderServerMarkup(React.createElement(function Capture() { messages = sidebarMessages(); return null; }));
});
after(() => server?.close());
// The table reads its row selection with useSyncExternalStore and no server snapshot (client-only); read it the way a
// client's first render does (as tests/sessions-page-render.test.mjs).
const render = (Component, props) => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, sv) => d.useSyncExternalStore(s, g, sv ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderServerMarkup(React.createElement(Component, props)); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};

test('official: the chats route renders c623cddd3 H (ChatsPageClient) and the chat copy lives in shared-78 gv', () => {
  assert.equal(count(page, 'export{De as ChatsPageClient,Oe as RecentsRoute}'), 1);
  for (const needle of ['deleteTitle:{defaultMessage:"Delete chat?",id:"M16o5rLckO"}',
    'deleteTitleCount:{defaultMessage:"Delete {count, plural, one {# chat} other {# chats}}?",id:"u4UvexeGcg"}',
    'deleteBody:{defaultMessage:"Are you sure you want to delete this chat?",id:"eoF+zSJr4t"}',
    'deleted:{defaultMessage:"Chat deleted",id:"jw4hjzNcgG"}',
    'newConversation:{defaultMessage:"New chat",id:"bvVb6lsJ6+"}',
    'conversationsTab:{defaultMessage:"{kind, select, tasks {Tasks} chats {Chats} other {Chats and tasks}}",id:"vyCOis6eKd"}'])
    assert.equal(count(shared78, needle), 1, needle);
  // The generated slice carries the same table (only imported here, sessions-page owns it).
  assert.equal(messages.deleteTitle.defaultMessage, 'Delete chat?');
  assert.equal(messages.deleteTitleCount.id, 'u4UvexeGcg');
});

test('rows: Chat sessions only, once each, newest first; the Active / Archived / All filter (H xe, `_ !== "all"`)', () => {
  assert.equal(count(page, 'var xe="active"'), 1);
  assert.equal(count(page, 'if(B=ie.filter(Te),_!=="all"){let e=_==="archived"'), 1);
  assert.deepEqual(CHATS_PAGE_FILTERS, ['active', 'archived', 'all']);
  assert.equal(CHATS_PAGE_DEFAULT_FILTER, 'active');
  const rows = chatsPageRows(sessions, { metadata });
  assert.deepEqual(rows.map(row => row.ref.id), ['a', 'b']);
  assert.deepEqual(rows[0].ref, { kind: 'chat', id: 'a' });
  assert.equal(rows[0].summary, 'hotels in Kyoto');
  assert.deepEqual(filterChatsPageRows(rows, 'active').map(row => row.ref.id), ['a']);
  assert.deepEqual(filterChatsPageRows(rows, 'archived').map(row => row.ref.id), ['b']);
  assert.deepEqual(filterChatsPageRows(rows, 'all').map(row => row.ref.id), ['a', 'b']);
});

test('search: H be over title 0.7 / summary 0.3 with c2b74c150 {threshold:.35}; an empty query lists every row', () => {
  assert.equal(count(page, '[{name:"title",weight:.7},{name:"summary",weight:.3}],L'), 1);
  assert.equal(count(fuzzy, 'var i={threshold:.35}'), 1);
  assert.equal(count(fuzzy, 'threshold:i?.threshold??.2,ignoreLocation:!0,includeScore:!0,includeMatches:!0,minMatchCharLength:1,shouldSort:!0'), 1);
  assert.deepEqual(CHATS_SEARCH_OPTIONS, { threshold: 0.35 });
  assert.deepEqual(CHATS_SEARCH_KEYS, [{ name: 'title', weight: 0.7 }, { name: 'summary', weight: 0.3 }]);
  const rows = chatsPageRows(sessions, { metadata });
  assert.deepEqual(searchChatsPageRows(rows, '  ').map(row => row.ref.id), ['a', 'b']);
  // A title starting with the query sorts first; the summary match follows.
  assert.deepEqual(searchChatsPageRows(rows, 'trip').map(row => row.ref.id), ['a', 'b']);
  assert.deepEqual(searchChatsPageRows(rows, 'recipe').map(row => row.ref.id), ['b']);
  assert.deepEqual(searchChatsPageRows(rows, 'zzzzqqq'), []);
});

test('search: the generated c2b74c150 `a` runs, since code-routines keeps c145fa5ca\'s Fuse statics (Q.config=D)', async () => {
  const fuse = read('c145fa5ca-_OVos244.js');
  assert.equal(count(fuse, ';Q.version="7.4.0",Q.createIndex=A,Q.parseIndex=j,Q.config=D,'), 1);
  const generated = src('src/generated/code-routines/c145fa5ca-_OVos244.mjs');
  assert.match(generated, /\(Q\.config = D\),/);
  assert.match(generated, /\(Q\.version = "7\.4\.0"\),/);
  const model = src('src/chats-page-model.mjs');
  assert.match(model, /import \{ a as createFuzzySearch \} from '\.\/generated\/code-routines\/c2b74c150-BZSQ8_Os\.mjs';/);
  assert.doesNotMatch(model, /fuseDefaults|c145fa5ca-_OVos244\.mjs'/);
  const { a } = await import('../src/generated/code-routines/c2b74c150-BZSQ8_Os.mjs');
  const hits = a([{ title: 'Trip planning' }, { title: 'Recipe' }], ['title'], { threshold: 0.35 }).search('trip');
  assert.deepEqual(hits.map(hit => hit.item.title), ['Trip planning']);
});

test('selection: chat rows are neither archivable nor movable (H `Y`: cowork, not archived, sessionType !== "chat")', () => {
  assert.equal(count(page, 'return t?.source.kind==="cowork"&&!M(t)&&t.source.data.sessionType!=="chat"'), 1);
  assert.equal(count(page, 'defaultMessage:"({count} not movable)",id:"GbAex7XW7M"'), 1);
  const rows = chatsPageRows(sessions, { metadata });
  const byId = new Map(rows.map(row => [row.ref.id, row]));
  assert.deepEqual(chatsSelectionTargets(['a', 'b'], byId), { archivable: [], movable: [] });
  // Ot: all selected gone → exit (null), else keep the rest.
  assert.equal(selectionAfterRemoval(['a', 'b'], ['a', 'b']), null);
  assert.deepEqual(selectionAfterRemoval(['a', 'b'], ['a']), ['b']);
});

test('delete copy: shared-11 OE picks deleteTitle / deleteBody for one chat and the Count forms for a bulk delete', () => {
  assert.equal(count(shared11, 'd.formatMessage(E?f.deleteTitleCount:f.deleteTitle,{count:ce})'), 1);
  assert.equal(count(shared11, 'd.formatMessage(E?f.deleteBodyCount:f.deleteBody,{count:ce})'), 1);
  assert.equal(count(shared11, 'E=!!(a&&a.length>0)'), 1);
  assert.equal(count(shared11, 'confirmLabel:he,confirmVariant:"danger"'), 1);
  assert.deepEqual(chatDeleteDialogCopy(intl, messages, { count: 1 }), {
    title: 'Delete chat?', description: 'Are you sure you want to delete this chat?', confirmLabel: 'Delete', confirmVariant: 'danger' });
  const bulk = chatDeleteDialogCopy(intl, messages, { count: 3, bulk: true });
  assert.equal(bulk.title, 'Delete 3 chats?');
  assert.equal(bulk.description, 'Are you sure you want to permanently delete these chats? This cannot be undone.');
  assert.equal(chatDeleteDialogCopy(intl, messages, { count: 1, bulk: true }).title, 'Delete 1 chat?');
  // The dialog (CdsConfirmationDialog, shared-frame Xc, OE's D) renders through a portal, so SSR shows nothing: pin
  // that the host hands it OE's copy and its Delete / danger confirm.
  assert.equal(count(src('src/source-chats-page.jsx'), 'title={copy.title} description={copy.description} confirmLabel={copy.confirmLabel} confirmVariant={copy.confirmVariant}'), 1);
});

test('delete run: each chat goes through the host delete (sessionAction "delete" → thread/delete); EE toasts', async () => {
  assert.equal(count(shared11, 'a.length>0&&t(r.formatMessage(i.deletedCount,{count:a.length}));let c=o.length-s.length;c>0&&n(r.formatMessage(i.deleteFailedCount,{count:c})'), 1);
  const rows = chatsPageRows(sessions, { metadata });
  const byId = new Map(rows.map(row => [row.ref.id, row]));
  const calls = [];
  const outcome = await deleteChats(['a', 'b', 'gone'], async session => {
    calls.push(session.id);
    if (session.id === 'b') return false;
    if (session.id === 'gone') throw new Error('Unknown session.');
    return true;
  }, byId);
  assert.deepEqual(calls, ['a', 'b', 'gone']);
  assert.equal(calls.length, 3);
  assert.deepEqual(outcome, { deleted: ['a'], notDeleted: ['b', 'gone'], explained: ['b'] });
  assert.deepEqual(chatDeleteOutcomeToasts(outcome, { intl, messages }), [
    { message: '1 chat deleted', variant: 'neutral' }, { message: 'Failed to delete 1 chat. You can try again.', variant: 'danger' }]);
  // main.jsx wires onDelete to sessionAction("delete", session) for the chat page; that case calls thread/delete.
  const main = src('src/main.jsx');
  assert.match(main, /<SourceChatsPage [^]*?onDelete=\{session => sessionAction\("delete", session\)\}/);
  assert.equal(count(main, 'perform: () => rpc("thread/delete", { threadId: target.id })'), 1);
});

test('hrefs: a chat row links to its local chat', () => {
  assert.equal(chatsPageHref('a b'), '#chat-session/a%20b');
  assert.equal(chatIdFromPageHref('#chat-session/a%20b'), 'a b');
  assert.equal(chatIdFromPageHref('#code-session/a'), null);
});

test('page: H frame (title, Filter by, search, Select, New chat link card) with the chat copy', () => {
  // H: the frame, the filter icon action and the selection / primary actions it renders.
  assert.equal(count(page, 'n(I,{contentGap:"none",title:yt,iconActions:bt,search:xt,actions:St,primaryAction:Ct,status:wt,children:[Et,kt,It]})'), 1);
  assert.equal(count(page, '{key:"filter",icon:"Filter",label:ot,pressed:st,items:at}'), 1);
  assert.equal(count(page, 'variant:"primary",href:"/task/new",className:"df-link-card"'), 1);
  // Hf: the chats search placeholder and label, the Select button and the empty states.
  assert.equal(count(hf, 'defaultMessage:"{kind, select, tasks {Search tasks...} chats {Search chats...} other {Search chats and tasks...}}",id:"eIP+ccvUsq"'), 1);
  assert.equal(count(hf, 'defaultMessage:"Search your activity",id:"CVFvNQtJ29"'), 1);
  assert.ok(count(hf, 'defaultMessage:"Select",id:"kQAf2d9u+x"') >= 1);
  for (const needle of ['defaultMessage:"Nothing matches \\u201C{query}\\u201D",id:"wPm6BlASlF"', 'defaultMessage:"Nothing archived yet.",id:"srh54ZPZzU"', 'defaultMessage:"No activity yet.",id:"NSk1hl3pEB"'])
    assert.equal(count(hf, needle), 1, needle);
  const html = render(Host.SourceChatsPage, { sessions, metadata, onDelete: () => true, onSessionMenu: () => {}, onOpen: () => {}, onNew: () => {} });
  assert.match(html, />Chats</);
  // The search starts collapsed (cd75b47e6 → CDS PageHeader): its toggle carries the label; the placeholder is the
  // open field's, formatted from Hf's select with kind "chats".
  assert.match(html, /<button[^>]*aria-label="Search your activity"/);
  assert.equal(intl.formatMessage({ defaultMessage: '{kind, select, tasks {Search tasks...} chats {Search chats...} other {Search chats and tasks...}}', id: 'eIP+ccvUsq' }, { kind: 'chats' }), 'Search chats...');
  assert.equal(count(src('src/source-chats-page.jsx'), "id: 'eIP+ccvUsq' }, { kind: 'chats' })"), 1);
  assert.match(html, /aria-label="Filter by"/);
  assert.match(html, /<button[^>]*data-cds="Button"[^>]*>(?:(?!<\/button>).)*>Select<\/span><\/button>/);
  assert.match(html, /class="[^"]*df-link-card[^"]*"[^>]*>(?:(?!<\/button>).)*New chat/);
  // Only the active chat row (the archived one waits for its filter; Cowork and Code sessions are not listed).
  // The row's link label, its title, the checkbox's "Select …" label and the More options trigger.
  assert.equal(count(html, 'Trip planning'), 4);
  assert.match(html, /aria-label="Select Trip planning"/);
  assert.equal(count(html, 'Recipe ideas'), 0);
  assert.equal(count(html, 'Trip cowork task'), 0);
  assert.equal(count(html, 'Trip code session'), 0);
  assert.match(html, /href="#chat-session\/a"/);
  // c623cddd3 Ee row content and cc18d27d7 L's "More options for {chatName}" trigger.
  assert.equal(count(page, 'className:"flex min-h-8 items-center justify-between gap-md"'), 1);
  assert.equal(count(page, 'className:"min-w-0 truncate text-body text-primary"'), 1);
  assert.match(html, /<div class="flex min-h-8 items-center justify-between gap-md"><span class="min-w-0 truncate text-body text-primary">Trip planning<\/span>/);
  assert.match(html, /aria-label="More options for Trip planning"/);
});

test('page: the empty states follow Hf (no activity / archived) and the archived filter lists archived chats', () => {
  const empty = render(Host.SourceChatsPage, { sessions: [], metadata });
  assert.match(empty, /No activity yet\./);
  assert.doesNotMatch(empty, />Select<\/span>/);
  const archived = render(Host.SourceChatsPage, { sessions, metadata, initialFilter: 'archived' });
  assert.match(archived, /Recipe ideas/);
  assert.doesNotMatch(archived, /Trip planning/);
  const archivedEmpty = render(Host.SourceChatsPage, { sessions: [], metadata, initialFilter: 'archived' });
  assert.match(archivedEmpty, /Nothing archived yet\./);
  // The All filter shows the Archived badge on archived rows (H Ee `i&&M(r)`).
  const all = render(Host.SourceChatsPage, { sessions, metadata, initialFilter: 'all' });
  assert.match(all, /Recipe ideas<\/span>.*?>Archived</);
});

test('page source: the selection bar is H\'s ({count} selected, Select all, Move to project, Archive, Delete, Cancel)', () => {
  for (const needle of ['defaultMessage:"{count} selected",id:"NKPfmmHQdx"', 'defaultMessage:"Select all",id:"94Fg25VD0N"',
    'defaultMessage:"Move to project",id:"+9Y66VlT9i"', 'defaultMessage:"Cancel",id:"47FYwba+bI"'])
    assert.ok(count(page, needle) >= 1, needle);
  const host = src('src/source-chats-page.jsx');
  for (const needle of ["defaultMessage: '{count} selected', id: 'NKPfmmHQdx'", "defaultMessage: 'Select all', id: '94Fg25VD0N'",
    "defaultMessage: 'Move to project', id: '+9Y66VlT9i'", "defaultMessage: 'Archive', id: 'NOMnBofwOT'", "defaultMessage: 'Delete', id: 'K3r6DQW7h+'",
    "defaultMessage: 'Cancel', id: '47FYwba+bI'", "defaultMessage: '({count} not movable)', id: 'GbAex7XW7M'"])
    assert.equal(count(host, needle), 1, needle);
  // Every English string the page formats is an official catalog entry with the same id.
  for (const [, message, id] of host.matchAll(/defaultMessage: '((?:[^'\\]|\\.)*)', id: '([^']+)'/g))
    assert.equal(enUS[id], message, `${id} ${message}`);
});

test('S5: the Chat palette searches "Search chats and projects" (c2771e1f6), the sidebar field reads "Search" (shared-21 Hz)', async () => {
  assert.equal(count(palette, 'N.formatMessage({defaultMessage:"Search chats and projects",id:"XF3P/8YpTI"})'), 1);
  assert.equal(count(shared21, 'u("span",{"data-row-label":"",className:"min-w-0 flex-1 truncate",children:u(xf,{defaultMessage:"Search",id:"xmcVZ0BU63"})})'), 1);
  const { palettePlaceholder } = await server.ssrLoadModule('/src/sidebar-palette-model.mjs');
  assert.equal(palettePlaceholder('search', { surface: 'chat' }), 'Search chats and projects');
  assert.equal(palettePlaceholder('search', { surface: 'code' }), 'Search sessions and projects');
});

test('main.jsx: the sessions section has a Chat branch and the Chat sidebar gets View all (shared-21 nX: /chats off Code)', () => {
  assert.equal(count(shared21, 'var tX="/chats";function nX(e,t,n){let r=e==="code"?t:tX;'), 1);
  const main = src('src/main.jsx');
  // w13-close-chat-surface (E74): the Cowork rail views all too, and the page serves Chat and Cowork (merged when Cowork is
  // listed; tests/w13-close-chat-surface.test.mjs).
  assert.equal(count(main, 'onViewAllSessions={mode === "code" || mode === "chat" || mode === "cowork" ? showSessionsPage : undefined'), 1);
  assert.equal(count(main, "section === 'sessions' && (mode === 'chat' || mode === 'cowork') ? <SourceChatsPage "), 1);
  assert.equal(count(main, 'import { SourceChatsPage } from "./source-chats-page.jsx";'), 1);
});

test('sidebar: the Chat Recents list ends with shared-21 pX "View all", which opens the Chats page (review fix)', () => {
  // shared-21 pX / lX / sX (rX = Np + mp + row classes) and shared-18 Ss (bk) / Ds (vk = _k + hit-row-main).
  assert.equal(count(shared21, 'lX=bf({viewAll:{defaultMessage:"View all",id:"pFK6bJU0EM"}})'), 1);
  assert.equal(count(shared21, 'let o=`label:viewall:${r??"recents"}`'), 1);
  assert.equal(count(shared21, 'u("button",{type:"button",...fX,onClickCapture:uX,onClick:t,"data-row":"","data-roving-item":"",className:sX,children:s})'), 1);
  assert.equal(enUS.pFK6bJU0EM, 'View all');
  const shared18 = read('shared-18-D3y8YMFN.js');
  const bk = shared18.match(/bk="([^"]+)"/)[1], hk = shared18.match(/_k="([^"]+)"/)[1];
  assert.ok(shared18.includes('vk=`${_k} hit-row-main`'));
  assert.ok(/Ds as mp/.test(shared21) && /Ss as Np/.test(shared21));
  const rest = shared21.match(/rX=Np\+" "\+mp\+"([^"]+)"/)[1], pad = shared21.match(/sX=rX\+"([^"]+)"/)[1];
  const official = `${bk} ${hk} hit-row-main${rest}${pad}`;
  // shared-22 LT: the last bucket's appendRow is pX when onViewAll is set (off Code).
  assert.equal(count(read('shared-22-Bwn3sJTG.js'), 'o(Ib,{onViewAll:a,headerViewAll:D!==null,bucketKey:y})'), 1);
  const thread = (id, updatedAt) => ({ id, name: `Chat ${id}`, preview: '', createdAt: updatedAt, updatedAt });
  const props = { sessions: [thread('a', now / 1000 - 60), thread('b', now / 1000 - 9 * 86400)], knownFolders: [], mode: 'chat', onMode() {} };
  const views = [];
  const html = renderServerMarkup(React.createElement(Sidebar.SourceSidebar, { ...props, onViewAllSessions: (...args) => views.push(args) }));
  const rows = [...html.matchAll(/<div class="df-drag-shiftable" data-drag-key="label:viewall:([^"]+)"[^>]*><button type="button" data-row="" data-roving-item="" class="([^"]+)">View all<\/button><\/div>/g)];
  assert.equal(rows.length, 1, 'one View all row');
  assert.equal(rows[0][2], official, 'sX classes verbatim');
  // It closes the last bucket's rows: no session row follows it.
  assert.ok(!html.slice(html.indexOf('label:viewall:')).includes('data-row-main-button'));
  // No callback (Cowork today), or the Code list (its sections carry View all in their menu): no row.
  assert.ok(!renderServerMarkup(React.createElement(Sidebar.SourceSidebar, props)).includes('label:viewall:'));
  // The click opens the Chats page with no archived-only argument (main.jsx: showSessionsPage → section "sessions").
  const row = Sidebar.SourceSidebarViewAllRow({ bucketKey: 'older', onViewAll: (...args) => views.push(args) });
  row.props.children.props.onClick({});
  assert.deepEqual(views, [[]]);
  assert.equal(row.props['data-drag-key'], 'label:viewall:older');
  const sidebar = src('src/source-sidebar.jsx');
  assert.equal(count(sidebar, 'const viewAllGroupKey = !sectionsModel && mode !== "code" && onViewAllSessions ? displayed.filter((group) => group.kind !== "pinned").at(-1)?.key : undefined;'), 1);
});
