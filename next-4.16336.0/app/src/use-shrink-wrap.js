import { useCallback, useRef } from "react";
import { attachShrinkWrap, restoreShrinkWrap } from "./shrink-wrap.mjs";

/** Callback ref: attaches measurement to the mounted node, cleans the previous
 * node on change, and restores author styles when disabled. */
export function useShrinkWrap({ enabled = true, immediate = false } = {}) {
  const cleanup = useRef(null);
  return useCallback(node => {
    cleanup.current?.(); cleanup.current = null;
    if (!node) return;
    if (!enabled) { restoreShrinkWrap(node); return; }
    cleanup.current = attachShrinkWrap(node, { immediate });
  }, [enabled, immediate]);
}
