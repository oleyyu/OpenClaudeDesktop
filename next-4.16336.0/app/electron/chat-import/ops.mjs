// Import Chat History's heavy operations — listing, reading and converting other agents' histories — kept off the
// Electron main thread: worker.mjs runs them in a node:worker_threads Worker (index.cjs talks to it), tests run them in
// process with fake modules. Every answer is small and structured-clonable: summaries, a capped preview with image
// placeholders (no base64 crosses to the page), the prepared import (targets.mjs prepareImport) and a saved prefix.
//
//   sources {home, env}                                       → [{source, label, available, experimental, roots}]
//   list {home, env, sources?, query?, offset?, limit?, includeSubagents?, exclude?}
//        → {sessions, total, counts: {[source]: n}, all, offset, hasMore}: the query (every word, catalog.mjs) is matched
//          across all sources so the per-source counts stay right; `sources` then narrows the page.
//   preview {key, home, env, exclude?}                        → {session, turns, truncated}
//   prepare {key, home, env, exclude?, budgets}               → targets.mjs prepareImport
//   readPrefix {file}                                         → the prefix file's {turns} (null when unreadable)
import fsp from 'node:fs/promises';

export const LIST_LIMIT = 500;
export const LIST_MAX = 2000;
export const PREVIEW_TURNS = 200;
export const PREVIEW_ITEMS = 600;
export const PREVIEW_TEXT = 4000;

const text = value => (typeof value === 'string' ? value : '');
const clipText = value => { const s = text(value); return s.length > PREVIEW_TEXT ? `${s.slice(0, PREVIEW_TEXT)}…` : s; };

/** The preview's slim copy of one item: only what the page's previewRows reads, images as placeholders. */
export function previewItem(item) {
  const base = { type: item.type, id: item.id };
  switch (item.type) {
    case 'userMessage': return { ...base, content: (Array.isArray(item.content) ? item.content : []).map(part =>
      part?.type === 'image' || part?.type === 'localImage' ? { type: part.type, placeholder: true } : { type: 'text', text: clipText(part?.text) }) };
    case 'agentMessage': case 'plan': return { ...base, text: clipText(item.text) };
    case 'commandExecution': return { ...base, command: clipText(item.command), status: item.status };
    case 'fileChange': return { ...base, changes: (Array.isArray(item.changes) ? item.changes : []).slice(0, 50).map(change => ({ path: text(change?.path) })), status: item.status };
    case 'mcpToolCall': return { ...base, server: text(item.server), tool: text(item.tool) };
    case 'dynamicToolCall': case 'collabAgentToolCall': return { ...base, tool: text(item.tool) };
    case 'webSearch': return { ...base, query: clipText(item.query) };
    default: return base;
  }
}

/** The first PREVIEW_TURNS turns, at most PREVIEW_ITEMS items, slimmed (previewItem). */
export function previewTurns(turns) {
  const out = [];
  let items = 0, truncated = false;
  for (const turn of Array.isArray(turns) ? turns : []) {
    if (out.length >= PREVIEW_TURNS || items >= PREVIEW_ITEMS) { truncated = true; break; }
    const list = (Array.isArray(turn?.items) ? turn.items : []).filter(item => item && typeof item === 'object' && item.type !== 'reasoning');
    const room = PREVIEW_ITEMS - items;
    if (list.length > room) truncated = true;
    const kept = list.slice(0, room).map(previewItem);
    items += kept.length;
    out.push({ id: text(turn?.id), status: 'completed', items: kept });
  }
  return { turns: out, truncated };
}

/** @param {{ catalog, convert, targets }} modules catalog.mjs, convert.mjs, targets.mjs (or test doubles) */
export function createOps({ catalog, convert, targets }) {
  const scope = ({ home, env, exclude }) => ({ home, env, exclude: Array.isArray(exclude) ? exclude : [] });
  return {
    async sources({ home, env } = {}) {
      const rows = await catalog.listSources({ home, env });
      return (Array.isArray(rows) ? rows : []).map(row => ({ source: row.source, label: row.label, available: row.available === true,
        experimental: row.experimental === true, roots: (Array.isArray(row.roots) ? row.roots : []).filter(root => typeof root === 'string') }));
    },
    async list({ home, env, exclude, sources, query, offset = 0, limit = LIST_LIMIT, includeSubagents = false } = {}) {
      const all = await catalog.listSessions({ ...scope({ home, env, exclude }), ...(query ? { query } : {}), includeSubagents: includeSubagents === true });
      const found = Array.isArray(all) ? all : [];
      const counts = {};
      for (const session of found) counts[session.source] = (counts[session.source] ?? 0) + 1;
      const wanted = Array.isArray(sources) && sources.length ? new Set(sources) : null;
      const matching = wanted ? found.filter(session => wanted.has(session.source)) : found;
      const from = Number.isInteger(offset) && offset > 0 ? offset : 0;
      const size = Number.isInteger(limit) && limit > 0 ? Math.min(limit, LIST_MAX) : LIST_LIMIT;
      const sessions = matching.slice(from, from + size);
      return { sessions, total: matching.length, counts, all: found.length, offset: from, hasMore: from + sessions.length < matching.length };
    },
    async preview({ key, home, env, exclude } = {}) {
      const session = await catalog.readSession(key, scope({ home, env, exclude }));
      const { turns, truncated } = previewTurns(convert.toCodexTurns(session) ?? []);
      return { session: targets.summaryOf(session), turns, truncated };
    },
    async prepare({ key, home, env, exclude, budgets } = {}) {
      const session = await catalog.readSession(key, scope({ home, env, exclude }));
      return targets.prepareImport(session, { convert, budgets: budgets ?? targets.importBudgets(null) });
    },
    async readPrefix({ file } = {}) {
      try {
        const saved = JSON.parse(await fsp.readFile(file, 'utf8'));
        return { turns: Array.isArray(saved?.turns) ? saved.turns : null };
      } catch { return { turns: null }; }
    },
  };
}
