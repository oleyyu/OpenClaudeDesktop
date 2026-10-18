import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { holdModalInert } from "./modal-inert.mjs";
import { useModalPresence } from "./use-modal-presence";
import { SourceSettingsButton } from "./source-settings-button.jsx";
import { t } from "../electron/i18n/index.mjs";
import "./source-dialog.css";

/*
 * Shared CDS Dialog / AlertDialog (2.2553.1 shared-frame-C_2npUJq.js), written from the traced classes:
 * - :5561-5574 mf/hf/gf/_f/vf/yf: popup rounded-card + bg-surface-3 + shadow-panel-lg, max-h hf,
 *   body p-xl, opacity + scale .98 over duration-base ease-out (motion-reduce none); backdrop
 *   bg-backdrop + backdrop-blur 2px.
 * - :5618-5644 Of sizes (sm 400 / md 520 / lg 720), Mf alert title text-heading font-medium (-mt-0.5),
 *   Nf title text-title font-semibold (-mt-1), If description mt-1 text-body text-secondary.
 * - :5738-5869 Gf Popup portalled into the layer root (al('modal'): base 100, z 140), Yf Header
 *   (mb-pad-md flex items-start gap-2), Jf CloseButton (ghost icon-only X, aria-label 'Close',
 *   flush -me-pad-sm -mt-pad-sm), Qf Footer (mt-pad-lg flex-col-reverse gap-2, sm:flex-row justify-end).
 * - shared-11 Lf (the bleed header IR and the release notes use): h-12 bar with a 0.5px border-strong
 *   rule, alpha-1 tint, text-heading-semibold title and a plain CloseButton.
 * - :5909-5990 rp ConfirmationDialog: size sm, title + description straight in the body, Cancel
 *   (secondary) and Confirm (confirmVariant, busy while pending), initial focus on Confirm.
 * Base UI behaviour: Escape (useDismiss) closes only this dialog and is consumed; a backdrop press
 * dismisses a Dialog but not an AlertDialog; focus is trapped and returns to the opener on close.
 * Local adaptations: the popup is a child of the backdrop (flex-centred, as every local modal and the
 * UI suites expect), so the backdrop fades its colour and blur rather than its opacity, which would
 * fade the popup too. #root is inert while open (modal-inert.mjs); a closing dialog releases it and
 * returns focus at once while its exit transition runs. An alert dialog's popup is role=alertdialog, as
 * Base UI AlertDialog's (2.31226.0 shared-frame-DVFSKIcx _g :7375-7378, the AlertDialog.Popup the
 * ConfirmationDialog renders); every other dialog is role=dialog.
 */

export const MODAL_LAYER = { base: 100, z: 140 }; // shared-frame al("modal"): Zc 100 + tl.modal 40
// The yl portal root's CDS context. data-mode is left to inheritance: the loaded CSS gives a nested .cds-root
// its ancestor's mode ([data-mode=dark] .cds-root:not([data-mode=light]):not([data-mode=system])), so an open
// dialog follows a live theme change, which main.jsx writes to <html> after rendering.
const PORTAL_ATTRIBUTES = ["data-cds-theme", "data-density", "data-font", "data-platform"];
const TABBABLE = 'a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [contenteditable]:not([contenteditable=false]), [tabindex]';

function portalAttributes(density) {
  const root = typeof document === "undefined" ? null : document.documentElement, result = {};
  for (const name of PORTAL_ATTRIBUTES) {
    const value = root?.getAttribute(name);
    if (value != null) result[name] = value;
  }
  if (density) result["data-density"] = density;
  return result;
}
// shared-11 zf/Bf: visible, enabled, non-negative tabIndex.
const tabbables = (node) => [...node.querySelectorAll(TABBABLE)]
  .filter((element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0);

/**
 * Keeps the last open value of a parent-owned dialog slot rendered while its dialog plays the exit
 * transition. Returns { value, open, key, onExited }: render the dialog for `value` with `open`, keyed
 * by `key` (a new value remounts it), and pass `onExited`. `key` is a small counter, so prefix it per slot
 * (`group-${key}`): sibling slots in one children list share a key space, and two retained dialogs with the
 * same bare number (one exiting while the other opens) make React mount a duplicate dialog.
 */
export function useDialogRetention(current) {
  const [state, setState] = useState(() => ({ value: current || null, key: current ? 1 : 0 }));
  let shown = state;
  if (current && current !== state.value) { shown = { value: current, key: state.key + 1 }; setState(shown); }
  const key = shown.key;
  return {
    value: current || shown.value,
    open: !!current,
    key,
    onExited: () => setState((old) => (old.key === key ? { ...old, value: null } : old)),
  };
}

export function SourceDialogFooter({ className = "", align = "end", children }) {
  return <footer data-align={align === 'end' ? undefined : align} className={`sdlg-footer ${className}`.trim()}>{children}</footer>;
}

export function SourceDialogCloseButton({ flush = false, label = t("Close"), onClick }) {
  return <SourceSettingsButton variant="ghost" iconOnly icon="X" iconSize="auto" aria-label={label}
    className={`sdlg-close ${flush ? "sdlg-close-flush" : ""}`.trim()} onClick={onClick} />;
}

export function SourceDialog({ open = true, onExited, ...props }) {
  const presence = useModalPresence(open);
  const exited = useRef(onExited);
  exited.current = onExited;
  useEffect(() => { if (!presence.present) exited.current?.(); }, [presence.present]);
  return presence.present ? <DialogPopup {...props} open={open} presence={presence} /> : null;
}

function DialogPopup({
  presence, open, onClose, title, description, descriptionClassName = "", size = "md", alert = false,
  sourceVersion, showClose = true, bleed = false, footer, initialFocusRef, popupRef, density, className = "", children, onKeyDown, layer = MODAL_LAYER, ...rest
}) {
  const popup = presence.popup, titleId = useId(), descriptionId = useId();
  const setPopup = React.useCallback(node => { popup.current = node; if (typeof popupRef === 'function') popupRef(node); else if (popupRef) popupRef.current = node; }, [popup, popupRef]);
  const close = useRef(onClose);
  close.current = onClose;
  // The opener is read while rendering, before any child (autoFocus, effects) can move focus.
  const opener = useRef(undefined);
  if (opener.current === undefined) opener.current = typeof document === "undefined" ? null : document.activeElement;
  const starting = open && !presence.visible, ending = !open;

  // A passive effect: a layout cleanup runs inside React's mutation phase, before resetAfterCommit
  // restores focus to the element that was focused when the commit began (the Close button), which
  // would undo the hand-back to the opener.
  useEffect(() => {
    if (!open) return undefined;
    const doc = popup.current?.ownerDocument ?? document;
    const active = doc.activeElement;
    if (active && active !== doc.body && !popup.current?.contains(active)) opener.current = active;
    const release = holdModalInert(doc.getElementById("root"));
    // Focus in the effect itself: rAF does not run while the window is occluded, and a dialog that
    // never took focus leaves the composer editor focused, where Escape stops the running turn.
    const focus = () => {
      const node = popup.current;
      if (!node || node.contains(doc.activeElement) && doc.activeElement !== node) return;
      (initialFocusRef?.current ?? node.querySelector("[data-autofocus]:not(:disabled)") ?? node).focus({ preventScroll: true });
    };
    focus();
    const frame = requestAnimationFrame(focus);
    return () => {
      cancelAnimationFrame(frame);
      release();
      const target = opener.current, now = doc.activeElement;
      const lost = !now || now === doc.body || !now.isConnected || popup.current?.contains(now);
      if (lost && target?.isConnected && target !== doc.body && !target.closest("[inert]")) target.focus({ preventScroll: true });
    };
  }, [open]);

  // Base UI useDismiss listens on the document: Escape with focus lost to <body> (a control that
  // disabled itself mid-action) still closes the topmost dialog.
  useEffect(() => {
    if (!open) return undefined;
    const doc = popup.current?.ownerDocument;
    if (!doc) return undefined;
    const key = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      const active = doc.activeElement;
      if (active && active !== doc.body && active !== doc.documentElement) return;
      if ([...doc.querySelectorAll('[aria-modal="true"]')].at(-1) !== popup.current) return;
      event.preventDefault(); event.stopPropagation();
      close.current?.("escape-key");
    };
    doc.addEventListener("keydown", key);
    return () => doc.removeEventListener("keydown", key);
  }, [open]);

  const keyDown = (event) => {
    onKeyDown?.(event);
    // Keys from portalled children (a menu opened inside) are theirs.
    if (event.defaultPrevented || !open || !popup.current?.contains(event.target)) return;
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.stopPropagation();
      close.current?.("escape-key");
      return;
    }
    if (event.key !== "Tab") return;
    const list = tabbables(popup.current), first = list[0], last = list.at(-1), active = document.activeElement;
    if (!list.length) { event.preventDefault(); popup.current.focus({ preventScroll: true }); return; }
    if (event.shiftKey && (active === first || active === popup.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || active === popup.current)) { event.preventDefault(); first.focus(); }
  };

  const header = bleed
    ? <header className="sdlg-bleed-header">
        <h2 id={titleId} className="sdlg-bleed-title">{title}</h2>
        <span className="sdlg-spacer" />
        {showClose && <SourceDialogCloseButton onClick={() => close.current?.("close-press")} />}
      </header>
    : alert
      ? <header className="sdlg-header" data-alert="">
          <h2 id={titleId} className="sdlg-title">{title}</h2>
          {description && <p id={descriptionId} className={`sdlg-description ${descriptionClassName}`.trim()}>{description}</p>}
        </header>
      : <header className="sdlg-header">
          <div className="sdlg-heading">
            <h2 id={titleId} className="sdlg-title">{title}</h2>
            {description && <p id={descriptionId} className={`sdlg-description ${descriptionClassName}`.trim()}>{description}</p>}
          </div>
          {showClose && <SourceDialogCloseButton flush onClick={() => close.current?.("close-press")} />}
        </header>;

  return createPortal(
    <div className="sdlg-portal cds-root" data-cds-portal="" data-chat-source-version={sourceVersion} {...portalAttributes(density)}
      style={{ "--cds-portal-z": layer.z, "--cds-layer-base": layer.base }}>
      <div className="sdlg-backdrop" role="presentation" data-starting-style={starting ? "" : undefined} data-ending-style={ending ? "" : undefined}
        onMouseDown={(event) => {
          if (event.target !== event.currentTarget) return;
          // xf/Cf: the press never moves focus; only a dismissible Dialog closes on it.
          event.preventDefault();
          if (!alert && open) close.current?.("outside-press");
        }}>
        <section {...rest} ref={setPopup} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : rest["aria-describedby"]} tabIndex={-1}
          data-cds={alert ? "ConfirmationDialog" : "Dialog"} data-dialog-size={size} data-alert={alert ? "" : undefined}
          data-open={open && presence.visible ? "" : undefined} data-closed={ending ? "" : undefined}
          data-starting-style={starting ? "" : undefined} data-ending-style={ending ? "" : undefined}
          className={`sdlg-popup cds-reset ${className}`.trim()} onKeyDown={keyDown}>
          {header}
          {children}
          {footer && <SourceDialogFooter>{footer}</SourceDialogFooter>}
        </section>
      </div>
    </div>,
    document.body,
  );
}

/**
 * rp ConfirmationDialog: an alert dialog at size sm whose Confirm takes initial focus. `pending`
 * keeps Confirm busy and Cancel disabled, and Escape/Cancel do nothing until it settles. `layer`
 * (default MODAL_LAYER) lifts a confirm opened from a surface above it, e.g. the z-500 Settings dialog.
 */
export function SourceConfirmationDialog({
  open = true, title, body, confirmLabel = t("Confirm"), cancelLabel = t("Cancel"), confirmVariant = "primary",
  pending = false, onConfirm, onCancel, onExited, className = "", descriptionClassName, layer, children,
  initialFocus = "confirm", cancelRef,
}) {
  const confirm = useRef(null), cancelButton = useRef(null);
  // cancelRef: the caller's handle on Cancel (BK moves focus there when the dirty-worktree copy appears).
  const setCancel = (node) => { cancelButton.current = node; if (typeof cancelRef === "function") cancelRef(node); else if (cancelRef) cancelRef.current = node; };
  const cancel = () => { if (!pending) onCancel?.(); };
  return <SourceDialog open={open} onExited={onExited} alert size="sm" showClose={false} title={title} description={body}
    descriptionClassName={descriptionClassName} initialFocusRef={initialFocus === "cancel" ? cancelButton : confirm} onClose={cancel} className={className} layer={layer}
    footer={<>
      <SourceSettingsButton ref={setCancel} variant="secondary" disabled={pending} onClick={cancel}>{cancelLabel}</SourceSettingsButton>
      <SourceSettingsButton ref={confirm} variant={confirmVariant} busy={pending} onClick={() => { if (!pending) onConfirm?.(); }}>{confirmLabel}</SourceSettingsButton>
    </>}>
    {children}
  </SourceDialog>;
}
