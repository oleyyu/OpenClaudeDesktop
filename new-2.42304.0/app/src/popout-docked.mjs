/**
 * The popouts list once a pane window has docked back (main.cjs popout-docked: that window has closed). main.jsx
 * applies it in the same event that opens the side chat card again, so the card never renders while the window is
 * still listed as popped out (the effect that brings a popped-out side chat forward would open a new, empty window
 * and put the card away: user bug #15). The popouts broadcast that follows confirms the same list.
 * @param {Array<{sessionId: string, pane: string}>|undefined} popouts
 * @param {{kind?: string, sessionId?: string, pane?: string}} event
 */
export function popoutsAfterDocked(popouts, event) {
  const list = Array.isArray(popouts) ? popouts : [];
  if (event?.kind !== "popout-docked" || typeof event.sessionId !== "string") return list;
  const next = list.filter((entry) => !(entry?.sessionId === event.sessionId && entry?.pane === event.pane));
  return next.length === list.length ? list : next;
}
