// Worktree isolation for agent() calls that mutate files in parallel — the
// equivalent of the native runtime's `isolation:'worktree'`. We create a
// detached git worktree at HEAD and run the Codex thread with its cwd pointed
// there. On completion the worktree is removed *only if unchanged* (mirrors
// "auto-cleaned if unchanged"); if the agent left changes, the worktree is kept
// and its path reported so the work isn't silently discarded.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);

async function git(cwd, args) {
  const { stdout } = await exec("git", args, { cwd, maxBuffer: 16 * 1024 * 1024 });
  return stdout.trim();
}

export async function isGitRepo(cwd) {
  try {
    return (await git(cwd, ["rev-parse", "--is-inside-work-tree"])) === "true";
  } catch {
    return false;
  }
}

/**
 * Create a detached worktree at HEAD of the repo containing `repoCwd`.
 * Returns { dir, cleanup }, where cleanup() removes the worktree if clean and
 * returns { removed, dir, dirty }.
 */
// Local: `name` (Claude Code 2.1.280's <runId>-<idx>) names the worktree folder; without one it is "wt".
export async function createWorktree(repoCwd, name) {
  const root = await git(repoCwd, ["rev-parse", "--show-toplevel"]);
  const originalHead = await git(root, ["rev-parse", "HEAD"]);
  const base = await mkdtemp(join(tmpdir(), "wf-worktree-"));
  const dir = join(base, typeof name === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(name) ? name : "wt");
  try {
    await git(root, ["worktree", "add", "--detach", dir, "HEAD"]);
  } catch (error) {
    await rm(base, { recursive: true, force: true }).catch(() => {}); // Local: don't leak the temp folder
    throw error;
  }

  return {
    dir,
    async cleanup() {
      let dirty = false;
      try {
        dirty = (await git(dir, ["status", "--porcelain", "--untracked-files=all"])).length > 0 || (await git(dir, ["rev-parse", "HEAD"])) !== originalHead;
      } catch { return { removed:false, dirty:true, dir }; }
      if (dirty) return { removed: false, dirty: true, dir };
      try {
        await git(root, ["worktree", "remove", dir]);
      } catch { return { removed:false, dirty:true, dir }; }
      try {
        await rm(base, { recursive: true, force: true });
      } catch {}
      return { removed: true, dirty: false, dir };
    },
  };
}
