"use strict";
// R05 review: the branch-switch dirty gate of the original, GitStatusService.wouldBranchSwitchConflict (asar
// index.chunk-Mak6MV2t.js, helpers y/b; porcelain paths index.chunk-CK46d8Dd.js `i`). A dirty tree blocks a switch
// only when an entry is unmerged or a dirty path is one the target commit changes (`git diff --name-only --no-renames
// -z HEAD <target>`, an ancestor or descendant counts); otherwise the pick is recorded and 'git switch' carries the
// changes over. A failed refinement falls back to the any-dirty gate. Pure over an injected git runner.

// `git status --porcelain -z` (v1): "XY PATH\0", a rename or copy adds "ORIG_PATH\0"; untracked folders end in '/'.
const UNMERGED = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
function porcelainEntries(stdout) {
  const parts = String(stdout || "").split("\0"), entries = [];
  for (let index = 0; index < parts.length; index += 1) {
    const record = parts[index];
    if (record.length < 4 || record[2] !== " ") continue;
    const xy = record.slice(0, 2), entry = { xy, path: record.slice(3), unmerged: UNMERGED.has(xy) };
    if (/[RC]/.test(xy) && index + 1 < parts.length) entry.origPath = parts[++index];
    entries.push(entry);
  }
  return entries;
}
const dirtyPaths = (entries) => entries.flatMap((entry) => (entry.origPath ? [entry.path, entry.origPath] : [entry.path]));
function addAncestors(file, into) {
  for (let slash = file.indexOf("/"); slash !== -1; slash = file.indexOf("/", slash + 1)) into.add(file.slice(0, slash));
}
// b(e, t): a dirty path (or untracked folder) overlaps a changed path, one of its folders, or one of its own folders.
function pathsOverlap(dirty, changed) {
  const files = new Set(changed), folders = new Set();
  for (const file of changed) addAncestors(file, folders);
  return dirty.some((entry) => {
    const file = entry.endsWith("/") ? entry.slice(0, -1) : entry;
    if (files.has(file) || folders.has(file)) return true;
    for (let slash = file.indexOf("/"); slash !== -1; slash = file.indexOf("/", slash + 1)) if (files.has(file.slice(0, slash))) return true;
    return false;
  });
}
// resolveBranchTargetCommit: the local branch first, then origin's.
async function targetCommit(git, target) {
  for (const ref of [`refs/heads/${target}`, `refs/remotes/origin/${target}`]) {
    const commit = String(await git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).catch(() => "")).trim();
    if (commit) return commit;
  }
  return null;
}
// git(args) → Promise<stdout>, run in the folder being switched.
async function wouldBranchSwitchConflict(entries, target, git) {
  if (!entries.length) return false;
  if (typeof target !== "string" || !target || target.startsWith("-")) return true;
  if (entries.some((entry) => entry.unmerged)) return true;
  try {
    const commit = await targetCommit(git, target);
    if (!commit) return true;
    const changed = String(await git(["diff", "--name-only", "--no-renames", "-z", "HEAD", commit])).split("\0").filter(Boolean);
    return pathsOverlap(dirtyPaths(entries), changed);
  } catch {
    return true;
  }
}

module.exports = { porcelainEntries, dirtyPaths, pathsOverlap, wouldBranchSwitchConflict };
