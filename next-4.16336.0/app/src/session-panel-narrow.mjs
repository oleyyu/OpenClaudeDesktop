// U-05: the session body's narrow mode for the side panels beside a Chat / Cowork conversation (the activity panel,
// the Chat artifact panel). 4.16336.0 shared-6 Cg (export `to`, c21f11e6d Sf(q, pe, …) with pe the session body's
// containerRef): a ResizeObserver on the body, `setIsViewportNarrow(width < 768)`; while narrow the panel is not in
// the flow (ng → false) and the panel toggle flips `isOverlayOpen` instead; leaving narrow closes the overlay
// (setIsViewportNarrow: `n ? {} : { isOverlayOpen: false }`). Without a body, the (min-width: 768px) media query.
import { useCallback, useLayoutEffect, useState } from "react";

export const NARROW_SESSION_BODY = 768;

export const isNarrowSessionBody = (width) => Number.isFinite(width) && width < NARROW_SESSION_BODY;

/** { ref, narrow, overlayOpen, setOverlayOpen }: `ref` is a callback ref for the session body row. */
export function useNarrowSessionBody() {
  const [node, setNode] = useState(null);
  const [narrow, setNarrowState] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const setNarrow = useCallback((value) => {
    setNarrowState(value);
    if (!value) setOverlayOpen(false);
  }, []);
  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!node) {
      const query = window.matchMedia(`(min-width: ${NARROW_SESSION_BODY}px)`);
      const update = () => setNarrow(!query.matches);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }
    setNarrow(isNarrowSessionBody(node.clientWidth));
    const observer = new ResizeObserver((entries) => setNarrow(isNarrowSessionBody(entries[0]?.contentRect.width ?? node.clientWidth)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, setNarrow]);
  return { ref: setNode, narrow, overlayOpen, setOverlayOpen };
}
