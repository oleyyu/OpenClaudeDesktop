// Codex's own optional features for Settings › Code (the native Codex core only; codex 0.155.1, verified with an
// isolated CODEX_HOME):
// - Memories (tui /memories, memories_settings_view.rs): the 'memories' feature (features.memories in config.toml, off by
//   default; experimentalFeature/enablement/set for the running process), whether new threads use and generate them
//   (memories.use_memories / generate_memories, config_update.rs build_memory_settings_edits), memory/status and a
//   confirmed memory/reset.
// - Beta features (tui /experimental): experimentalFeature/list stage 'beta' with their display name and description,
//   switched in config.toml features.<name> (config_update.rs build_feature_enabled_edit) and for the running process.
//   Worktrees and Prevent sleep are left out: OpenClaude Desktop has its own (the composer's worktree option, Settings ›
//   Code › keep awake).
// Only names the last listing offered are written.
const { coreForEngine } = require("./core-registry.mjs");

const HIDDEN_BETA = new Set(["worktrees", "prevent_idle_sleep"]);
const FEATURE_NAME = /^[a-z0-9_]{1,64}$/;
const TIMEOUT = 15000;

function createCodexFeatures({ getClient }) {
  const offered = new Set();
  const owner = async () => {
    const client = getClient();
    await client.start();
    if (coreForEngine(client.serverInfo?.engine).id !== "codex" || client.serverInfo?.capabilities?.permissionHints === true) throw new Error("These settings are only for the Codex core.");
    return client;
  };
  async function read() {
    const client = await owner();
    const [features, config, status] = await Promise.all([
      client.request("experimentalFeature/list", { limit: 200 }, TIMEOUT),
      client.request("config/read", { includeLayers: false }, TIMEOUT).catch(() => null),
      client.request("memory/status", {}, TIMEOUT).catch(() => null),
    ]);
    const list = (Array.isArray(features?.data) ? features.data : []).filter((feature) => feature && typeof feature.name === "string");
    const memories = list.find((feature) => feature.name === "memories") ?? null;
    const beta = list.filter((feature) => feature.stage === "beta" && !HIDDEN_BETA.has(feature.name) && FEATURE_NAME.test(feature.name))
      .map((feature) => ({ name: feature.name, displayName: typeof feature.displayName === "string" && feature.displayName ? feature.displayName : feature.name,
        description: typeof feature.description === "string" ? feature.description : "", enabled: feature.enabled === true }));
    offered.clear();
    for (const feature of beta) offered.add(feature.name);
    if (memories) offered.add("memories");
    const settings = config?.config?.memories && typeof config.config.memories === "object" ? config.config.memories : {};
    return {
      beta,
      memories: memories ? {
        enabled: memories.enabled === true,
        // Codex's defaults when config.toml leaves them out: both on (memories.rs MemoriesToml defaults).
        useMemories: settings.use_memories !== false, generateMemories: settings.generate_memories !== false,
        status: status && typeof status === "object" ? { threads: Number.isFinite(status.v2ConsolidatedThreads) ? status.v2ConsolidatedThreads : null, ready: status.v2Ready === true } : null,
      } : null,
    };
  }
  async function setFeature(name, enabled) {
    if (typeof name !== "string" || !offered.has(name) || typeof enabled !== "boolean") throw new Error("Unknown feature.");
    const client = await owner();
    // build_feature_enabled_edit: on is `true`; off clears a default-off feature. Memories also clears the legacy key.
    const edits = [{ keyPath: `features.${name}`, value: enabled ? true : null, mergeStrategy: "replace" }];
    if (name === "memories") edits.push({ keyPath: "features.memory_tool", value: enabled ? true : null, mergeStrategy: "replace" });
    await client.request("config/batchWrite", { edits, reloadUserConfig: true }, TIMEOUT);
    await client.request("experimentalFeature/enablement/set", { enablement: { [name]: enabled } }, TIMEOUT).catch(() => {});
    return read();
  }
  async function setMemories({ useMemories, generateMemories }) {
    if (!offered.has("memories")) throw new Error("Unknown feature.");
    const edits = [];
    if (typeof useMemories === "boolean") edits.push({ keyPath: "memories.use_memories", value: useMemories, mergeStrategy: "replace" });
    if (typeof generateMemories === "boolean") edits.push({ keyPath: "memories.generate_memories", value: generateMemories, mergeStrategy: "replace" });
    if (!edits.length) throw new Error("Nothing to change.");
    const client = await owner();
    await client.request("config/batchWrite", { edits, reloadUserConfig: true }, TIMEOUT);
    return read();
  }
  async function resetMemories(confirmed) {
    if (confirmed !== true) throw new Error("Confirm the reset first.");
    const client = await owner();
    await client.request("memory/reset", undefined, 60000);
    return read();
  }
  return {
    run(p = {}) {
      if (p.op === "read") return read();
      if (p.op === "set-feature") return setFeature(p.name, p.enabled);
      if (p.op === "set-memories") return setMemories(p);
      if (p.op === "reset-memories") return resetMemories(p.confirmed);
      throw new Error("Unsupported operation.");
    },
  };
}

module.exports = { createCodexFeatures, HIDDEN_BETA };
