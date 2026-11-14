// Gemini CLI (@google/gemini-cli; this machine runs 0.64.0 from /opt/homebrew/lib/node_modules, the bridge's
// `gemini --acp`). Read the way Gemini itself reads its sessions; citations are upstream HEAD (0.67.0-nightly, 6814e00)
// packages/…, whose session format matches 0.64's bundle record for record (same ChatRecordingService accumulator,
// same file naming; 0.64 only lacks HEAD's tool-response de-duplication on resume, which a reader never needs).
//
//   roots    <runtime>/tmp/<slug>/chats/, <runtime> = $GEMINI_CLI_HOME or ~ + /.gemini (core utils/paths.ts:22 homedir,
//            config/storage.ts:54-60 getGlobalGeminiDir, :195 getGlobalTempDir, :230 getProjectTempDir), or
//            ~/.cache/.gemini under Gemini's own Seatbelt sandbox (SANDBOX=sandbox-exec, storage.ts:92-104).
//   project  <slug> is ProjectRegistry's short id (config/projectRegistry.ts:163-236, slugify :414; older CLIs a
//            sha256 of the path, migrated by storage.ts:310-324); the folder is tmp/<slug>/.project_root (or
//            history/<slug>/.project_root: the registry's two base dirs, storage.ts:293-296) or projects.json
//            {projects: {path: slug}} (projectRegistry.ts:16-22).
//   files    chats/session-<YYYY-MM-DDTHH-MM>-[<n>-]<id8>.jsonl for a session (chatRecordingService.ts:801-822; legacy
//            .json, migrated on resume :732-756); a sub-agent's chats/<parentSessionId>/<sessionId>.jsonl, kind
//            'subagent' (:786-797, :813-814). Gemini's list takes only session-* files in chats/ (cli
//            utils/sessionUtils.ts:256-261), skips non-resumable and sub-agent ones (:295-303) and keeps one file per
//            sessionId, the latest lastUpdated (:390-401): a 0.64 session/load leaves a metadata-only copy behind.
//   records  replayed exactly as createJsonlRecordAccumulator (chatRecordingService.ts:256-603): {$rewindTo:id} drops
//            that message and all after it, or every message when the id is unknown (:308-338); {$patch:{id?,
//            content?, toolCalls?, updates?, removeIds?, orderIds?}} edits, removes and moves the listed ids after the
//            rest (:339-416); a record with a string id is a message that REPLACES its earlier write in place (Map
//            order, :417-453); {$set:{…}} merges metadata, its legacy `messages` replaces them all (:454-507); a record
//            with sessionId + projectHash is metadata (:508-545). No sessionId/projectHash → the whole file as one
//            legacy JSON object {sessionId, …, messages[]} (:1647-1699).
//   messages {id, timestamp, type: user | gemini | info | error | warning, content: PartListUnion, displayContent?}
//            (chatRecordingTypes.ts:44-87). user: the prompt's parts (geminiChat.ts:545-591; displayContent = what the
//            user typed before @file expansion), or a tool response recorded as a synthetic user message of
//            functionResponse parts (:592-595). gemini: content is the reply text or, synced from history, its full
//            parts (text, {thought:true} reasoning, functionCall; chatRecordingService.ts:1422-1489); thoughts[{subject,
//            description}] summaries, tokens, model (:1096-1102); toolCalls[{id, name, args, result (functionResponse
//            parts), status, resultDisplay, timestamp}] (:1168-1237, geminiChat.ts:1835-1872). info / error / warning
//            are CLI notices, never sent back to the model (core utils/sessionUtils.ts:130-132): not replayed here.
//            User text Gemini's resume ignores (/commands, ?help, <session_context>, <hook_context>,
//            sessionUtils.ts:97-105) is `injected`.
import path from 'node:path';
import fsp from 'node:fs/promises';
import { ItemList, isRecord, makeSession, makeSummary, oneLine, parseKey } from '../model.mjs';
import { CONCURRENCY, cachedSummary, envOf, homeOf, isExcluded, listDir, mapLimit, readJsonFile, readLines } from './shared.mjs';

export const id = 'gemini';
export const label = 'Gemini CLI';
// Verified against both the locally installed 0.64.0 bundle and upstream HEAD's writer (see above).
export const experimental = false;

const baseOf = ctx => envOf(ctx).GEMINI_CLI_HOME || homeOf(ctx);
const runtimeDirs = ctx => [path.join(baseOf(ctx), '.gemini'), path.join(baseOf(ctx), '.cache', '.gemini')];
export const roots = ctx => runtimeDirs(ctx).map(dir => path.join(dir, 'tmp'));
const CHAT = /\.jsonl?$/;
const SESSION_FILE = /^session-.*\.jsonl?$/;

// ---- the record accumulator (chatRecordingService.ts:256-603) ---------------------------------------------------
const hasOwn = (value, key) => isRecord(value) && key in value;
const isStr = (value, key) => hasOwn(value, key) && typeof value[key] === 'string';
const isMessageRecord = record => isStr(record, 'id') && !hasOwn(record, '$patch');

/** A fresh accumulator: feed() each parsed record, then finish() → {meta, messages} or null (no sessionId/projectHash). */
export function chatAccumulator() {
  let meta = {};
  let messages = new Map();
  const patchOne = patch => {
    const existing = messages.get(patch.id);
    if (!existing) return;
    if ('content' in patch && patch.content !== undefined) existing.content = patch.content;
    if (Array.isArray(patch.toolCalls) && existing.type === 'gemini' && Array.isArray(existing.toolCalls)) {
      for (const change of patch.toolCalls) {
        const call = existing.toolCalls.find(entry => entry?.id === change?.id);
        if (call && hasOwn(change, 'result')) call.result = change.result;
      }
    }
  };
  const feed = record => {
    if (!isRecord(record)) return;
    if (isStr(record, '$rewindTo')) {
      const ids = [...messages.keys()], at = ids.indexOf(record.$rewindTo);
      if (at < 0) messages.clear(); else for (const removed of ids.slice(at)) messages.delete(removed);
    } else if (isRecord(record.$patch)) {
      const patch = record.$patch;
      if (isStr(patch, 'id')) patchOne(patch);
      if (Array.isArray(patch.updates)) for (const update of patch.updates) if (isStr(update, 'id')) patchOne(update);
      if (Array.isArray(patch.removeIds)) for (const removed of patch.removeIds) if (typeof removed === 'string') messages.delete(removed);
      if (Array.isArray(patch.orderIds)) {
        const ordered = patch.orderIds.filter(entry => typeof entry === 'string' && messages.has(entry));
        const listed = new Set(ordered), next = new Map();
        for (const [key, message] of messages) if (!listed.has(key)) next.set(key, message);
        for (const key of ordered) next.set(key, messages.get(key));
        messages = next;
      }
    } else if (isMessageRecord(record)) {
      messages.set(record.id, record);
    } else if (isRecord(record.$set)) {
      if (Array.isArray(record.$set.messages)) {
        messages = new Map();
        for (const message of record.$set.messages) if (isMessageRecord(message)) messages.set(message.id, message);
      }
      const { messages: _replaced, ...rest } = record.$set;
      meta = { ...meta, ...rest };
    } else if (isStr(record, 'sessionId') && isStr(record, 'projectHash')) {
      const { messages: list, ...rest } = record;
      meta = { ...meta, ...rest };
      if (Array.isArray(list)) for (const message of list) if (isMessageRecord(message)) messages.set(message.id, message);
    }
  };
  const finish = () => (meta.sessionId && meta.projectHash ? { meta, messages: [...messages.values()] } : null);
  return { feed, finish };
}

/** Records (objects) or JSONL lines (strings) replayed into {meta, messages}; meta is {} when the file named none. */
export function replayChat(records) {
  const acc = chatAccumulator();
  for (const record of records) {
    if (typeof record === 'string') { if (record.trim()) try { acc.feed(JSON.parse(record)); } catch {} } else acc.feed(record);
  }
  return acc.finish() ?? { meta: {}, messages: [] };
}

/** A legacy whole-file record (parseLegacyContentFallback: any object with a sessionId). */
function legacyChat(value) {
  if (!isRecord(value) || !('sessionId' in value)) return null;
  const { messages, ...meta } = value;
  return { meta, messages: Array.isArray(messages) ? messages.filter(message => isRecord(message)) : [] };
}

/** One chat file read as loadConversationRecord does (a partial last line, a line being written, is skipped). */
export async function readChat(file) {
  const acc = chatAccumulator();
  try {
    for await (const line of readLines(file)) { if (line.trim()) try { acc.feed(JSON.parse(line)); } catch {} }
  } catch { return null; }
  return acc.finish() ?? legacyChat(await readJsonFile(file));
}

// ---- parts (PartListUnion: a string, a Part, or an array of strings and Parts; core utils/sessionUtils.ts:85-95) ----
const partsOf = content => content == null ? [] : Array.isArray(content) ? content.map(part => typeof part === 'string' ? { text: part } : part).filter(isRecord)
  : typeof content === 'string' ? [{ text: content }] : isRecord(content) ? [content] : [];
const plainText = parts => parts.filter(part => typeof part.text === 'string' && part.thought !== true).map(part => part.text).join('');

/** isIgnoredUserContent (core utils/sessionUtils.ts:97-105): text Gemini's resume drops from the model's history. */
export const isIgnoredUserText = text => { const trimmed = String(text ?? '').trim(); return !trimmed || /^(\/|\?|<session_context>|<hook_context>)/.test(trimmed); };

/** isResumableMessageRecord (chatRecordingService.ts:220-238), on the text a reader can see. */
function resumable(message) {
  const parts = partsOf(message?.content);
  if (message?.type === 'user') return parts.some(part => part.functionResponse) || !isIgnoredUserText(plainText(parts));
  if (message?.type === 'gemini') return !!plainText(parts).trim() || parts.some(part => part.functionCall) || (message.toolCalls?.length ?? 0) > 0 || (message.thoughts?.length ?? 0) > 0;
  return false;
}
/** The first prompt Gemini's session list shows (cli sessionUtils.ts:151-185: no /command, no ?help, cleaned). */
function firstPromptOf(messages) {
  const users = messages.filter(message => message.type === 'user' && !partsOf(message.content).some(part => part.functionResponse));
  const real = users.find(message => !isIgnoredUserText(plainText(partsOf(message.content))));
  const text = plainText(partsOf((real ?? users[0])?.displayContent ?? (real ?? users[0])?.content));
  return text.replace(/^\s*<session_context>[\s\S]*?<\/session_context>\s*/, '');
}

// ---- files --------------------------------------------------------------------------------------------------------
async function readText(file) { try { return (await fsp.readFile(file, 'utf8')).trim() || null; } catch { return null; } }
/** path → slug of projects.json, inverted (slug → path). */
async function projectMap(runtime) {
  const value = await readJsonFile(path.join(runtime, 'projects.json'));
  const entries = isRecord(value?.projects) ? value.projects : {};
  return new Map(Object.entries(entries).filter(([, slug]) => typeof slug === 'string').map(([dir, slug]) => [slug, dir]));
}
async function projectRoot(runtime, slug, projects) {
  return (await readText(path.join(runtime, 'tmp', slug, '.project_root'))) ?? (await readText(path.join(runtime, 'history', slug, '.project_root'))) ?? projects.get(slug) ?? null;
}

/** Every chat file: {file, cwd, parentId} (parentId: the sub-agent's parent session id, its folder's name). */
async function chatFiles(ctx) {
  const out = [], seen = new Set();
  for (const runtime of runtimeDirs(ctx)) {
    const projects = await projectMap(runtime);
    for (const slug of await listDir(path.join(runtime, 'tmp'))) {
      if (!slug.isDirectory()) continue;
      const chats = path.join(runtime, 'tmp', slug.name, 'chats');
      const entries = await listDir(chats);
      if (!entries.length) continue;
      const cwd = await projectRoot(runtime, slug.name, projects);
      const push = (file, parentId) => { const real = path.resolve(file); if (!seen.has(real)) { seen.add(real); out.push({ file, cwd, parentId }); } };
      for (const entry of entries) {
        if (entry.isFile() && SESSION_FILE.test(entry.name)) push(path.join(chats, entry.name), null);
        else if (entry.isDirectory()) {
          for (const child of await listDir(path.join(chats, entry.name))) if (child.isFile() && CHAT.test(child.name)) push(path.join(chats, entry.name, child.name), entry.name);
        }
      }
    }
  }
  return out;
}

function summaryOf(entry, chat, stat) {
  if (!chat) return null;
  const { meta, messages } = chat;
  if (!messages.some(resumable)) return null;
  const sessionId = String(meta.sessionId ?? path.basename(entry.file).replace(CHAT, ''));
  const subagent = !!entry.parentId || meta.kind === 'subagent';
  return makeSummary('gemini', entry.parentId ? `${entry.parentId}/${sessionId}` : sessionId, {
    sourcePath: entry.file, title: meta.summary ?? '', firstPrompt: firstPromptOf(messages),
    cwd: entry.cwd ?? (Array.isArray(meta.directories) ? meta.directories[0] : null),
    model: messages.findLast(message => message.type === 'gemini' && message.model)?.model,
    createdAt: meta.startTime ?? messages[0]?.timestamp ?? stat.mtimeMs, updatedAt: meta.lastUpdated ?? meta.startTime ?? stat.mtimeMs,
    parentId: entry.parentId, isSubagent: subagent,
    messageCount: messages.filter(message => (message.type === 'user' || message.type === 'gemini') && resumable(message)).length,
  });
}

export async function list(ctx = {}) {
  try {
    const entries = (await chatFiles(ctx)).filter(entry => !isExcluded(entry.file, ctx.exclude) && (ctx.includeSubagents || !entry.parentId));
    const summaries = (await mapSummaries(ctx, entries)).filter(summary => summary && (ctx.includeSubagents || !summary.isSubagent));
    // One entry per session: the file updated last (cli sessionUtils.ts:390-401).
    const byId = new Map();
    for (const summary of summaries) {
      const previous = byId.get(summary.sourceId);
      if (!previous || (summary.updatedAt ?? 0) > (previous.updatedAt ?? 0)) byId.set(summary.sourceId, summary);
    }
    return [...byId.values()];
  } catch (error) {
    ctx.warn?.('gemini', String(error?.message || error));
    return [];
  }
}
const mapSummaries = (ctx, entries) =>
  mapLimit(entries, CONCURRENCY, entry => cachedSummary(ctx, entry.file, async stat => summaryOf(entry, await readChat(entry.file), stat)));

// ---- items --------------------------------------------------------------------------------------------------------
const TERMINAL = new Set(['success', 'error', 'cancelled']);
const responseText = response => {
  if (!isRecord(response)) return typeof response === 'string' ? response : '';
  if (typeof response.output === 'string') return response.output;
  if (typeof response.error === 'string') return response.error;
  if (typeof response.content === 'string') return response.content;
  return JSON.stringify(response);
};
/** A tool result's text: its functionResponse parts (or plain text parts), else the UI's resultDisplay string. */
function resultText(result, display) {
  const texts = partsOf(result).map(part => part.functionResponse ? responseText(part.functionResponse.response)
    : typeof part.text === 'string' ? part.text : part.inlineData ? `[${part.inlineData.mimeType ?? 'binary'} data]` : '').filter(Boolean);
  return texts.join('\n') || (typeof display === 'string' ? display : '');
}
/** Gemini names MCP tools mcp_<server>_<tool>, the server up to the first '_' (core tools/mcp-tool.ts:37-65). */
const mcpOfName = name => { const match = /^mcp_([^_]+)_(.+)$/.exec(String(name ?? '')); return match ? { server: match[1], tool: match[2] } : null; };

function mediaPart(part) {
  if (typeof part.text === 'string' && part.thought !== true) return { text: part.text };
  if (part.inlineData) { const mime = part.inlineData.mimeType ?? 'application/octet-stream'; return { image: { mime, ...(part.inlineData.data ? { data: `data:${mime};base64,${part.inlineData.data}` } : {}) } }; }
  if (part.fileData) return { file: { name: path.basename(String(part.fileData.fileUri ?? 'file')), path: part.fileData.fileUri ?? undefined, mime: part.fileData.mimeType ?? undefined } };
  return null;
}

/** Replayed messages → items (exported for tests). */
export function itemsOf(messages) {
  const list = new ItemList();
  const calls = new Set(), answered = new Set();
  const call = ({ id: callId, name, args, ts }) => {
    calls.add(callId);
    const mcp = mcpOfName(name);
    list.toolCall({ callId, name, raw: args ?? {}, ts, ...(mcp ? { mcp, category: 'mcp' } : {}) });
  };
  const result = (callId, fields) => { answered.add(callId); list.toolResult({ callId, ...fields }); };
  for (const message of messages) {
    const ts = message.timestamp;
    const parts = partsOf(message.content);
    if (message.type === 'user') {
      const responses = parts.filter(part => isRecord(part.functionResponse));
      if (responses.length) {
        // A tool response (the synthetic user turn): the results the gemini message's toolCalls did not carry.
        for (const { functionResponse: response } of responses) {
          const callId = response.id;
          if (callId == null || answered.has(callId) || !calls.has(callId)) continue;
          result(callId, { text: responseText(response.response), isError: isRecord(response.response) && 'error' in response.response, ts });
        }
        continue;
      }
      let text = plainText(parts);
      const context = /^\s*<session_context>[\s\S]*?<\/session_context>/.exec(text);
      if (context) { list.push('injected', { ts, parts: [{ text: context[0].trim() }] }); text = text.slice(context[0].length); if (!text.trim()) continue; }
      if (isIgnoredUserText(text)) { list.push('injected', { ts, parts: [{ text: text.trim() }] }); continue; }
      const display = message.displayContent != null ? partsOf(message.displayContent) : null;
      if (display) {
        list.push('user', { ts, parts: [...display.map(mediaPart).filter(Boolean), ...parts.filter(part => !part.text).map(mediaPart).filter(Boolean)] });
        if (plainText(display) !== text) list.push('injected', { ts, parts: [{ text }] }); // the prompt as sent (@file contents)
      } else {
        list.push('user', { ts, parts: context ? [{ text: text.replace(/^\s*\n/, '') }, ...parts.filter(part => !part.text).map(mediaPart).filter(Boolean)] : parts.map(mediaPart).filter(Boolean) });
      }
    } else if (message.type === 'gemini') {
      // Reasoning: the content's own thought parts when synced from history, else the recorded summaries, as Gemini's
      // resume rebuilds them (core utils/sessionUtils.ts:178-199).
      const thoughtParts = parts.filter(part => part.thought === true && typeof part.text === 'string' && part.text.trim());
      const thoughts = thoughtParts.length ? thoughtParts.map(part => part.text)
        : (Array.isArray(message.thoughts) ? message.thoughts : []).map(thought => thought?.subject ? `**${thought.subject}** ${thought.description ?? ''}`.trim() : thought?.description ?? '').filter(Boolean);
      if (thoughts.length) list.push('reasoning', { ts, reasoning: { text: thoughts.join('\n\n') } });
      list.push('assistant', { ts, parts: [{ text: plainText(parts) }] });
      const recorded = new Set();
      for (const entry of Array.isArray(message.toolCalls) ? message.toolCalls : []) {
        if (!isRecord(entry)) continue;
        const callId = entry.id ?? `${message.id}:${recorded.size}`;
        recorded.add(callId);
        call({ id: callId, name: entry.name, args: entry.args, ts: entry.timestamp ?? ts });
        if (TERMINAL.has(entry.status) || entry.result) {
          const text = resultText(entry.result, entry.resultDisplay) || (entry.status === 'cancelled' ? 'Cancelled.' : '');
          result(callId, { text, isError: entry.status === 'error' || entry.status === 'cancelled', ts: entry.timestamp ?? ts });
        }
      }
      // Calls only in the content (their results arrive as a later synthetic user message).
      for (const part of parts) {
        const fn = part.functionCall;
        if (!isRecord(fn) || (fn.id != null && recorded.has(fn.id))) continue;
        call({ id: fn.id ?? `${message.id}:${fn.name}`, name: fn.name, args: fn.args, ts });
      }
    }
  }
  return list.items;
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    summary = (await list({ ...ctx, includeSubagents: true })).find(entry => entry.sourceId === sourceId) ?? null;
  }
  if (!summary) throw new Error('Gemini CLI session not found.');
  const chat = await readChat(summary.sourcePath);
  if (!chat) throw new Error('Gemini CLI session could not be read.');
  return makeSession({ ...summary, firstPrompt: summary.firstPrompt || oneLine(firstPromptOf(chat.messages)) }, itemsOf(chat.messages));
}
