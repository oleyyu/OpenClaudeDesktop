// GitHub Copilot CLI: ~/.copilot — formats.md "凭文档". Experimental: this machine has a
// ~/.copilot without sessions; layouts from the CLI's documentation, verified on synthetic files only.
//
//   session-state/<sessionId>/events.jsonl   (current) one event per line {type, data, timestamp, id?}:
//       session.start {sessionId, startTime, context:{cwd, gitRoot?, branch?}, selectedModel?}, session.model_change
//       {newModel}, user.message {content, attachments?}, assistant.message {content, toolRequests?: [{toolCallId, name,
//       arguments}], reasoningText?}, tool.execution_start {toolCallId, toolName, arguments}, tool.execution_complete
//       {toolCallId, success, result:{content}, error?}, session.info / session.error / … (notices: not replayed).
//   history-session-state/<sessionId>.json   (older) {sessionId, startTime, chatMessages: OpenAI-style messages}.
import path from 'node:path';
import { ItemList, makeSession, makeSummary, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, cachedSummary, findFiles, homeOf, isExcluded, listDir, mapLimit, readJsonFile, readRecords } from './shared.mjs';
import { openAiItems } from './kimi.mjs';

export const id = 'copilot';
export const label = 'GitHub Copilot CLI';
export const experimental = true;

const copilotDir = ctx => path.join(homeOf(ctx), '.copilot');
export const roots = ctx => [path.join(copilotDir(ctx), 'session-state'), path.join(copilotDir(ctx), 'history-session-state')];

const textOf = value => typeof value === 'string' ? value : textOfBlocks(value);

/** events.jsonl events → items (exported for tests). */
export function itemsOfEvents(events) {
  const list = new ItemList(), calls = new Set();
  for (const event of events) {
    const data = event?.data ?? {}, ts = event?.timestamp;
    switch (event?.type) {
      case 'user.message': list.push('user', { ts, parts: [{ text: textOf(data.content ?? data.transformedContent) }] }); break;
      case 'assistant.message':
        if (typeof data.reasoningText === 'string' && data.reasoningText) list.push('reasoning', { ts, reasoning: { text: data.reasoningText } });
        list.push('assistant', { ts, parts: [{ text: textOf(data.content) }] });
        for (const call of data.toolRequests ?? []) if (call?.toolCallId && !calls.has(call.toolCallId)) { calls.add(call.toolCallId); list.toolCall({ callId: call.toolCallId, name: call.name, raw: call.arguments, ts }); }
        break;
      case 'tool.execution_start':
        if (data.toolCallId && !calls.has(data.toolCallId)) { calls.add(data.toolCallId); list.toolCall({ callId: data.toolCallId, name: data.toolName ?? data.name, raw: data.arguments, ts }); }
        break;
      case 'tool.execution_complete':
        list.toolResult({ callId: data.toolCallId, text: textOf(data.result?.content ?? data.result?.detailedContent) || (typeof data.error === 'string' ? data.error : data.error?.message ?? ''), isError: data.success === false, ts });
        break;
      default: break;
    }
  }
  return list.items;
}

async function readEvents(file) {
  const out = [];
  for await (const record of readRecords(file)) out.push(record);
  return out;
}

async function eventsSummary(file, stat) {
  const events = await readEvents(file);
  const start = events.find(event => event?.type === 'session.start')?.data ?? {};
  const first = events.find(event => event?.type === 'user.message');
  if (!first) return null;
  return makeSummary('copilot', start.sessionId ?? path.basename(path.dirname(file)), {
    sourcePath: file, firstPrompt: textOf(first.data?.content), cwd: start.context?.cwd ?? null, gitBranch: start.context?.branch,
    model: events.findLast(event => event?.type === 'session.model_change')?.data?.newModel ?? start.selectedModel,
    createdAt: start.startTime ?? events[0]?.timestamp, updatedAt: events.at(-1)?.timestamp ?? stat.mtimeMs,
    messageCount: events.filter(event => event?.type === 'user.message' || event?.type === 'assistant.message').length,
  });
}
async function historySummary(file, stat) {
  const value = await readJsonFile(file);
  const first = (value?.chatMessages ?? []).find(message => message?.role === 'user');
  if (!first) return null;
  return makeSummary('copilot', value.sessionId ?? path.basename(file, '.json'), {
    sourcePath: file, firstPrompt: textOf(first.content), createdAt: value.startTime, updatedAt: stat.mtimeMs,
    messageCount: value.chatMessages.filter(message => message?.role === 'user' || message?.role === 'assistant').length,
  });
}

export async function list(ctx = {}) {
  try {
    const files = [];
    for (const session of await listDir(path.join(copilotDir(ctx), 'session-state'))) if (session.isDirectory()) files.push(path.join(copilotDir(ctx), 'session-state', session.name, 'events.jsonl'));
    files.push(...await findFiles(path.join(copilotDir(ctx), 'history-session-state'), name => name.endsWith('.json'), { depth: 0 }));
    const out = await mapLimit(files.filter(file => !isExcluded(file, ctx.exclude)), CONCURRENCY,
      file => cachedSummary(ctx, file, stat => file.endsWith('events.jsonl') ? eventsSummary(file, stat) : historySummary(file, stat)));
    const byKey = new Map();
    for (const summary of out) if (summary && !byKey.has(summary.key)) byKey.set(summary.key, summary);
    return [...byKey.values()];
  } catch (error) {
    ctx.warn?.('copilot', String(error?.message || error));
    return [];
  }
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    summary = (await list(ctx)).find(entry => entry.sourceId === sourceId) ?? null;
  }
  if (!summary) throw new Error('Copilot CLI session not found.');
  const items = summary.sourcePath.endsWith('events.jsonl') ? itemsOfEvents(await readEvents(summary.sourcePath))
    : openAiItems((await readJsonFile(summary.sourcePath))?.chatMessages ?? [], { list: new ItemList() });
  return makeSession(summary, items);
}
