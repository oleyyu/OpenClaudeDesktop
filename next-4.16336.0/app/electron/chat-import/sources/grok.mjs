// Grok CLI (1.0.70): ~/.grok/sessions/<encodeURIComponent(cwd)>/<sessionId>/ (GROK_HOME) — formats.md "Grok CLI".
//
//   summary.json        {info:{id, cwd}, generated_title, session_summary?, created_at, updated_at, last_active_at,
//                       num_chat_messages, current_model_id, session_kind ('subagent' for delegated runs), agent_name}:
//                       the list reads it (plus the head of chat_history.jsonl for the first prompt).
//   chat_history.jsonl  system {content} (the system prompt: injected); user {content:[{type:'text', text}],
//                       prompt_index?, synthetic_reason?} (synthetic_reason system_reminder / project_instructions:
//                       injected); assistant {content (string), tool_calls:[{id, name, arguments}], model_id};
//                       reasoning {summary:[{type:'summary_text', text}], encrypted_content} (opaque, xAI);
//                       tool_result {tool_call_id, content}; backend_tool_call {kind:{tool_type, action, id, status}}
//                       (server-side web search). updates.jsonl / events.jsonl / rewind_points.jsonl / *.lock: ignored.
import path from 'node:path';
import { ItemList, clip, makeSession, makeSummary, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, cachedSummary, envOf, homeOf, isExcluded, listDir, mapLimit, parseLine, readHeadLines, readJsonFile, readRecords, statOf } from './shared.mjs';

export const id = 'grok';
export const label = 'Grok CLI';
export const experimental = false;

const grokHome = ctx => envOf(ctx).GROK_HOME || path.join(homeOf(ctx), '.grok');
export const roots = ctx => [path.join(grokHome(ctx), 'sessions')];

const decodeCwd = name => { try { return decodeURIComponent(name); } catch { return null; } };
const isPrompt = record => record?.type === 'user' && !record.synthetic_reason;

async function sessionDirs(ctx) {
  const out = [];
  const root = path.join(grokHome(ctx), 'sessions');
  for (const project of await listDir(root)) {
    if (!project.isDirectory()) continue;
    for (const session of await listDir(path.join(root, project.name))) if (session.isDirectory()) out.push({ dir: path.join(root, project.name, session.name), cwd: decodeCwd(project.name) });
  }
  return out;
}

async function summaryOf(dir, cwdHint) {
  const summaryFile = path.join(dir, 'summary.json'), history = path.join(dir, 'chat_history.jsonl');
  const stat = await statOf(summaryFile) ?? await statOf(history);
  if (!stat) return null;
  const meta = (await readJsonFile(summaryFile)) ?? {};
  const prompt = (await readHeadLines(history)).map(parseLine).find(isPrompt);
  const sessionId = meta.info?.id ?? path.basename(dir);
  return makeSummary('grok', sessionId, {
    sourcePath: history, title: meta.generated_title || '', firstPrompt: textOfBlocks(prompt?.content), cwd: meta.info?.cwd ?? cwdHint,
    model: meta.current_model_id, createdAt: meta.created_at, updatedAt: meta.last_active_at ?? meta.updated_at ?? stat.mtimeMs,
    isSubagent: meta.session_kind === 'subagent', parentId: meta.parent_session_id ?? null,
    ...(Number.isFinite(meta.num_chat_messages) ? { messageCount: meta.num_chat_messages } : {}),
    extra: { agentName: meta.agent_name ?? null },
  });
}

export async function list(ctx = {}) {
  const dirs = (await sessionDirs(ctx)).filter(entry => !isExcluded(entry.dir, ctx.exclude));
  const summaries = await mapLimit(dirs, CONCURRENCY, async ({ dir, cwd }) => {
    const file = path.join(dir, 'summary.json');
    const summary = await cachedSummary(ctx, file, () => summaryOf(dir, cwd)) ?? await summaryOf(dir, cwd);
    if (!summary || (!summary.firstPrompt && !summary.title)) return null;
    return summary.isSubagent && !ctx.includeSubagents ? null : summary;
  });
  return summaries.filter(Boolean);
}

/** chat_history records → items (exported for tests). */
export function itemsOf(records, { model = null } = {}) {
  const list = new ItemList();
  for (const record of records) {
    switch (record.type) {
      case 'system': list.push('injected', { parts: [{ text: clip(textOfBlocks(record.content), 4000) }] }); break;
      case 'user': {
        const parts = (Array.isArray(record.content) ? record.content : [{ type: 'text', text: record.content }]).map(block =>
          typeof block?.text === 'string' ? { text: block.text } : block?.type === 'image' || block?.type === 'image_url' ? { image: { mime: 'image/*', url: block.image_url?.url ?? block.url ?? block.image_url } } : null).filter(Boolean);
        list.push(record.synthetic_reason ? 'injected' : 'user', { parts });
        break;
      }
      case 'reasoning': {
        const text = (record.summary ?? []).map(entry => entry?.text ?? '').filter(Boolean).join('\n\n');
        list.push('reasoning', { reasoning: { ...(text ? { text } : {}), ...(record.encrypted_content ? { opaque: { vendor: 'xai', model, payload: record.encrypted_content } } : {}) } });
        break;
      }
      case 'assistant':
        if (record.model_id) model = record.model_id;
        list.push('assistant', { parts: [{ text: textOfBlocks(record.content) }] });
        for (const call of record.tool_calls ?? []) list.toolCall({ callId: call.id, name: call.name ?? call.function?.name, raw: call.arguments ?? call.function?.arguments });
        break;
      case 'tool_result': list.toolResult({ callId: record.tool_call_id, text: textOfBlocks(record.content) }); break;
      case 'backend_tool_call': {
        const kind = record.kind ?? {};
        const callId = kind.id ?? `backend-${list.items.length}`;
        list.toolCall({ callId, name: kind.tool_type || 'web_search', raw: kind.action ?? {}, category: /search|browse|web/i.test(kind.tool_type ?? 'web') ? 'web' : 'other' });
        list.toolResult({ callId, text: kind.status ?? '' });
        break;
      }
      default: break;
    }
  }
  return list.items;
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    for (const entry of await sessionDirs(ctx)) {
      if (path.basename(entry.dir) !== sourceId) continue;
      summary = await summaryOf(entry.dir, entry.cwd);
      if (summary) break;
    }
  }
  if (!summary) throw new Error('Grok session not found.');
  const records = [];
  for await (const record of readRecords(summary.sourcePath)) records.push(record);
  return makeSession(summary, itemsOf(records, { model: summary.model }));
}
