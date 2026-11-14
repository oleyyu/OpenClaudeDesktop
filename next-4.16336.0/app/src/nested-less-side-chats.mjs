// R3-nested NBS-3: nested_less_side_chats. A live /btw child shown in its live parent's side-chat tabs is not a sidebar
// row (shared-21 cH `!Gb(e)`) or a Code Sessions page row (cbd6c85c8 gd `ra(e.source.data)`): Gb / ra are shared-11 pb,
// `!scheduledTaskId && !shownInParentTabs && !fb(e)`, and shownInParentTabs is `tt.has(sessionId)` with tt = _g's
// inParentTabs = su(sessions, ou(sessions)). The original helpers (3.6556.2 shared-11 Uf/Rf, jd, Md, jl; 2.42304.0 pb,
// fb, WR) are in generated/code-current/nested-session-parent-tabs.mjs and sessions-page-model.mjs; this module only
// projects the local records onto them.
import {sessionArchived,sessionParentId} from './sidebar-model.js';
import {sideSessionNesting,btwChildrenInParentTabs} from './generated/code-current/nested-session-parent-tabs.mjs';
import {isListedSession} from './generated/code-current/sessions-page-model.mjs';
import {hostAppFeatures} from './host-app-features.mjs';

const NONE = new Set();

// The host form of shared-11 Ff(), the snapshot 3.6556.2 Uf reads: {appFeatures, sideChatRowsShown,
// sideChatTabStripForRows}. Rf: the local sidebar always nests side sessions and forks under their parent
// (sessionParentId), so sideSessions is supported. btwChildSessions stays the connected core's capability (electron/
// main.cjs coreInfo: supportsBtwChildren, a Codex core). sideChatTabStripForRows is Ff()'s own derivation,
// `r=Tf(e)||Af.read()`: Tf is that btwChildSessions check (`e.appFeatures?.btwChildSessions?.status==="supported"`), the
// same capability main.jsx shows the /btw tab strip by, so a child shown in the strip is not also a row. Af, the
// "code-session-list:side-chat-tab-strip" fallback flag, is off here (E16), so it adds nothing. sideChatRowsShown is
// lf(), Show > Side chats (E81: offered whenever the strip is, source-sidebar-sections-adapters useSideChatRowsShown),
// the caller's `rowsShown`. So with btwChildSessions and the rows not shown Uf (Ef) is nested_less_side_chats, else
// "nested".
// Af.read(): the "code-session-list:side-chat-tab-strip" fallback flag, off in this host (E16).
// W14-code r8 gates-r8-02: appFeatures is the host's one table (host-app-features.mjs, the desktop's desktopBootFeatures
// answer), btwChildSessions answered for the core.
const SIDE_CHAT_TAB_STRIP_FALLBACK = false;
export function hostSideSessionFeatures(core, rowsShown = false) {
  const appFeatures = hostAppFeatures(core);
  const btw = appFeatures.btwChildSessions.status === 'supported';
  return {appFeatures, sideChatRowsShown: rowsShown === true, sideChatTabStripForRows: btw || SIDE_CHAT_TAB_STRIP_FALLBACK};
}

// The desktop session fields jd (old su) reads (shared-11 Rl, old Pl): spawnedFrom and lineageDetached are the local
// session metadata (electron/btw-sessions.cjs create writes {sessionId, sideSession, userFork, btw}), isArchived the
// local archive flag. There is no Cowork project thread locally, so jl (old Fl, `projectThreadStarted !== true`) holds.
export function sideSessionRecord(session, metadata = {}) {
  const meta = metadata?.[session.id] ?? {};
  return {sessionId: session.id, spawnedFrom: meta.spawnedFrom, lineageDetached: meta.lineageDetached === true,
    isArchived: sessionArchived(session), projectThreadStarted: false};
}

// Stand-in for shared-11 ou (the nest parent map jd is given): a session's parent from the real lineage fields
// (sessionParentId), kept only when that parent is in the list and, as in ou, not when an archived parent would hold a
// live child. su only asks whether a child has an entry.
export function sideSessionParents(sessions = [], metadata = {}) {
  const byId = new Map(sessions.map(session => [session.id, session])), parents = new Map();
  for (const session of sessions) {
    const parentId = sessionParentId(session, metadata), parent = parentId ? byId.get(parentId) : undefined;
    if (parent && !(sessionArchived(parent) && !sessionArchived(session))) parents.set(session.id, parentId);
  }
  return parents;
}

// _g `o = su(r ? e : J, i)`: every session's in-tabs state once the nesting is nested_less_side_chats, else none.
// `features` is the Ff() snapshot (hostSideSessionFeatures by default: nests less exactly when btwChildSessions is on).
export function parentTabChildIds(sessions = [], metadata = {}, core, features = hostSideSessionFeatures(core)) {
  if (sideSessionNesting(features) !== 'nested_less_side_chats') return NONE;
  const list = sessions.filter(session => session?.id);
  const ids = btwChildrenInParentTabs(list.map(session => sideSessionRecord(session, metadata)), sideSessionParents(list, metadata));
  return ids.size ? ids : NONE;
}

// The row fields pb reads (shared-11 builds them onto the sidebar row): scheduledTaskId from the session (or its local
// metadata, the field btw-sessions.cjs parentRefusal reads), shownInParentTabs from su. _originalSession (fb, the
// coordinator tag through shared-8 WR) exists only on a remote cloud row; local rows have none, so fb is false.
// W14-code r4 gen-final-4 (fr4-06): `runTasks` (sessionId → task, source-sidebar-routines useRoutineRunTasks) names the
// task of a run the scheduler recorded (task.runs[].threadId) whose metadata does not, so every routine run is a CCD
// session with a scheduledTaskId as in the desktop.
export function listedSessionFields(session, metadata = {}, inParentTabs = NONE, runTasks = undefined) {
  return {scheduledTaskId: session.scheduledTaskId ?? metadata?.[session.id]?.scheduledTaskId ?? runTasks?.get(session.id), shownInParentTabs: inParentTabs.has(session.id)};
}

// shared-21 cH `!Gb(e)`: the sessions the Code sidebar lists rows for. Entries without an id are left for the list
// builders to drop as before; the same array comes back when nothing is excluded.
export function listedSidebarSessions(sessions = [], metadata = {}, core, rowsShown = false, runTasks = undefined) {
  const inParentTabs = parentTabChildIds(sessions, metadata, core, hostSideSessionFeatures(core, rowsShown));
  const listed = sessions.filter(session => !session?.id || isListedSession(listedSessionFields(session, metadata, inParentTabs, runTasks)));
  return listed.length === sessions.length ? sessions : listed;
}
