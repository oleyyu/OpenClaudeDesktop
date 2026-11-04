import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { menuLayer, positionMenu } from "./menu-model.mjs";
import { POPOVER_LAYER_OFFSET } from "./source-popover.jsx";
// W14-code r6 R6DC-02: shared-frame CoachMark close / action are Uu with a `us` icon (E41 direct import).
import { CdsButton, CdsIcon } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import { t } from "../electron/i18n/index.mjs";
import "./source-coachmark.css";

/*
 * CDS CoachMark (2.31226.0 shared-frame-DVFSKIcx mT/pT, used by c51596d2b be for a NUX item):
 * - mT: the accent variant (surface fill-accent) opens after introDelay seconds; with a close button or an action,
 *   an outside press, focus leaving or Escape does not close it (the event keeps propagating).
 * - pT: a non-modal Popover (side bottom, sideOffset 10, arrowPadding 16) whose popup is data-cds="CoachMark",
 *   aria-live polite, never takes initial focus; nT drop-shadow positioner, rT max-w-[280px] (the NUX passes
 *   max-w-xs) p-lg text-body with the opacity/scale-0.97 starting style; $w.accent rounded-card bg-fill-accent
 *   text-on-accent; iT/cT the 28x12 arrow (rotated on the bottom side); the header row is the semibold title and
 *   the ghost xs X "Dismiss" (dT.accent ink); the action row "mt-xs flex justify-end" is a cds-dark-scope.
 * - onShown fires once the popup is placed (pT's style mutation observer / 300ms fallback).
 */
const ARROW_WIDTH = 28, ARROW_PADDING = 16;
const PORTAL_ATTRIBUTES = ["data-density", "data-mode", "data-chat-source-version", "data-cds-theme", "data-platform", "data-font", "data-page-bg"];

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

export function SourceCoachmark({ anchor, side = "bottom", align = "start", sideOffset = 10, introDelay = 0,
  label, title, actionLabel, onAction, onClose, onShown, className = "", children }) {
  const [ready, setReady] = useState(!introDelay);
  useEffect(() => {
    if (!introDelay) return undefined;
    const timer = setTimeout(() => setReady(true), introDelay * 1000);
    return () => clearTimeout(timer);
  }, [introDelay]);
  if (!ready || !anchor?.isConnected) return null;
  return <SourceCoachmarkPopup anchor={anchor} side={side} align={align} sideOffset={sideOffset} label={label} title={title}
    actionLabel={actionLabel} onAction={onAction} onClose={onClose} onShown={onShown} className={className}>{children}</SourceCoachmarkPopup>;
}

function SourceCoachmarkPopup({ anchor, side, align, sideOffset, label, title, actionLabel, onAction, onClose, onShown, className, children }) {
  const positionerRef = useRef(null), popupRef = useRef(null), arrowRef = useRef(null), shown = useRef(false);
  const latest = useRef({ onShown });
  latest.current = { onShown };
  const titleId = useId();
  const layer = menuLayer(0, POPOVER_LAYER_OFFSET);
  useLayoutEffect(() => {
    const positioner = positionerRef.current, popup = popupRef.current;
    if (!positioner || !popup) return undefined;
    const place = () => {
      if (!anchor.isConnected) return;
      const anchorRect = anchor.getBoundingClientRect();
      const hidden = anchorRect.width === 0 && anchorRect.height === 0;
      positioner.toggleAttribute("data-anchor-hidden", hidden);
      const size = popup.getBoundingClientRect();
      const result = positionMenu({ anchor: anchorRect, size: { width: size.width, height: size.height },
        viewport: { width: window.innerWidth, height: window.innerHeight }, side, align, sideOffset, collisionPadding: 8 });
      positioner.style.left = `${result.left}px`;
      positioner.style.top = `${result.top}px`;
      positioner.style.visibility = "";
      for (const node of [positioner, popup, arrowRef.current]) node?.setAttribute("data-side", result.side);
      // Base UI Arrow: centred on the anchor along the cross axis, kept arrowPadding inside the popup.
      const vertical = result.side === "top" || result.side === "bottom";
      const extent = vertical ? size.width : size.height;
      const center = vertical ? anchorRect.left + anchorRect.width / 2 - result.left : anchorRect.top + anchorRect.height / 2 - result.top;
      const offset = Math.max(ARROW_PADDING, Math.min(extent - ARROW_PADDING - ARROW_WIDTH, center - ARROW_WIDTH / 2));
      if (arrowRef.current) {
        arrowRef.current.style.left = vertical ? `${offset}px` : "";
        arrowRef.current.style.top = vertical ? "" : `${offset}px`;
      }
      if (!shown.current && !hidden) {
        shown.current = true;
        latest.current.onShown?.();
      }
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(popup);
    observer?.observe(anchor);
    window.addEventListener("resize", place);
    return () => { observer?.disconnect(); window.removeEventListener("resize", place); };
  }, [anchor, side, align, sideOffset]);
  // Base UI transition status: data-starting-style for one frame (rT opacity-0 scale-[0.97]).
  useLayoutEffect(() => {
    const popup = popupRef.current;
    popup?.setAttribute("data-starting-style", "");
    const frame = requestAnimationFrame(() => popup?.removeAttribute("data-starting-style"));
    return () => cancelAnimationFrame(frame);
  }, []);
  return createPortal(
    <div className="scm-portal cds-root" data-cds-portal="" {...portalAttributes(anchor)}
      style={{ "--cds-portal-z": layer.z, "--cds-layer-base": layer.layerBase }}>
      <div ref={positionerRef} className="scm-positioner" style={{ visibility: "hidden" }}>
        <div ref={popupRef} role="dialog" data-cds="CoachMark" data-variant="accent" data-open="" aria-live="polite"
          aria-label={title ? undefined : label} aria-labelledby={title ? titleId : undefined}
          className={`scm-popup cds-reset ${className}`.trim()}>
          <span ref={arrowRef} className="scm-arrow" aria-hidden="true">
            <svg width="28" height="12" viewBox="0 0 28 12">
              <path d="M0 0H28V2C23.5 2 22.8 2.2 21.6 3.3L15.6 8.6C14.7 9.4 13.3 9.4 12.4 8.6L6.4 3.3C5.2 2.2 4.5 2 0 2Z" />
            </svg>
          </span>
          <div className="scm-content">
            <div className="scm-head">
              {title && <h2 id={titleId} className="scm-title">{title}</h2>}
              {/* shared-frame CoachMark (accent): `b(Uu,{variant:"ghost",size:"xs",iconOnly:!0,icon:b(us,{name:"X",size:"xs"}),
                  tooltip:!1,"aria-label":m??j,className:\`shrink-0 ${yj.accent}\`})` in the ml-auto size-[1lh] slot. */}
              {onClose && <span className="ml-auto [&:where(:root[dir=rtl]_:dir(rtl))]:me-0 [&:where(:root[dir=rtl]_:dir(rtl))]:ms-auto flex size-[1lh] shrink-0 items-center justify-center">
                <CdsButton variant="ghost" size="xs" iconOnly icon={<CdsIcon name="X" size="xs" />} tooltip={false} aria-label={t("Dismiss")}
                  className="shrink-0 !text-on-accent [--cds-fill-ghost-hover:rgb(255_255_255/0.15)]" onClick={() => onClose("closed")} />
              </span>}
            </div>
            {children}
            {actionLabel && <div className="scm-actions cds-dark-scope" data-mode="dark">
              <CdsButton size="sm" variant="primary" onClick={() => onAction?.()}>{actionLabel}</CdsButton>
            </div>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
