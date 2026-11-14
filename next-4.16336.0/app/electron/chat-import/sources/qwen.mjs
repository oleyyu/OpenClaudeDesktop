// Qwen Code: <runtime>/projects/<sanitizeCwd(cwd)>/chats/<sessionId>.jsonl — read from the code that WRITES them in
// QwenLM/qwen-code (HEAD 0.26.5, packages/core/src; OpenClaude Desktop pins and launches 0.24.7, cores/qwen.mjs, whose
// ChatRecord core fields are the same: the bridge's own readers, acp-bridge agents/qwen.js qwenProjectCwds, rely on them).
//
//   where    <runtime> = $QWEN_RUNTIME_DIR, else settings advanced.runtimeOutputDir, else $QWEN_HOME, else ~/.qwen
//            (config/storage.ts:172 getRuntimeBaseDir, :193 getGlobalQwenDir, :619 getProjectDir); the project folder is
//            the cwd with every [^a-zA-Z0-9] turned into '-' (utils/paths.ts:388 sanitizeCwd), not reversible: cwd comes
//            from the records. Archived sessions move to chats/archive/ (services/sessionService.ts:972). The file is
//            created empty with flag 'wx' and appended one JSON line per record (chatRecordingService.ts:1424
//            ensureConversationFile, utils/jsonl-utils.ts:347 writeLine).
//   records  ChatRecord (chatRecordingService.ts:374) {uuid, parentUuid, sessionId, timestamp, type: user | assistant |
//            tool_result | system, subtype?, provenance?, cwd, version, gitBranch?, promptId?, message?: Content
//            {role 'user' | 'model', parts: [{text} | {text, thought: true} | {functionCall: {id, name, args}} |
//            {functionResponse: {id, name, response}} | {inlineData: {mimeType, data}}]}, model?, toolCallResult?
//            {callId, status, error, resultDisplay}, systemPayload?} (createBaseRecord :1600). user: recordUserMessage
//            :2544 (systemPayload {displayText, hookContext} = the text the user typed; the parts are the expanded,
//            model-facing prompt, a trailing <qwen:user-prompt-submit-context> part is hook context); assistant:
//            recordAssistantTurn :2986; tool results: type tool_result with functionResponse parts (:3171, subtype
//            code_mode_tool_result is internal, no model call behind it: utils/transcript-records.ts:330). Background
//            notifications / cron / workspace-agent messages are user records with subtype notification | cron |
//            background_task_completed | agent_mention | agent_message (:2884, contract.ts) → injected; a steer typed
//            mid-turn is subtype mid_turn_user_message (:2619) and realtime voice turns realtime_message (:3024).
//   title    system/custom_title {systemPayload: {customTitle, titleSource}} (:3855), re-anchored at EOF as the file
//            grows (:2029): the last one in the file wins (utils/sessionStorageUtils.ts:770).
//   compact  system/chat_compression {systemPayload: {compressedHistory: Content[], summaryPrefixLength}} (:3560): the
//            history the model saw afterwards, opening with the summary as a user text (services/postCompactAttachments.ts
//            :860). The UI history keeps every record, so the summary is a compaction item where it happened.
//   branch   The conversation is the parentUuid chain from the last conversation record (utils/transcript-records.ts:461
//            selectTranscriptLeaf; system session_sources_snapshot / session_artifact_* / managed_session_* records are
//            not conversation, :111-124), records sharing a uuid are fragments of one message, parts concatenated
//            (:510 aggregateTranscriptRecordFragments); a rewind leaves the abandoned branch in the file. A Managed
//            session (first records session_execution_engine {engine: 'managed'} or managed_session_header_v1,
//            sessionService.ts:125) keeps its conversation in a journal this parser does not decode: skipped.
//   agents   Background sub-agents: <project>/subagents/<parentSessionId>/agent-<id>.jsonl (records with isSidechain,
//            agentId, sessionId = the parent's) + agent-<id>.meta.json {agentType, description, parentSessionId,
//            createdAt} (agents/agent-transcript.ts:9-20, :713). Listed only with includeSubagents, keyed
//            `<parentSessionId>/agent-<id>`.
//   legacy   <runtime>/tmp/<sha256(cwd)>/checkpoint-<encodeURIComponent(tag)>.json: a bare Content[] saved by the old
//            `/chat save <tag>` (core/logger.ts:684-737; HEAD no longer calls saveCheckpoint). No timestamps, no cwd but
//            its hash: matched against the cwds of the jsonl sessions. Fidelity partial. (logs.json there holds only the
//            prompts and is not read.)
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ItemList, isInjectedText, isRecord, makeSession, makeSummary, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, cachedSummary, envOf, existingDirs, findFiles, homeOf, isExcluded, listDir, mapLimit, readJsonFile, readRecords, statOf } from './shared.mjs';

export const id = 'qwen';
export const label = 'Qwen Code';
// Verified against the upstream writer (above) on synthesised files; no session written by a real Qwen Code on this
// machine. The catalog's flag (model.mjs SOURCES) is the integration's to flip.
export const experimental = false;

/** ~ and relative paths as Qwen resolves them (config/storage.ts:71 resolvePath). */
function resolvePath(dir, home, cwd) {
  let resolved = dir;
  if (resolved === '~' || resolved.startsWith('~/') || resolved.startsWith('~\\')) resolved = path.join(home, ...resolved.slice(2).split(/[/\\]+/).filter(Boolean));
  return path.isAbsolute(resolved) ? resolved : cwd ? path.resolve(cwd, resolved) : null;
}
const qwenHomeOf = ctx => { const env = envOf(ctx), home = homeOf(ctx); return env.QWEN_HOME ? resolvePath(env.QWEN_HOME, home, home) : path.join(home, '.qwen'); };
/** Every folder sessions may be under: QWEN_RUNTIME_DIR, the user's advanced.runtimeOutputDir (absolute / ~ only), QWEN_HOME. */
async function runtimeDirs(ctx) {
  const env = envOf(ctx), home = homeOf(ctx), qwenHome = qwenHomeOf(ctx);
  const configured = (await readJsonFile(path.join(qwenHome, 'settings.json')))?.advanced?.runtimeOutputDir;
  return [
    env.QWEN_RUNTIME_DIR ? resolvePath(env.QWEN_RUNTIME_DIR, home, home) : null,
    typeof configured === 'string' && configured ? resolvePath(configured, home, null) : null,
    qwenHome,
  ].filter(Boolean);
}
export const roots = ctx => [...new Set([envOf(ctx).QWEN_RUNTIME_DIR ? resolvePath(envOf(ctx).QWEN_RUNTIME_DIR, homeOf(ctx), homeOf(ctx)) : null, qwenHomeOf(ctx)].filter(Boolean))].map(dir => path.join(dir, 'projects'));

// ---- the conversation chain (utils/transcript-records.ts) ---------------------------------------------------------
const RECORD_TYPES = new Set(['user', 'assistant', 'tool_result', 'system']);
const NON_CONVERSATION = new Set(['session_sources_snapshot', 'session_artifact_event', 'session_artifact_snapshot',
  'managed_session_header_v1', 'managed_session_event_v1', 'managed_session_commit_v1', 'managed_session_snapshot_base_v1']);
/** validateTranscriptRecord (:330): identity fields present, a known record type. */
const isValid = record => isRecord(record) && typeof record.uuid === 'string' && record.uuid.length > 0
  && (typeof record.parentUuid === 'string' || record.parentUuid === null) && typeof record.sessionId === 'string' && record.sessionId.length > 0
  && RECORD_TYPES.has(record.type);
const isConversation = record => !(record.type === 'system' && NON_CONVERSATION.has(record.subtype));
const isManaged = records => records.slice(0, 5).some(record => record?.subtype === 'managed_session_header_v1'
  || (record?.type === 'system' && record.subtype === 'session_execution_engine' && record.systemPayload?.engine === 'managed'));

/** The chain ending at the last conversation record, oldest first, fragments of one uuid joined ([] when none). */
export function branchOf(records) {
  const valid = records.filter(record => isValid(record) && isConversation(record));
  const leaf = valid.at(-1);
  if (!leaf) return [];
  const fragments = new Map();
  for (const record of valid) {
    if (fragments.has(record.uuid)) fragments.get(record.uuid).push(record);
    else fragments.set(record.uuid, [record]);
  }
  const out = [], seen = new Set();
  for (let uuid = leaf.uuid; uuid && !seen.has(uuid) && fragments.has(uuid); uuid = fragments.get(uuid)[0].parentUuid) {
    seen.add(uuid);
    out.push(aggregate(fragments.get(uuid)));
  }
  return out.reverse();
}
function aggregate(list) {
  if (list.length === 1) return list[0];
  const base = { ...list[0] };
  let parts = Array.isArray(base.message?.parts) ? [...base.message.parts] : null;
  for (const record of list.slice(1)) {
    if (record.message !== undefined) parts = [...(parts ?? []), ...(Array.isArray(record.message?.parts) ? record.message.parts : [])];
    if (record.model && !base.model) base.model = record.model;
    if (record.toolCallResult && !base.toolCallResult) base.toolCallResult = record.toolCallResult;
    if (record.timestamp && (!base.timestamp || record.timestamp > base.timestamp)) base.timestamp = record.timestamp;
  }
  if (parts) base.message = { ...(base.message ?? {}), parts };
  return base;
}

// ---- items ----------------------------------------------------------------------------------------------------------
const HOOK_CONTEXT = /^<qwen:user-prompt-submit-context>\n[\s\S]*\n<\/qwen:user-prompt-submit-context>$/;
const INJECTED_SUBTYPES = new Set(['notification', 'cron', 'background_task_completed', 'agent_mention', 'agent_message']);
const partsOf = record => Array.isArray(record?.message?.parts) ? record.message.parts : Array.isArray(record?.message?.content) ? record.message.content : [];
const isText = part => typeof part?.text === 'string';
const isHookContext = part => isText(part) && HOOK_CONTEXT.test(part.text.trim());

/**
 * What the user sees of a prompt (transcript-records.ts:239 projectUserTranscriptForDisplay): with a user-prompt payload
 * (hookContext beside displayText, or a final hook-context part) the typed displayText replaces the model-facing text
 * parts, which become injected context; images stay. {user: parts, injected: parts}.
 */
function userParts(record) {
  const parts = partsOf(record);
  const payload = isRecord(record.systemPayload) ? record.systemPayload : null;
  const finalHook = parts.length > 1 && isHookContext(parts.at(-1));
  const display = payload && (typeof payload.hookContext === 'string' || finalHook) && typeof payload.displayText === 'string' ? payload.displayText : undefined;
  const user = [], injected = [];
  if (display !== undefined && display) user.push({ text: display });
  for (const part of parts) {
    if (isText(part)) {
      if (display !== undefined || isHookContext(part) || isInjectedText('qwen', part.text)) injected.push({ text: part.text });
      else user.push({ text: part.text });
    } else if (part?.inlineData) user.push({ image: { mime: part.inlineData.mimeType ?? 'image/*', data: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } });
    else if (part?.fileData) user.push({ file: { name: path.basename(String(part.fileData.fileUri ?? 'file')), path: part.fileData.fileUri, mime: part.fileData.mimeType } });
  }
  return { user, injected };
}
const promptOf = record => record?.type === 'user' && (record.subtype === undefined || record.subtype === 'mid_turn_user_message')
  ? userParts(record).user.filter(isText).map(part => part.text).join('\n') : '';

function responseText(response) {
  if (typeof response === 'string') return response;
  if (typeof response?.output === 'string') return response.output;
  if (typeof response?.error === 'string') return response.error;
  if (typeof response?.error?.message === 'string') return response.error.message;
  if (Array.isArray(response?.content)) return textOfBlocks(response.content);
  return response === undefined ? '' : JSON.stringify(response);
}
/** The summary text of a chat_compression record: the user text of its summary prefix (older payloads: `summary`). */
export function compactionSummary(record) {
  const payload = isRecord(record?.systemPayload) ? record.systemPayload : {};
  const history = Array.isArray(payload.compressedHistory) ? payload.compressedHistory : [];
  const prefix = history.slice(0, Number.isInteger(payload.summaryPrefixLength) && payload.summaryPrefixLength > 0 ? payload.summaryPrefixLength : 1);
  const text = prefix.filter(content => content?.role === 'user').flatMap(content => (Array.isArray(content.parts) ? content.parts : []).filter(isText).map(part => part.text)).join('\n\n');
  return text || (typeof payload.summary === 'string' ? payload.summary : typeof record?.summary === 'string' ? record.summary : '');
}

export function itemsOf(records, { sidechain = false } = {}) {
  const list = new ItemList();
  const toolResult = (part, record, ts) => list.toolResult({ callId: part.functionResponse.id ?? part.functionResponse.name, text: responseText(part.functionResponse.response), ts,
    isError: !!part.functionResponse.response?.error || record.toolCallResult?.status === 'error' || !!record.toolCallResult?.error });
  for (const record of records) {
    if (record.isSidechain === true && !sidechain) continue;
    const ts = record.timestamp, parts = partsOf(record);
    if (record.type === 'system') {
      if (record.subtype === 'chat_compression') {
        const summary = compactionSummary(record);
        if (summary) list.push('compaction', { ts, compaction: { summary } });
      }
      continue;
    }
    if (record.type === 'user') {
      if (INJECTED_SUBTYPES.has(record.subtype)) {
        const display = typeof record.systemPayload?.displayText === 'string' && record.systemPayload.displayText ? [{ text: record.systemPayload.displayText }] : parts.filter(isText).map(part => ({ text: part.text }));
        list.push('injected', { ts, parts: display });
        continue;
      }
      for (const part of parts) if (part?.functionResponse) toolResult(part, record, ts);
      const { user, injected } = userParts(record);
      list.push('injected', { ts, parts: injected });
      list.push('user', { ts, parts: user });
    } else if (record.type === 'assistant') {
      // Adjacent text parts of one Content are one reply (a streamed or fragmented message), joined as the API joins them.
      let text = null;
      const flush = () => { if (text !== null) list.push('assistant', { ts, parts: [{ text }] }); text = null; };
      for (const part of parts) {
        if (isText(part) && !part.thought) { text = (text ?? '') + part.text; continue; }
        flush();
        if (isText(part)) list.push('reasoning', { ts, reasoning: { text: part.text } });
        else if (part?.functionCall) list.toolCall({ callId: part.functionCall.id ?? part.functionCall.name, name: part.functionCall.name, raw: part.functionCall.args ?? {}, ts });
      }
      flush();
    } else if (record.type === 'tool_result' && record.subtype !== 'code_mode_tool_result') {
      for (const part of parts) if (part?.functionResponse) toolResult(part, record, ts);
    }
  }
  return list.items;
}

// ---- files ----------------------------------------------------------------------------------------------------------
async function readChat(file) {
  const records = [];
  for await (const record of readRecords(file)) records.push(record);
  return records;
}
const lastTitle = records => records.findLast(record => record?.type === 'system' && record.subtype === 'custom_title' && typeof record.systemPayload?.customTitle === 'string')?.systemPayload.customTitle;

async function summaryOf(entry, stat) {
  const records = await readChat(entry.file);
  if (isManaged(records)) return null;
  const branch = branchOf(records).filter(record => entry.parentId || record.isSidechain !== true);
  const first = branch.find(record => promptOf(record));
  if (!first) return null;
  const last = branch.at(-1);
  const meta = entry.parentId ? await readJsonFile(entry.file.replace(/\.jsonl$/, '.meta.json')) : null;
  const sourceId = entry.parentId ? `${entry.parentId}/${path.basename(entry.file, '.jsonl')}` : path.basename(entry.file, '.jsonl');
  return makeSummary('qwen', sourceId, {
    sourcePath: entry.file, title: entry.parentId ? (meta?.description || meta?.agentType || first.agentName || '') : lastTitle(records) ?? '',
    firstPrompt: promptOf(first), cwd: branch.find(record => typeof record.cwd === 'string' && record.cwd)?.cwd ?? null,
    gitBranch: branch.findLast(record => record.gitBranch)?.gitBranch, model: branch.findLast(record => record.type === 'assistant' && record.model)?.model,
    createdAt: branch[0]?.timestamp ?? meta?.createdAt, updatedAt: last?.timestamp ?? stat.mtimeMs, archived: entry.archived === true,
    parentId: entry.parentId ?? null, isSubagent: !!entry.parentId, experimental,
    messageCount: branch.filter(record => (record.type === 'user' && promptOf(record)) || (record.type === 'assistant' && partsOf(record).some(part => isText(part) && !part.thought))).length,
  });
}

/** Legacy /chat save checkpoints: {file, hash, tag}. */
async function checkpointFiles(dirs) {
  const out = [];
  for (const dir of dirs) {
    for (const entry of await listDir(path.join(dir, 'tmp'))) {
      if (!entry.isDirectory() || !/^[0-9a-f]{64}$/.test(entry.name)) continue;
      for (const file of await listDir(path.join(dir, 'tmp', entry.name))) {
        const match = file.isFile() ? /^checkpoint-(.+)\.json$/.exec(file.name) : null;
        if (match) out.push({ file: path.join(dir, 'tmp', entry.name, file.name), hash: entry.name, tag: match[1] });
      }
    }
  }
  return out;
}
const decodeTag = tag => { try { return decodeURIComponent(tag); } catch { return tag; } };
const checkpointItems = contents => {
  const records = (Array.isArray(contents) ? contents : []).filter(isRecord).map((content, index) => ({
    uuid: String(index), parentUuid: null, sessionId: 'checkpoint', type: content.role === 'model' ? 'assistant' : (content.parts ?? []).every(part => part?.functionResponse) ? 'tool_result' : 'user', message: content,
  }));
  return itemsOf(records);
};

async function sessionFiles(ctx) {
  const entries = [];
  for (const dir of await existingDirs((await runtimeDirs(ctx)).map(base => path.join(base, 'projects')))) {
    for (const project of await listDir(dir)) {
      if (!project.isDirectory()) continue;
      const chats = path.join(dir, project.name, 'chats');
      for (const file of await listDir(chats)) if (file.isFile() && file.name.endsWith('.jsonl')) entries.push({ file: path.join(chats, file.name) });
      for (const file of await listDir(path.join(chats, 'archive'))) if (file.isFile() && file.name.endsWith('.jsonl')) entries.push({ file: path.join(chats, 'archive', file.name), archived: true });
      if (!ctx.includeSubagents) continue;
      for (const parent of await listDir(path.join(dir, project.name, 'subagents'))) {
        if (!parent.isDirectory()) continue;
        const files = await findFiles(path.join(dir, project.name, 'subagents', parent.name), name => /^agent-.+\.jsonl$/.test(name), { depth: 0 });
        for (const file of files) entries.push({ file, parentId: parent.name });
      }
    }
  }
  return entries.filter(entry => !isExcluded(entry.file, ctx.exclude));
}

export async function list(ctx = {}) {
  try {
    const entries = await sessionFiles(ctx);
    const sessions = (await mapLimit(entries, CONCURRENCY, entry => cachedSummary(ctx, entry.file, stat => summaryOf(entry, stat)))).filter(Boolean);
    // One session id in two runtime folders (QWEN_RUNTIME_DIR and ~/.qwen): the newer copy.
    const byId = new Map();
    for (const session of sessions) if (!byId.has(session.sourceId) || (byId.get(session.sourceId).updatedAt ?? 0) < (session.updatedAt ?? 0)) byId.set(session.sourceId, session);
    const cwdByHash = new Map([...byId.values()].filter(session => session.cwd).map(session => [createHash('sha256').update(session.cwd).digest('hex'), session.cwd]));
    const checkpoints = (await checkpointFiles(await existingDirs(await runtimeDirs(ctx)))).filter(entry => !isExcluded(entry.file, ctx.exclude));
    for (const entry of checkpoints) {
      const stat = await statOf(entry.file);
      const summary = await cachedSummary(ctx, entry.file, async () => {
        const items = checkpointItems(await readJsonFile(entry.file));
        const firstUser = items.find(item => item.kind === 'user')?.parts.find(isText)?.text;
        if (!firstUser) return null;
        return makeSummary('qwen', `tmp/${entry.hash}/${entry.tag}`, { sourcePath: entry.file, title: decodeTag(entry.tag), firstPrompt: firstUser,
          createdAt: stat?.mtimeMs, updatedAt: stat?.mtimeMs, fidelity: 'partial', experimental, messageCount: items.filter(item => item.kind === 'user' || item.kind === 'assistant').length,
          warnings: ['A Qwen Code checkpoint saved with /chat save: no timestamps, and its folder is known only by a hash.'] });
      }, stat);
      if (summary) byId.set(summary.sourceId, { ...summary, cwd: cwdByHash.get(entry.hash) ?? null });
    }
    return [...byId.values()];
  } catch (error) {
    ctx.warn?.('qwen', String(error?.message || error));
    return [];
  }
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    const sub = typeof sourceId === 'string' && sourceId.includes('/') && !sourceId.startsWith('tmp/');
    summary = (await list(sub ? { ...ctx, includeSubagents: true } : ctx)).find(entry => entry.sourceId === sourceId) ?? null;
  }
  if (!summary) throw new Error('Qwen Code session not found.');
  if (String(summary.sourceId).startsWith('tmp/')) return makeSession(summary, checkpointItems(await readJsonFile(summary.sourcePath)));
  return makeSession(summary, itemsOf(branchOf(await readChat(summary.sourcePath)), { sidechain: summary.isSubagent === true }));
}
