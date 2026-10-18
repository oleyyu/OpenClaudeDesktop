import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GF as ActiveTasks, xI as Ideas } from './generated/current-chat/shared-23-CuGEZNcW.js';
import { HomeIdeasContext, localIdeaIds } from './source-ideas-adapters.jsx';
import { o as ideaCatalog } from './generated/current-chat/c2bf50d9e-Borm-ayr.js';
import { PI as illustrationColors } from './generated/current-chat/shared-19-DmuztgN-.js';
import { CoworkHomeContext, HOME_CLEAR_EVENT } from './source-home-adapters.jsx';
import { coworkHomeState } from './cowork-home-model.mjs';
import { t } from '../electron/i18n/index.mjs';
import { useLocalRoutines } from './use-local-routines.jsx';
import { sourceRoutine } from './source-routine-adapters.jsx';
const localIdeas = ideaCatalog.pool.filter(idea => localIdeaIds.has(idea.id));

export function SourceCoworkHome({ call, sessions, metadata, state, ready, onOpen, onOpenRoutine, onClearActive, onError, onPrompt, onPreviewPrompt, onFocusInput }) {
  const data = useMemo(() => coworkHomeState(sessions, metadata, state), [sessions, metadata, state]);
  const { tasks, error: scheduleError } = useLocalRoutines(call, 'cowork');
  const scheduledTasks = useMemo(() => (tasks ?? []).map(sourceRoutine), [tasks]);
  const [clearing, setClearing] = useState(null);
  const actions = useRef(null);
  actions.current = { onPrompt, onPreviewPrompt, onFocusInput };
  const ideaStore = useMemo(() => {
    const focusInput = () => actions.current.onFocusInput();
    const setPrompt = value => actions.current.onPrompt(value);
    const setTipTapEditorJSON = doc => setPrompt((doc.content ?? []).map(block => (block.content ?? []).map(node => node.text ?? '').join('')).join('\n'));
    return { setPrompt, focusInput, setTipTapEditorJSON, ideas: localIdeas, illustrationColors,
      promptInputRef: { current: { setContent: setTipTapEditorJSON, focus: focusInput, scrollToEnd: focusInput } },
      setPreviewPrompt: value => actions.current.onPreviewPrompt(value), setPreviewSurface() {},
      // The local shortlist contains only Cowork ideas; selection stays in this surface.
      pick() {} };
  }, []);
  const readState = useMemo(() => {
    if (!clearing) return data.readState;
    const next = { ...data.readState, sessions: { ...data.readState.sessions } };
    for (const row of data.rows) if (row.lastActivityAt <= (clearing.get(row.sessionId) ?? -1)) next.sessions[row.sessionId] = row.lastActivityAt;
    return next;
  }, [data, clearing]);
  useEffect(() => {
    const clear = async () => {
      if (clearing) return;
      // GF clears its retained row order synchronously. Publish the matching read
      // state in the same event so pending IPC cannot immediately retain them again.
      setClearing(new Map(data.rows.map(row => [row.sessionId, row.lastActivityAt])));
      try { await onClearActive(data.rows); }
      catch (error) { onError?.(error); }
      finally { setClearing(null); }
    };
    window.addEventListener(HOME_CLEAR_EVENT, clear);
    return () => window.removeEventListener(HOME_CLEAR_EVENT, clear);
  }, [data.rows, onClearActive, onError, clearing]);
  return <CoworkHomeContext.Provider value={{ ...data, readState, ready, onOpen, onOpenRoutine, scheduledTasks }}>
    <div className="surface-cowork-home w-full max-w-[40rem]" role="region" aria-label={t('Cowork tasks')} aria-busy={!!clearing}>
      <HomeIdeasContext.Provider value={ideaStore}>
        <ActiveTasks className="max-w-none px-2" emptyFallback={<Ideas standalone />} />
      </HomeIdeasContext.Provider>
      {scheduleError && <p role="alert" className="text-body text-danger px-2">{scheduleError}</p>}
    </div>
  </CoworkHomeContext.Provider>;
}
