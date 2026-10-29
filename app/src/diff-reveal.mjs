// A request to show one file's section in the Changes pane (the per-turn edits card's file rows, Vpe x8 onOpen → by(path)).
// The pane may not be mounted yet when the request is made, so the latest request waits here until a Changes diff
// that lists a matching file takes it. Paths may be absolute (a core's fileChange) while the diff's are relative to
// the repository or the session folder: the longest diff path that the request ends with wins.

let pending = null;
const listeners = new Set();

/** The diff path a request names, or null. Pure. */
export function matchDiffPath(request, paths) {
  const wanted = typeof request === "string" ? request.replace(/^\.\//, "") : "";
  if (!wanted) return null;
  let best = null;
  for (const path of paths || []) {
    if (typeof path !== "string" || !path) continue;
    if (path === wanted) return path;
    if ((wanted.endsWith(`/${path}`) || path.endsWith(`/${wanted}`)) && (!best || path.length > best.length)) best = path;
  }
  return best;
}

/** `options.anchor` ({side, line}) is a line the request points at (a review finding's scrollToAnnotation): such a
 * request still shows the file, but is not a plain jump for the file tree (Vo, see diffTreeJumpTarget). */
export function requestDiffReveal(path, options) {
  if (typeof path !== "string" || !path) return;
  pending = { path, at: Date.now(), ...(options?.anchor && { anchor: options.anchor }) };
  for (const listener of [...listeners]) listener();
}

/** The waiting request among `paths`, consuming it: {path (the matching diff path), anchor?}; null when none matches
 * (it keeps waiting). */
export function takeDiffRevealRequest(paths) {
  if (!pending) return null;
  // A request nobody could take (the pane showed another scope) does not linger into a later visit.
  if (Date.now() - pending.at > 10000) { pending = null; return null; }
  const match = matchDiffPath(pending.path, paths);
  if (!match) return null;
  const taken = { path: match, ...(pending.anchor && { anchor: pending.anchor }) };
  pending = null;
  return taken;
}

/** The waiting request's matching path among `paths`, consuming it; null when none matches (it keeps waiting). */
export function takeDiffReveal(paths) {
  return takeDiffRevealRequest(paths)?.path ?? null;
}

export function subscribeDiffReveal(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---- per-session scroll targets (3.6556.2 cc8941b7b, the diff-annotations store's scrollTargetBySession) ----------
// The Changes diff records each file it is asked to show as the session's scroll target, the way the official store's
// scrollToAnnotation does (`{filePath, nonce: (previous?.nonce ?? 0) + 1, fuzzy?, tileId?, anchor?}`), and drops it once
// the diff has taken it (clearScrollTarget). A new object per request is what lets the file tree count jumps (Vo).
let targets = {};
const targetListeners = new Set();
function setTargets(next) {
  if (next === targets) return;
  targets = next;
  for (const listener of [...targetListeners]) listener();
}

/** cc8941b7b scrollToAnnotation(session, filePath, {fuzzy, tileId, anchor}). */
export function scrollDiffTarget(sessionId, filePath, options) {
  if (sessionId === undefined || sessionId === null) return;
  setTargets({
    ...targets,
    [sessionId]: {
      filePath,
      nonce: (targets[sessionId]?.nonce ?? 0) + 1,
      ...(options?.fuzzy && { fuzzy: true }),
      ...(options?.tileId && { tileId: options.tileId }),
      ...(options?.anchor && { anchor: options.anchor }),
    },
  });
}

/** cc8941b7b clearScrollTarget(session). */
export function clearDiffTarget(sessionId) {
  if (sessionId === undefined || sessionId === null || !targets[sessionId]) return;
  const { [sessionId]: _removed, ...rest } = targets;
  setTargets(rest);
}

/** cc8941b7b clearScrollTargetForTile(session, tileId). */
export function clearDiffTargetForTile(sessionId, tileId) {
  if (sessionId === undefined || sessionId === null || targets[sessionId]?.tileId !== tileId) return;
  const { [sessionId]: _removed, ...rest } = targets;
  setTargets(rest);
}

/** The session's scroll target (`scrollTargetBySession[session]`), or undefined. */
export function diffTarget(sessionId) {
  return sessionId === undefined || sessionId === null ? undefined : targets[sessionId];
}

export function subscribeDiffTargets(listener) {
  targetListeners.add(listener);
  return () => targetListeners.delete(listener);
}

/** c44d00c7f Vo's selector: the session's target when it is a plain jump to the active file — not fuzzy, no anchor,
 * and for this tile (or no tile) — else undefined. Pure. */
export function diffTreeJumpTarget(target, tileId, activePath) {
  return target !== undefined && !target.fuzzy && target.anchor === undefined && (!target.tileId || target.tileId === tileId) && target.filePath === activePath
    ? target
    : undefined;
}

/** Tests only. */
export function resetDiffReveal() { pending = null; listeners.clear(); targets = {}; targetListeners.clear(); }
