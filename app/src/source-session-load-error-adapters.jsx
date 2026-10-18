// Host adapters for src/generated/session-load-error (scripts/extract-session-load-error.mjs). Each export answers one
// import (or one same-chunk declaration) of the original 2.42304.0 chunks that reads a runtime service of the official
// desktop app; the generator pins every one to strings of the original it replaces (`adapters` / `chunkAdapters` in the
// extractor). The generated modules import this file, so it imports no module generated there.
//
// The pane_retry / reload branch of cc43287c9 fV needs a chunk heal target, and that is behind GrowthBook
// "__gb__982582273" (shared-20 g_). This host has no GrowthBook (D29/D31/D33), so the flag reads false and Try again
// always takes fV's `s`: forget the session's scroll anchors and row expansion, then reset the boundary. The adapters
// below that only that branch reaches (resolveChunkHealTarget, reportChunkCacheHeal) say so.
import { useStartIntl, StartMessage } from './source-code-start-adapters.jsx';
import { forgetTranscriptScroll } from './use-transcript-scroll.js';
import { toolGroupExpansion, toolRowExpansion } from './tool-group-expansion.mjs';

// vendor-intl p / l (react-intl useIntl / FormattedMessage) over the local catalog: the English message is looked up in
// zh-CN by t() (source-code-start-adapters.jsx).
export { useStartIntl as useIntl, StartMessage as FormattedMessage };

// shared-25 Jf (exported Wf): the desktop router. shared-19 T9 calls it on every render but uses it only for its Back to
// landing page button (`onClick: a ?? (() => s.push(r))`), which it shows only without onRetry; fV always passes
// onRetry. This host has no router to the official landing page, so every method refuses loudly instead of silently
// doing nothing should a later caller render T9 without onRetry or onBack.
const refuseNavigation = method => () => {
  throw Error(`ErrorPage: this host has no desktop router (${method}); pass onRetry or onBack`);
};
const HOST_ROUTER = Object.freeze({
  push: refuseNavigation('push'), replace: refuseNavigation('replace'), back: refuseNavigation('back'),
  forward: refuseNavigation('forward'), refresh: refuseNavigation('refresh'), prefetch: refuseNavigation('prefetch'),
});
export function useRouter() {
  return HOST_ROUTER;
}

// cd14a8022 T (exported l, `$A` in fV): clears `${id}:` (every main window view), `popout:${id}:`, `projects-rail:${id}`
// and `side-pane:${id}` from the 50-entry scroll anchor LRU. The host's one transcript scroll cache is
// src/use-transcript-scroll.js (also 50 entries); main.jsx mounts the session transcript with
// sessionKey={current ? `code:${current}` : null}, in the main window and in a session pop-out alike (same App). The host
// has no projects rail and no side pane of the same session; the btw pane (`btw:${btwId}`) is another session's
// transcript, not this one's.
export function codeTranscriptScrollKey(sessionId) {
  return `code:${sessionId}`;
}
export function forgetScrollAnchors(sessionId) {
  forgetTranscriptScroll(codeTranscriptScrollKey(sessionId));
}

// cc6e9624e u (exported a, `jP` in fV): drops the session's tool expansion intentions. Here they are the two stores of
// tool-group-expansion.mjs (groups and rows), cleared the way the row boundary's Try again clears them
// (source-r3b-transcript.jsx SourceTranscriptRowBoundary).
export function forgetRowExpansion(sessionId) {
  toolGroupExpansion.forgetSession(sessionId);
  toolRowExpansion.forgetSession(sessionId);
}

// shared-0 no (exported gy): a GrowthBook value, forced or evaluated. There is no GrowthBook client on this host; the
// answer is that of a client that never loaded (Ka() is null, so ro gives undefined), and shared-20 Xg's `$e(e) ?? !1`
// turns it into false: the chunk heal flag "__gb__982582273" is off.
export function growthBookValue() {
  return undefined;
}

// shared-20 __ (same chunk as g_): the heal target of a chunk failure. g_ calls it only when the flag above is on, so it
// is unreachable here. If it were reached, the honest host answer is still "none": the renderer's assets are bundled
// locally, so a reload does not fetch a fresh chunk. Opening the flag would need the original resolver (74 declarations
// in five chunks, see the extractor) instead of this answer.
export function resolveChunkHealTarget() {
  return undefined;
}

// shared-26 qu (exported yp, `lo` in fV): a probe fetch of the failed chunk, then Datadog `app.chunk_cache_heal`. This host
// sends no telemetry and makes no network probe (D17); the promise resolves at once so fV's `.finally` runs as it would
// after a report. Only the pane_retry branch calls it, unreachable here.
export async function reportChunkCacheHeal() {}
