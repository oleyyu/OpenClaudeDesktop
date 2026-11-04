// W14-code r4 r4pa-c03 (E90 / E95, needs the user's GUI check): a pane popped out into its own window fills that window
// and its header shares the title row with the traffic lights, as 3.6556.2 does:
//   - c3af3d0ed S wraps the window in `div.dframe-root` with cd377abb5 lr's containerProps (`{"data-popout": y, style:
//     {"--df-popout-zoom-out": Math.min(zoomFactor, 1), …, isolation: "isolate"}}`, y = "traffic-lights" on macOS);
//   - c5638815a Ct's pane window root is `epitaxy-root … epitaxy-pane-window flex h-full w-full select-none flex-col
//     bg-surface-1` and wt renders the pane itself with `isTopLeft: !0`, so its header (c4db265df N_) carries
//     `data-top-left` and the window-drag strip `div.draggable.absolute.inset-0.-z-[1]`;
//   - shared-styles `.dframe-root[data-popout=traffic-lights] .epitaxy-pane-window [data-top-left]{margin-left:calc(
//     var(--df-popout-lights-room) + 8px)}` (lights room `calc(68px / var(--df-popout-zoom-out,1))`) clears the lights.
// The host's pane headers are its own components (Files / Changes / Plan, Tasks, Terminal), so the window says it is a
// pane window through this context and each header asks for the two official pieces. Off (the main window's tiles,
// or the rollback switch below closed) they render nothing extra.
import React, { createContext, useContext } from "react";
import { hostGrowthBookFlag } from "./host-growthbook.mjs";
import { TILE_CONFIG } from "./tile-layout-model.mjs";

// The rollback switch (a host entry, not a GrowthBook flag): closed, the pane windows keep the old 36px drag band and
// 8px inset (source-session.css `:not([data-popout])` rules) and their headers stay as they are in a tile.
export const POPOUT_TRAFFIC_LIGHTS_SWITCH = "local_popout_traffic_lights";
export function popoutTrafficLightsEnabled() {
  return hostGrowthBookFlag(POPOUT_TRAFFIC_LIGHTS_SWITCH);
}
// cd377abb5 lr: the frame root's popout props for a window whose traffic lights sit over the content (macOS, not full
// screen); none otherwise.
export function popoutFrameProps({ enabled = popoutTrafficLightsEnabled(), zoomFactor = 1, trafficLights = true } = {}) {
  if (!enabled || !trafficLights) return null;
  return { "data-popout": "traffic-lights", style: { "--df-popout-zoom-out": Math.min(Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1, 1), isolation: "isolate" } };
}

// c5638815a wt renders the pane straight into the window (no tile container), so the window's one tile has no
// container padding: it fills the window.
export const PANE_WINDOW_TILE_CONFIG = Object.freeze({ ...TILE_CONFIG, padding: 0 });

export const PaneWindowContext = createContext(false);

// c5638815a wt `isTopLeft: !0` → c4db265df N_ `"data-top-left": leadingClearance || void 0`.
export function usePaneWindowHeaderProps() {
  return useContext(PaneWindowContext) ? PANE_WINDOW_HEADER_PROPS : null;
}
const PANE_WINDOW_HEADER_PROPS = Object.freeze({ "data-top-left": "" });

// c4db265df N_ `!noWindowDrag && t("div", {className: "draggable absolute inset-0 -z-[1]", "aria-hidden": !0})`: the
// header drags the window (c6a992d55 `:where(a,button,input,…),.draggable-none{app-region:no-drag}` keeps its controls
// live).
export function PaneWindowDragStrip() {
  return useContext(PaneWindowContext) ? <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" /> : null;
}
