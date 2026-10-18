// Archive / delete of a session that works in its own worktree: the uncommitted-changes check and its confirm copy
// (2.31226.0 shared-19-DmuztgN-.js, readable analysis/code-ui-sync-20261013/readable/shared-19-DmuztgN-.js.readable.js:
// RG/zG probe statuses :18651-18676, fK 5 s deadline + vK :18806/:18932-18950, TK copy :19084-19164, EK :19165-19178,
// DK + bK :19179-19203/:18966, IK phase machine :19373-19418 with its 500 ms second-press guard, BK :19420-19700).
// The probe is main's worktree-status (electron/main.cjs over worktrees.cjs worktreeStatus: count + porcelain lines).
import { t, tn } from "../electron/i18n/index.mjs";

export const WORKTREE_CHANGES_SHOWN = 10; // bK
export const WORKTREE_PROBE_DEADLINE_MS = 5000; // fK
export const WORKTREE_DIRTY_GUARD_MS = 500; // IK / SK: Date.now() - s >= 500

/**
 * A worktree-status answer (or null when the call failed) as the probe statuses RG/zG use:
 * - none: the session has no worktree of its own, or another session still works there (nothing is discarded);
 * - clean / dirty: git read it; dirty carries the porcelain lines and the full count;
 * - unknown: the check failed (git error, or no answer). `worktree` is the status to dispose of afterwards (null: keep).
 */
export function worktreeProbe(status) {
  if (!status || typeof status !== "object") return { status: "unknown", changes: [], count: 0, worktree: null };
  if (!status.worktree || status.shared) return { status: "none", changes: [], count: 0, worktree: null };
  if (status.unknown) return { status: "unknown", changes: [], count: 0, worktree: status };
  const count = Number.isFinite(status.changes) ? status.changes : 0;
  const changes = Array.isArray(status.files) ? status.files.filter((line) => typeof line === "string" && line.trim()) : [];
  if (count > 0 || changes.length > 0) return { status: "dirty", changes, count: Math.max(count, changes.length), worktree: status };
  return { status: "clean", changes: [], count: 0, worktree: status };
}

/**
 * 2.42304.0 shared-19 EY S: a press of the dirty confirm counts only 500 ms after the later of the queue advancing to it
 * (`guardSince`, EY d.current) and the confirm opening (`openedAt`, set by vY only for a confirm that follows another
 * dialog: `...(afterDialog && { openedAt: Date.now() })`). Neither known (0 / undefined): the press counts.
 */
export function worktreeConfirmReady({ now = Date.now(), guardSince = 0, openedAt = 0 } = {}) {
  return now - Math.max(guardSince ?? 0, openedAt ?? 0) >= WORKTREE_DIRTY_GUARD_MS;
}

/** DK: the first ten lines and how many more there are. */
export function worktreeChangeList(changes = []) {
  const list = Array.isArray(changes) ? changes : [];
  return { shown: list.slice(0, WORKTREE_CHANGES_SHOWN), more: Math.max(0, list.length - WORKTREE_CHANGES_SHOWN) };
}

/**
 * TK for one worktree (no folders): title, confirm label and description of the confirm for `action` (archive /
 * delete) in `phase` (confirm / checking / dirty / unknown). Null fields leave the dialog's own copy (BK keeps the
 * "Delete session?" copy until the check answers).
 */
export function worktreeConfirmCopy(action, phase, count = 0) {
  const archive = action === "archive", dirty = phase === "dirty", checking = phase === "checking";
  if (phase !== "dirty" && phase !== "unknown") {
    return { title: null, confirmLabel: null, description: checking ? t("Checking for uncommitted changes…") : null };
  }
  return {
    title: dirty
      ? (archive ? t("Archive session with uncommitted changes?") : t("Delete session with uncommitted changes?"))
      : t("Delete session?"),
    confirmLabel: archive ? t("Archive anyway") : t("Delete anyway"),
    description: dirty
      ? tn(count, "This session’s worktree has {count} uncommitted change that will be permanently discarded.",
        "This session’s worktree has {count} uncommitted changes that will be permanently discarded.")
      : t("Couldn’t check this session’s worktree for uncommitted changes. Anything uncommitted in it will be permanently discarded."),
  };
}

/**
 * IK: the delete confirm's phase machine. The first press of Delete starts the check (phase "checking"; presses are
 * ignored meanwhile); a clean (or worktree-less) answer decides at once, a dirty one shows the file list and a deadline
 * of 5 s without an answer shows the "couldn't check" copy. A late answer still applies (vK keeps listening after the
 * deadline). Once the dirty/unknown copy is up, a press counts only after 500 ms, so a double press can't confirm what
 * it never showed. `decide({confirmedDirty, probe})` runs once; `cancel()` stops listening.
 */
export function createWorktreeDisposeCheck({ probe, decide, onChange, now = () => Date.now(), schedule = setTimeout, clear = clearTimeout }) {
  let state = { phase: "confirm", changes: [], count: 0, probe: null }, shownAt = 0, settled = false, listening = false, deadline = null;
  const update = (patch) => {
    if (patch.phase === "unknown" || patch.phase === "dirty") shownAt = now();
    state = { ...state, ...patch };
    onChange?.(state);
  };
  const finish = (result) => {
    if (settled) return;
    settled = true; listening = false;
    if (deadline !== null) { clear(deadline); deadline = null; }
    decide?.(result);
  };
  const answer = (result) => {
    if (!listening || settled) return;
    if (deadline !== null) { clear(deadline); deadline = null; }
    const outcome = worktreeProbe(result);
    if (outcome.status === "dirty") update({ phase: "dirty", changes: outcome.changes, count: outcome.count, probe: outcome });
    else if (outcome.status === "unknown") update({ phase: "unknown", changes: [], count: 0, probe: outcome });
    else finish({ confirmedDirty: false, probe: outcome });
  };
  return {
    get state() { return state; },
    press() {
      if (settled) return;
      if (state.phase === "confirm") {
        update({ phase: "checking" });
        listening = true;
        deadline = schedule(() => { deadline = null; if (!settled && state.phase === "checking") update({ phase: "unknown", probe: worktreeProbe(null) }); }, WORKTREE_PROBE_DEADLINE_MS);
        let pending;
        try { pending = Promise.resolve(probe()); } catch { pending = Promise.resolve(null); }
        pending.then(answer, () => answer(null));
        return;
      }
      if (state.phase === "checking" || now() - shownAt < WORKTREE_DIRTY_GUARD_MS) return;
      finish({ confirmedDirty: true, probe: state.probe });
    },
    cancel() { settled = true; listening = false; if (deadline !== null) { clear(deadline); deadline = null; } },
  };
}
