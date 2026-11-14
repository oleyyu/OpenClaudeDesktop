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
// header have no framer-motion exit fade (the host has no motion library; the enter animation is the CSS class). Since
// 4.16336.0 the top bar row (Fy's successor Xw, its Mac context-menu guard MU and its WCO spacers included) is sliced;
// the frame below (4.16336.0 lT: motion, fizzy-lake shadow token) and this grid stay host code (chat-header report).
import React from "react";
// chat-header 4.16336.0 (surfaces wave 2): the top bar row is the sliced shared-20 Yw → Xw with Zw → Ix (the Exit
// incognito X in its inverted CdsRoot / CdsTooltip, the ghost GhostFilled label icon, the traffic-light spacer from
// frame-sidebar's linked useWindowChrome), generated/chat-header through chat-header-host.jsx. The hand port of Fy / Qg /
// xy that stood here (SourceIncognitoTopBar, SourceExitIncognito, SourceIncognitoGhostIcon) is gone.
import { ChatDesktopTopBar } from "./chat-header-host.jsx";

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
// `pathname` is the host route the top bar's selectors read ("/new" on the incognito New chat page, "/chat/<id>" in an
// incognito chat); `onExit` leaves incognito (Zw's setIncognitoModeEnabled(false)).
export function SourceIncognitoShell({ active, onExit, pathname, children }) {
  return (
    <div className={active ? "grid w-full overflow-hidden" : "contents"}
      style={active ? { height: "100%", gridTemplateRows: `${INCOGNITO_TOP_BAR_ROW} 1fr`, "--desktop-top-bar-row-height": INCOGNITO_TOP_BAR_ROW } : undefined}>
      {active ? <ChatDesktopTopBar incognito onToggleIncognito={onExit} pathname={pathname} /> : null}
      <div className={active ? INCOGNITO_CONTENT_CLASS : "contents"}>
        <div className={active ? INCOGNITO_MAIN_CLASS : "contents"} style={active ? { padding: INCOGNITO_MAIN_PADDING } : undefined}>
          {children}
        </div>
        {active ? <SourceIncognitoFrame /> : null}
      </div>
    </div>
  );
}
