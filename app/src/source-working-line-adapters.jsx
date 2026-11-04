// Local services for the original 3.6556.2 Code transcript loading line that scripts/extract-working-line.mjs emits
// (generated/working-line/working-line.mjs = c96d752d0 U6 in its turnStatusRows branch). Each export replaces one
// import of the originals, feature-checked by the extractor against the declaration it stands for. This module must not
// import generated/working-line (those modules import it). Everything else in the line — the CDS TurnStatus, the Spark
// with its sprite chunk, the keyed morph over the desktop's own framer-motion (vendor-motion) — is original code.
//
// What remains here, and why it cannot be the original:
//   useIntl / FormattedMessage  react-intl over the desktop's message catalog; the host catalog is keyed by the English
//                               message (electron/i18n, t()), so the shared start adapters format through it.
//   useGrowthBookFlag(When)     the desktop's GrowthBook client; the host has none. It answers the host's flag values:
//                               turnStatusRows on (user ruling), everything else off (D29 / D31).
//   useChatTextSize             the desktop's editor preferences store (shared-7 jg); the host's text size, through
//                               WorkingLineHost. Read only by U6's classic branch.
//   useTurnStartTime, session*  the desktop's per-session turn stores (c06cf64bb), filled by its SDK message stream.
//                               The host's turns are engine turns with their own state; U6 gets sessionId null and
//                               reads tokens and time from its props, which is a branch of the original (B6, Ket).
//                               The turn start is answered for the transcript's own session (transcript rows' clock).
import { createContext, useContext } from "react";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { HOST_GROWTHBOOK, hostGrowthBookFlag } from "./host-growthbook.mjs";
import { TranscriptHostScope } from "./transcript-host-scope.mjs";

export const WorkingLineHost = createContext({ textSize: "m" });

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog (t() looks the English message up
// in zh-CN).
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// shared-25 fs (exported Yh) / hs (exported rg): GrowthBook flags. The host has no GrowthBook client; these are its
// answers: `__gb__2846116625` (turnStatusRows) is not served (W14-code r4 gates-r4-11: not in the desktop's Uon) — c26fb8b6b
// Je (TurnStatusRowsProvider) keeps the Code session's outer value (TranscriptRowsScope), and U6's raw read `jt(Mpe)` is off.
// Every other flag is the host table's (host-growthbook.mjs: off unless listed, D29 / D31; the desktop's Uon defaults,
// E81), e.g. B6's ccr_thinking_token_count off (tokens use the z6 count tween) and the activity sprites' quill
// `__gb__2346508742` (shared-4 MS) on (W14-code transcript-rest). 3.6556.2 has no clay mark gate (`__gb__507049721`, E14): the clay
// mark always leads the line.
export { HOST_GROWTHBOOK };
export function useGrowthBookFlag(flag) {
  return hostGrowthBookFlag(flag);
}
// hs: `!t || !n?.growthbook ? !1 : (…Ho(n, H(e))).on` — off unless enabled, then the flag's value.
export function useGrowthBookFlagWhen(flag, enabled) {
  return enabled ? hostGrowthBookFlag(flag) : false;
}

// shared-7 Rg (exported es): the chat text size ("s" / "m" / "l"), read only by the classic branch (D6[se]).
export function useChatTextSize() {
  return useContext(WorkingLineHost).textSize ?? "m";
}

// c06cf64bb bk / U / K / a_: the desktop's per-session turn stores (turn start, output token counter, thinking /
// waiting state, change events). The host passes sessionId null, so they answer the empty session.
// bk (the running turn's start, ms: `pendingTurn.startTime`) is the one store the host can answer for its own session: the transcript scope
// (transcript-host-scope.mjs) carries the turn start, so a row that holds the turn's mark (transcript rows WM) shows
// the same clock as the desktop. U6 itself is fed sessionId null and reads none of it.
export function useTurnStartTime(sessionId) {
  const scope = useContext(TranscriptHostScope);
  return sessionId !== undefined && sessionId !== null && scope.sessionId === sessionId && Number.isFinite(scope.turnStartedAt) ? scope.turnStartedAt : null;
}
const noSubscription = () => () => {};
export const sessionTokenCounter = Object.freeze({ get: () => 0 });
export const sessionActivityStore = Object.freeze({ get: () => null });
export const sessionActivityEvents = Object.freeze({ subscribe: noSubscription });
