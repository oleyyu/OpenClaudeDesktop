// 4.16336.0 Code landing (cc43287c9, the new-session page while `un = landing && kb({face, inSplitWindow})`): the row
// that holds the start card and the dock column is shared-18 lw plus shared-38 nr — it scrolls (hidden scrollbar, the
// scroll fade once it overflows) — while the dock column stays shrink-0, so a tall composer (attachments, many lines,
// suggestion chips) is scrolled to instead of being pushed out of a small window. Zke marks the row
// data-landing-overflows when the column's bottom passes the row's height.
import { useCallback } from "react";

export const LANDING_OVERFLOWS_ATTR = "data-landing-overflows";
// shared-18 lw ("relative flex min-h-0 flex-1 flex-col") is .conversation's own flex; `relative` makes the row the
// column's offsetParent for Zke's measure. shared-38 nr verbatim:
export const LANDING_SCROLL_CLASS = "relative overflow-x-hidden overflow-y-auto u-hidden-scrollbar scroll-py-(--cds-scroll-fade-size) data-[landing-overflows]:scroll-fade-y";

/** Zke's measure: the column's bottom (its height plus the offsets up to the row) against the row's client height. */
export function landingOverflows(column, row) {
  if (!column || !row) return false;
  let bottom = column.offsetHeight ?? 0;
  for (let node = column; node && node !== row; node = node.offsetParent) bottom += node.offsetTop ?? 0;
  return bottom > row.clientHeight + 2;
}

/** A ref for the dock column: while `enabled` (the Code landing), Zke's ResizeObserver over the row, its children
 * and the column keeps data-landing-overflows on the row (the column's parent). */
export function useLandingOverflow(enabled) {
  return useCallback((column) => {
    const row = column?.parentElement;
    const view = column?.ownerDocument?.defaultView;
    if (!enabled || !row || !view || !("ResizeObserver" in view)) return undefined;
    const observer = new view.ResizeObserver(() => row.toggleAttribute(LANDING_OVERFLOWS_ATTR, landingOverflows(column, row)));
    for (const node of [row, ...row.children, column]) observer.observe(node);
    return () => { observer.disconnect(); row.removeAttribute(LANDING_OVERFLOWS_ATTR); };
  }, [enabled]);
}
