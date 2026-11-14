// Reopen Closed Session (⇧⌘T, File > Reopen Closed Session). Pure, so the stack and the plan are
// unit-testable without a window.
// - ion-dist shared-19-CjdiaR4X.js Wh/Kh/qh/Jh: Kh records a closed code session newest first and
//   drops an older entry for the same session; qh pops the newest entry whose session still exists
//   (Gh), discarding the stale ones it skipped; Jh: reopen is enabled while any entry still exists.
// - ion-dist cb24e6301-6olw3OC9.js D (_test.planReopen): a session already shown is focused; with
//   room for a split it opens as a pane; otherwise the view navigates to it. There is no split view
//   locally, so the plan is 'focus' or 'navigate'.
// The source's Wh store is an unbounded in-memory list; locally it is bounded (a renderer-lifetime
// list of ids) so a long session cannot grow it without limit.
export const CLOSED_SESSION_LIMIT = 50;

/** Kh: newest first, one entry per session id. */
export function pushClosedSession(stack, id, { limit = CLOSED_SESSION_LIMIT } = {}) {
  const list = Array.isArray(stack) ? stack : [];
  if (typeof id !== "string" || id === "") return list;
  const next = [id, ...list.filter((entry) => entry !== id)];
  return next.length > limit ? next.slice(0, limit) : next;
}

/** qh: the newest id that still exists, and the stack after it (skipped stale ids are dropped). */
export function popClosedSession(stack, exists = () => true) {
  const list = Array.isArray(stack) ? stack : [];
  const index = list.findIndex((id) => exists(id));
  return index === -1 ? { id: null, stack: [] } : { id: list[index], stack: list.slice(index + 1) };
}

/** Jh: an entry whose session still exists. */
export function hasClosedSession(stack, exists = () => true) {
  return Array.isArray(stack) && stack.some((id) => exists(id));
}

/** D: 'focus' when the session is already shown (the current view or another open view), else 'navigate'. */
export function planReopen(id, { currentId = null, openIds = [] } = {}) {
  if (id != null && (id === currentId || (Array.isArray(openIds) && openIds.includes(id)))) return "focus";
  return "navigate";
}
