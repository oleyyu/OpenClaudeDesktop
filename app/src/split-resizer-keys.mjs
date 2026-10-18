// Split view separators, Claude Desktop 2.42304.0 shared-23-Bu_lvvVo.js:
//  - j2 `w` (columns) / N2 `C` (rows): Home / End move the boundary to its far end — Home is -1, End +1, times the host's
//    width or height — as start, resize, end(true) (`r = e.key === "Home" ? -1 : +(e.key === "End")`). ⌘ / ⌃ / ⌥ held,
//    another key, no host, or a pointer drag running on the same host (`(D2.get(host)?.size ?? 0) > 0`, the registry
//    split-drag-registry.mjs extracts) leave the key alone. N2 also needs the row to be movable (`!o`), checked by the row.
//  - j2 `_` / P2: a column drag reads the host document's direction once at its start
//    (`ownerDocument.documentElement.dir === "rtl"`); in RTL the pointer (and arrow-key) delta is mirrored.
//  - N2 `s = i === 0 ? void 0 : b2(i, o)`: the row separator's aria-valuemin / aria-valuemax.
import { splitPointerDrags } from "./generated/code-current/split-drag-registry.mjs";
import { rowBounds } from "./split-view-model.mjs";

/** -1 (Home), 1 (End) or 0 when the key does nothing on a separator of `host`. */
export function splitKeyDelta(event, host) {
  if (event.metaKey || event.ctrlKey || event.altKey || !host) return 0;
  const sign = event.key === "Home" ? -1 : +(event.key === "End");
  return sign === 0 || (splitPointerDrags.get(host)?.size ?? 0) > 0 ? 0 : sign;
}

/** j2 `p.current` / P2 `x`: whether a drag on `host` runs right to left. */
export function splitDragRtl(host) {
  return host?.ownerDocument?.documentElement?.dir === "rtl";
}

/** b2: the row split's bounds in percent for a host `height` tall; a movable row whose bounds meet widens them by one. */
export function rowValueRange(height, movable) {
  const bounds = rowBounds(height), min = Math.round(100 * bounds.min), max = Math.round(100 * bounds.max);
  return movable && min === max ? { min: min - 1, max: max + 1 } : { min, max };
}
