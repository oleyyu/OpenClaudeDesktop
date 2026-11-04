// Sidebar width model (pure). shared-2-C6aD8DvJ.js Km {MIN:200,
// MAX:420, DEFAULT:288}, qm clamp and Xm (innerWidth - 330 content floor,
// clamped); exported as lm/dm/gm (sidebar-groups.js imports lm/gm as Po/Do).
// (W14-code r5 cleanup R5DC-05: the test-only HL drag threshold DRAG_THRESHOLD is
// gone; the sidebar row drag reads its own DRAG_THRESHOLD from sidebar-drag-model.)
export const SIDEBAR_WIDTH = Object.freeze({ MIN: 200, MAX: 420, DEFAULT: 288 });

export const clampSidebarWidth = (width) => Math.min(SIDEBAR_WIDTH.MAX, Math.max(SIDEBAR_WIDTH.MIN, width));
// shared-2 $m: a stored number is clamped with qm, anything else is DEFAULT.
export const storedSidebarWidth = (value) => typeof value === "number" && Number.isFinite(value) ? clampSidebarWidth(value) : SIDEBAR_WIDTH.DEFAULT;

// shared-22-Cz3C_T8d.js:13945-13959 wL: the sidebar floor is qm(max(chrome
// widths)); sidebar-main.js:14721-14733 feeds it to setSidebarFloor and to
// uw as minWidth (:14902), and shared-2 Qg renders max(sidebarWidth, floor).
// Locally the chrome is the sidebar toolbar row at max-content plus the
// aside border.
export const sidebarFloorWidth = (chromeWidth) => clampSidebarWidth(Math.ceil(Number.isFinite(chromeWidth) ? chromeWidth : 0));
export const effectiveSidebarWidth = (width, floor = SIDEBAR_WIDTH.MIN) => Math.max(width, floor);

// titlebar-shared-21.js:1339-1365 _v (gv = 74): outside full screen the
// traffic-light spacer is round(74 / min(zoomFactor, 1)) CSS px, so zoomed
// out it still spans 74 device-independent px while the native lights move
// toward the corner; zoomed in it stays 74px and scales with the content.
// sidebar-main.js:15392 publishes it as --df-traffic-light-spacer.
export const TRAFFIC_LIGHT_SPACER = 74;
export function trafficLightSpacerWidth(zoomFactor = 1) {
  const factor = Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1;
  return Math.round(TRAFFIC_LIGHT_SPACER / Math.min(factor, 1));
}

// Narrow viewport. shared-2-C6aD8DvJ.js Jm(e) = Math.max(700, Math.ceil(e) + 330 - 1) and
// Ym(e) = `(max-width: ${Jm(e)}px)` (exported as hm/mm, sidebar-main.js vl/sl). The frame watches
// Ym(rendered sidebar width) (sidebar-main.js:15367-15372 d = Se(sl(r)) -> setIsNarrowViewport) and
// the store treats a narrow viewport as collapsed without writing the collapsed preference (shared-2
// Dg: isCuDocked || isNarrowViewport; toggleCollapsed then opens/closes the peek instead). cR
// (:15161-15175) reports the same bound to the boot placeholder (asar index.chunk-ChZ67Jhw.js:
// collapsed = frame.collapsed || width/scale <= narrowViewportMaxWidth).
export const NARROW_VIEWPORT_MIN_WIDTH = 700;
export function narrowViewportMaxWidth(sidebarWidth) {
  const width = Number.isFinite(sidebarWidth) ? sidebarWidth : SIDEBAR_WIDTH.DEFAULT;
  return Math.max(NARROW_VIEWPORT_MIN_WIDTH, Math.ceil(width) + 330 - 1);
}
export const narrowViewportQuery = (sidebarWidth) => `(max-width: ${narrowViewportMaxWidth(sidebarWidth)}px)`;
