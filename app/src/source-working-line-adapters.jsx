// Local services for the original 2.42304.0 Code transcript loading line that scripts/extract-working-line.mjs emits
// (generated/working-line/working-line.mjs = c96d752d0 w8 in its turnStatusRows branch). Each export replaces one
// import of the originals, feature-checked by the extractor against the declaration it stands for. This module must not
// import generated/working-line (those modules import it). Everything else in the line — the CDS TurnStatus, the Spark
// with its sprite chunk, the keyed morph over the desktop's own framer-motion (vendor-motion) — is original code.
//
// What remains here, and why it cannot be the original:
//   useIntl / FormattedMessage  react-intl over the desktop's message catalog; the host catalog is keyed by the English
//                               message (electron/i18n, t()), so the shared start adapters format through it.
//   useGrowthBookFlag(When)     the desktop's GrowthBook client; the host has none. It answers the host's flag values:
//                               turnStatusRows on (user ruling), everything else off (D29 / D31).
//   useChatTextSize             the desktop's appearance store (shared-14 L); the host's text size, through
//                               WorkingLineHost. Read only by w8's classic branch.
//   useTurnStartTime, session*  the desktop's per-session turn stores (c06cf64bb), filled by its SDK message stream.
//                               The host's turns are engine turns with their own state; w8 gets sessionId null and
//                               reads tokens and time from its props, which is a branch of the original (x8, Vet).
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

// shared-25 Zs (exported Th) / ec (exported Nh): GrowthBook flags. The host has no GrowthBook client; these are its
// answers, by the user's rulings: `__gb__2846116625` (turnStatusRows) on — c26fb8b6b He (TurnStatusRowsProvider)
// provides it to We, and w8's raw read `fe(S_e)` sees it on too, exactly as when the desktop's GrowthBook serves it —
// and `__gb__507049721` on (shared-4 Ny: the clay activity mark, the dots that lead the working line). Every other
// flag is off (D29 / D31), e.g. x8's ccr_thinking_token_count (tokens use the b8 count tween).
export { HOST_GROWTHBOOK };
export function useGrowthBookFlag(flag) {
  return hostGrowthBookFlag(flag);
}
// ec: `!t || !n?.growthbook ? !1 : As(n, I(e)).on` — off unless enabled, then the flag's value.
export function useGrowthBookFlagWhen(flag, enabled) {
  return enabled ? hostGrowthBookFlag(flag) : false;
}

// shared-14 Ge (exported Y): the chat text size ("s" / "m" / "l"), read only by the classic branch (c8[j]).
export function useChatTextSize() {
  return useContext(WorkingLineHost).textSize ?? "m";
}

// c06cf64bb Cy / H / G / tc: the desktop's per-session turn stores (turn start, output token counter, thinking /
// waiting state, change events). The host passes sessionId null, so they answer the empty session.
// Cy (the running turn's start, ms) is the one store the host can answer for its own session: the transcript scope
// (transcript-host-scope.mjs) carries the turn start, so a row that holds the turn's mark (transcript rows WM) shows
// the same clock as the desktop. w8 itself is fed sessionId null and reads none of it.
export function useTurnStartTime(sessionId) {
  const scope = useContext(TranscriptHostScope);
  return sessionId !== undefined && sessionId !== null && scope.sessionId === sessionId && Number.isFinite(scope.turnStartedAt) ? scope.turnStartedAt : null;
}
const noSubscription = () => () => {};
export const sessionTokenCounter = Object.freeze({ get: () => 0 });
export const sessionActivityStore = Object.freeze({ get: () => null });
export const sessionActivityEvents = Object.freeze({ subscribe: noSubscription });
