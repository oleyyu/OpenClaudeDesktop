/**
 * Per-thread tool selection (Settings › Profiles, capability toolSelection):
 * params.codeDesktop.tools = {disabled: string[], disabledServers: string[]} | null
 * on thread/start, thread/resume, turn/start and codeDesktop/thread/permissions.
 * A present `tools` (null clears) replaces the selection; an absent one keeps it.
 *
 * A tool is removed from the model request by a trailing
 * `{permission: <tool>, pattern: "*", action: "deny"}` session rule
 * (Permission.disabled). How file-changing tools map to rules depends on the
 * agent (flavor.editSwitches):
 *   - 'shared' (OpenCode): edit, write and apply_patch are checked against one
 *     `edit` permission, so they are listed (and turned off) together as `edit`;
 *   - 'perTool' (MiMo Code): a rule names the tool itself (or the `edit` alias),
 *     so each one is listed and turned off on its own. Every file change still
 *     asks `edit` at run time, so turning `edit` off stops them all, and it
 *     also denies notebook_edit, which the alias does not hide.
 * MCP tools are named <server>_<tool> (both sanitized); a turned-off server
 * denies `<server>_*`.
 */

const MAX_NAMES = 512
const EDIT_FAMILY = new Set(['edit', 'write', 'apply_patch', 'patch', 'multiedit'])
// MiMo's file-changing tools: all ask the `edit` permission (external-directory.ts askEditUnlessMemory).
const PER_TOOL_EDITS = new Set(['edit', 'write', 'apply_patch', 'multiedit', 'notebook_edit'])
const shared = (flavor) => (flavor?.editSwitches ?? 'shared') !== 'perTool'
// Never offered: OpenCode's internal fallback tool and the plan-mode switches the app owns.
const HIDDEN = new Set(['invalid', 'plan_enter', 'plan_exit', 'StructuredOutput'])

const names = (value) => Array.isArray(value)
  ? [...new Set(value.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))].slice(0, MAX_NAMES)
  : []

export const sanitizeMcp = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '_')
export const mcpToolName = (server, tool) => `${sanitizeMcp(server)}_${sanitizeMcp(tool)}`

/** A clean selection, or null when nothing is turned off. */
export function normalizeToolSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const disabled = names(value.disabled).filter((name) => name !== 'run_code')
  const disabledServers = names(value.disabledServers)
  return disabled.length || disabledServers.length ? { disabled, disabledServers } : null
}

/** undefined when the params leave the selection alone, else the new selection (null clears). */
export function toolSelectionOf(params) {
  const hint = params?.codeDesktop
  if (!hint || typeof hint !== 'object' || !Object.hasOwn(hint, 'tools')) return undefined
  return normalizeToolSelection(hint.tools)
}

/**
 * Per-thread connector overrides in thread/start `config`, as Codex takes them (what OpenClaude Desktop's workflow runner sends
 * for an agent() opts.disallowedTools `mcp__…` entry): `mcp_servers.<name>.enabled: false` turns a connector off for
 * the thread, `mcp_servers.<name>.disabled_tools: [...]` some of its tools (dotted keys, or the nested
 * `mcp_servers: {<name>: {...}}` form). A selection (normalizeToolSelection), or null when the config turns none off.
 */
export function mcpConfigSelection(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null
  const disabled = []
  const disabledServers = []
  const apply = (server, field, value) => {
    if (typeof server !== 'string' || !server) return
    if (field === 'enabled' && value === false) disabledServers.push(server)
    if (field === 'disabled_tools' && Array.isArray(value)) for (const tool of value) if (typeof tool === 'string' && tool.trim()) disabled.push(mcpToolName(server, tool.trim()))
  }
  for (const [key, value] of Object.entries(config)) {
    const match = /^mcp_servers\.(.+)\.(enabled|disabled_tools)$/.exec(key)
    if (match) apply(match[1], match[2], value)
  }
  const nested = config.mcp_servers
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    for (const [server, entry] of Object.entries(nested)) {
      if (!entry || typeof entry !== 'object') continue
      apply(server, 'enabled', entry.enabled)
      apply(server, 'disabled_tools', entry.disabled_tools)
    }
  }
  return normalizeToolSelection({ disabled, disabledServers })
}

/** Two selections together (either may be null). */
export function mergeToolSelections(a, b) {
  if (!a || !b) return a ?? b ?? null
  return normalizeToolSelection({ disabled: [...a.disabled, ...b.disabled], disabledServers: [...a.disabledServers, ...b.disabledServers] })
}

/** The permission a deny rule names to turn a tool off. */
export const permissionOf = (tool, flavor) => (shared(flavor) && EDIT_FAMILY.has(tool) ? 'edit' : tool)

/** Trailing deny rules for a selection. */
export function denyRules(selection, flavor) {
  if (!selection) return []
  const rules = []
  const seen = new Set()
  const add = (permission) => { if (!seen.has(permission)) { seen.add(permission); rules.push({ permission, pattern: '*', action: 'deny' }) } }
  for (const name of selection.disabled) {
    add(permissionOf(name, flavor))
    // MiMo: the `edit` alias hides edit, write, apply_patch and multiedit, not notebook_edit.
    if (name === 'edit' && !shared(flavor)) add('notebook_edit')
  }
  for (const server of selection.disabledServers) add(`${sanitizeMcp(server)}_*`)
  return rules
}

/** Whether a tool name is turned off by a selection. */
export function isToolDenied(name, selection, mcpServers = [], flavor) {
  if (!selection || typeof name !== 'string') return false
  const offByEdit = (tool) => tool === 'edit' && (shared(flavor) ? EDIT_FAMILY.has(name) : PER_TOOL_EDITS.has(name))
  if (selection.disabled.some((tool) => tool === name || permissionOf(tool, flavor) === permissionOf(name, flavor) || offByEdit(tool))) return true
  return selection.disabledServers.some((server) => name.startsWith(`${sanitizeMcp(server)}_`) && mcpServers.includes(server))
}

const summary = (text) => (typeof text === 'string' ? text.trim().split('\n')[0].slice(0, 200) : '')

/**
 * codeDesktop/tools/list.
 * @param {Array<{id: string, description?: string}>} builtin - the agent's registry tools
 * @param {Array<{name: string, tools: Array<{name: string, description?: string}>}>} servers - MCP servers and their tools
 * @param {Array<{name: string, description?: string}>} skills
 * @param {{name?: string, editSwitches?: string}} [flavor] - the agent (flavor.js); OpenCode when absent
 */
export function toolsListResponse(builtin, servers = [], skills = [], flavor) {
  const tools = []
  const agent = flavor?.name || 'OpenCode'
  const grouped = shared(flavor)
  let editListed = false
  for (const tool of builtin ?? []) {
    const name = tool?.id ?? tool?.name
    if (typeof name !== 'string' || !name || HIDDEN.has(name)) continue
    if (grouped && EDIT_FAMILY.has(name)) {
      if (editListed) continue
      editListed = true
      tools.push({ name: 'edit', kind: 'builtin', description: `Create, edit and patch files. ${agent} turns edit, write and apply_patch on and off together.` })
      continue
    }
    if (!grouped && name === 'edit') {
      tools.push({ name, kind: 'builtin', description: `Edit files. Turning it off also stops every other file-changing tool, since ${agent} checks them all as edits.` })
      continue
    }
    // MiMo: write, multiedit, apply_patch and notebook_edit have their own switch but stop with `edit` (requires).
    const requires = !grouped && PER_TOOL_EDITS.has(name) ? { requires: ['edit'] } : {}
    tools.push({ name, kind: name === 'skill' ? 'skill' : 'builtin', description: summary(tool.description), ...requires })
  }
  tools.sort((a, b) => a.name.localeCompare(b.name))
  return {
    tools,
    servers: (servers ?? []).map((server) => ({
      name: server.name,
      tools: (server.tools ?? []).map((tool) => ({ name: mcpToolName(server.name, tool.name), tool: tool.name, description: summary(tool.description) })).sort((a, b) => a.tool.localeCompare(b.tool)),
    })).sort((a, b) => a.name.localeCompare(b.name)),
    skills: (skills ?? []).map((skill) => ({ name: skill.name, description: summary(skill.description) })),
  }
}
