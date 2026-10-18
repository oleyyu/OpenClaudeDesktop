"use strict";
// R4e-envbranch (home-15): main's `branch-on-origin`, the desktop's LocalSessions.isBranchOnOrigin(cwd, branch)
// (2.42304.0 index.chunk-DLn6Mdsc.js → GitStatusService.isBranchOnOrigin; IPC schema ["isBranchOnOrigin", cwd, branch]
// → boolean | null). The method and everything it reads are original (electron/generated/r4e-envbranch-origin.cjs):
// true when refs/remotes/origin/<branch> resolves; false when it doesn't although remote.origin.fetch would have fetched
// it (so origin has no such branch as of the last fetch); null when that can't be told (an implausible branch name, git
// failing other than exit 1, no origin fetch refspec, or a refspec that leaves the branch out). Read-only git only:
// `rev-parse --verify --quiet` and `config --get-all`; nothing fetches, so no network is touched.
//
// Host adapters (the factory's `host`): the official GitStatusService answers requireTrustedCwd (folder policy and
// workspace trust) and isKnownNonGitDir (its non-git cache). Main admits only known workspace folders before calling
// (workspaceQueryRoot, the same gate as branch-switch-check), so here a folder is never refused and never known
// non-git; a non-repository fails rev-parse with exit 128 and the original answers null. runGit / configRead run
// `git -C <cwd> <args>` with the official timeout; a failure carries its exit status as `result.code` (what BQi7slPm r
// reads), and a spawn error or a timeout has none (r → undefined → null).
const { createBranchOnOrigin } = require("./generated/r4e-envbranch-origin.cjs");

const MAX_BUFFER = 1024 * 1024;
// run: promisify(execFile) or a stub with the same contract (resolves { stdout }, rejects with an execFile error whose
// numeric `code` is the exit status).
function createHostBranchOnOrigin({ run }) {
  const runGit = (args, cwd, timeoutMs) => Promise.resolve()
    .then(() => run("git", ["-C", cwd, ...args], { timeout: timeoutMs, maxBuffer: MAX_BUFFER }))
    .then((result) => String(result?.stdout ?? ""), (error) => {
      const code = Number.isInteger(error?.code) && error.code >= 0 && !error.killed ? error.code : undefined;
      throw Object.assign(new Error(error?.message || "git failed"), { result: { code } });
    });
  const service = createBranchOnOrigin({
    git: { runGit },
    configRead: (_intent, args, cwd, timeoutMs) => runGit(args, cwd, timeoutMs),
    requireTrustedCwd: async () => null,
    isKnownNonGitDir: () => false,
  });
  return (cwd, branch) => (typeof cwd === "string" && cwd && typeof branch === "string" ? service.isBranchOnOrigin(cwd, branch) : Promise.resolve(null));
}

module.exports = { createHostBranchOnOrigin };
