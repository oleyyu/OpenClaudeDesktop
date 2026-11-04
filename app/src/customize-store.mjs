// Renderer-side cache for the Customize catalog shared by the settings pages
// and the composer Add menu. One instance per window; loads go through the
// main-process "customize" operation and notifications refresh the cache:
//   skills/changed                  → debounced skills/list (forceReload)
//   mcpServer/startupStatus/updated → patch the row, re-list on ready/failed
//   mcpServer/oauthLogin/completed  → re-list
//   codeDesktop/plugin/*            → the running install's progress and output;
//                                     a completed plugin change re-lists plugins
// A native core (Codex) manages plugins through the protocol itself: its
// marketplaces' catalog (plugin/list) is cached beside the installed list, and
// marketplace/add, plugin/install, plugin/uninstall and the on/off config write
// re-list both.
// Every dependency (call, timers) is injected so the logic is unit-testable.
import { SKILLS_CHANGED_DEBOUNCE_MS, appendPluginLog, applySkillEnabled, availablePluginRows, marketplaceLoadErrors, mcpRows, nativePluginOutcome, patchMcpRow, pluginChangeOutcome, pluginFailureMessage, pluginRows, skillRows } from "./customize-model.mjs";
import { t } from "../electron/i18n/index.mjs";
import { localizeBridgeText } from "./bridge-text-model.mjs";

const IDLE = Object.freeze({ status: "idle", error: "", at: 0 });

export function createCustomizeStore({ call, setTimeout: schedule = globalThis.setTimeout, clearTimeout: cancel = globalThis.clearTimeout, now = Date.now, newId = () => globalThis.crypto.randomUUID() } = {}) {
  let state = {
    skills: { ...IDLE, skills: [], errors: [], cwd: undefined },
    plugins: { ...IDLE, rows: [], raw: null, cwd: undefined },
    mcp: { ...IDLE, rows: [], threadId: null, cwd: "" },
    // A native core's per-connector settings (customize mcp-config): {name: {enabled, enabledTools, disabledTools,
    // defaultMode, tools, editable}}; null until read, or on a core without them.
    mcpConfig: { ...IDLE, servers: null, cwd: "" },
    // A native core's plugin/list: the marketplaces' plugins not installed yet (availablePluginRows).
    catalog: { ...IDLE, rows: [], loadErrors: [], cwd: undefined },
    // A native core's user-added marketplaces [{name, sourceType, source}].
    marketplaces: { ...IDLE, rows: [] },
    // A core's own sub-agents (customize agents: Qwen) [{name, description, scope, path, tools, model}].
    agents: { ...IDLE, rows: [], cwd: undefined },
    // install: {requestId, spec, status 'running'|'done'|'failed', phase, attempt, log, outcome}. W14-code r5-shared-01: a
    // change the running core loads only after a restart is main's to apply (electron/core-restart.cjs restarts the idle
    // core before the next new session), so the page keeps no restart state.
    pluginOps: { install: null },
  };
  const listeners = new Set();
  const inflight = { skills: null, plugins: null, mcp: null, catalog: null };
  const params = { skills: {}, plugins: {}, mcp: {}, catalog: {} };
  let generation = { skills: 0, plugins: 0, mcp: 0, catalog: 0 };
  let skillsTimer = null, mcpTimer = null;

  const emit = () => { for (const listener of listeners) listener(state); };
  const patch = (key, value) => { state = { ...state, [key]: { ...state[key], ...value } }; emit(); };

  // A workspace switch must re-list: the cached rows belong to the previous
  // cwd and the main process re-keys knownSkillPaths on every skills/list.
  async function loadSkills({ cwd, force = false } = {}) {
    const nextCwd = cwd === undefined ? params.skills.cwd : cwd;
    const changed = nextCwd !== params.skills.cwd;
    params.skills.cwd = nextCwd;
    if (!force && !changed && state.skills.status === "ready") return state.skills;
    if (inflight.skills && !force && !changed) return inflight.skills;
    const id = ++generation.skills;
    patch("skills", { status: state.skills.status === "ready" && !changed ? "ready" : "loading", loading: true, error: "", cwd: nextCwd });
    const promise = (async () => {
      try {
        const result = await call("customize", { operation: "skills", cwd: params.skills.cwd, forceReload: !!force });
        if (id !== generation.skills) return state.skills;
        const rows = skillRows(result?.data ? result : { data: [] }, result?.updatedAt || {});
        patch("skills", { status: "ready", loading: false, skills: rows.skills, errors: rows.errors, error: "", at: now() });
        // Plugin skill counts derive from these rows.
        if (state.plugins.raw) patch("plugins", { rows: pluginRows(state.plugins.raw, rows.skills) });
      } catch (error) {
        if (id !== generation.skills) return state.skills;
        patch("skills", { status: state.skills.status === "ready" ? "ready" : "error", loading: false, error: error?.message || "Skills could not be loaded." });
      } finally { if (inflight.skills === promise) inflight.skills = null; }
      return state.skills;
    })();
    inflight.skills = promise;
    return promise;
  }

  async function loadPlugins({ cwd, force = false } = {}) {
    const nextCwd = cwd === undefined ? params.plugins.cwd : cwd;
    const changed = nextCwd !== params.plugins.cwd;
    params.plugins.cwd = nextCwd;
    if (!force && !changed && state.plugins.status === "ready") return state.plugins;
    if (inflight.plugins && !force && !changed) return inflight.plugins;
    const id = ++generation.plugins;
    patch("plugins", { status: state.plugins.status === "ready" && !changed ? "ready" : "loading", loading: true, error: "", cwd: nextCwd });
    const promise = (async () => {
      try {
        const result = await call("customize", { operation: "plugins", cwd: params.plugins.cwd });
        if (id !== generation.plugins) return state.plugins;
        patch("plugins", { status: "ready", loading: false, raw: result, rows: pluginRows(result, state.skills.skills), error: "", at: now() });
      } catch (error) {
        if (id !== generation.plugins) return state.plugins;
        patch("plugins", { status: state.plugins.status === "ready" ? "ready" : "error", loading: false, error: error?.message || "Plugins could not be loaded." });
      } finally { if (inflight.plugins === promise) inflight.plugins = null; }
      return state.plugins;
    })();
    inflight.plugins = promise;
    return promise;
  }

  async function loadPluginCatalog({ cwd, force = false } = {}) {
    const nextCwd = cwd === undefined ? params.catalog.cwd : cwd;
    const changed = nextCwd !== params.catalog.cwd;
    params.catalog.cwd = nextCwd;
    if (!force && !changed && state.catalog.status === "ready") return state.catalog;
    if (inflight.catalog && !force && !changed) return inflight.catalog;
    const id = ++generation.catalog;
    patch("catalog", { status: state.catalog.status === "ready" && !changed ? "ready" : "loading", loading: true, error: "", cwd: nextCwd });
    const promise = (async () => {
      try {
        const result = await call("customize", { operation: "plugin-catalog", cwd: params.catalog.cwd });
        if (id !== generation.catalog) return state.catalog;
        patch("catalog", { status: "ready", loading: false, rows: availablePluginRows(result), loadErrors: marketplaceLoadErrors(result), error: "", at: now() });
      } catch (error) {
        if (id !== generation.catalog) return state.catalog;
        patch("catalog", { status: state.catalog.status === "ready" ? "ready" : "error", loading: false, error: error?.message || "Marketplaces could not be loaded." });
      } finally { if (inflight.catalog === promise) inflight.catalog = null; }
      return state.catalog;
    })();
    inflight.catalog = promise;
    return promise;
  }

  async function loadMcp({ threadId, cwd, force = false } = {}) {
    const nextThread = threadId === undefined ? params.mcp.threadId ?? null : threadId;
    const nextCwd = cwd === undefined ? params.mcp.cwd : cwd;
    const changed = nextThread !== (params.mcp.threadId ?? null) || nextCwd !== params.mcp.cwd;
    params.mcp.threadId = nextThread; params.mcp.cwd = nextCwd;
    if (!force && !changed && state.mcp.status === "ready") return state.mcp;
    if (inflight.mcp && !force && !changed) return inflight.mcp;
    const id = ++generation.mcp;
    patch("mcp", { status: state.mcp.status === "ready" && !changed ? "ready" : "loading", loading: true, error: "", threadId: nextThread, cwd: nextCwd });
    const promise = (async () => {
      try {
        const result = await call("customize", { operation: "mcp", threadId: nextThread, cwd: nextCwd });
        if (id !== generation.mcp) return state.mcp;
        // mcpServerStatus/list carries no startup error: a server that still fails keeps the one its startupStatus
        // notification reported (the relist that notification schedules would otherwise drop it).
        const previous = new Map((state.mcp.rows || []).map((row) => [row.name, row]));
        const rows = mcpRows(result).map((row) => !row.error && row.kind === "unreachable" && previous.get(row.name)?.error ? { ...row, error: previous.get(row.name).error } : row);
        patch("mcp", { status: "ready", loading: false, rows, error: "", at: now() });
      } catch (error) {
        if (id !== generation.mcp) return state.mcp;
        patch("mcp", { status: state.mcp.status === "ready" ? "ready" : "error", loading: false, error: error?.message || "Connectors could not be loaded." });
      } finally { if (inflight.mcp === promise) inflight.mcp = null; }
      return state.mcp;
    })();
    inflight.mcp = promise;
    return promise;
  }

  // ------------------------------------------- connector settings (native Codex)
  async function loadMcpConfig({ cwd } = {}) {
    const nextCwd = cwd === undefined ? state.mcpConfig.cwd : cwd;
    patch("mcpConfig", { status: state.mcpConfig.status === "ready" ? "ready" : "loading", cwd: nextCwd });
    try {
      const result = await call("customize", { operation: "mcp-config", cwd: nextCwd || undefined });
      patch("mcpConfig", { status: "ready", servers: result?.servers ?? {}, error: "", at: now() });
    } catch (error) {
      patch("mcpConfig", { status: "error", servers: null, error: error?.message || "" });
    }
    return state.mcpConfig;
  }
  // Each change re-reads the settings and the connector list (a server turned off or on starts or stops).
  async function mcpSettingChange(operation, payload) {
    try { await call("customize", { operation, cwd: state.mcpConfig.cwd || undefined, ...payload }); }
    finally {
      if (state.mcpConfig.status === "ready") await loadMcpConfig();
      if (state.mcp.status !== "idle") loadMcp({ force: true });
    }
  }
  const setMcpEnabled = (name, enabled) => mcpSettingChange("mcp-enable", { name, enabled });
  async function loadAgents({ cwd, force = false } = {}) {
    if (!force && state.agents.status === "ready" && state.agents.cwd === cwd) return state.agents;
    try { patch("agents", { status: "ready", rows: (await call("customize", { operation: "agents", cwd: cwd || undefined }))?.agents ?? [], cwd }); }
    catch (error) { patch("agents", { status: "error", rows: [], cwd, error: error?.message || "" }); }
    return state.agents;
  }
  // Customize › Agents' Create agent and Delete (customize agent-write / agent-remove), then the list again.
  async function writeAgent(cwd, agent) {
    const result = await call("customize", { operation: "agent-write", cwd: cwd || undefined, ...agent });
    await loadAgents({ cwd, force: true });
    return result;
  }
  async function removeAgent(cwd, name) {
    const result = await call("customize", { operation: "agent-remove", cwd: cwd || undefined, name });
    await loadAgents({ cwd, force: true });
    return result;
  }
  // {enabled?, mode?}: a tool's switch and its approval; mode alone with no tool: the connector's default approval.
  const setMcpTool = (name, tool, change) => mcpSettingChange("mcp-tool", { name, ...(tool ? { tool } : {}), ...change });

  // Skill toggle: optimistic off, the row follows effectiveEnabled from the
  // response, and a failure restores the previous flag for the caller to announce.
  async function setSkillEnabled(path, enabled) {
    const previous = state.skills.skills.find((row) => row.path === path);
    if (!previous) throw new Error(t("Unknown skill."));
    patch("skills", { skills: applySkillEnabled(state.skills.skills, path, enabled) });
    try {
      const result = await call("customize", { operation: "skill-toggle", path, enabled });
      patch("skills", { skills: applySkillEnabled(state.skills.skills, path, result?.effectiveEnabled) });
      return result;
    } catch (error) {
      patch("skills", { skills: applySkillEnabled(state.skills.skills, path, previous.enabled) });
      throw error;
    }
  }

  // ------------------------------------------------------- plugin management
  // A bridge's fixed English refusal (bridge-text-model.mjs: MiniMax's sign-in requirement) reads in the UI language.
  const pluginCall = (operation, payload) => call("customize", { operation, ...payload }).catch((error) => {
    const localized = localizeBridgeText(error?.message);
    if (error && typeof error === "object" && localized !== error.message) { try { error.message = localized; } catch {} }
    throw error;
  });
  function settleChange(result) {
    const outcome = pluginChangeOutcome(result);
    if (state.plugins.status !== "idle") loadPlugins({ force: true });
    return outcome;
  }
  // registry: a URL the install form picked (dsh-plugin-manager registries), or undefined for the core's order.
  const inspectPlugin = (spec, { registry } = {}) => pluginCall("plugin-inspect", { spec, ...(registry ? { registry } : {}) });
  const pluginRegistries = () => pluginCall("plugin-registries", {});
  // W14-code r3 r3-shared-01: `announce` is the caller's result toast, run here when the install settles, as 3.6556.2
  // c76f00e40 toasts from the mutation callback (`m(nn(f, p ? "readyInNewSession" : "ready", {pluginName:t}))`) whether
  // or not the form is still mounted. The outcome then carries `announced`, so a form mounting later does not toast it
  // again; an outcome nobody announced yet is announced by the form that shows it (markPluginInstallAnnounced).
  async function installPlugin(spec, { approvedBuilds, registry, announce } = {}) {
    if (state.pluginOps.install?.status === "running") throw new Error(t("Another plugin is being installed."));
    const requestId = newId();
    patch("pluginOps", { install: { requestId, spec, registry: registry || null, status: "running", phase: "installing", attempt: null, log: "", outcome: null } });
    let outcome;
    try { outcome = settleChange(await pluginCall("plugin-install", { spec, requestId, ...(approvedBuilds ? { approvedBuilds } : {}), ...(registry ? { registry } : {}) })); }
    catch (error) { outcome = { ok: false, message: pluginFailureMessage(error, "install") }; }
    if (typeof announce === "function" && !outcome.cancelled) {
      outcome = { ...outcome, announced: true };
      try { announce(outcome, spec); } catch {}
    }
    if (state.pluginOps.install?.requestId === requestId)
      patch("pluginOps", { install: { ...state.pluginOps.install, status: outcome.ok ? "done" : "failed", outcome } });
    return outcome;
  }
  async function cancelPluginInstall() {
    const install = state.pluginOps.install;
    if (install?.status !== "running") return null;
    patch("pluginOps", { install: { ...install, phase: "cancelling" } });
    return pluginCall("plugin-cancel-install", { requestId: install.requestId });
  }
  const clearPluginInstall = () => { if (state.pluginOps.install?.status !== "running") patch("pluginOps", { install: null }); };
  function markPluginInstallAnnounced(requestId) {
    const install = state.pluginOps.install;
    if (install?.requestId !== requestId || !install.outcome || install.outcome.announced) return;
    patch("pluginOps", { install: { ...install, outcome: { ...install.outcome, announced: true } } });
  }
  async function setPluginEnabled(pluginName, enabled) { return settleChange(await pluginCall("plugin-set-enabled", { pluginName, enabled })); }
  async function removePlugin(pluginName) { return settleChange(await pluginCall("plugin-remove", { pluginName })); }
  async function updatePlugin(pluginName) { return settleChange(await pluginCall("plugin-update", { pluginName })); }

  // ------------------------------------------- native plugin management (Codex)
  // Each change re-lists the installed plugins, the marketplace catalog and (plugin skills) the skills.
  async function nativeChange(operation, payload) {
    let outcome;
    try { outcome = nativePluginOutcome(await pluginCall(operation, payload)); }
    catch (error) { outcome = nativePluginOutcome(null, error, operation); }
    if (outcome.ok) {
      if (state.plugins.status !== "idle") loadPlugins({ force: true });
      if (state.catalog.status !== "idle") loadPluginCatalog({ force: true });
      if (state.skills.status !== "idle") loadSkills({ force: true });
    }
    return outcome;
  }
  const addMarketplace = async (source) => { const outcome = await nativeChange("marketplace-add", { source }); if (outcome.ok) loadMarketplaces(); return outcome; };
  // The marketplaces the user added (customize marketplaces): Remove, and Update for a git one.
  async function loadMarketplaces() {
    try { patch("marketplaces", { status: "ready", rows: (await call("customize", { operation: "marketplaces" }))?.marketplaces ?? [] }); }
    catch (error) { patch("marketplaces", { status: "error", rows: [], error: error?.message || "" }); }
    return state.marketplaces;
  }
  const removeMarketplace = async (name) => { const outcome = await nativeChange("marketplace-remove", { name }); await loadMarketplaces(); return outcome; };
  // The listing is re-read so the row's "Last updated" (config last_updated) follows the pull.
  const upgradeMarketplace = async (name) => { const outcome = await nativeChange("marketplace-upgrade", { name }); if (outcome.ok) void loadMarketplaces(); return outcome; };
  const installMarketplacePlugin = ({ marketplacePath, pluginName, remoteMarketplaceName }) => nativeChange("plugin-install-native", remoteMarketplaceName ? { remoteMarketplaceName, pluginName } : { marketplacePath, pluginName });
  // Workspace sharing of a local plugin (Codex plugin/share/save, plugin/share/delete).
  const sharePlugin = ({ pluginPath, discoverability, remotePluginId }) => nativeChange("plugin-share", { pluginPath, discoverability, ...(remotePluginId ? { remotePluginId } : {}) });
  const unsharePlugin = (remotePluginId) => nativeChange("plugin-unshare", { remotePluginId });
  const uninstallPlugin = (pluginId) => nativeChange("plugin-uninstall", { pluginId });
  const setNativePluginEnabled = (pluginId, enabled) => nativeChange("plugin-enable-native", { pluginId, enabled });

  function scheduleSkillsReload() {
    if (state.skills.status === "idle") return;
    cancel(skillsTimer);
    skillsTimer = schedule(() => { skillsTimer = null; loadSkills({ force: true }); }, SKILLS_CHANGED_DEBOUNCE_MS);
  }
  function scheduleMcpReload() {
    if (state.mcp.status === "idle") return;
    cancel(mcpTimer);
    mcpTimer = schedule(() => { mcpTimer = null; loadMcp({ force: true }); }, SKILLS_CHANGED_DEBOUNCE_MS);
  }

  function observe(event) {
    if (!event || typeof event.method !== "string") return;
    const install = state.pluginOps.install;
    if (event.method === "codeDesktop/plugin/installProgress" || event.method === "codeDesktop/plugin/installLog") {
      if (install?.status !== "running" || event.params?.requestId !== install.requestId) return;
      patch("pluginOps", { install: event.method === "codeDesktop/plugin/installLog"
        ? { ...install, log: appendPluginLog(install.log, event.params.text) }
        : { ...install, phase: event.params.phase, attempt: event.params.attempt ?? null } });
      return;
    }
    if (event.method === "codeDesktop/plugin/changed") { if (state.plugins.status !== "idle") loadPlugins({ force: true }); return; }
    if (event.method === "skills/changed") scheduleSkillsReload();
    else if (event.method === "mcpServer/startupStatus/updated") {
      if (state.mcp.status === "idle") return;
      const result = patchMcpRow(state.mcp.rows, event.params, { threadId: params.mcp.threadId ?? null });
      if (result.rows !== state.mcp.rows) patch("mcp", { rows: result.rows });
      if (result.relist) scheduleMcpReload();
    } else if (event.method === "mcpServer/oauthLogin/completed") scheduleMcpReload();
  }

  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function dispose() { cancel(skillsTimer); cancel(mcpTimer); listeners.clear(); }

  return { getSnapshot: () => state, subscribe, loadSkills, loadPlugins, loadMcp, setSkillEnabled, observe, dispose,
    inspectPlugin, pluginRegistries, installPlugin, cancelPluginInstall, clearPluginInstall, markPluginInstallAnnounced, setPluginEnabled, removePlugin, updatePlugin,
    loadPluginCatalog, addMarketplace, installMarketplacePlugin, sharePlugin, unsharePlugin, uninstallPlugin, setNativePluginEnabled,
    loadMcpConfig, setMcpEnabled, setMcpTool, loadMarketplaces, removeMarketplace, upgradeMarketplace, loadAgents, writeAgent, removeAgent,
    get params() { return params; } };
}
