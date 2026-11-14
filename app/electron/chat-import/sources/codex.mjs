// Codex (CLI, IDE extension, desktop app): ~/.codex (CODEX_HOME) — formats.md "Codex".
//
//   list   state_5.sqlite `threads` (read-only): id, rollout_path, created_at[_ms], updated_at[_ms], cwd, title, name,
//          first_user_message, preview, model, archived, source, thread_source, git_branch, has_user_event. Titles fall
//          back to session_index.jsonl ({id, thread_name, updated_at}, later lines win). `rollout_path` may name `.jsonl`
//          while the file on disk is already `.jsonl.zst`, or may have moved to archived_sessions/, or be gone (then the
//          thread is not importable and is skipped). Rollouts the database does not know are found by a directory scan
//          (sessions/YYYY/MM/DD, archived_sessions) that reads only the head of each file.
//          Sub-agents: `source` JSON {"subagent": "review" | {"other":"guardian"} | {"thread_spawn":{parent_thread_id,…}}}
//          (thread_source subagent / guardian_review) — excluded unless includeSubagents.
//   read   One rollout, streamed (a 36 MB .zst decompresses as it is read). Records {timestamp, type, ordinal?, payload}.
//          Two streams describe a turn: `event_msg/item_completed` (the UI stream: UserMessage, AgentMessage, Reasoning
//          {summary_text}, CommandExecution {command[], cwd, aggregated_output, exit_code}, FileChange {changes: {path:
//          {type, content|unified_diff, move_path}}}, McpToolCall {server, tool, arguments, result}, Extension web.search,
//          ImageView, SubAgentActivity, CollabAgentToolCall, ContextCompaction) and `response_item` (the model stream:
//          message / reasoning {summary, encrypted_content} / function_call / custom_tool_call / *_output). Since 0.146
//          every turn is in the UI stream, which is what Codex itself shows (its code-mode `exec` calls only appear there
//          as the commands they ran), so it is preferred; a rollout without it (older CLIs) is read from the model stream,
//          and one older still from the legacy event_msg user_message / agent_message / agent_reasoning records.
//          The UI stream carries no encrypted reasoning (its Reasoning ids do not match the model stream's): opaque
//          reasoning only survives in model-stream rollouts — it is dropped across models anyway.
//          `compacted {message, replacement_history}`: message is the summary text (empty for a remote compaction, whose
//          summary is encrypted in replacement_history: the compaction item then has summary null).
//          A fork (`session_meta.history_base {thread_id, end_ordinal_exclusive, end_byte_offset}`) does not copy its
//          parent's history: the parent rollout is read up to that ordinal (or byte offset) and prepended, best effort.
//          A spawned sub-agent's rollout starts with its parent's history up to `subagent_history_start_ordinal`: skipped.
import path from 'node:path';
import {
  ItemList, clip, isCodexInjected, isRecord, makeSession, makeSummary, parseJson, parseKey, textOfBlocks,
} from '../model.mjs';
import {
  CONCURRENCY, cachedSummary, closeDatabase, envOf, findFiles, homeOf, isExcluded, mapLimit, openDatabase, readLines,
  parseLine, statOf, listDir,
} from './shared.mjs';

export const id = 'codex';
export const label = 'Codex';
export const experimental = false;

export const codexHome = ctx => envOf(ctx).CODEX_HOME || path.join(homeOf(ctx), '.codex');
export function roots(ctx) {
  const home = codexHome(ctx);
  return [path.join(home, 'sessions'), path.join(home, 'archived_sessions'), path.join(home, 'state_5.sqlite')];
}

const ROLLOUT = /^rollout-.*\.jsonl(\.zst)?$/;
const UUID = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const idOfRollout = file => UUID.exec(path.basename(file).replace(/\.jsonl(\.zst)?$/, '').slice(-36))?.[1] ?? null;

/** The newest state_N.sqlite of a Codex home (state_5 today). */
async function stateDatabase(home) {
  const names = (await listDir(home)).map(entry => entry.name).filter(name => /^state_\d+\.sqlite$/.test(name));
  names.sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]));
  return names.length ? path.join(home, names[0]) : null;
}

/** {kind: 'user'|'subagent'|'review'|'guardian', parentId} from a threads.source / session_meta.source value. */
export function threadKind(source, threadSource, parentHint) {
  const value = typeof source === 'string' && source.startsWith('{') ? parseJson(source) : source;
  const sub = isRecord(value) ? value.subagent : undefined;
  if (sub === 'review' || threadSource === 'review') return { kind: 'review', parentId: parentHint ?? null };
  if (isRecord(sub) && (sub.other === 'guardian' || sub.guardian !== undefined)) return { kind: 'guardian', parentId: parentHint ?? null };
  if (threadSource === 'guardian_review') return { kind: 'guardian', parentId: parentHint ?? null };
  if (isRecord(sub) && isRecord(sub.thread_spawn)) return { kind: 'subagent', parentId: sub.thread_spawn.parent_thread_id ?? parentHint ?? null };
  if (sub !== undefined || threadSource === 'subagent') return { kind: 'subagent', parentId: parentHint ?? null };
  return { kind: 'user', parentId: null };
}

/** The rollout on disk for a recorded path: p, p.zst, then the same name under archived_sessions/ or sessions/. */
async function resolveRollout(recorded, home) {
  if (typeof recorded !== 'string' || !recorded) return null;
  const base = path.basename(recorded).replace(/\.zst$/, '');
  const candidates = [recorded, recorded.endsWith('.zst') ? recorded.slice(0, -4) : `${recorded}.zst`,
    path.join(home, 'archived_sessions', base), path.join(home, 'archived_sessions', `${base}.zst`)];
  for (const candidate of candidates) {
    const stat = await statOf(candidate);
    if (stat?.isFile()) return { file: candidate, stat };
  }
  return null;
}

async function sessionIndex(home) {
  const names = new Map();
  try {
    for await (const line of readLines(path.join(home, 'session_index.jsonl'))) {
      const record = parseLine(line);
      if (record?.id && typeof record.thread_name === 'string') names.set(record.id, record.thread_name);
    }
  } catch {}
  return names;
}

function rowSummary(row, file, stat, names, home) {
  const { kind, parentId } = threadKind(row.source, row.thread_source, row.attached_thread_parent_id ?? null);
  return makeSummary('codex', row.id, {
    sourcePath: file, title: row.name || names.get(row.id) || row.title || '', firstPrompt: row.first_user_message || row.preview || '',
    cwd: row.cwd, gitBranch: row.git_branch, model: row.model,
    createdAt: row.created_at_ms ?? row.created_at, updatedAt: row.updated_at_ms ?? row.recency_at_ms ?? row.updated_at ?? stat?.mtimeMs,
    archived: !!row.archived || file.startsWith(path.join(home, 'archived_sessions')), parentId, isSubagent: kind !== 'user',
    extra: { threadKind: kind },
  });
}

/** A rollout's head (session_meta + the first real user prompt), for files the database does not know. */
async function headSummary(file, stat, names, home) {
  let meta = null, firstPrompt = '', lines = 0, model = null;
  for await (const line of readLines(file)) {
    if (++lines > 400 || firstPrompt) break;
    const record = parseLine(line);
    if (!record) continue;
    const payload = record.payload ?? {};
    if (record.type === 'session_meta' && !meta) meta = payload;
    else if (record.type === 'turn_context' && payload.model) model = payload.model;
    else if (record.type === 'event_msg' && payload.type === 'item_completed' && payload.item?.type === 'UserMessage') firstPrompt = textOfBlocks(payload.item.content);
    else if (record.type === 'event_msg' && payload.type === 'user_message' && !isCodexInjected(payload.message)) firstPrompt = payload.message ?? '';
    else if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
      const text = (payload.content ?? []).map(block => block?.text).filter(text => typeof text === 'string' && !isCodexInjected(text)).join('\n');
      if (text) firstPrompt = text;
    }
  }
  const sessionId = meta?.id ?? idOfRollout(file);
  if (!sessionId) return null;
  const { kind, parentId } = threadKind(meta?.source, meta?.thread_source, meta?.parent_thread_id ?? null);
  return makeSummary('codex', sessionId, {
    sourcePath: file, title: names.get(sessionId) ?? '', firstPrompt, cwd: meta?.cwd, gitBranch: meta?.git?.branch, model,
    createdAt: meta?.timestamp, updatedAt: stat.mtimeMs, archived: file.startsWith(path.join(home, 'archived_sessions')),
    parentId, isSubagent: kind !== 'user', fidelity: 'full', extra: { threadKind: kind },
  });
}

export async function list(ctx = {}) {
  const home = codexHome(ctx);
  const warn = message => ctx.warn?.('codex', message);
  const names = await sessionIndex(home);
  const out = [], knownFiles = new Set(), knownIds = new Set();
  const dbFile = await stateDatabase(home);
  const db = dbFile ? await openDatabase(dbFile, warn) : null;
  if (db) {
    let rows = [];
    try { rows = db.prepare('SELECT * FROM threads').all(); } catch (error) { warn(`threads: ${error?.message || error}`); }
    closeDatabase(db);
    let missing = 0;
    const resolved = await mapLimit(rows, CONCURRENCY, async row => ({ row, hit: await resolveRollout(row.rollout_path, home) }));
    for (const { row, hit } of resolved.filter(Boolean)) {
      knownIds.add(row.id);
      if (!hit) { missing++; continue; }
      knownFiles.add(hit.file);
      if (isExcluded(hit.file, ctx.exclude)) continue;
      if (!row.has_user_event && !row.first_user_message && !row.preview && !row.name && !names.get(row.id)) continue;
      const summary = rowSummary(row, hit.file, hit.stat, names, home);
      if (summary.isSubagent && !ctx.includeSubagents) continue;
      out.push(summary);
    }
    if (missing) warn(`${missing} recorded thread(s) have no rollout file`);
  }
  // Rollouts the database does not know (no database, or written by a CLI that did not index them).
  const files = [];
  for (const dir of [path.join(home, 'sessions'), path.join(home, 'archived_sessions')]) files.push(...await findFiles(dir, name => ROLLOUT.test(name), { depth: 4 }));
  const unknown = files.filter(file => !knownFiles.has(file) && !knownIds.has(idOfRollout(file)) && !isExcluded(file, ctx.exclude));
  const scanned = await mapLimit(unknown, CONCURRENCY, file => cachedSummary(ctx, file, stat => headSummary(file, stat, names, home)));
  const seen = new Set(out.map(summary => summary.sourceId));
  for (const summary of scanned) {
    if (!summary || seen.has(summary.sourceId) || (!summary.firstPrompt && !summary.title)) continue;
    if (summary.isSubagent && !ctx.includeSubagents) continue;
    seen.add(summary.sourceId);
    out.push(summary);
  }
  return out;
}

/** Locate a thread's summary by id (database row first, then a file scan). */
async function summaryById(threadId, ctx) {
  const home = codexHome(ctx);
  const names = await sessionIndex(home);
  const dbFile = await stateDatabase(home);
  const db = dbFile ? await openDatabase(dbFile) : null;
  if (db) {
    let row = null;
    try { row = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId); } catch {}
    closeDatabase(db);
    const hit = row ? await resolveRollout(row.rollout_path, home) : null;
    if (hit) return rowSummary(row, hit.file, hit.stat, names, home);
  }
  for (const dir of [path.join(home, 'sessions'), path.join(home, 'archived_sessions')]) {
    const [file] = await findFiles(dir, name => ROLLOUT.test(name) && name.includes(threadId), { depth: 4 });
    if (file) return headSummary(file, await statOf(file), names, home);
  }
  return null;
}

// ---- parsing ------------------------------------------------------------------------------------------------------
const SHELLS = /(^|\/)(ba|z|da|k|fi)?sh$|(^|\/)(pwsh|powershell)(\.exe)?$/;
/** A CommandExecution / local_shell command (argv) as one line: `bash -lc X` → X. */
export function commandLine(command) {
  if (typeof command === 'string') return command;
  if (!Array.isArray(command)) return '';
  const argv = command.map(String);
  if (argv.length >= 3 && SHELLS.test(argv[0]) && ['-lc', '-c', '-Command', '-ilc'].includes(argv[1])) return argv.slice(2).join(' ');
  return argv.map(arg => /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`).join(' ');
}
/** FileChange.changes ({path: {type, content|unified_diff, move_path}} or a list) → Codex v2 [{path, kind, diff}]. */
export function fileChanges(changes) {
  const entries = Array.isArray(changes) ? changes.map(change => [change?.path, change]) : isRecord(changes) ? Object.entries(changes) : [];
  return entries.filter(([file]) => typeof file === 'string').map(([file, change]) => {
    const type = typeof change?.type === 'string' ? change.type : typeof change?.kind?.type === 'string' ? change.kind.type : typeof change?.kind === 'string' ? change.kind : 'update';
    const diff = change?.unified_diff ?? change?.diff ?? change?.content ?? '';
    return { path: file, kind: { type, ...(type === 'update' ? { move_path: change?.move_path ?? change?.kind?.move_path ?? null } : {}) }, diff: String(diff) };
  });
}
/** A function_call_output's output: a string (maybe JSON {output, metadata:{exit_code}}), content blocks, or {content, success}. */
function toolOutput(output) {
  if (typeof output === 'string') {
    const parsed = output.startsWith('{') ? parseJson(output) : undefined;
    if (isRecord(parsed) && typeof parsed.output === 'string') return { text: parsed.output, exitCode: parsed.metadata?.exit_code };
    return { text: output };
  }
  if (Array.isArray(output)) return { text: textOfBlocks(output) };
  if (isRecord(output)) return { text: typeof output.content === 'string' ? output.content : textOfBlocks(output.content), isError: output.success === false };
  return { text: '' };
}
const dataUrlImage = url => {
  const match = /^data:([^;,]+)[;,]/.exec(url ?? '');
  return { mime: match?.[1] ?? 'image/*', ...(match ? { data: url } : { url }) };
};
const mcpResultText = result => {
  if (!result) return '';
  if (typeof result === 'string') return result;
  const content = result.Ok?.content ?? result.content;
  if (Array.isArray(content)) return content.map(block => block?.type === 'text' ? block.text : `[${block?.type ?? 'content'}]`).join('\n');
  if (result.Err !== undefined) return typeof result.Err === 'string' ? result.Err : JSON.stringify(result.Err);
  return JSON.stringify(result);
};

/**
 * Parse one rollout. `endOrdinal` / `endByte` cut a parent's prefix for a fork; `skipBefore` drops a sub-agent's copy of
 * its parent's history.
 */
export async function parseRollout(file, { endOrdinal, endByte, skipBefore } = {}) {
  const ui = new ItemList(), legacy = new ItemList();
  let resp = new ItemList(), meta = null, model = null, partial = false, bytes = 0, uiStarted = false;
  let lastCompaction = null, sinceCompaction = 0;
  const pushCompaction = (summary, ts) => {
    if (lastCompaction && sinceCompaction === 0) {
      if (summary && !lastCompaction.compaction.summary) lastCompaction.compaction.summary = summary;
      return;
    }
    lastCompaction = ui.push('compaction', { ts, compaction: { summary: summary || null } });
    sinceCompaction = 0;
  };
  for await (const line of readLines(file, { onPartial: () => { partial = true; } })) {
    bytes += Buffer.byteLength(line) + 1;
    if (endByte && bytes > endByte) break;
    const record = parseLine(line);
    if (!record) continue;
    if (endOrdinal !== undefined && Number.isFinite(record.ordinal) && record.ordinal >= endOrdinal) break;
    if (skipBefore !== undefined && Number.isFinite(record.ordinal) && record.ordinal < skipBefore && record.type !== 'session_meta') continue;
    const payload = record.payload ?? {}, ts = record.timestamp;
    if (record.type === 'session_meta') { meta ??= payload; continue; }
    if (record.type === 'turn_context') { if (payload.model) model = payload.model; continue; }
    if (record.type === 'compacted') {
      const summary = typeof payload.message === 'string' && payload.message.trim() ? payload.message : null;
      if (uiStarted) pushCompaction(summary, ts); else resp?.push('compaction', { ts, compaction: { summary } });
      continue;
    }
    if (record.type === 'event_msg' && payload.type === 'item_completed' && isRecord(payload.item)) {
      if (!uiStarted) {
        uiStarted = true;
        // A rollout an older CLI began and a newer one continued: its earlier exchanges exist only in the model stream.
        // Keep them up to their last model output (the trailing prompt is the one this UI record repeats).
        const prior = resp?.items ?? [];
        const lastOutput = prior.findLastIndex(item => item.kind !== 'user' && item.kind !== 'injected');
        if (prior.some(item => item.kind === 'assistant')) for (const item of prior.slice(0, lastOutput + 1)) ui.items.push({ ...item, seq: ui.items.length });
        resp = null;
      }
      const before = ui.items.length;
      uiItem(ui, payload.item, ts, pushCompaction);
      if (ui.items.length > before && payload.item.type !== 'ContextCompaction') sinceCompaction++;
      continue;
    }
    if (record.type === 'response_item' && resp) { responseItem(resp, payload, ts, model); continue; }
    if (record.type === 'event_msg') legacyEvent(legacy, payload, ts);
  }
  const chosen = uiStarted ? ui : resp && resp.items.some(item => item.kind === 'user' || item.kind === 'assistant') ? resp : legacy;
  return { meta, model, items: chosen.items, partial };
}

function uiItem(list, item, ts, pushCompaction) {
  const callId = item.id;
  switch (item.type) {
    case 'UserMessage': {
      const parts = [], injected = [];
      for (const block of item.content ?? []) {
        if (typeof block?.text === 'string') (isCodexInjected(block.text) ? injected : parts).push({ text: block.text });
        else if (block?.type === 'image' && block.url) parts.push({ image: dataUrlImage(block.url) });
        else if (block?.type === 'localImage' && block.path) parts.push({ image: { mime: 'image/*', path: block.path } });
      }
      list.push('injected', { ts, parts: injected });
      list.push('user', { ts, parts });
      break;
    }
    case 'AgentMessage': list.push('assistant', { ts, parts: [{ text: textOfBlocks(item.content ?? item.text) }] }); break;
    case 'Reasoning': {
      const text = [...(item.summary_text ?? []), ...(item.raw_content ?? [])].map(entry => typeof entry === 'string' ? entry : entry?.text ?? '').filter(Boolean).join('\n\n');
      if (text) list.push('reasoning', { ts, reasoning: { text } });
      break;
    }
    case 'CommandExecution': {
      const command = commandLine(item.command);
      list.toolCall({ callId, name: 'shell', raw: { command, ...(item.cwd ? { cwd: item.cwd } : {}) }, category: 'shell', ts });
      const exitCode = Number.isFinite(item.exit_code) ? item.exit_code : undefined;
      list.toolResult({ callId, text: item.aggregated_output ?? '', exitCode, isError: item.status === 'failed' || item.status === 'declined' || (exitCode ?? 0) !== 0, ts });
      break;
    }
    case 'FileChange': {
      const changes = fileChanges(item.changes);
      list.toolCall({ callId, name: 'apply_patch', raw: { changes }, category: 'edit', ts });
      list.toolResult({ callId, text: [item.stdout, item.stderr].filter(Boolean).join('\n'), isError: item.status === 'failed' || item.status === 'declined', patch: changes, ts });
      break;
    }
    case 'McpToolCall': {
      const mcp = { server: String(item.server ?? ''), tool: String(item.tool ?? '') };
      list.toolCall({ callId, name: `mcp__${mcp.server}__${mcp.tool}`, raw: item.arguments ?? {}, mcp, category: 'mcp', ts });
      list.toolResult({ callId, text: item.error ? (item.error.message ?? JSON.stringify(item.error)) : mcpResultText(item.result), isError: !!item.error || item.result?.isError === true || item.status === 'failed', ts });
      break;
    }
    case 'Extension': {
      if (item.kind !== 'web.search') break;
      list.toolCall({ callId, name: 'web_search', raw: { query: item.query ?? '', ...(item.action ? { action: item.action } : {}) }, category: 'web', ts });
      const results = (item.results ?? []).map(result => [result?.title, result?.url].filter(Boolean).join(' — ')).filter(Boolean);
      list.toolResult({ callId, text: results.join('\n'), ts });
      break;
    }
    case 'ImageView':
      list.toolCall({ callId, name: 'view_image', raw: { path: item.path ?? '' }, category: 'other', ts });
      list.toolResult({ callId, text: item.path ?? '', ts });
      break;
    case 'WebSearch':
      list.toolCall({ callId, name: 'web_search', raw: { query: item.query ?? '' }, category: 'web', ts });
      list.toolResult({ callId, text: '', ts });
      break;
    case 'SubAgentActivity':
    case 'CollabAgentToolCall': {
      const threads = item.agent_thread_id ? [item.agent_thread_id] : item.receiver_thread_ids ?? [];
      const what = item.type === 'SubAgentActivity' ? `Sub-agent ${item.agent_path ?? ''} ${item.kind ?? ''}`.replace(/\s+/g, ' ').trim() : `Sub-agent ${item.tool ?? 'call'}`;
      list.push('subagent_ref', { ts, parts: [{ text: what }], ref: { threadIds: threads, path: item.agent_path ?? null } });
      break;
    }
    case 'ContextCompaction': pushCompaction(null, ts); break;
    case 'Plan':
      if (typeof item.text === 'string') list.push('assistant', { ts, parts: [{ text: item.text }] });
      break;
    default: break;
  }
}

function responseItem(list, payload, ts, model) {
  switch (payload.type) {
    case 'message': {
      if (payload.role === 'developer' || payload.role === 'system') {
        list.push('injected', { ts, parts: [{ text: clip(textOfBlocks(payload.content), 4000) }] });
        break;
      }
      const parts = [], injected = [];
      for (const block of payload.content ?? []) {
        if (typeof block?.text === 'string') (payload.role === 'user' && isCodexInjected(block.text) ? injected : parts).push({ text: block.text });
        else if (block?.type === 'input_image' && block.image_url) parts.push({ image: dataUrlImage(block.image_url) });
      }
      list.push('injected', { ts, parts: injected });
      list.push(payload.role === 'assistant' ? 'assistant' : 'user', { ts, parts });
      break;
    }
    case 'reasoning': {
      const text = [...(payload.summary ?? []), ...(payload.content ?? [])].map(entry => entry?.text ?? '').filter(Boolean).join('\n\n');
      list.push('reasoning', { ts, reasoning: { ...(text ? { text } : {}), ...(payload.encrypted_content ? { opaque: { vendor: 'openai', model: model ?? null, payload: payload.encrypted_content } } : {}) } });
      break;
    }
    case 'function_call': list.toolCall({ callId: payload.call_id, name: payload.name, raw: payload.arguments, namespace: payload.namespace, ts }); break;
    case 'custom_tool_call': list.toolCall({ callId: payload.call_id, name: payload.name, raw: payload.input, ts }); break;
    case 'local_shell_call':
      list.toolCall({ callId: payload.call_id ?? payload.id, name: 'local_shell', raw: { command: commandLine(payload.action?.command), ...(payload.action?.working_directory ? { cwd: payload.action.working_directory } : {}) }, category: 'shell', ts });
      break;
    case 'web_search_call':
      list.toolCall({ callId: payload.id, name: 'web_search', raw: { query: payload.action?.query ?? '' }, category: 'web', ts });
      list.toolResult({ callId: payload.id, text: payload.status ?? '', ts });
      break;
    case 'function_call_output':
    case 'custom_tool_call_output':
    case 'local_shell_call_output': {
      const { text, exitCode, isError } = toolOutput(payload.output);
      list.toolResult({ callId: payload.call_id, text, exitCode: Number.isFinite(exitCode) ? exitCode : undefined, isError: isError || (Number.isFinite(exitCode) && exitCode !== 0), ts });
      break;
    }
    default: break;
  }
}

function legacyEvent(list, payload, ts) {
  if (payload.type === 'user_message' && typeof payload.message === 'string') {
    list.push(isCodexInjected(payload.message) ? 'injected' : 'user', { ts, parts: [{ text: payload.message }, ...(payload.images ?? []).map(url => ({ image: dataUrlImage(url) }))] });
  } else if (payload.type === 'agent_message' && typeof payload.message === 'string') list.push('assistant', { ts, parts: [{ text: payload.message }] });
  else if (payload.type === 'agent_reasoning' && typeof payload.text === 'string') list.push('reasoning', { ts, reasoning: { text: payload.text } });
}

export async function read(target, ctx = {}) {
  const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
  let summary = typeof target === 'object' && target?.sourcePath ? target : await summaryById(sourceId, ctx);
  if (!summary?.sourcePath) throw new Error('Codex session not found.');
  const warnings = [];
  const first = await parseRollout(summary.sourcePath, {});
  // A spawned sub-agent copies its parent's history before subagent_history_start_ordinal: read again without it.
  const start = first.meta?.subagent_history_start_ordinal;
  const own = Number.isFinite(start) && start > 0 ? await parseRollout(summary.sourcePath, { skipBefore: start }) : first;
  if (own.partial) warnings.push('The rollout ends in an incomplete compressed frame; the last records were skipped.');
  let items = own.items;
  const base = own.meta?.history_base;
  const parentId = base?.thread_id ?? own.meta?.forked_from_id;
  if (parentId) {
    const prefix = await forkPrefix(parentId, base, ctx, 0).catch(() => null);
    if (prefix?.length) items = [...prefix, ...items];
    else warnings.push('This conversation was forked; the earlier part could not be found.');
  }
  items = items.map((item, seq) => ({ ...item, seq }));
  summary = { ...summary, model: summary.model || own.model || null, cwd: summary.cwd || own.meta?.cwd || null };
  return makeSession(summary, items, warnings);
}

async function forkPrefix(parentId, base, ctx, depth) {
  if (depth > 3) return null;
  const parent = await summaryById(parentId, ctx);
  if (!parent?.sourcePath) return null;
  const cut = { endOrdinal: Number.isFinite(base?.end_ordinal_exclusive) ? base.end_ordinal_exclusive : undefined,
    endByte: Number.isFinite(base?.end_byte_offset) && !Number.isFinite(base?.end_ordinal_exclusive) ? base.end_byte_offset : undefined };
  const parsed = await parseRollout(parent.sourcePath, cut);
  const grand = parsed.meta?.history_base;
  const grandId = grand?.thread_id ?? parsed.meta?.forked_from_id;
  const above = grandId ? await forkPrefix(grandId, grand, ctx, depth + 1).catch(() => null) : null;
  return [...(above ?? []), ...parsed.items];
}

