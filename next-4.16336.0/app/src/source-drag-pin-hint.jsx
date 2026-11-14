// w13-close-rail-regen (cwui-46, research/w13-coworkui.md §1.3; closeout surfaces-nav-01): the Pinned section's one-time
// drag-pin coachmark of Claude Desktop 3.6556.2. The original lives inside the Pinned section component (shared-22 aM,
// readable :12520-12776), which the host sidebar does not slice (its list is the host's own 2.42304.0 port), so this module
// renders aM's coachmark call as written over the generated pieces (scripts/extract-session-rail.mjs pins the call on the
// original bytes):
//
//   Ae && t === je && !Ne && o(j, { open: !0, onOpenChange: (e, t) => !e && t?.reason !== "outside-press" && ke(),
//     anchor: ze, side: gd("inline-end", oe), introDelay: .3, "aria-label": Me, showClose: !0,
//     children: f("div", { className: "flex flex-row items-start gap-sm min-w-[13rem]",
//       children: [o(L, { name: "Hand", size: "md", className: "shrink-0" }), o("p", { children: Me })] }) })
//
//   j   shared-frame Sj (CdsCoachmark, generated/session-rail/coachmark.mjs: cowork-scheduled's one copy)
//   L   shared-frame us (CdsIcon), oe = vendor-frame un (useDirection), gd = shared-28 $h (sidebar-resize physicalSide)
//   Me  W.formatMessage(rM.dragPinHint, { kind: G && t === "chat" ? "code" : t }) — rM is generated/session-rail/
//       pinned-section-messages.mjs; G (shared-78 cp, the hub look) is off here, so kind is the sidebar's kind
//   ze  the ref of the div around the Pinned heading (`o("div", { ref: ze, children: _t })`)
//   Ae  showDragPinHint, t === je the section's kind is the live mode (the sidebar shows only its own mode here),
//   Ne  the sidebar is hidden (shared-52 u_), ke markDragPinHintSeen
//
// The state is the sidebar store's (shared-52 :4191-4193, persisted unit ["seenDragPinHint"]):
//   maybeShowDragPinHint: seenDragPinHint || collapsed || docked / narrow || drilled down ? unchanged : showDragPinHint = true
//     — asked by a menu pin (shared-11 Nw `t || J.getState().maybeShowDragPinHint()`, shared-21 n0);
//   markDragPinHintSeen: seenDragPinHint = true, showDragPinHint = false — on the coachmark's close (not an outside press)
//     and on a drag pin (lW `t.type === "pin" && o?.()`, onFirstPin = HM / lP).
// seenDragPinHint persists in localStorage (the host has no zustand persist of the official sidebar store); the shown
// flag lives for the window, as the official one (not persisted).
import React, { useSyncExternalStore } from "react";
import { CdsIcon, useDirection } from "./generated/view-tabs/index.js";
import { CdsCoachmark } from "./generated/session-rail/coachmark.mjs";
import { pinnedSectionMessages } from "./generated/session-rail/pinned-section-messages.mjs";
import { physicalSide } from "./generated/sidebar-resize/logical-side.mjs";
import { useStartIntl } from "./source-code-start-adapters.jsx";

export const SEEN_DRAG_PIN_HINT_KEY = "openclaude.sidebar.seenDragPinHint";
const readSeen = () => { try { return globalThis.localStorage?.getItem(SEEN_DRAG_PIN_HINT_KEY) === "true"; } catch { return false; } };
const writeSeen = () => { try { globalThis.localStorage?.setItem(SEEN_DRAG_PIN_HINT_KEY, "true"); } catch {} };

let state = { seenDragPinHint: null, showDragPinHint: false };
const listeners = new Set();
const current = () => (state.seenDragPinHint === null ? (state = { ...state, seenDragPinHint: readSeen() }) : state);
const set = (next) => {
  if (next === state) return;
  state = next;
  for (const listener of [...listeners]) listener();
};
export const dragPinHintStore = Object.freeze({
  getState: current,
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  /**
   * shared-52 maybeShowDragPinHint: `e.seenDragPinHint || e.collapsed || Hg(e) || e.isRouteDrilldown ? e : {showDragPinHint:
   * !0}` with Hg(e) = `e.isCuDocked || e.isNarrowViewport` (w13-close-cowork-sidebar). The host sidebar's `collapsed` prop is
   * main.jsx effectiveCollapsed = `NO_SIDEBAR || collapsed || narrowViewport`, narrowViewport = `narrowMedia || cuDocked`
   * (shared-52 setIsNarrowViewport / setIsCuDocked), so it already carries Hg; the separate fields are taken as well.
   * isRouteDrilldown: only drawer routes set it (shared-52 m_ with a widthThresholdPx: c368fdb57 `route_drilldown`,
   * shared-2, shared-17); the host has none, so it stays false unless a caller passes it.
   */
  maybeShowDragPinHint({ collapsed = false, isCuDocked = false, isNarrowViewport = false, isRouteDrilldown = false } = {}) {
    const s = current();
    if (s.seenDragPinHint || collapsed || isCuDocked || isNarrowViewport || isRouteDrilldown) return;
    set({ ...s, showDragPinHint: true });
  },
  /** shared-52 markDragPinHintSeen. */
  markDragPinHintSeen() {
    const s = current();
    if (s.seenDragPinHint && !s.showDragPinHint) return;
    writeSeen();
    set({ seenDragPinHint: true, showDragPinHint: false });
  },
  /** Tests only: forget the in-memory state (the next read takes localStorage again). */
  reset() { set({ seenDragPinHint: null, showDragPinHint: false }); },
});
const showSelector = () => current().showDragPinHint;
export const useShowDragPinHint = () => useSyncExternalStore(dragPinHintStore.subscribe, showSelector, showSelector);

/**
 * aM's coachmark for the Pinned section of a `kind` ("code" | "chat" | "cowork") sidebar, anchored to `anchor` (the ref of
 * the element around the Pinned heading). `hidden`: the sidebar is not shown (shared-52 u_).
 */
export function DragPinHintCoachmark({ kind, anchor, hidden = false }) {
  const show = useShowDragPinHint();
  const direction = useDirection();
  const intl = useStartIntl();
  if (!show || hidden) return null;
  const hint = intl.formatMessage(pinnedSectionMessages.dragPinHint, { kind });
  return <CdsCoachmark open onOpenChange={(open, details) => !open && details?.reason !== "outside-press" && dragPinHintStore.markDragPinHintSeen()}
    anchor={anchor} side={physicalSide("inline-end", direction)} introDelay={0.3} aria-label={hint} showClose>
    <div className="flex flex-row items-start gap-sm min-w-[13rem]">
      <CdsIcon name="Hand" size="md" className="shrink-0" />
      <p>{hint}</p>
    </div>
  </CdsCoachmark>;
}
