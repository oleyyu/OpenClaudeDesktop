/**
 * Finding the official ZCode runtime and its files.
 *
 * The CLI/agent ships inside the official ZCode desktop release (github.com/zai-org/ZCode/releases, the DMG):
 * `ZCode.app/Contents/Resources/glm/zcode.cjs` (a Node bundle; `zcode app-server --stdio` is the agent process
 * the desktop app itself drives), with the provider catalog beside it in `Resources/config/provider/`.
 * OpenClaude Desktop hands the bridge the program it downloaded or found (CODE_DESKTOP_AGENT_BINARY, run under
 * CODE_DESKTOP_NODE_BINARY when CODE_DESKTOP_AGENT_RUNNER is "node"); without one the bridge looks in the usual
 * install places and on PATH.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const exists = (file) => { try { return fs.statSync(file).isFile() } catch { return false } }

export const SYSTEM_CANDIDATES = Object.freeze([
  '/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs',
  '~/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs',
  '~/.zcode/runtime/zcode/bin/zcode.mjs',
  '~/.local/bin/zcode',
])

const expand = (file, home) => (file.startsWith('~/') ? path.join(home, file.slice(2)) : file)

function onPath(name, env) {
  for (const dir of String(env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
    const file = path.join(dir, name)
    if (exists(file)) return file
  }
  return null
}

/**
 * @returns {{ binary: string|null, command: string|null, prefix: string[], version: string, builtinConfig: string|null, source: string }}
 */
export function locateAgent(env = process.env, home = os.homedir()) {
  let binary = env.CODE_DESKTOP_AGENT_BINARY?.trim() || null
  let source = binary ? 'code-desktop' : null
  if (!binary) {
    for (const candidate of SYSTEM_CANDIDATES) {
      const file = expand(candidate, home)
      if (exists(file)) { binary = file; source = 'system'; break }
    }
  }
  if (!binary) { binary = onPath('zcode', env); if (binary) source = 'path' }
  if (!binary) return { binary: null, command: null, prefix: [], version: env.CODE_DESKTOP_AGENT_VERSION ?? '', builtinConfig: null, source: 'missing' }
  let real = binary
  try { real = fs.realpathSync(binary) } catch {}
  const node = env.CODE_DESKTOP_NODE_BINARY?.trim() || process.execPath
  const script = env.CODE_DESKTOP_AGENT_RUNNER === 'node' || /\.(c|m)?js$/.test(real) || isNodeScript(real)
  return {
    binary: real,
    command: script ? node : real,
    prefix: script ? [real] : [],
    version: env.CODE_DESKTOP_AGENT_VERSION ?? '',
    builtinConfig: builtinConfigNear(real),
    source,
  }
}

function isNodeScript(file) {
  try {
    const fd = fs.openSync(file, 'r')
    const buffer = Buffer.alloc(64)
    fs.readSync(fd, buffer, 0, 64, 0)
    fs.closeSync(fd)
    return /^#!.*\bnode\b/.test(buffer.toString('utf8').split('\n')[0])
  } catch { return false }
}

/** ZCode's shipped provider catalog next to its entry (the same candidates the CLI itself tries, plus the app layout). */
export function builtinConfigNear(entry) {
  const dir = path.dirname(entry)
  const candidates = [
    path.join(dir, 'provider', 'zcode-builtin.json'),
    path.join(dir, '..', 'config', 'provider', 'zcode-builtin.json'),
    path.join(dir, '..', '..', 'config', 'provider', 'zcode-builtin.json'),
    path.resolve(dir, '../../../../../config/provider/zcode-builtin.json'),
  ]
  return candidates.find(exists) ?? null
}

/** The ZCode app's 'Data storage path' (Settings › Data storage path): `dataBaseDir` in ~/.zcode/v2/setting.json, which
 * always stays in HOME (services paths.ts; desktop desktopDataBaseDirBootstrap.ts), trimmed and ~-expanded; null when unset. */
export function settingDataBaseDir(home = os.homedir()) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(home, '.zcode', 'v2', 'setting.json'), 'utf8'))?.dataBaseDir
    if (typeof value !== 'string' || !value.trim()) return null
    const dir = value.trim() === '~' ? home : expand(value.trim(), home)
    return path.isAbsolute(dir) ? dir : null
  } catch { return null }
}

/** The user's ZCode data root (~ unless ZCODE_DATA_BASE_DIR, or the ZCode app's data storage path, moves it) and the
 * files the bridge reads there. dataBaseDir: the moved base the agent must be started with (null for HOME). */
export function zcodePaths(env = process.env, home = os.homedir()) {
  const moved = env.ZCODE_DATA_BASE_DIR?.trim() || settingDataBaseDir(home)
  const base = moved || home
  const root = path.join(base, '.zcode')
  const cliConfig = path.join(root, 'cli', 'config.json')
  let sessionDb = path.join(root, 'cli', 'db', 'db.sqlite')
  try {
    const configured = JSON.parse(fs.readFileSync(cliConfig, 'utf8'))?.storage?.sessionDbPath
    if (typeof configured === 'string' && configured.trim()) sessionDb = expand(configured.trim(), home)
  } catch {}
  return {
    root,
    dataBaseDir: moved && path.resolve(moved) !== path.resolve(home) ? moved : null,
    cliConfig,
    sessionDb,
    personalProviders: env.ZCODE_PERSONAL_PROVIDER_CONFIG_FILE_USER?.trim() || path.join(root, 'v2', 'provider_config.json'),
    credentials: path.join(root, 'v2', 'credentials.json'),
    skillsDir: path.join(root, 'skills'),
  }
}
