// Kimi: Kimi Code (github.com/MoonshotAI/kimi-code, the TypeScript CLI OpenClaude runs as `kimi acp`, pinned
// @moonshot-ai/kimi-code 2.1.1 in app/electron/cores/kimi.mjs; read against HEAD 2.4.1) and the older Python kimi-cli it
// migrates from. Read from the code that WRITES sessions, never run.
//
// Kimi Code: $KIMI_CODE_HOME or ~/.kimi-code (apps/kimi-code/src/utils/paths.ts:36), sessions/<wd>/<sessionId>/
//   <wd>           encodeWorkDirKey(cwd) = wd_<slug of the folder name, 40>_<sha256(cwd) 12 hex> (agent-core-v2
//                  _base/utils/workdir-slug.ts:17-23). Not reversible: the cwd comes from state.json. Dot entries
//                  (.index-cache, .index-dirty) are the index's own (app/sessionIndex/sessionIndexSource.ts:209-220).
//   <sessionId>    `session_<uuid>` (workspace/sessionLifecycle/sessionLifecycleService.ts:1046); `ses_<id>` for
//                  migrated or imported ones (migration-legacy sessions/migrate-one.ts:37, kimi-code
//                  session-import/run-import.ts:90).
//   state.json     SessionMeta (session/sessionMetadata/sessionMetadata.ts:17-34; written by sessionMetadataService
//                  encodeSessionMeta :347 and migration-legacy imported-session.ts:46-61): {id, version 2, cwd, title,
//                  titleKind, isCustomTitle, lastPrompt, createdAt, updatedAt (ms), archived, archivedAt, forkedFrom,
//                  agents {<agentId>: {homedir, type main|sub|independent, parentAgentId}}, custom}; the index also
//                  takes session-meta/state.json and a cwd under workDir / custom.cwd (sessionIndexSource.ts:108,
//                  140-151, 240-260). custom.parent_session_id + child_session_kind 'child' is a child session
//                  (app/sessionIndex/sessionIndex.ts:4-8, sessionLifecycleService.ts:831-845); custom.kimi_cli_session_id
//                  marks a migrated kimi-cli session (migration-legacy sessions/state-writer.ts:88-92).
//   agents/<agent>/wire.jsonl  one journal per agent (main, agent-0 …; wire/record.ts:20): a metadata line
//                  {type:'metadata', protocol_version, created_at} (:40-61) then records {type, …payload, time}
//                  (docs/wire-manifest.d.ts:15-18); protocol 1.0-1.5 (wire/migration/migration.ts:19), 1.0 tool calls
//                  {type, id, function:{name, arguments}} became {type, id, name, arguments} (migration/v1.1.ts:22-29).
//                  The conversation is the contextMemory fold (agent/contextMemory/contextOps.ts:80-109):
//                    context.append_message {message}  a whole ContextMessage {role user|assistant|tool|system,
//                        content[], toolCalls[], toolCallId?, origin?} (contextEvents.ts:12-27; on disk
//                        wireService.ts:681-698: parts text {text}, think {think, encrypted?, hidden?},
//                        image_url {imageUrl:{url}} — a `blobref:` url names agents/<agent>/blobs, agent/blob/agentBlobService.ts:5).
//                        origin.kind (agent/contextMemory/types.ts:16-125): user = a prompt; compaction_summary = a
//                        summary; injection / system_trigger / hook_result / task / cron_* / … = harness context.
//                    context.append_loop_event {event}  the streamed assistant (loopEventFold.ts:20-226): step.begin
//                        opens an assistant message, content.part / tool.call (args object) of that step add to it,
//                        tool.result pushes a tool message, step.end seals it (finishReason interrupted | error does not),
//                        a vacuous step is dropped; messages appended while tool calls are pending wait for the results.
//                    context.apply_compaction {summary | contextSummary, compactedCount} (contextOps.ts:152-230),
//                    context.clear (empties the context), context.undo {count} (cuts back `count` prompt anchors,
//                        never across a compaction summary; contextOps.ts:272-301, conversationTime.ts isUndoAnchorOrigin).
//                  usage.record {model} names the model (wire-manifest.d.ts:1017-1024); everything else (turn.*,
//                  permission.*, profile.bind, token_counting.*, task.*) is not conversation. Sub-agents' journals are
//                  listed with includeSubagents as `<sessionId>/<agentId>`.
//
// kimi-cli (legacy): $KIMI_SHARE_DIR or ~/.kimi (acp-bridge agents/kimi.js detectKimiCliMigration), as migration-legacy
// reads it: kimi.json {work_dirs:[{path, kaos, last_session_id}]} (kimi-cli-schema.ts:4-12) maps md5(path) bucket names
// to work dirs (sessions/workdir-bucket.ts:22-25; a `<kaos>_<md5>` bucket is a non-local one, sessions/index.ts:79-101);
// sessions/<bucket>/<uuid>/context.jsonl or a flat sessions/<bucket>/<uuid>.jsonl (sessions/source.ts:19-58):
// OpenAI-style rows {role user|assistant|tool, content (string | parts text / think {think, encrypted?} / image_url
// {image_url:{url}} / image {url}), tool_calls [{type:'function', id, function:{name, arguments}}], tool_call_id}; roles
// _system_prompt / _checkpoint / _usage are bookkeeping (sessions/translator.ts:18, 101-133, content-part.ts:10-46).
// state.json {custom_title, title_generated, archived, wire_mtime (s)} merged with metadata.json {title}
// (kimi-cli-schema.ts:17-56, sessions/source.ts:60-124); sub-agents in <uuid>/subagents/<agent_id>/ (context.jsonl +
// meta.json {agent_id, subagent_type, description, created_at}, sessions/subagents.ts:131-157). A session already
// migrated into Kimi Code (its custom.kimi_cli_session_id) is listed there only. Kept experimental: kimi-cli itself is
// not in the source tree read.
import crypto from 'node:crypto';
import path from 'node:path';
import { ItemList, isRecord, makeSession, makeSummary, oneLine, parseKey, textOfBlocks } from '../model.mjs';
import { CONCURRENCY, cachedSummary, envOf, homeOf, isExcluded, listDir, mapLimit, parseLine, readJsonFile, readLines, readRecords, readTailLines, statOf } from './shared.mjs';

export const id = 'kimi';
export const label = 'Kimi';
// Kimi Code sessions follow the upstream writer; legacy kimi-cli summaries still say experimental themselves.
export const experimental = false;

const codeHome = ctx => envOf(ctx).KIMI_CODE_HOME || path.join(homeOf(ctx), '.kimi-code');
const legacyHome = ctx => envOf(ctx).KIMI_SHARE_DIR || path.join(homeOf(ctx), '.kimi');
export const roots = ctx => [path.join(codeHome(ctx), 'sessions'), path.join(legacyHome(ctx), 'sessions')];

const SUB = '/';
const MAIN = 'main';
const kindOf = message => (isRecord(message?.origin) && typeof message.origin.kind === 'string' ? message.origin.kind : undefined);

// ---- legacy (OpenAI-style) messages: shared with copilot.mjs ------------------------------------------------------
/** A legacy media part ({type:'image_url', image_url:{url}} | {type:'image', url}) as a model image part, or null. */
function legacyImage(part) {
  const url = part?.type === 'image_url' ? (part.image_url?.url ?? part.imageUrl?.url) : part?.type === 'image' ? part.url : undefined;
  if (typeof url !== 'string' || !url) return null;
  const mime = (/^data:([^;,]+)/.exec(url)?.[1]) ?? 'image/*';
  return { image: { mime, ...(url.startsWith('data:') ? { data: url } : /^[a-z]+:\/\//i.test(url) ? { url } : { path: url }) } };
}

/**
 * OpenAI chat-completions messages → items (shared with copilot.mjs). `think` parts and `reasoning_content` are plain
 * reasoning (an `encrypted` think is opaque); system messages are injected context; '_'-prefixed roles are bookkeeping.
 */
export function openAiItems(messages, { list = new ItemList(), isInjected = () => false, vendor = 'kimi' } = {}) {
  for (const message of messages) {
    const role = message?.role, ts = message?.timestamp ?? message?.created_at;
    if (typeof role !== 'string' || role.startsWith('_')) continue;
    const content = Array.isArray(message.content) ? message.content : typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : [];
    if (role === 'system' || role === 'developer') { list.push('injected', { ts, parts: [{ text: textOfBlocks(content) }] }); continue; }
    if (role === 'tool' || role === 'function') { list.toolResult({ callId: message.tool_call_id ?? message.name, text: textOfBlocks(content), ts }); continue; }
    const thinks = content.filter(part => part?.type === 'think' || part?.type === 'thinking');
    const reasoning = [message.reasoning_content, ...thinks.map(part => part.think ?? part.thinking ?? part.text)].filter(text => typeof text === 'string' && text).join('\n\n');
    const sealed = thinks.map(part => part.encrypted).filter(value => typeof value === 'string' && value);
    if (reasoning || sealed.length) list.push('reasoning', { ts, reasoning: { ...(reasoning ? { text: reasoning } : {}), ...(sealed.length ? { opaque: { vendor, model: null, payload: sealed.join('\n') } } : {}) } });
    const parts = [];
    for (const part of content) {
      if (part?.type === 'text' && typeof part.text === 'string') parts.push({ text: part.text });
      else { const image = legacyImage(part); if (image) parts.push(image); }
    }
    if (role === 'user') list.push(parts.some(part => part.text && isInjected(part.text)) && parts.every(part => !part.text || isInjected(part.text)) ? 'injected' : 'user', { ts, parts });
    else if (role === 'assistant') {
      list.push('assistant', { ts, parts });
      for (const call of message.tool_calls ?? []) list.toolCall({ callId: call.id, name: call.function?.name ?? call.name, raw: call.function?.arguments ?? call.arguments, ts });
    }
  }
  return list.items;
}

// ---- Kimi Code: the contextMemory fold over a wire journal -------------------------------------------------------
const isVacuous = part => part?.type === 'text' ? !String(part.text ?? '').trim()
  : part?.type === 'think' ? part.encrypted === undefined && part.hidden !== true && !String(part.think ?? '').trim()
    : !['image_url', 'audio_url', 'video_url'].includes(part?.type); // loopEventFold.ts:175, human/llm/message.ts:162-172
/** A 1.0 tool call {function:{name, arguments}} or a 1.1+ one {name, arguments} (wire/migration/v1.1.ts:22-29). */
const callOf = call => ({ id: call?.id, name: call?.name ?? call?.function?.name, arguments: call?.arguments ?? call?.function?.arguments ?? null });
/** contextOps.ts readContextCompactionRawSummary (:211-230): summary string, else contextSummary, else a summary message's text. */
function compactionText(record) {
  if (typeof record.summary === 'string') return record.summary;
  if (typeof record.contextSummary === 'string') return record.contextSummary;
  if (isRecord(record.summary) && Array.isArray(record.summary.content)) return record.summary.content.filter(part => part?.type === 'text').map(part => part.text ?? '').join('');
  return '';
}
/** conversationTime.ts isUndoAnchorOrigin (:16-24): a user prompt (not one steered into a running turn) or a user-slash skill. */
function isUndoAnchor(message) {
  if (message.role !== 'user') return false;
  const origin = message.origin;
  if (isRecord(origin) && origin.inTurn === true) return false;
  if (!isRecord(origin) || origin.kind === 'user') return true;
  return (origin.kind === 'skill_activation' || origin.kind === 'plugin_command') && origin.trigger === 'user-slash';
}

/**
 * The display log of one agent journal: the ContextMessages contextOps.ts would fold, except that a compaction keeps
 * what came before it and leaves a marker ({role:'_compaction', summary}) where it happened. Pure.
 * @returns {{ messages: object[], model: string | null }}
 */
export function foldWire(records) {
  let log = [];
  let open = null; // {message, stepUuid (null = the next step's), hasCalls, vacuous}
  const pending = new Map(); // toolCallId → name
  let deferred = [];
  let model = null;
  const flushDeferred = () => { if (pending.size || !deferred.length) return; log.push(...deferred); deferred = []; };
  const settle = () => {
    if (!open) return;
    pending.clear(); // calls left without a result: the converters add "(no result)"
    flushDeferred();
    if (!open.hasCalls && open.vacuous) log = log.filter(entry => entry !== open.message);
    else delete open.message.partial;
    open = null;
  };
  const reset = () => { open = null; pending.clear(); deferred = []; };
  const accepts = stepUuid => { if (!open) return false; if (open.stepUuid === null) open.stepUuid = stepUuid; return open.stepUuid === stepUuid; };
  for (const record of records) {
    if (!isRecord(record) || typeof record.type !== 'string') continue;
    const time = Number.isFinite(record.time) ? record.time : null;
    switch (record.type) {
      case 'context.append_message': {
        const message = record.message;
        if (!isRecord(message) || typeof message.role !== 'string') break;
        const entry = { ...message, content: Array.isArray(message.content) ? message.content : [], toolCalls: (Array.isArray(message.toolCalls) ? message.toolCalls : []).map(callOf), time };
        if (pending.size) deferred.push(entry); else log.push(entry);
        break;
      }
      case 'context.append_loop_event': {
        const event = record.event;
        if (!isRecord(event)) break;
        if (event.type === 'step.begin') {
          settle();
          open = { message: { role: 'assistant', content: [], toolCalls: [], partial: true, time }, stepUuid: event.uuid ?? null, hasCalls: false, vacuous: true };
          log.push(open.message);
        } else if (event.type === 'step.end') {
          if (event.finishReason === 'interrupted' || event.finishReason === 'error') break;
          settle();
        } else if (event.type === 'content.part' && isRecord(event.part)) {
          if (!accepts(event.stepUuid)) break;
          open.message.content.push(event.part);
          open.vacuous = open.vacuous && isVacuous(event.part);
        } else if (event.type === 'tool.call' && typeof event.toolCallId === 'string') {
          if (!accepts(event.stepUuid)) break;
          open.message.toolCalls.push({ id: event.toolCallId, name: event.name, arguments: event.args === undefined ? null : JSON.stringify(event.args) });
          pending.set(event.toolCallId, event.name);
          open.hasCalls = true;
        } else if (event.type === 'tool.result' && pending.has(event.toolCallId)) {
          pending.delete(event.toolCallId);
          const result = isRecord(event.result) ? event.result : {};
          const output = result.output;
          log.push({ role: 'tool', toolCallId: event.toolCallId, content: typeof output === 'string' ? [{ type: 'text', text: output }] : Array.isArray(output) ? output : [], toolCalls: [], isError: result.isError === true, time });
          flushDeferred();
        }
        break;
      }
      case 'context.apply_compaction':
        settle();
        log.push({ role: '_compaction', summary: compactionText(record), time });
        reset();
        break;
      case 'context.clear':
        log = [];
        reset();
        break;
      case 'context.undo': {
        settle();
        const count = Number(record.count);
        if (!Number.isSafeInteger(count) || count <= 0) break;
        // computeUndoCut (contextOps.ts:272-297): anchors counted back from the end, injections skipped, stopping at a
        // compaction; only a full cut applies (isFullyUndoable :299-301).
        let remaining = count, cut = -1;
        for (let index = log.length - 1; index >= 0 && remaining > 0; index--) {
          const message = log[index];
          if (kindOf(message) === 'injection') continue;
          if (message.role === '_compaction' || kindOf(message) === 'compaction_summary') break;
          if (isUndoAnchor(message)) { remaining--; cut = index; }
        }
        if (cut >= 0 && remaining === 0) log = log.slice(0, cut);
        reset();
        break;
      }
      case 'usage.record':
        if (typeof record.model === 'string' && record.model) model = record.model;
        break;
      default:
        break;
    }
  }
  settle();
  return { messages: log, model };
}

/** A Kimi Code content part as a model part (text, or an image that is not a blob reference). */
function partOf(part) {
  if (part?.type === 'text' && typeof part.text === 'string') return { text: part.text };
  if (part?.type === 'image_url') {
    const url = part.imageUrl?.url ?? part.image_url?.url;
    if (typeof url !== 'string' || !url) return null;
    if (url.startsWith('blobref:')) return { text: '[image]' };
    const mime = (/^data:([^;,]+)/.exec(url)?.[1]) ?? 'image/*';
    return { image: { mime, ...(url.startsWith('data:') ? { data: url } : /^[a-z]+:\/\//i.test(url) ? { url } : { path: url }) } };
  }
  return null;
}
const partsOf = content => content.map(partOf).filter(Boolean);

/** The folded display log → items. */
export function wireItems(messages) {
  const list = new ItemList();
  for (const message of messages) {
    const ts = message.time;
    if (message.role === '_compaction') { list.push('compaction', { ts, compaction: { summary: message.summary } }); continue; }
    const kind = kindOf(message);
    if (message.role === 'tool') { list.toolResult({ callId: message.toolCallId, text: textOfBlocks(message.content.filter(part => part?.type === 'text')), isError: message.isError === true, ts }); continue; }
    if (message.role === 'system') { if (message.content.length) list.push('injected', { ts, parts: partsOf(message.content) }); continue; }
    if (message.role === 'user') {
      if (kind === 'compaction_summary') list.push('compaction', { ts, compaction: { summary: textOfBlocks(message.content.filter(part => part?.type === 'text')) } });
      else list.push(kind === undefined || kind === 'user' ? 'user' : 'injected', { ts, parts: partsOf(message.content) });
      continue;
    }
    if (message.role !== 'assistant') continue;
    const thinks = message.content.filter(part => part?.type === 'think' && part.hidden !== true);
    const text = thinks.map(part => part.think).filter(value => typeof value === 'string' && value.trim()).join('\n\n');
    const sealed = thinks.map(part => part.encrypted).filter(value => typeof value === 'string' && value);
    if (text || sealed.length) list.push('reasoning', { ts, reasoning: { ...(text ? { text } : {}), ...(sealed.length ? { opaque: { vendor: 'kimi-code', model: null, payload: sealed.join('\n') } } : {}) } });
    list.push('assistant', { ts, parts: partsOf(message.content) });
    for (const call of message.toolCalls) list.toolCall({ callId: call.id, name: call.name, raw: call.arguments, ts });
  }
  return list.items;
}

async function readWire(file) {
  const records = [];
  for await (const record of readRecords(file)) records.push(record);
  return records;
}

/** The first prompt of a journal: its first user context message, else its first user turn.prompt (head only). */
async function firstPromptOf(file) {
  let lines = 0;
  for await (const line of readLines(file)) {
    if (++lines > 400) break;
    const record = parseLine(line);
    if (record?.type === 'context.append_message' && record.message?.role === 'user' && [undefined, 'user'].includes(kindOf(record.message))) return textOfBlocks(record.message.content);
    if (record?.type === 'turn.prompt' && (!isRecord(record.origin) || record.origin.kind === 'user') && Array.isArray(record.input)) return textOfBlocks(record.input);
  }
  return '';
}
/** The model of a journal's last usage.record (its tail only). */
async function lastModelOf(file) {
  const lines = await readTailLines(file, 131072);
  for (let index = lines.length - 1; index >= 0; index--) {
    const record = parseLine(lines[index]);
    if (record?.type === 'usage.record' && typeof record.model === 'string' && record.model) return record.model;
  }
  return null;
}

/** The session folders under sessions/<wd>/, each with its state.json (or session-meta/state.json). */
async function codeSessions(ctx) {
  const root = path.join(codeHome(ctx), 'sessions'), out = [];
  for (const workspace of await listDir(root)) {
    if (!workspace.isDirectory() || workspace.name.startsWith('.')) continue;
    for (const session of await listDir(path.join(root, workspace.name))) {
      if (!session.isDirectory()) continue;
      const dir = path.join(root, workspace.name, session.name);
      if (!isExcluded(dir, ctx.exclude)) out.push({ dir, workspace: workspace.name, sessionId: session.name });
    }
  }
  return out;
}
async function readState(dir) {
  for (const file of [path.join(dir, 'state.json'), path.join(dir, 'session-meta', 'state.json')]) {
    const stat = await statOf(file);
    if (stat) return { file, stat, state: await readJsonFile(file) };
  }
  return null;
}
const cwdOf = state => (typeof state?.cwd === 'string' && state.cwd ? state.cwd : typeof state?.workDir === 'string' && state.workDir ? state.workDir
  : typeof state?.custom?.cwd === 'string' && state.custom.cwd ? state.custom.cwd : null); // sessionIndexSource.ts recoverCwd :140-151

/** One Kimi Code session's summaries: the main agent, plus its sub-agents with includeSubagents. */
async function codeSummaries(ctx, entry) {
  const meta = await readState(entry.dir);
  if (!meta || !isRecord(meta.state) || (typeof meta.state.id === 'string' && meta.state.id !== entry.sessionId)) return [];
  const state = meta.state, custom = isRecord(state.custom) ? state.custom : {};
  const wire = path.join(entry.dir, 'agents', MAIN, 'wire.jsonl');
  const wireStat = await statOf(wire);
  if (!wireStat) return [];
  // The summary changes with the journal or the state (a rename, an archive): one stamp for both.
  const stamp = { mtimeMs: Math.max(wireStat.mtimeMs, meta.stat.mtimeMs), size: wireStat.size * 1e6 + meta.stat.size };
  const main = await cachedSummary(ctx, wire, async () => {
    const firstPrompt = await firstPromptOf(wire);
    const lastPrompt = typeof state.lastPrompt === 'string' ? state.lastPrompt : '';
    if (!firstPrompt && !lastPrompt && !state.title) return null;
    const child = custom.child_session_kind === 'child' && typeof custom.parent_session_id === 'string';
    return makeSummary('kimi', entry.sessionId, {
      sourcePath: wire, title: typeof state.title === 'string' ? state.title : '', firstPrompt: firstPrompt || lastPrompt, cwd: cwdOf(state),
      model: await lastModelOf(wire), createdAt: state.createdAt ?? wireStat.birthtimeMs, updatedAt: state.updatedAt ?? wireStat.mtimeMs,
      archived: state.archived === true, parentId: child ? custom.parent_session_id : null, isSubagent: child, experimental: false,
      extra: { forkedFrom: typeof state.forkedFrom === 'string' ? state.forkedFrom : null, kimiCliSessionId: typeof custom.kimi_cli_session_id === 'string' ? custom.kimi_cli_session_id : null },
    });
  }, stamp);
  if (!main || (main.isSubagent && !ctx.includeSubagents)) return [];
  const out = [main];
  if (!ctx.includeSubagents) return out;
  const agents = isRecord(state.agents) ? state.agents : {};
  for (const agent of await listDir(path.join(entry.dir, 'agents'))) {
    if (!agent.isDirectory() || agent.name === MAIN) continue;
    const file = path.join(entry.dir, 'agents', agent.name, 'wire.jsonl');
    const summary = await cachedSummary(ctx, file, async stat => {
      const prompt = await firstPromptOf(file);
      if (!prompt) return null;
      const labels = isRecord(agents[agent.name]?.labels) ? agents[agent.name].labels : {};
      return makeSummary('kimi', `${entry.sessionId}${SUB}${agent.name}`, {
        sourcePath: file, title: typeof labels.description === 'string' ? labels.description : '', firstPrompt: prompt, cwd: cwdOf(state),
        model: await lastModelOf(file), createdAt: stat.birthtimeMs, updatedAt: stat.mtimeMs, parentId: entry.sessionId, isSubagent: true, experimental: false,
        extra: { agentId: agent.name },
      });
    });
    if (summary) out.push(summary);
  }
  return out;
}

// ---- kimi-cli (legacy) ------------------------------------------------------------------------------------------
async function workDirs(ctx) {
  const value = await readJsonFile(path.join(legacyHome(ctx), 'kimi.json'));
  const map = new Map();
  for (const entry of Array.isArray(value?.work_dirs) ? value.work_dirs : []) {
    if (typeof entry?.path === 'string' && (entry.kaos ?? 'local') === 'local') map.set(crypto.createHash('md5').update(entry.path).digest('hex'), entry.path);
  }
  return map;
}

/** sessions/source.ts listBucketSessions (:19-58): <uuid>/context.jsonl, else a flat <uuid>.jsonl. */
async function legacySessions(ctx) {
  const root = path.join(legacyHome(ctx), 'sessions'), dirs = await workDirs(ctx), out = [];
  for (const bucket of await listDir(root)) {
    if (!bucket.isDirectory()) continue;
    const bucketDir = path.join(root, bucket.name), byId = new Map();
    for (const entry of await listDir(bucketDir)) {
      if (entry.isDirectory()) (byId.get(entry.name) ?? byId.set(entry.name, {}).get(entry.name)).dir = path.join(bucketDir, entry.name);
      else if (entry.isFile() && entry.name.endsWith('.jsonl') && entry.name.length > 6) { const uuid = entry.name.slice(0, -6); (byId.get(uuid) ?? byId.set(uuid, {}).get(uuid)).flat = path.join(bucketDir, entry.name); }
    }
    for (const [uuid, found] of byId) {
      const context = found.dir && (await statOf(path.join(found.dir, 'context.jsonl'))) ? path.join(found.dir, 'context.jsonl') : found.flat;
      if (context && !isExcluded(context, ctx.exclude)) out.push({ uuid, dir: found.dir ?? null, file: context, cwd: dirs.get(bucket.name) ?? null });
    }
  }
  return out;
}

/** state.json merged with metadata.json's title (sessions/source.ts mergeLegacyMetadata :84-124). */
async function legacyState(dir) {
  if (!dir) return {};
  const state = (await readJsonFile(path.join(dir, 'state.json'))) ?? {};
  const metadata = (await readJsonFile(path.join(dir, 'metadata.json'))) ?? {};
  const title = typeof state.custom_title === 'string' && state.custom_title ? state.custom_title
    : typeof metadata.title === 'string' && metadata.title && metadata.title !== 'Untitled' ? metadata.title : '';
  return { title, archived: state.archived === true || metadata.archived === true, wireMtime: state.wire_mtime ?? metadata.wire_mtime ?? null };
}

async function readMessages(file) {
  const out = [];
  for await (const record of readRecords(file)) out.push(record);
  return out;
}

async function legacySummaries(ctx, entry) {
  const out = [];
  const main = await cachedSummary(ctx, entry.file, async stat => {
    const messages = await readMessages(entry.file);
    const first = messages.find(message => message?.role === 'user');
    const state = await legacyState(entry.dir);
    if (!first && !state.title) return null;
    return makeSummary('kimi', entry.uuid, {
      sourcePath: entry.file, title: state.title, firstPrompt: textOfBlocks(first?.content), cwd: entry.cwd, archived: state.archived,
      createdAt: (await statOf(entry.dir ?? entry.file))?.birthtimeMs, updatedAt: state.wireMtime ?? stat.mtimeMs, experimental: true,
      messageCount: messages.filter(message => message?.role === 'user' || message?.role === 'assistant').length,
      extra: { legacy: true },
    });
  });
  if (!main) return out;
  out.push(main);
  if (!ctx.includeSubagents || !entry.dir) return out;
  for (const agent of await listDir(path.join(entry.dir, 'subagents'))) {
    if (!agent.isDirectory()) continue;
    const dir = path.join(entry.dir, 'subagents', agent.name), file = path.join(dir, 'context.jsonl');
    const summary = await cachedSummary(ctx, file, async stat => {
      const meta = (await readJsonFile(path.join(dir, 'meta.json'))) ?? {};
      const first = (await readMessages(file)).find(message => message?.role === 'user');
      if (!first) return null;
      return makeSummary('kimi', `${entry.uuid}${SUB}${typeof meta.agent_id === 'string' && meta.agent_id ? meta.agent_id : agent.name}`, {
        sourcePath: file, title: typeof meta.description === 'string' ? meta.description : '', firstPrompt: textOfBlocks(first.content), cwd: entry.cwd,
        createdAt: meta.created_at ?? stat.birthtimeMs, updatedAt: meta.updated_at ?? stat.mtimeMs, parentId: entry.uuid, isSubagent: true, experimental: true,
        extra: { legacy: true, agentId: meta.agent_id ?? agent.name },
      });
    });
    if (summary) out.push(summary);
  }
  return out;
}

export async function list(ctx = {}) {
  try {
    const code = (await mapLimit(await codeSessions(ctx), CONCURRENCY, entry => codeSummaries(ctx, entry))).flat().filter(Boolean);
    const migrated = new Set(code.map(summary => summary.kimiCliSessionId).filter(Boolean));
    const legacy = (await mapLimit((await legacySessions(ctx)).filter(entry => !migrated.has(entry.uuid)), CONCURRENCY, entry => legacySummaries(ctx, entry))).flat().filter(Boolean);
    return [...code, ...legacy];
  } catch (error) {
    ctx.warn?.('kimi', String(error?.message || error));
    return [];
  }
}

export async function read(target, ctx = {}) {
  let summary = typeof target === 'object' && target?.sourcePath ? target : null;
  if (!summary) {
    const sourceId = typeof target === 'string' ? (parseKey(target)?.sourceId ?? target) : target?.sourceId;
    summary = (await list(sourceId?.includes(SUB) ? { ...ctx, includeSubagents: true } : ctx)).find(entry => entry.sourceId === sourceId) ?? null;
  }
  if (!summary) throw new Error('Kimi session not found.');
  if (summary.legacy) return makeSession(summary, openAiItems(await readMessages(summary.sourcePath)));
  const { messages, model } = foldWire(await readWire(summary.sourcePath));
  const session = makeSession(summary, wireItems(messages));
  return model && !session.model ? { ...session, model } : session;
}

/** A one-line title for a Kimi Code session (state.json title, else its first prompt): tests and the preview. */
export const titleOf = summary => oneLine(summary?.title || summary?.firstPrompt || '', 120);
