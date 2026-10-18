import { environmentDefaultBranch } from './generated/code-current/environment-dialog-model.mjs';

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

// ca690a791 ht: an unspecified worktree branch starts from the repository's default branch, else main/master locally;
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
