import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { sideSessionDetachable } from '../src/generated/btw-pane/detach-eligibility.mjs';
import { detachFromParentAvailable, detachLineageParents } from '../src/btw-detach-host.mjs';
import { btwTabMenuState } from '../src/btw-tab-menu-model.mjs';
import { sideSessionRecord } from '../src/nested-less-side-chats.mjs';
import { sessionParentId, lineageKind } from '../src/sidebar-model.js';
import { btwPaneTabs, nextBtwTab } from '../src/btw-pane-controller.mjs';

// R3-nested NBS-4: 2.42304.0 cccc2cf0a RO / LO / IO and shared-11 df / pf — the /btw side-chat tab menu.
const app = path.resolve(import.meta.dirname, '..');
const v1 = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const official = file => readFileSync(path.join(v1, file), 'utf8');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const h = React.createElement;
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
const btwMeta = (parent, extra = {}) => ({ forkedFrom: parent, spawnedFrom: { sessionId: parent, sideSession: true, userFork: true, btw: true, ...extra.spawnedFrom },
  btw: { createdAt: 1, ownTurnIds: [] }, ...extra, ...(extra.spawnedFrom ? { spawnedFrom: { sessionId: parent, sideSession: true, userFork: true, btw: true, ...extra.spawnedFrom } } : {}) });
let server, SourceSidebar;
before(async () => {
  server = await createServer({ configFile: false, root: app, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
});
after(() => server?.close());

test('df/lf/cf are generated from 2.42304.0 shared-11 with uf and Iu as host adapters', async () => {
  const manifest = JSON.parse(readFileSync(path.join(app, 'src/generated/btw-pane/manifest.json'), 'utf8'));
  const entry = manifest.modules.find(module => module.target === 'detach-eligibility.mjs');
  assert.equal(manifest.referenceVersion, '2.42304.0'); assert.equal(entry.source, 'shared-11-BuQ3CK5I.js');
  assert.equal(entry.sourceSha256, sha(readFileSync(path.join(v1, entry.source))));
  assert.deepEqual(entry.bindings.map(binding => binding.name), ['cf', 'lf', 'df']); assert.deepEqual(entry.exports, { df: 'sideSessionDetachable' });
  assert.deepEqual(entry.imports.map(i => [i.local, i.kind, i.from, i.name, !!i.replacedSha256]),
    [['Iu', 'host', '../../btw-detach-host.mjs', 'detachLineageParents', true], ['uf', 'host', '../../btw-detach-host.mjs', 'detachFromParentAvailable', true]]);
  assert.equal(entry.sha256, sha(readFileSync(path.join(app, 'src/generated/btw-pane/detach-eligibility.mjs'))));
  const shared11 = official('shared-11-BuQ3CK5I.js');
  for (const feature of ['function cf(e){return e.spawnedFrom?.sideSession===!0&&e.spawnedFrom.sharedCheckout===!0}',
    'function lf(e,t){return!e.isArchived&&!cf(e)&&t.has(e.sessionId)}',
    'function df(e,t){let n=uf()?e.find(e=>e.sessionId===t):void 0;return n!==void 0&&lf(n,Iu(e,!0))}',
    'function uf(){return!!V?.detachFromParent}', 'df as Rr', 'pf as Vr', 'Fb as L',
    'defaultMessage:"Couldn\\u2019t detach the session. Try again.",id:"frOpVXffev"', 'i(n).then(()=>{Za(a,{lineageDetached:!0}),ad(a)},n=>{od(a),r?.(),e(']) {
    assert.ok(shared11.includes(feature), feature);
  }
  const { extractBtwPane } = await import('../scripts/extract-btw-pane.mjs');
  await extractBtwPane({ check: true });
});

test('RO / LO / IO in cccc2cf0a are what the host tab strip follows', () => {
  const pane = official('cccc2cf0a-B0D--VZp.js');
  for (const feature of ['p=oa(wt(e=>s.map(t=>Sa(e.sessions,t))))', 'm=kt(wt(e=>s.map(t=>e.starredIds.includes(t))))',
    'return m[t]||p[t]?g(LO,', 'renderTabMenuItems:N,minTabWidth:92', 'j.delete(t)&&!Gh(t)&&A()',
    'return t&&t.lineageDetached===!0},r=n();return oa.subscribe(()=>{let e=r;r=n(),r===!0&&e===!1&&t()})',
    'g(X,{defaultMessage:"Unpin",id:"nR6dLhVwqy"})', 'o("detach"),r.add(e),i(e,()=>r.delete(e))', 'g(X,{defaultMessage:"Detach to top level",id:"XP5vxiZixk"})',
    'Rr as Sa', 'Vr as wa', 'L as ya', 'Ii as Qn']) {
    assert.ok(pane.includes(feature), feature);
  }
  const strip = readFileSync(path.join(app, 'src/generated/view-tabs/cfe7c4b3b-CP-IQXj8.js'), 'utf8');
  assert.match(strip, /import \{iD as C\} from "\.\/shared-frame-BfjMqbuN\.js";/, 'the tab menu Popup is shared-frame iD (exported Ii)');
  assert.ok(strip.includes('qe=ce?.(e.id)??null'), 'the strip draws renderTabMenuItems(id) inside it');
  const names = JSON.parse(readFileSync(path.join(app, 'src/generated/view-tabs/manifest.json'), 'utf8')).publicNames;
  assert.deepEqual(names.CdsContextMenu, { file: 'shared-frame-BfjMqbuN.js', local: 'iD', export: 'Ii' });
});

test('df over the local records: a live attached child of a listed parent, not archived, not sharing the checkout', () => {
  assert.equal(detachFromParentAvailable(), true, 'uf: main.cjs serves btw-session op detach');
  const sessions = [thread('parent'), thread('child'), thread('shared'), thread('done', { archived: true }), thread('detached'), thread('orphan'), thread('loose')];
  const metadata = { child: btwMeta('parent'), shared: btwMeta('parent', { spawnedFrom: { sharedCheckout: true } }), done: btwMeta('parent'),
    detached: btwMeta('parent', { lineageDetached: true }), orphan: btwMeta('missing') };
  const records = sessions.map(session => sideSessionRecord(session, metadata));
  const detachable = id => sideSessionDetachable(records, id);
  assert.equal(detachable('child'), true);
  assert.equal(detachable('shared'), false, 'cf: a side session sharing its parent\'s checkout');
  assert.equal(detachable('done'), false, 'lf: archived');
  assert.equal(detachable('detached'), false, 'F_ drops the lineage once detached');
  assert.equal(detachable('orphan'), false, 'no listed parent');
  assert.equal(detachable('loose'), false, 'no lineage at all');
  assert.equal(detachable('parent'), false); assert.equal(detachable('unknown'), false, 'n === void 0');
  const archivedParent = [thread('parent', { archived: true }), thread('child')].map(session => sideSessionRecord(session, metadata));
  assert.equal(sideSessionDetachable(archivedParent, 'child'), false, 'ou: an archived parent holds no live child');
  assert.equal(detachLineageParents(records, false).size, 0, 'Iu(e, !1) is the empty map');
  // $l: only a side session's spawnedFrom names a parent (no `lineage` field on these records).
  const loose = [{ sessionId: 'p' }, { sessionId: 'c', spawnedFrom: { sessionId: 'p', sideSession: false } }, { sessionId: 's', spawnedFrom: { sessionId: 'p', sideSession: true } }];
  assert.deepEqual([...detachLineageParents(loose, true)], [['s', 'p']]);
  assert.equal(detachLineageParents(records, true), detachLineageParents(records, true), 'cached per records array, as Fu is');
});

test('btwTabMenuState: pinned from the shown metadata, detachable only on a connected /btw core', () => {
  const sessions = [thread('parent'), thread('a'), thread('b')];
  const metadata = { a: btwMeta('parent', { pinned: true }), b: btwMeta('parent', { spawnedFrom: { sharedCheckout: true } }) };
  const tabs = btwPaneTabs(sessions, metadata, 'parent', 'a');
  const on = btwTabMenuState({ sessions, metadata, tabs, supported: true });
  assert.deepEqual(Object.fromEntries(on), { a: { pinned: true, detachable: true }, b: { pinned: false, detachable: false } });
  const off = btwTabMenuState({ sessions, metadata, tabs, supported: false });
  assert.deepEqual(Object.fromEntries(off), { a: { pinned: true, detachable: false }, b: { pinned: false, detachable: false } }, 'Unpin stays; Detach needs the core');
  assert.equal(btwTabMenuState({ sessions, metadata, tabs: [], supported: true }).size, 0);
});

test('a detached child is a top-level session: no lineage parent, no nesting, and the pane yields to its neighbour', () => {
  const sessions = [thread('parent'), thread('first'), thread('btw', { forkedFromId: 'parent' }), thread('last')];
  const metadata = { first: btwMeta('parent', { btw: { createdAt: 1, ownTurnIds: [] } }), btw: btwMeta('parent', { btw: { createdAt: 2, ownTurnIds: [] } }),
    last: btwMeta('parent', { btw: { createdAt: 3, ownTurnIds: [] } }) };
  assert.equal(sessionParentId(sessions[2], metadata), 'parent'); assert.equal(lineageKind(sessions[2], metadata), 'fork');
  const detached = { ...metadata, btw: { ...metadata.btw, lineageDetached: true } };
  assert.equal(sessionParentId(sessions[2], detached), null, 'neither forkedFromId nor metadata.forkedFrom once detached');
  assert.equal(lineageKind(sessions[2], detached), null);
  // RO's PO keeps the active detached child, appended last. IO's A runs E (next, then previous) over the strip of the
  // render before the detach (its store subscriber holds that render's callback), so the neighbours are the pre-detach
  // ones: SourceBtwTabs hands that order to main's yieldBtwTab.
  const tabs = btwPaneTabs(sessions, detached, 'parent', 'btw'), strip = btwPaneTabs(sessions, metadata, 'parent', 'btw');
  assert.deepEqual(tabs.map(tab => tab.id), ['first', 'last', 'btw']);
  assert.deepEqual(strip.map(tab => tab.id), ['first', 'btw', 'last']);
  assert.equal(nextBtwTab(strip, 'btw')?.id, 'last');
  assert.equal(nextBtwTab(strip, 'btw', id => id === 'last')?.id, 'first', 'a neighbour open elsewhere is skipped');
  const firstBefore = btwPaneTabs(sessions, metadata, 'parent', 'first');
  const firstAfter = btwPaneTabs(sessions, { ...metadata, first: { ...metadata.first, lineageDetached: true } }, 'parent', 'first');
  assert.equal(nextBtwTab(firstBefore, 'first')?.id, 'btw', 'E over the pre-detach strip: the next tab');
  assert.equal(nextBtwTab(firstAfter, 'first')?.id, 'last', '(over the re-rendered strip it would be the last tab)');
  assert.deepEqual(btwPaneTabs(sessions, detached, 'parent', 'first').map(tab => tab.id), ['first', 'last'], 'a detached tab that is not active leaves the strip');
  // The sidebar draws it as its own row, not under the parent's family stub (without nested_less_side_chats here).
  const render = metadata => renderToStaticMarkup(h(SourceSidebar, { sessions: sessions.slice(0, 3), sessionMetadata: metadata,
    engine: { capabilities: { btwChildSessions: false } }, knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] } }));
  const stub = html => html.match(/<button[^>]*class="df-family-stub [^"]*"[^>]*aria-label="([^"]*)"/)?.[1];
  assert.equal(stub(render(metadata)), 'Show 2 nested sessions');
  const top = render(detached);
  assert.equal(stub(top), 'Show 1 nested session', 'the detached child left the family');
  assert.match(top, /Session btw/, 'and is listed as a row');
  // With nested_less_side_chats it is no longer "in the parent's tabs" either (su), so it is listed there too.
  const lessOn = renderToStaticMarkup(h(SourceSidebar, { sessions: sessions.slice(0, 3), sessionMetadata: detached, engine: { capabilities: { btwChildSessions: true } },
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.match(lessOn, /Session btw/); assert.doesNotMatch(lessOn, /Session first/);
});

test('main.jsx wires the tab menu, the detach call and the yield; the copy has zh-CN', async () => {
  const main = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('import { btwTabMenuState } from "./btw-tab-menu-model.mjs";'));
  assert.ok(main.includes('const btwTabMenu = btwTabMenuState({ sessions, metadata: shownSessionMetadata, tabs: btwTabs,\n    supported: !!boot?.connected && boot?.core?.capabilities?.btwChildSessions === true });'));
  assert.ok(main.includes("if (next) btwPane.select(current, next.id, { focus }); else closePaneTile('session');"));
  assert.ok(main.includes('const yieldBtwTab = (id, focus = false, order = btwTabs) => {\n    const next = nextBtwTab(order, id, isBtwOpenElsewhere);'),
    'the yield runs over the strip order SourceBtwTabs kept from before the detach');
  assert.ok(main.includes('tabMenu={btwTabMenu} onUnpinTab={id => updateSessionMetadata(id, { pinned: false }).catch(actionFailed("unpin"))} onDetachTab={btwPane.detach} onYieldTab={yieldBtwTab}'));
  const yieldBody = main.slice(main.indexOf('const yieldBtwTab = '), main.indexOf('};', main.indexOf('const yieldBtwTab = ')));
  assert.doesNotMatch(yieldBody, /closeChild|state\.active|tabPending/, 'IO yields even while running, and archives nothing');
  const { default: zh } = await import('../electron/i18n/zh-CN/session.mjs');
  const { default: sidebar } = await import('../electron/i18n/zh-CN/sidebar.mjs');
  assert.equal(zh['Detach to top level'], '移到顶层'); assert.equal(zh['Couldn’t detach the session. Try again.'], '无法分离此会话，请重试。');
  assert.equal(sidebar.Unpin, '取消置顶');
});

test('use-btw-pane detach: op detach with the binding; a failure calls back and shows the original copy', async () => {
  const Hook = await server.ssrLoadModule('/src/use-btw-pane.jsx');
  const calls = [], errors = [];
  let reply = async () => ({ status: 'detached' });
  const host = { currentRef: { current: 'parent' }, stateRef: { current: { threads: {}, active: {}, items: {}, approvals: [], approvalConnectionId: 'c', approvalConnectionEpoch: 3 } },
    sessionsRef: { current: [] }, metadata: {}, boot: { connected: true, core: { id: 'codex', capabilities: { btwChildSessions: true } } },
    call: async (action, params) => { calls.push({ action, ...params }); return reply(); }, tileStore: { getSession: () => null }, onError: message => errors.push(message) };
  let pane; function Harness() { pane = Hook.useBtwPane(host); return null; } renderToStaticMarkup(h(Harness));
  let failed = 0;
  assert.deepEqual(await pane.detach('child', () => failed++), { status: 'detached' });
  assert.deepEqual(calls, [{ action: 'btw-session', op: 'detach', sessionId: 'child', expected: { connectionId: 'c', connectionEpoch: 3 } }]);
  assert.equal(failed, 0); assert.deepEqual(errors, []);
  reply = async () => { throw new Error("A session that shares its parent's checkout can't be moved to top level."); };
  assert.equal(await pane.detach('child', () => failed++), null);
  reply = async () => ({ status: 'disabled', reason: 'unsupported_core' });
  assert.equal(await pane.detach('child', () => failed++), null);
  assert.equal(failed, 2); assert.deepEqual(errors, ['Couldn’t detach the session. Try again.', 'Couldn’t detach the session. Try again.']);
});
