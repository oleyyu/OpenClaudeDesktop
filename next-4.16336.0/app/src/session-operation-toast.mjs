// W14-code r3 css3-operation-status-band: Code mode draws no session-action strip. 3.6556.2 has none: compaction in
// progress is the working line's "Compacting session…" (c96d752d0 W6, FIEdqIul1I), a review is the transcript's review
// turn and findings card ("Review complete", dKe/N6RHQF), a fork is caec4a2d4 lr's addInfo "Forking session…"
// (VT/e+bRysY, main.jsx forkingToast); en-US.json has no "Conversation compacted", "Session forked", "Compacting
// conversation…" or "Reviewing code…". What the strip still carried that nothing else shows (E93) — a session action
// that failed or that the core never confirmed — becomes a toast, the failure an addError-style danger toast.
import { cleanErrorReason, ACTION_ERROR_COPY } from './action-error-model.mjs';

// session-operations.cjs completeTurn: an interrupted turn ends its task with 'Task stopped.' — the user's own Stop,
// which the transcript already shows; no toast for it.
export const OPERATION_STOPPED = 'Task stopped.';

// W14-code r4-shared-01: a failed fork or compact is the official addError copy, the core's own error only in the log —
// caec4a2d4 fork onError `s ?? formatMessage("Couldn’t fork this session.", nGtjMsYWZD)`, c6b8adeaf no()
// `r(formatMessage("Couldn’t start compacting.", j49tT4QevF), {messageForLogging: `${e}_send_failed`})`. A review has
// no official failure toast (its failure is the review turn's own), so it keeps the core's text or the fallback.
export const COMPACT_FAILED = 'Couldn’t start compacting.';
export const OPERATION_FAILURE_COPY = Object.freeze({ fork: ACTION_ERROR_COPY.fork, compact: COMPACT_FAILED });

// The toast an operation event asks for, or null: { message, variant, dismiss, log } (dismiss: clear the operation from
// state; an unconfirmed one keeps its lock until the core answers, so it stays; log: the raw reason an official copy
// replaced). `translate` turns the official copy into the shown text.
export function operationFailureToast(operation, fallback, translate = (text) => text) {
  if (!operation || (operation.phase !== 'failed' && operation.phase !== 'unknown')) return null;
  if (operation.phase === 'failed' && operation.error === OPERATION_STOPPED) return { message: null, variant: null, dismiss: true };
  const reason = cleanErrorReason(operation.error || '');
  if (operation.phase === 'failed' && Object.hasOwn(OPERATION_FAILURE_COPY, operation.operation)) return { message: translate(OPERATION_FAILURE_COPY[operation.operation]), variant: 'danger', dismiss: true, log: reason || null };
  const message = reason || fallback;
  return operation.phase === 'failed' ? { message, variant: 'danger', dismiss: true } : { message, variant: 'warning', dismiss: false };
}

// A failure the session-action call also threw is reported by that call's caller (a /compact warning toast, the review
// dialog, /cd's own notice); the event must not toast the same text a second time.
export function operationFailureReported(operation, thrown) {
  return typeof thrown === 'string' && thrown !== '' && cleanErrorReason(operation?.error || '') === cleanErrorReason(thrown);
}
