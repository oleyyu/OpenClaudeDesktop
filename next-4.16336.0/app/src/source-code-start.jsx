import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StartCard, StartSlot, environmentLastUsed, startEnvironmentRows, useStableEnvironmentOrder } from './generated/code-start-v4/start.mjs';
import { showStartSlot, startFace } from './generated/code-start-v4/face.mjs';
import { StartHostContext } from './source-code-start-v4-adapters.jsx';
import { startTaskPrompt, useStartIntl } from './source-code-start-adapters.jsx';
import { SourcePet } from './source-pet.jsx';
// composer-env label context (relink C3 L1): cc43287c9 dxe `Qt=rT()` (rT = cd8a7d7c0 export i = y, the official home label
// context over window.desktopHomePath), linked once through the composer-env adapters.
import { useHomeLabelContext } from './source-composer-env-adapters.jsx';
import { hostGrowthBookFlag } from './host-growthbook.mjs';
import { environmentActivity, startEnvironmentItems, startEnvironmentRecords, startSetupRows, startWaitingSessions } from './code-start-host-model.mjs';
import { useTaskBacklog } from './source-task-backlog.jsx';
import { TAKE_GUARD_MS } from './task-backlog-model.mjs';
import './source-code-start.css';

const EMPTY = [];
// The host's setup row titles: $be's (cc43287c9, 4.16336.0) messages for the setup rows this host can raise. $be itself is
// not sliced (GitHub / PR / CLI import / auto-mode stores); code-start-host-model startSetupRows decides the rows.
const SETUP_TITLES = {
  choose: { defaultMessage: 'Choose a folder to work in', id: 'KzebaIQiSh' },
  worktree: { defaultMessage: 'Another session is running here', id: 'Z61amEZusU' },
  continue: { defaultMessage: 'Continue on {branch}', id: 'YkDX9sS5qu' },
  resume: { defaultMessage: 'Resume “{title}”', id: 'rGVfL0pQ5q' },
};
const CONTINUE_PROMPT = { defaultMessage: 'Continue the work in progress on {branch}: look at the uncommitted changes, tell me what state they’re in, and finish what’s started.', id: 'WWOBi0J82E' };

/** $be's row objects ({id, title, onPress, card}) for the host's setup rows (code-start-host-model startSetupRows). */
export function startSetupCards(rows, intl, { onChoose, onSetWorktree, onOpenSession, onTake }) {
  return rows.map(row => ({
    id: row.card.id, card: row.card,
    title: intl.formatMessage(SETUP_TITLES[row.action], row.action === 'continue' ? { branch: row.card.branch } : row.action === 'resume' ? { title: row.card.title } : undefined),
    // Dve rows call onPress(event, listed, readToEnd, picks); setup rows only use the event.
    onPress: event => {
      if (row.action === 'choose') onChoose(event.currentTarget);
      if (row.action === 'worktree') onSetWorktree(true);
      if (row.action === 'resume') onOpenSession(row.card.sessionId);
      if (row.action === 'continue') onTake(intl.formatMessage(CONTINUE_PROMPT, { branch: row.card.branch }));
    },
  }));
}

/**
 * Home's start card, Claude Desktop 4.16336.0 (cc43287c9 fAe -> MQ slot; jye -> Nye -> Aye card). The host plays the
 * draft page's face decision (shared-20 Ob / kb over the host GrowthBook presets gate), jye's portal and Nye's data
 * assembly: environment rows (Dye + B5 + s3, the local recent folders as local items after the named environments, D14),
 * setup rows ($be's local rows), the task backlog (q8 over the local backlog) and the awaiting sessions (fve).
 * onStartBesideDraft(prompt, onSent, picks) is Nye's startBesideDraft: it starts a session with the prompt while the Home
 * draft stays, and answers 'busy' / 'blocked' / 'asked'. Not passed (gated, report.json): repoRows, tasks.startContext,
 * chooseAlone (the cloud / auto place flow), the cloud auto environment row.
 */
export function SourceCodeStart({ ready, folders, folder, onSelect, onChoose, chooseOpen, call, onError,
  savedEnvironments = EMPTY, selectedEnvironmentId, onSelectEnvironment, inSplitWindow = false,
  sessions = EMPTY, workspace, worktree, onSetWorktree, starting, onOpenSession, onTake, onFocusComposer,
  onStartBesideDraft }) {
  const intl = useStartIntl();
  const labelContext = useHomeLabelContext();
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
  // fAe: face = Ob({environments: presets gate}); the slot shows when kb({face, inSplitWindow}). The host gate is on
  // (host-growthbook.mjs __gb__3264789062), so the face is the start card; the greeting face (hJ) is not sliced.
  const face = startFace({ environments: hostGrowthBookFlag('claudeai_cc_epitaxy_session_presets_main') });
  if (face !== 'start-card') throw Error('code-start v4: the greeting face (hJ) is not sliced; the host presets gate must stay on');
  // Recent environments: Dye rows (local paths ~-relative under the official home label context, dxe
  // `Dye({items:nr,labelContext:Qt,…})`), B5 last use, s3 stable order. The local recent folders follow the named
  // environments as local items (D14) and rank by the host folder activity.
  const rows = startEnvironmentRows({ items: startEnvironmentItems(savedEnvironments, folders), labelContext,
    sshOffered: false, sshLoaded: true, sshHosts: EMPTY }) ?? EMPTY;
  const activity = environmentLastUsed({ environments: startEnvironmentRecords(savedEnvironments), startedPlaces: EMPTY });
  for (const [path, at] of environmentActivity(folders, sessions)) if (!activity.has(path)) activity.set(path, at);
  const order = useStableEnvironmentOrder(new Map(rows.map(row => [row.id, activity.get(row.id) ?? 0])), ready);
  const environments = order.flatMap(id => rows.find(row => row.id === id) ?? []);
  const host = useMemo(() => ({ settled: ready, onOpenSession, sessions: startWaitingSessions(sessions), ClawdLaptop: SourcePet }),
    [ready, onOpenSession, sessions]);
  const setupRows = startSetupCards(startSetupRows({ folder, sessions, workspace, worktree, starting, status: git?.folder === folder ? git.status : undefined }),
    intl, { onChoose, onSetWorktree, onOpenSession, onTake });
  // Nye's tasks over the local backlog (q8's start / drop / dropAll). A pointer take or delete within TAKE_GUARD_MS of the
  // last one is a double click; onShown is analytics only (not passed).
  const lastTake = useRef(-Infinity);
  const doubled = keyboard => !keyboard && Date.now() - lastTake.current < TAKE_GUARD_MS;
  const drop = (list, { keyboard = false } = {}) => {
    if (!keyboard) { if (doubled(false)) return false; lastTake.current = Date.now(); }
    for (const item of list) remove(item.id, false);
    return true;
  };
  const tasks = {
    items, settled,
    // Read to the end in its preview (shown): startBesideDraft starts the task beside the draft and opens it once sent
    // ('starting'). Otherwise (or when Home can't send now) the prompt goes into the message box ('staged').
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
  if (!showStartSlot({ face, inSplitWindow })) return null;
  return <StartHostContext.Provider value={host}>
    <div className="oc-start-slot"><StartSlot slotRef={setSlot} /></div>
    {slot && !starting && createPortal(<StartCard ready={ready} environments={environments} selectedId={selectedEnvironmentId ? `preset:${selectedEnvironmentId}` : folder} setupRows={setupRows}
      tasks={tasks} openingKey={selectedEnvironmentId || folder || ''} onSelect={id => id.startsWith('preset:') ? onSelectEnvironment?.(id.slice(7)) : onSelect(id)} chooseOpen={chooseOpen} onChoose={onChoose}
      onRequestComposerFocus={onFocusComposer} />, slot)}
  </StartHostContext.Provider>;
}
