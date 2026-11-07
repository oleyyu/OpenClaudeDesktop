// Process helpers that differ on Windows, for the bridges (acp-bridge, opencode-bridge, zcode-bridge each carry this
// same file as src/win-process.js: a bridge also ships alone as an Extension Pack's bridge/ folder, so no bridge imports
// another's; harness/tests/win-process.test.mjs checks the copies stay identical). The logic is app/electron/
// process-tree.cjs's (resolveWindowsCommand, windowsSpawn, killTree), with the same results; on macOS and Linux every
// helper returns its input unchanged (or does what the bridges did before), so nothing changes there.
//
//   platformSpawn   spawn() arguments for a program named the way a Mac user names it. Windows: the name is resolved
//                   through PATH × PATHEXT (Node finds only .exe/.com itself); a .cmd/.bat (npm, npx and every npm CLI
//                   shim) runs under `cmd.exe /d /s /c` with every argument escaped for cmd (cross-spawn's rules,
//                   double-escaped for node_modules\.bin shims), since Node refuses to spawn one without a shell
//                   (CVE-2024-27980, EINVAL); no console window (windowsHide). Everywhere: a launch of this process's
//                   own Electron executable as Node gets ELECTRON_RUN_AS_NODE=1, and no other launch inherits it.
//   killTree        Windows has neither process groups nor signals (SIGTERM is TerminateProcess of that one process):
//                   `taskkill /T /F` ends the whole tree (cmd → node → the agent's own children).
//   parentWatch     Windows: a tiny Node that outlives this process only to `taskkill /T /F` its children when we die.
//                   The app stops a core with TerminateProcess, which runs no exit handler here, and Windows never ends
//                   a dead parent's children; the sentinel reads a pipe from us and acts when it closes.
//   windowsShell    the shell a bare command line runs in on Windows: PowerShell (pwsh 7, else Windows PowerShell 5.1),
//                   as DeepSeek's own pwsh tool and Gemini CLI's / Qwen Code's shell tool run commands there.
//   npmShimTarget   the script an npm .cmd shim runs, so a bridge can start an npm-installed agent under Node directly
//                   (no cmd.exe between us and the agent: stdin, exit codes and taskkill all reach the agent itself).
import fs from 'node:fs'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'

const fileExists = (file) => { try { return fs.statSync(file).isFile() } catch { return false } }
const pathKey = (env) => Object.keys(env || {}).find((key) => key.toUpperCase() === 'PATH') || 'PATH'

/** Stop a process tree: Windows `taskkill /pid <pid> /T /F`; elsewhere the signal to the group (-pid) or the pid. */
export function killTree(pid, signal = 'SIGTERM', { platform = process.platform, group = false, run = execFile } = {}) {
  if (!Number.isInteger(pid) || pid <= 0) return false
  if (platform === 'win32') {
    try { run('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => {}); return true } catch { return false }
  }
  try { process.kill(group ? -pid : pid, signal); return true } catch { try { process.kill(pid, signal); return true } catch { return false } }
}

/** The file a Windows command name runs (an absolute or relative path, or a name looked up on PATH with PATHEXT); null if none. */
export function resolveWindowsCommand(command, { env = process.env, cwd = process.cwd(), exists = fileExists } = {}) {
  if (typeof command !== 'string' || !command) return null
  const exts = String(env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((ext) => ext.toLowerCase())
  const withExt = (base) => (path.win32.extname(base) && exists(base) ? [base] : []).concat(exts.map((ext) => base + ext)).find(exists) || null
  if (/[\\/]/.test(command) || path.win32.isAbsolute(command)) return withExt(path.win32.resolve(cwd, command))
  for (const dir of String(env[pathKey(env)] || '').split(';').filter(Boolean)) {
    const found = withExt(path.win32.join(dir.trim().replace(/^"|"$/g, ''), command))
    if (found) return found
  }
  return null
}

const META = /([()\][%!^"`<>&|;, *?])/g
/** One argument quoted for a cmd.exe command line (cross-spawn's escape.argument). */
export function escapeArgument(arg, doubleEscape) {
  let value = `${arg}`
  value = value.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"')
  value = value.replace(/(?=(\\+?)?)\1$/, '$1$1')
  value = `"${value}"`.replace(META, '^$1')
  return doubleEscape ? value.replace(META, '^$1') : value
}
const escapeCommand = (file) => file.replace(META, '^$1')

/**
 * spawn() arguments for `command args` on Windows: the resolved .exe, or cmd.exe running the .cmd/.bat. Returns
 * {command, args, options} (options gains windowsHide, and windowsVerbatimArguments for cmd.exe). Unchanged elsewhere.
 * A name that resolves to nothing is passed through, so spawn reports ENOENT as before.
 */
export function windowsSpawn(command, args = [], options = {}, { platform = process.platform, exists = fileExists } = {}) {
  if (platform !== 'win32') return { command, args, options }
  const env = options.env || process.env
  const file = resolveWindowsCommand(command, { env, cwd: options.cwd || process.cwd(), exists })
  if (!file) return { command, args, options: { windowsHide: true, ...options } }
  if (!/\.(cmd|bat)$/i.test(file)) return { command: file, args, options: { windowsHide: true, ...options } }
  const shim = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(file)
  const line = [escapeCommand(path.win32.normalize(file)), ...args.map((arg) => escapeArgument(arg, shim))].join(' ')
  return {
    command: env.ComSpec || env.COMSPEC || 'cmd.exe', args: ['/d', '/s', '/c', `"${line}"`],
    options: { windowsHide: true, ...options, windowsVerbatimArguments: true },
  }
}

/** Whether `command` is this process's own Electron executable (a core running on Electron as Node). */
export function isOwnElectron(command, { execPath = process.execPath, electron = process.versions.electron, platform = process.platform } = {}) {
  if (!electron || typeof command !== 'string' || !command) return false
  const norm = (file) => (platform === 'win32' ? path.win32.resolve(file).toLowerCase() : path.resolve(file))
  return norm(command) === norm(execPath)
}

/**
 * The environment for one launch: with this process on Electron as Node, ELECTRON_RUN_AS_NODE=1 for a launch of that
 * same executable (it must run as Node, not as a second app) and dropped for anything else (a user's `electron .`
 * would run as plain Node). Unchanged when this process is not Electron.
 */
export function launchEnv(command, env = process.env, deps = {}) {
  const electron = deps.electron ?? process.versions.electron
  if (!electron) return env
  const out = Object.fromEntries(Object.entries(env ?? {}).filter(([key]) => key.toUpperCase() !== 'ELECTRON_RUN_AS_NODE'))
  if (isOwnElectron(command, { ...deps, electron })) out.ELECTRON_RUN_AS_NODE = '1'
  return out
}

/** spawn()/execFile() arguments for this host: launchEnv everywhere, then windowsSpawn on Windows. */
export function platformSpawn(command, args = [], options = {}, deps = {}) {
  const electron = deps.electron ?? process.versions.electron
  const withEnv = electron ? { ...options, env: launchEnv(command, options.env ?? process.env, deps) } : options
  return windowsSpawn(command, args, withEnv, deps)
}

/** spawn() through platformSpawn. */
export function spawnPlatform(command, args = [], options = {}, deps = {}) {
  const launch = platformSpawn(command, args, options, deps)
  return (deps.spawn ?? spawn)(launch.command, launch.args, launch.options)
}

/** execFile() through platformSpawn (same callback contract). */
export function execFilePlatform(command, args, options, callback, deps = {}) {
  const launch = platformSpawn(command, args, options ?? {}, deps)
  return (deps.execFile ?? execFile)(launch.command, launch.args, launch.options, callback)
}

// UTF-8 output, as DeepSeek's pwsh tool pins it (dsh-pwsh-local ENCODING_PREAMBLE): Windows PowerShell 5.1 writes the
// console/OEM code page (CP936 on a Chinese Windows) to a pipe otherwise, which reads back garbled.
export const POWERSHELL_PREAMBLE = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); '

/** The PowerShell to run: PowerShell 7 (Program Files, then PATH), else Windows PowerShell 5.1 (dsh-pwsh-local's order). */
export function windowsPowerShell({ env = process.env, exists = fileExists } = {}) {
  const programFiles = env.ProgramFiles || env.PROGRAMFILES || 'C:\\Program Files'
  const systemRoot = env.SystemRoot || env.SYSTEMROOT || 'C:\\Windows'
  const candidates = [path.win32.join(programFiles, 'PowerShell', '7', 'pwsh.exe')]
  for (const dir of String(env[pathKey(env)] || '').split(';')) {
    const trimmed = dir.trim().replace(/^"|"$/g, '')
    if (trimmed) candidates.push(path.win32.join(trimmed, 'pwsh.exe'))
  }
  const fallback = path.win32.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  return candidates.find(exists) ?? fallback
}

/**
 * {command, args} running one command line in PowerShell. -ExecutionPolicy Bypass (this process only): Windows
 * PowerShell's default policy refuses npm's own npm.ps1 / npx.ps1 shims, which PowerShell picks over the .cmd ones.
 */
export function windowsShell(line, deps = {}) {
  return { command: windowsPowerShell(deps), args: ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', `${POWERSHELL_PREAMBLE}${line}`] }
}

/**
 * The script an npm `.cmd` shim runs (cmd-shim's `"%dp0%\node_modules\…\cli.js" %*` line under `"%_prog%"` or node),
 * resolved next to the shim, or null when the file is not such a shim (or its target is missing).
 * @returns {{ file: string, node: boolean } | null} node: run it under Node; else it is an executable of its own
 */
export function npmShimTarget(shim, { read = (file) => fs.readFileSync(file, 'utf8'), exists = fileExists } = {}) {
  if (typeof shim !== 'string' || !/\.cmd$/i.test(shim)) return null
  let text
  try { text = read(shim) } catch { return null }
  const match = /"%(?:~dp0|dp0%)\\?([^"%]+)"\s*%\*/i.exec(String(text))
  if (!match) return null
  const file = path.win32.join(path.win32.dirname(shim), match[1])
  if (!exists(file)) return null
  return { file, node: !/\.(exe|com)$/i.test(file) }
}

// The sentinel: `node -e` (CommonJS). Lines on its stdin add (+pid) or drop (-pid) a process to stop; any end of its
// stdin means we are gone, and every pid still listed has its tree ended.
const SENTINEL = [
  "const pids = new Set(); let buffer = ''; let done = false",
  "const stop = () => { if (done) return; done = true; for (const pid of pids) { try { require('child_process').execFileSync('taskkill', ['/pid', pid, '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 10000 }) } catch {} } process.exit(0) }",
  "process.stdin.setEncoding('utf8')",
  "process.stdin.on('data', (chunk) => { buffer += chunk; let at; while ((at = buffer.indexOf('\\n')) >= 0) { const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1); if (/^[+]\\d+$/.test(line)) pids.add(line.slice(1)); else if (/^-\\d+$/.test(line)) pids.delete(line.slice(1)) } })",
  "process.stdin.on('end', stop); process.stdin.on('close', stop); process.stdin.on('error', stop)",
].join('\n')

/**
 * Windows: one sentinel process per bridge that ends the trees of the pids it watches once this process dies (see the
 * header). watch(pid) when a child starts, unwatch(pid) when it exits on its own (a later pid reuse is never killed).
 * Elsewhere both are no-ops. The sentinel starts on the first watch and never keeps this process alive.
 */
export function parentWatch({ platform = process.platform, execPath = process.execPath, electron = process.versions.electron, spawn: spawnImpl = spawn } = {}) {
  let sentinel = null
  let failed = platform !== 'win32'
  const write = (line) => { try { sentinel?.stdin?.write(`${line}\n`) } catch {} }
  const start = () => {
    if (sentinel || failed) return sentinel
    try {
      const env = { ...process.env, ...(electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}) }
      sentinel = spawnImpl(execPath, ['-e', SENTINEL], { stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true, env })
      sentinel.on?.('error', () => { sentinel = null; failed = true })
      sentinel.stdin?.on?.('error', () => {})
      sentinel.unref?.()
      sentinel.stdin?.unref?.()
    } catch { sentinel = null; failed = true }
    return sentinel
  }
  return {
    watch(pid) { if (Number.isInteger(pid) && pid > 0 && start()) write(`+${pid}`) },
    unwatch(pid) { if (sentinel && Number.isInteger(pid) && pid > 0) write(`-${pid}`) },
    get process() { return sentinel },
  }
}

let sharedWatch = null
/** The bridge process's one parentWatch (Windows), shared by every module that starts long-lived children. */
export const bridgeWatch = () => (sharedWatch ??= parentWatch())

/**
 * Run `cleanup` once when this process's parent goes away: stdin ends or closes (the app closed our pipe, or died).
 * Windows has no SIGTERM handler that ever runs (TerminateProcess), so this is how a bridge learns it is being stopped
 * there; the bridges' own 'end' handlers stay as they are.
 */
export function onParentGone(stream, cleanup) {
  let done = false
  const once = () => { if (done) return; done = true; cleanup() }
  stream.on('end', once)
  stream.on('close', once)
  return once
}
