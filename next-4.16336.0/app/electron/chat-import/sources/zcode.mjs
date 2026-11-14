// ZCode (Z.ai, github.com/zai-org/ZCode): the CLI agent's session database ~/.zcode/cli/db/db.sqlite. Read from the
// writer's source (apps/zcode-cli/packages/adapters/src/storage/session-store/…) and the reader OpenClaude Desktop's own
// zcode-bridge uses (harness/packages/zcode-bridge/src/locate.js zcodePaths, usage.js storedMessages, history.js).
//
//   where    <base>/.zcode/cli/db/db.sqlite (paths.ts getDefaultSessionDbPath), base = ZCODE_DATA_BASE_DIR or the ZCode
//            app's "Data storage path" (~/.zcode/v2/setting.json dataBaseDir) else HOME; ~/.zcode/cli/config.json
//            storage.sessionDbPath overrides the file (bootstrap/src/app/session-store.ts getSessionDbPath). SQLite in
//            WAL, written by one agent process at a time: opened {readOnly:true} only.
//   session  (schema.baseline.sql :162-184; rows.ts SessionRow) id, parent_id, task_type (interactive | fork |
//            selection_side_chat | workflow_parent | workflow_child | subagent_child | nested_workflow_child:
//            contracts session-store.port.ts SESSION_TASK_TYPES), directory, title, title_source (default |
//            first_input | generated | custom), revert (JSON SessionRevert: a rewind's branch cut), time_created,
//            time_updated, time_archived, time_deleted (soft delete: listSessions skips it, sessions.ts :261).
//   message  (:93-99) id, session_id, sequence, time_created, data JSON MessageInfo minus id/sessionID (codecs.ts
//            decodeMessageRow; messages.ts saveMessage :38-101): user {time, agent, synthetic?, source?, visibility?
//            ('model-only'), semantics? {origin, kind, uiVisibility, providerVisibility}, summary? {title, body}
//            (a compaction summary: core compact-persistence.ts :311-365), metadata?}; assistant {time:{created,
//            completed}, modelId/providerId (legacy modelID/providerID), parentID, summary?, error?, finish, …}.
//            Read in `sequence is null, sequence, time_created, rowid` order (messages.ts messages() :233-240).
//   part     (:144-151) id, message_id, sequence, data JSON MessagePart minus ids, in `sequence is null, sequence,
//            time_created, id` order per message: text {text, synthetic?, ignored?} | reasoning {text} (plain) |
//            tool {callID, tool, state:{status pending|running|completed|error, input, output, error, metadata}} |
//            file {mime, url, filename} | subtask {prompt, description, agent} | compaction | timeline | agent |
//            retry | step-start | step-finish | snapshot | patch (contracts session-store.port.ts :433-799).
//   imports  ZCode's own imports (session/create importedHistory: Claude Code history, shared contexts) are ordinary
//            rows: a user / finished assistant message per imported message with one text part (server-operations.ts
//            persistImportedSessionHistory :1150-1233); a shared context is one model-only user message (injected).
// Sessions OpenClaude Desktop ran on its ZCode core live in this same database (the bridge's thread ids are ZCode
// session ids), so they are listed too; the bridge's prompt-inlined instructions block is injected context here.
import fs from 'node:fs';
import path from 'node:path';
import { ItemList, isRecord, makeSession, makeSummary, parseJson } from '../model.mjs';
import { SESSION_CAPPED_WARNING, closeDatabase, envOf, homeOf, isExcluded, openDatabase, rowBudget, tableColumns, takeMessages, takeRows } from './shared.mjs';

export const id = 'zcode';
export const label = 'ZCode';
// No local ZCode history to check against: the format comes from the upstream writer and the bridge's reader.
export const experimental = true;

const expand = (file, home) => (file === '~' ? home : file.startsWith('~/') ? path.join(home, file.slice(2)) : file);
const readJsonSync = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };

/** The ZCode data root and session database, as zcode-bridge locate.js zcodePaths finds them. */
export function zcodeDatabase(ctx = {}) {
  const home = homeOf(ctx), env = envOf(ctx);
  const setting = readJsonSync(path.join(home, '.zcode', 'v2', 'setting.json'))?.dataBaseDir;
  const moved = (typeof env.ZCODE_DATA_BASE_DIR === 'string' && env.ZCODE_DATA_BASE_DIR.trim())
    || (typeof setting === 'string' && setting.trim() && path.isAbsolute(expand(setting.trim(), home)) ? expand(setting.trim(), home) : '');
  const root = path.join(moved || home, '.zcode');
  const configured = readJsonSync(path.join(root, 'cli', 'config.json'))?.storage?.sessionDbPath;
  const custom = typeof configured === 'string' && configured.trim() ? expand(configured.trim(), home) : '';
  return { root, db: custom && path.isAbsolute(custom) ? custom : path.join(root, 'cli', 'db', 'db.sqlite') };
}
export const roots = ctx => [zcodeDatabase(ctx).db];

const json = text => { const value = parseJson(text); return isRecord(value) ? value : {}; };
const CHILD_TYPES = new Set(['workflow_child', 'subagent_child', 'nested_workflow_child', 'selection_side_chat']);
const isChildRow = row => CHILD_TYPES.has(row.task_type) || (!!row.parent_id && row.task_type !== 'fork' && row.task_type !== 'interactive');

// OpenClaude Desktop's zcode-bridge inlines developer instructions into the prompt in this tag (instructions.js).
const INSTRUCTIONS = /<code-desktop-instructions>[\s\S]*?<\/code-desktop-instructions>\s*/g;

/** Hidden-from-the-user context a user message carries (the bridge's history.js realUser / visible, inverted). */
function isInjectedUser(info) {
  const semantics = isRecord(info.semantics) ? info.semantics : null;
  if (semantics) {
    if (semantics.uiVisibility && semantics.uiVisibility !== 'visible') return true;
    if (!['real_user', 'import', 'migration'].includes(semantics.origin) && semantics.kind !== 'user_prompt' && semantics.kind !== 'slash_command') return true;
  }
  return info.synthetic === true || info.visibility === 'model-only' || info.source === 'background_task' || info.metadata?.source === 'background_task';
}
const isCompactSummary = info => info.role === 'user' && (info.semantics?.kind === 'compact_summary' || typeof info.summary?.body === 'string');
const modelOf = info => {
  const model = info.modelId ?? info.modelID, provider = info.providerId ?? info.providerID;
  return typeof model === 'string' && model ? (typeof provider === 'string' && provider ? `${provider}/${model}` : model) : null;
};

/**
 * The active branch after a rewind (the session row's revert), as zcode-bridge history.js activeMessages mirrors
 * ZCode's selectActiveConversationBranch: the kept prefix, then whatever was appended after the cut; the `/rewind`
 * acknowledgement reply is dropped.
 */
export function activeEntries(entries, revert) {
  let active = entries;
  const target = revert?.targetMessageID;
  if (target) {
    const indexOf = messageId => (messageId ? entries.findIndex(entry => entry.info.id === messageId) : -1);
    const byId = new Map(entries.map(entry => [entry.info.id, entry]));
    const targetIndex = indexOf(target);
    const keptIds = Array.isArray(revert.keptMessageIDs) ? revert.keptMessageIDs : null;
    const kept = keptIds ? keptIds.map(messageId => byId.get(messageId)).filter(Boolean) : targetIndex >= 0 ? entries.slice(0, targetIndex) : entries;
    if (revert.branchCutAfterMessageID) {
      const cut = indexOf(revert.branchCutAfterMessageID);
      active = cut >= 0 ? [...kept, ...entries.slice(cut + 1)] : kept;
    } else if (keptIds || targetIndex >= 0) {
      const created = indexOf(revert.createdMessageID);
      active = created >= 0 ? [...kept, ...entries.slice(created)] : kept;
    }
  }
  return active.filter(entry => !(entry.info.role === 'assistant' && !entry.parts.some(part => part.type === 'tool')
    && /(?:^|\n)Rewound conversation to before message \S+\.$/.test(entry.parts.filter(part => part.type === 'text').map(part => part.text ?? '').join('').trim())));
}

function filePart(part) {
  const url = String(part.url ?? ''), mime = String(part.mime ?? '');
  const local = url.startsWith('file://') ? decodeURIComponent(url.slice(7)) : url.startsWith('/') ? url : null;
  if (mime.startsWith('image/')) return { image: { mime, ...(url.startsWith('data:') ? { data: url } : local ? { path: local } : { url }) } };
  return { file: { name: part.filename ?? (path.basename(local ?? url) || 'file'), ...(mime ? { mime } : {}), ...(local ? { path: local } : {}) } };
}

/** [{info, parts}] (decoded rows, active branch, in order) → { items, model }. */
export function itemsOf(entries) {
  const list = new ItemList();
  let model = null;
  for (const { info, parts } of entries) {
    const ts = info.time?.created;
    const texts = parts.filter(part => part.type === 'text' && !part.ignored).map(part => part.text ?? '').filter(Boolean);
    if (info.role === 'user') {
      if (isCompactSummary(info)) { list.push('compaction', { ts, compaction: { summary: (info.summary?.body || texts.join('\n')) || null } }); continue; }
      if (isInjectedUser(info)) { list.push('injected', { ts, parts: texts.map(text => ({ text })) }); continue; }
      const userParts = [];
      for (const part of parts) {
        if (part.type === 'text' && !part.ignored) {
          const text = String(part.text ?? '');
          const blocks = text.match(INSTRUCTIONS);
          if (part.synthetic) { list.push('injected', { ts, parts: [{ text }] }); continue; }
          if (blocks) list.push('injected', { ts, parts: blocks.map(block => ({ text: block.trim() })) });
          const typed = blocks ? text.replace(INSTRUCTIONS, '').trim() : text;
          if (typed) userParts.push({ text: typed });
        } else if (part.type === 'file') userParts.push(filePart(part));
      }
      if (userParts.length) list.push('user', { ts, parts: userParts });
      continue;
    }
    if (info.role !== 'assistant') continue;
    model = modelOf(info) ?? model;
    const hidden = info.semantics?.uiVisibility && info.semantics.uiVisibility !== 'visible';
    if (info.summary === true) { list.push('compaction', { ts, compaction: { summary: texts.join('\n') || null } }); continue; }
    for (const part of parts) {
      const at = part.time?.start ?? ts;
      switch (part.type) {
        case 'text':
          if (part.ignored || !part.text) break;
          if (part.synthetic || hidden) list.push('injected', { ts: at, parts: [{ text: part.text }] });
          else list.push('assistant', { ts: at, parts: [{ text: part.text }] });
          break;
        case 'reasoning': list.push('reasoning', { ts: at, reasoning: { text: part.text ?? '' } }); break;
        case 'tool': {
          const state = isRecord(part.state) ? part.state : {};
          const callId = part.callID ?? part.callId ?? part.id;
          const started = state.time?.start ?? ts;
          list.toolCall({ callId, name: part.tool, raw: isRecord(state.input) ? state.input : (state.raw ?? {}), ts: started });
          if (state.status === 'completed' || state.status === 'error') {
            const text = state.status === 'error' ? (typeof state.error === 'string' ? state.error : JSON.stringify(state.error ?? '')) : typeof state.output === 'string' ? state.output : JSON.stringify(state.output ?? '');
            list.toolResult({ callId, text, isError: state.status === 'error', ts: state.time?.end ?? started });
          }
          break;
        }
        case 'subtask': list.push('subagent_ref', { ts: at, parts: [{ text: `Sub-agent ${part.agent ?? ''}: ${part.description ?? part.prompt ?? ''}`.trim() }], ref: { agent: part.agent ?? null } }); break;
        default: break; // compaction (the summary is its own user message), timeline, agent, retry, step-*, snapshot, patch
      }
    }
  }
  return { items: list.items, model };
}

// How many of a session's first user messages are looked at for its first prompt (injected context comes first).
const FIRST_PROMPT_CANDIDATES = 40;

/**
 * Per session, from ONE pass over the message table in its own index order (message_session_sequence_idx: session_id,
 * sequence, time_created, id — no sort, no per-session query): the user / assistant message count, the newest
 * assistant model and the first user message ids. ZCode's order (messages.ts messages() :233-240) puts rows with no
 * sequence last; the index puts them first, so they are kept apart and count as later.
 */
function sessionFacts(db) {
  const facts = new Map();
  const rows = db.prepare(`SELECT session_id AS sid, id, sequence IS NULL AS late, json_extract(data, '$.role') AS role,
    coalesce(json_extract(data, '$.modelId'), json_extract(data, '$.modelID')) AS model,
    coalesce(json_extract(data, '$.providerId'), json_extract(data, '$.providerID')) AS provider
    FROM message ORDER BY session_id, sequence, time_created, id`);
  for (const row of rows.iterate()) {
    if (row.role !== 'user' && row.role !== 'assistant') continue;
    let fact = facts.get(row.sid);
    if (!fact) facts.set(row.sid, fact = { count: 0, model: null, lateModel: null, users: [], lateUsers: [] });
    fact.count += 1;
    if (row.role === 'assistant' && typeof row.model === 'string' && row.model) {
      const model = typeof row.provider === 'string' && row.provider ? `${row.provider}/${row.model}` : row.model;
      if (row.late) fact.lateModel = model; else fact.model = model;
    } else if (row.role === 'user') {
      const list = row.late ? fact.lateUsers : fact.users;
      if (list.length < FIRST_PROMPT_CANDIDATES) list.push(row.id);
    }
  }
  return facts;
}
/** The first typed prompt among a session's first user messages: each message by primary key, its parts by index. */
function firstPromptOf(db, fact) {
  try {
    const message = db.prepare('SELECT data FROM message WHERE id = ?');
    const parts = db.prepare('SELECT data FROM part WHERE message_id = ? ORDER BY sequence IS NULL, sequence, time_created, id');
    for (const messageId of [...fact.users, ...fact.lateUsers].slice(0, FIRST_PROMPT_CANDIDATES)) {
      const info = json(message.get(messageId)?.data);
      if (isCompactSummary(info) || isInjectedUser(info)) continue;
      for (const row of parts.iterate(messageId)) {
        const part = json(row.data);
        if (part.type !== 'text' || part.synthetic || part.ignored) continue;
        const text = String(part.text ?? '').replace(INSTRUCTIONS, '').trim();
        if (text) return text;
      }
    }
  } catch {}
  return '';
}

function summaryOf(db, row, file, facts) {
  const fact = facts.get(row.id);
  if (!fact?.count) return null;
  const child = isChildRow(row);
  return makeSummary('zcode', row.id, {
    sourcePath: file, title: row.title_source === 'default' ? '' : (row.title ?? ''), firstPrompt: firstPromptOf(db, fact),
    cwd: row.directory || row.path || null, model: fact.model ?? fact.lateModel, createdAt: row.time_created, updatedAt: row.time_updated,
    archived: !!row.time_archived, parentId: row.parent_id ?? null, isSubagent: child, messageCount: fact.count, experimental,
    extra: { taskType: row.task_type ?? 'interactive' },
  });
}

export async function list(ctx = {}) {
  const warn = message => ctx.warn?.('zcode', message);
  const file = zcodeDatabase(ctx).db;
  if (isExcluded(file, ctx.exclude)) return [];
  const db = await openDatabase(file, warn);
  if (!db) return [];
  const out = [];
  try {
    const columns = tableColumns(db, 'session');
    if (!columns.has('id') || !tableColumns(db, 'message').has('data')) { warn('db.sqlite: no ZCode session tables'); return []; }
    const deleted = columns.has('time_deleted') ? 'WHERE time_deleted IS NULL' : '';
    const facts = sessionFacts(db);
    for (const row of db.prepare(`SELECT * FROM session ${deleted} ORDER BY time_updated DESC, id DESC`).iterate()) {
      if (isChildRow(row) && !ctx.includeSubagents) continue;
      const summary = summaryOf(db, row, file, facts);
      if (summary && (summary.title || summary.firstPrompt)) out.push(summary);
    }
  } catch (error) { warn(`db.sqlite: ${error?.message || error}`); } finally { closeDatabase(db); }
  return out;
}

export async function read(target, ctx = {}) {
  const sourceId = typeof target === 'string' ? (target.startsWith('zcode:') ? target.slice(6) : target) : target?.sourceId;
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) summary = (await list({ ...ctx, includeSubagents: true })).find(entry => entry.sourceId === sourceId) ?? null;
  if (!summary) throw new Error('ZCode session not found.');
  const db = await openDatabase(summary.sourcePath);
  if (!db) throw new Error('The ZCode session database could not be opened.');
  try {
    const row = db.prepare('SELECT revert FROM session WHERE id = ?').get(summary.sourceId);
    // Within a per-session budget (shared.mjs takeMessages): messages newest first (ZCode's order reversed), each with
    // its parts through part_message_sequence_idx, so a capped read keeps the end of the conversation.
    const budget = rowBudget(ctx.readBudget);
    const parts = db.prepare('SELECT data FROM part WHERE message_id = ? ORDER BY sequence IS NULL, sequence, time_created, id');
    const rows = takeMessages(db.prepare('SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY sequence IS NULL DESC, sequence DESC, time_created DESC, rowid DESC'), [summary.sourceId], budget,
      message => takeRows(parts, [message.id], budget));
    const entries = rows.map(({ row: message, parts: found }) => {
      const info = json(message.data);
      return { info: { ...info, id: message.id, time: { created: message.time_created, ...(isRecord(info.time) ? info.time : {}) } }, parts: found.map(part => json(part.data)) };
    });
    const { items, model } = itemsOf(activeEntries(entries, row?.revert ? json(row.revert) : null));
    return makeSession({ ...summary, model: summary.model || model }, items, budget.capped ? [SESSION_CAPPED_WARNING] : []);
  } finally { closeDatabase(db); }
}
