/**
 * Per-thread tool selection carried on thread/start, thread/resume, turn/start
 * and codeDesktop/thread/permissions as params.codeDesktop.tools:
 *   disabled        - tool names the model must not see, string[]
 *   disabledServers - MCP server names whose tools (mcp__<server>__*) it must not see, string[]
 * A present `tools` (including null, which clears) replaces the thread's
 * selection; an absent one keeps it.
 *
 * A denied tool is removed three ways, so the model never sees nor runs it:
 *   - a scoped restriction (dsh-tools restrict) for the names known now, which
 *     also drops what keys on the tool's presence (the skill catalog follows the
 *     `skill` tool), plus an empty prompt section shadowing `tool:<name>`;
 *   - an agent-scoped system-prompt/assemble filter for tools that register
 *     later (MCP servers connect asynchronously), until the restriction catches up;
 *   - an agent-scoped guard that refuses any call that still reaches execution.
 * The restriction is recomputed on tools/change; restrict() itself emits that
 * event, so it is only reapplied when the denied-and-known set changes.
 */

const RESERVED = new Set(['run_code'])
const MAX_NAMES = 512
const DENIED_REASON = 'This tool is turned off for this session in OpenClaude Desktop.'

const names = (value) => Array.isArray(value)
  ? [...new Set(value.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))].slice(0, MAX_NAMES)
  : []

/** A clean selection, or null when nothing is turned off. */
export function normalizeToolSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const disabled = names(value.disabled).filter((name) => !RESERVED.has(name))
  const disabledServers = names(value.disabledServers)
  return disabled.length || disabledServers.length ? { disabled, disabledServers } : null
}

/** undefined when the params leave the selection alone, else the new selection (null clears). */
export function toolSelectionOf(params) {
  const hint = params?.codeDesktop
  if (!hint || typeof hint !== 'object' || !Object.hasOwn(hint, 'tools')) return undefined
  return normalizeToolSelection(hint.tools)
}

/** Whether a tool name is turned off by a selection. */
export function isToolDenied(name, selection) {
  if (!selection || typeof name !== 'string') return false
  if (selection.disabled.includes(name)) return true
  return selection.disabledServers.some((server) => name.startsWith(`mcp__${server}__`))
}

/**
 * Installs the gate on one agent; ref.current is the thread's selection.
 * @param {any} agentCtx - the agent's setup context
 * @param {{ current: ReturnType<typeof normalizeToolSelection> }} ref
 * @param {{ knownNames: () => string[], warn?: (message: string, error: unknown) => void }} options
 *   knownNames: the global tool names (the ones a scoped restriction may name).
 * @returns {{ apply: () => void, dispose: () => void }} apply re-reads ref.current
 */
export function installToolGate(agentCtx, ref, { knownNames, warn = () => {} }) {
  const disposers = []
  // applying: restrict() and section() emit tools/change synchronously, re-entering apply().
  let restriction = null, appliedKey = '', applying = false

  const lift = () => {
    if (!restriction) return
    for (const dispose of restriction.reverse()) {
      try { dispose() } catch {}
    }
    restriction = null
  }

  const apply = () => {
    if (applying) return
    const selection = ref.current
    let deny = []
    if (selection) {
      try { deny = knownNames().filter((name) => !RESERVED.has(name) && isToolDenied(name, selection)) } catch {}
    }
    const key = deny.slice().sort().join('\n')
    if (key === appliedKey && (restriction || !deny.length)) return
    const owned = []
    applying = true
    try {
      lift()
      appliedKey = key
      if (!deny.length) return
      try {
        owned.push(agentCtx.tools.restrict({ deny }))
      } catch (error) {
        warn('tool selection restrict', error)
      }
      for (const name of deny) {
        try { owned.push(agentCtx.systemPrompt.section({ name: `tool:${name}`, order: Number.MAX_SAFE_INTEGER, text: '' })) } catch {}
      }
      restriction = owned
    } finally {
      applying = false
    }
  }

  if (typeof agentCtx?.on === 'function') {
    const assemble = agentCtx.on('system-prompt/assemble', async (_assembly, _context, next) => {
      const assembly = await next()
      const selection = ref.current
      if (!selection || !Array.isArray(assembly?.tools)) return assembly
      return { ...assembly, tools: assembly.tools.filter((tool) => !isToolDenied(tool?.name, selection)) }
    })
    if (typeof assemble === 'function') disposers.push(assemble)
    const change = agentCtx.on('tools/change', () => {
      try { apply() } catch (error) { warn('tool selection refresh', error) }
    })
    if (typeof change === 'function') disposers.push(change)
  }
  try {
    const guard = agentCtx.tools.guard((exec) => (isToolDenied(exec?.name, ref.current) ? DENIED_REASON : undefined))
    if (typeof guard === 'function') disposers.push(guard)
  } catch (error) {
    warn('tool selection guard', error)
  }

  apply()
  return {
    apply,
    dispose: () => {
      lift()
      for (const dispose of disposers.reverse()) {
        try { dispose() } catch {}
      }
    },
  }
}

/**
 * codeDesktop/tools/list: what a session can turn off. builtin and skill tools
 * by name; MCP tools under their server (every profile server, connected or not).
 * @param {Array<{ name?: string, description?: string }>} schemas - the global tool schemas
 * @param {string[]} serverNames - the profile's MCP server names
 */
export function toolsListResponse(schemas, serverNames = []) {
  const summary = (text) => typeof text === 'string' ? text.trim().split('\n')[0].slice(0, 200) : ''
  const servers = new Map(serverNames.filter((name) => typeof name === 'string' && name).map((name) => [name, []]))
  const tools = []
  for (const schema of schemas ?? []) {
    const name = schema?.name
    if (typeof name !== 'string' || !name || RESERVED.has(name)) continue
    const mcp = /^mcp__(.+?)__(.+)$/.exec(name)
    const server = mcp && [...servers.keys()].find((candidate) => name.startsWith(`mcp__${candidate}__`))
    if (mcp) {
      const owner = server ?? mcp[1]
      if (!servers.has(owner)) servers.set(owner, [])
      servers.get(owner).push({ name, tool: name.slice(`mcp__${owner}__`.length), description: summary(schema.description) })
      continue
    }
    tools.push({ name, kind: name === 'skill' ? 'skill' : 'builtin', description: summary(schema.description) })
  }
  tools.sort((a, b) => a.name.localeCompare(b.name))
  return {
    tools,
    servers: [...servers].map(([name, list]) => ({ name, tools: list.sort((a, b) => a.tool.localeCompare(b.tool)) })).sort((a, b) => a.name.localeCompare(b.name)),
  }
}
