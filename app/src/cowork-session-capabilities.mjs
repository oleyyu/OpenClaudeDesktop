// R4g-small SM3 (research-ext/X2-cowork-session-actions.md CW-0): which message actions a session offers is decided
// per session, never from the current core alone.
//
// 2.42304.0 source:
// - ion-dist v1 c21f11e6d-Bd0v2A97.js (CoworkSessionView `mk`): `Lt=o?!1:k?Ot&&We!==void 0:Vf(et)`,
//   `Rt=!!t.scheduledTaskId`, `zt=Rt||Et`, `Bt=Lt&&!zt`, `Vt=Bt&&!k` (o: read-only, k: remote, Ot: the remote
//   `cowork_rewind_dramatic_shrimp` GrowthBook gate, We: the bridge's rewindSession, Et: a dispatch session). Lt is the
//   chat view's canRewindToMessage, Bt gates restart / edit (onRewindToMessage, editMessage), Vt the error card's
//   onSessionRewind ("Go back").
// - cb1e253a0-DQ4zAGBV.js `vm` (Vf in c21f11e6d): `function vm(e){return!!(e?.rewindV2??e?.rewind)}`, the
//   LocalAgentModeSessions bridge (shared-0 `yx`, `globalThis["claude.web"]?.LocalAgentModeSessions`). A Cowork
//   session rewinds through that bridge (main rewindSessionV2: stop, pendingRewindTo, resume + resumeSessionAt +
//   forkSession), never through the Code transcript's thread/revert, and the Cowork view has no "Fork from here".
//
// Host: Cowork sessions are the Cowork runtime's (main coworkSessions.owns: `cw-<uuid>`) and reuse the Code transcript.
// CW-2/CW-3 (R4i-cowork CW2) give the host a rewind bridge (coworkRewindBridge → IPC cowork-rewind); until the Cowork
// actions (CW-4…) pass it here the view has none (Vf → false), so a Cowork session offers no Rewind to here, Esc Esc
// rewind or Fork from here; Code sessions keep the core-capability gates they had (thread/revert,
// thread/fork, capabilities.forkAtTurn). Remote Cowork (bridge) and the GrowthBook gate are not in the host (D17, D29).

/** main coworkSessions.owns (electron/cowork-runtime/session-service.mjs): a Cowork runtime session id. */
export const COWORK_SESSION_ID = /^cw-[a-f0-9-]{36}$/;
export const isCoworkSession = (sessionId) => typeof sessionId === 'string' && COWORK_SESSION_ID.test(sessionId);

/**
 * R4i-cowork CW3: the host's LocalAgentModeSessions rewind bridge for a Cowork session (2.42304.0 shared-0 `yx`,
 * `globalThis["claude.web"]?.LocalAgentModeSessions`; preload `LocalAgentModeSessions_$_rewindV2`). rewindV2 goes to
 * main's `cowork-rewind` IPC (the Cowork runtime's rewindSessionV2 port) and answers {prefill?, refusal?}; cb1e253a0
 * `ym` normalizes the refusal. Without Cowork (COWORK_ENABLED off) there is no bridge, so vm stays false.
 * @param {(channel: string, payload: object) => Promise<any>} call the renderer's IPC invoke
 * @param {{coworkEnabled?: boolean}} options boot.coworkEnabled
 */
export function coworkRewindBridge(call, { coworkEnabled = false } = {}) {
  if (coworkEnabled !== true || typeof call !== 'function') return null;
  return { rewindV2: (sessionId, targetMessageUuid) => call('cowork-rewind', { threadId: sessionId, targetMessageUuid }) };
}

/** vm / Vf: the rewind bridge serves rewindV2 or rewind. */
export const coworkRewindBridgeServed = (bridge) => !!(bridge?.rewindV2 ?? bridge?.rewind);

/**
 * mk's Lt / Bt / Vt for a Cowork session.
 * @param {{readOnly?: boolean, remote?: boolean, remoteRewindGate?: boolean, rewindSession?: Function,
 *   bridge?: object|null, scheduledTaskId?: string|null, dispatch?: boolean}} session
 * @returns {{canRewindToMessage: boolean, canEditOrRestart: boolean, canSessionRewind: boolean}}
 */
export function coworkRewindCapabilities({ readOnly = false, remote = false, remoteRewindGate = false, rewindSession, bridge = null,
  scheduledTaskId = null, dispatch = false } = {}) {
  const canRewindToMessage = readOnly ? false : remote ? !!remoteRewindGate && rewindSession !== undefined : coworkRewindBridgeServed(bridge);
  const canEditOrRestart = canRewindToMessage && !(!!scheduledTaskId || !!dispatch);
  return { canRewindToMessage, canEditOrRestart, canSessionRewind: canEditOrRestart && !remote };
}

/**
 * The Code transcript's rewind (thread/revert: Rewind to here, Esc Esc, /rewind) for this session.
 * @param {string} sessionId
 * @param {{unsupportedMethods?: string[]}|null|undefined} capabilities the current core's capabilities
 */
export function codeRewindServed(sessionId, capabilities) {
  if (isCoworkSession(sessionId)) return false;
  return !capabilities?.unsupportedMethods?.includes('thread/revert');
}

/** Fork from here (thread/fork at a turn) for this session; capabilities.forkAtTurn false forks only whole sessions. */
export function codeForkServed(sessionId, capabilities) {
  if (isCoworkSession(sessionId)) return false;
  return !capabilities?.unsupportedMethods?.includes('thread/fork') && capabilities?.forkAtTurn !== false;
}
