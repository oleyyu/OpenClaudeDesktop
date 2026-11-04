import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { holdModalInert } from "./modal-inert.mjs";
import { useModalPresence } from "./use-modal-presence";
// W14-code r6 sh6-03: shared-frame Xy / ab buttons are Uu (E41 direct import, not the index facade).
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { t } from "../electron/i18n/index.mjs";
import "./source-dialog.css";

/*
 * Shared CDS Dialog / AlertDialog. W14-code r2-shared-06 / css2-dialog-body: the DOM and classes follow 3.6556.2
 * shared-frame-6jtSkIit.js verbatim (E84 step 2: the official Dialog is Base UI, whose portal renders nothing on the
 * server and whose focus/Escape model differs from the one the 32 host callers rely on, so it is not wrapped; the class
 * strings are copied here, not imported, because the chat/composer graph imports this module and must not reach the
 * view-tabs facade, E41):
 * - Dialog nb { Popup: qy }: the portal (hp, className "relative") holds three siblings: the Backdrop F with
 *   Q(hy, gy), the window drag strip xy, and the popup Gy with Q("draggable-none", Sy, `${Xv} ${my} ${Cy} ${wy[size]}`,
 *   className), whose only child is b("div", { className: Zv, children }); so the popup has no padding or overflow and
 *   the header, content and footer all scroll together in the Zv body (scroll-fade-y).
 * - Nesting (Base UI DialogPopup state { nested, nestedDialogOpen } mapped to data-nested / data-nested-dialog-open,
 *   style --nested-dialogs): a dialog opened inside another dims and blurs its parent (Sy after:opacity-100, Cy
 *   blur-[2px]) and its own backdrop turns transparent (hy has-[~[data-nested]]:bg-transparent).
 * - Header Zy (py off): Q("mb-pad-md flex items-start gap-2") > [div c(My, "flex min-w-0 flex-1 flex-col gap-1") >
 *   [Title Jy Q("text-primary", Ay), Description "text-body font-normal text-secondary break-words"], Xy flush
 *   ("-me-pad-sm -mt-pad-sm", ghost icon-only X, aria-label wn("close","Close"))]. Footer eb: Q("mt-pad-lg flex
 *   flex-col-reverse gap-2 sm:flex-row", "max-sm:[&>[data-cds-disabled-reason-wrapper]]:flex-col", $y[align]).
 * - ConfirmationDialog ab: the same popup at wy.sm, and in the Zv body the Title St c(jy, ky, "text-primary"),
 *   the Description a(Ny), children and eb [Cancel (secondary), Confirm (confirmVariant, busy while pending)].
 * Base UI behaviour kept from the previous host version: Escape (useDismiss) closes only this dialog and is consumed;
 * a backdrop press dismisses a Dialog but not an AlertDialog; focus is trapped and returns to the opener on close.
 * Local adaptations: #root is inert while open (modal-inert.mjs); a closing dialog releases it and returns focus at once
 * while its exit transition runs (source-dialog.css lets presses through the exiting layer). An alert dialog's popup is
 * role=alertdialog, as Base UI AlertDialog's; every other dialog is role=dialog.
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
// shared-frame-6jtSkIit.js class strings (Jv = `${ig("popover")} shadow-panel-lg`, ig("popover") = "rounded-card bg-surface-3 shadow-panel").
const POPUP_VIEWPORT_MAX_HEIGHT = "max-h-[calc(100dvh_-_max(2rem,2*var(--desktop-titlebar-inset,0px))_-_2*max(env(safe-area-inset-top,0px),env(safe-area-inset-bottom,0px)))]"; // Yv
const POPUP_CLASS = `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[calc(100vw_-_2rem_-_2*max(env(safe-area-inset-left,0px),env(safe-area-inset-right,0px)))] ${POPUP_VIEWPORT_MAX_HEIGHT} rounded-card bg-surface-3 shadow-panel shadow-panel-lg cds-reset text-body font-normal text-primary outline-none focus-visible:outline-hidden`; // Xv
const BODY_CLASS = "isolate flex min-h-0 flex-1 flex-col overflow-y-auto scroll-fade-y rounded-[inherit] p-xl break-words"; // Zv
const POPUP_TRANSITION_CLASS = "transition-[opacity,scale,filter] duration-base ease-out motion-reduce:transition-none data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98] starting:opacity-0 starting:scale-[0.98] motion-reduce:data-[starting-style]:scale-100 data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]"; // my
const BACKDROP_CLASS = "draggable-none fixed inset-0 bg-backdrop transition-opacity duration-base ease-out motion-reduce:transition-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 has-[~[data-nested]]:bg-transparent has-[~[data-nested]]:backdrop-blur-none starting:opacity-0"; // Q(hy, gy)
const NESTED_OVERLAY_CLASS = "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-backdrop after:opacity-0 after:z-50 after:transition-opacity after:duration-base after:ease-out data-[nested-dialog-open]:after:opacity-100"; // Sy
const NESTED_BLUR_CLASS = "data-[nested-dialog-open]:blur-[2px]"; // Cy
const POPUP_SIZES = { sm: "max-w-[400px]", md: "max-w-[520px]", lg: "max-w-[720px]", xl: "max-w-[880px]", "2xl": "max-w-[1024px]", "3xl": "max-w-[1152px]" }; // wy
const DRAG_STRIP_STYLE = { height: "var(--desktop-titlebar-inset, 0px)", WebkitAppRegion: "drag" }; // by
const FOOTER_ALIGN = { start: "sm:justify-start", center: "sm:justify-center", end: "sm:justify-end", between: "sm:justify-between" }; // $y
const DESCRIPTION_CLASS = "text-body font-normal text-secondary break-words"; // Zy's description
// Base UI DialogPopup { nested, nestedDialogOpen }: the parent dialog a nested one registers with.
const DialogNesting = React.createContext(null);
const joinClasses = (...parts) => parts.filter(Boolean).join(" ");

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

// eb Footer; sdlg-footer stays as the callers' override hook (no rule of its own).
export function SourceDialogFooter({ className = "", align = "end", children }) {
  return <div className={joinClasses("sdlg-footer mt-pad-lg flex flex-col-reverse gap-2 sm:flex-row max-sm:[&>[data-cds-disabled-reason-wrapper]]:flex-col",
    FOOTER_ALIGN[align] ?? FOOTER_ALIGN.end, className)}>{children}</div>;
}

// Xy CloseButton (Yy flush: -me-pad-sm -mt-pad-sm).
export function SourceDialogCloseButton({ flush = false, label = t("Close"), onClick }) {
  // shared-frame Xy: `b(Uu,{variant:"ghost",iconOnly:!0,icon:"X","aria-label":o,tooltip:!1,className:c})`.
  return <CdsButton variant="ghost" iconOnly icon="X" aria-label={label} tooltip={false}
    className={flush ? "-me-pad-sm -mt-pad-sm" : undefined} onClick={onClick} />;
}

// xy: the titlebar-inset strip that keeps the window draggable above an open dialog.
function DialogDragStrip() {
  return <div aria-hidden="true" data-cds-window-drag-strip="" className="fixed inset-x-0 top-0" style={DRAG_STRIP_STYLE} />;
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
  sourceVersion, showClose = true, footer, initialFocusRef, popupRef, density, className = "", children, onKeyDown, layer = MODAL_LAYER, ...rest
}) {
  const popup = presence.popup, titleId = useId(), descriptionId = useId();
  const setPopup = React.useCallback(node => { popup.current = node; if (typeof popupRef === 'function') popupRef(node); else if (popupRef) popupRef.current = node; }, [popup, popupRef]);
  const close = useRef(onClose);
  close.current = onClose;
  // The opener is read while rendering, before any child (autoFocus, effects) can move focus.
  const opener = useRef(undefined);
  if (opener.current === undefined) opener.current = typeof document === "undefined" ? null : document.activeElement;
  const starting = open && !presence.visible, ending = !open;
  // Base UI nesting: count the open dialogs rendered inside this one, and register with the dialog this one is inside.
  const parentNesting = React.useContext(DialogNesting);
  const [nestedOpen, setNestedOpen] = useState(0);
  const nesting = React.useMemo(() => ({ register: () => { setNestedOpen((count) => count + 1); return () => setNestedOpen((count) => count - 1); } }), []);
  useEffect(() => (open && parentNesting ? parentNesting.register() : undefined), [open, parentNesting]);

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

  // ab: the alert title (c(jy, ky, "text-primary")) and Description (Ny) sit straight in the body; Zy wraps the
  // dialog title column and the flush close button. sdlg-header / sdlg-description are hooks only (the UI scripts
  // read them); no rule styles them.
  const header = alert
    ? <>
        <h2 id={titleId} className="-mt-0.5 text-heading font-medium font-header break-words text-primary">{title}</h2>
        {description && <p id={descriptionId} className={joinClasses("sdlg-description mt-1", DESCRIPTION_CLASS, descriptionClassName)}>{description}</p>}
      </>
    : <div className="sdlg-header mb-pad-md flex items-start gap-2">
        <div className="-mt-1 flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={titleId} className="text-primary text-title font-semibold font-header break-words">{title}</h2>
          {description && <p id={descriptionId} className={joinClasses("sdlg-description", DESCRIPTION_CLASS, descriptionClassName)}>{description}</p>}
        </div>
        {showClose && <SourceDialogCloseButton flush onClick={() => close.current?.("close-press")} />}
      </div>;

  return createPortal(
    <div className="sdlg-portal cds-root relative" data-cds-portal="" data-chat-source-version={sourceVersion} {...portalAttributes(density)}
      style={{ "--cds-portal-z": layer.z, "--cds-layer-base": layer.base }}>
      <div className={`sdlg-backdrop ${BACKDROP_CLASS}`} role="presentation" data-starting-style={starting ? "" : undefined} data-ending-style={ending ? "" : undefined}
        onMouseDown={(event) => {
          // xf/Cf: the press never moves focus; only a dismissible Dialog closes on it.
          event.preventDefault();
          if (!alert && open) close.current?.("outside-press");
        }} />
      <DialogDragStrip />
      <section {...rest} ref={setPopup} role={alert ? "alertdialog" : "dialog"} aria-modal="true" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : rest["aria-describedby"]} tabIndex={-1}
        data-cds={alert ? "ConfirmationDialog" : "Dialog"} data-nested={parentNesting ? "" : undefined}
        data-nested-dialog-open={nestedOpen > 0 ? "" : undefined}
        data-open={open && presence.visible ? "" : undefined} data-closed={ending ? "" : undefined}
        data-starting-style={starting ? "" : undefined} data-ending-style={ending ? "" : undefined}
        style={nestedOpen > 0 ? { ...rest.style, "--nested-dialogs": nestedOpen } : rest.style}
        className={joinClasses("sdlg-popup draggable-none", NESTED_OVERLAY_CLASS, POPUP_CLASS, POPUP_TRANSITION_CLASS, NESTED_BLUR_CLASS, POPUP_SIZES[size] ?? POPUP_SIZES.md, className)}
        onKeyDown={keyDown}>
        <div className={BODY_CLASS}>
          <DialogNesting.Provider value={nesting}>
            {header}
            {children}
            {footer && <SourceDialogFooter>{footer}</SourceDialogFooter>}
          </DialogNesting.Provider>
        </div>
      </section>
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
      {/* shared-frame ab: Cancel `b(Uu,{ref:M,variant:"secondary",disabled:A,…})`, Confirm `b(Uu,{ref:N,variant:x,busy:A,…})`. */}
      <CdsButton ref={setCancel} variant="secondary" disabled={pending} onClick={cancel}>{cancelLabel}</CdsButton>
      <CdsButton ref={confirm} variant={confirmVariant} busy={pending} onClick={() => { if (!pending) onConfirm?.(); }}>{confirmLabel}</CdsButton>
    </>}>
    {children}
  </SourceDialog>;
}
