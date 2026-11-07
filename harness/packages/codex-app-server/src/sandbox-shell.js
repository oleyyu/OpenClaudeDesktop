// OpenClaude Desktop's process boundary, composed only by its own profile. Keep the
// upstream runner selection/probes and platform launchers; supply confinement
// even when the shared DSH Purge provider deliberately runs argv unchanged.
import LocalSandboxProvider from '@deepseek-ai/dsh-sandbox-local'
import { canonicalPath, writableRoots } from '@deepseek-ai/dsh-sandbox'
import { LAUNCHER_BIN, LAUNCHER_FAILURE_EXIT } from '@deepseek-ai/node-addon-system/landlock-run'

const DENIAL_SIGNATURES = {
  bwrap: ['read-only file system'], landlock: ['permission denied'], seatbelt: ['operation not permitted'],
  'windows-acl': ['access is denied', 'access to the path', 'permission denied', 'operation not permitted'],
  runnerCommand: ['read-only file system', 'permission denied'],
}
const RUNNER_FAILURE_RULES = {
  bwrap: [{ fatalSignatures: ['bwrap: '] }],
  landlock: [{ allowedExitCodes: [LAUNCHER_FAILURE_EXIT], fatalSignatures: [`${LAUNCHER_BIN}: `], informationalLines: [`${LAUNCHER_BIN}: partial enforcement (older Landlock ABI)`] }],
  seatbelt: [{ fatalSignatures: ['sandbox-exec: '] }],
  'windows-acl': [{ allowedExitCodes: [127], fatalSignatures: ['windows-acl-run: '] }],
}
const sbplString = (path) => `"${path.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`

// Windows runs commands unconfined (confine below), stated the way the upstream DSH Purge provider states it.
const UNCONFINED = Object.freeze({ enforcement: 'full', denialSignatures: Object.freeze([]), runnerFailureRules: Object.freeze([]) })

export default class CodeDesktopSandbox extends LocalSandboxProvider {
  /** The platform the runner is chosen for (tests set internals.platform, as the upstream chain walk reads it). */
  get platform() { return this.internals?.platform ?? process.platform }

  async confine(argv, policy, signal) {
    signal?.throwIfAborted()
    // Windows: no ACL sandbox around the command; it runs as the user, unconfined, and the permission mode's approval
    // flow is what stands in front of it. The upstream windows-acl runner can't serve this app's sessions:
    //   - workspace-write throws for a workspace that contains %TEMP% (assertTempRootOutsideWorkspace), and the default
    //     cwd is the home folder, which contains AppData\Local\Temp: every Ask / Accept edits / Auto command failed;
    //   - inside it, programs can't open named pipes, so anything that spawns a child with piped stdio (npm test, a
    //     build tool, git hooks, Node's child_process) fails with EPERM.
    // Security trade-off, Windows only: what Seatbelt enforces on macOS is gone there.
    //   - Ask and Accept edits: unchanged in practice; every pwsh call still waits for its approval card (index.js
    //     tools/pre-execute → approval.js preExecuteDecision; pwsh is never a READ_ONLY_TOOLS entry), so nothing runs
    //     unapproved, but an approved command may write outside the workspace.
    //   - Auto: commands run without a card, as on macOS, but a write outside the workspace is no longer denied and so
    //     never turns into an escalation card (sandbox_permissions escalations the model asks for still raise one).
    //   - the read-only sandbox (Plan, chat, a review turn, a read-only workflow agent or sub-agent): nothing here stops
    //     a write, so every shell command asks first, on any approval policy (index.js tools/pre-execute → approval.js
    //     unsandboxedReadOnly, the OpenCode bridge's UNSANDBOXED_READ_ONLY twin), and is refused where nobody can be
    //     asked (approval policy 'never', a child without a live root).
    //   - Bypass (danger-full-access) never reached confine() and is unchanged.
    // The file tools (write/edit) keep their own fence (sandbox-fs.js), on every platform.
    if (this.platform === 'win32') return { argv: [...argv], ...UNCONFINED }
    policy = { ...policy, workspaceRoot: canonicalPath(policy.workspaceRoot) }
    if (!['read-only', 'workspace-write'].includes(policy.mode)) throw new Error(`Unexpected confined sandbox mode: ${policy.mode}`)
    if (this.runnerCommand !== undefined) {
      const args = ['--ro-bind', '/', '/', '--dev', '/dev', '--unshare-pid', '--proc', '/proc', '--die-with-parent']
      if (policy.mode === 'workspace-write') args.push('--tmpfs', '/tmp', '--bind', policy.workspaceRoot, policy.workspaceRoot)
      return { argv: [...this.runnerCommand, ...args, '--', ...argv], enforcement: 'full', denialSignatures: DENIAL_SIGNATURES.runnerCommand, runnerFailureRules: [{ fatalSignatures: this.configuredRunnerFailureSignatures }] }
    }
    const selected = this.selectRunner(policy.mode)
    return {
      argv: [...this.runnerArgv(selected.runner, policy), '--', ...argv], enforcement: selected.enforcement,
      denialSignatures: DENIAL_SIGNATURES[selected.runner], runnerFailureRules: RUNNER_FAILURE_RULES[selected.runner],
    }
  }

  runnerArgv(runner, policy) {
    if (runner !== 'seatbelt') return super.runnerArgv(runner, policy)
    // The process's own stdio devices: `> /dev/stderr` or a `>(…)` substitution reopens an fd it already holds (macOS
    // dups it with the original access), so denying them only turns harmless commands into escalation cards.
    const forms = ['(version 1)', '(allow default)', '(deny file-write*)', '(allow file-write* (literal "/dev/null") (literal "/dev/stdout") (literal "/dev/stderr") (regex #"^/dev/fd/[0-9]+$"))']
    const roots = writableRoots(policy)
    if (roots.length) forms.push(`(allow file-write* ${roots.map((root) => `(subpath ${sbplString(root)})`).join(' ')})`)
    return [this.seatbeltExec(), '-p', forms.join(' ')]
  }
}
