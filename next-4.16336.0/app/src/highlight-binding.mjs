// Pure view lifecycle adapter, independent of React or the global singleton.
// The canonical text is always caller-owned; results never replace Copy input.
//
// A plain result whose reason is only a momentary capacity limit of the shared
// service (queue-limit / subscriber-limit) is retried with capped backoff while
// this update is still current, so a burst of requests (every mounted fence
// re-requesting after a code theme change) settles into highlighted tokens
// instead of stripping the fences beyond the queue to plain text until remount.
// Every other plain reason (ineligible text, timeout, worker error) is final.
export const TRANSIENT_HIGHLIGHT_REASONS = Object.freeze(["queue-limit", "subscriber-limit"]);
export const HIGHLIGHT_RETRY = Object.freeze({ initialDelayMs: 50, maxDelayMs: 1_000 });
export function createHighlightBinding({
  service, onResult, isSelectionActive = () => false, subscribeSelection = () => () => {},
  schedule = setTimeout, cancelTimer = clearTimeout, retryDelayMs = HIGHLIGHT_RETRY.initialDelayMs, maxRetryDelayMs = HIGHLIGHT_RETRY.maxDelayMs,
}) {
  let version = 0, controller = null, unsubscribe = null, disposed = false, retryTimer = null, retries = 0;
  const clear = () => {
    controller?.abort(); controller = null;
    unsubscribe?.(); unsubscribe = null;
    if (retryTimer !== null) { cancelTimer(retryTimer); retryTimer = null; }
  };
  const attempt = (input, ticket, delay) => {
    controller = new AbortController();
    void service.request(input, { signal: controller.signal }).then((result) => {
      if (disposed || ticket !== version) return;
      if (result.status !== "highlighted") {
        if (!TRANSIENT_HIGHLIGHT_REASONS.includes(result.reason)) return;
        retries += 1;
        retryTimer = schedule(() => {
          retryTimer = null;
          if (disposed || ticket !== version) return;
          attempt(input, ticket, Math.min(delay * 2, maxRetryDelayMs));
        }, delay);
        return;
      }
      const commit = () => {
        if (disposed || ticket !== version || isSelectionActive()) return;
        unsubscribe?.(); unsubscribe = null;
        onResult(input, result);
      };
      if (isSelectionActive()) unsubscribe = subscribeSelection(commit);
      else commit();
    }).catch(() => { /* Optional custom service rejection is still plain. */ });
  };
  return {
    update(input) {
      if (disposed) return;
      const ticket = ++version;
      clear();
      onResult(input, null);
      attempt(input, ticket, retryDelayMs);
    },
    inspect() { return { disposed, retrying: retryTimer !== null, retries }; },
    dispose() { if (!disposed) { disposed = true; version += 1; clear(); } },
  };
}
