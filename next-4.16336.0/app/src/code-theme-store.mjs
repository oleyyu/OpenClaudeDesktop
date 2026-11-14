import { useSyncExternalStore } from "react";
import { normalizeCodeThemes } from "./code-theme-catalog.mjs";

// Renderer-wide selected code theme pair (official epitaxy-editor-prefs
// codeThemeLight/codeThemeDark). The settled highlight hook reads it so a
// change re-requests tokens under a new cache key; the preference itself is
// persisted by the main process, never here.
let current = normalizeCodeThemes();
const listeners = new Set();
export function getCodeThemes() { return current; }
export function setCodeThemes(pair) {
  const next = normalizeCodeThemes(pair);
  if (next.light === current.light && next.dark === current.dark) return current;
  current = next;
  for (const listener of [...listeners]) listener(current);
  return current;
}
export function subscribeCodeThemes(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function useCodeThemes() {
  return useSyncExternalStore(subscribeCodeThemes, getCodeThemes, getCodeThemes);
}
