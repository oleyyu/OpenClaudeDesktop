// Cursor agent CLI: ~/.cursor/chats/<md5(cwd)>/<chatId>/store.db — formats.md "凭文档". Experimental and partial: no
// local chats; the store is content-addressed and largely undocumented, so this reads what it can, best effort, and
// marks every session fidelity 'partial'. Verified on synthetic stores only.
//
//   store.db  SQLite. meta(key, value): value is JSON, or hex-encoded JSON, {agentId, name, createdAt, lastUsedModel,
//             latestRootBlobId, mode}; blobs(id, data): content-addressed blobs. Message blobs are JSON
//             {role: user | assistant | tool | system, content (string or parts [{type:'text', text} |
//             {type:'tool-call', toolCallId, toolName, args} | {type:'tool-result', toolCallId, result} |
//             {type:'reasoning', text}])}; other blobs (the binary tree that orders them) are skipped, and messages are
//             taken in blob insertion order (rowid).
import path from 'node:path';
import { ItemList, isRecord, makeSession, makeSummary, parseJson, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, closeDatabase, homeOf, isExcluded, listDir, mapLimit, openDatabase, statOf, tableColumns } from './shared.mjs';

export const id = 'cursor';
export const label = 'Cursor';
export const experimental = true;

const chatsDir = ctx => path.join(homeOf(ctx), '.cursor', 'chats');
export const roots = ctx => [chatsDir(ctx)];

function decodeValue(value) {
  if (value == null) return null;
  const text = Buffer.isBuffer(value) || value instanceof Uint8Array ? Buffer.from(value).toString('utf8') : String(value);
  const direct = parseJson(text);
  if (direct !== undefined) return direct;
  if (/^[0-9a-f]+$/i.test(text) && text.length % 2 === 0) return parseJson(Buffer.from(text, 'hex').toString('utf8')) ?? null;
  return null;
}

function metaOf(db) {
  const meta = {};
  try {
    for (const row of db.prepare('SELECT key, value FROM meta').all()) {
      const value = decodeValue(row.value);
      if (isRecord(value)) Object.assign(meta, value); else meta[row.key] = value;
    }
  } catch {}
  return meta;
}
function messagesOf(db) {
  if (!tableColumns(db, 'blobs').size) return [];
  const out = [];
  try {
    for (const row of db.prepare('SELECT data FROM blobs ORDER BY rowid').iterate()) {
      const value = decodeValue(row.data);
      if (isRecord(value) && ['user', 'assistant', 'tool', 'system'].includes(value.role)) out.push(value);
    }
  } catch {}
  return out;
}

/** Cursor message blobs → items (exported for tests). */
export function itemsOf(messages) {
  const list = new ItemList();
  for (const message of messages) {
    const parts = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : Array.isArray(message.content) ? message.content : [];
    if (message.role === 'system') { list.push('injected', { parts: [{ text: textOfBlocks(parts) }] }); continue; }
    if (message.role === 'user') { list.push('user', { parts: parts.filter(part => part?.type === 'text').map(part => ({ text: part.text })) }); continue; }
    for (const part of parts) {
      if (part?.type === 'text' && message.role === 'assistant') list.push('assistant', { parts: [{ text: part.text }] });
      else if (part?.type === 'reasoning') list.push('reasoning', { reasoning: { text: part.text ?? '' } });
      else if (part?.type === 'tool-call') list.toolCall({ callId: part.toolCallId, name: part.toolName, raw: part.args ?? {} });
      else if (part?.type === 'tool-result') list.toolResult({ callId: part.toolCallId, text: typeof part.result === 'string' ? part.result : JSON.stringify(part.result ?? ''), isError: part.isError === true });
    }
  }
  return list.items;
}

async function storeSummary(file, cwdKey) {
  const stat = await statOf(file);
  const db = stat ? await openDatabase(file) : null;
  if (!db) return null;
  try {
    const meta = metaOf(db), messages = messagesOf(db);
    const first = messages.find(message => message.role === 'user');
    if (!first) return null;
    return makeSummary('cursor', `${cwdKey}/${path.basename(path.dirname(file))}`, {
      sourcePath: file, title: meta.name ?? '', firstPrompt: textOfBlocks(first.content),
      model: meta.lastUsedModel, createdAt: meta.createdAt, updatedAt: stat.mtimeMs, fidelity: 'partial',
      messageCount: messages.filter(message => message.role === 'user' || message.role === 'assistant').length,
      warnings: ['Cursor chats are read best effort: the message order may differ from Cursor.'],
    });
  } finally { closeDatabase(db); }
}

export async function list(ctx = {}) {
  try {
    const files = [];
    for (const project of await listDir(chatsDir(ctx))) {
      if (!project.isDirectory()) continue;
      for (const chat of await listDir(path.join(chatsDir(ctx), project.name))) if (chat.isDirectory()) files.push({ file: path.join(chatsDir(ctx), project.name, chat.name, 'store.db'), cwdKey: project.name });
    }
    const out = await mapLimit(files.filter(entry => !isExcluded(entry.file, ctx.exclude)), CONCURRENCY, entry => storeSummary(entry.file, entry.cwdKey));
    return out.filter(Boolean);
  } catch (error) {
    ctx.warn?.('cursor', String(error?.message || error));
    return [];
  }
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    const [cwdKey, chatId] = String(sourceId ?? '').split('/');
    if (cwdKey && chatId && !cwdKey.includes('..') && !chatId.includes('..')) summary = await storeSummary(path.join(chatsDir(ctx), cwdKey, chatId, 'store.db'), cwdKey);
  }
  if (!summary) throw new Error('Cursor chat not found.');
  const db = await openDatabase(summary.sourcePath);
  if (!db) throw new Error('The Cursor chat store could not be opened.');
  try { return makeSession(summary, itemsOf(messagesOf(db))); } finally { closeDatabase(db); }
}
