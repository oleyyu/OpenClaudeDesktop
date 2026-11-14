// Host adapters of the 4.16336.0 turn box graph (src/generated/turn-box-v4, scripts/extract-turn-box-v4.mjs).
// Every boundary but one is an existing host adapter of the 3.6556.2 graph (src/source-turn-box-adapters.jsx), now
// answering the same official binding at its 4.16336.0 chunk / local; the generator pins each original by features and
// raw declaration sha256 (ADAPTER_PINS). They share that module's TurnBoxHost context, so one host provider serves both
// graphs. useWrapUpLeftOut is new in 4.16336.0 and has no 3.6556.2 host adapter: it is defined here.
import { useContext } from "react";
import { TurnBoxHost } from "./source-turn-box-adapters.jsx";

export { useIntl, FormattedMessage, useSessionBucket, useOpenTasksPane, logNextRowDismissed, useCreatePrRunner, useArchiveRunner, useOpenSession, useTurnTail, useSessionQuery, useSessionTurnBoxFlag, useSessionTurnBoxDrawn, usePresetsGate, useSendWithOutcome, useAfterSessionRemoved, useNextActionRules, useTurnBoxAtReplies, useStartNewSession, useCurrentAccount, useAttentionSessionIds, useSessionAwaitsRequest, useSessionHasPendingRequest, useSessionRequestInTurn, useErrors, useSessionsStore, TodoMarkdown, useChipChords, logChipsShown, logChipClicked, logRulesEvaluated, logChipOutcome, messageTurnOrdinal, sessionTurnOrdinal, usePaneHiddenStore, onPaneHiddenChange, useAccountFlag } from "./source-turn-box-adapters.jsx";

// c5da7eb42 A_ (exported Hi; c9bd7af9c Tc): `ld(typeof e=="string"?e:null,E_).wrapUpLeftOut===!0`, the session bucket's
// wrapUpLeftOut as E_ derives it from the bucket's SDK messages (e.messages.getSnapshot()). The host bucket holds no SDK
// messages (src/source-turn-box.jsx answers { compactionStatus }), so the host answers it (TurnBoxHost.wrapUpLeftOut);
// without one, what E_ answers for a session without a bucket: p_ = { box: !1, updatePlan: !1 }, no wrapUpLeftOut.
export function useWrapUpLeftOut(sessionId) {
  const host = useContext(TurnBoxHost);
  return typeof sessionId === "string" && host?.wrapUpLeftOut?.(sessionId) === true;
}
