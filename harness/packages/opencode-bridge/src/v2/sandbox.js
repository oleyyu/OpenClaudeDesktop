/**
 * The command sandbox under OpenCode 2.x (../sandbox.js is 1.x's and MiMo's). v2's `shell.create.before` hook carries
 * no session id (core/src/shell.ts), so a plugin can't pick a session's profile per command as 1.x's `shell.env` did.
 * The profile travels on disk instead, and the sandbox no longer depends on the plugin loading:
 *
 *   <state>/runtime/sandbox/<safe(id)>.sb   written by the bridge with every session runtime file (index.js
 *                                           writeRuntime): the session's Seatbelt profile, or `none` for Bypass
 *   <state>/runtime/sandbox/<safe(id)>.root a sub-agent the bridge wrote no .sb for: its root's id (the plugin writes
 *                                           it at the sub-agent's first prompt, plugin.js); the root's .sb is read at
 *                                           each command, so a mode change of the root reaches it
 *   <state>/runtime/shell-v2/<name>         the $SHELL / `shell` wrapper, named like the user's shell (v2's command
 *                                           scanner picks its dialect by the name, core/src/shell/parse.ts); it reads
 *                                           $OPENCODE_SESSION_ID, which v2's shell tool sets just before it spawns
 *                                           (tool/plugin/shell.ts), and that session's file
 *
 * A session's file can lag its first command: the wrapper waits up to 3 s for either file, then fails closed to the
 * read-only profile (so does a pointer whose root has no .sb). Without a session id (a command the shell tool did not
 * start: v2's session shell, a user's `!command`, sets no OPENCODE_SESSION_ID, core/src/session/shell.ts) it falls back
 * to CODE_DESKTOP_SANDBOX[_PROFILE] as 1.x's wrapper does — never in serve's own environment (server.js scrubs them) —
 * so such commands run read-only whatever the mode. Its own folder (shell-v2): a 1.x server on the same state keeps its
 * own wrapper. The .sb / .root files live as long as the session's runtime file (never removed yet, as on 1.x).
 */
import fs from 'node:fs'
import path from 'node:path'
import { FAIL_CLOSED_PROFILE, seatbeltProfile } from '../sandbox.js'

/** What a session's .sb file holds: its Seatbelt profile, `none` (danger-full-access: no sandbox), read-only without a policy. */
export const sandboxFileText = (policy) => (policy && typeof policy === 'object' ? seatbeltProfile(policy) ?? 'none' : FAIL_CLOSED_PROFILE)

/** The session ids' file names, as the bridge's runtime files and the wrapper's `tr` spell them. */
export const safeSessionId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_')

/** Write (atomically) the sandbox file of a session; returns its path. */
export function writeSandboxV2(sandboxDir, id, policy) {
  fs.mkdirSync(sandboxDir, { recursive: true })
  const file = path.join(sandboxDir, `${safeSessionId(id)}.sb`)
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  fs.writeFileSync(temp, sandboxFileText(policy))
  fs.renameSync(temp, file)
  return file
}

/**
 * The v2 $SHELL wrapper (POSIX sh). `sandboxDir` is written into it, so the folder it reads profiles from never comes
 * from the command's environment.
 * @param {{ shell?: string, sandboxDir: string, sandboxExec?: string, waitSteps?: number }} options
 *   waitSteps: 50 ms steps to wait for a session's file (60: 3 s)
 */
export function shellWrapperV2({ shell = '/bin/zsh', sandboxDir, sandboxExec = '/usr/bin/sandbox-exec', waitSteps = 60 } = {}) {
  const quoted = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`
  return [
    '#!/bin/sh',
    '# OpenClaude Desktop: runs OpenCode 2.x\'s shell commands inside the session\'s sandbox (opencode-bridge src/v2/sandbox.js).',
    // OpenClaude Desktop's tools channel (app-tools.js) is for the code_desktop server only, never the agent's commands.
    'unset CODE_DESKTOP_AGENT_TOOLS_SOCKET CODE_DESKTOP_AGENT_TOOLS_TOKEN CODE_DESKTOP_AGENT_TOOLS_SERVER',
    'profile=',
    'if [ -n "$OPENCODE_SESSION_ID" ]; then',
    `  dir=${quoted(sandboxDir)}`,
    `  id=$(printf '%s' "$OPENCODE_SESSION_ID" | tr -c 'A-Za-z0-9_-' '_')`,
    '  file="$dir/$id.sb"',
    '  n=0',
    `  while [ ! -f "$file" ] && [ ! -f "$dir/$id.root" ] && [ "$n" -lt ${Number(waitSteps) || 0} ]; do sleep 0.05; n=$((n + 1)); done`,
    // A sub-agent's pointer: its root's profile as it is now (the id made safe again, never a path).
    `  if [ ! -f "$file" ] && [ -f "$dir/$id.root" ]; then file="$dir/$(tr -c 'A-Za-z0-9_-' '_' < "$dir/$id.root").sb"; fi`,
    '  if [ -f "$file" ]; then profile=$(cat "$file"); fi',
    `  [ -n "$profile" ] || profile=${quoted(FAIL_CLOSED_PROFILE)}`,
    'elif [ "$CODE_DESKTOP_SANDBOX" = "none" ]; then',
    '  profile=none',
    'else',
    `  profile="\${CODE_DESKTOP_SANDBOX_PROFILE:-${FAIL_CLOSED_PROFILE.replaceAll('"', '\\"')}}"`,
    'fi',
    'unset CODE_DESKTOP_SANDBOX CODE_DESKTOP_SANDBOX_PROFILE',
    `if [ "$profile" = "none" ]; then exec ${quoted(shell)} "$@"; fi`,
    `exec ${quoted(sandboxExec)} -p "$profile" ${quoted(shell)} "$@"`,
    '',
  ].join('\n')
}
