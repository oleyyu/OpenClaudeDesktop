/**
 * ACP session/update → Codex turns, items and notifications.
 *
 * One ThreadProjector per thread holds its Codex turns (persisted by store.js)
 * and the open turn. A live update returns the notifications the client gets
 * (item/started, deltas, item/completed, turn/plan/updated, turn/diff/updated,
 * thread/tokenUsage/updated …); a replay (session/load of a session the bridge
 * never projected) uses the same reducer with `user_message_chunk` opening turns.
 *
 *   agent_message_chunk      agentMessage + item/agentMessage/delta
 *   agent_thought_chunk      reasoning + item/reasoning/summaryTextDelta
 *   tool_call / _update      by ACP kind (agents/*.js may classify further):
 *                              execute → commandExecution (+ outputDelta)
 *                              edit/delete/move → fileChange (+ patchUpdated)
 *                              read/search → commandExecution with a read/search action
 *                              fetch → webSearch, MCP → mcpToolCall,
 *                              sub-agent → collabAgentToolCall, other → dynamicToolCall
 *   plan                     turn/plan/updated
 *   usage_update             thread/tokenUsage/updated (context used/size)
 *   session_info_update      thread/name/updated
 */

import { basename, isAbsolute, resolve } from 'node:path'
import { fileDiff, unifiedDiff } from './diff.js'

const nowSeconds = (ms) => Math.floor((ms ?? Date.now()) / 1000)

/** The text of an ACP content block (or a list of tool-call content). */
export function blockText(block) {
  if (!block) return ''
  if (typeof block === 'string') return block
  if (Array.isArray(block)) return block.map(blockText).filter(Boolean).join('\n')
  if (block.type === 'text') return block.text ?? ''
  if (block.type === 'content') return blockText(block.content)
  if (block.type === 'resource') return block.resource?.text ?? ''
  if (block.type === 'resource_link') return block.uri ?? block.name ?? ''
  return ''
}

const PLAN_STATUS = { pending: 'pending', in_progress: 'inProgress', completed: 'completed' }

/** ACP plan entries → Codex TurnPlanStep[]. */
export function planSteps(entries) {
  return (Array.isArray(entries) ? entries : []).map((entry) => ({ step: String(entry?.content ?? ''), status: PLAN_STATUS[entry?.status] ?? 'pending' }))
}

/** A ThreadItem's ACP diff blocks → Codex FileUpdateChange[]. */
export function changesOf(content, locations, cwd, kind, rawInput) {
  const absolute = (path) => (typeof path === 'string' && path && !isAbsolute(path) && cwd ? resolve(cwd, path) : path)
  const diffs = (Array.isArray(content) ? content : []).filter((block) => block?.type === 'diff' && typeof block.path === 'string')
  if (diffs.length) {
    return diffs.map((diff) => {
      const path = absolute(diff.path)
      if (kind === 'delete') return { path, kind: { type: 'delete' }, diff: diff.oldText ?? '' }
      if (diff.oldText === null || diff.oldText === undefined || (diff.oldText === '' && diff._meta?.kind !== 'modify' && diff.newText)) return { path, kind: { type: 'add' }, diff: diff.newText ?? '' }
      return { path, kind: { type: 'update', move_path: null }, diff: unifiedDiff(diff.oldText, diff.newText ?? '') }
    })
  }
  // No diff blocks (MiniMax): the change from the tool's own arguments.
  const raw = rawInput && typeof rawInput === 'object' ? rawInput : null
  const rawPath = raw && [raw.file_path, raw.path, raw.absolute_path, raw.filePath].find((value) => typeof value === 'string' && value)
  if (rawPath && kind !== 'delete') {
    const oldText = typeof raw.old_string === 'string' ? raw.old_string : typeof raw.oldString === 'string' ? raw.oldString : null
    const newText = typeof raw.new_string === 'string' ? raw.new_string : typeof raw.newString === 'string' ? raw.newString : null
    if (oldText !== null && newText !== null) return [{ path: absolute(rawPath), kind: { type: 'update', move_path: null }, diff: unifiedDiff(oldText, newText) }]
    if (typeof raw.content === 'string') return [{ path: absolute(rawPath), kind: { type: 'add' }, diff: raw.content }]
  }
  return (Array.isArray(locations) ? locations : []).filter((location) => typeof location?.path === 'string').map((location) => ({
    path: absolute(location.path),
    kind: kind === 'delete' ? { type: 'delete' } : { type: 'update', move_path: null },
    diff: '',
  }))
}

/** Raw input as an object for item arguments. */
const argsOf = (raw) => (raw && typeof raw === 'object' ? raw : raw === undefined || raw === null ? {} : { input: raw })

const firstString = (...values) => values.find((value) => typeof value === 'string' && value) ?? null

/**
 * The Codex item for one ACP tool call. `classify` (the agent adapter's) may
 * return {type: 'mcp', server, tool} | {type: 'subagent', prompt, label} |
 * {type: 'webSearch'} | {type: 'execute'} | {type: 'read'} | {type: 'search'} |
 * {type: 'question'} | {type: 'plan'} | null.
 */
export function toolItem(call, { cwd, threadId, classify } = {}) {
  const id = call.toolCallId
  const args = argsOf(call.rawInput)
  const kind = call.kind ?? 'other'
  const title = typeof call.title === 'string' ? call.title : ''
  const hint = classify?.(call) ?? null
  const absolute = (path) => (typeof path === 'string' && path && !isAbsolute(path) && cwd ? resolve(cwd, path) : path)
  const type = hint?.type ?? kind
  // Typed review findings (Qwen's report_findings): the review result, a severity-ordered list with file:line links.
  if (type === 'reviewFindings') return { type: 'exitedReviewMode', id, review: findingsReview(args, cwd) }
  if (type === 'mcp') {
    return { type: 'mcpToolCall', id, server: hint.server ?? 'mcp', tool: hint.tool ?? title, status: 'inProgress', arguments: hint.arguments ?? args, appContext: null, pluginId: null, readOnlyHint: null, result: null, error: null, durationMs: null }
  }
  if (type === 'subagent') {
    return {
      type: 'collabAgentToolCall', id, tool: 'spawnAgent', status: 'inProgress', senderThreadId: threadId ?? '', receiverThreadIds: [],
      prompt: firstString(hint.prompt, args.prompt, args.task, args.description), model: null, reasoningEffort: null, agentsStates: {},
      ...(firstString(hint.label, args.description, title) ? { description: firstString(hint.label, args.description, title) } : {}),
    }
  }
  if (type === 'execute') {
    const command = firstString(hint?.command, args.command, args.cmd, title) ?? ''
    return {
      type: 'commandExecution', id, pluginId: null, scriptPath: null, command, cwd: absolute(firstString(args.dir_path, args.directory, args.cwd, args.workdir)) ?? cwd ?? '',
      processId: null, source: 'agent', status: 'inProgress', commandActions: [{ type: 'unknown', command }], aggregatedOutput: null, exitCode: null, durationMs: null,
      ...(firstString(args.description) ? { description: args.description } : {}), shell: 'bash',
    }
  }
  if (type === 'edit' || type === 'delete' || type === 'move') {
    return { type: 'fileChange', id, changes: changesOf(call.content, call.locations, cwd, type, call.rawInput), status: 'inProgress' }
  }
  if (type === 'read') {
    const path = absolute(firstString(call.locations?.[0]?.path, args.file_path, args.absolute_path, args.path))
    const command = title || (path ? `Read ${path}` : 'Read')
    const action = path ? { type: 'read', command, name: basename(path), path } : { type: 'unknown', command }
    return { type: 'commandExecution', id, pluginId: null, scriptPath: null, command, cwd: cwd ?? '', processId: null, source: 'agent', status: 'inProgress', commandActions: [action], aggregatedOutput: null, exitCode: null, durationMs: null }
  }
  if (type === 'search') {
    const query = firstString(args.pattern, args.query, args.glob, args.regex) ?? title
    const command = title || `search ${query ?? ''}`.trim()
    const action = { type: 'search', command, query, path: absolute(firstString(args.dir_path, args.path, args.directory)) ?? null, tool: hint?.tool ?? 'grep', arguments: args }
    return { type: 'commandExecution', id, pluginId: null, scriptPath: null, command, cwd: cwd ?? '', processId: null, source: 'agent', status: 'inProgress', commandActions: [action], aggregatedOutput: null, exitCode: null, durationMs: null }
  }
  if (type === 'fetch' || type === 'webSearch') {
    const url = firstString(args.url, args.prompt?.match?.(/https?:\/\/\S+/)?.[0])
    const queries = Array.isArray(args.queries) ? args.queries.map(String) : firstString(args.query, args.search_term) ? [firstString(args.query, args.search_term)] : null
    return { type: 'webSearch', id, query: url ?? queries?.join(', ') ?? title, action: url && !queries ? { type: 'openPage', url } : { type: 'search', query: queries?.[0] ?? title, queries }, results: null, status: 'inProgress' }
  }
  return { type: 'dynamicToolCall', id, namespace: null, tool: hint?.tool ?? (title || 'tool'), arguments: args, status: 'inProgress', contentItems: null, success: null, durationMs: null, ...(title ? { title } : {}) }
}

const PART_TYPES = new Set(['text', 'image_url', 'image', 'think'])
/** A data: URL's {mimeType, data}, or null. */
const dataUrl = (url) => {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(typeof url === 'string' ? url : '')
  return match ? { mimeType: match[1], data: match[2].replace(/\s+/g, '') } : null
}
/** Model-facing wrapping in a part's text: the agent's hidden <system-reminder> sections and Kimi's <image path> tags. */
const userFacing = (text) => String(text).replace(/<\\?system-reminder>[\s\S]*?(?:<\/\\?system-reminder>|$)/g, '').replace(/<\/?image\b[^>]*>/g, '').trim()

/**
 * A tool result some agents send as the JSON text of the model's content parts (Kimi's ACP server stringifies every
 * non-string tool output, so ReadMediaFile and MCP image results arrive as '[{"type":"text",…},{"type":"image_url",
 * "imageUrl":{"url":"data:image/png;base64,…"}}]'): the parts become text and image blocks again, without the
 * model-only reminder text. Anything else is left as it is.
 */
export function expandToolParts(content) {
  if (!Array.isArray(content)) return content
  let changed = false
  const out = []
  for (const block of content) {
    const inner = block?.type === 'content' ? block.content : block
    const text = inner?.type === 'text' && typeof inner.text === 'string' ? inner.text.trim() : ''
    let parts = null
    if (text.startsWith('[{') && text.endsWith('}]')) {
      try { parts = JSON.parse(text) } catch {}
    }
    const valid = Array.isArray(parts) && parts.length > 0 && parts.every((part) => part && typeof part === 'object' && PART_TYPES.has(part.type)
      && (part.type === 'text' ? typeof part.text === 'string' : part.type === 'think' ? typeof part.think === 'string' : true))
    if (!valid) { out.push(block); continue }
    changed = true
    for (const part of parts) {
      if (part.type === 'text' || part.type === 'think') {
        const clean = userFacing(part.text ?? part.think ?? '')
        if (clean && part.type === 'text') out.push({ type: 'content', content: { type: 'text', text: clean } })
        continue
      }
      const image = part.type === 'image' && typeof part.data === 'string' ? { mimeType: part.mimeType ?? 'image/png', data: part.data } : dataUrl(part.imageUrl?.url ?? part.image_url?.url ?? part.url)
      if (image) out.push({ type: 'content', content: { type: 'image', mimeType: image.mimeType, data: image.data } })
      else if (typeof (part.imageUrl?.url ?? part.image_url?.url) === 'string') out.push({ type: 'content', content: { type: 'text', text: part.imageUrl?.url ?? part.image_url?.url } })
    }
  }
  return changed ? out : content
}

// Kimi's model-facing additions to an MCP result (agent-core-v2 agent/mcp/output.ts): the <mcp_tool_result name="…">
// wrapper around a media-only result, the note after each image it saved ('Original attachment saved at …', its
// kimi-file:// reference, 'Pass the attachment reference to Read or ReadMediaFile …') and the <mcp-result-extras> block
// carrying a structuredContent / _meta the text does not already hold.
const MCP_WRAPPER = /^<\/?mcp_tool_result(?:\s+name="[^"]*")?>$/
const ATTACHMENT_LINE = /^(?:Original attachment saved at: |Original attachment could not be saved \(|Attachment reference: |Session-relative attachment: |MIME: "[^"]*"; size: \d+ bytes\. Pass the attachment reference )/
const RESULT_EXTRAS = /\n?<mcp-result-extras>\n([\s\S]*?)\n<\/mcp-result-extras>\s*$/

/**
 * A tool result without the agent's model-only text (above): {content, extras} — extras the parsed
 * <mcp-result-extras> object ({structuredContent?, _meta?}) or null. Content the agent did not wrap is left as it is.
 */
export function withoutModelNotes(content) {
  if (!Array.isArray(content)) return { content, extras: null }
  let extras = null
  let changed = false
  const out = []
  for (const block of content) {
    const inner = block?.type === 'content' ? block.content : block
    if (inner?.type !== 'text' || typeof inner.text !== 'string') { out.push(block); continue }
    let text = inner.text
    if (MCP_WRAPPER.test(text.trim())) { changed = true; continue }
    const found = RESULT_EXTRAS.exec(text)
    if (found) {
      try { const parsed = JSON.parse(found[1]); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) extras = { ...extras, ...parsed } } catch {}
      text = text.slice(0, found.index)
    }
    const lines = text.split('\n')
    const kept = lines.filter((line) => !ATTACHMENT_LINE.test(line))
    if (kept.length !== lines.length) text = kept.join('\n')
    if (text === inner.text) { out.push(block); continue }
    changed = true
    const clean = text.replace(/\s+$/, '')
    if (!clean.trim()) continue
    out.push(block?.type === 'content' ? { ...block, content: { ...inner, text: clean } } : { ...inner, text: clean })
  }
  return changed ? { content: out, extras } : { content, extras }
}

const SEVERITY_ORDER = ['Critical', 'Suggestion', 'Nice to have']
/** Markdown for report_findings {level, findings[{severity, file, line, summary, failureScenario, outcome…}]}. */
export function findingsReview(args, cwd) {
  const findings = (Array.isArray(args?.findings) ? args.findings : []).filter((finding) => finding && typeof finding === 'object')
  if (!findings.length) return 'No findings.'
  const rank = (severity) => { const at = SEVERITY_ORDER.indexOf(severity); return at < 0 ? SEVERITY_ORDER.length : at }
  const groups = new Map()
  for (const finding of [...findings].sort((a, b) => rank(a.severity) - rank(b.severity))) {
    const key = typeof finding.severity === 'string' && finding.severity ? finding.severity : 'Findings'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(finding)
  }
  const out = []
  for (const [severity, list] of groups) {
    out.push(`**${severity}** (${list.length})`, '')
    for (const finding of list) {
      const file = typeof finding.file === 'string' && finding.file ? finding.file : null
      const where = file ? `\`${(cwd && file.startsWith(cwd + '/') ? file.slice(cwd.length + 1) : file)}${Number.isInteger(finding.line) ? `:${finding.line}` : ''}\`` : null
      const summary = String(finding.summary ?? finding.shortSummary ?? '').trim()
      const outcome = typeof finding.outcome === 'string' && finding.outcome ? ` _(${finding.outcome.replace(/_/g, ' ')})_` : ''
      out.push(`- ${[where, summary].filter(Boolean).join(' — ')}${outcome}`)
      if (typeof finding.failureScenario === 'string' && finding.failureScenario.trim()) out.push(`  ${finding.failureScenario.trim()}`)
    }
    out.push('')
  }
  return out.join('\n').trim()
}

/**
 * Artifacts an agent attaches to a finished tool call (Qwen's tool_call_update _meta.artifacts: files it wrote or
 * recorded, links such as a pull request): {title, kind, path?, url?}, for the transcript's file and link cards.
 */
export function callArtifacts(call, cwd) {
  const list = Array.isArray(call?._meta?.artifacts) ? call._meta.artifacts : []
  const out = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : null
    if (typeof entry.url === 'string' && /^https?:\/\//.test(entry.url)) out.push({ title: title ?? entry.url, kind: String(entry.kind ?? 'link'), url: entry.url })
    else {
      const file = typeof entry.resolvedPath === 'string' && entry.resolvedPath ? entry.resolvedPath : typeof entry.workspacePath === 'string' && entry.workspacePath ? entry.workspacePath : null
      if (file) out.push({ title: title ?? basename(file), kind: String(entry.kind ?? 'file'), path: !isAbsolute(file) && cwd ? resolve(cwd, file) : file })
    }
  }
  return out
}

/** The settled item for a finished tool call. */
export function completeToolItem(item, rawCall, { failed, declined, durationMs, cwd, commandResult }) {
  const { content: expanded, extras } = withoutModelNotes(expandToolParts(rawCall.content))
  const call = expanded === rawCall.content ? rawCall : { ...rawCall, content: expanded }
  const text = blockText(call.content?.filter?.((block) => block?.type !== 'diff' && block?.type !== 'terminal') ?? call.content)
  const raw = call.rawOutput
  switch (item.type) {
    case 'commandExecution': {
      const parsed = commandResult?.(call) ?? null
      const rawCode = [raw?.exitCode, raw?.exit_code, raw?.details?.execution?.exitCode, raw?.details?.processOutput?.exitCode].find(Number.isInteger)
      const exitCode = Number.isInteger(parsed?.exitCode) ? parsed.exitCode : Number.isInteger(rawCode) ? rawCode : failed ? 1 : 0
      const rawText = typeof raw?.output === 'string' ? raw.output : typeof raw === 'string' ? raw : Array.isArray(raw?.content) ? raw.content.map((block) => block?.text ?? '').join('') : ''
      const output = item.aggregatedOutput ?? parsed?.output ?? (text || rawText)
      // An image a read returns (Kimi's ReadMediaFile): the row's thumbnail (outputImages, as the read_image row).
      const images = imagesOf(call.content)
      return { ...item, status: declined ? 'declined' : failed || exitCode !== 0 ? 'failed' : 'completed', aggregatedOutput: output, exitCode: declined ? null : exitCode, durationMs, ...(images.length ? { outputImages: images } : {}) }
    }
    case 'fileChange': {
      const changes = changesOf(call.content, call.locations, cwd, call.kind, call.rawInput)
      const artifacts = failed || declined ? [] : callArtifacts(call, cwd)
      return { ...item, changes: changes.length ? changes : item.changes, status: declined ? 'declined' : failed ? 'failed' : 'completed', ...(failed && text ? { error: text } : {}),
        ...(artifacts.length ? { codeDesktop: { ...item.codeDesktop, artifacts } } : {}) }
    }
    case 'webSearch':
      return { ...item, status: failed ? 'failed' : 'completed', results: failed ? null : text || null, ...(failed ? { error: { message: text } } : {}) }
    case 'mcpToolCall': {
      if (failed) return { ...item, status: 'failed', durationMs, result: null, error: { message: text || mcpErrorText(raw) || 'The tool failed.' } }
      // An MCP App (Qwen's interactive connector view: rawOutput {type: 'mcp_app', serverName, resourceUri, html,
      // toolResult, fallbackText}, core/src/tools/mcp-tool.ts): OpenClaude Desktop can't host its view yet, so the row keeps
      // the tool's own result (else the App's fallback text) and says that the view exists. The HTML stays out.
      const app = object(raw)?.type === 'mcp_app' ? raw : null
      const result = app ? mcpAppResult(call.content, app) : mcpResultOf(call.content, raw)
      if (app) return { ...item, status: 'completed', durationMs, result, error: null,
        codeDesktop: { ...item.codeDesktop, mcpApp: { serverName: typeof app.serverName === 'string' ? app.serverName : null, resourceUri: typeof app.resourceUri === 'string' ? app.resourceUri : null } } }
      // A structured result the agent passed on only inside its model text (Kimi's <mcp-result-extras>).
      if (extras && extras.structuredContent !== undefined && (result.structuredContent === null || result.structuredContent === undefined)) result.structuredContent = extras.structuredContent
      if (extras && object(extras._meta)) result._meta = extras._meta
      return { ...item, status: 'completed', durationMs, result, error: null }
    }
    case 'collabAgentToolCall': {
      const outcome = failed ? 'errored' : 'completed'
      const ids = item.receiverThreadIds.length ? item.receiverThreadIds : [`${item.id}`]
      // The child's answer: the result content, else its raw output (MiniMax reports the task result there).
      const rawText = typeof raw === 'string' ? raw : typeof raw?.output === 'string' ? raw.output : typeof raw?.text === 'string' ? raw.text : Array.isArray(raw?.content) ? raw.content.map((block) => block?.text ?? '').join('') : ''
      return { ...item, status: failed ? 'failed' : 'completed', agentsStates: Object.fromEntries(ids.map((id) => [id, { status: outcome, message: text || rawText || null }])) }
    }
    case 'exitedReviewMode':
      return { ...item, review: findingsReview(argsOf(call.rawInput), cwd) }
    default: {
      const artifacts = failed ? [] : callArtifacts(call, cwd)
      return { ...item, status: failed ? 'failed' : 'completed', success: !failed, durationMs, contentItems: [...(text ? [{ type: 'inputText', text }] : []), ...imagesOf(call.content)],
        ...(artifacts.length ? { codeDesktop: { ...item.codeDesktop, artifacts } } : {}) }
    }
  }
}

/** MCP content blocks (text, image, text resources) of an ACP tool call's content or an MCP result's content. */
function mcpBlocks(content) {
  const blocks = []
  for (const block of Array.isArray(content) ? content : []) {
    const inner = block?.type === 'content' ? block.content : block
    if (inner?.type === 'text' && typeof inner.text === 'string') blocks.push({ type: 'text', text: inner.text })
    else if (inner?.type === 'image' && typeof inner.data === 'string' && inner.data) blocks.push({ type: 'image', data: inner.data, mimeType: inner.mimeType })
    else if (inner?.type === 'resource' && typeof inner.resource?.text === 'string') blocks.push({ type: 'text', text: inner.resource.text })
  }
  return blocks
}

const object = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null)
// MiniMax Code's model-facing copy of a structured result (its "[MCP structured content]\n<json>" text block).
const STRUCTURED_ECHO = /^\[(?:MCP structured content|invalid MCP structured content)\]/

/**
 * The MCP result an agent put only in rawOutput: MiniMax Code sends {content, details: {mcp: {content, isError,
 * structuredContent}}, server, tool, is_error} and no tool-call content, so the server's own result (details.mcp) is
 * used, else its content without the structured-content echo, else an MCP result itself ({content, structuredContent}).
 */
function rawMcpResult(raw) {
  const value = object(raw)
  if (!value) return null
  const mcp = object(value.details?.mcp)
  if (mcp && Array.isArray(mcp.content)) return { content: mcpBlocks(mcp.content), structuredContent: mcp.structuredContent ?? null }
  if (Array.isArray(value.content)) {
    const content = mcpBlocks(value.content).filter((block) => block.type !== 'text' || !STRUCTURED_ECHO.test(block.text))
    return { content, structuredContent: object(value.structuredContent) ?? null }
  }
  return null
}

/** A completed MCP call's result: its tool-call content, else the result in rawOutput, else rawOutput as text. */
function mcpResultOf(content, raw) {
  const blocks = mcpBlocks(content)
  if (blocks.length) return { content: blocks, structuredContent: null }
  const unwrapped = rawMcpResult(raw)
  if (unwrapped && (unwrapped.content.length || unwrapped.structuredContent !== null)) return unwrapped
  if (raw !== undefined && raw !== null) return { content: [{ type: 'text', text: typeof raw === 'string' ? raw : JSON.stringify(raw) }], structuredContent: null }
  return { content: [], structuredContent: unwrapped?.structuredContent ?? null }
}

/** An MCP App call's result: the tool-call content, else the App's toolResult, else its fallback text. */
function mcpAppResult(content, app) {
  const blocks = mcpBlocks(content)
  if (blocks.length) return { content: blocks, structuredContent: object(app.toolResult)?.structuredContent ?? null }
  const own = object(app.toolResult)
  const ownBlocks = mcpBlocks(own?.content)
  if (ownBlocks.length || own?.structuredContent) return { content: ownBlocks, structuredContent: object(own?.structuredContent) ?? null }
  const fallback = typeof app.fallbackText === 'string' ? app.fallbackText.trim() : ''
  return { content: fallback ? [{ type: 'text', text: fallback }] : [], structuredContent: null }
}

/** A failed MCP call's own error text from rawOutput (MiniMax Code: "MCP tool call failed: …"), or ''. */
function mcpErrorText(raw) {
  if (typeof raw === 'string') return raw.trim()
  const value = object(raw)
  if (!value) return ''
  const unwrapped = rawMcpResult(value)
  const text = (unwrapped?.content ?? []).filter((block) => block.type === 'text').map((block) => block.text).join('\n').trim()
  if (text) return text
  if (typeof value.error === 'string') return value.error.trim()
  if (typeof value.error?.message === 'string') return value.error.message.trim()
  return typeof value.message === 'string' ? value.message.trim() : ''
}

function imagesOf(content) {
  return (Array.isArray(content) ? content : []).map((block) => (block?.type === 'content' ? block.content : block)).filter((block) => block?.type === 'image')
    .map((block) => ({ type: 'inputImage', imageUrl: `data:${block.mimeType};base64,${block.data}` }))
}

/**
 * Codex thread turns for one ACP session. `persist()` gives the durable form
 * (turns only, settled), which store.js writes.
 */
export class ThreadProjector {
  /**
   * @param {{ threadId: string, cwd?: string, turns?: object[], classify?: (call: object) => object | null, onToolStart?: (item: object, call: object) => void }} options
   */
  constructor({ threadId, cwd, turns = [], classify, plan = null, commandResult }) {
    this.threadId = threadId
    this.cwd = cwd
    this.classify = classify
    this.commandResult = commandResult
    this.turns = turns.map((turn) => ({ ...turn, items: [...(turn.items ?? [])] }))
    this.current = null
    this.open = null // {item, kind: 'text' | 'reasoning'}
    this.calls = new Map() // toolCallId → {item, call, startedAtMs}
    this.plan = plan
    this.lastUsage = null
    this.seq = 0
  }

  get activeTurn() {
    return this.current?.status === 'inProgress' ? this.current : null
  }

  snapshot(turn, itemsView = 'full') {
    return {
      id: turn.id,
      items: itemsView === 'full' ? turn.items.map((item) => ({ ...item })) : [],
      itemsView,
      status: turn.status,
      error: turn.error ?? null,
      startedAt: turn.startedAtMs ? nowSeconds(turn.startedAtMs) : null,
      completedAt: turn.completedAtMs ? nowSeconds(turn.completedAtMs) : null,
      durationMs: turn.completedAtMs && turn.startedAtMs ? turn.completedAtMs - turn.startedAtMs : null,
    }
  }

  nextId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${(++this.seq).toString(36)}`
  }

  /** Opens a turn (turn/started + the userMessage item). */
  startTurn({ id, input, clientId = null, time = Date.now(), synthetic = false } = {}, notes = []) {
    this.closeOpen(notes, time)
    const turn = { id: id ?? this.nextId('turn'), items: [], status: 'inProgress', error: null, startedAtMs: time, completedAtMs: null, ...(synthetic ? { synthetic: true } : {}) }
    this.turns.push(turn)
    this.current = turn
    this.calls.clear()
    notes.push({ method: 'turn/started', params: { threadId: this.threadId, turn: this.snapshot(turn) } })
    if (Array.isArray(input) && input.length) this.pushItem(notes, turn, { type: 'userMessage', id: this.nextId('user'), clientId, content: input }, time)
    return turn
  }

  /** Closes the open turn (turn/completed); tools still running settle as interrupted/failed. */
  completeTurn({ status = 'completed', error = null, time = Date.now() } = {}, notes = []) {
    const turn = this.current
    if (!turn || turn.status !== 'inProgress') return notes
    this.closeOpen(notes, time)
    const settled = status === 'interrupted' ? 'interrupted' : status === 'failed' ? 'failed' : 'completed'
    for (const [index, item] of turn.items.entries()) {
      if (item.status !== 'inProgress') continue
      const next = { ...item, status: item.type === 'mcpToolCall' && settled === 'interrupted' ? 'failed' : settled }
      turn.items[index] = next
      notes.push({ method: 'item/completed', params: { item: next, threadId: this.threadId, turnId: turn.id, completedAtMs: time } })
    }
    turn.status = status
    turn.error = error
    turn.completedAtMs = time
    this.calls.clear()
    notes.push({ method: 'turn/completed', params: { threadId: this.threadId, turn: this.snapshot(turn, 'notLoaded') } })
    return notes
  }

  pushItem(notes, turn, item, time = Date.now(), completed = true) {
    const index = turn.items.findIndex((candidate) => candidate.id === item.id)
    if (index >= 0) turn.items[index] = item
    else turn.items.push(item)
    notes.push({ method: 'item/started', params: { item, threadId: this.threadId, turnId: turn.id, startedAtMs: time } })
    if (completed) notes.push({ method: 'item/completed', params: { item, threadId: this.threadId, turnId: turn.id, completedAtMs: time } })
  }

  replaceItem(turn, item) {
    const index = turn.items.findIndex((candidate) => candidate.id === item.id)
    if (index >= 0) turn.items[index] = item
    else turn.items.push(item)
  }

  /** Completes the streaming text/reasoning item, if any. */
  closeOpen(notes, time = Date.now()) {
    const open = this.open
    if (!open) return
    this.open = null
    const turn = this.current
    if (!turn) return
    const item = open.kind === 'reasoning' ? { ...open.item, summary: [open.item.reasoningText ?? ''], content: [] } : open.item
    this.replaceItem(turn, item)
    notes.push({ method: 'item/completed', params: { item, threadId: this.threadId, turnId: turn.id, completedAtMs: time } })
  }

  /** Ensures an open turn for updates that arrive without one (agent-initiated work, replay). */
  ensureTurn(notes, time) {
    if (this.activeTurn) return this.current
    return this.startTurn({ time }, notes)
  }

  streamText(kind, text, notes, time) {
    if (!text) return
    const turn = this.ensureTurn(notes, time)
    if (this.open?.kind !== kind) {
      this.closeOpen(notes, time)
      const item = kind === 'reasoning'
        ? { type: 'reasoning', id: this.nextId('reasoning'), summary: [], content: [], reasoningText: '' }
        : { type: 'agentMessage', id: this.nextId('msg'), text: '', phase: null, memoryCitation: null, delivery: null, questions: null }
      this.open = { kind, item }
      turn.items.push(item)
      notes.push({ method: 'item/started', params: { item: { ...item }, threadId: this.threadId, turnId: turn.id, startedAtMs: time } })
    }
    const item = this.open.item
    if (kind === 'reasoning') {
      item.reasoningText += text
      notes.push({ method: 'item/reasoning/summaryTextDelta', params: { threadId: this.threadId, turnId: turn.id, itemId: item.id, delta: text, summaryIndex: 0 } })
    } else {
      item.text += text
      notes.push({ method: 'item/agentMessage/delta', params: { threadId: this.threadId, turnId: turn.id, itemId: item.id, delta: text } })
    }
  }

  /**
   * One ACP session/update. `replay`: during session/load (user chunks open turns).
   * @returns {Array<{method: string, params: object}>}
   */
  apply(update, { time = Date.now(), replay = false } = {}) {
    const notes = []
    const kind = update?.sessionUpdate
    switch (kind) {
      case 'user_message_chunk': {
        // Live, the bridge already recorded the prompt; replayed, it opens a turn.
        if (!replay) break
        const text = blockText(update.content)
        const image = update.content?.type === 'image'
        const turn = this.activeTurn
        const last = turn?.items.at(-1)
        if (turn && last?.type === 'userMessage' && turn.items.length === 1) {
          if (text) last.content = [...last.content, { type: 'text', text, text_elements: [] }]
          break
        }
        if (turn) this.completeTurn({ time }, notes)
        this.startTurn({ time, input: image ? [{ type: 'image', url: `data:${update.content.mimeType};base64,${update.content.data}` }] : [{ type: 'text', text, text_elements: [] }] }, notes)
        break
      }
      case 'agent_message_chunk':
        this.streamText('text', blockText(update.content), notes, time)
        break
      case 'agent_thought_chunk':
        this.streamText('reasoning', blockText(update.content), notes, time)
        break
      case 'tool_call':
        this.toolCall(update, notes, time)
        break
      case 'tool_call_update':
        this.toolCallUpdate(update, notes, time)
        break
      case 'plan': {
        const turn = this.ensureTurn(notes, time)
        this.plan = planSteps(update.entries)
        notes.push({ method: 'turn/plan/updated', params: { threadId: this.threadId, turnId: turn.id, explanation: null, plan: this.plan } })
        break
      }
      default:
        break
    }
    return notes
  }

  toolCall(update, notes, time) {
    const turn = this.ensureTurn(notes, time)
    this.closeOpen(notes, time)
    const existing = this.calls.get(update.toolCallId)
    if (existing) return this.toolCallUpdate(update, notes, time)
    const call = { ...update, content: update.content ?? [], locations: update.locations ?? [] }
    const item = toolItem(call, { cwd: this.cwd, threadId: this.threadId, classify: this.classify })
    const entry = { item, call, startedAtMs: time }
    this.calls.set(update.toolCallId, entry)
    this.pushItem(notes, turn, item, time, false)
    if (update.status === 'completed' || update.status === 'failed') this.finishCall(entry, notes, time, update.status === 'failed')
    else if (item.type === 'fileChange') this.diffChanged(notes, turn)
  }

  toolCallUpdate(update, notes, time) {
    const turn = this.current
    const entry = this.calls.get(update.toolCallId)
    if (!turn || !entry) {
      if (update.title || update.kind || update.rawInput) this.toolCall({ ...update, sessionUpdate: 'tool_call' }, notes, time)
      return
    }
    const call = entry.call
    for (const key of ['title', 'kind', 'rawInput', 'rawOutput', 'locations', '_meta']) if (update[key] !== undefined && update[key] !== null) call[key] = update[key]
    if (Array.isArray(update.content)) call.content = update.content
    if (update.status) call.status = update.status
    if (entry.item.status === 'inProgress') {
      // A title/input that arrives later (streamed arguments) refines the running item.
      if (update.rawInput || update.title || update.kind) {
        const refreshed = toolItem(call, { cwd: this.cwd, threadId: this.threadId, classify: this.classify })
        // The kind can sharpen once the arguments arrive (Qwen's tool_call running an MCP tool).
        if (refreshed.type === entry.item.type || !entry.item.aggregatedOutput) {
          // A sub-agent call keeps the child it already names (its thread exists before the arguments settle).
          const child = entry.item.type === 'collabAgentToolCall' && refreshed.type === 'collabAgentToolCall' && entry.item.receiverThreadIds?.length ? { receiverThreadIds: entry.item.receiverThreadIds, agentsStates: entry.item.agentsStates } : {}
          entry.item = { ...refreshed, ...(entry.item.aggregatedOutput ? { aggregatedOutput: entry.item.aggregatedOutput } : {}), ...(entry.item.processId ? { processId: entry.item.processId } : {}), ...(entry.item.workflowRun ? { workflowRun: entry.item.workflowRun } : {}), ...child }
          this.replaceItem(turn, entry.item)
          notes.push({ method: 'item/started', params: { item: entry.item, threadId: this.threadId, turnId: turn.id, startedAtMs: entry.startedAtMs } })
        }
      }
      if (entry.item.type === 'fileChange' && Array.isArray(update.content) && update.content.some((block) => block?.type === 'diff')) {
        entry.item = { ...entry.item, changes: changesOf(call.content, call.locations, this.cwd, call.kind, call.rawInput) }
        this.replaceItem(turn, entry.item)
        notes.push({ method: 'item/fileChange/patchUpdated', params: { threadId: this.threadId, turnId: turn.id, itemId: entry.item.id, changes: entry.item.changes } })
        this.diffChanged(notes, turn)
      }
      if (entry.item.type === 'mcpToolCall' && update.status === 'in_progress' && Array.isArray(update.content)) {
        const message = blockText(update.content)
        if (message) notes.push({ method: 'item/mcpToolCall/progress', params: { threadId: this.threadId, turnId: turn.id, itemId: entry.item.id, message: message.slice(0, 500) } })
      }
    }
    if (update.status === 'completed' || update.status === 'failed') this.finishCall(entry, notes, time, update.status === 'failed')
  }

  /** Output of a command the bridge runs for the agent (terminal/*): live deltas. */
  commandOutput(toolCallId, delta, processId, notes = []) {
    const entry = this.calls.get(toolCallId)
    const turn = this.current
    if (!entry || !turn || entry.item.type !== 'commandExecution' || !delta) return notes
    entry.item = { ...entry.item, aggregatedOutput: (entry.item.aggregatedOutput ?? '') + delta, ...(processId ? { processId } : {}) }
    this.replaceItem(turn, entry.item)
    notes.push({ method: 'item/commandExecution/outputDelta', params: { threadId: this.threadId, turnId: turn.id, itemId: entry.item.id, delta } })
    return notes
  }

  /** The item a permission request refers to (creating it from the request's toolCall when missing). */
  itemForPermission(toolCall, notes = []) {
    const known = this.calls.get(toolCall?.toolCallId)
    if (known) {
      if (toolCall.rawInput || toolCall.content) this.toolCallUpdate({ ...toolCall, sessionUpdate: 'tool_call_update', status: undefined }, notes, Date.now())
      return this.calls.get(toolCall.toolCallId).item
    }
    this.toolCall({ ...toolCall, sessionUpdate: 'tool_call', status: 'pending' }, notes, Date.now())
    return this.calls.get(toolCall?.toolCallId)?.item
  }

  /**
   * The item a permission request shows, kept out of the transcript (a call of an agent inside a running workflow:
   * its work belongs to the run, not to the parent turn as if the main agent ran it).
   */
  detachedItem(toolCall) {
    const call = { ...toolCall, content: toolCall?.content ?? [], locations: toolCall?.locations ?? [] }
    return toolItem(call, { cwd: this.cwd, threadId: this.threadId, classify: this.classify })
  }

  /** A declined call: the agent may never send its final update. */
  declineCall(toolCallId, notes = [], time = Date.now()) {
    const entry = this.calls.get(toolCallId)
    if (!entry || entry.item.status !== 'inProgress') return notes
    entry.declined = true
    this.finishCall(entry, notes, time, true, true)
    return notes
  }

  finishCall(entry, notes, time, failed, declined = entry.declined === true) {
    const turn = this.current
    if (!turn || entry.item.status !== 'inProgress') return
    entry.item = completeToolItem(entry.item, entry.call, { failed, declined, durationMs: time - entry.startedAtMs, cwd: this.cwd, commandResult: this.commandResult })
    this.replaceItem(turn, entry.item)
    notes.push({ method: 'item/completed', params: { item: entry.item, threadId: this.threadId, turnId: turn.id, completedAtMs: time } })
    if (entry.item.type === 'fileChange') this.diffChanged(notes, turn)
  }

  /** turn/diff/updated: the turn's file changes as one unified diff. */
  diffChanged(notes, turn) {
    const parts = []
    for (const item of turn.items) {
      if (item.type !== 'fileChange' || item.status === 'declined' || item.status === 'failed') continue
      const call = this.calls.get(item.id)?.call
      const diffs = (call?.content ?? []).filter((block) => block?.type === 'diff')
      if (diffs.length) for (const diff of diffs) parts.push(fileDiff(diff.path, diff.oldText ?? null, diff.newText ?? ''))
      else for (const change of item.changes) if (change.diff) parts.push(change.kind?.type === 'add' ? fileDiff(change.path, null, change.diff) : `diff --git a${change.path} b${change.path}\n--- a${change.path}\n+++ b${change.path}\n${change.diff}`)
    }
    turn.diff = parts.filter(Boolean).join('')
    notes.push({ method: 'turn/diff/updated', params: { threadId: this.threadId, turnId: turn.id, diff: turn.diff } })
  }

  /** The settled turns for the store (open items closed as interrupted). */
  persist() {
    return this.turns.map((turn) => ({
      ...turn,
      items: turn.items.map((item) => (item.status === 'inProgress' && turn.status !== 'inProgress' ? { ...item, status: 'interrupted' } : item)),
    }))
  }

  get preview() {
    for (const turn of this.turns) {
      const user = turn.items.find((item) => item.type === 'userMessage')
      const text = (user?.content ?? []).map((part) => part?.text ?? '').join(' ').trim()
      if (text) return text.slice(0, 200)
    }
    return ''
  }

  get lastActivityMs() {
    let last = null
    for (const turn of this.turns) last = Math.max(last ?? 0, turn.completedAtMs ?? turn.startedAtMs ?? 0)
    return last || null
  }
}
