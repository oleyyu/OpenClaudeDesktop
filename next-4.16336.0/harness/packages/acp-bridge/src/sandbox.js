/**
 * The macOS sandbox (Seatbelt, /usr/bin/sandbox-exec) the bridge runs an agent
 * process in, so OpenClaude Desktop's Auto and read-only modes hold for everything
 * the agent does, its shell commands and MCP servers included (they inherit it):
 *
 *   workspace-write  writes only under the thread's cwd and writable roots, the
 *                    agent's own home (sessions, settings), the bridge state,
 *                    temp and cache folders
 *   read-only        the same minus cwd and writable roots
 *   none             Bypass: no sandbox
 *
 * Reads and network stay allowed (the agent must reach its model API; Codex's
 * workspace sandbox also keeps reads). The profile is the permissive-open
 * shape Gemini CLI and Qwen Code ship for their own macOS sandbox.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const SANDBOX_EXEC = '/usr/bin/sandbox-exec'

export function sandboxAvailable() {
  if (process.platform !== 'darwin' || process.env.CODE_DESKTOP_ACP_NO_SANDBOX === '1') return false
  try { fs.accessSync(SANDBOX_EXEC, fs.constants.X_OK); return true } catch { return false }
}

const real = (file) => { try { return fs.realpathSync(file) } catch { return path.resolve(file) } }
const quote = (value) => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

/** Files no agent process may write in any profile (deny rules come last, so they win over every allow). */
const denyRules = (denyWrite) => {
  const files = new Set()
  for (const file of denyWrite ?? []) if (typeof file === 'string' && file) { files.add(path.resolve(file)); files.add(real(file)) }
  return files.size ? ['(deny file-write*', ...[...files].sort().map((file) => `    (literal ${quote(file)})`), ')'] : []
}

/**
 * The Seatbelt profile text. `extraWritable` is writable in workspace-write only (an agent's own need there, MiniMax's
 * ~/.Trash for its recoverable rm); `denyWrite` files are never writable (MiniMax's shell rc files).
 * @param {{ profile: 'workspace-write' | 'read-only', writable: string[], agentPaths: string[], extraWritable?: string[], denyWrite?: string[], home?: string }} options
 */
export function seatbeltProfile({ profile, writable = [], agentPaths = [], extraWritable = [], denyWrite = [], home = os.homedir() }) {
  const paths = new Set()
  const add = (file) => { if (typeof file === 'string' && file) { paths.add(path.resolve(file)); paths.add(real(file)) } }
  if (profile === 'workspace-write') for (const file of [...writable, ...extraWritable]) add(file)
  for (const file of agentPaths) add(file)
  for (const file of [os.tmpdir(), '/private/tmp', '/private/var/folders', path.join(home, '.npm'), path.join(home, '.cache'), path.join(home, 'Library/Caches'), path.join(home, '.local/state')]) add(file)
  const rules = [...paths].sort().map((file) => `    (subpath ${quote(file)})`)
  return [
    '(version 1)',
    '(allow default)',
    '(deny file-write*)',
    '(allow file-write*',
    ...rules,
    `    (literal ${quote(path.join(home, '.gitconfig'))})`,
    '    (literal "/dev/stdout")',
    '    (literal "/dev/stderr")',
    '    (literal "/dev/null")',
    '    (literal "/dev/tty")',
    '    (literal "/dev/ptmx")',
    '    (regex #"^/dev/ttys[0-9]*$")',
    '    (regex #"^/dev/fd/[0-9]+$")',
    ')',
    ...denyRules(denyWrite),
    '',
  ].join('\n')
}

/**
 * Wraps a launch in the sandbox: returns {command, args} (unchanged for 'none'
 * or where Seatbelt is unavailable) and whether it is sandboxed.
 */
export function wrapLaunch({ command, args }, { profile, writable, agentPaths, profileFile, extraWritable = [], denyWrite = [] }) {
  if (!sandboxAvailable()) return { command, args, sandboxed: false }
  if (profile === 'none') {
    // Bypass: no sandbox, except the files the agent must never write (still not 'sandboxed' for the permission policy).
    if (!denyWrite.length) return { command, args, sandboxed: false }
    fs.mkdirSync(path.dirname(profileFile), { recursive: true })
    fs.writeFileSync(profileFile, ['(version 1)', '(allow default)', ...denyRules(denyWrite), ''].join('\n'))
    return { command: SANDBOX_EXEC, args: ['-f', profileFile, command, ...args], sandboxed: false }
  }
  fs.mkdirSync(path.dirname(profileFile), { recursive: true })
  fs.writeFileSync(profileFile, seatbeltProfile({ profile, writable, agentPaths, extraWritable, denyWrite }))
  return { command: SANDBOX_EXEC, args: ['-f', profileFile, command, ...args], sandboxed: true }
}
