// B27 agent window-layout commands (Claude Desktop 2.31226.0 c2189a16b runLayoutCommand: GetLayout, OpenInSplit,
// OpenInWindow, Focus, CloseSplit, SetSidebarCollapsed), the decision half: given what the window holding the calling
// session shows, a command's outcome (done / noop / refused / failed with c2189a16b's reasons) and the one change to
// make. main.jsx applies the change to the split store, the sidebar or main.cjs (a session popout) and answers with
// the layout; main.cjs relays it to the agent tools (agent-tools/window.mjs). No React or Electron here.
//
// snapshot: {
//   primary: session id | null, panes: [{ key, sessionId | null (a new-session pane), col, row }], focused: index (0 the
//   primary), popout: this window is a session popout, windowHidden, sidebarCollapsed, sidebarConstrained (too narrow
//   to show it), sidebarFocused, dialogOpen, typing (focus in a text field or terminal), focusedPane: index holding the
//   DOM focus or null, openedBy: { paneKey: caller session id }, hasRoom (a new pane fits), popoutSessionIds,
//   otherPopoutCount }
export const OUTCOMES = Object.freeze({ DONE: "done", NOOP: "noop", REFUSED: "refused", FAILED: "failed" });
const done = (extra = {}) => ({ outcome: OUTCOMES.DONE, ...extra });
const noop = (reason) => ({ outcome: OUTCOMES.NOOP, reason });
const refused = (reason) => ({ outcome: OUTCOMES.REFUSED, reason });
const failed = (reason) => ({ outcome: OUTCOMES.FAILED, reason });

const validId = (value) => typeof value === "string" && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value) ? value : null;
const panesOf = (snapshot) => (Array.isArray(snapshot?.panes) ? snapshot.panes : []);

/** c2189a16b T: where the session shows in this window and whether the user can see it there. */
export function callerPosition(snapshot, sessionId) {
  const panes = panesOf(snapshot), id = validId(sessionId);
  const primary = !!id && snapshot?.primary === id;
  const paneIdx = id ? panes.findIndex((pane) => pane.sessionId === id) : -1;
  const here = primary || paneIdx !== -1;
  const shown = here && snapshot?.windowHidden !== true;
  const popout = snapshot?.popout === true;
  return {
    primary, paneIdx, ...(paneIdx === -1 ? {} : { paneIndex: paneIdx + 1 }), popout,
    inMainWindow: shown && !popout, windowHidden: here && snapshot?.windowHidden === true, visible: shown,
  };
}
/** c2189a16b k: the caller must be on screen (and, for pane and sidebar commands, in a full window), and no dialog open. */
function gate(position, snapshot, needsMainWindow) {
  if (!position.visible) return refused(position.windowHidden ? "window_hidden" : "caller_not_visible");
  if (needsMainWindow && !position.inMainWindow) return refused(needsMainWindow);
  if (snapshot?.dialogOpen === true) return refused("dialog_open");
  return null;
}

/** c2189a16b A: the layout the agent reads. */
export function layoutSnapshot(snapshot, callerSessionId) {
  const panes = panesOf(snapshot), focused = Math.min(Number.isInteger(snapshot?.focused) ? snapshot.focused : 0, panes.length);
  const position = callerPosition(snapshot, callerSessionId);
  return {
    mode: "code",
    sidebarCollapsed: snapshot?.popout === true ? true : snapshot?.sidebarCollapsed === true,
    ...(snapshot?.primary ? { primarySessionId: snapshot.primary } : {}),
    primaryFocused: focused === 0,
    panes: panes.map((pane, at) => ({ index: at + 1, col: pane.col, row: pane.row, kind: pane.sessionId ? "session" : "draft", ...(pane.sessionId ? { sessionId: pane.sessionId } : {}), focused: focused === at + 1 })),
    popoutSessionIds: Array.isArray(snapshot?.popoutSessionIds) ? snapshot.popoutSessionIds.filter(validId) : [],
    otherPopoutCount: Number.isInteger(snapshot?.otherPopoutCount) && snapshot.otherPopoutCount > 0 ? snapshot.otherPopoutCount : 0,
    caller: { primary: position.primary, ...(position.paneIndex === undefined ? {} : { paneIndex: position.paneIndex }), popout: position.popout || (snapshot?.popoutSessionIds ?? []).includes(callerSessionId) },
  };
}

/**
 * c2189a16b V: one command's outcome and the change to make ({ kind: "open-split" | "open-window" | "navigate" |
 * "focus" | "close" | "sidebar", … } or null). command: { kind, callerSessionId, targetSessionId?, collapsed? }.
 */
export function runLayoutCommand(command, snapshot) {
  const caller = validId(command?.callerSessionId);
  const target = command?.targetSessionId === undefined || command?.targetSessionId === null ? undefined : validId(command.targetSessionId);
  const position = callerPosition(snapshot, caller);
  const panes = panesOf(snapshot);
  const result = (outcome, effect = null) => ({ result: outcome, effect });
  switch (command?.kind) {
    case "get-layout": return result(done());
    case "open-in-split": { // F
      const blocked = gate(position, snapshot, "popout_has_no_panes");
      if (blocked) return result(blocked);
      if (target === undefined) return result(failed("missing_target"));
      if (snapshot?.primary === target) return result(noop("already_in_primary"));
      if (panes.some((pane) => pane.sessionId === target)) return result(noop("already_in_pane"));
      if (snapshot?.hasRoom === false) return result(refused("no_room"));
      return result(done(), { kind: "open-split", sessionId: target, keepFocus: Math.min(snapshot?.focused ?? 0, panes.length) });
    }
    case "open-in-window": { // I
      const blocked = gate(position, snapshot, false);
      if (blocked) return result(blocked);
      if (target === undefined) return result(failed("missing_target"));
      if ((snapshot?.popoutSessionIds ?? []).includes(target)) return result(noop("already_in_window"));
      return result(done(), { kind: "open-window", sessionId: target });
    }
    case "focus": { // L
      const blocked = gate(position, snapshot, false);
      if (blocked) return result(blocked);
      if (target === undefined) return result(failed("missing_target"));
      const there = callerPosition(snapshot, target);
      if ((snapshot?.popoutSessionIds ?? []).includes(target) && there.paneIdx === -1 && !there.primary) return result(noop("already_in_window"));
      if (!position.inMainWindow) return result(refused("popout_has_no_panes"));
      if (snapshot?.typing === true) return result(refused("user_typing"));
      const focused = Math.min(snapshot?.focused ?? 0, panes.length);
      if (there.primary) return focused === 0 ? result(noop("already_in_primary")) : result(done({ reason: "focused_pane" }), { kind: "focus", index: 0 });
      if (there.paneIdx === -1) return result(done(position.primary ? { reason: "replaced_caller" } : {}), { kind: "navigate", sessionId: target });
      return focused === there.paneIdx + 1 ? result(noop("already_in_pane"))
        : result(done({ reason: "focused_pane", paneIndex: there.paneIdx + 1 }), { kind: "focus", index: there.paneIdx + 1 });
    }
    case "close-split": { // R
      const blocked = gate(position, snapshot, "popout_has_no_panes");
      if (blocked) return result(blocked);
      const openedBy = snapshot?.openedBy ?? {};
      let at;
      if (target !== undefined) {
        at = panes.findIndex((pane) => pane.sessionId === target);
        if (at === -1) return result(noop("no_split_to_close"));
        if (openedBy[panes[at].key] !== caller) return result(refused("not_opened_by_you"));
      } else {
        at = panes.findLastIndex((pane) => openedBy[pane.key] === caller);
        if (at === -1) return result(noop("no_split_to_close"));
      }
      // z: the user is working in that pane.
      if (snapshot?.focusedPane === at + 1) return result(refused("pane_in_use"));
      return result(done({ paneIndex: at + 1 }), { kind: "close", index: at + 1 });
    }
    case "set-sidebar-collapsed": { // B
      const blocked = gate(position, snapshot, "popout_has_no_sidebar");
      if (blocked) return result(blocked);
      const collapsed = command.collapsed === true;
      if ((snapshot?.sidebarCollapsed === true) === collapsed) return result(noop(collapsed ? "already_collapsed" : "already_expanded"));
      if (collapsed && snapshot?.sidebarFocused === true) return result(refused("sidebar_in_use"));
      if (!collapsed && snapshot?.sidebarConstrained === true) return result(refused("sidebar_constrained"));
      return result(done(), { kind: "sidebar", collapsed });
    }
    default: return result(failed("unknown_command"));
  }
}

