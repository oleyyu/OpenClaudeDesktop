// R3b-transcript host components: they mount the generated 2.42304.0 originals (src/generated/r3b-transcript) in the
// local Code transcript, with the host services of src/source-r3b-transcript-adapters.jsx.
import React, { useCallback, useMemo } from 'react';
import { TranscriptRowBoundary, useTranscriptRowBoundaryGate } from './generated/r3b-transcript/transcript-row-boundary.mjs';
import { TranscriptUnavailable } from './generated/r3b-transcript/transcript-unavailable.mjs';
import { TranscriptUnavailableHost } from './source-r3b-transcript-adapters.jsx';
import { transcriptRowCrashKind } from './transcript-row-boundary-model.mjs';
import { toolGroupExpansion, toolRowExpansion } from './tool-group-expansion.mjs';

// transcript-v01 — c96d752d0 u9 / d9 over c4a9ee384 ap: one transcript row inside the original row boundary, gated per
// session (cp, __gb__3525173228). kind: "reply" for the assistant's rows, "row" otherwise (transcriptRowCrashKind);
// resetOn: the row is the live streaming tail (f9's `S`); Try again first forgets the session's tool expansion (d9:
// eS + axe), as the original does. surface "code" is the codesOwnView branch; tagsOf only feeds telemetry tags.
// R4g-btw BT2 (X7-19, D34): every feed row goes through u9 in 2.42304.0 (Jit's `u9(gt,t,e.codesOwnView===!0?"code":
// "code_feed",S,_t,b(k9,` and uat's `u9(l,t,"code_feed",O,u,b(k9,`, one each), the child pane included (c4ea84cb3 renders
// c96d752d0's lat / dat), so the host wraps its workflow rows, its optimistic sends and the /btw child's rows too.
export function rowBoundaryKind(item) {
  // A model-started /workflow run is the turn's own tool row (an assistantItem in the original): "reply". The local
  // /workflow row (no turnId) and the optimistic send (a userMessage row) are not part of a reply.
  return item?.workflowRun && item.turnId ? 'reply' : transcriptRowCrashKind(item);
}

// R4i-transcript TR2 (D34): the host-only rows beside a turn's items (the local /status row, the auto-review lines, the
// turn footer, pinned chapter headings, the turn error card) each sit in their own boundary too, so one of them throwing
// replaces only itself. kind overrides the item-derived copy where the row is not the item itself: the error card and the
// footer belong to the reply (2.42304.0 c96d752d0 builds an API error as an item of the assistant entry, `case"error":g(s,VK(n.id,u,"error",`,
// so u9 gives it "reply"), a chapter heading and the /status row do not.
export function SourceTranscriptRowBoundary({ sessionId, item, kind, isStreaming = false, children }) {
  const enabled = useTranscriptRowBoundaryGate(sessionId ?? null);
  const onRetry = useCallback(() => {
    toolGroupExpansion.forgetSession(sessionId);
    toolRowExpansion.forgetSession(sessionId);
  }, [sessionId]);
  return enabled
    ? <TranscriptRowBoundary kind={kind ?? rowBoundaryKind(item)} surface="code" resetOn={isStreaming === true} onRetry={onRetry}>{children}</TranscriptRowBoundary>
    : children;
}

// cov2-05 — cf74bc599 Wv, as the session pane (Xx) mounts it when the transcript is unavailable:
// `T?.transcriptUnavailable && t ? u(Wv, { sessionRef: t, title: T.title, isArchived: T.isArchived === !0, onSessionRemoved: d })`.
// archive: the host archive (resolves false when it was declined); requestDelete: opens the host's Delete confirm;
// onError: reports a failed archive. onSessionRemoved is optional: the host archive / delete already leave the session.
export function SourceTranscriptUnavailable({ sessionId, title, isArchived = false, archive, requestDelete, onError, onSessionRemoved }) {
  const host = useMemo(() => ({ archive, requestDelete, onError }), [archive, requestDelete, onError]);
  const sessionRef = useMemo(() => ({ id: sessionId, type: 'local' }), [sessionId]);
  return <TranscriptUnavailableHost.Provider value={host}>
    <TranscriptUnavailable sessionRef={sessionRef} title={title} isArchived={isArchived === true} onSessionRemoved={onSessionRemoved} />
  </TranscriptUnavailableHost.Provider>;
}
