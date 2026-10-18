import { localizeBridgeText } from "./bridge-text-model.mjs";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceDisclosure } from "./source-disclosure.jsx";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { createClipboardFeedback } from "./clipboard-feedback.mjs";
import { describeTurnError, TURN_ERROR_ICONS, turnErrorDetails, turnErrorStatus } from "./turn-error-model.mjs";
import "./source-turn-error.css";
import { t } from "../electron/i18n/index.mjs";

function usageLimitView(view, error, limitReset) {
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  const specific = message && message.length <= 400 && !/^usage limit/i.test(message) && /usage limit|credits|upgrade|admin|try again at/i.test(message);
  const hint = [specific ? message : view.hint, limitReset?.label].filter(Boolean).join(" ");
  return { ...view, hint, retryHelps: view.retryHelps && !limitReset?.active };
}
// approval-shared-current.js:4069-4083 Lp: ghost sm, flush start, Copy/Check.
function CopyDetails({ details }) {
  const [state, setState] = useState("idle");
  const controller = useRef(null);
  useLayoutEffect(() => {
    const feedback = createClipboardFeedback({
      writeText: (value) => typeof navigator === "undefined" || !navigator.clipboard?.writeText
        ? Promise.reject(new Error("Clipboard unavailable")) : navigator.clipboard.writeText(value),
      onState: setState,
    });
    controller.current = feedback;
    return () => { controller.current = null; feedback.dispose(); };
  }, []);
  useLayoutEffect(() => { controller.current?.setText(details); }, [details]);
  const copied = state === "copied";
  return <SourceSettingsButton variant="ghost" size="sm" icon={copied ? "Check" : "Copy"} iconSize={16}
    className="ste-copy" style={{ "--cds-outset-x": "var(--cds-pad-md)" }}
    onClick={() => { void controller.current?.copy(); }}>{copied ? t("Copied") : t("Copy details")}</SourceSettingsButton>;
}

// approval-shared-current.js:4084-4199 Rp/zp: "View details" disclosure whose
// panel (order-first) holds the error body, the Status line and Copy details;
// the card's actions sit at the end of the same wrapping row.
function TurnErrorDetails({ details, status, actions }) {
  if (!details && !actions) return null;
  const after = actions ? <div className="ste-actions">{actions}</div> : null;
  if (!details) return <div className="ste-details">{after}</div>;
  return <SourceDisclosure className="ste-details" triggerClassName="ste-details-trigger" caret="end" label={t("View details")} after={after}>
    <div className="ste-details-panel">
      <div className="ste-details-box">
        <span className="ste-details-text">{details}</span>
        {status !== undefined && <div className="ste-details-facts"><span>{t("Status: {status}", { status })}</span></div>}
        <div className="ste-details-copy"><CopyDetails details={details}/></div>
      </div>
    </div>
  </SourceDisclosure>;
}

function ErrorIcon({ kind }) {
  const icon = TURN_ERROR_ICONS[kind] || TURN_ERROR_ICONS.warning;
  return <Icon name={icon.name} size={16} className={`ste-icon ste-tone-${icon.tone}`}/>;
}

// One failed Codex turn. variant "card" = newest error of the last turn
// (scroll-messages ehe -> YY -> cf6ae6197 Bp); "marker" = every older one
// (JY -> uJ, scroll-messages-current.js:32289-32330).
// limitReset (usage-model usageLimitReset, from the plan limits): a usage-limit card names when the limit resets, and
// while it is in force 'Try again' is left out. Codex's own text (an upgrade, buying credits, asking the admin) is the
// hint when it says more than the generic one.
// onRewind: go back to before this turn (thread/revert; the context-full card's Rewind). onSwitchModel: open the model
// menu (an overloaded model). onSignIn / signInLabel: the core's own sign-in for an auth failure (Settings › Account);
// signedInAgain: a sign-in succeeded after this failure, so the card settles into the official quiet 'Signed in again'
// marker (cd5a31703 Hq/Uq). Exactly one action is primary, as the official card marks one (c3e34355f V).
// onDismiss (card only): the session error notice's Dismiss (2.42304.0 cccc2cf0a nT → c3e34355f → cb1a6e506 A
// `onDismiss: P`), a ghost sm X ending the header row; its mousedown is prevented (c81ea1931) so focus stays put.
// onGoBack / onPrefill (card only, Cowork, R4i-cowork CW3): 2.42304.0 cb55fb7c6 N's onRewind (mk's onSessionRewind,
// so): `Ce=!!p&&!F.isConfirmPrompt` shows "You can edit your message and send it again." (LqvlIfVjNO, `p.text-secondary`)
// and a secondary sm "Go back" (orvpWhO3rI, icon ArrowReturn) before Try again; `Se`: `let e=await p();e&&(U(e,…),W?.())`
// — onGoBack resolves to the composer text, onPrefill puts it there and focuses it. No host category is a confirm
// prompt (imported_needs_resume_confirm, repository_review_needed, ssh_reattach_blocked, remote_helper_update_required).
export function SourceTurnError({ error, turnId, variant = "card", onRetry, onCompact, onViewUsage, onNewSession, onContinue, onOpenSettings, onOpenLink, limitReset = null, autoContinue = null,
  onRewind, onSwitchModel, onSignIn, signInLabel = "", signedInAgain = false, onEditConfig, model = "", onDismiss, onGoBack, onPrefill }) {
  const base = describeTurnError(error, { canRewind: !!onRewind, signIn: !!onSignIn, model });
  const view = base.category === "rate_limit" ? usageLimitView(base, error, limitReset) : base;
  // A bridge's fixed English sentence (bridge-text-model.mjs) reads in the UI language.
  const details = turnErrorDetails(error?.message ? { ...error, message: localizeBridgeText(error.message) } : error);
  const status = turnErrorStatus(error?.codexErrorInfo);
  // CS latchOnAction (cf6ae6197): one click on any recovery action hides them all.
  const [latched, setLatched] = useState(false);
  // Codex's 'Review findings' view and its explicit 'Acknowledge findings and continue' (misalignment_policy.rs).
  const [reviewing, setReviewing] = useState(false);
  // An auth failure the user has since signed in after reads as a settled marker, card or not.
  if (view.category === "auth" && signedInAgain) return <div className="source-message ste-marker" data-turn-error="marker" data-turn-id={turnId} data-error-category={view.category} data-signed-in-again="">
    <div className="ste-marker-row"><Icon name="Check" size={16} className="ste-icon ste-tone-muted"/><span className="ste-marker-label">{t("Signed in again")}</span></div>
    <TurnErrorDetails details={details} status={status}/>
  </div>;
  if (variant === "marker") return <div className="source-message ste-marker" data-turn-error="marker" data-turn-id={turnId} data-error-category={view.category}>
    <div className="ste-marker-row"><ErrorIcon kind={view.icon}/><span className="ste-marker-label">{view.markerLabel}</span></div>
    <TurnErrorDetails details={details} status={status}/>
  </div>;
  const latch = (action) => () => { setLatched(true); action(); };
  // The one primary action: sign in, else compact, else try again (c3e34355f V); the rest stay secondary.
  const signIn = view.signIn && onSignIn && !latched;
  const primary = signIn ? "signIn" : view.compactHelps && onCompact ? "compact" : view.retryHelps && onRetry ? "retry" : null;
  const kind = (name) => primary === name ? "primary" : "secondary";
  // CS ue (compactHelps && !N && onCompact): 'Compact session' (ce660512f Ec.compactSession), drawn before Try again (pe).
  const compact = view.compactHelps && onCompact && !latched
    ? <SourceSettingsButton variant={kind("compact")} size="sm" onClick={latch(onCompact)}>{t("Compact session")}</SourceSettingsButton> : null;
  // c3e34355f on() Rewind: back to before this turn, beside Compact when the context is full.
  const rewind = view.rewindHelps && onRewind && !latched
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={latch(onRewind)}>{t("Rewind")}</SourceSettingsButton> : null;
  // cb55fb7c6 N Se / Q: Go back (no latch in the original).
  const goBack = onGoBack
    ? <SourceSettingsButton variant="secondary" size="sm" icon="ArrowReturn" iconSize="auto" data-cowork-action="go-back"
        onClick={async () => { const text = await onGoBack(); if (text) onPrefill?.(text); }}>{t("Go back")}</SourceSettingsButton> : null;
  const retry = view.retryHelps && onRetry && !latched
    ? <SourceSettingsButton variant={kind("retry")} size="sm" onClick={latch(onRetry)}>{t("Try again")}</SourceSettingsButton> : null;
  // An overloaded model: pick another one (the composer's model menu), then Try again (switchAndRetry).
  const switchModel = view.modelSwitchHelps && onSwitchModel && !latched
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={onSwitchModel}>{t("Switch model")}</SourceSettingsButton> : null;
  const signInButton = signIn
    ? <SourceSettingsButton variant="primary" size="sm" onClick={onSignIn}>{signInLabel || t("Sign in")}</SourceSettingsButton> : null;
  // A plan usage limit (Codex): its Usage page shows the limits, credits and any earned reset (Codex's '/usage').
  const usage = view.category === "rate_limit" && onViewUsage
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={onViewUsage}>{t("View usage")}</SourceSettingsButton> : null;
  // A DeepSeek key failure opens Settings › Models; an empty DeepSeek balance opens the Platform.
  const settings = view.settingsPage && onOpenSettings
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={() => onOpenSettings(view.settingsPage)}>{t("Open settings")}</SourceSettingsButton> : null;
  const platform = view.platformUrl && onOpenLink
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={() => onOpenLink(view.platformUrl)}>{t("Open DeepSeek Platform")}</SourceSettingsButton> : null;
  // A safety refusal's links (Learn more, Apply for Daybreak / Trusted Access), and the session budget's config file.
  const links = view.links && onOpenLink ? view.links.map((link, index) =>
    <SourceSettingsButton key={link.url} variant={index === view.links.length - 1 ? "primary" : "secondary"} size="sm" onClick={() => onOpenLink(link.url)}>{link.label}</SourceSettingsButton>) : null;
  const editConfig = view.editConfig && onEditConfig
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={onEditConfig}>{t("Open config")}</SourceSettingsButton> : null;
  const newBudgetSession = view.category === "session_budget" && onNewSession && !latched
    ? <SourceSettingsButton variant="primary" size="sm" onClick={latch(onNewSession)}>{t("New session")}</SourceSettingsButton> : null;
  const misaligned = view.category === "misalignment";
  const newSession = misaligned && onNewSession && !latched
    ? <SourceSettingsButton variant={view.findings ? "secondary" : "primary"} size="sm" onClick={latch(onNewSession)}>{t("New session")}</SourceSettingsButton> : null;
  const review = misaligned && view.findings && !reviewing
    ? <SourceSettingsButton variant="secondary" size="sm" onClick={() => setReviewing(true)}>{t("Review findings")}</SourceSettingsButton> : null;
  const acknowledge = misaligned && reviewing && view.continueMessage && onContinue && !latched
    ? <SourceSettingsButton variant="primary" size="sm" onClick={latch(() => onContinue(view.continueMessage))}>{t("Acknowledge findings and continue")}</SourceSettingsButton> : null;
  // approval-current.js:34430-34480: a retryable usage limit with a known reset offers 'Auto-continue when limits reset';
  // armed, the hint says when (autoContinue {armed, at, onChange}, scheduled by main.jsx).
  const auto = view.category === "rate_limit" && autoContinue && limitReset?.resetsAtMs && !latched
    ? <label className="ste-auto"><input type="checkbox" role="switch" checked={autoContinue.armed} onChange={(event) => autoContinue.onChange(event.target.checked)} />{t("Auto-continue when limits reset")}</label> : null;
  const actions = goBack || compact || rewind || retry || switchModel || signInButton || usage || settings || platform || newSession || review || acknowledge || auto || links || editConfig || newBudgetSession
    ? <>{auto}{rewind}{compact}{usage}{settings}{platform}{switchModel}{goBack}{retry}{signInButton}{review}{newSession}{acknowledge}{links}{editConfig}{newBudgetSession}</> : null;
  return <div className="source-message ste-card" data-turn-error="card" data-turn-id={turnId} data-error-category={view.category}>
    <div className="ste-body">
      <div className="ste-header"><ErrorIcon kind={view.icon}/><span className="ste-headline">{view.headline}</span>
        {onDismiss && <span className="ste-dismiss -my-pad-xs -me-pad-xs flex shrink-0">
          <SourceSettingsButton variant="ghost" iconOnly size="sm" icon="X" iconSize="auto" aria-label={t("Dismiss")}
            onMouseDown={(event) => event.preventDefault()} onClick={onDismiss} className="text-muted hover:text-primary"/>
        </span>}</div>
      {view.hint && <span className="ste-hint">{autoContinue?.armed && limitReset?.resetsAtMs ? t("Auto-resuming at {time}", { time: new Date(limitReset.resetsAtMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }) : view.hint}</span>}
      {misaligned && reviewing && view.findings && <div className="ste-findings" role="region" aria-label={t("Findings")}>
        <span className="ste-details-text">{view.findings}</span>
      </div>}
      {onGoBack && <p className="ste-hint ste-go-back-hint">{t("You can edit your message and send it again.")}</p>}
    </div>
    <TurnErrorDetails details={details} status={status} actions={actions}/>
  </div>;
}
