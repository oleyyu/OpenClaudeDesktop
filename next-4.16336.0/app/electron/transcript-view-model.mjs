// Transcript view preference model (official c03935b01 Et/Dt/Ot, Ci/wi and the
// per-session transcriptModeBySession map). Pure; storage IO is injected.
export const TRANSCRIPT_VIEWS = Object.freeze(["normal", "thinking", "verbose"]);
export const DEFAULT_TRANSCRIPT_VIEW = "normal";
export const TRANSCRIPT_VIEW_LABELS = Object.freeze({ normal: "Normal", thinking: "Thinking", verbose: "Verbose" });
export const SESSION_VIEW_LIMIT = 100;
export const SESSION_VIEW_STORAGE_KEY = "code-desktop-transcript-view-by-session";

export function isTranscriptView(value) {
  return typeof value === "string" && TRANSCRIPT_VIEWS.includes(value);
}
/** Ci: thinking and verbose both render reasoning. */
export function showsThinking(view) {
  return view === "thinking" || view === "verbose";
}
/** wi: a Thinking view of a session without reasoning presents as Normal. */
export function effectiveView(sessionView, defaultView, { hasThinking = false } = {}) {
  const chosen = isTranscriptView(sessionView) ? sessionView : isTranscriptView(defaultView) ? defaultView : DEFAULT_TRANSCRIPT_VIEW;
  return chosen === "thinking" && !hasThinking ? "normal" : chosen;
}

/** Insertion-ordered map {sessionId: view}; undefined means "follow the default". */
export function normalizeSessionViews(value, limit = SESSION_VIEW_LIMIT) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value).filter(([id, view]) => typeof id === "string" && id !== "" && isTranscriptView(view));
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - limit)));
}
/** Official R(): drop the key, re-add it newest, then keep only the newest `limit` keys.
 * Choosing the current default (or undefined) removes the session's entry. */
export function withSessionView(map, sessionId, view, defaultView, limit = SESSION_VIEW_LIMIT) {
  const { [sessionId]: _previous, ...rest } = normalizeSessionViews(map, Infinity);
  const next = view === undefined || view === defaultView || !isTranscriptView(view) ? rest : { ...rest, [sessionId]: view };
  const keys = Object.keys(next);
  if (keys.length <= limit) return next;
  return Object.fromEntries(keys.slice(keys.length - limit).map((key) => [key, next[key]]));
}
export function readSessionViews(storage, key = SESSION_VIEW_STORAGE_KEY) {
  try { return normalizeSessionViews(JSON.parse(storage.getItem(key) ?? "null")); } catch { return {}; }
}
export function writeSessionViews(storage, map, key = SESSION_VIEW_STORAGE_KEY) {
  try {
    if (Object.keys(map).length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(map));
    return true;
  } catch { return false; }
}
/** Session menu rows (c360a9e1c Dm): Thinking only when the session has reasoning;
 * the make-default row only when the effective view differs from the default. */
export function transcriptViewMenu({ sessionView, defaultView, hasThinking }) {
  const current = effectiveView(sessionView, defaultView, { hasThinking });
  const items = TRANSCRIPT_VIEWS.filter((view) => view !== "thinking" || hasThinking)
    .map((view) => ({ view, label: TRANSCRIPT_VIEW_LABELS[view], checked: current === view }));
  const resolvedDefault = isTranscriptView(defaultView) ? defaultView : DEFAULT_TRANSCRIPT_VIEW;
  // Official d: hidden when the view fell back (effective !== chosen) or already is the default.
  const chosen = isTranscriptView(sessionView) ? sessionView : resolvedDefault;
  const makeDefault = current === chosen && current !== resolvedDefault
    ? { view: current, label: `Make ${TRANSCRIPT_VIEW_LABELS[current]} the default` } : null;
  return { current, items, makeDefault };
}
