// R4f-error E36 (transcript-session-error-boundary, WI-3): the session pane's load error boundary.
//
// 2.42304.0 mounts its chat panel (EpitaxyChatPanel: transcript and composer) inside shared-26 kl (generated as
// r3b-transcript/render-error-boundary.mjs RenderErrorBoundary) with cc43287c9 fV (generated as
// session-load-error/session-load-error.mjs SessionLoadError, "Something went wrong loading this session." + Try again)
// as its fallback, at three call sites:
//   c11959232 Nm (main pane)   resetOn: mountKey, componentName: "EpitaxyChatPanel", tags: {feature: "epitaxy"},
//                               metadata: {sessionId: r}, fallback: (e, t) => s(qo, {error: e, reset: t, sessionId: r})
//   c11959232 Pm (secondary)   resetOn: sessionId ?? `pane-draft-…`, tags: {feature: "epitaxy", pane: "secondary"}
//   c5638815a lt (pop-out)     resetOn: mountKey ?? sessionId ?? popoutId, tags: {feature: "epitaxy", pane: "popout"},
//                               sanitizeError: ct, and a fallback that rethrows p(e) errors before fV
// The panel is also the draft (new session) panel: there sessionId is undefined (`draftPersistKey: r ? ze(r) : cm`), and
// fV's Try again then only resets (`n !== void 0 && ($A(n), jP(n))`, then t()).
//
// Host: main.jsx wraps the session pane's content in the chat body (find bar, transcript, error line, notices, composer)
// with this component at one fixed place, for a session and for the draft alike, so going from the draft to the session
// it started never remounts the composer. resetOn is the local mount key (the transcript's key: the session id, or
// "draft"), so a session switch clears a shown fallback. Host differences: the boundary only catches what its children
// throw while rendering (the App body that holds the local state is above it); the pop-out's sanitizeError / rethrow is
// not ported (D17 telemetry); tags only reach the no-op render error report (source-r3b-transcript-adapters.jsx).
import React, { useCallback } from 'react';
import { RenderErrorBoundary } from './generated/r3b-transcript/render-error-boundary.mjs';
import { SessionLoadError } from './generated/session-load-error/session-load-error.mjs';

export const SESSION_PANEL_COMPONENT = 'EpitaxyChatPanel';
export const SESSION_DRAFT_MOUNT_KEY = 'draft';

// The boundary's props for one mount: the call sites' componentName / tags / metadata, resetOn the mount key.
export function sessionErrorBoundaryProps({ sessionId, mountKey, pane } = {}) {
  const id = typeof sessionId === 'string' && sessionId ? sessionId : undefined;
  return {
    sessionId: id,
    resetOn: mountKey ?? id ?? SESSION_DRAFT_MOUNT_KEY,
    componentName: SESSION_PANEL_COMPONENT,
    tags: pane === 'secondary' || pane === 'popout' ? { feature: 'epitaxy', pane } : { feature: 'epitaxy' },
    metadata: { sessionId: id },
  };
}

export function SourceSessionErrorBoundary({ sessionId, mountKey, pane, children }) {
  const { sessionId: id, ...props } = sessionErrorBoundaryProps({ sessionId, mountKey, pane });
  const fallback = useCallback((error, reset) => <SessionLoadError error={error} reset={reset} sessionId={id} />, [id]);
  return <RenderErrorBoundary {...props} fallback={fallback}>{children}</RenderErrorBoundary>;
}
