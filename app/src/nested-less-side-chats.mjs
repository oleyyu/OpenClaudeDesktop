// R3-nested NBS-3: 2.42304.0 nested_less_side_chats. A live /btw child shown in its live parent's side-chat tabs is
// not a sidebar row (shared-21 cH `!Gb(e)`) or a Code Sessions page row (cbd6c85c8 gd `ra(e.source.data)`): Gb / ra are
// shared-11 pb, `!scheduledTaskId && !shownInParentTabs && !fb(e)`, and shownInParentTabs is `tt.has(sessionId)` with
// tt = _g's inParentTabs = su(sessions, ou(sessions)). The original helpers (Nu/Ou, su, cu, Fl, pb, fb, WR) are in
// generated/code-current/nested-session-parent-tabs.mjs and sessions-page-model.mjs; this module only projects the local
// records onto them.
import {sessionArchived,sessionParentId} from './sidebar-model.js';
import {sideSessionNesting,btwChildrenInParentTabs} from './generated/code-current/nested-session-parent-tabs.mjs';
import {isListedSession} from './generated/code-current/sessions-page-model.mjs';

const NONE = new Set();

// Host appFeatures for shared-11 Nu (Ou: sideSessions; then btwChildSessions). The local sidebar always nests side
// sessions and forks under their parent (sessionParentId), so sideSessions is supported; btwChildSessions is the
// connected core's capability (electron/main.cjs coreInfo: supportsBtwChildren, a Codex core).
export function hostSideSessionFeatures(core) {
  const btw = core && typeof core === 'object' && core.capabilities?.btwChildSessions === true;
  return {appFeatures: {sideSessions: {status: 'supported'}, btwChildSessions: {status: btw ? 'supported' : 'unsupported'}}};
}
export const hostSideSessionNesting = core => sideSessionNesting(hostSideSessionFeatures(core));

// The desktop session fields su reads (shared-11 Pl): spawnedFrom and lineageDetached are the local session metadata
// (electron/btw-sessions.cjs create writes {sessionId, sideSession, userFork, btw}), isArchived the local archive flag.
// There is no Cowork project thread locally, so Fl (`projectThreadStarted !== true`) always holds.
export function sideSessionRecord(session, metadata = {}) {
  const meta = metadata?.[session.id] ?? {};
  return {sessionId: session.id, spawnedFrom: meta.spawnedFrom, lineageDetached: meta.lineageDetached === true,
    isArchived: sessionArchived(session), projectThreadStarted: false};
}

// Stand-in for shared-11 ou (the nest parent map su is given): a session's parent from the real lineage fields
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
export function parentTabChildIds(sessions = [], metadata = {}, core) {
  if (hostSideSessionNesting(core) !== 'nested_less_side_chats') return NONE;
  const list = sessions.filter(session => session?.id);
  const ids = btwChildrenInParentTabs(list.map(session => sideSessionRecord(session, metadata)), sideSessionParents(list, metadata));
  return ids.size ? ids : NONE;
}

// The row fields pb reads (shared-11 builds them onto the sidebar row): scheduledTaskId from the session (or its local
// metadata, the field btw-sessions.cjs parentRefusal reads), shownInParentTabs from su. _originalSession (fb, the
// coordinator tag through shared-8 WR) exists only on a remote cloud row; local rows have none, so fb is false.
export function listedSessionFields(session, metadata = {}, inParentTabs = NONE) {
  return {scheduledTaskId: session.scheduledTaskId ?? metadata?.[session.id]?.scheduledTaskId, shownInParentTabs: inParentTabs.has(session.id)};
}

// shared-21 cH `!Gb(e)`: the sessions the Code sidebar lists rows for. Entries without an id are left for the list
// builders to drop as before; the same array comes back when nothing is excluded.
export function listedSidebarSessions(sessions = [], metadata = {}, core) {
  const inParentTabs = parentTabChildIds(sessions, metadata, core);
  const listed = sessions.filter(session => !session?.id || isListedSession(listedSessionFields(session, metadata, inParentTabs)));
  return listed.length === sessions.length ? sessions : listed;
}
