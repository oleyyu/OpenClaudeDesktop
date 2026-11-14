// Settings › Storage › Clean up inactive sessions: the dialog's rules and copy (2.31226.0 c71860c77-C_7Gqn1u.js
// Mt windows, Gt choices, X action count, Jt summary/labels, Lt progress, Rt announced progress, Xt/Zt/Qt/$t/en/tn/nn
// messages, Ft/Pt errors). The preview and the run are main's (electron/code-cleanup.cjs).
import { t, tn } from "../electron/i18n/index.mjs";

export const CLEANUP_WINDOWS = Object.freeze([30, 60, 90]); // Mt: Days30, Days60, Days90
export const DEFAULT_CLEANUP_CHOICES = Object.freeze({ includeUncommitted: false, deleteSessions: false }); // Gt

/** X: how many items the confirm acts on — sessions to delete, or worktrees to remove. */
export function cleanupActionCount(preview, choices = DEFAULT_CLEANUP_CHOICES) {
  if (!preview) return 0;
  return choices.deleteSessions
    ? preview.sessionCount - (choices.includeUncommitted ? 0 : preview.uncommittedCount)
    : preview.count + (choices.includeUncommitted ? preview.uncommittedCount : 0);
}
/** Jt hasAnything: a preview with any inactive session shows the summary; else the empty line. */
export const cleanupHasAnything = (preview) => !!preview && preview.sessionCount > 0;
/** Jt confirmVariant: danger once something can't be recovered. */
export const cleanupConfirmVariant = (choices) => (choices.includeUncommitted || choices.deleteSessions ? "danger" : "primary");
/** Jt verb. */
export const cleanupVerb = (choices) => (choices.deleteSessions ? "delete" : "remove");

/** Jt confirmLabel. */
export function cleanupConfirmLabel(preview, choices) {
  const count = cleanupActionCount(preview, choices);
  if (!preview || count === 0) return choices.deleteSessions ? t("Delete") : t("Remove");
  return choices.deleteSessions ? tn(count, "Delete {count} session", "Delete {count} sessions") : tn(count, "Remove {count} worktree", "Remove {count} worktrees");
}
/** nn: the acknowledgement checkbox, or null when nothing is lost. */
export function cleanupAcknowledgeLabel(choices) {
  if (choices.deleteSessions && choices.includeUncommitted) return t("I understand the deleted conversations and the uncommitted changes can’t be recovered");
  if (choices.deleteSessions) return t("I understand deleted conversations can’t be recovered");
  if (choices.includeUncommitted) return t("I understand the uncommitted changes can’t be recovered");
  return null;
}
/** Lt te: the confirm is enabled with something to act on, acknowledged when an acknowledgement is asked. */
export const cleanupCanConfirm = (preview, choices, acknowledged) => cleanupActionCount(preview, choices) > 0 && (acknowledged || cleanupAcknowledgeLabel(choices) === null);

/** Jt summary: the headline and the secondary line under it. size: the formatted byte count ("at least …" when incomplete). */
export function cleanupSummary(preview, choices, size) {
  const headline = preview.count > 0
    ? tn(preview.count, "{count} worktree from inactive sessions · {size}", "{count} worktrees from inactive sessions · {size}", { size })
    : preview.uncommittedCount > 0
      ? tn(preview.sessionCount, "{count} inactive session · only worktrees with uncommitted changes are left", "{count} inactive sessions · only worktrees with uncommitted changes are left")
      : tn(preview.sessionCount, "The inactive session no longer has a worktree", "None of the {count} inactive sessions still has a worktree");
  const note = preview.count === 0 && !choices.deleteSessions ? null
    : choices.deleteSessions ? t("Committed work stays on its branch.") : t("Sessions and their conversations stay. Committed work stays on its branch.");
  return { headline, note };
}
/** Jt empty. */
export const cleanupEmptyText = (days) => t("No Code session has been inactive for {days} days.", { days });
/** The uncommitted checkbox and the delete checkbox (HLLozacr0N / wmojw5mZau). */
export const cleanupUncommittedLabel = (preview, size) => tn(preview.uncommittedCount,
  "Also remove {count} worktree with uncommitted changes ({size}); those changes are lost",
  "Also remove {count} worktrees with uncommitted changes ({size}); those changes are lost", { size });
export function cleanupDeleteLabel(preview, choices) {
  const count = cleanupActionCount(preview, { ...choices, deleteSessions: true });
  return tn(count, "Also delete the inactive session and its conversation", "Also delete the {count} inactive sessions and their conversations");
}

/** Lt P: the visible progress line. */
export const cleanupProgressLabel = (progress, verb) => verb === "remove"
  ? t("Removing {done} of {total}…", progress) : t("Deleting {done} of {total}…", progress);
/** Rt: the announced count moves in tenths, so a screen reader isn't read every item. */
export function announcedProgress({ done, total }) {
  const tenth = Math.floor((done * 10) / Math.max(total, 1));
  return Math.min(done, Math.floor((tenth * total) / 10));
}

/** Xt / Ft / Pt: an error code as copy. */
export function cleanupErrorText(code) {
  if (code === "not-loaded") return t("Your Code sessions are still being gathered. Try again shortly.");
  if (code === "already-running") return t("A cleanup is still finishing. Try again in a moment.");
  return t("Cleanup isn’t available right now.");
}
const removedWorktrees = (count) => tn(count, "Removed {count} worktree.", "Removed {count} worktrees.");
/**
 * Kt messages: what the run reports. result: {removedCount, deletedCount, skippedCount, failedCount, cancelled,
 * errorCode?} from main. Returns {success?, error?, retry?} — retry: a fresh preview is due (expired plan).
 */
export function cleanupOutcome(result, choices) {
  const deleting = choices.deleteSessions === true;
  const done = deleting ? result.deletedCount : result.removedCount;
  const withRemoved = (text) => (deleting && result.removedCount > 0 ? `${text} ${removedWorktrees(result.removedCount)}` : text);
  const stopped = () => (deleting && done === 0 && result.removedCount > 0
    ? tn(result.removedCount, "Stopped after removing {count} worktree; no session was deleted.", "Stopped after removing {count} worktrees; no session was deleted.")
    : withRemoved(deleting
      ? (done === 0 ? t("Stopped before deleting anything.") : tn(done, "Stopped after deleting {count} session.", "Stopped after deleting {count} sessions."))
      : (done === 0 ? t("Stopped before removing anything.") : tn(done, "Stopped after removing {count} worktree.", "Stopped after removing {count} worktrees."))));
  if (result.errorCode === "expired") return { retry: true };
  if (result.errorCode) {
    const error = cleanupErrorText(result.errorCode);
    if (done + result.skippedCount + result.failedCount === 0) return { error, keepOpen: true };
    return { error, success: done > 0 ? stopped() : undefined };
  }
  if (result.cancelled) return { success: stopped() };
  const outcome = {};
  if (done > 0 || result.failedCount === 0) {
    const finished = deleting ? tn(done, "Deleted {count} session.", "Deleted {count} sessions.") : removedWorktrees(done);
    outcome.success = result.skippedCount > 0
      ? `${finished} ${tn(result.skippedCount, "{count} was left as it is (in use, pinned, or changed since).", "{count} were left as they are (in use, pinned, or changed since).")}`
      : finished;
  }
  if (result.failedCount > 0) outcome.error = withRemoved(deleting
    ? tn(result.failedCount, "{count} session couldn’t be deleted.", "{count} sessions couldn’t be deleted.")
    : tn(result.failedCount, "{count} worktree couldn’t be removed.", "{count} worktrees couldn’t be removed."));
  return outcome;
}
