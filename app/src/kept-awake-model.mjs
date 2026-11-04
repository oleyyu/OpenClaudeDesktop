// The windows' copies of what the desktop records on a session for the Code column's sleep and kept-awake bands.
//
// W14-code r6 sleep lane: the bands themselves are the original 3.6556.2 cf74bc599 wO (sleep) and dO (kept awake), sliced
// by scripts/extract-session-rail.mjs into src/generated/session-rail/sleep-band.mjs with their copy (lO / bO / yO / xO),
// the duration (uO over shared-19 To), the visibility rules and the k_ band card (c73f45bc3 Qg, code-band.mjs). The host's
// hand-built notice entries (keptAwakeNotice / keptAwakeShownFor / sleepNotice / sleepResumeState and the copied
// KEPT_AWAKE_MESSAGES table) are gone with that slice. What stays here is the data the slice reads through
// src/source-session-rail-adapters.jsx: the session view's `keptAwake` and `sleepInterruption` fields (c5da7eb42 QI over
// gn("keptAwake", "sleepInterruption")), which desktop-settings.cjs sends as desktop-kept-awake /
// desktop-sleep-interruption events, and the sends that begin in a session (c06cf64bb IE / LE).

/** A keptAwake value from the main process ({heldMs, endedAt}), else null. */
export function normalizeKeptAwake(value) {
  return value && Number.isFinite(value.heldMs) && value.heldMs >= 0 && Number.isFinite(value.endedAt) ? { heldMs: value.heldMs, endedAt: value.endedAt } : null;
}

// c06cf64bb IE / LE: listeners of the sends that begin in a session, called with (uuid, synthetic). dO marks its band
// used and wO records the message (`kh(id, de)`). The host hears a send begin as the session's turn start
// (turn/started, the store's observe below); no uuid, never synthetic.
const sendBegun = new Map();
/** IE: listen for the sends that begin in `sessionId`; returns the unsubscribe. */
export function subscribeSendBegun(sessionId, listener) {
  let listeners = sendBegun.get(sessionId);
  if (!listeners) sendBegun.set(sessionId, (listeners = new Set()));
  listeners.add(listener);
  return () => {
    const current = sendBegun.get(sessionId);
    current?.delete(listener);
    if (current?.size === 0) sendBegun.delete(sessionId);
  };
}
function noteSendBegun(sessionId) {
  for (const listener of [...(sendBegun.get(sessionId) ?? [])]) {
    try { listener(undefined, false); } catch (error) { console.error("send-begun listener threw", error); }
  }
}

// The windows' copy of each session's keptAwake: set and cleared by desktop-settings.cjs (desktop-kept-awake); a turn
// starting in the session clears it here too (LG: e.keptAwake=void 0), whichever event arrives first.
export function createKeptAwakeStore() {
  const values = new Map(), listeners = new Set();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    observe(event) {
      if (event?.kind === "desktop-kept-awake" && typeof event.threadId === "string") {
        const value = normalizeKeptAwake(event.keptAwake);
        if (value) values.set(event.threadId, value); else if (!values.delete(event.threadId)) return;
        notify();
      } else if (event?.method === "turn/started" && typeof event.params?.threadId === "string" && values.delete(event.params.threadId)) notify();
    },
    get: (id) => (typeof id === "string" ? values.get(id) ?? null : null),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
const windowKeptAwakeStore = createKeptAwakeStore();
// The window's store also tells the send-begun listeners of a turn start (before the keptAwake it clears is gone, as LE
// runs inside the desktop's send while the session view still has it).
export const keptAwakeStore = {
  ...windowKeptAwakeStore,
  observe(event) {
    if (event?.method === "turn/started" && typeof event.params?.threadId === "string") noteSendBegun(event.params.threadId);
    windowKeptAwakeStore.observe(event);
  },
};

/** A sleepInterruption value from the main process ({suspendedAt, wakeAt}), else null. */
export function normalizeSleepInterruption(value) {
  return value && Number.isFinite(value.suspendedAt) && Number.isFinite(value.wakeAt) ? { suspendedAt: value.suspendedAt, wakeAt: value.wakeAt } : null;
}

// The windows' copy of each session's sleepInterruption, set and cleared by desktop-settings.cjs.
export function createSleepInterruptionStore() {
  const values = new Map(), listeners = new Set();
  const notify = () => { for (const listener of [...listeners]) listener(); };
  return {
    observe(event) {
      if (event?.kind !== "desktop-sleep-interruption" || typeof event.threadId !== "string") return;
      const value = normalizeSleepInterruption(event.sleepInterruption);
      if (value) values.set(event.threadId, value); else if (!values.delete(event.threadId)) return;
      notify();
    },
    get: (id) => (typeof id === "string" ? values.get(id) ?? null : null),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
export const sleepInterruptionStore = createSleepInterruptionStore();
