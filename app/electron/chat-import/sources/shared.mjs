// Read-only I/O helpers shared by the source parsers (formats.md "通用"): every external history is opened read-only,
// a log another process is still appending to may end in a partial line or a partial zstd frame (both tolerated), large
// files are streamed, SQLite is opened {readOnly:true} (no checkpoint, no lock taken beyond the shared read lock), and
// directory scans run with bounded concurrency behind a per-file mtime+size cache owned by catalog.mjs.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { StringDecoder } from 'node:string_decoder';
import zlib from 'node:zlib';

export const isZstdPath = file => /\.(zst|zstd)$/.test(file);

export async function statOf(file) {
  try { return await fsp.stat(file); } catch { return null; }
}
export const exists = async file => !!(await statOf(file));
export async function listDir(dir) {
  try { return await fsp.readdir(dir, { withFileTypes: true }); } catch { return []; }
}
export async function readJsonFile(file) {
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return null; }
}
export function parseLine(line) {
  if (!line || line.charCodeAt(0) !== 123 /* { */) return undefined;
  try { return JSON.parse(line); } catch { return undefined; }
}

// zstd frame magic 0xFD2FB528 (little-endian on disk); skippable frames 0x184D2A50–0x184D2A5F.
const MAGIC = 0xfd2fb528;
/**
 * The byte length of the zstd frame at `start` (RFC 8878 §3.1.1), found by walking its block headers without decoding,
 * or -1 when the buffer ends inside it, or 0 when no frame starts there. Node's zstd decoders (zstdDecompressSync and
 * createZstdDecompress, Node 24–26) stop after the FIRST frame of a buffer, so concatenated frames — dsh appends one per
 * batch (format.ts / zstd.ts) — must be split before decoding.
 */
export function zstdFrameLength(buffer, start = 0) {
  if (start + 4 > buffer.length) return -1;
  const magic = buffer.readUInt32LE(start);
  if ((magic & 0xfffffff0) === 0x184d2a50) {
    if (start + 8 > buffer.length) return -1;
    const length = 8 + buffer.readUInt32LE(start + 4);
    return start + length <= buffer.length ? length : -1;
  }
  if (magic !== MAGIC) return 0;
  if (start + 5 > buffer.length) return -1;
  const descriptor = buffer[start + 4];
  const single = (descriptor >> 5) & 1, checksum = (descriptor >> 2) & 1;
  const fcsSize = [single ? 1 : 0, 2, 4, 8][descriptor >> 6], dictSize = [0, 1, 2, 4][descriptor & 3];
  let at = start + 5 + (single ? 0 : 1) + dictSize + fcsSize;
  for (;;) {
    if (at + 3 > buffer.length) return -1;
    const header = buffer[at] | (buffer[at + 1] << 8) | (buffer[at + 2] << 16);
    const last = header & 1, type = (header >> 1) & 3, size = header >>> 3;
    if (type === 3) return 0; // reserved block type: not a frame
    at += 3 + (type === 1 ? 1 : size);
    if (at > buffer.length) return -1;
    if (last) break;
  }
  at += checksum ? 4 : 0;
  return at <= buffer.length ? at - start : -1;
}
/** [{start, end, complete}] frame spans of a buffer; bytes that are no frame end the walk (left to the decoder). */
export function zstdFrameSpans(buffer) {
  const spans = [];
  let start = 0;
  while (start < buffer.length) {
    const length = zstdFrameLength(buffer, start);
    if (length > 0) { spans.push({ start, end: start + length, complete: true }); start += length; continue; }
    spans.push({ start, end: buffer.length, complete: false });
    break;
  }
  return spans;
}
/**
 * Decode a buffer of concatenated zstd frames frame by frame. A frame still being written at the end (or a damaged
 * tail) is dropped and reported as `partial`; skippable frames produce nothing.
 * @returns {{ data: Buffer, partial: boolean, frames: number }}
 */
export function decodeZstdFrames(buffer, { maxFrames = Infinity } = {}) {
  const out = [];
  let frames = 0, partial = false;
  for (const span of zstdFrameSpans(buffer ?? Buffer.alloc(0))) {
    if (frames >= maxFrames) break;
    if ((buffer.readUInt32LE(span.start) & 0xfffffff0) === 0x184d2a50 && span.complete) continue;
    // An incomplete frame may still yield the blocks that arrived whole: kept (a cut line is dropped by its reader).
    try { out.push(zlib.zstdDecompressSync(buffer.subarray(span.start, span.end))); } catch { partial = true; break; }
    if (!span.complete) { partial = true; break; }
    frames++;
  }
  return { data: Buffer.concat(out), partial, frames };
}

/**
 * Lines of a (possibly zstd-compressed) text log, streamed. A compressed log is read whole (36 MB at most for Codex)
 * and each of its frames decompressed as a stream, so the decompressed text is never held at once. A partial last
 * frame ends the stream quietly (the lines before it are kept; `onPartial` is called); a partial last line is yielded
 * as is (parseLine drops it). Breaking out of the loop closes the file.
 */
export async function* readLines(file, { onPartial } = {}) {
  if (isZstdPath(file)) { yield* zstdLines(file, onPartial); return; }
  const input = fs.createReadStream(file);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    for await (const line of lines) yield line;
  } finally {
    lines.close();
    input.destroy();
  }
}
async function* zstdLines(file, onPartial) {
  let buffer;
  try { buffer = await fsp.readFile(file); } catch { return; }
  const decoder = new StringDecoder('utf8');
  let carry = []; // pieces of the line being completed (a long line spans many chunks: no re-scanning)
  for (const span of zstdFrameSpans(buffer)) {
    if ((buffer.readUInt32LE(span.start) & 0xfffffff0) === 0x184d2a50) continue;
    const stream = zlib.createZstdDecompress();
    const done = new Promise(resolve => { stream.on('end', () => resolve(true)); stream.on('error', () => resolve(false)); });
    stream.end(buffer.subarray(span.start, span.end));
    try {
      for await (const chunk of stream) {
        const text = decoder.write(chunk);
        let from = 0;
        for (let at = text.indexOf('\n'); at >= 0; at = text.indexOf('\n', from)) {
          carry.push(text.slice(from, at));
          yield carry.join('');
          carry = [];
          from = at + 1;
        }
        if (from < text.length) carry.push(text.slice(from));
      }
    } catch { onPartial?.(); return; } finally { stream.destroy(); }
    if (!(await done) || !span.complete) { onPartial?.(); return; }
  }
  carry.push(decoder.end());
  const rest = carry.join('');
  if (rest) yield rest;
}
/** Parsed JSON records of a log (malformed and partial lines skipped). */
export async function* readRecords(file, options) {
  for await (const line of readLines(file, options)) {
    const record = parseLine(line);
    if (record !== undefined) yield record;
  }
}

/** The first `bytes` of a plain text file as complete lines (the cut line dropped). */
export async function readHeadLines(file, bytes = 65536) {
  let handle;
  try {
    handle = await fsp.open(file, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, bytes);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, 0);
    const lines = buffer.toString('utf8').split('\n');
    if (length < size) lines.pop();
    return lines;
  } catch { return []; } finally { await handle?.close().catch(() => {}); }
}
/** The last `bytes` of a plain text file as complete lines (the cut first line dropped). */
export async function readTailLines(file, bytes = 65536) {
  let handle;
  try {
    handle = await fsp.open(file, 'r');
    const { size } = await handle.stat();
    const length = Math.min(size, bytes), start = size - length;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    const lines = buffer.toString('utf8').split('\n');
    if (start > 0) lines.shift();
    return lines;
  } catch { return []; } finally { await handle?.close().catch(() => {}); }
}
/** The first `count` records of a (possibly compressed) log, stopping early. */
export async function readFirstRecords(file, count = 1, { maxLines = count * 50 } = {}) {
  const out = [];
  let lines = 0;
  for await (const line of readLines(file)) {
    if (++lines > maxLines) break;
    const record = parseLine(line);
    if (record !== undefined) out.push(record);
    if (out.length >= count) break;
  }
  return out;
}

// node:sqlite is loaded on first use (Electron 44 = Node 24.21: DatabaseSync with readOnly).
let sqliteModule = null;
async function sqlite() {
  sqliteModule ??= await import('node:sqlite');
  return sqliteModule;
}
/**
 * Open an SQLite database read-only, or null (missing, locked, not a database). A WAL database another process holds
 * open is readable this way; nothing is checkpointed or written. `warn` receives the reason.
 */
export async function openDatabase(file, warn) {
  if (!(await exists(file))) return null;
  try {
    const { DatabaseSync } = await sqlite();
    return new DatabaseSync(file, { readOnly: true, timeout: 1500 });
  } catch (error) {
    warn?.(`${path.basename(file)}: ${error?.message || error}`);
    return null;
  }
}
export function tableColumns(db, table) {
  try { return new Set(db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all().map(row => row.name)); } catch { return new Set(); }
}
export const closeDatabase = db => { try { db?.close(); } catch {} };

// What reading ONE session takes from a SQLite source at most, over all its queries (rows, and characters of their
// text / bytes of their blobs): a session the agent let grow without bound (tens of thousands of tool parts, huge
// outputs) is read up to here, newest first, and marked with SESSION_CAPPED_WARNING. Far past what an import hands any
// model (chat-import targets.mjs budgets), so a capped read loses only what would be trimmed anyway.
export const SESSION_MAX_ROWS = 100_000;
export const SESSION_MAX_BYTES = 64 * 1024 * 1024;
export const SESSION_CAPPED_WARNING = 'Only the newest part of this very long session was read.';
/** A fresh per-session read budget (takeRows spends it); a source's read takes ctx.readBudget {maxRows, maxBytes}. */
export const rowBudget = ({ maxRows = SESSION_MAX_ROWS, maxBytes = SESSION_MAX_BYTES } = {}) => ({ rows: 0, bytes: 0, maxRows, maxBytes, capped: false });
const rowSize = row => {
  let size = 0;
  for (const value of Object.values(row ?? {})) size += typeof value === 'string' ? value.length : ArrayBuffer.isView(value) ? value.byteLength : 8;
  return size;
};
/**
 * The rows of `statement` for `params`, streamed (StatementSync.iterate: never the whole result in memory) until the
 * budget runs out; `budget.capped` tells that it did. A spent budget reads nothing more.
 */
export function takeRows(statement, params, budget) {
  const out = [];
  if (budget.capped) return out;
  for (const row of statement.iterate(...params)) {
    const size = rowSize(row);
    if (budget.rows + 1 > budget.maxRows || budget.bytes + size > budget.maxBytes) { budget.capped = true; break; }
    budget.rows += 1; budget.bytes += size; out.push(row);
  }
  return out;
}
/**
 * A session's messages read newest first (`statement` ordered so), each with its parts (`partsOf(row)`, spending the
 * same budget, e.g. through takeRows), until the budget runs out: [{row, parts}] back in conversation order. A
 * capped read so keeps the end of the conversation, every kept message with its parts (only the oldest kept one may
 * miss some).
 */
export function takeMessages(statement, params, budget, partsOf = null) {
  const out = [];
  if (budget.capped) return out;
  for (const row of statement.iterate(...params)) {
    const size = rowSize(row);
    if (budget.rows + 1 > budget.maxRows || budget.bytes + size > budget.maxBytes) { budget.capped = true; break; }
    budget.rows += 1; budget.bytes += size;
    out.push({ row, parts: partsOf ? partsOf(row) : [] });
    if (budget.capped) break;
  }
  return out.reverse();
}

/** Run `task` over `items` with at most `limit` in flight; results keep the input order. */
export async function mapLimit(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      try { results[index] = await task(items[index], index); } catch { results[index] = undefined; }
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * A per-file summary through the catalog's cache: recomputed only when the file's mtime or size changed. `ctx.cache` is
 * a Map (catalog.mjs owns it); without one every call computes.
 */
export async function cachedSummary(ctx, file, compute, stat) {
  stat ??= await statOf(file);
  if (!stat) return null;
  const cache = ctx?.cache;
  const stamp = `${stat.mtimeMs}:${stat.size}`;
  const hit = cache?.get(file);
  if (hit && hit.stamp === stamp) return hit.value;
  const value = await compute(stat);
  cache?.set(file, { stamp, value });
  return value;
}

/** Whether `file` lies under any of the excluded paths (exact file or a directory prefix). */
export function isExcluded(file, exclude) {
  if (!file || !Array.isArray(exclude) || !exclude.length) return false;
  const target = path.resolve(file);
  return exclude.some(entry => {
    if (typeof entry !== 'string' || !entry) return false;
    const base = path.resolve(entry);
    return target === base || target.startsWith(base.endsWith(path.sep) ? base : base + path.sep);
  });
}

/** Home and environment of a call (tests pass a temp home and a clean env). */
export const homeOf = ctx => ctx?.home || process.env.HOME || '';
export const envOf = ctx => ctx?.env || process.env;
export const CONCURRENCY = 8;

/** Unique existing directories (by resolved path), in order. */
export async function existingDirs(dirs) {
  const seen = new Set(), out = [];
  for (const dir of dirs) {
    if (typeof dir !== 'string' || !dir) continue;
    let real;
    try { real = await fsp.realpath(dir); } catch { continue; }
    if (seen.has(real)) continue;
    const stat = await statOf(real);
    if (!stat?.isDirectory()) continue;
    seen.add(real);
    out.push(dir);
  }
  return out;
}

/** Files under `dir` matching `test(name, fullPath)`, at most `depth` levels down. */
export async function findFiles(dir, test, { depth = 6, skipDir } = {}) {
  const out = [];
  const walk = async (current, level) => {
    for (const entry of await listDir(current)) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { if (level < depth && !skipDir?.(entry.name, full)) await walk(full, level + 1); }
      else if (entry.isFile() && test(entry.name, full)) out.push(full);
    }
  };
  await walk(dir, 0);
  return out;
}
