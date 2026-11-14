// Import Chat History catalog: every source parser behind one listing (DESIGN.md "A 的导出").
//
//   listSources({home, env})   → [{source, label, available, experimental, roots[]}]; available = one of its roots exists.
//   listSessions({home, env, sources?, limit?, query? (every word matches), includeSubagents?, exclude?})
//                              → SessionSummary[] newest first (updatedAt desc). The array carries `warnings`
//                              ([{source, message}]: unreadable databases, missing rollouts, a source that failed) as an
//                              own property. Sub-agent / review threads are left out unless includeSubagents. `exclude`
//                              lists paths (files or directories) never read: OpenClaude's own bridge state (e.g.
//                              <state>/opencode-v2/opencode.db, a bridge's threads/).
//   readSession(key, {home, env, includeSubagents?}) → ImportedSession.
// A source never fails the listing: its errors become warnings and it contributes nothing. Per-file summaries are cached
// by mtime+size for the life of the process (a re-list after a change re-reads only what changed); scans run with
// bounded concurrency (sources three at a time, files eight at a time inside a source).
import fsp from 'node:fs/promises';
import { SOURCES, parseKey, sourceLabel } from './model.mjs';
import { isExcluded, mapLimit } from './sources/shared.mjs';
import * as codex from './sources/codex.mjs';
import * as claudeCode from './sources/claude-code.mjs';
import * as dsh from './sources/dsh.mjs';
import * as gemini from './sources/gemini.mjs';
import * as opencode from './sources/opencode.mjs';
import * as mimo from './sources/mimo.mjs';
import * as grok from './sources/grok.mjs';
import * as kimi from './sources/kimi.mjs';
import * as qwen from './sources/qwen.mjs';
import * as minimax from './sources/minimax.mjs';
import * as zcode from './sources/zcode.mjs';
import * as copilot from './sources/copilot.mjs';
import * as cursor from './sources/cursor.mjs';

const PARSERS = new Map([codex, claudeCode, dsh, gemini, opencode, mimo, grok, kimi, qwen, minimax, zcode, copilot, cursor].map(parser => [parser.id, parser]));
export const parserOf = source => PARSERS.get(source) ?? null;

const CACHE_LIMIT = 20000;
const fileCache = new Map();
// The last listing's summaries by key (per home): readSession reuses the located file instead of searching again.
const lastSummaries = new Map();
/** Forget every cached summary (tests; a forced rescan). */
export function clearCache() { fileCache.clear(); lastSummaries.clear(); }
const boundedCache = {
  get: key => fileCache.get(key),
  set: (key, value) => {
    if (fileCache.size >= CACHE_LIMIT) for (const oldest of fileCache.keys()) { fileCache.delete(oldest); if (fileCache.size < CACHE_LIMIT * 0.9) break; }
    fileCache.set(key, value);
  },
};

function context({ home, env, includeSubagents = false, exclude = [], cache = boundedCache } = {}, warnings = []) {
  return {
    home: home || process.env.HOME || '', env: env || process.env, includeSubagents: includeSubagents === true,
    exclude: Array.isArray(exclude) ? exclude.filter(entry => typeof entry === 'string' && entry) : [],
    cache, warn: (source, message) => warnings.push({ source, message: String(message) }),
  };
}

const existsPath = async file => { try { await fsp.stat(file); return true; } catch { return false; } };

export async function listSources({ home, env } = {}) {
  const ctx = context({ home, env });
  return Promise.all(SOURCES.map(async ({ id, label, experimental }) => {
    let roots = [];
    try { roots = PARSERS.get(id).roots(ctx) ?? []; } catch {}
    const available = (await Promise.all(roots.map(existsPath))).some(Boolean);
    return { source: id, label, available, experimental, roots };
  }));
}

/** Every word of the query in one of the summary's fields (title, first prompt, folder, id, branch, model, source name). */
function matches(summary, words) {
  if (!words.length) return true;
  const haystack = [summary.title, summary.firstPrompt, summary.cwd, summary.sourceId, summary.gitBranch, summary.model, sourceLabel(summary.source)]
    .filter(value => typeof value === 'string').join('\n').toLocaleLowerCase();
  return words.every(word => haystack.includes(word));
}

export async function listSessions({ home, env, sources, limit, query, includeSubagents = false, exclude = [] } = {}) {
  const warnings = [];
  const ctx = context({ home, env, includeSubagents, exclude }, warnings);
  const wanted = (Array.isArray(sources) && sources.length ? sources : SOURCES.map(source => source.id)).filter(source => PARSERS.has(source));
  const lists = await mapLimit(wanted, 3, async source => {
    try {
      const found = await PARSERS.get(source).list(ctx);
      return Array.isArray(found) ? found : [];
    } catch (error) {
      ctx.warn(source, error?.message || error);
      return [];
    }
  });
  const words = typeof query === 'string' ? query.toLocaleLowerCase().split(/\s+/).filter(Boolean) : [];
  let sessions = lists.flatMap(found => found ?? []).filter(summary => summary?.key && (includeSubagents || !summary.isSubagent) && matches(summary, words));
  sessions.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.key.localeCompare(b.key));
  const remembered = lastSummaries.get(ctx.home) ?? new Map();
  for (const summary of sessions) remembered.set(summary.key, summary);
  lastSummaries.set(ctx.home, remembered);
  if (Number.isInteger(limit) && limit > 0) sessions = sessions.slice(0, limit);
  Object.defineProperty(sessions, 'warnings', { value: warnings, enumerable: false });
  return sessions;
}

export async function readSession(key, { home, env, includeSubagents = true, exclude = [] } = {}) {
  const parsed = parseKey(key);
  if (!parsed) throw new Error('Unknown conversation.');
  const ctx = context({ home, env, includeSubagents, exclude });
  const known = lastSummaries.get(ctx.home)?.get(key);
  const target = known?.sourcePath && await existsPath(known.sourcePath) ? known : key;
  const session = await PARSERS.get(parsed.source).read(target, ctx);
  if (isExcluded(session.sourcePath, ctx.exclude)) throw new Error('Unknown conversation.');
  return session;
}
