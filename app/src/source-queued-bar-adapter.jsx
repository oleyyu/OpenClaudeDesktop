// Local services for the original 3.6556.2 queued message bar that scripts/extract-queued-bar.mjs emits
// (generated/queued-bar: cf74bc599 VE QueuedMessageBar with WE / GE / BE / UE). Its services are the Code transcript
// renderer's (intl, GrowthBook, … — re-exported from source-code-transcript-adapters.jsx, the same adapter per original
// binding); this module adds the queue's per-entry state the rows read. It must not import generated/queued-bar (the
// host's bar, src/source-queued-messages.jsx, mounts it).
//
//   QueuedBarMessage             vendor-intl l (FormattedMessage) of the bar: the rows' one, with UE's note in the persona.
//   useQueuedEntryRemoving       c6b8adeaf Ti (`e in t.inFlight`, the cancel store): the X is busy "Removing…" while
//                                the host deletes the entry (an operation in flight on it that is not the send).
//   useQueuedEntrySending        c6b8adeaf vi (`e in t.pending`, the promotion store): Send now is busy "Sending…" while
//                                the host promotes the entry into the running turn (steeringId).
//   useQueuedEntrySendAccepted / useQueuedEntrySendLanded
//                                c6b8adeaf yi / bi (a promotion accepted / landed: WE's sent mark wE): the host's queue
//                                drops an entry once it is sent, so a listed entry is never either.
import React from "react";
import { FormattedMessage } from "./source-transcript-rows-adapters.jsx";
export * from "./source-code-transcript-adapters.jsx";

// cf74bc599 UE's note (E83: the assistant is the running core's — the English key says DeepSeek, electron/i18n named()
// swaps in the core's assistant, as the host's bar said it); applied by id while the original text is the one below.
export const QUEUED_BAR_PERSONA = Object.freeze({
  "2jgJ/J75kk": { original: "Claude reads this message at its next step.", text: "DeepSeek reads this message at its next step." },
  "6Wu6VFE8rB": { original: "Stops Claude\u2019s current response.", text: "Stops DeepSeek\u2019s current response." },
});
export function QueuedBarMessage(props) {
  const persona = QUEUED_BAR_PERSONA[props.id];
  return <FormattedMessage {...props} {...(persona && props.defaultMessage === persona.original ? { defaultMessage: persona.text } : null)} />;
}

const NO_STATE = Object.freeze({ busyIds: Object.freeze([]), sendingId: null });
/** The host queue's state of its entries: `busyIds` (an operation in flight on the entry), `sendingId` (Send now). */
export const QueuedBarStateContext = React.createContext(NO_STATE);
export function useQueuedEntryRemoving(id) {
  const state = React.useContext(QueuedBarStateContext);
  return id !== state.sendingId && state.busyIds.includes(id);
}
export function useQueuedEntrySending(id) {
  return React.useContext(QueuedBarStateContext).sendingId === id;
}
export function useQueuedEntrySendAccepted() {
  return false;
}
export function useQueuedEntrySendLanded() {
  return false;
}
