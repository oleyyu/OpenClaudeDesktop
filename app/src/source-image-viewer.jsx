import React, { useEffect, useId, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MODAL_LAYER } from "./source-dialog.jsx";
import { holdModalInert } from "./modal-inert.mjs";
import { CdsButton } from "./generated/view-tabs/shared-frame-6jtSkIit.js";
import "./source-image-viewer.css";
import { t } from "../electron/i18n/index.mjs";

/*
 * ImagePreviewModal (2.2553.1 cb1b78cfa-DUGu0H_X.js), the image viewer the composer opens from an
 * image pill (Za, c099c328d :3143-3150 Ue, :3518-3526) and tool thumbnails open from QO
 * (approval-current.js:7398-7445). One dialog on the shared modal layer (MODAL_LAYER, as yl portals
 * every modal): a fixed grid centring a 40rem frame over bg-always-black/50 + backdrop-brightness-75,
 * the image in a w-fit rounded-md overflow-hidden wrapper with the zoom shadow (cd5136de8 `t`), at
 * most 100vh - 4rem tall, and a dark-mode ghost icon-only X 'Close image preview' just right of it.
 * Escape, a backdrop press and a press on the image close it; focus returns to the opener (the pill
 * or thumbnail). With motion allowed the image zooms from its origin (cd5136de8 morphs it with a view
 * transition: .35s cubic-bezier(.32,.72,0,1) in, .25s out); reduced motion opens and closes at once.
 * Annotate (onAnnotate → the As annotation dialog, c099c328d :3527-3537) is not offered: the local app
 * has no drawing surface to save an annotated copy into the composer, and a button with nothing behind
 * it would be invented UI.
 */
const SHADOW_EASE = "cubic-bezier(.32,.72,0,1)";
const motionAllowed = (doc) => !(doc.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  || doc.documentElement.dataset.localMotion === "reduce");
// The transform that puts the frame over the origin (cd5136de8 S: only an origin still on screen).
function originTransform(frame, origin) {
  if (!origin?.isConnected) return null;
  const from = origin.getBoundingClientRect(), to = frame.getBoundingClientRect();
  const view = origin.ownerDocument.defaultView;
  if (!(from.width > 0 && from.height > 0 && to.width > 0 && to.height > 0)) return null;
  if (from.bottom <= 0 || from.top >= view.innerHeight || from.right <= 0 || from.left >= view.innerWidth) return null;
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

export function SourceImageViewer({ src, alt = "", caption, originRef, onClose }) {
  const popup = useRef(null), frame = useRef(null), image = useRef(null), closeButton = useRef(null);
  const titleId = useId();
  const closing = useRef(false), release = useRef(null);
  // The opener is read while rendering, before the dialog takes focus.
  const opener = useRef(undefined);
  if (opener.current === undefined) opener.current = typeof document === "undefined" ? null : document.activeElement;
  const origin = () => originRef?.current ?? null;
  const restoreFocus = () => {
    release.current?.();
    release.current = null;
    const target = origin()?.isConnected ? origin() : opener.current;
    if (target?.isConnected && target !== target.ownerDocument.body && !target.closest("[inert]")) target.focus({ preventScroll: true });
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const doc = popup.current?.ownerDocument;
    // Focus goes back at once while the exit runs, like the shared dialog.
    restoreFocus();
    const transform = doc && motionAllowed(doc) && frame.current ? originTransform(frame.current, origin()) : null;
    if (!transform) { onClose?.(); return; }
    popup.current.style.pointerEvents = "none";
    popup.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, easing: SHADOW_EASE, fill: "forwards" });
    const exit = frame.current.animate([{ transform: "none" }, { transform, borderRadius: "5px" }], { duration: 250, easing: SHADOW_EASE, fill: "forwards" });
    // An occluded window may never advance the animation: the timer closes it regardless.
    let done = false;
    const finish = () => { if (!done) { done = true; onClose?.(); } };
    exit.finished.then(finish, finish);
    doc.defaultView.setTimeout(finish, 320);
  };

  useEffect(() => {
    const doc = popup.current.ownerDocument;
    release.current = holdModalInert(doc.getElementById("root"));
    (closeButton.current ?? popup.current).focus({ preventScroll: true });
    return () => { if (release.current) restoreFocus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoom from the origin once the image has its size; until then it is not shown at full size.
  useLayoutEffect(() => {
    const doc = popup.current.ownerDocument, img = image.current, node = frame.current;
    if (!motionAllowed(doc) || !origin()) return undefined;
    let cancelled = false;
    const zoom = () => {
      node.style.opacity = "";
      if (cancelled || closing.current) return;
      const transform = originTransform(node, origin());
      if (!transform) return;
      node.animate([{ transform, borderRadius: "5px" }, { transform: "none" }], { duration: 350, easing: SHADOW_EASE });
      popup.current?.animate([{ backgroundColor: "rgb(0 0 0 / 0)", backdropFilter: "brightness(1)" }, {}], { duration: 350, easing: SHADOW_EASE });
    };
    if (img.complete && img.naturalWidth > 0) { zoom(); return () => { cancelled = true; }; }
    node.style.opacity = "0";
    img.addEventListener("load", zoom, { once: true });
    img.addEventListener("error", zoom, { once: true });
    return () => { cancelled = true; img.removeEventListener("load", zoom); img.removeEventListener("error", zoom); node.style.opacity = ""; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // P: a press inside the image wrapper (or on the X) closes; the figure keeps other presses from the backdrop.
  const pressClose = (event) => {
    if (!event.currentTarget.contains(event.target)) return;
    event.preventDefault(); event.stopPropagation();
    close();
  };
  const keyDown = (event) => {
    if (event.key === "Escape" && !event.nativeEvent.isComposing) {
      event.preventDefault(); event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      // The X is the only control: focus stays in the dialog.
      event.preventDefault();
      closeButton.current?.focus();
    }
  };
  return createPortal(
    <div className="sdlg-portal cds-root" data-cds-portal="" style={{ "--cds-portal-z": MODAL_LAYER.z, "--cds-layer-base": MODAL_LAYER.base }}>
      <div ref={popup} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} data-cds="ImagePreviewModal"
        className="fixed inset-0 grid place-items-center p-4 sm:p-10 bg-black/62.5 outline-none siv-popup" onClick={close} onKeyDown={keyDown}>
        <h2 id={titleId} className="sr-only">{alt || t("Image preview")}</h2>
        <div className="siv-frame">
          <div className="siv-figure" onClick={(event) => event.stopPropagation()}>
            <div className="cds-dark-scope siv-actions" data-mode="dark">
              {/* 3.6556.2 cb1b78cfa: `t(o,{iconOnly:!0,icon:"X","aria-label":m,tooltip:!1,"data-testid":"close-file-preview"})`
                  (o = shared-frame Uu = CdsButton; W14-code r5 cleanup css5-settings-button-replica). */}
              <CdsButton ref={closeButton} variant="ghost" iconOnly icon="X" aria-label={t("Close image preview")} tooltip={false}
                data-testid="close-file-preview" onClick={pressClose} />
            </div>
            <div ref={frame} className="siv-image" onClick={pressClose}>
              <img ref={image} src={src} alt={alt} decoding="sync" draggable={false} onDragStart={(event) => event.preventDefault()} />
            </div>
          </div>
          {caption ? <div className="siv-caption">{caption}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
