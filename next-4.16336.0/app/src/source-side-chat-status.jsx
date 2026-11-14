import React from 'react';
import { useSideChatStatusLabel } from './generated/code-editor/side-chat-status.mjs';
import { useElapsedSince } from './generated/working-line/elapsed-clock.mjs';
import { thinkingElapsedBucket } from './generated/working-line/working-line.mjs';
import { SourceWorkingLine } from './source-working-line.jsx';
import { t } from '../electron/i18n/index.mjs';
import { sideChatToolAnnouncement } from './generated/code-editor/side-chat-activity.mjs';
const intl = { formatMessage: ({ defaultMessage }, values) => t(defaultMessage, values) };

// W14-code r8 css8-side-chat-status-handrow: 3.6556.2 cccc2cf0a _F — div > [span.sr-only role=status (the announcement),
// div[aria-hidden] > Go]. Go is c96d752d0 V = U6, the Code transcript's own working line (generated/working-line
// WorkingLine, through SourceWorkingLine), with _F's props:
//   isActuallyWorking `m && !o`, isStopping `o`, spawnLabel "Forking session…" while the side session starts (locally the
//   fork stage), waiting `_` ("tools" while a tool runs, "model" while the answer has not started, else null),
//   isCompacting false, apiRetry null, elapsedSeconds `Mo(Ts(d) ?? 0)` (c96d752d0 H = M6 over c93058e68 t, the turn's
//   elapsed seconds since its start d), turnStartTime d (ms), tokens 0, thinking null, markStandalone true.
// `y = Uo(v, !1, m && !o)` (c96d752d0 U = V6) holds the waiting state for the announcement's "connecting" case (a remote
// side session; the host has none). ssc-status and its data-side-* attributes are host hooks with no style.
export function SourceSideChatStatus({ status, interrupting, thinkingSince, progress, awaitingAnswer }) {
  const working = status === 'thinking' && !interrupting;
  const forking = status === 'thinking' && progress?.stage === 'forking';
  const turnStartTime = status === 'thinking' && Number.isFinite(thinkingSince) ? thinkingSince * 1000 : null;
  const elapsed = useElapsedSince(turnStartTime) ?? 0;
  const spawnLabel = forking ? t('Forking session…') : undefined;
  const waiting = status !== 'thinking' || forking ? null : progress?.stage === 'tools' ? 'tools'
    : progress?.stage === 'waiting' || (!progress && awaitingAnswer) ? 'model' : null;
  const held = useSideChatStatusLabel(waiting, false, working);
  const announcement = interrupting ? t('Stopping…') : status !== 'thinking' ? ''
    : spawnLabel ?? (held === 'connecting' ? t('Connecting…') : progress?.activity ? sideChatToolAnnouncement(progress.activity, intl) : t('Thinking…'));
  const line = { isActuallyWorking: working, isStopping: !!interrupting, spawnLabel, waiting, isCompacting: false, apiRetry: null,
    elapsedSeconds: thinkingElapsedBucket(elapsed), turnStartTime, tokens: 0, thinking: null, markStandalone: true };
  return <div className="ssc-status" data-side-status={interrupting ? 'stopping' : working ? 'running' : 'idle'} data-side-stage={progress?.stage}>
    <span role="status" className="sr-only">{announcement}</span>
    <div aria-hidden={true}><SourceWorkingLine line={line} /></div>
  </div>;
}
