// OpenCode: read from the code that WRITES its sessions — anomalyco/opencode HEAD 2.2.5 (packages/core, packages/schema,
// packages/cli; the 2.2.5 release has the same files) and, for 1.x, the same tables as its fork MiMo Code inherits
// (XiaomiMiMo/MiMo-Code packages/cli/src/session/session.sql.ts). OpenClaude Desktop pins OpenCode 1.18.34
// (cores/opencode.mjs release) and its OpenCode 2.x core (opencode-bridge v2) runs 2.2.5; a user may run either.
//
//   where    <data> = $XDG_DATA_HOME/opencode (~/.local/share/opencode); the database is $OPENCODE_DB (absolute, or a name
//            under <data>; ":memory:" none), else opencode.db for release channels and opencode-<channel>.db otherwise
//            (cli/src/database-path.ts:4-12); 2.x pre-releases left opencode-next.db, which 2.x imports
//            (core/src/database/v1-migration.bun.ts:799-803). Every <data>/opencode*.db is read; 1.18.34 and 2.x share
//            opencode.db (2.x migrates it in place). OpenClaude's own 2.x core keeps its database at
//            <state>/opencode-v2/opencode.db (opencode-bridge v2/db.js v2Paths): never read (isBridgeState; callers may
//            also pass it in `exclude`).
//   1.x      session(id, project_id, parent_id, directory, title, version, model, time_*); message(id, session_id,
//            time_created, data: Info {role, time, modelID, providerID, summary?, path}) in (time_created, id) order;
//            part(id, message_id, session_id, data: {type: text {synthetic, ignored} | reasoning | tool {callID, tool,
//            state {status, input, output | error, metadata}} | file {mime, url, filename} | compaction | subtask |
//            step-* | snapshot | patch}) by id. A compaction is a user message with a compaction part; its summary is
//            the next assistant message with info.summary true.
//   2.x      session_v2 (core/src/session/sql.ts:28, the 2.x session table; the 1.x `session` rows are copied into it
//            and left as they were, v1-migration.bun.ts:619,674), session_message(session_id, type, seq, data) in seq
//            order (sql.ts:86) — the eleven SessionMessage types (schema/src/session-message.ts) — and session_part
//            (sql.ts:107): a newer 2.x moves an assistant row's content there, leaving data.content [] in the row
//            (core/src/session/projector.ts:316-324); reads put the rows back by ordinal (core/src/session/history.ts
//            :89-120 withParts). Legacy field names (state → native, …) don't touch text (schema/src/session-legacy.ts).
//            1.18 already has an (unused) session_message table beside `session`: a session with rows there is read
//            from them, otherwise from message/part.
//   older    <data>/storage/{session/<project>/<id>.json, message/<session>/<id>.json, part/<message>/<id>.json}, the
//            pre-SQLite layout its JSON migration reads (MiMo storage/json-migration.ts:117-124, from upstream): the 1.x
//            shapes, one file each; a session also in a database is read from the database.
import path from 'node:path';
import { ItemList, isRecord, makeSession, makeSummary, parseJson, textOfBlocks } from '../model.mjs';
import { SESSION_CAPPED_WARNING, closeDatabase, envOf, findFiles, homeOf, isExcluded, listDir, openDatabase, readJsonFile, rowBudget, takeMessages, takeRows } from './shared.mjs';

export const id = 'opencode';
export const label = 'OpenCode';
export const experimental = false;

const json = text => { const value = parseJson(text); return isRecord(value) ? value : {}; };
const xdgData = ctx => envOf(ctx).XDG_DATA_HOME || path.join(homeOf(ctx), '.local', 'share');
const dataDir = ctx => path.join(xdgData(ctx), 'opencode');

/** OpenClaude Desktop's own bridge state (<userData>/cores/<id>/state, its 2.x database folder): never a source. */
export const isBridgeState = file => /[\\/]opencode-v2[\\/]opencode\.db$/.test(file) || /[\\/]cores[\\/](opencode|mimo)[\\/]state([\\/]|$)/.test(file);

/** $<APP>_DB as the agent resolves it (an absolute path, or a name under the data folder; ":memory:" none). */
export function envDatabase(value, dir) {
  if (typeof value !== 'string' || !value || value === ':memory:') return null;
  return path.isAbsolute(value) ? value : path.resolve(dir, value);
}
/** The databases of one data folder: the env override, then every <prefix>.db / <prefix>-<channel>.db in it. */
export async function databaseFiles(dir, { prefix, envValue }) {
  const pattern = new RegExp(`^${prefix}(-[A-Za-z0-9._-]+)?\\.db$`);
  const found = (await listDir(dir)).filter(entry => entry.isFile() && pattern.test(entry.name)).map(entry => path.join(dir, entry.name))
    .sort((a, b) => (path.basename(a) === `${prefix}.db` ? -1 : 0) - (path.basename(b) === `${prefix}.db` ? -1 : 0) || a.localeCompare(b));
  return [...new Set([envDatabase(envValue, dir), ...found].filter(Boolean))].filter(file => !isBridgeState(file));
}
const databases = ctx => databaseFiles(dataDir(ctx), { prefix: 'opencode', envValue: envOf(ctx).OPENCODE_DB });
export const roots = ctx => [...new Set([envDatabase(envOf(ctx).OPENCODE_DB, dataDir(ctx)), path.join(dataDir(ctx), 'opencode.db'), path.join(dataDir(ctx), 'storage')].filter(Boolean))];

// ---- database listing (shared with MiMo Code, sources/mimo.mjs) -------------------------------------------------
/** The database's tables; `strict` lets "file is not a database" through (the listing warns about it). */
export function tablesOf(db, { strict = false } = {}) {
  try { return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name)); } catch (error) { if (strict) throw error; return new Set(); }
}
const columnsOf = (db, table) => { try { return new Set(db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map(row => row.name)); } catch { return new Set(); } };
/** MiMo keeps its background actors' turns in the parent session as other message slices (message.agent_id). */
const mainSlice = db => columnsOf(db, 'message').has('agent_id') ? " AND (agent_id IS NULL OR agent_id = 'main')" : '';
const counts = (db, sql) => { const out = new Map(); try { for (const row of db.prepare(sql).all()) out.set(row.session_id, Number(row.n) || 0); } catch {} return out; };

/** Session rows: 2.x session_v2 first, then 1.x `session` rows it doesn't have (a database 2.x never opened). */
function sessionRows(db, tables) {
  const rows = [], seen = new Set();
  for (const table of ['session_v2', 'session']) {
    if (!tables.has(table)) continue;
    try { for (const row of db.prepare(`SELECT * FROM ${table}`).all()) if (row?.id && !seen.has(row.id)) { seen.add(row.id); rows.push(row); } } catch {}
  }
  return rows;
}
function firstPromptV1(db, sessionId, slice) {
  try {
    const rows = db.prepare(`SELECT p.data AS data, m.data AS info FROM part p JOIN message m ON p.message_id = m.id
      WHERE m.session_id = ?${slice.replace(/agent_id/g, 'm.agent_id')} AND json_extract(m.data, '$.role') = 'user' ORDER BY m.time_created, m.id, p.id LIMIT 12`).all(sessionId);
    for (const row of rows) {
      if (injectedUser(json(row.info))) continue;
      const part = json(row.data);
      if (part.type === 'text' && !part.synthetic && !part.ignored && part.text) return part.text;
    }
  } catch {}
  return '';
}
function firstPromptV2(db, sessionId, boundary) {
  try {
    const row = boundary === undefined
      ? db.prepare("SELECT data FROM session_message WHERE session_id = ? AND type = 'user' ORDER BY seq LIMIT 1").get(sessionId)
      : db.prepare("SELECT data FROM session_message WHERE session_id = ? AND type = 'user' AND seq < ? ORDER BY seq LIMIT 1").get(sessionId, boundary);
    return row ? json(row.data).text ?? '' : '';
  } catch { return ''; }
}
function stagedBoundary(db, sessionId, revert) {
  const messageID = json(revert).messageID;
  return typeof messageID === 'string'
    ? db.prepare('SELECT seq FROM session_message WHERE session_id = ? AND id = ?').get(sessionId, messageID)?.seq
    : undefined;
}
const modelOf = value => {
  if (typeof value !== 'string' || !value) return null;
  if (!value.startsWith('{')) return value;
  const model = json(value);
  return model.id ? (model.providerID ? `${model.providerID}/${model.id}` : model.id) : null;
};

/**
 * The SessionSummaries of one database. `source` names them (opencode | mimo); `extra(row)` adds per-row fields.
 * Sessions with no conversation are left out; sub-agent (parent_id) sessions only with includeSubagents.
 */
export function listDatabase(db, file, ctx, { source = 'opencode', extra } = {}) {
  const tables = tablesOf(db, { strict: true });
  const slice = tables.has('message') ? mainSlice(db) : '';
  const v2 = tables.has('session_message') ? counts(db, "SELECT session_id, count(*) AS n FROM session_message WHERE type IN ('user', 'assistant') GROUP BY session_id") : new Map();
  const v1 = tables.has('message') ? counts(db, `SELECT session_id, count(*) AS n FROM message WHERE 1 = 1${slice} GROUP BY session_id`) : new Map();
  const out = [];
  for (const row of sessionRows(db, tables)) {
    if (row.parent_id && !ctx.includeSubagents) continue;
    const schema = v2.get(row.id) ? 2 : v1.get(row.id) ? 1 : 0;
    if (!schema) continue;
    const boundary = schema === 2 ? stagedBoundary(db, row.id, row.revert) : undefined;
    const messageCount = boundary === undefined ? (schema === 2 ? v2.get(row.id) : v1.get(row.id))
      : db.prepare("SELECT count(*) AS n FROM session_message WHERE session_id = ? AND seq < ? AND type IN ('user', 'assistant')").get(row.id, boundary).n;
    if (!messageCount) continue;
    out.push(makeSummary(source, row.id, {
      sourcePath: file, title: row.title ?? '', firstPrompt: schema === 2 ? firstPromptV2(db, row.id, boundary) : firstPromptV1(db, row.id, slice),
      cwd: row.directory || null, model: modelOf(row.model), createdAt: row.time_created, updatedAt: row.time_updated,
      archived: !!row.time_archived, parentId: row.parent_id ?? null, isSubagent: !!row.parent_id,
      messageCount, extra: { schema, ...(extra?.(row) ?? {}) },
    }));
  }
  return out;
}

/**
 * The items of one session of an open database (2.x rows when it has any, else 1.x message/part), read within a
 * per-session budget (shared.mjs takeMessages: streamed, at most SESSION_MAX_ROWS rows / SESSION_MAX_BYTES):
 * messages newest first, each with its parts through their index (session_part primary key (message_id, ordinal);
 * part_message_id_id_idx), so a capped read keeps the end of the conversation. { items, model, warnings }.
 */
export function readDatabase(db, sessionId, { budget = rowBudget() } = {}) {
  const tables = tablesOf(db);
  const done = parsed => ({ ...parsed, warnings: budget.capped ? [SESSION_CAPPED_WARNING] : [] });
  const has2 = tables.has('session_message') && !!db.prepare('SELECT 1 FROM session_message WHERE session_id = ? LIMIT 1').get(sessionId);
  if (has2) {
    const revert = tables.has('session_v2') && columnsOf(db, 'session_v2').has('revert')
      ? db.prepare('SELECT revert FROM session_v2 WHERE id = ?').get(sessionId)?.revert
      : null;
    const boundary = stagedBoundary(db, sessionId, revert);
    const parts = tables.has('session_part') ? db.prepare('SELECT data FROM session_part WHERE message_id = ? ORDER BY ordinal') : null;
    const rows = takeMessages(db.prepare(`SELECT id, type, seq, time_created, data FROM session_message WHERE session_id = ?${boundary === undefined ? '' : ' AND seq < ?'} ORDER BY seq DESC`),
      boundary === undefined ? [sessionId] : [sessionId, boundary], budget,
      row => (parts && row.type === 'assistant' ? takeRows(parts, [row.id], budget) : []));
    return done(itemsOfV2(rows.map(({ row, parts: found }) => {
      const data = json(row.data);
      if (row.type === 'assistant' && found.length && 'content' in data) data.content = found.map(part => json(part.data));
      return { ...data, id: row.id, type: row.type, time_created: row.time_created };
    })));
  }
  if (!tables.has('message')) return done({ items: [], model: null });
  const slice = mainSlice(db);
  const parts = tables.has('part') ? db.prepare('SELECT data FROM part WHERE message_id = ? ORDER BY id') : null;
  const rows = takeMessages(db.prepare(`SELECT id, time_created, data FROM message WHERE session_id = ?${slice} ORDER BY time_created DESC, id DESC`), [sessionId], budget,
    row => (parts ? takeRows(parts, [row.id], budget) : []));
  return done(itemsOfV1(rows.map(({ row, parts: found }) => {
    const info = json(row.data);
    return { info: { ...info, id: row.id, time: { created: row.time_created, ...info.time } }, parts: found.map(part => json(part.data)) };
  })));
}

// ---- storage/ (pre-SQLite JSON) ----------------------------------------------------------------------------------
/**
 * An id that may name a folder under storage/ (OpenCode's ids: ses_ / msg_ / prt_ + base62, id/id.ts): one path
 * segment, never `..`, a separator or a NUL, so a file's own `id` field (or a key the page sends) can't lead a read
 * outside storage/<kind>/.
 */
export const safeStorageId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value);
export async function storageSessions(dir, source, ctx) {
  const root = path.join(dir, 'storage');
  const files = await findFiles(path.join(root, 'session'), name => name.endsWith('.json'), { depth: 2 });
  const out = [];
  for (const file of files) {
    const info = await readJsonFile(file);
    if (!safeStorageId(info?.id)) continue;
    if (info.parentID && !ctx.includeSubagents) continue;
    const messages = (await listDir(path.join(root, 'message', info.id))).filter(entry => entry.name.endsWith('.json'));
    if (!messages.length) continue;
    out.push(makeSummary(source, info.id, {
      sourcePath: file, title: info.title ?? '', cwd: info.directory ?? null, createdAt: info.time?.created, updatedAt: info.time?.updated,
      archived: !!info.time?.archived, parentId: info.parentID ?? null, isSubagent: !!info.parentID, messageCount: messages.length, extra: { schema: 0 },
    }));
  }
  return out;
}
export async function readStorage(dir, sessionId) {
  if (!safeStorageId(sessionId)) throw new Error('Not a session id.');
  const root = path.join(dir, 'storage');
  const messageFiles = await findFiles(path.join(root, 'message', sessionId), name => name.endsWith('.json'), { depth: 0 });
  const entries = [];
  for (const file of messageFiles) {
    const info = await readJsonFile(file);
    if (!safeStorageId(info?.id) || (info.agentID && info.agentID !== 'main')) continue;
    const partFiles = (await findFiles(path.join(root, 'part', info.id), name => name.endsWith('.json'), { depth: 0 })).sort();
    const parts = [];
    for (const partFile of partFiles) { const part = await readJsonFile(partFile); if (part) parts.push(part); }
    entries.push({ info, parts });
  }
  entries.sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0) || String(a.info.id).localeCompare(String(b.info.id)));
  return itemsOfV1(entries);
}

/** Every session of one agent's data folder: its databases, then storage/ sessions no database has. */
export async function listAll(ctx, { source, dir, files, extra }) {
  const warn = message => ctx.warn?.(source, message);
  const out = [];
  for (const file of files) {
    if (isExcluded(file, ctx.exclude)) continue;
    const db = await openDatabase(file, warn);
    if (!db) continue;
    try { out.push(...listDatabase(db, file, ctx, { source, extra: extra ? row => extra(row, db) : undefined })); } catch (error) { warn(`${path.basename(file)}: ${error?.message || error}`); } finally { closeDatabase(db); }
  }
  const known = new Set(out.map(summary => summary.sourceId));
  for (const summary of await storageSessions(dir, source, ctx).catch(() => [])) {
    if (known.has(summary.sourceId) || isExcluded(summary.sourcePath, ctx.exclude)) continue;
    out.push(summary);
  }
  return out;
}
/** One session (a summary, or a `<source>:<id>` key / bare id looked up in the listing) → ImportedSession. */
export async function readAny(target, ctx, { source, dir, list, name }) {
  const sourceId = typeof target === 'string' ? (target.startsWith(`${source}:`) ? target.slice(source.length + 1) : target) : target?.sourceId;
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) summary = (await list({ ...ctx, includeSubagents: true })).find(entry => entry.sourceId === sourceId) ?? null;
  if (!summary) throw new Error(`${name} session not found.`);
  if (summary.schema === 0 || summary.sourcePath.endsWith('.json')) {
    const { items, model } = await readStorage(dir, summary.sourceId);
    return makeSession({ ...summary, model: summary.model || model }, items);
  }
  if (isBridgeState(summary.sourcePath)) throw new Error(`${name} session not found.`);
  const db = await openDatabase(summary.sourcePath);
  if (!db) throw new Error(`The ${name} database could not be opened.`);
  try {
    const parsed = readDatabase(db, summary.sourceId);
    return makeSession({ ...summary, model: summary.model || parsed.model }, parsed.items, parsed.warnings);
  } finally { closeDatabase(db); }
}

export async function list(ctx = {}) {
  return listAll(ctx, { source: id, dir: dataDir(ctx), files: await databases(ctx) });
}
export async function read(target, ctx = {}) {
  return readAny(target, ctx, { source: id, dir: dataDir(ctx), list, name: label });
}

// ---- 1.x message/part → items ------------------------------------------------------------------------------------
function filePart(part) {
  const mime = part.mime ?? '';
  if (/^image\//.test(mime)) return { image: { mime, ...(String(part.url ?? '').startsWith('data:') ? { data: part.url } : { url: part.url }) } };
  return { file: { name: part.filename ?? path.basename(String(part.url ?? 'file')), mime: mime || undefined, ...(String(part.url ?? '').startsWith('file://') ? { path: decodeURI(part.url.slice(7)) } : {}) } };
}
function toolItems(list, part, ts) {
  const state = isRecord(part.state) ? part.state : {};
  list.toolCall({ callId: part.callID ?? part.id, name: part.tool, raw: state.input ?? {}, ts });
  if (state.status === 'completed' || state.status === 'error') {
    const text = state.status === 'error' ? (typeof state.error === 'string' ? state.error : JSON.stringify(state.error ?? '')) : typeof state.output === 'string' ? state.output : textOfBlocks(state.content);
    const exitCode = Number.isFinite(state.metadata?.exit) ? state.metadata.exit : undefined;
    list.toolResult({ callId: part.callID ?? part.id, text, isError: state.status === 'error' || (exitCode ?? 0) !== 0, exitCode, ts });
  }
}
/**
 * A user message the harness wrote, not the person: MiMo's inbox deliveries from an actor or a plugin hook carry
 * provenance (message-v2.ts:518-547 HookProvenance | MachineProvenance | AgentProvenance).
 */
const injectedUser = info => info.role === 'user' && isRecord(info.provenance);
/** [{info, parts}] (1.x shapes, oldest first) → items. Also MiMo's additions (its message-v2.ts is the 1.x schema). */
export function itemsOfV1(entries) {
  const list = new ItemList();
  let model = null, pendingCompaction = null;
  for (const { info, parts } of entries) {
    const ts = info.time?.created, role = info.role;
    if (role === 'assistant' && info.modelID) model = info.providerID ? `${info.providerID}/${info.modelID}` : info.modelID;
    if (role === 'assistant' && info.summary === true) {
      const summary = parts.filter(part => part.type === 'text' && !part.ignored).map(part => part.text).join('\n');
      if (pendingCompaction) pendingCompaction.compaction.summary ||= summary || null;
      else list.push('compaction', { ts, compaction: { summary: summary || null } });
      pendingCompaction = null;
      continue;
    }
    // MiMo's checkpoint boundary (session/checkpoint.ts:1735-1765): a user message holding a checkpoint part and the
    // synthetic index text of what it covers, which stands in for the history before it.
    const checkpoint = role === 'user' && parts.some(part => part.type === 'checkpoint');
    if (checkpoint) {
      const summary = parts.filter(part => part.type === 'text' && part.synthetic && !part.ignored && part.text).map(part => part.text).join('\n');
      list.push('compaction', { ts, compaction: { summary: summary || null } });
      continue;
    }
    const injected = injectedUser(info);
    const userParts = [];
    for (const part of parts) {
      switch (part.type) {
        case 'text':
          if (part.ignored) break;
          if (part.synthetic || injected) list.push('injected', { ts, parts: [{ text: part.text ?? '' }] });
          else if (role === 'user') userParts.push({ text: part.text ?? '' });
          else list.push('assistant', { ts, parts: [{ text: part.text ?? '' }] });
          break;
        case 'file': if (role === 'user' && !injected) userParts.push(filePart(part)); break;
        case 'reasoning': list.push('reasoning', { ts, reasoning: { text: part.text ?? '' } }); break;
        case 'tool': toolItems(list, part, ts); break;
        // MiMo's compaction part carries the summary it projected (message-v2.ts:323,330 projection.summary); 1.x's is
        // filled from the summary message that follows.
        case 'compaction': {
          const summary = typeof part.projection?.summary === 'string' && part.projection.summary ? part.projection.summary : typeof part.summary === 'string' && part.summary ? part.summary : null;
          pendingCompaction = list.push('compaction', { ts, compaction: { summary } });
          break;
        }
        case 'subtask': list.push('subagent_ref', { ts, parts: [{ text: `Sub-agent ${part.agent ?? ''}: ${part.description ?? part.prompt ?? ''}`.trim() }], ref: { agent: part.agent ?? null } }); break;
        // agent (an @agent mention, also in the text), step-start / step-finish, snapshot, patch, retry: no conversation.
        default: break;
      }
    }
    if (userParts.length) list.push('user', { ts, parts: userParts });
  }
  return { items: list.items, model };
}

// ---- 2.x session_message → items ---------------------------------------------------------------------------------
const modelName = value => (value?.id ? (value.providerID ? `${value.providerID}/${value.id}` : value.id) : null);
/** v2 messages ({id, type, …data}, seq order, assistant content already merged from session_part) → items. */
export function itemsOfV2(messages) {
  const list = new ItemList();
  let model = null;
  for (const message of messages) {
    const ts = message.time?.created ?? message.time_created;
    switch (message.type) {
      case 'user': {
        const parts = [{ text: message.text ?? '' }];
        for (const file of message.files ?? []) {
          const url = file?.data ? `data:${file.mime};base64,${file.data}` : file?.source?.uri ?? file?.uri;
          if (url) parts.push(filePart({ mime: file.mime, url, filename: file.name }));
        }
        list.push('user', { ts, parts });
        break;
      }
      // Model-facing context the harness added (session-message.ts Synthetic, System, Skill).
      case 'synthetic': case 'system': case 'skill': list.push('injected', { ts, parts: [{ text: message.text ?? message.description ?? '' }] }); break;
      case 'model-switched': model = modelName(message.model) ?? model; break;
      case 'assistant':
        model = modelName(message.model) ?? model;
        for (const item of message.content ?? []) {
          if (item?.type === 'text') list.push('assistant', { ts, parts: [{ text: item.text ?? '' }] });
          else if (item?.type === 'reasoning') list.push('reasoning', { ts, reasoning: { text: item.text ?? '' } });
          else if (item?.type === 'tool' && item.id) toolItems(list, { callID: item.id, tool: item.name, state: { ...item.state, status: item.state?.status === 'streaming' ? 'pending' : item.state?.status, error: item.state?.error?.message ?? item.state?.error } }, ts);
        }
        break;
      // A running compaction's summary is still being written, a failed one has none (CompactionRunning / Failed).
      case 'compaction':
        if (message.status === 'running' || message.status === 'failed') break;
        list.push('compaction', { ts, compaction: { summary: typeof message.summary === 'string' && message.summary ? message.summary : null } });
        break;
      case 'shell': {
        const callId = message.shellID ?? message.id;
        list.toolCall({ callId, name: 'shell', raw: { command: message.command ?? '' }, category: 'shell', ts });
        if (message.status !== 'running') list.toolResult({ callId, text: message.output?.output ?? '', exitCode: Number.isFinite(message.exit) ? message.exit : undefined, isError: message.status === 'timeout' || message.status === 'killed' || (Number.isFinite(message.exit) && message.exit !== 0), ts });
        break;
      }
      // agent-switched, location-switched, idle: no conversation.
      default: break;
    }
  }
  return { items: list.items, model };
}
