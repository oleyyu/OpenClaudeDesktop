import { localizeBridgeText } from "./bridge-text-model.mjs";
import React, { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { SourceDisclosure } from "./source-disclosure.jsx";
import { createClipboardFeedback } from "./clipboard-feedback.mjs";
import { describeTurnError, officialErrorFix, TURN_ERROR_ICONS, turnErrorDetails, turnErrorHint, turnErrorStatus } from "./turn-error-model.mjs";
// W14-code transcript-rest TR-H1: the Code transcript's error card is the original 3.6556.2 card (cb1a6e506 j, sliced by
// extract-code-transcript.mjs; c96d752d0 pK draws it as `hC`), its actions the CDS Buttons and Checkbox c3e34355f / pK use.
import { j as OfficialErrorCard } from "./generated/code-transcript/cb1a6e506-CGO9mb0Y.mjs";
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
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
  // W14-code r6 R6DC-02: shared-frame Uu (CdsButton); Lp's ms-outset is Uu `flush:"start"` (Iu.start, --cds-outset-x pad-md).
  return <CdsButton variant="ghost" size="sm" icon={copied ? "Check" : "Copy"} flush="start"
    className="ste-copy" onClick={() => { void controller.current?.copy(); }}>{copied ? t("Copied") : t("Copy details")}</CdsButton>;
}

// approval-shared-current.js:4084-4199 Rp/zp: "View details" disclosure whose
// panel (order-first) holds the error body, the Status line and Copy details;
// the card's actions sit at the end of the same wrapping row. 3.6556.2 cb1a6e506 k wraps the details box (with its
// optional guide line above it, which no host error has) in "flex flex-col gap-sm" (.ste-details-stack).
function TurnErrorDetails({ details, status, actions }) {
  if (!details && !actions) return null;
  const after = actions ? <div className="ste-actions">{actions}</div> : null;
  if (!details) return <div className="ste-details">{after}</div>;
  return <SourceDisclosure className="ste-details" triggerClassName="ste-details-trigger" caret="end" label={t("View details")} after={after}>
    <div className="ste-details-panel">
      <div className="ste-details-stack">
        <div className="ste-details-box">
          <span className="ste-details-text">{details}</span>
          {status !== undefined && <div className="ste-details-facts"><span>{t("Status: {status}", { status })}</span></div>}
          <div className="ste-details-copy"><CopyDetails details={details}/></div>
        </div>
      </div>
    </div>
  </SourceDisclosure>;
}

function ErrorIcon({ kind }) {
  const icon = TURN_ERROR_ICONS[kind] || TURN_ERROR_ICONS.warning;
  return <Icon name={icon.name} size={16} className={`ste-icon ste-tone-${icon.tone}`}/>;
}

// W14-code r2-composer-01: the error above the composer. 3.6556.2 cc43287c9 Nu draws `p(gpe, {…, errorMessage: me,
// literal: ve, onDismiss})` there and gpe → c3e34355f Hn (`t as rL`); for a literal error Hn's bb0 branch is
// `{title: W.title ?? "Couldn’t complete that" (GNchAA7qYa), body: W.body, retryHelps: W.retryHelps, showRawMessage: !1}`
// with the icon `nn = W ? "warning" : …`, `announce: "alert"` and no copy/view details, drawn by cb1a6e506 `t` (this
// file's OfficialErrorCard). Every host composer error (`setError(message)`) is such a literal: its text is the body.
export function SourceComposerError({ message, title, onDismiss }) {
  if (!message) return null;
  return <OfficialErrorCard announce="alert" icon="warning" headline={title ?? t("Couldn’t complete that")} hint={message} onDismiss={onDismiss} />;
}

// W14-code r2 R2T-12: the error text as the desktop's error items carry it. A status rides in the text ("API Error (503):
// …"), which the details box parses (c7fb5ec3d `p` → `f` → `y`: `c = /…API Error(?:\s*\((\d{3})\)…/`) into the body and
// its muted "Status: {status}" line (cb1a6e506 k `{body, status, requestId, messageId}` → `div.flex flex-col
// text-muted-as-secondary break-all select-text`), not a fact row.
export function turnErrorText(error) {
  const details = turnErrorDetails(error?.message ? { ...error, message: localizeBridgeText(error.message) } : error);
  const status = turnErrorStatus(error?.codexErrorInfo);
  if (!details || status === undefined || /^\s*API Error\s*\(\d{3}\)/i.test(details)) return details;
  return `API Error (${status}): ${details}`;
}

// W14-code r2 R2T-12 / r4 R4T-08d (E95): the failed turns the Code renderer draws itself — every one of them. The desktop's
// error is an item of the turn's entry (c96d752d0 R3 `case "turn_error"` → "code.turn_error.last" y6e / "code.turn_error"
// _6e → V2 → kY / g6e → V1 → U1, headline and hint from B1 / L1 "Claude couldn’t process that message"; recovery from pg =
// c227f4d5e _Z over the PZ scope: Try again and Compact only), drawn inside the reply before its MessageActions. The
// host's own recovery for some categories (View usage and auto-continue on a usage limit, Sign in / Open settings / the
// DeepSeek Platform, Switch model, Rewind, Review findings, Open config, the safety refusal's links) has no place on that
// card and is gone with the host card (E95 replaces E93's split; Chat keeps the host card). Returns {turnId: {message,
// status?}} for code-transcript-entries; W14-code r5 R5T-02: `status` is the HTTP status (c06cf64bb `Xn(r)`, the
// turn_error item's apiErrorStatus, which V2 / j1 branch on: 400, 401).
export function rendererTurnErrors(turnErrors) {
  const out = {};
  for (const [turnId, error] of Object.entries(turnErrors && typeof turnErrors === "object" ? turnErrors : {})) {
    if (!error) continue;
    const status = turnErrorStatus(error?.codexErrorInfo);
    out[turnId] = { message: turnErrorText(error), ...(status !== undefined ? { status } : {}) };
  }
  return out;
}

// c3e34355f's recovery Buttons (shared-frame Eu = CdsButton, no size); `variant` / `onClick` / children as the host's.
function OfficialButton({ size: _size, iconSize: _iconSize, ...props }) {
  return <CdsButton {...props} />;
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
// `onDismiss: P`; 3.6556.2 cb1a6e506 j `onDismiss: I`), a ghost sm X ending the header row, "text-muted-as-secondary
// hover:text-primary" (TR-T5/T10); its mousedown is prevented (c81ea1931) so focus stays put.
// onGoBack / onPrefill (card only, Cowork, R4i-cowork CW3): 2.42304.0 cb55fb7c6 N's onRewind (mk's onSessionRewind,
// so): `Ce=!!p&&!F.isConfirmPrompt` shows "You can edit your message and send it again." (LqvlIfVjNO, `p.text-secondary`)
// and a secondary sm "Go back" (orvpWhO3rI, icon ArrowReturn) before Try again; `Se`: `let e=await p();e&&(U(e,…),W?.())`
// — onGoBack resolves to the composer text, onPrefill puts it there and focuses it. No host category is a confirm
// prompt (imported_needs_resume_confirm, repository_review_needed, ssh_reattach_blocked, remote_helper_update_required).
// W14-code r4 (E95): Cowork takes the official card now (3.6556.2 c10f0af0c's tail error is c3e34355f Hn → cb1a6e506 j, no
// Go back), so onGoBack / onPrefill and the other host actions only reach the non-official (Chat) card.
// officialSurface (r4 复核): "turn" (a turn_error item), "session" (c3e34355f Hn: Cowork's tail error, the /btw notice) or
// "item" (c96d752d0 G2e → pK: the Code thread error); the session surfaces take onSignIn / onViewUsage / onOpenLink for
// Hn's and pK's category fix (Sign in again, View billing, Open usage settings).
export function SourceTurnError({ error, turnId, variant = "card", onRetry, onCompact, onViewUsage, onNewSession, onContinue, onOpenSettings, onOpenLink, limitReset = null, autoContinue = null,
  onRewind, onSwitchModel, onSignIn, signInLabel = "", signedInAgain = false, onEditConfig, model = "", onDismiss, onGoBack, onPrefill,
  official = false, officialSurface = "turn", composer = true }) {
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
  // official (TR-H1): c3e34355f's Buttons have no size (`t(p, {variant: B("retry"), onClick, …})`, p = shared-frame Eu
  // CdsButton). The Chat card keeps its own sm buttons.
  // W14-code r6 R6DC-02: the Chat card's sm buttons are shared-frame Uu too (no host replica).
  const Button = official ? OfficialButton : CdsButton;
  // The one primary action: sign in, else compact, else try again (c3e34355f V); the rest stay secondary.
  const signIn = !official && view.signIn && onSignIn && !latched;
  const primary = signIn ? "signIn" : view.compactHelps && onCompact ? "compact" : view.retryHelps && onRetry ? "retry" : null;
  const kind = (name) => primary === name ? "primary" : "secondary";
  // CS ue (compactHelps && !N && onCompact): 'Compact session' (ce660512f Ec.compactSession), drawn before Try again (pe).
  const compact = view.compactHelps && onCompact && !latched
    ? <Button variant={kind("compact")} size="sm" onClick={latch(onCompact)}>{t("Compact session")}</Button> : null;
  // c3e34355f on() Rewind: back to before this turn, beside Compact when the context is full.
  const rewind = view.rewindHelps && onRewind && !latched
    ? <Button variant="secondary" size="sm" onClick={latch(onRewind)}>{t("Rewind")}</Button> : null;
  // cb55fb7c6 N Se / Q: Go back (no latch in the original).
  const goBack = onGoBack
    ? <Button variant="secondary" size="sm" icon="ArrowReturn" data-cowork-action="go-back"
        onClick={async () => { const text = await onGoBack(); if (text) onPrefill?.(text); }}>{t("Go back")}</Button> : null;
  const retry = view.retryHelps && onRetry && !latched
    ? <Button variant={kind("retry")} size="sm" onClick={latch(onRetry)}>{t("Try again")}</Button> : null;
  // An overloaded model: pick another one (the composer's model menu), then Try again (switchAndRetry).
  const switchModel = view.modelSwitchHelps && onSwitchModel && !latched
    ? <Button variant="secondary" size="sm" onClick={onSwitchModel}>{t("Switch model")}</Button> : null;
  const signInButton = signIn
    ? <Button variant="primary" size="sm" onClick={onSignIn}>{signInLabel || t("Sign in")}</Button> : null;
  // A plan usage limit (Codex): its Usage page shows the limits, credits and any earned reset (Codex's '/usage').
  const usage = view.category === "rate_limit" && onViewUsage
    ? <Button variant="secondary" size="sm" onClick={onViewUsage}>{t("View usage")}</Button> : null;
  // A DeepSeek key failure opens Settings › Models; an empty DeepSeek balance opens the Platform.
  const settings = view.settingsPage && onOpenSettings
    ? <Button variant="secondary" size="sm" onClick={() => onOpenSettings(view.settingsPage)}>{t("Open settings")}</Button> : null;
  const platform = view.platformUrl && onOpenLink
    ? <Button variant="secondary" size="sm" onClick={() => onOpenLink(view.platformUrl)}>{t("Open DeepSeek Platform")}</Button> : null;
  // A safety refusal's links (Learn more, Apply for Daybreak / Trusted Access), and the session budget's config file.
  const links = view.links && onOpenLink ? view.links.map((link, index) =>
    <Button key={link.url} variant={index === view.links.length - 1 ? "primary" : "secondary"} size="sm" onClick={() => onOpenLink(link.url)}>{link.label}</Button>) : null;
  const editConfig = view.editConfig && onEditConfig
    ? <Button variant="secondary" size="sm" onClick={onEditConfig}>{t("Open config")}</Button> : null;
  const newBudgetSession = view.category === "session_budget" && onNewSession && !latched
    ? <Button variant="primary" size="sm" onClick={latch(onNewSession)}>{t("New session")}</Button> : null;
  const misaligned = view.category === "misalignment";
  const newSession = misaligned && onNewSession && !latched
    ? <Button variant={view.findings ? "secondary" : "primary"} size="sm" onClick={latch(onNewSession)}>{t("New session")}</Button> : null;
  const review = misaligned && view.findings && !reviewing
    ? <Button variant="secondary" size="sm" onClick={() => setReviewing(true)}>{t("Review findings")}</Button> : null;
  const acknowledge = misaligned && reviewing && view.continueMessage && onContinue && !latched
    ? <Button variant="primary" size="sm" onClick={latch(() => onContinue(view.continueMessage))}>{t("Acknowledge findings and continue")}</Button> : null;
  // approval-current.js:34430-34480: a retryable usage limit with a known reset offers 'Auto-continue when limits reset';
  // armed, the hint says when (autoContinue {armed, at, onChange}, scheduled by main.jsx).
  const offersAuto = view.category === "rate_limit" && autoContinue && limitReset?.resetsAtMs && !latched;
  const auto = offersAuto && !official
    ? <label className="ste-auto"><input type="checkbox" role="switch" checked={autoContinue.armed} onChange={(event) => autoContinue.onChange(event.target.checked)} />{t("Auto-continue when limits reset")}</label> : null;
  const actions = goBack || compact || rewind || retry || switchModel || signInButton || usage || settings || platform || newSession || review || acknowledge || auto || links || editConfig || newBudgetSession
    ? <>{auto}{rewind}{compact}{usage}{settings}{platform}{switchModel}{goBack}{retry}{signInButton}{review}{newSession}{acknowledge}{links}{editConfig}{newBudgetSession}</> : null;
  // c96d752d0 pK `nt`: the hint for what the card offers (Try again shown and not yet pressed; else whether a message
  // can still be sent).
  const hint = turnErrorHint(view, { retry: !!(onRetry && !latched), composer });
  const resuming = autoContinue?.armed && limitReset?.resetsAtMs
    ? t("Auto-resuming at {time}", { time: new Date(limitReset.resetsAtMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }) : null;
  // W14-code r4 R4T-08d / btw / Cowork (E95): a failed turn's official card (officialSurface "turn": the Code fallback, a
  // Cowork turn, a /btw turn) offers pg's Try again and Compact (c227f4d5e _Z over PZ, cf74bc599 Xp) and Dismiss; the
  // session surfaces above add their category fix. The host's own actions (auto-continue, settings, switch model, rewind,
  // Go back, findings, safety links, config, New session) stay with the Chat card below.
  if (official && officialSurface !== "turn") {
    // W14-code r4 复核 (turn-cards): the session's error card (officialSurface "session" = c3e34355f Hn: Cowork's tail error,
    // the /btw notice) and a session error item ("item" = c96d752d0 G2e → pK: the Code thread error) add the category fix
    // their category row offers (officialErrorFix: Sign in again / View billing / Open usage settings) to dn's recovery.
    // dn (c3e34355f `a`): a held fix (callerHoldsFix) leaves every recovery Button secondary and after them; otherwise the
    // one primary (compact, else retry) comes last (`[..._t.filter(mn), ..._t.filter(pn)]`). Hn passes `compactHelps: !1`
    // and `latchOnAction: !1`; pK compacts and latches.
    const session = officialSurface === "session";
    const billingTarget = view.platformUrl && onOpenLink ? () => onOpenLink(view.platformUrl) : onViewUsage;
    const fix = officialErrorFix(view, officialSurface, { signIn: !!onSignIn, billing: !!billingTarget, usage: !!onViewUsage, retry: !!onRetry });
    const held = session ? false : latched;
    const take = (action) => session ? action : latch(action);
    const canCompact = !session && view.compactHelps && onCompact && !held;
    const canRetry = view.retryHelps && onRetry && !held;
    const lead = fix ? null : canCompact ? "compact" : canRetry ? "retry" : null;
    const recovery = [
      canCompact && { key: "compact", primary: lead === "compact", node: <OfficialButton variant={lead === "compact" ? "primary" : "secondary"} onClick={take(onCompact)}>{t("Compact session")}</OfficialButton> },
      canRetry && { key: "retry", primary: lead === "retry", node: <OfficialButton variant={lead === "retry" ? "primary" : "secondary"} onClick={take(onRetry)}>{t("Try again")}</OfficialButton> },
    ].filter(Boolean);
    // Hn `gr` / pK `Ne` / `Ke`: the fix Buttons as the originals draw them (View billing and Sign in again with no size;
    // c74139e0c `l` with its UsageGaugeMiddle icon).
    const fixNode = fix === "signIn" ? <OfficialButton key="fix" variant="primary" data-error-fix="sign-in" onClick={onSignIn}>{t("Sign in again")}</OfficialButton>
      : fix === "billing" ? <OfficialButton key="fix" variant="primary" data-error-fix="billing" onClick={billingTarget}>{t("View billing")}</OfficialButton>
      : fix === "usageSettings" ? <OfficialButton key="fix" variant="primary" icon="UsageGaugeMiddle" data-error-fix="usage-settings" onClick={onViewUsage}>{t("Open usage settings")}</OfficialButton>
      : null;
    const ordered = [...recovery.filter((entry) => !entry.primary), ...recovery.filter((entry) => entry.primary)]
      .map((entry) => <React.Fragment key={entry.key}>{entry.node}</React.Fragment>);
    const sessionHint = turnErrorHint(view, { retry: !!canRetry, composer });
    return <div className="contents" data-turn-error="card" data-turn-id={turnId} data-error-category={view.category} data-error-surface={officialSurface}>
      <OfficialErrorCard icon={view.icon} headline={view.headline} hint={sessionHint}
        details={(details && turnErrorText(error)) || undefined} detailsIsErrorText
        actions={ordered.length || fixNode ? <>{ordered}{fixNode}</> : undefined} onDismiss={onDismiss} />
    </div>;
  }
  if (official) return <div className="contents" data-turn-error="card" data-turn-id={turnId} data-error-category={view.category}>
    <OfficialErrorCard icon={view.icon} headline={view.headline} hint={hint}
      // R2T-12: the upstream status Codex reports beside the message (CodexErrorInfo httpStatusCode) rides in the error
      // text, parsed into k's muted "Status: {status}" line (turnErrorText), not a fact row.
      details={(details && turnErrorText(error)) || undefined} detailsIsErrorText
      actions={compact || retry ? <>{compact}{retry}</> : undefined} onDismiss={onDismiss} />
  </div>;
  return <div className="source-message ste-card" data-turn-error="card" data-turn-id={turnId} data-error-category={view.category}>
    <div className="ste-body">
      <div className="ste-header"><ErrorIcon kind={view.icon}/><span className="ste-headline">{view.headline}</span>
        {onDismiss && <span className="ste-dismiss -my-pad-xs -me-pad-xs flex shrink-0">
          {/* cb1a6e506 j Dismiss: `variant:"ghost",iconOnly:!0,size:"sm",icon:"X",…,className:"text-muted-as-secondary hover:text-primary"`. */}
          <CdsButton variant="ghost" iconOnly size="sm" icon="X" aria-label={t("Dismiss")}
            onMouseDown={(event) => event.preventDefault()} onClick={onDismiss} className="text-muted-as-secondary hover:text-primary"/>
        </span>}</div>
      {view.hint && <span className="ste-hint">{resuming ?? hint}</span>}
      {misaligned && reviewing && view.findings && <div className="ste-findings" role="region" aria-label={t("Findings")}>
        <span className="ste-details-text">{view.findings}</span>
      </div>}
      {onGoBack && <p className="ste-hint ste-go-back-hint">{t("You can edit your message and send it again.")}</p>}
    </div>
    <TurnErrorDetails details={details} status={status} actions={actions}/>
  </div>;
}
