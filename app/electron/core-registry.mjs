// The agent cores OpenClaude Desktop can run. OpenClaude Desktop is the frame; a core is the
// agent behind it, speaking the Codex app-server protocol (`app-server --stdio`)
// natively (Codex) or through an adapter: the built-in DeepSeek Harness bridge,
// or a bridge script in harness/packages/<bridge> that drives an official
// open-source agent (ZCode, OpenCode, the ACP agents). Agent programs ship as
// official releases, downloaded on demand into the app's data folder
// (core-manager.cjs) or used where the user installed them.
//
// One descriptor per core in electron/cores/<id>.mjs. kind: "builtin" (DeepSeek
// Harness), "native" (the agent speaks the protocol: Codex), "bridge" (adapter
// script + agent program). A core with available: false is still being adapted
// and is not offered in Settings › Cores.
//
// The app keys optional features on capabilities, never on which core runs. A
// core reports `engine` and `capabilities` in its initialize result (main.cjs
// coreInfo); `implies` are the capabilities a known engine has without listing
// them; anything reported wins. Capabilities read by the app besides the
// bridge-reported ones (livePermissions, codeStats, pluginManage, toolSelection,
// modelWorkflows, unsupportedMethods, skillToggle, mcpConfigWrite, coreCommands,
// priceOverrides, backgroundTerminals):
//   customization       thread/turn params carry codeDesktop.customization (system prompt, instructions,
//                       model params); without it the app sends developerInstructions instead.
//   modelParams         customization.modelParams (max output tokens, temperature) reach the model; when
//                       undeclared it follows customization (prefs/model-settings.mjs coreTakesModelParams).
//   permissionHints     thread/turn params carry codeDesktop.permissionMode / afterPlan, and an approved
//                       plan switches the session to the chosen mode.
//   collaborationModes  turn/start takes collaborationMode (Plan); undeclared, main.cjs asks collaborationMode/list once.
//   structuredOutput    turn/start outputSchema is honored (OpenClaude Desktop's /workflow runner needs it).
//   modelWorkflows      the core has its own dynamic-workflow engine; its runs come back as item.workflowRun and
//                       stop through codeDesktop/workflow/stop. /workflow and Settings' Dynamic workflows are never
//                       hidden from such a core (session-command-model workflowsSupported / workflowEngine).
//   workflowScripts     /workflow's launcher script runs on that engine (codeDesktop/workflow/startScript); without
//                       it a core with modelWorkflows starts the run through its model.
//   workflowsNeedBypass (retired) ZCode once ran its workflows only in Bypass; its bridge now asks once per run instead.
//   sideQuestion      codeDesktop/sideQuestion serves /btw (an OpenClaude Desktop extension: Codex itself rejects it).
//   fileMentions        a {type: "mention"} input item with a local file path reaches the model; undeclared,
//                       builtin and bridge cores have it and native ones don't (composer-attachments-model.mjs).
//   systemPromptPreview codeDesktop/systemPrompt/preview.
//   harnessProfile      Settings › Harness edits the core's profile overlays (DeepSeek Harness only).
//   providerSettings    Settings › Models API connection, custom providers and prices.
//   codexProvider       Settings › Models Codex endpoint (OpenAI or a custom Responses endpoint).
//   deleteHistory       deleting a session also deletes the core's own history.
//   unloadOnNavigate    leaving an idle session unsubscribes it (thread/unsubscribe).
//   perTokenBilling     usage is billed per token, with no plan limits to meter.
//   sandbox             false or "none": approved commands run unconfined (no Seatbelt); a mechanism name
//                       ("seatbelt") when they are confined. Also a descriptor field (coreSandboxed).
//   reviewReadOnly      what review/start may do (the Review dialog's note): "sandbox" (Codex: a read-only sandbox with no
//                       approval prompts), "noEdits" (the bridge runs the review turn read-only); absent, the review runs
//                       with the session's own permission mode.
//   compactInstructions /compact [instructions] reaches the core (thread/compact/start codeDesktop.instructions).
//   generatesTitles     the agent names its sessions (thread/name/updated): a new session gets no first-message
//                       thread/name/set, so the core's own title is not suppressed (the sidebar shows the preview meanwhile).
//   coreSettingsInConfig false: the core's Settings › Code settings (coreSettings) are kept by OpenClaude Desktop, not in the
//                       agent's config file (ZCode's host preferences), so Developer › Local engine doesn't say otherwise.
//   titleRequest        codeDesktop/threadTitle titles a new session from its first message (Codex: main.cjs runs the
//                       TUI's hidden structured title turn, native-thread-title.cjs); the first-message name stays the
//                       session's name until the title arrives, and a name the user gives meanwhile wins.
//   sandboxNetwork      "policy": sandboxed commands get network only when the turn's sandboxPolicy.networkAccess
//                       allows it (Settings › Code › Sandbox network access); "always": the sandbox never blocks
//                       network, so that switch changes nothing on this core.
//   forkAtTurn          thread/fork honours lastTurnId ('Fork from here'); false: whole conversations only (MiniMax).
//   forkCwd             thread/fork honours cwd (/cd); false: the core keeps a session in its folder.
//   moveCwd             codeDesktop/thread/move: /cd moves the session itself to another folder of its project (OpenCode's /move).
//   references          codeDesktop/references/list serves the core's named references (OpenCode `references`: repos and
//                       folders outside the project), offered in the composer's @ menu as '@name'.
//   hooksList           hooks/list lists the agent's lifecycle hooks: Settings › Customize › Hooks shows them (a native
//                       core can trust them and switch them, config.toml hooks.state).
//   mentionTargets      codeDesktop/mentions/list names what the agent's @ reads besides files (Qwen's @mcp:<server> /
//                       @ext:<name>): the composer's @ menu inserts them as text.
//   sessionMentions     a prompt may name another session of the core as '[#title](#id)' (ZCode's # mentions): the @ menu
//                       lists this folder's other sessions.
//   harnessSettings     codeDesktop/settings/read|write: DeepSeek's shell, agent loop, sub-agent and web search fields
//                       (Settings › Code › DeepSeek settings).
//   btwChildSessions    /btw forks a side session (thread/fork, thread/name/set, thread/archive): 2.42304.0's side-chat
//                       pane (btw-sessions.cjs); without it /btw opens the sideQuestion panel. Codex has it implied.
//   sessionLogExport    codeDesktop/sessionLog/export writes the session log ZIP (sub-agents and attachments included):
//                       /export's save dialog offers it beside the Markdown transcript.
//   threadSearch        thread/search searches what was said in every session (Codex): sidebar search and Resume a
//                       session find conversations, not only titles.
//   appsDirectory       app/list lists the account's ChatGPT Apps (Codex /apps): Customize › Connectors › Apps.
//   shellCommands       thread/shellCommand runs a composer draft that starts with '!' as the user's own shell command
//                       (Codex's bash mode), instead of a prompt.
//   configOverlay       OpenClaude Desktop keeps its config changes in its own overlay beside the agent's config (OpenCode,
//                       MiMo), so the user's own configFile is never rewritten (Developer › Local engine says so).
//   nativeTools         the Claude Code tools the agent already has under its own names (AskUserQuestion, SendUserFile,
//                       CronCreate, Monitor, ReportFindings, NotebookEdit, …): OpenClaude Desktop's agent-tools server serves a
//                       tool standing in for one of them (its module's `native`) only to a core that lacks it, so no agent
//                       sees two of the same (main.cjs agentToolServedToCore). A list; absent means none.
//   deferAppTools       the core sends every MCP tool definition with each model request (no tool search of its own)
//                       and reads the list again on tools/list_changed (DeepSeek, OpenCode, MiMo): OpenClaude Desktop's long,
//                       rarely used tool groups (Workflow, Monitor, CronCreate, ReportFindings, NotebookEdit) wait behind
//                       its load_tools tool (main.cjs agentToolsDeferred).
//   backgroundAgents    the agent's sub-agents and workflow agents can go on after the turn that started them ends, and
//                       make their OpenClaude Desktop tool calls as the session without naming their own thread: a normal turn
//                       end then cancels none of the session's tool calls, only a stopped turn does. Undeclared: every
//                       core but a native one (Codex names the calling thread on each call; main.cjs coreKeepsBackgroundAgents).
//   workflowToolSwitches  {Claude tool → the agent's own tool ids}: a workflow agent's opts.disallowedTools / agentType
//                       allowlist turns those off through thread/start codeDesktop.tools.disabled (runner toolNarrowing.js).
//   workflowMcpSwitches the bridge honours thread/start config mcp_servers.<name>.enabled / .disabled_tools as Codex does,
//                       so a workflow agent's mcp__… exclusions apply there too (OpenCode, MiMo).
//   workflowArtifacts   codeDesktop/workflow/artifact reads a run's published deliverables (item.workflowRun.artifacts:
//                       ZCode's artifact.*); the run card lists them, primary first, and opens their content.
//   workflowRunSettings codeDesktop/workflow/settings changes a running run's sub-agent model and agent limit (the run card's
//                       Configure: ZCode's amendWorkflowRunSettings).
//   savedWorkflows      codeDesktop/workflows/list|get|delete|runs serve the agent's own saved-workflow library (ZCode's
//                       .zcode/workflows): the '/' menu and Settings › Dynamic workflows list it while its own engine runs.
//   agentsWrite         codeDesktop/agents/write|remove create and delete the agent's own agent files (OpenCode, MiMo):
//                       Customize › Agents' Create agent.
//
// Other optional descriptor fields the app reads:
//   login               the core's own sign-in options (Settings › Account, setup's Sign in step): browser
//                       [{provider?, type?, label, deviceCode?: true}] (deviceCode: the same provider also signs in
//                       headless with a code), deviceCode [{type, provider?, label}], apiKey [{template?, label,
//                       keyUrl?, keyPlaceholder?, keyPrefix?}] (the key field shows keyPlaceholder, else the label; keyPrefix:
//                       the prefix(es) this key type's keys start with, so a key that fits another option better is
//                       refused with that option named, account-operations keyTypeMismatch), store (the folder whose credentials account/logout removes), signOutRemovesKeys
//                       (account/logout also deletes saved API keys). No login, or one with no option
//                       (hasSignInOptions false): nothing to sign in to here; Codex's ChatGPT rows are Codex's own.
//   sandbox             false: the core has no command sandbox (Settings › Code says Sandbox mode: None).
//   historyLocation     the "~/…" folder of the core's own history, named in the delete confirms.
//   shellEnv            names of variables the agent reads from the user's shell profile (Gemini's GEMINI_API_KEY,
//                       GOOGLE_CLOUD_PROJECT…): codex.cjs adds their login-shell values to the core's environment, which a
//                       Finder or Dock launch lacks (proxy-env.cjs loginShellVariables); Electron's own values win.
//   home                the "~/…" folder the core's own files sit in by default (Codex: ~/.codex). A core that reports
//                       where it really runs (boot.core.home, from Codex's initialize codexHome / CODEX_HOME) has every
//                       descriptor path under that folder shown there instead (corePath).
//   plugins             {format, placeholder, registries?}: the Add plugin form's copy (English, through t()).
//   mcpConfigFile       the "~/…" file holding the core's MCP servers when it isn't configFile (Kimi's mcp.json).
//   sessionStore        where the core keeps one session, for Settings › Storage (settings-pages.cjs): {files: [patterns
//                       below the core home, `<id>` the thread id, `<id8>` its first 8 characters, `*` and `**`]}, or
//                       {database: folder below the core home or "~/…"} when every session is in one database (not
//                       measured per session). Absent: sessions/**/<id> (DeepSeek, Codex rollouts).
//
// Shared by the main process (require) and the renderer (import).
import deepseek from "./cores/deepseek.mjs";
import codex, { CODEX_PROTOCOL } from "./cores/codex.mjs";
import zcode from "./cores/zcode.mjs";
import opencode from "./cores/opencode.mjs";
import mimo from "./cores/mimo.mjs";
import kimi from "./cores/kimi.mjs";
import qwen from "./cores/qwen.mjs";
import gemini from "./cores/gemini.mjs";
import minimax from "./cores/minimax.mjs";

export { CODEX_PROTOCOL };
// Codex is not among them: it comes from its Extension Pack (extensions/codex, cores/codex.mjs), offered once added.
const BUILT_IN = Object.freeze([deepseek, zcode, opencode, mimo, kimi, qwen, gemini, minimax]);
// Cores from imported Extension Packs (extension-packs.cjs; the renderer gets them in boot.extensionCores). A pack
// replaces a built-in descriptor with its id, except the built-in DeepSeek core itself.
let fromPacks = [];
const RESERVED = new Set(["deepseek"]);
/** Replace the Extension Pack cores (plain descriptors; each carries pack: {version, dir} and bridge.path). */
export function registerCores(list) {
  // A pack without its own logo, one-line description, assistant name, sign-in options, sandbox fact, history folder,
  // session layout or plugin copy keeps the built-in descriptor's (same id), so an older manifest can't drop them; a pack-only core
  // without an assistant name is called by its own name, never the DeepSeek default.
  fromPacks = (Array.isArray(list) ? list : []).filter((core) => core && typeof core.id === "string" && !RESERVED.has(core.id)).map((core) => {
    const base = [...BUILT_IN, codex].find((entry) => entry.id === core.id);
    const sandbox = core.sandbox ?? base?.sandbox, historyLocation = core.historyLocation || base?.historyLocation, plugins = core.plugins || base?.plugins;
    const mcpConfigFile = core.mcpConfigFile || base?.mcpConfigFile;
    const sessionStore = core.sessionStore || base?.sessionStore;
    const shellEnv = Array.isArray(core.shellEnv) ? core.shellEnv : base?.shellEnv;
    return Object.freeze({ ...core, brand: core.brand || base?.brand || null, tagline: core.tagline || base?.tagline || null,
      assistant: core.assistant || base?.assistant || core.name || core.id, login: (hasSignInOptions(core.login) ? core.login : base?.login) || null,
      ...(sandbox !== undefined && sandbox !== null ? { sandbox } : {}), ...(historyLocation ? { historyLocation } : {}), ...(plugins ? { plugins } : {}),
      ...(mcpConfigFile ? { mcpConfigFile } : {}), ...(sessionStore ? { sessionStore } : {}), ...(shellEnv ? { shellEnv } : {}),
      available: true });
  });
}

/**
 * Whether a descriptor `login` (or a descriptor, boot.core or engine/core id) offers anything to sign in with here:
 * a browser sign-in, a device code or an API key. Setup's Sign in step, Home's sign-in card and Settings › Account
 * offer sign-in only when it does; a core with no option (Qwen Code: keys live in its own settings) has none.
 * @param {object | string | null | undefined} value - a login object, a descriptor, boot.core or an engine/core id
 */
export function hasSignInOptions(value) {
  if (!value) return false;
  const shaped = typeof value === "object" && ["browser", "deviceCode", "apiKey"].some((key) => key in value);
  const login = shaped ? value : typeof value === "object" && "login" in value ? value.login
    : coreForEngine(typeof value === "string" ? value : value.engine ?? value.id).login;
  if (!login || typeof login !== "object") return false;
  return ["browser", "deviceCode", "apiKey"].some((key) => Array.isArray(login[key]) && login[key].length > 0);
}

/**
 * Whether boot.core (or a serverInfo, a descriptor or an engine/id) confines the commands it runs: false when its
 * descriptor says sandbox: false or it reports capabilities.sandbox false / "none" (ZCode, an ACP agent without
 * sandbox-exec), true when it reports a mechanism ("seatbelt"), else null (not declared: the Codex protocol's
 * sandboxPolicy applies).
 * @param {object | string | null | undefined} core
 * @returns {boolean | null}
 */
export function coreSandboxed(core) {
  const value = asCore(core);
  const descriptor = coreForEngine(value?.engine ?? value?.id);
  if (descriptor.sandbox === false || value?.sandbox === false) return false;
  const reported = coreCapabilities({ engine: descriptor.engine, capabilities: value?.capabilities }).sandbox;
  if (reported === false || reported === "none") return false;
  if (reported === true || (typeof reported === "string" && reported)) return true;
  return null;
}

/** Every core: built-in ones (packs override by id), then pack-only ones. */
export function allCores() {
  const merged = BUILT_IN.map((core) => fromPacks.find((pack) => pack.id === core.id) ?? core);
  return [...merged, ...fromPacks.filter((pack) => !BUILT_IN.some((core) => core.id === pack.id))];
}
/** The cores offered in Settings › Cores (adapted and available). */
export function offeredCores() {
  return allCores().filter((core) => core.available !== false);
}

/** A core by id (offered or still being adapted), or null. */
export function coreById(id) {
  return allCores().find((core) => core.id === id) ?? null;
}

/**
 * The descriptor for an initialize engine report (or a core id). No engine is
 * Codex (its app-server and the UI fixtures report none): its added pack, else the
 * protocol's own descriptor (cores/codex.mjs), so "codex" resolves either way; an
 * unknown engine gets a bare descriptor named after itself, with nothing implied.
 */
export function coreForEngine(engine) {
  if (engine === undefined || engine === null || engine === "" || engine === "codex") return coreById("codex") ?? codex;
  const known = allCores().find((core) => core.engine === engine || core.id === engine);
  if (known) return known;
  const id = String(engine);
  return { id, name: id, engine: id, implies: {}, configFile: null, skillRoots: [] };
}

// boot.core / a serverInfo, or just an engine or core id string (UI models that only know the id).
const asCore = (core) => (typeof core === "string" ? { engine: core } : core);

/** boot.core (or a serverInfo, or an engine/id) → the capabilities in effect: implied, then reported. */
export function coreCapabilities(core) {
  core = asCore(core);
  const reported = core?.capabilities && typeof core.capabilities === "object" ? core.capabilities : {};
  return { ...(coreForEngine(core?.engine).implies ?? {}), ...reported };
}

/** Whether boot.core (or a serverInfo, or an engine/id) has a capability set to true. */
export function coreSupports(core, capability) {
  return coreCapabilities(core)[capability] === true;
}

/**
 * A descriptor path ("~/.codex/config.toml") where the running core really keeps it: a core that reports its own home
 * (boot.core.home: Codex launched with CODEX_HOME) moves every path under the descriptor's `home` there. Anything else,
 * or no report, is the path unchanged.
 * @param {object | string | null | undefined} core - boot.core (or a serverInfo with codexHome), or an engine/id
 * @param {string | null | undefined} value - a descriptor path
 */
export function corePath(core, value) {
  if (typeof value !== "string" || !value) return value ?? null;
  const descriptor = coreForEngine(asCore(core)?.engine), base = descriptor.home;
  const reported = core && typeof core === "object" ? (typeof core.home === "string" && core.home ? core.home : typeof core.codexHome === "string" && core.codexHome ? core.codexHome : null) : null;
  if (!base || !reported) return value;
  const home = reported.replace(/^\/Users\/[^/]+(?=\/|$)/, "~").replace(/\/+$/, "");
  if (home === base) return value;
  return value === base ? home : value.startsWith(`${base}/`) ? `${home}${value.slice(base.length)}` : value;
}

/** The display name for boot.core (or a serverInfo, or an engine/id). */
export function coreName(core) {
  return coreForEngine(asCore(core)?.engine).name;
}

/**
 * How the copy names the assistant while a core runs (i18n setAssistantName, the window's first-paint appearance):
 * its descriptor's `assistant`, else its name. No core, an unknown id or a core still being adapted is the
 * DeepSeek core's (the app falls back to it).
 * @param {object | string | null | undefined} core - a core id or descriptor (config.core, Settings › Cores' selection)
 */
export function coreAssistant(core) {
  const descriptor = typeof core === "string" ? coreById(core) : core;
  if (!descriptor || typeof descriptor !== "object" || descriptor.available === false) return deepseek.assistant;
  return descriptor.assistant || descriptor.name || deepseek.assistant;
}

/**
 * Which core recorded a session, from its Thread metadata: a core's
 * sessionPrefix ("dsh 0.2", "zcode 1.4"), else a bare semver (or the openai
 * provider) for Codex; null when unattributed.
 */
export function sessionCore(meta) {
  const version = String(meta?.cliVersion ?? "");
  for (const core of allCores()) if (core.sessionPrefix && version.startsWith(core.sessionPrefix)) return core.id;
  if (/^\d/.test(version) || meta?.modelProvider === "openai") return "codex";
  return null;
}

/** The release asset of a core's agent program for a CPU architecture ("arm64" | "x64"), or null. */
export function releaseAsset(core, arch = "arm64") {
  const release = core?.agent?.release;
  const asset = release?.assets?.[arch];
  if (!asset) return null;
  const url = asset.url ?? String(release.url ?? "").replaceAll("{tag}", release.tag ?? "").replaceAll("{name}", asset.name).replaceAll("{version}", release.version ?? "");
  return { ...asset, type: asset.type ?? release.type ?? "tar.gz", version: release.version, tag: release.tag, url };
}

/**
 * The git branch prefix for a new worktree session, named after the core that
 * runs it ("deepseek/", "kimi/", "codex/"), so a branch never names an agent
 * the user doesn't use. Takes boot.core, a serverInfo, or an engine/id; an id
 * that isn't a safe ref component (an imported core's) falls back to a neutral
 * "code-desktop/".
 */
export function worktreeBranchPrefix(core) {
  const id = String(coreForEngine(asCore(core)?.engine).id ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").replace(/\.{2,}/g, ".");
  return `${id && !id.endsWith(".lock") ? id : "code-desktop"}/`;
}
