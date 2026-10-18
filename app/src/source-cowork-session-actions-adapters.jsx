// Host side of the 2.42304.0 Cowork session actions that scripts/extract-cowork-session-actions.mjs emits
// (src/generated/cowork-session-actions, R4i-cowork CW1; research-ext/X2 CW-1). The generated modules never import this
// file; the later steps (CW-4 restart from here, CW-5 edit, CW-6 "Go back", CW-7 refusal retry) call through it.
//
// What the official CoworkSessionView (c21f11e6d mk) passes that the host answers here:
//   intl             mk's `t = useIntl()`; the host formats the official English through electron/i18n `t()` (zh-CN
//                    entries are CW-8's, so until then the English original shows). The texts dO/cO/lO/uO format carry
//                    no ICU placeholders.
//   isRemoteSession  mk's `k = J(sessionId)` (a claude.ai bridge session). The host has no remote Cowork (D17), so it is
//                    always false: cO's CLI-rejection reasons and dO's "SgdArTNAT/" branch stay unreachable here.
//   the bridge       mk's `et` = shared-0 yx `globalThis["claude.web"]?.LocalAgentModeSessions`. The host has no such
//                    global; the caller hands in its own `rewind(sessionId, targetMessageUuid)` → {prefill?, refusal?}
//                    (the main-process side is CW-2, the IPC CW-3), shaped as the official `rewindV2` so cb1e253a0 ym
//                    normalises it unchanged. With no rewind function the bridge is null and vm says "cannot rewind".
//   telemetry        dO's `options.messageForLogging` and `options.error` are kept on the returned toast but the host
//                    sends nothing anywhere (no telemetry, X2 §7).
import { t } from '../electron/i18n/index.mjs';
import { LocalRewindRefusal } from './generated/cowork-session-actions/refusal.mjs';
import { hasRewindBridge, rewindLocalSession } from './generated/cowork-session-actions/rewind-bridge.mjs';
import { lastHumanBubbleWhenRewindable, localRewindRefusalMessage, rewindFailureMessage, rewindOutcomeToast }
  from './generated/cowork-session-actions/rewind-messages.mjs';

export { LocalRewindRefusal, lastHumanBubbleWhenRewindable };

/** D17: no remote (claude.ai bridge) Cowork sessions on this host. */
export const COWORK_REMOTE_SESSIONS = false;

/** The intl object the original functions call `formatMessage` on. */
export const coworkActionsIntl = Object.freeze({
  formatMessage: (message, values) => t(message.defaultMessage, values),
});

/** The LocalAgentModeSessions-shaped bridge (only `rewindV2`) over the host's rewind call, or null without one. */
export function coworkRewindBridge(rewind) {
  return typeof rewind === 'function' ? { rewindV2: (sessionId, targetMessageUuid) => rewind(sessionId, targetMessageUuid) } : null;
}

/** cb1e253a0 vm over the host bridge. */
export function coworkCanRewind(bridge) { return hasRewindBridge(bridge); }

/** cb1e253a0 ym over the host bridge: {prefill, refusal}, refusal normalised to the By enum. */
export function coworkRewind(bridge, sessionId, targetMessageUuid) { return rewindLocalSession(bridge, sessionId, targetMessageUuid); }

/** c21f11e6d dO for a local session: null for `sent`, else {message, options}. `surface` is restart | edit | refusal_retry. */
export function coworkRewindToast(outcome, surface) {
  return rewindOutcomeToast(outcome, { surface, isRemoteSession: COWORK_REMOTE_SESSIONS }, coworkActionsIntl);
}

/** c21f11e6d lO: the text for a local refusal, undefined for Unknown / none. */
export function coworkRefusalMessage(refusal) { return localRewindRefusalMessage(refusal, coworkActionsIntl); }

/** c21f11e6d uO: the failure text of a surface. */
export function coworkFailureMessage(surface) { return rewindFailureMessage(surface, coworkActionsIntl); }
