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
import { hostSideSessionFeatures, hostSideSessionNesting, sideSessionRecord, sideSessionParents, parentTabChildIds, listedSidebarSessions } from '../src/nested-less-side-chats.mjs';
import { sessionPageRows } from '../src/sessions-page-model.mjs';

// R3-nested NBS-3: nested_less_side_chats. A live /btw child in its live parent's tabs is no sidebar row (3.6556.2
// shared-21 vq !$S, old cH !Gb) and no Code Sessions page row (cbd6c85c8 ba, old ra), $S = ba = shared-11 pw (old pb).
// cc-rest-sidebar-nested: 3.6556.2 Uf decides the nesting from Ff()'s sideChatTabStripForRows, which Ff() derives as
// `Tf(e)||Af.read()` (Tf: appFeatures.btwChildSessions; Af: the side-chat-tab-strip fallback, off per E16). The host
// builds it the same way, so with btwChildSessions a live attached /btw child is in its parent's tabs and not a row.
const app = path.resolve(import.meta.dirname, '..');
const generated = path.join(app, 'src/generated/code-current');
const latest = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const manifest = JSON.parse(readFileSync(path.join(generated, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const official = file => readFileSync(path.join(latest, file), 'utf8');
const v3 = path.resolve(app, '../reference/snapshots/claude-3.6556.2-20261025-192807/ion-dist/assets/v1');
const officialV3 = file => readFileSync(path.join(v3, file), 'utf8');
const h = React.createElement;
const btwOn = { capabilities: { btwChildSessions: true } }, btwOff = { capabilities: { btwChildSessions: false } };
const btwMeta = (parent, extra = {}) => ({ forkedFrom: parent, spawnedFrom: { sessionId: parent, sideSession: true, userFork: true, btw: true }, btw: { ownTurnIds: [] }, ...extra });
const now = Math.floor(Date.now() / 1000);
const thread = (id, fields = {}) => ({ id, name: 'Session ' + id, cwd: '/fixture/work', createdAt: now, updatedAt: now, ...fields });
// 3.6556.2: the Sessions table's selection cell (view-tabs c9c7785eb, CdsSelectableTable) reads the row selection with
// `useSyncExternalStore(subscribe, getSnapshot)` and no server snapshot (official `return i(n,r)`): the desktop renders
// it on the client only, and react-dom/server throws "Missing getServerSnapshot". The markup is rendered here as a
// client render reads it: while react-dom/server installs its dispatcher, useSyncExternalStore falls back to getSnapshot.
const renderAsClient = element => {
  const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const descriptor = Object.getOwnPropertyDescriptor(internals, 'H'), wrapped = new WeakMap();
  let raw = internals.H;
  const wrap = d => {
    if (!d?.useSyncExternalStore) return d;
    if (!wrapped.has(d)) wrapped.set(d, { ...d, useSyncExternalStore: (subscribe, get, server) => d.useSyncExternalStore(subscribe, get, server ?? get) });
    return wrapped.get(d);
  };
  Object.defineProperty(internals, 'H', { configurable: true, enumerable: descriptor.enumerable, get: () => wrap(raw), set: d => { raw = d; } });
  try { return renderToStaticMarkup(element); } finally { Object.defineProperty(internals, 'H', { ...descriptor, value: raw }); }
};
let server, SourceSidebar, SourceSessionsPage;
before(async () => {
  server = await createServer({ configFile: false, root: new URL('..', import.meta.url).pathname, plugins: [react()], server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error' });
  ({ SourceSidebar } = await server.ssrLoadModule('/src/source-sidebar.jsx'));
  ({ SourceSessionsPage } = await server.ssrLoadModule('/src/source-sessions-page.jsx'));
});
after(() => server?.close());

test('the helpers are the 3.6556.2 shared-11 / shared-26 originals (manifest, sha, bindings, feature strings)', () => {
  const entries = Object.fromEntries(manifest.modules.map(entry => [entry.target, entry]));
  const expected = {
    'nested-session-parent-tabs.mjs': ['shared-11-_AVGLHEz.js', ['jl', 'Rl', 'jd', 'Md', 'Ef', 'Rf', 'Uf']],
    'sessions-page-coordinator.mjs': ['shared-26-CGuBxVt9.js', ['qj', 'Jj']],
    'sessions-page-model.mjs': ['shared-11-_AVGLHEz.js', ['dw', 'SC', 'cw', 'jC', 'AC', 'fw', 'pw']],
  };
  for (const [target, [file, bindings]] of Object.entries(expected)) {
    const entry = entries[target];
    assert.equal(entry.referenceVersion, '3.6556.2', target);
    assert.equal(path.basename(entry.source), file, target);
    assert.equal(entry.sourceSha256, sha(readFileSync(path.join(latest, file))), target);
    assert.deepEqual(entry.bindings, bindings, target);
    const text = readFileSync(path.join(generated, target), 'utf8');
    assert.equal(entry.sha256, sha(text), target);
    assert.match(text, /^\/\/ Original Claude Desktop 3\.6556\.2 bindings/);
  }
  assert.match(readFileSync(path.join(generated, 'sessions-page-model.mjs'), 'utf8'), /import \{ isCoordinatorSession as zr \} from "\.\/sessions-page-coordinator\.mjs";/);
  const shared11 = official('shared-11-_AVGLHEz.js');
  for (const feature of [
    'function fw(e){return e._originalSession!==void 0&&zr(e._originalSession)}',
    'function pw(e){return!e.scheduledTaskId&&!e.shownInParentTabs&&!fw(e)}',
    'function Uf(e){return Rf(e)?Ef(e)?"nested_less_side_chats":"nested":"flat"}',
    'function Ef(e){return e.sideChatTabStripForRows&&!e.sideChatRowsShown}',
    'function Rf(e){return e.appFeatures?.sideSessions?.status==="supported"}',
    // Ff(), the snapshot Uf reads: the strip is Tf (btwChildSessions) or the side-chat-tab-strip fallback (E16: off here).
    'function Tf(e){return e.appFeatures?.btwChildSessions?.status==="supported"}',
    'r=Tf(e)||Af.read()', 'Pf={appFeatures:t,sideChatRowsShown:n,sideChatTabStripForRows:r}',
    'var Df="code-session-list:side-chat-tab-strip"',
    'shownInParentTabs:jt.has(e.sessionId)',
    'inParentTabs:o,drawnNestParentById:Md(i,o)',
  ]) assert.ok(shared11.includes(feature), feature);
  assert.doesNotMatch(shared11, /btwChildSessions\?\.status==="supported"\?"nested_less_side_chats"/, 'the 2.42304.0 Nu test is gone');
  assert.match(shared11, /\bpw as vt\b/);
  // jd (old su) tests the /btw side child through Rl, the same predicate su inlined.
  assert.ok(shared11.includes('function Rl(e){return e.spawnedFrom?.btw===!0&&e.spawnedFrom.sideSession===!0&&e.spawnedFrom.userFork===!0&&!e.lineageDetached}'));
  assert.ok(shared11.includes('function jd(e,t){let n=e.filter(e=>Rl(e)&&!e.isArchived&&t.has(e.sessionId));'));
  assert.ok(official('shared-26-CGuBxVt9.js').includes('qj="_coordinator";function Jj(e){return e.tags?.includes(qj)??!1}'));
  // Consumers: the sidebar rows (shared-21 vq, $S) and the Code page rows (cbd6c85c8, ba) both read shared-11 vt.
  const shared21 = official('shared-21-R7LldJ05.js'), page = official('cbd6c85c8-D1xuycDy.js');
  assert.match(shared21, /import\{[^}]*\bvt as \$S\b[^}]*\}from"\.\/shared-11-_AVGLHEz\.js"/);
  assert.ok(shared21.includes('function vq(e,t,n,r=rq){return!(r.has(e.id)||!$S(e)||'));
  assert.match(page, /import\{[^}]*\bvt as ba\b[^}]*\}from"\.\/shared-11-_AVGLHEz\.js"/);
  assert.ok(page.includes('e.ref.kind==="code"&&e.source.kind==="code"&&ba(e.source.data)'));
});

test('Uf: nested_less_side_chats needs sideSessions and the tab strip without side-chat rows; the host strip is Tf (btwChildSessions)', () => {
  const features = (side, strip, rows = false) => ({ appFeatures: { sideSessions: { status: side } }, sideChatTabStripForRows: strip, sideChatRowsShown: rows });
  assert.equal(sideSessionNesting(features('supported', true)), 'nested_less_side_chats');
  assert.equal(sideSessionNesting(features('supported', true, true)), 'nested', 'Show > Side chats lists them as rows');
  assert.equal(sideSessionNesting(features('supported', false)), 'nested');
  assert.equal(sideSessionNesting(features('unsupported', true)), 'flat');
  // Uf reads only the snapshot: btwChildSessions decides through Ff's sideChatTabStripForRows, not by itself.
  assert.equal(sideSessionNesting({ appFeatures: { sideSessions: { status: 'supported' }, btwChildSessions: { status: 'supported' } } }), 'nested');
  assert.equal(sideSessionsSupported({}), false);
  assert.deepEqual(hostSideSessionFeatures(btwOn), { appFeatures: { sideSessions: { status: 'supported' }, btwChildSessions: { status: 'supported' } }, sideChatRowsShown: false, sideChatTabStripForRows: true });
  assert.deepEqual(hostSideSessionFeatures(btwOff), { appFeatures: { sideSessions: { status: 'supported' }, btwChildSessions: { status: 'unsupported' } }, sideChatRowsShown: false, sideChatTabStripForRows: false });
  assert.equal(hostSideSessionNesting(btwOn), 'nested_less_side_chats', 'Ff: r=Tf(e)||Af.read(), Tf is btwChildSessions');
  // The Af fallback (code-session-list:side-chat-tab-strip) is off here (E16): without btwChildSessions it nests.
  assert.equal(hostSideSessionNesting(btwOff), 'nested');
  assert.equal(hostSideSessionNesting('codex'), 'nested');
  assert.equal(hostSideSessionNesting(undefined), 'nested');
  assert.equal(projectThreadNotStarted({ projectThreadStarted: true }), false);
  assert.equal(projectThreadNotStarted({}), true);
});

test('jd (old su): only a live, attached /btw child of a live parent is in the parent tabs', () => {
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

test('pw / fw / Jj (old pb / fb / WR): scheduled-task rows, rows in parent tabs and coordinator cloud rows are not listed', () => {
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

test('host projection: metadata lineage, the local archive flag, the real parent map and the nesting gate', () => {
  const sessions = [thread('parent'), thread('child'), thread('fork', { forkedFromId: 'parent' }), thread('old', { archived: true }), thread('late')];
  const metadata = { child: btwMeta('parent'), late: btwMeta('old') };
  assert.deepEqual(sideSessionRecord(sessions[1], metadata), { sessionId: 'child', spawnedFrom: metadata.child.spawnedFrom, lineageDetached: false, isArchived: false, projectThreadStarted: false });
  assert.equal(sideSessionRecord(sessions[3], metadata).isArchived, true);
  // ou: an archived parent does not hold a live child
  assert.deepEqual([...sideSessionParents(sessions, metadata)], [['child', 'parent'], ['fork', 'parent']]);
  // With btwChildSessions (Tf) the strip is on: the live child of a live parent is in the tabs; 'late' (archived parent) is not.
  assert.deepEqual([...parentTabChildIds(sessions, metadata, btwOn)], ['child']);
  assert.equal(parentTabChildIds(sessions, metadata, btwOff).size, 0);
  assert.deepEqual(listedSidebarSessions(sessions, metadata, btwOn).map(session => session.id), ['parent', 'fork', 'old', 'late']);
  assert.equal(listedSidebarSessions(sessions, metadata, btwOff), sessions);
  const strip = hostSideSessionFeatures(btwOn);
  assert.deepEqual([...parentTabChildIds(sessions, metadata, btwOff, strip)], ['child'], 'the snapshot, not the core, decides');
  assert.equal(parentTabChildIds(sessions, { ...metadata, child: btwMeta('parent', { lineageDetached: true }) }, btwOn, strip).size, 0);
  assert.equal(parentTabChildIds(sessions, metadata, btwOn, { ...strip, sideChatRowsShown: true }).size, 0);
  // pb's scheduledTaskId test does not depend on the capability; a session or its metadata may carry it
  assert.deepEqual(listedSidebarSessions([...sessions, thread('job', { scheduledTaskId: 'r1' }), thread('meta-job')], { ...metadata, 'meta-job': { scheduledTaskId: 'r2' } }, btwOff)
    .map(session => session.id), ['parent', 'child', 'fork', 'old', 'late']);
});

test('sidebar: with btwChildSessions the child is no row, no Pinned entry and no family member; without it it is a nested row', () => {
  const sessions = [thread('parent'), thread('btw'), thread('fork', { forkedFromId: 'parent' })];
  const sessionMetadata = { btw: btwMeta('parent') };
  const render = (engine, extra = {}) => renderToStaticMarkup(h(SourceSidebar, {
    sessions, sessionMetadata, engine, knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none', ...extra },
  }));
  const on = render(btwOn), off = render(btwOff);
  assert.match(on, /Session parent/); assert.match(on, /Session fork/); assert.doesNotMatch(on, /Session btw/);
  assert.match(off, /Session btw/);
  // The folded family counts only what is drawn under the parent (Md drops the in-tabs child from the parent map).
  const stub = html => html.match(/<button[^>]*class="df-family-stub [^"]*"[^>]*aria-label="([^"]*)"/)?.[1];
  assert.equal(stub(render(btwOn, { collapsedNested: ['parent'] })), 'Show 1 nested session');
  assert.equal(stub(render(btwOff, { collapsedNested: ['parent'] })), 'Show 2 nested sessions');
  // With only the /btw child under it the parent has no family at all (strip on); without the strip it is a family of one.
  const lone = engine => renderToStaticMarkup(h(SourceSidebar, { sessions: sessions.slice(0, 2), sessionMetadata, engine, knownFolders: ['/fixture/work'],
    sidebarPreferences: { groupBy: 'none', collapsedNested: ['parent'] } }));
  assert.doesNotMatch(lone(btwOn), /df-family-stub/); assert.doesNotMatch(lone(btwOn), /Session btw/);
  assert.equal(stub(lone(btwOff)), 'Show 1 nested session');
  // vq (old cH) filters before the Pinned split.
  const pinned = renderToStaticMarkup(h(SourceSidebar, { sessions, sessionMetadata: { btw: btwMeta('parent', { pinned: true }) }, engine: btwOn,
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' }, pinnedOrder: ['btw'] }));
  assert.doesNotMatch(pinned, /Session btw/);
  // Archiving the parent hands the child back to the list.
  const archived = renderToStaticMarkup(h(SourceSidebar, { sessions: [thread('parent', { archived: true }), thread('btw')], sessionMetadata, engine: btwOn,
    knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.match(archived, /Session btw/);
  // vq is the Code list's filter; the Cowork list keeps every row.
  const cowork = renderToStaticMarkup(h(SourceSidebar, { mode: 'cowork', sessions: [...sessions, thread('routine', { scheduledTaskId: 'r1' })], sessionMetadata,
    engine: btwOn, knownFolders: ['/fixture/work'], sidebarPreferences: { groupBy: 'none' } }));
  assert.match(cowork, /Session btw/); assert.match(cowork, /Session routine/);
  // The wiring is the one vq filter in the Code list, ahead of the sections and classic builders.
  const code = readFileSync(path.join(app, 'src/source-sidebar.jsx'), 'utf8');
  assert.ok(code.includes('const listedSessions = useMemo(() => mode === "code" ? listedSidebarSessions(sourceSessions, sessionMetadata, engine) : sourceSessions, [mode, sourceSessions, sessionMetadata, engine]);'));
  assert.ok(code.includes('buildSidebarSections({ sections: sectionsList, sessions: listedSessions,'));
  assert.ok(code.includes('buildSidebarGroups({ sessions: listedSessions,'));
});

test('Sessions page: rows pass pw (ba) before the surface filter; the engine prop carries the capability', () => {
  const sessions = [thread('parent', { updatedAtMs: Date.now() }), thread('btw'), thread('done', { archived: true }), thread('job', { scheduledTaskId: 'routine' })];
  const metadata = { btw: btwMeta('parent'), done: btwMeta('parent') };
  const ids = rows => rows.map(row => row.ref.id).sort();
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOn })), ['parent']);
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOff })), ['btw', 'parent']);
  // an archived child is never in the tabs (jd !isArchived), so it stays on the Archived tab
  assert.deepEqual(ids(sessionPageRows(sessions, { metadata, engine: btwOn, surface: 'archived' })), ['done']);
  for (const engine of [btwOn, btwOff]) for (const row of sessionPageRows(sessions, { metadata, engine })) assert.equal(row.source.data.shownInParentTabs, false);
  assert.throws(() => renderToStaticMarkup(h(SourceSessionsPage, { sessions, metadata, engine: btwOn })), /Missing getServerSnapshot/, 'the official table is client-only');
  const html = renderAsClient(h(SourceSessionsPage, { sessions, metadata, engine: btwOn }));
  assert.match(html, /Session parent/); assert.doesNotMatch(html, /Session btw/); assert.doesNotMatch(html, /Session job/);
  assert.match(renderAsClient(h(SourceSessionsPage, { sessions, metadata, engine: btwOff })), /Session btw/);
  const main = readFileSync(path.join(app, 'src/main.jsx'), 'utf8');
  assert.ok(main.includes('sessions={sidebarSessions} state={state} metadata={shownSessionMetadata} repoIdentities={repoIdentities} engine={boot?.core}'));
});
