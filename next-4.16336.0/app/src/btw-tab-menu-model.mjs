// R3-nested NBS-4: the /btw side-chat tab menu's state, 2.42304.0 cccc2cf0a RO:
//   p = oa(wt((e) => s.map((t) => Sa(e.sessions, t))))       detachable: shared-11 df (generated detach-eligibility.mjs)
//   m = kt(wt((e) => s.map((t) => e.starredIds.includes(t)))) pinned
// and N(id) draws LO only when `m[t] || p[t]`. Host adapter: the session records df reads are the local sessions
// projected as nested-less-side-chats sideSessionRecord (sessionId, isArchived, spawnedFrom, lineageDetached); a pin
// is the renderer's session metadata `pinned` (main.jsx shownSessionMetadata, which also carries a Codex Pinned
// section); `supported` is the bridge side of df's uf — a connected core that keeps /btw children, the only one the
// local btw-session op 'detach' serves.
import { sideSessionDetachable } from './generated/btw-pane/detach-eligibility.mjs';
import { sideSessionRecord } from './nested-less-side-chats.mjs';

const EMPTY = new Map();

export function btwTabMenuState({ sessions = [], metadata = {}, tabs = [], supported = false } = {}) {
  if (!tabs.length) return EMPTY;
  const records = supported ? sessions.filter(session => session?.id).map(session => sideSessionRecord(session, metadata)) : null;
  const state = new Map();
  for (const tab of tabs) {
    if (!tab?.id) continue;
    state.set(tab.id, { pinned: metadata[tab.id]?.pinned === true, detachable: !!records && sideSessionDetachable(records, tab.id) });
  }
  return state;
}
