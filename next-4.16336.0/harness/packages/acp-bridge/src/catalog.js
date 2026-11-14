/**
 * Settings catalog helpers shared by the agent adapters: skill folders
 * (<root>/<name>/SKILL.md with YAML frontmatter), the agents' JSON config
 * files (settings.json / mcp.json) read and edited in place, and the Codex
 * skills/list, config/read, plugin/installed shapes.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { COMMAND_PATH } from './input.js'

/** Reads a JSON file (comments and trailing commas tolerated), or the fallback. */
export function readJsonFile(file, fallback = null) {
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch { return fallback }
  try { return JSON.parse(text) } catch {}
  try { return JSON.parse(stripJsonComments(text)) } catch { return fallback }
}

/** Removes // and /* *\/ comments and trailing commas outside strings. */
export function stripJsonComments(text) {
  let out = ''
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      out += ch
      if (ch === '\\') { out += text[++i] ?? ''; continue }
      if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; out += ch; continue }
    if (ch === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue }
    if (ch === '/' && text[i + 1] === '*') { i += 2; while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++; i++; continue }
    out += ch
  }
  return out.replace(/,(\s*[}\]])/g, '$1')
}

/** Writes JSON atomically, keeping a .bak of the previous file once. */
export function writeJsonFile(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  try { if (fs.existsSync(file) && !fs.existsSync(`${file}.code-desktop.bak`)) fs.copyFileSync(file, `${file}.code-desktop.bak`) } catch {}
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n')
  fs.renameSync(temp, file)
}

/** Minimal YAML frontmatter (key: value, key: [a, b], block lists) of a Markdown file. */
export function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text ?? '')
  if (!match) return {}
  const out = {}
  let listKey = null
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '')
    const item = /^\s+-\s+(.*)$/.exec(line)
    if (item && listKey) { out[listKey].push(unquote(item[1])); continue }
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!pair) continue
    const [, key, value] = pair
    if (value === '') { out[key] = []; listKey = key; continue }
    listKey = null
    if (/^\[.*\]$/.test(value)) out[key] = value.slice(1, -1).split(',').map((entry) => unquote(entry.trim())).filter(Boolean)
    else if (value === 'true' || value === 'false') out[key] = value === 'true'
    else out[key] = unquote(value)
  }
  return out
}
const unquote = (value) => value.replace(/^(['"])(.*)\1$/, '$2')

/**
 * Skills under the given roots: [{root, scope}] → SkillMetadata rows. `flat` also takes the single-file form (Kimi's
 * <root>/<name>.md: named by its frontmatter or file name, described by its frontmatter or first body line); a
 * <name>/SKILL.md in the same root wins over it.
 * @param {{ path: string, scope: 'repo' | 'user' | 'system' }[]} roots
 */
export function scanSkills(roots, { disabled = [], flat = false, recursive = false } = {}) {
  const seen = new Set()
  const skills = []
  const add = (root, file, text, fallbackName, fallbackDescription = '', parent = null) => {
    const meta = frontmatter(text)
    const own = typeof meta.name === 'string' && meta.name ? meta.name : fallbackName
    // A sub-skill of a bundle (Kimi: a skill whose SKILL.md sets has-sub-skill) is qualified as parent.child.
    const name = parent && own !== parent && !own.startsWith(`${parent}.`) ? `${parent}.${own}` : own
    if (seen.has(name)) return name
    seen.add(name)
    const modelInvocable = meta['disable-model-invocation'] !== true && meta.disableModelInvocation !== true
    const userInvocable = meta['user-invocable'] !== false
    const off = disabled.includes(name)
    skills.push({
      name, description: typeof meta.description === 'string' ? meta.description : fallbackDescription, path: file, scope: root.scope,
      enabled: !off && modelInvocable, userInvocable: !off && userInvocable, modelInvocable: !off && modelInvocable,
      ...(typeof meta.version === 'string' ? { version: meta.version } : {}), pluginId: root.pluginId ?? null,
    })
    return name
  }
  if (recursive) {
    for (const root of roots) walkSkillDir(root, root.path, true, 0, null, add, flat)
    return skills
  }
  for (const root of roots) {
    let entries = []
    try { entries = fs.readdirSync(root.path, { withFileTypes: true }) } catch { continue }
    const dirs = new Set()
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
      const file = path.join(root.path, entry.name, 'SKILL.md')
      let text
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      dirs.add(entry.name)
      add(root, file, text, entry.name)
    }
    if (!flat) continue
    for (const entry of entries) {
      if (!/\.md$/i.test(entry.name) || entry.name === 'SKILL.md' || (!entry.isFile() && !entry.isSymbolicLink())) continue
      const base = entry.name.replace(/\.md$/i, '')
      if (dirs.has(base)) continue
      const file = path.join(root.path, entry.name)
      let text
      try { text = fs.readFileSync(file, 'utf8') } catch { continue }
      const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
      const firstLine = body.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, '').trim()).find(Boolean) ?? ''
      add(root, file, text, base, firstLine.slice(0, 240))
    }
  }
  return skills
}

const MAX_SKILL_DEPTH = 8
const hasSubSkills = (text) => {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? ''
  return /^\s*(?:has-sub-skill|hasSubSkill)\s*:\s*true\s*$/m.test(block)
}
/**
 * Kimi's skill walk (agent-core-v2 features/skill/catalog/fileSkillDiscovery.ts): every <dir>/SKILL.md below a root,
 * descending into folders that are not skills (node_modules and dot folders skipped, 8 levels at most) and into a
 * skill's own folder only when it is a bundle (has-sub-skill: true), whose skills are named parent.child. The root's
 * own SKILL.md counts for a plugin root (root.pluginRoot) and is the only one for root.rootOnly; flat <name>.md files
 * count at the top level only.
 */
function walkSkillDir(root, dir, top, depth, parent, add, flat) {
  if (depth > MAX_SKILL_DEPTH) return
  const readSkill = (file) => { try { return fs.readFileSync(file, 'utf8') } catch { return null } }
  if (root.rootOnly) {
    const text = readSkill(path.join(dir, 'SKILL.md'))
    if (text !== null) add(root, path.join(dir, 'SKILL.md'), text, path.basename(dir))
    return
  }
  let entries = []
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) } catch { return }
  const skillDirs = new Map()
  const subdirs = []
  for (const entry of entries) {
    const isDir = entry.isDirectory() || (entry.isSymbolicLink() && (() => { try { return fs.statSync(path.join(dir, entry.name)).isDirectory() } catch { return false } })())
    if (!isDir) continue
    const text = readSkill(path.join(dir, entry.name, 'SKILL.md'))
    if (text !== null) skillDirs.set(entry.name, text)
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    subdirs.push(entry.name)
  }
  const bundles = new Map()
  for (const [name, text] of skillDirs) {
    const registered = add(root, path.join(dir, name, 'SKILL.md'), text, name, '', parent)
    if (hasSubSkills(text)) bundles.set(name, registered)
  }
  if (top) {
    if (root.pluginRoot) {
      const text = readSkill(path.join(dir, 'SKILL.md'))
      if (text !== null) add(root, path.join(dir, 'SKILL.md'), text, path.basename(dir))
    }
    if (flat) {
      for (const entry of entries) {
        if (!/\.md$/i.test(entry.name) || entry.name === 'SKILL.md' || (!entry.isFile() && !entry.isSymbolicLink())) continue
        const base = entry.name.replace(/\.md$/i, '')
        if (skillDirs.has(base)) continue
        const text = readSkill(path.join(dir, entry.name))
        if (text === null) continue
        const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
        const firstLine = body.split(/\r?\n/).map((line) => line.replace(/^#+\s*/, '').trim()).find(Boolean) ?? ''
        add(root, path.join(dir, entry.name), text, base, firstLine.slice(0, 240))
      }
    }
  }
  for (const name of subdirs) {
    if (skillDirs.has(name) && !bundles.has(name)) continue
    walkSkillDir(root, path.join(dir, name), false, depth + 1, bundles.get(name) ?? parent, add, flat)
  }
}

/**
 * ACP available commands → slash-menu rows (user-invocable, never model-invocable). The composer's slash
 * grammar is one token, so a command's subcommands ("memory refresh", "restore list" — Gemini lists them as
 * commands of their own) fold into their parent's row: its argument hint names them and its description
 * lists what each does.
 */
export function commandSkills(commands, known = new Set()) {
  const list = Array.isArray(commands) ? commands : []
  const nameOf = (command) => (typeof command?.name === 'string' ? command.name.trim().replace(/^\//, '') : '')
  const subcommands = new Map()
  for (const command of list) {
    const [parent, ...rest] = nameOf(command).split(/\s+/)
    if (!parent || !rest.length) continue
    if (!subcommands.has(parent)) subcommands.set(parent, [])
    subcommands.get(parent).push({ name: rest.join(' '), description: typeof command.description === 'string' ? command.description.trim() : '' })
  }
  const rows = []
  const row = (name, description, hint) => ({
    name, description, path: `${COMMAND_PATH}${name}`, scope: 'system',
    enabled: false, userInvocable: true, modelInvocable: false, pluginId: null,
    // Bridge field: an agent command (no SKILL.md to show).
    command: true, argumentHint: hint,
  })
  for (const command of list) {
    const name = nameOf(command)
    if (!name || /\s/.test(name) || known.has(name)) continue
    known.add(name)
    const subs = subcommands.get(name) ?? []
    const own = typeof command.description === 'string' ? command.description : ''
    const description = subs.length ? [own, ...subs.map((sub) => `${sub.name}${sub.description ? ` — ${sub.description}` : ''}`)].filter(Boolean).join('\n') : own
    rows.push(row(name, description, command.input?.hint ?? (subs.length ? subs.map((sub) => sub.name.split(/\s+/)[0]).filter((value, index, all) => all.indexOf(value) === index).join(' | ') : null)))
  }
  // A subcommand whose parent is not listed itself: the parent row stands for them.
  for (const [parent, subs] of subcommands) {
    if (known.has(parent)) continue
    known.add(parent)
    rows.push(row(parent, subs.map((sub) => `${sub.name}${sub.description ? ` — ${sub.description}` : ''}`).join('\n'), subs.map((sub) => sub.name.split(/\s+/)[0]).filter((value, index, all) => all.indexOf(value) === index).join(' | ')))
  }
  return rows
}

/**
 * Normalizes one configured MCP server (Gemini/Qwen settings, Kimi/MiniMax mcp.json, Codex config.toml shapes).
 * `transport`: stdio, http (streamable HTTP), sse, or auto (Gemini's `url` without a `type`: HTTP first, then SSE).
 * `urlTransport` is what a bare `url` means for the agent (Kimi, MiniMax: http; Qwen: sse; Gemini: auto).
 */
export function normalizeMcpServer(name, value, source, extra = {}, { urlTransport = 'http' } = {}) {
  if (!value || typeof value !== 'object') return null
  const url = value.httpUrl ?? value.url ?? null
  const declared = String(value.type ?? value.transport ?? '').toLowerCase().replace(/[-_]/g, '')
  const transport = typeof value.command === 'string' && typeof url !== 'string' ? 'stdio'
    : typeof value.httpUrl === 'string' ? 'http'
      : declared === 'sse' ? 'sse' : declared === 'http' || declared === 'streamablehttp' ? 'http' : urlTransport
  return {
    name,
    ...(typeof value.command === 'string' ? { command: value.command, args: Array.isArray(value.args) ? value.args.map(String) : [] } : {}),
    ...(typeof url === 'string' ? { url, transport } : { transport: 'stdio' }),
    env: value.env && typeof value.env === 'object' ? value.env : {},
    headers: value.headers ?? value.http_headers ?? {},
    cwd: typeof value.cwd === 'string' ? value.cwd : undefined,
    disabled: value.enabled === false || value.disabled === true,
    source,
    ...extra,
  }
}

/** Codex config.toml-shaped table for config/read (env/header names only, never values). */
export function mcpTable(server) {
  const table = {}
  if (server.command) table.command = server.command
  if (server.args?.length) table.args = server.args
  if (server.url) table.url = server.url
  if (server.cwd) table.cwd = server.cwd
  if (Object.keys(server.env ?? {}).length) table.env = Object.fromEntries(Object.keys(server.env).map((key) => [key, '']))
  if (Object.keys(server.headers ?? {}).length) table.http_headers = Object.fromEntries(Object.keys(server.headers).map((key) => [key, '']))
  table.enabled = !server.disabled
  return table
}

/** One Codex PluginSummary for an agent extension/plugin. */
export function pluginSummary({ id, name, version = null, description = '', enabled = true, path: dir = '', removable = true, extra = {} }) {
  return {
    id, remotePluginId: null, version, localVersion: version, name, shareContext: null,
    source: { type: 'local', path: dir }, installed: true, installedAt: null, enabled,
    installPolicy: 'AVAILABLE', installPolicySource: null, mustShowInstallationInterstitial: null, authPolicy: 'ON_USE',
    availability: 'AVAILABLE', disabledReason: null, eligiblePlanTypes: null,
    interface: {
      displayName: name, shortDescription: description, longDescription: null, developerName: null, category: null, capabilities: [],
      websiteUrl: null, privacyPolicyUrl: null, termsOfServiceUrl: null, defaultPrompt: null, brandColor: null,
      composerIcon: null, composerIconUrl: null, logo: null, logoDark: null, logoUrl: null, logoUrlDark: null, screenshots: [], screenshotUrls: [],
    },
    keywords: [],
    codeDesktop: { removable, optional: true, held: true, experimental: false, title: null, description: description || null, icon: null, components: 0, readOnlyReason: null, loadError: null, ...extra },
  }
}

export const expandHome = (file, home = os.homedir()) => (typeof file === 'string' && file.startsWith('~/') ? path.join(home, file.slice(2)) : file)

/** Directories from cwd up to the git root (or 8 levels), cwd first. */
export function projectDirs(cwd, home = os.homedir()) {
  const out = []
  let dir = path.resolve(cwd)
  for (let level = 0; level < 8; level++) {
    if (dir === home || dir === path.parse(dir).root) break
    out.push(dir)
    if (fs.existsSync(path.join(dir, '.git'))) break
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return out
}

// ------------------------------------------------------------------ core settings
// An agent's own settings.json keys OpenClaude Desktop can show and change (codeDesktop/coreSettings/read|write): each
// definition {key (dotted path), type boolean | number | integer | select | string, default, min?, max?, options?}.
export function settingAt(object, key) {
  return String(key).split('.').reduce((value, part) => (value && typeof value === 'object' && !Array.isArray(value) ? value[part] : undefined), object)
}
export function withSetting(object, key, value) {
  const parts = String(key).split('.')
  const root = object && typeof object === 'object' && !Array.isArray(object) ? { ...object } : {}
  let node = root
  for (const part of parts.slice(0, -1)) {
    node[part] = node[part] && typeof node[part] === 'object' && !Array.isArray(node[part]) ? { ...node[part] } : {}
    node = node[part]
  }
  if (value === null || value === undefined) delete node[parts.at(-1)]
  else node[parts.at(-1)] = value
  return root
}
/** A definition's value check: the value to store, or throws; null resets to the agent's default. */
export function coreSettingValue(def, value) {
  if (value === null) return null
  switch (def.type) {
    case 'boolean': if (typeof value === 'boolean') return value; break
    case 'number': case 'integer':
      if (typeof value === 'number' && Number.isFinite(value) && (def.type !== 'integer' || Number.isInteger(value)) && (def.min === undefined || value >= def.min) && (def.max === undefined || value <= def.max)) return value
      break
    case 'select': if ((def.options ?? []).includes(value)) return value; break
    case 'string': if (typeof value === 'string' && value.length <= 200 && !/[\u0000-\u001f]/.test(value)) return value.trim() || null; break
  }
  throw new Error(`Invalid value for ${def.key}.`)
}
export function coreSettingsView(defs, settings) {
  return defs.map((def) => {
    const stored = settingAt(settings, def.key)
    let value = null
    try { value = stored === undefined ? null : coreSettingValue(def, stored) } catch { value = null }
    return { key: def.key, type: def.type, value, default: def.default ?? null, ...(def.min !== undefined ? { min: def.min } : {}), ...(def.max !== undefined ? { max: def.max } : {}), ...(def.options ? { options: [...def.options] } : {}) }
  })
}
