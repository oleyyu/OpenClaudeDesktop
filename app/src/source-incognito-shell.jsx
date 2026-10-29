// w13-close-chat-surface (E77, plan-w13-closeout §0c): the incognito window shell of 3.6556.2, for the Chat surface's
// incognito New chat page and incognito chats. Official structure (ion-dist/assets/v1, parsed only, never executed):
//
// - shared-23 zA renders VA {hasDesktopTopBar, isIncognito} around LA {isIncognito}. LA asks shared-78 vK
//   (`function vK(e){let{isIncognito:t,isInIframe:n}=e,r=gK(),i=dK(yK);return r&&!t&&!n&&!i}`): while incognito it is
//   false, so LA does not mount the frame shell (shared-22 oR, the sidebar with it) and renders only
//   `div#main-content` with `padding: vA()` (`calc(${gc()?50:48}px - var(--desktop-top-bar-row-height, 0px)) 8px 8px`),
//   followed by `lm` (shared-20 Jy).
// - VA: `d = Mo()` is shared-78 gK (selector `e=>!0`, true), so the desktop top bar row exists only while incognito
//   (`E = n && !l && (!d || r)`). Its grid is `grid w-full overflow-hidden` with `gridTemplateRows: E ? `${O}px 1fr``,
//   `--desktop-top-bar-row-height: E ? `${O}px``, O = 48 on a Mac (`D = d && !m`, m = Windows / Linux), the row is
//   `hm` (shared-20 Py → Fy `{replacesFrameHeader: D}`) and the content `div` is
//   `o("flex min-h-0 min-w-0 w-full overflow-x-clip relative", g||u ? "overflow-y-clip" : yA(r), "print:!overflow-visible", a)`
//   with yA(true) = "overflow-y-auto [scrollbar-gutter:stable]" (fizzy-lake panels off).
// - shared-20 Fy while incognito (`T`): zIndex `V(T ? 30 : 20)` (above Jy's band); no `border-b` (replacesFrameHeader);
//   the sidebar toggle and Dm are not drawn (`!T && …`); the middle is
//   `div.flex.items-center.gap-2.text-bg-000 [Ud{today: xy}, span.text-sm.select-none incognito]` (shared-78 chat
//   copy `incognito: "Incognito chat"` MZWV60Fq3N) instead of Ly; the trailing `flex-1 flex items-center justify-end`
//   starts with Iy → Qg `{enabled, onToggle, shortcut: Yt("incognito"), tooltipSide: "left", className: "draggable-none"}`.
// - shared-20 Qg: CdsButton ghost iconOnly icon "X" (enabled), `tooltip: !1`, aria-label "Exit incognito" (DZ4HgSiP72),
//   className `n("group", s)`, in CdsTooltip `{hoverable: !1, side, shortcut, content}`, all inside
//   `ne {mode: b, className: "contents"}` with `b = t ? d : u` (u = the resolved mode, d its opposite): the inverted
//   CdsRoot that keeps the X legible on the dark band.
// - shared-20 Jy on a desktop top bar (`p = Zt()` true): only the frame, `Ro.div` data-testid "incognito-frame",
//   className "animate-incognito-frame-in pointer-events-none fixed inset-[50px_8px_8px_8px] rounded-2xl
//   shadow-[0_0_0_100px_var(--cds-text-primary)]", style `{top: calc(50px + var(--app-top-offset, 0px)),
//   clipPath: "inset(-50px -100px -100px)", zIndex: V(20), ...au}` (au = shared-7 GP `{opacity: 1}`); the header label
//   and $g are Jy's web branch (`e && !p`), which the desktop top bar replaces.
// Every class is in the loaded c6a992d55 sheet. Host differences (registered in the lane report): the frame and the
// header have no framer-motion exit fade (the host has no motion library; the enter animation is the CSS class), Fy's
// WCO spacers (Windows) and its Mac context-menu guard are not drawn, and the layering is unverified in a GUI (E61).
import React, { useSyncExternalStore } from "react";
import { CdsButton, CdsRoot, CdsTooltip, cdsClassNames } from "./generated/view-tabs/index.js";
import { t } from "../electron/i18n/index.mjs";

// VA's top bar row while incognito on a Mac (O = 48) and vA() with fizzy-lake panels off (gc() false → 48).
export const INCOGNITO_TOP_BAR_ROW = "48px";
export const INCOGNITO_MAIN_PADDING = "calc(48px - var(--desktop-top-bar-row-height, 0px)) 8px 8px";
export const INCOGNITO_FRAME_CLASS =
  "animate-incognito-frame-in pointer-events-none fixed inset-[50px_8px_8px_8px] rounded-2xl shadow-[0_0_0_100px_var(--cds-text-primary)]";
// VA's content div while incognito (g = vK false, u = fizzy-lake panels false → yA(true)).
export const INCOGNITO_CONTENT_CLASS =
  "flex min-h-0 min-w-0 w-full overflow-x-clip relative overflow-y-auto [scrollbar-gutter:stable] print:!overflow-visible";
// LA's main-content (`o("w-full relative min-w-0 h-full print:!h-auto", h)`, h false: Mo() is true).
export const INCOGNITO_MAIN_CLASS = "w-full relative min-w-0 h-full print:!h-auto";

// shared-78 vK for the host: the frame shell (sidebar included) is mounted unless the window is incognito. The host
// window is never in an iframe and has no computer-use takeover store (dK(yK)), so only isIncognito decides.
export const frameShellMounted = ({ isIncognito }) => !isIncognito;

// Qg's `u = E()`: the resolved light / dark the host writes to html[data-mode] (theme-command-model writeThemeMode).
const readMode = () => (typeof document !== "undefined" && document.documentElement.dataset.mode === "dark" ? "dark" : "light");
function subscribeMode(callback) {
  if (typeof MutationObserver !== "function" || typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
}
export const useResolvedMode = () => useSyncExternalStore(subscribeMode, readMode, () => "light");
// Qg `b = t ? d : u`.
export const incognitoToggleMode = (enabled, resolved) => (enabled ? (resolved === "dark" ? "light" : "dark") : resolved);

// shared-20 xy through Ud (shared-16 Zf returns `today` while the GhostFilled master is empty) and shared-52 Kf
// (size 20: a 20×20 flex box around the svg).
export function SourceIncognitoGhostIcon({ className }) {
  return (
    <div className={cdsClassNames("group", className)} style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={20} height={20} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} className={cdsClassNames("group", className)} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M10 2C14.4183 2 18 5.58172 18 10V17.333C18 17.6404 17.7899 17.9087 17.4912 17.9814C17.1925 18.0539 16.8824 17.9125 16.7412 17.6396C16.4654 17.1046 16.2278 16.6907 15.9443 16.4053C15.6891 16.1486 15.4011 16.0001 14.9775 16C14.3 16.0002 13.5743 16.4876 13.1016 17.5947C12.9967 17.8403 12.7553 18 12.4883 18C12.2214 17.9998 11.9798 17.8402 11.875 17.5947C11.4021 16.4874 10.6776 16 10 16C9.32238 16 8.59794 16.4874 8.125 17.5947C8.02021 17.8402 7.77857 17.9998 7.51172 18C7.24472 18 7.0033 17.8403 6.89844 17.5947C6.42567 16.4876 5.70001 16.0002 5.02246 16C4.59894 16.0001 4.31088 16.1486 4.05566 16.4053C3.7722 16.6907 3.53456 17.1046 3.25879 17.6396C3.11763 17.9125 2.80745 18.0539 2.50879 17.9814C2.21014 17.9087 2 17.6404 2 17.333V10C2 5.58172 5.58172 2 10 2ZM7 8.66699C6.44772 8.66699 6 9.11471 6 9.66699C6.00021 10.2191 6.44785 10.667 7 10.667C7.55215 10.667 7.99979 10.2191 8 9.66699C8 9.11471 7.55228 8.66699 7 8.66699ZM13 8.66699C12.4477 8.66699 12 9.11471 12 9.66699C12.0002 10.2191 12.4478 10.667 13 10.667C13.5522 10.667 13.9998 10.2191 14 9.66699C14 9.11471 13.5523 8.66699 13 8.66699Z" />
        <path className="group-hover:animate-[icon-ghost-blink_4s_ease-in-out_infinite] opacity-0" fillRule="evenodd" clipRule="evenodd" d="M10 2C14.4183 2 18 5.58172 18 10V17.333C18 17.6404 17.7899 17.9087 17.4912 17.9814C17.1925 18.0539 16.8824 17.9125 16.7412 17.6396C16.4654 17.1046 16.2278 16.6907 15.9443 16.4053C15.6891 16.1486 15.4011 16.0001 14.9775 16C14.3 16.0002 13.5743 16.4876 13.1016 17.5947C12.9967 17.8403 12.7553 18 12.4883 18C12.2214 17.9998 11.9798 17.8402 11.875 17.5947C11.4021 16.4874 10.6776 16 10 16C9.32238 16 8.59794 16.4874 8.125 17.5947C8.02021 17.8402 7.77857 17.9998 7.51172 18C7.24472 18 7.0033 17.8403 6.89844 17.5947C6.42567 16.4876 5.70001 16.0002 5.02246 16C4.59894 16.0001 4.31088 16.1486 4.05566 16.4053C3.7722 16.6907 3.53456 17.1046 3.25879 17.6396C3.11763 17.9125 2.80745 18.0539 2.50879 17.9814C2.21014 17.9087 2 17.6404 2 17.333V10C2 5.58172 5.58172 2 10 2Z" />
      </svg>
    </div>
  );
}

// shared-20 Qg while enabled (the only state the incognito top bar draws): the ghost X in its tooltip, inside the
// inverted CdsRoot. `mode` overrides the resolved mode (SSR tests).
export function SourceExitIncognito({ onToggle, shortcut = "cmd+shift+i", tooltipSide = "left", className, size, mode }) {
  const resolved = useResolvedMode();
  const label = t("Exit incognito");
  return (
    <CdsRoot mode={incognitoToggleMode(true, mode ?? resolved)} className="contents">
      <CdsTooltip hoverable={false} side={tooltipSide} shortcut={shortcut} content={label}>
        <CdsButton variant="ghost" iconOnly size={size} icon="X" tooltip={false} className={cdsClassNames("group", className)} aria-label={label} onClick={onToggle} />
      </CdsTooltip>
    </CdsRoot>
  );
}

// shared-20 Fy with `T` (incognitoModeEnabled) on a Mac, replacesFrameHeader true: traffic-light spacer, the
// incognito label in the middle, Iy (Qg) first in the trailing slot. Ry (the activity panel toggle) is the agent
// route's and Chat has none.
export function SourceIncognitoTopBar({ onExit, trafficLights = false, mode }) {
  return (
    <div className="flex items-center draggable px-2" style={{ zIndex: 30 }}>
      <div className="flex-1 flex items-center gap-1">{trafficLights && <div className="w-[69px] shrink-0" />}</div>
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-bg-000">
          <SourceIncognitoGhostIcon />
          <span className="text-sm select-none">{t("Incognito chat")}</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-end">
        <SourceExitIncognito onToggle={onExit} tooltipSide="left" className="draggable-none" mode={mode} />
      </div>
    </div>
  );
}

// shared-20 Jy on a desktop top bar: the frame alone.
export function SourceIncognitoFrame() {
  return (
    <div data-testid="incognito-frame" className={INCOGNITO_FRAME_CLASS}
      style={{ top: "calc(50px + var(--app-top-offset, 0px))", clipPath: "inset(-50px -100px -100px)", zIndex: 20, opacity: 1 }} />
  );
}

// VA + LA around the host's workspace. While `active` is false every wrapper is `display: contents` with no style, so
// the workspace lays out in the frame root exactly as before, and the element tree (and the workspace's state) stays
// the same when incognito turns on or off: only classes and styles change, the top bar and the frame fill fixed slots.
export function SourceIncognitoShell({ active, onExit, trafficLights, children }) {
  return (
    <div className={active ? "grid w-full overflow-hidden" : "contents"}
      style={active ? { height: "100%", gridTemplateRows: `${INCOGNITO_TOP_BAR_ROW} 1fr`, "--desktop-top-bar-row-height": INCOGNITO_TOP_BAR_ROW } : undefined}>
      {active ? <SourceIncognitoTopBar onExit={onExit} trafficLights={trafficLights} /> : null}
      <div className={active ? INCOGNITO_CONTENT_CLASS : "contents"}>
        <div className={active ? INCOGNITO_MAIN_CLASS : "contents"} style={active ? { padding: INCOGNITO_MAIN_PADDING } : undefined}>
          {children}
        </div>
        {active ? <SourceIncognitoFrame /> : null}
      </div>
    </div>
  );
}
