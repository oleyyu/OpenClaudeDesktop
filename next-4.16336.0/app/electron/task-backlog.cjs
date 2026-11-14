// B29 Suggested-task backlog (asar index.chunk-D5UeOeQn.js `Ca` TaskBacklog with ga/_a/va/ba/Ta, LocalSessions
// getTaskBacklog / dismissTaskBacklogItem / fileBackgroundTasksForLater). A spawn_task suggestion the user put away
// without starting it ("dismissed"; "evicted" / "orphaned" are kept as valid sources) is filed here per folder, and
// Home lists a folder's backlog under its composer (cc43287c9 l0/A0/O0/j0). The file is <dataDir>/backlog/tasks.json
// ({version: 1, items}); every change goes through one queue, and a newer-version or unreadable file is left alone.
const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");

const SOURCES = new Set(["dismissed", "evicted", "orphaned"]);
const ID = /^todo_[0-9a-f]{12}$/;
const MAX_AGE_MS = 2592e6; // oa: 30 days
const PER_FOLDER = 20, TOTAL = 100;
const MAX_FILE_BYTES = 33554432, MAX_SESSION_ID = 128, MAX_CWD = 4096, MAX_TITLE = 200, MAX_TLDR = 500, MAX_PROMPT = 100000;
const BACKLOG_DIR = "backlog", BACKLOG_FILE = "tasks.json";

class TaskBacklogUnavailableError extends Error {
  constructor() { super("Task backlog unavailable; try again"); this.name = "TaskBacklogUnavailableError"; }
}
const UNAVAILABLE = Symbol("task backlog unavailable");

/** ma: the folder as filed (normalized, no trailing separator). */
function normalizeFolder(cwd) {
  const normalized = path.normalize(String(cwd));
  const trimmed = normalized.replace(/[\\/]+$/, "");
  return trimmed === "" || /^[A-Za-z]:$/.test(trimmed) ? normalized : trimmed;
}
/** ha: the folder key; macOS and Windows volumes compare case-insensitively. */
function folderKey(cwd, platform = process.platform) {
  const folder = normalizeFolder(cwd);
  return platform === "darwin" || platform === "win32" ? folder.normalize("NFC").toLowerCase() : folder;
}
const clip = (value, max) => (value === undefined ? undefined : value.slice(0, max));

/** Xi: the suggestion a filing came from is a real one (prompt, optional title/tldr, a known time). */
function validSuggestion(entry) {
  return typeof entry.prompt === "string" && entry.prompt.trim() !== "" && entry.prompt.length <= MAX_PROMPT
    && (entry.title === undefined || typeof entry.title === "string")
    && (entry.tldr === undefined || typeof entry.tldr === "string")
    && typeof entry.originTaskId === "string" && entry.originTaskId !== "" && entry.originTaskId.length <= MAX_SESSION_ID
    && typeof entry.suggestedAt === "number" && Number.isFinite(entry.suggestedAt);
}
/** va: a stored item. */
function validItem(item) {
  if (!item || typeof item !== "object") return false;
  return typeof item.id === "string" && ID.test(item.id) && typeof item.source === "string" && SOURCES.has(item.source)
    && typeof item.filedAt === "number" && Number.isFinite(item.filedAt)
    && typeof item.originSessionId === "string" && item.originSessionId !== "" && item.originSessionId.length <= MAX_SESSION_ID
    && typeof item.cwd === "string" && item.cwd !== "" && item.cwd.length <= MAX_CWD && path.isAbsolute(item.cwd)
    && validSuggestion(item);
}
/** ba: a filing becomes an item. */
function toItem(filing, now, id = `todo_${randomBytes(6).toString("hex")}`) {
  return { id, cwd: normalizeFolder(filing.cwd), source: filing.source, title: clip(filing.title, MAX_TITLE), tldr: clip(filing.tldr, MAX_TLDR),
    prompt: filing.prompt, suggestedAt: filing.suggestedAt, filedAt: now, originSessionId: filing.originSessionId, originTaskId: filing.originTaskId };
}
/** _a: drop `excess` items, cheapest first: not dismissed and not filed now, then not dismissed, then not filed now, then any. */
function dropOverflow(items, limit, now, dropped) {
  let excess = items.filter((item) => !dropped.has(item)).length - limit;
  const notDismissed = (item) => item.source !== "dismissed", filedNow = (item) => item.filedAt === now;
  for (const pick of [(item) => notDismissed(item) && !filedNow(item), notDismissed, (item) => !filedNow(item), () => true])
    for (const item of items) {
      if (excess <= 0) return;
      if (!dropped.has(item) && pick(item)) { dropped.add(item); excess--; }
    }
}
/** ga: items under 30 days old, oldest filed first, at most 20 per folder and 100 in all. */
function prune(items, now, platform = process.platform) {
  const fresh = items.filter((item) => now - item.suggestedAt < MAX_AGE_MS).sort((a, b) => a.filedAt - b.filedAt);
  const dropped = new Set(), byFolder = new Map();
  for (const item of fresh) {
    const key = folderKey(item.cwd, platform);
    if (byFolder.has(key)) byFolder.get(key).push(item); else byFolder.set(key, [item]);
  }
  for (const group of byFolder.values()) dropOverflow(group, PER_FOLDER, now, dropped);
  const kept = fresh.filter((item) => !dropped.has(item));
  dropOverflow(kept, TOTAL, now, dropped);
  return kept.filter((item) => !dropped.has(item));
}
const sameList = (a, b) => a.length === b.length && a.every((item, index) => item === b[index]);
/** Ta: read the file; null leaves it untouched (unreadable, newer version), [] when absent or malformed. */
async function readItems(file) {
  let text;
  try {
    const stat = await fs.promises.lstat(file);
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) return null;
    text = await fs.promises.readFile(file, "utf8");
  } catch (error) { return error?.code === "ENOENT" || error?.code === "ENOTDIR" ? [] : null; }
  let parsed;
  try { parsed = JSON.parse(text); } catch { return []; }
  const doc = parsed && typeof parsed === "object" ? parsed : undefined;
  if (typeof doc?.version === "number" && doc.version > 1) return null;
  const items = Array.isArray(doc?.items) ? doc.items : [];
  return items.filter(validItem).map((item) => ({ id: item.id, cwd: item.cwd, source: item.source, title: item.title, tldr: item.tldr,
    prompt: item.prompt, suggestedAt: item.suggestedAt, filedAt: item.filedAt, originSessionId: item.originSessionId, originTaskId: item.originTaskId }));
}

function createTaskBacklog({ dataDir, now = Date.now, platform = process.platform }) {
  let cache = null, queue = Promise.resolve();
  const file = () => path.join(dataDir(), BACKLOG_DIR, BACKLOG_FILE);
  async function load() {
    if (cache) return cache;
    const items = await readItems(file());
    if (items === null) return null;
    cache = { items };
    return cache;
  }
  async function save(items) {
    const target = file();
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.${Date.now().toString(36)}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify({ version: 1, items }), { mode: 0o600 });
    await fs.promises.rename(temp, target);
  }
  function mutate(change) {
    const run = queue.then(async () => {
      const loaded = await load();
      if (!loaded) return UNAVAILABLE;
      const at = now();
      const { items, result } = change(prune(loaded.items, at, platform), at);
      const next = [...items];
      if (!sameList(loaded.items, next)) { await save(next); cache = { items: next }; }
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }
  return {
    /** fileMany: one item per (originSessionId, originTaskId); returns the items that were kept. */
    async fileMany(filings) {
      const result = await mutate((items, at) => {
        const next = [...items], added = [];
        for (const filing of Array.isArray(filings) ? filings : []) {
          if (next.some((item) => item.originSessionId === filing.originSessionId && item.originTaskId === filing.originTaskId)) continue;
          const item = toItem(filing, at);
          if (validItem(item)) { next.push(item); added.push(item); }
        }
        const kept = prune(next, at, platform);
        return { items: kept, result: added.filter((item) => kept.includes(item)) };
      });
      return result === UNAVAILABLE ? [] : result;
    },
    /** list(cwd, limit): the folder's items, newest filed first. */
    async list(cwd, limit) {
      await queue;
      const loaded = await load();
      if (!loaded) return [];
      const key = folderKey(cwd, platform);
      return prune(loaded.items, now(), platform).filter((item) => folderKey(item.cwd, platform) === key).reverse().slice(0, Math.max(0, limit));
    },
    async dismiss(id) {
      const result = await mutate((items) => {
        const found = items.find((item) => item.id === id);
        return found ? { items: items.filter((item) => item !== found), result: found } : { items, result: null };
      });
      if (result === UNAVAILABLE) throw new TaskBacklogUnavailableError();
      return result;
    },
    async dismissByOrigin(sessionId, taskId) {
      const result = await mutate((items) => {
        const kept = items.filter((item) => item.originSessionId !== sessionId || item.originTaskId !== taskId);
        return { items: kept, result: kept.length !== items.length };
      });
      if (result === UNAVAILABLE) throw new TaskBacklogUnavailableError();
      return result;
    },
  };
}

/** getTaskBacklog's public shape (the origin ids stay in main). */
function publicItem(item) {
  return { id: item.id, cwd: item.cwd, source: item.source, title: item.title, tldr: item.tldr, prompt: item.prompt, suggestedAt: item.suggestedAt, filedAt: item.filedAt };
}

module.exports = { createTaskBacklog, publicItem, prune, validItem, folderKey, normalizeFolder, TaskBacklogUnavailableError, MAX_AGE_MS, PER_FOLDER, TOTAL };
