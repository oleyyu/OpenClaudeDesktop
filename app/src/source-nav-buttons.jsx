import React from "react";
// R6: the sidebar / titlebar hosts reach view-tabs through the facade (neither sits in the chat/composer/menu graph, E41).
import { CdsButton, isMacUserAgent } from "./generated/view-tabs/index.js";
import { t } from "../electron/i18n/index.mjs";
import "./source-nav-buttons.css";
// 3.6556.2 shared-20-mUr7IqZY.js Cm (exported `Dm as Po`, shared-21 `Po as w_`, drawn by shared-21 xI as
// `u(w_,{buttonClassName:"df-chrome-btn",placement:"sidebar",size:a,…})`): two ghost icon-only CDS Buttons (D = view-tabs
// CdsButton), ArrowLeft "Back" / ArrowRight "Forward", tooltipSide "bottom", shortcut `Qr() ? "cmd+[" : "alt+left"`, so the
// Button's own tooltip shows label + shortcut and writes aria-keyshortcuts. Unavailable directions carry
// `"aria-disabled": !t || void 0` and `onClick: t ? v : void 0` (focusable), painted by Sm
// "aria-disabled:pointer-events-none aria-disabled:*:opacity-50" (loaded c6a992d55 utilities). xI's size is
// `ql("panels") ? oI(r) && "sm" : void 0`; the fizzy-lake "panels" gate is closed in OpenClaude, so size is undefined (the
// Button's h-control default). The host reads canGoBack/canGoForward from main.jsx history/historyAt (travel()).
// The macOS tooltips (navShortcuts(true)); off macOS the Buttons show navShortcuts(false).
export const NAV_TOOLTIPS = {
  back: { content: t("Back"), shortcut: "cmd+[", side: "bottom", hoverable: false },
  forward: { content: t("Forward"), shortcut: "cmd+]", side: "bottom", hoverable: false },
};
// Cm `h=Qr(),g=h?"cmd+[":"alt+left",_=h?"cmd+]":"alt+right"`: Qr is shared-78 Do `Oe(Oo,!1)` (shared-25 si: the
// /(macintosh|macintel|macppc|mac68k|macos)/i user-agent test once hydrated, false on the server). The host reads the
// same To test through view-tabs isMacUserAgent (shared-78 Eo, false without a window). Only the Button's tooltip
// shortcut / aria-keyshortcuts change; the official key binding is the macOS Go menu (index.chunk dSi ySi("Command+[",
// "Command+]")), which has no non-mac counterpart, so no alt+left / alt+right handler is added.
export function navShortcuts(mac = isMacUserAgent()) {
  return mac ? { back: "cmd+[", forward: "cmd+]" } : { back: "alt+left", forward: "alt+right" };
}
export const NAV_DISABLED_CLASS = "aria-disabled:pointer-events-none aria-disabled:*:opacity-50";
export function navAvailability(historyAt = 0, historyLength = 1) {
  return { canGoBack: historyAt > 0, canGoForward: historyAt < historyLength - 1 };
}
// Cm `b = s === "sidebar" ? "flex items-center draggable-none" : "flex items-center gap-0.5 draggable-none"`.
export function navButtonsClass(placement) {
  return placement === "sidebar" ? "flex items-center draggable-none" : "flex items-center gap-0.5 draggable-none";
}
export function SourceNavButtons({ placement, historyAt = 0, historyLength = 1, travel, buttonClassName = "df-chrome-btn", size }) {
  const { canGoBack, canGoForward } = navAvailability(historyAt, historyLength);
  const shortcuts = navShortcuts();
  const className = buttonClassName ? `${buttonClassName} ${NAV_DISABLED_CLASS}` : NAV_DISABLED_CLASS;
  return (
    <div className={navButtonsClass(placement)}>
      <CdsButton size={size} variant="ghost" iconOnly icon="ArrowLeft" className={className} tooltipSide="bottom"
        shortcut={shortcuts.back} onClick={canGoBack ? () => travel?.(-1) : undefined}
        aria-disabled={!canGoBack || undefined} aria-label={t("Back")} />
      <CdsButton size={size} variant="ghost" iconOnly icon="ArrowRight" className={className} tooltipSide="bottom"
        shortcut={shortcuts.forward} onClick={canGoForward ? () => travel?.(1) : undefined}
        aria-disabled={!canGoForward || undefined} aria-label={t("Forward")} />
    </div>
  );
}
