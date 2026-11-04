// B29 Git-missing worktree dialog (cc43287c9 nY :17250-17370 with HJ/GJ/UJ/qJ/ZJ/$J/eY/tY copy, rY :17372-17390;
// cb92a6d7a T the download page). A worktree needs git: when git is missing, blocked or failing to start, the
// composer says why (rY) and starting the session opens this dialog instead of failing with a raw error.
import { t } from "../electron/i18n/index.mjs";

/** cb92a6d7a T: the Git download page for the platform. */
export function gitDownloadUrl(platform) {
  return platform === "win32" ? "https://git-scm.com/download/win" : platform === "linux" ? "https://git-scm.com/download/linux" : "https://git-scm.com/download/mac";
}

/** rY (neededFor 'worktree'): the composer's one-line reason. */
export function gitWarning(reason) {
  if (reason === "exec_blocked") return t("Your system blocked OpenClaude Desktop from running Git.");
  if (reason === "startup_failed") return t("Git is installed but isn’t working.");
  return t("Git is required to use a worktree.");
}

// main.cjs prepare-worktree's rejection messages (English on the wire; only an Error's message crosses IPC).
export const GIT_FAILURE_MESSAGES = Object.freeze({
  missing: "Git is required to use a worktree.",
  exec_blocked: "Your system blocked OpenClaude Desktop from running Git.",
  startup_failed: "Git is installed but isn’t working.",
});

/** prepare-worktree's rejection (main.cjs gitFailure): {reason, detail} for the dialog, or null for any other error. */
export function gitFailureFromMessage(message) {
  const [first, ...rest] = String(message ?? "").split("\n");
  const reason = Object.keys(GIT_FAILURE_MESSAGES).find((key) => GIT_FAILURE_MESSAGES[key] === first) ?? null;
  return reason ? { reason, detail: rest.join("\n").trim() || null } : null;
}

/**
 * nY: the dialog for a reason and platform. 'download' opens the Git download page; 'acknowledge' only closes.
 * {title, description, command?, detail?, confirmLabel, cancelLabel, action}
 */
// shared-14 tt/nt (error_fix): the install command typed — not run — in a terminal tab, per platform (Ch).
export const GIT_INSTALL_FIXES = Object.freeze({
  darwin: Object.freeze({ fix: "installCommandLineTools", command: "xcode-select --install" }),
  win32: Object.freeze({ fix: "installGitWindows", command: "winget install --id Git.Git -e --source winget" }),
});

export function gitDialogCopy({ reason, platform = "darwin", detail = null, terminal = false } = {}) {
  if (reason === "startup_failed") return {
    title: t("Git isn’t working"),
    description: platform === "darwin"
      ? t("Git is installed, but it failed to start. This usually means it can’t read its configuration file. If the error below says “Operation not permitted”, grant OpenClaude Desktop Full Disk Access in System Settings → Privacy & Security, then try again.")
      : t("Git is installed, but it failed to start. This usually means it can’t read a configuration file. Check your Git configuration, then try again."),
    detail: detail || null, confirmLabel: t("Got it"), cancelLabel: t("Not now"), action: "acknowledge",
  };
  if (reason === "exec_blocked") return {
    title: t("Git was blocked"),
    description: t("Git is installed, but your system blocked OpenClaude Desktop from running it. This is usually an endpoint security or application control policy. To continue without Git, turn off the worktree option. To use a worktree, ask your IT team to allow OpenClaude Desktop to run Git."),
    confirmLabel: t("Got it"), cancelLabel: t("Not now"), action: "acknowledge",
  };
  // nY f/KJ: with a terminal to type into, macOS and Windows offer 'Open in terminal' (the install command waits for
  // Enter); Windows still links Download Git below.
  const fix = terminal ? GIT_INSTALL_FIXES[platform] : undefined;
  if (fix) return {
    title: t("Install Git"),
    description: fix.fix === "installGitWindows"
      ? t("Git for Windows is required to use a worktree. You can press Enter in the terminal to install it with winget and follow its prompts, or turn off the worktree option to continue without Git.")
      : t("Git is required to use a worktree. You can press Enter in the terminal to install Git with Apple’s Command Line Tools, or turn off the worktree option to continue without Git."),
    command: null, confirmLabel: t("Open in terminal"), cancelLabel: t("Not now"), action: "terminal", terminalCommand: fix.command,
    url: gitDownloadUrl(platform), downloadLink: fix.fix === "installGitWindows" ? t("Download Git") : null,
  };
  const description = platform === "win32"
    ? { text: t("Git for Windows is required to use a worktree. To continue without Git, turn off the worktree option.") }
    : platform === "linux"
      ? { text: t("Git is required to use a worktree. To continue without Git, turn off the worktree option. To install Git, use your distribution’s package manager (for example, {command})."), command: "sudo apt install git" }
      : { text: t("Git is required to use a worktree. To continue without Git, turn off the worktree option. To install Git, run {command} in Terminal or select Download Git."), command: "xcode-select --install" };
  return { title: t("Install Git"), description: description.text, command: description.command ?? null,
    confirmLabel: t("Download Git"), cancelLabel: t("Not now"), action: "download", url: gitDownloadUrl(platform) };
}
