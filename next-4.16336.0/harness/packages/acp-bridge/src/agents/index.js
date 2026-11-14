/**
 * Which ACP agent this bridge drives, and how to start it.
 *
 * OpenClaude Desktop starts the same bridge script for Gemini CLI, Qwen Code, Kimi
 * Code and MiniMax Code and passes only the agent program
 * (CODE_DESKTOP_AGENT_BINARY, CODE_DESKTOP_AGENT_RUNNER …). The agent is told
 * apart, in order, by:
 *   1. CODE_DESKTOP_ACP_AGENT / CODE_DESKTOP_CORE_ID (an explicit id),
 *   2. the npm package that owns the entry file (package.json "name" walking up),
 *   3. the binary's name (gemini, qwen, kimi, mcode) or the app's core folder
 *      (<userData>/cores/<id>/…),
 *   4. `<binary> --version` / `--help` output.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import gemini from './gemini.js'
import qwen from './qwen.js'
import kimi from './kimi.js'
import minimax from './minimax.js'

export const ADAPTERS = [gemini, qwen, kimi, minimax]
export const adapterById = (id) => ADAPTERS.find((adapter) => adapter.id === id) ?? null

/** The package.json name owning a file, walking up a few levels. */
export function owningPackage(file) {
  let dir = path.dirname(file)
  for (let level = 0; level < 5; level++) {
    try {
      const value = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
      if (typeof value?.name === 'string') return value.name
    } catch {}
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

function onPath(name, env) {
  for (const dir of String(env.PATH ?? '').split(':').filter(Boolean)) {
    const file = path.join(dir, name)
    try { fs.accessSync(file, fs.constants.X_OK); if (fs.statSync(file).isFile()) return file } catch {}
  }
  return null
}

/**
 * The agent program from the environment: {binary, runner, node, version}.
 * @returns {{ binary: string | null, runner: string, node: string, version: string }}
 */
export function agentProgram(env = process.env, adapter = null) {
  let binary = env.CODE_DESKTOP_AGENT_BINARY || null
  if (!binary && adapter) for (const name of adapter.binaryNames) { binary = onPath(name, env); if (binary) break }
  const node = env.CODE_DESKTOP_NODE_BINARY || process.execPath
  let runner = env.CODE_DESKTOP_AGENT_RUNNER || ''
  // A .js/.mjs entry (an npm package) runs under Node even when the runner was not passed.
  if (!runner && binary && /\.(c|m)?js$/.test(binary)) runner = 'node'
  return { binary, runner, node, version: env.CODE_DESKTOP_AGENT_VERSION || '' }
}

/** Which adapter drives this agent, or null when nothing identifies it. */
export function detectAdapter(env = process.env) {
  const explicit = env.CODE_DESKTOP_ACP_AGENT || env.CODE_DESKTOP_CORE_ID
  if (explicit && adapterById(explicit)) return adapterById(explicit)
  const binary = env.CODE_DESKTOP_AGENT_BINARY
  if (binary) {
    let resolved = binary
    try { resolved = fs.realpathSync(binary) } catch {}
    const pkg = owningPackage(resolved)
    const byPackage = pkg && ADAPTERS.find((adapter) => adapter.packageNames.includes(pkg))
    if (byPackage) return byPackage
    const base = path.basename(binary).replace(/\.(c|m)?js$/, '')
    const byName = ADAPTERS.find((adapter) => adapter.binaryNames.includes(base))
    if (byName) return byName
    const byFolder = ADAPTERS.find((adapter) => resolved.split(path.sep).includes(adapter.id) && resolved.includes(`${path.sep}cores${path.sep}${adapter.id}${path.sep}`))
    if (byFolder) return byFolder
    try {
      const program = agentProgram(env)
      const [file, args] = program.runner === 'node' ? [program.node, [binary, '--help']] : [binary, ['--help']]
      const text = execFileSync(file, args, { timeout: 10000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...env, NO_COLOR: '1' } })
      const byHelp = ADAPTERS.find((adapter) => adapter.helpPattern.test(text))
      if (byHelp) return byHelp
    } catch {}
  }
  return null
}

/** The {command, args} that starts the agent with extra args (Node entries run under CODE_DESKTOP_NODE_BINARY). */
export function commandLine(program, args) {
  if (program.runner === 'node') return { command: program.node, args: [program.binary, ...args] }
  return { command: program.binary, args }
}

/** `--version` output (first line), or ''. */
export function agentVersion(program, env) {
  if (!program.binary) return ''
  try {
    const { command, args } = commandLine(program, ['--version'])
    return execFileSync(command, args, { timeout: 15000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env }).trim().split('\n')[0].replace(/^[^\d]*/, '').trim()
  } catch {
    return ''
  }
}
