// Composer folder picker (2.2553.1 cc43287c9-BMbiZYzF.js:21638-21850 lH, :21863-22005 dH; 2.31226.0
// cc43287c9-Bchz60VT NZ / FZ) over the recent-folder list of c749529a1 (2.31226.0 c749529a1-3d64pCyM.js _ / D).
// - _ (recentFolderOrigin): a session counts for its origin folder (originCwd: the repository a worktree session
//   was cut from), never for a scratch workspace, and not when it ran in its own folder and that folder is gone
//   (folderExists === false). main.cjs 'recent-folder-sessions' supplies those fields (getAll locally).
// - D (recentFolders): a folder's recency is the latest activity (lastActivityAt, else createdAt; locally the
//   thread's updatedAt) of its sessions, raised by a detected project's lastActivity; most recent first; a
//   dismissed folder stays hidden until a session is created there after the dismissal (E); session-backed
//   folders first, then detected projects (main.cjs 'detected-projects'); at most 8 (x = 8).
// - FZ H: the chosen folder is prepended when it is not already listed.
// - NZ: label = basename (po); the parent directory (un) becomes the row description only when two listed
//   folders share a basename; the current folder is the checked radio and is never dismissible; with nothing
//   listed and the lists loaded (O = !n && t.length === 0) the chip browses directly.
// Dismissals are {path: dismissedAt ms} from the main process config (the source keeps them per host in
// localStorage "ccd-dismissed-recent-folders-v1").

export const RECENT_FOLDER_LIMIT = 8;
/** c749529a1 N: the sessions' Recent fields and the detected projects are re-read every 30 s while the picker shows. */
export const RECENT_FOLDER_REFRESH_MS = 3e4;

/** Mr: the last path segment (a bare "/" stays "/"). */
export function folderBasename(path = "") {
  const parts = String(path).split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(path);
}

/** DT: everything before the last "/" or "\\", or null at the root. */
export function parentDirectory(path = "") {
  const value = String(path);
  const at = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return at > 0 ? value.slice(0, at) : null;
}

// Thread timestamps are seconds (Codex) or milliseconds; compare in ms.
function ms(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
  if (typeof value === "string") { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
}

/** _: the folder a session counts for in Recent, or null. */
export function recentFolderOrigin(session) {
  if (!session || !session.originCwd || session.isScratchWorkspace) return null;
  if (session.cwd === session.originCwd && session.folderExists === false) return null;
  return session.originCwd;
}

/** getAll's Recent fields from main.cjs 'recent-folder-sessions' ({[id]: {originCwd, folderExists, isScratchWorkspace}}). */
export function withRecentFolderFields(sessions = [], fields = {}) {
  return sessions.map((session) => {
    const own = fields && typeof fields === "object" && session?.id ? fields[session.id] : undefined;
    return own ? { ...session, ...own } : session;
  });
}

/** D + the FZ prepend: [{path}] ordered for the Recent group. */
export function recentFolders({ sessions = [], detectedProjects = [], current = "", dismissedAt = {}, limit = RECENT_FOLDER_LIMIT } = {}) {
  const activity = new Map(), created = new Map(), sessionBacked = new Set();
  for (const session of sessions) {
    const path = recentFolderOrigin(session);
    if (path === null) continue;
    const last = ms(session.lastActivityAt ?? session.updatedAt ?? session.createdAt), born = ms(session.createdAt);
    activity.set(path, Math.max(activity.get(path) ?? 0, last));
    created.set(path, Math.max(created.get(path) ?? 0, born));
    sessionBacked.add(path);
  }
  for (const project of Array.isArray(detectedProjects) ? detectedProjects : []) {
    if (typeof project?.path !== "string" || !project.path) continue;
    activity.set(project.path, Math.max(activity.get(project.path) ?? 0, ms(project.lastActivity)));
  }
  const dismissed = dismissedAt && typeof dismissedAt === "object" ? dismissedAt : {};
  const ordered = [...activity.entries()]
    .sort(([, left], [, right]) => right - left)
    .filter(([path]) => {
      const at = Number(dismissed[path]);
      return !Number.isFinite(at) || (created.get(path) ?? 0) > at;
    });
  const list = [...ordered.filter(([path]) => sessionBacked.has(path)), ...ordered.filter(([path]) => !sessionBacked.has(path))]
    .slice(0, limit)
    .map(([path]) => ({ path }));
  return current && !list.some((entry) => entry.path === current) ? [{ path: current }, ...list] : list;
}

/** lH rows: label, collision description, radio state and dismissibility. */
export function recentFolderRows(list = [], current = "") {
  const counts = new Map();
  for (const { path } of list) { const name = folderBasename(path); counts.set(name, (counts.get(name) ?? 0) + 1); }
  return list.map(({ path }) => {
    const label = folderBasename(path), parent = parentDirectory(path), isCurrent = path === current;
    return { path, label, description: parent && counts.get(label) > 1 ? parent : undefined, checked: isCurrent, dismissible: !isCurrent };
  });
}

/** NZ O: no folder chosen and nothing recent once the lists loaded, so the chip browses directly instead of opening the menu. */
export function folderPickerBrowsesDirectly(list = [], { loading = false } = {}) {
  return !loading && list.length === 0;
}
