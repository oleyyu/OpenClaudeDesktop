// Settings › Storage › Clean up inactive sessions (2.31226.0 main index.chunk-CiiI592G.js DeviceStorage
// previewCodeCleanup rfa / runCodeCleanup afa→ifa / cancelCodeCleanup ffa, plan nfa, worktree state cfa/lfa).
// A preview lists the Code sessions inactive for at least 30, 60 or 90 days and what each one's worktree holds; the
// run takes that preview's token (one use, expired by a newer preview) and removes the clean worktrees, optionally
// the ones with uncommitted changes, and optionally deletes the sessions themselves. Every item is checked again
// when its turn comes: one that became active, shown, pinned or changed since is left as it is ("skipped").
// Electron-free: main.cjs passes the app's config, the core reads and the worktree helpers, so the rules are tested.
const crypto = require("node:crypto");
const path = require("node:path");

const WINDOWS = Object.freeze({ 30: 30, 60: 60, 90: 90 });
const DAY = 24 * 60 * 60 * 1000;
const PLAN_TTL = 10 * 60 * 1000;
const READ_CONCURRENCY = 4; // qda
const MAX_UNCOMMITTED_LISTED = 200; // Yda
const ERROR = Object.freeze({ NotLoaded: "not-loaded", Expired: "expired", AlreadyRunning: "already-running" });
const EMPTY = Object.freeze({ removedCount: 0, deletedCount: 0, skippedCount: 0, failedCount: 0, cancelled: false });

const finiteMs = (seconds) => (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null);
async function inBatches(items, size, work) {
  for (let index = 0; index < items.length; index += size) await Promise.all(items.slice(index, index + size).map(work));
}
// tfa: the largest first, as {title, bytes}.
function examples(sessions, bytesOf, limit) {
  return [...sessions].sort((left, right) => bytesOf(right) - bytesOf(left)).slice(0, limit).map((entry) => ({ title: entry.title, bytes: bytesOf(entry) }));
}

/**
 * deps:
 *   getConfig()                      the app config (threadIds, archivedThreadIds, threadMetadata, sessionMetadata,
 *                                    restoredAt, pinnedOrder, worktreeDirectories)
 *   save()                           persist the config after a worktree is forgotten
 *   connected()                      whether the core is connected (else 'not-loaded', as an incomplete roster)
 *   readThread(id)                   the core's thread/read {thread} without turns (throws when it can't)
 *   inUse(id)                        a window shows the session, a turn of it runs, or a workflow it launched still
 *                                    runs (may return a promise)
 *   isCowork(id)                     a Cowork session (not a Code session: never listed)
 *   worktreeStatus(dir)              worktrees.cjs worktreeStatus {exists, changes, unknown?}
 *   removeWorktree(dir)              worktrees.cjs removeWorktree → whether the folder is gone
 *   forgetWorktree(config, dir)      worktrees.cjs forgetWorktree
 *   directoryUsage(dir)              {bytes, incomplete}
 *   deleteSession(id)                the app's own thread/delete (core + session list)
 *   onProgress(done, total)          codeCleanupProgress
 *   now()                            Date.now
 */
function createCodeCleanup(deps) {
  const now = deps.now ?? Date.now;
  let generation = 0, plan = null, running = null;

  const config = () => deps.getConfig() || {};
  const known = (id) => [...(config().threadIds || []), ...(config().archivedThreadIds || [])].includes(id);
  const worktreeOf = (id) => {
    const cwd = config().threadMetadata?.[id]?.cwd;
    if (typeof cwd !== "string") return null;
    return (config().worktreeDirectories || []).find((dir) => typeof dir === "string" && path.resolve(dir) === path.resolve(cwd)) ?? null;
  };
  const usersOf = (dir) => [...(config().threadIds || []), ...(config().archivedThreadIds || [])]
    .filter((id) => typeof config().threadMetadata?.[id]?.cwd === "string" && path.resolve(config().threadMetadata[id].cwd) === path.resolve(dir));
  const pinned = (id) => (config().pinnedOrder || []).includes(id);

  // A session's last activity, or null when it can't be told (a failed read is never permission to clean up).
  // The recorded metadata only ever lags the core, so a recent value settles it without a read.
  async function inactiveFor(id, cutoff) {
    if (deps.isCowork?.(id) || (await deps.inUse?.(id))) return null;
    const restored = Number(config().restoredAt?.[id]);
    if (Number.isFinite(restored) && restored > cutoff) return null;
    const recorded = finiteMs(config().threadMetadata?.[id]?.updatedAt);
    if (recorded !== null && recorded > cutoff) return null;
    let thread;
    try { thread = (await deps.readThread(id))?.thread; } catch { return null; }
    const updated = finiteMs(thread?.updatedAt);
    if (!thread || updated === null || updated > cutoff) return null;
    if (!["idle", "notLoaded"].includes(thread.status?.type ?? "idle")) return null;
    const title = typeof thread.name === "string" && thread.name.trim() ? thread.name.trim()
      : typeof config().threadMetadata?.[id]?.name === "string" ? config().threadMetadata[id].name : typeof thread.preview === "string" ? thread.preview.trim().slice(0, 120) : "";
    return { id, lastActivity: updated, title };
  }
  // cfa/lfa: 'none' (no worktree any more), 'clean', 'uncommitted', or 'hold' (status unknown, or another session that
  // is not being cleaned up still works there).
  async function worktreeState(id, candidates) {
    const dir = worktreeOf(id);
    if (!dir) return { state: "none", dir: null };
    if (usersOf(dir).some((other) => other !== id && !candidates.has(other))) return { state: "hold", dir };
    let status;
    try { status = await deps.worktreeStatus(dir); } catch { return { state: "hold", dir }; }
    if (!status?.exists) return { state: "none", dir };
    if (status.unknown) return { state: "hold", dir };
    return { state: status.changes > 0 ? "uncommitted" : "clean", dir };
  }

  // rfa: the preview for one window (30, 60 or 90 days).
  async function preview(windowDays) {
    const days = WINDOWS[Number(windowDays)];
    if (!days) throw new Error("Unknown cleanup window.");
    const mine = ++generation;
    plan = null;
    if (!deps.connected()) return { errorCode: ERROR.NotLoaded };
    const cutoff = now() - days * DAY;
    const ids = [...new Set([...(config().threadIds || []), ...(config().archivedThreadIds || [])])];
    const found = [];
    await inBatches(ids, READ_CONCURRENCY, async (id) => { const entry = await inactiveFor(id, cutoff); if (entry) found.push(entry); });
    if (mine !== generation) return { errorCode: ERROR.Expired };
    const candidates = new Set(found.map((entry) => entry.id));
    await inBatches(found, READ_CONCURRENCY, async (entry) => Object.assign(entry, await worktreeState(entry.id, candidates)));
    if (mine !== generation) return { errorCode: ERROR.Expired };
    const sessions = found.filter((entry) => entry.state !== "hold");
    const clean = sessions.filter((entry) => entry.state === "clean");
    const sizes = new Map();
    for (const dir of new Set(sessions.filter((entry) => entry.state === "clean" || entry.state === "uncommitted").map((entry) => entry.dir))) {
      try { sizes.set(dir, await deps.directoryUsage(dir)); } catch { sizes.set(dir, { bytes: 0, incomplete: true }); }
    }
    if (mine !== generation) return { errorCode: ERROR.Expired };
    const bytesOf = (entry) => (entry.dir ? sizes.get(entry.dir)?.bytes ?? 0 : 0);
    const uncommitted = sessions.filter((entry) => entry.state === "uncommitted").sort((left, right) => bytesOf(right) - bytesOf(left)).slice(0, MAX_UNCOMMITTED_LISTED);
    // A shared folder is counted once.
    const sum = (list) => [...new Set(list.map((entry) => entry.dir))].reduce((total, dir) => total + (sizes.get(dir)?.bytes ?? 0), 0);
    const oldestFirst = (list) => [...list].sort((left, right) => left.lastActivity - right.lastActivity).map((entry) => entry.id);
    const token = crypto.randomUUID();
    plan = { token, generation: mine, olderThanDays: days, createdAt: now(), sessionIds: oldestFirst(sessions), worktreeIds: oldestFirst(clean), uncommittedIds: oldestFirst(uncommitted), bytes: sum(clean) };
    return {
      preview: {
        token, olderThanDays: days, count: clean.length, bytes: plan.bytes,
        incomplete: clean.some((entry) => sizes.get(entry.dir)?.incomplete === true),
        examples: examples(clean, bytesOf, uncommitted.length > 0 ? 3 : 5),
        uncommittedCount: uncommitted.length, uncommittedBytes: sum(uncommitted),
        uncommitted: examples(uncommitted, bytesOf, MAX_UNCOMMITTED_LISTED),
        sessionCount: sessions.length,
      },
    };
  }

  // afa/ifa: run a preview's plan once.
  async function run(token, options = {}) {
    if (running) return { ...EMPTY, errorCode: ERROR.AlreadyRunning };
    const taken = plan && plan.token === token && plan.generation === generation && now() - plan.createdAt < PLAN_TTL ? plan : null;
    plan = null;
    if (!taken) return { ...EMPTY, errorCode: ERROR.Expired };
    if (!deps.connected()) return { ...EMPTY, errorCode: ERROR.NotLoaded };
    const includeUncommitted = options.includeUncommitted === true, deleteSessions = options.deleteSessions === true;
    const discard = new Set(includeUncommitted ? taken.uncommittedIds : []);
    const worktreeTargets = new Set([...taken.worktreeIds, ...discard]);
    const held = new Set(includeUncommitted ? [] : taken.uncommittedIds);
    const ids = taken.sessionIds.filter((id) => (deleteSessions ? !held.has(id) : worktreeTargets.has(id)));
    const state = { cancelled: false };
    running = state;
    let removed = 0, deleted = 0, skipped = 0, failed = 0, done = 0;
    const removedDirs = new Set();
    const cutoff = now() - taken.olderThanDays * DAY;
    try {
      deps.onProgress?.(0, ids.length);
      for (const id of ids) {
        if (state.cancelled) break;
        const outcome = await cleanOne(id);
        if (outcome === "skipped") skipped++;
        else if (outcome === "failed") failed++;
        done++;
        deps.onProgress?.(done, ids.length);
      }
    } finally { running = null; }
    return { removedCount: removed, deletedCount: deleted, skippedCount: skipped, failedCount: failed, cancelled: state.cancelled };

    async function cleanOne(id) {
      if (!known(id) || !(await inactiveFor(id, cutoff))) return "skipped";
      const candidates = new Set(ids);
      const { state: worktree, dir } = await worktreeState(id, candidates);
      if (worktree === "hold") return "skipped";
      if (worktree === "uncommitted" && !discard.has(id)) return "skipped";
      const removing = worktree === "clean" || worktree === "uncommitted";
      // Its folder went with a session sharing it earlier in this run.
      const cwd = config().threadMetadata?.[id]?.cwd;
      const gone = worktree === "none" && typeof cwd === "string" && removedDirs.has(path.resolve(cwd));
      if (removing && !worktreeTargets.has(id)) return "skipped";
      // A pinned session keeps its conversation and any uncommitted changes.
      if ((deleteSessions || worktree === "uncommitted") && pinned(id)) return "skipped";
      let cleaned = false;
      try {
        if (removing) {
          if (!(await deps.removeWorktree(dir))) return "failed";
          const current = config();
          deps.forgetWorktree(current, dir);
          deps.save();
          removedDirs.add(path.resolve(dir));
          removed++; cleaned = true;
        }
        if (!deleteSessions) return cleaned || gone ? "done" : "skipped";
        if (state.cancelled) return cleaned || gone ? "done" : "skipped";
        await deps.deleteSession(id);
        deleted++;
        return "done";
      } catch { return "failed"; }
    }
  }

  function cancel() { if (running) running.cancelled = true; }
  return { preview, run, cancel, get running() { return !!running; } };
}

module.exports = { createCodeCleanup, CLEANUP_WINDOWS: Object.keys(WINDOWS).map(Number), CLEANUP_ERROR: ERROR };
