import React from "react";
import { HistoryNavButtons, hostNavigationState } from "./titlebar-host.jsx";
import "./source-nav-buttons.css";
// surfaces wave 2 (titlebar): Back / Forward are the sliced 4.16336.0 shared-20 hv (memo(mv) → uv; generated/titlebar,
// scripts/extract-titlebar-v4.mjs): two ghost iconOnly cds-core Buttons, CaretLeft "Back" / CaretRight "Forward",
// tooltipSide "bottom", shortcut `va() ? "cmd+[" : "alt+left"` (va = shared-62 Qa, the macOS user-agent test), unavailable
// directions `"aria-disabled": !t || void 0` and `onClick: t ? y : void 0` painted by ov
// "aria-disabled:pointer-events-none aria-disabled:*:opacity-50", the wrapper `c === "sidebar" ? "flex items-center
// draggable-none" : "flex items-center gap-0.5 draggable-none"`. mv reads canGoBack / canGoForward from the official history
// store (shared-1 jm over BrowserNavigation.navigationStateStore), which titlebar-host.jsx answers from main.jsx's history /
// historyAt (useHostNavigation) and whose goBack / goForward call travel(). The 3.6556.2 Cm port (ArrowLeft / ArrowRight
// over historyAt props) is gone; this wrapper only keeps the legacy callers' Cm call shape (xI: buttonClassName
// "df-chrome-btn"): their history props are not read, the store is.
//
// The Go menu's canGoBack / canGoForward (main.jsx `navigation`) use the same bounds as the store.
export { hostNavigationState as navAvailability };
export function SourceNavButtons({ placement, buttonClassName = "df-chrome-btn", size }) {
  return <HistoryNavButtons placement={placement} buttonClassName={buttonClassName} size={size} />;
}
