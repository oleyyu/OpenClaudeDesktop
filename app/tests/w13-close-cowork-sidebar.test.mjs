// w13-close-cowork-sidebar (G12): the Cowork (hub) sidebar list of Claude Desktop 3.6556.2 — shared-22 bD's Cowork
// buckets and shared-21 PJ's Cowork "Group and sort" menu (cwui-46 remainder), the sections layout's Pinned coachmark and
// the shared-52 maybeShowDragPinHint rule, and the hub multi-selection menu (chatui-sidebar-star-02). Each check pins the
// official raw text (read, never executed) and the model, markup or wiring the host produces. Source only.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { ionSource } from '../scripts/official-3.6556.2.mjs';
import zh from '../electron/i18n/zh-CN/index.mjs';
import {
  HUB_GATES, HUB_MESSAGES, HUB_BULK_MESSAGES, coworkGroupBy, coworkGroupByDisabled, coworkGroupByMenuValue, coworkGroupByOptions, coworkListPreferences,
  coworkProjectBuckets, coworkRowUnread, coworkStateBuckets, coworkStateKey, coworkUnreadBuckets, defaultHubGroupBy, hubBulkActions, hubBulkHotkeys,
  hubBulkMenuEntries, hubBulkRow, hubSortBy, storedHubGroupBy,
} from '../src/hub-sidebar-model.mjs';
import { CHAT_TITLE_DELETE_DELAY_MS, CHAT_TITLE_MENU_MESSAGES, TURN_INTO_SKILL_PROMPT, chatRowHotkeys, chatTitleMenuEntries } from '../src/chat-starred-model.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (name) => fs.readFileSync(path.join(ionSource, name), 'utf8');
const src = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const count = (text, needle) => text.split(needle).length - 1;
const enUS = JSON.parse(fs.readFileSync(path.join(ionSource, '../../i18n/en-US.json'), 'utf8'));
const h = React.createElement;

const storage = new Map();
globalThis.localStorage = { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };

let server, Hub, Sidebar, Hint, ChatMenus;
before(async () => {
  server = await createServer({ configFile: false, root, plugins: [react()], server: { middlewareMode: true, hmr: false, ws: false, watch: null }, appType: 'custom', logLevel: 'error' });
  (await server.ssrLoadModule('/electron/i18n/index.mjs')).setLocale('en-US');
  Hub = await server.ssrLoadModule('/src/source-hub-sidebar.jsx');
  Sidebar = await server.ssrLoadModule('/src/source-sidebar.jsx');
  Hint = await server.ssrLoadModule('/src/source-drag-pin-hint.jsx');
  ChatMenus = await server.ssrLoadModule('/src/source-chat-row-menu.jsx');
});
after(() => server?.close());

// useSyncExternalStore without a server snapshot reads the client snapshot (as tests/w13-chats-page.test.mjs).
const render = (Component, props) => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = (d) => { if (!d?.useSyncExternalStore) return d; if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (s, g, sv) => d.useSyncExternalStore(s, g, sv ?? g) }); return wrapped.get(d); };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: (d) => { raw = d; } });
  try { return renderToStaticMarkup(h(Component, props)); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};

test('official: bD, the grouping value (iJ / j_ / M_ / tJ / nJ / $N Z) and xD', () => {
  const s22 = read('shared-22-Bwn3sJTG.js'), s21 = read('shared-21-R7LldJ05.js'), s52 = read('shared-52-uHFNjl7C.js');
  assert.equal(count(s22, 'var bD={project:{cowork:pD,code:fD(!1)},environment:{code:fD(!0)},date:mD,type:hD,unread:{cowork:gD(iw)},folder:{cowork:gD(RT)},state:{cowork:gD(fw),code:_D(sD)},coder:{},custom:{cowork:vD,code:vD},none:yD}'), 1);
  assert.equal(count(s22, 'function xD(e,t){let n=bD[e],r=typeof n=="function"?n:n?.[t.kind]??mD;'), 1);
  assert.equal(count(s22, 'Z=J4($,8,X,t,G,K)?K4($,8,X,t,G,K,X&&K==="custom"?"none":Qp(K,t==="code"&&G)'), 1);
  assert.equal(count(s21, 'function iJ(e){let $=J9(6),t=Lx(e),n=UL(),r=xL(e),i=rJ();return J5($,0,r,n,e,i,t)?K5($,0,r,n,e,i,t,nJ(tJ(pi(t,e,n),r),e,i)):$[5]}'), 1);
  assert.equal(count(s21, 'function nJ(e,t,n){return t==="cowork"&&n&&e==="project"?"date":e}'), 1);
  assert.equal(count(s21, 'function tJ(e,t){return t&&e==="type"?"date":e}'), 1);
  assert.equal(count(s52, 'function j_(e,t,n){let r=t==="cowork"&&n.chorusCoworkListed;return e===void 0?r&&n.chorusCodeEnabled&&!n.hubRail?"type":M_(t,n.isDesktopApp):e==="type"&&(!r||n.hubRail)||e==="folder"&&!(r&&n.chorusCodeEnabled)?"date":e}'), 1);
  assert.equal(count(s52, 'function M_(e,t){return e==="code"&&t?"project":"none"}'), 1);
  // Local gates: shared-78 zy (chorusCodeEnabled) is constant false; shared-182 vR (projects hidden) returns `_R = !1`.
  assert.equal(count(read('shared-78-D5Fw2h0a.js'), 'function zy(){return Ty(),!1}'), 1);
  assert.ok(read('shared-182-BI1KJccu.js').includes('_R=!1'));
});

test('model: the Cowork grouping value and its menu', () => {
  assert.equal(defaultHubGroupBy('cowork'), 'none');
  assert.equal(defaultHubGroupBy('chat'), 'none');
  assert.equal(defaultHubGroupBy('code'), 'project');
  assert.equal(coworkGroupBy(undefined), 'none', 'default (M_)');
  for (const value of ['date', 'project', 'unread', 'state', 'custom', 'none']) assert.equal(coworkGroupBy(value), value);
  assert.equal(coworkGroupBy('type'), 'date', 'j_: Type off chorusCoworkListed');
  assert.equal(coworkGroupBy('folder'), 'date', 'j_: Folder off chorusCodeEnabled');
  assert.equal(coworkGroupBy('custom', { archivedView: true }), 'none', '$N Z');
  assert.equal(coworkGroupBy('project', { gates: { ...HUB_GATES, projectsHidden: true } }), 'date', 'nJ');
  assert.equal(storedHubGroupBy(undefined, 'cowork', { ...HUB_GATES, chorusCoworkListed: true, chorusCodeEnabled: true }), 'type');
  // PJ `_t` at the local gates, separator before None, Project disabled without a project (`bt`).
  assert.deepEqual(coworkGroupByOptions().map(([value]) => value), ['date', 'project', 'unread', 'state', 'custom', 'none']);
  assert.deepEqual(coworkGroupByOptions().map(([, message]) => message.defaultMessage), ['Date', 'Project', 'Unread', 'State', 'Custom groups', 'None']);
  assert.deepEqual(coworkGroupByOptions({ ...HUB_GATES, typeFilter: true, chorusCodeEnabled: true, chorusCoworkListed: true }).map(([value]) => value),
    ['date', 'type', 'folder', 'project', 'unread', 'state', 'custom', 'none']);
  assert.deepEqual([...coworkGroupByDisabled({ hasProjects: false })], ['project']);
  assert.equal(coworkGroupByDisabled({ hasProjects: true }), undefined);
  assert.equal(coworkGroupByMenuValue(undefined), 'none');
  assert.equal(hubSortBy(undefined), 'recency');
  assert.equal(hubSortBy('alpha'), 'alpha');
  const prefs = coworkListPreferences({ groupBy: 'project', status: 'archived', sortBy: 'recency' }, { groupBy: 'unread', sortBy: 'created' });
  assert.deepEqual([prefs.groupBy, prefs.status, prefs.sortBy], ['none', 'active', 'created']);
  assert.equal(coworkListPreferences({}, { groupBy: 'custom', showEmptyGroups: true }).showEmptyGroups, true);
  // Every option's descriptor is the official one (en-US by id).
  for (const message of Object.values(HUB_MESSAGES)) assert.equal(enUS[message.id], message.defaultMessage, message.id);
});

test('official: PJ\'s Cowork branch (Group by, Sort by, Show empty groups) and the trigger label', () => {
  const s21 = read('shared-21-R7LldJ05.js');
  assert.equal(count(s21, '_t=J5($,135,st,ct,lt,ut,ft,pt,mt,gt)?K5($,135,st,ct,lt,ut,ft,pt,mt,gt,[st,...ct,...lt,...ut,ft,...pt,...mt,gt])'), 1);
  assert.equal(count(s21, 'ut=J2($,118,y,Q)?K2($,118,y,Q,y?[]:[["project",Q.formatMessage({defaultMessage:"Project",id:"k36uSwr4q5"})]])'), 1);
  assert.equal(count(s21, 'o=J5($,351,bt,_t,r,i,a)?K5($,351,bt,_t,r,i,a,u(qJ,{label:r,options:_t,value:i,onChange:a,disabledValues:bt,separatorBefore:"none"}))'), 1);
  assert.equal(count(s21, 'pe&&yt.add("project")'), 1);
  assert.equal(count(s21, 'pe=Fr(IJ)&&!de&&!fe'), 1);
  assert.equal(count(s21, 't==="cowork"&&(ce||z||Bt!==null)'), 1);
  assert.equal(count(s21, 'function AJ(e,t){return e!=="chat"&&t==="custom"||e==="code"&&Ni(t)}'), 1);
  assert.equal(count(s21, 't==="cowork"&&y||b?E.formatMessage({defaultMessage:"Filter and group recents",id:"OPM183pkH6"}):E.formatMessage(OJ.groupAndSort)'), 1);
  // qJ: the trailing value and the separator row.
  assert.ok(s21.includes('g=a?"text-accent":"text-muted"'));
  assert.ok(s21.includes('"data-testid":`submenu-line-before-${t}`'));
});

test('host: the Cowork Group and sort menu (qJ rows) and the per-mode view store', () => {
  storage.clear(); Hub.hubViewStore.reset();
  const view = { groupBy: undefined, sortBy: 'recency', showEmptyGroups: false };
  const html = render(Hub.SourceCoworkGroupSortMenu, { view, hasProjects: false });
  assert.match(html, /Group by/);
  assert.match(html, /<span class="text-footnote text-muted">None<\/span>/);
  assert.match(html, /Sort by/);
  assert.match(html, /<span class="text-footnote text-muted">Last activity<\/span>/);
  assert.ok(!html.includes('Show empty groups'), 'only for Custom groups');
  const custom = render(Hub.SourceCoworkGroupSortMenu, { view: { ...view, groupBy: 'custom' } });
  assert.match(custom, /Custom groups<\/span>/);
  assert.match(custom, /Show empty groups/);
  Hub.hubViewStore.setGroupBy('cowork', 'unread');
  Hub.hubViewStore.setSortBy('cowork', 'alpha');
  assert.deepEqual(JSON.parse(storage.get(Hub.HUB_VIEW_KEY)), { groupByByMode: { cowork: 'unread' }, sortByByMode: { cowork: 'alpha' }, showEmptyGroupsByMode: {} });
  Hub.hubViewStore.reset();
  assert.equal(Hub.hubViewStore.getState().groupByByMode.cowork, 'unread', 'read back from localStorage');
  storage.clear(); Hub.hubViewStore.reset();
});

test('official: the Cowork buckets iw (unread), fw (state), Bw / Qk (project), Nw (Recents)', () => {
  const s22 = read('shared-22-Bwn3sJTG.js'), s26 = read('shared-26-CGuBxVt9.js'), s78 = read('shared-78-D5Fw2h0a.js');
  assert.equal(count(s22, 'tw=Qs({unread:{defaultMessage:"Unread",id:"UvLihb5JBI"},read:{defaultMessage:"Read",id:"5zvJTSJA0C"}})'), 1);
  assert.equal(count(s22, 'let t=u.has(ur(n.ref))&&!nw(n,d,v)||n.ref.kind==="code"&&_.has(n.ref.id)'), 1);
  assert.equal(count(s22, 'up(n,p,f?m:null)&&!t?e:r'), 1);
  // iw / fw `Fx()` is shared-21 qQ (exported as zn): the set of sessions on screen (IC panes + WQ route), not running.
  assert.equal(count(s22, 'zn as Fx'), 1);
  const s21 = read('shared-21-R7LldJ05.js');
  assert.equal(count(s21, 'qQ as zn'), 1);
  assert.ok(s21.includes('function qQ(e){let $=J9(5),t=e===void 0||e,n=IC(),r=J1($,0,t)?K1($,0,t,(e,n)=>{if(!t)return null;let r=WQ(n),i=e===n?null:WQ(e);'));
  assert.ok(s22.includes('l=ec(),u=Fx(),d=Ws(cw)') && s22.includes('f=Fx(),p=Ws(gw)'));
  assert.ok(s22.includes('i=f.has(ur(n.ref))&&!nw(n,p,y),a=up(n,h,m?g:null)'));
  assert.equal(count(s22, 'b.push({key:"unread-unread",label:t,sessions:e.sort(h).slice(0,n)})'), 1);
  assert.equal(count(s22, 'b.push({key:"unread-read",label:e,sessions:r.sort(h).slice(0,n)})'), 1);
  assert.equal(count(s22, 'lw=["blocked","working","ready","done","idle"]'), 1);
  assert.equal(count(s22, 's=o==="error"||o==="awaiting"?"blocked":o==="running"?"working":o==="ready"&&!r?"ready":o==="pr"||n.hasCompleted||r&&n.ref.kind==="code"?"done":"idle"'), 1);
  assert.equal(count(s22, 'key:`cowork-state-${t}`,label:l.formatMessage(dw[t])'), 1);
  assert.equal(count(s26, 'function Ij(e){if(!e.isArchived){if(e.hasError)return Nj.error;if(e.liveStatus==="awaiting"||e.liveStatus==="running")return Nj[e.liveStatus]}return e.hasCompleted&&e.isUnread?Nj.ready:Nj.idle}'), 1);
  assert.equal(count(s26, 'var Xk="__no_project__"'), 1);
  assert.ok(s26.includes('`chat-project-${t.id}`'));
  assert.ok(s26.includes('v&&g.push({key:`space-${Xk}`,label:l,sessions:[...v].sort(s)'));
  assert.equal(count(s22, 'if(k.every(Vw))'), 1);
  assert.equal(count(s22, 'function Vw(e){return e.containerRef===null}'), 1);
  assert.equal(count(s22, 'zw=Qs({viewProject:{defaultMessage:"View project",id:"vEMaSy+wz1"}})'), 1);
  assert.ok(s78.includes('recents:{defaultMessage:"Recents",id:"CRKRWkBSJ8"}') && s78.includes('otherProjects:{defaultMessage:"Other",id:"/VnDMl81rh"}'));
  assert.ok(read('shared-21-R7LldJ05.js').includes('className:"df-chrome-btn df-touch-reveal -my-1 opacity-0 group-data-[hover-within]/section:opacity-100 group-focus-within/labelrow:opacity-100 focus-visible:opacity-100"'));
});

test('model: unread / state / project buckets', () => {
  const rows = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  // iw `t = u.has(ur(n.ref)) && !nw(…)` with u = Fx() = shared-21 qQ: the sessions on screen, not the running ones.
  const facts = { a: { unread: true, running: true }, b: {}, c: { unread: true, open: true }, d: { unread: true, open: true, explicitUnread: true } };
  const unread = coworkUnreadBuckets(rows, (row) => facts[row.id]);
  assert.deepEqual(unread.map((bucket) => [bucket.key, bucket.label.defaultMessage, bucket.sessions.map((row) => row.id)]),
    [['unread-unread', 'Unread', ['a', 'd']], ['unread-read', 'Read', ['b', 'c']]]);
  assert.equal(coworkRowUnread({ unread: true, running: true }), true, 'a running, unread, closed row stays Unread');
  assert.equal(coworkRowUnread({ unread: true, open: true }), false);
  assert.equal(coworkStateKey({ hasCompleted: true, unread: true, open: true }), 'done', 'fw isUnread: a && !i');
  assert.equal(coworkStateKey({ hasCompleted: true, unread: true, open: true, explicitUnread: true }), 'ready');
  // fw over Ed / Ij.
  const key = (f) => coworkStateKey({ hasCompleted: true, ...f });
  assert.equal(key({ error: true }), 'blocked');
  assert.equal(key({ awaiting: true }), 'blocked');
  assert.equal(key({ running: true }), 'working');
  assert.equal(key({ error: true, running: true }), 'blocked', 'Ij: hasError before running');
  assert.equal(key({ unread: true }), 'ready');
  assert.equal(key({ unread: true, archived: true }), 'done', 'ready && !r');
  assert.equal(key({ error: true, archived: true }), 'done', 'an archived row is not blocked');
  assert.equal(key({}), 'done');
  assert.equal(coworkStateKey({ hasCompleted: false }), 'idle');
  const states = coworkStateBuckets(rows, (row) => ({ hasCompleted: true, ...{ a: { running: true }, b: { awaiting: true }, c: { unread: true }, d: {} }[row.id] }));
  assert.deepEqual(states.map((bucket) => [bucket.key, bucket.label.defaultMessage]),
    [['cowork-state-blocked', 'Needs input'], ['cowork-state-working', 'Working'], ['cowork-state-ready', 'Ready'], ['cowork-state-done', 'Completed']]);
  // Bw / Qk: projects sorted by name, Other last; all rows without a project → flat.
  const projects = [{ id: 'p2', name: 'Zeta' }, { id: 'p1', name: 'Alpha' }];
  const owner = { a: 'p2', b: 'p1', c: 'gone' };
  const { buckets, flat } = coworkProjectBuckets(rows, { projectIdOf: (row) => owner[row.id], projects });
  assert.equal(flat, false);
  assert.deepEqual(buckets.map((bucket) => [bucket.key, typeof bucket.label === 'string' ? bucket.label : bucket.label.defaultMessage, bucket.sessions.map((row) => row.id)]),
    [['chat-project-p1', 'Alpha', ['b']], ['chat-project-p2', 'Zeta', ['a']], ['space-__no_project__', 'Other', ['c', 'd']]]);
  assert.equal(coworkProjectBuckets(rows, { projectIdOf: () => undefined, projects }).flat, true);
});

test('host: coworkDisplayedGroups lays the host list out as bD does', () => {
  const pinned = { key: 'pinned', label: 'Pinned', kind: 'pinned', sessions: [{ id: 'p' }] };
  const flat = { key: 'sessions', label: 'Sessions', kind: 'none', sessions: [{ id: 'a' }, { id: 'b' }] };
  const none = Hub.coworkDisplayedGroups([pinned, flat], undefined);
  assert.deepEqual(none.map((group) => [group.key, group.label]), [['pinned', 'Pinned'], ['recents', 'Recents']]);
  const facts = { a: { unread: true, hasCompleted: true }, b: { hasCompleted: true } };
  const unread = Hub.coworkDisplayedGroups([pinned, flat], 'unread', { factsOf: (row) => facts[row.id] });
  assert.deepEqual(unread.map((group) => [group.key, group.label, group.kind]), [['pinned', 'Pinned', 'pinned'], ['unread-unread', 'Unread', 'cowork-unread'], ['unread-read', 'Read', 'cowork-unread']]);
  const state = Hub.coworkDisplayedGroups([flat], 'state', { factsOf: (row) => facts[row.id] });
  assert.deepEqual(state.map((group) => group.label), ['Ready', 'Completed']);
  const project = Hub.coworkDisplayedGroups([flat], 'project', { projectIdOf: (row) => (row.id === 'a' ? 'p1' : undefined), projects: [{ id: 'p1', name: 'Site' }] });
  assert.deepEqual(project.map((group) => [group.key, group.label, group.viewProject?.id ?? null]), [['chat-project-p1', 'Site', 'p1'], ['space-__no_project__', 'Other', null]]);
  assert.deepEqual(Hub.coworkDisplayedGroups([flat], 'project', { projectIdOf: () => undefined }).map((group) => group.key), ['recents'], 'Bw → Nw');
  const date = [{ key: 'day-0', label: 'Today', kind: 'date', sessions: [{ id: 'a' }] }];
  assert.equal(Hub.coworkDisplayedGroups(date, 'date'), date, 'mD: the host date buckets');
  // The zh-CN Read bucket is keyed by id (the plain "Read" is the Read tool's 已读取).
  assert.equal(zh['Read|5zvJTSJA0C'], '已读');
  assert.equal(zh['View project'], '查看项目');
  // View project: HQ over CdsButton.
  const button = Hub.CoworkViewProjectButton({ onClick() {} });
  assert.deepEqual({ variant: button.props.variant, icon: button.props.icon, size: button.props.size, iconOnly: button.props.iconOnly, label: button.props['aria-label'] },
    { variant: 'ghost', icon: 'ArrowUpRight', size: 'xs', iconOnly: true, label: 'View project' });
});

test('host: the Cowork sidebar renders one "Recents" list by default and the chosen grouping', () => {
  storage.clear(); Hub.hubViewStore.reset();
  const now = Date.now() / 1000;
  const thread = (id, updatedAt) => ({ id, name: `Task ${id}`, preview: '', createdAt: updatedAt, updatedAt });
  const props = { sessions: [thread('a', now - 60), thread('b', now - 9 * 86400)], knownFolders: [], mode: 'cowork', onMode() {},
    sessionMetadata: { a: { unread: true } } };
  const headings = (html) => [...html.matchAll(/data-group-key="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(headings(render(Sidebar.SourceSidebar, props)), ['recents'], 'M_: none → Nw');
  Hub.hubViewStore.setGroupBy('cowork', 'unread');
  assert.deepEqual(headings(render(Sidebar.SourceSidebar, props)), ['unread-unread', 'unread-read']);
  Hub.hubViewStore.setGroupBy('cowork', 'date');
  assert.deepEqual(headings(render(Sidebar.SourceSidebar, props)), ['day-0', 'older']);
  // Chat keeps its date buckets (not this lane's grouping).
  assert.deepEqual(headings(render(Sidebar.SourceSidebar, { ...props, mode: 'chat' })), ['day-0', 'older']);
  storage.clear(); Hub.hubViewStore.reset();
});

test('official: the hub multi-selection menu (fm I → ul = cf259e6ae, actions from c44373cde Le / X, Wx groups)', () => {
  const s16 = read('shared-16-ByfgAyLr.js'), bulk = read('cf259e6ae-BizsbIZ1.js'), le = read('c44373cde-CAOQ4vZq.js'), s20 = read('shared-20-mUr7IqZY.js');
  assert.equal(count(s16, 'Ct=J3($,123,R,re,I)?K3($,123,R,re,I,a(ul,{actions:I,closeMenu:R,hotkeysRef:re}))'), 1);
  assert.ok(s16.includes('pick:e=>e.SidebarBulkMenuItems'));
  assert.equal(count(le, 'let c=e=>s.length>0&&s.every(e)?s:Ie'), 1);
  assert.equal(count(le, 'pin:c(e=>!e.isPinned&&!e.temporaryChat&&e.pinWritable),unpin:c(e=>e.isPinned&&e.pinWritable),markRead:c(e=>e.readToggle?.isUnread===!0),markUnread:c(e=>e.readToggle?.canMarkUnread===!0),moveToGroup:c(e=>e.groupable),archive:c(e=>e.isArchivableTask||e.isArchivableChat),deleteChats:c(e=>e.isChat),deleteTasks:c(e=>e.isTask)'), 1);
  assert.equal(count(le, 's=!0,c=e!=="chat"&&!t'), 1);
  assert.equal(count(le, 'readToggle:Ee(e,t,n),groupable:n.onCoworkRail&&k(t,{markedTemporary:d,whenUnpinned:!1})'), 1);
  assert.ok(read('c7ab4beb6-5ST3z7ye.js').includes('if(a.liveStatus==="running"||a.liveStatus==="awaiting"||a.pendingPermissions>0||t(n))return null;'));
  assert.equal(count(bulk, 'children:[F,I,L,R,z,B,V,H]'), 1);
  assert.equal(count(bulk, '(x||T)&&(g||_||v||y||b)&&e(i.Separator,{})'), 1);
  assert.equal(count(bulk, '"data-testid":S?"delete-chat-trigger":C?"bulk-delete-tasks-trigger":"bulk-delete-projects-trigger",icon:"Trash",shortcut:"d"'), 1);
  for (const needle of ['"data-testid":"bulk-pin-trigger",icon:"Pin",shortcut:"p"', '"data-testid":"bulk-unpin-trigger",icon:"PinSlash",shortcut:g?void 0:"p"',
    '"data-testid":"bulk-mark-read-trigger",icon:"Eye",shortcut:"u"', '"data-testid":"bulk-mark-unread-trigger",icon:"EyeSlash",shortcut:v?void 0:"u"',
    '"data-testid":"bulk-archive-trigger",icon:"Archive",shortcut:"a"']) assert.equal(count(bulk, needle), 1, needle);
  for (const message of Object.values(HUB_BULK_MESSAGES)) assert.equal(enUS[message.id], message.defaultMessage, message.id);
  assert.ok(s20.includes('"data-testid":"move-to-group-trigger"') && s20.includes('b=m?"Folder":void 0') && s20.includes('"data-testid":"new-custom-group"'));
  // The Chat row's read toggle: `isRunning: !X && (t.isRunning || ge)` (X = !!n.isArchived).
  assert.equal(count(read('shared-22-Bwn3sJTG.js'), 'readState:Ms(n.sessionId,{isRunning:!X&&(t.isRunning||ge)'), 1);
});

test('model + host: the hub bulk menu entries, keys and markup', () => {
  const chat = (over) => hubBulkRow({ id: 'x', sessionType: 'chat', ...over });
  // Two unpinned, read, idle Chat rows: Pin, Mark as unread, separator, Delete (tasks); no Archive (chat is not archivable).
  let entries = hubBulkMenuEntries(hubBulkActions([chat({ id: 'a' }), chat({ id: 'b' })]));
  assert.deepEqual(entries.map((entry) => entry.kind === 'separator' ? '—' : `${entry.action}:${entry.testId}:${entry.shortcut ?? ''}`),
    ['pin:bulk-pin-trigger:p', 'mark-unread:bulk-mark-unread-trigger:u', '—', 'delete:bulk-delete-tasks-trigger:d']);
  // A running row drops both read items; mixed pins drop Pin and Unpin.
  entries = hubBulkMenuEntries(hubBulkActions([chat({ id: 'a', pinned: true }), chat({ id: 'b', running: true })]));
  assert.deepEqual(entries.map((entry) => entry.action ?? '—'), ['delete'], 'no separator without an item above');
  // Cowork rows: Move to group (Cowork rail), Archive.
  const cowork = (over) => hubBulkRow({ id: 'x', onCoworkRail: true, ...over });
  entries = hubBulkMenuEntries(hubBulkActions([cowork({ id: 'a', unread: true }), cowork({ id: 'b', unread: true, pinned: true })]), { anyAssigned: true });
  assert.deepEqual(entries.map((entry) => entry.action ?? '—'), ['mark-read', 'move-to-group', '—', 'archive', 'delete']);
  assert.equal(entries.find((entry) => entry.kind === 'move').anyAssigned, true);
  assert.deepEqual([...hubBulkHotkeys(entries)], [['u', 'mark-read'], ['a', 'archive'], ['d', 'delete']]);
  // The open row reads as read unless explicitly unread (c7ab4beb6).
  assert.equal(hubBulkRow({ unread: true, open: true }).readToggle.isUnread, false);
  assert.equal(hubBulkRow({ unread: true, open: true, explicitUnread: true }).readToggle.isUnread, true);
  const html = renderToStaticMarkup(h(Hub.SourceHubBulkMenu, { entries: hubBulkMenuEntries(hubBulkActions([chat({ id: 'a' }), chat({ id: 'b' })])), onRun() {} }));
  assert.match(html, /data-testid="bulk-pin-trigger"[^>]*>[\s\S]*?Pin 2/);
  assert.match(html, /data-testid="bulk-delete-tasks-trigger"/);
  assert.match(html, /Delete 2/);
  assert.equal(zh['Mark {count} as read'], '将 {count} 个标记为已读');
});

test('wiring: the sidebar and the sections layout (cwui-46 Pinned coachmark, maybeShowDragPinHint, bD, PJ, bulk menu)', () => {
  const sidebar = src('src/source-sidebar.jsx'), sections = src('src/source-sidebar-sections.jsx');
  assert.ok(sidebar.includes('if (args[0] === "pin") dragPinHintStore.maybeShowDragPinHint({ collapsed: !!collapsed });'));
  assert.ok(sidebar.includes('pinnedAnchor: pinnedHeadingRef,'));
  assert.ok(sidebar.includes('pinnedHint: <DragPinHintCoachmark kind={mode} anchor={pinnedHeadingRef} hidden={!!collapsed} />,'));
  assert.ok(sections.includes('{pinned && host.pinnedAnchor ? <div ref={host.pinnedAnchor}>{shifted}</div> : shifted}'));
  assert.ok(sections.includes('{pinned && host.pinnedHint}'));
  // shared-22 aM: `vt = o("div", {ref: ze, children: _t})`.
  assert.equal(count(read('shared-22-Bwn3sJTG.js'), 'vt=J1($,70,_t)?K1($,70,_t,o("div",{ref:ze,children:_t})):$[71]'), 1);
  assert.ok(sidebar.includes('mode === "cowork" ? coworkDisplayedGroups(groups, hubView.groupBy'));
  // iw / fw `u = Fx()`: the facts carry the rows on screen (route + split sides), the same set the nested rows use.
  assert.ok(sidebar.includes('const openNestedIds = useMemo(() => new Set([current, ...splitSides.sides.map(side => side.current)].filter(Boolean)), [current, splitSides.sides]);'));
  assert.ok(sidebar.includes('    open: openNestedIds.has(session.id) });'));
  assert.ok(sidebar.includes('{menu.kind === "filter" && mode === "cowork" && <SourceCoworkGroupSortMenu '));
  assert.ok(sidebar.includes('{group.viewProject && onViewProject && <CoworkViewProjectButton onClick={() => onViewProject(group.viewProject)} />}'));
  assert.ok(src('src/main.jsx').includes('onViewProject={(project) => openLocalProject(project).catch((reason) => setError(reason.message))}'));
  assert.ok(src('src/source-chat-row-menu.jsx').includes('const running = !sessionArchived(session) && (sessionState(session, state) === "working" || !!state.active?.[session.id]);'));
});

test('store: maybeShowDragPinHint follows shared-52 (seen || collapsed || Hg || isRouteDrilldown)', () => {
  assert.ok(read('shared-52-uHFNjl7C.js').includes('function Hg(e){return e.isCuDocked||e.isNarrowViewport}'));
  const store = Hint.dragPinHintStore;
  storage.clear(); store.reset();
  for (const blocked of [{ collapsed: true }, { isCuDocked: true }, { isNarrowViewport: true }, { isRouteDrilldown: true }]) {
    store.maybeShowDragPinHint(blocked);
    assert.equal(store.getState().showDragPinHint, false, JSON.stringify(blocked));
  }
  store.maybeShowDragPinHint({});
  assert.equal(store.getState().showDragPinHint, true);
  storage.clear(); store.reset();
  // main.jsx: the sidebar's collapsed prop already folds the narrow viewport and the CU dock in (Hg).
  const main = src('src/main.jsx');
  assert.ok(main.includes('const narrowViewport = narrowMedia || cuDocked;'));
  assert.ok(main.includes('const effectiveCollapsed = side === 0 && (NO_SIDEBAR || collapsed || narrowViewport);'));
});

// chatui-sidebar-star-02 (review fix): the Chat session title's menu, ca2ef848d F5 → shared-16 om → fm, with the props
// y5's session branch gets from c21f11e6d BP (CoworkSessionView, which also hosts sessionType "chat" sessions) via Bae.
test('official: the Chat title menu is F5 → om → fm with the CoworkSessionView props (y5 / Bae / BP)', () => {
  const ca = read('ca2ef848d-ChLvq6yZ.js'), cw = read('c21f11e6d-Cyd8_HO8.js'), s16 = read('shared-16-ByfgAyLr.js');
  // BP → hp (= ca2ef848d Uae): the session callbacks it passes, and nothing for star / unarchive / chatConversation.
  assert.equal(count(cw, 'BP as CoworkSessionView'), 1);
  assert.equal(count(cw, 'p(hp,{surface:"cowork",temporaryVerdictResolved:!0'), 1);
  assert.equal(count(cw, 'onRenameSession:i||o?void 0:so,onArchiveSession:Ui&&!o?Vi:void 0,onDeleteSession:i||o||!Ni?void 0:co,scheduledTaskId:t.scheduledTaskId,sessionId:a?void 0:X'), 1);
  assert.equal(count(ca, 'Uae as n'), 1);
  // Bae → headerProps.
  assert.equal(count(ca, 'isLocalAgentSession:ec==="local_agent_mode_session"'), 1);
  assert.equal(count(ca, 'onScheduleTask:Cc,onTurnIntoSkill:wc,onCreateAgent:Vs'), 1);
  assert.equal(count(ca, 'Cc=Ni.enabled&&!Te?Fi:void 0,wc=Te?void 0:Ii'), 1);
  assert.equal(count(ca, 'ji.current?.setContent(Tw(Ir),e=>e,e=>e)'), 1);
  assert.equal(count(ca, 'ji.current?.setContent("Turn this task into a skill",[],[])'), 1);
  assert.equal(count(read('shared-28-DNYlf4wu.js'), 'wD=Fa({prompt:{defaultMessage:"Set this up to run on a schedule",id:"KfWwH6nrJO"}'), 1);
  // y5 → F5: no Archive for a chat session (Dt = shared-52 mM, sessionType "chat"), starred from the session itself.
  assert.equal(count(ca, 'Dt=Vi(y&&B?B:null),Ot=Dt?void 0:D'), 1);
  assert.equal(count(ca, 'tl as Vi'), 1);
  assert.ok(read('shared-52-uHFNjl7C.js').includes('mM as tl') && read('shared-52-uHFNjl7C.js').includes('t.sessionType==="chat"'));
  assert.equal(count(ca, 'f(F5,{primaryButtonRef:$e,testIdKind:"session",copy:Ue,'), 1);
  assert.equal(count(ca, 'onArchive:Ot,archiveIsChatArchive:A!==void 0,onUnarchive:O,onDelete:k,chatConversation:be?void 0:A,suppressMoveToProject:be,isChatSession:Dt,chatDeletedWithTask:kt,scheduledTaskId:F,onScheduleTask:I,onTurnIntoSkill:R,onCreateAgent:z,'), 1);
  assert.equal(count(ca, 'isStarred:be?void 0:j??Et,onToggleStarred:be?void 0:M'), 1);
  // F5 → Ote (shared-16 om) inside a K.Popup aligned to the end.
  assert.equal(count(ca, 'bn as Ote'), 1);
  assert.equal(count(s16, 'om as bn'), 1);
  assert.equal(count(ca, 'renameDisabled:v,renameCopy:n,projectCreateSource:"chat_header_picker"'), 1);
  assert.equal(count(ca, '{items:j,modals:M,onPopupKeyDown:N}=Ote(A)'), 1);
  assert.equal(count(ca, 'f(K.Popup,{align:"end",onKeyDownCapture:N,children:j})'), 1);
  // om → fm and fm's items for these props.
  assert.equal(count(s16, ':a(fm,{onOpenChange:r,onSelectForBulk:i,onArchive:o,'), 1);
  assert.equal(count(s16, 'u(d,{children:[b,x,S,C,k,e,A,ee,te,ne,ie,H,U,ae,oe,le,J,de,fe,me,ye]})'), 1);
  assert.equal(count(s16, '!f&&p&&a(O.Item,{onClick:dt,icon:"Clock",children:a(Z,{defaultMessage:"Schedule",id:"1rQBje0k5s"})})'), 1);
  assert.equal(count(s16, 'm&&a(O.Item,{onClick:ft,icon:he,children:pe})'), 1);
  assert.equal(count(s16, 'K3($,127,pt,Y,h,null)'), 1, 'the create-agent slot is always null');
  assert.equal(count(s16, '(f||p||m||e!==null)&&a(O.Separator,{})'), 1);
  assert.equal(count(s16, 'H||(se(!0),pe())'), 1, 'Rename opens the nm dialog');
  assert.equal(count(s16, 'setTimeout(()=>K(!0),100)'), 1, 'Delete opens hm 100ms later');
  assert.equal(count(s16, 'kind:f?"chat":"task"'), 1);
  assert.equal(count(s16, 'ex as Ae'), 1);
  assert.equal(count(read('shared-0-DDOOdL6P.js'), 'function oa(e){let t=aa(e);return t===void 0?void 0:`cse_${t}`}'), 1, 'no Copy session ID for a local id');
  const s12 = read('shared-12-Dro5Rhl0.js');
  assert.equal(count(s12, 'turnInto:{defaultMessage:"Turn into skill",id:"ufQmUah9fM"}'), 1);
  assert.equal(count(s12, 's=e=>e?"Plugin":"Scroll"'), 1);
  assert.equal(enUS['1rQBje0k5s'], 'Schedule');
  assert.equal(enUS['ufQmUah9fM'], 'Turn into skill');
  assert.equal(enUS['KfWwH6nrJO'], 'Set this up to run on a schedule');
});

test('model + host: the Chat title menu entries, keys and markup', () => {
  const shape = (entries) => entries.map((entry) => entry.kind === 'separator' ? '—' : `${entry.action}:${entry.icon}${entry.shortcut ? `:${entry.shortcut}` : ''}`);
  assert.deepEqual(shape(chatTitleMenuEntries()),
    ['schedule:Clock', 'turn-into-skill:Scroll', '—', 'pin:Pin:p', 'rename:Edit:r', '—', 'delete:Trash:d']);
  assert.deepEqual(shape(chatTitleMenuEntries({ starred: true, scheduleOffered: false })),
    ['turn-into-skill:Scroll', '—', 'unpin:PinSlash:p', 'rename:Edit:r', '—', 'delete:Trash:d']);
  assert.deepEqual(shape(chatTitleMenuEntries({ scheduleOffered: false, turnIntoSkillOffered: false, canRename: false, canDelete: false })), ['pin:Pin:p']);
  assert.deepEqual([...chatRowHotkeys(chatTitleMenuEntries()).entries()], [['p', 'pin'], ['r', 'rename'], ['d', 'delete']]);
  assert.ok(!chatTitleMenuEntries().some((entry) => /archive|read|move-/.test(entry.action ?? '')), 'no Archive, read toggle or reorder');
  assert.equal(TURN_INTO_SKILL_PROMPT, 'Turn this task into a skill');
  assert.equal(CHAT_TITLE_DELETE_DELAY_MS, 100);
  assert.equal(CHAT_TITLE_MENU_MESSAGES.schedule.id, '1rQBje0k5s');
  // zh-CN: the menu's verb "Schedule" is keyed by id (the plain key is the Scheduled page's noun).
  assert.equal(zh['Schedule|1rQBje0k5s'], '设置定时');
  assert.ok(zh['Turn into skill'] && zh['Set this up to run on a schedule']);
  const html = renderToStaticMarkup(h(ChatMenus.SourceChatTitleMenu, { session: { id: 's1', name: 'A' }, metadata: { pinned: true },
    onAction() {}, onRename() {}, onDelete() {}, onSchedule() {}, onTurnIntoSkill() {}, projectItems: h('span', { 'data-project-block': '' }) }));
  assert.ok(html.includes('data-chat-title-menu=""'));
  const order = ['>Schedule<', '>Turn into skill<', '>Unpin<', 'data-testid="rename-session-trigger"', 'data-project-block', 'data-testid="delete-session-trigger"'].map((needle) => html.indexOf(needle));
  assert.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), JSON.stringify(order));
  assert.ok(!html.includes('toggle-session-read-trigger') && !html.includes('archive-session-trigger'));
});

test('wiring: the Chat title opens its own menu (main.jsx session-title for mode chat, titlebar caret)', () => {
  const main = src('src/main.jsx'), bar = src('src/source-titlebar.jsx');
  assert.ok(bar.includes('const titleMenuSurface = surface === "code" || surface === "chat";'));
  assert.ok(bar.includes('const sessionMenuKind = titleMenuSurface ? "session-title" : "session";'));
  assert.ok(bar.includes('const sessionMenuLabel = titleMenuSurface ? sessionMenuTriggerLabel(title) : t("Session options");'));
  assert.ok(bar.includes('aria-haspopup="menu" aria-expanded={menuKind === sessionMenuKind && !menuAtPointer}'));
  assert.ok(main.includes('if (mode === "chat") {\n          const target = menu.data;'));
  assert.ok(main.includes('return <SourceChatTitleMenu session={target}'));
  assert.ok(main.includes('onRename={() => setRename(renameDialogFor(target))}'));
  assert.ok(main.includes('onDelete={() => { setTimeout(() => setActionDialog({ kind: "delete-chat", target }), CHAT_TITLE_DELETE_DELAY_MS); }}'));
  assert.ok(main.includes('onSchedule={() => setDraft(t(CHAT_TITLE_MENU_MESSAGES.schedulePrompt.defaultMessage))}'));
  assert.ok(main.includes('onTurnIntoSkill={() => { setDraft(TURN_INTO_SKILL_PROMPT); setMentions([]); setAttachments([]); }}'));
  assert.ok(main.includes('<SourceChatProjectMenuItems kind="cowork" projects={projects}'));
  assert.ok(main.includes('{shownActionDialog.value?.kind === "delete-chat" && <SourceConfirmDialog'));
  assert.ok(main.includes('onConfirm={() => sessionAction("delete", shownActionDialog.value.target)} />}'));
  assert.ok(main.includes('align={menu.kind === "session-title" && mode !== "chat" ? "start" : undefined}'), 'F5 K.Popup align "end"');
});

test('host: the Chat title caret is worded by w5 and opens session-title; Cowork keeps "Session options"', async () => {
  const T = await server.ssrLoadModule('/src/source-titlebar.jsx');
  const render = (props) => renderToStaticMarkup(h(T.SourceTitlebar, { section: 'new', session: { id: 'a', name: 'A title', cwd: '/tmp/work' }, onRename() {}, ...props }));
  const caret = (html) => html.match(/<button[^>]*aria-haspopup="menu"[^>]*aria-label="[^"]*"[^>]*>|<button[^>]*aria-label="[^"]*"[^>]*aria-haspopup="menu"[^>]*>/g) ?? [];
  const chat = caret(render({ surface: 'chat' })).find((tag) => tag.includes('More options for A title'));
  assert.ok(chat, 'chat caret: "More options for {label}" (ca2ef848d w5)');
  assert.match(chat, /aria-expanded="false"/);
  assert.doesNotMatch(chat, /\stitle=/, 'a CDS tooltip, not a native title');
  assert.ok(caret(render({ surface: 'chat', menuKind: 'session-title' })).some((tag) => tag.includes('More options for A title') && tag.includes('aria-expanded="true"')));
  assert.ok(caret(render({ surface: 'cowork' })).some((tag) => tag.includes('aria-label="Session options"')));
  assert.ok(src('src/source-titlebar.jsx').includes('onMenu?.(sessionMenuKind, event.currentTarget, session, entry);'));
});
