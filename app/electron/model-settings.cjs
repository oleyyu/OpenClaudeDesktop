// C5 model parameters and pricing, main-process side.
//
// decorate(method, params) runs in the desktop:call "rpc" case after the
// bypass validation and before client.request:
//   thread/start | thread/resume | turn/start, on any core that reads modelParams (coreTakesModelParams: capabilities.modelParams, else customization)
//     params.codeDesktop.customization.modelParams = {[wireModelId]: {maxTokens?, temperature?}} | null
//   account/usage/read, on a core that reads price overrides (providerSettings: the DeepSeek bridge; or a
//   bridge reporting capabilities.priceOverrides)
//     params.codeDesktop.prices = price overrides | null (official table)
// On the Codex core, decorate only names the provider a resumed / forked thread runs on
// (params.modelProvider, once a custom endpoint was saved) and lists every provider's
// threads (thread/list modelProviders: []); nothing else is added.
//
// run({op:'official-prices'}) asks the bridge for its official table
// (codeDesktop/pricing/read); a core without it answers {unsupported:true}.
//
// Custom OpenAI-compatible providers (ops providers-read / provider-save /
// provider-remove): the definitions live in <userData>/harness/providers.json,
// the keys encrypted with Electron safeStorage in
// <userData>/harness/provider-keys.bin. Both become one managed `llm-pi-ai`
// overlay row (harness-profile.cjs setManagedRow) and one env var per route
// (setCoreEnv), applied when the core restarts. Keys never reach
// preferences.json, the renderer or ~/.dsh.
//
// API connection (ops connection-read / connection-save): the DeepSeek core
// talks to the official API or to a third-party relay (an Anthropic
// Messages-compatible base URL). The mode and relay URL live in
// <userData>/harness/connection.json; each mode's key sits in the same
// encrypted provider-keys.bin under a reserved name ("@official", "@relay",
// never a valid route). They reach the core as DEEPSEEK_API_KEY and
// DEEPSEEK_BASE_URL (the inherited environment outranks ~/.dsh), applied when
// the core restarts. Without a saved key the launch environment or ~/.dsh applies.
// A relay that names models differently lists its ids (relayModels, or op
// connection-models reads its /v1/models); they replace the llm-deepseek
// adapter's catalog through one managed overlay row.
//
// Codex endpoint (ops codex-provider-read / -save / -models / -test; prefs/codex-provider.mjs):
// OpenAI or a custom Responses endpoint. provider.json lives in <userData>/codex, the key in
// provider-keys.bin under "@codex". setCodexLaunch (codex.cjs) receives a getter for the
// Codex child's `-c` overrides and environment: the key as CODE_DESKTOP_CODEX_API_KEY, and
// DEEPSEEK_* plus every Harness-managed key removed. Custom mode adds a model catalog built
// from `codex debug models --bundled` (cached per binary) in <userData>/codex/model-catalog.json.
// Applied when the core restarts.
const fs = require("node:fs");
const path = require("node:path");
const { createRelayProxy } = require("./relay-proxy.cjs");
const METHOD_NOT_FOUND = -32601;
const { coreSupports, coreCapabilities, coreForEngine } = require("./core-registry.mjs");
const i18n = require("./i18n/index.mjs");
const THREAD_METHODS = new Set(["thread/start", "thread/resume", "turn/start"]);
// A URL's origin (scheme, host and port), or null: a saved key is sent only back to its own origin.
const originOf = value => { try { return new URL(value).origin; } catch { return null; } };
// Codex threads resumed or forked on the saved provider.
const CODEX_PROVIDER_METHODS = new Set(["thread/resume", "thread/fork"]);
// Relay mode: web search's own key variable and the profile row (dsh-base's web-search-deepseek) that names it.
const SEARCH_KEY_ENV = "CODE_DESKTOP_DEEPSEEK_SEARCH_KEY";
const SEARCH_ROW_ID = "web-search-deepseek";

// The pure prefs module is ESM. Electron 44 (Node 24) and the test runner can
// require it synchronously; the async import is a fallback loaded at startup.
let prefsModule = null;
const loading = import("./prefs/model-settings.mjs").then(module => { prefsModule ??= module; }, () => {});
function prefs() {
  if (prefsModule) return prefsModule;
  try { return prefsModule = require("./prefs/model-settings.mjs"); } catch { return null; }
}
let codexModule = null;
const loadingCodex = import("./prefs/codex-provider.mjs").then(module => { codexModule ??= module; }, () => {});
function codexPrefs() {
  if (codexModule) return codexModule;
  try { return codexModule = require("./prefs/codex-provider.mjs"); } catch { return null; }
}
// `codex debug models --bundled`: offline, writes nothing but CODEX_HOME/tmp.
function bundledCatalog(command, env) {
  return new Promise((resolve, reject) => {
    require("node:child_process").execFile(command, ["debug", "models", "--bundled"], { env, timeout: 5000, maxBuffer: 32 * 1024 * 1024, cwd: require("node:os").homedir() },
      (error, stdout) => { if (error) return reject(error); try { resolve(JSON.parse(stdout)); } catch (parse) { reject(parse); } });
  });
}

function createModelSettings({ getConfig, getClient, app, getHarnessProfile = () => null, safeStorage, dir, codexDir, relayProxy = createRelayProxy(),
  setCodexLaunch = null, codexCommand = () => "codex", readBundledCatalog = bundledCatalog }) {
  // A core with capabilities.providerSettings (the DeepSeek bridge) takes the API connection and providers.
  const isDeepSeek = client => !!client?.serverInfo && coreSupports(client.serverInfo, "providerSettings");
  const harnessDir = () => dir || path.join(app.getPath("userData"), "harness");
  const providersFile = () => path.join(harnessDir(), "providers.json");
  const keysFile = () => path.join(harnessDir(), "provider-keys.bin");
  const connectionFile = () => path.join(harnessDir(), "connection.json");
  // What the app was launched with, restored when a saved value is cleared.
  const inherited = { DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL };
  const storage = () => safeStorage ?? (safeStorage = require("electron").safeStorage);
  const codexFolder = () => codexDir || (dir ? path.join(dir, "codex") : path.join(app.getPath("userData"), "codex"));
  const codexProviderFile = () => path.join(codexFolder(), "provider.json");
  const codexCatalogFile = () => path.join(codexFolder(), "model-catalog.json");

  function writeAtomic(file, data, mode = 0o600) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temp, data, { mode });
    fs.renameSync(temp, file);
  }
  function readProviders() {
    try { return prefs().normalizeProviders(JSON.parse(fs.readFileSync(providersFile(), "utf8")).providers); } catch { return []; }
  }
  function readKeys() {
    let data;
    try { data = fs.readFileSync(keysFile()); } catch { return {}; }
    try {
      const parsed = JSON.parse(storage().decryptString(data));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.fromEntries(Object.entries(parsed).filter(([, key]) => typeof key === "string" && key)) : {};
    } catch (error) {
      console.warn("Couldn’t read the provider keys:", error?.message || error);
      return {};
    }
  }
  function writeKeys(keys) {
    if (!Object.keys(keys).length) { fs.rmSync(keysFile(), { force: true }); return; }
    if (!storage()?.isEncryptionAvailable?.()) throw new Error("Secure storage is unavailable, so the API key can’t be saved.");
    writeAtomic(keysFile(), storage().encryptString(JSON.stringify(keys)));
  }
  // Export every stored key to the core's environment (before its next spawn).
  function exportKeys(providers = readProviders(), keys = readKeys(), previous = []) {
    const profile = getHarnessProfile();
    if (!profile?.setCoreEnv) return;
    for (const route of previous) if (!providers.some(provider => provider.route === route)) profile.setCoreEnv(prefs().providerKeyEnv(route), null);
    for (const provider of providers) profile.setCoreEnv(prefs().providerKeyEnv(provider.route), keys[provider.route] ?? null);
  }
  function readConnection() {
    try { return prefs().normalizeConnection(JSON.parse(fs.readFileSync(connectionFile(), "utf8"))); } catch { return prefs().normalizeConnection(null); }
  }
  // Relay mode routes the core through the loopback forwarder (relay-proxy.cjs).
  async function exportConnection(connection = readConnection(), keys = readKeys()) {
    const profile = getHarnessProfile();
    if (!profile?.setCoreEnv) return;
    const relay = connection.mode === "relay";
    const key = keys[relay ? prefs().CONNECTION_KEY_RELAY : prefs().CONNECTION_KEY_OFFICIAL];
    let base = inherited.DEEPSEEK_BASE_URL ?? null;
    if (relay) {
      try { base = await relayProxy.start(connection.relayBaseURL); }
      catch (error) { console.warn("Couldn’t start the relay forwarder; using the relay directly:", error?.message || error); base = connection.relayBaseURL; }
    } else await relayProxy.stop();
    profile.setCoreEnv("DEEPSEEK_API_KEY", key ?? inherited.DEEPSEEK_API_KEY ?? null);
    profile.setCoreEnv("DEEPSEEK_BASE_URL", base);
    await exportSearchKey(relay, keys);
  }
  // Web search (dsh-web-search-deepseek) always calls DeepSeek's official endpoint and reads its key from apiKeyEnv,
  // DEEPSEEK_API_KEY by default: in relay mode that is the relay's key, which must never reach DeepSeek. There the
  // search reads a variable of its own, set only from the official key (the saved one, else a DEEPSEEK_API_KEY the app
  // was launched with for the official endpoint); with none, a search fails for want of a key instead.
  async function exportSearchKey(relay, keys) {
    const profile = getHarnessProfile();
    if (!profile?.setCoreEnv) return;
    const inheritedOfficial = !inherited.DEEPSEEK_BASE_URL || /^https:\/\/api\.deepseek\.com(?:\/|$)/.test(inherited.DEEPSEEK_BASE_URL) ? inherited.DEEPSEEK_API_KEY : null;
    profile.setCoreEnv(SEARCH_KEY_ENV, relay ? keys[prefs().CONNECTION_KEY_OFFICIAL] ?? inheritedOfficial ?? null : null);
    try {
      if (relay) await profile.setManagedRow?.(SEARCH_ROW_ID, { config: { apiKeyEnv: SEARCH_KEY_ENV } });
      else await profile.removeManagedRow?.(SEARCH_ROW_ID);
    } catch (error) { console.warn("Couldn’t point web search at the official key:", error?.message || error); }
  }
  async function refreshCatalogRows() {
    const profile = getHarnessProfile();
    if (!profile?.setManagedRow) return;
    const relay = prefs().relayCatalogRow(readConnection()), providers = prefs().providerOverlayRow(readProviders());
    if (relay) await profile.setManagedRow(prefs().DEEPSEEK_ROW_ID, relay);
    if (providers) await profile.setManagedRow(prefs().PROVIDER_ROW_ID, providers);
  }
  function connectionView() {
    const keys = readKeys();
    return {
      available: !!getHarnessProfile()?.setCoreEnv,
      ...readConnection(),
      officialKey: !!keys[prefs().CONNECTION_KEY_OFFICIAL],
      relayKey: !!keys[prefs().CONNECTION_KEY_RELAY],
      inheritedKey: !!inherited.DEEPSEEK_API_KEY,
    };
  }
  async function applyProviders(providers, keys, previousRoutes) {
    const profile = getHarnessProfile();
    if (!profile?.setManagedRow) throw new Error("Custom providers need Settings › Harness, which isn’t available.");
    writeAtomic(providersFile(), JSON.stringify({ version: 1, providers }, null, 2) + "\n", 0o644);
    writeKeys(keys);
    const row = prefs().providerOverlayRow(providers);
    if (row) await profile.setManagedRow(prefs().PROVIDER_ROW_ID, row);
    else await profile.removeManagedRow(prefs().PROVIDER_ROW_ID);
    exportKeys(providers, keys, previousRoutes);
  }
  function providersView() {
    const keys = readKeys();
    return {
      available: !!getHarnessProfile()?.setManagedRow,
      protocols: [...prefs().PROVIDER_PROTOCOLS],
      providers: readProviders().map(provider => ({ ...provider, keyEnv: prefs().providerKeyEnv(provider.route), hasKey: !!keys[provider.route] })),
    };
  }
  // ---- Codex endpoint
  function readCodexProvider() {
    try { return codexPrefs().normalizeCodexProvider(JSON.parse(fs.readFileSync(codexProviderFile(), "utf8"))); } catch { return codexPrefs()?.normalizeCodexProvider(null) ?? null; }
  }
  function codexProviderView(provider = readCodexProvider(), keys = readKeys()) {
    return { available: !!setCodexLaunch, ...provider, hasKey: !!keys[codexPrefs().CODEX_KEY_SLOT] };
  }
  // The variables the Codex child must not inherit: the DeepSeek connection and every Harness-managed key.
  function codexBlankEnv() {
    const blank = { DEEPSEEK_API_KEY: undefined, DEEPSEEK_BASE_URL: undefined };
    let managed = {};
    try { managed = getHarnessProfile()?.coreEnvKeys?.() ?? {}; } catch {}
    for (const key of Object.keys(managed)) blank[key] = undefined;
    return blank;
  }
  // What the next Codex spawn gets; refreshed by refreshCodexLaunch().
  let codexLaunchState = { args: [], key: null, custom: null };
  const bundledCache = new Map();
  function codexLaunch() {
    const env = codexBlankEnv(), name = codexPrefs()?.CODEX_KEY_ENV;
    if (name) env[name] = codexLaunchState.key ?? undefined;
    return { args: [...codexLaunchState.args], env };
  }
  async function codexCatalogPath(provider) {
    const command = codexCommand?.();
    if (!command) return null;
    let stat;
    try { stat = fs.statSync(command); } catch { return null; }
    const cacheKey = `${command}\0${stat.mtimeMs}\0${stat.size}`;
    let bundled = bundledCache.get(cacheKey);
    if (!bundled) {
      bundled = await readBundledCatalog(command, { ...process.env, ...Object.fromEntries(Object.keys(codexBlankEnv()).map(key => [key, undefined])) });
      bundledCache.clear();
      bundledCache.set(cacheKey, bundled);
    }
    let host = "";
    try { host = new URL(provider.baseURL).host; } catch {}
    const text = JSON.stringify(codexPrefs().buildCodexCatalog(bundled, provider.models, { description: host }));
    let current = null;
    try { current = fs.readFileSync(codexCatalogFile(), "utf8"); } catch {}
    if (current !== text) writeAtomic(codexCatalogFile(), text, 0o644);
    return codexCatalogFile();
  }
  async function refreshCodexLaunch(provider = readCodexProvider(), keys = readKeys()) {
    if (!codexPrefs() || !provider) return codexLaunch();
    const saved = !!provider.baseURL;
    let catalogPath = null;
    if (saved && provider.mode === "custom") {
      try { catalogPath = await codexCatalogPath(provider); }
      catch (error) {
        console.warn("Couldn’t build the Codex model catalog:", error?.message || error);
        // The last catalog still serves when it lists exactly these ids (e.g. a binary that can't run `debug models`).
        try {
          const listed = JSON.parse(fs.readFileSync(codexCatalogFile(), "utf8")).models.filter(model => model.visibility === "list").map(model => model.slug);
          if (JSON.stringify(listed) === JSON.stringify(provider.models)) catalogPath = codexCatalogFile();
        } catch {}
      }
    }
    // The key travels only while the endpoint is in use (OpenAI mode resumes its threads on OpenAI, decorateThread).
    // custom: the endpoint's ids when they run without a catalog, so connect() lists them, not model/list's bundled ones.
    const custom = saved && provider.mode === "custom" && provider.models.length && !catalogPath ? { ids: [...provider.models], template: codexPrefs().CODEX_CATALOG_TEMPLATE } : null;
    // A local model server saved without a key runs keyless (no env_key in the provider table).
    const keyless = saved && provider.mode === "custom" && !keys[codexPrefs().CODEX_KEY_SLOT] && codexPrefs().codexLocalEndpoint(provider.baseURL);
    codexLaunchState = { args: codexPrefs().codexLaunchArgs(provider, { catalogPath, keyless }), key: saved && provider.mode === "custom" ? keys[codexPrefs().CODEX_KEY_SLOT] ?? null : null, custom };
    setCodexLaunch?.(codexLaunch);
    return codexLaunch();
  }
  const isCodex = client => !!client?.serverInfo && coreForEngine(client.serverInfo.engine).id === "codex";
  // The provider the owner's Codex child was launched with, from its `-c` args (child.spawnargs): a save applies
  // only after the restart, and a CODEX_BINARY / options.binary child never gets them. Without a live child, the
  // args the next spawn takes. null: no OpenClaude Desktop provider table, so naming one would fail the request.
  function launchedProvider(client) {
    const codex = codexPrefs(), id = codex.CODEX_PROVIDER_ID;
    const live = Array.isArray(client?.child?.spawnargs) ? client.child.spawnargs : null;
    const args = live ?? (process.env.CODEX_BINARY || client?.options?.binary ? [] : codexLaunchState.args);
    if (!args.some(arg => typeof arg === "string" && arg.startsWith(`model_providers.${id}=`))) return null;
    return args.includes(`model_provider=${codex.tomlString(id)}`) ? id : "openai";
  }
  /** Codex only: the running launch's provider on thread/resume and thread/fork, and every provider's threads on thread/list. */
  function decorateThread(method, params, client = getClient()) {
    if (!params || typeof params !== "object" || !codexPrefs() || !isCodex(client)) return params;
    if (!CODEX_PROVIDER_METHODS.has(method) && method !== "thread/list") return params;
    if (method === "thread/list") { if (codexPrefs().codexThreadProvider(readCodexProvider()) || launchedProvider(client)) params.modelProviders ??= []; return params; }
    const provider = launchedProvider(client);
    // OpenAI mode moves only a thread recorded under the custom endpoint (it can't run there without the key); any
    // other thread keeps its own provider, including one the user's ~/.codex/config.toml names (azure, ollama, …).
    if (provider === "openai" && getConfig()?.threadMetadata?.[params.threadId]?.modelProvider !== codexPrefs().CODEX_PROVIDER_ID) return params;
    if (provider) params.modelProvider ??= provider;
    return params;
  }
  // Settings › Models probes (typed or saved base URL and key; the key never goes back).
  // keyless: a local model server (Codex on LM Studio / Ollama), asked without a key when none is given.
  async function probeEndpoint({ op, api, baseURL: typedBase, apiKey, model: typedModel, keyless = false, timeoutMs = 20000 }) {
    const presets = await import("./prefs/provider-presets.mjs");
    const baseURL = String(typedBase ?? "").trim();
    let url;
    try { url = new URL(baseURL); } catch { throw new Error("Enter the API base URL, e.g. https://api.example.com/anthropic."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("The base URL must be an http(s) URL without credentials.");
    const key = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!key && !keyless) throw new Error("Enter the API key.");
    if (key.length > 4096 || /[\x00-\x1f\x7f]/.test(key)) throw new Error("Invalid API key.");
    const headers = api === "anthropic-messages"
      ? { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }
      : { ...(key ? { authorization: `Bearer ${key}` } : {}), "content-type": "application/json" };
    const answer = async (response) => {
      let detail = "";
      try { const body = await response.json(); detail = body?.error?.message || body?.message || body?.error || ""; } catch {}
      return typeof detail === "string" ? detail.slice(0, 300) : "";
    };
    if (op === "models") {
      const target = presets.modelsURL({ api, baseURL });
      let response;
      try { response = await fetch(target, { headers, signal: AbortSignal.timeout(timeoutMs) }); }
      catch (error) { throw new Error(`Couldn’t reach ${target}: ${error?.message || error}`); }
      if (!response.ok) { const detail = await answer(response); throw new Error(`${target} answered ${response.status}.${detail ? ` ${detail}` : ""}`); }
      const body = await response.json().catch(() => null);
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
      const models = prefs().parseRelayModels(list.map(item => typeof item === "string" ? item : item?.id ?? item?.name).filter(id => typeof id === "string").map(id => id.replace(/^models\//, "")).slice(0, prefs().MAX_ENTRIES));
      const windows = prefs().listedContextWindows(list), listed = Object.fromEntries(models.filter(id => windows[id]).map(id => [id, windows[id]]));
      return { models, ...(Object.keys(listed).length ? { contextWindows: listed } : {}) };
    }
    const model = typeof typedModel === "string" ? typedModel.trim() : "";
    if (!model) throw new Error("Choose a model.");
    const request = presets.testRequest({ api, baseURL, model });
    let response;
    const started = Date.now();
    try { response = await fetch(request.url, { method: "POST", headers, body: JSON.stringify(request.body), signal: AbortSignal.timeout(30000) }); }
    catch (error) { throw new Error(`Couldn’t reach ${request.url}: ${error?.message || error}`); }
    if (!response.ok) {
      const detail = await answer(response);
      const hint = response.status === 401 || response.status === 403 ? " Check the key and that it belongs to this endpoint." : response.status === 404 ? " Check the base URL and the model id." : "";
      throw new Error(`${response.status}${detail ? `: ${detail}` : ""}.${hint}`);
    }
    return { ok: true, ms: Date.now() - started };
  }

  // Keys are exported once the app is ready (safeStorage needs it), before main's connect().
  // main.cjs connect() awaits ready() before the first core spawn, so the
  // relay forwarder's port is in the core's environment.
  const exported = !app?.whenReady ? Promise.resolve() : app.whenReady().then(async () => {
    await loading;
    try { if (prefs()) { exportKeys(); await exportConnection(); } } catch (error) { console.warn("Couldn’t export the provider keys:", error?.message || error); }
    // Rewrite the managed catalog rows so facts added since they were saved (image input) reach the core.
    try { if (prefs()) await refreshCatalogRows(); } catch (error) { console.warn("Couldn’t refresh the model catalog rows:", error?.message || error); }
  });
  // Every connect() awaits this before spawning: the Codex launch is rebuilt after the Harness keys are
  // exported (so they are blanked) and for the Codex binary in use now (Settings › Cores may have changed it).
  const ready = () => exported.then(async () => {
    await loadingCodex;
    try { if (setCodexLaunch) await refreshCodexLaunch(); } catch (error) { console.warn("Couldn’t prepare the Codex endpoint:", error?.message || error); }
  });

  // Per-model max tokens / temperature reach every core that reads codeDesktop.customization.modelParams (the
  // modelParams capability, else customization: prefs coreTakesModelParams, the same check Settings › Models shows
  // the rows on); price overrides only a core that reads them on account/usage/read.
  const takesModelParams = client => !!client?.serverInfo && prefs()?.coreTakesModelParams?.(coreCapabilities(client.serverInfo)) === true;
  const takesPrices = client => isDeepSeek(client) || (!!client?.serverInfo && coreSupports(client.serverInfo, "priceOverrides"));
  function decorate(method, params) {
    decorateThread(method, params);
    if (!params || typeof params !== "object" || !prefs()) return params;
    const client = getClient();
    if (THREAD_METHODS.has(method) ? !takesModelParams(client) : method !== "account/usage/read" || !takesPrices(client)) return params;
    const settings = getConfig()?.modelSettings;
    if (THREAD_METHODS.has(method)) {
      const codeDesktop = params.codeDesktop && typeof params.codeDesktop === "object" ? params.codeDesktop : {};
      const customization = codeDesktop.customization && typeof codeDesktop.customization === "object" ? codeDesktop.customization : {};
      // Per-model values are kept per core ('<coreId>:<modelId>', prefs/model-settings.mjs modelParamsKey).
      params.codeDesktop = { ...codeDesktop, customization: { ...customization, modelParams: prefs().modelParamsForCore(settings, coreForEngine(client.serverInfo?.engine).id) } };
    } else if (method === "account/usage/read") {
      const codeDesktop = params.codeDesktop && typeof params.codeDesktop === "object" ? params.codeDesktop : {};
      params.codeDesktop = { ...codeDesktop, prices: prefs().pricesForCore(settings) };
    }
    return params;
  }

  async function run(p = {}) {
    await loading;
    if (!prefs()) throw new Error("Model settings aren’t available.");
    if (p.op === "providers-read") return providersView();
    if (p.op === "connection-read") return connectionView();
    if (p.op === "connection-save") {
      if (!getHarnessProfile()?.setCoreEnv) throw new Error("The API connection needs Settings › Harness, which isn’t available.");
      const connection = prefs().validateConnection({ ...readConnection(), ...p.connection });
      const keys = readKeys();
      for (const [field, name] of [["officialKey", prefs().CONNECTION_KEY_OFFICIAL], ["relayKey", prefs().CONNECTION_KEY_RELAY]]) {
        const value = p[field];
        if (typeof value === "string" && value.trim()) {
          if (value.length > 4096 || /[\x00-\x1f\x7f]/.test(value.trim())) throw new Error("Invalid API key.");
          keys[name] = value.trim();
        } else if (value === null) delete keys[name];
      }
      if (connection.mode === "relay" && !keys[prefs().CONNECTION_KEY_RELAY]) throw new Error("Enter the relay’s API key.");
      writeAtomic(connectionFile(), JSON.stringify({ version: 1, ...connection }, null, 2) + "\n", 0o644);
      writeKeys(keys);
      await exportConnection(connection, keys);
      // The relay's model ids replace the adapter's catalog (deepseek-flash / deepseek-v4-pro).
      const profile = getHarnessProfile(), row = prefs().relayCatalogRow(connection);
      if (row && profile.setManagedRow) await profile.setManagedRow(prefs().DEEPSEEK_ROW_ID, row);
      else if (!row && profile.removeManagedRow) await profile.removeManagedRow(prefs().DEEPSEEK_ROW_ID);
      return connectionView();
    }
    if (p.op === "connection-models") {
      // GET <base>/v1/models with the typed or the saved relay key; the key never goes back.
      const base = String(p.relayBaseURL ?? readConnection().relayBaseURL ?? "").trim().replace(/\/+$/, "");
      const urlError = prefs().relayBaseURLError(base);
      if (urlError) throw new Error(urlError);
      // The saved relay key goes only to the saved relay's origin: another host (or scheme) needs its own typed key.
      const saved = readConnection().relayBaseURL;
      const key = typeof p.relayKey === "string" && p.relayKey.trim() ? p.relayKey.trim()
        : saved && originOf(base) === originOf(saved) ? readKeys()[prefs().CONNECTION_KEY_RELAY] : "";
      if (!key) throw new Error("Enter the relay’s API key.");
      const root = new URL(base).pathname.endsWith("/v1") ? base : `${base}/v1`;
      let response;
      try { response = await fetch(`${root}/models`, { headers: { authorization: `Bearer ${key}`, "x-api-key": key, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(20000) }); }
      catch (error) { throw new Error(`Couldn’t reach ${root}/models: ${error?.message || error}`); }
      if (!response.ok) throw new Error(`The relay answered ${response.status} for ${root}/models.`);
      const body = await response.json().catch(() => null);
      const list = Array.isArray(body?.data) ? body.data : Array.isArray(body?.models) ? body.models : [];
      const models = prefs().parseRelayModels(list.map(item => typeof item === "string" ? item : item?.id).filter(id => typeof id === "string").slice(0, prefs().MAX_ENTRIES));
      // Context windows the listing reports prefill the per-model field (relayContextWindows).
      const windows = prefs().listedContextWindows(list), listed = Object.fromEntries(models.filter(id => windows[id]).map(id => [id, windows[id]]));
      return { models, ...(Object.keys(listed).length ? { contextWindows: listed } : {}) };
    }
    if (p.op === "provider-save") {
      const provider = prefs().validateProvider(p.provider);
      const providers = readProviders(), previousRoutes = providers.map(item => item.route);
      const index = providers.findIndex(item => item.route === (typeof p.previousRoute === "string" ? p.previousRoute : provider.route));
      if (providers.some((item, at) => item.route === provider.route && at !== index)) throw new Error("A provider with that id already exists.");
      if (index < 0 && providers.length >= prefs().MAX_PROVIDERS) throw new Error(`Use ${prefs().MAX_PROVIDERS} providers or fewer.`);
      const keys = readKeys(), oldRoute = index >= 0 ? providers[index].route : null;
      if (oldRoute && oldRoute !== provider.route) { if (keys[oldRoute]) keys[provider.route] = keys[oldRoute]; delete keys[oldRoute]; }
      if (typeof p.apiKey === "string" && p.apiKey.trim()) {
        if (p.apiKey.length > 4096 || /[\x00-\x1f\x7f]/.test(p.apiKey.trim())) throw new Error("Invalid API key.");
        keys[provider.route] = p.apiKey.trim();
      } else if (p.apiKey === null) delete keys[provider.route];
      if (index >= 0) providers[index] = provider; else providers.push(provider);
      await applyProviders(providers, keys, previousRoutes);
      return providersView();
    }
    if (p.op === "provider-remove") {
      const providers = readProviders(), previousRoutes = providers.map(item => item.route);
      const next = providers.filter(item => item.route !== p.route);
      if (next.length === providers.length) throw new Error("Unknown provider.");
      const keys = readKeys(); delete keys[p.route];
      await applyProviders(next, keys, previousRoutes);
      return providersView();
    }
    // First-run quick setup (src/source-onboarding.jsx, prefs/provider-presets.mjs): a typed endpoint and key,
    // tested the way the core will call it (a 1-token request) or asked for its models. The key never goes back.
    if (p.op === "provider-test" || p.op === "provider-models") {
      const api = prefs().PROVIDER_PROTOCOLS.includes(p.api) ? p.api : "anthropic-messages";
      return probeEndpoint({ op: p.op === "provider-models" ? "models" : "test", api, baseURL: p.baseURL, apiKey: p.apiKey, model: p.model });
    }
    if (p.op?.startsWith?.("codex-provider-")) {
      await loadingCodex;
      const codex = codexPrefs();
      if (!codex) throw new Error("Model settings aren’t available.");
      if (p.op === "codex-provider-read") {
        // The provider the user's own config.toml picks (model_provider, not openai or this app's codedesktop): while
        // OpenClaude Desktop's endpoint is OpenAI, that relay is what Codex really talks to, so the page says so.
        const view = codexProviderView();
        if (view.mode === "custom") return view;
        const client = getClient?.();
        if (!client?.serverInfo || typeof client.request !== "function" || coreForEngine(client.serverInfo.engine).id !== "codex") return view;
        const read = await client.request("config/read", { includeLayers: false, cwd: getConfig?.()?.cwd || null }, 5000).catch(() => null);
        const id = typeof read?.config?.model_provider === "string" ? read.config.model_provider : null;
        if (!id || id === "openai" || id === "codedesktop") return view;
        const entry = read.config.model_providers && typeof read.config.model_providers === "object" ? read.config.model_providers[id] : null;
        const baseURL = typeof entry?.base_url === "string" ? entry.base_url : null;
        return { ...view, configProvider: { id, name: typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : id, host: originOf(baseURL)?.replace(/^https?:\/\//, "") ?? null } };
      }
      if (p.op === "codex-provider-save") {
        if (!setCodexLaunch) throw new Error(i18n.t("The Codex endpoint can’t be changed here."));
        const provider = codex.validateCodexProvider({ ...readCodexProvider(), ...(p.provider && typeof p.provider === "object" ? p.provider : {}) });
        const keys = readKeys();
        if (typeof p.apiKey === "string" && p.apiKey.trim()) {
          if (p.apiKey.length > 4096 || /[\x00-\x1f\x7f]/.test(p.apiKey.trim())) throw new Error("Invalid API key.");
          keys[codex.CODEX_KEY_SLOT] = p.apiKey.trim();
        } else if (p.apiKey === null) delete keys[codex.CODEX_KEY_SLOT];
        // A local model server (LM Studio, Ollama on this Mac) needs no key.
        if (provider.mode === "custom" && !keys[codex.CODEX_KEY_SLOT] && !codex.codexLocalEndpoint(provider.baseURL)) throw new Error("Enter the API key.");
        // The key first: a failed key write (no secure storage) changes nothing, and a failed provider.json write
        // puts the previous keys back, so custom mode is never saved without its key.
        const previousKeys = readKeys();
        writeKeys(keys);
        try { writeAtomic(codexProviderFile(), JSON.stringify({ version: 1, ...provider }, null, 2) + "\n", 0o644); }
        catch (error) { try { writeKeys(previousKeys); } catch {} throw error; }
        await refreshCodexLaunch(provider, keys);
        return { ...codexProviderView(provider, keys), pending: true };
      }
      if (p.op === "codex-provider-models" || p.op === "codex-provider-test") {
        const saved = readCodexProvider();
        const baseURL = String(p.baseURL ?? saved.baseURL ?? "").trim().replace(/\/+$/, "");
        const urlError = codex.codexBaseURLError(baseURL);
        if (urlError) throw new Error(urlError);
        // The saved key goes only to the saved endpoint's origin: another host (or scheme) needs its own typed key.
        const typed = typeof p.apiKey === "string" && p.apiKey.trim() ? p.apiKey
          : saved.baseURL && originOf(baseURL) === originOf(saved.baseURL) ? readKeys()[codex.CODEX_KEY_SLOT] : "";
        const model = typeof p.model === "string" && p.model.trim() ? p.model : saved.models[0];
        return probeEndpoint({ op: p.op === "codex-provider-models" ? "models" : "test", api: "openai-responses", baseURL, apiKey: typed, model, keyless: codex.codexLocalEndpoint(baseURL) });
      }
      // Which local model servers are running on this Mac (LM Studio :1234, Ollama :11434), with their models: GET /models
      // on loopback only, no key (the Codex TUI's oss_selection shows the same running / not running).
      if (p.op === "codex-provider-local") {
        const servers = await Promise.all(codex.CODEX_LOCAL_SERVERS.map(async (server) => {
          try { const listed = await probeEndpoint({ op: "models", api: "openai-responses", baseURL: server.baseURL, apiKey: "", keyless: true, timeoutMs: 1500 }); return { ...server, running: true, models: listed.models ?? [] }; }
          catch { return { ...server, running: false, models: [] }; }
        }));
        return { servers };
      }
    }
    if (p.op !== "official-prices") throw new Error("Unsupported model settings operation.");
    const client = getClient();
    if (!client) return { unsupported: true };
    await client.start?.();
    if (!isDeepSeek(client)) return { unsupported: true };
    try {
      const result = await client.request("codeDesktop/pricing/read", {});
      if (!result || typeof result !== "object" || !result.official || typeof result.official !== "object") return { unsupported: true };
      return {
        official: result.official,
        aliases: result.aliases && typeof result.aliases === "object" ? result.aliases : {},
        pricingUrl: typeof result.pricingUrl === "string" ? result.pricingUrl : null,
        peakWindows: typeof result.peakWindows === "string" ? result.peakWindows : null,
      };
    } catch (error) {
      if (error?.code === METHOD_NOT_FOUND) return { unsupported: true };
      throw error;
    }
  }

  // {ids, template} while the Codex launch runs a custom endpoint without a model catalog (model/list then shows the bundled one), else null.
  const codexCustomModels = () => codexLaunchState.custom ? { ids: [...codexLaunchState.custom.ids], template: codexLaunchState.custom.template } : null;
  async function coworkConnection(model) {
    await ready();
    const { coworkProvider } = await import('./cowork-runtime/provider.mjs');
    return coworkProvider({ model: model || getConfig()?.model, providers: readProviders().map(provider => ({ ...provider, keyEnv: prefs().providerKeyEnv(provider.route) })),
      connection: readConnection(), keys: readKeys(), inherited: { ...inherited },
      officialKeySlot: prefs().CONNECTION_KEY_OFFICIAL, relayKeySlot: prefs().CONNECTION_KEY_RELAY, officialBaseURL: prefs().OFFICIAL_BASE_URL });
  }
  return { decorate, decorateThread, run, codexLaunch, codexCustomModels, coworkConnection, ready, dispose: () => relayProxy.stop() };
}

module.exports = { createModelSettings };
