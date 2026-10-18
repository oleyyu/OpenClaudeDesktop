// R4h-glue-tests (G1): pure decision and orchestration helpers extracted from src/main.jsx so Y1-reviewed wiring
// (R4e-envbranch selectBranch / held-start, R3-toolcards openPaneTile -> fitOpenedLayout, R3-composer /copy refusal and
// restore) is behavior-tested directly rather than only through source-string regexes.
import { branchSwitchPlan, checkedOutBranch, startBranchCheck, heldStartKey, heldStartStep } from "./branch-picker-model.mjs";
import { PANE_KINDS, openPane as openPaneInLayout, tileIds } from "./tile-layout-model.mjs";
import { runCopyReply } from "./composer-copy-reply.mjs";

// R4e-envbranch home-15 (cc43287c9 JZ G -> Te, branch-picker-model startBranchCheck): with worktree off, a branch other
// than the checked-out one runs Te (conflict check first; when conflicting, qZ checks whether the branch is missing).
// A newer pick or folder change drops the settled result; finally always ends this check's pending state (ye(n)).
export async function runSelectBranch({
  target,
  environment = false,
  workdir,
  workspaceInfo,
  worktree,
  savedBranch,
  branchPick,
  branchFolder,
  branchCheckRef,
  setBranchCheck,
  endBranchCheck,
  recordBranch,
  setBranchSwitch,
  call,
  branchMissingNotice,
  toasts,
  setError,
  checkStartBranch = startBranchCheck,
}) {
  const folder = workdir, checkedOut = checkedOutBranch(workspaceInfo);
  branchPick.current = target;
  if (branchSwitchPlan({ worktree, current: checkedOut, target }) !== "checkout-on-send") { endBranchCheck(); recordBranch(target); return; }
  // _e({target}): pending until this check settles (ye(n) in finally; a newer pick's own check stays pending).
  const pending = { target, folder };
  branchCheckRef.current = pending; setBranchCheck(pending);
  try {
    const { check, conflict, missing } = await checkStartBranch({ cwd: folder, target,
      conflict: () => call("branch-switch-check", { cwd: folder, target }),
      branches: () => call("workspace-git-branches", { cwd: folder }).then((list) => (Array.isArray(list) ? list : [])) });
    if (branchPick.current !== target || branchFolder.current !== folder) return;
    const head = check?.branch || checkedOut;
    if (missing) {
      recordBranch(head, check?.branch);
      const notice = branchMissingNotice({ branch: target, fallback: head, savedBranch });
      if (toasts) toasts.add(notice.message, { variant: "warning", key: notice.key }); else setError(notice.message);
      return;
    }
    const plan = branchSwitchPlan({ worktree, dirty: conflict, current: head, target });
    if (plan === "resolve-dialog") setBranchSwitch({ cwd: folder, currentBranch: head, targetBranch: target, status: check, ...(environment ? { revertOnCancel: true } : {}) });
    else recordBranch(target, check?.branch);
  } finally { endBranchCheck(pending); }
}

// ye(n) / G's _e(void 0): a settled check ends only its own pending state; a pick that needs no check ends any.
export function finishBranchCheck({ pending, branchCheckRef, setBranchCheck, heldStart, bumpHeldStart }) {
  if (pending && branchCheckRef.current !== pending) return false;
  branchCheckRef.current = null;
  setBranchCheck(null);
  if (heldStart.current) bumpHeldStart();
  return true;
}

// me -> onSelectBranch: a named environment's saved branch marker runs selectBranch once per application.
export function applySavedBranchCheck({ workspaceInfo, startCheckSeen, selectBranch }) {
  const pending = workspaceInfo?.startBranchCheck;
  startCheckSeen.current = pending ?? null;
  if (pending && workspaceInfo.branch === pending.branch) {
    void selectBranch(pending.branch, { environment: true });
    return true;
  }
  return false;
}

// branchCheckPending: a check in flight, or a saved branch shown in the draft that applySavedBranchCheck hasn't taken yet.
export function isStartBranchCheckPending({ workspaceInfo, branchCheckRef, startCheckSeen }) {
  const marker = workspaceInfo?.startBranchCheck;
  return !!branchCheckRef.current || (!!marker && startCheckSeen.current !== marker && workspaceInfo.branch === marker.branch);
}

// xh holdTargetKey's host part; the start branch is be = ve ?? j (the pending target, else the draft's branch).
export function currentHeldStartKey({ current, workdir, worktree, branchCheckRef, workspaceInfo }) {
  return heldStartKey({ session: current, folder: workdir, worktree, branch: branchCheckRef.current?.target ?? workspaceInfo?.branch });
}

// OP gt / Ni (parent: gh || releaseQueuedSubmit()): release a held start once the check settles with its key unchanged,
// or drop it when the key changes or the dirty-tree dialog opens.
export function settleHeldStart({ heldStart, pending, key, branchSwitch, send }) {
  const held = heldStart.current;
  const step = heldStartStep({ held, pending, key, dialog: !!branchSwitch });
  if (step !== "drop" && step !== "release") return step;
  heldStart.current = null;
  if (step === "release") void send({ priority: held.priority });
  return step;
}

// gh holdSubmit: a Home submit while the draft's start-branch check runs is queued behind it.
export function holdStartWhileBranchCheck({ current, pending, priority, key, heldStart, bumpHeldStart }) {
  if (current || !pending) return false;
  heldStart.current = { priority, key };
  bumpHeldStart();
  return true;
}

// A Home submit that beat the workspace-info effect on a named environment with a saved branch: adopt startWorkspace so
// its effect runs Te through selectBranch, hold this start behind it, and restore the draft when stay was active.
export function holdStartOnWorkspaceRace({
  id,
  beside,
  workspaceInfo,
  startWorkspace,
  worktree,
  currentCwd,
  turnCwd,
  priority,
  stay,
  setWorkspaceInfo,
  heldStart,
  bumpHeldStart,
  restoreStay,
}) {
  if (id || beside || workspaceInfo || !startWorkspace?.startBranchCheck || worktree || currentCwd !== turnCwd) return false;
  setWorkspaceInfo((info) => info ?? startWorkspace);
  heldStart.current = { priority, key: heldStartKey({ session: null, folder: turnCwd, worktree, branch: startWorkspace.branch }) };
  bumpHeldStart();
  if (stay) restoreStay();
  return true;
}

// GR onCancel: cancelling the conflict dialog for an environment's saved branch reverts the draft to currentBranch.
export function cancelBranchSwitch({ dialog, recordBranch, setBranchSwitch }) {
  if (dialog?.revertOnCancel) recordBranch(dialog.currentBranch);
  setBranchSwitch(null);
}

// R3-toolcards TT-14 (c03935b01 W / Ei): a pane the layout did not have yet goes through the shown host's
// fitOpenedLayout (...o ? U(n) : W(n, e, void 0)), while one already in the base layout skips fitting.
export function openSessionPaneTile(tileStore, sessionId, kind, { paneWindow = false } = {}) {
  if (paneWindow) return null;
  if (!sessionId || !PANE_KINDS.includes(kind)) return null;
  const entry = tileStore.getSession(sessionId);
  const base = (entry?.expandedTile ? entry.baseLayout : entry?.tileLayout) ?? null;
  const opened = openPaneInLayout(base, kind, tileStore.getState().lastPaneFlexByKind);
  const next = base && tileIds(base).has(kind) ? opened : tileStore.fitOpenedLayout(sessionId, opened);
  tileStore.setSession(sessionId, { tileLayout: next, baseLayout: null, expandedTile: null });
  return next;
}

// R3-composer /copy [N] (cc43287c9 case "copy-reply"): a refusal returns false so executeCommand returns before
// clearCommand() and keeps the draft; a ran copy clears the draft and, if the clipboard write fails, restores '/copy N'
// only into this session's empty composer.
export function executeCopyCommand({
  args = "",
  items = [],
  running = false,
  node = null,
  notice = () => {},
  current = null,
  currentRef = { current },
  setDraft = () => {},
  clearCommand,
  run = runCopyReply,
} = {}) {
  const copyOrigin = current;
  const outcome = run({
    arg: args,
    items,
    responding: running,
    node,
    notify: notice,
    restore: (text) => {
      if (currentRef.current === copyOrigin) setDraft((value) => value.trim() === "" ? text : value);
    },
  });
  if (outcome.status === "refused") return false;
  clearCommand?.();
  return true;
}
