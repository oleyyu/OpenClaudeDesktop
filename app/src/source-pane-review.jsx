import React, { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { findingAnnotation, findingCounts, findingsStatusText, fixFindingsPrompt, latestReviewFindings, paneReviewSeed, paneReviewView, seedPaneReview } from "./review-findings-model.mjs";
import { ReviewFindingCard } from "./generated/review-findings/review-finding-card.mjs";
import { isSendStopped } from "./generated/r4e-findings/send-stopped.mjs";
import { sendFailedMessage } from "./generated/r4e-findings/send-failed-message.mjs";
import { ReviewFindingStateContext, reviewFindingsStore, useErrors } from "./source-review-findings-adapters.jsx";
import { useChangesReviewWatcher } from "./source-findings-card.jsx";
import { t } from "../electron/i18n/index.mjs";
import "./source-pane-review.css";

// Review findings in the Changes pane (2.2553.1). The bar is the pane's subheader (hh over Cd wrap, panes-tile-current
// .js:3887-4125): the "Finding {current} of {total}" status (Applying fixes… / Fixes applied), CaretLeft / CaretRight
// "Previous finding" / "Next finding" when there are two or more, a spacer, then "Apply fixes" while some are open
// or "Re-run review" once every one is fixed (secondary sm), and a ghost sm "Dismiss". The card under the finding's
// line in the diff is the original 2.42304.0 one (R3-terminal FT-09, diffgit-01): see SourceReviewFindingCard.
// R4f-findings-store: both read and act on the session review store the transcript's findings card writes
// (useChangesPaneReview).

// 3.6556.2 cccc2cf0a ES (panels part off): the bar is c82eca2bd z_ wrap (G: H + `flex-wrap min-h-[…] py-xs`, H carrying
// bg-alpha-1); the status `text-body text-muted-as-secondary whitespace-nowrap tabular-nums`; the steppers c =
// "rounded text-muted-as-secondary"; a `grow` spacer; Apply fixes / Re-run review secondary sm `${TS} text-secondary` and
// Dismiss ghost sm `${TS} text-muted-as-secondary`, TS = "rounded-[5px] text-footnote px-[6px]". W14-code r5 cleanup
// css5-settings-button-replica: every button is the shared-frame Button (F = Uu = CdsButton), whose layered classes merge
// with these, so source-pane-review.css no longer restates them (no .spr-step / .spr-action / .spr-dismiss).
const BAR_CLASS = 'epitaxy-panel-subheader flex items-center gap-[4px] shrink-0 px-md bg-alpha-1 flex-wrap min-h-[calc(2rem*var(--cds-rem-scale,1))] py-xs';
const STATUS_CLASS = 'text-body text-muted-as-secondary whitespace-nowrap tabular-nums';
const STEP_CLASS = 'rounded text-muted-as-secondary';
const ACTION_CLASS = 'rounded-[5px] text-footnote px-[6px]';

// ES: `u(F,{variant:"ghost",iconOnly:!0,icon:"CaretLeft",className:c,"aria-label":fe,disabledReason:fe,disabled:k<=0,onClick:ne})`
// — the Button's own tooltip (its aria-label) and disabled-reason tooltip.
function StepButton({ label, icon, disabled, onClick }) {
  return <CdsButton variant="ghost" iconOnly icon={icon} className={STEP_CLASS} aria-label={label} disabledReason={label} disabled={disabled}
    onMouseDown={(event) => event.preventDefault()} onClick={onClick} />;
}

/**
 * @param {object} props
 * @param {Array<object>} props.findings
 * @param {Record<string, string>} props.statuses   id → open | fixing | addressed
 * @param {number} props.currentIndex
 * @param {(index: number) => void} props.onStep
 * @param {(() => void) | null} props.onApply        null when no turn can be sent
 * @param {(() => void) | null} props.onRerun
 * @param {() => void} props.onDismiss
 */
export function SourceReviewFindingsBar({ findings, statuses = {}, currentIndex = 0, onStep, onApply = null, onRerun = null, onDismiss, busy = false }) {
  if (!findings.length) return null;
  const counts = findingCounts(findings, statuses);
  const allFixed = counts.addressed === findings.length;
  const canApply = !allFixed && counts.open > 0;
  return (
    <div className={`spr-bar ${BAR_CLASS}`} data-review-findings="">
      <span role="status" className={`spr-status ${STATUS_CLASS}`}>{findingsStatusText(findings, statuses, currentIndex)}</span>
      {findings.length > 1 && <>
        <StepButton label={t("Previous finding")} icon="CaretLeft" disabled={currentIndex <= 0} onClick={() => onStep(currentIndex - 1)} />
        <StepButton label={t("Next finding")} icon="CaretRight" disabled={currentIndex >= findings.length - 1} onClick={() => onStep(currentIndex + 1)} />
      </>}
      <span className="grow" />
      {allFixed
        ? onRerun && <CdsButton variant="secondary" size="sm" className={`${ACTION_CLASS} text-secondary`} disabled={busy} onClick={onRerun}>{t("Re-run review")}</CdsButton>
        : canApply && onApply && <CdsButton variant="secondary" size="sm" className={`${ACTION_CLASS} text-secondary`} disabled={busy} data-review-apply="" onClick={onApply}>{t("Apply fixes")}</CdsButton>}
      <CdsButton variant="ghost" size="sm" className={`${ACTION_CLASS} text-muted-as-secondary`} onClick={onDismiss}>{t("Dismiss")}</CdsButton>
    </div>
  );
}

/**
 * The finding card under its line in the Changes diff: the original 2.42304.0 c44d00c7f ba = memo(ya)
 * (generated/review-findings/review-finding-card.mjs, extract-review-findings.mjs). ya reads the current finding and
 * the fix status from the desktop's review store (cc8941b7b rt / it); here the Changes pane passes them and this
 * wrapper hands them to the card (ReviewFindingStateContext). The finding becomes the annotation c96d752d0 builds
 * (findingAnnotation). onFix / onNext stay off when the pane gives none (Fix only with a turn to send, Next only with
 * two or more findings — c44d00c7f Aa's `n.hasNext`). The slot keeps `data-review-finding` for the pane's scroll-to.
 *
 * @param {object} props
 * @param {object} props.finding            {id, file, line, endLine, summary, detail, category, verdict, lineless?}
 * @param {boolean} [props.current]
 * @param {string} [props.status]           open | fixing | addressed
 * @param {() => void} [props.onDismiss]
 * @param {(() => void) | null} [props.onFix]
 * @param {(() => void) | null} [props.onNext]
 */
export function SourceReviewFindingCard({ finding, current = false, status = "open", onDismiss, onFix = null, onNext = null }) {
  const state = useMemo(() => ({ current, status }), [current, status]);
  const annotation = useMemo(() => findingAnnotation(finding), [finding]);
  return (
    <div className="spr-card-slot" data-review-finding={finding.id}>
      <ReviewFindingStateContext value={state}>
        <ReviewFindingCard sessionId={null} annotation={annotation} onDismiss={onDismiss} onFix={onFix ?? undefined} onNext={onNext ?? undefined} />
      </ReviewFindingStateContext>
    </div>
  );
}

// W14-code r6 pierre (R6DC-01): in the pierre Changes body (generated/pierre-changes, c44d00c7f qu) a finding's card is
// drawn by Pc `r.kind === "finding" ? n(wc, {sessionId, annotation: r.finding, onFix, onNext, onDismiss})`; the
// extractor hands wc to this stand-in, which draws the host's card for that finding over the review the Changes pane
// shows (PierreReviewContext: SourceDiff's `review`), so Fix / Next / Dismiss and the current / status state are the
// findings bar's, as on the host rows.
export const PierreReviewContext = React.createContext(null);
export function PierreReviewFindingCard({ annotation }) {
  const review = React.useContext(PierreReviewContext);
  const finding = review?.findings?.find((entry) => entry.id === annotation?.id);
  if (!review || !finding) return null;
  return <SourceReviewFindingCard finding={finding} current={finding.id === review.currentId} status={review.statuses?.[finding.id] ?? "open"}
    onDismiss={() => review.onDismiss(finding.id)} onFix={review.onFix ? () => review.onFix(finding.id) : null} onNext={review.onNext ? () => review.onNext(finding.id) : null} />;
}

// ── R4f-findings-store (F1): the Changes pane over the session review store ─────────────────────────────────────────
const NO_STATUSES = Object.freeze({});
function useReviewSlice(select) {
  const read = () => select(reviewFindingsStore.getState());
  return useSyncExternalStore(reviewFindingsStore.subscribe, read, read);
}
const nextFrame = (fn) => (typeof globalThis.requestAnimationFrame === "function" ? globalThis.requestAnimationFrame(fn) : setTimeout(fn, 0));
const cancelFrame = (id) => (typeof globalThis.cancelAnimationFrame === "function" ? globalThis.cancelAnimationFrame(id) : clearTimeout(id));
const escapeId = (id) => (typeof globalThis.CSS?.escape === "function" ? globalThis.CSS.escape(id) : String(id).replace(/["\\]/g, "\\$&"));
// A scroll target nobody could take (its finding is not in the shown diff) does not linger into a later visit.
const SCROLL_TARGET_TTL = 10000;

/** Scrolls the pane's card for `id` a third of the way down its scroller; false while the card is not rendered. */
export function revealFindingCard(paneNode, id) {
  const card = id ? paneNode?.querySelector?.(`[data-review-finding="${escapeId(id)}"]`) : null;
  if (!card) return false;
  const scroller = card.closest?.(".source-changes");
  if (scroller) scroller.scrollTop += card.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientHeight / 3;
  else card.scrollIntoView?.({ block: "center" });
  return true;
}

/**
 * The Changes pane's review findings (FilePane, source-session.jsx) over the session review store that the transcript's
 * findings card writes (2.42304.0 cc8941b7b F; review-findings-model.mjs createReviewFindingsStore):
 *   · the findings are the session's latest review read back from the transcript (latestReviewFindings: ReportFindings
 *     with the card's ids `finding-${toolId}-${n}`, a Codex review, ::code-comment findings), seeded into the store
 *     (seedPaneReview) unless it holds them already;
 *   · the statuses, the current finding and the scroll target are the store's, so the card's View in diff / Walk through,
 *     Apply fixes and the session watcher's outcomes (a skipped one reopens) show here, and this pane's acts show there;
 *   · the bar as cccc2cf0a nb: steps set the current finding and its scroll target (`ig.setCurrentReviewFinding`,
 *     `ig.scrollToAnnotation`), Apply fixes marks the open ones fixing and reopens them if the send fails, Dismiss
 *     dismisses all (`ig.clearReviewFindings(_, !0)`); the card as c44d00c7f Aa / cb61be3a2: Next steps
 *     (stepReviewFinding), X dismisses one (dismissReviewFinding), Fix this one marks it fixing (cb61be3a2 Qe);
 *   · the stand-in session watcher (source-findings-card.jsx useChangesReviewWatcher) settles the fixes of a review no
 *     card watches; `review.turnErrors` / `review.turnTimes` (the session's state.turnErrors / state.turnTimes, optional)
 *     go to it, and without them it ends the fix turn when the session goes idle after running it.
 * The host scrolls to the current finding's card when a scroll target is set and then consumes it (clearScrollTarget);
 * the original scrolls the diff to the target's anchor line. A send the host refuses (sendFixedTurn false: busy,
 * offline, archived — the host toasts the last two itself) reopens its findings without a second message.
 *
 * @returns {{diffReview: object | null, reviewBar: React.ReactNode}} SourceDiff's `review` and the pane's subheader.
 */
export function useChangesPaneReview({ sessionId = null, review = null, cwd = null, enabled = true, pane = null, content = null }) {
  const items = review?.items;
  const result = useMemo(() => (enabled && sessionId ? latestReviewFindings(items, cwd) : null), [enabled, sessionId, items, cwd]);
  const seed = useMemo(() => paneReviewSeed(result, items), [result]); // eslint-disable-line react-hooks/exhaustive-deps
  const statuses = useReviewSlice((state) => (sessionId ? state.findingStatusBySession[sessionId] : undefined)) ?? NO_STATUSES;
  const current = useReviewSlice((state) => (sessionId ? state.currentFindingBySession[sessionId] : undefined));
  const target = useReviewSlice((state) => (sessionId ? state.scrollTargetBySession[sessionId] : undefined));
  const { findings, index, currentId } = useMemo(() => paneReviewView(result, statuses, current), [result, statuses, current]);
  const { addError } = useErrors();
  useEffect(() => { if (sessionId && seed) seedPaneReview(reviewFindingsStore, sessionId, seed); }, [sessionId, seed]);
  // R4f review fix: the session's turn errors / times, when main.jsx puts them on `review`, let the stand-in watcher tell
  // a failed fix turn (reopen) from a finished one (Fixed), as the card's does.
  useChangesReviewWatcher(enabled && review ? sessionId : null, items, review?.active === true, review?.turnErrors ?? null, review?.turnTimes ?? null);
  // The scroll target (the bar's steps, the card's Next or a dismissed current finding's neighbour, the transcript
  // card's View in diff / Walk through): the current finding's card once the diff shows it.
  const seen = useRef(null);
  const shownCurrent = findings.some((entry) => entry.id === current) ? current : null;
  useLayoutEffect(() => {
    if (!enabled || !sessionId || !target) return undefined;
    if (seen.current?.target !== target) seen.current = { target, at: Date.now() };
    const frame = nextFrame(() => {
      if (revealFindingCard(pane?.current, shownCurrent) || !shownCurrent || Date.now() - seen.current.at > SCROLL_TARGET_TTL)
        reviewFindingsStore.clearScrollTarget(sessionId);
    });
    return () => cancelFrame(frame);
  }, [enabled, sessionId, target, shownCurrent, content, findings.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!findings.length) return { diffReview: null, reviewBar: null };
  const store = reviewFindingsStore;
  const held = () => { if (seed) seedPaneReview(store, sessionId, seed, { force: true }); };
  const goTo = (at) => {
    const entry = findings[at];
    if (!entry) return;
    held();
    store.setCurrentReviewFinding(sessionId, entry.id);
    store.scrollToAnnotation(sessionId, entry.file, { fuzzy: true, tileId: "diff", anchor: { side: "additions", line: entry.endLine } });
  };
  const fix = (ids) => {
    if (!review?.onSend || review.active) return;
    const now = store.getState().findingStatusBySession[sessionId] ?? NO_STATUSES;
    const chosen = findings.filter((entry) => ids.includes(entry.id) && (now[entry.id] ?? "open") === "open");
    if (!chosen.length) return;
    const chosenIds = chosen.map((entry) => entry.id);
    held();
    store.markReviewFindingsFixing(sessionId, chosenIds);
    Promise.resolve().then(() => review.onSend(fixFindingsPrompt(chosen))).then((sent) => {
      if (sent === false) store.reopenReviewFindings(sessionId, chosenIds);
    }, (error) => {
      store.reopenReviewFindings(sessionId, chosenIds);
      if (!isSendStopped(error)) addError(sendFailedMessage);
    });
  };
  const diffReview = {
    findings, statuses, currentId, currentSeq: target?.nonce ?? 0,
    onDismiss: (id) => { held(); store.dismissReviewFinding(sessionId, id, "diff"); },
    onFix: review?.onSend ? (id) => fix([id]) : null,
    onNext: findings.length > 1 ? (id) => { held(); store.stepReviewFinding(sessionId, id, "diff"); } : null,
  };
  const reviewBar = <SourceReviewFindingsBar findings={findings} statuses={statuses} currentIndex={index} onStep={goTo}
    onApply={review?.onSend ? () => fix(findings.map((entry) => entry.id)) : null} onRerun={review?.onRerun ?? null} busy={!!review?.active}
    onDismiss={() => { held(); store.clearReviewFindings(sessionId, true); }} />;
  return { diffReview, reviewBar };
}
