// Plan approval card: 3.6556.2 cc32965c2 Fs (readable :2089-2649), the card the tool approval area picks for
// ExitPlanMode. Here it answers the DeepSeek bridge's exit_plan_mode review (question id 'plan-review'); the shared
// runtime owns submission and identity. V3-W14-approvals: the shell, body, title row, comment list (Is), feedback field
// and decision rows are Fs's, with its class strings; the buttons are the CDS Button (view-tabs), the right-hand ones
// c30607cef i / a (cc32965c2 Xi / Yi: the Button and the SplitDropdownButton whose keycap hides while the window is not
// attended), in the kS allow arming span (cc32965c2 `Ft as ir`).
import React, { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { planCommentsStore, planFeedbackWithComments } from "./inline-comments.mjs";
import { useApprovalDraft } from "./use-approval-draft.js";
import { PLAN_TARGETS, planReviewResponse } from "./approval-draft-model.mjs";
import { icuFormat } from "./approval-card-model.mjs";
import { APPROVAL_CARD_BODY, ApprovalAllowArm, PLAIN_CARD_SHELL, currentlyVisible, useHotkeyArming } from "./source-approval-card.jsx";
import { SourceQuestionCard } from "./source-question-card.jsx";
import { useCardHotkeys } from "./use-card-hotkeys.js";
import { CdsButton, CdsIcon, CdsSplitDropdownButton, CdsTextArea, CdsTextLink, cdsClassNames } from "./generated/view-tabs/index.js";
import { QuestionCardHeader as PlanCardTitle } from "./generated/question-card/card-header.mjs";
import { QuestionPrimaryButton as PlanDecisionButton } from "./generated/question-card/primary-button.mjs";
import { useWindowUnattended } from "./generated/approval-landing/window-attention-hook.mjs";
import { usePersona } from "./use-persona.js";
import { useSourceToasts } from "./source-toast.jsx";
import { assistantName } from "./persona-store.mjs";
import { t } from "../electron/i18n/index.mjs";

// Ns / Ps (readable :2078-2088): the accept label per target mode. The local targets are the modes an approved plan
// continues in (permission-policy.mjs afterPlanPermission): 'ask' is the source's 'default' (Manual); 'bypass' is the
// source's bypassPermissions, offered only while Bypass is available (the opt-in is on and the core allows it).
export const PLAN_ACCEPT_LABELS = Object.freeze({
  ask: t("Accept"),
  acceptEdits: t("Accept and allow edits"),
  auto: t("Accept and auto mode"),
  bypass: t("Accept and bypass permissions"),
});
export const planTargetOf = (target, { bypass = false } = {}) =>
  target === "bypass" ? (bypass ? "bypass" : "auto") : PLAN_TARGETS.includes(target) ? target : "auto";
/** The trust-forward accept options (Fs acceptOptions `se`): acceptEdits and auto, plus bypassPermissions when the
 * session's modes include it. */
export const planAcceptOptions = ({ bypass = false } = {}) => ["acceptEdits", "auto", ...(bypass ? ["bypass"] : [])];
/** nt (readable :2500-2610) actions: left Reject / Revise… (esc); right Accept (⌘⇧↵, only when the target is not
 * Manual, `N !== "default"`) then the primary labelled Ps(N) (⌘↵). While revising: Back and Revise. `more` lists the
 * other accept options (the handoff card's split menu); Fs's own split lists every option (`se.map`). */
export function planCardActions(target, revising = false, { bypass = false, labels = PLAN_ACCEPT_LABELS, acceptModes } = {}) {
  if (revising) return {
    left: [{ key: "back", label: t("Back"), primary: false }],
    right: [{ key: "revise", label: t("Revise"), primary: true }],
    more: [],
  };
  const mode = planTargetOf(target, { bypass });
  return {
    left: [{ key: "reject", label: t("Reject"), primary: false },
      { key: "revise-open", label: t("Revise…"), primary: false, keycap: "esc", shortcut: "Escape" }],
    right: [
      ...(mode !== "ask" ? [{ key: "accept", label: labels.ask, primary: false,
        keycap: "cmd+shift+enter", shortcut: "Meta+Shift+Enter Control+Shift+Enter" }] : []),
      { key: "primary", label: labels[mode], primary: true, keycap: "cmd+enter", shortcut: "Meta+Enter Control+Enter" },
    ],
    more: planAcceptOptions({ bypass }).filter((option) => option !== mode && (!acceptModes || acceptModes.includes(option))).map((option) => ({ mode: option, label: labels[option] })),
  };
}

// c81ea1931 t (cc32965c2 Wa): the buttons keep focus where it is on press.
const keepFocus = (event) => event.preventDefault();
// c30607cef a (cc32965c2 Yi): the SplitDropdownButton whose keycap hides while the window is not attended. Not sliced
// (extract-question-card.mjs takes only its sibling i): the same two lines over the generated hook and the CDS button.
function PlanSplitButton(props) {
  const unattended = useWindowUnattended();
  return <CdsSplitDropdownButton {...props} hideShortcut={unattended || (props.hideShortcut ?? false)} />;
}

/** nt (not revising): `div.epitaxy-approval-actions…[&>div]:grow` > [left `div.flex.gap-[8px]`, right
 * `div.flex.flex-wrap.justify-end.gap-[8px]` > ir(arming) > the allows]. The primary is the split button (Yi, side top,
 * align end, "More accept options") when `items` offers more than one target. Exported for the plan handoff card. */
export function PlanDecisions({ left, right, items = [], armKey, enabled = true, busy = false, busyAction = null, keycaps = true, onAction, onChoose }) {
  const [open, setOpen] = useState(false);
  const press = (key) => () => { if (enabled && !busy) onAction(key); };
  const leftButton = (action) => <CdsButton key={action.key} variant="secondary" data-approval-action={action.key}
    shortcut={keycaps ? action.keycap : undefined} disabled={!enabled && !busy} busy={busy && busyAction === action.key}
    onMouseDown={keepFocus} onClick={press(action.key)}>{action.label}</CdsButton>;
  const rightButton = (action) => action.primary && items.length > 1
    ? <PlanSplitButton key={action.key} variant="primary" side="top" align="end" aria-label={action.label} label={action.label}
        open={open} onOpenChange={setOpen} menuLabel={t("More accept options")} disabled={!enabled && !busy} busy={busy && busyAction === action.key}
        onPrimaryClick={press(action.key)} shortcut={keycaps ? action.keycap : undefined}
        items={items.map((item) => ({ label: item.label, onSelect: () => { if (enabled && !busy) onChoose(item.mode); } }))} />
    : <PlanDecisionButton key={action.key} variant={action.primary ? "primary" : "secondary"} data-approval-action={action.key}
        data-approval-primary={action.primary ? "" : undefined} shortcut={keycaps ? action.keycap : undefined}
        disabled={!enabled && !busy} busy={busy && busyAction === action.key} onMouseDown={keepFocus} onClick={press(action.key)}>{action.label}</PlanDecisionButton>;
  return <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-x-1 gap-y-[8px] [&>div]:grow">
    <div className="flex gap-[8px]">{left.map(leftButton)}</div>
    <div className="flex flex-wrap justify-end gap-[8px]"><ApprovalAllowArm armKey={armKey}>{right.map(rightButton)}</ApprovalAllowArm></div>
  </div>;
}

// Is (readable :2650-2730): the inline comments left on the plan, each a row that opens the plan (the quoted text over the
// comment) with a Delete comment X; the count is an sr-only last item.
function PlanComments({ threadId, comments, onOpenPlan }) {
  return <ul className="flex max-h-[176px] scroll-p-[8px] flex-col gap-1 overflow-y-auto -m-[8px] p-[8px]" data-plan-comments="">
    {comments.map((entry) => <li key={entry.id} className="flex items-center gap-0.5 rounded-[5px] bg-alpha-1 pe-1.25 hover:bg-alpha-2">
      <button type="button" onClick={onOpenPlan}
        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-[5px] p-1.25 text-start focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus">
        <span className="flex items-center gap-0.75 text-caption text-muted-as-secondary">
          <CdsIcon name="ChatSimple" size="xs" />
          <span className="truncate">{entry.quote}</span>
        </span>
        <span className="text-body text-primary">{entry.text}</span>
      </button>
      <CdsButton variant="ghost" icon="X" iconOnly className="shrink-0" aria-label={t("Delete comment")} onMouseDown={keepFocus}
        onClick={() => planCommentsStore.remove(threadId, entry.id)} />
    </li>)}
    <li className="sr-only">{icuFormat(t("{count, plural, one {# inline comment} other {# inline comments}} will be sent"), { count: comments.length })}</li>
  </ul>;
}

const composing = (event) => event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229 || event.nativeEvent?.keyCode === 229;

export function SourcePlanApprovalCard(props) {
  const { ticket, view } = useApprovalDraft(props.runtime, props.request);
  // A malformed review keeps the question card's non-submittable error notice.
  if (view?.phase === "invalid") return <SourceQuestionCard {...props} />;
  if (!ticket || !view || view.phase !== "pending") return null;
  return <PlanCard key={ticket.key} {...props} ticket={ticket} view={view} />;
}

function PlanCard({ runtime, request, ticket, view, getVisibleThreadId, respond, onResolved = () => {}, onError = () => {},
  isActive = true, menuOpen = false, planTarget, planAcceptModes, bypassAvailable = false, onOpenPlan }) {
  usePersona(); // the title names the session's assistant
  const root = useRef(null), field = useRef(null), headingId = useId();
  const [revising, setRevising] = useState(false), [feedback, setFeedback] = useState("");
  // Comments left on the plan in the Plan pane (inline-comments.mjs): Revise sends them before the typed feedback.
  useSyncExternalStore(planCommentsStore.subscribe, planCommentsStore.version, planCommentsStore.version);
  const threadId = ticket.threadId ?? request?.params?.threadId ?? null;
  const comments = threadId ? planCommentsStore.get(threadId) : [];
  // Fs `B = oe > 0, V = me || B`: with comments the field (and Revise) stay open.
  const hasComments = comments.length > 0, fieldOpen = revising || hasComments;
  const hotkeyArmed = useHotkeyArming(root, ticket.key, isActive);
  const target = planTargetOf(planTarget, { bypass: bypassAvailable });
  const actionable = isActive && typeof respond === "function";
  const busy = view.busy, shortcutEnabled = actionable && !busy && !menuOpen, keycapShown = actionable && !menuOpen;
  // Opening the feedback field focuses it.
  useLayoutEffect(() => { if (revising) field.current?.focus(); }, [revising]);

  // V3-W14-approvals (pane-09): c5da7eb42 KS Ce — a failed send is an error toast, as on the tool card. W14-code r5pa-12 /
  // R5DC-07: SourceToastProvider wraps the root, so the card draws no in-card error line (KS has none).
  const toasts = useSourceToasts();
  const submit = async (action, chosen = target) => {
    if (!actionable || busy) return;
    const result = await runtime.submit(ticket, action, respond, {
      getVisibleThreadId, response: planReviewResponse(action, { feedback: action === "revise" ? planFeedbackWithComments(feedback, comments) : feedback, target: chosen }) });
    if (result.status === "answered") { if (threadId && (action === "revise" || action === "primary" || action === "accept")) planCommentsStore.clear(threadId); onResolved({ request, ticket: result.ticket }); }
    else if (result.status === "error") { toasts?.add?.(result.message, { variant: "danger" }); onError({ request, ticket: result.ticket, message: result.message }); }
  };
  const back = () => {
    setRevising(false); setFeedback("");
    // Card-scoped keys: keep focus in the card once the field unmounts.
    root.current?.focus({ preventScroll: true });
  };
  const onAction = (key) => {
    if (key === "revise-open") { if (!busy) setRevising(true); return; }
    if (key === "back") { if (!busy) back(); return; }
    void submit(key);
  };

  // Key handling (scoped to the card): Escape opens Revise…; ⌘⏎ accepts with the trust-forward target, ⌘⇧⏎ with
  // Manual, after the hotkey arming clock and a fresh visibility check. Off while the feedback field is open.
  function keyDown(event) {
    if (fieldOpen || event.defaultPrevented || composing(event) || event.altKey) return;
    const element = event.target;
    if (element.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="menu"],[role="listbox"]')) return;
    if (!shortcutEnabled) return;
    if (event.key === "Escape" && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) setRevising(true);
      return;
    }
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.repeat || !hotkeyArmed() || !currentlyVisible(root.current)) return;
    void submit(event.shiftKey && target !== "ask" ? "accept" : "primary");
  }
  // The same keys from outside the card (use-card-hotkeys: the session's empty composer or an unfocused page), so
  // Esc opens Revise… instead of stopping the turn and ⌘⏎ accepts. Off while the field is open (it owns the keys).
  useCardHotkeys(root, shortcutEnabled && !fieldOpen, (key, event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    if (key === "escape") { setRevising(true); return; }
    if (!hotkeyArmed() || !currentlyVisible(root.current)) return;
    void submit(key === "submit-shift" && target !== "ask" ? "accept" : "primary");
  }, currentlyVisible);
  // Ke (readable :2418-2436): the feedback field — Escape goes Back (unless comments keep it open), Enter (not
  // Shift+Enter) revises.
  function fieldKeyDown(event) {
    if (composing(event)) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!hasComments) back(); return; }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) void submit("revise");
    }
  }

  const { left, right } = planCardActions(target, false, { bypass: bypassAvailable, acceptModes: planAcceptModes });
  // Fs Je: the split menu lists every accept option (`se.map`), shown when there is more than one.
  const options = planAcceptOptions({ bypass: bypassAvailable }).filter((option) => !planAcceptModes || planAcceptModes.includes(option))
    .map((option) => ({ mode: option, label: PLAN_ACCEPT_LABELS[option] }));
  const press = (key) => () => { if (actionable && !busy) onAction(key); };
  return <section ref={root} className={cdsClassNames("source-message", PLAIN_CARD_SHELL)} data-approval-presentation="card" data-approval-card-root=""
    data-approval-instance={ticket.bridgeApproval.instanceId} data-approval-connection={ticket.bridgeApproval.connectionId}
    data-approval-request-id={String(ticket.requestId)} data-approval-request-id-type={typeof ticket.requestId}
    data-approval-question-kind="plan-review" data-approval-kind="plan" data-plan-revising={revising ? "" : undefined}
    role="group" aria-labelledby={headingId} aria-busy={busy || undefined}
    tabIndex={0} onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
    {/* tt (lo): the title row ($e: Lt titleNamesCard, "Claude proposed a plan" uwYMasx1yw with the "Open plan" text link
        trailing, `fi("text-footnote", "text-body")`) and, while the field is open (et), the comments and the TextArea. */}
    <div className={APPROVAL_CARD_BODY}>
      <PlanCardTitle titleNamesCard trailing={onOpenPlan ? <CdsTextLink className={cdsClassNames("text-footnote", "text-body")} onClick={onOpenPlan}>{t("Open plan")}</CdsTextLink> : undefined}>
        <span id={headingId}>{t("{name} proposed a plan", { name: assistantName() })}</span>
      </PlanCardTitle>
      {fieldOpen && <>
        {threadId && hasComments && <PlanComments threadId={threadId} comments={comments} onOpenPlan={onOpenPlan} />}
        <CdsTextArea ref={field} rows={3} value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)} onKeyDown={fieldKeyDown}
          aria-label={t("Plan feedback")} placeholder={hasComments ? t("Anything else to add?") : t("What should change? (optional)")} />
      </>}
    </div>
    {fieldOpen
      ? <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-x-1 gap-y-[8px]" data-revising="">
          {hasComments ? <span className="[@container_(max-width:420px)]:hidden" />
            : <CdsButton variant="secondary" data-approval-action="back" disabled={!actionable && !busy} onMouseDown={keepFocus} onClick={press("back")}>{t("Back")}</CdsButton>}
          <CdsButton variant="primary" data-approval-action="revise" disabled={!actionable && !busy} busy={busy && view.busyAction === "revise"}
            onMouseDown={keepFocus} onClick={press("revise")}>{t("Revise")}</CdsButton>
        </div>
      : <PlanDecisions left={left} right={right} items={options} armKey={ticket.key} enabled={actionable} busy={busy} busyAction={view.busyAction}
          keycaps={keycapShown} onAction={onAction} onChoose={(mode) => void submit("primary", mode)} />}
  </section>;
}
