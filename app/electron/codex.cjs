const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const readline = require("node:readline");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { randomUUID } = require("node:crypto");
const { ApprovalLedger } = require("./approval-transport.cjs");
const { proxyEnv, loginShellProxy, loginShellVariables, shellVariables } = require("./proxy-env.cjs");

// This registry contains only processes spawned by this module. A reconnect
// replaces the client object, so keeping just the latest client loses children
// that are still in their SIGTERM grace period.
const liveClients = new Set();
let shuttingDown = false;
let shutdownPromise = null;
let nextApprovalConnectionEpoch = 0;
const duration = (value, fallback) => Number.isFinite(value) && value >= 0 ? value : fallback;

// The agent core behind the Codex app-server protocol. DeepSeek (default) is
// the DeepSeek Harness bridge in ../../harness, a Node script serving the
// same `app-server --stdio` contract; CODE_DESKTOP_CORE=codex selects the
// installed Codex CLI instead.
const firstExisting = (candidates) => candidates.filter(Boolean).find((p) => fs.existsSync(p));
function deepseekCoreScript() {
  return firstExisting([
    process.env.CODE_DESKTOP_DEEPSEEK_CORE,
    process.resourcesPath && path.join(process.resourcesPath, "harness/bin/codex-app-server.mjs"),
    path.resolve(__dirname, "../../harness/bin/codex-app-server.mjs"),
    path.join(os.homedir(), "claude-ui-lab/harness/bin/codex-app-server.mjs"),
  ]);
}
function nodeBinary() {
  return firstExisting([process.env.CODE_DESKTOP_NODE, "/opt/homebrew/bin/node", "/usr/local/bin/node", path.join(os.homedir(), ".local/bin/node")]) || "node";
}
// Settings › Cores (core-manager.cjs): the chosen core and each agent program found (this app's download, or
// the user's own install). The environment (CODE_DESKTOP_CORE, CODEX_BINARY) still wins.
const { coreById, coreForEngine, coreAssistant } = require("./core-registry.mjs");
// Error copy goes through the same i18n as the renderer (one module instance: main.cjs imports it too), so it
// follows the UI language and names the core it is about, never a hardcoded vendor.
const i18n = require("./i18n/index.mjs");
let coreChoice = { core: null, agents: {} };
function setCoreChoice(choice = {}) {
  const agents = choice.agents && typeof choice.agents === "object" ? choice.agents : {};
  // codexPath: the earlier single-agent shape.
  if (typeof choice.codexPath === "string" && !agents.codex) agents.codex = { path: choice.codexPath };
  coreChoice = { core: typeof choice.core === "string" ? choice.core : null, agents };
}
// Settings › Models on Codex (model-settings.cjs): the `-c` overrides after `app-server --stdio` and the
// environment of the Codex child only ({args, env}, or a function returning it at each spawn). An undefined
// env value removes an inherited variable (the DeepSeek keys never reach Codex). CODEX_BINARY bypasses it.
let codexLaunch = { args: [], env: {} };
function setCodexLaunch(launch) { codexLaunch = typeof launch === "function" || (launch && typeof launch === "object") ? launch : { args: [], env: {} }; }
// OpenClaude Desktop's own MCP server (agent-tools-host.cjs) for the app's sessions: its `-c mcp_servers.code_desktop.*`
// overrides for a Codex child, and the variables every core gets (the bridges and the DeepSeek core start the server
// per session from CODE_DESKTOP_AGENT_TOOLS_SERVER). Never written to ~/.codex/config.toml.
let agentToolsLaunch = null;
function setAgentToolsLaunch(launch) { agentToolsLaunch = typeof launch === "function" ? launch : null; }
// Awaited by every CodexClient.start() before it resolves the core (main.cjs: Settings › Models' launch is prepared —
// the provider keys exported, a saved Codex custom endpoint's -c args in place). Whichever caller starts the core
// first (the Home stats card, an account read, connect()), it never spawns with an unprepared launch.
let beforeSpawnHook = null;
function setBeforeSpawn(hook) { beforeSpawnHook = typeof hook === "function" ? hook : null; }
// Code › Local › "Edit local environment" (local-environment.cjs launchEnv): the user's variables every core spawn gets,
// after the inherited, proxy and shell variables and before the app's own (agent tools, the core's launch), so they
// never replace what the app sets. A spawn with an explicit binary (a fixture client) gets none.
let localEnvironmentLaunch = null;
function setLocalEnvironment(launch) { localEnvironmentLaunch = typeof launch === "function" ? launch : null; }
function currentLocalEnvironment() {
  let env;
  try { env = localEnvironmentLaunch?.() ?? null; } catch { env = null; }
  return env && typeof env === "object" ? Object.fromEntries(Object.entries(env).filter(([, value]) => typeof value === "string")) : {};
}
// core kind → the PATH, proxy and shell variables its last session spawn got (from the login-shell read), for
// workflowCoreEnv: a workflow run's core spawns from the runner, apart from the session client.
const launchedBaseEnv = new Map();
/**
 * What a core spawn gets beyond process.env and its own launch, as connect() builds it: PATH, the login shell's proxy
 * variables (with NODE_USE_ENV_PROXY), the core's shell variables (Gemini's Vertex settings…) and the user's local
 * environment. A core no session started yet gets the PATH and the proxy variables of the app's own environment.
 */
function workflowCoreEnv(kind) {
  const base = launchedBaseEnv.get(kind) ?? {
    PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].filter(Boolean).join(":"),
    ...proxyEnv(process.env, {}),
  };
  return { ...base, ...currentLocalEnvironment() };
}
function currentAgentTools(kind) {
  let launch = null;
  try { launch = agentToolsLaunch?.() ?? null; } catch { launch = null; }
  const env = launch?.env && typeof launch.env === "object" ? launch.env : {};
  const args = kind === "codex" && Array.isArray(launch?.codexArgs) ? launch.codexArgs.filter((arg) => typeof arg === "string") : [];
  return { args, env };
}
function currentCodexLaunch() {
  let launch;
  try { launch = typeof codexLaunch === "function" ? codexLaunch() : codexLaunch; } catch { launch = null; }
  return { args: Array.isArray(launch?.args) ? launch.args.filter((arg) => typeof arg === "string") : [], env: launch?.env && typeof launch.env === "object" ? launch.env : {} };
}
/**
 * The environment a core that isn't OpenClaude Desktop's own adapter must not inherit (a native Extension Pack's agent,
 * and its workflow runs): the DeepSeek connection (DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL, an official or relay key),
 * every custom provider's key (CODE_DESKTOP_PROVIDER_KEY_*, prefs/model-settings.mjs providerKeyEnv) and the Codex
 * endpoint key, plus every variable the Codex launch sets or removes (model-settings.cjs codexBlankEnv: all
 * Harness-managed keys). Undefined drops an inherited variable at spawn.
 */
function foreignCoreEnv() {
  const blank = { DEEPSEEK_API_KEY: undefined, DEEPSEEK_BASE_URL: undefined };
  let providerPrefix = null, codexKey = null;
  try { providerPrefix = require("./prefs/model-settings.mjs").providerKeyEnv(""); } catch {}
  try { codexKey = require("./prefs/codex-provider.mjs").CODEX_KEY_ENV; } catch {}
  if (codexKey) blank[codexKey] = undefined;
  if (providerPrefix) for (const key of Object.keys(process.env)) if (key.startsWith(providerPrefix)) blank[key] = undefined;
  for (const key of Object.keys(currentCodexLaunch().env)) blank[key] = undefined;
  return blank;
}
function chosenCore() {
  const core = coreById(process.env.CODE_DESKTOP_CORE || coreChoice.core);
  return core && core.kind !== "builtin" ? core : coreById("deepseek");
}
function coreKind() {
  return chosenCore().id;
}
/** A bridge core's adapter script: in the packaged resources or the OpenClaude Desktop repository. */
function bridgeScript(core) {
  // An Extension Pack's bridge: an absolute path inside the installed pack (extension-packs.cjs).
  if (typeof core?.bridge?.path === "string") return fs.existsSync(core.bridge.path) ? core.bridge.path : null;
  const relative = core?.bridge?.script;
  if (typeof relative !== "string") return null;
  return firstExisting([
    process.resourcesPath && path.join(process.resourcesPath, relative),
    path.resolve(__dirname, "../..", relative),
    path.join(os.homedir(), "claude-ui-lab", relative),
  ]);
}
// The shell variables a core's descriptor declares (shellEnv), for the core this spawn runs (resolveCore kind = its id).
function coreShellEnv(kind) {
  const names = typeof kind === "string" ? coreById(kind)?.shellEnv : null;
  return Array.isArray(names) ? names.filter((name) => typeof name === "string") : [];
}
function resolveCore() {
  // An explicit CODEX_BINARY (tests' fixture servers, or a user override)
  // always wins over the default core.
  if (process.env.CODEX_BINARY) return { command: process.env.CODEX_BINARY, prefix: [], kind: "override" };
  const core = chosenCore();
  if (core.kind === "builtin") {
    const script = deepseekCoreScript();
    if (script) return { command: nodeBinary(), prefix: [script], kind: "deepseek" };
  }
  if (core.kind === "bridge") {
    // The adapter runs on Node and starts the agent program it is told about (CODE_DESKTOP_AGENT_*).
    const agent = coreChoice.agents[core.id] ?? {};
    return { command: nodeBinary(), prefix: [bridgeScript(core) || core.bridge.script], kind: core.id,
      env: { CODE_DESKTOP_CORE_ID: core.id, ...(process.env.CODE_DESKTOP_DATA_DIR ? { CODE_DESKTOP_PROVIDERS_FILE: path.join(process.env.CODE_DESKTOP_DATA_DIR, "harness/providers.json") } : {}), CODE_DESKTOP_AGENT_BINARY: agent.path ?? "", CODE_DESKTOP_AGENT_RUNNER: agent.runner ?? "", CODE_DESKTOP_AGENT_VERSION: agent.version ?? "", CODE_DESKTOP_BRIDGE_STATE: agent.state ?? "", CODE_DESKTOP_NODE_BINARY: nodeBinary() } };
  }
  if (core.kind === "native" && core.id !== "codex") return nativeCore(core);
  const launch = currentCodexLaunch();
  return { command: codexBinary() || "codex", prefix: [], kind: "codex", args: [...launch.args], env: { ...launch.env } };
}
/**
 * A native Extension Pack core (extension-packs.cjs kind "native"): its own agent program speaks the Codex
 * app-server protocol itself. It runs the program Settings › Cores found (agents[id]: this app's download or the
 * user's install; runner "node" runs a script on Node), else descriptor agent.binary from PATH. Its server
 * arguments are descriptor agent.args (default `app-server --stdio`). Never Codex's binary, `-c` overrides or env,
 * and never the saved API keys (foreignCoreEnv): a third-party program gets the blanked environment Codex gets.
 */
const AGENT_ARG = /^[\x21-\x7e][\x20-\x7e]{0,199}$/;
function nativeCore(core) {
  const agent = coreChoice.agents[core.id] ?? {};
  const program = typeof agent.path === "string" && agent.path ? agent.path : String(core.agent?.binary || core.id);
  const listed = Array.isArray(core.agent?.args) ? core.agent.args.filter((arg) => typeof arg === "string" && AGENT_ARG.test(arg)).slice(0, 16) : null;
  const serverArgs = listed && listed.length ? listed : ["app-server", "--stdio"];
  const env = { ...foreignCoreEnv(), CODE_DESKTOP_CORE_ID: core.id };
  return agent.runner === "node"
    ? { command: nodeBinary(), prefix: [program], kind: core.id, serverArgs, env }
    : { command: program, prefix: [], kind: core.id, serverArgs, env };
}
/**
 * How copy names the core a client runs (its descriptor's assistant, as the renderer's "Connection to … lost."
 * and every t() string do): its initialize engine report, else the core it spawned, else the chosen core (an
 * override binary that reports no engine). Works for plain owner objects too (tests).
 */
function clientCoreName(client) {
  if (client?.serverInfo && typeof client.serverInfo.engine === "string" && client.serverInfo.engine)
    return coreAssistant(coreForEngine(client.serverInfo.engine));
  const spawned = typeof client?.spawnedCore === "string" ? coreById(client.spawnedCore) : null;
  return coreAssistant(spawned || chosenCore());
}
/**
 * The initialize result as this app keys on it: an engine-less report from a core this client spawned that isn't
 * Codex (a native Extension Pack speaking the Codex protocol, whose app-server, like Codex's, need not report one)
 * names that core's engine, so boot.core, implied capabilities, the model reconcile, Settings and Storage all treat
 * it as itself, never as Codex. A Codex child, an override binary or a fixture (spawnedCore null) is left as is.
 */
function reportedServerInfo(result, spawnedCore) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  if (typeof result.engine === "string" && result.engine) return result;
  const spawned = typeof spawnedCore === "string" ? coreById(spawnedCore) : null;
  if (!spawned || spawned.id === "codex") return result;
  const engine = typeof spawned.engine === "string" && spawned.engine && coreForEngine(spawned.engine).id === spawned.id ? spawned.engine : spawned.id;
  return { ...result, engine };
}
/** A user-facing Error from an English t() source with a {core} placeholder naming the client's core. */
function coreError(client, source, values) {
  return new Error(i18n.t(source, { ...values, core: clientCoreName(client) }));
}
/** The Codex program the Codex core runs (this app's download, else the user's install), whichever core is chosen; null if none. */
function codexBinary() {
  // CODE_DESKTOP_CORE_SYSTEM_PATHS ("" for none) replaces the user-install fallbacks (core-manager.cjs).
  const system = process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS !== undefined ? process.env.CODE_DESKTOP_CORE_SYSTEM_PATHS.split(":").filter(Boolean)
    : [path.join(os.homedir(), ".local/bin/codex"), "/opt/homebrew/bin/codex", "/usr/local/bin/codex"];
  return firstExisting([coreChoice.agents.codex?.path, ...system]) || null;
}

// The last meaningful stderr line, without URL queries or anything key-like, at most 300 characters.
function stderrReason(tail) {
  // eslint-disable-next-line no-control-regex
  const lines = String(tail || "").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const line = lines.at(-1);
  if (!line) return "";
  return line.replace(/(https?:\/\/[^\s?#"']*)[?#][^\s"']*/g, "$1")
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{6,}/g, "[redacted]")
    .replace(/\b(Bearer|api[_-]?key|token|secret|password)(\s*[:=]\s*|\s+)\S+/gi, "$1$2[redacted]")
    .slice(0, 300);
}

class CodexClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.seq = 0;
    this.pending = new Map();
    this.approvalLedger = new ApprovalLedger((event) => this.emit("event", event));
    this.approvals = this.approvalLedger.pending;
    this.ready = null;
    this.child = null;
    this.connection = null;
    this.connections = new Set();
    this.stopPromise = null;
    this.stopping = false;
  }

  start() {
    if (shuttingDown) return Promise.reject(coreError(this, "{core} is shutting down."));
    if (this.ready) return this.ready;
    this.stopping = false;
    this.stopPromise = null;
    const connection = { approvalConnectionId: randomUUID(), approvalConnectionEpoch: ++nextApprovalConnectionEpoch, child: null, reader: null, closed: false, settled: false, terminating: false, forced: false };
    connection.exited = new Promise((resolve) => { connection.resolveExit = resolve; });
    this.connections.add(connection);
    liveClients.add(this);
    this.connection = connection;
    // Publish the shared promise before spawning. Stop/restart may happen while
    // initialize is pending, so every callback belongs to this connection only.
    this.ready = Promise.resolve().then(async () => {
      if (this.connection !== connection) throw coreError(this, "{core} stopped.");
      this.approvalLedger.activate(connection);
      if (this.connection !== connection) throw coreError(this, "{core} stopped.");
      if (!this.options.binary && beforeSpawnHook) {
        try { await beforeSpawnHook(); } catch (error) { console.warn("Core launch preparation failed:", error?.message ?? error); }
        if (this.connection !== connection) throw coreError(this, "{core} stopped.");
      }
      const core = this.options.binary ? { command: this.options.binary, prefix: [] } : resolveCore();
      // The core this connection runs, for error copy before initialize names it (an override names none).
      this.spawnedCore = this.options.binary || core.kind === "override" ? null : core.kind;
      const binary = core.command;
      const tools = this.options.binary ? { args: [], env: {} } : currentAgentTools(core.kind);
      const args = [...core.prefix, ...(core.serverArgs || ["app-server", "--stdio"]), ...(core.args || []), ...tools.args, ...(this.options.args || [])];
      // The login shell's proxy variables (proxy-env.cjs): a Finder launch lacks them, so the agent's commands
      // would skip the proxy they use in Terminal. Not read for an explicit binary or CODEX_BINARY (fixture
      // servers must not run the user's rc files); options.shellProxy supplies them instead.
      const readShell = typeof this.options.shellProxy === "function" ? this.options.shellProxy
        : this.options.binary || core.kind === "override" ? null : loginShellProxy;
      const shellProxy = readShell ? await Promise.resolve().then(readShell).catch(() => ({})) : {};
      // The variables the core's agent reads from the user's shell (descriptor shellEnv: Gemini's GEMINI_API_KEY,
      // GOOGLE_CLOUD_PROJECT…), from the same login-shell read; Electron's own environment wins. Same gate as the proxy;
      // options.shellEnv supplies them for a fixture.
      const names = coreShellEnv(core.kind);
      const readVariables = typeof this.options.shellEnv === "function" ? this.options.shellEnv
        : readShell === loginShellProxy && names.length ? () => loginShellVariables(names) : null;
      const shellEnv = readVariables ? await Promise.resolve().then(readVariables).catch(() => ({})) : {};
      if (this.connection !== connection) throw coreError(this, "{core} stopped.");
      const base = {
        PATH: [path.join(os.homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH]
          .filter(Boolean).join(":"),
        ...proxyEnv(process.env, shellProxy),
        ...shellVariables(process.env, shellEnv, names.length ? names : Object.keys(shellEnv ?? {})),
      };
      if (!this.options.binary) launchedBaseEnv.set(core.kind, base);
      const env = {
        ...process.env,
        ...base,
        ...(this.options.binary ? {} : currentLocalEnvironment()),
        ...tools.env,
        ...core.env,
        ...this.options.env,
      };
      const child = spawn(binary, args, {
        env,
        stdio: ["pipe", "pipe", "pipe"],
        // App-server initialization must not enter a selected Documents/iCloud
        // workspace. Actual thread/turn cwd is explicitly carried by the RPCs.
        cwd: this.options.serverCwd || os.homedir(),
      });
      connection.child = child;
      this.child = child;
      child.on("error", (error) => this.disconnect(connection, error));
      child.on("exit", (code, signal) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          const reason = connection.initialized ? "" : stderrReason(connection.stderrTail);
          this.disconnect(connection, coreError(this, "{core} disconnected ({code}). {reason}Reconnect to continue.", { code: signal || code, reason: reason ? `${reason} ` : "" }), false);
          this.settleConnection(connection, { exited: true, code, signal });
        };
        // Before initialize, the reason may still be in the pipe: wait briefly for stderr to close.
        if (connection.initialized || child.stderr.destroyed || child.stderr.readableEnded) return finish();
        const timer = setTimeout(finish, 200);
        child.stderr.once("close", () => { clearTimeout(timer); finish(); });
      });
      child.stdin.on("error", (error) => this.disconnect(connection, error));
      child.stdout.on("error", (error) => this.disconnect(connection, error));
      child.stderr.on("error", (error) => this.disconnect(connection, error));
      // Never forward stderr/config/credentials into renderer logs. A short tail is kept so an exit
      // before initialize (a rejected provider config) can name its reason: one sanitized line.
      connection.stderrTail = "";
      child.stderr.on("data", (chunk) => { connection.stderrTail = (connection.stderrTail + chunk).slice(-2048); });
      connection.reader = readline.createInterface({ input: child.stdout });
      connection.reader.on("line", (line) => {
        if (this.connection !== connection || connection.closed) return;
        try {
          this.receive(JSON.parse(line), connection);
        } catch (error) {
          this.emit("protocolError", error.message);
        }
      });
      const result = await this.request("initialize", {
        clientInfo: {
          name: "code_desktop_local",
          title: "OpenClaude Desktop",
          version: require("../package.json").version,
        },
        capabilities: { experimentalApi: true },
      }, this.options.initializeTimeout ?? 30000, connection);
      if (this.connection !== connection) throw coreError(this, "{core} stopped.");
      connection.initialized = true;
      this.serverInfo = reportedServerInfo(result, this.spawnedCore);
      this.send({ method: "initialized", params: {} }, connection);
      this.emit("status", { connected: true });
      return this.serverInfo;
    }).catch((error) => {
      this.disconnect(connection, error);
      throw error;
    });
    return this.ready;
  }

  receive(message, connection = this.connection) {
    if (!connection || this.connection !== connection || connection.closed) return;
    if (message.method) {
      if (message.id !== undefined) {
        try { this.approvalLedger.register(message, connection); }
        catch (error) { this.disconnect(connection, error); }
      } else {
        if (message.method === "serverRequest/resolved") {
          try { this.approvalLedger.resolveFromServer(message.params, connection); }
          catch (error) { this.disconnect(connection, error); }
          return; // Only normalized, identity-qualified approval events reach UI.
        }
        if (message.method === "turn/completed") this.approvalLedger.expireTurn(message.params, connection);
        this.emit("event", { ...message, kind: "notification" });
      }
      return;
    }
    const pending = this.pending.get(String(message.id));
    if (!pending || pending.connection !== connection) return;
    this.pending.delete(String(message.id));
    clearTimeout(pending.timer);
    if (message.error) {
      // Keep the JSON-RPC error code/data (e.g. CodexErrorInfo
      // activeTurnNotSteerable) for callers that branch on them.
      const error = new Error(message.error.message || JSON.stringify(message.error));
      error.code = message.error.code;
      error.data = message.error.data;
      pending.reject(error);
    } else pending.resolve(message.result);
  }

  send(message, connection = this.connection) {
    if (!connection || this.connection !== connection || connection.closed || !connection.child?.stdin.writable)
      throw coreError(this, "{core} is not connected.");
    connection.child.stdin.write(JSON.stringify(message) + "\n");
  }

  request(method, params = {}, timeout = 120000, connection = this.connection) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(String(id));
        reject(new Error(`${method} timed out.`));
      }, timeout);
      this.pending.set(String(id), { resolve, reject, timer, connection });
      try {
        this.send({ id, method, params }, connection);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(String(id));
        reject(error);
      }
    });
  }

  approvalSnapshot() {
    return this.approvalLedger.snapshot();
  }

  getApproval(id, expected) {
    return this.approvalLedger.requirePending(id, expected).event;
  }

  invalidateApprovals(reason = "reconnect") {
    return this.approvalLedger.invalidate(this.connection, reason);
  }

  /**
   * An approval of the app's own (OpenClaude Desktop's agent tools: a terminal command, an outside site, a dev server, a
   * workflow): shown and answered like the core's own requests — the in-transcript card of the session that asks, in
   * every window and split side that shows it, the sidebar marking it — but answered here, never on the wire.
   * Resolves with the card's result ({decision, …}), or null when it ended otherwise (the signal, the connection);
   * undefined when there is no connection to show it on (the caller asks another way).
   * outlivesTurn: the call may belong to work that goes on after the session's turn ends (a sub-agent, a background
   * agent), so that turn's end doesn't expire the card; the caller's signal still closes it.
   */
  localApproval(method, params, { signal, outlivesTurn = false } = {}) {
    const connection = this.connection;
    if (!connection || connection.closed || signal?.aborted) return Promise.resolve(signal?.aborted ? null : undefined);
    const id = `code-desktop-${require("node:crypto").randomUUID()}`;
    return new Promise((resolve) => {
      let entry;
      const done = (result) => { signal?.removeEventListener?.("abort", abort); resolve(result ?? null); };
      const abort = () => { if (entry && !this.approvalLedger.resolve(entry, "cancelled")) done(null); };
      try { entry = this.approvalLedger.register({ id, method, params }, connection); }
      catch { resolve(undefined); return; }
      entry.local = true;
      if (outlivesTurn) entry.outlivesTurn = true;
      entry.onSettle = done;
      signal?.addEventListener?.("abort", abort, { once: true });
    });
  }

  respond(id, result, expected) {
    const entry = this.approvalLedger.requirePending(id, expected);
    if (entry.local) {
      this.approvalLedger.begin(entry);
      this.approvalLedger.resolve(entry, "responded", result);
      return { ...entry.identity };
    }
    const response = { id: entry.request.id, result };
    // Preflight before locking; a serialization error must retain the draft.
    JSON.stringify(response);
    this.approvalLedger.begin(entry);
    try { this.send(response, entry.connection); }
    catch (error) { this.approvalLedger.release(entry); throw error; }
    this.approvalLedger.resolve(entry, "responded");
    return { ...entry.identity };
  }

  settleConnection(connection, result) {
    if (result.exited) {
      this.connections.delete(connection);
      if (!this.connections.size) liveClients.delete(this);
    }
    if (connection.settled) return;
    connection.settled = true;
    clearTimeout(connection.killTimer);
    clearTimeout(connection.deadlineTimer);
    connection.reader?.close();
    // Waiting for child 'exit', rather than stdio 'close', also handles a
    // descendant that inherited a pipe. We only signal our direct child.
    connection.child?.stdin.destroy();
    connection.child?.stdout.destroy();
    connection.child?.stderr.destroy();
    if (!result.exited) connection.child?.unref();
    connection.resolveExit({
      pid: connection.child?.pid ?? null,
      forced: connection.forced,
      timedOut: false,
      ...result,
    });
  }

  terminate(connection) {
    if (!connection) return Promise.resolve({ pid: null, exited: true, forced: false, timedOut: false });
    const child = connection.child;
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
      this.settleConnection(connection, { exited: true, code: child?.exitCode ?? null, signal: child?.signalCode ?? null });
      return connection.exited;
    }
    if (connection.terminating) return connection.exited;
    connection.terminating = true;
    const hardTimeout = duration(this.options.shutdownHardTimeout, 2500);
    const grace = Math.min(duration(this.options.shutdownTimeout, 1000), Math.max(0, hardTimeout - 1));
    const signal = (name) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill(name); } catch (error) { connection.killError = error.message; }
    };
    // A stuck app-server may not process SIGTERM; bound cleanup without ever
    // referring to this.child, which may already be a replacement process.
    connection.killTimer = setTimeout(() => {
      connection.forced = true;
      signal("SIGKILL");
    }, grace);
    connection.deadlineTimer = setTimeout(() => {
      connection.forced = true;
      signal("SIGKILL");
      this.settleConnection(connection, {
        exited: child.exitCode !== null || child.signalCode !== null,
        timedOut: child.exitCode === null && child.signalCode === null,
        ...(connection.killError ? { error: connection.killError } : {}),
      });
    }, hardTimeout);
    // Keep both timers referenced. Electron additionally defers app.quit until
    // stopAndWait settles; an unref timer cannot guarantee final escalation.
    signal("SIGTERM");
    return connection.exited;
  }

  disconnect(connection, error, terminate = true, notify = true) {
    if (!connection || connection.closed) return;
    connection.closed = true;
    connection.reader?.close();
    const active = this.connection === connection;
    if (active) {
      // Detach before rejecting promises/emitting status; their handlers may
      // immediately call start() and must receive an independent connection.
      this.connection = null;
      this.child = null;
      this.ready = null;
      for (const [id, pending] of this.pending) {
        if (pending.connection !== connection) continue;
        clearTimeout(pending.timer);
        this.pending.delete(id);
        pending.reject(error);
      }
      this.approvalLedger.invalidate(connection, "disconnected");
    }
    if (terminate) this.terminate(connection);
    if (active && notify) this.emit("status", { connected: false, error: error.message });
  }

  fail(error) {
    this.disconnect(this.connection, error);
  }

  stop() {
    this.stopping = true;
    this.disconnect(this.connection, coreError(this, "{core} stopped."), true, false);
  }

  stopAndWait() {
    this.stop();
    if (this.stopPromise) return this.stopPromise;
    // Snapshot only the connections present at this stop. A subsequent start
    // is independent and must not be killed by a previous stop's callbacks.
    const pending = [...this.connections].map((connection) => this.terminate(connection));
    this.stopPromise = Promise.all(pending).then((children) => ({
      exited: children.every((child) => child.exited),
      children,
    }));
    return this.stopPromise;
  }
}

function stopAllCodexClients() {
  if (shutdownPromise) return shutdownPromise;
  shuttingDown = true;
  shutdownPromise = Promise.all([...liveClients].map((client) => client.stopAndWait())).then((results) => {
    const children = results.flatMap((result) => result.children);
    return { exited: children.every((child) => child.exited), children };
  });
  return shutdownPromise;
}
module.exports = { CodexClient, stopAllCodexClients, resolveCore, coreKind, clientCoreName, reportedServerInfo, coreError, setCoreChoice, setCodexLaunch, codexBinary, stderrReason, deepseekCoreScript, bridgeScript, nodeBinary, setAgentToolsLaunch, setBeforeSpawn, setLocalEnvironment, foreignCoreEnv, workflowCoreEnv };
