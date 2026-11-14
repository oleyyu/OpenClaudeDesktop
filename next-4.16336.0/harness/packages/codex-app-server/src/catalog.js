/**
 * Settings catalog on the DeepSeek core: Harness skills, the profile's MCP
 * client entries and bundles in the Codex skills/list, config/read,
 * mcpServerStatus/list and plugin/installed|read shapes. Pure: index.js reads
 * the services and passes their values in.
 *
 *   skills      ctx.skills.snapshot({cwd}) SkillSummary → SkillMetadata
 *   config/read the thread's (or the default) permission, plus one
 *               mcp_servers table per MCP client entry: transport facts and
 *               env/header NAMES only, never their values
 *   MCP status  one McpServerStatus per @deepseek-ai/dsh-mcp-client entry,
 *               from the entry's fiber phase and its registered tools
 *   plugins     pluginManager.listBundles() → one local marketplace (the
 *               bridge's own profile)
 */

/** The Harness plugin behind every MCP server (one entry per server). */
export const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'
/** The one marketplace plugin/installed reports: the bridge's profile. */
export const PROFILE_MARKETPLACE = 'deepseek-harness'
/** LiveThread's starting permission, also config/read's default. */
export const DEFAULT_PERMISSION = Object.freeze({ approvalPolicy: 'on-request', sandbox: 'workspace-write' })

// ------------------------------------------------------------------- skills

/**
 * Harness SkillSource → Codex SkillScope: project-* roots belong to the
 * repository, user-* and custom roots to the user, everything else
 * (bundled, runtime) ships with the core.
 * @param {string | undefined} source
 * @returns {'repo' | 'user' | 'system'}
 */
export function skillScope(source) {
  const value = typeof source === 'string' ? source : ''
  if (value.startsWith('project')) return 'repo'
  if (value.startsWith('user') || value === 'custom') return 'user'
  return 'system'
}

// SKILL.md `metadata.version` (dsh-skill-filesystem optionalMetadata), as text.
const skillVersion = (metadata) => {
  const version = metadata !== null && typeof metadata === 'object' ? metadata.version : undefined
  if (typeof version === 'string' && version.trim()) return { version: version.trim() }
  return Number.isFinite(version) ? { version: String(version) } : {}
}

/**
 * One SkillsListEntry from a registry observation. Pathless (virtual) skills
 * have nothing to show or reveal and are skipped, as are skills neither the
 * model nor the user may invoke. `enabled` is model invocation: Harness has
 * no per-skill switch, `disable-model-invocation: true` in SKILL.md is the
 * only way to keep the model from using a skill. `userInvocable` /
 * `modelInvocable` carry the whole invocation policy (a slash-only skill is
 * user-invocable with enabled false; `user-invocable: false` is model-only),
 * and `version` is SKILL.md `metadata.version` when present; Codex clients
 * ignore these extra SkillMetadata fields.
 * @param {string} cwd
 * @param {{skills?: object[], complete?: boolean} | undefined} snapshot - SkillCatalogSnapshot
 */
export function skillsListEntry(cwd, snapshot) {
  const skills = []
  for (const summary of snapshot?.skills ?? []) {
    if (typeof summary?.path !== 'string' || !summary.path || typeof summary.name !== 'string') continue
    const invocation = summary.invocation ?? {}
    if (invocation.modelInvocable === false && invocation.userInvocable === false) continue
    skills.push({
      name: summary.name,
      description: typeof summary.description === 'string' ? summary.description : '',
      path: summary.path,
      scope: skillScope(summary.source),
      enabled: invocation.modelInvocable !== false,
      userInvocable: invocation.userInvocable !== false,
      modelInvocable: invocation.modelInvocable !== false,
      ...skillVersion(summary.metadata),
      pluginId: null,
    })
  }
  // An incomplete observation still lists what was found; the client shows
  // one error row for the workspace.
  const errors = snapshot?.complete === false ? [{ path: cwd, message: 'Some skill sources could not be read.' }] : []
  return { cwd, skills, errors }
}

// ---------------------------------------------------------------------- MCP

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The MCP server name an entry registers its tools under, or null. */
export function serverNameOf(entry) {
  const name = entry?.options?.config?.serverName
  return typeof name === 'string' && name ? name : null
}

/** The profile's MCP client entries (Loader entries, or test doubles of them). */
export function mcpClientEntries(entries) {
  return [...(entries ?? [])].filter((entry) => entry?.options?.name === MCP_CLIENT && serverNameOf(entry) !== null)
}

// Cordis FiberState is a const enum: PENDING, LOADING, ACTIVE, FAILED,
// DISPOSED, UNLOADING (dsh-host-plugin-inventory FIBER_PHASE).
const FIBER_PHASES = ['pending', 'loading', 'active', 'failed', null, 'unloading']

/** PluginFiberPhase of a Loader entry: null without a live fiber. */
export function fiberPhase(entry) {
  const state = entry?.fiber?.state
  return Number.isInteger(state) ? FIBER_PHASES[state] ?? null : null
}

/**
 * Codex McpServerConnectionStatus for one entry. An active fiber is as far as
 * the core can tell: a server whose first connection failed without
 * failOnStartupError still activates (with no tools) and reconnects itself.
 */
export function mcpRuntimeStatus(entry) {
  if (entry?.disabled) return 'disabled'
  switch (fiberPhase(entry)) {
    case 'active': return 'connected'
    case 'pending':
    case 'loading': return 'starting'
    case 'failed': return 'failed'
    default: return null
  }
}

// Secrets live in env values and headers: only their names leave the core.
const namesOnly = (record) => (isRecord(record) ? Object.fromEntries(Object.keys(record).map((key) => [key, ''])) : undefined)

/** One config.toml-shaped mcp_servers table for an entry (no secret values). */
export function mcpServerTable(entry) {
  const config = isRecord(entry?.options?.config) ? entry.options.config : {}
  const table = {}
  if (typeof config.command === 'string') table.command = config.command
  if (Array.isArray(config.args)) table.args = config.args.filter((arg) => typeof arg === 'string')
  if (typeof config.url === 'string') table.url = config.url
  if (typeof config.cwd === 'string' && config.cwd) table.cwd = config.cwd
  const env = namesOnly(config.env)
  if (env) table.env = env
  const headers = namesOnly(config.headers)
  if (headers) table.http_headers = headers
  table.enabled = !entry?.disabled
  return table
}

/**
 * config/read: the effective sandbox and approval policy plus the MCP
 * servers. No config layers exist on this core (the Mode menu sets each
 * session's preset), so origins is empty and layers null.
 * @param {{permission?: {approvalPolicy?: string, sandbox?: string}, mcpEntries?: object[]}} input
 */
export function configReadResponse({ permission, mcpEntries = [] } = {}) {
  const servers = {}
  for (const entry of mcpClientEntries(mcpEntries)) servers[serverNameOf(entry)] = mcpServerTable(entry)
  return {
    config: {
      sandbox_mode: permission?.sandbox ?? DEFAULT_PERMISSION.sandbox,
      approval_policy: permission?.approvalPolicy ?? DEFAULT_PERMISSION.approvalPolicy,
      mcp_servers: servers,
    },
    origins: {},
    layers: null,
  }
}

/**
 * The live thread config/read describes for a working directory: the most
 * recently active one whose cwd is one of `cwds` (the raw and the resolved
 * spelling), or undefined for the default permission.
 * @param {Iterable<{cwd: string, lastActivityMs?: number, closing?: unknown}>} threads
 * @param {string[]} cwds
 */
export function latestThreadIn(threads, cwds) {
  const wanted = new Set(cwds.filter((cwd) => typeof cwd === 'string' && cwd))
  let best
  for (const thread of threads) {
    if (thread.closing || !wanted.has(thread.cwd)) continue
    if (!best || (thread.lastActivityMs ?? 0) > (best.lastActivityMs ?? 0)) best = thread
  }
  return best
}

/**
 * mcpServerStatus/list rows. Tools come from the registry's model-facing
 * schemas (`mcp__<server>__<raw>`), keyed by the raw MCP tool name. Harness
 * keeps MCP auth inside the transport config, so authStatus is unsupported.
 * @param {object[]} entries - Loader entries (any; non-MCP ones are ignored)
 * @param {Array<string | {name: string, description?: string, parameters?: object}>} tools
 */
export function mcpServerStatuses(entries, tools = []) {
  return mcpClientEntries(entries).map((entry) => {
    const name = serverNameOf(entry)
    const prefix = `mcp__${name}__`
    const serverTools = {}
    for (const tool of tools) {
      const toolName = typeof tool === 'string' ? tool : tool?.name
      if (typeof toolName !== 'string' || !toolName.startsWith(prefix) || toolName.length === prefix.length) continue
      const raw = toolName.slice(prefix.length)
      serverTools[raw] = {
        name: raw,
        ...(typeof tool?.description === 'string' && tool.description ? { description: tool.description } : {}),
        inputSchema: isRecord(tool?.parameters) ? tool.parameters : { type: 'object' },
      }
    }
    return { name, runtimeStatus: mcpRuntimeStatus(entry), pluginId: null, serverInfo: null, tools: serverTools, resources: [], resourceTemplates: [], authStatus: 'unsupported' }
  }).sort((left, right) => left.name.localeCompare(right.name))
}

// ------------------------------------------------------------------ plugins

// LocalizedText: a literal, or translations with a required English entry.
const localized = (text) => (typeof text === 'string' ? text : typeof text?.en === 'string' ? text.en : '')

// A LocalizedText kept whole for the client ({en, zh, …} or a literal), or null.
function localizedMeta(text) {
  if (typeof text === 'string') return text || null
  if (!text || typeof text !== 'object') return null
  const entries = Object.entries(text).filter(([key, value]) => /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/u.test(key) && typeof value === 'string' && value)
  return entries.length ? Object.fromEntries(entries) : null
}

function bundleDescription(bundle) {
  return (typeof bundle?.description === 'string' && bundle.description) || localized(bundle?.meta?.description)
}

/**
 * Official bundles that can't work in OpenClaude Desktop, whatever their switch says (codeDesktop.unavailable):
 * - Schedule delivers reminders through the DeepSeek app's own Web Session controller (dsh-schedule README), which the
 *   OpenClaude Desktop profile doesn't mount, so its entry stays pending and its tools never register;
 * - Agent Team replaces DeepSeek's sub-agents with team tools OpenClaude Desktop has no member or task view for;
 * - Auto review's review step isn't connected here, so turning it on would only look like a safety net.
 */
export const UNAVAILABLE_BUNDLES = Object.freeze({
  '@deepseek-ai/dsh-experimental-schedule-bundle': 'needsHost',
  '@deepseek-ai/dsh-experimental-agent-team-profile': 'notSupported',
  '@deepseek-ai/dsh-experimental-auto-review': 'notSupported',
})

/**
 * Why a bundle can't run in OpenClaude Desktop, or null: a known one (UNAVAILABLE_BUNDLES), or an enabled bundle one of whose
 * rows the loader still holds pending (waiting for a service this host never provides). phases: rowId → fiber phase.
 */
export function bundleUnavailable(bundle, phases = null) {
  if (Object.hasOwn(UNAVAILABLE_BUNDLES, bundle?.name)) return UNAVAILABLE_BUNDLES[bundle.name]
  if (bundle?.enabled !== true || !(phases instanceof Map) || !Array.isArray(bundle.rows)) return null
  return bundle.rows.some((row) => row && phases.get(row.rowId) === 'pending') ? 'needsHost' : null
}

/** Codex PluginSummary for one Harness bundle (BundleInfo). phases: rowId → loader fiber phase (bundleUnavailable). */
export function pluginSummary(bundle, dir, phases = null) {
  const version = typeof bundle.version === 'string' ? bundle.version : null
  return {
    id: bundle.name,
    remotePluginId: null,
    version,
    localVersion: version,
    name: bundle.name,
    shareContext: null,
    source: { type: 'local', path: dir ?? '' },
    // Listed bundles are on disk (the profile's or the installation's own).
    installed: true,
    installedAt: null,
    enabled: bundle.enabled === true,
    installPolicy: bundle.optional ? 'AVAILABLE' : 'INSTALLED_BY_DEFAULT',
    installPolicySource: null,
    mustShowInstallationInterstitial: null,
    authPolicy: 'ON_USE',
    availability: 'AVAILABLE',
    disabledReason: null,
    eligiblePlanTypes: null,
    interface: {
      displayName: localized(bundle.meta?.title) || bundle.name,
      shortDescription: bundleDescription(bundle),
      longDescription: null, developerName: null, category: null, capabilities: [],
      websiteUrl: null, privacyPolicyUrl: null, termsOfServiceUrl: null, defaultPrompt: null, brandColor: null,
      composerIcon: null, composerIconUrl: null, logo: typeof bundle.meta?.icon === 'string' && bundle.meta.icon.startsWith('data:image/') ? bundle.meta.icon : null, logoDark: null, logoUrl: null, logoUrlDark: null,
      screenshots: [], screenshotUrls: [],
    },
    keywords: [],
    // Bridge field (Codex clients ignore it): what Customize › Plugins may do with
    // the bundle (dsh-plugin-manager BundleInfo) and why it did not load, if so.
    codeDesktop: {
      removable: bundle.removable === true,
      optional: bundle.optional === true,
      // Held by the profile (installed through the plugin manager) rather than shipped by the installation.
      held: bundle.installed === true,
      // dsh-client-ui-plugin-manager's "Experimental" tag.
      experimental: bundle.name.startsWith('@deepseek-ai/dsh-experimental-'),
      // PluginLocalizedMeta as shipped (title/description: a string or {en, zh, …}); the app picks its locale.
      title: localizedMeta(bundle.meta?.title),
      description: localizedMeta(bundle.meta?.description),
      icon: typeof bundle.meta?.icon === 'string' && bundle.meta.icon.startsWith('data:image/') ? bundle.meta.icon : null,
      components: Array.isArray(bundle.rows) ? bundle.rows.length : 0,
      readOnlyReason: typeof bundle.readOnlyReason === 'string' ? bundle.readOnlyReason : null,
      loadError: bundle.error ? (bundle.error.diagnostic || bundle.error.code || 'This plugin could not load.') : null,
      unavailable: bundleUnavailable(bundle, phases),
    },
  }
}

/**
 * plugin/installed: the bridge profile's bundles as one local marketplace.
 * Without the plugin manager there is nothing to list (an empty catalog, not
 * an error).
 * @param {object[] | undefined} bundles - pluginManager.listBundles()
 * @param {string | null | undefined} dir - profileContext.dir
 */
export function pluginsInstalledResponse(bundles, dir, { phases = null } = {}) {
  if (!Array.isArray(bundles)) return { marketplaces: [], marketplaceLoadErrors: [] }
  const plugins = bundles.filter((bundle) => typeof bundle?.name === 'string' && bundle.name).map((bundle) => pluginSummary(bundle, dir, phases))
  return {
    marketplaces: [{ name: PROFILE_MARKETPLACE, path: dir ?? null, interface: { displayName: 'DeepSeek Harness profile' }, plugins }],
    marketplaceLoadErrors: [],
  }
}

/**
 * plugin/read for one bundle: its description and the MCP servers its patch
 * inserts. Skills and hooks are not attributed to bundles on this core.
 * @param {object} bundle - BundleInfo
 * @param {{dir?: string | null, mcpEntries?: object[]}} context
 */
export function pluginReadResponse(bundle, { dir = null, mcpEntries = [] } = {}) {
  const servers = new Map(mcpClientEntries(mcpEntries).map((entry) => [entry.options.id, serverNameOf(entry)]))
  const mcpServers = (bundle.rows ?? []).filter((row) => row?.moduleName === MCP_CLIENT && servers.has(row.rowId)).map((row) => servers.get(row.rowId))
  return {
    plugin: {
      marketplaceName: PROFILE_MARKETPLACE,
      marketplacePath: dir ?? null,
      summary: pluginSummary(bundle, dir),
      shareUrl: null,
      description: bundleDescription(bundle) || null,
      skills: [],
      hooks: [],
      apps: [],
      appTemplates: [],
      mcpServers,
      scheduledTasks: null,
    },
  }
}
