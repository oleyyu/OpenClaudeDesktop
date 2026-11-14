// CDS InfoTip (2.31226.0 shared-frame-DVFSKIcx.js pw, readable
// analysis/code-ui-sync-20261013/readable/shared-frame-DVFSKIcx.js.readable.js:13467-13521): a Popover whose Trigger has
// openOnHover (delay 300) — hovering opens it, a click opens it to stay (Base UI stickIfOpen: a click on a
// hover-opened popover keeps it open), a second click, Escape or an outside press closes it.
export const INFOTIP_DEFAULTS = Object.freeze({ side: "top", align: "center", sideOffset: 6, delay: 300 });
// Base UI's safePolygon lets the pointer cross the 6px gap into the popup; locally a short close delay that the
// popup's own pointerenter cancels.
export const INFOTIP_HOVER_CLOSE_MS = 100;

/** How the tip is open: null (closed), "hover" (follows the pointer) or "click" (stays until dismissed). */
export function infoTipNext(state, event) {
  switch (event) {
    case "hover-open": return state ?? "hover";
    case "hover-leave": return state === "hover" ? null : state;
    case "click": return state === "click" ? null : "click";
    case "dismiss": return null;
    default: return state ?? null;
  }
}
