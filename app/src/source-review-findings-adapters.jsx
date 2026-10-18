// Local services for the original 2.42304.0 review finding card that scripts/extract-review-findings.mjs emits
// (generated/review-findings/review-finding-card.mjs = c44d00c7f ba/ya, R3-terminal FT-09, diffgit-01). Each export
// replaces one import of the original, feature-checked by the extractor against the declaration it stands for.
//
// R4e-findings (toolcards-18) adds, at the end of this file, the services of the transcript's findings card
// (generated/r4e-findings/findings-card.mjs = c96d752d0 X$ / h0e, scripts/extract-r4e-findings.mjs), the other surface
// that reads the desktop's review store.
import React, { cloneElement, createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { clsx } from "./generated/view-tabs/vendor-frame-DfPJ1QmD.js";
import { SEND_STOPPED_ERROR } from "./generated/r4e-findings/send-stopped.mjs";
import { requestDiffReveal } from "./diff-reveal.mjs";
import { createReviewFindingsStore, findingsCardHostValue, sendFixedTurnFlow } from "./review-findings-model.mjs";
import { StartMessage, useStartIntl } from "./source-code-start-adapters.jsx";
import { SourceSpark } from "./source-spark.jsx";
import { useSourceToasts } from "./source-toast.jsx";

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog.
export const useIntl = useStartIntl;
export const FormattedMessage = StartMessage;

// cc8941b7b rt / it (exported Q / tt): `currentFindingBySession[sessionId] === findingId` and
// `findingStatusBySession[sessionId]?.[findingId] ?? "open"` on the desktop's review store. R4f-findings-store: the
// Changes pane reads both from reviewFindingsStore below (source-pane-review.jsx useChangesPaneReview, the store the
// transcript's findings card writes) and SourceReviewFindingCard hands each card its own pair through this context.
export const ReviewFindingStateContext = createContext({ current: false, status: "open" });
export function useIsCurrentFinding() {
  return useContext(ReviewFindingStateContext).current === true;
}
export function useFindingStatus() {
  return useContext(ReviewFindingStateContext).status ?? "open";
}

// shared-frame NT (exported $i): the CDS Spark. With no state it is the static spark path (_h) in --cds-clay at
// --cds-spark-size, `shrink-0` added for a numeric size (`typeof r.size == "string" ? n : X("shrink-0", n)`). The
// host spark is SourceSpark: the same path, colour and size variable, and the local persona glyphs (C2).
export function ReviewSpark({ size, state, onEnd, className }) {
  return <SourceSpark size={size} state={state} onEnd={onEnd} className={(typeof size === "string" ? className : clsx("shrink-0", className)) ?? ""} />;
}

// ── R4e-findings (toolcards-18): the transcript findings card ─────────────────────────────────────────────────────
// Each export below replaces one import of c96d752d0 X$ / h0e; extract-r4e-findings.mjs checks the original declaration
// it stands for. Mounted by source-findings-card.jsx.

// The card's host, provided by main.jsx around the transcript: { sessionKey, running, canViewChanges, fileInChanges(path),
// openChanges(), send(text) → Promise<boolean>, queue(text) → Promise<boolean>, rerun(text), prefill(text) }.
// SourceFindingsCard re-provides it as null for a card of another session (the side chat), which then has no actions
// (X$ `w` needs the side panes).
export const FindingsCardHost = Object.assign(createContext(null), {
  value: findingsCardHostValue,
  sendTurn: sendFixedTurnFlow,
});
export { findingsCardHostValue, sendFixedTurnFlow };

// shared-1 Sw (exported ic): the surface is hidden (`Gs(y(_w), xw)`). The host renders its transcript only while shown.
export function useSurfaceHidden() {
  return false;
}

// shared-52 Sj (exported Ya): the ErrorsProvider's addError(message, options). Here the host's danger toast with the
// message in the UI language; the logging options are not kept (no telemetry, D17).
export function useErrors() {
  const toasts = useSourceToasts();
  const intl = useStartIntl();
  return useMemo(() => ({
    addError: (message) => { toasts?.add?.(typeof message === "string" ? message : intl.formatMessage(message), { variant: "danger" }); },
  }), [toasts, intl]);
}

// c5da7eb42 Sj (exported St): the session's Changes diff entries, undefined while the query is off or loading. X$ reads
// only whether one is not a stacked-PR parent (`ae`, the walkthrough has a diff) and whether the list is known (`q`).
// The host has no stacked diffs and answers from its Changes pane: one entry standing for the diff the pane can show
// (main.jsx canViewChanges: a repository, or the session's own diff), none otherwise. It is never rendered.
const HOST_DIFF = Object.freeze([Object.freeze({ host: "changes" })]);
const NO_DIFF = Object.freeze([]);
export function useSessionDiffEntries(sessionRef) {
  const host = useContext(FindingsCardHost);
  if (!sessionRef) return { data: undefined };
  return { data: host?.sessionKey === sessionRef.id && host.canViewChanges === true ? HOST_DIFF : NO_DIFF };
}

// c68c4283d Il / Fl / jl / Rl / Ml: the claudeai.epitaxy.code_review.* telemetry events. Nothing is sent (D17).
export function logFixApplied() {}
export function logWalkthroughOpened() {}
export function logFindingsCardRendered() {}
export function logRerunReview() {}
export function logFindingExpanded() {}

// c03935b01 gc / _c / Q (exported ft / mt / pt): the session pane store's getState().openDiffPane, the store context
// (null outside a pane host) and a selector (hasSidePanes, defaulting to true on the main pane store: c03935b01 zo
// `hasSidePanes: e?.hasSidePanes ?? !0`, false only in non-pane hosts such as the side chat). Whether the session
// currently has a diff is answered by useSessionDiffEntries (`ae`), not hasSidePanes (Y1-R4e-findings-2).
const NO_PANE = () => {};
export function usePaneStoreState() {
  const host = useContext(FindingsCardHost);
  return { openDiffPane: host?.openChanges ? () => { host.openChanges(); } : NO_PANE };
}
export function usePaneStoreContext() {
  const host = useContext(FindingsCardHost);
  return host && host.hasSidePanes !== false ? host : null;
}
export function usePaneStore(selector) {
  const host = useContext(FindingsCardHost);
  return selector({ hasSidePanes: Boolean(host && host.hasSidePanes !== false) });
}

// c856385e2 On (exported i): the transcript file path context menu around `trigger`. This host's menu is
// source-transcript.jsx's delegated [data-file-ref] menu (with the line), so the trigger carries the path.
export function FilePathMenu({ path, line, trigger }) {
  if (path === undefined) return trigger;
  return cloneElement(trigger, { "data-file-ref": path, ...(typeof line === "number" ? { "data-file-line": line } : {}) });
}

// c06cf64bb hv (exported on): the session has a turn in flight. Here: the host's running turn (state.active).
export function useSessionTurnRunning(sessionId) {
  const host = useContext(FindingsCardHost);
  return sessionId != null && host?.sessionKey === sessionId && host.running === true;
}

// c6b8adeaf ua (exported g): sendWithOutcome({ref, text, uuid}) for a send surface, resolving once the message is sent
// or queued.
//   "findings_card_apply": the host's fixed turn when idle (main.jsx sendFixedTurn → turn/start), or its queue lane
//     while a turn runs (host.queue → sendFixedTurn with queueWhileRunning: true → thread/queue/add, the composer's
//     "later" lane in sendWhileRunning, Y1-R4e-findings-1). The host throws while another action holds the session
//     (loading, sending, a pending action, the commit latch), which X$ catches to show the original "Message couldn't
//     be sent. Try again." and reopen the findings. A false answer means the host refused and showed its own toast
//     (offline, archived): that rejects as the original's SendStoppedByPromptError, which X$ takes as handled.
//   "findings_card_rerun": this host has no /code-review command to send; the review command opens its Review dialog
//     (main.jsx executeCommand("review")), which starts the review itself. The send is handed to that prompt, so it
//     rejects as SendStoppedByPromptError: X$ releases its Re-run latch (fe) without an error.
const notSent = () => Object.assign(new Error("The host did not send this message."), { name: SEND_STOPPED_ERROR });
export function useSendWithOutcome(surface) {
  const host = useContext(FindingsCardHost);
  const sendWithOutcome = useCallback(async ({ ref, text }) => {
    if (!host || !ref || ref.id !== host.sessionKey) throw notSent();
    if (surface === "findings_card_rerun") {
      if (host.rerun) await host.rerun(text);
      throw notSent();
    }
    const dispatch = host.running === true ? host.queue ?? host.send : host.send;
    if (!dispatch || (await dispatch(text)) !== true) throw notSent();
  }, [host, surface]);
  return { sendWithOutcome };
}

// cc8941b7b F (exported V) and its actions I (exported A): the session review store (review-findings-model.mjs
// createReviewFindingsStore), one per renderer as the original. $e / ct / Qe (exported $ / nt / ot) select from it.
// R4f-findings-store: persisted as the original (`{name: "diff-annotations", partialize: De}`: zustand persist over the
// renderer's localStorage), the review fields of De only; without a window (SSR, tests) it stays in memory.
function rendererStorage() {
  try { return typeof window === "undefined" ? null : window.localStorage ?? null; } catch { return null; }
}
export const reviewFindingsStore = createReviewFindingsStore({ storage: rendererStorage() });
const NO_STATUSES = Object.freeze({});
const NO_TOOL_IDS = Object.freeze([]);
function useReviewState(select) {
  const read = () => select(reviewFindingsStore.getState());
  return useSyncExternalStore(reviewFindingsStore.subscribe, read, read);
}
export function useLatestSettledAtActivation(sessionId) {
  return useReviewState((state) => state.latestSettledAtActivationBySession[sessionId]);
}
export function useFindingStatuses(sessionId) {
  return useReviewState((state) => state.findingStatusBySession[sessionId] ?? NO_STATUSES);
}
export function useSeededFindingsToolIds(sessionId) {
  return useReviewState((state) => state.seededFindingsToolIdsBySession[sessionId] ?? NO_TOOL_IDS);
}
// cc8941b7b st (exported ft): the seeded findings no resolved diff scope anchors, null until the diff resolved them. The
// host's Changes pane resolves no scopes into this store, so the host answers by file: once the card has seeded the
// session's findings, those whose file the Changes diff does not list (main.jsx fileInChanges; a diff that is not
// loaded yet lists every file). The original anchors by line, this by file (host difference).
export function useUnanchoredFindingIds(sessionId) {
  const host = useContext(FindingsCardHost);
  const findings = useReviewState((state) => (sessionId ? state.findingsBySession[sessionId] : undefined));
  const fileInChanges = sessionId && host?.sessionKey === sessionId ? host.fileInChanges : null;
  return useMemo(() => {
    if (!findings?.length || typeof fileInChanges !== "function") return null;
    const out = new Set();
    for (const finding of findings) if (!fileInChanges(finding.filePath)) out.add(finding.id);
    return out;
  }, [findings, fileInChanges]);
}
// The actions X$ calls. scrollToAnnotation also asks the host's Changes diff to reveal the file (diff-reveal.mjs: the
// file's section, not the anchored line — host difference); the pane opens right after (openDiffPane).
export const reviewFindingsActions = Object.freeze({
  setReviewFindings: reviewFindingsStore.setReviewFindings,
  setCurrentReviewFinding: reviewFindingsStore.setCurrentReviewFinding,
  markReviewFindingsFixing: reviewFindingsStore.markReviewFindingsFixing,
  reopenReviewFindings: reviewFindingsStore.reopenReviewFindings,
  consumeAutoOpen: reviewFindingsStore.consumeAutoOpen,
  settleFixingReviewFindings: reviewFindingsStore.settleFixingReviewFindings,
  applyReviewFindingOutcomes: reviewFindingsStore.applyReviewFindingOutcomes,
  // R4f-findings-store: the Changes pane's (I clearReviewFindings / dismissReviewFinding / stepReviewFinding).
  clearReviewFindings: reviewFindingsStore.clearReviewFindings,
  dismissReviewFinding: reviewFindingsStore.dismissReviewFinding,
  stepReviewFinding: reviewFindingsStore.stepReviewFinding,
  scrollToAnnotation(sessionId, filePath, options) {
    reviewFindingsStore.scrollToAnnotation(sessionId, filePath, options);
    requestDiffReveal(filePath);
  },
});
