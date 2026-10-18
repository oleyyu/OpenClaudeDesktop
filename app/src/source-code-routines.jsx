// R4g-routines RT5 (tasks-code-routines WI-5, D32): the Code mode Routines page. It mounts the original 2.42304.0 page
// (src/generated/code-routines CodeRoutinesPage = cbd6c85c8 zl: the list Pl, the local detail Jc → cfc18e0f4, the local
// create page c0243d234 over the c0fd2fda3 form) inside its two hosts:
//   RoutinesSharedHost   (src/source-routines-shared-adapters.jsx) the router (a /code/routines/<id> push selects that
//                        task here), the shared-4 dh bridge the card menu calls, and the form's model list;
//   CodeRoutinesHost     (src/source-code-routines-adapters.jsx) the CCDScheduledTasks bridge, the LocalSessions /
//                        FileSystem methods this host has, isGitRepo and the bypass mode's availability.
// Both bridges are local-routines (kind 'code') through src/code-routine-model.mjs; Run now goes to the main process
// runner (routine-runner.mjs). The selection is main.jsx's routineSelection ("new-local" is the create page).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeRoutinesPage } from './generated/code-routines/index.mjs';
import { CodeRoutinesHostProvider, ccdSessionsStore } from './source-code-routines-adapters.jsx';
import { RoutinesSharedHost } from './source-routines-shared-adapters.jsx';
import { codeRoutineModels, codeRoutineSessions, createCodeLocalSessions, createCodeRoutinesBridge, routineHrefTarget } from './code-routine-model.mjs';
import { surfaceSessions } from '../electron/surface-policy.mjs';

const desktopEvents = (handler) => globalThis.window?.desktop?.onEvent?.(handler);

// isGitRepo is read during render (shared-11 Ud): a folder's answer comes from workspace-info once and is cached;
// undefined while unknown (the worktree switch stays off until it is known).
function useGitRepoCache(localSessions) {
  const [known, setKnown] = useState({});
  const asked = useRef(new Set());
  useEffect(() => () => { asked.current = new Set(); }, [localSessions]);
  return useCallback((cwd) => {
    if (typeof cwd !== 'string' || !cwd) return undefined;
    if (Object.prototype.hasOwnProperty.call(known, cwd)) return known[cwd];
    if (!asked.current.has(cwd)) {
      asked.current.add(cwd);
      const ask = asked.current;
      Promise.resolve().then(() => localSessions.isGitRepo(cwd)).catch(() => false)
        .then((value) => { if (ask === asked.current) setKnown((map) => ({ ...map, [cwd]: value === true })); });
    }
    return undefined;
  }, [known, localSessions]);
}

// R4i-routines RI2: c749529a1 F's LocalSessions.getAll for the folder field's Recent list (c0fd2fda3 G(!0) → O / v):
// the host's Code sessions with a folder, each with main.cjs 'recent-folder-sessions' fields (originCwd, folderExists,
// isScratchWorkspace; the same read as the composer's folder picker in main.jsx) and its times in ms (createdAt orders
// a folder against its dismissal, lastActivityAt its recency). `read()` returns the current { sessions, metadata }.
const timeMs = (value) => typeof value === 'number' && Number.isFinite(value) ? (value < 1e12 ? value * 1000 : value)
  : typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : undefined;
export function codeRoutineRecentSessions(call, read) {
  return async () => {
    const { sessions = [], metadata = {} } = read() ?? {};
    const rows = surfaceSessions(Array.isArray(sessions) ? sessions : [], 'code', metadata)
      .filter((session) => typeof session?.id === 'string' && typeof session.cwd === 'string' && session.cwd);
    if (!rows.length) return [];
    const fields = await call('recent-folder-sessions', { sessions: rows.map(({ id, cwd }) => ({ id, cwd })) });
    return rows.map((session) => {
      const createdAt = timeMs(session.createdAt) ?? timeMs(session.updatedAt);
      const lastActivityAt = timeMs(session.updatedAt) ?? createdAt;
      const own = fields && typeof fields === 'object' ? fields[session.id] : undefined;
      return { sessionId: session.id, cwd: session.cwd, ...(createdAt !== undefined && { createdAt }),
        ...(lastActivityAt !== undefined && { lastActivityAt }), ...(own && typeof own === 'object' ? own : {}) };
    });
  };
}

// The page's two host values ({ shared, host }) and the sessions store it fills; SourceCodeRoutines provides them.
export function useCodeRoutinesHosts({ call, selectedId = null, onSelect, models = [], bypassEnabled = false,
  executionProfile = {}, sessions = [], sessionMetadata = {}, state = {}, sessionsReady = true, subscribe = desktopEvents }) {
  const [rows, setRows] = useState(null);
  const profile = useRef(executionProfile);
  profile.current = executionProfile;
  const bridge = useMemo(() => createCodeRoutinesBridge({ call, subscribe, executionProfile: () => profile.current, onRows: setRows }), [call, subscribe]);
  const localSessions = useMemo(() => createCodeLocalSessions({ call }), [call]);
  const isGitRepo = useGitRepoCache(localSessions);
  const recentSource = useRef({ sessions, metadata: sessionMetadata });
  recentSource.current = { sessions, metadata: sessionMetadata };
  const getAll = useMemo(() => codeRoutineRecentSessions(call, () => recentSource.current), [call]);

  // The detail's History (Jc reads the CCD sessions store): the scheduler's runs with a session, the sessions that
  // name a task in their metadata. Initialised once the task list and the host's sessions are loaded.
  useEffect(() => {
    ccdSessionsStore.setState({
      sessions: rows ? codeRoutineSessions(rows, { sessions, metadata: sessionMetadata, state }) : [],
      isInitialized: rows !== null && sessionsReady, archivedRowsPending: false,
    });
  }, [rows, sessions, sessionMetadata, state, sessionsReady]);
  useEffect(() => () => ccdSessionsStore.setState({ sessions: [], isInitialized: false }), []);

  const select = useCallback((id) => onSelect?.(id ?? null), [onSelect]);
  const navigate = useCallback((href) => {
    const target = routineHrefTarget(href);
    if (target) select(target.id);
  }, [select]);
  const routineModels = useMemo(() => codeRoutineModels(models), [models]);
  const shared = useMemo(() => ({
    navigate, pathname: selectedId ? `/code/routines/${encodeURIComponent(selectedId)}` : '/code/routines', search: '', bridge, models: routineModels,
  }), [navigate, selectedId, bridge, routineModels]);
  const host = useMemo(() => ({
    bridge,
    localSessions: { start: localSessions.start, getLocalBranches: localSessions.getLocalBranches, getAll, getDetectedProjects: localSessions.getDetectedProjects },
    browseFolder: localSessions.browseFolder, isGitRepo, bypassAvailable: bypassEnabled === true,
  }), [bridge, localSessions, getAll, isGitRepo, bypassEnabled]);
  return { shared, host, select };
}

export function SourceCodeRoutines(props) {
  const { selectedId = null, onSession } = props;
  const { shared, host, select } = useCodeRoutinesHosts(props);
  const openSession = useCallback((sessionId) => { if (sessionId) onSession?.(sessionId); }, [onSession]);
  return <RoutinesSharedHost.Provider value={shared}>
    <CodeRoutinesHostProvider value={host}>
      <CodeRoutinesPage scheduledTaskId={selectedId ?? undefined} onNavigate={select} onOpenSession={openSession} />
    </CodeRoutinesHostProvider>
  </RoutinesSharedHost.Provider>;
}
