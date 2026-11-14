// Claude Code (CLI, IDE, Claude Desktop's Code tab): <config>/projects/<slug>/<sessionId>.jsonl — formats.md "Claude Code /
// Desktop". <config> is CLAUDE_CONFIG_DIR when set, and ~/.claude (both are scanned; a session found in both keeps the
// newer file). The slug is not reversible: cwd comes from the records.
//
//   records  user / assistant / system (subtype compact_boundary, stop_hook_summary, api_error, local_command, …), all with
//            uuid, parentUuid, sessionId, cwd, gitBranch, version, isSidechain, timestamp. Metadata appended over and
//            over: custom-title {customTitle}, agent-name, last-prompt {lastPrompt, leafUuid}, mode, summary {summary,
//            leafUuid} (older CLIs). Noise: attachment (it has a uuid and can be a parent), file-history-*,
//            queue-operation, cost-state, bridge-session, atis-latch, api-request*.
//   content  user: text | image | tool_result {tool_use_id, content, is_error} (structured toolUseResult beside it);
//            assistant: text | thinking {thinking, signature} (often only a signature) | redacted_thinking {data} |
//            tool_use {id, name, input}; one content block per line, a message's blocks chained by parentUuid.
//   injected isMeta / isVisibleInTranscriptOnly users and text opening with <system-reminder>, <local-command-…>,
//            <command-name>, <task-notification> (model.mjs isClaudeInjected). isCompactSummary users are the summary of
//            a compaction (kind 'compaction'); system/compact_boundary links back by logicalParentUuid.
//   branch   The conversation is the chain from the leaf back by parentUuid (logicalParentUuid across a compaction). The
//            leaf is last-prompt.leafUuid, unless the last conversation record in the file descends from it (the
//            session went on after that prompt was recorded): then that record. On this machine every divergence
//            between the two was of that kind (or the leaf a trailing system record after the last reply).
//   list     Head (64 KB) + tail (64 KB) of each file only: first prompt, cwd, branch and start from the head; title,
//            leaf, model and last activity from the tail.
//   Desktop  ~/Library/Application Support/Claude{,-3p}/claude-code-sessions/<acct>/<org>/local_*.json {title, cwd,
//            model, createdAt, lastActivityAt, isArchived, cliSessionId}: the title and archive state of the CLI
//            session with that id (deleted_* tombstones are skipped; local-agent-mode-sessions are Cowork, not read).
//   agents   <sessionId>/subagents/agent-*.jsonl (+ .meta.json {agentType, description}) and
//            subagents/workflows/wf_*/…: listed only with includeSubagents, keyed `<sessionId>/<relative path>`.
import path from 'node:path';
import {
  ItemList, isClaudeInjected, isRecord, makeSession, makeSummary, oneLine, parseKey, textOfBlocks,
} from '../model.mjs';
import {
  CONCURRENCY, cachedSummary, envOf, existingDirs, findFiles, homeOf, isExcluded, listDir, mapLimit, parseLine, readHeadLines,
  readJsonFile, readLines, readTailLines, statOf,
} from './shared.mjs';

export const id = 'claude-code';
export const label = 'Claude Code';
export const experimental = false;

function configDirs(ctx) {
  const env = envOf(ctx), home = homeOf(ctx);
  return [env.CLAUDE_CONFIG_DIR, path.join(home, '.claude'), ...(Array.isArray(ctx?.claudeConfigDirs) ? ctx.claudeConfigDirs : [])].filter(Boolean);
}
const desktopDirs = ctx => ['Claude', 'Claude-3p'].map(name => path.join(homeOf(ctx), 'Library', 'Application Support', name, 'claude-code-sessions'));
export function roots(ctx) {
  return [...configDirs(ctx).map(dir => path.join(dir, 'projects')), ...desktopDirs(ctx)];
}

const SESSION_FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/i;
const CONVERSATION = new Set(['user', 'assistant', 'system']);

/** cliSessionId → Claude Desktop metadata {title, archived, model, cwd, createdAt, updatedAt}. */
async function desktopMeta(ctx) {
  const out = new Map();
  for (const dir of desktopDirs(ctx)) {
    const files = await findFiles(dir, name => /^local_.*\.json$/.test(name), { depth: 4 });
    const metas = await mapLimit(files, CONCURRENCY, file => cachedSummary(ctx, file, () => readJsonFile(file)));
    for (const meta of metas) {
      if (!isRecord(meta) || typeof meta.cliSessionId !== 'string') continue;
      const previous = out.get(meta.cliSessionId);
      if (previous && (previous.updatedAt ?? 0) > (meta.lastActivityAt ?? 0)) continue;
      out.set(meta.cliSessionId, { title: meta.title, archived: meta.isArchived === true, model: meta.model, cwd: meta.cwd,
        createdAt: meta.createdAt, updatedAt: meta.lastActivityAt });
    }
  }
  return out;
}

/** The visible text of a user record, or null when it is injected/meta. */
function promptText(record) {
  if (record.type !== 'user' || record.isMeta || record.isVisibleInTranscriptOnly || record.isCompactSummary) return null;
  const content = record.message?.content;
  if (typeof content === 'string') return isClaudeInjected(content) ? null : content;
  if (!Array.isArray(content) || content.some(block => block?.type === 'tool_result')) return null;
  const text = content.filter(block => block?.type === 'text' && !isClaudeInjected(block.text)).map(block => block.text).join('\n');
  return text || null;
}

async function fileSummary(file, stat, extra = {}) {
  const head = (await readHeadLines(file)).map(parseLine).filter(Boolean);
  const tail = stat.size > 65536 ? (await readTailLines(file)).map(parseLine).filter(Boolean) : head;
  const first = head.find(record => CONVERSATION.has(record.type));
  if (!first && !tail.some(record => CONVERSATION.has(record.type))) return null;
  const prompt = head.map(promptText).find(Boolean) ?? tail.map(promptText).find(Boolean) ?? '';
  const pick = (records, test) => records.findLast(test);
  const title = pick(tail, record => record.type === 'custom-title')?.customTitle ?? pick(head, record => record.type === 'custom-title')?.customTitle
    ?? pick(tail, record => record.type === 'summary')?.summary ?? '';
  const lastConv = pick(tail, record => CONVERSATION.has(record.type) && record.timestamp);
  const withCwd = head.find(record => typeof record.cwd === 'string') ?? pick(tail, record => typeof record.cwd === 'string');
  const model = pick(tail, record => record.type === 'assistant' && typeof record.message?.model === 'string' && record.message.model !== '<synthetic>')?.message.model;
  return {
    sessionId: first?.sessionId ?? path.basename(file, '.jsonl'), title, firstPrompt: prompt, cwd: withCwd?.cwd ?? null,
    gitBranch: pick(tail, record => record.gitBranch)?.gitBranch ?? head.find(record => record.gitBranch)?.gitBranch ?? null,
    model: model ?? null, createdAt: head.find(record => record.timestamp)?.timestamp ?? null, updatedAt: lastConv?.timestamp ?? stat.mtimeMs,
    ...extra,
  };
}

async function subagentFiles(sessionDir) {
  return findFiles(path.join(sessionDir, 'subagents'), name => /\.jsonl$/.test(name), { depth: 3 });
}

export async function list(ctx = {}) {
  const projectRoots = await existingDirs(configDirs(ctx).map(dir => path.join(dir, 'projects')));
  const entries = [];
  for (const root of projectRoots) {
    for (const project of await listDir(root)) {
      if (!project.isDirectory()) continue;
      const dir = path.join(root, project.name);
      for (const entry of await listDir(dir)) {
        if (entry.isFile() && SESSION_FILE.test(entry.name)) entries.push({ file: path.join(dir, entry.name) });
        else if (ctx.includeSubagents && entry.isDirectory() && /^[0-9a-f-]{36}$/i.test(entry.name)) {
          for (const file of await subagentFiles(path.join(dir, entry.name))) entries.push({ file, parentId: entry.name, root: path.join(dir, entry.name) });
        }
      }
    }
  }
  const desktop = await desktopMeta(ctx);
  const summaries = await mapLimit(entries.filter(entry => !isExcluded(entry.file, ctx.exclude)), CONCURRENCY, async entry => {
    const stat = await statOf(entry.file);
    if (!stat) return null;
    const base = await cachedSummary(ctx, entry.file, () => fileSummary(entry.file, stat), stat);
    if (!base) return null;
    return toSummary(entry, base, stat, desktop);
  });
  // One session in two config dirs (a copied profile): keep the newer file.
  const byKey = new Map();
  for (const summary of summaries) {
    if (!summary) continue;
    const previous = byKey.get(summary.key);
    if (!previous || (summary.updatedAt ?? 0) > (previous.updatedAt ?? 0)) byKey.set(summary.key, summary);
  }
  return [...byKey.values()];
}

async function toSummary(entry, base, stat, desktop) {
  if (entry.parentId) {
    const meta = await readJsonFile(entry.file.replace(/\.jsonl$/, '.meta.json'));
    const relative = path.relative(entry.root, entry.file).split(path.sep).join('/');
    return makeSummary('claude-code', `${entry.parentId}/${relative}`, {
      ...base, sourcePath: entry.file, title: meta?.description || base.title || meta?.agentType || '', parentId: entry.parentId, isSubagent: true,
      extra: { agentType: meta?.agentType ?? null },
    });
  }
  const sessionId = path.basename(entry.file, '.jsonl');
  const app = desktop.get(sessionId);
  return makeSummary('claude-code', sessionId, {
    ...base, sourcePath: entry.file, title: app?.title || base.title || '', archived: app?.archived === true,
    cwd: base.cwd || app?.cwd, model: base.model || app?.model, createdAt: base.createdAt ?? app?.createdAt,
    updatedAt: Math.max(Date.parse(base.updatedAt) || Number(base.updatedAt) || 0, Number(app?.updatedAt) || 0) || stat.mtimeMs,
    extra: app ? { desktop: true } : {},
  });
}

async function locate(sourceId, ctx) {
  const [sessionId, ...rest] = sourceId.split('/');
  for (const root of await existingDirs(configDirs(ctx).map(dir => path.join(dir, 'projects')))) {
    for (const project of await listDir(root)) {
      if (!project.isDirectory()) continue;
      const dir = path.join(root, project.name);
      const file = rest.length ? path.join(dir, sessionId, ...rest) : path.join(dir, `${sessionId}.jsonl`);
      if (!path.resolve(file).startsWith(path.resolve(dir) + path.sep)) continue;
      const stat = await statOf(file);
      if (stat?.isFile()) return { file, stat, parentId: rest.length ? sessionId : null, root: path.join(dir, sessionId) };
    }
  }
  return null;
}

/** The current branch: records from the root to the leaf (formats.md "排序"). */
export function currentBranch(byUuid, order, leafUuid) {
  const parentOf = record => (record.parentUuid && byUuid.has(record.parentUuid) ? record.parentUuid : record.logicalParentUuid ?? record.parentUuid ?? null);
  const chain = start => {
    const out = [], seen = new Set();
    for (let uuid = start; uuid && !seen.has(uuid); ) {
      const record = byUuid.get(uuid);
      if (!record) break;
      seen.add(uuid);
      out.push(record);
      uuid = parentOf(record);
    }
    return out;
  };
  const last = order.findLast(record => CONVERSATION.has(record.type));
  if (!last) return [];
  let leaf = leafUuid && byUuid.has(leafUuid) ? leafUuid : last.uuid;
  if (leaf !== last.uuid && chain(last.uuid).some(record => record.uuid === leaf)) leaf = last.uuid;
  return chain(leaf).reverse();
}

/**
 * Parallel tool calls branch the parentUuid tree: the blocks of one assistant response and the results of its calls can
 * hang off each other as siblings, so the walk from the leaf misses some (on this machine 46 of 2846 calls lost their
 * result that way). The branch is widened by the other blocks of every assistant message (message.id) on it and by the
 * tool_result records answering its calls, then put back in file order (a parent is always written before its child).
 */
export function withParallelSiblings(branch, order) {
  const chosen = new Set(branch);
  const messageIds = new Set(branch.filter(record => record.type === 'assistant' && record.message?.id).map(record => record.message.id));
  for (const record of order) if (record.type === 'assistant' && messageIds.has(record.message?.id)) chosen.add(record);
  const callIds = new Set();
  for (const record of chosen) for (const block of record.type === 'assistant' && Array.isArray(record.message?.content) ? record.message.content : []) if (block?.type === 'tool_use' && block.id) callIds.add(block.id);
  const answered = new Set();
  for (const record of chosen) for (const block of record.type === 'user' && Array.isArray(record.message?.content) ? record.message.content : []) if (block?.type === 'tool_result') answered.add(block.tool_use_id);
  for (const record of order) {
    if (record.type !== 'user' || chosen.has(record) || !Array.isArray(record.message?.content)) continue;
    const ids = record.message.content.filter(block => block?.type === 'tool_result').map(block => block.tool_use_id);
    if (ids.length && ids.every(callId => callIds.has(callId) && !answered.has(callId))) { chosen.add(record); ids.forEach(callId => answered.add(callId)); }
  }
  if (chosen.size === branch.length) return branch;
  const position = new Map(order.map((record, index) => [record, index]));
  return [...chosen].sort((a, b) => (position.get(a) ?? -1) - (position.get(b) ?? -1));
}

function blockImage(block) {
  const source = block?.source ?? {};
  if (source.type === 'base64') return { image: { mime: source.media_type ?? 'image/*', data: `data:${source.media_type ?? 'image/png'};base64,${source.data}` } };
  if (source.type === 'url') return { image: { mime: 'image/*', url: source.url } };
  return null;
}
function resultText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content == null ? '' : JSON.stringify(content);
  return content.map(block => block?.type === 'text' ? block.text : block?.type === 'image' ? '[image]' : '').filter(Boolean).join('\n');
}

/** Branch records → items. */
export function itemsOf(records) {
  const list = new ItemList();
  for (const record of records) {
    const ts = record.timestamp, content = record.message?.content;
    // system records (compact_boundary, hook summaries, api errors…) are not conversation: the compact summary user
    // record after a boundary carries the compaction's text.
    if (record.type === 'system') continue;
    if (record.type === 'user') {
      if (record.isCompactSummary) { list.push('compaction', { ts, compaction: { summary: textOfBlocks(content) || null } }); continue; }
      const meta = record.isMeta || record.isVisibleInTranscriptOnly;
      if (typeof content === 'string') { list.push(meta || isClaudeInjected(content) ? 'injected' : 'user', { ts, parts: [{ text: content }] }); continue; }
      const parts = [], injected = [];
      for (const block of Array.isArray(content) ? content : []) {
        if (block?.type === 'tool_result') {
          const structured = record.toolUseResult;
          const exitCode = isRecord(structured) && Number.isFinite(structured.exitCode) ? structured.exitCode : undefined;
          list.toolResult({ callId: block.tool_use_id, text: resultText(block.content), isError: block.is_error === true, exitCode, ts,
            ...(isRecord(structured) && Array.isArray(structured.structuredPatch) ? { patch: structured.structuredPatch } : {}) });
        } else if (block?.type === 'text') (meta || isClaudeInjected(block.text) ? injected : parts).push({ text: block.text });
        else if (block?.type === 'image') { const image = blockImage(block); if (image) (meta ? injected : parts).push(image); }
        else if (block?.type === 'document') parts.push({ file: { name: block.title ?? 'document', mime: block.source?.media_type } });
      }
      list.push('injected', { ts, parts: injected });
      list.push('user', { ts, parts });
      continue;
    }
    if (record.type === 'assistant') {
      const model = record.message?.model;
      for (const block of Array.isArray(content) ? content : typeof content === 'string' ? [{ type: 'text', text: content }] : []) {
        if (block?.type === 'text') list.push('assistant', { ts, parts: [{ text: block.text }] });
        else if (block?.type === 'thinking') list.push('reasoning', { ts, reasoning: { ...(block.thinking ? { text: block.thinking } : {}), ...(block.signature ? { opaque: { vendor: 'anthropic', model: model ?? null, payload: block.signature } } : {}) } });
        else if (block?.type === 'redacted_thinking') list.push('reasoning', { ts, reasoning: { opaque: { vendor: 'anthropic', model: model ?? null, payload: block.data } } });
        else if (block?.type === 'tool_use' || block?.type === 'server_tool_use') list.toolCall({ callId: block.id, name: block.name, raw: block.input ?? {}, ts });
        else if (block?.type === 'web_search_tool_result') list.toolResult({ callId: block.tool_use_id, text: resultText(block.content?.map?.(entry => ({ type: 'text', text: [entry?.title, entry?.url].filter(Boolean).join(' — ') })) ?? ''), ts });
      }
    }
  }
  return list.items;
}

export async function read(target, ctx = {}) {
  const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  let file = summary?.sourcePath;
  if (!file) {
    const hit = await locate(String(sourceId ?? ''), ctx);
    if (!hit) throw new Error('Claude Code session not found.');
    file = hit.file;
    const base = await fileSummary(file, hit.stat);
    summary = await toSummary({ file, parentId: hit.parentId, root: hit.root }, base ?? {}, hit.stat, await desktopMeta(ctx));
  }
  const byUuid = new Map(), order = [];
  let leafUuid = null;
  for await (const line of readLines(file)) {
    const record = parseLine(line);
    if (!record) continue;
    if (record.type === 'last-prompt' && record.leafUuid) leafUuid = record.leafUuid;
    if (typeof record.uuid !== 'string') continue;
    // Only what the branch walk and the items need (attachments link the chain; their payload is not kept).
    byUuid.set(record.uuid, CONVERSATION.has(record.type) ? record : { uuid: record.uuid, type: record.type, parentUuid: record.parentUuid, logicalParentUuid: record.logicalParentUuid });
    if (CONVERSATION.has(record.type)) order.push(record);
  }
  const branch = withParallelSiblings(currentBranch(byUuid, order, leafUuid), order).filter(record => CONVERSATION.has(record.type) && (summary.isSubagent || !record.isSidechain));
  return makeSession({ ...summary, firstPrompt: summary.firstPrompt || oneLine(branch.map(promptText).find(Boolean) ?? '') }, itemsOf(branch));
}

