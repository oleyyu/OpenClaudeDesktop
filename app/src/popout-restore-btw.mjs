// R4i-transcript TR3 (layout-08): the /btw side pane ("session" tile) popped out into a window of its own.
//
// 2.42304.0 (renderer, ion-dist/assets/v1):
// - cccc2cf0a XO: the pane header's Pop out opens `{type:"epitaxy-side-pane",sessionId:e.id,sessionType:e.type,
//   paneTileId:t,title:n,...i,...r}` (i = the tile's view: for "session", sessionView) and then calls closeSidePane(t)
//   (`closeSidePane:le`), not the tile's onClose (`onClose:Te`): popping out never closes the /btw child itself.
//   qO only offers it in a main window (`P=(Xu(e)||b)&&!v`, v = isPopoutHost) and not for a /btw draft
//   (`owner:P&&W===void 0?u:null`, W = sh(sessionView.sessionId)).
// - cc43287c9: a tile dragged out of the window pops out the same way, except a /btw draft
//   (`a==="session"&&EN(o.sessionView?.sessionId)!==void 0)return!1`; c73f45bc3 `var tu="btw-draft:"`, ru).
// - shared-11 Eo.openPopout: one side-pane popout per session and tile (mo `epitaxy-pane:${e}:${t}`); popping out
//   again updates that window's entry (`{...o,...r,title:r.title??o.title}`) and focuses it.
// - cd377abb5 _r/xr/Cr/Sr: the popout's sessionView `{sessionId,title (max gr=512),btwSince?}` is saved at quit and
//   restored at relaunch; `vr=new Set(["subagent","session","cr"])` — a "session" popout without a view is dropped.
// - c5638815a bt: the popout window seeds its own pane store from the entry (`v&&e.setSessionView(v)`); its dock
//   (U) parks the tile back in the main window and closes the popout.
// - shared-11 closeSidePanePopoutsForSession: the "session" popout showing a removed child closes too
//   (`i.paneTileId==="session"&&i.sessionView?.sessionId===t`; window-registry.cjs sidePanePopoutsForSession).
//
// Host: each popout is its own renderer (main.cjs openPopout pane "session", an App pane window, src/source-split-view
// APP_PANE_WINDOW_KINDS), so the view travels through popout-open / popout-state / popout-session-view /
// popout-docked instead of a shared store. Pure functions, unit-tested in tests/btw-popout-window.test.mjs.

export const BTW_POPOUT_PANE = "session";
/** cd377abb5 `gr=512`: the saved title's cap. */
export const BTW_VIEW_TITLE_MAX = 512;
/** c73f45bc3 `var tu="btw-draft:"`. */
export const BTW_DRAFT_PREFIX = "btw-draft:";

const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value);

/** c73f45bc3 ru: the parent id of a /btw draft id, else undefined. */
export function btwDraftParent(id) {
  return typeof id === "string" && id.startsWith(BTW_DRAFT_PREFIX) ? id.slice(BTW_DRAFT_PREFIX.length) : undefined;
}

/** cd377abb5 _r sessionView: `{sessionId, title: max 512, btwSince?: number}`; anything else is no view (null). */
export function btwSessionView(value) {
  if (!value || typeof value !== "object" || !validId(value.sessionId) || btwDraftParent(value.sessionId) !== undefined) return null;
  const title = typeof value.title === "string" && value.title ? value.title.slice(0, BTW_VIEW_TITLE_MAX) : value.sessionId;
  return { sessionId: value.sessionId, title, ...(Number.isFinite(value.btwSince) ? { btwSince: value.btwSince } : {}) };
}

/**
 * The view of the /btw child a session tile shows, for its Pop out (qO Pe) and tear-off (cc43287c9), or null when it
 * cannot pop out: no child, or a /btw draft. `meta`: the child's metadata (title; btw.createdAt stands in for the
 * official btwSince, the time its parent asked).
 */
export function btwPopoutView({ childId, title, meta } = {}) {
  if (!validId(childId) || btwDraftParent(childId) !== undefined) return null;
  const since = meta?.btw?.createdAt;
  return btwSessionView({ sessionId: childId, title: typeof title === "string" && title ? title : childId, btwSince: Number.isFinite(since) ? since : undefined });
}

/** XO's openPopout, as main.cjs popout-open takes it: the parent's "session" tile carrying the child's view. */
export function btwPopoutRequest({ parentId, view, position = null } = {}) {
  const sessionView = btwSessionView(view);
  if (!validId(parentId) || !sessionView) return null;
  return { sessionId: parentId, pane: BTW_POPOUT_PANE, sessionView, ...(position && Number.isFinite(position.x) && Number.isFinite(position.y) ? { position: { x: position.x, y: position.y } } : {}) };
}

/**
 * Whether a popout (main.cjs popoutList) shows `childId`: its own popouts, or a "session" popout whose view is that
 * child (shared-11 closeSidePanePopoutsForSession's test). `self`: this pane window's own popout, which never counts
 * as "elsewhere" for itself.
 */
export function btwPopoutHolds(popouts, childId, { self = null } = {}) {
  if (!validId(childId)) return false;
  return (Array.isArray(popouts) ? popouts : []).some((entry) => {
    if (!entry || (self && entry.sessionId === self.sessionId && entry.pane === self.pane)) return false;
    return entry.sessionId === childId || (entry.pane === BTW_POPOUT_PANE && entry.sessionView?.sessionId === childId);
  });
}

/**
 * Where a closed /btw popout docks back (c5638815a U parks the tile in the main window): {parentId, childId}, or null
 * for any other popout, one closed because its session was removed (closeSidePanePopoutsForSession drops it), one
 * whose last tab closed (entryPoint "close": the window closes with its child, main.jsx closePaneTile), or one without
 * a view.
 */
export function btwDockTarget(event) {
  if (!event || event.kind !== "popout-docked" || event.pane !== BTW_POPOUT_PANE || event.entryPoint === "session-removed" || event.entryPoint === "close" || !validId(event.sessionId)) return null;
  const view = btwSessionView(event.sessionView);
  return view ? { parentId: event.sessionId, childId: view.sessionId } : null;
}

/** c5638815a bt `v&&e.setSessionView(v)`: the pane window's tile store shows the popout's child. Returns the child id. */
export function seedBtwPaneWindow(tileStore, parentId, view) {
  const sessionView = btwSessionView(view);
  if (!tileStore || !validId(parentId) || !sessionView) return null;
  if (tileStore.getSession?.(parentId)?.btwSessionId !== sessionView.sessionId) tileStore.setSession(parentId, { btwSessionId: sessionView.sessionId });
  return sessionView.sessionId;
}
