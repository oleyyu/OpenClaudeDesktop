// The hover toolbar's turn actions under a user message (BY, approval-current.js:39671-39716): Rewind to here (jY
// :33919, ArrowCounterClockwise) and Fork from here (wi.Action ArrowSplitRight). The source offers each where the
// session can do it (Re = C && Le, ze = w && Le :38833-38834) and disables Rewind, with its reason (kY), while the
// agent works. Locally: Rewind where the core serves thread/revert (rewindServed), live only for a finished turn of an
// idle session (onRewindTo is null while running); Fork from a finished turn where the core forks at a turn
// (onForkFrom). Pure, so the decisions match the transcript's right-click menu and are unit-tested.
// R4i-cowork CW3: a Cowork session has no Rewind to here / Fork from here (cowork-session-capabilities.mjs); its user
// message offers 2.42304.0 cc1aae219 DN instead, "Restart conversation from here" (data-testid user-message-rewind,
// ArrowCounterClockwise), where SN's `showRewind = human && onRewindToMessage && agentMode && !streaming && !sendFailed`
// holds: onRestartFrom is mk's onRewindToMessage (`Bt&&!a&&…?mo:void 0`, null when the session can't). It stays enabled
// while the agent works — mo answers that click with cO("turn running") — so `running` does not hide or disable it.
// R4i-cowork CW4 (X2 CW-5): beside it, cc1aae219 Hs.EditAction ("data-testid":"user-message-edit"), where SN's showEdit
// holds for an agent-mode row: `W = … && d && u && … && !e.sendFailed && … && (E ? T && o && !S : …)` — editMessage
// (onEditFrom, mk's `Bt&&!a&&($n||!k)?ho:void 0`), a local route, the last human message (isLastHuman), not streaming.
// It rides on the restart action as `rewind.edit` (source-session.jsx passes userActions.rewind through unchanged).
export function userMessageActions({ turnId, itemId = null, activeTurnId = null, running = false, rewindServed = false, busyReason = "", onRewindTo = null, onForkFrom = null,
  onRestartFrom = null, onEditFrom = null, isLastHuman = false } = {}) {
  if (!turnId) return null;
  if (typeof onRestartFrom === "function") {
    if (!itemId) return null;
    const rewind = { kind: "restart", onClick: () => onRestartFrom(itemId) };
    if (typeof onEditFrom === "function" && isLastHuman && !running) rewind.edit = () => onEditFrom(itemId);
    return { rewind, fork: null };
  }
  const finished = turnId !== activeTurnId;
  const rewind = !rewindServed ? null
    : running ? { disabledReason: busyReason || null }
    : finished && typeof onRewindTo === "function" ? { onClick: () => onRewindTo(turnId) } : null;
  const fork = !running && finished && typeof onForkFrom === "function" ? () => onForkFrom(turnId) : null;
  return rewind || fork ? { rewind, fork } : null;
}
