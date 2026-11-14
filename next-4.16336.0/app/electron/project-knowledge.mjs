// w13-chatfn-projects: a local project's knowledge (official 3.6556.2 claude.ai project knowledge, research/w13-chatfn.md
// P1: projects/{id}/docs, projects/{id}/files, projects/{id}/upload, projects/{id}/kb/stats). OpenClaude Desktop keeps it
// on disk instead of claude.ai:
//
//   <userData>/project-knowledge/<projectId>/index.json         the file list (newest last)
//   <userData>/project-knowledge/<projectId>/files/<fileId>      the file the user added (a copy, kept as added)
//   <userData>/project-knowledge/<projectId>/text/<fileId>.txt   its text (read as UTF-8, or document-convert.cjs)
//
// The store sits outside <userData>/projects/: a project created without a folder works in <userData>/projects/<id>
// (local-projects.mjs), and its Cowork sessions may write there. Knowledge text goes into a Chat session's
// instructions, so a session must never be able to rewrite it; only the main process's knowledge-add / -remove do.
//
// Capacity (c52b32660 ge): the knowledge is measured in tokens against maxKbTokens, "currently limited to Claude’s
// maximum context window size"; at 100% the official uploader refuses ("Project knowledge at capacity…", shared-3
// "Failed to upload file {filename}. Project knowledge exceeds maximum. Remove files to continue."). Below
// INLINE_MAX_CHARS the whole knowledge goes into the session's instructions (chat-context/project-knowledge.mjs);
// above it only the file list does, and Claude reads it with project_knowledge_search (the official "Search mode").
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Claude's context window, the official capacity (c52b32660 aAeavdIV/P). */
export const MAX_KB_TOKENS = 200000;
/** One file the user adds, at most (the copy kept in the knowledge folder). */
export const MAX_FILE_BYTES = 32 * 1024 * 1024;
/** Files in one project's knowledge, at most. */
export const MAX_FILES = 500;
/** Knowledge text up to this size is given to the session whole; past it, the file list and the search tool. */
export const INLINE_MAX_CHARS = 20000;
/** project_knowledge_search: passage size and result count. */
export const PASSAGE_CHARS = 1500;
export const DEFAULT_RESULTS = 5;
export const MAX_RESULTS = 20;
/** Plain-text files read as they are (anything else that document-convert.cjs converts goes through it). */
export const TEXT_EXTENSIONS = Object.freeze(['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'yaml', 'yml', 'xml', 'toml', 'ini', 'log',
  'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp', 'cs', 'php', 'sh', 'zsh',
  'sql', 'css', 'scss', 'less', 'vue', 'svelte', 'tex', 'rst', 'srt', 'vtt']);

const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;
const FILE_ID = /^[a-f0-9-]{36}$/;
/** A rough token count (≈4 characters a token), as the capacity bar measures. */
export const estimateTokens = text => Math.ceil(String(text ?? '').length / 4);
const extensionOf = name => { const dot = name.lastIndexOf('.'); return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''; };

/** Where every project's knowledge is kept; never inside a project's working directory (see above). */
export function knowledgeRoot(dataDir) {
  if (typeof dataDir !== 'string' || !path.isAbsolute(dataDir)) throw new Error('Project knowledge is unavailable.');
  return path.join(dataDir, 'project-knowledge');
}

export function knowledgeDir(dataDir, projectId) {
  const root = knowledgeRoot(dataDir);
  if (typeof projectId !== 'string' || !PROJECT_ID.test(projectId)) throw new Error('Project not found.');
  return path.join(root, projectId);
}

/** True when `folder` is the knowledge store or inside it (a project may not work there). */
export function insideKnowledge(dataDir, folder) {
  if (typeof folder !== 'string' || !path.isAbsolute(folder)) return false;
  const relative = path.relative(knowledgeRoot(dataDir), path.resolve(folder));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// One write at a time per project (add / remove rewrite index.json).
const queues = new Map();
function serial(key, task) {
  const run = (queues.get(key) ?? Promise.resolve()).then(task, task);
  const tail = run.catch(() => {});
  queues.set(key, tail);
  tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
  return run;
}

async function readIndex(dir) {
  try {
    const value = JSON.parse(await fs.readFile(path.join(dir, 'index.json'), 'utf8'));
    return Array.isArray(value) ? value.filter(entry => entry && FILE_ID.test(entry.id) && typeof entry.name === 'string') : [];
  } catch { return []; }
}
async function writeIndex(dir, entries) {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'index.json'), temporary = `${file}.${process.pid}.${Date.now().toString(36)}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(entries, null, 2));
  await fs.rename(temporary, file);
}

/** The project's knowledge files: [{id, name, type, size, chars, tokens, pages, truncated, addedAt}], in the order added. */
export async function listKnowledge(dataDir, projectId) {
  return readIndex(knowledgeDir(dataDir, projectId));
}

/** c52b32660 ge: {count, tokens, capacity, pctUsed (ceil), over (≥100%), searchMode (past INLINE_MAX_CHARS)}. */
export function statsOf(entries, { capacity = MAX_KB_TOKENS } = {}) {
  const tokens = entries.reduce((sum, entry) => sum + (Number(entry.tokens) || 0), 0);
  const chars = entries.reduce((sum, entry) => sum + (Number(entry.chars) || 0), 0);
  const pctUsed = tokens ? Math.ceil((tokens / capacity) * 100) : 0;
  return { count: entries.length, tokens, chars, capacity, pctUsed, over: pctUsed >= 100, searchMode: chars > INLINE_MAX_CHARS };
}
export async function knowledgeStats(dataDir, projectId) {
  return statsOf(await listKnowledge(dataDir, projectId));
}

/** A file's text: a plain-text file as UTF-8 (refused when it holds NUL bytes), a document through document-convert.cjs. */
async function extractText(file, { convert }) {
  const type = extensionOf(file);
  if (TEXT_EXTENSIONS.includes(type)) {
    const buffer = await fs.readFile(file);
    if (buffer.includes(0)) return { ok: false, reason: 'unsupported' };
    const text = buffer.toString('utf8').replace(/^﻿/, '');
    return text.trim() ? { ok: true, text, pages: null, truncated: false } : { ok: false, reason: 'empty' };
  }
  const result = await convert(file);
  if (!result?.ok) return { ok: false, reason: result?.reason === 'unsupported' ? 'unsupported' : result?.reason === 'empty' ? 'empty' : 'unreadable' };
  return { ok: true, text: result.text, pages: result.pages ?? null, truncated: result.truncated === true };
}
const defaultConvert = file => require('./document-convert.cjs').convertDocument(file, { internalRoots: [] });

/**
 * Add files the user chose (absolute paths, from the main process's own open dialog) to a project's knowledge.
 * Resolves {added: [entries], failed: [{name, reason}], stats}; reason: invalid | not_found | not_file | too_large |
 * unsupported | empty | unreadable | capacity (the official "Failed to upload file {filename}. Project knowledge
 * exceeds maximum. Remove files to continue.") | limit (MAX_FILES). A failed file leaves nothing behind.
 */
export async function addKnowledge(dataDir, projectId, files, { convert = defaultConvert, now = () => new Date().toISOString(), capacity = MAX_KB_TOKENS } = {}) {
  const dir = knowledgeDir(dataDir, projectId);
  return serial(dir, async () => {
    const entries = await readIndex(dir);
    const added = [], failed = [];
    for (const file of Array.isArray(files) ? files : []) {
      const name = typeof file === 'string' ? path.basename(file) : '';
      if (typeof file !== 'string' || !path.isAbsolute(file) || file.includes('\0') || !name) { failed.push({ name, reason: 'invalid' }); continue; }
      let info;
      try { info = await fs.stat(file); } catch { failed.push({ name, reason: 'not_found' }); continue; }
      if (!info.isFile()) { failed.push({ name, reason: 'not_file' }); continue; }
      if (info.size > MAX_FILE_BYTES) { failed.push({ name, reason: 'too_large' }); continue; }
      if (entries.length >= MAX_FILES) { failed.push({ name, reason: 'limit' }); continue; }
      const id = randomUUID();
      // The copy keeps the name's extension for the converter (document-convert reads the type from it).
      const typed = path.join(dir, 'files', `${id}.${extensionOf(name) || 'bin'}`), textFile = path.join(dir, 'text', `${id}.txt`);
      try {
        await fs.mkdir(path.dirname(typed), { recursive: true });
        await fs.copyFile(file, typed);
        const extracted = await extractText(typed, { convert });
        if (!extracted.ok) { await fs.rm(typed, { force: true }); failed.push({ name, reason: extracted.reason }); continue; }
        const tokens = estimateTokens(extracted.text);
        if (statsOf([...entries, { tokens }], { capacity }).pctUsed > 100) { await fs.rm(typed, { force: true }); failed.push({ name, reason: 'capacity' }); continue; }
        await fs.mkdir(path.dirname(textFile), { recursive: true });
        await fs.writeFile(textFile, extracted.text);
        const entry = { id, name, type: extensionOf(name), size: info.size, chars: extracted.text.length, tokens, pages: extracted.pages,
          truncated: extracted.truncated, file: path.basename(typed), addedAt: now() };
        entries.push(entry); added.push(entry);
      } catch {
        await fs.rm(typed, { force: true }).catch(() => {});
        await fs.rm(textFile, { force: true }).catch(() => {});
        failed.push({ name, reason: 'unreadable' });
      }
    }
    if (added.length) await writeIndex(dir, entries);
    return { added, failed, stats: statsOf(entries, { capacity }) };
  });
}

/**
 * w13-chatfn-artifacts (chatfn-30): add text the app already holds — a Chat artifact's "Add to project" (ca2ef848d j2:
 * `new File([text], name)` through the project upload) — without a file dialog. `name` is a plain file name (its
 * extension is the entry's type); the text is kept as the copy and as the knowledge text. Same result shape and
 * refusals as addKnowledge (invalid | too_large | empty | limit | capacity).
 */
export async function addKnowledgeText(dataDir, projectId, { name, text } = {}, { now = () => new Date().toISOString(), capacity = MAX_KB_TOKENS } = {}) {
  const dir = knowledgeDir(dataDir, projectId);
  return serial(dir, async () => {
    const entries = await readIndex(dir);
    const label = typeof name === 'string' ? name : '';
    const refuse = reason => ({ added: [], failed: [{ name: label, reason }], stats: statsOf(entries, { capacity }) });
    if (!label || label !== path.basename(label) || label.includes('\0') || label === '.' || label === '..' || typeof text !== 'string') return refuse('invalid');
    const size = Buffer.byteLength(text);
    if (size > MAX_FILE_BYTES) return refuse('too_large');
    if (!text.trim() || text.includes('\0')) return refuse(text.includes('\0') ? 'unsupported' : 'empty');
    if (entries.length >= MAX_FILES) return refuse('limit');
    const tokens = estimateTokens(text);
    if (statsOf([...entries, { tokens }], { capacity }).pctUsed > 100) return refuse('capacity');
    const id = randomUUID();
    const typed = path.join(dir, 'files', `${id}.${extensionOf(label) || 'txt'}`), textFile = path.join(dir, 'text', `${id}.txt`);
    try {
      await fs.mkdir(path.dirname(typed), { recursive: true });
      await fs.writeFile(typed, text);
      await fs.mkdir(path.dirname(textFile), { recursive: true });
      await fs.writeFile(textFile, text);
    } catch {
      await fs.rm(typed, { force: true }).catch(() => {});
      await fs.rm(textFile, { force: true }).catch(() => {});
      return refuse('unreadable');
    }
    const entry = { id, name: label, type: extensionOf(label), size, chars: text.length, tokens, pages: null, truncated: false,
      file: path.basename(typed), addedAt: now() };
    entries.push(entry);
    await writeIndex(dir, entries);
    return { added: [entry], failed: [], stats: statsOf(entries, { capacity }) };
  });
}

/** Remove one knowledge file (its copy and text). Resolves {removed, stats}. */
export async function removeKnowledge(dataDir, projectId, fileId) {
  const dir = knowledgeDir(dataDir, projectId);
  if (typeof fileId !== 'string' || !FILE_ID.test(fileId)) throw new Error('File not found.');
  return serial(dir, async () => {
    const entries = await readIndex(dir);
    const entry = entries.find(item => item.id === fileId);
    if (!entry) throw new Error('File not found.');
    const rest = entries.filter(item => item.id !== fileId);
    await writeIndex(dir, rest);
    if (typeof entry.file === 'string' && entry.file.startsWith(entry.id)) await fs.rm(path.join(dir, 'files', path.basename(entry.file)), { force: true });
    await fs.rm(path.join(dir, 'text', `${entry.id}.txt`), { force: true });
    return { removed: entry.id, stats: statsOf(rest) };
  });
}

/** Every knowledge file with its text: [{entry, text}] (a file whose text went missing is left out). */
export async function readKnowledgeTexts(dataDir, projectId) {
  const dir = knowledgeDir(dataDir, projectId);
  const out = [];
  for (const entry of await readIndex(dir)) {
    try { out.push({ entry, text: await fs.readFile(path.join(dir, 'text', `${entry.id}.txt`), 'utf8') }); } catch {}
  }
  return out;
}

// ── project_knowledge_search: local tokens and a BM25 score over passages ──────────────────────────────────────
const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/u;
const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was', 'with']);
/** Lower-case words and numbers; a run of CJK characters becomes its single characters and bigrams. */
export function tokenize(text) {
  const out = [];
  for (const word of String(text ?? '').toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}_]+/gu) ?? []) {
    if (!CJK.test(word)) { if (!STOPWORDS.has(word)) out.push(word); continue; }
    let run = '';
    const flush = () => {
      const chars = [...run];
      for (let index = 0; index < chars.length; index += 1) {
        out.push(chars[index]);
        if (index + 1 < chars.length) out.push(chars[index] + chars[index + 1]);
      }
      run = '';
    };
    for (const char of word) {
      if (CJK.test(char)) run += char;
      else { if (run) flush(); run = ''; }
    }
    if (run) flush();
    for (const part of word.split(new RegExp(CJK.source, 'gu')).filter(Boolean)) if (!STOPWORDS.has(part)) out.push(part);
  }
  return out;
}

/** A text's passages, about PASSAGE_CHARS each, split at blank lines (a longer paragraph is cut). */
export function passagesOf(text, size = PASSAGE_CHARS) {
  const out = [];
  let current = '';
  for (const paragraph of String(text ?? '').split(/\n\s*\n/)) {
    const part = paragraph.trim();
    if (!part) continue;
    if (current && current.length + part.length + 2 > size) { out.push(current); current = ''; }
    if (part.length > size) {
      for (let index = 0; index < part.length; index += size) out.push(part.slice(index, index + size));
      continue;
    }
    current = current ? `${current}\n\n${part}` : part;
  }
  if (current) out.push(current);
  return out;
}

/** BM25 (k1 1.2, b 0.75) over every passage of `docs` ([{entry, text}]); the best `limit` with a score above 0. */
export function searchPassages(docs, query, { limit = DEFAULT_RESULTS } = {}) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const passages = [];
  for (const { entry, text } of docs) passagesOf(text).forEach((passage, index) => {
    const tokens = tokenize(passage);
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    // The file name counts as part of each of its passages.
    for (const token of tokenize(entry.name)) counts.set(token, (counts.get(token) ?? 0) + 1);
    passages.push({ entry, index, text: passage, length: tokens.length || 1, counts });
  });
  if (!passages.length) return [];
  const average = passages.reduce((sum, item) => sum + item.length, 0) / passages.length;
  const frequency = new Map(terms.map(term => [term, passages.filter(item => item.counts.has(term)).length]));
  const k1 = 1.2, b = 0.75, total = passages.length;
  const scored = passages.map(item => {
    let score = 0;
    for (const term of terms) {
      const tf = item.counts.get(term) ?? 0;
      if (!tf) continue;
      const df = frequency.get(term);
      const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * item.length) / average)));
    }
    return { item, score };
  }).filter(entry => entry.score > 0);
  scored.sort((a, b) => b.score - a.score || a.item.entry.addedAt?.localeCompare?.(b.item.entry.addedAt ?? '') || a.item.index - b.item.index);
  const count = Number.isInteger(limit) ? Math.min(MAX_RESULTS, Math.max(1, limit)) : DEFAULT_RESULTS;
  return scored.slice(0, count).map(({ item, score }) => ({ fileId: item.entry.id, name: item.entry.name, passage: item.index + 1, score: Math.round(score * 1000) / 1000, text: item.text }));
}
export async function searchKnowledge(dataDir, projectId, query, options) {
  return searchPassages(await readKnowledgeTexts(dataDir, projectId), query, options);
}

// ── What a Chat or Cowork session in the project is told (chat-context/project-knowledge.mjs) ─────────────────────
const attribute = value => String(value).replace(/[&"<>]/g, char => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[char]);
const neutral = text => String(text).replace(/<\/document>/gi, '<\\/document>');
export const KNOWLEDGE_HEADER = 'Project knowledge:';
/**
 * The project's knowledge as developer instructions: whole (≤ INLINE_MAX_CHARS of text) or, past that, the file list
 * and the project_knowledge_search tool. null without files.
 */
export async function knowledgeInstructions(dataDir, project) {
  if (!project?.id) return null;
  const docs = await readKnowledgeTexts(dataDir, project.id);
  if (!docs.length) return null;
  const stats = statsOf(docs.map(doc => doc.entry));
  if (!stats.searchMode) {
    return [`${KNOWLEDGE_HEADER} the user added these files to the project “${project.name}”. Refer to them whenever they are relevant to the conversation.`,
      ...docs.map(({ entry, text }) => `<document name="${attribute(entry.name)}">\n${neutral(text.trim())}\n</document>`)].join('\n\n');
  }
  return [`${KNOWLEDGE_HEADER} the user added ${docs.length} ${docs.length === 1 ? 'file' : 'files'} to the project “${project.name}”, too much to include here. `
    + 'Search them with the project_knowledge_search tool before answering anything that may depend on the project’s files, and cite the file names you used.',
    docs.map(({ entry }) => `- ${entry.name}`).join('\n')].join('\n\n');
}
