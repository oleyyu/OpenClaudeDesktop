/**
 * codeDesktop/contextUsage/read for ZCode: the session rail Context card's per-category counts (OpenClaude Desktop's
 * stand-in for Claude Code's get_context_usage; the app builds the report with the thread's tokenUsage,
 * app/src/context-breakdown-model.mjs).
 *
 * The provider proxy records the last main-session model request ZCode sent (provider-proxy.js `seen`): the system
 * prompt as sent (after the app's customization) and every tool definition with its input schema. Those are priced
 * with the same fixed heuristic the DeepSeek Harness meter uses (4 characters per token over the text / the tool's
 * JSON; ZCode exposes no tokenizer): System prompt, then the tools split into MCP tools (mcp__<server>__<tool>, the
 * app's code_desktop tools among them) and System tools. MCP server instructions (Claude Code 2.1.299's row after MCP
 * tools): ZCode's MCP adapter never shows a server's instructions to the model, so the bridge appends the app's
 * code_desktop instructions to the instructions it sends (server.js appToolsInstructions); when that text is in the
 * system prompt as sent, it is counted as `## code_desktop\n<text>` (the CLI's block) and taken out of System prompt. ZCode's AGENTS.md and skills are part of the system prompt it
 * assembles, so they are not separate rows. Messages is left to the app. No request seen yet: no categories.
 */

const CHARS_PER_TOKEN = 4
const tokensOfText = (text) => (typeof text === 'string' && text ? Math.ceil(text.length / CHARS_PER_TOKEN) : 0)
const toolTokens = (tool) => { try { return Math.ceil(JSON.stringify(tool).length / CHARS_PER_TOKEN) } catch { return 0 } }

/** mcp__<server>__<tool> → { serverName, name }, else null. */
export function mcpToolParts(name) {
  if (typeof name !== 'string' || !name.startsWith('mcp__')) return null
  const rest = name.slice(5)
  const at = rest.indexOf('__')
  return at > 0 ? { serverName: rest.slice(0, at), name: rest.slice(at + 2) } : null
}

/**
 * @param {{ system?: string | null, defaultSystem?: string | null, toolDefs?: { name: string, description?: string, inputSchema?: unknown }[] } | null | undefined} record
 * @param {{ name: string, text: string }[]} [servers] - MCP servers whose instructions the bridge put in the prompt
 */
export function contextUsageCounts(record, servers = []) {
  const categories = {}
  const mcpTools = []
  const add = (key, tokens) => { if (tokens > 0) categories[key] = { tokens: (categories[key]?.tokens ?? 0) + tokens } }
  if (!record) return { categories, memoryFiles: [], mcpTools, agents: [], measure: null }
  let system = record.system ?? record.defaultSystem
  for (const server of servers) {
    const text = typeof server?.text === 'string' ? server.text.trim() : ''
    if (!text || typeof system !== 'string' || !system.includes(text)) continue
    system = system.split(text).join('')
    add('mcpServerInstructions', tokensOfText(`## ${server.name}\n${text}`))
  }
  add('systemPrompt', tokensOfText(system))
  for (const tool of record.toolDefs ?? []) {
    const tokens = toolTokens(tool)
    const mcp = mcpToolParts(tool?.name)
    if (mcp) { add('mcpTools', tokens); mcpTools.push({ ...mcp, tokens, isLoaded: true }) } else add('systemTools', tokens)
  }
  return { categories, memoryFiles: [], mcpTools, agents: [], measure: 'proxy-request-heuristic' }
}
