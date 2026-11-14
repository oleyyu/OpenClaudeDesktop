// Files pane directory watching (2.31226.0 cccc2cf0a mv :4053-4086): while a tree is shown it asks main to watch its
// root and every expanded folder (watchSessionDirectories {watchId, dirPaths}; an empty list releases them) and refetches
// one folder's listing per onSessionDirectoryChanged. Here a renderer sends `files:watch` {watchId, cwd, dirs} (paths
// relative to cwd, "" = the root); every folder resolves through files.cjs scopedPath, so nothing outside the workspace
// is watched. Watchers are non-persistent fs.watch handles shared between subscribers, debounced per folder like the
// preview-service launch watcher, and answered on the subscriber's own webContents as desktop:event
// {kind: "files-dir-changed", watchId, cwd, dir, names}. A renderer that goes away releases its subscriptions.
const fs = require("node:fs");
const { scopedPath } = require("./files.cjs");

const DEBOUNCE_MS = 150;
const MAX_DIRS = 256;
// The same names listFiles leaves out: a change to them never changes a listing.
const IGNORED_NAMES = new Set([".git", "node_modules", ".DS_Store"]);

function createFilesWatch({ watch = fs.watch, resolveDir = scopedPath, debounceMs = DEBOUNCE_MS, maxDirs = MAX_DIRS } = {}) {
  const subscriptions = new Map(); // `${sender.id}\0${watchId}` -> {sender, watchId, cwd, dirs: Map(abs -> relative)}
  const watchers = new Map(); // abs -> {handle, subscribers: Set(key), timer, names: Set}
  const senders = new Set();
  const generations = new Map(); // key -> the latest set() call, so an older resolve never wins

  function deliver(abs) {
    const record = watchers.get(abs);
    if (!record) return;
    const names = [...record.names];
    record.names.clear();
    for (const key of record.subscribers) {
      const sub = subscriptions.get(key);
      const dir = sub?.dirs.get(abs);
      if (dir === undefined) continue;
      try {
        if (!sub.sender.isDestroyed?.()) sub.sender.send("desktop:event", { kind: "files-dir-changed", watchId: sub.watchId, cwd: sub.cwd, dir, names });
      } catch { /* renderer gone */ }
    }
  }
  function close(abs) {
    const record = watchers.get(abs);
    if (!record) return;
    clearTimeout(record.timer);
    try { record.handle?.close(); } catch { /* closed */ }
    watchers.delete(abs);
  }
  function arm(abs, key) {
    let record = watchers.get(abs);
    if (!record) {
      record = { handle: null, subscribers: new Set(), timer: null, names: new Set() };
      try {
        record.handle = watch(abs, { persistent: false }, (_event, name) => {
          const value = name == null ? "" : String(name);
          if (value && IGNORED_NAMES.has(value)) return;
          if (value) record.names.add(value);
          clearTimeout(record.timer);
          record.timer = setTimeout(() => { record.timer = null; deliver(abs); }, debounceMs);
          record.timer.unref?.();
        });
        // A watched folder that is deleted errors (or simply stops reporting): its parent's watcher reports the removal.
        record.handle.on?.("error", () => close(abs));
      } catch { return false; }
      watchers.set(abs, record);
    }
    record.subscribers.add(key);
    return true;
  }
  function release(key, abs) {
    const record = watchers.get(abs);
    if (!record) return;
    record.subscribers.delete(key);
    if (!record.subscribers.size) close(abs);
  }
  function drop(key) {
    const sub = subscriptions.get(key);
    if (!sub) return;
    subscriptions.delete(key);
    for (const abs of sub.dirs.keys()) release(key, abs);
  }
  function track(sender) {
    if (senders.has(sender)) return;
    senders.add(sender);
    sender.once?.("destroyed", () => {
      senders.delete(sender);
      for (const [key, sub] of [...subscriptions]) if (sub.sender === sender) { drop(key); generations.delete(key); }
    });
  }

  /** Replace what one pane (sender + watchId) watches; dirs: [] releases it. Resolves to the relative dirs now watched. */
  async function set(sender, { watchId, cwd, dirs } = {}) {
    if (!sender || typeof sender.send !== "function") throw new Error("Invalid renderer.");
    if (typeof watchId !== "string" || !watchId || watchId.length > 128) throw new Error("Invalid watch identifier.");
    const key = `${sender.id ?? ""}\0${watchId}`;
    const wanted = Array.isArray(dirs) ? [...new Set(dirs.filter((dir) => typeof dir === "string" && dir.length <= 4096 && !dir.includes("\0")))].slice(0, maxDirs) : [];
    const generation = (generations.get(key) ?? 0) + 1;
    generations.set(key, generation);
    if (!wanted.length || typeof cwd !== "string" || !cwd) { drop(key); generations.delete(key); return []; }
    track(sender);
    // Folders that no longer exist (or leave the workspace) are skipped; the parent's listing shows them gone.
    const resolved = await Promise.all(wanted.map((dir) => Promise.resolve().then(() => resolveDir(cwd, dir)).then((abs) => [abs, dir], () => null)));
    if (generations.get(key) !== generation || !senders.has(sender)) return null; // a newer call (or the renderer's exit) won
    const next = new Map();
    for (const pair of resolved) if (pair && !next.has(pair[0])) next.set(pair[0], pair[1]);
    const sub = subscriptions.get(key) ?? { sender, watchId, cwd, dirs: new Map() };
    for (const abs of sub.dirs.keys()) if (!next.has(abs)) release(key, abs);
    const kept = new Map();
    for (const [abs, dir] of next) if (arm(abs, key)) kept.set(abs, dir);
    Object.assign(sub, { cwd, dirs: kept });
    subscriptions.set(key, sub);
    return [...kept.values()];
  }
  function dispose() {
    for (const abs of [...watchers.keys()]) close(abs);
    subscriptions.clear();
    generations.clear();
  }
  return { set, dispose, watchedCount: () => watchers.size };
}

module.exports = { createFilesWatch, IGNORED_NAMES };
