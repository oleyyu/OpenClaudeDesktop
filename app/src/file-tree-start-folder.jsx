// R3-files FT-14 (files-10): the Files tree of a worktree session starts at the folder the session was started from.
//
// Officially (2.42304.0 cccc2cf0a Nx) the tree reads zx(sessionRef, session): for a local session in a desktop worktree
// (hasDesktopWorktree, no remote, executeRoot = workingDir) whose origin folder (originCwd) lies below its repository
// root (the git info query, shared-11 zd, `select: root`), the start folder is that same relative folder inside the
// worktree. Until the tree has shown it (DS calls onStartFolderShown after `scrollToIndex(index, "start")`) or an
// explicit reveal arrives, the tree's reveal is `{absPath: Vx(start), nonce: Rx (-1), start: true}`: its folders and
// the start folder itself expand, the row scrolls to the top, nothing is selected and nothing flashes.
//
// zx, Vx, Rx, zd and the path helpers are generated (generated/files-changes/file-tree-start-folder.mjs and friends).
// Host parts: the session object zx reads (an OpenClaude worktree session is one main.cjs prepared, recorded as
// sessionMetadata.originCwd; the engine runs every session on this machine, so it is local with no remote), the
// repository root (LocalSessions.getGitInfo over main's "repo-identities"), and the QueryClient the Files pane shares
// with its breadcrumb (FilesQueryScope).
import { QueryClientProvider } from "./generated/files-changes/file-browser-query.mjs";
import { useWorktreeStartFolder, normalizeRevealPath, startRevealNonce } from "./generated/files-changes/file-tree-start-folder.mjs";
import { pathWithinRoot } from "./generated/files-changes/path-within.mjs";
import { fileBrowserQueryClient } from "./source-breadcrumb-adapters.jsx";

export { startRevealNonce };

/** The app's one QueryClient for the Files pane (the official renderer has one client for the whole app). */
export function FilesQueryScope({ children }) {
  return <QueryClientProvider client={fileBrowserQueryClient}>{children}</QueryClientProvider>;
}

/** zx's session for an OpenClaude session: a worktree session when main recorded the folder it was cut from. */
export function worktreeSessionOf(cwd, originCwd) {
  if (typeof cwd !== "string" || !cwd || typeof originCwd !== "string" || !originCwd) return { sessionRef: null, session: undefined };
  return { sessionRef: { type: "local" }, session: { workingDir: cwd, hasDesktopWorktree: true, originCwd } };
}

/**
 * The start folder of the tree (relative to `cwd`, the tree root), or null: zx's absolute start folder, Vx-normalized
 * as Nx's reveal does, then made relative to the root (shared-28 GO).
 */
export function useTreeStartFolder({ cwd, originCwd }) {
  const { sessionRef, session } = worktreeSessionOf(cwd, originCwd);
  const start = useWorktreeStartFolder(sessionRef, session);
  if (!start || !cwd) return null;
  return pathWithinRoot(normalizeRevealPath(start), cwd) ?? null;
}
