// The /btw child pane's session error notice (2.42304.0 cccc2cf0a nT, drawn by jT before its approval area) and the
// send-failure toast rule that goes with it (jT H's catch). Host adapter for the official per-session error bucket
// (Wp: error/errorSeq/errorRejectedPrompt/errorSource, cleared by Dismiss): the local reducer keeps a thread-wide error
// (state.errors, a failure without a turn identity) and per-turn errors (state.turnErrors).
//
// nT returns null when `!n || i === "transcript" || (u && r === "cli_resume_not_found") || Oi(r) ||
// t?.neverStarted === !0`. Locally:
//   - errorSource "transcript": a per-turn error is the failed turn's own error, which the child transcript draws in
//     that turn (source-btw-pane.jsx, turnErrorPlacements over the child's own rows, as F_ draws the transcript's API
//     errors), so it is never the notice. The notice is the thread-wide error only (errorSource "session").
//   - Oi (shared-18 wT: environment_deleted, worker_auth_expired, session_init_failed, bridge_* and session_host_refused,
//     the remote-environment categories) and cli_resume_not_found have no local category: a lost thread reads as the
//     transcript's load failure (SourceTranscriptLoadFailure) or a send toast, never as state.errors.
//   - neverStarted (a session whose process never started, which F_ draws in place of the transcript): a local /btw
//     child exists only after its fork succeeded on a live core, so it has started by construction.
// R3-nested step 3: R2-btw's notice also took the card of the latest own failed turn; that card is now in the transcript.

const identities = new WeakMap();
let nextIdentity = 0;
// Each thread-wide failure is a fresh object from the reducer: a repeat of the same text is a new error to show.
const identity = error => {
  if (!error || typeof error !== 'object') return String(error);
  if (!identities.has(error)) identities.set(error, ++nextIdentity);
  return identities.get(error);
};

export function btwSessionNotice({ threadError = null } = {}) {
  return threadError ? { key: `thread:${identity(threadError)}`, turnId: 'thread', error: threadError } : null;
}

// nT onDismiss → Wp.clearError(id): the dismissed error stays hidden in every view of the session for this app run.
export function createBtwNoticeDismissals() {
  let dismissed = new Map();
  const listeners = new Set();
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => dismissed,
    isDismissed: (sessionId, key) => !!key && dismissed.get(sessionId) === key,
    dismiss(sessionId, key) {
      if (!sessionId || !key || dismissed.get(sessionId) === key) return;
      dismissed = new Map(dismissed).set(sessionId, key);
      for (const listener of listeners) listener();
    },
  };
}
export const btwNoticeDismissals = createBtwNoticeDismissals();

// jT H catch: `!Wh(e) || bucket.errorRejectedPrompt === null || bucket.errorSeq === c` toasts. The composer is mounted
// whenever this pane sends (Wh), so the toast is left out only when the failure put a new session error on screen
// (the notice key changed since the send began); an unchanged or absent notice still toasts.
export function sendFailureToasts({ before = null, after = null } = {}) {
  return after === null || after === before;
}
