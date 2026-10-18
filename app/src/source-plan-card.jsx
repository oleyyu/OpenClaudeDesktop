// Plan approval card: Rse (2.2553.1 approval-current.js:9459-9887), which PM picks for
// ExitPlanMode (:16105-16127). Here it answers the DeepSeek bridge's exit_plan_mode
// review (question id 'plan-review'); the shared runtime owns submission and identity.
import React, { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { planCommentsStore, planFeedbackWithComments } from "./inline-comments.mjs";
import { useApprovalDraft } from "./use-approval-draft.js";
import { PLAN_TARGETS, planReviewResponse } from "./approval-draft-model.mjs";
import { ActionButton, BusyAnnouncement, currentlyVisible, useAllowArming, useHotkeyArming } from "./source-approval-card.jsx";
import { SourceQuestionCard } from "./source-question-card.jsx";
import { useCardHotkeys } from "./use-card-hotkeys.js";
import { SourceMenu } from "./source-menu.jsx";
import { Icon } from "./icons";
import "./source-approval-card.css";
import "./source-plan-card.css";
import { t, tn } from "../electron/i18n/index.mjs";

// Mk/Nk (approval-current.js:9443-9458): the accept label per target mode. The local
// targets are the modes an approved plan continues in (permission-policy.mjs
// afterPlanPermission): 'ask' is the source's 'default' (Manual); 'bypass' is the source's
// bypassPermissions, offered only while Bypass is available (the opt-in is on and the
// core allows it).
export const PLAN_ACCEPT_LABELS = Object.freeze({
  ask: t("Accept"),
  acceptEdits: t("Accept and allow edits"),
  auto: t("Accept and auto mode"),
  bypass: t("Accept and bypass permissions"),
});
export const planTargetOf = (target, { bypass = false } = {}) =>
  target === "bypass" ? (bypass ? "bypass" : "auto") : PLAN_TARGETS.includes(target) ? target : "auto";
/** approval-shared-current.js:8515-8528 pt: the trust-forward accept options, acceptEdits and
 * auto, plus bypassPermissions when the session's modes include it. */
export const planAcceptOptions = ({ bypass = false } = {}) => ["acceptEdits", "auto", ...(bypass ? ["bypass"] : [])];
/** :9802-9884 actions: left Reject / Revise…; right Accept (only when the target is not
 * Manual, D !== "default") then the primary labelled Nk(D). Revise… only opens the
 * feedback field; :9783-9801 swaps in Back / Revise. With more than one accept option the
 * primary is a split button (:9853-9875 xee) whose 'More accept options' menu lists the
 * other options (Nk labels): `more`, one entry per mode. */
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

/** The split primary's trailing half: a caret that opens 'More accept options' (xee). */
export function PlanMoreOptions({ options, enabled, busy, onChoose }) {
  const [open, setOpen] = useState(null);
  const button = useRef(null);
  if (!options?.length) return null;
  const disabled = !enabled || busy;
  return <>
    <button ref={button} type="button" className="sac-button spc-more" data-cds="Button" data-variant="primary"
      aria-label={t("More accept options")} title={t("More accept options")} disabled={!enabled && !busy}
      aria-disabled={disabled || undefined} aria-haspopup="menu" aria-expanded={!!open} data-popup-open={open ? "" : undefined}
      onClick={(event) => { event.stopPropagation(); if (!disabled) setOpen(open ? null : { token: Date.now() }); }}
      onKeyDown={(event) => {
        if (open || disabled || event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
        event.preventDefault(); event.stopPropagation();
        setOpen({ token: Date.now(), entry: event.key === "ArrowDown" ? "first" : "last" });
      }}>
      <span className="sac-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
      <Icon name="CaretDown" size={12} />
    </button>
    {open && <SourceMenu.Popup key={open.token} anchor={button.current} trigger={button.current} side="bottom" align="end"
      label={t("More accept options")} onClose={() => setOpen(null)} initialHighlight={open.entry}>
      {options.map((option) => <SourceMenu.Item key={option.mode} data-plan-option={option.mode}
        onClick={() => { setOpen(null); onChoose(option.mode); }}>{option.label}</SourceMenu.Item>)}
    </SourceMenu.Popup>}
  </>;
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
  const root = useRef(null), field = useRef(null), headingId = useId();
  const [revising, setRevising] = useState(false), [feedback, setFeedback] = useState("");
  // Comments left on the plan in the Plan pane (inline-comments.mjs): Revise sends them before the typed feedback.
  useSyncExternalStore(planCommentsStore.subscribe, planCommentsStore.version, planCommentsStore.version);
  const threadId = ticket.threadId ?? request?.params?.threadId ?? null;
  const comments = threadId ? planCommentsStore.get(threadId) : [];
  const clickArmed = useAllowArming(root, ticket.key, isActive);
  const hotkeyArmed = useHotkeyArming(root, ticket.key, isActive);
  const target = planTargetOf(planTarget, { bypass: bypassAvailable });
  const actionable = isActive && typeof respond === "function";
  // As SourceApprovalCardView: keys need no open menu; the keycaps follow that gate but
  // survive busy (faded by ActionButton), so a busy button keeps its width.
  const busy = view.busy, shortcutEnabled = actionable && !busy && !menuOpen, keycapShown = actionable && !menuOpen;
  // :9581-9583: opening the feedback field focuses it.
  useLayoutEffect(() => { if (revising) field.current?.focus(); }, [revising]);

  const submit = async (action, chosen = target) => {
    if (!actionable || busy) return;
    const result = await runtime.submit(ticket, action, respond, {
      getVisibleThreadId, response: planReviewResponse(action, { feedback: action === "revise" ? planFeedbackWithComments(feedback, comments) : feedback, target: chosen }) });
    if (result.status === "answered") { if (threadId && (action === "revise" || action === "primary" || action === "accept")) planCommentsStore.clear(threadId); onResolved({ request, ticket: result.ticket }); }
    else if (result.status === "error") onError({ request, ticket: result.ticket, message: result.message });
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

  // :9604-9675 key handling (scoped to the card, like SourceApprovalCardView): Escape opens
  // Revise…; ⌘⏎ accepts with the trust-forward target, ⌘⇧⏎ with Manual, after the hotkey
  // arming clock and a fresh visibility check. Off while the feedback field is open.
  function keyDown(event) {
    if (revising || event.defaultPrevented || composing(event) || event.altKey) return;
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
  // Esc opens Revise… instead of stopping the turn and ⌘⏎ accepts. Off while revising (the field owns the keys).
  useCardHotkeys(root, shortcutEnabled && !revising, (key, event) => {
    event.preventDefault(); event.stopPropagation();
    if (event.repeat) return;
    if (key === "escape") { setRevising(true); return; }
    if (!hotkeyArmed() || !currentlyVisible(root.current)) return;
    void submit(key === "submit-shift" && target !== "ask" ? "accept" : "primary");
  }, currentlyVisible);
  // :9682-9701 the feedback field: Escape goes Back, Enter (not Shift+Enter) revises.
  function fieldKeyDown(event) {
    if (composing(event)) return;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); back(); return; }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) void submit("revise");
    }
  }

  const { left, right, more } = planCardActions(target, revising, { bypass: bypassAvailable, acceptModes: planAcceptModes });
  const button = (action) => <ActionButton key={action.key} action={action} busy={busy} busyAction={view.busyAction}
    enabled={actionable} onAction={onAction}
    keycap={keycapShown ? action.keycap : undefined}
    shortcut={shortcutEnabled ? action.shortcut : undefined} />;
  return <section ref={root} className="source-message sac-card spc-card" data-approval-presentation="card"
    data-approval-instance={ticket.bridgeApproval.instanceId} data-approval-connection={ticket.bridgeApproval.connectionId}
    data-approval-request-id={String(ticket.requestId)} data-approval-request-id-type={typeof ticket.requestId}
    data-approval-question-kind="plan-review" data-approval-kind="plan" data-plan-revising={revising ? "" : undefined}
    role="group" aria-labelledby={headingId} aria-busy={busy || undefined}
    tabIndex={0} onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
    {/* Vp: the heading (rm/ev with a footnote 'Open plan' TextLink trailing) and, while
        revising, the 3-row 'Plan feedback' TextArea (:9734-9782). */}
    <div className="sac-body spc-body">
      <div className="spc-heading">
        <span className="spc-heading-copy"><span id={headingId} className="spc-title">{t("DeepSeek proposed a plan")}</span></span>
        {onOpenPlan && <span className="spc-trailing">
          <button type="button" className="spc-open-plan" data-cds="TextLink" onClick={onOpenPlan}>{t("Open plan")}</button>
        </span>}
      </div>
      {comments.length > 0 && <p className="spc-comments" data-plan-comments="">{tn(comments.length, "Your {count} comment on the plan is sent with Revise.", "Your {count} comments on the plan are sent with Revise.")}</p>}
      {revising && <textarea ref={field} className="spc-feedback" data-cds="TextArea" rows={3}
        aria-label={t("Plan feedback")} placeholder={t("What should change? (optional)")} value={feedback}
        disabled={busy} onChange={event => setFeedback(event.target.value)} onKeyDown={fieldKeyDown} />}
    </div>
    {view.error && <p role="alert" className="sac-error">{view.error}</p>}
    {revising
      ? <footer className="spc-actions" data-revising="">{left.map(button)}{right.map(button)}</footer>
      : <footer className="spc-actions">
          <div className="spc-left">{left.map(button)}</div>
          <div className="spc-right" onClickCapture={event => {
            if (!clickArmed()) { event.preventDefault(); event.stopPropagation(); }
          }}>{right.map((action) => action.primary && more.length
            ? <span key={action.key} className="spc-split" data-split="">{button(action)}
                <PlanMoreOptions options={more} enabled={actionable} busy={busy} onChoose={(mode) => void submit("primary", mode)} /></span>
            : button(action))}</div>
        </footer>}
    {busy && <BusyAnnouncement />}
  </section>;
}
