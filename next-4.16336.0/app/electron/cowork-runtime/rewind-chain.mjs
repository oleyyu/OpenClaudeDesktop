import fs from 'node:fs/promises';
import path from 'node:path';

// R4i-cowork CW2 (research-ext/X2-cowork-session-actions.md CW-2): the host port of the 2.42304.0 Cowork rewind
// decision. Pure functions over the CLI's session transcript (JSONL) plus one bounded disk reader.
//
// 2.42304.0 main process (asar/.vite/build):
// - index.chunk-CB6cNSrW.js `async rewindSessionV2(` (1): tg (target user text), loadRawChain → parentUuid walk,
//   ag (absent-from-disk fork from the message buffer), Fw dead-branch check, refusal arm, then pendingRewindTo.
// - index.chunk-B5tintml.js exports `_i`→kw (walk), `ui`→Fw (resumable / dead / unknown), `Tu`→sn (midTurn),
//   with Nw / Pw / jw / Iw / Lw (compact_boundary preserved segments).
// - index.chunk-g6cUNaEf.js `async loadRawChain({` (1) and `function de(` (compactMetadata) for the entry shape.
// - index.chunk-muI2IV6k.js `dgt` (VQ): `e.Dead="dead",e.NoText="no_text",e.Unsupported="unsupported",e.Unknown="unknown"`.
// - index.chunk-DYcTWSEO.js `function u(e){return/^[/!]/.test(l(e))}` (o.U: a slash or bang command).
// Host differences: the queued-command remap of loadRawChain (`r.i`, typed-queued prompts) is not ported because the
// host sends exactly one prompt per turn and never queues; the 401 auth-error skip of `ln` is not ported (the host has
// no claude.ai auth errors); the transcript is read from the app-owned session `.claude` directory.

export const COWORK_REWIND_REFUSAL = Object.freeze({ Dead: 'dead', NoText: 'no_text', Unsupported: 'unsupported', Unknown: 'unknown' });

/** 2.42304.0 CB6cNSrW `Error("Another message reached the session during the rewind, …")`. */
export const REWIND_SEND_RACE = 'Another message reached the session during the rewind, so the conversation was not rewound. Try the rewind again.';
/** 2.42304.0 CB6cNSrW `Error("Session started while the rewind was being checked")`. */
export const REWIND_START_RACE = 'Session started while the rewind was being checked';
/** muI2IV6k `function Qzt(e){return e.includes("No message found with message.uuid")}` (t.jZ, takeRewindRefusal). */
export const REWIND_FORK_REFUSED = 'No message found with message.uuid';
export const isForkRefusal = (message) => typeof message === 'string' && message.includes(REWIND_FORK_REFUSED);

const SESSION_ID = /^[\w-]{1,100}$/;
export const validCliSessionId = (value) => typeof value === 'string' && SESSION_ID.test(value);

// ---- loadRawChain entry shape (g6cUNaEf loadRawChain + de) ----

/** g6cUNaEf `de`: compact_boundary preservedMessages / preservedSegment, validated. */
export function compactMetadataOf(record) {
  if (record.type !== 'system' || record.subtype !== 'compact_boundary') return {};
  const meta = record.compactMetadata, messages = meta?.preservedMessages, segment = meta?.preservedSegment;
  const anchor = value => typeof value === 'string' ? { anchorUuid: value } : {};
  const preservedMessages = Array.isArray(messages?.uuids) && messages.uuids.every(value => typeof value === 'string')
    ? { ...anchor(messages.anchorUuid), uuids: messages.uuids } : undefined;
  const preservedSegment = typeof segment?.headUuid === 'string' && typeof segment.tailUuid === 'string'
    ? { ...anchor(segment.anchorUuid), headUuid: segment.headUuid, tailUuid: segment.tailUuid } : undefined;
  return preservedMessages || preservedSegment ? { compactMetadata: { preservedMessages, preservedSegment } } : {};
}

/** One raw chain entry (loadRawChain's `i`). */
export function rawChainEntry(record) {
  return { type: record.type, subtype: record.subtype, uuid: record.uuid, parentUuid: record.parentUuid,
    parent_tool_use_id: record.parent_tool_use_id, isSidechain: record.isSidechain, timestamp: record.timestamp, ...compactMetadataOf(record) };
}

/** CB6cNSrW `tg`: the text of the user record with this uuid, newest first; null when absent or not text. */
export function userRecordText(records, uuid) {
  for (let index = records.length - 1; index >= 0; index--) {
    const record = records[index];
    if (record?.type !== 'user' || !('uuid' in record) || record.uuid !== uuid) continue;
    const content = record.message?.content;
    return typeof content === 'string' ? content
      : Array.isArray(content) ? content.filter(block => block.type === 'text').map(block => block.text).join('\n') : null;
  }
  return null;
}

/** Parse transcript JSONL text into raw chain entries and the target's text (tg over the disk transcript). */
export function parseTranscript(text, targetUuid) {
  const chain = [];
  let targetText = null;
  for (const line of String(text).split('\n')) {
    if (!line.trim()) continue;
    let record;
    try { record = JSON.parse(line); } catch { continue; }
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
    if (record.uuid) chain.push(rawChainEntry(record));
    if (targetUuid !== undefined && record.type === 'user' && record.uuid === targetUuid) {
      const found = userRecordText([record], targetUuid);
      if (found !== null) targetText = found;
    }
  }
  return { chain, targetText };
}

/** provision.mjs guestWorkspace: the host side of the session's `.claude` mount (CLAUDE_CONFIG_DIR in the guest). */
export const sessionConfigDir = (dataDir, sessionId) => path.join(path.resolve(dataDir), 'cowork-runtime', 'sessions', sessionId, '.claude');

/** CB6cNSrW `cg`: find `<projects>/<dir>/<cliSessionId>.jsonl` without guessing the encoded project directory name. */
export async function findTranscript(configDir, cliSessionId) {
  if (!validCliSessionId(cliSessionId)) return null;
  const projects = path.join(configDir, 'projects');
  if (!(await fs.lstat(projects).catch(() => null))?.isDirectory()) return null;
  const names = await fs.readdir(projects).catch(() => null);
  if (!names) return null;
  for (const name of names.sort()) {
    const dir = path.join(projects, name);
    if (!(await fs.lstat(dir).catch(() => null))?.isDirectory()) continue;
    const file = path.join(dir, `${cliSessionId}.jsonl`);
    if ((await fs.lstat(file).catch(() => null))?.isFile()) return file;
  }
  return null;
}

export const TRANSCRIPT_TAIL_BYTES = 64 * 1024 * 1024;

/**
 * readRawChainEntries + readTranscriptForRewind: null when the CLI never started (no cliSessionId), [] when the
 * transcript cannot be found or read. Reads at most the last `tailBytes`, dropping a leading partial line.
 */
export async function readRewindTranscript({ configDir, cliSessionId, targetUuid, tailBytes = TRANSCRIPT_TAIL_BYTES }) {
  if (!cliSessionId) return { chain: null, targetText: null };
  const file = await findTranscript(configDir, cliSessionId);
  if (!file) return { chain: [], targetText: null };
  let handle;
  try {
    handle = await fs.open(file, 'r');
    const { size } = await handle.stat();
    const start = Math.max(0, size - tailBytes), buffer = Buffer.alloc(size - start);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, start + offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    let text = buffer.subarray(0, offset).toString('utf8');
    if (start > 0) text = text.slice(text.indexOf('\n') + 1);
    return parseTranscript(text, targetUuid);
  } catch { return { chain: [], targetText: null }; }
  finally { await handle?.close().catch(() => {}); }
}

// ---- B5tintml chain walks ----

/** Nw */
const byUuid = (entries) => { const map = new Map(); for (const entry of entries) if (entry.uuid) map.set(entry.uuid, entry); return map; };

/** Pw: the newest main-chain user/assistant leaf. */
function newestLeaf(entries) {
  let leaf;
  for (const entry of entries) if (entry.uuid && entry.parentUuid !== undefined && !entry.isSidechain && (entry.type === 'user' || entry.type === 'assistant')) leaf = entry;
  return leaf;
}

/** jw: the nearest earlier entry (≤5 s, same sidechain) when a parent link is missing. */
const TIMESTAMP_BRIDGE_MS = 5e3;
function timestampBridge(entries, node, seen) {
  const at = node.timestamp ? new Date(node.timestamp).getTime() : NaN;
  if (Number.isNaN(at)) return;
  const sidechain = node.isSidechain ?? false;
  let best, distance = Infinity;
  for (const entry of entries) {
    if (!entry.uuid || seen.has(entry.uuid) || entry.parentUuid === undefined || (entry.isSidechain ?? false) !== sidechain) continue;
    const time = entry.timestamp ? new Date(entry.timestamp).getTime() : NaN;
    if (Number.isNaN(time)) continue;
    const gap = at - time;
    if (gap >= 0 && gap <= TIMESTAMP_BRIDGE_MS && gap < distance) { distance = gap; best = entry; }
  }
  return best;
}

/**
 * kw (`n._i`): walk parentUuid from the target user record to the assistant it follows.
 * @returns {{kind:'absent'}|{kind:'first'}|{kind:'unresolved'}|{kind:'assistant', uuid:string}}
 */
export function walkToForkPoint(entries, uuid) {
  const map = byUuid(entries), target = map.get(uuid);
  if (!target) return { kind: 'absent' };
  const seen = new Set([uuid]);
  let node = target;
  for (;;) {
    if (node.parentUuid === null) return node.type === 'user' ? { kind: 'first' } : { kind: 'unresolved' };
    const parent = node.parentUuid === undefined ? undefined : map.get(node.parentUuid);
    if (!parent?.uuid || seen.has(parent.uuid) || parent.typedQueued) return { kind: 'unresolved' };
    if (parent.type === 'assistant' && !parent.parent_tool_use_id) return { kind: 'assistant', uuid: parent.uuid };
    seen.add(parent.uuid); node = parent;
  }
}

/** Lw: the uuids a compact boundary preserved. */
function preservedOf(meta, map) {
  if (meta.preservedMessages) return meta.preservedMessages;
  const segment = meta.preservedSegment;
  if (!segment) return;
  const seen = new Set(), uuids = [];
  let node = map.get(segment.tailUuid);
  while (node?.uuid && !seen.has(node.uuid)) {
    seen.add(node.uuid); uuids.push(node.uuid);
    if (node.uuid === segment.headUuid) return { anchorUuid: segment.anchorUuid, uuids: uuids.reverse() };
    node = node.parentUuid ? map.get(node.parentUuid) : undefined;
  }
}

/** Iw: the single leaf of the post-compact chain, if there is exactly one. */
function singleLeaf(entries, map, parentOf, dropped) {
  const parents = new Set(), messageParents = new Set();
  for (const entry of entries) {
    const parent = parentOf(entry);
    if (parent) { parents.add(parent); if (entry.type === 'user' || entry.type === 'assistant') messageParents.add(parent); }
  }
  const leaves = new Set();
  for (const entry of entries) {
    if (!entry.uuid || parents.has(entry.uuid)) continue;
    const seen = new Set();
    let node = entry;
    while (node?.uuid && !seen.has(node.uuid)) {
      seen.add(node.uuid);
      if (node.type === 'user' || node.type === 'assistant') { if (!messageParents.has(node.uuid)) leaves.add(node.uuid); break; }
      const parent = parentOf(node);
      node = parent ? map.get(parent) : undefined;
      if (node && dropped(node)) break;
    }
  }
  return leaves.size === 1 ? map.get([...leaves][0]) : undefined;
}

/**
 * Fw (`n.ui`): is `uuid` on the active chain (walking back from the newest leaf, through compact boundaries)?
 * @returns {'resumable'|'dead'|'unknown'}
 */
export function branchState(entries, uuid) {
  const index = entries.findIndex(entry => entry.uuid === uuid);
  if (index < 0) return 'unknown';
  const map = byUuid(entries);
  let boundary = -1, preservedAt = -1, meta;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.type === 'system' && entry.subtype === 'compact_boundary') {
      boundary = i;
      if (entry.compactMetadata?.preservedMessages || entry.compactMetadata?.preservedSegment) { preservedAt = i; meta = entry.compactMetadata; }
    }
  }
  let preserved, anchor, uuids = [];
  if (meta && boundary >= 0) {
    if (preservedAt !== boundary) preserved = new Map();
    else {
      const kept = preservedOf(meta, map);
      if (!kept || kept.uuids.some(value => !map.has(value))) { if (index < boundary) return 'unknown'; }
      else { uuids = kept.uuids; preserved = new Map(uuids.map((value, i) => [value, i])); anchor = kept.anchorUuid; }
    }
    if (preserved && index < boundary && !preserved.has(uuid)) return 'dead';
  }
  const position = new Map(entries.map((entry, i) => [entry.uuid, i]));
  const dropped = entry => preserved !== undefined && entry.uuid !== undefined && (position.get(entry.uuid) ?? -1) < boundary && !preserved.has(entry.uuid);
  const last = uuids.at(-1);
  const parentOf = entry => {
    const at = preserved?.get(entry.uuid ?? '');
    if (at !== undefined && last !== undefined) return at === 0 ? anchor : uuids[at - 1];
    if (last !== undefined && entry.parentUuid) {
      if (entry.parentUuid === anchor && entry.uuid !== uuids[0]) return last;
      const parent = map.get(entry.parentUuid);
      if (parent && dropped(parent) && (entry.type === 'user' || entry.type === 'assistant')) return last;
    }
    return entry.parentUuid;
  };
  const live = [...map.values()].filter(entry => !dropped(entry));
  let node = last === undefined ? newestLeaf(entries) : singleLeaf(live, map, parentOf, dropped) ?? newestLeaf(entries);
  const seen = new Set();
  while (node?.uuid && !seen.has(node.uuid)) {
    if (node.uuid === uuid) return 'resumable';
    seen.add(node.uuid);
    const parentId = parentOf(node);
    if (!parentId) break;
    let parent = map.get(parentId);
    if (!parent || (parent.uuid && seen.has(parent.uuid)) || dropped(parent)) parent = timestampBridge(live, node, seen);
    node = parent;
  }
  return 'dead';
}

// ---- message buffer (CB6cNSrW ag) ----

/** B5tintml pn: content blocks as {type, text}. */
function blocksOf(record) {
  const content = record.message?.content;
  return typeof content === 'string' ? [{ type: 'text', text: content }]
    : Array.isArray(content) ? content.flatMap(block => block && typeof block === 'object' && 'type' in block
      ? [{ type: String(block.type), text: typeof block.text === 'string' ? block.text : '' }] : []) : [];
}

/** B5tintml un: the CLI's synthetic "No response requested." reply. */
function syntheticNoResponse(record) {
  const blocks = blocksOf(record);
  return record.type === 'assistant' && record.isApiErrorMessage !== true && record.message?.model === '<synthetic>'
    && blocks.length === 1 && blocks[0].type === 'text' && blocks[0].text === 'No response requested.';
}

/** sn([record]) for one top-level assistant record (`n.Tu([c])` in ag): true when the turn was still going. */
export function assistantMidTurn(record) {
  if (record.parent_tool_use_id != null || record.isSidechain === true || record.isSyntheticResult === true || syntheticNoResponse(record)) return undefined;
  if (record.type !== 'assistant') return undefined;
  const blocks = blocksOf(record);
  if (record.message?.stop_reason === 'tool_use' || blocks.some(block => block.type === 'tool_use')) return true;
  if (blocks.some(block => block.type === 'text' && block.text.trim() !== '')) return false;
  return record.message?.stop_reason == null;
}

/** muI2IV6k PLi (t.Qf): a user record carrying tool results. */
export function isToolResultUser(entry) {
  if (entry.type !== 'user') return false;
  if (entry.toolResult === true) return true;
  const content = entry.message?.content;
  return Array.isArray(content) && content.some(block => block && typeof block === 'object' && block.type === 'tool_result');
}

/**
 * ag: the target is in the message buffer but not on disk; find the fork point from the buffer.
 * Buffer entries: {type, uuid, parent_tool_use_id?, midTurn?, toolResult?, message?}.
 * @returns {{kind:'fork', uuid:string}|{kind:'dropped'}|{kind:'unknown'}}
 */
export function forkFromBuffer(buffer, chain, uuid) {
  const map = new Map(chain.map(entry => [entry.uuid, entry]));
  const at = buffer.findIndex(entry => entry.type === 'user' && entry.uuid === uuid);
  if (at < 0) return { kind: 'unknown' };
  const message = entry => (entry.type === 'user' || entry.type === 'assistant') && !entry.parent_tool_use_id && typeof entry.uuid === 'string';
  const previous = buffer.slice(0, at).reverse().find(entry => entry.type === 'assistant' && message(entry));
  if (previous) {
    if (previous.midTurn ?? assistantMidTurn(previous)) return { kind: 'unknown' };
    const rootless = chain.length > 0 && (chain[0].type !== 'user' || chain[0].parentUuid !== null);
    return map.has(previous.uuid) || rootless ? { kind: 'fork', uuid: previous.uuid } : { kind: 'unknown' };
  }
  const toolResults = new Set(buffer.flatMap(entry => isToolResultUser(entry) && entry.uuid ? [entry.uuid] : []));
  const later = buffer.slice(at + 1).filter(entry => message(entry) && !toolResults.has(entry.uuid) && map.has(entry.uuid));
  const anchor = later.find(entry => entry.type === 'assistant') ?? later[0];
  if (!anchor) {
    const root = chain[0];
    return { kind: root?.type === 'user' && root.parentUuid === null ? 'dropped' : 'unknown' };
  }
  const seen = new Set();
  let node = map.get(anchor.uuid);
  while (node?.uuid && !seen.has(node.uuid) && (node.type !== 'user' || toolResults.has(node.uuid))) {
    seen.add(node.uuid); node = node.parentUuid ? map.get(node.parentUuid) : undefined;
  }
  if (!node?.uuid) return { kind: 'unknown' };
  const walk = walkToForkPoint(chain, node.uuid);
  return walk.kind === 'assistant' ? { kind: 'fork', uuid: walk.uuid }
    : walk.kind === 'first' && buffer.some(entry => entry.type === 'user' && entry.uuid === node.uuid) ? { kind: 'fork', uuid: '' } : { kind: 'unknown' };
}

/** DYcTWSEO u (o.U): the text is a slash or bang command once leading blanks are skipped. */
export const isCommandText = (text) => /^[/!]/.test(String(text).replace(/^[\s​-‍⁠﻿]+/u, ''));

/**
 * rewindSessionV2's decision, from the reads to the refusal arm.
 * @param {{chain: object[]|null, buffer: object[], targetUuid: string, text: string|null, foundInBuffer: boolean}} input
 * @returns {{refusal: string}|{forkAt: string|undefined, walk: string}} forkAt '' is a first-message rewind (start
 *   fresh); undefined means the target never reached the CLI (drop it without forking).
 */
export function decideRewind({ chain, buffer, targetUuid, text, foundInBuffer }) {
  let walk = chain ? walkToForkPoint(chain, targetUuid) : { kind: 'absent' }, absent;
  if (walk.kind === 'absent' && chain !== null && foundInBuffer) {
    absent = forkFromBuffer(buffer, chain, targetUuid);
    if (absent.kind === 'fork') walk = absent.uuid === '' ? { kind: 'first' } : { kind: 'assistant', uuid: absent.uuid };
  }
  let forkAt, arm = 'fork';
  if (walk.kind === 'assistant') { if (branchState(chain, walk.uuid) === 'dead') arm = 'dead'; else forkAt = walk.uuid; }
  else if (walk.kind === 'first') forkAt = '';
  else if (walk.kind === 'unresolved' || !foundInBuffer || (chain !== null && (absent?.kind !== 'dropped' || isCommandText(text ?? '')))) arm = 'unknown';
  const refusal = arm === 'dead' ? COWORK_REWIND_REFUSAL.Dead
    : text !== null && !text.trim() ? COWORK_REWIND_REFUSAL.NoText
      : arm !== 'fork' || text === null ? COWORK_REWIND_REFUSAL.Unknown : undefined;
  return refusal !== undefined ? { refusal } : { forkAt, walk: walk.kind };
}
