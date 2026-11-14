// Import Chat History converters: an ImportedSession (model.mjs) → what each target consumes (DESIGN.md "convert.mjs").
//
//   toCodexTurns(session)       Codex Thread turns {id, status:'completed', items} the host renders as is (state.js hydrate,
//                               transcript-rows-model.mjs): userMessage {content:[{type:'text', text, text_elements} |
//                               {type:'image', url} | {type:'localImage', path}]}, agentMessage {text, phase},
//                               reasoning {summary:[text], content:[]}, commandExecution {command, cwd, status,
//                               commandActions, aggregatedOutput, exitCode}, fileChange {changes:[{path, kind:{type,
//                               move_path?}, diff}], status}, mcpToolCall {server, tool, arguments, result:{content},
//                               error}, webSearch {query, action}, dynamicToolCall {tool, arguments, contentItems,
//                               success}, contextCompaction {codeDesktop:{summary}} — the field shapes the DeepSeek
//                               bridge projection emits (harness/packages/codex-app-server/src/projection.js toolItem /
//                               completeToolItem). A turn starts at each user message.
//   toTranscriptText(session, {maxChars = 120000, maxTokens?, includeTools = true}) → {text, truncated, kept, total}
//                               (maxTokens: the budget is estimated tokens, text-budget.mjs). Plain-text hand-off (a target core reads it as developer instructions). A header names
//                               the source, title and cwd. When the conversation does not fit: from the last compaction
//                               summary on if that fits, else the newest messages first, after the summary — and a line
//                               under the header says what was left out.
//   toDshSeed(session)          {messages:[{role:'user'|'assistant', text}]} for the DeepSeek bridge's native import:
//                               tool calls and results become text inside the assistant message (the dsh invariant
//                               forbids a tool/result without its tool/call), consecutive messages of one role merge.
// Rules (DESIGN.md): opaque reasoning (OpenAI encrypted_content, Anthropic signatures, xAI) never crosses models — it is
// dropped everywhere here; plain reasoning shows in turns and is dropped from text hand-offs; injected context is never
// replayed; tool calls pair with results by callId, an unanswered call gets NO_RESULT_TEXT.
import { NO_RESULT_TEXT, clip, isRecord, sourceLabel } from './model.mjs';
import { estimateTokens, headWithinTokens, tailWithinTokens } from './text-budget.mjs';

const textOfParts = (parts = [], { images = true } = {}) => parts.map(part => {
  if (typeof part?.text === 'string') return part.text;
  if (images && part?.image) return `[image${part.image.path ? `: ${part.image.path}` : ''}]`;
  if (images && part?.file) return `[file: ${part.file.path ?? part.file.name ?? ''}]`;
  return '';
}).filter(Boolean).join('\n');

/**
 * Items in display order with each tool_call joined to its result: [{item, result?}] where tool_result items that answer a
 * call are folded into it, and an unmatched result stays an entry of its own.
 */
export function pairTools(items = []) {
  const pending = new Map(); // callId → results not yet taken, in order
  for (const item of items) if (item.kind === 'tool_result' && item.result?.callId) {
    if (!pending.has(item.result.callId)) pending.set(item.result.callId, []);
    pending.get(item.result.callId).push(item);
  }
  const answer = new Map(), used = new Set();
  for (const item of items) {
    if (item.kind !== 'tool_call' || !item.tool?.callId) continue;
    const result = pending.get(item.tool.callId)?.shift();
    if (result) { answer.set(item, result); used.add(result); }
  }
  const out = [];
  for (const item of items) {
    if (item.kind === 'tool_call') out.push({ item, result: answer.get(item)?.result ?? null });
    else if (item.kind === 'tool_result') { if (!used.has(item)) out.push({ item, orphan: true }); }
    else out.push({ item });
  }
  return out;
}

// ---- Codex turns --------------------------------------------------------------------------------------------------
/** apply_patch text ("*** Begin Patch / *** Update File: p …") → [{path, kind, diff}] per file section. */
export function patchChanges(text) {
  if (typeof text !== 'string' || !text.includes('*** ')) return [];
  const changes = [];
  let current = null;
  for (const line of text.split('\n')) {
    const header = /^\*\*\* (Add|Update|Delete) File: (.+)$/.exec(line);
    if (header) { current = { path: header[2].trim(), kind: { type: header[1].toLowerCase(), ...(header[1] === 'Update' ? { move_path: null } : {}) }, diff: '' }; changes.push(current); continue; }
    const move = /^\*\*\* Move to: (.+)$/.exec(line);
    if (move && current) { current.kind.move_path = move[1].trim(); continue; }
    if (/^\*\*\* (Begin|End) Patch/.test(line)) continue;
    if (current) current.diff += `${line}\n`;
  }
  return changes;
}
/** The file changes an edit call stands for (its recorded changes, a patch, or the common edit/write arguments). */
export function editChanges(tool, result) {
  const args = isRecord(tool?.args) ? tool.args : {};
  if (Array.isArray(args.changes) && args.changes.length) return args.changes;
  if (Array.isArray(result?.patch) && result.patch.every(change => typeof change?.path === 'string')) return result.patch;
  const fromPatch = patchChanges(typeof args.input === 'string' ? args.input : typeof args.patch === 'string' ? args.patch : tool?.rawArgs);
  if (fromPatch.length) return fromPatch;
  const file = args.file_path ?? args.path ?? args.filePath ?? args.notebook_path ?? args.target_file;
  if (typeof file !== 'string') return [];
  if (typeof args.content === 'string' && args.old_string === undefined) return [{ path: file, kind: { type: 'add' }, diff: args.content }];
  const edits = Array.isArray(args.edits) ? args.edits : [{ old_string: args.old_string ?? args.oldString ?? args.old_str, new_string: args.new_string ?? args.newString ?? args.new_str }];
  const diff = edits.map(edit => [...String(edit?.old_string ?? '').split('\n').filter(Boolean).map(line => `-${line}`), ...String(edit?.new_string ?? '').split('\n').filter(Boolean).map(line => `+${line}`)].join('\n')).join('\n');
  return [{ path: file, kind: { type: 'update', move_path: null }, diff }];
}
const shellCommand = tool => {
  const args = isRecord(tool?.args) ? tool.args : {};
  const command = args.command ?? args.cmd ?? args.script ?? args.input;
  return Array.isArray(command) ? command.join(' ') : typeof command === 'string' ? command : tool?.rawArgs ?? '';
};

function toolItem(id, tool, result) {
  const done = !!result, failed = result?.isError === true;
  const status = failed ? 'failed' : 'completed';
  const text = done ? result.text ?? '' : NO_RESULT_TEXT;
  switch (tool.category) {
    case 'shell': {
      const command = shellCommand(tool);
      return { type: 'commandExecution', id, command, cwd: tool.args?.cwd ?? tool.args?.workdir ?? '', processId: null, source: 'agent', status,
        commandActions: [{ type: 'unknown', command }], aggregatedOutput: text, exitCode: Number.isFinite(result?.exitCode) ? result.exitCode : done ? (failed ? 1 : 0) : null, durationMs: null };
    }
    case 'edit': {
      const changes = editChanges(tool, result);
      if (changes.length) return { type: 'fileChange', id, changes, status };
      break;
    }
    case 'mcp': {
      const server = tool.mcp?.server ?? '', name = tool.mcp?.tool ?? tool.name;
      return { type: 'mcpToolCall', id, server, tool: name, status, arguments: isRecord(tool.args) ? tool.args : {}, appContext: null, pluginId: null, readOnlyHint: null,
        result: failed ? null : { content: [{ type: 'text', text }], structuredContent: null }, error: failed ? { message: text } : null, durationMs: null };
    }
    case 'web': {
      const args = isRecord(tool.args) ? tool.args : {};
      const url = typeof args.url === 'string' ? args.url : null;
      const query = url ?? (typeof args.query === 'string' ? args.query : Array.isArray(args.queries) ? args.queries.join(', ') : tool.name);
      return { type: 'webSearch', id, query, action: url ? { type: 'openPage', url } : { type: 'search', query, queries: Array.isArray(args.queries) ? args.queries : null }, results: null, status };
    }
    default: break;
  }
  return { type: 'dynamicToolCall', id, namespace: null, tool: tool.name, arguments: isRecord(tool.args) ? tool.args : {}, status,
    contentItems: text ? [{ type: 'inputText', text }] : [], success: done ? !failed : null, durationMs: null };
}

function userContent(parts = []) {
  const content = [];
  for (const part of parts) {
    if (typeof part?.text === 'string') content.push({ type: 'text', text: part.text, text_elements: [] });
    else if (part?.image?.path) content.push({ type: 'localImage', path: part.image.path });
    else if (part?.image?.data || part?.image?.url) content.push({ type: 'image', url: part.image.data ?? part.image.url });
    else if (part?.file) content.push({ type: 'text', text: `[file: ${part.file.path ?? part.file.name ?? ''}]`, text_elements: [] });
  }
  return content;
}

export function toCodexTurns(session, { idPrefix = 'import' } = {}) {
  const turns = [];
  let turn = null;
  const open = () => { turn = { id: `${idPrefix}-turn-${turns.length}`, status: 'completed', items: [], error: null }; turns.push(turn); return turn; };
  for (const { item, result, orphan } of pairTools(session?.items ?? [])) {
    if (orphan || item.kind === 'injected' || item.kind === 'subagent_ref') continue;
    const id = `${idPrefix}-${item.seq}`;
    let out = null;
    switch (item.kind) {
      case 'user': { const content = userContent(item.parts); if (content.length) { open(); out = { type: 'userMessage', id, content }; } break; }
      case 'assistant': { const text = textOfParts(item.parts, { images: false }); if (text.trim()) out = { type: 'agentMessage', id, text, phase: null, memoryCitation: null }; break; }
      case 'reasoning': if (item.reasoning?.text?.trim()) out = { type: 'reasoning', id, summary: [item.reasoning.text], content: [] }; break;
      case 'tool_call': if (item.tool) out = toolItem(id, item.tool, result); break;
      case 'compaction': out = { type: 'contextCompaction', id, ...(item.compaction?.summary ? { codeDesktop: { summary: item.compaction.summary, shadowedItems: null, shadowedTokens: null } } : {}) }; break;
      default: break;
    }
    if (!out) continue;
    (turn ?? open()).items.push(out);
  }
  return turns;
}

// ---- text hand-off ------------------------------------------------------------------------------------------------
const TOOL_ARGS_CHARS = 2000, TOOL_RESULT_CHARS = 4000;
function argsText(tool) {
  const args = isRecord(tool?.args) ? tool.args : {};
  if (tool.category === 'shell') return shellCommand(tool);
  if (tool.category === 'edit') {
    const changes = editChanges(tool, null);
    if (changes.length) return changes.map(change => `${change.kind?.type ?? 'update'} ${change.path}`).join('\n');
  }
  if (tool.category === 'web' && (args.query || args.url)) return String(args.url ?? args.query);
  return tool.rawArgs || JSON.stringify(args);
}
function toolBlock(tool, result) {
  const name = tool.mcp ? `${tool.mcp.server}.${tool.mcp.tool}` : tool.name;
  const output = result ? (result.text || '(empty)') : NO_RESULT_TEXT;
  const status = result?.isError ? ' (error)' : Number.isFinite(result?.exitCode) && result.exitCode !== 0 ? ` (exit ${result.exitCode})` : '';
  return `[Tool: ${name}]\n${clip(argsText(tool), TOOL_ARGS_CHARS)}\n[Result${status}]\n${clip(output, TOOL_RESULT_CHARS)}`;
}

/** Conversation blocks for text hand-offs: [{role, text, compaction?}] (no injected context, no reasoning). */
function textBlocks(session, { includeTools = true } = {}) {
  const blocks = [];
  for (const { item, result, orphan } of pairTools(session?.items ?? [])) {
    if (orphan) continue;
    // ts: the source's own time of the entry (model.mjs ItemList, ms or null), which a native seed carries along.
    const ts = Number.isSafeInteger(item.ts) && item.ts > 0 ? { ts: item.ts } : {};
    if (item.kind === 'user') { const text = textOfParts(item.parts); if (text.trim()) blocks.push({ role: 'user', text, ...ts }); }
    else if (item.kind === 'assistant') { const text = textOfParts(item.parts, { images: false }); if (text.trim()) blocks.push({ role: 'assistant', text, ...ts }); }
    else if (item.kind === 'tool_call' && includeTools && item.tool) blocks.push({ role: 'assistant', text: toolBlock(item.tool, result), tool: true, ...ts });
    else if (item.kind === 'compaction') blocks.push({ role: 'user', compaction: true, summary: !!item.compaction?.summary, ...ts,
      text: item.compaction?.summary ? `Summary of the earlier conversation:\n${item.compaction.summary}` : '[The earlier conversation was compacted here.]' });
  }
  return blocks;
}

const ROLE_LABEL = { user: 'User', assistant: 'Assistant' };
const formatBlock = block => block.compaction ? block.text : block.tool ? block.text : `${ROLE_LABEL[block.role]}:\n${block.text}`;

export function toTranscriptText(session, { maxChars = 120000, maxTokens, includeTools = true } = {}) {
  // maxTokens (targets.mjs budgets): every size below is an estimated token count (text-budget.mjs); else characters.
  const tokens = Number.isFinite(maxTokens) && maxTokens > 0;
  const size = tokens ? estimateTokens : text => text.length;
  const limit = tokens ? Math.floor(maxTokens) : maxChars;
  const tail = tokens ? tailWithinTokens : (text, n) => (n > 0 ? text.slice(-n) : '');
  const head = tokens ? headWithinTokens : (text, n) => text.slice(0, Math.max(0, n));
  const header = [`Conversation imported from ${sourceLabel(session?.source)}`,
    session?.title ? `Title: ${session.title}` : null, session?.cwd ? `Working directory: ${session.cwd}` : null].filter(Boolean).join('\n');
  const blocks = textBlocks(session, { includeTools }).map(block => ({ ...block, rendered: formatBlock(block) }));
  const join = list => list.map(block => block.rendered).join('\n\n');
  const full = `${header}\n\n${join(blocks)}`;
  if (size(full) <= limit) return { text: full, truncated: false, kept: blocks.length, total: blocks.length };
  const note = (kept, why) => `[Truncated: ${blocks.length - kept} of ${blocks.length} earlier entries are not included${why}.]`;
  // 1. From the last compaction summary on, when that fits whole.
  const last = blocks.findLastIndex(block => block.compaction && block.summary);
  if (last > 0) {
    const kept = blocks.slice(last);
    const text = `${header}\n${note(kept.length, '; the summary below covers them')}\n\n${join(kept)}`;
    if (size(text) <= limit) return { text, truncated: true, kept: kept.length, total: blocks.length };
  }
  // 2. Newest first, after the latest summary (clipped to a quarter of the budget).
  const quarter = Math.floor(limit / 4);
  const summary = last >= 0 ? { ...blocks[last], rendered: size(blocks[last].rendered) > quarter ? `${head(blocks[last].rendered, quarter)}\n… [clipped]` : blocks[last].rendered } : null;
  const reserve = size(header) + size(note(0, '; the summary below covers the oldest of them')) + 4 + (summary ? size(summary.rendered) + 1 : 0);
  let budget = limit - reserve;
  const kept = [];
  for (let at = blocks.length - 1; at > (last >= 0 ? last : -1) && budget > 0; at--) {
    const rendered = blocks[at].rendered, cost = size(rendered) + 1;
    if (cost <= budget) { kept.unshift(blocks[at]); budget -= cost; continue; }
    if (!kept.length) kept.unshift({ ...blocks[at], rendered: `…${tail(rendered, budget - 1)}` });
    break;
  }
  const body = summary ? [summary, ...kept] : kept;
  const text = `${header}\n${note(body.length, summary ? '; the summary below covers the oldest of them' : '')}\n\n${join(body)}`;
  return { text: size(text) > limit ? head(text, limit) : text, truncated: true, kept: body.length, total: blocks.length };
}

// ---- DeepSeek native seed -----------------------------------------------------------------------------------------
export function toDshSeed(session) {
  const messages = [];
  for (const block of textBlocks(session, { includeTools: true })) {
    const previous = messages.at(-1);
    // parts: the same text, block by block (`text` is their "\n\n" join); a core that seeds content blocks (the DeepSeek
    // Harness) keeps each tool call as its own block, which its projection shows as a collapsed tool row.
    const part = { text: block.text, ...(block.tool ? { tool: true } : {}) };
    if (previous && previous.role === block.role) { previous.text += `\n\n${block.text}`; previous.parts.push(part); if (!previous.ts && block.ts) previous.ts = block.ts; }
    // ts: the message's first time from the source; each core keeps the imported messages in that order and time
    // (an OpenCode / MiMo rewind cuts by message time), and a source without times leaves it out.
    else messages.push({ role: block.role, text: block.text, parts: [part], ...(block.ts ? { ts: block.ts } : {}) });
  }
  for (const message of messages) if (!message.parts.some(part => part.tool)) delete message.parts;
  return { messages };
}
