// Import Chat History page model (pure): the Code sidebar's Import Chat History page (src/source-import-history.jsx)
// over main's desktop:call "chat-import" (ops sources / list / preview / import, analysis DESIGN.md). Source names,
// filtering and recency groups for the list, relative-time and count labels, the core picker's rows and default,
// the read-only preview rows from the Codex-shaped turns, and the import flow with its core switch: v1 imports into
// the running core, so another core is selected first (main.jsx switchCore), which usually reloads the window; the
// pending import waits in sessionStorage (tagged with the page load that saved it) and the next page load's
// resumePendingImport finishes it once the new core is connected. Main runs each import job once (jobId). Search and
// the source filter run in main (chat-import `list`); the page only groups what it gets.
import { t, tn } from "../electron/i18n/index.mjs";

// DESIGN.md source ids → display names (main's `sources` op labels win when it sends them).
export const SOURCE_LABELS = Object.freeze({
  codex: "Codex", "claude-code": "Claude Code", dsh: "DeepSeek Harness", gemini: "Gemini CLI", opencode: "OpenCode",
  mimo: "MiMo Code", grok: "Grok CLI", kimi: "Kimi", qwen: "Qwen Code", minimax: "MiniMax Code", zcode: "ZCode",
  copilot: "GitHub Copilot CLI", cursor: "Cursor",
});
export const ALL_SOURCES = "all";
// The error code main returns (resolved `{code}` / `{error}`, or in a rejected message) when the import needs the
// target core running first.
export const NEEDS_CORE_SWITCH = "needs-core-switch";
export const PENDING_IMPORT_KEY = "openclaude.chatImport.pending";
// A pending import older than this (a switch that never came back) is dropped instead of run by surprise.
export const PENDING_IMPORT_MAX_AGE = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

const text = (value) => (typeof value === "string" ? value : "");
const oneLine = (value) => text(value).replace(/\s+/g, " ").trim();

/** Display name of a source id, from main's `sources` rows when given. */
export function sourceLabel(source, sources = []) {
  const row = Array.isArray(sources) ? sources.find((entry) => entry?.source === source) : null;
  return oneLine(row?.label) || SOURCE_LABELS[source] || oneLine(source) || t("Unknown source");
}

/**
 * The source filter: All, then each available source in main's order (experimental ones flagged), with counts —
 * main's per-source counts for the current search (`list` counts), or counted from a session array.
 */
export function sourceFilters(sources = [], counted = {}) {
  const counts = new Map();
  if (Array.isArray(counted)) for (const session of counted) counts.set(session?.source, (counts.get(session?.source) ?? 0) + 1);
  else for (const [source, count] of Object.entries(counted && typeof counted === "object" ? counted : {})) if (Number.isInteger(count)) counts.set(source, count);
  const rows = (Array.isArray(sources) ? sources : []).filter((entry) => entry && entry.available !== false && typeof entry.source === "string")
    .map((entry) => ({ value: entry.source, label: sourceLabel(entry.source, sources), experimental: entry.experimental === true, count: counts.get(entry.source) ?? 0 }));
  const all = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [{ value: ALL_SOURCES, label: t("All"), experimental: false, count: all }, ...rows];
}

/** The places main looked in, for the empty state: [{ label, roots[] }] of the sources it reports. */
export function scannedLocations(sources = []) {
  return (Array.isArray(sources) ? sources : []).filter((entry) => entry && typeof entry.source === "string")
    .map((entry) => ({ source: entry.source, label: sourceLabel(entry.source, sources), roots: (Array.isArray(entry.roots) ? entry.roots : []).filter((root) => typeof root === "string" && root) }));
}

/** Row title: the session's title, else its first prompt on one line, else Untitled conversation. */
export function sessionTitle(session, max = 120) {
  const value = oneLine(session?.title) || oneLine(session?.firstPrompt);
  if (!value) return t("Untitled conversation");
  const chars = [...value];
  return chars.length > max ? `${chars.slice(0, max - 1).join("")}…` : value;
}

/** Last path segment of a working folder ("" for none). */
export function folderName(cwd) {
  const value = text(cwd).replace(/[\\/]+$/, "");
  return value ? value.split(/[\\/]/).pop() || value : "";
}

/** A timestamp as epoch ms: ms or seconds numbers, numeric strings and ISO strings; null when unreadable. */
export function toMillis(value) {
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) value = Number(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
  return null;
}

/** When a session last changed (updatedAt, else createdAt) as epoch ms, or null. */
export const sessionTime = (session) => toMillis(session?.updatedAt) ?? toMillis(session?.createdAt);

/** 'Just now' / '5m ago' / '3h ago' / '2d ago', then a date (the /resume dialog's wording). */
export function relativeTimeLabel(value, now = Date.now()) {
  const at = toMillis(value);
  if (at === null) return "";
  const minutes = Math.max(0, Math.round((now - at) / 60000));
  if (minutes < 1) return t("Just now");
  if (minutes < 60) return t("{count}m ago", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("{count}h ago", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t("{count}d ago", { count: days });
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** '12 messages' when main knows the count, else "". */
export function messageCountLabel(count) {
  return Number.isInteger(count) && count >= 0 ? tn(count, "{count} message", "{count} messages") : "";
}

/** Newest first, then recency groups (Today, Yesterday, Previous 7 days, Previous 30 days, Older; empty ones left out). */
export function groupSessions(sessions = [], now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const groups = [
    { key: "today", label: t("Today"), from: today },
    { key: "yesterday", label: t("Yesterday"), from: today - DAY },
    { key: "week", label: t("Previous 7 days"), from: today - 7 * DAY },
    { key: "month", label: t("Previous 30 days"), from: today - 30 * DAY },
    { key: "older", label: t("Older"), from: -Infinity },
  ].map((group) => ({ ...group, sessions: [] }));
  const sorted = [...(Array.isArray(sessions) ? sessions : [])].sort((a, b) => (sessionTime(b) ?? 0) - (sessionTime(a) ?? 0));
  for (const session of sorted) {
    const at = sessionTime(session) ?? -Infinity;
    groups.find((group) => at >= group.from).sessions.push(session);
  }
  return groups.filter((group) => group.sessions.length).map(({ key, label, sessions: rows }) => ({ key, label, sessions: rows }));
}

/** The core picker: installed cores from `cores` op list ({cores:[{id, name, installed}]}), the running one always in. */
export function installedCores(list, currentCore = null, nameOf = (id) => id) {
  const rows = (Array.isArray(list?.cores) ? list.cores : Array.isArray(list) ? list : [])
    .filter((core) => core && typeof core.id === "string" && (core.installed !== false || core.id === currentCore))
    .map((core) => ({ id: core.id, name: oneLine(core.name) || nameOf(core.id) }));
  if (currentCore && !rows.some((core) => core.id === currentCore)) rows.unshift({ id: currentCore, name: nameOf(currentCore) });
  return rows;
}

/** The core picker's default: the running core, else the one the cores list marks selected, else the first. */
export function defaultCore(cores = [], currentCore = null, selected = null) {
  for (const id of [currentCore, selected]) if (id && cores.some((core) => core.id === id)) return id;
  return cores[0]?.id ?? currentCore ?? null;
}

const userText = (item) => (Array.isArray(item?.content) ? item.content : [])
  .map((part) => (part?.type === "image" || part?.type === "localImage" ? `[${t("Image")}]` : text(part?.text))).filter(Boolean).join("\n");
const toolLine = (item) => {
  switch (item?.type) {
    case "commandExecution": return oneLine(item.command) || t("Command");
    case "fileChange": {
      const paths = (Array.isArray(item.changes) ? item.changes : []).map((change) => text(change?.path)).filter(Boolean);
      return paths.length ? t("Edited {files}", { files: paths.map(folderName).join(", ") }) : t("Edited files");
    }
    case "mcpToolCall": return [text(item.server), text(item.tool)].filter(Boolean).join(" · ") || t("Tool call");
    case "dynamicToolCall": case "collabAgentToolCall": return oneLine(item.tool) || t("Tool call");
    case "webSearch": return oneLine(item.query) ? t("Searched “{query}”", { query: oneLine(item.query) }) : t("Web search");
    case "imageView": return t("Viewed an image");
    default: return oneLine(item?.type) || t("Tool call");
  }
};

/**
 * Preview rows from the preview op's Codex-shaped turns ([{ items }]): user and assistant bubbles, every other item
 * one collapsed tool line; reasoning is left out and a compaction is one note.
 * → [{ id, kind: 'user'|'assistant'|'tool'|'note', text }]
 */
export function previewRows(turns = []) {
  const rows = [];
  let index = 0;
  for (const turn of Array.isArray(turns) ? turns : []) {
    for (const item of Array.isArray(turn?.items) ? turn.items : []) {
      if (!item || typeof item !== "object") continue;
      const id = text(item.id) || `row-${index}`;
      index += 1;
      if (item.type === "userMessage") { const value = userText(item).trim(); if (value) rows.push({ id, kind: "user", text: value }); }
      else if (item.type === "agentMessage") { const value = text(item.text).trim(); if (value) rows.push({ id, kind: "assistant", text: value }); }
      else if (item.type === "reasoning") continue;
      else if (item.type === "contextCompaction" || item.type === "compaction") rows.push({ id, kind: "note", text: t("Earlier messages were summarized") });
      else if (item.type === "plan") { const value = text(item.text).trim(); if (value) rows.push({ id, kind: "assistant", text: value }); }
      else rows.push({ id, kind: "tool", text: toolLine(item) });
    }
  }
  return rows;
}

/** NEEDS_CORE_SWITCH (or another code) from an import result or failure: `{code}`, `{error}`, Error.code or its message. */
export function importErrorCode(value) {
  if (!value) return null;
  if (typeof value === "object") {
    for (const field of ["code", "error"]) if (typeof value[field] === "string" && value[field]) {
      if (value[field] === NEEDS_CORE_SWITCH || field === "code") return value[field];
    }
    if (typeof value.message === "string" && value.message.includes(NEEDS_CORE_SWITCH)) return NEEDS_CORE_SWITCH;
    return null;
  }
  return typeof value === "string" && value.includes(NEEDS_CORE_SWITCH) ? NEEDS_CORE_SWITCH : null;
}

/** This page load's id (performance.timeOrigin): a pending import is only resumed by a later page load. */
export function pageLoadId() {
  const origin = globalThis.performance?.timeOrigin;
  return Number.isFinite(origin) ? String(origin) : "";
}

/** A fresh id for one import (main runs one import per id: chat-import index.cjs jobs). */
export function newImportJobId() {
  const random = globalThis.crypto?.randomUUID?.();
  return `import-${random || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

/** Keeps an import to finish after a core switch reloads the window, tagged with this page load. */
export function savePendingImport(storage, entry, now = Date.now()) {
  try {
    storage?.setItem(PENDING_IMPORT_KEY, JSON.stringify({ key: entry.key, target: entry.target ?? null, targetName: entry.targetName ?? null, title: entry.title ?? null,
      jobId: entry.jobId ?? null, pageLoad: entry.pageLoad ?? pageLoadId(), at: now }));
  } catch { /* no storage: the import then only finishes without a reload */ }
}

/** Drops the pending import of `jobId` (the page that saved it goes on with that import itself). */
export function clearPendingImport(storage, jobId) {
  try {
    const entry = JSON.parse(storage?.getItem(PENDING_IMPORT_KEY) ?? "null");
    if (entry && (!jobId || entry.jobId === jobId)) storage.removeItem(PENDING_IMPORT_KEY);
  } catch { try { storage?.removeItem(PENDING_IMPORT_KEY); } catch {} }
}

/**
 * The pending import a previous page load left (removed as it is read); null when there is none, it is malformed or
 * too old, or it belongs to this page load (left in place: its own runImport is still running it).
 */
export function takePendingImport(storage, now = Date.now(), maxAge = PENDING_IMPORT_MAX_AGE, { pageLoad = pageLoadId() } = {}) {
  let raw = null;
  try { raw = storage?.getItem(PENDING_IMPORT_KEY) ?? null; } catch { return null; }
  if (!raw) return null;
  let entry = null;
  try { entry = JSON.parse(raw); } catch {}
  if (entry && typeof entry === "object" && pageLoad && entry.pageLoad === pageLoad) return null;
  try { storage.removeItem(PENDING_IMPORT_KEY); } catch {}
  if (!entry || typeof entry.key !== "string" || !entry.key || !Number.isFinite(entry.at) || now - entry.at > maxAge || entry.at - now > 60000) return null;
  return entry;
}

const switchFailed = (name) => new Error(t("Couldn’t switch to {core} to continue this conversation.", { core: name }));

/**
 * Imports `key` into `target` (a core id; null = the running core) through call('chat-import', {op:'import'}), as one
 * job (`jobId`: main answers a repeated request with the first one's result, never a second session).
 * A target other than the running core is selected first with switchCore(id) → { b, reload } (main.jsx switchCore);
 * main answering NEEDS_CORE_SWITCH (`{code, target?}`) switches to the core it names and tries once more. When the
 * switch reloads the window the import is left in `storage` (tagged with this page load) and this resolves
 * { pending: true }; the next page load's resumePendingImport finishes it. Without a reload this call finishes it
 * itself and the entry is dropped, so it never runs twice.
 * → { threadId, strategy, warnings[], trimmed, redacted, sessionMetadata } | { pending: true }
 */
export async function runImport({ call, key, target = null, targetName = null, title = null, currentCore = null, switchCore = null, storage = null,
  jobId = newImportJobId(), pageLoad = pageLoadId(), now = () => Date.now() }) {
  const name = targetName || target || "";
  const request = () => call("chat-import", { op: "import", key, jobId, pageLoad, ...(target ? { target } : {}) });
  const switchTo = async (id) => {
    if (typeof switchCore !== "function") throw switchFailed(name);
    savePendingImport(storage, { key, target: id, targetName, title, jobId, pageLoad }, now());
    let switched;
    try { switched = await switchCore(id); }
    catch (error) { clearPendingImport(storage, jobId); throw error; }
    if (switched?.reload) return true;
    clearPendingImport(storage, jobId);
    if (switched?.b && switched.b.connected === false) throw switchFailed(name);
    return false;
  };
  if (target && currentCore && target !== currentCore && await switchTo(target)) return { pending: true };
  const attempt = async () => {
    try { return await request(); }
    catch (error) { if (importErrorCode(error) === NEEDS_CORE_SWITCH) return { code: NEEDS_CORE_SWITCH }; throw error; }
  };
  let result = await attempt();
  if (importErrorCode(result) === NEEDS_CORE_SWITCH) {
    const id = typeof result?.target === "string" && result.target ? result.target : target || currentCore;
    if (!id) throw switchFailed(name);
    if (await switchTo(id)) return { pending: true };
    result = await attempt();
    if (importErrorCode(result) === NEEDS_CORE_SWITCH) throw switchFailed(name);
  }
  return importAnswer(result);
}

/** main's import answer, checked. */
export function importAnswer(result) {
  if (!result || typeof result.threadId !== "string" || !result.threadId) throw new Error(t("The conversation couldn’t be imported."));
  return { threadId: result.threadId, strategy: result.strategy ?? null, warnings: Array.isArray(result.warnings) ? result.warnings.filter((w) => typeof w === "string" && w) : [],
    trimmed: result.trimmed && typeof result.trimmed === "object" ? result.trimmed : null, redacted: Number.isInteger(result.redacted) ? result.redacted : 0,
    sessionMetadata: result.sessionMetadata && typeof result.sessionMetadata === "object" ? result.sessionMetadata : null };
}

/**
 * After a core switch reloaded the window: finishes the import a previous page load kept in `storage`, once the core
 * is connected, under its own job id (so main runs it at most once). Its target must be the running core now (no
 * second switch). `onStart(entry)` fires before the import call (the page's "Continuing the import…" status).
 * → the runImport result plus its title, or null when none waits.
 */
export async function resumePendingImport({ call, storage, currentCore = null, pageLoad = pageLoadId(), onStart = null, now = () => Date.now() }) {
  const entry = takePendingImport(storage, now(), PENDING_IMPORT_MAX_AGE, { pageLoad });
  if (!entry) return null;
  if (entry.target && currentCore && entry.target !== currentCore) throw switchFailed(entry.targetName || entry.target);
  onStart?.(entry);
  const result = await runImport({ call, key: entry.key, target: entry.target, targetName: entry.targetName, title: entry.title, currentCore,
    jobId: typeof entry.jobId === "string" && entry.jobId ? entry.jobId : newImportJobId(), pageLoad, now });
  return { ...result, title: entry.title ?? null };
}

/**
 * The sentences a finished import's warning codes stand for (chat-import targets.mjs WARNINGS); unknown codes are
 * left out, never shown raw.
 */
export function importWarnings(result, coreName = "") {
  const core = coreName || t("The core");
  const lines = [];
  for (const code of Array.isArray(result?.warnings) ? result.warnings : []) {
    const base = typeof code === "string" ? code.split(":")[0].trim() : "";
    switch (base) {
      case "truncated": {
        const kept = result?.trimmed?.kept, total = result?.trimmed?.total;
        lines.push(Number.isInteger(kept) && Number.isInteger(total) && total > 0
          ? t("This conversation is long: {core} got the most recent {kept} of {total} parts.", { core, kept, total })
          : t("This conversation is long: {core} got only its most recent part.", { core }));
        break;
      }
      case "secrets-redacted": lines.push(tn(Number.isInteger(result?.redacted) && result.redacted > 0 ? result.redacted : 1,
        "{count} likely secret (such as an API key) was hidden from the model.", "{count} likely secrets (such as API keys) were hidden from the model.")); break;
      case "fork-failed": lines.push(t("The original session couldn’t be forked, so a copy was imported instead.")); break;
      case "native-failed": case "inject-failed": lines.push(t("{core} couldn’t take the history directly, so it received the conversation as context instead.", { core })); break;
      case "title-not-set": lines.push(t("The new session kept its default title.")); break;
      case "no-display-history": lines.push(t("The earlier messages can’t be shown in this session, but {core} has them.", { core })); break;
      default: break;
    }
  }
  return [...new Set(lines)];
}

/** The toast after a finished import: a handoff names that the earlier conversation went in as context, then the warnings. */
export function importedNotice(result, coreName = "") {
  const lines = importWarnings(result, coreName);
  const fellBack = (result?.warnings ?? []).some((code) => /^(native|inject)-failed/.test(String(code)));
  if (result?.strategy === "handoff" && !fellBack) lines.unshift(t("{core} received the earlier conversation as context.", { core: coreName || t("The core") }));
  return lines.join("\n");
}
