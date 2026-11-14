// MiniMax Code (`mcode`, github.com/MiniMax-AI/minimax-code): the v2 session database of its data directory.
// Experimental: no local mcode sessions to verify against (OpenClaude pins release 0.6.2, app/electron/cores/minimax.mjs;
// read against upstream HEAD 0.7.2 and the columns the bridge's minimax-state.cjs already reads from 0.6.2 databases).
//
//   data dir     $MINIMAX_DATA_DIR, else $MAVIS_DATA_DIR (tui/src/runtime/data-dir.ts:31-37, config/src/config.ts:1368-1372),
//                else ~/.minimax (config/src/data-dir.ts:5,40-42); ~/.mavis is the legacy name it migrates from (:6,44).
//   database     <data dir>/v2/sqlite/runtime-state.sqlite (shared/src/local-runtime-paths.ts:57-58), WAL, written by
//                local-runtime-v2 through drizzle + better-sqlite3; opened read-only here.
//   sessions     local_runtime_sessions (infra/db/migrations/session/migration-0006-session-storage-ddl.ts:1-30, drizzle
//                schema infra/db/schema/sessions.ts:4-30): session_id, record_json (the whole SessionRecord), updated_at_ms,
//                columnar_version (3 = columns authoritative, sessions/repo/drizzle/codec.ts:22,53-88), agent_name,
//                session_type root | branch, session_kind conversation | task | peek | channel | cron | unknown, visibility
//                visible | hidden, parent_session_id, workspace_dir, title, created_at_ms, archived, extra_data_json
//                {effectiveModel, …} (codec.ts:27-45); history_relative_dir since migration 0021. Older rows
//                (columnar_version < 3) are read from record_json {sessionId, title, workspaceDir, createdAtMs, …}.
//   display      local_runtime_message_rows (ddl.ts:82-92, schema/messages.ts:10-21): id (insertion order: an upsert by
//                (session_id, msg_id) keeps the row, messages/repo/drizzle.ts:484-505), msg_id, role, turn_id, source,
//                created_at_ms, data_json = the display message (messages/repo/codec.ts:14-62):
//                  user       {msg_id, role:'user', msg_content, msg_type:1, timestamp, kind?, editContent?, attachments?:
//                             [{type, file_path, file_name, mime_type, data_url?} | {meta:{fileName, mimeType}, local:{filePath}}]}
//                             (messages/user-message-commit-service.ts:117-133,155-185); a woken background task's report
//                             is a user row with source 'background-task' (local-runtime background-task/conversation-delivery.ts:99-147)
//                  assistant  AgentMessage {msg_id, role:'assistant', msg_type 1 | 2 (tool calls), msg_content,
//                             msg_content_source?:'system_error', thinking_content, tool_calls: [{tool_name, tool_call_id,
//                             tool_call_status 1 start | 2 finished | 3 failed | 4 preparing | 5 prepared, tool_call_args
//                             (JSON), tool_call_result_data (JSON of the tool result, or {error})}], usage}
//                             (agent-core protocol/agent-message.ts:42-75,195-215; event-bridge/converters.ts:116-141,166-191)
//                  compaction {msg_id:'compaction-<id>', role:'assistant', kind compaction_start | compaction |
//                             compaction_failed} — no summary text (session-system/agent-projection.ts:1035-1063)
//                  other      msg_type 3 system events (turn-system/agent-host/execution/execution-observability.ts:24-30),
//                             review_* frames, a fork's 'fork-origin' marker (messages/repo/drizzle.ts:812-814): not conversation.
//                The same row → message mapping as mcode's own ACP replay (tui/src/runtime/stream-events.ts:342-371 and
//                normalizeToolCalls :536-579, read by tui/src/acp/agent.ts:1776-1830 session/load).
//   legacy       local_runtime_messages.display_messages_json (ddl.ts:77-81): a session whose display rows were not
//                backfilled yet (local_runtime_message_row_migrations) keeps its display messages there as one array.
// The model's own history (<data dir>/v2/sessions/<UTC date>/<time>-session_<id>/messages.jsonl, messages/history/
// session-history-paths.ts:53-120) is not read: the display rows hold the conversation the user saw.
// OpenClaude's MiniMax threads run in homes of their own under the bridge's state folder (acp-bridge agents/minimax.js
// launch): never scanned here; callers may still pass them in `exclude`.
import path from 'node:path';
import { ItemList, isInjectedText, isRecord, makeSession, makeSummary, parseJson, textOfBlocks } from '../model.mjs';
import { SESSION_CAPPED_WARNING, closeDatabase, envOf, existingDirs, homeOf, isExcluded, openDatabase, rowBudget, statOf, tableColumns, takeRows } from './shared.mjs';

export const id = 'minimax';
export const label = 'MiniMax Code';
export const experimental = true;

/** The data directories mcode may use, in its own order of preference. */
function dataDirs(ctx) {
  const env = envOf(ctx), home = homeOf(ctx);
  return [env.MINIMAX_DATA_DIR?.trim(), env.MAVIS_DATA_DIR?.trim(), path.join(home, '.minimax'), path.join(home, '.mavis')].filter(Boolean);
}
const dbOf = dir => path.join(dir, 'v2', 'sqlite', 'runtime-state.sqlite');
export const roots = ctx => [...new Set(dataDirs(ctx).map(dbOf))];

async function databases(ctx) {
  // One database per real directory (~/.mavis is often a link to ~/.minimax after mcode's migration).
  return (await existingDirs(dataDirs(ctx))).map(dbOf);
}

const json = text => { const value = parseJson(text); return isRecord(value) ? value : {}; };
// Provenances of user rows mcode itself wrote (messages/source.ts:2-11): not the user's words.
const INJECTED_SOURCES = new Set(['background-task', 'system', 'team', 'thread-goal', 'cron']);
const isInjectedSource = source => typeof source === 'string' && INJECTED_SOURCES.has(source);

/** One local_runtime_sessions row: its columns over its record_json (pre-columnar rows have only the latter). */
function sessionFields(row) {
  const record = json(row.record_json), extra = json(row.extra_data_json);
  const columnar = Number(row.columnar_version) >= 3;
  const pick = (column, key) => (columnar && row[column] !== undefined && row[column] !== null ? row[column] : record[key] ?? row[column] ?? null);
  return {
    sessionId: row.session_id,
    title: pick('title', 'title'),
    cwd: pick('workspace_dir', 'workspaceDir'),
    createdAt: pick('created_at_ms', 'createdAtMs'),
    updatedAt: row.updated_at_ms ?? record.updatedAtMs ?? null,
    parentId: pick('parent_session_id', 'parentSessionId'),
    kind: pick('session_kind', 'sessionKind'),
    type: pick('session_type', 'sessionType'),
    visibility: pick('visibility', 'visibility') ?? 'visible',
    archived: Boolean(Number(pick('archived', 'archived') ?? 0)) || record.archived === true,
    model: extra.effectiveModel ?? record.effectiveModel ?? null,
    agent: pick('agent_name', 'agentName'),
  };
}

const ROW_COUNT = `SELECT count(*) AS n FROM local_runtime_message_rows WHERE session_id = ? AND role IN ('user', 'assistant')
  AND coalesce(json_extract(data_json, '$.msg_type'), 0) <> 3
  AND coalesce(json_extract(data_json, '$.kind'), '') NOT IN ('compaction_start', 'compaction', 'compaction_failed', 'fork-origin')`;
const FIRST_PROMPT = `SELECT source, data_json FROM local_runtime_message_rows WHERE session_id = ? AND role = 'user' ORDER BY id LIMIT 8`;

function firstPromptOf(rows) {
  for (const row of rows) {
    const data = isRecord(row.data) ? row.data : json(row.data_json);
    const text = typeof data.msg_content === 'string' ? data.msg_content : '';
    if (text.trim() && !isInjectedSource(row.source ?? data.source) && data.kind !== 'background-task-terminal' && !isInjectedText('minimax', text)) return text;
  }
  return '';
}
function legacyDisplay(db, hasLegacy, sessionId) {
  if (!hasLegacy) return [];
  try {
    const row = db.prepare('SELECT display_messages_json FROM local_runtime_messages WHERE session_id = ?').get(sessionId);
    const value = row ? parseJson(row.display_messages_json) : null;
    return Array.isArray(value) ? value.filter(isRecord) : [];
  } catch { return []; }
}

export async function list(ctx = {}) {
  const warn = message => ctx.warn?.('minimax', message);
  const out = [];
  for (const file of await databases(ctx)) {
    if (isExcluded(file, ctx.exclude)) continue;
    const db = await openDatabase(file, warn);
    if (!db) continue;
    try {
      if (!tableColumns(db, 'local_runtime_sessions').size) continue;
      const hasRows = tableColumns(db, 'local_runtime_message_rows').size > 0, hasLegacy = tableColumns(db, 'local_runtime_messages').size > 0;
      const count = hasRows ? db.prepare(ROW_COUNT) : null, first = hasRows ? db.prepare(FIRST_PROMPT) : null;
      for (const row of db.prepare('SELECT * FROM local_runtime_sessions ORDER BY updated_at_ms DESC').all()) {
        const fields = sessionFields(row);
        // A side question (peek) is never a conversation; hidden sessions (delegates, workflow agents) and sub-agent
        // Tasks only when asked for.
        if (fields.kind === 'peek') continue;
        const isSubagent = Boolean(fields.parentId) || fields.kind === 'task' || fields.visibility === 'hidden';
        if (isSubagent && !ctx.includeSubagents) continue;
        let messageCount = 0, firstPrompt = '';
        try { messageCount = count ? Number(count.get(fields.sessionId)?.n ?? 0) : 0; } catch {}
        if (messageCount) { try { firstPrompt = firstPromptOf(first.all(fields.sessionId)); } catch {} }
        let legacy = false;
        if (!messageCount) {
          const display = legacyDisplay(db, hasLegacy, fields.sessionId);
          messageCount = display.filter(message => message.role === 'user' || message.role === 'assistant').length;
          firstPrompt = firstPromptOf(display.filter(message => message.role === 'user').map(data => ({ data, source: data.source })));
          legacy = messageCount > 0;
        }
        if (!messageCount) continue;
        out.push(makeSummary('minimax', fields.sessionId, {
          sourcePath: file, title: fields.title ?? '', firstPrompt, cwd: fields.cwd, model: fields.model, createdAt: fields.createdAt,
          updatedAt: fields.updatedAt, archived: fields.archived, parentId: fields.parentId, isSubagent, messageCount,
          experimental, extra: { schema: legacy ? 'legacy-display' : 'rows', ...(fields.agent ? { agentName: fields.agent } : {}) },
        }));
      }
    } catch (error) { warn(`${path.basename(file)}: ${error?.message || error}`); } finally { closeDatabase(db); }
  }
  return out;
}

// ---- display messages → items ------------------------------------------------------------------------------------
const parseValue = value => { if (typeof value !== 'string') return value ?? undefined; const parsed = parseJson(value); return parsed === undefined ? value : parsed; };
const firstOf = (record, keys) => { for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key]; return undefined; };

/** A stored tool call as mcode's replay reads it (stream-events.ts:536-579). */
function toolCallOf(record) {
  const name = firstOf(record, ['tool_name', 'tool_call_name', 'toolName', 'name']);
  if (typeof name !== 'string' || !name) return null;
  return {
    id: firstOf(record, ['tool_call_id', 'toolCallId', 'id']),
    name,
    status: firstOf(record, ['tool_call_status', 'toolCallStatus', 'status']),
    input: parseValue(firstOf(record, ['tool_call_args', 'toolCallArgs', 'args', 'arguments', 'input'])),
    output: parseValue(firstOf(record, ['tool_call_result_data', 'toolCallResultData', 'tool_call_result', 'toolCallResult', 'result', 'output'])),
    error: firstOf(record, ['tool_call_error', 'toolCallError', 'error']),
  };
}
/** The text of a tool result: pi's {content:[{type:'text', text}], details} (images left out), a string, or JSON. */
function resultText(output, error) {
  if (error !== undefined && error !== null) return typeof error === 'string' ? error : JSON.stringify(error);
  if (typeof output === 'string') return output;
  if (isRecord(output)) {
    if (output.error !== undefined && Object.keys(output).length === 1) return typeof output.error === 'string' ? output.error : JSON.stringify(output.error);
    if (Array.isArray(output.content)) return textOfBlocks(output.content.filter(block => typeof block === 'string' || block?.type === 'text'));
    for (const key of ['output', 'stdout', 'text', 'result']) if (typeof output[key] === 'string') return output[key];
  }
  return output === undefined ? '' : JSON.stringify(output);
}
const statusOf = status => {
  const value = String(status ?? '').toLowerCase();
  if (value === '2' || value === 'finished' || value === 'completed' || value === 'success') return 'done';
  if (value === '3' || value === 'failed' || value === 'error') return 'failed';
  return value === '' ? 'unknown' : 'running';
};
function pushTool(list, call, ts, rowKey, index) {
  const callId = String(call.id ?? `minimax-${rowKey}-${index}`);
  list.toolCall({ callId, name: call.name, raw: isRecord(call.input) ? call.input : call.input ?? {}, ts });
  const status = statusOf(call.status);
  // A call still starting / preparing has no result yet (a turn cut short): converters add '(no result)'.
  if (status === 'running' || (status === 'unknown' && call.output === undefined && call.error == null)) return;
  const isError = status === 'failed' || (isRecord(call.output) && call.output.error !== undefined && Object.keys(call.output).length === 1) || (call.error !== undefined && call.error !== null);
  const exitCode = isRecord(call.output?.details) && Number.isFinite(call.output.details.exitCode) ? call.output.details.exitCode : undefined;
  list.toolResult({ callId, text: resultText(call.output, call.error), isError, exitCode, ts });
}

/** User attachments (stream-events.ts:496-534): images by path or data URL, other files by name and path. */
function attachmentParts(attachments) {
  const parts = [];
  for (const record of Array.isArray(attachments) ? attachments : []) {
    if (!isRecord(record)) continue;
    const meta = isRecord(record.meta) ? record.meta : record, local = isRecord(record.local) ? record.local : {}, cloud = isRecord(record.cloud) ? record.cloud : {};
    const mime = firstOf(meta, ['mimeType', 'mime_type']) ?? firstOf(record, ['mimeType', 'mime_type']) ?? 'application/octet-stream';
    const type = firstOf(meta, ['attachmentType', 'attachment_type', 'type']) ?? firstOf(record, ['attachmentType', 'attachment_type', 'type']);
    const name = firstOf(meta, ['fileName', 'file_name']) ?? firstOf(record, ['fileName', 'file_name']) ?? 'attachment';
    const file = firstOf(local, ['filePath', 'file_path']) ?? firstOf(record, ['filePath', 'file_path', 'desktop_path']);
    const dataUrl = firstOf(local, ['dataUrl']) ?? firstOf(cloud, ['dataUrl']) ?? firstOf(record, ['data_url', 'dataUrl']);
    const url = firstOf(cloud, ['url']) ?? firstOf(record, ['previewUrl', 'preview_url']);
    if (type === 'image' || String(mime).startsWith('image/')) {
      parts.push({ image: { mime, ...(typeof dataUrl === 'string' && dataUrl.startsWith('data:') ? { data: dataUrl } : {}), ...(file ? { path: file } : {}), ...(!file && url ? { url } : {}) } });
    } else parts.push({ file: { name: String(name), ...(file ? { path: file } : {}), mime } });
  }
  return parts;
}

/**
 * Display messages ({...data_json, source} in row order) → items. Exported for the tests and for the bridge-side
 * readers that mirror mcode's replay.
 */
export function itemsOfMessages(messages) {
  const list = new ItemList();
  let model = null;
  messages.forEach((message, index) => {
    if (!isRecord(message)) return;
    const role = message.role, kind = message.kind ?? message.displayKind, ts = message.timestamp ?? message.created_at ?? message.createdAtMs;
    const rowKey = message.msg_id ?? index;
    if (kind === 'fork-origin' || Number(message.msg_type) === 3) return;
    if (kind === 'compaction') { list.push('compaction', { ts, compaction: { summary: null } }); return; }
    if (kind === 'compaction_start' || kind === 'compaction_failed') return;
    const text = typeof message.msg_content === 'string' ? message.msg_content : typeof message.content === 'string' ? message.content : '';
    if (typeof kind === 'string' && kind.startsWith('review_')) { if (text.trim()) list.push('injected', { ts, parts: [{ text }] }); return; }
    if (role === 'user') {
      if (isInjectedSource(message.source) || kind === 'background-task-terminal' || isInjectedText('minimax', text)) { list.push('injected', { ts, parts: [{ text }] }); return; }
      list.push('user', { ts, parts: [...(text ? [{ text }] : []), ...attachmentParts(message.attachments)] });
      return;
    }
    if (role !== 'assistant') return;
    if (typeof message.model === 'string' && message.model) model = message.model;
    // Ordered parts when a message carries them (stream-events.ts:463-494), else thinking, text, then its tool calls.
    const parts = Array.isArray(message.parts) ? message.parts.filter(isRecord) : [];
    if (parts.length) {
      parts.forEach((part, at) => {
        const type = part.type ?? part.kind;
        if (type === 'thinking' || type === 'cognitive_text') { const value = firstOf(part, ['content', 'text', 'thinking']); if (typeof value === 'string') list.push('reasoning', { ts, reasoning: { text: value } }); }
        else if (type === 'text') { const value = firstOf(part, ['content', 'text']); if (typeof value === 'string') list.push('assistant', { ts, parts: [{ text: value }] }); }
        else if (type === 'tool' || type === 'tool_call' || type === 'toolCall') { const call = toolCallOf(isRecord(part.toolCall ?? part.tool_call) ? (part.toolCall ?? part.tool_call) : part); if (call) pushTool(list, call, ts, rowKey, at); }
      });
      return;
    }
    const thinking = firstOf(message, ['thinking_content', 'thinkingContent', 'thinking']);
    if (typeof thinking === 'string' && thinking.trim()) list.push('reasoning', { ts, reasoning: { text: thinking } });
    // Runtime-authored text (a failed model call's notice, agent-message.ts:166-168) is not the model's reply.
    if (text) list.push(message.msg_content_source === 'system_error' ? 'injected' : 'assistant', { ts, parts: [{ text }] });
    const calls = firstOf(message, ['tool_calls', 'toolCalls']);
    (Array.isArray(calls) ? calls : []).forEach((record, at) => { const call = isRecord(record) ? toolCallOf(record) : null; if (call) pushTool(list, call, ts, rowKey, at); });
  });
  return { items: list.items, model };
}

/**
 * The display messages of one session in row order (the legacy array when it has no rows); the rows within a
 * per-session budget (shared.mjs takeRows: streamed newest first, so a capped read keeps the end; `budget.capped`).
 */
export function readDisplayMessages(db, sessionId, budget = rowBudget()) {
  if (tableColumns(db, 'local_runtime_message_rows').size) {
    const rows = takeRows(db.prepare('SELECT id, msg_id, role, source, created_at_ms, data_json FROM local_runtime_message_rows WHERE session_id = ? ORDER BY id DESC'), [sessionId], budget).reverse();
    if (rows.length) {
      return rows.map(row => {
        const data = json(row.data_json);
        return { ...data, role: data.role ?? row.role ?? undefined, msg_id: data.msg_id ?? row.msg_id, timestamp: data.timestamp ?? data.created_at ?? row.created_at_ms, ...(row.source ? { source: row.source } : {}) };
      });
    }
  }
  return legacyDisplay(db, tableColumns(db, 'local_runtime_messages').size > 0, sessionId);
}

export async function read(target, ctx = {}) {
  const sourceId = typeof target === 'string' ? (target.startsWith('minimax:') ? target.slice('minimax:'.length) : target) : target?.sourceId;
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) summary = (await list({ ...ctx, includeSubagents: true })).find(entry => entry.sourceId === sourceId) ?? null;
  if (!summary) throw new Error('MiniMax Code session not found.');
  if (!(await statOf(summary.sourcePath))) throw new Error('The MiniMax Code database is gone.');
  const db = await openDatabase(summary.sourcePath);
  if (!db) throw new Error('The MiniMax Code database could not be opened.');
  try {
    const budget = rowBudget(ctx.readBudget);
    const { items, model } = itemsOfMessages(readDisplayMessages(db, summary.sourceId, budget));
    const warnings = items.some(item => item.kind === 'compaction') ? ['MiniMax Code keeps no summary text with its compaction marker; the summary is not included.'] : [];
    if (budget.capped) warnings.push(SESSION_CAPPED_WARNING);
    return makeSession({ ...summary, model: summary.model || model }, items, warnings);
  } finally { closeDatabase(db); }
}
