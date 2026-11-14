// Import Chat History: the neutral session model every source parser produces and every consumer (catalog, convert,
// targets, the page) reads. Contract: analysis/import-chat-history/DESIGN.md "中立模型"; on-disk formats:
// analysis/import-chat-history/formats.md. Pure: no I/O.
//
//   SessionSummary  { key, source, sourceId, sourcePath, title, firstPrompt, cwd, gitBranch, model, createdAt, updatedAt,
//                     archived, parentId, isSubagent, messageCount?, fidelity: 'full'|'partial', experimental, warnings[] }
//                   createdAt / updatedAt are epoch milliseconds (numbers) or null; key = `${source}:${sourceId}`.
//   ImportedSession { ...SessionSummary, items: Item[] }
//   Item            { seq, kind, ts (epoch ms | null), parts: [{text} | {image:{mime, data?, url?, path?}} | {file:{name, path?, mime?}}],
//                     reasoning?: {text?, opaque?: {vendor, model, payload}}, tool?: {callId, name, rawArgs, args, category, mcp?},
//                     result?: {callId, text, isError, exitCode?, patch?}, compaction?: {summary} }
//                   kind: user | assistant | reasoning | tool_call | tool_result | compaction | injected | subagent_ref.
//                   Parsers keep injected context (kind 'injected') so a preview may show it; converters never replay it.

export const SOURCES = Object.freeze([
  { id: 'codex', label: 'Codex', experimental: false },
  { id: 'claude-code', label: 'Claude Code', experimental: false },
  { id: 'dsh', label: 'DeepSeek Harness', experimental: false },
  // Gemini, Kimi, Qwen, OpenCode and MiMo: parsed from the upstream code that writes their sessions, checked against
  // this machine's pinned versions (sources/<id>.mjs headers). MiniMax Code and ZCode were read from upstream HEAD
  // with no local sessions of the pinned releases to verify against: experimental.
  { id: 'gemini', label: 'Gemini CLI', experimental: false },
  { id: 'opencode', label: 'OpenCode', experimental: false },
  { id: 'mimo', label: 'MiMo Code', experimental: false },
  { id: 'grok', label: 'Grok CLI', experimental: false },
  { id: 'kimi', label: 'Kimi', experimental: false },
  { id: 'qwen', label: 'Qwen Code', experimental: false },
  { id: 'minimax', label: 'MiniMax Code', experimental: true },
  { id: 'zcode', label: 'ZCode', experimental: true },
  { id: 'copilot', label: 'GitHub Copilot CLI', experimental: true },
  { id: 'cursor', label: 'Cursor', experimental: true },
]);
export const SOURCE_IDS = Object.freeze(SOURCES.map(source => source.id));
const BY_ID = new Map(SOURCES.map(source => [source.id, source]));
export const sourceLabel = id => BY_ID.get(id)?.label ?? String(id ?? '');
export const isExperimentalSource = id => BY_ID.get(id)?.experimental === true;

export const ITEM_KINDS = Object.freeze(['user', 'assistant', 'reasoning', 'tool_call', 'tool_result', 'compaction', 'injected', 'subagent_ref']);
export const TOOL_CATEGORIES = Object.freeze(['shell', 'edit', 'mcp', 'web', 'other']);
// Tool results longer than this are clipped in the model (a 36 MB rollout's command dumps are not conversation): the
// preview and every converter truncate far below it anyway.
export const MAX_RESULT_CHARS = 50000;
export const NO_RESULT_TEXT = '(no result)';

/** The stable catalog key of one session. */
export const sessionKey = (source, sourceId) => `${source}:${sourceId}`;
/** A key → {source, sourceId}; sourceId may itself hold ':' (only the first one splits). null when malformed. */
export function parseKey(key) {
  if (typeof key !== 'string') return null;
  const at = key.indexOf(':');
  if (at <= 0 || at === key.length - 1) return null;
  const source = key.slice(0, at);
  return BY_ID.has(source) ? { source, sourceId: key.slice(at + 1) } : null;
}

const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
export { isRecord };

/** Epoch ms from seconds, ms, an ISO string or a Date; null when unusable. Values below 1e11 are seconds. */
export function toMs(value) {
  if (value instanceof Date) value = value.getTime();
  if (typeof value === 'string' && value.trim()) {
    if (/^\d+(\.\d+)?$/.test(value.trim())) value = Number(value);
    else { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; }
  }
  if (typeof value === 'bigint') value = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value < 1e11 ? Math.round(value * 1000) : Math.round(value);
}

export function clip(text, max = MAX_RESULT_CHARS) {
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}\n… [${text.length - max} more characters]` : text;
}
/** A one-line preview (titles, first prompts). */
export const oneLine = (text, max = 300) => typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export function parseJson(text) {
  if (typeof text !== 'string') return text;
  try { return JSON.parse(text); } catch { return undefined; }
}
/** Tool arguments: an object as is, a JSON string parsed (raw kept), anything else wrapped. */
export function toolArgs(raw) {
  if (isRecord(raw)) return { rawArgs: JSON.stringify(raw), args: raw };
  if (typeof raw === 'string') {
    const parsed = parseJson(raw);
    return { rawArgs: raw, args: isRecord(parsed) ? parsed : { input: raw } };
  }
  if (raw === undefined || raw === null) return { rawArgs: '', args: {} };
  return { rawArgs: JSON.stringify(raw), args: { input: raw } };
}

// ---- tool categories ----------------------------------------------------------------------------------------------
// Names seen across the sources' tool sets (Codex shell/exec_command/local_shell/apply_patch; Claude Code Bash/Edit/
// Write/MultiEdit/NotebookEdit/WebSearch/WebFetch; dsh bash/pwsh/write/edit/web_search/web_fetch; Gemini
// run_shell_command/replace/write_file/google_web_search/web_fetch; OpenCode bash/edit/write/patch/webfetch; Grok and
// Kimi/Qwen (Gemini-derived) alike). Compared case-insensitively without separators.
const norm = name => String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const SHELL = new Set(['bash', 'shell', 'sh', 'zsh', 'pwsh', 'powershell', 'execcommand', 'localshell', 'localshellcall', 'runshellcommand',
  'runterminalcmd', 'runterminalcommand', 'terminal', 'runcommand', 'command', 'shellcommand', 'executecommand', 'container.exec', 'containerexec', 'unifiedexec', 'exec']);
const EDIT = new Set(['applypatch', 'edit', 'write', 'multiedit', 'notebookedit', 'strreplaceeditor', 'strreplacebasededittool', 'createfile', 'replace',
  'writefile', 'editfile', 'searchreplace', 'patch', 'strreplace', 'insert', 'writetofile', 'replaceinfile', 'createorupdatefile', 'deletefile']);
const WEB = new Set(['websearch', 'webfetch', 'googlewebsearch', 'fetch', 'browse', 'searchweb', 'fetchurl', 'websearchcall', 'webbrowse', 'urlfetch', 'websearchtool']);

/** `mcp__server__tool` (Claude Code, dsh), `server__tool` with an mcp namespace (Codex), else null. */
export function mcpOf(name, namespace) {
  if (typeof name !== 'string') return null;
  const match = /^mcp__(.+?)__(.+)$/.exec(name);
  if (match) return { server: match[1], tool: match[2] };
  if (typeof namespace === 'string' && /^mcp__/.test(namespace)) return { server: namespace.replace(/^mcp__/, '').replace(/__$/, ''), tool: name };
  return null;
}
/** shell | edit | mcp | web | other for a tool name (an explicit mcp descriptor wins). */
export function toolCategory(name, { mcp, namespace } = {}) {
  if (mcp || mcpOf(name, namespace)) return 'mcp';
  const key = norm(name);
  if (SHELL.has(key)) return 'shell';
  if (EDIT.has(key)) return 'edit';
  if (WEB.has(key)) return 'web';
  return 'other';
}

// ---- injected context -------------------------------------------------------------------------------------------
// Text the harness put in a user-role message (formats.md "过滤注入"). Matched on the trimmed start of the text.
const CODEX_INJECTED = /^\s*(<(environment_context|codex_internal_context|recommended_plugins|user_instructions|turn_aborted|subagent_notification)\b|# AGENTS\.md instructions for )/;
const CLAUDE_INJECTED = /^\s*(<(system-reminder|local-command-|command-name|command-message|command-args|task-notification|user-prompt-submit-hook)|Caveat: The messages below were generated by the user while running local commands|\[Request interrupted by user)/;
const GENERIC_INJECTED = /^\s*<(system-reminder|environment_context|user_instructions)\b/;
export const isCodexInjected = text => typeof text === 'string' && CODEX_INJECTED.test(text);
export const isClaudeInjected = text => typeof text === 'string' && CLAUDE_INJECTED.test(text);
/** The injection test for a source (generic `<system-reminder>`-style wrappers for every other source). */
export function isInjectedText(source, text) {
  if (typeof text !== 'string') return false;
  if (source === 'codex') return CODEX_INJECTED.test(text);
  if (source === 'claude-code' || source === 'qwen') return CLAUDE_INJECTED.test(text) || GENERIC_INJECTED.test(text);
  return GENERIC_INJECTED.test(text);
}

// ---- builders -----------------------------------------------------------------------------------------------------
/** A SessionSummary with every contract field present (unknowns null / false / []). */
export function makeSummary(source, sourceId, fields = {}) {
  const meta = BY_ID.get(source);
  return {
    key: sessionKey(source, sourceId), source, sourceId: String(sourceId), sourcePath: fields.sourcePath ?? null,
    title: oneLine(fields.title ?? '', 200), firstPrompt: oneLine(fields.firstPrompt ?? '', 300),
    cwd: typeof fields.cwd === 'string' && fields.cwd ? fields.cwd : null, gitBranch: fields.gitBranch || null, model: fields.model || null,
    createdAt: toMs(fields.createdAt), updatedAt: toMs(fields.updatedAt) ?? toMs(fields.createdAt),
    archived: fields.archived === true, parentId: fields.parentId ?? null, isSubagent: fields.isSubagent === true,
    ...(Number.isFinite(fields.messageCount) ? { messageCount: fields.messageCount } : {}),
    fidelity: fields.fidelity === 'partial' ? 'partial' : 'full', experimental: fields.experimental ?? meta?.experimental === true,
    warnings: Array.isArray(fields.warnings) ? fields.warnings.slice() : [],
    ...(fields.extra && isRecord(fields.extra) ? fields.extra : {}),
  };
}

/** An ordered item list: push() numbers items from 0 and drops empty user/assistant/reasoning entries. */
export class ItemList {
  constructor() { this.items = []; }
  push(kind, fields = {}) {
    const parts = (fields.parts ?? []).filter(part => part && ((typeof part.text === 'string' && part.text.length) || part.image || part.file));
    if ((kind === 'user' || kind === 'assistant' || kind === 'injected') && !parts.length) return null;
    if (kind === 'reasoning' && !fields.reasoning?.text && !fields.reasoning?.opaque) return null;
    const item = { seq: this.items.length, kind, ts: toMs(fields.ts), parts };
    for (const field of ['reasoning', 'tool', 'result', 'compaction', 'ref']) if (fields[field] !== undefined) item[field] = fields[field];
    this.items.push(item);
    return item;
  }
  toolCall({ callId, name, raw, namespace, mcp, category, ts, parts }) {
    const { rawArgs, args } = toolArgs(raw);
    const descriptor = mcp ?? mcpOf(name, namespace);
    return this.push('tool_call', { ts, parts, tool: { callId: String(callId ?? ''), name: String(name ?? 'tool'), rawArgs, args,
      category: category ?? toolCategory(name, { mcp: descriptor }), ...(descriptor ? { mcp: descriptor } : {}) } });
  }
  toolResult({ callId, text, isError = false, exitCode, patch, ts }) {
    return this.push('tool_result', { ts, result: { callId: String(callId ?? ''), text: clip(typeof text === 'string' ? text : text == null ? '' : JSON.stringify(text)),
      isError: isError === true, ...(Number.isFinite(exitCode) ? { exitCode } : {}), ...(patch !== undefined ? { patch } : {}) } });
  }
}

/** user + assistant items: the summary's messageCount once a session was read. */
export const countMessages = items => items.filter(item => item.kind === 'user' || item.kind === 'assistant').length;

/** Summary + items → ImportedSession (messageCount, firstPrompt refreshed from the items). */
export function makeSession(summary, items, warnings = []) {
  const firstUser = items.find(item => item.kind === 'user')?.parts.find(part => typeof part.text === 'string')?.text;
  return { ...summary, firstPrompt: summary.firstPrompt || oneLine(firstUser ?? '', 300), messageCount: countMessages(items),
    warnings: [...new Set([...(summary.warnings ?? []), ...warnings])], items };
}

/** Text of a content block list in the shapes the sources use ({type:'text'|'input_text'|'output_text'|'Text', text}). */
export function textOfBlocks(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(block => typeof block === 'string' ? block : typeof block?.text === 'string' ? block.text : '').filter(Boolean).join('\n');
}
