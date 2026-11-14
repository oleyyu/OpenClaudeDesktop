/**
 * MiniMax Code's per-thread config files (agents/minimax.js launch): the thread's own config.yaml and
 * permission.json, derived from the user's at every launch so the user's real files are never written.
 *
 *   config.yaml      permissionMode forced to `default` (a mode saved in mcode, e.g. bypassPermissions or auto,
 *                    would otherwise decide before OpenClaude Desktop's mode does); `sandbox.enabled: false` while the
 *                    bridge's Seatbelt profile wraps the agent (mcode's own sandbox-exec cannot nest in it); the
 *                    thread's tool switches merged into agents.default (tools, builtinTools, features)
 *   permission.json  mcode's v2 rule store ({version 2, allow, ask, deny} of {tool_name, matcher}): the user's
 *                    deny and ask rules kept (v1 strings converted as mcode's rule-codec.ts reads them), plus the
 *                    rules that make Ask / Accept edits ask
 */

/** agents.default.tools: the built-in tool ids (packages/config agent-capabilities.ts AGENT_BUILTIN_TOOL_IDS). */
export const AGENT_TOOL_IDS = ['read', 'write', 'edit', 'bash', 'task_query', 'task_output', 'task_stop', 'grep', 'glob', 'todowrite', 'web_fetch', 'website_deploy']

/** agents.default.builtinTools: MiniMax's media tools (AGENT_BUILTIN_MCP_TOOL_IDS). */
export const AGENT_MEDIA_TOOL_IDS = [
  'images_understand', 'image_synthesize', 'images_search_and_download', 'image_reverse_search', 'submit_video_generation', 'query_video_generation',
  'gen_videos', 'batch_text_to_video', 'batch_image_to_video', 'get_voice_list', 'batch_text_to_audio', 'batch_text_to_music', 'synthesize_speech',
  'batch_synthesize_speech', 'audios_understand', 'videos_understand', 'transcribe_audio',
]

/** Switches that are features, not tools: the sub-agent tool (features.delegation) and web search (features.webSearch). */
export const FEATURE_SWITCHES = { task: 'delegation', web_search: 'webSearch' }

const PERMISSION_ACTIONS = ['read', 'write', 'delete', 'execute', 'network']

// ------------------------------------------------------------------ YAML (the subset config.yaml uses)

const indentOf = (line) => line.length - line.trimStart().length
const isBlank = (line) => !line.trim() || line.trim().startsWith('#')

/** config.yaml's top-level blocks: {key, start, end} line ranges (a block runs to the next top-level key). */
export function topLevelBlocks(text) {
  const lines = String(text ?? '').split('\n')
  const blocks = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (isBlank(line) || indentOf(line) > 0 || line.startsWith('-')) continue
    const match = /^(["']?)([^"':#][^:#]*?)\1\s*:(?:\s|$)/.exec(line)
    if (!match) continue
    if (blocks.length) blocks.at(-1).end = index
    blocks.push({ key: match[2].trim(), start: index, end: lines.length })
  }
  // Trailing blank lines and comments belong to no block.
  for (const block of blocks) while (block.end > block.start + 1 && isBlank(lines[block.end - 1])) block.end--
  return { lines, blocks }
}

/** The text with the top-level `key` block replaced by `block` (lines; null removes it), appended when missing. */
export function withTopLevel(text, key, block) {
  const { lines, blocks } = topLevelBlocks(text)
  const found = blocks.find((entry) => entry.key === key)
  const next = block === null ? [] : block
  if (found) lines.splice(found.start, found.end - found.start, ...next)
  else if (next.length) {
    while (lines.length && lines.at(-1) === '') lines.pop()
    lines.push(...next, '')
  }
  const out = lines.join('\n')
  return out.endsWith('\n') || !out ? out : `${out}\n`
}

function scalar(raw) {
  const value = raw.replace(/\s+#.*$/, '').trim()
  if (/^(["']).*\1$/.test(value)) return value.slice(1, -1)
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null' || value === '~' || value === '') return null
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)
  return value
}

function flowList(raw) {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]\s*(#.*)?$/, '').trim()
  if (!inner) return []
  return inner.split(',').map((part) => scalar(part)).filter((value) => value !== null)
}

/**
 * A YAML block of maps, scalars and lists of scalars (block `- x` or flow `[x, y]`): what agents.default holds.
 * Throws on anything else, so a block the bridge cannot read is left alone rather than rewritten wrongly.
 */
export function parseYamlBlock(lines, start = 0, end = lines.length, indent = null) {
  const out = {}
  let index = start
  while (index < end) {
    const line = lines[index]
    if (isBlank(line)) { index++; continue }
    const at = indentOf(line)
    indent ??= at
    if (at < indent) break
    if (at > indent) throw new Error(`Unexpected indentation: ${line.trim()}`)
    const match = /^\s*(["']?)([^"':#][^:#]*?)\1\s*:(.*)$/.exec(line)
    if (!match) throw new Error(`Not a mapping entry: ${line.trim()}`)
    const key = match[2].trim()
    const rest = match[3].replace(/\s+#.*$/, '').trim()
    index++
    if (rest.startsWith('[')) { out[key] = flowList(rest); continue }
    if (rest.startsWith('{') || rest.startsWith('|') || rest.startsWith('>') || rest.startsWith('&') || rest.startsWith('*')) throw new Error(`Unsupported value for ${key}`)
    if (rest) { out[key] = scalar(rest); continue }
    // A nested block: a list (its lines start with '-') or a map, until the indentation drops back.
    let stop = index
    while (stop < end && (isBlank(lines[stop]) || indentOf(lines[stop]) > at)) stop++
    // YAML also allows a list at the key's own indentation ("key:\n- a").
    if (stop === index || lines.slice(index, stop).every(isBlank)) {
      stop = index
      while (stop < end && (isBlank(lines[stop]) || (indentOf(lines[stop]) === at && lines[stop].trimStart().startsWith('-')))) stop++
    }
    while (stop > index && isBlank(lines[stop - 1])) stop--
    const body = lines.slice(index, stop).filter((entry) => !isBlank(entry))
    if (!body.length) out[key] = null
    else if (body[0].trimStart().startsWith('-')) {
      out[key] = body.map((entry) => {
        const item = /^\s*-\s*(.*)$/.exec(entry)
        if (!item) throw new Error(`Mixed list for ${key}`)
        if (/^[^"'\s][^:]*:\s/.test(item[1])) throw new Error(`List of maps for ${key}`)
        return scalar(item[1])
      })
    } else out[key] = parseYamlBlock(lines, index, stop)
    index = stop
  }
  return out
}

const yamlString = (value) => (typeof value === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(value) && !['true', 'false', 'null', 'yes', 'no'].includes(value) ? value : JSON.stringify(value))

/** A parsed block written back (maps, scalars, lists of scalars in flow style). */
export function writeYamlBlock(value, indent = 0) {
  const pad = ' '.repeat(indent)
  const out = []
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue
    if (Array.isArray(entry)) out.push(`${pad}${key}: [${entry.map(yamlString).join(', ')}]`)
    else if (entry && typeof entry === 'object') {
      const nested = writeYamlBlock(entry, indent + 2)
      out.push(...(nested.length ? [`${pad}${key}:`, ...nested] : [`${pad}${key}: {}`]))
    } else out.push(`${pad}${key}: ${entry === null ? 'null' : typeof entry === 'string' ? yamlString(entry) : String(entry)}`)
  }
  return out
}

/** The user's agents block as {default: {...}}, or null when there is none; throws when it cannot be read. */
export function readAgentsBlock(text) {
  const { lines, blocks } = topLevelBlocks(text)
  const found = blocks.find((entry) => entry.key === 'agents')
  if (!found) return null
  const head = lines[found.start].replace(/^[^:]*:/, '').replace(/\s+#.*$/, '').trim()
  if (head === '{}' || head === 'null' || head === '~') return {}
  if (head) throw new Error('agents is not a block')
  return parseYamlBlock(lines, found.start + 1, found.end)
}

/**
 * agents.default with the thread's switches applied: tools and builtinTools become allow lists without the switched-off
 * ids (starting from the user's own allow list, else every id), features.delegation / webSearch turn off with their
 * switch; the user's other settings (skills, persona, modelConfigId, features they set) stay.
 */
export function agentsWithSwitches(userAgents, disabled) {
  const off = new Set(disabled)
  const base = userAgents && typeof userAgents === 'object' ? userAgents : {}
  const current = base.default && typeof base.default === 'object' && !Array.isArray(base.default) ? { ...base.default } : {}
  const allow = (list, all) => (Array.isArray(list) ? list.filter((id) => all.includes(id)) : all)
  if (AGENT_TOOL_IDS.some((id) => off.has(id))) current.tools = allow(current.tools, AGENT_TOOL_IDS).filter((id) => !off.has(id))
  if (AGENT_MEDIA_TOOL_IDS.some((id) => off.has(id))) current.builtinTools = allow(current.builtinTools, AGENT_MEDIA_TOOL_IDS).filter((id) => !off.has(id))
  const features = current.features && typeof current.features === 'object' && !Array.isArray(current.features) ? { ...current.features } : {}
  for (const [name, feature] of Object.entries(FEATURE_SWITCHES)) if (off.has(name)) features[feature] = false
  if (Object.keys(features).length) current.features = features
  return { ...base, default: current }
}

/**
 * The thread's config.yaml: the user's, with permissionMode `default`, mcode's sandbox off while OpenClaude Desktop's Seatbelt
 * profile runs (`nestedSandbox`), and the thread's switched-off tools in agents.default. `warnings` lists what could
 * not be applied.
 */
export function threadConfigYaml(text, { disabled = [], nestedSandbox = false } = {}) {
  let out = withTopLevel(text, 'permissionMode', ['permissionMode: default'])
  if (nestedSandbox) out = withTopLevel(out, 'sandbox', ['sandbox:', '  enabled: false'])
  const warnings = []
  const switches = disabled.filter((name) => AGENT_TOOL_IDS.includes(name) || AGENT_MEDIA_TOOL_IDS.includes(name) || Object.hasOwn(FEATURE_SWITCHES, name))
  if (switches.length) {
    let agents = null
    try { agents = readAgentsBlock(out) } catch (error) { warnings.push(`config.yaml agents: ${error?.message ?? error}`) }
    if (!warnings.length) out = withTopLevel(out, 'agents', ['agents:', ...writeYamlBlock(agentsWithSwitches(agents, switches), 2)])
  }
  return { text: out, warnings }
}

// ------------------------------------------------------------------ permission.json

/** One stored v2 rule, validated as mcode's readStoredMatcher does; null when mcode would refuse it. */
export function storedRule(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const tool = raw.tool_name ?? raw.toolName
  if (typeof tool !== 'string' || !tool) return null
  const matcher = raw.matcher
  if (matcher === undefined) {
    const content = raw.rule_content ?? raw.ruleContent
    return typeof content === 'string' && content ? fromLegacy(tool, content) : { tool_name: tool, matcher: { kind: 'tool' } }
  }
  if (!matcher || typeof matcher !== 'object') return null
  if (matcher.kind === 'tool') return { tool_name: tool, matcher: { kind: 'tool' } }
  if (matcher.kind === 'command' && typeof matcher.pattern === 'string' && matcher.pattern.trim()) return { tool_name: tool, matcher: { kind: 'command', pattern: matcher.pattern } }
  if (matcher.kind === 'path' && typeof matcher.pattern === 'string' && matcher.pattern.trim() && Array.isArray(matcher.actions) && matcher.actions.length && matcher.actions.every((action) => PERMISSION_ACTIONS.includes(action))) {
    return { tool_name: tool, matcher: { kind: 'path', pattern: matcher.pattern, actions: [...new Set(matcher.actions)] } }
  }
  return null
}

const looksLikePath = (value) => /^(\/|~\/|\.\/|\.\.\/|[A-Za-z]:[\\/]|\\\\)/.test(value)

/** A legacy `tool(pattern)` rule as mcode's v1 reader infers it (a path pattern applies to every action). */
function fromLegacy(tool, content) {
  return looksLikePath(content)
    ? { tool_name: tool, matcher: { kind: 'path', pattern: content, actions: [...PERMISSION_ACTIONS] } }
    : { tool_name: tool, matcher: { kind: 'command', pattern: content } }
}

/** A v1 rule string (`bash`, `bash(rm -rf:*)`, `write(/etc/*)`) as a v2 stored rule (rule-codec.ts parseRuleString). */
export function ruleFromString(raw) {
  if (typeof raw !== 'string' || !raw) return null
  const open = raw.indexOf('(')
  if (open <= 0 || raw[open - 1] === '\\') return { tool_name: raw, matcher: { kind: 'tool' } }
  const close = raw.lastIndexOf(')')
  if (close <= open) return { tool_name: raw, matcher: { kind: 'tool' } }
  const tool = raw.slice(0, open)
  const content = raw.slice(open + 1, close)
  return content ? fromLegacy(tool, content) : { tool_name: tool, matcher: { kind: 'tool' } }
}

/** The user's rules of one kind, whatever version their file is (v2 objects, v1 strings); invalid ones dropped. */
export function userRules(file, kind) {
  if (!file || typeof file !== 'object' || !Array.isArray(file[kind])) return []
  if (file.version === 2) return file[kind].map(storedRule).filter(Boolean)
  if (file.version !== undefined) return []
  return file[kind].map((rule) => (typeof rule === 'string' ? ruleFromString(rule) : storedRule(rule))).filter(Boolean)
}

/**
 * The thread's permission.json for Ask ('ask') or Accept edits ('acceptEdits'): mcode asks (and the bridge answers
 * for the mode) for every write and edit (Ask only), command, fetch, deploy and call to a configured MCP server
 * (server-level `mcp__<server>` rules). The user's deny and ask rules stay; their allow rules ('Always allow' in
 * mcode) do not apply here.
 */
export function threadPermissionFile(userFile, mode, mcpServerNames = [], deniedServers = []) {
  const strict = mode === 'ask' || mode === 'acceptEdits'
  const tools = strict ? [...(mode === 'ask' ? ['write', 'edit'] : []), 'bash', 'web_fetch', 'website_deploy', ...mcpServerNames.filter((name) => typeof name === 'string' && name).map((name) => `mcp__${name}`)] : []
  const ask = [...userRules(userFile, 'ask')]
  const seen = new Set(ask.map((rule) => JSON.stringify(rule)))
  for (const tool of tools) {
    const rule = { tool_name: tool, matcher: { kind: 'tool' } }
    if (!seen.has(JSON.stringify(rule))) { ask.push(rule); seen.add(JSON.stringify(rule)) }
  }
  // Servers switched off for the thread that mcode loads anyway (a project's .mcp.json, which it merges over the
  // user's file with no switch of its own): every call to them is refused.
  const deny = [...userRules(userFile, 'deny')]
  const denied = new Set(deny.map((rule) => JSON.stringify(rule)))
  for (const name of deniedServers) {
    if (typeof name !== 'string' || !name) continue
    const rule = { tool_name: `mcp__${name}`, matcher: { kind: 'tool' } }
    if (!denied.has(JSON.stringify(rule))) { deny.push(rule); denied.add(JSON.stringify(rule)) }
  }
  // Outside Ask and Accept edits the user's own 'Always allow' rules keep applying.
  return { version: 2, allow: strict ? [] : userRules(userFile, 'allow'), ask, deny }
}
