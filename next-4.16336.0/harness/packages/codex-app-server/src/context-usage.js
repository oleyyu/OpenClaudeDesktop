/**
 * codeDesktop/contextUsage/read: the per-category context counts OpenClaude Desktop's session rail Context card draws
 * (its stand-in for Claude Code's get_context_usage; the app builds the report from these counts and the thread's
 * tokenUsage, app/src/context-breakdown-model.mjs).
 *
 * Everything is measured on what this session actually sends, with the Harness's own meter (dsh-token-meter: the
 * fixed 4-characters-per-token heuristic its occupancy display and compaction use, never a provider tokenizer):
 *   System prompt  the surface's last nonempty system/message node (its heuristicTokens, as contextBreakdown counts it),
 *                  less its MCP server instructions
 *   MCP server instructions  (Claude Code 2.1.299's row after MCP tools) dsh-mcp-client puts each connected server's
 *                  initialize instructions in the system prompt as its own `mcp:<server>` section ("### MCP server:
 *                  <name>" + the text; OpenClaude Desktop's code_desktop server among them); the agent's current
 *                  assembly gives those sections, priced at 4 characters per token and taken out of System prompt
 *   Memory files   the user-role agent-instructions messages (dsh-agent-instructions: AGENTS.md / CLAUDE.md …), split
 *                  per file by the "Instructions from: <path>" / "Updated instructions from: <path>" sections they render
 *   Skills         the user-role skill-catalog messages (dsh-tool-skill's <available_skills> catalog)
 *   System tools / MCP tools   the tool schemas of the session's request header (requestHeader().tools, exactly what the
 *                  next request sends), JSON-priced one by one; mcp__<server>__<tool> are MCP tools (OpenClaude
 *                  Desktop's own code_desktop tools among them)
 * Messages is left to the app (the real total minus these). A category nothing in the session carries is absent.
 */

const CHARS_PER_TOKEN = 4

/** dsh-token-meter estimateToolsTokens, for one schema. */
export function toolTokens(tool) {
  try { return Math.ceil(JSON.stringify(tool).length / CHARS_PER_TOKEN) } catch { return 0 }
}

/** mcp__<server>__<tool> → { serverName, name }, else null. */
export function mcpToolParts(name) {
  if (typeof name !== 'string' || !name.startsWith('mcp__')) return null
  const rest = name.slice(5)
  const at = rest.indexOf('__')
  if (at <= 0) return null
  return { serverName: rest.slice(0, at), name: rest.slice(at + 2) }
}

const HEADING = /^(?:Updated instructions from|Instructions from): (.+)$/gm

/** The files an agent-instructions message renders, each with its section's share of the message's tokens. */
export function instructionFiles(text, tokens) {
  if (typeof text !== 'string' || !text) return []
  const marks = [...text.matchAll(HEADING)].map((match) => ({ path: match[1].trim(), at: match.index }))
  if (!marks.length) return []
  const sizes = marks.map((mark, index) => (marks[index + 1]?.at ?? text.length) - mark.at)
  const total = sizes.reduce((sum, size) => sum + size, 0) || 1
  return marks.map((mark, index) => ({ path: mark.path, tokens: Math.round((tokens * sizes[index]) / total) }))
}

const textOf = (message) => (Array.isArray(message?.content) ? message.content.filter((block) => block?.type === 'text').map((block) => block.text ?? '').join('\n') : '')
const sourceKind = (data) => (data && typeof data.source === 'object' && data.source !== null ? data.source.kind : undefined)

/**
 * @param {{ session: any, sections?: readonly { name: string, text?: string }[], meter?: { measure: (session: any) => { nodes: readonly { seq: number, heuristicTokens?: number, tokens?: number }[] } } }} input
 * @returns {{ categories: Record<string, { tokens: number }>, memoryFiles: { path: string, type: string, tokens: number }[], mcpTools: { name: string, serverName: string, tokens: number, isLoaded: boolean }[], agents: [], measure: string }}
 */
export function contextUsageCounts({ session, meter, sections = [] }) {
  const categories = {}
  const memoryFiles = []
  const mcpTools = []
  const add = (key, tokens) => { if (tokens > 0) categories[key] = { tokens: (categories[key]?.tokens ?? 0) + tokens } }
  let nodes = []
  try { nodes = meter?.measure?.(session)?.nodes ?? [] } catch {}
  let systemTokens = 0
  const files = new Map()
  for (const node of nodes) {
    const tokens = Number.isFinite(node?.heuristicTokens) ? node.heuristicTokens : Number.isFinite(node?.tokens) ? node.tokens : 0
    if (!(tokens > 0)) continue
    let event
    try { event = session.eventAt(node.seq) } catch {}
    if (!event) continue
    if (event.type === 'system/message') { systemTokens = tokens; continue }
    if (event.type !== 'user/message') continue
    const kind = sourceKind(event.data)
    if (kind === 'agent-instructions') {
      add('memoryFiles', tokens)
      // an update message for a file adds to its row: the earlier rendering is still on the surface
      for (const file of instructionFiles(textOf(event.data), tokens)) files.set(file.path, (files.get(file.path) ?? 0) + file.tokens)
    } else if (kind === 'skill-catalog') add('skills', tokens)
  }
  let serverTokens = 0
  for (const section of sections ?? []) {
    if (typeof section?.name !== 'string' || !section.name.startsWith('mcp:') || typeof section.text !== 'string' || !section.text) continue
    serverTokens += Math.ceil(section.text.length / CHARS_PER_TOKEN)
  }
  // Only what the sent system prompt can hold: never more than the measured system node.
  serverTokens = Math.min(serverTokens, systemTokens)
  add('systemPrompt', systemTokens - serverTokens)
  add('mcpServerInstructions', serverTokens)
  for (const [path, tokens] of files) memoryFiles.push({ path, type: path.startsWith('~') || path.startsWith('$') ? 'User' : 'Project', tokens })
  let tools = []
  try { tools = session.requestHeader?.()?.tools ?? [] } catch {}
  for (const tool of tools) {
    const tokens = toolTokens(tool)
    const mcp = mcpToolParts(tool?.name)
    if (mcp) { add('mcpTools', tokens); mcpTools.push({ ...mcp, tokens, isLoaded: true }) } else add('systemTools', tokens)
  }
  return { categories, memoryFiles, mcpTools, agents: [], measure: 'dsh-token-meter' }
}
