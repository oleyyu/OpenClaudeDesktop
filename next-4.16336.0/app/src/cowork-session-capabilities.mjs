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
//
// w13-coworkfn-caps (research/w13-coworkfn.md cwf-15/16/17): Cowork now runs on the connected core by default
// (w13-coworkfn-engine, the official 3P host loop), so a Cowork session is also a core thread whose sessionMetadata
// surface is 'cowork' (main thread/start). Both kinds are Cowork sessions here: neither has the Code transcript's
// rewind (thread/revert from the transcript) or Fork from here, and both rewind through the bridge (3.6556.2
// LocalAgentModeSessions rewindSessionV2, O-12): main's cowork-rewind answers a core session over thread/revert.

/** main coworkSessions.owns (electron/cowork-runtime/session-service.mjs): a Cowork runtime session id. */
export const COWORK_SESSION_ID = /^cw-[a-f0-9-]{36}$/;
/**
 * A Cowork session: a Cowork runtime (VM) session id, or a core thread whose sessionMetadata surface is 'cowork'.
 * @param {string} sessionId
 * @param {Record<string, {surface?: string}>|null} [metadata] config.sessionMetadata (the renderer's sessionMetadata)
 */
export const isCoworkSession = (sessionId, metadata) => typeof sessionId === 'string'
  && (COWORK_SESSION_ID.test(sessionId) || (Object.hasOwn(metadata ?? {}, sessionId) && metadata[sessionId]?.surface === 'cowork'));

/**
 * R4i-cowork CW3: the host's LocalAgentModeSessions rewind bridge for a Cowork session (2.42304.0 shared-0 `yx`,
 * `globalThis["claude.web"]?.LocalAgentModeSessions`; preload `LocalAgentModeSessions_$_rewindV2`). rewindV2 goes to
 * main's `cowork-rewind` IPC (the Cowork runtime's rewindSessionV2 port, or thread/revert for a Cowork session on the
 * connected core) and answers {prefill?, refusal?}; cb1e253a0 `ym` normalizes the refusal.
 * w13-coworkfn-caps: the bridge is the Cowork session's (VM and core sessions alike: `cowork: true` from
 * isCoworkSession(id, metadata)), no longer boot.coworkEnabled; a session that isn't Cowork gets none, so vm stays false.
 * @param {(channel: string, payload: object) => Promise<any>} call the renderer's IPC invoke
 * @param {{cowork?: boolean}} options the session is a Cowork session
 */
export function coworkRewindBridge(call, { cowork = false } = {}) {
  if (cowork !== true || typeof call !== 'function') return null;
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
 * The Code transcript's rewind (thread/revert: Rewind to here, Esc Esc, /rewind) for this session. A Cowork session
 * (VM or core) has none: it rewinds through the bridge (Restart conversation from here, edit, Go back).
 * @param {string} sessionId
 * @param {{unsupportedMethods?: string[]}|null|undefined} capabilities the current core's capabilities
 * @param {Record<string, {surface?: string}>|null} [metadata] sessionMetadata
 */
export function codeRewindServed(sessionId, capabilities, metadata) {
  if (isCoworkSession(sessionId, metadata)) return false;
  return !capabilities?.unsupportedMethods?.includes('thread/revert');
}

/**
 * Fork from here (thread/fork at a turn) for this session; capabilities.forkAtTurn false forks only whole sessions.
 * The Cowork view (VM or core session) has no Fork from here.
 */
export function codeForkServed(sessionId, capabilities, metadata) {
  if (isCoworkSession(sessionId, metadata)) return false;
  return !capabilities?.unsupportedMethods?.includes('thread/fork') && capabilities?.forkAtTurn !== false;
}
