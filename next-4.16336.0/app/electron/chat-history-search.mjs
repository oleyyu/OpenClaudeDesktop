// w13-chatfn-memory: the local history index behind "Search and reference chats" (agent-tools/past-chats.mjs), the
// memory synthesis (chat-memory.mjs) and, later, full-text search on a core without thread/search (w13-chatfn-history).
//
// The official Chat asks claude.ai: conversation/search/v2 (shared-182 NO: `query` at most AO = 10000 characters, `n`
// clamped to 1…kO = 200, optional project_uuid) and the recent_chats tool. Locally the conversations are the core's
// threads, so their text is read with thread/read {includeTurns} and kept in <userData>/chat-index/<thread>.json; an
// entry is read again only when the thread's updatedAt moved (incremental). A core with capabilities.threadSearch
// (Codex thread/search) is asked first; its matches are filtered to the same candidate threads.
//
// createChatHistorySearch({ dir, threads, request, supportsThreadSearch, fs? })
//   threads(): [{ id, title, updatedAt (seconds), surface, projectId, archived }] — only the threads the caller allows
//              (main: the user's Chat sessions, plus Cowork while memory reads Cowork; never incognito, never Code).
//   request(method, params): the core request (thread/read, thread/search).
import fsModule from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const SEARCH_MAX_RESULTS = 200; // shared-182 kO
export const QUERY_MAX_CHARS = 10000; // shared-182 AO
export const MESSAGE_MAX_CHARS = 20000;
export const SNIPPET_CHARS = 300;
export const INDEX_VERSION = 1;

const clamp = (value, min, max, fallback) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : fallback;
const clip = (text, max) => { const value = String(text ?? '').trim(); return value.length > max ? `${value.slice(0, max)}…` : value; };

/** The user and assistant text of a thread/read's turns: [{ role: 'user'|'assistant', text, turnId }]. */
export function threadMessages(turns = []) {
  const out = [];
  for (const turn of Array.isArray(turns) ? turns : []) for (const item of Array.isArray(turn?.items) ? turn.items : []) {
    let role = null, text = '';
    if (item?.type === 'userMessage') {
      role = 'user';
      text = (Array.isArray(item.content) ? item.content : []).map(part => part?.type === 'text' && typeof part.text === 'string' ? part.text : '').filter(Boolean).join('\n');
      // The app's hidden reminders and attached documents are not what the user said.
      text = text.replace(/<system-reminder>[\s\S]*?(?:<\/system-reminder>|$)/g, '').replace(/\n*<document [^>]*>[\s\S]*?<\/document>/g, '');
    } else if (item?.type === 'agentMessage' && typeof item.text === 'string') { role = 'assistant'; text = item.text; }
    if (!role) continue;
    text = clip(text, MESSAGE_MAX_CHARS);
    if (text) out.push({ role, text, turnId: typeof turn?.id === 'string' ? turn.id : null });
  }
  return out;
}

/** Search terms: lower-cased words; a run of CJK characters becomes its character bigrams (no spaces between words). */
export function searchTerms(query) {
  const value = String(query ?? '').slice(0, QUERY_MAX_CHARS).toLowerCase();
  const terms = new Set();
  for (const match of value.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+|[\p{L}\p{N}_]+/gu)) {
    const word = match[0];
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u.test(word)) {
      const chars = [...word];
      if (chars.length === 1) terms.add(word);
      for (let i = 0; i + 1 < chars.length; i++) terms.add(chars[i] + chars[i + 1]);
    } else if (word.length > 1 || /\p{N}/u.test(word)) terms.add(word);
  }
  return [...terms].slice(0, 64);
}

const occurrences = (haystack, needle) => { let count = 0, at = haystack.indexOf(needle); while (at >= 0 && count < 50) { count++; at = haystack.indexOf(needle, at + needle.length); } return count; };

/** The text around the first match (or the start), on one line, at most SNIPPET_CHARS. */
export function snippetFor(text, terms = []) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  const lower = flat.toLowerCase();
  const at = terms.map(term => lower.indexOf(term)).filter(index => index >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 80);
  const piece = flat.slice(start, start + SNIPPET_CHARS);
  return `${start > 0 ? '…' : ''}${piece}${start + SNIPPET_CHARS < flat.length ? '…' : ''}`;
}

/** BM25-style scores of indexed threads for the terms: [{ id, score, message }] best first. */
export function rankThreads(entries, terms) {
  if (!terms.length) return [];
  const docs = entries.map(entry => ({ entry, text: `${entry.title ?? ''}\n${(entry.messages ?? []).map(message => message.text).join('\n')}`.toLowerCase() }));
  const average = docs.reduce((sum, doc) => sum + doc.text.length, 0) / Math.max(1, docs.length) || 1;
  const df = new Map(terms.map(term => [term, docs.filter(doc => doc.text.includes(term)).length]));
  const k1 = 1.2, b = 0.75;
  const ranked = [];
  for (const doc of docs) {
    let score = 0;
    for (const term of terms) {
      const tf = occurrences(doc.text, term);
      if (!tf) continue;
      const idf = Math.log(1 + (docs.length - df.get(term) + 0.5) / (df.get(term) + 0.5));
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc.text.length / average));
    }
    if (score <= 0) continue;
    // The message that matches most is the snippet's source.
    let best = null, bestHits = 0;
    for (const message of doc.entry.messages ?? []) {
      const lower = message.text.toLowerCase();
      const hits = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
      if (hits > bestHits) { best = message; bestHits = hits; }
    }
    ranked.push({ id: doc.entry.id, score, message: best, updatedAt: doc.entry.updatedAt ?? 0 });
  }
  return ranked.sort((a, b) => b.score - a.score || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

const fileName = id => /^[A-Za-z0-9_-]{1,120}$/.test(id) ? `${id}.json` : `${crypto.createHash('sha256').update(id).digest('hex').slice(0, 40)}.json`;
const seconds = value => {
  if (Number.isFinite(value)) return value > 1e11 ? Math.floor(value / 1000) : value;
  if (typeof value === 'string' && value) { const parsed = Date.parse(value); return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null; }
  return null;
};

export function createChatHistorySearch({ dir, threads, request, supportsThreadSearch = () => false, fs = fsModule }) {
  const memory = new Map(); // id → entry (this run's cache of the files)

  function readEntry(id) {
    if (memory.has(id)) return memory.get(id);
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, fileName(id)), 'utf8'));
      if (entry?.version === INDEX_VERSION && entry.id === id && Array.isArray(entry.messages)) { memory.set(id, entry); return entry; }
    } catch {}
    return null;
  }
  function writeEntry(entry) {
    memory.set(entry.id, entry);
    try {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const file = path.join(dir, fileName(entry.id)), temp = `${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp, JSON.stringify(entry), { mode: 0o600 });
      fs.renameSync(temp, file);
    } catch {}
  }

  /** The thread's indexed entry, read again from the core when its updatedAt moved (or it was never read). */
  async function entryFor(thread) {
    const cached = readEntry(thread.id);
    if (cached && cached.updatedAt === (thread.updatedAt ?? null)) return { ...cached, title: thread.title ?? cached.title };
    let read;
    try { read = await request('thread/read', { threadId: thread.id, includeTurns: true }); }
    catch { return cached ? { ...cached, title: thread.title ?? cached.title } : null; }
    const entry = { version: INDEX_VERSION, id: thread.id, updatedAt: thread.updatedAt ?? null, title: thread.title ?? null, messages: threadMessages(read?.thread?.turns) };
    writeEntry(entry);
    return entry;
  }

  /** The candidate threads in scope: projectId undefined = every one, null = outside projects, a string = that project. */
  function candidates({ projectId, excludeThreadId = null } = {}) {
    let list = [];
    try { list = Array.isArray(threads()) ? threads() : []; } catch { list = []; }
    return list.filter(thread => thread && typeof thread.id === 'string' && thread.id !== excludeThreadId
      && (projectId === undefined || (projectId === null ? !thread.projectId : thread.projectId === projectId)));
  }

  const view = (thread, snippet, extra = {}) => ({ id: thread.id, title: thread.title || null, updatedAt: thread.updatedAt ?? null,
    ...(thread.projectId ? { projectId: thread.projectId } : {}), ...(thread.surface ? { surface: thread.surface } : {}), snippet, ...extra });

  /** search(query, { n, projectId, excludeThreadId }) → [{ id, title, updatedAt, snippet }] best first, at most n (≤ 200). */
  async function search(query, { n = 10, projectId, excludeThreadId = null } = {}) {
    const text = String(query ?? '').trim().slice(0, QUERY_MAX_CHARS);
    const limit = clamp(n, 1, SEARCH_MAX_RESULTS, 10);
    if (!text) return [];
    const pool = candidates({ projectId, excludeThreadId });
    if (!pool.length) return [];
    const byId = new Map(pool.map(thread => [thread.id, thread]));
    if (supportsThreadSearch()) {
      try {
        const found = await request('thread/search', { searchTerm: text.slice(0, 200), limit: SEARCH_MAX_RESULTS });
        const rows = [];
        for (const match of Array.isArray(found?.data) ? found.data : []) {
          const thread = byId.get(match?.thread?.id);
          if (!thread || rows.some(row => row.id === thread.id)) continue;
          rows.push(view(thread, clip(match.snippet, SNIPPET_CHARS)));
          if (rows.length >= limit) break;
        }
        return rows;
      } catch { /* the local index answers instead */ }
    }
    const terms = searchTerms(text);
    const entries = [];
    for (const thread of pool) { const entry = await entryFor(thread); if (entry) entries.push({ ...entry, updatedAt: thread.updatedAt ?? null }); }
    return rankThreads(entries, terms).slice(0, limit).map(hit => view(byId.get(hit.id), snippetFor(hit.message?.text ?? '', terms), { score: Number(hit.score.toFixed(4)) }));
  }

  /** recent({ n, before, after, sortOrder, projectId, excludeThreadId }) → threads by updatedAt with their last messages. */
  async function recent({ n = 3, before = null, after = null, sortOrder = 'desc', projectId, excludeThreadId = null, messages = 4 } = {}) {
    const limit = clamp(n, 1, SEARCH_MAX_RESULTS, 3);
    const upper = seconds(before), lower = seconds(after);
    const pool = candidates({ projectId, excludeThreadId })
      .filter(thread => (upper === null || (thread.updatedAt ?? 0) < upper) && (lower === null || (thread.updatedAt ?? 0) > lower))
      .sort((a, b) => sortOrder === 'asc' ? (a.updatedAt ?? 0) - (b.updatedAt ?? 0) : (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, limit);
    const rows = [];
    for (const thread of pool) {
      const entry = await entryFor(thread);
      const last = (entry?.messages ?? []).slice(-Math.max(1, messages)).map(message => ({ role: message.role, text: clip(message.text, 1200) }));
      rows.push(view(thread, snippetFor(last.map(message => message.text).join(' '), []), { messages: last }));
    }
    return rows;
  }

  /** The full indexed messages of the given threads (memory synthesis), most recent threads first. */
  async function transcripts({ n = 40, projectId, surfaces = null } = {}) {
    const pool = candidates({ projectId }).filter(thread => !surfaces || surfaces.includes(thread.surface ?? 'chat'))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, clamp(n, 1, SEARCH_MAX_RESULTS, 40));
    const out = [];
    for (const thread of pool) { const entry = await entryFor(thread); if (entry?.messages?.length) out.push({ id: thread.id, title: thread.title ?? null, updatedAt: thread.updatedAt ?? null, messages: entry.messages }); }
    return out;
  }

  /** Drops a thread's index entry (its session was deleted). */
  function remove(id) {
    memory.delete(id);
    try { fs.rmSync(path.join(dir, fileName(String(id))), { force: true }); } catch {}
  }
  /** Drops the whole index. */
  function clear() {
    memory.clear();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }

  return { search, recent, transcripts, remove, clear, entryFor, candidates };
}
