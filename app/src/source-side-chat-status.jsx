import React, { useCallback, useSyncExternalStore } from 'react';
import { SourceSpark } from './source-spark.jsx';
import { useSideChatStatusLabel } from './generated/code-editor/side-chat-status.mjs';
import { elapsedTurnSeconds, runtimeStatLabels, subscribeTurnClock } from './transcript-runtime-stats.mjs';
import { t } from '../electron/i18n/index.mjs';
import { sideChatToolAnnouncement } from './generated/code-editor/side-chat-activity.mjs';
const intl = { formatMessage: ({ defaultMessage }, values) => t(defaultMessage, values) };
import './source-transcript-status.css';

// Current iT -> Ta ($8), classic presentation used by this renderer. The source
// separates its live announcement from the visual mark/clock. Native progress
// reports real fork/tool transitions; other cores retain the stream fallback.
export function SourceSideChatStatus({ status, interrupting, thinkingSince, progress, awaitingAnswer, assistantName }) {
  const working = status === 'thinking' && !interrupting;
  const since = status === 'thinking' ? thinkingSince : null;
  const subscribe = useCallback(notify => subscribeTurnClock(since, notify), [since]);
  const snapshot = useCallback(() => elapsedTurnSeconds(since, Date.now()) ?? 0, [since]);
  const elapsed = useSyncExternalStore(subscribe, snapshot, snapshot);
  const forking = working && progress?.stage === 'forking';
  const waiting = !working || forking ? null : progress?.stage === 'tools' ? t('Running tools…')
    : progress?.stage === 'waiting' || (!progress && awaitingAnswer) ? t('Waiting for {assistant}…', { assistant: assistantName }) : null;
  // Ta keeps the last waiting label while streaming with no reported token count.
  const heldLabel = useSideChatStatusLabel(waiting, working, working);
  const label = interrupting ? t('Stopping…') : forking ? t('Forking session…') : heldLabel;
  const announcement = interrupting ? t('Stopping…') : !working ? '' : forking ? t('Forking session…') : progress?.activity ? sideChatToolAnnouncement(progress.activity, intl) : t('Thinking…');
  const clock = working ? runtimeStatLabels(elapsed, null)[0] : null;
  const visible = !!interrupting || (working && (!!clock || !!label));
  const busy = working || interrupting;
  // cccc2cf0a _F: div > [span.sr-only role=status (the announcement), div[aria-hidden] > Go]. The host's Go is the classic
  // source-transcript-status row; ssc-status and its data-side-* attributes are host hooks.
  return <div className="ssc-status" data-side-status={interrupting ? 'stopping' : working ? 'running' : 'idle'} data-side-stage={progress?.stage}>
    <span role="status" className="sr-only">{announcement}</span>
    <div aria-hidden={true}>
      <div className="source-transcript-status">
        <div className="sts-row">
          <SourceSpark className="sts-spark" size={18} state={busy ? 'thinking' : undefined}/>
          <span className="sts-label" data-visible={visible}>
            {forking && <span className="sts-activity">{label}</span>}
            {forking && clock && <span className="sts-separator">·</span>}
            {clock && <span className="sts-stat" data-runtime-stat="elapsed">{clock}</span>}
            {!forking && clock && label && <span className="sts-separator">·</span>}
            {!forking && visible && label && <span className="source-shimmer sts-activity">{label}</span>}
          </span>
        </div>
      </div>
    </div>
  </div>;
}
