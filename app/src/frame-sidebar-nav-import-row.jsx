// U-NAV-IMPORT (2026-11-12): the host's "Import history" row in the sidebar's top nav, right under the official
// Customize row (user request: bring other agents' chats in from the sidebar). It opens the Import history dialog
// (source-import-history.jsx: every conversation on this Mac listed, previewed and picked one by one).
// The top rows are the official registry (generated/frame-sidebar-nav shared-21 HN, rendered by shared-57 Dk), which has
// no host entry, so the row is the host's own: a button portalled into the official pin-rows list right after
// `[data-nav-item="customize"]`, wearing that row's class and icon style (same height, hover and focus look), with
// data-roving-item so the official arrow-key focus (shared-140 / shared-18) walks onto it. It stays outside the official
// row ids (no data-nav-item), which the nav looks up by value. React leaves foreign siblings alone; an observer puts the
// row back under Customize whenever the nav re-renders that list.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t } from "../electron/i18n/index.mjs";

const CUSTOMIZE_ROW = '[data-testid="nav-pin-rows"] > [data-nav-item="customize"]';
// The cds icon font's ArrowInSquare (generated/cds-core shared-frame icon map: ArrowInSquare 57355).
const IMPORT_GLYPH = String.fromCodePoint(57355);

export function NavImportRow({ onOpen }) {
  const [slot, setSlot] = useState(null);
  const hostRef = useRef(null);
  const enabled = typeof onOpen === "function";
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;
    const host = hostRef.current ??= document.createElement("div");
    host.style.display = "contents";
    host.dataset.hostNavRow = "import";
    let frame = 0;
    const place = () => {
      frame = 0;
      const customize = document.querySelector(CUSTOMIZE_ROW);
      if (!customize) { host.remove(); setSlot(null); return; }
      if (customize.nextSibling !== host) customize.after(host);
      const className = customize.className;
      const iconStyle = customize.querySelector('[data-cds="Icon"]')?.getAttribute("style") ?? "";
      setSlot((previous) => previous?.className === className && previous.iconStyle === iconStyle ? previous : { className, iconStyle });
    };
    place();
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(place); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); host.remove(); setSlot(null); };
  }, [enabled]);
  if (!enabled || !slot || !hostRef.current) return null;
  return createPortal(
    <button type="button" data-row="" data-roving-item="" data-row-main-button="" data-row-nav="" data-host-nav-item="import"
      className={slot.className} onClick={(event) => onOpen(event.currentTarget)}>
      <span className="df-leading-slot">
        <span data-cds="Icon" aria-hidden="true" ref={(node) => { if (node) node.setAttribute("style", slot.iconStyle); }}>{IMPORT_GLYPH}</span>
      </span>
      <span className="flex min-w-0 flex-1 items-center"><span className="min-w-0 truncate">{t("Import history")}</span></span>
    </button>,
    hostRef.current,
  );
}
