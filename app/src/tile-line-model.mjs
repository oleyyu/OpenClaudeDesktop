// Code session tile line mode (4.16336.0): the right-hand pane container docked edge to edge, full height, with a 1px
// divider (official screenshot 02 "Background tasks"). surfaces-prod-3 session-page item 2; prep/plan.json
// item2_rightPanelContainer + mainSessionDecisions (the container is the Code tile layout, not the session rail).
//
// The original values come from the generated slices (scripts/extract-session-panels-v4.mjs → generated/session-panels-v4/
// tiles-line.mjs = shared-20-DUEo90UF.js h_ / l_ / fb, tiles-shell.mjs = c9543da06-DHwxxZai.js Os / ks / As / vs; f_ / p_
// from generated/cds-core/shared-20.mjs through src/cds-core.mjs).
// What this module does is the host side of the two official call sites the host's tile engine (source-tile-layout.jsx,
// the 2.2553.1-engine port) stands in for, written from their 4.16336.0 text:
//   cc43287c9 Eje: `Rt = Zf(!0)` (f_), `Zt = ht ? 0 : Rt.padding, Qt = Yt > 0 ? Zt + Yt : ht ? 0 : void 0,
//                  $t = {...Rt, paddingTop: 0, paddingEnd: Qt}` (the host has no dock reserve: Yt = 0), the tile style
//                  `_n = (e, t) => { let n = e.id === "chat"; return Cp(n && vt === void 0 ? 8 : 0, fm(e.id) ? 8 : 0,
//                  n && _t === void 0 ? 8 : 0, n ? "chat" : Wf(e.id), Re === "rtl", Le && !n && t.top ? pp : void 0) }`
//                  (vt / _t: the chat gutter end / start, tile-layout-model chatGutters; Le: the wide title row, which the
//                  host never raises: `Le = Fe ? Me : null`, Fe only set by the wide title row) and the wrapper style
//                  `yn = {...Cje, ...Hf()}` (p_: --tiles-border, --titlebar-end-inset).
//   c9543da06 Es:  `R = (e, t) => P ? {...v, left: v.left && e, right: v.right && t} : {...v, top: v.top && e, bottom:
//                  v.bottom && t}`, `z = e => R(ne === -1 || ne >= e, re <= e)` (ne / re: first / last shown child), root
//                  `atEdge: os` (all true).
//   c9543da06 Is:  `A = i.divider === "line" && !k.left, j = i.divider === "line" && !k.top`, the shell
//                  `className: f && line ? `${V} is-moving` : V, "data-after-line-x": A ? "" : void 0, "data-after-line-y":
//                  j ? "" : void 0, style: {...F, ...(A && ks), ...(j && As), ...(A && overflowMin && {minWidth:
//                  calc(w + Os)}), ...pe, ...me, ...C?.(t, k)}`.
// shared-20 f_ / p_ (with f_'s lazily built u_) are cds-core's since wave 7 (one copy of the u_ cache, D1): read through
// the cds-core facade under their publicNames.
import { writer_shared20_f_ as tilesSplitConfig, writer_shared20_p_ as tilesFrameVars } from "./cds-core.mjs";
import { tileShellStyle, isChatOrSessionTile, paneTileStandsOnPage } from "./generated/session-panels-v4/tiles-line.mjs";
import { TILE_REACH_BACK, TILE_AFTER_LINE_X_STYLE, TILE_AFTER_LINE_Y_STYLE } from "./generated/session-panels-v4/tiles-shell.mjs";

// Host pane ids → the official tile kinds shared-20 db is keyed by (tile-layout-model PANE_KINDS: "Official ids differ
// (file/diff/plan)"). Kinds the official table lacks stay unknown (fb → false: the pane ground).
const OFFICIAL_KIND = Object.freeze({ files: "file", changes: "diff" });
export const officialTileKind = (tileId) => OFFICIAL_KIND[tileId] ?? tileId;

export const ROOT_AT_EDGE = Object.freeze({ top: true, right: true, bottom: true, left: true });

// Eje $t over f_(!0): the host has no dock reserve, so the end padding is Rt.padding (0) or 0.
export function lineTileConfig() {
  const base = tilesSplitConfig(true);
  return Object.freeze({ ...base, paddingTop: 0, paddingEnd: base.padding });
}
export const isLineConfig = (config) => config?.divider === "line";

// Es z(r): a child keeps its parent's edges only along the cross axis and on the first / last shown child.
export function childAtEdge(parentAtEdge, direction, index, firstShown, lastShown) {
  const start = firstShown === -1 || firstShown >= index, end = lastShown <= index;
  return direction === "row"
    ? { ...parentAtEdge, left: parentAtEdge.left && start, right: parentAtEdge.right && end }
    : { ...parentAtEdge, top: parentAtEdge.top && start, bottom: parentAtEdge.bottom && end };
}

// Eje _n (Cp = h_, fm = l_, Wf = fb); `pp` (the wide title row) never applies in the host.
export function lineTileStyle(tileId, gutters, rtl = false) {
  const chat = tileId === "chat";
  return tileShellStyle(
    chat && gutters?.end === undefined ? 8 : 0,
    isChatOrSessionTile(tileId) ? 8 : 0,
    chat && gutters?.start === undefined ? 8 : 0,
    chat ? "chat" : paneTileStandsOnPage(officialTileKind(tileId)),
    rtl,
  );
}

// Is: the shell's line attributes and style parts (before the tile style, which the caller spreads last).
export function lineShell(config, atEdge, overflowMin) {
  const line = isLineConfig(config);
  const afterX = line && !atEdge.left, afterY = line && !atEdge.top;
  return {
    afterX, afterY,
    attrs: { "data-after-line-x": afterX ? "" : undefined, "data-after-line-y": afterY ? "" : undefined },
    style: {
      ...(afterX ? TILE_AFTER_LINE_X_STYLE : null),
      ...(afterY ? TILE_AFTER_LINE_Y_STYLE : null),
      ...(afterX && overflowMin ? { minWidth: `calc(${overflowMin.width}px + ${TILE_REACH_BACK})` } : null),
    },
  };
}

// Eje yn's Hf() part (the host's viewport stands where Eje's wrapper div is).
export const lineViewportVars = () => tilesFrameVars();

// cc43287c9 Hje, the official tile host around one tile's content (session-page relink SP-2, decision D-SP-2): the chat
// tile gets neither context (`if (b === "chat") …` returns before them); every other tile is wrapped in
// `p(sR, {value: !0, …})` (c4db265df ot, PaneInTileContext: the pane frame Tn draws its CdsPanel in a tile) and
// `p(lm, {value: Wf(b), …})` (shared-20 ub / xs, PaneStandsOnPageContext: fb over db, the pane stands on the page ground,
// which Tn turns into variant "uncontained"). Hje's other contexts keep their official defaults in the host: uR (Yt) is
// `S`, null when the tile host has no side-panel chrome (`a === null`, the host has none); vae (st, the row end) has no
// reader in the pane frame; yae (ht, the minimized owner) needs the official tile store (D-SP-1).
export function paneTileContexts(tileId) {
  if (tileId === "chat") return null;
  return { inTile: true, standsOnPage: paneTileStandsOnPage(officialTileKind(tileId)) };
}
