// Settings › Harness (C6): the DeepSeek core's profile overlays.
//
// <userData>/harness/
//   overlay.json        app-managed state {rows:{[id]:{disabled?, config?}}, inserts:[{id,name,config,disabled?}]}
//   overlay.patch.yml   that state rendered in the loader patch grammar (JSON text, valid YAML)
//   user.patch.yml      the power user's own patch, opened by "Edit profile patch"
//
// The core reads the overlays from CODE_DESKTOP_CORE_PATCHES (path-delimited,
// harness/bin/codex-app-server.mjs) when it starts, so this module keeps that
// variable current in process.env (codex.cjs spreads process.env into every
// spawn) and a change applies on the next core restart. Every write marks the
// page "pending" until a new core client exists.
const fs = require("node:fs");
const path = require("node:path");
const { coreSupports, coreById } = require("./core-registry.mjs");

const METHOD_NOT_FOUND = -32601;
const USER_PATCH_EXAMPLE = `# Your own patches for the OpenClaude Desktop DeepSeek core profile.
# Applied after the app-owned profile and after Settings › Harness changes;
# the last write to a row wins. Restart the core (Settings › Harness › Restart
# core) to apply. A file that fails to parse stops the core from starting:
# turn off "Use overlays" in Settings › Harness to start without it.
#
# Turn a plugin off:
# - id: tool-web
#   disabled: true
#
# Add your own Cordis plugin (a path is resolved beside this file):
# - insert:
#     - id: my-plugin
#       name: /absolute/path/to/my-plugin/index.js
#       config:
#         greeting: hello
#
# The file must stay a YAML list: delete the [] line below when you add entries.
[]
`;

function createHarnessProfile({ app, shell, dialog, getConfig = () => undefined, getClient = () => undefined, emit = () => {}, getWindow = () => undefined, env = process.env, dir } = {}) {
  const userData = () => app.getPath("userData");
  const harnessDir = dir || path.join(userData(), "harness");
  const files = {
    state: path.join(harnessDir, "overlay.json"),
    overlay: path.join(harnessDir, "overlay.patch.yml"),
    user: path.join(harnessDir, "user.patch.yml"),
    lastStart: path.join(harnessDir, "last-start.json"),
  };
  const ours = new Set([files.overlay, files.user]);
  // The launch environment's own overlays stay first; ours follow.
  const basePatches = String(env.CODE_DESKTOP_CORE_PATCHES || "").split(path.delimiter).filter((file) => file && !ours.has(file));
  const lib = import("./prefs/harness-profile.mjs");
  lib.catch(() => {});
  let lastEntries = [];
  let pending = false, pendingClient = null;
  let observed = { client: null, userMtime: null };
  let lastPatchList = null;
  const managedEnv = new Map();
  const appliedEnvKeys = new Set();

  function preferences() {
    const config = getConfig();
    if (config) return config;
    try { return JSON.parse(fs.readFileSync(path.join(userData(), "preferences.json"), "utf8")); } catch { return {}; }
  }
  const overlayEnabled = () => preferences()?.harnessProfile?.overlayEnabled !== false;
  const mtime = (file) => { try { return fs.statSync(file).mtimeMs; } catch { return null; } };
  // The core the app spawns, as a core id (codex.cjs chosenCore/coreKind): an
  // explicit CODEX_BINARY is an override of unknown kind, else CODE_DESKTOP_CORE
  // or Settings › Cores (config.core, core-manager.cjs) picks; an unknown id
  // starts the built-in DeepSeek core. The page then asks coreSupports(id,
  // 'harnessProfile'), so a ZCode, OpenCode or pack core that is down never
  // shows the DeepSeek Harness profile editor.
  const configuredEngine = () => {
    if (env.CODEX_BINARY) return "override";
    const core = coreById(env.CODE_DESKTOP_CORE || preferences()?.core);
    return core && core.kind !== "builtin" ? core.id : "deepseek";
  };
  // When this app last saw a DeepSeek core running with the overlays: an
  // overlay edited after that is the likely cause of a core that won't start.
  function lastStart() {
    try { const at = JSON.parse(fs.readFileSync(files.lastStart, "utf8"))?.at; return typeof at === "number" ? at : null; } catch { return null; }
  }
  function recordStart() {
    try { writeAtomic(files.lastStart, JSON.stringify({ at: Date.now() }) + "\n"); } catch { /* best effort */ }
  }

  function readState() {
    try { return JSON.parse(fs.readFileSync(files.state, "utf8")); } catch { return { rows: {}, inserts: [] }; }
  }
  function stateEmpty(state) {
    return !state || (Object.keys(state.rows || {}).length === 0 && (state.inserts || []).length === 0);
  }
  function writeAtomic(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", text);
    fs.renameSync(file + ".tmp", file);
  }

  /** The overlay files the next core spawn applies, in order. */
  function patchList() {
    const list = [...basePatches];
    if (overlayEnabled()) {
      if (!stateEmpty(readState()) && fs.existsSync(files.overlay)) list.push(files.overlay);
      if (fs.existsSync(files.user)) list.push(files.user);
    }
    return [...new Set(list)];
  }

  /** Bring process.env in line with the overlays and C5's core env; true when the patch list changed. */
  function syncEnv() {
    const list = patchList();
    if (list.length) env.CODE_DESKTOP_CORE_PATCHES = list.join(path.delimiter);
    else delete env.CODE_DESKTOP_CORE_PATCHES;
    for (const key of appliedEnvKeys) if (!managedEnv.has(key)) { delete env[key]; appliedEnvKeys.delete(key); }
    for (const [key, value] of managedEnv) { env[key] = value; appliedEnvKeys.add(key); }
    const signature = list.join("\n");
    const changed = lastPatchList !== null && lastPatchList !== signature;
    lastPatchList = signature;
    return changed;
  }

  function markPending() {
    pending = true;
    pendingClient = getClient() ?? null;
  }

  async function writeState(next) {
    const { normalizeOverlay, renderOverlay } = await lib;
    const state = normalizeOverlay(next);
    writeAtomic(files.state, JSON.stringify(state, null, 2) + "\n");
    if (stateEmpty(state)) fs.rmSync(files.overlay, { force: true });
    else writeAtomic(files.overlay, "# Managed by OpenClaude Desktop (Settings › Harness). Put your own patches in user.patch.yml.\n" + JSON.stringify(renderOverlay(state), null, 2) + "\n");
    syncEnv();
    markPending();
    return state;
  }

  async function readProfile() {
    const client = getClient();
    if (!client?.serverInfo) return { connected: false, profile: null };
    if (!coreSupports(client.serverInfo, "harnessProfile")) return { connected: true, unsupported: true, reason: "engine", profile: null };
    try {
      const profile = await client.request("codeDesktop/profile/read", {}, 15000);
      lastEntries = Array.isArray(profile?.entries) ? profile.entries : [];
      return { connected: true, profile };
    } catch (error) {
      if (error?.code === METHOD_NOT_FOUND) return { connected: true, unsupported: true, reason: "method", profile: null };
      return { connected: true, profile: null, error: error?.message || String(error) };
    }
  }

  async function read() {
    syncEnv();
    const client = getClient() ?? null;
    if (pending && client !== pendingClient) pending = false;
    // A user.patch.yml saved after this core started also needs a restart.
    const firstLook = observed.client !== client;
    if (firstLook) observed = { client, userMtime: mtime(files.user) };
    const userPending = overlayEnabled() && mtime(files.user) !== observed.userMtime;
    const { normalizeOverlay } = await lib;
    const core = await readProfile();
    if (firstLook && core.connected && !core.unsupported && overlayEnabled()) recordStart();
    const state = readState();
    // overlaySuspect: the core is down, overlays are in play, and they changed
    // since a core last ran with them (or a page write is still pending).
    const inPlay = overlayEnabled() && (!stateEmpty(state) || fs.existsSync(files.user));
    const since = lastStart();
    const changed = [...(stateEmpty(state) ? [] : [files.state]), files.user].some((file) => { const at = mtime(file); return at !== null && (since === null || at > since); });
    return {
      ...core,
      configuredEngine: configuredEngine(),
      overlaySuspect: !core.connected && inPlay && (pending || userPending || changed),
      overlay: normalizeOverlay(state),
      overlayEnabled: overlayEnabled(),
      pending: pending || userPending,
      paths: { dir: harnessDir, overlay: files.overlay, user: files.user, userExists: fs.existsSync(files.user) },
      applied: patchList(),
    };
  }

  async function ensureEntries() {
    if (!lastEntries.length) await readProfile();
    return lastEntries;
  }

  async function openPath(target) {
    const failure = await shell.openPath(target);
    if (failure) throw new Error(failure);
    return { opened: target };
  }

  async function pick(options) {
    const window = getWindow();
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    return result.canceled || !result.filePaths?.length ? null : result.filePaths[0];
  }

  // Every overlay change reads overlay.json, edits it and writes it whole: one at a time, each from the last one's
  // result, so a page click racing a managed-row write (model-settings) loses neither.
  let writes = Promise.resolve();
  function serial(task) {
    const result = writes.then(task);
    writes = result.catch(() => {});
    return result;
  }
  const mutate = (next) => serial(async () => writeState(await next()));

  async function run(p = {}) {
    const mod = await lib;
    switch (p.op) {
      case "read": return read();
      case "sync": {
        if (syncEnv()) markPending();
        return read();
      }
      case "set-enabled": {
        const entries = await ensureEntries();
        await mutate(() => mod.setRowEnabled(readState(), { id: p.id, enabled: p.enabled }, entries));
        return read();
      }
      case "mcp-add": {
        const entries = await ensureEntries();
        const existingNames = entries.map((entry) => entry.serverName).filter(Boolean);
        await mutate(() => mod.mcpInsert({ ...p, existingNames }, readState()));
        return read();
      }
      case "mcp-remove":
      case "remove-insert":
        await mutate(() => mod.removeInsert(readState(), p.id));
        return read();
      case "hooks-add":
        await mutate(() => mod.hooksInsert(readState(), { format: p.format, configPath: p.configPath }));
        return read();
      case "skill-dirs":
        await mutate(() => mod.setSkillDirs(readState(), p.dirs));
        return read();
      case "pick-skill-dir":
        return { path: await pick({ title: "Choose a skill folder", properties: ["openDirectory", "createDirectory"] }) };
      case "pick-hooks-file":
        return { path: await pick({ title: "Choose a hooks file", properties: ["openFile"], filters: [{ name: "Hooks", extensions: ["json"] }] }) };
      case "open-folder": {
        if (p.which === "app") { fs.mkdirSync(harnessDir, { recursive: true }); return openPath(harnessDir); }
        if (p.which === "profile") {
          const core = await readProfile();
          const profileDir = core.profile?.profileDir || path.resolve(__dirname, "../../harness/profile");
          return openPath(profileDir);
        }
        throw new Error("Unknown folder.");
      }
      case "edit-user-patch": {
        if (!fs.existsSync(files.user)) writeAtomic(files.user, USER_PATCH_EXAMPLE);
        syncEnv();
        return openPath(files.user);
      }
      case "reset-overlay":
        await mutate(() => ({ rows: {}, inserts: [] }));
        return read();
      default:
        throw new Error("Unknown Harness profile operation.");
    }
  }

  // C5 seams: provider rows and the env vars the core process needs.
  // An unchanged row writes nothing and asks for no restart (model-settings re-applies its rows at startup).
  async function setManagedRow(id, row) {
    const mod = await lib;
    return serial(() => {
      const current = readState(), next = mod.setManagedRow(current, id, row);
      return JSON.stringify(mod.normalizeOverlay(current)) === JSON.stringify(next) ? next : writeState(next);
    });
  }
  async function removeManagedRow(id) { return setManagedRow(id, null); }
  // pending:false sets a value before the first core spawn (nothing to restart yet); an unchanged value marks nothing.
  function setCoreEnv(key, value, { pending: restart = true } = {}) {
    if (!/^[A-Z_][A-Z0-9_]*$/.test(String(key))) throw new Error("Invalid environment variable name.");
    const before = managedEnv.get(key);
    if (value === null || value === undefined) managedEnv.delete(key); else managedEnv.set(key, String(value));
    syncEnv();
    if (restart && before !== managedEnv.get(key)) markPending();
  }
  const coreEnvKeys = () => Object.fromEntries(managedEnv);

  // Set before the first core spawn (connect() runs after app ready).
  syncEnv();
  return { run, read, syncEnv, setManagedRow, removeManagedRow, setCoreEnv, coreEnvKeys, files, USER_PATCH_EXAMPLE };
}

module.exports = { createHarnessProfile, USER_PATCH_EXAMPLE };
