// R4e-findings (toolcards-18): a finished ReportFindings call in the transcript is the 2.42304.0 findings card — the
// generated original c96d752d0 X$ / h0e (src/generated/r4e-findings/findings-card.mjs, scripts/extract-r4e-findings.mjs),
// with "Code review · N findings", Re-run review / Apply fixes / Walk through in diff, the per-file rows with their
// status, verdict or category badge (truncate, max-w-[7rem], a lazy, non-hoverable CdsOverflowTooltip), the expanded
// summary, failure scenario, path and View in diff, and the one-line outcome summary of a re-report. The renderer asks
// for the card in every session (c8a3f7430 `reportFindingsCard: !0`), so it is not gated.
//
// Host side (this file): the card's tool from the local item (review-findings-model.mjs findingsCardTool), the feed's
// settled findings tools (uat: K$ = G$(entries), here over the session's items), and the session watcher behind the
// statuses (cc43287c9 Zte: settleReviewFixes, run by the session's latest card). The desktop services the card reads are
// the adapters in source-review-findings-adapters.jsx (FindingsCardHost from main.jsx).
import React, { useContext, useEffect, useMemo, useRef } from "react";
import { FindingsCard, SettledFindingsToolsContext, isFindingsCardTool, useSettledFindingsToolIds } from "./generated/r4e-findings/findings-card.mjs";
import { parseReportFindingsInput } from "./generated/r4e-findings/findings-input.mjs";
import { FindingsCardHost, reviewFindingsStore } from "./source-review-findings-adapters.jsx";
import { findingsCardTool, fixingCount, reopenUnwatchedFixes, settleReviewFixes } from "./review-findings-model.mjs";

export { FindingsCardHost };

/**
 * The card's tool for a transcript item, or null. m2e / e0 mount X$ for an owned session's H$ tool (every local session
 * is the user's own), and X$ shows its fallback, the tool row, for an input Nle cannot read; here such an item stays the
 * generic tool row.
 */
export function reportFindingsCardTool(item) {
  const tool = findingsCardTool(item);
  return tool && isFindingsCardTool(tool) && parseReportFindingsInput(tool.input) !== undefined ? tool : null;
}

// cc43287c9 Zte's parts for one session: at its start, fixing with no watermark reopens (reopenUnwatchedFixes); a rise in
// the fixing count sets the watermark to the transcript's last item (setReviewFixingWatermark); and every transcript
// change is read for outcomes and the end of the fix turn (settleReviewFixes).
//
// R4f-findings-store: the Changes pane runs the same watcher as a stand-in (`secondary`) for the reviews no card shows
// (a Codex review, ::code-comment findings) and while the session's latest card is not mounted. It has no turn errors or
// times (the pane gets the session's items and running state only), so it stands down while a card of the session
// watches (cardWatchers), checked whenever it would act.
// R4f review fix: the stand-in also ends the fix turn on its own sight of the session running and then going idle while
// a fix is in flight (watermark set, findings fixing): settleReviewFixes `turnEnded`. Without it a fix turn that failed
// at once, with no reply item, left its findings at Fixing… (and Apply fixes gone) until some later turn replied. It
// cannot tell a failed turn from a finished one unless the pane's `review` carries the session's turnErrors / turnTimes
// (useChangesPaneReview forwards them when main.jsx gives them).
const cardWatchers = new Map();
const watchedByCard = (sessionId) => (cardWatchers.get(sessionId) ?? 0) > 0;
function useReviewWatcher(sessionId, items, running, turnErrors, turnTimes, { secondary = false } = {}) {
  const latestItems = useRef(items);
  latestItems.current = items;
  useEffect(() => {
    if (!sessionId) return undefined;
    if (!secondary) cardWatchers.set(sessionId, (cardWatchers.get(sessionId) ?? 0) + 1);
    const acts = () => !secondary || !watchedByCard(sessionId);
    if (acts()) reopenUnwatchedFixes(reviewFindingsStore, sessionId);
    let count = fixingCount(reviewFindingsStore.getState(), sessionId);
    const off = reviewFindingsStore.subscribe(() => {
      const next = fixingCount(reviewFindingsStore.getState(), sessionId);
      if (next > count && acts()) {
        const list = latestItems.current;
        reviewFindingsStore.setReviewFixingWatermark(sessionId, Array.isArray(list) && list.length ? String(list.at(-1).id) : null);
      }
      count = next;
    });
    return () => {
      off();
      if (!secondary) { const left = (cardWatchers.get(sessionId) ?? 1) - 1; if (left > 0) cardWatchers.set(sessionId, left); else cardWatchers.delete(sessionId); }
    };
  }, [sessionId, secondary]);
  // secondary: whether this session ran a turn while a fix was in flight (reset when no fix is in flight or the session
  // changes); its next idle render is the end of the fix turn.
  const ranFix = useRef({ sessionId: null, ran: false });
  useEffect(() => {
    if (!sessionId) return;
    let turnEnded = false;
    if (secondary) {
      if (ranFix.current.sessionId !== sessionId) ranFix.current = { sessionId, ran: false };
      const state = reviewFindingsStore.getState();
      const inFlight = state.fixingWatermarkBySession[sessionId] !== undefined && fixingCount(state, sessionId) > 0;
      if (!inFlight) ranFix.current.ran = false;
      else if (running) ranFix.current.ran = true;
      else if (ranFix.current.ran) { ranFix.current.ran = false; turnEnded = true; }
    }
    if (!secondary || !watchedByCard(sessionId)) settleReviewFixes(reviewFindingsStore, sessionId, items, { running, turnErrors, turnTimes, turnEnded });
  }, [sessionId, items, running, turnErrors, turnTimes, secondary]);
}

/**
 * The Changes pane's stand-in watcher for its session (useReviewWatcher, secondary). turnErrors / turnTimes: the
 * session's state.turnErrors / state.turnTimes when the pane's `review` carries them (null otherwise).
 */
export function useChangesReviewWatcher(sessionId, items, running, turnErrors = null, turnTimes = null) {
  useReviewWatcher(sessionId, items, running === true, turnErrors ?? null, turnTimes ?? null, { secondary: true });
}

const EMPTY_ITEMS = Object.freeze([]);

/**
 * One findings card. items: the session's transcript items (state.items[sessionKey]) when the caller has them; then the
 * card knows whether it is the session's latest review (X$ `ee`: only that one has actions) and the latest card watches
 * the session. turnErrors / turnTimes: state.turnErrors[sessionKey] / state.turnTimes[sessionKey] (the watcher's failed
 * and ended fix turn).
 */
export function SourceFindingsCard({ item, sessionKey = null, items = null, turnErrors = null, turnTimes = null }) {
  const outer = useContext(FindingsCardHost);
  const host = outer && sessionKey && outer.sessionKey === sessionKey ? outer : null;
  const tool = useMemo(() => findingsCardTool(item), [item]);
  const sessionRef = useMemo(() => (sessionKey ? { id: sessionKey, type: "local" } : undefined), [sessionKey]);
  const known = Array.isArray(items);
  // uat: G$(e.entries); d0e reads `entries[].items[]` of kind "tools". The session's items are one entry of tool rows.
  const entries = useMemo(() => [{ items: (known ? items : EMPTY_ITEMS).map(findingsCardTool).filter(Boolean).map((entry) => ({ kind: "tools", tools: [entry] })) }],
    [known, items]);
  const settled = useSettledFindingsToolIds(entries);
  const latest = settled.at(-1);
  useReviewWatcher(host && known && (latest === undefined || latest === tool?.id) ? sessionKey : null, items, host?.running === true, turnErrors, turnTimes);
  if (!tool) return null;
  const card = <FindingsCard tool={tool} sessionRef={sessionRef} onPrefillComposer={host?.prefill ?? undefined} fallback={null} />;
  return (
    <div className="source-message" data-transcript-item-id={item.id} data-cds="FindingsCard">
      <FindingsCardHost.Provider value={host}>
        {known ? <SettledFindingsToolsContext.Provider value={settled}>{card}</SettledFindingsToolsContext.Provider> : card}
      </FindingsCardHost.Provider>
    </div>
  );
}
