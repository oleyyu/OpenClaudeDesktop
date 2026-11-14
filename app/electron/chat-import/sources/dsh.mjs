// DeepSeek Harness (dsh CLI and the DeepSeek core's bridge): ~/.dsh/sessions — formats.md "dsh", from the sources in
// vendor/deepseek-harness/packages/session/session-persistence-jsonl/src/format.ts (layout, header) and zstd.ts, and the
// bridge's own projection (harness/packages/codex-app-server/src/projection.js: how each event shows in a thread).
// Not verified on this machine's data: a local scope guard fences ~/.dsh off from agent sessions.
//
//   layout   sessions/<projectKey(cwd) | _no-cwd>/<encodeSegment(id)>/session.jsonl[.zstd] (v0) or session.vN.jsonl[.zstd];
//            the highest version is the live generation.
//   encoding One JSON record per line; `.zstd` files are zstd frames appended back to back (one per batch), the last one
//            possibly still being written (shared.mjs decodeZstdFrames drops it).
//   header   first line {type:'session', version, id, createdAt, cwd?, parentSession?, origin?:'subagent', delegationDepth,
//            isSeeded}; origin 'subagent' is a delegated child (excluded unless includeSubagents); a seeded session
//            without it is a user fork whose copied parent history (before `session/end-seed {inherited:true}`) is
//            part of the conversation, while a sub-agent's copy is hidden (projection inheritedHistory 'hide').
//   events   {type, seq, time, data}: user/message {id, content[], source} (source.kind 'user' is the person; other
//            kinds are runtime notices / injected context; 'code-desktop-rewind' cuts the turns after
//            source.boundarySeq); assistant/message {turn, step, message:{content:[text | reasoning | tool-call {id, name,
//            arguments}], source:{model}}} (reasoning is plain text); tool/call {callId, name, arguments,
//            effectiveArguments}; tool/result {message:{toolCallId, content, isError}}; compaction/summary {summary[]};
//            session/title {title} (the last wins); image blocks {type:'image', attachment} name ~/.dsh/attachments.
//   lease    The session lease is never taken: the file is only read.
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ItemList, isRecord, makeSession, makeSummary, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, cachedSummary, decodeZstdFrames, envOf, homeOf, isExcluded, listDir, mapLimit, parseLine, statOf } from './shared.mjs';

export const id = 'dsh';
export const label = 'DeepSeek Harness';
export const experimental = false;

const sessionRoots = ctx => {
  const env = envOf(ctx);
  return [...(env.DSH_HOME ? [path.join(env.DSH_HOME, 'sessions')] : []), path.join(homeOf(ctx), '.dsh', 'sessions')];
};
export const roots = ctx => sessionRoots(ctx);

const GENERATION = /^session(?:\.v(\d+))?\.jsonl(\.zstd)?$/;
const REWIND_SOURCE = 'code-desktop-rewind';
const FULL_DECODE_BYTES = 8 * 1024 * 1024;

/** The live generation file of a session directory (highest version; compressed preferred on a tie). */
async function generationFile(dir) {
  let best = null;
  for (const entry of await listDir(dir)) {
    const match = entry.isFile() && GENERATION.exec(entry.name);
    if (!match) continue;
    const rank = Number(match[1] ?? 0) * 2 + (match[2] ? 1 : 0);
    if (!best || rank > best.rank) best = { file: path.join(dir, entry.name), rank };
  }
  return best?.file ?? null;
}

/** Records of a session log (all frames, or the first `maxFrames` for a cheap look at a large file). */
export async function readSessionRecords(file, { maxFrames } = {}) {
  const buffer = await fsp.readFile(file);
  let text, partial = false;
  if (file.endsWith('.zstd')) {
    const decoded = decodeZstdFrames(buffer, maxFrames ? { maxFrames } : {});
    text = decoded.data.toString('utf8');
    partial = decoded.partial && !maxFrames;
  } else text = buffer.toString('utf8');
  const records = [];
  for (const line of text.split('\n')) {
    const record = parseLine(line);
    if (record !== undefined) records.push(record);
  }
  return { records, partial };
}

const isPerson = data => data?.source?.kind === 'user';

function summarize(file, stat, records) {
  const header = records[0]?.type === 'session' ? records[0] : null;
  if (!header?.id) return null;
  let title = '', firstPrompt = '', updatedAt = null, model = null, messages = 0;
  for (const record of records) {
    if (record.type === 'session/title' && typeof record.data?.title === 'string' && record.data.title) title = record.data.title;
    if (record.type === 'user/message' && isPerson(record.data)) { messages++; if (!firstPrompt) firstPrompt = textOfBlocks(record.data.content); }
    if (record.type === 'assistant/message') { messages++; model = record.data?.message?.source?.model ?? model; }
    if (record.type === 'assistant/stream-start' && record.data?.model) model = record.data.model;
    if (Number.isFinite(record.time) && (record.type === 'user/message' || record.type === 'assistant/message' || record.type === 'turn/end')) updatedAt = record.time;
  }
  return {
    sessionId: header.id, title, firstPrompt, cwd: header.cwd ?? null, model, createdAt: header.createdAt, updatedAt: updatedAt ?? stat.mtimeMs,
    isSubagent: header.origin === 'subagent', parentId: header.parentSession ?? null, messageCount: messages, empty: !firstPrompt && !messages,
  };
}

async function sessionDirs(ctx) {
  const out = [];
  for (const root of sessionRoots(ctx)) {
    for (const project of await listDir(root)) {
      if (!project.isDirectory()) continue;
      for (const session of await listDir(path.join(root, project.name))) if (session.isDirectory()) out.push(path.join(root, project.name, session.name));
    }
  }
  return out;
}

export async function list(ctx = {}) {
  const dirs = await sessionDirs(ctx);
  const summaries = await mapLimit(dirs, CONCURRENCY, async dir => {
    const file = await generationFile(dir);
    if (!file || isExcluded(file, ctx.exclude)) return null;
    const stat = await statOf(file);
    if (!stat) return null;
    const base = await cachedSummary(ctx, file, async () => {
      // A large log: the first frames give the header and first prompt; title and activity then come from mtime.
      const large = stat.size > FULL_DECODE_BYTES;
      const { records } = await readSessionRecords(file, large ? { maxFrames: 4 } : {});
      const summary = summarize(file, stat, records);
      return summary && large ? { ...summary, updatedAt: stat.mtimeMs, messageCount: undefined } : summary;
    }, stat);
    if (!base || base.empty) return null;
    if (base.isSubagent && !ctx.includeSubagents) return null;
    return makeSummary('dsh', base.sessionId, { ...base, sourcePath: file });
  });
  const byKey = new Map();
  for (const summary of summaries) if (summary && (!byKey.has(summary.key) || summary.updatedAt > byKey.get(summary.key).updatedAt)) byKey.set(summary.key, summary);
  return [...byKey.values()];
}

function imagePart(block) {
  const attachment = isRecord(block?.attachment) ? block.attachment : {};
  return { image: { mime: attachment.mimeType ?? attachment.mime ?? attachment.mediaType ?? 'image/*', ...(attachment.path ? { path: attachment.path } : {}), ...(attachment.id ? { url: `dsh-attachment:${attachment.id}` } : {}) } };
}
function contentParts(content) {
  const parts = [];
  for (const block of Array.isArray(content) ? content : typeof content === 'string' ? [{ type: 'text', text: content }] : []) {
    if (block?.type === 'text' && typeof block.text === 'string') parts.push({ text: block.text });
    else if (block?.type === 'image') parts.push(imagePart(block));
    else if (block?.type === 'file') parts.push({ file: { name: block.attachment?.name ?? block.attachment?.filename ?? 'file', ...(block.attachment?.path ? { path: block.attachment.path } : {}), ...(block.attachment?.mimeType ? { mime: block.attachment.mimeType } : {}) } });
  }
  return parts;
}

/** Session records → items (exported for tests). */
export function itemsOf(records, { hideInherited = false } = {}) {
  const list = new ItemList();
  const seqOf = new Map(); // item → event seq (a rewind drops the items after its boundary)
  const calls = new Set(), seenBlocks = new Set();
  let model = null;
  const track = (item, record) => { if (item) seqOf.set(item, record.seq); };
  for (const record of records) {
    const data = record.data ?? {}, ts = record.time;
    switch (record.type) {
      case 'session/end-seed':
        if (data.inherited === true && hideInherited) { list.items.length = 0; seqOf.clear(); calls.clear(); seenBlocks.clear(); }
        break;
      case 'assistant/stream-start': if (data.model) model = data.model; break;
      case 'user/message': {
        if (data.source?.kind === REWIND_SOURCE && Number.isInteger(data.source.boundarySeq)) {
          const boundary = data.source.boundarySeq;
          list.items = list.items.filter(item => !(seqOf.get(item) > boundary));
          list.items.forEach((item, seq) => { item.seq = seq; });
          break;
        }
        track(list.push(isPerson(data) ? 'user' : 'injected', { ts, parts: contentParts(data.content) }), record);
        break;
      }
      case 'assistant/message': {
        const blocks = data.message?.content ?? [];
        const streamed = Array.isArray(data.stream) && data.stream.length > 0;
        model = data.message?.source?.model ?? model;
        blocks.forEach((block, index) => {
          // A streamed response commits segments; one block may be committed again whole: show it once.
          const signature = streamed ? `${data.turn}.${data.step}:${block?.type}:${block?.text ?? block?.id ?? index}` : null;
          if (signature && seenBlocks.has(signature)) return;
          if (signature) seenBlocks.add(signature);
          if (block?.type === 'text') track(list.push('assistant', { ts, parts: [{ text: block.text ?? '' }] }), record);
          else if (block?.type === 'reasoning' && block.text) track(list.push('reasoning', { ts, reasoning: { text: block.text } }), record);
          else if (block?.type === 'tool-call' && block.id && !calls.has(block.id)) { calls.add(block.id); track(list.toolCall({ callId: block.id, name: block.name, raw: block.arguments, ts }), record); }
        });
        break;
      }
      case 'tool/call':
        if (data.callId && !calls.has(data.callId)) { calls.add(data.callId); track(list.toolCall({ callId: data.callId, name: data.name, raw: data.effectiveArguments ?? data.arguments, ts }), record); }
        break;
      case 'tool/result': {
        const message = data.message ?? {};
        track(list.toolResult({ callId: message.toolCallId, text: textOfBlocks(message.content), isError: message.isError === true, ts }), record);
        break;
      }
      case 'compaction/summary': {
        const summary = (Array.isArray(data.summary) ? data.summary : []).map(block => (block?.type === 'text' ? block.text : '')).filter(Boolean).join('\n\n');
        track(list.push('compaction', { ts, compaction: { summary: summary || null } }), record);
        break;
      }
      default: break;
    }
  }
  return { items: list.items.map((item, seq) => ({ ...item, seq })), model };
}

async function locate(sessionId, ctx) {
  for (const dir of await sessionDirs(ctx)) {
    const file = await generationFile(dir);
    if (!file) continue;
    if (path.basename(dir) === sessionId) return file;
  }
  // Encoded ids differ from raw ones only for unsafe characters: fall back to reading headers.
  for (const dir of await sessionDirs(ctx)) {
    const file = await generationFile(dir);
    if (!file) continue;
    const { records } = await readSessionRecords(file, { maxFrames: 1 }).catch(() => ({ records: [] }));
    if (records[0]?.id === sessionId) return file;
  }
  return null;
}

export async function read(target, ctx = {}) {
  const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
  const file = (typeof target === 'object' && target?.sourcePath) || await locate(String(sourceId ?? ''), ctx);
  if (!file) throw new Error('DeepSeek Harness session not found.');
  const stat = await statOf(file);
  const { records, partial } = await readSessionRecords(file);
  const base = summarize(file, stat, records);
  if (!base) throw new Error('The DeepSeek Harness session has no header.');
  const summary = typeof target === 'object' && target?.key ? target : makeSummary('dsh', base.sessionId, { ...base, sourcePath: file });
  const { items, model } = itemsOf(records, { hideInherited: base.isSubagent });
  return makeSession({ ...summary, model: summary.model || model }, items, partial ? ['The log ends in an incomplete compressed frame; the last events were skipped.'] : []);
}
