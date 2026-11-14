/**
 * The command sandbox OpenCode does not have. Codex runs shell commands in a
 * macOS Seatbelt sandbox (workspace-write: writes only under the writable
 * roots and temp, no network unless allowed; read-only: no writes). The bridge
 * gives the agent the same boundary:
 *
 *   - $SHELL of the agent server (and OpenCode's `shell` config) is a wrapper
 *     in the bridge's runtime folder named like the user's own shell (OpenCode
 *     and MiMo pick the shell from $SHELL / config and its arguments, rc files
 *     included, by its name; config.js agentShell), which execs
 *     /usr/bin/sandbox-exec with the profile in CODE_DESKTOP_SANDBOX_PROFILE
 *     and that shell, or the shell alone for CODE_DESKTOP_SANDBOX=none (Bypass);
 *   - the bridge plugin's `shell.env` hook sets those per call from the
 *     session's current policy (plugin.js), so a Mode change applies to the
 *     next command;
 *   - without either variable (a shell the plugin did not configure) the
 *     wrapper fails closed to the read-only profile.
 */

/** SBPL string literal. */
export const sbplString = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`

/**
 * The Seatbelt profile for a sandbox policy.
 * @param {{ mode: 'read-only' | 'workspace-write' | 'danger-full-access', roots?: string[], network?: boolean }} policy
 * @returns {string | null} null for danger-full-access (no sandbox)
 */
export function seatbeltProfile(policy) {
  const quote = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
  if (!policy || policy.mode === 'danger-full-access') return null
  const forms = ['(version 1)', '(allow default)', '(deny file-write*)', '(allow file-write* (literal "/dev/null") (literal "/dev/tty") (regex #"^/dev/fd/") (literal "/dev/dtracehelper"))']
  if (policy.mode === 'workspace-write') {
    const roots = [...new Set((policy.roots ?? []).filter((root) => typeof root === 'string' && root.startsWith('/')))]
    if (roots.length) forms.push(`(allow file-write* ${roots.map((root) => `(subpath ${quote(root)})`).join(' ')})`)
  }
  if (policy.network !== true) forms.push('(deny network-outbound (remote ip))', '(deny network-inbound (local ip))')
  return forms.join(' ')
}

/** The read-only profile the wrapper falls back to. */
export const FAIL_CLOSED_PROFILE = seatbeltProfile({ mode: 'read-only', network: false })

/** The $SHELL wrapper (POSIX sh). */
export function shellWrapper({ shell = '/bin/zsh', sandboxExec = '/usr/bin/sandbox-exec' } = {}) {
  const quoted = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`
  return [
    '#!/bin/sh',
    '# OpenClaude Desktop: runs the agent\'s shell commands inside the session\'s sandbox (opencode-bridge sandbox.js).',
    // OpenClaude Desktop's tools channel (app-tools.js) is for the code_desktop server only, never the agent's commands.
    'unset CODE_DESKTOP_AGENT_TOOLS_SOCKET CODE_DESKTOP_AGENT_TOOLS_TOKEN CODE_DESKTOP_AGENT_TOOLS_SERVER',
    `if [ "$CODE_DESKTOP_SANDBOX" = "none" ]; then unset CODE_DESKTOP_SANDBOX CODE_DESKTOP_SANDBOX_PROFILE; exec ${quoted(shell)} "$@"; fi`,
    `profile="\${CODE_DESKTOP_SANDBOX_PROFILE:-${FAIL_CLOSED_PROFILE.replaceAll('"', '\\"')}}"`,
    'unset CODE_DESKTOP_SANDBOX CODE_DESKTOP_SANDBOX_PROFILE',
    `exec ${quoted(sandboxExec)} -p "$profile" ${quoted(shell)} "$@"`,
    '',
  ].join('\n')
}

/**
 * The writable roots of a workspace-write policy: the thread's cwd, the
 * client's extra roots, and temp (unless excluded), all canonical.
 */
export function writableRoots({ cwd, extraRoots = [], tmp = [] }) {
  return [...new Set([cwd, ...extraRoots, ...tmp].filter((root) => typeof root === 'string' && root.startsWith('/')))]
}
