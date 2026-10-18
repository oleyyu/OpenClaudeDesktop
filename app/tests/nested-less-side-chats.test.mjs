import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { sideSessionsSupported, sideSessionNesting, projectThreadNotStarted, btwChildrenInParentTabs, withoutParentTabChildren } from '../src/generated/code-current/nested-session-parent-tabs.mjs';
import { coordinatorSessionTag, isCoordinatorSession } from '../src/generated/code-current/sessions-page-coordinator.mjs';
import { isListedSession, isCoordinatorSessionRow } from '../src/generated/code-current/sessions-page-model.mjs';
import { hostSideSessionNesting, sideSessionRecord, sideSessionParents, parentTabChildIds, listedSidebarSessions } from '../src/nested-less-side-chats.mjs';
import { sessionPageRows } from '../src/sessions-page-model.mjs';

// R3-nested NBS-3: 2.42304.0 nested_less_side_chats. A live /btw child in its live parent's tabs is no sidebar row
// (shared-21 cH !Gb) and no Code Sessions page row (cbd6c85c8 ra), Gb = ra = shared-11 pb.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const latest = path.resolve(app, '../reference/installed-2.42304.0-20261017/ion-dist/assets/v1');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const official = file => readFileSync(path.join(latest, file), 'utf8');
const h = React.createElement;
const btwOn = { capabilities: { btwChildSessions: true } }, btwOff = { capabilities: { btwChildSessions: false } };
const btwMeta = (parent, extra = {}) => ({ forkedFrom: parent, spawnedFrom: { sessionId: parent, sideSession: true, userFork: true, btw: true }, btw: { ownTurnIds: [] }, ...extra });
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
let server, SourceSidebar, SourceSessionsPage;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
  ({ SourceSessionsPage } = await server.ssrLoadModule('/src/source-sessions-page.jsx'));
});
after(() => server?.close());

test('the helpers are the 2.42304.0 shared-11 / shared-8 originals (manifest, sha, bindings, feature strings)', () => {
  const entries = Object.fromEntries(manifest.modules.map(entry => [entry.target, entry]));
  const expected = {
    'nested-session-parent-tabs.mjs': ['shared-11-BuQ3CK5I.js', ['Ou', 'Nu', 'Fl', 'su', 'cu']],
    'sessions-page-coordinator.mjs': ['shared-8-B5lJ8U5C.js', ['UR', 'WR']],
    'sessions-page-model.mjs': ['shared-11-BuQ3CK5I.js', ['db', 'Ny', 'cb', 'Hy', 'Vy', 'fb', 'pb']],
  };
  for (const [target, [file, bindings]] of Object.entries(expected)) {
    const entry = entries[target];
    assert.equal(entry.referenceVersion, '2.42304.0', target);
    assert.equal(path.basename(entry.source), file, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(latest, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(entry.sha256, sha(text), target);
    assert.match(text, /^\/\/ Original Claude Desktop 2\.42304\.0 bindings/);
  }
  assert.match(readFileSync(path.join(generated, 'sessions-page-model.mjs'), 'utf8'), /import \{ isCoordinatorSession as ro \} from "\.\/sessions-page-coordinator\.mjs";/);
  const shared11 = official('shared-11-BuQ3CK5I.js'), shared8 = official('shared-8-B5lJ8U5C.js');
  for (const feature of [
    'function fb(e){return e._originalSession!==void 0&&ro(e._originalSession)}',
    'function pb(e){return!e.scheduledTaskId&&!e.shownInParentTabs&&!fb(e)}',
    'var Nu=e=>Ou(e)?e.appFeatures?.btwChildSessions?.status==="supported"?"nested_less_side_chats":"nested":"flat"',
    'shownInParentTabs:tt.has(e.sessionId)',
    'inParentTabs:o,drawnNestParentById:cu(i,o)',
  ]) assert.ok(shared11.includes(feature), feature);
  assert.match(shared11, /import\{[^}]*\bpt as ro\b[^}]*\}from"\.\/shared-8-B5lJ8U5C\.js"/);
  assert.match(shared11, /\bpb as ot\b/);
  assert.ok(shared8.includes('UR="_coordinator";function WR(e){return e.tags?.includes(UR)??!1}'));
  assert.match(shared8, /\bWR as pt\b/);
  // Consumers: the sidebar rows (shared-21 cH, Gb) and the Code page rows (cbd6c85c8 gd, ra) both read shared-11 ot.
  const shared21 = official('shared-21-IP-SVetq.js'), page = official('cbd6c85c8-PO73iD62.js');
  assert.match(shared21, /import\{[^}]*\bot as Gb\b[^}]*\}from"\.\/shared-11-BuQ3CK5I\.js"/);
  assert.ok(shared21.includes('function cH(e,t,n,r=QV){return!(r.has(e.id)||!Gb(e)||'));
  assert.match(page, /import\{[^}]*\bot as ra\b[^}]*\}from"\.\/shared-11-BuQ3CK5I\.js"/);
  assert.ok(page.includes('e.ref.kind==="code"&&e.source.kind==="code"&&ra(e.source.data)'));
});

test('Nu: nested_less_side_chats needs sideSessions and btwChildSessions; the host maps the core capability', () => {
  const features = (side, btw) => ({ appFeatures: { sideSessions: { status: side }, btwChildSessions: { status: btw } } });
  assert.equal(sideSessionNesting(features('supported', 'supported')), 'nested_less_side_chats');
  assert.equal(sideSessionNesting(features('supported', 'unsupported')), 'nested');
  assert.equal(sideSessionNesting(features('unsupported', 'supported')), 'flat');
  assert.equal(sideSessionsSupported({}), false);
  assert.equal(hostSideSessionNesting(btwOn), 'nested_less_side_chats');
  assert.equal(hostSideSessionNesting(btwOff), 'nested');
  assert.equal(hostSideSessionNesting('codex'), 'nested');
  assert.equal(hostSideSessionNesting(undefined), 'nested');
  assert.equal(projectThreadNotStarted({ projectThreadStarted: true }), false);
  assert.equal(projectThreadNotStarted({}), true);
});

test('su: only a live, attached /btw child of a live parent is in the parent tabs', () => {
  const btw = (id, parent, extra = {}) => ({ sessionId: id, spawnedFrom: { sessionId: parent, sideSession: true, userFork: true, btw: true }, ...extra });
  const parents = new Map([['child', 'parent'], ['fork', 'parent'], ['detached', 'parent'], ['gone', 'parent'], ['orphan', 'missing']]);
  const records = [{ sessionId: 'parent' }, btw('child', 'parent'), { sessionId: 'fork', spawnedFrom: { sessionId: 'parent', sideSession: true, userFork: true } },
    btw('detached', 'parent', { lineageDetached: true }), btw('gone', 'parent', { isArchived: true }), btw('orphan', 'missing'), btw('loose', 'parent')];
  assert.deepEqual([...btwChildrenInParentTabs(records, parents)], ['child']);
  // the parent archived, or a Cowork project thread already started on it: the child is a row again
  assert.equal(btwChildrenInParentTabs([{ sessionId: 'parent', isArchived: true }, btw('child', 'parent')], parents).size, 0);
  assert.equal(btwChildrenInParentTabs([{ sessionId: 'parent', projectThreadStarted: true }, btw('child', 'parent')], parents).size, 0);
  const drawn = withoutParentTabChildren(parents, new Set(['child']));
  assert.deepEqual([...drawn.keys()], ['fork', 'detached', 'gone', 'orphan']);
  assert.equal(withoutParentTabChildren(parents, new Set()), parents);
});

test('pb / fb / WR: scheduled-task rows, rows in parent tabs and coordinator cloud rows are not listed', () => {
  assert.equal(coordinatorSessionTag, '_coordinator');
  assert.equal(isCoordinatorSession({ tags: ['x', '_coordinator'] }), true);
  assert.equal(isCoordinatorSession({}), false);
  assert.equal(isCoordinatorSessionRow({}), false);
  assert.equal(isCoordinatorSessionRow({ _originalSession: { tags: ['_coordinator'] } }), true);
  assert.equal(isListedSession({}), true);
  assert.equal(isListedSession({ scheduledTaskId: 'job' }), false);
  assert.equal(isListedSession({ shownInParentTabs: true }), false);
  assert.equal(isListedSession({ _originalSession: { tags: ['_coordinator'] } }), false);
  assert.equal(isListedSession({ _originalSession: { tags: [] } }), true);
});

test('host projection: metadata lineage, the local archive flag, the real parent map and the capability gate', () => {
  const sessions = [thread('parent'), thread('child'), thread('fork', { forkedFromId: 'parent' }), thread('old', { archived: true }), thread('late')];
  const metadata = { child: btwMeta('parent'), late: btwMeta('old') };
  assert.deepEqual(sideSessionRecord(sessions[1], metadata), { sessionId: 'child', spawnedFrom: metadata.child.spawnedFrom, lineageDetached: false, isArchived: false, projectThreadStarted: false });
  assert.equal(sideSessionRecord(sessions[3], metadata).isArchived, true);
  // ou: an archived parent does not hold a live child
  assert.deepEqual([...sideSessionParents(sessions, metadata)], [['child', 'parent'], ['fork', 'parent']]);
  assert.deepEqual([...parentTabChildIds(sessions, metadata, btwOn)], ['child']);
  assert.equal(parentTabChildIds(sessions, metadata, btwOff).size, 0);
  assert.equal(parentTabChildIds(sessions, { ...metadata, child: btwMeta('parent', { lineageDetached: true }) }, btwOn).size, 0);
  const listed = listedSidebarSessions(sessions, metadata, btwOn);
  assert.deepEqual(listed.map(session => session.id), ['parent', 'fork', 'old', 'late']);
  assert.equal(listedSidebarSessions(sessions, metadata, btwOff), sessions);
  // pb's scheduledTaskId test does not depend on the capability; a session or its metadata may carry it
  assert.deepEqual(listedSidebarSessions([...sessions, thread('job', { scheduledTaskId: 'r1' }), thread('meta-job')], { ...metadata, 'meta-job': { scheduledTaskId: 'r2' } }, btwOff)
    .map(session => session.id), ['parent', 'child', 'fork', 'old', 'late']);
});

test('sidebar: with btwChildSessions the child is no row, no Pinned entry and no family member; without it nothing changes', () => {
  const sessions = [thread('parent'), thread('btw'), thread('fork', { forkedFromId: 'parent' })];
  const sessionMetadata = { btw: btwMeta('parent') };
  const render = (engine, extra = {}) => renderToStaticMarkup(h(SourceSidebar, {
    sessions, sessionMetadata, engine, knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none', ...extra },
  }));
  const on = render(btwOn), off = render(btwOff);
  assert.match(on, /Session parent/); assert.match(on, /Session fork/); assert.doesNotMatch(on, /Session btw/);
  assert.match(off, /Session btw/);
  // The folded family counts only what is drawn under the parent (cu drops the in-tabs child from the parent map).
  const stub = html => html.match(/<button[^>]*class="df-family-stub [^"]*"[^>]*aria-label="([^"]*)"/)?.[1];
  assert.equal(stub(render(btwOn, { collapsedNested: ['parent'] })), 'Show 1 nested session');
  assert.equal(stub(render(btwOff, { collapsedNested: ['parent'] })), 'Show 2 nested sessions');
  // With only the /btw child under it the parent has no family at all.
  const lone = renderToStaticMarkup(h(SourceSidebar, { sessions: sessions.slice(0, 2), sessionMetadata, engine: btwOn, knownFolders: ['/fixture/work'],
    sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] } }));
  assert.doesNotMatch(lone, /df-family-stub/); assert.doesNotMatch(lone, /Session btw/);
  // cH filters before the Pinned split.
  const pinned = renderToStaticMarkup(h(SourceSidebar, { sessions, sessionMetadata: { btw: btwMeta('parent', { pinned: true }) }, engine: btwOn,
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' }, pinnedOrder: ['btw'] }));
  assert.doesNotMatch(pinned, /Session btw/);
  // Archiving the parent hands the child back to the list.
  const archived = renderToStaticMarkup(h(SourceSidebar, { sessions: [thread('parent', { archived: true }), thread('btw')], sessionMetadata, engine: btwOn,
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.match(archived, /Session btw/);
  // cH is the Code list's filter; the Cowork list (shared-21 RH's cowork branch keeps scheduled tasks) is left as it was.
  const cowork = renderToStaticMarkup(h(SourceSidebar, { mode: 'cowork', sessions: [...sessions, thread('routine', { scheduledTaskId: 'r1' })], sessionMetadata,
    engine: btwOn, knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.match(cowork, /Session btw/); assert.match(cowork, /Session routine/);
  // The wiring is the one cH filter in the Code list, ahead of the sections and classic builders.
  const code = readFileSync(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  assert.ok(code.includes('const listedSessions = useMemo(() => mode === "code" ? listedSidebarSessions(sourceSessions, sessionMetadata, engine) : sourceSessions, [mode, sourceSessions, sessionMetadata, engine]);'));
  assert.ok(code.includes('buildSidebarSections({ sections: sectionsList, sessions: listedSessions,'));
  assert.ok(code.includes('buildSidebarGroups({ sessions: listedSessions,'));
});

test('Sessions page: rows pass pb (ra) before the surface filter; the engine prop carries the capability', () => {
  const sessions = [thread('parent', { updatedAtMs: Date.now() }), thread('btw'), thread('done', { archived: true }), thread('job', { scheduledTaskId: 'routine' })];
  const metadata = { btw: btwMeta('parent'), done: btwMeta('parent') };
  const ids = rows => rows.map(row => row.ref.id).sort();
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOn })), ['parent']);
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOff })), ['btw', 'parent']);
  // an archived child is never in the tabs (su !isArchived), so it stays on the Archived tab
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOn, surface: 'archived' })), ['done']);
  const [row] = sessionPageRows(sessions, { metadata, engine: btwOn });
  assert.equal(row.source.data.shownInParentTabs, false);
  assert.equal(sessionPageRows(sessions, { metadata, engine: btwOff }).find(entry => entry.ref.id === 'btw').source.data.shownInParentTabs, false);
  const html = renderToStaticMarkup(h(SourceSessionsPage, { sessions, metadata, engine: btwOn }));
  assert.match(html, /Session parent/); assert.doesNotMatch(html, /Session btw/); assert.doesNotMatch(html, /Session job/);
  assert.match(renderToStaticMarkup(h(SourceSessionsPage, { sessions, metadata, engine: btwOff })), /Session btw/);
  const main = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('sessions={sidebarSessions} state={state} metadata={shownSessionMetadata} repoIdentities={repoIdentities} engine={boot?.core}'));
});
