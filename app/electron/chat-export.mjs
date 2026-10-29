// w13-chatfn-history (research/w13-chatfn.md H8, chatfn-47): Settings › Privacy › "Export data", kept on this computer.
//
// Official 3.6556.2 (cf400e6a4 uL / cYe / lYe): the row's "Export data" button opens a dialog ("Conversations from":
// All / 30 days / 90 days / Custom; "Export will include": "Your conversations" for a member's own data); Export POSTs
// `/api/organizations/{org}/members/me/export_data` and claude.ai mails a download link ("Export started"). Nothing goes
// to Anthropic here (plan-w13 E59): the chats are the core's threads, written to a folder the user picks:
//
//   <folder>/OpenClaude export <date> <time>/
//     conversations.json                    { exported_at, period, conversations: [...], failed: [...] }
//     conversations/<title> (<id8>).md       each chat's transcript (the renderer's transcriptMarkdown, as /export writes it)
//     artifacts/<threadId>/…                 the chat's artifacts (chat-artifact-store.mjs: index.json + every version)
//     memory/global.md, memory/projects/<id>.md   the memory (chat-memory.mjs), when there is one
//
// The renderer reads each chat's full history (thread/read + thread-history-model loadThreadHistory, shownTurns) and
// hands it here one chat at a time (op "conversation"), so the export is the transcript the app shows; a chat whose
// history can't be read is counted under `failed`. Incognito chats are never exported (chat-incognito-model.mjs).
//
// Operations ("chat-export" host call; main.cjs asks for the folder before "begin"):
//   begin        { dir, period, from?, to?, includeCowork } → { exportId, path, threads: [{ id, title, surface, historyMode }] }
//                (period "custom": from / to are local days "YYYY-MM-DD", both included)
//   conversation { exportId, threadId, markdown, turns } → { written }
//   fail         { exportId, threadId, reason } → { failed }
//   finish       { exportId } → { path, exported, failed }
//   cancel       { exportId } → { canceled }

import fsModule from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { threadMessages } from './chat-history-search.mjs';
import { isIncognitoSession } from './chat-incognito-model.mjs';
import { sessionSurface } from './surface-policy.mjs';

// cf400e6a4 lYe `_`: the segments' values (days back from now; "custom" is a from / to range, see exportRange).
export const EXPORT_PERIODS = Object.freeze({ all: null, '30d': 30, '90d': 90, custom: null });
const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const EXPORT_FILE = 'conversations.json';
export const MARKDOWN_MAX_CHARS = 50 * 1024 * 1024;
const OPERATIONS = new Set(['begin', 'conversation', 'fail', 'finish', 'cancel']);
const DAY_MS = 24 * 60 * 60 * 1000;

const ms = (value) => Number.isFinite(value) ? (value > 1e12 ? value : value * 1000) : null;
const iso = (value) => { const at = ms(value); return at === null ? null : new Date(at).toISOString(); };
const pad = (value) => String(value).padStart(2, '0');

/**
 * The time span a period covers, in ms ({ since, until }, null for an open end), or null for an invalid custom range.
 * cYe: "custom" sends conversations_start_date = `${from}T00:00:00` and conversations_end_date = the day after `to` at
 * 00:00 (local), so both days are included; the dialog keeps Export disabled while the range is invalid (SIe).
 */
export function exportRange({ period = 'all', from, to } = {}, now = Date.now()) {
  if (period === 'custom') {
    if (!LOCAL_DAY.test(from ?? '') || !LOCAL_DAY.test(to ?? '') || to < from) return null;
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    const since = new Date(`${from}T00:00:00`).getTime(), until = end.getTime();
    return Number.isFinite(since) && Number.isFinite(until) ? { since, until } : null;
  }
  const days = Object.hasOwn(EXPORT_PERIODS, period) ? EXPORT_PERIODS[period] : null;
  return { since: days === null ? null : now - days * DAY_MS, until: null };
}

/** The chats (and, asked for, Cowork tasks) an export covers, newest first; never an incognito chat. */
export function exportCandidates(config, { period = 'all', from, to, includeCowork = false, now = Date.now() } = {}) {
  const { since, until } = exportRange({ period, from, to }, now) ?? { since: null, until: null };
  const metadata = config?.sessionMetadata ?? {}, names = config?.threadMetadata ?? {};
  const archived = new Set(config?.archivedThreadIds ?? []);
  const surfaces = includeCowork ? ['chat', 'cowork'] : ['chat'];
  const projects = new Map((Array.isArray(config?.localProjects) ? config.localProjects : []).map((project) => [project?.id, project]));
  return [...new Set([...(config?.threadIds ?? []), ...(config?.archivedThreadIds ?? [])])]
    .filter((id) => typeof id === 'string' && surfaces.includes(sessionSurface(id, metadata)) && !isIncognitoSession(id, metadata))
    .map((id) => {
      const meta = names[id] ?? {}, session = metadata[id] ?? {};
      const title = [meta.name, meta.preview].find((value) => typeof value === 'string' && value.trim())?.trim().replace(/\s+/g, ' ') ?? null;
      const project = typeof session.projectId === 'string' ? projects.get(session.projectId) : null;
      return { id, title, surface: sessionSurface(id, metadata), createdAt: ms(meta.createdAt), updatedAt: ms(meta.updatedAt) ?? ms(meta.createdAt),
        archived: archived.has(id), historyMode: typeof meta.historyMode === 'string' ? meta.historyMode : null,
        ...(project ? { projectId: project.id, projectName: typeof project.name === 'string' ? project.name : null } : {}),
        ...(typeof session.chatBranchOf === 'string' ? { branchOf: session.chatBranchOf } : {}) };
    })
    .filter((thread) => (since === null || (thread.updatedAt ?? 0) >= since) && (until === null || (thread.updatedAt ?? 0) < until))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** "OpenClaude export 2026-10-28 14.05.09" (local time), so one export never replaces another. */
export function exportFolderName(now = Date.now()) {
  const date = new Date(now);
  return `OpenClaude export ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
}

/** A transcript's file name: the title made safe for a file name (60 characters at most) and the id's start. */
export function conversationFileName(title, id) {
  const safe = String(title ?? '').replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
  const name = [...safe].slice(0, 60).join('').trim() || 'Conversation';
  const tag = String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 8) || 'chat';
  return `${name} (${tag}).md`;
}

/** conversations.json's entry for one exported chat. */
export function conversationRecord(thread, { file, turns = [] } = {}) {
  return {
    uuid: thread.id, name: thread.title ?? null, surface: thread.surface, created_at: iso(thread.createdAt), updated_at: iso(thread.updatedAt),
    archived: thread.archived === true, ...(thread.projectId ? { project: { uuid: thread.projectId, name: thread.projectName ?? null } } : {}),
    ...(thread.branchOf ? { branch_of: thread.branchOf } : {}), transcript: file ? `conversations/${file}` : null,
    chat_messages: threadMessages(turns).map((message) => ({ sender: message.role === 'user' ? 'human' : 'assistant', text: message.text, turn_id: message.turnId })),
  };
}

/**
 * @param {object} deps
 * @param {string} deps.dataDir  the app's user-data folder (chat-artifacts/, memory/)
 * @param {() => object} deps.getConfig
 * @param {() => number} [deps.now]
 */
export function createChatExport({ dataDir, getConfig, now = () => Date.now(), fs = fsModule }) {
  const jobs = new Map();
  const job = (exportId) => {
    const found = typeof exportId === 'string' ? jobs.get(exportId) : null;
    if (!found) throw new Error('This export is no longer running.');
    return found;
  };

  function begin(p) {
    const dir = p?.dir;
    if (typeof dir !== 'string' || !path.isAbsolute(dir) || !fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw new Error('Choose a folder to export to.');
    const period = Object.hasOwn(EXPORT_PERIODS, p.period) ? p.period : 'all';
    const range = period === 'custom' ? { from: p.from, to: p.to } : {};
    if (!exportRange({ period, ...range }, now())) throw new Error('Choose a valid date range.');
    const includeCowork = p.includeCowork === true;
    let out = path.join(dir, exportFolderName(now()));
    for (let n = 2; fs.existsSync(out); n++) out = path.join(dir, `${exportFolderName(now())} ${n}`);
    fs.mkdirSync(path.join(out, 'conversations'), { recursive: true });
    const threads = exportCandidates(getConfig(), { period, ...range, includeCowork, now: now() });
    const exportId = crypto.randomUUID();
    jobs.set(exportId, { out, period, range, includeCowork, threads: new Map(threads.map((thread) => [thread.id, thread])), records: [], failed: [], names: new Set(), started: now() });
    return { exportId, path: out, threads: threads.map(({ id, title, surface, historyMode }) => ({ id, title, surface, historyMode })) };
  }

  function conversation(p) {
    const current = job(p?.exportId), thread = current.threads.get(p?.threadId);
    if (!thread) throw new Error('That chat isn’t part of this export.');
    if (typeof p.markdown !== 'string' || p.markdown.length > MARKDOWN_MAX_CHARS) throw new Error('The transcript couldn’t be exported.');
    let file = conversationFileName(thread.title, thread.id);
    for (let n = 2; current.names.has(file.toLowerCase()); n++) file = conversationFileName(`${thread.title ?? ''} ${n}`, thread.id);
    current.names.add(file.toLowerCase());
    fs.writeFileSync(path.join(current.out, 'conversations', file), p.markdown, { encoding: 'utf8', mode: 0o600 });
    current.records.push(conversationRecord(thread, { file, turns: Array.isArray(p.turns) ? p.turns : [] }));
    current.threads.delete(thread.id);
    return { written: file };
  }

  function fail(p) {
    const current = job(p?.exportId), thread = current.threads.get(p?.threadId);
    if (!thread) return { failed: current.failed.length };
    current.failed.push({ uuid: thread.id, name: thread.title ?? null, reason: typeof p.reason === 'string' ? p.reason.slice(0, 300) : null });
    current.threads.delete(thread.id);
    return { failed: current.failed.length };
  }

  function copyInto(from, to) {
    if (!fs.existsSync(from)) return false;
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.cpSync(from, to, { recursive: true, errorOnExist: false, force: true });
    return true;
  }

  function finish(p) {
    const current = job(p?.exportId);
    jobs.delete(p.exportId);
    // A chat the renderer never reached (the window closed mid-export) counts as failed too.
    for (const thread of current.threads.values()) current.failed.push({ uuid: thread.id, name: thread.title ?? null, reason: 'not read' });
    const artifacts = [];
    for (const record of current.records) {
      try { if (copyInto(path.join(dataDir, 'chat-artifacts', record.uuid), path.join(current.out, 'artifacts', record.uuid))) artifacts.push(record.uuid); }
      catch { /* an unreadable artifact folder is left out */ }
    }
    const memory = [];
    try { if (copyInto(path.join(dataDir, 'memory', 'global.md'), path.join(current.out, 'memory', 'global.md'))) memory.push('global.md'); } catch { /* left out */ }
    try {
      const projects = path.join(dataDir, 'memory', 'projects');
      for (const name of fs.existsSync(projects) ? fs.readdirSync(projects).filter((entry) => entry.endsWith('.md')) : [])
        if (copyInto(path.join(projects, name), path.join(current.out, 'memory', 'projects', name))) memory.push(`projects/${name}`);
    } catch { /* left out */ }
    const summary = { exported_at: new Date(now()).toISOString(), app: 'OpenClaude Desktop', period: current.period,
      ...(current.period === 'custom' ? { conversations_from: current.range.from, conversations_to: current.range.to } : {}), include_cowork: current.includeCowork,
      conversations: current.records, failed: current.failed, artifacts, memory };
    fs.writeFileSync(path.join(current.out, EXPORT_FILE), JSON.stringify(summary, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    return { path: current.out, exported: current.records.length, failed: current.failed.length };
  }

  function cancel(p) {
    const current = jobs.get(p?.exportId);
    if (!current) return { canceled: false };
    jobs.delete(p.exportId);
    try { fs.rmSync(current.out, { recursive: true, force: true }); } catch { /* best effort */ }
    return { canceled: true };
  }

  function run(p) {
    if (!p || !OPERATIONS.has(p.op)) throw new Error('Unknown export operation.');
    if (p.op === 'begin') return begin(p);
    if (p.op === 'conversation') return conversation(p);
    if (p.op === 'fail') return fail(p);
    if (p.op === 'finish') return finish(p);
    return cancel(p);
  }
  return { run, begin, conversation, fail, finish, cancel, jobs };
}
