import React from "react";
// W14-code r6 R6DC-02: shared-frame Uu (E41 direct import), not the host replica.
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { Icon } from "./icons";
import "./source-transcript-states.css";
import { t } from "../electron/i18n/index.mjs";

// Transcript pane states of approval-entry-current.js (2.2553.1):
// _d :1141-1190 pending -> gd -> Zw skeleton, :4211-4217 xu load failure and
// :4224-4233 Cl "No messages yet". Class strings are the source strings; every
// utility they name is in the loaded original /assets/v1/c6a992d55-C0zTICcS.css.

// ion-dist shared-8-B5xbG2px.js O_: per-paragraph line widths of the k_ skeleton.
export const SKELETON_PARAGRAPHS = [["w-[96%]", "w-full", "w-[92%]", "w-[58%]"], ["w-full", "w-[94%]", "w-[41%]"], ["w-[97%]", "w-[90%]", "w-[66%]"]];
// shared-frame hc wave motion: --cds-skel-i cycles through floor(ic 2000 / oc 90) slots.
const WAVE_SLOTS = Math.floor(2000 / 90);
// k_ Xi = gc (shared-frame :3448-3480) inside a SkeletonGroup (Ns context true), so
// the group branch renders: no role, no ::after shimmer, class X(c,"h-[1em] max-w-full
// rounded bg-[var(--cds-skeleton-base)]",n). X is tailwind-merge (shared-frame :230 Pt
// with borderRadius theme key "card"), so the caller's h-/w-/max-w-/rounded-card win;
// the strings below are that merge's output. The breathe animation comes from the
// loaded design-system rule [data-cds=SkeletonGroup][data-motion=wave] [data-cds=Skeleton].
const BUBBLE_CLASS = "bg-[var(--cds-skeleton-base)] box-content h-[1lh] w-72 max-w-[85%] rounded-card py-md text-heading";
const lineClass = (width) => `max-w-full rounded bg-[var(--cds-skeleton-base)] h-[0.72em] ${width}`;
// hc's wave effect assigns --cds-skel-i in DOM order from 0 to every Skeleton that has
// none; this markup is static, so the same indices are written at render time.
const Bar = ({ className, index }) => <div data-cds="Skeleton" className={className} style={{ "--cds-skel-i": String(index % WAVE_SLOTS) }} />;

// 2.42304.0 shared-2-Cb74JByF Ob({hold, decorative, onShown, onHidden, fillColumn = false}) — the message skeleton
// (2.2553.1 shared-8 k_) inside Bu, which is shared-frame-BfjMqbuN tl = nd, the SkeletonGroup:
// - Ob's class: "text-prose flex flex-col overflow-hidden fade-out-bottom " + (fillColumn ? "min-h-0 grow basis-0
//   max-h-[calc(100vh-12.5rem)]" : "h-[calc(100vh-12.5rem)]"). overflow-hidden is new since 2.31226.0; fillColumn lets
//   the skeleton fill the rest of a flex column (capped at the old fixed height) instead of taking that height.
// - nd's decorative: role={i ? void 0 : "status"}, "aria-hidden": i ? !0 : void 0, and no sr-only
//   [data-skeleton-label] child; otherwise role=status with the "Loading" label. Either way the bars sit in
//   <div aria-hidden class="contents">.
// - An object hold ({none: reason}): nd renders data-hold="none", data-hold-reason and data-shown at once, the label
//   already filled. W14-code r5 gates-r5-05: the "delayed" hold (holdReason "delayed", 3.6556.2 shared-frame Kd `M`):
//   data-hold="delayed" with no reason, not shown, the label empty; the design system's cds-placeholder-reveal (its
//   delay --placeholder-reveal-delay 0.5s) shows it — onAnimationStart sets data-shown and writes the label, onAnimationEnd
//   (qd) marks it settled (--cds-skel-settled 1e5ms, data-settled). Not reproduced: --cds-skel-elapsed (the time since
//   the session opened, ~0 here: the skeleton mounts as it opens), the onShown / onHidden bookkeeping and nd's
//   cross-document phase sync (one document).
// The paragraph column's insets are Ob's logical ps-/pe- (pl-/pr- through 2.37337.1).
function revealDelayed(event) {
  if (event.animationName !== "cds-placeholder-reveal" || event.target !== event.currentTarget) return;
  event.currentTarget.setAttribute("data-shown", "");
  const label = event.currentTarget.querySelector("[data-skeleton-label]");
  if (label !== null && label.textContent === "") label.textContent = t("Loading");
}
function settleDelayed(event) {
  if (event.animationName !== "cds-placeholder-reveal" || event.target !== event.currentTarget) return;
  event.currentTarget.style.setProperty("--cds-skel-settled", "100000ms");
  event.currentTarget.setAttribute("data-settled", "");
}
export function SourceMessageSkeleton({ holdReason = "route", decorative = false, fillColumn = false }) {
  let index = 0;
  const delayed = holdReason === "delayed";
  return <div data-cds="SkeletonGroup" data-motion="wave" data-hold={delayed ? "delayed" : "none"} data-hold-reason={delayed ? undefined : holdReason}
    data-shown={delayed ? undefined : ""} role={decorative ? undefined : "status"} aria-hidden={decorative ? true : undefined}
    onAnimationStart={delayed ? revealDelayed : undefined} onAnimationEnd={delayed ? settleDelayed : undefined}
    className={`text-prose flex flex-col overflow-hidden fade-out-bottom ${fillColumn ? "min-h-0 grow basis-0 max-h-[calc(100vh-12.5rem)]" : "h-[calc(100vh-12.5rem)]"}`}>
    {decorative ? null : <span className="sr-only" data-skeleton-label="true">{delayed ? "" : t("Loading")}</span>}
    <div aria-hidden="true" className="contents">
      <div data-testid="chat-message-skeleton" className="contents">
        <div className="mt-[var(--msg-gap,1.5rem)] flex shrink-0 justify-end"><Bar className={BUBBLE_CLASS} index={index++} /></div>
        <div className="mt-xs mb-xs h-6 shrink-0" />
        <div className="flex shrink-0 flex-col gap-[0.75em] ps-[var(--msg-text-inset,0.5rem)] pe-[var(--msg-inset-end,0.5rem)]">
          {SKELETON_PARAGRAPHS.map((lines, paragraph) => <div key={paragraph} className="flex flex-col">
            {lines.map((width, line) => <div key={line} className="flex h-[1lh] items-center"><Bar className={lineClass(width)} index={index++} /></div>)}
          </div>)}
        </div>
        <div className="mt-xs h-6 shrink-0" />
      </div>
    </div>
  </div>;
}

// The Code transcript's pending skeleton: 2.42304.0 shared-20-B7UqYfsi gp({hasEarlier = false, hold, onShown})
// (2.2553.1 Zw, readable/shared-22-Cz3C_T8d.js:5356-5374) — an aria-hidden [data-transcript-skeleton] wrapper
// (dp) with paddingTop 48 + (hasEarlier ? 40 : 0) around Cs = Ob({hold, onShown}): not decorative, no fillColumn.
// gd (approval-entry-current.js:1126-1139) always passes an object hold: {none:"handoff"} when the
// __gb__2846116625 gate (cfc63964b b(), default false) is on, else {none:"route"}. 3.6556.2 holds "handoff" outright: the
// Code feed's skeleton `Att = {none: "handoff"}` (c96d752d0), Cowork's `UC = {none: "handoff"}` (shared-19), Chat's ty
// `hold: {none: "handoff"}` (shared-23) — W14-code r4 gates-r4-11: the gate is no longer served, the reason stays "handoff".
// W14-code r5 gates-r5-05: the Code session's skeleton is cf74bc599 fS's `tu({continuesShown})` (cacf551c6 m): "handoff"
// while the session continues what was shown (the window's first session, cached rows), else "delayed" (main.jsx). hasEarlier is false locally (no earlier-page indicator exists), so the top padding is 48. gp's inner
// column also carries the message-column class gs (shared-6 tp; 2.2553.1 f_ = shared-12 Km: mx-auto, 768px
// measure, 32px gutters); the local .source-transcript-content already applies that column padding around it.
// gp's mp context mount() for an object hold has no local counterpart.
export function SourceTranscriptSkeleton({ hasEarlier = false, holdReason = "handoff" }) {
  return <div data-transcript-skeleton="" aria-hidden="true" className="h-full overflow-hidden [scrollbar-gutter:stable_both-edges]" style={{ paddingTop: 48 + (hasEarlier ? 40 : 0) }}>
    <div className="w-full [--msg-gap:0px]">
      <SourceMessageSkeleton holdReason={holdReason} />
    </div>
  </div>;
}

// EmptyState u (ion-dist cc0a875c8-B6xI6vLN.js): root r, optional string icon or an element (a Spinner)
// (Icon size "lg" = 24px glyph, class i "!size-7 text-muted" = 28px box), text
// block a (textRole: Jh's role=alert names the text only, not the actions), title o, body s, actions c. The children
// slot is unused by these callers.
export function SourceEmptyState({ icon, title, body, actions, role, textRole }) {
  return <div role={role} className="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center source-empty-state">
    {typeof icon === "string" ? <Icon name={icon} size={24} className="!size-7 text-muted" aria-hidden="true" /> : icon ?? null}
    <div role={textRole} className="flex flex-col items-center gap-1">
      <p className="max-w-[36ch] break-words text-body text-primary">{title}</p>
      {body && <p className="max-w-[36ch] break-words text-footnote text-muted">{body}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center justify-center gap-1">{actions}</div>}
  </div>;
}

// xu = V (ion-dist c4ea84cb3-BrWqBPlP.js) default branch: role=alert EmptyState,
// "Couldn’t load this session", B's default body (Codex reports no load-failure
// kind, so the kind-specific bodies never apply) and a primary CDS Button "Retry".
export const LOAD_FAILURE_TITLE = t("Couldn’t load this session");
export const LOAD_FAILURE_BODY = t("Something went wrong while loading earlier messages.");
export function SourceTranscriptLoadFailure({ onRetry }) {
  return <SourceEmptyState role="alert" title={LOAD_FAILURE_TITLE} body={LOAD_FAILURE_BODY}
    actions={<CdsButton variant="primary" onClick={onRetry}>{t("Retry")}</CdsButton>} />;
}

// approval-entry-current.js:4224-4233 Cl with only the title.
export const EMPTY_TRANSCRIPT_TITLE = t("No messages yet");
export function SourceTranscriptEmpty() {
  return <SourceEmptyState title={EMPTY_TRANSCRIPT_TITLE} />;
}
