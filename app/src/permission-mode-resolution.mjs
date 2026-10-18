// R4g-composer CP6 (composer-14): the composer's permission mode as Claude Desktop 2.42304.0 layers it, on the host.
//
// Official (c227f4d5e JI, pinned by scripts/extract-permission-mode.mjs): a draft's base mode is c8eb45883 d
// (generated/permission-mode/resolution.mjs, `yy`): userChoice ?? userSettingsDefault ?? folderChoice ??
// repoSettingsDefault ?? globalPref. A running session's mode is `q ?? (vt ? bypass) ?? _t ?? yt ?? l ?? De`: its own
// pick, else the mode the session reports (or was spawned with), else the global preference. The layers:
//   userChoice           `[q,tt]=zt(E,()=>null)`: an in-memory pick per opening (a draft, or the session it became),
//                        never persisted with the draft (shared-1 lC has no permission field).
//   userSettingsDefault  settings.json defaultPermissionMode (user/managed source), local and SSH environments only.
//   folderChoice         `Bc("epitaxy-folder-permission-mode",{},{scope:"account"})[folder]`, Plan excluded; the
//                        session's folder is its originCwd without `/.claude/worktrees/<name>`.
//   repoSettingsDefault  settings.json defaultPermissionMode from the project's own settings.
//   globalPref           `cc-landing-draft-permission-mode` through c8eb45883 u; only the auto-default nudge writes it.
// A Mode-menu pick (gn) that differs from the current mode sets userChoice and, unless it is Plan or comes from the
// approval card, the folder's pick; it never writes the global preference. When a draft moves from no folder to a
// folder, a pick made before it is kept as that folder's pick; any folder move then clears the draft's userChoice.
//
// Host adapter:
//   - userSettingsDefault and repoSettingsDefault: the host cores have no settings.json defaultPermissionMode, so both
//     layers are absent (undefined), the official branch for an environment without settings.
//   - globalPref is the host's own Settings › Default permission mode (config.permission through savedPermission), used
//     as is: a saved Plan or Bypass keeps working (official u would turn Plan into Accept edits, and without the
//     GrowthBook auto-default gate `ccd_auto_default_mode` would also turn Auto into Accept edits). Settings is the only
//     writer; there is no auto-default nudge on the host.
//   - The folder map lives in this renderer's localStorage under the official key (one local account, so no account
//     scope), and follows other windows through the storage event.
//   - A running session's mode: official _t is the session record's permissionMode (`_t=s?.permissionMode`), kept with
//     the session across restarts. The host cores do not report one and the session record (config.sessionMetadata) is
//     main-process owned, so the renderer keeps the session's last mode (the mode it was started with from this window,
//     then every in-session Mode-menu pick) in localStorage under a host key (SESSION_PERMISSION_KEY, capped at
//     SESSION_PERMISSION_LIMIT sessions). The spawn layer (l) stays this app run only. A session with no entry (started
//     before this layer existed, or storage unavailable) falls back to the global preference.
//   - Host mode values: ask = default (Manual), bypass = bypassPermissions. A remembered Bypass is still subject to the
//     opt-in (source-bypass-permission.jsx reads it as Auto while unavailable); turning the opt-in off drops every
//     remembered Bypass pick, as preferences.mjs does for the saved default.
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { resolvePermissionBaseMode } from './generated/permission-mode/resolution.mjs';

export const FOLDER_PERMISSION_KEY = 'epitaxy-folder-permission-mode';
/** Host stand-in for the session record's permissionMode (_t): not an official key. */
export const SESSION_PERMISSION_KEY = 'openclaude-session-permission-mode';
export const SESSION_PERMISSION_LIMIT = 500;
export const PERMISSION_MODES = Object.freeze(['auto', 'ask', 'acceptEdits', 'plan', 'bypass']);
export const isPermissionMode = value => PERMISSION_MODES.includes(value);

/** zt(E): one opening per draft surface, and one per session. */
export function permissionOpeningKey({ sessionId = null, surface = 'code' } = {}) {
  return sessionId ? `session:${sessionId}` : `draft:${surface || 'code'}`;
}
const isDraftOpening = key => typeof key === 'string' && key.startsWith('draft:');

/** c227f4d5e Xe for a local opening: the session's origin folder (worktree suffix stripped), else the draft's folder. */
export function permissionFolderKey({ sessionId = null, originCwd = null, sessionCwd = null, draftCwd = null } = {}) {
  const text = value => typeof value === 'string' && value ? value : null;
  if (sessionId) {
    const folder = text(originCwd) ?? text(sessionCwd);
    return folder ? folder.replace(/\/\.claude\/worktrees\/[^/]+$/, '') : null;
  }
  return text(draftCwd);
}

/** gn: `_=!!h&&o!=="approval_card"&&a!=="plan"&&!(a==="bypassPermissions"&&zI(h))` (the host has no scratch or
 * remote-env folder keys, so zI never holds). */
export function folderPickWrites({ folderKey, value, how = 'mode_dropdown' } = {}) {
  return !!folderKey && how !== 'approval_card' && value !== 'plan';
}

/** The rt effect for a draft whose folder changed from `previous` to `next` (host: no scratch or remote-env keys). */
export function draftFolderMove({ previous = null, next = null, userChoice = null } = {}) {
  if (previous === next) return { save: null, reset: false };
  const fromNone = previous === null, carries = fromNone && userChoice !== null && userChoice !== 'plan';
  return { save: carries && next !== null ? { key: next, value: userChoice } : null, reset: true };
}

/** The opening's mode: a draft through the original d, a running session through its own chain. */
export function resolveOpeningMode({ sessionId = null, userChoice = null, sessionMode, spawnMode, folderChoice, globalPref = 'auto', settled = true } = {}) {
  const pick = isPermissionMode(userChoice) ? userChoice : null;
  const global = isPermissionMode(globalPref) ? globalPref : 'auto';
  if (sessionId) {
    // `q ?? … ?? _t ?? yt ?? l ?? De`: the pick, the session's recorded mode, the spawn mode, the global preference.
    const recorded = isPermissionMode(sessionMode) ? sessionMode : undefined;
    const spawned = isPermissionMode(spawnMode) ? spawnMode : undefined;
    return { mode: pick ?? recorded ?? spawned ?? global,
      source: pick !== null ? 'in_session_pick' : recorded !== undefined ? 'session_mode' : spawned !== undefined ? 'spawn_mode' : 'global_pick', hasExplicitChoice: pick !== null };
  }
  const folder = isPermissionMode(folderChoice) && folderChoice !== 'plan' ? folderChoice : undefined;
  const base = resolvePermissionBaseMode({ userChoice: pick, userSettingsDefault: undefined, repoSettingsDefault: undefined, folderChoice: folder,
    globalPref: global, consultedStoredGlobalPref: global, storedPickLayersSettled: !!settled });
  return { mode: base.baseMode, source: base.baseModeSource, hasExplicitChoice: base.hasExplicitChoice };
}

export function readFolderPicks(storage) {
  try {
    const value = JSON.parse(storage?.getItem?.(FOLDER_PERMISSION_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, mode]) => key && isPermissionMode(mode)));
  } catch { return {}; }
}
export function writeFolderPicks(storage, picks) {
  try { storage?.setItem?.(FOLDER_PERMISSION_KEY, JSON.stringify(picks ?? {})); return true; } catch { return false; }
}

/** The session modes as stored: { [sessionId]: mode }, oldest first; bad entries and broken storage read as none. */
export function readSessionModes(storage) {
  try {
    const value = JSON.parse(storage?.getItem?.(SESSION_PERMISSION_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([key, mode]) => key && isPermissionMode(mode)));
  } catch { return {}; }
}
export function writeSessionModes(storage, modes) {
  try { storage?.setItem?.(SESSION_PERMISSION_KEY, JSON.stringify(modes ?? {})); return true; } catch { return false; }
}
/** Records a session's mode as its newest entry, keeping the newest SESSION_PERMISSION_LIMIT sessions. */
export function rememberSessionMode(modes, sessionId, mode) {
  if (!sessionId || !isPermissionMode(mode)) return modes;
  const { [sessionId]: _old, ...rest } = modes ?? {};
  const entries = [...Object.entries(rest), [sessionId, mode]];
  return Object.fromEntries(entries.slice(Math.max(0, entries.length - SESSION_PERMISSION_LIMIT)));
}

export function initialPermissionLayers(folders = {}, sessions = {}) {
  return { choices: {}, spawn: {}, sessions, folders, folderAt: {}, spawnedFrom: {} };
}
const without = (record, key) => { const { [key]: _drop, ...rest } = record; return rest; };
const dropBypass = record => {
  const kept = Object.fromEntries(Object.entries(record).filter(([, mode]) => mode !== 'bypass'));
  return Object.keys(kept).length === Object.keys(record).length ? record : kept;
};

export function permissionLayersReducer(state, action) {
  switch (action?.type) {
    case 'pick': {
      const { openingKey, folderKey = null, value, how = 'mode_dropdown', current } = action;
      if (!openingKey || !isPermissionMode(value) || value === current) return state;
      const next = { ...state, choices: { ...state.choices, [openingKey]: value } };
      if (folderPickWrites({ folderKey, value, how })) next.folders = { ...state.folders, [folderKey]: value };
      // A pick in a session is that session's mode from now on (official: set_permission_mode updates _t).
      if (openingKey.startsWith('session:')) next.sessions = rememberSessionMode(state.sessions ?? {}, openingKey.slice('session:'.length), value);
      return next;
    }
    case 'folder': {
      const { openingKey, folderKey = null } = action;
      if (!isDraftOpening(openingKey)) return state;
      if (!Object.hasOwn(state.folderAt, openingKey)) return { ...state, folderAt: { ...state.folderAt, [openingKey]: folderKey } };
      const previous = state.folderAt[openingKey];
      if (previous === folderKey) return state;
      const move = draftFolderMove({ previous, next: folderKey, userChoice: state.choices[openingKey] ?? null });
      return { ...state, folderAt: { ...state.folderAt, [openingKey]: folderKey },
        ...(move.save ? { folders: { ...state.folders, [move.save.key]: move.save.value } } : {}),
        ...(move.reset && Object.hasOwn(state.choices, openingKey) ? { choices: without(state.choices, openingKey) } : {}) };
    }
    case 'adopt': {
      const { sessionId, openingKey, mode } = action;
      if (!sessionId || !isPermissionMode(mode)) return state;
      return { ...state, spawn: { ...state.spawn, [sessionId]: mode }, spawnedFrom: { ...state.spawnedFrom, [sessionId]: openingKey },
        sessions: rememberSessionMode(state.sessions ?? {}, sessionId, mode) };
    }
    case 'entered': {
      // The draft opening became this session: its pick now lives in the session's spawn mode.
      const from = state.spawnedFrom[action.sessionId];
      if (from === undefined) return state;
      return { ...state, spawnedFrom: without(state.spawnedFrom, action.sessionId), ...(isDraftOpening(from) && Object.hasOwn(state.choices, from) ? { choices: without(state.choices, from) } : {}) };
    }
    case 'folders': return action.folders === state.folders ? state : { ...state, folders: action.folders ?? {} };
    case 'sessions': return action.sessions === state.sessions ? state : { ...state, sessions: action.sessions ?? {} };
    case 'purgeBypass': {
      const sessions0 = state.sessions ?? {};
      const choices = dropBypass(state.choices), spawn = dropBypass(state.spawn), folders = dropBypass(state.folders), sessions = dropBypass(sessions0);
      return choices === state.choices && spawn === state.spawn && folders === state.folders && sessions === sessions0 ? state : { ...state, choices, spawn, folders, sessions };
    }
    default: return state;
  }
}

const defaultStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/**
 * globalPref: the saved Settings default (savedPermission); settled: the saved config is loaded; sessionId / folder /
 * surface: the open opening; bypassOptIn: config.allowBypassPermissions === true. Returns the opening's layered mode,
 * pick(value, how) for the Mode menu (how 'approval_card' skips the folder pick), modeFor(sessionId) for another
 * session and adoptSession(id) after a successful thread/start from this opening.
 */
export function usePermissionModeLayers({ globalPref = 'auto', settled = true, sessionId = null, folder = null, surface = 'code', bypassOptIn = null, storage = defaultStorage } = {}) {
  const storageOf = () => typeof storage === 'function' ? storage() : storage;
  const [state, dispatch] = useReducer(permissionLayersReducer, undefined, () => { const store = storageOf(); return initialPermissionLayers(readFolderPicks(store), readSessionModes(store)); });
  const openingKey = permissionOpeningKey({ sessionId, surface }), folderKey = folder || null;
  const resolved = resolveOpeningMode({ sessionId, userChoice: state.choices[openingKey] ?? null, sessionMode: sessionId ? state.sessions[sessionId] : undefined,
    spawnMode: sessionId ? state.spawn[sessionId] : undefined, folderChoice: !sessionId && folderKey ? state.folders[folderKey] : undefined, globalPref, settled });
  const live = useRef(null);
  live.current = { openingKey, folderKey, sessionId, mode: resolved.mode, state, globalPref };
  useEffect(() => { if (!sessionId) dispatch({ type: 'folder', openingKey, folderKey }); }, [sessionId, openingKey, folderKey]);
  useEffect(() => { if (sessionId) dispatch({ type: 'entered', sessionId }); }, [sessionId]);
  useEffect(() => { if (settled && bypassOptIn === false) dispatch({ type: 'purgeBypass' }); }, [settled, bypassOptIn, state.folders, state.choices, state.spawn, state.sessions]);
  const written = useRef(state.folders);
  useEffect(() => {
    if (written.current === state.folders) return;
    written.current = state.folders;
    writeFolderPicks(storageOf(), state.folders);
  }, [state.folders]);
  const writtenSessions = useRef(state.sessions);
  useEffect(() => {
    if (writtenSessions.current === state.sessions) return;
    writtenSessions.current = state.sessions;
    writeSessionModes(storageOf(), state.sessions);
  }, [state.sessions]);
  useEffect(() => {
    const target = typeof window === 'undefined' ? null : window;
    if (!target?.addEventListener) return undefined;
    const onStorage = event => {
      if (event.key === SESSION_PERMISSION_KEY) {
        const sessions = readSessionModes(storageOf());
        writtenSessions.current = sessions;
        dispatch({ type: 'sessions', sessions });
        return;
      }
      if (event.key !== FOLDER_PERMISSION_KEY) return;
      const next = readFolderPicks(storageOf());
      written.current = next;
      dispatch({ type: 'folders', folders: next });
    };
    target.addEventListener('storage', onStorage);
    return () => target.removeEventListener('storage', onStorage);
  }, []);
  return useMemo(() => ({
    mode: resolved.mode,
    source: resolved.source,
    hasExplicitChoice: resolved.hasExplicitChoice,
    pick(value, how = 'mode_dropdown') {
      const now = live.current;
      dispatch({ type: 'pick', openingKey: now.openingKey, folderKey: now.folderKey, value, how, current: now.mode });
    },
    modeFor(id) {
      const now = live.current;
      if (!id || id === now.sessionId) return now.mode;
      return resolveOpeningMode({ sessionId: id, userChoice: now.state.choices[permissionOpeningKey({ sessionId: id })] ?? null, sessionMode: now.state.sessions[id], spawnMode: now.state.spawn[id], globalPref: now.globalPref }).mode;
    },
    adoptSession(id) {
      const now = live.current;
      dispatch({ type: 'adopt', sessionId: id, openingKey: now.openingKey, mode: now.mode });
    },
  }), [resolved.mode, resolved.source, resolved.hasExplicitChoice]);
}
