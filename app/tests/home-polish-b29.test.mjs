// B29 Home Action Center polish: the Git dialog copy (cc43287c9 nY/rY), the spawn step labels (_3) on the status row,
// (W14-code r4 sidebar-new: the awaiting hover card body moved to the 3.6556.2 sidebar hover card slice,
// tests/sidebar-hover-card.test.mjs; the host Action Center's preview is gone, R4DC-N1).
import test from "node:test";
import assert from "node:assert/strict";
import { GIT_FAILURE_MESSAGES, gitDialogCopy, gitDownloadUrl, gitFailureFromMessage, gitWarning } from "../src/git-dialog-model.mjs";
import { spawnPhaseLabel, transcriptStatusPresentation } from "../src/transcript-status-model.mjs";

test("rY/nY: the composer line, the dialog per reason and platform, and main's rejection messages", () => {
  assert.equal(gitWarning("missing"), "Git is required to use a worktree.");
  assert.equal(gitWarning("startup_failed"), "Git is installed but isn’t working.");
  assert.equal(gitWarning("exec_blocked"), "Your system blocked OpenClaude Desktop from running Git.");
  const mac = gitDialogCopy({ reason: "missing", platform: "darwin" });
  assert.deepEqual([mac.title, mac.confirmLabel, mac.cancelLabel, mac.action, mac.command, mac.url],
    ["Install Git", "Download Git", "Not now", "download", "xcode-select --install", "https://git-scm.com/download/mac"]);
  assert.match(mac.description, /run \{command\} in Terminal or select Download Git\.$/);
  assert.equal(gitDialogCopy({ reason: "missing", platform: "linux" }).command, "sudo apt install git");
  assert.equal(gitDialogCopy({ reason: "missing", platform: "win32" }).url, gitDownloadUrl("win32"));
  assert.equal(gitDialogCopy({ reason: "missing", platform: "win32" }).command, null);
  const broken = gitDialogCopy({ reason: "startup_failed", platform: "darwin", detail: "fatal: bad config" });
  assert.deepEqual([broken.title, broken.confirmLabel, broken.action, broken.detail], ["Git isn’t working", "Got it", "acknowledge", "fatal: bad config"]);
  assert.match(broken.description, /Full Disk Access/);
  assert.doesNotMatch(gitDialogCopy({ reason: "startup_failed", platform: "linux" }).description, /Full Disk Access/);
  assert.equal(gitDialogCopy({ reason: "exec_blocked" }).title, "Git was blocked");
  assert.deepEqual(gitFailureFromMessage(GIT_FAILURE_MESSAGES.missing), { reason: "missing", detail: null });
  assert.deepEqual(gitFailureFromMessage(`${GIT_FAILURE_MESSAGES.startup_failed}\nfatal: bad config line 3`), { reason: "startup_failed", detail: "fatal: bad config line 3" });
  assert.equal(gitFailureFromMessage("fatal: invalid reference: main"), null);
  assert.equal(gitFailureFromMessage(undefined), null);
});

test("nY KJ: with a terminal, macOS and Windows type the install command (Open in terminal); Linux and other reasons do not", () => {
  const mac = gitDialogCopy({ reason: "missing", platform: "darwin", terminal: true });
  assert.equal(mac.action, "terminal");
  assert.equal(mac.confirmLabel, "Open in terminal");
  assert.equal(mac.terminalCommand, "xcode-select --install");
  assert.match(mac.description, /press Enter in the terminal/);
  assert.equal(mac.downloadLink, null);
  const win = gitDialogCopy({ reason: "missing", platform: "win32", terminal: true });
  assert.equal(win.terminalCommand, "winget install --id Git.Git -e --source winget");
  assert.equal(win.downloadLink, "Download Git");
  assert.equal(win.url, gitDownloadUrl("win32"));
  assert.equal(gitDialogCopy({ reason: "missing", platform: "linux", terminal: true }).action, "download");
  assert.equal(gitDialogCopy({ reason: "exec_blocked", platform: "darwin", terminal: true }).action, "acknowledge");
  assert.equal(gitDialogCopy({ reason: "missing", platform: "darwin" }).action, "download");
});

test("_3: spawn steps name the status row on Home; an unknown step reads Starting session…", () => {
  assert.equal(spawnPhaseLabel("worktree_fetch"), "Refreshing origin…");
  assert.equal(spawnPhaseLabel("worktree_add"), "Adding worktree…");
  assert.equal(spawnPhaseLabel("worktree"), "Creating worktree…");
  assert.equal(spawnPhaseLabel("nope"), "Starting session…");
  assert.equal(spawnPhaseLabel("toString"), "Starting session…");
  const view = transcriptStatusPresentation({ sessionKey: null, spawnLabel: "Refreshing origin…" });
  assert.deepEqual([view.phase, view.label, view.visible, view.busy], ["running", "Refreshing origin…", true, true]);
  assert.equal(transcriptStatusPresentation({ sessionKey: null }).visible, false, "Home without a spawn stays hidden");
});
