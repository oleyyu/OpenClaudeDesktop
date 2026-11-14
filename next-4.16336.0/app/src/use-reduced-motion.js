import { useSyncExternalStore } from "react";

// Live reduced-motion store (shared-frame Zu/Ju, Uu :4960-4968): the OS media
// query plus the app's own Settings switch, which main.jsx writes as
// html[data-reduce-motion="true"] (alias html[data-local-motion="reduce"]) and
// announces via "local-motion-change".
// Subscribers react to both sources at runtime; nothing is read only once.
const QUERY = "(prefers-reduced-motion: reduce)";

export function readReducedMotion() {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const media = typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
  const root = document.documentElement;
  return Boolean(media?.matches) || root.dataset.reduceMotion === "true" || root.dataset.localMotion === "reduce";
}

function subscribe(listener) {
  const media = typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null;
  media?.addEventListener("change", listener);
  window.addEventListener("local-motion-change", listener);
  return () => {
    media?.removeEventListener("change", listener);
    window.removeEventListener("local-motion-change", listener);
  };
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribe, readReducedMotion, () => false);
}
