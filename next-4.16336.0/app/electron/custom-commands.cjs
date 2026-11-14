// Custom slash commands (C3): Markdown prompt templates on disk.
// - Global:  <customCommands.globalDir || <userData>/commands>/*.md
// - Project: <cwd>/.code-desktop/commands/*.md (when customCommands.projectEnabled)
// The main process only lists, writes, trashes and watches the files; it returns raw text and the
// renderer parses the frontmatter (custom-commands-model.mjs), because node_modules (yaml) are not packaged.
const fs = require("node:fs");
const path = require("node:path");
const { t } = require("./i18n/index.mjs");

const NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const MAX_BYTES = 64 * 1024;
const MAX_FILES = 200;
const MAX_PROJECT_WATCHERS = 8;
const DEBOUNCE_MS = 150;

function commandName(value, label = "name") {
  if (typeof value !== "string" || !NAME.test(value))
    throw new Error(label === "name" ? "Use letters, numbers, - or _ for the command name (up to 64 characters)." : "Invalid command name.");
  return value;
}
const absolute = (value) => typeof value === "string" && value.startsWith("/") && value.length <= 1024 && !value.includes("\0");
function settings(config) {
  const value = config?.customCommands;
  return { globalDir: absolute(value?.globalDir) ? value.globalDir : "", projectEnabled: value?.projectEnabled !== false };
}
async function exists(target) {
  try { await fs.promises.access(target); return true; } catch { return false; }
}
async function readCommands(dir) {
  let entries;
  try { entries = await fs.promises.readdir(dir); }
  catch (error) { if (error.code === "ENOENT" || error.code === "ENOTDIR") return { exists: false, files: [] }; throw error; }
  const names = entries.filter((entry) => entry.toLowerCase().endsWith(".md") && NAME.test(entry.slice(0, -3))).sort().slice(0, MAX_FILES);
  const files = [];
  for (const entry of names) {
    const file = path.join(dir, entry);
    try {
      const stat = await fs.promises.stat(file);
      if (!stat.isFile() || stat.size > MAX_BYTES) continue;
      files.push({ name: entry.slice(0, -3), path: file, text: await fs.promises.readFile(file, "utf8"), mtimeMs: stat.mtimeMs });
    } catch {}
  }
  return { exists: true, files };
}

function createCustomCommands({ app, shell, dialog, getConfig, emit = () => {}, getWindow = () => null, knownCwd = (cwd) => cwd, watch = fs.watch }) {
  const globalDir = () => settings(getConfig()).globalDir || path.join(app.getPath("userData"), "commands");
  const projectDir = (cwd) => path.join(cwd, ".code-desktop", "commands");
  // key -> {dir, watcher, watched, timer, scope, cwd}
  const watchers = new Map();
  let disposed = false;

  function closeEntry(entry) {
    if (!entry) return;
    clearTimeout(entry.timer);
    try { entry.watcher?.close(); } catch {}
    entry.watcher = null;
  }
  // Watch the commands folder itself, or the nearest existing ancestor up to two levels (the
  // `.code-desktop` folder, then the project / userData folder) filtered to the child on the way.
  function arm(key, scope, cwd, dir) {
    if (disposed) return;
    const previous = watchers.get(key);
    if (previous && previous.dir === dir && previous.watcher && previous.watched === dir) {
      watchers.delete(key); watchers.set(key, previous); // LRU touch
      return;
    }
    closeEntry(previous);
    const entry = { dir, scope, cwd, watcher: null, watched: null, timer: null };
    watchers.delete(key); watchers.set(key, entry);
    const chain = [[dir, null], [path.dirname(dir), path.basename(dir)], [path.dirname(path.dirname(dir)), path.basename(path.dirname(dir))]];
    for (const [target, child] of chain) {
      try {
        entry.watcher = watch(target, { persistent: false }, (_event, filename) => {
          if (child && filename && String(filename) !== child) return;
          clearTimeout(entry.timer);
          entry.timer = setTimeout(() => {
            if (disposed || watchers.get(key) !== entry) return;
            // The folder may have appeared or gone: re-arm on the right path before telling the renderer.
            entry.watched = null; closeEntry(entry); watchers.delete(key);
            arm(key, scope, cwd, dir);
            emit({ kind: "custom-commands-changed", scope, cwd: cwd ?? null });
          }, DEBOUNCE_MS);
        });
        entry.watcher.on?.("error", () => closeEntry(entry));
        entry.watched = child ? target : dir;
        break;
      } catch {}
    }
    const projects = [...watchers.keys()].filter((name) => name.startsWith("project:"));
    while (projects.length > MAX_PROJECT_WATCHERS) { const oldest = projects.shift(); closeEntry(watchers.get(oldest)); watchers.delete(oldest); }
  }

  function project(cwd) {
    if (typeof cwd !== "string" || !cwd) throw new Error("Open a project folder first.");
    return knownCwd(cwd);
  }
  function scopeDir(scope, cwd) {
    if (scope === "global") return globalDir();
    if (scope === "project") return projectDir(project(cwd));
    throw new Error("Invalid command scope.");
  }

  async function list({ cwd } = {}) {
    const dir = globalDir();
    arm("global", "global", null, dir);
    const result = { global: { dir, ...(await readCommands(dir)) }, project: null };
    let root = null;
    if (settings(getConfig()).projectEnabled && typeof cwd === "string" && cwd) { try { root = knownCwd(cwd); } catch {} }
    if (root) {
      const pdir = projectDir(root);
      arm(`project:${root}`, "project", root, pdir);
      result.project = { dir: pdir, ...(await readCommands(pdir)) };
    }
    return result;
  }

  async function save({ scope, cwd, name, previousName, text } = {}) {
    commandName(name);
    if (previousName != null && previousName !== "") commandName(previousName, "previous");
    if (typeof text !== "string") throw new Error("Invalid command text.");
    if (Buffer.byteLength(text, "utf8") > MAX_BYTES) throw new Error("Commands can be up to 64 KB.");
    const dir = scopeDir(scope, cwd), target = path.join(dir, `${name}.md`);
    await fs.promises.mkdir(dir, { recursive: true });
    const renaming = previousName && previousName !== name;
    const sameFile = renaming && previousName.toLowerCase() === name.toLowerCase();
    if ((!previousName || renaming) && !sameFile && await exists(target)) throw new Error(`A command named /${name} already exists.`);
    if (renaming) {
      const old = path.join(dir, `${previousName}.md`);
      if (await exists(old)) await fs.promises.rename(old, target);
    }
    const tmp = path.join(dir, `.${name}.md.${process.pid}.${Date.now().toString(36)}.tmp`);
    try {
      await fs.promises.writeFile(tmp, text, "utf8");
      await fs.promises.rename(tmp, target);
    } catch (error) {
      await fs.promises.rm(tmp, { force: true }).catch(() => {});
      throw error;
    }
    return { path: target };
  }

  async function remove({ scope, cwd, name } = {}) {
    commandName(name);
    const target = path.join(scopeDir(scope, cwd), `${name}.md`);
    if (!(await exists(target))) throw new Error(`/${name} no longer exists.`);
    await shell.trashItem(target);
    return { trashed: target };
  }

  async function reveal({ scope, cwd } = {}) {
    const dir = scopeDir(scope, cwd);
    await fs.promises.mkdir(dir, { recursive: true });
    const failure = await shell.openPath(dir);
    if (failure) throw new Error(failure);
    return { dir };
  }

  async function pickDir() {
    const result = await dialog.showOpenDialog(getWindow() || undefined, { properties: ["openDirectory", "createDirectory"], buttonLabel: t("Use folder") });
    return result.canceled || !result.filePaths?.[0] ? null : result.filePaths[0];
  }

  return {
    run(p = {}) {
      switch (p.op) {
        case "list": return list(p);
        case "save": return save(p);
        case "delete": return remove(p);
        case "reveal": return reveal(p);
        case "pick-dir": return pickDir();
        default: throw new Error("Unknown custom commands operation.");
      }
    },
    dispose() {
      disposed = true;
      for (const entry of watchers.values()) closeEntry(entry);
      watchers.clear();
    },
    watcherCount: () => [...watchers.values()].filter((entry) => entry.watcher).length,
  };
}

module.exports = { createCustomCommands, COMMAND_NAME: NAME, MAX_COMMAND_BYTES: MAX_BYTES };
