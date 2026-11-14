// Host of the Code titlebar frame sliced from Claude Desktop 4.16336.0 (scripts/extract-titlebar-frame-v4.mjs,
// generated/titlebar-frame): shared-20 o_ (TitlebarFrame, official export Uc: the comfortable CdsRoot + panels scope OS around
// the epitaxy-titlebar row s_ and the cds-core CdsToolbar), shared-20 Rg (the lifted-hidden Context), shared-20 Ug (the
// titlebar text variables), shared-120 qe (the panels scope over cds-core Ke) and shared-38 fn / En (RX's lead wrapper
// classes). The frame's host boundary (shared-0 FH useIsDesktopApp; shared-92 Y frameStore is linked from cds-core
// store_shared92_Y since SB-0) is frame-sidebar's own:
// the generated src/titlebar-frame-adapter.mjs re-exports frame-sidebar-adapter.mjs's dispatcher, answered by
// src/frame-sidebar-host.jsx's table, so there is no second host table here. s_ calls shared-18 WS on every render, so
// useIsDesktopApp is reached as soon as a frame renders: this module loads frame-sidebar-host.jsx (which installs that table)
// itself. (frame-sidebar-host.jsx imports source-titlebar.jsx, which imports this module: the cycle only meets at render
// time, as frame-sidebar-host.jsx ↔ source-sidebar.jsx already does.)
//
// cc43287c9 RX (not sliced: its closure is the whole Code session view) is what src/source-titlebar.jsx assembles over the
// host state: `p(xp, {lifted: F, label: "Session tools", barRef, sectionsRef, startScreen: !t && !o, paneAtEnd: !1,
// staticTitle, lead: div[data-pills-compact].group/lead relative z-[1] ${fn} ${En} draggable-none, grip, cluster: Ee(_m =
// CdsTooltipProvider)[…], seeThrough, data-top-left, data-top-right, ...on("header"), style: {...Ug, "--titlebar-pill-max"}})`.
import "./frame-sidebar-host.jsx";
import "./titlebar-frame-adapter.mjs";
export { TitlebarFrame, TitlebarLiftedHiddenContext, titlebarTextVars } from "./generated/titlebar-frame/titlebar-frame.mjs";
export { useTitlebarPanelsScope } from "./generated/titlebar-frame/panels-scope.mjs";
export { titlebarLeadRowClass, titlebarLeadClipClass } from "./generated/titlebar-frame/titlebar-classes.mjs";
// The session lead's panels-scope classes (read where shared-120 qe is true, i.e. inside the frame): shared-38 gn (c73f45bc3 Qb
// `bi`, the rail-mode no-origin box), shared-18 Iw (cc43287c9 FX `bleed: w ? Pd : void 0`, c9543da06 pp's {pad, style}) and
// shared-18 Bw (FX `className: w ? Df : jf`, the title + caret group).
export { titlebarLeadNoOriginPanelsClass } from "./generated/titlebar-frame/titlebar-classes.mjs";
export { titleBleedPanels, titleGroupPanelsClass } from "./generated/titlebar-frame/titlebar-density.mjs";
// shared-0 uv (on, official export yb; frame-sidebar's slice): RX's `...on("header")`, the perf-region marker of the row.
export { uv as perfRegion } from "./generated/frame-sidebar/shared-0.mjs";

// RX's lead wrapper class (`group/lead relative z-[1] ${oy} ${py} draggable-none`, oy = shared-38 fn, py = shared-38 En).
import { titlebarLeadRowClass, titlebarLeadClipClass } from "./generated/titlebar-frame/titlebar-classes.mjs";
export const TITLEBAR_LEAD_CLASS = `group/lead relative z-[1] ${titlebarLeadRowClass} ${titlebarLeadClipClass} draggable-none`;
