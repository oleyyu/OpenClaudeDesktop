import { t, tn } from "../electron/i18n/index.mjs";
import { startBranchMissing } from "./generated/r4e-envbranch/start-branch-missing.mjs";

// Composer branch picker, step 1 (2.2553.1 cc43287c9-BMbiZYzF.js:22009-22035
// hT props, :12050-12071 branch order; cd2687f9f-CY3xvb9b.js N combobox).
// - Default branch: the repo's defaultBranch (F). Locally that is origin/HEAD's
//   target when the repo has it as a local branch, else main, else master
//   (the source's own main/master fallback for the starting branch, :12057).
// - Order (oe): the default branch first, the rest by localeCompare; a default
//   missing from the list is prepended.
// - Search: Y filters on input; Enter selects the first match (Q) when the
//   query is non-empty; an empty result shows the Empty row "No branches match".
//   The source ranks matches with a fuzzy index over the name after the last
//   "/" (weight .7) and the full label (.3); locally a case-insensitive
//   substring match on the label keeps the sorted order.
// - Trigger label: the chosen branch or "—" (triggerLabel c ?? "—").

export const BRANCH_SEARCH_PLACEHOLDER = t("Search branches…");
export const BRANCH_EMPTY_MESSAGE = t("No branches match");
export const BRANCH_TOOLTIP = t("Branch to start from");

/** F: origin/HEAD ("origin/main" or "main") when it is a local branch, else main, else master, else null. */
export function defaultBranch({ originHead = "", branches = [] } = {}) {
  const list = Array.isArray(branches) ? branches : [];
  const head = typeof originHead === "string" ? originHead.replace(/^refs\/remotes\//, "").replace(/^origin\//, "") : "";
  if (head && list.includes(head)) return head;
  return list.find((name) => name === "main") ?? list.find((name) => name === "master") ?? null;
}

/** oe: default first, then localeCompare; a missing default is prepended. */
export function sortBranches(branches = [], preferred = null) {
  const sorted = [...new Set(Array.isArray(branches) ? branches : [])].sort((left, right) => {
    if (preferred) {
      if (left === preferred) return -1;
      if (right === preferred) return 1;
    }
    return left.localeCompare(right);
  });
  return preferred && !sorted.includes(preferred) ? [preferred, ...sorted] : sorted;
}

/** Y: every branch for an empty query, else the ones whose label contains it. */
export function filterBranches(sorted = [], query = "") {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return [...sorted];
  return sorted.filter((label) => label.toLowerCase().includes(needle));
}

/** Enter in the search field: the first match, only for a non-empty query. */
export function enterSelection(sorted = [], query = "") {
  if (!String(query ?? "").trim()) return null;
  return filterBranches(sorted, query)[0] ?? null;
}

/** triggerLabel: c ?? "—". */
export function branchTriggerLabel(branch) {
  return typeof branch === "string" && branch ? branch : "—";
}

// Branch step 2 (cc43287c9-BMbiZYzF.js:12084-12145 me/he/ge, :35132 branchChanged at spawn). With worktree on the
// pick is only the worktree's base (D(e)); with it off, a branch other than the checked-out one first checks the
// working tree (me: checkBranchSwitchConflict / isWorkingTreeDirty; a failed check counts as dirty): a clean tree
// records the target and the spawn switches to it, a dirty one opens the GR dialog (ue(t)).
// Returns 'none' | 'worktree' | 'checkout-on-send' | 'resolve-dialog'.
export function branchSwitchPlan({ worktree = false, dirty = false, current = "", target } = {}) {
  if (typeof target !== "string" || !target || target === current) return "none";
  if (worktree) return "worktree";
  return dirty ? "resolve-dialog" : "checkout-on-send";
}

/** The checked-out branch: a recorded pick keeps the real one in `checkedOut` until the spawn switches to it. */
export function checkedOutBranch(info) {
  return typeof info?.checkedOut === "string" ? info.checkedOut : (info?.branch || "");
}

/** The branch a worktree-less spawn must switch to first (:35132), or null. */
export function branchCheckoutTarget(info) {
  if (!info?.isRepo || typeof info.branch !== "string" || !info.branch) return null;
  return info.branch !== checkedOutBranch(info) ? info.branch : null;
}

// R4e-envbranch home-15: Te (2.42304.0 cc43287c9 JZ; G calls it after the trust check for a branch other than the
// checked-out one with worktree off, which is also where a named environment's saved branch lands: me →
// onSelectBranch → G). The conflict check comes first (checkBranchSwitchConflict; a failed check counts as
// conflicting, r = !0); only a conflicting or dirty tree asks qZ whether the branch is missing (generated
// r4e-envbranch/start-branch-missing.mjs: not origin/… or a sha, a non-empty fresh local-branch list without it, and
// isBranchOnOrigin === false). Te then clears the pick and warns when missing, opens the dirty-tree dialog when only
// conflicting, else records the pick.
//   conflict(cwd, target) → the host's branch-switch-check answer ({ dirty, branch, … }); branches() → the folder's
//   local branches, fresh (yC refetch, getLocalBranches).
// Returns { check, conflict, missing }: `check` the answer or null, `conflict` its dirty bit (true without one).
export async function startBranchCheck({ cwd, target, conflict, branches, missing = startBranchMissing }) {
  let check = null;
  try { check = await conflict(cwd, target); } catch {}
  const conflicting = check ? check.dirty === true : true;
  const absent = conflicting ? await missing(cwd, target, branches) : false;
  return { check, conflict: conflicting, missing: absent === true };
}

// R4e-envbranch home-15 review: the start held while Te runs (2.42304.0 cc43287c9: JZ returns branchCheckPending:
// ve!==void 0; the draft's gh = pd==="draft" && (startIntent.kind==="local" && (… || Y.branchCheckPending) || …) is the
// composer's holdSubmit, keyed by holdTargetKey xh = QK(bh) whose bh includes pickedSourceBranch: Y.sourceBranch, where
// sourceBranch be = ve ?? j is the pending target. c227f4d5e OP: a submit while held is queued (pt.current = {opts,
// targetKey}); a targetKey change drops it (gt); once the hold lifts the parent calls releaseQueuedSubmit (Ni → Mi(opts))).
// So a check that records the target releases the start; one that clears it (missing) or leaves it on the old pick
// (the dirty-tree dialog, pe(t)) changes the key and drops it, and the draft keeps its text.
//   heldStartKey: the host's part of xh — the session (a draft only), folder, worktree and the start branch (the pending
//   target while a check runs, else the draft's branch).
export function heldStartKey({ session = null, folder = "", worktree = false, branch } = {}) {
  return JSON.stringify([session ?? null, folder || "", worktree === true, typeof branch === "string" && branch ? branch : null]);
}
//   heldStartStep: 'none' (nothing held), 'drop' (the key changed — or, host only, the dirty-tree dialog is open: a
//   named environment's saved branch stays shown in the host draft while GR asks, where official be falls back to j),
//   'wait' (the check is still running), else 'release'.
export function heldStartStep({ held, pending = false, key, dialog = false } = {}) {
  if (!held) return "none";
  if (held.key !== key) return "drop";
  if (pending) return "wait";
  return dialog ? "drop" : "release";
}

// Te's warning (cc0051c10 FA.branchMissing 94ae6MV2dl, addWarning with uniqueKey `branch-missing:${t}`): `fallback` is
// the folder's checked-out branch (de.current, the head the cleared draft falls back to), `savedBranch` the selected
// named environment's settings.branch (saved: some environment with the selected id has settings.branch === t).
export function branchMissingValues({ branch, fallback, savedBranch }) {
  return {
    values: { branch, known: fallback ? "yes" : "no", fallback, saved: typeof savedBranch === "string" && savedBranch === branch ? "yes" : "no" },
    uniqueKey: `branch-missing:${branch}`,
  };
}

// UR (:15860-15912) and GR (:15920-16060) copy.
export const WORKING_TREE_ERROR = t("Couldn’t update the working tree.");
export const BRANCH_SWITCH_MODES = Object.freeze(["stash", "commit", "discard"]);
export const BRANCH_SWITCH_LABELS = Object.freeze({ stash: t("Stash changes"), commit: t("Commit as WIP"), discard: t("Discard changes") });

// B34 RJ otherSessionCount (cc43287c9 :12373 I = Dp(h), shared-8 cp): the sessions that are not archived and whose
// cwd is the folder being switched, without the session the switch is for (`exclude`).
export function otherSessionCount(sessions = [], folder, { exclude = null } = {}) {
  if (typeof folder !== "string" || !folder) return 0;
  let count = 0;
  for (const session of sessions ?? []) {
    if (!session || session.archived === true || session.isArchived === true) continue;
    if (session.cwd !== folder || (exclude && session.id === exclude)) continue;
    count++;
  }
  return count;
}
// RJ :17066-17078 (ETzdRE7DsE): the note under the description while other sessions share the folder.
export function otherSessionsNote(count) {
  if (!Number.isFinite(count) || count <= 0) return null;
  return tn(count, "{count} other session is using this folder. Switching branches will affect it too.",
    "{count} other sessions are using this folder. Switching branches will affect them too.");
}
