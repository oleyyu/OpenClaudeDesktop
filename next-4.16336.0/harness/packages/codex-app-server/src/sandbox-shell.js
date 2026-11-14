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

export default class CodeDesktopSandbox extends LocalSandboxProvider {
  async confine(argv, policy, signal) {
    signal?.throwIfAborted()
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
    const forms = ['(version 1)', '(allow default)', '(deny file-write*)', '(allow file-write* (literal "/dev/null"))']
    const roots = writableRoots(policy)
    if (roots.length) forms.push(`(allow file-write* ${roots.map((root) => `(subpath ${sbplString(root)})`).join(' ')})`)
    return [this.seatbeltExec(), '-p', forms.join(' ')]
  }
}
