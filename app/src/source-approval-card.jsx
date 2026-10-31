// The shared runtime owns submission, identity and draft lifetime.
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useApprovalDraft } from "./use-approval-draft.js";
import { approvalActionIndex, approvalAnnouncement, approvalCardModel, approvalHasVisibleIntersection, approvalKeyIntent, createApprovalHotkeyArming, detailsOverflow, elicitationFormContent, elicitationInitialValues, scrollRegionProps } from "./approval-card-model.mjs";
import { SourceShortcut } from "./source-shortcut.jsx";
import { SourceSelect } from "./source-select.jsx";
import { Icon } from "./icons";
import { usePersona } from "./use-persona.js";
import { useCardHotkeys } from "./use-card-hotkeys.js";
import { assistantName } from "./persona-store.mjs";
import { ComputerUseAccessList, ComputerUseAccessNote, ComputerUseAccessTitle, ComputerUseTakeoverTitle, ComputerUseTeachCardBody } from "./computer-use-approval-card.jsx";
import "./source-approval-card.css";
import { t } from "../electron/i18n/index.mjs";

function useOverflowFocus(ref, contentKey) {
  const [overflow, setOverflow] = useState(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let live = true;
    const measure = () => { if (live) setOverflow(detailsOverflow(element)); };
    const window = element.ownerDocument.defaultView;
    const resize = window?.ResizeObserver && new window.ResizeObserver(measure);
    resize?.observe(element);
    const observeChildren = () => {
      resize?.disconnect();
      resize?.observe(element);
      for (const child of element.children) resize?.observe(child);
      measure();
    };
    const mutation = window?.MutationObserver && new window.MutationObserver(observeChildren);
    mutation?.observe(element, { childList: true, subtree: true, characterData: true });
    element.ownerDocument.fonts?.ready.then(measure);
    observeChildren();
    return () => { live = false; resize?.disconnect(); mutation?.disconnect(); };
  }, [ref, contentKey]);
  return overflow;
}

// approval-actions-current Xo: allow clicks are armed after 400 ms; window
// activation / visibility changes rearm. Deny remains immediately available.
export function useAllowArming(root, armKey, active) {
  const at = useRef(Date.now());
  useLayoutEffect(() => { at.current = Date.now(); }, [armKey, active]);
  useLayoutEffect(() => {
    const document = root.current?.ownerDocument;
    const window = document?.defaultView;
    if (!document || !window) return;
    let hadFocus = document.hasFocus();
    const rearm = () => { at.current = Date.now(); };
    const checkFocus = () => {
      const focused = document.hasFocus();
      if (focused && !hadFocus) rearm();
      hadFocus = focused;
    };
    const onFocus = () => { if (!hadFocus) rearm(); checkFocus(); };
    const visible = () => { if (document.visibilityState === "visible") rearm(); };
    const timer = window.setInterval(checkFocus, 250);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", checkFocus);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", checkFocus);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [root]);
  return () => Date.now() - at.current >= 400;
}

// keycap: approval-current.js:15846-15854 gives only Allow once `shortcut: "cmd+enter"`
// (deny/persistent allows carry chordHintHidden in card placement, approval-actions-current.js
// :3181-3183); CDS Button ks (shared-frame :2936-2944) draws it after the label inside the
// gap-1 content span, which Button busy fades with the label (the cap keeps its width).
export function ActionButton({ action, busy, busyAction, enabled, onAction, shortcut, keycap }) {
  const spinning = busy && busyAction === action.key;
  return <button type="button" className="sac-button" data-cds="Button"
    data-variant={action.primary ? "primary" : "secondary"}
    data-approval-primary={action.primary ? "" : undefined}
    data-approval-action={action.key} disabled={!enabled && !busy}
    aria-disabled={busy || !enabled || undefined} aria-busy={spinning || undefined}
    aria-keyshortcuts={shortcut} title={action.title || undefined}
    onClick={event => {
      if (busy || !enabled) { event.preventDefault(); event.stopPropagation(); return; }
      onAction(action.key);
    }}
    onKeyDown={event => {
      if ((event.key === "Enter" || event.key === " ") && event.repeat) event.preventDefault();
    }}>
    <span className="sac-button-backdrop" aria-hidden="true"><span data-cds-part="paint" /></span>
    <span className="sac-button-label" data-busy={spinning || undefined}>{action.label}</span>
    {keycap && <SourceShortcut keys={keycap} aria-hidden="true" data-busy={spinning || undefined}
      className="scds-in-button scds-trailing" />}
    {spinning && <span className="sac-button-spinner" aria-hidden="true"><span data-cds="Spinner"><i /><i /></span></span>}
  </button>;
}

export function BusyAnnouncement() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);
  return <span className="sac-visually-hidden" role="status">{ready ? t("Sending response") : ""}</span>;
}

// NM (approval-current.js:15959-16006): an sr-only role=status span. A new request
// identity (or new copy for it) clears it, then fills it 50 ms later so screen readers
// announce the blocking prompt; re-renders of the same identity and text stay silent.
function ApprovalAnnouncement({ identity, text }) {
  const ref = useRef(null), announced = useRef({});
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const last = announced.current;
    if (!text || (last.identity === identity && last.text === text)) {
      if (last.identity !== identity) { element.textContent = ""; announced.current = {}; }
      return;
    }
    element.textContent = "";
    const window = element.ownerDocument.defaultView ?? globalThis;
    const timer = window.setTimeout(() => {
      element.textContent = text;
      announced.current = { identity, text };
    }, 50);
    return () => window.clearTimeout(timer);
  }, [identity, text]);
  return <span ref={ref} className="sac-visually-hidden" role="status" data-approval-announcement="" />;
}

export function currentlyVisible(element) {
  if (!element?.isConnected) return false;
  const document = element.ownerDocument, window = document.defaultView;
  if (!window) return false;
  const clips = [];
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = window.getComputedStyle(parent);
    if (style.overflowX === "visible" && style.overflowY === "visible") continue;
    clips.push({ rect: parent.getBoundingClientRect(), overflowX: style.overflowX, overflowY: style.overflowY,
      scrollPaddingTop: style.scrollPaddingTop, scrollPaddingBottom: style.scrollPaddingBottom });
  }
  return approvalHasVisibleIntersection({ rect: element.getBoundingClientRect(),
    viewport: { width: window.innerWidth, height: window.innerHeight }, clips,
    visible: typeof element.checkVisibility !== "function" || element.checkVisibility() });
}

// shared-6 aR observes hidden -> visible before restarting the hotkey clock.
// This is independent of the Xo click clock; an initial visible IO callback
// does not restart the grace, and key dispatch still checks current geometry.
export function useHotkeyArming(root, armKey, active) {
  const clock = useRef(null);
  if (!clock.current) clock.current = createApprovalHotkeyArming({ active });
  useLayoutEffect(() => {
    const state = createApprovalHotkeyArming({ active });
    clock.current = state;
    const element = root.current;
    const document = element?.ownerDocument, window = document?.defaultView;
    if (!element || !window || !window.IntersectionObserver) return;
    let live = true, intersecting = true, frame = 0;
    const check = () => {
      if (live) state.observeVisibility({ intersecting, visible: currentlyVisible(element) });
    };
    const observer = new window.IntersectionObserver(entries => {
      if (!live) return;
      for (const entry of entries) intersecting = entry.isIntersecting;
      check();
    });
    observer.observe(element);
    const schedule = () => {
      if (!live || frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; check(); });
    };
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      live = false;
      observer.disconnect();
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [root, armKey]);
  useLayoutEffect(() => { clock.current.setActive(active); }, [active]);
  return () => clock.current.isArmed();
}

// mcpServer/elicitation/request form mode: one control per primitive field of the
// requested schema (approval-card-model.mjs elicitationFields). Values live only in
// the card; Submit sends them through the same ticket as any approval.
const TEXT_INPUT_TYPE = { email: "email", uri: "url", date: "date" };
// The CDS checkbox mark (composer worktree, question card): a native input for form semantics and
// validation focus, painted as the Claude box with an accent fill and a Check when checked.
function ElicitationCheckbox(props) {
  return <span className="sac-field-checkbox-box">
    <input {...props} type="checkbox" className="sac-field-checkbox" />
    <Icon name="Check" size={16} weight="strong" style={{ fontSize: 12 }} />
  </span>;
}
function ElicitationField({ field, value, disabled, invalid, onChange, idPrefix }) {
  const id = `${idPrefix}-${field.id}`, hintId = field.description ? `${id}-hint` : undefined;
  const label = <span className="sac-field-label">{field.label}
    {field.required && <span className="sac-field-required">{t("Required")}</span>}</span>;
  const hint = field.description && <span id={hintId} className="sac-field-hint">{field.description}</span>;
  const common = { id, disabled, "aria-describedby": hintId, "aria-invalid": invalid || undefined,
    "aria-required": field.required || undefined, "data-elicitation-field": field.id };
  if (field.type === "boolean")
    return <div className="sac-field sac-field-check">
      <ElicitationCheckbox {...common} checked={value === true} onChange={event => onChange(event.target.checked)} />
      <label htmlFor={id}>{label}</label>{hint}
    </div>;
  if (field.type === "multiselect")
    return <fieldset className="sac-field sac-field-set" disabled={disabled} aria-describedby={hintId}
      aria-invalid={invalid || undefined} data-elicitation-field={field.id}>
      <legend>{label}</legend>{hint}
      {field.options.map((option, index) => <label key={option.value} className="sac-field-option">
        <ElicitationCheckbox id={index === 0 ? id : undefined}
          checked={Array.isArray(value) && value.includes(option.value)}
          onChange={event => onChange(event.target.checked
            ? [...(value ?? []), option.value] : (value ?? []).filter(entry => entry !== option.value))} />
        <span>{option.label}</span>
      </label>)}
    </fieldset>;
  return <div className="sac-field">
    <label htmlFor={id}>{label}</label>{hint}
    {field.type === "select"
      // The app's own popover select (Settings' SourceSelect), not the OS menu; its trigger keeps the field's id,
      // hint, invalid and data-elicitation-field so validation can focus it.
      ? <SourceSelect className="sac-field-select" label={field.label} value={value ?? ""} disabled={disabled} triggerProps={common}
          items={[...(!field.required || field.default == null ? [{ value: "", label: t("Choose…") }] : []),
            ...field.options.map(option => ({ value: option.value, label: option.label }))]}
          onChange={onChange} />
      : <input {...common} className="sac-field-control" value={value ?? ""} onChange={event => onChange(event.target.value)}
          type={field.type === "number" || field.type === "integer" ? "number" : TEXT_INPUT_TYPE[field.format] ?? "text"}
          step={field.type === "integer" ? 1 : field.type === "number" ? "any" : undefined}
          min={field.minimum ?? undefined} max={field.maximum ?? undefined}
          maxLength={field.maxLength ?? undefined} autoComplete="off" spellCheck={false} />}
  </div>;
}

function openExternalLink(url) {
  return window.desktop?.call?.("external", { url }) ?? Promise.reject(new Error(t("Could not open the link.")));
}

export function SourceApprovalCardView({ request, item, busy = false, busyAction = null,
  error = "", onAction, enabled = true, isActive = true, menuOpen = false,
  armKey, renderDetails, className = "" }) {
  usePersona(); // C2: re-render the title when the assistant name changes
  const model = approvalCardModel(request, item);
  const [expanded, setExpanded] = useState(true);
  const root = useRef(null), body = useRef(null), actions = useRef(null), reason = useRef(null);
  const detailsId = useId();
  const identity = armKey ?? request?.bridgeApproval?.instanceId ?? request;
  const clickArmed = useAllowArming(root, identity, isActive);
  const hotkeyArmed = useHotkeyArming(root, identity, isActive);
  const overflow = useOverflowFocus(body, `${expanded}:${model.detail?.text ?? ""}:${model.reason ?? ""}:${JSON.stringify(model.context)}`);
  const reasonOverflow = useOverflowFocus(reason, model.reason ?? "");
  const fields = model.elicitation?.mode === "form" ? model.elicitation.fields : null;
  const [formValues, setFormValues] = useState(() => elicitationInitialValues(fields));
  const [formError, setFormError] = useState(null);
  const formId = useId();
  useLayoutEffect(() => {
    setExpanded(true);
    setFormValues(elicitationInitialValues(fields));
    setFormError(null);
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps -- a new request starts a new draft
  const actionable = enabled && isActive && typeof onAction === "function" && model.supported;
  // Deny with feedback (model.declineFeedback): an optional note the core continues with instead.
  const [feedbackOpen, setFeedbackOpen] = useState(false), [feedback, setFeedback] = useState("");
  const feedbackRef = useRef(null), feedbackId = useId();
  useLayoutEffect(() => { setFeedbackOpen(false); setFeedback(""); }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps
  // A card that appears inside an existing tool row (OpenClaude Desktop's own approvals: preview_start, an outside site,
  // run_in_terminal, a workflow) grows that row instead of adding tail content: while the transcript follows the
  // end, it is brought fully into view as a new item would be (the scroller's scroll-padding keeps it above the composer).
  useEffect(() => {
    const node = root.current;
    if (!node || node.closest?.(".source-transcript-frame")?.getAttribute("data-following") !== "true") return undefined;
    const frame = requestAnimationFrame(() => { if (node.isConnected) node.scrollIntoView?.({ block: "nearest", behavior: "auto" }); });
    return () => cancelAnimationFrame(frame);
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (feedbackOpen) feedbackRef.current?.focus({ preventScroll: true }); }, [feedbackOpen]);
  const submit = action => {
    if (!actionable || busy) return;
    if (model.declineFeedback && action === model.deny?.key && feedbackOpen && feedback.trim()) {
      onAction(action, { feedback: feedback.trim() });
      return;
    }
    if (fields && action === "accept") {
      const result = elicitationFormContent(fields, formValues);
      if (result.error) {
        setFormError(result);
        const control = root.current?.querySelector(`[data-elicitation-field="${CSS.escape(result.fieldId)}"]`);
        (control?.matches("fieldset") ? control.querySelector("input") : control)?.focus();
        return;
      }
      setFormError(null);
      onAction(action, { content: result.content });
      return;
    }
    onAction(action);
  };
  const [linkError, setLinkError] = useState("");
  const openLink = () => {
    setLinkError("");
    Promise.resolve().then(() => openExternalLink(model.elicitation.url))
      .catch(() => setLinkError(t("Could not open the link.")));
  };
  const shortcutEnabled = actionable && !busy && !menuOpen;
  // The ⌘⏎ keycap follows the same active/menu gate but survives busy (faded, ks :2886 opacity-0),
  // so the stable-size busy action keeps its width.
  const primaryKeycap = actionable && !menuOpen ? "cmd+enter" : undefined;
  const primaryShortcut = "Meta+Enter Control+Enter";

  // The allow the shifted chord picks (approvalKeyIntent): the persistent one, else the session one.
  const shiftedAllow = model.allows?.find(allow => allow.persistent)?.key ?? "acceptForSession";
  function keyDown(event) {
    const element = event.target;
    const editor = element.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="menu"],[role="listbox"]');
    const target = editor ? "editor" : element === event.currentTarget ? "card"
      : actions.current?.contains(element) ? "actions" : "content";
    const intent = approvalKeyIntent(event, { target, model, busy,
      active: actionable, menuOpen, armed: hotkeyArmed() });
    if (!intent) return;
    event.preventDefault();
    event.stopPropagation();
    if (intent.type === "action") {
      // An old focused card can be scrolled outside its clipping ancestor.
      // Re-read all geometry at key dispatch; observer state can be one frame old.
      if (currentlyVisible(root.current)) submit(intent.action);
      return;
    }
    const buttons = [...(actions.current?.querySelectorAll('button:not(:disabled):not([aria-disabled="true"])') ?? [])];
    if (intent.type === "focus-primary")
      (buttons.find(button => button.hasAttribute("data-approval-primary")) ?? buttons.at(-1))?.focus();
    else if (intent.type === "navigate") {
      const index = buttons.indexOf(event.currentTarget.ownerDocument.activeElement);
      buttons[approvalActionIndex(intent.key, index, buttons.length)]?.focus();
    }
  }
  // The official hotkey hook (Xf) listens on the document: from the session's empty composer or an unfocused
  // page, Esc denies and ⌘⏎ / ⇧⌘⏎ allow, with the same intents (and arming) as keys in the card's content,
  // so an Esc meant as Deny never falls through to the composer's Stop.
  useCardHotkeys(root, shortcutEnabled, (key, event) => {
    const intent = approvalKeyIntent(event, { target: "content", model, busy, active: actionable, menuOpen, armed: hotkeyArmed() });
    if (!intent) return;
    event.preventDefault();
    event.stopPropagation();
    if (intent.type === "action" && currentlyVisible(root.current)) submit(intent.action);
  }, currentlyVisible);
  // approval-current.js:15399-15470 EM B: with t.meta the title is "Allow Claude to <b>{action}</b>
  // <meta>{metaText}</meta>?", both parts span.text-primary [unicode-bidi:plaintext], inside a span
  // that is line-clamp-2 when t.clampTitle && y (:15254 y = detail !== meta || foldedDetail; the
  // local detail is the changes block); without meta it is "Allow Claude to <b>{action}</b>?".
  // The ev header around B is already text-primary (cf6ae6197 ev), so only the spans are added.
  // The plain title stays the aria-label.
  // A computer-use request_access: its own title variants (computer-use-approval-card.jsx, official ZEe).
  const title = model.access ? <ComputerUseAccessTitle title={model.access.title} name={assistantName()} />
    : model.takeover ? <ComputerUseTakeoverTitle takeover={model.takeover} name={assistantName()} />
    : model.heading
    ? <>{t("Allow {name} to", { name: assistantName() })} <span className="sac-em">{model.heading.action}</span>{model.heading.meta
      ? <> <span className="sac-em">{model.heading.meta}</span></> : null}{t("?")}</>
    : model.title;
  const clamp = model.clampTitle && model.detail ? "" : undefined;
  // request_teach_access: the official teach card (ca31fdde5 Ua) — its own shell "mb-4 overflow-hidden rounded-card border
  // bg-surface-panel shadow-lg" and body (computer-use-approval-card.jsx), Deny (⌘.) then Start guide (⌘↵, armed like
  // every allow). The keys and the answer stay this card's.
  if (model.teach) {
    const teachActions = <>
      <ActionButton action={model.deny} busy={busy} busyAction={busyAction} enabled={actionable} onAction={submit}
        keycap={actionable && !menuOpen ? "cmd+." : undefined} shortcut={shortcutEnabled ? "Meta+Period Control+Period Escape" : undefined} />
      <span className="contents" onClickCapture={event => { if (!clickArmed()) { event.preventDefault(); event.stopPropagation(); } }}>
        {model.allows.map(action => <ActionButton key={action.key} action={action} busy={busy} busyAction={busyAction} enabled={actionable} onAction={submit}
          keycap={action.primary ? primaryKeycap : undefined} shortcut={shortcutEnabled && action.primary ? primaryShortcut : undefined} />)}
      </span>
    </>;
    return <section ref={root} className={`source-message mb-4 overflow-hidden rounded-card border bg-surface-panel shadow-lg ${className}`.trim()}
      data-approval-presentation="card" data-computer-use-teach=""
      data-approval-instance={request?.bridgeApproval?.instanceId} data-approval-method={request?.method} data-approval-kind={model.kind}
      role="group" aria-label={t("Permission request: {title}", { title: model.title })} aria-busy={busy || undefined}
      tabIndex={0} onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
      <ComputerUseTeachCardBody teach={model.teach} name={assistantName()} actions={teachActions} />
      {error && <p role="alert" className="sac-error">{error}</p>}
      {busy && <BusyAnnouncement />}
      {model.supported && <ApprovalAnnouncement identity={identity} text={approvalAnnouncement(model)} />}
    </section>;
  }
  return <section ref={root} className={`source-message sac-card ${className}`} data-approval-presentation="card"
    data-approval-instance={request?.bridgeApproval?.instanceId} data-approval-method={request?.method}
    data-approval-kind={model.kind}
    role="group" aria-label={t("Permission request: {title}", { title: model.title })} aria-busy={busy || undefined}
    tabIndex={0} onKeyDown={keyDown} onClick={event => event.stopPropagation()}>
    <div ref={body} className="sac-body" tabIndex={overflow ? 0 : undefined}
      role={overflow ? "group" : undefined} aria-label={overflow ? t("Request details") : undefined}>
      <div className="sac-description">
        {model.detail
          ? <button type="button" className="sac-heading" aria-expanded={expanded}
              aria-controls={detailsId} onClick={() => setExpanded(value => !value)}><span data-clamp={clamp}>{title}</span></button>
          : <div className="sac-heading"><span data-clamp={clamp}>{title}</span></div>}
        {(model.reason || model.message || model.context.length > 0 || model.detail || fields || model.access || model.elicitation?.mode === "url" || model.elicitation?.mode === "toolSuggestion") && <div className="sac-content">
          {/* approval-current.js:15275-15284 D, before the other content blocks: the decision
              reason in a 3-line scroll clamp (wM) whose "Reason" label is its accessible name
              while it scrolls (cf6ae6197 bv); no visible label. */}
          {model.reason && <div ref={reason} className="sac-reason scroll-fade-y scroll-fade-size-[8px]"
            {...scrollRegionProps(t("Reason"), reasonOverflow)}>{model.reason}</div>}
          {/* request_access: the capabilities and apps asked for (official JEe: under the header, above the actions). */}
          {/* Official JEe: Background mode's line, or that other windows will be hidden, above the rows. */}
          {model.access && <ComputerUseAccessNote note={model.access.note ?? null} name={assistantName()} />}
          {model.access && <ComputerUseAccessList rows={model.access.rows} />}
          {/* An MCP elicitation's own message (server text, shown as written). */}
          {model.message && <p className="sac-message">{model.message}</p>}
          {model.context.map(part => <p key={part.key} className="sac-context" data-context={part.key}>{part.text}</p>)}
          {model.detail && <div id={detailsId} className="sac-details" hidden={!expanded}>
            {renderDetails ? renderDetails(model.detail, model) : <pre className="sac-code" title={model.detail.raw}>{model.detail.text}</pre>}
          </div>}
          {(model.elicitation?.mode === "url" || model.elicitation?.mode === "toolSuggestion") && model.elicitation.openable && <div className="sac-link">
            <ActionButton action={{ key: "open-link", label: model.elicitation.mode === "toolSuggestion" ? t("Open install page") : t("Open link"), primary: false }} busy={false}
              enabled={actionable && !busy} onAction={openLink} />
          </div>}
          {linkError && <p role="alert" className="sac-error">{linkError}</p>}
          {fields && <div className="sac-form" role="group" aria-label={t("Requested information")}>
            {fields.map(field => <ElicitationField key={field.id} field={field} idPrefix={formId}
              value={formValues[field.id]} disabled={!actionable || busy} invalid={formError?.fieldId === field.id}
              onChange={value => { setFormError(null); setFormValues(values => ({ ...values, [field.id]: value })); }} />)}
          </div>}
        </div>}
      </div>
    </div>
    {(formError?.error || error) && <p role="alert" className="sac-error">{formError?.error || error}</p>}
    {model.declineFeedback && feedbackOpen && <div className="sac-feedback">
      <label htmlFor={feedbackId} className="sac-visually-hidden">{t("What should {name} do instead?", { name: assistantName() })}</label>
      <textarea ref={feedbackRef} id={feedbackId} rows={2} maxLength={4000} value={feedback} disabled={!actionable || busy}
        placeholder={t("Tell {name} what to do instead (optional)", { name: assistantName() })} onChange={event => setFeedback(event.target.value)} />
    </div>}
    {model.supported && <footer ref={actions} className="sac-actions">
      <span className="sac-deny">
        <ActionButton action={model.declineFeedback && feedbackOpen && feedback.trim() ? { ...model.deny, label: t("Deny with feedback") } : model.deny} busy={busy} busyAction={busyAction} enabled={actionable}
          shortcut={shortcutEnabled ? "Escape" : undefined} onAction={submit} />
        {model.declineFeedback && !feedbackOpen && <button type="button" className="sac-feedback-toggle" disabled={!actionable || busy}
          onClick={() => setFeedbackOpen(true)}>{t("Add feedback")}</button>}
      </span>
      <div className="sac-allows" onClickCapture={event => {
        if (!clickArmed()) { event.preventDefault(); event.stopPropagation(); }
      }}>
        {model.allows.map(action => <ActionButton key={action.key} action={action}
          busy={busy} busyAction={busyAction} enabled={actionable} onAction={submit}
          keycap={action.primary ? primaryKeycap : undefined}
          shortcut={shortcutEnabled ? action.primary ? primaryShortcut
            : action.key === shiftedAllow ? "Meta+Shift+Enter Control+Shift+Enter" : undefined : undefined} />)}
      </div>
    </footer>}
    {busy && <BusyAnnouncement />}
    {model.supported && <ApprovalAnnouncement identity={identity} text={approvalAnnouncement(model)} />}
  </section>;
}

export function SourceApprovalCard({ runtime, request, item, getVisibleThreadId,
  respond, onResolved = () => {}, onError = () => {}, ...presentation }) {
  const { ticket, view } = useApprovalDraft(runtime, request);
  if (!approvalCardModel(request, item).supported)
    return <SourceApprovalCardView {...presentation} request={request} item={item} enabled={false} />;
  if (!ticket || !view || view.phase !== "pending") return null;
  // extra.content: an elicitation form's answers (approval-draft-model responsePayload).
  const submit = async (action, extra) => {
    const result = await runtime.submit(ticket, action, respond, { getVisibleThreadId, ...(extra && { response: extra }) });
    if (result.status === "answered") onResolved({ request, ticket: result.ticket });
    else if (result.status === "error") onError({ request, ticket: result.ticket, message: result.message });
  };
  return <SourceApprovalCardView {...presentation} key={ticket.key} armKey={ticket.key}
    request={request} item={item} busy={view.busy} busyAction={view.busyAction}
    error={view.error} onAction={submit} />;
}
