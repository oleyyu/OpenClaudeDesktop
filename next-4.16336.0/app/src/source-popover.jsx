import React, { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { menuLayer, positionMenu, restoreDecision } from "./menu-model.mjs";
import "./source-popover.css";

/*
 * Shared CDS Popover (2.2553.1 shared-frame-C_2npUJq.js:12759-12960 cx/lx/ux,
 * px/mx/gx), written from the traced behavior over the same positioner math
 * and close reasons as source-menu.jsx:
 * - gx portal: yl root (cds-root, data-cds-portal, density/mode/theme/platform/
 *   font copied from the anchor) at al("popover") = layer base + 100, offset 20.
 * - Positioner: side bottom / align center / sideOffset 6 by default, the
 *   positionMenu flip-and-shift collision box, --available-height/-width, and
 *   repositioning on content growth or window resize instead of closing.
 * - px popup: data-cds="Popover" (a consumer data-cds overrides it, as the
 *   spread `...i` does), data-cds-overlay, role="dialog" named by Title;
 *   cx = max-w-[320px] max-h-[var(--available-height)] Wd("popover")
 *   (rounded-card, bg-surface-3, shadow-panel), text-body text-primary.
 * - Body: tabIndex -1, data-cds-popover-body + data-cds-sheet-scroll, lx
 *   (inherits the popup's flex/grid layout, overflow-y auto, rounded) with
 *   scroll-fade-y and the ux padding scale none/xs/sm/md/lg (default lg). A
 *   focused popup hands focus to its body (gx onFocus).
 * - Dismissal: Escape (preventDefault + stopPropagation, Base UI useDismiss),
 *   outside press and focus moving to another element outside the popup;
 *   Id({skipRestoreOnOutsideFocus:true}) returns focus to the trigger unless an
 *   outside press already moved it elsewhere. A pointer press on the trigger
 *   is its own toggle, not an outside press.
 */

const PORTAL_ATTRIBUTES = ["data-density", "data-mode", "data-chat-source-version", "data-cds-theme", "data-platform", "data-font", "data-page-bg"];
export const POPOVER_LAYER_OFFSET = 20; // shared-frame tl.popover
export const POPOVER_SIDE_OFFSET = 6; // mx/gx sideOffset default
export const POPOVER_PADDINGS = Object.freeze(["none", "xs", "sm", "md", "lg"]); // ux

// Base UI hands initialFocus the interaction that opened the popup
// (mouse/touch/pen/keyboard); the last pointer or key press stands in for it.
let lastInteraction = "keyboard";
if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("pointerdown", (event) => { lastInteraction = event.pointerType || "mouse"; }, true);
  document.addEventListener("keydown", () => { lastInteraction = "keyboard"; }, true);
}

const PopoverContext = createContext(null);
const TABBABLE = 'button:not(:disabled),[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])';

function portalAttributes(source) {
  const result = { "data-density": "compact" };
  const root = typeof document === "undefined" ? null : document.documentElement;
  for (const name of PORTAL_ATTRIBUTES) {
    const node = source?.closest?.(`[${name}]`) || root;
    const value = node?.getAttribute?.(name);
    if (value != null) result[name] = value;
  }
  return result;
}

/** Popover.Title: names the dialog (aria-labelledby). Outside a popover it is a plain heading. */
export function SourcePopoverTitle({ children, className = "" }) {
  const popover = useContext(PopoverContext);
  useLayoutEffect(() => {
    if (!popover) return undefined;
    popover.declareTitle(true);
    return () => popover.declareTitle(false);
  }, [popover]);
  return <h2 id={popover?.titleId} className={`sp-title ${className}`.trim()}>{children}</h2>;
}

/** The enclosing popover ({titleId, close(reason), node}), or null outside one. */
export function useSourcePopover() {
  return useContext(PopoverContext);
}

export function SourcePopover({
  anchor, side = "bottom", align = "center", sideOffset = POPOVER_SIDE_OFFSET, alignOffset = 0, collisionPadding = 8,
  padding = "lg", scrollFade = true, label, dataCds = "Popover", className = "", style, onClose, finalFocus, initialFocus, children, id, layerBase = 0,
}) {
  const positionerRef = useRef(null), popupRef = useRef(null), bodyRef = useRef(null);
  const titleId = useId();
  const [hasTitle, setHasTitle] = useState(false);
  const closing = useRef(false), alive = useRef(true), outsideTimer = useRef(null);
  const latest = useRef({});
  latest.current = { onClose, finalFocus, anchor };
  const layer = menuLayer(layerBase, POPOVER_LAYER_OFFSET);

  const requestClose = useCallback((reason, event) => {
    if (closing.current || !alive.current) return;
    closing.current = true;
    const popup = popupRef.current, active = document.activeElement;
    const decision = restoreDecision({
      reason: reason === "close-press" ? "item-click" : reason,
      activeInsidePopup: !!active && !!popup?.contains(active),
      activeIsBody: !active || active === document.body,
      finalFocus: latest.current.finalFocus,
    });
    const { anchor: owner, finalFocus: target } = latest.current;
    latest.current.onClose?.(reason, event);
    // Id/Ag: focus goes back only while it is lost (body) or still inside the popup.
    const now = document.activeElement;
    const lost = !now || now === document.body || now === popup || !!popup?.contains(now);
    if (!lost) return;
    if (decision === "trigger" && owner?.isConnected) owner.focus({ preventScroll: true });
    else if (decision === "final") {
      const node = typeof target === "function" ? target() : target;
      if (node?.isConnected) node.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => () => { alive.current = false; clearTimeout(outsideTimer.current); }, []);

  // Positioner: measure, place, expose --available-height/-width and follow
  // content growth or window resizes without closing.
  useLayoutEffect(() => {
    const positioner = positionerRef.current, popup = popupRef.current;
    if (!positioner || !popup) return undefined;
    const place = () => {
      const anchorRect = anchor?.getBoundingClientRect?.();
      if (!anchorRect) return;
      const size = popup.getBoundingClientRect();
      const placement = {
        anchor: anchorRect, size: { width: size.width, height: size.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        side, align, sideOffset, collisionPadding,
      };
      let result = positionMenu({ ...placement, alignOffset });
      if (typeof alignOffset === "function") {
        const offset = alignOffset({ side: result.side, anchor: anchorRect, positioner: size });
        result = positionMenu({ ...placement, alignOffset: offset });
      }
      positioner.style.left = `${result.left}px`;
      positioner.style.top = `${result.top}px`;
      positioner.style.setProperty("--available-height", `${result.availableHeight}px`);
      positioner.style.setProperty("--available-width", `${result.availableWidth}px`);
      positioner.style.visibility = "";
      for (const node of [positioner, popup]) { node.setAttribute("data-side", result.side); node.setAttribute("data-align", result.align); }
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(popup);
    window.addEventListener("resize", place);
    return () => { observer?.disconnect(); window.removeEventListener("resize", place); };
  }, [anchor, side, align, sideOffset, alignOffset, collisionPadding]);

  // Base UI transition status: data-starting-style for exactly one frame.
  useLayoutEffect(() => {
    const popup = popupRef.current;
    popup?.setAttribute("data-starting-style", "");
    const frame = requestAnimationFrame(() => popup?.removeAttribute("data-starting-style"));
    return () => cancelAnimationFrame(frame);
  }, []);

  // initialFocus(interaction): an element, true (the first tabbable element),
  // or nothing for the popup itself, which hands focus to its body. Focus
  // moves on the next frame so the opener's click settles first.
  useEffect(() => {
    const type = lastInteraction;
    const frame = requestAnimationFrame(() => {
      if (closing.current) return;
      const chosen = typeof initialFocus === "function" ? initialFocus(type) : initialFocus?.current ?? initialFocus;
      if (chosen === false) return;
      // true = Base UI's default target, the first tabbable element inside.
      const node = chosen === true ? popupRef.current?.querySelector(TABBABLE)
        : chosen instanceof HTMLElement && chosen.isConnected ? chosen : null;
      (node ?? popupRef.current)?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape and outside press (document level, like the menu root).
  useEffect(() => {
    const pointer = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // qg: a press on the trigger is the trigger's own toggle, not an outside press.
      if (popupRef.current?.contains(target) || latest.current.anchor?.contains?.(target)) return;
      clearTimeout(outsideTimer.current);
      outsideTimer.current = setTimeout(() => requestClose("outside-press", event), 0);
    };
    const key = (event) => {
      if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      requestClose("escape-key", event);
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", key);
    };
  }, [requestClose]);

  const context = useMemo(() => ({
    titleId, declareTitle: setHasTitle, close: (reason = "close-press") => requestClose(reason), node: popupRef,
  }), [titleId, requestClose]);
  const attributes = useMemo(() => portalAttributes(anchor ?? (typeof document === "undefined" ? null : document.body)), [anchor]);
  const resolvedPadding = POPOVER_PADDINGS.includes(padding) ? padding : "lg";

  return createPortal(
    <PopoverContext.Provider value={context}>
      <div className="sp-portal cds-root" data-cds-portal="" {...attributes}
        style={{ "--cds-portal-z": layer.z, "--cds-layer-base": layer.layerBase }}>
        <div ref={positionerRef} className="sp-positioner" style={{ visibility: "hidden" }}>
          <div ref={popupRef} id={id} role="dialog" tabIndex={-1} aria-label={hasTitle ? undefined : label} aria-labelledby={hasTitle ? titleId : undefined}
            data-cds={dataCds} data-cds-overlay="" data-open=""
            className={`sp-popup cds-reset rounded-card shadow-panel ${className}`.trim()} style={style}
            onFocus={(event) => {
              // gx onFocus: a focused popup forwards focus to its body.
              if (event.target === event.currentTarget && document.activeElement === event.currentTarget) bodyRef.current?.focus({ preventScroll: true });
            }}
            onKeyDown={(event) => {
              // The popup is portaled to <body>, but React bubbles its keys through the component tree, so an
              // enclosing dialog's onKeyDown (Settings' Escape-to-close) would also take this Escape. Base UI's
              // useDismiss is document-level and closes only the topmost popup, so stop the React bubbling here.
              // Keys from a nested portal (a menu opened inside the popup) are left to that layer.
              if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing || !event.currentTarget.contains(event.target)) return;
              event.preventDefault();
              event.stopPropagation();
              requestClose("escape-key", event.nativeEvent);
            }}
            onBlur={(event) => {
              // A non-modal Base UI popover closes when focus moves to another element outside it
              // (focus-out: no restore); focus lost to the window or body is not a focus-out.
              const next = event.relatedTarget;
              if (next instanceof Node && !event.currentTarget.contains(next) && !latest.current.anchor?.contains?.(next)) requestClose("focus-out", event);
            }}>
            <div ref={bodyRef} tabIndex={-1} data-cds-popover-body="" data-cds-sheet-scroll="" data-padding={resolvedPadding}
              className={`sp-body ${scrollFade ? "scroll-fade-y" : ""}`.trim()}>{children}</div>
          </div>
        </div>
      </div>
    </PopoverContext.Provider>,
    document.body,
  );
}

// (W14-code r6 gen-final-6: SourcePopoverClose, a host <button> standing in for Popover.Close, lost its last caller when the
// usage panel's See detailed breakdown became c2d611398 Ne's CDS button; callers close through useSourcePopover().close.)
