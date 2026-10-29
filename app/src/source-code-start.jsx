import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StartCard, StartSlot, useStableEnvironmentOrder } from './generated/code-start/view.mjs';
import { environmentLastUsed, startEnvironmentRows } from './generated/code-start/environments.mjs';
import { StartHostContext, startTaskPrompt, useStartIntl } from './source-code-start-adapters.jsx';
import { environmentActivity, startEnvironmentItems, startEnvironmentRecords, startSetupRows, startWaitingSessions } from './code-start-host-model.mjs';
import { useTaskBacklog } from './source-task-backlog.jsx';
import { TAKE_GUARD_MS } from './task-backlog-model.mjs';
import './source-code-start.css';

const EMPTY = [];
/**
 * Home's start card (cc43287c9 tle → rle → ele, 3.6556.2). onStartBesideDraft(prompt, onSent) is rle's startBesideDraft:
 * it starts a session with the prompt while the Home draft stays, and answers 'busy' / 'blocked' / 'asked'. The cloud
 * auto environment row (ele `auto`, GrowthBook __gb__3124758682 + cloud environments) is never passed here (E13).
 * 3.6556.2 no longer hides waiting/resume rows in a split pane, so the start card takes no split flag (HS-05).
 */
export function SourceCodeStart({ ready, folders, folder, onSelect, onChoose, chooseOpen, call, onError,
  savedEnvironments = EMPTY, selectedEnvironmentId, onSelectEnvironment,
  sessions = EMPTY, workspace, worktree, onSetWorktree, starting, onOpenSession, onTake, onFocusComposer,
  onStartBesideDraft }) {
  const intl = useStartIntl();
  const [slot, setSlot] = useState(null);
  const { items, settled, remove } = useTaskBacklog(folder || null, call, onError);
  const [git, setGit] = useState(null);
  useEffect(() => {
    if (!folder || !workspace?.isRepo || !call) return;
    let live = true;
    const read = () => call('workspace-git-status', { cwd: folder }).then(status => { if (live) setGit({ folder, status }); }, () => {});
    read();
    window.addEventListener('focus', read);
    return () => { live = false; window.removeEventListener('focus', read); };
  }, [folder, workspace?.isRepo, call]);
  // Recent environments: $ce rows (local paths shown ~-relative), Qce last use, s8 stable order. The local
  // recent folders follow the named environments (D14 host difference) and rank by the host folder activity.
  const rows = startEnvironmentRows({ items: startEnvironmentItems(savedEnvironments, folders), sshOffered: false, sshLoaded: true, sshHosts: EMPTY }) ?? EMPTY;
  const activity = environmentLastUsed({ environments: startEnvironmentRecords(savedEnvironments), startedPlaces: EMPTY });
  for (const [path, at] of environmentActivity(folders, sessions)) if (!activity.has(path)) activity.set(path, at);
  const order = useStableEnvironmentOrder(new Map(rows.map(row => [row.id, activity.get(row.id) ?? 0])), ready);
  const environments = order.flatMap(id => rows.find(row => row.id === id) ?? []);
  const host = useMemo(() => ({ settled: ready, onOpenSession, sessions: startWaitingSessions(sessions) }),
    [ready, onOpenSession, sessions]);
  const setupRows = startSetupRows({ folder, sessions, workspace, worktree, starting, status: git?.folder === folder ? git.status : undefined }).map(row => ({
    card: row.card,
    // M8's messages (with their ids: formatjs refuses a descriptor without one).
    title: row.action === 'resume' ? intl.formatMessage({ defaultMessage: 'Resume “{title}”', id: 'ycaFd/l54A' }, { title: row.card.title }) : undefined,
    // Bce H5: onPress(event, listed, readToEnd, picks); setup rows are never listed and only use the event.
    onPress: event => {
      if (row.action === 'choose') onChoose(event.currentTarget);
      if (row.action === 'worktree') onSetWorktree(true);
      if (row.action === 'resume') onOpenSession(row.card.sessionId);
      if (row.action === 'continue') onTake(intl.formatMessage({ defaultMessage: 'Continue the work in progress on {branch}: look at the uncommitted changes, tell me what state they’re in, and finish what’s started.', id: 'WWOBi0J82E' }, { branch: row.card.branch }));
    },
  }));
  // p5 (start/drop/dropAll) over the local backlog. A pointer take or delete within TAKE_GUARD_MS of the last one is
  // a double click (c/l); onShown is analytics only.
  const lastTake = useRef(-Infinity);
  const doubled = keyboard => !keyboard && Date.now() - lastTake.current < TAKE_GUARD_MS;
  const drop = (list, { keyboard = false } = {}) => {
    if (!keyboard) { if (doubled(false)) return false; lastTake.current = Date.now(); }
    for (const item of list) remove(item.id, false);
    return true;
  };
  const tasks = {
    items, settled,
    // Read to the end in its preview (shown): startBesideDraft starts the task beside the draft and opens it once sent ('starting').
    // Otherwise (or when Home can't send now) the prompt goes into the message box ('staged'), and the row family hides.
    onStart: (item, { keyboard = false, shown = false, picks, onStart } = {}) => {
      if (doubled(keyboard)) return null;
      const prompt = startTaskPrompt(item);
      const beside = shown && prompt !== '' ? onStartBesideDraft?.(prompt, sessionId => { remove(item.id, true); onStart?.(sessionId); }, picks) : undefined;
      if (beside === 'busy') return null;
      if (beside === 'asked') { lastTake.current = Date.now(); return 'starting'; }
      if (picks !== undefined) return null;
      const staged = !!onTake(item.prompt);
      if (staged) { lastTake.current = Date.now(); remove(item.id, true); }
      return staged ? 'staged' : null;
    },
    onDelete: (item, entry) => drop([item], entry),
    onDeleteAll: (list, entry) => drop(list, entry),
  };
  return <StartHostContext.Provider value={host}>
    <div className="oc-start-slot"><StartSlot slotRef={setSlot} /></div>
    {slot && !starting && createPortal(<StartCard ready={ready} environments={environments} selectedId={selectedEnvironmentId ? `preset:${selectedEnvironmentId}` : folder} setupRows={setupRows}
      tasks={tasks} openingKey={selectedEnvironmentId || folder || ''} onSelect={id => id.startsWith('preset:') ? onSelectEnvironment?.(id.slice(7)) : onSelect(id)} chooseOpen={chooseOpen} onChoose={onChoose}
      onRequestComposerFocus={onFocusComposer} />, slot)}
  </StartHostContext.Provider>;
}
