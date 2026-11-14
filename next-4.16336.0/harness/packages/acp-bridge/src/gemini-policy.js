// Gemini CLI's policy rules the bridge must honour where it answers permission requests itself.
//
// Gemini decides every tool call with its policy engine (core policy/policy-engine.ts): rules from TOML files in tiers,
// admin (5: the system policies folder) > user (4: ~/.gemini/policies) > workspace (3: <project>/.gemini/policies, trusted
// folders only) > extension (2) > default (1: the bundled policies), each rule's priority added as priority/1000; the
// highest matching rule wins. The bridge keeps Gemini in its default mode and answers its requests by OpenClaude Desktop's
// mode, so in Auto, Accept edits and Bypass it could allow a call an `ask_user` rule of the user's or the admin's would
// have Gemini ask about, even in Gemini's own YOLO (its yolo allow-all is a default-tier rule). This module reads those
// rules and says when the winner for a call is ask_user, so the bridge shows the card instead (adapter.mustAsk).
//
// Only the matching the user's own rules need: toolName (exact, `*`, `mcp_*`, `mcp_<server>_*`), mcpName, commandPrefix
// (each part of a compound shell command), commandRegex, argsPattern (against Gemini's stable JSON of the args), modes.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TIERS = { admin: 5, user: 4, workspace: 3 }
const MCP_PREFIX = 'mcp_'
const SHELL_TOOLS = new Set(['run_shell_command'])

/** The [[rule]] tables of a policy TOML (strings, numbers, booleans and string arrays; other tables are skipped). */
export function parsePolicyToml(text) {
  const rules = []
  let current = null
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.replace(/^\s+|\s+$/g, '')
    if (!line || line.startsWith('#')) continue
    if (/^\[\[\s*rule\s*\]\]$/.test(line)) { current = {}; rules.push(current); continue }
    if (line.startsWith('[')) { current = null; continue }
    if (!current) continue
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line)
    if (!match) continue
    const value = tomlValue(match[2])
    if (value !== undefined) current[match[1]] = value
  }
  return rules.filter((rule) => rule.toolName !== undefined && typeof rule.decision === 'string')
}

function tomlValue(text) {
  const value = text.replace(/\s+#.*$/, '').trim()
  if (/^"(?:[^"\\]|\\.)*"$/.test(value)) { try { return JSON.parse(value) } catch { return undefined } }
  if (/^'[^']*'$/.test(value)) return value.slice(1, -1)
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if (value === 'true' || value === 'false') return value === 'true'
  if (value.startsWith('[') && value.endsWith(']')) {
    const items = [...value.slice(1, -1).matchAll(/"((?:[^"\\]|\\.)*)"|'([^']*)'/g)].map((item) => (item[1] !== undefined ? JSON.parse(`"${item[1]}"`) : item[2]))
    return items
  }
  return undefined
}

/** Gemini's system config folder (Storage.getSystemConfigDir) and its policies folder. */
export function systemPoliciesDir(platform = process.platform) {
  const base = platform === 'darwin' ? '/Library/Application Support/GeminiCli' : platform === 'win32' ? 'C:\\ProgramData\\gemini-cli' : '/etc/gemini-cli'
  return path.join(base, 'policies')
}

function readRules(dir, tier) {
  let files = []
  try { files = fs.readdirSync(dir).filter((name) => name.endsWith('.toml')).sort() } catch { return [] }
  const out = []
  for (const name of files) {
    let text
    try { text = fs.readFileSync(path.join(dir, name), 'utf8') } catch { continue }
    for (const rule of parsePolicyToml(text)) {
      const priority = Number.isFinite(rule.priority) ? Math.max(0, Math.min(999, rule.priority)) : 0
      out.push({ ...rule, tier, rank: tier + priority / 1000, file: path.join(dir, name) })
    }
  }
  return out
}

/**
 * The admin, user and (trusted) workspace policy rules for a session in `cwd`.
 * @param {{home?: string, cwd?: string | null, trusted?: boolean, systemDir?: string}} options
 */
export function loadGeminiPolicies({ home = os.homedir(), cwd = null, trusted = false, systemDir = systemPoliciesDir() } = {}) {
  return [
    ...readRules(systemDir, TIERS.admin),
    ...readRules(path.join(home, '.gemini', 'policies'), TIERS.user),
    ...(cwd && trusted ? readRules(path.join(cwd, '.gemini', 'policies'), TIERS.workspace) : []),
  ].sort((a, b) => b.rank - a.rank)
}

/** Gemini's stable JSON of a tool call's args (policy-engine stableStringify): sorted keys, top-level pairs NUL-wrapped. */
export function stableArgs(value, top = true) {
  if (value === undefined || value === null || typeof value === 'function' || typeof value === 'symbol') return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => (item === undefined || typeof item === 'function' ? 'null' : stableArgs(item, false))).join(',')}]`
  return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined && typeof value[key] !== 'function').map((key) => {
    const pair = `${JSON.stringify(key)}:${stableArgs(value[key], false)}`
    return top ? `\0${pair}\0` : pair
  }).join(',')}}`
}

const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s"]/g, '\\$&')

function nameMatches(pattern, name, server) {
  if (pattern === '*') return true
  if (!name) return false
  if (pattern === `${MCP_PREFIX}*`) return server !== undefined
  if (pattern.startsWith(MCP_PREFIX) && pattern.endsWith('_*')) {
    const expected = pattern.slice(MCP_PREFIX.length, -2)
    return server === expected && name.startsWith(`${MCP_PREFIX}${expected}_`)
  }
  if (pattern.includes('*')) return new RegExp(`^${pattern.split('*').map(escapeRegex).join('.*')}$`).test(name)
  return pattern === name
}

function ruleMatches(rule, { name, server, args, mode, commands }) {
  if (Array.isArray(rule.modes) && rule.modes.length && !rule.modes.includes(mode)) return false
  if (rule.mcpName !== undefined && (rule.mcpName === '*' ? server === undefined : server !== rule.mcpName)) return false
  const names = Array.isArray(rule.toolName) ? rule.toolName : [rule.toolName]
  if (!names.some((pattern) => typeof pattern === 'string' && (nameMatches(pattern, name, server) || (rule.mcpName && server && name === `${MCP_PREFIX}${rule.mcpName}_${pattern}`)))) return false
  if (rule.commandPrefix !== undefined) {
    const prefixes = Array.isArray(rule.commandPrefix) ? rule.commandPrefix : [rule.commandPrefix]
    if (!commands.some((command) => prefixes.some((prefix) => typeof prefix === 'string' && (command === prefix || command.startsWith(`${prefix} `) || command.startsWith(`${prefix}"`))))) return false
  }
  if (typeof rule.commandRegex === 'string') {
    let regex
    try { regex = new RegExp(rule.commandRegex) } catch { return false }
    if (!commands.some((command) => regex.test(command))) return false
  }
  if (typeof rule.argsPattern === 'string') {
    if (!args) return false
    let regex
    try { regex = new RegExp(rule.argsPattern) } catch { return false }
    if (!regex.test(stableArgs(args))) return false
  }
  return true
}

/** A shell command and each part of it joined by ;, &&, || or | (Gemini checks every part of a compound command). */
export function commandParts(command) {
  const text = typeof command === 'string' ? command.trim() : ''
  if (!text) return []
  const parts = text.split(/\s*(?:&&|\|\||;|\|)\s*/).map((part) => part.trim()).filter(Boolean)
  return [...new Set([text, ...parts])]
}

/**
 * The winning decision of these rules for a call ('ask_user' | 'allow' | 'deny'), with its rule, or null when none matches.
 * mode: Gemini's approval mode the call is judged in ('default', 'autoEdit', 'yolo', 'plan').
 */
export function policyDecision(rules, { name, args = null, mode = 'default' }) {
  const server = typeof name === 'string' && name.startsWith(MCP_PREFIX) ? /^mcp_([^_]+)_/.exec(name)?.[1] : undefined
  const commands = SHELL_TOOLS.has(name) ? commandParts(args?.command) : []
  for (const rule of rules) if (ruleMatches(rule, { name, server, args, mode, commands })) return { decision: rule.decision, rule }
  return null
}

/** Gemini's tool name for an ACP tool call (its toolCallId is `<name>-<time>-<n>`, or `<name>__…`). */
export function geminiToolName(call) {
  const id = typeof call?.toolCallId === 'string' ? call.toolCallId : ''
  return id.split('__')[0].replace(/-\d+-\d+$/, '')
}
