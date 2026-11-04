// E42: the pure ca690a791 draft model (3.6556.2), not environment-dialog-model.mjs, whose compiled height hold reaches
// view-tabs (this module is imported by plain `node --test`).
import { environmentDefaultBranch } from './generated/code-current/environment-dialog-draft.mjs';

// shared-11 Vd (a folder's git info, {branch, defaultBranch} for a repository, null otherwise), answered from the host's
// workspace-info: the checked-out branch, and origin/HEAD's branch as the default when the repository has it as a local
// branch (the host starts worktrees from local refs; branch-picker-model's defaultBranch makes the same choice).
// Host difference: the official info is null for a repository without a parseable remote; the host always has one here.
export function environmentGitInfo(repository) {
  if (!repository?.isRepo) return null;
  const branches = Array.isArray(repository.branches) ? repository.branches : [];
  const head = typeof repository.originHead === 'string' ? repository.originHead.replace(/^refs\/remotes\//, '').replace(/^origin\//, '') : '';
  return { branch: repository.branch || undefined, defaultBranch: head && branches.includes(head) ? head : undefined };
}

// ca690a791 wt(...)[0] for the primary folder: its repository root, null when it is known not to be in one, undefined while
// unknown (no answer yet, or git unavailable inside a repository). The official dialog computes these roots only with
// folderCheckouts; the host keeps additional-folder checkouts off but still knows the primary folder's repository.
export function environmentFolderRoot(repository, folder) {
  if (!folder || repository?.cwd !== folder) return undefined;
  if (repository.isRepo) return folder;
  return repository.gitUnavailable ? undefined : null;
}

// ca690a791 Pt (2.42304.0 ht): an unspecified worktree branch starts from the repository's default branch, else main/master locally;
// an ordinary checkout keeps its current branch. Explicit branches win.
// R4e-envbranch home-15 (2.42304.0 cc43287c9 me → onSelectBranch → JZ G → Te): with worktree off, a saved branch other
// than the checked-out one is a branch switch, so it takes the same check as a pick from the branch menu (main.jsx
// selectBranch: conflict check, then the missing-branch check qZ). The draft shows it meanwhile, as the official
// display does while the check is pending (Se = ve.target); `startBranchCheck` asks for that check, a fresh object for
// every application (a later spread of the same workspace keeps it, so the check runs once per application). With
// worktree on, G records the branch as the worktree's base without any check (M(e)).
export function environmentWorkspace(repository, environment) {
  if (!repository?.isRepo || !environment) return repository;
  const branch = environment.settings?.branch
    || (environment.settings?.worktree ? environmentDefaultBranch(environmentGitInfo(repository), repository.branches ?? [], 'local') : undefined)
    || repository.branch;
  const saved = environment.settings?.branch;
  const check = !environment.settings?.worktree && typeof saved === 'string' && saved && saved !== repository.branch;
  return { ...repository, branch, checkedOut: repository.branch, ...(check ? { startBranchCheck: { branch: saved } } : {}) };
}

// W14-code r5-composer-03 / fr5-06: what a start from a picked saved environment changed, cc43287c9 $oe's place half
// (`i.pin !== e.branch` → "branch", `s.worktree !== c.worktree` → "worktree") as Aue keeps it for the start line
// (`l.fields.filter(jue)`, jue: branch | worktree; model / effort / fast mode are not start-line changes, and a local
// environment here saves only place settings). `workspace` is the start's workspace info (the environment already
// applied by environmentWorkspace, plus the user's picks) and `worktree` the start's worktree switch. Host: the
// branch baseline is the branch applying the environment gives under the start's worktree switch (its saved branch,
// else the default / checked-out branch: Pt), so an unpicked branch is no change. Fields come in $oe's order; `patch`
// is what Update environment writes (captureDraftFor → patchEnvironmentSettings(id, FF(a).place)).
export function environmentStartChanges(environment, workspace, worktree) {
  const fields = [], patch = {};
  if (!environment || !workspace?.isRepo) return { fields, patch };
  const settings = environment.settings ?? {};
  const branch = typeof workspace.branch === 'string' && workspace.branch ? workspace.branch : undefined;
  const checkedOut = typeof workspace.checkedOut === 'string' ? workspace.checkedOut : branch;
  const baseline = environmentWorkspace({ ...workspace, branch: checkedOut }, { settings: { ...settings, worktree: worktree === true } })?.branch;
  if (branch !== undefined && branch !== baseline) { fields.push('branch'); patch.branch = branch; }
  if ((settings.worktree === true) !== (worktree === true)) { fields.push('worktree'); patch.worktree = worktree === true; }
  return { fields, patch };
}
