/**
 * codeDesktop/profile/read: the profile rows this core runs, for Settings ›
 * Harness. Pure: index.js passes the Loader entries (configEditor.entries()
 * or loader.entries(), as profileMcpEntries reads them) and
 * pluginManager.listBundles().
 *
 * Only facts a switch needs leave the core: id, module, disabled, fiber phase,
 * a kind, the MCP server name and transport, the skill folders the
 * skill-filesystem row reads, a hook row's config file. Never config values
 * that may carry secrets (env, headers, keys).
 */
import { MCP_CLIENT, fiberPhase, serverNameOf } from './catalog.js'

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * The kind Settings › Harness groups a row under.
 * @param {string} module - the row's plugin module name
 * @returns {'mcp'|'skill'|'hook'|'tool'|'llm'|'core'}
 */
export function entryKind(module) {
  const name = typeof module === 'string' ? module : ''
  if (name === MCP_CLIENT) return 'mcp'
  if (/dsh-(skill|tool-skill)(-|$|\/)/.test(name)) return 'skill'
  if (/dsh-hooks?-/.test(name)) return 'hook'
  if (/dsh-llm(-|$|\/)/.test(name)) return 'llm'
  if (/dsh-tool-/.test(name)) return 'tool'
  return 'core'
}

const strings = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [])

/** One entry row for profile/read. */
export function profileEntry(entry, bundleOf = new Map()) {
  const options = isRecord(entry?.options) ? entry.options : {}
  const id = typeof options.id === 'string' ? options.id : ''
  const module = typeof options.name === 'string' ? options.name : ''
  if (!id || !module) return null
  const kind = entryKind(module)
  const config = isRecord(options.config) ? options.config : {}
  const row = {
    id,
    module,
    disabled: entry?.disabled === true || options.disabled === true,
    phase: fiberPhase(entry),
    kind,
  }
  if (kind === 'mcp') {
    const serverName = serverNameOf(entry)
    if (serverName) row.serverName = serverName
    if (config.transport === 'stdio' || config.transport === 'streamable-http') row.transport = config.transport
  }
  if (module.endsWith('/dsh-skill-filesystem')) row.customSkillDirs = strings(config.customSkillDirs)
  if (kind === 'hook' && typeof config.configPath === 'string') row.configPath = config.configPath
  const bundle = bundleOf.get(id)
  if (bundle) row.bundle = bundle
  return row
}

/**
 * @param {{entries?: Iterable<object>, bundles?: object[], patchPath?: string|null, dir?: string|null}} input
 * @returns {{patchPath: string|null, profileDir: string|null, entries: object[], bundles: {name: string, rowIds: string[]}[]}}
 */
export function profileReadResponse({ entries, bundles, patchPath = null, dir = null } = {}) {
  const bundleRows = []
  const bundleOf = new Map()
  for (const bundle of Array.isArray(bundles) ? bundles : []) {
    if (typeof bundle?.name !== 'string' || !bundle.name) continue
    const rowIds = (Array.isArray(bundle.rows) ? bundle.rows : []).map((row) => row?.rowId).filter((id) => typeof id === 'string' && id)
    for (const id of rowIds) if (!bundleOf.has(id)) bundleOf.set(id, bundle.name)
    bundleRows.push({ name: bundle.name, rowIds, ...(bundle.enabled === false ? { enabled: false } : {}), ...(typeof bundle.version === 'string' ? { version: bundle.version } : {}) })
  }
  const rows = []
  const seen = new Set()
  for (const entry of entries ?? []) {
    const row = profileEntry(entry, bundleOf)
    if (!row || seen.has(row.id)) continue
    seen.add(row.id)
    rows.push(row)
  }
  return { patchPath: patchPath ?? null, profileDir: dir ?? null, entries: rows, bundles: bundleRows }
}
