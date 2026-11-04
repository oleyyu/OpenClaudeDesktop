// Shared with the main process preference validator; see electron/transcript-view-model.mjs.
export * from "../electron/transcript-view-model.mjs";
import { TRANSCRIPT_VIEWS, DEFAULT_TRANSCRIPT_VIEW, effectiveView, isTranscriptView } from "../electron/transcript-view-model.mjs";

/** cycleTranscriptMode ctrl+o (shared-21-D098Wd--.js:14189; code-workspace.js:2273-2280 _e): qa
 * (panes-state-current.js:584 Dt: normal, thinking, verbose) filtered to the views that survive Xa
 * for this session (Thinking needs reasoning), then the one after the effective current view. */
export function nextTranscriptView(current, { hasThinking = false } = {}) {
  const views = TRANSCRIPT_VIEWS.filter((view) => effectiveView(view, undefined, { hasThinking }) === view);
  const at = views.indexOf(effectiveView(current, undefined, { hasThinking }));
  return views[(at + 1) % views.length];
}

// W14-code r3 r3-composer-04: the default-view nudge (cc43287c9 xV / SV / wV / TV / EV / kV / AV / OV / DV). localStorage
// `epitaxy-default-transcript-view-nudge` maps a view to the hash of the first session it was picked in (a string) or to
// true once the nudge was shown. Picking the same non-default view in a second session makes the nudge due; the keyboard
// cycle (ctrl+o) waits SV = 1500ms (AV = ht(kV, SV)) so passing through a view does not count.
export const VIEW_NUDGE_STORAGE_KEY = "epitaxy-default-transcript-view-nudge";
export const VIEW_NUDGE_DELAY = 1500;
/** shared-0 wE (cc43287c9 Mn): FNV-1a over the session id, `t >>> 0`; kV records `Mn(t).toString(16)`. */
export function sessionViewHash(sessionId) {
  let hash = 2166136261;
  const text = String(sessionId);
  for (let index = 0; index < text.length; index++) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16);
}
/** wV: only view keys (TT = c03935b01 Ln) whose value is true or a string. */
export function normalizeViewNudges(value) {
  if (typeof value !== "object" || !value) return {};
  return Object.fromEntries(Object.entries(value).filter(([view, entry]) => isTranscriptView(view) && (entry === true || typeof entry === "string")));
}
/** TV: already nudged (true) or the same session → not due; unseen → record the session; another session → due. */
export function recordViewPick(map, view, hash) {
  const entry = map[view];
  if (entry === true || entry === hash) return { next: map, due: false };
  if (entry === undefined) return { next: { ...map, [view]: hash }, due: false };
  return { next: map, due: true };
}
/** EV: the view's nudge was shown, so it never shows again. */
export function markViewNudged(map, view) {
  return map[view] === true ? map : { ...map, [view]: true };
}
export function readViewNudges(storage, key = VIEW_NUDGE_STORAGE_KEY) {
  try { return normalizeViewNudges(JSON.parse(storage.getItem(key) ?? "null")); } catch { return {}; }
}
export function writeViewNudges(storage, map, key = VIEW_NUDGE_STORAGE_KEY) {
  try { storage.setItem(key, JSON.stringify(map)); return true; } catch { return false; }
}
/** kV: only for the open session, while it still shows `view`, and when `view` is not the default. */
export function viewNudgeApplies({ view, sessionId, currentSessionId, shownView, defaultView }) {
  const resolvedDefault = isTranscriptView(defaultView) ? defaultView : DEFAULT_TRANSCRIPT_VIEW;
  return isTranscriptView(view) && !!sessionId && currentSessionId === sessionId && shownView === view && view !== resolvedDefault;
}
